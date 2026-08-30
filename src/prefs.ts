// What this page is allowed to remember about you, which is almost nothing.
//
// Every record here is one of two kinds. Either it is a SURPRISE ALREADY SPENT
// -- a clip watched, a bug caught, a quip heard, an answer given -- where the
// memory exists so the visitor is not shown the same reveal twice; or it is a
// CHOICE they made, like the sound preference, where the memory exists so they
// do not have to make it again.
//
// Two habits run through the whole file and are worth stating once. Records are
// keyed by ID rather than by index, because ids survive a list being reordered
// and indices quietly do not. And anything unparseable reads as a fresh visitor
// rather than throwing: this all comes out of localStorage, which anyone can
// hand-edit, and a garbled key should cost somebody a reveal rather than the
// page they were reading.
//
// THE ONE THING THAT USED TO LIVE AT THE TOP OF THIS FILE was the gate on Meet's
// "Your meeting's ready" card: a show count, a mute window and a fixed-clock
// rule for when the card was allowed back. N153 removed the card, so the gate
// went with it rather than being left behind as a tested answer to a question
// nobody asks. The card's content was never lost -- the referral note and the
// copyable link are in Host controls, which is where both of its openers now go.
//
// Nothing here leaves the machine. There is no backend to send it to, which is
// the same promise the rest of the site makes.

import { eggs, type Egg } from './data/eggs.js';

/** The sound choice. */
const SOUND_KEY = 'callback.sound';

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


/* ------------------------------------------------------- the gate's long way */

/**
 * WHICH GATE QUESTIONS HAVE BEEN SOLVED -- board ticket N175.
 *
 * The admin gate has a second door: thirty correct answers out of a bank of
 * forty opens it, for the reader who will never be told the password. That only
 * works if the thirty survive closing the box, so this is a record rather than a
 * session tally. Nam: "we need to remember which question has been answer
 * correctly and not show it anymore."
 *
 * IDS ONLY, and never a count. A stored number could be edited to thirty by
 * hand, but far more importantly it could not answer the question the dialog
 * actually asks each time it opens, which is WHICH ones are left. Storing the
 * ids gives the remaining queue and the score off one list, and a renamed
 * question drops out of both at once -- see remaining() and score() in
 * data/admin.ts.
 *
 * Not a security boundary, exactly like the grant it leads to. Anyone who opens
 * devtools can write thirty ids into it, and would have found the password
 * faster.
 */
const SOLVED_KEY = 'callback.gate';

/** Anything unparseable reads as nothing solved, which is the safe direction. */
export function readSolved(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

export function solvedGate(): string[] {
  try {
    return readSolved(localStorage.getItem(SOLVED_KEY));
  } catch {
    return [];
  }
}

/**
 * Bank one. Returns the new list, so the caller does not have to read it back.
 *
 * Deduped, because the same id arriving twice would inflate a score that decides
 * whether a door opens. score() dedupes as well; doing it here too keeps the
 * stored record honest rather than merely the number computed from it.
 */
export function solveGate(id: string): string[] {
  const next = [...new Set([...solvedGate(), id])];
  try {
    localStorage.setItem(SOLVED_KEY, JSON.stringify(next));
  } catch {
    /* private window. The run still counts in memory until the box closes. */
  }
  return next;
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
  /*
   * N156, and the first of these is the one that stopped being optional.
   *
   * Nam: "add the ability to clear progression on the project spec/settings too.
   * And a button to clear admin right too so we can test the admin gate."
   *
   * The list was written when everything worth resetting was a first-visit
   * surprise. The answers record is no longer only that: N148 made it decide
   * whether the Skip intro control is offered at all, so without a row here the
   * feature can be tested exactly once per machine and never again without
   * devtools. That is the difference between a record and a switch.
   *
   * The admin grant is the same argument aimed at the gate itself, and it is the
   * only row that takes away the panel it is pressed in. That is the point of it
   * rather than a flaw: `isAdmin()` is read when the panel renders, so the tabs
   * stay up for this view and the gate is back on the next load. The `what` says
   * so, because a button whose effect is invisible until you reload reads as a
   * button that did nothing.
   */
  { key: 'callback.answers', label: 'Interview answers', what: 'which of the eight questions have been heard, and with them the Skip intro control' },
  { key: 'callback.quips', label: 'Commentary heard', what: 'the one-off remarks, so he notices the same things again' },
  { key: 'callback.admin', label: 'Admin access', what: 'the grant behind the hidden tabs. Clearing it puts the gate back on the next load' },
  { key: SOLVED_KEY, label: 'Gate questions solved', what: 'the correct answers banked toward the thirty that open the gate the long way' },
];

/** How many entries a record holds, for the button that is about to delete it. */
export function storedCount(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.length : 1;
  } catch {
    /*
     * Not every record is JSON. N158 introduced the first keys that are bare
     * strings rather than arrays, and a throw here used to report them as EMPTY:
     * a Settings row for a key that is set, offering to forget nothing, with a
     * button that looks inert.
     *
     * No row hits this path today -- the front-door key parses as a number by
     * luck, and the variant key is not forgettable -- so this is a correctness
     * fix rather than a bug report. A key that exists holds one thing whether or
     * not it happens to be valid JSON, and the alternative is a counter that is
     * wrong and waiting for the next non-array preference to prove it.
     */
    return 1;
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
 * Which commentary lines have been heard, and what the ring last showed.
 *
 * The commentary used to be the only collection with no memory: a quip fired once
 * per SESSION, out of `tour.quipped`, and came back on the next visit. That is
 * fine for a throwaway line and was wrong once a percentage counted them, so it
 * was written down.
 *
 * IT IS NO LONGER COUNTED -- board ticket N137, and the argument is in
 * completion.ts -- but the memory stays, and it is now doing the job it was
 * always better at: stopping him make the same observation twice at somebody who
 * came back a second time. That is worth persisting for its own sake, and it
 * costs one small key.
 */
const QUIP_KEY = 'callback.quips';
/** What the visitor was last shown, so the next report can animate the gain. */
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

/**
 * Everything found, from the four places it is kept.
 *
 * Still four, though only three of them are scored: `quips` is read by nothing
 * but the quip system itself now (N137). It stays on this shape because the pass
 * diff and the tally both take this object and neither is harmed by a field it
 * ignores, and because splitting it would put two readers of the same four keys
 * in two places.
 */
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

// ---------------------------------------------------------------------------
// THE FRONT DOOR -- board ticket N158
// ---------------------------------------------------------------------------

/**
 * Which title-card animation is showing.
 *
 * TEMPORARY, and the ticket says so. Four variants ship so Nam can choose on the
 * real screen at the real size rather than from four descriptions, and three of
 * them come out afterwards along with the picker and this key. It is stored
 * rather than held in memory because choosing between four animations means
 * reloading and looking again, and a choice that does not survive the reload
 * cannot be compared against the thing it is competing with.
 */
const VARIANT_KEY = 'callback.startart';

export function loadVariant(): string | null {
  try {
    return localStorage.getItem(VARIANT_KEY);
  } catch {
    return null;
  }
}

export function saveVariant(id: string): void {
  try {
    localStorage.setItem(VARIANT_KEY, id);
  } catch {
    /* ignore */
  }
}

/**
 * Which drone-show programme is running.
 *
 * Same argument as the variant key above and the same expiry: it is a choice
 * being made at the real size on the real screen, it has to survive the reload
 * that comparing two of them requires, and it goes when Nam has picked.
 */
const THEME_KEY = 'callback.startheme';

export function loadTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export function saveTheme(id: string): void {
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    /* ignore */
  }
}
