// One number for all of it.
//
// Board ticket N118. Nam: "I want to have this one thing to tie all of these
// gamifications together: A completion percentage."
//
// There are four collections in this build and until now they were four separate
// things to care about: side quests in a tray, commentary that fires once, bugs
// in a cabinet, clips hidden in a calendar. Each has its own counter and its own
// surface, and none of them answers the question a completionist is actually
// asking, which is "how much of this is there".
//
// WHAT COUNTS, and the argument for each:
//
//   · QUESTS, all of them including the secret ones. A secret quest is findable,
//     and leaving it out of the total would mean 100% while three things are
//     still hidden. The tray hides them until found; the denominator does not.
//   · COMMENTARY, now that it is twelve deliberate discoveries rather than
//     twenty-nine receipts for using a computer. This is the collection the trim
//     in N118 was for: a line that fires when you drag a window is not progress.
//   · BUGS, which already behave like a collection and already have a cabinet.
//   · CLIPS, which are the oldest of the four and the only one that was ever
//     hidden on purpose.
//
// WHAT DOES NOT COUNT: the interview time, the answers heard in the personal
// segment, and anything else that is a state rather than a find. Progress has to
// be monotonic or the number is a mood ring.
//
// PURE, apart from four reads. Every rule here is a function of counts, so the
// arithmetic is unit-tested and the storage is somebody else's problem.

import { quests } from './data/quests.js';
import { quips } from './data/tour.js';
import { bugs } from './data/bugs.js';
import { eggs } from './data/eggs.js';

export type Slice = 'quests' | 'quips' | 'bugs' | 'eggs';

export interface Part {
  key: Slice;
  /** What it is called where a visitor can read it. */
  label: string;
  /** Where to go looking, for the ones they have not found. */
  where: string;
  got: number;
  total: number;
}

export interface Progress {
  parts: Part[];
  got: number;
  total: number;
  /** 0 to 100, rounded, and only 100 when every single thing is found. */
  pct: number;
}

/**
 * Rounded, except at the ends.
 *
 * A completionist reading 100% with one clip left would be right to call it a
 * lie, and somebody who has found exactly one thing should not read 0%. So the
 * rounding is clamped away from both ends and only the real extremes reach them.
 */
export function percent(got: number, total: number): number {
  if (total <= 0) return 0;
  if (got <= 0) return 0;
  if (got >= total) return 100;
  return Math.min(99, Math.max(1, Math.round((got / total) * 100)));
}

export function tally(found: {
  quests: string[]; quips: string[]; bugs: string[]; eggs: string[];
}): Progress {
  const count = (ids: string[], all: { id: string }[]): number => {
    const real = new Set(all.map((x) => x.id));
    // Only ids that still exist. A saved id for something since renamed or
    // removed must not push the numerator past the denominator.
    return new Set(ids.filter((id) => real.has(id))).size;
  };

  const parts: Part[] = [
    {
      key: 'quests',
      label: 'Side quests',
      where: 'Meeting tools, Storyline',
      got: count(found.quests, quests),
      total: quests.length,
    },
    {
      key: 'quips',
      label: 'Things he noticed',
      where: 'Touch something out of the way and see if he says anything',
      got: count(found.quips, quips),
      total: quips.length,
    },
    {
      key: 'bugs',
      label: 'Bugs',
      where: 'Press the same odd control three times',
      got: count(found.bugs, bugs),
      total: bugs.length,
    },
    {
      key: 'eggs',
      label: 'Clips',
      where: 'The calendar on the home screen',
      got: count(found.eggs, eggs),
      total: eggs.length,
    },
  ];

  const got = parts.reduce((a, p) => a + p.got, 0);
  const total = parts.reduce((a, p) => a + p.total, 0);
  return { parts, got, total, pct: percent(got, total) };
}
