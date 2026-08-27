// The visitor profile — board ticket N33.
//
// PURE. No DOM, no timers, no clock of its own: every function takes the time
// it should reason about. That is the same rule the director follows and for
// the same reason — this is the part of the tour most likely to be subtly
// wrong, and the least likely for anyone to notice that it is.
//
// Nam: "Feels like we are essentially building a know your user system, like
// user profiling. Let me know what else we can add to this system to get a
// clear image of user intention and interest, so we tailor our script to their
// interest and in their own pace."
//
// So: what CAN be known about a stranger from a screen share of their own
// browser, without asking them anything and without sending anything anywhere?
// Nine raw signals, four derived readings.
//
//   RAW
//   · idle       — ms since the last input of any kind. The single best
//                  predictor of "they have stopped driving", which is what
//                  licenses the tour to take the wheel back.
//   · clicks     — how many, and how bunched. Three clicks inside 700ms is not
//                  three decisions, it is one impatience.
//   · scroll     — pixels and the milliseconds they took. Speed separates
//                  reading from skimming far more reliably than dwell does.
//   · dwell      — ms held per section. The interest signal.
//   · bails      — sections left under three seconds. Nam's number, and it is
//                  a good one: three seconds is long enough to read a heading
//                  and decide, too short to have read anything under it.
//   · revisits   — coming back to something already covered. The strongest
//                  interest signal there is, because it costs them effort.
//   · reach      — how many distinct sections they opened at all. Breadth.
//   · input      — pointer or keyboard. A keyboard visitor is a different
//                  reader and gets a different pace.
//   · takeovers  — how often they interrupted the script. Autonomy.
//
//   DERIVED
//   · restless   — 0..1, the impatience score, with four named tiers. Drives
//                  which acknowledgement gets used and how hard it lands.
//   · pace       — a multiplier on every authored line duration.
//   · engaged    — 0..1, the opposite reading, from dwell and revisits.
//   · interests  — the sections ranked by dwell, so the script can go where
//                  they already went instead of where it planned to.
//
// What this deliberately is NOT: it never leaves the tab, it is never stored,
// and it is thrown away when the tour ends. It exists to choose between lines
// that were all written in advance.

/** Leaving a section faster than this is a bail, not a visit. Nam's three seconds. */
export const BAIL_MS = 3000;
/** No input at all for this long and the visitor has stopped driving. Also Nam's three seconds. */
export const IDLE_MS = 3000;
/** Two clicks closer together than this belong to one burst. */
export const BURST_MS = 700;
/** Scrolling faster than this many document pixels per second is skimming. */
export const SKIM_PX_S = 900;
/** Holding one section this long is a real read. */
export const READ_MS = 8000;

export type Modality = 'unknown' | 'pointer' | 'keyboard';

export interface Visitor {
  /** When the last input of any kind arrived. */
  lastInput: number;
  clicks: number;
  /** Clicks that arrived inside BURST_MS of the one before. */
  bursty: number;
  /** Document pixels travelled, and the time it took. */
  scrolled: number;
  scrollMs: number;
  /** ms held, per section id. */
  dwell: Record<string, number>;
  /** Sections left under BAIL_MS, in the order it happened. */
  bails: string[];
  /** Sections entered more than once. */
  revisits: number;
  /** Which section is open, and when it opened. */
  open: string | null;
  openedAt: number;
  /** Every section ever entered. */
  reach: string[];
  /** Times the visitor interrupted the script. */
  takeovers: number;
  modality: Modality;
  /** 0..1 impatience. */
  restless: number;
  /** Acknowledgement lines already used, so none is heard twice. */
  spent: string[];
}

export const initialVisitor: Visitor = {
  lastInput: 0,
  clicks: 0,
  bursty: 0,
  scrolled: 0,
  scrollMs: 0,
  dwell: {},
  bails: [],
  revisits: 0,
  open: null,
  openedAt: 0,
  reach: [],
  takeovers: 0,
  modality: 'unknown',
  restless: 0,
  spent: [],
};

export type Signal =
  | { t: 'click'; at: number }
  | { t: 'key'; at: number }
  | { t: 'move'; at: number }
  /** One scroll sample: how far, over how long. */
  | { t: 'scroll'; at: number; px: number; ms: number }
  /** The visitor arrived at a section, by their own action or the script's. */
  | { t: 'enter'; at: number; id: string }
  /** They left it. */
  | { t: 'leave'; at: number; id: string }
  /** They interrupted the script. */
  | { t: 'takeover'; at: number }
  /** Time passing with nothing happening. */
  | { t: 'idle'; at: number };

/* How much each thing moves the needle. Tuned so that a visitor who skims one
   section and clicks twice is "browsing", and one who bails three times in a
   row is "bolting" — which is roughly where the escalation should land. */
const D_BAIL = 0.22;
const D_SKIM = 0.09;
const D_BURST = 0.14;
const D_READ = -0.16;
const D_REVISIT = -0.1;
/** Restlessness fades on its own, per second of quiet. Impatience is a mood, not a verdict. */
const DECAY_S = 0.012;

const clamp = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Fold one signal in.
 *
 * Returns a NEW visitor, always — the caller compares `restless` before and
 * after to decide whether the bar should flash, and that comparison only works
 * if nothing was mutated underneath it.
 */
export function observe(v: Visitor, s: Signal): Visitor {
  switch (s.t) {
    case 'move':
      return { ...v, lastInput: s.at, modality: v.modality === 'keyboard' ? 'keyboard' : 'pointer' };

    case 'key':
      return { ...v, lastInput: s.at, modality: 'keyboard' };

    case 'click': {
      const gap = s.at - v.lastInput;
      const burst = v.lastInput > 0 && gap < BURST_MS;
      return {
        ...v,
        lastInput: s.at,
        clicks: v.clicks + 1,
        bursty: v.bursty + (burst ? 1 : 0),
        restless: clamp(v.restless + (burst ? D_BURST : 0)),
        modality: v.modality === 'keyboard' ? 'keyboard' : 'pointer',
      };
    }

    case 'scroll': {
      // A sample with no duration carries no speed, so it carries no verdict.
      const speed = s.ms > 0 ? (s.px / s.ms) * 1000 : 0;
      return {
        ...v,
        lastInput: s.at,
        scrolled: v.scrolled + Math.abs(s.px),
        scrollMs: v.scrollMs + s.ms,
        restless: clamp(v.restless + (speed > SKIM_PX_S ? D_SKIM : 0)),
      };
    }

    case 'enter': {
      // Close whatever was open first, so an enter can never lose a dwell.
      const closed = v.open && v.open !== s.id ? observe(v, { t: 'leave', at: s.at, id: v.open }) : v;
      const seen = closed.reach.includes(s.id);
      return {
        ...closed,
        open: s.id,
        openedAt: s.at,
        reach: seen ? closed.reach : [...closed.reach, s.id],
        revisits: closed.revisits + (seen ? 1 : 0),
        restless: clamp(closed.restless + (seen ? D_REVISIT : 0)),
      };
    }

    case 'leave': {
      if (v.open !== s.id) return v;
      const held = Math.max(0, s.at - v.openedAt);
      /*
       * A bail and a read are the same event with a different number attached,
       * which is why they are scored together rather than in two branches that
       * could drift apart. Everything between the two thresholds is neither —
       * an ordinary look, and an ordinary look should move nothing.
       */
      const d = held < BAIL_MS ? D_BAIL : held >= READ_MS ? D_READ : 0;
      return {
        ...v,
        open: null,
        dwell: { ...v.dwell, [s.id]: (v.dwell[s.id] ?? 0) + held },
        bails: held < BAIL_MS ? [...v.bails, s.id] : v.bails,
        restless: clamp(v.restless + d),
      };
    }

    case 'takeover':
      return { ...v, lastInput: s.at, takeovers: v.takeovers + 1 };

    case 'idle': {
      const quiet = Math.max(0, (s.at - v.lastInput) / 1000);
      return { ...v, restless: clamp(v.restless - DECAY_S * quiet) };
    }

    default:
      return v;
  }
}

/** True once they have stopped driving and the tour may take the wheel. */
export function passive(v: Visitor, now: number): boolean {
  return v.lastInput > 0 && now - v.lastInput >= IDLE_MS;
}

export type Tier = 'settled' | 'browsing' | 'skimming' | 'bolting';

/** Four tiers, because three cannot hold both "reading" and "not reading yet". */
export function tier(v: Visitor): Tier {
  if (v.restless >= 0.75) return 'bolting';
  if (v.restless >= 0.5) return 'skimming';
  if (v.restless >= 0.25) return 'browsing';
  return 'settled';
}

/**
 * The multiplier applied to every authored line duration.
 *
 * A restless visitor gets shorter pauses, not fewer words — cutting the words
 * is what `brief` is for, and doing both at once produces a script that gabbles.
 * Floored at 0.62 so it never becomes unreadable, and capped just above 1 so a
 * very settled reader gets a little more room rather than a lot.
 */
/**
 * The bounds, named rather than inline, because something else now depends on
 * them: the outro promises to fit inside two minutes (N49) and every duration in
 * it is scaled by this function on the way out. A cap checked against the
 * authored sum alone would be a cap on paper only, so the test multiplies by
 * PACE_MAX -- which it can only do if PACE_MAX is a thing with a name.
 */
export const PACE_MIN = 0.62;
export const PACE_MAX = 1.08;

export function pace(v: Visitor): number {
  const p = 1 - 0.38 * v.restless;
  return p < PACE_MIN ? PACE_MIN : p > PACE_MAX ? PACE_MAX : p;
}

/** 0..1 the other way: how much of themselves they have put into this. */
export function engagement(v: Visitor): number {
  const read = Object.values(v.dwell).filter((ms) => ms >= READ_MS).length;
  const breadth = Math.min(v.reach.length / 6, 1);
  const back = Math.min(v.revisits / 3, 1);
  return clamp(0.45 * Math.min(read / 3, 1) + 0.3 * breadth + 0.25 * back);
}

/** Reading speed, in document pixels per second. Zero until they have scrolled. */
export function readSpeed(v: Visitor): number {
  return v.scrollMs > 0 ? (v.scrolled / v.scrollMs) * 1000 : 0;
}

/** Sections ranked by how long they were held. The script can follow this. */
export function interests(v: Visitor): string[] {
  return Object.entries(v.dwell)
    .filter(([, ms]) => ms > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/**
 * Pick an acknowledgement, never the same one twice.
 *
 * The pool is passed in rather than imported so this stays pure and the script
 * stays in data/. Falls back UP the tiers rather than down: running out of
 * teasing lines should not drop back to a polite one, because the visitor has
 * not become more patient — we have just run out of ways to say it.
 */
export function acknowledge<T extends { id: string; tier: Tier }>(
  v: Visitor, pool: T[],
): { line: T; next: Visitor } | null {
  const order: Tier[] = ['settled', 'browsing', 'skimming', 'bolting'];
  const from = order.indexOf(tier(v));
  for (let i = from; i < order.length; i += 1) {
    const line = pool.find((l) => l.tier === order[i] && !v.spent.includes(l.id));
    if (line) return { line, next: { ...v, spent: [...v.spent, line.id] } };
  }
  // Nothing left at or above their tier — try below before giving up entirely.
  for (let i = from - 1; i >= 0; i -= 1) {
    const line = pool.find((l) => l.tier === order[i] && !v.spent.includes(l.id));
    if (line) return { line, next: { ...v, spent: [...v.spent, line.id] } };
  }
  return null;
}
