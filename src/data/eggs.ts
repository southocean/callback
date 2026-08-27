// The hobby calendar.
//
// Meet's home screen is a day view over a calendar, which turns out to be the
// natural home for the parts of a CV that are not work. A recruiter who only
// wants the career never sees them; anyone who pokes at the calendar finds a
// person.
//
// The mechanic is deliberately Meet's own rather than something invented on top:
// a day with something on it shows a mark, the day opens to a meeting, and the
// meeting opens to a screen share. No new interaction to learn.
//
// One egg sits inside the current week no matter when the page is opened, so the
// mark is always discoverable without hunting. The rest are on real dates —
// Halloween has the prosthetics, the Robinson audition sits on the day it was
// actually filmed, and the premiere is the day Tomma Händer screened. Finding
// those is the game.

export interface Egg {
  /** Stable id, used in the URL so an egg can be linked directly. */
  id: string;
  /** Fixed calendar date as [month, day], 1-indexed. Omitted for the roamer. */
  on?: [number, number];
  /** Days before today. Used only by the one egg that follows you around. */
  offset?: number;
  /** What the meeting is called in the list. */
  title: string;
  /** The line under the title, in the meeting card. */
  blurb: string;
  /** Clip and poster, both already in docs/media. */
  clip: string;
  poster: string;
  /** Shown as the shared-screen caption while it plays. */
  caption: string;
}

export const eggs: Egg[] = [
  {
    id: 'skydive',
    offset: 2,
    title: 'Falling out of a plane',
    blurb: 'Tandem jump. The face at second four is the honest one.',
    clip: 'media/skydive.mp4',
    poster: 'media/skydive.jpg',
    caption: 'Sharing screen, skydive.mp4',
  },
  {
    id: 'halloween',
    on: [10, 31],
    title: 'Prosthetics, applied badly',
    blurb: 'Halloween. Silicone, latex and an unreasonable amount of patience.',
    clip: 'media/sfx.mp4',
    poster: 'media/sfx.jpg',
    caption: 'Sharing screen, sfx.mp4',
  },
  {
    id: 'robinson',
    on: [9, 26],
    title: 'Robinson audition tape',
    blurb: 'Filmed on this day. The main story, still unfinished.',
    clip: 'media/robinson.mp4',
    poster: 'media/robinson.jpg',
    caption: 'Sharing screen, robinson.mp4',
  },
  {
    id: 'standup',
    on: [3, 15],
    title: 'Five minutes at an open mic',
    blurb: 'Standup. Two of the jokes land, which is a respectable ratio.',
    clip: 'media/standup.mp4',
    poster: 'media/standup.jpg',
    caption: 'Sharing screen, standup.mp4',
  },
  {
    // Was pointing at the living-room self-tape as a stand-in. This is the film
    // itself now — Nam picked the cut, 11:20 to 11:50, which is the sequence
    // with the most shouting in it. English subtitles are burned into the print.
    id: 'premiere',
    on: [8, 28],
    title: 'Movie premier',
    blurb: 'Tomma Händer, on a real screen. Thirty seconds of the loudest part.',
    clip: 'media/premiere.mp4',
    poster: 'media/premiere.jpg',
    caption: 'Sharing screen, premiere.mp4',
  },
  {
    // Early October, which is when a Halloween park casts its monsters — and far
    // enough from the 31st that it does not collide with the prosthetics egg.
    id: 'zombie',
    on: [10, 4],
    title: 'Furuviksparken scariest monster',
    blurb: 'Audition tape. The brief was “scariest”, and there is no dignified way to go for it.',
    clip: 'media/zombie.mp4',
    poster: 'media/zombie.jpg',
    caption: 'Sharing screen, zombie.mp4',
  },
];

/** yyyy-mm-dd, local time — never toISOString, which shifts across midnight. */
export function key(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Which eggs land on which dates, for the year around a given date. Built as a
 * map so both the week strip and the month grid can ask "is there a mark here?"
 * without re-deriving the rules.
 */
export function eggMap(today: Date): Map<string, Egg> {
  const out = new Map<string, Egg>();
  for (const e of eggs) {
    if (e.offset !== undefined) {
      const d = new Date(today);
      d.setDate(d.getDate() - e.offset);
      out.set(key(d), e);
      continue;
    }
    if (!e.on) continue;
    // Place fixed dates in whichever year keeps them findable: this year, and
    // also last year, so browsing backwards from January still turns them up.
    for (const yr of [today.getFullYear(), today.getFullYear() - 1]) {
      out.set(key(new Date(yr, e.on[0] - 1, e.on[1])), e);
    }
  }
  return out;
}

export function eggById(id: string): Egg | undefined {
  return eggs.find((e) => e.id === id);
}
