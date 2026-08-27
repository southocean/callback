// Print the CV to docs/NamNguyen_CV_2026.pdf.
//
// Nam: "make sure its updated in my pdf CV too, so we dont just update this and
// then they download the pdf CV and its something else completely different!"
//
// He was right to worry. The committed PDF was from 21 August and the CV had
// moved several times since — the attachment and the page had genuinely become
// two different documents, which is the one drift on this whole site that costs
// something real, because the PDF is what gets forwarded.
//
// The reason it drifted is that regenerating it was a manual chore nobody had
// written down. So it is a command now:
//
//   node tools/print-cv.mjs
//
// WHAT IT PRINTS. The plain document at #plain, through the site's own print
// stylesheet — the same one you get from Ctrl+P, including `@page { margin:
// 14mm }` and the rules that drop the close button and the footer. Not a
// re-implementation of the CV for paper: a print of the page, so the two cannot
// say different things.
//
// HOW. Headless Chrome over the DevTools protocol. Node ships a WebSocket
// client and Chrome speaks CDP, so this needs no dependency — which matters in
// a repo whose entire claim is that it has none. Puppeteer for one page would
// be twenty megabytes to avoid forty lines.

import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';

const OUT = 'docs/NamNguyen_CV_2026.pdf';
const PORT = 4199;
/*
 * ABSOLUTE. Chrome resolves --user-data-dir itself and exits 21 without a word
 * when it cannot use the path it was handed; a relative one fails that way on
 * Windows, silently, and the only symptom is a debugging port that never opens.
 */
const PROFILE = resolve('.tmp/print-profile');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => existsSync(p));

if (!CHROME) {
  console.error('print-cv: no Chrome found. Install it, or add its path to CHROME in this file.');
  process.exit(1);
}

/* --- serve docs/, the same way serve.mjs does --------------------------- */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  const rel = url === '/' ? 'index.html' : url;
  const path = join('docs', normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((ok) => server.listen(PORT, ok));

/* --- drive Chrome ------------------------------------------------------- */

mkdirSync(PROFILE, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--remote-debugging-port=9333',
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let version = null;
for (let i = 0; i < 40; i += 1) {
  try {
    version = await (await fetch('http://127.0.0.1:9333/json/version')).json();
    break;
  } catch { await sleep(250); }
}
if (!version) {
  console.error('print-cv: Chrome did not open a debugging port.');
  chrome.kill();
  server.close();
  process.exit(1);
}

const target = await (await fetch(
  `http://127.0.0.1:9333/json/new?${encodeURIComponent(`http://localhost:${PORT}/#plain`)}`,
  { method: 'PUT' },
)).json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((ok, no) => {
  const msg = { id: ++id, method, params };
  pending.set(msg.id, { ok, no });
  ws.send(JSON.stringify(msg));
});
await new Promise((ok) => { ws.onopen = ok; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  const p = pending.get(m.id);
  if (!p) return;
  pending.delete(m.id);
  if (m.error) p.no(new Error(m.error.message));
  else p.ok(m.result);
};

await send('Runtime.enable');

/*
 * Wait for the document itself, not for `load`.
 *
 * #plain is rendered by a deferred chunk, so `load` fires while the page is
 * still a spinner — printing on it produced a PDF of an empty box, which is a
 * failure that looks exactly like success until somebody opens the file.
 */
const has = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result?.value;
};
let ready = false;
for (let i = 0; i < 60; i += 1) {
  if (await has("!!document.querySelector('.doc h1') && document.fonts.status === 'loaded'")) {
    ready = true;
    break;
  }
  await sleep(250);
}
if (!ready) {
  console.error('print-cv: the document never rendered. Is docs/ built?');
  chrome.kill();
  server.close();
  process.exit(1);
}
// The web fonts are loaded but the layout that uses them may be one frame away.
await sleep(400);

const name = await has("document.querySelector('.doc h1').textContent");
const sections = await has("[...document.querySelectorAll('.doc h2')].map(e => e.textContent).join(' · ')");

const pdf = await send('Page.printToPDF', {
  // The stylesheet owns the margins, via @page { margin: 14mm }.
  preferCSSPageSize: true,
  printBackground: true,
  // A4 is the paper this is being read on. It is only a fallback — the CSS page
  // size wins when there is one — but the fallback should not be US Letter for
  // an application sent to a Stockholm office.
  paperWidth: 8.27,
  paperHeight: 11.69,
});

const bytes = Buffer.from(pdf.data, 'base64');
writeFileSync(OUT, bytes);

// Page count, straight out of the file, so the one-pager claim is checkable.
const pages = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;

console.log(`print-cv  ${OUT}`);
console.log(`          ${name} — ${(bytes.length / 1024).toFixed(1)} kB, ${pages} page${pages === 1 ? '' : 's'}`);
console.log(`          ${sections}`);

ws.close();
chrome.kill();
server.close();
try { rmSync(PROFILE, { recursive: true, force: true }); } catch { /* windows holds it briefly */ }
process.exit(0);
