# Build plan: the drone show

Written after Nam's review of the shipped version, which was blunt and correct:
"simple ass 2D images not even animating and no coloring", and the standard he
set is the Shenzhen record show — a surfaced, ornate palace lantern assembled and
animated by thousands of craft.

This plan covers the ENGINE and the FIRST MODEL only. More motifs get added to
the running order later against the same engine; the point of doing it this way
is that the second model should be a day of authoring, not another rewrite.

**Status: phases 2, 4, 5, 6 and 7 are built.** `src/ui/drones.ts` is the engine
and both motifs; the seven texture variants and the four picture themes are gone.
Phase 1 (the harness) and phase 3 (the bake-off) are NOT done — see §14, which records
where the build diverged from this plan and why. Decisions marked **OPEN** still
need Nam.

---

## 0. What is actually wrong with the shipped version

Three faults, and only one of them is the one people notice first.

**Fault 1 — the mapping is arbitrary, so the transit is a scramble.**
`src/ui/start.ts` flies drone `i` to point `i` of the next shape. Point `i` of a
sphere and point `i` of a cube have no relationship, so every drone takes a
random long diagonal. The code goes to real trouble to make this look good — per
drone launch offsets, bowed arcs, smoothstep easing — and all of that effort is
spent decorating a scramble. This is the single biggest lie in the current build
and it is exactly what Nam meant by "a fake shuffling animation": the coordinates
are real 3D and the interpolation is real, but the PAIRING is noise.

**Fault 2 — 264 drones against 2D outlines resampled to 340 points.**
`DRONES = 264`. Every picture theme is a set of flat strokes run through
`resample()`. That is a wireframe drawing hung in space, not a model. The
reference show's pagoda has surfaces, ridge tiles, hanging tassels and a lit
lattice; it needs an order of magnitude more craft than 264 to say any of that.

**Fault 3 — nothing moves while a formation is held.**
64% of every cycle (`HELD = 0.64`) is a dead hold. The only motion is a 5° sway
(`sway = Math.sin(t * 0.23) * 0.09`) applied to the whole fleet. So for five and
a half seconds out of every eight and a half, this is a still image. That is the
slide show Nam is describing, and it is why the transits have to carry the whole
show.

Fix all three and the black and white palette stops being a limitation. It is
already the right call: a real drone show reads by SILHOUETTE and BRIGHTNESS
first, and colour third.

---

## 1. Rotation, parallax and the camera

Nam raised this and then answered it mid-sentence. Confirming it, because the
answer has a consequence worth being explicit about.

**Camera orbit and model rotation are the same computation.** Orbiting a camera
by θ around a model at the origin and rotating the model by −θ in front of a
fixed camera produce identical projected points. There is no "easier" one and no
extra cost to either. The shipped code already does model rotation — it rotates
each point, then divides by `(FOV + z)`.

**Parallax is free, and it does not come from the rotation.** It comes from the
perspective divide. `d = FOV / (FOV + z)`; a near point has a larger `d`, so as
the model turns, near points sweep a longer screen arc than far ones. Nothing is
calculated for it, and nothing can be done to prevent it short of an orthographic
projection. Nam's instinct here is right: rotate the model in 3D space and every
depth cue arrives as a side effect.

The reason it does not currently READ as parallax is Fault 2. A wireframe torus
has almost no depth extent, and 264 points cannot resolve a near face against a
far one. A surfaced lotus with 1400 points will show it plainly.

**So: per model rotation, no camera state at all.** This is the flexibility Nam
described in his follow-up and it is strictly better than a shared camera:

| | shared camera orbit | per model rotation |
|---|---|---|
| rotation axis | one, for everything | per model |
| speed and phase | one, for everything | per model |
| off centre placement | forced to origin | free |
| two models at once | impossible | works |
| cost | identical | identical |

A shared camera buys nothing and costs the ability to put a small model in the
left margin turning slowly while a large one turns in the middle. Drop the idea.

**The catch, and it is a real one.** There are two ways to put a model off centre,
and they look different:

- **(a) offset in SCREEN space, after the projection.** What ships today, and the
  comment in `start.ts` defends it: a model keeps its head-on lens character
  wherever it sits, and never shears. Physically it is a lie — it is a camera
  that follows the subject.
- **(b) offset in WORLD space, before the projection.** Physically correct. An
  off axis model shows its side, and gets keystone as it turns. More real, and at
  a short focal length it distorts noticeably near the frame edge.

At `FOV = 3.8` (a long lens) the difference is small. **OPEN Q1** below.

### The camera as a drone

Nam's idea, and it is a good one: "the camera also becomes a drone, flying into,
down, up and around the 3D model made with drones."

It is worth being clear that this does **not** conflict with per model rotation.
A camera path is one more transform applied after each model's own rotation, so
you get both: the lotus turns at its own rate, and the viewpoint moves
independently. One matrix, no extra per drone cost.

More importantly it solves a problem that adding drones cannot. §7 argues that
past a certain density more drones read as fog rather than as detail — but that
argument is about ANGULAR density, and angular density is a function of viewing
distance. The reference show reads at 22,580 craft precisely because the camera
is far away. A camera that can pull back is the thing that makes a bigger fleet
worth having, and a camera that can push in is the thing that makes an ornate
model worth authoring, because it is the only way anyone sees the ornament.

So: **fleet size and camera rig are the same feature**, and the camera half is
much cheaper. If more drones do not read, the answer is not fewer drones, it is a
camera that goes somewhere.

Two things to get right when it lands:

- **Near plane clipping.** Flying INTO the model puts points behind the camera,
  where `z < -FOV` makes the perspective divide flip sign and explode. Points
  need to be dropped past a near plane, and the drop has to fade rather than
  pop — brightness to zero over the last stretch before the plane.
- **The scrim.** The copy sits in a pool of dark (`.st-col::before`). A camera
  that pushes in until the model fills the frame puts drones behind the words at
  full density. Either the camera path is authored to keep the middle clear, or
  the scrim strengthens as the camera closes. The first is better and is free.

Not in the first build. Captured here because it changes what §7 is for.

---

## 2. Where does the model come from

Nam pushed back on the first version of this section, which recommended tracing
profile curves by hand: "why start with a 2D image if we can just scour the
internet for 3D models or even generate 3D models that are already animated?
Wouldn't that save us a lot of time trying and failing?"

He is right, and two of the arguments in the first version were wrong. They are
corrected below. Then the actual recommendation, which is different from both
versions: **do not decide this in advance.**

### Why this is a cheap question, not an expensive one

The runtime does not care where a model came from. Every route produces the same
two things: a `Node[]` (§3) and a set of parts with animation curves. The engine —
the assignment in §6, the rig application in §4, the batched draw in §8 — is
identical either way.

So the model source is a **swappable input**, not an architectural decision. The
right move is to build the bake tool, run a real lotus through it, and look. That
is about a day, and it answers the question with a picture instead of an
argument.

### Correction 1: meshes DO carry feature edges

The first version claimed they do not and that we would have to hand-mark them.
That is wrong. A mesh carries at least three usable sources:

- **Creases, by dihedral angle.** The angle between the two faces sharing an
  edge; past a threshold it is a hard feature. Twenty lines of standard geometry,
  and it finds exactly the ridges, rims and eave lines that make the reference
  show legible.
- **The topology itself.** A hand modelled asset has edge loops that follow the
  form — around a petal rim, along a roof ridge. Sampling along mesh EDGES,
  weighted by length, is already most of the way to what we want.
- **Material and UV seams**, which usually sit on real boundaries.

So the sampling rule from §5 — dense on feature lines, sparse across surfaces —
applies to a mesh just as well as to a formula. It is a bake tool, not a
limitation.

### Correction 2: "a real 3D engine on a title card" was overstated

It would be, if we did skinning at runtime. We should not. **Bake offline** and
the runtime never learns what a mesh is. Two ways to bake, and the choice matters
a lot:

**Bake the FRAMES — rejected on size.** Sample the same points at N frames of the
animation and store the positions. At 1400 points, 30 frames, int16 per axis that
is 252KB raw; delta encoded against the rest pose and gzipped, optimistically
60 to 100KB. The whole start screen chunk is 14.2KB today. Too much for a front
door with a blocking boot script.

**Bake the RIG — recommended, and it lands exactly on §3.** Extract from the
animated asset: which part (bone, or mesh node) each sampled point belongs to,
its offset from that part's rest transform, and the part's animation curves. That
is 40 parts × 30 frames × 7 numbers ≈ 17KB raw before quantisation, gzipping to a
few KB, plus a node array of 1400 × ~10 bytes that also compresses well. Call it
8 to 12KB gzipped for a fully animated ornate model. That is affordable.

And note what falls out: **the rig-baked format IS the `Node`/`Part` structure in
§3.** The procedural route and the asset route converge on the same runtime. That
is the whole reason this is a swappable input.

**The constraint that survives:** rig-baking requires the model to decompose into
near-rigid parts. A petal on a hinge, a tassel, a wing, a ribbon segment — all
fine. Cloth or fluid simulation baked per vertex — not fine, and would force the
frame bake we just rejected. None of the motifs on the list need it.

### What is still genuinely hard, honestly

**Generated models are the weakest link, and specifically for us.** Text and
image to 3D (Meshy, Tripo, Rodin, Hunyuan3D and the rest) produce good SHADED
results. But they are usually marching-cubes derived: dense triangle soup, no
clean edge loops, surface noise at a scale that a normal map hides completely.
For a point cloud that is the worst possible input, because crease detection on a
noisy surface returns noisy creases, and noise in a point cloud is the ONE thing
that cannot be hidden — it is the entire signal.

Auto-rigging has a narrower problem: it is built for characters with skeletons. A
Dala horse or a crane might auto-rig usefully. **A lotus opening is not a
skeleton**, and no auto-rigger will produce a per-petal hinge from a text prompt.

Prediction, to be tested rather than assumed: a hand modelled asset off Sketchfab
or Poly Pizza will beat a generated one for this specific use, and the gap will
be largest on the ornate models where the gain was supposed to be biggest.
Retopology closes it, but retopology is manual 3D work, which is the cost we were
trying to avoid.

**Licensing still applies.** This is a public portfolio piece under Nam's name.
CC0 is clean. CC-BY needs attribution somewhere, on the one screen whose whole
design argument is that there is nothing extra on it — solvable (the colophon in
the spec panel), but it has to be decided rather than forgotten.

### The route the first version missed

**Found mesh for the form, authored rig in code.** Take a good static lotus for
its proportions and silhouette — the part that is genuinely tedious to author and
where a real model is worth the most — bake it to nodes, then assign parts and
write the hinge rig by hand. It is much easier to group already-modelled petals
into parts than it is to model petals.

This gets the observed proportions without needing an ANIMATED asset to exist,
and animated assets are far rarer than static ones. It may well be where we land.

### Recommendation

Build `tools/bake-model.mjs` first: glTF in, `Node[]` plus parts out, with crease
detection, edge-length-weighted sampling, sparse surface fill and a part
assignment pass. It is needed for every route, it is roughly 200 lines, and it is
the only thing that turns this from a debate into a look.

Then run three lotuses through it in the harness and compare: a hand modelled
free asset, a generated one, and the procedural version. Pick by eye. §11 has
this as its own phase with a deliberate stop at the end.

---

## 3. The data model

Today a formation is `at(i, n) -> Vec`, a function sampled on demand. That has to
go: it cannot carry which petal a point is on, and without that there is no rig.

```ts
/** One drone's worth of model, baked once at load. */
interface Node {
  /** Rest position, model space, inside roughly a unit sphere. */
  p: Vec;
  /** Which rigged part this node hangs off. Index into Model.parts. */
  part: number;
  /** Position within the part: u along, v across. Drives travelling waves. */
  u: number;
  v: number;
  /** Base brightness. Feature lines carry more than surface fill. */
  g: number;
}

interface Part {
  /** The hinge the part rotates about, in model space. */
  pivot: Vec;
  /** Hinge axis, unit. */
  axis: Vec;
  /** Phase offset, so parts do not move in lockstep. */
  phase: number;
}

interface Model {
  id: string;
  nodes: Node[];          // <= FLEET
  parts: Part[];
  /** How much the whole model turns. 0 for a flat motif held face on. */
  spin: number;
  /** Its own rotation speed and axis. Per model, per §1. */
  turn: { rate: number; tilt: number };
  /** Where it sits and how big. Screen fractions, as today. */
  spots: Spot[];
  /** Per frame: fill `out` with each part's transform, and a brightness. */
  rig: (t: number, out: PartPose[]) => void;
  /** The pose to freeze on for reduced motion. Not t = 0. */
  still: number;
}
```

The important line is `part` plus `u`/`v`. Those three numbers are what let a
model be animated cheaply and what let a reveal be ordered ("light up from the
base of each petal outwards") rather than random.

---

## 4. The rig, and why it is cheap

The naive reading of "the model is animated" is that we re-evaluate the lofted
surface every frame. At 1400 nodes with spline evaluation per node that is real
cost for no benefit.

Instead, split it:

**At load (once).** Evaluate the loft at rest. Bake `p`, `part`, `u`, `v`, `g`.

**Per frame (cheap).** Two tiers:

1. **Per part** — about 30 parts for the lotus. Build one 3x3 rotation from the
   part's hinge and the rig's angle for this frame. ~30 flops each, so ~900 flops
   per frame total.
2. **Per node** — apply the part's matrix about its pivot. Nine multiplies and
   six adds. Optionally add a scalar displacement along the node's normal driven
   by `u` (a travelling wave down a tassel or a ribbon), which is another handful.

At 1400 nodes that is roughly 20k flops per frame for the entire rig. Negligible
next to the 1400 canvas arcs.

This generalises to every motif on the backlog, which is the reason to build it
this way:

| motif | parts | rig |
|---|---|---|
| lotus | 24 petals + pod | hinge rotation per petal, phase by whorl |
| lantern | 6 tassels + body | pendulum on the body, tassels lagging by height |
| midsommarstång | 2 rings + ribbons | counter-rotating rings, wave along each ribbon |
| crane | 2 wings + neck | wingbeat as a phase travelling out along `u` |
| dala horse | 4 legs + body | rock about a floor pivot; kurbits reveal via `g` |

**Brightness is part of the rig.** The rig returns a per-part brightness
multiplier, and a node's final brightness is `g * partBrightness * depthShade`.
That single float is what delivers Nam's "some of them can dim and glow up as we
reveal stuff": a pulse walking around the lantern lattice, the kurbits scrollwork
drawing itself onto the horse after the body lands, a lotus lighting from the
seed pod outwards as it opens.

---

## 5. The lotus, specified

First model. Enough detail here to argue with before any of it is written.

This is a **target spec, not a recipe** — it says what the baked result has to
contain, and it holds whichever route wins phase 3. If the nodes come off a
downloaded mesh, these are the numbers the bake tool is aiming at; if they come
from code, these are the numbers the code emits.

**Structure.** Four whorls, outward to inward: 10, 8, 6, 4 petals = 28 petals.
Fewer, larger petals beats more, thinner ones at this resolution — a petal needs
enough points to show its rim AND its veins or it is just a leaf shape.

**Per petal, about 40 nodes:**
- rim outline, 22 nodes, `g = 1.0` — the silhouette, and it does most of the work
- midrib, 7 nodes, `g = 0.8`
- two side veins, 4 each, `g = 0.55`
- sparse surface fill, 3 nodes, `g = 0.3` — enough to say the petal is a surface
  and not an outline, without filling it in

**Centre, about 200 nodes:**
- seed pod: a flattened dome, concentric rings, ~90 nodes
- stamens: 40 short radials with a bright tip node, ~110 nodes

28 × 40 + 200 = **1320 nodes.** Against a fleet of 1400 that leaves 80 parked,
which is the right texture — a handful of craft holding station is what a real
show looks like, and it makes the fleet size legible as a constraint.

**Rig.** One hinge per petal at its base, axis tangent to the whorl circle.
`open(t)` runs a slow breath, roughly 14 seconds, and **the whorls lag**: the
outer whorl leads, each inner whorl is about 0.6s behind. That lag is the whole
effect — petals opening in lockstep reads as a scale animation, petals opening in
a wave reads as a flower. Add a small twist about the petal's own long axis,
which is what stops the outer rim looking like a stamped copy.

**Brightness rig.** As it opens, brightness sweeps from the pod outwards along
`u`. Closing runs it back. So the flower breathes in light as well as in shape.

**Placement and spin.** Centred, `spin` near 1, `turn.rate` slow — about one
revolution per 40 seconds, with a fixed lean of ~0.35 rad so it is never seen
edge on. A lotus is radially symmetric, which is forgiving of any viewing angle
and makes it a good first model.

---

## 6. The mapping, which is the fix that matters most

Fault 1. Formal statement: choose, for each formation `f`, a permutation `π_f`
of the fleet, assigning drone `d` to position `P_f(π_f(d))`.

### Making parking disappear as a special case

Every drone always has a position. For formation `f`, build a full FLEET-length
position array: the model's nodes first, then **standby positions** for the
remainder, drawn from a fixed sparse spherical shell outside the model's bounding
volume. Standby nodes carry `g = 0`, so they are dark, and get a slow global
drift at render time so they are not dead.

Consequence: `π_f` is a plain permutation over the whole fleet, every transition
is the same problem, and "recruiting parked drones as a formation gets bigger"
falls out of the assignment for free rather than needing its own code.

### What we are minimising

```
cost = Σ over transitions f       Σ over drones d
         | P_f(π_f(d)) − P_{f+1}(π_{f+1}(d)) |²
```

Squared distance, not distance. Squared penalises a single long straggler much
harder than several medium moves, and a straggler crossing the frame is exactly
the artefact that reads as "fake".

Measured in **post-spot, pre-perspective** coordinates, so that a small model in
the left margin becoming a large centred one is costed on its real screen travel,
not on model-space distance which would ignore the move entirely.

### How, given optimal is out of reach

| approach | cost | verdict |
|---|---|---|
| identity (today) | free | a scramble |
| Hungarian | O(n³) = 2.7e9 at n=1400 | dead |
| auction algorithm | near linear in practice | good result, a lot of code, still slow enough to notice at load |
| greedy nearest neighbour | O(n·k) with a grid | decent, but the last few points assigned are whatever is left, so it produces exactly the stragglers we are trying to kill |
| sort by shared spatial key | O(n log n) | coherent flow, cheap, but the space filling curve's seams fling a few points across the model |
| **key seed + 2-opt refinement** | O(n log n + K) | **recommended** |

**The recommendation, in two steps.**

*Seed.* Quantise both clouds to 10 bits per axis over their shared bounding box,
interleave to a 30-bit Morton code, sort both, pair by rank. Neighbours go to
neighbours. Deterministic and instant.

*Refine.* Random pairwise swap trials. Pick a random transition `f` and two
drones `d1`, `d2`; swap their targets in `π_f` if it lowers the cost:

```
current = |a1 − b1|² + |a2 − b2|²
swapped = |a1 − b2|² + |a2 − b1|²
if (swapped < current) swap
```

Each trial is a handful of subtractions. It removes the Morton seam artefacts and
it removes stragglers, because a straggler is by definition a large squared term
that almost any swap improves.

**Do the refinement over the whole CYCLE, not down a chain, and this is the
subtle part.** The naive version fixes `π_0`, optimises `π_1` against it, and so
on — which leaves the closing transition (last back to first) unoptimised,
because both its endpoints were already fixed. The show would then have one
scrambled transit every cycle, at the loop point.

The fix is to notice that a swap inside `π_f` affects only the two transitions
adjacent to `f`. So evaluate every trial against BOTH adjacent transitions and
run trials uniformly across all `f`. The cycle closes correctly, no formation is
privileged, and it is barely more code than the chain version.

**Budget.** K = 100 × FLEET × formations. At 1400 drones and 5 formations that is
700k trials, each roughly 8 distance terms — about 6M flops. Low single digit
milliseconds, once, at module load. Cache each `π_f` as an `Int16Array`.

**Two honest caveats.**

1. **The assignment is computed against the REST pose.** The models are rigged,
   so their actual positions at the moment of a transit differ from rest. This is
   fine and should stay: rig displacement is small relative to the spacing
   between neighbouring nodes, so a rest-pose assignment stays near optimal
   through the animation. Recomputing per frame is not an option and would not
   visibly improve anything.
2. **2-opt is a local optimum, not the optimum.** It will not find a global
   rearrangement that needs three simultaneous swaps. In practice, on point
   clouds seeded by a space filling curve, it gets close enough that the
   remaining error is invisible at 2px per drone.

### What the transit should then look like

With a real assignment, most of the existing transit code becomes correct rather
than decorative, and can stay:

- per drone launch offset (`off`), so the fleet peels off in waves rather than
  moving as a body — keep
- bowed arcs, so craft climb over each other — keep, but reduce the amplitude,
  because a good assignment means short paths and a large bow on a short path
  looks like a detour rather than an avoidance
- smoothstep easing — keep
- **new:** the rig keeps running THROUGH the transit. Interpolate between the
  ANIMATED position in A and the ANIMATED position in B, not between rest poses.
  A lotus that is still breathing while it unmakes itself is the thing that sells
  this as a simulation rather than a crossfade.

---

## 7. The fleet

**FLEET = 1400 to start.** A dial, not a decision, and Nam wants the dial to go
much higher later.

The record he is measuring against is 22,580 craft airborne from a single
computer, EHang, Hefei, 3 February 2026. Worth stating plainly what stops us
matching it and what does not:

**What does not stop us: arithmetic.** The rig and the projection are a few tens
of flops per drone. 22,580 of those is nothing.

**What stops us at ~4000: the renderer.** Canvas 2D at 22,580 arcs per frame is
tens of thousands of path operations, and even batched (§8) that is fill-rate and
path-building bound. The honest ceiling for canvas 2D is somewhere around 4000 to
6000. Past that the answer is not optimisation, it is **WebGL point sprites** — a
single instanced draw call renders 22,580 points without noticing, and the rig
can move to a vertex shader. That is a renderer swap with a canvas 2D fallback to
maintain, so it is a real piece of work, but it is a known one and it is the
answer if the count is what we want.

**What stops us at ~1400 right now: angular density, and it is the interesting
one.** On a 1440px canvas a centred lotus is roughly 700px across, so 1400 points
on its feature lines sit about 6px apart. At 4000 they are 3px apart, which at
2.5px diameter is a continuous line — we would be drawing a filled shape, and the
thing that says "drones" is gone.

But that is a statement about VIEWING DISTANCE, not about the count. The record
show reads at 22,580 because the camera is far away and each craft is well under
a pixel of arc. Which is exactly why the camera rig in §1 matters: **a camera
that can pull back is what makes a larger fleet legible.** The two features are
one feature.

So the order is: 1400 now, camera rig next, and only then ask whether the fleet
should grow — because the answer changes once the camera can move.

**Scaling.** Fleet scales down on small viewports. On a phone there are no
margins, only one centred model, and a third of the fleet is enough.

**Standby field.** Fixed sparse shell, radius ~1.6 of the model bounds, low
density so it never resolves into a shape, `g = 0`, with a slow drift. Visible as
the faintest possible dust. This is what makes "not all drones are in use" read
as a fleet with spare capacity rather than as missing drones.

---

## 8. Rendering and the performance budget

This is the first thing anyone sees. It cannot jank.

**The current draw is per drone `beginPath / arc / fill`** — three canvas calls
each. At 1400 that is 4200 calls per frame, plus 1400 `globalAlpha` and
`fillStyle` assignments, each of which is a state change.

**Batch by brightness band.** Quantise final brightness into 12 bands and dot
radius into 3 buckets. Accumulate into one `Path2D` per (band, radius, colour)
bucket with `moveTo` + `arc`, then one `fill` per bucket. Worst case 12 × 3 × 2 =
72 fills, typically far fewer since most buckets are empty. Per drone cost drops
to two path ops and no state changes.

Expected: 1400 drones batched should cost LESS than 264 drones unbatched.

**Also fix, while we are here:** `frame()` calls `getComputedStyle` every frame
to read the palette. That is a layout read at 60Hz to fetch two strings that
change only when the stylesheet does. Cache it, invalidate on resize.

**Budget to hold:** under 4ms per frame for the whole draw at 1400 drones on a
mid laptop at 1440x900, dpr 2. Measure before and after; if it does not hold,
FLEET is the dial.

**Reduced motion** keeps the existing pattern — one still frame — but `still`
must now name a POSE as well as a moment: a lotus frozen half open with the light
sweep mid flight, not `t = 0`.

---

## 9. What gets deleted

Per Nam: "we remove all the tiles, measure, trace, signal and the rest of the 8
graphic effects, the drones would be the one and only mode we have."

**Goes:**
- The seven texture variants in `src/ui/start.ts`: `tiles`, `measure`, `trace`,
  `signal`, `dust`, `aperture`, `staves`. Roughly 450 lines.
- The `Ptr` plumbing end to end — only Dust read the pointer, so the interface,
  the pointer listeners in `renderStart` and the parameter on `Art.draw` all go.
- `rrect`, `pulse`, `out`, `FACTS`, `pt`, `at`, `LEG` and anything else left with
  no caller once those seven are gone.
- The four picture themes: `CINEMA`, `PLACES`, `FOOD`, `THE_CALL`, and with them
  `picture()`, `resample()`, `arcPath`, `circlePath`, `ovalPath`, `boxPath`,
  `TRACE`, `Path`, `Pt` — unless a traced profile curve wants a spline helper, in
  which case it is a new one and not these.
- The variant picker row `.st-pick`, `.st-pick-b`, `.st-pick-n`, and
  `loadVariant` / `saveVariant` in `src/prefs.ts` with the `callback.startart`
  key.
- The `[data-art="drones"]` exception in `src/styles.css` (lines 9761 and 9765).
  Drones is now the only mode, so the exception becomes the rule and the two
  selectors collapse into the base `.start` rules.

**Stays:**
- Two programmes, and the second row `.st-themes` survives with exactly two
  entries. `loadTheme` / `saveTheme` stay.

  - **Geometry** — the seven shapes already there, and Nam has given them a job:
    "the geometry becomes the benchmark for how well the drone effect looks."
    That is a better reason than keeping them for variety, and it changes their
    status from legacy to instrument. A sphere becoming a cube has an exactly
    known correct answer — even spacing, short paths, no crossings — so if the
    morph looks wrong there, the ENGINE is wrong, not the model. It isolates §6
    from every question about authoring. They are no longer on the way out.
  - **Motifs** — the cultural set. Lotus first, then midsommarstång.

**Watch out for:** `npm run verify` runs `deadcss` and `cssstruct`, which will
fail loudly on half removed CSS — that is the gate working, but it means the CSS
removal has to land in the same commit as the TS removal. `src/data/project.ts`
carries the written record of this screen and has a long entry describing the
five themes and the eight variants; it needs a new entry describing the reversal,
not an edit that pretends the old one never happened.

---

## 10. The two programmes

**Geometry** — ring, sphere, torus, helix, cube, sheet, spiral. The benchmark,
per §9. Stays indefinitely.

**Motifs** — the cultural set:

- **Lotus**, first, specified in §5.
- **Midsommarstång** — Nam's Swedish pick. Pole, crossbar, two hanging garland
  rings, leaf clusters, ribbons. Rig: counter-rotating rings, a wave down each
  ribbon.
- On the list behind those: dala horse with kurbits, advent star, Vasa ship,
  hanging palace lantern, crane in flight, koi.

One motif is not a programme. Motifs needs at least the lotus and the maypole
before it is worth exposing as a choice — until then the button is a promise the
row cannot keep. Geometry carrying the default in the meantime is fine, and is
now what it is for.

---

## 11. Build order

Each phase ends somewhere it could stop, and the two that matter most are 2 and 3
— they answer the two open questions with pictures instead of arguments.

1. **The harness.** A scratch page, not shipped, not in `docs/`: one model,
   sliders for every rig parameter, toggles for feature lines / surface fill /
   node indices / wireframe, and a file picker for a baked model. **Prerequisite,
   not a nicety** — it is the only fast feedback loop in this whole plan, and
   without it every phase below degrades into edit-compile-squint.
2. **The engine, against Geometry.** New `Node`/`Part`/`Model` types, band
   batched rendering, the Morton + 2-opt assignment, the standby field, FLEET at
   1400. The seven geometric shapes rewritten as baked node arrays with a null
   rig. *Stop and look.* Geometry is the benchmark (§9): if sphere to cube does
   not look right here, §6 is wrong, and no amount of model quality will hide it.
   Nothing below is worth starting until this reads.
3. **The bake tool, and the bake-off.** `tools/bake-model.mjs` per §2, then three
   lotuses through the harness — a hand modelled free asset, a generated one, and
   a procedural one. *Stop and look.* This is the phase that decides §2 and it is
   deliberately cheap, roughly a day, because it is a question nobody should be
   answering from first principles.
4. **The demolition** (§9). Separate commit, no behaviour change to what is left.
   Independent of 2 and 3, so it can happen whenever it is convenient.
5. **The lotus, finished.** Whichever route won phase 3: node budget, the petal
   rig, the brightness sweep, the still pose.
6. **Measure and tune.** Frame cost, FLEET, chunk size, the phone case.
7. **Midsommarstång**, which is what makes Motifs a programme rather than a
   single image.
8. **The camera rig** (§1), and only then revisit fleet size (§7) — because the
   answer to "should we have more drones" changes once the camera can pull back.

---

## 12. Risks

**The lotus reads as a blob.** The most likely failure, and the reason §5 spends
its point budget on rims and veins rather than on surface fill. Mitigation: the
harness has a feature-lines-only toggle, and the rule is that the model must be
recognisable with the surface fill turned OFF. Fill is seasoning.

**Authoring is slow and we settle for "fine".** Mitigated by phase 1. If the
harness is skipped, expect this to happen.

**A generated mesh's topology poisons the point cloud.** §2. Marching-cubes
surface noise is invisible when shaded and is the entire signal when sampled as
points; crease detection on a noisy surface returns noisy creases. This is the
specific thing phase 3 exists to test, and it is why phase 3 compares three
lotuses rather than assuming the generated one wins.

**An animated asset does not exist for the model we want.** Static assets are
plentiful, animated ones are rare, and auto-rigging is built for characters with
skeletons rather than for a flower opening. The fallback is the hybrid in §2 —
found mesh for the form, hand written rig — and it should be treated as the
likely outcome rather than as a disappointment.

**Performance regression on the front door.** Mitigated by band batching, the
`getComputedStyle` fix, and a measured budget. FLEET is a single dial.

**The chunk grows.** 14.2KB today for eight animations. Deleting seven of them
buys a lot of room, and procedural models are code, which compresses. Measure
after phase 3 and after phase 4; if the lotus alone costs more than the seven
deleted variants together, something has been authored as data that should have
been authored as a formula.

**Assignment cost blocks first paint.** 700k trials is milliseconds, but it must
not run at module load on the critical path. Run it lazily on the first frame of
the animation, which is already after first paint by construction.

**Two formations is not a show.** §10. Decide before shipping, not after.

**The rig makes the assignment stale.** Called out in §6 and accepted. If a
future motif has a rig with displacement comparable to its node spacing — a
ribbon that travels a long way — that motif needs its assignment computed against
a mid-animation pose instead. Note it when it happens; do not build for it now.

---

## 13. Open questions for Nam

**OPEN Q1 — off centre placement: screen space or world space?** (§1)
Screen space is what ships today: a model in the left margin keeps its head-on
look and never shears. World space is physically correct: it shows its side and
gets keystone as it turns. The second is more real; the first is more controlled.
Recommendation: keep screen space, because the models are the subject and having
one shear at the frame edge is a lens artefact rather than a formation doing
something. Cheap to try both once the engine is in.

**OPEN Q2 — is 1400 the right fleet?** (§7) A dial, and the honest answer is that
the question is premature: fleet size and the camera rig are one feature, so ask
it again after phase 8. Worth eyeballing 1400 against 2500 once phase 2 is in,
the same way the eight variants got chosen. Going past ~4000 means WebGL point
sprites, which is a real piece of work with a fallback to maintain — worth it if
the count is the point, but it should be a decision and not a drift.

**OPEN Q3 — how long is a cycle?** Today 8.6s with 64% held. With a rig running
during the hold, the hold can be much longer, because it is no longer dead — a
lotus breathing for 12 seconds is not a slide. Suggest roughly 14s per formation
with about 25% spent in transit. Needs to be watched, not reasoned about.

**OPEN Q4 — does the standby field stay visible?** (§7) Faint dust says the fleet
has spare capacity, which is Nam's "real constraint" point made visible. It also
puts faint dots on a screen that is otherwise very clean. Recommendation: ship it
visible at the lowest brightness the display can carry, and look at it.

**OPEN Q5 — what licence are we willing to accept on an asset?** (§2) CC0 is
clean and needs no answer. CC-BY needs attribution somewhere on a public
portfolio piece; the colophon in the spec panel is the natural home, but it has
to be decided before we fall in love with a model rather than after.

---

## 14. What the build changed about this plan

Written after phases 2, 4, 5, 6 and 7 landed. Everything here is a place the plan
above was wrong or incomplete, kept rather than quietly corrected so that the next
motif does not have to rediscover it.

### The lotus spec in §5 was wrong, and by a factor of two

§5 specified 28 petals at about 40 nodes each, with rims, midribs, veins and
surface fill. It never checked the resulting density, and the density is the only
thing that matters.

A petal carries roughly three units of feature line. Twenty eight of them is 84
units of line for 1100 nodes, which is a node every 0.076 of a unit — and at half
the viewport per unit that is **47 pixels between adjacent drones**. Rendered, it
was not a flower. It was a haze with a bright middle.

Run it backwards instead: a dotted line reads as a line at 15 to 20px, which is
also where the reference show sits, so 1100 nodes buys about 40 units of line,
which is **eighteen petals**. That is what shipped — whorls of 8, 6 and 4.

**The veins went, and §5 was wrong to specify them.** A pair of veins adds nearly
half as much line again per petal, and paying for them means paying in the spacing
of the rim: trading the silhouette, which is what a drone show is made of, for
interior detail nobody can resolve at this fleet size. §5's rule that fill is
seasoning turned out to be stricter than it read. There is no fill at all.

**Lesson for the next motif: budget the LINE LENGTH first, then the node count.**
The ceiling is about 40 units of feature line at 1400 drones.

### The lotus was also a pancake, which §5 did not think about at all

The angle from vertical at a petal tip is tilt plus curl. The first numbers put it
at 121 degrees — past horizontal — so every petal rose, went over the top and came
back down. The flower stood 0.13 of a unit tall against a spread of 2.0. Every bit
of the three-dimensionality this whole exercise is about was thrown away.

It was invisible from directly above. Only a profile view caught it, which is an
argument for the harness in §11 having more than one camera.

Landing the tip near 75 degrees gives a bowl 0.65 high against 1.07 across.

### §6 missed the single most valuable bit of the seed

Parked positions must sort **after** every model node in the Morton key.

Without that the standby shell is interleaved through the ordering like anything
else. Two formations park different numbers of craft — 87 for the lotus, 244 for
the maypole — so the ranks slide out of step, and a drone at rank 600 is a petal in
one formation and a parked craft two units out in the other, over and over down
the whole ordering. Measured, the seed came out **no better than pairing by
index**: 0.936 against 0.942.

One bit in the sort key fixes it, and it is the difference between the seed earning
its place and being decoration.

### §6's cost estimate was optimistic, and the fix is better than the estimate

§6 guessed low single digit milliseconds. Measured, on this machine:

| budget (trials per drone per formation) | Geometry cost | mean travel | vs identity |
|---|---|---|---|
| 24 | 22ms | 0.864 | 30.2% shorter |
| 60 | 46ms | 0.836 | 32.4% |
| **150** | **103ms** | **0.820** | **33.7%** |
| 400 | 263ms | 0.808 | 34.7% |

The curve flattens around 150, which costs six dropped frames on the first screen
anybody sees. Not acceptable.

**The fix is better than shrinking the budget, and it comes from an observation §6
did not make: drones are interchangeable.** Swapping which two of them own two
targets does not move either target. So while a formation is HELD, the set of lit
positions is identical before and after any swap — all that changes is which index
owns which dot, which shows up as a reshuffled twinkle phase and nothing else.

So the refinement runs in slices during the hold, invisibly, guarded to stop the
moment a transit begins. It settles in 37 frames, under a second, against a first
hold ten seconds long. The full 150 budget is affordable at zero visible cost.

### Rotation: §1 was right about parallax and wrong about independence

§1 recommended per-model rotation with each model carrying its own axis, speed and
phase. That conflicts with §6, and §1 did not notice.

**A common rotation is an isometry** — it moves every point without changing any
distance between two of them — so an assignment solved against unrotated models
stays exactly as good at any shared angle. Give two formations *independent* angles
during a handover and that guarantee is gone: the pairing would be optimal for a
pose the show is never actually in.

So what shipped is one accumulated yaw, the integral of the running order's rates,
shared by both formations. Per model speed survives anyway, because only one model
is ever the subject, and the integral is continuous across a handover — so it is
still a pure function of time, which is the rule the whole file runs on.

### Multi-spot placement was dropped, which parks OPEN Q1

§1's Q1 asked whether an off-centre model should be offset in screen space or in
world space. Neither, for now: the `Spot` system is gone. It existed for the
picture themes, which are deleted, and every surviving model is centred and
viewport sized. A model bakes its own scale into its node positions instead.

Q1 goes live again the moment a model wants to sit out in a margin. The plan's
recommendation, screen space, still stands as the starting point.

### Phases 1 and 3 were not done, and phase 3 could not be

**Phase 1, the harness**, was replaced by something cheaper that turned out to suit
this particular work better: a Node harness that renders the show against a stub 2d
context and prints measurements plus orthographic ASCII views of the raw node
cloud. That is what caught both lotus bugs — the density one from the numbers, the
pancake one from a profile view.

It does not replace looking at the real thing in a browser, and a slider harness is
still the right tool for TUNING as opposed to CHECKING. What it proves is that a
lot of this is measurable rather than visual, and that the measurable half is worth
automating first.

**Phase 3, the bake-off**, could not run. It needs actual downloaded and generated
lotus meshes, and choosing a licensed asset for a public portfolio piece is Nam's
call rather than one to make on his behalf — OPEN Q5, still open. So the shipped
lotus is procedural by necessity rather than by the argument in §2.

§2's conclusion is unaffected: the runtime takes nodes plus parts plus a rig and
cannot tell where they came from, so the bake-off can still happen and can still
replace the model without touching the engine.

### OPEN Q4 answered itself: the standby field is invisible

§7 said the shell would show as the faintest possible dust, and Q4 asked whether
to keep it. Measured, it is not visible at all: half the shell is on the far side
where the depth shade takes it under the alpha floor, and the other half projects
past the edge of the canvas and is culled. Of the 350 craft the sparsest geometry
formation parks, about eleven are ever drawn.

Kept as it is, because it is the better answer. The fleet constraint reads through
RECRUITMENT -- craft arriving from beyond the frame during a transit and leaving
the same way -- rather than through a ring of dim dots parked in the margins of a
very clean screen. Q4 is closed unless Nam wants the halo back.

### Measured against §8's budget

§8 asked for under 4ms a frame at 1400 drones. Measured at 0.31 to 0.44ms for
geometry, rig, projection and batching.

That **excludes canvas rasterisation**, which Node cannot measure, so the real
figure is unverified and needs a browser. But it leaves a lot of headroom, and it
means FLEET has room to grow well before the renderer swap in §7 becomes the
constraint.

The `getComputedStyle` per frame that §8 flagged is fixed: read on resize only.
