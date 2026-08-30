// The drone show -- board ticket N158, second pass.
//
// The first pass shipped eight background animations and Nam picked the drones,
// then took the result apart: "simple ass 2D images not even animating and no
// coloring ... I want the drones to have real 3D cordinates that map between
// images ... not hacking a shuffling animation then blending into the next
// shape." He is right on every count. tools/PLAN-drone-show.md is the written
// argument; this is what it turned into.
//
// THREE FAULTS IN THE FIRST PASS, and the one nobody notices first is the worst:
//
//   1. THE MAPPING WAS ARBITRARY. Drone i flew to point i of the next shape.
//      Point i of a sphere and point i of a cube have no relationship, so every
//      craft took a random long diagonal. The launch offsets, the bowed arcs and
//      the easing were all real -- they were decorating a scramble. Fixed below
//      by actually solving the assignment (see ASSIGNMENT).
//
//   2. 264 DRONES AGAINST FLAT OUTLINES. Every picture was a set of 2D strokes
//      resampled along its length: a wireframe drawing hung in space. The fleet
//      is 1400 now and every formation is a surfaced model with feature lines.
//
//   3. NOTHING MOVED WHILE A FORMATION WAS HELD. Sixty-four per cent of each
//      cycle was a still image with a five degree sway on it. Models now carry a
//      RIG -- the lotus breathes open and shut, the maypole's rings turn and its
//      ribbons wave -- and the rig keeps running through the transit, which is
//      what stops a handover reading as a crossfade.
//
// Nam's black and white is not a limitation once those are fixed. A real show
// reads by silhouette and brightness first; colour is a garnish and is used here
// as one.
//
// STILL A PURE FUNCTION OF TIME. Nothing accumulates between frames, which is
// what keeps reduced motion to a single line -- draw one representative frame and
// stop -- and what means a resize, a tab switch or a dropped frame cannot leave
// the show somewhere it can never get out of.

const TAU = Math.PI * 2;

/**
 * The fleet.
 *
 * A dial, not a decision. Nam is measuring against the record -- 22,580 craft,
 * EHang, Hefei, February 2026 -- and wants this number to grow. What stops it is
 * worth being precise about, because two of the three answers are wrong:
 *
 *   - NOT arithmetic. The rig and the projection are tens of flops per drone.
 *   - The RENDERER caps out around four to six thousand. Canvas 2D at 22,580
 *     arcs is path-building bound even batched, and the answer past that is not
 *     optimisation, it is WebGL point sprites.
 *   - ANGULAR DENSITY is the real one today. A centred lotus is about 700px
 *     across on a 1440 canvas, so 1400 points on its feature lines sit about six
 *     pixels apart. At 4000 they are three apart, which at a 2px dot is a solid
 *     line -- we would be drawing a filled shape and the thing that says drones
 *     would be gone.
 *
 * That last one is a statement about VIEWING DISTANCE, not about the count, and
 * it is why the camera rig in the plan matters more than the number does: the
 * record show reads at 22,580 because the camera is far away. Grow the fleet
 * after the camera can pull back, not before.
 */
export const FLEET = 1400;

/* --- pacing -----------------------------------------------------------------
 *
 * PER PROGRAMME, AND IT HAS TO BE. One number for both was wrong and Nam said why:
 * "because the geometry forms are more simple and without animation, the time
 * spent on each object is a bit long ... it takes less time to tell what this is,
 * so after that you are left just looking at it, waiting for the next shape."
 *
 * That is the rule, and it is a good one: CHANGE THE SHAPE WHEN THE SHAPE HAS
 * BEEN READ. A rotating wireframe announces itself in about two seconds and was
 * being held for ten, so eight of every fourteen seconds were spent waiting. A
 * lotus opening and closing is not finished being looked at in two seconds, and
 * it keeps its dwell.
 *
 * The hold FRACTION moves too, not just the total. Geometry now spends nearly as
 * long in transit as it does holding, which is the right split for a programme
 * whose subject is really the flying: the reason the geometry set is worth
 * keeping is that it is the benchmark for the transit, so give it more transit.
 * -------------------------------------------------------------------------- */

/**
 * Perspective, and gently. At 3.2 the near points come out nearly twice the size
 * of the far ones, which is a wide angle lens: it sells the depth and throws the
 * near face of anything with corners off the edge of the screen. The rotation is
 * doing most of the work of saying this is three dimensional anyway.
 */
const FOV = 3.8;

/**
 * Deterministic noise from an integer. The classic shader one-liner.
 *
 * Here because "pure function of time" and "different for every drone" both have
 * to be true at once: Math.random would make a frame depend on how many frames
 * came before it, which is the dependency this whole file avoids.
 */
const rnd = (n: number): number => {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Fraction of the way round, never negative.
 *
 * The rigs run on time since their shape assembled, and for the INCOMING shape
 * that is negative all the way through the handover. A plain remainder in
 * JavaScript keeps the sign, so a cycle read as -0.44 instead of 0.56 and any
 * rig built on one ran backwards through the transit and snapped at the landing.
 */
const wrap01 = (n: number): number => n - Math.floor(n);

/** The two colours, read off the element so retuning stays a CSS job. */
export interface Pal { line: string; accent: string }

/* --- models ----------------------------------------------------------------
 *
 * WHERE A MODEL COMES FROM is the question Nam asked first: "why start with a 2D
 * image if we can just scour the internet for 3D models or even generate 3D
 * models that are already animated?" The plan answers it properly and the short
 * version is that it does not matter to this file -- a downloaded mesh baked
 * offline and a model written as arithmetic produce the same three things, and
 * the runtime below cannot tell them apart:
 *
 *   nodes  -- a rest position, a part, a place along that part, a brightness
 *   parts  -- a hinge and an axis
 *   a rig  -- a function from time to one angle and one brightness per part
 *
 * So the source is a swappable input rather than an architectural decision, and
 * what ships today is arithmetic because that is what can be written without
 * picking a licence for somebody else's lotus. The bake tool that would make the
 * other route real is a phase of its own in the plan and changes nothing here.
 * -------------------------------------------------------------------------- */

/**
 * One rigged part of a model.
 *
 * A part is a hinge: a pivot, an axis, and whatever the rig says its angle is
 * this frame. That is deliberately the least expressive thing that covers every
 * motif on the list -- a petal opening, a ring turning, a wing beating, a leg
 * lifting -- because the alternative is per node deformation, and per node
 * deformation is a skinning implementation.
 *
 * `wave` is the one escape hatch: a ribbon or a tassel does not hinge, it
 * ripples, so a part can also displace its nodes by a travelling sine keyed on
 * how far along the part each node sits. Zero for everything that hinges.
 */
interface Part {
  /** Hinge pivot. */
  hx: number; hy: number; hz: number;
  /** Hinge axis, unit. */
  ax: number; ay: number; az: number;
  /** Ripple amplitude at the free end. Zero for anything that only hinges. */
  wave: number;
  /** Which way the ripple pushes, unit. A wing flexes up, a ribbon sideways. */
  wx: number; wy: number; wz: number;
  /** Cycles of ripple across the part, and how fast they travel along it. */
  wfreq: number; wrate: number;
  /**
   * Ripple amplitude at the ROOT, as a fraction of the amplitude at the tip.
   *
   * Zero for anything tied down at one end -- a ribbon, a tassel, a feather --
   * where the whole point is that the fixed end does not move. One for a free
   * surface like the sheet, where a wave crossing it has the same height
   * everywhere and tapering it to nothing at one edge would look like a fault.
   */
  wbase: number;
  /** Offset into both, so parts do not move in lockstep. */
  phase: number;
}

/**
 * Build a part. Everything but the pivot and the axis has a sane default, which
 * keeps the common case -- a petal on a hinge -- to two lines.
 */
function part(
  hx: number, hy: number, hz: number,
  ax: number, ay: number, az: number,
  o: Partial<Pick<Part, 'wave' | 'wx' | 'wy' | 'wz' | 'wfreq' | 'wrate' | 'wbase' | 'phase'>> = {},
): Part {
  return {
    hx, hy, hz, ax, ay, az,
    wave: o.wave ?? 0,
    wx: o.wx ?? 1, wy: o.wy ?? 0, wz: o.wz ?? 0.7,
    wfreq: o.wfreq ?? 1.6, wrate: o.wrate ?? 0.42,
    wbase: o.wbase ?? 0,
    phase: o.phase ?? 0,
  };
}

/**
 * What a rig writes, one per part.
 *
 * `a` is the hinge angle and `b` a brightness multiplier. The three offsets are
 * a plain translation, added after the hinge, and they exist because half the
 * motifs do not hinge at all: a sky lantern drifts, a balloon rises and settles,
 * a hull heaves on a swell. Rotating those about a pivot far enough away to fake
 * a translation works and is a lie the next person would have to decode.
 */
interface Pose { a: number; b: number; ox: number; oy: number; oz: number }

/* --- placement --------------------------------------------------------------
 *
 * Nam, on the first pass of the motifs: "way too beautiful to be centered and
 * behind the text - they are probably better pushed on a side so we get an
 * unobstructed view of them."
 *
 * He is right, and it is the same argument the deleted picture themes made in the
 * other direction. A wireframe sphere the height of the viewport SURROUNDS the
 * copy and reads fine through it, which is why the geometry set stays centred. A
 * lotus does not surround anything: it sits behind the name, and then neither the
 * flower nor the name is what it should be.
 *
 * A SIDE, NOT A FRACTION OF THE WIDTH, and the first version of this got it
 * wrong by using a fraction. The copy column is a FIXED 560px at every size, so
 * the margin beside it is not a constant share of the screen: it is 440px at
 * 1440, 1000px at 2560 and NOTHING at 1280. A spot at 0.7 of the half width
 * clears the column at 1440 and sits squarely behind the name at 1280, which is a
 * common laptop and would have shipped broken.
 *
 * So a model names a SIDE and the draw does the arithmetic against the real
 * viewport: it centres the model in whatever margin actually exists, and shrinks
 * it if that margin is smaller than the model wants. Below about 210px of margin
 * there is no margin worth using and everything comes back to the middle, which
 * is the honest answer on a phone.
 *
 * IN SCREEN SPACE, AFTER THE PROJECTION, which is the OPEN Q1 the plan left open
 * and this answers for now. Offsetting in world space instead is physically
 * truer -- an off axis subject really does show its side -- but it also makes the
 * model ORBIT the centre of the screen as the shared yaw turns, because the
 * rotation is about the origin. Fixing that means rotating about each model's own
 * centre, which breaks the isometry the assignment depends on. Screen space costs
 * a little honesty about the lens and keeps everything else.
 */
interface Spot {
  /** -1 left margin, 1 right margin, 0 dead centre. */
  side: number;
  /** Fraction of the viewport half height, for nudging up or down. */
  y: number;
  /** Scale, as a fraction of the drawing scale. Capped by the margin. */
  s: number;
}

/** Centred and full size. What the geometry set uses and the default. */
const MIDDLE: Spot = { side: 0, y: 0, s: 1 };

/**
 * Where the copy is, in canvas pixels. MEASURED, not assumed.
 *
 * This used to be a constant 280, being half of the column's max-width in the
 * stylesheet, and that was a second source of truth for a number the browser
 * already knows. It also could not survive what N183 does next: the column SLIDES
 * to the right when the motifs are playing, so its edges are not symmetric about
 * the centre any more and no constant describes them.
 *
 * paint() reads the element's real box and hands it down. The show then fits a
 * model into whatever space is actually free, which means the stylesheet can move
 * the copy wherever it likes and this file simply agrees.
 */
export interface Copy { left: number; right: number }

/** Below this much free space there is nothing worth putting a model in. */
const MIN_MARGIN = 210;

/*
 * The assignment works in model units, and a spot is a screen offset, so the cost
 * needs a nominal viewport to convert against. Half the width over the drawing
 * scale is 1.6 at 1440 by 900 and half the height over it is 1.0. It only has to
 * be representative -- it decides which craft goes where, not where anything is
 * drawn.
 */
const NOM_SIDE = 1.11;
const NOM_H = 1.0;

/** An accumulator, so authoring a model reads like drawing one. */
class Cloud {
  readonly x: number[] = [];
  readonly y: number[] = [];
  readonly z: number[] = [];
  readonly p: number[] = [];
  readonly u: number[] = [];
  readonly g: number[] = [];

  /**
   * @param p  part index, or -1 for a node that does not move with a hinge
   * @param u  0 to 1 along the part. Drives the ripple and the light sweep.
   * @param g  base brightness. Feature lines carry more than surface fill.
   */
  add(x: number, y: number, z: number, p: number, u: number, g: number): void {
    this.x.push(x); this.y.push(y); this.z.push(z);
    this.p.push(p); this.u.push(u); this.g.push(g);
  }
}

/* --- how a shape turns -------------------------------------------------------
 *
 * Nam, after watching the geometry set: "if a shape is 2D, regular rotation is
 * enough, but I want the shape to somewhat face the user, avoiding the 2D plane
 * kinda showing the cut to the user, it looks very weird. Then for a 3D shape, I
 * want to add more rotation, usually a different axis."
 *
 * THE 2D PROBLEM IS THE SHARPER ONE AND IT WAS A REAL FAULT. The ring and the
 * spiral are built in the XY plane, and the primary rotation is a yaw about Y --
 * which is the one axis that turns that plane EDGE ON. A quarter turn in and a
 * disc of 1080 craft is a line. He caught it in a screenshot.
 *
 * So a flat shape does not yaw at all. It ROLLS, in the screen plane, which is
 * fully visible from the front and is what "regular rotation is enough" actually
 * means for something flat; and it gets a small yaw SWING rather than a yaw, so
 * it breathes a little in depth without ever turning its edge to the viewer.
 *
 * A SOLID GETS A SECOND AXIS, and Nam was specific about the register: "the
 * secondary rotation axis is a lot more subtle than the primary, like just a
 * slight and gradual tilt so user knows this rotation is not just in one axis."
 * So the secondaries are oscillations rather than spins -- bounded, slow, and
 * never competing with the yaw for what the shape is doing.
 *
 * WHY THE SECONDARIES OSCILLATE AND THE PRIMARIES ACCUMULATE, which is not an
 * aesthetic choice. An accumulating angle has to be integrated from the start of
 * time to stay continuous across a handover, and that integral has to be
 * computable in closed form because this file is a pure function of time. A
 * bounded sinusoid needs no integral at all -- which is what lets the secondary
 * be re-drawn at random every lap for rewatchability, while the primary keeps one
 * rate per shape and stays continuous.
 *
 * ALL OF IT IS SHARED BETWEEN THE TWO FORMATIONS DURING A HANDOVER. Every angle
 * below is crossfaded from the outgoing shape's recipe to the incoming one and
 * then applied, as one rotation, to both sets of points. That is not tidiness:
 * a common rotation is an isometry, so it moves every craft without changing any
 * distance between two of them, and the assignment stays exactly as good. Give
 * the two shapes independent angles and the pairing is solved for a pose the show
 * is never in.
 * -------------------------------------------------------------------------- */

interface Turn {
  /**
   * The angle this shape is ALWAYS assembled at. Its neutral.
   *
   * Nearly always zero, meaning the orientation it was authored in. The cube is
   * the exception: square on it shows one face and reads as a square, and a
   * sixth of a turn shows three and reads as a cube.
   */
  yaw0: number;
  roll0: number;
  /**
   * How far the opening angle is allowed to be drawn from, either side of yaw0.
   *
   * Zero for everything except the two flat shapes, which Nam wants to look like
   * they were already turning before you got here. The primary rate then always
   * sweeps TOWARDS square on, so wherever the draw lands, the shape opens out of
   * its oval rather than closing further into one.
   */
  yaw0Vary: number;
  /** Primary, radians a second about the model vertical. Zero for a flat shape. */
  yaw: number;
  /** Primary for a flat shape: radians a second in the screen plane. */
  roll: number;
  /** Fixed lean about the screen horizontal, so nothing sits exactly square on. */
  lean: number;
  /** Secondary: how far the lean wanders either side of that, and how slowly. */
  tilt: number; tiltRate: number;
  /** Secondary: how far the yaw wanders. What a flat shape uses instead of yaw. */
  swing: number; swingRate: number;
  /** Secondary: how far the roll wanders. */
  bank: number; bankRate: number;
  /**
   * A scripted move on the slot's own phase, for the shapes that have one.
   * Returns extra lean, a dolly multiplier and extra yaw. `lap` is which time
   * round the running order this is, so a move can differ between viewings.
   */
  arc: ((ph: number, lap: number) => [number, number, number]) | null;
}

/* --- EVERY ROTATION RESTARTS WITH THE SHAPE ---------------------------------
 *
 * Nam, and it is the sharpest note yet: "all the rotation axis continue whenever
 * you reassemble a new shape, this creates for a very chaotic view where the
 * shapes become different every time they are assembled, like the consistency is
 * completely gone! Sometimes the shapes become completely off too!"
 *
 * He is right and the cause is exactly what he says. The primary yaw used to be
 * integrated from the start of TIME -- one continuous number for the whole show --
 * so the angle a shape happened to land at was whatever the clock had reached. A
 * cube assembled face on one lap and on a corner the next; the sheet occasionally
 * landed near enough edge on to be a diagonal line. Nothing about it was wrong,
 * and all of it was arbitrary, which is worse: a viewer cannot learn a show whose
 * shapes are never in the same place twice.
 *
 * SO EVERY ANGLE IS NOW A FUNCTION OF THE SLOT'S OWN PHASE, not of wall clock.
 * At the instant a shape lands, its yaw is its neutral, its lean is its base, its
 * roll is zero and every secondary is exactly zero -- because they are all sines
 * of a phase that starts at zero. Then they diverge, each on its own rate, with
 * the per-lap draw deciding which WAY they diverge rather than where they begin.
 *
 * Which is what he asked for and is a better description than the code: the same
 * opening pose every time, and a different flight out of it. Familiar and not
 * repetitive, rather than novel and incoherent.
 *
 * THE HANDOVER STILL HAS TO LAND IT. During a transit the shared angle eases from
 * where the outgoing shape has got to, to the incoming shape's neutral, so the new
 * formation arrives already square. It eases on a smoothstep rather than a
 * straight ramp, so the unwinding happens in the middle of the flight where the
 * fleet is a cloud and nothing coherent is turning backwards.
 * -------------------------------------------------------------------------- */

/**
 * Where a shape is pointing, a fraction of the way through its own slot.
 *
 * Returns yaw, lean, roll and the dolly. At ph = 0 this is the shape neutral,
 * every time, on every lap -- which is the whole point.
 */
function poseAt(
  m: Model, ph: number, cycle: number, shape: number, lap: number,
): [number, number, number, number] {
  const tn = m.turn;
  const v = varyOf(shape, lap);
  // Seconds since this shape assembled, which is what everything below runs on.
  const s = ph * cycle;
  // Drawn once a lap, and the rate then runs against it, so a shape that opens
  // from the left this time opens from the right the next.
  const off = tn.yaw0Vary * v.y0;
  const dir = tn.yaw0Vary !== 0 && v.y0 > 0 ? -1 : 1;
  let yaw = tn.yaw0 + off + tn.yaw * s * dir
    + tn.swing * v.sw * Math.sin(s * tn.swingRate * v.jit * TAU);
  let lean = tn.lean
    + tn.tilt * v.st * Math.sin(s * tn.tiltRate * v.jit * TAU);
  const roll = tn.roll0 + tn.roll * s
    + tn.bank * v.sb * Math.sin(s * tn.bankRate * v.jit * TAU);
  let zoom = 1;
  if (tn.arc) {
    const [dl, dz, dy] = tn.arc(ph, lap);
    lean += dl;
    zoom = dz;
    yaw += dy;
  }
  return [yaw, lean, roll, zoom];
}

interface Model {
  n: number;
  px: Float32Array; py: Float32Array; pz: Float32Array;
  pt: Int16Array; mu: Float32Array; mg: Float32Array;
  parts: Part[];
  turn: Turn;
  /** Cycles of the brightness sweep across the model's `u` range. */
  sweepFreq: number;
  /** How fast that sweep travels. Zero for no sweep. */
  sweepRate: number;
  /** Where on the screen this one sits, and how big. */
  spot: Spot;
  /** Largest distance from the origin in the drawing plane, for fitting. */
  rad: number;
  /**
   * A vertical offset that follows the rig, as a fraction of the drawing scale.
   *
   * For the one model whose SIZE changes as it animates. Nam, on the lotus: "when
   * the flower is in full bloom, it looks about right on the screen. But when the
   * flower is not at all bloom, it becomes very tall ... maybe this is where it
   * should sit lower on the screen, and as it blooms up, it can go higher."
   *
   * Which is right, and it is a real problem rather than a taste one: placement
   * fits a model by its REST radius, and a lotus with its petals shut is a good
   * deal taller than one in bloom. Nothing else here changes height enough to
   * care, so this stays optional.
   */
  lift: ((t: number) => number) | null;
  rig: ((t: number, poses: Pose[]) => void) | null;
}

interface Opts {
  /** Primary yaw. Zero for a flat shape, which rolls instead. */
  rate: number;
  /** The angle it is always assembled at. Defaults to the authored orientation. */
  yaw0?: number;
  roll0?: number;
  yaw0Vary?: number;
  lean: number;
  tilt?: number; tiltRate?: number;
  roll?: number;
  swing?: number; swingRate?: number;
  bank?: number; bankRate?: number;
  arc?: (ph: number, lap: number) => [number, number, number];
  sweepFreq?: number;
  sweepRate?: number;
  /** Defaults to centred and full size. */
  spot?: Spot;
  lift?: (t: number) => number;
  rig?: (t: number, poses: Pose[]) => void;
}

function bake(cl: Cloud, parts: Part[], o: Opts): Model {
  /*
   * A model authored past the fleet is TRUNCATED, and quietly, because there is
   * nowhere for a module-load error to go on a title card. The blossom hit this
   * during the build -- 1426 nodes against a fleet of 1400, so the last 26 simply
   * stopped existing, which showed up as one flower missing half its petals and
   * nothing else. .tmp/density.ts reports the count per model, and a model sitting
   * at exactly FLEET is the tell.
   */
  const n = Math.min(cl.x.length, FLEET);
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const pz = new Float32Array(n);
  const pt = new Int16Array(n);
  const mu = new Float32Array(n);
  const mg = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    px[i] = cl.x[i]!; py[i] = cl.y[i]!; pz[i] = cl.z[i]!;
    pt[i] = cl.p[i]!; mu[i] = cl.u[i]!; mg[i] = cl.g[i]!;
  }
  /*
   * EVERY MODEL CENTRES ITSELF, and this fixes a whole class of complaint rather
   * than one instance of it. Nam, twice: "some stuff sit quite high on the screen,
   * fix it: the lotus flower, the vasa ship."
   *
   * Both were authored around whatever origin was convenient while drawing them --
   * the lotus around its seed pod, which is well below the middle of the flower;
   * the ship around its waterline, with a mast reaching 1.24 above and a keel only
   * 0.54 below. So both hung high, and the fix each time would have been a hand
   * tuned nudge that is really a correction for a mistake in the model.
   *
   * Shifting every model so its bounding box is centred on the origin makes the
   * spot's y a genuine artistic nudge rather than a repair, and it makes the
   * fitting radius MINIMAL -- measured from the middle of the thing rather than
   * from a corner of it, so a model gets as large as its margin honestly allows.
   *
   * The hinges have to move with it or every rig would tear.
   */
  let lox = Infinity; let loy = Infinity; let loz = Infinity;
  let hix = -Infinity; let hiy = -Infinity; let hiz = -Infinity;
  for (let i = 0; i < n; i += 1) {
    if (px[i]! < lox) lox = px[i]!;
    if (px[i]! > hix) hix = px[i]!;
    if (py[i]! < loy) loy = py[i]!;
    if (py[i]! > hiy) hiy = py[i]!;
    if (pz[i]! < loz) loz = pz[i]!;
    if (pz[i]! > hiz) hiz = pz[i]!;
  }
  const cx0 = (lox + hix) / 2;
  const cy0 = (loy + hiy) / 2;
  const cz0 = (loz + hiz) / 2;
  for (let i = 0; i < n; i += 1) {
    px[i] -= cx0; py[i] -= cy0; pz[i] -= cz0;
  }
  for (const q of parts) {
    q.hx -= cx0; q.hy -= cy0; q.hz -= cz0;
  }

  let rad = 0.001;
  for (let i = 0; i < n; i += 1) {
    // Three dimensional on purpose: a model that fits its margin head on will not
    // fit it a quarter turn later, because depth becomes width. The tall ship
    // swings its bowsprit through 0.3 of a unit doing exactly that.
    const r = Math.hypot(px[i]!, py[i]!, pz[i]!);
    if (r > rad) rad = r;
  }
  return {
    n, px, py, pz, pt, mu, mg, parts, rad,
    turn: {
      yaw0: o.yaw0 ?? 0,
      roll0: o.roll0 ?? 0,
      yaw0Vary: o.yaw0Vary ?? 0,
      yaw: o.rate,
      roll: o.roll ?? 0,
      lean: o.lean,
      // The defaults are the motif register: a slight, slow nod that says the
      // rotation has more than one axis without drawing attention to itself.
      tilt: o.tilt ?? 0.09, tiltRate: o.tiltRate ?? 0.035,
      swing: o.swing ?? 0, swingRate: o.swingRate ?? 0.05,
      bank: o.bank ?? 0, bankRate: o.bankRate ?? 0.03,
      arc: o.arc ?? null,
    },
    sweepFreq: o.sweepFreq ?? 0,
    sweepRate: o.sweepRate ?? 0,
    spot: o.spot ?? MIDDLE,
    lift: o.lift ?? null,
    rig: o.rig ?? null,
  };
}

/* --- the standby field ------------------------------------------------------
 *
 * Nam: "not all drones need to be in use, but ideally there is a real constraint
 * in how many drones we use."
 *
 * So the constraint is made literal, and the trick that makes it cheap is to
 * give every drone a position in every formation. A model with 1316 nodes leaves
 * 84 craft over, and those 84 fly to a standby shell instead of being switched
 * off. The formation is then always exactly FLEET positions long, every
 * transition is the same problem, and "recruit the parked ones as the next shape
 * needs more" falls out of the assignment rather than needing code of its own.
 *
 * The shell sits at 1.75 to 2.4, which is outside the frame at the scale
 * everything else is drawn at. That is the point: recruits stream IN from off
 * screen rather than materialising out of nothing.
 *
 * MEASURED, A PARKED CRAFT IS EFFECTIVELY INVISIBLE, and that is worth writing
 * down because the first version of this comment claimed the opposite. Half the
 * shell is on the far side, where the depth shade takes it under the alpha floor;
 * the other half projects past the edge of the canvas and is culled. Across a
 * whole cycle at three viewport sizes, of the 350 craft the sparsest geometry
 * formation parks, about eleven are ever drawn.
 *
 * Which is a better answer than the faint halo that was intended, and it is being
 * kept rather than tuned back: the fleet constraint reads through the RECRUITMENT
 * -- craft arriving from beyond the frame and leaving the same way -- rather than
 * through a ring of dim dots parked in the margins of a very clean screen.
 * -------------------------------------------------------------------------- */

const PARK_G = 0.085;

const STANDBY = (() => {
  const a = new Float32Array(FLEET * 3);
  for (let i = 0; i < FLEET; i += 1) {
    // Fibonacci again, so the shell has no poles and no bands to notice.
    const y = 1 - (2 * (i + 0.5)) / FLEET;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * 2.39996323;
    const rad = 1.75 + rnd(i * 7 + 3) * 0.65;
    a[i * 3] = Math.cos(th) * r * rad;
    a[i * 3 + 1] = y * rad * 0.86;
    a[i * 3 + 2] = Math.sin(th) * r * rad;
  }
  return a;
})();

/** A model plus its parked remainder: exactly FLEET positions, always. */
interface Formation {
  fx: Float32Array; fy: Float32Array; fz: Float32Array;
  /*
   * The same positions with the spot applied, in the nominal screen space of the
   * note above. The assignment reads THESE and the draw reads the ones above.
   *
   * Two copies rather than one, because the two need different things and the
   * plan called it: a small model in a left margin becoming a large centred one
   * has its real travel dominated by the move across, and costing that in model
   * space would price it at nothing. Baked once at build rather than computed in
   * the inner loop, which runs about twelve million times during refinement.
   */
  qx: Float32Array; qy: Float32Array; qz: Float32Array;
  fp: Int16Array; fu: Float32Array; fg: Float32Array;
  m: Model;
  poses: Pose[];
  /** Three by three per part, rebuilt once a frame rather than once a node. */
  mat: Float32Array;
}

function formation(m: Model): Formation {
  const fx = new Float32Array(FLEET);
  const fy = new Float32Array(FLEET);
  const fz = new Float32Array(FLEET);
  const qx = new Float32Array(FLEET);
  const qy = new Float32Array(FLEET);
  const qz = new Float32Array(FLEET);
  const fp = new Int16Array(FLEET);
  const fu = new Float32Array(FLEET);
  const fg = new Float32Array(FLEET);
  for (let i = 0; i < FLEET; i += 1) {
    if (i < m.n) {
      fx[i] = m.px[i]!; fy[i] = m.py[i]!; fz[i] = m.pz[i]!;
      fp[i] = m.pt[i]!; fu[i] = m.mu[i]!; fg[i] = m.mg[i]!;
    } else {
      const k = i - m.n;
      fx[i] = STANDBY[k * 3]!; fy[i] = STANDBY[k * 3 + 1]!; fz[i] = STANDBY[k * 3 + 2]!;
      fp[i] = -1; fu[i] = 0; fg[i] = PARK_G;
    }
    /*
     * The spot applies to the parked craft too, so a formation's spares hover
     * near the formation rather than around a centre nothing is at. It also keeps
     * the cost honest: a craft parked left and then parked right really does have
     * to make the trip.
     */
    const sp = m.spot;
    qx[i] = fx[i]! * sp.s + sp.side * NOM_SIDE;
    qy[i] = fy[i]! * sp.s + sp.y * NOM_H;
    qz[i] = fz[i]! * sp.s;
  }
  const poses: Pose[] = m.parts.map(() => ({ a: 0, b: 1, ox: 0, oy: 0, oz: 0 }));
  return { fx, fy, fz, qx, qy, qz, fp, fu, fg, m, poses, mat: new Float32Array(Math.max(1, m.parts.length) * 9) };
}

/* --- assignment -------------------------------------------------------------
 *
 * FAULT 1, and the fix that matters most. The question is which drone flies to
 * which point, and the shipped answer -- drone i to point i -- was noise.
 *
 * Formally: choose a permutation for each formation so that the total squared
 * distance each drone travels across the whole running order is small. Squared
 * rather than plain distance on purpose: it punishes one craft crossing the
 * entire frame far harder than several moving a short way, and a lone straggler
 * on a long diagonal is exactly the artefact that reads as fake.
 *
 * OPTIMAL IS OUT OF REACH. Hungarian is n cubed, which at 1400 is 2.7 billion.
 * The auction algorithm would do it but is a lot of code for a title card.
 *
 * SO: SEED, THEN REFINE.
 *
 * The seed is a Morton sort. Quantise every position to ten bits an axis over a
 * shared box, interleave the bits into one integer, sort. Points that are close
 * together in space end up close together in the ordering, so pairing two
 * formations by rank pairs neighbours with neighbours and the fleet flows rather
 * than scattering. It costs one sort per formation and nothing else, and because
 * every formation is sorted into the SAME space, no pairwise work is needed at
 * all.
 *
 * The refinement is 2-opt: pick two drones, swap their targets in one formation,
 * keep the swap if it shortened things. Two details make it work.
 *
 *   - THE PAIRS ARE NEIGHBOURS, NOT RANDOM. Two drones picked uniformly are
 *     almost never worth swapping, so uniform trials mostly do nothing. Picking
 *     the second one from within a short window of the first in Morton order
 *     means the candidates are spatially adjacent, which is where the improving
 *     swaps live. It is the difference between converging and burning a budget.
 *
 *   - THE COST IS EVALUATED AROUND THE CYCLE, NOT DOWN A CHAIN. The obvious
 *     version fixes the first formation, optimises the second against it, and so
 *     on -- which leaves the transition from the last back to the first with both
 *     ends already nailed down, so the show scrambles once per loop, at the seam.
 *     A swap inside one formation only affects the two transitions either side of
 *     it, so scoring every trial against BOTH of them closes the cycle and
 *     privileges no formation. It is barely more code and it removes a bug that
 *     would have been blamed on the easing.
 *
 * IT IS SLICED ACROSS FRAMES, and the reason it CAN be is worth writing down
 * because it is not obvious and it is what makes a large budget affordable.
 *
 * Measured, the refinement is worth about 33% off the mean transit at a budget of
 * 150 trials per drone per formation, against 30% at 24 and 35% at 400 -- so 150
 * is where the curve flattens. It also costs 103ms in one go, which is six
 * dropped frames on the first screen anybody sees.
 *
 * But drones are INTERCHANGEABLE. Swapping which two of them own two targets does
 * not move either target, so while a formation is being held the set of lit
 * positions is identical before and after any swap: all that changes is which
 * index owns which dot, which shows up as nothing but a reshuffled twinkle phase.
 * So the refinement can run in slices during the hold with nothing visible at all,
 * and the first hold is ten seconds long against a refinement that takes well
 * under one. The guard below stops it the moment a transit begins, which is the
 * only time a swap would actually be seen.
 *
 * The seed still runs on the first frame -- it is three sorts and a few
 * milliseconds -- and that is already after first paint, which matters on a
 * screen whose entire reason for existing is that it arrives before the bundle
 * does.
 * -------------------------------------------------------------------------- */

/** Spread ten bits so they can be interleaved three ways. */
const spread = (v: number): number => {
  let x = v & 0x3ff;
  x = (x | (x << 16)) & 0x030000ff;
  x = (x | (x << 8)) & 0x0300f00f;
  x = (x | (x << 4)) & 0x030c30c3;
  x = (x | (x << 2)) & 0x09249249;
  return x;
};

/** The shared box. Everything authored lives well inside it, standby included. */
const SPAN = 3.2;

const morton = (x: number, y: number, z: number): number => {
  const q = (v: number): number => {
    const k = Math.round(((v + SPAN) / (2 * SPAN)) * 1023);
    return k < 0 ? 0 : k > 1023 ? 1023 : k;
  };
  return spread(q(x)) | (spread(q(y)) << 1) | (spread(q(z)) << 2);
};

const gap = (a: Formation, i: number, b: Formation, j: number): number => {
  const dx = a.qx[i]! - b.qx[j]!;
  const dy = a.qy[i]! - b.qy[j]!;
  const dz = a.qz[i]! - b.qz[j]!;
  return dx * dx + dy * dy + dz * dz;
};

/** Trials per drone per formation. Measured; see the note above. */
const REFINE = 150;
/** Trials in one frame's slice. About four milliseconds' worth. */
const SLICE = 40000;

function seedSlots(forms: Formation[]): Int16Array[] {
  const slots: Int16Array[] = [];

  for (const f of forms) {
    const key = new Int32Array(FLEET);
    const order: number[] = [];
    for (let i = 0; i < FLEET; i += 1) {
      /*
       * PARKED POSITIONS SORT AFTER EVERY MODEL NODE, and that one bit is worth
       * more than the rest of the seed put together.
       *
       * Without it the standby shell is interleaved through the Morton order like
       * anything else, and since two formations park different NUMBERS of craft --
       * 87 for the lotus, 244 for the maypole -- the ranks slide out of step. A
       * drone at rank 600 would be a petal in one formation and a parked craft two
       * units out in the other, over and over down the whole ordering, and the
       * seed came out no better than pairing by index. Measured: 0.936 against
       * 0.942 for doing nothing at all.
       *
       * With the flag, rank 0 to min(nA, nB) is model to model in both, the tail
       * is standby to standby, and only the difference in the middle has to fly in
       * from the shell -- which is the trip that genuinely has to happen.
       */
      const park = i < f.m.n ? 0 : 0x40000000;
      key[i] = park + morton(f.qx[i]!, f.qy[i]!, f.qz[i]!);
      order.push(i);
    }
    order.sort((a, b) => key[a]! - key[b]!);
    slots.push(Int16Array.from(order));
  }

  return slots;
}

/**
 * Spend `trials` swap attempts on a programme's pairing. Returns what it spent.
 *
 * The generator state lives on the programme rather than in a closure so a slice
 * picks up where the last one stopped, and it is seeded rather than random so the
 * show assembles identically on every machine and every reload. A formation that
 * comes together differently each time cannot be tuned.
 */
function refine(p: Programme, trials: number): number {
  const forms = p.forms;
  const N = forms.length;
  const slots = p.slots;
  // One formation is a still life. There is nothing to fly between.
  if (!slots || N < 2) return trials;

  let seed = p.rng;
  const rand = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let k = 0; k < trials; k += 1) {
    const f = (rand() * N) | 0;
    const pv = (f + N - 1) % N;
    const nx = (f + 1) % N;
    const d1 = (rand() * FLEET) | 0;
    // The window is the whole trick. See the note above.
    const d2 = (d1 + 1 + ((rand() * 28) | 0)) % FLEET;
    if (d1 === d2) continue;

    const A = forms[pv]!;
    const B = forms[f]!;
    const C = forms[nx]!;
    const sp = slots[pv]!;
    const sf = slots[f]!;
    const sn = slots[nx]!;
    const s1 = sf[d1]!;
    const s2 = sf[d2]!;

    const before = gap(A, sp[d1]!, B, s1) + gap(B, s1, C, sn[d1]!)
      + gap(A, sp[d2]!, B, s2) + gap(B, s2, C, sn[d2]!);
    const after = gap(A, sp[d1]!, B, s2) + gap(B, s2, C, sn[d1]!)
      + gap(A, sp[d2]!, B, s1) + gap(B, s1, C, sn[d2]!);

    if (after < before) { sf[d1] = s2; sf[d2] = s1; }
  }

  p.rng = seed;
  return trials;
}

/* --- geometry ---------------------------------------------------------------
 *
 * Nam gave these a job: "the geometry becomes the benchmark for how well the
 * drone effect looks." That is a better reason than variety and it changes what
 * they are for. A sphere becoming a cube has a known correct answer -- even
 * spacing, short paths, nothing crossing the middle -- so if a transit looks
 * wrong here the ENGINE is wrong, and no amount of model quality will hide it.
 * They isolate the assignment from every question about authoring, which makes
 * them the first thing to look at and the last thing to remove.
 *
 * They are ENRICHED rather than copied across. The old set was drawn for 264
 * craft: a single ring at 1400 is a solid line, not a ring. Three concentric
 * rings at 1400 is a ring with substance, which is the same shape doing the same
 * job with the fleet it actually has.
 * -------------------------------------------------------------------------- */

const CUBE_EDGES: [number, number, number, number, number, number][] = (() => {
  const c: [number, number, number][] = [];
  for (let i = 0; i < 8; i += 1) {
    c.push([(i & 1 ? 1 : -1) * 0.58, (i & 2 ? 1 : -1) * 0.58, (i & 4 ? 1 : -1) * 0.58]);
  }
  const e: [number, number, number, number, number, number][] = [];
  for (let i = 0; i < 8; i += 1) {
    for (const bit of [1, 2, 4]) {
      // Each edge once: only walk out from the corner that has the bit clear.
      if (!(i & bit)) {
        const a = c[i]!;
        const b = c[i ^ bit]!;
        e.push([a[0], a[1], a[2], b[0], b[1], b[2]]);
      }
    }
  }
  return e;
})();

function geo(
  n: number,
  at: (i: number, n: number) => [number, number, number],
  o: Opts,
  parts: Part[] = [],
  uAt?: (i: number, n: number) => number,
): Model {
  const cl = new Cloud();
  for (let i = 0; i < n; i += 1) {
    const q = at(i, n);
    cl.add(q[0], q[1], q[2], parts.length ? 0 : -1, uAt ? uAt(i, n) : i / n, 1);
  }
  return bake(cl, parts, o);
}

const smooth = (k: number): number => {
  const c = clamp01(k);
  return c * c * (3 - 2 * c);
};

/* --- the torus move ----------------------------------------------------------
 *
 * Nam: "for the donut shape, can we also rotate vertically, such that we slowly
 * transition to the top view of the donut, then we zoom into the donut, which
 * then transition into the next shape ... we can add a probability for the
 * transition of going to the top view then into the donut hole - this may happen
 * only 50% of the time - the remaining time we do add the rotation to top view but
 * much less aggressive."
 *
 * So it is two moves and a coin, drawn once a lap. The bold one rolls the torus
 * all the way onto its back and then flies the camera at the hole; the quiet one
 * tips it most of the way and stops, which is enough to show that the hole is a
 * hole without spending the trick.
 *
 * IT FITS THE STANDARD SLOT, which Nam asked for and which is worth the effort:
 * "I dont want to dwell so much more time on that either, more like 10% max, or
 * even better if you find a way to make it the same time as the rest." The lean
 * ramps across the hold and the dolly peaks exactly as the fleet leaves, so the
 * flight through the hole IS the departure rather than something before it. The
 * crossfade into the next shape then pulls the camera back out on its own, and
 * the whole move costs no extra time at all.
 */
function torusArc(ph: number, lap: number): [number, number, number] {
  const bold = rnd(lap * 71 + 13) < 0.5;
  // Base lean on the torus is 0.45, so this much more puts it flat on its back.
  const target = bold ? Math.PI / 2 - 0.45 : 0.4;
  // Onto its back by half way, so there is time to see that it IS on its back
  // before anything else happens to it.
  const lean = smooth((ph - 0.06) / 0.4) * target;
  // And the dive is the last stretch of the hold, peaking at the exact instant
  // the fleet starts to leave, so the flight through the hole IS the departure.
  const zoom = bold ? 1 + smooth((ph - 0.4) / 0.22) * 1.35 : 1;
  return [lean, zoom, 0];
}

const GEOMETRY: Model[] = [
  // Ring, three deep. The opener, because it is the shape a crowd recognises
  // before it has worked out what it is looking at.
  geo(1080, (i, n) => {
    const band = i % 3;
    const k = Math.floor(i / 3) / Math.ceil(n / 3);
    const a = k * TAU;
    const r = 0.84 + band * 0.055;
    return [Math.cos(a) * r, Math.sin(a) * r, 0];
  }, {
    /*
     * IT TURNS ABOUT Y AFTER ALL, WITHIN A RANGE. N181 took the yaw away because
     * it is the axis that turns a flat shape edge on, and that was the right fix
     * for the wrong amount. Nam, seeing the result: "now they are rotating yet the
     * shape remains circular, while before their circular shape gets distorted
     * into an oval as they rotate ... I prefer the old rotation for these 2."
     *
     * He is right, and the distinction is between FORESHORTENING and COLLAPSE. A
     * ring seen at sixty degrees is an oval, and the oval is the whole reason to
     * turn it -- it is what says the thing is a disc in space and not a decal
     * painted on the screen. A ring seen at ninety is a line, and that is the
     * failure. The old version had no bound and eventually hit ninety; this one
     * is bounded well short of it.
     *
     * The opening angle is drawn from plus or minus 0.6 radians and the rate runs
     * against it, so the shape is always already an oval when it lands and always
     * opening out of one. Worst case is 0.6 plus 0.6 of travel, which is sixty
     * nine degrees: a third of the width, clearly a ring, never a line.
     */
    rate: 0.17, yaw0Vary: 0.85, roll: 0.06, lean: 0.2,
    tilt: 0.1, tiltRate: 0.05,
  }),

  // Sphere, by the Fibonacci lattice. Even spacing with no clumps at the poles,
  // which is what every other way of putting n points on a sphere gets wrong.
  geo(1400, (i, n) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * 2.39996323;
    return [Math.cos(a) * r * 0.94, y * 0.94, Math.sin(a) * r * 0.94];
  }, {
    // Nam: "rotate alternatively in 2 different axis, like first in one axis then
    // change direction to a different axis, still at the same pace." A constant
    // yaw under a large, slow tilt does exactly that without needing a schedule:
    // at the ends of the tilt swing its velocity is zero and the yaw is the whole
    // motion, and in the middle the tilt is the fastest thing happening. The
    // alternation falls out of the arithmetic.
    rate: 0.2, lean: 0.28,
    tilt: 0.46, tiltRate: 0.034,
    bank: 0.26, bankRate: 0.027,
  }),

  // Torus. The one that cannot be mistaken for something flat the moment it
  // turns, because the hole goes from a circle to a slot and back.
  geo(1400, (i, n) => {
    const M = 20;
    const a = ((i % M) / M) * TAU;
    const b = (Math.floor(i / M) / Math.ceil(n / M)) * TAU;
    const rr = 0.66 + 0.28 * Math.cos(a);
    return [rr * Math.cos(b), 0.28 * Math.sin(a), rr * Math.sin(b)];
  }, {
    rate: 0.24, lean: 0.45,
    tilt: 0.08, tiltRate: 0.04,
    arc: torusArc,
  }),

  // Double helix with rungs. The rungs are new: two bare strands left two thirds
  // of the fleet parked, and the ladder is what makes the twist readable anyway.
  geo(1100, (i, n) => {
    const m = i % 5;
    const k = Math.floor(i / 5) / Math.max(1, Math.ceil(n / 5) - 1);
    const a = k * TAU * 2.1;
    const y = -0.96 + k * 1.92;
    if (m < 2) {
      const aa = a + m * Math.PI;
      return [Math.cos(aa) * 0.5, y, Math.sin(aa) * 0.5];
    }
    const v = (m - 1) / 4;
    const x0 = Math.cos(a) * 0.5;
    const z0 = Math.sin(a) * 0.5;
    return [x0 + (-x0 - x0) * v, y, z0 + (-z0 - z0) * v];
  }, {
    // Nam: "please also rotate the verticle axis to the left or the right
    // randomly." That is the bank, and its sign is drawn once a lap -- so the
    // ladder leans one way this time round and the other way next, which is the
    // cheapest rewatchability in the set. Slow enough to read as a lean rather
    // than as a wobble.
    rate: 0.19, lean: 0.16,
    bank: 0.34, bankRate: 0.021,
    tilt: 0.1, tiltRate: 0.045,
  }),

  // Cube, as twelve edges. Nothing shows a rotation like a straight line that is
  // supposed to be parallel to another one.
  geo(1056, (i, n) => {
    const per = Math.max(2, Math.floor(n / 12));
    const e = CUBE_EDGES[i % 12]!;
    const k = (Math.floor(i / 12) % per) / (per - 1);
    return [e[0] + (e[3] - e[0]) * k, e[1] + (e[4] - e[1]) * k, e[2] + (e[5] - e[2]) * k];
  }, {
    // The one shape where a true tumble is legible, because a cube has parallel
    // edges and nothing gives a rotation away like two lines that are supposed to
    // stay parallel. So it gets a continuous roll on top of the yaw rather than an
    // oscillation: a real second axis, not a nod.
    rate: 0.22, roll: 0.055, lean: 0.34, yaw0: 0.62,
    tilt: 0.22, tiltRate: 0.055,
  }),

  // A sheet with a swell in it. Flat shapes read as drawings; this one reads as a
  // surface, which is a different trick and worth having in the set.
  geo(1400, (i, n) => {
    const COLS = 40;
    const rows = Math.max(1, Math.ceil(n / COLS) - 1);
    const u = ((i % COLS) / (COLS - 1)) * 2 - 1;
    const v = (Math.floor(i / COLS) / rows) * 2 - 1;
    // FLAT IN THE BAKE, and the swell is put back by the rig below. The shape
    // used to carry a frozen sine, which is why it read as a moulded surface
    // rather than a moving one. Nam: "can you animate the 3D model such that it
    // waves in 3D too, like a sin wave ish."
    return [u * 1.05, 0, v * 0.8];
  }, {
    rate: 0.17, lean: 0.64,
    tilt: 0.13, tiltRate: 0.04,
  }, [part(0, 0, 0, 0, 1, 0, {
    // The wave travels along the node's own u, which is set below to the same
    // combination of across and along that the frozen version used -- so the
    // swell is the shape it always was, now moving through the surface.
    wave: 0.3, wx: 0, wy: 1, wz: 0, wfreq: 1, wrate: 0.3, wbase: 1,
  })], (i, n) => {
    const COLS = 40;
    const rows = Math.max(1, Math.ceil(n / COLS) - 1);
    const u = ((i % COLS) / (COLS - 1)) * 2 - 1;
    const v = (Math.floor(i / COLS) / rows) * 2 - 1;
    return (u * 2.6 + v * 1.7) / TAU;
  }),

  // Spiral, three armed. The closer, and nearly flat, so the cycle lands where it
  // started.
  geo(1050, (i, n) => {
    const arm = i % 3;
    const k = Math.floor(i / 3) / Math.ceil(n / 3);
    const a = k * TAU * 2.4 + (arm * TAU) / 3;
    const r = k * 1.02;
    return [Math.cos(a) * r, Math.sin(a) * r, (k - 0.5) * 0.12];
  }, {
    // Same bounded yaw as the ring, and it keeps more of its roll than the ring
    // does: three arms turning in the screen plane is the whole shape doing
    // something, where three concentric circles rolling is only the dots moving.
    rate: 0.17, yaw0Vary: 0.85, roll: 0.09, lean: 0.18,
    tilt: 0.1, tiltRate: 0.048,
  }),
];

/* --- the lotus --------------------------------------------------------------
 *
 * The first real model, and the one Nam asked for first.
 *
 * SCREEN Y POINTS DOWN, because the projection at the bottom of this file adds y
 * to the centre. So the flower is built with height as a positive number and
 * negated on the way in. Getting this backwards produces a lotus hanging from
 * the ceiling, which is at least an obvious failure.
 *
 * A PETAL IS AN ARC, not a bent plane, and the formulation matters because the
 * hinge depends on it. Walk along the petal and let the angle from vertical
 * open steadily: phi = tilt + curl * s. Then the centreline is that direction
 * integrated, which has a closed form, so a petal is four lines of arithmetic
 * with two parameters that mean something you can see -- how far it leans at the
 * base, how much it curls on the way out.
 *
 * HOW MANY PETALS IS AN ARITHMETIC QUESTION, NOT A TASTE ONE, and the first pass
 * got it wrong by not doing the arithmetic. It had four whorls and twenty eight
 * petals at forty nodes each, which sounds generous and is not: a petal carries
 * about three units of feature line, so twenty eight of them is eighty four units
 * of line for eleven hundred nodes. That is a node every 0.076 of a unit, and at
 * the scale this is drawn -- half the viewport for one unit -- it puts adjacent
 * drones FORTY SEVEN PIXELS apart. Rendered, it was not a flower, it was a haze
 * with a bright middle.
 *
 * Run it the other way instead. A dotted line reads as a line at roughly fifteen
 * to twenty pixels of spacing, which is also where the reference show sits. That
 * is 0.035 of a unit, so eleven hundred nodes buys about forty units of line,
 * which is EIGHTEEN petals. So there are eighteen.
 *
 * WHICH IS ALSO WHY THERE ARE NO VEINS. They were specified and they are the
 * first thing to cut: a pair of veins adds nearly half as much line again per
 * petal, and paying for them means paying in the spacing of the rim -- trading
 * the silhouette, which is what a drone show is made of, for interior detail
 * nobody can resolve. Everything goes to the rim and the midrib, and the plan's
 * rule about surface fill being seasoning turns out to be stricter than it read:
 * here there is no fill at all.
 *
 * THE WHORLS LAG, and that is the whole animation. Petals opening in lockstep
 * read as a scale transform; petals opening in a wave read as a flower. The
 * outer whorl leads and each one inside it is about a second behind.
 * -------------------------------------------------------------------------- */

interface Whorl {
  count: number; r0: number; h0: number;
  L: number; W: number; tilt: number; curl: number;
  /** Node budget per petal, scaled to the petal's size so spacing stays even. */
  nodes: number;
}

/*
 * CURL IS THE PARAMETER THAT MATTERS AND THE FIRST PASS OVERSHOT IT BADLY.
 *
 * The angle from vertical at the tip is tilt + curl. At 1.02 + 1.10 that is 2.12
 * radians, or 121 degrees -- past horizontal, so the petal rose, went over the
 * top and came back DOWN. Every whorl did it, so the flower rose 0.13 of a unit
 * against a spread of 2.0: seen from the side it was a pancake, and every bit of
 * the three-dimensionality the whole exercise is about was thrown away.
 *
 * Landing the tip near 75 degrees instead gives a bowl 0.65 high against 1.07
 * across, which is a lotus, and it is also what makes the fixed lean worth having:
 * there is now something to see from an angle.
 */
const WHORLS: Whorl[] = [
  { count: 8, r0: 0.26, h0: 0.10, L: 1.00, W: 0.32, tilt: 0.62, curl: 0.70, nodes: 76 },
  { count: 6, r0: 0.19, h0: 0.02, L: 0.78, W: 0.27, tilt: 0.45, curl: 0.62, nodes: 60 },
  { count: 4, r0: 0.12, h0: -0.05, L: 0.56, W: 0.21, tilt: 0.28, curl: 0.55, nodes: 44 },
];

/**
 * Half width along the petal: nothing at the base, widest just past the middle,
 * a point at the tip. Normalised so W means what it says.
 */
const widthAt = (() => {
  let peak = 0;
  for (let i = 0; i <= 100; i += 1) {
    const s = i / 100;
    const v = Math.pow(s, 0.5) * Math.pow(1 - s, 0.42);
    if (v > peak) peak = v;
  }
  return (s: number): number => (Math.pow(s, 0.5) * Math.pow(1 - s, 0.42)) / peak;
})();

/** How much the petal dishes. Positive lifts the edges toward the flower axis. */
const CUP = 0.16;
const TWIST = 0.1;
/** Baked in, so the flower fills the same volume as a geometry formation. */
const LOTUS_SCALE = 0.82;
const BREATH = 15;
const SWING = 0.6;

function lotus(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];

  /**
   * Where the nodes sit on one petal, in its own (along, across) coordinates.
   *
   * Seven tenths to the rim and three tenths to the midrib. The rim is walked up
   * one side and back down the other, as an outline is, so the two sides meet at
   * the tip without landing on top of each other.
   */
  const layout = (count: number): [number, number, number][] => {
    const out: [number, number, number][] = [];
    const rim = Math.round(count * 0.7 * 0.5);
    const rib = count - rim * 2;
    for (let i = 0; i < rim; i += 1) {
      const s = 0.03 + (i / (rim - 1)) * 0.97;
      out.push([s, -1, 1]);
    }
    for (let i = 0; i < rim; i += 1) {
      const s = 0.985 - (i / (rim - 1)) * 0.955;
      out.push([s, 1, 1]);
    }
    for (let i = 0; i < rib; i += 1) {
      out.push([0.08 + (i / (rib - 1)) * 0.86, 0, 0.72]);
    }
    return out;
  };

  for (let w = 0; w < WHORLS.length; w += 1) {
    const wh = WHORLS[w]!;
    const spots = layout(wh.nodes);
    for (let p = 0; p < wh.count; p += 1) {
      // Staggered against the whorl outside it, so petals sit in the gaps rather
      // than hiding behind each other.
      const al = ((p + (w % 2) * 0.5) / wh.count) * TAU;
      const pi = parts.length;
      const ca = Math.cos(al);
      const sa = Math.sin(al);
      parts.push(part(
        wh.r0 * ca, -wh.h0, wh.r0 * sa,
        // Tangent to the whorl, so the hinge tips the petal out and back.
        -sa, 0, ca,
        // The outer whorl leads. A touch of per petal scatter on top, so the
        // fleet reads as many craft rather than as one mechanism.
        { phase: w * 0.075 + rnd(pi * 3 + 5) * 0.014 },
      ));

      for (const [s, v, g] of spots) {
        const phi = wh.tilt + wh.curl * s;
        const k = wh.L / wh.curl;
        let rr = k * (Math.cos(wh.tilt) - Math.cos(phi));
        let hh = k * (Math.sin(phi) - Math.sin(wh.tilt));
        const cup = -CUP * v * v * (0.25 + 0.75 * s);
        rr += cup * Math.cos(phi);
        hh += cup * -Math.sin(phi);
        const half = wh.W * widthAt(s);
        const aa = al + TWIST * s;
        const R = wh.r0 + rr;
        cl.add(
          (R * Math.cos(aa) - half * v * Math.sin(aa)) * LOTUS_SCALE,
          -(wh.h0 + hh) * LOTUS_SCALE,
          (R * Math.sin(aa) + half * v * Math.cos(aa)) * LOTUS_SCALE,
          pi,
          // Zero at the heart, one at the outer tips, so the light sweep travels
          // out through the flower rather than around it.
          (WHORLS.length - 1 - w + s) / WHORLS.length,
          g,
        );
      }
    }
  }

  // The seed pod: a shallow dome in concentric rings. Rigid, because a lotus
  // pod does not move and pretending it does would be animation for its own sake.
  const rings = [6, 10, 14, 18, 22];
  for (let j = 0; j < rings.length; j += 1) {
    const r = 0.045 + j * 0.055;
    const y = -(0.12 + 0.16 * (1 - (r / 0.3) ** 2));
    const cnt = rings[j]!;
    for (let i = 0; i < cnt; i += 1) {
      const a = (i / cnt) * TAU + j * 0.4;
      cl.add(Math.cos(a) * r * LOTUS_SCALE, y * LOTUS_SCALE, Math.sin(a) * r * LOTUS_SCALE,
        -1, 0.02, 0.62);
    }
  }

  // Stamens. Three nodes each and the tip is the bright one, which is the
  // cheapest possible way to say that a thing has a lit end.
  for (let j = 0; j < 33; j += 1) {
    const b = j * 2.39996323;
    for (const k of [0, 0.5, 1]) {
      const r = 0.24 + 0.16 * k;
      const y = -(0.16 + 0.2 * k - 0.1 * k * k);
      cl.add(Math.cos(b) * r * LOTUS_SCALE, y * LOTUS_SCALE, Math.sin(b) * r * LOTUS_SCALE,
        -1, 0.06, k === 1 ? 1 : 0.4 + k * 0.3);
    }
  }

  return bake(cl, parts, {
    rate: 0.13,
    lean: 0.36,
    sweepFreq: 2.2,
    sweepRate: 0.4,
    spot: { side: -1, y: 0, s: 0.92 },
    /*
     * Shut, the petals stand nearly upright and the flower is a good deal taller
     * than it is in bloom -- so with one fixed placement it climbed off the top of
     * its own space every time it closed. It sinks as it shuts and rises as it
     * opens, by about a fifth of the drawing scale, which keeps the middle of the
     * flower in the middle of its space through the whole breath.
     */
    lift: (t) => (0.5 - (0.5 - 0.5 * Math.cos((t / BREATH) * TAU))) * 0.12,
    rig: (t, poses) => {
      for (let i = 0; i < poses.length; i += 1) {
        const ph = parts[i]!.phase;
        const o = 0.5 - 0.5 * Math.cos((t / BREATH - ph) * TAU);
        const q = poses[i]!;
        q.a = (o - 0.5) * SWING;
        // It breathes in light as well as in shape. An open petal is a lit one.
        q.b = 0.62 + 0.38 * o;
      }
    },
  });
}

/* --- the midsommarstang -----------------------------------------------------
 *
 * Nam's Swedish pick, and the second model is what turns Motifs from a single
 * image into a programme.
 *
 * It is also the model that proves the rig generalises, because it needs the one
 * thing the lotus does not: the two garland rings HINGE (they turn about their
 * own vertical, counter to each other, which is the dance) and the ribbons do
 * not hinge at all, they RIPPLE. A ripple is the `wave` field on a part, keyed on
 * how far down the ribbon a node sits, so the tied end stays tied and the free
 * end travels. Two mechanisms cover every motif on the list.
 * -------------------------------------------------------------------------- */

function maypole(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];
  const TOP = -0.86;
  const FOOT = 0.92;
  const BAR = -0.52;

  // The pole, with a triangular section so it has thickness at any angle. A
  // single column of points is a line, and a line disappears edge on.
  for (let i = 0; i <= 44; i += 1) {
    const y = TOP + ((FOOT - TOP) * i) / 44;
    for (let j = 0; j < 3; j += 1) {
      const a = (j / 3) * TAU + i * 0.06;
      cl.add(Math.cos(a) * 0.026, y, Math.sin(a) * 0.026, -1, 0.1, 0.9);
    }
  }

  // The crossbar, the same way.
  for (let i = 0; i <= 36; i += 1) {
    const x = -0.58 + (1.16 * i) / 36;
    for (let j = 0; j < 3; j += 1) {
      const a = (j / 3) * TAU + i * 0.06;
      cl.add(x, BAR + Math.cos(a) * 0.024, Math.sin(a) * 0.024, -1, 0.1, 0.9);
    }
  }

  // The two hanging rings. Parts 0 and 1, and the only parts that hinge.
  for (const side of [-1, 1]) {
    const cxr = side * 0.46;
    const cyr = -0.14;
    const pi = parts.length;
    parts.push(part(cxr, cyr, 0, 0, 1, 0));
    for (let band = 0; band < 2; band += 1) {
      const r = 0.215 + band * 0.03;
      for (let i = 0; i < 46; i += 1) {
        const a = (i / 46) * TAU;
        cl.add(cxr + Math.cos(a) * r, cyr + Math.sin(a) * r, 0, pi, 0.5, band === 0 ? 1 : 0.7);
      }
    }
    // The cord it hangs by, which is what stops the ring reading as a floating
    // hoop. Rigid, because a cord under tension does not swing on its own.
    for (let i = 0; i < 8; i += 1) {
      cl.add(cxr, BAR + ((cyr - 0.215 - BAR) * i) / 8, 0, -1, 0.2, 0.55);
    }
  }

  // Ribbons from the crown, spiralling out and down. Parts 2 to 9, all ripple.
  for (let rb = 0; rb < 8; rb += 1) {
    const pi = parts.length;
    parts.push(part(0, TOP, 0, 0, 1, 0, { wave: 0.085, phase: rb / 8 }));
    const a0 = (rb / 8) * TAU;
    for (let i = 0; i < 40; i += 1) {
      const k = i / 39;
      const a = a0 + k * 1.5;
      const r = 0.03 + k * k * 0.62;
      cl.add(Math.cos(a) * r, TOP + k * 1.18, Math.sin(a) * r, pi, k, 0.85 - k * 0.2);
    }
  }

  // Leaf garland, spiralling up the pole. Small clusters rather than a smooth
  // helix: a garland is made of things, and at this resolution the gaps between
  // the clusters are what says so.
  for (let c = 0; c < 26; c += 1) {
    const k = c / 25;
    const y = TOP + 0.12 + k * (FOOT - TOP - 0.24);
    const a0 = k * TAU * 3.1;
    for (let j = 0; j < 8; j += 1) {
      const a = a0 + (j / 8) * 1.1;
      const r = 0.055 + (j % 3) * 0.022;
      cl.add(Math.cos(a) * r, y + ((j % 2) - 0.5) * 0.02, Math.sin(a) * r, -1, 0.3, 0.55);
    }
  }

  // The same along the crossbar.
  for (let c = 0; c < 18; c += 1) {
    const x = -0.55 + (1.1 * c) / 17;
    for (let j = 0; j < 6; j += 1) {
      const a = c * 0.9 + (j / 6) * TAU;
      const r = 0.05 + (j % 2) * 0.02;
      cl.add(x, BAR + Math.cos(a) * r, Math.sin(a) * r, -1, 0.3, 0.5);
    }
  }

  // The crown, and a foot to stand it on.
  for (let i = 0; i < 34; i += 1) {
    const a = (i / 34) * TAU;
    cl.add(Math.cos(a) * 0.12, TOP - 0.04 + Math.sin(a * 3) * 0.02, Math.sin(a) * 0.12,
      -1, 0.9, 0.8);
  }
  for (let i = 0; i < 40; i += 1) {
    const a = (i / 40) * TAU;
    cl.add(Math.cos(a) * 0.3, FOOT, Math.sin(a) * 0.16, -1, 0.05, 0.45);
  }

  return bake(cl, parts, {
    rate: 0.17,
    lean: 0.3,
    sweepFreq: 1.4,
    sweepRate: 0.3,
    spot: { side: -1, y: 0, s: 0.92 },
    rig: (t, poses) => {
      // The rings counter-rotate, which is the dance and is the only thing on
      // this model anybody will actually watch.
      if (poses[0]) { poses[0].a = t * 0.5; poses[0].b = 1; }
      if (poses[1]) { poses[1].a = -t * 0.5; poses[1].b = 1; }
      for (let i = 2; i < poses.length; i += 1) {
        const q = poses[i]!;
        q.a = Math.sin(t * 0.4 + i) * 0.08;
        q.b = 0.78 + 0.22 * Math.sin(t * 0.9 + i * 1.7);
      }
    },
  });
}

/* --- the rest of the roster -------------------------------------------------
 *
 * Nam: "Let's add in more motifs here, I want iconic things that people will
 * easily recognize, floating lanterns, cherry blossoms, hot air baloons, vasa
 * ship, etc. Let's have about 8 motifs here."
 *
 * RECOGNISABLE IS THE WHOLE BRIEF, and it is a constraint on the drawing before
 * it is a choice of subject. 1400 craft carry a SILHOUETTE and cannot carry a
 * likeness, so every one of these is the generic object rather than a particular
 * one -- a sky lantern, not a named festival; a tall ship with a high stern, not
 * a rivet-accurate Vasa. At this resolution the specific version reads as a worse
 * copy of the generic shape it is made of.
 *
 * THEY ARE ALL DRAWN AT ABOUT HALF SIZE, out in a margin, which is a gift rather
 * than a limit: the same feature line at scale 0.55 is drawn at 250 pixels to the
 * unit instead of 450, so the same node count buys nearly twice the line. That is
 * why these can be more ornate than the lotus, which was authored centred and
 * full size.
 * -------------------------------------------------------------------------- */

/** A ring of points in the XZ plane at a given height. Used by half of these. */
function hoop(
  cl: Cloud, cx: number, cy: number, cz: number, r: number, n: number,
  pi: number, u: number, g: number, phase = 0,
): void {
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU + phase;
    cl.add(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r, pi, u, g);
  }
}

/** A straight run of points between two places. The other half use this. */
function run(
  cl: Cloud, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number,
  n: number, pi: number, u0: number, u1: number, g: number,
): void {
  for (let i = 0; i < n; i += 1) {
    const k = n === 1 ? 0 : i / (n - 1);
    cl.add(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z0 + (z1 - z0) * k,
      pi, u0 + (u1 - u0) * k, g);
  }
}

/* --- floating lanterns ----------------------------------------------------- */

/**
 * Five sky lanterns at different heights and sizes.
 *
 * THE BEST FIT IN THE SET for what a drone show actually is, because it is not
 * one object: it is five, at five scales, drifting on five different phases. A
 * fleet holding five separate things in the air at once is a thing a fleet can do
 * and a single sculpture cannot.
 *
 * They DRIFT rather than hinge, which is what the pose offsets were added for.
 * The alternative was a hinge on a pivot three units below each lantern, which
 * produces the same arc and is a lie the next person would have to decode.
 */
function lanterns(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];

  /*
   * TWENTY, NOT FIVE. Nam: "I want more of those, like right now so few lanterns,
   * I want it to be wow! ... kinda like in tangled the movie when you see many
   * many floating lanterns."
   *
   * He asked whether it needs more drones. It does not, and that is the useful
   * part of the answer: a bigger fleet spent on five lanterns makes five denser
   * lanterns, and the thing that makes that shot work is the COUNT. The same 1400
   * craft over twenty smaller lanterns is a sky; over five larger ones it is a
   * still life. Each one drops from about 220 nodes to 68, and because it is also
   * a third of the size, the spacing on it barely moves.
   *
   * They are scattered by a Fibonacci-ish spiral rather than by hand, so no two
   * sit on top of each other and the near ones are large and low.
   */
  const COUNT = 20;
  for (let n = 0; n < COUNT; n += 1) {
    const k = (n + 0.5) / COUNT;
    const a = n * 2.39996323;
    // Wide and shallow: they fill the frame rather than a ball in the middle.
    const spread = 0.32 + Math.sqrt(k) * 0.82;
    const ox = Math.cos(a) * spread + (rnd(n * 7 + 1) - 0.5) * 0.16;
    const oy = -0.72 + k * 1.5 + (rnd(n * 5 + 2) - 0.5) * 0.2;
    const oz = Math.sin(a) * spread * 0.7 + (rnd(n * 11 + 3) - 0.5) * 0.2;
    // The low ones are near and big, the high ones far and small, which is the
    // whole depth cue in the shot he is describing.
    const R = 0.075 + (oy + 0.8) * 0.075 + rnd(n * 3 + 4) * 0.02;

    const pi = parts.length;
    parts.push(part(ox, oy, oz, 0, 0, 1, { phase: rnd(pi * 9 + 2) }));

    const prof = (v: number): number =>
      R * (0.55 + 0.45 * Math.sin(Math.PI * v)) * (0.72 + 0.28 * v);
    const H = R * 2.1;

    // Six ribs and one hoop. At this size that is the lantern: the ribs give the
    // silhouette and the hoop stops it reading as a flat sheaf of lines.
    for (let rib = 0; rib < 6; rib += 1) {
      const b = (rib / 6) * TAU;
      for (let i = 0; i < 8; i += 1) {
        const v = i / 7;
        const r = prof(v);
        cl.add(ox + Math.cos(b) * r, oy - v * H + H * 0.5, oz + Math.sin(b) * r,
          pi, v, 0.9);
      }
    }
    hoop(cl, ox, oy - 0.6 * H + H * 0.5, oz, prof(0.6), 10, pi, 0.6, 0.66);
    hoop(cl, ox, oy + H * 0.5, oz, prof(0) * 0.82, 7, pi, 0, 0.8);
    // The flame. One node, at full brightness, and it is what makes twenty of
    // these read as twenty lit things rather than as twenty wire baskets.
    cl.add(ox, oy + H * 0.3, oz, pi, 0.02, 1);
  }

  return bake(cl, parts, {
    rate: 0.09,
    lean: 0.16,
    tilt: 0.1, tiltRate: 0.03,
    sweepFreq: 0.9,
    sweepRate: 0.22,
    spot: { side: -1, y: 0, s: 0.92 },
    rig: (t, poses) => {
      for (let i = 0; i < poses.length; i += 1) {
        const q = poses[i]!;
        const ph = parts[i]!.phase;
        // Rising and settling, each on its own clock. Sideways drift is larger
        // than the climb, because hot air goes up steadily and it is the wind
        // that actually moves a lantern about.
        q.oy = Math.sin((t * 0.16 + ph) * TAU) * 0.07 - Math.cos((t * 0.11 + ph) * TAU) * 0.03;
        q.ox = Math.sin((t * 0.13 + ph * 1.7) * TAU) * 0.09;
        q.oz = Math.cos((t * 0.1 + ph * 2.3) * TAU) * 0.06;
        q.a = Math.sin((t * 0.12 + ph) * TAU) * 0.12;
        // The flames gutter out of step, or twenty lanterns pulse as one lamp.
        q.b = 0.8 + 0.2 * Math.sin((t * 0.55 + ph * 3.1) * TAU);
      }
    },
  });
}

/* --- the pagoda -------------------------------------------------------------
 *
 * REPLACES THE HOT AIR BALLOONS, for two reasons and only one of them is the bug.
 *
 * The bug: they were upside down. The envelope's profile bulged in its lower half
 * where a balloon bulges in its upper, and the basket was hung off the TOP of the
 * envelope rather than under the mouth -- screen y points down, so the code that
 * read as "hang it below" put it above. Nam caught it in a screenshot.
 *
 * The better reason: "too similar to the floating lanterns". He is right, and
 * fixing the orientation would have left two motifs that are both a glowing
 * envelope hanging in the sky. One of them had to be something else.
 *
 * A PAGODA IS THE RIGHT SOMETHING ELSE. It is the shape at the centre of the
 * record show Nam sent as the brief, which is the closest thing this roster has
 * to a stated target. It is radially symmetric, so it reads from any angle and
 * needs no locked heading. It is TALL, which no other motif here is, so it uses a
 * shape of space nothing else does. And its whole character is in feature lines --
 * roof ridges, upturned eaves, lattice panels, a finial -- which is exactly what a
 * fleet of points is good at and what a smooth surface is not.
 * -------------------------------------------------------------------------- */

function pagoda(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];

  const TIERS = 5;
  const SIDES = 6;
  // Top to bottom: each tier wider and shorter than the one above it, which is
  // the proportion that makes a tower read as a tower rather than as a stack.
  for (let tier = 0; tier < TIERS; tier += 1) {
    const k = tier / (TIERS - 1);
    const r = 0.2 + k * 0.42;
    const eave = r * 1.46;
    const top = -0.94 + k * 1.52;
    const body = 0.3 - k * 0.05;
    const u = 1 - k;

    // The body: uprights at the corners, and a lattice panel between them.
    for (let sd = 0; sd < SIDES; sd += 1) {
      const a = (sd / SIDES) * TAU;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      run(cl, ca * r, top, sa * r, ca * r, top + body, sa * r, 6, -1, u, u, 1);
      // Two bars of lattice per panel, which at this density is enough to say
      // the panel is pierced rather than solid.
      const a2 = ((sd + 1) / SIDES) * TAU;
      for (const f of [0.5]) {
        const y = top + body * f;
        run(cl, ca * r, y, sa * r, Math.cos(a2) * r, y, Math.sin(a2) * r, 6, -1, u, u, 0.6);
      }
    }
    // Floor and eave rings.
    hoop(cl, 0, top, 0, r, 20, -1, u, 0.8);
    hoop(cl, 0, top + body, 0, r, 20, -1, u, 0.8);
    hoop(cl, 0, top + body + 0.05, 0, eave, 23, -1, u, 1);

    /* THE ROOF IS THE WHOLE TELL, and it is the upturn at the ends that does it.
       A straight cone reads as a tent. Each ridge runs from the peak out to the
       eave and then CURLS UP, and the curl is worth more nodes than the rest of
       the roof put together. */
    for (let sd = 0; sd < SIDES; sd += 1) {
      const a = ((sd + 0.5) / SIDES) * TAU;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      for (let i = 0; i < 12; i += 1) {
        const q = i / 11;
        const rr = q * eave;
        // Sags in the middle and lifts hard at the tip, like a real hip ridge.
        // The upturn is the whole tell, and Nam read the tower as a birthday cake
        // -- which is what a stack of tiers is without it. Lifted from 0.16 to
        // 0.26 and pulled to a sharper power, so the last fifth of every ridge
        // hooks up rather than easing up.
        const y = top + body - 0.16 + q * 0.16 + Math.pow(q, 4.2) * -0.26;
        cl.add(ca * rr, y, sa * rr, -1, u, q > 0.72 ? 1 : 0.85);
      }
      // The tile courses between the ridges, sparse, so the roof is a surface.
      for (const q of [0.72]) {
        const a2 = ((sd + 1.5) / SIDES) * TAU;
        const rr = q * eave;
        const y = top + body - 0.16 + q * 0.16 + Math.pow(q, 4.2) * -0.26;
        run(cl, ca * rr, y, sa * rr, Math.cos(a2) * rr, y, Math.sin(a2) * rr, 5, -1, u, u, 0.45);
      }
    }
    // The peak of this tier's roof.
    cl.add(0, top + body - 0.16, 0, -1, u, 0.9);
  }

  // The finial: a stack of rings and a bead, which is how these actually finish.
  for (let i = 0; i < 5; i += 1) {
    hoop(cl, 0, -1.14 + i * 0.045, 0, 0.055 - i * 0.007, 8, -1, 1, 0.8);
  }
  run(cl, 0, -1.24, 0, 0, -0.8, 0, 11, -1, 1, 1, 0.9);
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * TAU;
    cl.add(Math.cos(a) * 0.035, -1.24, Math.sin(a) * 0.035, -1, 1, 1);
  }

  // A lantern hung at each eave corner of the two lowest tiers, which is the one
  // detail that makes it read as lit rather than as a model of a building.
  for (let tier = 3; tier < 5; tier += 1) {
    const k = tier / (TIERS - 1);
    const eave = (0.2 + k * 0.42) * 1.46;
    const top = -0.94 + k * 1.52 + (0.3 - k * 0.05) + 0.05;
    for (let sd = 0; sd < SIDES; sd += 1) {
      const a = ((sd + 0.5) / SIDES) * TAU;
      const pi = parts.length;
      parts.push(part(Math.cos(a) * eave, top, Math.sin(a) * eave, 0, 0, 1,
        { phase: rnd(pi * 5 + 3) }));
      run(cl, Math.cos(a) * eave, top, Math.sin(a) * eave,
        Math.cos(a) * eave, top + 0.05, Math.sin(a) * eave, 3, pi, 0.5, 0.5, 0.5);
      /*
       * A BALL, NOT A RING. Nam: "they are round ornaments that would remain round
       * even when rotating - here because they are made from 2D slices, sometimes
       * the ornaments collapsed into an oval or just one line, which is weird for
       * something that we know in 3D is a sphere."
       *
       * Exactly right, and it is the same fault as the flat geometry shapes at a
       * twentieth of the size: a circle of points is a disc, and a disc turns
       * edge on. Nine points on a Fibonacci sphere cost one more node than the
       * ring did and cannot present an edge, because they have not got one.
       */
      for (let i = 0; i < 9; i += 1) {
        const yy = 1 - (2 * (i + 0.5)) / 9;
        const rr = Math.sqrt(Math.max(0, 1 - yy * yy)) * 0.036;
        const b = i * 2.39996323;
        cl.add(Math.cos(a) * eave + Math.cos(b) * rr,
          top + 0.09 + yy * 0.036,
          Math.sin(a) * eave + Math.sin(b) * rr, pi, 0.5, 1);
      }
    }
  }

  return bake(cl, parts, {
    // Radially symmetric, so it can turn freely and never shows a bad side. It is
    // the only motif in the set that asks for nothing.
    rate: 0.13, lean: 0.26,
    tilt: 0.11, tiltRate: 0.03,
    sweepFreq: 1.4,
    // The sweep runs bottom to top, because a tower is read that way.
    sweepRate: 0.3,
    // A shade above centre. A tower is read from the base up, so the eye settles
    // low on it, and a tower centred by its box reads as having sunk a little.
    spot: { side: -1, y: -0.05, s: 0.92 },
    rig: (t, poses) => {
      for (let i = 0; i < poses.length; i += 1) {
        const q = poses[i]!;
        const ph = parts[i]!.phase;
        // The hung lanterns swing, each on its own clock.
        q.a = Math.sin((t * 0.21 + ph) * TAU) * 0.16;
        q.b = 0.82 + 0.18 * Math.sin((t * 0.5 + ph * 2.7) * TAU);
      }
    },
  });
}

/* --- the carousel -----------------------------------------------------------
 *
 * REPLACES THE CHERRY TREE, which was itself a replacement for the cherry branch.
 * Two passes at blossom and neither read, so the subject goes rather than getting
 * a third attempt.
 *
 * NAM NAMED THE TARGET HIMSELF: "something fun and 3D. Something along the line of
 * the midsommarstang would be amazing, that stang is probably the best looking 3D
 * shape in this theme." So the question is what makes the maypole work, and it is
 * not that it is Swedish. It is that it is a VERTICAL RADIAL FRAME with distinct
 * things hung off it at distinct heights -- a pole, a crossbar, two rings, eight
 * ribbons -- so it reads from any angle, it has an obvious axis, and the parts
 * that move are separable from the parts that do not.
 *
 * A carousel is that same object with a different job. Central column, scalloped
 * canopy, a ring of barber poles, mounts hung on them, pennants round the rim.
 * And the thing it does is the thing a viewer already expects it to do: the ride
 * turns and the mounts rise and fall out of step, which is the maypole's
 * counter-rotating rings with a reason to exist.
 *
 * THE MOUNTS ARE DELIBERATELY NOT HORSES. The dala horse next door is a whole
 * ticket about how hard a horse is to draw at this resolution; putting eight
 * small ones on a spinning frame would fail eight times over. They are stylised
 * seats -- a swept back, a scroll, a footboard -- which is what half the mounts on
 * a real carousel are anyway and which cannot be got wrong.
 * -------------------------------------------------------------------------- */

function carousel(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];

  const TOP = -0.92;
  const ROOF = -0.5;
  const DECK = 0.44;
  const FOOT = 0.72;
  const R = 0.82;
  const ARMS = 6;

  /* The ride: everything that turns, on one part, about the central axis. The
     mounts get parts of their own further down so they can bob independently. */
  const ride = parts.length;
  parts.push(part(0, 0, 0, 0, 1, 0));

  // The column, standing still. Six edges so it has a section from any angle.
  for (let i = 0; i <= 26; i += 1) {
    const y = TOP + ((FOOT - TOP) * i) / 26;
    for (let j = 0; j < 4; j += 1) {
      const a = (j / 4) * TAU + i * 0.05;
      cl.add(Math.cos(a) * 0.05, y, Math.sin(a) * 0.05, -1, 0.1, 0.9);
    }
  }

  /* THE CANOPY, and it is the thing that says fairground. Twelve ridges from the
     finial out to a scalloped rim: the scallop is worth its nodes, because a
     smooth cone is a tent and a scalloped one is a carousel. */
  const RIDGES = 14;
  for (let g = 0; g < RIDGES; g += 1) {
    const a = (g / RIDGES) * TAU;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let i = 0; i < 13; i += 1) {
      const k = i / 12;
      const rr = k * R * 1.06;
      // Sags on the way out and flicks up at the very edge.
      const y = TOP + 0.06 + k * (ROOF - TOP) + Math.pow(k, 3.6) * -0.07;
      cl.add(ca * rr, y, sa * rr, -1, 1 - k * 0.5, k > 0.82 ? 1 : 0.86);
    }
  }
  // The scalloped rim, drawn between the ridges so the swags hang the right way.
  for (let g = 0; g < RIDGES; g += 1) {
    const a0 = (g / RIDGES) * TAU;
    const a1 = ((g + 1) / RIDGES) * TAU;
    for (let i = 0; i <= 7; i += 1) {
      const k = i / 7;
      const a = a0 + (a1 - a0) * k;
      const dip = Math.sin(Math.PI * k) * 0.075;
      cl.add(Math.cos(a) * R * 1.06, ROOF + 0.06 + dip - 0.07, Math.sin(a) * R * 1.06,
        -1, 0.55, 0.95);
    }
  }
  // Two courses of tiles on the canopy, sparse, so it is a surface not a frame.
  for (const k of [0.34, 0.56, 0.78]) {
    hoop(cl, 0, TOP + 0.06 + k * (ROOF - TOP) + Math.pow(k, 3.6) * -0.07, 0,
      k * R * 1.06, 24, -1, 1 - k * 0.5, 0.5);
  }

  // The finial and its flag, which is the only thing above the roof.
  for (let i = 0; i < 4; i += 1) {
    hoop(cl, 0, TOP - 0.02 - i * 0.04, 0, 0.05 - i * 0.008, 7, -1, 1, 0.85);
  }
  run(cl, 0, TOP - 0.2, 0, 0, TOP + 0.04, 0, 7, -1, 1, 1, 0.9);
  const flag = parts.length;
  parts.push(part(0, TOP - 0.2, 0, 0, 1, 0, {
    wave: 0.045, wx: 0, wy: 1, wz: 0.3, wfreq: 1.8, wrate: 1.2,
  }));
  run(cl, 0, TOP - 0.2, 0, 0.26, TOP - 0.17, 0, 8, flag, 0, 1, 0.9);

  // The deck: two rings and a scatter of boards between them.
  hoop(cl, 0, DECK, 0, R * 1.02, 30, ride, 0.1, 0.95);
  hoop(cl, 0, DECK, 0, R * 0.62, 22, ride, 0.1, 0.7);
  for (let g = 0; g < 12; g += 1) {
    const a = (g / 12) * TAU;
    run(cl, Math.cos(a) * R * 0.62, DECK, Math.sin(a) * R * 0.62,
      Math.cos(a) * R * 1.02, DECK, Math.sin(a) * R * 1.02, 4, ride, 0.1, 0.1, 0.5);
  }
  // A skirt under the deck, so the ride has a thickness.
  hoop(cl, 0, DECK + 0.07, 0, R * 0.98, 26, ride, 0.1, 0.55);

  /* THE POLES AND WHAT HANGS ON THEM. Eight of each, and the mounts each get a
     part so they can rise and fall out of step -- which is the whole motion of
     the thing and the reason it is not just a spinning roof. */
  for (let g = 0; g < ARMS; g += 1) {
    const a = (g / ARMS) * TAU;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const px = ca * R * 0.84;
    const pz = sa * R * 0.84;

    // A barber pole: a helix round a line reads as a twist at any distance.
    for (let i = 0; i < 20; i += 1) {
      const k = i / 19;
      const y = ROOF - 0.02 + k * (DECK - ROOF + 0.02);
      const tw = k * TAU * 2.2;
      cl.add(px + Math.cos(tw) * 0.022, y, pz + Math.sin(tw) * 0.022, ride, 0.3, 0.85);
    }

    const mp = parts.length;
    parts.push(part(0, 0, 0, 0, 1, 0, { phase: g / ARMS }));
    const my = DECK - 0.3;
    // Facing along the ride's travel, which is what a mount on a carousel does.
    const fx = -sa;
    const fz = ca;
    const at = (u: number, v: number, w: number): [number, number, number] => [
      px + fx * u + ca * w, my + v, pz + fz * u + sa * w,
    ];

    // The seat: a swept back, a scrolled front, a footboard, and a saddle line.
    const seat: [number, number, number][] = [
      [-0.17, 0.04, 0], [-0.15, -0.1, 0], [-0.1, -0.18, 0], [-0.02, -0.2, 0],
      [0.06, -0.16, 0], [0.1, -0.05, 0], [0.12, 0.06, 0], [0.16, 0.12, 0],
      [0.2, 0.06, 0], [0.19, -0.02, 0],
    ];
    for (let i = 1; i < seat.length; i += 1) {
      const p0 = seat[i - 1]!;
      const p1 = seat[i]!;
      for (const w of [-0.035, 0.035]) {
        const q0 = at(p0[0], p0[1], w);
        const q1 = at(p1[0], p1[1], w);
        run(cl, q0[0], q0[1], q0[2], q1[0], q1[1], q1[2], 3, mp, 0.5, 0.5, 0.95);
      }
    }
    // The footboard and the two struts that hang it off the pole.
    const f0 = at(-0.12, 0.16, -0.05);
    const f1 = at(0.12, 0.16, 0.05);
    run(cl, f0[0], f0[1], f0[2], f1[0], f1[1], f1[2], 7, mp, 0.5, 0.5, 0.8);
    const s0 = at(-0.02, -0.2, 0);
    run(cl, s0[0], s0[1], s0[2], px, my - 0.34, pz, 5, mp, 0.5, 0.5, 0.6);
    const s1 = at(0.16, 0.12, 0);
    run(cl, s1[0], s1[1], s1[2], px, my + 0.2, pz, 5, mp, 0.5, 0.5, 0.6);
    // A lamp on the pole above each mount, which is what lights a carousel.
    for (let i = 0; i < 7; i += 1) {
      const yy = 1 - (2 * (i + 0.5)) / 7;
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy)) * 0.028;
      const b = i * 2.39996323;
      cl.add(px + Math.cos(b) * rr, ROOF + 0.06 + yy * 0.028, pz + Math.sin(b) * rr,
        ride, 0.9, 1);
    }
  }

  // Pennants hanging from the rim, between the ridges.
  for (let g = 0; g < RIDGES; g += 1) {
    const a = ((g + 0.5) / RIDGES) * TAU;
    const hx = Math.cos(a) * R * 1.06;
    const hz = Math.sin(a) * R * 1.06;
    const pp = parts.length;
    parts.push(part(hx, ROOF, hz, 0, 1, 0, {
      wave: 0.03, wx: -Math.sin(a), wy: 0, wz: Math.cos(a),
      wfreq: 1.4, wrate: 0.8, phase: g / RIDGES,
    }));
    run(cl, hx, ROOF - 0.01, hz, hx * 0.94, ROOF + 0.13, hz * 0.94, 6, pp, 0, 1, 0.7);
  }

  return bake(cl, parts, {
    // Radially symmetric, so it turns freely and has no bad side -- the same
    // reason the pagoda and the lotus need nothing special.
    rate: 0.12, lean: 0.3,
    tilt: 0.1, tiltRate: 0.032,
    sweepFreq: 1.2, sweepRate: 0.28,
    spot: { side: -1, y: 0, s: 0.92 },
    rig: (t, poses) => {
      // The ride turns under the canopy, which stays put. That difference is the
      // whole thing: a carousel where the roof turns too is just a spinning cone.
      const spin = t * 0.42;
      for (let i = 0; i < poses.length; i += 1) {
        const q = poses[i]!;
        const pt = parts[i]!;
        q.a = pt.wave !== 0 ? 0 : spin;
        q.b = 1;
      }
      // The mounts rise and fall a third of a turn apart, which is what stops
      // eight identical seats reading as one wheel.
      for (let i = 0; i < poses.length; i += 1) {
        const pt = parts[i]!;
        if (pt.wave !== 0 || i === 0) continue;
        const q = poses[i]!;
        q.oy = Math.sin((t * 0.62 + pt.phase * 3) * TAU) * 0.11;
      }
    },
  });
}

/* --- the tall ship --------------------------------------------------------- */

/**
 * A high-sterned warship under sail. Nam asked for the Vasa.
 *
 * GENERIC ON PURPOSE, and the plan predicted this would be the model most likely
 * to want a real mesh. It does not get one, and the reason it survives anyway is
 * that a ship of this period is recognised by three things a point cloud can
 * carry: a hull that curves up at both ends, a stern castle much taller than the
 * bow, and three masts of decreasing height with square sails on them. Rivets
 * were never going to be visible.
 *
 * IT ROLLS ON A SWELL, which is one hinge along the keel plus a heave. The sails
 * belly on the ripple, which is what the directed wave was generalised for.
 */
function tallship(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];
  // Everything is one part, because a ship rolls as one thing.
  const hull = parts.length;
  parts.push(part(0, 0.5, 0, 0, 0, 1));
  // Which parts are canvas, so the rig can brace them without counting indices.
  const sails: number[] = [];

  // Sheer and keel. The sheer sweeps up hard at the stern, which is the tell.
  const sheer = (k: number): number => 0.34 - Math.pow(k, 2.2) * 0.42 - Math.pow(1 - k, 3) * 0.16;
  for (let d = -1; d <= 1; d += 2) {
    for (let i = 0; i < 26; i += 1) {
      const k = i / 25;
      const x = -0.86 + k * 1.72;
      const beam = 0.13 * Math.sin(Math.PI * Math.pow(k, 0.85)) + 0.02;
      cl.add(x, sheer(k), d * beam, hull, 0.1, 1);
      cl.add(x, sheer(k) + 0.1, d * beam * 0.94, hull, 0.1, 0.62);
      cl.add(x, sheer(k) + 0.2, d * beam * 0.8, hull, 0.1, 0.62);
    }
  }
  for (let i = 0; i < 22; i += 1) {
    const k = i / 21;
    const x = -0.86 + k * 1.72;
    cl.add(x, 0.54 - Math.pow(1 - k, 3) * 0.1 - Math.pow(k, 3) * 0.06, 0, hull, 0.1, 0.9);
  }
  // The stern castle, and it is deliberately overbuilt.
  for (let i = 0; i < 4; i += 1) {
    const y = 0.34 - i * 0.11;
    run(cl, 0.6, y, -0.1, 0.86, y - 0.03, -0.06, 5, hull, 0.05, 0.05, 0.8);
    run(cl, 0.6, y, 0.1, 0.86, y - 0.03, 0.06, 5, hull, 0.05, 0.05, 0.8);
    run(cl, 0.6, y, -0.1, 0.6, y, 0.1, 4, hull, 0.05, 0.05, 0.7);
    run(cl, 0.86, y - 0.03, -0.06, 0.86, y - 0.03, 0.06, 3, hull, 0.05, 0.05, 0.7);
  }
  // Bowsprit.
  run(cl, -0.84, -0.02, 0, -1.16, -0.2, 0, 9, hull, 0.05, 0.05, 0.85);

  // Three masts. Foremast shortest, main tallest, mizzen between.
  const masts: [number, number, number[]][] = [
    [-0.44, -1.0, [0.34, 0.24]],
    [0.02, -1.22, [0.4, 0.3, 0.2]],
    [0.44, -0.86, [0.28, 0.2]],
  ];
  for (let m = 0; m < masts.length; m += 1) {
    const [mx, top, yards] = masts[m]!;
    run(cl, mx, 0.2, 0, mx, top, 0, 20, hull, 0.1, 0.1, 1);
    for (let y = 0; y < yards.length; y += 1) {
      const yy = top * (0.34 + y * 0.3);
      const half = yards[y]!;
      run(cl, mx, yy, -half, mx, yy, half, 13, hull, 0.1, 0.1, 0.9);
      // The sail under it, as a bellying rectangle. Its own part so it can flex.
      const sp = parts.length;
      sails.push(sp);
      /*
       * ABOUT THE MAST, so the rig can BRACE it. A square sail is bent to a yard
       * set athwartships, and bracing swings that yard round the mast -- which is
       * a rotation about the vertical, not the fore and aft axis it used to have.
       *
       * The ripple direction moves with it: canvas bellies along the ship's
       * length once the yard is round, so the wave pushes on x rather than z.
       */
      parts.push(part(mx, yy, 0, 0, 1, 0, {
        wave: 0.05, wx: 1, wy: 0, wz: 0, wfreq: 0.6, wrate: 0.3, phase: rnd(m * 7 + y),
      }));
      const drop = Math.abs(top) * 0.3;
      for (let i = 0; i < 11; i += 1) {
        const u = i / 10;
        const z = -half * 0.92 + u * half * 1.84;
        run(cl, mx, yy, z, mx, yy + drop, z * 0.86, 5, sp, 0, 1, 0.66);
      }
      run(cl, mx, yy + drop, -half * 0.8, mx, yy + drop, half * 0.8, 9, sp, 1, 1, 0.8);
    }
    // Shrouds down to the rail.
    for (const d of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        run(cl, mx, top * 0.42, 0, mx - 0.06 + i * 0.06, 0.2, d * 0.13, 7, hull, 0.1, 0.1, 0.42);
      }
    }
  }
  // Stays fore and aft, which are what tie the three masts into one rig.
  run(cl, -0.44, -1.0, 0, -1.12, -0.18, 0, 11, hull, 0.1, 0.1, 0.45);
  run(cl, 0.02, -1.22, 0, -0.44, -1.0, 0, 8, hull, 0.1, 0.1, 0.45);
  run(cl, 0.44, -0.86, 0, 0.02, -1.22, 0, 8, hull, 0.1, 0.1, 0.45);
  run(cl, 0.44, -0.86, 0, 0.8, 0.2, 0, 9, hull, 0.1, 0.1, 0.45);

  // Pennants, which ripple.
  for (let m = 0; m < masts.length; m += 1) {
    const [mx, top] = masts[m]!;
    const fp = parts.length;
    parts.push(part(mx, top, 0, 0, 1, 0, {
      wave: 0.05, wx: 0, wy: 1, wz: 0.4, wfreq: 1.9, wrate: 1.1, phase: rnd(m * 3 + 2),
    }));
    run(cl, mx, top, 0, mx + 0.3, top + 0.02, 0, 9, fp, 0, 1, 0.9);
  }

  return bake(cl, parts, {
    /*
     * IT HOLDS ITS BROADSIDE. Nam: "the vasa ship, only looking good at a certain
     * angle." True, and unavoidable: a ship is a silhouette object. Everything
     * that says tall ship -- the sheer running up to a high stern, three masts of
     * falling height, square sails -- is only there from the side. Bow on it is a
     * vertical smear.
     *
     * So no yaw, the same answer the flat geometry shapes got. It is built
     * broadside to the camera, and it swings a quarter of a radian either way so
     * it is a ship at anchor rather than a decal.
     */
    rate: 0,
    lean: 0.16,
    swing: 0.26, swingRate: 0.035,
    tilt: 0.09, tiltRate: 0.03,
    sweepFreq: 1.2,
    sweepRate: 0.24,
    spot: { side: -1, y: 0, s: 0.92 },
    rig: (t, poses) => {
      // One swell, and everything on the ship answers to it.
      const roll = Math.sin(t * 0.28 * TAU * 0.25) * 0.13;
      const heave = Math.sin(t * 0.19 * TAU * 0.25 + 1.1) * 0.05;
      for (let i = 0; i < poses.length; i += 1) {
        const q = poses[i]!;
        q.a = i === 0 ? roll : roll * 0.2;
        q.oy = heave;
        q.ox = Math.sin(t * 0.14 * TAU * 0.25) * 0.03;
        q.b = 1;
      }
      /*
       * THE YARDS ARE BRACED ROUND TOWARD THE VIEWER, which is Nam's note and is
       * also just true of the geometry: square sails are set ACROSS the beam, and
       * we watch this ship from abeam, so they were edge on -- three vertical
       * lines where the canvas should be. It is the same fault the flat shapes
       * had, on the one part of a ship that most says ship.
       *
       * A quarter turn would face them dead on and read as a cardboard cutout, so
       * they sit a little short of it and work either side by a fifth of a radian.
       * The hull swings on its own clock, which is what Nam was after: "the boat
       * is going one way, the sail is being blown in a different way."
       */
      for (let j = 0; j < sails.length; j += 1) {
        const q = poses[sails[j]!]!;
        q.a = 1.32 + Math.sin(t * 0.16 * TAU + j * 0.7) * 0.2;
      }
    },
  });
}

/* --- the stork --------------------------------------------------------------
 *
 * IT HAD NO BODY AT ALL, and the cause is worth writing down because it is the
 * kind of bug that hides behind a helper that does almost the right thing.
 *
 * hoop() draws a ring in the HORIZONTAL plane -- it varies x and z at a constant
 * y -- which is exactly right for a lantern, a basin, a pagoda eave. The bird's
 * spine runs along x, so a cross section of it has to vary y and z. Feeding the
 * body to hoop() produced a stack of flat discs threaded along the spine, every
 * one of them at y = 0. The bird had a plan and no elevation. Nam: "the stork's
 * body is literally flat, there is no body to the bird, very bad." Literally is
 * the correct word.
 *
 * Sections now go round the spine, so the body is a solid of revolution and gets
 * a proper barrel. And with real volume available it is worth using: a stork is
 * a HEAVY bird with a short thick neck, not the long thin thing this was.
 *
 * WHAT THE REFERENCES SETTLE. The neck is short and held straight out, about half
 * the body length rather than equal to it. The body is deep and barrel shaped,
 * widest a third of the way back. The beak is long, straight and tapers to a
 * point -- it is the one long thin thing on the bird, and the contrast is what
 * makes the rest read as bulk. The legs trail well past the tail.
 * -------------------------------------------------------------------------- */

function crane(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];
  const body = parts.length;
  parts.push(part(0, 0, 0, 1, 0, 0));
  // Named, not counted. See N205: an inserted part once made the wings disagree.
  let wingL = -1;
  let wingR = -1;

  /** A section ROUND the spine: y and z at a fixed x, which is what a body needs. */
  const section = (x: number, cy: number, r: number, ry: number, n: number,
    g: number, phase = 0): void => {
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * TAU + phase;
      cl.add(x, cy + Math.sin(a) * r * ry, Math.cos(a) * r, body, 0.05, g);
    }
  };

  // The barrel. Deep, widest a third back, tapering to the tail.
  for (let i = 0; i < 16; i += 1) {
    const k = i / 15;
    const x = -0.2 + k * 0.66;
    const r = 0.185 * Math.sin(Math.PI * Math.pow(k, 0.72)) + 0.02;
    // Slightly deeper than wide, and the belly hangs a little below the spine.
    section(x, 0.02 * Math.sin(Math.PI * k), r, 1.12, 10, 0.9, i * 0.31);
  }

  /* The neck: short, thick, and straight out. It was 0.5 long and 0.03 thick,
     which is a heron. Half that length and twice that thickness is a stork. */
  for (let i = 0; i < 9; i += 1) {
    const k = i / 8;
    const x = -0.2 - k * 0.3;
    const y = -0.02 - Math.sin(k * 1.5) * 0.06;
    section(x, y, 0.075 - k * 0.02, 1, 7, 0.95, i * 0.4);
  }
  // The head: a ball, so it cannot thin to a line as the bird turns.
  for (let i = 0; i < 14; i += 1) {
    const yy = 1 - (2 * (i + 0.5)) / 14;
    const rr = Math.sqrt(Math.max(0, 1 - yy * yy)) * 0.062;
    const b = i * 2.39996323;
    cl.add(-0.55 + Math.cos(b) * rr, -0.085 + yy * 0.056, Math.sin(b) * rr, body, 0.05, 1);
  }
  /* The beak: long, straight, tapering. The ONE long thin thing on the bird, and
     the contrast is what makes everything else read as bulk. */
  for (let i = 0; i < 12; i += 1) {
    const k = i / 11;
    const x = -0.6 - k * 0.34;
    const r = 0.032 * (1 - k * 0.86);
    for (let j = 0; j < 3; j += 1) {
      const a = (j / 3) * TAU;
      cl.add(x, -0.085 + Math.sin(a) * r, Math.cos(a) * r, body, 0.05, 1);
    }
  }
  // Legs, trailing well past the tail, which is half of what says stork in
  // flight. Two segments with a joint, not one straight line.
  for (const d of [-1, 1]) {
    run(cl, 0.4, 0.05, d * 0.05, 0.72, 0.11, d * 0.055, 7, body, 0.05, 0.05, 0.85);
    run(cl, 0.72, 0.11, d * 0.055, 1.0, 0.14, d * 0.05, 7, body, 0.05, 0.05, 0.8);
  }
  // The tail, short and fanned.
  for (let i = 0; i < 6; i += 1) {
    const k = i / 5;
    run(cl, 0.42, 0.01, 0, 0.6, 0.03, (k - 0.5) * 0.19, 5, body, 0.05, 0.05, 0.75);
  }

  /* The wings. Twenty primaries each with a swept trailing edge, plus a leading
     edge and a covert row so the wing is a surface and not a comb. */
  for (const d of [-1, 1]) {
    const wp = parts.length;
    if (d < 0) wingL = wp; else wingR = wp;
    parts.push(part(0.02, -0.04, d * 0.09, 1, 0, 0, {
      wave: 0.14, wx: 0, wy: 1, wz: 0,
      // A third of a cycle of lag from shoulder to tip, at the beat's own rate.
      wfreq: 0.34, wrate: 0.62, phase: 0,
    }));
    const span = 0.96;
    for (let f = 0; f < 20; f += 1) {
      const u = f / 19;
      const rootX = 0.02 + u * 0.2;
      const len = 0.34 * (1 - Math.pow(u, 2.4) * 0.55) + 0.06;
      const z = d * (0.09 + u * span);
      for (let i = 0; i < 14; i += 1) {
        const k = i / 13;
        cl.add(rootX + k * len, -0.05 + k * 0.03 * (1 - u), z * (1 - k * 0.04),
          wp, u, k > 0.8 ? 1 : 0.86);
      }
    }
    for (let i = 0; i < 22; i += 1) {
      const u = i / 21;
      cl.add(0.02 + u * 0.2, -0.05, d * (0.09 + u * span), wp, u, 1);
    }
    for (let i = 0; i < 14; i += 1) {
      const u = i / 13;
      cl.add(0.12 + u * 0.2, -0.035, d * (0.09 + u * span * 0.92), wp, u, 0.6);
    }
  }

  /* THE BUNDLE. Nam: "the bag should be like a fabric bag, more round on the
     bottom and gathered on top by the stork's beak. The current bag looks more
     like a lantern, which is not accurate."
     Right, and the fault was in the profile: it swelled widest at two fifths of
     the way down and closed again, which is a lantern. A tied cloth bag is
     PINCHED at the top and spherical below -- widest at two thirds and rounding
     shut at the bottom -- so the profile peaks late and the neck stays narrow for
     the first quarter of it. */
  const sack = parts.length;
  parts.push(part(-0.9, -0.06, 0, 0, 0, 1));
  const bag = (v: number): number =>
    0.028 + 0.18 * Math.pow(Math.sin(Math.PI * Math.pow(v, 1.9)), 0.55);
  const bagY = (v: number): number => 0.02 + v * 0.42;
  for (let i = 0; i < 10; i += 1) {
    const v = i / 9;
    hoop(cl, -0.9 + v * 0.02, bagY(v), 0, bag(v), 12, sack, v, 0.9);
  }
  // Seams down the cloth, which is what says fabric rather than a ball.
  for (let g = 0; g < 6; g += 1) {
    const a = (g / 6) * TAU;
    for (let i = 0; i < 11; i += 1) {
      const v = i / 10;
      const r = bag(v);
      cl.add(-0.9 + v * 0.02 + Math.cos(a) * r, bagY(v), Math.sin(a) * r, sack, v, 0.78);
    }
  }
  // The gather at the top, and the two ears of cloth above the tie.
  hoop(cl, -0.9, 0.0, 0, 0.03, 8, sack, 0, 1);
  run(cl, -0.9, 0.0, 0, -0.83, -0.08, 0, 5, sack, 0, 0, 0.9);
  run(cl, -0.9, 0.0, 0, -0.97, -0.07, 0, 5, sack, 0, 0, 0.9);
  // The cord up to the beak.
  run(cl, -0.92, -0.06, 0, -0.9, 0.0, 0, 3, sack, 0, 0, 0.7);

  /* CLOUDS. Nam: "to make it more immersive, we can add some clouds in the
     background with the bird."
     They sit BEHIND the bird in depth, so the perspective divide dims and shrinks
     them without anything else being done -- which is the whole reason they read
     as distance rather than as decoration. Each is a few overlapping lumps,
     because a cumulus is lumps and a single sphere is a balloon. */
  const sky = parts.length;
  parts.push(part(0, 0, 0, 0, 1, 0));
  const puffs: [number, number, number, number][] = [
    [-0.72, 0.5, 1.15, 0.26], [0.34, 0.62, 1.35, 0.3], [1.0, 0.36, 1.1, 0.2],
    [-1.05, 0.24, 1.5, 0.22], [0.02, 0.78, 0.95, 0.18], [0.86, 0.72, 1.55, 0.24],
  ];
  for (let n = 0; n < puffs.length; n += 1) {
    const [px, py, pz, R] = puffs[n]!;
    for (let lump = 0; lump < 4; lump += 1) {
      const lx = px + (lump - 1.5) * R * 0.62;
      const ly = py - Math.sin(lump * 1.9) * R * 0.2;
      const lr = R * (0.55 + Math.sin(lump * 2.4 + n) * 0.22);
      for (let i = 0; i < 9; i += 1) {
        const yy = 1 - (2 * (i + 0.5)) / 9;
        const rr = Math.sqrt(Math.max(0, 1 - yy * yy)) * lr;
        const b = i * 2.39996323 + n;
        // Flattened, because a cloud sits on its own base.
        cl.add(lx + Math.cos(b) * rr, ly + yy * lr * 0.5, pz + Math.sin(b) * rr,
          sky, 0.5, 0.34);
      }
    }
  }

  return bake(cl, parts, {
    /*
     * It comes in nose on and turns broadside. A bird head on is a cross; a bird
     * broadside is a bird, because that is where the neck, the trailing legs and
     * the sweep of the wing all are. Arriving on the unreadable view and turning
     * onto the readable one makes the turn itself the reveal.
     */
    rate: 0,
    lean: 0.2,
    tilt: 0.07, tiltRate: 0.028,
    arc: (ph, lap) => {
      // From the left on half the laps and the right on the other half.
      const dir = rnd(lap * 53 + 7) < 0.5 ? 1 : -1;
      return [0, 1, dir * (1 - smooth((ph - 0.02) / 0.34)) * 1.45];
    },
    sweepFreq: 0.8,
    sweepRate: 0.35,
    spot: { side: -1, y: 0, s: 0.92 },
    rig: (t, poses) => {
      // Down fast, up slow: the downstroke is the half doing work. A pure sine
      // reads as a mechanism.
      const ph = wrap01(t * 0.62);
      const beat = ph < 0.42
        ? -Math.sin((ph / 0.42) * Math.PI) * 0.52
        : Math.sin(((ph - 0.42) / 0.58) * Math.PI) * 0.3;
      const bq = poses[body]!;
      bq.a = 0;
      // The body rises on the downstroke, a beat behind it.
      bq.oy = beat * 0.09;
      bq.b = 1;
      // Mirrored, because the two wings hinge about the same axis from opposite
      // sides. Addressed by name, so another inserted part cannot break it.
      for (const [w, sign] of [[wingL, 1], [wingR, -1]] as [number, number][]) {
        const q = poses[w]!;
        q.a = beat * sign;
        q.oy = beat * 0.09;
        q.b = 0.94;
      }
      // The bundle swings a beat behind the bird and does not flap.
      const sq = poses[sack]!;
      sq.a = Math.sin(t * 0.62 * TAU - 1.2) * 0.14;
      sq.oy = beat * 0.05;
      sq.ox = Math.sin(t * 0.62 * TAU - 1.6) * 0.02;
      sq.b = 1;
      // The sky drifts the other way, slowly, which is what sells the flying.
      const kq = poses[sky]!;
      kq.a = 0;
      kq.ox = Math.sin(t * 0.06 * TAU) * 0.1 + t * 0.012;
      kq.oy = Math.sin(t * 0.04 * TAU) * 0.03;
      kq.b = 0.9;
    },
  });
}




/* --- the advent star --------------------------------------------------------
 *
 * Nam: "Any other candidate for swedish culture in case the dalahast doesnt work
 * out in 3D?"
 *
 * This one, and it is a better fit for the medium than the horse ever was. An
 * adventsstjarna hangs in a Swedish window from the first Sunday of Advent until
 * well after Christmas -- it is as ordinary and as specific to the place as the
 * horse is, and unlike the horse it is a SOLID: a pierced paper ball with seven
 * points, radially symmetric, lit from inside.
 *
 * Which means it reads from every angle, needs no locked heading, has no
 * silhouette to get wrong, and its whole character is a lit thing seen through a
 * pierced surface. That is four of the things this roster has repeatedly found
 * hard, all absent at once.
 * -------------------------------------------------------------------------- */

function advent(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];

  const CORE = 0.34;
  // Seven points, placed on a sphere so it is a ball with spikes rather than a
  // flat star: five round the equator and one each at top and bottom.
  const dirs: [number, number, number][] = [];
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * TAU;
    dirs.push([Math.cos(a) * 0.94, -0.34, Math.sin(a) * 0.94]);
  }
  dirs.push([0, -1, 0], [0, 1, 0]);

  for (let n = 0; n < dirs.length; n += 1) {
    const [dx, dy, dz] = dirs[n]!;
    const L = n < 5 ? 0.62 : 0.56;
    // A square pyramid on each: four ridges to the tip and a base ring. The
    // ridges are the whole shape and take nearly all of the nodes.
    const ax = Math.abs(dy) > 0.9 ? [1, 0, 0] : [-dz, 0, dx];
    const an = Math.hypot(ax[0]!, ax[1]!, ax[2]!) || 1;
    const ux = ax[0]! / an; const uy = ax[1]! / an; const uz = ax[2]! / an;
    // The other side of the base, perpendicular to both.
    const vx = dy * uz - dz * uy;
    const vy = dz * ux - dx * uz;
    const vz = dx * uy - dy * ux;
    const tipX = dx * (CORE + L);
    const tipY = dy * (CORE + L);
    const tipZ = dz * (CORE + L);
    for (let c = 0; c < 4; c += 1) {
      const a = (c / 4) * TAU + Math.PI / 4;
      const w = 0.2;
      const bx = dx * CORE + (ux * Math.cos(a) + vx * Math.sin(a)) * w;
      const by = dy * CORE + (uy * Math.cos(a) + vy * Math.sin(a)) * w;
      const bz = dz * CORE + (uz * Math.cos(a) + vz * Math.sin(a)) * w;
      run(cl, bx, by, bz, tipX, tipY, tipZ, 15, -1, 0.4, 1, 1);
      // The base edge to the next corner, which closes the pyramid.
      const a2 = ((c + 1) / 4) * TAU + Math.PI / 4;
      const cx2 = dx * CORE + (ux * Math.cos(a2) + vx * Math.sin(a2)) * w;
      const cy2 = dy * CORE + (uy * Math.cos(a2) + vy * Math.sin(a2)) * w;
      const cz2 = dz * CORE + (uz * Math.cos(a2) + vz * Math.sin(a2)) * w;
      run(cl, bx, by, bz, cx2, cy2, cz2, 6, -1, 0.4, 0.4, 0.7);
    }
    // Pierced holes up each point, which is what the paper ones have.
    for (let i = 0; i < 18; i += 1) {
      const a = ((i % 9) / 9) * TAU;
      const w = i < 9 ? 0.085 : 0.055;
      const f = i < 9 ? 0.42 : 0.7;
      cl.add(dx * (CORE + L * f) + (ux * Math.cos(a) + vx * Math.sin(a)) * w,
        dy * (CORE + L * f) + (uy * Math.cos(a) + vy * Math.sin(a)) * w,
        dz * (CORE + L * f) + (uz * Math.cos(a) + vz * Math.sin(a)) * w,
        -1, 0.7, 0.55);
    }
  }

  // The lit core, seen through the gaps between the points.
  for (let i = 0; i < 250; i += 1) {
    const yy = 1 - (2 * (i + 0.5)) / 250;
    const rr = Math.sqrt(Math.max(0, 1 - yy * yy)) * CORE;
    const b = i * 2.39996323;
    cl.add(Math.cos(b) * rr, yy * CORE, Math.sin(b) * rr, -1, 0.1, 0.62);
  }
  // The cord it hangs by.
  const cord = parts.length;
  parts.push(part(0, -CORE - 0.56, 0, 0, 0, 1));
  run(cl, 0, -CORE - 0.56, 0, 0, -1.28, 0, 9, cord, 0, 0, 0.5);

  return bake(cl, parts, {
    rate: 0.13, lean: 0.24,
    tilt: 0.12, tiltRate: 0.032,
    sweepFreq: 1.5,
    // The light walks out from the core along the points, which is what a lit
    // paper star does when you look at one.
    sweepRate: 0.3,
    spot: { side: -1, y: 0, s: 0.92 },
    rig: (t, poses) => {
      for (const q of poses) {
        q.a = Math.sin(t * 0.2 * TAU) * 0.1;
        q.b = 1;
      }
    },
  });
}

/* --- the jellyfish ----------------------------------------------------------
 *
 * THE ONE THING IN THE ROSTER THAT IS ALREADY MADE OF SEPARATE PIECES. Everything
 * else here is a solid object approximated with points, and the approximation is
 * always the compromise. A jellyfish is a translucent bell with a hundred
 * trailing threads: drawn as points it does not look like a version of itself, it
 * looks like the thing.
 *
 * It also moves like nothing else in the set. The bell CONTRACTS and springs back
 * -- the whole body changes size, which no other motif does -- and the tentacles
 * follow a beat behind, so the animation runs down the model rather than sitting
 * on top of it.
 *
 * Radially symmetric, so it reads from any angle and needs no locked heading.
 * -------------------------------------------------------------------------- */

function jellyfish(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];

  const BELL = parts.length;
  parts.push(part(0, -0.62, 0, 0, 1, 0));

  /* The bell: a dome with a frilled margin. Sixteen meridians carry the shape and
     the frill at the rim is what stops it reading as an umbrella. */
  const R = 0.56;
  for (let g = 0; g < 20; g += 1) {
    const a = (g / 20) * TAU;
    for (let i = 0; i < 16; i += 1) {
      const v = i / 15;
      // Slightly pointed at the crown and flaring at the lip, like a real bell.
      const r = Math.sin(v * Math.PI * 0.52) * R * (1 + v * v * 0.18);
      const y = -0.62 + Math.pow(v, 1.15) * 0.6;
      cl.add(Math.cos(a) * r, y, Math.sin(a) * r, BELL, 1 - v * 0.5, 0.9);
    }
  }
  for (const v of [0.28, 0.48, 0.68, 0.88]) {
    const r = Math.sin(v * Math.PI * 0.52) * R * (1 + v * v * 0.18);
    hoop(cl, 0, -0.62 + Math.pow(v, 1.15) * 0.6, 0, r, 26, BELL, 1 - v * 0.5, 0.6);
  }
  // The frilled lip, scalloped between the meridians.
  for (let g = 0; g < 44; g += 1) {
    const a = (g / 44) * TAU;
    const wob = 1 + Math.sin(g * 2.0) * 0.05;
    cl.add(Math.cos(a) * R * 1.18 * wob, -0.02 + Math.sin(g * 2.0) * 0.02,
      Math.sin(a) * R * 1.18 * wob, BELL, 0.5, 1);
  }

  /* THE ORAL ARMS: four broad ruffled ribbons under the bell, short and thick. */
  for (let g = 0; g < 4; g += 1) {
    const a = (g / 4) * TAU + 0.4;
    const ap = parts.length;
    parts.push(part(0, -0.06, 0, 0, 1, 0, {
      wave: 0.11, wx: Math.cos(a), wy: 0, wz: Math.sin(a),
      wfreq: 0.85, wrate: 0.5, phase: g / 4,
    }));
    for (let i = 0; i < 22; i += 1) {
      const k = i / 21;
      const r = 0.06 + Math.sin(k * Math.PI * 0.8) * 0.13;
      const y = -0.02 + k * 0.72;
      // Two edges, so an arm is a ribbon rather than a string.
      for (const e of [-1, 1]) {
        const b = a + e * (0.16 + Math.sin(k * 3.0) * 0.06);
        cl.add(Math.cos(b) * r, y, Math.sin(b) * r, ap, k, 0.82 - k * 0.2);
      }
    }
  }

  /* THE TENTACLES: long, fine, and the reason this model belongs here. Each is
     its own part so the beat travels down the whole animal out of step. */
  for (let g = 0; g < 20; g += 1) {
    const a = (g / 20) * TAU;
    const tp = parts.length;
    parts.push(part(0, -0.04, 0, 0, 1, 0, {
      wave: 0.19, wx: Math.cos(a + 1.2), wy: 0, wz: Math.sin(a + 1.2),
      wfreq: 1.15, wrate: 0.62, phase: g / 20,
    }));
    const r0 = R * (1.02 + (g % 2) * 0.1);
    for (let i = 0; i < 28; i += 1) {
      const k = i / 27;
      // They drift inward as they fall, the way something being towed does.
      const r = r0 * (1 - k * 0.42);
      cl.add(Math.cos(a) * r, -0.03 + k * 1.34, Math.sin(a) * r,
        tp, k, 0.72 - k * 0.34);
    }
  }

  return bake(cl, parts, {
    rate: 0.1, lean: 0.2,
    tilt: 0.11, tiltRate: 0.03,
    sweepFreq: 1.2, sweepRate: 0.34,
    spot: { side: -1, y: 0, s: 0.92 },
    /*
     * IT SWIMS, which means it rises on the contraction and sinks on the recovery.
     * The lift is what makes it an animal rather than a lamp: a jellyfish that
     * pulsed on the spot would read as a decoration of one.
     */
    lift: (t) => Math.sin(t * 0.34 * TAU - 0.9) * 0.05,
    rig: (t, poses) => {
      // Fast squeeze, slow spring back. A pure sine reads as breathing; this
      // reads as swimming, and it is the same asymmetry the crane's wing uses.
      const ph = wrap01(t * 0.34);
      const sq = ph < 0.34
        ? Math.sin((ph / 0.34) * Math.PI) * 0.9
        : -Math.sin(((ph - 0.34) / 0.66) * Math.PI) * 0.28;
      for (let i = 0; i < poses.length; i += 1) {
        const q = poses[i]!;
        q.a = 0;
        if (i === 0) {
          // The bell squeezes: it pulls up and in as it contracts.
          q.oy = -sq * 0.09;
          q.b = 0.86 + 0.14 * Math.max(0, sq);
        } else {
          // Everything hanging under it follows a beat late.
          q.oy = -sq * 0.05;
          q.b = 0.84 + 0.16 * Math.sin(t * 0.5 + i);
        }
      }
    },
  });
}

/* --- the armillary ----------------------------------------------------------
 *
 * A SPHERE OF RINGS ON AN AXIS: the old instrument for modelling the sky, and the
 * one candidate whose entire substance is circles at angles to each other.
 *
 * It earns its place by being unambiguously three dimensional in a way nothing
 * else here manages. Every other motif proves its depth by turning; this one
 * proves it standing still, because rings crossing at angles cannot be read as
 * flat even in a photograph. And the rings turn at different rates about
 * different axes, which is a rig nothing else in the roster has.
 * -------------------------------------------------------------------------- */

function armillary(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];
  const R = 0.78;

  /** A ring of points, tilted about x by `tilt` then about y by `spin`. */
  const ring = (rad: number, tilt: number, spin: number, n: number,
    pi: number, g: number, band: number): void => {
    const ct = Math.cos(tilt); const st = Math.sin(tilt);
    const cs = Math.cos(spin); const ss = Math.sin(spin);
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * TAU;
      for (const w of band > 0 ? [-band, band] : [0]) {
        const x0 = Math.cos(a) * rad;
        const y0 = w;
        const z0 = Math.sin(a) * rad;
        const y1 = y0 * ct - z0 * st;
        const z1 = y0 * st + z0 * ct;
        cl.add(x0 * cs - z1 * ss, y1, x0 * ss + z1 * cs, pi, i / n, g);
      }
    }
  };

  // The fixed frame: a horizon ring and a meridian, which do not move.
  ring(R * 1.14, Math.PI / 2, 0, 64, -1, 1, 0.035);
  ring(R * 1.2, 0, 0, 64, -1, 0.95, 0.03);
  /* Graduations on the horizon ring. An armillary is an INSTRUMENT, and the
     scale is what says so -- a bare hoop is a hoop. */
  for (let i = 0; i < 48; i += 1) {
    const a = (i / 48) * TAU;
    const long = i % 4 === 0;
    run(cl, Math.cos(a) * R * 1.09, 0, Math.sin(a) * R * 1.09,
      Math.cos(a) * R * (long ? 1.19 : 1.15), 0, Math.sin(a) * R * (long ? 1.19 : 1.15),
      long ? 4 : 2, -1, 0.3, 0.3, long ? 0.9 : 0.55);
  }
  // The polar axis, tilted the way these instruments always are.
  const AX = 0.41;
  for (let i = 0; i < 26; i += 1) {
    const k = i / 25 - 0.5;
    cl.add(Math.sin(AX) * k * 2.5 * 0.62, Math.cos(AX) * k * 2.5 * 0.62, 0, -1, 0.5, 0.8);
  }

  /* THE MOVING RINGS: equator, two tropics and a zodiac band, all on the polar
     axis and all turning at their own rate. */
  const rings: [number, number, number, number][] = [
    [R, 0, 48, 0.03],
    [R * 0.82, 0.42, 40, 0.022],
    [R * 0.82, -0.42, 40, 0.022],
    [R * 1.02, 0.62, 52, 0.032],
  ];
  for (let n = 0; n < rings.length; n += 1) {
    const [rad, tilt, cnt, band] = rings[n]!;
    const pi = parts.length;
    // They all turn about the polar axis, which is what makes it an instrument
    // rather than a pile of hoops.
    parts.push(part(0, 0, 0, Math.sin(AX), Math.cos(AX), 0, { phase: n / rings.length }));
    ring(rad, tilt + AX * 0.4, 0, cnt, pi, n === 3 ? 1 : 0.88, band);
  }

  // A small globe at the centre, which is what the whole frame is about.
  for (let i = 0; i < 160; i += 1) {
    const yy = 1 - (2 * (i + 0.5)) / 160;
    const rr = Math.sqrt(Math.max(0, 1 - yy * yy)) * 0.17;
    const b = i * 2.39996323;
    cl.add(Math.cos(b) * rr, yy * 0.17, Math.sin(b) * rr, -1, 0.1, 0.66);
  }

  // The stand: a foot and two supports up to the horizon ring.
  hoop(cl, 0, 1.06, 0, 0.3, 28, -1, 0, 0.8);
  hoop(cl, 0, 1.0, 0, 0.22, 20, -1, 0, 0.6);
  for (const d of [-1, 1]) {
    run(cl, d * 0.28, 1.06, 0, d * R * 1.14 * 0.72, R * 1.14 * 0.7, 0, 16, -1, 0, 0, 0.75);
  }
  run(cl, 0, 1.06, 0, 0, R * 1.2, 0, 8, -1, 0, 0, 0.7);

  return bake(cl, parts, {
    rate: 0.13, lean: 0.24,
    tilt: 0.1, tiltRate: 0.03,
    sweepFreq: 1.3, sweepRate: 0.26,
    spot: { side: -1, y: 0, s: 0.92 },
    rig: (t, poses) => {
      for (let i = 0; i < poses.length; i += 1) {
        const q = poses[i]!;
        // Each ring on its own rate, alternating direction, so the frame reads as
        // a mechanism rather than as one object spinning.
        q.a = t * (0.2 + i * 0.07) * (i % 2 === 0 ? 1 : -1);
        q.b = 1;
      }
    },
  });
}

/* --- the fountain -----------------------------------------------------------
 *
 * WATER IS THE ONE SUBJECT THAT IS HONESTLY A CLOUD OF POINTS. A jet breaking
 * into droplets, arcs falling from a basin lip -- that is not a solid being
 * approximated, it is the thing itself, and it is the second motif in the set
 * where the medium stops being a compromise.
 *
 * It is also the only one whose animation is a FLOW rather than a wobble. Every
 * other rig here moves a shape and puts it back; this one has droplets travelling
 * a path and looping, which is a different kind of motion entirely and the reason
 * it is worth the slot.
 * -------------------------------------------------------------------------- */

function fountain(): Model {
  const cl = new Cloud();
  const parts: Part[] = [];

  // Two basins and a pedestal, which is the architecture the water needs.
  const basins: [number, number][] = [[0.62, 0.3], [0.34, -0.28]];
  for (let n = 0; n < basins.length; n += 1) {
    const [r, y] = basins[n]!;
    hoop(cl, 0, y, 0, r, 38, -1, 0.1, 0.95);
    hoop(cl, 0, y + 0.09, 0, r * 0.84, 30, -1, 0.1, 0.6);
    // A scalloped underside, so a basin is a bowl and not a disc.
    for (let g = 0; g < 26; g += 1) {
      const a = (g / 26) * TAU;
      run(cl, Math.cos(a) * r, y, Math.sin(a) * r,
        Math.cos(a) * r * 0.3, y + 0.16, Math.sin(a) * r * 0.3, 5, -1, 0.1, 0.1, 0.45);
    }
  }
  // The column between them, and the foot.
  for (let g = 0; g < 6; g += 1) {
    const a = (g / 6) * TAU;
    run(cl, Math.cos(a) * 0.07, 0.72, Math.sin(a) * 0.07,
      Math.cos(a) * 0.05, -0.34, Math.sin(a) * 0.05, 14, -1, 0.15, 0.15, 0.8);
  }
  hoop(cl, 0, 0.78, 0, 0.42, 26, -1, 0, 0.85);
  hoop(cl, 0, 0.72, 0, 0.34, 20, -1, 0, 0.6);

  /* THE JET AND THE FALLING WATER. Each stream is a part, and its droplets are
     spread along the path by their own u -- so setting the part's ripple to zero
     and moving the droplets instead makes the water FLOW rather than wobble. */
  const jets = 14;
  for (let g = 0; g < jets; g += 1) {
    const a = (g / jets) * TAU;
    const jp = parts.length;
    parts.push(part(0, -0.34, 0, 0, 1, 0, { phase: g / jets }));
    // Up out of the top and over, into the upper basin.
    for (let i = 0; i < 18; i += 1) {
      const k = i / 17;
      const r = Math.sin(k * Math.PI * 0.9) * 0.3;
      const y = -0.34 - Math.sin(k * Math.PI) * 0.42 + k * 0.06;
      cl.add(Math.cos(a) * r, y, Math.sin(a) * r, jp, k, 1 - k * 0.25);
    }
  }
  // The falls: sheets of droplets from each basin lip to the one below.
  for (let n = 0; n < basins.length; n += 1) {
    const [r, y] = basins[n]!;
    const drop = n === 0 ? 0.62 : 0.5;
    for (let g = 0; g < 26; g += 1) {
      const a = (g / 26) * TAU;
      const fp = parts.length;
      parts.push(part(Math.cos(a) * r, y, Math.sin(a) * r, 0, 1, 0,
        { phase: rnd(n * 40 + g) }));
      for (let i = 0; i < 10; i += 1) {
        const k = i / 9;
        // Falling and drifting outward a little, which is what a lip does.
        cl.add(Math.cos(a) * (r + k * 0.07), y + k * drop, Math.sin(a) * (r + k * 0.07),
          fp, k, 0.8 - k * 0.3);
      }
    }
  }

  return bake(cl, parts, {
    rate: 0.12, lean: 0.26,
    tilt: 0.1, tiltRate: 0.03,
    sweepFreq: 1.1, sweepRate: 0.3,
    spot: { side: -1, y: 0, s: 0.92 },
    rig: (t, poses) => {
      for (let i = 0; i < poses.length; i += 1) {
        const q = poses[i]!;
        q.a = 0;
        /*
         * The droplets fall on a loop. Each stream runs on its own phase, and the
         * brightness rises and dies across the fall so nothing pops into being at
         * the top or piles up at the bottom -- which is what makes it read as
         * water passing through rather than as a fixed string of beads.
         */
        const ph = wrap01(t * 0.55 + parts[i]!.phase);
        q.oy = (ph - 0.5) * 0.16;
        q.b = 0.5 + 0.5 * Math.sin(Math.PI * ph);
      }
    },
  });
}

/* --- the programmes --------------------------------------------------------- */

export interface Programme {
  id: string;
  label: string;
  /** Seconds per formation, holding and flying. */
  cycle: number;
  /** How much of that is spent held rather than in transit. */
  held: number;
  /** Where the frozen frame sits, in seconds, for reduced motion. */
  still: number;
  forms: Formation[];
  /** Seeded on the first frame, not at module load. See ASSIGNMENT. */
  slots: Int16Array[] | null;
  /** Refinement trials still owed, spent a slice at a time during a hold. */
  owed: number;
  /** Refinement generator state, carried across slices. */
  rng: number;
}

function programme(
  id: string, label: string, cycle: number, held: number, still: number, models: Model[],
): Programme {
  return {
    id, label, cycle, held, still, forms: models.map(formation),
    slots: null, owed: 0, rng: 0,
  };
}

export const PROGRAMMES: Programme[] = [
  /*
   * Geometry first, which makes it the default, and Nam has given it a reason to
   * be: it is the benchmark. A wrong transit shows up here with nothing to blame
   * it on.
   */
  programme('geometry', 'Geometry', 8.5, 0.62, 17.7, GEOMETRY),
  /*
   * The still is deliberately mid transit for neither of these -- a transit
   * sampled at one instant is a formless cloud, and reduced motion deserves a
   * FORMATION. It lands on the lotus, a third of the way through its hold, which
   * is where the breath is open and the light sweep is halfway out.
   */
  programme('culture', 'Culture', 12, 0.7, 4.1, [
    /*
     * ELEVEN CANDIDATES FOR EIGHT SLOTS, and that is deliberate. Nam: "We
     * actually have quite a lot of candidate damn. Let's add all these into the
     * shape list, then we can select the best 8 for the job."
     *
     * Which is the same method that chose the animation in the first place: put
     * them all on the real screen at the real size and cut the three that lose.
     * One round of that has already happened: the statue, the castle and the dala
     * horse went, and a jellyfish, an armillary sphere and a fountain came in.
     * Choosing between models from a description is how the branch, the tree and
     * the balloons all got built and then thrown away.
     */
    lotus(), lanterns(), carousel(), pagoda(),
    tallship(), crane(), maypole(), advent(),
    jellyfish(), armillary(), fountain(),
  ]),
];

/* --- the draw ---------------------------------------------------------------
 *
 * ROTATION IS SHARED, AND THAT IS NOT A COMPROMISE. Nam worked out for himself
 * that turning the model rather than orbiting a camera gets parallax for free --
 * it does, and it comes from the perspective divide rather than from the
 * rotation, so there is nothing to compute for it either way.
 *
 * What is worth spelling out is why both formations rotate by the SAME angle
 * during a handover. A common rotation is an isometry: it moves every point
 * without changing any distance between two of them. So the assignment computed
 * above against unrotated models stays exactly as good at any angle. Give the
 * two formations independent angles and that guarantee is gone -- the pairing
 * would be optimal for a pose the show is never actually in.
 *
 * Per model speed survives anyway, because only one model is ever the subject:
 * the angle is the integral of the running order's rates, which is continuous
 * across a handover and is still a pure function of time.
 * -------------------------------------------------------------------------- */

/** Accumulated yaw. Continuous across handovers, so nothing ever snaps. */

/* --- what changes between viewings ------------------------------------------
 *
 * Nam: "I also want some randomness in the extra rotation direction/axis - the
 * main direction is still horizontally, but any extra rotation axis should not be
 * the same, so we add rewatchability."
 *
 * So the secondary axes are re-drawn once per shape per LAP: which way each one
 * leans first, and a little jitter on the rate. NOT where it starts -- every one
 * of them starts at zero, every time, which is what N187 is about.
 *
 * Still a pure function of time, because the lap is one -- floor(t / a lap) --
 * and the draw is deterministic given it. Nothing accumulates, and reloading the
 * page an hour in gives the same sky as leaving it running would have.
 */
interface Vary { st: number; sw: number; sb: number; y0: number; jit: number }

function varyOf(shape: number, lap: number): Vary {
  const k = shape * 37 + lap * 101;
  return {
    st: rnd(k + 1) < 0.5 ? -1 : 1,
    sw: rnd(k + 2) < 0.5 ? -1 : 1,
    sb: rnd(k + 3) < 0.5 ? -1 : 1,
    y0: rnd(k + 8) * 2 - 1,
    // Never far from the authored rate: this is meant to be a different viewing
    // of the same show, not a different show.
    jit: 0.82 + rnd(k + 7) * 0.42,
  };
}


function poseInto(f: Formation, t: number): void {
  const m = f.m;
  if (m.rig) m.rig(t, f.poses);
  for (let i = 0; i < m.parts.length; i += 1) {
    const p = m.parts[i]!;
    const a = f.poses[i]!.a;
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const tt = 1 - cs;
    const x = p.ax;
    const y = p.ay;
    const z = p.az;
    const o = i * 9;
    const M = f.mat;
    // Rodrigues. One of these per part per frame, not one per node -- which is
    // the entire reason a rigged model costs nothing to animate.
    M[o] = tt * x * x + cs; M[o + 1] = tt * x * y - sn * z; M[o + 2] = tt * x * z + sn * y;
    M[o + 3] = tt * x * y + sn * z; M[o + 4] = tt * y * y + cs; M[o + 5] = tt * y * z - sn * x;
    M[o + 6] = tt * x * z - sn * y; M[o + 7] = tt * y * z + sn * x; M[o + 8] = tt * z * z + cs;
  }
}

/* Where a node actually is this frame, rig and all. Written into these three
   rather than returned, because returning a tuple here would allocate three
   thousand arrays a second for no reason.

   NAMED AT LENGTH ON PURPOSE, and the short names cost half a day. They were ax,
   ay and az; the draw loop then destructured a pose into ay and az and shadowed
   two of them, so every drone read the yaw as its own height and the dolly as its
   own depth. Every geometry shape collapsed to a horizontal line at the moment it
   assembled. TypeScript is perfectly happy for a block const to shadow a module
   one, so nothing caught it but looking at the numbers. */
let outX = 0;
let outY = 0;
let outZ = 0;

function posed(f: Formation, s: number, t: number): void {
  outX = f.fx[s]!; outY = f.fy[s]!; outZ = f.fz[s]!;
  const pi = f.fp[s]!;
  if (pi < 0) return;
  const p = f.m.parts[pi]!;
  const M = f.mat;
  const o = pi * 9;
  const dx = outX - p.hx;
  const dy = outY - p.hy;
  const dz = outZ - p.hz;
  outX = p.hx + M[o]! * dx + M[o + 1]! * dy + M[o + 2]! * dz;
  outY = p.hy + M[o + 3]! * dx + M[o + 4]! * dy + M[o + 5]! * dz;
  outZ = p.hz + M[o + 6]! * dx + M[o + 7]! * dy + M[o + 8]! * dz;
  if (p.wave !== 0) {
    const u = f.fu[s]!;
    const amp = Math.sin((u * p.wfreq - t * p.wrate + p.phase) * TAU) * p.wave
      * (p.wbase + (1 - p.wbase) * u);
    outX += p.wx * amp;
    outY += p.wy * amp;
    outZ += p.wz * amp;
  }
  const q = f.poses[pi]!;
  outX += q.ox;
  outY += q.oy;
  outZ += q.oz;
}

/* --- batched output ---------------------------------------------------------
 *
 * The first pass drew every drone with its own beginPath, arc and fill, and set
 * globalAlpha and fillStyle in between. That is five hundred canvas calls for
 * every hundred craft, most of them state changes, and it is why 264 felt like
 * the ceiling.
 *
 * Brightness is quantised into twelve bands and dot size into four, which gives
 * ninety six buckets counting the accent colour. Every drone lands in one, the
 * buckets are filled by a counting sort, and each is drawn as ONE path with one
 * fill. So the per drone cost is two path operations and no state changes at
 * all, and 1400 craft come out cheaper than 264 did.
 *
 * The quantising is invisible: twelve steps across an alpha range of 0.7 is a
 * step of 0.029 on a two pixel dot.
 * -------------------------------------------------------------------------- */

const BANDS = 12;
const RADS = 4;
const BUCKETS = BANDS * RADS * 2;
const A_MAX = 0.8;
const R_MIN = 0.85;
const R_SPAN = 1.5;

const sx = new Float32Array(FLEET);
const sy = new Float32Array(FLEET);
const sk = new Int32Array(FLEET);
const heads = new Int32Array(BUCKETS + 1);
const starts = new Int32Array(BUCKETS);
const ox = new Float32Array(FLEET);
const oy = new Float32Array(FLEET);

export function drawShow(
  c: CanvasRenderingContext2D, w: number, hh: number, t: number, pal: Pal, p: Programme,
  copy: Copy,
): void {
  const N = p.forms.length;
  if (!p.slots) {
    p.slots = seedSlots(p.forms);
    p.owed = FLEET * N * REFINE;
    p.rng = 0x9e3779b9;
  }
  const slots = p.slots;

  const idx = Math.floor(t / p.cycle) % N;
  const nxt = (idx + 1) % N;
  const ph = (t % p.cycle) / p.cycle;
  const tr = ph <= p.held ? 0 : (ph - p.held) / (1 - p.held);

  /*
   * A slice of refinement, and only while a formation is held. See ASSIGNMENT:
   * swapping two drones' targets does not move either target, so during a hold
   * this is invisible, and mid transit it would be two craft changing their minds
   * in mid air. The first hold is ten seconds and the whole budget takes under
   * one, so the guard should never actually fire.
   */
  if (p.owed > 0 && tr === 0) p.owed -= refine(p, Math.min(p.owed, SLICE));

  const A = p.forms[idx]!;
  const B = p.forms[nxt]!;
  const sa = slots[idx]!;
  const sb = slots[nxt]!;

  /*
   * THE RIGS RESET WITH THE SHAPE TOO, and for the same reason the rotation does.
   * A rig on wall clock means a lotus lands at a different point in its breath
   * every lap, a crane lands mid-beat or at the top of one at random, and the
   * sheet's wave is wherever it happens to be. That is the same inconsistency
   * N187 is about, arriving through a different door.
   *
   * So a rig runs on time-since-this-shape-assembled. The outgoing one is that
   * many seconds in; the incoming one is NEGATIVE, counting up to zero at the
   * moment it lands, which is what makes it continuous across the handover rather
   * than starting with a jolt.
   *
   * The lotus assembling closed and then blooming is a side effect of this, and
   * it is a better opening than the one it replaces.
   */
  const tA = ph * p.cycle;
  const tB = (ph - 1) * p.cycle;
  poseInto(A, tA);
  poseInto(B, tB);

  /*
   * ONE ROTATION, BUILT FROM TWO RECIPES. The primaries accumulate across the
   * whole show; the secondaries are read off each shape and crossfaded by the
   * transit, so the outgoing shape's second axis eases into the incoming one's
   * rather than switching at the handover. Both sets of points then get the same
   * matrix, which is what keeps the assignment valid -- see the note on Turn.
   */
  const lap = Math.floor(t / (p.cycle * N));
  const [aYaw, aLean, aRoll, aZoom] = poseAt(A.m, ph, p.cycle, idx, lap);
  /*
   * The incoming shape is read at ph = 0, which is its NEUTRAL -- so whatever the
   * outgoing shape has wandered to, the handover eases onto a pose the viewer has
   * seen this shape land in every other time. That is the consistency.
   */
  /*
   * THE INCOMING SHAPE IS READ ON A NEGATIVE PHASE, which is the fix for the
   * thing Nam could see: "its very obvious each shape stops rotating and
   * reverting the rotation right before the transition -- it gives away the
   * secret."
   *
   * It was doing exactly that. The old handover eased from where the outgoing
   * shape had wandered to onto the incoming shape's neutral -- a fixed angle --
   * so the blend was pulling BACKWARDS against a shape that was still coherent
   * enough to watch. You could see it brake.
   *
   * Reading the incoming shape at ph - 1 instead means it is already turning on
   * its own approach, arriving at its neutral exactly as it lands. Both shapes
   * are now rotating FORWARD at every instant, so there is nothing to unwind and
   * nothing that can be seen braking.
   */
  const [bYaw, bLean, bRoll, bZoom] = poseAt(B.m, ph - 1, p.cycle, nxt, nxt === 0 ? lap + 1 : lap);

  /*
   * AND THE SWAP ITSELF HIDES IN THE SCRAMBLE, which was Nam's own suggestion:
   * "I wonder if this reset could be done instantaneously while the drones are
   * all scrambled, just so it doesnt look like the rotation was disrupted."
   *
   * Nearly instantaneously. The fleet is most dispersed around the middle of a
   * transit -- craft leave in waves over the first 0.42 of it, so by half way the
   * earliest are landing while the latest have barely gone -- and the whole
   * handover of rotation now happens inside that window. Before it, the outgoing
   * shape turns at its own rate untouched; after it, the incoming one does.
   *
   * A true step would be cheaper and is worse: a few craft are always coherent,
   * and they would jump.
   */
  const kRot = smooth((tr - 0.34) / 0.34);
  const yaw = aYaw + (bYaw - aYaw) * kRot;
  const lean = aLean + (bLean - aLean) * kRot;
  const roll = aRoll + (bRoll - aRoll) * kRot;
  /*
   * The camera is on its own clock and pulls out FASTER than that. Nam, on the
   * torus: "it goes into the donut hole then stays there for a while before
   * transitioning to the next, I think that delay is a bit long." It was riding
   * the rotation blend, so it hung at full zoom through the first third of the
   * transit. Now the dive ends the moment the fleet starts to leave.
   */
  const zoom = aZoom + (bZoom - aZoom) * smooth(tr / 0.45);

  const cy0 = Math.cos(yaw);
  const sy0 = Math.sin(yaw);
  const cl0 = Math.cos(lean);
  const sl0 = Math.sin(lean);
  const cr0 = Math.cos(roll);
  const sr0 = Math.sin(roll);

  const scale = Math.min(w, hh) * 0.5;
  const cx = w / 2;
  const cyy = hh / 2;

  /*
   * NARROW SCREENS BRING EVERYTHING BACK TO THE MIDDLE, and it is one line rather
   * than a second set of coordinates. The spots put a motif out in a margin, and
   * on a phone there are no margins -- the copy is the full width, so a spot at
   * 0.7 of the half width is behind the words rather than beside them. One
   * centred formation at full size is the better answer there.
   */
  /*
   * WHERE A MODEL ACTUALLY GOES, worked out against this viewport rather than
   * assumed. The margin beside the fixed 560px column is what there is to play
   * with; a model is centred in it and shrunk to fit if it does not.
   */
  // The free space each side of the copy, and where the middle of it is. Both
  // sides are measured, because once the column slides right they are different.
  const freeL = copy.left;
  const freeR = w - copy.right;
  const place = (m: Model): [number, number, number] => {
    const side = m.spot.side;
    const free = side < 0 ? freeL : freeR;
    if (side === 0 || free < MIN_MARGIN) {
      // A model authored centred, or a screen with no margin worth using: full
      // size in the middle, which is what the geometry set wants everywhere and
      // what every motif falls back to on a phone.
      return [0, m.spot.y * cyy, (side === 0 ? m.spot.s : 1) * scale];
    }
    // 0.94 rather than 1, so a model never quite touches the copy or the edge.
    const fit = (free * 0.94) / (m.rad * 2);
    const mid = side < 0 ? free / 2 : w - free / 2;
    return [mid - cx, m.spot.y * cyy, Math.min(m.spot.s * scale, fit)];
  };
  const [axp, ayp, asp] = place(A.m);
  const [bxp, byp, bsp] = place(B.m);
  // Interpolated with everything else, so a motif in the left margin becoming one
  // in the right margin SLIDES rather than cutting. The fleet relocating across
  // the screen is the most drone-show thing in the whole running order.
  const aLift = A.m.lift ? A.m.lift(tA) * asp : 0;
  const bLift = B.m.lift ? B.m.lift(tB) * bsp : 0;
  const spotX = axp + (bxp - axp) * tr;
  const spotY = ayp + (byp - ayp) * tr + aLift + (bLift - aLift) * tr;
  // The dolly, which only the torus ever asks for. It multiplies the drawing
  // scale rather than moving anything in the scene, so it cannot push a point
  // through the near plane and it cannot shear the shape on its way past.
  const spotS = (asp + (bsp - asp) * tr) * zoom;

  const swA = A.m.sweepRate;
  const swB = B.m.sweepRate;

  let m = 0;
  heads.fill(0);

  for (let i = 0; i < FLEET; i += 1) {
    /*
     * Its own moment to leave and its own time in the air. Without this the fleet
     * moves as one body, which is the single tell that separates a drone show
     * from a shape being tweened.
     */
    const off = rnd(i * 3 + 1) * 0.42;
    const uu = tr <= off ? 0 : clamp01((tr - off) / (1 - off));
    // Smoothstep: it leaves gently and arrives gently, which is what something
    // with mass and a flight controller does.
    const k = uu * uu * (3 - 2 * uu);

    const s1 = sa[i]!;
    const s2 = sb[i]!;

    posed(A, s1, tA);
    const x1 = outX;
    const y1 = outY;
    const z1 = outZ;
    posed(B, s2, tB);

    /*
     * The bow. Real craft climb over each other rather than sliding along a
     * chord. It is much smaller than it was: with a real assignment the paths are
     * short, and a large bow on a short path reads as a detour rather than as an
     * avoidance.
     */
    const bow = Math.sin(k * Math.PI) * (rnd(i * 5 + 2) - 0.5) * 0.28;
    let x = x1 + (outX - x1) * k + bow * 0.4;
    let y = y1 + (outY - y1) * k + bow;
    let z = z1 + (outZ - z1) * k + bow * 0.4;

    // Yaw about the model vertical, then lean about the screen horizontal, then
    // roll in the screen plane. All three shared. See the note above on Turn.
    const rx = x * cy0 - z * sy0;
    const rz = x * sy0 + z * cy0;
    x = rx;
    const ly = y * cl0 - rz * sl0;
    z = y * sl0 + rz * cl0;
    y = ly;
    if (sr0 !== 0) {
      const px2 = x * cr0 - y * sr0;
      y = x * sr0 + y * cr0;
      x = px2;
    }

    const den = FOV + z;
    // A near plane, and it is not defensive: the standby shell reaches 2.4, and a
    // point that gets behind the camera flips sign through the divide and lands
    // somewhere absurd at an enormous size.
    if (den < 1) continue;
    const d = FOV / den;
    /*
     * The spot is applied in SCREEN space, after the projection, and the model's
     * own size before it. Offsetting in the scene instead would push a motif
     * through the perspective divide, so a lantern parked out to the right would
     * shear as the fleet turned -- which is a lens effect rather than a formation
     * doing something.
     */
    const px = cx + spotX + x * d * spotS;
    const py = cyy + spotY + y * d * spotS;
    if (px < -8 || py < -8 || px > w + 8 || py > hh + 8) continue;

    // Depth carried by brightness rather than by occlusion. Sorting 1400 points
    // back to front every frame would be the most expensive thing on this screen
    // and would buy almost nothing at this dot size.
    const near = clamp01((d - 0.74) / 0.72);

    // Brightness: the node's own, times what its part is doing, times the light
    // sweep travelling through the model, times depth, times a slow flicker.
    let gl = A.fg[s1]! + (B.fg[s2]! - A.fg[s1]!) * k;
    const p1 = A.fp[s1]!;
    const p2 = B.fp[s2]!;
    const b1 = p1 >= 0 ? A.poses[p1]!.b : 1;
    const b2 = p2 >= 0 ? B.poses[p2]!.b : 1;
    gl *= b1 + (b2 - b1) * k;
    /*
     * The light sweep travelling out through the model, blended rather than
     * switched. The first version picked A's sweep below the halfway point of the
     * transit and B's above it, which is a step of up to 0.42 in brightness at the
     * moment a craft crosses -- and since every craft crosses at its own moment,
     * it came out as scattered twinkling through the whole handover rather than as
     * one honest cut.
     */
    if (swA !== 0 || swB !== 0) {
      const wA = 0.58 + 0.42 * (0.5 + 0.5 * Math.cos((A.fu[s1]! * A.m.sweepFreq - tA * swA) * TAU));
      const wB = 0.58 + 0.42 * (0.5 + 0.5 * Math.cos((B.fu[s2]! * B.m.sweepFreq - tB * swB) * TAU));
      gl *= wA + (wB - wA) * k;
    }
    // Small on purpose: a field of lights that all pulse together is a string of
    // fairy lights, and one that pulses fast is a hazard warning.
    const tw = 0.82 + 0.18 * Math.sin(t * 1.6 + i * 1.31);
    /*
     * Nam: "they are a bit fainted (just a teeny tiny bit)". So the floor and the
     * range both come up about a sixth. Deliberately a sixth and not a third: what
     * carries depth here is that a craft on the far side is dimmer than one on the
     * near side, and lifting the floor faster than the range would flatten the
     * very thing that says this is a solid rather than a drawing.
     */
    const al = (0.12 + near * 0.63) * gl * tw;
    if (al < 0.012) continue;

    const band = Math.min(BANDS - 1, (al / A_MAX) * BANDS | 0);
    const radb = Math.min(RADS - 1, (near * RADS) | 0);
    // A handful in the accent, the way a real fleet carries a second colour.
    // Every eleventh, so they are scattered rather than banded.
    const acc = i % 11 === 3 ? 1 : 0;
    const bucket = (band * RADS + radb) * 2 + acc;

    sx[m] = px;
    sy[m] = py;
    sk[m] = bucket;
    heads[bucket + 1] += 1;
    m += 1;
  }

  for (let b = 0; b < BUCKETS; b += 1) heads[b + 1] += heads[b]!;
  for (let b = 0; b < BUCKETS; b += 1) starts[b] = heads[b]!;
  for (let i = 0; i < m; i += 1) {
    const b = sk[i]!;
    const at = starts[b]!;
    ox[at] = sx[i]!;
    oy[at] = sy[i]!;
    starts[b] = at + 1;
  }

  for (let b = 0; b < BUCKETS; b += 1) {
    const from = heads[b]!;
    const to = heads[b + 1]!;
    if (to === from) continue;
    const acc = b & 1;
    const rest = b >> 1;
    const radb = rest % RADS;
    const band = (rest / RADS) | 0;
    c.globalAlpha = ((band + 0.5) / BANDS) * A_MAX;
    c.fillStyle = acc ? pal.accent : pal.line;
    const r = R_MIN + ((radb + 0.5) / RADS) * R_SPAN;
    c.beginPath();
    for (let i = from; i < to; i += 1) {
      c.moveTo(ox[i]! + r, oy[i]!);
      c.arc(ox[i]!, oy[i]!, r, 0, TAU);
    }
    c.fill();
  }

  c.globalAlpha = 1;
  c.fillStyle = pal.line;
}
