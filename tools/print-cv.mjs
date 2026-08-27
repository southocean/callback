// The PDF harness. Prints docs/NamNguyen_CV_2026.pdf, then checks it.
//
//   node tools/print-cv.mjs          print, check, and report
//   node tools/print-cv.mjs --check  check only, do not write the file
//
// Nam: "make it into a pdf gen harness so we dont have to come back here later."
//
// ---------------------------------------------------------------------------
// WHY IT IS STILL A PRINT OF THE PAGE
//
// Nam, seeing the first generated file: "we should not generate the pdf from
// just the page, cause the formating is different." He is describing a real
// symptom and the diagnosis is one step further in: the formatting was different
// because the print stylesheet was a handful of font-size overrides rather than
// a layout, so at A4 width the document fell into its own narrow-screen
// behaviour and the contact block wrapped to the left.
//
// The fix for that is a real @media print layout, not a second document. A
// second document is two copies of a CV that must never disagree, and this repo
// already knows how that ends: the file it replaced was six days stale and still
// carried four claims that had been edited out of the page.
//
// So: one document, a print stylesheet that is treated as a layout, and this
// harness to make the result checkable rather than a thing somebody eyeballs.
//
// ---------------------------------------------------------------------------
// WHAT IT CHECKS
//
//   LAYOUT, as assertions, which fail the run. The contact block sits on the
//   right and on the same row as the name; the summary paragraph is not printed;
//   the skills columns are actually two columns; nothing overflows the page box.
//
//   SET LINES, as a report, which does not fail the run. Every line of the CV,
//   measured at print width, with the ones that wrap flagged and the ones that
//   wrap to leave two or three words stranded on a line of their own flagged
//   harder. Nam: "many lines are just long enough to break the line, we can do
//   better for some of these lines." Those are an editing judgement, not a bug,
//   so the harness surfaces them and lets a person decide.
//
// Headless Chrome over the DevTools protocol. Node ships a WebSocket client and
// Chrome speaks CDP, so this needs no dependency, which matters in a repo whose
// whole claim is that it has none.

import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';

const CHECK_ONLY = process.argv.includes('--check');
const OUT = 'docs/NamNguyen_CV_2026.pdf';
const PORT = 4199;
const DEBUG_PORT = 9333;

/*
 * ABSOLUTE. Chrome resolves --user-data-dir itself and exits 21 without a word
 * when it cannot use the path it was handed; a relative one fails that way on
 * Windows, silently, and the only symptom is a debugging port that never opens.
 */
const PROFILE = resolve('.tmp/print-profile');

/* A4 less the @page margin, in CSS pixels at 96dpi. This is the box the print
   actually lays out in, and measuring at any other width measures nothing. */
const MM = 96 / 25.4;
const PAGE_MM = { w: 210, h: 297, margin: 13 };
const BOX = {
  w: Math.round((PAGE_MM.w - PAGE_MM.margin * 2) * MM),
  h: Math.round((PAGE_MM.h - PAGE_MM.margin * 2) * MM),
};

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
  const path = join('docs', normalize(url === '/' ? 'index.html' : url).replace(/^(\.\.[/\\])+/, ''));
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
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (code) => {
  try { chrome.kill(); } catch { /* already gone */ }
  server.close();
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch { /* windows holds it briefly */ }
  process.exit(code);
};

let up = false;
for (let i = 0; i < 40; i += 1) {
  try { await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); up = true; break; }
  catch { await sleep(250); }
}
if (!up) {
  console.error('print-cv: Chrome did not open a debugging port.');
  done(1);
}

const target = await (await fetch(
  `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(`http://localhost:${PORT}/#plain`)}`,
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

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};

/*
 * Measure in the print's own box, with print media on.
 *
 * Both halves matter. Without the viewport, the measurements describe a
 * 1440px-wide screen and say nothing about the page. Without the emulated
 * media, the print rules are not applied and the thing being measured is the
 * layout the PDF will not have.
 */
await send('Emulation.setDeviceMetricsOverride', {
  width: BOX.w, height: BOX.h, deviceScaleFactor: 1, mobile: false,
});
await send('Emulation.setEmulatedMedia', { media: 'print' });

/*
 * Wait for the document, not for `load`.
 *
 * #plain is rendered by a deferred chunk, so `load` fires while the page is
 * still a spinner. Printing then produces a PDF of an empty box, which is a
 * failure that looks exactly like success until somebody opens the file.
 */
let ready = false;
for (let i = 0; i < 60; i += 1) {
  if (await evaluate("!!document.querySelector('.doc h1') && document.fonts.status === 'loaded'")) { ready = true; break; }
  await sleep(250);
}
if (!ready) {
  console.error('print-cv: the document never rendered. Is docs/ built?');
  done(1);
}
await sleep(400);

/* --- measure ------------------------------------------------------------ */

const REPORT = `(() => {
  const doc = document.querySelector('.doc');
  const box = doc.getBoundingClientRect();
  const name = document.querySelector('.doc-top > div');
  const contact = document.querySelector('.doc-contact');
  const nb = name.getBoundingClientRect();
  const cb = contact.getBoundingClientRect();
  const pitch = document.querySelector('.doc-pitch');
  const cols = document.querySelector('.doc-2col');

  // Every row of prose the CV prints, with the words that produced it.
  const rows = [...document.querySelectorAll('.doc li, .doc-skill, .doc-target, .doc-sub, .doc-row h3')]
    .map((el) => {
      const r = el.getBoundingClientRect();
      if (r.height === 0) return null;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || r.height;
      const lines = Math.max(1, Math.round(r.height / lh));
      // How much of the LAST line is used. A short one is the stranded tail.
      const range = document.createRange();
      range.selectNodeContents(el);
      const boxes = [...range.getClientRects()].filter((b) => b.width > 1);
      const last = boxes[boxes.length - 1];
      const tail = last && lines > 1 ? last.width / r.width : 1;
      return {
        text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 96),
        lines,
        tail: Math.round(tail * 100),
        where: el.className || el.tagName.toLowerCase(),
      };
    })
    .filter(Boolean);

  return {
    contentWidth: Math.round(box.width),
    contentHeight: Math.round(doc.scrollHeight),
    // The layout facts, as numbers rather than as a screenshot.
    contactOnRight: Math.round(box.right - cb.right) < 4,
    contactBesideName: cb.top < nb.bottom,
    contactAligned: getComputedStyle(contact).textAlign === 'right',
    pitchPrinted: !!pitch && getComputedStyle(pitch).display !== 'none',
    skillColumns: cols ? getComputedStyle(cols).gridTemplateColumns.split(' ').length : 0,
    overflowRight: Math.max(0, ...[...document.querySelectorAll('.doc *')]
      .map((e) => Math.round(e.getBoundingClientRect().right - box.right))),
    rows,
  };
})()`;

const m = await evaluate(REPORT);

/* --- print -------------------------------------------------------------- */

let pages = 0;
let kb = 0;
if (!CHECK_ONLY) {
  const pdf = await send('Page.printToPDF', {
    preferCSSPageSize: true,
    printBackground: true,
    paperWidth: PAGE_MM.w / 25.4,
    paperHeight: PAGE_MM.h / 25.4,
  });
  const bytes = Buffer.from(pdf.data, 'base64');
  writeFileSync(OUT, bytes);
  kb = bytes.length / 1024;
  pages = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/* --- say what happened -------------------------------------------------- */

const checks = [
  ['contact block is on the right edge', m.contactOnRight],
  ['contact block is beside the name, not under it', m.contactBesideName],
  ['contact block is right-aligned', m.contactAligned],
  ['the summary paragraph is not printed', !m.pitchPrinted],
  ['skills print in two columns', m.skillColumns === 2],
  ['nothing overflows the page box', m.overflowRight <= 1],
];

console.log(`print-cv  ${CHECK_ONLY ? '(check only)' : OUT}`);
if (!CHECK_ONLY) console.log(`          ${kb.toFixed(1)} kB, ${pages} page${pages === 1 ? '' : 's'}, ${m.contentWidth}px content width`);
console.log('');
for (const [label, ok] of checks) console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);

/*
 * The set-lines report. Advice, not a gate: a line that wraps is sometimes the
 * right line, and only a person can tell which.
 *
 * A "tail" is how much of the final line the text fills. Below a third and the
 * line has two or three words alone on it, which is the specific ugliness Nam
 * pointed at.
 */
const wrapped = m.rows.filter((r) => r.lines > 1);
const stranded = wrapped.filter((r) => r.tail < 34);

/*
 * How close it is to fitting. `break-inside: avoid` on the sections means the
 * page count is not simply height over page height, so this reports the gap
 * rather than pretending to predict the break: it is the number that says
 * whether trimming a few lines would win a page or whether it is hopeless.
 */
const over = m.contentHeight - BOX.h;
console.log(`\n  content is ${m.contentHeight}px against a ${BOX.h}px page`
  + (over > 0 ? `, ${over}px over one page` : ', fits one page'));
console.log(`  ${m.rows.length} lines set, ${wrapped.length} wrap, ${stranded.length} leave a stranded tail`);
if (stranded.length) {
  console.log('\n  worth shortening — these wrap and strand their last few words:');
  for (const r of stranded.sort((a, b) => a.tail - b.tail)) {
    console.log(`    ${String(r.lines)} lines, ${String(r.tail).padStart(2)}% tail  ${r.text}`);
  }
}

const pass = checks.every(([, ok]) => ok);
console.log(`\n${pass ? 'layout checks pass' : 'LAYOUT CHECKS FAILED'}`);
ws.close();
done(pass ? 0 : 1);
