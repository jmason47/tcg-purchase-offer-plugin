import { expect, test } from "@playwright/test";

test("renders the standalone offer form", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sell your Pokémon cards" })).toBeVisible();
  await expect(page.getByLabel("Card name")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected cards" })).toBeVisible();
});
