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
  { id: 'fx', name: 'Hall of mirrors', hint: 'Turn on an effect.' },
  { id: 'collapse', name: 'Hotel wifi', hint: 'Push the network until it gives up.' },
  { id: 'camera', name: 'Show your face', hint: 'Turn your camera on. It never leaves your machine.' },
  { id: 'hand', name: 'Raise your hand', hint: 'You know the button.' },
  { id: 'react', name: 'React to something', hint: 'Send a reaction.' },
  { id: 'a11y', name: 'No mouse required', hint: 'Move through the tiles with the arrow keys.' },
  { id: 'host', name: 'Host controls', hint: 'Take something away with you.' },
  { id: 'plain', name: 'Just give me the CV', hint: 'Read it as a document instead.' },
  { id: 'konami', name: 'You know the code', hint: '', secret: true },
  { id: 'patient', name: 'Read the whole spec', hint: '', secret: true },
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

  private toast(quest: Quest, complete: boolean): void {
    if (!this.tray) return;
    const { got, total } = this.count();
    const card = h(
      'div',
      { class: 'quest-toast', role: 'status' },
      h('div', { class: 'quest-kicker' }, quest.secret ? 'Secret found' : `Side quest ${got}/${total}`),
      h('div', { class: 'quest-name' }, quest.name),
      complete
        ? h('div', { class: 'quest-sub' }, 'All of them. That is more thorough than most interview loops.')
        : null,
    );
    this.tray.appendChild(card);
    window.setTimeout(() => card.classList.add('out'), 4200);
    window.setTimeout(() => card.remove(), 4900);
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

