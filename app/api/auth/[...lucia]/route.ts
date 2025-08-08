import { env as getEnv } from "@/lib/env";
import { getAuth, createUser, verifyEmailPassword, getSessionUserId } from "@/lib/auth";

export const runtime = "edge";

async function hashPassword(pw: string) {
  const data = new TextEncoder().encode(pw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  const env = getEnv();
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();
  const auth = getAuth(env);

  if (action === "register") {
    const body = (await req.json()) as any;
    const email = body?.email as string | undefined;
    const password = body?.password as string | undefined;
    if (!email || !password) return new Response("Bad request", { status: 400 });
    const hashed = await hashPassword(password);
    const userId = await createUser(env, email, hashed);
    const session = await auth.createSession(userId, {});
    const cookie = auth.createSessionCookie(session.id);
    return new Response(JSON.stringify({ userId }), {
      status: 201,
      headers: { "Set-Cookie": cookie.serialize() },
    });
  }

  if (action === "login") {
    const body = (await req.json()) as any;
    const email = body?.email as string | undefined;
    const password = body?.password as string | undefined;
    if (!email || !password) return new Response("Bad request", { status: 400 });
    const hashed = await hashPassword(password);
    const userId = await verifyEmailPassword(env, email, hashed);
    if (!userId) return new Response("Invalid credentials", { status: 401 });
    const session = await auth.createSession(userId, {});
    const cookie = auth.createSessionCookie(session.id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Set-Cookie": cookie.serialize() },
    });
  }

  if (action === "logout") {
    const env = getEnv();
    const userId = await getSessionUserId(env, req);
    // best-effort session invalidation: delete by cookie id if present
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/fc_session=([^;]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    if (sessionId) await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
    const blank = auth.createBlankSessionCookie();
    return new Response("", { headers: { "Set-Cookie": blank.serialize() } });
  }

  return new Response("Not found", { status: 404 });
}


