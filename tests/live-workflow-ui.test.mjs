import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/Prototype.tsx", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../src/workflow-api.ts", import.meta.url), "utf8");
const proxySource = await readFile(new URL("../server/workflow-proxy-handler.mjs", import.meta.url), "utf8");
const runtimeSource = await readFile(new URL("../src/mobile/MobileRuntime.tsx", import.meta.url), "utf8");
const globalStyles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const prototypeStyles = await readFile(new URL("../src/prototype.css", import.meta.url), "utf8");
const entryHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("diagnosis exposes the real direction transition", () => {
  assert.match(source, /请根据当前诊断结果，给我治疗方案和解决方向/);
  assert.match(source, /<DiagnosisContent result=\{result\} onDirections=\{requestDirections\}/);
});

test("direction selection sends the stable direction id", () => {
  assert.match(source, /execute\(direction\.id, JSON\.stringify\(context\), "products"\)/);
  assert.match(source, /const context = structuredClone\(result\)/);
  assert.doesNotMatch(source, /selected_direction: direction\.id/);
});

test("product and no-match results reuse backend management advice without duplicate copy", () => {
  assert.match(source, /function getAdditionalManagementAdvice/);
  assert.equal(source.match(/<ManagementAdviceBlock result=\{result\}\/?>/g)?.length, 2);
  assert.match(source, /responseText\.includes\(comparable\)/);
  assert.match(source, /if \(advice\.length === 0\) return null/);
});

test("product language is informational rather than a confirmed-use recommendation", () => {
  assert.match(source, /相关产品供了解/);
  assert.match(source, /不代表已确认适用于当前情况/);
  assert.doesNotMatch(source, /适合当前方向的产品/);
  assert.doesNotMatch(source, /index === 0 \? "首选"/);
});

test("workflow keeps the conversation id returned by Coze", () => {
  assert.match(source, /conversationId\.current = next\.conversation_id/);
});

test("service-end copy is split into readable sections with a compact disclaimer", () => {
  assert.match(source, /function StructuredServiceEndResponse/);
  assert.match(source, /保留候选方向/);
  assert.match(source, /当前判断与下一步建议/);
  assert.match(source, /可能的原因/);
  assert.match(source, /下一步建议/);
  assert.match(source, /service-end-disclaimer/);
  assert.match(source, /<StructuredServiceEndResponse text=\{result\.response\}\/>/);
});

test("live results render every terminal branch and verified channels", () => {
  for (const responseType of ["product", "management", "no_match", "emergency", "service_end", "error"]) {
    assert.ok(source.includes(`result.response_type === "${responseType}"`), `missing UI for ${responseType}`);
  }
  assert.match(source, /isSafeHttpUrl\(product\.official_website\)/);
  assert.match(source, /rel="noopener noreferrer"/);
});

test("home exposes only the real workflow entry", () => {
  assert.doesNotMatch(source, /体验完整问诊 Demo/);
  assert.doesNotMatch(source, /className="demo-entry"/);
});

test("launch version opens directly without account or history surfaces", () => {
  assert.match(source, /useState<Screen>\("home"\)/);
  assert.doesNotMatch(source, /screen === "login"/);
  assert.doesNotMatch(source, /className="history-drawer/);
  assert.doesNotMatch(source, /screen === "settings"/);
  assert.match(source, /aria-label="新建对话"/);
});

test("direction cards avoid duplicate internal copy", () => {
  assert.doesNotMatch(source, /\{item\.target_problem &&/);
  assert.match(source, /选择一个方向，继续查看对应的改善方式。/);
  assert.doesNotMatch(source, /<p>\{result\.response \|\| "选择一个方向/);
});

test("recommendation results can return to the preserved direction list", () => {
  assert.match(source, /setDirectionResult\(structuredClone\(next\)\)/);
  assert.match(source, /setResult\(structuredClone\(directionResult\)\)/);
  assert.equal(source.match(/onClick=\{returnToDirections\}/g)?.length, 4);
});

test("direction navigation preserves latest request state and invalid selection can recover", () => {
  assert.match(source, /latestContext\.current = structuredClone\(next\)/);
  assert.match(source, /structuredClone\(latestContext\.current \|\| result\)/);
  assert.match(source, /next\.error\?\.code !== "INVALID_REQUEST"/);
  assert.match(source, /返回解决方向重新选择/);
});

test("unanswered optional questions remain pending instead of being marked answered", () => {
  assert.match(source, /questions\.flatMap/);
  assert.match(source, /if \(!answer\?\.value/);
  assert.match(source, /context\.pending_question_ids\.push\(q\.id\)/);
});

test("duplicate direction content is removed before rendering", () => {
  assert.match(source, /function deduplicateDirections/);
  assert.match(source, /direction\.name, direction\.mechanism, direction\.expected_improvement/);
  assert.match(source, /const uniqueDirections = deduplicateDirections\(directions\)/);
  assert.match(source, /uniqueDirections\.map/);
});

test("contract failures expose actionable details without repeating stale questions", () => {
  assert.match(apiSource, /contract_errors/);
  assert.match(apiSource, /WorkflowClientError/);
  assert.match(proxySource, /Workflow contract rejected request_id=/);
  assert.match(source, /setResult\(null\)/);
  assert.match(source, /问题编号：\{error\.requestId\}/);
  assert.match(source, /error\.details\.slice\(0, 3\)/);
});

test("production uses a responsive web shell while device chrome stays preview-only", () => {
  assert.match(runtimeSource, /import\.meta\.env\.DEV/);
  assert.match(runtimeSource, /devicePreview/);
  assert.match(runtimeSource, /className="responsive-runtime"/);
  assert.match(runtimeSource, /KeyboardProvider simulated=\{false\}/);
  assert.match(globalStyles, /\.responsive-app-frame/);
  assert.match(prototypeStyles, /@media\(min-width:768px\)/);
  assert.match(prototypeStyles, /@media\(max-width:767px\)/);
});

test("public page uses the product name instead of prototype metadata", () => {
  assert.match(entryHtml, /<title>牧客智语<\/title>/);
  assert.match(entryHtml, /name="description" content="牧客智语/);
  assert.doesNotMatch(entryHtml, /Mobile Prototype Boilerplate/);
});

test("assistant message headers use the pig identity and keep completion icon inside status", () => {
  assert.match(source, /assistant-identity-avatar"><AssistantAvatar \/>/);
  assert.match(source, /!loading && <CheckCircledIcon \/>/);
  assert.doesNotMatch(source, /assistant-mark"><CheckCircledIcon/);
  assert.doesNotMatch(source, /"真实分析结果"/);
});

test("confirmed case summary hides workflow state sentinels", () => {
  for (const state of ["unavailable", "not_provided", "unknown", "unclear", "pending", "invalid"]) {
    assert.ok(source.includes(`"${state}"`), `missing filtered state: ${state}`);
  }
  assert.match(source, /const affected = getDisplayCaseValue\(morbidity\.affected_count\)/);
  assert.match(source, /const deathCount = getDisplayCaseValue\(mortality\.death_count\)/);
  assert.match(source, /\.filter\(item => item\.value\)/);
});

test("loading UI is lightweight for unknown intent and specific for known workflow stages", () => {
  assert.match(source, /"understanding" \| "followup" \| "directions" \| "products"/);
  assert.match(source, /正在理解你的问题/);
  assert.match(source, /正在整理补充信息/);
  assert.match(source, /loadingMode === "understanding" \? <span className="typing-dots"/);
  assert.match(source, /\{loading && <AssistantState loading \/>\}/);
  assert.doesNotMatch(source, /<AssistantState loading=\{loading\} \/>/);
});

test("selecting a direction does not replay the raw response in a white history card", () => {
  assert.match(source, /kind: "message", assistant: "", user: `我选择：\$\{direction\.name\}`/);
  assert.doesNotMatch(source, /kind: "message", assistant: result\.response, user: `我选择：/);
  assert.match(source, /turn\.assistant && <div className="past-assistant-message">/);
});
