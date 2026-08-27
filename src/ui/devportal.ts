// Project specifications.
//
// Was the dev portal: Konami-only, dark, full-bleed, framed as "nothing here is
// part of the CV". Nam has promoted it to a real destination, so it now behaves
// like one:
//
//   - It opens as a CARD over the client, the same shape as the CV overlay, so
//     the two read as one family rather than as two unrelated screens.
//   - Its palette follows the surface that opened it. Light from the home
//     screen, dark from inside the call, decided by the caller and applied once
//     on the root so every tab inherits it. Previously each tab carried its own
//     dark colours and only the ones I had touched flipped.
//   - The tabs are the project's own record: what it is, when it was made, how
//     the work ran, who has reviewed it, and what is still open.
//
// Reachable from the Settings button on the home screen, the Settings row in the
// call's overflow menu, and the Konami code.

import { h, clear } from '../dom.js';
import { sym } from './icons.js';
import { trapFocus } from '../a11y.js';
import { buildDoc } from './built.js';
import {
  commitsPerDay, milestones, phasesOfWork, personas, reviews,
  columns, tasks, type Task, type Column,
} from '../data/project.js';
import { START } from '../data/cv.js';

type Tab = 'overview' | 'process' | 'reviews' | 'board';

/*
 * Timeline is gone as a tab and lives inside Overview instead. Nam: "I actually
 * now think the timeline should be merged into the overview. The commit chart on
 * top of the overview, and the milestone on the bottom."
 *
 * Which is the better shape anyway: the chart is the answer to "how was this
 * built", and Overview is where that question gets asked.
 */
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'process', label: 'Process' },
  { id: 'reviews', label: 'Design reviews' },
  { id: 'board', label: 'Kanban board' },
];

export type PortalMode = 'light' | 'dark';

export function openDevPortal(reducedMotion: boolean, mode: PortalMode = 'light'): void {
  if (document.getElementById('devportal')) return;

  let tab: Tab = 'overview';
  const body = h('div', { class: 'dp-body' });

  const tabs = h(
    'div',
    { class: 'dp-tabs', role: 'tablist', 'aria-label': 'Project spec' },
    ...TABS.map((t) =>
      h('button', {
        class: 'dp-tab', type: 'button', role: 'tab', 'aria-selected': 'false', 'data-t': t.id,
        onclick: () => { tab = t.id; draw(); },
      }, t.label),
    ),
  );

  let release: (() => void) | null = null;
  const close = (): void => {
    release?.();
    portal.remove();
  };

  /*
   * The mode is one class on the root and every rule below it reads custom
   * properties, so a tab cannot be in the wrong palette. That was the bug: the
   * colours lived on the individual tab views.
   */
  const portal = h(
    'div',
    {
      class: `dp dp-${mode}${reducedMotion ? '' : ' dp-in'}`,
      id: 'devportal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Project spec',
    },
    h('div', { class: 'dp-card' },
      h('div', { class: 'dp-head' },
        h('span', { class: 'dp-head-ico', 'aria-hidden': 'true' }, sym('science', 22)),
        h('div', { class: 'dp-title' },
          h('h1', {}, 'Project spec'),
          h('p', {}, 'One week, one agent, one interactive CV.')),
        h('button', {
          class: 'icon-btn dp-close', type: 'button', 'aria-label': 'Close project spec', onclick: close,
        }, sym('close', 22))),
      tabs,
      body),
  ) as HTMLElement;

  function draw(): void {
    for (const b of tabs.querySelectorAll('button')) {
      b.setAttribute('aria-selected', b.getAttribute('data-t') === tab ? 'true' : 'false');
    }
    clear(body);
    body.appendChild(
      tab === 'overview' ? overviewView()
      : tab === 'process' ? processView()
      : tab === 'reviews' ? reviewsView()
      : boardView(),
    );
    body.scrollTop = 0;
  }

  /*
   * A press on the dimmed ground closes it. Nam: "clicking the dimmed background
   * outside the project spec should close it too, the same way as clicking close
   * button." Guarded on e.target being the scrim itself, so a press that starts
   * inside the card and drifts out does not count as an outside press.
   */
  portal.addEventListener('pointerdown', (e) => { if (e.target === portal) close(); });

  draw();
  document.body.appendChild(portal);
  release = trapFocus(portal, close);
  portal.querySelector<HTMLElement>('.dp-close')?.focus();
}

// ------------------------------------------------------------------ views --

const fmt = (iso: string): string => {
  const [, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(d)} ${months[Number(m) - 1]}`;
};

/**
 * The timeline, drawn rather than bulleted.
 *
 * Nam: "Present it in like a literal timeline graph, not bullet point text. This
 * is to show off the progress we could make with agentic programming."
 *
 * So the bars carry the argument: 126 commits across seven days, with the shape
 * of the work visible — two very heavy days, one where nothing happened, and a
 * long tail of correction. The numbers are read off `git log`, not estimated.
 */
/**
 * OVERVIEW, with the timeline folded into it.
 *
 * Nam: "the timeline should be merged into the overview. The commit chart on top
 * of the overview, and the milestone on the bottom. Although I wonder if the
 * milestones can spread horizontally kinda cascading, so we see the milestones
 * along with the date too."
 *
 * So: the chart answers "how was this built" before the prose does, and the
 * milestones run left to right as one column per working day, which is the shape
 * the question actually has. A vertical list of eight items said "here is a list";
 * five dated columns say "this happened over five days".
 */
function overviewView(): HTMLElement {
  const total = commitsPerDay.reduce((a, b) => a + b.n, 0);
  // Thin days are hidden from the chart, not from the total. See project.ts.
  const shown = commitsPerDay.filter((d) => !d.thin);
  const peak = Math.max(...shown.map((d) => d.n));
  const hidden = commitsPerDay.length - shown.length;

  // One column per day that produced a milestone, in order.
  const days = [...new Set(milestones.map((m) => m.day))].sort();

  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      `${total} commits from ${fmt(START)}, one person and an agent. The shape matters more than the count: ` +
      `two very heavy days and a long tail of correction after the interface existed.`),

    h('div', { class: 'tl-chart', role: 'img', 'aria-label': `${total} commits across ${commitsPerDay.length} days` },
      ...shown.map((d) => h('div', { class: 'tl-bar-wrap' },
        h('div', { class: 'tl-bar-n' }, String(d.n)),
        h('div', { class: 'tl-bar-track' },
          h('div', { class: 'tl-bar', style: `height:${Math.max(2, Math.round((d.n / peak) * 100))}%` })),
        h('div', { class: 'tl-bar-d' }, fmt(d.day))))),
    hidden
      ? h('p', { class: 'dp-note tl-omit' },
        `${hidden} near-empty days are left off the chart. They are still in the total.`)
      : h('span', {}),

    buildDoc(),

    h('h2', { class: 'dp-head2' }, 'How it got here'),
    h('div', { class: 'ms-strip' },
      ...days.map((day) => h('div', { class: 'ms-day' },
        h('div', { class: 'ms-day-h' },
          h('b', {}, fmt(day)),
          h('span', {}, `${commitsPerDay.find((d) => d.day === day)?.n ?? 0} commits`)),
        ...milestones.filter((m) => m.day === day).map((m) => h('div', { class: 'ms-card' },
          h('b', {}, m.title),
          h('span', {}, m.note)))))),
  );
}

/** How the work actually ran: three phases per task, and a fourth per batch. */
function processView(): HTMLElement {
  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      'Every task ran through the same three phases, in the same order. The fourth happens at the end of a ' +
      'batch rather than per task, and it has caught the most expensive problems.'),
    h('div', { class: 'ph-grid' },
      ...phasesOfWork.map((p) => h('div', { class: 'ph-card' + (p.n === 4 ? ' is-extra' : '') },
        h('div', { class: 'ph-n' }, `Phase ${p.n}`),
        h('h3', {}, p.name),
        h('p', {}, p.body),
        h('ul', { class: 'ph-out' }, ...p.outputs.map((o) => h('li', {}, o)))))),
    h('p', { class: 'dp-note' },
      'The order is the point. Measuring before building is what makes a correction cheap; reviewing before ' +
      'coding is why three findings changed the architecture instead of the paint.'),
  );
}

/** The three readers, and a current read of the CV in each of their voices. */
function reviewsView(): HTMLElement {
  const byPersona = (id: string): HTMLElement[] =>
    reviews.filter((r) => r.persona === id).map((r) => h('div', { class: `rv rv-${r.verdict}` },
      h('div', { class: 'rv-tag' }, r.verdict === 'strong' ? 'Working' : r.verdict === 'mixed' ? 'Mixed' : 'Risk'),
      h('div', {},
        h('b', {}, r.heading),
        h('span', {}, r.body))));

  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      'Three people decide whether this works, and they want different things in different amounts of time. ' +
      'Below is a current read of the site in each of their voices — not the reviews of the original plan, ' +
      'which were about a build that no longer exists.'),

    h('div', { class: 'pr-grid' },
      ...personas.map((p) => h('div', { class: 'pr-card' },
        h('h3', {}, p.name),
        h('div', { class: 'pr-role' }, p.role),
        h('div', { class: 'pr-time' }, p.time),
        h('p', {}, p.wants)))),

    ...personas.flatMap((p) => [
      h('h2', { class: 'dp-head2' }, p.name),
      ...byPersona(p.id),
    ]),
  );
}

/**
 * A board, with cards that move.
 *
 * Nam: "This is what we should have done in the very beginning, has a task pool
 * and slowly take up tasks to solve. But we can do it now."
 *
 * Native drag and drop rather than pointer maths, because the browser already
 * handles the hard parts — the drag image, the drop targets, the cancel. Cards
 * are also focusable and move with the arrow keys, since a board that only works
 * with a mouse is a board half this project's own accessibility notes would fail.
 */
function boardView(): HTMLElement {
  const live: Task[] = tasks.map((t) => ({ ...t }));
  const wrap = h('div', { class: 'kb-wrap' }) as HTMLElement;
  const counts = new Map<Column, HTMLElement>();

  const move = (id: string, to: Column): void => {
    const t = live.find((x) => x.id === id);
    if (!t || t.col === to) return;
    t.col = to;
    paint();
    wrap.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus();
  };

  /**
   * The ticket. Nam wanted the card to stay one line and the detail to live
   * behind a click, which is the right split: a board is for seeing the shape of
   * the work, and a ticket is for doing it.
   *
   * Opened by click, Enter or Space. Not by drag — dragstart suppresses the
   * click that would otherwise follow, so the two gestures do not collide.
   */
  const openTicket = (t: Task): void => {
    if (document.getElementById('kb-ticket')) return;
    const d = t.detail ?? {};
    let rel: (() => void) | null = null;
    const shut = (): void => { rel?.(); sheet.remove(); wrap.querySelector<HTMLElement>(`[data-id="${t.id}"]`)?.focus(); };

    const block = (label: string, node: HTMLElement | null): HTMLElement | null =>
      node ? h('div', { class: 'kb-tk-b' }, h('h4', {}, label), node) : null;

    const sheet = h('div', {
      /*
       * THE PALETTE HAS TO COME WITH IT.
       *
       * --dp-bg and its siblings are declared on .dp-light / .dp-dark, and this
       * sheet is appended to document.body — outside the portal — so the tokens
       * did not resolve and every surface fell back to transparent. QA caught a
       * ticket that opened, took focus and read correctly while being
       * see-through, which a screenshot alone would have let through.
       *
       * Copying the mode class rather than reparenting: the portal runs a
       * transform animation, and a transformed ancestor becomes the containing
       * block for a position:fixed child, which would break the scrim.
       */
      class: `kb-tk ${document.getElementById('devportal')?.classList.contains('dp-dark') ? 'dp-dark' : 'dp-light'}`,
      id: 'kb-ticket', role: 'dialog', 'aria-modal': 'true',
      'aria-label': `${t.id}: ${t.title}`,
    },
      h('div', { class: 'kb-tk-card' },
        h('div', { class: 'kb-tk-h' },
          h('span', { class: 'kb-id' }, t.id),
          h('span', { class: `kb-tag kb-${t.tag}` }, t.tag),
          h('span', { class: 'kb-size' }, t.size),
          h('span', { class: 'kb-tk-col' }, columns.find((c) => c.id === t.col)?.label ?? t.col),
          h('button', {
            class: 'icon-btn kb-tk-x', type: 'button', 'aria-label': 'Close ticket', onclick: shut,
          }, sym('close', 20))),
        h('h3', { class: 'kb-tk-t' }, t.title),
        h('p', { class: 'kb-tk-n' }, t.note),
        block('Why', d.why ? h('p', {}, d.why) : null),
        block('Done when', d.done?.length
          ? h('ul', {}, ...d.done.map((x) => h('li', {}, x)))
          : null),
        block('Raised by', d.raised ? h('p', {}, d.raised) : null),
        block('Notes', d.notes ? h('p', {}, d.notes) : null),
        d.why || d.done || d.raised || d.notes
          ? h('span', {})
          : h('p', { class: 'kb-tk-thin' }, 'No detail written for this one yet.')),
    ) as HTMLElement;

    // A press on the dimmed ground closes it, same contract as the portal.
    sheet.addEventListener('pointerdown', (e) => { if (e.target === sheet) shut(); });
    document.body.appendChild(sheet);
    rel = trapFocus(sheet, shut);
    sheet.querySelector<HTMLElement>('.kb-tk-x')?.focus();
  };

  const card = (t: Task): HTMLElement => {
    const el = h('div', {
      class: 'kb-card', draggable: 'true', tabindex: '0', 'data-id': t.id,
      role: 'listitem',
      'aria-label': `${t.title}. Column ${t.col}. Enter opens the ticket, arrow keys move it.`,
    },
      h('div', { class: 'kb-card-t' }, t.title),
      h('div', { class: 'kb-card-n' }, t.note),
      h('div', { class: 'kb-card-f' },
        h('span', { class: `kb-tag kb-${t.tag}` }, t.tag),
        h('span', { class: 'kb-size' }, t.size),
        h('span', { class: 'kb-id' }, t.id))) as HTMLElement;

    el.addEventListener('dragstart', (e) => {
      (e as DragEvent).dataTransfer?.setData('text/plain', t.id);
      el.classList.add('is-drag');
    });
    el.addEventListener('dragend', () => el.classList.remove('is-drag'));
    el.addEventListener('click', () => openTicket(t));
    el.addEventListener('keydown', (e) => {
      const k = (e as KeyboardEvent).key;
      if (k === 'Enter' || k === ' ') { e.preventDefault(); openTicket(t); return; }
      if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
      e.preventDefault();
      const i = columns.findIndex((c) => c.id === t.col);
      const j = k === 'ArrowLeft' ? i - 1 : i + 1;
      if (j < 0 || j >= columns.length) return;
      move(t.id, columns[j]!.id);
    });
    return el;
  };

  function paint(): void {
    clear(wrap);
    for (const c of columns) {
      const mine = live.filter((t) => t.col === c.id);
      const list = h('div', { class: 'kb-list', role: 'list' }, ...mine.map(card)) as HTMLElement;
      const n = h('span', { class: 'kb-count' }, String(mine.length)) as HTMLElement;
      counts.set(c.id, n);

      const col = h('section', { class: 'kb-col', 'aria-label': c.label },
        h('div', { class: 'kb-col-h' }, h('h3', {}, c.label), n),
        list) as HTMLElement;

      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('is-over');
        const id = (e as DragEvent).dataTransfer?.getData('text/plain');
        if (id) move(id, c.id);
      });
      wrap.appendChild(col);
    }
  }

  paint();

  return h('div', { class: 'dp-col dp-col-wide' },
    h('p', { class: 'dp-lead' },
      'The work, as a board. Drag a card between columns, or focus one and use the arrow keys. ' +
      'Several cards are uncomfortable to read, which is the point — a board holding only finished things is ' +
      'a trophy cabinet rather than a plan.'),
    wrap,
  );
}
