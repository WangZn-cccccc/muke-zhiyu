import { expect, test } from "@playwright/test";

const shell = (overrides: Record<string, unknown>) => ({
  contract_version: "1.0.0", success: true, response_type: "knowledge", response: "测试",
  conversation_id: "conv-test", case_data: {}, questions: [], diagnosis: null,
  solution_directions: [], selected_direction: null, management_advice: [], result_mode: null,
  recommended_products: [], emergency: null, service_end_reason: null, error: null,
  ...overrides,
});

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

test("the complete mobile chat flow keeps compact phone-specific density", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/workflow/run", async route => {
    const body = route.request().postDataJSON() as { user_input?: string };
    const input = body.user_input ?? "";
    const payload = input === "仔猪拉稀"
      ? shell({
          response_type: "question",
          questions: [{ id: "Q-age", question: "病猪目前处于什么生长阶段？", question_type: "single_choice", options: [{ value: "nursery", label: "保育阶段" }, { value: "other", label: "其他" }], allow_other: true, required: true }],
        })
      : input.includes("病猪目前处于什么生长阶段")
        ? shell({ response_type: "diagnosis", response: "结合目前信息，更符合仔猪腹泻相关表现。", case_data: { age: "约50日龄", stage: "保育猪" }, diagnosis: { display_title: "初步判断：更符合仔猪腹泻", warning: "请持续观察精神和饮水变化。" } })
        : input.includes("治疗方案和解决方向")
          ? shell({ response_type: "direction_selection", management_advice: ["加强饮水与环境卫生管理。"], solution_directions: [{ id: "DIR-0001", name: "补液与电解质支持", description: "支持水盐平衡恢复", mechanism: "补充水分与电解质", expected_improvement: "改善脱水风险" }] })
          : shell({ response_type: "product", result_mode: "product", response: "匹配到1项产品。", selected_direction: "DIR-0001", recommended_products: [{ product_id: "PROD-0001", product_name: "口服补液盐", manufacturer: "示例厂家", product_category: "补液产品", recommendation_reason: "与当前所选方向匹配", source_id: "PROD-0001" }] });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  });

  await page.goto("/");
  await page.locator(".composer textarea").fill("仔猪拉稀");
  await page.locator(".send-button").click();
  await expect(page.locator(".live-questions")).toBeVisible();
  await expect(page.locator(".live-questions>.question-block")).toHaveCSS("padding", "12px");
  await expect(page.locator(".question-block>strong")).toHaveCSS("font-size", "12px");

  await page.getByRole("button", { name: "保育阶段" }).click();
  await page.getByRole("button", { name: /完成并继续/ }).click();
  await expect(page.locator(".live-diagnosis")).toBeVisible();
  await expect(page.locator(".live-diagnosis>h2")).toHaveCSS("font-size", "16px");

  await page.getByRole("button", { name: /查看解决方向/ }).click();
  await expect(page.locator(".live-direction-list")).toBeVisible();
  await expect(page.locator(".live-direction-list>button")).toHaveCSS("padding", "11px 10px");

  await page.getByRole("button", { name: /补液与电解质支持/ }).click();
  await expect(page.locator(".live-product-card")).toBeVisible();
  await expect(page.locator(".live-product-card")).toHaveCSS("padding", "12px");
  await expect(page.locator(".product-card>div>strong")).toHaveCSS("font-size", "14px");
});
