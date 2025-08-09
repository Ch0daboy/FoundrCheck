# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router routes (`page.tsx`, `layout.tsx`) and API routes.
- `components/`: Reusable React components (PascalCase). UI primitives in `components/ui/` use lowercase filenames.
- `lib/`: Server/client utilities (DB, auth, scoring, Perplexity client). Import via `@/lib/*` and `@/components/*`.
- `migrations/`: D1 SQL migrations (run after setting `CF_D1_DB_NAME`).
- `worker-consumer/`: Cloudflare Worker consuming `IDEA_QUEUE` and updating D1.
- `tests/e2e/`: Playwright specs. Artifacts in `test-results/`.
- Config: `wrangler.toml`, `next.config.mjs`, `tailwind.config.ts`, `.eslintrc.json`, `tsconfig.json`.

## Build, Test, and Development Commands
- `pnpm install`: Install dependencies.
- `pnpm dev`: Run locally on Cloudflare Pages (`wrangler pages dev`, port 8788).
- `pnpm build`: Next.js production build; `pnpm preview` to build + preview; `pnpm deploy` to Pages.
- `pnpm migrate`: Apply D1 migration `migrations/0001_init.sql` (requires `CF_D1_DB_NAME`).
- `pnpm lint` / `pnpm lint:fix`: Lint and auto-fix.
- `pnpm type-check`: TypeScript checks.
- `pnpm test`: Run unit tests (Vitest). `pnpm e2e`: Run Playwright tests.
- `pnpm ci`: Lint + type-check + build; use before PRs.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Indent 2 spaces, LF line endings.
- Linting: `eslint` with `next/core-web-vitals`; rules enforce `prefer-const` (error) and `no-console` (warn).
- Components: PascalCase in `components/`; UI primitives in `components/ui/*` (lowercase filenames).
- Routes: Use Next.js conventions (`app/*/page.tsx`, `layout.tsx`).
- Utilities: camelCase functions in `lib/*`.

## Testing Guidelines
- Unit: Vitest for `lib/*` and pure logic. Name files `*.spec.ts` or co-locate as needed.
- E2E: Playwright specs in `tests/e2e/*.spec.ts`. Base URL is `http://localhost:8788` (see `playwright.config.ts`). Example: `pnpm dev` then `pnpm e2e`.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (`feat:`, `fix:`, `chore:`). Write concise, imperative messages.
- PRs: Include summary, linked issues, screenshots for UI changes, and steps to validate. Ensure `pnpm ci` passes.

## Security & Configuration Tips
- Use `.env.example` as a reference. Set secrets via Cloudflare (`wrangler secret put`) or dashboard (e.g., `PERPLEXITY_API_KEY`).
- Required bindings: D1 (`DB`), `IDEA_QUEUE`, Turnstile keys, and app vars in `wrangler.toml`.
- Never commit secrets or `.env` files.
