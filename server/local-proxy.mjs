import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { validateWorkflowResponse } from '../scripts/workflow-contract-validator.mjs';

const port = Number(process.env.LOCAL_PROXY_PORT || 3001);
const cozeUrl = process.env.COZE_API_URL || '';
const cozeToken = process.env.COZE_API_TOKEN || '';
const timeoutMs = Number(process.env.COZE_TIMEOUT_MS || 60000);
const allowedOrigins = new Set([
  'http://127.0.0.1:4173', 'http://localhost:4173',
  'http://127.0.0.1:5173', 'http://localhost:5173',
]);

function json(res, status, payload, origin = '') {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') {
    if (!allowedOrigins.has(origin)) return json(res, 403, { error: 'Origin not allowed' }, origin);
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    });
    return res.end();
  }
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, coze_configured: Boolean(cozeUrl && cozeToken) }, origin);
  }
  if (req.method !== 'POST' || req.url !== '/api/workflow/run') return json(res, 404, { error: 'Not found' }, origin);
  if (!cozeUrl || !cozeToken) return json(res, 503, { error: 'Coze API is not configured' }, origin);

  try {
    const input = await readBody(req);
    if (typeof input.user_input !== 'string' || !input.user_input.trim()) return json(res, 400, { error: 'user_input is required' }, origin);
    const conversationId = input.conversation_id || `conv_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const requestId = `req_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const upstream = await fetch(cozeUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${cozeToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_input: input.user_input,
        conversation_context: input.conversation_context || '',
        conversation_id: conversationId,
        request_id: requestId,
      }),
    });
    const raw = await upstream.text();
    let payload;
    try { payload = JSON.parse(raw); }
    catch { return json(res, 502, { error: 'Coze returned non-JSON content', request_id: requestId }, origin); }
    if (!upstream.ok) return json(res, 502, { error: 'Coze request failed', upstream_status: upstream.status, request_id: requestId }, origin);

    const contractErrors = validateWorkflowResponse(payload);
    if (contractErrors.length) {
      return json(res, 502, { error: 'Coze response violates workflow contract', request_id: requestId, contract_errors: contractErrors }, origin);
    }
    return json(res, 200, payload, origin);
  } catch (error) {
    const timeout = error?.name === 'TimeoutError';
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown proxy error';
    process.stderr.write(`Proxy request failed: ${detail}\n`);
    return json(res, timeout ? 504 : 500, { error: timeout ? 'Coze request timed out' : 'Local proxy failed', detail }, origin);
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Local proxy ready on http://127.0.0.1:${port}\n`);
  process.stdout.write(`Coze configuration: ${cozeUrl && cozeToken ? 'ready' : 'missing'}\n`);
});
