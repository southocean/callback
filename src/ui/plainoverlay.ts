// The CV as an overlay, not as a destination.
//
// Nam: "I actually think #plain should be shown as an iframe with a close button
// that closes the iframe, so we don't leave the CV site. I dont like when we
// leave the main site, pretty sure this is part of the architecture with google
// too."
//
// He is right about the architecture. Meet never navigates away from itself —
// everything that looks like another page is a panel, a dialog or a frame over
// the call. Routing to #plain was the one place this build left the app.
//
// Framing our own #plain rather than re-rendering the document inline is
// deliberate: main.ts already coerces a framed copy of the app to the plain
// document and suppresses its own back control in that state (EMBEDDED), so the
// framed version arrives clean, with no "Back to the call" pointing at a call
// the reader may not be in. That is the same mechanism the mock Chrome uses to
// show the CV inside the screen share, so there is one path, not two.
//
// The direct #plain route still works and still matters — recruiters get sent
// straight to it.

import { h } from '../dom.js';
import { sym } from './icons.js';
import { trapFocus } from '../a11y.js';

const ID = 'plain-overlay';

export function openPlain(): void {
  if (document.getElementById(ID)) return;

  const frame = h('iframe', {
    class: 'po-frame',
    // The query string has to come along: the framed copy reads ?c= from its OWN
    // location, so './#plain' silently dropped the company code and the CV
    // inside the overlay showed the neutral header while the page around it
    // showed the named one.
    src: `.${location.search}#plain`,
    title: 'Nam Nguyen — CV as a document',
    loading: 'lazy',
  }) as HTMLIFrameElement;

  let release: (() => void) | null = null;

  const close = (): void => {
    release?.();
    overlay.remove();
  };

  /*
   * The dismiss control is the standard icon button with the `close` glyph at
   * 22px — the same control the side panel uses. See tools/DESIGN-PRINCIPLES.md
   * section 7: there is no bordered grey button in this design language, which is
   * exactly what the old "Back to the call" was.
   */
  const overlay = h(
    'div',
    { class: 'po', id: ID, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'CV as a document' },
    h('div', { class: 'po-head' },
      h('span', { class: 'po-ico', 'aria-hidden': 'true' }, sym('description', 22)),
      h('h2', { class: 'po-title' }, 'CV — one page'),
      h('button', {
        class: 'icon-btn po-close', type: 'button', 'aria-label': 'Close document', onclick: close,
      }, sym('close', 22))),
    h('div', { class: 'po-body' }, frame),
  ) as HTMLElement;

  document.body.appendChild(overlay);
  // trapFocus owns Escape as well as the tab ring, so there is no second key
  // listener to keep in step with it.
  release = trapFocus(overlay, close);
  overlay.querySelector<HTMLElement>('.po-close')?.focus();
}
