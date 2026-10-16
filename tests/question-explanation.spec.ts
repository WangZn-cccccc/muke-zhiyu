import { expect, test } from "@playwright/test";

for (const scenario of [
  { name: "M13", question: "上料时是否咳得更厉害？", term: "上料是指添加饲料这个过程。", purpose: "问这个是为了判断咳嗽和采食、上料是否有关联，不能只靠这一项确定原因。" },
  { name: "M14", question: "粪便里是否有明显黏液？", term: "黏液是指像鼻涕一样的黏腻物质。", purpose: "问有没有黏液是为了结合粪便形态和颜色缩小判断范围，请如实回答。" },
]) {
  for (const mobile of [false, true]) test(`${scenario.name} explanation and drafts survive continued questions (${mobile ? "mobile" : "desktop"})`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    const requests: any[] = [];
    const questions = [
      { id: "Q-observation", question: scenario.question, question_type: "open", options: [], required: true, allow_other: false },
      { id: "Q-other", question: "还有其他表现吗？", question_type: "single_choice", options: [{ value: "other", label: "其他" }], required: true, allow_other: true },
    ];
    const base = { success: true, response_type: "question", conversation_id: "conv-explanation", follow_up_round: 1,
      case_data: { raw_text: ["原始病例"] }, questions, pending_question_ids: questions.map(q => q.id),
      question_answers: { "Q-observation": { status: "pending" }, "Q-other": { status: "pending" } } };
    await page.route("**/api/workflow/run", async route => {
      const body = route.request().postDataJSON();
      requests.push(body);
      const index = body.user_input === "原始病例" ? 1 : body.user_input === "这个词是什么意思？" ? 2 : body.user_input === "为什么要问这个？" ? 3 : 4;
      const response = index === 1 ? questions.map(q => q.question).join("\n\n") : index === 2 ? scenario.term : scenario.purpose;
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(index < 4 ? { ...base, response } : {
        ...base, response_type: "knowledge", response: "补答已接收", questions: [], pending_question_ids: [],
      }) });
    });
    const send = async (text: string) => {
      await page.locator(".composer textarea").fill(text);
      await page.locator(".send-button").click();
    };
    await page.goto("/");
    await send("原始病例");
    await expect(page.locator(".question-block")).toHaveCount(2);
    await expect(page.locator(".question-explanation")).toHaveCount(0);
    await page.locator(".question-block").first().locator("input").fill("没有完整观察记录");
    await page.locator(".question-block").nth(1).getByRole("button", { name: "其他", exact: true }).click();
    await page.locator(".other-input input").fill("精神稍差");
    await send("这个词是什么意思？");
    await expect(page.locator(".question-explanation")).toHaveText(scenario.term);
    await expect(page.locator(".question-block").first().locator("input")).toHaveValue("没有完整观察记录");
    await expect(page.locator(".other-input input")).toHaveValue("精神稍差");
    await send("为什么要问这个？");
    await expect(page.locator(".question-explanation")).toHaveText(scenario.purpose);
    await expect(page.locator(".past-assistant-message", { hasText: scenario.term })).toHaveCount(1);
    await expect(page.locator(".question-block").first().locator("input")).toHaveValue("没有完整观察记录");
    await expect(page.locator(".other-input input")).toHaveValue("精神稍差");
    await page.getByRole("button", { name: /完成并继续/ }).click();
    await expect(page.getByText("补答已接收", { exact: true })).toBeVisible();
    await expect(page.locator(".past-assistant-message", { hasText: scenario.term })).toHaveCount(1);
    await expect(page.locator(".past-assistant-message", { hasText: scenario.purpose })).toHaveCount(1);
    const continuations = requests.filter(body => body.user_input !== "原始病例");
    expect(continuations).toHaveLength(3);
    for (const body of continuations) {
      expect(body.conversation_id).toBe("conv-explanation");
      const context = JSON.parse(body.conversation_context);
      expect(context.follow_up_round).toBe(1);
      expect(context.case_data).toEqual(base.case_data);
    }
    const answerContext = JSON.parse(continuations[2].conversation_context);
    expect(answerContext.question_answers["Q-observation"].value).toBe("没有完整观察记录");
    expect(answerContext.question_answers["Q-other"].other_text).toBe("精神稍差");
  });
}
