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
import { buildDoc } from './built.js';

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
DOCS['built'] = { title: 'How this was built', host: 'southocean.github.io', page: () => buildDoc() };
DOCS['side'] = { title: 'Side projects and dev tools', host: 'southocean.github.io', page: () => pageSide() };
for (const e of eggs) {
  DOCS['vid:' + e.id] = {
    title: e.title,
    host: 'southocean.github.io',
    page: () => pageVideo(e.id),
  };
}

/**
 * Resolve a tab id, including `ext:<url>` for the real sites in the Portfolio
 * folder. Nam asked to "actually input an url to the address bar and go to the
 * url as an iframe", and the same mechanism serves both: the omnibox and a file
 * that points outward end up in the same code path.
 */
function docFor(id: string): Doc | undefined {
  if (id.startsWith('ext:')) {
    const url = id.slice(4);
    let host = url;
    try { host = new URL(url).host; } catch { /* leave the raw string */ }
    return { title: host, host, page: () => pageExternal(url) };
  }
  return DOCS[id];
}

/**
 * A real site, framed.
 *
 * Most sites refuse to be framed -- X-Frame-Options or a frame-ancestors CSP --
 * and there is no way to detect that from the outside, because the load event
 * does not fire and no error is exposed. So this races a timer: if nothing has
 * painted after 3.5s the frame is replaced by a panel that says so and shows the
 * address. That is the truthful outcome rather than an empty white rectangle.
 */
function pageExternal(url: string): HTMLElement {
  /*
   * Eager, not lazy.
   *
   * Nam: "it doesnt seem that I can load websites in the iframe inside the mock
   * chrome." Measured, and the mechanism is fine — example.com frames in 13ms
   * through this exact path. kenh14.vn, which is what the screenshot showed,
   * genuinely refuses: it sends a framing policy and there is nothing to fix.
   *
   * But `loading: lazy` was a real trap waiting. A lazy frame defers while it is
   * off-screen — measured at no load in 4s off-screen against 59ms on-screen — and
   * this frame is built into a window that can be behind another, minimised, or
   * mid-transition. Any of those would have tripped the 3.5s timeout and blamed
   * the site for our own deferral. There is no benefit to weigh against that: the
   * frame is only created when a tab asks for it.
   */
  const frame = h('iframe', {
    class: 'cb-frame', src: url, title: url,
    loading: 'eager', referrerpolicy: 'no-referrer',
  }) as HTMLIFrameElement;
  const wrap = h('div', { class: 'cb-ext' }, frame) as HTMLElement;
  let painted = false;
  frame.addEventListener('load', () => { painted = true; wrap.classList.add('is-live'); });
  window.setTimeout(() => {
    if (painted) return;
    frame.remove();
    wrap.appendChild(h('div', { class: 'pg cb-blocked' },
      h('h1', { class: 'pg-h' }, 'This site will not load in a frame'),
      h('p', { class: 'pg-sub' }, url),
      h('p', {}, 'Most sites send X-Frame-Options or a frame-ancestors policy that forbids embedding, and a ' +
        'page cannot detect that from the outside -- no error is exposed. So this is a timeout, honestly ' +
        'labelled, rather than a blank rectangle.'),
      h('p', {}, 'Sites without that policy do load here — example.com frames in about 13ms. Most large ' +
        'sites set it, so most large sites will land on this page.'),
      h('p', { class: 'pg-note' }, 'Open it in a real tab to see it.')));
  }, 3500);
  return wrap;
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

/**
 * Side projects and dev tools. Nam: "some dev tools we've built such as
 * https://game.mstardev.com/bot.html. Then we can add another file my games,
 * which list some prominent entries in my itch.io."
 *
 * The games are linked as a profile rather than named individually, because the
 * titles are not in this repo's data and naming them from memory would be the
 * one invented thing on an otherwise sourced page.
 */
function pageSide(): HTMLElement {
  const link = (label: string, url: string, note: string): HTMLElement => {
    const b = h('button', { class: 'pg-link', type: 'button' }, label) as HTMLButtonElement;
    b.dataset.ext = url;
    return h('div', { class: 'pg-role' }, b, h('span', {}, note), h('span', { class: 'pg-url' }, url));
  };
  return h('div', { class: 'pg' },
    h('h1', { class: 'pg-h' }, 'Side projects and dev tools'),
    h('p', { class: 'pg-sub' }, 'The things that are not the CV'),
    h('p', { class: 'pg-lead' },
      'Tooling built to make the day job possible, and a back catalogue of small games. Both are real and ' +
      'both open in this browser.'),
    h('div', { class: 'pg-roles' },
      link('Bot controller', 'https://game.mstardev.com/bot.html',
        'Drives bots onto live game tables so a real-time client can be tested without four colleagues. The ' +
        'Test automation line on the CV is this.'),
      link('Riichi Mahjong client', 'https://game.mstardev.com/',
        'The production client itself, seven years and two platform generations of it.'),
      link('itch.io — southocean', 'https://southocean.itch.io',
        'Small games, most of them old. Listed as a profile rather than a highlight reel: they are not the ' +
        'strongest thing here and pretending otherwise would be the wrong trade.')),
    h('p', { class: 'pg-note' }, 'Clicking a title opens it in a tab. Some sites refuse to be framed, and this browser says so when they do.'));
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
const svg = (vb: string, body: string, cls = '', fit = ''): HTMLElement => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', vb);
  el.setAttribute('aria-hidden', 'true');
  /* The wallpaper has to COVER, not fit. Nam: "the window screen is not fully
     extending to the full screensharing view, but get weirdly cut off around the
     16:9 ratio". An SVG defaults to preserveAspectRatio="xMidYMid meet", which
     letterboxes -- so a 1200x750 wallpaper in a wider share left dark bands down
     both sides while the taskbar and the windows correctly filled the width.
     "slice" is the SVG spelling of object-fit: cover. */
  if (fit) el.setAttribute('preserveAspectRatio', fit);
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
  <rect width="1200" height="750" fill="url(#wgVig)"/>`, 'dk-wall-art', 'xMidYMid slice');

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

  /**
   * Maximise, and put the window back exactly where it was.
   *
   * Two bugs lived here once resizing existed, and both were invisible to a test
   * that asserted the class instead of the geometry:
   *
   *   1. `.wx.is-max` maximises with `width: 100%`, and resizing writes an INLINE
   *      width. Inline always wins, so after any resize the class flipped and the
   *      window did not move an inch. Nam: "the minimize, maximize and close
   *      buttons here dont work AT ALL" -- maximize genuinely did not.
   *   2. it cleared left/top on the way in and never restored them, so
   *      un-maximising dropped the window at the host's origin rather than
   *      returning it to where it had been dragged.
   *
   * Saving all four and clearing all four fixes both: with no inline width there
   * is nothing left to beat the stylesheet.
   */
  let saved: { left: string; top: string; width: string; height: string } | null = null;

  const toggleMax = (): void => {
    maxed = !maxed;
    el.classList.toggle('is-max', maxed);
    if (maxed) {
      saved = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
      el.style.height = '';
    } else if (saved) {
      el.style.left = saved.left;
      el.style.top = saved.top;
      el.style.width = saved.width;
      el.style.height = saved.height;
      saved = null;
    }
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
  const HOWBUILT: Entry = { name: 'how-this-is-built.html', kind: 'html', tab: 'built' };
  const SIDE: Entry = { name: 'side-projects.html', kind: 'html', tab: 'side' };
  const MAHJONG: Entry = { name: 'mahjong-client.html', kind: 'html', tab: 'ext:https://game.mstardev.com/' };
  const OFFCLOCK: Entry = { name: 'off-the-clock.html', kind: 'html', tab: 'hobby' };
  /* The six easter-egg clips, from src/data/eggs.ts — the real files in
     docs/media, named exactly as they are on disk. */
  const CLIPS: Entry[] = eggs.map((e) => ({
    name: e.clip.replace('media/', ''), kind: 'video', tab: 'vid:' + e.id,
  }));

  /* "Off the clock" is "Hobby" now, per Nam. Its one shortcut is the mahjong
     client, which is the honest link rather than a filler: the hobby is what
     became the product. */
  /* Tools is gone -- Nam: "probably can remove, not very relevant" -- and
     Real-time client is Portfolio, which is what it actually held. */
  const FOLDERS: Record<string, Entry[]> = {
    Work: [
      { name: 'Portfolio', kind: 'folder', to: 'Portfolio' },
      { name: 'This CV', kind: 'folder', to: 'This CV' },
      { name: 'Hobby', kind: 'folder', to: 'Hobby' },
      CV,
    ],
    Portfolio: [MAHJONG, BUILT, SIDE],
    'This CV': [CV, POSTING, HOWBUILT],
    Hobby: [OFFCLOCK, ...CLIPS],
  };

  const TREE = ['Portfolio', 'This CV', 'Hobby'];

  let selected: HTMLElement | null = null;

  const glyph = (k: Entry['kind']): HTMLElement =>
    k === 'folder' ? icFolder() : k === 'pdf' ? icPdf() : k === 'video' ? icVideo() : icHtml();

  const list = h('div', { class: 'wx-list', role: 'list' }) as HTMLElement;
  const crumb = h('div', { class: 'wx-crumb' }) as HTMLElement;
  const treeWrap = h('div', { class: 'wx-tree', role: 'list' }) as HTMLElement;
  const status = h('div', { class: 'wx-status' }) as HTMLElement;

  /**
   * Explorer's real interaction, which is not what we had.
   *
   * Nam: "clicking on the folder now opens it right away - wrong interaction.
   * Mirror the same interaction on windows. Click is select, click again will
   * change name, then double click opens, consistent between files and folders."
   *
   * So: first click selects, a second click on an already-selected row starts a
   * rename, and a double click opens. A double click necessarily fires two
   * clicks first, so the rename has to be deferred and cancelled when the second
   * click arrives -- otherwise every open would flash an edit field on the way
   * through. 260ms is inside the platform double-click threshold.
   *
   * Selection is tracked in ONE variable across the tree and the list together.
   * Nam: "the folders on the left dont release their highlight it seems, so if I
   * click all of them then they all have a highlight" -- that was two separate
   * row factories each keeping their own idea of what was selected.
   */
  const rowFor = (e: Entry, inTree: boolean): HTMLElement => {
    const r = h('div', { class: 'wx-row', tabindex: '0', role: 'listitem' },
      h('span', { class: 'wx-ico' }, glyph(e.kind)),
      h('span', { class: 'wx-name' }, e.name),
      e.kind === 'folder' ? h('span', { class: 'wx-count' }, String((FOLDERS[e.to ?? ''] ?? []).length)) : null) as HTMLElement;

    const act = (): void => {
      if (e.to) { go(e.to); return; }
      if (e.tab) onOpen(e.tab);
    };

    let pending = 0;
    r.addEventListener('click', () => {
      const wasSelected = selected === r;
      select(r);
      // The tree is a navigation pane: Windows does not rename from it, and a
      // single click there moves you. Renaming stays a list gesture.
      if (inTree) { act(); return; }
      if (!wasSelected) return;
      window.clearTimeout(pending);
      pending = window.setTimeout(() => rename(r, e), 260);
    });
    r.addEventListener('dblclick', () => { window.clearTimeout(pending); act(); });
    r.addEventListener('keydown', (ev) => {
      const k = (ev as KeyboardEvent).key;
      if (k === 'Enter') act();
      if (k === 'F2') { ev.preventDefault(); rename(r, e); }
    });
    return r;
  };

  /** One selection across both panes, so highlights cannot accumulate. */
  function select(r: HTMLElement): void {
    if (selected === r) return;
    selected?.classList.remove('is-sel');
    selected = r;
    r.classList.add('is-sel');
  }

  /** Rename in place. Explorer selects the stem and leaves the extension alone. */
  function rename(r: HTMLElement, e: Entry): void {
    const label = r.querySelector<HTMLElement>('.wx-name');
    if (!label || r.querySelector('input')) return;
    const was = label.textContent ?? '';
    const input = h('input', { class: 'wx-rename', type: 'text', value: was }) as HTMLInputElement;
    label.replaceWith(input);
    input.focus();
    const dot = was.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 && e.kind !== 'folder' ? dot : was.length);
    /**
     * Guarded, because blur fires AFTER Enter or Escape has already swapped the
     * input out -- and replaceWith on a detached node throws NotFoundError. The
     * console caught it during QA:
     *   "Failed to execute 'replaceWith'... The node to be removed is no longer
     *    a child of this node. Perhaps it was moved in a 'blur' event handler?"
     */
    let done = false;
    const finish = (commit: boolean): void => {
      if (done) return;
      done = true;
      const next = commit && input.value.trim() ? input.value.trim() : was;
      input.replaceWith(h('span', { class: 'wx-name' }, next));
    };
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function go(folder: string): void {
    // The old selection lived in the list that is about to be replaced, so it
    // has to be released here or its highlight outlives its row.
    selected?.classList.remove('is-sel');
    selected = null;
    const items = FOLDERS[folder] ?? [];

    clear(list);
    for (const e of items) list.appendChild(rowFor(e, false));

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
    const r = rowFor({ name, kind: 'folder', to: name }, true);
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
function chromeWindow(o: { onEmpty: () => void }): { body: HTMLElement; select: (id: string) => void; setOmni: (t: string) => void } {
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
  const strip = h('div', { class: 'cb-strip' }) as HTMLElement;

  /**
   * History belongs to the TAB, not the window.
   *
   * Nam: "pressing refresh on any tab on the mock chrome would bring me to the
   * first tab?!" It did, every time. There was one `trail`/`at` pair for the whole
   * window, and clicking a tab called paint() without touching it — so the cursor
   * never moved off the seed value set at construction. Reload read trail[at],
   * which was permanently the first tab, and dutifully went there.
   *
   * Back and forward had the same defect, less visibly: they walked a history
   * that mixed every tab together.
   *
   * Chrome gives each tab its own back/forward stack, so this does too. The
   * window-level trail is gone rather than patched, because a single shared
   * history is the bug, not the symptom.
   */
  /**
   * One history for the window, over the documents you have LOOKED AT.
   *
   * Nam's bug was reload: "pressing refresh on any tab would bring me to the
   * first tab?!" There was a single trail/at pair that clicking a tab never
   * touched, so the cursor sat on the seed value and reload dutifully went there.
   *
   * My first fix gave every tab its own back/forward stack, Chrome-style. QA
   * caught that it does not work here, and the reason is worth writing down: in
   * this browser a tab IS a document. Opening anything creates or focuses a tab
   * rather than navigating the current one, so a per-tab stack is always length
   * one and Back has nowhere to go. Correct model, wrong browser.
   *
   * So the history is over VISITS — the order in which documents were shown.
   * Back returns to the last thing you were looking at, which is what the button
   * means to someone who presses it, and it composes with tabs-as-documents
   * instead of fighting them.
   *
   * paint() records; the nav buttons suppress recording while they move the
   * cursor, or Back would push the place it just came from and never advance.
   */
  interface Tab { id: string; el: HTMLElement }
  const open: Tab[] = [];
  let active = '';
  const visits: string[] = [];
  let at = -1;
  let replaying = false;

  const paint = (id: string): void => {
    const doc = docFor(id);
    active = id;
    // Record the visit unless a nav button is walking the list already.
    if (!replaying && visits[at] !== id) { visits.splice(at + 1); visits.push(id); at = visits.length - 1; }
    // ext: ids carry the whole address; the registry ones only have a host.
    setOmni(id.startsWith('ext:') ? id.slice(4) : doc ? doc.host + '/' : 'chrome://new-tab-page');
    for (const t of open) t.el.classList.toggle('is-on', t.id === id);
    clear(page);
    if (doc) page.appendChild(doc.page());
    else page.appendChild(h('div', { class: 'pg cb-newtab' }, h('h1', { class: 'pg-h' }, 'New tab')));
    // A page may carry outward links (see pageSide). They open in this browser
    // rather than the host one, which is the whole point of the emulation.
    for (const b of page.querySelectorAll<HTMLElement>('[data-ext]')) {
      b.addEventListener('click', () => { const u = b.dataset.ext; if (u) goTo('ext:' + u, true); });
    }
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
    const doc = docFor(id);
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

  /**
   * Real nav glyphs and a working address bar.
   *
   * Nam: "the chrome implementation use wrong icons for backward, forward and
   * refresh... I also want to actually input an url to the address bar and go to
   * the url as an iframe." The arrows were the text characters
   * (left arrow, right arrow, clockwise-open-circle), whose weights and optical
   * sizes have nothing to do with each other. Drawn on one 24px box instead.
   */
  const navBtn = (label: string, body: string, fn: () => void): HTMLElement => {
    const b = h('button', { class: 'cb-nav', type: 'button', 'aria-label': label },
      svg('0 0 24 24', body, 'cb-nav-g')) as HTMLButtonElement;
    b.addEventListener('click', fn);
    return b;
  };

  /**
   * Navigating replaces the forward stack of the tab you are on, which is what a
   * browser does. A brand-new tab gets its stack seeded in addTab.
   */
  /* push is honoured by paint() now; the parameter stays so callers read the same. */
  const goTo = (id: string, _push: boolean): void => { addTab(id, true); };

  const field = h('input', {
    class: 'cb-omni-in', type: 'text', 'aria-label': 'Address and search bar',
    spellcheck: 'false', autocomplete: 'off',
  }) as HTMLInputElement;
  const setOmni = (text: string): void => { field.value = text; };
  field.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const raw = field.value.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    goTo('ext:' + url, true);
  });
  field.addEventListener('focus', () => field.select());

  const body = h('div', { class: 'wx-body cb' },
    strip,
    h('div', { class: 'cb-bar' },
      navBtn('Back', '<path d="M20 11H7.8l5.6-5.6-1.4-1.4L4 12l8 8 1.4-1.4L7.8 13H20z" fill="currentColor"/>',
        () => { if (at > 0) { at -= 1; replaying = true; addTab(visits[at]!, true); replaying = false; } }),
      navBtn('Forward', '<path d="M4 11h12.2l-5.6-5.6L12 4l8 8-8 8-1.4-1.4 5.6-5.6H4z" fill="currentColor"/>',
        () => { if (at < visits.length - 1) { at += 1; replaying = true; addTab(visits[at]!, true); replaying = false; } }),
      // Reload repaints the ACTIVE tab. It used to repaint trail[at], which is
      // how pressing it on any tab took you to the first one.
      navBtn('Reload', '<path d="M17.65 6.35A8 8 0 1 0 19.73 14h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" fill="currentColor"/>',
        () => { if (active) paint(active); }),
      h('div', { class: 'cb-omni' }, field)),
    page) as HTMLElement;

  /**
   * Seeded LAST, deliberately. paint() reaches for goTo and setOmni, which are
   * `const` declarations further down -- calling it during construction threw a
   * TDZ ReferenceError before the window ever appeared. TypeScript does not
   * catch that; the ordering is the fix.
   */
  for (const t of TABS) addTab(t.id, false);
  if (TABS[0]) paint(TABS[0].id);

  return { body, select: (id: string) => goTo(id, true), setOmni };
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
/**
 * A media player, because a clip is not a web page.
 *
 * Nam: "the videos should be open on a media player of some sort, not on chrome.
 * Add that emulation too. Make sure to contain all the basic controller."
 *
 * Custom controls rather than the browser's own, so the window reads as an app
 * instead of an embedded video: play/pause, a seek bar that scrubs, elapsed and
 * total time, mute and volume.
 */
function playerWindow(id: string): { body: HTMLElement; select: (id: string) => void; title: () => string } {
  let egg = eggs.find((e) => e.id === id) ?? eggs[0]!;

  const video = h('video', {
    class: 'mp-video', src: egg.clip, poster: egg.poster,
    playsinline: 'true', preload: 'metadata',
  }) as HTMLVideoElement;

  const playMark = svg('0 0 24 24', '<path d="M8 5v14l11-7z" fill="currentColor"/>', 'mp-g');
  const pauseMark = svg('0 0 24 24', '<path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/>', 'mp-g');
  const playBtn = h('button', { class: 'mp-btn mp-play', type: 'button', 'aria-label': 'Play' }, playMark) as HTMLButtonElement;

  const seek = h('input', { class: 'mp-seek', type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Seek' }) as HTMLInputElement;
  const time = h('span', { class: 'mp-time' }, '0:00 / 0:00') as HTMLElement;

  const muteOn = svg('0 0 24 24', '<path d="M4 9h3l4-4v14l-4-4H4zm11.5 3a4 4 0 0 0-2-3.46v6.92A4 4 0 0 0 15.5 12z" fill="currentColor"/>', 'mp-g');
  const muteOff = svg('0 0 24 24', '<path d="M4 9h3l4-4v14l-4-4H4zm12.7 6.3-1.4-1.4 1.6-1.6-1.6-1.6 1.4-1.4 1.6 1.6 1.6-1.6 1.4 1.4-1.6 1.6 1.6 1.6-1.4 1.4-1.6-1.6z" fill="currentColor"/>', 'mp-g');
  const muteBtn = h('button', { class: 'mp-btn', type: 'button', 'aria-label': 'Mute' }, muteOn) as HTMLButtonElement;

  const vol = h('input', { class: 'mp-vol', type: 'range', min: '0', max: '100', value: '100', 'aria-label': 'Volume' }) as HTMLInputElement;

  const clock = (n: number): string => {
    if (!Number.isFinite(n)) return '0:00';
    const m = Math.floor(n / 60);
    return m + ':' + String(Math.floor(n % 60)).padStart(2, '0');
  };
  const syncTime = (): void => {
    const d = video.duration;
    time.textContent = clock(video.currentTime) + ' / ' + clock(d);
    if (Number.isFinite(d) && d > 0 && !scrubbing) seek.value = String(Math.round((video.currentTime / d) * 1000));
  };
  const syncPlay = (): void => {
    clear(playBtn);
    playBtn.appendChild(video.paused ? playMark : pauseMark);
    playBtn.setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
  };

  let scrubbing = false;
  playBtn.addEventListener('click', () => { if (video.paused) void video.play().catch(() => {}); else video.pause(); });
  video.addEventListener('play', syncPlay);
  video.addEventListener('pause', syncPlay);
  video.addEventListener('timeupdate', syncTime);
  video.addEventListener('loadedmetadata', syncTime);
  video.addEventListener('ended', syncPlay);
  seek.addEventListener('pointerdown', () => { scrubbing = true; });
  seek.addEventListener('pointerup', () => { scrubbing = false; });
  seek.addEventListener('input', () => {
    const d = video.duration;
    if (Number.isFinite(d) && d > 0) video.currentTime = (Number(seek.value) / 1000) * d;
  });
  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    clear(muteBtn);
    muteBtn.appendChild(video.muted ? muteOff : muteOn);
    muteBtn.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute');
  });
  vol.addEventListener('input', () => { video.volume = Number(vol.value) / 100; if (video.muted && Number(vol.value) > 0) muteBtn.click(); });

  const caption = h('div', { class: 'mp-cap' }, egg.blurb) as HTMLElement;

  const body = h('div', { class: 'wx-body mp' },
    h('div', { class: 'mp-stage' }, video),
    h('div', { class: 'mp-bar' },
      playBtn, seek, time, muteBtn, vol),
    caption) as HTMLElement;

  syncPlay();

  /*
   * Start playing on open. Nam: "the media player should auto start the video."
   *
   * Muted, because that is the only kind of autoplay a browser allows without a
   * gesture — and it is the behaviour we want anyway: the volume control is right
   * there, and a player that starts talking at you unprompted is worse than one
   * you have to unmute. The same reasoning the egg player already used; this one
   * simply never called play() except from select().
   *
   * The rejection is swallowed on purpose. If a policy blocks it the poster stays
   * up with a working play button, which is a fine outcome and not an error worth
   * surfacing.
   */
  video.muted = true;
  void video.play().then(syncPlay).catch(() => { /* poster + play button is fine */ });

  return {
    body,
    select: (next: string) => {
      const found = eggs.find((e) => e.id === next.replace(/^vid:/, ''));
      if (!found) return;
      egg = found;
      video.src = egg.clip;
      video.poster = egg.poster;
      caption.textContent = egg.blurb;
      void video.play().catch(() => {});
    },
    title: () => egg.title,
  };
}

/**
 * The Screen source: a desktop with a taskbar that manages focus properly.
 *
 * Three of Nam's reports were all the same underlying gap -- there was no single
 * owner of "which window is active":
 *
 *   1. running-but-inactive and active looked identical;
 *   2. every window added its own taskbar icon, so two Chromes meant two icons
 *      instead of one grouped button;
 *   7. "both apps are active at the same time => wrong... it feels that the
 *      mocked OS is not managing the selected apps very well, leading to race
 *      condition of which app is active" -- exactly right. Opening from Explorer
 *      left `is-on` set on the Explorer item AND the new Chrome item, and the
 *      taskbar click handler toggled minimise blindly, so the first click after
 *      that only cleared a highlight.
 *
 * So: one `focused` reference, one `paint()` that derives every taskbar state
 * from it, and one button per app rather than per window.
 */
type AppKind = 'explorer' | 'chrome' | 'player';

function pageDesktop(): HTMLElement {
  const surface = h('div', { class: 'dk-surface' }) as HTMLElement;

  interface Live {
    el: HTMLElement;
    kind: AppKind;
    min: boolean;
    title: string;
    select?: (id: string) => void;
    setTitle?: (t: string) => void;
  }
  const live: Live[] = [];
  let focused: Live | null = null;

  let topZ = 10;
  /* z-index, never appendChild: moving a node mid-gesture retargets the
     following mousedown and the click is never dispatched. */
  const raise = (el: HTMLElement): void => { el.style.zIndex = String(++topZ); };

  /**
   * Pinned apps stay on the bar; unpinned ones appear only while running.
   *
   * Nam: "we have a media player on the taskbar, and clicking it auto opening the
   * tandem video, which is weird." It was. A launcher for a media player has to
   * answer "which media?", and the only answer available was eggs[0] — so the
   * button silently decided you wanted the skydiving clip.
   *
   * A media player is a document-launched app. You open a file and it appears;
   * you close it and it goes. So it is no longer pinned, which deletes the
   * arbitrary choice rather than dressing it up, and it still gets a task button
   * for as long as a window is open — minimise, restore and grouping all keep
   * working because they were never tied to the pin.
   */
  const APPS: { kind: AppKind; label: string; ico: () => HTMLElement; pinned: boolean }[] = [
    { kind: 'explorer', label: 'File Explorer', ico: icExplorerTask, pinned: true },
    { kind: 'chrome', label: 'Google Chrome', ico: icChrome, pinned: true },
    { kind: 'player', label: 'Media Player', ico: icVideo, pinned: false },
  ];
  const buttons = new Map<AppKind, HTMLElement>();

  /**
   * Every taskbar state, derived from `focused` in one pass.
   *
   * Nam: "when something is on but not active, it has a tiny gray bar
   * underneath, but when the window is active it has a blue line and a selected
   * background state. all very subtle." So three states, not two: idle, running,
   * active -- and a minimised window still counts as running.
   */
  const paint = (): void => {
    for (const app of APPS) {
      const b = buttons.get(app.kind);
      if (!b) continue;
      const mine = live.filter((w) => w.kind === app.kind);
      const isActive = !!focused && !focused.min && focused.kind === app.kind;
      // An unpinned app has no button of its own; it borrows one while it runs.
      if (!app.pinned) b.hidden = mine.length === 0;
      b.classList.toggle('is-running', mine.length > 0);
      b.classList.toggle('is-on', isActive);
      b.classList.toggle('is-multi', mine.length > 1);
      b.setAttribute('aria-label', mine.length > 1 ? `${app.label} — ${mine.length} windows` : app.label);
    }
  };

  const focus = (w: Live): void => {
    w.min = false;
    w.el.classList.remove('is-min');
    focused = w;
    raise(w.el);
    paint();
  };

  const minimise = (w: Live): void => {
    w.min = true;
    w.el.classList.add('is-min');
    if (focused === w) {
      // Hand focus to the topmost window still on screen, so the taskbar never
      // shows an active app that is not visible.
      const rest = live.filter((x) => x !== w && !x.min);
      focused = rest.length ? rest[rest.length - 1]! : null;
    }
    paint();
  };

  const closeWin = (w: Live): void => {
    w.el.remove();
    const i = live.indexOf(w);
    if (i >= 0) live.splice(i, 1);
    if (focused === w) {
      const rest = live.filter((x) => !x.min);
      focused = rest.length ? rest[rest.length - 1]! : null;
    }
    paint();
  };

  /**
   * The hover list, grouped. Nam: "hovering opens up list of windows there so
   * you can click. You alreayd have this but not grouping all instances of the
   * same program on the same icon."
   *
   * A deep clone scaled down is the real layout rather than a drawing of it, so
   * the preview cannot drift from the window it previews.
   */
  const peek = (btn: HTMLElement, kind: AppKind): void => {
    let pop: HTMLElement | null = null;
    const hide = (): void => { pop?.remove(); pop = null; };
    const show = (): void => {
      hide();
      const mine = live.filter((w) => w.kind === kind);
      if (!mine.length) return;
      const app = APPS.find((a) => a.kind === kind)!;
      pop = h('div', { class: 'dk-peek' }) as HTMLElement;
      for (const w of mine) {
        const mini = w.el.cloneNode(true) as HTMLElement;
        mini.classList.remove('is-drag', 'is-min');
        mini.style.left = '0';
        mini.style.top = '0';
        mini.style.zIndex = '0';
        const card = h('div', { class: 'dk-peek-card', role: 'button', tabindex: '0' },
          h('div', { class: 'dk-peek-t' }, h('span', { class: 'dk-peek-ico' }, app.ico()), w.title),
          h('div', { class: 'dk-peek-shot' }, h('div', { class: 'dk-peek-scale' }, mini))) as HTMLElement;
        card.addEventListener('click', () => { hide(); focus(w); });
        pop.appendChild(card);
      }
      const r = btn.getBoundingClientRect();
      const host = surface.getBoundingClientRect();
      pop.style.left = `${Math.round(r.left - host.left + r.width / 2)}px`;
      pop.addEventListener('pointerleave', hide);
      surface.appendChild(pop);
    };
    btn.addEventListener('pointerenter', show);
    btn.addEventListener('pointerleave', (e) => {
      // Leaving downward means the pointer is heading into the list.
      const to = (e as PointerEvent).relatedTarget as Node | null;
      if (pop && to && pop.contains(to)) return;
      window.setTimeout(() => { if (!pop?.matches(':hover')) hide(); }, 120);
    });
    btn.addEventListener('click', hide);
  };

  /** Focus an existing window of a kind, or open one, then hand it the id. */
  const route = (kind: AppKind, id: string): void => {
    const existing = live.find((w) => w.kind === kind);
    if (existing) {
      focus(existing);
      existing.select?.(id);
      if (kind === 'player') existing.setTitle?.(existing.title);
      return;
    }
    openWindow(kind, id);
  };

  /* Explorer routes clips to the player and everything else to Chrome. */
  const openFile = (id: string): void => {
    if (id.startsWith('vid:')) { route('player', id); return; }
    route('chrome', id);
  };

  function openWindow(kind: AppKind, tabId?: string): void {
    const app = APPS.find((a) => a.kind === kind)!;
    let bodyEl: HTMLElement;
    let statusEl: HTMLElement | null = null;
    let select: ((id: string) => void) | undefined;
    let title = kind === 'explorer' ? 'Work' : app.label;

    const rec: Live = { el: null as unknown as HTMLElement, kind, min: false, title, select };

    if (kind === 'explorer') {
      const made = explorerBody(openFile);
      bodyEl = made.body;
      statusEl = made.status;
    } else if (kind === 'chrome') {
      const made = chromeWindow({ onEmpty: () => closeWin(rec) });
      bodyEl = made.body;
      select = made.select;
      title = 'Nam Nguyen — Senior SWE, Web Development';
      if (tabId) made.select(tabId);
    } else {
      const made = playerWindow((tabId ?? '').replace(/^vid:/, ''));
      bodyEl = made.body;
      select = made.select;
      title = made.title();
      rec.setTitle = () => { rec.title = made.title(); };
    }

    rec.select = select;
    rec.title = title;

    const el = win11({
      title, icon: app.ico, body: bodyEl, status: statusEl, full: true,
      onClose: () => closeWin(rec),
      onMinimise: () => minimise(rec),
    });
    rec.el = el;

    // Cascade, so a second window does not land exactly on the first.
    const n = live.length;
    el.style.left = `${60 + n * 28}px`;
    el.style.top = `${40 + n * 26}px`;
    el.addEventListener('pointerdown', () => focus(rec), true);

    live.push(rec);
    surface.appendChild(el);
    focus(rec);
  }

  // Start, and a small menu so the button is not a lie.
  const start = h('button', { class: 'dk-task dk-start', type: 'button', 'aria-label': 'Start' }, icStart()) as HTMLButtonElement;
  let menu: HTMLElement | null = null;
  start.addEventListener('click', () => {
    if (menu) { menu.remove(); menu = null; return; }
    menu = h('div', { class: 'dk-start-menu' },
      h('div', { class: 'dk-start-h' }, 'Pinned'),
      h('div', { class: 'dk-start-grid' },
        // Same reasoning as the pin: Start is a list of things you can launch, and
        // a media player with no file to open is not one of them.
        ...APPS.filter((a) => a.pinned).map((a) => h('button', {
          class: 'dk-start-app', type: 'button',
          onclick: () => { openWindow(a.kind); menu?.remove(); menu = null; },
        }, h('span', {}, a.ico()), h('span', {}, a.label)))),
      h('div', { class: 'dk-start-foot' }, h('span', { class: 'dk-start-av' }, 'NN'), profile.name)) as HTMLElement;
    surface.appendChild(menu);
  });

  /**
   * One button per app. Click behaviour follows Windows:
   *   nothing running  -> launch
   *   one window       -> focused? minimise : focus
   *   several          -> show the list and let the pointer choose
   */
  const taskBtn = (app: { kind: AppKind; label: string; ico: () => HTMLElement; pinned: boolean }): HTMLElement => {
    const b = h('button', { class: 'dk-task dk-pin', type: 'button', 'aria-label': app.label }, app.ico()) as HTMLButtonElement;
    b.addEventListener('click', () => {
      const mine = live.filter((w) => w.kind === app.kind);
      if (!mine.length) {
        // Only pinned apps can be launched from the bar. An unpinned button is
        // hidden when nothing is running, so this branch is unreachable for the
        // player — and it must not invent a clip if that ever changes.
        if (app.pinned) openWindow(app.kind);
        return;
      }
      if (mine.length > 1) return;   // the peek list is the picker
      const w = mine[0]!;
      if (w.min) { focus(w); return; }
      if (focused === w) { minimise(w); return; }
      focus(w);
    });
    buttons.set(app.kind, b);
    peek(b, app.kind);
    return b;
  };

  const clock = new Date();
  const hh = String(clock.getHours()).padStart(2, '0');
  const mm = String(clock.getMinutes()).padStart(2, '0');
  const dd = `${String(clock.getDate()).padStart(2, '0')}/${String(clock.getMonth() + 1).padStart(2, '0')}/${clock.getFullYear()}`;

  const page = h('div', { class: 'pg pg-desk' },
    wallpaper(),
    surface,
    h('div', { class: 'dk-taskbar' },
      h('div', { class: 'dk-task-wrap' },
        start,
        // Every app gets a button; paint() hides the unpinned ones until they run,
        // which keeps their position on the bar stable across open and close.
        ...APPS.map(taskBtn)),
      h('div', { class: 'dk-tray' },
        h('span', { class: 'dk-weather' }, '11°C  Klart'),
        h('span', { class: 'dk-clock' }, h('b', {}, hh + ':' + mm), h('i', {}, dd)))));

  page.addEventListener('pointerdown', (e) => {
    if (menu && !(e.target as HTMLElement).closest('.dk-start-menu, .dk-start')) { menu.remove(); menu = null; }
  });

  openWindow('explorer');
  paint();
  return page;
}
