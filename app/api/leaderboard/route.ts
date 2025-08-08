export const runtime = "edge";
import { env as getEnv } from "@/lib/env";

export async function GET(_req: Request) {
  const env = getEnv();
  const url = new URL(_req.url);
  const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 100));
  const res = await env.DB.prepare(
    `SELECT id, title, score, analysis_summary, created_at, '' AS owner_anon FROM ideas WHERE score IS NOT NULL ORDER BY score DESC, created_at ASC LIMIT ?`
  ).bind(limit).all();
  const rows = (res.results ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    score: r.score,
    analysis_summary: r.analysis_summary,
    created_at: r.created_at,
    owner_anon: true,
  }));
  return new Response(JSON.stringify(rows), { status: 200 });
}


