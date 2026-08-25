// Material 3 primitives, measured off Meet's pre-join screen with a real
// pointer rather than inferred from screenshots. Everything here exists because
// clicking and hovering the original turned up behaviour that reading its CSS
// alone did not.
//
// The measurements each primitive is built from are recorded on the primitive.

import { h, icon } from '../dom.js';
import { sym, dropCaret } from './icons.js';
import type { IconName } from './icons.js';

/* ------------------------------------------------------------------ ripple */

/**
 * The press ripple. Nam described it as "a rippling effect changing background
 * color to a slightly darker grey but filling up from the center", and sampling
 * every frame of a real click on a device chip is what it actually is:
 *
 *   ::before   flat state layer, #444746, opacity 0 -> .08 over ~75ms
 *   ::after    radial-gradient(closest-side, #444746 max(100% - 70px, 65%),
 *                              transparent 100%)
 *              opacity 0 -> .1 over ~110ms
 *              transform translate(dx, dy) scale(1 -> ~6.7+), decelerating
 *
 * The transform order is the part worth understanding. `translate(X) scale(S)`
 * maps a point p to X + S*p, so the gradient's own centre — which is p = 0 —
 * lands on X for every S. That is why Meet's matrix keeps e ~71 while the scale
 * runs 1 -> 6.7: the disc grows *about the press point* rather than drifting.
 * Getting that order backwards gives a ripple that slides across the control.
 *
 * So the origin is set from the pointer on the way down, and the class does the
 * rest in CSS.
 */
export function ripple(el: HTMLElement): void {
  // A press shorter than one frame still has to draw a full ripple. The first
  // version dropped the class on pointerup, and a fast click — or any
  // automated one, which is how this was caught — added and removed it inside
  // the same tick, so nothing ever rendered. Meet holds its ripple well past
  // the release, so this enforces a floor: expand for at least MIN ms, then
  // fade, keeping the scale so the disc dissolves in place instead of
  // collapsing back to a dot.
  const MIN = 220;
  const FADE = 150;
  let downAt = 0;
  let timer = 0;

  const down = (e: PointerEvent): void => {
    const b = el.getBoundingClientRect();
    el.style.setProperty('--rx', Math.round(e.clientX - (b.left + b.width / 2)) + 'px');
    el.style.setProperty('--ry', Math.round(e.clientY - (b.top + b.height / 2)) + 'px');
    window.clearTimeout(timer);
    el.classList.remove('is-fading');
    // Force a reflow so a second press restarts the transform from scale(1)
    // rather than continuing from wherever the last one finished.
    el.classList.remove('is-pressed');
    void el.offsetWidth;
    el.classList.add('is-pressed');
    downAt = performance.now();
  };

  const up = (): void => {
    if (!el.classList.contains('is-pressed')) return;
    const held = performance.now() - downAt;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      el.classList.add('is-fading');
      timer = window.setTimeout(() => {
        el.classList.remove('is-pressed', 'is-fading');
      }, FADE);
    }, Math.max(0, MIN - held));
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('pointercancel', up);
  // Keyboard activation gets one too, centred, or Enter on a focused control
  // looks dead next to the same control clicked.
  el.addEventListener('keyup', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    el.style.setProperty('--rx', '0px');
    el.style.setProperty('--ry', '0px');
    el.classList.remove('is-pressed', 'is-fading');
    void el.offsetWidth;
    el.classList.add('is-pressed');
    downAt = performance.now();
    up();
  });
}

/* -------------------------------------------------------------------- menu */

export interface MenuItem {
  icon?: IconName;
  /**
   * An SVG path for the leading slot, for the few glyphs the 7 kB Material
   * subset does not carry. Takes precedence over `icon`. The Calls dialog's
   * "Block user" is the only current user.
   */
  svgPath?: string;
  label: string;
  /** Second line — the device menus use it for "Show more info". */
  sub?: string;
  /** Renders the leading icon in Meet's warning orange. */
  warn?: boolean;
  /** A tick in the leading slot, as the camera menu marks the active device. */
  checked?: boolean;
  onPick?: () => void;
  /** A rule above this item, as the overflow menu has after its first row. */
  ruleBefore?: boolean;
  /**
   * A row that is present but dead. The original's tile menu has two of these
   * and one live row, and the difference is visible: the dead ones take no
   * hover. A row that cannot act should not answer the pointer.
   */
  disabled?: boolean;
}

/**
 * Meet's menu surface, from the device chips and the tile's overflow:
 *
 *   surface  #f0f4f9, radius 12, NO shadow, 8px top and bottom padding
 *   row      48 tall (60 when it has a second line), padding 8px 12px
 *   icon     24px #444746 at dx 12 — warning rows use rgb(255,141,65)
 *   label    500 14/20 #1f1f1f at dx 52
 *   sub      400 14/20 #444746 at dx 52
 *
 * No shadow at all is the surprising one; on a white page the fill alone is
 * what separates it, and adding a shadow reads instantly as not-Meet.
 */
export function menu(items: MenuItem[], width?: number, onPicked?: () => void): HTMLElement {
  const list = h('ul', { class: 'gm-menu', role: 'menu' });
  if (width) list.style.width = `${width}px`;
  for (const it of items) {
    if (it.ruleBefore) list.appendChild(h('li', { class: 'gm-rule', role: 'separator' }));
    const row = h(
      'li',
      { class: 'gm-item' + (it.sub ? ' has-sub' : ''), role: 'menuitem', tabindex: '0' },
      it.checked
        ? sym('check', 24)
        : it.svgPath
          ? icon(it.svgPath, 24)
          : it.icon
            ? sym(it.icon, 24)
            : h('span', { class: 'gm-noicon', 'aria-hidden': 'true' }),
      h(
        'span',
        { class: 'gm-text' },
        h('span', { class: 'gm-label' }, it.label),
        it.sub ? h('span', { class: 'gm-sub' }, it.sub) : null,
      ),
    );
    if (it.warn) row.classList.add('is-warn');
    if (it.checked) row.classList.add('is-checked');
    if (it.disabled) {
      row.classList.add('is-off');
      row.setAttribute('aria-disabled', 'true');
      row.removeAttribute('tabindex');
    } else {
      ripple(row);
    }
    /**
     * Activating a row dismisses the menu. Nam, on the pin row: "after clicking
     * pin, the pinned state is registered, so this panel should be auto closed"
     * -- and the same on unpin, which is the same row in its other face.
     *
     * It stayed open because `menu()` builds the list and `close()` lives in
     * attachMenu, so the row had no way to reach it. Threaded through as a
     * callback rather than reached for via the DOM.
     *
     * onPick runs first so the dispatch lands while the menu is still mounted;
     * the surface is rebuilt from `build()` on every open anyway, so there is
     * nothing to keep in sync across the close.
     *
     * Disabled rows return early and dismiss nothing, which is right: a dead row
     * should not answer the pointer at all, and closing on one would read as the
     * menu having accepted a choice it cannot act on.
     */
    const go = (): void => {
      if (it.disabled) return;
      if (it.onPick) it.onPick();
      onPicked?.();
    };
    row.addEventListener('click', go);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
    list.appendChild(row);
  }
  return list;
}

export interface MenuOpts {
  /** 'left' pins the menu's left edge to the anchor's, 'right' its right. */
  align?: 'left' | 'right';
  /** Vertical placement relative to the anchor. */
  side?: 'below' | 'above' | 'overlap';
  /** Nudge, for menus that do not sit flush. */
  dx?: number;
  dy?: number;
  width?: number;
  /** Extra class on the positioned wrapper. */
  cls?: string;
}

/**
 * Wire an anchor to a menu: open on click, close on outside click or Escape,
 * and rotate the anchor's caret 180 degrees while it is open.
 *
 * The caret rotation is measured — sampling a real click showed the SVG's matrix
 * running from about -20 degrees through to (-1,0,0,-1), a full 180, over
 * roughly 180ms. It is easy to miss and it is most of what makes the chip feel
 * like a real dropdown rather than a button that happens to open something.
 */
export function attachMenu(
  anchor: HTMLElement,
  build: () => MenuItem[],
  /**
   * A function here is resolved on every open, for anchors whose best placement
   * changes with the state around them -- the tile menu has to flip corner by
   * corner once the tile can be dragged. Reading align/side once at attach time
   * froze whichever placement happened to be right when the call was rendered.
   */
  opts: MenuOpts | (() => MenuOpts) = {},
): void {
  let open: HTMLElement | null = null;

  const close = (): void => {
    if (!open) return;
    open.remove();
    open = null;
    anchor.setAttribute('aria-expanded', 'false');
  };

  const onDoc = (e: Event): void => {
    if (!open) return;
    const t = e.target as Node;
    if (open.contains(t) || anchor.contains(t)) return;
    close();
  };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };

  anchor.setAttribute('aria-expanded', 'false');
  anchor.setAttribute('aria-haspopup', 'menu');
  anchor.addEventListener('click', () => {
    if (open) { close(); return; }
    const o = typeof opts === 'function' ? opts() : opts;
    const align = o.align ?? 'left';
    const side = o.side ?? 'below';
    const wrap = h('div', { class: 'gm-pop' + (o.cls ? ' ' + o.cls : '') }, menu(build(), o.width, () => close()));
    document.body.appendChild(wrap);
    const a = anchor.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    // Flush against the anchor: the device menu's top edge sits exactly on the
    // chip's bottom edge, with no gap at all.
    // 'overlap' is the tile overflow's placement: Meet's menu top sits 3px ABOVE
    // the button's top and its right edge 3px outside the button's, so it covers
    // the control rather than hanging off it.
    const top = side === 'below' ? a.bottom : side === 'above' ? a.top - w.height : a.top;
    wrap.style.top = `${Math.round(top + (o.dy ?? 0))}px`;
    const left = align === 'left' ? a.left : a.right - w.width;
    wrap.style.left = `${Math.round(left + (o.dx ?? 0))}px`;
    open = wrap;
    anchor.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('pointerdown', onDoc, true);
  window.addEventListener('keydown', onKey);
}

/* ------------------------------------------------------------- warn badge */

/**
 * The `!` badge Meet puts on a round control whose device is missing. Measured
 * as an SVG at dx 40, dy -2 on the 56x48 button — so it straddles the top-right
 * corner — with the path
 *
 *   M6,0h0c3.3,0,6,2.7,6,6v4c0,3.3-2.7,6-6,6h0c-3.3,0-6-2.7-6-6v-4C0,2.7,2.7,0,6,0Z
 *
 * which is a 12x16 stadium at radius 6, filled #fbbc04. Taller than it is wide,
 * which is not what you would guess from looking at it.
 */
export function warnBadge(): HTMLElement {
  return h(
    'span',
    { class: 'ctl-warn', 'aria-hidden': 'true' },
    h('span', { class: 'ctl-warn-mark' }, '!'),
  );
}

/* -------------------------------------------------------------- mic meter */

/**
 * The level meter in the tile's bottom-left corner: a 26px #a8c7fa circle,
 * inset 16 from the left and 16 from the bottom, holding three 4px-wide bars at
 * dx 5 / 11 / 17 — so 4 wide with 2px gaps, centred.
 *
 * Meet's bars are 16 tall boxes whose fill tracks the input level; with no mic
 * found they sit at their minimum, which is the three dots Nam described. Ours
 * has no input either, so they stay there.
 */
export function micMeter(): HTMLElement {
  return h(
    'div',
    { class: 'mic-meter', 'aria-hidden': 'true' },
    h('i', {}), h('i', {}), h('i', {}),
  );
}

/* ------------------------------------------------------------ notice card */

/**
 * The dark notice inside the tile. Measured at 1440:
 *
 *   card   386x127, #3c4043, radius 8, Material elevation 2
 *   icon   error 24px #fbbc04 at dx 21, dy 34
 *   title  400 16/24 #fff at dx 51
 *   body   400 14/20 #fff at dx 21, dy 72
 *   close  24px #c4c7c5, 11 from the top and 11 from the right
 *
 * It sits centred on the control it belongs to, 23px above the control row, with
 * a tail pointing down at it. The tail is neither a child element nor a
 * pseudo-element in Meet's DOM — I could not find it there — so ours is drawn as
 * a CSS triangle, matched to the screenshot rather than measured.
 *
 * The close button has a tooltip. Nam caught that one; it is the sort of thing
 * that only shows up if you hover the thing you were about to click.
 */
export function noticeCard(title: string, body: string, onClose: () => void): HTMLElement {
  const close = h(
    'button',
    { class: 'tile-notice-x', type: 'button', 'aria-label': 'Close' },
    sym('close', 24),
  ) as HTMLButtonElement;
  close.addEventListener('click', onClose);
  const card = h(
    'div',
    { class: 'tile-notice', role: 'status' },
    h('div', { class: 'tile-notice-row' }, sym('error', 24), h('span', { class: 'tile-notice-t' }, title)),
    h('div', { class: 'tile-notice-b' }, body),
    close,
  );
  return card;
}

/* ------------------------------------------------------------------ caret */

/** Re-exported so callers do not need two imports for one dropdown. */
export { dropCaret };
