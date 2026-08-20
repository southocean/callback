// The home screen — meet.google.com/home, rebuilt.
//
// Measured off the live product: 56px top bar, 48px composer pill at radius 28,
// 104x56 rail items with a 56x32 #c2e7ff selected pill, a 48px-wide day column
// in the week strip, and a #d3e3fd scheduled card with a 48px blue Join pill.
//
// The CV mapping is one-to-one with what was actually on Nam's home screen when
// the crawl ran: a single scheduled meeting called "Nam's interview", starting
// now. Clicking Join is how you enter the CV.

import { h, clear } from '../dom.js';
import { sym, lockup } from './icons.js';
import type { Store } from '../state.js';
import { profile } from '../data/cv.js';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** The interview is always "now", whenever you happen to open this. */
function slot(): { day: string; date: number; label: string; week: { n: string; d: number }[] } {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  const fmt = (d: Date): string => {
    let hr = d.getHours();
    const ap = hr >= 12 ? 'PM' : 'AM';
    hr = hr % 12 || 12;
    return `${hr}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
  };
  const week: { n: string; d: number }[] = [];
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    week.push({ n: DAYS[d.getDay()] ?? '', d: d.getDate() });
  }
  return {
    day: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    date: now.getDate(),
    label: `${fmt(start)} – ${fmt(end)}`,
    week,
  };
}

export function renderHome(store: Store): HTMLElement {
  const s = slot();

  // --- top bar -------------------------------------------------------------

  const input = h('input', {
    type: 'text',
    placeholder: 'Enter a code or link',
    'aria-label': 'Enter a meeting code or link',
    autocomplete: 'off',
  }) as HTMLInputElement;

  const join = h(
    'button',
    { class: 'composer-join', type: 'button', onclick: () => tryCode() },
    'Join',
  ) as HTMLButtonElement;

  const hint = h('div', { class: 'sched-note', role: 'status' });

  function tryCode(): void {
    const code = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!code) return;
    // The real codes go to the CV. Anything else behaves like Meet does when a
    // code is wrong, because pretending every string works would be worse.
    if (['nam-cv-2026', 'namcv2026', 'callback', 'nam', 'hire-nam'].includes(code)) {
      store.dispatch({ t: 'screen', screen: 'lobby' });
      return;
    }
    if (code === 'up-up-down-down' || code === 'konami') {
      hint.textContent = 'Warmer. That one is a keyboard shortcut, not a code — try it inside the call.';
      return;
    }
    hint.textContent = `Couldn't find the meeting "${code}". The one you want is nam-cv-2026, or just press Join on the meeting below.`;
  }

  input.addEventListener('input', () => {
    join.classList.toggle('live', input.value.trim().length > 0);
  });
  input.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') tryCode();
  });

  const bar = h(
    'header',
    { class: 'home-bar' },
    lockup(),
    h(
      'div',
      { class: 'home-composer' },
      h('div', { class: 'composer-pill' }, sym('keyboard', 22), input, join),
      h(
        'button',
        {
          class: 'm-btn m-tonal',
          type: 'button',
          onclick: () => store.dispatch({ t: 'screen', screen: 'lobby' }),
        },
        sym('videocam', 20),
        'New',
      ),
    ),
    h(
      'div',
      { class: 'home-bar-right' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Support' }, sym('help', 22)),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Settings' }, sym('settings', 22)),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Google apps' }, sym('apps', 20)),
      h('button', { class: 'avatar-btn', type: 'button', 'aria-label': `Signed in as ${profile.name}` }, 'NN'),
    ),
  );

  // --- rail ----------------------------------------------------------------

  const rail = h(
    'nav',
    { class: 'rail', 'aria-label': 'Sections' },
    h(
      'button',
      { class: 'rail-item', type: 'button', 'aria-current': 'true' },
      h('span', { class: 'rail-pill' }, sym('event', 22)),
      h('span', { class: 'rail-label' }, 'Meetings'),
    ),
    h(
      'button',
      {
        class: 'rail-item',
        type: 'button',
        'aria-current': 'false',
        onclick: () => store.dispatch({ t: 'plain', on: true }),
      },
      h('span', { class: 'rail-pill' }, sym('description', 22)),
      h('span', { class: 'rail-label' }, 'CV'),
    ),
  );

  // --- main ----------------------------------------------------------------

  const main = h(
    'main',
    { class: 'home-main', id: 'main' },
    h(
      'div',
      { class: 'date-row' },
      h('h1', { class: 'date-title' }, s.day),
      sym('event', 20),
      h(
        'div',
        { class: 'week' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous week' }, sym('chevron_left', 22)),
        ...s.week.map((d) =>
          h(
            'button',
            { class: 'day', type: 'button', 'aria-current': d.d === s.date ? 'true' : 'false' },
            h('span', { class: 'day-name' }, d.n),
            h('span', { class: 'day-num' }, String(d.d)),
          ),
        ),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next week' }, sym('chevron_right', 22)),
      ),
    ),

    // Meet's own promo banner slot, used for the thing a recruiter actually
    // needs: the boring version of this document.
    h(
      'div',
      { class: 'banner' },
      h('span', { class: 'banner-ico' }, sym('description', 22)),
      h(
        'div',
        {},
        h('div', { class: 'banner-t' }, 'Short of time? Read this as a plain document instead'),
        h('div', { class: 'banner-s' }, 'Same content, one page, prints cleanly. No call required.'),
      ),
      h(
        'a',
        { href: '#plain', onclick: (e: Event) => { e.preventDefault(); store.dispatch({ t: 'plain', on: true }); } },
        'Open document',
      ),
    ),

    h('div', { class: 'sched-label' }, 'Scheduled'),
    h(
      'button',
      {
        class: 'sched-card',
        type: 'button',
        onclick: () => store.dispatch({ t: 'screen', screen: 'lobby' }),
      },
      h(
        'div',
        {},
        h(
          'div',
          { class: 'sched-when' },
          h('span', { class: 'now-chip' }, 'Now'),
          h('span', { class: 'sched-time' }, s.label),
        ),
        h('div', { class: 'sched-title' }, "Nam's interview"),
      ),
      h('span', { class: 'sched-join' }, 'Join'),
    ),
    h(
      'p',
      { class: 'sched-note' },
      'One participant. He has been waiting since March, when the CV was last updated.',
    ),
    hint,

    h(
      'div',
      { class: 'home-alt' },
      h(
        'a',
        { class: 'm-btn m-outlined', href: 'NamNguyen_CV_2026.pdf', download: true },
        sym('description', 18),
        'Download the PDF',
      ),
      h(
        'button',
        {
          class: 'm-btn m-text',
          type: 'button',
          onclick: () => store.dispatch({ t: 'engTab', tab: 'spec' }),
        },
        'How this was built',
      ),
    ),
  );

  const wrap = h(
    'div',
    { class: 'home' },
    bar,
    h('div', { class: 'home-body' }, rail, main),
  );

  // Focus the code field only when someone has clearly come to type in it.
  if (location.hash === '#home') clear(hint);
  return wrap;
}
