import { getSessionUserId } from "@/lib/auth";
import { env as getEnv } from "@/lib/env";

export const runtime = "edge";

export async function GET(req: Request) {
  const env = getEnv();
  const userId = await getSessionUserId(env, req);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const res = await env.DB.prepare(
    `SELECT * FROM ideas WHERE owner_id = ? ORDER BY created_at DESC`
  ).bind(userId).all();
  return new Response(JSON.stringify(res.results ?? []), { status: 200 });
}


