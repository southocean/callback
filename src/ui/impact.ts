// The wordmark impact, simulated rather than keyframed.
//
// WHY NOT CSS
//
// The choreography was keyframed three times and read wrong every time, and the
// reason is structural rather than a matter of picking better numbers. CSS
// animations are independent timelines: each element is told "start at 1.07s,
// run for 340ms". Nothing can be triggered by the *state* of another element.
// So "Google gives way once Meet has taken the blow" has to be faked as a
// guessed delay, and the moment any duration changes, every guess is wrong
// again. Worse, each element eases independently, so everything decelerates
// into its own end state — which is precisely the "slows down on impact"
// problem: a body cannot transmit an impulse it has already spent.
//
// So this is one simulation with one clock, three stages, and momentum carried
// across the boundaries.
//
// THE MODEL
//
//   APPROACH  The name travels in at CONSTANT velocity. No ease-out: it must
//             arrive with all of its momentum intact, or there is nothing to
//             transfer. This is the single biggest fix.
//
//   DISPLACE  Contact. The name's momentum is spent moving what is in front of
//             it, so it decelerates — now, not before. The stack is not equally
//             stiff: "Google" gives way almost entirely, being SHOVED LEFT out
//             of the lockup and fading as it goes, while "Meet" absorbs the
//             small remainder by tightening its letters.
//
//             The word is displaced, never distorted. An earlier version
//             squashed it with scaleX, which read as crushing Google's own
//             wordmark — a bad look on a page addressed to Google, and
//             unnecessary: pushing it out of frame says the same thing about
//             making room without mangling the artwork.
//
//             Constant resistive force, so constant deceleration:
//               v(t) = v0 - at,  pen(t) = v0.t - at^2/2
//             The stage ends with the name still moving at 25% of v0 — the
//             impulse is not fully spent, which is what leaves energy in the
//             spring for the next stage.
//
//   RECOIL    "Meet" is compressed and released, as a damped oscillator:
//               ls(t) = -c.e^(-lambda.t).cos(omega.t)
//             Its expansion does two things for free, because both follow from
//             layout rather than being animated separately: it finishes off
//             what is left of Google, and because Meet grows to the LEFT of the
//             name, that growth pushes the name right into its final position.
//
// WHAT FALLS OUT FOR FREE
//
// The name is never animated after contact. Its position is entirely a
// consequence of Google's width and Meet's tracking, because they sit to its
// left in a flex row. So it overshoots left while the stack is compressed and
// gets pushed back right by the recoil, without a single keyframe describing
// either move. That is the difference between animating a result and simulating
// a cause.

export interface Parts {
  /** The word itself. Its width drives layout; its transform carries it out. */
  google: HTMLElement;
  meet: HTMLElement;
  nam: HTMLElement;
}

// The camera mark is deliberately NOT in here. It used to take a small knock on
// contact, on the theory that the whole lockup should feel the blow. It read as
// the logo jittering rather than as force arriving — partly because it is the
// one element that is Google's actual artwork, so any wobble reads as a
// rendering fault rather than as choreography. It now stays perfectly still,
// which also gives the moving parts something fixed to move against.

/** Natural width of the "Google" bitmap, in px. */
const G0 = 76;
/** Where the name starts, to the right of its resting place. */
const FROM = 110;
/** Approach speed, px/ms. 110px in ~183ms. */
const V0 = 0.6;
/** How deep the stack compresses before the spring takes over, px. */
const PEN_MAX = 70;
/** Fraction of the displacement Google absorbs. It is the one making room. */
const G_SHARE = 0.94;
/**
 * The word is squeezed IN PLACE, not shoved.
 *
 * Two constraints, and together they leave no freedom at all:
 *
 *   - it must not reach into "Meet" on its right, so its right edge cannot pass
 *     the right edge of the space it still owns:  s <= k
 *   - it must not reach the camera mark on its left, so it cannot travel left
 *     at all:  tx = 0, anchored at its left edge
 *
 * Which fixes s = k exactly. The word compresses at precisely the rate its box
 * closes, staying pinned where it started. An earlier version translated it
 * left as well, which kept it clear of "Meet" but walked it straight over the
 * mark instead — the same mess, moved to the other end.
 *
 * FADE_HI / FADE_LO are where it goes, expressed in remaining width rather than
 * in time, so the disappearance stays locked to the geometry however the
 * deceleration is retuned. It is gone at 35% width, which means "Meet" is still
 * a good 27px short of home when the space it is heading for is already empty.
 */
const FADE_HI = 0.65;
const FADE_LO = 0.35;
/** Letter-spacing Meet gives up per px of penetration. */
const M_SHARE = 0.022;
/** Velocity remaining at the end of the crush, as a fraction of v0. */
const V_END = 0.25;
/** Recoil oscillation: ~242ms period, decaying to nothing in ~420ms. */
const OMEGA = 0.026;
const LAMBDA = 0.0095;
const RECOIL_MS = 420;

/** Constant deceleration that spends 1 - V_END^2 of the energy over PEN_MAX. */
const DECEL = (V0 * V0 * (1 - V_END * V_END)) / (2 * PEN_MAX);
const CRUSH_MS = (V0 * (1 - V_END)) / DECEL;
const APPROACH_MS = FROM / V0;

/** Everything at rest, before the name has arrived. */
export function reset(p: Parts): void {
  p.google.style.width = `${G0}px`;
  p.google.style.transform = 'scaleX(1)';
  p.google.style.opacity = '1';
  p.meet.style.letterSpacing = 'normal';
  p.nam.style.transform = `translateX(${FROM}px)`;
  p.nam.style.opacity = '0';
}

/** The end state: no Google, natural tracking, name at rest. */
export function settle(p: Parts): void {
  p.google.style.width = '0px';
  p.google.style.opacity = '0';
  p.meet.style.letterSpacing = 'normal';
  p.nam.style.transform = 'translateX(0)';
  p.nam.style.opacity = '1';
}

/**
 * Run it. Returns a cancel function so a re-render cannot leave two
 * simulations driving the same element.
 */
export function play(p: Parts): () => void {
  reset(p);
  let raf = 0;
  let start = 0;
  let cancelled = false;

  const apply = (pen: number, ls: number, namX: number, gExtra = 1): void => {
    // k is how much of Google is still in the lockup. The container width
    // follows it, which is what slides "Meet" left; the bitmap inside travels
    // left independently, so the word leaves rather than shrinking in place.
    const k = Math.max(0, (1 - (pen * G_SHARE) / G0) * gExtra);
    // width drives layout, so "Meet" slides left as the word leaves; transform
    // does not, so the word travels independently of the space it vacates.
    p.google.style.width = `${(G0 * k).toFixed(2)}px`;
    // Squeeze only. No translation, so it cannot touch the mark.
    p.google.style.transform = `scaleX(${k.toFixed(4)})`;
    const fade = (k - FADE_LO) / (FADE_HI - FADE_LO);
    p.google.style.opacity = Math.max(0, Math.min(1, fade)).toFixed(3);
    p.meet.style.letterSpacing = ls === 0 ? 'normal' : `${ls.toFixed(3)}px`;
    p.nam.style.transform = `translateX(${namX.toFixed(2)}px)`;
  };

  const frame = (now: number): void => {
    if (cancelled) return;
    if (!start) start = now;
    const t = now - start;

    if (t < APPROACH_MS) {
      // Constant velocity. Nothing else has been touched yet.
      p.nam.style.opacity = t < 60 ? String(t / 60) : '1';
      apply(0, 0, FROM - V0 * t);
    } else if (t < APPROACH_MS + CRUSH_MS) {
      const ct = t - APPROACH_MS;
      const pen = Math.min(PEN_MAX, V0 * ct - (DECEL * ct * ct) / 2);
      p.nam.style.opacity = '1';
      // The name stays at 0: from here its position is a consequence of the
      // stack in front of it, not something being animated.
      apply(pen, -M_SHARE * pen, 0);
    } else {
      const rt = t - APPROACH_MS - CRUSH_MS;
      if (rt >= RECOIL_MS) { settle(p); return; }
      // Damped oscillator released from full compression.
      const c = M_SHARE * PEN_MAX;
      const ls = -c * Math.exp(-LAMBDA * rt) * Math.cos(OMEGA * rt);
      // The spring finishes Google off in its FIRST 60ms, before it has swung
      // back through zero. That ordering matters: Google dying pulls the name
      // left, the spring pushes it right, and if they overlap the name lurches
      // left again after having been pushed into place — which is exactly what
      // made the old version feel disjointed. The spring crosses zero at
      // t = (pi/2)/omega = 60ms, so everything Google has left must be gone by
      // then, and every frame after it is pure outward push.
      const kill = Math.min(1, rt / (Math.PI / 2 / OMEGA));
      apply(PEN_MAX, ls, 0, 1 - kill);
    }
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => { cancelled = true; cancelAnimationFrame(raf); };
}

/** Exposed for the build notes, so the numbers on the page cannot drift. */
export const timing = {
  approachMs: Math.round(APPROACH_MS),
  crushMs: Math.round(CRUSH_MS),
  recoilMs: RECOIL_MS,
  decel: +DECEL.toFixed(5),
  penMax: PEN_MAX,
};
