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
import { tip, tipAll, tipAllAbove, hideTip } from './tooltip.js';
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
const BOOT_BANNER = 800; // then the promo arrives and shoves the list down

/** The interview is always "now", whenever you happen to open this. */
function slot(): { day: string; date: number; label: string; week: { n: string; d: number; full: string }[] } {
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
  const week: { n: string; d: number; full: string }[] = [];
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
    });
  }
  return {
    day: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    date: now.getDate(),
    label: `${fmt(start)} – ${fmt(end)}`,
    week,
  };
}

export function renderHome(store: Store, reducedMotion = false): HTMLElement {
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
    lockup(reducedMotion, () => store.dispatch({ t: 'screen', screen: 'home' })),
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
        'New',
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
        onclick: () => store.dispatch({ t: 'plain', on: true }),
      },
      h('span', { class: 'rail-pill' }, sym('description', 24)),
      h('span', { class: 'rail-label' }, 'CV'),
    ),
  );

  // --- main ----------------------------------------------------------------

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
        { class: 'icon-btn cal-btn', type: 'button', 'aria-label': 'Open calendar' },
        sym('calendar_month', 20),
      ),
      h(
        'div',
        { class: 'week' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous week' }, sym('chevron_left', 24)),
        ...s.week.map((d) =>
          h(
            'button',
            {
              class: 'day',
              type: 'button',
              'aria-current': d.d === s.date ? 'true' : 'false',
              // Meet labels each column with the full date, and tips today as
              // "Selected" rather than repeating it. Both measured.
              'aria-label': d.d === s.date ? 'Selected' : d.full,
            },
            h('span', { class: 'day-name' }, d.n),
            h('span', { class: 'day-num' }, String(d.d)),
          ),
        ),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next week' }, sym('chevron_right', 24)),
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

    h('div', { class: 'sched-label' }, 'Scheduled'),
    h(
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

  const slotEl = col.querySelector<HTMLElement>('.banner-slot')!;
  const card = col.querySelector<HTMLButtonElement>('.sched-card')!;
  const main = h('main', { class: 'home-main', id: 'main' });
  wireSelection();

  /**
   * Select the meeting you are most likely to want, the way Meet does on load.
   *
   * This used to lean entirely on :focus-visible, which was elegant — alt-tab
   * hiding the ring, returning replaying it, clicking away clearing it, all for
   * free. It stopped working when the boot sequence moved the focus call from
   * ~80ms to ~900ms after load: Chrome only grants :focus-visible when the last
   * input modality was a keyboard, and in nine hundred milliseconds the pointer
   * has usually moved, so the ring silently never appeared.
   *
   * So the selection is explicit now, and the three behaviours are wired by
   * hand rather than inherited. Focus still moves, for keyboard and screen
   * reader users; the ring is no longer contingent on it.
   */
  const selectPrimary = (): void => {
    selectedCard = card;
    isSelected = true;
    showRing(card);
    card.focus({ preventScroll: true });
  };

  const openBanner = (): void => {
    boot = 'done';
    slotEl.classList.add('open');
    // Only now does the wordmark do its trick. Everything else has stopped
    // moving, so it is the one thing on screen that is.
    playLockup(bar);
  };
  const showList = (): void => {
    boot = 'listed';
    clear(main);
    col.classList.add('enter');
    main.appendChild(col);
    selectPrimary();
    window.setTimeout(openBanner, BOOT_BANNER);
  };

  if (reducedMotion || boot === 'done') {
    boot = 'done';
    main.appendChild(col);
    slotEl.classList.add('open');
    // The gag has already been seen this page load, so this fresh lockup goes
    // straight to its end state rather than sitting at "Google Meet".
    if (!reducedMotion) settleLockup(bar);
    selectPrimary();
  } else if (boot === 'listed') {
    // Re-rendered between the list landing and the promo arriving: show the
    // list, and let the promo still make its entrance.
    main.appendChild(col);
    selectPrimary();
    window.setTimeout(openBanner, BOOT_BANNER);
  } else {
    main.appendChild(h('div', { class: 'load-pad' }, spinner()));
    window.setTimeout(() => { if (main.isConnected) showList(); }, BOOT_SPIN);
  }

  const wrap = h(
    'div',
    { class: 'home' },
    bar,
    h('div', { class: 'home-body' }, rail, main),
  );

  // Tooltips, on the same things the real product tips — which notably does
  // NOT include the rail items. Meetings and Calls carry a visible label, so a
  // tooltip repeating it would be noise, and Meet leaves them alone.
  tipAll(...bar.querySelectorAll<HTMLElement>('.icon-btn, .avatar-btn, .lockup, .m-new'));
  tip(wrap.querySelector<HTMLElement>('.composer-pill')!, 'Enter a code or link');
  // Touching Join dismisses the field's tooltip rather than leaving it up.
  wrap.querySelector<HTMLElement>('.composer-join')
    ?.addEventListener('pointerenter', hideTip);
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
