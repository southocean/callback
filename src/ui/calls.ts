// The Calls tab, measured off Meet:
//
//   search band   720x112, holding a 680x56 white pill at radius 28
//   input         616x40, 16px/24px Google Sans Text, #1f1f1f
//   placeholder   "Search contacts or dial"
//   illustration  348x152, centred
//   headline      45px/52px Google Sans, #1f1f1f — much larger than anything
//                 else in the product, which is what makes an empty tab read as
//                 an invitation rather than a failure
//
// Meet's version of this screen exists to start a call with someone you know.
// Ours keeps that job and changes who: the person who can actually vouch for
// this application. The structure is unchanged, which is the whole trick — a
// recruiter recognises the screen and therefore recognises what it is for.

import { h } from '../dom.js';
import { sym } from './icons.js';
import { tip } from './tooltip.js';

export interface CallsOpts {
  /** Referral note lives in one place so it can be edited without hunting. */
  onOpenReferral: () => void;
}

/**
 * NOTE FOR NAM: the reference below is deliberately unnamed. Putting a real
 * person's name and employer on a public page is theirs to agree to, not mine
 * to assume, so this says what they can speak to without identifying them.
 * Replace REFERENCE.name and REFERENCE.line once you have asked them.
 */
const REFERENCE = {
  name: 'Reference available',
  line: 'Someone on the Meet team can speak to how I work. Ask the person who sent you this link.',
  initials: 'R',
};

export function renderCalls(o: CallsOpts): HTMLElement {
  const input = h('input', {
    type: 'text',
    class: 'calls-input',
    placeholder: 'Search contacts or dial',
    'aria-label': 'Search contacts or dial',
    autocomplete: 'off',
  }) as HTMLInputElement;

  const results = h('div', { class: 'calls-results', role: 'status' });

  // Searching filters the one entry there is. Pretending to have a directory
  // would be a lie the first keystroke exposes.
  const paint = (): void => {
    const q = input.value.trim().toLowerCase();
    results.replaceChildren();
    const hit = !q
      || REFERENCE.name.toLowerCase().includes(q)
      || 'reference referral meet vouch'.includes(q);
    if (!q) return;
    results.appendChild(
      hit
        ? h(
            'button',
            { class: 'calls-row', type: 'button', onclick: () => o.onOpenReferral() },
            h('span', { class: 'calls-av' }, REFERENCE.initials),
            h(
              'span',
              { class: 'calls-row-t' },
              h('b', {}, REFERENCE.name),
              h('span', {}, REFERENCE.line),
            ),
            sym('call', 20),
          )
        : h('p', { class: 'calls-none' }, `No contacts matched “${input.value.trim()}”.`),
    );
  };
  input.addEventListener('input', paint);

  const dial = h(
    'button',
    { class: 'icon-btn', type: 'button', 'aria-label': 'Search contacts or dial' },
    sym('call', 20),
  );
  tip(dial);

  return h(
    'div',
    { class: 'calls' },
    h(
      'div',
      { class: 'calls-band' },
      h('div', { class: 'calls-pill' }, sym('group', 24), input, dial),
      results,
    ),
    h(
      'div',
      { class: 'calls-empty' },
      h('div', { class: 'calls-art', 'aria-hidden': 'true' }, art()),
      h('h1', { class: 'calls-h' }, 'Connect with someone who knows the work'),
      h(
        'p',
        { class: 'calls-s' },
        'A reference beats a claim. Search above, or take the interview that is already waiting on the Meetings tab.',
      ),
      h(
        'button',
        { class: 'm-btn m-tonal m-new', type: 'button', onclick: () => o.onOpenReferral() },
        sym('person_add', 20),
        h('span', { class: 'm-new-label' }, 'The referral note'),
      ),
    ),
  );
}

/**
 * Meet ships a drawn illustration here. This draws its own: three call tiles,
 * one of them connected. Same idea, none of their artwork.
 */
function art(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 348 152');
  svg.setAttribute('width', '348');
  svg.setAttribute('height', '152');
  const tiles: [number, number, string][] = [
    [8, 26, '#e9eef6'],
    [124, 12, '#c2e7ff'],
    [240, 26, '#e9eef6'],
  ];
  for (const [x, y, fill] of tiles) {
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', String(x)); r.setAttribute('y', String(y));
    r.setAttribute('width', '100'); r.setAttribute('height', '114');
    r.setAttribute('rx', '16'); r.setAttribute('fill', fill);
    // Same hairline as the empty-day drawing, so the two read as one hand.
    // The tiles are drawn larger than the desk scene, so they take a slightly
    // heavier line to look like the same weight on screen.
    r.setAttribute('stroke', '#3c4043'); r.setAttribute('stroke-width', '1');
    svg.appendChild(r);
    const head = document.createElementNS(ns, 'circle');
    head.setAttribute('cx', String(x + 50)); head.setAttribute('cy', String(y + 46));
    head.setAttribute('r', '20');
    head.setAttribute('fill', fill === '#c2e7ff' ? '#0b57d0' : '#c4c7c5');
    svg.appendChild(head);
    const body = document.createElementNS(ns, 'rect');
    body.setAttribute('x', String(x + 22)); body.setAttribute('y', String(y + 74));
    body.setAttribute('width', '56'); body.setAttribute('height', '10');
    body.setAttribute('rx', '5');
    body.setAttribute('fill', fill === '#c2e7ff' ? '#0b57d0' : '#c4c7c5');
    svg.appendChild(body);
  }
  return svg;
}
