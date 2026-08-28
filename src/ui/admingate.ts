// The gesture on the home avatar, and the numbers it drops.
//
// Board ticket N60. Nam: "you click on the avatar G in the home screen 11 times,
// and from the 4th click we will get a falling number coming out of the click as
// a click effect." The content, the decoy and the reasoning behind them are in
// data/admin.ts; the dialog is in admindialog.ts; this file is the gesture and
// nothing else.
//
// WHY THE SPLIT IS THREE FILES AND NOT ONE. The first version imported the
// dialog and the question bank straight into home.ts, which put both in the
// initial payload: 20165 gzip went to 30063, from 39% of the size budget to 59%,
// for a joke behind an eleven click cheat code. This file is what has to be
// eager, because the counter and the falling numbers have to answer the very
// first press. Everything the eleventh press needs is fetched when it is needed,
// which is the same rule the bug frame and the CV overlay already follow.
//
// THE COUNTER IS DELIBERATELY FORGIVING. No timeout, so a reader who clicks four
// times, reads the number, wanders off and comes back still gets in. A cheat
// code that punishes hesitation is a cheat code nobody completes, and there is
// nothing behind this worth defending with a stopwatch.

import { h } from '../dom.js';
import { isAdmin } from '../prefs.js';

/** Clicks on the avatar before the dialog opens. */
export const ADMIN_CLICKS = 11;

/**
 * The click the falling numbers start on.
 *
 * Three clicks of nothing is deliberate. An avatar that reacts on the first
 * press is a button with a bug; one that stays inert and then starts counting is
 * a thing that has noticed you. The numbers are the only signal that the gesture
 * exists, so they carry the whole of the discovery.
 */
export const ADMIN_HINT_FROM = 4;

let clicks = 0;
/** Told to whoever is showing the avatar, so the G can become an A. */
let onGrant: (() => void) | null = null;

export function onAdminGranted(fn: () => void): void {
  onGrant = fn;
}

/**
 * A number, falling out of the point that was pressed.
 *
 * Positioned against the viewport and parented to <body>, because the avatar
 * sits in a top bar with its own stacking and overflow, and a child of the
 * button gets clipped by it. A fixed element on <body> has neither problem and
 * costs one node that removes itself.
 *
 * It counts UP rather than down. A countdown would announce that there is a
 * target and how far away it is, which turns a discovery into a progress bar.
 * Counting up says only that something is being tallied, and leaves the reader
 * to decide whether to keep going.
 */
function fallingNumber(n: number, x: number, y: number): void {
  const el = h('span', { class: 'admin-drop', 'aria-hidden': 'true' }, String(n));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  /*
   * THE ARC IS PER INSTANCE, so it goes in as custom properties and the keyframes
   * do the rest. Nam: "the falling out should have some horizontal velocity too,
   * falling in an arc, left or right randomly, and even with a little bump up in
   * height as it came out of the click ... the goal here is to make these numbers
   * feel clicky and satisfying."
   *
   * A fixed animation cannot be random, and eleven identical drops down the same
   * line is the thing that looked wrong. Randomising the sign matters more than
   * randomising the distance: two in a row going opposite ways reads as spray,
   * two going the same way at slightly different speeds still reads as a queue.
   *
   * The rotation follows the direction of travel, because a number thrown to the
   * right that tilts left looks like it is being dragged rather than thrown.
   */
  let dir = Math.random() < 0.5 ? -1 : 1;
  const dist = 34 + Math.random() * 30;
  /*
   * Turn away from the edge rather than off it. The avatar lives in the top
   * right corner, so a rightward throw runs out of viewport about half the time
   * and the number vanishes mid-arc. Flipping the sign when the landing point
   * would leave the screen keeps the randomness everywhere it is affordable and
   * gives it up only where it would cost the effect.
   */
  const MARGIN = 24;
  if (x + dir * dist < MARGIN || x + dir * dist > window.innerWidth - MARGIN) dir = -dir;
  el.style.setProperty('--dx', `${(dir * dist).toFixed(1)}px`);
  el.style.setProperty('--rot', `${(dir * (12 + Math.random() * 16)).toFixed(1)}deg`);

  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  // Belt and braces: under reduced motion, or in a background tab, animationend
  // never fires and the node would stack up one per click forever.
  window.setTimeout(() => el.remove(), 2000);
}

/**
 * Press the avatar. Owns the whole gesture, so the home screen's wiring stays a
 * single listener.
 */
export function avatarPressed(e: MouseEvent, el: HTMLElement): void {
  if (isAdmin()) {
    const i = clicks;
    clicks += 1;
    void import('./admindialog.js').then((m) => m.alreadyToast(i));
    return;
  }

  clicks += 1;

  if (clicks >= ADMIN_HINT_FROM) {
    // The pointer position when there is one, and the button's own centre when
    // there is not: a keyboard activation reports 0,0, and a number falling out
    // of the top left corner of the screen is a bug with a nice animation on it.
    const r = el.getBoundingClientRect();
    const x = e.clientX || r.left + r.width / 2;
    const y = e.clientY || r.top + r.height / 2;
    fallingNumber(clicks, x, y);
  }

  if (clicks >= ADMIN_CLICKS) {
    /*
     * Reset before the dialog rather than after it. Closing the box and pressing
     * the avatar again means starting the eleven over, which is the one place
     * strictness reads as intent rather than as a bug: the box is the reward for
     * the gesture, so it should cost the gesture every time.
     */
    clicks = 0;
    void import('./admindialog.js').then((m) => m.openGate(() => onGrant?.()));
  }
}
