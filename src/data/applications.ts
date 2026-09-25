// The application log: what was sent where, and what it taught.
//
// Board ticket N269. Nam: "this page will keep track of my applications and what
// I can learn from it, so I dont make the same mistake again."
//
// ---------------------------------------------------------------------------
// THERE IS NO DATA IN THIS FILE, AND THAT IS THE DESIGN.
//
// The obvious build puts the entries in a const here, renders them behind the
// admin tab and calls it private. It would not be private by any reading:
//
//   - prefs.ts says so itself about the grant. "Not a security boundary ...
//     Anyone who opens devtools can write thirty ids into it." A client-side
//     gate hides a tab, not a string.
//   - the entries would be in the shipped bundle, so they are one view-source
//     away on a site whose whole invitation is "look at how this is built".
//   - this repository is public. A committed line reading "Google, rejected,
//     did not meet minimum requirements" is published the moment it lands.
//
// Every one of those is fine for a CV, which is a document meant to be read,
// and none of them are fine for a list of rejections. So the entries live in
// localStorage on Nam's own machine, this module carries only the shape and the
// reading and writing of it, and nothing about where he applied is ever in the
// repo, the bundle or the deployed site.
//
// The cost is real and worth stating: it lives in one browser. Clearing site
// data loses it, which is why the tab has Copy and Paste controls and why the
// Settings tab lists the key. A backup is one click and belongs wherever he
// keeps things, not here.

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
    if (!raw) return [];
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
