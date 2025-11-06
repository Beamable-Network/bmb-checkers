import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { publicKey } from '@metaplex-foundation/umi'
import { getAssetWithProof } from '@metaplex-foundation/mpl-bubblegum'
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api'

export async function getAssetWithProofUmi(endpoint: string, id: string) {
  const umi = createUmi(endpoint).use(dasApi())
  const pk = publicKey(id)
  const asset = await getAssetWithProof(umi, pk, { truncateCanopy: true })
  return asset
}
