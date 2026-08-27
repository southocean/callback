// The guided tour's director: what plays next, and how it reacts.
//
// PURE. No DOM, no timers, no imports from ui/. Every decision is a function of
// the state plus one event, which is what lets the whole adaptive behaviour be
// unit-tested rather than eyeballed — and the adaptivity is the part most likely
// to be subtly wrong, because it is the part with the most states.
//
// The rules are specified in tools/PLAN-guided-tour.md §3. The two that took
// three review passes to get right:
//
//   1. Resumption goes to the LOWEST-PRIORITY UNPLAYED part, not back to where
//      the interruption happened. Nam's own example: interrupted during part 2,
//      visitor opens 5, so after 5 it should run 3, 4, then skip 5, then 6. A
//      "resume where we left off" rule gets that wrong in a way nobody notices
//      until they watch it re-narrate something.
//
//   2. A part counts as played whether the TOUR reached it or the VISITOR did.
//      That is what makes the skip in the example above correct.

import { parts, type Part } from '../data/tour.js';

export type Mode = 'idle' | 'playing' | 'commenting' | 'handedOver' | 'finished';

export interface TourState {
  mode: Mode;
  /** Part ids that have been covered, by either route. */
  played: string[];
  /** Part ids the visitor opened and we have not yet spoken to. */
  queue: string[];
  /** The part currently being spoken, or null between parts. */
  current: string | null;
  /** Which register the current part is being spoken in. */
  register: 'lines' | 'commentary' | 'brief';
  /** True once the "I will keep these short" aside has been used. */
  warned: boolean;
}

export type TourEvent =
  | { t: 'start' }
  | { t: 'partDone' }
  /** The visitor clicked something that maps to a part. */
  | { t: 'visit'; id: string }
  | { t: 'stop' };

export const initialTour: TourState = {
  mode: 'idle',
  played: [],
  queue: [],
  current: null,
  register: 'lines',
  warned: false,
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

export function registerFor(queueLength: number): TourState['register'] {
  return queueLength >= QUEUE_BRIEF ? 'brief' : 'commentary';
}

export function reduceTour(s: TourState, e: TourEvent): TourState {
  switch (e.t) {
    case 'start': {
      if (s.mode !== 'idle') return s;
      const first = nextScripted(s);
      if (!first) return { ...s, mode: 'finished' };
      return { ...s, mode: 'playing', current: first.id, register: 'lines' };
    }

    case 'visit': {
      // Terminal states do not come back. Coming back mid-explore would be
      // exactly the behaviour that made it annoying in the first place.
      if (s.mode === 'handedOver' || s.mode === 'finished') return s;
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
      const queue = [...s.queue, e.id];
      if (queue.length >= QUEUE_HANDOVER) {
        return { ...s, mode: 'handedOver', queue: [], current: null };
      }
      return { ...s, queue };
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
      return { ...s, mode: 'finished', current: null, queue: [] };

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
