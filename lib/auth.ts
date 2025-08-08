import { Lucia } from "lucia";
import { D1Adapter } from "@lucia-auth/adapter-sqlite";
import { v4 as uuidv4 } from "uuid";

type Bindings = {
  DB: D1Database;
};

export function getAuth(env: Bindings) {
  const adapter = new D1Adapter(env.DB, {
    user: "users",
    session: "sessions",
    key: "user_keys",
  });
  const auth = new Lucia(adapter, {
    sessionCookie: {
      name: SESSION_COOKIE_NAME,
      attributes: { secure: true, httpOnly: true, sameSite: "lax", path: "/" },
    },
    getUserAttributes: (data) => ({ email: (data as any).email }),
  });
  return auth;
}

export async function createUser(env: Bindings, email: string, hashedPassword: string) {
  const id = uuidv4();
  const auth = getAuth(env);
  await auth.createUser({
    userId: id,
    key: {
      providerId: "email",
      providerUserId: email,
      password: hashedPassword,
    },
    attributes: { email },
  });
  // minimal profile row
  await env.DB.prepare("INSERT OR IGNORE INTO user_profiles (id, email) VALUES (?, ?)").bind(id, email).run();
  return id;
}

export async function verifyEmailPassword(env: Bindings, email: string, hashedPassword: string): Promise<string | null> {
  const keyId = `email:${email}`;
  const res = await env.DB.prepare(
    `SELECT user_id, hashed_password FROM user_keys WHERE id = ?`
  ).bind(keyId).all();
  const row = res.results?.[0] as any;
  if (!row) return null;
  if (row.hashed_password !== hashedPassword) return null;
  return row.user_id as string;
}

export const SESSION_COOKIE_NAME = "fc_session";

export function getCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const parts = cookie.split(";");
  for (const part of parts) {
    const [k, v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v ?? "");
  }
  return null;
}

export async function getSessionUserId(env: Bindings, req: Request): Promise<string | null> {
  const sessionId = getCookie(req, SESSION_COOKIE_NAME);
  if (!sessionId) return null;
  const res = await env.DB.prepare(`SELECT user_id, expires_at FROM sessions WHERE id = ?`).bind(sessionId).all();
  const row = res.results?.[0] as any;
  if (!row) return null;
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(row.expires_at);
  if (Number.isFinite(exp) && exp < now) return null;
  return row.user_id as string;
}


