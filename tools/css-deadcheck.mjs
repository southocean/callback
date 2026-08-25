/**
 * Fail the build if the stylesheet styles a class nothing in the source uses.
 *
 * WHAT IT CATCHES, stated precisely, because I first wrote this comment claiming
 * more than the check delivers.
 *
 * It catches ORPHANED NAMES: a class the stylesheet styles whose name appears
 * nowhere in src, so nothing can ever apply it. Rebuilding the achievement toast
 * left .quest-row, .quest-name, .quest-sub, .quest-x and .quest-bar in exactly
 * that state, and the build would not have said a word.
 *
 * It does NOT catch the bug that started all this. `.wx-bar-ico` and
 * `.dk-task.is-on` painted #ffc83d for weeks — but both class names are still
 * live and still applied; what was stale was the VALUE, left behind by a
 * superseded draft that no later rule happened to override. I tested that
 * directly by re-adding both rules: this check stays green, and only the orphaned
 * .quest-row trips it.
 *
 * Nothing mechanical finds a stale-but-reachable value. What actually helps is
 * not letting superseded sections accumulate in the first place — which is what
 * css-prune.mjs and this check do between them, and why the ghost was hiding in
 * 96 lines of dead first-draft rules rather than out in the open.
 *
 * It is deliberately the WEAKEST useful claim: a class whose name appears nowhere
 * in src cannot be applied to anything, so its rules cannot render. That is
 * decidable from the text alone. It says nothing about whether a class that IS
 * mentioned is reachable — proving that needs the runtime fingerprint in
 * css-snapshot.js, and reachability is not the same as deadness anyway: mobile
 * breakpoints and the calendar popover are both real and both unreached by a
 * desktop-sized harness. Of 278 classes the harness never rendered, only 27 were
 * genuinely dead, and mistaking the other 251 for waste would have broken the
 * site.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Classes assembled at runtime, so the whole name never appears as a literal.
 * Each entry needs the expression that builds it, so the next person can tell a
 * real exemption from a stale one.
 *
 *   wx-rz-*   share.ts: `'wx-rz wx-rz-' + dir` over the eight resize handles
 */
const DYNAMIC = [/^wx-rz-(n|s|e|w|ne|nw|se|sw)$/];

const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

const sourceFiles = walk('src').filter((f) => /\.(ts|html)$/.test(f) && !f.endsWith('styles.css'));
const source = sourceFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

const css = readFileSync('src/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const styled = new Set();
for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) styled.add(m[1]);

const orphans = [...styled]
  .filter((c) => !source.includes(c))
  .filter((c) => !DYNAMIC.some((re) => re.test(c)))
  .sort();

if (orphans.length) {
  console.error(`\ncss-deadcheck: ${orphans.length} class(es) styled but never used in src/\n`);
  for (const c of orphans) {
    const lines = css.split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => new RegExp('\\.' + c.replace(/[-]/g, '\\-') + '(?![\\w-])').test(l))
      .slice(0, 3);
    console.error(`  .${c}`);
    for (const [n, l] of lines) console.error(`      L${n}  ${l.trim().slice(0, 82)}`);
  }
  console.error('\nEither the markup that used these is gone — delete the rules — or the name is');
  console.error('built at runtime, in which case add it to DYNAMIC in this file with the');
  console.error('expression that builds it.\n');
  process.exit(1);
}

console.log(`css      ${styled.size} classes styled, all referenced in src/ (${sourceFiles.length} files)`);
