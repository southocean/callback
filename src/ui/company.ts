// The company index. Unlisted.
//
// Nam: "Add a #company page where it lists the company and the code and the
// customization on the CV for that company. Dont expose this url anywhere in the
// CV, its only accessible via the url."
//
// So nothing links here. It is reachable by typing #company and by nothing else,
// which is the same front door the dev portal uses.
//
// This page is the only place in the build that shows the codes together, and it
// exists so Nam can see at a glance what each send actually says — a CV that
// customises itself per employer is worthless if you cannot check what went out.

import { h } from '../dom.js';
import { companies, NEUTRAL } from '../data/companies.js';
import { profile, SITE } from '../data/cv.js';

const row = (k: string, v: string): HTMLElement =>
  h('div', { class: 'co-row' }, h('dt', {}, k), h('dd', {}, v || h('i', {}, 'not named')));

export function renderCompany(onHome: () => void): HTMLElement {
  return h(
    'main',
    { class: 'doc co', id: 'main' },
    h('div', { class: 'doc-back no-print' },
      h('button', { class: 'co-home', type: 'button', onclick: onHome }, 'Home')),

    h('header', { class: 'doc-top' },
      h('div', {},
        h('h1', {}, 'Company codes'),
        h('div', { class: 'doc-target' }, 'Unlisted. Nothing in the CV links here.'))),

    h('p', { class: 'co-lead' },
      'The CV names no employer by default. A code in the query string swaps in the ' +
      'company-specific lines, the header, the scheduled meeting and the opening message of the ' +
      'cover letter. Everything else is identical, so there is one artefact rather than one per application.'),

    h('h2', {}, 'Default, no code'),
    h('p', { class: 'co-note' },
      'What every reader sees without a code. Every line is true regardless of who opens the link.'),
    h('dl', { class: 'co-card' },
      row('Applying for', NEUTRAL.target),
      row('Meeting title', NEUTRAL.meeting),
      row('Opening line', NEUTRAL.opener)),

    h('h2', {}, 'Codes'),
    ...companies.map((c) => h('section', { class: 'co-block' },
      h('div', { class: 'co-head' },
        h('h3', {}, c.label),
        h('code', { class: 'co-code' }, `?c=${c.code}`)),
      h('div', { class: 'co-link' }, `${SITE}?c=${c.code}`),
      h('dl', { class: 'co-card' },
        row('Employer', c.employer),
        row('Role', c.role),
        row('Location', c.place),
        row('Applying for', c.target),
        row('Meeting title', c.meeting),
        row('Opening line', c.opener)),
      h('p', { class: 'co-note' }, c.notes))),

    h('h2', {}, 'Adding one'),
    h('p', {},
      'Append an entry to ', h('code', {}, 'src/data/companies.ts'),
      '. Give it the next code, the employer, the role as they advertise it, and the three lines. ' +
      'Nothing else needs touching, every surface that names an employer reads through ',
      h('code', {}, 'pitchFor()'), '.'),
    h('p', { class: 'co-note' },
      'Keep the codes boring. A parameter that looks like a campaign tag survives being pasted into ' +
      'an email; one that looks like a switch invites someone to try changing it.'),

    h('footer', { class: 'doc-foot no-print' },
      h('p', {}, `${profile.name}, internal page, not part of the CV.`)),
  );
}
