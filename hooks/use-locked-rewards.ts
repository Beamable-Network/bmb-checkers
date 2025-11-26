"use client"

import { useCallback } from "react"
import { PublicKey } from "@solana/web3.js"
import { useConnection } from "@solana/wallet-adapter-react"
import {
  FlexlockTokensAccount,
  baseUnitsToBmb,
  getCurrentPeriod,
  periodToTimestamp,
} from "@beamable-network/depin"
import { address } from "gill"
import { useQuery } from "@tanstack/react-query"
import { useNetwork } from "@/hooks/use-network"

type RawLockedReward = {
  address: string
  lockPeriod: number
  unlockPeriod: number
  totalLockedRaw: bigint
  sender: string
  receiver: string
  rentReceiver: string
}

export type LockedRewardPosition = RawLockedReward & {
  lockTimestampMs: number
  unlockTimestampMs: number
  totalLocked: number
  maturedAmount: number
  penaltyAmount: number
  progress: number
  penaltyPct: number
  daysRemaining: number
  periodDurationDays: number
}

function toNumber(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value
}

export function useLockedRewards(owner: PublicKey | null | undefined) {
  const { connection } = useConnection()
  const { cluster } = useNetwork()

  const ownerKey = owner?.toBase58() ?? null

  const fetchLockedRewards = useCallback(async () => {
    if (!owner || !ownerKey) return [] as RawLockedReward[]

    const list = await FlexlockTokensAccount.getFlexlockTokensByReceiver(
      async (programAddress, filters) => {
        const pk = new PublicKey(String(programAddress))
        const mappedFilters = filters.map((filter) => {
          if ("memcmp" in filter && filter.memcmp) {
            const { memcmp } = filter
            return {
              memcmp: {
                ...memcmp,
                offset: toNumber(memcmp.offset),
              },
            }
          }
          if ("dataSize" in filter && typeof filter.dataSize !== "undefined") {
            return { dataSize: toNumber(filter.dataSize) }
          }
          return filter as any
        })
        const accounts = await connection.getProgramAccounts(pk, {
          commitment: connection.commitment || "confirmed",
          filters: mappedFilters as any,
        })
        return accounts.map(({ pubkey, account }) => ({
          pubkey: pubkey.toBase58(),
          account: { data: account.data },
        }))
      },
      address(ownerKey),
    )

    return list.map((entry) => ({
      address: String(entry.address),
      lockPeriod: entry.data.lockPeriod,
      unlockPeriod: entry.data.unlockPeriod,
      totalLockedRaw: entry.data.amount,
      sender: String(entry.data.sender),
      receiver: String(entry.data.receiver),
      rentReceiver: String(entry.data.rentReceiver),
    }))
  }, [connection, owner, ownerKey])

  const query = useQuery({
    queryKey: ["lockedRewards", cluster, ownerKey],
    queryFn: fetchLockedRewards,
    enabled: !!ownerKey,
    refetchInterval: 60_000,
  })

  const rawPositions = query.data ?? []
  const currentPeriod = getCurrentPeriod()

  const positions: LockedRewardPosition[] = rawPositions
    .map((entry) => {
      const lockTimestamp = Number(periodToTimestamp(entry.lockPeriod)) * 1000
      const unlockTimestamp = Number(periodToTimestamp(entry.unlockPeriod)) * 1000
      const periodDuration = Math.max(entry.unlockPeriod - entry.lockPeriod, 0)
      const elapsed = Math.max(currentPeriod - entry.lockPeriod, 0)
      const clampedElapsed = periodDuration > 0 ? Math.min(elapsed, periodDuration) : elapsed
      const progress = periodDuration > 0 ? Math.min(clampedElapsed / periodDuration, 1) : 1
      const totalLocked = baseUnitsToBmb(entry.totalLockedRaw)
      const maturedAmount = Math.min(totalLocked, totalLocked * progress)
      const penaltyAmount = Math.max(totalLocked - maturedAmount, 0)
      const daysRemaining = Math.max(entry.unlockPeriod - currentPeriod, 0)

      return {
        ...entry,
        lockTimestampMs: lockTimestamp,
        unlockTimestampMs: unlockTimestamp,
        totalLocked,
        maturedAmount,
        penaltyAmount,
        progress,
        penaltyPct: totalLocked > 0 ? Math.max(0, Math.min(1, penaltyAmount / totalLocked)) : 0,
        daysRemaining,
        periodDurationDays: periodDuration,
      }
    })
    .sort((a, b) => a.penaltyPct - b.penaltyPct)

  return {
    positions,
    loading: query.isLoading,
    refetching: query.isRefetching,
    error: query.error ? (query.error as Error).message ?? String(query.error) : null,
    refetch: query.refetch,
    hasWallet: !!ownerKey,
  }
}
