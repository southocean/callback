// Plain mode.
//
// Review U1: a novelty interface that hides the content loses. So the entire CV
// also exists as one accessible scrolling document, rendered from the same data
// module as the call (review T13), with a print stylesheet that produces the
// one-pager worth attaching to an application (review H7).
//
// Nothing here is a summary. It is the whole thing.

import { h } from '../dom.js';
import { currentPitch } from '../data/companies.js';
import { sym, socialLink, type SocialName } from './icons.js';
import {
  profile, pitch, roles, education, teaching, skills, offstage, requirementMap,
} from '../data/cv.js';

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
  // Named `job`, not `pitch`: data/cv.ts already exports a `pitch` and shadowing
  // it here would silently swap the CV summary for the company copy.
  const job = currentPitch();

  return h(
    'main',
    { class: 'doc', id: 'main' },
    /*
     * The standard icon button, not a bordered one. tools/DESIGN-PRINCIPLES.md
     * section 7: there is no bordered grey button in this design language, and
     * "Back to the call" was the only one in the build. In-app this document is
     * an overlay with its own close control, so this only ever shows for someone
     * who opened #plain directly.
     */
    !embedded && h(
      'div',
      { class: 'doc-back no-print' },
      h('button', {
        class: 'icon-btn doc-close', type: 'button', 'aria-label': 'Back to the call', onclick: onBack,
      }, sym('close', 22)),
    ),

    h(
      'header',
      { class: 'doc-top' },
      h(
        'div',
        {},
        h('h1', {}, profile.name),
        h('div', { class: 'doc-target' }, `${profile.headline} · applying for ${currentPitch().target}`),
      ),
      h(
        'div',
        { class: 'doc-contact' },
        h('div', {}, h('a', { href: `mailto:${email()}` }, email())),
        h('div', {}, profile.place),
        h('div', { class: 'doc-socials' },
          ...profile.links.map((l) => socialLink(l.label as SocialName, l.href))),
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

    /*
     * GATED, AND RENAMED. Nam: "we reference the google actual hiring title, but
     * guard this section under url param c=1, cause we dont have the data on
     * other companies job ad."
     *
     * That was T7 on the board: with no code the section rendered one employer's
     * requirements under a heading that named none, so a reader at a different
     * company was being shown a mapping against a posting they had never seen.
     * It is a real section when there is a real posting behind it and absent
     * otherwise, which is the only honest pair of states available.
     *
     * The heading is "Against the job requirement" per point 20, and it now
     * names the role it is measuring against.
     */
    job.named
      ? h('section', {},
        h('h2', {}, 'Against the job requirement'),
        h('p', { class: 'doc-target' }, job.target),
        ...requirementMap.map((r) =>
          h('div', { class: 'doc-skill' }, h('b', {}, `${r.strength === 'honest' ? '~' : '✓'} ${r.req} — `), h('span', { class: 'doc-note' }, r.evidence)),
        ))
      : h('span', {}),

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

    /* Honours removed — see the note in data/cv.ts. The two that carry weight are
       attached to the research they came from instead of listed away from it. */

    h('section', {}, h('h2', {}, 'Off the clock'),
      ...offstage.items.map((i) => h('div', { class: 'doc-skill' },
        h('b', {}, i.what), ' — ',
        h('span', { class: 'doc-note' }, i.why),
        // A press mention is worth more as a link than as a claim.
        i.href
          ? h('span', { class: 'doc-note' }, ' ', h('a', { href: i.href, target: '_blank', rel: 'noopener' }, i.hrefLabel ?? 'Read it'))
          : h('span', {}))),
    ),

    h(
      'footer',
      { class: 'doc-foot no-print' },
      /*
       * WHAT A CV FOOTER IS FOR. Nam: "Whats up with the footer in the CV? ...
       * Idk if they are relevant at all. We can remove them I think."
       *
       * Right. Three things were in there and two were talking to the wrong
       * reader. The build receipts -- commit hash, gzip size, no dependencies --
       * are a good boast in the Project spec panel, where someone has chosen to
       * read about the build; on the CV they interrupt a document about seven
       * years of work to mention a kilobyte count. And meta.disclaimer was
       * separately wrong: it asserted "No Google marks are used" while the shell
       * renders the Meet mark, which the perception doc had already filed as R13.
       *
       * What survives is the one line that helps the reader in front of it: this
       * page prints as a one-pager. Everything else moved to where it belongs.
       */
      h('p', {}, 'Print this page for a one-page PDF.'),
    ),
  );
}
