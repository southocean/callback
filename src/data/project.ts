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
export const commitsPerDay: { day: string; n: number; label: string }[] = [
  { day: '2026-08-20', n: 53, label: 'Day 1' },
  { day: '2026-08-21', n: 12, label: 'Day 2' },
  { day: '2026-08-22', n: 1, label: 'Day 3' },
  { day: '2026-08-23', n: 6, label: 'Day 4' },
  { day: '2026-08-24', n: 0, label: 'Day 5' },
  { day: '2026-08-25', n: 43, label: 'Day 6' },
  { day: '2026-08-26', n: 11, label: 'Day 7' },
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
    persona: 'recruiter', verdict: 'risk',
    heading: 'The CV does not say I can work here',
    body:
      'Work authorisation is the first thing I check on an international application and it is not on the ' +
      'document. It exists in the data — "38 minutes from the Stockholm office, no relocation, no visa ' +
      'sponsorship needed" — and it is not rendered anywhere a reader can see it.',
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

export interface Task {
  id: string;
  title: string;
  note: string;
  col: Column;
  /** Rough size, in the way a board actually uses it. */
  size: 'S' | 'M' | 'L';
  tag: 'onboarding' | 'specs' | 'call' | 'trust' | 'content';
}

export const columns: { id: Column; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'doing', label: 'In progress' },
  { id: 'review', label: 'In review' },
  { id: 'done', label: 'Done' },
];

/**
 * The board. Seeded with the real outstanding work, which is why several cards
 * are uncomfortable to read — a board that only contains finished things is a
 * trophy cabinet, not a plan.
 */
export const tasks: Task[] = [
  { id: 'T1', col: 'backlog', size: 'S', tag: 'trust', title: 'Static shell still says "Google Meet"', note: 'The pre-hydration paint claims to be a Google product. Fifteen minutes, and the highest-value fix on the list.' },
  { id: 'T2', col: 'backlog', size: 'S', tag: 'trust', title: 'Disclaimer contradicts the build', note: 'It says no Google marks are used. The shell renders the Meet mark and the wordmark.' },
  { id: 'T3', col: 'backlog', size: 'S', tag: 'content', title: 'Work authorisation missing from the CV', note: 'profile.commute exists in the data and is rendered nowhere.' },
  { id: 'T4', col: 'backlog', size: 'M', tag: 'trust', title: 'Say something before the camera prompt', note: 'The browser permission bar on a page dressed as Meet is the scariest moment in the funnel.' },
  { id: 'T5', col: 'backlog', size: 'S', tag: 'trust', title: 'Label the emulated browser and desktop', note: 'A browser with an address bar drawn inside a page is a phishing pattern. Keep the trick, label it.' },
  { id: 'T6', col: 'backlog', size: 'M', tag: 'content', title: 'Rewrite the plain CV footer', note: 'It closes on build receipts and is no-print, so the PDF loses the disclaimer with it.' },
  { id: 'T7', col: 'backlog', size: 'S', tag: 'content', title: '"Against this job ad" names no job ad', note: 'With no company code the section renders one employer\'s requirements under a generic heading.' },
  { id: 'T8', col: 'review', size: 'M', tag: 'onboarding', title: 'CV opens as an overlay, not a route', note: 'Shipped. Meet never navigates away from itself and neither should this.' },
  { id: 'T9', col: 'review', size: 'M', tag: 'onboarding', title: 'Per-company copy behind a code', note: 'Shipped. No employer named by default; ?c= swaps in the specific lines.' },
  { id: 'T10', col: 'review', size: 'L', tag: 'specs', title: 'Project specifications panel', note: 'Shipped. One place the build is documented, reachable from the home screen and from inside the call.' },
  { id: 'T11', col: 'doing', size: 'M', tag: 'call', title: 'Easter eggs open inside the call', note: 'Join goes straight to the call with the clip playing on the shared screen, instead of a separate player screen.' },
  { id: 'T12', col: 'done', size: 'L', tag: 'call', title: 'The shared desktop', note: 'Windows that drag, resize, snap and minimise, a file explorer, a browser and a media player.' },
  { id: 'T13', col: 'done', size: 'M', tag: 'call', title: 'Pinned and presenting layouts', note: 'Read off the live product while a share was running — the only way those states were reachable.' },
  { id: 'T14', col: 'done', size: 'M', tag: 'trust', title: 'Perception pass', note: 'How this reads to a stranger, ranked by how fast it pushes them toward closing the tab.' },
  { id: 'T15', col: 'done', size: 'S', tag: 'onboarding', title: 'Banner says it is a CV', note: 'The first line now answers the category question instead of describing the format.' },
];
