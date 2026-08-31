// The completion breakdown, as a dialog.
//
// Board ticket N118. Opened from the home screen's rail, and built on the same
// card the Project spec and the bug case use, because a fourth dialog shape
// would be a fourth thing to learn for no reason.
//
// It is deliberately read-only and deliberately short. Nam asked for "a panel
// breaking down your progress in each category", and the temptation with a screen
// like this is to list what is still missing by name. That would turn three
// collections into a checklist and the hunt into errands, which is the opposite
// of why any of them are hidden. Each row says how many and roughly where.
//
// N137 took two things out of it and put one in.
//
// The heading was "How much of this you found", which is a sentence where a name
// belongs: this panel is opened from a rail item, and a rail item opens a place,
// not a question. "Your completion" is what the ring on the rail means, so the
// panel and the control that opens it now say the same word.
//
// The paragraph under the rows went the same way. It read "None of this gates
// anything. The CV is complete for somebody who finds none of it..." -- which is
// true, is the design principle the whole layer is built on, and is addressed to
// somebody who has not yet found anything. By the time this panel can be opened
// at all they have found something and pressed a ring to come and look at it.
// Nam: "none of it gates anything bla bla => remove, we know."
//
// WHAT WENT IN is a way out to the bug case. The Bugs row is the only one of the
// three whose collection has its own room, and the ended screen used to be where
// you found the door; now that the ended screen reports a pass rather than a
// total, the door belongs next to the total. It is only drawn when a catcher is
// handed in, because two of the three callers have one and the panel must not
// promise a room it cannot open.

import { h } from '../dom.js';
import { sym } from './icons.js';
import { trapFocus } from '../a11y.js';
import { progressNow, ring, breakdown } from './progress.js';
import type { Bugs } from '../bugs.js';

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
export function openProgress(theme: 'light' | 'dark' = 'light', bugs?: Bugs): void {
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
      'aria-label': 'Your completion',
    },
    /*
     * `dp-in`, WHICH THIS PANEL WAS THE ONLY ONE OF THE THREE MISSING -- board
     * ticket N255.
     *
     * Nam: "on mobile when opening the progression panel, the transition is a bit
     * abrupt, unlike the transition when opening or closing the bug panel and the
     * quest panel. Please copy those softer transitions."
     *
     * Abrupt is exactly right and it was not a matter of degree: this card had no
     * entrance of any kind, so it was painted complete on the frame it mounted.
     * The bug case fades its scrim in over 150ms; the quest board, which is this
     * same `.dp` shell, carries `dp-in` on its card -- a 320ms fade from
     * scale(.985) on the build's own dialog curve. One class was the whole
     * difference.
     *
     * COPIED FROM THE QUEST BOARD RATHER THAN INVENTED, and specifically from the
     * board rather than from the case, because these two are already a pair: the
     * stylesheet's 900px block names `.qb-frame, .pr-frame` in one selector to
     * give them the same 28px card over a visible scrim, after Nam said "the quest
     * and the progression panels dont have the same look." That ticket paired them
     * on looks and left the motion unpaired, which is why the same complaint came
     * back about the same two panels.
     *
     * NOTHING IS ADDED ON CLOSE, and that is matching rather than an omission. All
     * three dialogs close by removing the node, so an exit animation here would
     * make this panel the odd one out again in the other direction.
     *
     * No reduced-motion branch in here: `.dp-in` is switched off by media query in
     * the stylesheet, which is where devportal's JS-side check is redundant.
     */
    h('div', { class: 'dp-card dp-in' },
      h('div', { class: 'dp-head' },
        h('span', { class: 'dp-head-ico', 'aria-hidden': 'true' }, sym('bolt', 22)),
        h('div', { class: 'dp-title' },
          h('h1', {}, 'Your completion'),
          h('p', {}, `${p.got} of ${p.total}, across three collections.`)),
        h('button', {
          class: 'icon-btn dp-close', type: 'button', 'aria-label': 'Close', onclick: close,
        }, sym('close', 22))),
      h('div', { class: 'dp-body' },
        h('div', { class: 'dp-col' },
          h('div', { class: 'pr-hero' }, ring(p, { size: 96 })),
          breakdown(p),
          bugs
            ? h('div', { class: 'pr-acts' },
              h('button', {
                class: 'm-btn m-outlined', type: 'button',
                // Closed first, then opened: the case is a dialog of the same
                // family and two of them stacked would trap focus in the one
                // underneath. Fetched rather than imported so a visitor who only
                // reads the breakdown never pays for the cabinet.
                onclick: () => {
                  close();
                  void import('./bugframe.js').then((m) => m.openBugFrame(bugs));
                },
              }, 'Open the bug case'))
            : h('span', {})))),
  ) as HTMLElement;

  frame.addEventListener('pointerdown', (e) => { if (e.target === frame) close(); });
  document.body.appendChild(frame);
  release = trapFocus(frame, close);
  frame.querySelector<HTMLElement>('.dp-close')?.focus();
}
