import { publicKey } from '@metaplex-foundation/umi'
import { getAssetWithProof } from '@metaplex-foundation/mpl-bubblegum'
import { getUmiClient } from '@/lib/umi-client'

export async function getAssetWithProofUmi(endpoint: string, id: string) {
  const umi = getUmiClient(endpoint)
  const pk = publicKey(id)
  const asset = await getAssetWithProof(umi, pk, { truncateCanopy: true })
  return asset
}
