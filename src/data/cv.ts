// Single source of truth.
//
// Call mode and plain mode both render from this file. There is no second copy
// of the content, so the two views cannot drift apart (review T13).
//
// House rule, from review T7: nothing in here is invented. Where a magnitude
// would strengthen a claim but could not be sourced from the CV, it was left
// out and recorded as an action item instead. A fabricated number does not
// survive an interview.

export type RoleKind = 'engineering' | 'commercial' | 'research';

export interface Role {
  id: string;
  org: string;
  title: string;
  /** Decimal year, for timeline geometry. */
  from: number;
  /** Decimal year, or null for ongoing. */
  to: number | null;
  fromLabel: string;
  toLabel: string;
  place: string;
  kind: RoleKind;
  /** Shown in the participant tile. One line, no fluff. */
  gist: string;
  bullets: string[];
}

export interface CaseStudy {
  id: string;
  title: string;
  org: string;
  years: string;
  stack: string[];
  problem: string;
  approach: string[];
  /** Why a Meet web-client engineer should care. */
  relevance: string;
}

export interface ChatMessage {
  from: 'nam' | 'system';
  at: string;
  text: string;
}

export const profile = {
  name: 'Nam Nguyen',
  headline: 'Lead front-end developer',
  /**
   * NEUTRAL by default. Naming the employer is company-specific copy and it
   * now lives in src/data/companies.ts, resolved from a ?c= code. This string
   * is what a reader sees with no code, and it has to be true for any send.
   */
  target: 'Senior Software Engineer, Web Development',
  targetAlt: 'Senior Front-End Engineer, Web',
  place: 'Uppsala, Sweden',
  commute: '38 minutes from the Stockholm office. No relocation, no visa sponsorship needed.',
  // Assembled in script rather than sitting in the markup, so a public repo
  // does not hand the address to scrapers (review S3). The phone number is
  // deliberately not on this site at all — it stays in the PDF.
  emailUser: 'hainam2511',
  emailHost: 'gmail.com',
  links: [
    { label: 'GitHub', handle: 'southocean', href: 'https://github.com/southocean' },
    { label: 'LinkedIn', handle: 'southocean', href: 'https://www.linkedin.com/in/southocean' },
    { label: 'itch.io', handle: 'southocean', href: 'https://southocean.itch.io' },
  ],
  languages: 'Vietnamese (native) · English C2 · Swedish C1',
} as const;

/**
 * Where this page actually lives. Hard-coded rather than read off
 * location.href: the share card, the copy buttons and the referral note all
 * quote a URL a stranger has to be able to type, and during development
 * location.href is localhost:4173. GitHub Pages serves docs/ from the repo
 * root, so this is the whole of it.
 */
/**
 * First commit, from `git log --reverse`. Lives here rather than in project.ts
 * because the home screen quotes it, and importing it from there dragged the
 * whole project record -- personas, reviews, the board -- into the initial chunk.
 */
export const START = '2026-08-20';

export const SITE = 'https://southocean.github.io/callback/';

/** The one-liner. Five seconds to land (review U5). */
export const pitch =
  'Seven years leading the front end of a real-time multiplayer client: shared state, ' +
  'reconnection, latency, a rendering engine embedded in a web app. The same shape of ' +
  'problem as a video call.';

export const roles: Role[] = [
  {
    id: 'mahjong',
    /*
     * WASABI PRODUCTIONS, not Mahjong Logic. Nam: "finally we have a nice company
     * landing page." The id stays 'mahjong' because it keys the case study, the
     * easter-egg routes and the timeline geometry, and renaming it would be a
     * migration for no reader-visible gain.
     */
    org: 'Wasabi Productions',
    title: 'Lead front-end developer',
    from: 2019.25,
    to: null,
    fromLabel: 'Apr 2019',
    toLabel: 'present',
    place: 'Uppsala, Sweden',
    kind: 'engineering',
    gist: 'Seven years on a real-time multiplayer game client. The closest thing on this CV to a video call.',
    /*
     * All four rewritten to Nam's wording, 27 August.
     *
     * The platform line was factually stale: the product is no longer a React +
     * Unity hybrid, and a CV claiming an architecture the company has moved off
     * is a claim an interviewer can catch in one question.
     *
     * The team-of-five line went at Nam's request — "Im not very comfortable with
     * this stat, cause it wasnt always 5" — and a number you have to qualify is
     * worth less than the thing it was standing in for. What replaced it is the
     * agentic-programming work, which is both true and the most current thing on
     * the CV, and which this whole site happens to be evidence of.
     */
    bullets: [
      'Game client for online mahjong, built for the Chinese and Japanese markets.',
      'Took the product through every platform it has had: web, then Unity, now React Native on web and mobile.',
      'Pioneered agentic programming: built the cross-team AI harnesses, drove adoption beyond my team.',
      'Feature design, responsive UI, advanced Mahjong bot (4–5 Dan), bot swarm controller, automated QA.',
      'Worked directly with design, backend, marketing and investors, with an active say in what gets built next.',
    ],
  },
  /*
   * ONE RESEARCH ENTRY, not two. Nam: "we can merge Info Lab and MSO Lab into
   * one, just D&A Research, which contains just the highlight."
   *
   * Two research entries with four bullets between them took as much of the page
   * as the seven-year role above them, which is the wrong weighting on a CV
   * applying for a front-end job. Each lab keeps its name, its institution and
   * its dates inside its own line, so nothing is lost except the space.
   */
  {
    id: 'research',
    org: 'D&A Research',
    title: 'Data and algorithms research',
    from: 2014.0,
    to: 2018.85,
    fromLabel: '2014',
    toLabel: '2018',
    place: 'Uppsala · Hanoi',
    kind: 'research',
    gist: 'Graph mining and combinatorial optimisation. This is where the algorithms came from.',
    bullets: [
      'Graph mining for the Multinet open-source library. InfoLab, Uppsala University, 2018.',
      'Sensor network optimisation: two papers, a book chapter, a best-paper award. MSO Lab, HUST, 2014–2017.',
    ],
  },
  {
    id: 'bkav',
    org: 'Bkav Corp.',
    title: 'C++ developer',
    from: 2013.7,
    to: 2015.85,
    fromLabel: 'Sep 2013',
    toLabel: 'Nov 2015',
    place: 'Hanoi, Vietnam',
    kind: 'engineering',
    gist: 'Security tokens in C++. Where getting it exactly right was the whole job.',
    bullets: [
      'Built eToken, a hardware security token for signing and verifying digital signatures.',
      'Delivered a beta meeting the relevant ISO standards.',
    ],
  },
];

export const caseStudies: CaseStudy[] = [
  {
    id: 'mahjong',
    title: 'A real-time multiplayer client, through two platform migrations',
    org: 'Wasabi Productions',
    years: '2019–present',
    stack: ['JavaScript', 'React', 'Unity', 'C#', 'REST APIs', 'responsive UI'],
    problem:
      'Four players at a table, in different countries, on different networks, all of whom must see the same ' +
      'board at the same moment. One of them is on hotel wifi. The client has to stay honest about shared ' +
      'state while the connection underneath it is not honest at all.',
    approach: [
      'Took the product from a native desktop app to the browser, then to a hybrid running React for interface and Unity for the table itself: a rendering engine inside a web app, kept in step.',
      'Designed the API surface between client and server, which is where the reconnection and resync behaviour actually lives.',
      'Built a bot controller so live tables could be driven under test instead of by hand. Test automation for a system whose hardest bugs only appear with four real participants.',
      'Localised for the Chinese and Japanese markets, where the game conventions and the typography both differ.',
      'Led five engineers: split the work, ran the reviews, and defended the architecture to designers, marketing and investors.',
    ],
    relevance:
      'A conferencing client is this problem with media attached. Shared session state, participants joining ' +
      'and dropping, a resync that must not lose the room, and a rendering surface inside a web app that ' +
      'cannot be allowed to drop frames. I have been shipping that for seven years, in a browser.',
  },
  {
    id: 'callback',
    title: 'This site',
    org: 'Callback',
    years: '2026',
    stack: ['TypeScript', 'WebGL', 'Web Audio', 'zero dependencies'],
    problem:
      'The Meet roles ask for TypeScript, test automation and accessible technologies. Claiming all three on ' +
      'a PDF is free, so a claim is worth nothing. The artifact had to be the evidence.',
    approach: [
      'Strict TypeScript, no framework, no runtime dependencies. The whole bundle is under the budget printed in the footer, and the build fails if it goes over.',
      'A real unit-test suite over real logic: the state reducer, timeline geometry, the caption scheduler, the network model. It runs in CI and in your browser, in the Engineering panel.',
      'A chaos switch in that panel injects a fault so you can watch the suite go red. A green screenshot proves nothing.',
      'A WebGL filter chain over live video, because effects are a feature this product ships and building one is more convincing than mentioning one.',
      'A network simulator that degrades the call: loss, jitter, resolution collapse. The failure mode this team actually lives in.',
      'Accessibility done as work rather than as a bullet: roving tabindex, focus traps, reduced-motion, and an audit panel that asserts against the live DOM and is allowed to fail.',
      'Built with agentic tooling and the build log left in, since the senior posting asks for exactly that.',
    ],
    relevance:
      'Every requirement in the job ad has something here you can click on. That was the entire design brief.',
  },
  {
    id: 'etoken',
    title: 'eToken: signing hardware, in C++',
    org: 'Bkav Corp.',
    years: '2013–2015',
    stack: ['C++', 'cryptographic signing', 'ISO conformance'],
    problem:
      'A device that signs documents has no acceptable margin of error and no useful way to say "roughly".',
    approach: [
      'Researched and implemented the token that signs and verifies digital signatures.',
      'Drove it to a beta meeting the relevant ISO standards, with conformance as the definition of done rather than a phase at the end.',
    ],
    relevance:
      'Two years in a codebase where correctness was the product. It is the reason I write tests before I am asked to.',
  },
  {
    id: 'research',
    title: 'Combinatorial optimisation, published',
    org: 'MSO Lab, HUST · InfoLab, Uppsala',
    years: '2014–2018',
    stack: ['algorithms', 'genetic algorithms', 'graph mining', 'Matlab', 'Python'],
    problem:
      'Where to place sensors, how to route between them, and how to find a good answer when the exact one is out of reach.',
    approach: [
      'Three years of wireless sensor network optimisation at MSO Lab. Two publications, a book chapter, and a best-paper award at IEEE R10-HTC.',
      'Grant co-holder for IEEE AIYEHUM 2016 and 2017 and IEEE R-10 HTA 2017.',
      "Master's thesis on graph mining over Twitter, contributed to the Multinet open-source library.",
      'Taught the algorithms too: teaching assistant for Genetic Algorithms, Database Design and Advanced Software Design.',
    ],
    relevance:
      'Both postings list data structures and algorithms as preferred. This is not a weekend of practice ' +
      'problems. It is four years of it, peer-reviewed, and three semesters of teaching it to other people.',
  },
];

/** The cover letter, as a chat thread. */
export const chat: ChatMessage[] = [
  {
    from: 'system',
    at: '',
    text: 'Nam started a call. This panel is the cover letter. He just refused to attach it as a .docx.',
  },
  {
    from: 'nam',
    at: '09:00',
    // Neutral. The company-specific opener is companies.ts -> pitch.opener,
    // substituted in panels.ts when a code is present.
    text: "Hi. I'm Nam, I live in Uppsala, and I am applying for a senior web development role.",
  },
  {
    from: 'nam',
    at: '09:00',
    text:
      'The short version: seven years leading the front end of a real-time multiplayer client. Four ' +
      'strangers on four networks who all have to see the same board at the same instant, one of them on ' +
      'hotel wifi. Take that and attach media to it and you have roughly your product.',
  },
  {
    from: 'nam',
    at: '09:01',
    text:
      'I took that client from a desktop app to the browser, then to a React + Unity hybrid: a rendering ' +
      'engine living inside a web page, which is a sentence I understand the cost of. I led the five people ' +
      'who did it with me.',
  },
  {
    from: 'nam',
    at: '09:02',
    text:
      'Before that: two years of C++ on signing hardware, where correctness was the product. Before that, ' +
      'four years of optimisation research. Two papers, a book chapter, a best-paper award, and three ' +
      'semesters as a teaching assistant for algorithms. Your ad asks for data structures and algorithms. ' +
      'That part I can show you.',
  },
  {
    from: 'nam',
    at: '09:03',
    text:
      'One thing I will not pretend about: accessibility is listed as preferred and I have not shipped a ' +
      'product where it was my mandate. So I did the work here instead. This page is keyboard-complete, ' +
      'screen-reader tested, and the Engineering panel audits it live and is allowed to fail. Judge it on that.',
  },
  {
    from: 'nam',
    at: '09:04',
    text:
      'Your posting mentions agentic coding. I built this with it, and left the build log in the Engineering ' +
      'panel, including three rounds of people picking the plan apart and what I changed each time.',
  },
  {
    from: 'nam',
    at: '09:05',
    text:
      'Also, and this is relevant more than it sounds: I do stand-up. Seven years of walking into a room ' +
      'cold and finding out in ten seconds whether a thing lands. That is the same instinct a UX review needs.',
  },
  {
    from: 'nam',
    at: '09:06',
    text:
      "I'm 38 minutes from your office, I speak Swedish at C1, and I already have the right to work here. " +
      'End the call whenever you like. There is a PDF and an email address on the way out.',
  },
];

/*
 * THE SECOND SCRIPT USED TO LIVE HERE.
 *
 * Eleven lines with second offsets, which the call played on a 900ms tick, on a
 * loop, forever — and which the conversation suspended while it talked and handed
 * back when it finished. Two consequences, and Nam hit both: a visitor who had
 * just been thanked for their time got talked at again from the top, and the loop
 * sounded BETTER than the script interrupting it.
 *
 * The second one is why this is a deletion rather than a bug fix. Every line in
 * the loop had to survive being walked into cold, so none of them could lean on
 * the line before — and that constraint is exactly what made them sound offhand.
 * N45 folded them into the one script in data/tour.ts, line by line, on Nam's
 * own call; the merge is minuted on board ticket N45 and the transcript panel now
 * renders the script itself via `transcriptLines`.
 */

/**
 * TWO COLUMNS, NO DUPLICATES.
 *
 * Nam: "In this part there are a lot of duplicates. JavaScript — over 10,000
 * lines, lots of languages that get over 10,000 lines, while we already have a
 * section for Over 10,000 lines ... I think the best structure is left column
 * skills and framework and right column languages."
 *
 * He is right that it was saying everything twice: five of the eight left-hand
 * entries were bare languages whose only note was a line count the right-hand
 * column already gave. So the left column is now only things a language list
 * cannot express — what he can build and what he builds it with — and every
 * language lives once, on the right.
 *
 * The WebGL entry is gone with the effects pipeline it cited (see T30).
 */
/**
 * WHAT THE LEFT COLUMN IS FOR, after Nam's pass on it.
 *
 * A claim, and the evidence for it. Every entry here has to survive being read
 * by somebody who will click on the thing it names.
 *
 * The frameworks line was removed rather than reworded, and it is worth writing
 * down why, because it was a real overclaim: "React · Unity · Flutter — the
 * three frameworks the product has shipped on, across three platform
 * migrations". Nam: "this is not true, the product has never shipped in
 * Flutter." A CV that inflates one line puts every other line up for
 * re-examination, and this one was doing it in the section a reviewer checks
 * hardest. Frameworks are a fact about tooling, not a claim about outcomes, so
 * they moved to the right column where facts about tooling already live.
 *
 * The other two edits are the same instinct applied twice:
 *
 *   · "Responsive & accessible UI" no longer says "this page". The section is a
 *     record of seven years, not of one weekend, and scoping the only
 *     accessibility claim to the artefact in front of the reader made it look
 *     like the only accessibility work there has ever been. "Audited rather
 *     than assumed" went with it — the audit is a feature of this site and it
 *     is demonstrated two clicks away, so asserting it here is a boast in the
 *     place where a boast is least useful.
 *   · "Performance budgets" is "Performance", because the budget is one of
 *     three things and naming the entry after the smallest of them undersold it.
 */
export const skills = {
  primary: [
    { name: 'Agentic programming', note: 'cross-team AI harnesses at Wasabi, and this site: one person, one agent, one week' },
    { name: 'Test automation', note: '75–90% unit coverage, AI-assisted, plus automated QA over the core flows' },
    { name: 'Real-time clients', note: 'shared state, reconnection and latency on a live multiplayer game' },
    { name: 'Responsive & accessible UI', note: 'roving tabindex, live regions, reduced motion, keyboard-only paths' },
    { name: 'Performance', note: 'load budget enforced in CI, asset optimisation, lazy loading' },
  ],
  volume: {
    'Over 10,000 lines': ['TypeScript', 'JavaScript', 'C', 'C++', 'C#', 'Dart', 'Java'],
    'Over 1,000 lines': ['Erlang', 'SQL', 'Python', 'Matlab', 'R', 'PHP'],
    /*
     * Frameworks first, then the tools, in one row rather than two: the right
     * column is a list of things worked with, and a framework is one of those.
     *
     * 'Unity Editor' came out when 'Unity' went in. They are genuinely different
     * things — an engine and its authoring tool — but reading "Unity, …, Unity
     * Editor" in one comma-separated row looks like a list padded by accident,
     * and the row is more credible six items long than seven.
     */
    'Tools & frameworks': ['React', 'Unity', 'Flutter', 'Figma'],
  } as Record<string, string[]>,
};

export const education = [
  { school: 'Uppsala University', award: 'MSc, Computer Science', years: '2016–2018', place: 'Uppsala, Sweden' },
  {
    school: 'Tokyo University of Agriculture and Technology',
    award: 'Research exchange',
    years: '2015',
    place: 'Tokyo, Japan',
  },
  {
    school: 'Hanoi University of Science and Technology',
    award: 'BS, Computer Science',
    years: '2011–2016',
    place: 'Hanoi, Vietnam',
  },
];

export const teaching = [
  'Database Design (HT16, HT17)',
  'Advanced Software Design (HT17)',
  'Genetic Algorithms (2015)',
];

/*
 * HONOURS REMOVED, on Nam's call. The two that carry weight — the best paper and
 * the book chapter — are already in the research entry above, where they are
 * attached to the work that earned them rather than sitting in a list of six
 * things from a decade ago.
 */

/**
 * SPECIFIC, not evocative.
 *
 * Nam: "The descriptions here are very vague, I dont like it." Fair — every line
 * was a simile about what the hobby taught him, which is the CV equivalent of
 * answering a question about your weekend with a metaphor. Named venues, named
 * films, named press. A reader can check all of it.
 *
 * The intro line went too: "Two of these are the reason the page you are looking
 * at exists" was a tease that never paid off, and one of the two it meant was
 * the effects pipeline, which no longer ships.
 */
/**
 * A word inside a line that is really a link.
 *
 * The press mentions used to hang off the end of the sentence as a bare "SVT",
 * because the item carried one href and one label and had nowhere else to put
 * them. So the line read "Featured on SVT and UNT." and then said "SVT" again,
 * as a link, after the full stop — which is the shape of a citation and not the
 * shape of a sentence. Nam: "have the hyperlink on the SVT after Featured on,
 * not a separate SVT after everything."
 *
 * Right, and it also meant the second outlet could not be linked at all, since
 * there was only room for one. Both are linked now, in place.
 */
export interface Mention { text: string; href: string }

export interface Offstage {
  what: string;
  why: string;
  /** Words inside `why` to turn into links. Each matches the first occurrence. */
  links?: Mention[];
}

export const offstage = {
  items: [
    {
      what: 'Stand-up comedy',
      why: 'Fyris Komedi and Comedy Nation. Competed in Uppsalas Roligaste 2026.',
    },
    {
      what: 'Acting',
      why: 'Short films: Tomma Händer (.MOV Filmfestival 2026), The Darkest Hour, Don’t Cry Over Spilled Milk.',
    },
    {
      what: 'Uppsala Zombie Walk organiser',
      why: 'Website, marketing, makeup and logistics. Featured on SVT and UNT.',
      links: [
        { text: 'SVT', href: 'https://www.svt.se/nyheter/lokalt/uppsala/zombie-walk-i-uppsala' },
        { text: 'UNT', href: 'https://www.unt.se/kultur/hogtider/artikel/har-intar-zombierna-stan-se-spoklika-vandringen-/reo9w2yl' },
      ],
    },
    /*
     * Sports is gone on Nam's call. It was the only item here that named a thing
     * without evidence behind it — the other three carry venues, festivals and
     * press — so it read as the line you add when the section looks short.
     */
  ] as Offstage[],
};

/**
 * Split a line into plain and linked segments.
 *
 * PURE, and it lives here rather than in a renderer because both the document
 * and the mock browser's Off the clock page have to produce the same sentence,
 * and the last time two views built the same content separately they drifted.
 * They build their own nodes from these segments; only the splitting is shared.
 *
 * Each mention matches its FIRST occurrence and only that one, searched left to
 * right from where the previous match ended. A mention whose text is not in the
 * line is skipped rather than thrown for: a broken link in a CV is bad, and a
 * blank page where the CV should be is worse.
 */
export function segments(text: string, links: Mention[] = []): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = [];
  let rest = text;
  for (const m of links) {
    const at = rest.indexOf(m.text);
    if (at < 0) continue;
    if (at > 0) out.push({ text: rest.slice(0, at) });
    out.push({ text: m.text, href: m.href });
    rest = rest.slice(at + m.text.length);
  }
  if (rest) out.push({ text: rest });
  return out;
}

/** Requirement-by-requirement, against the senior posting. */
export const requirementMap: { req: string; evidence: string; strength: 'strong' | 'met' | 'honest' }[] = [
  {
    req: "Bachelor's degree or equivalent",
    evidence: 'BS Computer Science, HUST. MSc Computer Science, Uppsala.',
    strength: 'strong',
  },
  {
    req: '5 years software development',
    evidence: 'Bkav 2013–2015, Wasabi Productions 2019–present. Twelve years since the first professional line.',
    strength: 'strong',
  },
  {
    req: '3 years front-end and UI development',
    evidence: 'Seven years leading front end at Wasabi Productions, including all UX and responsive work.',
    strength: 'strong',
  },
  {
    req: '3 years testing, maintaining or launching software',
    evidence: 'Two platform launches on the same product, plus a bot controller built to test live tables.',
    strength: 'strong',
  },
  {
    req: '1 year software design and architecture',
    evidence: 'Owned the desktop → web → React + Unity hybrid re-architecture, and the client/server API surface.',
    strength: 'strong',
  },
  {
    req: "Preferred: Master's or PhD",
    evidence: 'MSc, Uppsala University, 2018.',
    strength: 'strong',
  },
  {
    req: 'Preferred: 5 years data structures and algorithms',
    evidence: 'Four years optimisation research, two publications, a book chapter, a best-paper award, three semesters as an algorithms TA.',
    strength: 'strong',
  },
  {
    req: 'Preferred: technical leadership',
    evidence: 'Led a team of five for seven years: task breakdown, reviews, architecture decisions.',
    strength: 'strong',
  },
  {
    req: 'Preferred: accessible technologies',
    evidence:
      'No shipped product where it was my mandate. So the evidence is this build: keyboard-complete, screen-reader tested, with a live audit in the Engineering panel that is allowed to fail.',
    strength: 'honest',
  },
  {
    req: 'TypeScript (required for SWE III)',
    evidence: 'This site: strict TypeScript, no framework, no runtime dependencies, size-gated in CI.',
    strength: 'met',
  },
  {
    req: 'Agentic coding techniques and tools',
    evidence: 'Built with them, and the build log is in the Engineering panel: reviews, objections, what changed.',
    strength: 'met',
  },
];

/** For the friend who has to put his name on it (review H4, R2, R5). Fact-only. */
export const referralBlurb =
  'Nam Nguyen, front-end, Uppsala. Seven years as lead front-end developer on a real-time multiplayer ' +
  'game client at Wasabi Productions, where he took the product through every platform it has had ' +
  'to the browser and then to a React + Unity hybrid. Before that, two years of C++ on signing hardware at ' +
  'Bkav. MSc Computer Science from Uppsala, plus four years of optimisation research with two publications, ' +
  'a book chapter and a best-paper award, and three semesters as a teaching assistant for algorithms. ' +
  'Swedish C1, already resident and eligible to work, 38 minutes from the Stockholm office. He wrote his ' +
  'application as a TypeScript web app with no dependencies, a CI-enforced size budget and a test suite you ' +
  'can run in the browser: ';

export const meta = {
  siteName: 'Callback',
  why: [
    'A phone callback: what I am asking for.',
    'A JS callback: what the job is.',
    'A stand-up callback: a joke that refers back to an earlier joke.',
  ],
  /*
   * `disclaimer` is gone, and this is the third and last place it lived.
   *
   * It went from the CV footer first (N23) and from the ended screen last, both
   * times for the same two reasons: it is legal throat-clearing in the position
   * where a reader is deciding whether to keep going, and one of its sentences
   * was false. "No Google marks are used" while the shell renders the Meet mark
   * is R13 in tools/CV-PERCEPTION.md, and a disclaimer that is not true is worse
   * than no disclaimer, because it is the one paragraph a careful reader checks.
   *
   * The honest version of the same claim survives where it is actually load-
   * bearing: the README says exactly which two Google-owned things are used and
   * why, at length, to a reader who has chosen to read about the build.
   */
};
