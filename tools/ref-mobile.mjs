// The mobile reference: what the real product does at phone metrics.
//
// tools/qa-mobile.mjs asks whether OUR layout survives a phone. This asks what
// the thing we are cloning actually does on one, so the answer to "is this
// right" can be a measurement instead of an opinion. It is the mobile half of
// the fingerprint loop in tools/QA.md section 1.
//
// IT ATTACHES, IT DOES NOT LAUNCH, and that is the whole shape of the tool.
// meet.google.com/home is behind a Google sign-in, and a sign-in is a human's
// job -- an automated browser must never be handed credentials, and Google is
// right to make that awkward. So a person signs in to a browser started with a
// debugging port, and this connects to the tab that is already there:
//
//   chrome --remote-debugging-port=9222 --user-data-dir=.tmp/meet-profile
//   ... sign in by hand, once ...
//   node tools/ref-mobile.mjs
//
//   --port=9222     the debugging port to attach to
//   --url=...       match a different tab (default: meet.google.com)
//   --device=small  phone preset, as in qa-mobile.mjs
//   --keep-mobile   leave the tab in phone emulation instead of restoring it
//
// Nothing is sent anywhere. The capture lands in .tmp/ref-mobile/, which is
// gitignored, and it is a signed-in page -- treat what comes out as personal.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};
const has = (n) => args.includes(`--${n}`);

const PORT = Number(opt('port', 9222));
const MATCH = opt('url', 'meet.google.com');
const OUT = resolve('.tmp/ref-mobile');

const DEVICES = {
  iphone: { label: 'iPhone 13', w: 390, h: 844, dsf: 3 },
  small: { label: '320px floor', w: 320, h: 568, dsf: 2 },
  android: { label: 'Pixel 7', w: 412, h: 915, dsf: 2.625 },
  narrow: { label: '640 band', w: 640, h: 900, dsf: 2 },
};
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const dev = DEVICES[opt('device', 'iphone')] ?? DEVICES.iphone;

/*
 * /home HAS NO MOBILE WEB. A MEETING URL DOES. That distinction cost a whole
 * round of wrong measurements, so it is written at the top of the file.
 *
 * Sent an iPhone user agent, meet.google.com/HOME does not serve a small layout:
 * it 302s to an app.goo.gl interstitial with a wordmark, a sentence and an OPEN
 * button. Two controls on the whole page. The first pass generalised that into
 * "there is no mobile Meet web" and reached for the desktop agent instead.
 *
 * Wrong. The same iPhone agent on meet.google.com/<meeting-code> serves the real
 * mobile green room -- a different screen from the responsive desktop one, with
 * the effects control, the tools card, the heading and the account line all
 * absent. Nam had it on his phone and said so. So --ua=mobile is the reference
 * for anything reachable at a meeting URL, and --ua=desktop is a fallback for the
 * surfaces that only exist on the desktop app.
 *
 * Which leaves the reference that does exist and is the honest one for a WEB
 * clone -- the same web app, at a phone's viewport, with the desktop user agent
 * that stops the redirect. That measures Meet's own responsive CSS at 390px,
 * which is precisely the thing this project has to match. The native app is not
 * a target: we are not shipping one.
 *
 *   --ua=desktop   phone metrics, desktop UA -- the responsive web app
 *   --ua=mobile    phone metrics, iPhone UA  -- proves the redirect above
 */
const UA_MODE = opt('ua', 'desktop');

await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ attach ---

let targets;
try {
  targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
} catch {
  console.error(`ref-mobile: nothing is listening on ${PORT}.`);
  console.error('Start a browser with --remote-debugging-port and sign in by hand first.');
  process.exit(1);
}
const tab = targets.find((t) => t.type === 'page' && t.url.includes(MATCH));
if (!tab) {
  console.error(`ref-mobile: no open tab matching "${MATCH}". Open one and sign in.`);
  console.error(targets.filter((t) => t.type === 'page').map((t) => `  ${t.url}`).join('\n'));
  process.exit(1);
}
console.log(`ref-mobile: attached to ${tab.url}`);

const ws = new WebSocket(tab.webSocketDebuggerUrl);
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
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  }
  return r.result?.value;
};

// ------------------------------------------------------------------ phone ----

console.log(`ref-mobile: ${dev.label} (${dev.w}x${dev.h} @${dev.dsf})`);
await send('Emulation.setDeviceMetricsOverride', {
  width: dev.w, height: dev.h, deviceScaleFactor: dev.dsf, mobile: true,
  screenOrientation: { angle: 0, type: 'portraitPrimary' },
});
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
if (UA_MODE === 'mobile') {
  await send('Emulation.setUserAgentOverride', { userAgent: IOS_UA, platform: 'iPhone' });
} else {
  // Clear any override left by a previous mobile run in this same tab.
  await send('Emulation.setUserAgentOverride', { userAgent: '' });
}
console.log(`ref-mobile: ${UA_MODE} user agent`);

// Navigate rather than reload, because the product decides what to serve a phone
// at request time and a previous mobile-UA run will have left the tab parked on
// the app-install interstitial it redirected to. Whatever comes back -- the app,
// an interstitial, a redirect -- IS the answer to what a phone gets, and guessing
// which one it would be is exactly the thing this tool exists to stop.
const GOTO = opt('goto', 'https://meet.google.com/home');
await send('Page.navigate', { url: GOTO });
await sleep(7000);

/*
 * --click=<pattern> presses one control after the page settles, because some
 * reference screens are not addressable. The green room is the example: it has no
 * URL of its own, you arrive at it by pressing Join on a meeting, and it is a
 * LOCAL screen -- nobody is joined and nobody is notified until the button on it
 * is pressed, which this never does.
 */
const CLICK = opt('click', '');
if (CLICK) {
  /*
   * RETRIED, because the reference is a real app loading real data. The scheduled
   * card comes from Calendar over the network, so seven seconds after a navigation
   * it is sometimes there and sometimes not -- and a miss reported "no match",
   * which reads as a broken selector rather than a page that had not finished.
   */
  const find = `(() => {
    const rx = new RegExp(${JSON.stringify(CLICK)}, 'i');
    /*
     * ENABLED, AND THE LAST ONE. Meet's home has two controls reading "Join":
     * the composer's, which is disabled until you type a code, and the scheduled
     * card's. The first match was the dead one, so the click did nothing and
     * reported nothing -- which looked like a selector bug and was a real
     * property of the page.
     */
    const all = [...document.querySelectorAll('button,a,[role="button"]')]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .filter((e) => !e.hasAttribute('disabled') && e.getAttribute('aria-disabled') !== 'true')
      .filter((e) => rx.test(e.textContent || '') || rx.test(e.getAttribute('aria-label') || ''));
    const b = all[all.length - 1];
    if (!b) return null;
    b.click();
    return (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 40);
  })()`;
  let hit = null;
  for (let i = 0; i < 12 && hit === null; i += 1) {
    hit = await evaluate(find).catch(() => null);
    if (hit === null) await sleep(2000);
  }
  console.log(`ref-mobile: clicked ${hit === null ? 'NOTHING (no match in 24s)' : JSON.stringify(hit)}`);
  await sleep(7000);
}

const landed = await evaluate('location.href');
console.log(`ref-mobile: landed on ${landed}`);

/* The same structural questions qa-mobile.mjs asks of ours, so the two answers
   are comparable rather than merely both true. */
const FIT = `(() => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const taps = [...document.querySelectorAll('a[href],button,input,[role="button"],[role="link"]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .filter((e) => getComputedStyle(e).display !== 'inline')
    .map((e) => ({
      name: (e.getAttribute('aria-label') || (e.textContent || '').trim()).slice(0, 34),
      w: Math.round(e.getBoundingClientRect().width),
      h: Math.round(e.getBoundingClientRect().height),
      r: Math.round(parseFloat(getComputedStyle(e).borderRadius) || 0),
    }));
  return {
    url: location.href,
    title: document.title,
    vw, vh: de.clientHeight,
    visualW: Math.round(window.innerWidth),
    docOver: Math.round(Math.max(de.scrollWidth, document.body.scrollWidth) - vw),
    contentH: de.scrollHeight,
    viewportMeta: document.querySelector('meta[name=viewport]')?.content ?? null,
    bodyFont: getComputedStyle(document.body).font,
    taps,
    under40: taps.filter((t) => Math.min(t.w, t.h) < 40).length,
    fixed: [...document.querySelectorAll('*')]
      .filter((e) => getComputedStyle(e).position === 'fixed')
      .map((e) => { const r = e.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })
      .filter((b) => b.w > 40 && b.h > 20).slice(0, 10),
  };
})()`;

const fit = await evaluate(FIT);
console.log(`  layout viewport ${fit.vw}px, shown as ${fit.visualW}px`
  + `${fit.docOver > 1 ? `, ${fit.docOver}px too wide` : ', fits'}`);
console.log(`  ${fit.taps.length} controls, ${fit.under40} under 40px`);

// The repo's own extractor, run in the reference tab exactly as QA.md describes.
// Injected through the debugger rather than a <script>, which is also how it
// gets past the page's own content policy without weakening anything.
let print = null;
try {
  await evaluate(await readFile('tools/fingerprint.js', 'utf8'));
  print = await evaluate('fingerprint()');
  console.log(`  fingerprint: ${print.items.length} keyed elements at ${print.viewport}`);
} catch (e) {
  console.log(`  fingerprint unavailable: ${e.message}`);
}

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  .catch(() => send('Page.captureScreenshot', { format: 'png' }));
const name = `${opt('device', 'iphone')}-${new URL(fit.url).hostname.replace(/\W+/g, '-')}`;
await writeFile(`${OUT}/${name}.png`, Buffer.from(shot.data, 'base64'));
await writeFile(`${OUT}/${name}.json`, JSON.stringify({ fit, print }, null, 2));

console.log(`  ${OUT}/${name}.png`);
console.log(`  ${OUT}/${name}.json`);

/* Put the tab back. Somebody else's browser is borrowed, not taken: leaving it
   in phone emulation would be a confusing thing to hand back. */
if (!has('keep-mobile')) {
  await send('Emulation.clearDeviceMetricsOverride');
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Emulation.setUserAgentOverride', { userAgent: '' });
  await send('Page.reload');
  console.log('ref-mobile: tab restored to desktop.');
}
process.exit(0);
