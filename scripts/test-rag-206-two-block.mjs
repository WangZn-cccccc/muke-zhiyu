import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'knowledge/rag/新版RAG病理库_206场景版.md'), 'utf8').replace(/\r\n/g, '\n');
const output = readFileSync(resolve(root, 'knowledge/rag/新版RAG病理库_206场景版_核心鉴别双块_待验证.md'), 'utf8').replace(/\r\n/g, '\n');
const sceneHeads = [...source.matchAll(/^## (P\d{2}\.\d{2}) (.+)$/gm)];
const blocks = output.trim().split(/\n---\n/).map(block => block.trim());
assert.equal(sceneHeads.length, 206);
assert.equal(blocks.length, 412);
const sectionHeadings = ['基本信息', '检索标签', '典型表现', '关键观察项', '鉴别要点（含差异观察项）', '解决方向', '发病或形成原理'];

for (let i = 0; i < sceneHeads.length; i++) {
  const start = sceneHeads[i].index;
  const end = i + 1 < sceneHeads.length ? sceneHeads[i + 1].index : source.length;
  const scene = source.slice(start, end).split(/\n---\n/, 1)[0].trim();
  const core = blocks[i * 2];
  const diff = blocks[i * 2 + 1];
  const sceneId = scene.match(/^- 场景ID：(.+)$/m)?.[1];
  const cid = scene.match(/^- 候选ID：(C\d{3})$/m)?.[1];
  const name = scene.match(/^- 候选名称：(.+)$/m)?.[1];
  assert.ok(sceneId && cid && name, `Identity missing for ${sceneHeads[i][1]}`);
  assert.ok(core.startsWith(`${sceneHeads[i][0]}｜核心块`));
  assert.ok(diff.startsWith(`${sceneHeads[i][0]}｜鉴别块`));
  for (const block of [core, diff]) {
    assert.ok(block.includes(`- 场景ID：${sceneId}`));
    assert.ok(block.includes(`- 候选ID：${cid}`));
    assert.ok(block.includes(`- 候选名称：${name}`));
  }
  const matches = [...scene.matchAll(/^### (.+)$/gm)];
  assert.deepEqual(matches.map(match => match[1]), sectionHeadings, `Source structure changed for ${sceneId}`);
  for (let j = 0; j < matches.length; j++) {
    const sectionStart = matches[j].index + matches[j][0].length;
    const sectionEnd = j + 1 < matches.length ? matches[j + 1].index : scene.length;
    const original = scene.slice(sectionStart, sectionEnd).replace(/\n---\s*$/, '').trim();
    const target = j < 4 ? core : diff;
    if (j === 0) {
      for (const line of original.split('\n')) assert.ok(target.includes(line), `${sceneId}: lost ${line}`);
    } else {
      assert.ok(target.includes(`### ${matches[j][1]}\n${original}`), `${sceneId}: lost ${matches[j][1]}`);
    }
  }
}

assert.equal((output.match(/^### 检索标签$/gm) ?? []).length, 206);
assert.equal((output.match(/^### 重点鉴别边界$/gm) ?? []).length, 89);
console.log('206 scenes, 412 identity-bearing blocks; every original section preserved; 89 targeted boundaries.');
