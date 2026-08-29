// Application state as a pure reducer.
//
// Kept pure specifically so it can be unit-tested without a DOM (review T4).
// The screen list mirrors Meet's actual flow — home, lobby, call, ended — so the
// clone covers the whole journey rather than one screenshot of it (review V1).

/**
 * 'company' is the unlisted index of per-company codes. Reachable only by
 * typing #company; nothing in the CV links to it.
 */
export type Screen = 'home' | 'calls' | 'lobby' | 'call' | 'ended' | 'company';
// 'about' is the CV material that used to squat inside the People panel.
// Nam: "This is a panel for the people in the meeting." Right — so the career
// timeline moved out to its own, reached from the participant-count popup.
export type Panel = 'none' | 'chat' | 'people' | 'present' | 'offclock' | 'tools' | 'host' | 'about';
export type EngTab = 'spec' | 'tests' | 'a11y' | 'perf' | 'net';
export type NetProfile = 'good' | 'shaky' | 'hotel' | 'collapse';

export interface State {
  screen: Screen;
  panel: Panel;
  engTab: EngTab;
  /** Case-study id currently on the shared screen. */
  spotlight: string | null;
  cameraOn: boolean;
  micOn: boolean;
  captionsOn: boolean;
  handRaised: boolean;
  /**
   * Pinned to your own screen. Measured on the live product: pinning a solo
   * tile changes no geometry at all — same 1889x1063, same re-centring when a
   * panel opens. It is purely a marker, which is why it costs us one flag.
   */
  pinned: boolean;
  /**
   * Meet's "Presentation audio" switch, which sits in the presenting pill.
   * Ours records the preference and gates nothing, because an authored HTML
   * page has no audio track to share. Said plainly here rather than left for
   * someone to discover that the switch is decorative.
   */
  presAudio: boolean;
  /**
   * The self tile collapsed to a name bar. Only reachable while presenting and
   * unpinned, which is the one state where the original's Minimize row is live
   * -- on the full-stage tile it reports aria-disabled=true.
   */
  minimized: boolean;
  net: NetProfile;
  /** Injects a deliberate fault so the test suite can be seen failing. */
  chaos: boolean;
  reducedMotion: boolean;
  /**
   * The standalone "How this was built" document.
   *
   * Its own flag rather than another engTab, because the home screen has no
   * panel: `engTab` sets panel: 'tools' and leaves `screen` alone, so from home
   * the button changed state and painted nothing at all.
   */
  /**
   * The company code from ?c=, or null. Decides whether the employer is named
   * anywhere. See src/data/companies.ts for why it is a query parameter.
   */
  company: string | null;
  /**
   * An easter-egg clip to present on the shared screen as soon as the call
   * mounts. Nam wanted the eggs to happen INSIDE the call rather than on their
   * own screen: join, and the call is already sharing, with the clip playing in
   * the media player and the file explorer open behind it at the folder it came
   * from.
   */
  eggPlay: string | null;
  plain: boolean;
}

export type Action =
  | { t: 'screen'; screen: Screen }
  | { t: 'join' }
  | { t: 'leave' }
  | { t: 'panel'; panel: Panel }
  | { t: 'engTab'; tab: EngTab }
  | { t: 'spotlight'; id: string | null }
  | { t: 'camera'; on: boolean }
  | { t: 'mic'; on: boolean }
  | { t: 'captions'; on: boolean }
  | { t: 'hand'; on: boolean }
  | { t: 'pin'; on: boolean }
  | { t: 'eggPlay'; id: string | null }
  | { t: 'presAudio'; on: boolean }
  | { t: 'minimize'; on: boolean }
  | { t: 'net'; profile: NetProfile }
  | { t: 'chaos'; on: boolean }
  | { t: 'reducedMotion'; on: boolean }
  | { t: 'plain'; on: boolean };

export const initial: State = {
  screen: 'home',
  panel: 'none',
  engTab: 'spec',
  spotlight: null,
  cameraOn: false,
  micOn: false,
  // Off by default. Nam reported the transcript sitting on top of other things
  // on screen, and a caption nobody asked for that also covers the content is
  // worse than no caption — the button is right there on the bar.
  /*
   * ON by default. Nam, on the onboarding: "make sure the CC option is on by
   * default." The guided tour speaks THROUGH the captions, so a tour that
   * started with them off would be a silent film.
   */
  captionsOn: true,
  handRaised: false,
  pinned: false,
  presAudio: true,
  minimized: false,
  net: 'good',
  chaos: false,
  reducedMotion: false,
  company: null,
  eggPlay: null,
  plain: false,
};

export function reduce(s: State, a: Action): State {
  switch (a.t) {
    case 'screen':
      // Leaving the call must release hardware wherever you go next.
      return a.screen === 'call'
        ? { ...s, screen: 'call' }
        : { ...s, screen: a.screen, panel: 'none', cameraOn: false, micOn: false };

    case 'join':
      return { ...s, screen: 'call' };

    case 'leave': {
      // A CV has no business keeping a webcam warm after you walk away from it.
      const off = { panel: 'none' as const, cameraOn: false, micOn: false, handRaised: false, pinned: false, minimized: false, eggPlay: null };
      /*
       * Leaving an EGG call goes straight home, skipping the ended screen.
       *
       * Nam: "when you click end call, you should be back immediately to home
       * screen without seeing the you left the meeting screen. This is to
       * streamline the flow when user is hunting for easter eggs."
       *
       * The ended screen earns its place after a real visit -- it holds the
       * referral note and the copyable link, which is the one thing a reader
       * might want on the way out. After a thirty-second clip it is a speed bump
       * between the visitor and the next clip, and someone hunting eggs will hit
       * it once per egg.
       *
       * Branching on the egg id rather than on a flag from the button: the state
       * already knows what kind of call this was, and a caller cannot forget to
       * pass something it does not have to pass.
       */
      if (s.eggPlay) return { ...s, ...off, screen: 'home' };
      return { ...s, ...off, screen: 'ended' };
    }

    case 'panel':
      // Clicking the open panel's own button closes it, the way a real call does.
      return { ...s, panel: s.panel === a.panel ? 'none' : a.panel };

    case 'engTab':
      return { ...s, panel: 'tools', engTab: a.tab };

    case 'spotlight':
      return { ...s, spotlight: a.id };

    case 'camera':
      // Effects need pixels. Turning the camera off turns them off too, rather
      // than leaving a GL loop running over a dead texture (review T5).
      /*
       * COSMETIC. Nam: "enabling camera should be just cosmetic, not triggering
       * the browser permission for camera."
       *
       * So this flag now changes one button's appearance and nothing else. No
       * getUserMedia, no stream, no effects pipeline hanging off it -- see
       * main.ts. The reason is the one in tools/CV-PERCEPTION.md as R11: a Chrome
       * permission bar appearing on a page dressed as Google Meet is the exact
       * shape of the scam a non-technical reader was warned about, and it is the
       * scariest moment in the whole funnel.
       */
      return { ...s, cameraOn: a.on };

    case 'mic':
      return { ...s, micOn: a.on };

    case 'captions':
      return { ...s, captionsOn: a.on };

    case 'hand':
      return { ...s, handRaised: a.on };

    case 'eggPlay':
      // Joining the egg goes straight to the call -- no lobby. The clip is the
      // whole point of that meeting, so a green room in front of it is a wall.
      //
      // The "Your meeting's ready" card used to be suppressed here too, on the
      // grounds that a share sheet parked over a thirty-second clip is clutter
      // the visitor did not ask for. N153 made that argument about every route
      // rather than this one, and removed the card.
      return { ...s, screen: 'call', eggPlay: a.id };

    case 'pin':
      // Pinning gives the tile the whole right column, so a collapsed bar makes
      // no sense there -- and the original's Minimize row is dead in that state.
      return { ...s, pinned: a.on, minimized: a.on ? false : s.minimized };

    case 'presAudio':
      return { ...s, presAudio: a.on };

    case 'minimize':
      return { ...s, minimized: a.on };

    case 'net':
      return { ...s, net: a.profile };

    case 'chaos':
      return { ...s, chaos: a.on };

    case 'reducedMotion':
      return { ...s, reducedMotion: a.on };

    case 'plain':
      return { ...s, plain: a.on };
  }
}

type Listener = (s: State) => void;

export class Store {
  private state: State;
  private listeners: Listener[] = [];

  constructor(init: State = initial) {
    this.state = init;
  }

  get(): State {
    return this.state;
  }

  dispatch(a: Action): State {
    const next = reduce(this.state, a);
    if (next === this.state) return next;
    this.state = next;
    for (const l of this.listeners) l(next);
    return next;
  }

  subscribe(l: Listener): () => void {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }
}

// ---------------------------------------------------------------------------
// Routing
//
// Hand-rolled, because the whole point is no framework — which means the back
// button is my problem (review T12). Every panel is linkable and a deep link
// skips straight to the screen it names (review U3).
// ---------------------------------------------------------------------------

export interface Route {
  screen: Screen;
  panel: Panel;
  engTab?: EngTab;
  spotlight?: string | null;
  plain?: boolean;
}

const panels: Panel[] = ['chat', 'people', 'present', 'offclock', 'tools', 'host', 'about'];
// Also the set of #tools/<tab> hashes that resolve. A removed tab's hash now
// falls through to the panel's default rather than selecting a tab that is not
// in the strip.
const engTabs: EngTab[] = ['spec', 'tests', 'a11y', 'perf', 'net'];

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [head = '', tail = ''] = raw.split('/');

  if (head === 'plain') return { screen: 'call', panel: 'none', plain: true };
  if (head === 'company') return { screen: 'company', panel: 'none' };
  if (head === 'ended') return { screen: 'ended', panel: 'none' };
  if (head === 'calls') return { screen: 'calls', panel: 'none' };
  if (head === 'lobby') return { screen: 'lobby', panel: 'none' };
  if (head === 'call') return { screen: 'call', panel: 'none' };
  if (head === '' || head === 'home') return { screen: 'home', panel: 'none' };

  if (head === 'tools') {
    const tab = engTabs.includes(tail as EngTab) ? (tail as EngTab) : 'spec';
    return { screen: 'call', panel: 'tools', engTab: tab };
  }

  if (panels.includes(head as Panel)) {
    const route: Route = { screen: 'call', panel: head as Panel };
    if (head === 'present' && tail) route.spotlight = tail;
    return route;
  }

  return { screen: 'home', panel: 'none' };
}

export function routeToHash(s: State): string {
  if (s.plain) return '#plain';
  if (s.screen === 'home') return '#home';
  if (s.screen === 'calls') return '#calls';
  if (s.screen === 'lobby') return '#lobby';
  if (s.screen === 'ended') return '#ended';
  if (s.panel === 'tools') return `#tools/${s.engTab}`;
  if (s.panel === 'present' && s.spotlight) return `#present/${s.spotlight}`;
  if (s.panel !== 'none') return `#${s.panel}`;
  return '#call';
}

// ---------------------------------------------------------------------------
// Timeline geometry
//
// The People panel draws roles as bars on a shared axis, which means the
// overlapping "present" roles have to be laid out honestly rather than stacked
// in a way that hides one of them (review H2). Pure functions, so the maths is
// testable.
// ---------------------------------------------------------------------------

export interface Span {
  id: string;
  from: number;
  to: number | null;
}

export interface Placed extends Span {
  /** 0..1 across the axis. */
  x: number;
  w: number;
  /** Lane index; overlapping spans get different lanes. */
  lane: number;
}

export function overlaps(a: Span, b: Span, now: number): boolean {
  const ae = a.to ?? now;
  const be = b.to ?? now;
  return a.from < be && b.from < ae;
}

export function layoutTimeline(spans: Span[], now: number): Placed[] {
  const ends = spans.map((s) => s.to ?? now);
  const min = Math.min(...spans.map((s) => s.from));
  const max = Math.max(...ends, now);
  const range = Math.max(max - min, 0.001);

  // Longest first, so the spine of the career takes the top lane.
  const order = [...spans].sort((a, b) => (b.to ?? now) - b.from - ((a.to ?? now) - a.from));

  // Interval-graph colouring: a span joins the first lane it collides with
  // nothing in. Comparing only against each lane's LAST end is not enough — a
  // span that starts earlier than everything in a lane still fits it, and the
  // naive version wasted a row on exactly that case.
  const lanes: Span[][] = [];
  const out: Placed[] = [];

  for (const s of order) {
    let lane = lanes.findIndex((members) => members.every((m) => !overlaps(s, m, now)));
    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
    }
    lanes[lane]!.push(s);
    const end = s.to ?? now;
    out.push({ ...s, lane, x: (s.from - min) / range, w: (end - s.from) / range });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Caption scheduling
// ---------------------------------------------------------------------------

/*
 * `captionAt(lines, t)` used to live here: given a list of timestamped lines and
 * a time, which one is showing. It existed for the call's own caption loop, which
 * walked an array on a wall clock and wrapped around forever.
 *
 * That loop is gone (N45) and the conversation is event-driven — a line ends when
 * the visitor is done with it, not when a clock says so (N48) — so there is no
 * longer any question of "which line is due right now". Removed rather than left
 * exported and unused, along with its five tests.
 */

/** Clamp a shader parameter into range. Only NaN is refused (review Q4). */
export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Meet's clock format: "9:02 AM". */
export function clock(d: Date): string {
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}
