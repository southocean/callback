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
// intentionally placed to introduce them the eggs." They used to sit on real
// dates, which meant they were only both on screen during one week of the year.
//
// They are anchored to the WEEKEND now, and the reason is the shape of the strip
// above them. It runs Sunday to Saturday, fixed, so a placement counted in days
// from today falls off one end or the other depending on which day you open the
// page: three days before a Monday is last week. The weekend of the current week
// is the one thing that is always in view and is never a workday, which is also
// the honest place to put a film premiere and a tandem jump.
//
// The premiere takes a weekend day of the visitor's own week, never today, so
// there is always exactly one mark on the first screen. The jump takes the OTHER
// weekend day, one week back. Nam: "say movie is on sat, then tandem on sun last
// week, and vice versa. We change it up a little bit." Which it does: the pair
// lands on Saturday-then-Sunday or Sunday-then-Saturday depending on the day you
// arrive, so two visitors on different days do not see the same arrangement.
//
// The jump is off the edge of the strip either way, and Nam accepted that rather
// than crowd one week with both marks. "Now it will be off screen unfortunately,
// but lets hope the movie premier is enough to teach user about these easter
// eggs." It is one press of the back arrow away, which is the first thing anyone
// does once they know the dots mean something.
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
   * For the two eggs that follow the visitor around, which weekend they land on:
   * the one in the strip currently on screen, or the one a week before it.
   * Anything counted in days from today cannot survive a fixed Sunday-to-Saturday
   * week, which is why this names a weekend rather than a number.
   */
  roams?: 'thisWeekend' | 'lastWeekend';
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
    roams: 'lastWeekend',
    title: 'Falling out of a plane',
    blurb: 'My first tandem jump. After that, every second is borrowed time.',
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
    roams: 'thisWeekend',
    title: 'Movie premier',
    blurb: 'Tomma Händer, a short film about Viet immigrants in Sweden. I was bruised for weeks.',
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
    blurb: "After a respectable career in standup, I've earned a whopping 21 kr.",
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
    blurb: 'The most shitty part is that his whole set was about pooping.',
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
    blurb: 'I love to party, what can I say.',
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
    blurb: 'See you this Halloween at the nearest park ;)',
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
    blurb: 'So much fun! Honestly, should be in the Olympics.',
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
/**
 * The weekend day the teaching egg lands on, in the Sunday-to-Saturday week that
 * contains `today`.
 *
 * Saturday, which closes the week and is where a premiere belongs, except when
 * today IS Saturday: then it is the Sunday that opened the same week. Nam: "if
 * today is sat, then the egg will be on sun, and vice versa." Both branches keep
 * the mark inside the strip and off today, which already has the interview on it
 * and does not need a second card competing with the thing the page is for.
 */
export function weekendMark(today: Date): Date {
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay());        // Sunday, the left edge of the strip
  if (today.getDay() !== 6) d.setDate(d.getDate() + 6);
  return d;
}

/**
 * And the second one: the OTHER weekend day, a week earlier.
 *
 * Nam: "say movie is on sat, then tandem on sun last week, and vice versa."
 * Derived from where the first mark landed rather than computed independently,
 * so the two can never drift into agreeing. Saturday's counterpart is the
 * previous week's Sunday, which is eight days back; Sunday's is the previous
 * week's Saturday, which is one day back and still a week apart on the strip.
 */
export function lastWeekendMark(today: Date): Date {
  const first = weekendMark(today);
  const d = new Date(first);
  // Saturday pairs with the Sunday that opened the week before it; Sunday pairs
  // with the Saturday that closed it.
  d.setDate(first.getDate() - (first.getDay() === 6 ? 13 : 1));
  return d;
}

export function eggMap(today: Date): Map<string, Egg[]> {
  const out = new Map<string, Egg[]>();
  const put = (k: string, e: Egg): void => {
    const at = out.get(k);
    if (at) at.push(e);
    else out.set(k, [e]);
  };
  for (const e of eggs) {
    if (e.roams) {
      put(key(e.roams === 'lastWeekend' ? lastWeekendMark(today) : weekendMark(today)), e);
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
