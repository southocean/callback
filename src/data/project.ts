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
];

export interface Milestone {
  day: string;
  /** Which commit, counting from the first. */
  n: number;
  title: string;
  note: string;
}

/** Real commits, chosen to space across the life of the project. */
export const milestones: Milestone[] = [
  {
    day: '2026-08-20', n: 1,
    title: 'First commit',
    note: 'An interactive CV, built as a call. The metaphor was fixed before any interface existed.',
  },
  {
    day: '2026-08-20', n: 3,
    title: 'Measured, not eyeballed',
    note: 'The interface became a clone built from getBoundingClientRect and getComputedStyle rather than from screenshots. Every later correction traces back to this decision.',
  },
  {
    day: '2026-08-20', n: 52,
    title: 'The lobby, at every width',
    note: 'A breakpoint that derives itself from the content instead of a round number picked by hand.',
  },
  {
    day: '2026-08-21', n: 61,
    title: 'The in-call screen',
    note: 'Panels, reactions, captions and the control bar, all cloned from measurement.',
  },
  {
    day: '2026-08-21', n: 64,
    title: 'A failed measurement, recorded',
    note: 'A pass that produced a contradiction was written up rather than quietly re-run. The reaction band could not be both places at once, and saying so is what found the real rule.',
  },
  {
    day: '2026-08-23', n: 70,
    title: 'The shared screen becomes a machine',
    note: 'A Windows desktop drawn in the browser: windows that drag, resize, minimise and snap.',
  },
  {
    day: '2026-08-25', n: 88,
    title: 'Pin, unpin, and the presenting layout',
    note: 'The last of the call states, all read off the live product while a share was running.',
  },
  {
    day: '2026-08-26', n: 120,
    title: 'Read as a stranger would read it',
    note: 'A perception pass: what a non-technical reader sees first, and what reads as a scam. The riskiest findings were about framing, not code.',
  },
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
      'caught more than review did — including a bug where every click inside a window was silently discarded, ' +
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
  { id: 'T7', col: 'backlog', size: 'S', tag: 'content', title: '"Against this job ad" names no job ad', note: 'With no company code the section renders one employer\'s requirements under a generic heading.' },
  { id: 'T8', col: 'review', size: 'M', tag: 'onboarding', title: 'CV opens as an overlay, not a route', note: 'Shipped. Meet never navigates away from itself and neither should this.' },
  { id: 'T9', col: 'review', size: 'M', tag: 'onboarding', title: 'Per-company copy behind a code', note: 'Shipped. No employer named by default; ?c= swaps in the specific lines.' },
  { id: 'T10', col: 'review', size: 'L', tag: 'specs', title: 'Project specifications panel', note: 'Shipped. One place the build is documented, reachable from the home screen and from inside the call.' },
  { id: 'T11', col: 'review', size: 'M', tag: 'call', title: 'Easter eggs open inside the call', note: 'Shipped, then QA\u2019d by Nam \u2014 which is where T16 to T20 came from. Join goes straight to the call with the clip playing on the shared screen.' },
  { id: 'T12', col: 'done', size: 'L', tag: 'call', title: 'The shared desktop', note: 'Windows that drag, resize, snap and minimise, a file explorer, a browser and a media player.' },
  { id: 'T13', col: 'done', size: 'M', tag: 'call', title: 'Pinned and presenting layouts', note: 'Read off the live product while a share was running — the only way those states were reachable.' },
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
  { id: 'T28', col: 'review', size: 'S', tag: 'specs', title: 'Meeting tools: two tabs removed, five reordered', note: 'Removed. The requirement map is already in About and the mock Chrome opens the real posting — three copies is how they start disagreeing. Design went on Nam’s call: not relevant here, and some mystery is worth keeping.' },

  { id: 'T29', col: 'review', size: 'M', tag: 'trust', title: 'The page never asks for your camera', note: 'Shipped. getUserMedia is gone \u2014 the control flips its own icon and nothing else, verified by wrapping mediaDevices.getUserMedia and toggling both ways. Closes R11 in the perception doc, which called the browser\u2019s permission bar on a page dressed as Meet the scariest moment in the funnel.' },
  { id: 'T30', col: 'review', size: 'M', tag: 'specs', title: 'WebGL effects pipeline deleted', note: 'Removed with the camera it ran on: the Effects tab, src/fx/pipeline.ts, the fx side quest, the \u2018e\u2019 shortcut and the Backgrounds button. A real loss \u2014 it was the most technically substantial thing here \u2014 but it was only ever visible to a reader who granted the permission we just removed. Recoverable from git.' },

  { id: 'T31', col: 'review', size: 'S', tag: 'trust', title: 'BUG: the lobby named a camera it never asked about', note: 'Fixed. The lobby promoted a chip to "Integrated Camera" — a hardcoded device name, in a file whose own comment forbids exactly that. It only looked right because Windows calls most built-in webcams that. Now reads "No camera requested" beside "Effects unavailable", matching the mic and speaker chips, and the promote mechanism is gone because nothing can be granted.' },

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
          "notes": "https://preview.mahjongstars.com/ — public, so disclosing it is fine."
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
                "\"Diep — referral\" becomes \"Diep Bui\"",
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
                "Card title: \"Diep Bui — referral\"",
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
    note: "One of the two lines should be playful, and the referral note goes — here and on the ended screen.",
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
                "Graph mining, part of the Multinet library — InfoLab, Uppsala University, 2018",
                "Sensor network optimisation: two publications, one book chapter, one best-paper award — MSO Lab, HUST, 2014–2017"
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
          "why": "Languages were being listed twice — once by name and again under \"over 10,000 lines\" — and the bot-controller line undersells the testing work.",
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
    id: 'N24', col: 'backlog', size: 'L', tag: 'onboarding',
    title: "The guided tour: captions, an on-screen cursor, and an adaptive script",
    note: "The big one. A scripted walkthrough that narrates itself, moves a cursor in sync, and adapts when the visitor takes over.",
    detail: {
          "why": "Everything else on this board makes the CV better to read. This makes it a demo that runs itself — which is the difference between a page a recruiter skims and one they watch to the end.",
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
    id: 'N26', col: 'backlog', size: 'L', tag: 'specs',
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
          "notes": "Depends on N24 landing first — there is no script tree to draw until there is a script tree."
    },
  },

  /* Flagged rather than done. Still true as of this build. */
  { id: 'T24', col: 'backlog', size: 'M', tag: 'specs', title: 'Initial payload is halfway to the ceiling', note: '24.7 kB of a 50 kB gate, up from 18.2. Still green, and the growth is real, but two deferred chunks are 17 kB and 19 kB and deserve a splitting pass before it becomes urgent.' },
];
