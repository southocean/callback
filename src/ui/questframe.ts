// The side quest board -- board ticket N166.
//
// Nam: "Similar to the bug collection, I want a side quest board, or achievements
// if that is a better name for it ... after the call if you have managed to get
// any side quest ... we pops up the button to open up the list of side quests, in
// which we list out all the quests along with which one you have accomplished and
// which one not, each should have a short name - the name is the hint."
//
// SIDE QUESTS, NOT ACHIEVEMENTS. He said he did not care which, only that it be
// consistent, and consistency is the whole of the decision: the toast already
// says "Side quest complete", the completion breakdown already labels the row
// Side quests, the ended screen already reports "3 new side quests", and the data
// file is already called quests.ts. Achievements would have meant renaming five
// surfaces that agree with each other in order to gain nothing.
//
// THE NAME IS THE HINT, WHICH IS WHY THERE IS NO HINT COLUMN. This is the one
// place the board differs from the bug case, and the difference comes from the
// content rather than from taste. A bug's name and species are jokes that only
// land after the catch, so the case withholds both and shows a riddle instead. A
// quest's name IS the riddle -- "Hotel wifi", "Talk to the hand", "Break it on
// purpose", "Off the clock" -- so printing it beside an empty tick is exactly the
// amount of help the quest wants to give. Printing the hint line as well would
// turn seventeen discoveries into seventeen errands, which is the same argument
// ui/progressframe.ts makes for not naming what is missing.
//
// READ FROM STORAGE, NOT FROM THE Quests INSTANCE, and that is what keeps this
// cheap. The live instance belongs to the call; this board opens from the rail on
// the home and ended screens, where no call is running. localStorage is what the
// instance writes on every unlock, so reading it directly is both current and
// free of a dependency that would have had to be threaded through two screens and
// the router to get here.

import { h } from '../dom.js';
import { sym } from './icons.js';
import { trapFocus } from '../a11y.js';
import { board } from '../data/quests.js';
import { foundAll } from '../prefs.js';

const ID = 'questframe';

/**
 * The board, as a Material dialog in the palette of the room it opened from.
 *
 * Same shell as the completion panel and the Project spec: `.dp` scrim, `.dp-card`
 * at radius 8, `.dp-head` with one accent glyph, `.dp-close` at 40x40. A fourth
 * dialog shape would be a fourth thing to learn, and the two rails this opens
 * from are eight pixels away from the ring that opens the third one.
 */
export function openQuestFrame(theme: 'light' | 'dark' = 'light'): void {
  if (document.getElementById(ID)) return;

  /*
   * The three rules -- secrets hidden until found, the tally counting only the
   * ones that were promised, and a stale id counting for nothing -- are arithmetic
   * rather than drawing, so they live in data/quests.ts where the suite can drive
   * them without a DOM. This function is left holding only the markup.
   */
  const { rows, got, total } = board(foundAll().quests);

  let release: (() => void) | null = null;
  const close = (): void => {
    release?.();
    frame.remove();
  };

  const row = ({ quest: q, done }: (typeof rows)[number]): HTMLElement => h(
    'div',
    {
      class: `qb-row${done ? ' is-done' : ''}`,
      role: 'listitem',
      // The tick is decorative, so the row states its own answer. Without this
      // a screen reader reads seventeen names and no outcomes.
      'aria-label': `${q.name}. ${done ? 'Done' : 'Not yet'}.`,
    },
    /*
     * A CIRCLE RATHER THAN A GLYPH for the empty state, because the icon font
     * here is a 7 kB subset of exactly the symbols this build uses and an
     * outlined circle is two lines of CSS. `check` is already in the subset,
     * so the done state is the real Material tick.
     */
    h('span', { class: 'qb-tick', 'aria-hidden': 'true' }, done ? sym('check', 16) : h('i', {})),
    h('span', { class: 'qb-name' }, q.name),
    q.secret ? h('span', { class: 'qb-secret' }, 'Secret') : h('span', {}),
  );

  /*
   * ONE LIST. The board carried two headed blocks for a day, a promised block
   * and a secrets block, and Nam threw it out with the reason: "The 17 you were
   * told about vs The 4 you were not is very redundant on this UI. We already
   * have the secret label, it becomes very clear, you dont even need the
   * horizontal line between them or any separation."
   *
   * He is right, and the sectioning was treating a symptom. The reason 21 rows
   * needed explaining was that the sentence above them said 17. Once the
   * sentence counts the rows, there is nothing left to explain and the chip on
   * each secret row is the only label the split was ever providing.
   */
  const list = h('div', { class: 'qb-list', role: 'list' });
  for (const r of rows) list.appendChild(row(r));

  const frame = h(
    'div',
    {
      class: `dp dp-${theme} qb-frame`, id: ID, role: 'dialog', 'aria-modal': 'true',
      'aria-label': 'Side quests',
    },
    /*
     * Focusable so the DIALOG can take focus on open, which is the rule the bug
     * case already settled: focusing the close button instead leaves a ring on it
     * at rest, and a ring reads as "this is the thing to press" on a screen whose
     * entire point is the list underneath it.
     */
    h('div', { class: 'dp-card dp-in', tabindex: '-1' },
      h('div', { class: 'dp-head' },
        h('span', { class: 'dp-head-ico', 'aria-hidden': 'true' }, sym('bolt', 22)),
        h('div', { class: 'dp-title' },
          h('h1', {}, 'Side quests'),
          /*
           * ONE SENTENCE, AND BOTH NUMBERS ARE ON THE BOARD. got is the ticks,
           * total is the rows. It replaced "12 of 17 done. Plus 4 nobody told
           * you about.", which was two numbers and an addition:
           *
           *   Nam: "saying 17 quests + 4 is very clunky, user has to do math to
           *   find out what the quest count is and how many they have
           *   completed."
           *
           * The denominator now moves as secrets turn up, 17 to 18 to 21. That
           * is the trade and it was made on purpose: a total that changes is
           * easier to read than a total you have to correct. The reasoning, and
           * what it costs against the number the call says out loud, is in
           * data/quests.ts.
           */
          h('p', {}, `${got} of ${total} done.`)),
        h('button', {
          class: 'icon-btn dp-close', type: 'button', 'aria-label': 'Close', onclick: close,
        }, sym('close', 22))),
      h('div', { class: 'dp-body' },
        h('div', { class: 'dp-col' }, list))),
  ) as HTMLElement;

  // The scrim closes it, the card does not. pointerdown rather than click, so a
  // drag that starts inside the card and ends on the scrim does not shut it.
  frame.addEventListener('pointerdown', (e) => { if (e.target === frame) close(); });
  document.body.appendChild(frame);
  release = trapFocus(frame, close);
  frame.querySelector<HTMLElement>('.dp-card')?.focus();
}
