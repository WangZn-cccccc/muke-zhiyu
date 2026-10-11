import { expect, test } from "@playwright/test";

const shell = (extra: Record<string, unknown>) => ({
  contract_version: "1.0.0", success: true, response_type: "knowledge", response: "测试",
  conversation_id: "conv-handoff", case_data: {}, questions: [], diagnosis: null,
  pending_question_ids: [], question_answers: {}, solution_directions: [],
  selected_direction: null, management_advice: [], recommended_products: [], error: null,
  ...extra,
});

test("returning to directions and recovering an invalid selection keep latest context", async ({ page }) => {
  const requests: any[] = [];
  const dirs = [{ id: "P03_C016_D14", name: "方向甲" }, { id: "P03_C016_D06", name: "方向乙" }];
  await page.route("**/api/workflow/run", async route => {
    const body = route.request().postDataJSON(); requests.push(body);
    const payload = body.user_input === "测试病例"
      ? shell({ response_type: "direction_selection", solution_directions: dirs, case_data: { age: "旧资料" } })
      : body.user_input === "99"
        ? shell({ success: false, response_type: "error", response: "无效选择", error: { code: "INVALID_REQUEST", retryable: false } })
        : shell({ response_type: "product", response: "相关产品", solution_directions: dirs,
            case_data: { age: "最新资料" }, selected_direction: body.user_input,
            management_advice: ["保持清洁"], recommended_products: [{ product_id: body.user_input,
              product_name: body.user_input === dirs[0].id ? "产品甲" : "产品乙", recommendation_reason: "相关" }] });
    await route.fulfill({ json: payload });
  });
  await page.goto("/");
  await page.locator(".composer textarea").fill("测试病例");
  await page.locator(".send-button").click();
  await page.getByRole("button", { name: /方向甲/ }).click();
  await expect(page.locator(".live-products")).toContainText("产品甲");
  await expect(page.locator(".live-products")).toContainText("保持清洁");
  await page.getByRole("button", { name: "‹ 返回解决方向" }).click();
  await page.getByRole("button", { name: /方向乙/ }).click();
  await expect(page.locator(".live-products")).toContainText("产品乙");
  await expect(page.locator(".live-products")).not.toContainText("产品甲");
  expect(JSON.parse(requests.at(-1).conversation_context).case_data.age).toBe("最新资料");
  await page.locator(".composer textarea").fill("99");
  await page.locator(".send-button").click();
  await page.getByRole("button", { name: "返回解决方向重新选择" }).click();
  await page.getByRole("button", { name: /方向甲/ }).click();
  await expect(page.locator(".live-products")).toContainText("产品甲");
  expect(JSON.parse(requests.at(-1).conversation_context).selected_direction).toBe(dirs[1].id);
});

test("optional unanswered questions do not crash or acquire invented answers", async ({ page }) => {
  const requests: any[] = [];
  await page.route("**/api/workflow/run", async route => {
    const body = route.request().postDataJSON(); requests.push(body);
    await route.fulfill({ json: body.user_input === "测试病例" ? shell({ response_type: "question",
      pending_question_ids: ["q1", "q2"], question_answers: { q1: { status: "pending" }, q2: { status: "pending" } },
      questions: [{ id: "q1", question: "日龄？", question_type: "open", required: true, options: [] },
        { id: "q2", question: "体温？", question_type: "open", required: false, options: [] }] }) : shell({ response: "已收到" }) });
  });
  await page.goto("/");
  await page.locator(".composer textarea").fill("测试病例");
  await page.locator(".send-button").click();
  await page.locator(".live-questions").getByRole("textbox").first().fill("50日龄");
  await page.getByRole("button", { name: /完成并继续/ }).click();
  await expect(page.locator(".live-terminal")).toContainText("已收到");
  const ctx = JSON.parse(requests.find(body => body.user_input !== "测试病例").conversation_context);
  expect(ctx.pending_question_ids).toEqual(["q2"]);
  expect(ctx.question_answers.q2.status).toBe("pending");
});
