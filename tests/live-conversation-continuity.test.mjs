import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceUrl = new URL("../src/Prototype.tsx", import.meta.url);

test("底部自由输入继续当前工作流而不是重新挂载问诊组件", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /liveWorkflowRef\.current\?\.submitText\(value\)/);
  assert.match(source, /execute\(value, JSON\.stringify\(context\), "analysis"\)/);
  assert.doesNotMatch(source, /<LiveWorkflowPanel\s+key=\{selectedHistory\}/);
});

test("自由输入复用会话编号并携带上一轮完整上下文", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /const context = structuredClone\(result\)/);
  assert.match(source, /conversation_id: conversationId\.current/);
  assert.match(source, /conversation_context: context/);
});

test("自由输入历史显示真实追问且不渲染空白 AI 消息框", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /questions\.map\(question => question\.question\)/);
  assert.match(source, /turn\.assistant && <div className="past-assistant-message">/);
  assert.doesNotMatch(source, /assistant: result\.response_type === "question" \? ""/);
});

test("接口合同要求待答状态下的自然语言绕过新会话意图识别", async () => {
  const contract = await readFile(new URL("../contracts/workflow-api-contract.md", import.meta.url), "utf8");
  assert.match(contract, /pending_question_ids.*非空/);
  assert.match(contract, /不得先按一条全新咨询重新执行全局意图识别/);
});
