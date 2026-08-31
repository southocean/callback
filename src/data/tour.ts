// The guided tour's script.
//
// Data only. The director in src/tour/director.ts decides what plays; the stage
// in src/tour/stage.ts puts it on screen and drives the hand.
//
// ---------------------------------------------------------------------------
// THE SEPARATION (board ticket N43)
//
// Nam: "I want to see the separation between the primary flow, vs what we do
// only as commentary." There are now two lists and they do different jobs:
//
//   THE FLOW (`parts`) is the demo. It runs in priority order, top to bottom,
//   and it is the thing a visitor who does nothing at all will watch. Every
//   part in it is something worth showing on purpose. It is deliberately SHORT
//   — Nam: "the CV is the main part and the rest should probably be all
//   commentary." Six parts, and two of them are the CV.
//
//   THE COMMENTARY (`quips`) is what the tour says BACK. One line, fired once,
//   never queued, never repeated, and it never takes the floor for longer than
//   it takes to read. These are throwaway by design: "Short and punchy, so we
//   can go back to whatever we were talking about."
//
// A part that used to be in the flow and is now a quip is not a demotion — it
// is the recognition that a shared Windows desktop explains itself and a
// narrator standing in front of it is in the way.
//
// ---------------------------------------------------------------------------
// THE REGISTERS
//
// Every FLOW part carries three, rather than one script that gets truncated:
// `lines` is the tour showing you something, `commentary` is the tour reacting
// to you opening it yourself, and `brief` is what it says when you are moving
// faster than it can talk. A single script cut short reads as a script cut
// short; three registers let the director pick a tone instead of a length.
//
// Timings are authored, not derived — a joke needs a pause a word count cannot
// predict — and then scaled at run time by the visitor's pace (see profile.ts).

import type { Tier } from '../tour/profile.js';

/**
 * One caption.
 *
 * `alt` is what the line says when no employer is named. Exactly one line in
 * the script has one, and it is the only sentence anywhere in the conversation
 * that mentions a company: see the note on it in the personal segment, and
 * data/companies.ts for why a neutral build still has to exist after N66.
 */
export interface Line { text: string; ms: number; alt?: string }

/**
 * A named thing the stage knows how to do, for the steps a CSS selector cannot
 * express. Everything that CAN be a selector IS one, because a selector is
 * checkable and a name is a promise.
 */
export type Cue =
  /** Run the whole share: picker, Entire Screen, Screen 1, Share. */
  | 'share'

  /** Maximise the browser window inside the shared desktop. */
  | 'maximise'
  | 'tab:cv' | 'tab:jobad' | 'tab:built' | 'tab:work'
  /** Open the reaction tray and send the heart, then shut whatever was opened. */
  | 'heart'
  /** Open the chat panel, hold it long enough to be read, then close it again. */
  | 'chat'
  /**
   * Ctrl-wheel the mock browser out, `zoom:<notches>` of them.
   *
   * A number rather than a fixed amount because the two documents need
   * different ones: the CV wants a single notch and the spec, which is wider,
   * wants two. See N78.
   */
  | 'zoom:1' | 'zoom:2'
  /**
   * Raise Explorer and open Hobby, where the clips are.
   *
   * Separate from `eggs` so the folder can arrive on the segment's first line
   * while the clips themselves wait for its third (N114). `eggs` still does this
   * for itself when nothing has opened it, so the two are safe in either order.
   */
  | 'files'
  /** Play the easter-egg clips this visitor has not found yet. */
  | 'eggs'
  /** The hand drifts off the edge and stops. */
  | 'park';

/** Which scrollable surface a roll applies to. */
export type Surface = 'cv' | 'page';

/** What the hand does, keyed to the line it fires on. */
export interface Beat {
  /** Index into the part's `lines`. */
  at: number;
  /** CSS selector, resolved at beat time. An unresolvable target is skipped, silently. */
  move?: string;
  /** Press it once the hand arrives. */
  click?: boolean;
  /** Linger after arriving, ms. */
  hold?: number;
  /** Roll a surface. A number is a fraction of its height; a string is a heading to bring into view. */
  roll?: { of: Surface; to: number | string; ms?: number };
  /** Something the stage does that a selector cannot say. */
  cue?: Cue;
}

/** What has to be on screen for a part to make sense. */
export type Needs = 'call' | 'share' | 'cv' | 'panel';

/**
 * What a part says when the visitor bolts out of it in under three seconds.
 *
 * Nam, on the Wasabi section: "Pap pap pap.. 7 years of my life is only worth 3s
 * of your time? Come back! Then we scroll up to the top of the page. Then we go
 * Just kidding and scroll back to the place it was triggered."
 *
 * `rewind` is that gag: the document goes back to the top, the tour admits it
 * was joking, and the document returns to EXACTLY where the visitor had got to.
 * Remembering the position rather than guessing at it is the whole trick — a gag
 * that loses your place is not a gag, it is a bug with a punchline.
 */
export interface Bail {
  /** Which line of the part is being protected. */
  at: number;
  lines: Line[];
  rewind?: boolean;
}

export interface Part {
  id: string;
  label: string;
  /** Lower plays earlier, and is also the order things get cut in. */
  priority: number;
  needs?: Needs;
  /** A jump may land on a 'clean' part without feeling like a cut. */
  entry: 'clean' | 'mid';
  lines: Line[];
  beats?: Beat[];
  /** Said instead of `lines` when the visitor opened this themselves. */
  commentary: Line[];
  /** The shortest honest version, for when the queue is long. */
  brief: Line[];
  /** Clicking any of these is what "the visitor opened this part" means. */
  triggers?: string[];
  bail?: Bail;
}

const L = (text: string, ms: number): Line => ({ text, ms });

// ---------------------------------------------------------------------------
// THE PRIMARY FLOW
// ---------------------------------------------------------------------------

export const parts: Part[] = [
  {
    id: 'intro',
    label: 'Hello, and the share',
    priority: 1,
    needs: 'call',
    entry: 'clean',
    /*
     * N30. The old opening explained the format — "a working rebuild of the Meet
     * web client" — which is the least interesting true thing about this page.
     * This one says hello, hands over a goal, and moves.
     *
     * The achievement count is asserted against the quest list in the test suite,
     * so the line cannot quietly become a lie when a quest is added.
     */
    /*
     * N45. The first two lines are the caption loop's, verbatim, because the
     * loop opened better than the script did. "Thank you for joining me here"
     * was a host greeting a guest; "I know a CV that opens a call is a bit much"
     * is a person acknowledging the room, which is the only way the rest of this
     * earns a hearing.
     *
     * "Let me walk you through my world" went with the word tour. Nobody says
     * that in a call.
     */
    /*
     * THE FIRST LINE CARRIES NOTHING ON PURPOSE. Nam: "I think we should add one
     * more simple line of script with lowbearing just to warm user up: Hello!
     * Welcome! This is like the easy lines that give user time to take in this
     * new environment - the meeting view. Basically we give them some time to
     * take a look around, all while showing them that we will be talking to them,
     * and more talking is coming."
     *
     * Which is a real function rather than filler. The visitor has just arrived in
     * a room that is pretending to be a video call, and the line after this one is
     * an argument. Two seconds of nothing to follow lets them look at the room and
     * learn that captions are how this page talks, before either matters.
     */
    lines: [
      L('Hello! Welcome!', 1900),
      L('Thanks for joining. I know a CV that opens a call is a bit much.', 3600),
      L("So let me be quick about why I'm in your applicant pool.", 3000),
      L('While I talk, click around if you want. Lots of bugs here ;)', 4200),
      L('First, let me get my screen up.', 2400),
    ],
    beats: [
      // The share is PERFORMED, not switched on: the hand goes to the button,
      // opens the real picker, picks Entire Screen, picks Screen 1, presses
      // Share. Every step is a step a person would take. See N29.
      //
      // AT 4, NOT 3, and the index moved because a line was added above it. A
      // beat is pinned to a line by position, so inserting anything before it
      // silently retargets every beat after -- the share would have been
      // performed under "let me be quick about why I'm in your applicant pool".
      { at: 4, cue: 'share' },
    ],
    commentary: [L('Starting from the top, then.', 2000)],
    brief: [L("I'm Nam. Let me get my screen up.", 2400)],
  },

  {
    id: 'cv',
    label: 'The CV',
    priority: 2,
    needs: 'cv',
    entry: 'clean',
    /*
     * N31. Nam's own words, near enough verbatim, with the timings authored so
     * the Claude line gets its pause and the tonkotsu line does not.
     *
     * Every line is anchored to a section of the document rather than to a
     * stopwatch: the hand rolls the page and the arriving section is what speaks.
     * Scroll past a section yourself and its short version plays instead; scroll
     * past it having already heard it and nothing plays at all.
     */
    /*
     * N45. Four of the caption loop's lines land here, which is why this part
     * grew from seven lines to nine.
     *
     * The two about the current job are the reason the merge was worth doing at
     * all. "Four players, four networks, one shared board" is the closest either
     * script came to naming what this job is — a video call is four clients on
     * four networks agreeing about one surface — and it was sitting in a loop
     * that only ever played when nobody was being talked to. The platform line
     * beside it is the three migrations, which the document has and the script
     * used to walk straight past.
     *
     * The loop's own "seven years leading the front end of a real-time
     * multiplayer client" is gone: it was this part's second line with the
     * product's name removed, and the name is the better half.
     *
     * The research line is the loop's, with the award swapped for the book
     * chapter on Nam's instruction. Both are in the CV. The chapter is the less
     * familiar claim, which makes it the harder one to have made up.
     */
    lines: [
      L('This is the CV.', 1800),
      L('Seven years leading front end for an online Mahjong client.', 4000),
      L('Four players, one shared board, no excuses about latency.', 4200),
      L('Desktop, then Dart, then Unity and finally Native React.', 4200),
      L('Working cross-team with everyone: design, backend, marketing, QA.', 4400),
      L('Before that, four years of optimisation research. Two papers and a book chapter.', 4800),
      L('And before that, C++ on signing hardware. Correctness was the product.', 4400),
      L('Here are my tech skills.', 2000),
      /*
       * THE HESITATION IS AUTHORED, which is the whole of what N53 asked for.
       * The word is in the line because Nam put it there, and the caption's
       * tokeniser holds on it the way it holds on a full stop. Nothing derives
       * the placement, so nothing can put it in front of a punchline again.
       */
      L('Claude made this whole section, uh, redundant. LOL.', 4400),
      L('Education: Vietnam, Japan, Sweden.', 2600),
      /* N111. Was a line about tonkotsu and three countries, which answered a
         question nobody asked. Nam: "This line sucks!" */
      L('What I think of Sweden? Just like Japan, but in black and white.', 4400),
    ],
    beats: [
      // N78. The document is laid out for a full screen and arrives inside a
      // window inside a screen share, so it opens one notch out. The spec, which
      // is wider still, takes two.
      { at: 0, cue: 'zoom:1' },
      { at: 0, roll: { of: 'cv', to: 0, ms: 500 } },
      { at: 1, roll: { of: 'cv', to: 'Experience', ms: 1400 } },
      { at: 5, roll: { of: 'cv', to: 0.42, ms: 1600 } },
      { at: 6, roll: { of: 'cv', to: 0.55, ms: 1400 } },
      { at: 7, roll: { of: 'cv', to: 'Skills', ms: 1500 } },
      { at: 9, roll: { of: 'cv', to: 'Education', ms: 1400 } },
    ],
    /*
     * N35, armed on line 1 — the Wasabi years. Three seconds is Nam's number and
     * it is the right one: long enough to read a job title, too short to have
     * read anything under it.
     */
    bail: {
      at: 1,
      rewind: true,
      lines: [
        L('Pap pap pap. Seven years of my life, and it gets three seconds of yours?', 3600),
        L('Come back here.', 1600),
        L('…Just kidding. Carry on.', 2200),
      ],
    },
    commentary: [
      L('The CV, yes. One data module renders this and the call, so they cannot disagree.', 4200),
    ],
    brief: [L('The CV. Seven years on a real-time client, and the research before it.', 3200)],
    triggers: ['[data-icon="cv"]', '.cb-tab[data-tab-id="cv"]'],
  },

  {
    id: 'jobreq',
    label: 'Against the job requirement',
    priority: 3,
    needs: 'share',
    entry: 'clean',
    /*
     * N40. Nam: "Oh damn I completely forgot the part against the job
     * requirement!" It is the single most load-bearing screen for the person
     * actually reading this and it was not in the script at all.
     *
     * It bridges straight off the CV with no seam, which is why the first line
     * is a question rather than an introduction.
     */
    lines: [
      L('Great. So how does all that score against the job requirement?', 3600),
      L("I've got you covered.", 1800),
      L('Degree ✅. Five years of software development ✅.', 3600),
      L('Front end, algorithm, architecture, QA: ✅ ✅ ✅ ✅.', 4000),
      /* N113. "I ran out of requirements before I ran out of evidence." sat here
         and Nam cut it: "horrible line! Lets just remove it, next line is already
         the punch." A setup arriving after the setup weakens the joke it sets up.
         The last roll moved down onto the punch with it, so the page still
         reaches the bottom of the posting as he lands it. */
      L("Yeah. I'm a safe hire.", 2600),
    ],
    beats: [
      { at: 1, cue: 'tab:jobad' },
      { at: 2, roll: { of: 'page', to: 0.25, ms: 1500 } },
      { at: 3, roll: { of: 'page', to: 0.6, ms: 1800 } },
      { at: 4, roll: { of: 'page', to: 1, ms: 1800 } },
    ],
    commentary: [L('The posting, line by line. Every requirement has something here you can click on.', 4200)],
    brief: [L('Every requirement in the posting, with the evidence next to it.', 3200)],
    triggers: ['.cb-tab[data-tab-id="jobad"]'],
  },

  {
    id: 'built',
    label: 'How this was built',
    priority: 4,
    needs: 'share',
    entry: 'clean',
    /*
     * N36. The tab is the real document — the same one the home screen opens —
     * rather than a second drawing of it. Two copies of one page is how they
     * start disagreeing, and this pair already had.
     */
    lines: [
      L('Now let me show you how this was built.', 2800),
      L('No framework. No runtime dependency. One stylesheet and a reducer.', 4400),
      L('The interface was measured off the real product, not eyeballed.', 3800),
      /* The number, not a gesture at one. It is BUDGET in build.mjs, and the
         build genuinely refuses to finish above it. */
      L('Fifty kilobytes gzipped on first load, and the build fails if it goes over.', 4400),
      /* N45's "go and break the tests" line is gone. The tests already have a
         quip, a panel and a switch that breaks them; a fourth pitch for one
         feature is the section selling instead of showing. */
      L("A CV gamified to the moon, cause who doesn't like games?", 4000),
      L("One person and an agent, one week. The most fun I've had in months!", 4600),
    ],
    beats: [
      { at: 0, cue: 'tab:built' },
      // The spec is a wide document and the shared screen is not. It fits at
      // 80 per cent, so the hand ctrl-wheels it there before talking about it.
      { at: 1, cue: 'zoom:2' },
      { at: 2, roll: { of: 'page', to: 0.35, ms: 1600 } },
      { at: 3, roll: { of: 'page', to: 0.6, ms: 1400 } },
      { at: 4, roll: { of: 'page', to: 0.8, ms: 1400 } },
      { at: 5, roll: { of: 'page', to: 1, ms: 1400 } },
    ],
    commentary: [L('The build: no dependencies, measured rather than eyeballed, budget enforced in CI.', 4400)],
    brief: [L('No framework, no dependencies, measured off the real product.', 3000)],
    triggers: ['.cb-tab[data-tab-id="built"]'],
  },

  {
    id: 'offclock',
    label: 'Off the clock',
    priority: 5,
    entry: 'clean',
    /*
     * N41. Which clips the visitor has already found is remembered, so this act
     * plays the REST of them rather than starting over. Someone who has hunted
     * half the calendar should not be shown their own discoveries.
     */
    lines: [
      L("And here's how I have fun after work.", 3600),
      L('These are hidden in the calendar on the home screen. You found some of them.', 4200),
      L("Here are the ones you didn't.", 2400),
      /* N115. Was "Hope you've enjoyed this too!", which asks the visitor to
         report back on a feeling. An invitation does not. */
      L("So yeah, I'm not bad at having fun. Come join my party 🎉", 4400),
    ],
    beats: [
      /* N114. Explorer opens on the FIRST line rather than the third. Nam: "its
         weird that nothing happens after that, so lets go Explorer to Hobby after
         that line, So then at least user knows we are gonna show them some
         videos." Three lines of talking with a still screen is a dead start, and
         the folder full of clips is its own announcement. */
      { at: 0, cue: 'files' },
      { at: 2, cue: 'eggs' },
    ],
    commentary: [L('Stand-up, short films, and a zombie walk that made the local news.', 3800)],
    brief: [L('Stand-up, acting, a zombie walk on SVT. All in the calendar.', 2800)],
    triggers: ['[data-tab="offclock"]'],
  },

  {
    id: 'close',
    label: 'The close',
    priority: 6,
    entry: 'clean',
    /*
     * N42. Nam: "VERY IMPORTANT! Signal to them that this is the end of the tour,
     * they are free to explore the rest, thank them for their time."
     *
     * A demo that just stops talking leaves the visitor waiting for the next line
     * instead of exploring, which is the opposite of what the whole thing is for.
     * So it says, in words, that it is over — and the hand leaves the screen,
     * which says the same thing again without a caption.
     */
    lines: [
      /*
       * QA: this said "And that's the whole pitch", and so does the LAST LINE OF
       * THE PERSONAL SEGMENT ("That's the whole pitch. Thanks for listening to
       * it."), which plays about a hundred seconds later. Hearing the same
       * sentence twice makes the second one sound like a loop rather than an
       * ending -- which is the exact failure the caption loop used to cause.
       */
      L("And that's everything I came here to show you. The rest is yours.", 3800),
      /*
       * N64. This used to be one line naming three things and doing none of
       * them: "Open the panels, drag the windows, run the tests." Nam: "Each of
       * these action, we demo it with the mouse."
       *
       * So it is four lines, and three of them are beats. It is the one place in
       * the script where saying and showing had come apart, which matters more
       * here than anywhere else because the sentence's whole claim is that the
       * page does what it says.
       */
      L('Everything on screen is real and nothing here breaks.', 3000),
      /* N116. These three each perform something, and at 2200ms apart they
         arrived on top of each other. Nam: "I need a longer pause between them,
         cause right now its a bit overwhelmed" -- and he is watching them over a
         clip that is still playing, so the call is already busy. The extra second
         each is the pause, since a line's dwell IS the gap before the next one. */
      L('Open the chat.', 3400),
      /*
       * N79. This was "Drag the video." and it dragged the wrong thing: the beat
       * measured the tile as the beat began, and the line before it had just
       * opened the chat, which narrows the stage and moves the tile. Nam: "it was
       * dragging the old position of the video tile ... overall dragging is hard
       * to demo, lets change that ... we could do send a heart."
       *
       * A press on a control cannot have that defect, because the hand resolves
       * the selector at beat time rather than carrying a rectangle across a
       * layout change. Which is the argument for preferring selectors over
       * coordinates everywhere in this script.
       */
      L('Send a heart.', 3600),
      /*
       * "Raise your hand." USED TO BE HERE, and it was a spoiler -- N157.
       *
       * Nam: "lets remove raise your hand, since it spoils the surprise. Lets
       * trust the system and let user discover it."
       *
       * Raising the hand is a side quest AND one of the twelve bugs, and the
       * script performing it hands both over on the visitor's behalf. That is
       * the same argument N63 settled for everything a person can find for
       * themselves: the conversation may show you the room, and the things
       * hidden in the room are yours to find. The two lines that survive here
       * demonstrate controls that award nothing.
       */
      L('The CV is also available in home screen and after this meeting.', 4400),
      L('Thank you for your time. Genuinely.', 3000),
    ],
    /*
     * N157. Both of these now PUT BACK what they take out. The close is the last
     * thing the script does, so whatever it leaves open is the state the visitor
     * is abandoned in -- a chat drawer narrowing the stage, or a reaction tray
     * holding the caption band 52px up -- with nobody left talking to explain
     * why. See showChat and sendHeart in tour/stage.ts for the half that matters
     * more: each closes only what it opened, so a panel the VISITOR opened is
     * left exactly where they left it.
     */
    beats: [
      { at: 2, cue: 'chat' },
      { at: 3, cue: 'heart' },
      { at: 5, cue: 'park' },
    ],
    commentary: [L('The CV is in the home screen too, and on the way out. There is a PDF beside it.', 4200)],
    brief: [L("That's me. The CV is in the home screen too. Thanks for the time.", 3400)],
  },
];

// ---------------------------------------------------------------------------
// THE PERSONAL STORY — board ticket N38
// ---------------------------------------------------------------------------

/**
 * The questions a hiring manager is actually holding while they read a CV, and
 * what this one says back.
 *
 * Nam: "This will answer the core questions that a hiring manager would have,
 * why you apply, what do you like about the job, your strength and weaknesses
 * etc. Give me a list of these questions so I can match them in the script."
 *
 * Here is that list. They are the questions that survive across every interview
 * loop, in the order they usually get asked — and each one is paired with the
 * lines that answer it, so a change to an answer cannot drift away from the
 * question it was written for.
 *
 * Runs ONLY after the flow has covered everything demonstrable, and only after
 * real downtime rather than a pause. Once it starts it is uninterruptible except
 * by Stop: it is the one segment where being talked over would cost the point.
 */
export interface Chapter {
  /**
   * Stable across reorderings and rewordings, because it is what gets written
   * down when somebody hears the answer (N110). An index would renumber the
   * moment a question moves; the question text itself is edited every other week.
   */
  id: string;
  /** The question, as a hiring manager would ask it. */
  q: string;
  lines: Line[];
}

/**
 * HOW THE SEGMENT OPENS, AND HOW IT COMES BACK — board ticket N110.
 *
 * It used to open on one line buried inside the first answer: "Since you're
 * still here, here's what a CV never answers..." Two problems with that. It ran
 * straight on from the goodbye with no gap, so the surprise of him starting
 * again was spent before it landed; and it was part of an answer, so a visitor
 * who left and came back heard it as the opening of a monologue they had already
 * started.
 *
 * Nam: "Break this into two lines with a little pause. Still here? (pause). Next
 * line: Since you're still interested, here's what the CV never answers."
 *
 * The third variant is the one that makes the whole thing feel like it is paying
 * attention. Somebody who has heard every answer gets the same two openers, so
 * they brace for the full set, and then he lets them off.
 */
export const opener = {
  /** Said alone, with the silence after it doing the work. */
  stillHere: L('Still here?', 2600),
  /** For anyone with answers left to hear. */
  more: L("Since you're still interested, here's what the CV never answers.", 4200),
  /** For anyone who has heard them all. The "if" is doing the teasing. */
  again: L("If you're still interested, here's what the CV never answers.", 4200),
  allHeard: [
    L("Well, I've already told you everything.", 3000),
    L('Call me, I have more fun stuff to tell you!', 3400),
    L('Good luck bug hunting!', 2800),
  ],
};

/** Picking up where they left off, by number and by name. */
export const resumeAt = (n: number, q: string): Line =>
  L(`Where were we again? Oh, question ${n}. ${q}`, 4400);

/** The question, asked before it is answered. */
export const askQuestion = (n: number, q: string): Line => L(`${n}. ${q}`, 3600);

export const story: Chapter[] = [
  {
    id: 'why-now',
    q: 'Why are you applying for this, and why now?',
    lines: [
      L("I've spent seven years making one product better for the same players. I know that job very well now.", 5000),
      L('I want the version of it where the constraints are harder and the people around me are better than me.', 4800),
    ],
  },
  {
    id: 'what-i-like',
    q: 'What do you actually like about this kind of work?',
    lines: [
      L('What I like is to correctly guess user intention. I apply that in my daily life too!', 5000),
      /*
       * The only company-specific sentence in the whole script, which is why
       * Line carries an `alt`. Nam: "This part touches google and should be
       * guarded on the company code." With N66 the guard almost never fires,
       * and it still has to exist: the neutral build is one parameter away and
       * a sentence naming an employer nobody applied to is worse than no
       * sentence at all.
       */
      {
        text: 'Plus I love the beauty and efficiency in the simplicity. I found a lot of that at Google.',
        ms: 5200,
        alt: 'Plus I love the beauty and efficiency in the simplicity. It is rarer than it should be.',
      },
    ],
  },
  {
    id: 'strongest',
    q: 'What are you strongest at?',
    lines: [
      L("What's my strength? Going the extra miles. And having fun with it! This CV speaks for itself.", 5600),
      L('I learn fast and deliver. We downsized after a pivot, and I quadrupled my own output with AI.', 5400),
    ],
  },
  {
    id: 'weakness',
    q: 'What are your weaknesses, honestly?',
    lines: [
      L('Weakness? I easily get carried away. You know, flow state. I try to aim it at the right priority.', 5400),
      L('For example, I could make a fun CV in one evening. It has been a week.', 4400),
      L("The other one: I am funnier in writing than in a first meeting. Let's hope you never notice.", 4600),
    ],
  },
  {
    id: 'with-people',
    q: 'How do you work with other people?',
    lines: [
      L('How I work with others? I listen first, get all the constraints, then propose the best solution I can find.', 5600),
      L('I also write it down before we discuss. Most disagreements turn out to be about different constraints.', 5200),
    ],
  },
  {
    id: 'when-wrong',
    q: 'What happens when you are wrong?',
    lines: [
      L("What if I'm wrong? I record it, and I never make the same mistake twice.", 4400),
      L('And I chase it the extra mile. A technical mistake is fine. An interpretation mistake means the team was misaligned.', 6000),
    ],
  },
  {
    id: 'hardest',
    q: 'What is the hardest thing you have shipped?',
    lines: [
      L("The hardest thing I've shipped? Pivoting from Unity to React in two weeks. I was in the zone.", 5200),
      L('So the hardest part was not technical. It was the deadline, and I set it myself. I could have taken three months.', 5800),
    ],
  },
  {
    id: 'why-me',
    q: 'Why you?',
    lines: [
      /*
       * Was "Why should we take the risk?". Nam: "I dont understand this
       * question. What risk is there in hiring me LOL. Lets use this to spin it
       * in a more positive light." He is right that it was a defensive frame
       * borrowed from a conversation nobody in this one is having.
       */
      L('Last one. Why me? Because I chase beauty and efficiency, which is exactly what you build for.', 5200),
      L("Let's have fun doing it together. Thanks for listening!", 3400),
    ],
  },
];

// ---------------------------------------------------------------------------
// THE COMMENTARY — board tickets N34 and N37
// ---------------------------------------------------------------------------

/**
 * Throwaway lines. One shot each, never queued, never cycled back.
 *
 * Nam, on the shared desktop: "nothing to introduce here, its self explanatory.
 * This is more a commentary when player gets curious and clicking around... Yeah
 * you can do that! ... Or some playful banter regarding the fact that this is a
 * mocked OS. Sorry, no wifi. Stuff like that." And on the panels: "Accessibility
 * and tests are not in the main flow, only triggered when user actually navigate
 * to these in the right panel. These are only in commentary mode."
 *
 * `on` is either a CSS selector the visitor can click, or `desk:<what>` for the
 * things the desktop reports directly — a drag is not a click on anything and
 * cannot be expressed as one.
 */
export interface Quip {
  id: string;
  /**
   * How it is set off. A `click` quip carries a CSS selector; an `event` quip
   * carries a `<source>:<what>` key the app announces.
   *
   * Both exist because both are real. Opening the Accessibility tab is a click
   * on something; dragging a window is not a click on anything, and neither is
   * a panel that was opened by a keyboard shortcut. Making the distinction a
   * field rather than a naming convention means the script editor can show it,
   * and means a selector containing a colon can never be mistaken for an event.
   */
  kind: 'click' | 'event';
  on: string;
  text: string;
  ms: number;
  /** Which surface it belongs to. For the script editor, and for nothing else. */
  group: 'desktop' | 'browser' | 'panel' | 'call';
}

/**
 * An event key is `<source>:<what>` and nothing else. A selector may contain a
 * colon too -- `.dk-tray-btn:not(.dk-clock)` does -- so the shape has to be
 * exact rather than merely suggestive. The test suite asserts both directions,
 * because getting this wrong makes a quip that can never fire and says nothing
 * about it.
 */
const EVENT_KEY = /^[a-z]+:[a-z]+$/;

const Q = (
  id: string, group: Quip['group'], on: string, text: string, ms: number,
): Quip => ({ id, group, kind: EVENT_KEY.test(on) ? 'event' : 'click', on, text, ms });

/**
 * COMMENTARY, AND WHY THERE IS SO MUCH LESS OF IT — board ticket N118.
 *
 * Twenty-nine of these, cut to twelve. Nam: "I think we have too many of them
 * now. Some very basic stuff shouldnt call for acknowledgement, cause everybody
 * knows it, no point in rewarding something so basic ... Save it for the more
 * niche and harder to find interactions. Those are what worth rewarding."
 *
 * Which is the right test, and it got sharper once these started counting toward
 * a completion percentage: a line that fires for dragging a window is not a
 * discovery, it is a receipt for using a computer. Seventeen went, and they were
 * all the same kind of thing -- dragging, minimising, closing, resizing, opening
 * a folder, clicking a tab, opening the four main panels, pressing the four main
 * call controls. Every one of those is the first thing anybody does.
 *
 * What is left is what you have to go looking for: the snap layouts behind the
 * maximise button, the taskbar clock, the tray that admits it has no wifi, Start,
 * task view, the hover previews, the address bar, and the five Engineering tabs
 * that live two panels deep.
 *
 * The camera and mic lines went with the rest, and they were the closest call:
 * both made a trust point rather than a joke. But both points are made where
 * they belong anyway, in the quest hints and in the pre-join chips, and a control
 * bar is the most basic surface in the product.
 */
export const quips: Quip[] = [
  /* --- the shared desktop ------------------------------------------------ */
  Q('desk-snap', 'desktop', 'desk:snap', 'Snap layouts. I call this one Chrominion.', 2600),
  Q('desk-clock', 'desktop', '.dk-clock', 'That clock is the only honest thing on this desktop.', 3000),
  Q('desk-tray', 'desktop', '.dk-tray-btn:not(.dk-clock)', "Sorry, no wifi. That's a picture of wifi.", 2800),
  Q('desk-start', 'desktop', '.dk-start', 'There is a Start menu. There is even a shutdown, and it shuts something down.', 3600),
  Q('desk-tv', 'desktop', '.dk-tv-btn', 'Task view. Alt-Tab belongs to your real computer, not to mine.', 3400),
  Q('desk-peek', 'desktop', '.dk-peek-card', 'Those previews are the windows themselves, scaled. They cannot go stale.', 3600),

  /* --- the emulated browser ---------------------------------------------- */
  Q('cb-omni', 'browser', '.cb-omni-in', 'You can type a real URL in there. It will actually go.', 3000),

  /* --- the call's own panels --------------------------------------------- */
  Q('p-a11y', 'panel', '[data-tab="a11y"]', 'Accessibility, audited live. That panel runs the audit against this page while you watch.', 4400),
  Q('p-tests', 'panel', '[data-tab="tests"]', "Same suite the CI runs. There's a switch that breaks them on purpose, if you want to see red.", 4400),
  Q('p-perf', 'panel', '[data-tab="perf"]', 'Real numbers, off this page, not a benchmark I chose.', 3000),
  Q('p-net', 'panel', '[data-tab="net"]', 'Push that to Hotel wifi. That is the setting I actually design for.', 3400),
  Q('p-spec', 'panel', '[data-tab="spec"]', 'Every measurement, including the one that turned out to be wrong.', 3400),

  /* --- the call itself ---------------------------------------------------- */
];

// ---------------------------------------------------------------------------
// THE ACKNOWLEDGEMENTS — board ticket N32
// ---------------------------------------------------------------------------

/**
 * What the tour says when it notices how you are behaving.
 *
 * Nam: "The higher they score, the more escalated our acknowledgements would be
 * ... We can have a bunch of these and cycle through them. Ideally a big list."
 *
 * Grouped by the restlessness tier that unlocks them. profile.acknowledge()
 * never returns the same one twice in a run, and falls UP the tiers when it runs
 * out rather than down — running out of teasing lines does not mean the visitor
 * has become patient again.
 */
export interface Ack { id: string; tier: Tier; text: string; ms: number }

const A = (id: string, tier: Tier, text: string, ms: number): Ack => ({ id, tier, text, ms });

export const acks: Ack[] = [
  /* settled — they are reading. Say almost nothing. */
  A('s1', 'settled', "Take your time. It's all there.", 2400),
  A('s2', 'settled', "You're actually reading it. That's rarer than you'd think.", 3400),
  A('s3', 'settled', 'Good. That section is the one I would have picked too.', 3200),

  /* browsing — moving, but with intent. */
  A('b1', 'browsing', "Wow, you're a fast reader.", 2200),
  A('b2', 'browsing', 'Right, you have the gist.', 2000),
  A('b3', 'browsing', 'Skimming. Respectable.', 2000),
  A('b4', 'browsing', 'Ah, you know what you are looking for.', 2600),
  A('b5', 'browsing', "Fine, I'll keep up.", 2000),

  /* skimming — faster than the script. */
  A('k1', 'skimming', 'CV? Yeah, yeah. You want more, I see.', 3000),
  A('k2', 'skimming', "Okay, you're hunting for something specific. Keep going, it is in here.", 4000),
  A('k3', 'skimming', "I'll talk faster.", 1800),
  A('k4', 'skimming', 'You are moving faster than I can talk. Which is a compliment, I think.', 3800),
  A('k5', 'skimming', 'Every one of these has something behind it, for the record.', 3400),

  /* bolting — they have taken the wheel and floored it. */
  A('x1', 'bolting', 'Pap pap pap. Seven years of my life, and it gets three seconds of yours?', 3800),
  A('x2', 'bolting', "Alright. You win. You drive.", 2400),
  A('x3', 'bolting', 'I am going to stop narrating and let you get on with it.', 3200),
  A('x4', 'bolting', "You've clearly done this before. I'll shut up.", 3000),
];

/**
 * What the director says when it changes register, kept here so the script
 * editor can show them alongside the parts they interrupt.
 */
export const asides = {
  /** Queue is getting long: said once, then never again. */
  shorten: L('Lots to look at. I will keep these short.', 2800),
  /** Queue is too long: the tour hands over and stops. */
  handOver: L(
    'You clearly know your way around. I will get out of the way. Everything is where you would expect, '
    + 'and the plain document is in the top left. Thanks for the time.',
    6000,
  ),
  /**
   * The visitor pressed Stop.
   *
   * It is an acknowledgement, not a sign-off, because Stop is no longer the end
   * of anything: he goes quiet, turns the captions off himself, and waits. See
   * the pause note in src/tour/stage.ts.
   */
  stopped: L('I hear you. The rest is yours to discover now.', 3200),
  /** The visitor turned the captions back on, which is how they ask him back. */
  missed: L('Oh, you missed me. Where were we again?', 3000),
  /** The visitor went quiet mid-conversation and the script takes the wheel back. */
  resume: L('Still here? I will carry on then.', 2600),
};

/**
 * Picking the thread back up, by name.
 *
 * A function rather than a line, because the only thing worth saying here is
 * WHICH segment we were in, and the segment is not known until it happens. "Oh,
 * you missed me. Where were we again?" followed by silence would be a worse
 * resumption than no line at all.
 */
export const backTo = (label: string): Line => L(`Right. ${label}.`, 2400);

// ---------------------------------------------------------------------------
// AFTER THE GOODBYE — board ticket N49
// ---------------------------------------------------------------------------

/**
 * What he says when you do not leave.
 *
 * Nam: "we should have some post end banter, like why are you still here? ...
 * There is nothing more to see here. I swear. some more stuff like this, spacing
 * out more and more, but no longer than 2min."
 *
 * TWO NUMBERS A LINE, AND THE SECOND ONE IS THE WHOLE JOKE.
 *
 * The first version had one: the line's dwell, growing 6s to 26s. It read
 * completely wrong, and Nam caught exactly why: "the post end scripts all of the
 * sudden have very long time out cause its waiting for the next line - this gives
 * away that there are more! We dont spoil it like that."
 *
 * He is right. A caption bubble sitting on screen with a ring slowly filling is
 * the app saying "something else is coming" — so a twenty-six second dwell
 * announces the punchline it is about to deliver. The surprise was being spent
 * before the joke arrived.
 *
 * So `ms` is now how long the bubble is UP, at ordinary reading speed like every
 * other line, and `gap` is the silence AFTER IT DISAPPEARS. The strip goes away
 * entirely, the call looks finished, and then he speaks again. Nam: "The feeling
 * here is that user genuinely think its all done, then we continue talking,
 * that's the surprise."
 *
 * The gaps still grow, which is still the joke — somebody who has run out and
 * keeps thinking of one more thing. It is just that the growing part is now
 * silence rather than a visible countdown.
 *
 * Two rules the test suite holds:
 *
 *   · the gaps only ever grow, because a gap that shrinks reads as a new section
 *     starting rather than a conversation winding down;
 *   · display plus silence fits inside two minutes even at the slowest pace,
 *     because the visitor cannot see how much is left.
 *
 * Abandoned by any input at all. Someone who starts clicking has answered the
 * question in the first line, and the achievement for sitting through it is only
 * worth having because leaving is this easy.
 */
/*
 * FOUR MINUTES, up from two, and board ticket N67 is the reason.
 *
 * Nam: "we may want to increase the silent time between messages after the
 * goodbye ... This is the time user is exploring the app, we want to keep the
 * caption on for the commentary messages. Plus, the timing of the call has
 * already finished by the goodbye, so stretching out the after goodbye doesnt
 * cost user anything literally."
 *
 * He is right about the cost, and it is worth being precise about why the cap
 * existed at all. It was never a budget: it is a promise about the WORST CASE
 * for somebody who cannot see how much is left. Any input at all abandons the
 * outro, the interview clock stopped at the goodbye, and nothing downstream
 * waits on it. So the number that matters is "how long could a person sit here
 * being talked at against their will", and four minutes of mostly silence, with
 * an exit on every keypress, is still an honest answer.
 */
export const OUTRO_CAP_MS = 240_000;

/**
 * WHERE THE SILENCES GO, and nothing else.
 *
 * The gaps used to belong to individual lines, which was fine while the outro
 * was a fixed script. It is not one any more (see `banter` below), so the
 * growing pause is a property of the SLOT rather than of whatever is said in
 * it. That is also the truer model: the joke is somebody running out of things
 * to say and thinking of one more anyway, and the shape of that is in the
 * timing, not in the words.
 *
 * Seven slots. The first is the opener, the fifth counts what is left, the last
 * is the goodbye, and the other four are drawn from the pool.
 */
export const OUTRO_GAPS = [6000, 11_000, 17_000, 24_000, 32_000, 41_000, 0];

/** Which slot asks how much is left to find. */
export const OUTRO_COUNT_SLOT = 4;

/** Always first. The question the whole segment is about. */
export const outroOpen = L('Still here?', 2600);

/**
 * Always last, and the only line with no silence after it: the captions go off
 * instead, which is the only way to say "I have actually stopped now" without
 * saying it a seventh time.
 */
export const outroClose = L('Alright. Genuinely, thank you for your time. Good luck with the rest of the pile. 👋', 4800);

/**
 * The tease, which counts.
 *
 * `{left}` is filled in when the line is spoken, from what THIS visitor has
 * found: the clips still in the calendar and the bugs still in the build.
 */
export const outroTease = L('…okay. There are still {left} out there. That is all I am saying.', 4000);

/**
 * And what it says instead when there is nothing left.
 *
 * Nam: "when everything is found, we should acknowledge it." The first version
 * simply dropped the line, which was the safe answer and the wrong one: a
 * visitor who has cleared the calendar AND the drawer has done the single
 * hardest thing here, and the response to that cannot be silence.
 */
export const outroAllFound = L('You have found everything. Literally nothing left to do!', 4000);

/**
 * THE POST-CREDITS POOL, and the reason it is a pool.
 *
 * Nam: "we need more of these, cause these are banters and they shouldnt repeat
 * so much. The script during the interview, yes, that is a script we dont need
 * to make it replayable. But the post credit should be playful and much less
 * repetitive. Now that we introduce a layer of replayability with the bugs, we
 * need to find a way to make the post credit more fun."
 *
 * That is the whole argument and it turns on the bugs. Before them, nobody came
 * back: one visit, one script, and a fixed outro was exactly right. The drawer
 * gives a reason to return, and the moment a second visit is expected, a line
 * that was funny once becomes a line the app is repeating at you.
 *
 * So the interview stays a script and only this part is drawn. Four are used a
 * run and which four is remembered across visits, so five visits pass before
 * anybody sees a repeat, and the repeats start with the ones they saw first.
 *
 * Every line has to survive being the ONLY thing on screen with no context,
 * which is what rules out callbacks to whatever was said a minute ago.
 */
export interface Banter extends Line { id: string }

const B = (id: string, text: string, ms: number): Banter => ({ id, text, ms });

export const banter: Banter[] = [
  B('b1', 'The call does not actually end, by the way. Sit as long as you like.', 4200),
  B('b2', 'Questions? My email is on the way out. Or the referral note, if you know somebody. 🙏', 4600),
  B('b3', 'There is nothing more to see here. I swear.', 3400),
  B('b4', 'You are unusually patient. That is a promising sign for a code review.', 4400),
  B('b5', 'I did not write a line for this part. You are in the improvised bit.', 4000),
  B('b6', 'Somewhere there is a recruiter with two hundred PDFs open. Spare a thought.', 4400),
  B('b7', 'The clock on that desktop is real, incidentally. It is the only thing here that is.', 4600),
  B('b8', 'I could tell you about the stylesheet. I can see that you would rather I did not.', 4600),
  B('b9', 'Most people have closed the tab by now. I am not most people either.', 4200),
  B('b10', 'If you are reading this on a phone, I am genuinely sorry about the desktop.', 4400),
  B('b11', 'There is a test suite in here you can break on purpose. I am just saying.', 4400),
  B('b12', 'Nobody has sat through this bit before. You are setting a record nobody will verify.', 4800),
  B('b13', 'I keep thinking of one more thing. That is the weakness answer, live.', 4200),
  B('b14', 'This is the part of a call where somebody says "well, unless there is anything else".', 4800),
  B('b15', 'Somewhere in here a beetle is sitting on a control you have not pressed twice.', 4600),
  B('b16', 'You know you can drag the windows around? Sorry. That was the last one.', 4400),
  B('b17', 'I am told the correct move now is to stop talking. Noted.', 3600),
  B('b18', 'The red button is right there and I am still going. Read into that what you like.', 4600),
  B('b19', 'Every number on this page came off a real measurement. Even the wrong one.', 4400),
  B('b20', 'I am going to sit here quietly now and let you get on with it.', 4000),
];

/** Slots filled from the pool, which is every slot but the three fixed ones. */
export const BANTER_SLOTS = OUTRO_GAPS.length - 3;

// ---------------------------------------------------------------------------
// THE CLOCK — board ticket N46
// ---------------------------------------------------------------------------

/**
 * Every line of the flow, with the second it is due.
 *
 * Nam: "timestamp when the text is shown ... This is so that we have some kind
 * of bench mark of how long the conversation is."
 *
 * DERIVED, NOT AUTHORED, and that is the whole design. An authored `at` sitting
 * beside an authored `ms` is two ways to say one thing, and they drift the first
 * time a line's dwell is tuned without its neighbours being renumbered — in a
 * panel whose entire job is to be checkable. So the timestamp is the running sum
 * of the dwells before it, in priority order, and it cannot be wrong.
 *
 * What it is a benchmark OF is the uninterrupted run: nobody clicks, nobody
 * skips, every line holds for its authored dwell. A real visit is almost always
 * shorter, because skipping a line with a press is free and the register drops to
 * `brief` the moment somebody starts exploring. That gap is the point — it is
 * what makes the interview timer (N51) worth reading.
 */
export interface Stamped {
  /** Seconds from the first word to this line. */
  at: number;
  /** Which part it belongs to, and where in that part. */
  part: Part;
  index: number;
  line: Line;
  /** The beats that fire on this line. */
  beats: Beat[];
}

export function timeline(): Stamped[] {
  const out: Stamped[] = [];
  let ms = 0;
  for (const part of [...parts].sort((a, b) => a.priority - b.priority)) {
    part.lines.forEach((line, index) => {
      out.push({
        at: Math.round(ms / 1000),
        part,
        index,
        line,
        beats: (part.beats ?? []).filter((b) => b.at === index),
      });
      ms += line.ms;
    });
  }
  return out;
}

/** The benchmark: how long the conversation runs if nobody touches it. */
export function runtimeMs(): number {
  return parts.reduce((a, p) => a + p.lines.reduce((b, l) => b + l.ms, 0), 0);
}

/**
 * The conversation as a readable transcript.
 *
 * One script, one transcript. This used to be a separate eleven-line array in
 * data/cv.ts that the panel rendered and the call played on a loop behind
 * everything else; after N45 there is only the script, so the panel renders the
 * script. Which means the transcript can no longer disagree with what is
 * actually said — it is the same data, stamped by the same clock.
 */
export interface TranscriptLine {
  at: number;
  speaker: string;
  text: string;
}

export function transcriptLines(speaker: string): TranscriptLine[] {
  return timeline().map((t) => ({ at: t.at, speaker, text: t.line.text }));
}
