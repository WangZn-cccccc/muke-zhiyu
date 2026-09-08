import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/Prototype.tsx", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../src/workflow-api.ts", import.meta.url), "utf8");
const proxySource = await readFile(new URL("../server/local-proxy.mjs", import.meta.url), "utf8");

test("diagnosis exposes the real direction transition", () => {
  assert.match(source, /请根据当前诊断结果，给我治疗方案和解决方向/);
  assert.match(source, /<DiagnosisContent result=\{result\} onDirections=\{requestDirections\}/);
});

test("direction selection sends the stable direction id", () => {
  assert.match(source, /selected_direction: direction\.id/);
  assert.match(source, /execute\(direction\.id, JSON\.stringify\(context\), "products"\)/);
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

test("direction cards avoid duplicate internal copy", () => {
  assert.doesNotMatch(source, /\{item\.target_problem &&/);
  assert.match(source, /选择一个方向，继续查看对应的改善方式。/);
  assert.doesNotMatch(source, /<p>\{result\.response \|\| "选择一个方向/);
});

test("recommendation results can return to the preserved direction list", () => {
  assert.match(source, /setDirectionResult\(structuredClone\(next\)\)/);
  assert.match(source, /setResult\(structuredClone\(directionResult\)\)/);
  assert.equal(source.match(/onClick=\{returnToDirections\}/g)?.length, 3);
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
