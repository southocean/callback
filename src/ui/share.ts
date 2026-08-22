// Screen share — the augmented one.
//
// This is NOT a clone of a Meet surface, and it is not a real share. Chrome's
// picker is a native dialog: it never appears in a tab screenshot and cannot be
// read from the page, so there was nothing to measure. What it is instead is our
// own mockup of that dialog, offering content we author and present as though
// the browser had rendered it.
//
// Which is the whole point. Nam's word for this screen is a gold mine, and the
// reason is that a recruiter who presses Share screen sees exactly what we
// choose: the work, the job ad with the boxes ticked, the things that are
// otherwise a bullet on a page.
//
// WHY NOT IFRAMES, since that was the first instinct. The page ships
// `default-src 'none'` with no `frame-src`, so every iframe is blocked outright
// — and `frame-ancestors 'none'` means the page cannot even frame itself. The
// choice was to weaken the policy or to render the content as DOM. DOM won: all
// of this is our own content anyway, so an iframe would have bought nothing but
// a hole in the CSP and a second copy of the stylesheet.
//
// WHAT IS NOT CLONED, and must not be invented: what a live share does to Meet's
// own layout — the presenting banner, how the tiles rearrange, where the stop
// control goes — was never measured, because completing a share needs the native
// dialog driven. The presenting state below is therefore OURS, built in the
// language of the rest of the call rather than copied from a screen nobody read.

import { h, clear, icon, icons } from '../dom.js';
import { ripple } from './gm3.js';
import { trapFocus } from '../a11y.js';
import { profile, pitch, roles, caseStudies, requirementMap } from '../data/cv.js';

export type ShareKind = 'tab' | 'window' | 'screen';

export interface Source {
  id: string;
  kind: ShareKind;
  title: string;
  /** The address line, for tabs. Windows and screens have none. */
  host?: string;
}

const TABS: Source[] = [
  { id: 'cv', kind: 'tab', title: 'Nam Nguyen — Senior SWE, Web Development', host: 'southocean.github.io' },
  { id: 'jobad', kind: 'tab', title: 'Google Careers — the posting, line by line', host: 'careers.google.com' },
  { id: 'work', kind: 'tab', title: 'Four things I built, and what broke', host: 'southocean.github.io' },
  { id: 'riichi', kind: 'tab', title: 'Riichi Mahjong — real-time client', host: 'localhost:5173' },
];

const WINDOWS: Source[] = [
  { id: 'files', kind: 'window', title: 'Files — Work' },
];

const SCREENS: Source[] = [
  { id: 'desktop', kind: 'screen', title: 'Screen 1' },
];

const GROUPS: { key: ShareKind; label: string; items: Source[] }[] = [
  { key: 'tab', label: 'Chrome Tab', items: TABS },
  { key: 'window', label: 'Window', items: WINDOWS },
  { key: 'screen', label: 'Entire Screen', items: SCREENS },
];

/**
 * The picker. Modelled on Chrome's own share dialog — the three tabs, the source
 * list, the preview beside it, the tab-audio toggle, Share and Cancel — but it
 * is a drawing of that dialog, not the dialog.
 */
export function renderPicker(o: { onShare: (s: Source) => void; onCancel: () => void }): HTMLElement {
  let kind: ShareKind = 'tab';
  let picked: Source | null = TABS[0] ?? null;

  const list = h('div', { class: 'sp-list', role: 'listbox', 'aria-label': 'Sources' });
  const preview = h('div', { class: 'sp-preview' });
  const shareBtn = h('button', { class: 'sp-share', type: 'button' }, 'Share') as HTMLButtonElement;
  ripple(shareBtn);

  const tabRow = h('div', { class: 'sp-tabs', role: 'tablist' });
  const tabBtns = GROUPS.map((g) => {
    const b = h('button', {
      class: 'sp-tab', type: 'button', role: 'tab', 'aria-selected': String(g.key === kind),
    }, g.label) as HTMLButtonElement;
    b.addEventListener('click', () => {
      kind = g.key;
      picked = g.items[0] ?? null;
      paint();
    });
    tabRow.appendChild(b);
    return b;
  });

  function paintPreview(): void {
    clear(preview);
    if (!picked) return;
    preview.append(
      h('div', { class: 'sp-thumb' }, thumbFor(picked)),
      h('p', { class: 'sp-cap' }, picked.title),
    );
  }

  function paint(): void {
    GROUPS.forEach((g, i) => tabBtns[i]?.setAttribute('aria-selected', String(g.key === kind)));
    clear(list);
    const items = GROUPS.find((g) => g.key === kind)?.items ?? [];
    for (const src of items) {
      const row = h('button', {
        class: 'sp-row', type: 'button', role: 'option',
        'aria-selected': String(picked?.id === src.id),
      },
        h('span', { class: 'sp-fav', 'aria-hidden': 'true' }, favFor(src)),
        h('span', { class: 'sp-row-t' },
          h('b', {}, src.title),
          src.host ? h('span', {}, src.host) : null),
      ) as HTMLButtonElement;
      ripple(row);
      row.addEventListener('click', () => { picked = src; paint(); });
      list.appendChild(row);
    }
    shareBtn.disabled = !picked;
    paintPreview();
  }

  const cancelBtn = h('button', { class: 'sp-cancel', type: 'button' }, 'Cancel') as HTMLButtonElement;
  ripple(cancelBtn);
  cancelBtn.addEventListener('click', () => o.onCancel());
  shareBtn.addEventListener('click', () => { if (picked) o.onShare(picked); });

  const panel = h('div', {
    class: 'sp', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose what to share',
  },
    h('h2', { class: 'sp-h' }, 'Choose what to share with meet.google.com'),
    h('p', { class: 'sp-s' }, 'The site will be able to see the contents of your screen'),
    tabRow,
    h('div', { class: 'sp-body' }, list, preview),
    h('div', { class: 'sp-foot' },
      h('label', { class: 'sp-audio' },
        h('input', { type: 'checkbox', checked: 'checked' }),
        h('span', {}, 'Also share tab audio')),
      h('div', { class: 'sp-acts' }, cancelBtn, shareBtn)),
  );

  paint();

  const scrim = h('div', { class: 'sp-scrim' }, panel);
  const release = trapFocus(panel, () => o.onCancel());
  scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) o.onCancel(); });
  (scrim as HTMLElement & { dispose?: () => void }).dispose = release;
  return scrim;
}

/** A tiny drawing per source, so the preview is not an empty grey box. */
function thumbFor(src: Source): HTMLElement {
  if (src.kind === 'tab') {
    return h('div', { class: 'sp-thumb-page' },
      h('div', { class: 'sp-thumb-bar' }),
      h('div', { class: 'sp-thumb-line', style: 'width:70%' }),
      h('div', { class: 'sp-thumb-line', style: 'width:48%' }),
      h('div', { class: 'sp-thumb-line', style: 'width:60%' }));
  }
  return h('div', { class: 'sp-thumb-page sp-thumb-desk' },
    h('div', { class: 'sp-thumb-win' }), h('div', { class: 'sp-thumb-win sp-thumb-win2' }));
}

function favFor(src: Source): Element {
  if (src.kind !== 'tab') return icon(icons.doc, 16);
  return h('span', { class: 'sp-fav-dot' }, src.title.slice(0, 1));
}

/**
 * What the call shows once something is "shared". Chrome frames a tab, so a
 * shared tab gets browser chrome around it; a window and a screen do not.
 */
export function renderShared(src: Source): HTMLElement {
  const body = contentFor(src);
  if (src.kind === 'tab') {
    return h('div', { class: 'shot shot-tab' },
      h('div', { class: 'shot-chrome' },
        h('div', { class: 'shot-tabs' },
          h('span', { class: 'shot-tab-pill' }, src.title),
        ),
        h('div', { class: 'shot-omni' },
          icon(icons.copy, 14),
          h('span', {}, (src.host ?? '') + '/'),
        )),
      h('div', { class: 'shot-page' }, body));
  }
  return h('div', { class: 'shot shot-desk' }, body);
}

function contentFor(src: Source): HTMLElement {
  switch (src.id) {
    case 'cv': return pageCv();
    case 'jobad': return pageJobAd();
    case 'work': return pageWork();
    case 'riichi': return pageRiichi();
    default: return pageDesktop();
  }
}

// --------------------------------------------------------------- the pages --
// All of this is real content from src/data/cv.ts. Nothing here is invented for
// the sake of filling a mockup — if it says he did something, the CV says so too.

function pageCv(): HTMLElement {
  return h('div', { class: 'pg' },
    h('h1', { class: 'pg-h' }, profile.name),
    h('p', { class: 'pg-sub' }, `${profile.headline} · ${profile.place}`),
    h('p', { class: 'pg-lead' }, pitch),
    h('div', { class: 'pg-roles' },
      ...roles.slice(0, 4).map((r) => h('div', { class: 'pg-role' },
        h('b', {}, r.title),
        h('span', {}, `${r.org} · ${r.from}–${r.to ?? 'present'}`)))),
  );
}

function pageJobAd(): HTMLElement {
  return h('div', { class: 'pg' },
    h('h1', { class: 'pg-h' }, 'The posting, line by line'),
    h('p', { class: 'pg-sub' }, profile.target),
    h('ul', { class: 'pg-reqs' },
      ...requirementMap.map((r) => h('li', { class: `pg-req is-${r.strength}` },
        h('span', { class: 'pg-tick', 'aria-hidden': 'true' }, r.strength === 'honest' ? '–' : '✓'),
        h('span', {}, h('b', {}, r.req), h('span', {}, r.evidence))))),
  );
}

function pageWork(): HTMLElement {
  return h('div', { class: 'pg' },
    h('h1', { class: 'pg-h' }, 'Four things I built'),
    h('div', { class: 'pg-cards' },
      ...caseStudies.slice(0, 4).map((c) => h('div', { class: 'pg-card' },
        h('b', {}, c.title),
        h('span', {}, c.problem)))),
  );
}

function pageRiichi(): HTMLElement {
  // A drawing of the board, not the client. The real one does not run here.
  const wall = (n: number): HTMLElement[] =>
    Array.from({ length: n }, () => h('span', { class: 'mj-tile' }));
  return h('div', { class: 'pg pg-mj' },
    h('div', { class: 'mj-board' },
      h('div', { class: 'mj-side mj-top' }, ...wall(9)),
      h('div', { class: 'mj-mid' },
        h('div', { class: 'mj-side mj-left' }, ...wall(6)),
        h('div', { class: 'mj-centre' }, h('span', {}, 'East'), h('b', {}, '25,000')),
        h('div', { class: 'mj-side mj-right' }, ...wall(6))),
      h('div', { class: 'mj-side mj-hand' }, ...wall(13))),
    h('p', { class: 'pg-note' },
      'Riichi client — real-time state shared across four seats. A drawing of it: the real one needs a server.'),
  );
}

function pageDesktop(): HTMLElement {
  const folder = (name: string, n: number): HTMLElement =>
    h('div', { class: 'dk-item' },
      h('span', { class: 'dk-folder', 'aria-hidden': 'true' }),
      h('span', { class: 'dk-name' }, name),
      h('span', { class: 'dk-count' }, String(n)));
  return h('div', { class: 'dk' },
    h('div', { class: 'dk-win' },
      h('div', { class: 'dk-bar' },
        h('span', { class: 'dk-dot' }), h('span', { class: 'dk-dot' }), h('span', { class: 'dk-dot' }),
        h('span', { class: 'dk-title' }, 'Work')),
      h('div', { class: 'dk-cols' },
        h('div', { class: 'dk-tree' },
          folder('Real-time client', 4),
          folder('Tools', 6),
          folder('This CV', 1),
          folder('Off the clock', 7)),
        h('div', { class: 'dk-files' },
          h('div', { class: 'dk-file' }, icon(icons.doc, 18), h('span', {}, 'NamNguyen_CV_2026.pdf')),
          h('div', { class: 'dk-file' }, icon(icons.doc, 18), h('span', {}, 'requirement-map.md')),
          h('div', { class: 'dk-file' }, icon(icons.doc, 18), h('span', {}, 'measured-spec.md'))))),
  );
}
