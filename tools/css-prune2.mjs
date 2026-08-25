/**
 * Stage two: the two kinds of dead CSS that stage one deliberately left alone.
 *
 *   A. ORPHANED SELECTORS — rules whose selector names a class no state ever
 *      renders AND that no .ts file mentions. Stage one could not see these: it
 *      only deletes values that are overridden, not rules that never match. They
 *      come from markup being rewritten while its styles stay behind, which
 *      happened three times in this project — the achievement toast (quest-row,
 *      quest-name, quest-sub, quest-x, quest-bar), the first desktop draft
 *      (dk-win, dk-tree, dk-files and friends) and the share banner.
 *
 *      The candidate list comes from the runtime fingerprint, not from parsing:
 *      css-snapshot.js records every class that appears in any of 26 states, and
 *      the difference against the classes the stylesheet styles is the suspect
 *      set. That set is then filtered against src/**.ts, because a class can be
 *      real and simply never reached by the harness — 277 of the 305 suspects
 *      were exactly that, and deleting them would have broken mobile layouts,
 *      the calendar popover and the built page.
 *
 *      A selector LIST is pruned part by part: `.live, .orphan { … }` keeps the
 *      live half. Only when every part is dead does the rule go.
 *
 *   B. SHADOWED DECLARATIONS inside blocks that still have live ones. Same
 *      argument as stage one — identical selector, identical context, same
 *      property set again later, so source order alone decides — but here the
 *      block survives and only the unreachable lines are cut.
 *
 * Shorthands stay conservative: `padding` shadows `padding`, never `padding-top`.
 *
 *   node tools/css-prune2.mjs <orphans.txt>          report
 *   node tools/css-prune2.mjs <orphans.txt> --write  apply
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/styles.css';
const orphanFile = process.argv[2];
const WRITE = process.argv.includes('--write');
if (!orphanFile) { console.error('need an orphan list file'); process.exit(1); }

const ORPHANS = new Set(readFileSync(orphanFile, 'utf8').trim().split(/\s+/).filter(Boolean));
const raw = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const lineOf = (i) => src.slice(0, i).split('\n').length;

/* --- parse to a flat, offset-carrying rule list --------------------------- */
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
      const trimmed = head.replace(/^[\s;]+/, '');
      const sel = trimmed.trim();
      const body = text.slice(open + 1, i);
      if (sel.startsWith('@')) {
        if (/^@(media|supports|layer|container)/.test(sel)) walk(body, base + open + 1, ctx + ' ' + sel.replace(/\s+/g, ' '));
      } else if (sel) {
        rules.push({
          ctx, sel: sel.replace(/\s+/g, ' '), body,
          selFrom: base + prevEnd + 1 + (head.length - trimmed.length),
          bodyFrom: base + open + 1, bodyTo: base + i,
          to: base + i + 1,
        });
      }
    }
  }
};
walk(src, 0, '');

/* --- A: orphaned selector parts ------------------------------------------ */
const partIsDead = (part) => {
  for (const m of part.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) if (ORPHANS.has(m[1])) return true;
  return false;
};
const edits = [];   // {from, to, text, why}
let killedRules = 0, killedParts = 0;
for (const r of rules) {
  const parts = r.sel.split(',').map((p) => p.trim()).filter(Boolean);
  const live = parts.filter((p) => !partIsDead(p));
  if (live.length === parts.length) continue;
  if (live.length === 0) {
    killedRules++;
    edits.push({ from: r.selFrom, to: r.to, text: '', why: 'rule ' + r.sel.slice(0, 60) });
  } else {
    killedParts += parts.length - live.length;
    edits.push({ from: r.selFrom, to: r.bodyFrom - 1, text: live.join(',\n') + ' ', why: 'parts of ' + r.sel.slice(0, 60) });
  }
}

/* --- B: shadowed declarations inside surviving blocks -------------------- */
const declsOf = (body, base) => {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i <= body.length; i++) {
    const ch = body[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (i === body.length || (ch === ';' && depth === 0)) {
      const text = body.slice(start, i);
      if (text.trim()) {
        const ci = text.indexOf(':');
        if (ci > -1) {
          out.push({
            prop: text.slice(0, ci).trim().toLowerCase(),
            bang: /!important/.test(text.slice(ci + 1)),
            from: base + start, to: base + Math.min(i + 1, body.length),
          });
        }
      }
      start = i + 1;
    }
  }
  return out;
};

const dyingRules = new Set(edits.filter((e) => e.text === '').map((e) => e.why));
const groups = new Map();
for (const r of rules) {
  const k = r.ctx + '||' + r.sel;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
let killedDecls = 0;
for (const [, group] of groups) {
  if (group.length < 2) continue;
  const parsed = group.map((r) => ({ r, d: declsOf(r.body, r.bodyFrom) }));
  parsed.forEach((e, i) => {
    if (dyingRules.has('rule ' + e.r.sel.slice(0, 60))) return;
    const later = parsed.slice(i + 1);
    const survivors = e.d.filter((d) =>
      !later.some((l) => l.d.some((d2) => d2.prop === d.prop && (!d.bang || d2.bang))));
    if (survivors.length === e.d.length) return;          // nothing shadowed
    if (survivors.length === 0) return;                    // stage one's job
    for (const d of e.d) {
      if (survivors.includes(d)) continue;
      killedDecls++;
      edits.push({ from: d.from, to: d.to, text: '', why: 'decl ' + d.prop + ' in ' + e.r.sel.slice(0, 40) });
    }
  });
}

console.log('orphan classes given:', ORPHANS.size);
console.log('rules deleted outright:', killedRules);
console.log('selector parts dropped:', killedParts);
console.log('shadowed declarations removed:', killedDecls);
if (!WRITE) {
  console.log('\nsample:');
  edits.slice(0, 30).forEach((e) => console.log('  L' + lineOf(e.from) + '  ' + e.why));
  console.log('\n(report only — pass --write to apply)');
  process.exit(0);
}

/* Apply from the end so offsets stay valid, then tidy. */
let out = raw;
for (const e of [...edits].sort((a, b) => b.from - a.from)) {
  out = out.slice(0, e.from) + e.text + out.slice(e.to);
}
out = out
  .replace(/@(?:media|supports|layer|container)[^{]*\{\s*\}\n?/g, '')
  .replace(/[^\S\n]+\n/g, '\n')
  .replace(/\{\s*\n\s*\}/g, '{ }')
  .replace(/^[^\S\n]*\{ \}\n/gm, '')
  .replace(/\n{3,}/g, '\n\n');
writeFileSync(FILE, out);
console.log('\nlines', raw.split('\n').length, '->', out.split('\n').length);
