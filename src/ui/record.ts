// What was actually said, and which of the two transcripts the chat is showing.
//
// Board ticket N129. Nam: "I want this toggle with a different text: Live
// transcription which defaults to true. What it does is that it prints out the cc
// bubble text into the chat panel as a record of what the script has said. If the
// toggle is off then we show the full script."
//
// THE TWO TRANSCRIPTS ARE THE FEATURE, not a detail of it. One is a record of what
// happened in this room; the other is the running order. They agree exactly until
// the visitor does something, and then they do not: a line pressed past, a segment
// jumped by a click, a Stop and a resumption all move the real clock away from the
// authored one. So the switch is not a display preference over one dataset, it
// chooses between two honest answers to different questions:
//
//   ON   what has been said here, stamped when it was said
//   OFF  what there is to say, stamped when it would be said
//
// Which is why the timestamps have to come from different places, and why the
// heading changes with the switch. A transcript that says 09:04 for a line nobody
// has reached yet is fine as a running order and a lie as a record.
//
// SESSION-SCOPED AND NOT PERSISTED, deliberately. The switch defaults on, per Nam,
// and it stays wherever the visitor left it while they are here: closing the panel
// and reopening it does not reset it, and neither does switching to People and
// back, because the panel host rebuilds its body every time. A reload starts over,
// which is right for a control that describes this call rather than this reader.

/** One caption bubble, with the wall-clock moment it went up. */
export interface Said {
  /** Date.now() when the bubble was emitted. */
  at: number;
  text: string;
}

const said: Said[] = [];
const listeners = new Set<() => void>();

/**
 * When the meeting started, in wall-clock terms.
 *
 * The OFF transcript needs it: its stamps are the authored offsets "offset by the
 * time the meeting started", which is a real time of day and not a duration. Zero
 * until the call mounts, and the reader below treats zero as "use now" so a
 * transcript rendered before the call somehow existed still prints times rather
 * than 1970.
 */
let startedAt = 0;

/** Stamped when the call mounts. Idempotent: a re-render is not a new meeting. */
export function startMeeting(): void {
  if (!startedAt) startedAt = Date.now();
}

export function meetingStart(): number {
  return startedAt || Date.now();
}

/**
 * Log a bubble.
 *
 * DEDUPED AGAINST THE PREVIOUS LINE, and this is required rather than tidy. A quip
 * borrows the floor and then puts back the line it cut over by calling show() with
 * the same text again (see sayQuip in tour/stage.ts), and the pause does the same
 * thing when it resumes. Without this the record would show the interrupted line
 * twice, several seconds apart, which reads as the script stuttering.
 *
 * Only the immediately preceding line is compared. A line that genuinely recurs
 * later in the conversation is a thing that was genuinely said twice.
 */
export function noteSaid(text: string): void {
  const t = text.trim();
  if (!t) return;
  if (said[said.length - 1]?.text === t) return;
  said.push({ at: Date.now(), text: t });
  for (const fn of listeners) fn();
}

export function saidSoFar(): readonly Said[] {
  return said;
}

/**
 * Tell me when something new is said.
 *
 * Returns its own unsubscribe. The chat panel holds one of these while it is on
 * screen so the record grows under the reader rather than only on reopen, which
 * matters because the most likely time to have the chat panel open is while he is
 * talking.
 */
export function onSaid(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ------------------------------------------------------------- the switch -- */

let live = true;

/** Is the chat showing the record, or the running order? */
export function liveTranscription(): boolean {
  return live;
}

export function setLiveTranscription(on: boolean): void {
  live = on;
}

/* ------------------------------------------------------------- formatting -- */

/**
 * A wall-clock stamp for a transcript line.
 *
 * SECONDS, AND NOT JUST HOURS AND MINUTES. The chat messages above use HH:MM
 * because they are minutes apart and that is what a chat shows. These lines are
 * seconds apart, so HH:MM would print the same stamp eight times in a row and the
 * column would stop carrying information. Nam asked for "the exact timestamp when
 * the script bubble is emited", and this is what exact means at this cadence.
 *
 * Local time, 24 hour, because both transcripts are read next to each other and a
 * meridiem on one of them buys nothing.
 */
export function stamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
