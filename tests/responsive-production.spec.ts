import { expect, test } from "@playwright/test";

test("desktop opens as a centered web workspace without device chrome", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  await expect(page.getByTestId("responsive-runtime")).toBeVisible();
  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.getByTestId("device-picker")).toHaveCount(0);

  const frame = page.locator(".responsive-app-frame");
  const box = await frame.boundingBox();
  expect(box?.width).toBe(840);
  expect(box?.x).toBe(300);
});

test("phone opens the same app full-screen without a simulated handset", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByTestId("responsive-runtime")).toBeVisible();
  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  const frame = page.locator(".responsive-app-frame");
  const box = await frame.boundingBox();
  expect(box?.width).toBe(390);
  expect(box?.height).toBe(844);

  await expect(page.locator(".welcome h1")).toHaveCSS("font-size", "21px");
  await expect(page.locator(".avatar-ring")).toHaveCSS("width", "72px");
  await expect(page.locator(".prompt-row").first()).toHaveCSS("min-height", "54px");
});
