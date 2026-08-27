// The way out.
//
// Review U1 again: never trap anyone in the toy. This screen hands over the
// boring, useful things — the PDF, an email address, the plain document — and
// the block written for the person who has to file the referral (review H4).

import { h, icon, icons } from '../dom.js';
import { mailSubject } from '../data/companies.js';
import { profile, referralBlurb, meta, SITE } from '../data/cv.js';
import type { Quests } from '../achievements.js';

export function renderEnd(store: { dispatch: (a: { t: 'join' }) => unknown }, quests: Quests, onPlain: () => void): HTMLElement {
  const address = `${profile.emailUser}@${profile.emailHost}`;
  const url = SITE;
  const { got, total } = quests.count();

  const blurbText = referralBlurb + url;
  const blurb = h('div', { class: 'blurb' }, blurbText);
  const copyBtn = h(
    'button',
    {
      class: 'btn btn-sm',
      type: 'button',
      onclick: () => {
        void navigator.clipboard?.writeText(blurbText).then(
          () => (copyBtn.textContent = 'Copied'),
          () => (copyBtn.textContent = 'Select it manually — clipboard blocked'),
        );
      },
    },
    icon(icons.copy, 16),
    'Copy',
  );

  return h(
    'main',
    { class: 'end', id: 'main' },
    h(
      'div',
      { class: 'end-inner' },
      h('h1', {}, 'Call ended.'),
      h(
        'p',
        { class: 'end-lead' },
        'Thanks for sitting through it. Here are the parts that survive being emailed: a PDF, an address, and the ' +
          'same CV as a document you can print.',
      ),

      h(
        'div',
        { class: 'contact' },
        h('a', { class: 'btn btn-primary', href: 'NamNguyen_CV_2026.pdf', download: true }, icon(icons.doc, 18), 'Download the CV'),
        h('a', { class: 'btn', href: `mailto:${address}?subject=${mailSubject()}` }, address),
        h('button', { class: 'btn', type: 'button', onclick: onPlain }, 'Read it as a document'),
        h('button', { class: 'btn', type: 'button', onclick: () => store.dispatch({ t: 'join' }) }, 'Re-join the call'),
      ),

      h(
        'div',
        { class: 'end-card' },
        h('h2', {}, 'For my referrer'),
        h(
          'p',
          {},
          'A friend on the Meet team offered to refer me, which is generous and is the reason this exists at all — ' +
            'the work is still mine to defend. Referral forms want a short paragraph at an awkward hour, so here is ' +
            'one already written. No superlatives, and every sentence checks out against the CV.',
        ),
        blurb,
        copyBtn,
      ),

      h(
        'div',
        { class: 'end-card' },
        h('h2', {}, `Side quests: ${got}/${total}`),
        h(
          'p',
          {},
          got === total
            ? 'All of them. That is more thorough than most interviews. The main quest is the one in the job ad — four people on four networks, all seeing the same thing at the same instant.'
            : 'There are a few left in the Engineering panel, under Storyline. There are also two that are not on the list, and one of them is the oldest keyboard shortcut in games.',
        ),
      ),

      h(
        'div',
        { class: 'end-fine' },
        h('p', {}, ...profile.links.map((l, i) => h('span', {}, i ? ' · ' : '', h('a', { href: l.href }, `${l.label}/${l.handle}`)))),
        h('p', {}, meta.disclaimer),
        h(
          'p',
          {},
          'Built in TypeScript with no framework and no dependencies. No analytics, no third-party requests, and no ' +
            'backend — which is why the camera stream had nowhere to go. You can check that in the Network tab.',
        ),
      ),
    ),
  );
}
