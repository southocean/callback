// Layout assertions for the Project spec panel.
//
// Nam, after the milestones heading shipped 20px out of line with the two above
// it and with no top margin at all: "Just be more thorough with your QA can you,
// how can these things slip through the QA ... if you do know the css styling are
// not the same, why the heck didnt you QA visually as well?"
//
// Fair, and the honest answer is that it was checked in the one place it looked
// right. The panel renders in two hosts with different widths, and the defect was
// only visible in the other one, below the fold. A screenshot proves whatever is
// on screen at the moment it is taken; it does not prove the thing you did not
// scroll to.
//
// So this is the same answer tools/print-cv.mjs gives for the PDF: state the
// invariants, check them in a real browser, exit non-zero. Both hosts, both
// scroll positions, no eyeballing.
//
//   node tools/spec-layout.mjs
//
// Chrome over the DevTools protocol, docs/ served from disk. Run `npm run build`
// first: this checks the built site, which is what people actually load.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, normalize, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4477;
const DEBUG_PORT = 9377;
const PROFILE = resolve('.tmp/spec-layout-profile');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => existsSync(p));

if (!CHROME) {
  // Not a failure. CI without a browser should not fail a layout check it
  // cannot run; it should say so and let the rest of the gate stand.
  console.log('spec-layout: no Chrome found, skipping.');
  process.exit(0);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.pdf': 'application/pdf',
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

mkdirSync(PROFILE, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', 'about:blank',
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
if (!up) { console.error('spec-layout: Chrome did not open a debugging port.'); done(1); }

const target = await (await fetch(
  `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(`http://localhost:${PORT}/#home`)}`,
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
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false,
});

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `   ${detail}` : ''}`);
};

/* The three headings that must be indistinguishable. They were not, and the
   reason was a duplicate class rather than a shared container. */
const HEADS = `(() => {
  const hs = [...document.querySelectorAll('h2')]
    .filter((h) => /The spec|The stack|The milestones/.test(h.textContent || ''));
  return hs.map((h) => {
    const r = h.getBoundingClientRect();
    const c = getComputedStyle(h);
    return { t: h.textContent, left: Math.round(r.left), w: Math.round(r.width),
             mt: c.marginTop, font: c.font };
  });
})()`;

const headingsAgree = (hs, where) => {
  check(`${where}: all three section headings exist`, hs.length === 3, `found ${hs.length}`);
  if (hs.length !== 3) return;
  const uniq = (k) => [...new Set(hs.map((h) => h[k]))];
  check(`${where}: headings share a left edge`, uniq('left').length === 1, uniq('left').join(' / '));
  check(`${where}: headings share a width`, uniq('w').length === 1, uniq('w').join(' / '));
  check(`${where}: headings share a top margin`, uniq('mt').length === 1, uniq('mt').join(' / '));
  check(`${where}: headings share a font`, uniq('font').length === 1);
};

await sleep(3500);

/* --- host 1: the dialog on the home screen ------------------------------- */
await evaluate(`localStorage.setItem('callback.admin','1')`);
await evaluate('location.reload()');
await sleep(4000);
await evaluate(`(() => {
  const b = [...document.querySelectorAll('button,a')]
    .find((e) => /How this was built|Project spec/i.test(e.textContent || ''));
  if (b) b.click();
})()`);
await sleep(1800);

headingsAgree(await evaluate(HEADS), 'dialog');

const rail = await evaluate(`(() => {
  const st = document.querySelector('.ms-strip');
  if (!st) return null;
  const sb = st.getBoundingClientRect();
  const clipped = [...document.querySelectorAll('.ms-body')]
    .filter((b) => { const r = b.getBoundingClientRect(); return r.top < sb.top - 0.5 || r.bottom > sb.bottom + 0.5; })
    .map((b) => b.querySelector('.ms-title')?.textContent);
  const days = [...document.querySelectorAll('.ms-day')];
  return {
    clipped,
    scrolls: st.scrollWidth > st.clientWidth + 1,
    days: days.length,
    up: days.filter((d) => d.classList.contains('is-up')).length,
  };
})()`);
check('dialog: no milestone label is clipped', rail && rail.clipped.length === 0, (rail?.clipped ?? []).join(', '));
check('dialog: the rail fits without scrolling', rail && !rail.scrolls);
check('dialog: labels alternate above and below the rail',
  !!rail && rail.up > 0 && rail.up < rail.days, `${rail?.up} of ${rail?.days} above`);

/* --- host 2: the same panel inside the emulated browser ------------------ */
/*
 * This is the host the defect lived in, and the one that never got checked. It
 * is wider than the dialog, so .bd stops being clamped by its column and the two
 * containers are free to disagree about where the left edge is. Reaching it means
 * doing what a visitor does: open a marked day, join it, and open the file from
 * Explorer on the shared desktop.
 */
await evaluate(`(() => { const c = document.querySelector('.dp-close'); if (c) c.click(); })()`);
await evaluate(`location.hash = '#home'`);
await sleep(2500);
await evaluate(`(() => {
  const d = [...document.querySelectorAll('.day')].find((x) => x.querySelector('.cal-dot'));
  if (d) d.click();
})()`);
await sleep(1400);
await evaluate(`(() => { const c = document.querySelector('.sched-card'); if (c) c.click(); })()`);
await sleep(4200);

await evaluate(`(() => {
  const t = [...document.querySelectorAll('.wx-tree *')].find((e) => (e.textContent || '').trim() === 'This CV');
  if (t) t.click();
})()`);
await sleep(900);
const openedFile = await evaluate(`(() => {
  const r = [...document.querySelectorAll('.wx-list > *')]
    .find((e) => /how-this-is-built/.test(e.textContent || ''));
  if (!r) return false;
  r.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  return true;
})()`);
await sleep(2600);
check('browser: the spec page opens from Explorer', openedFile === true);

/* Maximised, because that is how it is read on a shared screen. */
await evaluate(`(() => {
  const wins = [...document.querySelectorAll('.wx')];
  const w = wins[wins.length - 1];
  const caps = w ? [...w.querySelectorAll('.wx-cap')] : [];
  if (caps[1]) caps[1].click();
})()`);
await sleep(1500);

if (openedFile) {
  headingsAgree(await evaluate(HEADS), 'browser');

  /*
   * The sticky tab strip. A sticky offset resolves against the scrollport's
   * PADDING box, so `top: 0` inside .cb-page's 26px of padding parked the strip
   * 26px down and left a window above it for content to slide through.
   */
  const sticky = await evaluate(`(() => {
    const pg = document.querySelector('.cb-page');
    const tabs = document.querySelector('.pg-spec .dp-tabs');
    if (!pg || !tabs) return null;
    pg.scrollTop = 420;
    const t = tabs.getBoundingClientRect();
    const p = pg.getBoundingClientRect();
    return { gap: Math.round(t.top - p.top), stuck: pg.scrollTop > 0 };
  })()`);
  check('browser: the tab strip is flush with the top when stuck',
    !!sticky && sticky.stuck && sticky.gap === 0, sticky ? `gap ${sticky.gap}px` : 'not found');

  /* The measure. Narrow-and-left was the complaint; centred was the ask. */
  const measure = await evaluate(`(() => {
    const bd = document.querySelector('.bd');
    const p = document.querySelector('.bd-lead');
    if (!bd || !p) return null;
    const rng = document.createRange();
    rng.selectNodeContents(p);
    const tb = rng.getBoundingClientRect();
    const bb = bd.getBoundingClientRect();
    return { colW: Math.round(bb.width), textW: Math.round(tb.width) };
  })()`);
  check('browser: the reading column is the CV measure, not a narrow band',
    !!measure && measure.colW >= 780, measure ? `${measure.colW}px` : 'not found');
  check('browser: paragraphs use the column they are given',
    !!measure && measure.textW > measure.colW * 0.85,
    measure ? `text ${measure.textW} of ${measure.colW}` : '');
}

const summary = results.filter((r) => !r.pass);
console.log('');
if (summary.length) {
  console.error(`spec-layout: ${summary.length} assertion(s) failed.`);
  done(1);
}
console.log(`spec-layout: ${results.length} assertions pass`);
done(0);
