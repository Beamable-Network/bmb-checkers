"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Wallet, Copy, LogOut } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { cn } from "@/lib/utils"

interface WalletConnectProps {
  className?: string
}

export function WalletConnect({ className }: WalletConnectProps) {
  const { connected, disconnect, publicKey } = useWallet()
  const { setVisible } = useWalletModal()

  const shortAddress = publicKey ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}` : ""

  const handleCopyAddress = () => {
    if (publicKey) navigator.clipboard.writeText(publicKey.toBase58())
  }

  if (!connected) {
    return (
      <Button
        className={cn(
          "gap-2 rounded-lg border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary shadow shadow-primary/20 transition hover:bg-primary/25",
          className,
        )}
        onClick={() => setVisible(true)}
      >
        <Wallet className="h-4 w-4" />
        <span>Connect Wallet</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
            className,
          )}
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden font-mono sm:inline">{shortAddress}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl border border-border/60 bg-card/80 p-2 shadow-lg shadow-secondary/20"
      >
        <DropdownMenuItem
          onClick={handleCopyAddress}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-primary/10 hover:text-primary"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            try {
              await disconnect()
            } catch (e) {
              console.error("Wallet disconnect error", e)
            }
          }}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
