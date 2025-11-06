"use client"

import { useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { useNetwork } from "@/hooks/use-network"
import { getAssetWithProofUmi } from "@/lib/cnft"
import { kitInstructionToWeb3, sendWeb3Instruction } from "@/lib/kit-bridge"
import { ActivateChecker, PayoutCheckerRewards, TreasuryConfigAccount } from "@beamable-network/depin"
import { address } from "gill"
import { useQueryClient } from "@tanstack/react-query"
import type { CheckerLicense } from "@/hooks/use-checker-licenses"

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
    async (licenseId: string, delegatedTo?: string) => {
      const owner = ensure()
      const asset = await getAssetWithProofUmi(endpoints.heliusRpc, licenseId)
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
        const act = new ActivateChecker({ signer: address(owner.toBase58()), checker_license: asset as any, delegated_to: address(delegated) })
        const ix = await act.getInstruction()
        const web3Ix = kitInstructionToWeb3(ix)
        const sig = await sendWeb3Instruction({ connection, payer: owner, instruction: web3Ix, walletSend: (tx) => sendTransaction(tx, connection) })
        const key = ["checkerLicenses", cluster, owner.toBase58()]
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
        return sig
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
    [ensure, endpoints.heliusRpc, connection, sendTransaction],
  )

  const payoutCheckerRewards = useCallback(
    async (licenseId: string) => {
      const owner = ensure()
      const asset = await getAssetWithProofUmi(endpoints.heliusRpc, licenseId)
      const payout = new PayoutCheckerRewards({ signer: address(owner.toBase58()), checker_license: asset as any })
      // Fetch TreasuryConfig via web3 connection
      const cfg = await TreasuryConfigAccount.readFromState(async (addr: any) => {
        const info = await connection.getAccountInfo(new (await import("@solana/web3.js")).PublicKey(String(addr)))
        return info?.data ? new Uint8Array(info.data) : null
      })
      if (!cfg) throw new Error("Treasury config not found")
      const ix = await payout.getInstruction(cfg)
      const web3Ix = kitInstructionToWeb3(ix)
      const sig = await sendWeb3Instruction({ connection, payer: owner, instruction: web3Ix, walletSend: (tx) => sendTransaction(tx, connection) })
      queryClient.invalidateQueries({ queryKey: ["checkerLicenses", cluster, owner.toBase58()] })
      return sig
    },
    [ensure, endpoints.heliusRpc, connection, sendTransaction, cluster, queryClient],
  )

  return { activateChecker, payoutCheckerRewards }
}
