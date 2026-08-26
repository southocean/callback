// Project specs.
//
// Was the dev portal: Konami-only, framed as "nothing here is part of the CV".
// Nam has promoted it. It is now the one place the build is documented, opened by
// the Settings button on the home screen, by the Settings row in the call's
// overflow menu, and still by the Konami code -- so it is reachable at any point
// in the CV rather than only from the front door.
//
// That promotion is why the Overview tab exists: the standalone #built route was
// a second answer to the same question, and two documents that can disagree are
// worse than one. buildDoc() now renders here and in the mock Chrome, and
// nowhere else.
//
// It holds the working notes: how the interface was planned, the adversarial
// design reviews it went through, what QA found after it was built, and the
// argument about how the story should be told. All of it is framed as a review
// of *the artifact*, because that is what it is.
//
// Loaded as a separate chunk via dynamic import, so it costs nothing at all
// unless somebody finds it.

import { h, clear } from '../dom.js';
import { sym } from './icons.js';
import { findings, phases, roleNames, actionItems, qa, stats } from '../data/devlog.js';
import { original, pros, cons, shipped, alternative, verdict } from '../data/story.js';
import { method } from '../data/spec.js';
import { buildDoc } from './built.js';

type Tab = 'overview' | 'process' | 'reviews' | 'qa' | 'story' | 'open';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'process', label: 'Process' },
  { id: 'reviews', label: 'Design reviews' },
  { id: 'qa', label: 'QA findings' },
  { id: 'story', label: 'Storyline' },
  { id: 'open', label: 'Left open' },
];

export function openDevPortal(reducedMotion: boolean): void {
  if (document.getElementById('devportal')) return;

  let tab: Tab = 'overview';
  const body = h('div', { class: 'dp-body' });

  const tabs = h(
    'div',
    { class: 'dp-tabs', role: 'tablist', 'aria-label': 'Project specs' },
    ...TABS.map((t) =>
      h(
        'button',
        {
          class: 'dp-tab', type: 'button', role: 'tab', 'aria-selected': 'false', 'data-t': t.id,
          onclick: () => { tab = t.id; draw(); },
        },
        t.label,
      ),
    ),
  );

  const close = (): void => {
    document.removeEventListener('keydown', onKey);
    portal.remove();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  };

  const portal = h(
    'div',
    { class: `dp ${reducedMotion ? '' : 'dp-in'}`, id: 'devportal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Project specs' },
    h(
      'div',
      { class: 'dp-head' },
      // Drawn rather than typed: the Unicode mahjong tiles render as tofu on
      // most Windows machines, which is a poor first impression for an easter egg.
      h('div', { class: 'dp-tiles', 'aria-hidden': 'true' }, ...[0, 1, 2].map((i) =>
        h('span', { style: reducedMotion ? '' : `animation-delay:${i * 70}ms` }, tileSvg(i)))),
      h(
        'div',
        { class: 'dp-title' },
        h('h1', {}, 'Project specs'),
        h(
          'p',
          {},
          'How this site was built: what it copies and what it invents, the phases it went through, ',
          'the design reviews it survived, and what QA found afterwards. The working record, not a summary of it.',
        ),
      ),
      h('button', { class: 'dp-close', type: 'button', 'aria-label': 'Close project specs', onclick: close }, sym('close', 24)),
    ),
    tabs,
    body,
  );

  function draw(): void {
    for (const b of tabs.querySelectorAll('button')) {
      b.setAttribute('aria-selected', b.getAttribute('data-t') === tab ? 'true' : 'false');
    }
    clear(body);
    body.appendChild(
      tab === 'overview' ? buildDoc()
      : tab === 'process' ? processView()
      : tab === 'reviews' ? reviewsView()
      : tab === 'qa' ? qaView()
      : tab === 'story' ? storyView()
      : openView(),
    );
    body.scrollTop = 0;
  }

  draw();
  document.body.appendChild(portal);
  document.addEventListener('keydown', onKey);
  (portal.querySelector('.dp-close') as HTMLElement | null)?.focus();
}

// ---------------------------------------------------------------- process ----

function processView(): HTMLElement {
  return h(
    'div',
    { class: 'dp-col' },
    h(
      'p',
      { class: 'dp-lead' },
      'Planned first, then reviewed three times before any product code existed, in the voices of the people who ' +
        'would actually open it. A fourth round covered the game layer and the narrative once those existed, a fifth ' +
        'covered the decision to rebuild the interface as a faithful clone, and a QA pass went through the finished ' +
        'thing looking for ways to break it.',
    ),
    h(
      'div',
      { class: 'dp-stats' },
      stat(String(stats.findings), 'review findings'),
      stat(String(stats.rounds + 2), 'rounds'),
      stat(String(stats.qa), 'found by QA'),
      stat(String(stats.architectureChanges), 'changed the architecture'),
    ),
    ...phases.map((p) => h('div', { class: 'phase' }, h('h4', {}, p.name), h('p', {}, p.body))),
    h('div', { class: 'dp-head2' }, 'How the interface spec was taken'),
    h('ol', { class: 'actions-list' }, ...method.steps.map((s) => h('li', {}, s))),
    h('p', { class: 'fx-warn' }, method.honest),
  );
}

function stat(v: string, k: string): HTMLElement {
  return h('div', { class: 'dp-stat' }, h('b', {}, v), h('span', {}, k));
}

// ---------------------------------------------------------------- reviews ----

function reviewsView(): HTMLElement {
  const rounds = [1, 2, 3, 4] as const;
  const titles: Record<number, string> = {
    1: 'Round one — against the first concept',
    2: 'Round two — against the revised plan',
    3: 'Round three — final pass on the plan',
    4: 'Round four — the game layer and the narrative',
  };
  return h(
    'div',
    { class: 'dp-col' },
    h(
      'p',
      { class: 'dp-lead' },
      'Each round is run in the voice of somebody who will actually see this and has a reason to be sceptical: a ' +
        'recruiter, a tech lead on the team, a product designer, the friend whose name goes on the referral, a ' +
        'privacy reviewer, an accessibility specialist. A round closes only when every objection has a resolution ' +
        'that changed the repo.',
    ),
    ...rounds.flatMap((r) => [
      h('div', { class: 'dp-head2' }, titles[r] ?? `Round ${r}`),
      ...findings.filter((f) => f.round === r).map((f) =>
        h(
          'div',
          { class: 'finding' },
          h(
            'div',
            { class: 'finding-head' },
            h('span', { class: 'finding-id' }, f.id),
            h('span', { class: 'finding-role' }, roleNames[f.role]),
          ),
          h(
            'div',
            { class: 'finding-body' },
            h('div', { class: 'finding-obj' }, `“${f.objection}”`),
            h('div', { class: 'finding-res' }, f.resolution),
            h('div', { class: 'finding-changed' }, h('b', {}, 'Changed: '), f.changed),
          ),
        ),
      ),
    ]),
  );
}

// --------------------------------------------------------------------- qa ----

function qaView(): HTMLElement {
  return h(
    'div',
    { class: 'dp-col' },
    h(
      'p',
      { class: 'dp-lead' },
      'Reviewing a plan catches different things than opening the result. These only appeared once there was ' +
        'something to click on — and two of them were found by the page auditing itself rather than by anyone ' +
        'looking.',
    ),
    ...qa.map((f) =>
      h(
        'div',
        { class: 'finding' },
        h(
          'div',
          { class: 'finding-head' },
          h('span', { class: 'finding-id' }, f.id),
          h('span', { class: 'finding-role' }, roleNames[f.role]),
          h('span', { class: 'finding-round' }, 'QA'),
        ),
        h(
          'div',
          { class: 'finding-body' },
          h('div', { class: 'finding-obj', style: 'font-style:normal' }, f.found),
          h('div', { class: 'finding-res' }, f.fix),
        ),
      ),
    ),
  );
}

// ------------------------------------------------------------------ story ----

function storyView(): HTMLElement {
  return h(
    'div',
    { class: 'dp-col' },
    h(
      'p',
      { class: 'dp-lead' },
      'Nam proposed a framing for the whole thing, asked for the case against it, and asked for an alternative. All ' +
        'three are here, along with what actually shipped and why — the reasoning rather than the verdict, because ' +
        'it is his CV.',
    ),

    h('div', { class: 'dp-head2' }, original.label),
    h('p', { class: 'finding-obj' }, `“${original.quote}”`),
    h('p', { class: 'pnote' }, original.note),

    h('div', { class: 'dp-head2' }, 'The case for it'),
    ...pros.map((p) => h('div', { class: 'phase' }, h('h4', {}, p.heading), h('p', {}, p.body))),

    h('div', { class: 'dp-head2' }, 'The case against it'),
    ...cons.map((c) =>
      h('div', { class: 'finding' }, h('div', { class: 'finding-body', style: 'padding-top:12px' },
        h('h4', { style: 'font-size:15px;margin-bottom:6px;color:#fff' }, c.heading),
        h('p', { class: 'finding-obj', style: 'font-style:normal;margin-bottom:0' }, c.body),
      )),
    ),

    h('div', { class: 'dp-head2' }, shipped.label),
    h('p', { class: 'finding-res' }, shipped.body),
    h('div', { class: 'slide-label' }, 'Kept'),
    h('ul', { class: 'dp-list' }, ...shipped.keeps.map((k) => h('li', {}, k))),
    h('div', { class: 'slide-label' }, 'Cut'),
    h('ul', { class: 'dp-list' }, ...shipped.drops.map((d) => h('li', {}, d))),

    h('div', { class: 'dp-head2' }, alternative.label),
    h('h4', { style: 'font-size:16px;margin-bottom:6px;color:#fff' }, alternative.name),
    h('p', { class: 'pnote' }, alternative.body),
    h('p', { class: 'fx-warn' }, h('b', {}, 'What it costs: '), alternative.cost),

    h('div', { class: 'dp-head2' }, 'Verdict'),
    h('p', { class: 'relevance' }, verdict),
  );
}

// ------------------------------------------------------------------- open ----

function openView(): HTMLElement {
  return h(
    'div',
    { class: 'dp-col' },
    h(
      'p',
      { class: 'dp-lead' },
      'The build refused to invent anything it could not source. A fabricated number does not survive an interview, ' +
        'so where a magnitude would have helped it was left out and written down here instead.',
    ),
    h('ol', { class: 'actions-list' }, ...actionItems.map((a) => h('li', {}, a))),
    h(
      'p',
      { class: 'pnote', style: 'margin-top:20px' },
      'There are no fabricated metrics anywhere in the shipped page. That was the one rule with no exceptions.',
    ),
  );
}

/** A mahjong tile, drawn. Three of them deal in above the title. */
function tileSvg(n: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 34');
  svg.setAttribute('width', '26');
  svg.setAttribute('height', '37');
  svg.setAttribute('aria-hidden', 'true');
  const body = document.createElementNS(ns, 'rect');
  body.setAttribute('x', '1'); body.setAttribute('y', '1');
  body.setAttribute('width', '22'); body.setAttribute('height', '32');
  body.setAttribute('rx', '4');
  body.setAttribute('fill', '#f1f3f4');
  body.setAttribute('stroke', '#c4c7c5');
  svg.appendChild(body);
  // n+1 pips, in the bamboo-suit arrangement.
  for (let i = 0; i <= n; i++) {
    const pip = document.createElementNS(ns, 'circle');
    pip.setAttribute('cx', '12');
    pip.setAttribute('cy', String(17 - n * 5 + i * 10));
    pip.setAttribute('r', '3.2');
    pip.setAttribute('fill', '#1a73e8');
    svg.appendChild(pip);
  }
  return svg;
}
