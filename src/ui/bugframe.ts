// The drawer. Board ticket N59.
//
// Nam sent a photograph of a real entomology case and asked for it: "it opens up
// to like a bug frame like in this photo, with the missing bugs only showing
// silhouette. Click on the bug will open up a bug panel that details the image,
// name and a short description of the bug, where it is and how to find it."
//
// Which is exactly the affordance a real drawer has. Specimens are pinned in
// rows with a label under each, you lean in on one, and the label is the whole
// interface. So this is a grid and a detail pane, and the only design decision
// worth defending is what an EMPTY slot shows.
//
// AN EMPTY SLOT IS NOT EMPTY. It has the right outline, at the right size, in
// the right place, and its hint is readable without catching it. Three reasons,
// and they are the same three every time this build has chosen to show its work:
// a grid of blank boxes tells you nothing about what you are missing; an outline
// tells you it is a butterfly and not a beetle, which is the part that makes you
// want it; and a collection nobody can finish is a list of things you failed at.
// What is withheld is the species, the colours and the fact, which is the reward
// rather than the invitation.

import { h, clear } from '../dom.js';
import { sym } from './icons.js';
import { bugArt } from './bugart.js';
import type { Bugs, Bug } from '../bugs.js';

/** The label under a specimen. A caught one is named; an empty one is not. */
const slotLabel = (bug: Bug, got: boolean): HTMLElement =>
  h('span', { class: 'bug-slot-name' }, got ? bug.name : '?');

/**
 * The detail pane.
 *
 * One element that is rewritten rather than one per bug: twelve panes built up
 * front is twelve drawings nobody asked for, and the frame is already the
 * expensive part of this screen.
 */
function detail(host: HTMLElement, bug: Bug, got: boolean): void {
  clear(host);
  host.append(
    h('div', { class: 'bug-plate' }, bugArt(bug, { size: 140, silhouette: !got })),
    h('h3', { class: 'bug-dt-name' }, got ? bug.name : 'Not caught yet'),
    h('p', { class: 'bug-dt-sp' }, got ? bug.species : 'Species unknown until you find it.'),
    /*
     * THE HINT IS ALWAYS UP, found or not. It is the only line that survives
     * catching, because a collector rereading their own drawer wants to know
     * where the thing was, and because a hint that vanishes on success cannot be
     * checked against what actually happened.
     */
    h('p', { class: 'bug-dt-hint' }, h('b', {}, 'Where: '), got ? bug.where : bug.hint),
    got
      ? h('p', { class: 'bug-dt-fact' }, bug.fact)
      : h('p', { class: 'bug-dt-fact is-locked' }, 'Catch it and this says something true about the animal.'),
  );
}

/**
 * The whole case, as an overlay.
 *
 * A dialog rather than a screen: it is reached from the ended screen, and the
 * ended screen is where somebody decides whether to go back in. Replacing it
 * with a route would put a back button between a visitor and the thing they
 * were about to do.
 */
export function openBugFrame(catcher: Bugs): void {
  if (document.getElementById('bugframe')) return;
  const all = catcher.all();
  const { got, total } = catcher.count();

  const pane = h('div', { class: 'bug-detail' }) as HTMLElement;
  const grid = h('div', { class: 'bug-grid' }) as HTMLElement;

  let chosen: HTMLElement | null = null;
  for (const { bug, got: have } of all) {
    const slot = h(
      'button',
      {
        class: have ? 'bug-slot' : 'bug-slot is-empty',
        type: 'button',
        'aria-label': have ? `${bug.name}, caught` : `Empty slot. ${bug.hint}`,
      },
      h('span', { class: 'bug-pin', 'aria-hidden': 'true' }),
      bugArt(bug, { size: 84, silhouette: !have }),
      slotLabel(bug, have),
    ) as HTMLElement;
    slot.addEventListener('click', () => {
      chosen?.classList.remove('is-on');
      chosen = slot;
      slot.classList.add('is-on');
      detail(pane, bug, have);
    });
    grid.appendChild(slot);
  }

  // Something has to be in the pane before anything is pressed, and the first
  // one is the honest choice: any other pick would be a recommendation.
  const first = all[0];
  if (first) detail(pane, first.bug, first.got);

  const close = (): void => { box.remove(); };
  const box = h(
    'div',
    { class: 'bug-frame-wrap', id: 'bugframe', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'The bug collection' },
    h(
      'div',
      { class: 'bug-frame' },
      h(
        'div',
        { class: 'bug-frame-top' },
        h('h2', {}, 'The collection'),
        h('span', { class: 'bug-tally' }, `${got} of ${total}`),
        h('button', { class: 'bug-x', type: 'button', 'aria-label': 'Close' }, sym('close', 20)),
      ),
      h('div', { class: 'bug-case' }, grid, pane),
    ),
  ) as HTMLElement;

  box.querySelector('.bug-x')?.addEventListener('click', close);
  // The backdrop closes it; the case itself does not, so a mis-click inside the
  // drawer never costs the visitor the drawer.
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  box.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Escape') close(); });

  document.body.appendChild(box);
  box.querySelector<HTMLElement>('.bug-x')?.focus();
}
