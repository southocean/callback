// Tooltips, with Meet's intent-prediction behaviour.
//
// Measured off the live product rather than guessed:
//
//   surface        #303030          radius 4px      padding 4px 8px
//   label          #f2f2f2          400 12px/16px   no shadow
//   position       4px below the anchor, centred on it
//   transition     opacity/transform .15s cubic-bezier(0, 0, 0.2, 1)
//   cold delay     541ms measured, twice
//   primed delay   38ms — effectively immediate
//   cooldown       after ~1.6s of hovering nothing, back to the cold delay
//
// The interesting part is the priming. The first tooltip costs you a wait; once
// one has been shown, moving to any other target shows its tooltip instantly,
// as if the interface has decided you are looking for help. Leave every target
// for long enough and it forgets, and the next one makes you wait again.
//
// Google publishes no numbers for the cooldown, so PRIMED_WINDOW is ours: long
// enough to cover moving along a row of icon buttons, short enough that coming
// back to the header after reading the page feels like a fresh start.

const COLD_DELAY = 540;
const PRIMED_WINDOW = 600;
/** Anything below this and a tooltip on focus would fight the focus ring. */
const GAP = 4;

/** The enter handler for each tipped element, so it can be re-armed. */
const enters = new WeakMap<HTMLElement, () => void>();

/**
 * How long a tooltip stays up after the pointer leaves.
 *
 * Nam described the whole flow as a three-state machine, and the third state was
 * the one we were missing: cold wait, then a primed window where the next
 * control tips instantly, and then — on the way out — the label LINGERS rather
 * than snapping away. Without the linger, sweeping along the bar reads as a
 * strobe: each label appears the moment the last one vanishes.
 */
const LINGER = 260;
let hideTimer = 0;

let tipAnchor: HTMLElement | null = null;
let primedUntil = 0;
let showTimer = 0;
let current: HTMLElement | null = null;
let layer: HTMLElement | null = null;

function root(): HTMLElement {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'tt-layer';
    // Presentational only. The name is already on the anchor's aria-label, and
    // announcing it twice is worse than not announcing it at all.
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  return layer;
}

type Placement = 'above' | 'below';

function place(anchor: HTMLElement, text: string, where: Placement): void {
  window.clearTimeout(hideTimer);
  hideNow();
  const tip = document.createElement('div');
  tip.className = 'tt';
  tip.textContent = text;
  root().appendChild(tip);

  // Buttons that sit together in one strip must tip from a COMMON baseline.
  // Nam spotted the tile pill's first two tooltips sitting lower than the
  // third: its buttons are 44, 44 and 40 tall, all vertically centred in a
  // 44-tall pill, so the 40 one's bottom edge is 2px higher and its tooltip
  // rode up with it. Anchoring the vertical edge to the strip fixes every
  // button in it at once, and leaves each button's own box — which is measured —
  // alone. Horizontal centring still follows the button, so the tooltip stays
  // over the thing you are pointing at.
  const a = anchor.getBoundingClientRect();
  const baseEl = anchor.closest('[data-tip-base]');
  const base = baseEl ? baseEl.getBoundingClientRect() : a;
  const t = tip.getBoundingClientRect();
  // Centred under the anchor, then nudged back inside the viewport if the
  // anchor is near an edge — which is most of the top-right cluster.
  let x = a.left + a.width / 2 - t.width / 2;
  x = Math.max(8, Math.min(x, window.innerWidth - t.width - 8));
  // Meet does not use one rule for this. The top bar puts the tooltip 4px
  // BELOW its controls; the week strip puts it 4px ABOVE them, because below
  // would land on the meeting list. Measured on both: Support tipped at y+4
  // under a 40px button, "Selected" tipped at y-4 over a 56px day column.
  let y = where === 'above' ? base.top - t.height - GAP : base.bottom + GAP;
  // Flip if the preferred side has no room.
  if (y < 8) y = base.bottom + GAP;
  if (y + t.height > window.innerHeight - 8) y = base.top - t.height - GAP;

  tip.style.left = `${Math.round(x)}px`;
  tip.style.top = `${Math.round(y)}px`;
  // Next frame, so the transition has a from-state to animate out of.
  requestAnimationFrame(() => tip.classList.add('in'));
  current = tip;
  tipAnchor = anchor;
}

function hideNow(): void {
  window.clearTimeout(hideTimer);
  window.clearTimeout(showTimer);
  showTimer = 0;
  current?.remove();
  current = null;
  tipAnchor = null;
}

/**
 * Leaving does not hide it — it schedules the hide. That is the third state of
 * the machine Nam described, and the one we were missing: cold wait, primed
 * window, and then a LINGER on the way out. Without it, sweeping along the bar
 * strobes, because each label appears exactly as the last one vanishes.
 *
 * A hide already scheduled is cancelled the moment a tooltip is shown, so
 * moving between controls inside the primed window swaps the label rather than
 * blanking and re-showing it.
 */
function leave(): void {
  if (current) primedUntil = Date.now() + PRIMED_WINDOW;
  window.clearTimeout(showTimer);
  showTimer = 0;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hideNow, LINGER);
}

/**
 * Give an element a Meet-style tooltip. The text defaults to the element's
 * accessible name, so the two can never drift apart.
 */
export function tip(el: HTMLElement, text?: string, where: Placement = 'below'): void {
  /**
   * Visible text only. `textContent` is the wrong fallback on anything holding
   * an icon: Material Symbols glyphs are ligature *text*, so a button reading
   * "New" reported "video_callNew". Walk the tree and skip anything hidden from
   * assistive tech, which is exactly what the glyph spans are marked as.
   */
  const visibleText = (root: HTMLElement): string => {
    let out = '';
    for (const node of root.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) out += node.textContent ?? '';
      else if (node instanceof HTMLElement && node.getAttribute('aria-hidden') !== 'true') {
        out += visibleText(node);
      }
    }
    return out.replace(/\s+/g, ' ').trim();
  };

  /**
   * Meet's tooltip is not the aria-label. On the pre-join screen the mic
   * control announces "Turn off microphone" and its tooltip reads "Turn off
   * microphone (ctrl + d)" — the shortcut is in the visible hint only, and
   * rightly so: a screen reader user does not need the mouse-user's accelerator
   * read out with every focus.
   *
   * So the shortcut lives in data-key and is appended here. Anything that sets
   * it must actually implement the key, or the tooltip is a lie.
   */
  const label = () => {
    const base = text ?? el.getAttribute('aria-label') ?? visibleText(el);
    const key = el.getAttribute('data-key');
    return key && base ? `${base} (${key})` : base;
  };

  const enter = (): void => {
    const t = label();
    if (!t) return;
    // Pointer devices only. On a touch screen "hover" is a tap, and a tooltip
    // there just eats the tap.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    window.clearTimeout(showTimer);
    const wait = Date.now() < primedUntil ? 0 : COLD_DELAY;
    showTimer = window.setTimeout(() => {
      place(el, t, where);
      // Showing one is what arms the next.
      primedUntil = Date.now() + PRIMED_WINDOW;
    }, wait);
  };

  enters.set(el, enter);
  el.addEventListener('pointerenter', enter);
  el.addEventListener('pointerleave', leave);
  /*
   * Keyboard users get it immediately — for them it is not a hint that they
   * hesitated, it is the only way to see the label at all.
   *
   * But :focus-visible, not focus. This was Nam's stuck "Raise hand" label:
   * clicking a control focuses it, focus fired, and a tooltip shown from focus
   * has no hide scheduled — only blur and click remove it. The click that
   * focused the button had already been dispatched by then, so the label sat
   * there until something else took focus, long after the pointer had gone.
   *
   * Gating on :focus-visible is also just what the real product does: clicking a
   * Meet control never leaves its tooltip up, tabbing to one always does.
   */
  el.addEventListener('focus', () => {
    if (!el.matches(':focus-visible')) return;
    const t = label();
    if (t) place(el, t, where);
  });
  el.addEventListener('blur', hideNow);
  // A tooltip must never survive the thing it describes being clicked.
  el.addEventListener('click', hideNow);
}

/**
 * Start an element's tooltip timer as though the pointer had just arrived.
 *
 * Needed because pointerenter does not fire for movement WITHIN an element. The
 * code field is tipped, the Join button inside it is not, and touching Join
 * dismisses the field's tooltip — all correct. But moving from Join back onto
 * the field is movement inside the field, so nothing fires and the tooltip never
 * returns. The real product treats that as a fresh arrival, so this does too.
 */
export function rearm(el: HTMLElement): void {
  enters.get(el)?.();
}

/**
 * Kill any visible tooltip, and suppress the one that was about to appear.
 *
 * Needed for a case the real product handles and a naive implementation does
 * not: the Join button lives INSIDE the code field, so moving onto it never
 * fires pointerleave on the field and the field's tooltip just sits there.
 * Meet dismisses it the moment you touch Join — the button behaves as though it
 * were not part of the input at all, which is also true of its state layer.
 */
export function hideTip(): void {
  hideNow();
}

/** Sugar: tip every element passed in, all on the same side. */
export function tipAll(...els: (HTMLElement | null | undefined)[]): void {
  for (const el of els) if (el) tip(el);
}

/** Same, for the controls Meet tips above rather than below. */
export function tipAllAbove(...els: (HTMLElement | null | undefined)[]): void {
  for (const el of els) if (el) tip(el, undefined, 'above');
}

// Scrolling or leaving the window should drop it, or it hangs in mid-air.
window.addEventListener('scroll', hideNow, true);
window.addEventListener('blur', hideNow);

/*
 * And a backstop for the whole class of bug, not just the one instance.
 *
 * Every route that shows a tooltip pairs with a route that hides it, and any
 * mismatch strands a label on screen — pointerleave that never fires because the
 * element was replaced mid-interaction, a focus with no matching blur, a control
 * that unmounts while tipped. Rather than keep finding these one at a time,
 * assert the invariant continuously: a tooltip may only be up while its anchor
 * is genuinely hovered or genuinely focused.
 *
 * Cheap enough to run on pointermove — two matches() calls against one element,
 * and only when a tooltip actually exists.
 */
document.addEventListener('pointermove', () => {
  if (!current || !tipAnchor) return;
  if (!tipAnchor.isConnected) { hideNow(); return; }
  if (tipAnchor.matches(':hover') || tipAnchor.matches(':focus-visible')) return;
  if (!hideTimer) hideTimer = window.setTimeout(hideNow, LINGER);
}, { passive: true });
