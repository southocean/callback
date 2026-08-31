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
   * Let the conditional items ARRIVE rather than simply be there -- board ticket
   * N163, and every visit rather than once ever since N253.
   *
   * Same rule as animateRing and for the same reason: exactly one surface is
   * allowed to report, and it is the one you reach by leaving a call.
   */
  announce?: boolean;
}

/* ------------------------------------------------------------- the arrival */

/**
 * THE ENTRANCE, EVERY TIME -- board ticket N163, amended by N253.
 *
 * Nam, originally: "in #ended screen, I want the bug and the progression bar to
 * appear more dramatically the first time they are to be shown (probably after
 * the first call ended). This means some kind of dramatic appear animation in
 * place, like pops up with a little shake or whatever."
 *
 * The three items below are all conditional -- the bug glyph on a catch, the side
 * quests on an unlock, the ring on a finished call -- so the ended screen after a
 * first call is the moment a column that had two things in it grows to five. Every
 * one of them was fading in at the same speed as the screen behind it, which is the
 * reliable way to make something appear and not be noticed.
 *
 * IT USED TO RUN ONCE, EVER, PER ITEM, held in a `callback.railmet` key, on the
 * argument that a pop on every visit is a tic and a pop the first time is an
 * introduction. Nam saw it in a QA capture and said the opposite: "its very nice
 * I want to see that every time, not just the first time."
 *
 * He is right, and the original argument was answering a question this surface
 * does not ask. A tic is a flourish attached to something you pass constantly --
 * a button, a menu, a list row. This rail is on ONE screen, reached by ending a
 * call, and the whole point of the screen is to report what the last twenty
 * minutes produced. Three items popping in sequence is the report arriving, and a
 * report is allowed to arrive the same way twice. The visitor who sees it often
 * is the visitor who keeps coming back, which is not somebody to ration it from.
 *
 * And it was invisible in practice for a reason the storage made worse: the pop
 * happens on the ended screen, which most people reach once, having already met
 * the bug glyph on the home rail minutes earlier. So the one showing was spent
 * on an item the visitor had been looking at all session.
 *
 * WHAT THE STORED VERSION ALSO COST, and the thing that would have had to be
 * fixed to keep it: nothing cleared the key. `forget()` removes one exact key and
 * `callback.railmet` was never added to FORGETTABLE, so the comment that used to
 * stand here -- claiming a visitor who clears their bugs gets the arrival back --
 * was simply false, and the entrance was unreachable and untestable after its one
 * run. Deleting the gate settles that too, rather than adding a row to a panel to
 * restore something everybody now gets anyway.
 *
 * `callback.railmet` is left in the storage of anyone who has it, for the reason
 * prefs.ts gives about `callback.startart`: it is a few bytes nobody reads, and
 * the code to delete it would outlive the key it deletes.
 */

/** Between one item's pop and the next. */
const STAGGER = 170;

/**
 * Give an item its entrance.
 *
 * `order` staggers the three, because two things popping in the same frame read
 * as one layout jump rather than as two arrivals. The delay is in CSS rather than
 * in a timer so a reduced-motion visitor pays nothing for it at all: the media
 * query beside the keyframes drops the whole animation, delay included.
 *
 * `announce` is still the gate, and it is the only one now. Exactly one surface
 * gets this -- the ended screen -- because the home rail is furniture you scroll
 * past on the way somewhere, and furniture that pops every time you look at it IS
 * the tic the paragraph above says this is not.
 *
 * THE 360ms LEAD-IN IS GONE -- N253. Nam: "they should start the moment we are in
 * the end screen. Right now I feel there is a little delay?"
 *
 * There was, and it was not a feel. Every item carried `360 + order * 170`, so
 * the first pop was over a third of a second after the screen arrived, and the
 * whole cascade finished a second and a half in. A lead-in like that is worth
 * paying when something else is moving first and the entrance has to wait its
 * turn -- but nothing on .ended animates in, the screen is simply appended, so
 * the 360 bought an empty stage and nothing else. First item now at zero, which
 * with `both` means it starts on the first frame the item is rendered.
 *
 * `since` IS THE HALF THAT IS ACTUALLY SUBTLE, and it is the other reason he
 * could feel a delay he could not point at. Two of these items are built
 * synchronously and the third is not: the completion ring is appended from inside
 * `import('./progressframe.js').then(...)`, so its animation clock starts
 * whenever that chunk lands rather than when the screen did. Its delay was being
 * added ON TOP of the import, which is why the ring was the conspicuously late
 * one -- and worse on a cold cache, which is exactly the visit where it matters.
 *
 * So the cascade is timed against the SCREEN's clock rather than each item's own.
 * `since` is stamped when the rail is built; an item that arrives late has that
 * lateness taken off its share, down to zero. A ring whose chunk took 300ms pops
 * immediately on arrival instead of 340ms after it, and the three still read as
 * one sequence however the network behaved.
 */
function arrive(item: HTMLElement, order: number, opts: RailOpts, since: number): void {
  if (!opts.announce) return;
  const late = performance.now() - since;
  item.classList.add('rail-new');
  item.style.setProperty('--rail-in', `${Math.max(0, order * STAGGER - late)}ms`);
}

export function buildRail(store: Store, bugs: Bugs | undefined, opts: RailOpts = {}): HTMLElement {
  /*
   * The clock the cascade is timed against. Stamped here rather than at the first
   * arrive() call, because the whole point is that it is one clock for all three
   * items -- including the one that turns up after a dynamic import. main.ts
   * appends what this returns in the same task, so "the rail was built" and "the
   * screen arrived" are the same frame.
   */
  const since = performance.now();
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
    arrive(item, 0, opts, since);
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
    arrive(item, 1, opts, since);
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
      arrive(item, 2, opts, since);
      rail.appendChild(item);
    });
  }

  return rail;
}
