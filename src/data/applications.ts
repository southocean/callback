// The application log: what was sent where, and what it taught.
//
// Board ticket N269, revised by N270. Nam: "this page will keep track of my
// applications and what I can learn from it, so I dont make the same mistake
// again."
//
// ---------------------------------------------------------------------------
// THE ENTRIES ARE IN THE REPO, AND THAT WAS HIS CALL TO MAKE.
//
// The first build kept them out of it. The reasoning was that prefs.ts says the
// admin grant is "not a security boundary", so a const here is hidden from the
// tab strip and from nothing else: it ships in the bundle, on a site that
// invites people to read its source, out of a public repository. Which is all
// still true. It just is not a problem:
//
//   Nam: "no this is fine too, I dont care. I just want to keep track and has
//   no problem with privacy."
//
// So the reader should know what they are looking at rather than assume a
// privacy this does not have: ANYONE CAN READ THIS. It is in the public repo
// and in the shipped JavaScript. Write entries on that basis.
//
// WHAT THE FILE IS FOR, now that it holds data. It is the seed and the backup.
// The tab edits a working copy in localStorage so an entry can be added in ten
// seconds without a rebuild; this array is what a browser with no working copy
// starts from, which is also what survives clearing site data, a new machine
// and a new browser. The tab's Copy control emits the whole log as JSON to
// paste back in here when it is worth committing.
//
// Two sources needs one rule, so here it is: LOCALSTORAGE WINS WHILE IT EXISTS.
// The file is where the log is kept; the browser is where it is being edited.

/** Where an application has got to. One field, because two booleans lie. */
export type Outcome = 'draft' | 'applied' | 'screening' | 'interviewing' | 'rejected' | 'offer' | 'declined';

export const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'draft', label: 'Not sent' },
  { id: 'applied', label: 'Applied' },
  { id: 'screening', label: 'In screening' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'offer', label: 'Offer' },
  { id: 'declined', label: 'Declined it' },
];

export interface Application {
  id: string;
  company: string;
  /** The role as they advertise it, so it still matches the posting later. */
  role: string;
  /** The posting. Worth keeping: ads come down and the requirements go with them. */
  url: string;
  /**
   * Which CV was sent. The name of a jobs/<name>.json, or empty for the generic
   * one, so a lesson about wording can be traced to the document that carried it.
   */
  cv: string;
  /** ISO date, or empty while it is still a draft. */
  applied: string;
  outcome: Outcome;
  /**
   * What to do differently. The whole reason the tab exists, and the reason
   * `outcome` alone would not have been enough: a rejection with no line here
   * is a thing that happened rather than a thing learned.
   */
  lessons: string[];
}

/**
 * The log as committed. See the note at the top: this is the seed and the
 * backup, and the browser holds the working copy.
 */
export const SEED: Application[] = [
  {
    id: 'a-google',
    company: 'Google',
    role: 'Software Engineer III, Google Meet Web Experiences',
    url: '',
    cv: '',
    applied: '2026-09-21',
    outcome: 'rejected',
    lessons: [
      'Rejected as not meeting the minimum requirements, which on paper he does. Worth treating as a keyword result rather than a judgement, because every minimum was met.',
      'THE PDF NEVER SAYS HOW MANY YEARS. The one sentence that does, the summary line, is hidden from print by @media print in styles.css. For a requirement written in years, that is the wrong thing to cut.',
      'No literal "Bachelor" or "Master" anywhere. The PDF says BS and MSc, and a filter looking for the word finds neither.',
      'No "Software Engineer" as a job title. Every title on the CV reads Lead front-end developer or C++ developer.',
      'No HTML, CSS, Node, Git, CI/CD or REST anywhere in the PDF, on an application for a web client role.',
      'The skills tags on the application form were missing React and any front-end discipline tag until the day of sending.',
      'The PDF itself is machine-readable: 2434 characters extract cleanly with a real parser. The problem was what it said, not whether it could be read.',
    ],
  },
  {
    id: 'a-tv4',
    company: 'TV4',
    role: 'Sr. Fullstack Engineer, Frontend and Content Experience',
    url: 'https://jobb.tv4.se/jobs/8259879-sr-fullstack-engineer-frontend-content-experience',
    cv: 'tv4',
    applied: '',
    outcome: 'draft',
    lessons: [
      'Carry the literal phrases from the ad: React, TypeScript, frontend architecture, performance optimisation, backend development, API integration, cloud.',
      'State the years in words, not only as date ranges.',
      'Lead with the agentic tooling. Their stack names Claude Code and OpenAI Codex, and building the harness is rarer than using the tool.',
      'The gap to answer directly rather than hope nobody asks: cloud. It is a required qualification and nothing on the CV mentions it.',
    ],
  },
];

const KEY = 'callback.retro';

/**
 * Read the log.
 *
 * Tolerant on purpose. This is hand-edited JSON pasted in by one person, and
 * the failure it must not have is losing the lot because one entry is malformed:
 * anything unreadable returns empty and leaves the stored string alone, so the
 * Paste box can still be used to fix it.
 */
export function readLog(): Application[] {
  try {
    const raw = localStorage.getItem(KEY);
    // No working copy: start from the file. An empty ARRAY in storage is a
    // different thing from no key at all, and means he deleted every entry,
    // so that is honoured rather than silently refilled from the seed.
    if (raw === null) return SEED.map((a) => ({ ...a, lessons: [...a.lessons] }));
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is Application => !!x && typeof x === 'object' && 'company' in x);
  } catch {
    return [];
  }
}

export function writeLog(list: Application[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* Private mode, or a full quota. The tab reports it; there is nothing to do here. */
  }
}

/** A stable id that does not depend on position, so reordering rewrites nothing. */
export function newId(): string {
  return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function blankEntry(): Application {
  return { id: newId(), company: '', role: '', url: '', cv: '', applied: '', outcome: 'draft', lessons: [] };
}

export { KEY as RETRO_KEY };
