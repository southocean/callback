// Is the copy we said we removed actually gone from what a visitor loads?
//
// Nam, on finding nine cover-letter messages still in the panel after being told
// they were handled: "How the heck can I trust you now, you say you have done stuff
// and then I check back they are still there!! do you QA any of your work at all?"
//
// The honest answer that time was that the source was checked and the BUILD was not,
// and that a removal was read narrowly. The first half of that is a gate's job. This
// is the gate.
//
// WHY A PLAIN GREP OVER docs/ DOES NOT WORK, and it is the reason this file is longer
// than a one-liner. docs/ accumulates content-hashed chunks from every earlier build
// that has not been cleaned up, so `grep -r` finds text sitting in a chunk no visitor
// can reach and reports a failure that is not real. Worse, it can do the opposite:
// find a string in a STALE chunk and conclude the current build still ships it. So
// the import graph is walked from index.html first, and only the reachable files are
// searched.
//
// The list below is deliberately short. It is not a copy of the content; it is the
// specific claims that were made about the content, each one an assertion that a
// past instruction is still honoured. Add to it when something is removed on request,
// which is exactly when a reader would otherwise have to take it on trust.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'docs';

/**
 * ABSENT: copy that was removed on request, and must not come back.
 * PRESENT: copy a feature depends on, so a rename or a refactor that silently drops
 *          it fails here rather than in front of Nam.
 *
 * `why` is printed on failure. A gate that says only "assertion failed" makes the
 * next person guess whether the rule still applies.
 */
const ABSENT = [
  {
    text: 'This panel is the cover letter',
    why: 'N138 cut the chat panel’s cover letter. This was its framing line.',
  },
  {
    text: 'Four strangers on four networks',
    why: 'N138. One of the nine cover-letter messages.',
  },
  {
    text: 'chat panel because a chat panel is where people',
    why: 'N129 removed the info card that explained the cover-letter conceit.',
  },
  {
    text: 'no Google marks are used',
    why: 'N133. The build opens with the Google sign-in and draws the Meet mark, so this sentence was false.',
  },
  {
    text: 'Scripted, not recognised',
    why: 'N128 removed the transcript preamble.',
  },
  {
    text: 'fact-only, no superlatives',
    why: 'N130 shortened the referral intro.',
  },
];

const PRESENT = [
  { text: 'Live transcription', why: 'N129. The chat panel’s switch.' },
  { text: 'Always very extra in all the right ways', why: 'N130. Nam’s own referral copy.' },
];

/* The board quotes Nam's instructions verbatim, including the copy those
   instructions asked to have removed. That is a record of a decision rather than the
   thing itself, so the chunk holding the board is exempt. Identified by content, not
   by name, because the name is a content hash and changes every build. */
const isBoardChunk = (src) => src.includes('Flagged rather than done')
  || (src.includes('raised:') && src.includes('backlog'));

const read = (name) => readFileSync(join(ROOT, name), 'utf8');

function reachable() {
  const entries = [...read('index.html').matchAll(/["'/]([\w.-]+\.js)/g)].map((m) => m[1]);
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const name = queue.pop();
    if (seen.has(name) || !existsSync(join(ROOT, name))) continue;
    seen.add(name);
    for (const m of read(name).matchAll(/["'./]((?:chunk|app)[\w-]*\.js)/g)) {
      if (!seen.has(m[1])) queue.push(m[1]);
    }
  }
  return [...seen];
}

const files = reachable();
const onDisk = readdirSync(ROOT).filter((f) => f.endsWith('.js'));
const sources = new Map(files.map((f) => [f, read(f)]));

const fails = [];

for (const { text, why } of ABSENT) {
  const hits = files.filter((f) => sources.get(f).includes(text) && !isBoardChunk(sources.get(f)));
  if (hits.length) fails.push({ kind: 'still shipping', text, why, where: hits });
}
for (const { text, why } of PRESENT) {
  const hits = files.filter((f) => sources.get(f).includes(text));
  if (!hits.length) fails.push({ kind: 'missing', text, why, where: [] });
}

if (fails.length) {
  console.error('\nship-check: %d assertion(s) failed against the built bundle\n', fails.length);
  for (const f of fails) {
    console.error('  %s: "%s"', f.kind, f.text);
    console.error('    %s', f.why);
    if (f.where.length) console.error('    in: %s', f.where.join(', '));
    console.error('');
  }
  console.error('These are checked against docs/, i.e. what a visitor loads, not against src/.');
  console.error('If the rule genuinely no longer applies, change the list and say why in the commit.\n');
  process.exit(1);
}

console.log(
  'ship     %d assertion(s) hold across %d reachable file(s) (%d stale chunk(s) ignored)',
  ABSENT.length + PRESENT.length,
  files.length,
  onDisk.length - files.length,
);
