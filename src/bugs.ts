// Catching the bugs. Board ticket N59.
//
// The side quests reward breadth and this rewards persistence, which is why it
// is a second class rather than eleven more entries in quests.ts. Nam's framing:
// "reward a different kind of exploration: the developer's dedication ... This
// means repeating the same thing a certain amount of times within a certain
// period in order to find the bug."
//
// WHERE THE TRIGGERS LIVE, AND WHY THEY ARE HERE. Almost all of them are a
// selector plus a count, so they are a table in this file rather than a call
// site scattered across share.ts and call.ts. One delegated listener on the
// document sees every press on the shared desktop, the browser and the control
// bar, and the four gestures that are not presses on anything arrive on the
// signal channel the guided conversation already uses (src/ui/signal.ts).
//
// Two consequences worth stating, because both are deliberate:
//
//   · THE SCRIPT CANNOT CATCH A BUG FOR YOU. Every trigger is gated on
//     `isTrusted`, so the hand pressing Raise hand during the close performs the
//     gag and awards nothing. That is the whole difference between this and the
//     easter eggs, which the conversation hands over in full (N63).
//
//   · PROGRESS IS NOT REMEMBERED ACROSS A VISIT. Which bugs you HAVE is; being
//     two thirds of the way to one is not. Three presses is a cheap thing to
//     ask again and a confusing thing to inherit, since nothing on screen says
//     you were part way.

import { h } from './dom.js';
import { prefersReducedMotion } from './a11y.js';
import { sym } from './ui/icons.js';
import { bugs, bugById, type Bug } from './data/bugs.js';
import { bugArt } from './ui/bugart.js';

export { bugs, bugById, BUG_COUNT, RARITY_LABEL, type Bug, type Rarity } from './data/bugs.js';

/**
 * What catching one looks like.
 *
 * Nam, on the first version: "The bug appearing: barely visible at all, it
 * should be animated from where the place we should have clicked ... an
 * animation of the bug coming to the middle of the screen, a bit of shaking
 * animation and a bit of glow, then it quickly moves into the toast that
 * appears. Timing here is important for this to feel polished."
 *
 * So there are three movements, and they are the reason this is not simply a
 * toast with a picture in it:
 *
 *   FLIGHT, from the control that was pressed to the middle of the screen. The
 *   origin is the point of the whole thing: it answers "where did that come
 *   from" without a caption, and it is why `from` is threaded all the way down
 *   from the click listener rather than being guessed at here.
 *
 *   THE BEAT, in the middle, big, glowing and shaking. This is the reward, and
 *   the only moment the drawing is large enough to actually look at.
 *
 *   DELIVERY, into the notice, which appears the instant the bug lands in it.
 *   The toast is built and measured BEFORE the flight starts, so the last leg
 *   flies to a real position rather than to an estimate of one.
 */
const FLY_MS = 620;
/**
 * How long the bug holds the middle of the screen.
 *
 * 900 to 1500 on Nam's note: "it should linger a bit more, a bit more exciting."
 * The wiggle finished in 900 and the drawing left immediately after it, so the
 * one moment the animal is big enough to actually look at was over before you
 * had looked at it. The extra 600 is stillness at full size rather than more
 * animation, which is the difference between a reward and a fidget.
 */
const BEAT_MS = 1500;
const DELIVER_MS = 460;
/** The hand's own impact, read off slap-rush in styles.css: 46% of 1.25s. */
const SMASH_MS = 575;
/** The room's knock. Short: a long camera shake is nausea, not celebration. */
const SHAKE_MS = 520;

const KEY = 'callback.bugs';

/**
 * A press that catches a bug, as a selector.
 *
 * Read as: a trusted click anywhere inside something matching this counts once
 * towards that bug. `closest` rather than a direct match, because every one of
 * these is a button with a glyph inside it.
 */
const BY_CLICK: { sel: string; id: string }[] = [
  { sel: '.dk-tray-btn:not(.dk-clock)', id: 'jewel' },
  { sel: '.dk-clock', id: 'chafer' },
  { sel: '.dk-pwr-item', id: 'hercules' },
  { sel: '.cb-new', id: 'longhorn' },
  { sel: '.tray-btn', id: 'birdwing' },
  { sel: '[data-ctl="captions"]', id: 'cicada' },
  { sel: '[data-ctl="camera"]', id: 'ulysses' },
];

/** The gestures that are not a press on anything. See ui/signal.ts. */
export interface CatchOpts {
  /** The control that was pressed. The bug flies out of it. */
  from?: HTMLElement | null;
  /** The hand comes down on this one instead of it shaking in the middle. */
  smash?: boolean;
  /** Fired the moment the bug reaches the middle of the screen. */
  onArrive?: () => void;
}

const BY_SIGNAL: Record<string, string> = {
  'desk:min': 'mantis',
  'desk:resize': 'leaf',
  'desk:close': 'weevil',
  'desk:drag': 'stag',
};

export class Bugs {
  private got = new Set<string>();
  /** Session only, on purpose. See the header note. */
  private hits = new Map<string, number>();
  private tray: HTMLElement | null = null;
  private live: HTMLElement | null = null;
  private onChange: (() => void)[] = [];

  constructor() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) for (const id of JSON.parse(saved) as string[]) this.got.add(id);
    } catch {
      /* private browsing, or storage disabled. Not worth a fuss. */
    }
  }

  mount(root: HTMLElement): void {
    this.live = h('div', { class: 'sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
    this.tray = h('div', { class: 'quest-tray bug-tray' });
    root.append(this.live, this.tray);
  }

  has(id: string): boolean {
    return this.got.has(id);
  }

  count(): { got: number; total: number } {
    return { got: this.got.size, total: bugs.length };
  }

  /** Everything, found or not. The frame draws all of it. */
  all(): { bug: Bug; got: boolean }[] {
    return bugs.map((bug) => ({ bug, got: this.got.has(bug.id) }));
  }

  subscribe(fn: () => void): void {
    this.onChange.push(fn);
  }

  /**
   * One occurrence of a bug's trigger.
   *
   * Returns true only on the press that completes it, so a caller with its own
   * flourish to run knows which press to run it on. `after` delays the toast for
   * exactly that case: the gilded scarab is smashed by the raised hand before it
   * is announced, and a notice arriving mid-smash steps on the joke.
   */
  hit(id: string, opts: CatchOpts = {}): boolean {
    if (this.got.has(id)) return false;
    const bug = bugById(id);
    if (!bug) return false;
    const n = (this.hits.get(id) ?? 0) + 1;
    this.hits.set(id, n);
    if (n < bug.repeat) return false;
    this.got.add(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.got]));
    } catch {
      /* ignore */
    }
    if (this.live) this.live.textContent = `New bug caught: ${bug.name}, ${bug.species}.`;
    for (const fn of this.onChange) fn();
    this.announce(bug, opts);
    return true;
  }

  /**
   * The flight, and then the notice.
   *
   * Reduced motion gets the notice and nothing else. There is no toned-down
   * version of "it flew across your screen" worth shipping: the movement IS the
   * feature, so the honest accommodation is to skip it rather than slow it.
   */
  private announce(bug: Bug, opts: CatchOpts): void {
    const card = this.toast(bug);
    if (!card) return;
    const land = (): void => { card.classList.remove('is-arriving'); };
    if (prefersReducedMotion()) { land(); opts.onArrive?.(); return; }

    const slot = card.querySelector<HTMLElement>('.qt-bug');
    const dest = slot?.getBoundingClientRect();
    if (!dest || dest.width === 0) { land(); opts.onArrive?.(); return; }

    const start = opts.from?.getBoundingClientRect();
    const mid = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const from = start && start.width > 0
      ? { x: start.left + start.width / 2, y: start.top + start.height / 2 }
      : { x: mid.x, y: window.innerHeight - 140 };

    const fly = h('div', { class: 'bug-fly', 'aria-hidden': 'true' }, bugArt(bug, { size: 176 })) as HTMLElement;
    const put = (x: number, y: number, scale: number): void => {
      fly.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
    };
    // It starts small, at the control: a full-size beetle appearing on a 48px
    // button reads as a glitch rather than as something coming out of it.
    put(from.x, from.y, 0.22);
    document.body.appendChild(fly);

    const hold = (ms: number): Promise<void> => new Promise((ok) => { window.setTimeout(ok, ms); });
    const step = (ms: number, ease: string, run: () => void): Promise<void> => new Promise((ok) => {
      // A frame between the start position and the end one, or the browser
      // coalesces both writes and there is no transition left to watch.
      requestAnimationFrame(() => {
        fly.style.transition = `transform ${ms}ms ${ease}, opacity ${ms}ms linear`;
        run();
        window.setTimeout(ok, ms);
      });
    });

    void (async () => {
      await step(FLY_MS, 'cubic-bezier(0.2, 0.8, 0.2, 1)', () => {
        fly.classList.add('is-mid');
        put(mid.x, mid.y, 1);
      });

      if (opts.smash) {
        /*
         * The hand, and then the flattening. Nam's own gag: "on the third time
         * you get a bug, then the hand smashes it LOL." The strike is fired from
         * here rather than on the caller's own clock, so the hand starts moving
         * the instant the bug has landed and arrives on top of it 575ms later,
         * which is where slap-rush peaks.
         */
        opts.onArrive?.();
        await hold(SMASH_MS);
        fly.classList.remove('is-mid');
        fly.classList.add('is-flat');
        await hold(420);
      } else {
        opts.onArrive?.();
        /*
         * THE HALLELUJAH. Nam: "maybe some light glow and a light camera shake,
         * kinda like hallelujah."
         *
         * Three things at once, on three different elements, because they are
         * three different scales of the same moment: the bug wiggles, a halo
         * blooms behind it, and the room itself takes a knock. The shake is on
         * the page rather than on the bug -- a bug that shakes is a bug that is
         * moving, and a ROOM that shakes is something having landed in it.
         *
         * The shake and the glow are one animation each on a class, so the
         * transform set above has to be left alone while they run.
         */
        fly.classList.add('is-beat');
        document.body.classList.add('bug-struck');
        window.setTimeout(() => document.body.classList.remove('bug-struck'), SHAKE_MS);
        /*
         * And the conversation waits. Nam: "if the script is running, then we
         * should pause just a little bit for the bug to land then we continue."
         * Announced rather than called: bugs.ts knows nothing about the script
         * and must keep working when it is not running at all, which is the same
         * reasoning as ui/signal.ts. A hold nobody is listening for costs one
         * dispatch.
         */
        document.dispatchEvent(new CustomEvent('tour:hold', { detail: { ms: BEAT_MS } }));
        await hold(BEAT_MS);
        fly.classList.remove('is-beat');
      }

      fly.classList.remove('is-mid');
      await step(DELIVER_MS, 'cubic-bezier(0.4, 0, 0.9, 0.6)', () => {
        fly.style.opacity = '0.15';
        put(dest.left + dest.width / 2, dest.top + dest.height / 2, 0.28);
      });
      fly.remove();
      // The notice arrives WITH the bug. Showing it up front would hand over the
      // answer while the animation is still pretending to deliver it.
      land();
    })();
  }

  /**
   * The achievement toast, with the animal in it.
   *
   * Nam: "Collecting a bug gets a similar toast like the achievement, but now
   * with the image of the bug, plus the text says bug number, say New bug: bug
   * name." Deliberately the same card, the same surface, the same dwell and the
   * same dismiss: two notification designs in one product is one too many, and
   * the drawing is already enough to tell them apart at a glance.
   *
   * No accumulating strip, unlike the quests. Two quests can land on one press,
   * which is what forced that design; two bugs cannot, because each one needs
   * its own three presses on its own control.
   */
  private toast(bug: Bug): HTMLElement | null {
    if (!this.tray) return null;
    const { got, total } = this.count();

    const fill = h('i', { class: 'qt-fill' }) as HTMLElement;
    fill.style.width = `${Math.round((got / total) * 100)}%`;

    const close = h(
      'button',
      { class: 'qt-x', type: 'button', 'aria-label': 'Dismiss', title: 'Dismiss' },
      sym('close', 18),
    ) as HTMLButtonElement;

    const card = h(
      'div',
      // `is-arriving` holds it invisible until the bug lands in it. It is built
      // now rather than later because the flight needs somewhere to go.
      { class: 'quest-toast is-bug is-arriving', role: 'status', 'aria-live': 'polite' },
      h('span', { class: 'qt-bug' }, bugArt(bug, { size: 40 })),
      h('span', { class: 'qt-label' }, `New bug: ${bug.name}`),
      h('span', { class: 'qt-count' }, `${got}/${total}`),
      close,
      h('div', { class: 'qt-bar', 'aria-hidden': 'true' }, fill),
    ) as HTMLElement;

    this.tray.appendChild(card);
    let timer = 0;
    const leave = (): void => {
      card.classList.add('out');
      window.setTimeout(() => card.remove(), 320);
    };
    const hold = (): void => window.clearTimeout(timer);
    const arm = (): void => { timer = window.setTimeout(leave, 5200); };
    card.addEventListener('pointerenter', hold);
    card.addEventListener('pointerleave', arm);
    card.addEventListener('focusin', hold);
    card.addEventListener('focusout', arm);
    close.addEventListener('click', () => { hold(); leave(); });
    arm();
    return card;
  }
}

/**
 * One listener for the presses, one for the gestures.
 *
 * Capture phase, because several of these controls stop propagation on their own
 * events -- the Start menu's power button does, so a bubbling listener would
 * never see it. Capturing also means a bug is counted for a press that opens a
 * menu the press then closes, which is the behaviour anyone repeating a click
 * expects.
 */
export function wireBugs(catcher: Bugs): void {
  document.addEventListener('click', (e) => {
    // The conversation's own hand is not a visitor. This is the line that makes
    // the collection something you find rather than something you are given.
    if (!e.isTrusted) return;
    const el = e.target as Element | null;
    if (!el || typeof el.closest !== 'function') return;
    for (const { sel, id } of BY_CLICK) {
      const on = el.closest<HTMLElement>(sel);
      // The element pressed, not the pointer that pressed it: a bug leaving the
      // BUTTON is legible at any size, and one leaving the exact pixel somebody
      // happened to hit looks like a coincidence.
      if (on) { catcher.hit(id, { from: on }); return; }
    }
  }, true);

  document.addEventListener('tour:signal', (e) => {
    const key = (e as CustomEvent<{ key: string }>).detail?.key;
    const id = key ? BY_SIGNAL[key] : undefined;
    // A gesture is not a press on anything, so there is no control to fly out
    // of. It leaves from the middle of the desktop, which is where the window
    // being dragged, resized, minimised or closed actually is.
    if (id) catcher.hit(id, { from: document.querySelector<HTMLElement>('.dk-surface') });
  });
}
