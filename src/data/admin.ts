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

  { id: 'm7', kind: 'math', q: 'What is 9 x 9?', answers: ['81', 'eighty one', 'eightyone'] },
  { id: 'm8', kind: 'math', q: 'What is 100 divided by 4?', answers: ['25', 'twenty five', 'twentyfive'] },
  { id: 'm9', kind: 'math', q: 'How many seconds are there in an hour?', answers: ['3600', '3,600'] },
  { id: 'm10', kind: 'math', q: 'What is 3 cubed?', answers: ['27', 'twenty seven', 'twentyseven'] },
  { id: 'm11', kind: 'math', q: 'What is 1000 minus 111?', answers: ['889'] },
  { id: 'm12', kind: 'math', q: 'How many degrees are there in a triangle?', answers: ['180', '180 degrees'] },
  { id: 'm13', kind: 'math', q: 'What is 25% of 80?', answers: ['20', 'twenty'] },
  { id: 'm14', kind: 'math', q: 'What is the next prime number after 7?', answers: ['11', 'eleven'] },

  { id: 'h6', kind: 'history', q: 'In which year did the first iPhone go on sale?', answers: ['2007'] },
  { id: 'h7', kind: 'history', q: 'Who painted the Mona Lisa?', answers: ['leonardo da vinci', 'da vinci', 'leonardo'] },
  { id: 'h8', kind: 'history', q: 'Which empire built the Colosseum?', answers: ['roman', 'the romans', 'romans', 'rome', 'roman empire', 'the roman empire'] },
  { id: 'h9', kind: 'history', q: 'In which century did the French Revolution begin?', answers: ['18th', '18', 'eighteenth', '18th century', 'eighteenth century', '1700s'] },
  { id: 'h10', kind: 'history', q: 'Which country put the first person into space?', answers: ['soviet union', 'the soviet union', 'ussr', 'russia', 'the ussr'] },
  { id: 'h11', kind: 'history', q: 'Who wrote the play Hamlet?', answers: ['shakespeare', 'william shakespeare'] },
  { id: 'h12', kind: 'history', q: 'In which year did people first land on the Moon?', answers: ['1969'] },

  { id: 's7', kind: 'sense', q: 'How many continents are there?', answers: ['7', 'seven'] },
  { id: 's8', kind: 'sense', q: 'Which is the largest planet in our solar system?', answers: ['jupiter'] },
  { id: 's9', kind: 'sense', q: 'How many strings does a standard guitar have?', answers: ['6', 'six'] },
  { id: 's10', kind: 'sense', q: 'Which gas do plants take out of the air?', answers: ['carbon dioxide', 'co2', 'carbondioxide'] },
  { id: 's11', kind: 'sense', q: 'How many minutes are there in a quarter of an hour?', answers: ['15', 'fifteen'] },
  { id: 's12', kind: 'sense', q: 'What is the capital of Japan?', answers: ['tokyo'] },
  { id: 's13', kind: 'sense', q: 'How many players does a football team have on the pitch?', answers: ['11', 'eleven'] },
  { id: 's14', kind: 'sense', q: 'Mixing red and white gives you which colour?', answers: ['pink'] },
];


/**
 * THE SECOND DOOR -- board ticket N175.
 *
 * Nam: "Yes this code is a secret, but I wont be able to tell users what that
 * code is. So I want to provide an alternative unblocking method for this admin
 * gate for the very dedicated users ... Question bank of say 40 or 50 questions,
 * but you only need to score 30 to pass."
 *
 * The password is unhintable by design -- it is only findable because the
 * gesture that opens the box is itself a cheat code -- so anybody who has not
 * made that leap has no route at all. Dedication is the other key.
 *
 * WHY A THRESHOLD RATHER THAN THE WHOLE BANK. Nam asked for all of them first
 * and then talked himself out of it in the same message, and he was right to.
 * Requiring forty out of forty makes one badly worded question a permanent wall,
 * and there is no appeal process on a dialog. Slack is also the only thing that
 * makes Shuffle a decision: with none, skipping is deferral.
 *
 * TWENTY, NOT THIRTY -- board ticket N190, and the estimate is what killed it.
 * This shipped at thirty with a note justifying it as "about fifteen minutes
 * from somebody who wants in". Nam read that sentence and answered it: "damn
 * that is a lot of time invested in here! Okay maybe 30 is too much, lets lower
 * it down to 20 then." Writing the number down is what made it obvious that
 * fifteen minutes is a long time to spend on a joke door. Twenty is around
 * eight, which is still a real commitment and no longer a sitting.
 *
 * THE BANK STAYS AT FORTY, which is the half worth defending. The slack is what
 * Shuffle spends: twenty to find in forty means HALF the bank can be skipped or
 * wrong, so a question you have no idea about costs nothing to walk away from.
 * Cutting the bank along with the mark would have put the ratio back where it
 * started and made Shuffle a stall again.
 */
export const ADMIN_PASS_MARK = 20;

/**
 * Questions not yet solved, in declared order.
 *
 * Filtering the BANK rather than the saved list is what makes a renamed or
 * deleted question harmless: an id nobody recognises cannot conjure a row, and
 * cannot be counted either. Same rule the side quest board settled on.
 */
export function remaining(solved: string[]): Challenge[] {
  const done = new Set(solved);
  return challenges.filter((c) => !done.has(c.id));
}

/** Where the grind stands: what has been solved, and what it takes. */
export function score(solved: string[]): { got: number; need: number; passed: boolean } {
  const real = new Set(challenges.map((c) => c.id));
  const got = new Set(solved.filter((id) => real.has(id))).size;
  return { got, need: ADMIN_PASS_MARK, passed: got >= ADMIN_PASS_MARK };
}

/**
 * Move the head of the queue to the back -- what Shuffle does.
 *
 * Nam: "when user presses shuffle, we put the skipped question to the end of the
 * list, so its unlikely to reoccur - something user has expressed not knowing
 * the answer to."
 *
 * A rotation rather than a re-roll, and the difference is the whole feature. A
 * random pick can hand back the question you just skipped, which reads as the
 * button being broken; a rotation cannot, and it also means the thirty-nine you
 * did not skip come round before it does.
 *
 * Returns a new array, so the caller cannot mutate the queue by accident and the
 * tests can compare before against after.
 */
export function shuffled(queue: Challenge[]): Challenge[] {
  if (queue.length < 2) return [...queue];
  return [...queue.slice(1), queue[0]!];
}

/**
 * WRONG ANSWER, IN ONE LINE -- board tickets N190 and N191.
 *
 * The old set was written for a box whose only entrance was an eleven press
 * gesture, and half of them said so: "You clicked a help button eleven times to
 * get here and this is where it ends?" N179 gave it a second entrance, off a
 * locked tab that anybody can find, and Nam caught the lines going stale with
 * it: "now that we add an alternative much easier way to find this admin gate,
 * this read becomes irrelevant."
 *
 * SHORTER, BECAUSE THE FIELD SAYS IT FIRST. The input shakes and flashes red
 * before anybody has read a word, so these are no longer carrying the verdict --
 * they are the joke that follows it. Nam, on the old three-liners: "keep them
 * short and concise, ideally only on one line here", and on why: "as I notice
 * when my friend tested the CV, he doesnt read all that text either."
 *
 * Never about the person. The joke is the situation, which is somebody standing
 * at a locked door failing a general knowledge question.
 */
export const wrongRoasts: string[] = [
  'No. The bar was ankle height.',
  'Wrong, and confidently so. My favourite kind.',
  'Not it. Unlimited attempts, which is starting to read as a warning.',
  'No. Somewhere a hiring manager is reading the actual CV.',
  'Incorrect. This is where I say we will be in touch.',
  'Wrong. The question was the easy part of this dialog.',
  'No. Take your time. Neither of us is going anywhere.',
  'Nope. That one is going to bother you later.',
];

/**
 * RIGHT ANSWER, AND IT COUNTS -- board ticket N175, re-cut in N191.
 *
 * These replaced a set whose entire job was to say that solving the sum was a
 * dead end: "Right answer. Wrong door." It was, and it is not any more, so
 * keeping them would have been the dialog lying about its own rules -- the one
 * thing a decoy cannot afford, because a decoy only works while everything it
 * says is technically true.
 *
 * The turn survives in a smaller form: the password is still the short way in
 * and these still say so. What they no longer claim is that the long way does
 * not exist.
 *
 * ONE LINE EACH, AND NO NUMBER IN THEM. The line count used to name the mark --
 * "that is one of thirty" -- which broke the moment N190 moved it to twenty.
 * Copy that hardcodes a constant is copy that goes stale silently, and the bar
 * underneath is already saying the number.
 */
export const rightLines: string[] = [
  'Correct. There is a much shorter way in, but by all means.',
  'Right. Banked. You will not see that one again.',
  'Correct. I should mention the door also opens for a single word.',
  'Yes. You are doing this the long way and you know it.',
  'Right again. Somebody guessed the password in four seconds. Not you.',
  'Correct. I am running out of ways to find this funny.',
  'Yes. At this point I think you prefer it this way.',
  'Correct. Fine. You are clearly not going anywhere.',
];

/**
 * THE MARK, REACHED. No sting in these: they ground it out on purpose when a
 * single word would have done it, so the line is straight.
 */
export const passedLines: string[] = [
  'You ground it out. The door is open and you never needed the password.',
  'Nobody was supposed to actually do this. Welcome to admin.',
  'There was a four second version of this. You chose the long one. Respect.',
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
