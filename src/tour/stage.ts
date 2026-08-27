// The guided tour's stage: the only part that touches the document.
//
// The director decides WHAT plays (src/tour/director.ts, pure and tested). This
// puts it on screen: the caption line, the cursor that moves to what is being
// talked about, and the clicks it performs when it gets there.
//
// See tools/PLAN-guided-tour.md §4. Three decisions from the review passes that
// are easy to get wrong and expensive to notice:
//
//   · THE CURSOR AND THE NARRATION ARE NOT IN LOCKSTEP. Narration waits for the
//     queue; the cursor does not. If both waited, a click would look ignored for
//     several seconds, which is the opposite of the point.
//
//   · A BEAT WHOSE TARGET IS MISSING IS SILENT. Selectors are resolved at beat
//     time, never cached. A cursor that travels to where something used to be is
//     worse than a cursor that stays still.
//
//   · REDUCED MOTION KEEPS THE TOUR. The cursor teleports instead of travelling
//     and the captions run as normal. Turning the feature off would deny the
//     content to the person who asked for less movement, which is not what that
//     setting means.

import { h } from '../dom.js';
import { prefersReducedMotion } from '../a11y.js';
import { parts, asides, type Beat, type Line } from '../data/tour.js';
import {
  reduceTour, initialTour, linesFor, partForElement, type TourState,
} from './director.js';

/** How long the cursor takes to travel, ms. Must match .tour-cursor in styles.css. */
const TRAVEL = 420;

export interface TourHandle {
  stop: () => void;
  /** For QA: the director state, read-only. */
  peek: () => TourState;
}

/**
 * What the call lends the tour.
 *
 * ONE caption surface, which the plan called for and my first pass ignored —
 * I built a second caption bar, and QA found exactly the consequence the plan
 * predicted: turning captions on reserved Meet's own caption strip (measured
 * behaviour, the stage really does shrink for it) and left it empty while a
 * second bar floated below. An empty reserved strip is the visible cost of two
 * systems that have to be kept in step.
 *
 * So the tour writes into the surface that already exists, and the call keeps
 * owning it. The only thing the tour adds to the DOM is the cursor and a Stop
 * control.
 */
export interface Podium {
  /** Put a line on screen, and announce it. */
  say: (text: string) => void;
  /** Stop the call's own scripted transcript while the tour is talking. */
  suspendTranscript: () => void;
  /** Hand it back. */
  resumeTranscript: () => void;
}

export function startTour(root: HTMLElement, podium: Podium): TourHandle {
  const reduced = prefersReducedMotion();
  let state = initialTour;
  let timer = 0;
  let dead = false;

  /* ---------------------------------------------------------------- chrome -- */

  const cursor = h('div', { class: 'tour-cursor', 'aria-hidden': 'true' },
    h('span', { class: 'tour-cursor-ring' }),
    h('span', { class: 'tour-cursor-dot' })) as HTMLElement;

  /*
   * The only chrome the tour owns: a Stop control. The words go into the call's
   * caption surface via the podium, which already has the live region and the
   * measured geometry.
   */
  const stopBtn = h('button', {
    class: 'tour-stop', type: 'button', 'aria-label': 'Stop the guided tour',
  }, 'Stop the tour') as HTMLButtonElement;
  const bar = h('div', { class: 'tour-bar' }, stopBtn) as HTMLElement;

  const caption = { set textContent(t: string) { podium.say(t); } };

  root.appendChild(cursor);
  root.appendChild(bar);
  podium.suspendTranscript();

  const teardown = (): void => {
    dead = true;
    window.clearTimeout(timer);
    cursor.remove();
    bar.remove();
    document.removeEventListener('click', onClick, true);
    // The call's own transcript takes the surface back, so the captions the
    // visitor switched on keep working after the tour is done with them.
    podium.resumeTranscript();
  };

  /* ---------------------------------------------------------------- cursor -- */

  let placed = false;
  const moveTo = (sel: string): Element | null => {
    const el = document.querySelector(sel);
    // A beat whose target is gone is skipped rather than guessed at.
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    // First placement jumps: travelling in from 0,0 looks like a bug.
    if (!placed || reduced) cursor.style.transition = 'none';
    else cursor.style.transition = '';
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    if (!placed || reduced) {
      // Force the no-transition frame to land before re-enabling.
      void cursor.offsetWidth;
      cursor.style.transition = '';
    }
    placed = true;
    cursor.classList.add('is-on');
    return el;
  };

  const runBeat = (b: Beat): void => {
    if (!b.move) return;
    const el = moveTo(b.move);
    if (!el || !b.click) return;
    // Click AFTER arriving, so the effect follows the cursor rather than
    // preceding it. The click is real: faking the effect separately is how a
    // demo drifts away from the app it is demonstrating.
    window.setTimeout(() => {
      if (dead) return;
      (el as HTMLElement).click();
    }, reduced ? 0 : TRAVEL + 60);
  };

  /* --------------------------------------------------------------- speaking -- */

  const speak = (lines: Line[], beats: Beat[] | undefined, done: () => void): void => {
    let i = 0;
    const next = (): void => {
      if (dead) return;
      if (i >= lines.length) { done(); return; }
      const line = lines[i]!;
      caption.textContent = line.text;
      for (const b of beats ?? []) if (b.at === i) runBeat(b);
      i += 1;
      timer = window.setTimeout(next, line.ms);
    };
    next();
  };

  /** One aside, then continue. Used for register changes and the hand-over. */
  const say = (line: Line, done: () => void): void => {
    caption.textContent = line.text;
    timer = window.setTimeout(done, line.ms);
  };

  const pump = (): void => {
    if (dead) return;
    if (state.mode === 'handedOver') {
      say(asides.handOver, teardown);
      return;
    }
    if (state.mode === 'finished') { teardown(); return; }
    if (!state.current) { teardown(); return; }

    const part = parts.find((p) => p.id === state.current);
    const lines = linesFor(state);
    const beats = state.register === 'lines' ? part?.beats : undefined;

    const go = (): void => speak(lines, beats, () => {
      state = reduceTour(state, { t: 'partDone' });
      pump();
    });

    // The register change is announced once, not every time it applies.
    if (state.register === 'brief' && !announcedShorten) {
      announcedShorten = true;
      say(asides.shorten, go);
      return;
    }
    go();
  };
  let announcedShorten = false;

  /* ------------------------------------------------------------- the visitor -- */

  function onClick(e: Event): void {
    if (dead) return;
    const el = e.target as Element | null;
    if (!el || stopBtn.contains(el)) return;
    const part = partForElement(el);
    if (!part) return;
    /*
     * The cursor acknowledges immediately even though the narration queues. This
     * is the split from review pass 2: a click that produces no visible response
     * for four seconds reads as a click that did nothing.
     */
    const first = part.triggers?.[0];
    if (first) moveTo(first);
    state = reduceTour(state, { t: 'visit', id: part.id });
    if (state.mode === 'handedOver') {
      window.clearTimeout(timer);
      pump();
    }
  }
  document.addEventListener('click', onClick, true);

  stopBtn.addEventListener('click', () => {
    state = reduceTour(state, { t: 'stop' });
    window.clearTimeout(timer);
    say(asides.stopped, teardown);
  });

  state = reduceTour(state, { t: 'start' });
  pump();

  return { stop: teardown, peek: () => state };
}
