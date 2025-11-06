"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckerLicenseCard, type CheckerLicenseAction } from "@/components/checker-license-card"
import { Search, Filter, ShoppingCart, MoveHorizontal } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface CheckerLicense {
  id: string
  name: string
  publicKey: string
  image: string
  delegatedTo: string | null
  isActivated: boolean
  totalRewards: number
  lastCheckTime: string
}

interface CheckerLicensesScrollProps {
  licenses: CheckerLicense[]
  onActivate: (id: string) => void
  onDelegate: (id: string) => void
  onUndelegate: (id: string) => void
  pendingActions?: Record<string, CheckerLicenseAction>
}

export function CheckerLicensesScroll({ licenses, onActivate, onDelegate, onUndelegate, pendingActions }: CheckerLicensesScrollProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDelegated, setFilterDelegated] = useState(false)
  const [filterActivated, setFilterActivated] = useState(false)

  const filteredLicenses = licenses.filter((license) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      q === "" ||
      license.name?.toLowerCase().includes(q) ||
      license.delegatedTo?.toLowerCase().includes(q) ||
      license.publicKey?.toLowerCase().includes(q) ||
      license.id?.toLowerCase().includes(q)

    const matchesDelegated = !filterDelegated || license.delegatedTo !== null
    const matchesActivated = !filterActivated || !!license.isActivated

    return matchesSearch && matchesDelegated && matchesActivated
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, address, or license id..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-lg border border-border/40 bg-card/70 pl-11 text-sm placeholder:text-muted-foreground/70"
          />
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter</span>
        </div>
        <div className="flex items-center justify-end gap-2 sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-lg border border-border/50 bg-card/70 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
              filterDelegated && "border-primary/40 bg-primary/20 text-primary shadow shadow-primary/20",
            )}
            onClick={() => setFilterDelegated(!filterDelegated)}
          >
            Delegated
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-lg border border-border/50 bg-card/70 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
              filterActivated && "border-primary/40 bg-primary/20 text-primary shadow shadow-primary/20",
            )}
            onClick={() => setFilterActivated(!filterActivated)}
          >
            Activated
          </Button>
        </div>
      </div>

      {filteredLicenses.length > 0 ? (
        <div className="relative rounded-xl border border-border/60 bg-secondary/40 p-4">
          <div className="pointer-events-none absolute inset-y-6 left-0 w-10 rounded-l-xl bg-gradient-to-r from-secondary/80 via-secondary/40 to-transparent" />
          <div className="pointer-events-none absolute inset-y-6 right-0 w-10 rounded-r-xl bg-gradient-to-l from-secondary/80 via-secondary/40 to-transparent" />
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
            {filteredLicenses.map((license) => (
              <div key={license.id} className="w-[320px] shrink-0 snap-start">
                <CheckerLicenseCard
                  license={license}
                  onActivate={onActivate}
                  onDelegate={onDelegate}
                  onUndelegate={onUndelegate}
                  pendingAction={pendingActions?.[license.id]}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <MoveHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Scroll to explore more</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-secondary/40 px-6 py-16 text-center shadow-inner shadow-secondary/30">
          <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold tracking-tight">No checker licenses found</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {searchQuery || filterDelegated || filterActivated
              ? "No licenses match your current filters. Adjust the search or toggle to broaden the results."
              : "You do not own any checker licenses yet. Acquire a license to start accruing rewards."}
          </p>
          {!searchQuery && !filterDelegated && !filterActivated && (
            <Button
              asChild
              className="mt-5 rounded-lg border border-primary/40 bg-primary/15 px-5 py-2 text-sm font-semibold text-primary shadow shadow-primary/20 hover:bg-primary/25"
            >
              <Link href="https://beamable.network" target="_blank" rel="noopener noreferrer">
                Purchase Checker License
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
