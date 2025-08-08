import { env as getEnv } from "@/lib/env";
import { loginWithEmailPassword, logout, registerWithEmailPassword } from "@/lib/lucia";

export const runtime = "edge";

export async function POST(req: Request) {
  const env = getEnv();
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();
  // minimal custom session handling

  if (action === "register") {
    const body = (await req.json()) as any;
    const email = body?.email as string | undefined;
    const password = body?.password as string | undefined;
    if (!email || !password) return new Response("Bad request", { status: 400 });
    const { userId, cookie } = await registerWithEmailPassword(env, email, password);
    return new Response(JSON.stringify({ userId }), {
      status: 201,
      headers: { "Set-Cookie": cookie },
    });
  }

  if (action === "login") {
    const body = (await req.json()) as any;
    const email = body?.email as string | undefined;
    const password = body?.password as string | undefined;
    if (!email || !password) return new Response("Bad request", { status: 400 });
    try {
      const { cookie } = await loginWithEmailPassword(env, email, password);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Set-Cookie": cookie },
      });
    } catch {
      return new Response("Invalid credentials", { status: 401 });
    }
  }

  if (action === "logout") {
    const blank = await logout(env, req);
    return new Response("", { headers: { "Set-Cookie": blank } });
  }

  return new Response("Not found", { status: 404 });
}


