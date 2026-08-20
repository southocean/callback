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

function place(anchor: HTMLElement, text: string): void {
  hideNow();
  const tip = document.createElement('div');
  tip.className = 'tt';
  tip.textContent = text;
  root().appendChild(tip);

  const a = anchor.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  // Centred under the anchor, then nudged back inside the viewport if the
  // anchor is near an edge — which is most of the top-right cluster.
  let x = a.left + a.width / 2 - t.width / 2;
  x = Math.max(8, Math.min(x, window.innerWidth - t.width - 8));
  let y = a.bottom + GAP;
  if (y + t.height > window.innerHeight - 8) y = a.top - t.height - GAP;

  tip.style.left = `${Math.round(x)}px`;
  tip.style.top = `${Math.round(y)}px`;
  // Next frame, so the transition has a from-state to animate out of.
  requestAnimationFrame(() => tip.classList.add('in'));
  current = tip;
}

function hideNow(): void {
  window.clearTimeout(showTimer);
  showTimer = 0;
  current?.remove();
  current = null;
}

function leave(): void {
  if (current) primedUntil = Date.now() + PRIMED_WINDOW;
  hideNow();
}

/**
 * Give an element a Meet-style tooltip. The text defaults to the element's
 * accessible name, so the two can never drift apart.
 */
export function tip(el: HTMLElement, text?: string): void {
  const label = () => text ?? el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';

  const enter = (): void => {
    const t = label();
    if (!t) return;
    // Pointer devices only. On a touch screen "hover" is a tap, and a tooltip
    // there just eats the tap.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    window.clearTimeout(showTimer);
    const wait = Date.now() < primedUntil ? 0 : COLD_DELAY;
    showTimer = window.setTimeout(() => {
      place(el, t);
      // Showing one is what arms the next.
      primedUntil = Date.now() + PRIMED_WINDOW;
    }, wait);
  };

  el.addEventListener('pointerenter', enter);
  el.addEventListener('pointerleave', leave);
  // Keyboard users get it immediately — for them it is not a hint that they
  // hesitated, it is the only way to see the label at all.
  el.addEventListener('focus', () => {
    const t = label();
    if (t) place(el, t);
  });
  el.addEventListener('blur', hideNow);
  // A tooltip must never survive the thing it describes being clicked.
  el.addEventListener('click', hideNow);
}

/** Sugar: tip every element passed in. */
export function tipAll(...els: (HTMLElement | null | undefined)[]): void {
  for (const el of els) if (el) tip(el);
}

// Scrolling or leaving the window should drop it, or it hangs in mid-air.
window.addEventListener('scroll', hideNow, true);
window.addEventListener('blur', hideNow);
