"use client"

import { useEffect, useMemo, useState } from "react"
import { LockedRewardPosition } from "@/hooks/use-locked-rewards"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { AlertCircle, ArrowDownToLine, RefreshCw, Hourglass, Copy } from "lucide-react"

type MaturingRewardsProps = {
  positions: LockedRewardPosition[]
  loading: boolean
  refetching: boolean
  error?: string | null
  withdrawingIds: Record<string, boolean>
  withdrawingSelection: boolean
  onWithdraw: (position: LockedRewardPosition) => Promise<void> | void
  onWithdrawSelection: (selection: LockedRewardPosition[]) => Promise<void> | void
  onRefresh: () => void
}

const percentFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
})

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function getHeatColor(progress: number) {
  const clamped = Math.max(0, Math.min(progress, 1))
  const hue = Math.round(clamped * 115)
  return `hsl(${hue}deg 78% 50%)`
}

function getGlowColor(progress: number) {
  return getHeatColor(progress).replace("hsl", "hsla").replace(")", ", 0.35)")
}

function formatAmount(value: number) {
  if (!Number.isFinite(value)) return "0"
  const abs = Math.abs(value)
  const maximumFractionDigits = abs >= 1 ? 4 : 9
  const minimumFractionDigits = abs >= 1 ? 2 : 0
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  })
  return formatted.replace(/\.?0+$/, "")
}

function formatPercent(value: number) {
  return percentFormatter.format(value * 100)
}

function formatDays(days: number) {
  if (days <= 0) return "Ready now"
  if (days === 1) return "Unlocks in 1 day"
  return `Unlocks in ${days.toLocaleString()} days`
}

function formatRange(startMs: number, endMs: number) {
  const start = dateFormatter.format(new Date(startMs))
  const end = dateFormatter.format(new Date(endMs))
  return `${start} → ${end}`
}

export function MaturingRewards({
  positions,
  loading,
  refetching,
  error,
  withdrawingIds,
  withdrawingSelection,
  onWithdraw,
  onWithdrawSelection,
  onRefresh,
}: MaturingRewardsProps) {
  const [showWithdrawSelected, setShowWithdrawSelected] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [showMatureOnly, setShowMatureOnly] = useState(false)

  useEffect(() => {
    setSelectedIds((prev) => {
      const next: Record<string, boolean> = {}
      positions.forEach((pos) => {
        if (prev[pos.address]) next[pos.address] = true
      })
      return next
    })
  }, [positions])

  useEffect(() => {
    if (!showMatureOnly) return
    setSelectedIds((prev) => {
      const next = { ...prev }
      positions.forEach((pos) => {
        if (pos.penaltyPct > 0.000001) delete next[pos.address]
      })
      return next
    })
  }, [showMatureOnly, positions])

  const filteredPositions = useMemo(() => {
    if (!showMatureOnly) return positions
    return positions.filter((pos) => pos.penaltyPct <= 0.000001)
  }, [positions, showMatureOnly])

  const selectedPositions = useMemo(
    () => positions.filter((pos) => selectedIds[pos.address]),
    [positions, selectedIds],
  )

  const selectedTotals = useMemo(
    () =>
      selectedPositions.reduce(
        (acc, pos) => {
          acc.totalLocked += pos.totalLocked
          acc.available += pos.maturedAmount
          acc.penalty += pos.penaltyAmount
          return acc
        },
        { totalLocked: 0, available: 0, penalty: 0 },
      ),
    [selectedPositions],
  )

  const withdrawSelectionDisabled =
    withdrawingSelection || selectedPositions.length === 0 || selectedTotals.available <= 0
  const withdrawSelectionLabel =
    selectedPositions.length > 0 ? `Withdraw Selected (${selectedPositions.length})` : "Withdraw Selected"

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address).then(
      () => toast({ title: "Copied", description: "PDA address copied to clipboard." }),
      () => toast({ title: "Copy failed", description: "Unable to copy address.", variant: "destructive" }),
    )
  }

  const handleWithdrawSelected = async () => {
    if (withdrawSelectionDisabled) return
    try {
      await Promise.resolve(onWithdrawSelection(selectedPositions))
      setSelectedIds({})
      setShowWithdrawSelected(false)
    } catch (err) {
      console.error("[UI] Withdraw selected failed", err)
    }
  }

  const toggleSelection = (address: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = { ...prev }
      if (checked) next[address] = true
      else delete next[address]
      return next
    })
  }

  const renderEmptyState = () => (
    <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-border/60 bg-secondary/40 text-sm text-muted-foreground">
      <Hourglass className="mb-2 h-5 w-5 text-primary/70" />
      {showMatureOnly ? "No fully mature rewards yet." : "No locked rewards right now."}
    </div>
  )

  return (
    <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-lg shadow-secondary/15">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rewards</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Maturing rewards</h2>
          <p className="mt-2 max-w-xl text-xs text-muted-foreground">
            Checker rewards you can immediately withdraw. Matured balances can be taken now; waiting unlocks more over time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={loading || refetching}
            className="h-9 rounded-lg border border-border/60 bg-card/70 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            {refetching ? <Spinner className="mr-2 h-3.5 w-3.5" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Button
            type="button"
            variant={showMatureOnly ? "default" : "outline"}
            onClick={() => setShowMatureOnly((prev) => !prev)}
            className={cn(
              "h-9 rounded-lg border border-border/60 bg-card/70 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
              showMatureOnly && "border-primary/40 bg-primary/15 text-primary shadow shadow-primary/20",
            )}
          >
            Fully Mature
          </Button>
          <Button
            type="button"
            disabled={withdrawSelectionDisabled}
            onClick={() => setShowWithdrawSelected(true)}
            className="h-9 rounded-lg border border-primary/40 bg-primary/15 px-3 text-xs font-semibold text-primary shadow shadow-primary/20 hover:bg-primary/25 disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary/40 disabled:text-muted-foreground"
          >
            {withdrawingSelection ? <Spinner className="mr-2 h-3.5 w-3.5" /> : <ArrowDownToLine className="mr-2 h-3.5 w-3.5" />}
            {withdrawSelectionLabel}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {loading && !positions.length ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-border/60 bg-secondary/40 text-sm text-muted-foreground">
            <Spinner className="mr-2 h-4 w-4 text-primary" />
            Loading locked rewards…
          </div>
        ) : filteredPositions.length === 0 ? (
          renderEmptyState()
        ) : (
          filteredPositions.map((position) => {
            const heatColor = getHeatColor(1 - position.penaltyPct)
            const glowColor = getGlowColor(1 - position.penaltyPct)
            const penaltyLabel =
              position.penaltyPct <= 0.001 ? "No penalty" : `Penalty ${formatPercent(position.penaltyPct)}%`
            const withdrawDisabled =
              withdrawingSelection ||
              !!withdrawingIds[position.address] ||
              position.penaltyPct >= 0.999999 ||
              position.maturedAmount <= 0

            return (
              <div
                key={position.address}
                className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-lg shadow-secondary/15"
                style={{
                  boxShadow: `0 12px 30px -18px ${glowColor}, inset 0 0 0 1px ${glowColor}`,
                }}
              >
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-1"
                  style={{ background: `linear-gradient(90deg, ${heatColor}, transparent)` }}
                />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Lock period #{position.lockPeriod}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold tracking-tight">{formatDays(position.daysRemaining)}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{formatRange(position.lockTimestampMs, position.unlockTimestampMs)}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge
                        className="border-transparent text-xs font-semibold text-primary-foreground shadow-sm"
                        style={{ backgroundColor: heatColor }}
                      >
                        {penaltyLabel}
                      </Badge>
                      <Checkbox
                        checked={!!selectedIds[position.address]}
                        onCheckedChange={(checked) => toggleSelection(position.address, checked === true)}
                        className="mt-0.5"
                        aria-label="Select reward"
                        disabled={withdrawingSelection}
                      />
                    </div>
                  </div>

                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/70">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.round(position.progress * 100)}%`,
                        background: `linear-gradient(90deg, ${heatColor}, rgba(255,255,255,0.55))`,
                      }}
                    />
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Total locked</p>
                      <p className="mt-1 font-semibold text-primary">
                        {position.totalLocked > 0 ? `${formatAmount(position.totalLocked)} $BMB` : "0 $BMB"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Available now</p>
                      <p className="mt-1 font-semibold text-primary">
                        {position.maturedAmount > 0 ? `${formatAmount(position.maturedAmount)} $BMB` : "0 $BMB"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Penalty today</p>
                      <p className="mt-1 font-semibold text-primary">
                        {formatAmount(position.penaltyAmount)} $BMB
                        {position.penaltyPct > 0.000001 && (
                          <span className="ml-1 text-xs text-muted-foreground">({formatPercent(position.penaltyPct)}%)</span>
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Unlock schedule</p>
                      <p className="mt-1 font-semibold text-primary">
                        {position.periodDurationDays.toLocaleString()} day plan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        PDA:{" "}
                        <span className="font-mono text-[11px] text-primary/90">
                          {position.address.slice(0, 8)}…{position.address.slice(-6)}
                        </span>
                      </p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full border border-border/60 bg-card/70 text-muted-foreground hover:text-primary"
                        onClick={() => handleCopy(position.address)}
                        title="Copy PDA address"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      disabled={withdrawDisabled}
                      onClick={async () => {
                        await Promise.resolve(onWithdraw(position))
                        setSelectedIds((prev) => {
                          if (!prev[position.address]) return prev
                          const next = { ...prev }
                          delete next[position.address]
                          return next
                        })
                      }}
                      className={cn(
                        "h-9 rounded-lg border border-primary/40 bg-primary/15 px-3 text-xs font-semibold text-primary shadow shadow-primary/20 hover:bg-primary/25 disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary/40 disabled:text-muted-foreground",
                        withdrawingIds[position.address] && "pointer-events-none",
                      )}
                    >
                      {withdrawingIds[position.address] ? (
                        <Spinner className="mr-2 h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownToLine className="mr-2 h-3.5 w-3.5" />
                      )}
                      Withdraw
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Dialog open={showWithdrawSelected} onOpenChange={setShowWithdrawSelected}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl border border-border/60 bg-card/90 shadow-2xl shadow-secondary/35">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Withdraw selected rewards</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Withdrawing now applies penalties to locks that have not fully matured. Confirm to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Selected locks</span>
              <span className="font-semibold text-primary">{selectedPositions.length.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total locked</span>
              <span className="font-semibold text-primary">{formatAmount(selectedTotals.totalLocked)} $BMB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">You would receive</span>
              <span className="font-semibold text-primary">{formatAmount(selectedTotals.available)} $BMB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Penalty forfeited</span>
              <span className="font-semibold text-primary">{formatAmount(selectedTotals.penalty)} $BMB</span>
            </div>
            <Separator className="bg-border/60" />
            <p className="text-xs text-muted-foreground">
              Rewards will continue to mature after withdrawal. Repeat withdrawals as balances unlock.
            </p>
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowWithdrawSelected(false)}
              className="h-9 rounded-lg border border-border/60 bg-card/70 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              disabled={withdrawingSelection}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleWithdrawSelected}
              disabled={withdrawSelectionDisabled}
              className="h-9 rounded-lg border border-primary/40 bg-primary/15 px-4 text-sm font-semibold text-primary shadow shadow-primary/20 hover:bg-primary/25 disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary/40 disabled:text-muted-foreground"
            >
              {withdrawingSelection ? <Spinner className="mr-2 h-3.5 w-3.5" /> : <ArrowDownToLine className="mr-2 h-3.5 w-3.5" />}
              Confirm withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
