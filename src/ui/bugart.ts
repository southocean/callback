// Twelve bugs, drawn rather than photographed.
//
// Board ticket N59. Nam sent a photograph of a real entomology drawer and asked
// for that: "There are some very ornate bugs I found on google, they are
// beautiful. Make sure we have some of these, not just the regular looking
// bugs."
//
// THE CONSTRAINT THAT DECIDED THE APPROACH. This project makes no third-party
// requests and ships no image it did not make, so the photographs were never
// available. Twelve bespoke illustrations is a week of drawing and twelve tints
// of one beetle is a palette rather than a collection, so neither was available
// either.
//
// What is here instead: twelve body plans, each an authored path set, sharing
// only the parts that genuinely are shared. Every beetle has six legs attached
// where a beetle's legs attach; what differs between a jewel beetle and a stag
// beetle differs here too, because that difference is the entire point of a
// drawer full of them.
//
// SILHOUETTES COME FREE, and that is the reason the palette is a tuple rather
// than four named fields. An uncaught bug is drawn by the same code with every
// colour replaced by `currentColor`, so its outline is exactly right and it
// gives away nothing else. A silhouette drawn separately would be a second
// drawing that could disagree with the first.
//
// Everything is symmetrical about x = 60 and built by mirroring one half, which
// is both how the animals are built and half the markup.

import type { Bug, Palette } from '../data/bugs.js';

const NS = 'http://www.w3.org/2000/svg';

/** The specimen box. Head at the top, tail at the bottom, pinned. */
const W = 120;
const H = 170;

/** One half, then the same half flipped. */
const mir = (s: string): string =>
  `${s}<g transform="translate(${W},0) scale(-1,1)">${s}</g>`;

/** The six legs every beetle plan uses, unless it has a reason not to. */
const beetleLegs = (c: Palette, w = 3.2): string => `<g fill="none" stroke="${c[2]}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${mir(
  '<path d="M50 52C38 48 30 41 22 33"/>'
  + '<path d="M48 68C33 68 23 75 14 86"/>'
  + '<path d="M50 88C35 95 27 108 23 124"/>',
)}</g>`;

/** Short clubbed antennae, the lamellate kind a scarab has. */
const clubbed = (c: Palette): string => `<g fill="none" stroke="${c[2]}" stroke-width="2.6" stroke-linecap="round">${mir(
  '<path d="M53 30C47 23 42 18 36 14"/>',
)}</g>${mir(`<ellipse cx="34.5" cy="12.5" rx="4" ry="2.8" fill="${c[2]}" transform="rotate(-28 34.5 12.5)"/>`)}`;

/** Head and thorax, the two pieces that barely change across the beetles. */
const foreparts = (c: Palette): string =>
  `<ellipse cx="60" cy="33" rx="12" ry="8.4" fill="${c[2]}"/>`
  + mir(`<circle cx="52" cy="31" r="2" fill="${c[1]}"/>`)
  + `<path d="M44 46C46 38 52 32.5 60 32.5C68 32.5 74 38 76 46L78 58C72 62.5 48 62.5 42 58Z" fill="${c[1]}"/>`
  + `<path d="M47 46C49 40 54 36 60 36C66 36 71 40 73 46" fill="none" stroke="${c[0]}" stroke-width="2" opacity=".5"/>`;

/** The seam down the middle of a pair of wing cases. */
const seam = (c: Palette, y: number, h: number): string =>
  `<rect x="58.7" y="${y}" width="2.6" height="${h}" fill="${c[1]}"/>`;

/* ------------------------------------------------------------------ plans -- */

const scarab = (c: Palette): string =>
  beetleLegs(c)
  + mir(`<path d="M60 53C42 53 33 72 33 96C33 122 46 138 60 139Z" fill="${c[0]}"/>`)
  + mir(`<path d="M46 66C40 79 39 97 42 113" fill="none" stroke="${c[3]}" stroke-width="3.4" stroke-linecap="round" opacity=".55"/>`)
  + seam(c, 53, 86)
  + foreparts(c)
  + clubbed(c);

/*
 * The horns are the animal. In a top view they overlap, so they are drawn as
 * two: the long one off the thorax curving up and left, the shorter one off the
 * head curving up and right, which is how a pinned specimen actually reads.
 */
const hercules = (c: Palette): string =>
  beetleLegs(c, 3.6)
  + mir(`<path d="M60 51C41 51 32 71 32 97C32 124 46 141 60 142Z" fill="${c[0]}"/>`)
  + mir(`<path d="M46 66C40 80 39 99 42 116" fill="none" stroke="${c[3]}" stroke-width="3" stroke-linecap="round" opacity=".45"/>`)
  + mir(`<circle cx="44" cy="86" r="3" fill="${c[2]}" opacity=".55"/>`)
  + seam(c, 51, 91)
  + `<path d="M58 48C55 30 47 15 26 2C36 3 45 8 53 17C60 26 65 37 66 47Z" fill="${c[2]}"/>`
  + `<path d="M40 11C34 7 27 5 19 6C27 8 33 11 37 15Z" fill="${c[2]}"/>`
  + `<path d="M66 42C68 28 75 16 93 6C84 18 78 29 76 44Z" fill="${c[2]}"/>`
  + `<path d="M84 13C89 10 95 9 101 10C94 12 89 15 86 18Z" fill="${c[2]}"/>`
  + `<ellipse cx="60" cy="35" rx="11" ry="7.6" fill="${c[2]}"/>`
  + `<path d="M44 47C46 39 52 34 60 34C68 34 74 39 76 47L78 58C72 62.5 48 62.5 42 58Z" fill="${c[1]}"/>`;

const jewel = (c: Palette): string =>
  beetleLegs(c, 2.8)
  + mir(`<path d="M60 52C45 54 37 74 39 100C41 124 52 140 60 147Z" fill="${c[0]}"/>`)
  + mir(`<path d="M48 66C44 86 45 108 51 128" fill="none" stroke="${c[1]}" stroke-width="2.2" opacity=".7"/>`)
  + mir(`<g fill="${c[3]}"><circle cx="42" cy="82" r="3.2"/><circle cx="44" cy="104" r="3"/><circle cx="49" cy="124" r="2.6"/></g>`)
  + seam(c, 52, 92)
  + foreparts(c)
  + `<g fill="none" stroke="${c[2]}" stroke-width="2.4" stroke-linecap="round">${mir('<path d="M53 29C48 22 44 16 40 10"/>')}</g>`;

const chafer = (c: Palette): string =>
  beetleLegs(c)
  + mir(`<path d="M60 53C44 53 35 68 35 92C35 114 45 129 60 130Z" fill="${c[0]}"/>`)
  + mir(`<g fill="${c[3]}" opacity=".9"><rect x="41" y="88" width="8" height="3" rx="1.5" transform="rotate(-16 45 89)"/><rect x="45" y="104" width="9" height="3" rx="1.5" transform="rotate(-12 49 105)"/><rect x="40" y="72" width="6" height="3" rx="1.5" transform="rotate(-20 43 73)"/></g>`)
  + mir(`<path d="M45 63C39 76 38 94 41 108" fill="none" stroke="${c[3]}" stroke-width="2.6" stroke-linecap="round" opacity=".4"/>`)
  + seam(c, 53, 77)
  + foreparts(c)
  + clubbed(c);

/*
 * The snout is the giveaway, and so are the antennae: a weevil's are elbowed and
 * spring from halfway up the rostrum rather than from the head.
 */
const weevil = (c: Palette): string =>
  beetleLegs(c)
  + mir(`<path d="M60 52C43 52 35 69 35 93C35 116 46 128 60 129Z" fill="${c[0]}"/>`)
  + mir(`<g fill="${c[3]}"><circle cx="43" cy="70" r="3.4"/><circle cx="39" cy="88" r="3.8"/><circle cx="43" cy="106" r="3.4"/><circle cx="52" cy="120" r="3"/><circle cx="50" cy="60" r="2.6"/></g>`)
  + seam(c, 52, 76)
  + `<path d="M44 45C46 38 52 33 60 33C68 33 74 38 76 45L77 57C71 61 49 61 43 57Z" fill="${c[1]}"/>`
  + mir(`<circle cx="48" cy="42" r="3" fill="${c[3]}"/>`)
  + `<path d="M55.5 34L55.5 10C55.5 6 57.5 4 60 4C62.5 4 64.5 6 64.5 10L64.5 34Z" fill="${c[2]}"/>`
  + `<g fill="none" stroke="${c[2]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${mir('<path d="M56 19L43 14L37 5"/>')}</g>`;

const stag = (c: Palette): string =>
  beetleLegs(c, 3.4)
  + mir(`<path d="M60 56C45 56 37 74 37 98C37 122 48 136 60 137Z" fill="${c[0]}"/>`)
  + seam(c, 56, 81)
  + `<ellipse cx="60" cy="38" rx="13" ry="8" fill="${c[2]}"/>`
  + `<path d="M44 50C46 42 52 37 60 37C68 37 74 42 76 50L77 60C71 64 49 64 43 60Z" fill="${c[1]}"/>`
  + mir(
    `<path d="M54 34C48 20 38 8 20 0C25 12 30 22 32 34C35 25 45 24 51 30Z" fill="${c[2]}"/>`
    + `<path d="M28 10C23 7 17 6 11 7C18 9 23 12 26 16Z" fill="${c[2]}"/>`
    + `<path d="M33 22C38 20 44 21 48 25C43 22 37 22 33 24Z" fill="${c[2]}"/>`
    + `<circle cx="52" cy="35" r="2" fill="${c[3]}"/>`,
  );

/*
 * The forelegs are longer than the body, which is the whole reason anybody
 * remembers this beetle, so they get their own stroke rather than the shared set.
 */
const longhorn = (c: Palette): string =>
  `<g fill="none" stroke="${c[2]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${mir(
    '<path d="M50 54C34 44 20 30 12 12"/>'
    + '<path d="M48 70C33 71 23 79 15 92"/>'
    + '<path d="M50 90C35 98 28 110 24 126"/>',
  )}</g>`
  + `<g fill="none" stroke="${c[2]}" stroke-width="2.4" stroke-linecap="round">${mir(
    '<path d="M53 28C40 19 26 12 6 8"/>',
  )}</g>`
  + mir(`<path d="M60 52C46 52 40 74 40 100C40 126 50 142 60 146Z" fill="${c[0]}"/>`)
  + mir(
    `<path d="M41 74C48 78 54 76 60 72" fill="none" stroke="${c[3]}" stroke-width="4" stroke-linecap="round"/>`
    + `<path d="M41 98C48 94 54 96 60 100" fill="none" stroke="${c[3]}" stroke-width="4.5" stroke-linecap="round"/>`
    + `<path d="M44 122C50 126 55 125 60 122" fill="none" stroke="${c[3]}" stroke-width="4" stroke-linecap="round"/>`,
  )
  + seam(c, 52, 94)
  + foreparts(c);

/*
 * Wings held roof-wise over the body, the pale band across them, and eyes set
 * out at the corners of a very wide head. All three are Tosena.
 */
const cicada = (c: Palette): string =>
  `<g fill="none" stroke="${c[2]}" stroke-width="2.8" stroke-linecap="round">${mir(
    '<path d="M52 62C42 64 34 70 28 80"/><path d="M52 76C42 80 35 88 31 98"/><path d="M53 90C45 98 40 108 38 120"/>',
  )}</g>`
  + mir(`<path d="M57 50C42 58 26 86 18 126C33 120 49 96 59 70Z" fill="${c[1]}"/>`)
  + mir(`<path d="M57 54C45 64 34 86 30 110C41 100 52 82 58 66Z" fill="${c[0]}" opacity=".9"/>`)
  + mir(`<path d="M41 76L27 102L35 106L49 80Z" fill="${c[3]}" opacity=".92"/>`)
  + `<ellipse cx="60" cy="82" rx="13" ry="35" fill="${c[2]}"/>`
  + mir(`<path d="M50 62C52 76 52 94 50 108" fill="none" stroke="${c[1]}" stroke-width="2" opacity=".5"/>`)
  + `<path d="M45 40C45 32 51 27 60 27C69 27 75 32 75 40C75 46 69 51 60 51C51 51 45 46 45 40Z" fill="${c[2]}"/>`
  + mir(`<circle cx="46" cy="38" r="5.2" fill="${c[1]}"/>`);

const swallowtail = (c: Palette): string =>
  mir(
    `<path d="M58 46C40 33 19 29 8 40C3 59 20 79 57 85Z" fill="${c[2]}"/>`
    + `<path d="M57 84C40 83 23 92 17 108C15 125 26 135 36 132C39 142 41 154 40 166L52 134C58 119 59 100 57 84Z" fill="${c[2]}"/>`
    + `<path d="M55 50C41 40 25 37 16 44C13 58 26 73 55 78Z" fill="${c[0]}"/>`
    + `<path d="M54 87C41 87 28 94 24 107C22 119 30 127 38 124C44 116 52 104 54 87Z" fill="${c[0]}"/>`
    + `<path d="M50 55C40 49 30 47 23 51C22 60 31 69 51 73Z" fill="${c[3]}" opacity=".55"/>`,
  )
  + `<ellipse cx="60" cy="88" rx="5.6" ry="42" fill="${c[2]}"/>`
  + `<circle cx="60" cy="42" r="7" fill="${c[2]}"/>`
  + `<g fill="none" stroke="${c[2]}" stroke-width="2.2" stroke-linecap="round">${mir('<path d="M55 38C48 28 42 20 34 14"/>')}</g>`
  + mir(`<circle cx="33" cy="13" r="2.6" fill="${c[2]}"/>`);

const birdwing = (c: Palette): string =>
  mir(
    `<path d="M58 44C44 29 23 22 9 31C4 46 21 73 57 81Z" fill="${c[2]}"/>`
    + `<path d="M57 80C41 78 25 86 21 103C19 120 32 130 46 125C55 118 59 100 57 80Z" fill="${c[2]}"/>`
    + `<path d="M54 50C43 39 27 34 17 39C14 51 27 68 54 74Z" fill="${c[0]}"/>`
    + `<path d="M53 86C41 85 29 92 26 104C24 116 33 123 43 119C50 112 54 99 53 86Z" fill="${c[0]}"/>`
    + `<path d="M47 55C39 48 30 45 23 47C22 55 30 65 48 69Z" fill="${c[3]}" opacity=".5"/>`
    + `<circle cx="38" cy="104" r="4" fill="${c[1]}"/>`,
  )
  + `<ellipse cx="60" cy="84" rx="6.4" ry="40" fill="${c[2]}"/>`
  + `<circle cx="60" cy="40" r="7.4" fill="${c[2]}"/>`
  + `<g fill="none" stroke="${c[2]}" stroke-width="2.2" stroke-linecap="round">${mir('<path d="M55 36C48 27 41 19 33 13"/>')}</g>`
  + mir(`<circle cx="32" cy="12" r="2.6" fill="${c[2]}"/>`);

/*
 * A mantis is a long prothorax with a triangle on the front of it and two folded
 * arms, and nothing else about it matters at this size.
 */
const mantis = (c: Palette): string =>
  `<g fill="none" stroke="${c[2]}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${mir(
    '<path d="M55 74C42 76 32 84 26 96"/><path d="M56 88C44 94 36 104 32 118"/>',
  )}</g>`
  + mir(
    `<path d="M56 48C46 44 36 34 30 20C33 34 42 44 52 52Z" fill="${c[0]}"/>`
    + `<path d="M31 21C26 26 22 34 21 43C27 36 33 31 39 29Z" fill="${c[1]}"/>`
    + `<path d="M40 66C31 66 22 62 15 54C22 66 32 72 42 72Z" fill="${c[1]}"/>`,
  )
  + `<path d="M55 44C55 40 57 38 60 38C63 38 65 40 65 44L65 74C65 78 63 80 60 80C57 80 55 78 55 74Z" fill="${c[1]}"/>`
  + mir(`<path d="M60 72C50 76 45 94 48 114C51 130 57 138 60 141Z" fill="${c[0]}"/>`)
  + mir(`<path d="M50 92C46 100 46 112 49 122" fill="none" stroke="${c[3]}" stroke-width="2" opacity=".5"/>`)
  + `<path d="M48 24L72 24L60 44Z" fill="${c[2]}"/>`
  + mir(`<circle cx="52" cy="27" r="4" fill="${c[1]}"/>`)
  + `<g fill="none" stroke="${c[2]}" stroke-width="2" stroke-linecap="round">${mir('<path d="M52 24C46 17 41 12 35 8"/>')}</g>`;

/*
 * Phyllium is not leaf-shaped, it is CHEWED-leaf-shaped: the outline is notched
 * and the edges are a different colour from the middle. Drawing a tidy leaf is
 * the one way to get this animal wrong.
 */
const leaf = (c: Palette): string =>
  mir(
    `<path d="M44 58C32 54 22 60 17 71C26 67 36 64 45 65Z" fill="${c[0]}"/>`
    + `<path d="M40 86C28 86 19 94 16 106C25 99 35 94 43 93Z" fill="${c[0]}"/>`
    + `<path d="M43 112C33 116 27 126 26 138C33 129 41 123 48 120Z" fill="${c[0]}"/>`,
  )
  + mir(`<path d="M60 42C41 48 29 78 33 112C36 139 50 154 60 158Z" fill="${c[0]}"/>`)
  + mir(`<path d="M60 42C41 48 29 78 33 112C36 139 50 154 60 158Z" fill="none" stroke="${c[1]}" stroke-width="3"/>`)
  + mir(
    `<g fill="none" stroke="${c[1]}" stroke-width="1.8" opacity=".8">`
    + '<path d="M59 62L40 66"/><path d="M59 80L34 82"/><path d="M59 98L33 102"/>'
    + '<path d="M59 116L36 124"/><path d="M59 132L43 143"/></g>',
  )
  + `<rect x="58.6" y="44" width="2.8" height="112" rx="1.4" fill="${c[1]}"/>`
  + `<path d="M52 30C52 26 55 24 60 24C65 24 68 26 68 30L68 46C68 50 65 52 60 52C55 52 52 50 52 46Z" fill="${c[1]}"/>`
  + `<ellipse cx="60" cy="24" rx="7.5" ry="5.5" fill="${c[2]}"/>`
  + `<g fill="none" stroke="${c[2]}" stroke-width="2" stroke-linecap="round">${mir('<path d="M55 21C50 15 45 11 39 8"/>')}</g>`
  + `<g fill="none" stroke="${c[2]}" stroke-width="2.6" stroke-linecap="round">${mir('<path d="M54 34C46 32 40 28 35 22"/>')}</g>`;

const PLANS: Record<Bug['plan'], (c: Palette) => string> = {
  scarab, hercules, jewel, chafer, weevil, stag,
  longhorn, cicada, swallowtail, birdwing, mantis, leaf,
};

/* ------------------------------------------------------------------ draw --- */

/** Every colour replaced by one, which is what makes an outline a silhouette. */
const SHADOW: Palette = ['currentColor', 'currentColor', 'currentColor', 'currentColor'];

export interface BugArtOpts {
  /** Rendered height in px. The box is 120 x 170, so width follows. */
  size?: number;
  /** Draw it as an unfound outline instead of the specimen. */
  silhouette?: boolean;
}

/**
 * One bug, as an SVG element.
 *
 * `aria-hidden`, always: the name, the species and the hint are text beside it
 * in every place this is used, and a screen reader gaining "graphic" between
 * them helps nobody. That is the same rule the audit panel enforces on the
 * icons.
 */
export function bugArt(bug: Bug, opts: BugArtOpts = {}): SVGSVGElement {
  const size = opts.size ?? 96;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('height', String(size));
  svg.setAttribute('width', String(Math.round((size * W) / H)));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', opts.silhouette ? 'bug-art is-hidden-bug' : 'bug-art');
  svg.innerHTML = PLANS[bug.plan](opts.silhouette ? SHADOW : bug.palette);
  return svg;
}
