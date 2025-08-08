import { getSessionUserId } from "@/lib/auth";
import { sanitizeIdea } from "@/lib/sanitize";
import { env as getEnv } from "@/lib/env";

export const runtime = "edge";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const env = getEnv();
  const id = ctx.params.id;
  const viewerId = await getSessionUserId(env, _req);

  const res = await env.DB.prepare(`SELECT * FROM ideas WHERE id = ?`).bind(id).all();
  if (!res.results?.length) return new Response("Not found", { status: 404 });
  const row = res.results[0] as any;
  const sanitized = sanitizeIdea(row, viewerId);
  return new Response(JSON.stringify(sanitized), { status: 200 });
}


