import { publicKey } from "@metaplex-foundation/umi"
import { getAssetWithProof } from "@metaplex-foundation/mpl-bubblegum"
import type { Cluster } from "@/hooks/use-network"
import { getCheckerMerkleTrees } from "@/lib/depin"
import { getUmiClient } from "@/lib/umi-client"
import { address } from "gill"

export async function getAssetWithProofUmi(
  endpoint: string,
  cluster: Cluster,
  id: string,
) {
  const umi = getUmiClient(endpoint)
  const pk = publicKey(id)
  const asset = await getAssetWithProof(umi, pk, { truncateCanopy: true })
  const tree = await getCheckerMerkleTrees(cluster)
  if (tree) {
    const expected = address(tree).toString()
    if (String(asset.merkleTree) !== expected) {
      console.warn("[CNFT] Asset tree mismatch", {
        assetTree: String(asset.merkleTree),
        expectedTree: expected,
        cluster,
      })
    }
  } else {
    console.warn("[CNFT] Asset tree mismatch", {
      assetTree: String(asset.merkleTree),
      expectedTree: null,
      cluster,
    })
  }
  return asset
}
