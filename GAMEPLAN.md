# System Role

You are a **senior full-stack engineer** building an MVP called **“FoundrCheck”**: an app that validates startup ideas. Use **Cloudflare Pages (Next on Pages) + Workers**, **D1 (SQLite)**, **Cloudflare Queues**, **Lucia Auth**, **shadcn/ui**. Ship quickly, keep ops at zero, and control Perplexity costs with caching + rate limits.

# Tech Constraints (must use)

* **UI/SSR:** Next.js 14 (App Router, TypeScript) on **Cloudflare Pages** via **@cloudflare/next-on-pages**.
* **Styling:** Tailwind + **shadcn/ui**.
* **Auth:** **Lucia** with **D1 adapter** (sessions via secure cookies).
* **DB:** **Cloudflare D1** (SQLite).
* **Background jobs:** **Cloudflare Queues** (producer from API; dedicated consumer Worker).
* **Optional storage:** R2 (not required for MVP).
* **AI:** Perplexity API (server-side only). Wrap behind our own API client for swap-ability.
* **Anti-abuse:** Cloudflare **Turnstile** on submit page.
* **Timezone:** America/Los\_Angeles for “Best of Day”.

# Environment Variables & Bindings

Create these bindings for the **Pages project** (Next on Pages) and the **consumer Worker**:

**Bindings (both):**

* `DB` → D1 database
* `IDEA_QUEUE` → Cloudflare Queue (same queue for producer/consumer)
* `PERPLEXITY_API_KEY`
* `PERPLEXITY_MODEL` (e.g., `sonar-pro`)
* `APP_TIMEZONE=America/Los_Angeles`
* `RATE_LIMIT_DAILY=3`

**Turnstile (frontend only):**

* `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
* `TURNSTILE_SECRET_KEY` (server)

# D1 Schema (SQL)

Create a migration and run it on D1:

```sql
-- users handled by Lucia (sessions in D1), plus minimal profile table
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,              -- lucia user id
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  idea_hash TEXT NOT NULL,          -- sha256(normalized input)
  visibility TEXT NOT NULL DEFAULT 'public', -- public|private
  status TEXT NOT NULL DEFAULT 'queued',     -- queued|analyzing|scored|failed
  score INTEGER,                    -- 0..100
  analysis_summary TEXT,            -- 3–5 sentence synthesized summary
  analysis_raw TEXT,                -- full JSON from Perplexity (owner-only)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(idea_hash, owner_id)       -- per-user dedup
);

-- cached analyses (global reuse by idea_hash)
CREATE TABLE IF NOT EXISTS idea_cache (
  idea_hash TEXT PRIMARY KEY,
  analysis_raw TEXT NOT NULL,
  analysis_summary TEXT NOT NULL,
  score INTEGER NOT NULL,
  cached_at TEXT DEFAULT (datetime('now'))
);

-- rate limiting (rolling 24h window)
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ideas_score ON ideas(score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_owner ON ideas(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_owner_time ON submissions(owner_id, created_at DESC);
```

# Data Model & Rules

* **Idea fields:** `title` ≤ 120 chars; `description` ≤ 2000.
* **Status machine:** `queued → analyzing → scored|failed`.
* **Public reads** never include `analysis_raw`. Only owner can fetch raw JSON.
* **Caching:** On submit, if `idea_cache` has same `idea_hash` **within 72h**, reuse it instead of calling Perplexity.
* **Rate limit:** Max `RATE_LIMIT_DAILY` (default 3) ideas per user per rolling 24h (count in `submissions`).

# Scoring Rubric (deterministic, 0–100)

Inputs (each 0–5):
`market_size` (30%), `novelty` (20%), `monetization_clarity` (20%),
`competition_intensity` (15%, inverted), `execution_complexity` (15%, inverted)

```
final = round(
  100 * (
    0.3*ms + 0.2*nov + 0.2*mon +
    0.15*(5-ci)/5 + 0.15*(5-ec)/5
  ) / 5
)
```

Clamp 0–100. Store on `ideas.score`.

# Perplexity Prompt (strict JSON response)

Use a server-side client with 45s timeout and 1 retry:

```
System: You are a rigorous startup idea validator. Be concise, factual, and structured.

User: Analyze this startup idea and return ONLY a strict JSON object:
{
  "one_sentence": "...",
  "market_signals": ["...","..."],
  "competitors": [{"name":"...", "brief_note":"..."}],
  "moat_risks": ["...","..."],
  "go_to_market": ["...","..."],
  "monetization": ["...","..."],
  "feasibility_factors": ["...","..."],
  "rubric_inputs": {
    "market_size": 0-5,
    "competition_intensity": 0-5,
    "novelty": 0-5,
    "execution_complexity": 0-5,
    "monetization_clarity": 0-5
  }
}
Idea: """{{USER_IDEA}}"""
Return ONLY JSON with the exact keys above.
```

If parse fails, retry with “Respond JSON only, no prose.”

# Routes & Behaviors (Next on Pages /app/api)

All routes run at the edge and can access bindings via `env`:

* `POST /api/auth/*` — Lucia routes (register/login/logout).

* `POST /api/ideas`

  * Verify auth + Turnstile.
  * Validate lengths.
  * Compute `idea_hash`.
  * **Dedup/cache:** If `idea_cache` hit (≤72h), create `ideas` row with cached score/summary/raw and `status='scored'` immediately; insert into `submissions`; return 201.
  * **Rate limit:** Count `submissions` last 24h; if ≥ limit, return 429.
  * Else create `ideas` with `status='queued'`, insert `submissions`, **enqueue** job to `IDEA_QUEUE` with `{ideaId, idea_hash, normalizedText}`; return 202 with idea id.

* `GET /api/ideas/:id`

  * Public fetch; sanitize (`analysis_raw` only if owner).

* `GET /api/leaderboard?limit=100`

  * Top ideas by `score DESC, created_at ASC` (tie → earliest).
  * Return `{id,title,score,analysis_summary,created_at,owner_anon}`.

* `GET /api/best-of-day?tz=America/Los_Angeles`

  * Compute day window in TZ; return single highest score created today.

* `GET /api/me/ideas`

  * Auth; list user’s ideas with statuses; include `analysis_raw` for owner.

# Queue Message Shape

```ts
type IdeaJob = {
  ideaId: string;
  idea_hash: string;
  normalizedText: { title: string; description: string };
};
```

# Queue Consumer Worker (separate Worker)

* Trigger: `queues: { IDEA_QUEUE: { consumer } }`.
* Steps:

  1. Load `idea` by id; if missing or not `queued`, ack and skip.
  2. Update status → `analyzing`.
  3. **Cache check again** (race safety). If hit: write results, set `scored`, ack.
  4. Call Perplexity with prompt (above), parse JSON.
  5. Compute `score` via rubric.
  6. Synthesize `analysis_summary` = `one_sentence` + top 2 `market_signals` + top competitor (name only) + top risk.
  7. **Upsert** into `idea_cache` (idea\_hash).
  8. Update `ideas` (`status='scored'`, `score`, `analysis_summary`, `analysis_raw`).
  9. On error: set `status='failed'`, write the error message to `analysis_summary`, ack.

# Auth (Lucia + D1)

* Email/password with password hashing (Oslo).
* Sessions via HTTP-only, secure cookies.
* Add `user_profiles` row on signup.
* Expose minimal session info to client.

# Frontend Pages (shadcn/ui)

* `/` Home:

  * Header: logo, Submit, Leaderboard, Profile/Auth.
  * “Best Idea of the Day” card (title, score, summary, link).
  * CTA to Submit.
* `/submit` (auth-gated):

  * Textarea + title input + Turnstile widget.
  * On submit: call `/api/ideas` → if `queued`, show optimistic card with spinner + poll `/api/ideas/:id` every 2–3s until `scored|failed`.
* `/leaderboard`:

  * Table (Top 100): Rank, Title, Score, Date, link.
  * **Score tooltip** shows rubric weights & short explanation.
* `/profile`:

  * User’s ideas with status chips (queued/analyzing/scored/failed). Empty state CTA.
* `/ideas/[id]`:

  * Public: title, score, summary, created\_at, owner\_anon.
  * If owner: collapsible “Raw Analysis (JSON)” section.

# UX Details

* Show rubric weights on hover next to score badge.
* LA timezone for “Best of Day” (compute server-side).
* Skeletons for loading states; toasts for errors.
* Copy: “We’re analyzing your idea (\~30–60s). You’ll see the score here.”

# Cost Controls & Abuse Prevention

* **Rate limit** 3/day/user (D1).
* **Turnstile** on submit.
* **72h cache** by `idea_hash`.
* **Timeout** 45s and 1 retry for Perplexity.
* Reject ideas under 20 chars or over 2,000.

# File/Folder Structure

```
/app
  /page.tsx                     # Home (best-of-day)
  /submit/page.tsx
  /leaderboard/page.tsx
  /profile/page.tsx
  /ideas/[id]/page.tsx
  /api
    /ideas/route.ts             # POST (enqueue) & maybe GET collection if needed
    /ideas/[id]/route.ts        # GET detail (sanitize vs owner)
    /leaderboard/route.ts
    /best-of-day/route.ts
    /auth/[...lucia]/route.ts   # auth handlers if using route handlers
/components
  IdeaCard.tsx
  LeaderboardTable.tsx
  SubmitForm.tsx
  ScoreBadge.tsx
  LoadingSkeleton.tsx
/lib
  db.ts                         # D1 helper (prepared statements)
  auth.ts                       # Lucia setup (D1 adapter)
  scoring.ts                    # rubric compute
  perplexity.ts                 # API client + JSON parser
  sanitize.ts                   # drop raw fields for public
  tz.ts                         # TZ helpers (LA window)
/styles/globals.css
/scripts/migrate.ts             # run D1 migrations
/worker-consumer                # separate Worker for Queue consumer
  /index.ts
  /wrangler.toml
```

# Next on Pages & Wrangler Config

**App (Pages) build commands:**

* `pnpm dlx @cloudflare/next-on-pages@latest`
* Add `"build": "next-on-pages"` to package.json or use the CLI in CI.

**Consumer Worker `wrangler.toml` example:**

```toml
name = "startsmart-consumer"
main = "index.ts"
compatibility_date = "2024-11-01"

[[queues.consumers]]
queue = "IDEA_QUEUE"
max_batch_size = 10
max_batch_timeout = 5

[[d1_databases]]
binding = "DB"
database_name = "startsmart-db"
database_id = "YOUR_D1_ID"

[vars]
PERPLEXITY_MODEL = "sonar-pro"
APP_TIMEZONE = "America/Los_Angeles"
RATE_LIMIT_DAILY = "3"
```

# Testing & Acceptance

* Unit: scoring, sanitization, rate limit window, LA “today” window.
* E2E (Playwright on Pages dev): sign up → submit → see queued → gets score (or cached) → appears on profile; leaderboard shows; best-of-day correct by TZ.
* Public endpoints never return `analysis_raw` to non-owners.
* Cache reuse path confirmed (submit same idea twice → 2nd is instant).

# Delivery Checklist

* README with local dev (Pages dev), D1 migrate, setting bindings, and deploying both the Pages app and the consumer Worker.
* Screenshots/GIF of submit → score loop.
* CI (optional): lint/test/build on push.

**Build exactly as specified. If something is ambiguous, choose the simplest solution that meets acceptance criteria and leave a TODO in code comments.**
