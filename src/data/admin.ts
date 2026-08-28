// The admin gate: a lock, a riddle that is not the lock, and the jokes either way.
//
// Nam: "we guard it behind a konami code. So what you do: you click on the avatar
// G in the home screen 11 times, and from the 4th click we will get a falling
// number coming out of the click as a click effect, and by the 11th we get a
// password code window prompt, which gives us a simple problem ... If player
// enter the wrong answer, we roast them. And if player gets the right answer, we
// congrats them but also roast them for thinking that that is the password. The
// actual password is konami."
//
// THE DECOY IS THE MECHANIC, and it is worth stating plainly because every line
// in this file is shaped by it: the problem in the dialog is not the lock.
// Answering it correctly is a dead end that pays out in applause and an insult.
// The door opens for one word, `konami`, which the dialog never asks for and
// which is only findable because the gesture that opened it was a cheat code.
//
// So the dialog has to lie convincingly. It asks its question the way a login
// asks for a password, and the roast on a correct answer is the moment the
// reader learns they were solving the wrong problem. If the copy hedges, the
// turn does not land.
//
// WHAT IS BEHIND IT is the answer key to the bug hunt and the whole script with
// its timings: two pages this build publishes to itself and would rather not
// hand to a first-time reader. Nam: "the project spec has some info I dont want
// to show everyone."

/** The word that actually opens it. Never printed in the dialog. */
export const ADMIN_PASSWORD = 'konami';

export type ChallengeKind = 'math' | 'history' | 'sense';

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  /** Asked as though it were the password prompt, because that is the joke. */
  q: string;
  /**
   * Every spelling that counts as right, already normalised.
   *
   * A list rather than one string because "neil armstrong" and "armstrong" are
   * both the answer, and a decoy that rejects a correct answer on a technicality
   * is just a broken form.
   */
  answers: string[];
}

export const KIND_LABEL: Record<ChallengeKind, string> = {
  math: 'Arithmetic',
  history: 'History',
  sense: 'Common sense',
};

export const challenges: Challenge[] = [
  { id: 'm1', kind: 'math', q: 'What is 7 x 8?', answers: ['56', 'fifty six', 'fiftysix'] },
  { id: 'm2', kind: 'math', q: 'What is 2 to the power of 10?', answers: ['1024', '1,024'] },
  { id: 'm3', kind: 'math', q: 'How many minutes are there in a day?', answers: ['1440', '1,440'] },
  { id: 'm4', kind: 'math', q: 'What is half of 246?', answers: ['123'] },
  { id: 'm5', kind: 'math', q: 'What is 12 squared?', answers: ['144'] },
  { id: 'm6', kind: 'math', q: 'What is 15% of 200?', answers: ['30', 'thirty'] },

  { id: 'h1', kind: 'history', q: 'In which year did the Berlin Wall come down?', answers: ['1989'] },
  { id: 'h2', kind: 'history', q: 'Who was the first person to walk on the Moon?', answers: ['neil armstrong', 'armstrong'] },
  { id: 'h3', kind: 'history', q: 'In which year did the Second World War end?', answers: ['1945'] },
  { id: 'h4', kind: 'history', q: 'Which ship sank on its maiden voyage in 1912?', answers: ['titanic', 'the titanic', 'rms titanic'] },
  { id: 'h5', kind: 'history', q: 'Which country gifted the Statue of Liberty to the United States?', answers: ['france'] },

  { id: 's1', kind: 'sense', q: 'How many sides does a hexagon have?', answers: ['6', 'six'] },
  { id: 's2', kind: 'sense', q: 'Mixing blue and yellow gives you which colour?', answers: ['green'] },
  { id: 's3', kind: 'sense', q: 'How many legs does a spider have?', answers: ['8', 'eight'] },
  { id: 's4', kind: 'sense', q: 'What is the capital of Sweden?', answers: ['stockholm'] },
  { id: 's5', kind: 'sense', q: 'How many days are there in a leap year?', answers: ['366'] },
  { id: 's6', kind: 'sense', q: 'What is the freezing point of water in Celsius?', answers: ['0', 'zero', '0c', '0 c'] },
];

/**
 * WRONG ANSWER. Not cruel, and never about the person: the joke is the situation
 * they have talked themselves into, which is eleven deliberate clicks followed by
 * a failed sum.
 */
export const wrongRoasts: string[] = [
  'No. You clicked a help button eleven times to get here and this is where it ends?',
  'Incorrect. Somewhere a hiring manager is reading the actual CV.',
  'Wrong, and confidently so. My favourite kind.',
  'That is not it. The bar was ankle height and you limbo danced under it.',
  'No. In fairness, nobody said the secret door would be guarded by a quiz you could pass.',
  'Wrong. Eleven clicks of commitment and a zero percent conversion rate.',
  'Not quite. Take your time, the site is not going anywhere and neither, apparently, are you.',
  'No. I want you to know the question was the easy part of this dialog.',
  'Incorrect. This is the part of the interview where I say we will be in touch.',
  'Wrong. You have unlimited attempts, which is starting to feel less like generosity and more like a warning.',
];

/**
 * RIGHT ANSWER, which is the punchline: applause, and then the reveal that the
 * applause was for nothing. Every line has to do both jobs, or the turn reads as
 * a bug rather than a joke.
 */
export const rightRoasts: string[] = [
  'Correct! Genuinely well done. Now sit with the fact that you thought a password would be the answer to a sum.',
  'Right answer. Wrong door. You have solved the riddle guarding absolutely nothing.',
  'Correct, and it changes nothing. Did you think the lock would just tell you its own combination?',
  'Nailed it. Gold star. The door remains extremely closed.',
  'That is the right answer to the question I asked, which was never the question.',
  'Correct! And in exchange, here is the truth: this box has been a decoy since the moment it opened.',
  'Well solved. Now think about the gesture that got you here and ask what kind of word it was hinting at.',
  'Yes. That is the answer. It is not the password. Those are two different things and you have found the less useful one.',
];

/** The word landed. Congratulate properly, because they earned this one. */
export const grantedLines: string[] = [
  'The code. Of course it was the code. Welcome to admin.',
  'Up, up, down, down, and so on. You got there. Admin unlocked.',
  'Correct, and this time it counts. Two tabs just appeared that were not there before.',
];

/** Already in, and pressing the help button again. */
export const alreadyAdminLines: string[] = [
  'You are already admin. There is no second floor.',
  'Still admin. The A is right there in the corner.',
];

/**
 * Normalise before comparing, because the answer to "how many legs" arriving as
 * " Eight. " is the right answer and a form that says otherwise is just rude.
 *
 * Punctuation goes from the ends only. Stripping it throughout would turn "0 c"
 * and "0c" into the same string, which is wanted, but would also quietly accept
 * things the author never listed, and a decoy that is generous in undocumented
 * directions is hard to reason about later.
 */
export function normalise(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/^[^\w]+|[^\w]+$/g, '');
}

export type Verdict = 'password' | 'right' | 'wrong';

/**
 * THE ONE DECISION, so the dialog has no logic of its own to get wrong.
 *
 * The password is tested first and unconditionally. If a challenge ever gained
 * `konami` as an accepted answer the door would still open, which is the correct
 * precedence: the lock outranks the decoy in front of it.
 */
export function judge(c: Challenge, input: string): Verdict {
  const v = normalise(input);
  if (v === ADMIN_PASSWORD) return 'password';
  return c.answers.some((a) => normalise(a) === v) ? 'right' : 'wrong';
}

/**
 * Pick by index rather than by rolling a die in here, so the tests can ask for a
 * specific line and the caller owns the randomness. Wraps, so no caller has to
 * think about the length of a list it did not write.
 */
export function pick<T>(xs: T[], i: number): T {
  return xs[((i % xs.length) + xs.length) % xs.length]!;
}
