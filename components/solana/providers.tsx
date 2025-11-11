"use client"

import { ReactNode, useMemo } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { PhantomWalletAdapter, SolflareWalletAdapter, LedgerWalletAdapter } from "@solana/wallet-adapter-wallets"
import { useNetwork } from "@/hooks/use-network"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { SolanaMobileWalletAdapter, createDefaultAuthorizationResultCache } from "@solana-mobile/wallet-adapter-mobile"
import { MetaMaskWalletAdapter } from "@/lib/wallets/metamask-adapter"

export function SolanaProviders({ children }: { children: ReactNode }) {
  const { endpoints, cluster } = useNetwork()
  const endpoint = endpoints.solanaRpc

  const wallets = useMemo(() => {
    if (typeof window === "undefined") {
      return []
    }

    const origin = window.location.origin || "https://beamable.network"
    const appIdentity = {
      name: "Beamable Network",
      uri: origin,
      icon: `${origin}/SBMB_Token_v2_transparent.png`,
    }

    const walletNetwork =
      cluster === "mainnet" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet
    const mobileCluster = cluster === "mainnet" ? "mainnet-beta" : "devnet"

    const adapters = [] as any[]

    try {
      adapters.push(
        new SolanaMobileWalletAdapter({
          appIdentity,
          authorizationResultCache: createDefaultAuthorizationResultCache(),
          cluster: mobileCluster,
        }),
      )
    } catch (error) {
      console.warn("[wallet] Failed to initialize Mobile Wallet Adapter", error)
    }

    adapters.push(new PhantomWalletAdapter())
    adapters.push(new SolflareWalletAdapter({ network: walletNetwork }))
    adapters.push(new LedgerWalletAdapter())

    try {
      adapters.push(new MetaMaskWalletAdapter())
    } catch (error) {
      console.warn("[wallet] Failed to initialize MetaMask adapter", error)
    }

    return adapters
  }, [cluster])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
