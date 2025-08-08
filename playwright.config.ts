import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8788",
    trace: "on-first-retry",
  },
});


