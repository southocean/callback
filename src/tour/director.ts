// The guided tour's director: what plays next, and how it reacts.
//
// PURE. No DOM, no timers, no imports from ui/. Every decision is a function of
// the state plus one event, which is what lets the whole adaptive behaviour be
// unit-tested rather than eyeballed — and the adaptivity is the part most likely
// to be subtly wrong, because it is the part with the most states.
//
// The rules are specified in tools/PLAN-guided-tour.md §3. The ones that took
// review passes to get right:
//
//   1. Resumption goes to the LOWEST-PRIORITY UNPLAYED part, not back to where
//      the interruption happened. Nam's own example: interrupted during part 2,
//      visitor opens 5, so after 5 it should run 3, 4, then skip 5, then 6. A
//      "resume where we left off" rule gets that wrong in a way nobody notices
//      until they watch it re-narrate something.
//
//   2. A part counts as played whether the TOUR reached it or the VISITOR did.
//      That is what makes the skip in the example above correct.
//
//   3. A QUIP IS NOT A PART. Commentary interjects over whatever is happening
//      and hands the floor straight back; it never enters the queue, never
//      changes the register, and never fires twice. Modelling it as a part was
//      the first thing tried and it was wrong in both directions — a throwaway
//      line about the taskbar clock would push the CV further down the running
//      order, and clicking the clock twice would say the same joke twice.
//
//   4. THE FLOW FINISHING IS NOT THE TOUR ENDING. `finished` means the script
//      has nothing left to show; the commentary stays live, and the personal
//      story is still waiting for enough silence to be worth starting.

import { parts, quips, story, type Part, type Quip } from '../data/tour.js';

export type Mode =
  | 'idle'
  /** Working down the flow in the full register. */
  | 'playing'
  /** Speaking a part the visitor opened themselves. */
  | 'commenting'
  /** The uninterruptible personal segment. */
  | 'telling'
  /** Gave up narrating. Terminal. */
  | 'handedOver'
  /** The flow is done. Commentary is still live. */
  | 'finished';

export type Register = 'lines' | 'commentary' | 'brief';

export interface TourState {
  mode: Mode;
  /** Part ids that have been covered, by either route. */
  played: string[];
  /** Part ids the visitor opened and we have not yet spoken to. */
  queue: string[];
  /** The part currently being spoken, or null between parts. */
  current: string | null;
  /** Which register the current part is being spoken in. */
  register: Register;
  /** True once the "I will keep these short" aside has been used. */
  warned: boolean;
  /** Quip ids already spent. Each one fires once, ever. */
  quipped: string[];
  /** A quip waiting to be said over whatever is happening. */
  interject: string | null;
  /** True once the personal story has run. It runs at most once. */
  told: boolean;
}

export type TourEvent =
  | { t: 'start' }
  | { t: 'partDone' }
  /** The visitor clicked something that maps to a part. */
  | { t: 'visit'; id: string }
  /** The visitor did something a quip has an answer for. */
  | { t: 'quip'; id: string }
  | { t: 'quipDone' }
  /** Enough silence has passed to start the personal segment. */
  | { t: 'tell' }
  | { t: 'toldDone' }
  /** The visitor has gone quiet. Drop a stale backlog and get back to the script. */
  | { t: 'settle' }
  | { t: 'stop' };

export const initialTour: TourState = {
  mode: 'idle',
  played: [],
  queue: [],
  current: null,
  register: 'lines',
  warned: false,
  quipped: [],
  interject: null,
  told: false,
};

const byId = (id: string): Part | undefined => parts.find((p) => p.id === id);

/** Priority order, which is also the order things get cut in. */
const ordered = (): Part[] => [...parts].sort((a, b) => a.priority - b.priority);

/** The next scripted part: lowest priority that has not been covered. */
export function nextScripted(s: TourState): Part | null {
  return ordered().find((p) => !s.played.includes(p.id)) ?? null;
}

/**
 * How long a queue may get before the register changes.
 *
 * 1–2 is a normal interruption and gets the full commentary. 3–4 means they are
 * moving faster than we can talk, so we get shorter and say so once. 5 or more
 * is not interest, it is exploration — and the right response to exploration is
 * to stop narrating it.
 */
export const QUEUE_BRIEF = 3;
export const QUEUE_HANDOVER = 5;

export function registerFor(queueLength: number): Register {
  return queueLength >= QUEUE_BRIEF ? 'brief' : 'commentary';
}

/** Terminal states do not come back, and neither does the story mid-telling. */
const locked = (s: TourState): boolean =>
  s.mode === 'handedOver' || s.mode === 'telling';

export function reduceTour(s: TourState, e: TourEvent): TourState {
  switch (e.t) {
    case 'start': {
      if (s.mode !== 'idle') return s;
      const first = nextScripted(s);
      if (!first) return { ...s, mode: 'finished' };
      return { ...s, mode: 'playing', current: first.id, register: 'lines' };
    }

    case 'visit': {
      // Coming back mid-explore would be exactly the behaviour that made it
      // annoying in the first place. The story, once started, finishes.
      if (locked(s)) return s;
      const part = byId(e.id);
      if (!part) return s;
      /*
       * Rule 1: never re-narrate. A visitor clicking around a part they have
       * just heard, or are hearing now, gets silence rather than a replay.
       * Without this the most engaged visitor gets the worst experience.
       */
      if (s.played.includes(e.id) || s.current === e.id || s.queue.includes(e.id)) {
        return { ...s, played: s.played.includes(e.id) ? s.played : [...s.played, e.id] };
      }
      // The flow is over; a visit is now just commentary, and commentary does
      // not restart a script that has already said goodbye.
      if (s.mode === 'finished') return { ...s, played: [...s.played, e.id] };
      const queue = [...s.queue, e.id];
      if (queue.length >= QUEUE_HANDOVER) {
        return { ...s, mode: 'handedOver', queue: [], current: null };
      }
      return { ...s, queue };
    }

    case 'quip': {
      /*
       * One shot, ever, and never over the story. A quip is worth a second of
       * the floor and nothing more, so it does not get to interrupt the one
       * segment that was written to run whole.
       */
      if (s.mode === 'telling' || s.mode === 'handedOver') return s;
      if (s.quipped.includes(e.id)) return s;
      if (!quips.some((q) => q.id === e.id)) return s;
      return { ...s, quipped: [...s.quipped, e.id], interject: e.id };
    }

    case 'quipDone':
      return s.interject ? { ...s, interject: null } : s;

    case 'tell': {
      // Only once, only after the flow has shown everything it had, and only
      // when nothing else is holding the floor.
      if (s.told || s.mode !== 'finished' || !story.length) return s;
      return { ...s, mode: 'telling', current: null, queue: [], interject: null };
    }

    case 'toldDone':
      return s.mode === 'telling' ? { ...s, mode: 'finished', told: true } : s;

    case 'settle': {
      /*
       * They have stopped clicking. A BACKLOG collected while they were
       * exploring is stale — narrating six things back at them minutes after
       * they looked at them is answering questions nobody remembers asking — so
       * it is dropped and the script goes back to its own order.
       *
       * A backlog, though. Not a request.
       *
       * The first version of this rule dropped the queue at any length, and QA
       * caught what that costs: click one tab, wait three seconds — which is
       * what looking at the thing you just opened consists of — and the tour
       * carried on as if you had not touched it. The single most engaged action
       * a visitor can take was the one action being discarded.
       *
       * QUEUE_BRIEF is the threshold this codebase already uses for "more than
       * they can be talked through", so it is the honest number to reuse rather
       * than invent a second one beside it.
       */
      if (locked(s) || s.queue.length < QUEUE_BRIEF) return s;
      return { ...s, queue: [] };
    }

    case 'partDone': {
      if (s.mode !== 'playing' && s.mode !== 'commenting') return s;
      const played = s.current && !s.played.includes(s.current)
        ? [...s.played, s.current]
        : s.played;

      // A visitor request outranks the script, always.
      if (s.queue.length) {
        const [next, ...rest] = s.queue;
        const register = registerFor(s.queue.length);
        return {
          ...s,
          mode: 'commenting',
          played,
          queue: rest,
          current: next!,
          register,
          warned: s.warned || register === 'brief',
        };
      }

      const next = nextScripted({ ...s, played });
      if (!next) return { ...s, mode: 'finished', played, current: null };
      return { ...s, mode: 'playing', played, current: next.id, register: 'lines' };
    }

    case 'stop':
      // Stop means stop, including out of the story. It is the one control the
      // visitor has and it cannot have exceptions.
      return { ...s, mode: 'finished', current: null, queue: [], interject: null, told: true };

    default:
      return s;
  }
}

/** The lines to speak for the current part, in the current register. */
export function linesFor(s: TourState): { text: string; ms: number }[] {
  if (!s.current) return [];
  const p = byId(s.current);
  if (!p) return [];
  if (s.register === 'commentary') return p.commentary;
  if (s.register === 'brief') return p.brief;
  return p.lines;
}

/**
 * Which part a clicked element belongs to, by selector.
 *
 * Returns the FIRST part whose triggers match, in priority order, so a selector
 * claimed by two parts resolves predictably rather than by array position.
 */
export function partForElement(el: Element): Part | null {
  for (const p of ordered()) {
    for (const sel of p.triggers ?? []) {
      if (el.closest(sel)) return p;
    }
  }
  return null;
}

/**
 * Which quip a clicked element earns, if any.
 *
 * Checked AFTER partForElement by the stage, so a click that is both a part
 * trigger and a quip trigger becomes the part. The part is the bigger answer and
 * a quip alongside it would be two voices on one click.
 */
export function quipForElement(el: Element): Quip | null {
  for (const q of quips) {
    if (q.kind !== 'click') continue;
    try {
      if (el.closest(q.on)) return q;
    } catch {
      // A selector that does not parse is a bug in the script, not a reason to
      // take the tour down with it.
    }
  }
  return null;
}

/**
 * The quip for something the app reported directly.
 *
 * A drag is not a click on anything, and a panel opened with a keyboard
 * shortcut is not a click on anything either. Those arrive as announcements —
 * `desk:snap`, `panel:people` — rather than as elements.
 */
export function quipForEvent(key: string): Quip | null {
  return quips.find((q) => q.kind === 'event' && q.on === key) ?? null;
}

export function quipById(id: string): Quip | null {
  return quips.find((q) => q.id === id) ?? null;
}
