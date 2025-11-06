# Repository Guidelines

## Project Structure & Module Organization
- App router: `app/` (`layout.tsx`, `page.tsx`, global styles in `app/globals.css`).
- Components: `components/` (domain UI like `delegate-dialog.tsx`) and `components/ui/*` (reusable primitives).
- Hooks & utils: `hooks/*`, `lib/utils.ts`.
- Assets: `public/*` (images, svgs). Tailwind config via `postcss.config.mjs`; TypeScript config in `tsconfig.json`.

## Build, Test, and Development Commands
- `pnpm dev` — Start Next.js dev server.
- `pnpm build` — Production build (`next build`).
- `pnpm start` — Run production server after build.
- `pnpm lint` — Lint project (ESLint). Note: ensure ESLint is installed if missing.

Example: `pnpm dev` then visit `http://localhost:3000`.

## Coding Style & Naming Conventions
- Language: TypeScript + React (functional components, hooks).
- Filenames: kebab-case for files (e.g., `checker-license-card.tsx`), folders in lowercase.
- Indentation: 2 spaces; keep lines concise and typed (`strict: true`).
- Styling: Tailwind CSS (utilities first, then component classes). Prefer composing primitives in `components/ui/*`.
- Hooks must prefix `use-` (e.g., `hooks/use-mobile.ts`).
- Imports: use `@/*` path alias when suitable.

## Testing Guidelines
- No test framework is configured yet. If adding tests, prefer Vitest + React Testing Library.
- Place tests under `tests/` mirroring source paths; name as `*.test.tsx|ts` (e.g., `tests/components/checker-license-card.test.tsx`).
- Add a script `"test": "vitest"` when introducing tests; keep coverage meaningful for core UI logic.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- Commits should be small and focused; include context in the body when needed.
- PRs must include: concise description, linked issues (e.g., `Closes #123`), screenshots/gifs for UI changes, and notes on any breaking changes.
- Before opening a PR: run `pnpm lint` and `pnpm build` locally and ensure no type errors in changed files.

## Security & Configuration Tips
- Next config: `next.config.mjs` sets `images.unoptimized` and ignores TS build errors; avoid introducing new `any` types and keep types clean to eventually re-enable strict builds.
- Do not commit secrets; use environment variables via `.env.local` when needed.
