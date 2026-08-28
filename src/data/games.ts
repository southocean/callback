// The itch.io back catalogue, as named games rather than a profile link.
//
// Nam: "when it comes to itch io, dont just list my itch io, pick some games
// there too where you can provide the link to open it, or at least have some
// graphics. Heres my itch io link: https://southocean.itch.io/. Go in there and
// get what you need."
//
// So this was read off that page rather than invented: every title, URL and
// tagline below is the one the profile shows.
//
// THREE, DOWN FROM SIX (board ticket N83). Nam: "in Games section, we can remove
// mahjong star, rhymshoot 2.0 and lostsoulv2. We are keeping ryhtm shoot, molt
// and space invasion." The three that went were the three that overlapped
// something else on the page: the mahjong prototype sits under a live production
// client three sections up, and the two sequels were listed beside their own
// first versions to make a point about iteration that the section did not need
// two entries to make.
//
// What is left is one game about timing, one jam entry about constraint, and one
// written to a theme in a weekend. Three arguments, three games.
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
    title: 'Space Invasion',
    url: 'https://southocean.itch.io/space-invasion',
    tagline: 'Earn the power to manipulate space',
    why: 'Ludum Dare #61. Written to a theme, in a weekend.',
    playable: false,
  },
];
