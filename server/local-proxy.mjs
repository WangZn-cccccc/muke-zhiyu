import http from 'node:http';
import { createWorkflowHandler } from './workflow-proxy-handler.mjs';

const port = Number(process.env.LOCAL_PROXY_PORT || 3001);
const handler = createWorkflowHandler();
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, coze_configured: Boolean(process.env.COZE_API_URL && process.env.COZE_API_TOKEN) }));
  }
  if (req.url !== '/api/workflow/run') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }
  return handler(req, res);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Local proxy ready on http://127.0.0.1:${port}\n`);
  process.stdout.write(`Coze configuration: ${process.env.COZE_API_URL && process.env.COZE_API_TOKEN ? 'ready' : 'missing'}\n`);
});
