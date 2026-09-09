import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("AGENT.md records the mandatory commit and validation workflow", async () => {
  const policy = await read("AGENT.md");

  assert.match(policy, /每次改动完成后[\s\S]*Git commit/);
  assert.match(policy, /每次改动后[\s\S]*编写或更新相关测试/);
  assert.match(policy, /全部通过/);
});

test("the runtime agent guide points to the same repository workflow", async () => {
  const guide = await read("AGENTS.md");

  assert.match(guide, /After every completed change[\s\S]*Git commit/);
  assert.match(guide, /After every change[\s\S]*add or update the relevant tests/);
});

test("local secrets and generated directories remain ignored", async () => {
  const ignore = await read(".gitignore");

  for (const requiredRule of [".env.*", "node_modules/", "dist/", "api-key.txt"]) {
    assert.ok(ignore.includes(requiredRule), `missing .gitignore rule: ${requiredRule}`);
  }
});

test("the frontend handoff guide documents secure Coze integration", async () => {
  const guide = await read("docs/frontend-coze-handoff.md");

  assert.match(guide, /src\/Prototype\.tsx/);
  assert.match(guide, /\/api\/workflow\/run/);
  assert.match(guide, /COZE_API_TOKEN/);
  assert.match(guide, /Token.*不得进入 `src\/`/);
  assert.match(guide, /workflow-response\.schema\.json/);
});
