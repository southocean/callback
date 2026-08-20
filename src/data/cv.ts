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

export interface TranscriptLine {
  at: number;
  speaker: string;
  text: string;
}

export const profile = {
  name: 'Nam Nguyen',
  headline: 'Lead front-end developer',
  target: 'Senior Software Engineer, Web Development — Google Meet, Stockholm',
  targetAlt: 'Software Engineer III, Google Meet Web Experiences',
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

/** The one-liner. Five seconds to land (review U5). */
export const pitch =
  'I have spent seven years leading the front end of a real-time multiplayer client — ' +
  'shared state, reconnection, latency, a rendering engine embedded in a web app. ' +
  'That is the same shape of problem as a video call.';

export const roles: Role[] = [
  {
    id: 'nobisoft',
    org: 'Nobisoft',
    title: 'Sales representative',
    from: 2025.85,
    to: null,
    fromLabel: 'Nov 2025',
    toLabel: 'present',
    place: 'Sweden & Scandinavia',
    kind: 'commercial',
    gist: 'A deliberate detour into the customer side, held alongside the engineering work.',
    bullets: [
      'Outsourcing solutions for Scandinavian markets: find the pain point, scope the fix, price it.',
      'Worked alongside the delivery team through onboarding, translating what a client said into what an engineer needed.',
      'Taken on while continuing to lead front end at Mahjong Logic — the two overlap on purpose.',
      'What it bought: the habit of arguing for a technical decision in the language of the person paying for it. Useful in a design review.',
    ],
  },
  {
    id: 'mahjong',
    org: 'Mahjong Logic',
    title: 'Lead front-end developer',
    from: 2019.25,
    to: null,
    fromLabel: 'Apr 2019',
    toLabel: 'present',
    place: 'Uppsala, Sweden',
    kind: 'engineering',
    gist: 'Seven years on a real-time multiplayer game client. The closest thing on this CV to a video call.',
    bullets: [
      'Game client for online mahjong, built for the Chinese and Japanese markets.',
      'Led the product through two platform generations: native desktop app, to web, to a hybrid React + Unity client.',
      'Led a team of five. Broke down and distributed the work, ran the reviews, owned the calls.',
      'UX and responsive design, API design, internal tooling (a bot controller for testing live tables), payments and analytics integration.',
      'Worked directly with designers, marketing and investors — the technical argument had to survive contact with all three.',
    ],
  },
  {
    id: 'infolab',
    org: 'InfoLab, Uppsala University',
    title: "Master's thesis",
    from: 2018.0,
    to: 2018.85,
    fromLabel: 'Jan 2018',
    toLabel: 'Nov 2018',
    place: 'Uppsala, Sweden',
    kind: 'research',
    gist: 'Graph mining on Twitter. Shipped into an open-source library, not a drawer.',
    bullets: [
      'Graph mining over Twitter data, contributed to the Multinet open-source library.',
      'Supervised by Prof. Matteo Magnani.',
    ],
  },
  {
    id: 'msolab',
    org: 'MSO Lab, HUST',
    title: 'Research assistant',
    from: 2014.0,
    to: 2017.0,
    fromLabel: '2014',
    toLabel: '2017',
    place: 'Hanoi, Vietnam',
    kind: 'research',
    gist: 'Three years of combinatorial optimisation. This is where the algorithms came from.',
    bullets: [
      'Wireless sensor network optimisation, with Hanh N.T. and Prof. Binh H.T.T.',
      'Grant co-holder: IEEE AIYEHUM 2016 and 2017, IEEE R-10 HTA 2017.',
      'Two publications, one book chapter, one best-paper award.',
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
      'Researched and built eToken, a hardware security token for signing and verifying digital signatures.',
      'Delivered a beta meeting the relevant ISO standards.',
    ],
  },
];

export const caseStudies: CaseStudy[] = [
  {
    id: 'mahjong',
    title: 'A real-time multiplayer client, through two platform migrations',
    org: 'Mahjong Logic',
    years: '2019 — present',
    stack: ['JavaScript', 'React', 'Unity', 'C#', 'REST APIs', 'responsive UI'],
    problem:
      'Four players at a table, in different countries, on different networks, all of whom must see the same ' +
      'board at the same moment. One of them is on hotel wifi. The client has to stay honest about shared ' +
      'state while the connection underneath it is not honest at all.',
    approach: [
      'Took the product from a native desktop app to the browser, then to a hybrid client running React for interface and Unity for the table itself — embedding a rendering engine inside a web app and keeping the two in step.',
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
      'A real unit-test suite over real logic — the state reducer, timeline geometry, the caption scheduler, the network model. It runs in CI and it runs in your browser, in the Engineering panel.',
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
    title: 'eToken — signing hardware, in C++',
    org: 'Bkav Corp.',
    years: '2013 — 2015',
    stack: ['C++', 'cryptographic signing', 'ISO conformance'],
    problem:
      'A device that signs documents has no acceptable margin of error and no useful way to say "roughly".',
    approach: [
      'Researched and implemented the token that signs and verifies digital signatures.',
      'Drove it to a beta meeting the relevant ISO standards — conformance as the definition of done, rather than a phase at the end.',
    ],
    relevance:
      'Two years in a codebase where correctness was the product. It is the reason I write tests before I am asked to.',
  },
  {
    id: 'research',
    title: 'Combinatorial optimisation, published',
    org: 'MSO Lab, HUST · InfoLab, Uppsala',
    years: '2014 — 2018',
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
      'problems — it is four years of it, peer-reviewed, and three semesters of teaching it to other people.',
  },
];

/** The cover letter, as a chat thread. */
export const chat: ChatMessage[] = [
  {
    from: 'system',
    at: '',
    text: 'Nam started a call. This panel is the cover letter — he just refused to attach it as a .docx.',
  },
  {
    from: 'nam',
    at: '09:00',
    text: "Hi. I'm Nam, I live in Uppsala, and I want the Web Development role on Google Meet in Stockholm.",
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
      'I took that client from a desktop app to the browser, then to a React + Unity hybrid — a rendering ' +
      'engine living inside a web page, which is a sentence I understand the cost of. I led the five people ' +
      'who did it with me.',
  },
  {
    from: 'nam',
    at: '09:02',
    text:
      'Before that: two years of C++ on signing hardware, where correctness was the product. Before that, ' +
      'four years of optimisation research — two papers, a book chapter, a best-paper award, and three ' +
      'semesters as a teaching assistant for algorithms. Your ad asks for data structures and algorithms. ' +
      'That part I can show you.',
  },
  {
    from: 'nam',
    at: '09:03',
    text:
      'One thing I will not pretend about: accessibility is listed as preferred and I have not shipped a ' +
      'product where it was my mandate. So I did the work here instead — this page is keyboard-complete, ' +
      'screen-reader tested, and the Engineering panel audits it live and is allowed to fail. Judge it on that.',
  },
  {
    from: 'nam',
    at: '09:04',
    text:
      'Your posting mentions agentic coding. I built this with it, and left the build log in the Engineering ' +
      'panel — including three rounds of people picking the plan apart, and what I changed each time.',
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
      'End the call whenever you like — there is a PDF and an email address on the way out.',
  },
];

/** Labelled as scripted. Nothing here pretends to be live speech (review T11). */
export const transcript: TranscriptLine[] = [
  { at: 0, speaker: 'Nam', text: 'Thanks for joining. I know a CV that opens a call is a bit much.' },
  { at: 4, speaker: 'Nam', text: "So let me be quick about why I'm in your applicant pool." },
  { at: 8, speaker: 'Nam', text: 'Seven years leading the front end of a real-time multiplayer client.' },
  { at: 13, speaker: 'Nam', text: 'Four players, four networks, one shared board, no excuses about latency.' },
  { at: 18, speaker: 'Nam', text: 'Desktop, then web, then a Unity renderer embedded in a React app.' },
  { at: 23, speaker: 'Nam', text: 'A team of five, and the design reviews to go with it.' },
  { at: 27, speaker: 'Nam', text: 'Before that, C++ on signing hardware. Correctness was the product.' },
  { at: 32, speaker: 'Nam', text: 'Before that, four years of optimisation research and a best-paper award.' },
  { at: 37, speaker: 'Nam', text: 'This page is TypeScript, no framework, no dependencies, under budget.' },
  { at: 42, speaker: 'Nam', text: 'The tests are real, they run in your browser, and you can break them.' },
  { at: 47, speaker: 'Nam', text: 'I live 38 minutes away and I speak Swedish. Your move.' },
];

export const skills = {
  primary: [
    { name: 'TypeScript', note: 'this site: strict, zero dependencies, under a size budget enforced in CI' },
    { name: 'JavaScript', note: 'over 10,000 lines' },
    { name: 'React', note: 'seven years on a production client, through a full re-architecture' },
    { name: 'Test automation', note: 'bot controller driving live game tables; the suite in the Engineering panel' },
    { name: 'C++', note: 'over 10,000 lines — signing hardware at Bkav' },
    { name: 'Java', note: 'over 10,000 lines' },
    { name: 'C#', note: 'over 10,000 lines — Unity client work' },
    { name: 'WebGL / real-time rendering', note: 'the effects pipeline on this page' },
  ],
  volume: {
    'Over 10,000 lines': ['C', 'C++', 'C#', 'Dart', 'Java', 'JavaScript'],
    'Over 1,000 lines': ['Erlang', 'SQL', 'Python', 'Matlab', 'R', 'PHP'],
    Familiar: ['Flutter', 'Unity', 'React', 'Figma', 'UML', 'Spark', 'MySQL'],
  } as Record<string, string[]>,
};

export const education = [
  { school: 'Uppsala University', award: 'MSc, Computer Science', years: '2016 — 2018', place: 'Uppsala, Sweden' },
  {
    school: 'Tokyo University of Agriculture and Technology',
    award: 'Research exchange',
    years: '2015',
    place: 'Tokyo, Japan',
  },
  {
    school: 'Hanoi University of Science and Technology',
    award: 'BS, Computer Science',
    years: '2011 — 2016',
    place: 'Hanoi, Vietnam',
  },
];

export const teaching = [
  'Database Design (HT16, HT17)',
  'Advanced Software Design (HT17)',
  'Genetic Algorithms (2014 — 2015)',
];

export const honours = [
  { year: '2018', what: 'Co-author, book chapter in Soft Computing' },
  { year: '2016', what: 'Erasmus+, Uppsala University' },
  { year: '2016', what: '1st place, Student Research Competition, HUST' },
  { year: '2015', what: 'Best paper, IEEE R10-HTC Conference, Philippines' },
  { year: '2015', what: 'Participant, EBA fieldwork, Philippines' },
  { year: '2014', what: 'Participant, JENESYS 2.0, Tokyo' },
];

export const offstage = {
  intro: 'Not filler. Two of these are the reason the page you are looking at exists.',
  items: [
    { what: 'Stand-up comedian', why: 'Ten seconds to find out whether a thing lands. Same instinct as a UX review.' },
    { what: 'Actor', why: 'The other side of the camera. Useful when the product is a camera.' },
    { what: 'SFX artist', why: 'Why the effects pipeline in the Engineering panel is a real one.' },
    { what: 'Zombie walk organiser', why: 'Crowd logistics, in makeup.' },
    { what: 'Brazilian jiu-jitsu', why: 'Losing repeatedly to better people, on purpose, as a hobby.' },
  ],
};

/** Requirement-by-requirement, against the senior posting. */
export const requirementMap: { req: string; evidence: string; strength: 'strong' | 'met' | 'honest' }[] = [
  {
    req: "Bachelor's degree or equivalent",
    evidence: 'BS Computer Science, HUST. MSc Computer Science, Uppsala.',
    strength: 'strong',
  },
  {
    req: '5 years software development',
    evidence: 'Bkav 2013—2015, Mahjong Logic 2019—present. Twelve years since the first professional line.',
    strength: 'strong',
  },
  {
    req: '3 years front-end and UI development',
    evidence: 'Seven years leading front end at Mahjong Logic, including all UX and responsive work.',
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
    evidence: 'Led a team of five for seven years — task breakdown, reviews, architecture decisions.',
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
    evidence: 'This site was built with them, and the build log is in the Engineering panel — reviews, objections, and what changed.',
    strength: 'met',
  },
];

/** For the friend who has to put his name on it (review H4, R2, R5). Fact-only. */
export const referralBlurb =
  'Nam Nguyen — front-end, Uppsala. Seven years as lead front-end developer on a real-time multiplayer ' +
  'game client at Mahjong Logic, where he led a team of five and took the product from a native desktop app ' +
  'to the browser and then to a React + Unity hybrid. Before that, two years of C++ on signing hardware at ' +
  'Bkav. MSc Computer Science from Uppsala, plus four years of optimisation research with two publications, ' +
  'a book chapter and a best-paper award, and three semesters as a teaching assistant for algorithms. ' +
  'Swedish C1, already resident and eligible to work, 38 minutes from the Stockholm office. He wrote his ' +
  'application as a TypeScript web app with no dependencies, a CI-enforced size budget and a test suite you ' +
  'can run in the browser: ';

export const meta = {
  siteName: 'Callback',
  why: [
    'A phone callback — what I am asking for.',
    'A JS callback — what the job is.',
    'A stand-up callback — a joke that refers back to an earlier joke.',
  ],
  disclaimer:
    'Not affiliated with, endorsed by, or built at Google. No Google marks are used. This is an homage to a ' +
    'product I like, built as a job application by one person in Uppsala.',
};
