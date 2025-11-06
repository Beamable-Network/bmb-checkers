export function getEnv(name: string, fallback?: string) {
  if (typeof window === "undefined") {
    // Next: only expose NEXT_PUBLIC_* to client; server can read all
    // But we only use this in client components.
  }
  const val = process.env[name]
  return (val ?? fallback) as string | undefined
}

export const ENV = {
  SOLANA_RPC: getEnv("NEXT_PUBLIC_SOLANA_RPC", "https://myriam-dhwfh7-fast-devnet.helius-rpc.com"),
  HELIUS_API_KEY: getEnv("NEXT_PUBLIC_HELIUS_API_KEY"),
  HELIUS_RPC: getEnv("NEXT_PUBLIC_HELIUS_RPC"),
  BMB_MINT: getEnv("NEXT_PUBLIC_BMB_MINT", "BMBtwz6LFDJVJd2aZvL5F64fdvWP3RPn4NP5q9Xe15UD"),
  CHECKER_COLLECTION: getEnv("NEXT_PUBLIC_CHECKER_COLLECTION"),
}

export function heliusRpcUrl() {
  if (ENV.HELIUS_RPC) return ENV.HELIUS_RPC
  if (ENV.HELIUS_API_KEY) return `https://mainnet.helius-rpc.com/?api-key=${ENV.HELIUS_API_KEY}`
  return undefined
}
