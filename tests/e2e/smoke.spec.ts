import { test, expect } from "@playwright/test";

test("home and leaderboard render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("FoundrCheck")).toBeVisible();
  await page.goto("/leaderboard");
  await expect(page.getByText("Leaderboard")).toBeVisible();
});


