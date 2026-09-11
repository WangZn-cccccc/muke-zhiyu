import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createWorkflowHandler } from '../server/workflow-proxy-handler.mjs';

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
  assert.equal(config.functions['api/**/*.mjs'].maxDuration, 60);
});

test('production frontend defaults to the same-origin API', async () => {
  const source = await read('src/workflow-api.ts');
  assert.match(source, /VITE_LOCAL_PROXY_URL \|\| ''/);
  assert.match(source, /\/api\/workflow\/run/);
  assert.doesNotMatch(source, /\|\| 'http:\/\/127\.0\.0\.1:3001'/);
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
