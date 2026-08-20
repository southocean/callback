// The call.
//
// Every control in the bottom bar is a section of the CV. That is the whole
// design: nothing in this interface is decorative, and nothing is a metaphor
// that stops at the edges (review U6).

import { h, clear, icon, icons } from '../dom.js';
import type { Store, Panel } from '../state.js';
import { captionAt } from '../state.js';
import { profile, pitch, roles, transcript } from '../data/cv.js';
import { renderChat, renderPeople, renderPresent, renderTranscript, NOW } from './panels.js';
import { renderOffClock } from './offclock.js';
import { renderEng } from './eng.js';
import { Pipeline } from '../fx/pipeline.js';
import type { FxStats } from '../fx/pipeline.js';
import { rovingGrid, trapFocus, announcer } from '../a11y.js';
import { sample } from '../net/degrade.js';
import type { Profile } from '../net/degrade.js';
import type { Quests } from '../achievements.js';
import { mahjongEasterEgg } from '../achievements.js';

const PANEL_TITLES: Record<Exclude<Panel, 'none'>, string> = {
  chat: 'Cover letter',
  people: 'Participants',
  present: 'Screen share',
  captions: 'Transcript',
  offclock: 'Off the clock',
  eng: 'Engineering',
};

export function renderCall(store: Store, quests: Quests): HTMLElement {
  let fxStats: FxStats = { fps: 0, ms: 0, backend: 'none' };
  let stream: MediaStream | null = null;
  let releaseTrap: (() => void) | null = null;

  const video = h('video', { muted: true, playsinline: true, autoplay: true }) as HTMLVideoElement;
  video.muted = true;
  const canvas = h('canvas', { 'aria-hidden': 'true' }) as HTMLCanvasElement;
  canvas.hidden = true;
  const pipeline = new Pipeline(video, canvas, (s) => {
    fxStats = s;
  });

  // ------------------------------------------------------------- host tile --

  const camNote = h('span', { class: 'cam-note' }, 'Your camera is off. So is mine — let’s talk anyway.');
  const hostVideo = h(
    'div',
    { class: 'host-video' },
    h('div', { class: 'host-avatar', 'aria-hidden': 'true' }, 'NN'),
    video,
    canvas,
    camNote,
  );

  const hostTile = h(
    'div',
    { class: 'tile tile-host' },
    hostVideo,
    h(
      'div',
      { class: 'host-copy' },
      h(
        'div',
        { class: 'host-name' },
        profile.name,
        h('span', { class: 'you' }, 'host · presenting'),
        h('span', { class: 'speaking', 'aria-hidden': 'true' }, h('i', {}), h('i', {}), h('i', {})),
      ),
      h('p', { class: 'host-pitch' }, pitch),
      h(
        'div',
        { class: 'host-meta' },
        h('span', {}, profile.headline),
        h('span', {}, profile.place),
        h('span', {}, profile.languages),
      ),
      h('div', { class: 'host-meta' }, h('span', {}, profile.commute)),
    ),
  );

  // ------------------------------------------------------------ role tiles --

  const tileFor = (kind: string, org: string, role: string, when: string, gist: string, live: boolean, onOpen: () => void): HTMLElement =>
    h(
      'button',
      {
        class: `tile ${kind} ${live ? 'tile-live' : ''}`,
        type: 'button',
        role: 'listitem',
        onclick: onOpen,
      },
      h('span', { class: 'tile-when' }, when),
      h('span', { class: 'tile-kind' }, kind === 'engineering' ? 'Engineering' : kind === 'research' ? 'Research' : kind === 'commercial' ? 'Commercial' : 'Off the clock'),
      h('span', { class: 'tile-org' }, org),
      h('span', { class: 'tile-role' }, role),
      h('span', { class: 'tile-gist' }, gist),
    );

  const tiles = h(
    'div',
    { class: 'tiles', role: 'list', 'aria-label': 'Participants in this call' },
    hostTile,
    ...roles.map((r) =>
      tileFor(r.kind, r.org, r.title, `${r.fromLabel} — ${r.toLabel}`, r.gist, r.to === null, () => {
        store.dispatch({ t: 'panel', panel: 'people' });
      }),
    ),
    tileFor(
      'offclock',
      'Off the clock',
      'Stand-up, SFX makeup, skydiving, a zombie walk',
      'always',
      'Two of these are the reason this page exists. One of them is still trying to get onto Robinson.',
      false,
      () => store.dispatch({ t: 'panel', panel: 'offclock' }),
    ),
  );

  // -------------------------------------------------------------- captions --

  const capText = h('div', { class: 'captions-text' });
  const capLive = h('div', { class: 'sr', 'aria-live': 'polite' });
  const captions = h(
    'div',
    { class: 'captions' },
    h('div', { class: 'captions-label' }, 'Captions · scripted transcript, no audio'),
    capText,
    capLive,
  );
  const announce = announcer(capLive, 1400);

  let t0 = performance.now();
  let capTimer = 0;
  const startCaptions = (): void => {
    if (capTimer) return;
    t0 = performance.now();
    capTimer = window.setInterval(() => {
      const secs = ((performance.now() - t0) / 1000) % (transcript[transcript.length - 1]!.at + 6);
      const line = captionAt(transcript, secs);
      if (line) {
        capText.textContent = '';
        capText.append(h('b', {}, `${line.speaker}: `), line.text);
        announce(line.text);
      }
    }, 900);
  };
  const stopCaptions = (): void => {
    clearInterval(capTimer);
    capTimer = 0;
  };

  // ----------------------------------------------------------------- panel --

  const panelHost = h('div', {});

  const drawPanel = (): void => {
    const s = store.get();
    releaseTrap?.();
    releaseTrap = null;
    clear(panelHost);
    if (s.panel === 'none') return;

    const title = PANEL_TITLES[s.panel];
    const close = h(
      'button',
      { class: 'panel-close', type: 'button', 'aria-label': `Close ${title}`, onclick: () => store.dispatch({ t: 'panel', panel: s.panel }) },
      '×',
    );

    const inner =
      s.panel === 'chat' ? h('div', { class: 'panel-body' }, renderChat())
      : s.panel === 'people' ? h('div', { class: 'panel-body' }, renderPeople())
      : s.panel === 'present' ? h('div', { class: 'panel-body' }, renderPresent(store))
      : s.panel === 'captions' ? h('div', { class: 'panel-body' }, renderTranscript())
      : s.panel === 'offclock' ? h('div', { class: 'panel-body' }, renderOffClock())
      : renderEng(store, () => fxStats, quests);

    const panel = h(
      'aside',
      {
        class: `panel ${s.panel === 'eng' ? 'panel-eng' : ''}`,
        role: 'region',
        'aria-label': title,
        tabindex: '-1',
      },
      h('div', { class: 'panel-head' }, h('h2', {}, title), close),
      inner,
    );

    panelHost.appendChild(panel);
    // Focus is trapped only on narrow screens, where the panel covers the
    // stage. On desktop it sits beside the content, so trapping would be wrong.
    if (window.matchMedia('(max-width:900px)').matches) {
      releaseTrap = trapFocus(panel, () => store.dispatch({ t: 'panel', panel: s.panel }));
    }

    quests.unlock(s.panel === 'eng' ? 'eng' : s.panel);
    if (s.panel === 'eng' && s.engTab === 'story') quests.unlock('story');
  };

  // ----------------------------------------------------------- control bar --

  const ctl = (
    label: string,
    path: string,
    pressed: () => boolean,
    onClick: () => void,
    extraClass = '',
  ): HTMLButtonElement => {
    const b = h(
      'button',
      { class: `ctl ${extraClass}`, type: 'button', 'aria-label': label, 'aria-pressed': 'false', onclick: onClick },
      icon(path),
      h('span', { class: 'ctl-label' }, label),
    ) as HTMLButtonElement;
    (b as HTMLButtonElement & { sync?: () => void }).sync = () => b.setAttribute('aria-pressed', pressed() ? 'true' : 'false');
    return b;
  };

  const camBtn = ctl('Camera', icons.cam, () => store.get().cameraOn, () => void toggleCamera());
  const micBtn = ctl('Microphone', icons.mic, () => store.get().micOn, () => store.dispatch({ t: 'mic', on: !store.get().micOn }));
  const chatBtn = ctl('Cover letter', icons.chat, () => store.get().panel === 'chat', () => store.dispatch({ t: 'panel', panel: 'chat' }));
  const peopleBtn = ctl('Participants', icons.people, () => store.get().panel === 'people', () => store.dispatch({ t: 'panel', panel: 'people' }));
  const presentBtn = ctl('Screen share', icons.present, () => store.get().panel === 'present', () => store.dispatch({ t: 'panel', panel: 'present' }));
  const ccBtn = ctl('Captions', icons.cc, () => store.get().captionsOn, () => store.dispatch({ t: 'captions', on: !store.get().captionsOn }));
  const engBtn = ctl('Engineering', icons.more, () => store.get().panel === 'eng', () => store.dispatch({ t: 'panel', panel: 'eng' }));

  const endBtn = h(
    'button',
    { class: 'ctl ctl-end', type: 'button', onclick: () => store.dispatch({ t: 'leave' }) },
    icon(icons.end),
    'End call',
  );

  const questBadge = h('span', {});
  const bar = h(
    'div',
    { class: 'bar' },
    h('div', { class: 'bar-left' }, questBadge),
    h('div', { class: 'bar-mid' }, camBtn, micBtn, chatBtn, peopleBtn, presentBtn, ccBtn, engBtn),
    h('div', { class: 'bar-right' }, endBtn),
  );

  const drawQuestBadge = (): void => {
    const { got, total } = quests.count();
    clear(questBadge);
    questBadge.append(
      h('span', { style: 'display:block' }, `Side quests ${got}/${total}`),
      h(
        'button',
        {
          class: 'quest-link',
          type: 'button',
          onclick: () => store.dispatch({ t: 'engTab', tab: 'story' }),
        },
        got === total ? 'All done — see the main quest' : 'see the list',
      ),
    );
  };
  drawQuestBadge();
  quests.subscribe(drawQuestBadge);

  // ------------------------------------------------------------- net badge --

  const netBadge = h('div', { class: 'call-net' });
  const drawNet = (): void => {
    const c = sample(store.get().net as Profile, Math.floor(performance.now() / 1600));
    const sev = c.loss > 0.15 ? 'bad' : c.loss > 0.03 ? 'warn' : '';
    clear(netBadge);
    netBadge.append(h('span', { class: `dot ${sev}` }), `${c.label} · ${c.rtt} ms · ${(c.loss * 100).toFixed(1)}% loss`);
    if (store.get().net === 'collapse') quests.unlock('collapse');
  };
  drawNet();
  window.setInterval(drawNet, 1600);

  // ---------------------------------------------------------------- camera --

  async function toggleCamera(): Promise<void> {
    const on = store.get().cameraOn;
    if (on) {
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
    } catch {
      camNote.textContent = 'No camera, or permission declined. Entirely fine — the rest of this works without it.';
      store.dispatch({ t: 'camera', on: false });
    }
  }

  // ------------------------------------------------------------------ sync --

  const sync = (): void => {
    const s = store.get();

    for (const b of [camBtn, micBtn, chatBtn, peopleBtn, presentBtn, ccBtn, engBtn]) {
      (b as HTMLButtonElement & { sync?: () => void }).sync?.();
    }
    camBtn.classList.toggle('off', !s.cameraOn);
    micBtn.classList.toggle('off', !s.micOn);
    clear(camBtn);
    camBtn.append(icon(s.cameraOn ? icons.cam : icons.camOff), h('span', { class: 'ctl-label' }, 'Camera'));
    clear(micBtn);
    micBtn.append(icon(s.micOn ? icons.mic : icons.micOff), h('span', { class: 'ctl-label' }, 'Mic'));

    video.style.display = s.cameraOn ? 'block' : 'none';
    camNote.style.display = s.cameraOn ? 'none' : 'block';
    hostVideo.querySelector('.host-avatar')?.classList.toggle('hidden', s.cameraOn);

    captions.style.display = s.captionsOn ? '' : 'none';
    if (s.captionsOn) startCaptions();
    else stopCaptions();

    pipeline.set(s.fx, s.reducedMotion);
    if (s.fx !== 'off') quests.unlock('fx');
    if (s.chaos) quests.unlock('chaos');
    if (s.cameraOn && !stream) void toggleCamera();
  };

  store.subscribe(() => {
    sync();
    drawPanel();
  });

  // ------------------------------------------------------------- keyboard ---

  // A real <main> landmark, not a div wearing an id. The audit in the
  // Engineering panel caught this one during QA.
  const stage = h('main', { class: 'stage', id: 'main', tabindex: '-1' }, tiles, captions);
  rovingGrid(tiles, '.tile:not(.tile-host)');
  tiles.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key.startsWith('Arrow')) quests.unlock('a11y');
  });

  const shell = h(
    'div',
    { class: 'call' },
    h(
      'div',
      { class: 'call-top' },
      h('div', {}, h('div', { class: 'call-title' }, 'Callback — an application, as a call'), h('div', { class: 'call-sub' }, profile.target)),
      netBadge,
    ),
    h('div', { class: 'call-body' }, stage, panelHost),
    bar,
  );

  // The easter egg lands on the stage, above the tiles.
  (shell as HTMLElement & { egg?: () => void }).egg = () => {
    mahjongEasterEgg(stage, store.get().reducedMotion);
    quests.unlock('konami');
  };

  sync();
  drawPanel();
  quests.unlock('join');

  return shell;
}

export const now = NOW;
