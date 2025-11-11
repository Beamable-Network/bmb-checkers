"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, Coins, Copy } from "lucide-react"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"

interface CheckerLicense {
  id: string
  publicKey: string
  image: string
  animationUrl?: string | null
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
  onClaim?: (id: string) => void
  pendingAction?: CheckerLicenseAction | null
}

export function CheckerLicenseCard({
  license,
  onActivate,
  onDelegate,
  onUndelegate,
  onClaim,
  pendingAction,
}: CheckerLicenseCardProps) {
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
  const claimableBmb = Number(license.totalRewards ?? 0)

  const pendingLabelMap: Record<CheckerLicenseAction, string> = {
    activate: "Activating…",
    delegate: "Delegating…",
    undelegate: "Undelegating…",
    claim: "Claiming…",
  }

  return (
    <Card
      className={cn(
        "relative h-[660px] overflow-hidden border border-border/60 bg-card/80 shadow-lg shadow-secondary/20",
        isPending && "border-primary/40 ring-2 ring-primary/40 shadow-primary/30",
      )}
    >
      {isPending && <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />}
      <CardHeader className="relative h-64 shrink-0 overflow-hidden p-0">
        <div className="absolute inset-0">
          {license.animationUrl ? (
            <video
              key={license.animationUrl}
              src={license.animationUrl}
              poster={license.image || "/placeholder.svg"}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <Image src={license.image || "/placeholder.svg"} alt={license.id} fill className="object-cover" />
          )}
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

      <CardContent className="flex flex-1 flex-col justify-between gap-3 overflow-hidden p-4">
        <div className="rounded-lg border border-border/50 bg-secondary/50 p-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span>License</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-1 font-mono text-[11px] text-foreground transition hover:bg-primary/10 hover:text-primary"
                  title="Copy license address"
                  onClick={handleCopyPublicKey}
                >
                  <span>{license.publicKey.slice(0, 6)}…{license.publicKey.slice(-4)}</span>
                  <Copy className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{license.publicKey}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-secondary/50 p-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span>Delegated</span>
            {license.delegatedTo ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-1 font-mono text-[11px] text-primary transition hover:bg-primary/10 hover:text-primary-foreground"
                    title="Copy delegate address"
                    onClick={handleCopyDelegatedTo}
                  >
                    <span>{license.delegatedTo.slice(0, 6)}…{license.delegatedTo.slice(-4)}</span>
                    <Copy className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{license.delegatedTo}</TooltipContent>
              </Tooltip>
            ) : (
              <span className="rounded-full border border-border/60 bg-card/60 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                Not delegated
              </span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-secondary/50 bg-secondary/40 px-3 py-3">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Coins className="h-3.5 w-3.5 text-primary/70" />
            Claimable rewards
          </span>
          {license.isActivated ? (
            <span className="text-sm font-semibold text-primary">
              {claimableBmb > 0
                ? `${claimableBmb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} $BMB`
                : "0 $BMB"}
            </span>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground/70">License has not been activated.</span>
          )}
        </div>
      </CardContent>

      <CardFooter className="shrink-0 px-5 pb-5 pt-0">
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
        ) : (
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="outline"
              className="w-full rounded-lg border border-border/60 bg-card/70 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              disabled={!onClaim || claimableBmb <= 0 || isClaiming}
              onClick={() => onClaim?.(license.id)}
            >
              {isClaiming ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-3 w-3" />
                  {pendingLabelMap.claim}
                </span>
              ) : (
                "Claim Rewards"
              )}
            </Button>
            {license.delegatedTo ? (
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
                  "Undelegate"
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
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
