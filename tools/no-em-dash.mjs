// Is there an em dash anywhere a visitor can read one?
//
// Nam: "everything in the script would be user facing, and we dont want any em
// dashes there, remove all of them" and then "control the whole site to make sure
// we dont have em dashes thks!"
//
// A comment cannot hold that rule in place, and neither can a careful pass: the
// character is easy to type, easy to paste in from a document, and invisible in a
// diff unless you are looking for it. So it is a gate.
//
// WHAT IT CHECKS, and why the distinction matters: em dashes are fine in source
// COMMENTS and banned in STRING LITERALS. Comments are for whoever is reading the
// code; every string in this build is a candidate for the screen. That means the
// checker has to actually tokenise, because the cheap version -- strip anything
// after `//` -- eats half of every URL and then reports nothing.
//
// The walker below tracks four states: code, a quoted string, a template literal,
// and a comment. It is not a TypeScript parser and does not need to be; it needs
// to know whether a given character sits inside quotes, and for that the only
// hard cases are escapes and the fact that `//` inside a string is not a comment.
//
// Template literals nest: `${`a`}` is legal and so is a comment inside the
// expression part. Rather than track the brace depth, anything inside a template
// is treated as string content, which is the safe direction -- it can report a
// dash in a comment written inside an interpolation, and there are none.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * THE RULE, and the exception it needs.
 *
 * The em dash is banned outright: it is the character Nam is objecting to and it
 * never has a job a colon, a full stop or a comma cannot do better.
 *
 * The en dash is banned in PROSE and kept in RANGES. "2019–present", "4–5 Dan",
 * "75–90%" and ".15s–.25s" are correct typography and are not the tic -- a hyphen
 * there would be wrong and "2019 to present" would be worse.
 *
 * The signature that separates them is whitespace, not the characters either
 * side: a range is always tight and a parenthetical dash always has spaces. So
 * the test is exactly that, which is why ".15s–.25s" passes on a full stop and
 * " – " does not.
 */
const EM = /—/;
const EN_LOOSE = /(^|\s)–|–(\s|$)/u;
const offends = (text) => EM.test(text) || EN_LOOSE.test(text);

const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

/**
 * Every string literal in a source file, with the line it started on.
 *
 * Returns the CONTENT, not the quotes, so a report can print the string as the
 * reader would see it.
 */
function strings(src) {
  const out = [];
  let i = 0;
  let line = 1;
  const n = src.length;

  while (i < n) {
    const c = src[i];

    // -- comments: skipped whole, and they are allowed to contain anything -----
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line += 1;
        i += 1;
      }
      i += 2;
      continue;
    }

    // -- strings --------------------------------------------------------------
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      const startLine = line;
      let text = '';
      i += 1;
      while (i < n) {
        const d = src[i];
        if (d === '\\') { text += src[i + 1] ?? ''; i += 2; continue; }
        if (d === quote) { i += 1; break; }
        if (d === '\n') {
          line += 1;
          // An unterminated quote means this was not a string after all (an
          // apostrophe in a comment the walker mis-entered, say). Bail rather
          // than swallowing the rest of the file.
          if (quote !== '`') break;
        }
        text += d;
        i += 1;
      }
      out.push({ line: startLine, text });
      continue;
    }

    if (c === '\n') line += 1;
    i += 1;
  }
  return out;
}

const files = walk('src').filter((f) => /\.(ts|html)$/.test(f));
const hits = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (file.endsWith('.html')) {
    // No tokenising to do: an HTML file is text, and its comments are <!-- -->.
    const body = src.replace(/<!--[\s\S]*?-->/g, '');
    body.split('\n').forEach((l, k) => {
      if (offends(l)) hits.push({ file, line: k + 1, text: l.trim() });
    });
    continue;
  }
  for (const s of strings(src)) {
    if (offends(s.text)) hits.push({ file, line: s.line, text: s.text });
  }
}

// The stylesheet has content: strings and, more to the point, is read by nobody
// as prose -- but a `content: "—"` would render. Checked the cheap way, since CSS
// has no line comments to confuse.
const css = readFileSync('src/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
css.split('\n').forEach((l, k) => {
  if (offends(l)) hits.push({ file: 'src/styles.css', line: k + 1, text: l.trim() });
});

if (hits.length) {
  console.error(`\nno-em-dash: ${hits.length} em dash(es) in strings a visitor can read\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}`);
    console.error(`      ${h.text.slice(0, 110)}`);
  }
  console.error('\nEm dashes are fine in comments and banned in strings. Replace each with what');
  console.error('the dash was doing: a colon before a list, a full stop between two whole');
  console.error('thoughts, a comma for a breath.\n');
  process.exit(1);
}

console.log(`dashes   no em dashes in any string (${files.length} files + the stylesheet)`);
