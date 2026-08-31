// Ours against the original, at a phone's width.
//
// Nam: "please stack the two screenshots I sent from previous prompt, so we can
// truly match our site to the original meet. Lots of small deviations here on
// mobile."
//
// Stacking the images is one way and it is the weaker one -- an overlay tells
// you THAT something moved, and the next question is always which property did
// it, which is the thing you actually have to change. So this is the numeric
// version of the same request: tools/fingerprint.js on both pages, diffed by
// tools/fingerprint.js's own diff(), exactly the loop QA.md section 1 describes.
// The overlay stays available for the whole-block drift it is better at.
//
//   node tools/ref-mobile.mjs --device=iphone      capture the reference first
//   node tools/mobile-match.mjs                    then diff ours against it
//
//   --device=iphone   which capture to read, and which metrics to use on ours
//   --keys=bar        only keys whose text matches this
//
// WHAT IT CAN AND CANNOT SAY. Half the strings on this site are deliberately
// ours, so a key present in one page and absent in the other is usually content
// rather than a defect -- those are listed separately and quietly. The signal is
// in the keys BOTH pages have: the icon buttons, the composer, the date. Those
// are the same control in both products and every difference in them is a real
// one.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};

const DEVICE = opt('device', 'iphone');
const KEYS = opt('keys', '');
const PORT = Number(opt('port', 4493));
const DEBUG_PORT = Number(opt('debug-port', 9393));
const PROFILE = resolve('.tmp/mobile-match-profile');
const OUT = resolve('.tmp/qa-mobile');
const REF = resolve(`.tmp/ref-mobile/${DEVICE}-meet-google-com.json`);

const DEVICES = {
  iphone: { label: 'iPhone 13', w: 390, h: 844, dsf: 3 },
  small: { label: '320px floor', w: 320, h: 568, dsf: 2 },
  narrow: { label: '640 band', w: 640, h: 900, dsf: 2 },
};
const dev = DEVICES[DEVICE] ?? DEVICES.iphone;

if (!existsSync(REF)) {
  console.error(`mobile-match: no reference at ${REF}`);
  console.error(`Capture one first:  node tools/ref-mobile.mjs --device=${DEVICE}`);
  process.exit(1);
}
const ref = JSON.parse(await readFile(REF, 'utf8')).print;
if (!ref) { console.error('mobile-match: that capture has no fingerprint in it.'); process.exit(1); }

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => existsSync(p));
if (!CHROME) { console.log('mobile-match: no Chromium browser found, skipping.'); process.exit(0); }

await mkdir(OUT, { recursive: true });
await mkdir(PROFILE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, ['serve.mjs'], {
  env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--headless=new', '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });

const done = (code) => {
  try { chrome.kill(); } catch { /* gone */ }
  try { server.kill(); } catch { /* gone */ }
  process.exit(code);
};

let up = false;
for (let i = 0; i < 60; i += 1) {
  try { await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); up = true; break; }
  catch { await sleep(250); }
}
if (!up) { console.error('mobile-match: the browser never opened a debugging port.'); done(1); }

const target = await (await fetch(
  `http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' },
)).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const msg = { id: ++id, method, params };
  pending.set(msg.id, { res, rej });
  ws.send(JSON.stringify(msg));
});
await new Promise((r) => { ws.onopen = r; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method) return;
  const p = pending.get(m.id);
  if (!p) return;
  pending.delete(m.id);
  if (m.error) p.rej(new Error(m.error.message));
  else p.res(m.result);
};
await send('Page.enable');
await send('Runtime.enable');
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};

await send('Emulation.setDeviceMetricsOverride', {
  width: dev.w, height: dev.h, deviceScaleFactor: dev.dsf, mobile: true,
  screenOrientation: { angle: 0, type: 'portraitPrimary' },
});
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.navigate', { url: `http://localhost:${PORT}/#home` });
// Long, because the promo banner opens on a staged delay and a fingerprint taken
// before it lands is a fingerprint of a different screen.
await sleep(11000);

await evaluate(await readFile('tools/fingerprint.js', 'utf8'));
const got = await evaluate('fingerprint()');
const report = await evaluate(`diff(${JSON.stringify(ref)}, fingerprint())`);

const wanted = (k) => !KEYS || k.toLowerCase().includes(KEYS.toLowerCase());

console.log(`\nmobile-match: ${dev.label}`);
console.log(`  reference ${ref.viewport}, ${ref.items.length} keys`);
console.log(`  ours      ${got.viewport}, ${got.items.length} keys`);
console.log('');

const shared = report.mismatches.filter((m) => wanted(m.key));
console.log(`SHARED KEYS THAT DISAGREE (${shared.length})`);
console.log('');
for (const m of shared) {
  console.log(`  ${m.key}`);
  for (const p of m.problems) console.log(`      ${p}`);
}

/* Content differences, kept apart from defects on purpose: this is a CV, not a
   copy of Meet's home, so a key only one side has is expected until proven
   otherwise. Listed so the split is visible rather than silently applied. */
console.log('');
console.log(`ONLY IN THE REFERENCE (${report.missing.length}): ${report.missing.filter(wanted).join(' | ')}`);
console.log('');
console.log(`ONLY IN OURS (${report.extra.length}): ${report.extra.filter(wanted).join(' | ')}`);

await writeFile(`${OUT}/match-${DEVICE}.json`, JSON.stringify({ report, ref, got }, null, 2));
console.log('');
console.log(`  ${OUT}/match-${DEVICE}.json`);
done(0);
