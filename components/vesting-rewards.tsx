"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { LockedRewardPosition } from "@/hooks/use-locked-rewards"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { AlertCircle, ArrowDownToLine, ArrowUpRight, Hourglass, Copy } from "lucide-react"
import { getCurrentPeriod, periodToTimestamp } from "@beamable-network/depin"
import { isAddress } from "gill"

type VestingRewardsProps = {
  positions: LockedRewardPosition[]
  loading: boolean
  refetching: boolean
  error?: string | null
  withdrawingIds: Record<string, boolean>
  withdrawingSelection: boolean
  onWithdraw: (position: LockedRewardPosition) => Promise<void> | void
  onWithdrawSelection: (selection: LockedRewardPosition[]) => Promise<void> | void
  onSendLockedBmb: (input: { receiver: string; amount: number; lockDurationDays: number }) => Promise<void> | void
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
  if (days <= 0) return "Fully vested"
  const label = days === 1 ? "1 day" : `${days.toLocaleString()} days`
  return `Unlocks over ${label}`
}

function formatRange(startMs: number, endMs: number) {
  const start = dateFormatter.format(new Date(startMs))
  const end = dateFormatter.format(new Date(endMs))
  return `${start} → ${end}`
}

function formatAddress(value: string) {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}…${value.slice(-6)}`
}

export function VestingRewards({
  positions,
  loading,
  refetching,
  error,
  withdrawingIds,
  withdrawingSelection,
  onWithdraw,
  onWithdrawSelection,
  onSendLockedBmb,
}: VestingRewardsProps) {
  const [showWithdrawSelected, setShowWithdrawSelected] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [showVestedOnly, setShowVestedOnly] = useState(false)
  const [singleConfirm, setSingleConfirm] = useState<LockedRewardPosition | null>(null)
  const [singleConfirmAck, setSingleConfirmAck] = useState(false)
  const [selectionAck, setSelectionAck] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sendStep, setSendStep] = useState<1 | 2>(1)
  const [sendReceiver, setSendReceiver] = useState("")
  const [sendAmount, setSendAmount] = useState("")
  const [sendDuration, setSendDuration] = useState("")
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendingLocked, setSendingLocked] = useState(false)
  const [sendAcknowledged, setSendAcknowledged] = useState(false)

  const resetSendForm = useCallback(() => {
    setSendStep(1)
    setSendReceiver("")
    setSendAmount("")
    setSendDuration("")
    setSendError(null)
    setSendingLocked(false)
    setSendAcknowledged(false)
  }, [])

  const currentPeriod = useMemo(() => getCurrentPeriod(), [])
  const trimmedSendReceiver = useMemo(() => sendReceiver.trim(), [sendReceiver])
  const sendAmountValue = useMemo(() => Number.parseFloat(sendAmount), [sendAmount])
  const sendDurationValue = useMemo(() => Number.parseInt(sendDuration, 10), [sendDuration])
  const isReceiverValid = useMemo(() => trimmedSendReceiver.length > 0 && isAddress(trimmedSendReceiver), [trimmedSendReceiver])
  const isAmountValid = useMemo(
    () => Number.isFinite(sendAmountValue) && sendAmountValue > 0 && sendAmountValue <= Number.MAX_SAFE_INTEGER,
    [sendAmountValue],
  )
  const isDurationValid = useMemo(
    () => Number.isInteger(sendDurationValue) && sendDurationValue >= 1 && sendDurationValue <= 1825,
    [sendDurationValue],
  )
  const canAdvanceSend = isReceiverValid && isAmountValid && isDurationValid
  const sendUnlockPeriodPreview = isDurationValid ? currentPeriod + sendDurationValue : currentPeriod
  const receiverError = trimmedSendReceiver.length > 0 && !isReceiverValid ? "Enter a valid Solana wallet address." : null
  const amountError = sendAmount.trim().length > 0 && !isAmountValid ? "Enter a valid BMB amount greater than zero." : null
  const durationError = sendDuration.trim().length > 0 && !isDurationValid ? "Lock duration must be a whole number of days (minimum 1)." : null

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
    if (!showVestedOnly) return
    setSelectedIds((prev) => {
      const next = { ...prev }
      positions.forEach((pos) => {
        if (pos.penaltyPct > 0.000001) delete next[pos.address]
      })
      return next
    })
  }, [showVestedOnly, positions])

  const filteredPositions = useMemo(() => {
    if (!showVestedOnly) return positions
    return positions.filter((pos) => pos.penaltyPct <= 0.000001)
  }, [positions, showVestedOnly])

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
  const selectedWithPenalty = useMemo(
    () => selectedPositions.filter((pos) => pos.penaltyPct > 0.000001),
    [selectedPositions],
  )
  const averageSelectionPenaltyPct = useMemo(() => {
    if (!selectedPositions.length || selectedTotals.totalLocked <= 0) return 0
    return Math.min(1, selectedTotals.penalty / selectedTotals.totalLocked)
  }, [selectedPositions, selectedTotals.penalty, selectedTotals.totalLocked])
  const needsPenaltyAck = (reward: LockedRewardPosition) => reward.penaltyPct > 0.000001

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard.writeText(value).then(
      () => toast({ title: "Copied", description: `${label} copied to clipboard.` }),
      () => toast({ title: "Copy failed", description: `Unable to copy ${label.toLowerCase()}.`, variant: "destructive" }),
    )
  }

  const executeWithdraw = async (reward: LockedRewardPosition) => {
    await Promise.resolve(onWithdraw(reward))
    setSelectedIds((prev) => {
      if (!prev[reward.address]) return prev
      const next = { ...prev }
      delete next[reward.address]
      return next
    })
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

  const handleSendConfirm = useCallback(async () => {
    if (!canAdvanceSend || sendingLocked) return
    setSendingLocked(true)
    setSendError(null)
    try {
      await Promise.resolve(
        onSendLockedBmb({
          receiver: trimmedSendReceiver,
          amount: sendAmountValue,
          lockDurationDays: sendDurationValue,
        }),
      )
      resetSendForm()
      setSendDialogOpen(false)
    } catch (err: any) {
      const message = err?.message || "Failed to send locked BMB."
      setSendError(message)
    } finally {
      setSendingLocked(false)
    }
  }, [
    canAdvanceSend,
    sendingLocked,
    onSendLockedBmb,
    trimmedSendReceiver,
    sendAmountValue,
    sendDurationValue,
    resetSendForm,
  ])

  const toggleSelection = (address: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = { ...prev }
      if (checked) next[address] = true
      else delete next[address]
      return next
    })
  }

  const sendUnlockTimestampMs = useMemo(() => {
    if (!isDurationValid) return null
    try {
      const seconds = periodToTimestamp(sendUnlockPeriodPreview)
      return Number(seconds) * 1000
    } catch {
      return null
    }
  }, [isDurationValid, sendUnlockPeriodPreview])
  const renderEmptyState = () => (
    <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-border/60 bg-secondary/40 text-sm text-muted-foreground">
      <Hourglass className="mb-2 h-5 w-5 text-primary/70" />
      {showVestedOnly ? "No fully vested rewards yet." : "No vesting rewards right now."}
    </div>
  )

  return (
    <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-lg shadow-secondary/15">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rewards</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Vesting rewards</h2>
          <p className="mt-2 max-w-xl text-xs text-muted-foreground">
            Vesting rewards you can withdraw right away. Vested balances unlock gradually—waiting reduces penalties over time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={showVestedOnly ? "default" : "outline"}
            onClick={() => setShowVestedOnly((prev) => !prev)}
            className={cn(
              "h-9 rounded-lg border border-border/60 bg-card/70 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
              showVestedOnly && "border-primary/40 bg-primary/15 text-primary shadow shadow-primary/20",
            )}
          >
            Fully Vested
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetSendForm()
              setSendDialogOpen(true)
            }}
            disabled={loading || refetching}
            className="h-9 rounded-lg border border-border/60 bg-card/70 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <ArrowUpRight className="mr-2 h-3.5 w-3.5" />
            Send Locked BMB
          </Button>
          <Button
            type="button"
            disabled={withdrawSelectionDisabled}
            onClick={() => {
              setSelectionAck(false)
              setShowWithdrawSelected(true)
            }}
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
            Loading vesting rewards…
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
                      {!position.isCheckerReward ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="cursor-help border-amber-300 bg-amber-100 text-amber-700 shadow-sm dark:border-amber-400/60 dark:bg-amber-400/10 dark:text-amber-200">
                              Non-Checker
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="end">
                            <p>BMB granted by an external party, rather than the Checker Rewards program.</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            className="cursor-help border-transparent text-xs font-semibold text-primary-foreground shadow-sm"
                            style={{ backgroundColor: heatColor }}
                          >
                            {penaltyLabel}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">
                          <p>The portion lost if you withdraw before the unlock period completes.</p>
                        </TooltipContent>
                      </Tooltip>
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
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Vested now</p>
                      <p className="mt-1 font-semibold text-primary">
                        {position.maturedAmount > 0 ? `${formatAmount(position.maturedAmount)} $BMB` : "0 $BMB"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Penalty today</p>
                      <p className="mt-1 font-semibold text-primary">{formatAmount(position.penaltyAmount)} $BMB</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Vesting schedule</p>
                      <p className="mt-1 font-semibold text-primary">
                        {position.periodDurationDays.toLocaleString()} day plan
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-center gap-2">
                        <p>
                          PDA:{" "}
                          <span className="font-mono text-[11px] text-primary/90">{formatAddress(position.address)}</span>
                        </p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-full border border-border/60 bg-card/70 text-muted-foreground hover:text-primary"
                          onClick={() => handleCopy(position.address, "PDA address")}
                          title="Copy PDA address"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {!position.isCheckerReward ? (
                        <div className="flex items-center gap-2">
                          <p>
                            Sender:{" "}
                            <span className="font-mono text-[11px] text-primary/90">{formatAddress(position.sender)}</span>
                          </p>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full border border-border/60 bg-card/70 text-muted-foreground hover:text-primary"
                            onClick={() => handleCopy(position.sender, "Sender address")}
                            title="Copy sender address"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      disabled={withdrawDisabled}
                      onClick={async () => {
                        if (needsPenaltyAck(position)) {
                          setSingleConfirm(position)
                          setSingleConfirmAck(false)
                          return
                        }
                        await executeWithdraw(position)
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

      <Dialog
        open={sendDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetSendForm()
          }
          setSendDialogOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[460px] rounded-2xl border border-border/60 bg-card/90 shadow-2xl shadow-secondary/35">
          {sendStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold tracking-tight">Send Locked BMB</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Lock BMB for another wallet. Provide the recipient, amount, and lock duration.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="send-receiver">Recipient address</Label>
                  <Input
                    id="send-receiver"
                    value={sendReceiver}
                    onChange={(event) => setSendReceiver(event.target.value)}
                    placeholder="Receiver wallet address"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Locked BMB will vest to this address. Enter a Solana wallet (base58).
                  </p>
                  {receiverError ? <p className="text-xs font-medium text-destructive">{receiverError}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="send-amount">Amount (BMB)</Label>
                  <Input
                    id="send-amount"
                    type="number"
                    min="0"
                    step="0.000000001"
                    value={sendAmount}
                    onChange={(event) => setSendAmount(event.target.value)}
                    placeholder="e.g. 250"
                    inputMode="decimal"
                  />
                  <p className="text-xs text-muted-foreground">Specify the total BMB to lock.</p>
                  {amountError ? <p className="text-xs font-medium text-destructive">{amountError}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="send-duration">Lock duration (days)</Label>
                  <Input
                    id="send-duration"
                    type="number"
                    min="1"
                    step="1"
                    value={sendDuration}
                    onChange={(event) => setSendDuration(event.target.value)}
                    placeholder="e.g. 90"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <p className="text-xs text-muted-foreground">
                    Locked BMB can be withdrawn after this many full days have elapsed (minimum 1 day).
                  </p>
                  {durationError ? <p className="text-xs font-medium text-destructive">{durationError}</p> : null}
                </div>
                {sendError ? (
                  <p className="text-xs font-medium text-destructive">{sendError}</p>
                ) : null}
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:space-x-0">
                <Button
                  type="button"
                  variant="ghost"
                  className="sm:w-auto"
                  onClick={() => {
                    resetSendForm()
                    setSendDialogOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setSendError(null)
                    setSendStep(2)
                  }}
                  disabled={!canAdvanceSend}
                  className="sm:w-auto"
                >
                  Next
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold tracking-tight">Confirm locked transfer</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Review the details before sending. This lock vests daily and can be withdrawn by the recipient.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Recipient</span>
                    <span className="font-mono text-xs text-primary">{formatAddress(trimmedSendReceiver)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount locked</span>
                    <span className="font-semibold text-primary">
                      {isAmountValid ? `${formatAmount(sendAmountValue)} $BMB` : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Lock duration</span>
                    <span className="font-semibold text-primary">
                      {isDurationValid ? `${sendDurationValue.toLocaleString()} day(s)` : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Current period</span>
                    <span className="font-mono text-xs text-primary">{currentPeriod}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Unlock period</span>
                    <span className="font-mono text-xs text-primary">{sendUnlockPeriodPreview}</span>
                  </div>
                  {sendUnlockTimestampMs ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Unlock date (approx)</span>
                      <span className="font-semibold text-primary">
                        {dateFormatter.format(new Date(sendUnlockTimestampMs))}
                      </span>
                    </div>
                  ) : null}
                </div>
                {sendError ? (
                  <p className="text-xs font-medium text-destructive">{sendError}</p>
                ) : null}
                <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/40 p-4 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground/80">Before you send</p>
                  <ul className="space-y-2 pl-3 text-muted-foreground">
                    <li className="list-disc">
                      The recipient can withdraw the vested portion after the unlock period completes.
                    </li>
                    <li className="list-disc">
                      Unvested BMB and the SOL rent deposit return to the sender when the recipient withdraws the BMB.
                    </li>
                    <li className="list-disc">BMB vests linearly—each day releases a proportional share.</li>
                    <li className="list-disc">Once sent, the sender cannot reclaim the locked BMB.</li>
                  </ul>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/40 p-3">
                  <Checkbox
                    id="send-ack"
                    checked={sendAcknowledged}
                    onCheckedChange={(checked) => setSendAcknowledged(checked === true)}
                    className="mt-1"
                  />
                  <Label
                    htmlFor="send-ack"
                    className="cursor-pointer text-xs leading-relaxed text-muted-foreground"
                  >
                    I understand these conditions and accept that the recipient takes custody of the vested BMB.
                  </Label>
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:space-x-0">
                <Button
                  type="button"
                  variant="ghost"
                  className="sm:w-auto"
                  disabled={sendingLocked}
                  onClick={() => {
                    setSendStep(1)
                    setSendError(null)
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSendConfirm}
                  disabled={!canAdvanceSend || sendingLocked || !sendAcknowledged}
                  className="sm:w-auto"
                >
                  {sendingLocked ? <Spinner className="mr-2 h-3.5 w-3.5" /> : <ArrowUpRight className="mr-2 h-3.5 w-3.5" />}
                  {sendingLocked ? "Sending…" : "Send Locked BMB"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!singleConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setSingleConfirm(null)
            setSingleConfirmAck(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px] rounded-2xl border border-border/60 bg-card/90 shadow-2xl shadow-secondary/35">
          {singleConfirm && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold tracking-tight">Early withdrawal has a penalty</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Withdrawing now abandons the unvested amount for this lock period. Review the breakdown before continuing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lock period</span>
                  <span className="font-mono text-xs text-primary">{singleConfirm.lockPeriod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Penalty</span>
                  <span className="font-semibold text-destructive">{formatPercent(singleConfirm.penaltyPct)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">You receive now</span>
                  <span className="font-semibold text-primary">{formatAmount(singleConfirm.maturedAmount)} $BMB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">You abandon</span>
                  <span className="font-semibold text-destructive">{formatAmount(singleConfirm.penaltyAmount)} $BMB</span>
                </div>
                <Separator className="bg-border/60" />
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={singleConfirmAck} onCheckedChange={(checked) => setSingleConfirmAck(checked === true)} />
                  <span className="leading-relaxed">
                    I understand this withdrawal forfeits the unvested amount and I cannot recover it later.
                  </span>
                </label>
              </div>

              <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSingleConfirm(null)}
                  className="h-9 rounded-lg border border-border/60 bg-card/70 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!singleConfirm) return
                    await executeWithdraw(singleConfirm)
                    setSingleConfirm(null)
                  }}
                  disabled={!singleConfirmAck || withdrawingIds[singleConfirm.address]}
                  className="h-9 rounded-lg border border-primary/40 bg-primary/15 px-4 text-sm font-semibold text-primary shadow shadow-primary/20 hover:bg-primary/25 disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary/40 disabled:text-muted-foreground"
                >
                  {withdrawingIds[singleConfirm.address] ? (
                    <Spinner className="mr-2 h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownToLine className="mr-2 h-3.5 w-3.5" />
                  )}
                  Withdraw now
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showWithdrawSelected}
        onOpenChange={(open) => {
          setShowWithdrawSelected(open)
          if (!open) setSelectionAck(false)
        }}
      >
        <DialogContent className="sm:max-w-[460px] rounded-2xl border border-border/60 bg-card/90 shadow-2xl shadow-secondary/35">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Withdraw selected rewards</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Withdrawing now applies penalties to locks that have not fully vested. Confirm to proceed.
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
            {selectedWithPenalty.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Locks with penalties</p>
                <div className="rounded-lg border border-border/60 bg-card/70 p-3 text-xs text-muted-foreground">
                  <div className="grid grid-cols-3 gap-2 font-semibold text-primary">
                    <span>Period</span>
                    <span className="text-right">Receive</span>
                    <span className="text-right">Abandon</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {selectedWithPenalty.map((reward) => (
                      <div key={reward.address} className="grid grid-cols-3 gap-2">
                        <span className="font-mono text-[11px]">{reward.lockPeriod}</span>
                        <span className="text-right">{formatAmount(reward.maturedAmount)} $BMB</span>
                        <span className="text-right text-destructive">{formatAmount(reward.penaltyAmount)} $BMB</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {selectedWithPenalty.length > 0 && (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Average penalty</span>
                  <span className="font-semibold text-destructive">{formatPercent(averageSelectionPenaltyPct)}%</span>
                </div>
                <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
                  <Checkbox checked={selectionAck} onCheckedChange={(checked) => setSelectionAck(checked === true)} />
                  <span className="leading-relaxed">
                    I understand withdrawing now abandons the unvested amounts shown above and they cannot be reclaimed later.
                  </span>
                </label>
              </>
            )}
            {selectedWithPenalty.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                All selected rewards are fully vested—no penalties will be applied.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Rewards will continue to vest after withdrawal. Repeat withdrawals as balances unlock.
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
              disabled={withdrawSelectionDisabled || (selectedWithPenalty.length > 0 && !selectionAck)}
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
