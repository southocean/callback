// What they found in THIS visit, as opposed to ever.
//
// Board ticket N137. Nam: "On ended screen, we show the run time then underneath
// is list of new things user has found in this pass, like new bugs, new
// achievements and new easter eggs."
//
// The ended screen used to report lifetime totals -- "Side quests: 12 of 17",
// "Bugs: 1 of 12" -- which is the wrong question for a screen you reach by
// leaving a call. A total is a fact about the visitor's whole history with the
// page and it reads the same on the fourth visit as on the first. What a
// post-call screen is for is the last twenty minutes: here is what you just did.
// The lifetime figure still exists, in the ring on the rail and the panel behind
// it, which is where a standing total belongs.
//
// SNAPSHOT AND DIFF, rather than a running log, and the difference matters for
// one case. A log would have to be written by every unlock site -- three
// collections, a dozen call sites -- and any one of them forgetting is a silent
// omission. A snapshot taken once when the call is entered and diffed once when
// it is left cannot miss anything, because it does not know or care how a thing
// got found. It also survives the collections growing a fourth member.
//
// NULL UNTIL A CALL IS ENTERED, which is not a defensive nicety. #ended is a real
// URL: reload on it, or arrive by link, and no pass ever began. Reporting
// everything as new there would tell a returning visitor they had just found
// forty things by pressing F5. No snapshot means no report, and the screen simply
// leaves the tiles out.

import { foundAll } from './prefs.js';
import { quests } from './data/quests.js';
import { bugs as allBugs } from './data/bugs.js';
import { eggs as allEggs } from './data/eggs.js';

export type PassSlice = 'quests' | 'bugs' | 'eggs';

/** One collection's worth of new finds, named the way a visitor would name them. */
export interface PassPart {
  key: PassSlice;
  /** Singular and plural, because "1 new clips" is the kind of thing people notice. */
  one: string;
  many: string;
  /** The names, in the order the lists declare them rather than the order found. */
  names: string[];
}

export interface Pass {
  parts: PassPart[];
  /** How many new things across all of them. Zero is a real and common answer. */
  got: number;
}

/** The three id lists, which is all a snapshot is. */
export interface Found {
  quests: string[];
  bugs: string[];
  eggs: string[];
}

let before: Found | null = null;

const snap = (): Found => {
  const f = foundAll();
  return { quests: [...f.quests], bugs: [...f.bugs], eggs: [...f.eggs] };
};

/**
 * The diff, kept pure and exported so the suite can drive it.
 *
 * PURE APART FROM THE THREE DATA READS, on purpose: everything that can be wrong
 * here is a set operation, and set operations are exactly the thing that looks
 * obviously right and is off by one. The three failures worth naming:
 *
 *   · An id in `now` that is not in `all` -- something renamed or deleted since
 *     the visitor found it. It must not be reported, because there is no name to
 *     print for it and no card it belongs to.
 *   · An id in `before` but not in `now`. Storage was cleared mid-call, which the
 *     admin panel can actually do. That is not a find and not a loss to report.
 *   · A duplicate in either list, which the storage format does not forbid.
 *
 * Filtering `all` rather than iterating `now` settles the first and the third at
 * once, and gives the names in DECLARED order rather than the order they were
 * found in -- which reads better in a sentence and is stable between renders.
 */
export function newFinds(had: Found, now: Found): PassPart[] {
  const fresh = <T extends { id: string }>(all: T[], have: string[], old: string[]): T[] => {
    const got = new Set(have);
    const was = new Set(old);
    return all.filter((x) => got.has(x.id) && !was.has(x.id));
  };
  return [
    {
      key: 'quests',
      one: 'quest',
      many: 'quests',
      names: fresh(quests, now.quests, had.quests).map((q) => q.name),
    },
    {
      key: 'bugs',
      one: 'bug',
      many: 'bugs',
      names: fresh(allBugs, now.bugs, had.bugs).map((b) => b.name),
    },
    {
      key: 'eggs',
      one: 'clip',
      many: 'clips',
      names: fresh(allEggs, now.eggs, had.eggs).map((e) => e.title),
    },
  ];
}

/**
 * Mark the start of a pass.
 *
 * Called from the router when the call is ENTERED, not when it renders: a
 * re-render is not a new visit, but a Rejoin is, and the second one has to reset
 * the mark or the ended screen would report the first pass again on top of the
 * second.
 */
export function beginPass(): void {
  before = snap();
}

/** Used by the test suite, which cannot rely on a router having run. */
export function resetPass(): void {
  before = null;
}

/** What turned up since the pass began, or null if no pass began. */
export function passFinds(): Pass | null {
  if (!before) return null;
  const parts = newFinds(before, snap());
  return { parts, got: parts.reduce((a, p) => a + p.names.length, 0) };
}
