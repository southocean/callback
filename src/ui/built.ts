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
    /*
     * Nam: sterilise the Google nod, and be open that this is heavily agentic
     * programming. Both are true and neither needs dressing up: the point of the
     * artefact is that it is a conversation rather than a page, and the point of
     * the method is that a person and an agent built it in a week.
     */
    h('p', { class: 'bd-lead' },
      'A CV you can talk to rather than read. It opens as a video call because a call is a conversation, and ' +
      'a conversation is a better way to meet someone than a page of bullet points — the panels hold the ' +
      'cover letter, the captions carry a voice-over, and the shared screen holds the work itself.'),
    h('p', {},
      'It is also, openly, a demonstration of agentic programming. One person and an agent built it in a week: ' +
      'the interface was measured off the real product rather than eyeballed, every task ran through the same ' +
      'three phases, and the corrections are in the commit log along with the retractions. The Timeline tab ' +
      'shows the shape of that; the Process tab shows the method.'),

    h('h2', {}, 'Specifications'),
    h('dl', { class: 'bd-rows' },
      ...SPECS.flatMap((r) => [h('dt', {}, r.k), h('dd', {}, r.v)])),

    h('h2', {}, 'Method'),
    h('dl', { class: 'bd-rows' },
      ...METHOD.flatMap((r) => [h('dt', {}, r.k), h('dd', {}, r.v)])),

    h('h2', {}, 'Stack'),
    h('ul', { class: 'bd-stack' },
      ...skills.primary.slice(0, 5).map((s) => h('li', {},
        h('b', {}, s.name), ' — ', h('span', {}, s.note)))),

    h('h2', {}, 'What shipped'),
    h('p', {}, shipped.body),
    h('p', { class: 'bd-note' },
      'The reviews, the board of what is still open, and the day-by-day history are the other tabs of this ' +
      'panel.'),
  );
}

