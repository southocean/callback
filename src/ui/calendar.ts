// The month picker, measured off meet.google.com.
//
//   surface        368x404, #f0f4f9, radius 28, raised on a Material 3 level-3
//                  shadow. An earlier pass here wrote down "no shadow, it sits
//                  on the page by colour alone" and that was a misreading: the
//                  popup is a raised surface and the flat copy read as a
//                  painted rectangle.
//   anchor         left-aligned with the calendar button, 8px below it. The
//                  caller mounts it inside the day column, which must be
//                  positioned or the popup detaches from its button.
//   header         month and year, 500 16px/24px, with Previous/Next month as
//                  40x40 icon buttons pushed to the right of the row
//   weekday row    S M T W T F S, 48px columns, 16px/24px, #1f1f1f
//   day cells      48x48
//   selected day   a 40x40 circle at radius 20 filled #0b57d0, centred in its
//                  cell — so the fill is smaller than the hit area
//   weekday tips   each header letter tips its full name. Two Ts and two Ss
//                  are ambiguous on their own; only the column order tells them
//                  apart, and a tooltip saves you counting columns.
//   month paging   Page Up and Page Down, hinted on the two chevrons as
//                  "Previous month (Page Up)"
//
// Loaded on demand: nobody who never opens the calendar pays for it.

import { h, clear } from '../dom.js';
import { sym } from './icons.js';
import { tip } from './tooltip.js';
import { key, type Egg } from '../data/eggs.js';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
// The header letters are ambiguous on their own: two Ts and two Ss, and the
// column order is the only thing telling them apart. The real picker tips each
// one with its full name, so hovering resolves the ambiguity without making you
// count columns. Parallel to WEEKDAYS by index, not derived from it, because
// the initials are not recoverable from the names in every locale.
const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface CalendarOpts {
  /**
   * The button that opened it.
   *
   * Needed because dismiss-on-outside-press and toggle-on-the-button are two
   * rules that fight: a press on the button IS outside the popup, so the popup
   * dismissed itself, and the button's own click then found no popup and opened
   * a fresh one. Three presses, three popups, never a close. As far as dismissal
   * is concerned the anchor is not outside: the button owns the toggle.
   */
  anchor: HTMLElement;
  /** The day currently shown by the page. */
  selected: Date;
  /**
   * Marks. A day in here gets a dot, which is the whole easter-egg mechanic.
   * The value is a list because a day can hold more than one meeting.
   */
  marks: Map<string, Egg[]>;
  onPick: (d: Date) => void;
  onClose: () => void;
}

/**
 * Build the popup. Returns the element; the caller positions and mounts it,
 * because only the caller knows where its anchor is.
 */
export function calendar(o: CalendarOpts): HTMLElement {
  // The month being browsed, which drifts away from the selected day as you
  // page through — that is the point of paging.
  let view = new Date(o.selected.getFullYear(), o.selected.getMonth(), 1);

  const grid = h('div', { class: 'cal-grid', role: 'grid' });
  const title = h('div', { class: 'cal-title' });

  const build = (): void => {
    title.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
    clear(grid);

    WEEKDAYS.forEach((w, i) => {
      // Still aria-hidden: every day cell already carries its own full weekday
      // in its label, so announcing the header as well reads the word twice.
      // The tooltip is for the eye only, which is exactly what it is for here.
      const wd = h('div', { class: 'cal-wd', 'aria-hidden': 'true' }, w);
      tip(wd, WEEKDAY_NAMES[i], 'above');
      grid.appendChild(wd);
    });

    // Start on the Sunday of the week containing the 1st, and always draw six
    // rows, so the popup never changes height as you page through months.
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());

    const todayKey = key(new Date());
    const selKey = key(o.selected);

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = key(d);
      const outside = d.getMonth() !== view.getMonth();
      const marked = o.marks.get(k) ?? [];

      const cell = h(
        'button',
        {
          class: 'cal-day'
            + (outside ? ' is-out' : '')
            + (k === selKey ? ' is-sel' : '')
            + (k === todayKey ? ' is-today' : ''),
          type: 'button',
          role: 'gridcell',
          'aria-label': d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            + marked.map((e) => `, ${e.title}`).join(''),
          'aria-current': k === selKey ? 'date' : 'false',
          onclick: () => o.onPick(d),
        },
        h('span', { class: 'cal-num' }, String(d.getDate())),
      );
      // The mark. Deliberately not a badge or a colour change — a dot reads as
      // "there is something here" without saying what, which is the only way a
      // hunt works. One dot however many meetings the day holds, for the same
      // reason: a count is information the hunt is not supposed to hand over.
      if (marked.length) cell.appendChild(h('span', { class: 'cal-dot', 'aria-hidden': 'true' }));
      grid.appendChild(cell);
    }
  };

  const step = (delta: number): void => {
    view = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    build();
  };

  // data-key, not a longer aria-label: the tooltip reads "Previous month (Page
  // Up)" while a screen reader hears "Previous month", which is how every other
  // shortcut in this build is labelled. See tooltip.ts. The keys are handled in
  // onKey below, because a hint for a key that does nothing is a lie.
  const prev = h(
    'button',
    {
      class: 'icon-btn cal-nav', type: 'button', 'aria-label': 'Previous month',
      'data-key': 'Page Up', onclick: () => step(-1),
    },
    sym('chevron_left', 24),
  );
  const next = h(
    'button',
    {
      class: 'icon-btn cal-nav', type: 'button', 'aria-label': 'Next month',
      'data-key': 'Page Down', onclick: () => step(1),
    },
    sym('chevron_right', 24),
  );
  tip(prev, undefined, 'above');
  tip(next, undefined, 'above');

  const pop = h(
    'div',
    { class: 'cal-pop', role: 'dialog', 'aria-label': 'Choose a date' },
    h('div', { class: 'cal-head' }, title, prev, next),
    grid,
  );

  build();

  // Escape closes, and so does a click anywhere else. Both are attached for the
  // life of the popup and removed with it.
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') { o.onClose(); return; }
    // Paging, as advertised on the two chevrons. preventDefault, or Page Up
    // scrolls the page underneath while the month changes.
    if (e.key === 'PageUp') { e.preventDefault(); step(-1); return; }
    if (e.key === 'PageDown') { e.preventDefault(); step(1); }
  };
  const onDown = (e: Event): void => {
    const t = e.target;
    if (!(t instanceof Node)) return;
    // The anchor counts as part of the popup here. Leaving that press alone for
    // the button's own click handler is what makes a second press close it.
    if (pop.contains(t) || o.anchor.contains(t)) return;
    o.onClose();
  };
  document.addEventListener('keydown', onKey);
  // Deferred a frame as well. The anchor check above is what stops the opening
  // click from closing the popup; this only keeps anything else that shares the
  // opening frame from doing it.
  requestAnimationFrame(() => document.addEventListener('pointerdown', onDown));
  (pop as HTMLElement & { dispose?: () => void }).dispose = () => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onDown);
  };

  return pop;
}
