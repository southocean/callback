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
export function renderShared(
  src: Source,
  onOpen: (id: string) => void = () => {},
  onClose: () => void = () => {},
): HTMLElement {
  const body = contentFor(src, onOpen, onClose);
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
function contentFor(src: Source, onOpen: (id: string) => void, onClose: () => void): HTMLElement {
  switch (src.id) {
    // The real thing, framed. #plain is a standalone document view — it has no
    // call chrome, so framing it cannot nest the app inside itself.
    case 'cv': return frameOf('#plain', 'Nam Nguyen — the CV as a document', pageCv);
    // 'work' used to frame '#tools/tests' and Nam caught what that does: 'tools'
    // is a PANEL, so the hash resolves to { screen: 'call', panel: 'tools' } and
    // the iframe loaded the entire Meet clone — a call inside the call inside
    // the share. Authored now. There is also a hard guard in main.ts so no
    // iframe can ever render the call again, whatever hash it is handed.
    case 'work': return pageWork();
    // Authored, because the original refuses to be framed.
    case 'jobad': return pageJobAd();
    case 'riichi': return pageRiichi();
    case 'files': return pageWindow(onOpen, onClose);
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

/* ----------------------------------------------------------- the artwork --
 * Hand-authored SVG. Windows 11's own icon files are not mine to ship, and a
 * vector scales with the share frame where a screenshot would not.
 */
const svg = (vb: string, body: string, cls = ''): HTMLElement => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', vb);
  el.setAttribute('aria-hidden', 'true');
  if (cls) el.setAttribute('class', cls);
  el.innerHTML = body;
  return el as unknown as HTMLElement;
};

const icFolder = (): HTMLElement => svg('0 0 20 20', `
  <path d="M1.6 5.2a1.4 1.4 0 0 1 1.4-1.4h3.9l1.7 1.7h7.8a1.4 1.4 0 0 1 1.4 1.4v.5H1.6z" fill="#ffb900"/>
  <path d="M1.6 6.9h16.8v8.3a1.4 1.4 0 0 1-1.4 1.4H3a1.4 1.4 0 0 1-1.4-1.4z" fill="#ffd04b"/>`);

const icPdf = (): HTMLElement => svg('0 0 20 20', `
  <path d="M4 2.2h7.4L16 6.8v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-14.6a1 1 0 0 1 1-1z" fill="#f4f4f4"/>
  <path d="M11.4 2.2 16 6.8h-4.6z" fill="#c8c8c8"/>
  <rect x="2.2" y="10" width="11.6" height="6.4" rx="1" fill="#d13438"/>
  <text x="8" y="14.9" font-family="Segoe UI, sans-serif" font-size="4.6" font-weight="700" fill="#fff" text-anchor="middle">PDF</text>`);

const icMd = (): HTMLElement => svg('0 0 20 20', `
  <path d="M4 2.2h7.4L16 6.8v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-14.6a1 1 0 0 1 1-1z" fill="#f4f4f4"/>
  <path d="M11.4 2.2 16 6.8h-4.6z" fill="#c8c8c8"/>
  <rect x="2.2" y="10" width="11.6" height="6.4" rx="1" fill="#4a5568"/>
  <path d="M4 15.4v-3.6h1.1l1.1 1.5 1.1-1.5h1.1v3.6H8.3v-2.2l-1.1 1.4-1.1-1.4v2.2zm7 0-1.7-1.9h1v-1.7h1.4v1.7h1z" fill="#fff"/>`);

/* The Windows flag: four panes, tilted the way 11 draws it. */
const icStart = (): HTMLElement => svg('0 0 20 20', `
  <rect x="2.4" y="2.4" width="6.6" height="6.6" rx=".7" fill="#4cc2ff"/>
  <rect x="11" y="2.4" width="6.6" height="6.6" rx=".7" fill="#4cc2ff"/>
  <rect x="2.4" y="11" width="6.6" height="6.6" rx=".7" fill="#4cc2ff"/>
  <rect x="11" y="11" width="6.6" height="6.6" rx=".7" fill="#4cc2ff"/>`);

const icExplorerTask = (): HTMLElement => svg('0 0 20 20', `
  <path d="M1.4 5a1.3 1.3 0 0 1 1.3-1.3h4l1.6 1.6h8a1.3 1.3 0 0 1 1.3 1.3v.4H1.4z" fill="#ffb900"/>
  <path d="M1.4 7h17.2v8a1.3 1.3 0 0 1-1.3 1.3H2.7A1.3 1.3 0 0 1 1.4 15z" fill="#ffd04b"/>
  <path d="M5.6 9.2h8.8v1.4H5.6zm0 2.6h6.2v1.4H5.6z" fill="#e0a800" opacity=".55"/>`);

/* Chrome's mark: the three arcs and the blue hub. Nam's note was that ours was
   not Chrome at all — it was a generic globe. */
const icChrome = (): HTMLElement => svg('0 0 20 20', `
  <circle cx="10" cy="10" r="8.4" fill="#fff"/>
  <path d="M10 1.6A8.4 8.4 0 0 1 17.4 6H10a4 4 0 0 0-3.46 6L2.9 5.7A8.4 8.4 0 0 1 10 1.6z" fill="#ea4335"/>
  <path d="M2.9 5.7 6.54 12A4 4 0 0 0 10 14a4 4 0 0 0 .55-.04l-3.2 5.53A8.4 8.4 0 0 1 2.9 5.7z" fill="#34a853"/>
  <path d="M17.4 6a8.4 8.4 0 0 1-10.05 12.49L10.55 13A4 4 0 0 0 13.46 12 4 4 0 0 0 10 6z" fill="#fbbc05"/>
  <path d="M17.4 6H10a4 4 0 0 0-3.46 6l-.9-1.56A4 4 0 0 1 10 6h7.4z" fill="#4285f4" opacity="0"/>
  <circle cx="10" cy="10" r="3.55" fill="#4285f4"/>
  <circle cx="10" cy="10" r="3.05" fill="#fff" opacity="0"/>`);

/* A Windows 11 "Bloom"-ish wallpaper: a dark ground with a soft radial swell. */
const wallpaper = (): HTMLElement => svg('0 0 1200 750', `
  <defs>
    <radialGradient id="wg1" cx="52%" cy="46%" r="46%">
      <stop offset="0%" stop-color="#2a5c9c"/>
      <stop offset="45%" stop-color="#14315c"/>
      <stop offset="100%" stop-color="#0a1526"/>
    </radialGradient>
    <radialGradient id="wg2" cx="50%" cy="44%" r="26%">
      <stop offset="0%" stop-color="#7fb4ff" stop-opacity=".35"/>
      <stop offset="100%" stop-color="#7fb4ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="wg3" cx="50%" cy="44%" r="17%">
      <stop offset="0%" stop-color="#dbe9ff" stop-opacity=".30"/>
      <stop offset="100%" stop-color="#dbe9ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#wg1)"/>
  <ellipse cx="624" cy="330" rx="330" ry="240" fill="url(#wg2)"/>
  <ellipse cx="624" cy="330" rx="180" ry="128" fill="url(#wg3)"/>`, 'dk-wall-art');

// ------------------------------------------------------------ the windows --

interface Node { name: string; kind: 'folder' | 'pdf' | 'md'; n?: number; open?: () => void; }

const glyphFor = (k: Node['kind']): HTMLElement =>
  k === 'folder' ? icFolder() : k === 'pdf' ? icPdf() : icMd();

/**
 * One Windows 11 window: a real one, as far as a drawing can be.
 *
 * Nam's QA was blunt and correct — "nothing on it was working. The minimize,
 * maximize, close button, cannot be moved." So this version has a title bar you
 * can drag by, caption buttons that do what they say, and a window that can be
 * minimised to the taskbar and restored from it.
 *
 * `chrome: false` is the Window-share mode: Nam wants exactly one window and no
 * desktop, with minimise and maximise gone and close ending the share. A window
 * you can minimise when there is no taskbar to minimise it TO is a dead end, so
 * that mode simply does not offer it.
 */
function win11(o: {
  title: string;
  icon: () => HTMLElement;
  body: HTMLElement;
  status?: HTMLElement | null;
  full: boolean;
  onClose: () => void;
  onMinimise?: (() => void) | null;
}): HTMLElement {
  const cap = (cls: string, label: string, mark: string, fn: () => void): HTMLElement => {
    const b = h('button', { class: 'wx-cap ' + cls, type: 'button', 'aria-label': label }, mark) as HTMLButtonElement;
    b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    return b;
  };

  let maxed = false;
  const el = h('div', { class: 'wx' + (o.full ? '' : ' wx-solo') }) as HTMLElement;

  const toggleMax = (): void => {
    maxed = !maxed;
    el.classList.toggle('is-max', maxed);
    if (maxed) { el.style.left = ''; el.style.top = ''; }
  };

  const bar = h('div', { class: 'wx-bar' },
    h('span', { class: 'wx-bar-ico' }, o.icon()),
    h('span', { class: 'wx-title' }, o.title),
    h('div', { class: 'wx-btns' },
      o.full && o.onMinimise ? cap('wx-min', 'Minimize', '–', o.onMinimise) : null,
      o.full ? cap('wx-max', 'Maximize', '□', toggleMax) : null,
      cap('wx-close', 'Close', '✕', o.onClose)));

  // Dragging. Pointer events so it works with a mouse or a pen, capture so a
  // fast drag cannot outrun the handle, and disabled while maximised because a
  // maximised window has nowhere to go.
  if (o.full) {
    bar.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.wx-cap') || maxed) return;
      const r = el.getBoundingClientRect();
      const host = el.parentElement?.getBoundingClientRect();
      if (!host) return;
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      el.classList.add('is-drag');
      bar.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent): void => {
        const x = Math.max(0, Math.min(ev.clientX - host.left - dx, host.width - r.width));
        const y = Math.max(0, Math.min(ev.clientY - host.top - dy, host.height - r.height));
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      };
      const up = (): void => {
        el.classList.remove('is-drag');
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
    });
    bar.addEventListener('dblclick', (e) => {
      if ((e.target as HTMLElement).closest('.wx-cap')) return;
      toggleMax();
    });
  }

  el.append(bar, o.body);
  if (o.status) el.appendChild(o.status);
  el.appendChild(h('div', { class: 'wx-grip', 'aria-hidden': 'true' }));
  return el;
}

/** The Explorer window's insides: command bar, breadcrumb, tree, list, status. */
function explorerBody(onOpen: (id: string) => void): { body: HTMLElement; status: HTMLElement } {
  const TREE: Node[] = [
    { name: 'Real-time client', kind: 'folder', n: 4 },
    { name: 'Tools', kind: 'folder', n: 6 },
    { name: 'This CV', kind: 'folder', n: 1 },
    { name: 'Off the clock', kind: 'folder', n: 7 },
  ];
  const FILES: Node[] = [
    { name: 'NamNguyen_CV_2026.pdf', kind: 'pdf', open: () => onOpen('plain') },
    { name: 'requirement-map.md', kind: 'md', open: () => onOpen('requirements') },
    { name: 'measured-spec.md', kind: 'md', open: () => onOpen('spec') },
  ];

  let selected: HTMLElement | null = null;

  const rename = (row: HTMLElement): void => {
    const label = row.querySelector<HTMLElement>('.wx-name');
    if (!label || row.querySelector('input')) return;
    const was = label.textContent ?? '';
    const input = h('input', { class: 'wx-rename', type: 'text', value: was }) as HTMLInputElement;
    label.replaceWith(input);
    input.focus();
    // Explorer selects the stem and leaves the extension alone.
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

  const row = (nd: Node, inTree: boolean): HTMLElement => {
    const r = h('div', { class: 'wx-row', tabindex: '0', role: 'listitem' },
      h('span', { class: 'wx-ico' }, glyphFor(nd.kind)),
      h('span', { class: 'wx-name' }, nd.name),
      nd.n !== undefined ? h('span', { class: 'wx-count' }, String(nd.n)) : null) as HTMLElement;
    r.addEventListener('click', () => {
      const already = selected === r;
      selected?.classList.remove('is-sel');
      selected = r;
      r.classList.add('is-sel');
      if (already && !inTree) rename(r);
    });
    r.addEventListener('dblclick', () => nd.open?.());
    r.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') nd.open?.();
      if (e.key === 'F2') { e.preventDefault(); rename(r); }
    });
    r.addEventListener('contextmenu', (e) => { e.preventDefault(); rename(r); });
    return r;
  };

  const cmdBtn = (label: string): HTMLElement => h('span', { class: 'wx-cmd-btn' }, label);
  const cmdIco = (mark: string): HTMLElement => h('span', { class: 'wx-cmd-ico' }, mark);

  const body = h('div', { class: 'wx-body' },
    h('div', { class: 'wx-cmd' },
      cmdBtn('+ New'),
      h('span', { class: 'wx-cmd-sep' }),
      cmdIco('✂'), cmdIco('⧉'), cmdIco('\u{1F4CB}'), cmdIco('↻'),
      h('span', { class: 'wx-cmd-sep' }),
      cmdBtn('Sort'), cmdBtn('View')),
    h('div', { class: 'wx-crumb' },
      h('span', { class: 'wx-crumb-ico' }, icFolder()),
      h('span', {}, 'This PC'), h('span', { class: 'wx-sep' }, '›'),
      h('span', {}, 'Documents'), h('span', { class: 'wx-sep' }, '›'),
      h('span', { class: 'wx-here' }, 'Work')),
    h('div', { class: 'wx-cols' },
      h('div', { class: 'wx-tree', role: 'list' }, ...TREE.map((n) => row(n, true))),
      h('div', { class: 'wx-files' },
        h('div', { class: 'wx-head' }, h('span', {}, 'Name'), h('span', {}, 'Date modified'), h('span', {}, 'Type')),
        h('div', { class: 'wx-list', role: 'list' }, ...FILES.map((n) => row(n, false))))));

  const status = h('div', { class: 'wx-status' },
    h('span', {}, `${FILES.length} items`),
    h('span', { class: 'wx-status-r' }, 'Documents › Work'));

  return { body, status };
}

/** The Chrome window the taskbar's Chrome icon opens — the four shareable tabs. */
function chromeBody(): HTMLElement {
  const tabs = TABS.map((t, i) => h('span', { class: 'cb-tab' + (i === 0 ? ' is-on' : '') },
    h('span', { class: 'cb-tab-ico' }, icChrome()),
    h('span', { class: 'cb-tab-t' }, t.title)));
  let active = TABS[0];
  const omni = h('div', { class: 'cb-omni' }, h('span', {}, (active?.host ?? '') + '/'));
  const page = h('div', { class: 'cb-page' },
    h('h2', {}, active?.title ?? ''),
    h('p', {}, 'One of the four sources the picker offers. Sharing a Chrome tab shares this page, not this window.'));
  tabs.forEach((el, i) => el.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('is-on'));
    el.classList.add('is-on');
    active = TABS[i];
    omni.textContent = (active?.host ?? '') + '/';
    clear(page);
    page.append(h('h2', {}, active?.title ?? ''),
      h('p', {}, 'One of the four sources the picker offers. Sharing a Chrome tab shares this page, not this window.'));
  }));
  return h('div', { class: 'wx-body cb' },
    h('div', { class: 'cb-strip' }, ...tabs, h('span', { class: 'cb-new' }, '+')),
    h('div', { class: 'cb-bar' }, h('span', { class: 'cb-nav' }, '←'), h('span', { class: 'cb-nav' }, '→'),
      h('span', { class: 'cb-nav' }, '↻'), omni),
    page);
}

/**
 * The Window source: one Explorer window, on nothing.
 *
 * Nam: "for window mode in the screen sharing, make sure we only show the folder
 * explorer and nothing more, cannot minimize or maximize, but if you close it
 * then we exit the screensharing mode." Which is also what Windows does — share
 * a window and the capture ends when the window does.
 */
function pageWindow(onOpen: (id: string) => void, onClose: () => void): HTMLElement {
  const { body, status } = explorerBody(onOpen);
  return h('div', { class: 'pg pg-win' },
    win11({ title: 'Work', icon: icExplorerTask, body, status, full: false, onClose }));
}

/**
 * The Screen source, which must not be the same picture. A desktop: wallpaper,
 * a taskbar you can actually use, and windows that open, move, minimise and
 * close on it.
 */
function pageDesktop(onOpen: (id: string) => void): HTMLElement {
  const surface = h('div', { class: 'dk-surface' }) as HTMLElement;
  const taskItems = h('div', { class: 'dk-task-mid' }) as HTMLElement;

  interface Live { el: HTMLElement; task: HTMLElement; min: boolean; }
  const live: Live[] = [];

  /** The taskbar hover preview — Nam asked for "a small render of the explorer
   *  folder", and the honest way to get one is to render the window small
   *  rather than draw a picture of it. A deep clone scaled down is the real
   *  layout at 1:5, so it cannot drift from the window it previews. */
  const preview = (task: HTMLElement, w: Live, title: string): void => {
    let pop: HTMLElement | null = null;
    const show = (): void => {
      if (pop) return;
      const mini = w.el.cloneNode(true) as HTMLElement;
      mini.classList.remove('is-drag');
      mini.style.left = '0'; mini.style.top = '0';
      pop = h('div', { class: 'dk-peek' },
        h('div', { class: 'dk-peek-t' }, h('span', { class: 'dk-peek-ico' }, icExplorerTask()), title),
        h('div', { class: 'dk-peek-shot' }, h('div', { class: 'dk-peek-scale' }, mini))) as HTMLElement;
      const r = task.getBoundingClientRect();
      const host = surface.getBoundingClientRect();
      pop.style.left = `${Math.round(r.left - host.left + r.width / 2)}px`;
      surface.appendChild(pop);
    };
    const hide = (): void => { pop?.remove(); pop = null; };
    task.addEventListener('pointerenter', show);
    task.addEventListener('pointerleave', hide);
    task.addEventListener('click', hide);
  };

  const openWindow = (kind: 'explorer' | 'chrome'): void => {
    const title = kind === 'explorer' ? 'Work' : 'Nam Nguyen — Senior SWE, Web Development';
    const ico = kind === 'explorer' ? icExplorerTask : icChrome;
    let bodyEl: HTMLElement;
    let statusEl: HTMLElement | null = null;
    if (kind === 'explorer') {
      const made = explorerBody(onOpen);
      bodyEl = made.body; statusEl = made.status;
    } else {
      bodyEl = chromeBody();
    }
    const task = h('span', { class: 'dk-task is-on', role: 'button', tabindex: '0', 'aria-label': title }, ico()) as HTMLElement;
    const rec: Live = { el: null as unknown as HTMLElement, task, min: false };
    const el = win11({
      title, icon: ico, body: bodyEl, status: statusEl, full: true,
      onClose: () => {
        el.remove(); task.remove();
        const i = live.indexOf(rec); if (i >= 0) live.splice(i, 1);
      },
      onMinimise: () => { rec.min = true; el.classList.add('is-min'); task.classList.remove('is-on'); },
    });
    rec.el = el;
    // Cascade, so a second window does not land exactly on the first.
    const n = live.length;
    el.style.left = `${60 + n * 28}px`;
    el.style.top = `${40 + n * 26}px`;
    task.addEventListener('click', () => {
      if (rec.min) { rec.min = false; el.classList.remove('is-min'); task.classList.add('is-on'); }
      else { rec.min = true; el.classList.add('is-min'); task.classList.remove('is-on'); }
      surface.appendChild(el);
    });
    el.addEventListener('pointerdown', () => surface.appendChild(el), true);
    live.push(rec);
    taskItems.appendChild(task);
    surface.appendChild(el);
    preview(task, rec, title);
  };

  // Start, and a small menu so the button is not a lie. Nam: "cannot press
  // window button" — it can now, and it opens something.
  const start = h('button', { class: 'dk-task dk-start', type: 'button', 'aria-label': 'Start' }, icStart()) as HTMLButtonElement;
  let menu: HTMLElement | null = null;
  start.addEventListener('click', () => {
    if (menu) { menu.remove(); menu = null; return; }
    menu = h('div', { class: 'dk-start-menu' },
      h('div', { class: 'dk-start-h' }, 'Pinned'),
      h('div', { class: 'dk-start-grid' },
        h('button', { class: 'dk-start-app', type: 'button', onclick: () => { openWindow('explorer'); menu?.remove(); menu = null; } },
          h('span', {}, icExplorerTask()), h('span', {}, 'File Explorer')),
        h('button', { class: 'dk-start-app', type: 'button', onclick: () => { openWindow('chrome'); menu?.remove(); menu = null; } },
          h('span', {}, icChrome()), h('span', {}, 'Google Chrome'))),
      h('div', { class: 'dk-start-foot' }, h('span', { class: 'dk-start-av' }, 'NN'), profile.name)) as HTMLElement;
    surface.appendChild(menu);
  });

  const pin = (label: string, ico: () => HTMLElement, kind: 'explorer' | 'chrome'): HTMLElement => {
    const b = h('button', { class: 'dk-task dk-pin', type: 'button', 'aria-label': label }, ico()) as HTMLButtonElement;
    b.addEventListener('click', () => openWindow(kind));
    return b;
  };

  const clock = new Date();
  const hh = String(clock.getHours()).padStart(2, '0');
  const mm = String(clock.getMinutes()).padStart(2, '0');
  const dd = `${String(clock.getDate()).padStart(2, '0')}/${String(clock.getMonth() + 1).padStart(2, '0')}/${clock.getFullYear()}`;

  const page = h('div', { class: 'pg pg-desk' },
    wallpaper(),
    surface,
    // No search icon — Nam asked for it gone, and a search box that cannot
    // search was the least defensible thing on the bar.
    h('div', { class: 'dk-taskbar' },
      h('div', { class: 'dk-task-wrap' },
        start,
        pin('File Explorer', icExplorerTask, 'explorer'),
        pin('Google Chrome', icChrome, 'chrome'),
        taskItems),
      h('div', { class: 'dk-tray' },
        h('span', { class: 'dk-weather' }, '11°C  Klart'),
        h('span', { class: 'dk-clock' }, h('b', {}, hh + ':' + mm), h('i', {}, dd)))));

  page.addEventListener('pointerdown', (e) => {
    if (menu && !(e.target as HTMLElement).closest('.dk-start-menu, .dk-start')) { menu.remove(); menu = null; }
  });

  openWindow('explorer');
  return page;
}
