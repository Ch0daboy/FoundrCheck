import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8788",
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        port: 8788,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});

