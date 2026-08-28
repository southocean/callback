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

/** The size budget CI enforces, in bytes of gzip. Kept in step with build.mjs. */
const BUDGET_KB = 50;

interface Row { k: string; v: string }

/**
 * What THIS repository uses. Not a CV skills list — see the note in buildDoc.
 * Every row is verifiable from the source tree or the build output.
 */
const THIS_BUILD: Row[] = [
  { k: 'TypeScript', v: 'strict, no framework, no runtime dependency at all' },
  { k: 'A hand-rolled h()', v: 'about twenty lines of DOM helper standing in for a view library' },
  { k: 'A pure reducer', v: 'all state in one function, which is why it is unit-tested without a browser' },
  { k: 'esbuild', v: 'code splitting per screen, and a gzip budget the CI fails on' },
  { k: 'Plain CSS', v: 'one stylesheet, custom properties for the two palettes, container queries for the windows' },
  { k: 'No backend', v: 'static files on GitHub Pages. Nothing is uploaded because there is nowhere to upload it' },
];

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


/**
 * The document itself, with no page chrome around it.
 *
 * `afterLead` is slotted between the two opening paragraphs. Nam: "you probably
 * want this heat map thingy after the first line description." The first
 * paragraph says what the artefact is; the chart then shows how it was made; and
 * the second paragraph, which is about the agentic build and the commit log, now
 * reads as commentary on the thing directly above it rather than as an assertion
 * with nothing behind it.
 */
export function buildDoc(afterLead?: HTMLElement): HTMLElement {
  return h(
    'div',
    { class: 'bd' },
    /*
     * ONE VOICE, TWO PARAGRAPHS.
     *
     * Nam: "the 2 first paragraphs have different styling (font size). Make sure
     * the styling is consistent. Also the text is a bit long. Make it concise."
     *
     * Both true. The first had .bd-lead and the second had nothing, so a reader
     * met two type sizes in the first two sentences of a document about
     * craftsmanship. Both carry the class now, and both are shorter.
     */
    h('p', { class: 'bd-lead' },
      'A CV you can talk to rather than read. It opens as a call because a call is a conversation, and the ' +
      'panels, captions and shared screen carry what a page of bullet points cannot.'),
    afterLead ?? null,
    h('p', { class: 'bd-lead' },
      'It is also, openly, a demonstration of agentic programming: one person and an agent, one week, with ' +
      'the interface measured off the real product rather than eyeballed. The corrections are in the commit ' +
      'log along with the retractions.'),

    h('h2', {}, 'The spec'),
    h('dl', { class: 'bd-rows' },
      ...SPECS.flatMap((r) => [h('dt', {}, r.k), h('dd', {}, r.v)])),

    /*
     * The Stack section used to render skills.primary — Nam's CV skills, which
     * include C++ and a React/Unity history that has nothing to do with this
     * repository. Nam: "this is project spec - everything in here is about this
     * project. The C++ and React are not relevant here in this project spec."
     *
     * Right, and it was a category error rather than a wrong list: the panel
     * documents the artefact, not its author. What is left is what this build
     * actually uses, and every line of it is checkable against the source.
     */
    h('h2', {}, 'The stack'),
    h('ul', { class: 'bd-stack' },
      ...THIS_BUILD.map((s) => h('li', {}, h('b', {}, s.k), ', ', h('span', {}, s.v)))),


  );
}
