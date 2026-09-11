import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkflowHandler } from './workflow-proxy-handler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'dist', 'client');
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';
const workflowHandler = createWorkflowHandler();
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

async function sendFile(res, filePath) {
  const contents = await readFile(filePath);
  res.writeHead(200, {
    'Content-Type': mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
    'Cache-Control': path.basename(filePath) === 'index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  res.end(contents);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, coze_configured: Boolean(process.env.COZE_API_URL && process.env.COZE_API_TOKEN) }));
  }
  if (req.url?.split('?')[0] === '/api/workflow/run') return workflowHandler(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST, OPTIONS' });
    return res.end();
  }

  const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  const requested = path.resolve(publicDir, `.${pathname}`);
  const safeRequested = requested.startsWith(`${publicDir}${path.sep}`) ? requested : path.join(publicDir, 'index.html');
  try {
    const info = await stat(safeRequested);
    return sendFile(res, info.isDirectory() ? path.join(safeRequested, 'index.html') : safeRequested);
  } catch {
    return sendFile(res, path.join(publicDir, 'index.html'));
  }
});

server.listen(port, host, () => {
  process.stdout.write(`牧客智语服务已监听 http://${host}:${port}\n`);
});
