import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api"

const umiCache = new Map<string, ReturnType<typeof createUmi>>()

export function getUmiClient(endpoint: string) {
  const key = endpoint || "default"
  let umi = umiCache.get(key)
  if (!umi) {
    umi = createUmi(endpoint).use(dasApi())
    umiCache.set(key, umi)
  }
  return umi
}
