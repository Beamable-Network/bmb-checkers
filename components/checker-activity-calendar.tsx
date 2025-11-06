"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

type CheckerActivityStatus = "maxed" | "partial" | "missed" | "pending"

export type CheckerActivityDay = {
  date: string
  status: CheckerActivityStatus
  licensesTotal: number
  licensesChecked?: number
  activitiesAssigned?: number
  activitiesCompleted?: number
  workersAvailable?: number
}

interface CheckerActivityCalendarProps {
  days: CheckerActivityDay[]
  totalLicenses: number
  windowDescription?: string
}

const fullFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
})

const statusMeta: Record<
  CheckerActivityStatus,
  { label: string; container: string; dot: string; text: string }
> = {
  maxed: {
    label: "All licenses maximized rewards",
    container: "border-emerald-400/40 bg-emerald-500/10 shadow shadow-emerald-500/10",
    dot: "bg-emerald-300",
    text: "text-emerald-200",
  },
  partial: {
    label: "Every license checked at least once, some workers missed",
    container: "border-amber-400/40 bg-amber-500/10 shadow shadow-amber-500/10",
    dot: "bg-amber-300",
    text: "text-amber-200",
  },
  missed: {
    label: "One or more licenses did not check",
    container: "border-destructive/40 bg-destructive/10 shadow shadow-destructive/10",
    dot: "bg-destructive/70",
    text: "text-destructive",
  },
  pending: {
    label: "Checker window still open — results available tomorrow",
    container: "border-dashed border-primary/35 bg-secondary/40",
    dot: "bg-primary/60",
    text: "text-primary",
  },
}

const recommendationByStatus: Record<CheckerActivityStatus, string> = {
  maxed: "All checkers ran and maximized rewards. Keep the fleet online.",
  partial: "Some workers were skipped. Re-run any idle checkers to capture remaining rewards.",
  missed: "One or more checkers sat idle. Start those licenses to resume rewards.",
  pending: "Window still open — check again tomorrow once workers submit results.",
}

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
})

export function CheckerActivityCalendar({
  days,
  totalLicenses,
  windowDescription = "Checker window (results post next day)",
}: CheckerActivityCalendarProps) {
  const sortedDays = useMemo(
    () =>
      [...days].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [days],
  )

  const monthRangeLabel = useMemo(() => {
    if (!sortedDays.length) return null
    const keyFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" })
    const monthKeys = Array.from(
      new Set(
        sortedDays.map((day) => {
          const d = new Date(day.date)
          return `${d.getFullYear()}-${d.getMonth()}`
        }),
      ),
    )
    const labels = monthKeys.map((key) => {
      const [yr, mo] = key.split("-")
      return keyFormatter.format(new Date(Number(yr), Number(mo)))
    })
    if (labels.length === 1) return labels[0]
    return `${labels[0]} – ${labels[labels.length - 1]}`
  }, [sortedDays])

  const pendingDay = sortedDays.find((day) => day.status === "pending")

  const currentDayProgress = useMemo(() => {
    if (!pendingDay) return null
    const now = new Date()
    const minutes = now.getHours() * 60 + now.getMinutes()
    const pct = Math.min(100, Math.max(0, (minutes / 1440) * 100))
    return { value: pct, minutesRemaining: 1440 - minutes }
  }, [pendingDay])

  const firstDate = sortedDays[0] ? new Date(sortedDays[0].date) : null
  const startOffset = firstDate ? ((firstDate.getDay() + 6) % 7) : 0

  const gridItems: Array<CheckerActivityDay | null> = []
  for (let i = 0; i < startOffset; i += 1) {
    gridItems.push(null)
  }
  gridItems.push(...sortedDays)
  while (gridItems.length % 7 !== 0) {
    gridItems.push(null)
  }

  const minutesRemaining = currentDayProgress?.minutesRemaining ?? 0
  const hoursRemaining = Math.max(0, Math.floor(minutesRemaining / 60))
  const minsRemaining = Math.max(0, minutesRemaining % 60)

  const legendItems = [
    { status: "maxed" as CheckerActivityStatus },
    { status: "partial" as CheckerActivityStatus },
    { status: "missed" as CheckerActivityStatus },
  ]

  const latestCompleted = useMemo(
    () => [...sortedDays].reverse().find((day) => day.status !== "pending") ?? sortedDays[sortedDays.length - 1],
    [sortedDays],
  )

  const [selectedDate, setSelectedDate] = useState<string | null>(latestCompleted?.date ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!selectedDate || !sortedDays.some((day) => day.date === selectedDate)) {
      setSelectedDate(latestCompleted?.date ?? null)
    }
  }, [latestCompleted, selectedDate, sortedDays])

  const selectedDay = useMemo(
    () => (selectedDate ? sortedDays.find((day) => day.date === selectedDate) ?? null : null),
    [selectedDate, sortedDays],
  )

  useEffect(() => {
    if (dialogOpen && !selectedDay) {
      setDialogOpen(false)
    }
  }, [dialogOpen, selectedDay])

  useEffect(() => {
    if (!dialogOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialogOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener("keydown", onKey)
    }
  }, [dialogOpen])

  return (
    <Card className="border border-border/60 bg-card/80 p-6 shadow-xl shadow-secondary/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Performance
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Checker license coverage — last 30 days
          </h2>
          {monthRangeLabel && (
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground/80">
              {monthRangeLabel}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Track how your licenses perform each day and spot gaps before rewards slip. “Running” shows what share of checkers executed at least one task; “Coverage” captures the percentage of assigned worker checks that were completed.
          </p>
        </div>
        <div className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
          {windowDescription}
        </div>
      </div>

      {pendingDay && currentDayProgress && (
        <div className="mt-6 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary/70" />
              <span>Today&apos;s window is in progress</span>
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-primary/80">
              Results available tomorrow
            </span>
          </div>
          <div className="mt-3 space-y-2 text-xs text-primary/80">
            <Progress value={currentDayProgress.value} className="h-2 bg-primary/20 [&>div]:bg-primary" />
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em]">
              <span>{minutesRemaining > 0 ? "Window closing in" : "Window closed"}</span>
              <span>
                {minutesRemaining > 0
                  ? `${hoursRemaining}h ${minsRemaining.toString().padStart(2, "0")}m remaining`
                  : "Awaiting worker submissions"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pb-2">
        <div className="w-full">
          <div className="hidden gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80 md:grid md:grid-cols-7">
            {weekDays.map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
            {gridItems.map((item, idx) => {
              if (!item) {
                return <div key={`blank-${idx}`} className="h-28 rounded-xl border border-dashed border-border/40 bg-secondary/30" />
              }

              const date = new Date(item.date)
              const isSelected = item.date === selectedDate
              const status = statusMeta[item.status]
              const licensesTotal = item.licensesTotal || 0
              const checkersRunningPct =
                item.licensesChecked !== undefined && licensesTotal > 0
                  ? Math.floor((item.licensesChecked / licensesTotal) * 100)
                  : 0
              const activityCoveragePct =
                item.activitiesAssigned !== undefined &&
                item.activitiesAssigned > 0 &&
                item.activitiesCompleted !== undefined
                  ? Math.floor((item.activitiesCompleted / item.activitiesAssigned) * 100)
                  : 0

              if (item.status === "pending") {
                return (
                  <div
                    key={item.date}
                    className={cn(
                      "flex h-28 flex-col justify-between rounded-xl border px-4 py-3 text-sm opacity-70",
                      status.container,
                    )}
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {monthDayFormatter.format(date)}
                      </span>
                      <span className={cn("h-2 w-2 rounded-full", status.dot)} />
                    </div>
                    <p className="text-xs text-primary/80">Window open — results tomorrow.</p>
                    <div className="flex items-center justify-between text-[11px] text-primary/80">
                      <span>Window progress</span>
                      <span>{Math.round(currentDayProgress.value)}%</span>
                    </div>
                    <Progress value={currentDayProgress.value} className="h-1.5 bg-primary/20 [&>div]:bg-primary/80" />
                  </div>
                )
              }

              return (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(item.date)
                    setDialogOpen(true)
                  }}
                  className={cn(
                    "flex h-28 flex-col gap-2 rounded-xl border px-4 py-3 text-left text-sm outline-none",
                    status.container,
                    isSelected && "ring-2 ring-primary/50 border-primary/60 shadow-lg shadow-primary/20",
                  )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {monthDayFormatter.format(date)}
                      </span>
                    <span className={cn("h-2 w-2 rounded-full", status.dot)} />
                  </div>
                    <div className="mt-3 flex flex-col gap-3 text-[11px] leading-tight">
                      <div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Running</span>
                          <span className="font-semibold text-foreground">{checkersRunningPct}%</span>
                        </div>
                        <Progress value={checkersRunningPct} className="mt-1 h-1.5 bg-border/40 [&>div]:bg-primary/80" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Coverage</span>
                          <span className="font-semibold text-foreground">{activityCoveragePct}%</span>
                        </div>
                        <Progress value={activityCoveragePct} className="mt-1 h-1.5 bg-border/40 [&>div]:bg-primary/60" />
                      </div>
                    </div>
                  </button>
              )
            })}
          </div>
        </div>
      </div>

      {dialogOpen && selectedDay && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-secondary/40">
              <div className="flex items-start justify-between gap-3 border-b border-border/60 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {fullFormatter.format(new Date(selectedDay.date))}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    {statusMeta[selectedDay.status].label}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-full border border-border/60 bg-secondary/40 p-1 text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 px-4 py-5 text-sm sm:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Running</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {selectedDay.licensesChecked ?? 0} / {selectedDay.licensesTotal}
                  </p>
                  <Progress
                    value={selectedDay.licensesTotal ? Math.floor(((selectedDay.licensesChecked ?? 0) / selectedDay.licensesTotal) * 100) : 0}
                    className="mt-2 h-1.5 bg-border/40 [&>div]:bg-primary/80"
                  />
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {selectedDay.activitiesCompleted ?? 0} / {selectedDay.activitiesAssigned ?? 0}
                  </p>
                  <Progress
                    value={selectedDay.activitiesAssigned ? Math.floor(((selectedDay.activitiesCompleted ?? 0) / selectedDay.activitiesAssigned) * 100) : 0}
                    className="mt-2 h-1.5 bg-border/40 [&>div]:bg-primary/60"
                  />
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workers available</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {selectedDay.workersAvailable ?? selectedDay.activitiesAssigned ?? 0}
                  </p>
                </div>
              </div>
              <div className="border-t border-border/60 bg-primary/10 p-4 text-sm text-muted-foreground">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Recommendation</p>
                <p className="mt-2 text-foreground">{recommendationByStatus[selectedDay.status]}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {legendItems.map(({ status }) => (
          <div key={status} className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", statusMeta[status].dot)} />
            <span className={cn("text-muted-foreground/80", statusMeta[status].text)}>
              {statusMeta[status].label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
