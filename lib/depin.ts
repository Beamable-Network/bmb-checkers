// Thin dynamic wrapper around @beamable-network/depin to avoid hard type coupling
export async function getCheckerMerkleTrees(cluster: 'devnet' | 'mainnet'): Promise<string[]> {
  try {
    const mod: any = await import('@beamable-network/depin')
    if (typeof mod.getCheckerTree === 'function') {
      const addr = mod.getCheckerTree(cluster)
      return [String(addr)]
    }
  } catch (e) {
    console.warn('Depin SDK not available to get checker tree')
  }
  return []
}
