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
  { id: 'files', kind: 'window', title: 'File Explorer — Work' },
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
export function renderShared(src: Source, onOpen: (id: string) => void = () => {}): HTMLElement {
  const body = contentFor(src, onOpen);
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

/**
 * Nam asked for the Chrome-tab sources to be REAL pages in an iframe, so the
 * responsive UI is actually responsive rather than a drawing of one.
 *
 * Two of the four can be. Our own pages are same-origin, so an iframe of
 * `./#plain` is the real document, laying itself out for whatever width the
 * share frame gives it — which is the point. That needed one CSP change:
 * frame-src 'self' on a policy that shipped default-src 'none'. Scoped to our
 * own origin, so nothing third-party can be framed.
 *
 * careers.google.com cannot be, and not because of our policy: Google serves it
 * with frame-ancestors of its own and the browser will refuse. Nam said he likes
 * the authored version, so that one stays authored — a recreation from the real
 * posting rather than a broken grey box.
 */
function frameOf(hash: string, title: string, fallback: () => HTMLElement): HTMLElement {
  // The authored page renders first and the iframe goes over it. If the frame
  // loads, the drawing is dropped; if it is refused — a policy change, an
  // offline build, anything — the drawing is what stays. A blank grey frame is
  // the one outcome worth engineering away.
  const behind = fallback();
  const f = h('iframe', {
    class: 'pg-frame', src: './' + hash, title,
    loading: 'lazy', referrerpolicy: 'no-referrer',
  }) as HTMLIFrameElement;
  const wrap = h('div', { class: 'pg pg-live' }, behind, f);
  f.addEventListener('load', () => { behind.remove(); wrap.classList.add('is-live'); });
  window.setTimeout(() => { if (!wrap.classList.contains('is-live')) f.remove(); }, 4000);
  return wrap;
}
function contentFor(src: Source, onOpen: (id: string) => void): HTMLElement {
  switch (src.id) {
    // The real thing, framed.
    case 'cv': return frameOf('#plain', 'Nam Nguyen — the CV as a document', pageCv);
    case 'work': return frameOf('#tools/tests', 'Four things I built, and what broke', pageWork);
    // Authored, because the original refuses to be framed.
    case 'jobad': return pageJobAd();
    case 'riichi': return pageRiichi();
    case 'files': return pageWindow(onOpen);
    default: return pageDesktop(onOpen);
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

/**
 * The Explorer window. Nam's note was blunt and correct: ours looked like macOS.
 * It had three traffic-light dots and Finder proportions, on a page whose whole
 * premise is that this machine is a Windows box.
 *
 * So it is Windows now, and the behaviours that come with that are honoured
 * rather than decorated — because they are the established ones, and a window
 * that looks like Explorer and then behaves like nothing is worse than a plain
 * rectangle:
 *
 *   - text does not select (Explorer does not let you drag-select a filename)
 *   - a second click on a selected name renames, as does F2, as does the
 *     context menu — all three, because all three work in Explorer
 *   - Escape cancels a rename, Enter commits
 *   - the window resizes from its bottom-right corner
 *   - double-clicking a file opens the thing it names
 *
 * Opening is the part that matters most: NamNguyen_CV_2026.pdf did nothing at
 * all, which made the whole window a picture of a window.
 */
interface Node { name: string; kind: 'folder' | 'pdf' | 'md'; n?: number; open?: () => void; }

/**
 * Windows artwork, drawn rather than borrowed.
 *
 * Nam's note was that the share view "does NOT look like a windows machine at
 * all", and he is right — the old version had a 16px yellow square for a folder
 * and three coloured rectangles for a taskbar. He also said to ignore the size
 * budget and make it realistic.
 *
 * Everything below is hand-authored SVG, for three reasons and not only the
 * legal one: Microsoft's actual icon and wallpaper files are not mine to ship,
 * I have no reliable way to fetch them, and vector artwork scales with the share
 * frame while a PNG of someone's desktop would not. So these are original
 * drawings that read as Windows 11 rather than copies of it.
 */
const svg = (vb: string, body: string, cls = ''): HTMLElement => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', vb);
  el.setAttribute('aria-hidden', 'true');
  if (cls) el.setAttribute('class', cls);
  el.innerHTML = body;
  return el as unknown as HTMLElement;
};

/** Windows 11's folder: a two-tone tab-and-body with a warm gradient. */
const icFolder = (): HTMLElement => svg('0 0 20 20', `
  <defs><linearGradient id="wf1" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd04d"/><stop offset="1" stop-color="#f5a623"/>
  </linearGradient>
  <linearGradient id="wf2" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffdf85"/><stop offset="1" stop-color="#ffc148"/>
  </linearGradient></defs>
  <path d="M1.6 5.2a1.4 1.4 0 0 1 1.4-1.4h3.3c.5 0 .9.2 1.2.6l.9 1.1h7a1.4 1.4 0 0 1 1.4 1.4v1H1.6z" fill="url(#wf1)"/>
  <path d="M1.6 7.4h16.8v7.2a1.4 1.4 0 0 1-1.4 1.4H3a1.4 1.4 0 0 1-1.4-1.4z" fill="url(#wf2)"/>
  <path d="M1.6 7.4h16.8v.9H1.6z" fill="#fff" opacity=".35"/>`);

/** A PDF: white sheet, folded corner, red badge. */
const icPdf = (): HTMLElement => svg('0 0 20 20', `
  <path d="M4 2.2h7.4L16 6.8v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.2a1 1 0 0 1 1-1z" fill="#fff" stroke="#c9ced6" stroke-width=".8"/>
  <path d="M11.4 2.2 16 6.8h-4.6z" fill="#e4e8ee"/>
  <rect x="3.2" y="10.6" width="11.6" height="5.6" rx="1.1" fill="#d93025"/>
  <text x="9" y="14.9" font-family="Segoe UI, sans-serif" font-size="4.1" font-weight="700" fill="#fff" text-anchor="middle">PDF</text>`);

/** A markdown file: the same sheet with a slate badge and an M-arrow. */
const icMd = (): HTMLElement => svg('0 0 20 20', `
  <path d="M4 2.2h7.4L16 6.8v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.2a1 1 0 0 1 1-1z" fill="#fff" stroke="#c9ced6" stroke-width=".8"/>
  <path d="M11.4 2.2 16 6.8h-4.6z" fill="#e4e8ee"/>
  <rect x="3.2" y="10.6" width="11.6" height="5.6" rx="1.1" fill="#4b5563"/>
  <path d="M5 15.1v-3.2h1l1 1.4 1-1.4h1v3.2h-.9v-1.8l-1.1 1.5-1.1-1.5v1.8z" fill="#fff"/>
  <path d="M11.2 11.9h.9v1.7h.9l-1.35 1.6-1.35-1.6h.9z" fill="#fff"/>`);

/** The Start button: four panes, Windows 11's blue. */
const icStart = (): HTMLElement => svg('0 0 20 20', `
  <rect x="2.4" y="2.4" width="6.6" height="6.6" rx="1" fill="#57b0f4"/>
  <rect x="11" y="2.4" width="6.6" height="6.6" rx="1" fill="#57b0f4"/>
  <rect x="2.4" y="11" width="6.6" height="6.6" rx="1" fill="#57b0f4"/>
  <rect x="11" y="11" width="6.6" height="6.6" rx="1" fill="#57b0f4"/>`);

const icSearch = (): HTMLElement => svg('0 0 20 20', `
  <circle cx="8.6" cy="8.6" r="5.2" fill="none" stroke="#e6e6e6" stroke-width="1.5"/>
  <path d="m12.6 12.6 4 4" stroke="#e6e6e6" stroke-width="1.5" stroke-linecap="round"/>`);

const icExplorerTask = (): HTMLElement => svg('0 0 20 20', `
  <path d="M1.8 5.6a1.3 1.3 0 0 1 1.3-1.3h3.1c.45 0 .85.2 1.1.55l.8 1.05h6.6a1.3 1.3 0 0 1 1.3 1.3v.9H1.8z" fill="#f5a623"/>
  <path d="M1.8 7.9h14.4v6.5a1.3 1.3 0 0 1-1.3 1.3H3.1a1.3 1.3 0 0 1-1.3-1.3z" fill="#ffc94d"/>`);

const icBrowser = (): HTMLElement => svg('0 0 20 20', `
  <circle cx="10" cy="10" r="7.6" fill="#4a9df0"/>
  <path d="M10 2.4a7.6 7.6 0 0 1 6.9 4.4H10a3.2 3.2 0 0 0-3 2.1L4.1 5.1A7.6 7.6 0 0 1 10 2.4z" fill="#f2b53c"/>
  <path d="M13.2 10a3.2 3.2 0 0 1-4.3 3l-2.6 4.2A7.6 7.6 0 0 0 17 12z" fill="#5cc26a"/>
  <circle cx="10" cy="10" r="3" fill="#fff"/><circle cx="10" cy="10" r="2.1" fill="#2f7fd6"/>`);

/**
 * The wallpaper. Windows 11's default is an abstract bloom of translucent
 * ribbons over a deep blue; this is an original take on the same idea — radial
 * ground plus four soft petals on a rotated group, so it reads as the same
 * family without being a copy.
 */
const wallpaper = (): HTMLElement => svg('0 0 1200 750', `
  <defs>
    <radialGradient id="wg" cx="50%" cy="46%" r="62%">
      <stop offset="0" stop-color="#1b4e8f"/><stop offset="55%" stop-color="#0d2a55"/>
      <stop offset="100%" stop-color="#050e1f"/>
    </radialGradient>
    <linearGradient id="pt" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7fd4ff" stop-opacity=".55"/>
      <stop offset="55%" stop-color="#3f8fe0" stop-opacity=".28"/>
      <stop offset="100%" stop-color="#122a5c" stop-opacity=".05"/>
    </linearGradient>
    <filter id="sf" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
  </defs>
  <rect width="1200" height="750" fill="url(#wg)"/>
  <g filter="url(#sf)" transform="translate(600 360)">
    <g opacity=".9">
      <path d="M0 0C120-150 300-190 420-120 300-40 130 40 0 0Z" fill="url(#pt)"/>
      <path d="M0 0C150 120 190 300 120 420 40 300-40 130 0 0Z" fill="url(#pt)" opacity=".85"/>
      <path d="M0 0C-120 150-300 190-420 120-300 40-130-40 0 0Z" fill="url(#pt)" opacity=".7"/>
      <path d="M0 0C-150-120-190-300-120-420-40-300 40-130 0 0Z" fill="url(#pt)" opacity=".8"/>
    </g>
  </g>
  <ellipse cx="600" cy="360" rx="150" ry="150" fill="#bfe6ff" opacity=".10" filter="url(#sf)"/>`, 'dk-wall-art');

function explorerWindow(opts: { onOpen: (id: string) => void }): HTMLElement {
  const TREE: Node[] = [
    { name: 'Real-time client', kind: 'folder', n: 4 },
    { name: 'Tools', kind: 'folder', n: 6 },
    { name: 'This CV', kind: 'folder', n: 1 },
    { name: 'Off the clock', kind: 'folder', n: 7 },
  ];
  const FILES: Node[] = [
    { name: 'NamNguyen_CV_2026.pdf', kind: 'pdf', open: () => opts.onOpen('plain') },
    { name: 'requirement-map.md', kind: 'md', open: () => opts.onOpen('requirements') },
    { name: 'measured-spec.md', kind: 'md', open: () => opts.onOpen('spec') },
  ];

  let selected: HTMLElement | null = null;

  const rename = (row: HTMLElement): void => {
    const label = row.querySelector<HTMLElement>('.wx-name');
    if (!label || row.querySelector('input')) return;
    const was = label.textContent ?? '';
    const input = h('input', { class: 'wx-rename', type: 'text', value: was }) as HTMLInputElement;
    label.replaceWith(input);
    input.focus();
    const dot = was.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : was.length);
    const finish = (commit: boolean): void => {
      input.replaceWith(h('span', { class: 'wx-name' }, commit && input.value.trim() ? input.value.trim() : was));
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  };

  const ico = (k: Node['kind']): HTMLElement =>
    k === 'folder' ? icFolder() : k === 'pdf' ? icPdf() : icMd();

  const row = (n: Node): HTMLElement => {
    const el = h('div', { class: 'wx-row', tabindex: '0', role: 'listitem' },
      h('span', { class: 'wx-ico' }, ico(n.kind)),
      h('span', { class: 'wx-name' }, n.name),
      n.n !== undefined ? h('span', { class: 'wx-count' }, String(n.n)) : null);
    el.addEventListener('click', () => {
      if (selected === el) { rename(el); return; }
      if (selected) selected.classList.remove('is-sel');
      selected = el; el.classList.add('is-sel');
    });
    el.addEventListener('dblclick', () => { if (n.open) n.open(); });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); rename(el); });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'F2') { e.preventDefault(); rename(el); }
      if (e.key === 'Enter' && n.open) { e.preventDefault(); n.open(); }
    });
    return el;
  };

  const win = h('div', { class: 'wx' },
    h('div', { class: 'wx-bar' },
      h('span', { class: 'wx-bar-ico' }, icFolder()),
      h('span', { class: 'wx-title' }, 'Work'),
      h('span', { class: 'wx-btns' },
        h('span', { class: 'wx-cap wx-min' }, '\u2500'),
        h('span', { class: 'wx-cap wx-max' }, '\u2610'),
        h('span', { class: 'wx-cap wx-close' }, '\u2715'))),
    // Win11 puts a command bar above the breadcrumb, not below it.
    h('div', { class: 'wx-cmd' },
      h('span', { class: 'wx-cmd-btn' }, '+ New'),
      h('span', { class: 'wx-cmd-sep' }),
      h('span', { class: 'wx-cmd-ico' }, '\u2702'),
      h('span', { class: 'wx-cmd-ico' }, '\u29C9'),
      h('span', { class: 'wx-cmd-ico' }, '\u2398'),
      h('span', { class: 'wx-cmd-ico' }, '\u1F5D1'),
      h('span', { class: 'wx-cmd-sep' }),
      h('span', { class: 'wx-cmd-btn' }, 'Sort'),
      h('span', { class: 'wx-cmd-btn' }, 'View')),
    h('div', { class: 'wx-crumb' },
      h('span', { class: 'wx-crumb-ico' }, icFolder()),
      h('span', {}, 'This PC'), h('span', { class: 'wx-sep' }, '\u203A'),
      h('span', {}, 'Documents'), h('span', { class: 'wx-sep' }, '\u203A'),
      h('span', { class: 'wx-here' }, 'Work')),
    h('div', { class: 'wx-cols' },
      h('div', { class: 'wx-tree', role: 'list' }, ...TREE.map(row)),
      h('div', { class: 'wx-files' },
        h('div', { class: 'wx-head' },
          h('span', {}, 'Name'), h('span', {}, 'Date modified'), h('span', {}, 'Type')),
        h('div', { class: 'wx-list', role: 'list' }, ...FILES.map(row)))),
    h('div', { class: 'wx-status' },
      h('span', {}, FILES.length + ' items'),
      h('span', { class: 'wx-status-r' }, 'Documents \u203A Work')),
    h('span', { class: 'wx-grip' }));

  const grip = win.querySelector<HTMLElement>('.wx-grip');
  if (grip) {
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const b = win.getBoundingClientRect();
      const x0 = e.clientX, y0 = e.clientY;
      const move = (m: PointerEvent): void => {
        win.style.width = Math.max(460, b.width + (m.clientX - x0)) + 'px';
        win.style.height = Math.max(260, b.height + (m.clientY - y0)) + 'px';
      };
      const up = (): void => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }
  return win;
}

/** The Window source: the Explorer window alone, nothing behind it. */
function pageWindow(onOpen: (id: string) => void): HTMLElement {
  return h('div', { class: 'pg pg-win' }, explorerWindow({ onOpen }));
}

/**
 * The Screen source, which must NOT be the same picture — Nam: "window and
 * screen get you the same food". Sharing a screen shows the desktop: wallpaper,
 * taskbar, and the window sitting on it.
 */
function pageDesktop(onOpen: (id: string) => void): HTMLElement {
  const clock = new Date();
  const hh = String(clock.getHours()).padStart(2, '0');
  const mm = String(clock.getMinutes()).padStart(2, '0');
  return h('div', { class: 'pg pg-desk' },
    wallpaper(),
    explorerWindow({ onOpen }),
    h('div', { class: 'dk-taskbar' },
      h('div', { class: 'dk-task-mid' },
        h('span', { class: 'dk-task' }, icStart()),
        h('span', { class: 'dk-task' }, icSearch()),
        h('span', { class: 'dk-task is-on' }, icExplorerTask()),
        h('span', { class: 'dk-task' }, icBrowser())),
      h('div', { class: 'dk-tray' },
        h('span', { class: 'dk-weather' }, '13\u00B0C  Cloudy'),
        h('span', { class: 'dk-clock' }, h('b', {}, hh + ':' + mm), h('i', {}, '23/08/2026')))));
}
