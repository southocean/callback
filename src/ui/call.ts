// The call.
//
// A faithful rebuild of Meet's in-call screen, with the CV mapped onto it. Every
// number here was measured off the live product during the crawl:
//
//   canvas #131314 · top bar 56px · bottom bar 80px
//   control group: [chev 40 + mic 48] [chev 40 + cam 48] [present 56]
//                  [reaction 56] [captions 56] [hand 56] [more 36] [leave 72]
//   all 48px tall at radius 24 · #333537 buttons, #282a2c chevrons,
//   #e3e3e3 icons, #8e918f secondary, leave #dc362e
//   tiles radius 24 on #202124 · side panel 360px, radius 20, inset top 72
//
// Review U7's two-tier rule still holds: the story is in the tiles and the first
// four panels; everything technical lives behind Meeting tools.

import { h, clear } from '../dom.js';
import { sym } from './icons.js';
import type { IconName } from './icons.js';
import type { Store, Panel } from '../state.js';
import { captionAt, clock } from '../state.js';
import { profile, pitch, roles, transcript, referralBlurb } from '../data/cv.js';
import { renderChat, renderPeople, renderPresent } from './panels.js';
import { renderOffClock } from './offclock.js';
import { renderEng } from './eng.js';
import { Pipeline } from '../fx/pipeline.js';
import type { FxStats } from '../fx/pipeline.js';
import { rovingGrid, trapFocus, announcer } from '../a11y.js';
import { sample } from '../net/degrade.js';
import type { Profile } from '../net/degrade.js';
import type { Quests } from '../achievements.js';

const TITLES: Record<Exclude<Panel, 'none'>, string> = {
  chat: 'In-call messages',
  people: 'People',
  present: 'Presenting',
  offclock: 'Off the clock',
  tools: 'Meeting tools',
  host: 'Host controls',
};

const CODE = 'nam-cv-2026';

export interface CallDeps {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  toggleCamera: () => Promise<void>;
}

export function renderCall(store: Store, quests: Quests, deps: CallDeps): HTMLElement {
  let fxStats: FxStats = { fps: 0, ms: 0, backend: 'none' };
  let releaseTrap: (() => void) | null = null;
  const pipeline = new Pipeline(deps.video, deps.canvas, (s) => { fxStats = s; });

  // ------------------------------------------------------------- host tile --

  const hostAvatar = h('div', { class: 'vtile-av', 'aria-hidden': 'true' }, 'NN');
  const hostTile = h(
    'div',
    { class: 'vtile host' },
    deps.video,
    deps.canvas,
    h(
      'div',
      { class: 'vtile-pitch' },
      hostAvatar,
      h('span', { class: 'vt-name' }, profile.name),
      pitch,
    ),
    h('span', { class: 'vtile-label' }, profile.name, h('span', { style: 'color:var(--on-dark2);font-weight:400' }, '· presenting')),
    h(
      'div',
      { class: 'vtile-fx' },
      h(
        'button',
        { type: 'button', 'aria-label': 'Backgrounds and effects', onclick: () => store.dispatch({ t: 'engTab', tab: 'fx' }) },
        sym('visual_effects', 22),
      ),
      h(
        'button',
        { type: 'button', 'aria-label': 'Reframe', onclick: () => store.dispatch({ t: 'panel', panel: 'people' }) },
        sym('frame_person', 22),
      ),
    ),
  );
  // The pitch block sits inside the tile, so centre it as one unit.
  (hostTile.querySelector('.vtile-pitch') as HTMLElement).style.display = 'block';

  // ------------------------------------------------------------ role tiles --

  const tile = (kind: string, org: string, role: string, when: string, gist: string, onOpen: () => void): HTMLElement =>
    h(
      'button',
      { class: 'vtile', type: 'button', role: 'listitem', onclick: onOpen },
      h('span', { class: 'vtile-when' }, when),
      h('span', { class: 'vtile-av', 'aria-hidden': 'true' }, org.slice(0, 1)),
      h('span', { class: 'vtile-sub' }, gist),
      h('span', { class: 'vtile-label' }, org, h('span', { style: 'color:var(--on-dark2);font-weight:400' }, `· ${role}`)),
      h('span', { class: 'vtile-mic' }, sym(kind === 'commercial' ? 'mic_off' : 'mic', 16)),
    );

  const tiles = h(
    'div',
    { class: 'grid', role: 'list', 'aria-label': 'People in this call' },
    hostTile,
    ...roles.map((r) =>
      tile(r.kind, r.org, r.title, `${r.fromLabel} — ${r.toLabel}`, r.gist, () =>
        store.dispatch({ t: 'panel', panel: 'people' }),
      ),
    ),
    tile('offclock', 'Off the clock', 'stand-up, SFX, skydiving', 'always', 'Two of these are the reason this page exists. One is still trying to get onto Robinson.', () =>
      store.dispatch({ t: 'panel', panel: 'offclock' }),
    ),
  );

  // -------------------------------------------------------------- captions --

  const ccText = h('div', { class: 'cc-text' });
  const ccLive = h('div', { class: 'sr', 'aria-live': 'polite' });
  const cc = h(
    'div',
    { class: 'cc' },
    h('div', { class: 'cc-who' }, 'Nam Nguyen · scripted transcript, no audio'),
    ccText,
    ccLive,
  );
  const announce = announcer(ccLive, 1400);
  let t0 = performance.now();
  let ccTimer = 0;
  const startCC = (): void => {
    if (ccTimer) return;
    t0 = performance.now();
    ccTimer = window.setInterval(() => {
      const span = (transcript[transcript.length - 1]?.at ?? 40) + 6;
      const line = captionAt(transcript, ((performance.now() - t0) / 1000) % span);
      if (line) {
        ccText.textContent = line.text;
        announce(line.text);
      }
    }, 900);
  };
  const stopCC = (): void => { clearInterval(ccTimer); ccTimer = 0; };

  // ----------------------------------------------------------------- panel --

  const panelHost = h('div', { style: 'display:contents' });

  const drawPanel = (): void => {
    const s = store.get();
    releaseTrap?.();
    releaseTrap = null;
    clear(panelHost);
    if (s.panel === 'none') return;

    const title = TITLES[s.panel];
    const body =
      s.panel === 'chat' ? h('div', { class: 'side-body' }, renderChat())
      : s.panel === 'people' ? h('div', { class: 'side-body' }, renderPeople())
      : s.panel === 'present' ? h('div', { class: 'side-body' }, renderPresent(store))
      : s.panel === 'offclock' ? h('div', { class: 'side-body' }, renderOffClock())
      : s.panel === 'host' ? h('div', { class: 'side-body' }, hostControls(store))
      : renderEng(store, () => fxStats, quests);

    const panel = h(
      'aside',
      {
        class: `side ${s.panel === 'tools' ? 'wide' : ''}`,
        role: 'region',
        'aria-label': title,
        tabindex: '-1',
      },
      h(
        'div',
        { class: 'side-head' },
        h('h2', {}, title),
        h(
          'button',
          {
            class: 'icon-btn',
            type: 'button',
            'aria-label': `Close ${title}`,
            onclick: () => store.dispatch({ t: 'panel', panel: s.panel }),
          },
          sym('close', 22),
        ),
      ),
      body,
    );

    panelHost.appendChild(panel);
    if (window.matchMedia('(max-width:960px)').matches) {
      releaseTrap = trapFocus(panel, () => store.dispatch({ t: 'panel', panel: s.panel }));
    }
    quests.unlock(s.panel);
  };

  // ----------------------------------------------------------- control bar --

  type Btn = HTMLButtonElement & { sync?: () => void };

  const cbtn = (
    label: string,
    icon: IconName,
    cls: string,
    onClick: () => void,
    state?: () => { on: boolean; icon?: IconName; label?: string },
  ): Btn => {
    const b = h('button', { class: `cbtn ${cls}`, type: 'button', 'aria-label': label, onclick: onClick }, sym(icon, 22)) as Btn;
    if (state) {
      b.sync = () => {
        const st = state();
        b.setAttribute('aria-pressed', st.on ? 'true' : 'false');
        b.setAttribute('aria-label', st.label ?? label);
        clear(b);
        b.appendChild(sym(st.icon ?? icon, 22));
      };
    }
    return b;
  };

  const chev = (label: string, onClick: () => void): HTMLButtonElement =>
    h('button', { class: 'chev', type: 'button', 'aria-label': label, onclick: onClick }, sym('keyboard_arrow_up', 20)) as HTMLButtonElement;

  const micBtn = cbtn('Turn on microphone', 'mic_off', 'w48', () => {
    const on = !store.get().micOn;
    store.dispatch({ t: 'mic', on });
    if (on) toast('Microphone on', 'There is no audio here to send. The transcript in the captions is the script.');
  }, () => {
    const on = store.get().micOn;
    return { on, icon: on ? 'mic' : 'mic_off', label: on ? 'Turn off microphone' : 'Turn on microphone' };
  });

  const camBtn = cbtn('Turn on camera', 'videocam_off', 'w48', () => { void deps.toggleCamera(); }, () => {
    const on = store.get().cameraOn;
    return { on, icon: on ? 'videocam' : 'videocam_off', label: on ? 'Turn off camera' : 'Turn on camera' };
  });

  const presentBtn = cbtn('Present now', 'present_to_all', '', () => store.dispatch({ t: 'panel', panel: 'present' }),
    () => ({ on: store.get().panel === 'present' }));

  const reactBtn = cbtn('Send a reaction', 'mood', '', () => reactions(), () => ({ on: false }));

  const ccBtn = cbtn('Turn on captions', 'closed_caption', '', () => store.dispatch({ t: 'captions', on: !store.get().captionsOn }),
    () => ({ on: store.get().captionsOn, label: store.get().captionsOn ? 'Turn off captions' : 'Turn on captions' }));

  const handBtn = cbtn('Raise hand', 'back_hand', '', () => {
    const on = !store.get().handRaised;
    store.dispatch({ t: 'hand', on });
    if (on) {
      quests.unlock('hand');
      toast('You raised your hand', 'Noted. That is more or less what this whole page is.');
    }
  }, () => ({ on: store.get().handRaised, label: store.get().handRaised ? 'Lower hand' : 'Raise hand' }));

  const moreBtn = cbtn('More options', 'more_vert', 'w36', () => menu(), () => ({ on: false }));

  const leaveBtn = h(
    'button',
    { class: 'cbtn leave', type: 'button', 'aria-label': 'Leave call', onclick: () => store.dispatch({ t: 'leave' }) },
    sym('call_end', 22),
  );

  const sideBtn = (label: string, icon: IconName, panel: Panel): Btn => {
    const b = h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, onclick: () => store.dispatch({ t: 'panel', panel }) }, sym(icon, 22)) as Btn;
    b.sync = () => b.setAttribute('aria-pressed', store.get().panel === panel ? 'true' : 'false');
    return b;
  };
  const chatBtn = sideBtn('Chat with everyone', 'chat', 'chat');
  const toolsBtn = sideBtn('Meeting tools', 'apps', 'tools');
  const hostBtn = sideBtn('Host controls', 'lock_person', 'host');

  const questLine = h('div', {});
  const bar = h(
    'div',
    { class: 'bar' },
    h('div', { class: 'bar-left' }, questLine),
    h(
      'div',
      { class: 'bar-group', 'aria-label': 'Call controls', role: 'group' },
      h('div', { class: 'unit' }, chev('Audio settings', () => store.dispatch({ t: 'engTab', tab: 'net' })), micBtn),
      h('div', { class: 'unit' }, chev('Video settings', () => store.dispatch({ t: 'engTab', tab: 'fx' })), camBtn),
      presentBtn, reactBtn, ccBtn, handBtn, moreBtn, leaveBtn,
    ),
    h('div', { class: 'bar-right' }, chatBtn, toolsBtn, hostBtn),
  );

  const drawQuests = (): void => {
    const { got, total } = quests.count();
    clear(questLine);
    questLine.append(
      h('span', {}, `Side quests ${got}/${total}`),
      h('button', { type: 'button', onclick: () => store.dispatch({ t: 'engTab', tab: 'spec' }) },
        got === total ? 'all done — see the main quest' : 'see the list'),
    );
  };
  drawQuests();
  quests.subscribe(drawQuests);

  // ------------------------------------------------------------- top bar ----

  const clockEl = h('span', { class: 'call-clock' }, clock(new Date()));
  window.setInterval(() => { clockEl.textContent = clock(new Date()); }, 20000);

  const countChip = h(
    'button',
    { class: 'count-chip', type: 'button', 'aria-label': 'Show people', onclick: () => store.dispatch({ t: 'panel', panel: 'people' }) },
    sym('group', 18),
    String(roles.length + 2),
  );

  const netChip = h('span', { class: 'count-chip', style: 'background:transparent;cursor:default' });
  const drawNet = (): void => {
    const c = sample(store.get().net as Profile, Math.floor(performance.now() / 1600));
    clear(netChip);
    netChip.append(sym('speed', 18), `${c.label} · ${c.rtt} ms`);
    if (store.get().net === 'collapse') quests.unlock('collapse');
  };
  drawNet();
  window.setInterval(drawNet, 1600);

  const top = h(
    'header',
    { class: 'call-top' },
    clockEl,
    h('span', { class: 'call-sep' }, '|'),
    h('span', { class: 'call-code' }, CODE),
    h(
      'button',
      { class: 'icon-btn on-dark', type: 'button', 'aria-label': 'Meeting details', onclick: () => store.dispatch({ t: 'readyCard', on: true }) },
      sym('info', 20),
    ),
    h('div', { class: 'call-top-right' }, netChip, countChip),
  );

  // ------------------------------------------------- "meeting's ready" card --

  const readyHost = h('div', {});
  const drawReady = (): void => {
    clear(readyHost);
    if (!store.get().readyCard) return;
    readyHost.appendChild(
      h(
        'div',
        { class: 'ready', role: 'region', 'aria-label': "Your meeting's ready" },
        h(
          'button',
          { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: () => store.dispatch({ t: 'readyCard', on: false }) },
          sym('close', 20),
        ),
        h('h2', {}, "Your meeting's ready"),
        h(
          'button',
          {
            class: 'm-btn m-filled',
            type: 'button',
            onclick: () => {
              void navigator.clipboard?.writeText(referralBlurb + location.href.split('#')[0]).then(
                () => toast('Copied', 'A fact-only referral paragraph, ready to paste into the form.'),
                () => toast('Clipboard blocked', 'It is in Host controls too, where you can select it by hand.'),
              );
              quests.unlock('host');
            },
          },
          sym('person_add', 18),
          'Copy the referral note',
        ),
        h('p', { style: 'margin-top:14px' }, 'Or share this link with anyone who should see it'),
        h(
          'div',
          { class: 'ready-link' },
          h('span', {}, location.href.split('#')[0].replace(/^https?:\/\//, '')),
          h(
            'button',
            {
              class: 'icon-btn',
              type: 'button',
              'aria-label': 'Copy link',
              onclick: () => { void navigator.clipboard?.writeText(location.href.split('#')[0]); toast('Link copied', ''); },
            },
            sym('content_copy', 20),
          ),
        ),
        h(
          'div',
          { class: 'ready-fine' },
          sym('shield', 18),
          h('p', {}, 'Nothing here is uploaded and there is no backend. Open the Network tab and watch nothing happen.'),
        ),
      ),
    );
  };

  // ------------------------------------------------------ toasts, menus ----

  const layer = h('div', {});

  function toast(title: string, body: string): void {
    const el = h(
      'div',
      { class: 'snack', role: 'status' },
      h('div', {}, h('b', {}, title), body ? h('span', {}, body) : null),
      h('button', { type: 'button', onclick: () => el.remove() }, 'Dismiss'),
    );
    layer.appendChild(el);
    window.setTimeout(() => el.remove(), 6000);
  }

  function reactions(): void {
    quests.unlock('react');
    const set = ['🎲', '🀄', '🪂', '🎤', '👏', '🧟'];
    const pick = set[Math.floor(((performance.now() / 97) % set.length))] ?? '👏';
    const el = h('div', { class: 'reaction' }, pick);
    el.style.setProperty('--dx', `${((performance.now() % 80) - 40).toFixed(0)}px`);
    layer.appendChild(el);
    window.setTimeout(() => el.remove(), 2400);
  }

  function menu(): void {
    if (layer.querySelector('.menu')) { clear(layer); return; }
    const item = (icon: IconName, label: string, run: () => void): HTMLElement =>
      h('button', { class: 'menu-item', type: 'button', onclick: () => { clear(layer); run(); } }, sym(icon, 20), label);
    const box = h(
      'div',
      { class: 'menu', role: 'menu', 'aria-label': 'More options' },
      item('mood', 'Off the clock', () => store.dispatch({ t: 'panel', panel: 'offclock' })),
      item('visual_effects', 'Apply visual effects', () => store.dispatch({ t: 'engTab', tab: 'fx' })),
      item('science', 'Run the test suite', () => store.dispatch({ t: 'engTab', tab: 'tests' })),
      item('description', 'Read it as a document', () => store.dispatch({ t: 'plain', on: true })),
      item('keyboard', 'Keyboard shortcuts', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))),
    );
    layer.appendChild(box);
    (box.querySelector('button') as HTMLButtonElement | null)?.focus();
    const off = (e: MouseEvent): void => {
      if (!box.contains(e.target as Node)) { clear(layer); document.removeEventListener('click', off, true); }
    };
    window.setTimeout(() => document.addEventListener('click', off, true), 0);
  }

  // ------------------------------------------------------------------ sync --

  const sync = (): void => {
    const s = store.get();
    for (const b of [micBtn, camBtn, presentBtn, reactBtn, ccBtn, handBtn, moreBtn, chatBtn, toolsBtn, hostBtn]) b.sync?.();
    micBtn.classList.toggle('off', !s.micOn);
    camBtn.classList.toggle('off', !s.cameraOn);
    handBtn.classList.toggle('active', s.handRaised);
    ccBtn.classList.toggle('active', s.captionsOn);
    presentBtn.classList.toggle('active', s.panel === 'present');

    deps.video.style.display = s.cameraOn ? 'block' : 'none';
    (hostTile.querySelector('.vtile-pitch') as HTMLElement).style.opacity = s.cameraOn ? '0' : '1';
    hostTile.classList.toggle('speaking-ring', s.captionsOn);

    cc.style.display = s.captionsOn ? '' : 'none';
    if (s.captionsOn) startCC(); else stopCC();

    pipeline.set(s.fx, s.reducedMotion);
    if (s.fx !== 'off') quests.unlock('fx');
    if (s.chaos) quests.unlock('chaos');
    drawReady();
  };

  store.subscribe(() => { sync(); drawPanel(); });

  // --------------------------------------------------------------- assemble --

  const stage = h('main', { class: 'grid-wrap', id: 'main', tabindex: '-1' }, tiles);
  rovingGrid(tiles, '.vtile:not(.host)');
  tiles.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key.startsWith('Arrow')) quests.unlock('a11y'); });

  const shell = h(
    'div',
    { class: 'call' },
    top,
    h('div', { class: 'call-mid' }, stage, panelHost),
    cc,
    bar,
    readyHost,
    layer,
  );

  sync();
  drawPanel();
  quests.unlock('join');
  return shell;
}

// --------------------------------------------------------------------------
// Host controls — Meet's admin drawer, holding this CV's admin: the document,
// the file, and the paragraph the referrer has to write (review H4).
// --------------------------------------------------------------------------

function hostControls(store: Store): HTMLElement {
  const url = location.href.split('#')[0] ?? '';
  const text = referralBlurb + url;
  const copy = h(
    'button',
    {
      class: 'mbtn fill',
      type: 'button',
      onclick: () => {
        void navigator.clipboard?.writeText(text).then(
          () => (copy.textContent = 'Copied'),
          () => (copy.textContent = 'Select it by hand — clipboard blocked'),
        );
      },
    },
    'Copy',
  );

  return h(
    'div',
    {},
    h('p', { class: 'pnote' }, 'Meet keeps the awkward administrative things behind this door. So does this.'),
    h('div', { class: 'shead' }, 'For my referrer'),
    h(
      'p',
      { class: 'pnote' },
      'A friend on the Meet team offered to refer me, which is generous and is the reason this exists at all — the ' +
        'work is still mine to defend. Referral forms want a paragraph at an awkward hour, so here is one already ' +
        'written: fact-only, no superlatives, every sentence checkable against the CV.',
    ),
    h('div', { class: 'relevance', style: 'font-size:12.5px' }, text),
    h('div', { style: 'margin:12px 0 4px' }, copy),
    h('div', { class: 'shead' }, 'Take it away with you'),
    h(
      'div',
      { style: 'display:flex;gap:8px;flex-wrap:wrap' },
      h('a', { class: 'mbtn', href: 'NamNguyen_CV_2026.pdf', download: true }, 'Download the PDF'),
      h('button', { class: 'mbtn', type: 'button', onclick: () => store.dispatch({ t: 'plain', on: true }) }, 'Read as a document'),
      h('a', { class: 'mbtn', href: `mailto:${profile.emailUser}@${profile.emailHost}?subject=Google%20Meet%20web%20—%20Stockholm` }, 'Email me'),
    ),
    h('div', { class: 'shead' }, 'Links'),
    h(
      'div',
      { class: 'kv' },
      ...profile.links.flatMap((l) => [
        h('dt', {}, l.label),
        h('dd', {}, h('a', { href: l.href }, l.handle)),
      ]),
    ),
    h(
      'p',
      { class: 'pnote', style: 'margin-top:18px' },
      'Not affiliated with, endorsed by, or built at Google. The interface is an homage, rebuilt from the outside; ' +
        'no Google marks are used.',
    ),
  );
}
