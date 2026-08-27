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

import { h, clear, icon, icons } from '../dom.js';
import { openDev } from './devopen.js';
import { sym } from './icons.js';
import { ripple, attachMenu, micMeter, menu as gmMenu, warnBadge, noticeCard, dropCaret } from './gm3.js';
import { tipAll, tip } from './tooltip.js';
import type { MenuItem } from './gm3.js';
import type { IconName } from './icons.js';
import type { Store, Panel } from '../state.js';
import { captionAt, clock } from '../state.js';
import { profile, pitch, roles, transcript, referralBlurb, SITE } from '../data/cv.js';
import { renderChat, renderPeople, renderPresent, renderAbout } from './panels.js';
import { renderOffClock } from './offclock.js';
import { renderEng } from './eng.js';
import { rovingGrid, trapFocus, announcer } from '../a11y.js';
import { sample } from '../net/degrade.js';
import type { Profile } from '../net/degrade.js';
import type { Quests } from '../achievements.js';
import { noteReadyShown, noteReadyClosed } from '../prefs.js';

const TITLES: Record<Exclude<Panel, 'none'>, string> = {
  chat: 'In-call messages',
  people: 'People',
  present: 'Presenting',
  offclock: 'Off the clock',
  tools: 'Meeting tools',
  host: 'Host controls',
  about: 'More about Nam',
};

const CODE = 'nam-cv-2026';

export interface CallDeps {
  // No video and no canvas. The camera control is cosmetic and there is no
  // stream or effects pipeline left to hand a surface to.
  toggleCamera: () => void;
}

export function renderCall(store: Store, quests: Quests, deps: CallDeps): HTMLElement {
  let releaseTrap: (() => void) | null = null;

  // ------------------------------------------------------------- host tile --

  const hostAvatar = h('div', { class: 'vtile-av', 'aria-hidden': 'true' }, 'NN');
  const hostTile = h(
    'div',
    { class: 'vtile host' },
    h(
      'div',
      { class: 'vtile-pitch' },
      hostAvatar,
      h('span', { class: 'vt-name' }, profile.name),
      pitch,
    ),
    h('span', { class: 'vtile-label' }, profile.name, h('span', { style: 'color:var(--on-dark2);font-weight:400' }, '· presenting')),
    // Backgrounds and effects is gone with the pipeline it opened. Reframe
    // stays: it goes to People, which still exists.
    h(
      'div',
      { class: 'vtile-fx' },
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
  /**
   * The raised hand lives ON the tile, in the name plate's slot — not floating
   * outside it, which is where ours was. Sampled from Nam's screenshot of the
   * original (the PNG, not the chat image): fill #6dd58c, ink #0a3818, box
   * 140x32, so radius 16. It REPLACES the name plate; there is no separate name
   * in the original once the hand is up.
   */
  /*
   * Three parts, because Google's animation needs three targets: a background
   * layer it scales from zero, an icon it pops up and then WAVES, and a label it
   * expands from zero width. Scaling the box that holds the text would drag the
   * text with it, which is why the green is a sibling layer rather than the
   * container's own background.
   *
   * The icon: Meet's glyph is front_hand, ours is back_hand. Not a choice — the
   * self-hosted symbols font is a fixed 7 kB subset of 56 names and front_hand
   * is not one of them, so asking for it would render the literal string. Same
   * gesture, one fewer font rebuild.
   */
  /**
   * The tile's muted badge. Measured 28x28 at inset 10/10, #002e69 with an
   * #adc6ff glyph at 18px.
   *
   * In Google's markup this circle and the control bar's level meter are the
   * same component — they share their sizing rules and a state class swaps the
   * three-bar meter for the crossed mic. An unmuted tile shows a live meter in
   * this exact circle. We only ever render the muted face.
   */
  const muteBadge = h('div', { class: 'solo-mute', role: 'img', 'aria-label': 'Your microphone is off' },
    sym('mic_off', 18)) as HTMLElement;

  /**
   * The pinned marker, MEASURED on the live product: a 20px `keep` in white at
   * the tile's bottom-left, 16px in and 15px up — the exact anchor the name
   * plate already uses. Pinning inserts a 34px lead (the 20px glyph plus a 14px
   * gap) and everything in the strip shifts right by it; see --pin-lead.
   *
   * The hidden span carries Meet's own wording, "Pinned for yourself". Worth
   * copying verbatim: it names the SCOPE, which is the distinction the "For
   * myself only / For everyone" submenu existed to make. We pin directly and
   * dropped the submenu, so this label is the only place that scope is stated.
   */
  const pinMark = h('div', { class: 'solo-pin' },
    h('span', { 'aria-hidden': 'true' }, sym('keep', 20)),
    h('span', { class: 'sr-only' }, 'Pinned for yourself')) as HTMLElement;
  pinMark.hidden = true;

  /**
   * The collapsed bar, MEASURED on the live product: 208 x 36, #4a4e51, radius 8,
   * sharing the small tile's exact bottom-right corner (right edge 2528, bottom
   * 1063 -- identical to the tile it replaces, so it collapses in place).
   * Inside: a level glyph, videocam_off, the name at 500 14px/20px white, then an
   * Expand at 32 x 32 carrying open_in_full at 20px.
   */
  const minExpand = h('button', {
    class: 'min-expand', type: 'button', 'aria-label': 'Expand',
  }, icon(icons.expand, 20)) as HTMLButtonElement;
  minExpand.addEventListener('click', () => store.dispatch({ t: 'minimize', on: false }));
  ripple(minExpand);
  const minBar = h('div', { class: 'solo-min' },
    h('span', { class: 'min-ico', 'aria-hidden': 'true' }, sym('mic_off', 18)),
    h('span', { class: 'min-ico', 'aria-hidden': 'true' }, sym('videocam_off', 18)),
    h('span', { class: 'min-name' }, profile.name),
    minExpand) as HTMLElement;
  minBar.hidden = true;

  const handPill = h('div', { class: 'hand-pill', role: 'status' },
    h('div', { class: 'hand-bg', 'aria-hidden': 'true' }),
    h('span', { class: 'hand-ico', 'aria-hidden': 'true' }, sym('back_hand', 16)),
    h('span', { class: 'hand-name' }, profile.name)) as HTMLElement;
  handPill.hidden = true;

  /**
   * Restart the four-part raise animation.
   *
   * An element that was display:none has no running animation to restart, so the
   * order matters: unhide, force a reflow, then re-add the class. Called on a
   * raise, and again when a screen share ends — Nam: "if you exit the shared
   * screen mode then the video frame pops back into its original place, and the
   * raise hand animation reruns again." It does, because the tile it lives on
   * has just changed size and the pill would otherwise sit there mid-scale.
   */
  function replayHand(): void {
    if (!store.get().handRaised) return;
    handPill.hidden = false;
    handPill.classList.remove('hand-pill');
    void handPill.offsetWidth;
    handPill.classList.add('hand-pill');
  }

  /**
   * The small tile can be dragged, and latches to one of the four corners.
   *
   * Nam found this by accident: "in this small video tile state, it can be moved
   * anywhere and will latch on on of the four corners of the screen."
   *
   * MEASURED on the live product, though not the gesture itself. The tile is
   * absolutely positioned inside the stage carrying concrete `left`/`right`/
   * `top`/`bottom` offsets rather than a transform, at a 16px inset, and its
   * transition reads:
   *
   *   bottom .3s cubic-bezier(0.4, 0, 0.2, 1), left .3s cubic-bezier(0.4, 0, 0.2, 1)
   *
   * Both axes animated, which is the snap. HONEST LIMIT: `left_click_drag` could
   * not reproduce the gesture -- it presses, jumps and releases without the
   * intermediate pointermove events the handler needs -- so the corners, the
   * inset and the easing are read off the style, and the feel of the drag
   * itself (any ghost, any cursor change) is not measured.
   *
   * Numeric left/top throughout rather than flipping between `auto` and a
   * length, because `auto` does not interpolate and the transition above proves
   * the original animates real numbers.
   */
  type Corner = 'tl' | 'tr' | 'bl' | 'br';
  const INSET = 16;
  let corner: Corner = 'br';
  let tileEl: HTMLElement | null = null;

  const dragHost = (): HTMLElement | null => document.querySelector('.grid-wrap');

  function place(el: HTMLElement, animate: boolean): void {
    const host = dragHost();
    if (!host) return;
    const hb = host.getBoundingClientRect();
    const w = el.offsetWidth;
    const hgt = el.offsetHeight;
    const left = corner === 'tl' || corner === 'bl' ? INSET : Math.max(INSET, hb.width - w - INSET);
    const top = corner === 'tl' || corner === 'tr' ? INSET : Math.max(INSET, hb.height - hgt - INSET);
    el.classList.toggle('is-snapping', animate);
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  /** Clears the inline placement, so the stylesheet governs again. */
  function unplace(el: HTMLElement): void {
    el.classList.remove('is-snapping', 'is-dragging');
    el.style.left = el.style.top = el.style.right = el.style.bottom = '';
  }

  function draggable(): boolean {
    return document.body.classList.contains('presenting') && !store.get().pinned;
  }

  function wireDrag(el: HTMLElement): void {
    let id = -1;
    let ox = 0;
    let oy = 0;
    el.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!draggable()) return;
      // The control pill and the Expand button live on this tile; a press on one
      // of them is a click, not the start of a drag.
      if ((e.target as HTMLElement).closest('button')) return;
      const host = dragHost();
      if (!host) return;
      const b = el.getBoundingClientRect();
      const hb = host.getBoundingClientRect();
      ox = e.clientX - b.left;
      oy = e.clientY - b.top;
      id = e.pointerId;
      // Guarded: a synthetic PointerEvent carries no real pointer, and capture
      // throws on one. The drag works either way; only capture is optional.
      try { el.setPointerCapture(id); } catch { /* not a real pointer */ }
      el.classList.add('is-dragging');
      el.classList.remove('is-snapping');
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.left = `${b.left - hb.left}px`;
      el.style.top = `${b.top - hb.top}px`;
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const host = dragHost();
      if (!host) return;
      const hb = host.getBoundingClientRect();
      el.style.left = `${e.clientX - hb.left - ox}px`;
      el.style.top = `${e.clientY - hb.top - oy}px`;
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId !== id) return;
      id = -1;
      el.classList.remove('is-dragging');
      const host = dragHost();
      if (!host) return;
      const hb = host.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      // Nearest corner by the tile's own centre, so a tile more than halfway
      // across latches to the far side rather than snapping back.
      const cx = b.left + b.width / 2 - hb.left;
      const cy = b.top + b.height / 2 - hb.top;
      corner = `${cy < hb.height / 2 ? 't' : 'b'}${cx < hb.width / 2 ? 'l' : 'r'}` as Corner;
      place(el, true);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  const soloTile = (): HTMLElement => {
    const t = h(
      'div',
      { class: 'solo', role: 'group', 'aria-label': profile.name },
      h('div', { class: 'solo-blur', 'aria-hidden': 'true' }),
      h('div', { class: 'solo-scrim', 'aria-hidden': 'true' }),
      h('div', { class: 'solo-av', 'aria-hidden': 'true' }, 'NN'),
      pinMark,
      h('span', { class: 'solo-name' }, profile.name),
      minBar,
      muteBadge,
      handPill,
      micMeter(),
    );
    // The three controls Meet floats over its own tile, at 656 / 700 / 744.
    /**
     * MEASURED: the pill's glyphs are 24px, not the 20 we were passing. That
     * alone is why more_vert's dots read undersized — three dots scaled to 20
     * lose their weight long before an outline does.
     *
     * And these are font glyphs again, not authored paths. Round 5's hand-drawn
     * marks were thin and frail, which is what hand-drawn outlines are at 20px
     * next to a typeface designed for the size. The subset is a real type
     * programme with real stroke weights; drawing over it was the mistake.
     */
    const fx = (glyph: IconName, label: string, cls: string): HTMLElement => {
      const b = h('button', {
        class: 'solo-ctl ' + cls, type: 'button', 'aria-label': label,
      }, sym(glyph, 24)) as HTMLButtonElement;
      ripple(b);
      tipAll(b);
      return b;
    };
    const more = fx('more_vert', 'More options for ' + profile.name, 'solo-more');
    /**
     * FROM NAM'S SCREENSHOT OF THE ORIGINAL, not measured — the menu could not
     * be opened live, because the pill it lives in only exists while the tile is
     * hovered and a synthetic hover does not survive to the click.
     *
     * What that screenshot shows, and what we had wrong:
     *   - THREE rows, not four. We invented "Remove this tile", which was also
     *     the row overflowing the surface.
     *   - Minimize and "Show my full video" are DEAD; only "Pin to the screen"
     *     is live. (It carried a submenu chevron until Nam cut it — see below.)
     *     weight and none of them a hover.
     *   - "to others", not "to everyone".
     *
     * Left-aligned, because the original's left edge sits under the button.
     * Ours passed 'right' and landed off to the side.
     */
    /**
     * The one live row toggles. CONFIRMED live while pinned: the row reads
     * "Unpin" and carries `keep_off`.
     *
     * `keep_off` is not in the 7 kB subset, and hand-drawing one next to a
     * designed typeface is the exact mistake Round 5 made — so `keep` serves
     * both faces and the label carries the difference. The label is also what
     * gets read out, so nothing is lost to a screen reader.
     *
     * Built inside the callback, so it reads the store each time it opens
     * rather than freezing whichever state it was first constructed in.
     */
    attachMenu(more, (): MenuItem[] => [
      /**
       * MEASURED: Minimize is context-dependent. On the full-stage tile it
       * reports aria-disabled=true; on the small tile while presenting unpinned
       * it is LIVE, and it really does collapse the tile. Nam spotted this --
       * "there is a minimize option that actualy minimize the video tile" -- and
       * the menu confirmed it, with only "Show my full video to others" dead in
       * that state.
       *
       * So the row mirrors the original's own condition rather than being
       * permanently dead or permanently live.
       */
      {
        icon: 'close_fullscreen',
        label: 'Minimize',
        disabled: sharing === null || store.get().pinned,
        onPick: () => { store.dispatch({ t: 'minimize', on: true }); },
      },
      {
        icon: 'keep',
        label: store.get().pinned ? 'Unpin' : 'Pin to the screen',
        onPick: () => { store.dispatch({ t: 'pin', on: !store.get().pinned }); },
      },
      { icon: 'aspect_ratio', label: 'Show my full video to others', disabled: true },
    /**
     * Placement flips per corner, so the menu never runs off screen.
     *
     * Nam: "our dropdown option is overflowing here into the corner of the
     * screen... they relocate the dropdown to the empty space such that its not
     * running off screen. So on bottom right, the dropdown expands to the top
     * left, aligning to the right of the more_vert button."
     *
     * MEASURED on that exact corner: menu 247x160 @ 2228,817 against a more_vert
     * at 2435,977. The menu's right edge is flush with the button's right edge
     * (delta 0) and its bottom edge sits exactly on the button's top edge (delta
     * 0). So `align: right` + `side: above`, both flush, no nudge.
     *
     * The other three follow by symmetry, which is what Nam's four screenshots
     * show: the menu always opens into the screen rather than out of it.
     *
     *   tl -> below / left      tr -> below / right
     *   bl -> above / left      br -> above / right
     *
     * Only the free-floating small tile needs it. The full-stage and pinned
     * tiles centre their pill in a large box, where below/left already fits.
     */
    ], () => {
      const small = sharing !== null && !store.get().pinned;
      if (!small) return { align: 'left', side: 'below', width: 247, cls: 'gm-dark' };
      return {
        align: corner === 'tl' || corner === 'bl' ? 'left' : 'right',
        side: corner === 'tl' || corner === 'tr' ? 'below' : 'above',
        width: 247,
        cls: 'gm-dark',
      };
    });
    // 247, MEASURED off the live menu (247 x 160 = three 48px rows plus the
    // 8px top and bottom padding). Round 4's 232 came off a screenshot.
    /**
     * Measured left to right: `visual_effects` at 44x44 r22 ink #e3e3e3, a
     * middle control at 44x44 r100 ink #fff, then `more_vert` at 40x40 r20.
     *
     * THE MIDDLE CONTROL IS CONTEXT-DEPENDENT, which Round 4 got wrong. On one
     * call it read "Can't remove your tile in this layout" and was disabled; on
     * another it read "Show in a tile" and was live. Round 4 froze the first as
     * permanent. Ours carries the live label and acts, rather than pretending to
     * switch on a layout system we do not have.
     *
     * Both marks are authored paths in dom.ts. The subset has neither, and Round
     * 4's stand-ins (blur_on, close_fullscreen) are what Nam read as "completely
     * wrong" — they are legible glyphs for different controls.
     */
    /**
     * Two substitutions, and the first is not really a substitution at all:
     * `blur_on` is the glyph MEET ITSELF uses for "Backgrounds and effects" on
     * the pre-join screen, measured there earlier in this project. Same control,
     * same function, Meet's own choice — just from the Apache-2.0 sibling
     * programme rather than the proprietary `visual_effects`, which is not in
     * Material Symbols at all (the contents API 404s it, checked against
     * blur_on as a known-good control).
     *
     * `aspect_ratio` stands in for the crossed-tile mark, which has no open
     * equivalent. Flagged as a substitution rather than dressed up as a match.
     *
     * Nam offered Google's own artwork, lightly modified. Declined: a light edit
     * of someone's artwork is still their artwork, and this repo's loudest claim
     * is that the only Google-owned assets here are named and licensed for the
     * use. A real type programme at the right size beats both a hand-drawing and
     * a borrowed file.
     */
    // data-tip-base: the three controls tip from the PILL's bottom edge rather
    // than their own, so a 40-tall button does not sit its tooltip 2px above a
    // 44-tall one. See tooltip.ts.
    t.append(h('div', { class: 'solo-ctls', 'data-tip-base': '' },
      fx('blur_on', 'Backgrounds and effects', ''),
      fx('aspect_ratio', 'Show in a tile', 'solo-tile'),
      more));
    tileEl = t as HTMLElement;
    wireDrag(tileEl);
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

  /**
   * The panel that is currently mounted, and which kind it is showing.
   *
   * THE BUG THIS FIXES. drawPanel() ran on every store change — the subscriber
   * is `sync(); drawPanel()` — and it opened with clear(panelHost) and rebuilt
   * the <aside> from scratch. A brand new element means `animation: side-in`
   * runs again, so toggling the mic slid the panel in from the right. Nam:
   * "triggered every time I interact with anything on screen".
   *
   * Measured on the live product: switching content with the panel open leaves
   * the aside's x at 2184, its transform at none, and getAnimations() filtered
   * to that element returns ZERO. Meet does not animate a content change at all.
   *
   * So the element has to survive. Closed -> open is the only transition that
   * mounts a new aside, and therefore the only one that animates. Everything
   * else swaps the heading and the body in place.
   */
  let mounted: { el: HTMLElement; head: HTMLElement; kind: Panel } | null = null;

  /** How long the panel takes to leave. Must match `side-out` in styles.css. */
  const SIDE_OUT_MS = 240;

  const drawPanel = (): void => {
    const s = store.get();
    releaseTrap?.();
    releaseTrap = null;
    // Meet shrinks the tile when a panel opens rather than overlaying it:
    // 16 + 1032 + 17 + 358 + 17 = 1440. The class is what lets the CSS do that.
    document.body.classList.toggle('has-panel', s.panel !== 'none');
    if (s.panel === 'none') {
      /*
       * IT SLIDES OUT. Nam: "when closing the right panel, it currently just
       * disappears instantly. That's wrong. It should have a slide out exit
       * animation."
       *
       * It had an entrance and no exit, which is the asymmetry you notice without
       * being able to name: the panel arrives like a drawer and leaves like a
       * deleted element. Meet slides it back out under the same easing.
       *
       * The element outlives the state change by the length of the animation, so
       * it is detached on a timer -- and `mounted` is cleared IMMEDIATELY, so a
       * panel reopened during the slide builds a fresh one rather than reviving
       * the one on its way out.
       */
      const going = mounted?.el;
      mounted = null;
      if (going) {
        going.classList.add('is-out');
        // aria-hidden as well as pointer-events: for the 240ms it is still in the
        // tree it is a picture of a panel, not a panel.
        going.setAttribute('aria-hidden', 'true');
        window.setTimeout(() => going.remove(), SIDE_OUT_MS);
      }
      return;
    }

    const title = TITLES[s.panel];
    const body =
      s.panel === 'chat' ? h('div', { class: 'side-body' }, renderChat())
      : s.panel === 'people' ? h('div', { class: 'side-body' }, renderPeople({
          handRaised: s.handRaised,
          pinned: s.pinned,
          onLower: () => { store.dispatch({ t: 'hand', on: false }); },
        }))
      : s.panel === 'about' ? h('div', { class: 'side-body' }, renderAbout())
      : s.panel === 'present' ? h('div', { class: 'side-body' }, renderPresent(store))
      : s.panel === 'offclock' ? h('div', { class: 'side-body' }, renderOffClock())
      : s.panel === 'host' ? h('div', { class: 'side-body' }, hostControls(store))
      : renderEng(store, quests);

    const panel = h(
      'aside',
      {
        // is-tools, not wide. Nam: "All right panels should have the same size,
        // only different in content." The class is a styling hook for the tabbed
        // body, and it no longer says anything about width.
        class: `side ${s.panel === 'tools' ? 'is-tools' : ''}`,
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
            /**
             * Closes, unconditionally. It used to dispatch `s.panel`, relying on
             * the reducer's toggle -- and `s` is captured from the render that
             * first MOUNTED this aside. The reuse path below deliberately keeps
             * that element alive and only swaps the heading and body, so this
             * handler kept pointing at whichever panel opened first.
             *
             * Nam: open About, then Chat, then close -> "I only close the chat
             * panel, but the more about nam panel is still up!?" It was not still
             * up; the button dispatched {panel:'about'} while the state said
             * 'chat', and `s.panel === a.panel ? 'none' : a.panel` therefore
             * SWITCHED to About instead of closing.
             *
             * A close button has no business consulting the current panel at all.
             * The toggle belongs to the bar controls, where clicking People while
             * People is open should close it; here the intent is unambiguous.
             */
            onclick: () => store.dispatch({ t: 'panel', panel: 'none' }),
          },
          sym('close', 22),
        ),
      ),
      body,
    );

    // Already open? Keep the element and swap its contents, so nothing animates.
    if (mounted) {
      mounted.kind = s.panel;
      mounted.el.className = `side ${s.panel === 'tools' ? 'is-tools' : ''}`;
      mounted.el.setAttribute('aria-label', title);
      const h2 = mounted.head.querySelector('h2');
      if (h2) h2.textContent = title;
      // Same staleness, quieter: the close button's accessible name was baked in
      // at mount, so it still announced "Close More about Nam" over the chat.
      const closeBtn = mounted.head.querySelector('button');
      if (closeBtn) closeBtn.setAttribute('aria-label', `Close ${title}`);
      const oldBody = mounted.el.lastElementChild;
      if (oldBody && oldBody !== mounted.head) oldBody.replaceWith(body);
      else mounted.el.appendChild(body);
      quests.unlock(s.panel);
      return;
    }

    panelHost.appendChild(panel);
    mounted = { el: panel, head: panel.firstElementChild as HTMLElement, kind: s.panel };
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

  /**
   * The caret tab beside the mic and camera buttons.
   *
   * On the audio side it is not a caret at rest — it is the microphone's level
   * meter, three bars in a 20x20 slot, and the caret only appears on hover.
   * Google drives those bars from a PNG sprite: each is a 0.25em window onto a
   * strip and the level is a background-position-x step. We rebuild the
   * mechanism rather than ship their asset, keeping the 0.2s and 0.4s stagger
   * their own rules carry.
   *
   * The swap is a plain display change, not a crossfade — measured display:none
   * on the meter against inline-block on the glyph.
   */
  const caretGlyph = (): HTMLElement => { const g = sym('keyboard_arrow_up', 20); g.classList.add('chev-caret'); return g; };
  const chev = (label: string, kind: 'audio' | 'video'): HTMLButtonElement => {
    const meter = kind === 'audio'
      ? h('span', { class: 'lvl', 'aria-hidden': 'true' },
          h('i', { class: 'lvl-b' }), h('i', { class: 'lvl-b' }), h('i', { class: 'lvl-b' }))
      : null;
    const b = h('button', {
      class: 'chev' + (kind === 'audio' ? ' has-meter' : ''),
      type: 'button', 'aria-label': label, 'aria-expanded': 'false',
      onclick: () => setSettings(kind),
    }, h('span', { class: 'chev-slot' }, meter, caretGlyph())) as HTMLButtonElement;
    ripple(b);
    tipAll(b);
    return b;
  };
  const audioChev = chev('Audio settings', 'audio');
  const videoChev = chev('Video settings', 'video');

  const micBtn = cbtn('Turn on microphone', 'mic_off', 'w48', () => {
    const on = !store.get().micOn;
    store.dispatch({ t: 'mic', on });
    // Nam: "we should have a small delay after enabling the mic, kinda like the
    // computer is checking if we actually have a mic". It does, and it is 535ms
    // — timed on the live product from the click to the card appearing. Close
    // enough to the tooltip's own 540ms cold delay to look like one house
    // number for "long enough to read as thinking".
    //
    // Guarded: if the mic goes off again inside that window, the check is
    // abandoned rather than firing a card about a state we have left.
    if (on) {
      window.clearTimeout(micCheck);
      micCheck = window.setTimeout(() => { if (store.get().micOn) micNotice(); }, 535);
    } else {
      window.clearTimeout(micCheck);
    }
  }, () => {
    const on = store.get().micOn;
    return { on, icon: on ? 'mic' : 'mic_off', label: on ? 'Turn off microphone' : 'Turn on microphone' };
  });

  const camBtn = cbtn('Turn on camera', 'videocam_off', 'w48', () => { deps.toggleCamera(); }, () => {
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
    if (on) quests.unlock('hand');
    if (on) replayHand();

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
      h('div', { class: 'unit' }, audioChev, micBtn, warnBadge()),
      h('div', { class: 'unit' }, videoChev, camBtn, warnBadge()),
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

  /**
   * The participant button — Nam's avatar and a truthful count of one.
   *
   * It used to be a people glyph beside an invented 6, which is two problems:
   * this call has exactly one person in it, and the button that shows who is
   * here had been quietly conflated with the raised-hand chip. They are separate
   * controls in the original and they are separate here.
   */
  const countChip = h(
    'button',
    {
      class: 'count-chip', type: 'button',
      'aria-label': '1 person in this call. Show everyone.',
      onclick: () => store.dispatch({ t: 'panel', panel: 'people' }),
    },
    h('span', { class: 'ppl-av-sm', 'aria-hidden': 'true' },
      profile.name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()),
    h('span', { class: 'count-n' }, '1'),
  );


  /**
   * The hover popups the top-right chips own.
   *
   * Both are the same shell, measured on the live product and clearly one
   * component in Google's hands: a 320-wide surface at radius 16 on #282a2c,
   * a 56-tall header whose title is 500 16px, and a 256x40 action in the
   * footer. Raised hands fills it with a 288x128 card on #333537; People fills
   * it with a 288x56 primary and a pair of 140x40 buttons. Same box, different
   * filling — the same shape the device settings rows turned out to have.
   *
   * Open on hover, and stay open while the pointer is anywhere over the chip
   * OR the popup. Without that second half the popup closes the instant you
   * move toward it, which is the bug that makes hover menus feel broken.
   */
  function hoverPop(host: HTMLElement, build: () => HTMLElement): HTMLElement {
    const pop = build();
    pop.hidden = true;
    host.appendChild(pop);
    let shut = 0;
    /**
     * Set only while dismiss() hands focus back, so the focusin that causes
     * cannot re-open what we are closing. See dismiss() for why.
     */
    let restoring = false;
    const open = (): void => { if (restoring) return; window.clearTimeout(shut); pop.hidden = false; };
    // A short grace period, so crossing the gap between chip and popup does
    // not count as leaving.
    const close = (): void => { window.clearTimeout(shut); shut = window.setTimeout(() => { pop.hidden = true; }, 180); };
    /**
     * Activating anything inside dismisses it AT ONCE.
     *
     * Nam, on the count popup: "clicking View more about Nam opens up the right
     * panel, which should also close that drop down on my avatar." Same
     * complaint as the tile menu's pin row, and the same underlying shape: an
     * action that changes what is on screen left its own transient surface up.
     *
     * Worse here than in the menu, because this popup is HOVER-driven -- its
     * only close path is pointerleave, so the popup sat there under a cursor
     * that had not moved, on top of the panel it had just opened.
     *
     * One handler on the container rather than a dismiss() threaded through
     * every action: both popups built on this take four or five buttons each,
     * and the rule "activating a control closes the popup" belongs to the popup
     * rather than to each button that happens to live in it.
     *
     * No re-open race: `open` only fires on pointerenter and focusin, and
     * neither happens while the pointer is already inside. Moving out and back
     * in reopens it, which is correct for a hover surface.
     */
    const dismiss = (): void => {
      window.clearTimeout(shut);
      const hadFocus = pop.contains(document.activeElement);
      pop.hidden = true;
      // Hiding the element that holds focus would drop focus to the body and
      // lose the keyboard user's place, so hand it back to the chip.
      //
      // ...and that re-opened the popup, which is the bug Nam reported twice.
      // `open` is bound to focusin, focus() fires focusin SYNCHRONOUSLY, and the
      // chip is inside `host` -- so restoring focus immediately undid the hide.
      //
      // It only bit in a real browser: clicking a button focuses it, so hadFocus
      // is true and this branch runs. A synthetic .click() moves no focus, so my
      // probe took the hadFocus === false path and passed. Second time this
      // session a synthetic event has bought a false pass, after body.click()
      // failing to reach a pointerdown listener.
      if (hadFocus) {
        const back = [...host.querySelectorAll<HTMLElement>('button,[tabindex]')].find((el) => !pop.contains(el));
        restoring = true;
        back?.focus();
        restoring = false;
      }
    };
    pop.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) dismiss();
    });
    host.addEventListener('pointerenter', open);
    host.addEventListener('pointerleave', close);
    host.addEventListener('focusin', open);
    host.addEventListener('focusout', close);
    return pop;
  }

  const initials = profile.name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();

  const popShell = (title: string, body: HTMLElement[], footLabel: string, onFoot: () => void): HTMLElement => {
    const foot = h('button', { class: 'pop-foot-btn', type: 'button' }, footLabel, sym('chevron_right', 18)) as HTMLButtonElement;
    ripple(foot);
    foot.addEventListener('click', onFoot);
    return h('div', { class: 'pop', role: 'group', 'aria-label': title },
      h('div', { class: 'pop-h' }, h('span', { class: 'pop-t' }, title)),
      ...body,
      h('div', { class: 'pop-foot' }, foot)) as HTMLElement;
  };
  /*
   * The participant count, and the popup Meet hangs off it.
   *
   * Measured: a 288x56 "Add people" primary on #a8c7fa, a pair of 140x40
   * outlined buttons at an 8px gap, the joined count, and a 256x40 footer action
   * where the original reads "View everyone in this call".
   *
   * Ours reads "View more about Nam", and that is the point of the whole panel.
   * Nam: "This is the part we start to inject more about us into this CV." The
   * career timeline that used to squat in the People panel lives behind it.
   */
  const countWrap = h('div', { class: 'count-wrap' }, countChip) as HTMLElement;
  const addPeople = h('button', { class: 'pop-primary', type: 'button' }, 'Add people') as HTMLButtonElement;
  ripple(addPeople);
  addPeople.addEventListener('click', () => store.dispatch({ t: 'readyCard', on: true }));
  const allMuted = h('button', { type: 'button' }, 'All muted') as HTMLButtonElement;
  const hostCtl = h('button', { type: 'button' }, 'Host controls') as HTMLButtonElement;
  ripple(allMuted); ripple(hostCtl);
  hostCtl.addEventListener('click', () => store.dispatch({ t: 'panel', panel: 'host' }));
  allMuted.addEventListener('click', () => store.dispatch({ t: 'panel', panel: 'people' }));
  hoverPop(countWrap, () => popShell('People', [
    addPeople,
    h('div', { class: 'pop-pair' }, allMuted, hostCtl),
    h('div', { class: 'pop-joined' },
      h('div', { class: 'pop-joined-n' }, '1 joined'),
      h('div', { class: 'pop-joined-s' }, 'Just you'),
      h('div', { class: 'pop-joined-av' }, h('span', { class: 'pop-av' }, initials))),
  ], 'View more about Nam', () => store.dispatch({ t: 'panel', panel: 'about' })));

  const netChip = h('span', { class: 'count-chip', style: 'background:transparent;cursor:default' });
  const drawNet = (): void => {
    const c = sample(store.get().net as Profile, Math.floor(performance.now() / 1600));
    clear(netChip);
    netChip.append(sym('speed', 18), `${c.label} · ${c.rtt} ms`);
    if (store.get().net === 'collapse') quests.unlock('collapse');
  };
  drawNet();
  window.setInterval(drawNet, 1600);

  /**
   * The top bar's presenting chip, and the Stop presenting beside it.
   *
   * Nam, from the real product: "on top it says what is being presented and
   * from whom, along with a stop presenting button... these both have popup
   * label and stop presenting has a very very slight tint on hover."
   *
   * The tint is M3's hover state layer at 0.08, tinted with the container's own
   * on-colour — the same token every other control on this page uses, so it is
   * not a one-off value invented to match a screenshot.
   *
   * This one is from Nam's screenshots rather than measured. Presenting cannot
   * be reached through automation: the capture picker is browser chrome, not
   * page DOM, so there is no way to drive it and read the result back.
   */
  const presStop = h('button', { class: 'pres-stop', type: 'button' }, 'Stop presenting') as HTMLButtonElement;
  ripple(presStop);
  presStop.addEventListener('click', () => stopShare());
  tip(presStop, 'Stop presenting your screen');
  const presWho = h('span', { class: 'pres-who' }, '');
  /**
   * MEASURED off the live presenting pill, 2026-08-25 — Nam kept the share up
   * long enough to read it, which is the first time this surface has been
   * measurable at all:
   *
   *   container   678 x 46 @ 1630,4
   *   glyph       present_to_all, 24px, #e3e3e3   (we had 18px in #a8c7fa)
   *   label       500 14px/20px Google Sans #e3e3e3  (we had 12px/1)
   *   audio label 500 14px/20px, same ink, after a divider
   *   knob glyph  volume_up at 12px in #d3e3fd
   *
   * The 14px is the whole of Nam's "font is very small": ours was 12px with a
   * 12px line-height, which is two misses stacked.
   *
   * The switch and the Stop presenting button's own box are matched to the
   * screenshot rather than measured — the call ended before I could read them,
   * and that is worth saying rather than presenting all of this as one number.
   */
  const presAud = h('button', {
    class: 'pres-aud', type: 'button', role: 'switch', 'aria-checked': 'true',
    'aria-label': 'Presentation audio',
  }, h('span', { class: 'pres-aud-knob' }, sym('volume_up', 12))) as HTMLButtonElement;
  presAud.addEventListener('click', () => {
    store.dispatch({ t: 'presAudio', on: !store.get().presAudio });
  });
  tip(presAud, 'Share audio from the presentation');
  const presChip = h('div', { class: 'pres-chip', role: 'status' },
    sym('present_to_all', 24), presWho,
    h('span', { class: 'pres-div', 'aria-hidden': 'true' }),
    h('span', { class: 'pres-aud-label' }, 'Presentation audio'),
    presAud, presStop) as HTMLElement;
  presChip.hidden = true;
  tip(presWho, 'You are presenting to everyone in the call');

  /**
   * The raised hand shows up here too, and clicking it opens the People panel
   * where it can be lowered — which is exactly what the live product does: the
   * chip is a shortcut into the list, not a menu of its own.
   *
   * Measured at 1440x900: 125x36, radius 48, #80da88 with a 32px #00381f disc
   * at inset 2 and the name at x36 in 500 12px Google Sans.
   *
   * Note the green is NOT the tile pill's #6dd58c. Two surfaces, two values,
   * and reusing one for both would have been the easy wrong answer.
   */
  const handChip = h('button', {
    class: 'hand-chip', type: 'button',
    'aria-label': 'You raised your hand. Open the participant list to lower it.',
    onclick: () => store.dispatch({ t: 'panel', panel: 'people' }),
  },
    h('span', { class: 'hand-chip-disc', 'aria-hidden': 'true' }, sym('back_hand', 20)),
    h('span', {}, profile.name)) as HTMLButtonElement;
  ripple(handChip);

  /*
   * Hovering the chip opens the Raised hands popup; "View all" opens the side
   * panel — which is what clicking the chip does too, so the popup is a preview
   * of the panel rather than a rival to it.
   *
   * The row's glyph swaps front_hand -> cancel on hover. Measured: it is a swap
   * in the same 24x24 slot, not an extra control appearing beside it.
   */
  const handWrap = h('div', { class: 'hand-chip-wrap' }, handChip) as HTMLElement;
  handWrap.hidden = true;
  const lowerAllPop = h('button', { type: 'button', 'aria-label': 'Lower all hands' }, 'Lower all') as HTMLButtonElement;
  ripple(lowerAllPop);
  lowerAllPop.addEventListener('click', () => store.dispatch({ t: 'hand', on: false }));
  const rowAct = h('button', { class: 'pop-act', type: 'button', 'aria-label': `Lower ${profile.name}'s hand` },
    h('span', { class: 'is-hand' }, sym('back_hand', 24)),
    h('span', { class: 'is-cancel' }, sym('close', 24))) as HTMLButtonElement;
  rowAct.addEventListener('click', () => store.dispatch({ t: 'hand', on: false }));
  tip(rowAct, 'Lower');
  hoverPop(handWrap, () => popShell('Raised hands', [
    h('div', { class: 'pop-card' },
      h('div', { class: 'pop-lower-all' }, lowerAllPop),
      h('div', { class: 'pop-row' },
        h('span', { class: 'pop-av', 'aria-hidden': 'true' }, initials),
        h('span', { class: 'pop-name' }, profile.name),
        rowAct)),
  ], 'View all (1)', () => store.dispatch({ t: 'panel', panel: 'people' })));
  const top = h(
    'header',
    { class: 'call-top' },
    clockEl,
    h('span', { class: 'call-sep' }, '|'),
    h('span', { class: 'call-code' }, CODE),
    h(
      'button',
      { class: 'icon-btn on-dark', type: 'button', 'aria-label': 'Meeting details', onclick: () => store.dispatch({ t: 'readyCard', on: true }) },
      // 17px, which is what Meet's own info glyph measured inside this 29x29
      // button. Ours was 20, and at that size a 29px circle leaves 4.5px of ring
      // where the original leaves 6 -- centred correctly since the UA padding fix,
      // but still visibly tighter than the thing it copies.
      sym('info', 17),
    ),
    h('div', { class: 'call-top-right' }, presChip, handWrap, netChip, countWrap),
  );

  // ------------------------------------------------- "meeting's ready" card --

  // Reaching the call screen with the card armed IS the automatic open, so this
  // is where it gets counted. The view is built once per join — render() returns
  // early for an already-mounted call — so one arrival is one show, and going
  // home and joining again counts as the second one it is.
  //
  // Deliberately NOT counted: the two buttons below that open the card on
  // request (Meeting details, and Add people). Asking to see it is not the same
  // event as being shown it unprompted, and only the unprompted one is annoying.
  if (store.get().readyCard) noteReadyShown();

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
          {
            class: 'icon-btn',
            type: 'button',
            'aria-label': 'Close',
            onclick: () => {
              // Closing it is the clearest signal there is: mute for an hour.
              noteReadyClosed();
              store.dispatch({ t: 'readyCard', on: false });
            },
          },
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


  const layer = h('div', {});

  /**
   * Reactions get their own clipped layer.
   *
   * Nam: "there is a cut off below which you dont see any emojis. We dont have
   * this." MEASURED by firing a burst on the live product and reading the
   * screenshot -- reactions are not in the DOM, so a screenshot is the only
   * instrument available. An emoji sat sliced in half at y 662 of a 745-tall
   * shot, about 1080 CSS, which is exactly where the shared surface's bottom
   * edge lands. So the clip is the STAGE's bottom, not the viewport's.
   *
   * It cannot live on `layer`, which also carries menus and toasts and would
   * clip those. It cannot live inside .grid-wrap either: the band is anchored to
   * the CALL area's left edge at x 73, not the stage's, so nesting it in the
   * stage would shift every reaction by the stage's own left inset. Hence a
   * full-width layer clipped along the bottom only.
   */
  const reactClip = h('div', { class: 'react-clip', 'aria-hidden': 'true' });

  /**
   * Meet's mic bubble, and the behaviour is the interesting half.
   *
   * Turning the mic on with no device raises a card, and clicking that card's X
   * turns the mic back OFF. Verified on the live product rather than assumed: the
   * button's accessible name went "Turn off microphone" -> click the X -> "Turn
   * on microphone". The close is the off switch, not a dismissal.
   *
   * Which makes it a genuinely good pattern to borrow. The failure and its
   * remedy are the same gesture, so there is no way to acknowledge the problem
   * and leave the control lying about its state.
   *
   * The card is centred on the mic button and sits 22px above the button tops.
   * The offset is computed from the button's real rect because the bar's layout
   * moves with the viewport, and clamped so a narrow window cannot push a 386px
   * card off the edge.
   */
  let micNote: HTMLElement | null = null;
  let micCheck = 0;

  function closeMicNote(alsoMute: boolean): void {
    const card = micNote;
    if (!card) return;
    micNote = null;
    card.classList.add('is-out');
    // The measured exit is a 100ms linear fade; remove on the way out so the
    // card is not still catching clicks while it is invisible.
    window.setTimeout(() => card.remove(), 110);
    if (alsoMute && store.get().micOn) store.dispatch({ t: 'mic', on: false });
  }

  function micNotice(): void {
    closeMicNote(false);
    const card = noticeCard(
      'Microphone not found',
      'Make sure your microphone is plugged in',
      () => closeMicNote(true),
    );
    card.classList.add('mic-note');
    micNote = card;
    layer.appendChild(card);
    const anchor = micBtn.getBoundingClientRect();
    const w = card.offsetWidth || 386;
    const left = Math.round(
      Math.max(8, Math.min(anchor.left + anchor.width / 2 - w / 2, window.innerWidth - w - 8)),
    );
    card.style.left = `${left}px`;
    // The tail points at the button even when the clamp has moved the card.
    const tail = Math.round(anchor.left + anchor.width / 2 - left);
    card.style.setProperty('--tail', `${tail}px`);
  }

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
  /*
   * Nam's brief, and the reasoning is his: lead with the emoji people already
   * know from Meet so the tray reads as familiar, then hand off to ours. "Add
   * all of those, then remove the last two original emojis, the thumb down and
   * the thinking face, then add back our creative emojis, the mahjong, tandem
   * and zombie."
   *
   * Meet's nine, read off the live tray as Noto Emoji codepoints rather than
   * guessed from a screenshot:
   *
   *   1f496 heart   1f44d thumb   1f389 party   1f44f clap   1f602 joy
   *   1f62e open    1f622 cry     1f914 think   1f44e down
   *
   * Drop think and down, append ours. Ten slots against Meet's nine, which the
   * 40px pitch absorbs without touching the layout.
   *
   * Losing 1f3b2 dice and 1f3a4 mic to make room was not in the brief either
   * way; they were the two of ours that said least.
   */
  const REACT_SET = ['💖', '👍', '🎉', '👏', '😂', '😮', '😢', '🀄', '🪂', '🧟'];

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
    /**
     * The pre-roll below the clip line, matching the CSS `bottom: -88px`.
     *
     * Added to the travel rather than replacing part of it, so the TOP of the
     * arc is where it always was. The fade keyframe sits at 85% of the
     * animation, so lengthening the travel by 88 moves the fade's absolute
     * position down by only 0.15 * 88 = 13px -- worth stating, because the fade
     * was measured at a screen position rather than a fraction of the life, and
     * 13px is the cost of the emoji now being born out of sight.
     */
    const BELOW = 88;
    const rx = BAND_X + Math.round(Math.random() * BAND_W);
    const el = h(
      'div',
      { class: 'reaction' },
      h('span', { class: 'reaction-em' }, pick),
      h('span', { class: 'reaction-who' }, 'You'),
    );
    el.style.setProperty('--rx', `${rx}px`);
    el.style.setProperty('--rise', `${Math.round(tileH + BELOW)}px`);
    el.style.setProperty('--dur', `${((tileH + BELOW) / RISE).toFixed(2)}s`);
    // A different phase per reaction so a burst does not pulse in lockstep.
    el.style.setProperty('--phase', `-${(reactSeq % 6) * 130}ms`);
    reactSeq += 1;
    reactClip.appendChild(el);
    window.setTimeout(() => el.remove(), ((tileH + BELOW) / RISE) * 1000 + 200);
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

  /**
   * The device settings rows, both measured at exactly 576x56 in the same
   * position — one shell, two fillings.
   *
   * Opening one takes the emoji tray's place and dismisses the mic bubble, both
   * of which the live product does. Closing it puts the tray back only if the
   * tray was what you had open, which is the behaviour that makes the pair feel
   * like one slot rather than two things fighting over it.
   *
   * Unlike the tray, the row does NOT shrink the tile — it floats over the
   * bottom 52px. Verified rather than assumed: the tile stayed 748 tall with the
   * row open where the tray takes it to 696.
   */
  let settingsKind: 'audio' | 'video' | null = null;
  let trayBeforeSettings = false;
  let settingsRowEl: HTMLElement | null = null;

  function paintChevs(): void {
    audioChev.setAttribute('aria-expanded', String(settingsKind === 'audio'));
    videoChev.setAttribute('aria-expanded', String(settingsKind === 'video'));
  }

  function settingsChip(icon: IconName | null, label: string, warn: boolean, caret: boolean): HTMLElement {
    let glyph: HTMLElement | null = null;
    if (icon) { glyph = sym(icon, 18); if (warn) glyph.classList.add('is-warn'); }
    const b = h('button', { class: 'set-chip', type: 'button', 'aria-label': label },
      glyph,
      h('span', {}, label),
      caret ? dropCaret(20) : null) as HTMLButtonElement;
    ripple(b);
    return b;
  }

  function settingsRow(kind: 'audio' | 'video'): HTMLElement {
    const gear = h('button', { class: 'set-gear', type: 'button', 'aria-label': 'Settings' }, sym('settings', 20)) as HTMLButtonElement;
    ripple(gear);
    tipAll(gear);
    // Meet's own labels. This page really has no microphone, speaker or camera,
    // so they are not placeholders standing in for something — they are true.
    const kids = kind === 'audio'
      ? [settingsChip('mic_none', 'Mic not found', false, true),
         settingsChip('error', 'Speaker not found', true, true)]
      : [settingsChip('videocam', 'Permission needed', false, true),
         settingsChip('blur_on', 'Blur background', false, false),
         settingsChip(null, 'Backgrounds and effects', false, false)];
    return h('div', { class: 'set-row', role: 'group', 'aria-label': kind === 'audio' ? 'Audio settings' : 'Video settings' },
      ...kids, gear) as HTMLElement;
  }

  function setSettings(kind: 'audio' | 'video' | null): void {
    const next = settingsKind === kind ? null : kind;
    // The measured exit is a 100ms linear fade, so the old row has to outlive
    // the state change by that long.
    if (settingsRowEl) {
      const dying = settingsRowEl;
      settingsRowEl = null;
      dying.classList.add('is-out');
      window.setTimeout(() => dying.remove(), 110);
    }
    // Captions sit in the same band, so they lift for the row exactly as they
    // lift for the tray. Nam found them overlapping it, which is how the row got
    // noticed at all: it was still open from a previous step when captions came
    // on, and the two drew on top of each other.
    document.body.classList.toggle('set-open', next !== null);
    if (next !== null) {
      if (settingsKind === null) trayBeforeSettings = trayOpen;
      closeMicNote(false);
      if (trayOpen) setTray(false);
      const row = settingsRow(next);
      settingsRowEl = row;
      layer.appendChild(row);
    } else {
      const restore = trayBeforeSettings;
      trayBeforeSettings = false;
      if (restore) setTray(true);
    }
    settingsKind = next;
    paintChevs();
  }

  function setTray(v: boolean): void {
    // The tray and the settings row share one slot; asking for one puts the
    // other away. Guarded on settingsKind so the restore path below cannot
    // bounce back into here.
    if (v && settingsKind !== null) { trayBeforeSettings = false; setSettings(null); }
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
  /**
   * What double-clicking a file in the shared Explorer does.
   *
   * These were wired to a no-op default, so the window looked interactive and
   * was not. The CV opens the plain document view; the two notes open the
   * tools panel, which is where the requirement map and the measured spec
   * actually live on this site.
   */
  function openDoc(id: string): void {
    /**
     * Only Window mode reaches this. On the desktop a file opens in the emulated
     * Chrome, which is a closed machine; Window mode has one Explorer and no
     * browser, so a file has to land somewhere in the host app instead.
     *
     * The ids come from the Explorer listing and are now cv / jobad / work /
     * riichi / tools / hobby / vid:*. Before this every one of them except two
     * legacy names fell through to the Engineering panel's NETWORK tab, which
     * had nothing to do with any of them -- a file click that opened a graph of
     * packet loss. The default is the plain document view now, which is the one
     * genuine "opened a document" surface this app has.
     *
     * Known limitation, stated rather than papered over: sharing a single window
     * and opening a file is a case where a real viewer would see nothing at all,
     * because the browser is not the window being captured. Routing to the host
     * app is the useful lie; the alternative is a dead row.
     */
    if (id === 'plain' || id === 'cv') { store.dispatch({ t: 'plain', on: true }); return; }
    // Was routing to the effects tab, which no longer exists -- and 'spec' was
    // always the honest destination for a file called spec anyway.
    if (id === 'spec') { store.dispatch({ t: 'engTab', tab: 'spec' }); return; }
    if (id === 'hobby' || id.startsWith('vid:')) { store.dispatch({ t: 'panel', panel: 'offclock' }); return; }
    if (id === 'jobad') { store.dispatch({ t: 'panel', panel: 'about' }); return; }
    store.dispatch({ t: 'plain', on: true });
  }

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
      onShare: (src) => {
        close();
        // Sharing a single window ends when the window does, which is what
        // Windows itself does and what Nam asked for: "if you close it then we
        // exit the screensharing mode."
        startShare(m.renderShared(src, openDoc, () => stopShare()), src.title);
      },
    }));
  }

  function startShare(content: HTMLElement, title: string): void {
    stopShare();
    /**
     * No banner and no red Stop sharing along the bottom.
     *
     * Nam: "there is no red stop sharing button on the bottom of the sharing
     * screen, only the stop presenting on the top bar." Confirmed against both
     * of his screenshots — the only red bar in them is CHROME's own "Sharing
     * ... to this tab", which is browser chrome and not ours to draw.
     *
     * Nothing is orphaned by dropping it: `presStop` in the top-bar pill has
     * always called stopShare(), so the action keeps its one real home.
     */
    const wrap = h('div', { class: 'shot-wrap' }, content);
    // The share belongs to the STAGE, not to the tile. It used to be appended
    // inside .solo, which is why the shared screen and the self view were the
    // same box. Meet splits them: the share takes the stage and the self view
    // shrinks to a small tile on the right, carrying its own name plate, mute
    // badge and — the part that matters — its raised hand.
    stage.appendChild(wrap);
    document.body.classList.add('presenting');
    presWho.textContent = `${profile.name} (You, presenting)`;
    presChip.hidden = false;
    sharing = { el: wrap };
    // Not a dispatch, so sync() will not fire for this: the tile becomes the
    // free-floating small one here and needs its corner applied now.
    if (tileEl && !store.get().pinned) place(tileEl, false);
    presentBtn.classList.add('is-active');
    presentBtn.sync?.();
    quests.unlock('present');
    announce(`Presenting ${title}`);
  }

  function stopShare(): void {
    sharing?.el.remove();
    sharing = null;
    document.body.classList.remove('presenting');
    // The bar only exists beside a share, so ending one restores the tile rather
    // than leaving a collapsed bar with nothing to sit next to.
    if (store.get().minimized) store.dispatch({ t: 'minimize', on: false });
    // The inline corner placement must go with it, or a stale left/top would
    // fight the full-stage rules once the tile is the whole stage again.
    if (tileEl) unplace(tileEl);
    presChip.hidden = true;
    // The tile has just gone from 240x135 back to the full stage. Anything
    // mid-animation on it was sized for the small frame, so the hand replays
    // rather than snapping — which is also what the real product does.
    replayHand();
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
  /**
   * The overflow menu's dismisser, and why the toggle was broken.
   *
   * Nam: "you click the button, it appears, and if you click again, it appears
   * again." The guard below has always been there, so it looked like it should
   * already toggle. Traced, the single press does both things:
   *
   *   click(btn)          menu OPEN      first press
   *   pointerdown(doc)    menu closed    dismisser, capture phase
   *   click(btn)          menu OPEN      reopened by the SAME press
   *
   * pointerdown precedes click, and the dismisser was listening on document in
   * the capture phase, so it saw a press on the trigger as a press outside the
   * menu and closed it. By the time click reached the guard there was nothing
   * open left to find, so it opened a fresh one. Closed and reopened inside one
   * gesture, which reads exactly like a menu that will not shut.
   *
   * The trigger is not "outside". Ignoring it there leaves the button's own click
   * to do the toggling, which is where that decision belongs.
   *
   * The dismisser is also tracked now rather than left to unbind itself on some
   * later outside press. Menu items can close the menu themselves, and a
   * listener that outlives the thing it was watching is how the next version of
   * this bug gets written.
   */
  let closeMenu: (() => void) | null = null;

  function menu(): void {
    if (closeMenu) { closeMenu(); return; }
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
      // Meet's own label, opening our Project specs -- the same panel the home
      // screen's Settings button opens. Faithful chrome, honest destination, and
      // it makes the build notes reachable from inside the call.
      { icon: 'settings', label: 'Settings', onPick: () => { void openDev(store); } },
    ];
    // Picking a row closes the menu. gmMenu has always accepted an onPicked and
    // this call site never passed one, so the rows did nothing and the menu just
    // sat there. Routed through closeMenu so it resolves at pick time and does
    // not need close() to exist yet.
    const box = gmMenu(rows, 225, () => closeMenu?.());
    /*
     * gm-dark goes on the WRAPPER, not on the menu.
     *
     * Nam: "This menu has the wrong theme." It was: every dark rule is written
     * `.gm-dark .gm-menu`, a descendant selector, and this call site was adding
     * the class to the .gm-menu element itself. `.gm-menu.gm-dark` is not a
     * descendant of anything, so not one of those rules ever matched and the
     * in-call overflow rendered in the pre-join light theme.
     *
     * The other call site passes cls through attachMenu, which lands it on the
     * wrapper — which is why that one has always looked right and this one never
     * did. Same fix as the [hidden] trap in spirit: a selector that assumes a
     * wrapper needs a wrapper.
     */
    const wrap = h('div', { class: 'gm-pop call-more gm-dark' }, box);
    layer.appendChild(wrap);
    const first = box.querySelector('li');
    if (first) (first as HTMLElement).focus();
    const off = (e: Event): void => {
      const t = e.target as Node;
      // The trigger is not outside the menu — see the note above.
      if (wrap.contains(t) || moreBtn.contains(t)) return;
      close();
    };
    // Escape, which every menu owes its keyboard users and this one did not have.
    // Bound on document because focus starts on the first row but can be moved
    // off it, and a menu that only closes while focus is still inside is a trap.
    const esc = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close();
      moreBtn.focus();
    };
    const close = (): void => {
      document.removeEventListener('pointerdown', off, true);
      document.removeEventListener('keydown', esc, true);
      closeMenu = null;
      clear(layer);
    };
    closeMenu = close;
    document.addEventListener('keydown', esc, true);
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
    /**
     * MEASURED: the pin marker SURVIVES a raised hand. It is the name plate
     * that gives way to the green badge, and the pin stays exactly where it
     * was at (16, 15). So this is driven by s.pinned alone and never consults
     * s.handRaised -- which is the whole answer to what Nam asked about.
     */
    pinMark.hidden = !s.pinned;
    document.body.classList.toggle('is-pinned', s.pinned);
    // Only meaningful while presenting and unpinned, which is the only state the
    // original offers it in.
    const collapsed = s.minimized && sharing !== null && !s.pinned;
    minBar.hidden = !collapsed;
    document.body.classList.toggle('is-min', collapsed);
    /**
     * The corner placement is inline, so it has to be withdrawn whenever the tile
     * stops being the free-floating small one -- otherwise a stale left/top would
     * fight the pinned column or the full-stage rules.
     */
    if (tileEl) {
      if (sharing !== null && !s.pinned) place(tileEl, false);
      else unplace(tileEl);
    }
    // Nam wants this on whenever the mic is not enabled, which on this page is
    // effectively always — turning the mic on raises a card whose close turns it
    // straight back off.
    muteBadge.hidden = s.micOn;
    // The hand shows in two places at once, which is what the original does:
    // on your own tile, and in the top bar as a way into the list.
    handWrap.hidden = !s.handRaised;
    audioChev.classList.toggle('mic-live', s.micOn);
    ccBtn.classList.toggle('active', s.captionsOn);
    presentBtn.classList.toggle('active', s.panel === 'present');

    /* The camera is cosmetic, so the tile does not change. There is no stream to
       show and fading the name plate out would leave an empty box -- the button
       un-crossing IS the whole of the state. */
    hostTile.classList.toggle('speaking-ring', s.captionsOn);

    cc.style.display = s.captionsOn ? '' : 'none';
    // Captions reserve 216px and the tile refits, exactly as the tray does.
    document.body.classList.toggle('cc-on', s.captionsOn);
    if (s.captionsOn) startCC(); else stopCC();

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
    shareHost,
    bar,
    readyHost,
    reactClip,
    layer,
  );

  sync();
  drawPanel();
  quests.unlock('join');

  /*
   * The egg boot.
   *
   * Joining an easter-egg meeting lands here already sharing: the desktop is up,
   * the clip is playing in the media player and Explorer is open behind it at the
   * folder the file lives in. Nam: "the call interface is full on here, my video
   * tile on the bottom right, everything where they should be cause we are
   * opening the video inside #call."
   *
   * Read once, at mount. The call view mounts on entry and is kept alive by
   * sync() afterwards, so this cannot re-fire on a state change; and 'leave'
   * clears the id so a later ordinary join does not start presenting on its own.
   */
  const eggId = store.get().eggPlay;
  if (eggId) {
    void (async () => {
      const m = await import('./share.js');
      const src = { id: 'desktop', kind: 'screen' as const, title: 'Screen 1' };
      startShare(m.renderShared(src, openDoc, () => stopShare(), { egg: eggId }), src.title);
    })();
  }

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
