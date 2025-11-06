"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type Cluster = "devnet" | "mainnet"

const DEVNET_RPC = "https://myriam-dhwfh7-fast-devnet.helius-rpc.com"
const MAINNET_RPC = "https://vinny-7q0vcq-fast-mainnet.helius-rpc.com"

const STORAGE_KEY = "beamable.network.cluster"

type NetworkState = {
  cluster: Cluster
  setCluster: (c: Cluster) => void
  endpoints: { solanaRpc: string; heliusRpc: string }
}

const NetworkCtx = createContext<NetworkState | null>(null)

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [cluster, setCluster] = useState<Cluster>("devnet")

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Cluster | null) : null
    if (saved === "devnet" || saved === "mainnet") setCluster(saved)
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
