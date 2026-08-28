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
//   5. IT IS STILL, EXCEPT AFTER SOMETHING HAPPENS.
//
//      This took two wrong turns before it was right, and Nam called both.
//
//      First it tremored constantly, on the theory that a real hand never holds
//      still. His objection: "it could be distracting" — and it was, because a
//      cursor that never stops moving is a fidget in the corner of the eye and
//      the eye keeps going back to it. Then it became a weighted coin toss
//      between still and trembling, which was quieter and still wrong, because
//      it had no reason for either. His objection to that one is the useful one:
//      "I dont think the mouse tremor is a natural behavior in real human."
//
//      Correct. A cursor does not shimmer because a hand is warm. It moves when
//      the person moves it, and there are exactly three moments where that
//      movement is small enough to read as a tremor rather than as going
//      somewhere — all three of them CONSEQUENCES OF AN ACTION:
//
//        · VERIFY, after landing and pressing. One or two real submovements of
//          a pixel or three while you confirm you hit what you meant to. Nam:
//          "kinda like our brains self QA policy to refine the mouse location."
//        · SETTLE, after moving out of the way of what you just opened, hand
//          still on the mouse with nothing to do. The quietest of the three.
//        · DITHER, when you do not know what is next. The rarest, and only ever
//          after something else — a hesitation with nothing behind it is not a
//          hesitation.
//
//      Between those the arrow does not move at all. And nothing tremors while
//      the hand is working, the scroll especially: the wheel movement is already
//      motion, and shaking on top of it is a shaky hand rather than a steady one.
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
  /**
   * Get out of the way of something that was just opened, then rest there.
   *
   * Called after a press that changed what is on screen. See `clearOf`.
   */
  retreat: (from?: Element) => Promise<void>;
  /** Hesitate: a small aimless movement, for when there is nothing to do yet. */
  dither: () => Promise<void>;
  /** Roll a surface to an offset, with the hand resting on it. */
  roll: (s: Scroller, to: number, ms?: number) => Promise<void>;
  /** Drift off the edge of the screen and stop. */
  park: () => Promise<void>;
  show: () => void;
  hide: () => void;
  /** Stop tremoring and stand down — the visitor has taken over. */
  yield: (on: boolean) => void;
  /**
   * Move at speed, because the visitor has asked to skip a line the hand is
   * still working through.
   *
   * A beat cannot be skipped -- see the cutscene note in tour/stage.ts -- so the
   * honest response to a skip during one is to get it over with rather than to
   * ignore it. Everything still happens, and in the same order; it just happens
   * at about a third of the time.
   */
  hurry: (on: boolean) => void;
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
/**
 * What `hurry` multiplies every duration by.
 *
 * 0.35 rather than something smaller: below about a third the throw stops
 * reading as a movement at all and the arrow appears to teleport, which loses
 * the one thing the beat is there for -- showing that a control was pressed by
 * something behaving like a hand.
 */
const HASTE = 0.35;

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
  /**
   * Wait this long before starting, once the leg before it has landed.
   *
   * This is the gap a corrective submovement needs before it can exist. The
   * throw is open-loop — it is planned before it starts and cannot be steered —
   * so the correction cannot begin until the eye has seen where the throw
   * actually landed and the decision has come back. That round trip is roughly
   * 100 to 150 milliseconds, and it is the pause that makes a reach read as
   * aiming rather than as an animation with a wobble on the end.
   */
  pre: number;
}

/**
 * Why the hand is not perfectly still. Nothing else makes it move.
 *
 * Nam, and this is a better theory than the one it replaces: "I dont think the
 * mouse tremor is a natural behavior in real human." Correct — a cursor does
 * not shimmer because a hand is warm. It moves when the person moves it, and
 * there are exactly three moments where that movement is small enough to read
 * as a tremor rather than as going somewhere.
 */
type SpellKind =
  /** Just landed and pressed: is that where I meant to be? */
  | 'verify'
  /** Parked out of the way, hand still on the mouse. */
  | 'settle'
  /** Not sure what to do next. */
  | 'dither';

/** Peak amplitude per spell, in pixels of tremor. All of them are small. */
const PEAK: Record<SpellKind, number> = {
  // The largest, because it is a real check rather than slack in a wrist.
  verify: 0.9,
  // The smallest: a hand resting with no intent behind it.
  settle: 0.45,
  dither: 0.6,
};

export function makeHand(root: HTMLElement, reduced: boolean): Hand {
  /*
   * The arrow is drawn rather than set as a CSS cursor, because a CSS cursor
   * only exists where a real pointer is and this one has to exist where nobody
   * is pointing. The shape is Windows' own: an 11x17 wedge with a white fill,
   * a 1px dark outline and a soft drop shadow so it stays legible over both the
   * dark call surface and the white CV underneath it.
   */
  /** 1 normally, HASTE while the visitor is waiting on a beat they tried to skip. */
  let haste = 1;

  const el = h('div', { class: 'hand', 'aria-hidden': 'true' }) as HTMLElement;
  el.innerHTML = '<span class="hand-ring"></span>'
    /*
     * N77. This was 22x35 against a real Windows pointer's 12x19, which is
     * nearly double. Nam: "the mock cursor is gigantic now, we need to bring it
     * down a bit in size."
     *
     * It was oversized on purpose, to stay findable over a busy screen share.
     * That is a real problem and the ring below already solves it, so the arrow
     * was paying for the same thing twice. 15x24 is a shade over life size,
     * which reads as a pointer rather than as a graphic of one.
     */
    + '<svg class="hand-arrow" viewBox="0 0 12 19" width="15" height="24" aria-hidden="true">'
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

  /**
   * The current reason for not being still, and when it started.
   *
   * NULL IS THE DEFAULT AND THE COMMON CASE. A spell is cast by something
   * happening — landing on a target, parking out of the way, hesitating — and
   * it decays to nothing on its own. Between spells the arrow does not move at
   * all, which is what a cursor mostly does.
   */
  let spell: { kind: SpellKind; at: number; ms: number } | null = null;

  const cast = (kind: SpellKind, ms: number): void => {
    if (reduced) return;
    spell = { kind, at: performance.now(), ms };
  };

  /** True while the hand is on the wheel. Nothing tremors over the top of work. */
  let busy = false;

  const paint = (t: number): void => {
    let px = x;
    let py = y;

    /*
     * A spell only runs while the hand is otherwise still. Starting to move
     * cancels it outright rather than fading it: once you are travelling
     * somewhere, whatever you were unsure about is settled.
     */
    if (spell && (legs.length || standingDown || busy)) spell = null;

    if (spell) {
      const k = (t - spell.at) / spell.ms;
      if (k >= 1) {
        spell = null;
      } else {
        /*
         * Decays from the start. There is no fade-in, because the thing that
         * causes it — arriving, parking, hesitating — has already happened by
         * the time the spell exists, and the correction is largest at the
         * moment you notice you need one.
         *
         * The exponent keeps the tail short. A linear decay spends its second
         * half at an amplitude too small to see and too large to stop painting.
         */
        const amp = PEAK[spell.kind] * (1 - k) ** 2.2;
        /*
         * END IT WHEN IT STOPS BEING VISIBLE, rather than letting it decay
         * asymptotically to nothing.
         *
         * An exponential tail is invisible long before it is over: tracing this
         * showed a settle spell nominally lasting four seconds while everything
         * after the first second was below a twentieth of a pixel. That is not
         * motion, it is arithmetic — and it kept the hand "moving" in the trace,
         * which made the whole model impossible to check. Under a twentieth of a
         * pixel the spell is finished.
         */
        if (amp < 0.05) {
          spell = null;
        } else {
          /*
           * Two incommensurable frequencies summed, so it never repeats
           * visibly — a single sine reads as a vibration effect, which is a
           * different and much worse thing than a hand.
           */
          px += Math.sin(t * 0.0512) * 0.62 * amp + Math.sin(t * 0.0231) * 0.44 * amp;
          py += Math.cos(t * 0.0447) * 0.56 * amp + Math.sin(t * 0.0189) * 0.38 * amp;
        }
      }
    }

    /*
     * Do not write a transform that is the same as the last one.
     *
     * Most frames of a tour are now this branch — the hand is still, and still
     * means still. Skipping the write is a small saving on its own and a real
     * one against the compositor, but the reason it is here is honesty: a
     * property that is rewritten sixty times a second with the same value is
     * indistinguishable from one that is changing, to a profiler and to anyone
     * trying to measure whether this model does what it claims.
     */
    const next = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
    if (next !== painted) {
      painted = next;
      el.style.transform = next;
    }
  };
  let painted = '';

  const frame = (t: number): void => {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const leg = legs[0];
    if (leg) {
      // `started` may be in the future — that is the inter-submovement dwell,
      // and clamping k at zero is what holds the hand at the leg's origin for
      // the length of it. See Leg.pre.
      const k = leg.ms > 0 ? Math.min(1, Math.max(0, (t - leg.started) / leg.ms)) : 1;
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
          const done = resolve;
          resolve = null;
          done?.();
        } else {
          legs[0]!.started = t + legs[0]!.pre;
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
    const ms = Math.max(MIN_MS, Math.min(MAX_MS, FITTS_A + FITTS_B * Math.log2(d / w + 1))) * haste;

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
      pre: 0,
    });

    /* --- the corrections: short, straight, decelerating, and PAUSED FIRST --- */
    /*
     * Nam: "it moves generally towards that direction, then refines its movement
     * further to accurately click where it should."
     *
     * That is the shape, and the part that was missing is the word "then". The
     * corrections used to run straight off the end of the throw, which turns
     * three submovements into one long easing curve — the refinement was there
     * in the geometry and invisible in the motion.
     *
     * Each correction now waits for the eye. The throw is open-loop; the
     * correction cannot be planned until the miss has been seen, and that round
     * trip is roughly 100–150ms. Holding still for it is what separates
     * "arriving" from "aiming", and it costs about a fifth of a second on a
     * reach that already takes most of one.
     */
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
        // Shorter for a second correction: the eye is already on the target by
        // then and only the distance is being re-judged.
        pre: i === 0 ? rand(95, 155) : rand(55, 100),
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

  /** One tiny corrective submovement, in a random direction, from where we are. */
  const nudge = (dist: number, ms: number): Promise<void> => {
    if (dead || reduced) return Promise.resolve();
    const a = Math.random() * Math.PI * 2;
    return new Promise((done) => {
      const nx = x + Math.cos(a) * dist;
      const ny = y + Math.sin(a) * dist;
      legs = [{
        x0: x, y0: y, cx: (x + nx) / 2, cy: (y + ny) / 2, x1: nx, y1: ny,
        ms, ease: settle, started: performance.now(), pre: 0,
      }];
      resolve = done;
    });
  };

  /**
   * THE SELF-CHECK, and this is the one Nam described.
   *
   * "I could see a bit of tremor after it has finished moving and clicked, kinda
   * like our brains self QA policy to refine the mouse location, like tiny
   * corrections."
   *
   * That is not a tremor in the physiological sense and it should not be built
   * as one. It is one or two REAL submovements of a pixel or three, made after
   * the press, while you confirm you hit what you meant to. So it is legs, not
   * noise — with a short spell of actual noise underneath, which is the part
   * that reads as a hand still resting on the mouse while the eye checks.
   *
   * Not every time. Roughly half, because half the time you press a big obvious
   * button and simply know you hit it.
   */
  const verify = async (): Promise<void> => {
    if (dead || reduced) return;
    if (Math.random() < 0.48) {
      await wait(rand(70, 150));
      await nudge(rand(1.4, 3.4), rand(90, 150));
      if (Math.random() < 0.3) {
        await wait(rand(60, 120));
        await nudge(rand(1, 2.2), rand(80, 130));
      }
    }
    cast('verify', rand(260, 620));
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
    await verify();
  };

  const centreOf = (target: Element): { x: number; y: number; w: number } | null => {
    const r = target.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    /*
     * NOT DEAD CENTRE, and biased toward the side you came from.
     *
     * Nam: "usually not fully centered on the element either." Right, and the
     * miss is not symmetric — a reach that has just decelerated tends to stop
     * SHORT rather than to sail past, because stopping short costs half a
     * correction and overshooting costs a whole one. So the landing point is
     * pulled back along the direction of approach on top of the scatter.
     *
     * Both offsets are bounded by the target's own size, so it always lands
     * inside the thing it is pressing however small that thing is.
     */
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = Math.hypot(cx - x, cy - y) || 1;
    const near = rand(0.06, 0.2);
    return {
      x: cx - ((cx - x) / d) * r.width * near + rand(-r.width * 0.16, r.width * 0.16),
      y: cy - ((cy - y) / d) * r.height * near + rand(-r.height * 0.16, r.height * 0.16),
      w: Math.min(r.width, r.height),
    };
  };

  /**
   * Where to put the hand so it stops covering what it just opened.
   *
   * Nam: "after a useful click, user would move the mouse to the empty space to
   * not obstruct the view." Everyone does this and nobody notices they do it —
   * which is exactly the class of behaviour that makes a synthetic cursor read
   * as a person, because its absence is felt without being identified.
   *
   * The heuristic is deliberately crude: go sideways, toward whichever margin
   * has more room, far enough to clear the thing that was pressed, and stay well
   * inside the viewport. Anything cleverer would need to know what is worth not
   * covering, and the tour already knows that — it is the surface it is about to
   * talk about.
   */
  const clearOf = (target?: Element): { x: number; y: number } => {
    const m = 90;
    const r = target?.getBoundingClientRect();
    const room = { l: x, r: window.innerWidth - x };
    const dir = room.r >= room.l ? 1 : -1;
    const push = r ? Math.max(r.width * 0.6, 110) : rand(110, 190);
    return {
      x: Math.max(m, Math.min(window.innerWidth - m, x + dir * push + rand(-30, 30))),
      y: Math.max(m, Math.min(window.innerHeight - m, y + rand(-60, 70))),
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

    retreat: async (from) => {
      if (dead || reduced) return;
      setHot(null);
      const to = clearOf(from);
      await go(to.x, to.y, 140);
      /*
       * And now the hand is somewhere with nothing under it, still on the mouse,
       * with no plan. That is the second of Nam's three cases and the longest of
       * them: "as they leave their hand on the physical mouse, the on screen
       * mouse might jitter just a little bit." Lowest amplitude of the three,
       * and it decays to nothing rather than persisting.
       */
      cast('settle', rand(1200, 2800));
    },

    dither: async () => {
      if (dead || reduced) return;
      /*
       * The rarest case, and Nam is right that it only makes sense after
       * something: "when user is indecisive what to do next, this should also be
       * after another action." A hesitation with nothing behind it is not a
       * hesitation, it is a screensaver.
       */
      setHot(null);
      await nudge(rand(7, 16), rand(320, 620));
      cast('dither', rand(700, 1500));
    },

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
      /*
       * The finger moves; the hand does not travel.
       *
       * This nudged the cursor a fixed amount per notch in the scroll direction
       * and never gave it back, so a long roll walked the hand fifteen pixels
       * down the screen and left it there — three or four rolls in and it had
       * migrated off the surface it was supposed to be resting on. A finger on a
       * wheel oscillates around where it is; it does not migrate. So it bobs
       * around `restY` and comes back to it exactly.
       *
       * ONE half-sine across the whole roll, not one per notch. Per-notch was
       * the first attempt and traced at about 4 Hz — a flutter, which is exactly
       * the distraction Nam was warning about, arriving in the one place he
       * named. A finger pushing a wheel makes a single movement out and back
       * however long the scroll is, so this does too.
       *
       * `busy` holds the tremor off for the duration, which is Nam's note: the
       * wheel movement is already motion, and shaking on top of it is a shaky
       * hand rather than a steady one.
       */
      const restY = y;
      const dir = delta > 0 ? 1 : -1;
      busy = true;
      try {
        for (let i = 1; i <= notches; i += 1) {
          if (dead) return;
          // Ease the whole roll, so it starts and stops like a hand rather than
          // like a scrollbar being dragged at constant speed.
          const k = settle(i / notches);
          s.set(from + delta * k);
          y = restY - Math.sin(Math.PI * (i / notches)) * 2.4 * dir;
          await wait(gap);
        }
      } finally {
        y = restY;
        busy = false;
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
    hurry: (on) => { haste = on ? HASTE : 1; },
    pos: () => ({ x, y }),
    destroy: () => {
      dead = true;
      cancelAnimationFrame(raf);
      setHot(null);
      el.remove();
    },
  };
}
