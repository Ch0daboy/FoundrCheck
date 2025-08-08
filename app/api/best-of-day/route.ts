import { laTodayWindow } from "@/lib/tz";
import { env as getEnv } from "@/lib/env";

export const runtime = "edge";

export async function GET(req: Request) {
  const env = getEnv();
  const url = new URL(req.url);
  const tz = url.searchParams.get("tz") || env.APP_TIMEZONE || "America/Los_Angeles";
  const { startIso, endIso } = laTodayWindow(tz);
  const res = await env.DB.prepare(
    `SELECT id, title, score, analysis_summary, created_at FROM ideas WHERE score IS NOT NULL AND datetime(created_at) BETWEEN datetime(?) AND datetime(?) ORDER BY score DESC, created_at ASC LIMIT 1`
  ).bind(startIso, endIso).all();
  const row = res.results?.[0] ?? null;
  return new Response(JSON.stringify(row), { status: 200 });
}


