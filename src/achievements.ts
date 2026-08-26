// Side quests.
//
// Nam is a game developer, so the artifact behaves like one. This is the layer
// that makes his narrative literal: the visitor is not told he thinks in
// quests, they are handed one.
//
// Constraints, from the reviews: the toast is polite and debounced rather than
// assertive (A1), it never moves under reduced-motion (U4), it never covers a
// control, it is dismissible, and none of it gates content (U1) — the CV is
// complete for someone who unlocks nothing.

import { h } from './dom.js';
import { sym } from './ui/icons.js';

export interface Quest {
  id: string;
  name: string;
  hint: string;
  /** Secret quests are hidden until found. */
  secret?: boolean;
}

export const quests: Quest[] = [
  { id: 'join', name: 'Join the call', hint: 'Press Join.' },
  { id: 'chat', name: 'Read the messages', hint: 'Open in-call messages.' },
  { id: 'people', name: 'See who is here', hint: 'Open People.' },
  { id: 'present', name: 'Watch the screen share', hint: 'Open Presenting.' },
  { id: 'offclock', name: 'Off the clock', hint: 'Find out what he does when nobody is paying him.' },
  { id: 'tools', name: 'Open the toolbox', hint: 'Find Meeting tools.' },
  { id: 'spec', name: 'Read the spec', hint: 'See what this interface was measured from.' },
  { id: 'tests', name: 'Trust but verify', hint: 'Run the test suite.' },
  { id: 'chaos', name: 'Break it on purpose', hint: 'Make the tests fail.' },
  { id: 'collapse', name: 'Hotel wifi', hint: 'Push the network until it gives up.' },
  // Was "It never leaves your machine", which was true of a real stream. There
  // is no stream now: the control is cosmetic and the page never asks.
  { id: 'camera', name: 'Show your face', hint: 'Press the camera button. Nothing is captured — it never asks.' },
  { id: 'hand', name: 'Raise your hand', hint: 'You know the button.' },
  { id: 'react', name: 'React to something', hint: 'Send a reaction.' },
  { id: 'a11y', name: 'No mouse required', hint: 'Move through the tiles with the arrow keys.' },
  { id: 'host', name: 'Host controls', hint: 'Take something away with you.' },
  { id: 'plain', name: 'Just give me the CV', hint: 'Read it as a document instead.' },
  { id: 'konami', name: 'You know the code', hint: '', secret: true },
  { id: 'patient', name: 'Read the whole spec', hint: '', secret: true },
  { id: 'slap', name: 'Talk to the hand', hint: '', secret: true },
];

const KEY = 'callback.quests';
const visible = quests.filter((q) => !q.secret);

export class Quests {
  private got = new Set<string>();
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
    this.tray = h('div', { class: 'quest-tray', 'aria-hidden': 'false' });
    root.append(this.live, this.tray);
  }

  has(id: string): boolean {
    return this.got.has(id);
  }

  count(): { got: number; total: number } {
    return { got: visible.filter((q) => this.got.has(q.id)).length, total: visible.length };
  }

  all(): { quest: Quest; got: boolean }[] {
    return quests
      .filter((q) => !q.secret || this.got.has(q.id))
      .map((q) => ({ quest: q, got: this.got.has(q.id) }));
  }

  subscribe(fn: () => void): void {
    this.onChange.push(fn);
  }

  unlock(id: string): void {
    if (this.got.has(id)) return;
    const quest = quests.find((q) => q.id === id);
    if (!quest) return;

    this.got.add(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.got]));
    } catch {
      /* ignore */
    }

    const { got, total } = this.count();
    const complete = got === total;
    this.toast(quest, complete);
    if (this.live) this.live.textContent = `Side quest complete: ${quest.name}.`;
    for (const fn of this.onChange) fn();
  }

  /**
   * Meet's own notice card, measured off the pre-join screen where it reports a
   * missing microphone. It is the closest thing the product has to a toast that
   * we can reach without joining a call, and it is a better fit than a snackbar
   * anyway: an icon, a title, a line of detail, and a way to make it go away.
   *
   *   card    386x127, #3c4043, radius 8, padding 34 21 35
   *   shadow  Material elevation 2 — three soft layers, not one heavy one
   *   icon    24px, 21 from the left, 34 from the top
   *   title   400 16/24, letter-spacing .1, #fff, 6px after the icon
   *   body    400 14/20, letter-spacing .2, #fff, 14px under the icon row —
   *           aligned to the *icon's* left edge, not the title's
   *   close   24px #c4c7c5, 11 from the top and 11 from the right
   *
   * Two parts of that are not what you would guess. The title is 400, not 500:
   * Meet does not bold it. And the body is full white, not the dimmed grey every
   * other dark surface in the product uses. It is a notice, so both lines are
   * meant to be read.
   *
   * The one thing dropped rather than copied is our own uppercase kicker. Meet
   * has no uppercase kickers anywhere, and the information fits Meet's split as
   * it stands: what happened goes in the title, the detail in the body.
   */
  /**
   * One toast, however many quests land.
   *
   * The old design gave every unlock its own 386x140 card: a 24px icon, a 16px
   * title, a 14px subtitle 14px below it, and a 20px progress bar. Three at once
   * covered 420px of screen to say three short things, which is exactly what Nam
   * objected to — "taking a massive amount of space for very little info", and
   * conspicuously unlike the product it sits inside. Meet's own notices are one
   * line until they have a reason not to be.
   *
   * So this is a single strip that accumulates. The first unlock creates it; the
   * next one adds a badge and rewrites the label rather than stacking a second
   * card. Quantity is carried by the badge row, which reads at a glance in a way
   * a number does not, and each badge names its own quest on hover — so nothing
   * is lost by not printing every title.
   *
   * The progress bar survives as the strip's bottom edge. Nam asked for a bar
   * and was right to; it just does not need twenty pixels and its own margin to
   * do the job, so it is 2px of the border the toast already has.
   */
  private strip: {
    card: HTMLElement;
    badges: HTMLElement;
    label: HTMLElement;
    count: HTMLElement;
    fill: HTMLElement;
    names: string[];
    timer: number;
  } | null = null;

  /** The badge cap. Past this the row would out-grow the label it belongs to. */
  private static readonly MAX_BADGES = 5;

  private toast(quest: Quest, complete: boolean): void {
    if (!this.tray) return;
    const { got, total } = this.count();

    if (this.strip) {
      this.extend(quest, complete, got, total);
      return;
    }

    const badges = h('div', { class: 'qt-badges' });
    const label = h('span', { class: 'qt-label' }, quest.name);
    const count = h('span', { class: 'qt-count' }, `${got}/${total}`);
    const fill = h('i', { class: 'qt-fill' }) as HTMLElement;
    fill.style.width = `${Math.round((got / total) * 100)}%`;

    const close = h(
      'button',
      { class: 'qt-x', type: 'button', 'aria-label': 'Dismiss', title: 'Dismiss' },
      sym('close', 18),
    ) as HTMLButtonElement;

    const card = h(
      'div',
      { class: 'quest-toast', role: 'status', 'aria-live': 'polite' },
      badges, label, count, close,
      h('div', { class: 'qt-bar', 'aria-hidden': 'true' }, fill),
    ) as HTMLElement;

    this.tray.appendChild(card);
    this.strip = { card, badges, label, count, fill, names: [], timer: 0 };
    this.addBadge(quest);
    if (complete) label.textContent = 'All of them';

    // It leaves on its own, but not while someone is reading it. A notice that
    // vanishes mid-sentence because the pointer happened to be elsewhere is the
    // reason people learn to distrust toasts.
    const leave = (): void => {
      card.classList.add('out');
      window.setTimeout(() => card.remove(), 320);
      this.strip = null;
    };
    const hold = (): void => { if (this.strip) window.clearTimeout(this.strip.timer); };
    const arm = (): void => { if (this.strip) this.strip.timer = window.setTimeout(leave, 4200); };
    card.addEventListener('pointerenter', hold);
    card.addEventListener('pointerleave', arm);
    card.addEventListener('focusin', hold);
    card.addEventListener('focusout', arm);
    close.addEventListener('click', () => { hold(); leave(); });
    arm();
  }

  /** A badge per quest, each naming itself on hover. */
  private addBadge(quest: Quest): void {
    const live = this.strip;
    if (!live) return;
    live.names.push(quest.name);
    const shown = live.badges.querySelectorAll('.qt-badge').length;
    if (shown < Quests.MAX_BADGES) {
      live.badges.appendChild(h(
        'span',
        { class: 'qt-badge', title: quest.name, 'aria-label': quest.name },
        sym(quest.secret ? 'bolt' : 'auto_awesome', 16),
      ));
      return;
    }
    // Past the cap, the overflow badge counts the rest and names them all.
    let more = live.badges.querySelector<HTMLElement>('.qt-more');
    if (!more) {
      more = h('span', { class: 'qt-badge qt-more' }, '') as HTMLElement;
      live.badges.appendChild(more);
    }
    const extra = live.names.length - Quests.MAX_BADGES;
    more.textContent = `+${extra}`;
    const rest = live.names.slice(Quests.MAX_BADGES).join(', ');
    more.setAttribute('title', rest);
    more.setAttribute('aria-label', `${extra} more: ${rest}`);
  }

  /** A second unlock while the strip is up joins it instead of stacking. */
  private extend(quest: Quest, complete: boolean, got: number, total: number): void {
    const live = this.strip;
    if (!live) return;
    this.addBadge(quest);
    live.count.textContent = `${got}/${total}`;
    live.fill.style.width = `${Math.round((got / total) * 100)}%`;
    live.label.textContent = complete
      ? 'All of them'
      : live.names.length > 1
        ? `${quest.name} +${live.names.length - 1}`
        : quest.name;
    // Restart the dwell, so the newest arrival gets its full read.
    window.clearTimeout(live.timer);
    live.timer = window.setTimeout(() => {
      live.card.classList.add('out');
      window.setTimeout(() => live.card.remove(), 320);
      this.strip = null;
    }, 4200);
    // A pulse, so a badge appearing on a strip already on screen is noticed.
    live.card.classList.remove('qt-bump');
    void live.card.offsetWidth;
    live.card.classList.add('qt-bump');
  }

}

/**
 * The easter egg. A game developer's CV should reward the one input every game
 * developer knows.
 */
export function konami(onFound: () => void): void {
  const seq = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a',
  ];
  let i = 0;
  window.addEventListener('keydown', (e) => {
    const want = seq[i];
    if (!want) return;
    if (e.key.toLowerCase() === want.toLowerCase()) {
      i++;
      if (i === seq.length) {
        i = 0;
        onFound();
      }
    } else {
      i = e.key === seq[0] ? 1 : 0;
    }
  });
}

