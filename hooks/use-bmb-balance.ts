"use client"

import { useEffect, useState } from "react"
import { PublicKey } from "@solana/web3.js"
import { ENV } from "@/lib/env"
import { useConnection } from "@solana/wallet-adapter-react"

export function useBmbBalance(owner: PublicKey | null | undefined) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { connection } = useConnection()

  useEffect(() => {
    let aborted = false
    async function run() {
      if (!owner) {
        setBalance(null)
        return
      }
      if (!ENV.BMB_MINT) {
        setError("BMB mint not configured")
        setBalance(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const mint = new PublicKey(ENV.BMB_MINT)
        const resp = await connection.getParsedTokenAccountsByOwner(owner, { mint })
        let amount = 0
        for (const acc of resp.value) {
          const info: any = acc.account.data
          const ui = info.parsed.info.tokenAmount.uiAmount || 0
          amount += ui
        }
        if (!aborted) setBalance(amount)
      } catch (e: any) {
        if (!aborted) setError(e?.message || String(e))
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    run()
    return () => {
      aborted = true
    }
  }, [owner, connection])

  return { balance, loading, error }
}
