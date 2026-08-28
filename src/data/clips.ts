// The reel.
//
// Real footage, cut to the highlight and nothing more. Every clip is Nam's own
// material: a tandem jump he paid for, his own self-tapes, his own competition
// set, and his own parade.
//
// Order is deliberate — spectacle, then charm, then craft, then the punchline.
// Total payload is about 2.4 MB for the whole reel, and none of it is fetched
// until somebody presses play.
//
// THE SQUARE CROP IS GONE. Everything used to be encoded 480x480 on the argument
// that "a reel that changes shape every eight seconds looks broken", and the
// argument was real but the price was worse: four of the five sources are
// phone-vertical, so the crop was throwing away the sides of every one of them.
// Nam, on the clip where it showed most: "I realize the video is actually 16:9.
// Somehow it was cropped down to a different ratio?" It had been, and by us. New
// clips are encoded at their true ratio, 24fps, CRF 32, and the stage takes its
// shape from whatever is playing.
//
// Three of these are still square, and that is not a choice: acting, sfx and the
// skydive exist in this repo only as 480x480 files, cropped before they arrived.
// Ticket N76 has the history. They will stop being square when the originals
// turn up, and nothing here has to change when they do.

export interface Clip {
  id: string;
  /** Shown large while it plays. */
  label: string;
  /** One line under the label: what this is evidence of. */
  caption: string;
  /** The longer argument, in the list below the player. */
  why: string;
  src: string;
  poster: string;
  seconds: number;
  hasAudio: boolean;
  /**
   * The encoded frame, so the stage can take the clip's shape before a single
   * byte of video has loaded. Read off the file with ffprobe rather than
   * intended — a number that disagrees with the file would letterbox forever.
   */
  w: number;
  h: number;
  /** Shown before it plays when the content deserves a heads-up. */
  note?: string;
}

export const reel: Clip[] = [
  {
    id: 'skydive',
    label: 'Skydiving',
    caption: 'Tandem jump over Stockholm. Freefall, arms out.',
    why: 'A hobby with an unusually short feedback loop. Recommended.',
    src: 'media/i-can-fly.mp4',
    poster: 'media/i-can-fly.jpg',
    seconds: 8,
    hasAudio: false,
    w: 480,
    h: 480,
  },
  {
    id: 'standup',
    label: 'Stand-up',
    caption: 'Uppsalas Roligaste 2026, mid-set. The frame you want is the room, not me.',
    why:
      'Ten seconds to find out whether a thing lands, in front of people who did not ask to be there. It is the ' +
      'same instinct a UX review needs, and it is why I stop defending a bad idea quickly.',
    src: 'media/uppsala-roligaste.mp4',
    poster: 'media/uppsala-roligaste.jpg',
    seconds: 21,
    hasAudio: true,
    w: 396,
    h: 704,
  },
  {
    id: 'acting',
    label: 'Acting',
    caption: 'Self-tape. A transformation scene, shot in my living room.',
    why:
      'The other side of the camera. Useful perspective when the product you are building is, fundamentally, a ' +
      'camera pointed at someone who is nervous about being on camera.',
    src: 'media/acting.mp4',
    poster: 'media/acting.jpg',
    seconds: 9,
    hasAudio: true,
    w: 480,
    h: 480,
  },
  {
    id: 'sfx',
    label: 'SFX makeup',
    caption: 'Prosthetics, built and worn. Same self-tape, different day.',
    why:
      'Built and worn, on a face, with a deadline. The practical version of the same problem a shader solves, ' +
      'and the reason a horror short gets finished on a weekend.',
    src: 'media/sfx.mp4',
    poster: 'media/sfx.jpg',
    seconds: 6,
    hasAudio: false,
    w: 480,
    h: 480,
    note: 'Horror prosthetic in close-up. Six seconds, silent.',
  },
  {
    /*
     * This slot used to hold an audition tape. Nam pulled it: "maybe we shouldnt
     * disclose that." The parade takes the slot rather than the reel losing a
     * clip, and it is a better closer anyway -- the tape was a thing that did not
     * work, told as a joke against himself, and this is a thing that plainly did.
     */
    id: 'pride',
    label: 'Stockholm Pride',
    caption: 'A handmade dragon head, a parade, and a crowd that went with it.',
    why:
      'A costume is a deadline with an audience attached, and this one was made to be worn in public in front of ' +
      'people under no obligation to be kind about it. Nothing in it is load-bearing for the job, which is the ' +
      'point of this panel.',
    src: 'media/dragon-strut.mp4',
    poster: 'media/dragon-strut.jpg',
    seconds: 11,
    hasAudio: true,
    w: 396,
    h: 704,
  },
];

/** Left out on purpose, and worth saying why rather than quietly omitting it. */
export const omitted = {
  what: 'A clip from Tomma Händer',
  why:
    'It is a friend’s film rather than my footage, and a public page is the wrong place to make that call on ' +
    'someone else’s behalf. Happy to send a timecode privately.',
};
