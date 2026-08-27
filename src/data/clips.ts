// The reel.
//
// Real footage, cut to the highlight and nothing more. Every clip is Nam's own
// material: a tandem jump he paid for, his own self-tapes, his own stand-up set,
// and his own Robinson audition tape.
//
// Order is deliberate — spectacle, then charm, then craft, then the punchline.
// Total payload is about 1.5 MB for the whole reel, which is roughly one
// stock photo on a normal careers page.
//
// Encoded 480x480, 24fps, CRF 31. Square because four of the five sources are
// phone-vertical and one is landscape, and a reel that changes shape every
// eight seconds looks broken.

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
  /** Shown before it plays when the content deserves a heads-up. */
  note?: string;
}

export const reel: Clip[] = [
  {
    id: 'skydive',
    label: 'Skydiving',
    caption: 'Tandem jump over Stockholm. Freefall, arms out.',
    why: 'A hobby with an unusually short feedback loop. Recommended.',
    src: 'media/skydive.mp4',
    poster: 'media/skydive.jpg',
    seconds: 8,
    hasAudio: false,
  },
  {
    id: 'standup',
    label: 'Stand-up',
    caption: 'A real room, mid-set. The frame you want is the audience, not me.',
    why:
      'Ten seconds to find out whether a thing lands, in front of people who did not ask to be there. It is the ' +
      'same instinct a UX review needs, and it is why I stop defending a bad idea quickly.',
    src: 'media/standup.mp4',
    poster: 'media/standup.jpg',
    seconds: 8,
    hasAudio: true,
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
    note: 'Horror prosthetic in close-up. Six seconds, silent.',
  },
  {
    id: 'robinson',
    label: 'Robinson audition',
    caption: 'The tape. It did not work. I went to the midsummer festival in the wings anyway.',
    why:
      'Robinson is the Swedish Survivor. I have auditioned more than once and have not been cast. It is on the ' +
      'list next to this job, and I am told the interview process here is more forgiving.',
    src: 'media/robinson.mp4',
    poster: 'media/robinson.jpg',
    seconds: 10,
    hasAudio: true,
  },
];

/** Left out on purpose, and worth saying why rather than quietly omitting it. */
export const omitted = {
  what: 'A clip from Tomma Händer',
  why:
    'It is a friend’s film rather than my footage, and a public page is the wrong place to make that call on ' +
    'someone else’s behalf. Happy to send a timecode privately.',
};
