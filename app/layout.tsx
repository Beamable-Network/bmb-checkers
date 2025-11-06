import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import "@solana/wallet-adapter-react-ui/styles.css"
import { SolanaProviders } from "@/components/solana/providers"
import { Toaster } from "@/components/ui/toaster"
import { NetworkProvider } from "@/hooks/use-network"
import { QueryProvider } from "@/components/query-provider"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Beamable Network — Checker Console",
  description: "Manage Checker Licenses, rewards, and delegation.",
  generator: "beamable.network",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        <NetworkProvider>
          <QueryProvider>
            <SolanaProviders>
              {children}
              <Toaster />
            </SolanaProviders>
          </QueryProvider>
        </NetworkProvider>
        <Analytics />
      </body>
    </html>
  )
}
