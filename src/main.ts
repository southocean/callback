// Entry point: boot, routing, global keys.

import { h, clear, must } from './dom.js';
import { Store, parseRoute, routeToHash, initial } from './state.js';
import type { State } from './state.js';
import { renderCall } from './ui/call.js';
import { renderPlain } from './ui/plain.js';
import { renderEnd } from './ui/end.js';
import { prefersReducedMotion } from './a11y.js';
import { Quests, konami } from './achievements.js';

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

// Keep the OS preference authoritative even if it changes mid-visit.
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
  store.dispatch({ t: 'reducedMotion', on: e.matches });
});

let callView: HTMLElement | null = null;
let lastScreen: State['screen'] | 'plain' | null = null;

function render(): void {
  const s = store.get();
  const key = s.plain ? 'plain' : s.screen;

  // The call view keeps camera state, GL context and caption timers, so it is
  // built once and reused rather than torn down on every panel change.
  if (key === lastScreen && key === 'call') return;
  lastScreen = key;

  if (key === 'plain') {
    document.body.classList.add('plain');
    clear(root);
    root.appendChild(renderPlain(() => store.dispatch({ t: 'plain', on: false })));
    quests.unlock('plain');
    return;
  }

  document.body.classList.remove('plain');

  // The pre-join screen is static markup in index.html so it paints before the
  // bundle arrives (review U9). On boot it is already on screen and correct —
  // re-rendering it here would throw away the good version for a fallback.
  if (key === 'prejoin' && document.getElementById('prejoin')) return;

  if (key === 'call') {
    clear(root);
    callView = renderCall(store, quests);
    root.appendChild(callView);
    quests.mount(root);
    return;
  }

  if (key === 'ended') {
    clear(root);
    root.appendChild(renderEnd(store, quests, () => store.dispatch({ t: 'plain', on: true })));
    quests.mount(root);
    return;
  }

  // Pre-join is static markup in index.html; if we come back to it, rebuild a
  // minimal version rather than shipping the whole thing twice.
  clear(root);
  root.appendChild(
    h(
      'main',
      { class: 'end', id: 'main' },
      h(
        'div',
        { class: 'end-inner' },
        h('h1', {}, 'Callback'),
        h('p', { class: 'end-lead' }, 'An application from Nam Nguyen, as a call.'),
        h(
          'div',
          { class: 'contact' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => store.dispatch({ t: 'join' }) }, 'Join the call'),
          h('button', { class: 'btn', type: 'button', onclick: () => store.dispatch({ t: 'plain', on: true }) }, 'Read it as a document'),
        ),
      ),
    ),
  );
  quests.mount(root);
}

// ------------------------------------------------------------------ routing --

let suppress = false;
store.subscribe(() => {
  render();
  const hash = routeToHash(store.get());
  if (!suppress && location.hash !== hash) {
    history.pushState(null, '', hash);
  }
});

window.addEventListener('popstate', () => {
  const r = parseRoute(location.hash);
  suppress = true;
  store.dispatch({ t: 'plain', on: !!r.plain });
  if (r.screen === 'call') store.dispatch({ t: 'join' });
  store.dispatch({ t: 'panel', panel: 'none' });
  if (r.panel !== 'none') store.dispatch({ t: 'panel', panel: r.panel });
  if (r.engTab) store.dispatch({ t: 'engTab', tab: r.engTab });
  if (r.spotlight) store.dispatch({ t: 'spotlight', id: r.spotlight });
  suppress = false;
});

// The static pre-join screen in index.html needs wiring before the first render.
document.getElementById('join-btn')?.addEventListener('click', () => store.dispatch({ t: 'join' }));
document.getElementById('plain-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  store.dispatch({ t: 'plain', on: true });
});

// ------------------------------------------------------------ global keys ---

const HELP: [string, string][] = [
  ['C', 'captions on or off'],
  ['E', 'kill the effects'],
  ['L', 'cover letter'],
  ['P', 'participants'],
  ['S', 'screen share'],
  ['G', 'engineering'],
  ['D', 'read it as a document'],
  ['Esc', 'close the panel'],
  ['?', 'this list'],
];

window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
  const s = store.get();

  switch (e.key.toLowerCase()) {
    case 'c': store.dispatch({ t: 'captions', on: !s.captionsOn }); break;
    case 'e': store.dispatch({ t: 'fx', preset: 'off' }); break;
    case 'l': store.dispatch({ t: 'panel', panel: 'chat' }); break;
    case 'p': store.dispatch({ t: 'panel', panel: 'people' }); break;
    case 's': store.dispatch({ t: 'panel', panel: 'present' }); break;
    case 'g': store.dispatch({ t: 'panel', panel: 'eng' }); break;
    case 'd': store.dispatch({ t: 'plain', on: !s.plain }); break;
    case 'escape': if (s.panel !== 'none') store.dispatch({ t: 'panel', panel: s.panel }); break;
    case '?': showHelp(); break;
    default: return;
  }
});

function showHelp(): void {
  if (document.getElementById('help')) return;
  const box = h(
    'div',
    { class: 'help', id: 'help', role: 'dialog', 'aria-label': 'Keyboard shortcuts', 'aria-modal': 'false' },
    h('h3', {}, 'Keyboard'),
    h('dl', { class: 'kv' }, ...HELP.flatMap(([k, v]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, v)])),
    h('button', { class: 'btn btn-sm', type: 'button', onclick: () => box.remove() }, 'Close'),
  );
  document.body.appendChild(box);
  box.querySelector('button')?.focus();
}

konami(() => {
  const view = callView as (HTMLElement & { egg?: () => void }) | null;
  if (view?.egg) view.egg();
  else quests.unlock('konami');
});

// Reading the whole build log is its own quiet achievement.
document.addEventListener(
  'scroll',
  (e) => {
    const el = e.target as HTMLElement;
    if (!el?.classList?.contains('panel-body')) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40 && store.get().engTab === 'log' && store.get().panel === 'eng') {
      quests.unlock('patient');
    }
  },
  true,
);

render();
if (store.get().screen === 'prejoin' && !store.get().plain) quests.mount(root);
