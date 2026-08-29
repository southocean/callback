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
import { board, VISIBLE_QUESTS } from '../data/quests.js';
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
  const { rows, got, extra } = board(foundAll().quests);

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

  const listOf = (items: typeof rows): HTMLElement => {
    const el = h('div', { class: 'qb-list', role: 'list' });
    for (const r of items) el.appendChild(row(r));
    return el;
  };

  /*
   * TWO BLOCKS RATHER THAN ONE LIST, and this is the whole of what Nam caught:
   * "I counted the side quests there are 21 here, but the text said we did 12 of
   * 17, so what is it? very confusing counting."
   *
   * Both numbers were right and the board gave no way to see that. The tally
   * counts the seventeen the opening line promises out loud, on purpose -- a
   * denominator that grew when a secret turned up would make the script wrong,
   * which is the argument in data/quests.ts. But the list under it ran all
   * twenty-one rows together in one grid, so the only way to reconcile the
   * header with the board was to spot four small chips and subtract. Nobody
   * subtracts. They count, they get 21, and they conclude the number lied.
   *
   * This is the N137 mistake in a subtler place. That one was a ring counting 21
   * eighteen pixels above a card counting 17, and the fix was to stop asking the
   * second question on that screen. Here the second answer IS the list, so it
   * cannot be removed -- it can only be separated, and labelled with the same
   * two numbers the sentence uses. Seventeen rows under one heading, four under
   * the other, and the header stops being a claim to be checked.
   *
   * Only when there is something to reconcile. With no secrets found the board
   * is seventeen rows and seventeen promised, and a heading over a single block
   * would be furniture explaining a question nobody asked.
   */
  const promised = rows.filter((r) => !r.quest.secret);
  const secrets = rows.filter((r) => r.quest.secret);
  const blocks: HTMLElement[] = extra === 0
    ? [listOf(rows)]
    : [
      h('section', { class: 'qb-sec' },
        h('h2', { class: 'qb-sec-h' }, `The ${VISIBLE_QUESTS} you were told about`),
        listOf(promised)),
      h('section', { class: 'qb-sec' },
        h('h2', { class: 'qb-sec-h' },
          extra === 1 ? 'The one you were not' : `The ${extra} you were not`),
        listOf(secrets)),
    ];

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
           * The tally counts the ones that were promised. A found secret is an
           * extra sentence rather than a bigger denominator, because the opening
           * line of the conversation says a number out loud and the two must not
           * disagree -- which is the exact complaint N137 fixed on the old ended
           * screen, where a ring counting 21 sat above a card counting 17.
           */
          // "Plus one", not "Plus 1", and the heading below says "The one you
          // were not" to match. A lone digit mid-sentence reads as a count from
          // a system; the word reads as someone telling you.
          h('p', {}, `${got} of ${VISIBLE_QUESTS} done.`
            + (extra > 0 ? ` Plus ${extra === 1 ? 'one' : extra} nobody told you about.` : ''))),
        h('button', {
          class: 'icon-btn dp-close', type: 'button', 'aria-label': 'Close', onclick: close,
        }, sym('close', 22))),
      h('div', { class: 'dp-body' },
        h('div', { class: 'dp-col' }, ...blocks))),
  ) as HTMLElement;

  // The scrim closes it, the card does not. pointerdown rather than click, so a
  // drag that starts inside the card and ends on the scrim does not shut it.
  frame.addEventListener('pointerdown', (e) => { if (e.target === frame) close(); });
  document.body.appendChild(frame);
  release = trapFocus(frame, close);
  frame.querySelector<HTMLElement>('.dp-card')?.focus();
}
