// The first question the call asks -- board ticket N167.
//
// Nam: "After entering the call, you get a prompt, asking you to choose between 2
// modes: lazy walkthrough and let me explore. The styling should be google like,
// yet it should feel impactful here, and the walkthrough is the recommended
// action ... You are either sitting back and watching like a movie vs doing
// everything yourself."
//
// THIS IS THE SECOND TIME THE QUESTION HAS BEEN ASKED AND THE FIRST TIME IT IS IN
// THE RIGHT PLACE. N158 put the same two lanes on the start screen and Nam cut
// them the same day: "we only expose them once we are in the call, cause that is
// the only place its relevant." That is exactly what makes this version work. A
// choice about being narrated at, offered to somebody who has not yet seen
// anything to narrate, is a choice made on no information. Offered to somebody
// standing in a call that is one second away from starting to talk, it is a real
// decision about the next twenty minutes.
//
// NOT THE LEAVE DIALOG, WHICH NAM RAISED AND THEN TALKED HIMSELF OUT OF. Meet's
// End for me / End for everybody is a 312px alert, and it is small on purpose:
// it is confirming something the visitor has already decided. This is the
// opposite shape of decision and gets the opposite treatment -- two lanes with
// room for a sentence each, because the difference between watching and doing has
// to be legible BEFORE it is chosen rather than discovered afterwards.
//
// THE WAY BACK IS THE CAPTIONS BUTTON, and that is what stops "let me explore"
// being a door that locks behind you. The conversation has exactly one output, so
// the captions control is not a display preference, it is the volume knob: N169
// makes turning it off mean stop talking, and this makes turning it on mean start.
// One control, one sentence, both directions.
//
// SESSION, NOT MACHINE. sessionStorage rather than localStorage, for the same
// reason N158 ended up remembering nothing across visits: how this visit should go
// is not a fact about the person, and somebody who chose to explore last week must
// not be silently locked out of the walkthrough today. Within a session it is
// asked once, because rejoining a call is not a new decision.

import { h } from '../dom.js';
import { sym } from './icons.js';
import { trapFocus } from '../a11y.js';

/** Watching, or driving. */
export type Lane = 'walkthrough' | 'explore';

/**
 * ONLY THE RECOMMENDED ANSWER IS REMEMBERED -- board ticket N189.
 *
 * Nam: "if user chose to explore themselves, we will show the choice next time
 * they join the call - but if they chose the recommended choice, the lazy
 * walkthrough, that will be remembered, and the choice is not shown again."
 *
 * THE ASYMMETRY IS THE POINT. Remembering both answers equally treats them as
 * equally settled and they are not. Somebody who sat back and watched has said
 * how they like this and will like it that way again. Somebody who chose to
 * explore was usually answering a narrower question -- not now, let me poke at
 * this first -- and the honest thing on the next join is to ask again rather
 * than to lock them out of the version with the conversation in it.
 *
 * It also fails in the kinder direction, which is the test that settles it: the
 * cost of asking somebody a second time is one press, and the cost of never
 * offering the walkthrough again is the whole script.
 *
 * LOCALSTORAGE, NOT SESSION. It was a session store so that a preference could
 * not follow somebody across visits, which was right while both answers were
 * kept. Only the sticky answer is stored now, and the entire value of that
 * answer is that it survives the tab closing. So it is a record, and it gets a
 * row in Settings like every other record.
 */
const KEY = 'callback.lane';

/** The remembered lane, which can only ever be the walkthrough. */
export function laneChosen(): Lane | null {
  try {
    return localStorage.getItem(KEY) === 'walkthrough' ? 'walkthrough' : null;
  } catch {
    // Storage off. Then the question gets asked again on the next join, which is
    // a mild annoyance and not a broken call.
    return null;
  }
}

function remember(lane: Lane): void {
  if (lane !== 'walkthrough') return;
  try {
    localStorage.setItem(KEY, lane);
  } catch {
    /* ignore */
  }
}

/**
 * Put the question, or answer it from memory.
 *
 * Resolves with the lane. The caller does not have to know whether a dialog was
 * shown, which is what keeps the join path in call.ts to one branch.
 */
export function askLane(): Promise<Lane> {
  const already = laneChosen();
  if (already) return Promise.resolve(already);

  return new Promise<Lane>((done) => {
    let release: (() => void) | null = null;
    const pick = (lane: Lane): void => {
      remember(lane);
      release?.();
      /*
       * Faded out rather than removed, and the promise resolves with it rather
       * than after it. The walkthrough's first act is to press two buttons on a
       * screen the visitor is looking at, so it may as well start behind the
       * scrim on its way out; waiting for the transition would put a quarter of a
       * second of dead call between the press and anything happening.
       */
      scrim.classList.add('is-out');
      window.setTimeout(() => scrim.remove(), 220);
      done(lane);
    };

    /** One lane. A big pressable surface, not a button with a paragraph in it. */
    const lane = (
      opts: { id: Lane; glyph: 'closed_caption' | 'apps'; title: string; body: [string, string]; best?: boolean },
    ): HTMLElement => {
      const el = h(
        'button',
        {
          class: `lane-opt${opts.best ? ' is-best' : ''}`,
          type: 'button',
        },
        /*
         * THE CHIP RIDES THE ICON ROW, not the title, and that came out of
         * looking at it. On the title it wrapped to a line of its own -- two
         * lanes at 290px cannot fit "Let him walk me through it" and a chip on
         * one line -- which pushed the recommended lane's body 29px below its
         * neighbour's. Two paragraphs a visitor is meant to COMPARE do not get to
         * start at different heights. Up here it is one row in both cards, empty
         * in one of them, so every line below it agrees.
         *
         * The chip is inside the accessible name on purpose: "Recommended" is
         * information about the choice, not decoration on it.
         */
        h('span', { class: 'lane-top' },
          h('span', { class: 'lane-ico', 'aria-hidden': 'true' }, sym(opts.glyph, 26)),
          opts.best ? h('span', { class: 'lane-chip' }, 'Recommended') : h('span', {})),
        h('span', { class: 'lane-t' }, opts.title),
        /*
         * TWO LINES, AUTHORED -- board ticket N188. Both bodies are the same
         * shape: what the lane is, then how to leave it. Letting those run
         * together and wrap wherever 290px happens to end put half of the second
         * sentence on the first line in one card and not the other, so two
         * paragraphs meant to be COMPARED did not break in the same place.
         */
        h('span', { class: 'lane-b' },
          h('span', { class: 'lane-l' }, opts.body[0]),
          h('span', { class: 'lane-l' }, opts.body[1])),
      ) as HTMLButtonElement;
      el.addEventListener('click', () => pick(opts.id));
      return el;
    };

    const scrim = h(
      'div',
      {
        class: 'lane-scrim', id: 'lanepick', role: 'dialog', 'aria-modal': 'true',
        'aria-label': 'How would you like to go through this?',
      },
      /*
       * ONE HEADING AND TWO SENTENCES -- board ticket N176.
       *
       * The lead paragraph that used to sit here said there were two ways and
       * that neither hid anything, directly above two cards saying what the two
       * ways are. Nam: "remove, the decision is already clear from the two
       * options below." It was either redundant or it was propping up bodies
       * that could not stand on their own, and cutting it is the test: the lanes
       * pass it at one sentence each.
       */
      h('div', { class: 'lane-card' },
        h('h2', { class: 'lane-q' }, 'How would you like this?'),
        h('div', { class: 'lane-opts' },
          lane({
            id: 'walkthrough',
            glyph: 'closed_caption',
            // Titled to match the green room's preview card, so the two cannot
            // contradict each other if this picker is ever mounted again (askLane
            // is exported and unused -- see the note at call.ts:2419).
            //
            // WITHOUT the card's third line, deliberately. "Would he get the job?"
            // is the green room's, where it is the last thing read before Join;
            // here the two lanes are meant to be COMPARED, and the note below
            // spends a paragraph on why both bodies are the same shape. A third
            // line in one card and not the other is exactly the asymmetry it is
            // guarding against.
            title: 'Rehearse with me',
            body: ['Nam shows you around.', 'Stop him whenever you want.'],
            best: true,
          }),
          lane({
            id: 'explore',
            glyph: 'apps',
            title: 'Let me explore',
            body: ['Explore at your pace.', 'Turn the caption on to bring Nam back.'],
          })),
      ),
    ) as HTMLElement;

    document.body.appendChild(scrim);
    /*
     * ESCAPE IS A CHOICE, NOT A DISMISSAL, and it is the honest one. There is no
     * neutral answer here -- something either narrates or it does not -- so a
     * dialog that could be closed without answering would have to invent a
     * default and apply it silently. Escape means "leave me alone", which is what
     * the second lane says, so that is the lane it takes.
     */
    release = trapFocus(scrim, () => pick('explore'));
    scrim.querySelector<HTMLElement>('.lane-opt')?.focus();
  });
}
