// One number for all of it.
//
// Board ticket N118. Nam: "I want to have this one thing to tie all of these
// gamifications together: A completion percentage."
//
// There are three collections in this build and until now they were three
// separate things to care about: side quests in a tray, bugs in a cabinet, clips
// hidden in a calendar. Each has its own counter and its own surface, and none of
// them answers the question a completionist is actually asking, which is "how
// much of this is there".
//
// WHAT COUNTS, and the argument for each:
//
//   · QUESTS, all of them including the secret ones. A secret quest is findable,
//     and leaving it out of the total would mean 100% while three things are
//     still hidden. The tray hides them until found; the denominator does not.
//   · BUGS, which already behave like a collection and already have a cabinet.
//   · CLIPS, which are the oldest of the three and the only one that was ever
//     hidden on purpose.
//
// WHAT DOES NOT COUNT: the interview time, the answers heard in the personal
// segment, and anything else that is a state rather than a find. Progress has to
// be monotonic or the number is a mood ring.
//
// AND THE COMMENTARY IS OUT -- board ticket N137. Nam: "I dont really know how to
// count them into a category, let's just keep the acknowledgement texts out of
// this and its just a fun thing for user."
//
// He is right, and the reason is that a quip is not a find. The other three are
// objects: a quest is a thing you did, a bug is a thing you caught, a clip is a
// thing you opened, and each of them has a surface that will show it back to you.
// A quip is him noticing that you did something -- the reward is hearing it, and
// there is nothing to go back and look at. Putting it in the denominator turned
// twelve jokes into twelve errands, and the panel had no honest way to say where
// the missing ones were beyond "touch something out of the way". They still fire,
// they are still tracked so they fire only once, and they are no longer scored.
//
// PURE, apart from three reads. Every rule here is a function of counts, so the
// arithmetic is unit-tested and the storage is somebody else's problem.

import { quests } from './data/quests.js';
import { bugs } from './data/bugs.js';
import { eggs } from './data/eggs.js';

export type Slice = 'quests' | 'bugs' | 'eggs';

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
  quests: string[]; bugs: string[]; eggs: string[];
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
