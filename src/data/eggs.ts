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
// TWO eggs roam, and they are the teaching pair. Nam: "we dont know which day
// the interviewer will check this so they may miss these visible eggs we
// intentionally placed to introduce them the eggs." They used to sit three days
// apart on real dates, which meant they were only both on screen during one week
// of the year. Now they are placed against today: one three days back, one two
// days forward, which puts both inside the seven-day strip whatever day the page
// is opened, because the strip centres on the selected day.
//
// The rest are on real dates -- the zombie walk on Halloween, the parade on the
// day of the parade, the competition on the night it ran. Finding those is the
// game.

export interface Egg {
  /** Stable id, used in the URL so an egg can be linked directly. */
  id: string;
  /** Fixed calendar date as [month, day], 1-indexed. Omitted for the roamers. */
  on?: [number, number];
  /**
   * Days from today, for the two eggs that follow the visitor around. Positive
   * is in the past, negative is in the future, and both must stay within three
   * of zero or they fall outside the strip that is meant to show them off.
   */
  offset?: number;
  /** What the meeting is called in the list. */
  title: string;
  /** The line under the title, in the meeting card. */
  blurb: string;
  /** Clip and poster, both already in docs/media. */
  clip: string;
  poster: string;
  /**
   * The encoded frame. Read off the file with ffprobe, not intended: the player
   * window sizes itself to this before a byte of video is fetched, so a number
   * that disagrees with the file is a window that opens the wrong shape and then
   * letterboxes inside its own mistake.
   */
  w: number;
  h: number;
  /** Shown as the shared-screen caption while it plays. */
  caption: string;
}

/*
 * The files are named for what the clip IS, not for what it is footage of.
 * Nam asked for the rename and it does real work: the emulated Explorer lists
 * these by filename, so a file named after its subject gave away the contents of
 * an egg before anyone opened it. `i-can-fly.mp4` gives away nothing and reads
 * like something a person would actually name a file.
 */
export const eggs: Egg[] = [
  {
    id: 'skydive',
    offset: 3,
    title: 'Falling out of a plane',
    blurb: 'Tandem jump. The face at second four is the honest one.',
    clip: 'media/i-can-fly.mp4',
    poster: 'media/i-can-fly.jpg',
    w: 480,
    h: 480,
    caption: 'Sharing screen, i-can-fly.mp4',
  },
  {
    // Was pointing at the living-room self-tape as a stand-in. This is the film
    // itself now -- Nam picked the cut, 11:20 to 11:50, which is the sequence
    // with the most shouting in it. English subtitles are burned into the print.
    id: 'premiere',
    offset: -2,
    title: 'Movie premier',
    blurb: 'Tomma Händer, on a real screen. Thirty seconds of the loudest part.',
    clip: 'media/its-my-money.mp4',
    poster: 'media/its-my-money.jpg',
    w: 720,
    h: 390,
    caption: 'Sharing screen, its-my-money.mp4',
  },
  {
    // Two meetings, one night, one date. The set and then the result, which is
    // the only pair here that has to stay in order -- and the reason a day can
    // hold more than one meeting at all.
    id: 'standup',
    on: [3, 15],
    title: 'Standup competition',
    blurb: 'Uppsalas Roligaste 2026, mid-set. The frame you want is the room, not me.',
    clip: 'media/uppsala-roligaste.mp4',
    poster: 'media/uppsala-roligaste.jpg',
    w: 396,
    h: 704,
    caption: 'Sharing screen, uppsala-roligaste.mp4',
  },
  {
    id: 'winner',
    on: [3, 15],
    title: 'The winner is…',
    blurb: 'Same night, the other end of it. Everyone who competed, back on stage.',
    clip: 'media/the-winner-is.mp4',
    poster: 'media/the-winner-is.jpg',
    w: 704,
    h: 396,
    caption: 'Sharing screen, the-winner-is.mp4',
  },
  {
    id: 'pride',
    on: [8, 1],
    title: 'A dragon in the parade',
    blurb: 'Stockholm Pride. A handmade head, and a crowd that went with it.',
    clip: 'media/dragon-strut.mp4',
    poster: 'media/dragon-strut.jpg',
    w: 396,
    h: 704,
    caption: 'Sharing screen, dragon-strut.mp4',
  },
  {
    // Early October, which is when a Halloween park casts its monsters. It used
    // to be titled with the park's name, which gave away both the answer and the
    // joke; the tease is the whole point of a date three weeks before Halloween.
    id: 'teaser',
    on: [10, 4],
    title: 'Coming this Halloween',
    blurb: 'The brief was “scariest”, and there is no dignified way to go for it.',
    clip: 'media/laskigare-an-zombie.mp4',
    poster: 'media/laskigare-an-zombie.jpg',
    w: 396,
    h: 704,
    caption: 'Sharing screen, laskigare-an-zombie.mp4',
  },
  {
    id: 'halloween',
    on: [10, 31],
    title: 'Uppsala Zombie Walk',
    blurb: 'The one he organised. Website, marketing, makeup and logistics, then this.',
    clip: 'media/a-deadly-feast.mp4',
    poster: 'media/a-deadly-feast.jpg',
    w: 704,
    h: 396,
    caption: 'Sharing screen, a-deadly-feast.mp4',
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
 *
 * The value is a LIST, not a single egg. The stand-up set and the result it led
 * to happened on one night and belong on one day, and a map keyed to a single
 * egg silently dropped whichever was declared second — the dot appeared, the
 * meeting did not.
 */
export function eggMap(today: Date): Map<string, Egg[]> {
  const out = new Map<string, Egg[]>();
  const put = (k: string, e: Egg): void => {
    const at = out.get(k);
    if (at) at.push(e);
    else out.set(k, [e]);
  };
  for (const e of eggs) {
    if (e.offset !== undefined) {
      const d = new Date(today);
      d.setDate(d.getDate() - e.offset);
      put(key(d), e);
      continue;
    }
    if (!e.on) continue;
    // Place fixed dates in whichever year keeps them findable: this year, and
    // also last year, so browsing backwards from January still turns them up.
    for (const yr of [today.getFullYear(), today.getFullYear() - 1]) {
      put(key(new Date(yr, e.on[0] - 1, e.on[1])), e);
    }
  }
  return out;
}

export function eggById(id: string): Egg | undefined {
  return eggs.find((e) => e.id === id);
}
