import type { Cluster } from "@/hooks/use-network"

const CLUSTER_NAME_MAP: Record<Cluster, "devnet" | "mainnet"> = {
  devnet: "devnet",
  mainnet: "mainnet",
}

// Thin dynamic wrapper around @beamable-network/depin to avoid hard type coupling
export async function getCheckerMerkleTrees(cluster: Cluster): Promise<string[]> {
  try {
    const mod: any = await import("@beamable-network/depin")
    if (typeof mod.getCheckerTree === "function") {
      const depinCluster = CLUSTER_NAME_MAP[cluster] ?? "devnet"
      const trees = new Set<string>()
      try {
        const primary = mod.getCheckerTree(depinCluster)
        if (primary) trees.add(String(primary))
      } catch (err) {
        console.warn("[Depin] getCheckerTree failed", { cluster: depinCluster, err })
      }
      if (cluster === "mainnet" && !trees.size) {
        try {
          const legacy = mod.getCheckerTree("mainnet-beta")
          if (legacy) trees.add(String(legacy))
        } catch {
          // ignore
        }
      }
      return Array.from(trees)
    }
  } catch (e) {
    console.warn("Depin SDK not available to get checker tree")
  }
  return []
}
