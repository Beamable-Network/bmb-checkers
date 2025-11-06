# Beamable Checker Console

Beamable Checker Console is a Next.js 16 dashboard for owners of Beamable Network checker licenses. It connects to Solana wallets, surfaces live license metadata, and helps operators monitor daily activity, delegation status, and pending rewards. The UI emphasizes quick status checks—portfolio metrics, scrolling license cards, and a 30-day activity calendar—so checkers can keep uptime high and harvest rewards on schedule.

## Features

- Wallet connect/logout flow using the Solana Wallet Adapter (desktop, mobile, and modal UI)
- Real-time checker inventory with delegation/activation actions and toast feedback
- Rolling 30-day activity calendar that highlights running coverage and recommends follow-up actions
- Reward claiming widget that groups pending totals with an action button, disabled when nothing is due
- Network toggle (devnet/mainnet) with persistent storage
- Toast notifications, background analytics, and React Query caching for smoother UX

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript (strict mode recommended; project keeps types clean)
- **Styling**: Tailwind CSS 4 + custom tokens in `app/globals.css`
- **UI Primitives**: Radix UI + bespoke components in `components/ui/*`
- **State/Data**: React Query (`@tanstack/react-query`), context providers, custom hooks
- **Wallet & Blockchain**:
  - `@solana/wallet-adapter-react` (+ UI, mobile adapter) for wallet connectivity
  - `@beamable-network/depin` for checker-specific instructions
  - `@metaplex-foundation/mpl-bubblegum` + `umi` for compressed NFT proofs
  - `gill` helpers for transaction building/confirmation

## Directory Layout

```
app/                Next.js App Router entry points (layout, page, global styles)
components/         Feature components (calendar, license cards, dialogs) + ui/ primitives
hooks/              Reusable hooks (network toggle, wallet balance, depin actions)
lib/                Utilities for Solana & Helius integrations
types/              Type stubs for external modules
public/             Static assets (checker badge artwork)
```

## Key Dependencies

- `next`, `react`, `react-dom`
- `@beamable-network/depin` – checker activation/payout instructions
- `@solana/wallet-adapter-*` – wallet connectivity ecosystem
- `@metaplex-foundation/*` – compressed NFT proofs, DAS helpers
- `@tanstack/react-query` – client caching
- `tailwindcss`, `lucide-react`, `clsx`, `class-variance-authority`
- `eslint`, `typescript`, `@types/*` (dev dependencies)

See `package.json` for the complete dependency list.

## Getting Started

1. **Install pnpm** (recommended package manager):
   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment**:
   - Copy `.env.example` (if present) to `.env.local` and fill in Solana RPC keys.
   - By default, `lib/env.ts` falls back to Helius devnet URLs; set `NEXT_PUBLIC_*` variables for production use.

4. **Run the dev server**:
   ```bash
   pnpm dev
   ```
   Navigate to `http://localhost:3000`.

5. **Build for production**:
   ```bash
   pnpm build
   pnpm start
   ```

6. **Linting** (ESLint is included):
   ```bash
   pnpm lint
   ```

## Development Notes

- UI tokens and theme overrides are defined in `app/globals.css`; adjust there for global color or spacing tweaks.
- All hooks live under `hooks/`; prefix new hooks with `use-` and export typed return values.
- Checker data retrieval lives in `hooks/use-checker-licenses.ts` (Helius + Depin). Adjust there if API schemas change.
- For Solana instructions, see `hooks/use-depin-actions.ts` and utilities in `lib/kit-bridge.ts`.
- When adding features, prefer composing the primitives in `components/ui/*` to keep styling consistent.
- No test runner is wired up yet; if needed, add Vitest + React Testing Library under `tests/`.

## Contributing

- Follow the guidelines in `AGENTS.md` (structure, naming, commit style).
- Use Conventional Commit messages (`feat:`, `fix:`, etc.).
- Before opening a PR, run `pnpm lint` and `pnpm build`, and ensure type checks pass in touched files.
- Don’t commit secrets. Use `.env.local` for local overrides and environment variables in deployment.

---

Beamable Network. Manage your checkers, stay active, and keep rewards flowing.
