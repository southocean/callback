// The front door -- board ticket N158.
//
// Nam gave the link to a friend, cold. The friend has a PhD in computer science
// and read it as a real meeting invitation: scared to click Join, because Join
// is a risk you take for a reason and there was no reason on offer. He
// downloaded the PDF instead, which is the escape hatch working correctly and is
// not what this CV is for.
//
// THE FIX IS NOT A LOUDER SENTENCE. The scheduled card already says interactive
// CV. What was missing is that nobody had agreed to anything: the clone was the
// status quo on arrival, so the only available reaction to it was confusion. A
// Start button is agreement, and agreement is the mechanism that actually
// dissolves that particular fear -- reassurance is not, because unsolicited
// reassurance reads as the register of the thing it denies.
//
// It also aims the illusion rather than weakening it. Behind a curtain the clone
// becomes a REVEAL, and "he rebuilt Meet" is the double take worth having. "Is
// this Meet?" is the one that cost us the first tester.
//
// ---------------------------------------------------------------------------
// WHY IT DOES NOT LOOK LIKE MEET
//
// Nam: "it shouldnt have the same google meet vibe." Right, and the reason is
// the same paradox as the copy: a Google-looking page saying this is not Google
// cancels itself out. Nothing on this screen loads Google Sans or Product Sans,
// the display face is a system serif, and the ground is near black so that
// pressing Start opens onto Meet's white as a change of state rather than as a
// continuation of one.
//
// ---------------------------------------------------------------------------
// EIGHT ANIMATIONS, SEVEN OF THEM TEMPORARY
//
// Nam: "Implement a couple of variants and let me choose on the physical start
// page." So the picker and the seven unchosen variants come out once he has
// chosen, which also takes this chunk back down. Keys 1 to 8, remembered.
//
// Seven are TEXTURES: they live in the margins and the scrim in styles.css keeps
// them off the words. Drones is the exception and is a SUBJECT -- it builds
// shapes where the copy is, so it carries its own scrim override, which is why
// show() writes the id onto the wrapper.
//
// DRONES ALSO HAS A PROGRAMME. Five of them: Geometry, Cinema, Places, Food and
// The call, chosen from a second row that appears only with that variant. Nam:
// "we keep the drone idea, then setup a few themes to select from." Geometry is
// the default and the only one that says nothing about him.
//
// Every variant is a PURE FUNCTION OF TIME. Nothing accumulates between frames.
// That is not tidiness for its own sake: it is what makes reduced motion a
// one-line answer -- draw a single representative frame and stop -- rather than
// a second implementation of each animation, and it means a resize, a tab switch
// or a dropped frame cannot leave an animation in a state it can never leave.

import { h } from '../dom.js';
import { loadVariant, saveVariant, loadTheme, saveTheme } from '../prefs.js';
import type { Store } from '../state.js';

/* --- the animations ------------------------------------------------------- */

/**
 * Where the visitor's own pointer is, for the one variant that cares.
 *
 * `on` goes false when the pointer leaves the window, so Dust settles back
 * rather than holding a dent at the last known position forever.
 */
interface Ptr { x: number; y: number; on: boolean }

/**
 * The two colours, read off the element so retuning stays a CSS job.
 *
 * Handed in rather than read per variant because getComputedStyle is a layout
 * read and doing it inside a loop over three hundred points would be the one
 * genuinely expensive thing on this screen. Only Drones uses `accent`; the rest
 * draw in `line` and ignore it.
 */
interface Pal { line: string; accent: string }

interface Art {
  id: string;
  /** What the picker calls it. */
  label: string;
  /** Where the frozen frame sits, in seconds, for reduced motion. */
  still: number;
  draw: (
    c: CanvasRenderingContext2D, w: number, h: number, t: number, p: Ptr, pal: Pal,
  ) => void;
}

/**
 * Deterministic noise from an integer.
 *
 * The classic shader one-liner. It is here because "pure function of time" and
 * "different every cycle" both have to be true at once: Math.random would make
 * a frame depend on how many frames came before it, which is precisely the
 * dependency this whole file is built to avoid.
 */
const rnd = (n: number): number => {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

/** Ease that starts fast and lands slowly. */
const out = (k: number): number => 1 - (1 - k) ** 3;
/** In and out, for something that arrives and leaves. */
const pulse = (k: number): number => (k < 0.5 ? out(k * 2) : out((1 - k) * 2));

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

const rrect = (
  c: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, r: number,
): void => {
  // Clamped at zero, and that is not belt and braces. arcTo THROWS on a negative
  // radius, and a throw inside the rAF callback kills the loop for good, because
  // the next frame is scheduled after the draw. See the note on frame().
  const rad = Math.max(0, Math.min(r, w / 2, hh / 2));
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + hh, rad);
  c.arcTo(x + w, y + hh, x, y + hh, rad);
  c.arcTo(x, y + hh, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
};

/**
 * TILES. A field of rectangles drifting on their own, which every so often
 * settle into the tile grid of a seven-person call and then let go again.
 *
 * The recognition is the point and it is deliberately late: for most of the
 * cycle this is abstract, and the moment it resolves is a shape the visitor has
 * no name for yet. They get the name two screens later, which makes this a
 * promise the call keeps rather than a diagram of it.
 */
const tiles: Art = {
  id: 'tiles',
  label: 'Tiles',
  still: 9.2,
  draw: (c, w, hh, t) => {
    const N = 7;
    const PERIOD = 17;
    const p = (t % PERIOD) / PERIOD;
    // Drift, converge, hold, let go. The hold is the shortest part of it.
    const k = p < 0.35 ? 0
      : p < 0.53 ? out((p - 0.35) / 0.18)
        : p < 0.76 ? 1
          : 1 - out(clamp01((p - 0.76) / 0.18));

    // The grid: three across, centred, the last row holding one.
    const gw = Math.min(w * 0.52, 620);
    const cw = (gw - 32) / 3;
    const ch = cw * 0.62;
    const gh = ch * 3 + 32;
    const gx = (w - gw) / 2;
    const gy = (hh - gh) / 2;

    for (let i = 0; i < N; i += 1) {
      const col = i < 6 ? i % 3 : 1;
      const row = i < 6 ? Math.floor(i / 3) : 2;
      const tx = gx + col * (cw + 16);
      const ty = gy + row * (ch + 16);

      // Where it wanders when it is not being a grid. Two incommensurate
      // frequencies per axis, so no two tiles ever share a path.
      const a = rnd(i) * 6.28;
      const b = rnd(i + 40) * 6.28;
      const sp = 0.055 + rnd(i + 80) * 0.05;
      const wx = w * 0.5 + Math.cos(t * sp + a) * w * 0.34 + Math.sin(t * sp * 1.7 + b) * w * 0.08;
      const wy = hh * 0.5 + Math.sin(t * sp * 0.83 + b) * hh * 0.36 + Math.cos(t * sp * 1.3 + a) * hh * 0.07;
      const scale = 0.55 + rnd(i + 120) * 0.7;

      const x = (wx - (cw * scale) / 2) * (1 - k) + tx * k;
      const y = (wy - (ch * scale) / 2) * (1 - k) + ty * k;
      const ww = cw * scale * (1 - k) + cw * k;
      const wh = ch * scale * (1 - k) + ch * k;

      c.globalAlpha = 0.1 + k * 0.42;
      c.lineWidth = 1;
      rrect(c, x, y, ww, wh, 10 + k * 4);
      c.stroke();
    }
    c.globalAlpha = 1;
  },
};

/**
 * MEASURE. Hairlines sweep in, bracket a rectangle that is not there, print one
 * number, and leave.
 *
 * This is the build's own method as ambient motion: the interface was specified
 * before it was written, off computed styles and bounding boxes read from the
 * live product. It makes the technical claim before any of the copy does, and it
 * makes it in the one register a reader cannot mistake for a boast.
 *
 * THE NUMBERS ARE REAL, and copied rather than imported. data/spec.ts is where
 * they live and it is a large module behind a dynamic import that this screen has
 * no other reason to pull forward -- the title card is on the critical path and
 * the spec panel is not. Ten short strings is the cheaper copy.
 */
const FACTS = [
  '48px', 'radius 8', '#d3e3fd', '740 x 416', '#0b57d0',
  '#1f1f1f', '235 x 132', 'radius 12', '#c2e7ff', '56px',
];

const measure: Art = {
  id: 'measure',
  label: 'Measure',
  still: 2.4,
  draw: (c, w, hh, t) => {
    const EVERY = 5.6;
    const n = Math.floor(t / EVERY);
    const u = (t % EVERY) / EVERY;

    // One box per cycle, placed so it never fights the type for the middle.
    const bw = w * (0.16 + rnd(n) * 0.2);
    const bh = hh * (0.13 + rnd(n + 7) * 0.16);
    const bx = w * (0.05 + rnd(n + 14) * 0.62);
    const by = hh * (0.08 + rnd(n + 21) * 0.7);

    // Sweep in, hold, fade. The hold is most of it: this should read as
    // something being examined rather than as something flashing.
    const sweep = out(clamp01(u / 0.14));
    const fade = u < 0.78 ? 1 : 1 - out((u - 0.78) / 0.22);
    if (fade <= 0) return;

    c.lineWidth = 1;

    // The crosshairs, drawn full bleed and clipped by nothing. They arrive
    // before the brackets, which is the order an overlay actually renders in.
    c.globalAlpha = 0.14 * fade;
    for (const x of [bx, bx + bw]) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, hh * sweep);
      c.stroke();
    }
    for (const y of [by, by + bh]) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w * sweep, y);
      c.stroke();
    }

    if (u < 0.14) return;
    const bk = out(clamp01((u - 0.14) / 0.12));

    // The brackets: four corners, never a closed box. A closed box reads as a
    // thing; corners read as a measurement of the space a thing would occupy.
    c.globalAlpha = 0.5 * fade;
    const arm = Math.min(bw, bh) * 0.3 * bk;
    const corners: [number, number, number, number][] = [
      [bx, by, 1, 1], [bx + bw, by, -1, 1],
      [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1],
    ];
    for (const [cx, cy, sx, sy] of corners) {
      c.beginPath();
      c.moveTo(cx + sx * arm, cy);
      c.lineTo(cx, cy);
      c.lineTo(cx, cy + sy * arm);
      c.stroke();
    }

    // The width tick, and the one number.
    c.globalAlpha = 0.34 * fade;
    c.beginPath();
    c.moveTo(bx, by + bh + 14);
    c.lineTo(bx + bw * bk, by + bh + 14);
    c.stroke();

    c.globalAlpha = 0.62 * fade * bk;
    c.font = '400 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    c.textBaseline = 'top';
    c.fillText(FACTS[n % FACTS.length]!, bx, by + bh + 20);
    c.globalAlpha = 1;
  },
};

/**
 * Where a leg of the pointer's journey begins.
 *
 * Kept off the edges, because a target half off screen produces a throw that
 * looks like a mistake rather than like a reach.
 */
const pt = (n: number, w: number, hh: number): [number, number] => [
  w * (0.1 + rnd(n * 3) * 0.8),
  hh * (0.12 + rnd(n * 3 + 1) * 0.76),
];

const LEG = 2.6;

/**
 * Where the pointer is at absolute time t. Pure, so the trail can look back.
 *
 * Woodworth's two-phase reach, which is the model tour/cursor.ts is built on: a
 * ballistic throw aimed slightly past the target, then a slow corrective settle.
 * Eight lines rather than an import, because that module is eight hundred lines
 * of DOM and timers and this needs the shape of the movement and nothing else.
 */
const at = (t: number, w: number, hh: number): [number, number] => {
  const n = Math.floor(t / LEG);
  const u = clamp01((t % LEG) / LEG);
  const [ax, ay] = pt(n, w, hh);
  const [bx, by] = pt(n + 1, w, hh);

  // The throw covers the first 45% of the time and 105% of the distance. The
  // correction spends the rest of the time giving that 5% back.
  const THROW = 0.45;
  const k = u < THROW
    ? 1.05 * out(u / THROW)
    : 1.05 + (1 - 1.05) * out((u - THROW) / (1 - THROW));

  // The arc. Hands rotate around a wrist and an elbow and do not travel in
  // straight lines; which way the path bows depends on the direction of travel.
  const bow = Math.sin(k * Math.PI) * (rnd(n + 60) - 0.5) * 90;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return [ax + dx * k - (dy / len) * bow, ay + dy * k + (dx / len) * bow];
};

/**
 * TRACE. A pointer going somewhere, over and over, leaving a trail that fades.
 *
 * IT ALSO DOES A JOB. The other half of the first test was the shared screen
 * reading as remote access, because a cursor that moves without input means
 * exactly one thing in consumer computing. Meeting that motion HERE, as an
 * ornament on a screen with nothing at stake, makes it a motif the visitor has
 * already seen by the time it is driving a desktop. Familiar is the whole
 * difference between a person and an intruder.
 */
const trace: Art = {
  id: 'trace',
  label: 'Trace',
  still: 1.1,
  draw: (c, w, hh, t) => {
    const TAIL = 1.5;
    const STEPS = 46;

    // The trail, oldest first, each segment its own stroke so the alpha ramps.
    for (let i = 0; i < STEPS; i += 1) {
      const t0 = t - TAIL * (1 - i / STEPS);
      const t1 = t - TAIL * (1 - (i + 1) / STEPS);
      if (t0 < 0) continue;
      const [x0, y0] = at(t0, w, hh);
      const [x1, y1] = at(t1, w, hh);
      c.globalAlpha = (i / STEPS) ** 2 * 0.45;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }

    // The head.
    const [hx, hy] = at(t, w, hh);
    c.globalAlpha = 0.85;
    c.beginPath();
    c.arc(hx, hy, 2.2, 0, 6.2832);
    c.fill();

    // The press, at the end of each leg: one ring, expanding and gone. A hand
    // arriving somewhere and doing nothing would be a hand with no reason.
    const since = t % LEG;
    if (since < 0.7) {
      const [cx, cy] = pt(Math.floor(t / LEG), w, hh);
      const k = since / 0.7;
      c.globalAlpha = (1 - k) * 0.5;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(cx, cy, 3 + k * 26, 0, 6.2832);
      c.stroke();
    }
    c.globalAlpha = 1;
  },
};

/**
 * SIGNAL. One line across the middle, alive, which now and then loses packets
 * and knits itself back together.
 *
 * The quietest of the four and the one that says the least, which is either its
 * weakness or the reason to pick it. What it does say is on the nose for the
 * work: seven years on a real-time client, and a panel in this build that
 * degrades the call on purpose to show what that actually looks like.
 */
const signal: Art = {
  id: 'signal',
  label: 'Signal',
  still: 4.6,
  draw: (c, w, hh, t) => {
    /*
     * NOT THE VERTICAL MIDDLE, which is where it was and where it was wrong. The
     * copy is centred, so a line across the middle ran straight behind the one
     * sentence on this screen that has to be readable at a glance -- the one
     * about cameras and microphones. The column scrim in styles.css would have
     * hidden most of it and the result would have been a line that mysteriously
     * faded out in the middle for no reason the eye could see.
     *
     * Down here it has the empty lower band to itself, it reads as a horizon,
     * and it never competes with a word. 0.74 was the first try and still ran
     * through the row of links at 900 tall, which is the shortest laptop viewport
     * worth designing for.
     */
    const mid = hh * 0.86;
    const span = Math.min(w * 0.72, 900);
    const x0 = (w - span) / 2;

    // A loss window every nine seconds, on about half of them.
    const n = Math.floor(t / 9);
    const bad = rnd(n + 200) > 0.45;
    const lu = (t % 9) / 9;
    const loss = bad ? pulse(clamp01((lu - 0.45) / 0.22)) : 0;

    c.lineWidth = 1;
    c.globalAlpha = 0.4;
    c.beginPath();
    let drawing = false;
    const STEPS = 220;
    for (let i = 0; i <= STEPS; i += 1) {
      const p = i / STEPS;
      const x = x0 + span * p;
      // Taper to nothing at both ends, so the line does not stop, it arrives.
      const env = Math.sin(p * Math.PI) ** 0.7;
      const a = Math.sin(p * 9 + t * 1.9) * 5 + Math.sin(p * 23 - t * 1.1) * 2.4;
      const jitter = loss * Math.sin(p * 61 + t * 30) * 16;
      const y = mid + (a + jitter) * env;

      /*
       * The gaps, keyed on the step index and the window rather than on the
       * frame. Random per frame would strobe, which is both ugly and a motion
       * safety problem -- the design record says nothing here modulates above
       * 3 Hz. Keyed this way a gap holds still for as long as it exists.
       */
      const gap = loss > 0.25 && rnd(i + n * 977) < loss * 0.42;
      if (gap) { drawing = false; continue; }
      if (drawing) c.lineTo(x, y);
      else { c.moveTo(x, y); drawing = true; }
    }
    c.stroke();
    c.globalAlpha = 1;
  },
};

/**
 * DUST. A field of grain that gets out of your way.
 *
 * Nam's own idea, and the best one on the list for a reason that is not really
 * about looks: it is the only variant that answers the visitor. The other half
 * of the first test was the shared screen reading as remote access, and the
 * deepest reassurance against that is not a sentence, it is the experience of
 * moving your hand and watching the machine respond. This screen hands them that
 * in the first second, before anything is at stake, and it costs a paragraph of
 * code.
 *
 * The type stays crisp. He asked whether the NAME could be made of dots; it can,
 * and it should not -- the serif at 92px is the most confident thing on the
 * screen, and rebuilding it out of grain would trade a strong statement for a
 * clever one. The dust goes around it instead.
 *
 * Squares rather than circles, and one path for the lot. At this density there
 * are about eight hundred of them, and eight hundred arcs per frame is real work
 * for something nobody will look at directly.
 */
const dust: Art = {
  id: 'dust',
  label: 'Dust',
  still: 3,
  draw: (c, w, hh, t, p) => {
    const STEP = 38;
    const R = 130;
    const cols = Math.ceil(w / STEP) + 1;
    const rows = Math.ceil(hh / STEP) + 1;

    c.globalAlpha = 0.3;
    c.beginPath();
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        const seed = i * 131 + j;
        // A drift each, slow and tiny. Without it the field is a grid, and a
        // grid is furniture rather than dust.
        const ph = rnd(seed) * 6.28;
        const sp = 0.16 + rnd(seed + 3) * 0.22;
        let x = i * STEP + Math.cos(t * sp + ph) * 5;
        let y = j * STEP + Math.sin(t * sp * 0.9 + ph * 1.7) * 5;

        if (p.on) {
          const dx = x - p.x;
          const dy = y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < R && d > 0.01) {
            /*
             * Squared falloff, so the edge of the dent is soft and the middle is
             * decisive. Linear read as a circle being dragged around, which is
             * the shape of a tool. This is the shape of something yielding.
             */
            const push = (1 - d / R) ** 2 * 46;
            x += (dx / d) * push;
            y += (dy / d) * push;
          }
        }
        const s = 1.2 + rnd(seed + 9) * 1.1;
        c.rect(x, y, s, s);
      }
    }
    c.fill();
    c.globalAlpha = 1;
  },
};

/**
 * APERTURE. One rectangle, breathing.
 *
 * The most restrained of the seven and the one that is purely theatrical: a
 * hairline frame that opens past the copy and closes back in on it, which is a
 * curtain, or a lens, or a stage. It says nothing about the work at all. That is
 * either its problem or the whole point -- everything after Start is dense and
 * technical, and a title card is allowed to be one shape.
 */
const aperture: Art = {
  id: 'aperture',
  label: 'Aperture',
  still: 5.5,
  draw: (c, w, hh, t) => {
    const PERIOD = 22;
    const k = pulse((t % PERIOD) / PERIOD);

    // Three frames, nested, each lagging the one outside it. One alone read as a
    // border; three read as something with a mechanism.
    for (let n = 0; n < 3; n += 1) {
      const lag = clamp01(k - n * 0.06);
      const bw = (w * 0.3 + w * 0.42 * lag) - n * 46;
      const bh = (hh * 0.34 + hh * 0.46 * lag) - n * 34;
      if (bw <= 0 || bh <= 0) continue;
      c.globalAlpha = (0.34 - n * 0.09) * (0.35 + lag * 0.65);
      c.lineWidth = 1;
      rrect(c, (w - bw) / 2, (hh - bh) / 2, bw, bh, 2);
      c.stroke();
    }
    c.globalAlpha = 1;
  },
};

/**
 * STAVES. Long hairlines at irregular heights, sliding past each other.
 *
 * The typographic one. The other six are all built out of the vocabulary of
 * software -- tiles, measurements, cursors, packets, grain -- and this one is
 * built out of the vocabulary of a printed page: rules, on a baseline grid,
 * mostly still. Every so often the drifts coincide and the whole set squares up
 * for a second, which is the only event in it.
 */
const staves: Art = {
  id: 'staves',
  label: 'Staves',
  still: 6,
  draw: (c, w, hh, t) => {
    const N = 9;
    c.lineWidth = 1;
    for (let i = 0; i < N; i += 1) {
      const y = hh * (0.08 + (i / (N - 1)) * 0.84);
      const len = w * (0.3 + rnd(i + 11) * 0.42);
      // Each rule has its own period, and the periods are close enough that they
      // come back into phase now and then without ever being a loop you can see.
      const sp = 0.05 + rnd(i) * 0.045;
      const x = w * 0.5 + Math.sin(t * sp + rnd(i + 5) * 6.28) * (w * 0.3);
      c.globalAlpha = 0.1 + rnd(i + 21) * 0.14;
      c.beginPath();
      c.moveTo(x - len / 2, y);
      c.lineTo(x + len / 2, y);
      c.stroke();
    }
    c.globalAlpha = 1;
  },
};

/* --- drones ---------------------------------------------------------------
 *
 * Nam: "little dots operating like drones creating shapes in the background. I
 * love these drone shows and have never been to one, so this could be something
 * sentimental to talk about in the real interview too."
 *
 * Which is the best reason any of these seven had. It is also the one variant
 * where the ANIMATION is the subject rather than the decoration: the other six
 * are textures, and this is a performance with a running order.
 *
 * WHAT MAKES A DRONE SHOW READ AS ONE, and it is not the shapes:
 *
 *   1. THE TRANSIT IS HALF THE SHOW. Watching a thousand lights unmake a sphere
 *      and become a cube is the part people film. So the flight between
 *      formations gets a third of every cycle rather than being a cut.
 *
 *   2. THEY DO NOT LEAVE TOGETHER. A block of points moving in lockstep reads as
 *      one object being dragged. Real craft peel off in waves, so each one here
 *      gets its own start offset inside the transit window and its own arc.
 *
 *   3. DEPTH IS CARRIED BY BRIGHTNESS, NOT BY OCCLUSION. A light on the far side
 *      of a sphere is further away and dimmer, and that alone is enough to read
 *      as a sphere rather than as a disc. Which is lucky, because sorting three
 *      hundred points back to front every frame would be the most expensive
 *      thing on this screen and would buy almost nothing at this dot size.
 *
 *   4. A FLAT SHAPE SHOULD PROVE IT IS FLAT. The ring and the spiral turn a
 *      little rather than not at all, so they foreshorten. A show that opens on
 *      a ring and tilts it is telling you there is a third axis before it uses
 *      one.
 * -------------------------------------------------------------------------- */

type Vec = [number, number, number];

/**
 * Where a formation sits on the screen, and how big.
 *
 * Nam: "the drones dont only have to be making graphics in the center of the
 * screen. We have a lot of empty spaces here where it could make maybe a few
 * smaller stuff on the side too, not just always having to be dead centered."
 *
 * He is right and it matters more for the picture themes than for the geometry.
 * A sphere the height of the viewport surrounds the copy and reads fine through
 * it; a coffee cup at the same size sits BEHIND the words and reads as neither.
 * Small and off to one side is where a picture belongs, and the margins on this
 * page are enormous.
 *
 * `x` and `y` are fractions of the viewport HALF size, so a spot holds its
 * relation to the edges at any window shape. `s` scales the shape itself.
 *
 * More than one spot splits the fleet between them, which is the other half of
 * the answer: three stars scattered across the sky, a planet with a small moon,
 * two chat bubbles having a conversation.
 */
interface Spot { x: number; y: number; s: number }

const CENTRE: Spot[] = [{ x: 0, y: 0, s: 1 }];

interface Form {
  /**
   * 0 for a flat picture that stays face on, 1 for a solid that turns all the
   * way. It scales the tilt as well as the yaw, so a flat shape is not quietly
   * foreshortened by twenty degrees for its whole time on screen.
   */
  spin: number;
  at: (i: number, n: number) => Vec;
  /** Defaults to one spot, centred, full size. */
  spots?: Spot[];
}

const TAU = Math.PI * 2;

/* --- outlines ---------------------------------------------------------------
 *
 * The geometry formations are parametric: you can ask a sphere for its i-th of n
 * points and it answers with arithmetic. A rocket cannot do that, so the picture
 * themes are authored the way anybody would draw them -- as a handful of strokes
 * with coordinates -- and this turns a set of strokes into an even scatter of
 * drones along their total length.
 *
 * RESAMPLED ONCE, AT MODULE LOAD, rather than measured per frame. Walking the
 * cumulative arc length of twenty segments for every drone, twice per frame,
 * would be twenty thousand operations a frame to answer a question whose answer
 * never changes. Each outline becomes a fixed array of evenly spaced points and
 * `at` is then a single index.
 *
 * EVERY SHAPE HERE IS A GENERIC ARCHETYPE. Nam asked for film references, and
 * the honest version of that is a rocket, a ringed planet, a saucer, a sword and
 * a star rather than anybody's actual property. It is also the better drawing:
 * two hundred and sixty dots can carry a silhouette and cannot carry a likeness,
 * so a specific thing rendered at this resolution reads as a worse version of
 * the generic one it is made of.
 * -------------------------------------------------------------------------- */

type Pt = [number, number];
/** One continuous stroke. Closed shapes simply repeat their first point. */
type Path = Pt[];

/** How many points each outline is resampled to. Comfortably over the fleet. */
const TRACE = 340;

const arcPath = (
  cx: number, cy: number, r: number, a0: number, a1: number, steps = 26,
): Path => {
  const p: Path = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = a0 + ((a1 - a0) * i) / steps;
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return p;
};

const circlePath = (cx: number, cy: number, r: number, steps = 30): Path =>
  arcPath(cx, cy, r, 0, TAU, steps);

/** An ellipse, optionally leaned over. The planet's ring is the only user. */
const ovalPath = (
  cx: number, cy: number, rx: number, ry: number, lean = 0, steps = 34,
): Path => {
  const cl = Math.cos(lean);
  const sl = Math.sin(lean);
  const p: Path = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * TAU;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    p.push([cx + x * cl - y * sl, cy + x * sl + y * cl]);
  }
  return p;
};

const boxPath = (x0: number, y0: number, x1: number, y1: number): Path =>
  [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];

/**
 * Resample a set of strokes into TRACE evenly spaced points.
 *
 * Spacing is by TOTAL length across every stroke, not per stroke, which is what
 * keeps the density even: a rocket whose window is one thirtieth of its outline
 * gets one thirtieth of the fleet on the window rather than an equal share.
 */
const resample = (paths: Path[]): Vec[] => {
  const segs: { a: Pt; b: Pt; len: number }[] = [];
  let total = 0;
  for (const path of paths) {
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1]!;
      const b = path[i]!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len <= 0) continue;
      segs.push({ a, b, len });
      total += len;
    }
  }
  const pts: Vec[] = [];
  let seg = 0;
  let walked = 0;
  for (let i = 0; i < TRACE; i += 1) {
    const want = ((i + 0.5) / TRACE) * total;
    while (seg < segs.length - 1 && walked + segs[seg]!.len < want) {
      walked += segs[seg]!.len;
      seg += 1;
    }
    const s = segs[seg]!;
    const k = s.len > 0 ? clamp01((want - walked) / s.len) : 0;
    pts.push([s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k, 0]);
  }
  return pts;
};

/** A flat picture, from its strokes. */
const picture = (paths: Path[], spots?: Spot[]): Form => {
  const pts = resample(paths);
  return {
    spin: 0,
    spots: spots ?? CENTRE,
    at: (i, n) => pts[Math.min(pts.length - 1, Math.floor((i / n) * pts.length))]!,
  };
};

/** The eight corners of a unit cube, and the twelve edges that join them. */
const CUBE_EDGES: [Vec, Vec][] = (() => {
  const c: Vec[] = [];
  for (let i = 0; i < 8; i += 1) {
    // 0.58 and not 0.72, which is where this started. A cube's half diagonal is
    // its half side times root three, so at 0.72 it reached 1.25 against the
    // sphere's 0.92 -- a third larger than every other formation, and with the
    // perspective on top of that the near face ran off both sides of a 1440 by 900
    // window. It read as three unrelated arcs. Sized by the diagonal it now fills
    // the same volume as the rest of the running order.
    c.push([(i & 1 ? 1 : -1) * 0.58, (i & 2 ? 1 : -1) * 0.58, (i & 4 ? 1 : -1) * 0.58]);
  }
  const e: [Vec, Vec][] = [];
  for (let i = 0; i < 8; i += 1) {
    for (const bit of [1, 2, 4]) {
      // Each edge once: only walk from the corner that has the bit clear.
      if (!(i & bit)) e.push([c[i]!, c[i ^ bit]!]);
    }
  }
  return e;
})();

/**
 * GEOMETRY: the running order. Flat, solid, flat again -- a show needs to
 * breathe, and five three-dimensional shapes in a row stop being impressive
 * around the third.
 */
const GEOMETRY: Form[] = [
  // Ring. The opener, because it is the shape a crowd recognises before it has
  // worked out what it is looking at.
  {
    spin: 0.22,
    at: (i, n) => {
      const a = (i / n) * TAU;
      return [Math.cos(a) * 0.92, Math.sin(a) * 0.92, 0];
    },
  },
  // Sphere, by the Fibonacci lattice. Even spacing without clumps at the poles,
  // which is what every other way of putting n points on a sphere gets wrong.
  {
    spin: 1,
    at: (i, n) => {
      const y = 1 - (2 * (i + 0.5)) / n;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const a = i * 2.39996323;
      return [Math.cos(a) * r * 0.92, y * 0.92, Math.sin(a) * r * 0.92];
    },
  },
  // Torus. The one that cannot be mistaken for a flat shape the moment it turns,
  // because the hole goes from a circle to a slot and back.
  {
    spin: 1,
    at: (i, n) => {
      const M = 13;
      const a = ((i % M) / M) * TAU;
      const b = (Math.floor(i / M) / Math.ceil(n / M)) * TAU;
      const rr = 0.66 + 0.28 * Math.cos(a);
      return [rr * Math.cos(b), 0.28 * Math.sin(a), rr * Math.sin(b)];
    },
  },
  // Double helix. Two strands half a turn apart.
  {
    spin: 1,
    at: (i, n) => {
      const strand = i % 2;
      const k = Math.floor(i / 2) / Math.max(1, Math.floor(n / 2) - 1);
      const a = k * TAU * 2.1 + strand * Math.PI;
      return [Math.cos(a) * 0.52, -0.96 + k * 1.92, Math.sin(a) * 0.52];
    },
  },
  // Cube, as twelve edges. Nothing shows a rotation like a straight line that is
  // supposed to be parallel to another one.
  {
    spin: 1,
    at: (i, n) => {
      const per = Math.max(1, Math.floor(n / 12));
      const e = CUBE_EDGES[i % 12]!;
      const k = (Math.floor(i / 12) % per) / per;
      return [
        e[0][0] + (e[1][0] - e[0][0]) * k,
        e[0][1] + (e[1][1] - e[0][1]) * k,
        e[0][2] + (e[1][2] - e[0][2]) * k,
      ];
    },
  },
  // A sheet with a swell in it. Flat shapes read as drawings; this one reads as
  // a surface, which is a different trick and worth having in the set.
  {
    spin: 1,
    at: (i, n) => {
      const COLS = 22;
      const rows = Math.max(1, Math.ceil(n / COLS) - 1);
      const u = ((i % COLS) / (COLS - 1)) * 2 - 1;
      const v = (Math.floor(i / COLS) / rows) * 2 - 1;
      return [u * 1.05, Math.sin(u * 2.6 + v * 1.7) * 0.3, v * 0.8];
    },
  },
  // Spiral. The closer, and flat again, so the cycle lands where it started.
  {
    spin: 0.3,
    at: (i, n) => {
      const k = i / n;
      const a = k * TAU * 3.6;
      return [Math.cos(a) * k * 1.0, Math.sin(a) * k * 1.0, 0];
    },
  },
];

/* --- the picture themes ----------------------------------------------------
 *
 * Nam: "some shapes are not very exciting and we dont have many 2D images. I
 * want more fun images ... We should have a theme."
 *
 * So the show has a programme, and the programme can be swapped. Geometry is the
 * one that was here already and stays the default: it is the one that says
 * nothing about him and everything about the craft, which is the right note for
 * a title card. The other four are the ones worth a smile, and one of them is
 * quietly about the CV itself.
 *
 * PLACEMENT IS PART OF THE DRAWING, and the numbers below are measured rather
 * than felt. The copy column is 560px and centred, so at 1440 the free margins
 * are the outer 440px on each side: a side spot needs |x| at or past 0.56 of the
 * half width and s at or under 0.5, or it reaches back under the words. The
 * first pass ignored that and it showed -- a sword ran vertically through the
 * whole card, and the seven-tile grid sat behind the name at nearly full size,
 * so neither the picture nor the type was legible.
 *
 * The exceptions are the ring-shaped ones: a doughnut and a play button FRAME the
 * copy rather than covering it, which is the same reason the geometry set opens
 * on a ring. Those stay centred and large.
 *
 * Every geometry formation is centred and
 * nearly viewport-sized, which works because a wireframe solid surrounds the
 * copy. A picture cannot do that -- put a coffee cup behind the name at that
 * size and you have neither a coffee cup nor a readable name -- so each one gets
 * a spot, or several, out in the margins where there is nothing but ground.
 * -------------------------------------------------------------------------- */

/** CINEMA. What a drone show is for, minus anybody's intellectual property. */
const CINEMA: Form[] = [
  // Rocket. Nose, body, two fins, a porthole and a flame.
  picture(
    [
      [[0, -1], [0.3, -0.34], [0.3, 0.46], [-0.3, 0.46], [-0.3, -0.34], [0, -1]],
      [[0.3, 0.08], [0.66, 0.66], [0.3, 0.58]],
      [[-0.3, 0.08], [-0.66, 0.66], [-0.3, 0.58]],
      circlePath(0, -0.18, 0.15, 18),
      [[-0.16, 0.46], [0, 0.98], [0.16, 0.46]],
    ],
    [{ x: 0.6, y: 0.02, s: 0.56 }],
  ),
  // A ringed planet, with a small moon keeping station off to one side. Two
  // spots, and the second one is the reason this formation is here: a fleet that
  // can be in two places at once is doing something a single shape cannot.
  picture(
    [circlePath(0, 0, 0.6, 34), ovalPath(0, 0, 1.05, 0.3, -0.32)],
    [{ x: -0.62, y: -0.16, s: 0.44 }, { x: 0.66, y: 0.34, s: 0.2 }],
  ),
  // Saucer. Hull, dome, and three beams going down.
  picture(
    [
      ovalPath(0, 0.16, 0.95, 0.24),
      arcPath(0, 0.16, 0.46, Math.PI, TAU, 20),
      [[-0.3, 0.3], [-0.5, 0.94]],
      [[0, 0.36], [0, 1.0]],
      [[0.3, 0.3], [0.5, 0.94]],
    ],
    [{ x: 0.58, y: -0.2, s: 0.5 }],
  ),
  // Three stars, scattered rather than stacked. The clearest use of the margins
  // in the whole set: one shape, three places, none of them the middle.
  picture(
    (() => {
      const p: Path = [];
      for (let i = 0; i <= 10; i += 1) {
        const a = -Math.PI / 2 + (i / 10) * TAU;
        const r = i % 2 === 0 ? 1 : 0.42;
        p.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return [p];
    })(),
    [
      { x: -0.66, y: -0.4, s: 0.26 },
      { x: 0.68, y: -0.2, s: 0.34 },
      { x: 0.4, y: 0.56, s: 0.2 },
    ],
  ),
  // Sword. Blade, guard, grip, pommel.
  picture(
    [
      [[0, -1], [0.09, -0.86], [0.09, 0.22], [-0.09, 0.22], [-0.09, -0.86], [0, -1]],
      boxPath(-0.42, 0.22, 0.42, 0.36),
      boxPath(-0.08, 0.36, 0.08, 0.8),
      circlePath(0, 0.88, 0.12, 16),
    ],
    [{ x: 0.6, y: 0, s: 0.6 }],
  ),
];

/** PLACES. Five silhouettes that survive being made of dots. */
const PLACES: Form[] = [
  // A tower with a curved skirt. Two legs, two platforms, an arch and a spire.
  picture(
    [
      [[-0.62, 1], [-0.4, 0.42], [-0.19, -0.24], [-0.06, -0.72], [-0.03, -1]],
      [[0.62, 1], [0.4, 0.42], [0.19, -0.24], [0.06, -0.72], [0.03, -1]],
      [[-0.44, 0.42], [0.44, 0.42]],
      [[-0.2, -0.24], [0.2, -0.24]],
      arcPath(0, 0.42, 0.5, Math.PI * 0.15, Math.PI * 0.85, 16),
    ],
    [{ x: 0.6, y: -0.02, s: 0.62 }],
  ),
  // Two pyramids and a sun, which is a skyline rather than an object.
  picture(
    [
      [[-0.92, 0.68], [0, -0.6], [0.92, 0.68], [-0.92, 0.68]],
      [[0, -0.6], [0.2, 0.68]],
      circlePath(0.52, -0.78, 0.2, 20),
    ],
    [{ x: -0.6, y: 0.22, s: 0.46 }, { x: 0.6, y: 0.3, s: 0.3 }],
  ),
  // A pagoda. Three roofs with the ends turned up, which is the whole tell.
  picture(
    [
      [[0, -1], [0, -0.72]],
      [[-0.5, -0.5], [-0.26, -0.68], [0.26, -0.68], [0.5, -0.5]],
      [[-0.72, -0.02], [-0.38, -0.22], [0.38, -0.22], [0.72, -0.02]],
      [[-0.94, 0.5], [-0.5, 0.28], [0.5, 0.28], [0.94, 0.5]],
      [[-0.26, -0.5], [-0.26, -0.22]],
      [[0.26, -0.5], [0.26, -0.22]],
      [[-0.38, -0.02], [-0.38, 0.28]],
      [[0.38, -0.02], [0.38, 0.28]],
      [[-0.5, 0.5], [-0.5, 0.92]],
      [[0.5, 0.5], [0.5, 0.92]],
      [[-0.6, 0.92], [0.6, 0.92]],
    ],
    [{ x: -0.6, y: 0.02, s: 0.48 }],
  ),
  // A range, laid wide across the bottom where there is nothing else.
  picture(
    [
      [[-1, 0.6], [-0.36, -0.5], [0.02, 0.14], [0.46, -0.72], [1, 0.6]],
      [[-0.52, -0.22], [-0.36, -0.5], [-0.2, -0.22]],
      [[0.32, -0.46], [0.46, -0.72], [0.6, -0.46]],
    ],
    [{ x: 0, y: 0.52, s: 1.1 }],
  ),
  // A boat, two sails, and a couple of waves under it.
  picture(
    [
      [[-0.8, 0.44], [0.8, 0.44], [0.54, 0.78], [-0.54, 0.78], [-0.8, 0.44]],
      [[0, -0.92], [0, 0.44]],
      [[0.06, -0.86], [0.7, 0.34], [0.06, 0.34], [0.06, -0.86]],
      [[-0.06, -0.6], [-0.56, 0.34], [-0.06, 0.34], [-0.06, -0.6]],
      arcPath(-0.5, 0.86, 0.3, Math.PI, TAU, 10),
      arcPath(0.5, 0.86, 0.3, Math.PI, TAU, 10),
    ],
    [{ x: 0.58, y: 0.26, s: 0.5 }],
  ),
];

/** FOOD. The theme that needed no justification. */
const FOOD: Form[] = [
  // A cup, a handle, a saucer and two curls of steam.
  picture(
    [
      [[-0.5, -0.2], [0.42, -0.2], [0.3, 0.56], [-0.38, 0.56], [-0.5, -0.2]],
      arcPath(0.42, 0.06, 0.26, -1.25, 1.25, 14),
      [[-0.72, 0.72], [0.64, 0.72]],
      [[-0.24, -0.36], [-0.1, -0.56], [-0.24, -0.76], [-0.1, -0.96]],
      [[0.1, -0.36], [0.24, -0.56], [0.1, -0.76], [0.24, -0.96]],
    ],
    [{ x: -0.62, y: 0.04, s: 0.44 }],
  ),
  // A cone and three scoops. Overlapping circles read as scoops; one big circle
  // reads as a balloon on a stick.
  picture(
    [
      [[-0.42, 0.02], [0.42, 0.02], [0, 0.96], [-0.42, 0.02]],
      circlePath(-0.26, -0.14, 0.3, 20),
      circlePath(0.26, -0.14, 0.3, 20),
      circlePath(0, -0.52, 0.32, 22),
    ],
    [{ x: 0.62, y: -0.06, s: 0.46 }],
  ),
  // A doughnut, which is the torus with the pretension taken out. Centred,
  // because a ring is the one picture that frames the copy instead of fighting
  // it -- the same reason the geometry set opens on one.
  picture(
    [
      circlePath(0, 0, 0.86, 40),
      circlePath(0, 0, 0.34, 22),
      [[-0.62, -0.34], [-0.48, -0.44]],
      [[0.1, -0.66], [0.24, -0.6]],
      [[0.56, -0.1], [0.68, -0.2]],
      [[0.3, 0.56], [0.42, 0.48]],
      [[-0.4, 0.5], [-0.3, 0.6]],
    ],
    [{ x: 0, y: 0, s: 0.82 }],
  ),
  // A slice, a crust and three pepperoni.
  picture(
    [
      [[0, -0.9], [-0.68, 0.66], [0.68, 0.66], [0, -0.9]],
      arcPath(0, -0.02, 0.94, Math.PI * 0.28, Math.PI * 0.72, 14),
      circlePath(-0.18, 0.08, 0.13, 14),
      circlePath(0.22, 0.24, 0.13, 14),
      circlePath(-0.06, 0.44, 0.13, 14),
    ],
    [{ x: 0.6, y: 0.2, s: 0.48 }],
  ),
  // A bowl, chopsticks and steam. The one with a bit of home in it.
  picture(
    [
      arcPath(0, -0.12, 0.86, 0, Math.PI, 24),
      [[-0.86, -0.12], [0.86, -0.12]],
      [[-0.34, 0.74], [0.34, 0.74]],
      [[-0.62, -0.86], [0.3, -0.2]],
      [[-0.44, -0.94], [0.44, -0.26]],
      [[-0.14, -0.42], [-0.02, -0.6], [-0.14, -0.78]],
    ],
    [{ x: -0.6, y: 0.24, s: 0.5 }],
  ),
];

/**
 * THE CALL. The theme that is about the thing behind the door.
 *
 * The other three are for the pleasure of it. This one is the only theme whose
 * shapes are a promise: every picture in it is something the visitor is about to
 * meet on the far side of Start, and the cursor is the pointed one -- the hand
 * that drives the shared screen later shows up here first, as an ornament, with
 * nothing at stake.
 */
const THE_CALL: Form[] = [
  // The pointer, in the proportions of the Windows arrow the tour uses.
  picture(
    [[
      [-0.36, -0.92], [-0.36, 0.62], [0.02, 0.28], [0.26, 0.9],
      [0.5, 0.78], [0.28, 0.2], [0.72, 0.16], [-0.36, -0.92],
    ]],
    [{ x: 0.6, y: 0.14, s: 0.44 }],
  ),
  // Play. A triangle in a ring, which is the only universal glyph there is.
  picture(
    [
      circlePath(0, 0, 0.9, 42),
      [[-0.24, -0.42], [0.48, 0], [-0.24, 0.42], [-0.24, -0.42]],
    ],
    [{ x: 0, y: 0, s: 0.84 }],
  ),
  // Two bubbles, which is a conversation rather than a message. The second spot
  // is smaller and lower, the way a reply sits under what it answers.
  picture(
    [
      [
        [-0.8, -0.62], [0.8, -0.62], [0.8, 0.34], [0.16, 0.34],
        [0.04, 0.86], [-0.14, 0.34], [-0.8, 0.34], [-0.8, -0.62],
      ],
      [[-0.5, -0.28], [0.5, -0.28]],
      [[-0.5, 0.02], [0.22, 0.02]],
    ],
    [{ x: -0.62, y: -0.14, s: 0.42 }, { x: 0.6, y: 0.3, s: 0.3 }],
  ),
  // Signal. Three arcs and a dot, and the one shape in the set that is also a
  // joke -- there is a panel behind Start that takes this away on purpose.
  picture(
    [
      arcPath(0, 0.8, 0.42, Math.PI * 1.25, Math.PI * 1.75, 14),
      arcPath(0, 0.8, 0.7, Math.PI * 1.25, Math.PI * 1.75, 18),
      arcPath(0, 0.8, 0.98, Math.PI * 1.25, Math.PI * 1.75, 22),
      circlePath(0, 0.74, 0.1, 12),
    ],
    [{ x: 0.62, y: -0.3, s: 0.44 }],
  ),
  // The seven tiles of the call, which is where Start goes. It is the same grid
  // the Tiles variant resolves into, drawn by a different means -- and the only
  // formation in any theme that is a picture of the next screen.
  picture(
    (() => {
      const p: Path[] = [];
      for (let i = 0; i < 7; i += 1) {
        const col = i < 6 ? i % 3 : 1;
        const row = i < 6 ? Math.floor(i / 3) : 2;
        const x0 = -0.98 + col * 0.68;
        const y0 = -0.86 + row * 0.6;
        p.push(boxPath(x0, y0, x0 + 0.6, y0 + 0.5));
      }
      return p;
    })(),
    [{ x: -0.58, y: 0, s: 0.44 }],
  ),
];

interface Theme { id: string; label: string; forms: Form[] }

/** Geometry first, which makes it the default. */
const THEMES: Theme[] = [
  { id: 'geometry', label: 'Geometry', forms: GEOMETRY },
  { id: 'cinema', label: 'Cinema', forms: CINEMA },
  { id: 'places', label: 'Places', forms: PLACES },
  { id: 'food', label: 'Food', forms: FOOD },
  { id: 'call', label: 'The call', forms: THE_CALL },
];

/**
 * Which programme the show is running.
 *
 * Module scope, which is the one piece of state in this file that is not a pure
 * function of time, and it is deliberate: it is a SELECTION, in the same family
 * as which variant is playing, and threading it through the Art interface would
 * mean every other animation carrying a parameter that only one of them has ever
 * needed. Set from the theme row and from storage, read by the one draw below.
 */
let programme = THEMES[0]!;

const DRONES = 264;
const SHOW = 8.6;
/** How much of each formation's slot is spent holding it rather than flying. */
const HELD = 0.64;

const drones: Art = {
  id: 'drones',
  label: 'Drones',
  /*
   * The torus, held and turned. Mid-transit was the first choice -- the traffic
   * between two shapes is the best thing this variant does -- and it is the wrong
   * still, because a transit sampled at one instant is a formless cloud. A frozen
   * frame has to be a FORMATION, and the torus is the one that cannot be mistaken
   * for something flat even without the rotation to prove it.
   */
  still: 20.5,
  draw: (c, w, hh, t, _p, pal) => {
    const set = programme.forms;
    const idx = Math.floor(t / SHOW);
    const ph = (t % SHOW) / SHOW;
    const A = set[idx % set.length]!;
    const B = set[(idx + 1) % set.length]!;
    const tr = ph <= HELD ? 0 : (ph - HELD) / (1 - HELD);

    /*
     * NARROW SCREENS BRING EVERYTHING BACK TO THE MIDDLE. The spots put pictures
     * out in the margins, and on a phone there are no margins -- the copy is the
     * full width, so a spot at 0.6 of the half width is behind the words rather
     * than beside them. One centred formation at full resolution is the better
     * answer there, and it is one line rather than a second set of coordinates.
     */
    const wide = w >= 720;
    const sa = wide ? (A.spots ?? CENTRE) : CENTRE;
    const sb = wide ? (B.spots ?? CENTRE) : CENTRE;

    const yaw = t * 0.34;
    // A fixed lean, plus a very slow nod. Straight-on is the one angle at which
    // a torus and a ring look the same.
    const tilt = 0.34 + Math.sin(t * 0.11) * 0.1;
    /*
     * A slow rock that everything gets, including the flat pictures whose spin is
     * zero. Without it a picture theme is a slide show: the shapes are already
     * still while they are held, and a dead-still still is a JPEG. Nine hundredths
     * of a radian is about five degrees, which is a fleet holding station rather
     * than a shape being animated.
     */
    const sway = Math.sin(t * 0.23) * 0.09;
    const scale = Math.min(w, hh) * 0.5;
    const cx = w / 2;
    const cy = hh / 2;
    /*
     * Perspective, and gently. At 3.2 the near points came out 1.9 times the size
     * of the far ones, which is a wide-angle lens: it sells the depth and it
     * throws the near face of anything with corners off the edge of the screen.
     * 3.8 is a longer lens. The rotation is doing most of the work of saying this
     * is three dimensional anyway, and it does not distort to do it.
     */
    const FOV = 3.8;

    for (let i = 0; i < DRONES; i += 1) {
      /*
       * Its own moment to leave and its own time in the air. Without this the
       * whole fleet moves as one body, which is the single tell that separates a
       * drone show from a shape being tweened.
       */
      const off = rnd(i * 3 + 1) * 0.45;
      const u = tr <= off ? 0 : clamp01((tr - off) / (1 - off));
      // Smoothstep: it leaves gently and arrives gently, which is what something
      // with mass and a flight controller does.
      const k = u * u * (3 - 2 * u);

      /*
       * WHICH COPY OF THE SHAPE THIS ONE BELONGS TO. A formation with three spots
       * is three stars, so the fleet is dealt round-robin between them and each
       * gets a third of the drones and a full-resolution shape of its own.
       *
       * Dealt by remainder rather than by block, so a formation that goes from
       * one spot to three does not send its first ninety drones to the left star
       * and its last ninety to the right: they interleave, and the split looks
       * like a fleet dividing rather than like three groups that were always
       * separate.
       */
      const pa = sa[i % sa.length]!;
      const pb = sb[i % sb.length]!;
      const na = Math.ceil(DRONES / sa.length);
      const nb = Math.ceil(DRONES / sb.length);
      const a = A.at(Math.floor(i / sa.length), na);
      const b = B.at(Math.floor(i / sb.length), nb);
      /*
       * The arc. Real craft climb over each other on the way rather than sliding
       * along a chord, and the bow is what stops a transit reading as a crossfade
       * between two pictures.
       */
      const bow = Math.sin(k * Math.PI) * (rnd(i * 5 + 2) - 0.5) * 0.7;
      let x = a[0] + (b[0] - a[0]) * k + bow * 0.4;
      let y = a[1] + (b[1] - a[1]) * k + bow;
      let z = a[2] + (b[2] - a[2]) * k + bow * 0.4;

      // The turn, interpolated with everything else so a flat shape becoming a
      // solid one starts turning on the way rather than at the moment it lands.
      // The tilt rides the same number, so a picture at spin 0 stays face on
      // instead of being quietly squashed by twenty degrees for its whole slot.
      const turn = A.spin + (B.spin - A.spin) * k;
      const spin = yaw * turn + sway;
      const cs = Math.cos(spin);
      const sn = Math.sin(spin);
      const x1 = x * cs - z * sn;
      const z1 = x * sn + z * cs;
      const lean = tilt * turn;
      const ct = Math.cos(lean);
      const st = Math.sin(lean);
      const y1 = y * ct - z1 * st;
      const z2 = y * st + z1 * ct;
      x = x1;
      y = y1;
      z = z2;

      /*
       * The spot is applied in SCREEN space, after the projection, and the
       * shape's own size is applied before it. Offsetting in the scene instead
       * would push a picture through the perspective divide, so a cup parked out
       * to the right would shear as the fleet turned -- which is a lens effect,
       * not a formation moving.
       */
      const spotX = pa.x + (pb.x - pa.x) * k;
      const spotY = pa.y + (pb.y - pa.y) * k;
      const spotS = pa.s + (pb.s - pa.s) * k;
      const d = FOV / (FOV + z);
      const px = cx + spotX * (w / 2) + x * d * scale * spotS;
      const py = cy + spotY * (hh / 2) + y * d * scale * spotS;

      // Depth, and a slow unsynchronised flicker on top of it. The flicker is
      // small on purpose: a field of lights that all pulse together is a string
      // of fairy lights, and one that pulses fast is a hazard warning.
      const near = clamp01((d - 0.74) / 0.72);
      const tw = 0.8 + 0.2 * Math.sin(t * 1.6 + i * 1.31);
      c.globalAlpha = (0.13 + near * 0.52) * tw;
      // A handful in the accent, the way a real fleet carries a second colour.
      // Every eleventh, so they are scattered rather than banded.
      c.fillStyle = i % 11 === 3 ? pal.accent : pal.line;
      c.beginPath();
      c.arc(px, py, 0.9 + near * 1.3, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
    c.fillStyle = pal.line;
  },
};

/* Tiles first, which makes it the default -- Nam picked it. The rest stay
   reachable from the picker while the choice is provisional. */
const ARTS: Art[] = [tiles, measure, trace, signal, dust, aperture, staves, drones];

/* --- the canvas ----------------------------------------------------------- */

/**
 * Mount one animation on a canvas and keep it fed.
 *
 * Returns a teardown, and the teardown matters: this screen is left for good the
 * moment either button is pressed, and a requestAnimationFrame loop drawing into
 * a detached canvas is a leak nothing on the page would ever complain about.
 */
function paint(
  canvas: HTMLCanvasElement, art: Art, reduced: boolean, ptr: Ptr,
): () => void {
  const c = canvas.getContext('2d');
  if (!c) return () => { /* no 2d context, no animation, and no error either */ };

  let w = 0;
  let hh = 0;
  let raf = 0;
  let stopped = false;

  const frame = (t: number): void => {
    /*
     * NOTHING IS DRAWN AT A DEGENERATE SIZE, and this guard is the whole reason
     * Tiles looked broken on arrival while the other three looked fine.
     *
     * paint() runs while the canvas is still detached -- renderStart builds the
     * tree and main.ts appends it afterwards -- so clientWidth is 0 until the
     * ResizeObserver catches the attach. One or two frames run at 0 by 0 before
     * that, and at that size Tiles computes a negative tile width, which reaches
     * arcTo, which THROWS. The next frame is requested after the draw, so a throw
     * does not skip a frame, it ends the animation permanently. The default
     * variant was a black screen until you pressed its own button, which
     * restarted paint() against a canvas that by then had a size.
     *
     * Two lines, and it fixes the class rather than the instance: no variant now
     * has to be correct at zero.
     */
    if (w <= 0 || hh <= 0) return;
    c.clearRect(0, 0, w, hh);
    // Read off the element, so retuning the palette stays a CSS job. Once per
    // frame and handed down, rather than per point -- getComputedStyle is a
    // layout read and Drones would do it three hundred times.
    const cs = getComputedStyle(canvas);
    const pal: Pal = {
      line: cs.getPropertyValue('--st-line').trim() || '#ffffff',
      accent: cs.getPropertyValue('--st-accent').trim() || '#d8b46a',
    };
    c.strokeStyle = pal.line;
    c.fillStyle = pal.line;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    /*
     * The pointer is handed in dead under reduced motion. Dust is the one
     * variant that answers the mouse, and a field that jumps to a new dent every
     * time the hand moves is exactly the kind of continuous incidental movement
     * that setting asks to be spared. The still frame keeps the grain; it just
     * does not chase anybody.
     */
    art.draw(c, w, hh, t, reduced ? { x: 0, y: 0, on: false } : ptr, pal);
  };

  const size = (): void => {
    // Capped at two: past that the cost is real and nobody can see the
    // difference on a hairline.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    hh = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(hh * dpr));
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const loop = (ms: number): void => {
    if (stopped) return;
    frame(ms / 1000);
    raf = requestAnimationFrame(loop);
  };

  const ro = new ResizeObserver(() => {
    size();
    if (reduced) frame(art.still);
  });
  ro.observe(canvas);
  size();

  if (reduced) {
    /*
     * ONE FRAME, AND NOT A BLANK ONE. Reduced motion means less movement, not
     * less content -- the same rule the guided tour follows when it teleports
     * the hand rather than refusing to point. Each variant nominates the moment
     * that represents it, which for Tiles is the instant the grid resolves.
     */
    frame(art.still);
  } else {
    /*
     * No pause on visibilitychange, and that is not an oversight. A hidden tab
     * gets no rAF, so there are no frames to save; and since every variant is a
     * pure function of the rAF timestamp, coming back after two minutes away
     * lands two minutes into the cycle with nothing out of step. Holding a
     * paused clock would be more code and a worse result.
     */
    raf = requestAnimationFrame(loop);
  }

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}

/* --- the screen ----------------------------------------------------------- */

/**
 * The title card.
 *
 * ONE BUTTON, and it lands on the HOME SCREEN.
 *
 * It offered two for a version: a walkthrough lane and a look-around lane, which
 * would have promoted the director's `handedOver` state to a front door. Nam cut
 * it, and the reason is the better one: "we only expose them once we are in the
 * call, cause that is the only place its relevant." A choice about narration made
 * before you have seen anything to narrate is a choice made on no information,
 * and the control that actually answers it -- Stop talking, in the control bar --
 * is already there, in the room, at the moment the question becomes real.
 *
 * It went to the LOBBY for a version, on the reasoning that the green room is the
 * shortest path to the walkthrough the card just promised. Nam moved it, and the
 * move is right for the same reason the second lane was cut: the card is a door,
 * not a shortcut. Home is where the product actually begins -- the rail, the week
 * strip, the meeting card with Join on it -- and skipping it would mean the title
 * card quietly deciding, on the visitor behalf, which parts of the CV they get to
 * see. It also puts the fragment at #home the moment they arrive, which is what
 * makes a reload land where they were rather than back at the door.
 *
 * NOT A PRESS-ANYWHERE. Nam raised the misclick himself and answered it: a page
 * that starts on any click starts by accident, and starting by accident is the
 * exact failure this whole screen exists to remove. The press has to be aimed.
 */
export function renderStart(store: Store, reduced: boolean): HTMLElement {
  const canvas = h('canvas', { class: 'st-art', 'aria-hidden': 'true' }) as HTMLCanvasElement;

  let teardown = (): void => { /* replaced by the first show() below */ };

  /*
   * ONE POINTER RECORD, SHARED ACROSS VARIANT SWITCHES, so that changing the
   * animation does not lose where the hand is. Written by the listener at the
   * bottom of this function and read by Dust; every other variant ignores it.
   */
  const ptr: Ptr = { x: 0, y: 0, on: false };

  /*
   * TEMPORARY, and the ticket says so out loud. Nam is choosing between eight
   * animations at the real size on the real screen, which is the only way to
   * choose between animations. It comes out with the seven he does not pick.
   */
  const picker = h(
    'div',
    { class: 'st-pick', role: 'group', 'aria-label': 'Background, for choosing' },
  );

  const show = (art: Art): void => {
    teardown();
    teardown = paint(canvas, art, reduced, ptr);
    /*
     * The stylesheet needs to know which one is playing, for exactly one reason:
     * Drones is a SUBJECT and the other seven are textures. The scrim behind the
     * copy and the vignette at the edges were both tuned to push a texture out of
     * the way of the words, and applied to a formation they hide the formation --
     * the show is centred, the scrim is centred, and the sphere came out as four
     * dots in the corners.
     *
     * A data attribute rather than a class, so the selector reads as the
     * exception it is and so the dead-CSS checker is not looking for a class name
     * that only ever exists as a template string.
     */
    wrap.dataset['art'] = art.id;
    for (const b of picker.querySelectorAll<HTMLElement>('.st-pick-b')) {
      const on = b.dataset['art'] === art.id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    }
    // The programme row belongs to one variant, so it appears with it.
    themes.classList.toggle('is-on', art.id === 'drones');
  };

  for (const [i, a] of ARTS.entries()) {
    picker.appendChild(h(
      'button',
      {
        class: 'st-pick-b',
        type: 'button',
        'data-art': a.id,
        onclick: () => { saveVariant(a.id); show(a); },
      },
      h('span', { class: 'st-pick-n' }, String(i + 1)),
      a.label,
    ));
  }

  /*
   * THE SECOND ROW, and it only exists for Drones.
   *
   * Five programmes is thirteen entries if they go in the row above, which turns
   * a picker into a menu. A row of its own that appears with the variant it
   * belongs to says the relationship without a label: these are not more
   * animations, they are what THIS animation is showing.
   *
   * Temporary, like the row above it, and it goes at the same time.
   */
  const themes = h(
    'div',
    { class: 'st-themes', role: 'group', 'aria-label': 'Drone programme, for choosing' },
  );

  const runTheme = (th: Theme): void => {
    programme = th;
    for (const b of themes.querySelectorAll<HTMLElement>('.st-theme-b')) {
      const on = b.dataset['theme'] === th.id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };

  for (const th of THEMES) {
    themes.appendChild(h(
      'button',
      {
        class: 'st-theme-b',
        type: 'button',
        'data-theme': th.id,
        onclick: () => { saveTheme(th.id); runTheme(th); },
      },
      th.label,
    ));
  }
  runTheme(THEMES.find((th) => th.id === loadTheme()) ?? THEMES[0]!);

  const go = h(
    'button',
    {
      class: 'st-go',
      type: 'button',
      onclick: () => {
        teardown();
        store.dispatch({ t: 'screen', screen: 'home' });
      },
    },
    h('span', { class: 'st-go-t' }, 'Start'),
    /*
     * Measured rather than guessed: the 135 authored lines in data/tour.ts hold
     * the caption for 501.6 seconds between them, and the beats between lines are
     * on top of that. Ten is the honest rounding; eight was the flattering one.
     *
     * THREE WORDS, because the button is sized by its longest line and the first
     * version of this carried "and you can stop any time" as well. That made it
     * 355px wide, which is not a button any more, it is a bar -- and a full-width
     * control on a title card reads as a form field waiting to be filled in. The
     * stopping half moved up into the line of reassurances, which is the register
     * it belonged to anyway.
     */
    h('span', { class: 'st-go-s' }, 'About ten minutes'),
    /*
     * Nam's line, and it is doing more than being funny. "About ten minutes" is a
     * promise, and the honest thing to say about this build is that ten minutes
     * is the script and not the visit -- there are twelve bugs, seventeen quests,
     * five clips and a spec panel behind that number, and somebody who takes to it
     * will be here far longer.
     *
     * Set at the size of a real footnote, because a caveat that is louder than the
     * promise it qualifies stops being a caveat and starts being a warning.
     */
    h('span', { class: 'st-go-f' }, 'though you might spend an hour'),
  );

  const col = h(
    'main',
    { class: 'st-col', id: 'main' },
    h('p', { class: 'st-eyebrow' }, 'Interactive CV'),
    h('h1', { class: 'st-name' }, 'Nam Nguyen'),
    h(
      'p',
      { class: 'st-sub' },
      /*
       * Safe in the neutral build too, and worth being explicit about since
       * companies.ts exists to stop exactly this kind of line leaking. What that
       * module gates is the claim "I am applying to you, for this role" and
       * nothing else: the clone is the portfolio piece whoever is reading it, so
       * naming what was rebuilt is a statement about the artifact rather than
       * about the employer.
       */
      'A CV that opens as a video call, rebuilt from a measured spec of Google Meet.',
    ),
    h(
      'p',
      { class: 'st-calm' },
      /*
       * The things the fear is actually made of, in the order somebody worries
       * about them. Not "this is not a scam": naming the suspicion makes the
       * suspicion the topic, and denial is the native register of the thing it
       * denies. These are simply true, and checkable within one screen.
       *
       * The last one arrived when the second lane was cut. With no way to opt out
       * of being talked to at the door, the fact that ten minutes is not a
       * commitment stops being a nicety and becomes the thing somebody needs
       * before they press -- and it belongs here with the other reassurances
       * rather than crammed into the button.
       */
      /*
       * TWO LINES BY INTENT, not by wrapping. As one paragraph at a balanced
       * measure this set as three short lines that broke mid-phrase -- "nobody
       * else in the / room" -- which is the shape of text that ran out of room
       * rather than of text that was written. Two blocks means each sentence
       * owns its own line and wraps on its own terms when the screen is narrow.
       */
      h('span', {}, 'Nothing is recorded. No camera, no microphone, nobody else in the room.'),
      h('span', {}, 'You can stop it at any point.'),
    ),
    h('div', { class: 'st-acts' }, go),
    /*
     * ONE LINK, WHERE THERE WERE THREE.
     *
     * "Read it as a document" and "How this was built" are gone, and Nam is right
     * about both of them for reasons that are not really about clutter. They open
     * Meet-styled surfaces in light mode, so opening them from here would put the
     * Google surface in front of the visitor a screen early -- from the one screen
     * whose whole argument is that it is not that. Making them work would have
     * meant a dark variant of two large panels, which is a lot of stylesheet to
     * spend on undoing the point. And the spec panel is a receipt for a claim that
     * has not been made yet: it is the best door on the home screen precisely
     * because by then you have seen the thing it accounts for.
     *
     * THE DOWNLOAD STAYS, and it is the one of the three with an argument. It is
     * not a surface: it is an anchor with a download attribute, so it has no
     * theme, no panel and no close button to get wrong. And it is what the only
     * real tester of this CV actually reached for -- his first instinct, cold, was
     * to download the PDF. Taking that away from the screen where he did it, to
     * tidy up, would be tidying away the evidence.
     *
     * It sits under Start rather than beside it, and quietly, because it is the
     * exit and this is the entrance. See the note in ui/home.ts on N151, which is
     * the same argument in the other direction.
     */
    h(
      'p',
      { class: 'st-links' },
      h('a', { href: 'NamNguyen_CV_2026.pdf', download: true }, 'Or just download the PDF'),
    ),
  );

  const wrap = h('div', { class: 'start' }, canvas, col, picker, themes);

  show(ARTS.find((a) => a.id === loadVariant()) ?? ARTS[0]!);

  /*
   * The visitor's own hand, for Dust.
   *
   * On the wrapper rather than on the window, so it dies with the screen. Read
   * against the canvas box rather than the viewport because the canvas is inset
   * by nothing today and might not be tomorrow, and a repulsion field that is
   * offset from the cursor by the page padding is worse than no repulsion field.
   *
   * pointerleave rather than mouseleave, so a touch that ends also releases the
   * dent instead of leaving one parked where the finger lifted.
   */
  wrap.addEventListener('pointermove', (e) => {
    const box = canvas.getBoundingClientRect();
    ptr.x = (e as PointerEvent).clientX - box.left;
    ptr.y = (e as PointerEvent).clientY - box.top;
    ptr.on = true;
  });
  wrap.addEventListener('pointerleave', () => { ptr.on = false; });

  /*
   * The number keys, bound on the wrapper rather than on the window so they die
   * with the screen. main.ts already owns a global keydown handler, and a second
   * one that outlived its screen would eat digits typed into the meeting-code
   * field on the home screen.
   */
  wrap.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const i = Number(e.key) - 1;
    if (!Number.isInteger(i) || i < 0 || i >= ARTS.length) return;
    saveVariant(ARTS[i]!.id);
    show(ARTS[i]!);
  });
  wrap.tabIndex = -1;

  // Meet autofocuses Join now in the green room and this is the same beat: the
  // one thing on screen you came here to press.
  requestAnimationFrame(() => go.focus({ preventScroll: true }));

  return wrap;
}
