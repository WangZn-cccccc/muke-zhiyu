import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createWorkflowHandler, normalizeWorkflowPayload } from '../server/workflow-proxy-handler.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function responseRecorder() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body = '') { this.body = body; },
  };
}

test('Vercel deployment serves the API before the SPA fallback', async () => {
  const config = JSON.parse(await read('vercel.json'));
  assert.equal(config.outputDirectory, 'dist/client');
  assert.deepEqual(config.routes[0], { handle: 'filesystem' });
  assert.equal(config.functions['api/**/*.mjs'].maxDuration, 120);
});

test('production frontend defaults to the same-origin API', async () => {
  const source = await read('src/workflow-api.ts');
  assert.match(source, /VITE_LOCAL_PROXY_URL \|\| ''/);
  assert.match(source, /\/api\/workflow\/run/);
  assert.doesNotMatch(source, /\|\| 'http:\/\/127\.0\.0\.1:3001'/);
});

test('proxy timeout defaults to 110 seconds and stays below the platform deadline', async t => {
  const durations = [];
  t.mock.method(AbortSignal, 'timeout', ms => {
    durations.push(ms);
    return new AbortController().signal;
  });
  for (const override of [undefined, '60000', '90000', '180000', 'invalid', '-1']) {
    const env = { COZE_API_URL: 'https://example.test/run', COZE_API_TOKEN: 'secret' };
    if (override !== undefined) env.COZE_TIMEOUT_MS = override;
    const handler = createWorkflowHandler({
      env,
      fetchImpl: async () => ({ ok: false, status: 503, text: async () => '{}' }),
    });
    await handler({ method: 'POST', headers: {}, body: { user_input: '追问回答' } }, responseRecorder());
  }
  assert.deepEqual(durations, [110000, 110000, 90000, 110000, 110000, 110000]);
  const config = JSON.parse(await read('vercel.json'));
  assert.ok(Math.max(...durations) <= config.functions['api/**/*.mjs'].maxDuration * 1000 - 10000);
});

test('upstream timeout returns a JSON 504 rather than a platform error page', async () => {
  const handler = createWorkflowHandler({
    env: { COZE_API_URL: 'https://example.test/run', COZE_API_TOKEN: 'secret' },
    fetchImpl: async () => { throw new DOMException('Timed out', 'TimeoutError'); },
  });
  const res = responseRecorder();
  await handler({ method: 'POST', headers: {}, body: { user_input: '追问回答' } }, res);
  assert.equal(res.statusCode, 504);
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  assert.deepEqual(JSON.parse(res.body), { error: 'Coze request timed out' });
});

test('portable production server serves the SPA and workflow API on the platform port', async () => {
  const packageJson = JSON.parse(await read('package.json'));
  const server = await read('server/app-server.mjs');

  assert.match(packageJson.scripts.start, /server\/app-server\.mjs/);
  assert.match(server, /process\.env\.PORT/);
  assert.match(server, /'0\.0\.0\.0'/);
  assert.match(server, /\/api\/workflow\/run/);
  assert.match(server, /dist', 'client/);
});

test('cloud handler rejects missing configuration without exposing secrets', async () => {
  const handler = createWorkflowHandler({ env: {}, fetchImpl: async () => { throw new Error('must not call upstream'); } });
  const req = { method: 'POST', headers: {}, body: { user_input: '仔猪拉稀' } };
  const res = responseRecorder();
  await handler(req, res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(JSON.parse(res.body), { error: 'Coze API is not configured' });
});

test('cloud handler validates required user input before calling Coze', async () => {
  const handler = createWorkflowHandler({
    env: { COZE_API_URL: 'https://example.test/run', COZE_API_TOKEN: 'secret' },
    fetchImpl: async () => { throw new Error('must not call upstream'); },
  });
  const req = { method: 'POST', headers: {}, body: { user_input: '   ' } };
  const res = responseRecorder();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body), { error: 'user_input is required' });
});

test('proxy accepts Coze management advice as an empty or populated string without generating content', () => {
  assert.deepEqual(normalizeWorkflowPayload({ management_advice: ' 加强饮水管理。 ' }).management_advice, ['加强饮水管理。']);
  assert.deepEqual(normalizeWorkflowPayload({ management_advice: '  ' }).management_advice, []);
  assert.deepEqual(normalizeWorkflowPayload({ management_advice: [' 建议一 ', '', '建议二'] }).management_advice, ['建议一', '建议二']);
});
