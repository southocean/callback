// The itch.io back catalogue, as named games rather than a profile link.
//
// Nam: "when it comes to itch io, dont just list my itch io, pick some games
// there too where you can provide the link to open it, or at least have some
// graphics. Heres my itch io link: https://southocean.itch.io/. Go in there and
// get what you need."
//
// So this was read off that page rather than invented: every title, URL and
// tagline below is the one the profile shows. Thirteen are listed there; these
// are the six worth a reader's time, chosen for what they demonstrate rather
// than for polish — two rhythm games because the timing problem is the
// interesting one, a jam entry to show the constraint, and the mahjong prototype
// because it is the day job in miniature.
//
// The rest are still one click away: the profile link stays at the bottom of the
// list. What is gone is the version of this page that offered ONLY that link and
// asked the reader to do the browsing.

export interface Game {
  title: string;
  url: string;
  /** The profile's own tagline, not a rewrite of it. */
  tagline: string;
  /** Why it is on a CV. Ours, and honest about the small ones. */
  why: string;
  /** True where itch.io says "playable in browser". */
  playable: boolean;
}

export const games: Game[] = [
  {
    title: 'Mahjong Star',
    url: 'https://southocean.itch.io/mstar',
    tagline: 'The day job, in prototype form.',
    why: 'The same game the production client ships, small enough to read in one sitting.',
    playable: true,
  },
  {
    title: 'RhythmShoot 2.0',
    url: 'https://southocean.itch.io/rhythmshoot',
    tagline: 'A perfectly synced rhythm-based top-down shooter',
    why: 'Audio-clock sync, which is the same class of problem as a video call: two streams that must not drift.',
    playable: true,
  },
  {
    title: 'Rhythm Shoot',
    url: 'https://southocean.itch.io/rhythm-shoot',
    tagline: 'Rhythm-based top down shooter done in 10 minutes',
    why: 'Ten minutes, start to playable. Listed next to its own sequel on purpose: the pair is the point.',
    playable: true,
  },
  {
    title: 'Molt',
    url: 'https://southocean.itch.io/moult',
    tagline: 'Feed yourself with your own flesh and drown in your greed',
    why: 'A jam entry for #6 Jim Jam. Constraint, deadline, and a mechanic that had to be explained without words.',
    playable: true,
  },
  {
    title: 'LostSoul v2',
    url: 'https://southocean.itch.io/lostsoul-v2',
    tagline: 'Capturing ghosts with your camera in a peaceful cemetery',
    why: 'A camera as the whole interface. The second version exists because the first one taught what was wrong with it.',
    playable: true,
  },
  {
    title: 'Space Invasion',
    url: 'https://southocean.itch.io/space-invasion',
    tagline: 'Earn the power to manipulate space',
    why: 'Ludum Dare #61. Written to a theme, in a weekend.',
    playable: false,
  },
];
