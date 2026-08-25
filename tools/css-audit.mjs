/**
 * Static audit of styles.css, to tell real redundancy from apparent redundancy.
 *
 * 128 selectors are declared more than once, but a repeat is not automatically
 * waste — the later block usually adds properties the earlier one never set, and
 * merging those blindly would reorder the cascade. What IS waste is a
 * declaration whose property is set again later by an equally-or-more specific
 * selector in the same context: that first value can never win, so it is dead
 * weight that only serves to mislead the next reader. The #ffc83d ghost was
 * exactly this shape.
 *
 * So this reports three things:
 *   1. shadowed declarations — same context, same selector, same property, set
 *      again later. Provably unreachable.
 *   2. selector blocks that are entirely shadowed. Deletable wholesale.
 *   3. repeat groups, with how many of each block's declarations survive, so a
 *      merge can be judged rather than guessed.
 *
 * It deliberately does NOT try to reason across different selectors. Specificity
 * plus source order plus the DOM decides those, and getting it wrong statically
 * is how a refactor breaks something. Cross-selector deadness is left to the
 * runtime check in css-snapshot.js.
 */
import { readFileSync } from 'node:fs';

const raw = readFileSync('src/styles.css', 'utf8').replace(/\r\n/g, '\n');

/** Strip comments but keep byte offsets aligned so line numbers stay true. */
const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const lineOf = (idx) => src.slice(0, idx).split('\n').length;

/** Walk to a flat list of {ctx, sel, body, start} in source order. */
const rules = [];
const walk = (text, base, ctx) => {
  let d = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') { if (d === 0) start = i; d++; continue; }
    if (c === '}') {
      d--;
      if (d === 0) {
        const head = text.slice(text.lastIndexOf('}', start - 1) + 1, start);
        const sel = head.replace(/^[\s;]+/, '').trim();
        const body = text.slice(start + 1, i);
        if (sel.startsWith('@')) {
          if (/^@(media|supports|layer|container)/.test(sel)) walk(body, base + start + 1, ctx + ' ' + sel.replace(/\s+/g, ' '));
          // @keyframes and @font-face are not cascade participants — leave them.
        } else if (sel) {
          rules.push({ ctx, sel: sel.replace(/\s+/g, ' '), body, start: base + start });
        }
      }
      continue;
    }
  }
};
walk(src, 0, '');

const props = (body) => {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(':');
    if (i < 0) return null;
    return { prop: d.slice(0, i).trim().toLowerCase(), val: d.slice(i + 1).trim(), text: d };
  }).filter(Boolean);
};

/* --- 1 & 2: shadowed declarations within an identical context+selector ---- */
const byKey = new Map();
for (const r of rules) {
  const k = r.ctx + '||' + r.sel;
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(r);
}

let shadowedDecls = 0, deadBlocks = [];
const repeats = [];
for (const [k, group] of byKey) {
  if (group.length < 2) continue;
  const parsed = group.map((r) => ({ r, p: props(r.body) }));
  // A declaration is shadowed if the same property, not marked !important,
  // appears again in a LATER block of the same key (and that later one is not
  // itself weaker).
  const survives = parsed.map(() => 0);
  parsed.forEach((entry, i) => {
    for (const d of entry.p) {
      const bang = /!important/.test(d.val);
      const laterSame = parsed.slice(i + 1).some((later) =>
        later.p.some((d2) => d2.prop === d.prop && (!bang || /!important/.test(d2.val))));
      if (laterSame) shadowedDecls++;
      else survives[i]++;
    }
  });
  parsed.forEach((entry, i) => {
    if (entry.p.length > 0 && survives[i] === 0) {
      deadBlocks.push({ sel: k.replace('||', ' ').trim(), line: lineOf(entry.r.start), decls: entry.p.length });
    }
  });
  repeats.push({
    sel: k.replace('||', ' ').trim(),
    blocks: parsed.map((e, i) => ({ line: lineOf(e.r.start), decls: e.p.length, live: survives[i] })),
  });
}

/* --- 3: every class the stylesheet mentions, for the runtime dead check --- */
const classes = new Set();
for (const r of rules) for (const m of r.sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classes.add(m[1]);

console.log('rules:', rules.length, ' distinct ctx+selector:', byKey.size);
console.log('repeat groups:', repeats.length);
console.log('provably shadowed declarations:', shadowedDecls);
console.log('blocks with ZERO surviving declarations:', deadBlocks.length);
console.log('');
console.log('--- fully dead blocks (safe to delete) ---');
deadBlocks.sort((a, b) => a.line - b.line).forEach((b) => console.log(`  L${b.line}  ${b.decls} decl  ${b.sel.slice(0, 78)}`));
console.log('');
console.log('--- worst repeat groups (line: decls/live) ---');
repeats
  .map((g) => ({ ...g, waste: g.blocks.reduce((a, b) => a + (b.decls - b.live), 0) }))
  .sort((a, b) => b.waste - a.waste).slice(0, 18)
  .forEach((g) => console.log(`  waste ${g.waste}  ${g.sel.slice(0, 52)}  [${g.blocks.map((b) => b.line + ':' + b.decls + '/' + b.live).join(' ')}]`));
console.log('');
console.log('classes referenced by the stylesheet:', classes.size);
process.stdout.write('CLASSLIST=' + [...classes].sort().join(',') + '\n');
