"use client"

import { useNetwork } from "@/hooks/use-network"
import type { Cluster } from "@/hooks/use-network"
import { cn } from "@/lib/utils"

export function NetworkToggle() {
  const { cluster, setCluster } = useNetwork()
  const other: Cluster = cluster === "devnet" ? "mainnet" : "devnet"
  const isMainnet = cluster === "mainnet"

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isMainnet}
      onClick={() => setCluster(other)}
      title={`Switch to ${other}`}
      className="relative inline-flex h-9 w-28 items-center justify-between rounded-full border border-border/60 bg-card/70 px-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className={cn("z-10 flex-1 text-center", !isMainnet && "text-primary")}>Dev</span>
      <span className={cn("z-10 flex-1 text-center", isMainnet && "text-primary")}>Main</span>
      <span
        className={cn(
          "absolute inset-y-1 left-1 w-[calc(50%-0.5rem)] rounded-full bg-primary/15 shadow-sm shadow-primary/20 transition-transform",
          isMainnet ? "translate-x-full" : "translate-x-0",
        )}
      />
    </button>
  )
}
