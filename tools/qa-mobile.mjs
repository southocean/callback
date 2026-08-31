// Mobile QA. A phone-shaped browser, driven, with the checks written down.
//
// Nam asked for a session of automated QA on mobile, and to be able to watch it
// happen. So this is deliberately NOT headless: it opens a real window at a real
// phone's metrics, walks every route a visitor can reach, and prints what it is
// looking at into the page itself so the person watching can follow along and
// disagree.
//
//   node tools/qa-mobile.mjs                     iPhone 13 + a 320px worst case
//   node tools/qa-mobile.mjs --device=iphone     one device
//   node tools/qa-mobile.mjs --route=plain       one route
//   node tools/qa-mobile.mjs --keep              leave the window open at the end
//
// Same machinery as tools/spec-layout.mjs -- Chromium over the DevTools
// protocol, docs/ served from disk by the real serve.mjs -- and the same rule:
// run `npm run build` first, because this checks the built site.
//
// WHY A PROBE AND NOT A SCREENSHOT DIFF. There is no reference to diff against;
// mobile has never had one. What a phone breaks is structural and it is the same
// six things every time: the page grows a horizontal scrollbar, something sticks
// out past the right edge, a control shrinks under the thumb, text gets clipped
// instead of wrapping, a fixed bar parks itself on top of the content, and a
// paragraph ends up flush against the glass. Each of those is a measurement, so
// each of those is asserted here by measurement. The screenshots are taken as
// well, and they are for the human -- numbers cannot see ugly.

import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};
const has = (n) => args.includes(`--${n}`);

const PORT = Number(opt('port', 4488));
const DEBUG_PORT = Number(opt('debug-port', 9388));
const PROFILE = resolve('.tmp/qa-mobile-profile');
const OUT = resolve('.tmp/qa-mobile');
const SETTLE = Number(opt('settle', 2600));

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].find((p) => existsSync(p));

if (!CHROME) {
  console.log('qa-mobile: no Chromium browser found (Chrome or Edge), skipping.');
  process.exit(0);
}

/* Real metrics, not round numbers. The 320 is not a phone anybody carries now --
   it is the floor, and a layout that survives it survives a large phone with the
   text size turned up, which people actually do have. */
const DEVICES = {
  iphone: {
    label: 'iPhone 13', w: 390, h: 844, dsf: 3,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
  },
  android: {
    label: 'Pixel 7', w: 412, h: 915, dsf: 2.625,
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
  },
  small: {
    label: '320px floor', w: 320, h: 568, dsf: 2,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
  },
  /* The 600-720 band, which is neither of the two the stylesheet thinks about.
     Both @media blocks that reflow the top bar live on either side of it, so it
     is exactly where a fix to one of them can leave the other stranded. */
  narrow: {
    label: '640 band', w: 640, h: 900, dsf: 2,
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
  },
  landscape: {
    label: 'iPhone landscape', w: 844, h: 390, dsf: 3, angle: 90, type: 'landscapePrimary',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
  },
};

/* Every place a visitor can land. All of them are addressable, which is worth
   saying: the panels are routes rather than in-call state, so each one can be
   checked cold instead of being clicked into. */
/*
 * Every place a visitor can land, and where needed the one gesture it takes to
 * get past the front of it.
 *
 * ANSWER THE DOOR. The call routes all arrive behind the lane picker, so without
 * `prep` the whole in-call half of this pass measures the same dialog eleven
 * times and never sees the call at all. It picks "Let me explore" -- the lane
 * that does NOT start the narrated tour -- because a tour moving the page under
 * the probe would make every measurement a race.
 */
const DISMISS_LANES = `(() => {
  const opts = [...document.querySelectorAll('.lane-opt')];
  if (opts[1]) { opts[1].click(); return true; }
  return false;
})()`;

/*
 * A visitor who has been through a call once. Three of the rail's five items --
 * Bugs, Quests and the completion ring -- appear only when there is something to
 * show, so a cold profile cannot see them and the routes that check them would
 * be checking an emptier screen than anybody actually gets.
 */
const SEEDED = `localStorage.setItem('callback.bugs', JSON.stringify(['cicada','goldbug','jewel']));localStorage.setItem('callback.quests', JSON.stringify(['plain','camera','chat','people','present']));localStorage.setItem('callback.interview', JSON.stringify({lastMs:180000,bestMs:150000,runs:2}))`;

const ROUTES = [
  { id: 'door', hash: '', what: 'the title card (a bare URL, first visit)' },
  { id: 'home', hash: '#home', what: 'the Meetings home screen' },
  /* A state of the home screen rather than a place of its own, and it has to be
     checked as one: below 840 the whole navigation lives behind this button, so
     "home is fine on a phone" is not answered until the drawer has been opened. */
  { id: 'drawer', hash: '#home', what: 'the home screen, nav drawer open',
    seed: SEEDED,
    prep: `(() => { const b = document.querySelector('.menu-btn'); if (!b) return false; b.click(); return true; })()` },
  { id: 'plain', hash: '#plain', what: 'THE CV, as a plain document' },

  /*
   * The Project spec dialog, which is reached from the home screen and is
   * therefore a mobile surface whether or not it was designed as one. Nam:
   * "whatever screen we show on the home screen, it has to look good on mobile
   * too." Two tabs, because they fail differently: Overview carries the heatmap
   * and Scripts carries the widest tables in the build.
   */
  { id: 'spec', hash: '#home', what: 'the Project spec dialog, Overview',
    prep: `(() => {
      const b = [...document.querySelectorAll('button,a')]
        .find((e) => /How this was built|Project spec/i.test(e.textContent || ''));
      if (!b) return false;
      b.click();
      return true;
    })()` },
  { id: 'specscripts', hash: '#home', what: 'the Project spec dialog, Scripts', admin: true,
    prep: `(async () => {
      const b = [...document.querySelectorAll('button,a')]
        .find((e) => /How this was built|Project spec/i.test(e.textContent || ''));
      if (!b) return false;
      b.click();
      await new Promise((r) => setTimeout(r, 1800));
      const t = [...document.querySelectorAll('.dp-tabs button, .dp-tab')]
        .find((e) => /^\s*Scripts\s*$/.test(e.textContent || ''));
      if (t) t.click();
      /* The tables are most of the way down a panel that scrolls inside itself,
         so a capture of the top of this tab shows prose and proves nothing. */
      await new Promise((r) => setTimeout(r, 1200));
      document.querySelector('.sc-quip')?.scrollIntoView({ block: 'center' });
      return true;
    })()` },
  /*
   * The two small panels the rail opens, and the rail itself with every item on
   * it. All three need a visitor who has been through a call once -- the Bugs,
   * Quests and progress items each appear only when there is something to show --
   * so the state is seeded rather than played through.
   */
  { id: 'quests', hash: '#home', what: 'the Quests panel',
    seed: SEEDED,
    prep: `(async () => {
      const m = document.querySelector('.menu-btn');
      if (m) m.click();
      await new Promise((r) => setTimeout(r, 500));
      const b = [...document.querySelectorAll('.rail-item')]
        .find((e) => /Quests/.test(e.textContent || ''));
      if (!b) return false;
      b.click();
      return true;
    })()` },
  { id: 'progress', hash: '#home', what: 'the completion panel',
    seed: SEEDED,
    prep: `(async () => {
      const m = document.querySelector('.menu-btn');
      if (m) m.click();
      await new Promise((r) => setTimeout(r, 900));
      const b = document.querySelector('.rail-prog');
      if (!b) return false;
      b.click();
      return true;
    })()` },
  { id: 'calls', hash: '#calls', what: 'the Calls tab' },

  /* Two more surfaces a visitor reaches from home, both of them dialogs, both
     of them QA'd by Nam on a phone and neither of them ever measured on one. */
  /* A row SELECTS a contact; Continue is what opens the dialog. Both presses,
     or this route measures the Calls tab with a chip in the search band. */
  { id: 'contact', hash: '#calls', what: 'the Calls tab, a contact dialog open',
    prep: `(async () => {
      const r = document.querySelector('.calls-row');
      if (!r) return false;
      r.click();
      await new Promise((x) => setTimeout(x, 700));
      const go = [...document.querySelectorAll('button')]
        .find((e) => /Continue/.test(e.textContent || ''));
      if (go) go.click();
      return true;
    })()` },
  /*
   * The case only has a door once something has been caught -- the Bugs rail item
   * appears on the first find, which is the right behaviour and makes the screen
   * unreachable from a cold profile. Seeded rather than played through: this is a
   * layout check, and catching three bugs by hand through the call would make it
   * a twenty step script that can fail for reasons that are not layout.
   */
  { id: 'collection', hash: '#home', what: 'the bug collection, one bug selected',
    seed: `localStorage.setItem('callback.bugs', JSON.stringify(['cicada','goldbug','jewel']))`,
    prep: `(async () => {
      const m = document.querySelector('.menu-btn');
      if (m) m.click();
      await new Promise((r) => setTimeout(r, 500));
      const b = [...document.querySelectorAll('.rail-item')]
        .find((e) => /Bugs/.test(e.textContent || ''));
      if (!b) return false;
      b.click();
      await new Promise((r) => setTimeout(r, 1800));
      const slot = document.querySelectorAll('.bug-slot')[4];
      if (slot) slot.click();
      return true;
    })()` },
  { id: 'lobby', hash: '#lobby', what: 'the green room' },
  { id: 'call', hash: '#call', what: 'the call itself', prep: DISMISS_LANES },
  /*
   * The share, reached the way a phone reaches it: the overflow menu. There is no
   * share control on the mobile bar -- the real product has none and there is no
   * room to invent one -- so this route is also the test that the replacement
   * flow works at all.
   */
  { id: 'share', hash: '#call', what: 'the call, sharing the screen',
    prep: `(async () => {
      const more = [...document.querySelectorAll('.cbtn')]
        .find((e) => /More options/i.test(e.getAttribute('aria-label') || ''));
      if (!more) return false;
      more.click();
      await new Promise((r) => setTimeout(r, 1200));
      const row = [...document.querySelectorAll('.gm-menu li, .gm-item')]
        .find((e) => /Share screen/i.test(e.textContent || ''));
      if (!row) return false;
      row.click();
      await new Promise((r) => setTimeout(r, 2500));
      return true;
    })()` },
  { id: 'chat', hash: '#chat', what: 'the call, chat panel open', prep: DISMISS_LANES },
  { id: 'people', hash: '#people', what: 'the call, people panel open', prep: DISMISS_LANES },
  { id: 'about', hash: '#about', what: 'the career timeline', prep: DISMISS_LANES },
  { id: 'tools', hash: '#tools/spec', what: 'the engineering panel, spec tab', prep: DISMISS_LANES },
  { id: 'ended', hash: '#ended', what: 'the leave screen', prep: DISMISS_LANES },
];

const wantDevices = (opt('device', '') || '').split(',').filter(Boolean);
const wantRoutes = (opt('route', '') || '').split(',').filter(Boolean);
const devices = Object.entries(DEVICES)
  .filter(([k]) => (wantDevices.length ? wantDevices.includes(k) : k === 'iphone' || k === 'small'));
const routes = ROUTES.filter((r) => (wantRoutes.length ? wantRoutes.includes(r.id) : true));

// ------------------------------------------------------------------ setup ---

await mkdir(OUT, { recursive: true });
await mkdir(PROFILE, { recursive: true });

// serve.mjs rather than another copy of it. It already answers Range requests,
// which the call screen's video needs and which a hand-rolled twelve-line server
// in this file would get wrong in exactly the way serve.mjs documents at length.
const server = spawn(process.execPath, ['serve.mjs'], {
  env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * Headful is the point of this tool -- it exists to be watched. --headless is
 * for the times when a window would be in the way: taking a measurement while
 * somebody is typing into another window, or running the whole pass from a gate
 * where there is nobody to watch it.
 */
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-features=Translate',
  ...(has('headless') ? ['--headless=new', '--disable-gpu']
    : ['--window-size=520,980', '--window-position=60,40']),
  'about:blank',
], { stdio: 'ignore' });

let closed = false;
const done = async (code) => {
  if (closed) return;
  closed = true;
  if (!has('keep')) { try { chrome.kill(); } catch { /* gone */ } }
  try { server.kill(); } catch { /* gone */ }
  await sleep(200);
  if (!has('keep')) { try { await rm(PROFILE, { recursive: true, force: true }); } catch { /* windows */ } }
  process.exit(code);
};

let up = false;
for (let i = 0; i < 60; i += 1) {
  try { await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); up = true; break; }
  catch { await sleep(250); }
}
if (!up) { console.error('qa-mobile: the browser never opened a debugging port.'); await done(1); }

const target = await (await fetch(
  `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' },
)).json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const events = [];
const send = (method, params = {}) => new Promise((res, rej) => {
  const msg = { id: ++id, method, params };
  pending.set(msg.id, { res, rej });
  ws.send(JSON.stringify(msg));
});
await new Promise((r) => { ws.onopen = r; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method) { events.push(m); return; }
  const p = pending.get(m.id);
  if (!p) return;
  pending.delete(m.id);
  if (m.error) p.rej(new Error(m.error.message));
  else p.res(m.result);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  }
  return r.result?.value;
};

// -------------------------------------------------------------- the probe ---
//
// One pass over the document per route. Everything below is a measurement with
// a stated threshold, because "looks cramped" is not a bug report and cannot be
// re-run next month.

const PROBE = String.raw`(() => {
  /*
   * MEASURE AGAINST THE LAYOUT VIEWPORT, NOT innerWidth.
   *
   * This is the single most important line in the file and the first version had
   * it wrong. When a page is wider than the phone, Chrome does what every mobile
   * browser does: it zooms the whole document out until the content fits. After
   * that, innerWidth reports the VISUAL viewport -- 594 on a 390px iPhone -- so
   * every "is this past the right edge" test is silently conducted against a
   * screen 204px wider than the one in the visitor's hand, and passes.
   *
   * documentElement.clientWidth is the layout viewport and stays 390. The gap
   * between the two is not a nuisance to be normalised away, it IS the headline
   * defect, and it is reported below as shrink.
   */
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const hud = document.getElementById('qa-hud');
  const mine = (e) => !!hud && (hud === e || hud.contains(e));
  const all = [...document.querySelectorAll('*')].filter((e) => !mine(e));

  const vis = (e) => {
    if (typeof e.checkVisibility === 'function'
        && !e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const desc = (e) => {
    const cls = typeof e.className === 'string' && e.className.trim()
      ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const t = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 34);
    return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + cls + (t ? ' "' + t + '"' : '');
  };
  const box = (e) => {
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const ownText = (e) => [...e.childNodes]
    .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();

  /*
   * WHAT IS ACTUALLY ON SCREEN, which is not what getBoundingClientRect says.
   *
   * A rect ignores clipping. The nav drawer is 240px wide, parked off-canvas,
   * and styles.css puts overflow:hidden on it precisely so its contents cannot
   * poke back into view -- a fix with a comment above it about "CV" being
   * visible at the left edge with the drawer shut. The first run reported those
   * same contents as the worst offender on the home screen anyway, because the
   * BOXES do straddle the edge even though not one pixel of them is painted.
   *
   * So intersect with every clipping ancestor before believing any of it. This
   * is the difference between measuring the DOM and measuring the screen.
   */
  const seen = (e) => {
    const r = e.getBoundingClientRect();
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    for (let p = e.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const pr = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { x1 = Math.max(x1, pr.left); x2 = Math.min(x2, pr.right); }
      if (cs.overflowY !== 'visible') { y1 = Math.max(y1, pr.top); y2 = Math.min(y2, pr.bottom); }
    }
    return { left: x1, top: y1, right: x2, bottom: y2, width: x2 - x1, height: y2 - y1 };
  };

  /* An element sticking out of a horizontal scroller is not sticking out of the
     PAGE -- the scroller is the thing that has to fit. Without this a case-study
     rail reports forty offenders and buries the real one. */
  const inScroller = (e) => {
    for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) return true;
    }
    return false;
  };

  const visible = all.filter(vis).filter((e) => {
    const s = seen(e);
    return s.width > 0.5 && s.height > 0.5;
  });

  /*
   * IS A MODAL OPEN. The call routes all arrive with the lane picker over them,
   * which is correct -- it is the first thing a visitor meets -- but it makes
   * every other check answer a question nobody asked. "39 pieces of text sit
   * under a fixed element" is true, and it means "a dialog is open", not "the
   * layout is broken". So find the overlay, say so once, and scope the checks
   * that only make sense against whatever is on top.
   */
  const fixed = visible.filter((e) => getComputedStyle(e).position === 'fixed');
  let modal = fixed.find((e) => {
    const r = e.getBoundingClientRect();
    return r.width * r.height > vw * vh * 0.85
      && (e.getAttribute('aria-modal') === 'true' || e.getAttribute('role') === 'dialog');
  }) || null;

  /*
   * A SCRIM COUNTS AS A DIALOG, and missing that made the open nav drawer look
   * broken. The lane picker announces itself with role=dialog; the drawer does
   * not -- it is a 240px panel plus a separate translucent sheet over the rest
   * of the page. So every heading behind it was reported as covered, and every
   * control behind it as overlapping the drawer's own. All true, all meaningless:
   * being behind an open drawer is what the drawer is FOR.
   *
   * The general shape is the scrim, not the markup: a fixed, full-width,
   * mostly-tall element with a see-through background. Find it, then take the
   * top-most fixed thing that is not it -- that is the panel, and the panel is
   * the only layer whose layout the checks below can sensibly be asked about.
   */
  if (!modal) {
    const scrim = fixed.find((e) => {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      const alpha = (cs.backgroundColor.match(/[\d.]+/g) || [])[3];
      return r.width >= vw * 0.98 && r.height >= vh * 0.7
        && cs.backgroundColor !== 'rgba(0, 0, 0, 0)'
        && (alpha === undefined || Number(alpha) > 0.05);
    });
    if (scrim) {
      const z = (e) => Number(getComputedStyle(e).zIndex) || 0;
      modal = fixed.filter((e) => e !== scrim && !scrim.contains(e))
        .sort((a, b) => z(b) - z(a))[0] || scrim;
    }
  }
  const onTop = (e) => !modal || modal.contains(e);

  /* 1. Does the page itself scroll sideways. The one symptom every visitor
        notices, and the only one they can describe. */
  const de = document.documentElement;
  const docOver = Math.round(Math.max(de.scrollWidth, document.body.scrollWidth) - de.clientWidth);

  /* 2. What is over the edge.

        Two refinements, both learned in the first five minutes of running this.

        PARKED IS NOT OVERFLOWING. The skip link sits at left:-9999px and the
        mobile nav drawer sits at left:-240px, and the first run named both as
        the worst offenders on every screen. Neither is a defect: an element
        ENTIRELY outside the viewport was put there deliberately. What is worth
        reporting is an element that straddles the edge -- half on screen, half
        off -- because that is the shape of something that did not fit.

        THE CAUSE IS NOT ALWAYS AN ONLY CHILD. Reporting only elements whose
        parent fits found nothing at all on the home screen while the page was
        204px too wide, because the thing that does not fit is a child of a
        container that has already been stretched by it. So report every
        offender and FLAG the ones whose parent still fits -- that flag is the
        lead, not the filter. */
  const over = [];
  for (const e of visible) {
    if (inScroller(e)) continue;
    const r = seen(e);
    if (r.left >= vw || r.right <= 0) continue;
    const pr = e.parentElement ? seen(e.parentElement) : null;
    if (r.right > vw + 1) {
      over.push({ side: 'right', by: Math.round(r.right - vw), cause: !pr || pr.right <= vw + 1,
        el: desc(e), box: box(e) });
    }
    if (r.left < -1) {
      over.push({ side: 'left', by: Math.round(-r.left), cause: !pr || pr.left >= -1,
        el: desc(e), box: box(e) });
    }
  }
  /* Causes first, then by how far out. */
  over.sort((a, b) => (b.cause - a.cause) || (b.by - a.by));

  /* 2b. WHAT IS MAKING THE PAGE WIDE, which is not always what is over the edge.
         The home screen is 204px too wide while the widest thing anyone can SEE
         sticks out by 24. The difference is the answer: an element can be
         clipped out of sight and still hold the document open. This ignores the
         clipping on purpose -- it is the only check here that measures boxes
         rather than pixels, and it is a diagnostic rather than a fault. */
  const widest = visible.map((e) => {
    const r = e.getBoundingClientRect();
    return { el: desc(e), right: Math.round(r.right), w: Math.round(r.width),
      pos: getComputedStyle(e).position };
  }).filter((x) => x.right > vw + 1).sort((a, b) => b.right - a.right).slice(0, 8);

  /* 3. Tap targets. 48 is Material's guidance and 44 is Apple's; this uses 40,
        the size of Meet's own icon buttons, so the bar is the product's own and
        a failure means smaller than anything the design already ships. Inline
        links inside prose are excluded -- a link in a sentence is the height of
        the sentence, and that is a paragraph, not a defect. */
  const TAPPY = 'a[href],button,input,select,textarea,summary,[role="button"],[role="tab"],[role="switch"],[role="link"],[tabindex]:not([tabindex="-1"])';
  const taps = visible.filter((e) => e.matches(TAPPY))
    .filter((e) => !e.hasAttribute('disabled') && e.getAttribute('aria-disabled') !== 'true')
    .filter((e) => getComputedStyle(e).display !== 'inline');
  const small = taps.map((e) => ({ el: desc(e), box: box(e) }))
    .filter((x) => Math.min(x.box.w, x.box.h) < 40)
    .sort((a, b) => Math.min(a.box.w, a.box.h) - Math.min(b.box.w, b.box.h));

  /* 4. Two controls in the same place. With a mouse this is a near miss; under a
        thumb it is the wrong button. */
  const hits = [];
  const layer = taps.filter(onTop);
  for (let i = 0; i < layer.length; i += 1) {
    for (let j = i + 1; j < layer.length; j += 1) {
      const a = layer[i], b = layer[j];
      if (a.contains(b) || b.contains(a)) continue;
      /* seen(), not getBoundingClientRect(): the closed drawer's items are
         clipped out of existence, and comparing their boxes had them colliding
         with the week arrows they cannot be seen next to. Same mistake the
         over-the-edge check made until it stopped trusting rects. */
      const ra = seen(a), rb = seen(b);
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 2 && h > 2) hits.push({ a: desc(a), b: desc(b), overlap: Math.round(w) + 'x' + Math.round(h) });
    }
  }

  /* 5. Text cut off rather than wrapped. A hard clip (no ellipsis) is always a
        bug; an ellipsis is a decision, so only the hard clip is counted. */
  const clipped = [];
  for (const e of visible) {
    /*
     * A VISUALLY-HIDDEN LIVE REGION IS NOT A CLIPPED ELEMENT, and this check has
     * been calling one a defect for several passes. The pattern is a 1x1 box with
     * overflow hidden and a clip rect -- .sr in this project -- whose whole job is
     * to hold a sentence for a screen reader and show none of it. Its scrollWidth
     * is always hundreds of pixels past its clientWidth, which is exactly what
     * "clipped" tests for and exactly what is intended.
     *
     * So: if nothing of the element is on screen, it is not being cut off, it is
     * being hidden, and those are different findings. Two pixels rather than zero
     * because that idiom uses 1x1 and the odd one uses 2.
     */
    /* Named onScreen rather than box: this loop already calls a box() helper
       further down, and shadowing it turned every probe into a TypeError. */
    const onScreen = seen(e);
    if (onScreen.width <= 2 || onScreen.height <= 2) continue;
    const cs = getComputedStyle(e);
    if (!/(hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) continue;
    const dx = e.scrollWidth - e.clientWidth, dy = e.scrollHeight - e.clientHeight;
    if (dx > 1 && cs.textOverflow === 'clip' && ownText(e)) {
      clipped.push({ axis: 'x', by: dx, el: desc(e), box: box(e) });
    } else if (dy > 2 && !/(auto|scroll)/.test(cs.overflowY) && (ownText(e) || e.children.length)) {
      clipped.push({ axis: 'y', by: dy, el: desc(e), box: box(e) });
    }
  }
  clipped.sort((a, b) => b.by - a.by);

  /* 6. Text too small to read at arm's length. */
  const tiny = visible.filter((e) => ownText(e).length > 2)
    .map((e) => ({ px: parseFloat(getComputedStyle(e).fontSize), el: desc(e) }))
    .filter((x) => x.px < 11).sort((a, b) => a.px - b.px);

  /* 7. Content sitting under a fixed bar. Asked of the page rather than computed
        from rectangles: hit-test the middle of each piece of text and see who
        answers. If a fixed element answers, that text is behind it. */
  const covered = [];
  for (const e of visible) {
    const t = ownText(e);
    if (t.length < 4 || !onTop(e)) continue;
    const r = seen(e);
    /* Inside the viewport on BOTH axes. The skip link lives at left:-9999px, and
       hit-testing the middle of something that is nowhere asks the page what is
       at a point on the far side of the screen and believes the answer. */
    if (r.top > vh || r.bottom < 0 || r.left > vw || r.right < 0) continue;
    const cx = Math.min(vw - 2, Math.max(2, r.left + r.width / 2));
    const cy = Math.min(vh - 2, Math.max(2, r.top + r.height / 2));
    const top = document.elementFromPoint(cx, cy);
    if (!top || top === e || e.contains(top) || top.contains(e) || mine(top)) continue;
    let fixed = null;
    for (let p = top; p; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === 'fixed' || pos === 'sticky') { fixed = p; break; }
    }
    if (fixed && !fixed.contains(e)) covered.push({ el: desc(e), by: desc(fixed), box: box(e) });
  }

  /* 8. Prose flush against the glass. Meet's own gutter is 16px; under 8 is not
        a tight layout, it is text touching the bezel. */
  const edge = visible.filter((e) => /^(P|H1|H2|H3|H4|LI|BLOCKQUOTE)$/.test(e.tagName))
    .filter((e) => ownText(e).length > 8)
    .map((e) => ({ el: desc(e), box: box(e), r: e.getBoundingClientRect() }))
    .filter((x) => x.r.left < 8 || x.r.right > vw - 8)
    .map((x) => ({ el: x.el, box: x.box, left: Math.round(x.r.left), right: Math.round(vw - x.r.right) }));

  /* 9. Deliberate horizontal scrollers, listed so the exclusion in (2) is
        visible rather than silent. */
  const scrollers = visible.filter((e) => {
    const cs = getComputedStyle(e);
    return /(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1;
  }).map((e) => ({ el: desc(e), sw: e.scrollWidth, cw: e.clientWidth }));

  return {
    title: document.title,
    hash: location.hash,
    vw, vh,
    /* The visual viewport. Wider than the layout viewport means the browser has
       zoomed the page out to fit it, which is the whole site rendering small. */
    visualW: Math.round(window.innerWidth),
    modal: modal ? desc(modal) : null,
    contentH: Math.round(de.scrollHeight),
    scale: window.visualViewport ? Math.round(window.visualViewport.scale * 100) / 100 : null,
    docOver,
    over: over.slice(0, 10), overN: over.length,
    small: small.slice(0, 10), smallN: small.length, tapsN: taps.length,
    hits: hits.slice(0, 8), hitsN: hits.length,
    clipped: clipped.slice(0, 10), clippedN: clipped.length,
    tiny: tiny.slice(0, 8), tinyN: tiny.length,
    covered: covered.slice(0, 8), coveredN: covered.length,
    edge: edge.slice(0, 8), edgeN: edge.length,
    scrollers: scrollers.slice(0, 6),
    widest,
  };
})()`;

/* Asked once, of the whole stylesheet rather than of one screen: a 100vh is a
   scroll trap on a phone whether or not the route being looked at uses it, and a
   maximum-scale in the viewport tag blocks pinch-zoom for everybody. */
const GLOBAL = String.raw`(() => {
  const meta = document.querySelector('meta[name=viewport]');
  const vh = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => { for (const r of list) {
      if (r.cssRules) { walk(r.cssRules); continue; }
      if (r.style && /\d(vh|svh|lvh)\b/.test(r.cssText) && !/dvh/.test(r.cssText)) {
        vh.push(r.cssText.slice(0, 130));
      }
    } };
    walk(rules);
  }
  return { viewport: meta ? meta.content : null, vh: vh.slice(0, 24), vhN: vh.length };
})()`;

const HUD = (device, route, n, total) => `(() => {
  let h = document.getElementById('qa-hud');
  if (!h) {
    h = document.createElement('div');
    h.id = 'qa-hud';
    h.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;pointer-events:none;'
      + 'font:500 12px/1.35 system-ui,sans-serif;background:rgba(11,11,13,.92);color:#fff;'
      + 'padding:8px 10px;box-sizing:border-box;border-top:2px solid #34a853';
    document.body.appendChild(h);
  }
  h.textContent = ${JSON.stringify(`QA ${n}/${total} · ${device} · `)} + ${JSON.stringify(route)};
  return true;
})()`;

/*
 * SETTLING, and the first version of this got it wrong in the way section 9 of
 * tools/QA.md warns about.
 *
 * It polled getAnimations() and returned the moment nothing was running -- which
 * on a freshly navigated page is immediately, because the staged entrance has not
 * started yet. Every screenshot came out mid-fade, with the content at a third of
 * its opacity, and every measurement was taken of a layout still in flight.
 *
 * So: a floor before looking at all, then idle twice in a row. Two consecutive
 * quiet polls is what distinguishes "finished" from "between stages", and this
 * page animates in stages by design.
 */
const settle = async (ms) => {
  await sleep(900);
  const until = Date.now() + ms;
  let quiet = 0;
  while (Date.now() < until) {
    const busy = await evaluate(`(() => {
      if (document.querySelector('.spinner')) return true;
      return document.getAnimations().some((a) => a.playState === 'running' && a.effect
        && (a.effect.getTiming().iterations || 1) < Infinity);
    })()`).catch(() => false);
    quiet = busy ? 0 : quiet + 1;
    if (quiet >= 2) { await sleep(250); return; }
    await sleep(300);
  }
};

const shoot = async (name) => {
  await evaluate(`(() => { const h = document.getElementById('qa-hud'); if (h) h.style.visibility = 'hidden'; })()`).catch(() => {});
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
    .catch(() => send('Page.captureScreenshot', { format: 'png' }));
  await evaluate(`(() => { const h = document.getElementById('qa-hud'); if (h) h.style.visibility = 'visible'; })()`).catch(() => {});
  await writeFile(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
  return `${name}.png`;
};

// --------------------------------------------------------------- the walk ---

const findings = [];
const note = (device, route, kind, text, detail) => {
  findings.push({ device, route, kind, text, detail });
  console.log(`    ! ${kind}  ${text}`);
};

const report = [];
let globalOnce = null;
/* Whether the admin grant is currently written to this profile's storage. */
let adminOn = false;
const total = devices.length * routes.length;
let n = 0;

for (const [key, dev] of devices) {
  console.log(`\n=== ${dev.label} (${dev.w}x${dev.h} @${dev.dsf}) ===`);
  await send('Emulation.setDeviceMetricsOverride', {
    width: dev.w, height: dev.h, deviceScaleFactor: dev.dsf, mobile: true,
    screenOrientation: { angle: dev.angle ?? 0, type: dev.type ?? 'portraitPrimary' },
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }).catch(() => {});
  await send('Emulation.setUserAgentOverride', { userAgent: dev.ua, platform: dev.platform });

  for (const route of routes) {
    n += 1;
    const url = `http://localhost:${PORT}/${route.hash}`;
    console.log(`  [${n}/${total}] ${route.hash || '(bare)'}  -- ${route.what}`);

    // A fresh load per route, not a hash flip. The router listens on popstate,
    // and more to the point a shared link IS a cold load: that is the arrival
    // being checked.
    /*
     * Some surfaces are behind the admin gate, and a check that cannot reach a
     * screen is not a check. Same trick tools/spec-layout.mjs uses: the grant is
     * one localStorage key, so set it and load again. It has to be a second load
     * rather than a flag on the first, because the key is read while the page
     * boots and there is nothing to write it to before the origin exists.
     */
    /*
     * about:blank FIRST, EVERY TIME, and this is not belt-and-braces.
     *
     * Several routes are states of #home -- the drawer, both spec tabs -- so the
     * next Page.navigate goes to a URL identical to the current one. That is a
     * same-document fragment navigation: it does not re-run the page. The result
     * was routes inheriting the previous one's screen, and the report saying
     * "the Meetings home screen (measured with a dialog open)" because the spec
     * panel from the route before was still standing. Every measurement after
     * the first #home route was of the wrong thing.
     *
     * A trip through about:blank forces a real document each time, which is what
     * "a visitor arrives at this URL" is supposed to mean.
     */
    await send('Page.navigate', { url: 'about:blank' });
    await sleep(150);
    await send('Page.navigate', { url });
    await sleep(700);

    /*
     * The grant is per-origin and outlives a navigation, so it has to be both
     * set for the routes that need it and CLEARED for the ones that do not --
     * otherwise every route after the first admin one is measuring a screen no
     * ordinary visitor is shown.
     */
    if (route.seed) {
      await evaluate(route.seed).catch(() => {});
      await send('Page.reload', { ignoreCache: false });
      await sleep(1100);
    }
    if (route.admin !== adminOn) {
      await evaluate(route.admin
        ? `localStorage.setItem('callback.admin','1')`
        : `localStorage.removeItem('callback.admin')`).catch(() => {});
      adminOn = !!route.admin;
      await send('Page.reload', { ignoreCache: false });
      await sleep(1000);
    }
    await sleep(200);
    await settle(SETTLE);
    if (route.prep) {
      const acted = await evaluate(route.prep).catch(() => false);
      if (acted) { await sleep(600); await settle(SETTLE); }
    }
    /* --scroll=<selector> brings one thing into view before the capture. Panels
       that scroll inside themselves put most of their content below the fold, so
       a screenshot of the top of one proves nothing about the tables in it. */
    const SCROLL = opt('scroll', '');
    if (SCROLL) {
      await evaluate(`document.querySelector(${JSON.stringify(SCROLL)})`
        + `?.scrollIntoView({ block: 'center' })`).catch(() => {});
      await sleep(500);
    }
    await evaluate(HUD(dev.label, `${route.hash || '(bare)'} — ${route.what}`, n, total)).catch(() => {});
    await sleep(has('slow') ? 1600 : 500);

    if (!globalOnce) globalOnce = await evaluate(GLOBAL).catch(() => null);

    let m;
    try { m = await evaluate(PROBE); }
    catch (e) { console.log(`    ! probe failed: ${e.message}`); continue; }

    m.shot = await shoot(`${key}-${route.id}`).catch(() => null);
    m.device = dev.label;
    m.deviceKey = key;
    m.route = route.id;
    m.what = route.what;
    report.push(m);

    /* Not a fault -- state, recorded so the numbers below can be read. */
    if (m.modal) console.log(`      (measured with a dialog open: ${m.modal})`);
    if (m.visualW > m.vw + 1) {
      note(dev.label, route.id, 'shrink-to-fit',
        `too wide to fit, so the phone zooms the whole page out to ${Math.round((m.vw / m.visualW) * 100)}% `
        + `(layout ${m.vw}px, shown as ${m.visualW}px)`, null);
    }
    if (m.docOver > 1) {
      note(dev.label, route.id, 'page-scrolls-sideways',
        `the page is ${m.docOver}px wider than the screen`, m.over.slice(0, 3));
    }
    if (m.overN) {
      note(dev.label, route.id, 'over-the-edge',
        `${m.overN} element(s) past the viewport, worst ${m.over[0].by}px ${m.over[0].side}: ${m.over[0].el}`,
        m.over);
    }
    if (m.smallN) {
      note(dev.label, route.id, 'tap-target',
        `${m.smallN} of ${m.tapsN} controls under 40px, smallest ${Math.min(m.small[0].box.w, m.small[0].box.h)}px: ${m.small[0].el}`,
        m.small);
    }
    if (m.hitsN) {
      note(dev.label, route.id, 'controls-overlap',
        `${m.hitsN} pair(s) of controls overlap: ${m.hits[0].a} / ${m.hits[0].b}`, m.hits);
    }
    if (m.clippedN) {
      note(dev.label, route.id, 'clipped',
        `${m.clippedN} element(s) cut off, worst ${m.clipped[0].by}px on ${m.clipped[0].axis}: ${m.clipped[0].el}`,
        m.clipped);
    }
    if (m.tinyN) {
      note(dev.label, route.id, 'tiny-text',
        `${m.tinyN} run(s) under 11px, smallest ${m.tiny[0].px}px: ${m.tiny[0].el}`, m.tiny);
    }
    if (m.coveredN) {
      note(dev.label, route.id, 'covered',
        `${m.coveredN} piece(s) of text sit under a fixed element: ${m.covered[0].el} under ${m.covered[0].by}`,
        m.covered);
    }
    if (m.edgeN) {
      note(dev.label, route.id, 'flush-to-the-edge',
        `${m.edgeN} paragraph(s)/heading(s) within 8px of the screen edge: ${m.edge[0].el}`, m.edge);
    }
    if (m.scale && m.scale !== 1) {
      note(dev.label, route.id, 'zoomed', `the page loaded at scale ${m.scale}`, null);
    }
  }
}

// ----------------------------------------------------------------- report ---

const errs = events.filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
  .map((e) => e.params.entry.text)
  .filter((t) => !/favicon|fonts\.googleapis|fonts\.gstatic|frame-ancestors/.test(t));

const lines = [];
lines.push('# Mobile QA');
lines.push('');
lines.push('The built site in `docs/`, served from disk, walked in a real browser at phone metrics.');
lines.push(`${devices.length} device(s) x ${routes.length} route(s) = ${report.length} screens. Screenshots alongside this file.`);
lines.push('');
if (globalOnce) {
  lines.push('## Page-wide');
  lines.push('');
  lines.push(`- viewport meta: \`${globalOnce.viewport}\``);
  lines.push(`- non-dynamic viewport-height units in the stylesheet: ${globalOnce.vhN}`);
  for (const v of globalOnce.vh) lines.push(`  - \`${v}\``);
  lines.push('');
}
if (errs.length) {
  lines.push('## Console errors');
  lines.push('');
  for (const e of [...new Set(errs)].slice(0, 15)) lines.push(`- ${e}`);
  lines.push('');
}
const byKind = new Map();
for (const f of findings) {
  if (!byKind.has(f.kind)) byKind.set(f.kind, []);
  byKind.get(f.kind).push(f);
}
lines.push('## Findings');
lines.push('');
if (!findings.length) lines.push('None. Every assertion above passed on every route.');
for (const [kind, list] of [...byKind.entries()].sort((a, b) => b[1].length - a[1].length)) {
  lines.push(`### ${kind} (${list.length})`);
  lines.push('');
  for (const f of list) {
    lines.push(`- **${f.device} / ${f.route}** -- ${f.text}`);
    for (const d of (Array.isArray(f.detail) ? f.detail : []).slice(0, 6)) {
      lines.push(`  - \`${JSON.stringify(d)}\``);
    }
  }
  lines.push('');
}
lines.push('## Screens');
lines.push('');
for (const m of report) {
  lines.push(`- \`${m.deviceKey}-${m.route}.png\` -- ${m.what}; ${m.vw}x${m.vh}, content ${m.contentH}px tall`);
}

await writeFile(`${OUT}/report.md`, lines.join('\n'));
await writeFile(`${OUT}/report.json`, JSON.stringify({ findings, report, global: globalOnce, errs }, null, 2));

console.log('');
console.log(`qa-mobile: ${findings.length} finding(s) across ${report.length} screens.`);
for (const [kind, list] of [...byKind.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(list.length).padStart(3)}  ${kind}`);
}
console.log(`  report  ${OUT}/report.md`);

if (has('keep')) {
  await evaluate(`(() => {
    const h = document.getElementById('qa-hud');
    if (h) h.textContent = 'QA finished. The window is yours -- have a poke around.';
  })()`).catch(() => {});
  console.log('  the browser is left open (--keep). Ctrl-C here to close it.');
  await new Promise(() => {});
}
await done(0);
