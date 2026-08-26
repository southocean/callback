// Is the stylesheet still well formed?
//
// This exists because of a real escape. A dead-code prune on another machine
// deleted three SELECTOR lines and left their declaration bodies behind:
//
//     .finding { ... }
//       background-color: var(--dark-surface); border-radius: 8px;
//       color: var(--on-dark3); font: 500 11px/1 var(--font);
//     }
//
// The browser discards an orphaned block like that and carries on, so nothing
// looked broken until three unrelated rules further down stopped applying. And
// `deadcss` could not see it: with the selector line gone, `.finding-role` no
// longer appears in the stylesheet at all, so there is no name left to report as
// unused. A checker that only looks at class NAMES is blind to a rule that has
// stopped being a rule.
//
// Two checks, both structural rather than stylistic:
//
//   1. braces balance, and never close below depth zero
//   2. no declaration sits at depth zero — that is the orphan above
//
// Comments are blanked (not removed) first so reported line numbers still match
// the file, and so a `{` inside a comment cannot fail the build.

import { readFileSync } from 'node:fs';

const src = readFileSync('src/styles.css', 'utf8');

// Blank comments in place: same length, same newlines, no content.
const code = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const problems = [];

/* --- 1. braces ---------------------------------------------------------- */
let depth = 0;
let line = 1;
for (const ch of code) {
  if (ch === '\n') { line += 1; continue; }
  if (ch === '{') depth += 1;
  else if (ch === '}') {
    depth -= 1;
    if (depth < 0) {
      problems.push([line, 'a } with no matching { — the rule above it lost its selector']);
      depth = 0;
    }
  }
}
if (depth > 0) problems.push([line, `${depth} unclosed { at end of file`]);

/* --- 2. declarations at the top level ----------------------------------- */
// At depth 0 the only legal things are selectors, at-rules and whitespace. A
// line ending in a semicolon out here is a declaration that has lost its home.
depth = 0;
const lines = code.split('\n');
lines.forEach((raw, i) => {
  const before = depth;
  for (const ch of raw) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth = Math.max(0, depth - 1);
  }
  const t = raw.trim();
  if (!t || before > 0) return;
  // Skip at-rules, which legitimately end in a semicolon at depth 0.
  if (t.startsWith('@')) return;
  // A declaration is `prop: value;` with no braces on the line at all.
  if (/^[-a-zA-Z]+\s*:\s*[^{}]*;$/.test(t)) {
    problems.push([i + 1, `declaration outside any rule: ${t.slice(0, 48)}`]);
  }
});

if (problems.length) {
  console.error(`\ncss-structure: ${problems.length} problem(s) in src/styles.css\n`);
  for (const [ln, msg] of problems) console.error(`  L${ln}  ${msg}`);
  console.error('\nA browser silently discards a malformed rule and keeps going, which is\nwhy this is a build gate and not something you would notice.\n');
  process.exit(1);
}

const rules = (code.match(/{/g) ?? []).length;
console.log(`css      well formed — ${rules} blocks, braces balanced, no orphaned declarations`);
