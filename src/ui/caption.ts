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
//   · THE FILLERS ARE NOT IN THE SCRIPT. An "uh" authored into data/tour.ts
//     would appear in the Scripts panel, in the plain-document transcript and in
//     the screen-reader announcement — three places that should carry the
//     sentence Nam wrote. So they are inserted here, at render time, and the
//     announcement is built from the clean text.
//
//   · AND THEY ARE DETERMINISTIC. Math.random() would move the hesitation every
//     time the same line played, which is how you get a caption that looks
//     broken rather than a person who paused. Same line, same stumble, always.
//
//   · AND THEY ARE RARE — twice in the whole flow, which is a measured number
//     and not a vibe. The first pass put one on every line with a comma in it:
//     sixteen of thirty-four. Nam: "they should be very rare, almost like a nice
//     find. I'd say only 1 or twice. This is a well edited script and we should
//     treat it that way, even the user would expect that, so the uh and ah is
//     more a meta joke."
//
//     That is the right read, and the failure was a category error rather than a
//     tuning miss: constant hesitation is a speech-synthesis effect, and what
//     this wants is an editing joke. A joke told sixteen times is a tic. The rate
//     is pinned by a test that tokenises the real script and counts, so adding
//     lines cannot quietly make it chatty again.
//
//   · AND THEY COST NO TIME. Nam: "they should not slow down the conversation."
//     They cannot: a line's dwell is the ring, and the ring runs the authored
//     duration whatever the words do. A filler's rest is taken OUT of the reveal
//     budget rather than added to it, so it borrows a few milliseconds from the
//     words either side and gives the line back unchanged.
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

/**
 * The hesitations.
 *
 * Short, lower case, and none of them a word with meaning — a filler that reads
 * as content ("well", "so") changes the sentence, and this is not allowed to
 * change the sentence.
 *
 * 'mm' was in this pool and came out after QA. Spoken it is a hesitation; set in
 * text after an em dash it reads as a typo rather than a pause, and a caption
 * that looks mistyped undoes the entire point of the effect.
 */
const FILLERS = ['uh', 'uhm', 'ah'];

/**
 * HOW RARE. One eligible line in this many gets a hesitation.
 *
 * Tuned against the script rather than guessed: at 13 the flow's thirty-four
 * lines carry two, and both land where a person would actually pause — "and the
 * tests are real — uh they run in your browser", "and if I'm not, uh throw me out
 * of a plane". Neighbouring values were measured too; 5 gives five, 7 gives four,
 * 19 gives none at all in the flow.
 *
 * Three decisions — whether, where, and which word — are hashed on three
 * different seeds. Sharing one correlates them, and at this rate the correlation
 * is visible: with the word seeded off the bare text, both of the flow's two
 * hesitations came out as "uhm", and two identical stumbles in one script is a
 * pattern rather than a joke.
 *
 * The 'f:' prefix is doing nothing principled — it is the seed that happened to
 * give "uh" and "ah", the two Nam asked for, on today's script. Any seed is as
 * defensible; this one reads best. If the two lines it lands on are ever
 * reworded the words will move, which is fine: the property being protected is
 * that they differ from each other, and the test checks that rather than the
 * literal choices.
 */
const STUMBLE_ONE_IN = 13;

/** Stable, tiny, and only ever used to choose the same thing twice. */
const hash = (s: string): number => {
  let n = 0;
  for (let i = 0; i < s.length; i += 1) n = (n * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(n);
};

interface Token {
  text: string;
  /** A filler is rendered dimmer, and is left out of the announcement. */
  filler?: boolean;
  /** Extra stillness after this token — punctuation, or a hesitation. */
  restMs: number;
}

/**
 * A line, cut into the pieces it arrives in.
 *
 * The rests are what stop it sounding like a metronome: a comma is a shorter
 * pause than a full stop, and an em dash is longer than either because it is
 * where somebody changes direction mid-sentence.
 */
export function tokenise(text: string): Token[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: Token[] = [];

  /*
   * Where the hesitation goes, if this line gets one.
   *
   * Only at a clause boundary — after a comma or a dash — because that is where
   * a person actually hesitates. Mid-clause it reads as a rendering fault. A
   * line with no clause boundary gets no filler rather than an invented one.
   *
   * And never in a line that is saying thank you or goodbye. The closing lines
   * are the two places in this whole script where sounding composed matters
   * more than sounding casual.
   */
  const composed = /thank you|good luck|genuinely/i.test(text);
  const breaks = words
    .map((w, i) => (/[,—–-]$/.test(w) ? i : -1))
    .filter((i) => i >= 0 && i < words.length - 2);
  const eligible = !composed && words.length >= 7 && breaks.length > 0;
  // Eligible is not enough — see STUMBLE_ONE_IN. Most eligible lines get nothing.
  const rare = hash(`stumble:${text}`) % STUMBLE_ONE_IN === 0;
  const at = eligible && rare ? breaks[hash(text) % breaks.length]! : -1;

  words.forEach((w, i) => {
    const rest = /[.!?]$/.test(w) ? 260 : /[—–]$/.test(w) ? 220 : /[,;:]$/.test(w) ? 150 : 0;
    out.push({ text: w, restMs: rest });
    if (i === at) {
      // 140, not the 340 this shipped with. A third of a second of nothing is a
      // stall the eye reads as a stutter in the page; this is a beat.
      out.push({ text: FILLERS[hash(`f:${text}${w}`) % FILLERS.length]!, filler: true, restMs: 140 });
    }
  });
  return out;
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
      ...tokens.slice(0, shown).map((t) => h('span', t.filler ? { class: 'cc-uh' } : {}, `${t.text} `)),
    );
  };

  const settle = (): void => {
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

  const onDown = (e: Event): void => {
    if (dead || !e.isTrusted) return;
    const target = e.target as Element | null;
    if (!target) return;
    if (el.contains(target)) { press(); return; }
    // Anything that is a control, a window or a panel is not empty space.
    if (target.closest(NOT_EMPTY)) return;
    press();
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

  return {
    el,
    say: (text, ms) => new Promise<void>((done) => {
      if (dead) { done(); return; }
      begin(text, ms);
      resolve = done;
    }),
    show: (text) => { if (!dead) begin(text, 0); },
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
    },
  };
}
