"use client"

import { useEffect, useMemo, useState } from "react"
import { Progress } from "@/components/ui/progress"
import type { CheckerActivityDay } from "@/components/checker-activity-calendar"

const utcDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})

type UtcWindowProgressProps =
  | {
      pendingDay: CheckerActivityDay | null
      mode?: {
        type: "idle"
      }
    }
  | {
      pendingDay: CheckerActivityDay | null
      mode: {
        type: "activate" | "claim"
        total: number
        submitted: number
        completed: number
        failed: number
        label?: string | null
      }
    }

type ProgressState = {
  value: number
  remainingMs: number
}

const MS_IN_DAY = 86_400_000

function computeUtcWindowProgress(): ProgressState {
  const now = new Date()
  const startUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const elapsed = now.getTime() - startUtcMs
  const clamped = Math.min(Math.max(elapsed, 0), MS_IN_DAY)
  return {
    value: (clamped / MS_IN_DAY) * 100,
    remainingMs: Math.max(MS_IN_DAY - clamped, 0),
  }
}

export function UtcWindowProgress(props: UtcWindowProgressProps) {
  const { pendingDay } = props
  const mode = props.mode ?? { type: "idle" as const }

  const [progress, setProgress] = useState<ProgressState>(() => computeUtcWindowProgress())

  useEffect(() => {
    if (mode.type !== "idle") return
    if (!pendingDay) return
    setProgress(computeUtcWindowProgress())
    const interval = setInterval(() => {
      setProgress(computeUtcWindowProgress())
    }, 60_000)
    return () => clearInterval(interval)
  }, [pendingDay, mode.type])

  const remaining = useMemo(() => {
    const remainingMs = progress.remainingMs
    const hours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)))
    const mins = Math.max(0, Math.floor((remainingMs / (1000 * 60)) % 60))
    return { remainingMs, hours, mins }
  }, [progress.remainingMs])

  if (mode.type !== "idle") {
    const total = Math.max(1, mode.total)
    const submitted = Math.min(mode.submitted, total)
    const completed = Math.min(mode.completed, total)
    const failed = Math.min(mode.failed, total)
    const confirmed = Math.min(completed + failed, total)
    const submissionPercent = (submitted / total) * 100
    const completionPercent = (confirmed / total) * 100
    const remainingSubmissions = Math.max(total - submitted, 0)
    const remainingConfirmations = Math.max(total - confirmed, 0)
    const title = mode.type === "activate" ? "Activating licenses" : "Claiming rewards"
    const submissionStatus =
      remainingSubmissions > 0 ? "Sign the queued transactions" : "All transactions submitted"
    const confirmationStatus =
      remainingConfirmations > 0 ? "Waiting for confirmations" : "All transactions confirmed"

    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-primary">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-primary">
          <span className="font-semibold">{title}</span>
          <span className="text-xs uppercase tracking-[0.2em] text-primary/80">
            {confirmed}/{total}
          </span>
        </div>
        {mode.label ? (
          <p className="mt-1 truncate text-xs text-primary/70">
            {mode.type === "activate" ? "Currently activating:" : "Currently claiming:"}{" "}
            <span className="text-primary">{mode.label}</span>
          </p>
        ) : null}
        <div className="mt-3 space-y-3 text-xs text-primary/80">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em]">
              <span>Submitted</span>
              <span>
                {submitted}/{total}
              </span>
            </div>
            <Progress value={submissionPercent} className="mt-1 h-2 bg-primary/20 [&>div]:bg-primary" />
            <div className="mt-1 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-primary/70">
              <span>{submissionStatus}</span>
              <span>{Math.round(submissionPercent)}%</span>
            </div>
            {remainingSubmissions > 0 ? (
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-primary/60">
                Remaining {remainingSubmissions}
              </p>
            ) : null}
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em]">
              <span>Confirmed</span>
              <span>
                {confirmed}/{total}
              </span>
            </div>
            <Progress
              value={completionPercent}
              className="mt-1 h-2 bg-primary/20 [&>div]:bg-primary/70"
            />
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
              <span className="text-primary/80">Success {completed}</span>
              <span className={failed > 0 ? "text-destructive" : "text-primary/60"}>Failed {failed}</span>
              {remainingConfirmations > 0 ? (
                <span className="text-primary/60">Pending {remainingConfirmations}</span>
              ) : null}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-primary/70">
              <span>{confirmationStatus}</span>
              <span>{Math.round(completionPercent)}%</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!pendingDay) return null

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-primary">
          <span className="h-2 w-2 rounded-full bg-primary/70" />
          <span>
            UTC Window —{" "}
            {utcDateFormatter.format(new Date(pendingDay.date))}
          </span>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-primary/80">
          Rewards Available Tomorrow
        </span>
      </div>
      <div className="mt-3 space-y-2 text-xs text-primary/80">
        <Progress value={progress.value} className="h-2 bg-primary/20 [&>div]:bg-primary" />
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em]">
          <span>{remaining.remainingMs > 0 ? "Window closing in" : "Window closed"}</span>
          <span>
            {remaining.remainingMs > 0
              ? `${remaining.hours}h ${remaining.mins.toString().padStart(2, "0")}m remaining`
              : "Awaiting worker submissions"}
          </span>
        </div>
      </div>
    </div>
  )
}
