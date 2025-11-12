import bs58 from "bs58"
import { none } from "gill"

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function heliusFetch<T = any>(endpoint: string, body: any, opts?: { retries?: number; baseDelayMs?: number }) {
  const retries = opts?.retries ?? 5
  const base = opts?.baseDelayMs ?? 300
  let lastErr: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) return (await res.json()) as T
      // Retry on 429 (rate limit) and some transient 5xx
      if ((res.status === 429 || (res.status >= 500 && res.status < 600)) && attempt < retries) {
        const jitter = Math.random() * base
        const delay = base * 2 ** attempt + jitter
        await sleep(delay)
        continue
      }
      const text = await res.text()
      throw new Error(`Helius error ${res.status}: ${text}`)
    } catch (e: any) {
      lastErr = e
      // Network failure — retry
      if (attempt < retries) {
        const jitter = Math.random() * base
        const delay = base * 2 ** attempt + jitter
        await sleep(delay)
        continue
      }
      break
    }
  }
  throw lastErr ?? new Error("Helius request failed")
}

type SearchAssetsParams = {
  ownerAddress: string
  page?: number
  limit?: number
}

export async function searchCompressedAssetsByOwner(endpoint: string, params: SearchAssetsParams) {
  const body = {
    jsonrpc: "2.0",
    id: "beamable",
    method: "searchAssets",
    params: {
      ownerAddress: params.ownerAddress,
      compressed: true,
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      displayOptions: { showUnverifiedCollections: true },
    },
  }
  const json = await heliusFetch<any>(endpoint, body)
  return json.result?.items || []
}

export async function searchCheckerAssets(
  endpoint: string,
  ownerAddress: string,
  trees: string[],
  opts?: { limit?: number; maxPages?: number },
) {
  const limit = opts?.limit ?? 100
  const maxPages = opts?.maxPages ?? 100
  if (!trees?.length) {
    const items = await searchCompressedAssetsByOwner(endpoint, { ownerAddress, limit })
    return items
  }

  const results: any[] = []
  for (const tree of trees) {
    let cursor: string | undefined
    let pageCount = 0
    while (pageCount < maxPages) {
      const params: Record<string, unknown> = {
        ownerAddress,
        compressed: true,
        tree,
        limit,
        displayOptions: { showUnverifiedCollections: true },
      }
      if (cursor) params.cursor = cursor
      else params.page = 1

      const body = {
        jsonrpc: "2.0",
        id: "beamable",
        method: "searchAssets",
        params,
      }

      const json = await heliusFetch<any>(endpoint, body)
      const payload = json?.result ?? json ?? {}
      const items = Array.isArray(payload?.items) ? payload.items : []
      results.push(...items)
      const nextCursor = typeof payload?.cursor === "string" ? payload.cursor : undefined
      pageCount += 1

      if (!nextCursor || items.length < limit) {
        break
      }

      cursor = nextCursor
    }
  }
  return results
}

export async function getAsset(endpoint: string, id: string) {
  const body = { jsonrpc: "2.0", id: "beamable", method: "getAsset", params: { id } }
  const json = await heliusFetch<any>(endpoint, body)
  return json.result
}

export async function getAssetProof(endpoint: string, id: string) {
  const body = { jsonrpc: "2.0", id: "beamable", method: "getAssetProof", params: { id } }
  const json = await heliusFetch<any>(endpoint, body)
  return json.result
}

export async function buildAssetWithProof(endpoint: string, id: string) {
  const [asset, proof] = await Promise.all([getAsset(endpoint, id), getAssetProof(endpoint, id)])
  console.debug("[Helius] buildAssetWithProof responses", {
    id,
    assetId: asset?.id,
    owner: asset?.ownership?.owner,
    delegate: asset?.ownership?.delegate,
    tree: asset?.compression?.tree,
    seq: asset?.compression?.seq,
    leaf_id: asset?.compression?.leaf_id,
    proofRootLen: (proof?.root || "").length,
    proofCount: Array.isArray(proof?.proof) ? proof.proof.length : -1,
    node_index: proof?.node_index,
  })
  const toBytes = (s?: string) => (s ? Uint8Array.from(bs58.decode(s)) : new Uint8Array())
  const owner = asset?.ownership?.owner
  const delegate = asset?.ownership?.delegate || owner
  const merkleTree = asset?.compression?.tree
  const leafId = asset?.compression?.leaf_id ?? proof?.leaf_index ?? proof?.node_index ?? 0
  const index = leafId
  const nonce = leafId
  const rootB58 = proof?.root
  const dataHashB58 = proof?.leaf?.data_hash
  const creatorHashB58 = proof?.leaf?.creator_hash
  const assetDataHashB58 = proof?.leaf?.asset_data_hash ?? proof?.leaf?.data_hash
  const flags = proof?.leaf?.leaf_type ?? 0
  const collectionKey = asset?.grouping?.find?.((g: any) => g.group_key === "collection")?.group_value
  return {
    rpcAsset: { id },
    proof: Array.isArray(proof?.proof) ? proof.proof : [],
    merkleTree,
    leafOwner: owner,
    leafDelegate: delegate,
    index,
    nonce,
    root: toBytes(rootB58),
    dataHash: toBytes(dataHashB58),
    creatorHash: toBytes(creatorHashB58),
    // Use none() for collection to avoid edge-case encoding issues
    metadata: { collection: none() },
    asset_data_hash: toBytes(assetDataHashB58),
    flags,
  }
}

export async function getAssetBatchDAS(endpoint: string, ids: string[]) {
  const out: any[] = []
  const tasks = ids.map(async (id) => {
    try {
      const asset = await getAsset(endpoint, id)
      out.push(asset)
    } catch {
      // ignore individual failures in batch hydration
    }
  })
  await Promise.allSettled(tasks)
  return out
}
