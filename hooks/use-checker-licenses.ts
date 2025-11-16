"use client"

import { useCallback } from "react"
import { PublicKey } from "@solana/web3.js"
import { searchCheckerAssets } from "@/lib/helius"
import { getCheckerMerkleTrees } from "@/lib/depin"
import { useNetwork } from "@/hooks/use-network"
import { useConnection } from "@solana/wallet-adapter-react"
import { CheckerMetadataAccount, GlobalRewardsAccount, baseUnitsToBmb } from "@beamable-network/depin"
import { address, isSome } from "gill"
import { useQuery } from "@tanstack/react-query"

export type CheckerLicense = {
  id: string
  name: string
  publicKey: string
  image: string
  animationUrl?: string | null
  delegatedTo: string | null
  isActivated: boolean
  totalRewards: number
  lastCheckTime: string
  checkerIndex: number | null
  totalRewardsLamports: bigint
}

type MediaInfo = {
  image: string
  animationUrl?: string | null
}

function extractMedia(item: any): MediaInfo {
  const content = item?.content || {}
  const links = content?.links || {}
  const files: any[] = content?.files || []
  const metadata = content?.metadata || {}

  const firstImageFile = files.find((f) => typeof f?.uri === "string" && String(f?.mime || "").startsWith("image"))
  const firstVideoFile = files.find((f) => typeof f?.uri === "string" && String(f?.mime || "").startsWith("video"))

  const image =
    (typeof links?.image === "string" && links.image) ||
    (typeof metadata?.image === "string" && metadata.image) ||
    (typeof firstImageFile?.uri === "string" && firstImageFile.uri) ||
    (typeof content?.json_uri === "string" && content.json_uri) ||
    "/placeholder.svg"

  const animationUrl =
    (typeof links?.animation_url === "string" && links.animation_url) ||
    (typeof links?.animation === "string" && links.animation) ||
    (typeof metadata?.animation_url === "string" && metadata.animation_url) ||
    (typeof firstVideoFile?.uri === "string" && firstVideoFile.uri) ||
    null

  return { image, animationUrl }
}

function extractCheckerIndex(item: any): number | null {
  const compression = item?.compression ?? {}
  const raw =
    compression.leaf_id ??
    compression.leafId ??
    compression.leaf_index ??
    compression.leafIndex ??
    compression.seq ??
    compression.sequence
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw
  if (typeof raw === "bigint") {
    const num = Number(raw)
    return Number.isFinite(num) && num >= 0 ? num : null
  }
  if (typeof raw === "string") {
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  }
  return null
}

const LAMPORTS_PER_BMB = 1_000_000_000n

function toLamports(amount: number): bigint {
  if (!Number.isFinite(amount)) return 0n
  const scaled = Math.round(amount * Number(LAMPORTS_PER_BMB))
  return BigInt(scaled)
}

export function useCheckerLicenses(owner: PublicKey | null | undefined) {
  const { cluster, endpoints } = useNetwork()
  const { connection } = useConnection()

  const fetchLicenses = useCallback(async () => {
    if (!owner) return [] as CheckerLicense[]
    const tree = await getCheckerMerkleTrees(cluster)
    const items = await searchCheckerAssets(endpoints.heliusRpc, owner.toBase58(), tree)
    const filtered = Array.isArray(items)
      ? items.filter((it: any) => {
          if (!tree) return true
          const assetTree = it?.compression?.tree
          if (!assetTree) return false
          const normalized = address(tree).toString()
          return String(assetTree) === normalized
        })
      : []
    const mapped: CheckerLicense[] = filtered.map((it: any) => {
      const media = extractMedia(it)
      const attrs: Array<{ trait_type?: string; value?: any }> = it?.content?.metadata?.attributes || []
      const findAttr = (k: string) => attrs.find((a) => a.trait_type?.toLowerCase() === k)?.value
      const delegatedTo = (findAttr("delegate") as string) || null
      const activated = String(findAttr("activated") ?? "false").toLowerCase() === "true"
      const rawRewards = Number(findAttr("rewards") ?? 0)
      const lastCheck = (findAttr("lastCheck") as string) || "-"
      const checkerIndex = extractCheckerIndex(it)
      const rewardsLamports = toLamports(rawRewards)
      return {
        id: it.id,
        name: it?.content?.metadata?.name || it.id,
        publicKey: it.id,
        image: media.image,
        animationUrl: media.animationUrl,
        delegatedTo,
        isActivated: activated,
        totalRewards: baseUnitsToBmb(rewardsLamports),
        lastCheckTime: lastCheck,
        checkerIndex,
        totalRewardsLamports: rewardsLamports,
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

  const fetchLicensesWithRewards = useCallback(async () => {
    const licenses = await fetchLicenses()

    if (!owner) return licenses

    try {
      const [globalRewardsPda] = await GlobalRewardsAccount.findGlobalRewardsPDA()
      const globalRewardsPk = new PublicKey(String(globalRewardsPda))
      const accountInfo = await connection.getAccountInfo(globalRewardsPk, { commitment: connection.commitment || "confirmed" })
      if (!accountInfo?.data) return licenses

      const rewardsAccount = GlobalRewardsAccount.deserializeFrom(accountInfo.data)
      const rewardsArray = rewardsAccount.checkers

      return licenses.map((license) => {
        if (license.checkerIndex === null) return license
        const idx = license.checkerIndex
        if (idx < 0 || idx >= rewardsArray.length) return license
        const raw = rewardsArray[idx] ?? 0n
        const converted = baseUnitsToBmb(raw)
        return { ...license, totalRewards: converted, totalRewardsLamports: raw }
      })
    } catch (err) {
      console.warn("[useCheckerLicenses] Failed to fetch global rewards", err)
      return licenses
    }
  }, [fetchLicenses, owner, connection])

  const ownerKey = owner?.toBase58() || ""
  const query = useQuery({
    queryKey: ["checkerLicenses", cluster, ownerKey],
    queryFn: fetchLicensesWithRewards,
    enabled: !!ownerKey,
  })

  return { licenses: query.data || [], loading: query.isLoading, error: query.error ? String(query.error) : null, reload: query.refetch }
}
