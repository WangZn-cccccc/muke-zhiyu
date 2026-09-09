import { randomUUID } from 'node:crypto';
import { validateWorkflowResponse } from '../scripts/workflow-contract-validator.mjs';

const localOrigins = new Set([
  'http://127.0.0.1:4173', 'http://localhost:4173',
  'http://127.0.0.1:5173', 'http://localhost:5173',
]);

function sendJson(res, status, payload, origin = '') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (localOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function createWorkflowHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function workflowHandler(req, res) {
    const origin = req.headers?.origin || '';
    if (req.method === 'OPTIONS') {
      if (origin && !localOrigins.has(origin)) return sendJson(res, 403, { error: 'Origin not allowed' }, origin);
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.end();
    }

    if (req.method !== 'POST') return sendJson(res, 404, { error: 'Not found' }, origin);

    const cozeUrl = env.COZE_API_URL || '';
    const cozeToken = env.COZE_API_TOKEN || '';
    const timeoutMs = Number(env.COZE_TIMEOUT_MS || 60000);
    if (!cozeUrl || !cozeToken) return sendJson(res, 503, { error: 'Coze API is not configured' }, origin);

    try {
      const input = await readRequestBody(req);
      if (typeof input.user_input !== 'string' || !input.user_input.trim()) {
        return sendJson(res, 400, { error: 'user_input is required' }, origin);
      }

      const conversationId = input.conversation_id || `conv_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
      const requestId = input.request_id || `req_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
      const upstream = await fetchImpl(cozeUrl, {
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
      catch { return sendJson(res, 502, { error: 'Coze returned non-JSON content', request_id: requestId }, origin); }
      if (!upstream.ok) return sendJson(res, 502, { error: 'Coze request failed', upstream_status: upstream.status, request_id: requestId }, origin);

      const contractErrors = validateWorkflowResponse(payload);
      if (contractErrors.length) {
        process.stderr.write(`Workflow contract rejected request_id=${requestId} response_type=${String(payload?.response_type || '')} errors=${JSON.stringify(contractErrors)}\n`);
        return sendJson(res, 502, { error: 'Coze response violates workflow contract', request_id: requestId, contract_errors: contractErrors }, origin);
      }
      return sendJson(res, 200, payload, origin);
    } catch (error) {
      const timeout = error?.name === 'TimeoutError';
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown proxy error';
      process.stderr.write(`Proxy request failed: ${detail}\n`);
      return sendJson(res, timeout ? 504 : 500, { error: timeout ? 'Coze request timed out' : 'Workflow proxy failed' }, origin);
    }
  };
}

