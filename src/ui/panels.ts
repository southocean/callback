// Tier-one panels: the story.
//
// Chat is the cover letter, People is the career timeline, Present is the case
// studies. Review U7 pushed everything technical out of here and behind one
// Engineering door, so these three stay narrative.

import { h, clear } from '../dom.js';
import { layoutTimeline, overlaps } from '../state.js';
import type { Store } from '../state.js';
import { chat, roles, caseStudies, transcript } from '../data/cv.js';

/** 2026-08-20 as a decimal year, for timeline geometry. */
export const NOW = 2026.63;

export function renderChat(): HTMLElement {
  return h(
    'div',
    {},
    h('p', { class: 'pnote' }, 'The cover letter. It is a chat panel because a chat panel is where people actually read things.'),
    ...chat.map((m) =>
      h(
        'div',
        { class: m.from === 'system' ? 'msg msg-sys' : 'msg' },
        m.from === 'nam' ? h('div', { class: 'msg-from' }, `Nam Nguyen  ${m.at}`) : null,
        h('div', { class: 'msg-body' }, m.text),
      ),
    ),
    h('div', { class: 'shead' }, 'Transcript'),
    renderTranscript(),
  );
}

export function renderPeople(): HTMLElement {
  const placed = layoutTimeline(
    roles.map((r) => ({ id: r.id, from: r.from, to: r.to })),
    NOW,
  );
  const byLane = new Map<number, typeof placed>();
  for (const p of placed) {
    const lane = byLane.get(p.lane) ?? [];
    lane.push(p);
    byLane.set(p.lane, lane);
  }

  const kindOf = (id: string): string => roles.find((r) => r.id === id)?.kind ?? '';
  const orgOf = (id: string): string => roles.find((r) => r.id === id)?.org ?? '';

  const axis = h(
    'div',
    { class: 'axis', role: 'img', 'aria-label': 'Timeline of roles from 2013 to 2026. Mahjong Logic runs from 2019 to the present and is the longest engagement.' },
    ...[...byLane.keys()]
      .sort((a, b) => a - b)
      .map((lane) =>
        h(
          'div',
          { class: 'axis-row' },
          ...(byLane.get(lane) ?? []).map((p) =>
            h(
              'div',
              {
                class: `axis-bar ${kindOf(p.id) === 'engineering' ? 'eng' : kindOf(p.id)}`,
                style: `left:${(p.x * 100).toFixed(2)}%;width:${Math.max(p.w * 100, 9).toFixed(2)}%`,
                title: orgOf(p.id),
              },
              orgOf(p.id),
            ),
          ),
        ),
      ),
    h('div', { class: 'axis-ticks' }, h('span', {}, '2013'), h('span', {}, '2019'), h('span', {}, 'today')),
  );

  // Review H2: the two concurrent roles are the thing a recruiter squints at,
  // so say it out loud instead of letting them guess.
  const concurrent = roles.filter((r) => r.to === null);
  const note =
    concurrent.length > 1 && overlaps(concurrent[0]!, concurrent[1]!, NOW)
      ? h(
          'p',
          { class: 'overlap-note' },
          'Two of these overlap, and that is not a typo on the CV. The engineering role has been running for ',
          h('b', {}, 'seven years'),
          ' and still is; the commercial one was taken on alongside it in late 2025 to learn the customer side of the same industry. The long bar is the career.',
        )
      : null;

  return h(
    'div',
    {},
    h('p', { class: 'pnote' }, 'Every participant in this call is a chapter. They joined in this order.'),
    axis,
    note,
    ...roles.map((r) =>
      h(
        'div',
        { class: 'role' },
        h(
          'div',
          { class: 'role-head' },
          h('h3', { class: 'role-org' }, r.org),
          h('span', { class: 'role-when' }, `${r.fromLabel} — ${r.toLabel}`),
        ),
        h('div', { class: 'role-title' }, `${r.title} · ${r.place}`),
        h('ul', {}, ...r.bullets.map((b) => h('li', {}, b))),
      ),
    ),
  );
}

export function renderPresent(store: Store): HTMLElement {
  const wrap = h('div', {});
  const body = h('div', {});

  const nav = h(
    'div',
    { class: 'slide-nav', role: 'tablist', 'aria-label': 'Case studies' },
    ...caseStudies.map((cs) =>
      h(
        'button',
        {
          class: 'chip',
          type: 'button',
          role: 'tab',
          'aria-pressed': 'false',
          'data-cs': cs.id,
          onclick: () => store.dispatch({ t: 'spotlight', id: cs.id }),
        },
        cs.org,
      ),
    ),
  );

  const draw = (): void => {
    const id = store.get().spotlight ?? caseStudies[0]!.id;
    const cs = caseStudies.find((c) => c.id === id) ?? caseStudies[0]!;
    for (const chip of nav.querySelectorAll('button')) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-cs') === cs.id ? 'true' : 'false');
    }
    clear(body);
    body.appendChild(
      h(
        'div',
        { class: 'slide' },
        h('h3', {}, cs.title),
        h('div', { class: 'slide-org' }, `${cs.org} · ${cs.years}`),
        h('div', { class: 'slide-label' }, 'The problem'),
        h('p', {}, cs.problem),
        h('div', { class: 'slide-label' }, 'What I did'),
        h('ul', {}, ...cs.approach.map((a) => h('li', {}, a))),
        h('div', { class: 'slide-label' }, 'Why it matters for this team'),
        h('p', { class: 'relevance' }, cs.relevance),
        h('div', { class: 'stack' }, ...cs.stack.map((s) => h('span', {}, s))),
      ),
    );
  };

  wrap.append(
    h('p', { class: 'pnote' }, 'Screen share. Three projects and this page, which is the fourth.'),
    nav,
    body,
  );
  draw();
  store.subscribe(draw);
  return wrap;
}

export function renderTranscript(): HTMLElement {
  // Review T11 and A1: labelled as scripted, and rendered as a static list
  // rather than a live region that floods a screen reader.
  return h(
    'div',
    {},
    h(
      'p',
      { class: 'pnote' },
      'Transcript. Scripted, not recognised — there is no audio track here, and pretending otherwise would be a lie ' +
        'told in a job application. Live recognition is a separate, optional thing: turn on your microphone and it ' +
        'transcribes you.',
    ),
    ...transcript.map((l) =>
      h(
        'p',
        { class: 'msg' },
        h('span', { class: 'msg-from' }, `${l.speaker} · ${String(Math.floor(l.at / 60)).padStart(2, '0')}:${String(l.at % 60).padStart(2, '0')}`),
        h('span', { class: 'msg-body', style: 'display:block' }, l.text),
      ),
    ),
  );
}
