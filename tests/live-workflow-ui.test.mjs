import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/Prototype.tsx", import.meta.url), "utf8");

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
