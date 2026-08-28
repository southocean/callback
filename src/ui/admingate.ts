// The gesture on the home bar's help button, and the numbers it throws.
//
// Board ticket N60. Nam: "you click on the avatar G in the home screen 11 times,
// and from the 4th click we will get a falling number coming out of the click as
// a click effect." The content, the decoy and the reasoning behind them are in
// data/admin.ts; the dialog is in admindialog.ts; this file is the gesture and
// nothing else.
//
// WHY THE HELP BUTTON AND NOT THE AVATAR ANY MORE. The gesture started on the
// avatar, which was the obvious door: it is the one control on the bar that means
// "you". The numbers could not be seen there. The avatar is a 32px circle filled
// with a blue-to-green gradient, so a coloured number thrown out of it spends its
// first and brightest frames on top of a saturated colour of its own and the two
// mix into mud. Nam: "because of the color of the avatar, its like greenish so the
// colors blend together in a quite ugly way ... lets move the target for the click
// instead to the ? button next to the cog."
//
// The help button is better on more counts than that one. It is a grey glyph on
// white, so all four logo colours read against it. It is inert in this build, where
// the avatar at least looks like it should open an account menu, so eleven presses
// of nothing is in character rather than a bug. And it frees the avatar to be what
// it already half was: the place the reward shows, the G that becomes an A once the
// door has opened.
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

/** Clicks on the help button before the dialog opens. */
export const ADMIN_CLICKS = 11;

/**
 * The click the falling numbers start on.
 *
 * Three clicks of nothing is deliberate. A button that reacts on the first press
 * is a button with a bug; one that stays inert and then starts counting is a thing
 * that has noticed you. The numbers are the only signal that the gesture exists, so
 * they carry the whole of the discovery.
 */
export const ADMIN_HINT_FROM = 4;

let clicks = 0;
/** Told to whoever is showing the avatar, so the G can become an A. */
let onGrant: (() => void) | null = null;

export function onAdminGranted(fn: () => void): void {
  onGrant = fn;
}

/**
 * The colours a number can come out in, walked in order: blue, red, green.
 *
 * THREE, NOT FOUR. Yellow was in and is out. Nam: "the yellow just does read very
 * well on white background, lets remove it from the color wheel." On the white top
 * bar the logo yellow is 1.7:1 where the other three are 3.1 to 3.9, and no tone
 * fixes that while staying yellow: it is a light colour and the bar is white. The
 * outline that used to prop it up was removed for making the numbers bulky, which
 * left yellow as the one number in four that read as a rendering fault rather than
 * as a colour.
 *
 * Dropping it also fixed something nobody had noticed. Four colours against a
 * direction that flips every press gives the pair a period of four, so each colour
 * was locked to one side forever: blue always left, red always right. Three against
 * two has a period of six, so every colour is now thrown both ways.
 */
export const DROP_COLOURS = 3;

/**
 * Which colour the nth number wears, and which way it is thrown.
 *
 * Both are a function of n alone, which is the whole of this effect's state: there
 * is none. Only the distance and the tilt are still random, and neither of those
 * can clump into a pattern a reader would notice.
 *
 * THE COLOURS CYCLE, THEY DO NOT SHUFFLE. The first cut picked at random with a
 * rule against repeating the previous pick. Nam: "I dont like the color
 * randomization, lets keep the color cycling through the googles color wheel, so we
 * dont have two same colors back to back." Random-minus-repeats still clumps at
 * this length: across eight numbers it shows one colour three times and another not
 * at all often enough that the effect reads as malfunctioning rather than choosing.
 * Walking the wheel shows all of them, in order, every run, and gets the
 * no-two-in-a-row property as a property rather than as a special case.
 *
 * THE DIRECTION ALTERNATES, and not randomly either, for the same reason: a random
 * sign gives same-way pairs a quarter of the time, and because the eleven arrive in
 * a burst those pairs are the thing you notice. The bot manager landed on strict
 * alternation after the same argument.
 */
export function dropColour(n: number): number {
  return (n - ADMIN_HINT_FROM) % DROP_COLOURS;
}
export function dropDir(n: number): -1 | 1 {
  return n % 2 === 0 ? -1 : 1;
}

/** The clipping layer the numbers live in. Created on the press that needs it. */
let layer: HTMLElement | null = null;

function dropLayer(): HTMLElement {
  if (layer?.isConnected) return layer;
  /*
   * WHY THE NUMBERS ARE NOT PARENTED TO <body> ANY MORE. The avatar is ~34px from
   * the right edge of the window, so a rightward throw lands past it, and a fixed
   * element sticking out past the right edge is enough to give some browsers a
   * horizontal scrollbar on a page that does not scroll. The old code avoided
   * that by refusing to throw right at all, which is why every number fell left.
   * A fixed, overflow:hidden layer takes the clip instead, so the throw is free
   * to go either way and the page stays put. Ported from the bot manager's
   * .click-pops, which solved it the same way.
   */
  layer = h('div', { class: 'admin-drops', 'aria-hidden': 'true' });
  document.body.appendChild(layer);
  return layer;
}

/**
 * A number, falling out of the point that was pressed.
 *
 * Positioned against the viewport, because the avatar sits in a top bar with its
 * own stacking and overflow, and a child of the button gets clipped by it.
 *
 * It counts UP rather than down. A countdown would announce that there is a
 * target and how far away it is, which turns a discovery into a progress bar.
 * Counting up says only that something is being tallied, and leaves the reader
 * to decide whether to keep going.
 *
 * THE ARC IS TWO ELEMENTS, which is the bot manager's trick and the reason its
 * numbers feel thrown. The outer span carries the horizontal drift at a constant
 * speed; the inner <b> carries the vertical toss, the rotation and the scale pop
 * on an ease that rises fast, hangs, and then accelerates down. Multiplying two
 * plain keyframe animations together gives a real ballistic curve for no
 * per-frame JavaScript, and neither half has to know what the other is doing.
 * The single combined keyframe this replaces could only fake the curve by
 * switching easing at each stop, and it showed.
 */
function fallingNumber(n: number, x: number, y: number): void {
  const el = h('span', { class: 'admin-drop' }, h('b', {}, String(n)));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  el.dataset.c = String(dropColour(n));

  /*
   * NO SIZE RAMP, and it is worth saying why not, because the bot manager has one
   * and it is the obvious thing to port along with everything else. Over there the
   * numbers grow from 22px to 40px as the streak climbs, so the last few land
   * heavier than the first few. It does not fit here. The avatar is 32px down a
   * 56px bar, which is the same reason the apex of the arc is 16px and not more: a
   * 34px glyph tossed 24px out of a point 28px from the top of the window has its
   * top 13px outside the window, and the number it clips is the eleventh, the one
   * the whole gesture was counting towards. The manager's cog has a page above it
   * and can afford the growth; this does not, so the numbers stay 22px and the
   * weight is carried by the toss and the glow instead.
   */

  /*
   * THE THROW. Nam: "the falling out should have some horizontal velocity too,
   * falling in an arc, left or right randomly, and even with a little bump up in
   * height as it came out of the click ... the goal here is to make these numbers
   * feel clicky and satisfying."
   *
   * The direction alternates (see dropDir). The distance is what stays random, and
   * the range it is drawn from is squeezed into the room actually available on that
   * side. That squeeze is the guard which replaced a bug: the old code flipped the
   * sign whenever a throw would have landed off screen, and on the avatar — three
   * buttons further right, ~34px from the window edge — that test failed on every
   * single throw, so every number fell left and nothing ever went right. The help
   * button has ~134px either side of it and never trips the guard. It stays for the
   * narrow window and the wrapped mobile bar, where it still can.
   *
   * The range is squeezed rather than clamped because a clamp collapses it: with
   * 24px of room, every right-hand throw comes out at exactly 24 and the numbers
   * going that way stack into the queue the alternation was there to break up.
   * Scaling the range keeps a spread at both ends, however little room there is.
   *
   * The rotation follows the direction of travel, because a number thrown to the
   * right that tilts left looks like it is being dragged rather than thrown.
   */
  const dir = dropDir(n);
  const MARGIN = 10;
  const room = dir > 0 ? window.innerWidth - MARGIN - x : x - MARGIN;
  const far = Math.max(20, Math.min(52, room));
  const dist = 16 + Math.random() * Math.max(4, far - 16);
  el.style.setProperty('--dx', `${(dir * dist).toFixed(1)}px`);
  el.style.setProperty('--rot', `${(dir * (12 + Math.random() * 26)).toFixed(1)}deg`);

  dropLayer().appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  // Belt and braces: under reduced motion, or in a background tab, animationend
  // never fires and the node would stack up one per click forever.
  window.setTimeout(() => el.remove(), 2400);
}

/**
 * Press the help button. Owns the whole gesture, so the home screen's wiring stays
 * a single listener.
 */
export function gatePressed(e: MouseEvent, el: HTMLElement): void {
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
     * the button again means starting the eleven over, which is the one place
     * strictness reads as intent rather than as a bug: the box is the reward for
     * the gesture, so it should cost the gesture every time.
     */
    clicks = 0;
    void import('./admindialog.js').then((m) => m.openGate(() => onGrant?.()));
  }
}
