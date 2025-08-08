import { v4 as uuidv4 } from "uuid";
import { validateRequest } from "@/lib/lucia";
import { env as getEnv } from "@/lib/env";
import { z } from "zod";

export const runtime = "edge";

const BodySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(20).max(2000),
  turnstileToken: z.string().min(10),
});

async function verifyTurnstile(token: string, secret: string) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = await res.json<any>();
  return !!data.success;
}

function normalizeText(title: string, description: string) {
  const t = title.trim().toLowerCase();
  const d = description.trim().toLowerCase();
  return { title: t, description: d };
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  const env = getEnv();
  const { user } = await validateRequest(env, req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const json = await req.json();
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return new Response("Invalid input", { status: 400 });
  const { title, description, turnstileToken } = parsed.data;

  const ok = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY || "");
  if (!ok) return new Response("Turnstile failed", { status: 400 });

  const norm = normalizeText(title, description);
  const hash = await sha256(`${norm.title}\n${norm.description}`);

  // Cache hit within 72h
  const cacheRes = await env.DB.prepare(
    `SELECT analysis_raw, analysis_summary, score, cached_at FROM idea_cache WHERE idea_hash = ? AND datetime(cached_at) >= datetime('now', '-72 hours')`
  ).bind(hash).all();

  const ideaId = uuidv4();

  if (cacheRes.results?.length) {
    const cached = cacheRes.results[0] as any;
    await env.DB.prepare(
      `INSERT INTO ideas (id, owner_id, title, description, idea_hash, visibility, status, score, analysis_summary, analysis_raw) VALUES (?, ?, ?, ?, ?, 'public', 'scored', ?, ?, ?)`
    )
      .bind(ideaId, user.id, title, description, hash, cached.score, cached.analysis_summary, cached.analysis_raw)
      .run();

    await env.DB.prepare(`INSERT INTO submissions (owner_id) VALUES (?)`).bind(user.id).run();
    return new Response(JSON.stringify({ id: ideaId, status: "scored" }), { status: 201 });
  }

  // Rate limit
  const limit = Number(env.RATE_LIMIT_DAILY ?? 3);
  const countRes = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM submissions WHERE owner_id = ? AND datetime(created_at) >= datetime('now', '-24 hours')`
  ).bind(user.id).all();
  const cnt = Number((countRes.results?.[0] as any)?.cnt ?? 0);
  if (cnt >= limit) return new Response("Rate limit exceeded", { status: 429 });

  await env.DB.prepare(
    `INSERT INTO ideas (id, owner_id, title, description, idea_hash, visibility, status) VALUES (?, ?, ?, ?, ?, 'public', 'queued')`
  )
    .bind(ideaId, user.id, title, description, hash)
    .run();

  await env.DB.prepare(`INSERT INTO submissions (owner_id) VALUES (?)`).bind(user.id).run();

  const payload = { ideaId, idea_hash: hash, normalizedText: norm };
  await env.IDEA_QUEUE.send(JSON.stringify(payload));

  return new Response(JSON.stringify({ id: ideaId, status: "queued" }), { status: 202 });
}


