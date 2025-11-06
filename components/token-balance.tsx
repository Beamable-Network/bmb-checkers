"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins } from "lucide-react"

interface TokenBalanceProps {
  balance: number
}

export function TokenBalance({ balance }: TokenBalanceProps) {
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">$BMB Balance</CardTitle>
        <Coins className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{balance.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground">Available to claim</p>
      </CardContent>
    </Card>
  )
}
