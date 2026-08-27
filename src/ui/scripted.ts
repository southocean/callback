// The script editor — board tickets N26 and N43.
//
// Nam: "a page to show all the current scripts, how they branch out and/or
// converge, the split points where its safe to jump to a different talking
// point. This would be incredibly helpful in tweaking and redesigning the
// caption script if needed." And then, on the rewrite: "I want to see the
// separation between the primary flow, vs what we do only as commentary."
//
// It is a READER, not an editor of files: it shows the shape of what is in
// data/tour.ts so a change can be reasoned about before it is made. Calling it
// an editor and having it write TypeScript would be a worse version of opening
// the file.
//
// What it has to make visible, because these are the things that are invisible
// in the source:
//
//   · THE SEPARATION. Two lists. The flow is what a visitor who does nothing
//     will watch, and it has a running time. The commentary is what the tour
//     says back, and it has no running time at all because it never runs — it
//     answers. Mixing them in one list made the first number meaningless.
//   · the ORDER, which is priority and not array position;
//   · the three REGISTERS per flow part, side by side, so a brief version that
//     has drifted from its full one is obvious;
//   · the BEATS, and which line each one fires on — including the ones that are
//     not selectors, because a cue that performs a four-press share sequence is
//     the most consequential thing in the script and was previously invisible;
//   · the JUMP POINTS — every part the director can reach out of turn;
//   · the CONVERGENCE, which is that all paths return to the same queue;
//   · the ACKNOWLEDGEMENT POOL by tier, so an escalation that has no lines left
//     at the top can be seen rather than discovered;
//   · the QUESTIONS the personal segment answers, beside the answers, because a
//     drifting answer is only visible next to the question it was written for.

import { h } from '../dom.js';
import {
  parts, quips, acks, story, asides, outro, timeline, runtimeMs, OUTRO_CAP_MS,
  type Part, type Quip, type Beat,
} from '../data/tour.js';
import { QUEUE_BRIEF, QUEUE_HANDOVER } from '../tour/director.js';
import { BAIL_MS, IDLE_MS } from '../tour/profile.js';

const ordered = (): Part[] => [...parts].sort((a, b) => a.priority - b.priority);

const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

const partRuntime = (p: Part, key: 'lines' | 'commentary' | 'brief'): number =>
  p[key].reduce((a, l) => a + l.ms, 0);

/** mm:ss, for the running clock down the left of the timeline. */
const clock = (sec: number): string =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** What a beat does, in words, since half of them are no longer selectors. */
const beatLabel = (b: Beat): { what: string; detail: string } => {
  if (b.cue === 'share') return { what: 'performs the share', detail: 'picker → Entire Screen → Screen 1 → Share → launch Chrome → maximise' };
  if (b.cue === 'eggs') return { what: 'plays the unseen clips', detail: 'whatever this visitor has not found' };
  if (b.cue === 'park') return { what: 'the hand leaves', detail: 'off the right edge' };
  if (b.cue === 'maximise') return { what: 'maximises', detail: 'the browser window' };
  if (b.cue?.startsWith('tab:')) return { what: 'opens a tab', detail: b.cue.slice(4) };
  if (b.roll) return { what: 'scrolls', detail: `${b.roll.of} → ${typeof b.roll.to === 'number' ? `${Math.round(b.roll.to * 100)}%` : b.roll.to}` };
  if (b.move) return { what: b.click ? 'moves and presses' : 'moves', detail: b.move };
  if (b.hold) return { what: 'waits', detail: `${b.hold}ms` };
  return { what: '—', detail: '' };
};

export function renderScriptEditor(): HTMLElement {
  const flow = ordered();
  const total = flow.reduce((a, p) => a + partRuntime(p, 'lines'), 0);
  const jumpable = flow.filter((p) => (p.triggers?.length ?? 0) > 0);
  const storyMs = story.reduce((a, c) => a + c.lines.reduce((b, l) => b + l.ms, 0), 0);

  const register = (p: Part, key: 'lines' | 'commentary' | 'brief', label: string): HTMLElement =>
    h('div', { class: `sc-reg sc-${key}` },
      h('div', { class: 'sc-reg-h' },
        h('b', {}, label),
        h('span', {}, `${p[key].length} line${p[key].length === 1 ? '' : 's'} · ${secs(partRuntime(p, key))}`)),
      h('ol', { class: 'sc-lines' },
        ...p[key].map((l, i) => {
          const bs = key === 'lines' ? (p.beats ?? []).filter((b) => b.at === i) : [];
          return h('li', {},
            h('span', {}, l.text),
            ...bs.map((b) => {
              const { what, detail } = beatLabel(b);
              return h('span', { class: 'sc-beat' }, what, detail ? h('code', {}, detail) : h('span', {}));
            }),
            bs.length ? h('span', {}) : h('span', {}));
        })));

  const byGroup = (g: Quip['group']): Quip[] => quips.filter((q) => q.group === g);
  const GROUPS: { key: Quip['group']; label: string; why: string }[] = [
    { key: 'desktop', label: 'The shared desktop', why: 'Nothing introduces it. It answers back when you touch it.' },
    { key: 'browser', label: 'The emulated browser', why: 'Only the tabs the flow does not already open.' },
    { key: 'panel', label: 'The call’s drawers', why: 'Accessibility and the tests live here and nowhere in the flow.' },
    { key: 'call', label: 'The call controls', why: 'One line each, for the controls that surprise people.' },
  ];

  return h('div', { class: 'dp-col dp-col-wide' },
    h('p', { class: 'dp-lead' },
      `One script, in two registers. The FLOW is ${flow.length} parts and ${secs(total)} if it runs start to finish `
      + `uninterrupted, which is the benchmark rather than a promise. The COMMENTARY is ${quips.length} throwaway `
      + 'lines that never run, only answer: one shot each, never queued, never repeated. Keeping them apart is what '
      + 'makes the first number mean anything.'),
    h('p', { class: 'dp-note' },
      'It is not a tour and the word is gone from everywhere a visitor can see it (N44). It was not a labelling '
      + "problem: a script that thinks of itself as a tour writes lines that introduce sections, and the call's own "
      + 'caption loop — written to be walked into cold, so no line could lean on the one before — sounded more like '
      + 'a person than the thing narrating over it did. The loop is folded in (N45); there is no second script left '
      + 'to play behind this one.'),

    /* --- the flow -------------------------------------------------------- */
    h('h2', { class: 'dp-head2' }, 'The primary flow'),
    h('p', { class: 'dp-note' },
      'Order is priority, not the order they appear in the file. Every part carries three registers — it '
      + 'picks a tone rather than a length, which is what stops an interrupted run reading as a truncated one. '
      + 'Durations are authored and then scaled at run time by how patient the visitor is being.'),
    h('div', { class: 'sc-flowlist' },
      ...flow.map((p) => h('div', { class: 'sc-flowrow' },
        h('span', { class: 'sc-pri' }, String(p.priority)),
        h('b', {}, p.label),
        h('span', { class: 'sc-flowrow-t' }, secs(partRuntime(p, 'lines'))),
        p.needs ? h('span', { class: 'sc-needs' }, `needs ${p.needs}`) : h('span', {})))),

    /* --- how it branches ------------------------------------------------- */
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
      + 'part that has not been covered, whether the script reached it or the visitor did. That single rule is what '
      + 'makes a part visited out of turn get skipped later rather than replayed. '
      + `Going quiet for ${IDLE_MS / 1000}s drops the backlog instead of working through it — a question nobody `
      + 'remembers asking is not worth answering.'),

    /* --- where it is safe to jump --------------------------------------- */
    h('h2', { class: 'dp-head2' }, 'Safe jump points'),
    h('p', { class: 'dp-note' },
      `${jumpable.length} of ${flow.length} parts can be entered out of turn. A part is jumpable when it has a `
      + 'trigger — a selector the visitor can click — and marked clean when it opens without assuming the part '
      + 'before it was heard.'),
    h('div', { class: 'sc-jumps' },
      ...flow.map((p) => h('div', { class: `sc-jump is-${p.entry}${(p.triggers?.length ?? 0) ? '' : ' is-locked'}` },
        h('b', {}, `${p.priority}. ${p.label}`),
        h('span', { class: 'sc-jump-s' },
          (p.triggers?.length ?? 0) ? `${p.entry} entry` : 'script only'),
        ...(p.triggers ?? []).map((t) => h('code', {}, t)),
        p.needs ? h('span', { class: 'sc-needs' }, `needs: ${p.needs}`) : h('span', {})))),

    /* --- the parts ------------------------------------------------------- */
    h('h2', { class: 'dp-head2' }, 'The parts, register by register'),
    ...flow.map((p) => h('div', { class: 'sc-part' },
      h('div', { class: 'sc-part-h' },
        h('span', { class: 'sc-pri' }, String(p.priority)),
        h('b', {}, p.label),
        h('code', {}, p.id),
        p.needs ? h('span', { class: 'sc-needs' }, `needs ${p.needs}`) : h('span', {})),
      h('div', { class: 'sc-regs' },
        register(p, 'lines', 'Full'),
        register(p, 'commentary', 'Commentary'),
        register(p, 'brief', 'Brief')),
      p.bail
        ? h('div', { class: 'sc-bail' },
          h('b', {}, `Bail on line ${p.bail.at}`),
          h('span', {}, `Fires if the visitor leaves inside ${BAIL_MS / 1000}s${p.bail.rewind ? ', and rewinds the document' : ''}.`),
          h('ol', { class: 'sc-lines' }, ...p.bail.lines.map((l) => h('li', {}, h('span', {}, l.text), h('span', {})))))
        : h('span', {}))),

    /* --- the commentary -------------------------------------------------- */
    h('h2', { class: 'dp-head2' }, 'Commentary only'),
    h('p', { class: 'dp-note' },
      'These are never reached by the script. Each fires once, ever, cuts in over whatever is being said and hands '
      + 'the floor straight back. A `click` quip carries a selector; an `event` quip carries a key the app '
      + 'announces, because a drag is not a click on anything and neither is a drawer opened from the keyboard.'),
    ...GROUPS.map((g) => h('div', { class: 'sc-quips' },
      h('div', { class: 'sc-quips-h' }, h('b', {}, g.label), h('span', {}, g.why)),
      ...byGroup(g.key).map((qp) => h('div', { class: 'sc-quip' },
        h('span', { class: `sc-quip-k is-${qp.kind}` }, qp.kind),
        h('code', {}, qp.on),
        h('span', {}, qp.text),
        h('span', { class: 'sc-ms' }, secs(qp.ms)))))),

    /* --- the acknowledgements -------------------------------------------- */
    h('h2', { class: 'dp-head2' }, 'Acknowledgements, by tier'),
    h('p', { class: 'dp-note' },
      'Picked by the restlessness score and never used twice in a run. When a tier runs dry the pool falls UP '
      + 'rather than down: running out of teasing lines does not mean the visitor became patient again.'),
    ...(['settled', 'browsing', 'skimming', 'bolting'] as const).map((t) => h('div', { class: 'sc-quips' },
      h('div', { class: 'sc-quips-h' },
        h('b', {}, t),
        h('span', {}, `${acks.filter((a) => a.tier === t).length} lines`)),
      ...acks.filter((a) => a.tier === t).map((a) => h('div', { class: 'sc-quip' },
        h('span', { class: 'sc-quip-k' }, a.id),
        h('code', {}, t),
        h('span', {}, a.text),
        h('span', { class: 'sc-ms' }, secs(a.ms)))))),

    /* --- the personal segment -------------------------------------------- */
    h('h2', { class: 'dp-head2' }, 'The personal segment'),
    h('p', { class: 'dp-note' },
      `${story.length} chapters, ${secs(storyMs)}. It runs only after the flow has shown everything demonstrable `
      + 'and only after real silence, and once started it is uninterruptible except by Stop. Each chapter is '
      + 'listed under the hiring-manager question it exists to answer, so an answer that drifts away from its '
      + 'question is visible rather than merely true.'),
    h('div', { class: 'sc-story' },
      ...story.map((c, i) => h('div', { class: 'sc-chapter' },
        h('div', { class: 'sc-q' }, h('span', { class: 'sc-pri' }, String(i + 1)), h('b', {}, c.q)),
        h('ol', { class: 'sc-lines' },
          ...c.lines.map((l) => h('li', {}, h('span', {}, l.text), h('span', {}))))))),

    /* --- the asides ------------------------------------------------------ */
    h('h2', { class: 'dp-head2' }, 'Asides'),
    h('p', { class: 'dp-note' }, 'Said by the director rather than by a part, at the moments the register changes.'),
    h('div', { class: 'sc-asides' },
      ...Object.entries(asides).map(([k, l]) => h('div', { class: 'sc-aside' },
        h('b', {}, k), h('span', {}, l.text), h('span', { class: 'sc-ms' }, secs(l.ms))))),

    /* --- the clock -------------------------------------------------------- */
    h('h2', { class: 'dp-head2' }, 'The clock'),
    h('p', { class: 'dp-note' },
      `Every line with the second it is due, and the beat it fires. ${secs(runtimeMs())} end to end if nobody `
      + 'touches it. The timestamps are DERIVED — the running sum of the dwells before them, in priority order — so '
      + 'they cannot drift from the durations they are made of. A real visit is almost always shorter: skipping a '
      + 'line with a press is free, and a visitor who starts exploring drops the register to brief.'),
    h('p', { class: 'dp-note' },
      'The arrow runs both ways (N46). A beat is what the script does to the screen; the same selector clicked by '
      + 'the visitor cuts the line being spoken short and jumps to that part, rather than queueing behind a segment '
      + 'they have already left.'),
    h('div', { class: 'sc-clock' },
      /*
       * The part label goes FIRST and spans the row, so it sits above its segment
       * rather than beside the first line of it. QA caught what the other order
       * costs: a label spanning columns 2-3 fills row one, which pushes the line
       * text down to row two COLUMN ONE -- a 42px timestamp column -- so the
       * first line of every segment rendered as one clipped word.
       */
      ...timeline().map((t) => h('div', { class: `sc-tick${t.index === 0 ? ' is-partstart' : ''}` },
        h('span', { class: 'sc-tick-p' }, t.index === 0 ? t.part.label : ''),
        h('span', { class: 'sc-ms sc-tick-at' }, clock(t.at)),
        h('span', { class: 'sc-tick-t' }, t.line.text),
        h('span', { class: 'sc-ms' }, secs(t.line.ms)),
        ...t.beats.map((b) => {
          const { what, detail } = beatLabel(b);
          return h('span', { class: 'sc-beat sc-tick-b' }, what, detail ? h('code', {}, detail) : h('span', {}));
        })))),

    /* --- after the goodbye ------------------------------------------------ */
    h('h2', { class: 'dp-head2' }, 'After the goodbye'),
    h('p', { class: 'dp-note' },
      `${outro.length} lines that only play if the visitor does not leave, and the gaps are the joke: `
      + `${outro.map((l) => `${Math.round(l.ms / 1000)}s`).join(' → ')}. A run of lines at an even four seconds is `
      + 'a script that has not finished. The same lines spacing out is somebody who has genuinely run out and keeps '
      + `thinking of one more. Capped at ${OUTRO_CAP_MS / 1000}s, currently `
      + `${Math.round(outro.reduce((a, l) => a + l.ms, 0) / 1000)}s. Any input at all abandons it, which is what `
      + 'makes the achievement for sitting through it worth having.'),
    h('div', { class: 'sc-asides' },
      ...outro.map((l, i) => h('div', { class: 'sc-aside' },
        h('b', {}, i === outro.length - 1 ? 'and then silence' : `+${Math.round(l.ms / 1000)}s`),
        h('span', {}, l.text),
        h('span', { class: 'sc-ms' }, secs(l.ms))))),
  );
}
