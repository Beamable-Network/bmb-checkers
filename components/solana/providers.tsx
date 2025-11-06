"use client"

import { ReactNode, useMemo } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets"
import { useNetwork } from "@/hooks/use-network"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { SolanaMobileWalletAdapter, createDefaultAuthorizationResultCache } from "@solana-mobile/wallet-adapter-mobile"

export function SolanaProviders({ children }: { children: ReactNode }) {
  const { endpoints, cluster } = useNetwork()
  const endpoint = endpoints.solanaRpc

  const wallets = useMemo(
    () => {
      const mobile = new SolanaMobileWalletAdapter({
        appIdentity: { name: "Beamable Network", uri: "https://beamable.network" },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: cluster === "mainnet" ? "mainnet-beta" : "devnet",
      })
      return [
        mobile,
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new LedgerWalletAdapter(),
      ]
    },
    [cluster],
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
