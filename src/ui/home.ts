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
import { sym, lockup, spinner, focusRing, playLockup, settleLockup } from './icons.js';
import { openDev } from './devopen.js';
import { tip, tipAll, tipAllAbove, hideTip, rearm } from './tooltip.js';
import { eggMap, key as dayKey, type Egg } from '../data/eggs.js';
import type { Store } from '../state.js';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * The boot sequence runs once per page load, not once per mount, so coming back
 * from the call does not make you sit through it again — which is also what Meet
 * does: a cold load spins, a return from a call does not.
 *
 * This is a phase and not a boolean because home() mounts more than once during
 * startup (the router re-renders once the hash is resolved). A boolean gets
 * consumed by the first mount and the second one renders the finished state, so
 * the spinner was never seen. A phase lets a re-render pick the sequence up
 * where it left off instead of restarting or skipping it.
 */
type Boot = 'cold' | 'listed' | 'done';
let boot: Boot = 'cold';

/**
 * Which card is currently selected, and whether the selection is meant to be
 * showing. Module-level because the three things that clear or restore it are
 * document- and window-level events, and those listeners must be attached once
 * rather than once per render.
 */
let selectedCard: HTMLElement | null = null;
let isSelected = false;
let wired = false;

/** Re-adding the class restarts the ring animation, which is the pulse. */
function showRing(el: HTMLElement): void {
  el.classList.remove('is-selected');
  void el.offsetWidth;
  el.classList.add('is-selected');
}

function wireSelection(): void {
  if (wired) return;
  wired = true;
  // Clicking anything that is not the card drops the selection, exactly as it
  // does in the real product.
  document.addEventListener('pointerdown', (e) => {
    if (!selectedCard || !isSelected) return;
    const t = e.target;
    if (t instanceof Node && selectedCard.contains(t)) return;
    isSelected = false;
    selectedCard.classList.remove('is-selected');
  });
  // Alt-tab or Ctrl-Tab away and the ring goes; come back and it pulses again.
  // Meet gets this from the browser; we have to say it.
  window.addEventListener('blur', () => {
    selectedCard?.classList.remove('is-selected');
  });
  window.addEventListener('focus', () => {
    if (isSelected && selectedCard) showRing(selectedCard);
  });
}

/** Measured off a screen recording of a cold load. */
const BOOT_SPIN = 900;   // spinner alone, no date row
const BOOT_BANNER = 800; // then the wordmark does its trick
/**
 * And only after that does the promo arrive.
 *
 * These used to fire off the same timer, so the gag and the banner landed
 * together and the banner won — something sliding in beside the joke is exactly
 * as distracting as something sliding in underneath it.
 *
 * The impact runs 790ms end to end by its own constants (183 approach + 187
 * displace + 420 recoil), so 1050 leaves a clear quarter-second of stillness
 * after it lands before anything else on the page moves.
 */
const GAG_MS = 1050;

/** The gag plays once per page load, however many times home() mounts. */
let gagStarted = false;

/**
 * Which day the page is looking at. Module-level so paging to another day and
 * back does not reset it, and so the boot sequence and the calendar agree about
 * what "selected" means.
 */
let viewing: Date = new Date();
const TODAY = new Date();

/** Meet uses a short wavy arc for switching days and a long one for a cold
 *  start. Switching is cheap work and the indicator says so. */
const DAY_SWITCH_MS = 420;

const isToday = (d: Date): boolean => dayKey(d) === dayKey(TODAY);

/** The interview is always "now", whenever you happen to open this. */
function slot(on: Date): { day: string; date: number; label: string; week: { n: string; d: number; full: string; iso: string }[] } {
  const now = on;
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
  const week: { n: string; d: number; full: string; iso: string }[] = [];
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    week.push({
      n: DAYS[d.getDay()] ?? '',
      d: d.getDate(),
      // "Sunday, August 16" — Meet's own wording for the day labels.
      full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      iso: dayKey(d),
    });
  }
  return {
    day: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    date: now.getDate(),
    label: `${fmt(start)} – ${fmt(end)}`,
    week,
  };
}

/**
 * The home shell. `body` swaps the content column for another screen that lives
 * inside the same chrome — the Calls tab does this. Without it the boot sequence
 * would asynchronously clear main and overwrite whatever the caller put there,
 * which is exactly what happened the first time.
 */
export function renderHome(store: Store, reducedMotion = false, body?: HTMLElement): HTMLElement {
  let s = slot(viewing);
  const marks = eggMap(TODAY);

  // --- top bar -------------------------------------------------------------

  const input = h('input', {
    type: 'text',
    placeholder: 'Enter a code or link',
    'aria-label': 'Enter a meeting code or link',
    autocomplete: 'off',
  }) as HTMLInputElement;

  const join = h(
    'button',
    { class: 'composer-join', type: 'button', 'aria-disabled': 'true', onclick: () => tryCode() },
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
    const live = input.value.trim().length > 0;
    join.classList.toggle('live', live);
    join.setAttribute('aria-disabled', live ? 'false' : 'true');
  });
  input.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') tryCode();
  });

  const bar = h(
    'header',
    { class: 'home-bar' },
    // One left cluster, not two grid children. The bar is a 1fr/auto/1fr grid,
    // so adding the menu button as a sibling took column 1 and pushed the logo
    // into the middle. Grouping them also reproduces Meet's own arithmetic:
    // button at 12 + 48 wide + 4 gap puts the logo at 64, which is exactly
    // where it measures below 840.
    h(
      'div',
      { class: 'home-bar-left' },
      h(
        'button',
        { class: 'icon-btn menu-btn', type: 'button', 'aria-label': 'Main menu', 'aria-expanded': 'false' },
        sym('menu', 24),
      ),
      lockup(reducedMotion, () => store.dispatch({ t: 'screen', screen: 'home' })),
    ),
    h(
      'div',
      { class: 'home-composer' },
      h('div', { class: 'composer-pill' }, sym('keyboard', 24), input, join),
      h(
        'button',
        {
          class: 'm-btn m-tonal m-new',
          type: 'button',
          // Meet's own label, which also gives the tooltip something better than
          // the button's own text to read.
          'aria-label': 'New meeting',
          onclick: () => store.dispatch({ t: 'screen', screen: 'lobby' }),
        },
        sym('video_call', 20),
        // Wrapped so the breakpoint can drop the word and keep the icon, which
        // is what Meet does below 1240.
        h('span', { class: 'm-new-label' }, 'New'),
      ),
    ),
    h(
      'div',
      { class: 'home-bar-right' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Support' }, sym('help', 24)),
      h(
        'button',
        {
          class: 'icon-btn',
          type: 'button',
          // Meet just says "Settings". Keeping the label faithful also keeps the
          // build notes behind it a discovery rather than a signpost.
          'aria-label': 'Settings',
          onclick: () => { void openDev(store); },
        },
        sym('settings', 24),
      ),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Google apps' }, sym('apps', 22)),
      h(
        'button',
        { class: 'avatar-btn', type: 'button', 'aria-label': 'Google Account: you' },
        h('span', {}, 'G'),
      ),
    ),
  );

  // --- rail ----------------------------------------------------------------

  const rail = h(
    'nav',
    { class: 'rail', 'aria-label': 'Sections' },
    h(
      'button',
      { class: 'rail-item', type: 'button', 'aria-current': 'true' },
      h('span', { class: 'rail-pill' }, sym('event', 24, { fill: true })),
      h('span', { class: 'rail-label' }, 'Meetings'),
    ),
    h(
      'button',
      {
        class: 'rail-item',
        type: 'button',
        'aria-current': 'false',
        onclick: () => { location.hash = '#calls'; store.dispatch({ t: 'screen', screen: 'home' }); },
      },
      h('span', { class: 'rail-pill' }, sym('call', 24)),
      h('span', { class: 'rail-label' }, 'Calls'),
    ),
  );

  // --- main ----------------------------------------------------------------

  // --- the day body -------------------------------------------------------
  //
  // Everything below the promo depends on which day you are looking at, so it
  // is built by a function rather than written once: today has the interview,
  // a marked day has whatever is hidden there, and every other day is empty —
  // which is a real state in Meet, not a gap.
  const dayBody = h('div', { class: 'day-body' });

  const todayPill = h(
    'button',
    { class: 'today-pill', type: 'button', onclick: () => switchDay(new Date()) },
    'Today',
  );

  /**
   * Meet's empty day has an illustration. Borrowing theirs would mean shipping
   * their artwork, so this draws the same idea instead: an empty week, the kind
   * of thing the page is telling you about.
   */
  function emptyArt(): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 300 160');
    svg.setAttribute('width', '300');
    svg.setAttribute('height', '160');
    svg.setAttribute('fill', 'none');

    // Google's illustration style, as far as it can be characterised: flat
    // shapes in the brand colours, a single dark hairline over the top, and one
    // object deliberately breaking the baseline. Theirs is a desk with a coffee
    // and a sketchbook; this is the same idea drawn from scratch rather than
    // their file copied.
    const add = (tag: string, attrs: Record<string, string>): void => {
      const el = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      svg.appendChild(el);
    };
    const INK = '#3c4043';

    // Google's illustrations lean on two-stop gradients rather than flat fills
    // — it is what stops the shapes reading as clip art. Two here: warm on the
    // cup, cool on the slab, both shading toward the light source in the top
    // right so they agree with the sun.
    const defs = document.createElementNS(ns, 'defs');
    const grad = (id: string, from: string, to: string, x2: string, y2: string): void => {
      const g = document.createElementNS(ns, 'linearGradient');
      g.setAttribute('id', id);
      g.setAttribute('x1', '0'); g.setAttribute('y1', '0');
      g.setAttribute('x2', x2); g.setAttribute('y2', y2);
      for (const [off, col] of [['0', from], ['1', to]]) {
        const st = document.createElementNS(ns, 'stop');
        st.setAttribute('offset', off!); st.setAttribute('stop-color', col!);
        g.appendChild(st);
      }
      defs.appendChild(g);
    };
    grad('ea-cup', '#FDE293', '#F9AB00', '0', '1');
    grad('ea-slab', '#FAD2E1', '#E8A0BF', '1', '1');
    svg.appendChild(defs);
    // 1.25, not 2. Meet's illustrations are drawn with a hairline — the weight
    // is what separates an illustration from a diagram, and ours read as a
    // diagram. Every filled shape carries the same line, including the ones
    // that are purely decorative: an unoutlined block next to outlined ones
    // looks like a rendering fault rather than a choice.
    const line = { stroke: INK, 'stroke-width': '1.25', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

    // Sun, off to the right and clipped by nothing — the one bright note.
    add('circle', { cx: '258', cy: '30', r: '13', fill: '#FBBC04', ...line });
    // Its little arc of a flight path, which is what stops the composition
    // sitting flat.
    add('path', { d: 'M196 62 C 214 30, 236 26, 244 32', ...line });

    // A pink slab behind the cup, for depth.
    add('path', { d: 'M52 128 L52 96 A 22 22 0 0 1 96 96 L96 128 Z', fill: 'url(#ea-slab)', ...line });

    // The notebook: a leaning page with a sketch on it.
    add('path', { d: 'M170 128 L186 58 L272 58 L256 128 Z', fill: '#fff', ...line });
    add('path', { d: 'M256 128 L272 58', ...line });
    add('rect', { x: '198', y: '76', width: '44', height: '30', rx: '8', ...line });
    add('path', { d: 'M206 100 L222 82 L236 100', ...line });

    // The cup, with a yellow fill that stops short of the rim.
    add('path', { d: 'M104 84 L146 84 L140 126 L110 126 Z', fill: 'url(#ea-cup)', ...line });
    add('path', { d: 'M146 92 C 160 92, 160 108, 146 108', ...line });
    // Steam.
    add('path', { d: 'M119 76 C 114 70, 124 66, 119 60', ...line });
    add('path', { d: 'M131 74 C 126 68, 136 64, 131 58', ...line });

    // The pencil, leaning across the notebook.
    add('path', { d: 'M158 128 L188 46', ...line });
    add('path', { d: 'M188 46 L196 50 L166 132 L158 128 Z', fill: '#4285F4', ...line });
    add('path', { d: 'M158 128 L166 132 L160 140 Z', fill: INK });

    // The desk. Drawn last so it sits over the feet of everything on it.
    add('path', { d: 'M28 128 L272 128', ...line });
    return svg;
  }

  /** Repaint the date row in place, so paging does not rebuild the whole page. */
  const paintDate = (): void => {
    s = slot(viewing);
    const t = col.querySelector<HTMLElement>('.date-title');
    if (t) t.textContent = s.day;
    todayPill.style.display = isToday(viewing) ? 'none' : 'inline-flex';
    const days = [...col.querySelectorAll<HTMLElement>('.day')];
    s.week.forEach((d, i) => {
      const cell = days[i];
      if (!cell) return;
      const sel = d.iso === dayKey(viewing);
      cell.setAttribute('aria-current', sel ? 'true' : 'false');
      const egg = marks.get(d.iso);
      cell.setAttribute('aria-label', sel ? 'Selected' : d.full + (egg ? ', ' + egg.title : ''));
      const nameEl = cell.querySelector('.day-name');
      const numEl = cell.querySelector('.day-num');
      if (nameEl) nameEl.textContent = d.n;
      if (numEl) numEl.textContent = String(d.d);
      cell.onclick = () => switchDay(new Date(d.iso + 'T12:00:00'));
      cell.querySelector('.cal-dot')?.remove();
      if (egg) cell.appendChild(h('span', { class: 'cal-dot', 'aria-hidden': 'true' }));
    });
  };

  /**
   * Move to another day. Meet shows a SHORT wavy arc here rather than the long
   * one it uses for a cold start — the indicator is telling you how much work is
   * happening, and switching days is cheap. Reproduced with the same parameter.
   */
  let switching = 0;
  const switchDay = (d: Date): void => {
    viewing = d;
    closeCal();
    paintDate();
    const ticket = ++switching;
    clear(dayBody);
    const pad = h('div', { class: 'load-pad load-pad-sm' });
    pad.appendChild(spinner(true));
    dayBody.appendChild(pad);
    window.setTimeout(() => { if (ticket === switching) paintDay(); }, DAY_SWITCH_MS);
  };

  // --- the month picker, fetched the first time it is opened ---------------
  let calEl: (HTMLElement & { dispose?: () => void }) | null = null;
  const closeCal = (): void => {
    calEl?.dispose?.();
    calEl?.remove();
    calEl = null;
  };
  const toggleCal = async (): Promise<void> => {
    if (calEl) { closeCal(); return; }
    const btn = col.querySelector<HTMLElement>('.cal-btn');
    if (!btn) return;
    const { calendar } = await import('./calendar.js');
    const pop = calendar({
      selected: viewing,
      marks,
      onPick: (d) => switchDay(d),
      onClose: () => closeCal(),
    }) as HTMLElement & { dispose?: () => void };
    // Anchored to the button, 8px below it, in the column's own coordinates.
    const b = btn.getBoundingClientRect();
    const c = col.getBoundingClientRect();
    pop.style.left = `${Math.round(b.left - c.left)}px`;
    pop.style.top = `${Math.round(b.bottom - c.top + 8)}px`;
    calEl = pop;
    col.appendChild(pop);
  };

  const interviewCard = (): HTMLElement => h(
    'button',
    {
      // is-primary is Meet's selected-meeting size, not just its colour.
      class: 'sched-card is-primary ring-host',
      type: 'button',
      onclick: () => store.dispatch({ t: 'screen', screen: 'lobby' }),
    },
    focusRing(),
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
  );

  const eggCard = (egg: Egg): HTMLElement => h(
    'button',
    {
      class: 'sched-card ring-host',
      type: 'button',
      'aria-label': egg.title,
      onclick: () => { location.hash = '#egg/' + egg.id; store.dispatch({ t: 'screen', screen: 'lobby' }); },
    },
    focusRing(),
    h(
      'div',
      {},
      h('div', { class: 'sched-when' }, h('span', { class: 'sched-time' }, 'All day')),
      h('div', { class: 'sched-title' }, egg.title),
      h('div', { class: 'sched-sub' }, egg.blurb),
    ),
    h('span', { class: 'sched-join' }, 'Join'),
  );

  const emptyDay = (): HTMLElement => h(
    'div',
    { class: 'empty-day' },
    // Meet ships an illustration here. This draws its own rather than borrowing
    // one: a week of empty rows, with the selected day left blank.
    h('div', { class: 'empty-art', 'aria-hidden': 'true' }, emptyArt()),
    h('p', { class: 'empty-h' }, 'No meetings were scheduled on this day'),
    h('p', { class: 'empty-s' }, 'Your calendar for this day was clear'),
    h(
      'button',
      {
        class: 'm-btn m-tonal m-new',
        type: 'button',
        'aria-label': 'New meeting',
        onclick: () => store.dispatch({ t: 'screen', screen: 'lobby' }),
      },
      sym('video_call', 20),
      h('span', { class: 'm-new-label' }, 'New'),
    ),
  );

  const paintDay = (): void => {
    clear(dayBody);
    const egg = marks.get(dayKey(viewing));
    if (isToday(viewing)) {
      dayBody.appendChild(h('div', { class: 'sched-label' }, 'Scheduled'));
      dayBody.appendChild(interviewCard());
      dayBody.appendChild(h(
        'p',
        { class: 'sched-note' },
        'One participant. He has been waiting since March, when the CV was last updated.',
      ));
      dayBody.appendChild(hint);
    } else if (egg) {
      dayBody.appendChild(h('div', { class: 'sched-label' }, 'Scheduled'));
      dayBody.appendChild(eggCard(egg));
      dayBody.appendChild(h('p', { class: 'sched-note' }, 'Not work. Join anyway.'));
    } else {
      dayBody.appendChild(emptyDay());
    }
    const card = dayBody.querySelector<HTMLElement>('.sched-card');
    if (card) { selectedCard = card; isSelected = true; showRing(card); card.focus({ preventScroll: true }); }
  };

  const col = h(
    'div',
    { class: 'home-col' },
    h(
      'div',
      { class: 'date-row' },
      h('h1', { class: 'date-title' }, s.day),
      // Meet has a real control here, not decoration: a 40x40 button at radius
      // 20 with a #444746 state layer and a tooltip. Ours was a bare glyph.
      h(
        'button',
        { class: 'icon-btn cal-btn', type: 'button', 'aria-label': 'Open calendar', onclick: () => void toggleCal() },
        sym('calendar_month', 20),
      ),
      // Only exists when you have wandered off today, which is exactly when it
      // is useful. Meet does the same.
      todayPill,
      h(
        'div',
        { class: 'week' },
        h(
          'button',
          {
            class: 'icon-btn', type: 'button', 'aria-label': 'Previous week',
            onclick: () => { const d = new Date(viewing); d.setDate(d.getDate() - 7); switchDay(d); },
          },
          sym('chevron_left', 24),
        ),
        ...s.week.map((d) => {
          const egg = marks.get(d.iso);
          const cell = h(
            'button',
            {
              class: 'day',
              type: 'button',
              'aria-current': d.d === s.date ? 'true' : 'false',
              // Meet labels each column with the full date, and tips today as
              // "Selected" rather than repeating it. Both measured.
              'aria-label': d.d === s.date ? 'Selected' : d.full + (egg ? ', ' + egg.title : ''),
              onclick: () => switchDay(new Date(d.iso + 'T12:00:00')),
            },
            h('span', { class: 'day-name' }, d.n),
            h('span', { class: 'day-num' }, String(d.d)),
          );
          // The teaching mark. One egg always lands inside the current week, so
          // this dot is on screen the first time anyone looks at the page —
          // which is how the calendar's dots become legible later.
          if (egg) cell.appendChild(h('span', { class: 'cal-dot', 'aria-hidden': 'true' }));
          return cell;
        }),
        h(
          'button',
          {
            class: 'icon-btn', type: 'button', 'aria-label': 'Next week',
            onclick: () => { const d = new Date(viewing); d.setDate(d.getDate() + 7); switchDay(d); },
          },
          sym('chevron_right', 24),
        ),
      ),
    ),

    // Meet's own promo banner slot, used for the thing a recruiter actually
    // needs: the boring version of this document.
    //
    // It is inside a collapsing wrapper because of the order the real product
    // paints in: the meeting list lands first, then the promo appears above it
    // and pushes it down. Meet ships that layout shift; so does this.
    h(
      'div',
      { class: 'banner-slot' },
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
    ),

    dayBody,

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

  const slotEl = col.querySelector<HTMLElement>('.banner-slot')!;
  const main = h('main', { class: 'home-main', id: 'main' });
  wireSelection();
  todayPill.style.display = isToday(viewing) ? 'none' : 'inline-flex';

  // The drawer. A scrim sits under it so a tap outside closes it, which is what
  // the real one does, and Escape closes it too because a drawer that traps you
  // is worse than no drawer.
  const scrim = h('div', { class: 'rail-scrim' });
  const menuBtn = bar.querySelector<HTMLElement>('.menu-btn')!;
  const setDrawer = (open: boolean): void => {
    rail.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  menuBtn.addEventListener('click', () => setDrawer(!rail.classList.contains('open')));
  scrim.addEventListener('click', () => setDrawer(false));
  rail.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.rail-item')) setDrawer(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rail.classList.contains('open')) setDrawer(false);
  });

  const openBanner = (): void => {
    boot = 'done';
    slotEl.classList.add('open');
  };

  /**
   * The wordmark goes first, and alone. Nothing else on screen is moving by this
   * point and nothing else starts moving until it has finished — which is the
   * whole reason the joke reads at all. The promo follows after GAG_MS.
   */
  const playGag = (): void => {
    if (gagStarted) { openBanner(); return; }
    gagStarted = true;
    playLockup(bar);
    window.setTimeout(openBanner, GAG_MS);
  };
  const showList = (): void => {
    boot = 'listed';
    clear(main);
    col.classList.add('enter');
    main.appendChild(col);
    paintDay();
    window.setTimeout(playGag, BOOT_BANNER);
  };

  if (body) {
    // A different tab inside the same shell: no day view, no boot sequence, and
    // the rail shows Calls as current.
    boot = 'done';
    main.appendChild(body);
    if (!reducedMotion) settleLockup(bar);
    const items = rail.querySelectorAll('.rail-item');
    items[0]?.setAttribute('aria-current', 'false');
    items[1]?.setAttribute('aria-current', 'true');
  } else if (reducedMotion || boot === 'done') {
    boot = 'done';
    main.appendChild(col);
    slotEl.classList.add('open');
    // The gag has already been seen this page load, so this fresh lockup goes
    // straight to its end state rather than sitting at "Google Meet".
    if (!reducedMotion) settleLockup(bar);
    paintDay();
  } else if (boot === 'listed') {
    // Re-rendered between the list landing and the promo arriving: show the
    // list, and let the promo still make its entrance.
    main.appendChild(col);
    paintDay();
    window.setTimeout(playGag, BOOT_BANNER);
  } else {
    main.appendChild(h('div', { class: 'load-pad' }, spinner()));
    window.setTimeout(() => { if (main.isConnected) showList(); }, BOOT_SPIN);
  }

  const wrap = h(
    'div',
    { class: 'home' },
    bar,
    h('div', { class: 'home-body' }, rail, scrim, main),
  );

  // Tooltips, on the same things the real product tips — which notably does
  // NOT include the rail items. Meetings and Calls carry a visible label, so a
  // tooltip repeating it would be noise, and Meet leaves them alone.
  tipAll(...bar.querySelectorAll<HTMLElement>('.icon-btn, .avatar-btn, .lockup'));
  // The New button is the one control whose tooltip is NOT its accessible name:
  // Meet labels it "New meeting" for screen readers and tips it as just "New".
  // Falling back to the label gave us "New meeting" in the bubble.
  tip(bar.querySelector<HTMLElement>('.m-new')!, 'New');
  tip(wrap.querySelector<HTMLElement>('.composer-pill')!, 'Enter a code or link');
  // Touching Join dismisses the field's tooltip rather than leaving it up — and
  // leaving Join re-arms it, because moving back onto the field is movement
  // inside the field and fires no pointerenter of its own.
  const pillEl = wrap.querySelector<HTMLElement>('.composer-pill')!;
  const joinEl = wrap.querySelector<HTMLElement>('.composer-join');
  joinEl?.addEventListener('pointerenter', hideTip);
  joinEl?.addEventListener('pointerleave', () => rearm(pillEl));
  // Above, not below: the week strip tips upward because downward would land on
  // the meeting list. The day columns get one too — including today, whose
  // label is the word "Selected".
  // Queried off `col`, not `main`: during the boot sequence main holds the
  // spinner and col is not attached yet, so querying main finds nothing and
  // tip() gets handed a null.
  // Above, not below: the whole date row tips upward, because downward would
  // land on the meeting list.
  //
  // And NOT the day columns. Measured twice, cold and primed, hovering a
  // non-today day for 1.3s produces nothing at all. Only the two arrows, the
  // calendar button, and today — whose tooltip reads "Selected" rather than
  // repeating the date. Tipping all seven was an invention.
  tipAllAbove(...col.querySelectorAll<HTMLElement>('.week .icon-btn'));
  tipAllAbove(col.querySelector<HTMLElement>('.day[aria-current="true"]'));
  tipAllAbove(col.querySelector<HTMLElement>('.cal-btn'));

  // Focus the code field only when someone has clearly come to type in it.
  if (location.hash === '#home') clear(hint);
  return wrap;
}
