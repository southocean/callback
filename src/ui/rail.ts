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
import { loadInterview } from '../prefs.js';
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
      ) as HTMLButtonElement;
      item.addEventListener('click', () => {
        void import('./progressframe.js').then((f) => f.openProgress(opts.theme ?? 'light', bugs));
      });
      rail.appendChild(item);
    });
  }

  return rail;
}
