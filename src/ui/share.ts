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
import { profile, pitch, roles, caseStudies, requirementMap, offstage, skills } from '../data/cv.js';
import { eggs } from '../data/eggs.js';

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

/**
 * Everything the emulated Chrome can open, keyed by the id a file carries.
 *
 * The picker's TABS above are the four tabs that happen to be open already. This
 * is the wider set: Explorer can open pages that were not in the strip, and the
 * tab is created on demand -- which is what a browser actually does, and what
 * lets Tools and Hobby have pages of their own without inventing two more
 * "already open" tabs in the picker.
 *
 * `vid:<id>` entries are the easter-egg clips. Nam: "you can put in there some
 * videos that we have as easter eggs too". They are the real files already in
 * docs/media, described by src/data/eggs.ts -- not stand-ins.
 */
interface Doc { title: string; host: string; page: () => HTMLElement }

const DOCS: Record<string, Doc> = {
  cv: { title: 'Nam Nguyen — Senior SWE, Web Development', host: 'southocean.github.io', page: () => pageCv() },
  jobad: { title: 'Google Careers — the posting, line by line', host: 'careers.google.com', page: () => pageJobAd() },
  work: { title: 'Four things I built, and what broke', host: 'southocean.github.io', page: () => pageWork() },
  riichi: { title: 'Riichi Mahjong — real-time client', host: 'localhost:5173', page: () => pageRiichi() },
  tools: { title: 'Internal tooling — a bot controller', host: 'southocean.github.io', page: () => pageTools() },
  hobby: { title: 'Off the clock', host: 'southocean.github.io', page: () => pageHobby() },
};
for (const e of eggs) {
  DOCS['vid:' + e.id] = {
    title: e.title,
    host: 'southocean.github.io',
    page: () => pageVideo(e.id),
  };
}

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
    default: return pageDesktop();
  }
}

/**
 * The Tools page. Its one real claim is the bot controller, which the CV states
 * twice -- once in the Mahjong Logic bullets and once as a Test automation
 * skill note. Everything on the page comes from one of those two places.
 */
function pageTools(): HTMLElement {
  const bullet = roles[0]?.bullets.find((b) => b.includes('internal tooling')) ?? '';
  const note = skills.primary.find((k) => k.name === 'Test automation')?.note ?? '';
  return h('div', { class: 'pg' },
    h('h1', { class: 'pg-h' }, 'Internal tooling'),
    h('p', { class: 'pg-sub' }, 'Mahjong Logic · a bot controller for testing live tables'),
    h('p', { class: 'pg-lead' }, bullet),
    h('div', { class: 'pg-cards' },
      h('div', { class: 'pg-card' }, h('b', {}, 'Test automation'), h('span', {}, note)),
      h('div', { class: 'pg-card' }, h('b', {}, 'Why it existed'),
        h('span', {}, 'A real-time table needs other players before you can test it. Bots were cheaper than four colleagues.'))),
    h('p', { class: 'pg-note' }, 'Listed here because the folder is called Tools, and this is the tool.'));
}

/** Off the clock, straight from cv.ts — the five things and why each one counts. */
function pageHobby(): HTMLElement {
  return h('div', { class: 'pg' },
    h('h1', { class: 'pg-h' }, 'Off the clock'),
    h('p', { class: 'pg-sub' }, 'Five of them, and two are the reason this page exists'),
    h('p', { class: 'pg-lead' }, offstage.intro),
    h('div', { class: 'pg-roles' },
      ...offstage.items.map((it) => h('div', { class: 'pg-role' },
        h('b', {}, it.what), h('span', {}, it.why)))),
    h('p', { class: 'pg-note' }, 'The clips are in this folder, next to this file.'));
}

/**
 * A clip, playing. Same files and captions the calendar easter eggs use, so
 * finding one through the fake Explorer and finding one through the calendar
 * land on identical content.
 *
 * Muted, because a shared screen that starts talking at you is worse than one
 * you have to unmute. Controls are on, so it can be unmuted.
 */
function pageVideo(id: string): HTMLElement {
  const egg = eggs.find((e) => e.id === id) ?? eggs[0]!;
  const v = h('video', {
    class: 'pg-vid', src: egg.clip, poster: egg.poster,
    playsinline: 'true', loop: 'true', preload: 'metadata', controls: 'true',
  }) as HTMLVideoElement;
  v.muted = true;
  void v.play().catch(() => { /* a paused poster is a fine fallback */ });
  return h('div', { class: 'pg pg-vidwrap' },
    h('h1', { class: 'pg-h' }, egg.title),
    h('p', { class: 'pg-sub' }, egg.clip.replace('media/', '')),
    v,
    h('p', { class: 'pg-note' }, egg.blurb));
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

/* Nam: "the folder icon is so yellow I cant see anything. It should be much
   more subtle, not full on yellow like this."
   Right — #ffd04b is the flat brand yellow, and against a #272727 pane it is the
   only thing the eye can find. Windows 11's own folder is a desaturated amber
   with a lighter front and a cool document peeking out, so it reads as an object
   rather than a highlighter. */
const icFolder = (): HTMLElement => svg('0 0 20 20', `
  <path d="M1.6 5.2a1.4 1.4 0 0 1 1.4-1.4h3.9l1.7 1.7h7.8a1.4 1.4 0 0 1 1.4 1.4v.5H1.6z" fill="#c98f22"/>
  <path d="M4.6 6.2h10.8v3.4H4.6z" fill="#dbe6f2"/>
  <path d="M1.6 7.3h16.8v7.9a1.4 1.4 0 0 1-1.4 1.4H3a1.4 1.4 0 0 1-1.4-1.4z" fill="#f2c04b"/>`);

const icPdf = (): HTMLElement => svg('0 0 20 20', `
  <path d="M4 2.2h7.4L16 6.8v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-14.6a1 1 0 0 1 1-1z" fill="#f4f4f4"/>
  <path d="M11.4 2.2 16 6.8h-4.6z" fill="#c8c8c8"/>
  <rect x="2.2" y="10" width="11.6" height="6.4" rx="1" fill="#d13438"/>
  <text x="8" y="14.9" font-family="Segoe UI, sans-serif" font-size="4.6" font-weight="700" fill="#fff" text-anchor="middle">PDF</text>`);

/* A .html document, and a video file. Nam: "what the heck is that .url? Let's
   have them either .pdf or .html" -- and the clips get a video glyph, since
   every file in the listing now carries an extension a person recognises. */
const icHtml = (): HTMLElement => svg('0 0 20 20', `
  <path d="M4.5 2.5h7l4 4v11a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" fill="#e8eaed"/>
  <path d="M11.5 2.5l4 4h-4v-4Z" fill="#bdc1c6"/>
  <path d="M7.6 10.4l-1.3 1.5 1.3 1.5" stroke="#1f6feb" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <path d="M11.0 10.4l1.3 1.5-1.3 1.5" stroke="#1f6feb" stroke-width="1.1" fill="none" stroke-linecap="round"/>`, 'wx-g');

const icVideo = (): HTMLElement => svg('0 0 20 20', `
  <rect x="2.5" y="4.5" width="15" height="11" rx="2" fill="#8e44ad"/>
  <path d="M8.6 7.9v4.2l3.6-2.1z" fill="#fff"/>`, 'wx-g');

const icStart = (): HTMLElement => svg('0 0 20 20', `
  <rect x="2.4" y="2.4" width="6.6" height="6.6" rx=".7" fill="#4cc2ff"/>
  <rect x="11" y="2.4" width="6.6" height="6.6" rx=".7" fill="#4cc2ff"/>
  <rect x="2.4" y="11" width="6.6" height="6.6" rx=".7" fill="#4cc2ff"/>
  <rect x="11" y="11" width="6.6" height="6.6" rx=".7" fill="#4cc2ff"/>`);

/* The taskbar's Explorer icon, matched to Nam's own bar: a muted amber folder
   with a pale document and the blue strip Windows puts along its front. */
const icExplorerTask = (): HTMLElement => svg('0 0 20 20', `
  <path d="M1.4 4.8a1.3 1.3 0 0 1 1.3-1.3h4l1.6 1.6h8a1.3 1.3 0 0 1 1.3 1.3v.4H1.4z" fill="#c98f22"/>
  <path d="M4.4 5.9h11.2v3.6H4.4z" fill="#dbe6f2"/>
  <path d="M1.4 7.1h17.2v8.1a1.3 1.3 0 0 1-1.3 1.3H2.7a1.3 1.3 0 0 1-1.3-1.3z" fill="#f2c04b"/>
  <path d="M5.4 13.6h9.2v1.5H5.4z" fill="#5b8fd0"/>`);

/* Chrome's mark: the three arcs and the blue hub. Nam's note was that ours was
   not Chrome at all — it was a generic globe. */
/* Chrome's mark. Nam: "the app icon for chrome has a weird yellow background —
   get rid of it." That was the white disc under the arcs reading as a plate at
   taskbar size; the real mark has no plate at all, so the disc is gone and the
   arcs meet in the middle on their own. */
const icChrome = (): HTMLElement => svg('0 0 20 20', `
  <path d="M10 1.6a8.4 8.4 0 0 1 7.42 4.4H10a4 4 0 0 0-3.72 2.53L3.2 5.28A8.38 8.38 0 0 1 10 1.6z" fill="#ea4335"/>
  <path d="M3.2 5.28l3.08 3.25A4 4 0 0 0 6 10a4 4 0 0 0 3.02 3.88l-2.1 4.6A8.4 8.4 0 0 1 3.2 5.28z" fill="#34a853"/>
  <path d="M17.42 6A8.4 8.4 0 0 1 6.92 18.48l2.1-4.6A4 4 0 0 0 10 14a4 4 0 0 0 3.46-6z" fill="#fbbc05"/>
  <circle cx="10" cy="10" r="3.5" fill="#4285f4"/>`);

/* Per-tab favicons. Nam: "The tab icons are all chrome icons, please change
   that." They were — every tab reused the browser's own mark, which is the one
   icon a tab never shows. These are marks for what each tab actually is. */
const icFavCv = (): HTMLElement => svg('0 0 20 20', `
  <rect x="3" y="2" width="14" height="16" rx="2" fill="#e8eaed"/>
  <rect x="5.5" y="5" width="9" height="1.6" rx=".8" fill="#5f6368"/>
  <rect x="5.5" y="8.2" width="9" height="1.6" rx=".8" fill="#9aa0a6"/>
  <rect x="5.5" y="11.4" width="6" height="1.6" rx=".8" fill="#9aa0a6"/>`);
const icFavGoogle = (): HTMLElement => svg('0 0 20 20', `
  <path d="M10 8.2v3.4h4.8a4.2 4.2 0 0 1-1.8 2.7l2.9 2.2A8 8 0 0 0 18 10c0-.6-.06-1.2-.17-1.8z" fill="#4285f4"/>
  <path d="M10 18a8 8 0 0 0 5.55-2.02l-2.9-2.2A5 5 0 0 1 5.3 11.6l-3 2.3A8 8 0 0 0 10 18z" fill="#34a853"/>
  <path d="M5.3 11.6a4.8 4.8 0 0 1 0-3.06l-3-2.3a8 8 0 0 0 0 7.66z" fill="#fbbc05"/>
  <path d="M10 5.2c1.3 0 2.5.45 3.43 1.34l2.57-2.57A8 8 0 0 0 2.3 6.24l3 2.3A4.8 4.8 0 0 1 10 5.2z" fill="#ea4335"/>`);
const icFavWork = (): HTMLElement => svg('0 0 20 20', `
  <rect x="2.5" y="5" width="15" height="11" rx="2" fill="#8ab4f8"/>
  <path d="M7.5 5V3.8A1.3 1.3 0 0 1 8.8 2.5h2.4A1.3 1.3 0 0 1 12.5 3.8V5h-1.8V4.3h-1.4V5z" fill="#5f88c8"/>
  <rect x="2.5" y="9.4" width="15" height="1.5" fill="#5f88c8" opacity=".5"/>`);
const icFavMahjong = (): HTMLElement => svg('0 0 20 20', `
  <rect x="4" y="2.5" width="12" height="15" rx="1.8" fill="#f5f5f5"/>
  <rect x="5.4" y="4" width="9.2" height="12" rx="1.2" fill="#fff"/>
  <path d="M10 5.6l2.6 4.4h-5.2z" fill="#1a8f4a"/>
  <rect x="7.4" y="11" width="5.2" height="1.5" rx=".7" fill="#c5221f"/>
  <rect x="7.4" y="13.2" width="5.2" height="1.5" rx=".7" fill="#c5221f"/>`);
const FAVICONS: Record<string, () => HTMLElement> = {
  cv: icFavCv, jobad: icFavGoogle, work: icFavWork, riichi: icFavMahjong,
};

/* The desktop background.
 *
 * Nam: "window background is totally wrong... Its now just a blueish screen with
 * gradient from the center. I want a typical windows background."
 *
 * Fair — a radial glow is the abstract idea of Bloom, not a wallpaper. Windows
 * ships a photographic swirl: deep blue-to-teal ribbons curling out of the lower
 * left with a bright core and a dark vignette. This is that shape drawn with
 * layered bezier ribbons rather than a copy of the photograph, which is not mine
 * to ship and would not scale with the share frame.
 */
const wallpaper = (): HTMLElement => svg('0 0 1200 750', `
  <defs>
    <linearGradient id="wgA" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#0b1020"/>
      <stop offset="55%" stop-color="#102647"/>
      <stop offset="100%" stop-color="#071022"/>
    </linearGradient>
    <linearGradient id="wgB" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#1b6fb5" stop-opacity=".95"/>
      <stop offset="55%" stop-color="#2ea8c8" stop-opacity=".75"/>
      <stop offset="100%" stop-color="#7fd8e8" stop-opacity=".18"/>
    </linearGradient>
    <linearGradient id="wgC" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#0e3f7d" stop-opacity=".9"/>
      <stop offset="60%" stop-color="#3f86d6" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#bfe6f5" stop-opacity=".12"/>
    </linearGradient>
    <linearGradient id="wgD" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#5fc6e0" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#eaf9ff" stop-opacity=".05"/>
    </linearGradient>
    <radialGradient id="wgGlow" cx="34%" cy="72%" r="42%">
      <stop offset="0%" stop-color="#9fe4f5" stop-opacity=".38"/>
      <stop offset="100%" stop-color="#9fe4f5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="wgVig" cx="50%" cy="50%" r="72%">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".55"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#wgA)"/>
  <ellipse cx="410" cy="540" rx="430" ry="330" fill="url(#wgGlow)"/>
  <path d="M-40 790 C 190 620 300 470 470 330 C 620 205 810 140 1120 90 C 880 210 700 300 580 430 C 440 580 330 700 250 800 Z" fill="url(#wgC)"/>
  <path d="M-40 800 C 220 660 340 520 520 380 C 690 250 900 190 1240 150 C 960 280 780 370 650 500 C 520 630 420 730 350 810 Z" fill="url(#wgB)" opacity=".9"/>
  <path d="M40 810 C 260 700 380 590 540 470 C 700 350 880 290 1160 250 C 930 360 790 440 680 550 C 570 660 490 750 440 820 Z" fill="url(#wgD)" opacity=".7"/>
  <path d="M120 820 C 300 730 400 650 530 560 C 660 470 800 420 1000 390 C 840 470 740 530 650 610 C 560 690 500 760 470 830 Z" fill="#dff6ff" opacity=".10"/>
  <rect width="1200" height="750" fill="url(#wgVig)"/>`, 'dk-wall-art');

// ------------------------------------------------------------ the windows --


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
  /* Nam: "the minimize and maximize icons look way too small, especially the
     maximize icon." They were text glyphs — an en dash and a white square —
     whose optical sizes have nothing to do with each other or with the multiply
     sign next to them. Drawn instead, all three on the same 10px box with the
     same 1px stroke, which is how Windows draws its own. */
  const capMark = (kind: 'min' | 'max' | 'close'): HTMLElement => svg('0 0 10 10',
    kind === 'min' ? '<path d="M0 5h10" stroke="currentColor" stroke-width="1" fill="none"/>'
    : kind === 'max' ? '<rect x=".5" y=".5" width="9" height="9" stroke="currentColor" stroke-width="1" fill="none"/>'
    : '<path d="M0 0l10 10M10 0L0 10" stroke="currentColor" stroke-width="1" fill="none"/>', 'wx-cap-mark');

  const cap = (cls: string, label: string, kind: 'min' | 'max' | 'close', fn: () => void): HTMLElement => {
    const b = h('button', { class: 'wx-cap ' + cls, type: 'button', 'aria-label': label }, capMark(kind)) as HTMLButtonElement;
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
      o.full && o.onMinimise ? cap('wx-min', 'Minimize', 'min', o.onMinimise) : null,
      // Maximize is offered in BOTH modes now. Nam asked for "the rest", and
      // maximising a lone shared window is harmless and useful. Minimize still
      // is not: with no taskbar in Window mode there would be nowhere to restore
      // it from, so that one stays out.
      cap('wx-max', 'Maximize', 'max', toggleMax),
      cap('wx-close', 'Close', 'close', o.onClose)));

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

  /**
   * Resizing. Nam: "I also want resizing for the explorer and chrome."
   *
   * Eight handles, because a window you can only resize from one corner is a
   * window that feels drawn. The north and west edges move the origin as well as
   * the size, which is the part a naive implementation gets wrong -- drag the
   * left edge and the right edge must stay put.
   *
   * Clamped to a minimum that keeps the title bar and the command row usable,
   * and disabled while maximised, where there is nothing to resize into.
   */
  const MIN_W = 340;
  const MIN_H = 200;
  const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;
  for (const dir of DIRS) {
    const grip = h('div', { class: 'wx-rz wx-rz-' + dir, 'aria-hidden': 'true' }) as HTMLElement;
    grip.addEventListener('pointerdown', (e: PointerEvent) => {
      if (maxed) return;
      const host = el.parentElement?.getBoundingClientRect();
      if (!host) return;
      const r = el.getBoundingClientRect();
      const x0 = e.clientX;
      const y0 = e.clientY;
      const left0 = r.left - host.left;
      const top0 = r.top - host.top;
      el.classList.add('is-rz');
      try { grip.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
      e.preventDefault();
      e.stopPropagation();
      const move = (ev: PointerEvent): void => {
        const dx = ev.clientX - x0;
        const dy = ev.clientY - y0;
        let w = r.width;
        let hgt = r.height;
        let left = left0;
        let top = top0;
        if (dir.includes('e')) w = Math.min(r.width + dx, host.width - left0);
        if (dir.includes('s')) hgt = Math.min(r.height + dy, host.height - top0);
        if (dir.includes('w')) {
          w = Math.min(r.width - dx, left0 + r.width);
          left = left0 + (r.width - Math.max(w, MIN_W));
        }
        if (dir.includes('n')) {
          hgt = Math.min(r.height - dy, top0 + r.height);
          top = top0 + (r.height - Math.max(hgt, MIN_H));
        }
        w = Math.max(w, MIN_W);
        hgt = Math.max(hgt, MIN_H);
        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(hgt)}px`;
        el.style.left = `${Math.round(Math.max(0, left))}px`;
        el.style.top = `${Math.round(Math.max(0, top))}px`;
      };
      const up = (): void => {
        el.classList.remove('is-rz');
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
    });
    el.appendChild(grip);
  }

  return el;
}

/** The Explorer window's insides: command bar, breadcrumb, tree, list, status. */
function explorerBody(onOpen: (id: string) => void): { body: HTMLElement; status: HTMLElement } {
  /**
   * A folder tree you can actually walk, and every file opens.
   *
   * Nam: "richer navigation on the explorer, like other folders, real time
   * clinet, tools, this cv and off the clock - lets call it hobby instead...
   * Files should be openable, on chrome ofc... Irrelevant files should not be
   * shown at all, such as requirement map and measured spec."
   *
   * The rule is now: nothing is listed that cannot be opened. Every file names
   * one of the four pages the emulated Chrome already serves, so the listing
   * cannot drift from what exists -- a file that opened nothing would be exactly
   * the dead affordance the rest of this project keeps deleting.
   *
   * requirement-map.md and measured-spec.md are gone. They opened the work and
   * riichi tabs, which had nothing to do with either name.
   */
  interface Entry { name: string; kind: 'folder' | 'pdf' | 'html' | 'video'; tab?: string; to?: string; }

  /* Extensions are real ones now. Nam: "what the heck is that .url? Let's have
     them either .pdf or .html" -- fair, .url is a Windows shortcut stub nobody
     recognises on sight, and these behave like documents when opened. */
  const CV: Entry = { name: 'NamNguyen_CV_2026.pdf', kind: 'pdf', tab: 'cv' };
  const POSTING: Entry = { name: 'google-careers-posting.html', kind: 'html', tab: 'jobad' };
  const BUILT: Entry = { name: 'four-things-i-built.html', kind: 'html', tab: 'work' };
  const CLIENT: Entry = { name: 'riichi-mahjong-client.html', kind: 'html', tab: 'riichi' };
  const TOOLING: Entry = { name: 'internal-tooling.html', kind: 'html', tab: 'tools' };
  const OFFCLOCK: Entry = { name: 'off-the-clock.html', kind: 'html', tab: 'hobby' };
  /* The six easter-egg clips, from src/data/eggs.ts — the real files in
     docs/media, named exactly as they are on disk. */
  const CLIPS: Entry[] = eggs.map((e) => ({
    name: e.clip.replace('media/', ''), kind: 'video', tab: 'vid:' + e.id,
  }));

  /* "Off the clock" is "Hobby" now, per Nam. Its one shortcut is the mahjong
     client, which is the honest link rather than a filler: the hobby is what
     became the product. */
  const FOLDERS: Record<string, Entry[]> = {
    Work: [
      { name: 'Real-time client', kind: 'folder', to: 'Real-time client' },
      { name: 'Tools', kind: 'folder', to: 'Tools' },
      { name: 'This CV', kind: 'folder', to: 'This CV' },
      { name: 'Hobby', kind: 'folder', to: 'Hobby' },
      CV,
    ],
    'Real-time client': [CLIENT, BUILT],
    Tools: [TOOLING, BUILT],
    'This CV': [CV, POSTING],
    Hobby: [OFFCLOCK, ...CLIPS],
  };

  const TREE = ['Real-time client', 'Tools', 'This CV', 'Hobby'];

  let selected: HTMLElement | null = null;

  const glyph = (k: Entry['kind']): HTMLElement =>
    k === 'folder' ? icFolder() : k === 'pdf' ? icPdf() : k === 'video' ? icVideo() : icHtml();

  const list = h('div', { class: 'wx-list', role: 'list' }) as HTMLElement;
  const crumb = h('div', { class: 'wx-crumb' }) as HTMLElement;
  const treeWrap = h('div', { class: 'wx-tree', role: 'list' }) as HTMLElement;
  const status = h('div', { class: 'wx-status' }) as HTMLElement;

  const rowFor = (e: Entry): HTMLElement => {
    const r = h('div', { class: 'wx-row', tabindex: '0', role: 'listitem' },
      h('span', { class: 'wx-ico' }, glyph(e.kind)),
      h('span', { class: 'wx-name' }, e.name),
      e.kind === 'folder' ? h('span', { class: 'wx-count' }, String((FOLDERS[e.to ?? ''] ?? []).length)) : null) as HTMLElement;
    const act = (): void => {
      if (e.to) { go(e.to); return; }
      if (e.tab) onOpen(e.tab);
    };
    r.addEventListener('click', () => {
      selected?.classList.remove('is-sel');
      selected = r;
      r.classList.add('is-sel');
      // Single click opens. On a drawn desktop the double-click convention only
      // costs people the discovery.
      act();
    });
    r.addEventListener('keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Enter') act(); });
    return r;
  };

  function go(folder: string): void {
    selected = null;
    const items = FOLDERS[folder] ?? [];

    clear(list);
    for (const e of items) list.appendChild(rowFor(e));

    // The breadcrumb navigates. Without it there is no way back out of a folder,
    // and Explorer has no Back button in this layout.
    clear(crumb);
    const seg = (label: string, to?: string): HTMLElement => {
      const el = h('span', to ? { class: 'wx-crumb-up', role: 'button', tabindex: '0' } : {}, label) as HTMLElement;
      if (to) {
        el.addEventListener('click', () => go(to));
        el.addEventListener('keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Enter') go(to); });
      }
      return el;
    };
    crumb.append(
      h('span', { class: 'wx-crumb-ico' }, icFolder()),
      seg('This PC'), h('span', { class: 'wx-sep' }, '›'),
      seg('Documents'), h('span', { class: 'wx-sep' }, '›'),
    );
    if (folder === 'Work') {
      crumb.appendChild(h('span', { class: 'wx-here' }, 'Work'));
    } else {
      crumb.append(seg('Work', 'Work'), h('span', { class: 'wx-sep' }, '›'),
        h('span', { class: 'wx-here' }, folder));
    }

    for (const t of treeWrap.querySelectorAll('.wx-row')) {
      t.classList.toggle('is-open', (t as HTMLElement).dataset.folder === folder);
    }

    clear(status);
    status.append(
      h('span', {}, items.length + ' item' + (items.length === 1 ? '' : 's')),
      h('span', { class: 'wx-status-r' }, folder === 'Work' ? 'Documents › Work' : 'Documents › Work › ' + folder),
    );
  }

  for (const name of TREE) {
    const r = rowFor({ name, kind: 'folder', to: name });
    r.dataset.folder = name;
    treeWrap.appendChild(r);
  }

  const cmdBtn = (label: string): HTMLElement => h('span', { class: 'wx-cmd-btn' }, label);
  const cmdIco = (mark: string): HTMLElement => h('span', { class: 'wx-cmd-ico' }, mark);

  const body = h('div', { class: 'wx-body' },
    h('div', { class: 'wx-cmd' },
      cmdBtn('+ New'),
      h('span', { class: 'wx-cmd-sep' }),
      cmdIco('✂'), cmdIco('⧉'), cmdIco('\u{1F4CB}'), cmdIco('↻'),
      h('span', { class: 'wx-cmd-sep' }),
      cmdBtn('Sort'), cmdBtn('View')),
    crumb,
    h('div', { class: 'wx-cols' },
      treeWrap,
      h('div', { class: 'wx-files' },
        h('div', { class: 'wx-head' }, h('span', {}, 'Name'), h('span', {}, 'Date modified'), h('span', {}, 'Type')),
        list)));

  go('Work');

  return { body, status };
}

/**
 * The Chrome window the taskbar's Chrome icon opens — the four tabs the picker
 * offers, from the same array, so they cannot disagree.
 *
 * Nam: "Chrome icon works, but cannot change tab at all." It could not: the old
 * version replaced the page node on every click while the strip kept stale
 * closures, so the click landed and nothing moved. This keeps one page node and
 * repaints it, and returns a select() the file list can call — which is how
 * double-clicking a file in Explorer ends up focusing the right tab.
 */
function chromeWindow(o: { onEmpty: () => void }): { body: HTMLElement; select: (id: string) => void } {
  /**
   * Tabs you can open and close, not a fixed strip.
   *
   * Nam asked for "tab management for chrome". Before this the strip was the
   * picker's four sources, permanently, and each tab painted a stub paragraph
   * rather than the page. Now:
   *
   *   - every tab has a close button, and closing the last one closes the window,
   *     which is what Chrome does;
   *   - `+` opens a new tab;
   *   - opening a file from Explorer creates a tab if that page has none, so
   *     Tools, Hobby and the six clips can be reached without pretending they
   *     were already open in the picker;
   *   - a tab renders its REAL page from DOCS. The stub was the weakest part of
   *     the whole desktop -- clicking through to a paragraph saying "one of the
   *     four sources the picker offers" is a dead end dressed as content.
   */
  const page = h('div', { class: 'cb-page' }) as HTMLElement;
  const omni = h('span', {}, '');
  const strip = h('div', { class: 'cb-strip' }) as HTMLElement;

  interface Tab { id: string; el: HTMLElement }
  const open: Tab[] = [];
  let active = '';

  const paint = (id: string): void => {
    const doc = DOCS[id];
    active = id;
    omni.textContent = doc ? doc.host + '/' : 'chrome://new-tab-page';
    for (const t of open) t.el.classList.toggle('is-on', t.id === id);
    clear(page);
    if (doc) page.appendChild(doc.page());
    else page.appendChild(h('div', { class: 'pg cb-newtab' }, h('h1', { class: 'pg-h' }, 'New tab')));
  };

  const closeTab = (id: string): void => {
    const i = open.findIndex((t) => t.id === id);
    if (i < 0) return;
    open[i]!.el.remove();
    open.splice(i, 1);
    // Chrome closes the window with the last tab, so this does too.
    if (!open.length) { o.onEmpty(); return; }
    if (active === id) paint(open[Math.min(i, open.length - 1)]!.id);
  };

  const addTab = (id: string, focus: boolean): void => {
    const found = open.find((t) => t.id === id);
    if (found) { if (focus) paint(id); return; }
    const doc = DOCS[id];
    const fav = FAVICONS[id] ?? icChrome;
    const shut = h('button', { class: 'cb-x', type: 'button', 'aria-label': 'Close tab' }, '×') as HTMLButtonElement;
    shut.addEventListener('click', (e) => { e.stopPropagation(); closeTab(id); });
    const el = h('span', {
      class: 'cb-tab', role: 'tab', tabindex: '0', title: doc ? doc.title : 'New tab',
    }, h('span', { class: 'cb-tab-ico' }, fav()),
       h('span', { class: 'cb-tab-t' }, doc ? doc.title : 'New tab'),
       shut) as HTMLElement;
    el.addEventListener('click', () => paint(id));
    el.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') paint(id); });
    // Before the + button, so the strip keeps its shape.
    strip.insertBefore(el, strip.querySelector('.cb-new'));
    open.push({ id, el });
    if (focus) paint(id);
  };

  const plus = h('button', { class: 'cb-new', type: 'button', 'aria-label': 'New tab' }, '+') as HTMLButtonElement;
  let blanks = 0;
  plus.addEventListener('click', () => { blanks += 1; addTab('blank:' + blanks, true); });
  strip.appendChild(plus);

  // The four the picker says are already open.
  for (const t of TABS) addTab(t.id, false);
  if (TABS[0]) paint(TABS[0].id);

  const body = h('div', { class: 'wx-body cb' },
    strip,
    h('div', { class: 'cb-bar' },
      h('span', { class: 'cb-nav' }, '←'), h('span', { class: 'cb-nav' }, '→'),
      h('span', { class: 'cb-nav' }, '↻'),
      h('div', { class: 'cb-omni' }, omni)),
    page) as HTMLElement;

  return { body, select: (id: string) => addTab(id, true) };
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
/* No onOpen: a file click now routes to the emulated Chrome rather than out to
   the host page, which is what Nam asked for — the desktop is a closed machine. */
function pageDesktop(): HTMLElement {
  const surface = h('div', { class: 'dk-surface' }) as HTMLElement;
  const taskItems = h('div', { class: 'dk-task-mid' }) as HTMLElement;

  interface Live { el: HTMLElement; task: HTMLElement; min: boolean; kind: 'explorer' | 'chrome'; select?: (id: string) => void; }
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

  /** Focus the open Chrome if there is one, else open it, then select the tab. */
  const gotoTab = (id: string): void => {
    const existing = live.find((w) => w.kind === 'chrome');
    if (existing) {
      existing.min = false;
      existing.el.classList.remove('is-min');
      existing.task.classList.add('is-on');
      surface.appendChild(existing.el);
      existing.select?.(id);
      return;
    }
    openWindow('chrome', id);
  };

  const openWindow = (kind: 'explorer' | 'chrome', tabId?: string): void => {
    const title = kind === 'explorer' ? 'Work' : 'Nam Nguyen — Senior SWE, Web Development';
    const ico = kind === 'explorer' ? icExplorerTask : icChrome;
    let bodyEl: HTMLElement;
    let statusEl: HTMLElement | null = null;
    let select: ((id: string) => void) | undefined;
    if (kind === 'explorer') {
      // A file click inside Explorer goes to Chrome, not to the host page.
      const made = explorerBody(gotoTab);
      bodyEl = made.body; statusEl = made.status;
    } else {
      // Closing the last tab closes the window, exactly as Chrome does.
      const made = chromeWindow({ onEmpty: () => { rec.el?.remove(); task.remove(); const j = live.indexOf(rec); if (j >= 0) live.splice(j, 1); } });
      bodyEl = made.body; select = made.select;
      if (tabId) made.select(tabId);
    }
    const task = h('span', { class: 'dk-task is-on', role: 'button', tabindex: '0', 'aria-label': title }, ico()) as HTMLElement;
    const rec: Live = { el: null as unknown as HTMLElement, task, min: false, kind, select };
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
