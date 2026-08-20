// Entry point: boot, routing, shared media, global keys.

import { h, clear, must } from './dom.js';
import { Store, parseRoute, routeToHash, initial } from './state.js';
import type { State } from './state.js';
import { renderHome } from './ui/home.js';
import { spinner } from './ui/icons.js';
import { prefersReducedMotion } from './a11y.js';
import { Quests, konami } from './achievements.js';
import { openDev } from './ui/devopen.js';

const root = must('#app');
const quests = new Quests();

const route = parseRoute(location.hash);
const boot: State = {
  ...initial,
  screen: route.screen,
  panel: route.panel,
  reducedMotion: prefersReducedMotion(),
  ...(route.engTab ? { engTab: route.engTab } : {}),
  ...(route.spotlight ? { spotlight: route.spotlight } : {}),
  ...(route.plain ? { plain: true } : {}),
};

const store = new Store(boot);

window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
  store.dispatch({ t: 'reducedMotion', on: e.matches });
});

// ---------------------------------------------------------------- media -----
// One video element and one GL canvas, shared between the lobby preview and the
// call tile, so a camera granted in the green room is still live after you join
// — which is how the real product behaves.

const video = h('video', { muted: true, playsinline: true, autoplay: true }) as HTMLVideoElement;
video.muted = true;
const canvas = h('canvas', { 'aria-hidden': 'true' }) as HTMLCanvasElement;
canvas.hidden = true;
let stream: MediaStream | null = null;

async function toggleCamera(): Promise<void> {
  if (store.get().cameraOn) {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    store.dispatch({ t: 'camera', on: false });
    return;
  }
  try {
    // Only ever called from an explicit click (reviews T8, R3).
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 960 }, audio: false });
    video.srcObject = stream;
    await video.play().catch(() => undefined);
    store.dispatch({ t: 'camera', on: true });
    quests.unlock('camera');
  } catch {
    store.dispatch({ t: 'camera', on: false });
  }
}

const media = { video, toggleCamera, cameraOn: () => store.get().cameraOn };

// ---------------------------------------------------------------- render ----

let lastKey: string | null = null;

function render(): void {
  const s = store.get();
  const key = s.plain ? 'plain' : s.screen;

  // The call view owns the GL context, the caption timer and the panel state, so
  // it is built once and reused rather than torn down on every panel change.
  if (key === lastKey && key === 'call') return;
  lastKey = key;

  document.body.classList.toggle('plain', key === 'plain');

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

  if (key === 'plain') {
    mount(key, () => import('./ui/plain.js')
      .then((m) => m.renderPlain(() => store.dispatch({ t: 'plain', on: false }))));
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
      .then((m) => m.renderCall(store, quests, { video, canvas, toggleCamera })));
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

let renderTicket = 0;

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
    case 'e': store.dispatch({ t: 'fx', preset: 'off' }); break;
    case 'm': store.dispatch({ t: 'panel', panel: 'chat' }); break;
    case 'p': store.dispatch({ t: 'panel', panel: 'people' }); break;
    case 's': store.dispatch({ t: 'panel', panel: 'present' }); break;
    case 't': store.dispatch({ t: 'panel', panel: 'tools' }); break;
    case 'h': store.dispatch({ t: 'hand', on: !s.handRaised }); break;
    case 'd': store.dispatch({ t: 'plain', on: !s.plain }); break;
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
