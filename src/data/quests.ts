// The side quests, as data.
//
// They used to live in src/achievements.ts alongside the tray that draws them,
// which was fine until the tour started naming the count out loud. Nam's opening
// line is "maybe you can complete all 17 achievements", and a number in a script
// that nothing checks is a number that goes wrong the first time somebody adds a
// quest.
//
// So the list is here, pure, and the test suite asserts that the script's number
// and this array agree. achievements.ts re-exports it, so nothing else had to
// move and no import path changed.
//
// Constraints, from the reviews: nothing here gates content (U1) — the CV is
// complete for someone who unlocks nothing — and a secret quest is hidden until
// found rather than listed as a locked box.

export interface Quest {
  id: string;
  name: string;
  hint: string;
  /** Secret quests are hidden until found, and are not counted in the total. */
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
  { id: 'camera', name: 'Show your face', hint: 'Press the camera button. Nothing is captured. It never asks.' },
  { id: 'hand', name: 'Raise your hand', hint: 'You know the button.' },
  { id: 'react', name: 'React to something', hint: 'Send a reaction.' },
  { id: 'a11y', name: 'No mouse required', hint: 'Move through the tiles with the arrow keys.' },
  { id: 'host', name: 'Host controls', hint: 'Take something away with you.' },
  { id: 'plain', name: 'Just give me the CV', hint: 'Read it as a document instead.' },
  /*
   * The seventeenth, and the reason the count in the opening line is what it is.
   * Hearing him out is a real thing the visitor can do and the only one of these
   * that costs them nothing but attention — which makes it the right one to name
   * in the sentence that asks for their attention.
   *
   * The id stays `tour` after N44 renamed everything a visitor can see. It is a
   * localStorage key: renaming it would silently take the achievement back off
   * everybody who already had it, which is a worse outcome than an internal name
   * that has gone slightly out of date.
   */
  { id: 'tour', name: 'Hear him out', hint: 'Let the conversation run to the end.' },
  { id: 'konami', name: 'You know the code', hint: '', secret: true },
  { id: 'patient', name: 'Read the whole spec', hint: '', secret: true },
  { id: 'slap', name: 'Talk to the hand', hint: '', secret: true },
  /*
   * N49. Sitting through the whole outro, which spaces out to nearly two minutes
   * and is abandoned by any input at all.
   *
   * Secret, and for the same reason as the other three: a listed hint reading
   * "sit still for two minutes after the goodbye" turns a joke into a chore, and
   * spoils the joke on the way. Secrets are not counted in the total, so the
   * seventeen the opening line promises is still seventeen.
   */
  { id: 'stayed', name: 'Last one out', hint: '', secret: true },
];

/** What "all of them" means in the opening line. Secrets are not advertised. */
export const VISIBLE_QUESTS = quests.filter((q) => !q.secret).length;

/** One row of the side quest board: a quest, and whether it has been earned. */
export interface BoardRow {
  quest: Quest;
  done: boolean;
}

/**
 * What the side quest board shows -- board ticket N166.
 *
 * PURE, AND HERE RATHER THAN IN ui/questframe.ts, because everything that can be
 * wrong about this board is arithmetic over two lists and none of it is drawing.
 * Three rules interact, and each one is the kind that looks obviously right and
 * is off by one:
 *
 *   · A secret is not listed until it is found. Listing it as a locked box would
 *     tell the visitor there is something to look for without telling them enough
 *     to look, which is a worse spoiler than the secret itself.
 *   · THE TALLY IS THE ROWS. got is the ticks you can see, total is the rows you
 *     can see, and the denominator therefore grows by one each time a secret
 *     turns up. That is deliberate and it is Nam's call:
 *
 *       "What I actually want is to report the total count of side quests that
 *       are relevant to user. Not 12 of 17 but 16/21 ... So like 12 of 17, but
 *       if you complete 1 secret quest then its 13/18 ... Yes, the total amount
 *       of quests becomes inconsistent, but I think its intuitive enough for
 *       user, they will understand the secret ones are not counted into the
 *       progress."
 *
 *     It replaces a rule that held the denominator at seventeen so it would
 *     agree with the number the opening line says out loud. That rule was
 *     defensible and it cost more than it bought: the board showed 21 rows over
 *     a sentence reading 17, and the visitor had to spot four chips and subtract
 *     to see that both were true. A denominator you can count by looking needs
 *     no reconciling. The script still promises seventeen, and still means the
 *     seventeen it can talk about.
 *   · A found id that no longer matches a quest -- something renamed or deleted
 *     since -- must not be counted, because there is no row to count it against.
 *     Filtering the quest list rather than the found list settles that for free,
 *     and gives declared order rather than the order they were found in.
 */
export function board(found: string[]): { rows: BoardRow[]; got: number; total: number } {
  const have = new Set(found);
  const rows = quests
    .filter((q) => !q.secret || have.has(q.id))
    .map((q) => ({ quest: q, done: have.has(q.id) }));
  // Both numbers off `rows` and nothing else, so neither can drift from what is
  // drawn. Anyone counting the board by eye gets the same pair.
  return { rows, got: rows.filter((r) => r.done).length, total: rows.length };
}
