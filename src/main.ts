// Entry point: boot, routing, shared media, global keys.

import { h, clear, must } from './dom.js';
import { Store, parseRoute, routeToHash, initial } from './state.js';
import type { State } from './state.js';
import { renderHome } from './ui/home.js';
import { spinner } from './ui/icons.js';
import { prefersReducedMotion } from './a11y.js';
import { Quests, konami } from './achievements.js';
import { openDev } from './ui/devopen.js';
import { togglePlain, onPlainOpened } from './ui/plainoverlay.js';
import { codeFromUrl, pitchFor } from './data/companies.js';
import { loadReadyGate, readyCardOpens } from './prefs.js';

const root = must('#app');
const quests = new Quests();

/*
 * Opening the CV counts as the quest wherever it is opened from. This used to be
 * inside the #plain route, which meant the home screen's overlay -- the primary
 * way anyone reaches the document -- did not count.
 */
onPlainOpened(() => quests.unlock('plain'));

const route = parseRoute(location.hash);
const boot: State = {
  ...initial,
  screen: route.screen,
  panel: route.panel,
  reducedMotion: prefersReducedMotion(),
  // `initial` says true, because the reducer is pure and has no business reading
  // storage. Whether the "meeting's ready" card actually opens is a decision
  // about this visitor rather than about this state, so it is made here, once,
  // at boot. See prefs.ts for the rule.
  readyCard: readyCardOpens(loadReadyGate(), Date.now()),
  ...(route.engTab ? { engTab: route.engTab } : {}),
  ...(route.spotlight ? { spotlight: route.spotlight } : {}),
  ...(route.plain ? { plain: true } : {}),
  // From ?c=, not the hash: the hash is the router and a code has to survive
  // moving between screens. See src/data/companies.ts.
  company: codeFromUrl(location.search),
};

const store = new Store(boot);

/*
 * The tab title and the link preview name the employer only when a code does.
 * index.html ships the Google version as its static default, which is right for
 * the send it was built for and wrong for every other one.
 */
{
  const p = pitchFor(boot.company);
  document.title = p.named
    ? `Meet Nam Nguyen, ${p.role}, ${p.employer} ${p.place ? '· ' + p.place : ''}`.trim()
    : `Nam Nguyen, ${p.role}`;
}

window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
  store.dispatch({ t: 'reducedMotion', on: e.matches });
});

// ---------------------------------------------------------------- media -----

/**
 * THIS PAGE NEVER ASKS FOR YOUR CAMERA.
 *
 * It used to. getUserMedia was called from an explicit click and nothing was
 * ever uploaded, and both of those are true and neither is the point. Nam:
 * "I think we had a criticism earlier regarding triggering the camera, I think
 * we should not do that, enabling camera should be just cosmetic."
 *
 * The criticism is R11 in tools/CV-PERCEPTION.md. What frightens a
 * non-technical reader is not what we do with the stream, it is Chrome's own
 * permission bar appearing on a page dressed as Google Meet -- which is the
 * exact shape of the scam they were warned about. Our reassurance arrives after
 * the browser's alarm, and by then it reads as the alarm being talked out of.
 *
 * So the control is now a control over its own appearance. The state flips, the
 * button un-crosses, and there is no device, no stream and no prompt anywhere
 * behind it. That also removed the effects pipeline, which had nothing left to
 * run on -- see the deletion of src/fx/.
 */
function toggleCamera(): void {
  store.dispatch({ t: 'camera', on: !store.get().cameraOn });
  quests.unlock('camera');
}

const media = { toggleCamera, cameraOn: () => store.get().cameraOn };

// ---------------------------------------------------------------- render ----

let lastKey: string | null = null;

/**
 * Every deferred screen takes a ticket, and a chunk that resolves after the
 * ticket has moved on throws its result away.
 *
 * The bug this fixes: only mount() took a ticket, and the home and plain
 * branches below render straight into the root without one. So an in-flight
 * mount stayed "current" across a navigation that never called mount, and its
 * promise landed on top of the screen that had already replaced it. Pressing
 * Back from Calls rendered Meetings and then had Calls painted back over it one
 * millisecond later — the hash said #home and the screen said Calls.
 *
 * Bumping here, on every render that actually paints, is what makes the guard
 * mean what it claims: anything still in flight from a previous render is stale
 * by definition.
 */
let renderTicket = 0;

/**
 * Are we inside someone else's frame?
 *
 * The share view puts our own pages in an iframe so their responsive layout is
 * real rather than drawn. One of those hashes resolved to the call screen, and
 * the result was a Meet clone rendering a Meet clone inside its own screen
 * share — Nam's word for it was "recursive", and it looked exactly like that.
 *
 * Fixing the one hash fixes the one bug. This fixes the class: a framed copy of
 * this app will never render the call, the lobby or the calls list no matter
 * what hash it is given, so no future source can reintroduce the nesting.
 *
 * Cross-origin access to window.top throws, and a throw here means we are framed
 * by someone we cannot see — which is all the more reason to refuse.
 */
const EMBEDDED = ((): boolean => { try { return window.self !== window.top; } catch { return true; } })();

function render(): void {
  const s = store.get();
  let key = s.plain ? 'plain' : s.screen;
  if (EMBEDDED && (key === 'call' || key === 'lobby' || key === 'calls')) key = 'plain';

  // The call view owns the GL context, the caption timer and the panel state, so
  // it is built once and reused rather than torn down on every panel change.
  // The lobby is on this list for the same reason the call view is: it owns
  // local DOM state — which controls are on, whether a notice is showing, which
  // menu is open — and a re-mount silently throws all of it away. toggleCamera()
  // dispatches { t: 'camera' }, so before this every camera click rebuilt the
  // tile from scratch and the click appeared to do nothing.
  if (key === lastKey && (key === 'call' || key === 'lobby')) return;

  // The bump belongs BELOW that guard, and putting it above was a real bug.
  // Any caller that sets the screen and then the panel — Calls -> the referral
  // note is the one that shipped — dispatches twice. The first render started
  // the call chunk on ticket N; the second returned early here, but had already
  // moved the ticket to N+1, so the chunk that was still loading resolved as
  // stale and threw itself away. The result was the spinner, forever, with no
  // way out: the screen the user asked for was fetched, discarded, and never
  // retried.
  //
  // An early return paints nothing, so it has nothing to invalidate. Only a
  // render that is about to replace the screen may declare earlier work stale.
  renderTicket += 1;
  lastKey = key;

  document.body.classList.toggle('plain', key === 'plain');

  // The Calls tab. A real second tab rather than a link, because Meet has
  // exactly two and a third would be the tell.
  if (key === 'calls') {
    mount('calls', () => import('./ui/calls.js').then((m) => m.renderCalls({}))
      .then((node) => renderHome(store, store.get().reducedMotion, node)));
    return;
  }

  // An egg lives at #egg/<id>. It is its own screen rather than a mode of the
  // call, because it needs almost none of what the call carries and the whole
  // point is that it loads fast when someone finally finds it.
  const eggRoute = /^#egg\/([a-z0-9-]+)/.exec(location.hash);
  if (eggRoute) {
    mount('egg', () => import('./ui/eggplay.js').then((m) => m.renderEgg({
      id: eggRoute[1]!,
      onLeave: () => { history.pushState(null, '', '#home'); store.dispatch({ t: 'screen', screen: 'home' }); },
      onGo: (id) => { history.pushState(null, '', '#egg/' + id); render(); },
    })));
    return;
  }

  if (key === 'company') {
    mount(key, () => import('./ui/company.js')
      .then((m) => m.renderCompany(() => store.dispatch({ t: 'screen', screen: 'home' }))));
    return;
  }

  if (key === 'plain') {
    // EMBEDDED is passed through rather than recomputed: the share view frames
    // this document, and inside a frame "Back to the call" is both misplaced
    // (it lands in the top-right of a screen share) and inert (the coercion
    // above sends a framed copy straight back to plain).
    mount(key, () => import('./ui/plain.js')
      .then((m) => m.renderPlain(() => store.dispatch({ t: 'plain', on: false }), EMBEDDED)));
    quests.unlock('plain');
    return;
  }

  // The home screen ships as static markup so it paints before the bundle
  // arrives (review U9). Once the bundle is here the scripted version is
  // strictly richer — live date, week strip, working code field — so it takes
  // over. Earlier this went the other way and replaced a good screen with a
  // worse one, which is why the swap is now explicit.
  document.getElementById('static-home')?.remove();

  // The home screen is the only one in the entry bundle. Everything else is
  // fetched when it is first reached, which is the difference between a first
  // paint that carries the whole app and one that carries the screen you asked
  // for. Nobody who reads the plain document ever downloads the WebGL pipeline.
  if (key === 'home') {
    clear(root);
    root.appendChild(renderHome(store, s.reducedMotion));
    quests.mount(root);
    return;
  }
  if (key === 'lobby') {
    mount(key, () => import('./ui/lobby.js').then((m) => m.renderLobby(store, media)));
  } else if (key === 'ended') {
    mount(key, () => import('./ui/ended.js').then((m) => m.renderEnded(store, quests)));
  } else {
    mount(key, () => import('./ui/call.js')
      .then((m) => m.renderCall(store, quests, { toggleCamera })));
  }
}

/**
 * Swap in a screen that arrives asynchronously.
 *
 * The token guards against a race that is easy to hit and unpleasant to debug:
 * click Join, change your mind, go back, and the call chunk finishes loading
 * afterwards and mounts itself over the top of the home screen. Each render
 * takes a ticket, and a chunk that resolves after the ticket has moved on
 * throws its result away.
 *
 * The loader also shows the same wavy indicator the product uses, so a slow
 * network reads as Meet loading rather than as nothing happening — which is
 * exactly what the real client does when you join.
 */
function mount(key: string, load: () => Promise<HTMLElement>): void {
  const ticket = ++renderTicket;
  clear(root);
  const pad = h('div', { class: 'load-pad' });
  pad.appendChild(spinner(true));
  root.appendChild(pad);
  void load().then((node) => {
    if (ticket !== renderTicket) return;
    clear(root);
    root.appendChild(node);
    quests.mount(root);
  }).catch(() => {
    if (ticket !== renderTicket) return;
    clear(root);
    root.appendChild(h('div', { class: 'load-pad' }, 'That screen failed to load. Reload the page.'));
  });
  void key;
}

// --------------------------------------------------------------- routing ----

let suppress = false;
store.subscribe(() => {
  render();
  const hash = routeToHash(store.get());
  if (!suppress && location.hash !== hash) history.pushState(null, '', hash);
});

window.addEventListener('popstate', () => {
  const r = parseRoute(location.hash);
  suppress = true;
  store.dispatch({ t: 'plain', on: !!r.plain });
  if (!r.plain) store.dispatch({ t: 'screen', screen: r.screen });
  store.dispatch({ t: 'panel', panel: 'none' });
  if (r.panel !== 'none') store.dispatch({ t: 'panel', panel: r.panel });
  if (r.engTab) store.dispatch({ t: 'engTab', tab: r.engTab });
  if (r.spotlight) store.dispatch({ t: 'spotlight', id: r.spotlight });
  suppress = false;
});

// Wire the static home screen before the first render replaces nothing.
for (const el of document.querySelectorAll<HTMLElement>('[data-go]')) {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const to = el.dataset['go'];
    if (to === 'plain') store.dispatch({ t: 'plain', on: true });
    else if (to === 'lobby') {
      document.getElementById('static-home')?.remove();
      store.dispatch({ t: 'screen', screen: 'lobby' });
    }
  });
}

// ------------------------------------------------------------ global keys ---

const HELP: [string, string][] = [
  ['C', 'captions on or off'],
  ['E', 'kill the effects'],
  ['M', 'in-call messages'],
  ['P', 'people'],
  ['S', 'present'],
  ['T', 'meeting tools'],
  ['H', 'raise hand'],
  ['D', 'read it as a document'],
  ['Esc', 'close the panel'],
  ['?', 'this list'],
];

window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
  const s = store.get();
  if (e.key === '?') { showHelp(); return; }
  if (e.key === 'Escape') { if (s.panel !== 'none') store.dispatch({ t: 'panel', panel: s.panel }); return; }
  if (s.screen !== 'call' && 'cemspth'.includes(e.key.toLowerCase())) return;

  switch (e.key.toLowerCase()) {
    case 'c': store.dispatch({ t: 'captions', on: !s.captionsOn }); break;
    case 'm': store.dispatch({ t: 'panel', panel: 'chat' }); break;
    case 'p': store.dispatch({ t: 'panel', panel: 'people' }); break;
    case 's': store.dispatch({ t: 'panel', panel: 'present' }); break;
    case 't': store.dispatch({ t: 'panel', panel: 'tools' }); break;
    case 'h': store.dispatch({ t: 'hand', on: !s.handRaised }); break;
    /*
      * D opens the CV OVERLAY rather than routing to it (N54).
      *
      * The #plain route still exists and still matters -- recruiters get sent
      * straight to it, and the overlay's own iframe loads it -- but reaching it
      * from inside the app used to replace the whole screen, which is the one
      * thing this build says it never does. Meet does not navigate away from
      * itself.
      */
    case 'd': togglePlain(); break;
    default: return;
  }
});

function showHelp(): void {
  const open = document.getElementById('help');
  if (open) { open.remove(); return; }
  const box = h(
    'div',
    { class: 'help', id: 'help', role: 'dialog', 'aria-label': 'Keyboard shortcuts' },
    h('h3', {}, 'Keyboard'),
    h('dl', { class: 'kv' }, ...HELP.flatMap(([k, v]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, v)])),
    h('button', { class: 'mbtn', type: 'button', onclick: () => box.remove() }, 'Close'),
  );
  document.body.appendChild(box);
  box.querySelector('button')?.focus();
}

// The Konami code opens the dev portal — the working notes for this build,
// linked from nowhere. It is a separate chunk, fetched on demand, so it costs
// nothing at all for the people who never find it.
konami(() => {
  quests.unlock('konami');
  void openDev(store);
});

// Reading the whole build log is its own quiet achievement.
document.addEventListener(
  'scroll',
  (e) => {
    const el = e.target as HTMLElement;
    if (!el?.classList?.contains('side-body')) return;
    const s = store.get();
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40 && s.engTab === 'spec' && s.panel === 'tools') {
      quests.unlock('patient');
    }
  },
  true,
);

render();
