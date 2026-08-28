// The guided tour's stage: the only part that touches the document.
//
// The director decides WHAT plays (src/tour/director.ts, pure and tested), the
// profile decides WHO it is playing to (src/tour/profile.ts, also pure and also
// tested), and the hand does the pointing (src/tour/cursor.ts). This is the part
// that owns the timing, the DOM and the consequences.
//
// See tools/PLAN-guided-tour.md §4. The decisions that are easy to get wrong and
// expensive to notice:
//
//   · THE TOUR DRIVES THE APP THROUGH ITS OWN CONTROLS. Sharing a screen means
//     pressing Share screen, choosing Entire Screen, choosing Screen 1 and
//     pressing Share — the same four presses a person makes. Nothing here
//     reaches past the interface into the store. A demo that takes shortcuts
//     drifts away from the product it is demonstrating, silently, and the first
//     time anyone finds out is when a control breaks and the demo does not.
//
//   · A BEAT WHOSE TARGET IS MISSING IS SILENT. Selectors are resolved at beat
//     time, never cached. A hand that travels to where something used to be is
//     worse than a hand that stays still.
//
//   · THE VISITOR'S EVENTS AND THE HAND'S ARE TOLD APART BY isTrusted, not by a
//     flag. Synthetic events are never trusted, real ones always are, and the
//     browser maintains that for free. The flag version of this had a race: the
//     hand's click is dispatched inside an await chain and the flag outlived it
//     by a frame, which ate the visitor's next real click.
//
//   · REDUCED MOTION KEEPS THE WHOLE THING. The hand teleports instead of
//     travelling, does not tremor, and still presses. The captions run as
//     normal. Turning the feature off would deny the content to the person who
//     asked for less movement, which is not what that setting means.
//
//   · NOTHING HERE MEASURES A LINE'S DURATION any more. After N48 the caption
//     owns the clock: it reveals the words, fills its ring over the authored
//     dwell, pauses on hover and jumps on a press, and `podium.say` resolves
//     when it is done. So a line's length is a request, and the reader answers.
//
//   · THE DIRECTORY IS STILL CALLED tour/. N44 took the word off every surface a
//     visitor can see and deliberately left the internals alone — renaming a
//     pure module that nothing reads out loud costs a diff and buys nothing.

import { h } from '../dom.js';
import { prefersReducedMotion } from '../a11y.js';
import {
  parts, story, acks, asides, backTo, opener, resumeAt, askQuestion,
  banter, outroOpen, outroClose, outroTease, outroAllFound,
  OUTRO_GAPS, OUTRO_COUNT_SLOT, BANTER_SLOTS,
  type Bail, type Beat, type Line, type Surface,
} from '../data/tour.js';
import {
  markEggSeen, unseenEggs, seenBanter, markBanterSeen, chooseBanter, clearBanter,
  heardAnswers, markAnswerHeard, markQuipFound,
} from '../prefs.js';
import { currentPitch } from '../data/companies.js';
import { makeHand, type Hand, type Scroller } from './cursor.js';
import {
  reduceTour, initialTour, linesFor, partForElement, quipForElement, quipForEvent, quipById,
  type TourState,
} from './director.js';
import {
  observe, initialVisitor, pace, passive, tier, acknowledge, IDLE_MS, BAIL_MS,
  type Visitor,
} from './profile.js';

export interface TourHandle {
  stop: () => void;
  /** For QA: the director state and the visitor model, read-only. */
  peek: () => { tour: TourState; visitor: Visitor };
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
 * owning it. The only things the tour adds to the DOM are the hand, the
 * restlessness meter and a Stop control.
 */
export interface Podium {
  /**
   * Put a line on screen and hold it.
   *
   * Resolves when the line's dwell is spent — which is NOT the same as the
   * authored duration elapsing. The visitor can press past it, or hover to hold
   * it indefinitely, and the caption is the thing that decides (N48). Awaiting
   * this rather than a setTimeout is what handed the pacing to the reader.
   */
  say: (text: string, ms: number) => Promise<void>;
  /** A line with no dwell contract — a quip putting back what it cut over. */
  show: (text: string) => void;
  /** Take the caption strip off screen. Used for the outro's silences (N49). */
  hush: () => void;
  /** Hold the current line open until unlock(). See the cutscene note below. */
  lock: () => void;
  unlock: () => void;
  /** Abandon the line being held, now. Used when a click jumps the script. */
  skip: () => void;
  /** Are the call's captions on? If not, this is a silent film. */
  captionsOn: () => boolean;
  /**
   * Was the visitor's press spent skipping a caption?
   *
   * A press that advances a line is somebody reading faster than the script
   * talks. Scoring it as restlessness makes the narration apologise for the
   * visitor keeping up, and then offer to talk faster, which it already is.
   */
  absorbed: (now: number) => boolean;
  /** Open an easter-egg clip on the shared screen. */
  playEgg: (id: string) => void;
  /**
   * Hand the visitor a side quest the script has just completed for them.
   *
   * N63. Off the clock plays the clips nobody found, so it has to be the thing
   * that credits them for it: a visitor who watched all six and got nothing has
   * been shown the content and denied the mechanic.
   */
  quest: (id: string) => void;
  /**
   * The conversation reached its last line, in `ms`. Not called when the
   * visitor stops it, and not called when it gives up and hands over — neither
   * is a completed hearing, so neither is timed.
   */
  finished: (ms: number) => void;
  /** The outro was sat through to its final word. */
  stayed: () => void;
  /**
   * How many bugs this visitor has not caught -- board ticket N67.
   *
   * The outro's tease names the number, so it has to be the real one. It comes
   * through the podium rather than being imported because the collection is
   * owned by the app shell and the conversation is a guest in the call.
   */
  bugsLeft: () => number;
}

/**
 * How many clips the offclock segment opens.
 *
 * N63 raised this to "all of them" on the grounds that the achievements are a
 * walk around the surface and withholding half of it buys nothing. Nam has taken
 * it back to three now that there are seven: seven clips at five seconds each is
 * a minute and a half of somebody else's home video in the middle of a job
 * application, and the segment stops being a flourish and becomes the show.
 *
 * The rest stay findable in the calendar, which is where they always were.
 */
const EGGS_SHOWN = 3;

/** How long to keep looking for something the tour has just asked for. */
const APPEAR_MS = 4000;
/** Silence after which the tour drops a stale backlog. */
const SETTLE_MS = IDLE_MS;
/** Silence after the flow is over before the personal segment starts. */
const STORY_MS = 9000;
/** Two acknowledgements closer together than this would be nagging. */
const ACK_GAP_MS = 9000;
/**
 * Silence after everything else is spent before the outro starts.
 *
 * Longer than the story's wait, because this one has to read as the conversation
 * genuinely having ended. Come back too soon and it is not banter about nobody
 * leaving — it is the script still going.
 */
const OUTRO_WAIT_MS = 120_000;

export function startTour(root: HTMLElement, podium: Podium): TourHandle {
  const reduced = prefersReducedMotion();
  let tour = initialTour;
  let visitor: Visitor = { ...initialVisitor, lastInput: performance.now() };
  let dead = false;
  let timer = 0;

  /* ---------------------------------------------------------------- chrome -- */

  const hand: Hand = makeHand(document.body, reduced);

  /**
   * The restlessness meter — board ticket N32.
   *
   * Nam: "Let's flash a restlessness bar somewhere on the screen whenever this
   * bar gets increased, only at the moment of the increase, then it fades away
   * and hidden."
   *
   * So it is not a HUD. It appears when the number moves UP, holds long enough
   * to be read, and goes. Showing it while it decays would turn a reaction into
   * a dashboard, and a dashboard is a thing the visitor has to manage.
   */
  const meterFill = h('i', { class: 'rest-fill' }) as HTMLElement;
  const meter = h('div', { class: 'rest', 'aria-hidden': 'true' },
    h('span', { class: 'rest-label' }, 'restless'),
    h('span', { class: 'rest-track' }, meterFill)) as HTMLElement;
  let meterTimer = 0;

  const flashMeter = (): void => {
    meterFill.style.width = `${Math.round(visitor.restless * 100)}%`;
    meter.dataset['tier'] = tier(visitor);
    meter.classList.add('is-up');
    window.clearTimeout(meterTimer);
    meterTimer = window.setTimeout(() => meter.classList.remove('is-up'), 1900);
  };

  /*
   * N44. Was "Stop the tour", which was the last visitor-facing use of the word
   * and the one that mattered most: it told the visitor what they were in.
   */
  const stopBtn = h('button', {
    class: 'tour-stop', type: 'button', 'aria-label': 'Stop him talking',
  }, 'Stop talking') as HTMLButtonElement;
  const bar = h('div', { class: 'tour-bar' }, stopBtn) as HTMLElement;

  /**
   * THE STOP CONTROL GOES WITH THE GOODBYE, not with the last word.
   *
   * Nam: "when you finish the script with the goodbye, like after we have
   * answered all the questions not in the CV, this is like post credit part, we
   * should remove the stop talking button, cause now its not really active
   * talking anymore, also to signal that that was the timing."
   *
   * It used to survive to the end of the outro, and the reasoning for that was
   * about the segment BEFORE it: the personal answers are uninterruptible except
   * by Stop, so taking the control away early would leave ninety seconds with no
   * exit. The moment those answers finish, that reason expires. Everything after
   * is post-credits, abandoned by any input at all, so an offer to stop it is an
   * offer to stop something that is barely happening.
   *
   * And it carries information. The control disappearing is the clearest signal
   * available that the timed part is over, which is the second half of what Nam
   * is asking for: it marks the end without a caption saying so.
   */
  const dropBar = (): void => { bar.remove(); };

  root.appendChild(bar);
  root.appendChild(meter);

  /* ----------------------------------------------------------------- voice -- */

  /**
   * The line currently holding the floor.
   *
   * A quip cuts in over it and then puts it back, so the flow does not lose its
   * place to a joke about the taskbar clock.
   */
  let floorLine = '';
  /**
   * When the last caption went up, which is not the same as when the flow ended.
   *
   * Board ticket N109. The after-credits used to wait on `flowEndedAt`, so a
   * visitor who spent five minutes clicking around after the goodbye -- hearing
   * commentary the whole time -- still got "Still here?" measured from a moment
   * long past. Nam: "Right now still here is triggered almost immediately after
   * we finish the script, so its very bizarre, like of course Im here! We JUST
   * finished, let me breathe!"
   *
   * Every line moves this, including the commentary, so the silence being waited
   * on is real silence rather than the absence of one particular thing.
   */
  let spokeAt = 0;

  /**
   * Say a line and hold it for as long as the visitor wants it.
   *
   * The dwell is authored, then scaled by how patient they are being, then
   * handed to the caption — which may cut it short on a press, stretch it
   * indefinitely on a hover, or end it early because the script jumped. All
   * three arrive here as the promise resolving, which is why nothing in this
   * file measures a line's duration any more.
   */
  const voice = async (text: string, ms: number): Promise<void> => {
    floorLine = text;
    spokeAt = performance.now();
    await podium.say(text, Math.max(0, Math.round(ms * pace(visitor))));
  };

  /**
   * What a line actually says, once the employer is resolved.
   *
   * Exactly one line in the script carries an `alt`, and it is the only sentence
   * in the whole conversation that names a company. Since N66 the named version
   * is what almost everybody hears; the alternative exists because the neutral
   * build is still one parameter away, and a sentence thanking an employer
   * nobody applied to is worse than no sentence at all.
   */
  const words = (line: Line): string => (
    line.alt !== undefined && !currentPitch().named ? line.alt : line.text
  );

  /* -------------------------------------------------------- the interview -- */

  /**
   * When the first word was said, and whether the whole thing was heard.
   *
   * Board ticket N51. The clock starts on the first line rather than on mount,
   * because the pre-roll includes pressing the captions button and waiting for a
   * window animation — time the visitor spends watching, but not time spent in
   * the conversation.
   */
  let startedAt = 0;
  /** True once the conversation reached its own last line under its own steam. */
  let heardOut = false;
  /**
   * STOP IS A PAUSE NOW, NOT AN ENDING — board ticket N98.
   *
   * Nam: "When clicking stop talking, the script literally freezes in place and
   * caption doesnt close. We should acknowledge this instead of abruptly
   * stopping."
   *
   * It did freeze, and the freeze was the honest symptom of the design: the
   * handler tore the whole thing down mid-sentence, so whatever the hand was
   * doing stayed half done and the caption strip kept the last line it had been
   * given. Stop meant "die", and dying in the middle of a gesture looks exactly
   * like a hang.
   *
   * So it is a request rather than a kill. `pauseWanted` is set by the control
   * and consumed at the next safe point in speak() -- which is AFTER the line and
   * after any beat on it, because a beat is a cutscene (N55) and abandoning one
   * is what left the hand frozen. Then he acknowledges it, turns the captions off
   * himself, and waits. Turning them back on is how the visitor asks him back.
   */
  let pauseWanted = false;
  let paused = false;
  /** Total ms spent paused, taken off the interview clock. See finished(). */
  let pausedMs = 0;
  /**
   * True while the hand is performing a beat, which is the window in which a
   * press hurries it instead of skipping it. See the cutscene note in speak().
   */
  let performing = false;

  /* ----------------------------------------------------------------- timing -- */

  const wait = (ms: number): Promise<void> => new Promise((done) => {
    if (dead || ms <= 0) { done(); return; }
    timer = window.setTimeout(done, ms);
  });

  /*
   * There used to be a `beat(ms)` here — a pause scaled by how patient the
   * visitor was being — and every line in the script was spoken as voice() then
   * beat(). After N48 the caption owns every duration in this file and `voice`
   * does the scaling on the way in, so there was nothing left for it to pace.
   */

  const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()));

  const q = (sel: string): HTMLElement | null => document.querySelector<HTMLElement>(sel);

  /** Poll for something the tour has just caused, and give up rather than hang. */
  const appears = async (sel: string, ms = APPEAR_MS): Promise<HTMLElement | null> => {
    const until = performance.now() + ms;
    for (;;) {
      const el = q(sel);
      if (el) return el;
      if (dead || performance.now() > until) return null;
      await frame();
    }
  };

  /* -------------------------------------------------------------- surfaces -- */

  /**
   * The two things the tour scrolls.
   *
   * `cv` is the REAL CV document, framed same-origin inside the mock browser —
   * so scrolling it means reaching into the iframe, which is allowed here and
   * would not be for anything third-party. `page` is the mock browser's own
   * page area, which is where the authored documents live.
   *
   * Both return null when they are not on screen, and every caller treats null
   * as "skip this beat" rather than as an error. A tour that throws because the
   * visitor closed a window is a tour that ends on a stack trace.
   */
  const scroller = (of: Surface): Scroller | null => {
    if (of === 'cv') {
      const f = document.querySelector<HTMLIFrameElement>('.shot .pg-frame');
      const doc = f?.contentDocument;
      const el = doc?.scrollingElement as HTMLElement | undefined;
      if (!f || !el) return null;
      return {
        top: () => el.scrollTop,
        max: () => Math.max(0, el.scrollHeight - el.clientHeight),
        set: (y) => { el.scrollTop = y; },
        rect: () => f.getBoundingClientRect(),
      };
    }
    const el = document.querySelector<HTMLElement>('.shot .cb-page');
    if (!el) return null;
    return {
      top: () => el.scrollTop,
      max: () => Math.max(0, el.scrollHeight - el.clientHeight),
      set: (y) => { el.scrollTop = y; },
      rect: () => el.getBoundingClientRect(),
    };
  };

  /**
   * Where a named section starts, inside whichever surface it lives in.
   *
   * Headings are matched by their text rather than by an id, because the CV is
   * one data module rendered into a document that has never needed anchors — and
   * adding ids to it purely so the tour can find them would be the tour reaching
   * into the content. If the heading is renamed the beat goes silent, which is
   * the same failure mode as a missing selector and the same correct answer.
   */
  const headingTop = (of: Surface, name: string): number | null => {
    const doc = of === 'cv'
      ? document.querySelector<HTMLIFrameElement>('.shot .pg-frame')?.contentDocument
      : document;
    const scope: ParentNode | null | undefined = of === 'cv'
      ? doc
      : document.querySelector('.shot .cb-page');
    if (!scope) return null;
    const want = name.toLowerCase();
    for (const el of scope.querySelectorAll<HTMLElement>('h1, h2, h3')) {
      if ((el.textContent ?? '').trim().toLowerCase() === want) {
        // offsetTop is relative to the offsetParent, which for a section heading
        // inside a plain document is the document itself. Falling back to the
        // rect keeps it working when it is not.
        return el.offsetTop > 0 ? el.offsetTop - 24 : null;
      }
    }
    return null;
  };

  /**
   * TRUE WHILE THE HAND IS THE ONE SCROLLING.
   *
   * A programmatic scrollTop dispatches a scroll event that is byte-identical
   * to a wheel, and isTrusted does not help: the browser marks scroll events
   * trusted whoever caused them. So the listener has to be told.
   *
   * QA caught the consequence, and it was the funniest possible one: the hand
   * rolled the CV down to the Wasabi years, its own scroll registered as the
   * visitor bolting out of them, and the tour accused the visitor of skipping
   * a section it was in the middle of scrolling to. Two seconds after the line
   * it was protecting.
   *
   * It also poisoned the reading-speed estimate, which is the profile's most
   * load-bearing signal: every roll was being scored as a skim.
   */
  let rolling = false;

  const roll = async (of: Surface, to: number | string, ms?: number): Promise<void> => {
    const s = scroller(of);
    if (!s) return;
    const target = typeof to === 'number'
      ? s.max() * to
      : headingTop(of, to) ?? s.top();
    rolling = true;
    try {
      await hand.roll(s, target, ms ?? 1200);
    } finally {
      // A frame's grace: the last scroll event of a roll arrives after the last
      // scrollTop write, and clearing the flag on the same tick lets it through.
      window.setTimeout(() => { rolling = false; }, 120);
    }
  };

  /* ------------------------------------------------------------------ cues -- */

  /**
   * Travel to a control and press it, if it is there.
   *
   * `clear` means the press changed what is on screen and the hand is now in
   * front of it, so it moves aside afterwards. Nam: "after a useful click, user
   * would move the mouse to the empty space to not obstruct the view."
   *
   * Opt-in rather than automatic, because it is only true of a press that ENDS
   * something. Nobody wanders off between picking Entire Screen and picking
   * Screen 1 — those are three presses of one decision, and moving away between
   * them would look like second thoughts.
   */
  const pressSel = async (sel: string, clear = false): Promise<boolean> => {
    const el = q(sel);
    if (!el) return false;
    await hand.at(el, true);
    if (clear) await hand.retreat(el);
    return true;
  };

  /**
   * The share, performed — board ticket N29.
   *
   * Every step is a real press on a real control: the button, the Entire Screen
   * tab, the Screen 1 row, Share. Then Chrome is launched from the taskbar the
   * way a person would launch it, and maximised, because "full screen" is what
   * Nam asked for and a windowed browser inside a shared desktop is not it.
   *
   * Each step gives up quietly if what it needs is not there. The visitor may
   * have cancelled the picker mid-sequence, and the correct response to that is
   * to stop performing, not to start guessing.
   */
  const doShare = async (): Promise<void> => {
    if (q('.shot')) return;                      // already sharing
    if (!await pressSel('[data-ctl="present"]')) return;
    if (!await appears('.sp')) return;
    await pressSel('.sp-tab[data-kind="screen"]');
    await frame();
    await pressSel('.sp-row[data-src="desktop"]');
    await frame();
    await pressSel('.sp-share');
    if (!await appears('.dk-surface')) return;
    await wait(reduced ? 0 : 320);
    // Launch the browser from the taskbar. It opens on the CV, which is the
    // first tab in the strip — the same tab it would open on for anyone.
    if (!await pressSel('.dk-task[data-app="chrome"]')) return;
    if (!await appears('.shot .cb-page')) return;
    await wait(reduced ? 0 : 260);
    await doMaximise();
    /*
     * A beat of hesitation before the CV act starts talking. The browser is up,
     * the document is on screen, and there is a moment where the next thing has
     * not started yet — which is the third of Nam's three cases and the only one
     * the script has to place deliberately, since the other two follow presses.
     */
    if (Math.random() < 0.4) await hand.dither();
  };

  const doMaximise = async (): Promise<void> => {
    // The browser window, specifically — Explorer is behind it and has its own
    // maximise button, and pressing the wrong one is how a demo ends up
    // presenting a file listing.
    const win = document.querySelector<HTMLElement>('.shot .wx:has(.cb-page)')
      ?? document.querySelector<HTMLElement>('.shot .wx');
    const btn = win?.querySelector<HTMLElement>('.wx-max');
    if (!btn || win?.classList.contains('is-max')) return;
    await hand.at(btn, true);
    await wait(reduced ? 0 : 240);
    // The window just filled the screen and the hand is on its title bar. This
    // is the clearest case there is for getting out of the way.
    await hand.retreat(btn);
  };

  const doTab = async (id: string): Promise<void> => {
    const sel = `.shot .cb-tab[data-tab-id="${id}"]`;
    // A tab press opens a document the tour is about to talk about, and the hand
    // is sitting on the tab strip directly above it.
    if (await pressSel(sel, true)) { await wait(reduced ? 0 : 260); return; }
    /*
     * Not open. A person would type the address rather than give up, and the
     * omnibox is real — but the honest fallback here is the Explorer route,
     * which is what actually creates the tab. Neither is worth the complexity:
     * every id the script names is in the default strip, and a missing one is a
     * script bug that should be visible as silence.
     */
  };

  /**
   * The clips this visitor has not found — board ticket N41.
   *
   * Which ones they HAVE found is remembered across visits, so someone who has
   * hunted half the calendar is not shown their own discoveries back. If they
   * have found them all, this says so and moves on rather than replaying one.
   */
  /**
   * A row in one of Explorer's two panes, found by the name on it.
   *
   * By TEXT rather than by a data attribute, for the same reason headingTop()
   * matches headings by text: the file list is content, and adding ids to it so
   * the script can find them would be the script reaching into the content. A
   * renamed file makes the beat go silent, which is the same failure mode as a
   * missing selector and has the same correct answer.
   */
  const rowNamed = (pane: string, name: string): HTMLElement | null => {
    for (const r of document.querySelectorAll<HTMLElement>(`.shot ${pane} .wx-row`)) {
      if ((r.querySelector('.wx-name')?.textContent ?? '').trim() === name) return r;
    }
    return null;
  };

  /**
   * Roll a row into view before reaching for it.
   *
   * QA found this with seven clips in Hobby and a list that shows eight rows:
   * the last one sits below the fold. A fresh visitor never notices, because the
   * three unseen clips are the first three -- but somebody who has already found
   * a few gets an unseen list that starts further down, and hand.open() would
   * have travelled to a box clipped out of its own scroll container.
   *
   * Rolled rather than scrollIntoView'd, and the `rolling` flag goes up around
   * it for the same reason every other roll in this file does: a programmatic
   * scroll is byte-identical to a wheel, and without the flag the profile scores
   * the hand's own scrolling as the visitor skimming.
   */
  const revealRow = async (row: HTMLElement): Promise<void> => {
    const list = document.querySelector<HTMLElement>('.shot .wx-list');
    if (!list) return;
    const lb = list.getBoundingClientRect();
    const rb = row.getBoundingClientRect();
    if (rb.top >= lb.top && rb.bottom <= lb.bottom) return;
    const to = list.scrollTop + (rb.top - lb.top) - 8;
    rolling = true;
    try {
      await hand.roll({
        top: () => list.scrollTop,
        max: () => Math.max(0, list.scrollHeight - list.clientHeight),
        set: (y) => { list.scrollTop = y; },
        rect: () => list.getBoundingClientRect(),
      }, to, 600);
    } finally {
      window.setTimeout(() => { rolling = false; }, 120);
    }
  };

  /**
   * Raise Explorer and open the folder the clips are in.
   *
   * Its own step because two things want it at two different moments: the
   * segment's first line, so the visitor can see where this is going (N114), and
   * doEggs itself, for the case where nothing opened it first. Idempotent, so the
   * order does not matter -- raising a raised window is a press on a title bar,
   * and clicking Hobby when Hobby is open navigates to Hobby.
   *
   * Returns whether the file list is actually there, since every caller has to
   * decide what to do when it is not.
   */
  const openFiles = async (): Promise<boolean> => {
    if (!q('.shot .dk-surface')) return false;
    /*
     * The taskbar button is a toggle: with one window open it focuses an
     * unfocused app and MINIMISES a focused one, which is correct Windows and
     * would be a coin flip here. Pressing the title bar only ever raises.
     */
    if (document.querySelector('.shot .wx:has(.wx-list)')) {
      await pressSel('.shot .wx:has(.wx-list) .wx-bar');
    } else if (await pressSel('.dk-task[data-app="explorer"]', true)) {
      await appears('.shot .wx-list');
    }
    if (!q('.shot .wx-list')) return false;

    /* Into Hobby, where the clips are. One click in the tree navigates. */
    const hobby = rowNamed('.wx-tree', 'Hobby');
    if (hobby) {
      await hand.at(hobby, true);
      await wait(reduced ? 0 : 260);
    }
    return true;
  };

  /**
   * THE CLIPS, OPENED BY HAND — board ticket N56.
   *
   * Nam: "when you are showing the easter eggs, you just auto triggering the
   * videos - I dont like that. We should do that with the mouse interaction to
   * keep it consistent. The mouse will open the video, so its really like a real
   * human to the very end."
   *
   * This was the last thing in the script that cheated. Everything else is
   * performed through the product's own controls -- the share is four presses on
   * the real picker, a document arrives because a tab was clicked -- and the
   * clips simply appeared, because `playEgg` REBUILT THE WHOLE SHARE with one
   * booted into it. That is also why it could not just be swapped for a press:
   * rebuilding tears down the desktop the hand is standing on.
   *
   * So it goes through Explorer, which already lists every clip as a real file in
   * the Hobby folder and already routes a video to the player window. The
   * sequence is what a person would do: raise Explorer, go to Hobby, open the
   * file. The player is REUSED for each clip after the first, which is the
   * product's own behaviour rather than something arranged for this.
   *
   * Each step gives up quietly, the way doShare does. If the desktop is not being
   * shared there is nothing to press at all, and the old direct route runs
   * instead -- stated rather than papered over, because a visitor who reached
   * this segment without a share should still see the clips.
   */
  const doEggs = async (): Promise<void> => {
    const left = unseenEggs();
    if (!left.length) {
      await voice('…which you have already found. All of them. Respect.', 3200);
      return;
    }

    /* No desktop, nothing to press. Fall back to the direct route. */
    const performing_ = !!q('.shot .dk-surface');
    if (!performing_) {
      for (const egg of left.slice(0, EGGS_SHOWN)) {
        if (dead) return;
        podium.playEgg(egg.id);
        markEggSeen(egg.id);
        await voice(`${egg.title}. ${egg.blurb}`, 5200);
      }
      podium.quest('offclock');
      return;
    }

    // Normally already done by the segment's first line (N114); harmless twice.
    if (!await openFiles()) return;

    for (const egg of left.slice(0, EGGS_SHOWN)) {
      if (dead) return;
      const file = egg.clip.replace('media/', '');
      const row = rowNamed('.wx-list', file);
      if (row) await revealRow(row);
      // A clip whose row is not there is skipped rather than guessed at, and the
      // line still plays: the blurb is worth hearing even when the picture is not
      // there to go with it.
      if (row) {
        await hand.open(row);
        await appears('.shot .wx video', 2000);
      }
      markEggSeen(egg.id);
      /*
       * N116. 5200 to 7000. Nam: "at least give it 3 4 sec in each video so we
       * know what its about." The blurb took most of the old window, so the clip
       * itself got a second or two and the visitor was reading rather than
       * watching. The line is unchanged; what grew is the silence after it, which
       * is the part that is actually the video.
       */
      await voice(`${egg.title}. ${egg.blurb}`, 7000);
    }
    // And they are credited for it, which is the half the first version missed.
    podium.quest('offclock');
  };

  /**
   * SEND A HEART -- board ticket N79.
   *
   * Two presses, both on real controls: the reaction button opens the tray, and
   * the first swatch in it is the heart. It replaces a drag, which was the one
   * beat in the script that carried a measurement across a layout change and
   * therefore the one that could aim at where something used to be.
   *
   * It gives up quietly at each step like every other cue. And the visitor gets
   * the reaction quest out of it, which is the same generosity the rest of the
   * close already shows.
   */
  const sendHeart = async (): Promise<void> => {
    if (!await pressSel('[data-ctl="react"]')) return;
    if (!await appears('.tray-btn')) return;
    await wait(reduced ? 0 : 220);
    // The first swatch, which is the heart. Named by position because the tray
    // is authored as a list of emoji and none of them carries an id.
    await pressSel('.tray-btn', true);
  };

  /**
   * ZOOM THE MOCK BROWSER OUT, with the wheel.
   *
   * Nam: "the browser when showing the project spec I think we should zoom out a
   * little bit just so we can see everything. do the zoom with the mouse too,
   * kinda like you intentionally zoom out."
   *
   * So it is a real gesture, not a style change: the hand goes to the page and
   * ctrl-wheels, and the browser's own handler does the rest. Same principle as
   * the share (N29) and the drag (N64) -- every step is a step a person takes,
   * and nothing in the demo reaches past the interface to set a value.
   *
   * Two notches, which is Chrome's 90 then 80 per cent. Three would be 75 and
   * start to look like a problem with the page rather than a choice about it.
   */
  const doZoom = async (notches: number): Promise<void> => {
    const page = document.querySelector<HTMLElement>('.shot .cb-page');
    if (!page) return;
    const r = page.getBoundingClientRect();
    if (r.width === 0) return;
    await hand.to(r.left + r.width / 2, r.top + r.height / 3);
    for (let i = 0; i < notches; i += 1) {
      if (dead) return;
      page.dispatchEvent(new WheelEvent('wheel', {
        deltaY: 120, ctrlKey: true, bubbles: true, cancelable: true,
        clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 3),
      }));
      // A wheel notch at a time, at the speed a finger actually turns one.
      await wait(reduced ? 0 : 260);
    }
    await hand.retreat(page);
  };

  const runCue = async (cue: string): Promise<void> => {
    if (cue === 'share') return doShare();
    if (cue === 'heart') return sendHeart();
    if (cue.startsWith('zoom:')) return doZoom(Number(cue.slice(5)) || 1);
    if (cue === 'maximise') return doMaximise();
    if (cue === 'files') { await openFiles(); return; }
    if (cue === 'eggs') return doEggs();
    if (cue === 'park') { await hand.park(); return; }
    if (cue.startsWith('tab:')) return doTab(cue.slice(4));
  };

  const runBeats = async (bs: Beat[]): Promise<void> => {
    for (const b of bs) {
      if (dead) return;
      if (b.move) {
        const el = q(b.move);
        // A beat whose target is gone is skipped rather than guessed at.
        if (el) await hand.at(el, !!b.click);
      }
      if (b.roll) await roll(b.roll.of, b.roll.to, b.roll.ms);
      if (b.hold) await wait(b.hold);
      if (b.cue) await runCue(b.cue);
    }
  };

  /* ----------------------------------------------------------------- speaking */

  /**
   * A quip cuts in, then gives the floor straight back.
   *
   * `show` rather than `say`: a quip has no dwell contract and must not be
   * skippable-into-the-next-line, because there is no next line — it is a second
   * of borrowed floor on its own timer, and the line it interrupted goes back up
   * afterwards with the same call.
   */
  const sayQuip = async (id: string): Promise<void> => {
    const quip = quipById(id);
    tour = reduceTour(tour, { t: 'quipDone' });
    if (!quip) return;
    const held = floorLine;
    podium.show(quip.text);
    await wait(quip.ms);
    if (!dead && held && held !== quip.text) podium.show(held);
  };

  /** Anything waiting to interrupt, said now. */
  /**
   * TRUE WHILE HE IS DELIVERING THE SCRIPT — board ticket N108.
   *
   * Nam: "lets not react to any user behavior in script while we are doing our
   * script. If user does something, we dont acknowledge it at all. The
   * acknowledgement comes after we have finished our script and they are
   * exploring the call."
   *
   * Both reaction systems ask this, and both used to cut in over whatever was
   * being said: a quip interrupts a line to answer a click, and an
   * acknowledgement interrupts it to comment on how fast the visitor is moving.
   * Either one is two people talking, and only one of them is real.
   *
   * `finished` is the whole test. The personal segment and the after-credits are
   * both delivered from inside that mode and both handle their own interruption
   * rules, so the question is only ever "is the running order still running".
   */
  const delivering = (): boolean => tour.mode !== 'finished' && tour.mode !== 'handedOver';

  const drain = async (): Promise<void> => {
    // Nothing is drained while he is talking. The quip stays marked as found,
    // which is what N118 counts; it just never gets said.
    while (!dead && tour.interject) {
      // Found is found, whether or not it gets said (N118).
      markQuipFound(tour.interject);
      if (delivering()) { tour = reduceTour(tour, { t: 'quipDone' }); continue; }
      await sayQuip(tour.interject);
    }
  };

  /**
   * The bail watch — board ticket N35.
   *
   * Armed when a protected line starts, disarmed three seconds later. If the
   * visitor scrolls the document away inside that window, the gag fires: back to
   * the top, admit the joke, and return to EXACTLY where they had got to.
   */
  let bailArmed: { script: Bail; of: Surface } | null = null;

  /**
   * THE FAST-FORWARD — board ticket N46.
   *
   * Nam: "the same mouse event will trigger a fast forward of whatever the script
   * was and move on to the new segment that the mouse event just triggered."
   *
   * Set when the visitor clicks something that maps to a part. The line being
   * spoken finishes its beats and the segment then ENDS, rather than talking on
   * to the bottom of a section the visitor has visibly left. The director already
   * had the queue to put the clicked part next; what it did not have was any way
   * to stop the part in front of it.
   */
  let cut = false;

  const speak = async (lines: Line[], bs: Beat[] | undefined, protect?: Bail): Promise<void> => {
    cut = false;
    for (let i = 0; i < lines.length; i += 1) {
      if (dead) return;
      await drain();
      // Between sentences, never inside one: a hold taken mid-line would leave a
      // half-typed caption sitting there, which reads as the hang N98 just fixed.
      await heldOut();
      if (dead) return;
      const line = lines[i]!;
      if (protect && i === protect.at) {
        // Armed for exactly the window in which bolting means something. After
        // that they have read it, and leaving is just leaving.
        bailArmed = { script: protect, of: 'cv' };
        window.setTimeout(() => { bailArmed = null; }, BAIL_MS);
      }
      /*
       * A LINE WITH A BEAT IS A CUTSCENE — board ticket N55.
       *
       * Nam: "some lines have mouse interactions, we cannot skip the line past
       * getting these interactions, cause otherwise we lose the trigger and the
       * mouse is frozen forever. what we do when a line with mouse interaction is
       * skipped? We linger the bubble a bit more, speedup the mouse interaction
       * then once we finish the mouse interaction, we skip to the next. So mouse
       * interactions are kinda like cutscenes that you cant skip xD."
       *
       * That is the right model and it is a correctness fix, not a nicety. The
       * beats are what make the rest of the script possible: the share opens the
       * browser, a tab press puts the document on screen, and every later segment
       * declares `needs`. A skip that lands mid-performance leaves the hand
       * halfway through a sequence whose steps each give up quietly when what they
       * need is missing, and then nothing after it has anywhere to point.
       *
       * So the caption is LOCKED for the duration. A press still completes the
       * words -- refusing that would mean a visitor cannot read a sentence they
       * asked to see -- and it is remembered, so the line ends the instant the
       * performance does. What a press does NOT do is jump the beat.
       *
       * It does make the hand hurry, though. See onClick: a skip during a
       * cutscene is a fair request and the honest answer is to get it over with at
       * a third of the time rather than to ignore it.
       */
      const beats = (bs ?? []).filter((b) => b.at === i);
      /*
       * THE ORDER HERE IS LOAD-BEARING, and getting it wrong cost a QA round.
       *
       * `voice()` puts the line up synchronously before its first await, and
       * putting a line up CLEARS any lock -- deliberately, so a lock cannot leak
       * from one line to the next and hold a line open with nothing to unlock it.
       * Locking first therefore locked nothing: the say that followed threw it
       * away, the press went through to the app, and the share picker was
       * dismissed by the very press that was meant to hurry it along.
       */
      const said = voice(words(line), line.ms);
      if (beats.length) {
        performing = true;
        podium.lock();
      }
      /*
       * BEATS FIRST, THEN THE LOCK LIFTS, THEN THE LINE.
       *
       * Promise.all over both was a deadlock, and QA found it as a caption frozen
       * on "Let me get my screen up." after the share had visibly finished: the
       * line's promise cannot resolve until unlock(), and unlock() was waiting on
       * the line's promise. Awaiting the performance on its own breaks the cycle,
       * and the line that follows costs nothing when its dwell is already spent --
       * which after a skip it always is.
       */
      await runBeats(beats);
      if (beats.length) {
        performing = false;
        hand.hurry(false);
        podium.unlock();
      }
      await said;
      /*
       * The safe point. After the line and after its beat, so a Stop pressed
       * during the share still gets the share finished -- Nam: "if we are in the
       * middle of a mouse interaction, or a line that triggers mouse interaction,
       * finish it."
       */
      if (pauseWanted) { pauseWanted = false; await pauseHere(); }
      /*
       * Checked AFTER the line rather than before it, so a click always gets one
       * whole sentence finished before the subject changes. Cutting mid-sentence
       * is how a demo starts looking broken rather than responsive.
       */
      if (cut) { cut = false; return; }
    }
  };

  const runBail = async (): Promise<void> => {
    const armed = bailArmed;
    bailArmed = null;
    if (!armed || dead) return;
    const b = armed.script;
    const s = scroller(armed.of);
    const where = s?.top() ?? 0;
    await Promise.all([
      voice(b.lines[0]?.text ?? '', b.lines[0]?.ms ?? 3000),
      (async () => { if (b.rewind && s) await hand.roll(s, 0, 900); })(),
    ]);
    if (b.lines[1]) await voice(b.lines[1].text, b.lines[1].ms);
    if (b.lines[2]) {
      // Back to where THEY were, not where the script was. Remembering the
      // position is the whole trick; a gag that loses your place is a bug with
      // a punchline attached.
      await Promise.all([
        voice(b.lines[2].text, b.lines[2].ms),
        (async () => { if (b.rewind && s) await hand.roll(s, where, 800); })(),
      ]);
    }
  };

  /* ---------------------------------------------------------------- the pause -- */

  /**
   * Wait for the visitor to ask him back, which is turning the captions on.
   *
   * Polled rather than subscribed. The captions control is the call's, not the
   * conversation's, and it already reports its state through the podium; adding
   * an event for one listener would be a second way to know one thing.
   */
  const captionsBack = (): Promise<void> => new Promise((done) => {
    const tick = window.setInterval(() => {
      if (dead || podium.captionsOn()) { window.clearInterval(tick); done(); }
    }, 400);
  });

  /**
   * Go quiet, and come back when asked.
   *
   * The acknowledgement and the press OVERLAP on purpose. Nam: "try to time the
   * disabling of the caption right after or event at the same time as the
   * acknowledgement text finishes and is closed." So the hand sets off for the
   * captions control while the line is still being read, and arrives as it ends:
   * saying the line, then pausing, then reaching for a button is three beats
   * where the visitor is owed one.
   *
   * The Stop control goes with it. It offers to stop something that is no longer
   * happening, and it comes back with him.
   */
  const pauseHere = async (): Promise<void> => {
    paused = true;
    const since = performance.now();
    bar.classList.add('is-away');

    const ack = voice(asides.stopped.text, asides.stopped.ms);
    // Set off roughly a travel-and-press before the line is due to end. The
    // authored duration is scaled the same way voice() scales it, or the hand
    // would leave early for a patient visitor and late for a restless one.
    const dwell = Math.round(asides.stopped.ms * pace(visitor));
    await wait(Math.max(0, dwell - 900));
    const off = (async () => {
      if (podium.captionsOn()) await pressSel('[data-ctl="captions"]', true);
    })();
    await Promise.all([ack, off]);
    if (dead) return;
    podium.hush();
    await hand.park();

    await captionsBack();
    if (dead) return;
    pausedMs += performance.now() - since;
    paused = false;
    bar.classList.remove('is-away');

    /*
     * And he picks the thread up by name. "Where were we again?" answered by
     * silence would be a worse resumption than not asking.
     */
    await voice(asides.missed.text, asides.missed.ms);
    const here = parts.find((p) => p.id === tour.current);
    if (here && !dead) {
      const line = backTo(here.label);
      await voice(line.text, line.ms);
    }
  };

  /* --------------------------------------------------------------- the outro -- */

  /**
   * WHAT HE SAYS WHEN YOU DO NOT LEAVE — board ticket N49.
   *
   * Nam: "we should have some post end banter, like why are you still here? ...
   * There is nothing more to see here. I swear. some more stuff like this, spacing
   * out more and more, but no longer than 2min. If player sits through all of that,
   * they earn another achievement."
   *
   * Three things make it work, and all three are about restraint:
   *
   *   · IT IS NOT TIMED. The interview clock stopped at the goodbye. Timing the
   *     banter would mean the fastest completion was the one that left fastest,
   *     which is the opposite of what an outro is for.
   *
   *   · ANY INPUT ENDS IT, silently and with no penalty beyond not getting the
   *     achievement. The first line asks why they are still here; clicking
   *     something is a perfectly good answer and does not deserve a reaction.
   *
   *   · IT TURNS THE CAPTIONS OFF ON THE WAY OUT. Nam: "once its truly done, we
   *     say goodbye and thanks them for their time, then close the caption (with
   *     mouse movement) so they are free to do whatever they want in the call."
   *     The hand presses the same control it pressed to turn them on in the
   *     pre-roll, which is the only way to say "I have actually stopped now"
   *     without saying it a seventh time.
   */
  /**
   * "three easter eggs and five bugs", or "one bug", or nothing at all.
   *
   * Words rather than digits up to twelve, because this is a spoken line and
   * "There are still 3 easter eggs out there" reads as a status bar. Both halves
   * drop out when their count is zero, so a completionist who has every clip but
   * two bugs hears a sentence about bugs and no arithmetic about eggs.
   *
   * Returning the empty string is the signal to drop the line entirely. See the
   * note on `needs` in data/tour.ts.
   */
  const WORDS = [
    'no', 'one', 'two', 'three', 'four', 'five', 'six',
    'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  ];
  const some = (n: number, one: string, more: string): string =>
    `${WORDS[n] ?? n} ${n === 1 ? one : more}`;

  const leftToFind = (): string => {
    const eggs = unseenEggs().length;
    const bugs = podium.bugsLeft();
    const bits: string[] = [];
    if (eggs > 0) bits.push(some(eggs, 'easter egg', 'easter eggs'));
    if (bugs > 0) bits.push(some(bugs, 'bug', 'bugs'));
    return bits.join(' and ');
  };

  /**
   * THE POST-CREDITS, ASSEMBLED FOR THIS VISIT.
   *
   * Three fixed slots and four drawn ones. The opener and the goodbye never
   * change because they are the frame; the counting slot is the one that knows
   * about this visitor; everything else comes out of the pool and is remembered
   * so the next visit gets four different ones.
   *
   * Built at the moment it starts playing, not at mount, because what is left to
   * find can change during the call: catch a bug in the last minute and the
   * tease has to know.
   */
  const buildOutro = (): { line: Line; gap: number }[] => {
    const { picks, reset } = chooseBanter(banter, seenBanter(), BANTER_SLOTS, Math.random);
    if (reset) clearBanter();
    markBanterSeen(picks.map((b) => b.id));

    const left = leftToFind();
    const counted: Line = left
      ? { ...outroTease, text: outroTease.text.replace('{left}', left) }
      : outroAllFound;

    const out: { line: Line; gap: number }[] = [];
    let drawn = 0;
    for (let i = 0; i < OUTRO_GAPS.length; i += 1) {
      const gap = OUTRO_GAPS[i] ?? 0;
      if (i === 0) { out.push({ line: outroOpen, gap }); continue; }
      if (i === OUTRO_GAPS.length - 1) { out.push({ line: outroClose, gap }); continue; }
      if (i === OUTRO_COUNT_SLOT) { out.push({ line: counted, gap }); continue; }
      const pick = picks[drawn];
      drawn += 1;
      // A pool that could not fill a slot leaves it empty rather than repeating
      // itself into it. Cannot happen with the pool as it stands, and the day it
      // shrinks below four lines this fails quietly instead of stuttering.
      if (pick) out.push({ line: pick, gap });
    }
    return out;
  };

  let outroRan = false;

  const runOutro = async (): Promise<void> => {
    outroRan = true;
    const at = visitor.lastInput;
    /*
     * WALKING AWAY HAS TO TAKE THE CAPTION WITH IT -- board ticket N84.
     *
     * Any input abandons this segment, silently and with no penalty, and that
     * part was right. What was missing is that the ORDINARY ending was the only
     * path that ever took the strip down, so leaving early left whichever line
     * was up sitting on screen for ever. Nam: "somehow we are stuck in this
     * caption there are still ten bugs out there. Then nothing progresses
     * anymore."
     *
     * N67 did not cause it and did make it unmissable: the silences are 32 and
     * 41 seconds now, so most of the segment is time in which somebody can
     * reasonably wander off.
     */
    const abandon = (): void => {
      podium.hush();
      teardown();
    };

    for (const { line, gap } of buildOutro()) {
      if (dead || paused) return;
      // Abandoned by anything at all. Checked before the line rather than after,
      // so a visitor who clicks during a twenty-second gap is not talked at once
      // more before being let go.
      if (visitor.lastInput !== at) { abandon(); return; }
      await voice(line.text, line.ms);
      if (visitor.lastInput !== at) { abandon(); return; }
      /*
       * THE STRIP GOES AWAY, and then the silence. This is the whole fix for
       * N49's first version: a bubble left on screen with its ring filling for
       * twenty-six seconds announces that another line is coming, which spends
       * the surprise before the joke arrives.
       *
       * The silence is NOT scaled by pace(). The display above is, because that
       * is reading time and a patient visitor should get more of it; a comedic
       * beat is authored and a patient visitor stretching it to half again is how
       * the two-minute cap gets broken.
       */
      if (gap > 0) {
        podium.hush();
        await wait(gap);
      }
    }
    if (dead) return;
    podium.stayed();
    /*
     * And then the captions go off, by hand, from the control. Mirrors the
     * pre-roll exactly — which is deliberate: the visitor watched the hand press
     * this button to start the conversation, so watching it press the same button
     * is legible without a caption explaining it.
     */
    await wait(reduced ? 0 : 900);
    if (podium.captionsOn()) await pressSel('[data-ctl="captions"]', true);
    await hand.park();
    /*
     * AND THEN NOTHING IS LEFT, so nothing should be left on screen.
     *
     * Nam: "the stop talking button remains after everything finished and we click
     * the caption button?" It did. The control was kept deliberately after the
     * flow finished — the personal segment is uninterruptible except by Stop, so
     * removing it early would leave a ninety-second segment with no way out — but
     * that reasoning stops applying here. The outro is the last thing there is:
     * the story has run, the goodbye has been said, the captions have been turned
     * off. A Stop control at that point offers to stop something that is not
     * happening.
     */
    teardown();
  };

  /* ------------------------------------------------------------ the personal -- */

  /** Board ticket N38. Uninterruptible, except by Stop. */
  /**
   * THE QUESTIONS, ASKED OUT LOUD AND REMEMBERED — board ticket N110.
   *
   * Three things changed here and they are one idea: the segment behaves like an
   * interview rather than a monologue.
   *
   * IT ASKS BEFORE IT ANSWERS. Nam: "So user understands that this is not a
   * monologue and there are actually questions ... It gives better context to the
   * answer and provide breakpoints where they could may leave the conversation."
   * The numbering is doing real work: it tells the visitor there is a finite
   * list, which is what makes leaving in the middle feel like a choice rather
   * than an escape.
   *
   * IT OPENS WITH A GAP. "Still here?" alone, then the silence, then the framing
   * line. Running the two together is what spent the surprise.
   *
   * IT REMEMBERS. A chapter is written down after its last line, so coming back
   * resumes at the first unheard question BY NUMBER AND NAME. And somebody who
   * has heard all eight gets the openers anyway -- so they brace for another
   * ninety seconds -- and is then let off.
   */
  const tell = async (): Promise<void> => {
    const heard = new Set(heardAnswers());
    const left = story.filter((c) => !heard.has(c.id));

    await voice(words(opener.stillHere), opener.stillHere.ms);
    if (dead) return;

    if (!left.length) {
      // The tease: same shape, and then he lets them off.
      await voice(words(opener.again), opener.again.ms);
      for (const line of opener.allHeard) {
        if (dead) return;
        await voice(words(line), line.ms);
      }
      tour = reduceTour(tour, { t: 'toldDone' });
      dropBar();
      return;
    }

    await voice(words(opener.more), opener.more.ms);
    if (dead) return;

    /*
     * Only when they are actually coming back to something. On a first hearing
     * "where were we" is a question about a conversation that has not happened.
     */
    const first = story.indexOf(left[0]!);
    if (heard.size > 0) {
      const line = resumeAt(first + 1, left[0]!.q);
      await voice(words(line), line.ms);
      if (dead) return;
    }

    for (const chapter of left) {
      if (dead) return;
      const n = story.indexOf(chapter) + 1;
      const ask = askQuestion(n, chapter.q);
      await voice(words(ask), ask.ms);
      for (const line of chapter.lines) {
        if (dead) return;
        await voice(words(line), line.ms);
      }
      // After the LAST line, which is the only honest place to credit it.
      markAnswerHeard(chapter.id);
    }
    tour = reduceTour(tour, { t: 'toldDone' });
    // The answers are done, so the reason for keeping an exit is done with them.
    dropBar();
  };

  /* ------------------------------------------------------------------ the run */

  let announcedShorten = false;

  const run = async (): Promise<void> => {
    /*
     * THE PRE-ROLL — board ticket N29.
     *
     * The tour speaks through the captions, so a tour that started with them off
     * would be a silent film. Nam: "if CC was not on, then the mouse would move
     * to click on CC to enable it, then the script starts." So the hand does
     * that, first, before there is anything to read — which also happens to be
     * the clearest possible demonstration of what the hand is for.
     */
    hand.show();
    await wait(reduced ? 0 : 700);
    if (!podium.captionsOn()) {
      await pressSel('[data-ctl="captions"]');
      await wait(reduced ? 0 : 420);
    }

    tour = reduceTour(tour, { t: 'start' });
    // The clock starts on the first word, not on mount. See the note on
    // startedAt: the pre-roll is time spent watching, not time spent listening.
    startedAt = performance.now();

    while (!dead) {
      if (tour.mode === 'handedOver') { await voice(asides.handOver.text, asides.handOver.ms); break; }
      if (tour.mode === 'telling') { await tell(); continue; }
      if (tour.mode === 'finished') break;
      if (!tour.current) break;

      const part = parts.find((p) => p.id === tour.current);
      const lines = linesFor(tour);
      const bs = tour.register === 'lines' ? part?.beats : undefined;
      // Only the full register carries the gag: the brief version does not spend
      // long enough on the Wasabi years to have earned the complaint.
      const protect = tour.register === 'lines' ? part?.bail : undefined;

      // The register change is announced once, not every time it applies.
      if (tour.register === 'brief' && !announcedShorten) {
        announcedShorten = true;
        await voice(asides.shorten.text, asides.shorten.ms);
      }

      await speak(lines, bs, protect);
      if (dead) return;
      tour = reduceTour(tour, { t: 'partDone' });
    }

    if (dead) return;
    /*
     * AND THE GOODBYE CLOSES — board ticket N110.
     *
     * "Thank you for your time. Genuinely." used to sit on screen for however
     * long it took the visitor to go quiet, which on the way into the personal
     * segment is a minute or more. Nam: "this line lingers all the way after it
     * finishes until the next line. That ruins the surprise!"
     *
     * It does, and in the most direct way: a caption on screen is the app saying
     * it is still talking, so the silence that is meant to feel like the end
     * reads as a pause, and the segment that follows reads as the rest of a
     * sentence rather than as him starting again.
     */
    podium.hush();
    /*
     * A completed hearing, and the only kind that gets timed. `handedOver` broke
     * out of the loop above without reaching here, and Stop tears the whole thing
     * down — so neither can record a time, which is what stops the fastest
     * possible "run" being a press on Stop.
     */
    heardOut = true;
    /*
     * Minus the pauses. A visitor who pressed Stop, went to lunch and came back
     * did not spend an hour in the interview, and a timer that says they did is
     * measuring the wrong thing -- the same reason the outro is excluded.
     */
    podium.finished(performance.now() - startedAt - pausedMs);
    // The clock the story waits on starts HERE, not at the visitor's last input.
    // See the note on flowEndedAt.
    flowEndedAt = performance.now();
    /*
     * The flow is over, and the tour is not.
     *
     * The hand parks and the running order is spent, but the commentary is still
     * live — a quip fired now still plays — and the personal segment is still
     * waiting for enough silence to be worth starting. So the Stop control
     * STAYS. It was tempting to clear it once the script ran out, and that would
     * have been wrong in the one case that matters: the story is uninterruptible
     * except by Stop, and removing Stop before the story starts would leave a
     * ninety-second segment with no way out of it at all.
     */
    await hand.park();
  };

  /* ------------------------------------------------------ watching the visitor */

  /**
   * Feed one signal to the profile, and react to what it does to the score.
   *
   * The comparison is on the RETURNED state rather than on a mutation, which is
   * why profile.observe always returns a new object: "did that make them more
   * restless" is not a question you can ask an object that changed underneath
   * you.
   */
  const note = (sig: Parameters<typeof observe>[1]): void => {
    const before = visitor.restless;
    visitor = observe(visitor, sig);
    if (visitor.restless > before + 0.001) {
      flashMeter();
      maybeAck(visitor.restless - before);
    }
  };

  let lastAck = 0;
  const maybeAck = (jump: number): void => {
    // N108. Not while he is talking. See delivering().
    if (delivering()) return;
    // A small drift does not deserve a line. A bail or a burst does.
    if (jump < 0.1) return;
    /*
     * And a jump that lands INSIDE the calm band does not deserve one either.
     * QA: four fast clicks scored 0.14, which is still 'settled', and the tour
     * answered "Take your time. It's all there." — which is what you say to
     * somebody who is reading, not to somebody who has just clicked four times
     * in half a second. The escalation exists for visitors who are not settled;
     * a settled one is doing fine and does not need to be told so.
     */
    if (tier(visitor) === 'settled') return;
    const now = performance.now();
    if (now - lastAck < ACK_GAP_MS) return;
    if (tour.mode === 'telling' || tour.mode === 'handedOver') return;
    const got = acknowledge(visitor, acks);
    if (!got) return;
    visitor = got.next;
    lastAck = now;
    // Spoken like a quip: over the top of whatever is happening, then the floor
    // goes back. It is a reaction, not a section.
    const held = floorLine;
    podium.show(got.line.text);
    window.setTimeout(() => {
      // Only if the flow has not moved on underneath it. Restoring a line the
      // script has already left behind would put a stale caption on screen,
      // which is worse than the reaction having no ending at all.
      if (!dead && held && floorLine === held) podium.show(held);
    }, got.line.ms);
  };

  function onClick(e: Event): void {
    if (dead) return;
    // The hand's own presses are not trusted, which is exactly how they are told
    // apart from the visitor's.
    if (!e.isTrusted) return;
    const el = e.target as Element | null;
    if (!el || stopBtn.contains(el)) return;

    /*
     * A press the caption spent on itself is not restlessness — see the note on
     * Podium.absorbed. It is also not a part trigger or a quip, because it landed
     * on the caption or on empty space, so there is nothing else to do with it.
     */
    if (podium.absorbed(performance.now())) {
      /*
       * The press was spent on the caption. If the hand is mid-performance it
       * cannot be skipped (see speak()), so the answer to "I want to move on" is
       * to move faster rather than to do nothing. Cleared when the beat finishes.
       */
      if (performing) hand.hurry(true);
      return;
    }

    note({ t: 'click', at: performance.now() });
    hand.yield(true);
    window.setTimeout(() => hand.yield(false), 2200);

    const part = partForElement(el);
    if (part) {
      note({ t: 'enter', at: performance.now(), id: part.id });
      note({ t: 'takeover', at: performance.now() });
      /*
       * The hand acknowledges immediately even though the narration queues. A
       * click that produces no visible response for four seconds reads as a
       * click that did nothing.
       */
      const first = part.triggers?.[0];
      const target = first ? q(first) : null;
      if (target) void hand.at(target);
      const before = tour;
      tour = reduceTour(tour, { t: 'visit', id: part.id });
      /*
       * N46, the arrow running the other way. If that visit actually queued
       * something new, cut the segment being spoken rather than letting it talk
       * on to the end of a section the visitor has left. `skip` ends the line's
       * dwell now; `cut` stops the loop after it.
       *
       * Guarded on the queue having grown, so clicking around inside a part that
       * is already playing or already covered does not chop the narration for a
       * visit the director correctly ignored.
       */
      if (tour.queue.length > before.queue.length && tour.mode === 'playing') {
        cut = true;
        podium.skip();
      }
      return;
    }

    const quip = quipForElement(el);
    if (quip) {
      tour = reduceTour(tour, { t: 'quip', id: quip.id });
      if (tour.interject) void drain();
    }
  }

  /**
   * Something the app announced about itself.
   *
   * The desktop dispatches `desk:drag`, `desk:snap` and the rest; the call
   * dispatches `panel:people` and friends. Neither is a click on anything — a
   * drag is a gesture and a panel can be opened from the keyboard — so they
   * arrive as announcements rather than as elements. See src/ui/signal.ts.
   */
  /**
   * SOMETHING ELSE WANTS THE FLOOR FOR A MOMENT.
   *
   * Board ticket N100. Nam, on catching a bug: "if the script is running, then we
   * should pause just a little bit for the bug to land then we continue." A
   * beetle blooming in the middle of the screen while he carries on describing
   * the CV is two things asking for the same attention, and the bug loses.
   *
   * A timestamp rather than a lock, because the holder is not on this clock and
   * must not be able to wedge the script by forgetting to release it. The worst a
   * bad `ms` can do is delay one line.
   */
  let holdUntil = 0;

  const heldOut = async (): Promise<void> => {
    while (!dead && performance.now() < holdUntil) {
      await wait(Math.min(240, holdUntil - performance.now()));
    }
  };

  function onHold(e: Event): void {
    if (dead) return;
    const ms = (e as CustomEvent<{ ms?: number }>).detail?.ms ?? 0;
    // Capped, so a stray dispatch cannot silence him for a minute.
    holdUntil = Math.max(holdUntil, performance.now() + Math.min(4000, Math.max(0, ms)));
  }

  function onSignal(e: Event): void {
    if (dead) return;
    const key = (e as CustomEvent<{ key?: string }>).detail?.key;
    if (!key) return;
    const quip = quipForEvent(key);
    if (!quip) return;
    tour = reduceTour(tour, { t: 'quip', id: quip.id });
    if (tour.interject) void drain();
  }

  /**
   * Scroll, from the visitor's own hand.
   *
   * Sampled rather than counted: one listener firing sixty times a second would
   * make every scroll look like a skim. Each sample carries how far and how
   * long, which is what turns a distance into a speed and a speed into a verdict.
   */
  let scrollFrom: number | null = null;
  let scrollAt = 0;
  let scrollTimer = 0;

  function onScroll(e: Event): void {
    if (dead || rolling) return;
    const el = e.target as HTMLElement | Document | null;
    const top = el instanceof HTMLElement ? el.scrollTop
      : (el as Document)?.scrollingElement?.scrollTop ?? 0;
    const now = performance.now();
    if (scrollFrom === null) { scrollFrom = top; scrollAt = now; }
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      if (dead || scrollFrom === null) return;
      const px = Math.abs(top - scrollFrom);
      const ms = Math.max(1, now - scrollAt);
      scrollFrom = null;
      if (px < 8) return;
      note({ t: 'scroll', at: now, px, ms });
      // The Wasabi gag: they scrolled away from seven years of work while the
      // tour was still talking about it.
      if (bailArmed && px > 120) void runBail();
    }, 140);
  }

  /**
   * THE CV IS IN AN IFRAME, AND ITS SCROLL EVENTS DO NOT COME OUT.
   *
   * A scroll inside a frame is dispatched in that frame's document and stops
   * there — it does not bubble into the parent, capture phase or not. So the
   * document-level listener above sees every scroll on this page and none of
   * the ones that matter most: the CV is the part the visitor actually reads,
   * and reading speed is the single strongest signal the profile has.
   *
   * Without this the bail gag (N35) could not fire at all, because the only way
   * to bolt out of the Wasabi years is to scroll a document we were not
   * listening to.
   *
   * Attached lazily and re-attached on demand: the frame does not exist until
   * the share has been performed, and it is REPLACED whenever the tab is
   * repainted, so a one-shot attach at start-up would bind to a document that
   * gets thrown away. The marker property is on the document rather than in a
   * set, so a discarded document takes its own bookkeeping with it.
   */
  const watchFrame = (): void => {
    const f = document.querySelector<HTMLIFrameElement>('.shot .pg-frame');
    const doc = f?.contentDocument as (Document & { tourWatched?: boolean }) | undefined;
    if (!doc || doc.tourWatched) return;
    doc.tourWatched = true;
    doc.addEventListener('scroll', onScroll, true);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('keydown', onKey, true);
  };

  function onMove(): void { if (!dead) note({ t: 'move', at: performance.now() }); }
  function onKey(): void { if (!dead) note({ t: 'key', at: performance.now() }); }

  document.addEventListener('click', onClick, true);
  document.addEventListener('tour:signal', onSignal);
  document.addEventListener('tour:hold', onHold);
  document.addEventListener('scroll', onScroll, true);
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('keydown', onKey, true);

  /**
   * The idle watch.
   *
   * Two thresholds, and they mean different things. At three seconds the visitor
   * has stopped driving, so a backlog collected while they were exploring is
   * dropped — narrating it now would be answering a question nobody remembers
   * asking. At nine seconds, with the flow already finished, there is enough
   * silence to be worth the personal segment.
   */
  let settled = false;
  /**
   * When the flow said its last word.
   *
   * The story waits for silence, and silence is measured from the last thing
   * that happened — which is the later of the visitor's last input and this.
   * Measuring it from input alone made the requirement vacuous for the visitor
   * it matters most for: someone who has touched nothing has been silent all
   * along, so the story began four seconds after the tour said goodbye.
   */
  let flowEndedAt = 0;

  const idleTimer = window.setInterval(() => {
    if (dead) return;
    // Cheap, and the only reliable moment to catch a frame that has just been
    // repainted. querySelector on a miss is a few microseconds once a second.
    watchFrame();
    const now = performance.now();
    note({ t: 'idle', at: now });
    const quiet = now - visitor.lastInput;
    if (quiet >= SETTLE_MS && !settled) {
      settled = true;
      tour = reduceTour(tour, { t: 'settle' });
      hand.yield(false);
    }
    if (quiet < SETTLE_MS) settled = false;
    const still = now - Math.max(visitor.lastInput, flowEndedAt);
    if (!paused && still >= STORY_MS && tour.mode === 'finished' && !tour.told && passive(visitor, now)) {
      tour = reduceTour(tour, { t: 'tell' });
      if (tour.mode === 'telling') void tell();
    }
    /*
     * The outro, last of all — after the goodbye AND after the personal segment,
     * because that segment is content and this is banter, and banter does not go
     * in front of content.
     *
     * `heardOut` rather than `mode === 'finished'`: a run that handed over never
     * said goodbye, so there is nothing for an outro to come after. `!paused`
     * because somebody who asked for silence has asked for silence.
     */
    /*
     * N109. Measured from the last CAPTION rather than from the end of the flow,
     * and two minutes rather than fourteen seconds.
     *
     * Who it is for decides how long it waits. Nam: "This extra interaction is
     * aimed at the dedicated users who stays here long after its done. We dont
     * want everyone to see this, only the hardcore ones, cause those are the ones
     * who would appreciate it." Two minutes with nothing said is only reachable by
     * somebody who has run out of things to find and stayed anyway, which is
     * exactly the person it is written for.
     *
     * Visitor input is deliberately NOT part of this. They can keep clicking; if
     * nothing they click has anything left to say, the room is still silent.
     */
    const silence = now - Math.max(spokeAt, flowEndedAt);
    if (heardOut && !paused && !outroRan && tour.told && tour.mode === 'finished'
        && silence >= OUTRO_WAIT_MS && !performing) {
      void runOutro();
    }
  }, 1000);

  /* ---------------------------------------------------------------- teardown -- */

  const teardown = (): void => {
    if (dead) return;
    dead = true;
    window.clearTimeout(timer);
    window.clearTimeout(meterTimer);
    window.clearTimeout(scrollTimer);
    window.clearInterval(idleTimer);
    hand.destroy();
    meter.remove();
    bar.remove();
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('tour:signal', onSignal);
    document.removeEventListener('tour:hold', onHold);
    document.removeEventListener('scroll', onScroll, true);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('keydown', onKey, true);
    /*
     * Nothing to hand the caption strip back TO any more.
     *
     * There used to be a second script — the call's own eleven-line loop — and
     * teardown restored it, which is how a visitor who had heard the goodbye
     * ended up being talked at again from the top. N45 folded that loop into this
     * script, so when this stops, the talking stops.
     */
  };

  stopBtn.addEventListener('click', () => {
    if (paused || pauseWanted) return;
    pauseWanted = true;
    /*
     * End the line being read, but not the beat under it. skip() is refused
     * while a cutscene is locked and applied the moment it unlocks (N55), which
     * is exactly the behaviour wanted here: the visitor stops waiting for the
     * sentence, and the hand still finishes what it started.
     */
    podium.skip();
  });

  void run();

  return {
    stop: teardown,
    peek: () => ({ tour, visitor }),
  };
}
