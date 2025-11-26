"use client"

import { useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import { useNetwork } from "@/hooks/use-network"
import { getAssetWithProofUmi } from "@/lib/cnft"
import { kitInstructionToWeb3, sendWeb3Instruction } from "@/lib/kit-bridge"
import {
  ActivateChecker,
  PayoutCheckerRewards,
  CheckerRewardsVault,
  FlexUnlock,
  BMB_MINT,
  getCurrentPeriod,
  FlexLock,
  bmbToBaseUnits,
} from "@beamable-network/depin"
import { address } from "gill"
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token"
import { useQueryClient } from "@tanstack/react-query"
import type { CheckerLicense } from "@/hooks/use-checker-licenses"
import type { LockedRewardPosition } from "@/hooks/use-locked-rewards"
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvQJpmdMZ4Zp4xi8cYgR2o63HgNbUsVTy5cuc")

export function useDepinActions() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { endpoints, cluster } = useNetwork()
  const queryClient = useQueryClient()

  const ensure = useCallback(() => {
    if (!publicKey) throw new Error("Wallet not connected")
    return publicKey
  }, [publicKey])

  const activateChecker = useCallback(
    async (
      licenseId: string,
      delegatedTo?: string,
      options?: { awaitConfirmation?: boolean },
    ) => {
      const owner = ensure()
      const asset = await getAssetWithProofUmi(endpoints.heliusRpc, cluster, licenseId)
      const delegated = delegatedTo || owner.toBase58()
      console.debug("[Activate] Prepared asset", {
        licenseId,
        delegated,
        id: (asset as any)?.rpcAsset?.id,
        index: (asset as any)?.index,
        nonce: (asset as any)?.nonce,
        proofCount: Array.isArray((asset as any)?.proof) ? (asset as any).proof.length : -1,
      })
      try {
        console.log("ActivateChecker Signer: ", address(owner.toBase58()))
        console.log("ActivateChecker Delegated: ", address(delegated))
        console.log("ActivateChecker Asset: ", asset)
        console.log("ActivateChecker Cluster: ", cluster)

        const act = new ActivateChecker({
          signer: address(owner.toBase58()),
          checker_license: asset as any,
          delegated_to: address(delegated),
        })
        const ix = await act.getInstruction()
        const web3Ix = kitInstructionToWeb3(ix)
        const { signature, confirmation } = await sendWeb3Instruction({
          connection,
          payer: owner,
          instruction: web3Ix,
          walletSend: (tx) => sendTransaction(tx, connection),
          awaitConfirmation: options?.awaitConfirmation ?? true,
        })
        const key = ["checkerLicenses", cluster, owner.toBase58()]
        const updateCache = () => {
          queryClient.setQueryData<CheckerLicense[] | undefined>(key, (old) => {
            if (!old) return old
            return old.map((lic) =>
              lic.id === licenseId
                ? {
                    ...lic,
                    isActivated: true,
                    delegatedTo: delegated && delegated !== owner.toBase58() ? delegated : null,
                  }
                : lic,
            )
          })
          queryClient.invalidateQueries({ queryKey: key })
        }
        const confirmationTask = confirmation
          .then(() => {
            updateCache()
          })
          .catch((error) => {
            console.error("[Activate] confirmation failed", error)
            throw error
          })
        if (options?.awaitConfirmation ?? true) {
          await confirmationTask
        }
        return { signature, confirmation: confirmationTask }
      } catch (e) {
        console.error("[Activate] ActivateChecker failed", {
          licenseId,
          delegated,
          assetShape: {
            id: (asset as any)?.rpcAsset?.id,
            index: (asset as any)?.index,
            nonce: (asset as any)?.nonce,
            proofCount: Array.isArray((asset as any)?.proof) ? (asset as any).proof.length : -1,
          },
          error: { message: (e as any)?.message, stack: (e as any)?.stack },
        })
        throw e
      }
    },
    [ensure, endpoints.heliusRpc, connection, sendTransaction, cluster, queryClient],
  )

  const payoutCheckerRewards = useCallback(
    async (licenseId: string, options?: { awaitConfirmation?: boolean }) => {
      const owner = ensure()
      const asset = await getAssetWithProofUmi(endpoints.heliusRpc, cluster, licenseId)
      const payout = new PayoutCheckerRewards({
        signer: address(owner.toBase58()),
        checker_license: asset as any,
      })
      // Fetch CheckerRewardsVault config via web3 connection
      const cfg = await CheckerRewardsVault.readFromState(async (addr: any) => {
        const info = await connection.getAccountInfo(new (await import("@solana/web3.js")).PublicKey(String(addr)))
        return info?.data ? new Uint8Array(info.data) : null
      })
      if (!cfg) throw new Error("Checker rewards vault not found")
      const ix = await payout.getInstruction(cfg)
      const web3Ix = kitInstructionToWeb3(ix)
      const { signature, confirmation } = await sendWeb3Instruction({
        connection,
        payer: owner,
        instruction: web3Ix,
        walletSend: (tx) => sendTransaction(tx, connection),
        awaitConfirmation: options?.awaitConfirmation ?? true,
      })
      const key = ["checkerLicenses", cluster, owner.toBase58()]
      const confirmationTask = confirmation
        .then(() => {
          queryClient.invalidateQueries({ queryKey: key })
        })
        .catch((error) => {
          console.error("[Payout] confirmation failed", error)
          throw error
        })
      if (options?.awaitConfirmation ?? true) {
        await confirmationTask
      }
      return { signature, confirmation: confirmationTask }
    },
    [ensure, endpoints.heliusRpc, connection, sendTransaction, cluster, queryClient],
  )

  const unlockLockedTokens = useCallback(
    async (reward: LockedRewardPosition) => {
      const owner = ensure()
      const ownerBase58 = owner.toBase58()
      const ownerAddress = address(ownerBase58)

      if (reward.receiver !== ownerBase58) {
        throw new Error("Locked reward receiver does not match connected wallet")
      }

      const receiverAddress = address(reward.receiver)
      const senderAddress = address(reward.sender)
      const rentReceiverAddress = address(reward.rentReceiver)

      const [receiverTokenAccount] = await findAssociatedTokenPda({
        owner: receiverAddress,
        mint: BMB_MINT,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      const [senderTokenAccount] = await findAssociatedTokenPda({
        owner: senderAddress,
        mint: BMB_MINT,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      const instructions: TransactionInstruction[] = []

      const receiverAtaInfo = await connection.getAccountInfo(new PublicKey(String(receiverTokenAccount)))
      if (!receiverAtaInfo) {
        instructions.push(
          kitInstructionToWeb3(
            await getCreateAssociatedTokenIdempotentInstruction({
              payer: ownerAddress,
              ata: receiverTokenAccount,
              owner: receiverAddress,
              mint: BMB_MINT,
            }),
          ),
        )
      }

      const currentPeriod = getCurrentPeriod()
      const senderAtaInfo = await connection.getAccountInfo(new PublicKey(String(senderTokenAccount)))
      const needsSenderAccount = reward.unlockPeriod > currentPeriod && !senderAtaInfo
      if (needsSenderAccount) {
        instructions.push(
          kitInstructionToWeb3(
            await getCreateAssociatedTokenIdempotentInstruction({
              payer: ownerAddress,
              ata: senderTokenAccount,
              owner: senderAddress,
              mint: BMB_MINT,
            }),
          ),
        )
      }

      const unlock = new FlexUnlock({
        receiver: receiverAddress,
        sender: senderAddress,
        receiver_bmb_token_account: receiverTokenAccount,
        sender_bmb_token_account: senderTokenAccount,
        lock_period: reward.lockPeriod,
        rent_receiver: rentReceiverAddress,
        unlock_period: reward.unlockPeriod,
      })

      const kitInstruction = await unlock.getInstruction()
      instructions.push(kitInstructionToWeb3(kitInstruction))

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      const message = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message()
      const tx = new VersionedTransaction(message)
      const signature = await sendTransaction(tx, connection)
      try {
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
      } catch (err) {
        console.warn("[Unlock] confirmation warning", err)
      }
      queryClient.invalidateQueries({ queryKey: ["lockedRewards", cluster, ownerBase58] })
      return signature
    },
    [ensure, connection, sendTransaction, queryClient, cluster],
  )

  const refreshLatestBlockhash = useCallback(async () => {
    return connection.getLatestBlockhash()
  }, [connection])

  const sendLockedTokens = useCallback(
    async ({ receiver, amount, lockDurationDays }: { receiver: string; amount: number; lockDurationDays: number }) => {
      const owner = ensure()
      if (!receiver) throw new Error("Receiver address is required")
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Amount must be greater than zero")
      }
      if (!Number.isInteger(lockDurationDays) || lockDurationDays < 1) {
        throw new Error("Lock duration must be a whole number of days (minimum 1)")
      }

      let receiverAddress
      try {
        receiverAddress = address(receiver)
      } catch {
        throw new Error("Invalid receiver address")
      }

      const ownerBase58 = owner.toBase58()
      const ownerAddress = address(ownerBase58)

      const [senderTokenAccount] = await findAssociatedTokenPda({
        owner: ownerAddress,
        mint: BMB_MINT,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      const instructions: TransactionInstruction[] = []
      const senderAtaInfo = await connection.getAccountInfo(new PublicKey(String(senderTokenAccount)))
      if (!senderAtaInfo) {
        instructions.push(
          kitInstructionToWeb3(
            await getCreateAssociatedTokenIdempotentInstruction({
              payer: ownerAddress,
              ata: senderTokenAccount,
              owner: ownerAddress,
              mint: BMB_MINT,
            }),
          ),
        )
      }

      const flexLock = new FlexLock({
        sender: ownerAddress,
        receiver: receiverAddress,
        amount: bmbToBaseUnits(amount),
        lock_duration_days: lockDurationDays,
        sender_bmb_token_account: senderTokenAccount,
        current_period: getCurrentPeriod(),
      })

      const lockInstruction = await flexLock.getInstruction()
      instructions.push(kitInstructionToWeb3(lockInstruction))

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      const message = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message()
      const tx = new VersionedTransaction(message)
      const signature = await sendTransaction(tx, connection)
      try {
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
      } catch (err) {
        console.warn("[FlexLock] confirmation warning", err)
      }
      queryClient.invalidateQueries({ queryKey: ["lockedRewards", cluster, ownerBase58] })
      return signature
    },
    [ensure, connection, sendTransaction, queryClient, cluster],
  )

  return { activateChecker, payoutCheckerRewards, unlockLockedTokens, sendLockedTokens, refreshLatestBlockhash }
}
