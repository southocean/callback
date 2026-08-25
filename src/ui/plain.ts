// Plain mode.
//
// Review U1: a novelty interface that hides the content loses. So the entire CV
// also exists as one accessible scrolling document, rendered from the same data
// module as the call (review T13), with a print stylesheet that produces the
// one-pager worth attaching to an application (review H7).
//
// Nothing here is a summary. It is the whole thing.

import { h } from '../dom.js';
import {
  profile, pitch, roles, education, teaching, honours, skills, offstage, requirementMap, meta,
} from '../data/cv.js';
import { buildMeta } from './eng.js';

function email(): string {
  // Assembled rather than sitting in the markup (review S3).
  return `${profile.emailUser}@${profile.emailHost}`;
}

/**
 * @param embedded True when this document is being framed by the share view.
 *
 * The share view puts this page in an iframe so the shared "tab" is the real
 * responsive document rather than a drawing of one. That makes "Back to the
 * call" wrong in two ways at once, and Nam caught the visible half: it sits over
 * the shared page in the top-right corner, inside a screen share, where the
 * viewer is being shown a CV and not offered navigation.
 *
 * The half that does not show is worse — it was already a dead control. Pressing
 * it dispatches plain:false, and render() coerces a framed copy of this app
 * straight back to 'plain' precisely so a share can never nest the call inside
 * itself. So the button could not have worked from in here even if you wanted it
 * to. Dropping it rather than hiding it also keeps it out of the tab order,
 * which matters more than usual: the iframe is focusable content inside a page
 * that is already a full application.
 */
export function renderPlain(onBack: () => void, embedded = false): HTMLElement {
  const b = buildMeta();

  return h(
    'main',
    { class: 'doc', id: 'main' },
    !embedded && h(
      'div',
      { class: 'doc-back no-print' },
      h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: onBack }, 'Back to the call'),
    ),

    h(
      'header',
      { class: 'doc-top' },
      h(
        'div',
        {},
        h('h1', {}, profile.name),
        h('div', { class: 'doc-target' }, `${profile.headline} · applying for ${profile.target}`),
      ),
      h(
        'div',
        { class: 'doc-contact' },
        h('div', {}, h('a', { href: `mailto:${email()}` }, email())),
        h('div', {}, profile.place),
        h('div', {}, ...profile.links.map((l, i) => h('span', {}, i ? ' · ' : '', h('a', { href: l.href }, `${l.label}/${l.handle}`)))),
      ),
    ),

    h('p', { class: 'doc-pitch' }, pitch),

    h('section', {}, h('h2', {}, 'Experience'),
      ...roles.map((r) =>
        h(
          'div',
          {},
          h('div', { class: 'doc-row' }, h('h3', {}, r.org), h('span', { class: 'doc-when' }, `${r.fromLabel} — ${r.toLabel}`)),
          h('div', { class: 'doc-sub' }, `${r.title} · ${r.place}`),
          h('ul', {}, ...r.bullets.map((x) => h('li', {}, x))),
        ),
      ),
    ),

    h('section', {}, h('h2', {}, 'Against this job ad'),
      ...requirementMap.map((r) =>
        h('div', { class: 'doc-skill' }, h('b', {}, `${r.strength === 'honest' ? '~' : '✓'} ${r.req} — `), h('span', { class: 'doc-note' }, r.evidence)),
      ),
    ),

    h('section', {}, h('h2', {}, 'Skills'),
      h('div', { class: 'doc-2col' },
        h('div', {}, ...skills.primary.map((s) => h('div', { class: 'doc-skill' }, h('b', {}, s.name), ' — ', h('span', { class: 'doc-note' }, s.note)))),
        h('div', {}, ...Object.entries(skills.volume).map(([k, v]) => h('div', { class: 'doc-skill' }, h('b', {}, `${k}: `), h('span', { class: 'doc-note' }, v.join(', '))))),
      ),
    ),

    h('section', {}, h('h2', {}, 'Education'),
      ...education.map((e) =>
        h('div', {},
          h('div', { class: 'doc-row' }, h('h3', {}, e.school), h('span', { class: 'doc-when' }, e.years)),
          h('div', { class: 'doc-sub' }, `${e.award} · ${e.place}`),
        ),
      ),
      h('div', { class: 'doc-skill', style: 'margin-top:10px' }, h('b', {}, 'Teaching assistant: '), h('span', { class: 'doc-note' }, teaching.join(' · '))),
      h('div', { class: 'doc-skill' }, h('b', {}, 'Languages: '), h('span', { class: 'doc-note' }, profile.languages)),
    ),

    h('section', {}, h('h2', {}, 'Honours'),
      h('dl', { class: 'doc-honours' }, ...honours.flatMap((x) => [h('dt', {}, x.year), h('dd', {}, x.what)])),
    ),

    h('section', {}, h('h2', {}, 'Off the clock'),
      h('p', { class: 'doc-note' }, offstage.intro),
      ...offstage.items.map((i) => h('div', { class: 'doc-skill' }, h('b', {}, i.what), ' — ', h('span', { class: 'doc-note' }, i.why))),
    ),

    h(
      'footer',
      { class: 'doc-foot no-print' },
      h('p', {}, `This document and the interactive version render from one data module, so they cannot disagree. Print this page for a one-page PDF. Build ${b.commit} · ${(b.jsGzip / 1024).toFixed(1)} kB of JavaScript, gzipped · no dependencies · no third-party requests.`),
      h('p', {}, meta.disclaimer),
    ),
  );
}
