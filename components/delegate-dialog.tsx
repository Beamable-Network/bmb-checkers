"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"

interface DelegateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "delegate" | "undelegate"
  licenseId: string | null
  onSubmit?: (input?: string) => void
}

export function DelegateDialog({ open, onOpenChange, mode, licenseId, onSubmit }: DelegateDialogProps) {
  const [walletAddress, setWalletAddress] = useState("")

  const handleSubmit = () => {
    onSubmit?.(mode === "delegate" ? walletAddress : undefined)
    setWalletAddress("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-secondary/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {mode === "delegate" ? "Delegate License" : "Undelegate License"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {mode === "delegate"
              ? "Enter the Solana wallet address you want to delegate this checker license to."
              : "Confirm you want to remove the delegation from this checker license."}
          </DialogDescription>
        </DialogHeader>

        {mode === "delegate" ? (
          <div className="space-y-4 rounded-xl border border-border/50 bg-secondary/40 p-4">
            <div className="space-y-2">
              <Label htmlFor="wallet" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Wallet address
              </Label>
              <Input
                id="wallet"
                placeholder="Enter Solana wallet address..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="h-11 rounded-lg border border-border/60 bg-card/70 font-mono text-sm placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex gap-3 rounded-lg border border-border/60 bg-card/70 p-3 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-primary" />
              <p>
                The delegated wallet will be able to operate the checker node on your behalf and earn rewards.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-secondary/40 p-4 text-sm text-muted-foreground">
            <div className="flex gap-3 rounded-lg border border-border/60 bg-card/70 p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-primary" />
              <p className="text-xs">
                Undelegating will remove the current operator's access to this checker license.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-lg border border-border/60 bg-card/70 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-lg border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary shadow shadow-primary/20 hover:bg-primary/25"
            onClick={handleSubmit}
          >
            {mode === "delegate" ? "Delegate" : "Undelegate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
