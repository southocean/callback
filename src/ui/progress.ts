// The completion ring, and the breakdown behind it.
//
// Board ticket N118, and N137 changed who asks for it. It used to be the ended
// screen and the home rail. Now it is the home rail and the ENDED screen's rail,
// which is the same rail -- the ended screen stopped reporting a lifetime total
// and reports the pass instead. One module either way, so the two rails cannot
// disagree about what 40% means.
//
// THE RING IS THE FOURTH USE OF THAT MOTIF -- the ready card's countdown, the
// ended screen's return, the caption's dwell, and now this. That is deliberate
// rather than lazy: a filling arc already means "this is how far along something
// is" everywhere else in the product, so it needs no legend here.
//
// It differs from the other three in one way, and the difference is the point.
// Those three drain on their own; this one only moves when the visitor found
// something. So it animates FROM WHAT THEY WERE LAST SHOWN, which turns the
// number into a report on the visit rather than a static readout. Somebody who
// found nothing sees it hold still, which is also correct.

import { h } from '../dom.js';
import { tally, type Progress } from '../completion.js';
import { foundAll, lastShownPct, rememberPct } from '../prefs.js';
import { prefersReducedMotion } from '../a11y.js';

/** Read the three collections and add them up. */
export function progressNow(): Progress {
  return tally(foundAll());
}

const R = 26;
const CIRC = 2 * Math.PI * R;

export interface RingOpts {
  /** Animate up from the last reported figure. The ended screen wants this. */
  animate?: boolean;
  size?: number;
}

/**
 * The arc, the number, and the count under it.
 *
 * `--c` carries its unit. That is not a style choice: a unitless custom property
 * stays a <number> inside calc(), which is what made the ended screen's ring
 * animate in two frames instead of sixty. See the long note in ui/ended.ts.
 */
export function ring(p: Progress, opts: RingOpts = {}): HTMLElement {
  const size = opts.size ?? 72;
  const from = opts.animate ? Math.min(lastShownPct(), p.pct) : p.pct;

  const num = h('span', { class: 'pr-n' }, `${from}%`) as HTMLElement;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('aria-hidden', 'true');
  for (const cls of ['pr-track', 'pr-arc']) {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '32');
    c.setAttribute('cy', '32');
    c.setAttribute('r', String(R));
    c.setAttribute('class', cls);
    svg.appendChild(c);
  }
  const arc = svg.querySelector('.pr-arc') as SVGCircleElement;

  const box = h('span', { class: 'pr-ring' }, num) as HTMLElement;
  box.style.setProperty('--pr-size', `${size}px`);
  box.style.setProperty('--c', `${CIRC}px`);
  box.insertBefore(svg as unknown as Node, box.firstChild);

  const paint = (pct: number): void => {
    arc.style.strokeDasharray = `${CIRC}px`;
    arc.style.strokeDashoffset = `${CIRC * (1 - pct / 100)}px`;
    num.textContent = `${Math.round(pct)}%`;
  };
  paint(from);

  if (opts.animate && p.pct > from) {
    /*
     * Counted up rather than transitioned, because the NUMBER has to move with
     * the arc. A CSS transition on the dashoffset would slide the ring while the
     * text jumped, which reads as two things happening rather than one.
     */
    const reduced = prefersReducedMotion();
    if (reduced) {
      paint(p.pct);
    } else {
      const started = performance.now();
      const span = 220 + (p.pct - from) * 26;
      const step = (t: number): void => {
        const k = Math.min(1, (t - started) / span);
        // Ease out: the gain lands rather than stopping dead.
        paint(from + (p.pct - from) * (1 - (1 - k) ** 3));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }
  if (opts.animate) rememberPct(p.pct);
  return box;
}

/**
 * One row per collection, with the ones still missing said plainly.
 *
 * Nam: "if you click this progression, it opens up a panel breaking down your
 * progress in each category. How many bugs out of all bugs for example."
 *
 * The `where` line only appears for a collection with something left in it.
 * Telling somebody where to find clips they have all found is noise, and a
 * completed row saying nothing is how it reads as completed.
 *
 * THREE ROWS SINCE N137. The commentary was the fourth and is no longer scored;
 * the argument is in completion.ts, and the short version is that a quip is not
 * an object you can go back and look at, so it had no honest `where` to give.
 */
export function breakdown(p: Progress): HTMLElement {
  return h('div', { class: 'pr-rows' },
    ...p.parts.map((part) => h('div', { class: `pr-row${part.got >= part.total ? ' is-done' : ''}` },
      h('div', { class: 'pr-row-h' },
        h('b', {}, part.label),
        h('span', { class: 'pr-count' }, `${part.got} of ${part.total}`)),
      h('div', { class: 'pr-bar' },
        h('i', { style: `width:${part.total ? (part.got / part.total) * 100 : 0}%` })),
      part.got >= part.total
        ? h('span', { class: 'pr-where is-done' }, 'All of them.')
        : h('span', { class: 'pr-where' }, part.where))));
}
