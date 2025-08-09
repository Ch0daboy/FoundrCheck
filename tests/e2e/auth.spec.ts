import { test, expect, request, APIRequestContext, BrowserContext, Page } from "@playwright/test";

// Helpers
function randomEmail(prefix = "user") {
  const n = Math.random().toString(36).slice(2, 8);
  return `${prefix}.${n}@example.com`;
}

function parseSetCookie(setCookieHeader: string | string[] | null) {
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  const map: Record<string, { value: string; raw: string }> = {};
  for (const raw of headers) {
    const [pair] = raw.split(";");
    const [name, ...rest] = pair.split("=");
    map[name.trim()] = { value: rest.join("=").trim(), raw };
  }
  return map;
}

async function registerUser(api: APIRequestContext, email: string, password: string) {
  const res = await api.post("/api/auth/register", {
    data: { email, password },
  });
  return res;
}

async function loginUser(api: APIRequestContext, email: string, password: string) {
  const res = await api.post("/api/auth/login", {
    data: { email, password },
  });
  return res;
}

async function logoutUser(api: APIRequestContext, cookieHeader?: string) {
  const res = await api.post("/api/auth/logout", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  return res;
}

async function ideasForSession(api: APIRequestContext, cookieHeader?: string) {
  return api.get("/api/me/ideas", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

async function setBrowserCookieFromHeader(context: BrowserContext, cookieHeader: string) {
  // Playwright expects cookie objects; translate the fc_session Set-Cookie into one.
  const cookies = cookieHeader.split(", ").filter(Boolean);
  const fc = cookies.find((c) => c.startsWith("fc_session="));
  if (!fc) return;
  const parts = fc.split(";");
  const [name, value] = parts[0].split("=");
  const domainAttr = parts.find((p) => p.trim().toLowerCase().startsWith("domain="));
  const pathAttr = parts.find((p) => p.trim().toLowerCase().startsWith("path="));
  await context.addCookies([
    {
      name,
      value,
      domain: domainAttr ? domainAttr.split("=")[1] : "localhost",
      path: pathAttr ? pathAttr.split("=")[1] : "/",
      httpOnly: parts.some((p) => p.trim().toLowerCase() === "httponly"),
      secure: parts.some((p) => p.trim().toLowerCase() === "secure"),
      sameSite: ((): "Lax" | "Strict" | "None" => {
        const ss = parts.find((p) => p.trim().toLowerCase().startsWith("samesite="));
        const v = (ss ? ss.split("=")[1] : "Lax").toLowerCase();
        if (v === "strict") return "Strict";
        if (v === "none") return "None";
        return "Lax";
      })(),
    },
  ]);
}

test.describe("Auth E2E", () => {
  test("1) Registration: creates user and session cookie; duplicate blocked", async ({}, testInfo) => {
    const api = await request.newContext({ baseURL: testInfo.project.use?.baseURL as string });
    const email = randomEmail("reg");
    const password = "P@ssw0rd!";

    // Successful registration
    const res = await registerUser(api, email, password);
    expect(res.status(), await res.text()).toBe(201);
    const json = await res.json();
    expect(typeof json.userId).toBe("string");

    const setCookie = res.headers()["set-cookie"] ?? res.headersArray().find((h) => h.name.toLowerCase() === "set-cookie")?.value ?? null;
    expect(setCookie, "Set-Cookie should be present on register").toBeTruthy();
    const cookies = parseSetCookie(setCookie);
    expect(cookies["fc_session"], "fc_session cookie set").toBeTruthy();
    expect(cookies["fc_session"].value.length).toBeGreaterThan(10);
    const raw = cookies["fc_session"].raw.toLowerCase();
    expect(raw).toContain("samesite=lax");
    expect(raw).toContain("path=/");
    // Secure may be omitted in local dev; HttpOnly should be present
    expect(raw).toContain("httponly");

    // Session can access a protected API
    const cookieHeader = res.headers()["set-cookie"] as string;
    const ideas = await ideasForSession(api, cookieHeader);
    expect(ideas.status(), await ideas.text()).toBe(200);

    // Duplicate registration should fail (current API throws -> 500)
    const dup = await registerUser(api, email, password);
    expect(dup.status()).not.toBe(201);
  });

  test("2) Login: invalid credentials rejected, valid credentials set session", async ({}, testInfo) => {
    const api = await request.newContext({ baseURL: testInfo.project.use?.baseURL as string });
    const email = randomEmail("login");
    const password = "S3cret!";

    // Prepare user
    const reg = await registerUser(api, email, password);
    expect(reg.status(), await reg.text()).toBe(201);

    // Wrong password
    const wrong = await loginUser(api, email, "badpass");
    expect(wrong.status()).toBe(401);
    expect(await wrong.text()).toMatch(/invalid credentials/i);

    // Correct password
    const ok = await loginUser(api, email, password);
    expect(ok.ok()).toBeTruthy();
    const setCookie = ok.headers()["set-cookie"] ?? ok.headersArray().find((h) => h.name.toLowerCase() === "set-cookie")?.value ?? null;
    const cookies = parseSetCookie(setCookie);
    expect(cookies["fc_session"], "fc_session cookie set").toBeTruthy();

    // Session -> protected API ok
    const ideas = await ideasForSession(api, setCookie as string);
    expect(ideas.status(), await ideas.text()).toBe(200);
  });

  test("3) Logout: clears session cookie and revokes access", async ({}, testInfo) => {
    const api = await request.newContext({ baseURL: testInfo.project.use?.baseURL as string });
    const email = randomEmail("logout");
    const password = "P@ss!234";

    const reg = await registerUser(api, email, password);
    expect(reg.status()).toBe(201);
    const cookieHeader = reg.headers()["set-cookie"] as string;

    // Verify access before logout
    const ideasBefore = await ideasForSession(api, cookieHeader);
    expect(ideasBefore.status()).toBe(200);

    // Logout
    const out = await logoutUser(api, cookieHeader);
    expect(out.ok()).toBeTruthy();
    const sc = out.headers()["set-cookie"] as string;
    expect(sc).toBeTruthy();
    expect(sc.toLowerCase()).toMatch(/fc_session=.*(max-age=0|expires=)/i);

    // Access after logout is blocked
    const ideasAfter = await ideasForSession(api, cookieHeader);
    expect(ideasAfter.status()).toBe(401);

    // Logout without session should still return a blank cookie
    const out2 = await logoutUser(api);
    expect(out2.ok()).toBeTruthy();
    expect((out2.headers()["set-cookie"] as string).toLowerCase()).toContain("fc_session=");
  });

  test("4) Session persistence across navigations and reloads", async ({ browser }, testInfo) => {
    const api = await request.newContext({ baseURL: testInfo.project.use?.baseURL as string });
    const email = randomEmail("persist");
    const password = "LongerP4ss!";
    const reg = await registerUser(api, email, password);
    expect(reg.status()).toBe(201);

    const setCookieHeader = reg.headers()["set-cookie"] as string;

    const context = await browser.newContext({ baseURL: testInfo.project.use?.baseURL as string });
    await setBrowserCookieFromHeader(context, setCookieHeader);
    const page = await context.newPage();

    await page.goto("/profile");
    await expect(page.getByText("Your Ideas")).toBeVisible();
    // No ideas by default but page should load
    await expect(page.getByText("No ideas yet.")).toBeVisible();

    // Reload and verify still authenticated
    await page.reload();
    await expect(page.getByText("Your Ideas")).toBeVisible();

    // Protected API via the page's context should succeed
    const resp = await page.request.get("/api/me/ideas");
    expect(resp.status()).toBe(200);

    await context.close();
  });

  test("5) Google OAuth flow (mocked callback)", async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use?.baseURL as string;
    const api = await request.newContext({ baseURL });

    // Initiation should set state + code_verifier cookies and redirect to provider
    const init = await api.get("/api/auth/google", { maxRedirects: 0 });
    if (init.status() !== 302) {
      test.skip(true, "Google OAuth not configured; skipping mocked flow");
    }
    const initSetCookie = init.headers()["set-cookie"] as string;
    expect(initSetCookie).toContain("google_oauth_state=");
    expect(initSetCookie).toContain("google_code_verifier=");
    const location = init.headers()["location"] as string;
    expect(location).toBeTruthy();

    // Prepare a real authenticated cookie by email/password to reuse for callback success
    const email = randomEmail("googlemock");
    const password = "OAuthPass1!";
    const reg = await registerUser(api, email, password);
    expect(reg.status()).toBe(201);
    const realSessionSetCookie = reg.headers()["set-cookie"] as string;
    const realCookies = parseSetCookie(realSessionSetCookie);
    const realFc = realCookies["fc_session"].raw;

    // Now mock the callback endpoint to emulate provider success and app setting the session cookie
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    await page.route("**/api/auth/google/callback**", async (route) => {
      await route.fulfill({
        status: 302,
        headers: {
          location: "/profile",
          "set-cookie": realFc,
        },
      });
    });

    // Extract state to include in the callback URL
    const statePair = initSetCookie.split(", ").find((c) => c.startsWith("google_oauth_state="))!;
    const state = statePair.split("=")[1].split(";")[0];

    await page.goto(`/api/auth/google/callback?code=TEST_CODE&state=${state}`);
    await page.waitForURL(/\/profile$/);
    await expect(page.getByText("Your Ideas")).toBeVisible();

    // Verify the session really works against a protected API in this context
    const ideas = await page.request.get("/api/me/ideas");
    expect(ideas.status()).toBe(200);

    await context.close();
  });

  test("6) Protected route access control: API 401 when unauthenticated", async ({ page }) => {
    // Direct API access without cookies should be blocked
    const res = await page.request.get("/api/me/ideas");
    expect(res.status()).toBe(401);

    // UI route does not redirect but must not expose data
    await page.goto("/profile");
    await expect(page.getByText("Your Ideas")).toBeVisible();
    await expect(page.getByText("No ideas yet.")).toBeVisible();
  });

  test("7) Login page flows: form success/failure + cookie persistence", async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use?.baseURL as string;
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    // Go to login
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    const email = randomEmail("ui");
    const password = "UIpass!234";

    // Toggle to Sign Up and register via UI
    await page.getByRole("button", { name: /sign up/i }).click();
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: /sign up/i }).click();

    // Should redirect to profile
    await page.waitForURL(/\/profile$/);
    await expect(page.getByText("Your Ideas")).toBeVisible();

    // Cookie present in browser context
    const cookies = await context.cookies();
    const fc = cookies.find((c) => c.name === "fc_session");
    expect(fc).toBeTruthy();
    expect(fc!.value.length).toBeGreaterThan(5);

    // Logout via API and verify redirect on accessing protected API
    const out = await page.request.post("/api/auth/logout");
    expect(out.ok()).toBeTruthy();
    const after = await page.request.get("/api/me/ideas");
    expect(after.status()).toBe(401);

    await context.close();
  });
});

