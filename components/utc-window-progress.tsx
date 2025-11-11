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

type UtcWindowProgressProps = {
  pendingDay: CheckerActivityDay | null
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

export function UtcWindowProgress({ pendingDay }: UtcWindowProgressProps) {
  const [progress, setProgress] = useState<ProgressState>(() => computeUtcWindowProgress())

  useEffect(() => {
    if (!pendingDay) return
    setProgress(computeUtcWindowProgress())
    const interval = setInterval(() => {
      setProgress(computeUtcWindowProgress())
    }, 60_000)
    return () => clearInterval(interval)
  }, [pendingDay])

  const remaining = useMemo(() => {
    const remainingMs = progress.remainingMs
    const hours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)))
    const mins = Math.max(0, Math.floor((remainingMs / (1000 * 60)) % 60))
    return { remainingMs, hours, mins }
  }, [progress.remainingMs])

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

