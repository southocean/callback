// The completion breakdown, as a dialog.
//
// Board ticket N118. Opened from the home screen's rail, and built on the same
// card the Project spec and the bug case use, because a fourth dialog shape
// would be a fourth thing to learn for no reason.
//
// It is deliberately read-only and deliberately short. Nam asked for "a panel
// breaking down your progress in each category", and the temptation with a screen
// like this is to list what is still missing by name. That would turn four
// collections into a checklist and the hunt into errands, which is the opposite
// of why any of them are hidden. Each row says how many and roughly where.

import { h } from '../dom.js';
import { sym } from './icons.js';
import { trapFocus } from '../a11y.js';
import { progressNow, ring, breakdown } from './progress.js';

const ID = 'progressframe';

/**
 * WHICH ROOM IT WAS OPENED FROM -- board ticket N132.
 *
 * Nam: "Note that the meeting itself is in dark mode, so if we open the
 * progression panel here, it should adapt to that and also is in dark mode.
 * Opening that from end screen or home screen should trigger the light mode
 * display."
 *
 * The panel already had everything it needed for this and was not using it.
 * Every colour in it comes from a --dp-* custom property, and those are declared
 * on .dp-light and .dp-dark rather than on :root, which is how one component
 * wears two themes without a second stylesheet. This was pinned to dp-light, so
 * a light card opened over a dark call.
 *
 * Light is the default because two of the three callers are light surfaces and a
 * missing argument should not be able to produce the wrong-looking panel.
 */
export function openProgress(theme: 'light' | 'dark' = 'light'): void {
  if (document.getElementById(ID)) return;
  const p = progressNow();

  let release: (() => void) | null = null;
  const close = (): void => {
    release?.();
    frame.remove();
  };

  const frame = h(
    'div',
    {
      class: `dp dp-${theme} pr-frame`, id: ID, role: 'dialog', 'aria-modal': 'true',
      'aria-label': 'How much of this you found',
    },
    h('div', { class: 'dp-card' },
      h('div', { class: 'dp-head' },
        h('span', { class: 'dp-head-ico', 'aria-hidden': 'true' }, sym('bolt', 22)),
        h('div', { class: 'dp-title' },
          h('h1', {}, 'How much of this you found'),
          h('p', {}, `${p.got} of ${p.total}, across four collections.`)),
        h('button', {
          class: 'icon-btn dp-close', type: 'button', 'aria-label': 'Close', onclick: close,
        }, sym('close', 22))),
      h('div', { class: 'dp-body' },
        h('div', { class: 'dp-col' },
          h('div', { class: 'pr-hero' }, ring(p, { size: 96 })),
          breakdown(p),
          h('p', { class: 'dp-note' },
            'None of this gates anything. The CV is complete for somebody who finds none of it, '
            + 'which is the point of hiding it in the first place.')))),
  ) as HTMLElement;

  frame.addEventListener('pointerdown', (e) => { if (e.target === frame) close(); });
  document.body.appendChild(frame);
  release = trapFocus(frame, close);
  frame.querySelector<HTMLElement>('.dp-close')?.focus();
}
