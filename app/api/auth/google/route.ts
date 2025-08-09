import { env as getEnv } from "@/lib/env";
import { createGoogleOAuth } from "@/lib/lucia";
import { generateState, generateCodeVerifier } from "arctic";

export const runtime = "edge";

export async function GET() {
  const env = getEnv();
  
  try {
    const googleOAuth = createGoogleOAuth(env);
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = googleOAuth.createAuthorizationURL(state, codeVerifier, ["openid", "email", "profile"]);
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
        "Set-Cookie": [
          `google_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
          `google_code_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
        ].join(", ")
      }
    });
  } catch (error) {
    return new Response("OAuth configuration error", { status: 500 });
  }
}
