// The green room — Meet's "Ready to join?" screen.
//
// Measured: 740x416 preview tile at radius 8 on #202124, a 448px column beside
// it, 28px/400 heading, 44px round controls inside the tile, outlined device
// chips underneath, a 48px filled "Join now" pill and an outlined
// "Other ways to join".
//
// Review U3 said pre-join screens are friction and Google spends real effort
// removing them — so this one is one click, and any deep link skips it.

import { h, clear } from '../dom.js';
import { sym, spinner, focusRing, dropCaret } from './icons.js';
import type { IconName } from './icons.js';
import { tipAllAbove, tipAll } from './tooltip.js';
import { ripple, attachMenu, warnBadge, micMeter, noticeCard } from './gm3.js';
import type { MenuItem } from './gm3.js';
import type { Store } from '../state.js';
import { profile } from '../data/cv.js';

export interface Media {
  video: HTMLVideoElement;
  toggleCamera: () => Promise<void>;
  cameraOn: () => boolean;
}

/**
 * The green room runs through two states before it settles, and Meet's timings
 * for them were taken off a screen recording of a real join:
 *
 *   +250ms  the "Joining..." scrim over the home screen ends and this mounts
 *   +0      dark rect and spinner, no words yet
 *   +80     "Getting ready..." and its subline fade in
 *   +1500   they clear and the pre-join screen rises
 *
 * Meet holds that middle stage for about 1.5s because it is negotiating a call.
 * We are not, so ours is 900ms — the same figure the home screen uses, which is
 * long enough to read as the product and short enough not to read as a slow
 * site. Coming back from the call skips it entirely: nothing is being prepared
 * the second time either.
 */
const READY_MS = 900;
/** The words arrive a beat after the shape, exactly as they do in the product. */
const READY_TEXT_MS = 80;
/** And the offer card lands a beat after the panel it sits in. */
const OFFER_MS = 260;

let greeted = false;

/**
 * The pre-join device state lives here rather than in the store, and finding out
 * why was its own small lesson.
 *
 * The mic control used to dispatch { t: 'mic' } on every toggle. That is a store
 * write, the store re-renders the screen, and the re-render throws away the tile
 * — including the control that was just toggled and the notice it had raised.
 * Verified: after a click, `document.contains(theButton)` is false and the fresh
 * button is back in its default state. So the toggle had been visibly doing
 * nothing, and the notice never survived the frame it was created in.
 *
 * Nothing outside this screen needs to know what the pre-join toggles say until
 * you actually join, so they are local, and the store is written once on join.
 * Module scope rather than closure scope so a re-render for any other reason
 * still comes back to the same state.
 */
let preMic = true;
let preCam = false;
let preNotice: { title: string; body: string; anchor: number } | null = null;

let deselectWired = false;
function wireDeselect(): void {
  if (deselectWired) return;
  deselectWired = true;
  document.addEventListener('pointerdown', (e) => {
    const jn = document.querySelector<HTMLElement>('.lobby .join-now.is-selected');
    if (!jn) return;
    if (jn.contains(e.target as Node)) return;
    jn.classList.remove('is-selected');
  }, true);
}

let keysWired = false;
function wireKeys(): void {
  if (keysWired) return;
  keysWired = true;
  window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k !== 'd' && k !== 'e') return;
    const ctls = document.querySelectorAll<HTMLElement>('.lobby .round-ctl');
    const hit = k === 'd' ? ctls[0] : ctls[1];
    if (!hit) return;
    e.preventDefault();
    hit.click();
  });
}

export function renderLobby(store: Store, media: Media): HTMLElement {

  /**
   * The three round controls. Measured on Meet by actually toggling them, which
   * is the only way the off state shows up at all:
   *
   *   on        56x48 radius 24, #dde3ea, ink #1f1f1f
   *   off       56x48 radius 12, #f9dedc, ink #410e0b
   *   disabled  56x48 radius 24, rgba(221,227,234,.4), ink rgba(31,31,31,.4)
   *   glyph     24px, centred at dx 16 / dy 12
   *
   * So "off" is a rounded SQUARE in a reddish tint and "on" is a pill in a cool
   * grey, exactly as Nam described. And the shape change carries
   *
   *   transition: border-radius, background-color .2s steps(6, jump-none)
   *
   * — a six-step morph, not a smooth one. That is Meet's own value and it is
   * what gives the toggle its mechanical little snap.
   */
  const ctl = (
    glyph: IconName,
    label: string,
    opts: { key?: string; off?: boolean; disabled?: boolean; warn?: boolean; tip?: string } = {},
  ): { wrap: HTMLElement; btn: HTMLButtonElement } => {
    const btn = h('button', {
      class: 'round-ctl' + (opts.off ? ' off' : ''),
      type: 'button',
      'aria-label': label,
      ...(opts.key ? { 'data-key': opts.key } : {}),
      ...(opts.disabled ? { 'aria-disabled': 'true' } : {}),
      ...(opts.tip ? { 'data-tip': opts.tip } : {}),
    }, sym(glyph, 24)) as HTMLButtonElement;
    ripple(btn);
    const wrap = h('span', { class: 'ctl-wrap' }, btn);
    if (opts.warn) wrap.appendChild(warnBadge());
    return { wrap, btn };
  };

  const micCtl = ctl(preMic ? 'mic' : 'mic_off',
    preMic ? 'Turn off microphone' : 'Turn on microphone',
    { key: 'ctrl + d', warn: true, off: !preMic });
  const camCtl = ctl('videocam', 'Turn off camera', { key: 'ctrl + e', warn: true });
  // Disabled, with Meet's own label. Nam asked for exactly this: the effects
  // control is not available before you join, and its tooltip still reads.
  const fxCtl = ctl('blur_on', 'Turn on background blur', { disabled: true });

  const notice = h('div', { class: 'tile-notice-slot' });

  /**
   * Meet shows the dark notice when you turn a device ON that it cannot find —
   * which for this page is both of them. Turning the mic on therefore raises
   * "Microphone not found", and that is true here rather than borrowed: this
   * page never requests a microphone.
   */
  const showNotice = (title: string, body: string, anchorLeft: number): void => {
    preNotice = { title, body, anchor: anchorLeft };
    paintNotice();
  };
  const hideNotice = (): void => { preNotice = null; clear(notice); };
  function paintNotice(): void {
    clear(notice);
    if (!preNotice) return;
    const card = noticeCard(preNotice.title, preNotice.body, hideNotice);
    card.style.setProperty('--anchor', `${preNotice.anchor}px`);
    notice.appendChild(card);
    tipAll(...card.querySelectorAll<HTMLElement>('.tile-notice-x'));
  }
  paintNotice();

  micCtl.btn.addEventListener('click', () => {
    preMic = !preMic;
    micCtl.btn.classList.toggle('off', !preMic);
    micCtl.btn.setAttribute('aria-label', preMic ? 'Turn off microphone' : 'Turn on microphone');
    // Rebuild the glyph, keeping the ring that clear() would otherwise take.
    const glyph = micCtl.btn.querySelector('.ms');
    if (glyph) micCtl.btn.replaceChild(sym(preMic ? 'mic' : 'mic_off', 24), glyph);
    // Meet raises the notice when you turn a device ON that it cannot find,
    // which here is both of them — and honestly so: this page never asks for a
    // microphone, so turning one on really does find nothing.
    if (preMic) showNotice('Microphone not found', 'Make sure your microphone is plugged in', -72);
    else hideNotice();
  });

  /**
   * What the tile shows once the camera is on but unavailable, which is the
   * state a visitor lands in: a warning glyph and title, a line of advice, and
   * a Try again. Matched to the screenshot rather than measured — the live
   * product only reaches this state when a camera is genuinely busy, and mine
   * was not going to cooperate on demand.
   */
  const retry = h('button', { class: 'pu-retry', type: 'button' }, 'Try again') as HTMLButtonElement;
  ripple(retry);
  const unavail = h('div', { class: 'preview-unavail' },
    h('div', { class: 'pu-row' }, sym('error', 20), h('span', { class: 'pu-t' }, 'Camera unavailable')),
    h('p', { class: 'pu-b' }, 'Close other apps that might be using your camera'),
    retry);
  const avatar = h('div', { class: 'preview-ask-wrap' },
    h('div', { class: 'preview-avatar', 'aria-hidden': 'true' }, 'NN'),
    h('p', { class: 'preview-ask', style: 'margin:0' }, 'Do you want people to see you in the meeting?'));

  /**
   * The tile's overflow. Meet's menu is 225 wide, #f0f4f9 at radius 12 with no
   * shadow, four 48-tall rows at padding 8px 12px, icon 24px #444746 at dx 12
   * and label 500 14/20 at dx 52, with a rule after the first row.
   *
   * Every item here is deliberately inert. Nam's call, and the right one: each
   * of these opens a panel that would take days to clone, and the goal is a page
   * that LOOKS identical, not one that does Meet's job. They are still real
   * buttons — focusable, clickable, rippling — because a menu whose rows do not
   * respond feels broken in a way that an inert one does not.
   */
  const moreBtn = h('button', {
    class: 'tile-more icon-btn', type: 'button', 'aria-label': 'More options',
  }, sym('more_vert', 24)) as HTMLButtonElement;
  ripple(moreBtn);
  tipAll(moreBtn);
  attachMenu(moreBtn, (): MenuItem[] => [
    { icon: 'blur_on', label: 'Backgrounds and effects' },
    { icon: 'feedback', label: 'Report a problem', ruleBefore: true },
    { icon: 'troubleshoot', label: 'Troubleshooting & help' },
    { icon: 'settings', label: 'Settings' },
  ], { align: 'right', side: 'overlap', dx: 3, dy: -3, width: 225 });

  const stage = h(
    'div',
    { class: 'preview' },
    h('span', { class: 'preview-name' }, profile.name),
    moreBtn,
    media.video,
    avatar,
    unavail,
    notice,
    micMeter(),
    h('div', { class: 'preview-ctls' }, micCtl.wrap, camCtl.wrap, fxCtl.wrap),
  );

  /**
   * The camera control used to hang its ENTIRE UI update off
   * media.toggleCamera().then(...). If that promise rejects — no camera, denied
   * permission, a device already in use — the then never runs and the button
   * does nothing at all, which is what Nam saw. Worse, an unhandled rejection
   * during a getUserMedia prompt is exactly the kind of thing that reads as "the
   * page reloaded".
   *
   * So the UI flips first, from local state, and the real camera is attempted
   * separately and allowed to fail. The visible control is never hostage to a
   * permission dialog.
   */
  const paintCam = (): void => {
    camCtl.btn.classList.toggle('off', !preCam);
    camCtl.btn.setAttribute('aria-label', preCam ? 'Turn off camera' : 'Turn on camera');
    const g = camCtl.btn.querySelector('.ms');
    if (g) camCtl.btn.replaceChild(sym(preCam ? 'videocam' : 'videocam_off', 24), g);
    avatar.style.display = preCam ? 'none' : '';
    stage.classList.toggle('cam-on', preCam);
    promoteChips(preCam);
    if (preCam) showNotice('Camera unavailable', 'Close other apps that might be using your camera', 0);
    else hideNotice();
  };
  camCtl.btn.addEventListener('click', () => {
    preCam = !preCam;
    paintCam();
    // Best effort, and genuinely optional: if a real camera turns up, the tile
    // shows it. If not, the unavailable state we already painted is the truth.
    void Promise.resolve(media.toggleCamera()).catch(() => undefined);
  });


  // Four chips at 179px with 8px gaps is 740 — exactly the tile width, which is
  // why Meet has four. Ours say what is true of this page rather than naming
  // hardware it never asks for: there is no microphone here at all, and the
  // camera is an offer rather than a device that is already on.
  /**
   * The chip row, mirroring Meet's four exactly. Measured:
   *
   *   chip     179x32 r16, 1px #c4c7c5, inline-flex, padding 0 16, gap 4
   *   hit area 179x48 — 8px taller than the chip on each side
   *   layer    the padding box, 177x30 r16, #444746 at .08, .075s linear
   *   icon     20px #444746 at dx 17
   *   label    500 14px "Google Sans" #444746 at dx 41, ellipsis at ~97px
   *   caret    arrow_drop_down at dx 142, flush right
   *
   *   1  mic_none      "Mic not found"       live
   *   2  volume_up     "Speaker not found"   live, truncates
   *   3  videocam      "Permission needed"   disabled, truncates
   *   4  blur_on       "Permission needed"   disabled, truncates
   *
   * Nam asked for these mirrored rather than reworded, and he is right that the
   * versions I invented were worse — "Fibre · 32 ms" in particular was a number
   * about a network nobody asked about, sitting in a row that is supposed to be
   * about devices.
   *
   * They are also all true here, which is the part that makes mirroring fine
   * rather than merely faithful: this page never requests a microphone or a
   * speaker, and the camera and effects both genuinely need a permission it has
   * not asked for.
   *
   * The tooltip rule is the interesting find, and it is why my first sweep
   * concluded "no tooltips on chips": Meet tips a chip only when its label is
   * TRUNCATED, and the one chip I probed was the one that fits. So the tip is
   * wired off actual overflow, measured after layout, rather than hardcoded —
   * which also means it stays correct when the row narrows and chips that fit at
   * 740 stop fitting at 448.
   */
  const chip = (
    icon: IconName,
    label: string,
    live: boolean,
    items?: () => MenuItem[],
  ): HTMLElement => {
    const el = h(
      'button',
      {
        class: 'device-chip ring-host' + (live ? '' : ' is-off'),
        type: 'button',
        ...(live ? {} : { 'aria-disabled': 'true' }),
        'aria-label': label,
      },
      focusRing(),
      sym(icon, 20),
      h('span', { class: 'chip-label' }, label),
      dropCaret(20),
    ) as HTMLButtonElement;
    // Sampling a real click on Meet's chip turned up three things at once: the
    // press ripple, the gm3 focus ring (grows .15s then settles over .45s on
    // cubic-bezier(0.2, 0, 0, 1)), and the caret rotating a full 180 degrees in
    // about 180ms. All three fire on pointer-press, not just on keyboard focus.
    ripple(el);
    if (items) attachMenu(el, items, { align: 'left' });
    return el;
  };

  /**
   * Meet's first two chips open a menu; the last two are disabled until the
   * camera is allowed, at which point they become live and gain menus of their
   * own. Contents taken from Meet's, with ours substituted where a real device
   * name would be a fiction.
   *
   * Every row here is inert by design — same reasoning as the overflow menu.
   */
  const camMenu = (): MenuItem[] => [
    { label: 'Integrated Camera', checked: true },
    { icon: 'photo_camera', label: 'Make a test recording' },
    { icon: 'error', label: 'Camera unavailable', sub: 'Show more info', warn: true, ruleBefore: true },
  ];
  const fxMenu = (): MenuItem[] => [
    { label: 'Touch-up appearance' },
    { label: 'Generate an AI background' },
    { label: 'Choose backgrounds and effects' },
  ];

  const chipMic = chip('mic_none', 'Mic not found', true, () => [
    { icon: 'error', label: 'Microphone not found', sub: 'Show more info', warn: true },
  ]);
  const chipSpk = chip('volume_up', 'Speaker not found', true, () => [
    { icon: 'error', label: 'Speaker not found', sub: 'Show more info', warn: true },
  ]);
  const chipCam = chip('videocam', 'Permission needed', false);
  const chipFx = chip('blur_on', 'Permission needed', false);

  const chips = h('div', { class: 'devices' }, chipMic, chipSpk, chipCam, chipFx);

  /**
   * Allowing the camera promotes the last two chips, which is what Meet does:
   * they stop saying "Permission needed", take the device name and the effects
   * label, and become real dropdowns.
   */
  const promoteChips = (on: boolean): void => {
    for (const [c, offLabel, onLabel, items] of [
      [chipCam, 'Permission needed', 'Integrated Camera', camMenu],
      [chipFx, 'Permission needed', 'Backgrounds…', fxMenu],
    ] as [HTMLButtonElement, string, string, () => MenuItem[]][]) {
      c.classList.toggle('is-off', !on);
      if (on) c.removeAttribute('aria-disabled'); else c.setAttribute('aria-disabled', 'true');
      const l = c.querySelector('.chip-label');
      if (l) l.textContent = on ? onLabel : offLabel;
      c.setAttribute('aria-label', on ? onLabel : offLabel);
      if (on && !c.dataset.menu) { c.dataset.menu = '1'; attachMenu(c, items, { align: 'left' }); }
    }
    requestAnimationFrame(tipClipped);
  };

  // Tip only the ones whose label actually clips, which is Meet's rule. This has
  // to run after the row is IN the document, not just built: off-document,
  // clientWidth and scrollWidth are both 0, so the comparison is false for every
  // chip and nothing gets tipped. Called from settle(), one frame after mount.
  const tipClipped = (): void => {
    for (const c of chips.querySelectorAll<HTMLElement>('.device-chip')) {
      const l = c.querySelector<HTMLElement>('.chip-label');
      if (l && l.scrollWidth > l.clientWidth + 1) tipAllAbove(c);
    }
  };

  // Turning the transcript on here carries into the call, which is the only
  // reason an offer on a pre-join screen is worth anything.
  const transcriptBtn = h(
    'button',
    { class: 'm-btn m-text', type: 'button' },
    'Start',
  ) as HTMLButtonElement;
  transcriptBtn.addEventListener('click', () => {
    const on = !store.get().captionsOn;
    store.dispatch({ t: 'captions', on });
    transcriptBtn.textContent = on ? 'On' : 'Start';
    transcriptBtn.classList.toggle('is-on', on);
  });

  // One line, not two. Meet's subline is short by design — ours wrapped to a
  // second line and pushed everything below it 11px down, which is how a copy
  // length becomes a layout bug.
  //
  // It also narrates, the way the real one does: it says it is looking, and then
  // says what it found. Measured at ~750ms apart in the recording.
  const subLine = h('p', { class: 'join-sub' }, 'Looking for others in the call…');
  window.setTimeout(() => { subLine.textContent = 'Nam Nguyen is already here'; }, 750);

  /**
   * Other ways to join. Meet expands it IN PLACE: the three options appear
   * above the trigger, and the trigger itself becomes "Show fewer options"
   * with the caret flipped. Measured:
   *
   *   row     40 tall, radius 20, transparent, padding 0 16 0 12
   *   icon    18px #0b57d0 at dx 12
   *   label   500 14px #0b57d0 at dx 38
   *   pitch   44, so a 4px gap between rows
   *   centred on the panel line, each row only as wide as its content
   *
   * All three are inert, for the same reason as the overflow menu: Companion
   * mode, presenting and dial-in are three products we are not cloning. The
   * shape of the screen is the point.
   */
  const otherRows = h('div', { class: 'other-rows' },
    ...([['meeting_room', 'Use Companion mode'], ['present_to_all', 'Present'],
      ['phone_forwarded', 'Join and use a phone for audio']] as [IconName, string][])
      .map(([ic, label]) => {
        const b = h('button', { class: 'other-row', type: 'button' }, sym(ic, 18), h('span', {}, label));
        ripple(b);
        return b;
      }));

  const otherWays = h('button', { class: 'other-ways', type: 'button', 'aria-expanded': 'false' },
    h('span', { class: 'other-ways-t' }, 'Other ways to join'), sym('expand_more', 18)) as HTMLButtonElement;
  ripple(otherWays);
  otherWays.addEventListener('click', () => {
    const open = otherWays.classList.toggle('is-open');
    otherRows.classList.toggle('is-open', open);
    const t = otherWays.querySelector('.other-ways-t');
    if (t) t.textContent = open ? 'Show fewer options' : 'Other ways to join';
    otherWays.setAttribute('aria-expanded', String(open));
  });
  const col = h(
    'div',
    { class: 'join-col' },
    h('h1', {}, 'Ready to join?'),
    subLine,
    h(
      'div',
      { class: 'join-card' },
      sym('closed_caption', 20),
      h(
        'div',
        {},
        h('b', {}, 'Use the transcript'),
        h('span', {}, 'Captions and a written script'),
      ),
      transcriptBtn,
    ),
    h(
      'div',
      { class: 'join-actions' },
      h(
        'button',
        {
          // ring-host so it can carry the same gm3 focus ring the meeting card
          // uses. Meet autofocuses this button on arrival and draws exactly that
          // ring around it, so the machinery is already ours.
          class: 'm-btn m-filled join-now ring-host',
          type: 'button',
          onclick: () => {
            // The one place the pre-join toggles reach the store.
            store.dispatch({ t: 'mic', on: preMic });
            store.dispatch({ t: 'join' });
          },
        },
        focusRing(),
        h('span', {}, 'Join now'),
        // Meet puts a warning badge on this button when it cannot find a
        // microphone: a 16px circle straddling the top-left corner that expands
        // into a pill on hover. Ours says the same thing and means it — this page
        // never requests a microphone, so you really are joining without one.
        // The alternative was showing the badge to people who DO have a mic,
        // which would be a false statement in Google’s voice.
        h(
          'span',
          { class: 'warn-pill', role: 'note', tabindex: '0' },
          h('span', { class: 'warn-dot', 'aria-hidden': 'true' }, '!'),
          h('span', { class: 'warn-text' }, 'You’re joining without mic'),
          // The expanded badge ends in a caret in Meet too — 15px, #6D3A01,
          // finishing 5px short of the pill's right edge.
          dropCaret(20),
        ),
      ),
      otherRows,
      otherWays,
    ),
  );

  // The pre-join content, so the stage below can withhold it.
  // A <main>, not a div: this is the page landmark and our own a11y audit
  // checks for it. Swapping it for a div here is how that regresses silently.
  // Meet tips all three round controls, ABOVE them, 4px clear — and the text
  // carries the keyboard shortcut: "Turn off microphone (ctrl + d)". So ours
  // says the same, and ctrl+d / ctrl+e are wired below so the text is true.
  // The chips are deliberately not tipped; long-hovering Meet's produced none.
  tipAllAbove(...stage.querySelectorAll<HTMLElement>('.round-ctl'));

  // The tooltips promise ctrl+d and ctrl+e, so here they are: Meet's own
  // accelerators, and the reason the promise is allowed to be made at all.
  //
  // Wired once at module scope rather than per render. The lobby is remounted
  // on every visit, so a listener per visit would fire three times a press by
  // the third visit — and there is no teardown hook to hang a removal on. The
  // handler looks the controls up when the key lands instead, which also means
  // it is inert on every other screen without needing to know about them.
  wireKeys();

  const stageWrap = h('main', { class: 'lobby-body', id: 'main' });

  const gettingReady = (): HTMLElement => {
    const pad = h('div', { class: 'ready-pad' });
    const art = h('div', { class: 'ready-art' });
    const words = h(
      'div',
      { class: 'ready-words' },
      h('p', { class: 'ready-h' }, 'Getting ready\u2026'),
      h('p', { class: 'ready-s' }, 'You\u2019ll be able to join in just a moment'),
    );
    pad.append(art, h('div', { class: 'ready-side' }, words, spinner(true, true)));
    // The shape lands first and the words catch up. One beat, and it is most of
    // what makes the screen feel like it is doing something rather than waiting.
    words.style.opacity = '0';
    window.setTimeout(() => { words.style.opacity = ''; }, READY_TEXT_MS);
    return pad;
  };

  const settle = (): void => {
    greeted = true;
    clear(stageWrap);
    stageWrap.append(h('div', { class: 'preview-col' }, stage, chips), col);
    stageWrap.classList.add('is-in');
    requestAnimationFrame(tipClipped);
    // The offer card arrives after the rest of the panel, which is the order the
    // product uses: the thing you came for first, the extra second.
    const card = col.querySelector<HTMLElement>('.join-card');
    if (card) {
      card.classList.add('offer-late');
      window.setTimeout(() => card.classList.remove('offer-late'), OFFER_MS);
    }
    // Meet autofocuses Join now. The ring rides :focus-visible plus the class,
    // same as the meeting card, so it settles thick-to-thin on arrival.
    const jn = col.querySelector<HTMLElement>('.join-now');
    if (jn) {
      jn.classList.add('is-selected');
      jn.focus({ preventScroll: true });
    }
  };

  // The autofocus selection is a starting point, not a permanent state: Meet's
  // ring goes the moment you interact anywhere else, and ours was keeping
  // is-selected forever. Same fix the home screen's meeting card already has.
  wireDeselect();

  if (greeted || store.get().reducedMotion) {
    settle();
  } else {
    stageWrap.appendChild(gettingReady());
    window.setTimeout(() => { if (stageWrap.isConnected) settle(); }, READY_MS);
  }

  // Last, not where it reads most naturally. paintCam() reaches promoteChips(),
  // which is a const declared further down, so calling it beside the camera
  // listener threw "cannot access before initialization" — and because
  // renderLobby runs inside the lazy router's promise, that rejection surfaced
  // as "That screen failed to load". Which is exactly the reload Nam kept
  // seeing: not a reload at all, our own failure screen.
  if (preCam) paintCam();

  return h(
    'div',
    { class: 'lobby' },
    h(
      'header',
      { class: 'lobby-bar' },
      // In the real product this is *your* account. Here the visitor is the
      // one taking the interview, so it is theirs — not Nam's. No real address
      // is invented: Google publishes none for this, and it would be a strange
      // thing to fabricate on a job application.
      h(
        'div',
        { class: 'lobby-acct' },
        h('b', {}, 'you@google.com'),
        h('span', {}, 'Switch account'),
      ),
    ),
    stageWrap,
  );
}
