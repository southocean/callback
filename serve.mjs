// Static server for local review. Not part of the deployed site — GitHub Pages
// serves docs/ directly.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const port = Number(process.env.PORT ?? 4173);

createServer(async (req, res) => {
  let url = (req.url ?? '/').split('?')[0];
  if (url === '/') url = '/index.html';
  // Keep the server inside docs/ even if the request tries to climb out.
  const path = join('docs', normalize(url).replace(/^(\.\.[/\\])+/, ''));
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
