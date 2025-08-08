import { validateRequest } from "@/lib/lucia";
import { env as getEnv } from "@/lib/env";

export const runtime = "edge";

export async function GET(req: Request) {
  const env = getEnv();
  const { user } = await validateRequest(env, req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const res = await env.DB.prepare(
    `SELECT * FROM ideas WHERE owner_id = ? ORDER BY created_at DESC`
  ).bind(user.id).all();
  return new Response(JSON.stringify(res.results ?? []), { status: 200 });
}


