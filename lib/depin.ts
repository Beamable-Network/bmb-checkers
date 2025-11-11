import type { Cluster } from "@/hooks/use-network"

const CLUSTER_NAME_MAP: Record<Cluster, "devnet" | "mainnet"> = {
  devnet: "devnet",
  "mainnet-beta": "mainnet",
}

// Thin dynamic wrapper around @beamable-network/depin to avoid hard type coupling
export async function getCheckerMerkleTrees(cluster: Cluster): Promise<string[]> {
  try {
    const mod: any = await import('@beamable-network/depin')
    if (typeof mod.getCheckerTree === 'function') {
      const depinCluster = CLUSTER_NAME_MAP[cluster] ?? "devnet"
      const addr = mod.getCheckerTree(depinCluster)
      return [String(addr)]
    }
  } catch (e) {
    console.warn('Depin SDK not available to get checker tree')
  }
  return []
}
