// The script editor — board ticket N26.
//
// Nam: "a page to show all the current scripts, how they branch out and/or
// converge, the split points where its safe to jump to a different talking
// point. This would be incredibly helpful in tweaking and redesigning the
// caption script if needed."
//
// It is a READER, not an editor of files: it shows the shape of what is in
// data/tour.ts so a change can be reasoned about before it is made. Calling it
// an editor and having it write TypeScript would be a worse version of opening
// the file.
//
// What it has to make visible, because these are the things that are invisible
// in the source:
//
//   · the ORDER, which is priority and not array position;
//   · the three REGISTERS per part, side by side, so a brief version that has
//     drifted from its full one is obvious;
//   · the BEATS, and which line each one fires on;
//   · the JUMP POINTS — every part the director can reach out of turn, which is
//     every part with a trigger;
//   · the CONVERGENCE, which is that all paths return to the same queue.

import { h } from '../dom.js';
import { parts, asides, type Part } from '../data/tour.js';
import { QUEUE_BRIEF, QUEUE_HANDOVER } from '../tour/director.js';

const ordered = (): Part[] => [...parts].sort((a, b) => a.priority - b.priority);

const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

const partRuntime = (p: Part, key: 'lines' | 'commentary' | 'brief'): number =>
  p[key].reduce((a, l) => a + l.ms, 0);

export function renderScriptEditor(): HTMLElement {
  const list = ordered();
  const total = list.reduce((a, p) => a + partRuntime(p, 'lines'), 0);
  const jumpable = list.filter((p) => (p.triggers?.length ?? 0) > 0);

  const register = (p: Part, key: 'lines' | 'commentary' | 'brief', label: string): HTMLElement =>
    h('div', { class: `sc-reg sc-${key}` },
      h('div', { class: 'sc-reg-h' },
        h('b', {}, label),
        h('span', {}, `${p[key].length} line${p[key].length === 1 ? '' : 's'} · ${secs(partRuntime(p, key))}`)),
      h('ol', { class: 'sc-lines' },
        ...p[key].map((l, i) => {
          const beat = key === 'lines' ? p.beats?.find((b) => b.at === i) : undefined;
          return h('li', {},
            h('span', {}, l.text),
            beat
              ? h('span', { class: 'sc-beat' },
                beat.click ? 'cursor + click' : 'cursor',
                h('code', {}, beat.move ?? '—'))
              : h('span', {}));
        })));

  return h('div', { class: 'dp-col dp-col-wide' },
    h('p', { class: 'dp-lead' },
      `The guided tour's script: ${list.length} parts, ${secs(total)} if it runs start to finish uninterrupted. `
      + 'Order is priority, not the order they appear in the file. Every part carries three registers — the tour '
      + 'picks a tone rather than a length, which is what stops an interrupted run reading as a truncated one.'),

    /* --- how it branches ------------------------------------------------ */
    h('h2', { class: 'dp-head2' }, 'How it branches'),
    h('div', { class: 'sc-flow' },
      h('div', { class: 'sc-flow-b' }, h('b', {}, 'playing'), h('span', {}, 'Works down the priority order, in the full register.')),
      h('div', { class: 'sc-flow-arrow', 'aria-hidden': 'true' }, '↓ a visitor clicks'),
      h('div', { class: 'sc-flow-b' }, h('b', {}, 'commenting'), h('span', {}, `Speaks that part's commentary. Queue of 1–${QUEUE_BRIEF - 1}.`)),
      h('div', { class: 'sc-flow-arrow', 'aria-hidden': 'true' }, '↓ queue reaches ' + QUEUE_BRIEF),
      h('div', { class: 'sc-flow-b' }, h('b', {}, 'brief'), h('span', {}, 'Shortest register, announced once.')),
      h('div', { class: 'sc-flow-arrow', 'aria-hidden': 'true' }, '↓ queue reaches ' + QUEUE_HANDOVER),
      h('div', { class: 'sc-flow-b is-end' }, h('b', {}, 'handed over'), h('span', {}, 'Says one line and stops. Terminal — it does not come back.'))),
    h('p', { class: 'dp-note' },
      'Every path converges on the same queue: after any commentary the director returns to the lowest-priority '
      + 'part that has not been covered, whether the tour reached it or the visitor did. That single rule is what '
      + 'makes a part visited out of turn get skipped later rather than replayed.'),

    /* --- where it is safe to jump --------------------------------------- */
    h('h2', { class: 'dp-head2' }, 'Safe jump points'),
    h('p', { class: 'dp-note' },
      `${jumpable.length} of ${list.length} parts can be entered out of turn. A part is jumpable when it has a `
      + 'trigger — a selector the visitor can click — and marked clean when it opens without assuming the part '
      + 'before it was heard.'),
    h('div', { class: 'sc-jumps' },
      ...list.map((p) => h('div', { class: `sc-jump is-${p.entry}${(p.triggers?.length ?? 0) ? '' : ' is-locked'}` },
        h('b', {}, `${p.priority}. ${p.label}`),
        h('span', { class: 'sc-jump-s' },
          (p.triggers?.length ?? 0) ? `${p.entry} entry` : 'script only'),
        ...(p.triggers ?? []).map((t) => h('code', {}, t)),
        p.needs ? h('span', { class: 'sc-needs' }, `needs: ${p.needs}`) : h('span', {})))),

    /* --- the parts ------------------------------------------------------ */
    h('h2', { class: 'dp-head2' }, 'The parts'),
    ...list.map((p) => h('div', { class: 'sc-part' },
      h('div', { class: 'sc-part-h' },
        h('span', { class: 'sc-pri' }, String(p.priority)),
        h('b', {}, p.label),
        h('code', {}, p.id),
        p.needs ? h('span', { class: 'sc-needs' }, `needs ${p.needs}`) : h('span', {})),
      h('div', { class: 'sc-regs' },
        register(p, 'lines', 'Full'),
        register(p, 'commentary', 'Commentary'),
        register(p, 'brief', 'Brief')))),

    /* --- the asides ----------------------------------------------------- */
    h('h2', { class: 'dp-head2' }, 'Asides'),
    h('p', { class: 'dp-note' }, 'Said by the director rather than by a part, at the moments the register changes.'),
    h('div', { class: 'sc-asides' },
      ...Object.entries(asides).map(([k, l]) => h('div', { class: 'sc-aside' },
        h('b', {}, k), h('span', {}, l.text), h('span', { class: 'sc-ms' }, secs(l.ms))))),
  );
}
