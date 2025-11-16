import type { Cluster } from "@/hooks/use-network"

const CLUSTER_NAME_MAP: Record<Cluster, "devnet" | "mainnet"> = {
  devnet: "devnet",
  mainnet: "mainnet",
}

/**
 * Resolve the single checker merkle tree for the current cluster.
 * Falls back to legacy mainnet-beta tree if required.
 */
export async function getCheckerMerkleTrees(cluster: Cluster): Promise<string | null> {
  try {
    const mod: any = await import("@beamable-network/depin")
    if (typeof mod.getCheckerTree !== "function") {
      return null
    }
    const depinCluster = CLUSTER_NAME_MAP[cluster] ?? "devnet"
    try {
      const primary = mod.getCheckerTree(depinCluster)
      if (primary) return String(primary)
    } catch (err) {
      console.warn("[Depin] getCheckerTree failed", { cluster: depinCluster, err })
    }
    if (cluster === "mainnet") {
      try {
        const legacy = mod.getCheckerTree("mainnet-beta")
        if (legacy) return String(legacy)
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.warn("Depin SDK not available to get checker tree")
  }
  return null
}
