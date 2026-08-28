// The project's own record: how it was made, when, and what is left.
//
// Kept out of the UI for the same reason everything else here is: the Project
// specifications panel and the document in the mock browser render from one
// source, so they cannot drift.
//
// Dates and counts are read off the git history, not remembered. `git log
// --reverse` puts the first commit on 2026-08-20; the counts below are
// `git log --format=%ad --date=short | sort | uniq -c`.

export { START } from './cv.js';

/** Commits per day, from the git log. The shape of the work, not a claim about it. */
/**
 * Read off `git log --date=short --format=%ad | sort | uniq -c`. The record keeps
 * every day, including the quiet ones -- deleting a day from the DATA would be
 * editing history.
 *
 * The chart hides the thinnest days, which is a display choice and Nam's call:
 * "remove 22 aug and 24 aug, as they have 1 and 0 commit - not worth cluttering
 * the view." So `thin` marks them and the view filters on it, which keeps the two
 * concerns apart and means the totals stay true.
 */
export const commitsPerDay: { day: string; n: number; label: string; thin?: boolean }[] = [
  { day: '2026-08-20', n: 53, label: 'Day 1' },
  { day: '2026-08-21', n: 12, label: 'Day 2' },
  { day: '2026-08-22', n: 1, label: 'Day 3', thin: true },
  { day: '2026-08-23', n: 6, label: 'Day 4' },
  { day: '2026-08-24', n: 0, label: 'Day 5', thin: true },
  { day: '2026-08-25', n: 43, label: 'Day 6' },
  { day: '2026-08-26', n: 18, label: 'Day 7' },
  { day: '2026-08-27', n: 17, label: 'Day 8' },
];

/**
 * ONE A DAY, AND A TITLE ONLY.
 *
 * This used to carry a `note` of two or three sentences and a commit number,
 * and eight entries covered five days. Nam, reading it back: "all the text
 * explaining stuff, we can get rid of them. We just need to know the big
 * picture, what was done when, and every day its 1 milestone max."
 *
 * He is right about what the section is for. Nobody reads a milestone strip to
 * learn how a thing works; they read it to see the shape of a week. The notes
 * were a second copy of explanations that already exist in the build document,
 * the design reviews and the board, and the commit numbers were precision
 * nobody had asked for.
 *
 * A day may have no milestone. `max` is the rule, not a quota, and the two
 * near-empty days did not produce one.
 */
export interface Milestone {
  day: string;
  title: string;
}

/** The most consequential thing that happened on each day that had one. */
export const milestones: Milestone[] = [
  /*
   * Day one had three candidates: the first commit, the decision to measure
   * rather than eyeball, and the lobby's derived breakpoint. The first commit
   * is not a milestone, it is a start date, and every project has one. The
   * measuring decision is the one every later correction traces back to.
   */
  { day: '2026-08-20', title: 'Measured, not eyeballed' },
  /*
   * "A failed measurement, recorded" was here and is gone. Nam: "what kind of
   * milestone is this? remove." Right: it is a good story about how the work
   * runs, which is what the Process tab is for, and it is not a thing that got
   * built on a day.
   */
  { day: '2026-08-21', title: 'The in-call screen' },
  { day: '2026-08-23', title: 'The shared screen becomes a desktop' },
  { day: '2026-08-25', title: 'Pinned and presenting layouts' },
  { day: '2026-08-26', title: 'Read as a stranger would read it' },
  { day: '2026-08-27', title: 'The call gives its own demo' },
];

export interface Phase {
  n: number;
  name: string;
  body: string;
  outputs: string[];
}

/**
 * How the work actually ran. Three phases per task, with a fourth that only
 * happens at the end of a batch.
 */
export const phasesOfWork: Phase[] = [
  {
    n: 1,
    name: 'Analysis and planning',
    body:
      'Drive the real product and read it, rather than guessing from memory. Geometry, colours and timings ' +
      'come off the live DOM. Anything that cannot be measured is written down as unmeasured before a line of ' +
      'code is committed to it.',
    outputs: ['A measured baseline', 'A written plan, reviewed twice', 'A list of what could not be read'],
  },
  {
    n: 2,
    name: 'Execution',
    body:
      'Build to the plan, in small commits, with the reasoning left in the comments. Where a number came from ' +
      'a measurement the comment says so; where it came from judgement, it says that instead.',
    outputs: ['Working code', 'Comments that explain why, not what'],
  },
  {
    n: 3,
    name: 'QA and bug fixes',
    body:
      'Drive the built thing the way a person would, in a real browser, with real clicks. This phase has ' +
      'caught more than review did, including a bug where every click inside a window was silently discarded, ' +
      'which three rounds of synthetic tests had passed.',
    outputs: ['Findings, verified before they are called fixed', 'Retractions when a diagnosis was wrong'],
  },
  {
    n: 4,
    name: 'Big-picture review',
    body:
      'At the end of a batch rather than per task: step out of the code and read the artefact as its audiences ' +
      'will. This is where the framing problems surface, and they have consistently been more expensive than ' +
      'the code problems.',
    outputs: ['A perception pass', 'A ranked list of what to fix next'],
  },
];

export interface Persona {
  id: string;
  name: string;
  role: string;
  /** How long they will actually spend. */
  time: string;
  wants: string;
}

/** The three people who decide whether this works. */
export const personas: Persona[] = [
  {
    id: 'recruiter',
    name: 'The first reader',
    role: 'Recruiter, sourcer, or whoever opens the link first',
    time: '30–60 seconds',
    wants: 'Who is this, what do they do, are they plausibly qualified, and is this link safe.',
  },
  {
    id: 'manager',
    name: 'The hiring manager',
    role: 'Engineering manager or tech lead',
    time: '2–10 minutes, if intrigued',
    wants: 'Can this person build hard front-end things? Is the judgement real or is this a stunt?',
  },
  {
    id: 'engineer',
    name: 'The interviewer',
    role: 'Whoever runs the loop, skimming beforehand',
    time: '5 minutes',
    wants: 'Something concrete to ask about. Evidence of method rather than evidence of effort.',
  },
]
;

export interface Review {
  persona: string;
  verdict: 'strong' | 'mixed' | 'risk';
  heading: string;
  body: string;
}

/**
 * A fresh read of the CV as it stands, in each persona's voice. Replaces the
 * design reviews of the original plan, which were about a build that no longer
 * exists.
 */
export const reviews: Review[] = [
  {
    persona: 'recruiter', verdict: 'strong',
    heading: 'The banner does its job now',
    body:
      '"Short on time? Here\'s my CV" answers the only question I have in the first second, and the line under ' +
      'it gives me a title and years without a click. The document opens over the page instead of taking me ' +
      'somewhere, which means I never lose my place.',
  },
  {
    persona: 'recruiter', verdict: 'risk',
    heading: 'Before the page loads, it claims to be Google',
    body:
      'The static shell paints the Meet mark and the words "Google Meet" until the script arrives. On a phone ' +
      'on a bad connection that is the whole first impression, and it is the one thing here that could get the ' +
      'link reported rather than merely closed.',
  },
  {
    persona: 'manager', verdict: 'strong',
    heading: 'The method is the argument, and it holds',
    body:
      'Measured rather than eyeballed, with the unmeasurable surfaces labelled as ours. Retractions in the ' +
      'commit log where a diagnosis was wrong. That is a stronger signal than the clone itself: plenty of ' +
      'people can copy an interface, far fewer will write down that their own test was invalid.',
  },
  {
    persona: 'manager', verdict: 'mixed',
    heading: 'The desktop is impressive and unexplained',
    body:
      'A working Windows shell inside a screen share is the most technically ambitious thing here. It is also ' +
      'the part where I stop being able to tell what is a CV and what is a demo, and nothing on screen tells ' +
      'me which. Label it and it becomes a highlight instead of a detour.',
  },
  {
    persona: 'engineer', verdict: 'strong',
    heading: 'There is a lot to ask about',
    body:
      'Container queries used for an aspect-locked fit, a pure reducer that is unit-tested without a DOM, a ' +
      'size budget failing the build, an SVG letterboxing bug traced to a default. Any of those is a twenty ' +
      'minute conversation.',
  },
  {
    persona: 'engineer', verdict: 'mixed',
    heading: 'I want the failures, not the features',
    body:
      'The most interesting page in the project is the one listing the bugs that got past three rounds of ' +
      'testing, and it is buried. Lead with what broke; the working parts speak for themselves.',
  },
];

export type Column = 'backlog' | 'doing' | 'review' | 'done';

/**
 * The long form behind a card.
 *
 * Nam: "the kanban ticket should on click open up a popup screen for that
 * kanban, detailing even more info about that ticket. That would keep the board
 * itself clean and not bloated, cause all the details are in the ticket popup
 * view."
 *
 * So `note` is the one line the card shows and this is everything else. Every
 * field is optional because a two-line chore does not need a rationale, and
 * forcing one produces the kind of filler that makes a board unreadable.
 */
export interface TaskDetail {
  /** Why it is worth doing. The part that goes stale slowest. */
  why?: string;
  /** What "done" means, as things a reader could check. */
  done?: string[];
  /** Where it came from — a QA session, a review, a measurement. */
  raised?: string;
  /** Anything known that would otherwise be rediscovered the hard way. */
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  note: string;
  col: Column;
  /** Rough size, in the way a board actually uses it. */
  size: 'S' | 'M' | 'L';
  tag: 'onboarding' | 'specs' | 'call' | 'trust' | 'content';
  detail?: TaskDetail;
}

/*
 * Nam: "when you start working on some ticket, move it to in progress, and after
 * that to QA, then after you QA it then move it to done, that's the flow."
 *
 * So the third column is QA rather than In review. The id stays review because
 * renaming it would touch every card for no gain; the label is what anyone reads.
 */
export const columns: { id: Column; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'doing', label: 'In progress' },
  { id: 'review', label: 'QA' },
  { id: 'done', label: 'Done' },
];

/**
 * The board. Seeded with the real outstanding work, which is why several cards
 * are uncomfortable to read — a board that only contains finished things is a
 * trophy cabinet, not a plan.
 */
export const tasks: Task[] = [
  { id: 'T4', col: 'done', size: 'M', tag: 'trust', title: 'Say something before the camera prompt', note: 'Done, by removing the prompt instead. There is no permission bar left to get in front of \u2014 see T29.' },
  { id: 'T5', col: 'backlog', size: 'S', tag: 'trust', title: 'Label the emulated browser and desktop', note: 'A browser with an address bar drawn inside a page is a phishing pattern. Keep the trick, label it.' },
  { id: 'T6', col: 'backlog', size: 'M', tag: 'content', title: 'Rewrite the plain CV footer', note: 'It closes on build receipts and is no-print, so the PDF loses the disclaimer with it.' },
  { id: 'T7', col: 'done', size: 'S', tag: 'content', title: '"Against this job ad" names no job ad', note: 'Closed by N66 from the other end: with no code the CV now names the employer, so the section has a job ad to be against.' },
  { id: 'T8', col: 'review', size: 'M', tag: 'onboarding', title: 'CV opens as an overlay, not a route', note: 'Shipped. Meet never navigates away from itself and neither should this.' },
  { id: 'T9', col: 'review', size: 'M', tag: 'onboarding', title: 'Per-company copy behind a code', note: 'Shipped. No employer named by default; ?c= swaps in the specific lines.' },
  { id: 'T10', col: 'review', size: 'L', tag: 'specs', title: 'Project specifications panel', note: 'Shipped. One place the build is documented, reachable from the home screen and from inside the call.' },
  { id: 'T11', col: 'review', size: 'M', tag: 'call', title: 'Easter eggs open inside the call', note: 'Shipped, then QA\u2019d by Nam \u2014 which is where T16 to T20 came from. Join goes straight to the call with the clip playing on the shared screen.' },
  { id: 'T12', col: 'done', size: 'L', tag: 'call', title: 'The shared desktop', note: 'Windows that drag, resize, snap and minimise, a file explorer, a browser and a media player.' },
  { id: 'T13', col: 'done', size: 'M', tag: 'call', title: 'Pinned and presenting layouts', note: 'Read off the live product while a share was running, the only way those states were reachable.' },
  { id: 'T14', col: 'done', size: 'M', tag: 'trust', title: 'Perception pass', note: 'How this reads to a stranger, ranked by how fast it pushes them toward closing the tab.' },
  { id: 'T15', col: 'done', size: 'S', tag: 'onboarding', title: 'Banner says it is a CV', note: 'The first line now answers the category question instead of describing the format.' },

  /* From Nam's egg QA, 26 August. Five requests and three bugs, all shipped and
     measured in a browser; sitting in review because he has not seen them yet. */
  { id: 'T16', col: 'review', size: 'L', tag: 'call', title: 'Real video controls on the shared player', note: 'Shipped, then cut back on Nam\u2019s note that it obstructed the picture. Clicking the video pauses it; the overlay is now one play button, shown only while paused and for a second after a press. Skip \u00b110s is gone \u2014 the clips are 8 to 30 seconds, so it only ever meant the start or the end.' },
  { id: 'T17', col: 'review', size: 'M', tag: 'call', title: 'The player stops lying about sound', note: 'Shipped. It autoplayed muted while showing an unmuted speaker at full volume. The UI now reads off the video, and the visitor\u2019s choice is remembered \u2014 a mute the browser imposed is not saved as one they chose.' },
  { id: 'T18', col: 'review', size: 'S', tag: 'call', title: 'No share sheet over an easter egg', note: 'Shipped. The meeting\u2019s-ready card exists to say the link is copyable; parked over a 30-second clip it is just clutter. Suppressed in the reducer, so a future route into an egg cannot forget.' },
  { id: 'T19', col: 'review', size: 'S', tag: 'call', title: 'Egg player opens centred', note: 'Shipped. It was inheriting the cascade meant for windows you opened yourself and landing in the corner behind Explorer.' },
  { id: 'T20', col: 'review', size: 'S', tag: 'call', title: 'Leaving an egg goes straight home', note: 'Shipped. The ended screen earns its place after a real visit; after a clip it is a speed bump, once per egg, for someone hunting them.' },
  { id: 'T21', col: 'review', size: 'S', tag: 'call', title: 'BUG: countdown ring animated in two frames', note: 'Fixed. A unitless custom property inside calc() stays a <number>, so the keyframe never resolved to a length and Chrome fell back to DISCRETE animation \u2014 full arc for 30s, then none. Nam: "either fully blue or fully white".' },
  { id: 'T22', col: 'review', size: 'S', tag: 'specs', title: 'BUG: three CSS rules had lost their selectors', note: 'Fixed. A prune deleted the selector lines and left the declarations, which a browser silently discards. deadcss cannot see it \u2014 with the selector gone there is no name left to report \u2014 so css-structure.mjs now gates on it.' },
  { id: 'T23', col: 'review', size: 'S', tag: 'specs', title: 'BUG: local video could not seek', note: 'Fixed. serve.mjs answered Range with a plain chunked 200, so Chrome reported the media unseekable and every skip snapped to zero. Production was never affected, which is exactly why it wasted a QA pass.' },

  { id: 'T25', col: 'review', size: 'S', tag: 'call', title: 'BUG: speed menu was white on white', note: 'Fixed. color:#fff for the closed control inherited into the <option> elements, and the platform draws the popup on its own surface \u2014 which this document forces light. color-scheme:dark plus explicit option colours.' },

  { id: 'T26', col: 'review', size: 'S', tag: 'call', title: 'BUG: the call auto-ended and dumped you home', note: 'Fixed. The ended screen\u2019s 60s auto-return kept ticking after you left it, then dispatched screen: home from under you mid-call. Its guard listened for hashchange, and main.ts navigates with pushState \u2014 which never fires it, so the guard had never once run. Each visit armed another one. The tick now checks it is still the ended screen.' },

  { id: 'T27', col: 'review', size: 'S', tag: 'specs', title: 'BUG: Meeting tools was wider than every other panel', note: 'Fixed. It forced 460px against the 360 every other drawer uses, so it sat over the video tile and the right edge moved depending on which drawer you opened. The width existed because eight tabs would not fit; they wrap to two rows now and there are five, so the cause went with it.' },
  { id: 'T28', col: 'review', size: 'S', tag: 'specs', title: 'Meeting tools: two tabs removed, five reordered', note: 'Removed. The requirement map is already in About and the mock Chrome opens the real posting, three copies is how they start disagreeing. Design went on Nam’s call: not relevant here, and some mystery is worth keeping.' },

  { id: 'T29', col: 'review', size: 'M', tag: 'trust', title: 'The page never asks for your camera', note: 'Shipped. getUserMedia is gone \u2014 the control flips its own icon and nothing else, verified by wrapping mediaDevices.getUserMedia and toggling both ways. Closes R11 in the perception doc, which called the browser\u2019s permission bar on a page dressed as Meet the scariest moment in the funnel.' },
  { id: 'T30', col: 'review', size: 'M', tag: 'specs', title: 'WebGL effects pipeline deleted', note: 'Removed with the camera it ran on: the Effects tab, src/fx/pipeline.ts, the fx side quest, the \u2018e\u2019 shortcut and the Backgrounds button. A real loss \u2014 it was the most technically substantial thing here \u2014 but it was only ever visible to a reader who granted the permission we just removed. Recoverable from git.' },

  { id: 'T31', col: 'review', size: 'S', tag: 'trust', title: 'BUG: the lobby named a camera it never asked about', note: 'Fixed. The lobby promoted a chip to "Integrated Camera", a hardcoded device name, in a file whose own comment forbids exactly that. It only looked right because Windows calls most built-in webcams that. Now reads "No camera requested" beside "Effects unavailable", matching the mic and speaker chips, and the promote mechanism is gone because nothing can be granted.' },

  /* ------------------------------------------------------------------------
   * Nam's QA pass of 27 August: twenty-six numbered points, in his order, so a
   * card can always be traced back to what he actually said. N25 shipped first
   * because the rest of them needed a ticket view to live in.
   * --------------------------------------------------------------------- */
  {
    id: 'N1', col: 'done', size: 'M', tag: 'onboarding',
    title: "Join the interview already sharing, Chrome centred, CV open",
    note: "The default state of the interview call should be presenting full screen with the mock Chrome centred on the CV.",
    detail: {
          "why": "The call currently opens on an empty tile. The first thing a reader should see is the work, not a placeholder avatar.",
          "done": [
                "Joining the interview meeting starts a share automatically",
                "The mock Chrome opens centred, not cascaded",
                "It shows the same CV document the home screen’s Open document shows"
          ],
          "raised": "Nam, QA 27 Aug, point 1"
    },
  },
  {
    id: 'N2', col: 'done', size: 'S', tag: 'call',
    title: "Window share offers Chrome, not Explorer",
    note: "Sharing a window offers the file explorer, where there is nothing to look at. It should offer the browser with its tabs.",
    detail: {
          "why": "Window mode is a single window on nothing. Explorer is a file list; Chrome carries the actual content and its tab strip can hold every document at once.",
          "done": [
                "The Window tab of the share picker offers the browser",
                "Its tab strip shows the documents instead of one tab per share source"
          ],
          "raised": "Nam, QA 27 Aug, point 2"
    },
  },
  {
    id: 'N3', col: 'done', size: 'M', tag: 'content',
    title: "\"Things I built\", merged, with real itch.io games",
    note: "Four things I built becomes Things I built, absorbs the other list, and links actual games rather than a bare profile URL.",
    detail: {
          "why": "Two lists answering one question, and a link to a profile page asks the reader to do the browsing.",
          "done": [
                "One list, titled Things I built",
                "Named games from southocean.itch.io with links",
                "Graphics or at least a per-game line, not just the profile link"
          ],
          "raised": "Nam, QA 27 Aug, point 3",
          "notes": "Source: https://southocean.itch.io/"
    },
  },
  {
    id: 'N4', col: 'done', size: 'S', tag: 'content',
    title: "Use the real Mahjong product, not a hand-drawn board",
    note: "The riichi board is sloppy and not up to code. Point at the real client instead.",
    detail: {
          "why": "A badly drawn mahjong board on the CV of someone who builds mahjong clients is the worst possible advert.",
          "done": [
                "The riichi page frames or links preview.mahjongstars.com",
                "The hand-drawn board is gone"
          ],
          "raised": "Nam, QA 27 Aug, point 4",
          "notes": "https://preview.mahjongstars.com/, public, so disclosing it is fine."
    },
  },
  {
    id: 'N5', col: 'done', size: 'S', tag: 'onboarding',
    title: "Home screen copy: subtitle and the meeting note",
    note: "Two lines, both rewritten to Nam’s wording.",
    detail: {
          "done": [
                "Subtitle: \"Lead front-end developer, 7 years · Agentic programming wizard · PhD in going the extra miles\"",
                "Meeting note: \"Get personal with Nam in this interactive CV. Only if all meetings could be like this!\""
          ],
          "raised": "Nam, QA 27 Aug, point 5"
    },
  },
  {
    id: 'N6', col: 'done', size: 'S', tag: 'content',
    title: "The contacts list: Diep Bui, no references, new search label",
    note: "Trim the referral picker to the one real contact.",
    detail: {
          "done": [
                "\"Diep, referral\" becomes \"Diep Bui\"",
                "Both Reference rows deleted",
                "Search placeholder becomes \"Search my referral\""
          ],
          "raised": "Nam, QA 27 Aug, point 6"
    },
  },
  {
    id: 'N7', col: 'done', size: 'S', tag: 'content',
    title: "The Diep Bui card, and no work email anywhere",
    note: "Retitle the card, replace the calling-as line with a joke, and purge the work address from the whole site.",
    detail: {
          "why": "The work email is Nam’s current employer address and has no business on a job application.",
          "done": [
                "Card title: \"Diep Bui, referral\"",
                "The \"Calling as\" line replaced with something playful",
                "The description line is less stiff",
                "The work address appears nowhere in src/ or docs/ \u2014 asserted by a test"
          ],
          "raised": "Nam, QA 27 Aug, point 7"
    },
  },
  {
    id: 'N8', col: 'done', size: 'S', tag: 'content',
    title: "Loosen the Calls page copy, and drop the referral note",
    note: "One of the two lines should be playful, and the referral note goes, here and on the ended screen.",
    detail: {
          "why": "Nam: \"In general Idk if a referral note is really needed at all.\"",
          "done": [
                "Second line on the Calls page is playful rather than professional",
                "The referral note is gone from the Calls page",
                "It is gone from the ended screen too"
          ],
          "raised": "Nam, QA 27 Aug, point 8"
    },
  },
  {
    id: 'N9', col: 'done', size: 'S', tag: 'specs',
    title: "Board cleanup, and take up T7",
    note: "T1 and T2 off the board, T4 to done, T7 becomes the job-requirement section gated behind ?c=.",
    detail: {
          "done": [
                "T1 and T2 removed",
                "T4 moved to done",
                "T7 actioned as \"Against the job requirement\", only rendered with a company code"
          ],
          "raised": "Nam, QA 27 Aug, point 9"
    },
  },
  {
    id: 'N10', col: 'done', size: 'S', tag: 'specs',
    title: "Rename to Project spec, drop the work-authorisation review",
    note: "The full name is too long, and one design-review point is wrong.",
    detail: {
          "why": "Nam: \"Any recruiter will know uppsala and stockholm are very close and I absolutely can work in sthlm. Meaningless point.\"",
          "done": [
                "Panel title reads \"Project spec\"",
                "The \"CV does not say I can work here\" review is deleted",
                "T3 comes off the board with it"
          ],
          "raised": "Nam, QA 27 Aug, point 10"
    },
  },
  {
    id: 'N11', col: 'done', size: 'S', tag: 'specs',
    title: "Timeline: hide the near-empty days",
    note: "22 and 24 August had 1 and 0 commits and clutter the chart.",
    detail: {
          "done": [
                "Those two days are not drawn",
                "The totals still include them"
          ],
          "raised": "Nam, QA 27 Aug, point 11"
    },
  },
  {
    id: 'N12', col: 'done', size: 'S', tag: 'specs',
    title: "Overview: one type size, shorter, better subtitle",
    note: "The first two paragraphs render at different sizes, the prose is long, and the panel subtitle says nothing.",
    detail: {
          "done": [
                "Both opening paragraphs share one style",
                "The prose is shorter",
                "Subtitle: \"One week, one agent, one interactive CV.\""
          ],
          "raised": "Nam, QA 27 Aug, point 12"
    },
  },
  {
    id: 'N13', col: 'done', size: 'M', tag: 'specs',
    title: "Overview holds the timeline; content is about the project only",
    note: "Merge the Timeline tab in, drop Method, and stop rendering Nam’s personal skills in a panel about this repository.",
    detail: {
          "why": "Nam: \"this is project spec - everything in here is about this project. The C++ and React are not relevant here.\"",
          "done": [
                "Commit chart at the top of Overview",
                "Milestones at the bottom, spread horizontally with dates",
                "Timeline tab gone",
                "Method section gone",
                "Stack lists what this build uses, not what Nam knows"
          ],
          "raised": "Nam, QA 27 Aug, point 13"
    },
  },
  {
    id: 'N14', col: 'done', size: 'S', tag: 'specs',
    title: "Clicking the dimmed ground closes Project spec",
    note: "Same contract as the close button.",
    detail: {
          "done": [
                "A press on the scrim closes the panel",
                "A press that starts inside the card and drifts out does not"
          ],
          "raised": "Nam, QA 27 Aug, point 14"
    },
  },
  {
    id: 'N15', col: 'done', size: 'S', tag: 'content',
    title: "The CV socials become icons",
    note: "GitHub, LinkedIn and itch.io are already links; they should be icons.",
    detail: {
          "done": [
                "Each social is an icon linking to its destination",
                "Each has an accessible name"
          ],
          "raised": "Nam, QA 27 Aug, point 15"
    },
  },
  {
    id: 'N16', col: 'done', size: 'S', tag: 'content',
    title: "BUG: email and location are oddly indented on the CV",
    note: "The contact block does not line up with the rest of the document.",
    detail: {
          "raised": "Nam, QA 27 Aug, point 16"
    },
  },
  {
    id: 'N17', col: 'done', size: 'M', tag: 'content',
    title: "Wasabi Productions, and four rewritten bullets",
    note: "Mahjong Logic becomes Wasabi Productions, and the role bullets are replaced.",
    detail: {
          "why": "The company has a landing page now, and the React + Unity hybrid is no longer what the product is.",
          "done": [
                "Mahjong Logic → Wasabi Productions everywhere",
                "No React + Unity hybrid claim anywhere in the CV",
                "Platform bullet: web app, to Unity, to React Native for web and app",
                "Team-of-five bullet replaced with the agentic-programming one",
                "Third bullet: feature design, UX, responsive, 4–5 Dan bot, bot swarm controller, automated QA",
                "Fourth bullet: designers, backend, marketing and investors; vertical grasp; decides feature priorities"
          ],
          "raised": "Nam, QA 27 Aug, point 17"
    },
  },
  {
    id: 'N18', col: 'done', size: 'S', tag: 'content',
    title: "Merge the two labs into D&A Research",
    note: "InfoLab and MSO Lab become one entry with only the highlights.",
    detail: {
          "done": [
                "One entry, \"D&A Research\"",
                "Graph mining, part of the Multinet library. InfoLab, Uppsala University, 2018",
                "Sensor network optimisation: two publications, one book chapter, one best-paper award. MSO Lab, HUST, 2014–2017"
          ],
          "raised": "Nam, QA 27 Aug, point 18"
    },
  },
  {
    id: 'N19', col: 'done', size: 'S', tag: 'content',
    title: "Bkav wording",
    note: "\"Delivered a beta meeting the relevant ISO standards\" → \"Delivered a beta version meeting the relevant ISO standards\".",
    detail: {
          "raised": "Nam, QA 27 Aug, point 19"
    },
  },
  {
    id: 'N20', col: 'done', size: 'S', tag: 'content',
    title: "\"Against this job ad\" → \"Against the job requirement\"",
    note: "And it only renders with a company code.",
    detail: {
          "raised": "Nam, QA 27 Aug, points 9 and 20"
    },
  },
  {
    id: 'N21', col: 'done', size: 'M', tag: 'content',
    title: "Restructure the skills block",
    note: "Two columns, no duplicates, and a stronger test-automation line.",
    detail: {
          "why": "Languages were being listed twice, once by name and again under \"over 10,000 lines\", and the bot-controller line undersells the testing work.",
          "done": [
                "Left column: skills and frameworks. Right column: languages",
                "Frameworks: React, Unity, Flutter",
                "Test automation: 75–90% unit coverage, AI-assisted, automated QA of core UI flows",
                "The WebGL / effects-pipeline skill is deleted",
                "No language appears twice"
          ],
          "raised": "Nam, QA 27 Aug, point 21"
    },
  },
  {
    id: 'N22', col: 'done', size: 'M', tag: 'content',
    title: "Off the clock, rewritten; honours removed",
    note: "Specific credits instead of vague instincts.",
    detail: {
          "done": [
                "Honours section deleted",
                "The \"Not filler\" line deleted",
                "Stand-up: Fyris Komedi, Comedy Nation, Uppsala Roligaste 2026",
                "Acting: Tomma Händer (.MOV Filmfestival 2026), The Darkest Hour, Don’t Cry Over Spilled Milk",
                "SFX artist removed",
                "Zombie walk: website, marketing, makeup, logistics; featured on SVT and UNT, with a link",
                "Sports as its own line: swimming and Brazilian jiu-jitsu"
          ],
          "raised": "Nam, QA 27 Aug, point 22"
    },
  },
  {
    id: 'N23', col: 'done', size: 'S', tag: 'content',
    title: "Trim the CV footer",
    note: "The build receipts and the Google disclaimer are not doing work on the document.",
    detail: {
          "done": [
                "Build/size/dependency line removed",
                "The not-affiliated paragraph removed",
                "The print hint kept if it still earns its place"
          ],
          "raised": "Nam, QA 27 Aug, point 23"
    },
  },
  {
    id: 'N24', col: 'done', size: 'L', tag: 'onboarding',
    title: "The guided tour: captions, an on-screen cursor, and an adaptive script",
    note: "The big one. A scripted walkthrough that narrates itself, moves a cursor in sync, and adapts when the visitor takes over.",
    detail: {
          "why": "Everything else on this board makes the CV better to read. This makes it a demo that runs itself, which is the difference between a page a recruiter skims and one they watch to the end.",
          "done": [
                "Captions on by default in the green room",
                "The share sheet auto-closes after 8s, with a visible countdown that pauses on hover",
                "Captions drive the demo: saying \"let us look at the CV\" opens it",
                "An on-screen cursor represents Nam and moves in sync with the captions",
                "Clicking anything switches the script to commentary mode for that part, then resumes",
                "A queue of visitor actions, with commentary shortened as it grows",
                "Too many queued actions: acknowledge it, hand over, end the captions politely",
                "A planning doc, QA’d three times before implementation, then the feature QA’d against the doc"
          ],
          "raised": "Nam, QA 27 Aug, point 24",
          "notes": "Script parts are prioritised so a shortened run still covers the important ones. Two modes: active showcase and passive commentary; the hard part is guessing intent when the visitor takes over."
    },
  },
  {
    id: 'N25', col: 'done', size: 'M', tag: 'specs',
    title: "Kanban cards open a ticket",
    note: "Shipped first, so the rest of the QA list had somewhere detailed to live.",
    detail: {
          "why": "Nam: \"That would keep the board itself clean and not bloated, cause all the details are in the ticket popup view.\"",
          "done": [
                "A card opens a ticket on click, Enter or Space",
                "The ticket holds why, done-when, who raised it and notes",
                "Escape and a press on the dimmed ground close it",
                "Focus returns to the card"
          ],
          "raised": "Nam, QA 27 Aug, point 25"
    },
  },
  {
    id: 'N26', col: 'done', size: 'L', tag: 'specs',
    title: "A script editor for the guided tour",
    note: "A page showing every script branch, where they converge, and the safe jump points.",
    detail: {
          "why": "Nam: \"This would be incredibly helpful in tweaking and redesigning the caption script if needed.\" The tour in N24 is only maintainable if its branching is visible.",
          "done": [
                "Every script part is listed with its branches",
                "Convergence points are shown",
                "Safe jump points are marked"
          ],
          "raised": "Nam, QA 27 Aug, point 26",
          "notes": "Depends on N24 landing first: there is no script tree to draw until there is a script tree."
    },
  },


  /* ------------------------------------------------------------------------
   * Nam's QA pass of 27 August, second half: ten numbered points about the
   * guided tour, taken apart into seventeen cards. The through-line is one
   * idea — the tour should behave like a person driving the machine, not like
   * a page narrating itself — so most of these are the same feature seen from
   * different angles.
   * --------------------------------------------------------------------- */
  {
    id: 'N27', col: 'done', size: 'M', tag: 'onboarding',
    title: "Do not join already sharing",
    note: "N1 is reverted. The share is something the tour performs, not the state it starts in.",
    detail: {
      why: "Nam: \"when joining the call, we shouldnt start in screen sharing. Screensharing should be triggered by caption script, so we can feature full feature of the CV.\" Landing mid-share skips the part that makes the demo land, watching someone share a screen is the familiar bit that earns the strange bits.",
      done: [
        'An ordinary join opens on the call, not on a share',
        'The easter-egg boot still opens already sharing, because that clip is the whole meeting',
        "The tour's first act performs the share itself",
      ],
      raised: 'Nam, QA 27 Aug, point 1',
      notes: 'N1 shipped the opposite of this and was right at the time, the reader landed on the work instead of an avatar. What changed is that there is now a tour to do the landing for them. QA in a browser: an ordinary join opens on the call, and the first act performs the share.',
    },
  },
  {
    id: 'N28', col: 'done', size: 'L', tag: 'onboarding',
    title: 'A real mouse pointer, moving like a hand',
    note: 'The blue dot becomes an arrow, and it travels, overshoots, settles and fidgets instead of teleporting.',
    detail: {
      why: "Nam: \"the mouse should have a mouse icon not the blue dot cause it forces user to learn something they dont need to... as if this is a regular person using the computer. It's very trippy yes but thats exactly what I want. It's a mixture of familiarity + strange.\" A blue dot is a new symbol to decode. An arrow is one everybody already has.",
      done: [
        "A real cursor arrow, drawn to match the platform's",
        "Travel time from Fitts's law, not a fixed duration",
        'A curved path with an overshoot and a corrective submovement',
        'Tremor while idle, and an occasional drift',
        'A visible press on click, and a dwell before it',
        'It owns the whole screen, not just the shared surface',
      ],
      raised: 'Nam, QA 27 Aug, point 2',
      notes: 'Human pointing is ballistic then corrective: one fast movement that covers most of the distance and overshoots, then slower closed-loop corrections under visual feedback. Copying that shape is most of what makes a synthetic cursor read as a hand. QA in a browser: 5404px of travel across one full run, arcing, overshooting and settling on every target.',
    },
  },
  {
    id: 'N29', col: 'done', size: 'M', tag: 'onboarding',
    title: 'The share is performed: captions, picker, Entire Screen, full screen',
    note: 'The cursor does every step a person would do, in order, with nothing skipped.',
    detail: {
      why: "Nam: \"if CC was not on, then the mouse would move to click on CC to enable it, then the script starts. Then on cue to share screen, mouse will move to the screensharing button, then to full screen, then so on.\"",
      done: [
        'Captions are switched on by the cursor when they are off, before the first line',
        'Share screen opens the real picker',
        'Entire Screen is selected, then Screen 1, then Share',
        'The browser window is maximised inside the shared desktop',
        'Every step is a real click on a real control, not a shortcut into state',
      ],
      raised: 'Nam, QA 27 Aug, points 1 and 2',
      notes: 'QA in a browser: captions, picker, Entire Screen, Screen 1, Share, launch Chrome, maximise, every step a real press on a real control.',
    },
  },
  {
    id: 'N30', col: 'done', size: 'S', tag: 'content',
    title: 'Rewrite the opening',
    note: 'Shorter, warmer, and it hands the visitor a goal before it starts talking.',
    detail: {
      why: 'The old opening explained the format. "a working rebuild of the Meet web client", which is the least interesting true thing about it. Nam’s version says hello, offers a game, and moves.',
      done: [
        '"Hi, I’m Nam. Thank you for joining me here."',
        '"Let me walk you through my world."',
        'The achievement count is named, and it is the real one',
        '"First, let’s share my screen" is the cue for the share',
      ],
      raised: 'Nam, QA 27 Aug, point 3',
      notes: 'The count is asserted in the test suite against the quest list, so the line cannot quietly become a lie. The count is asserted against the quest list in the test suite, so the line cannot go stale.',
    },
  },
  {
    id: 'N31', col: 'done', size: 'L', tag: 'onboarding',
    title: 'The CV act: lines tied to scroll, not to a stopwatch',
    note: 'The cursor scrolls the document and each section speaks as it arrives. Scroll past it and the short version plays.',
    detail: {
      why: "Nam: \"all these texts should have trigger in the CV as we scroll, and they should be queued so that each line has its reading time. If we scroll past a point quickly then we run the short version of the lines to speed it up.\"",
      done: [
        'Each line is anchored to a section of the document',
        'The cursor scrolls; arriving at a section speaks it',
        'A section reached early plays its short version',
        'A section already passed is not replayed',
        'Leaving the CV entirely cuts the losses rather than finishing the script',
      ],
      raised: 'Nam, QA 27 Aug, point 4',
      notes: 'QA in a browser: the CV scrolled 1473px across seven anchored lines.',
    },
  },
  {
    id: 'N32', col: 'done', size: 'M', tag: 'onboarding',
    title: 'Restlessness, and the bar that flashes when it moves',
    note: 'Score the visitor’s impatience, and show the score only at the moment it changes.',
    detail: {
      why: "Nam: \"we should score user on their reading speed and restlessness. The higher they score, the more escalated our acknowledgements would be. Let's flash a restlessness bar somewhere on the screen whenever this bar gets increased, only at the moment of the increase, then it fades away.\"",
      done: [
        'A 0..1 restlessness score with named tiers',
        'It rises on fast bails, scroll speed and click bursts, and decays on dwell',
        'Acknowledgements are drawn from a pool matched to the tier',
        'The same acknowledgement is never used twice in a run',
        'A bar appears on increase, holds, and fades',
        'Nothing is shown while it is merely decaying',
      ],
      raised: 'Nam, QA 27 Aug, point 4',
      notes: 'QA in a browser: the meter stepped 28 → 42 → 56 → 70% through a click burst and hid itself afterwards.',
    },
  },
  {
    id: 'N33', col: 'done', size: 'L', tag: 'specs',
    title: 'The visitor profile, a know-your-user model',
    note: 'One pure module that watches what the visitor does and says what they seem to want.',
    detail: {
      why: "Nam: \"Feels like we are essentially building a know your user system, like user profiling. Let me know what else we can add to this system to get a clear image of user intention and interest, so we tailor our script to their interest and in their own pace.\"",
      done: [
        'Signals: idle time, click rate, scroll speed, dwell per section, bail rate, backtracking, revisits, depth of navigation, input modality',
        'Derived: reading speed, restlessness, engagement, and an interest ranking over the parts',
        'Pure and unit-tested, no DOM, no timers',
        'The director asks it for pace and register rather than guessing',
      ],
      raised: 'Nam, QA 27 Aug, point 4',
      notes: 'Kept pure for the same reason the tour director is: adaptivity is the part most likely to be subtly wrong and least likely to be noticed. Nineteen unit tests over the model. The two strongest signals turned out to be scroll speed and revisiting, dwell cannot tell reading from having walked away, and a revisit is the only signal that costs the visitor effort.',
    },
  },
  {
    id: 'N34', col: 'done', size: 'M', tag: 'content',
    title: 'The desktop is commentary, not narration',
    note: 'Nothing introduces the shared desktop. It answers back when you touch it.',
    detail: {
      why: "Nam: \"nothing to introduce here, its self explanatory. This is more a commentary when player gets curious and clicking around... Short and punchy, so we can go back to whatever we were talking about.\"",
      done: [
        'The desktop part leaves the primary flow',
        'Quips on drag, snap, minimise, the clock, the calendar, wifi and the tray',
        'Each quip fires once and is never cycled back',
        'The brief line stays as the first thing said',
      ],
      raised: 'Nam, QA 27 Aug, point 5',
      notes: 'QA in a browser: the Start-menu quip fired once and stayed quiet on the second press.',
    },
  },
  {
    id: 'N35', col: 'done', size: 'S', tag: 'content',
    title: 'Wasabi: the pap-pap-pap rewind',
    note: 'Scroll past seven years of work in under three seconds and the tour scrolls you back.',
    detail: {
      why: "Nam: \"I really want to get playful here... Pap pap pap.. 7 years of my life is only worth 3s of your time? Come back! Then we scroll up to the top of the page. Then we go Just kidding and scroll back to the place it was triggered.\"",
      done: [
        'A bail under three seconds triggers it',
        'The document scrolls back to the top',
        '"Just kidding", and it returns to exactly where it was',
        'The scroll position is remembered, not guessed',
        'It fires at most once',
      ],
      raised: 'Nam, QA 27 Aug, point 6',
      notes: 'QA caught it firing at the tour itself: a programmatic scrollTop dispatches a scroll event indistinguishable from a wheel, and isTrusted does not separate them, the browser marks scroll events trusted whoever caused them. The hand rolled to the Wasabi years and then accused the visitor of skipping them.',
    },
  },
  {
    id: 'N36', col: 'done', size: 'M', tag: 'content',
    title: '"How this was built" opens the real page',
    note: 'The mock browser’s tab was a stale drawing. It shows the document the home screen shows.',
    detail: {
      why: "Nam: \"Oh damn this page is outdated! We actually have a how this was built page that we show in home screen. We need to show that here in the mock browser.\" Two copies of the same document is how they start disagreeing, and this pair already had.",
      done: [
        'The tab frames the real built document',
        'The tour navigates to it rather than cutting to it',
        'Banter as the tabs are flipped, one-shot',
      ],
      raised: 'Nam, QA 27 Aug, point 6b',
      notes: 'QA in a browser: the tab is in the default strip, the tour opens it, and it frames the real document rather than a second drawing of it.',
    },
  },
  {
    id: 'N37', col: 'done', size: 'S', tag: 'content',
    title: 'Accessibility and tests leave the main flow',
    note: 'They only speak when the visitor opens them.',
    detail: {
      why: "Nam: \"Accessibility and tests are not in the main flow, only triggered when user actually navigate to these in the right panel... look, the CV is the main part and the rest should probably be all commentary, short and punchy.\"",
      done: [
        'Neither is reached by the script',
        'Both keep a commentary register on their triggers',
        'The primary flow gets shorter, which is the point',
      ],
      raised: 'Nam, QA 27 Aug, point 7',
      notes: 'Neither is reachable from the script any more. Both kept their commentary.',
    },
  },
  {
    id: 'N38', col: 'done', size: 'M', tag: 'content',
    title: 'The personal story, and the questions it answers',
    note: 'One uninterrupted segment on sufficient downtime, answering what a hiring manager actually wants to ask.',
    detail: {
      why: "Nam: \"we have some personal storytelling that is triggered during sufficient down time, ideally after we have introduced all the fun part, and once triggered it will run uninterrupted. This will answer the core questions that a hiring manager would have.\"",
      done: [
        'Runs only after the flow has covered the demonstrable parts',
        'Runs only after real downtime, not after a pause',
        'Uninterruptible once started, except by Stop',
        'The questions it answers are listed in the script editor beside it',
      ],
      raised: 'Nam, QA 27 Aug, point 7',
      notes: 'QA caught it starting four seconds after the goodbye: silence was measured from the last INPUT, and a visitor who has touched nothing has been silent all along. It is measured from the later of the last input and the flow ending now.',
    },
  },
  {
    id: 'N39', col: 'done', size: 'S', tag: 'trust',
    title: 'BUG: "The posting, line by line" renders empty',
    note: 'The tab in the shared browser shows a heading and a note and nothing else.',
    detail: {
      why: 'The requirement map is gated on a company code, and the deployed link carries none, so a tab titled Google Careers opened onto an apology. Nam: "this page is empty? It was fine before."',
      done: [
        'The mapping renders without a company code',
        'The heading names which posting it is measured against',
        'The gate stays where it is genuinely needed',
      ],
      raised: 'Nam, QA 27 Aug, point 8',
      notes: 'T7 put the gate there for a real reason, measuring a reader against a posting their company never advertised. The tab is Google-branded either way, so the honest fix is to name the posting rather than hide the answer. QA in a browser: the mapping renders with no company code, under a heading that names which posting it is measured against.',
    },
  },
  {
    id: 'N40', col: 'done', size: 'M', tag: 'content',
    title: 'The job-requirement act, bridged straight off the CV',
    note: '"So how do these score against the job requirement? I’ve got you covered." Then it goes and shows you.',
    detail: {
      why: "Nam: \"Oh damn I completely forgot the part against the job requirement!... then navigate to the google career tab, then slowly scroll through everything with playful commentary.\" It is the single most load-bearing screen for the actual reader and it was not in the script at all.",
      done: [
        'The act follows the CV with no seam',
        'The cursor opens the Careers tab and scrolls it',
        'Requirement-by-requirement banter, escalating',
        '"And you get a check. And everybody gets a check."',
      ],
      raised: 'Nam, QA 27 Aug, point 8',
      notes: 'QA in a browser: the act bridges off the CV with no seam and scrolls the posting 926px.',
    },
  },
  {
    id: 'N41', col: 'done', size: 'M', tag: 'call',
    title: 'Off the clock: play the clips they have not found',
    note: 'Track which eggs the visitor has seen and walk them through the remainder.',
    detail: {
      why: "Nam: \"here we need to track which of the easter eggs they have found, then we walk them through the rest, earning them the remaining achievements.\"",
      done: [
        'Seen clips are remembered across visits',
        'The act plays only the ones still unseen',
        'It says what it is playing and why',
        'It closes on the corny line, and calls itself corny',
      ],
      raised: 'Nam, QA 27 Aug, point 9',
      notes: 'QA in a browser: three unseen clips played, and a second run said "…which you have already found. All of them.", so the record survives a reload.',
    },
  },
  {
    id: 'N42', col: 'done', size: 'S', tag: 'content',
    title: 'The close has to close',
    note: 'Say the tour is over, hand the machine back, thank them.',
    detail: {
      why: "Nam: \"VERY IMPORTANT! Signal to them that this is the end of the tour, they are free to explore the rest, thank them for their time.\" A demo that just stops talking leaves the visitor waiting for the next line instead of exploring.",
      done: [
        'It says, in words, that the tour is finished',
        'It says what is left to look at',
        'The cursor leaves the screen rather than parking on a control',
        'Thanks, once, and without a pitch attached',
      ],
      raised: 'Nam, QA 27 Aug, point 10',
      notes: 'QA in a browser: it says in words that the tour is finished, and the hand leaves the screen.',
    },
  },
  {
    id: 'N43', col: 'done', size: 'M', tag: 'specs',
    title: 'The script editor separates flow from commentary',
    note: 'Two lists, not one: what the tour will say, and what it only says back.',
    detail: {
      why: "Nam: \"the scripts, I want to see the separation between the primary flow, vs what we do only as commentary.\" With commentary mixed into the same list there was no way to read the running time of the actual demo.",
      done: [
        'The primary flow is listed in order with a running time',
        'Commentary quips are listed separately, by trigger',
        'The acknowledgement pool is shown by tier',
        'The hiring-manager questions are listed beside the story segment',
      ],
      raised: 'Nam, QA 27 Aug, point 10 ("add all of these to the kanban board")',
      notes: 'Two lists. The flow has a running time that means something for the first time, because throwaway lines stopped counting toward it.',
    },
  },
  /* ---------------------------------------------------------------------
   * Nam's QA of 27 August, second pass: the tour stops being a tour.
   *
   * The whole batch comes from one observation. He watched the call's own
   * caption loop resume after the tour said goodbye and liked it BETTER than the
   * script it interrupted -- "sounds very casual actually" -- and the diagnosis
   * followed: the thing narrating his CV had been written as a guided tour, and a
   * guided tour is not what a call is. So the loop is not a second script to be
   * tidied away. It is the register the first one should have had.
   * ------------------------------------------------------------------- */
  {
    id: 'N44', col: 'done', size: 'M', tag: 'content',
    title: 'It is a conversation, not a tour',
    note: 'Rename it everywhere the visitor can see, because the word was shaping the writing.',
    detail: {
      why: 'Nam: "I actually dont like that it was a tour, no this is a real attempt at talking to the user." The word was not only in the labels. It was in the prose, and a script that thinks of itself as a tour writes lines that introduce sections instead of lines that talk to somebody.',
      done: [
        'No visitor-facing string says "tour"',
        'The Stop control says what it actually stops',
        'The achievement and its hint are about hearing him out, not about a walkthrough',
        'The Scripts panel describes one script, not a tour script plus a loop',
      ],
      raised: 'Nam, QA 27 Aug, second pass',
      notes: 'The internals keep the tour/ directory and the TourState type: renaming a pure module nothing reads out loud costs a diff and buys nothing. The line between them is whether a stranger can see the word.',
    },
  },
  {
    id: 'N45', col: 'done', size: 'M', tag: 'content',
    title: 'Fold the caption loop into the one script',
    note: 'Line by line, on Nam’s own call: keep, merge, drop, rewrite.',
    detail: {
      why: 'Two scripts on one surface meant the better-sounding one only ever played when nobody was being talked to. The verdict column in the Scripts panel existed to make the merge decidable; this is the merge.',
      done: [
        'Lines 0 and 1 open the conversation, before the share',
        'Lines 3 and 4 merged into the current-position segment; line 2 dropped as a duplicate',
        'Line 5 dropped, line 10 dropped',
        'Lines 6 and 7 kept, with the award replaced by the book chapter',
        'Line 8 dropped as a duplicate; line 9 kept and placed in the build segment',
        'The standalone loop is gone, and nothing plays behind the script any more',
      ],
      raised: 'Nam, QA 27 Aug, second pass',
      notes: 'Line 7 was "a best-paper award" and is now the book chapter, on his instruction. Both are in the CV; the chapter is the less familiar claim and the harder one to have made up.',
    },
  },
  {
    id: 'N46', col: 'done', size: 'L', tag: 'call',
    title: 'The script has a clock, and a click moves it',
    note: 'Every line carries the second it is due. A trigger cuts the current segment short instead of queueing behind it.',
    detail: {
      why: 'Nam: "timestamp when the text is shown, and what mouse event it triggers, which would also work the other way around." Without a clock there was no way to say how long the conversation is; without the fast-forward, clicking ahead meant waiting for the segment you had just left to finish talking.',
      done: [
        'Every flow line has a derived timestamp, shown in the Scripts panel',
        'The panel states the total running time from the same numbers',
        'A visitor trigger cuts the current segment at the line it is on',
        'The cut segment counts as covered, so it is not re-narrated later',
        'The timestamps are derived, not authored, so they cannot drift from the dwells',
      ],
      raised: 'Nam, QA 27 Aug, second pass',
      notes: 'Derived rather than authored on purpose. An authored `at` beside an authored `ms` is two sources of truth for one fact, and the panel exists to be trusted.',
    },
  },
  {
    id: 'N47', col: 'done', size: 'L', tag: 'call',
    title: 'Captions arrive word by word',
    note: 'Typed out rather than pasted, paced by punctuation. Click to see the whole line.',
    detail: {
      why: 'Nam: "I want to display word by word kinda similar to how its capturing real human voice." A whole sentence appearing at once is a subtitle file; live captions arrive as the words do.',
      done: [
        'Words appear one at a time, paced by length and punctuation',
        'A comma rests shorter than a full stop, and an em dash longer than either',
        'The screen-reader announcement is the authored line, once, not a word at a time',
        'Reduced motion shows the whole line at once',
        'A press on the bubble, or on the empty stage, completes the line',
      ],
      raised: 'Nam, QA 27 Aug, second pass',
      notes: 'The hesitations Nam also asked for shipped with this and were then removed, see N53. The reveal itself was never the problem.',
    },
  },
  {
    id: 'N48', col: 'done', size: 'M', tag: 'trust',
    title: 'The caption holds for as long as you need it',
    note: 'A filling ring on the bubble. Hover pauses it, a press skips it.',
    detail: {
      why: 'Nam: "player can read fast, slow, whatever and we can accommodate for it." Authored durations are a guess at one reading speed. This makes the guess a default rather than a rule, which is an accessibility fix wearing a game mechanic’s clothes.',
      done: [
        'The end screen’s ring motif is reused rather than a second progress idiom invented',
        'The ring fills over the line’s authored dwell and advances at full',
        'Hovering the caption pauses the ring, leaving restores it',
        'A press on the bubble or the empty stage advances immediately',
        'The same mechanism drives every line, so nothing is on a separate clock',
      ],
      raised: 'Nam, QA 27 Aug, second pass',
      notes: 'The dwell became the only clock the script runs on, which is why N46 could derive a timeline from it at all.',
    },
  },
  {
    id: 'N49', col: 'done', size: 'M', tag: 'content',
    title: 'Post-conversation banter, and then real silence',
    note: 'Why are you still here. Spacing out, under two minutes, with an achievement for sitting through it.',
    detail: {
      why: 'Nam: "There is nothing more to see here. I swear ... some more stuff like this, spacing out more and more, but no longer than 2min." The goodbye is the correct place to stop talking, so anything after it has to earn the attention, which is exactly what a joke that keeps getting further apart does.',
      done: [
        'The gaps grow, and the whole outro fits inside two minutes',
        'Sitting through all of it unlocks a secret achievement',
        'It ends with a real goodbye and thanks',
        'The hand turns the captions off, mirroring the press that turned them on',
        'Any input abandons it without penalty',
      ],
      raised: 'Nam, QA 27 Aug, second pass',
      notes: 'Secret rather than listed. A hint reading "sit still for two minutes after the end" spoils the joke and reads as a chore; the other three secrets are hidden for the same reason.',
    },
  },
  {
    id: 'N50', col: 'done', size: 'S', tag: 'specs',
    title: 'BUG: "How this was built" was a second copy of the spec',
    note: 'The browser tab now opens the Project spec itself, tabs and all.',
    detail: {
      why: 'Nam: "how this was built was still the wrong page, it should open the project spec that we are already showing in home screen." The tab rendered buildDoc() alone, which is one section of the spec’s Overview, so the shared screen showed a document that looked like the spec, was missing four of its five tabs, and could drift from it.',
      done: [
        'The tab renders the same tabbed spec the home screen opens',
        'One component, two hosts: a dialog from the chrome, a page inside the share',
        'The script segment about the build still scrolls and still lands',
      ],
      raised: 'Nam, QA 27 Aug, second pass',
      notes: 'Extracted rather than duplicated. The dialog keeps the focus trap and the scrim; the page gets the body and nothing else, because a modal inside a fake browser window would trap focus in a screenshot.',
    },
  },
  {
    id: 'N51', col: 'done', size: 'M', tag: 'call',
    title: 'Time the interview, and say so at the end',
    note: 'The clock runs from the first line to the goodbye. The outro does not count.',
    detail: {
      why: 'Nam: "I want to capture the time user spent on the call such that they finish the whole conversation. This is to add gamification to this CV which is my expertise." It also makes the derived timeline of N46 checkable against reality rather than only against itself.',
      done: [
        'The clock starts on the first spoken line and stops at the goodbye',
        'The outro is excluded, so banter cannot inflate it',
        'Only a run that heard the whole conversation is recorded',
        'The ended screen reports the time, and the personal best beside it',
        'Nothing leaves the machine',
      ],
      raised: 'Nam, QA 27 Aug, second pass',
      notes: 'The personal best is in localStorage next to the quests. Comparing against the derived benchmark is the interesting number: skipping every line with a press is genuinely faster than the authored clock.',
    },
  },
  {
    id: 'N52', col: 'backlog', size: 'L', tag: 'trust',
    title: 'A leaderboard for the interview time',
    note: 'Wanted, and blocked on a promise this build makes in four places. The bot-manager server is the wrong shape for it.',
    detail: {
      why: 'Nam: "Would be awesome if we have a way to have a leaderboard here, who is fastest to complete the interview LOL." And there is real depth under the joke: fast-forwarding lines, and triggering a segment early so the one before it gets cut, are both genuine strategies that lower the total.',
      done: [
        'A decision on the no-backend promise, made deliberately rather than by accident',
        'If it ships: a submit that is opt-in, carries no identifier the visitor did not type, and is rate-limited',
        'If it ships: the four places that promise no backend are corrected in the same commit',
      ],
      raised: 'Nam, QA 27 Aug, second pass',
      notes: 'Blockers, in order of how hard they are to argue with. (1) The page states "no analytics, no third-party requests and no backend" on the ended screen, in the meeting-ready card, in the Project spec and in the README, a leaderboard makes all four false, and for a CV about trustworthy engineering that is a worse trade than the feature is worth. (2) The CSP is connect-src ‘self’ with no exceptions, so any host would have to be named in the policy, which is exactly where a reader looks to check claim (1). (3) A public leaderboard on a job application collects timings from named hiring managers, which is a data question rather than a feature question. (4) The bot-manager server is on the React client: a different origin with a different lifetime, and if it stops the CV becomes a site with a broken widget on it. If it ships at all it wants a separate endpoint the CV can lose without noticing, and the honest version is a local personal best, which is what N51 shipped.',
    },
  },

  {
    id: 'N53', col: 'backlog', size: 'S', tag: 'content',
    title: 'REVERTED: the hesitations placed themselves before the punchlines',
    note: 'Automatic placement is out. Where an "uh" goes is a writing decision, and it is waiting on Nam.',
    detail: {
      why: 'Nam asked for "a little uh, ah, and stuff that would be in a normal casual speech", and the first attempt derived the placement from the text: clause boundaries, a rarity gate tuned by counting against the real script, three separate hashes so nothing correlated. It produced exactly two hesitations in thirty-four lines, always in the same place, costing the line no time, and both of them landed immediately before a punchline. Nam: "they are pausing right before the punch line!?! How the heck is that good?"',
      done: [
        'The automatic insertion is gone, and the dimmer style with it',
        'The seven tests that measured its rate, determinism and variety are gone',
        'The word-by-word reveal, the dwell ring and the press-to-skip are untouched',
        'Placement, when it returns, is authored per line rather than derived',
        'And it stays a rendering concern: no "uh" in data/tour.ts',
      ],
      raised: 'Nam, QA 28 Aug',
      notes: 'The lesson is not that the rate was wrong, the rate was right, and a test asserted it. A clause boundary near the end of a sentence is exactly where the setup hands over to the joke, so the better the gate got at finding natural pauses, the more reliably it found the one place a stumble must never go. Punctuation is all an algorithm can see; where the joke is lives in the meaning, and the writer is the only one holding that. A counting test cannot catch this: it will green-light every instance of a thing happening in the worst possible place.',
    },
  },

  {
    id: 'N54', col: 'done', size: 'M', tag: 'trust',
    title: 'The CV always opens as an overlay',
    note: 'Four of the five ways in were routing to it instead, which replaced the whole screen.',
    detail: {
      why: 'Nam: "Everytime we open the CV it should match the same way we show the CV in the home screen: a popup screen, not full screen ... I want you to run a check through out this site." Only the home screen used the overlay; everywhere else dispatched the #plain route, which is the one thing this build claims it never does, since Meet does not navigate away from itself.',
      done: [
        'The ended screen, Host controls, the Explorer fallback and the D shortcut all open the overlay',
        'The #plain route is untouched: recruiters are sent there and the overlay frames it',
        'Project spec openers were already correct, all four go through openDev()',
        'Verified in a browser from all five entry points',
      ],
      raised: 'Nam, QA 28 Aug',
      notes: 'The audit turned up a quest that had stopped being reachable properly: "plain" unlocked inside the route, so the home screen overlay never counted it. One registration in main.ts now decides what opening the CV means, wherever it happens.',
    },
  },
  {
    id: 'N55', col: 'done', size: 'M', tag: 'call',
    title: 'A line with a mouse interaction is a cutscene',
    note: 'It cannot be skipped past its beat. The hand hurries instead.',
    detail: {
      why: 'Nam: "we cannot skip the line past getting these interactions, cause otherwise we lose the trigger and the mouse is frozen forever ... So mouse interactions are kinda like cutscenes that you cant skip xD." A correctness fix rather than a nicety: the beats are what make the rest of the script possible, and every later segment declares what it needs.',
      done: [
        'The caption locks for the duration of a beat, and a press cannot end the line',
        'A press still completes the words, and is remembered so the line ends the instant the beat does',
        'A press during a beat makes the hand move at a third of the time',
        'The press is swallowed rather than passed to the app while locked',
        'Verified by pressing 32 times through the share: it still completed, all five tabs opened',
      ],
      raised: 'Nam, QA 28 Aug',
      notes: 'Three bugs found in QA, all ordering. The lock was taken before the line was spoken, and speaking a line clears the lock, so it locked nothing. The press was absorbed by the caption and then passed on to the page anyway, which dismissed the share picker: the very press meant to hurry the share was cancelling it. And awaiting the line and the beat together deadlocked, because the line cannot resolve until unlock and unlock came after both.',
    },
  },
  {
    id: 'N56', col: 'done', size: 'M', tag: 'call',
    title: 'The hand opens the easter-egg clips',
    note: 'Explorer, into Hobby, double-click the file. The last thing in the script that cheated.',
    detail: {
      why: 'Nam: "when you are showing the easter eggs, you just auto triggering the videos - I dont like that. We should do that with the mouse interaction to keep it consistent. The mouse will open the video, so its really like a real human to the very end." Everything else is performed through the product’s own controls, and this was the one place a thing appeared because the code put it there.',
      done: [
        'Explorer is raised if it is running and launched from the taskbar if it is not',
        'The tree navigates to Hobby, where the clips already live as real files',
        'Each clip is opened with a genuine double click on its row',
        'The player window is reused between clips, which is the product’s own behaviour',
        'A missing row is skipped and its line still plays, like any other beat',
        'No desktop share means nothing to press, so the old direct route runs instead',
      ],
      raised: 'Nam, QA 28 Aug',
      notes: 'Two things had to be built rather than wired. The hand had no double click, and a single press on a file row SELECTS it while a second press on a selected row starts a rename after 260ms, so open() sends two presses and then the dblclick that cancels the rename and acts. And playEgg rebuilt the whole share with a clip booted into it, which tore down the desktop the hand was standing on; going through Explorer means pressing surfaces that already exist. QA also caught a bug this exposed rather than caused: reusing the player updated the record’s title and the blurb but never the .wx-title span, so the window read "Falling out of a plane" over an entirely different clip. Invisible while every clip arrived in a fresh window.',
    },
  },
  {
    id: 'N57', col: 'done', size: 'S', tag: 'content',
    title: 'No em dashes anywhere, and a gate',
    note: '153 of them across 26 files, and a build step so the next one cannot land.',
    detail: {
      why: 'Nam: "control the whole site to make sure we dont have em dashes thks!" A careful pass cannot hold this. The character is easy to type, easy to paste in from a document, and invisible in a diff unless you are looking for it.',
      done: [
        'Em dashes are banned in string literals and allowed in comments',
        'En dashes are kept in ranges and banned in prose, told apart by whitespace',
        'tools/no-em-dash.mjs runs in verify beside the CSS gates',
      ],
      raised: 'Nam, QA 28 Aug',
      notes: 'The interesting part was automating the replacement. A blanket comma is grammatical but leaves a splice wherever the dash was doing a colon’s job, and it did that in twenty-one places. Those are colons and full stops now; the fifteen cases of ", which ..." were left alone, since a non-restrictive clause is what a comma is for.',
    },
  },

  /* ------------------------------------------------------------------------
   * Nam's script pass of 28 August. He read the whole conversation back line by
   * line and rewrote most of it, plus one new mechanic that is bigger than the
   * rest of the pass put together (N59).
   * --------------------------------------------------------------------- */
  {
    id: 'N58', col: 'done', size: 'S', tag: 'content',
    title: 'The opening stops counting achievements out loud',
    note: 'It hands over a different goal instead: there are bugs in here.',
    detail: {
      why: 'Nam: "3. While I talk, click around if you want. Lots of bugs here ;) / 4. First, let me get my screen up." Naming a number was N30’s idea and it was a good one while the achievements were the only game. They are not any more, and "all 17 achievements" is a chore handed to a stranger in the third sentence. A wink about bugs is an invitation that costs nothing to decline.',
      done: [
        'Line 3 promises bugs rather than a count',
        'Line 4 says "First", so the share reads as the first of several things',
        'The test that pinned the count against the quest list is retired with the line it guarded',
      ],
      raised: 'Nam, script pass 28 Aug',
    },
  },
  {
    id: 'N59', col: 'done', size: 'L', tag: 'call',
    title: 'The bug collection',
    note: 'Twelve bugs hidden across the site, caught by repetition, pinned in a real entomology frame.',
    detail: {
      why: 'Nam: "This is like the same as easter eggs, but reward a different kind of exploration: the developer’s dedication ... the bugs here are different. We basically have a collection ... user needs to catch them all pokemon style." The achievements reward breadth: touch each thing once. Nothing rewarded going back to the same thing to see whether it still holds up, which is the actual habit of somebody who tests software. Repetition is the mechanic because repetition is the behaviour.',
      done: [
        'A registry of twelve bugs: name, species, where it hides, the hint, and the fact',
        'Each is caught by doing one thing three times, or by one deliberately obscure act',
        'Catching one raises a toast like an achievement, with the bug drawn in it, reading "New bug"',
        'The ended screen opens a frame: caught bugs painted, uncaught ones silhouettes',
        'A silhouette still shows its hint. A caught bug shows the species and the facts',
        'Every bug is an authored SVG, no bitmaps and no third-party requests',
        'The list, the hiding places and the art are all documented in the Project spec',
      ],
      raised: 'Nam, script pass 28 Aug',
      notes: 'QA found one leak worth recording, because it is the kind that survives a code review. Every trigger runs through one delegated listener that ignores untrusted clicks, which is what stops the conversation catching bugs on the visitor’s behalf, and the scarab is the single exception: it is awarded from inside the raise-hand handler, and a handler cannot see who called it. The close performs "Raise your hand" with the hand, so the script was quietly banking a third of a bug. Driving it in a browser is what showed it, and the fix is one boolean. Art was the interesting constraint. Twelve bespoke illustrations is a week of drawing, and twelve copies of one beetle is not a collection. So the drawing is parametric: eight body plans, scarab, jewel, longhorn, cicada, swallowtail, birdwing, mantis and leaf, each taking a palette and a set of proportions. A silhouette is the same geometry with one flat fill, which is why an uncaught bug has exactly the right outline and gives nothing else away.',
    },
  },
  {
    id: 'N60', col: 'done', size: 'M', tag: 'content',
    title: 'The CV section, in his own words',
    note: 'Five lines rewritten, one split in two so the hesitation has somewhere to land.',
    detail: {
      why: 'Nam went through the section line by line. The platform line was wrong in a way only he would catch: it said "Desktop, then web, then a Unity renderer embedded in a React app", and the real sequence is Desktop, Dart, Unity, React Native. The cross-team line lost its midnight-support flourish because the true list is longer and duller and includes marketing.',
      done: [
        'Seven years leading front end, four players, one shared board',
        'Desktop, then Dart, then Unity and finally Native React',
        'Design, backend, marketing, QA',
        'The skills line splits, so "Claude, uh, made this whole section redundant LOL" is its own beat',
        'Education gains a punchline instead of trailing off',
      ],
      raised: 'Nam, script pass 28 Aug',
      notes: 'The "uh" is the return of the hesitation N53 reverted, on the terms N53 set: authored, not derived. The word is in the line because Nam put it there, and the caption renderer holds on it the way it holds on a full stop. Placement is a writing decision and it is now written down.',
    },
  },
  {
    id: 'N61', col: 'done', size: 'S', tag: 'content',
    title: 'The job requirement section ticks rather than says "check"',
    note: 'Emoji carry the repetition, and the Oprah bit is replaced.',
    detail: {
      why: 'Nam: "we can use the emoji here for check to lessen the reading load." Four spelled-out "check"s in one caption is a lot of reading for a joke about how little reading is required. And on the punchline: "here I meant to land a punchline, but I couldnt think of anything else better. Help."',
      done: [
        'Lines 3 and 4 use a tick glyph instead of the word',
        'Line 4 names the real four: front end, algorithm, architecture, QA',
        'The Oprah line is gone, replaced with one that points at the evidence',
      ],
      raised: 'Nam, script pass 28 Aug',
      notes: 'The replacement is "I ran out of requirements before I ran out of evidence." It lands because it is the only claim on this page that the page itself can settle: everything named is a thing the visitor can click.',
    },
  },
  {
    id: 'N62', col: 'done', size: 'S', tag: 'content',
    title: 'The build section names the budget and stops selling the tests',
    note: 'A number instead of "there is a size budget", and a line about games instead of a second test pitch.',
    detail: {
      why: 'Nam: "Let’s mention the actual size budget here instead of being vague about it", and on the tests line, "remove, not really relevant." He is right about the second one: the tests already have a quip, a panel and a switch that breaks them. Saying it here too is the third pitch for the same feature.',
      done: [
        'The budget line says 50 kB gzipped, which is the number in build.mjs',
        'The measurement line drops its trailing clause, the wrong measurement has its own home in the Spec panel',
        'The tests line becomes a line about the game layer instead',
        'The closing line is his: "One person and an agent, one week. The most fun I have had in months"',
      ],
      raised: 'Nam, script pass 28 Aug',
    },
  },
  {
    id: 'N63', col: 'done', size: 'M', tag: 'call',
    title: 'Off the clock is generous with the clips',
    note: 'It plays every one the visitor has not found, and credits them for it.',
    detail: {
      why: 'Nam: "show the achievement as the video plays. We complete these easter eggs for user. We can be generous here, now that we add in the bugs too that we will not be generous about." The two mechanics need different postures. The achievements are a guided walk of the surface and handing them over costs nothing. The bugs are the thing worth hunting, so they are never given away.',
      done: [
        'It plays all the unseen clips rather than the first three',
        'The Off the clock quest unlocks as they play',
        'The opening line is "And here is how I have fun after work"',
        'The Hollywood apology is gone',
      ],
      raised: 'Nam, script pass 28 Aug',
    },
  },
  {
    id: 'N64', col: 'done', size: 'M', tag: 'call',
    title: 'The close demonstrates the three things it names',
    note: 'Open the chat, drag the video, raise your hand: each one is performed, not described.',
    detail: {
      why: 'Nam: "Each of these action, we demo it with the mouse. Might need to break it into 3 lines to trigger mouse interaction." A line that says "drag the windows" and then does nothing is the one moment in the script where the demo talks about itself instead of running.',
      done: [
        'One line per action, each with its own beat',
        'The side controls carry a data-ctl so the script can name them',
        'A drag cue that really drags the video tile to another corner',
        'The plain-document line becomes "The CV is also available in home screen and after this meeting"',
      ],
      raised: 'Nam, script pass 28 Aug',
      notes: 'The drag is synthetic pointer events along the hand’s own path. The tile’s drag handler already tolerated them, which was luck rather than design: it guards setPointerCapture in a try because a synthetic PointerEvent carries no real pointer. That guard is what makes this two lines instead of a rewrite.',
    },
  },
  {
    id: 'N65', col: 'done', size: 'M', tag: 'content',
    title: 'The personal segment, rewritten in his voice',
    note: 'Eight answers, and two of the questions no longer have to be guessed from the answer.',
    detail: {
      why: 'Nam rewrote all eight. The strongest note is on the last one: "I dont understand this question. What risk is there in hiring me LOL." He is right that it was a defensive frame borrowed from a hiring conversation he is not having. And on the collaboration answer: "This is one part where the question doesnt appear intuitively from the answer", which is a real failure, the questions are printed in the Scripts panel but they are never spoken.',
      done: [
        'Why now, what he likes, strengths, weaknesses, collaboration, being wrong, the hardest thing, and why him',
        'Two answers now restate their own question in the first clause',
        '"Why should we take the risk" becomes "Why me"',
        'The measured-things and getBoundingClientRect boasts go, the page makes that argument by existing',
      ],
      raised: 'Nam, script pass 28 Aug',
      notes: 'The Google line in the second answer is the only company-specific sentence in the whole script, which is what forced N66.',
    },
  },
  {
    id: 'N66', col: 'done', size: 'S', tag: 'trust',
    title: 'Google is the default, not a code',
    note: 'The neutral build stays reachable, it just stops being what a stranger gets.',
    detail: {
      why: 'Nam: "regarding the company, I think let’s all in for google first, so let’s just treat the default CV (without c parameter as c = 1, so google cv is the default). Lets try our chance with google first before reusing the CV for other job ads." The multi-employer machinery was built for a reuse that has not happened yet, and it was costing the send it was actually built for: the one application in flight was the one rendering a generic heading.',
      done: [
        'No code resolves to the Google pitch',
        '?c=0 resolves to the neutral build, so the reusable version is still one parameter away',
        'The tab title, the meeting name, the chat opener and the job-ad section all name the employer by default',
      ],
      raised: 'Nam, script pass 28 Aug',
      notes: 'A default is a one-line change and an escape hatch is not. ?c=0 had to become a real code rather than an unknown one, because codeFromUrl treats an unrecognised value as absent, which now means Google.',
    },
  },
  {
    id: 'N67', col: 'done', size: 'M', tag: 'call',
    title: 'The outro counts what is left, and takes its time',
    note: 'The tease names the real number of eggs and bugs still out there, and the silences stretch.',
    detail: {
      why: 'Nam: "Lets make this dynamic. Not 2 easter eggs, but however many easter eggs left. And we add the remaining bugs too." A hardcoded two was already wrong for anyone who had found one. And on the pacing: "This is the time user is exploring the app, we want to keep the caption on for the commentary messages. Plus, the timing of the call has already finished by the goodbye, so stretching out the after goodbye doesnt cost user anything literally."',
      done: [
        'Outro lines are templates, resolved against what this visitor has actually found',
        'The line is skipped entirely when there is nothing left to tease',
        'The silences stretch, and the two-minute cap goes up to four with them',
        'The gaps-only-grow rule and the no-long-bubble rule still hold',
      ],
      raised: 'Nam, script pass 28 Aug',
      notes: 'The cap was never about the outro being too long, it was about a visitor being trapped in something they cannot see the end of. Any input abandons it, so the cap is a promise about the worst case rather than a budget. Doubling it is safe for exactly the reason Nam gives: the interview clock stopped at the goodbye.',
    },
  },

  /* ------------------------------------------------------------------------
   * Nam's review of the collection, 28 August. He drove the whole thing and
   * came back with nine notes, one of which was a dead call on the second visit
   * (N73) and one of which cannot be fixed here at all (N76).
   * --------------------------------------------------------------------- */
  {
    id: 'N68', col: 'done', size: 'M', tag: 'call',
    title: 'Catching a bug is something you watch, not something you are told',
    note: 'It flies out of the control you pressed, holds in the middle of the screen, and goes into the notice.',
    detail: {
      why: 'Nam: "The bug appearing: barely visible at all, it should be animated from where the place we should have clicked ... an animation of the bug coming to the middle of the screen, a bit of shaking animation and a bit of glow, then it quickly moves into the toast that appears. Timing here is important for this to feel polished." The first version put a 64px beetle behind the raise-hand gag and everything else got a notice in the corner, which is the same reward a checkbox gets.',
      done: [
        'The origin is the control that was pressed, threaded down from the click listener',
        '620ms out to the middle, 900ms of shake and glow at full size, 460ms into the notice',
        'The notice is built and measured first, so the last leg flies to a real position',
        'It stays hidden until the bug lands in it',
        'The scarab keeps its gag: the hand launches when the bug arrives and flattens it 575ms later',
        'Reduced motion gets the notice and nothing else',
      ],
      raised: 'Nam, review 28 Aug',
      notes: 'The ordering was the whole job. The hand used to fire on the press, which put its impact at 575ms and the bug arriving at 620, so it swatted an empty screen and the beetle turned up afterwards. The catcher owns the clock now and calls back when the bug has landed, which is the only arrangement where the two animations can be authored independently and still agree.',
    },
  },
  {
    id: 'N69', col: 'done', size: 'L', tag: 'specs',
    title: 'The collection becomes a Meet dialog',
    note: 'The wood went, the pins went, the height stopped jumping, and it gained a rail item.',
    detail: {
      why: 'Nam: "Please make sure this collection fully follows the design principles of google meet. The colors, the hovering and click effects, the label popup ... I want this collection frame to be BEAUTIFUL, and in the same design language as google meet." The first pass took the photograph literally and built a varnished case, which was the one surface in this build with a texture on it.',
      done: [
        'M3 dialog: 28px radius, elevation 3, the light shell palette, .08 and .12 state layers',
        'The header is symmetric, which Nam measured and it was not',
        'The pin heads are gone',
        'The case is a fixed height sized for the longest entry, so selecting a specimen never resizes it',
        'Slots use Meet tooltips rather than title attributes',
        'A Bugs item appears in the rail under Calls once one is caught',
        'Rarity is shown on the card, caught or not',
      ],
      raised: 'Nam, review 28 Aug',
      notes: 'Verified by clicking all twelve and measuring the dialog after each: 550px, twelve times. The rail glyph had to be drawn, since the 7 kB Material subset this project ships has no bug in it, and it is outlined rather than filled because its two neighbours are and a solid mass beside them reads as the selected item.',
    },
  },
  {
    id: 'N70', col: 'done', size: 'M', tag: 'content',
    title: 'The hints stop handing over the answer',
    note: 'Riddles instead of instructions, no repeat counts, and a rarity tier that says how hard each one is.',
    detail: {
      why: 'Nam: "Including the amount of times you have to do it is way too on the nose, remove that. Then some hints are also very on the nose. Keep pressing the thing that is a picture of wifi. What the heck, this is like giving away exactly where the bug is." Both halves were true. A hint carrying the count turns a discovery into an instruction, and one naming the control turns it into a link.',
      done: [
        'All twelve hints rewritten as riddles, none of them naming a control or a number',
        'A rarity tier per bug: four common, four uncommon, three rare, one legendary',
        'Rarity shows on the card and in the answer key, whether or not it has been caught',
        'The ended-screen card no longer says how many presses either',
      ],
      raised: 'Nam, review 28 Aug',
      notes: 'Rarity is a property of the HINT rather than of the trigger, and saying so in the data module matters: every one of these is a few presses on something already on screen, so the only thing that can vary is how much of the riddle is left to the reader. A tier that only appeared after catching would be telling you something you no longer need.',
    },
  },
  {
    id: 'N71', col: 'done', size: 'M', tag: 'call',
    title: 'Ctrl and the wheel, in the mock browser',
    note: 'Real zoom, per tab, with Chrome’s own ladder. The conversation uses it to fit the spec on screen.',
    detail: {
      why: 'Nam: "the browser when showing the project spec I think we should zoom out a little bit just so we can see everything. do the zoom with the mouse too, kinda like you intentionally zoom out. Is it implemented at all? Ctrl + mouse wheel on the mock chrome? Maybe we should do that." It was not implemented at all, and it is the gesture people reach for inside a page that will not fit, so its absence is what makes an emulation feel like a picture of a browser.',
      done: [
        'Ctrl and the wheel steps through Chrome’s own ladder, 50% to 200%',
        'Per tab, because in this browser a tab is a document',
        'A percentage chip in the omnibox while it is not 100',
        'preventDefault, so the host browser does not zoom the screen share instead',
        'The conversation ctrl-wheels the spec down two notches with the hand, rather than setting a value',
      ],
      raised: 'Nam, review 28 Aug',
      notes: 'CSS zoom rather than a transform. A scaled page keeps its old layout and merely draws it smaller, so the line breaks do not move and the scrollable height lies; zoom reflows, which is what a browser does and the only version worth emulating.',
    },
  },
  {
    id: 'N72', col: 'done', size: 'S', tag: 'call',
    title: 'The video drag is a nudge, not a relocation',
    note: 'It pulls the tile a little and lets it spring back to the corner it came from.',
    detail: {
      why: 'Nam: "when we are moving the video tile, don’t move it all the way, we can just move a little bit then release, so it should snap back to place." He is right about more than the restraint: carrying the tile to the far corner LEAVES it there, so a line meant to demonstrate that the tile moves ended by rearranging the visitor’s screen for them.',
      done: [
        'The pull is 80px or a third of the way to the midline, whichever is smaller',
        'Bounded so the tile’s centre never leaves its own quadrant, so the latch returns it',
        'Both halves are still shown: the drag and the snap',
      ],
      raised: 'Nam, review 28 Aug',
    },
  },
  {
    id: 'N73', col: 'done', size: 'M', tag: 'call',
    title: 'BUG: the second visit to the call was dead',
    note: 'stopTour has been exported since the conversation shipped, with a comment saying main.ts calls it. Nothing did.',
    detail: {
      why: 'Nam: "after going back to home, then I join the call again, it freezes here. could it be some kind of leaked state? That the call was not closed properly when we left it?" Exactly that, and reproduced on the first try: join, go home, join again, and you get captions on, no share, no narration, and a mouse pointer sitting in the middle of the screen doing nothing.',
      done: [
        'Leaving the call tears the conversation down',
        'Rejoining starts a fresh one, verified by driving join, home, join in a browser',
        'The stage’s own teardown was already complete: hand, timers and five listeners',
      ],
      raised: 'Nam, review 28 Aug',
      notes: 'Three things add up to it, and only the first is obvious. tourStarted is module-scoped, so the guard that stops two narrators talking over each other also stops the second one ever starting. The stage still running holds a podium whose caption strip went with the old screen, so it goes on speaking into a detached node. And the hand is mounted on document.body rather than on the call, which is why the one visible piece of the ghost is a cursor. The fix is the call site the comment already promised.',
    },
  },
  {
    id: 'N74', col: 'done', size: 'M', tag: 'content',
    title: 'The post-credits stop repeating themselves',
    note: 'Four lines a visit drawn from a pool of twenty, remembered across visits, and a line for having found everything.',
    detail: {
      why: 'Nam: "these are banters and they shouldnt repeat so much. The script during the interview, yes, that is a script we dont need to make it replayable. But the post credit should be playful and much less repetitive. Now that we introduce a layer of replayability with the bugs, we need to find a way to make the post credit more fun." The argument turns on the bugs: before them nobody came back, so a fixed outro was right. The drawer gives a reason to return, and the moment a second visit is expected, a line that was funny once becomes a line the app is repeating at you.',
      done: [
        'The gaps belong to the slot rather than to the line, since the lines now vary',
        'Three fixed slots, the opener, the counter and the goodbye, and four drawn',
        'A pool of twenty, so five visits pass before a repeat',
        'Which have been heard is remembered, and the pool wraps whole when it runs dry',
        '"You have found everything. Literally nothing left to do!" when there is nothing left to count',
        'The cap is checked against the unluckiest draw rather than a fixed script',
      ],
      raised: 'Nam, review 28 Aug',
      notes: 'Nam: "when everything is found, we should acknowledge it." The first version simply dropped the counting line, which was the safe answer and the wrong one: a visitor who has cleared the calendar AND the drawer has done the hardest thing here, and the response to that cannot be silence.',
    },
  },
  {
    id: 'N75', col: 'done', size: 'S', tag: 'call',
    title: 'The Stop control goes with the goodbye',
    note: 'It used to survive to the end of the post-credits, offering to stop something that was barely happening.',
    detail: {
      why: 'Nam: "when you finish the script with the goodbye, like after we have answered all the questions not in the CV, this is like post credit part, we should remove the stop talking button, cause now its not really active talking anymore, also to signal that that was the timing."',
      done: [
        'The control is removed the moment the personal answers finish',
        'The post-credits keep their own exit, which is any input at all',
      ],
      raised: 'Nam, review 28 Aug',
      notes: 'The reason it survived that long was about the segment BEFORE it: the personal answers are uninterruptible except by Stop, so taking the exit away early would leave ninety seconds with no way out. That reason expires with the answers. And its disappearance carries information, which is Nam’s second point: it marks the end of the timed part without a caption saying so.',
    },
  },
  {
    id: 'N76', col: 'done', size: 'S', tag: 'content',
    title: 'A clip is square, and the 16:9 original is not in this repo',
    note: 'Closed by deletion. Nam pulled the clip on 28 August, so there is no ratio left to fix. See N89 and N91.',
    detail: {
      why: 'Nam: "I realize the video is actually 16:9. Somehow it was cropped down to a different ratio?" He is right that it is wrong, and the crop is not something this build did.',
      done: [
        'Nam re-exports the clip at its native ratio and drops it in docs/media/',
        'The poster is re-cut to match',
      ],
      raised: 'Nam, review 28 Aug',
      notes: 'Probed with ffprobe: the file is 480x480, and git log over it returns exactly one commit, the first one, at the size it is now. So there is no earlier version to recover and no amount of player work can put back sides that are not in the file. Worth saying that the player is not the problem: two other clips in the set are 720x390 and 640x1138, and both letterbox correctly, so a 16:9 replacement will simply work when it arrives.',
    },
  },

  /* ------------------------------------------------------------------------
   * Nam's late pass, 28 August. Two of these are the kind of bug that makes the
   * whole thing look broken: a window that will not go away (N81) and a
   * conversation that stops mid-sentence (N84).
   * --------------------------------------------------------------------- */
  {
    id: 'N77', col: 'done', size: 'S', tag: 'call',
    title: 'The mock cursor is too big',
    note: 'It was drawn at 22x35 against a real pointer’s 12x19.',
    detail: {
      why: 'Nam: "the mock cursor is gigantic now, we need to bring it down a bit in size." It was drawn at nearly twice life size so it would stay findable over a busy screen share, which is a real problem, but the ring already solves that and the arrow was doing it twice.',
      done: ['The arrow is closer to a real pointer', 'The ring scales with it, so the findability trick still works'],
      raised: 'Nam, 28 Aug',
    },
  },
  {
    id: 'N78', col: 'done', size: 'S', tag: 'call',
    title: 'The browser opens the CV zoomed out too',
    note: 'One notch for the CV, two for the spec, both performed with the wheel.',
    detail: {
      why: 'Nam: "we also need to zoom out a bit on the CV site when we open it too." Same reason as the spec: the shared desktop is a window inside a window, and a document laid out for a full screen arrives about a fifth too big for it.',
      done: ['The cue carries how many notches, so the CV gets 90% and the spec 80%', 'Still done with a ctrl-wheel from the hand, not by setting a value'],
      raised: 'Nam, 28 Aug',
    },
  },
  {
    id: 'N79', col: 'done', size: 'M', tag: 'call',
    title: 'Send a heart instead of dragging the video',
    note: 'The drag measured a stale rect, and the gesture was never the right one to demonstrate anyway.',
    detail: {
      why: 'Nam: "drag the video is wrong, it was dragging the old position of the video tile, which has updated after we open the chat. overall dragging is hard to demo, lets change that, instead of drag the video, we could do send a heart, which opens emoji and sends a heart."',
      done: [
        'The close opens the reaction tray and sends the heart, in two presses',
        'The drag cue is gone with the line it served',
        'The line becomes "Send a heart."',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'The stale rect was real and worth recording even though the fix is a deletion. The beat measured the tile when the beat began, and the line before it had just opened the chat, which narrows the stage and moves the tile. Any beat that measures geometry across a layout change has the same defect; a press on a control does not, because the hand resolves the selector at beat time. That is the argument for preferring selectors over coordinates everywhere in the script.',
    },
  },
  {
    id: 'N80', col: 'done', size: 'M', tag: 'specs',
    title: 'A Settings tab in the spec, behind the admin gate',
    note: 'Clear the achievements, clear the bugs, and see the onboarding as a stranger does.',
    detail: {
      why: 'Nam: "we should have in the project spec in konami mode (admin mode), add a new settings tab, where we have a button to clear out achivements and clear out bugs, just so we can test out the onboarding behavior." Everything this build remembers is a first-visit experience nobody who works on it can see any more.',
      done: [
        'A Settings tab, shown only when the admin gate has been passed',
        'Clear the side quests, clear the collection, clear the post-credit banter, clear the clips',
        'Each says what it is about to forget, and how much of it there is',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'It also answers the question Nam asked in the same breath: "I dont think we got to see any video at all after checking how it was built. Was it because I have seen all the videos there are?" Almost certainly yes, since Off the clock plays only what you have not found and says so when that is nothing. With this tab it is a thing he can check rather than a thing I can assert.',
    },
  },
  {
    id: 'N81', col: 'done', size: 'M', tag: 'call',
    title: 'BUG: a maximised window that is minimised stays on screen, inert',
    note: 'is-max sets animation:none, and the animation was the only thing hiding a minimised window.',
    detail: {
      why: 'Nam: "I cant click the close or maximize or minimize button here at all, it seems like I have a frozen chrome app ... when I open chrome, do some stuff, then I minimize it, then a stale version of the mock chrome remain on screen, not actually interactable - maybe because in reality its in minimized state." That last guess is exactly right.',
      done: [
        'is-min hides the window in its own rule, not only at the end of a keyframe',
        'The travel animation still plays where it can, and is now decoration rather than mechanism',
        'is-out gets the same treatment, for the same reason',
        'Peek cards are clickable again',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'Two rules of equal specificity, and the later one wins. `.wx.is-min` hid the window by animating to visibility:hidden with fill-mode both; `.wx.is-max` sets animation:none, because a maximised window has no scale to animate from without lurching. So maximising and then minimising cancelled the animation that was doing the hiding, and left a fully painted window with pointer-events:none over the desktop. The conversation maximises Chrome, which is why it reproduced every time after a guided share. The lesson is the general one: a state should be expressed in the rule for that state, and an animation should only ever be how it gets there.',
    },
  },
  {
    id: 'N82', col: 'done', size: 'S', tag: 'content',
    title: 'The live client leaves the mock browser',
    note: 'It did not load reliably framed. Explorer now opens it in a real tab.',
    detail: {
      why: 'Nam: "we are removing the mahjong stars tab since it doesnt load very consistently. Clicking that on the explorer will open a new real tab on your real browser going to the site."',
      done: ['The riichi tab is gone from the picker, the tab strip and the document registry', 'The Explorer row opens the real site in a real tab'],
      raised: 'Nam, 28 Aug',
    },
  },
  {
    id: 'N83', col: 'done', size: 'S', tag: 'content',
    title: 'Things I built opens real tabs, and the list gets shorter',
    note: 'Three games and the bot controller come off it.',
    detail: {
      why: 'Nam: "all the urls here on this Things I built site should open an external browser tab too ... in Games section, we can remove mahjong star, rhymshoot 2.0 and lostsoulv2. We are keeping ryhtm shoot, molt and space invasion. We can remove the bot controller too cause now I realize without whitelisting your ip, you wont be able to sit the bots on tables."',
      done: [
        'Every link on the page opens in the real browser rather than in the emulated one',
        'Games: Rhythm Shoot, Molt and Space Invasion',
        'The bot controller is gone, since a reader cannot actually reach it',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'The bot controller is the honest one to lose. It was the strongest tooling claim on the page and it was unreachable without an IP whitelist, so every reader who followed it found a page that did nothing. A link that cannot work is worse than no link: it spends the credibility the rest of the page is building.',
    },
  },
  {
    id: 'N84', col: 'done', size: 'S', tag: 'call',
    title: 'BUG: abandoning the post-credits left the caption on screen',
    note: 'Any input ends the segment, and the return left the last line up with nothing to take it down.',
    detail: {
      why: 'Nam: "somehow we are stuck in this caption there are still ten bugs out there. Then nothing progresses anymore, I dont think we get to the next line which is the last line that closes the caption. Why is that so?"',
      done: [
        'Leaving the post-credits hushes the strip and tears the conversation down',
        'The achievement for sitting through it is still only awarded to somebody who did',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'Working as designed and wrong anyway, which is the interesting part. Any input abandons the segment, silently and with no penalty, and that is right. What was missing is that the normal ending is the only path that took the captions down, so an abandoned run left whichever line was up sitting there for ever. N67 made it far more visible without causing it: the silences are 32 and 41 seconds now, so the window in which somebody can wander off mid-segment is most of it.',
    },
  },

  {
    id: 'N85', col: 'done', size: 'S', tag: 'trust',
    title: 'The CSP stops claiming a directive it cannot deliver',
    note: 'frame-ancestors is header-only, so in a meta tag it did nothing except log an error on every load.',
    detail: {
      why: 'Nam opened the console on a stale tab and asked whether any of it mattered. Almost none of it did, one line was ours: "The Content Security Policy directive frame-ancestors is ignored when delivered via a <meta> element." Chrome is right, and it had been saying so on every page load since the policy was written.',
      done: [
        'frame-ancestors is out of the meta policy, with the reasoning where the directive was',
        'A fresh load of the call now logs nothing at all and fails no requests',
      ],
      raised: 'Nam, 28 Aug morning',
      notes: 'Header-only by spec, and the reason is worth knowing: a document cannot be trusted to say who may frame it once it has already been framed. This site is on GitHub Pages, which sets no headers we control, so the directive was never available to us in the first place. The actual defence is in main.ts and it works: a framed copy detects it and coerces itself to the plain document, so the clone cannot render inside somebody else’s page. Deleting the line loses nothing except the error. Everything else in that console was the browser’s own extensions, and the failed chunk was a tab left open overnight asking for a hash that a rebuild had replaced.',
    },
  },

  /* ------------------------------------------------------------------------
   * Nam's calendar and footage pass, 28 August. One brief, three separate
   * problems: the strip was aligned to the wrong thing, the teaching eggs were
   * only visible for one week of the year, and half the reel was footage he had
   * changed his mind about.
   * --------------------------------------------------------------------- */
  {
    id: 'N86', col: 'done', size: 'M', tag: 'onboarding',
    title: 'The week strip centres on the selected day, and then does not',
    note: 'Shipped, then reverted within the hour on a screenshot of the live product. See N96.',
    detail: {
      why: 'Nam: "selected date should always be in the middle, and we add the days before and after to fill up the 7 day selector here." Meet aligns its strip to the week and this build copied that, which is faithful and, here, wrong: the strip is the surface that teaches the whole easter-egg mechanic, and a selected day pinned to one end gives it six days of context on one side and none on the other.',
      done: [
        'The seven columns run from three days before the selected day to three days after',
        'The selected column is index 3 on every day of the year',
        'Paging by week still moves seven days, and Today still returns',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'Kept on the board as a card that was wrong rather than deleted, because the reasoning is the interesting part and it was reasoning from the wrong premise. The complaint that started it was real: the two teaching eggs were falling off the end of the strip. Centring did fix that. It was just the expensive way to fix it, and it paid in the one currency this build is not allowed to spend, which is the product being what it says it is. N96 has the correction and the argument Nam made for it. The one thing here that survived is the selected column being compared by date key rather than by day-of-month number.',
    },
  },
  {
    id: 'N87', col: 'done', size: 'S', tag: 'onboarding',
    title: 'Both teaching eggs follow the visitor around',
    note: 'One roamed and one was pinned to 28 August, so for most of the year only one of the pair was on screen. Superseded by N96.',
    detail: {
      why: 'Nam: "the two visible easter eggs need to be added dynamically on the date ... Problem is that we dont know which day the interviewer will check this so they may miss these visible eggs we intentionally placed to introduce them the eggs." The pair exists to teach the dot: two marks inside the strip on the first screen is what makes a single mark on a month grid legible three clicks later. A pair that is only a pair during one week of August is not doing that job.',
      done: [
        'The skydive sits three days before today, the premiere two days after',
        'Both land inside the centred strip whatever day the page is opened',
        'The remaining eggs stay on the real dates they happened on',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'Placement is measured from TODAY, not from the selected day, and that is deliberate rather than an oversight: eggs that re-placed themselves as you paged would mean the dot moved whenever you tried to click it. That much survives. The day-count offsets do not, because they only ever worked against a strip that moved with the selection. N96 re-anchors both eggs to the weekend.',
    },
  },
  {
    id: 'N88', col: 'done', size: 'S', tag: 'call',
    title: 'A day can hold more than one meeting',
    note: 'eggMap was keyed to a single egg, so a second one on the same date was silently swallowed.',
    detail: {
      why: 'The stand-up set and the announcement of the result happened on one night and belong on one day. The map returned one Egg per date, so declaring both put the dot on the calendar and then showed only whichever was declared last. Nothing warned: the mark said there was something there and the day showed one thing, which is the failure that looks like it works.',
      done: [
        'eggMap returns a list per date',
        'The day view renders a card per meeting, in the order they are declared',
        'The strip and the month grid still draw exactly one dot however many meetings a day holds',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'One dot per day rather than a count, and that is a real decision rather than laziness: a badge reading 2 hands over how much is hidden there, and the hunt is the product. The month grid and the strip both read the same list, so neither can drift from the other.',
    },
  },
  {
    id: 'N89', col: 'done', size: 'M', tag: 'content',
    title: 'Four new clips, cut and encoded at their true ratio',
    note: 'The competition set, the result, the parade and the zombie walk. Portrait stays portrait.',
    detail: {
      why: 'Nam: "Please respect their original ratio, if a video is in landscape then show it in landscape and vice versa for portrait." Every clip in the reel used to be squeezed into 480x480, which on four phone-vertical sources meant throwing the sides away. He had already caught it once, on a single clip, and it was never a property of that one file.',
      done: [
        'uppsala-roligaste 396x704 from 0:08, the-winner-is 704x396 from 1:38 to 2:00',
        'dragon-strut 396x704 from 0:03 to 0:14, a-deadly-feast 704x396 from 0:22',
        'All four 24fps CRF 32, posters cut from the encoded file so the shapes cannot disagree',
        'The reel stage takes its shape from the clip rather than the clip taking the stage shape',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'The source of the stand-up set carries a -90 rotation in its display matrix, so it probes as 1920x1080 and plays as 1080x1920; scaling to explicit dimensions rather than a factor is what keeps that from silently coming out sideways. On the stage: aspect-ratio with a max-height beside it does not constrain what it looks like it constrains, because in block flow the box takes its width first and the ratio then wins, so the cap is computed as a max-WIDTH from the clip ratio instead. Three clips are still square and cannot be fixed here, because acting, sfx and the skydive exist in this repo only as 480x480, which is N76 generalised.',
    },
  },
  {
    id: 'N90', col: 'done', size: 'S', tag: 'trust',
    title: 'The clips are named for what they are, not for what they are of',
    note: 'The emulated Explorer lists these by filename, so a file named after its subject gave an egg away before anyone opened it.',
    detail: {
      why: 'Nam asked for the rename and it turns out to close a leak rather than just read better. Explorer, the browser page and the window title all derive their text from the file path, so the folder listing was a spoiler surface for a mechanic whose entire value is that you do not know what is behind the dot.',
      done: [
        'skydive to i-can-fly, premiere to its-my-money, zombie to laskigare-an-zombie',
        'The 4 October egg is titled "Coming this Halloween" and no longer names the park',
        'Every path moved with git mv, so the history follows the file',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'The 4 October egg is the one where the name was doing damage. It used to be titled with the park that cast the monster, which answered the question the date was three weeks early in order to ask. Its id is "teaser" rather than anything descriptive for the same reason: the id is in the URL.',
    },
  },
  {
    id: 'N91', col: 'done', size: 'M', tag: 'content',
    title: 'The reel drops the square crop and a pulled clip',
    note: 'Nam pulled one clip on a disclosure call. The parade takes the slot rather than the reel losing one.',
    detail: {
      why: 'Nam: "maybe we shouldnt disclose that." And on the reel generally, it shares its files with the eggs, so leaving it alone would have meant the two surfaces showing different stand-up footage and one of them still showing the pulled clip.',
      done: [
        'The clip and its poster are gone from the repo, not just unlinked',
        'Stockholm Pride closes the reel; the stand-up entry points at the competition set',
        'The Off the clock tile and the story record stop asserting things the reel no longer contains',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'The first pass took the non-disclosure to mean the footage and left the design essay in story.ts standing, on the argument that it was commissioned, argued from both sides, and unaffected by the clip going. Nam overruled that the same day: "remove them everywhere". So the second main quest is out of the essay too, which cost one whole entry in the case against. That entry existed only to argue that the job and a second goal cannot sit at the same altitude, and with the second goal gone there is nothing to weigh. The essay says that it was cut and does not say what it was. Leaving a debate about a subject on the page is the one reliable way to keep the subject on the page.',
    },
  },

  {
    id: 'N92', col: 'done', size: 'S', tag: 'call',
    title: 'A dot on today led to the interview and nothing else',
    note: 'Four dates a year hold both. The day view showed the interview and returned, so the mark went nowhere.',
    detail: {
      why: 'Found by the test written for N87, not by looking. The day view branched on "is this today" first and returned, so on 15 March, 1 August, 4 October and 31 October the strip drew a mark over today and pressing it showed the scheduled interview with no meeting under it. A dot that leads nowhere is worse than no dot: it teaches the visitor that the marks are decoration, on the one day they are most likely to be looking at the page.',
      done: [
        'Today shows the interview and then whatever else is on that date',
        'A test asserts the collision is real, so the branch cannot be tidied away as dead code',
      ],
      raised: 'The suite, while N87 was being written',
      notes: 'Older than this pass. It was reachable before the eggs started roaming, and nobody hit it because it is dormant for 361 days a year and the four live days are dates you would have to deliberately set the clock to. Which is the argument for the test being a year-long loop rather than three hand-picked days: the interesting dates in a calendar rule are never the ones you would think to type.',
    },
  },

  {
    id: 'N93', col: 'done', size: 'M', tag: 'onboarding',
    title: 'One press on a day moved the page twice',
    note: 'Clicking 15 March landed on 1 September. Every day cell carried two click handlers, one of them stale.',
    detail: {
      why: 'Found by driving the built page rather than by reading it, and it had been there long before this pass. h() binds every handler with addEventListener; paintDate rebinds the day cells with `cell.onclick = ...`. Those are two different registrations, so a repainted cell had both: the closure from the day it was created, and the current one.',
      done: [
        'The day cell binds its handler as a property, so the rebind replaces rather than stacks',
        'Clicking a day after paging goes to that day',
      ],
      raised: 'QA on the built page, 28 Aug',
      notes: 'The second move is the part worth understanding, because it is why the destination made no sense. The stale handler fired first and repainted the strip, which rewrote cell.onclick -- and an onclick property listener resolves its callback when it is INVOKED, not when the event is dispatched. So the second handler ran the value the first one had just written: the date that column held in the newly painted week. Two wrongs producing a date that had never been on screen. It hid for as long as it did because it is invisible until a column holds a different date than it did at first render, which means it never fires on the first week you look at.',
    },
  },
  {
    id: 'N94', col: 'done', size: 'M', tag: 'call',
    title: 'The player window sizes itself to the clip',
    note: 'It was a fixed 82% x 78% of the desktop, so a square clip reached 35% of it and a 9:16 one would manage 20%.',
    detail: {
      why: 'The other half of Nam’s ratio note. Encoding at the true ratio stops the picture being wrong; it does not stop the window being the wrong shape around it. object-fit did the honest thing and letterboxed, which on a portrait clip is a video shown as a sliver between two black fields. A real player resizes to the file it opens.',
      done: [
        'The window takes the clip’s shape on open, and again when a clip is swapped into a window already open',
        'The chrome is measured rather than assumed, so it survives an edit to a line-height',
        'Fill went from 35% to 94% on a square clip and from about 20% to 73% on a 9:16 one',
      ],
      raised: 'Nam, 28 Aug, and QA on the built page',
      notes: 'Sizing the window narrow exposed two things that were already broken at narrow widths and had simply never been reachable on this surface. The title bar did not truncate: a flex item’s min-width is auto, so a long title pushed the caption buttons past the edge and .wx clipped them, which meant a window with no close button. And the player’s control bar had no narrow layout at all, so it overflowed and lost the speed control and the fullscreen button with no sign anything was missing. Both are fixed the way Explorer already solved the same problem a few hundred lines up, with container queries. Snapping a window to a quadrant could always have reached both.',
    },
  },

  {
    id: 'N95', col: 'done', size: 'S', tag: 'content',
    title: 'The heaviest clip was a third of the media directory',
    note: '4.2 MB for 54 seconds, against 1.2 MB for the next largest. Cut to the part worth watching.',
    detail: {
      why: 'Nam: "we can cut it from second 12 to 43. should get it about half as light." He is right about both halves. The clip carried 23 seconds nobody needed, and it was also the only one in the set still encoded at 640x1138 while everything around it had moved to 396x704.',
      done: [
        'Cut to 0:12 to 0:43, which is 31 seconds',
        'Re-encoded at 396x704, the same frame as the other portrait clips',
        '4.18 MB to 1.41 MB, and docs/media from 9.2 MB to 6.5 MB',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'Cut with a re-encode rather than a stream copy, and the reason is in the keyframes: they sit at 0, 7.7, 14.8, 23.1 and so on, so a copy can only start where a keyframe already is. Asking for 12 and getting 7.7 or 14.8 is not the cut he asked for. A second-generation encode of an already-lossy source is the cost, which is why this one is CRF 30 rather than the 32 the fresh cuts use. The poster is re-cut from the new file, because the old one was a frame that is no longer in the clip.',
    },
  },

  /* ------------------------------------------------------------------------
   * The correction, an hour after the pass above shipped. Worth reading N86 and
   * N96 as a pair: one card is the mistake and the other is why it was one.
   * --------------------------------------------------------------------- */
  {
    id: 'N96', col: 'done', size: 'M', tag: 'onboarding',
    title: 'The week strip goes back to Sunday, and the eggs move to the weekend',
    note: 'Meet does not centre the selected day. Nam sent the screenshot, and the argument with it.',
    detail: {
      why: 'Nam, reverting his own request: "the original meet doesnt have the selected day center on the 7 day selector, its fixed from sun to sat, which makes sense, this is an office tool so people want to see the calendar as the fixed days in a week. I was wrong about selected date being in the middle." The second sentence is the one that matters and it is not an appeal to fidelity. A week where Wednesday is always the fourth column is a week you can read without reading it; a strip that slides under the selection puts the same date in a different column depending on how you arrived, so the shape of the week stops carrying information. Meet is a calendar before it is anything else.',
      done: [
        'The strip is Sunday to Saturday again, whatever day is selected',
        'The premiere takes a weekend day of the visitor’s own week, and never today',
        'Saturday, unless today is Saturday, and then the Sunday that opened the same week',
        'The jump takes the OTHER weekend day of the week before, one press of the back arrow away',
        'So the pair reads Saturday then Sunday, or Sunday then Saturday, depending on the day you arrive',
      ],
      raised: 'Nam, 28 Aug, with a screenshot of the live product',
      notes: 'The eggs had to move because the thing that broke them is back: against a fixed week, a placement counted in days from today falls off one end or the other depending on which day the page is opened. Three days before a Monday is last week. So the anchor is no longer a number of days but a weekend, which is the one part of the current strip that is always in view, is never today for five days in seven, and is where a film premiere and a tandem jump actually happen. The Saturday-unless-today-is-Saturday branch is what keeps the last two days honest. Nam took the cost on the second egg with his eyes open: "Now it will be off screen unfortunately, but lets hope the movie premier is enough to teach user about these easter eggs." One visible mark on the first screen is the requirement; two was a luxury that cost the week its shape. The test asserts the jump is OFF the strip, so that stays a decision rather than becoming a bug somebody fixes by accident. A later note from Nam put the jump on the opposite weekend day rather than the same one a week back: "say movie is on sat, then tandem on sun last week, and vice versa. We change it up a little bit." It is derived from where the first mark landed rather than computed separately, so the two cannot drift into agreeing, and the arithmetic is asymmetric because the calendar is: Saturday pairs with the Sunday thirteen days back, Sunday with the Saturday one day back, and both are the same week apart on the strip.',
    },
  },

  {
    id: 'N97', col: 'done', size: 'S', tag: 'specs',
    title: 'The reset bench was five dark pills stacked in the corner',
    note: 'Two unrelated components both called their rows .set-row. The second one inherited the first one’s position.',
    detail: {
      why: 'Nam, with a screenshot: "the settings in the project spec, why is it sitting so low, and why dark mode?" Both symptoms, one cause. The device-settings row that floats over the call is .set-row, and it is position: fixed, 576x56, radius 36, #202124, overflow: hidden. The reset bench added its own .set-row a thousand lines further down and overrode display, padding and the border. Everything it did not name, it inherited.',
      done: [
        'The bench is prefixed rb-, so nothing it declares can collide with the call',
        'Five rows in normal flow, static, transparent, under the text that introduces them',
      ],
      raised: 'Nam, 28 Aug',
      notes: 'Worth reading the screenshot again, because it explains itself once you know: five rows all fixed to the same spot at the bottom of the viewport, so four were invisible under the fifth, and the one you could see was clipping its own text against a 56px height it never asked for. It looked like a dark-mode panel that had come loose from the dialog. Renamed rather than patched with overrides, because resetting position, width, height, radius, background, overflow and two animations is a list that only stays correct until somebody adds a ninth property to the other rule. A component prefix is not decoration: two unrelated components sharing one is a bug waiting for whichever is written second, and this one waited about a day.',
    },
  },

  {
    id: 'N98', col: 'done', size: 'L', tag: 'call',
    title: 'Stop is a pause, not a kill',
    note: 'He acknowledges it, turns the captions off himself, and waits to be asked back.',
    detail: {
      why: 'Nam: "When clicking stop talking, the script literally freezes in place and caption doesnt close. We should acknowledge this instead of abruptly stopping." The freeze was the honest symptom of the design: the handler tore everything down mid-sentence, so whatever the hand was doing stayed half done and the strip kept the last line it had been given. Stop meant die, and dying inside a gesture looks exactly like a hang.',
      done: [
        'A Stop pressed during a beat lets the beat finish first',
        'He says "I hear you. The rest is yours to discover now."',
        'The hand turns the captions off, timed to land as that line ends',
        'The Stop control goes away with him and comes back with him',
        'Nothing at all is said until the visitor turns the captions back on',
        'He returns with "Oh, you missed me. Where were we again?" and names the segment',
        'Pressing Stop again does the same thing, any number of times',
        'Time spent paused is taken off the interview clock',
      ],
      raised: 'Nam, QA 29 Aug',
      notes: 'The press ends the LINE but not the BEAT, which is exactly what the cutscene lock from N55 already does: skip() is refused while locked and applied the moment it unlocks. The acknowledgement and the press overlap deliberately, since saying a line, then pausing, then reaching for a button is three beats where the visitor is owed one. Coming back is polled off podium.captionsOn() rather than given its own event: the captions control belongs to the call, and one listener does not justify a second way to know one thing.',
    },
  },
  {
    id: 'N99', col: 'done', size: 'S', tag: 'call',
    title: 'Three clips again, and the new filenames',
    note: 'N63 showed all of them. There are seven now, which is too many.',
    detail: {
      why: 'Nam: "I want to revert back to only showing max 3 videos instead of all the videos here." Seven clips at five seconds each is a minute and a half of somebody else’s home video in the middle of a job application, and the segment stops being a flourish and becomes the show. The rest stay findable in the calendar, which is where they always were.',
      done: [
        'The offclock segment opens at most three',
        'Both routes honour the cap, the performed one and the fallback',
        'The new filenames all resolve, verified against Explorer in a browser',
        'A row below the fold is rolled into view before the hand reaches for it',
      ],
      raised: 'Nam, QA 29 Aug',
      notes: 'Nothing went stale in N56, and that is worth writing down: Explorer builds its rows from the same eggs array the script reads, and both derive the file name the same way, so a rename lands in both places at once. What DID need fixing was scrolling. Hobby now holds eight rows and shows seven, so the last one is below the fold. A first-time visitor never sees it, because their three unseen clips are the first three; somebody who has already found a few gets a list that starts further down, and the hand would have travelled to a box clipped out of its own container.',
    },
  },
  {
    id: 'N100', col: 'done', size: 'M', tag: 'call',
    title: 'Catching a bug is a moment',
    note: 'It lingers, it blooms, the room takes a knock, and he stops talking over it.',
    detail: {
      why: 'Nam: "when we found it, it should linger a bit more, a bit more exciting, maybe some light glow and a light camera shake, kinda like hallelujah, and then if the script is running, then we should pause just a little bit for the bug to land then we continue." The wiggle finished in 900ms and the drawing left immediately after, so the one moment the animal is big enough to look at was over before you had looked at it.',
      done: [
        'The hold is 1500ms, and the extra 600 is stillness at full size rather than more animation',
        'A halo blooms behind the animal as it lands',
        'The room takes a short knock, three pixels and a fifth of a degree',
        'The conversation holds for it and picks up afterwards',
        'Reduced motion gets none of the shake and none of the bloom',
      ],
      raised: 'Nam, QA 29 Aug',
      notes: 'The shake is on the body rather than on the bug, and that is the whole difference: a bug that shakes is a bug that is moving, a ROOM that shakes is something having landed in it. Kept small on purpose, since the amounts that read as impressive in isolation read as a fault in a page pretending to be a video call. The hold reaches the script as a dispatched event rather than a call, for the same reason as ui/signal.ts: bugs.ts knows nothing about the conversation and has to keep working when it is not running. It is a timestamp rather than a lock, so a holder that forgets to release cannot wedge the script, and it is capped at four seconds and taken between sentences rather than inside one.',
    },
  },

  /* Flagged rather than done. Still true as of this build. */
  { id: 'T24', col: 'backlog', size: 'M', tag: 'specs', title: 'Initial payload is halfway to the ceiling', note: '24.7 kB of a 50 kB gate, up from 18.2. Still green, and the growth is real, but two deferred chunks are 17 kB and 19 kB and deserve a splitting pass before it becomes urgent.' },
];
