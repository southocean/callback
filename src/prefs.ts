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

import { eggs, type Egg } from './data/eggs.js';

const KEY = 'callback.ready';
/** The sound choice, which is a different lifetime from the card's mute. */
const SOUND_KEY = 'callback.sound';

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

// ---------------------------------------------------------------- sound ----
//
// A browser will not autoplay audio without a gesture, so the first clip is
// always muted whatever we do. That part is not ours to fix. What WAS ours, and
// wrong, is that the player then showed an unmuted speaker and a volume slider
// at maximum while playing silently — Nam: "the video doesnt start with sound,
// even though volume is max and so on ... we shouldnt show the volume being max
// and volume on."
//
// So the UI now reads off the video rather than off its own defaults, and the
// visitor's answer is remembered: unmute once and every later clip in the
// session opens with sound, because by then the page has the gesture the policy
// wanted.
//
// The distinction that matters: a mute the VISITOR chose is saved, and a mute
// the BROWSER imposed is not. Saving the second would teach the player that
// someone who never touched the control prefers silence.

export interface SoundPref {
  muted: boolean;
  /** 0–1, kept even while muted so unmuting returns to the same loudness. */
  volume: number;
}

/** Muted by default: a CV that starts talking at you unprompted is worse. */
export const SOUND_DEFAULT: SoundPref = { muted: true, volume: 1 };

/** Anything unparseable or out of range reads as a first visit. */
export function readSound(raw: string | null): SoundPref {
  if (!raw) return SOUND_DEFAULT;
  try {
    const v = JSON.parse(raw) as Partial<SoundPref>;
    if (typeof v !== 'object' || v === null) return SOUND_DEFAULT;
    if (typeof v.muted !== 'boolean') return SOUND_DEFAULT;
    if (typeof v.volume !== 'number' || !Number.isFinite(v.volume)) return SOUND_DEFAULT;
    // Clamp rather than reject: a hand-edited 5 is a silly value, not a corrupt
    // record, and the visitor's mute flag is still worth honouring.
    return { muted: v.muted, volume: Math.min(1, Math.max(0, v.volume)) };
  } catch {
    return SOUND_DEFAULT;
  }
}

export function loadSound(): SoundPref {
  try {
    return readSound(localStorage.getItem(SOUND_KEY));
  } catch {
    return SOUND_DEFAULT;
  }
}

export function saveSound(p: SoundPref): void {
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(p));
  } catch {
    /* ignore — the next clip simply opens muted again. */
  }
}

// ---------------------------------------------------------------------------
// WHICH CLIPS THEY HAVE FOUND — board ticket N41
//
// Nam: "here we need to track which of the easter eggs they have found, then we
// walk them through the rest, earning them the remaining achievements in finding
// these videos."
//
// So the tour needs to know what NOT to show, which means the eggs have to be
// remembered between visits. Same shape as everything else in this file: a pure
// rule that can be tested, and a get and a set that both shrug if storage is
// gone. A visitor in a private window simply gets shown all of them, which is
// the correct failure — the alternative is hiding content because we could not
// remember whether we had already shown it.
// ---------------------------------------------------------------------------

const EGG_KEY = 'callback.eggs';

/** Anything unparseable reads as a first visit. Ids only, no timestamps to age. */
export function readSeenEggs(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

/** Which of `all` are still unfound, in the order they were authored. */
export function stillUnseen<T extends { id: string }>(all: T[], seen: string[]): T[] {
  return all.filter((e) => !seen.includes(e.id));
}

export function seenEggs(): string[] {
  try {
    return readSeenEggs(localStorage.getItem(EGG_KEY));
  } catch {
    return [];
  }
}

export function markEggSeen(id: string): void {
  try {
    const now = seenEggs();
    if (now.includes(id)) return;
    localStorage.setItem(EGG_KEY, JSON.stringify([...now, id]));
  } catch {
    /* ignore — the tour will offer it again next time, which is harmless. */
  }
}

export function unseenEggs(): Egg[] {
  return stillUnseen(eggs, seenEggs());
}

// ---------------------------------------------------------------------------
// HOW LONG THE INTERVIEW TOOK — board ticket N51
// ---------------------------------------------------------------------------

/**
 * The clock on the conversation, and the best one so far.
 *
 * Nam: "I want to capture the time user spent on the call such that they finish
 * the whole conversation ... This is to add gamification to this CV which is my
 * expertise."
 *
 * WHAT IS AND IS NOT TIMED. The clock starts on the first spoken line and stops
 * at the goodbye. It does not include the outro, because the outro is a joke
 * about not leaving and timing it would reward leaving. It does not include a run
 * that was stopped or handed over either: a partial hearing is not a completion,
 * and a leaderboard whose top entry is "pressed Stop immediately" is not a
 * leaderboard.
 *
 * The interesting number is not the time itself but the time against the
 * benchmark the script derives from its own dwells (`runtimeMs` in data/tour.ts).
 * Beating it is genuinely skilful: every line can be skipped with a press, and
 * triggering a segment early cuts the one being spoken short, so the running
 * order can be played in a way that spends fewer lines than the authored path.
 *
 * Nothing here leaves the machine, which is the same promise the rest of this
 * module makes — and the reason the leaderboard is a backlog ticket (N52) rather
 * than a feature.
 */
const INTERVIEW_KEY = 'callback.interview';

/* ------------------------------------------------------------------ banter */

/**
 * Which post-credit lines this visitor has already heard.
 *
 * Same shape and same reasoning as the clips above: a list of ids, parsed
 * defensively because it comes out of storage, and a pure chooser so the rule
 * can be tested against a fixed random source rather than observed.
 */
const BANTER_KEY = 'callback.banter';

export function seenBanter(): string[] {
  try {
    return readSeenEggs(localStorage.getItem(BANTER_KEY));
  } catch {
    return [];
  }
}

export function markBanterSeen(ids: string[]): void {
  try {
    const now = new Set(seenBanter());
    for (const id of ids) now.add(id);
    localStorage.setItem(BANTER_KEY, JSON.stringify([...now]));
  } catch {
    /* ignore */
  }
}

/**
 * `n` lines nobody has heard yet, and what to remember afterwards.
 *
 * THE POOL RESETS RATHER THAN RUNNING DRY. Somebody on their sixth visit has
 * earned more banter than the app has, and the alternatives are both worse than
 * repeating: saying less each time, or saying nothing. When it wraps it wraps
 * whole, so the second cycle is as varied as the first rather than degrading
 * into whichever four were left over.
 *
 * Pure, with the randomness injected, because "does it avoid what it has
 * already said" is exactly the kind of rule that is easy to get subtly wrong and
 * impossible to notice going wrong.
 */
export function chooseBanter<T extends { id: string }>(
  all: T[], seen: string[], n: number, rnd: () => number,
): { picks: T[]; reset: boolean } {
  let pool = stillUnseen(all, seen);
  const reset = pool.length < n;
  if (reset) pool = [...all];
  const bag = [...pool];
  const picks: T[] = [];
  while (picks.length < n && bag.length) {
    const i = Math.min(bag.length - 1, Math.floor(rnd() * bag.length));
    picks.push(bag.splice(i, 1)[0]!);
  }
  return { picks, reset };
}

export function clearBanter(): void {
  try {
    localStorage.removeItem(BANTER_KEY);
  } catch {
    /* ignore */
  }
}

export interface Interview {
  /** The most recent completed run, ms. */
  lastMs: number;
  /** The fastest completed run, ms. */
  bestMs: number;
  /** How many times the conversation has been heard out. */
  runs: number;
}

/** A run shorter than this did not happen. Guards a clock that went backwards. */
export const INTERVIEW_MIN_MS = 1000;
/** And nor did one longer than this — a tab left open overnight is not a run. */
export const INTERVIEW_MAX_MS = 4 * 60 * 60 * 1000;

/**
 * Parse, and treat anything malformed as no record at all.
 *
 * Same reasoning as freshGate above: this comes out of localStorage, which
 * anybody can hand-edit, and a hand-edited `bestMs: 0` should read as a fresh
 * visitor rather than print "your best: 0:00" on the ended screen forever.
 */
export function readInterview(raw: string | null): Interview | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Interview>;
    if (!v || typeof v !== 'object') return null;
    const ok = (n: unknown): n is number =>
      typeof n === 'number' && Number.isFinite(n) && n >= INTERVIEW_MIN_MS && n <= INTERVIEW_MAX_MS;
    if (!ok(v.lastMs) || !ok(v.bestMs)) return null;
    const runs = typeof v.runs === 'number' && Number.isFinite(v.runs) && v.runs > 0 ? Math.floor(v.runs) : 1;
    // A best slower than the last is a record that has been edited or a bug.
    // Repairing it is safe and silent; trusting it would print a lie.
    return { lastMs: v.lastMs, bestMs: Math.min(v.bestMs, v.lastMs), runs };
  } catch {
    return null;
  }
}

/** Fold a finished run into the record. Pure, so the rule is testable. */
export function afterInterview(prev: Interview | null, ms: number): Interview | null {
  if (!Number.isFinite(ms) || ms < INTERVIEW_MIN_MS || ms > INTERVIEW_MAX_MS) return prev;
  if (!prev) return { lastMs: ms, bestMs: ms, runs: 1 };
  return { lastMs: ms, bestMs: Math.min(prev.bestMs, ms), runs: prev.runs + 1 };
}

export function loadInterview(): Interview | null {
  try {
    return readInterview(localStorage.getItem(INTERVIEW_KEY));
  } catch {
    return null;
  }
}

export function recordInterview(ms: number): void {
  try {
    const next = afterInterview(loadInterview(), ms);
    if (next) localStorage.setItem(INTERVIEW_KEY, JSON.stringify(next));
  } catch {
    /* ignore — a time nobody can store is still a time they just experienced. */
  }
}

/** m:ss, for the one place this is read out loud. */
export function clockMs(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// ADMIN, which is a joke with a lock on it
// ---------------------------------------------------------------------------

/**
 * Whether the reader has been through the gate.
 *
 * PERSISTED, like everything else in this file, and for the same reason: making
 * somebody perform an eleven click cheat code again because they reloaded is a
 * punishment for having found it. It is also the only pref here whose absence is
 * the interesting state, so it is stored as a single stamp and read as a
 * boolean; anything unparseable reads as locked, which is the safe direction.
 *
 * Not a security boundary and this file will not pretend otherwise. Everything
 * behind the gate ships in the same bundle, and a reader who opens the console
 * is one setItem away. It is a spoiler curtain, and the threat model is a
 * first-time visitor being handed the bug hunt's answer key unasked.
 */
const ADMIN_KEY = 'callback.admin';

export function readAdmin(raw: string | null): boolean {
  return raw === '1';
}

/* ---------------------------------------------------------------- forget it */

/**
 * EVERY FIRST-VISIT EXPERIENCE, ERASABLE -- board ticket N80.
 *
 * Nam: "add a new settings tab, where we have a button to clear out achivements
 * and clear out bugs, just so we can test out the onboarding behavior."
 *
 * The problem it solves is real and gets worse the longer the project runs.
 * Almost everything interesting here happens once: the quest toasts, the empty
 * drawer, the clips you have not seen, the four post-credit lines you have not
 * heard. Anybody who has worked on it has spent all of that, and the visitor it
 * was designed for has not spent any of it. Without a reset the only way to
 * check the first minute is a private window, which loses the devtools you were
 * about to use.
 *
 * A list rather than four exported functions, because the Settings tab wants to
 * SAY what each one is about to forget and how much of it there is, and that is
 * an awkward thing to keep in step across two modules.
 */
export interface Forgettable {
  key: string;
  label: string;
  what: string;
}

export const FORGETTABLE: Forgettable[] = [
  { key: 'callback.quests', label: 'Side quests', what: 'the achievements, and the toasts that announce them' },
  { key: 'callback.bugs', label: 'The collection', what: 'every bug caught, so the case is twelve silhouettes again' },
  { key: EGG_KEY, label: 'Clips found', what: 'which of the calendar clips have been watched' },
  { key: BANTER_KEY, label: 'Post-credit lines', what: 'which of the after-the-goodbye lines have been heard' },
  { key: INTERVIEW_KEY, label: 'Interview times', what: 'the run count and the best time on the ended screen' },
];

/** How many entries a record holds, for the button that is about to delete it. */
export function storedCount(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.length : 1;
  } catch {
    return 0;
  }
}

export function forget(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function isAdmin(): boolean {
  try {
    return readAdmin(localStorage.getItem(ADMIN_KEY));
  } catch {
    return false;
  }
}

export function grantAdmin(): void {
  try {
    localStorage.setItem(ADMIN_KEY, '1');
  } catch {
    /* ignore: the session still has its in-memory grant. */
  }
}

export function revokeAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// WHICH ANSWERS HAVE BEEN HEARD — board ticket N110
// ---------------------------------------------------------------------------

/**
 * The personal segment is eight questions and takes about ninety seconds, and it
 * only ever starts after the visitor has gone quiet. So the likeliest way to meet
 * it is halfway: it begins, they click something, and it is gone.
 *
 * Nam: "I want you to remember the progress of these questions, in case they exit
 * it early, then we know which questions they have listened to, and if they go
 * back then we we continue."
 *
 * A chapter counts as heard after its LAST line, which is the only honest
 * boundary. Marking it at the question would credit somebody for a question they
 * heard and an answer they did not.
 *
 * Same shape as the eggs record above, and for the same reasons: ids rather than
 * indices, anything unparseable reads as a fresh visitor, and it never leaves
 * the machine.
 */
const ANSWER_KEY = 'callback.answers';

export function readHeard(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function heardAnswers(): string[] {
  try {
    return readHeard(localStorage.getItem(ANSWER_KEY));
  } catch {
    return [];
  }
}

export function markAnswerHeard(id: string): void {
  try {
    const now = heardAnswers();
    if (now.includes(id)) return;
    localStorage.setItem(ANSWER_KEY, JSON.stringify([...now, id]));
  } catch {
    /* ignore: they hear it again next time, which is harmless. */
  }
}

// ---------------------------------------------------------------------------
// COMPLETION — board ticket N118
// ---------------------------------------------------------------------------

/**
 * Which commentary lines have been found, and what the ring last showed.
 *
 * The commentary was the only one of the four collections with no memory: a quip
 * fired once per SESSION, out of `tour.quipped`, and came back on the next visit.
 * That is fine for a throwaway line and wrong for something a percentage counts,
 * so it is written down now.
 *
 * A quip found while the script is talking still counts (N108). It does not get
 * said, but the visitor did the thing, and a completion number that disagrees
 * with what somebody actually did is worse than a line they missed.
 */
const QUIP_KEY = 'callback.quips';
/** What the ended screen last reported, so the next one can animate the gain. */
const SEEN_PCT_KEY = 'callback.pct';

export function foundQuips(): string[] {
  try {
    return readHeard(localStorage.getItem(QUIP_KEY));
  } catch {
    return [];
  }
}

export function markQuipFound(id: string): void {
  try {
    const now = foundQuips();
    if (now.includes(id)) return;
    localStorage.setItem(QUIP_KEY, JSON.stringify([...now, id]));
  } catch {
    /* ignore */
  }
}

/**
 * The percentage the visitor was last shown.
 *
 * Read before the ended screen paints and written after, so the ring animates
 * from what they remember to what they have. A first visit animates from zero,
 * which is the honest starting point rather than a special case.
 */
export function lastShownPct(): number {
  try {
    const n = Number(localStorage.getItem(SEEN_PCT_KEY));
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
  } catch {
    return 0;
  }
}

export function rememberPct(pct: number): void {
  try {
    localStorage.setItem(SEEN_PCT_KEY, String(Math.round(pct)));
  } catch {
    /* ignore */
  }
}

/** Everything found, from the four places it is kept. */
export function foundAll(): { quests: string[]; quips: string[]; bugs: string[]; eggs: string[] } {
  const read = (key: string): string[] => {
    try {
      return readHeard(localStorage.getItem(key));
    } catch {
      return [];
    }
  };
  return {
    quests: read('callback.quests'),
    quips: foundQuips(),
    bugs: read('callback.bugs'),
    eggs: seenEggs(),
  };
}
