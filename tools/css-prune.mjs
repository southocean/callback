/**
 * Delete the rule blocks that provably cannot render anything.
 *
 * A block qualifies only when EVERY declaration in it is set again later by the
 * byte-identical selector inside the byte-identical at-rule context. Identical
 * selector means identical specificity and identical matching, so source order
 * alone decides the winner and the earlier value is unreachable. That is the
 * whole argument — no specificity arithmetic, no guessing about the DOM.
 *
 * Deliberately NOT attempted: anything involving two different selectors.
 * Whether `.a .b` beats `.b.c` depends on specificity, source order and what the
 * DOM actually contains, and a static tool that thinks it knows is how a
 * refactor breaks a page. The runtime fingerprint in css-snapshot.js is what
 * covers that ground.
 *
 * Shorthands are treated conservatively: `padding` shadows `padding` but is not
 * assumed to shadow `padding-top`, so a longhand set earlier always survives.
 * That leaves a little waste behind and cannot delete anything live.
 *
 * Comments are left alone. Several of these one-line rules sit under a heading
 * that documents a whole group, and losing that to tidy a rule would be a bad
 * trade — a stale rule misleads, but so does a missing explanation.
 *
 *   node tools/css-prune.mjs          report only
 *   node tools/css-prune.mjs --write  apply
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/styles.css';
const WRITE = process.argv.includes('--write');
const raw = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
/* Comments blanked to spaces, so every offset below is also valid in `raw`. */
const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const rules = [];
const walk = (text, base, ctx) => {
  let d = 0, open = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') { if (d === 0) open = i; d++; continue; }
    if (c === '}') {
      d--;
      if (d !== 0) continue;
      const prevEnd = Math.max(text.lastIndexOf('}', open - 1), text.lastIndexOf('{', open - 1));
      const head = text.slice(prevEnd + 1, open);
      const sel = head.replace(/^[\s;]+/, '').trim();
      const body = text.slice(open + 1, i);
      if (sel.startsWith('@')) {
        if (/^@(media|supports|layer|container)/.test(sel)) {
          walk(body, base + open + 1, ctx + ' ' + sel.replace(/\s+/g, ' '));
        }
      } else if (sel) {
        rules.push({
          ctx, sel: sel.replace(/\s+/g, ' '), body,
          from: base + prevEnd + 1 + (head.length - head.replace(/^[\s;]+/, '').length),
          to: base + i + 1,
        });
      }
    }
  }
};
walk(src, 0, '');

const declsOf = (body) => {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean).map((s) => {
    const i = s.indexOf(':');
    if (i < 0) return null;
    return { prop: s.slice(0, i).trim().toLowerCase(), bang: /!important/.test(s.slice(i + 1)) };
  }).filter(Boolean);
};

const groups = new Map();
for (const r of rules) {
  const k = r.ctx + '||' + r.sel;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

const doomed = [];
for (const [k, group] of groups) {
  if (group.length < 2) continue;
  const parsed = group.map((r) => ({ r, d: declsOf(r.body) }));
  parsed.forEach((e, i) => {
    if (e.d.length === 0) return;
    const allShadowed = e.d.every((d) =>
      parsed.slice(i + 1).some((later) =>
        later.d.some((d2) => d2.prop === d.prop && (!d.bang || d2.bang))));
    if (allShadowed) doomed.push({ ...e.r, decls: e.d.length, key: k });
  });
}

const lineOf = (i) => src.slice(0, i).split('\n').length;
doomed.sort((a, b) => a.from - b.from);
console.log('rule blocks:', rules.length);
console.log('fully shadowed blocks:', doomed.length,
  '(' + doomed.reduce((a, b) => a + b.decls, 0) + ' declarations)');
for (const d of doomed) console.log(`  L${lineOf(d.from)}  ${d.decls}  ${d.key.replace('||', ' ').trim().slice(0, 76)}`);

if (!WRITE) { console.log('\n(report only — pass --write to apply)'); process.exit(0); }

/* Cut from the end so earlier offsets stay valid. */
let out = raw;
for (const d of [...doomed].sort((a, b) => b.from - a.from)) {
  const before = out.slice(0, d.from);
  const after = out.slice(d.to);
  // Swallow the rule's own trailing newline, and any whitespace-only remainder
  // of the line it started on, so no blank ruts are left behind.
  out = before.replace(/[ \t]*$/, '') + after.replace(/^[ \t]*\n/, '');
}
/* Any at-rule left with nothing in it goes too. */
let n = 0;
for (let pass = 0; pass < 4; pass++) {
  const next = out.replace(/@(?:media|supports|layer|container)[^{]*\{\s*\}\n?/g, () => { n++; return ''; });
  if (next === out) break;
  out = next;
}
/* Never more than one blank line in a row. */
out = out.replace(/\n{3,}/g, '\n\n');
writeFileSync(FILE, out);
console.log(`\nwrote ${FILE}: removed ${doomed.length} blocks, ${n} emptied at-rules`);
console.log('lines', raw.split('\n').length, '->', out.split('\n').length);
