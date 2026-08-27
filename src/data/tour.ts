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

/** One caption. */
export interface Line { text: string; ms: number }

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
    lines: [
      L("Hi, I'm Nam. Thank you for joining me here.", 3000),
      L('Let me walk you through my world.', 2600),
      L('Feel free to play around — maybe you can complete all 17 achievements.', 4200),
      L("First, let's share my screen.", 2400),
    ],
    beats: [
      // The share is PERFORMED, not switched on: the hand goes to the button,
      // opens the real picker, picks Entire Screen, picks Screen 1, presses
      // Share. Every step is a step a person would take. See N29.
      { at: 3, cue: 'share' },
    ],
    commentary: [L('Starting from the top, then.', 2000)],
    brief: [L("I'm Nam. Let me share my screen.", 2400)],
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
    lines: [
      L('This is the CV.', 1800),
      L('Seven years leading the front end of an online Mahjong client.', 4000),
      L('Working cross-team with basically everyone — design, server, QA, and the people who get the call when a table breaks at midnight.', 5600),
      L('Background in algorithm research. Published, and close enough to a PhD to have thought hard about it.', 4800),
      L("Here are my tech skills. Claude made this whole section redundant, LOL.", 4200),
      L('Education: Vietnam, Japan, Sweden. I love tonkotsu.', 3600),
      L("After work I do a lot of wild stuff. We'll get to that later.", 3400),
    ],
    beats: [
      { at: 0, roll: { of: 'cv', to: 0, ms: 500 } },
      { at: 1, roll: { of: 'cv', to: 'Experience', ms: 1400 } },
      { at: 3, roll: { of: 'cv', to: 0.42, ms: 1600 } },
      { at: 4, roll: { of: 'cv', to: 'Skills', ms: 1500 } },
      { at: 5, roll: { of: 'cv', to: 'Education', ms: 1400 } },
      { at: 6, roll: { of: 'cv', to: 'Off the clock', ms: 1400 } },
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
    brief: [L('The CV — seven years on a real-time client, and the research before it.', 3200)],
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
      L('Degree — check. Five years of software development — check.', 4000),
      L('Front end, testing, launches, architecture. Check, check, check, check.', 4400),
      L('You get a check. And you get a check. And everybody gets a check.', 4200),
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
      L('The interface was measured off the real product, not eyeballed. The measurements are in there, including the one that was wrong.', 5600),
      L('There is a size budget the CI fails on, and a test suite you can run from inside this call.', 4600),
      L('One person and an agent, one week. The retractions are in the commit log with everything else.', 4800),
    ],
    beats: [
      { at: 0, cue: 'tab:built' },
      { at: 2, roll: { of: 'page', to: 0.35, ms: 1600 } },
      { at: 3, roll: { of: 'page', to: 0.7, ms: 1600 } },
      { at: 4, roll: { of: 'page', to: 1, ms: 1400 } },
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
      L('Last but not least — let me get you some more achievements.', 3400),
      L('These are hidden in the calendar on the home screen. You found some of them.', 4200),
      L("Here are the ones you didn't.", 2400),
      L("Bottom line: I'm pretty fun at work. And if I'm not, throw me out of a plane. I love that.", 5200),
      L('Sorry if that came across corny. I would be in Hollywood otherwise.', 4000),
    ],
    beats: [
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
      L("And that's the tour. It's finished — the rest is yours.", 3800),
      L('Everything on screen is real and nothing here breaks. Open the panels, drag the windows, run the tests.', 5000),
      L("The plain document is top left if you'd rather just read it, and there's a PDF next to it.", 4600),
      L('Thank you for your time. Genuinely.', 3000),
    ],
    beats: [
      { at: 3, cue: 'park' },
    ],
    commentary: [L('The plain document is top left, and there is a PDF beside it.', 3600)],
    brief: [L("That's the tour. Plain document top left, PDF beside it. Thanks for the time.", 3400)],
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
  /** The question, as a hiring manager would ask it. */
  q: string;
  lines: Line[];
}

export const story: Chapter[] = [
  {
    q: 'Why are you applying for this, and why now?',
    lines: [
      L("Since you're still here — the part a CV never answers.", 3400),
      L("I've spent seven years making one product better for the same players. I know that job very well now.", 5000),
      L('I want the version of it where the constraints are harder and the people around me are better than me.', 4800),
    ],
  },
  {
    q: 'What do you actually like about this kind of work?',
    lines: [
      L('What I like is the moment a thing on screen behaves exactly the way you predicted it would.', 4600),
      L("Front end is the only discipline where you find out immediately whether you were right.", 4400),
    ],
  },
  {
    q: 'What are you strongest at?',
    lines: [
      L('Strength: I am unreasonable about measuring things. This whole page is built off getBoundingClientRect rather than screenshots.', 5600),
      L("And I finish. Two platform migrations on a live product with real money on the tables — nobody got to stop halfway.", 5200),
    ],
  },
  {
    q: 'What are your weaknesses — honestly?',
    lines: [
      L('Weakness, honestly: I go too deep too early. I built a WebGL effects pipeline for this site and then deleted it, because it needed a camera permission I decided we should never ask for.', 6400),
      L("That was the right call and it cost me two days. I'd rather tell you that than pretend the two days were planned.", 5000),
      L('The other one: I am funnier in writing than in a first meeting. You may have noticed.', 4200),
    ],
  },
  {
    q: 'How do you work with other people?',
    lines: [
      L("On a live client you are never the only owner of anything. Server, design, QA, support — everything I shipped went through all four.", 5400),
      L('I write the thing down before I argue about it. Most disagreements turn out to be two people describing different problems.', 5200),
    ],
  },
  {
    q: 'What happens when you are wrong?',
    lines: [
      L("I record it. There is a measurement in this build that produced a contradiction — the reaction band could not be in two places at once.", 5400),
      L('I wrote up the failure instead of quietly re-running it, and the write-up is what found the real rule.', 4800),
    ],
  },
  {
    q: 'What is the hardest thing you have shipped?',
    lines: [
      L('Hardest: shared state across four seats, with reconnection, on latency you do not control.', 4600),
      L('One of those four players is always on hotel wifi. That constraint shaped more of my career than any framework has.', 5000),
    ],
  },
  {
    q: 'Why should we take the risk?',
    lines: [
      L("Last one. Why take the risk: because you can check every claim on this page by clicking on it.", 4800),
      L("That's the whole pitch. Thanks for listening to it.", 3200),
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

export const quips: Quip[] = [
  /* --- the shared desktop ------------------------------------------------ */
  Q('desk-first', 'desktop', 'desk:first', 'A real desktop: windows, explorer, browser, player.', 2800),
  Q('desk-drag', 'desktop', 'desk:drag', 'Yeah — you can do that.', 1800),
  Q('desk-snap', 'desktop', 'desk:snap', 'Snap layouts. I call this one Chrominion.', 2600),
  Q('desk-min', 'desktop', 'desk:min', "It's not gone. It's on the taskbar, being patient.", 2800),
  Q('desk-close', 'desktop', 'desk:close', "Fine. That one wasn't important.", 2200),
  Q('desk-folder', 'desktop', 'desk:folder', 'Real folders. Well — real-ish.', 2200),
  Q('desk-resize', 'desktop', 'desk:resize', 'It resizes properly too. Container queries, not media queries.', 3200),
  Q('desk-clock', 'desktop', '.dk-clock', 'That clock is the only honest thing on this desktop.', 3000),
  Q('desk-tray', 'desktop', '.dk-tray-btn:not(.dk-clock)', "Sorry — no wifi. That's a picture of wifi.", 2800),
  Q('desk-start', 'desktop', '.dk-start', 'There is a Start menu. There is even a shutdown, and it shuts something down.', 3600),
  Q('desk-tv', 'desktop', '.dk-tv-btn', 'Task view. Alt-Tab belongs to your real computer, not to mine.', 3400),
  Q('desk-peek', 'desktop', '.dk-peek-card', 'Those previews are the windows themselves, scaled. They cannot go stale.', 3600),

  /* --- the emulated browser ---------------------------------------------- */
  Q('cb-tab', 'browser', '.cb-tab', 'Tabs open, tabs close. A browser inside a browser.', 2800),
  Q('cb-new', 'browser', '.cb-new', 'Go on then. Open a new one.', 2200),
  Q('cb-omni', 'browser', '.cb-omni-in', 'You can type a real URL in there. It will actually go.', 3000),
  Q('cb-riichi', 'browser', '.cb-tab[data-tab-id="riichi"]', "That tab is the live client. Not a screenshot of it — the client.", 3400),
  Q('cb-work', 'browser', '.cb-tab[data-tab-id="work"]', 'Everything I have built that I am allowed to show you.', 3000),

  /* --- the call's own panels --------------------------------------------- */
  Q('p-a11y', 'panel', '[data-tab="a11y"]', 'Accessibility, audited live. That panel runs the audit against this page while you watch.', 4400),
  Q('p-tests', 'panel', '[data-tab="tests"]', "Same suite the CI runs. There's a switch that breaks them on purpose, if you want to see red.", 4400),
  Q('p-perf', 'panel', '[data-tab="perf"]', 'Real numbers, off this page, not a benchmark I chose.', 3000),
  Q('p-net', 'panel', '[data-tab="net"]', 'Push that to Hotel wifi. That is the setting I actually design for.', 3400),
  Q('p-spec', 'panel', '[data-tab="spec"]', 'Every measurement, including the one that turned out to be wrong.', 3400),
  Q('p-people', 'panel', 'panel:people', "That's who's in the call. It is a short list.", 2600),
  Q('p-chat', 'panel', 'panel:chat', 'The messages are scripted. Nobody is typing.', 2600),
  Q('p-host', 'panel', 'panel:host', 'Host controls. You can take the document away with you.', 3000),
  Q('p-about', 'panel', 'panel:about', 'The career, as a timeline. Overlapping roles get their own lane, honestly.', 3800),

  /* --- the call itself ---------------------------------------------------- */
  Q('c-hand', 'call', '[data-ctl="hand"]', '…Sorry about that. That is the one control that lies to you.', 3600),
  Q('c-react', 'call', '[data-ctl="react"]', 'Those reactions are mine, not Google’s.', 2600),
  Q('c-cam', 'call', '[data-ctl="camera"]', 'It never asks for your camera. It just changes the icon.', 3200),
  Q('c-mic', 'call', '[data-ctl="mic"]', 'The mic check is real, by the way. Timed off the live product.', 3200),
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
  A('b2', 'browsing', 'Right — you have the gist.', 2000),
  A('b3', 'browsing', 'Skimming. Respectable.', 2000),
  A('b4', 'browsing', 'Ah, you know what you are looking for.', 2600),
  A('b5', 'browsing', "Fine, I'll keep up.", 2000),

  /* skimming — faster than the script. */
  A('k1', 'skimming', 'CV — yeah, yeah. You want more, I see.', 3000),
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
  shorten: L('Lots to look at — I will keep these short.', 2800),
  /** Queue is too long: the tour hands over and stops. */
  handOver: L(
    'You clearly know your way around. I will get out of the way — everything is where you would expect, '
    + 'and the plain document is in the top left. Thanks for the time.',
    6000,
  ),
  /** The visitor pressed Stop. */
  stopped: L('Of course — I will leave you to it.', 2400),
  /** The visitor went quiet mid-tour and the script takes the wheel back. */
  resume: L('Still here? I will carry on then.', 2600),
};
