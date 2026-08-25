// "You left the meeting" — Meet's post-call screen.
//
// Measured: white canvas, 36px/400 h1 in #3c4043, a 40px outlined "Rejoin" and a
// filled "Return to home screen", a text "Submit feedback", then the "Your
// meeting is safe" card. Same furniture, different contents.

import { h } from '../dom.js';
import { sym } from './icons.js';
import type { Store } from '../state.js';
import { profile, referralBlurb, meta, SITE } from '../data/cv.js';
import type { Quests } from '../achievements.js';

export function renderEnded(store: Store, quests: Quests): HTMLElement {
  const address = `${profile.emailUser}@${profile.emailHost}`;
  const url = SITE;
  const { got, total } = quests.count();
  const text = referralBlurb + url;

  const copy = h(
    'button',
    {
      class: 'm-btn m-outlined',
      type: 'button',
      onclick: () => {
        void navigator.clipboard?.writeText(text).then(
          () => (copy.textContent = 'Copied'),
          () => (copy.textContent = 'Clipboard blocked — select it above'),
        );
      },
    },
    sym('content_copy', 18),
    'Copy the referral note',
  );

  /**
   * The auto-return, copied from the original.
   *
   * Meet counts down from 60 and goes home on its own, with a ring draining
   * beside the number — measured at a 56x56 ring ticking once a second. It is a
   * small thing that matters: a dead-end screen with only a button on it makes
   * leaving feel like a failure state, and the countdown says the product still
   * has somewhere to put you.
   *
   * The interval is cleared if anything else navigates first, so a click on
   * "Return to home screen" cannot race the timer.
   */
  const SECONDS = 60;
  /**
   * The ring's radius, and everything else derives from it so the two cannot
   * drift. It was 26 inside a 56 box, which with a 3px stroke puts the outer
   * edge at 55 — the ring all but filled its own box, which is the "radius is
   * too big" Nam saw.
   *
   * 22 with a 4px stroke gives a 48 outer diameter inside the same 56 box.
   * SCREENSHOT-DERIVED, not measured: the countdown label and ring are transient
   * — caught once at 3s after leaving and already gone by 2s on the next run —
   * so the inner diameter and stroke width are read off Nam's capture of the
   * original rather than off the DOM. The 56 box, the position and the colours
   * below ARE measured.
   */
  const RING_R = 22;
  const CIRC = 2 * Math.PI * RING_R;
  const numEl = h('span', { class: 'end-n' }, String(SECONDS));
  const timer = h(
    'div',
    { class: 'end-timer', role: 'status', 'aria-live': 'polite' },
    h('span', { class: 'end-ring' },
      h('span', { class: 'end-n-host', 'aria-hidden': 'true' }),
      numEl),
    h('span', {}, 'Returning to home screen'),
  ) as HTMLElement;
  {
    const ring = timer.querySelector('.end-ring') as HTMLElement;
    ring.style.setProperty('--c', String(CIRC));
    ring.style.setProperty('--dur', SECONDS + 's');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 56 56');
    svg.setAttribute('aria-hidden', 'true');
    // Only the arc. The original draws this with the rotating-mask trick, which
    // has no separate track — and ours was painting one in rgba(255,255,255,.16),
    // a white track on a light surface, so it was invisible anyway.
    for (const cls of ['end-arc']) {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', '28'); c.setAttribute('cy', '28'); c.setAttribute('r', String(RING_R));
      c.setAttribute('class', cls);
      svg.appendChild(c);
    }
    ring.insertBefore(svg as unknown as Node, ring.firstChild);
    let left = SECONDS;
    const tick = window.setInterval(() => {
      left -= 1;
      numEl.textContent = String(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(tick);
        store.dispatch({ t: 'screen', screen: 'home' });
      }
    }, 1000);
    // If the screen goes away for any other reason, the timer goes with it.
    const stop = (): void => window.clearInterval(tick);
    window.addEventListener('hashchange', stop, { once: true });
  }

  return h(
    'main',
    { class: 'ended', id: 'main' },
    timer,
    h(
      'div',
      { class: 'ended-in' },
      h('h1', {}, 'You left the meeting'),
      h(
        'div',
        { class: 'ended-acts' },
        h('button', { class: 'm-btn m-outlined', type: 'button', onclick: () => store.dispatch({ t: 'join' }) }, 'Rejoin'),
        h(
          'button',
          { class: 'm-btn m-filled', type: 'button', onclick: () => store.dispatch({ t: 'screen', screen: 'home' }) },
          'Return to home screen',
        ),
      ),
      h(
        'div',
        { class: 'ended-feedback' },
        h(
          'button',
          { class: 'm-btn m-text', type: 'button', onclick: () => store.dispatch({ t: 'plain', on: true }) },
          'Submit feedback — or just read the CV as a document',
        ),
      ),

      h(
        'div',
        { class: 'safe' },
        sym('shield', 24),
        h(
          'div',
          {},
          h('h2', {}, 'Your referral is safe'),
          h(
            'p',
            {},
            'Nobody has to write anything from scratch. This paragraph is fact-only, carries no superlatives, and ' +
              'every sentence checks out against the CV.',
          ),
          h('div', { class: 'blurb' }, text),
          copy,
        ),
      ),

      h(
        'div',
        { class: 'safe' },
        sym('description', 24),
        h(
          'div',
          {},
          h('h2', {}, 'Take the boring version too'),
          h(
            'p',
            {},
            'A recruiter screens a file in an applicant tracking system, not a web app. The site was always the ' +
              'amplifier — this is the artifact.',
          ),
          h(
            'div',
            { style: 'display:flex;gap:10px;flex-wrap:wrap' },
            h('a', { class: 'm-btn m-filled', href: 'NamNguyen_CV_2026.pdf', download: true }, 'Download the CV'),
            h('a', { class: 'm-btn m-outlined', href: `mailto:${address}?subject=Google%20Meet%20web%20—%20Stockholm` }, address),
          ),
        ),
      ),

      h(
        'div',
        { class: 'safe' },
        sym('bolt', 24),
        h(
          'div',
          {},
          h('h2', {}, `Side quests: ${got} of ${total}`),
          h(
            'p',
            { style: 'margin:0' },
            got === total
              ? 'All of them, which is more thorough than most interview loops. The main quest is the one in the job ad: four people on four networks, all seeing the same thing at the same instant.'
              : 'A few are still open, under Meeting tools → Storyline. Two more are not on the list at all, and one of them is the oldest keyboard shortcut in games.',
          ),
        ),
      ),

      h(
        'div',
        { class: 'ended-fine' },
        h('p', {}, ...profile.links.map((l, i) => h('span', {}, i ? ' · ' : '', h('a', { href: l.href }, `${l.label}/${l.handle}`)))),
        h('p', {}, meta.disclaimer),
        h(
          'p',
          {},
          'Built in TypeScript with no framework and no dependencies. No analytics, no third-party requests and no ' +
            'backend — which is why the camera stream had nowhere to go.',
        ),
      ),
    ),
  );
}
