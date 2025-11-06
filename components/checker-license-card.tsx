"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, Clock, Copy } from "lucide-react"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"

interface CheckerLicense {
  id: string
  publicKey: string
  image: string
  delegatedTo: string | null
  isActivated: boolean
  totalRewards: number
  lastCheckTime: string
}

export type CheckerLicenseAction = "activate" | "delegate" | "undelegate" | "claim"

interface CheckerLicenseCardProps {
  license: CheckerLicense
  onActivate: (id: string) => void
  onDelegate: (id: string) => void
  onUndelegate: (id: string) => void
  pendingAction?: CheckerLicenseAction | null
}

export function CheckerLicenseCard({ license, onActivate, onDelegate, onUndelegate, pendingAction }: CheckerLicenseCardProps) {
  const handleCopyPublicKey = () => {
    navigator.clipboard.writeText(license.publicKey)
    toast({ title: "Copied", description: "License address copied to clipboard." })
  }

  const handleCopyDelegatedTo = () => {
    if (license.delegatedTo) {
      navigator.clipboard.writeText(license.delegatedTo)
      toast({ title: "Copied", description: "Delegate address copied to clipboard." })
    }
  }

  const isActivating = pendingAction === "activate"
  const isDelegating = pendingAction === "delegate"
  const isUndelegating = pendingAction === "undelegate"
  const isClaiming = pendingAction === "claim"
  const isPending = Boolean(pendingAction)

  const pendingLabelMap: Record<CheckerLicenseAction, string> = {
    activate: "Activating…",
    delegate: "Delegating…",
    undelegate: "Undelegating…",
    claim: "Claiming…",
  }

  return (
    <Card
      className={cn(
        "relative h-full overflow-hidden border border-border/60 bg-card/80 shadow-lg shadow-secondary/20",
        isPending && "border-primary/40 ring-2 ring-primary/40 shadow-primary/30",
      )}
    >
      {isPending && <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />}
      <CardHeader className="relative h-40 overflow-hidden p-0">
        <div className="absolute inset-0">
          <Image src={license.image || "/placeholder.svg"} alt={license.id} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-background/20 to-transparent" />
        </div>
        <div className="absolute top-3 right-3">
          {license.isActivated ? (
            <Badge className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1 rounded-full border-border/70 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <XCircle className="h-3.5 w-3.5" />
              Inactive
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2 rounded-lg border border-border/50 bg-secondary/50 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="uppercase tracking-[0.18em]">License</span>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              title="Copy license address"
              onClick={handleCopyPublicKey}
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <p className="font-mono text-sm">{license.publicKey.slice(0, 8)}…{license.publicKey.slice(-6)}</p>
        </div>

        {license.delegatedTo && (
          <div className="space-y-2 rounded-lg border border-border/50 bg-secondary/50 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="uppercase tracking-[0.18em]">Delegated</span>
              <button
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                title="Copy delegate address"
                onClick={handleCopyDelegatedTo}
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <p className="font-mono text-sm text-primary">{license.delegatedTo.slice(0, 6)}…{license.delegatedTo.slice(-4)}</p>
          </div>
        )}

        <div className="rounded-lg border border-secondary/50 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 uppercase tracking-[0.2em]">
            <Clock className="h-3.5 w-3.5 text-primary/70" />
            Last check
          </span>
          <span className="font-medium text-foreground">{license.lastCheckTime}</span>
        </div>
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-0">
        {!license.isActivated ? (
          <Button
            variant="outline"
            className="w-full rounded-lg border border-primary/40 bg-primary/15 text-sm font-semibold text-primary shadow shadow-primary/20 hover:bg-primary/25"
            disabled={isActivating || isPending}
            onClick={() => onActivate(license.id)}
          >
            {isActivating ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="h-3 w-3" />
                {pendingLabelMap.activate}
              </span>
            ) : (
              "Activate License"
            )}
          </Button>
        ) : license.delegatedTo ? (
          <Button
            variant="outline"
            className="w-full rounded-lg border border-border/60 bg-card/70 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            disabled={isUndelegating || isPending}
            onClick={() => onUndelegate(license.id)}
          >
            {isUndelegating ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="h-3 w-3" />
                {pendingLabelMap.undelegate}
              </span>
            ) : (
              "Undelegate License"
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full rounded-lg border border-border/60 bg-card/70 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            disabled={isDelegating || isPending}
            onClick={() => onDelegate(license.id)}
          >
            {isDelegating ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="h-3 w-3" />
                {pendingLabelMap.delegate}
              </span>
            ) : (
              "Delegate License"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
