// The green room — Meet's "Ready to join?" screen.
//
// Measured: 740x416 preview tile at radius 8 on #202124, a 448px column beside
// it, 28px/400 heading, 44px round controls inside the tile, outlined device
// chips underneath, a 48px filled "Join now" pill and an outlined
// "Other ways to join".
//
// Review U3 said pre-join screens are friction and Google spends real effort
// removing them — so this one is one click, and any deep link skips it.

import { h, clear } from '../dom.js';
import { sym } from './icons.js';
import type { Store } from '../state.js';
import { profile } from '../data/cv.js';

export interface Media {
  video: HTMLVideoElement;
  toggleCamera: () => Promise<void>;
  cameraOn: () => boolean;
}

export function renderLobby(store: Store, media: Media): HTMLElement {
  const warn = h('div', {});

  const avatar = h('div', {}, h('div', { class: 'preview-avatar', 'aria-hidden': 'true' }, 'NN'),
    h('p', { class: 'preview-ask', style: 'margin:0' }, 'Do you want people to see you in the meeting?'));

  const stage = h(
    'div',
    { class: 'preview' },
    h('span', { class: 'preview-name' }, profile.name),
    media.video,
    avatar,
    warn,
    h(
      'div',
      { class: 'preview-ctls' },
      h(
        'button',
        {
          class: 'round-ctl off',
          type: 'button',
          'aria-label': 'Turn on microphone',
          onclick: (e: Event) => {
            const b = e.currentTarget as HTMLButtonElement;
            const on = b.classList.toggle('off');
            b.setAttribute('aria-label', on ? 'Turn on microphone' : 'Turn off microphone');
            clear(b);
            b.appendChild(sym(on ? 'mic_off' : 'mic', 22));
            store.dispatch({ t: 'mic', on: !on });
          },
        },
        sym('mic_off', 22),
      ),
      h(
        'button',
        {
          class: 'round-ctl off',
          type: 'button',
          'aria-label': 'Turn on camera',
          onclick: (e: Event) => {
            void media.toggleCamera().then(() => {
              const b = e.currentTarget as HTMLButtonElement;
              const on = media.cameraOn();
              b.classList.toggle('off', !on);
              b.setAttribute('aria-label', on ? 'Turn off camera' : 'Turn on camera');
              clear(b);
              b.appendChild(sym(on ? 'videocam' : 'videocam_off', 22));
              avatar.style.display = on ? 'none' : '';
              if (!on) {
                clear(warn);
                warn.appendChild(
                  h(
                    'div',
                    { class: 'preview-warn', role: 'status' },
                    h('b', {}, 'Camera off'),
                    h('span', {}, 'Entirely fine. Nothing on this page needs it, and nothing would leave your machine if it did.'),
                  ),
                );
                window.setTimeout(() => clear(warn), 4500);
              } else {
                clear(warn);
              }
            });
          },
        },
        sym('videocam_off', 22),
      ),
      h(
        'button',
        {
          class: 'round-ctl',
          type: 'button',
          'aria-label': 'Backgrounds and effects',
          onclick: () => {
            store.dispatch({ t: 'join' });
            store.dispatch({ t: 'engTab', tab: 'fx' });
          },
        },
        sym('visual_effects', 22),
      ),
    ),
  );

  const chips = h(
    'div',
    { class: 'devices' },
    h('span', { class: 'device-chip' }, sym('mic', 18), 'Default — Microphone', sym('expand_more', 18)),
    h('span', { class: 'device-chip' }, sym('videocam', 18), 'Default — Camera', sym('expand_more', 18)),
    h('span', { class: 'device-chip' }, sym('speed', 18), 'Fibre · 32 ms', sym('expand_more', 18)),
  );

  const col = h(
    'div',
    { class: 'join-col' },
    h('h1', {}, 'Ready to join?'),
    h('p', { class: 'join-sub' }, 'Nam Nguyen is already in the call. He has been in there a while.'),
    h(
      'div',
      { class: 'join-card' },
      sym('description', 22),
      h(
        'div',
        {},
        h('b', {}, 'Prefer to read?'),
        h('span', {}, 'The whole CV as one page.'),
      ),
      h(
        'button',
        { class: 'm-btn m-text', type: 'button', onclick: () => store.dispatch({ t: 'plain', on: true }) },
        'Open',
      ),
    ),
    h(
      'div',
      { class: 'join-actions' },
      h(
        'button',
        {
          class: 'm-btn m-filled join-now',
          type: 'button',
          onclick: () => store.dispatch({ t: 'join' }),
        },
        'Join now',
      ),
      h(
        'a',
        { class: 'm-btn m-outlined', href: 'NamNguyen_CV_2026.pdf', download: true },
        sym('description', 18),
        'Other ways to join — take the PDF',
      ),
    ),
  );

  return h(
    'div',
    { class: 'lobby' },
    h(
      'header',
      { class: 'lobby-bar' },
      // In the real product this is *your* account. Here the visitor is the
      // one taking the interview, so it is theirs — not Nam's. No real address
      // is invented: Google publishes none for this, and it would be a strange
      // thing to fabricate on a job application.
      h(
        'div',
        { class: 'lobby-acct' },
        h('b', {}, 'you@google.com'),
        h('span', {}, 'Switch account'),
      ),
    ),
    h(
      'main',
      { class: 'lobby-body', id: 'main' },
      h('div', { class: 'preview-col' }, stage, chips),
      col,
    ),
  );
}
