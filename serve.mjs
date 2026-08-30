// Static server for local review. Not part of the deployed site — GitHub Pages
// serves docs/ directly.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
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

/**
 * RANGE REQUESTS, because without them a <video> cannot seek.
 *
 * This cost a QA session. The media player's skip-10s buttons and arrow-key
 * seeking all appeared broken locally: every seek snapped back to zero. The
 * player was fine. The server was answering Range with a plain 200 and
 * Transfer-Encoding: chunked, so Chrome had no Content-Length, could not ask for
 * a byte offset, and reported `video.seekable.end(0) === 0` — an unseekable
 * stream, with duration and readyState 4 both looking perfectly healthy.
 *
 * GitHub Pages serves ranges, so production was never affected. That is exactly
 * what makes it worth fixing: a dev server that cannot do what production does
 * turns every local media check into a false negative, and the next person to
 * measure a seek would have chased the same ghost.
 */
const sendRange = async (req, res, path, size, type) => {
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (!m) return false;

  // A suffix range ("bytes=-500") asks for the LAST n bytes.
  const suffix = m[1] === '';
  let start = suffix ? size - Number(m[2]) : Number(m[1]);
  let end = suffix || m[2] === '' ? size - 1 : Number(m[2]);
  start = Math.max(0, start);
  end = Math.min(size - 1, end);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    res.writeHead(416, { 'content-range': `bytes */${size}` });
    res.end();
    return true;
  }

  res.writeHead(206, {
    'cache-control': 'no-store',
    'content-type': type,
    'content-length': end - start + 1,
    'content-range': `bytes ${start}-${end}/${size}`,
    'accept-ranges': 'bytes',
  });
  createReadStream(path, { start, end }).pipe(res);
  return true;
};

createServer(async (req, res) => {
  let url = (req.url ?? '/').split('?')[0];
  if (url === '/') url = '/index.html';
  // Keep the server inside docs/ even if the request tries to climb out.
  const path = join('docs', normalize(url).replace(/^(\.\.[/\\])+/, ''));
  const type = TYPES[extname(path)] ?? 'application/octet-stream';
  try {
    const info = await stat(path);
    if (await sendRange(req, res, path, info.size, type)) return;
    // Content-Length and accept-ranges on the plain response too: it is what
    // tells the browser a range request is worth making at all.
    const body = await readFile(path);
    res.writeHead(200, {
      'content-type': type,
      'content-length': info.size,
      'accept-ranges': 'bytes',
      /*
       * NEVER CACHE, and this is a bug fix rather than a precaution.
       *
       * app.js, boot.js, styles.css and index.html all have STABLE names, and
       * only the chunks are content hashed. A browser holding a cached app.js
       * therefore keeps importing the chunk hashes that app.js was built with --
       * and build.mjs deletes every old chunk on the way in, so those URLs are
       * gone. The result is not a stale page, it is a BROKEN one: the imports
       * 404 and the screen either stops updating or stops working, which looks
       * exactly like the last change having been lost.
       *
       * Nam hit this and read it as the rebuild destroying his work. Nothing was
       * ever lost; the browser was simply running the previous build against the
       * current build's chunk names.
       *
       * No-store rather than no-cache: no-cache still stores and revalidates,
       * and there is nothing to revalidate against here because the server sends
       * no validators.
       */
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
