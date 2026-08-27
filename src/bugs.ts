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
import { sym } from './ui/icons.js';
import { bugs, bugById, type Bug } from './data/bugs.js';
import { bugArt } from './ui/bugart.js';

export { bugs, bugById, BUG_COUNT, type Bug } from './data/bugs.js';

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
  hit(id: string, after = 0): boolean {
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
    if (after > 0) window.setTimeout(() => this.toast(bug), after);
    else this.toast(bug);
    return true;
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
  private toast(bug: Bug): void {
    if (!this.tray) return;
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
      { class: 'quest-toast is-bug', role: 'status', 'aria-live': 'polite' },
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
      if (el.closest(sel)) { catcher.hit(id); return; }
    }
  }, true);

  document.addEventListener('tour:signal', (e) => {
    const key = (e as CustomEvent<{ key: string }>).detail?.key;
    const id = key ? BY_SIGNAL[key] : undefined;
    if (id) catcher.hit(id);
  });
}
