import { env as getEnv } from "@/lib/env";
import { createGoogleOAuth, createOrGetUserFromGoogle, createSessionForUser } from "@/lib/lucia";
import { decodeIdToken } from "arctic";

export const runtime = "edge";

export async function GET(request: Request) {
  const env = getEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  
  const cookieHeader = request.headers.get("cookie") ?? "";
  const storedState = cookieHeader
    .split("; ")
    .find(c => c.startsWith("google_oauth_state="))
    ?.split("=")[1];
  const codeVerifier = cookieHeader
    .split("; ")
    .find(c => c.startsWith("google_code_verifier="))
    ?.split("=")[1];

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return new Response("Invalid OAuth callback", { status: 400 });
  }

  try {
    const googleOAuth = createGoogleOAuth(env);
    const tokens = await googleOAuth.validateAuthorizationCode(code, codeVerifier);
    
    // Decode ID token to get user info
    const claims = decodeIdToken(tokens.idToken()) as {
      email?: string;
      name?: string;
      sub?: string;
    };
    const googleUser = {
      email: claims.email || '',
      name: claims.name || '',
      sub: claims.sub || ''
    };
    
    if (!googleUser.email) {
      throw new Error("No email provided by Google");
    }

    // Create or get existing user
    const userId = await createOrGetUserFromGoogle(env, googleUser);
    
    // Create session
    const { cookie } = await createSessionForUser(env, userId);
    
    const redirectUrl = `${env.APP_URL || 'https://foundrcheck.com'}/profile`;
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        "Set-Cookie": [
          cookie,
          "google_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
          "google_code_verifier=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
        ].join(", ")
      }
    });
    
  } catch (error) {
    const redirectUrl = `${env.APP_URL || 'https://foundrcheck.com'}/?error=oauth_failed`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        "Set-Cookie": [
          "google_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
          "google_code_verifier=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
        ].join(", ")
      }
    });
  }
}
