"use client"

import {
  BaseMessageSignerWalletAdapter,
  isVersionedTransaction,
  scopePollingDetectionStrategy,
  WalletAccountError,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletDisconnectionError,
  WalletError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletPublicKeyError,
  WalletReadyState,
  WalletSendTransactionError,
  WalletSignMessageError,
  WalletSignTransactionError,
} from "@solana/wallet-adapter-base"
import { PublicKey, type Connection, type Transaction, type TransactionSignature, VersionedTransaction } from "@solana/web3.js"

const META_MASK_WALLET_NAME = "MetaMask"
const META_MASK_ICON =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSI1MCUiIHkxPSIwJSIgeDI9IjUwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI0ZDNjUxRSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZCQzIyOCIvPjwvZ3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjE2IiBmaWxsPSJ1cmwoI2EpIi8+PHBhdGggZD0iTTEwLjUgMjZoMTFWMjEuM0wzMiAxMS41IDE1LjggNC4zIDAgMTEuNWwxMC41IDkuOEMxMC41IDIxLjMgMTAuNSAyNiAxMC41IDI2WiIgZmlsbD0iI0ZGRiIvPjwvc3ZnPg=="

function getMetaMaskProvider(): any | undefined {
  if (typeof window === "undefined") return undefined
  const anyWindow = window as any
  const provider = anyWindow.solana
  if (!provider) return undefined
  if (provider.isMetaMask) return provider
  if (Array.isArray(provider.providers)) {
    return provider.providers.find((p: any) => p?.isMetaMask)
  }
  return undefined
}

export class MetaMaskWalletAdapter extends BaseMessageSignerWalletAdapter {
  readonly name = META_MASK_WALLET_NAME
  readonly url = "https://metamask.io"
  readonly icon = META_MASK_ICON
  readonly supportedTransactionVersions = new Set<"legacy" | 0>(["legacy", 0])

  private _readyState: WalletReadyState
  private _connecting: boolean
  private _wallet: any | null
  private _publicKey: PublicKey | null

  private _disconnected: () => void
  private _accountChanged: (newPublicKey: any) => void

  constructor() {
    super()
    this._readyState =
      typeof window === "undefined" || typeof document === "undefined"
        ? WalletReadyState.Unsupported
        : WalletReadyState.NotDetected
    this._connecting = false
    this._wallet = null
    this._publicKey = null

    this._disconnected = () => {
      const wallet = this._wallet
      if (wallet) {
        wallet.off?.("disconnect", this._disconnected)
        wallet.off?.("accountChanged", this._accountChanged)
        this._wallet = null
        this._publicKey = null
        this.emit("error", new WalletDisconnectedError())
        this.emit("disconnect")
      }
    }

    this._accountChanged = (newPublicKey: any) => {
      const publicKey = this._publicKey
      if (!publicKey) return

      try {
        newPublicKey = new PublicKey(newPublicKey.toBytes())
      } catch (error: any) {
        this.emit("error", new WalletPublicKeyError(error?.message, error))
        return
      }

      if (publicKey.equals(newPublicKey)) return

      this._publicKey = newPublicKey
      this.emit("connect", newPublicKey)
    }

    if (this._readyState !== WalletReadyState.Unsupported) {
      scopePollingDetectionStrategy(() => {
        const provider = getMetaMaskProvider()
        if (provider) {
          this._readyState = WalletReadyState.Installed
          this.emit("readyStateChange", this._readyState)
          return true
        }
        return false
      })
    }
  }

  get publicKey(): PublicKey | null {
    return this._publicKey
  }

  get connecting(): boolean {
    return this._connecting
  }

  get readyState(): WalletReadyState {
    return this._readyState
  }

  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return
      if (this.readyState !== WalletReadyState.Installed) throw new WalletNotReadyError()

      this._connecting = true
      const wallet = getMetaMaskProvider()
      if (!wallet) throw new WalletNotReadyError()

      if (!wallet.isConnected) {
        try {
          await wallet.connect()
        } catch (error: any) {
          throw new WalletConnectionError(error?.message, error)
        }
      }

      if (!wallet.publicKey) throw new WalletAccountError()

      let publicKey: PublicKey
      try {
        publicKey = new PublicKey(wallet.publicKey.toBytes())
      } catch (error: any) {
        throw new WalletPublicKeyError(error?.message, error)
      }

      wallet.on?.("disconnect", this._disconnected)
      wallet.on?.("accountChanged", this._accountChanged)

      this._wallet = wallet
      this._publicKey = publicKey
      this.emit("connect", publicKey)
    } catch (error) {
      this.emit("error", error as WalletError)
      throw error
    } finally {
      this._connecting = false
    }
  }

  async disconnect(): Promise<void> {
    const wallet = this._wallet
    if (wallet) {
      wallet.off?.("disconnect", this._disconnected)
      wallet.off?.("accountChanged", this._accountChanged)
      this._wallet = null
      this._publicKey = null
      try {
        await wallet.disconnect()
      } catch (error: any) {
        this.emit("error", new WalletDisconnectionError(error?.message, error))
      }
    }
    this.emit("disconnect")
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options: { signers?: any[]; [key: string]: any } = {},
  ): Promise<TransactionSignature> {
    try {
      const wallet = this._wallet
      if (!wallet) throw new WalletNotConnectedError()

      const { signers, ...sendOptions } = options
      let tx = transaction

      if (isVersionedTransaction(tx)) {
        signers?.length && tx.sign(signers)
      } else {
        tx = await this.prepareTransaction(tx, connection, sendOptions)
        signers?.length && tx.partialSign(...signers)
      }

      sendOptions.preflightCommitment = sendOptions.preflightCommitment || connection.commitment

      try {
        const { signature } = await wallet.signAndSendTransaction(tx, sendOptions)
        return signature
      } catch (error: any) {
        if (error instanceof WalletError) throw error
        throw new WalletSendTransactionError(error?.message, error)
      }
    } catch (error) {
      this.emit("error", error as WalletError)
      throw error
    }
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    try {
      const wallet = this._wallet
      if (!wallet) throw new WalletNotConnectedError()
      try {
        return (await wallet.signTransaction(transaction)) || transaction
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error)
      }
    } catch (error) {
      this.emit("error", error as WalletError)
      throw error
    }
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    try {
      const wallet = this._wallet
      if (!wallet) throw new WalletNotConnectedError()
      try {
        return (await wallet.signAllTransactions(transactions)) || transactions
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error)
      }
    } catch (error) {
      this.emit("error", error as WalletError)
      throw error
    }
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      const wallet = this._wallet
      if (!wallet) throw new WalletNotConnectedError()
      try {
        const result = await wallet.signMessage(message)
        return result?.signature ?? result
      } catch (error: any) {
        throw new WalletSignMessageError(error?.message, error)
      }
    } catch (error) {
      this.emit("error", error as WalletError)
      throw error
    }
  }
}
