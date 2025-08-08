import { Lucia, TimeSpan } from "lucia";
import { D1Adapter } from "@lucia-auth/adapter-sqlite";
import type { Bindings } from "@/lib/env";
import { v4 as uuidv4 } from "uuid";

// Simple SHA-256 hashing for edge runtime compatibility
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hashedPassword;
}

export function createLucia(env: Bindings) {
  const adapter = new D1Adapter(env.DB, { user: "user", session: "session" });
  const lucia = new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(30, "d"),
    sessionCookie: {
      name: "fc_session",
      attributes: {
        sameSite: "lax",
        secure: true,
        path: "/",
      },
    },
  });
  return lucia;
}

export async function validateRequest(env: Bindings, req: Request) {
  const lucia = createLucia(env);
  const cookieHeader = req.headers.get("cookie") ?? "";
  const sessionId = lucia.readSessionCookie(cookieHeader);
  if (!sessionId) return { user: null, session: null } as const;
  return await lucia.validateSession(sessionId);
}

export async function registerWithEmailPassword(env: Bindings, email: string, password: string) {
  // Ensure email not taken
  const exists = await env.DB.prepare("SELECT id FROM user WHERE email = ?").bind(email).first();
  if (exists) throw new Error("EMAIL_TAKEN");

  const userId = uuidv4();
  await env.DB.prepare("INSERT INTO user (id, email) VALUES (?, ?)").bind(userId, email).run();

  const hashedPassword = await hashPassword(password);
  const keyId = `email:${email}`;
  await env.DB.prepare("INSERT INTO key (id, user_id, hashed_password) VALUES (?, ?, ?)")
    .bind(keyId, userId, hashedPassword)
    .run();

  await env.DB.prepare("INSERT OR IGNORE INTO user_profiles (id, email) VALUES (?, ?)").bind(userId, email).run();

  const lucia = createLucia(env);
  const session = await lucia.createSession(userId, {});
  const cookie = lucia.createSessionCookie(session.id).serialize();
  return { userId, cookie } as const;
}

export async function loginWithEmailPassword(env: Bindings, email: string, password: string) {
  const keyId = `email:${email}`;
  const row = await env.DB.prepare("SELECT user_id, hashed_password FROM key WHERE id = ?")
    .bind(keyId)
    .first<{ user_id: string; hashed_password: string }>();
  if (!row) throw new Error("INVALID_CREDENTIALS");

  const ok = await verifyPassword(row.hashed_password, password);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  const lucia = createLucia(env);
  const session = await lucia.createSession(row.user_id, {});
  const cookie = lucia.createSessionCookie(session.id).serialize();
  return { userId: row.user_id, cookie } as const;
}

export async function logout(env: Bindings, req: Request) {
  const lucia = createLucia(env);
  const cookieHeader = req.headers.get("cookie") ?? "";
  const sessionId = lucia.readSessionCookie(cookieHeader);
  if (sessionId) await lucia.invalidateSession(sessionId);
  const blank = lucia.createBlankSessionCookie().serialize();
  return blank;
}


