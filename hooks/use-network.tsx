"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type Cluster = "devnet" | "mainnet"

const DEVNET_RPC = "https://myriam-dhwfh7-fast-devnet.helius-rpc.com"
const MAINNET_RPC = "https://vinny-7q0vcq-fast-mainnet.helius-rpc.com"

function normalizeCluster(value: string | null | undefined): Cluster | undefined {
  if (!value) return undefined
  const lower = value.toLowerCase()
  if (lower === "devnet") return "devnet"
  if (lower === "mainnet" || lower === "mainnet-beta") return "mainnet"
  return undefined
}

const DEFAULT_CLUSTER = normalizeCluster(process.env.NEXT_PUBLIC_DEFAULT_CLUSTER) ?? "mainnet"

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
    const saved = normalizeCluster(localStorage.getItem(STORAGE_KEY))
    if (saved) setCluster(saved)
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
