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
  profile, pitch, roles, education, teaching, skills, offstage, segments,
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
          h('div', { class: 'doc-row' }, h('h3', {}, r.org), h('span', { class: 'doc-when' }, `${r.fromLabel}–${r.toLabel}`)),
          h('div', { class: 'doc-sub' }, `${r.title} · ${r.place}`),
          h('ul', {}, ...r.bullets.map((x) => h('li', {}, x))),
        ),
      ),
    ),

    /*
     * NO REQUIREMENT MAP HERE. Nam: "we have a separate chrome tab for this, why
     * add it to the CV now? This renders the CV not reusable for any other job!"
     *
     * Which is the argument that closes it. This section was gated behind ?c= so
     * it only appeared when a posting had actually been named, and that fixed the
     * honesty problem (T7) without touching the reuse problem: the plain document
     * is the thing that gets printed, mailed and handed on, and a CV whose spine
     * is one employer's requirement list is a document with a shelf life of one
     * application. Every other section here is true whoever reads it.
     *
     * The mapping is not lost and was never only here. It lives in the mock
     * browser as its own page, which is the right home for it: a tab you open
     * when you want to see the CV measured against a specific posting, next to
     * the posting. share.ts, the 'jobad' tab.
     */

    h('section', {}, h('h2', {}, 'Skills'),
      h('div', { class: 'doc-2col' },
        /*
         * A COLON, not an em dash. Nam: "change to : instead of emdash here to
         * keep consistency between left and right column."
         *
         * The right column has always been "Over 10,000 lines: TypeScript, …",
         * and the left was "Test automation — 75–90% unit coverage". Two columns
         * of the same section, side by side, punctuating the same relationship
         * two different ways — which reads as two lists that happen to be next
         * to each other rather than as one section in two halves.
         */
        h('div', {}, ...skills.primary.map((s) => h('div', { class: 'doc-skill' }, h('b', {}, `${s.name}: `), h('span', { class: 'doc-note' }, s.note)))),
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
      // The press mentions are links where they are named, rather than a
      // citation bolted onto the end of the sentence. See segments() in cv.ts.
      ...offstage.items.map((i) => h('div', { class: 'doc-skill' },
        h('b', {}, `${i.what}: `),
        h('span', { class: 'doc-note' },
          ...segments(i.why, i.links).map((s) => (s.href
            ? h('a', { href: s.href, target: '_blank', rel: 'noopener' }, s.text)
            : h('span', {}, s.text)))))),
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
