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

import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';

const CHECK_ONLY = process.argv.includes('--check');

/*
 * ---------------------------------------------------------------------------
 * TAILORED PRINTS -- `--job <name>`, board ticket N267.
 *
 * Nam: "for each job we will tailor the pdf version of the CV to the job, but
 * not this generic CV." That was the reason the ?c= codes could go, and it left
 * one sharp edge: the obvious way to do it is to edit data/cv.ts, run the
 * printer and remember to revert. Both halves of that are traps. The printer
 * writes docs/, which is the PDF the public site links, so a forgotten revert
 * ships a job-specific CV to everybody; and "remember to revert" is a rule that
 * works until the one evening it matters.
 *
 * So a tailored print touches neither. The overrides are applied to the
 * RENDERED DOCUMENT, in the browser, after it loads and before it prints. No
 * source file changes, nothing to revert, and the working tree is as clean
 * afterwards as it was before.
 *
 * It reuses this harness rather than being its own script, and that is the
 * whole argument for the design: a tailored line is usually LONGER than the
 * generic one, the CV fits one page with seventeen pixels to spare, and every
 * layout assertion and the wrap report already live here. A separate script
 * would have had to grow them all back, badly.
 *
 * ONE DIFFERENCE, AND IT IS DELIBERATE. For the generic print the page count is
 * reported; for a tailored one it is ENFORCED. The generic PDF is printed by
 * somebody looking at the output. A tailored one gets printed ten minutes
 * before it is attached to an application, which is exactly when a second page
 * goes out unnoticed.
 */
const jobArg = process.argv.indexOf('--job');
const JOB_NAME = jobArg !== -1 ? process.argv[jobArg + 1] : null;
if (jobArg !== -1 && !JOB_NAME) {
  console.error('print-cv: --job needs a name, e.g. --job tv4 for jobs/tv4.json');
  process.exit(1);
}

let JOB = null;
if (JOB_NAME) {
  const path = `jobs/${JOB_NAME}.json`;
  if (!existsSync(path)) {
    console.error(`print-cv: no ${path}. Copy jobs/example.json and edit it.`);
    process.exit(1);
  }
  try {
    JOB = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`print-cv: ${path} is not valid JSON. ${e.message}`);
    process.exit(1);
  }
}

/* Tailored prints land in out/, which is gitignored. The generic one, and only
   the generic one, overwrites the file the site serves. */
const OUT = JOB_NAME
  ? `out/NamNguyen_CV_2026_${JOB_NAME}.pdf`
  : 'docs/NamNguyen_CV_2026.pdf';
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
  /*
   * EDGE COUNTS, and leaving it out was a real hole -- found while QA-ing N163
   * to N169 on Nam's own machine, which has no Chrome on it. Both of these tools
   * drive the DevTools protocol, which is Chromium's rather than Chrome's, so
   * Edge answers every call in this file identically. Without it the visual gate
   * printed "no Chrome found, skipping" and exited ZERO on the one machine this
   * project is built on: a check that cannot run is not a check, and one that
   * says so in a line nobody reads is worse than one that fails.
   */
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/microsoft-edge',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].find((p) => existsSync(p));

if (!CHROME) {
  console.error('print-cv: no Chromium browser found. Install Chrome or Edge, or add a path to CHROME in this file.');
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

/* --- tailor, if this is a job print ------------------------------------- */

/*
 * Applied to the DOM, and every substitution must MATCH SOMETHING.
 *
 * A find-and-replace that quietly hits nothing is the worst outcome available
 * here: it produces a PDF that looks tailored, is not, and gets attached to an
 * application by somebody who believes it is. So a miss is a hard failure that
 * names the string, rather than a warning in a wall of output.
 */
if (JOB) {
  const applied = await evaluate(`(() => {
    const job = ${JSON.stringify(JOB)};
    const doc = document.querySelector('.doc');
    const missed = [];

    if (job.target) {
      const el = doc.querySelector('.doc-target');
      if (el) el.textContent = job.target;
      else missed.push('.doc-target is not on the page');
    }

    for (const [find, replace] of job.swap ?? []) {
      let hit = false;
      const walk = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walk.nextNode()) nodes.push(walk.currentNode);
      for (const n of nodes) {
        if (!n.nodeValue.includes(find)) continue;
        n.nodeValue = n.nodeValue.split(find).join(replace);
        hit = true;
      }
      if (!hit) missed.push(find);
    }
    return missed;
  })()`);

  if (applied.length) {
    console.error(`\nprint-cv: ${applied.length} substitution(s) in jobs/${JOB_NAME}.json matched nothing:\n`);
    for (const miss of applied) console.error(`  ${miss}`);
    console.error('\nNothing was written. Fix the strings so they match the document exactly.');
    ws.close();
    done(1);
  }
  // Let the reflow settle before anything measures it.
  await sleep(200);
}

/* --- measure ------------------------------------------------------------ */

/*
 * HEIGHT IS THE BOTTOM OF THE LAST CHILD, NOT doc.scrollHeight.
 *
 * scrollHeight cannot report less than the viewport, so under an emulated page
 * it returns the page height for anything that fits, and hides how much room is
 * left. This harness used it and said "fits one page" -- true, but carrying no
 * headroom, which the commit that landed the one-page fix said out loud. Three
 * days later that warning did not survive contact with a hurry: a link went
 * into the contact row, the harness printed 1024 against 1024, and it got read
 * as "the document is now exactly full". It was not. It was 1007 both before
 * and after, because the link joined a row that already existed and cost no
 * height at all.
 *
 * Measuring the last child's bottom against the document's top keeps moving
 * after the content fits, which is the point. A gauge that can only say yes or
 * no cannot tell you how close to no you are, and a number that stops moving is
 * worse than no number, because it still looks like evidence.
 */

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
    // The bottom of the last thing, NOT doc.scrollHeight -- see HEIGHT above.
    contentHeight: (() => {
      const kids = [...doc.children].filter((e) => getComputedStyle(e).display !== 'none');
      const last = kids[kids.length - 1];
      return last ? Math.round(last.getBoundingClientRect().bottom - box.top) : Math.round(doc.scrollHeight);
    })(),
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
  if (JOB_NAME) mkdirSync('out', { recursive: true });
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
if (JOB) {
  console.log(`          tailored for ${JOB.label ?? JOB_NAME}`);
  if (JOB.url) console.log(`          ${JOB.url}`);
}
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
  + (over > 0 ? `, ${over}px over one page` : `, ${BOX.h - m.contentHeight}px of headroom`));
console.log(`  ${m.rows.length} lines set, ${wrapped.length} wrap, ${stranded.length} leave a stranded tail`);
if (stranded.length) {
  console.log('\n  worth shortening — these wrap and strand their last few words:');
  for (const r of stranded.sort((a, b) => a.tail - b.tail)) {
    console.log(`    ${String(r.lines)} lines, ${String(r.tail).padStart(2)}% tail  ${r.text}`);
  }
}

/*
 * The one-page rule is a GATE for a tailored print and a REPORT for the generic
 * one. See the note at the top: the difference is who is watching when it runs.
 */
let onePage = true;
if (JOB) {
  onePage = over <= 0 && (CHECK_ONLY || pages === 1);
  if (!onePage) {
    console.log('\n  TAILORED PRINTS MUST FIT ONE PAGE, and this one does not.');
    if (over > 0) {
      console.log(`  The content is ${over}px past the bottom of the page.`);
    } else {
      /*
       * FITTING AND PAGINATING ARE DIFFERENT QUESTIONS, and this branch is the
       * proof. Found while testing the gate: content measured 1023px against a
       * 1024px box, one pixel to spare, and still printed two pages.
       *
       * `break-inside: avoid` on .doc section means a section that would be cut
       * moves WHOLE. So the last one can be pushed over by a couple of pixels of
       * pressure further up, and the height figure stays reassuring while the PDF
       * is not. The page COUNT is the only honest check, which is why the gate
       * reads it rather than the arithmetic.
       */
      console.log(`  The content fits by ${-over}px, but a section broke onto a second page:`);
      console.log('  break-inside: avoid moves a whole section rather than splitting it.');
    }
    console.log('  Shorten the target line or a swapped line. The stranded-tail list above');
    console.log('  is the cheapest place to look: unwrapping one line buys about 13px.');

    /*
     * AND THE FILE GOES. A failed tailored print must not leave a PDF on disk:
     * out/ is where the thing you are about to attach lives, and a two-page one
     * sitting there under the right name is the mistake this harness exists to
     * prevent. Same rule as a missed substitution, which writes nothing at all.
     */
    if (!CHECK_ONLY && existsSync(OUT)) {
      rmSync(OUT);
      console.log(`\n  ${OUT} was deleted rather than left for you to attach.`);
    }
  }
}

const pass = checks.every(([, ok]) => ok) && onePage;
console.log(`\n${pass ? 'layout checks pass' : 'LAYOUT CHECKS FAILED'}`);
ws.close();
done(pass ? 0 : 1);
