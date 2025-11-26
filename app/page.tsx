"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState, type SVGProps } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WalletConnect } from "@/components/wallet-connect"
import { DelegateDialog } from "@/components/delegate-dialog"
import { CheckerLicensesScroll } from "@/components/checker-licenses-scroll"
import type { CheckerLicenseAction } from "@/components/checker-license-card"
import { Wallet, Award, CheckCircle, Users, Coins, Lock } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useBmbBalance } from "@/hooks/use-bmb-balance"
import { useCheckerLicenses } from "@/hooks/use-checker-licenses"
import { toast } from "@/hooks/use-toast"
import { ENV } from "@/lib/env"
import { NetworkToggle } from "@/components/network-toggle"
import { UtcWindowProgress } from "@/components/utc-window-progress"
import { useDepinActions } from "@/hooks/use-depin-actions"
import { CheckerActivityCalendar, type CheckerActivityDay } from "@/components/checker-activity-calendar"
import { VestingRewards } from "@/components/vesting-rewards"
import { useLockedRewards, type LockedRewardPosition } from "@/hooks/use-locked-rewards"
import { Checkbox } from "@/components/ui/checkbox"

const LAMPORTS_PER_BMB = 1_000_000_000n
const LAMPORTS_PER_BMB_NUMBER = Number(LAMPORTS_PER_BMB)
const NETWORK_TOGGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_NETWORK_TOGGLE === "true"

function lamportsFromNumber(amount: number): bigint {
  return BigInt(Math.round(amount * LAMPORTS_PER_BMB_NUMBER))
}

function formatLamports(amount: bigint): string {
  const sign = amount < 0n ? "-" : ""
  let value = amount < 0n ? -amount : amount
  const whole = value / LAMPORTS_PER_BMB
  const fraction = value % LAMPORTS_PER_BMB
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0"
  if (fraction === 0n) return `${sign}${wholeStr}`
  const fractionStr = fraction.toString().padStart(9, "0").replace(/0+$/, "")
  return `${sign}${wholeStr}.${fractionStr}`
}

function formatBmbAmount(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const abs = Math.abs(value)
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: abs >= 1 ? 2 : 0,
    maximumFractionDigits: abs >= 1 ? 6 : 9,
  })
  const trimmed = formatted.replace(/\.?0+$/, "")
  return trimmed === "" ? "0" : trimmed
}

type SocialIconProps = SVGProps<SVGSVGElement>

const DiscordIcon = ({ className, ...props }: SocialIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.863-.608 1.249-1.844-.277-3.68-.277-5.486 0-.164-.402-.405-.874-.617-1.249a.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C1.32 9.042.48 13.58.838 18.062a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 6.021 3.058.078.078 0 0 0 .084-.027c.464-.63.877-1.295 1.226-1.994a.076.076 0 0 0-.041-.104 12.998 12.998 0 0 1-1.872-.892.077.077 0 0 1-.036-.065c.005-.029.03-.051.063-.056 3.927 1.793 8.18 1.793 12.061 0 .032.005.058.027.063.056a.077.077 0 0 1-.036.065 12.32 12.32 0 0 1-1.872.892.076.076 0 0 0-.041.104c.36.699.773 1.364 1.226 1.994a.077.077 0 0 0 .084.027 19.875 19.875 0 0 0 6.03-3.058.076.076 0 0 0 .031-.056c.5-5.177-.838-9.682-3.548-13.666a.061.061 0 0 0-.032-.027zm-12.037 9.96c-1.183 0-2.157-1.095-2.157-2.437 0-1.341.955-2.437 2.157-2.437 1.211 0 2.175 1.105 2.157 2.437 0 1.341-.955 2.437-2.157 2.437zm7.46 0c-1.183 0-2.157-1.095-2.157-2.437 0-1.341.955-2.437 2.157-2.437 1.211 0 2.175 1.105 2.157 2.437 0 1.341-.946 2.437-2.157 2.437z" />
  </svg>
)

const XIcon = ({ className, ...props }: SocialIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M18.244 3h2.963l-6.476 7.399L22 21h-5.807l-4.551-5.958L6.374 21H3.41l6.91-7.908L2 3h5.977l4.114 5.495L18.244 3zm-1.037 16.146h1.64L7.88 4.002H6.15l11.057 15.144z" />
  </svg>
)

type ClaimProgressState = {
  total: number
  submitted: number
  completed: number
  failed: number
  currentId: string | null
}

const mockCheckerLicenses = [
  {
    id: "1",
    name: "Checker License #1247",
    publicKey: "7xK9mP2qAbCdEfGhIjKlMnOpQrStUvWxYz",
    image: "/futuristic-holographic-checker-badge-green.jpg",
    delegatedTo: null,
    isActivated: true,
    totalRewards: 2847.52,
    uptime: 99.8,
    lastCheckTime: "2 minutes ago",
    checkerIndex: null,
    totalRewardsLamports: lamportsFromNumber(2847.52),
  },
  {
    id: "2",
    name: "Checker License #3891",
    publicKey: "4aB8nQ3rCdEfGhIjKlMnOpQrStUvWxYzA",
    image: "/futuristic-holographic-checker-badge-blue.jpg",
    delegatedTo: "9pL2kM5nAbCdEfGhIjKlMnOpQrStUvWx",
    isActivated: true,
    totalRewards: 1523.18,
    uptime: 98.2,
    lastCheckTime: "5 minutes ago",
    checkerIndex: null,
    totalRewardsLamports: lamportsFromNumber(1523.18),
  },
  {
    id: "3",
    name: "Checker License #5623",
    publicKey: "2cD7oP4qEfGhIjKlMnOpQrStUvWxYzAb",
    image: "/futuristic-holographic-checker-badge-purple.jpg",
    delegatedTo: null,
    isActivated: false,
    totalRewards: 0,
    uptime: 0,
    lastCheckTime: "Never",
    checkerIndex: null,
    totalRewardsLamports: lamportsFromNumber(0),
  },
  {
    id: "4",
    name: "Checker License #7892",
    publicKey: "8eF3pQ6rGhIjKlMnOpQrStUvWxYzAbCd",
    image: "/futuristic-holographic-checker-badge-green.jpg",
    delegatedTo: "5mN8kL3pBcDeFgHiJkLmNoPqRsTuVwXy",
    isActivated: true,
    totalRewards: 2134.67,
    uptime: 97.5,
    lastCheckTime: "8 minutes ago",
    checkerIndex: null,
    totalRewardsLamports: lamportsFromNumber(2134.67),
  },
  {
    id: "5",
    name: "Checker License #9234",
    publicKey: "6gH9qR2sIjKlMnOpQrStUvWxYzAbCdEf",
    image: "/futuristic-holographic-checker-badge-blue.jpg",
    delegatedTo: null,
    isActivated: true,
    totalRewards: 3456.89,
    uptime: 99.2,
    lastCheckTime: "1 minute ago",
    checkerIndex: null,
    totalRewardsLamports: lamportsFromNumber(3456.89),
  },
  {
    id: "6",
    name: "Checker License #4567",
    publicKey: "3iJ5rS8tKlMnOpQrStUvWxYzAbCdEfGh",
    image: "/futuristic-holographic-checker-badge-purple.jpg",
    delegatedTo: null,
    isActivated: true,
    totalRewards: 1289.45,
    uptime: 96.8,
    lastCheckTime: "12 minutes ago",
    checkerIndex: null,
    totalRewardsLamports: lamportsFromNumber(1289.45),
  },
]

export default function CheckerConsole() {
  const { connected, publicKey } = useWallet()
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null)
  const [isDelegateDialogOpen, setIsDelegateDialogOpen] = useState(false)
  const [delegateMode, setDelegateMode] = useState<"delegate" | "undelegate">("delegate")
  const { balance: bmbBalance } = useBmbBalance(publicKey || null)
  const { licenses, loading: licensesLoading } = useCheckerLicenses(publicKey || null)
  const {
    positions: lockedRewards,
    loading: lockedRewardsLoading,
    refetching: lockedRewardsRefetching,
    error: lockedRewardsError,
    refetch: refetchLockedRewards,
  } = useLockedRewards(publicKey || null)
  const { activateChecker, payoutCheckerRewards, unlockLockedTokens, refreshLatestBlockhash } = useDepinActions()
  const [claimingRewards, setClaimingRewards] = useState(false)
  const [claimProgress, setClaimProgress] = useState<ClaimProgressState | null>(null)
  const [activatingLicenses, setActivatingLicenses] = useState(false)
  const [activateProgress, setActivateProgress] = useState<ClaimProgressState | null>(null)
  const [pendingActions, setPendingActions] = useState<Record<string, CheckerLicenseAction>>({})
  const [lockedWithdrawState, setLockedWithdrawState] = useState<Record<string, boolean>>({})
  const [withdrawingLockedSelection, setWithdrawingLockedSelection] = useState(false)
  const [pendingRewardsOnly, setPendingRewardsOnly] = useState(false)

  const setPendingAction = (id: string, action: CheckerLicenseAction) => {
    setPendingActions((prev) => ({ ...prev, [id]: action }))
  }

  const clearPendingAction = (id: string) => {
    setPendingActions((prev) => {
      const { [id]: _action, ...rest } = prev
      return rest
    })
  }

  const licensesData = connected ? licenses : mockCheckerLicenses
  const inactiveLicenses = useMemo(() => licensesData.filter((license) => !license.isActivated), [licensesData])
  const hasInactiveLicenses = inactiveLicenses.length > 0
  const displayedLicenses = useMemo(() => {
    if (!pendingRewardsOnly) return licensesData
    return licensesData.filter((license) => license.isActivated && (license.totalRewards ?? 0) > 0)
  }, [licensesData, pendingRewardsOnly])
  const hasDisplayedClaimable = useMemo(
    () => displayedLicenses.some((license) => (license.totalRewards ?? 0) > 0),
    [displayedLicenses],
  )
  const claimableRewards = useMemo(() => {
    const source = connected ? licenses : licensesData
    const lamports = source.reduce(
      (sum, license) => sum + (license.totalRewardsLamports ?? lamportsFromNumber(license.totalRewards || 0)),
      0n,
    )
    const whole = Number(lamports / LAMPORTS_PER_BMB)
    const fractional = Number(lamports % LAMPORTS_PER_BMB) / 1_000_000_000
    const units = whole + fractional
    return { lamports, units }
  }, [connected, licenses, licensesData])
  const claimableRewardsLamports = claimableRewards.lamports
  const { unlockedLamports: unlockedBmbLamports, lockedLamports: lockedBmbLamports } = useMemo(() => {
    if (!connected) return { unlockedLamports: 0n, lockedLamports: 0n }
    return lockedRewards.reduce(
      (acc, reward) => {
        const totalLamports = reward.totalLockedRaw ?? 0n
        const maturedLamports = BigInt(Math.round(reward.maturedAmount * LAMPORTS_PER_BMB_NUMBER))
        const remainingLamports = totalLamports > maturedLamports ? totalLamports - maturedLamports : 0n
        acc.unlockedLamports += maturedLamports
        acc.lockedLamports += remainingLamports
        return acc
      },
      { unlockedLamports: 0n, lockedLamports: 0n },
    )
  }, [connected, lockedRewards])
  const unlockedBmbDisplay = formatLamports(unlockedBmbLamports)
  const claimableRewardsDisplay = formatLamports(claimableRewardsLamports)
  const lockedBmbDisplay = formatLamports(lockedBmbLamports)
  const licensesOwned = licensesData.length
  const licensesDelegated = licensesData.filter((l) => l.delegatedTo !== null).length
  const licensesActivated = licensesData.filter((l) => l.isActivated).length
  const walletBalance = bmbBalance ?? 0

  const licenseMetrics = useMemo(
    () => [
      {
        title: "Licenses Owned",
        description: "Total checker licenses available",
        icon: Wallet,
        value: licensesOwned.toLocaleString(),
      },
      {
        title: "Licenses Delegated",
        description: "Operating with delegated operators",
        icon: Users,
        value: licensesDelegated.toLocaleString(),
      },
      {
        title: "Licenses Activated",
        description: "Ready to perform checks",
        icon: CheckCircle,
        value: licensesActivated.toLocaleString(),
      },
    ],
    [licensesOwned, licensesDelegated, licensesActivated],
  )

  const balanceMetrics = useMemo(
    () => [
      {
        title: "Unlocked BMB",
        description: "Vesting rewards ready to withdraw",
        icon: Award,
        value: unlockedBmbDisplay,
        accent: true,
      },
      {
        title: "Locked BMB",
        description: "Currently vesting across all periods",
        icon: Lock,
        value: lockedBmbDisplay,
      },
      {
        title: "Unclaimed BMB",
        description: "Checker rewards ready to claim",
        icon: Coins,
        value: claimableRewardsDisplay,
      },
    ],
    [unlockedBmbDisplay, lockedBmbDisplay, claimableRewardsDisplay],
  )

  const currentClaimLabel = useMemo(() => {
    if (!claimProgress?.currentId) return null
    const license = licensesData.find((item) => item.id === claimProgress.currentId)
    return license?.name || `License ${claimProgress.currentId}`
  }, [claimProgress, licensesData])

  const claimProgressSummary = useMemo(() => {
    if (!claimProgress) return null
    const { total, submitted, completed, failed } = claimProgress
    const confirmed = Math.min(completed + failed, total)
    const submissionPercent = total > 0 ? (submitted / total) * 100 : 0
    const completionPercent = total > 0 ? (confirmed / total) * 100 : 0
    const remainingSubmissions = Math.max(total - submitted, 0)
    const remainingCompletions = Math.max(total - confirmed, 0)
    return {
      total,
      submitted,
      completed,
      failed,
      confirmed,
      submissionPercent,
      completionPercent,
      remainingSubmissions,
      remainingCompletions,
    }
  }, [claimProgress])

  const currentActivateLabel = useMemo(() => {
    if (!activateProgress?.currentId) return null
    const license = licensesData.find((item) => item.id === activateProgress.currentId)
    return license?.name || `License ${activateProgress.currentId}`
  }, [activateProgress, licensesData])

  const activateProgressSummary = useMemo(() => {
    if (!activateProgress) return null
    const { total, submitted, completed, failed } = activateProgress
    const confirmed = Math.min(completed + failed, total)
    const submissionPercent = total > 0 ? (submitted / total) * 100 : 0
    const completionPercent = total > 0 ? (confirmed / total) * 100 : 0
    const remainingSubmissions = Math.max(total - submitted, 0)
    const remainingCompletions = Math.max(total - confirmed, 0)
    return {
      total,
      submitted,
      completed,
      failed,
      confirmed,
      submissionPercent,
      completionPercent,
      remainingSubmissions,
      remainingCompletions,
    }
  }, [activateProgress])

  const utcWindowMode = useMemo(() => {
    if (activatingLicenses && activateProgress && activateProgressSummary) {
      return {
        type: "activate" as const,
        total: activateProgressSummary.total,
        submitted: activateProgressSummary.submitted,
        label: currentActivateLabel,
        completed: activateProgressSummary.completed,
        failed: activateProgressSummary.failed,
      }
    }
    if (claimingRewards && claimProgress && claimProgressSummary) {
      return {
        type: "claim" as const,
        total: claimProgressSummary.total,
        submitted: claimProgressSummary.submitted,
        label: currentClaimLabel,
        completed: claimProgressSummary.completed,
        failed: claimProgressSummary.failed,
      }
    }
    return { type: "idle" as const }
  }, [
    activatingLicenses,
    activateProgress,
    activateProgressSummary,
    currentActivateLabel,
    claimingRewards,
    claimProgress,
    claimProgressSummary,
    currentClaimLabel,
  ])

  const activityCalendarDays = useMemo<CheckerActivityDay[]>(() => {
    const total = licensesData.length
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (total === 0) return []

    const days: CheckerActivityDay[] = []
    for (let offset = 0; offset < 30; offset += 1) {
      const day = new Date(today)
      day.setUTCDate(today.getUTCDate() - offset)
      const iso = day.toISOString()

      if (offset === 0) {
        days.push({
          date: iso,
          status: "pending",
          licensesTotal: total,
        })
        continue
      }

      const pattern = offset % 6
      let status: CheckerActivityDay["status"]
      if (pattern <= 2) status = "maxed"
      else if (pattern === 3 || pattern === 4) status = "partial"
      else status = "missed"

      const workersPerLicense = 5
      const activitiesAssigned = total * workersPerLicense
      let licensesChecked = total
      let activitiesCompleted = activitiesAssigned

      if (status === "partial") {
        activitiesCompleted = Math.max(
          0,
          Math.round(activitiesAssigned * (0.72 + ((offset % 3) * 0.06))),
        )
      } else if (status === "missed") {
        licensesChecked = Math.max(0, total - Math.max(1, Math.ceil(total * 0.5)))
        activitiesCompleted = Math.max(
          0,
          Math.round(activitiesAssigned * (0.35 + ((offset % 2) * 0.1))),
        )
      }

      activitiesCompleted = Math.min(activitiesCompleted, activitiesAssigned)
      days.push({
        date: iso,
        status,
        licensesTotal: total,
        licensesChecked,
        activitiesAssigned,
        activitiesCompleted,
        workersAvailable: activitiesAssigned,
      })
    }

    return days.reverse()
  }, [licensesData.length])

  const pendingActivityDay = useMemo(
    () => activityCalendarDays.find((day) => day.status === "pending") ?? null,
    [activityCalendarDays],
  )

  const handleDelegate = (licenseId: string) => {
    setSelectedLicense(licenseId)
    setDelegateMode("delegate")
    setIsDelegateDialogOpen(true)
  }

  const handleUndelegate = async (licenseId: string) => {
    setSelectedLicense(licenseId)
    try {
      setPendingAction(licenseId, "undelegate")
      const t = toast({ title: "Undelegating…", description: `License ${licenseId}` })
      const { confirmation } = await activateChecker(licenseId)
      await confirmation
      t.update({ title: "Undelegated" })
    } catch (e: any) {
      toast({ title: "Undelegate failed", description: e?.message || String(e) })
    } finally {
      clearPendingAction(licenseId)
    }
  }

  const handleActivate = async (licenseId: string) => {
    try {
      setPendingAction(licenseId, "activate")
      console.debug("[UI] Activate click", { licenseId })
      const t = toast({ title: "Activating…", description: `License ${licenseId}` })
      const { signature } = await activateChecker(licenseId)
      t.update({ title: "Activated", description: signature })
    } catch (e: any) {
      console.error("[UI] Activation failed", { message: e?.message, stack: e?.stack })
      toast({ title: "Activation failed", description: e?.message || String(e) })
    } finally {
      clearPendingAction(licenseId)
    }
  }

  const handleClaimAllRewards = async () => {
    if (!connected || claimableRewardsLamports <= 0n || claimingRewards) return
    const sourceLicenses = pendingRewardsOnly ? displayedLicenses : licensesData
    const list = sourceLicenses.filter((l) => (l.totalRewards ?? 0) > 0).map((l) => l.id)
    if (list.length === 0) {
      setClaimProgress(null)
      return
    }
    const chunkSize = 20
    const chunks: string[][] = []
    for (let i = 0; i < list.length; i += chunkSize) {
      chunks.push(list.slice(i, i + chunkSize))
    }

    let progressToast: ReturnType<typeof toast> | undefined
    let lastErrorMessage: string | undefined
    let failureCount = 0
    let submittedCount = 0
    let successCount = 0
    const confirmationTasks: Promise<void>[] = []

    const updateToast = () => {
      progressToast?.update({
        title: "Claiming…",
        description: `Submitted ${submittedCount}/${list.length} • Completed ${successCount + failureCount}/${list.length}`,
      })
    }

    try {
      setClaimingRewards(true)
      setClaimProgress({ total: list.length, submitted: 0, completed: 0, failed: 0, currentId: null })
      progressToast = toast({
        title: "Claiming…",
        description: `Submitted 0/${list.length} • Completed 0/${list.length}`,
      })

      for (let idx = 0; idx < chunks.length; idx += 1) {
        const chunk = chunks[idx]
        chunk.forEach((id) => setPendingAction(id, "claim"))

        for (const id of chunk) {
          setClaimProgress((prev) => (prev ? { ...prev, currentId: id } : prev))
          try {
            const { confirmation } = await payoutCheckerRewards(id, { awaitConfirmation: false })
            submittedCount += 1
            setClaimProgress((prev) =>
              prev
                ? {
                    ...prev,
                    currentId: null,
                    submitted: submittedCount,
                  }
                : prev,
            )
            updateToast()

            const confirmTask = confirmation
              .then(() => {
                successCount += 1
                setClaimProgress((prev) =>
                  prev
                    ? {
                        ...prev,
                        submitted: submittedCount,
                        completed: successCount,
                        failed: failureCount,
                      }
                    : prev,
                )
                updateToast()
              })
              .catch((error: any) => {
                failureCount += 1
                lastErrorMessage = error?.message || String(error)
                setClaimProgress((prev) =>
                  prev
                    ? {
                        ...prev,
                        submitted: submittedCount,
                        completed: successCount,
                        failed: failureCount,
                      }
                    : prev,
                )
                updateToast()
              })
              .finally(() => {
                clearPendingAction(id)
              })

            confirmationTasks.push(confirmTask)
          } catch (error: any) {
            failureCount += 1
            submittedCount += 1
            lastErrorMessage = error?.message || String(error)
            setClaimProgress((prev) =>
              prev
                ? {
                    ...prev,
                    currentId: null,
                    submitted: submittedCount,
                    completed: successCount,
                    failed: failureCount,
                  }
                : prev,
            )
            updateToast()
            clearPendingAction(id)
          }
        }

        const hasMoreChunks = idx < chunks.length - 1
        if (hasMoreChunks) {
          await refreshLatestBlockhash()
        }
      }

      await Promise.allSettled(confirmationTasks)

      if (failureCount > 0) {
        const successTotal = successCount
        progressToast?.update({
          title: "Claimed with issues",
          description: `${successTotal} succeeded, ${failureCount} failed`,
        })
        toast({
          title: "Claim completed with issues",
          description: lastErrorMessage || `${failureCount} license(s) failed to claim.`,
          variant: "destructive",
        })
      } else {
        progressToast?.update({
          title: "Claimed",
          description: `${successCount} processed`,
        })
      }
    } catch (e: any) {
      progressToast?.update({
        title: "Claim failed",
        description: e?.message || "Unable to claim rewards.",
      })
      toast({ title: "Claim failed", description: e?.message || String(e) })
    } finally {
      setClaimingRewards(false)
      setClaimProgress(null)
    }
  }

  const handleActivateAllLicenses = async () => {
    if (!connected || activatingLicenses) return
    const targets = inactiveLicenses
    if (targets.length === 0) return

    let progressToast: ReturnType<typeof toast> | undefined
    let lastErrorMessage: string | undefined
    let failureCount = 0
    let submittedCount = 0
    let successCount = 0
    const confirmationTasks: Promise<void>[] = []

    const updateToast = () => {
      progressToast?.update({
        title: "Activating…",
        description: `Submitted ${submittedCount}/${targets.length} • Completed ${successCount + failureCount}/${targets.length}`,
      })
    }

    try {
      setActivatingLicenses(true)
      setActivateProgress({ total: targets.length, submitted: 0, completed: 0, failed: 0, currentId: null })
      progressToast = toast({
        title: "Activating…",
        description: `Submitted 0/${targets.length} • Completed 0/${targets.length}`,
      })

      for (let index = 0; index < targets.length; index += 1) {
        const license = targets[index]
        setPendingAction(license.id, "activate")
        setActivateProgress((prev) => (prev ? { ...prev, currentId: license.id } : prev))
        try {
          const { confirmation } = await activateChecker(license.id, undefined, { awaitConfirmation: false })
          submittedCount += 1
          setActivateProgress((prev) =>
            prev
              ? {
                  ...prev,
                  currentId: null,
                  submitted: submittedCount,
                }
              : prev,
          )
          updateToast()

          const confirmTask = confirmation
            .then(() => {
              successCount += 1
              setActivateProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      submitted: submittedCount,
                      completed: successCount,
                      failed: failureCount,
                    }
                  : prev,
              )
              updateToast()
            })
            .catch((error: any) => {
              failureCount += 1
              lastErrorMessage = error?.message || String(error)
              setActivateProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      submitted: submittedCount,
                      completed: successCount,
                      failed: failureCount,
                    }
                  : prev,
              )
              updateToast()
            })
            .finally(() => {
              clearPendingAction(license.id)
            })

          confirmationTasks.push(confirmTask)
        } catch (error: any) {
          failureCount += 1
          submittedCount += 1
          lastErrorMessage = error?.message || String(error)
          setActivateProgress((prev) =>
            prev
              ? {
                  ...prev,
                  currentId: null,
                  submitted: submittedCount,
                  completed: successCount,
                  failed: failureCount,
                }
              : prev,
          )
          updateToast()
          clearPendingAction(license.id)
        }

        const hasMore = index < targets.length - 1
        if (hasMore && (index + 1) % 10 === 0) {
          await refreshLatestBlockhash()
        }
      }

      await Promise.allSettled(confirmationTasks)

      if (failureCount > 0) {
        const successTotal = successCount
        progressToast?.update({
          title: "Activation completed with issues",
          description: `${successTotal} succeeded, ${failureCount} failed`,
        })
        toast({
          title: "Activation issues",
          description: lastErrorMessage || `${failureCount} license(s) failed to activate.`,
          variant: "destructive",
        })
      } else {
        progressToast?.update({
          title: "Activation complete",
          description: `${successCount} processed`,
        })
      }
    } catch (e: any) {
      progressToast?.update({
        title: "Activation failed",
        description: e?.message || "Unable to activate licenses.",
      })
      toast({ title: "Activation failed", description: e?.message || String(e) })
    } finally {
      setActivatingLicenses(false)
      setActivateProgress(null)
    }
  }

  const handleClaimLicenseRewards = async (licenseId: string) => {
    if (!connected || claimingRewards) return
    const license = licensesData.find((item) => item.id === licenseId)
    if (!license || (license.totalRewards ?? 0) <= 0) return

    let toastHandle: ReturnType<typeof toast> | undefined
    try {
      setPendingAction(licenseId, "claim")
      toastHandle = toast({ title: "Claiming reward…", description: `License ${licenseId}` })
      const { signature } = await payoutCheckerRewards(licenseId)
      toastHandle?.update({ title: "Claimed", description: signature })
    } catch (e: any) {
      toast({ title: "Claim failed", description: e?.message || String(e) })
    } finally {
      clearPendingAction(licenseId)
    }
  }

  const handleWithdrawLockedReward = async (reward: LockedRewardPosition) => {
    const id = reward.address
    let toastHandle: ReturnType<typeof toast> | undefined
    try {
      setLockedWithdrawState((prev) => ({ ...prev, [id]: true }))
      toastHandle = toast({ title: "Withdrawing…", description: `Lock period ${reward.lockPeriod}` })
      const sig = await unlockLockedTokens(reward)
      toastHandle?.update({ title: "Withdrawn", description: sig })
    } catch (e: any) {
      toast({ title: "Withdraw failed", description: e?.message || String(e) })
    } finally {
      setLockedWithdrawState((prev) => {
        const { [id]: _skip, ...rest } = prev
        return rest
      })
      await refetchLockedRewards()
    }
  }

  const handleWithdrawSelection = async (selection: LockedRewardPosition[]) => {
    if (!selection.length || withdrawingLockedSelection) return
    let toastHandle: ReturnType<typeof toast> | undefined
    try {
      setWithdrawingLockedSelection(true)
      toastHandle = toast({ title: "Withdrawing…", description: `${selection.length} lock(s)` })
      setLockedWithdrawState((prev) => {
        const next = { ...prev }
        selection.forEach(({ address }) => {
          next[address] = true
        })
        return next
      })
      let processed = 0
      for (const reward of selection) {
        const id = reward.address
        try {
          await unlockLockedTokens(reward)
        } catch (error) {
          throw error
        } finally {
          setLockedWithdrawState((prev) => {
            const { [id]: _removed, ...rest } = prev
            return rest
          })
          processed += 1
          toastHandle?.update({ title: "Withdrawing…", description: `${processed}/${selection.length} lock(s)` })
        }
      }
      toastHandle?.update({ title: "Withdrawn", description: `${selection.length} processed` })
    } catch (e: any) {
      toast({ title: "Withdraw failed", description: e?.message || String(e) })
    } finally {
      setWithdrawingLockedSelection(false)
      setLockedWithdrawState((prev) => {
        const next = { ...prev }
        selection.forEach(({ address }) => {
          delete next[address]
        })
        return next
      })
      await refetchLockedRewards()
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-primary/40 bg-secondary/80 backdrop-blur-md">
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="https://beamable.network" target="_blank" rel="noreferrer" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-primary/20 shadow-lg shadow-primary/30 ring-1 ring-primary/40">
              <Image
                src="/SBMB_Token_v2_transparent.webp"
                alt="Beamable Network"
                width={40}
                height={40}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-semibold tracking-tight">Beamable Network</h1>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Checker Licensing Console</p>
            </div>
          </Link>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3 sm:gap-4">
            {connected && (
              <div className="flex h-8 items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-3 text-xs sm:text-sm">
                <Coins className="h-3 w-3 text-primary" />
                <span className="hidden text-muted-foreground sm:inline">BMB</span>
                <span className="font-semibold text-primary">{formatBmbAmount(walletBalance)}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {NETWORK_TOGGLE_ENABLED ? <NetworkToggle /> : null}
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {!connected ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="rounded-full border border-primary/30 bg-primary/10 p-6 shadow-lg shadow-primary/30">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">Connect your wallet</h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Link a Solana wallet to inspect checker licenses, activate operators, and monitor rewards in real time.
            </p>
            <div className="mt-6">
              <WalletConnect />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {!ENV.BMB_MINT && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-100 shadow-inner shadow-amber-500/20">
                <p className="font-medium text-amber-50">Configuration required</p>
                <p className="mt-1 text-xs text-amber-200/80">
                  Set <span className="font-mono">NEXT_PUBLIC_BMB_MINT</span> to surface your $BMB balance.
                </p>
              </div>
            )}

            <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-lg shadow-secondary/15">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Overview</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">Checker portfolio snapshot</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary/80" />
                    Synced
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span>Last refresh {licensesLoading ? "—" : "moments ago"}</span>
                </div>
              </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {licenseMetrics.map(({ title, description, icon: Icon, value }) => (
                  <Card
                    key={title}
                    className="border border-border/60 bg-card/70 p-0 shadow-md shadow-secondary/20 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-primary/20"
                  >
                    <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 bg-secondary/60 px-5 py-2.5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/60 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 py-3">
                      <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
                      <CardDescription className="mt-2 text-xs text-muted-foreground">{description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {balanceMetrics.map(({ title, description, icon: Icon, value, accent }) => (
                  <Card
                    key={title}
                    className="border border-border/60 bg-card/70 p-0 shadow-md shadow-secondary/20 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-primary/20"
                  >
                    <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 bg-secondary/60 px-5 py-2.5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/60 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 py-3">
                      <CardTitle className={`break-words text-2xl font-semibold ${accent ? "text-primary" : ""}`}>
                        {value}
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs text-muted-foreground">{description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-xl shadow-secondary/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Licenses</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">Your checker licenses</h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Search and filter licensing assets. Activate operators or delegate management with a single click.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 text-xs text-muted-foreground sm:w-auto sm:max-w-xs sm:items-end">
                  <div className="flex items-center gap-2">
                    <span>{licensesData.length.toLocaleString()} total</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{licensesDelegated.toLocaleString()} delegated</span>
                  </div>
                  {connected && (
                    <>
                      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleActivateAllLicenses}
                          disabled={!connected || !hasInactiveLicenses || activatingLicenses}
                          className="h-8 rounded-lg border-primary/40 bg-primary/15 px-3 text-xs font-semibold text-primary shadow shadow-primary/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary/40 disabled:text-muted-foreground"
                        >
                          {activatingLicenses ? "Activating…" : "Activate All"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleClaimAllRewards}
                          disabled={!connected || !hasDisplayedClaimable || claimingRewards}
                          className="h-8 rounded-lg border-primary/40 bg-primary/15 px-3 text-xs font-semibold text-primary shadow shadow-primary/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary/40 disabled:text-muted-foreground"
                        >
                          {claimingRewards ? "Claiming…" : "Claim All"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <UtcWindowProgress pendingDay={pendingActivityDay} mode={utcWindowMode} />
              </div>
              <div className="mt-6">
                <CheckerLicensesScroll
                  licenses={displayedLicenses}
                  onActivate={handleActivate}
                  onDelegate={handleDelegate}
                  onUndelegate={handleUndelegate}
                  onClaim={connected ? handleClaimLicenseRewards : undefined}
                  pendingActions={pendingActions}
                  showPendingOnly={pendingRewardsOnly}
                  onTogglePending={(value) => setPendingRewardsOnly(value)}
                />
              </div>
            </section>

            <VestingRewards
              positions={lockedRewards}
              loading={lockedRewardsLoading}
              refetching={lockedRewardsRefetching}
              error={lockedRewardsError}
              withdrawingIds={lockedWithdrawState}
              withdrawingSelection={withdrawingLockedSelection}
              onWithdraw={handleWithdrawLockedReward}
              onWithdrawSelection={handleWithdrawSelection}
              onRefresh={() => {
                void refetchLockedRewards()
              }}
            />

            {NETWORK_TOGGLE_ENABLED ? (
              <CheckerActivityCalendar days={activityCalendarDays} totalLicenses={licensesOwned} />
            ) : null}
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 bg-secondary/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center sm:text-left">© {new Date().getFullYear()} Beamable Network</p>
          <nav className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="https://docs.beamable.network/policies/terms-of-service"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-foreground"
            >
              Terms of Service
            </Link>
            <span className="hidden text-border sm:inline">•</span>
            <Link
              href="https://docs.beamable.network/policies/privacy-policy"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <span className="hidden text-border sm:inline">•</span>
            <Link
              href="https://docs.beamable.network/policies/disclaimer"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-foreground"
            >
              Disclaimer
            </Link>
          </nav>
          <div className="flex items-center justify-center gap-2 text-sm sm:justify-end">
            <Link
              href="https://discord.gg/beamablenetwork"
              target="_blank"
              rel="noreferrer"
              aria-label="Beamable Network on Discord"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
            >
              <DiscordIcon className="h-4 w-4" />
            </Link>
            <Link
              href="https://x.com/Beamablenetwork"
              target="_blank"
              rel="noreferrer"
              aria-label="Beamable Network on X"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
            >
              <XIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </footer>

      <DelegateDialog
        open={isDelegateDialogOpen}
        onOpenChange={setIsDelegateDialogOpen}
        mode={delegateMode}
        licenseId={selectedLicense}
        onSubmit={async (addr?: string) => {
          if (!selectedLicense) return
          try {
            const actionType: CheckerLicenseAction = delegateMode === "delegate" ? "delegate" : "undelegate"
            setPendingAction(selectedLicense, actionType)
            const t = toast({ title: "Delegating…", description: addr })
            await activateChecker(selectedLicense, addr)
            t.update({ title: "Delegated", description: addr })
          } catch (e: any) {
            toast({ title: "Delegate failed", description: e?.message || String(e) })
          } finally {
            clearPendingAction(selectedLicense)
          }
        }}
      />
    </div>
  )
}
