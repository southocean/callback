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
import { loadSound, saveSound } from '../prefs.js';
import { ripple } from './gm3.js';
import { trapFocus } from '../a11y.js';
import { profile, pitch, roles, caseStudies, requirementMap, offstage, skills, segments } from '../data/cv.js';
import { eggs } from '../data/eggs.js';
import { games } from '../data/games.js';
import { currentPitch } from '../data/companies.js';
import { specBody } from './devportal.js';
import { signal } from './signal.js';

export type ShareKind = 'tab' | 'window' | 'screen';

export interface Source {
  id: string;
  kind: ShareKind;
  title: string;
  /** The address line, for tabs. Windows and screens have none. */
  host?: string;
}

const TABS: Source[] = [
  { id: 'cv', kind: 'tab', title: 'Nam Nguyen. Senior SWE, Web Development', host: 'southocean.github.io' },
  { id: 'jobad', kind: 'tab', title: 'Google Careers, the posting, line by line', host: 'careers.google.com' },
  { id: 'work', kind: 'tab', title: 'Things I built', host: 'southocean.github.io' },
  /*
   * N36. Nam: "We actually have a how this was built page that we show in home
   * screen. We need to show that here in the mock browser." It was reachable —
   * Explorer opens it — but only if you went looking, and the tour needs a tab
   * it can flip to. Same document as the home screen's, from buildDoc(), so the
   * two cannot disagree.
   */
  { id: 'built', kind: 'tab', title: 'How this was built', host: 'southocean.github.io' },
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
  /*
   * THE REAL CV, framed — not the authored drawing of it.
   *
   * Nam, on what the browser should open with: "which CV to use: the same as we
   * have in view document in home screen." That is './#plain', the actual
   * document, which is what the home screen's Open document overlay frames.
   *
   * This slot used to be pageCv(), an authored approximation, and the two had
   * already started to drift: the drawing still said "Mahjong Logic" and had the
   * old socials line. frameOf keeps the drawing as the fallback for the case where
   * framing is refused, which is exactly the right division of labour — one of
   * them is the document and the other is a picture of it.
   *
   * location.search comes along so the framed copy resolves the same company code
   * as the page around it; without it the CV inside the share showed the neutral
   * header while the call showed the named one.
   */
  cv: {
    title: 'Nam Nguyen. Senior SWE, Web Development',
    host: 'southocean.github.io',
    page: () => frameOf(`${location.search}#plain`, 'Nam Nguyen, the CV as a document', pageCv),
  },
  jobad: { title: 'Google Careers, the posting, line by line', host: 'careers.google.com', page: () => pageJobAd() },
  /* N3: one list, and it is not "four" any more. */
  work: { title: 'Things I built', host: 'southocean.github.io', page: () => pageWork() },
  tools: { title: 'Internal tooling, a bot controller', host: 'southocean.github.io', page: () => pageTools() },
  hobby: { title: 'Off the clock', host: 'southocean.github.io', page: () => pageHobby() },
};
/*
 * N50. Was `buildDoc()` — one section of the spec's Overview, rendered alone, so
 * the shared screen presented a near-copy of a panel that has five tabs. It is
 * the panel itself now, chromeless, in a page. See specBody() in devportal.ts.
 *
 * The tab keeps its title and its file name in Explorer: "how-this-is-built.html"
 * is what a person would have called the file, and the spec is the answer to that
 * question rather than a different subject.
 */
DOCS['built'] = {
  title: 'How this was built',
  host: 'southocean.github.io',
  page: () => {
    const { tabs, body } = specBody();
    /*
     * `dp-light` IS LOAD-BEARING, not decoration. Every colour in the panel comes
     * from a --dp-* custom property, and those are declared on .dp-light and
     * .dp-dark rather than on :root -- which is how one component wears two
     * palettes. The dialog gets the class on its own root; this host had none, so
     * every one of them resolved to nothing and the page rendered as unstyled
     * text with no surfaces, no rules and no accent. Nam: "the layout for the
     * project spec when open in the mock chrome is completely broken!?!"
     *
     * Light rather than dark because the emulated browser is showing a white
     * document, the same as every other page in that strip.
     */
    return h('div', { class: 'pg pg-spec dp-light' }, tabs, body);
  },
};
/* 'side' is an alias for 'work' now: the two pages were answering one question
   and have been merged (see pageWork). The id survives so side-projects.html in
   Explorer still opens something, rather than becoming a file that does nothing. */
DOCS['side'] = DOCS['work']!;
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
      h('p', {}, 'Sites without that policy do load here, example.com frames in about 13ms. Most large ' +
        'sites set it, so most large sites will land on this page.'),
      h('p', { class: 'pg-note' }, 'Open it in a real tab to see it.')));
  }, 3500);
  return wrap;
}

/*
 * N2. Nam: "if user share screen window, dont offer the explorer view cause
 * nothing is viewable there. Instead offer the chrome window, where we could
 * show all the tabs there instead of showing each tab in the chrome tab."
 *
 * He is right about both halves. Window mode is one window on nothing, and a
 * file list is the one surface in the mock OS with no content of its own — you
 * share it and your audience watches you look at filenames. The browser carries
 * the actual documents, and its strip already holds all of them.
 */
const WINDOWS: Source[] = [
  { id: 'browser', kind: 'window', title: 'Google Chrome. Nam Nguyen' },
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
      // The tour presses these itself (N29). Named by what they select rather
      // than by their label, which is prose and may be reworded.
      'data-kind': g.key,
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
        'data-src': src.id,
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
  boot?: { egg?: string; cv?: boolean },
): HTMLElement {
  const body = contentFor(src, onOpen, onClose, boot);
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
    /*
     * EAGER. The same bug pageExternal already had: a lazy iframe inside a window
     * that is mid-animation counts as not-yet-visible, so it never starts loading,
     * so is-live never fires, so the 3.5s timeout removes it and the authored
     * fallback stays forever. QA caught the CV tab rendering the drawing instead
     * of the document -- which is the one thing frameOf exists to avoid.
     */
    loading: 'eager', referrerpolicy: 'no-referrer',
  }) as HTMLIFrameElement;
  const wrap = h('div', { class: 'pg pg-live' }, behind, f);
  f.addEventListener('load', () => { behind.remove(); wrap.classList.add('is-live'); });
  window.setTimeout(() => { if (!wrap.classList.contains('is-live')) f.remove(); }, 4000);
  return wrap;
}
function contentFor(src: Source, onOpen: (id: string) => void, onClose: () => void, boot?: { egg?: string; cv?: boolean }): HTMLElement {
  switch (src.id) {
    // The real thing, framed. #plain is a standalone document view — it has no
    // call chrome, so framing it cannot nest the app inside itself.
    case 'cv': return frameOf(`${location.search}#plain`, 'Nam Nguyen, the CV as a document', pageCv);
    // 'work' used to frame '#tools/tests' and Nam caught what that does: 'tools'
    // is a PANEL, so the hash resolves to { screen: 'call', panel: 'tools' } and
    // the iframe loaded the entire Meet clone — a call inside the call inside
    // the share. Authored now. There is also a hard guard in main.ts so no
    // iframe can ever render the call again, whatever hash it is handed.
    case 'work': return pageWork();
    // Authored, because the original refuses to be framed.
    case 'jobad': return pageJobAd();
    // 'browser', not 'files': Window mode offers the browser now (see WINDOWS).
    // The id and the case have to move together -- renaming only the id sent this
    // straight past to the default branch, which is the desktop, so the Window
    // share silently rendered the Entire Screen share instead.
    case 'browser': return pageWindow(onOpen, onClose);
    // onClose is "the share ends" — Window mode already uses it for the single
    // window's close button. Start > Shut down means the same thing here.
    default: return pageDesktop(onClose, boot);
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
    h('p', { class: 'pg-sub' }, 'Wasabi Productions · a bot controller for testing live tables'),
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
    /* Was "Five of them, and two are the reason this page exists" over
       offstage.intro. Both were teases that never paid off, and one of the two
       they meant was the effects pipeline, which no longer ships. */
    h('p', { class: 'pg-sub' }, 'What he does when nobody is paying him'),
    h('div', { class: 'pg-roles' },
      // Same sentence as the document builds, from the same segments — the last
      // time these two views assembled one piece of content separately they
      // drifted, and this one carries the press links.
      ...offstage.items.map((it) => h('div', { class: 'pg-role' },
        h('b', {}, it.what),
        h('span', {},
          ...segments(it.why, it.links).map((s) => (s.href
            ? h('a', { href: s.href, target: '_blank', rel: 'noopener' }, s.text)
            : h('span', {}, s.text))))))),
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

/**
 * N39. BUG: this page rendered a heading, an apology and nothing else.
 *
 * The requirement map was gated on a company code, exactly as the CV's own
 * section is, and the deployed link carries none. So a tab captioned "Google
 * Careers — the posting, line by line" opened onto a sentence explaining why
 * there were no lines. Nam: "this page is empty? It was fine before."
 *
 * T7 put that gate there for a real reason and the reason still holds for the
 * CV: measuring a reader at company X against company Y's posting is a category
 * error, and the CV is a document they might print and pass on. It does NOT hold
 * here. This tab is Google-branded in its title, its host and its favicon
 * whether or not a code is present — the mapping was the only thing hidden, so
 * hiding it concealed the answer and left the question on screen.
 *
 * The fix is to name the posting rather than to hide the answer. With a code the
 * sub-line is that company's role; without one it says plainly which posting
 * this was written against, which is the honest version of the same sentence.
 */
function pageJobAd(): HTMLElement {
  const pitch = currentPitch();
  return h('div', { class: 'pg' },
    h('h1', { class: 'pg-h' }, 'The posting, line by line'),
    h('p', { class: 'pg-sub' }, pitch.named
      ? pitch.target
      : 'Senior Software Engineer, Web Development, the posting this CV was written against'),
    h('ul', { class: 'pg-reqs' },
      ...requirementMap.map((r) => h('li', { class: `pg-req is-${r.strength}` },
        // A tilde rather than an en dash for the admitted-gap marker. It is a
        // glyph rather than prose, so the site-wide dash rule is arguably not
        // about it -- but a tilde reads as "partly" next to a tick, where a dash
        // reads as "no", and the honest rows are not nos.
        h('span', { class: 'pg-tick', 'aria-hidden': 'true' }, r.strength === 'honest' ? '~' : '✓'),
        h('span', {}, h('b', {}, r.req), h('span', {}, r.evidence))))),
    pitch.named ? h('span', {}) : h('p', { class: 'pg-note' },
      'Every line above is measured against that one posting. If you are reading this from somewhere else, '
      + 'the requirements will not be yours, but the evidence beside them still is.'),
  );
}

/**
 * ONE LIST. Nam: "Four things I built: what did I tell you? Change this to
 * Things I built, then merge the other things I built to the same list."
 *
 * Two pages were answering the same question — this one held the case studies,
 * and "Side projects and dev tools" held the tools and the games. A reader
 * finding one had no reason to think the other existed, and the heading counted
 * to four while the answer was closer to twelve.
 *
 * Three groups now, in the order a reader cares about: the work, the tools that
 * made the work possible, and the games. Every external row opens in this
 * browser; the games each carry their own link rather than deferring to a
 * profile page.
 */
function pageWork(): HTMLElement {
  const ext = (label: string, url: string, note: string): HTMLElement => {
    const b = h('button', { class: 'pg-link', type: 'button' }, label) as HTMLButtonElement;
    b.dataset.ext = url;
    return h('div', { class: 'pg-role' }, b, h('span', {}, note), h('span', { class: 'pg-url' }, url));
  };

  return h('div', { class: 'pg' },
    h('h1', { class: 'pg-h' }, 'Things I built'),
    h('p', { class: 'pg-sub' }, 'The product, the tooling around it, and a back catalogue of small games'),

    h('h2', { class: 'pg-h2' }, 'The work'),
    h('div', { class: 'pg-cards' },
      ...caseStudies.map((c) => h('div', { class: 'pg-card' },
        h('b', {}, c.title),
        h('span', {}, c.problem)))),

    h('h2', { class: 'pg-h2' }, 'Tooling'),
    /*
     * THE BOT CONTROLLER IS GONE, and it was the strongest claim here.
     *
     * Nam: "We can remove the bot controller too cause now I realize without
     * whitelisting your ip, you wont be able to sit the bots on tables." Which
     * makes it a link that cannot work for any reader, and a link that cannot
     * work is worse than no link: it spends the credibility the rest of the page
     * is building. The test-automation line stays on the CV, where it is a claim
     * about work done rather than an invitation to go and watch it.
     */
    h('div', { class: 'pg-roles' },
      ext('Mahjong Stars, the live client', 'https://preview.mahjongstars.com/',
        'The production client itself, seven years and three platform generations of it. Public preview.')),

    h('h2', { class: 'pg-h2' }, 'Games'),
    h('div', { class: 'pg-games' },
      ...games.map((g) => h('div', { class: 'pg-game' },
        (() => {
          const b = h('button', { class: 'pg-link', type: 'button' }, g.title) as HTMLButtonElement;
          b.dataset.ext = g.url;
          return b;
        })(),
        h('span', { class: 'pg-game-tag' }, g.tagline),
        h('span', {}, g.why),
        g.playable ? h('span', { class: 'pg-game-play' }, 'Plays in the browser') : h('span', {})))),
    h('p', { class: 'pg-note' },
      'Seven more on the profile: ',
      (() => {
        const b = h('button', { class: 'pg-link', type: 'button' }, 'itch.io/southocean') as HTMLButtonElement;
        b.dataset.ext = 'https://southocean.itch.io';
        return b;
      })(),
      '. Every link on this page opens in your own browser rather than in this one.'),
  );
}

/*
 * THE REAL CLIENT USED TO BE A TAB HERE, and pageRiichi() rendered it framed.
 * Board ticket N82 took it out: the preview would not load reliably inside a
 * frame, and an unreliable embed of the product is a worse advert for seven
 * years of work than a link that opens. The Explorer row survives and opens the
 * public preview in the visitor's own browser, which is where it works.
 */

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
/* The system tray's three glyphs. The audit found the tray holding text and
   nothing else — 0 icons, 0 buttons — which made it the emptiest-looking part of
   the whole bar. Drawn on one 16px box so they sit as a set. */
const icWifi = (): HTMLElement => svg('0 0 16 16', `
  <path d="M8 12.6a1.15 1.15 0 1 0 0-2.3 1.15 1.15 0 0 0 0 2.3z" fill="currentColor"/>
  <path d="M4.9 9.4a4.4 4.4 0 0 1 6.2 0l-1.1 1.1a2.85 2.85 0 0 0-4 0z" fill="currentColor" opacity=".95"/>
  <path d="M2.6 7.1a7.65 7.65 0 0 1 10.8 0l-1.1 1.1a6.1 6.1 0 0 0-8.6 0z" fill="currentColor" opacity=".8"/>`);

const icVol = (): HTMLElement => svg('0 0 16 16', `
  <path d="M3 6.2h2.1L8 3.5v9L5.1 9.8H3z" fill="currentColor"/>
  <path d="M10 6.1a2.7 2.7 0 0 1 0 3.8" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <path d="M11.7 4.4a5.1 5.1 0 0 1 0 7.2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".75"/>`);

const icBattery = (): HTMLElement => svg('0 0 16 16', `
  <rect x="1.2" y="5" width="11.4" height="6" rx="1.4" stroke="currentColor" stroke-width="1.1" fill="none" opacity=".85"/>
  <rect x="2.6" y="6.4" width="7.2" height="3.2" rx=".6" fill="currentColor"/>
  <path d="M14 7.1v1.8a1.1 1.1 0 0 0 0-1.8z" fill="currentColor" opacity=".85"/>`);

const icBt = (): HTMLElement => svg('0 0 16 16', `
  <path d="M6 4.2 11 11.4 8 13.6V2.4l3 2.2L6 11.8" stroke="currentColor" stroke-width="1.25" fill="none" stroke-linejoin="round"/>`);

const icMoon = (): HTMLElement => svg('0 0 16 16', `
  <path d="M9.4 2.4a5.6 5.6 0 1 0 4.2 8.9A6.1 6.1 0 0 1 9.4 2.4z" fill="currentColor"/>`);

const icLeaf = (): HTMLElement => svg('0 0 16 16', `
  <path d="M12.8 3.2c.7 5.4-2 8.4-6.4 8.4-1 0-1.9-.2-2.6-.6 1.5-4.9 4.6-7.3 9-7.8z" fill="currentColor"/>
  <path d="M3 13.2c1.3-2.6 3.4-4.6 6.2-5.9" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".6"/>`);

/* Task View: Windows draws it as one large pane with a smaller one behind. */
const icTask = (): HTMLElement => svg('0 0 20 20', `
  <rect x="2.5" y="5.5" width="10" height="9" rx="1.6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M14.6 7.2h1.3a1.6 1.6 0 0 1 1.6 1.6v2.4a1.6 1.6 0 0 1-1.6 1.6h-1.3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>`);

const icPower = (): HTMLElement => svg('0 0 20 20', `
  <path d="M10 3.2v5.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>
  <path d="M6.1 5.4a5.2 5.2 0 1 0 7.8 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>`);

const icSearch = (): HTMLElement => svg('0 0 20 20', `
  <circle cx="8.6" cy="8.6" r="4.9" stroke="currentColor" stroke-width="1.6" fill="none"/>
  <path d="M12.4 12.4 16.6 16.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>`);

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
/* The mahjong favicon went with the tab it labelled. See N82. */
const FAVICONS: Record<string, () => HTMLElement> = {
  cv: icFavCv, jobad: icFavGoogle, work: icFavWork,
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
  /** Speak to the desktop's live region — see pageDesktop. */
  say?: (msg: string) => void;
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
  /**
   * A window announces itself now.
   *
   * The audit found role=NONE and label=NONE on every window shell, which means a
   * screen reader user could not tell a window existed, what it was, or which of
   * two they were in. role="dialog" plus a name from the title fixes that — and
   * aria-labelledby rather than aria-label so a retitled window (Chrome does it
   * per tab, the player per clip) renames itself without a second update path.
   *
   * NOT aria-modal: these windows do not trap, and claiming they do would hide
   * the taskbar and the rest of the desktop from AT for no reason.
   */
  const titleId = 'wx-t-' + Math.random().toString(36).slice(2, 8);
  const el = h('div', {
    class: 'wx' + (o.full ? '' : ' wx-solo'),
    role: 'dialog', 'aria-labelledby': titleId, tabindex: '-1',
  }) as HTMLElement;

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

  /**
   * SNAP.
   *
   * The audit's measurement was blunt: dragging a window to x=2 left it 720px
   * wide sitting against the edge. Nothing snapped, and nothing previewed. Snap
   * is the most recognisable thing Windows 11 does with a window — it is in the
   * ads — so a mock OS without it is a mock of Windows 7 with rounded corners.
   *
   * Two halves of the feature, both here:
   *   · drag to an edge and a translucent ghost shows where the window will land
   *   · hover Maximise and the snap-layouts flyout offers the zones directly
   *
   * Everything is expressed as fractions of the host so it survives the share
   * area being any size, which it is — the desktop is whatever the call stage
   * leaves it.
   */
  type Zone = { l: number; t: number; w: number; h: number; name: string };
  const Z_LEFT: Zone = { l: 0, t: 0, w: .5, h: 1, name: 'left half' };
  const Z_RIGHT: Zone = { l: .5, t: 0, w: .5, h: 1, name: 'right half' };
  const Z_FULL: Zone = { l: 0, t: 0, w: 1, h: 1, name: 'full screen' };

  const snapTo = (z: Zone): void => {
    const host = el.parentElement?.getBoundingClientRect();
    if (!host) return;
    // A maximised window has no inline box; snapping gives it one, so the class
    // has to come off or .is-max's width:100% would fight the inline width. That
    // is the same collision toggleMax was written to avoid.
    if (maxed) { maxed = false; el.classList.remove('is-max'); saved = null; }
    el.style.left = `${Math.round(host.width * z.l)}px`;
    el.style.top = `${Math.round(host.height * z.t)}px`;
    el.style.width = `${Math.round(host.width * z.w)}px`;
    el.style.height = `${Math.round(host.height * z.h)}px`;
    o.say?.(`${o.title} snapped ${z.name}`);
    signal('desk:snap');
  };

  /* The drag preview. One element per window, made on first use and left in the
     surface after — it is a 4-property style change to move it, against a DOM
     insertion on every pointermove otherwise. */
  let ghost: HTMLElement | null = null;
  const showGhost = (z: Zone | null): void => {
    const host = el.parentElement;
    if (!host) return;
    if (!z) { ghost?.remove(); ghost = null; return; }
    if (!ghost) { ghost = h('div', { class: 'wx-ghost' }) as HTMLElement; host.appendChild(ghost); }
    const r = host.getBoundingClientRect();
    ghost.style.left = `${Math.round(r.width * z.l)}px`;
    ghost.style.top = `${Math.round(r.height * z.t)}px`;
    ghost.style.width = `${Math.round(r.width * z.w)}px`;
    ghost.style.height = `${Math.round(r.height * z.h)}px`;
  };

  /* --- the snap-layouts flyout ------------------------------------------- */
  /* Three layouts, which is what a screen this shape gets in the real thing:
     halves, a 60/40 split for a document beside a reference, and quadrants. Each
     zone is its own button, so it is reachable and named rather than being a
     region of a picture. */
  const LAYOUTS: Zone[][] = [
    [Z_LEFT, Z_RIGHT],
    [{ l: 0, t: 0, w: .6, h: 1, name: 'left, wide' }, { l: .6, t: 0, w: .4, h: 1, name: 'right, narrow' }],
    [
      { l: 0, t: 0, w: .5, h: .5, name: 'top left' }, { l: .5, t: 0, w: .5, h: .5, name: 'top right' },
      { l: 0, t: .5, w: .5, h: .5, name: 'bottom left' }, { l: .5, t: .5, w: .5, h: .5, name: 'bottom right' },
    ],
  ];

  let snapPop: HTMLElement | null = null;
  let snapTimer = 0;
  const shutSnap = (): void => {
    window.clearTimeout(snapTimer);
    snapPop?.remove();
    snapPop = null;
    maxBtn?.setAttribute('aria-expanded', 'false');
  };

  /**
   * @param kbd  true when a key opened it, which is when focus should move in.
   *
   * QA caught the first version putting EIGHT extra stops into the window's tab
   * order: the flyout opened on focus, and because it is appended to the window
   * it landed after the file list — so tabbing off Maximise eventually walked
   * into eight zone buttons sitting a long way from the control that summoned
   * them, with the flyout left hanging open behind you.
   *
   * It is a menu button, so it behaves like one. Hover still opens it for the
   * pointer; the keyboard opens it with ArrowDown, gets one stop inside, moves
   * between zones with the arrows, and Escape closes it and hands focus back.
   */
  const openSnap = (kbd = false): void => {
    if (snapPop || maxed) return;
    const zoneEls: HTMLElement[] = [];
    snapPop = h('div', { class: 'wx-snap', role: 'menu', 'aria-label': 'Snap layouts' },
      ...LAYOUTS.map((zones) => h('div', { class: 'wx-snap-l' },
        ...zones.map((z) => {
          const b = h('button', {
            class: 'wx-snap-z', type: 'button', role: 'menuitem', tabindex: '-1',
            'aria-label': `Snap ${z.name}`,
            style: `left:${z.l * 100}%;top:${z.t * 100}%;width:${z.w * 100}%;height:${z.h * 100}%`,
          }) as HTMLElement;
          b.addEventListener('click', () => { shutSnap(); snapTo(z); });
          zoneEls.push(b);
          return b;
        })))) as HTMLElement;

    snapPop.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent;
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        shutSnap();
        maxBtn?.focus();
        return;
      }
      const at = zoneEls.indexOf(document.activeElement as HTMLElement);
      const d = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1
        : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
      if (!d || at < 0) return;
      ev.preventDefault();
      const next = zoneEls[(at + d + zoneEls.length) % zoneEls.length]!;
      for (const z of zoneEls) z.setAttribute('tabindex', '-1');
      next.setAttribute('tabindex', '0');
      next.focus();
    });

    maxBtn?.setAttribute('aria-expanded', 'true');
    el.appendChild(snapPop);
    if (kbd) {
      zoneEls[0]?.setAttribute('tabindex', '0');
      zoneEls[0]?.focus();
    }
  };

  /* Hover intent, not hover: the flyout is a second meaning for a button whose
     first meaning is one click away, so it must not appear on the way past.
     Windows waits about half a second and so does this. Focus opens it at once,
     because a keyboard user arriving on the button has already committed. */
  const maxBtn = cap('wx-max', 'Maximize', 'max', toggleMax);
  if (o.full) {
    maxBtn.setAttribute('aria-haspopup', 'true');
    maxBtn.setAttribute('aria-expanded', 'false');
    maxBtn.addEventListener('pointerenter', () => {
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => openSnap(false), 480);
    });
    maxBtn.addEventListener('pointerleave', () => {
      window.clearTimeout(snapTimer);
      // A moment's grace so the pointer can cross the gap into the flyout.
      snapTimer = window.setTimeout(() => {
        if (!snapPop?.matches(':hover')) shutSnap();
      }, 160);
    });
    // ArrowDown, not focus. aria-haspopup already promises this exact gesture,
    // and it is the one that does not ambush someone who is only tabbing past.
    maxBtn.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent;
      if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
      ev.preventDefault();
      if (snapPop) { (snapPop.querySelector('.wx-snap-z') as HTMLElement | null)?.focus(); return; }
      openSnap(true);
    });
    maxBtn.addEventListener('blur', () => {
      // Leaving the button by keyboard closes it, unless focus went inside.
      window.setTimeout(() => {
        if (snapPop && !snapPop.contains(document.activeElement) && !snapPop.matches(':hover')) shutSnap();
      }, 0);
    });
    maxBtn.addEventListener('click', shutSnap);
  }

  const bar = h('div', { class: 'wx-bar' },
    h('span', { class: 'wx-bar-ico' }, o.icon()),
    h('span', { class: 'wx-title', id: titleId }, o.title),
    h('div', { class: 'wx-btns' },
      o.full && o.onMinimise ? cap('wx-min', 'Minimize', 'min', o.onMinimise) : null,
      // Maximize is offered in BOTH modes now. Nam asked for "the rest", and
      // maximising a lone shared window is harmless and useful. Minimize still
      // is not: with no taskbar in Window mode there would be nowhere to restore
      // it from, so that one stays out.
      maxBtn,
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
      signal('desk:drag');
      bar.setPointerCapture(e.pointerId);
      // Which edge the POINTER is in, not the window: a window dragged by its
      // right-hand end can have its left edge nowhere near the screen edge while
      // the cursor is hard against it, and it is the cursor you are aiming with.
      const EDGE = 18;
      let pending: Zone | null = null;
      const move = (ev: PointerEvent): void => {
        const x = Math.max(0, Math.min(ev.clientX - host.left - dx, host.width - r.width));
        const y = Math.max(0, Math.min(ev.clientY - host.top - dy, host.height - r.height));
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        pending = ev.clientX - host.left <= EDGE ? Z_LEFT
          : host.right - ev.clientX <= EDGE ? Z_RIGHT
            : ev.clientY - host.top <= EDGE ? Z_FULL
              : null;
        showGhost(pending);
      };
      const up = (): void => {
        el.classList.remove('is-drag');
        showGhost(null);
        if (pending) snapTo(pending);
        pending = null;
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

  /*
   * Escape closes the window, and focus moves into it when it opens.
   *
   * The audit measured "focus did NOT move" on open, so launching Explorer from
   * the taskbar left you stranded on the taskbar with nothing announced. Focus
   * goes to the shell rather than the first control: the shell is labelled, so a
   * screen reader reads the window's name on arrival, and Tab then walks the
   * contents in order instead of starting halfway down them.
   */
  /**
   * Alt+Space, then arrows: move the window. Alt+Space twice: resize it.
   *
   * This is the audit's worst finding by count. Measured 0 of 16 resize handles
   * and 0 of 2 title bars reachable by keyboard — so moving or resizing a window
   * was impossible without a pointer. Eighteen controls that simply did not exist
   * for anyone using a keyboard.
   *
   * Windows solves it with Alt+Space opening the system menu, then Move or Size,
   * then arrows. This is that gesture with the menu skipped: the first Alt+Space
   * enters move, a second switches to resize, Escape or Enter commits. Arrows
   * step 16px, Shift+arrows 1px for the same reason design tools do it — coarse
   * for getting there, fine for landing.
   *
   * The mode is announced, because a keyboard mode you cannot see is a trap: the
   * arrows suddenly mean something different and nothing said so.
   */
  let kbd: 'move' | 'size' | null = null;
  const STEP = 16;

  const announce = (msg: string): void => { o.say?.(msg); };

  const setMode = (m: 'move' | 'size' | null): void => {
    kbd = m;
    el.classList.toggle('is-kbd-move', m === 'move');
    el.classList.toggle('is-kbd-size', m === 'size');
    if (m === 'move') announce(o.title + ': move mode. Arrow keys move the window, Escape to finish.');
    else if (m === 'size') announce(o.title + ': resize mode. Arrow keys resize the window, Escape to finish.');
    else announce(o.title + ': done.');
  };

  el.addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;

    if (ev.altKey && ev.key === ' ') {
      ev.preventDefault();
      if (maxed) return;            // nothing to move or resize
      setMode(kbd === 'move' ? 'size' : kbd === 'size' ? null : 'move');
      return;
    }

    if (kbd) {
      if (ev.key === 'Escape' || ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); setMode(null); return; }
      const d = ev.key === 'ArrowLeft' ? [-1, 0] : ev.key === 'ArrowRight' ? [1, 0]
        : ev.key === 'ArrowUp' ? [0, -1] : ev.key === 'ArrowDown' ? [0, 1] : null;
      if (!d) return;
      ev.preventDefault();
      ev.stopPropagation();
      const step = ev.shiftKey ? 1 : STEP;
      const host = el.parentElement?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (!host) return;
      if (kbd === 'move') {
        const x = Math.max(0, Math.min((r.left - host.left) + d[0]! * step, host.width - r.width));
        const y = Math.max(0, Math.min((r.top - host.top) + d[1]! * step, host.height - r.height));
        el.style.left = `${Math.round(x)}px`;
        el.style.top = `${Math.round(y)}px`;
      } else {
        // Resize from the bottom-right, which is the corner the pointer grip uses,
        // so the two gestures agree about what "bigger" means.
        const w = Math.max(320, Math.min(r.width + d[0]! * step, host.width - (r.left - host.left)));
        const hgt = Math.max(200, Math.min(r.height + d[1]! * step, host.height - (r.top - host.top)));
        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(hgt)}px`;
      }
      return;
    }

    if (ev.key !== 'Escape') return;
    e.stopPropagation();
    o.onClose();
  });

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
      signal('desk:resize');
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
function explorerBody(onOpen: (id: string) => void, onFolder?: (f: string) => void): { body: HTMLElement; status: HTMLElement; go: (f: string) => void } {
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
  const MAHJONG: Entry = { name: 'mahjong-stars.html', kind: 'html', tab: 'ext:https://preview.mahjongstars.com/' };
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

  /*
   * listbox, not list. The audit found role="list" with role="listitem" children
   * and zero aria-selected anywhere, while selection was real and styled with
   * .is-sel — so a screen reader user could hear the file names but never which
   * one was picked. A list cannot express selection; a listbox can.
   */
  const list = h('div', { class: 'wx-list', role: 'listbox', 'aria-label': 'Files' }) as HTMLElement;
  const crumb = h('div', { class: 'wx-crumb' }) as HTMLElement;
  const treeWrap = h('div', { class: 'wx-tree', role: 'listbox', 'aria-label': 'Folders' }) as HTMLElement;
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
    // tabindex -1, not 0. Every row used to be its own tab stop, which QA
    // measured at twenty-two consecutive stops in Hobby before Tab reached
    // anything else. A listbox gets ONE stop and arrow keys inside it — the
    // shape already used by the calendar grid and the desktop icons, and the
    // shape Explorer's own file list has.
    const r = h('div', { class: 'wx-row', tabindex: '-1', role: 'option', 'aria-selected': 'false' },
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

  /**
   * One tab stop per pane, arrows within it.
   *
   * Rows are tabindex -1; whichever row is current holds the only 0. Hidden rows
   * are skipped, because the search filter hides rows and a cursor that lands on
   * one would look like the arrow key did nothing.
   */
  const roam = (pane: HTMLElement): void => {
    const rows = (): HTMLElement[] =>
      [...pane.querySelectorAll('.wx-row')].filter((r) => !(r as HTMLElement).hidden) as HTMLElement[];

    const setStop = (r: HTMLElement | null): void => {
      for (const x of pane.querySelectorAll('.wx-row')) x.setAttribute('tabindex', '-1');
      (r ?? rows()[0])?.setAttribute('tabindex', '0');
    };
    (pane as HTMLElement & { setStop?: (r: HTMLElement | null) => void }).setStop = setStop;

    pane.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent;
      const list = rows();
      if (!list.length) return;
      const at = list.indexOf(document.activeElement as HTMLElement);
      let next = -1;
      if (ev.key === 'ArrowDown') next = Math.min(list.length - 1, at + 1);
      else if (ev.key === 'ArrowUp') next = Math.max(0, at - 1);
      else if (ev.key === 'Home') next = 0;
      else if (ev.key === 'End') next = list.length - 1;
      if (next < 0) return;
      ev.preventDefault();
      const r = list[next]!;
      setStop(r);
      r.focus();
      // Arrowing through a list moves the selection with it, as it does in
      // Explorer — otherwise the highlight and the cursor drift apart.
      select(r);
    });
  };

  /** One selection across both panes, so highlights cannot accumulate. */
  function select(r: HTMLElement): void {
    if (selected === r) return;
    selected?.classList.remove('is-sel');
    selected?.setAttribute('aria-selected', 'false');
    selected = r;
    r.classList.add('is-sel');
    // The class was the only record of selection; now the attribute is too, so
    // what a screen reader hears matches what the highlight shows.
    r.setAttribute('aria-selected', 'true');
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

  /**
   * Back, Forward and Up — and a history to drive them.
   *
   * The audit found the breadcrumb doing all the navigating on its own, which
   * works but is not Explorer: the address row's first three controls are the
   * ones people actually use, and all three were missing. Up is not Back, either,
   * which is the distinction worth having — Back retraces where you have been,
   * Up climbs the tree whether you came that way or not.
   *
   * One list, one cursor. Going somewhere new truncates the forward half, which
   * is what every history in the world does and what makes Forward mean
   * something.
   */
  const hist: string[] = [];
  let hAt = -1;
  const PARENT: Record<string, string> = { Portfolio: 'Work', 'This CV': 'Work', Hobby: 'Work' };

  const navBtn = (mark: string, label: string, run: () => void): HTMLButtonElement => {
    const b = h('button', { class: 'wx-nav', type: 'button', 'aria-label': label },
      h('span', { 'aria-hidden': 'true' }, mark)) as HTMLButtonElement;
    b.addEventListener('click', run);
    return b;
  };

  const backBtn = navBtn('\u2190', 'Back', () => { if (hAt > 0) { hAt -= 1; render(hist[hAt]!); } });
  const fwdBtn = navBtn('\u2192', 'Forward', () => { if (hAt < hist.length - 1) { hAt += 1; render(hist[hAt]!); } });
  const upBtn = navBtn('\u2191', 'Up', () => { const up = PARENT[hist[hAt] ?? '']; if (up) go(up); });

  /* Disabled, not hidden: the row keeps its shape as you move around, and a
     greyed Forward is information — it says there is nothing ahead of you. */
  const syncNav = (folder: string): void => {
    backBtn.disabled = hAt <= 0;
    fwdBtn.disabled = hAt >= hist.length - 1;
    upBtn.disabled = !PARENT[folder];
  };

  /* The search box filters the folder you are in. It is not an index of the
     whole tree — Explorer's is, and saying so would be a promise we do not
     keep, which is why its placeholder names the folder. */
  const search = h('input', {
    class: 'wx-q', type: 'text', autocomplete: 'off', 'aria-label': 'Search this folder',
  }) as HTMLInputElement;
  const searchWrap = h('div', { class: 'wx-search' },
    h('span', { class: 'wx-q-ico', 'aria-hidden': 'true' }, '\u{1F50D}'), search) as HTMLElement;

  const applyFilter = (): void => {
    const q = search.value.trim().toLowerCase();
    let hits = 0;
    for (const row of list.querySelectorAll('.wx-row')) {
      const name = row.querySelector('.wx-name')?.textContent?.toLowerCase() ?? '';
      const on = !q || name.includes(q);
      (row as HTMLElement).hidden = !on;
      if (on) hits += 1;
    }
    empty.hidden = hits > 0 || !q;
    countNow(hits, q !== '');
    // The stop may have just been hidden by the filter; move it to a row that
    // is still there.
    (list as HTMLElement & { setStop?: (r: HTMLElement | null) => void }).setStop?.(null);
  };
  search.addEventListener('input', applyFilter);

  const empty = h('div', { class: 'wx-empty' }, 'No items match your search') as HTMLElement;
  empty.hidden = true;

  let countAll = 0;
  const countNow = (n: number, filtered: boolean): void => {
    const first = status.firstElementChild;
    if (first) first.textContent = filtered
      ? `${n} of ${countAll} item${countAll === 1 ? '' : 's'}`
      : `${countAll} item${countAll === 1 ? '' : 's'}`;
  };

  function go(folder: string): void {
    // A new destination truncates whatever was ahead of it.
    if (hist[hAt] !== folder) { hist.splice(hAt + 1); hist.push(folder); hAt = hist.length - 1; }
    // Real Explorer puts the current folder in its title bar; ours kept saying
    // "Work" wherever you were, which is most visible on the egg boot where the
    // window opens straight into Hobby.
    onFolder?.(folder);
    render(folder);
  }

  function render(folder: string): void {
    // The old selection lived in the list that is about to be replaced, so it
    // has to be released here or its highlight outlives its row.
    selected?.classList.remove('is-sel');
    selected = null;
    const items = FOLDERS[folder] ?? [];
    countAll = items.length;

    clear(list);
    for (const e of items) list.appendChild(rowFor(e, false));
    list.appendChild(empty);
    // The rows were just replaced, so the pane has no tab stop until one is put
    // back — a listbox you cannot Tab into is worse than one with too many stops.
    (list as HTMLElement & { setStop?: (r: HTMLElement | null) => void }).setStop?.(null);
    // Moving folder clears the filter: a search box still holding the last
    // folder's word would hide half of this one for no visible reason.
    search.value = '';
    empty.hidden = true;
    search.placeholder = 'Search ' + folder;
    syncNav(folder);

    // The breadcrumb navigates. Without it there is no way back out of a folder,
    // and Explorer has no Back button in this layout.
    clear(crumb);
    const seg = (label: string, to?: string): HTMLElement => {
      /* A navigable segment is a button; everything else is plain text, because
         "go to where you already are" is not an action.

         aria-current was on exactly the wrong elements: it sat on This PC and
         Documents — the two segments that are NOT where you are — while the
         actual current folder, .wx-here, carried nothing. Three elements in one
         breadcrumb claiming to be the current one is worse than none. */
      const el = (to
        ? h('button', { class: 'wx-crumb-up', type: 'button' }, label)
        : h('span', {}, label)) as HTMLElement;
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
      crumb.appendChild(h('span', { class: 'wx-here', 'aria-current': 'page' }, 'Work'));
    } else {
      crumb.append(seg('Work', 'Work'), h('span', { class: 'wx-sep' }, '›'),
        h('span', { class: 'wx-here', 'aria-current': 'page' }, folder));
    }

    for (const t of treeWrap.querySelectorAll('.wx-row')) {
      t.classList.toggle('is-open', (t as HTMLElement).dataset.folder === folder);
    }

    clear(status);
    status.append(
      h('span', {}, countAll + ' item' + (countAll === 1 ? '' : 's')),
      h('span', { class: 'wx-status-r' }, folder === 'Work' ? 'Documents › Work' : 'Documents › Work › ' + folder),
    );
  }

  for (const name of TREE) {
    const r = rowFor({ name, kind: 'folder', to: name }, true);
    r.dataset.folder = name;
    treeWrap.appendChild(r);
  }
  roam(treeWrap);
  roam(list);
  (treeWrap as HTMLElement & { setStop?: (r: HTMLElement | null) => void }).setStop?.(null);

  /*
   * Buttons, not spans. The audit measured 0 of 7 command-bar controls and 0 of 6
   * breadcrumb segments reachable by keyboard, because every one of them was a
   * <span>. They are inert either way — there is no clipboard behind the copy
   * icon — but inert and unreachable are different failures, and a control that
   * cannot be focused cannot even be discovered.
   *
   * Each gets a real accessible name too. "✂" reads as nothing useful; "Cut"
   * reads as Cut.
   */
  const cmdBtn = (label: string): HTMLElement =>
    h('button', { class: 'wx-cmd-btn', type: 'button' }, label);
  const cmdIco = (mark: string, label: string): HTMLElement =>
    h('button', { class: 'wx-cmd-ico', type: 'button', 'aria-label': label },
      h('span', { 'aria-hidden': 'true' }, mark));

  const body = h('div', { class: 'wx-body' },
    h('div', { class: 'wx-cmd' },
      cmdBtn('+ New'),
      h('span', { class: 'wx-cmd-sep' }),
      cmdIco('✂', 'Cut'), cmdIco('⧉', 'Copy'), cmdIco('\u{1F4CB}', 'Paste'), cmdIco('↻', 'Rename'),
      h('span', { class: 'wx-cmd-sep' }),
      cmdBtn('Sort'), cmdBtn('View')),
    h('div', { class: 'wx-navbar' }, backBtn, fwdBtn, upBtn, crumb, searchWrap),
    h('div', { class: 'wx-cols' },
      treeWrap,
      h('div', { class: 'wx-files' },
        h('div', { class: 'wx-head' }, h('span', {}, 'Name'), h('span', {}, 'Date modified'), h('span', {}, 'Type')),
        list)));

  go('Work');

  return { body, status, go };
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
  /*
   * role="tablist" to match the role="tab" children. The audit found the tabs
   * declaring tab with no tablist parent, which is worse than declaring nothing:
   * AT expects the pair, and an orphaned tab role reports a widget that is not
   * there.
   */
  const strip = h('div', { class: 'cb-strip', role: 'tablist', 'aria-label': 'Tabs' }) as HTMLElement;

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

  /**
   * CTRL AND THE WHEEL, which this browser had no answer for at all.
   *
   * Nam: "Is it implemented at all? Ctrl + mouse wheel on the mock chrome? Maybe
   * we should do that." It was not, and it is the one gesture people reach for
   * inside a page that will not fit, so its absence is the kind of gap that
   * makes an emulation feel like a picture of a browser.
   *
   * PER TAB, not per window. Chrome's zoom is per site, and in this browser a
   * tab IS a document (see the history note above), so per tab is the same rule
   * expressed in the units this thing actually has. It also avoids the obvious
   * annoyance: zooming out to read the spec and then finding the CV shrunk.
   *
   * Chrome's own ladder, verbatim. Rounding a continuous scale would put 83% on
   * the chip, which is a number no browser has ever shown anybody.
   */
  const STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
  const zooms = new Map<string, number>();

  /*
   * `zoom`, not a transform. A scaled page keeps its old layout and merely
   * draws it smaller, so the text stays on the same line breaks and the
   * scrollable height lies; `zoom` reflows, which is what a browser's zoom
   * does and the only version worth emulating.
   */
  const chip = h('span', { class: 'cb-zoom', 'aria-hidden': 'true' }) as HTMLElement;

  const applyZoom = (): void => {
    const z = zooms.get(active) ?? 1;
    page.style.zoom = z === 1 ? '' : String(z);
    chip.textContent = `${Math.round(z * 100)}%`;
    chip.classList.toggle('is-on', z !== 1);
  };

  const stepZoom = (dir: number): void => {
    if (!active) return;
    const now = zooms.get(active) ?? 1;
    const i = STEPS.indexOf(now);
    const next = STEPS[Math.max(0, Math.min(STEPS.length - 1, (i < 0 ? STEPS.indexOf(1) : i) + dir))];
    if (next === undefined || next === now) return;
    zooms.set(active, next);
    applyZoom();
  };

  /*
   * Passive: false, because the whole point is preventDefault -- without it the
   * host browser zooms the real page underneath and the visitor is left looking
   * at a magnified screen share. Bound on the page rather than the window so a
   * ctrl-wheel over the tab strip or the taskbar is left alone.
   */
  page.addEventListener('wheel', (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    stepZoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  const paint = (id: string): void => {
    const doc = docFor(id);
    active = id;
    // Record the visit unless a nav button is walking the list already.
    if (!replaying && visits[at] !== id) { visits.splice(at + 1); visits.push(id); at = visits.length - 1; }
    // ext: ids carry the whole address; the registry ones only have a host.
    setOmni(id.startsWith('ext:') ? id.slice(4) : doc ? doc.host + '/' : 'chrome://new-tab-page');
    for (const t of open) {
      const on = t.id === id;
      t.el.classList.toggle('is-on', on);
      t.el.setAttribute('aria-selected', String(on));
    }
    clear(page);
    applyZoom();
    if (doc) page.appendChild(doc.page());
    else page.appendChild(h('div', { class: 'pg cb-newtab' }, h('h1', { class: 'pg-h' }, 'New tab')));
    /*
     * OUTWARD LINKS LEAVE THIS BROWSER -- board ticket N83.
     *
     * They used to open in a tab here, which was the more charming answer and
     * the wrong one. Nam: "all the urls here on this Things I built site should
     * open an external browser tab too." Two reasons, and the second is the real
     * one. Half of these sites refuse to be framed, so the emulation's answer to
     * a third of its own links was an error page. And a visitor who clicks
     * through to somebody's itch.io page wants it in their own browser, with
     * their own history and their own back button, not nested two windows deep
     * inside a CV.
     *
     * noopener because these are third-party pages and window.opener is a
     * capability nothing here has any reason to hand out.
     */
    for (const b of page.querySelectorAll<HTMLElement>('[data-ext]')) {
      b.addEventListener('click', () => {
        const u = b.dataset.ext;
        if (u) window.open(u, '_blank', 'noopener,noreferrer');
      });
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
      class: 'cb-tab', role: 'tab', tabindex: '0', 'aria-selected': 'false',
      title: doc ? doc.title : 'New tab',
      // So the tour can name a tab it wants without matching on the title.
      'data-tab-id': id,
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
      h('div', { class: 'cb-omni' }, field, chip)),
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
/**
 * Window mode: one browser window, on nothing.
 *
 * It used to be File Explorer, which was the wrong choice for the reason in the
 * WINDOWS note above. The browser opens on the CV — the document a reader came
 * for — with every other page one tab away.
 *
 * onOpen is unused now: inside a single browser window a file click is a tab
 * change, which the window handles itself. The parameter stays so the two share
 * modes keep one signature.
 */
function pageWindow(_onOpen: (id: string) => void, onClose: () => void): HTMLElement {
  const made = chromeWindow({ onEmpty: onClose });
  made.select('cv');
  return h('div', { class: 'pg pg-win' },
    win11({
      title: 'Nam Nguyen. Senior SWE, Web Development',
      icon: icChrome, body: made.body, full: false, onClose,
    }));
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

  /**
   * THE PLAYER, REBUILT AGAINST THE ONE I ALREADY WROTE.
   *
   * Nam, QAing the eggs: "Clicking on the video here doesnt do anything. Should
   * have pause the video. I would like to add all the essential video controller
   * here too. Check the menvault project ... we did a lot of extensive work on
   * media player control, both UI and function, like control of hover,
   * fastforwarding and so on."
   *
   * So this is MENVAULT's floater player (`wireFloaterVideo`) ported rather than
   * re-derived: the click target IS the video, a hover overlay carries skip-back
   * / play / skip-forward, the skip buttons ring and spin so a ten-second jump
   * has a visible result, and the keyboard gets the shortcuts anyone who watches
   * video already knows.
   *
   * Two deliberate departures from MENVAULT, both because this is a WINDOW in a
   * mock OS rather than a floating picture-in-picture:
   *
   *   · the bottom bar does not auto-hide. In MENVAULT the chrome hid because the
   *     floater was a small overlay on top of a page; here the bar is part of the
   *     window, sitting above a caption that is also part of it, and a bar that
   *     vanished would read as a rendering fault rather than as polish. The
   *     centre overlay is the thing that appears on hover.
   *   · fullscreen takes the whole body, not the stage, so the controls and the
   *     caption come with it. Fullscreening the video alone hands the viewer a
   *     player with no controls, which is how you lose the ability to get out.
   */
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
  const muteBtn = h('button', { class: 'mp-btn mp-mute', type: 'button', 'aria-label': 'Mute' }, muteOn) as HTMLButtonElement;

  const vol = h('input', { class: 'mp-vol', type: 'range', min: '0', max: '100', value: '100', 'aria-label': 'Volume' }) as HTMLInputElement;

  /* Speed, straight from MENVAULT's set. A <select> rather than a menu because
     it is a five-value choice and the platform control already does that well. */
  const speed = h('select', { class: 'mp-speed', 'aria-label': 'Playback speed' },
    ...['0.5', '1', '1.25', '1.5', '2'].map((v) => h('option', {
      value: v, ...(v === '1' ? { selected: 'selected' } : {}),
    }, v + '\u00d7'))) as HTMLSelectElement;

  const fsMark = svg('0 0 24 24', '<path d="M4 9V4h5v2H6v3zm11-5h5v5h-2V6h-3zM4 15h2v3h3v2H4zm14 3v-3h2v5h-5v-2z" fill="currentColor"/>', 'mp-g');
  const fsBtn = h('button', { class: 'mp-btn', type: 'button', 'aria-label': 'Full screen' }, fsMark) as HTMLButtonElement;

  /* --- the overlay -------------------------------------------------------- */
  /**
   * ONE BUTTON, AND ONLY WHEN IT IS WANTED.
   *
   * The first version was MENVAULT's three-disc set on hover, and Nam was right
   * to cut it: "we need to pull back on the media control, cause its obstructing
   * the actual video content ... The fastforward and backward are not needed
   * since these vids are so short."
   *
   * They are 8 to 30 seconds. A ten-second skip on an eight-second clip is a
   * control whose two options are "the start" and "the end", and MENVAULT's
   * library is feature films. Ported behaviour has to survive the change of
   * subject, and this did not.
   *
   * What is left: nothing at all while it plays, a play button while it is
   * paused, and a one-second linger after you press play so the press has time
   * to be seen before the picture goes clean. Keyboard seeking stays -- it costs
   * no pixels.
   */
  const bigMark = svg('0 0 24 24', '<path d="M8 5v14l11-7z" fill="currentColor"/>', 'mp-cg');
  const bigPause = svg('0 0 24 24', '<path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/>', 'mp-cg');
  const bigBtn = h('button', {
    class: 'mp-c mp-c-big', type: 'button', 'aria-label': 'Play',
  }, bigMark) as HTMLButtonElement;

  /* Keyboard feedback. A seek by key changes a number in the corner and nothing
     else, so MENVAULT flashed a glyph in the middle; without it the key feels
     dead even though it worked. */
  const flash = h('div', { class: 'mp-flash', 'aria-hidden': 'true' }) as HTMLElement;

  /** Restartable animation: drop the class, force reflow, add it back. */
  const anim = (el: HTMLElement, cls: string): void => {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };
  const flashGlyph = (g: string): void => { flash.textContent = g; anim(flash, 'is-on'); };

  const clock = (n: number): string => {
    if (!Number.isFinite(n)) return '0:00';
    const m = Math.floor(n / 60);
    return m + ':' + String(Math.floor(n % 60)).padStart(2, '0');
  };
  const syncTime = (): void => {
    const d = video.duration;
    time.textContent = clock(video.currentTime) + ' / ' + clock(d);
    if (Number.isFinite(d) && d > 0 && !scrubbing) {
      const pct = (video.currentTime / d) * 1000;
      seek.value = String(Math.round(pct));
      // The filled part of the track, so the bar reads as progress rather than
      // as a slider that happens to have moved.
      seek.style.setProperty('--at', (pct / 10).toFixed(2) + '%');
    }
  };
  const syncPlay = (): void => {
    clear(playBtn);
    playBtn.appendChild(video.paused ? playMark : pauseMark);
    playBtn.setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
    clear(bigBtn);
    bigBtn.appendChild(video.paused ? bigMark : bigPause);
    bigBtn.setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
    stage.classList.toggle('is-paused', video.paused);
  };

  /**
   * The linger. Nam: "When the video is paused and we click play button, the
   * button lingers for about 1s, so we get all the click effect and so on, then
   * it disappears, for a clean video view."
   *
   * Without it the overlay is removed on the same frame as the press, which
   * cancels the ring mid-animation and makes the button look like it flickered
   * rather than like it was pressed. So the press keeps the overlay alive for a
   * second, and the class going away is what starts the fade.
   *
   * Pausing clears the timer: the paused state shows the overlay on its own, and
   * a stale timer would then remove a class the paused rule needs, which is the
   * kind of race that shows up once in fifty presses and never in QA.
   */
  let lingerTimer = 0;
  const linger = (): void => {
    window.clearTimeout(lingerTimer);
    stage.classList.add('is-linger');
    lingerTimer = window.setTimeout(() => stage.classList.remove('is-linger'), 1000);
  };
  const clearLinger = (): void => {
    window.clearTimeout(lingerTimer);
    stage.classList.remove('is-linger');
  };

  /**
   * The sound state, told honestly.
   *
   * This is the bug Nam reported. The old player set `video.muted = true` for
   * autoplay and then never told the controls, so the speaker icon said "sound
   * on" and the slider sat at maximum over a silent video.
   *
   * Now one function reads the video and writes the UI, and it is called after
   * every event that can change either.
   */
  const syncSound = (): void => {
    clear(muteBtn);
    muteBtn.appendChild(video.muted ? muteOff : muteOn);
    muteBtn.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute');
    // The slider keeps showing the volume while muted, because muted-at-full is
    // a real state and unmuting should land back on the same loudness. The class
    // is what says it is not currently doing anything.
    vol.value = String(Math.round(video.volume * 100));
    vol.style.setProperty('--at', (video.volume * 100).toFixed(1) + '%');
    bar.classList.toggle('is-muted', video.muted);
  };

  /* The visitor's own choice, saved. A mute the BROWSER imposed is not saved --
     see prefs.ts. */
  const rememberSound = (): void => saveSound({ muted: video.muted, volume: video.volume });

  let scrubbing = false;

  const toggle = (): void => {
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };
  const nudge = (by: number): void => {
    const d = Number.isFinite(video.duration) ? video.duration : 0;
    video.currentTime = Math.max(0, Math.min(d || video.currentTime + by, video.currentTime + by));
    syncTime();
  };

  playBtn.addEventListener('click', toggle);
  bigBtn.addEventListener('click', () => { toggle(); anim(bigBtn, 'is-ring'); });

  video.addEventListener('play', () => { syncPlay(); linger(); });
  video.addEventListener('pause', () => { syncPlay(); clearLinger(); });
  video.addEventListener('timeupdate', syncTime);
  video.addEventListener('loadedmetadata', syncTime);
  video.addEventListener('ended', syncPlay);
  // The video is the authority on its own sound: a policy-forced mute arrives as
  // a volumechange with no code of ours in the stack, and the UI has to follow.
  video.addEventListener('volumechange', syncSound);

  seek.addEventListener('pointerdown', () => { scrubbing = true; });
  seek.addEventListener('pointerup', () => { scrubbing = false; });
  seek.addEventListener('input', () => {
    const d = video.duration;
    seek.style.setProperty('--at', (Number(seek.value) / 10).toFixed(2) + '%');
    if (Number.isFinite(d) && d > 0) video.currentTime = (Number(seek.value) / 1000) * d;
  });

  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    // Unmuting at zero volume would be a control that does nothing, so it comes
    // back at a usable level -- the same guard MENVAULT's volume input has.
    if (!video.muted && video.volume === 0) video.volume = 1;
    syncSound();
    rememberSound();
  });
  vol.addEventListener('input', () => {
    video.volume = Number(vol.value) / 100;
    // Dragging the volume up is an unmute. Anything else makes the slider look
    // broken while muted.
    if (video.volume > 0) video.muted = false;
    syncSound();
    rememberSound();
  });
  speed.addEventListener('change', () => { video.playbackRate = Number(speed.value); });

  const fullscreen = (): void => {
    const d = document as Document & { webkitFullscreenElement?: Element };
    if (d.fullscreenElement || d.webkitFullscreenElement) { void document.exitFullscreen?.(); return; }
    void body.requestFullscreen?.().catch(() => { /* denied in an iframe; not an error */ });
  };
  fsBtn.addEventListener('click', fullscreen);

  /* --- the stage is the control ------------------------------------------ */
  /* Nam's actual report: clicking the picture did nothing. It is the largest
     target in the window and on every video player ever made it toggles play. */
  const stage = h('div', {
    class: 'mp-stage', role: 'button', tabindex: '0',
    'aria-label': 'Play or pause. Arrow keys seek.',
  }, video, h('div', { class: 'mp-center' }, bigBtn), flash) as HTMLElement;

  stage.addEventListener('click', (e) => {
    // A press on a disc is that disc's, not the stage's.
    if ((e.target as HTMLElement).closest('.mp-c')) return;
    // Clicking the picture also hands it the keyboard, which is what makes the
    // shortcuts below reachable without hunting for a Tab stop.
    stage.focus();
    toggle();
  });
  stage.addEventListener('dblclick', (e) => {
    if ((e.target as HTMLElement).closest('.mp-c')) return;
    fullscreen();
  });

  /**
   * Keys, on the player body so they only fire while focus is inside it.
   *
   * Skipped when the target is a slider or the speed select: ArrowLeft on the
   * seek bar already moves the seek bar, and handling it twice would jump the
   * video two different distances at once.
   */
  const keys = (e: Event): void => {
    const ev = e as KeyboardEvent;
    if ((ev.target as HTMLElement).closest('input, select')) return;
    const step = (n: number, g: string): void => { ev.preventDefault(); nudge(n); flashGlyph(g); };
    switch (ev.key) {
      case ' ':
      case 'k':
        ev.preventDefault();
        toggle();
        flashGlyph(video.paused ? '\u25b6' : '\u2016');
        return;
      case 'ArrowLeft': step(-5, '\u23ea'); return;
      case 'ArrowRight': step(5, '\u23e9'); return;
      case 'j': step(-10, '\u23ea'); return;
      case 'l': step(10, '\u23e9'); return;
      case 'ArrowUp':
        ev.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        video.muted = false;
        syncSound();
        rememberSound();
        return;
      case 'ArrowDown':
        ev.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        syncSound();
        rememberSound();
        return;
      case 'm':
        muteBtn.click();
        flashGlyph(video.muted ? '\ud83d\udd07' : '\ud83d\udd08');
        return;
      case 'f':
        fullscreen();
        return;
      default:
    }
  };

  const caption = h('div', { class: 'mp-cap' }, egg.blurb) as HTMLElement;

  const bar = h('div', { class: 'mp-bar' },
    playBtn, seek, time, muteBtn, vol, speed, fsBtn) as HTMLElement;

  const body = h('div', { class: 'wx-body mp' }, stage, bar, caption) as HTMLElement;
  body.addEventListener('keydown', keys);

  syncPlay();

  /**
   * Start playing, with sound if the visitor has ever asked for it.
   *
   * Nam: "Maybe its a browser policy to not play audio without cues - I could
   * see where the sudden sound would startle users." Both true, and the answer
   * is not to fight the policy but to stop lying about it. So: try the remembered
   * state, and if the policy refuses, mute, try again, and let syncSound show
   * what actually happened. The refused attempt is NOT saved as a preference.
   */
  const startPlayback = (): void => {
    const pref = loadSound();
    video.volume = pref.volume;
    video.muted = pref.muted;
    syncSound();
    void video.play().then(syncSound).catch(() => {
      video.muted = true;
      syncSound();
      // Second attempt, muted, which the policy always allows. If even this is
      // refused the poster stays up with a working play button -- a fine outcome
      // and not an error worth surfacing.
      void video.play().catch(() => {});
    });
  };
  startPlayback();

  return {
    body,
    select: (next: string) => {
      const found = eggs.find((e) => e.id === next.replace(/^vid:/, ''));
      if (!found) return;
      egg = found;
      video.src = egg.clip;
      video.poster = egg.poster;
      caption.textContent = egg.blurb;
      // Same path as the first clip, so a second video honours the sound choice
      // made during the first one.
      startPlayback();
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

function pageDesktop(onQuit: () => void, boot?: { egg?: string; cv?: boolean }): HTMLElement {
  const surface = h('div', { class: 'dk-surface' }) as HTMLElement;

  /**
   * One polite live region for the whole desktop.
   *
   * The audit found zero live regions anywhere in the mock OS: opening, closing,
   * minimising, focusing a window and changing folder were all completely silent.
   * A sighted user sees a window appear; a screen reader user got nothing at all.
   *
   * Polite rather than assertive, because none of this is urgent enough to cut
   * across what someone is already reading. Cleared after each message so an
   * identical event twice in a row is still announced the second time.
   */
  const live_region = h('div', { class: 'sr', role: 'status', 'aria-live': 'polite' }) as HTMLElement;
  let sayTimer = 0;
  const say = (msg: string): void => {
    window.clearTimeout(sayTimer);
    live_region.textContent = '';
    sayTimer = window.setTimeout(() => { live_region.textContent = msg; }, 40);
  };

  interface Live {
    el: HTMLElement;
    kind: AppKind;
    min: boolean;
    title: string;
    select?: (id: string) => void;
    /* Re-read the title from the app after its contents changed. Takes nothing:
       the window is the only one who knows what it is showing now. */
    setTitle?: () => void;
    /** Explorer only: navigate its file pane. */
    go?: (folder: string) => void;
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
    /*
     * Which window is active, said in CSS as well as in z-index.
     *
     * The audit found both windows reporting an identical shadow and border with
     * no focus class — z-index was the only cue, which is no cue at all if you
     * are not watching them overlap. Windows dims the inactive title bar and
     * flattens its shadow, and that single difference is most of what makes a
     * stack of windows read as real.
     */
    for (const w of live) w.el.classList.toggle('is-focus', w === focused && !w.min);
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
      b.setAttribute('aria-label', mine.length > 1 ? `${app.label}, ${mine.length} windows` : app.label);
      // "Running" and "active" were visual only — an underline and a tint. Now
      // they are states AT can read: pressed for running, current for active.
      b.setAttribute('aria-pressed', String(mine.length > 0));
      b.setAttribute('aria-current', isActive ? 'true' : 'false');
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
    say(w.title + ': minimised.');
    signal('desk:min');
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

  /*
   * Windows scale and fade on the way out, and shrink toward their taskbar button
   * on minimise. Both are 140ms — long enough to read as motion, short enough
   * that it never stands between a click and its result. The element outlives the
   * state change by that long, which is why closeWin removes on a timer.
   */
  const OUT_MS = 140;

  const closeWin = (w: Live): void => {
    // The overlay holds clones of the live windows, so a window disappearing
    // under it would leave a card that switches to nothing.
    if (taskView) shutTaskView();
    say(w.title + ': closed.');
    signal('desk:close');
    // Let the exit animation play, then drop the node. The record leaves the
    // list immediately so the taskbar updates on the click rather than 140ms
    // after it.
    w.el.classList.add('is-out');
    window.setTimeout(() => w.el.remove(), OUT_MS);
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
      if (kind === 'player') existing.setTitle?.();
      return;
    }
    openWindow(kind, id);
  };

  /* Explorer routes clips to the player and everything else to Chrome. */
  const openFile = (id: string): void => {
    if (id.startsWith('vid:')) { route('player', id); return; }
    /*
     * An outward row leaves for the real browser -- board ticket N82. Nam: "we
     * are removing the mahjong stars tab since it doesnt load very consistently.
     * Clicking that on the explorer will open a new real tab on your real
     * browser going to the site."
     *
     * A framed preview that loads about half the time is worse than no preview:
     * it puts the flakiest thing on the page directly in front of the strongest
     * claim on it, which is seven years of the product it is failing to show.
     *
     * The omnibox is deliberately NOT routed through here. Typing an address
     * into the emulated browser and having it go is the emulation's own trick
     * and it still works; what changed is that a FILE which names an outside
     * site opens where outside sites belong.
     */
    if (id.startsWith('ext:')) {
      window.open(id.slice(4), '_blank', 'noopener,noreferrer');
      return;
    }
    route('chrome', id);
  };

  /**
   * Put a window in the middle of the desktop, clamped inside it.
   *
   * offsetWidth rather than getBoundingClientRect().width: a window opens under
   * wx-in, which scales from .96, and a rect read mid-animation is 4% short.
   * offset* ignores transforms.
   */
  const centreWin = (el: HTMLElement): void => {
    const host = surface.getBoundingClientRect();
    // Nothing sensible to centre against yet -- try again next frame rather than
    // pinning the window to the top-left corner.
    if (host.width < 1 || host.height < 1) { requestAnimationFrame(() => centreWin(el)); return; }
    const w = el.offsetWidth;
    const hgt = el.offsetHeight;
    el.style.left = `${Math.max(0, Math.round((host.width - w) / 2))}px`;
    el.style.top = `${Math.max(0, Math.round((host.height - hgt) / 2))}px`;
  };

  function openWindow(kind: AppKind, tabId?: string): void {
    const app = APPS.find((a) => a.kind === kind)!;
    let bodyEl: HTMLElement;
    let statusEl: HTMLElement | null = null;
    let select: ((id: string) => void) | undefined;
    let title = kind === 'explorer' ? 'Work' : app.label;

    const rec: Live = { el: null as unknown as HTMLElement, kind, min: false, title, select };

    if (kind === 'explorer') {
      const made = explorerBody(openFile, (f) => {
        rec.title = f;
        const t = rec.el?.querySelector('.wx-title');
        if (t) t.textContent = f;
      });
      bodyEl = made.body;
      statusEl = made.status;
      rec.go = made.go;
    } else if (kind === 'chrome') {
      const made = chromeWindow({ onEmpty: () => closeWin(rec) });
      bodyEl = made.body;
      select = made.select;
      title = 'Nam Nguyen. Senior SWE, Web Development';
      if (tabId) made.select(tabId);
    } else {
      const made = playerWindow((tabId ?? '').replace(/^vid:/, ''));
      bodyEl = made.body;
      select = made.select;
      title = made.title();
      /*
       * AND INTO THE TITLE BAR, not just the record.
       *
       * This updated rec.title, which the taskbar reads, and never touched the
       * .wx-title span, which is the thing on screen. Invisible while every clip
       * rebuilt the whole share and arrived in a fresh window; the moment the
       * player started being REUSED (N56) it showed as a window captioned
       * "Falling out of a plane" playing the Robinson tape, with the right blurb
       * underneath it. Explorer already does both, a few lines up.
       */
      rec.setTitle = () => {
        rec.title = made.title();
        const t = rec.el?.querySelector('.wx-title');
        if (t) t.textContent = rec.title;
      };
    }

    rec.select = select;
    rec.title = title;

    const el = win11({
      title, icon: app.ico, body: bodyEl, status: statusEl, full: true, say,
      onClose: () => closeWin(rec),
      onMinimise: () => minimise(rec),
    });
    rec.el = el;

    // Cascade, so a second window does not land exactly on the first.
    // (centreWin overrides this for the egg boot — see the boot block.)
    const n = live.length;
    el.style.left = `${60 + n * 28}px`;
    el.style.top = `${40 + n * 26}px`;
    el.addEventListener('pointerdown', () => focus(rec), true);

    live.push(rec);
    surface.appendChild(el);
    focus(rec);
    // Focus the shell so its name is announced and Tab starts at the top.
    el.focus();
  }

  /**
   * TASK VIEW — the window switcher.
   *
   * This started life on the list as Alt+Tab, and Alt+Tab cannot be built. The
   * OS takes that chord before the browser sees it; a web page never receives
   * the keydown, and neither does Win+Tab. Writing a handler for it would have
   * produced a feature that works only in a screenshot.
   *
   * So it is behind Task View instead, which is a real button on a real Windows
   * taskbar sitting right where this one is, and which opens exactly this
   * overlay. The switcher itself is the part that was missing; the chord was
   * only ever the way in.
   *
   * The thumbnails are the windows themselves, cloned and scaled — the same
   * trick the taskbar hover previews use, and the reason a thumbnail can never
   * drift out of date with what it is a thumbnail of.
   */
  let taskView: HTMLElement | null = null;
  let tvAt = 0;

  const shutTaskView = (): void => {
    taskView?.remove();
    taskView = null;
    taskBtn2?.setAttribute('aria-expanded', 'false');
  };

  const tvMark = (): void => {
    const cards = [...(taskView?.querySelectorAll('.dk-tv-card') ?? [])] as HTMLElement[];
    cards.forEach((c, i) => {
      c.classList.toggle('is-on', i === tvAt);
      c.setAttribute('aria-selected', String(i === tvAt));
      c.setAttribute('tabindex', i === tvAt ? '0' : '-1');
    });
    cards[tvAt]?.focus();
  };

  const openTaskView = (): void => {
    if (taskView) { shutTaskView(); return; }
    if (!live.length) { say('No open windows'); return; }
    tvAt = Math.max(0, live.indexOf(focused as Live));

    const grid = h('div', { class: 'dk-tv-grid', role: 'listbox', 'aria-label': 'Open windows' }) as HTMLElement;
    live.forEach((w, i) => {
      const app = APPS.find((a) => a.kind === w.kind)!;
      const mini = w.el.cloneNode(true) as HTMLElement;
      mini.classList.remove('is-drag', 'is-min', 'is-focus');
      mini.style.left = '0';
      mini.style.top = '0';
      mini.style.zIndex = '0';
      // The clone is a picture; nothing inside it should be reachable or read.
      mini.setAttribute('aria-hidden', 'true');
      for (const f of mini.querySelectorAll('button,input,[tabindex]')) f.setAttribute('tabindex', '-1');

      const card = h('div', {
        class: 'dk-tv-card', role: 'option', tabindex: '-1',
        'aria-selected': 'false', 'aria-label': w.title,
      },
        h('div', { class: 'dk-tv-shot' }, h('div', { class: 'dk-tv-scale' }, mini)),
        h('div', { class: 'dk-tv-t' },
          h('span', { class: 'dk-peek-ico' }, app.ico()),
          h('span', { class: 'dk-tv-name' }, w.title))) as HTMLElement;
      card.addEventListener('click', () => { shutTaskView(); focus(w); });
      card.addEventListener('dblclick', () => { shutTaskView(); focus(w); });
      grid.appendChild(card);
      void i;
    });

    taskView = h('div', { class: 'dk-tv', role: 'dialog', 'aria-label': 'Task view' }, grid) as HTMLElement;
    taskView.addEventListener('pointerdown', (e) => {
      // A press on the empty backdrop closes, as it does in the OS.
      if (e.target === taskView) shutTaskView();
    });
    taskBtn2?.setAttribute('aria-expanded', 'true');
    surface.appendChild(taskView);
    tvMark();

    /* Tab and the arrows both cycle. Tab because that is the muscle memory this
       overlay inherits from the chord it stands in for, and it is safe to take
       here: the overlay is the only thing on screen while it is open. */
    grid.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent;
      const n = live.length;
      if (ev.key === 'Tab') {
        ev.preventDefault();
        tvAt = (tvAt + (ev.shiftKey ? n - 1 : 1)) % n;
        tvMark();
        return;
      }
      const d = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1
        : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
      if (d) {
        ev.preventDefault();
        tvAt = (tvAt + d + n) % n;
        tvMark();
        return;
      }
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        const w = live[tvAt];
        shutTaskView();
        if (w) focus(w);
      }
    });
  };

  const taskBtn2 = h('button', {
    class: 'dk-task dk-pin dk-tv-btn', type: 'button',
    'aria-label': 'Task view', 'aria-expanded': 'false', 'aria-haspopup': 'dialog',
  }, icTask()) as HTMLButtonElement;
  taskBtn2.addEventListener('click', openTaskView);

  // Start, and a small menu so the button is not a lie.
  const start = h('button', { class: 'dk-task dk-start', type: 'button', 'aria-label': 'Start' }, icStart()) as HTMLButtonElement;
  let menu: HTMLElement | null = null;
  /* The power menu is a popup inside a popup, so the desktop has to know about it:
     QA found it staying open when the press landed elsewhere in Start, and Escape
     closing the whole Start menu out from under it. Both need the inner one to go
     first. */
  let pwr: { menu: HTMLElement; btn: HTMLElement } | null = null;
  const shutPwr = (): void => {
    if (!pwr) return;
    pwr.menu.hidden = true;
    pwr.btn.setAttribute('aria-expanded', 'false');
    pwr = null;
  };
  start.addEventListener('click', () => {
    if (menu) { shutPwr(); menu.remove(); menu = null; return; }
    /*
     * Two things Windows puts in Start that we had left out: the search field it
     * opens with, and the power button in the corner.
     *
     * The search field actually filters — a search box that ignores what you type
     * is worse than no search box, because it advertises a behaviour and then
     * refuses it. With four apps the filtering is barely useful, which is fine:
     * the point is that the control is real.
     *
     * The power button is the one place a mock has to stop. It offers Sleep and
     * Shut down, and picking either ends the screen share, because that is the
     * closest honest translation of "this machine goes away" inside a call.
     */
    const grid = h('div', { class: 'dk-start-grid' }) as HTMLElement;
    // Same reasoning as the pin: Start is a list of things you can launch, and a
    // media player with no file to open is not one of them.
    const launchable = APPS.filter((a) => a.pinned);
    const tiles = launchable.map((a) => h('button', {
      class: 'dk-start-app', type: 'button',
      onclick: () => { openWindow(a.kind); menu?.remove(); menu = null; },
    }, h('span', {}, a.ico()), h('span', {}, a.label)) as HTMLElement);
    grid.append(...tiles);

    const empty = h('div', { class: 'dk-start-none' }, 'No results') as HTMLElement;
    empty.hidden = true;

    const field = h('input', {
      class: 'dk-start-q', type: 'text', placeholder: 'Search apps',
      'aria-label': 'Search apps', autocomplete: 'off',
    }) as HTMLInputElement;
    field.addEventListener('input', () => {
      const q = field.value.trim().toLowerCase();
      let hits = 0;
      tiles.forEach((t, i) => {
        const on = !q || launchable[i]!.label.toLowerCase().includes(q);
        t.hidden = !on;
        if (on) hits += 1;
      });
      empty.hidden = hits > 0;
    });

    const power = h('button', {
      class: 'dk-start-pwr', type: 'button', 'aria-label': 'Power', 'aria-expanded': 'false',
    }, icPower()) as HTMLButtonElement;
    const pwrMenu = h('div', { class: 'dk-pwr-menu', role: 'menu', 'aria-label': 'Power' },
      ...['Sleep', 'Shut down'].map((label) => h('button', {
        class: 'dk-pwr-item', type: 'button', role: 'menuitem',
        onclick: () => { say(label); onQuit(); },
      }, label))) as HTMLElement;
    pwrMenu.hidden = true;
    power.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = pwrMenu.hidden;
      if (!open) { shutPwr(); return; }
      pwrMenu.hidden = false;
      power.setAttribute('aria-expanded', 'true');
      pwr = { menu: pwrMenu, btn: power };
      (pwrMenu.firstElementChild as HTMLElement | null)?.focus();
    });

    menu = h('div', { class: 'dk-start-menu', role: 'dialog', 'aria-label': 'Start' },
      h('div', { class: 'dk-start-search' }, icSearch(), field),
      h('div', { class: 'dk-start-h' }, 'Pinned'),
      grid,
      empty,
      h('div', { class: 'dk-start-foot' },
        h('span', { class: 'dk-start-av' }, 'NN'),
        h('span', { class: 'dk-start-who' }, profile.name),
        h('span', { class: 'dk-pwr-wrap' }, power, pwrMenu))) as HTMLElement;
    surface.appendChild(menu);
    field.focus();
  });

  /**
   * One button per app. Click behaviour follows Windows:
   *   nothing running  -> launch
   *   one window       -> focused? minimise : focus
   *   several          -> show the list and let the pointer choose
   */
  const taskBtn = (app: { kind: AppKind; label: string; ico: () => HTMLElement; pinned: boolean }): HTMLElement => {
    const b = h('button', {
      class: 'dk-task dk-pin', type: 'button', 'aria-label': app.label,
      // The tour launches Chrome from here, the way a person would.
      'data-app': app.kind,
    }, app.ico()) as HTMLButtonElement;
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

  /**
   * The system tray: two buttons, two flyouts.
   *
   * The audit found it holding text and nothing else — zero icons, zero buttons,
   * the emptiest region on the bar. Windows puts a quick-settings flyout behind
   * the wifi/volume/battery cluster and a calendar behind the clock, and both are
   * signature surfaces, so both are here.
   *
   * Everything in them is honest about being a mock: the toggles move and are
   * remembered for the session, and nothing claims to have changed a real device.
   * A brightness slider that dimmed the screen would be a lie about what this is.
   */
  let flyout: HTMLElement | null = null;
  const shutFlyout = (): void => { flyout?.remove(); flyout = null; trayQs.setAttribute('aria-expanded', 'false'); trayClock.setAttribute('aria-expanded', 'false'); };

  const openFlyout = (owner: HTMLElement, build: () => HTMLElement): void => {
    const wasMine = owner.getAttribute('aria-expanded') === 'true';
    shutFlyout();
    if (wasMine) return;                 // second click closes, like the menus
    flyout = build();
    owner.setAttribute('aria-expanded', 'true');
    surface.appendChild(flyout);
    /* Focus the labelled shell, not the first control. Landing on "Previous
       month" announces a chevron instead of a calendar, and Tab then starts
       halfway through the flyout — the same reasoning as the window shells. */
    flyout.setAttribute('tabindex', '-1');
    flyout.focus();
  };

  const qsToggle = (label: string, ico: () => HTMLElement, on: boolean): HTMLElement => {
    const b = h('button', {
      class: 'dk-qs-tile' + (on ? ' is-on' : ''), type: 'button',
      'aria-pressed': String(on),
    }, h('span', { class: 'dk-qs-ico' }, ico()), h('span', {}, label)) as HTMLButtonElement;
    b.addEventListener('click', () => {
      const now = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(now));
      b.classList.toggle('is-on', now);
      say(label + (now ? ' on' : ' off'));
    });
    return b;
  };

  const buildQuickSettings = (): HTMLElement => h('div', {
    class: 'dk-flyout dk-qs', role: 'dialog', 'aria-label': 'Quick settings',
  },
    h('div', { class: 'dk-qs-grid' },
      qsToggle('Wi-Fi', icWifi, true),
      qsToggle('Bluetooth', icBt, false),
      qsToggle('Battery saver', icLeaf, false),
      qsToggle('Night light', icMoon, false)),
    h('div', { class: 'dk-qs-row' },
      h('span', { class: 'dk-qs-ico' }, icVol()),
      h('input', { class: 'dk-qs-slider', type: 'range', min: '0', max: '100', value: '64', 'aria-label': 'Volume' })),
    h('div', { class: 'dk-qs-foot' }, '11°C  ·  Klart  ·  Uppsala')) as HTMLElement;

  /**
   * The calendar, rebuilt from Nam's screenshot of the real one.
   *
   * The first version got the month arithmetic right and the rest wrong. What the
   * real flyout actually does, and now this does too:
   *
   *   · today is a FILLED CIRCLE. Ours was an oval, because a 30px-tall cell in a
   *     320px-wide seven-column grid is 39px wide, and border-radius:50% on a
   *     non-square box gives you an ellipse. Fixed by sizing the disc, not the cell.
   *   · hovering a day tints it. I had removed that as a false affordance —
   *     wrongly: Windows highlights because clicking a day SELECTS it, so the
   *     honest fix was to make selection real, not to drop the hover.
   *   · the selected day is a thin blue RING, distinct from today's fill, so both
   *     can show at once.
   *   · weekday heads are two letters (Mo Tu We…), not one — with one letter,
   *     Tuesday and Thursday are both "T" and Saturday and Sunday are both "S".
   *   · the grid runs six full weeks and shows the neighbouring months' days
   *     dimmed, which is why the real one never changes height between months.
   *   · the month pages, via the two chevrons on the month row.
   *
   * Six weeks always, so the flyout does not resize when you page through it.
   */
  const CAL_WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const sameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const buildCalendar = (): HTMLElement => {
    const today = new Date(stamp);
    let shown = new Date(today.getFullYear(), today.getMonth(), 1);
    let picked: Date | null = null;

    const head = h('div', { class: 'dk-cal-h' }) as HTMLElement;
    /**
     * role="grid", with one tab stop and arrow keys inside it.
     *
     * The first pass made all 42 days buttons, which is right for the pointer and
     * wrong for everything else: it put 42 tab stops in a popup, so a keyboard
     * user reaching the taskbar behind it had to press Tab forty-two times. A date
     * grid is the textbook roving-tabindex case — one cell is reachable, arrows
     * move between cells, and the rest are tabindex="-1".
     *
     * The rows are real elements with display:contents, because role="gridcell"
     * needs a role="row" parent to be valid, and contents keeps them out of the
     * seven-column layout while leaving the semantics intact.
     *
     * Keys follow the date-picker convention rather than inventing any:
     *   arrows  one day / one week      Home / End  start / end of that week
     *   PgUp / PgDn  previous / next month         Enter, Space  select
     */
    const grid = h('div', { class: 'dk-cal-grid', role: 'grid' }) as HTMLElement;
    // Which day owns the tab stop. Starts on today, follows the arrows after that,
    // and is re-resolved to the nearest sane cell whenever the month changes.
    let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const cellFor = (d: Date): HTMLElement | null =>
      grid.querySelector(`[data-day="${d.getFullYear()}-${d.getMonth()}-${d.getDate()}"]`);

    const moveTo = (next: Date, focusIt: boolean): void => {
      cursor = next;
      // Stepping off the edge of the shown month pages to the one the cursor is
      // now in, which is the only behaviour that keeps the cursor visible.
      if (next.getMonth() !== shown.getMonth() || next.getFullYear() !== shown.getFullYear()) {
        shown = new Date(next.getFullYear(), next.getMonth(), 1);
        draw();
        say(shown.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
      } else {
        roving();
      }
      if (focusIt) cellFor(cursor)?.focus();
    };

    const roving = (): void => {
      for (const el of grid.querySelectorAll('.dk-cal-day')) el.setAttribute('tabindex', '-1');
      // If the cursor is not on screen — you paged with the chevrons — the tab stop
      // lands on the 1st of the shown month so there is always exactly one.
      const own = cellFor(cursor) ?? cellFor(new Date(shown.getFullYear(), shown.getMonth(), 1));
      own?.setAttribute('tabindex', '0');
    };

    const pick = (day: Date, outside: boolean): void => {
      picked = day;
      cursor = day;
      // Clicking into a neighbouring month pages there, which is what the real
      // one does — otherwise the day you just picked scrolls out of sight.
      if (outside) shown = new Date(day.getFullYear(), day.getMonth(), 1);
      draw();
      cellFor(day)?.focus();
      say(day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };

    const draw = (): void => {
      const monthName = shown.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      head.textContent = monthName;
      grid.setAttribute('aria-label', monthName);
      grid.textContent = '';
      grid.appendChild(h('div', { class: 'dk-cal-row', role: 'row' },
        ...CAL_WD.map((d) => h('span', { class: 'dk-cal-wd', role: 'columnheader' }, d))) as Node);

      // Back up to the Monday on or before the 1st, then run 42 days straight.
      const first = new Date(shown.getFullYear(), shown.getMonth(), 1);
      const start = new Date(first);
      start.setDate(1 - ((first.getDay() + 6) % 7));

      for (let w = 0; w < 6; w += 1) {
        const row = h('div', { class: 'dk-cal-row', role: 'row' }) as HTMLElement;
        for (let i = 0; i < 7; i += 1) {
          const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i);
          const outside = day.getMonth() !== shown.getMonth();
          const isToday = sameDay(day, today);
          const isPicked = picked !== null && sameDay(day, picked);
          const cell = h('button', {
            class: 'dk-cal-day'
              + (outside ? ' is-out' : '')
              + (isToday ? ' is-today' : '')
              + (isPicked ? ' is-sel' : ''),
            type: 'button', role: 'gridcell', tabindex: '-1',
            'data-day': `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`,
            'aria-label': day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            'aria-selected': String(isPicked),
            ...(isToday ? { 'aria-current': 'date' } : {}),
          }, h('span', { class: 'dk-cal-disc' }, String(day.getDate()))) as HTMLElement;
          cell.addEventListener('click', () => pick(day, outside));
          row.appendChild(cell);
        }
        grid.appendChild(row);
      }
      roving();
    };

    const shift = (d: Date, days: number, months: number): Date =>
      new Date(d.getFullYear(), d.getMonth() + months, d.getDate() + days);

    grid.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent;
      const k = ev.key;
      let next: Date | null = null;
      if (k === 'ArrowLeft') next = shift(cursor, -1, 0);
      else if (k === 'ArrowRight') next = shift(cursor, 1, 0);
      else if (k === 'ArrowUp') next = shift(cursor, -7, 0);
      else if (k === 'ArrowDown') next = shift(cursor, 7, 0);
      else if (k === 'PageUp') next = shift(cursor, 0, -1);
      else if (k === 'PageDown') next = shift(cursor, 0, 1);
      else if (k === 'Home') next = shift(cursor, -((cursor.getDay() + 6) % 7), 0);
      else if (k === 'End') next = shift(cursor, 6 - ((cursor.getDay() + 6) % 7), 0);
      if (!next) return;
      ev.preventDefault();
      // Not stopPropagation: Escape still has to reach the desktop's dismisser,
      // and nothing above this cares about arrows.
      moveTo(next, true);
    });

    const step = (delta: number, label: string): HTMLElement => {
      const b = h('button', { class: 'dk-cal-nav', type: 'button', 'aria-label': label },
        h('span', { 'aria-hidden': 'true' }, delta < 0 ? '\u25B4' : '\u25BE')) as HTMLElement;
      b.addEventListener('click', () => {
        shown = new Date(shown.getFullYear(), shown.getMonth() + delta, 1);
        draw();
        say(shown.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
      });
      return b;
    };

    draw();
    return h('div', { class: 'dk-flyout dk-cal', role: 'dialog', 'aria-label': 'Calendar' },
      h('div', { class: 'dk-cal-top' },
        today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })),
      h('div', { class: 'dk-cal-bar' }, head,
        h('span', { class: 'dk-cal-navs' }, step(-1, 'Previous month'), step(1, 'Next month'))),
      grid) as HTMLElement;
  };

  const stamp = Date.now();
  const clock = new Date(stamp);
  const hh = String(clock.getHours()).padStart(2, '0');
  const mm = String(clock.getMinutes()).padStart(2, '0');
  const dd = `${String(clock.getDate()).padStart(2, '0')}/${String(clock.getMonth() + 1).padStart(2, '0')}/${clock.getFullYear()}`;

  const trayQs = h('button', {
    class: 'dk-tray-btn', type: 'button', 'aria-label': 'Quick settings', 'aria-expanded': 'false',
  }, h('span', { class: 'dk-tray-ico' }, icWifi()),
     h('span', { class: 'dk-tray-ico' }, icVol()),
     h('span', { class: 'dk-tray-ico' }, icBattery())) as HTMLButtonElement;
  trayQs.addEventListener('click', () => openFlyout(trayQs, buildQuickSettings));

  const trayClock = h('button', {
    class: 'dk-tray-btn dk-clock', type: 'button',
    'aria-label': 'Date and time', 'aria-expanded': 'false',
  }, h('b', {}, hh + ':' + mm), h('i', {}, dd)) as HTMLButtonElement;
  trayClock.addEventListener('click', () => openFlyout(trayClock, buildCalendar));

  const tray = h('div', { class: 'dk-tray' },
    h('span', { class: 'dk-weather' }, '11°C  Klart'),
    trayQs, trayClock) as HTMLElement;

  /**
   * THE DESKTOP HAD NOTHING ON IT.
   *
   * The audit put this second only to the tray: .dk-surface held windows and
   * bare wallpaper — no icons, no selection, no right-click. A Windows desktop
   * with an empty top-left corner is the single clearest tell that you are
   * looking at a drawing of one.
   *
   * Three icons, and all three open something real. There is no Recycle Bin,
   * because ours would have nothing in it and nothing to do — an icon whose only
   * job is to look like Windows is exactly the kind of prop this build keeps
   * refusing to add.
   *
   * Behaviour follows the OS: click selects, double-click opens, Enter opens the
   * selection, arrows move it, a drag on empty ground draws a marquee, and a
   * right-click gets a menu whose every item does what it says.
   */
  const DESK_ICONS: { id: string; label: string; ico: () => HTMLElement; kind: string; open: () => void }[] = [
    { id: 'work', label: 'Work', ico: icFolder, kind: 'folder', open: () => openWindow('explorer') },
    { id: 'chrome', label: 'Google Chrome', ico: icChrome, kind: 'app', open: () => openWindow('chrome') },
    { id: 'cv', label: 'NamNguyen_CV_2026.pdf', ico: icPdf, kind: 'pdf', open: () => openFile('cv') },
  ];

  const iconLayer = h('div', {
    class: 'dk-icons', role: 'listbox', 'aria-label': 'Desktop', 'aria-multiselectable': 'true',
  }) as HTMLElement;
  let iconOrder = DESK_ICONS.slice();
  let iconSize: 'lg' | 'md' | 'sm' = 'md';
  const chosen = new Set<string>();
  let cursorIcon = 0;

  const drawIcons = (): void => {
    iconLayer.className = 'dk-icons is-' + iconSize;
    iconLayer.textContent = '';
    iconOrder.forEach((it, i) => {
      const on = chosen.has(it.id);
      const el = h('button', {
        class: 'dk-icon' + (on ? ' is-sel' : ''),
        type: 'button', role: 'option', 'aria-selected': String(on),
        tabindex: i === cursorIcon ? '0' : '-1',
        'data-icon': it.id,
      }, h('span', { class: 'dk-icon-img' }, it.ico()),
         h('span', { class: 'dk-icon-t' }, it.label)) as HTMLElement;
      el.addEventListener('click', () => { cursorIcon = i; only(it.id); });
      el.addEventListener('dblclick', () => it.open());
      iconLayer.appendChild(el);
    });
  };

  const only = (id: string | null): void => {
    chosen.clear();
    if (id) chosen.add(id);
    drawIcons();
    if (id) (iconLayer.querySelector(`[data-icon="${id}"]`) as HTMLElement | null)?.focus();
  };

  /* Enter opens, arrows move, Escape clears — the desktop's own keyboard, which
     it did not have at all. The layer is a listbox with one tab stop, same
     roving-tabindex shape as the calendar grid. */
  iconLayer.addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    const cur = iconOrder[cursorIcon];
    if (ev.key === 'Enter' || ev.key === ' ') {
      if (!cur) return;
      ev.preventDefault();
      cur.open();
      return;
    }
    // The icons flow in one column, so up and down are the axis that moves.
    const d = ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1
      : ev.key === 'ArrowUp' || ev.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    ev.preventDefault();
    cursorIcon = Math.max(0, Math.min(iconOrder.length - 1, cursorIcon + d));
    only(iconOrder[cursorIcon]!.id);
  });

  /* --- the marquee ------------------------------------------------------- */
  /* A drag on empty ground draws a rectangle and selects what it touches. It is
     the one desktop gesture with no button behind it, so its absence is felt
     rather than seen — the ground simply did not respond to being dragged on. */
  const marquee = h('div', { class: 'dk-marquee' }) as HTMLElement;
  marquee.hidden = true;
  surface.appendChild(marquee);

  surface.addEventListener('pointerdown', (e) => {
    const ev = e as PointerEvent;
    if (ev.button !== 0) return;
    const t = ev.target as HTMLElement;
    if (t.closest('.wx, .dk-icon, .dk-flyout, .dk-ctx')) return;
    const host = surface.getBoundingClientRect();
    const x0 = ev.clientX - host.left;
    const y0 = ev.clientY - host.top;
    only(null);
    let dragging = false;

    const move = (m: PointerEvent): void => {
      const x = m.clientX - host.left;
      const y = m.clientY - host.top;
      // A few pixels of slack, so a click that wobbles is still a click.
      if (!dragging && Math.abs(x - x0) < 4 && Math.abs(y - y0) < 4) return;
      dragging = true;
      marquee.hidden = false;
      marquee.style.left = `${Math.min(x0, x)}px`;
      marquee.style.top = `${Math.min(y0, y)}px`;
      marquee.style.width = `${Math.abs(x - x0)}px`;
      marquee.style.height = `${Math.abs(y - y0)}px`;
      const box = marquee.getBoundingClientRect();
      chosen.clear();
      for (const it of iconOrder) {
        const el = iconLayer.querySelector(`[data-icon="${it.id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const hit = r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top;
        if (hit) chosen.add(it.id);
      }
      drawIcons();
    };
    const up = (): void => {
      marquee.hidden = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (dragging && chosen.size) say(`${chosen.size} selected`);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  /* --- the context menu -------------------------------------------------- */
  /* Every item here does what it says. Windows' own desktop menu is mostly
     Personalise and Display settings, which for us would be two dead rows; what
     is left is the part that was always real anyway — how big the icons are, how
     they are sorted, and redraw. */
  let ctx: HTMLElement | null = null;
  const shutCtx = (): void => { ctx?.remove(); ctx = null; };

  const ctxItem = (label: string, run: () => void, checked?: boolean): HTMLElement => {
    const b = h('button', {
      class: 'dk-ctx-item', type: 'button',
      ...(checked === undefined ? {} : { role: 'menuitemradio', 'aria-checked': String(checked) }),
      ...(checked === undefined ? { role: 'menuitem' } : {}),
    }, h('span', { class: 'dk-ctx-tick', 'aria-hidden': 'true' }, checked ? '\u2713' : ''),
       h('span', {}, label)) as HTMLElement;
    b.addEventListener('click', () => { shutCtx(); run(); });
    return b;
  };

  surface.addEventListener('contextmenu', (e) => {
    const ev = e as MouseEvent;
    if ((ev.target as HTMLElement).closest('.wx, .dk-flyout')) return;
    ev.preventDefault();
    shutCtx();
    const onIcon = (ev.target as HTMLElement).closest('.dk-icon') as HTMLElement | null;
    const id = onIcon?.getAttribute('data-icon') ?? null;
    if (id) only(id);

    const items = id
      ? [ctxItem('Open', () => iconOrder.find((i) => i.id === id)?.open())]
      : [
        ctxItem('Large icons', () => { iconSize = 'lg'; drawIcons(); say('Large icons'); }, iconSize === 'lg'),
        ctxItem('Medium icons', () => { iconSize = 'md'; drawIcons(); say('Medium icons'); }, iconSize === 'md'),
        ctxItem('Small icons', () => { iconSize = 'sm'; drawIcons(); say('Small icons'); }, iconSize === 'sm'),
        h('div', { class: 'dk-ctx-sep', role: 'separator' }) as HTMLElement,
        ctxItem('Sort by name', () => {
          iconOrder = iconOrder.slice().sort((a, b) => a.label.localeCompare(b.label));
          drawIcons();
          say('Sorted by name');
        }),
        ctxItem('Sort by type', () => {
          iconOrder = iconOrder.slice().sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));
          drawIcons();
          say('Sorted by type');
        }),
        h('div', { class: 'dk-ctx-sep', role: 'separator' }) as HTMLElement,
        ctxItem('Refresh', () => { only(null); drawIcons(); say('Refreshed'); }),
      ];

    ctx = h('div', { class: 'dk-ctx', role: 'menu', 'aria-label': 'Desktop' }, ...items) as HTMLElement;
    surface.appendChild(ctx);

    /* Keep it on screen by FLIPPING about the cursor, not by sliding it back in.
       Clamping to the surface edge leaves the menu detached from the pointer that
       summoned it — QA caught it opening 50px above a click with room to spare.
       Windows opens upward or leftward instead, so the corner stays on the
       cursor whichever way it has to go. */
    const host = surface.getBoundingClientRect();
    const w = ctx.offsetWidth;
    const hgt = ctx.offsetHeight;
    const cx = ev.clientX - host.left;
    const cy = ev.clientY - host.top;
    const x = cx + w > host.width - 4 ? cx - w : cx;
    const y = cy + hgt > host.height - 4 ? cy - hgt : cy;
    ctx.style.left = `${Math.max(4, Math.min(x, host.width - w - 4))}px`;
    ctx.style.top = `${Math.max(4, Math.min(y, host.height - hgt - 4))}px`;
    (ctx.firstElementChild as HTMLElement | null)?.focus();
  });

  drawIcons();
  surface.appendChild(iconLayer);

  const page = h('div', { class: 'pg pg-desk' },
    wallpaper(),
    live_region,
    surface,
    h('div', { class: 'dk-taskbar', role: 'toolbar', 'aria-label': 'Taskbar' },
      h('div', { class: 'dk-task-wrap' },
        start,
        taskBtn2,
        // Every app gets a button; paint() hides the unpinned ones until they run,
        // which keeps their position on the bar stable across open and close.
        ...APPS.map(taskBtn)),
      tray));

  page.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement;
    // Innermost first: a press inside Start that misses the power button closes
    // the power menu and nothing else.
    if (ctx && !t.closest('.dk-ctx')) shutCtx();
    if (pwr && !t.closest('.dk-pwr-wrap')) shutPwr();
    if (menu && !t.closest('.dk-start-menu, .dk-start')) { shutPwr(); menu.remove(); menu = null; }
    if (flyout && !t.closest('.dk-flyout, .dk-tray-btn')) shutFlyout();
  });

  /* Escape unwinds one layer at a time — power menu, then Start, then a tray
     flyout — because collapsing all three on one keypress loses the user's place
     and is not what any of the three looks like it will do. */
  page.addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key !== 'Escape') return;
    if (taskView) { ev.stopPropagation(); shutTaskView(); return; }
    if (ctx) { ev.stopPropagation(); shutCtx(); return; }
    if (pwr) { ev.stopPropagation(); const b = pwr.btn; shutPwr(); b.focus(); return; }
    if (menu) { ev.stopPropagation(); menu.remove(); menu = null; start.focus(); return; }
    if (flyout) { ev.stopPropagation(); shutFlyout(); }
  });

  openWindow('explorer');

  /*
   * The egg boot. Explorer is placed at the folder the clip lives in and the
   * player opens on top of it, so the desktop tells the story rather than just
   * playing a video: this is a file on his machine, in a folder of them.
   */
  if (boot?.egg) {
    live.find((w) => w.kind === 'explorer')?.go?.('Hobby');
    route('player', 'vid:' + boot.egg);
    /*
     * Centre it. Nam: "when you just got inside the meeting from the easter egg,
     * I want the video to be center on the screen."
     *
     * openWindow cascades every new window down and right so a second one does
     * not land exactly on the first, which is correct for windows you opened
     * yourself and wrong for this one: the clip is the entire reason the call
     * exists, and it was arriving tucked into the top-left corner overlapping
     * Explorer.
     *
     * offsetWidth, not getBoundingClientRect: the window opens under wx-in,
     * which scales from .96, and a rect read mid-animation is 4% short — that
     * has already cost this project one wrong measurement.
     */
    const mine = live.find((w) => w.kind === 'player');
    // After a frame, not now. pageDesktop BUILDS the page and returns it -- at
    // this point nothing here is in the document yet, so the surface measures
    // 0x0 and centring resolves to (0,0), which is exactly where QA found the
    // window. One frame later the desktop is mounted and laid out.
    if (mine) requestAnimationFrame(() => centreWin(mine.el));
  }

  /*
   * N1. Nam: "the default state when joining the interview call is in
   * screensharing, full screen, with chrome opening the CV. I want chrome in the
   * middle of the screen then. which CV to use: the same as we have in view
   * document in home screen."
   *
   * So the call opens on the work rather than on an empty tile. Same centring as
   * the egg boot, and the same document as the home screen's Open document — the
   * browser frames './#plain', which is the one CV both routes render.
   *
   * Explorer is closed first: openWindow('explorer') runs unconditionally further
   * up so the desktop is never empty, and a reader arriving at the CV does not
   * need a file list behind it.
   */
  if (boot?.cv) {
    for (const w of live.filter((x) => x.kind === 'explorer')) closeWin(w);
    route('chrome', 'cv');
    const mine = live.find((w) => w.kind === 'chrome');
    if (mine) requestAnimationFrame(() => centreWin(mine.el));
  }

  paint();
  return page;
}
