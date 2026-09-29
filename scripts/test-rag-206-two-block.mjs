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
const markSharedObservations = table => table
  .replace('| 差异观察项 |', '| 观察项（差异或共同） |')
  .replace(/([^；|\n]+?)：本候选为“([^”]+)”，([^；|\n]+?)为“\2”/g,
    (_, label, value) => `共同点：${label.trim()}双方均为“${value}”，不能据此区分`)
  .replace(/\|\s*共同点：/g, '| 共同点：');

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
      const expected = j === 4 ? markSharedObservations(original) : original;
      assert.ok(target.includes(`### ${matches[j][1]}\n${expected}`), `${sceneId}: lost ${matches[j][1]}`);
    }
  }
}

assert.equal((output.match(/^### 检索标签$/gm) ?? []).length, 206);
assert.ok(!/本候选为“([^”]+)”，[^；\n]+为“\1”/.test(output), 'Shared observations must be labeled, not left as differential evidence');
const coreNotes = (output.match(/^### 临床判断边界$/gm) ?? []).length;
const diffNotes = (output.match(/^### 重点鉴别边界$/gm) ?? []).length;
assert.equal(coreNotes, diffNotes);
assert.ok(coreNotes >= 89);
for (let i = 0; i < blocks.length; i += 2) {
  const cid = blocks[i].match(/^- 候选ID：(C\d{3})$/m)?.[1];
  const diff = blocks[i + 1];
  if (cid === 'C042') assert.ok(diff.includes('Glaesserella parasuis'), 'C042 must be Glässer disease');
  if (cid === 'C043') assert.ok(diff.includes('猪链球菌'), 'C043 must be Streptococcus suis');
  if (cid === 'C044') {
    assert.ok(diff.includes('弓形虫检测'), 'C044 must be toxoplasmosis');
    assert.ok(!diff.includes('鼻腔或扁桃体检出'), 'C044 must not inherit Streptococcus advice');
  }
}
const missing = blocks.filter((block, index) => index % 2 === 0 && !block.includes('### 临床判断边界'));
const missingPathogen = missing.filter(block => /^- 类型：病原性疾病$/m.test(block)).length;
assert.equal(missingPathogen, 0, 'Every pathogen-coded scene needs a clinical boundary');
const mixedCore = blocks.find(block => block.startsWith('## P01.13 ') && block.includes('｜核心块'));
const mixedDiff = blocks.find(block => block.startsWith('## P01.13 ') && block.includes('｜鉴别块'));
assert.ok(mixedCore?.includes('不能预设为无接触传播'));
assert.ok(mixedDiff?.includes('不能把“混合感染”当成未经取证的兜底确诊'));
assert.ok(!mixedCore?.includes('传播速度：通常不按接触传播规律扩散'));
assert.ok(!mixedDiff?.includes('本候选为“通常不按接触传播规律扩散”'));
const coreFor = sceneId => blocks.find(block => block.includes(`- 场景ID：${sceneId}`) && block.includes('｜核心块'));
const diffFor = sceneId => blocks.find(block => block.includes(`- 场景ID：${sceneId}`) && block.includes('｜鉴别块'));
assert.ok(coreFor('P02_C004')?.includes('不能仅凭呕吐优先锁定本候选'));
assert.ok(coreFor('P06_C043')?.includes('不是原发性肺炎的典型首选解释'));
assert.ok(coreFor('P13_C010')?.includes('胎儿心肌病变'));
assert.ok(diffFor('P13_C010')?.includes('不能仅凭流产或死胎外观区分'));
assert.ok(diffFor('P13_C010')?.includes('排查常见繁殖病因并核查胎儿病变'));
assert.ok(!diffFor('P13_C010')?.includes('优先推荐 | 免疫预防'));
assert.ok(diffFor('P01_C010')?.includes('病毒在免疫相关细胞和组织中复制'));
assert.ok(diffFor('P01_C020')?.includes('共同点：'));
assert.ok(diffFor('P01_C020')?.includes('不能据此区分'));
for (const cid of ['C024', 'C025', 'C026', 'C100', 'C103']) {
  const pair = blocks.filter(block => block.includes(`- 候选ID：${cid}`));
  assert.ok(pair.length >= 2 && pair.every(block => block.includes('不是已经确认的具体疾病') || block.includes('不能把本方向直接当作病原级确诊')), `${cid} must remain a direction`);
}
console.log(`206 scenes, 412 identity-bearing blocks; every original section preserved; ${diffNotes} targeted boundaries; ${missingPathogen} pathogen scenes without an added boundary.`);
if (missingPathogen) {
  console.log(missing.filter(block => /^- 类型：病原性疾病$/m.test(block)).map(block => block.split('\n')[0]).join('\n'));
}
