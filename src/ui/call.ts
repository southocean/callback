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
import { ripple, attachMenu, micMeter, menu as gmMenu, warnBadge } from './gm3.js';
import { tipAll } from './tooltip.js';
import type { MenuItem } from './gm3.js';
import type { IconName } from './icons.js';
import type { Store, Panel } from '../state.js';
import { captionAt, clock } from '../state.js';
import { profile, pitch, roles, transcript, referralBlurb, SITE } from '../data/cv.js';
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
        sym('auto_awesome', 22),
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

  /**
   * Nam's instruction for this screen was "clone exactly everything we see in
   * the original… we make it right first, then we make it ours after". So the
   * call view is Meet's single-participant view, measured:
   *
   *   tile        55,72 1329x748 radius 24   (16,72 1032x748 with a panel open)
   *   layer 1     participant colour #c4b3dc
   *   layer 2     the avatar again, blown up and blurred, filling the tile
   *   layer 3     a scrim, rgba(0, 46, 105, 0.5)
   *   layer 4     the crisp avatar, 96x96, centred
   *   name        16 in from the left, 15 up from the bottom, 500 16/24 white
   *
   * That stack is where the dark blue "gradient" comes from — it is a blue wash
   * over a blurred copy of the same photo, not a gradient at all.
   *
   * We have no photo asset, only initials, so layer 2 is a soft radial in the
   * avatar's own colour rather than a real blur. Flagged rather than pretended:
   * the structure and the scrim are Meet's, the blur source is not.
   *
   * THE GRID BELOW IS KEPT AND NOT RENDERED. It is the whole CV — the pitch, the
   * roles, the clips — and tomorrow's work adds it back on top of this. Deleting
   * it would make that job start with archaeology.
   */
  const soloTile = (): HTMLElement => {
    const t = h(
      'div',
      { class: 'solo', role: 'group', 'aria-label': profile.name },
      h('div', { class: 'solo-blur', 'aria-hidden': 'true' }),
      h('div', { class: 'solo-scrim', 'aria-hidden': 'true' }),
      h('div', { class: 'solo-av', 'aria-hidden': 'true' }, 'NN'),
      h('span', { class: 'solo-name' }, profile.name),
      micMeter(),
    );
    // The three controls Meet floats over its own tile, at 656 / 700 / 744.
    const fx = (icon: IconName, label: string, cls: string): HTMLElement => {
      const b = h('button', { class: 'solo-ctl ' + cls, type: 'button', 'aria-label': label }, sym(icon, 20)) as HTMLButtonElement;
      ripple(b);
      tipAll(b);
      return b;
    };
    const more = fx('more_vert', 'More options for ' + profile.name, 'solo-more');
    attachMenu(more, (): MenuItem[] => [
      { label: 'Remove this tile' },
      { icon: 'close_fullscreen', label: 'Minimize' },
      { icon: 'keep', label: 'Pin to the screen' },
      { icon: 'aspect_ratio', label: 'Show my full video to everyone' },
    ], { align: 'right', side: 'above', width: 247, cls: 'gm-dark' });
    t.append(h('div', { class: 'solo-ctls' },
      fx('frame_person', 'Reframe', ''),
      fx('blur_on', 'Backgrounds and effects', ''),
      more));
    return t;
  };

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
    // Meet shrinks the tile when a panel opens rather than overlaying it:
    // 16 + 1032 + 17 + 358 + 17 = 1440. The class is what lets the CSS do that.
    document.body.classList.toggle('has-panel', s.panel !== 'none');
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
    const b = h('button', { class: `cbtn ${cls}`, type: 'button', 'aria-label': label, onclick: onClick }, sym(icon, 24)) as Btn;
    // Meet tips every bar control, and the glyphs are 24px not 22 — measured at
    // dx 12 / dy 12 inside the 48x48 buttons.
    ripple(b);
    tipAll(b);
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

  const chev = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = h('button', { class: 'chev', type: 'button', 'aria-label': label, onclick: onClick }, sym('keyboard_arrow_up', 20)) as HTMLButtonElement;
    // Inert device pickers — this page has no devices to choose between — but
    // they ripple and they tip, same call as the pre-join carets.
    ripple(b);
    tipAll(b);
    return b;
  };

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

  const presentBtn: Btn = cbtn('Share screen', 'present_to_all', '', () => { void openPicker(); },
    () => ({ on: store.get().panel === 'present' }));

  const reactBtn = cbtn('Send a reaction', 'mood', '', () => setTray(!trayOpen),
    () => ({ on: trayOpen }));

  const ccBtn = cbtn('Turn on captions', 'closed_caption', '', () => store.dispatch({ t: 'captions', on: !store.get().captionsOn }),
    () => ({ on: store.get().captionsOn, label: store.get().captionsOn ? 'Turn off captions' : 'Turn on captions' }));

  const handBtn = cbtn('Raise hand', 'back_hand', '', () => {
    const on = !store.get().handRaised;
    store.dispatch({ t: 'hand', on });
    if (on) slap();
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
      h('div', { class: 'unit' }, chev('Audio settings', () => store.dispatch({ t: 'engTab', tab: 'net' })), micBtn, warnBadge()),
      h('div', { class: 'unit' }, chev('Video settings', () => store.dispatch({ t: 'engTab', tab: 'fx' })), camBtn, warnBadge()),
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
              void navigator.clipboard?.writeText(referralBlurb + SITE).then(
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
          h('span', {}, SITE.replace(/^https?:\/\//, '')),
          h(
            'button',
            {
              class: 'icon-btn',
              type: 'button',
              'aria-label': 'Copy link',
              onclick: () => { void navigator.clipboard?.writeText(SITE); toast('Link copied', ''); },
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

  const handPill = h('div', { class: 'hand-pill', role: 'status' },
    sym('back_hand', 20), h('span', {}, profile.name)) as HTMLElement;
  handPill.hidden = true;

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

  /**
   * Reactions, and this is the one Nam asked about directly. Measured on the
   * live call rather than guessed:
   *
   *   - they do NOT appear in the middle or above the speaker. Six consecutive
   *     reactions landed at x = 159, 56, 168, 47, 177, 100 against a tile
   *     spanning 55..1384 — a randomised band about 130px wide at the tile's
   *     BOTTOM-LEFT. One of them, 47, is outside the tile's left edge.
   *   - each starts about 55px above the tile's bottom.
   *   - the rise is 9px every 66ms, dead constant: 132 px/s, LINEAR, no easing,
   *     and x never changes once it has spawned.
   *   - the emoji is 53px, and it travels a 508px track, so ~3.8s end to end.
   *
   * Our own emoji set, per Nam. The behaviour is what is being mirrored.
   */
  const REACT_SET = ['🎲', '🀄', '🪂', '🎤', '👏', '🧟'];

  /**
   * Re-measured 2026-08-22, and it corrected two things this file previously
   * asserted as measured. Both are in tools/baseline-call.md.
   *
   * 1. The band is NOT at the tile's bottom-left. At 2560 it sits in the call
   *    area's LEFT MARGIN, outside the tile entirely — two bursts of six put
   *    every reaction between x 73 and x 327 against a tile starting at 384.
   *    We were anchoring inside the tile, which at a wide viewport puts them
   *    somewhere Meet never does. The two only coincide when the tile fills the
   *    width, which is why the old reading and Nam's screenshot could both look
   *    right.
   * 2. The name chip TRACKS its emoji. Every chip sat directly under its own
   *    emoji at the same x. The old code pinned it at a fixed 3px and carried a
   *    comment insisting Meet did the same. It does not.
   *
   * Reactions are not in the DOM in Meet — no nodes, no canvas, no shadow root —
   * so all of this is read off screenshots, and the timing was never captured.
   * RISE is therefore still the older figure and is NOT re-measured; it is the
   * one number here left on trust rather than evidence.
   */
  let reactSeq = 0;
  const BAND_X = 73;     // px from the call area's left edge
  const BAND_W = 254;    // measured spread, one viewport only — may not scale
  const RISE = 132;      // px per second, linear. NOT re-measured.

  /**
   * ONE element, not two. The emoji and its chip were siblings with separate
   * animations, which is exactly why Nam saw the chip fade out early and the
   * emoji follow seconds later: two timelines started in the same frame drift
   * the moment their durations differ. A wrapper makes desync impossible, and
   * hands us the 6px gap and the centring for free from flex.
   *
   * Measured live:
   *
   *   emoji  53x53, and in Meet an ANIMATED WebP (.../1f44f/512.webp)
   *   chip   41x22, #8ab4f8, radius 22, 500 14px, ink #3c4043
   *   gap    chipTop 770 - emojiBottom 764 = 6
   *   centre emoji 35..88 -> 61.5, chip 41..82 -> 61.5
   *   rise   140 px/s linear, x fixed for the whole life
   *   fade   holds 1.0 to t=2851 at y=368 on a 900 viewport — just above the
   *          midpoint — and both are gone by t=3651
   */
  function fire(pick: string): void {
    quests.unlock('react');
    // A FIXED travel, not the tile height. The previous round tied it to the
    // tile so it would stay right when the tray shrinks things — a reasonable
    // instinct that breaks the measured fade, because Meet fades at a screen
    // POSITION (y 368 on a 900 viewport, just above the midpoint) and that only
    // lands at 78% of the life if the travel is Meet's own ~510px. Tying it to
    // a 696px tile pushed the fade up to y 224, far too high and far too late.
    const tileH = 510;
    const rx = BAND_X + Math.round(Math.random() * BAND_W);
    const el = h(
      'div',
      { class: 'reaction' },
      h('span', { class: 'reaction-em' }, pick),
      h('span', { class: 'reaction-who' }, 'You'),
    );
    el.style.setProperty('--rx', `${rx}px`);
    el.style.setProperty('--rise', `${Math.round(tileH)}px`);
    el.style.setProperty('--dur', `${(tileH / RISE).toFixed(2)}s`);
    // A different phase per reaction so a burst does not pulse in lockstep.
    el.style.setProperty('--phase', `-${(reactSeq % 6) * 130}ms`);
    reactSeq += 1;
    layer.appendChild(el);
    window.setTimeout(() => el.remove(), (tileH / RISE) * 1000 + 200);
  }

  /**
   * The tray. Meet reserves 52px for it and the tile refits — see the keystone
   * note in styles.css. Buttons are 40x40 on a 40px pitch, measured.
   *
   * Meet also carries a skin-tone control after a 12px gap. Left out: it sets a
   * Google account preference we have no equivalent for, and an inert control
   * that looks configurable is worse than one that is absent.
   */
  let trayOpen = false;
  const tray = h('div', { class: 'tray', role: 'group', 'aria-label': 'Send a reaction' });
  for (const e of REACT_SET) {
    const b = h('button', { class: 'tray-btn', type: 'button', 'aria-label': e }, e) as HTMLButtonElement;
    // The one place a skin tone means anything on this page: the hand glyphs.
    b.addEventListener('click', () => {
      const tinted = /\u{1F44F}|\u{1F44D}|\u{1F44E}/u.test(e) && tone ? e + tone : e;
      fire(tinted);
    });
    ripple(b);
    tray.appendChild(b);
  }
  /**
   * The skin tone control sits OUTSIDE the emoji pill — 912,780 against a pill
   * ending at 900 — which is why the screenshots read as a row plus a separate
   * circle. Its popup is 695,732 256x40, #282a2c at radius 8 WITH a shadow,
   * right-aligned to the button and 48 above the emoji row.
   *
   * Six tones, Meet's own labels. It sets a real preference here: the chosen
   * tone is applied to the hand glyphs in our set, which is the only place a
   * skin tone means anything on this page.
   */
  const TONES: [string, string][] = [
    ['', 'Unspecified skin tone'],
    ['\u{1F3FB}', 'Light skin tone'],
    ['\u{1F3FC}', 'Medium-light skin tone'],
    ['\u{1F3FD}', 'Medium skin tone'],
    ['\u{1F3FE}', 'Medium-dark skin tone'],
    ['\u{1F3FF}', 'Dark skin tone'],
  ];
  let tone = '';
  const tonePop = h('div', { class: 'tone-pop', role: 'radiogroup', 'aria-label': 'Skin tone' });
  tonePop.hidden = true;
  const toneBtn = h('button', {
    class: 'tone-btn', type: 'button',
    'aria-label': 'Skin tone. Unspecified skin tone selected.',
    'aria-expanded': 'false',
  }, h('span', { class: 'tone-swatch' })) as HTMLButtonElement;
  ripple(toneBtn);
  tipAll(toneBtn);
  const setTone = (t: string, label: string): void => {
    tone = t;
    toneBtn.setAttribute('aria-label', `Skin tone. ${label} selected.`);
    toneBtn.style.setProperty('--tone', t ? 'none' : 'none');
    for (const b of tonePop.querySelectorAll('button')) {
      b.setAttribute('aria-checked', b.getAttribute('data-tone') === t ? 'true' : 'false');
    }
    toneBtn.dataset.tone = t;
  };
  for (const [t, label] of TONES) {
    const b = h('button', {
      class: 'tone-opt', type: 'button', role: 'radio', 'aria-label': label,
      'data-tone': t, 'aria-checked': t === '' ? 'true' : 'false',
    }, h('span', { class: 'tone-swatch', 'data-tone': t })) as HTMLButtonElement;
    ripple(b);
    b.addEventListener('click', () => { setTone(t, label); toneOpen(false); });
    tonePop.appendChild(b);
  }
  const toneOpen = (v: boolean): void => {
    tonePop.hidden = !v;
    toneBtn.setAttribute('aria-expanded', String(v));
  };
  toneBtn.addEventListener('click', () => toneOpen(tonePop.hidden === true));
  document.addEventListener('pointerdown', (e) => {
    if (tonePop.hidden) return;
    if (tonePop.contains(e.target as Node) || toneBtn.contains(e.target as Node)) return;
    toneOpen(false);
  }, true);

  tray.hidden = true;
  const trayWrap = h('div', { class: 'tray-wrap' }, tonePop, tray, toneBtn);
  trayWrap.hidden = true;

  function setTray(v: boolean): void {
    trayOpen = v;
    tray.hidden = !v;
    trayWrap.hidden = !v;
    if (!v) toneOpen(false);
    document.body.classList.toggle('tray-open', v);
    reactBtn.classList.toggle('is-active', v);
    reactBtn.sync?.();
  }

  /**
   * Screen share. The picker and everything it offers is a mockup — Chrome's
   * real dialog is native, invisible to a tab screenshot, and unmeasurable from
   * the page, so there was never anything to clone. See ui/share.ts for why it
   * renders as DOM rather than iframes (the CSP forbids frames outright).
   *
   * Deferred, because it carries four authored pages and a desktop and the
   * initial bundle is budgeted at 50 kB gzip in CI.
   */
  const shareHost = h('div', {});
  let sharing: { el: HTMLElement } | null = null;

  async function openPicker(): Promise<void> {
    const m = await import('./share.js');
    const close = (): void => {
      const cur = shareHost.firstElementChild as (HTMLElement & { dispose?: () => void }) | null;
      cur?.dispose?.();
      clear(shareHost);
    };
    shareHost.appendChild(m.renderPicker({
      onCancel: close,
      onShare: (src) => { close(); startShare(m.renderShared(src), src.title); },
    }));
  }

  function startShare(content: HTMLElement, title: string): void {
    stopShare();
    const stop = h('button', { class: 'shot-stop', type: 'button' }, 'Stop sharing') as HTMLButtonElement;
    ripple(stop);
    stop.addEventListener('click', () => stopShare());
    const wrap = h('div', { class: 'shot-wrap' },
      content,
      h('div', { class: 'shot-banner' }, h('span', {}, `You are presenting ${title}`), stop));
    const solo = stage.querySelector('.solo');
    (solo ?? stage).appendChild(wrap);
    sharing = { el: wrap };
    presentBtn.classList.add('is-active');
    presentBtn.sync?.();
    quests.unlock('present');
    announce(`Presenting ${title}`);
  }

  function stopShare(): void {
    sharing?.el.remove();
    sharing = null;
    presentBtn.classList.remove('is-active');
    presentBtn.sync?.();
  }

  /**
   * THE ONE CONTROL THAT MISBEHAVES.
   *
   * Everything else in this build is a clone, measured and deferred to. This is
   * not, and it is deliberate: a page that only ever copies proves diligence and
   * nothing else. The reactions already carry Nam's own set rather than Meet's;
   * this escalates that. You press a control you have pressed a hundred times in
   * the real product, and a hand comes at the glass.
   *
   * It is built to be tuned rather than argued about. SCARE is the only dial:
   * 0 is a polite nudge, 1 is the full slap. Everything below scales off it, so
   * Nam can find the level without touching the choreography.
   *
   * Three deliberate restraints, none of them a climbdown:
   *   - it fires ONCE per raise, on the way up only. Lowering your hand is
   *     quiet, so the gag cannot be farmed into an annoyance.
   *   - it is one flash, not a strobe. A repeating flash would be a genuinely
   *     different thing — the audit panel asserts nothing above 3 Hz, and a
   *     single transition is not a frequency.
   *   - pointer-events stay off throughout, so it never eats a click. A
   *     recruiter who presses this by accident loses no progress.
   *
   * Nam ruled out a reduced-motion exemption for this and that is respected:
   * the joke lands the same for everyone. The audit will say what it says.
   */
  const SCARE = 0.85;

  function slap(): void {
    quests.unlock('hand');
    quests.unlock('slap');
    const hand = h('div', { class: 'slap-hand', 'aria-hidden': 'true' }, '✋');
    const flash = h('div', { class: 'slap-flash', 'aria-hidden': 'true' });
    const wrap = h('div', { class: 'slap' }, flash, hand);
    wrap.style.setProperty('--scare', String(SCARE));
    layer.appendChild(wrap);
    // The shake rides the whole call surface, not the overlay, so the interface
    // itself takes the hit rather than the drawing of the hand.
    stage.classList.add('slapped');
    window.setTimeout(() => stage.classList.remove('slapped'), 420);
    window.setTimeout(() => wrap.remove(), 1500);
    // Said out loud for anyone on a screen reader, who gets the joke as text
    // rather than as motion.
    announce('A hand hits the screen. That was the one control that lied to you.');
  }

  /**
   * Meet's bar overflow, measured at 886,243 225x578 — eleven rows of 48 plus
   * two 17px rules, which is exactly what 8 + 11*48 + 8 = 544 against 578
   * accounts for.
   *
   * Every row is inert. Nam's call, and the right one for a clone: each of these
   * opens a product we are not cloning. They still ripple, still take focus,
   * still close — a row that does not respond feels broken in a way an inert one
   * does not.
   *
   * Five glyphs are substitutions, because Meet draws from Google Symbols and we
   * ship the open Material Symbols subset: youtube_live -> bolt,
   * radio_button_checked -> science, dashboard -> apps, dropdown ->
   * present_to_all, report -> shield.
   */
  function menu(): void {
    if (layer.querySelector('.gm-menu')) { clear(layer); return; }
    const rows: MenuItem[] = [
      { icon: 'bolt', label: 'Streaming' },
      { icon: 'science', label: 'Recording' },
      { icon: 'apps', label: 'Adjust view', ruleBefore: true },
      { icon: 'aspect_ratio', label: 'Full screen' },
      { icon: 'present_to_all', label: 'Open picture-in-picture' },
      { icon: 'blur_on', label: 'Backgrounds and effects' },
      { icon: 'phone_forwarded', label: 'Use a phone for audio' },
      { icon: 'feedback', label: 'Report a problem', ruleBefore: true },
      { icon: 'shield', label: 'Report abuse' },
      { icon: 'troubleshoot', label: 'Troubleshooting & help' },
      { icon: 'settings', label: 'Settings' },
    ];
    const box = gmMenu(rows, 225);
    box.classList.add('gm-dark');
    const wrap = h('div', { class: 'gm-pop call-more' }, box);
    layer.appendChild(wrap);
    const first = box.querySelector('li');
    if (first) (first as HTMLElement).focus();
    const off = (e: Event): void => {
      if (!wrap.contains(e.target as Node)) { clear(layer); document.removeEventListener('pointerdown', off, true); }
    };
    window.setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  }

  // ------------------------------------------------------------------ sync --

  const sync = (): void => {
    const s = store.get();
    for (const b of [micBtn, camBtn, presentBtn, reactBtn, ccBtn, handBtn, moreBtn, chatBtn, toolsBtn, hostBtn]) b.sync?.();
    micBtn.classList.toggle('off', !s.micOn);
    camBtn.classList.toggle('off', !s.cameraOn);
    handBtn.classList.toggle('active', s.handRaised);
    // The scare is the moment; the pill is the state. Meet leaves a pill at the
    // bottom left for as long as the hand is up, and Nam asked for it back.
    // Colour and entrance are screenshot-derived, flagged in styles.css.
    handPill.hidden = !s.handRaised;
    ccBtn.classList.toggle('active', s.captionsOn);
    presentBtn.classList.toggle('active', s.panel === 'present');

    deps.video.style.display = s.cameraOn ? 'block' : 'none';
    (hostTile.querySelector('.vtile-pitch') as HTMLElement).style.opacity = s.cameraOn ? '0' : '1';
    hostTile.classList.toggle('speaking-ring', s.captionsOn);

    cc.style.display = s.captionsOn ? '' : 'none';
    // Captions reserve 216px and the tile refits, exactly as the tray does.
    document.body.classList.toggle('cc-on', s.captionsOn);
    if (s.captionsOn) startCC(); else stopCC();

    pipeline.set(s.fx, s.reducedMotion);
    if (s.fx !== 'off') quests.unlock('fx');
    if (s.chaos) quests.unlock('chaos');
    drawReady();
  };

  store.subscribe(() => { sync(); drawPanel(); });

  // --------------------------------------------------------------- assemble --

  /**
   * MEET_CLONE is Nam's "make it right first, then make it ours after". While it
   * is on, the call view is Meet's single-participant view and the CV grid is
   * built but not mounted — so tomorrow's work is one line and an append, not an
   * excavation. The whole CV is still reachable in plain-document mode.
   */
  const MEET_CLONE = true;
  const stage = h('main', { class: 'grid-wrap' + (MEET_CLONE ? ' is-solo' : ''), id: 'main', tabindex: '-1' },
    MEET_CLONE ? soloTile() : tiles);
  if (!MEET_CLONE) rovingGrid(tiles, '.vtile:not(.host)');
  tiles.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key.startsWith('Arrow')) quests.unlock('a11y'); });

  const shell = h(
    'div',
    { class: 'call' },
    top,
    h('div', { class: 'call-mid' }, stage, panelHost),
    cc,
    trayWrap,
    handPill,
    shareHost,
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
  const url = SITE;
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
