// The Calls tab, measured off Meet at 2560 wide by driving the live product:
// opening the tab, focusing the field, selecting a contact, pressing Continue,
// opening the dialog's menu, and hovering every control on the way.
//
// The numbers here are a summary; the full baseline, including every easing and
// the resolved GM3 elevation scale, is tools/baseline-calls.md.
//
// COLLAPSED
//   band          720x96,  #f0f4f9, radius 28, GM3 elevation 2
//   pill          680x56,  #fff,    radius 28   (inset 20 all round)
//   input         616x40,  16/24 Google Sans Text, #1f1f1f, at dx 52 in the pill
//   illustration  348x152, centred, 110 below the reserved band footprint
//   headline      45/52 Google Sans, #1f1f1f, no margin
//   subtitle      22/28 Google Sans, #1f1f1f, no margin
//
// THE BAND IS OUT OF FLOW, and that is the load-bearing fact on this screen:
// absolute, pinned to the top of the content column, centred in it, with the
// column reserving its collapsed 112px. Expanding it therefore moves nothing.
//
// The bar above it carries NO composer on this tab: no code field, no New
// button. That is measured, not inferred — a sweep for either control on the
// live Calls tab comes back empty. renderHome drops it.
//
// EXPANDED (the field has focus)
//   band grows 96 -> 406 with NO transition — measured; Meet snaps this open
//   pill          loses its white fill AND tightens: inset 14, 7px to the list
//   list          starts 77 below the band's top, capped at 256; rows 712x72
//   row           avatar 40 at dx 16 dy 16; name 16/24 #1f1f1f at dx 72 dy 14;
//                 address 14/20 #444746 at dx 72 dy 38
//   hover/select  GM3 state layer, ::before #444746 at .08 — not a background,
//                 and with no transition, unlike the home screen's 75ms
//   footer        72 tall; Continue 125x40, #0b57d0, radius 20, padding 0 16 0 24
//
// SELECTED
//   a chip lands in the field: 174x32, #dde3ea, fully rounded, ink #444746,
//   with a 28px avatar at a 2px inset — and the placeholder STAYS
//   a blue disc grows over the avatar: scale(0->1), 150ms ease-out, opacity snaps
//   a trailing close button appears, 16 from the pill's right edge
//
// DIALOG (after Continue)
//   the band collapses and drops focus; the chip stays
//   entrance  scrim opacity 150ms linear, wrapper opacity 75ms linear,
//             panel scale(.8)->1 150ms cubic-bezier(0, 0, .2, 1)
//   scrim   rgba(0,0,0,.32), fixed, z-index -1 inside a z-2001 layer
//   panel   512x532, #e9eef6, radius 28, GM3 elevation 3
//   more_vert + close, 40x40 each, dy 16, at 64 and 16 from the right, 8 apart
//   avatar  88 round, centred, dy 104
//   name    28/36 Google Sans, dy 208, #444746;  address 16/24, #444746, dy 248
//   voice   150x56, #c2e7ff, radius 28, label 500 16/20, ink #001d35 — ENABLED
//   video   152x56, #0b57d0, radius 28, label 500 16/20, white; 16 between them
//   hover   every control: ::before, its own on-colour at .08, 75ms linear
//   notice  480x88 at a 16 inset, #dde3ea, radius 28, padding 16
//   menu    131x64, radius 12, elevation 2, one item, "Block user"
//   NOT present: any tooltip on the two call buttons, and no elevation change
//   on hover — the state layer is the entire feedback
//
// WHERE THIS DIVERGES, AND WHY
//   - Meet selects many contacts and then rings them as a group. Selection here
//     is faithful, chips included, but Continue opens the one-person dialog
//     rather than a group screen: the group screen is one I never measured, and
//     guessing it is the thing this project refuses to do. With more than one
//     selected, the dialog opens on the first.
//   - The dialog gains a `relation` line. Meet has no equivalent, because Meet
//     knows who your contacts are and does not need to say. A CV does.
//   - "Block user" is inert, like every other cloned menu row in this build.

import { h, clear, icon, icons } from '../dom.js';
import { sym } from './icons.js';
import { ripple, attachMenu } from './gm3.js';
import { trapFocus } from '../a11y.js';
import { tip } from './tooltip.js';
import { CONTACTS, CALLING_AS, type Contact } from '../data/contacts.js';

export interface CallsOpts {
  /** Referral note lives in one place so it can be edited without hunting. */
  onOpenReferral: () => void;
}

export function renderCalls(o: CallsOpts): HTMLElement {
  /** Selection is a set, because Meet's is. */
  const chosen = new Set<string>();
  let open = false;

  const input = h('input', {
    type: 'text',
    class: 'calls-input',
    placeholder: 'Search contacts or dial',
    'aria-label': 'Search contacts or dial',
    autocomplete: 'off',
    role: 'combobox',
    'aria-expanded': 'false',
    'aria-controls': 'calls-list',
  }) as HTMLInputElement;

  const chips = h('span', { class: 'calls-chips' });
  const list = h('div', {
    class: 'calls-list', id: 'calls-list', role: 'listbox', 'aria-label': 'Contacts',
  });

  const clearBtn = h('button', {
    class: 'calls-x icon-btn', type: 'button', 'aria-label': 'Clear selection',
  }, sym('close', 24)) as HTMLButtonElement;
  ripple(clearBtn);
  clearBtn.addEventListener('click', () => {
    chosen.clear();
    input.value = '';
    // syncRows rather than paint: the rows on screen are still the right rows,
    // and keeping them lets every disc shrink back on the same 150ms curve
    // instead of vanishing with the nodes.
    syncRows();
    paintChrome();
    input.focus();
  });

  const cont = h('button', {
    class: 'calls-continue', type: 'button',
  }, h('span', {}, 'Continue'), sym('chevron_right', 20)) as HTMLButtonElement;
  ripple(cont);
  cont.addEventListener('click', () => {
    const first = CONTACTS.find((c) => chosen.has(c.id));
    if (!first) return;
    // Measured: pressing Continue collapses the band and drops focus. The chip
    // stays, the pill takes its white fill back, and the illustration behind is
    // uncovered again. We were leaving the whole 406px panel standing open
    // behind the dialog, which is the clutter Nam saw — and it is not what the
    // product does.
    setOpen(false);
    input.blur();
    openDialog(first);
  });

  const pill = h('div', { class: 'calls-pill' }, icon(icons.search, 24), chips, input, clearBtn);
  const band = h('div', { class: 'calls-band' }, pill, list, h('div', { class: 'calls-foot' }, cont));

  // --- painting ------------------------------------------------------------

  /** Filter on name and address, which is what Meet's field matches. */
  const matches = (): Contact[] => {
    const q = input.value.trim().toLowerCase();
    if (!q) return CONTACTS;
    return CONTACTS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  };

  /** What the row and the dialog show. Until a referee agrees, not their address. */
  const shown = (c: Contact): string => (c.confirmed ? c.email : 'Address shown once they agree');

  /**
   * The avatar, and the selected check drawn ON TOP of it rather than instead
   * of it.
   *
   * This used to return one node or the other, which is why selection landed
   * with a snap: swapping the element gives the browser nothing to interpolate.
   * Meet keeps the avatar in place and overlays a disc:
   *
   *   position: absolute; inset: 0; border-radius: 50%;
   *   background: #0b57d0;
   *   opacity: 0;  transform: scale(0);
   *   transition: transform .15s ease-out;     <- transform only
   *   [selected] { opacity: 1; transform: scale(1) }
   *
   * Only `transform` is in the transition list, so the opacity snaps to 1 and
   * the disc grows out of the middle of the avatar over 150ms. Deselecting runs
   * the same curve backwards. That is the whole effect Nam described as the
   * check "slowly growing up to fill the avatar".
   */
  const avatar = (c: Contact, size: 28 | 40 | 88, withCheck = false): HTMLElement => {
    const av = h('span', {
      class: 'calls-av',
      style: `--s:${size}px;--bg:${c.tint};--fg:${c.ink}`,
      'aria-hidden': 'true',
    }, c.initials);
    // Rows only. The chip and the dialog show a person, never a selection.
    if (withCheck) {
      av.appendChild(h('span', { class: 'calls-av-check' }, sym('check', 24)));
    }
    return av;
  };

  /**
   * Painting is split in two, and the reason is the check animation.
   *
   * Selecting a contact must NOT rebuild the list. The disc's growth is a CSS
   * transition on `transform`, and a transition needs the element to survive the
   * change so there is a previous value to interpolate from. The first version
   * of this fix got the CSS exactly right and still snapped, because one
   * paint() rebuilt every row — so the "newly selected" row was a brand-new node
   * born with aria-selected="true" and transform: scale(1) already applied.
   * Nothing to animate from, no animation, and `getAnimations()` confirmed it:
   * zero running transitions on a click that visibly changed the screen.
   *
   * That is the same failure as the original node swap, one level up, and it is
   * invisible in the CSS. So: rows are rebuilt only when the *set* of rows
   * changes (typing a filter), and selection just flips the attribute on the row
   * that is already on screen.
   */
  function paintChrome(): void {
    clear(chips);
    for (const c of CONTACTS) {
      if (!chosen.has(c.id)) continue;
      const x = h('button', {
        class: 'calls-chip-x', type: 'button', 'aria-label': `Remove ${c.name}`,
      }, sym('close', 18)) as HTMLButtonElement;
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        chosen.delete(c.id);
        syncRows();
        paintChrome();
        input.focus();
      });
      // 28, measured — the chip is 32 tall with the avatar at a 2px inset. It
      // was being rendered at 40 and scaled down by CSS to 24, which is a
      // different number and looked it.
      chips.appendChild(h('span', { class: 'calls-chip' },
        avatar(c, 28), h('span', { class: 'calls-chip-t' }, c.name), x));
    }

    const any = chosen.size > 0;
    band.classList.toggle('open', open);
    band.classList.toggle('has-sel', any);
    clearBtn.hidden = !any;
    cont.disabled = !any;
    input.setAttribute('aria-expanded', open ? 'true' : 'false');
    // Measured, and the opposite of what we had: Meet KEEPS the placeholder
    // after a chip lands. The field reads "[chip] Search contacts or dial",
    // because the field still does something — you can select more people. We
    // were blanking it, which made the pill look finished and turned a live
    // control into a label.
  }

  /** Reflect `chosen` onto rows that are already in the DOM, so they animate. */
  function syncRows(): void {
    for (const row of list.querySelectorAll<HTMLElement>('.calls-row')) {
      const id = row.dataset['id'];
      row.setAttribute('aria-selected', id && chosen.has(id) ? 'true' : 'false');
    }
  }

  function paintList(): void {
    clear(list);
    const rows = matches();
    if (!rows.length) {
      list.appendChild(h('p', { class: 'calls-none' },
        `No contacts matched “${input.value.trim()}”.`));
    }
    for (const c of rows) {
      const row = h('button', {
        class: 'calls-row', type: 'button', role: 'option', 'data-id': c.id,
        'aria-selected': chosen.has(c.id) ? 'true' : 'false',
        // The check ships on every row and is driven by aria-selected in CSS,
        // so selecting one animates instead of replacing the node.
      }, avatar(c, 40, true), h('span', { class: 'calls-row-t' },
        h('b', {}, c.name), h('span', {}, shown(c)))) as HTMLButtonElement;
      ripple(row);
      row.addEventListener('click', () => {
        if (chosen.has(c.id)) chosen.delete(c.id);
        else chosen.add(c.id);
        // Attribute flip only — this row stays put, so the disc transitions.
        row.setAttribute('aria-selected', chosen.has(c.id) ? 'true' : 'false');
        paintChrome();
      });
      list.appendChild(row);
    }
  }

  function paint(): void {
    paintList();
    paintChrome();
  }

  // --- opening and closing the panel --------------------------------------

  const setOpen = (v: boolean): void => { open = v; paint(); };
  input.addEventListener('focus', () => setOpen(true));
  pill.addEventListener('mousedown', () => { if (!open) setOpen(true); });
  input.addEventListener('input', paint);
  input.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') { setOpen(false); input.blur(); }
  });
  // A press anywhere outside closes it, which is what Meet does.
  document.addEventListener('pointerdown', (e) => {
    if (open && !band.contains(e.target as Node)) setOpen(false);
  });

  // --- the call dialog -----------------------------------------------------

  function openDialog(c: Contact): void {
    const more = h('button', {
      class: 'cd-icon icon-btn', type: 'button', 'aria-label': 'More options',
    }, sym('more_vert', 24)) as HTMLButtonElement;
    ripple(more);
    tip(more);
    attachMenu(more, () => [{ svgPath: icons.block, label: 'Block user' }],
      { align: 'right', side: 'below', width: 180 });

    const x = h('button', {
      class: 'cd-icon icon-btn', type: 'button', 'aria-label': 'Close',
    }, sym('close', 24)) as HTMLButtonElement;
    ripple(x);
    tip(x);

    // Both buttons are real links. There is no backend to place a call with, so
    // they open the visitor's own mail client — which is the honest version of
    // "reach this person" on a page that cannot ring anybody.
    const voice = h('a', {
      class: 'cd-btn cd-voice',
      ...(c.voice ? { href: c.voice } : { 'aria-disabled': 'true' }),
    }, sym('call', 24), h('span', {}, 'Voice call'));
    ripple(voice);

    const video = h('a', { class: 'cd-btn cd-video', href: c.href },
      sym('videocam', 24), h('span', {}, 'Video call'));
    ripple(video);

    const got = h('button', { class: 'cd-got', type: 'button' }, 'Got it') as HTMLButtonElement;
    ripple(got);
    const notice = h('div', { class: 'cd-notice' },
      h('div', { class: 'cd-notice-t' },
        h('b', {}, 'This reaches a reference, not Meet'),
        h('span', {}, 'The page has no backend, so both buttons open your own mail client. '),
      ),
      got);
    got.addEventListener('click', () => notice.remove());

    const panel = h('div', {
      class: 'cd', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Call ${c.name}`,
    },
      h('div', { class: 'cd-bar' }, more, x),
      avatar(c, 88),
      h('h2', { class: 'cd-name' }, c.name),
      h('p', { class: 'cd-mail' }, shown(c)),
      h('p', { class: 'cd-rel' }, c.relation),
      h('div', { class: 'cd-btns' }, voice, video),
      h('p', { class: 'cd-as' }, `Calling as ${CALLING_AS}`),
      notice);

    // THE ENTRANCE, off document.getAnimations() on the live product. Three
    // separate transitions on three separate elements, which is why one node
    // could never have reproduced it:
    //
    //   shade   opacity 0 -> 1     150ms linear
    //   wrap    opacity 0 -> 1      75ms linear
    //   panel   scale(.8) -> none  150ms cubic-bezier(0, 0, .2, 1)
    //
    // The scrim is real and is rgba(0,0,0,.32). The old comment here claimed
    // Meet had no scrim at all; it does, and ours appearing on an undimmed page
    // with no transition is what made the dialog read as a jump cut.
    //
    // The shade is a separate node rather than a background on the layer because
    // it sits at z-index -1 inside it, which is how Meet keeps the dim behind
    // the panel without a second stacking context.
    const shade = h('div', { class: 'cd-shade' });
    const wrap = h('div', { class: 'cd-wrap' }, panel);
    const scrim = h('div', { class: 'cd-scrim' }, shade, wrap);
    let release = (): void => {};
    // The exit was not measured, so it is not invented: closing is immediate.
    const close = (): void => { release(); scrim.remove(); input.focus(); };
    release = trapFocus(panel, close);
    x.addEventListener('click', close);
    scrim.addEventListener('pointerdown', (e) => {
      if (e.target === scrim || e.target === shade || e.target === wrap) close();
    });
    document.body.appendChild(scrim);
  }

  // --- the screen ----------------------------------------------------------

  paint();

  return h('div', { class: 'calls' },
    band,
    h('div', { class: 'calls-empty' },
      h('div', { class: 'calls-art', 'aria-hidden': 'true' }, art()),
      h('h1', { class: 'calls-h' }, 'Connect with someone who knows the work'),
      h('p', { class: 'calls-s' },
        'A reference beats a claim. Search above, or take the interview already waiting on the Meetings tab.'),
      h('button', {
        class: 'm-btn m-tonal m-new', type: 'button', onclick: () => o.onOpenReferral(),
      }, sym('person_add', 20), h('span', { class: 'm-new-label' }, 'The referral note'))),
  );
}

/**
 * Meet ships a drawn illustration in this slot. This is an original drawing at
 * the same 348x152 box — none of Google's artwork is copied or traced. The
 * subject is this page's own: one call connected, and one still ringing.
 */
function art(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 348 152');
  svg.setAttribute('width', '348');
  svg.setAttribute('height', '152');
  const add = (tag: string, attrs: Record<string, string>): void => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    svg.appendChild(e);
  };
  const INK = '#3c4043';
  const HAIR = '1.25';

  // Two loose shapes behind, for the reason Meet has them too: they stop the
  // drawing reading as a diagram. Ours are a disc and a tilted lozenge.
  add('circle', { cx: '34', cy: '46', r: '21', fill: '#fef7cd' });
  add('rect', {
    x: '292', y: '92', width: '36', height: '36', rx: '11',
    transform: 'rotate(-18 310 110)', fill: '#c4eed0',
  });

  // The connected tile: a rounded frame, a figure, and a live dot on the corner.
  add('rect', {
    x: '76', y: '24', width: '104', height: '104', rx: '20',
    fill: '#e9eef6', stroke: INK, 'stroke-width': HAIR,
  });
  add('circle', { cx: '128', cy: '64', r: '18', fill: '#0b57d0' });
  add('path', { d: 'M103 108a25 25 0 0 1 50 0Z', fill: '#0b57d0' });
  add('circle', { cx: '170', cy: '36', r: '7', fill: '#34a853', stroke: '#fff', 'stroke-width': '2' });

  // The one still ringing: same frame, no figure, a handset instead.
  add('rect', {
    x: '198', y: '42', width: '88', height: '72', rx: '18',
    fill: '#fff', stroke: INK, 'stroke-width': HAIR,
  });
  add('path', {
    d: 'M230 64a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4l1 8a4 4 0 0 1-2 4l-4 2a22 22 0 0 0 10 10l2-4a4 4 0 0 1 4-2l8 1a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4c-18 0-33-15-33-33Z',
    fill: '#0b57d0',
  });
  // Two arcs, the only motion the drawing implies.
  add('path', {
    d: 'M296 56a20 20 0 0 1 0 28', fill: 'none', stroke: '#0b57d0',
    'stroke-width': '3', 'stroke-linecap': 'round',
  });
  add('path', {
    d: 'M308 46a34 34 0 0 1 0 48', fill: 'none', stroke: '#a8c7fa',
    'stroke-width': '3', 'stroke-linecap': 'round',
  });

  return svg;
}
