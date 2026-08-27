// The caption strip, and the clock the whole conversation runs on.
//
// Board tickets N47 and N48. This used to be three lines in call.ts: a div, a
// 900ms interval, and `ccText.textContent = line.text`. It is a module now
// because the strip stopped being a display and became the thing that decides
// when the next line is due.
//
// Nam asked for two changes and they turn out to be one mechanism:
//
//   "I want to display word by word kinda similar to how its capturing real
//    human voice, maybe pausing a little, a little uh, ah, and stuff that would
//    be in a normal casual speech."
//
//   "Then each caption bubble will only show for a certain amount of time, and I
//    want this to show, kinda like a next button that gradually fill up over
//    time ... If you click on the caption bubble or the empty space during this
//    period, we jump directly to the next line. But if user mouse hover on the
//    caption text then we pause this timer."
//
// So a line has a REVEAL and a DWELL, and `say` resolves when the dwell is
// spent. The script awaits that instead of a setTimeout, which is what makes the
// visitor's reading speed the thing in charge rather than the authored number.
//
// The decisions that took thinking about:
//
//   · THE RING IS DRIVEN IN JS, not by a CSS animation, even though the two
//     rings already in this stylesheet are CSS. Both of those have
//     `animation: none` under prefers-reduced-motion, which is correct for
//     decoration and would be a hang here: no animation means no animationend
//     means the line never advances. One clock, in script, that reduced motion
//     merely coarsens.
//
//   · THERE ARE NO HESITATIONS, AND PLACING THEM AUTOMATICALLY IS THE REASON.
//
//     Nam asked for "a little uh, ah, and stuff that would be in a normal casual
//     speech", and this file tried to derive the placement: clause boundaries, a
//     rarity gate tuned by counting against the real script, three separate
//     hashes so nothing correlated. Two hesitations in thirty-four lines, always
//     in the same place, costing the line no time.
//
//     It still had to come out, and the reason is worth keeping because it is not
//     a tuning problem. Both of the two landed IMMEDIATELY BEFORE A PUNCHLINE —
//     "the tests are real, they run in your browser, uh and you can break them",
//     "if I'm not, ah throw me out of a plane" — because a clause boundary near
//     the end of a sentence is exactly where the setup hands over to the joke.
//     Nam: "they are pausing right before the punch line!?!"
//
//     A comma is the only thing an algorithm can see. Where the joke is, and
//     therefore where a stumble would kill it, is not in the punctuation — it is
//     in the meaning, and the writer is the only one holding that. So placement
//     is going to be authored, line by line, once Nam has QA'd the script and
//     said where. Board ticket N53.
//
//     What survives here is the shape of the answer: whatever marks them will be
//     a RENDERING concern, not script data. An "uh" written into data/tour.ts
//     would show up in the Scripts panel, in the plain-document transcript and in
//     the screen-reader announcement, and all three should carry the sentence as
//     written.
//
//   · A PRESS IS TWO-STAGE: mid-reveal it finishes the line, and after that it
//     advances. Anything else means a visitor who presses to see the rest of a
//     sentence loses the sentence.

import { h } from '../dom.js';
import { announcer, prefersReducedMotion } from '../a11y.js';

/** The ring, matching the two already in this build. See styles.css. */
const RING_R = 9;
const CIRC = 2 * Math.PI * RING_R;

/**
 * How much of a line's dwell is spent typing it out.
 *
 * The rest is reading time. At 1.0 the last word would arrive as the ring
 * completed and nobody could read the end of the sentence; at 0.3 the caption
 * sits finished and motionless for most of its life, which is the subtitle-file
 * feel this was meant to get away from. 0.6 leaves a beat of stillness before it
 * moves on, which is what somebody who has finished a sentence looks like.
 */
const REVEAL_SHARE = 0.6;

/** No word arrives faster than this, however short the line's dwell. */
const MIN_WORD_MS = 26;
/** And none is slower than this, however long it is. */
const MAX_WORD_MS = 200;

interface Token {
  text: string;
  /** Extra stillness after this token, from its punctuation. */
  restMs: number;
}

/**
 * A line, cut into the pieces it arrives in.
 *
 * The rests are what stop it sounding like a metronome: a comma, semicolon or
 * colon is a breath, and a full stop is longer because it is the end of a
 * thought rather than a turn inside one.
 *
 * There was a third case, 220ms for an em dash, and it is gone because the script
 * no longer contains one anywhere — Nam had all twenty-two taken out, and a test
 * now keeps them out. A branch that provably cannot fire is worse than no branch:
 * it reads as a supported case.
 */
/**
 * A hesitation, and the only one the renderer knows about, board ticket N60.
 *
 * N53 removed the automatic version and said what would have to be true for it
 * to come back: "Placement, when it returns, is authored per line rather than
 * derived." This is that. The word is in the script because Nam wrote it there,
 * and all this does is hold on it, the way it already holds on a full stop.
 *
 * The distinction is not pedantic. The reverted version chose WHERE to stumble
 * by reading punctuation, and punctuation is exactly where a setup hands over to
 * a joke, so it kept landing in the one place a stumble must never go. A
 * renderer that only reacts to a word somebody typed cannot make that mistake.
 *
 * Comma-delimited, so "uh" mid-sentence is a hesitation and a sentence that
 * happens to end on one is not.
 */
const HESITATION = /^(uh|um|ah|er|erm),$/i;

export function tokenise(text: string): Token[] {
  return text.split(/\s+/).filter(Boolean).map((w) => ({
    text: w,
    restMs: HESITATION.test(w) ? 520 : /[.!?]$/.test(w) ? 260 : /[,;:]$/.test(w) ? 150 : 0,
  }));
}

export interface Caption {
  /** The strip itself, for the call to mount. */
  el: HTMLElement;
  /**
   * Put a line up and hold it for `ms`.
   *
   * Resolves when the dwell is spent, when the visitor presses past it, or when
   * another line supersedes it. Never rejects: a caption that throws would take
   * the conversation down with it.
   */
  say: (text: string, ms: number) => Promise<void>;
  /** A line with no dwell contract, for a quip putting back what it cut over. */
  show: (text: string) => void;
  /**
   * Take the strip off screen entirely, leaving the call looking finished.
   *
   * Not the same as clear(): this is used between the outro's lines (N49), where
   * an empty bubble would be as much of a tell as a full one. The bubble is a
   * dark rounded rectangle with padding, so emptying its text leaves a visible
   * placeholder that says "something is coming". This removes it, and the next
   * say() brings it back.
   */
  hush: () => void;
  /**
   * Hold this line open until the caller says otherwise.
   *
   * For lines the hand is performing something on (N55). A press still completes
   * the words -- refusing that would mean a visitor cannot read the sentence they
   * asked to see -- but it cannot end the line, and neither can the ring running
   * out. Whichever happens is remembered and applied the moment unlock() comes,
   * so the line ends as soon as the performance does and not a beat later.
   */
  lock: () => void;
  unlock: () => void;
  /**
   * End the held line's dwell now, without touching what is on screen.
   *
   * Used when a click jumps the script (N46): the line has been spoken, the
   * visitor has moved on, and whoever is awaiting `say` should stop waiting. This
   * is NOT the two-stage press — it never completes a half-typed line, because
   * the reason it is being called is that the subject is changing.
   */
  skip: () => void;
  /**
   * Announce something that is not a caption line — a state change the call
   * wants a screen reader to hear.
   *
   * It shares the caption's live region rather than adding a second one: two
   * polite regions on one surface interleave unpredictably, and the caption's is
   * already the place a screen reader is listening for this call's narration.
   */
  announce: (text: string) => void;
  clear: () => void;
  /**
   * Did the visitor's last press get spent in here?
   *
   * The conversation's own click handler asks, because a press that skips a
   * caption is somebody reading faster than the script talks — not somebody
   * getting restless — and scoring it as restlessness makes the narration
   * apologise for keeping up.
   */
  absorbed: (now: number) => boolean;
  destroy: () => void;
}

/** A press is counted as absorbed for this long after it lands. */
const ABSORB_MS = 120;

/**
 * WHAT COUNTS AS THE EMPTY SPACE.
 *
 * Nam: "that should be triggered if they click anywhere within this empty space
 * here that is intentionally clicking an empty space."
 *
 * Defined by exclusion, because the empty space has no element of its own — it
 * is whatever is left of the stage once the windows, the panels, the bars and
 * every control are taken out of it. Listed rather than inferred so that adding
 * a new surface to the call cannot silently start eating presses.
 */
const NOT_EMPTY = [
  'button', 'a', 'input', 'select', 'textarea', 'video', 'summary',
  '[role="button"]', '[role="menuitem"]', '[role="tab"]', '[role="dialog"]',
  '.wx', '.side', '.bar', '.dp', '.sp', '.ready', '.quest-tray', '.dk-task',
  '.dk-icon', '.cb-tab', '.tour-bar', '.pg-frame',
].join(',');

export function makeCaption(who: string): Caption {
  const reduced = prefersReducedMotion();

  const textEl = h('div', { class: 'cc-text' }) as HTMLElement;
  const live = h('div', { class: 'sr', 'aria-live': 'polite' }) as HTMLElement;
  const announce = announcer(live, 900);

  /*
   * The ring, same motif as the ready card's countdown and the ended screen's
   * return — a filling arc, drawn as an SVG dash offset. Third use of the
   * pattern, so it is the house idiom for "this will happen on its own" rather
   * than a new invention.
   *
   * aria-hidden: it is a restatement of a duration the visitor is not being
   * asked to act on, and the line itself is already announced.
   */
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const arc = document.createElementNS(ns, 'circle');
  arc.setAttribute('cx', '12');
  arc.setAttribute('cy', '12');
  arc.setAttribute('r', String(RING_R));
  arc.setAttribute('class', 'cc-arc');
  arc.style.strokeDasharray = `${CIRC}px`;
  svg.appendChild(arc);
  const ring = h('span', { class: 'cc-ring', 'aria-hidden': 'true' }) as HTMLElement;
  ring.appendChild(svg as unknown as Node);

  /*
   * FOCUSABLE, AND THAT IS AN ACCESSIBILITY FIX RATHER THAN A FLOURISH.
   *
   * Nam's framing for the dwell timer was explicitly about accommodation —
   * "player can read fast, slow, whatever and we can accommodate for it" — and
   * the first pass delivered it entirely through hover and pointerdown. A
   * keyboard-only visitor got a caption that moved on when it felt like it, with
   * no way to hold it or hurry it, which is a worse deal than no timer at all
   * and is the exact thing WCAG 2.2.2 is about.
   *
   * So the strip is a control: focus is the keyboard's hover and pauses the ring,
   * Enter and Space are the keyboard's press. It joins the call's tab order,
   * which is correct — it now does something.
   *
   * The label says what the keys do rather than describing the strip, because
   * "captions" is already obvious from the content being read out beneath it.
   */
  const el = h('div', {
    class: 'cc',
    tabindex: '0',
    role: 'group',
    'aria-label': 'Captions. Focus holds the current line; Enter shows the rest of it, or moves to the next.',
  },
    h('div', { class: 'cc-head' },
      h('div', { class: 'cc-who' }, who),
      ring),
    textEl,
    live) as HTMLElement;

  /* ------------------------------------------------------------- one line -- */

  let tokens: Token[] = [];
  /** How many tokens are on screen. */
  let shown = 0;
  /** Wall-clock ms spent on this line, not counting time spent paused. */
  let spent = 0;
  /** Total dwell for the line, or 0 when there is no dwell contract. */
  let dwell = 0;
  let paused = false;
  let raf = 0;
  let last = 0;
  let resolve: (() => void) | null = null;
  let dead = false;

  const paint = (): void => {
    textEl.replaceChildren(
      ...tokens.slice(0, shown).map((t) => h('span', {}, `${t.text} `)),
    );
  };

  /**
   * True while a beat is being performed on this line, and true if a settle was
   * asked for during it. See lock() on the Caption interface.
   */
  let locked = false;
  let wanted = false;

  const settle = (): void => {
    if (locked) { wanted = true; return; }
    const done = resolve;
    resolve = null;
    if (done) done();
  };

  /**
   * When each token is due.
   *
   * Derived from the dwell rather than authored, so a line whose duration is
   * tuned re-paces itself. The rests are added on top of the even share, which
   * is why the reveal is allowed to run slightly past REVEAL_SHARE on a line
   * that is mostly punctuation — running out of reading time is the lesser
   * failure against sounding like a metronome.
   */
  const dueAt = (i: number): number => {
    if (!tokens.length) return 0;
    const rests = tokens.reduce((a, t) => a + t.restMs, 0);
    const budget = Math.max(0, dwell * REVEAL_SHARE - rests);
    const per = Math.min(MAX_WORD_MS, Math.max(MIN_WORD_MS, budget / tokens.length));
    let t = 0;
    for (let k = 0; k < i; k += 1) t += per + tokens[k]!.restMs;
    return t;
  };

  const tick = (now: number): void => {
    raf = 0;
    if (dead) return;
    const dt = last ? now - last : 0;
    last = now;
    if (!paused) spent += dt;

    // Reveal everything now due. A tab that was in the background comes back
    // with a large dt, and catching up in one frame is right — the visitor did
    // not watch it type, so there is nothing to preserve.
    while (shown < tokens.length && spent >= dueAt(shown)) shown += 1;
    paint();

    if (dwell > 0) {
      const p = Math.min(1, spent / dwell);
      arc.style.strokeDashoffset = `${-CIRC * p}px`;
      if (p >= 1) { settle(); return; }
    }
    schedule();
  };

  const schedule = (): void => {
    if (dead || raf) return;
    if (!dwell && shown >= tokens.length) return;
    /*
     * Reduced motion gets the same clock at a coarser resolution: the line still
     * advances on time and the ring still reports it, but nothing moves smoothly.
     * The words are already all on screen in that mode, so the only thing this
     * paces is the ring.
     */
    raf = reduced
      ? window.setTimeout(() => tick(performance.now()), 250)
      : requestAnimationFrame(tick);
  };

  const stopClock = (): void => {
    if (!raf) return;
    if (reduced) window.clearTimeout(raf); else cancelAnimationFrame(raf);
    raf = 0;
  };

  const begin = (text: string, ms: number): void => {
    el.classList.remove('is-hushed');
    // A lock belongs to one line. Leaking it would hold the next line open with
    // nothing left to unlock it.
    locked = false;
    wanted = false;
    // A line arriving over an unfinished one resolves the old promise rather
    // than dropping it: whoever was awaiting it is moving on either way, and a
    // promise nobody settles is a script that stops mid-sentence.
    settle();
    stopClock();
    tokens = tokenise(text);
    shown = reduced ? tokens.length : 0;
    spent = 0;
    dwell = ms;
    last = 0;
    paused = false;
    el.classList.toggle('is-timed', ms > 0);
    arc.style.strokeDashoffset = '0px';
    paint();
    // The clean sentence, not the one with the stumble in it.
    announce(text);
    schedule();
  };

  /* --------------------------------------------------------------- presses -- */

  let absorbedAt = -1;

  /**
   * One press, two meanings.
   *
   * Mid-reveal it finishes the sentence. Once the sentence is whole it moves on.
   * The order matters: a visitor who presses because they want to read the end of
   * a line must not lose the line for asking.
   */
  const press = (): void => {
    if (dead) return;
    absorbedAt = performance.now();
    if (shown < tokens.length) { shown = tokens.length; paint(); return; }
    if (dwell > 0) settle();
  };

  /*
   * A PRESS DURING A CUTSCENE IS NOT AN APP INTERACTION — and this was the bug
   * behind the frozen hand.
   *
   * The strip absorbed the press for its own purposes and then let it through to
   * the page, which is fine on genuinely empty space and disastrous during a
   * performance: the share opens a real picker, and a press on the stage outside
   * it is the gesture that dismisses it. So a visitor pressing to skip the share
   * line cancelled the share, every step after it gave up quietly for want of a
   * target, and the rest of the script had nothing left to point at.
   *
   * While the line is LOCKED the press is swallowed. It still means "hurry up",
   * which the stage acts on, but it stops being a click on the application. Only
   * while locked: outside a cutscene, dismissing a picker by pressing beside it is
   * a real thing a visitor is allowed to do.
   *
   * Both events have to go. preventDefault on pointerdown does not stop the click
   * that follows it, and the picker listens for one of the two.
   */
  let swallowUntil = 0;

  const swallow = (e: Event): void => {
    e.preventDefault();
    e.stopPropagation();
    if ('stopImmediatePropagation' in e) (e as Event).stopImmediatePropagation();
  };

  const onDown = (e: Event): void => {
    if (dead || !e.isTrusted) return;
    const target = e.target as Element | null;
    if (!target) return;
    const mine = el.contains(target) || !target.closest(NOT_EMPTY);
    if (!mine) return;
    press();
    if (locked) {
      // 400ms covers the pointerup and the click that follow this pointerdown.
      swallowUntil = performance.now() + 400;
      swallow(e);
    }
  };

  const onClickCapture = (e: Event): void => {
    if (dead || !e.isTrusted) return;
    if (performance.now() > swallowUntil) return;
    swallow(e);
  };

  /*
   * Hover pauses, and it is deliberately the WHOLE strip rather than the text.
   * Nam said "if user mouse hover on the caption text" — but the ring is inside
   * the same bubble, and a pointer resting on a bubble whose timer is visibly
   * running is asking for it to stop wherever it happens to be sitting.
   */
  const onEnter = (): void => { paused = true; el.classList.add('is-held'); };
  const onLeave = (): void => { paused = false; el.classList.remove('is-held'); };

  /**
   * Enter and Space, and nothing else.
   *
   * Space is prevented because a focused non-button scrolls the page on Space,
   * and a visitor pressing it to see the rest of a sentence would get the call
   * scrolled out from under them instead. Every other key is left alone so Tab
   * still leaves, Escape still closes panels, and the app's own single-letter
   * shortcuts still reach main.ts.
   */
  const onKey = (e: KeyboardEvent): void => {
    if (dead) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    press();
  };

  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('focusin', onEnter);
  el.addEventListener('focusout', onLeave);
  el.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('pointerup', onClickCapture, true);

  return {
    el,
    say: (text, ms) => new Promise<void>((done) => {
      if (dead) { done(); return; }
      begin(text, ms);
      resolve = done;
    }),
    show: (text) => { if (!dead) begin(text, 0); },
    lock: () => { locked = true; wanted = false; },
    unlock: () => {
      locked = false;
      if (wanted) { wanted = false; settle(); }
    },
    hush: () => {
      if (dead) return;
      settle();
      stopClock();
      tokens = [];
      shown = 0;
      dwell = 0;
      textEl.replaceChildren();
      el.classList.remove('is-timed');
      el.classList.add('is-hushed');
    },
    skip: () => { if (!dead) settle(); },
    announce,
    clear: () => {
      settle();
      stopClock();
      tokens = [];
      shown = 0;
      dwell = 0;
      el.classList.remove('is-timed');
      textEl.replaceChildren();
    },
    absorbed: (now) => absorbedAt >= 0 && now - absorbedAt < ABSORB_MS,
    destroy: () => {
      dead = true;
      settle();
      stopClock();
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('focusin', onEnter);
      el.removeEventListener('focusout', onLeave);
      el.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('pointerup', onClickCapture, true);
    },
  };
}
