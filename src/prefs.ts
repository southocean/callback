// What this page is allowed to remember about you, which is almost nothing.
//
// Meet's "Your meeting's ready" card opens on every join, and on the real
// product that is fine — you join a meeting to talk to someone, once. Here the
// call IS the CV, so a visitor comes back to it repeatedly, and a card that
// reappears every single time stops being an introduction and becomes a toll
// booth. Nam's report, and it is the right read: "it is a bit annoying every
// time you open the meeting."
//
// So the card is introductory rather than permanent. It opens on a first visit,
// it opens once more if the first one went unread, and either closing it or
// having shown it twice mutes it for an hour. After the hour it is allowed back,
// because someone returning the next day has almost certainly forgotten the
// link is copyable and the card is the only thing that says so.
//
// The decision is pure and the storage is not, deliberately: the rules below are
// unit-tested against a fixed clock, and the only impure part is a get and a set
// that both shrug if storage is missing. That split is the reason a rule like
// "an expired record is not a record" can be checked rather than asserted.
//
// Nothing here leaves the machine. There is no backend to send it to, which is
// the same promise the card itself makes in its last line.

const KEY = 'callback.ready';

/** One hour, measured from whichever event muted the card. */
export const READY_MUTE_MS = 60 * 60 * 1000;
/** Two automatic opens inside a window, then it has said its piece. */
export const READY_MAX_SHOWS = 2;

export interface ReadyGate {
  /** Automatic opens inside the current window. Explicit ones do not count. */
  shows: number;
  /** True once the visitor has closed it themselves. */
  closed: boolean;
  /** When this record was last written, ms since the epoch. */
  at: number;
}

/**
 * A record older than the mute window is not a record any more.
 *
 * Expiry lives here rather than in each caller so there is exactly one place
 * that decides what "stale" means. Anything unparseable is also treated as
 * absent: this comes out of localStorage, which anyone can hand-edit, and a
 * `shows: "lots"` should read as a fresh visitor rather than throw on join.
 */
export function freshGate(g: ReadyGate | null, now: number): ReadyGate | null {
  if (!g || typeof g !== 'object') return null;
  if (typeof g.shows !== 'number' || !Number.isFinite(g.shows)) return null;
  if (typeof g.at !== 'number' || !Number.isFinite(g.at)) return null;
  // A record from the future is a clock that moved, not a mute worth honouring.
  if (g.at > now) return null;
  if (now - g.at >= READY_MUTE_MS) return null;
  return g;
}

/** Should the card open on its own, given what we remember and the time now? */
export function readyCardOpens(g: ReadyGate | null, now: number): boolean {
  const f = freshGate(g, now);
  if (!f) return true;
  return !f.closed && f.shows < READY_MAX_SHOWS;
}

/** The record after the card has opened by itself. */
export function afterReadyShown(g: ReadyGate | null, now: number): ReadyGate {
  const f = freshGate(g, now);
  return { shows: (f?.shows ?? 0) + 1, closed: f?.closed ?? false, at: now };
}

/**
 * The record after the visitor closes it.
 *
 * `shows` is floored at 1 because being closed implies having been seen, and a
 * hand-cleared or expired record must not come back as "shown zero times, still
 * closed" — that state is contradictory and would read as muted-forever to
 * anything that later counts shows instead of checking the flag.
 */
export function afterReadyClosed(g: ReadyGate | null, now: number): ReadyGate {
  const f = freshGate(g, now);
  return { shows: Math.max(1, f?.shows ?? 0), closed: true, at: now };
}

export function loadReadyGate(): ReadyGate | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReadyGate) : null;
  } catch {
    /* private browsing, storage disabled, or junk in the slot. Not worth a fuss. */
    return null;
  }
}

export function saveReadyGate(g: ReadyGate): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    /* ignore — the card simply behaves like a first visit next time. */
  }
}

/** Convenience for the two call sites that only want the side effect. */
export function noteReadyShown(now = Date.now()): void {
  saveReadyGate(afterReadyShown(loadReadyGate(), now));
}
export function noteReadyClosed(now = Date.now()): void {
  saveReadyGate(afterReadyClosed(loadReadyGate(), now));
}
