// Icons and the product lockup.
//
// Meet renders its icons with "Google Symbols", a proprietary superset of
// Material Symbols driven by variable axes: FILL, wght, GRAD, opsz and Google's
// own ROND. Read straight off the live DOM:
//
//   font: 400 24px/24px "Google Symbols"
//   font-variation-settings: "FILL" 0, "GRAD" 0, "ROND" 50, "opsz" 24, "wght" 400
//   selected rail item: identical but "FILL" 1
//
// Google Symbols is not distributable. Material Symbols Outlined is — Apache-2.0,
// same design programme, same axes minus ROND — so this ships a 7 kB subset of it
// covering exactly the 39 glyphs used here, self-hosted. That makes the icons the
// real thing rather than my approximations of them, and keeps the promise of zero
// third-party requests.
//
// The FILL axis is wired up the way Meet wires it: unselected 0, selected 1.

import { play, settle } from './impact.js';

export type IconName =
  | 'add' | 'apps' | 'back_hand' | 'bolt' | 'calendar_month' | 'call' | 'call_end'
  | 'chat' | 'check' | 'chevron_left' | 'chevron_right' | 'close' | 'closed_caption'
  | 'closed_caption_off' | 'content_copy' | 'description' | 'event' | 'expand_more'
  | 'frame_person' | 'group' | 'help' | 'info' | 'keyboard' | 'keyboard_arrow_up'
  | 'link' | 'lock_person' | 'menu' | 'mic' | 'mic_off' | 'mood' | 'more_vert' | 'person_add'
  | 'present_to_all' | 'science' | 'settings' | 'shield' | 'speed' | 'today' | 'video_call' | 'videocam'
  | 'videocam_off' | 'auto_awesome';

export interface SymOpts {
  /** Meet fills the glyph for the selected nav item. */
  fill?: boolean;
  /** Optical size, matched to the rendered size like Meet does. */
  opsz?: number;
}

/**
 * One Material Symbol. A span, not an SVG — same mechanism as the real product,
 * which is why the shapes match instead of merely resembling.
 */
export function sym(name: IconName, size = 24, opts: SymOpts = {}): HTMLElement {
  const el = document.createElement('span');
  el.className = 'ms';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = name;
  const opsz = opts.opsz ?? (size <= 20 ? 20 : size >= 40 ? 40 : 24);
  el.style.fontSize = `${size}px`;
  el.style.fontVariationSettings = `"FILL" ${opts.fill ? 1 : 0}, "wght" 400, "GRAD" 0, "opsz" ${opsz}`;
  return el;
}

/**
 * The mark, redrawn from the 2026 asset.
 *
 * Sampled off gstatic's own PNG: body a yellow gradient around #FFD723 → #FECE06,
 * lens horn #F9AA01, and a white record dot low-left. Not the old tricolour
 * camera — that logo was retired.
 */
/**
 * Two ways to draw the mark, and the switch matters.
 *
 * REAL: gstatic's own 124x40 lockup PNG, decoded and cropped to the camera at
 * columns 1..35, rows 3..30 — so it is Google's artwork, pixel for pixel,
 * rendered at the natural size Meet renders it. Nothing can be closer.
 *
 * TRACED: the SVG below, redrawn from measurements of that same PNG. It is a
 * good likeness and it ships no Google artwork, which is the reason it exists:
 * this repo goes to Google, and a hand-drawn homage is a different thing from
 * redistributing a trademarked asset.
 *
 * Flip USE_REAL_MARK to choose. Whichever is active, the README must say so.
 */
const USE_REAL_MARK = true;

function markImg(): HTMLImageElement {
  const img = document.createElement('img');
  img.src = 'meet-mark.png';
  img.width = 35;
  img.height = 28;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.className = 'lk-mark';
  return img;
}

function mark(): HTMLElement | SVGSVGElement {
  return USE_REAL_MARK ? markImg() : markTraced();
}

function markTraced(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  // Measured off gstatic's own 124x40 asset, not traced by eye this time: the
  // PNG was decoded to raw RGBA and scanned column by column for yellow pixels.
  // That put the mark at columns 1..35 and rows 3..30, so 35 x 28 on screen at
  // the natural size Meet renders it, and it put the gap to the "Google" in the
  // same image at exactly 11px.
  //
  // The same scan settled a corner radius that had been guessed at 4.2: at the
  // left edge the shape starts 6px below the top, which for a rounded rect means
  // the radius IS that inset. 6.5 it is. Too small a radius was what made this
  // read as a different logo rather than a slightly-off one.
  svg.setAttribute('viewBox', '0 0 36 32');
  svg.setAttribute('width', '36');
  svg.setAttribute('height', '32');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'lk-mark');

  const grad = document.createElementNS(ns, 'linearGradient');
  grad.setAttribute('id', 'lkg');
  grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '1'); grad.setAttribute('y2', '1');
  for (const [off, col] of [['0', '#FFDA45'], ['0.55', '#FFD11B'], ['1', '#FBC900']]) {
    const s = document.createElementNS(ns, 'stop');
    s.setAttribute('offset', off);
    s.setAttribute('stop-color', col);
    grad.appendChild(s);
  }
  const defs = document.createElementNS(ns, 'defs');
  defs.appendChild(grad);
  svg.appendChild(defs);

  // The horn is a trapezoid, taller at the outer edge, tucked behind the body.
  // Its corners are softened with a matching stroke rather than arcs, so the
  // path stays readable — hence the inset coordinates.
  const horn = document.createElementNS(ns, 'path');
  // Column scan: the horn is 13px tall where it meets the body (x=27, y 11..23)
  // and flares to 21px by x=34 — wider at the outer edge, not narrower.
  horn.setAttribute('d', 'M27 11 L35 6.2 V27.8 L27 23 Z');
  horn.setAttribute('fill', '#F9AA01');
  horn.setAttribute('stroke', '#F9AA01');
  horn.setAttribute('stroke-width', '1.6');
  horn.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(horn);

  const body = document.createElementNS(ns, 'rect');
  body.setAttribute('x', '1'); body.setAttribute('y', '3');
  body.setAttribute('width', '26'); body.setAttribute('height', '28');
  body.setAttribute('rx', '6.5');
  body.setAttribute('fill', 'url(#lkg)');
  svg.appendChild(body);

  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', '7'); dot.setAttribute('cy', '24'); dot.setAttribute('r', '3');
  dot.setAttribute('fill', '#fff');
  svg.appendChild(dot);

  return svg;
}

/**
 * The lockup, and the one liberty this clone takes with it.
 *
 * It renders as "Google Meet", then "Nam" flies in from the right, lands, the
 * whole wordmark takes the hit, and "Google" is knocked out of it — leaving
 * "Meet Nam Nguyen". Which is the entire pitch, in one movement.
 *
 * The flying word is the full name rather than just "Nam": on its own the
 * first name reads as a typo in a product wordmark rather than as a person.
 *
 * Under reduced-motion it is simply "Meet Nam Nguyen" from the start.
 */
export function lockup(reducedMotion = false, onHome?: () => void): HTMLElement {
  const wrap = document.createElement('button');
  wrap.type = 'button';
  // Deliberately NOT lk-play yet. The caller starts it once the screen has
  // finished loading — see playLockup below.
  wrap.className = `lockup` + (reducedMotion ? ' lk-static' : '');
  wrap.appendChild(mark());

  const words = document.createElement('div');
  words.className = 'lk-words';

  // Real text, not the bitmap.
  //
  // Meet genuinely renders this word as part of a PNG, and for a while this did
  // too, on the grounds that nothing else could match a flat-ink bitmap for
  // weight. That was true and still the wrong trade: an image cannot share a
  // baseline with the text beside it without hacks, and every one of those
  // hacks was visibly off.
  //
  // Text matches it instead, and the metrics were never the problem — Product
  // Sans at 23.5px measures 75.8px against the bitmap's 76. Only the stroke
  // weight differed, and -webkit-text-stroke thickens strokes without moving a
  // single metric. See styles.css.
  const google = document.createElement('span');
  google.className = 'lk-google';
  google.textContent = 'Google';

  const meet = document.createElement('span');
  meet.className = 'lk-meet';
  meet.textContent = 'Meet';

  const nam = document.createElement('span');
  nam.className = 'lk-nam';
  nam.textContent = 'Nam Nguyen';

  words.append(google, meet, nam);
  wrap.appendChild(words);

  // One accessible name for the whole thing, so a screen reader hears the
  // destination rather than three fragments mid-animation.
  wrap.setAttribute('aria-label', 'Meet Nam Nguyen');
  for (const el of [google, meet, nam]) el.setAttribute('aria-hidden', 'true');

  wrap.addEventListener('click', () => {
    onHome?.();
    if (reducedMotion) return;
    // Next frame, and against the live document rather than this element:
    // onHome re-renders the screen, which detaches this node, so simulating it
    // would animate something no longer on the page.
    requestAnimationFrame(() => playLockup(document));
  });

  return wrap;
}

/**
 * Meet's loading indicator: Material 3's *wavy* circular progress, which is
 * distinctive enough that a plain spinning arc reads as the wrong product.
 *
 * Measured off a screen recording of a cold load, since the spinner is gone
 * before automation can reach it and the second load is cached. Frame at
 * t=3.60s, pixels scanned for blue: the painted extent is 53x53, the stroke is
 * about 5px, the active arc averages rgb(62,114,208) against white — which is
 * #0b57d0 with antialiasing — and the track averages rgb(192,218,242), i.e.
 * #a8c7fa lightened the same way.
 *
 * The wave is drawn as a real path rather than faked with a filter, so the
 * amplitude stays constant as it rotates. Two nested rotations at different
 * speeds give the arc its length-changing look without animating the path.
 */
/**
 * Meet's loading indicator: Material 3's wavy circular progress.
 *
 * The structure took two wrong attempts to see, and it is worth stating
 * plainly because it is not what it looks like. It is ONE ring, split in two:
 *
 *   - the wave oscillates AROUND the ring's radius, crest outside and trough
 *     inside, so the midline of the wave IS the radius of the plain track;
 *   - the plain track is not a full circle. It is only the arc the wave does
 *     not occupy;
 *   - and the two do not meet. There is a gap at each end.
 *
 * The first attempt drew a small full circle with a large squiggle orbiting
 * it, which is why it read as two objects fighting rather than one indicator.
 * Once the wave shares the track's radius the whole thing resolves.
 *
 * Geometry, checked numerically before it was written: R 21.5, amplitude 2.8,
 * eight crests per turn, 4px stroke. The wave's radius ranges 18.7..24.3 with
 * a midline of exactly 21.5, and phase 0 puts its start exactly on the radius,
 * so it leaves and rejoins the track cleanly rather than stepping off it.
 *
 * `sweep` is how much of the ring is wavy. Meet uses a short arc for a light
 * load — switching days — and a long one for a cold start. A free, honest
 * signal of how much work is actually happening.
 */
/**
 * Meet's loading indicator: Material 3's wavy circular progress.
 *
 * Rebuilt from Google's own path data, which Nam pulled off the live page. That
 * path decodes to a perfect circle of radius exactly 22.0000 about (32,32),
 * sampled one point per degree and sweeping 0deg to 339deg — so a 21 degree
 * gap, and it is the plain TRACK rather than the wavy part.
 *
 * Which settles the structure. It is one ring, not two objects:
 *
 *   - the wave oscillates about the ring's radius, crest outside and trough
 *     inside, midline sitting exactly on it;
 *   - the plain track is the arc the wave does not occupy;
 *   - there is a gap between them, and 21 degrees total is what Google bakes
 *     into the geometry.
 *
 * The remaining unknown was amplitude. Inferring it from the painted extent of
 * a video frame gave 2.5, and that was too tall: the crests read as pointy next
 * to the real thing. The frame measurement was never solid — its bounding box
 * came out 53x57, and a circle is not 4px taller than it is wide, so something
 * had contaminated it.
 *
 * 1.4 instead, chosen against the shape rather than the extent. What matters is
 * amplitude over wavelength: 1.4 / 15.4 = 0.091, where 2.5 gave 0.163. Crest
 * and trough sit close to the radius and the curve reads as a gentle scallop
 * rather than a zigzag — what makes a sine look pointy is not its height but
 * its height against its wavelength. Nine crests per turn either way, so the
 * wave closes on itself seamlessly.
 *
 * The motion is two loops on different periods, which is the part that stops it
 * looking mechanical: the ring turns steadily while the lit arc grows and
 * shrinks on a slower, eased cycle. The track is clipped to exactly the
 * complement, so the gap holds at both ends however long the lit arc is.
 */
export function spinner(light = false): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const C = 32;    // centre, from the real path
  const R = 22;    // radius, from the real path — exact
  const A = 1.4;   // amplitude: see the note above on why not 2.5.
  const K = 9;     // crests per turn

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("width", "64");
  svg.setAttribute("height", "64");
  svg.setAttribute("class", "spin " + (light ? "spin-light" : "spin-cold"));
  svg.setAttribute("role", "progressbar");
  svg.setAttribute("aria-label", "Loading");

  const at = (deg: number, r: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [C + r * Math.cos(rad - Math.PI / 2), C + r * Math.sin(rad - Math.PI / 2)];
  };

  // One point per degree for the track, matching how Google emits it.
  const ring = (wavy: boolean): string => {
    const step = wavy ? 1 : 1;
    let d = '';
    for (let deg = 0; deg <= 360; deg += step) {
      const r = wavy ? R + A * Math.sin(((deg * Math.PI) / 180) * K) : R;
      const [x, y] = at(deg, r);
      d += (d ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
    }
    return d;
  };

  const line = (d: string, colour: string, cls: string): SVGPathElement => {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", colour);
    p.setAttribute("stroke-width", "4");
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("class", cls);
    return p;
  };

  svg.appendChild(line(ring(false), "#a8c7fa", "spin-track"));
  svg.appendChild(line(ring(true), "#0b57d0", "spin-arc"));
  return svg;
}

/**
 * Google's own focus ring, lifted from the keyframes it ships under the name
 * `gm3-focus-ring`. It is not an `outline` — it is a span inset -2px around the
 * control carrying a box-shadow spread, which is how it gets a radius 2px
 * larger than its host and how it can animate at all.
 *
 * On appearing it grows 0 → 8px in 150ms then settles back to 3px over 450ms.
 * That overshoot is the pulse you see when the page finishes loading and when
 * you return to the tab, and it is the entire reason the selected meeting reads
 * as "the thing you are about to do" rather than as a static highlight.
 */
/**
 * Meet's dropdown caret. Measured off a device chip on the pre-join screen: it
 * is an inline SVG, not a font glyph, drawn in a 24 viewBox as
 *
 *   M7 10l5 5 5-5H7z
 *
 * which is the classic Material `arrow_drop_down` — a FILLED TRIANGLE. Every
 * chip has one, and so does the expanded warning badge.
 *
 * Worth being precise about because the obvious guess is wrong: `expand_more`
 * is a stroked chevron and reads completely differently at 20px. We had neither,
 * which is most of why the chip row looked unlike Meet's.
 */
export function dropCaret(px = 20): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(px));
  svg.setAttribute('height', String(px));
  svg.setAttribute('class', 'caret');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', 'M7 10l5 5 5-5H7z');
  p.setAttribute('fill', 'currentColor');
  svg.appendChild(p);
  return svg;
}

export function focusRing(): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = 'focus-ring';
  s.setAttribute('aria-hidden', 'true');
  return s;
}

/**
 * Start the wordmark gag. Kept separate from building the lockup because the
 * timing is the whole joke: played at mount it lands under a loading spinner
 * and three entrance animations, and nobody sees "Google" get knocked out of
 * the wordmark. Played after the screen has settled, it is the only thing
 * moving.
 */
let stopImpact: (() => void) | null = null;

function partsOf(root: ParentNode): { el: HTMLElement; parts: Parameters<typeof play>[0] } | null {
  const el = root.querySelector<HTMLElement>('.lockup');
  if (!el || el.classList.contains('lk-static')) return null;
  const google = el.querySelector<HTMLElement>('.lk-google');
  const meet = el.querySelector<HTMLElement>('.lk-meet');
  const nam = el.querySelector<HTMLElement>('.lk-nam');
  if (!google || !meet || !nam) return null;
  return { el, parts: { google, meet, nam } };
}

export function playLockup(root: ParentNode = document): void {
  const found = partsOf(root);
  if (!found) return;
  found.el.classList.add('lk-play');
  // Never leave two simulations driving the same element.
  stopImpact?.();
  stopImpact = play(found.parts);
}

/**
 * Jump straight to the end state, no motion. Needed because home() mounts more
 * than once: after the gag has played, a later re-render builds a fresh lockup
 * that would otherwise sit at "Google Meet" forever.
 */
export function settleLockup(root: ParentNode = document): void {
  const found = partsOf(root);
  if (!found) return;
  found.el.classList.add('lk-play');
  stopImpact?.();
  stopImpact = null;
  settle(found.parts);
}
