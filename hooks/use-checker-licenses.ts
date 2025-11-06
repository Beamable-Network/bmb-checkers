"use client"

import { useCallback } from "react"
import { PublicKey } from "@solana/web3.js"
import { searchCheckerAssets } from "@/lib/helius"
import { getCheckerMerkleTrees } from "@/lib/depin"
import { useNetwork } from "@/hooks/use-network"
import { useConnection } from "@solana/wallet-adapter-react"
import { CheckerMetadataAccount } from "@beamable-network/depin"
import { address, isSome } from "gill"
import { useQuery } from "@tanstack/react-query"

export type CheckerLicense = {
  id: string
  name: string
  publicKey: string
  image: string
  delegatedTo: string | null
  isActivated: boolean
  totalRewards: number
  lastCheckTime: string
}

function extractImage(item: any): string {
  const content = item?.content || {}
  const links = content?.links || {}
  const files: any[] = content?.files || []
  const imageFromLinks = links?.image
  const imageFromFiles = files.find((f) => (f?.mime || "").startsWith("image"))?.uri
  return imageFromLinks || imageFromFiles || content?.json_uri || "/placeholder.svg"
}

export function useCheckerLicenses(owner: PublicKey | null | undefined) {
  const { cluster, endpoints } = useNetwork()
  const { connection } = useConnection()

  const fetchLicenses = useCallback(async () => {
    if (!owner) return [] as CheckerLicense[]
    const trees = await getCheckerMerkleTrees(cluster)
    const items = await searchCheckerAssets(endpoints.heliusRpc, owner.toBase58(), trees)
    const filtered = Array.isArray(items)
      ? items.filter((it: any) => {
          const tree = it?.compression?.tree
          return !trees?.length || (tree && trees.includes(tree))
        })
      : []
    const mapped: CheckerLicense[] = filtered.map((it: any) => {
      const attrs: Array<{ trait_type?: string; value?: any }> = it?.content?.metadata?.attributes || []
      const findAttr = (k: string) => attrs.find((a) => a.trait_type?.toLowerCase() === k)?.value
      const delegatedTo = (findAttr("delegate") as string) || null
      const activated = String(findAttr("activated") ?? "false").toLowerCase() === "true"
      const rewards = Number(findAttr("rewards") ?? 0)
      const lastCheck = (findAttr("lastCheck") as string) || "-"
      return {
        id: it.id,
        name: it?.content?.metadata?.name || it.id,
        publicKey: it.id,
        image: extractImage(it),
        delegatedTo,
        isActivated: activated,
        totalRewards: rewards,
        lastCheckTime: lastCheck,
      }
    })
    // Enhance with on-chain metadata (delegation + activation)
    try {
      const ownerBase58 = owner.toBase58()
      const metadataEntries = await Promise.all(
        mapped.map(async (license) => {
          const [pda] = await CheckerMetadataAccount.findCheckerMetadataPDA(address(license.id), address(ownerBase58))
          return { license, pda: new PublicKey(String(pda)) }
        }),
      )

      const chunkSize = 50
      const accounts: (import("@solana/web3.js").AccountInfo<Buffer> | null)[] = []
      for (let i = 0; i < metadataEntries.length; i += chunkSize) {
        const slice = metadataEntries.slice(i, i + chunkSize)
        const res = await connection.getMultipleAccountsInfo(slice.map((entry) => entry.pda))
        accounts.push(...res)
      }

      const enhanced = metadataEntries.map(({ license }, idx) => {
        const accountInfo = accounts[idx]
        if (!accountInfo?.data) return license
        try {
          const meta = CheckerMetadataAccount.deserializeFrom(new Uint8Array(accountInfo.data))
          const delegatedToStr = String(meta.delegatedTo)
          const ownerStr = ownerBase58
          const isActive = !isSome(meta.suspendedAt)
          const isDelegated = delegatedToStr && delegatedToStr !== ownerStr
          return {
            ...license,
            isActivated: isActive,
            delegatedTo: isDelegated ? delegatedToStr : null,
          }
        } catch {
          return license
        }
      })

      return enhanced
    } catch {
      return mapped
    }
  }, [owner, cluster, endpoints.heliusRpc, connection])

  const ownerKey = owner?.toBase58() || ""
  const query = useQuery({
    queryKey: ["checkerLicenses", cluster, ownerKey],
    queryFn: fetchLicenses,
    enabled: !!ownerKey,
  })

  return { licenses: query.data || [], loading: query.isLoading, error: query.error ? String(query.error) : null, reload: query.refetch }
}
