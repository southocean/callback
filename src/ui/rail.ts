// Meet's left navigation rail, and the two items of ours that live in it.
//
// It was inside home.ts until board ticket N137, which is where it belonged when
// the home screen was the only surface that had one. Nam: "on the left panel, we
// will display the bug and the progression ring, at the exact place they would be
// once we are back in home screen -- this might require copying the whole left
// panel in home screen but hide the first two buttons - so we keep the UI fully
// consistent."
//
// COPYING IT WAS THE OTHER OPTION and it is the one that goes wrong quietly. The
// whole point of the request is that the ring does not MOVE between the ended
// screen and the home screen: you leave a call looking at it, you press Return to
// home screen, and it is still under your eye. That only holds if both rails agree
// about item height, the 14px pitch, the padding above the first item, and which
// items exist at all. Two copies agree on the day they are written. So there is
// one builder, and the ended screen asks it for a rail with the first two items
// GHOSTED rather than removed: present, laid out, taking their space, but
// invisible, inert and out of the tab order. Nothing else has to know.

import { h } from '../dom.js';
import { sym } from './icons.js';
import { bugGlyph } from './bugart.js';
import { loadInterview, foundAll } from '../prefs.js';
import type { Bugs } from '../bugs.js';
import type { Store } from '../state.js';

export interface RailOpts {
  /**
   * Meetings and Calls are laid out and then hidden. The ended screen wants this:
   * it is not a place you navigate tabs from, but the two items below it have to
   * land where they land on the home screen.
   */
  ghostNav?: boolean;
  /** Which room the completion panel should dress itself for when opened. */
  theme?: 'light' | 'dark';
  /**
   * Count the ring up from the figure the visitor was last shown.
   *
   * The ended screen wants it and the home screen must not have it. This is the
   * one moment in the product where the number is allowed to be a REPORT rather
   * than a readout: you have just come out of a call, and the arc moving from 38
   * to 44 says what the pass was worth in a way that "44%" cannot. Arriving at
   * the home screen and watching the same six points be re-earned would say the
   * opposite -- that the figure is theatre. It is also the call that writes the
   * new baseline, so exactly one surface may do it.
   */
  animateRing?: boolean;
  /**
   * Let a rail item that has never been seen before ARRIVE -- board ticket N163.
   *
   * Same rule as animateRing and for the same reason: exactly one surface is
   * allowed to report, and it is the one you reach by leaving a call.
   */
  announce?: boolean;
}

/* --------------------------------------------------------- the first arrival */

/**
 * WHICH ITEMS HAVE INTRODUCED THEMSELVES -- board ticket N163.
 *
 * Nam: "in #ended screen, I want the bug and the progression bar to appear more
 * dramatically the first time they are to be shown (probably after the first call
 * ended). This means some kind of dramatic appear animation in place, like pops
 * up with a little shake or whatever."
 *
 * The three items below are all conditional -- the bug glyph on a catch, the side
 * quests on an unlock, the ring on a finished call -- so the ended screen after a
 * first call is the moment a column that had two things in it grows to five. Every
 * one of them was fading in at the same speed as the screen behind it, which is the
 * reliable way to make something appear and not be noticed.
 *
 * ONCE, EVER, PER ITEM, which is what the key is for. A pop on every visit is a
 * tic; a pop the first time is an introduction. Stored rather than derived because
 * there is nothing to derive it from: "have you been shown this before" is not a
 * fact about the collections, it is a fact about what this browser has drawn.
 *
 * A separate key rather than a field on an existing record, so a visitor who clears
 * their bugs from the admin panel gets the arrival again with them -- which is the
 * behaviour a reset should have.
 */
const MET_KEY = 'callback.railmet';

function met(): Set<string> {
  try {
    const raw = localStorage.getItem(MET_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    // Private browsing, or storage off. Then nothing has been met, and the worst
    // case is one extra flourish rather than a broken rail.
    return new Set();
  }
}

/**
 * Give an item its entrance, and remember that it had one.
 *
 * `order` staggers the three, because two things popping in the same frame read
 * as one layout jump rather than as two arrivals. The delay is in CSS rather than
 * in a timer so a reduced-motion visitor pays nothing for it at all: the media
 * query below drops the whole animation, delay included.
 */
function arrive(item: HTMLElement, id: string, order: number, opts: RailOpts): void {
  if (!opts.announce) return;
  const seen = met();
  if (seen.has(id)) return;
  seen.add(id);
  try {
    localStorage.setItem(MET_KEY, JSON.stringify([...seen]));
  } catch {
    /* Then it arrives again next time, which is a better failure than none. */
  }
  item.classList.add('rail-new');
  item.style.setProperty('--rail-in', `${360 + order * 170}ms`);
}

export function buildRail(store: Store, bugs: Bugs | undefined, opts: RailOpts = {}): HTMLElement {
  const rail = h(
    'nav',
    { class: `rail${opts.ghostNav ? ' rail-ghost' : ''}`, 'aria-label': 'Sections' },
    h(
      'button',
      {
        class: 'rail-item',
        type: 'button',
        'aria-current': 'true',
        // This had no onclick, so Calls was a one-way door: the rail rendered
        // Meetings as a button and then ignored every press. Nam found it by
        // trying to go back. Mirrors the Calls item below.
        onclick: () => store.dispatch({ t: 'screen', screen: 'home' }),
      },
      h('span', { class: 'rail-pill' }, sym('event', 24, { fill: true })),
      h('span', { class: 'rail-label' }, 'Meetings'),
    ),
    h(
      'button',
      {
        class: 'rail-item',
        type: 'button',
        'aria-current': 'false',
        onclick: () => store.dispatch({ t: 'screen', screen: 'calls' }),
      },
      h('span', { class: 'rail-pill' }, sym('call', 24)),
      h('span', { class: 'rail-label' }, 'Calls'),
    ),
  ) as HTMLElement;

  if (opts.ghostNav) {
    for (const item of [...rail.querySelectorAll<HTMLElement>('.rail-item')]) {
      /*
       * Three attributes, because they answer three different questions: what a
       * screen reader announces, what Tab lands on, and what a pointer can press.
       * A control that is only visually hidden is still all three of those, and a
       * disabled invisible button that a screen reader still reads out is a worse
       * bug than the one this is fixing.
       */
      item.setAttribute('aria-hidden', 'true');
      item.setAttribute('tabindex', '-1');
      (item as HTMLButtonElement).disabled = true;
    }
  }

  /*
   * A THIRD RAIL ITEM, and only for somebody who has caught something.
   *
   * Nam: "Once we have found a bug, we should add a bug button to the left side
   * bar, under Calls, so we can quickly check the bug collection again."
   *
   * Conditional for the same reason the secret quests are hidden until found: a
   * permanent item labelled Bugs on the first screen announces a mechanic
   * nobody has met yet, and turns a thing you stumble into a thing you were
   * assigned. Once one is caught it stops being a spoiler and starts being a
   * shortcut, which is exactly when it appears.
   *
   * It opens the case rather than navigating, because the case is a dialog
   * everywhere else it opens from, and a rail item that changed screen would be
   * the only one of the three that did something different.
   */
  if (bugs && bugs.count().got > 0) {
    const item = h(
      'button',
      { class: 'rail-item', type: 'button', 'aria-current': 'false' },
      h('span', { class: 'rail-pill' }, bugGlyph(24)),
      h('span', { class: 'rail-label' }, 'Bugs'),
    ) as HTMLButtonElement;
    item.addEventListener('click', () => { void import('./bugframe.js').then((m) => m.openBugFrame(bugs)); });
    arrive(item, 'bugs', 0, opts);
    rail.appendChild(item);
  }

  /*
   * THEN THE SIDE QUESTS -- board ticket N166.
   *
   * Nam: "after the call if you have managed to get any side quest ... we pops up
   * the button to open up the list of side quests ... The order of buttons: bugs,
   * then this, then progression bar."
   *
   * Same shape and same rule as the Bugs item above it, for the same reason: an
   * item that is always there announces a layer to somebody who has not met it,
   * and one that appears the moment you earn something is a shortcut rather than
   * an assignment. It opens a dialog rather than navigating, which is what both of
   * its neighbours do.
   *
   * COUNTED OUT OF STORAGE rather than off a Quests instance, and that is the only
   * reason this costs nothing. The live instance belongs to the call; neither
   * screen with a rail has one, so taking it as an argument would mean threading it
   * through home.ts, ended.ts and the router to read one boolean. `foundAll` is
   * already imported here, and the board itself fetches the quest list when it is
   * opened, so the initial bundle never carries it.
   */
  if (foundAll().quests.length > 0) {
    const item = h(
      'button',
      { class: 'rail-item', type: 'button', 'aria-current': 'false' },
      h('span', { class: 'rail-pill' }, sym('bolt', 24)),
      h('span', { class: 'rail-label' }, 'Quests'),
    ) as HTMLButtonElement;
    item.addEventListener('click', () => {
      void import('./questframe.js').then((m) => m.openQuestFrame(opts.theme ?? 'light'));
    });
    arrive(item, 'quests', 1, opts);
    rail.appendChild(item);
  }

  /*
   * AND THE COMPLETION, LAST -- board ticket N118.
   *
   * Nam: "Once progression is > 0 and at least one call has completed, when they
   * go back to home screen, we should show the progression there too. Maybe on
   * the left panel and last on the list."
   *
   * Both conditions matter and they guard different things. Above zero, because
   * a rail item reading 0% on a first visit is a scoreboard for a game nobody has
   * been told about. And after a completed call, because the number counts things
   * that are mostly inside the call: showing it to somebody who has not been in
   * yet would advertise the hunt before the thing being hunted.
   *
   * THE RING ITSELF, not a figure and not a caption -- board ticket N137. Nam,
   * with a picture of it: "this is what I want to show in the home screen, no
   * text, not a percentage number and a progress text that we currently have."
   *
   * What was there was a pill reading "44%" with the word "Progress" under it:
   * a rail item shaped like the two navigation items above it, and reading like a
   * spreadsheet cell. The ring is the motif this build already uses in four other
   * places, it carries its own number in the middle, and it needs no caption for
   * the same reason a battery icon needs none. Dropping the label also stops the
   * item claiming to be a destination, which it never was -- it opens a panel.
   *
   * Same shape as the Bugs item above in every other respect.
   */
  /*
   * FETCHED, NOT IMPORTED, and the size gate is why.
   *
   * completion.ts reads all three collections, so a static import here puts the
   * quest list, the bug list and the egg list in the INITIAL bundle, because this
   * rail is built by the first screen and is not deferred.
   *
   * So the rail is built without it and the item arrives when the chunk does.
   * `loadInterview` is checked first, synchronously and cheaply, so a visitor who
   * has never finished a call does not fetch the chunk at all.
   */
  if (loadInterview()) {
    void import('./progress.js').then((m) => {
      const p = m.progressNow();
      if (p.pct <= 0 || !rail.isConnected) return;
      const item = h(
        'button',
        {
          class: 'rail-item rail-prog',
          type: 'button',
          'aria-current': 'false',
          // The label the ring does not print. A button whose entire content is
          // an SVG arc and a number has no accessible name without it.
          'aria-label': `Your completion, ${p.pct} percent`,
        },
        h('span', { class: 'rail-pill rail-ring' }, m.ring(p, { size: 44, animate: opts.animateRing })),
        /*
         * A CAPTION, BUT ONLY IN THE DRAWER -- Nam: "looks a bit weird when you
         * only have 57% and no text label on the right. Lets add Completion for
         * the progression bar."
         *
         * He is right about where he is looking. Below 840 the rail is a drawer
         * and every row is a glyph with its name beside it, so a lone ring in
         * that column reads as an item whose label failed to load.
         *
         * The stylesheet hides it on the vertical rail above 840, and that is
         * mechanical rather than a second opinion: those items are 104x56 with
         * the pill and the label stacked, and a 44px ring plus an 8px gap plus a
         * 16px line is 68 in a 56px box. The earlier decision to drop the caption
         * there still holds anyway -- the ring carries its own number, the way a
         * battery icon does.
         */
        h('span', { class: 'rail-label' }, 'Completion'),
      ) as HTMLButtonElement;
      item.addEventListener('click', () => {
        void import('./progressframe.js').then((f) => f.openProgress(opts.theme ?? 'light', bugs));
      });
      arrive(item, 'progress', 2, opts);
      rail.appendChild(item);
    });
  }

  return rail;
}
