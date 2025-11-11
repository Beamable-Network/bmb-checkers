"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type Cluster = "devnet" | "mainnet-beta"

const DEVNET_RPC = "https://myriam-dhwfh7-fast-devnet.helius-rpc.com"
const MAINNET_RPC = "https://vinny-7q0vcq-fast-mainnet.helius-rpc.com"
const DEFAULT_CLUSTER =
  (process.env.NEXT_PUBLIC_DEFAULT_CLUSTER as Cluster | undefined) ?? "mainnet-beta"

const STORAGE_KEY = "beamable.network.cluster"

type NetworkState = {
  cluster: Cluster
  setCluster: (c: Cluster) => void
  endpoints: { solanaRpc: string; heliusRpc: string }
}

const NetworkCtx = createContext<NetworkState | null>(null)

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [cluster, setCluster] = useState<Cluster>(DEFAULT_CLUSTER)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    if (raw === "devnet" || raw === "mainnet-beta") {
      setCluster(raw)
      return
    }
    if (raw === "mainnet") {
      setCluster("mainnet-beta")
      localStorage.setItem(STORAGE_KEY, "mainnet-beta")
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, cluster)
  }, [cluster])

  const endpoints = useMemo(() => {
    return {
      solanaRpc: cluster === "devnet" ? DEVNET_RPC : MAINNET_RPC,
      heliusRpc: cluster === "devnet" ? DEVNET_RPC : MAINNET_RPC,
    }
  }, [cluster])

  const value = useMemo(() => ({ cluster, setCluster, endpoints }), [cluster, endpoints])
  return <NetworkCtx.Provider value={value}>{children}</NetworkCtx.Provider>
}

export function useNetwork() {
  const ctx = useContext(NetworkCtx)
  if (!ctx) throw new Error("useNetwork must be used within <NetworkProvider>")
  return ctx
}
