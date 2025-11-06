"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Award, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface Activity {
  id: string
  licenseId: string
  type: "check" | "reward" | "delegation"
  timestamp: string
  details: string
  status: "success" | "warning" | "error"
}

interface ActivityLogProps {
  activities: Activity[]
  className?: string
}

export function ActivityLog({ activities, className }: ActivityLogProps) {
  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "check":
        return <CheckCircle2 className="h-4 w-4" />
      case "reward":
        return <Award className="h-4 w-4" />
      case "delegation":
        return <Users className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: Activity["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
            Success
          </Badge>
        )
      case "warning":
        return (
          <Badge variant="outline" className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-200">
            Warning
          </Badge>
        )
      case "error":
        return (
          <Badge variant="outline" className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-0.5 text-xs font-semibold text-destructive">
            Error
          </Badge>
        )
    }
  }

  return (
    <Card className={cn("border border-border/60 bg-card/80 shadow-lg shadow-secondary/20", className)}>
      <CardHeader className="border-b border-border/60 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent activity</p>
          <CardTitle className="mt-1 text-xl font-semibold tracking-tight">Checker operations feed</CardTitle>
        </div>
        <CardDescription className="mt-3 text-sm text-muted-foreground">
          Monitor high-signal events including activation changes, reward payouts, and delegated operations.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 rounded-xl border border-border/60 bg-secondary/40 p-4 shadow-inner shadow-secondary/30 transition hover:border-primary/40 hover:bg-primary/10"
            >
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium tracking-tight">{activity.details}</p>
                  {getStatusBadge(activity.status)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="uppercase tracking-[0.2em] text-muted-foreground/80">License #{activity.licenseId}</span>
                  <span className="hidden text-muted-foreground/70 sm:inline">•</span>
                  <span className="font-medium text-foreground/80">{activity.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
