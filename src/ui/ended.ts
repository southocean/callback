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

  return h(
    'main',
    { class: 'ended', id: 'main' },
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
