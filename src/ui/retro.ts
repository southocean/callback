// The Retro tab: the application log, behind the admin gate.
//
// Board ticket N269. Named "Retro" rather than "Lessons" or "Applications"
// because it is the one word that fits the drawer it sits in -- Scripts,
// Collection, The gate, Settings -- and tells a stranger who glimpses the tab
// strip nothing at all. Every engineer reads it as a sprint retrospective.
//
// A table, a form, and two clipboard controls. No framework, same as everything
// else here. It edits a working copy in localStorage; the committed entries are
// the seed in data/applications.ts, and that file has the note on which wins.

import { h, clear } from '../dom.js';
import {
  readLog, writeLog, blankEntry, OUTCOMES,
  type Application, type Outcome,
} from '../data/applications.js';

/** A cell that is a link when there is somewhere to go, and text when there is not. */
const linked = (text: string, url: string): HTMLElement =>
  (url
    ? h('a', { href: url, target: '_blank', rel: 'noopener' }, text || url)
    : h('span', {}, text || '—'));

export function retroView(): HTMLElement {
  let log = readLog();
  /** The entry the form is editing, or null when the form is closed. */
  let editing: Application | null = null;

  const table = h('div', { class: 'rt-table' }) as HTMLElement;
  const formWrap = h('div', {}) as HTMLElement;
  const note = h('p', { class: 'dp-note' }) as HTMLElement;

  const save = (): void => {
    writeLog(log);
    paint();
  };

  /* ------------------------------------------------------------- the form -- */

  const field = (label: string, value: string, onInput: (v: string) => void, type = 'text'): HTMLElement => {
    const input = h('input', { class: 'rt-in', type, value }) as HTMLInputElement;
    input.addEventListener('input', () => onInput(input.value));
    return h('label', { class: 'rt-field' }, h('span', {}, label), input);
  };

  const openForm = (entry: Application, isNew: boolean): void => {
    editing = { ...entry, lessons: [...entry.lessons] };
    clear(formWrap);
    const e = editing;

    const pick = h('select', { class: 'rt-in' }) as HTMLSelectElement;
    for (const o of OUTCOMES) {
      const opt = h('option', { value: o.id }, o.label) as HTMLOptionElement;
      if (o.id === e.outcome) opt.selected = true;
      pick.appendChild(opt);
    }
    pick.addEventListener('change', () => { e.outcome = pick.value as Outcome; });

    const lessons = h('textarea', { class: 'rt-in rt-area', rows: '5' }) as HTMLTextAreaElement;
    lessons.value = e.lessons.join('\n');
    // One lesson per line. A list is what the data wants and a textarea is what
    // a person wants, so the split happens here rather than in the shape.
    lessons.addEventListener('input', () => {
      e.lessons = lessons.value.split('\n').map((l) => l.trim()).filter(Boolean);
    });

    formWrap.appendChild(h('div', { class: 'rt-form' },
      h('div', { class: 'rt-grid' },
        field('Company', e.company, (v) => { e.company = v; }),
        field('Role, as they advertise it', e.role, (v) => { e.role = v; }),
        field('Posting URL', e.url, (v) => { e.url = v; }),
        field('CV sent (a jobs/ name, or blank for the generic one)', e.cv, (v) => { e.cv = v; }),
        field('Applied on', e.applied, (v) => { e.applied = v; }, 'date'),
        h('label', { class: 'rt-field' }, h('span', {}, 'Where it got to'), pick),
      ),
      h('label', { class: 'rt-field rt-wide' },
        h('span', {}, 'What to do differently, one per line'), lessons),
      h('div', { class: 'rt-actions' },
        h('button', {
          class: 'm-btn m-filled', type: 'button',
          onclick: () => {
            if (!e.company.trim()) { note.textContent = 'An entry needs a company name.'; return; }
            if (isNew) log.push(e);
            else log = log.map((x) => (x.id === e.id ? e : x));
            editing = null;
            note.textContent = '';
            save();
          },
        }, isNew ? 'Add' : 'Save'),
        h('button', {
          class: 'm-btn m-outlined', type: 'button',
          onclick: () => { editing = null; note.textContent = ''; paint(); },
        }, 'Cancel'),
      ),
    ));
  };

  /* ------------------------------------------------------------ the table -- */

  const paintTable = (): void => {
    clear(table);
    if (!log.length) {
      table.appendChild(h('p', { class: 'dp-note' },
        'Nothing logged yet. Add an entry, or paste a backup in below.'));
      return;
    }

    table.appendChild(h('div', { class: 'rt-row rt-head' },
      h('span', {}, 'Company'), h('span', {}, 'Role'), h('span', {}, 'CV'),
      h('span', {}, 'Applied'), h('span', {}, 'Where it got to'), h('span', {}, '')));

    for (const a of log) {
      const outcome = OUTCOMES.find((o) => o.id === a.outcome);
      const row = h('div', { class: `rt-row is-${a.outcome}` },
        h('span', {}, a.company),
        linked(a.role, a.url),
        h('span', {}, a.cv || 'generic'),
        h('span', {}, a.applied || '—'),
        h('span', { class: 'rt-pill' }, outcome ? outcome.label : a.outcome),
        h('span', { class: 'rt-rowbtns' },
          h('button', {
            class: 'm-btn m-outlined', type: 'button',
            onclick: () => { openForm(a, false); },
          }, 'Edit'),
          h('button', {
            class: 'm-btn m-outlined', type: 'button',
            // No confirm dialog: one entry is cheap to retype and the Copy
            // control above is the real undo. A modal per delete would be the
            // heavier thing in a tool used by one person.
            onclick: () => { log = log.filter((x) => x.id !== a.id); save(); },
          }, 'Delete'),
        ),
      );
      table.appendChild(row);

      if (a.lessons.length) {
        table.appendChild(h('ul', { class: 'rt-lessons' },
          ...a.lessons.map((l) => h('li', {}, l))));
      }
    }
  };

  /* -------------------------------------------------------- copy and paste -- */

  const paste = h('textarea', {
    class: 'rt-in rt-area', rows: '3',
    placeholder: 'Paste a backup here, then press Replace.',
  }) as HTMLTextAreaElement;

  const copyBtn = h('button', {
    class: 'm-btn m-outlined', type: 'button',
    onclick: () => {
      void navigator.clipboard?.writeText(JSON.stringify(log, null, 2)).then(
        () => { copyBtn.textContent = 'Copied'; },
        () => { copyBtn.textContent = 'Clipboard blocked'; },
      );
    },
  }, 'Copy the log') as HTMLButtonElement;

  const replaceBtn = h('button', {
    class: 'm-btn m-outlined', type: 'button',
    onclick: () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(paste.value);
      } catch {
        note.textContent = 'That is not valid JSON, so nothing was changed.';
        return;
      }
      if (!Array.isArray(parsed)) {
        note.textContent = 'A backup is a JSON array, so nothing was changed.';
        return;
      }
      log = parsed as Application[];
      paste.value = '';
      note.textContent = `Replaced with ${log.length} entr${log.length === 1 ? 'y' : 'ies'}.`;
      save();
    },
  }, 'Replace') as HTMLButtonElement;

  /* ------------------------------------------------------------------ paint */

  function paint(): void {
    paintTable();
    clear(formWrap);
    if (editing) openForm(editing, !log.some((x) => x.id === editing!.id));
    copyBtn.textContent = 'Copy the log';
  }

  paint();

  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      'Every application, the CV that went with it, and what it taught. The last column is the '
      + 'point of the page: a rejection with nothing written next to it is a thing that happened '
      + 'rather than a thing learned.'),
    h('p', { class: 'dp-note' },
      'Committed entries live in data/applications.ts and this browser holds the working copy, '
      + 'which wins while it exists. Anyone can read the committed ones: they are in a public '
      + 'repo and in the shipped JavaScript, and the admin gate hides a tab rather than keeping '
      + 'a secret. Copy the log to get JSON to paste back into that file.'),
    h('div', { class: 'rt-actions' },
      h('button', {
        class: 'm-btn m-filled', type: 'button',
        onclick: () => { openForm(blankEntry(), true); },
      }, 'Add an application'),
      copyBtn,
    ),
    note,
    formWrap,
    table,
    h('details', { class: 'rt-restore' },
      h('summary', {}, 'Restore from a backup'),
      paste,
      h('div', { class: 'rt-actions' }, replaceBtn),
    ),
  );
}
