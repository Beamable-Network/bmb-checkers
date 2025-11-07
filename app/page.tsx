"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WalletConnect } from "@/components/wallet-connect"
import { DelegateDialog } from "@/components/delegate-dialog"
import { CheckerLicensesScroll } from "@/components/checker-licenses-scroll"
import type { CheckerLicenseAction } from "@/components/checker-license-card"
import { Wallet, Award, CheckCircle, Users, Coins } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useBmbBalance } from "@/hooks/use-bmb-balance"
import { useCheckerLicenses } from "@/hooks/use-checker-licenses"
import { toast } from "@/hooks/use-toast"
import { ENV } from "@/lib/env"
import { NetworkToggle } from "@/components/network-toggle"
import { useDepinActions } from "@/hooks/use-depin-actions"
import { CheckerActivityCalendar, type CheckerActivityDay } from "@/components/checker-activity-calendar"
import { MaturingRewards } from "@/components/maturing-rewards"
import { useLockedRewards, type LockedRewardPosition } from "@/hooks/use-locked-rewards"
import { Checkbox } from "@/components/ui/checkbox"

const LAMPORTS_PER_BMB = 1_000_000_000n
const LAMPORTS_PER_BMB_NUMBER = Number(LAMPORTS_PER_BMB)

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
  const availableLockedLamports = useMemo(() => {
    if (!connected) return 0n
    return lockedRewards.reduce((sum, reward) => {
      const lamports = BigInt(Math.round(reward.maturedAmount * LAMPORTS_PER_BMB_NUMBER))
      return sum + lamports
    }, 0n)
  }, [connected, lockedRewards])
  const availableLockedDisplay = formatLamports(availableLockedLamports)
  const licensesOwned = licensesData.length
  const licensesDelegated = licensesData.filter((l) => l.delegatedTo !== null).length
  const licensesActivated = licensesData.filter((l) => l.isActivated).length
  const walletBalance = bmbBalance ?? 0

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
      await activateChecker(licenseId)
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
      const sig = await activateChecker(licenseId)
      t.update({ title: "Activated", description: sig })
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
    if (list.length === 0) return
    if (list.length === 0) return
    const chunkSize = 20
    const chunks: string[][] = []
    for (let i = 0; i < list.length; i += chunkSize) {
      chunks.push(list.slice(i, i + chunkSize))
    }
    try {
      setClaimingRewards(true)
      const t = toast({ title: "Claiming…", description: `${list.length} license(s)` })
      let processed = 0
      for (let idx = 0; idx < chunks.length; idx += 1) {
        const chunk = chunks[idx]
        for (const id of chunk) {
          setPendingAction(id, "claim")
        }
        for (const id of chunk) {
          try {
            await payoutCheckerRewards(id)
          } finally {
            clearPendingAction(id)
            processed += 1
            t.update({ title: "Claiming…", description: `${processed}/${list.length} license(s)` })
          }
        }
        const hasMore = idx < chunks.length - 1
        if (hasMore) {
          await refreshLatestBlockhash()
        }
      }
      t.update({ title: "Claimed", description: `${list.length} processed` })
    } catch (e: any) {
      toast({ title: "Claim failed", description: e?.message || String(e) })
    } finally {
      list.forEach((id) => clearPendingAction(id))
      setClaimingRewards(false)
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
      const sig = await payoutCheckerRewards(licenseId)
      toastHandle?.update({ title: "Claimed", description: sig })
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
      const sig = await unlockLockedTokens({ lockPeriod: reward.lockPeriod, unlockPeriod: reward.unlockPeriod })
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
          await unlockLockedTokens({ lockPeriod: reward.lockPeriod, unlockPeriod: reward.unlockPeriod })
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

  const metricCards = useMemo(
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
      {
        title: "Available BMB",
        description: "Checker rewards you can immediately withdraw",
        icon: Award,
        value: `${availableLockedDisplay} $BMB`,
        accent: true,
      },
    ],
    [licensesOwned, licensesDelegated, licensesActivated, availableLockedDisplay],
  )

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-primary/40 bg-secondary/80 backdrop-blur-md">
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30">
              <svg className="h-6 w-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Beamable Network</h1>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Checker Licensing Console</p>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3 sm:gap-4">
            {connected && (
              <div className="flex h-8 items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-3 text-xs sm:text-sm">
                <Coins className="h-3 w-3 text-primary" />
                <span className="hidden text-muted-foreground sm:inline">BMB</span>
                <span className="font-semibold text-primary">{walletBalance.toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <NetworkToggle />
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

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map(({ title, description, icon: Icon, value, accent }) => (
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
                      <CardTitle className={`text-2xl font-semibold ${accent ? "text-primary" : ""}`}>{value}</CardTitle>
                      <CardDescription className="mt-2 text-xs text-muted-foreground">{description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <MaturingRewards
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

            <section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-xl shadow-secondary/20">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Licenses</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">Your checker licenses</h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Search and filter licensing assets. Activate operators or delegate management with a single click.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <span>{licensesData.length.toLocaleString()} total</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{licensesDelegated.toLocaleString()} delegated</span>
                  </div>
                  {connected && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="filter-pending"
                        checked={pendingRewardsOnly}
                        onCheckedChange={(checked) => setPendingRewardsOnly(checked === true)}
                      />
                      <label htmlFor="filter-pending" className="text-xs text-muted-foreground">
                        Pending rewards
                      </label>
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
                  )}
                </div>
              </div>
              <div className="mt-6">
                <CheckerLicensesScroll
                  licenses={displayedLicenses}
                  onActivate={handleActivate}
                  onDelegate={handleDelegate}
                  onUndelegate={handleUndelegate}
                  onClaim={connected ? handleClaimLicenseRewards : undefined}
                  pendingActions={pendingActions}
                />
              </div>
            </section>

            <CheckerActivityCalendar days={activityCalendarDays} totalLicenses={licensesOwned} />
          </div>
        )}
      </main>

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
