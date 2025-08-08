## FoundrCheck (MVP)

Tech: Next.js 14 (App Router) on Cloudflare Pages via `@cloudflare/next-on-pages`, D1 (SQLite), Cloudflare Queues, Lucia Auth (D1), Tailwind + shadcn/ui, Perplexity API, Turnstile.

### Local Dev

1. Install deps: `pnpm install`
2. Migrate D1: create a D1 database and set env `CF_D1_DB_NAME`, then `pnpm migrate`
3. Dev: `pnpm dev` (uses `wrangler pages dev`)

### Required Bindings (Pages + Consumer Worker)

- `DB` (D1)
- `IDEA_QUEUE` (Cloudflare Queue)
- `PERPLEXITY_API_KEY`
- `PERPLEXITY_MODEL` (e.g. `sonar-pro`)
- `APP_TIMEZONE=America/Los_Angeles`
- `RATE_LIMIT_DAILY=3`

Turnstile:
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

### Scripts

- `pnpm build` → `next-on-pages`
- `pnpm preview` → build + pages dev
- `pnpm deploy` → build + pages deploy

### Queue Consumer

Worker at `worker-consumer/` subscribes to `IDEA_QUEUE` and handles Perplexity analysis + caching + scoring.


