// How this site was built.
//
// Nam: "I noticed that the home screen also has a How this is built button that
// leads nowhere, so we do want to fill up that destination."
//
// It did lead nowhere, and for a specific reason: the button dispatched
// { t: 'engTab' }, whose reducer sets `panel: 'tools'` but never touches
// `screen`. From the home screen there is no panel to open, so the click
// changed state and painted nothing.
//
// One document, two consumers: the Overview tab of Project specs, and
// how-this-is-built.html in the mock Chrome. The standalone #built route is gone
// -- a separate page was a second answer to the same question, and Nam wanted the
// specs reachable from inside the call rather than only from the home screen.
//
// Everything factual here comes from src/data/devlog.ts, src/data/story.ts or
// the build config. Nothing is invented to fill a section.

import { h } from '../dom.js';
import { phases } from '../data/devlog.js';
import { shipped } from '../data/story.js';
import { skills } from '../data/cv.js';

/** The size budget CI enforces, in bytes of gzip. Kept in step with build.mjs. */
const BUDGET_KB = 50;

interface Row { k: string; v: string }

const SPECS: Row[] = [
  { k: 'Language', v: 'TypeScript, strict, in modules with one job each' },
  { k: 'Runtime dependencies', v: 'None. No framework, no bundled library, nothing to audit' },
  { k: 'State', v: 'A pure reducer, which is the reason it can be unit-tested without a DOM' },
  { k: 'Size', v: `An initial-load budget of ${BUDGET_KB} kB gzip, enforced in CI so it cannot rot` },
  { k: 'Loading', v: 'Everything past the first screen is a deferred chunk, fetched only when reached' },
  { k: 'Icons', v: 'A ~7 kB subset of Material Symbols, Apache-2.0. Where the subset lacks a glyph, the path is authored and said to be authored' },
  { k: 'Content', v: 'One data module. The call view and the plain document view render from it, so they cannot disagree' },
  { k: 'Hosting', v: 'Static files from docs/ on GitHub Pages. No server, no build step at request time' },
];

const METHOD: Row[] = [
  {
    k: 'Measure, do not guess',
    v: 'Geometry, colours and timings were read off the live product with getBoundingClientRect and getComputedStyle, not eyeballed from screenshots. Where a number could not be read — a native dialog, a canvas, an animation with no DOM — the notes say so rather than inventing one.',
  },
  {
    k: 'Say what is not cloned',
    v: 'Some surfaces could not be measured at all, and those are ours by admission: the share picker is a drawing of a browser dialog, and the presenting layout was authored before it could be read.',
  },
  {
    k: 'No dead controls',
    v: 'A control that cannot act is not rendered as a control. Rows that the original disables are disabled here too, and take no hover.',
  },
  {
    k: 'No Google marks',
    v: 'No logos, no wordmarks, no borrowed artwork. The typeface subset is the one openly licensed piece.',
  },
];

/** The document itself, with no page chrome around it. */
export function buildDoc(): HTMLElement {
  return h(
    'div',
    { class: 'bd' },
    h('p', { class: 'bd-lead' },
      'A CV that behaves like the product it is applying to. The site is a video call, and every control in ' +
      'the bar opens a real section of the application — not a screenshot of one.'),

    h('h2', {}, 'Scope'),
    h('p', {},
      'Rebuild the product from measurement rather than memory, and put the CV inside it.'),
    h('div', { class: 'bd-cards' },
      h('div', { class: 'bd-card' },
        h('b', {}, 'What is rebuilt'),
        h('span', {}, 'The home screen, the pre-join lobby, the in-call view with its panels, reactions, ' +
          'captions, screen share and the end screen.')),
      h('div', { class: 'bd-card' },
        h('b', {}, 'What is authored'),
        h('span', {}, 'The screen-share picker and the presenting layout. Both were unreachable to ' +
          'measurement, so both are ours and labelled as ours.'))),

    h('h2', {}, 'Timeline'),
    h('p', { class: 'bd-note' },
      'Four phases, in this order. The review phase came before any product code, which is why three ' +
      'findings changed the architecture instead of the paint.'),
    h('ol', { class: 'bd-phases' },
      ...phases.map((p) => h('li', {},
        h('b', {}, p.name),
        h('span', {}, p.body)))),

    h('h2', {}, 'Specifications'),
    h('dl', { class: 'bd-rows' },
      ...SPECS.flatMap((r) => [h('dt', {}, r.k), h('dd', {}, r.v)])),

    h('h2', {}, 'Method'),
    h('dl', { class: 'bd-rows' },
      ...METHOD.flatMap((r) => [h('dt', {}, r.k), h('dd', {}, r.v)])),

    h('h2', {}, 'Stack'),
    h('ul', { class: 'bd-stack' },
      ...skills.primary.slice(0, 5).map((s) => h('li', {},
        h('b', {}, s.name), h('span', {}, s.note)))),

    h('h2', {}, 'What shipped'),
    h('p', {}, shipped.body),
    h('p', { class: 'bd-note' },
      'The whole build log — every review finding, who raised it and what changed — is in the Engineering ' +
      'panel inside the call.'),
  );
}

