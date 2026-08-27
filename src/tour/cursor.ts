// The hand — board ticket N28.
//
// Nam: "the mouse should have a mouse icon not the blue dot cause it forces
// user to learn something they dont need to... Make sure to use the mouse and
// whenever the mouse needs to click stuff, it will move to the targeted
// element, not teleport to place... as if this is a regular person using the
// computer. It's very trippy yes but thats exactly what I want. It's a mixture
// of familiarity + strange."
//
// The familiar half is the whole point, so this is a real Windows arrow rather
// than a marker, and everything below exists to stop it moving like a marker.
//
// ---------------------------------------------------------------------------
// WHAT A HUMAN MOUSE ACTUALLY DOES
//
// Aimed pointing is not one movement. Woodworth described the shape in 1899 and
// it has survived every re-measurement since: a fast BALLISTIC throw that is
// planned before it starts and cannot be corrected mid-flight, followed by one
// or more slow CORRECTIVE submovements made under visual feedback. The throw
// covers most of the distance and reliably misses. The corrections land it.
//
// Six properties fall out of that, and all six are implemented here:
//
//   1. TIME SCALES WITH DIFFICULTY, NOT DISTANCE. Fitts's law: the movement
//      time goes with log2(distance / target width + 1). A big button close by
//      and a small button far away can take the same time. A cursor that moves
//      at a constant speed is the single most robotic thing a synthetic cursor
//      can do, and a cursor that takes a constant TIME is the second.
//
//   2. IT OVERSHOOTS. The throw is aimed slightly past the target — around 5%
//      of the distance — because undershooting costs a whole extra correction
//      and overshooting costs half of one. People are optimising, badly, and
//      the badness is legible.
//
//   3. IT ARCS. Hands rotate around a wrist and an elbow; a straight line
//      between two points requires two joints to cooperate perfectly and they
//      do not bother. Real traces bow, and which way they bow depends on the
//      direction of travel.
//
//   4. THE VELOCITY PROFILE IS ASYMMETRIC. Acceleration is quick, deceleration
//      is long — the tail of the movement is where the visual correction is
//      happening. Minimum-jerk gets the family right; the corrective phase gets
//      its own ease-out, which is what produces the settle.
//
//   5. IT NEVER HOLDS STILL. Physiological tremor is 8–12 Hz and about a pixel
//      at screen scale, and there is a slower drift on top of it as the hand
//      relaxes. A cursor frozen to the pixel reads as a screenshot — and
//      because everything else here is moving, a frozen cursor is the tell.
//
//   6. THERE IS A PAUSE BEFORE THE CLICK. Arriving and clicking in the same
//      frame is not something a hand can do. The dwell is 90–200ms, which is
//      about how long it takes to confirm you are on the thing you meant.
//
// ---------------------------------------------------------------------------
// WHAT IT DOES NOT DO
//
// It does not chase the visitor's real pointer, and it never fights them for
// the same target: the stage yields the hand the moment the visitor touches
// anything. And it dispatches real events at real coordinates rather than
// calling .click(), so a control that listens for pointerdown behaves the same
// for the hand as for a person — the alternative is a demo that quietly works
// only on the controls we remembered to special-case.
//
// Reduced motion turns all of it off: the arrow teleports, does not tremor, and
// still clicks. The tour keeps running, because someone who asked for less
// movement asked for less movement and not for less content.

import { h } from '../dom.js';

export interface Scroller {
  /** Current scroll offset. */
  top: () => number;
  /** The largest offset that means anything. */
  max: () => number;
  /** Put it there. */
  set: (y: number) => void;
  /** Where the surface is on the real screen, for placing the hand over it. */
  rect: () => DOMRect | null;
}

export interface Hand {
  /** Travel to a screen point. Resolves on arrival. */
  to: (x: number, y: number, width?: number) => Promise<void>;
  /** Travel to an element's centre, optionally pressing it on arrival. */
  at: (el: Element, press?: boolean) => Promise<void>;
  /** Press whatever is under the hand right now. */
  press: (el: Element) => Promise<void>;
  /** Roll a surface to an offset, with the hand resting on it. */
  roll: (s: Scroller, to: number, ms?: number) => Promise<void>;
  /** Drift off the edge of the screen and stop. */
  park: () => Promise<void>;
  show: () => void;
  hide: () => void;
  /** Stop tremoring and stand down — the visitor has taken over. */
  yield: (on: boolean) => void;
  pos: () => { x: number; y: number };
  destroy: () => void;
}

/* Fitts, in milliseconds. a is the fixed cost of starting and stopping; b is
   the cost per bit of difficulty. Both sit inside the range measured for mice
   on desktop screens, at the deliberate end — this hand is unhurried. */
const FITTS_A = 118;
const FITTS_B = 152;
const MIN_MS = 150;
const MAX_MS = 1150;

/** How much of the movement the ballistic throw takes. */
const BALLISTIC = 0.7;
/** How far past the target the throw aims, as a fraction of the distance. */
const OVERSHOOT = 0.055;

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

/** Minimum-jerk. The velocity profile of an unloaded reach, and it is not a sine. */
const jerk = (t: number): number => t * t * t * (10 + t * (6 * t - 15));
/** The corrective phase watches itself land, so it decelerates harder. */
const settle = (t: number): number => 1 - (1 - t) ** 3;

interface Leg {
  x0: number; y0: number;
  cx: number; cy: number;
  x1: number; y1: number;
  ms: number;
  ease: (t: number) => number;
  started: number;
}

export function makeHand(root: HTMLElement, reduced: boolean): Hand {
  /*
   * The arrow is drawn rather than set as a CSS cursor, because a CSS cursor
   * only exists where a real pointer is and this one has to exist where nobody
   * is pointing. The shape is Windows' own: an 11x17 wedge with a white fill,
   * a 1px dark outline and a soft drop shadow so it stays legible over both the
   * dark call surface and the white CV underneath it.
   */
  const el = h('div', { class: 'hand', 'aria-hidden': 'true' }) as HTMLElement;
  el.innerHTML = '<span class="hand-ring"></span>'
    + '<svg class="hand-arrow" viewBox="0 0 12 19" width="22" height="35" aria-hidden="true">'
    + '<path d="M1 1.2 L1 15.6 L4.6 12.4 L7 17.9 L9.6 16.8 L7.2 11.4 L11.6 11.1 Z"'
    + ' fill="#fff" stroke="#111" stroke-width="1.1" stroke-linejoin="round"/></svg>';
  root.appendChild(el);

  // Start off the bottom-right, the way a pointer that has been sitting
  // somewhere sensible would. Never 0,0 — travelling in from the corner of the
  // screen is the first thing that gives a synthetic cursor away.
  let x = window.innerWidth * 0.72;
  let y = window.innerHeight * 0.82;
  let legs: Leg[] = [];
  let resolve: (() => void) | null = null;
  let standingDown = false;
  let dead = false;
  let raf = 0;

  /* Micro-drift: the slow half of holding still. Scheduled rather than
     continuous, because a hand that drifts constantly reads as a hand on a
     boat. */
  let driftAt = performance.now() + rand(1400, 3600);
  let drift = { dx: 0, dy: 0, from: 0, ms: 0, at: 0 };

  const paint = (t: number): void => {
    let px = x;
    let py = y;
    if (!reduced && !legs.length && !standingDown) {
      /*
       * Physiological tremor. Two incommensurable frequencies summed, so it
       * never repeats visibly — a single sine at 10 Hz reads as a vibration
       * effect, which is a different and much worse thing than a hand.
       */
      px += Math.sin(t * 0.0512) * 0.55 + Math.sin(t * 0.0231) * 0.4;
      py += Math.cos(t * 0.0447) * 0.5 + Math.sin(t * 0.0189) * 0.35;
      if (drift.ms > 0) {
        const k = Math.min(1, (t - drift.at) / drift.ms);
        px += drift.dx * settle(k);
        py += drift.dy * settle(k);
        if (k >= 1) {
          // The drift is real: it becomes the new resting place rather than
          // snapping back, which is what makes a long idle wander.
          x += drift.dx;
          y += drift.dy;
          drift = { dx: 0, dy: 0, from: 0, ms: 0, at: 0 };
          driftAt = t + rand(1600, 4200);
        }
      } else if (t >= driftAt) {
        drift = { dx: rand(-9, 9), dy: rand(-7, 7), from: 0, ms: rand(420, 900), at: t };
      }
    }
    el.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
  };

  const frame = (t: number): void => {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const leg = legs[0];
    if (leg) {
      const k = leg.ms > 0 ? Math.min(1, (t - leg.started) / leg.ms) : 1;
      const e = leg.ease(k);
      /* Quadratic Bezier. One control point is enough for the bow — a cubic
         would let the path double back, which hands do not do on a single
         reach. */
      const inv = 1 - e;
      x = inv * inv * leg.x0 + 2 * inv * e * leg.cx + e * e * leg.x1;
      y = inv * inv * leg.y0 + 2 * inv * e * leg.cy + e * e * leg.y1;
      if (k >= 1) {
        legs.shift();
        if (!legs.length) {
          driftAt = t + rand(1200, 3000);
          const done = resolve;
          resolve = null;
          done?.();
        } else {
          legs[0]!.started = t;
        }
      }
    }
    paint(t);
  };
  raf = requestAnimationFrame(frame);

  /** Build the submovement chain for one reach. */
  const plan = (tx: number, ty: number, width: number): Leg[] => {
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.hypot(dx, dy);
    if (d < 1.5) return [];

    const w = Math.max(12, Math.min(width || 40, 96));
    const ms = Math.max(MIN_MS, Math.min(MAX_MS, FITTS_A + FITTS_B * Math.log2(d / w + 1)));

    // Which way the arc bows. Consistent within one reach, random between them,
    // which is what a wrist does.
    const bow = pick([-1, 1]) * rand(0.05, 0.15);
    const ux = dx / d;
    const uy = dy / d;

    const out: Leg[] = [];

    /* --- the throw: past the target, arcing, minimum-jerk ------------------ */
    const over = d * OVERSHOOT + rand(2, 7);
    const bx = tx + ux * over + rand(-3, 3);
    const by = ty + uy * over + rand(-3, 3);
    out.push({
      x0: x, y0: y,
      // Perpendicular to travel, at the midpoint. Negating one component is
      // what makes it perpendicular; the sign is the bow direction.
      cx: (x + bx) / 2 - uy * d * bow,
      cy: (y + by) / 2 + ux * d * bow,
      x1: bx, y1: by,
      ms: ms * BALLISTIC,
      ease: jerk,
      started: 0,
    });

    /* --- the corrections: short, straight, decelerating -------------------- */
    // One correction for a near target, two for a far one. Nobody makes three
    // unless the target is genuinely hard, and nothing here is.
    const corrections = d > 380 ? 2 : 1;
    let fx = bx;
    let fy = by;
    for (let i = 0; i < corrections; i += 1) {
      const last = i === corrections - 1;
      // The last correction lands inside the target; the first stops short of
      // it, which is what a second correction is FOR.
      const jitter = last ? rand(-1.5, 1.5) : rand(-w * 0.2, w * 0.2);
      const nx = last ? tx + jitter : tx + (fx - tx) * 0.35 + jitter;
      const ny = last ? ty + rand(-1.5, 1.5) : ty + (fy - ty) * 0.35 + rand(-w * 0.2, w * 0.2);
      out.push({
        x0: 0, y0: 0, cx: 0, cy: 0, x1: nx, y1: ny,
        ms: ms * (last ? 0.18 : 0.12),
        ease: settle,
        started: 0,
      });
      fx = nx;
      fy = ny;
    }
    return out;
  };

  const go = (tx: number, ty: number, width = 40): Promise<void> => {
    if (dead) return Promise.resolve();
    el.classList.add('is-on');
    if (reduced) {
      x = tx;
      y = ty;
      legs = [];
      paint(performance.now());
      return Promise.resolve();
    }
    const chain = plan(tx, ty, width);
    if (!chain.length) return Promise.resolve();
    // Each leg starts where the one before it ended, which is only knowable at
    // run time — the plan above leaves those zero on purpose.
    return new Promise((done) => {
      const now = performance.now();
      chain[0]!.x0 = x;
      chain[0]!.y0 = y;
      chain[0]!.started = now;
      for (let i = 1; i < chain.length; i += 1) {
        const prev = chain[i - 1]!;
        const leg = chain[i]!;
        leg.x0 = prev.x1;
        leg.y0 = prev.y1;
        // A correction is short enough that a bow in it would look like a wobble.
        leg.cx = (leg.x0 + leg.x1) / 2;
        leg.cy = (leg.y0 + leg.y1) / 2;
      }
      legs = chain;
      resolve = done;
    });
  };

  const wait = (ms: number): Promise<void> =>
    new Promise((done) => window.setTimeout(done, reduced ? 0 : ms));

  /**
   * A real press, at real coordinates.
   *
   * .click() would be one line and would silently skip every pointerdown
   * listener in the app — which is most of the desktop's focus handling and all
   * of its drag handling. Dispatching the sequence a browser dispatches means
   * a control cannot tell the hand from a person, which is the requirement.
   */
  const strike = (el2: Element): void => {
    const common = {
      bubbles: true, cancelable: true, composed: true,
      clientX: Math.round(x), clientY: Math.round(y),
      view: window, button: 0, buttons: 1,
    };
    const pointer = { ...common, pointerId: 1, pointerType: 'mouse', isPrimary: true };
    try { el2.dispatchEvent(new PointerEvent('pointerdown', pointer)); } catch { /* older engine */ }
    el2.dispatchEvent(new MouseEvent('mousedown', common));
    try { el2.dispatchEvent(new PointerEvent('pointerup', { ...pointer, buttons: 0 })); } catch { /* ignore */ }
    el2.dispatchEvent(new MouseEvent('mouseup', { ...common, buttons: 0 }));
    el2.dispatchEvent(new MouseEvent('click', { ...common, buttons: 0, detail: 1 }));
  };

  const press = async (target: Element): Promise<void> => {
    if (dead) return;
    // The confirmation pause. Arriving and clicking in one frame is the other
    // thing a hand cannot do.
    await wait(rand(90, 200));
    if (dead) return;
    el.classList.add('is-press');
    window.setTimeout(() => el.classList.remove('is-press'), 130);
    strike(target);
    await wait(reduced ? 0 : 120);
  };

  const centreOf = (target: Element): { x: number; y: number; w: number } | null => {
    const r = target.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    /* Not dead centre. People land off-centre and the miss is legible; the
       offset is bounded by the target so it always lands inside it. */
    return {
      x: r.left + r.width / 2 + rand(-r.width * 0.18, r.width * 0.18),
      y: r.top + r.height / 2 + rand(-r.height * 0.18, r.height * 0.18),
      w: Math.min(r.width, r.height),
    };
  };

  let hot: Element | null = null;
  const setHot = (target: Element | null): void => {
    if (hot === target) return;
    hot?.classList.remove('is-hand');
    hot = target;
    // Synthetic events do not produce :hover — the browser owns that and ties
    // it to a real pointer. So the hand paints its own, and the stylesheet
    // mirrors each control's hover rule onto it.
    hot?.classList.add('is-hand');
  };

  return {
    to: (tx, ty, width) => { setHot(null); return go(tx, ty, width); },

    at: async (target, doPress = false) => {
      const c = centreOf(target);
      // A target with no box is a target that is not there. Refusing to travel
      // is better than travelling to where it used to be.
      if (!c) return;
      await go(c.x, c.y, c.w);
      setHot(target);
      if (doPress) await press(target);
    },

    press,

    /**
     * Rolling a surface, with the hand resting on it.
     *
     * Not a smooth ramp: a wheel moves in notches, so this steps. The step size
     * is the notch and the gap between them is what makes it read as a wheel
     * rather than as an animation — and the hand bobs a pixel or two with each
     * notch, because the finger is what is moving.
     */
    roll: async (s, target, ms = 900) => {
      if (dead) return;
      const box = s.rect();
      if (box) {
        // Rest the hand where a person would put it to scroll: inside the
        // surface, right of centre, clear of the text they are reading.
        await go(box.left + box.width * 0.72, box.top + box.height * 0.42, 60);
      }
      const from = s.top();
      const to = Math.max(0, Math.min(s.max(), target));
      const delta = to - from;
      if (Math.abs(delta) < 2) return;
      if (reduced) { s.set(to); return; }
      // ~14 notches a second is an unhurried finger. The count follows the
      // duration so a long scroll is more notches, not bigger ones.
      const notches = Math.max(3, Math.round((ms / 1000) * 14));
      const gap = ms / notches;
      for (let i = 1; i <= notches; i += 1) {
        if (dead) return;
        // Ease the whole roll, so it starts and stops like a hand rather than
        // like a scrollbar being dragged at constant speed.
        const k = settle(i / notches);
        s.set(from + delta * k);
        y += delta > 0 ? -0.6 : 0.6;
        await wait(gap);
      }
      s.set(to);
    },

    park: async () => {
      setHot(null);
      await go(window.innerWidth + 60, window.innerHeight * 0.7, 80);
      el.classList.remove('is-on');
    },

    show: () => el.classList.add('is-on'),
    hide: () => el.classList.remove('is-on'),
    yield: (on) => { standingDown = on; el.classList.toggle('is-idle', on); },
    pos: () => ({ x, y }),
    destroy: () => {
      dead = true;
      cancelAnimationFrame(raf);
      setHot(null);
      el.remove();
    },
  };
}
