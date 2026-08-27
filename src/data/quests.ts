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
  { id: 'camera', name: 'Show your face', hint: 'Press the camera button. Nothing is captured — it never asks.' },
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
