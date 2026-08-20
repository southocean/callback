// Application state as a pure reducer.
//
// Kept pure specifically so it can be unit-tested without a DOM (review T4).
// The screen list mirrors Meet's actual flow — home, lobby, call, ended — so the
// clone covers the whole journey rather than one screenshot of it (review V1).

export type Screen = 'home' | 'lobby' | 'call' | 'ended';
export type Panel = 'none' | 'chat' | 'people' | 'present' | 'offclock' | 'tools' | 'host';
export type EngTab = 'spec' | 'design' | 'tests' | 'a11y' | 'perf' | 'fx' | 'net' | 'reqs';
export type FxPreset = 'off' | 'soften' | 'normalise' | 'edges' | 'kaleido';
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
  /** Meet's "Your meeting's ready" card, dismissible. */
  readyCard: boolean;
  fx: FxPreset;
  net: NetProfile;
  /** Injects a deliberate fault so the test suite can be seen failing. */
  chaos: boolean;
  reducedMotion: boolean;
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
  | { t: 'readyCard'; on: boolean }
  | { t: 'fx'; preset: FxPreset }
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
  captionsOn: false,
  handRaised: false,
  readyCard: true,
  fx: 'off',
  net: 'good',
  chaos: false,
  reducedMotion: false,
  plain: false,
};

export function reduce(s: State, a: Action): State {
  switch (a.t) {
    case 'screen':
      // Leaving the call must release hardware wherever you go next.
      return a.screen === 'call'
        ? { ...s, screen: 'call' }
        : { ...s, screen: a.screen, panel: 'none', cameraOn: false, micOn: false, fx: 'off' };

    case 'join':
      return { ...s, screen: 'call' };

    case 'leave':
      // A CV has no business keeping a webcam warm after you walk away from it.
      return { ...s, screen: 'ended', panel: 'none', cameraOn: false, micOn: false, fx: 'off', handRaised: false };

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
      return { ...s, cameraOn: a.on, fx: a.on ? s.fx : 'off' };

    case 'mic':
      return { ...s, micOn: a.on };

    case 'captions':
      return { ...s, captionsOn: a.on };

    case 'hand':
      return { ...s, handRaised: a.on };

    case 'readyCard':
      return { ...s, readyCard: a.on };

    case 'fx':
      // Effects are meaningless without a video source, so asking for one
      // implies asking for the camera. Nothing is enabled behind your back:
      // getUserMedia is only ever called from an explicit click.
      if (a.preset !== 'off' && !s.cameraOn) return { ...s, fx: a.preset, cameraOn: true };
      return { ...s, fx: a.preset };

    case 'net':
      return { ...s, net: a.profile };

    case 'chaos':
      return { ...s, chaos: a.on };

    case 'reducedMotion':
      // Reduced motion is not a suggestion. It kills the effects outright.
      return { ...s, reducedMotion: a.on, fx: a.on ? 'off' : s.fx };

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

const panels: Panel[] = ['chat', 'people', 'present', 'offclock', 'tools', 'host'];
const engTabs: EngTab[] = ['spec', 'design', 'tests', 'a11y', 'perf', 'fx', 'net', 'reqs'];

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [head = '', tail = ''] = raw.split('/');

  if (head === 'plain') return { screen: 'call', panel: 'none', plain: true };
  if (head === 'ended') return { screen: 'ended', panel: 'none' };
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

export function captionAt<T extends { at: number }>(lines: T[], t: number): T | null {
  let found: T | null = null;
  for (const l of lines) {
    if (l.at <= t) found = l;
    else break;
  }
  return found;
}

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
