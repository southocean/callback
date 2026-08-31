// The case. Board ticket N59, rebuilt after Nam's review of the first one.
//
// He asked for it in the first place from a photograph of a real entomology
// drawer: "it opens up to like a bug frame like in this photo, with the missing
// bugs only showing silhouette. Click on the bug will open up a bug panel that
// details the image, name and a short description of the bug, where it is and
// how to find it."
//
// And then, seeing it: "Please make sure this collection fully follows the
// design principles of google meet. The colors, the hovering and click effects,
// the label popup ... I want this collection frame to be BEAUTIFUL, and in the
// same design language as google meet."
//
// WHAT THAT COST, AND WHAT IT DID NOT. The varnished wood went. It was the most
// literal reading of the photograph and the least defensible thing on screen:
// nothing else in this build has a texture, and a browser chrome pretending to
// be furniture is the one note that would have read as a different product. So
// the frame is now a Material 3 dialog, in the palette the rest of the page is
// measured against, and every state layer, radius and type ramp comes off the
// same spec as the call.
//
// What survived is the part that was never about wood: a grid of specimens with
// a label under each, an outline where one is missing, and a card beside it that
// tells you what you are looking at. That is the drawer. The rest was varnish.
//
// Three of Nam's notes were specific and all three are load-bearing:
//
//   THE PIN HEADS ARE GONE. "Whats the 3D dot on top of the bugs? Remove them."
//   They were a radial-gradient bevel, which is the one shading trick Material
//   never uses, and at 7px they read as dirt on the screen rather than as brass.
//
//   THE LAYOUT NO LONGER JUMPS. "when I click on the Gilded Scarab, because it
//   has a description longer than the default one, the collection frame becomes
//   bigger to accommodate for the text, creating a jumping height." The case is
//   a fixed height now, sized for the longest entry, so selecting a specimen
//   changes the words and nothing else. A dialog that resizes under the pointer
//   is a dialog you have to re-aim at.
//
//   THE HEADER IS SYMMETRIC. "the top bar, the title and the 1 of 12 and the
//   close button not having equal padding top vs bottom." It did not; it does.

import { h, clear } from '../dom.js';
import { sym } from './icons.js';
import { tip } from './tooltip.js';
import { bugArt } from './bugart.js';
import { RARITY_LABEL } from '../data/bugs.js';
import type { Bugs, Bug } from '../bugs.js';

/**
 * The detail card.
 *
 * One element, rewritten, rather than twelve built up front: twelve drawings
 * nobody asked to see is the expensive half of this screen, and the case is
 * already carrying twelve.
 */
function detail(host: HTMLElement, bug: Bug, got: boolean): void {
  clear(host);
  host.append(
    h('div', { class: 'bug-plate' }, bugArt(bug, { size: 118, silhouette: !got })),
    h('div', { class: 'bug-dt-head' },
      h('h3', { class: 'bug-dt-name' }, got ? bug.name : 'Not caught yet'),
      /*
       * RARITY IS SHOWN EITHER WAY, and that is the point of it. Nam asked for
       * it so the collection says which ones are meant to be hard, and a tier
       * that only appeared after you had already found the thing would be
       * telling you something you no longer need. On an empty slot it is a
       * promise about how much work the hint below is doing.
       */
      h('span', { class: `bug-rar is-${bug.rarity}` }, RARITY_LABEL[bug.rarity])),
    h('p', { class: 'bug-dt-sp' }, got ? bug.species : 'Species unknown until you find it.'),
    /*
     * The hint becomes the location once it is caught. Both answer "where", so
     * they share a row rather than stacking, and a collector rereading their own
     * drawer gets the answer instead of the riddle they already solved.
     */
    h('p', { class: 'bug-dt-where' }, h('b', {}, got ? 'Found in: ' : 'Where: '), got ? bug.where : bug.hint),
    got
      ? h('p', { class: 'bug-dt-fact' }, bug.fact)
      : h('p', { class: 'bug-dt-fact is-locked' }, 'Catch it and this says something true about the animal.'),
  );
}

/**
 * RESERVE THE TALLEST CARD, so choosing a bug cannot move the panel.
 *
 * Nam: "please pad the screen such that when I click different bugs we dont see
 * the panel height flickering - different bugs have different length in their
 * hint and description, making the bug panel height jumping when updating."
 *
 * Below 760 the case is stacked and both rows size to their contents (N232), so
 * the card's height IS the dialog's height and every hint of a different length
 * moves everything. Twelve bugs, twelve hints, twelve heights.
 *
 * MEASURED RATHER THAN GUESSED AT. A min-height in the stylesheet would be a
 * number that is right until somebody edits a hint, and wrong silently: the
 * panel would either jump again or carry dead space nobody could account for.
 * This asks the twelve cards how tall they actually are and reserves the largest.
 *
 * THE TWELVE ARE TRANSIENT, which is what keeps this consistent with the note on
 * detail() above. That note objects to twelve drawings LIVING in the document,
 * and it is right; this builds them into one detached probe, reads a height off
 * each, and drops the lot before the dialog is interactive. Nothing is kept.
 *
 * Once, at open, at the width it opened at. A rotation with the case already up
 * keeps the reservation it was born with -- the same trade the heatmap makes,
 * and in the same direction: the reserved height is the tallest card, so being
 * stale can leave spare room but cannot clip anything.
 */
function reserveCardHeight(pane: HTMLElement, all: readonly { bug: Bug; got: boolean }[]): void {
  // Only where the card decides the dialog's height. Above 760 the case has a
  // fixed height and the card scrolls inside it, so nothing can move.
  if (typeof matchMedia === 'function' && !matchMedia('(max-width: 760px)').matches) return;

  const probe = h('div', { class: 'bug-detail' }) as HTMLElement;
  probe.setAttribute('aria-hidden', 'true');
  // Off-screen rather than display:none, because a box that is not laid out has
  // no height to read. Fixed so it cannot extend the page while it is there.
  probe.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;'
    + 'pointer-events:none;height:auto;min-height:0;overflow:visible';
  probe.style.width = `${pane.getBoundingClientRect().width}px`;
  document.body.appendChild(probe);

  let tallest = 0;
  for (const { bug, got } of all) {
    detail(probe, bug, got);
    tallest = Math.max(tallest, probe.getBoundingClientRect().height);
  }
  probe.remove();

  if (tallest > 0) pane.style.minHeight = `${Math.ceil(tallest)}px`;
}

/**
 * The whole case, as a Material dialog.
 *
 * A dialog rather than a screen, because both places it opens from are places
 * somebody is about to do something else: the ended screen, where they are
 * deciding whether to go back in, and the rail, where they are mid-browse.
 * Routing to it would put a Back button between them and that decision.
 */
export function openBugFrame(catcher: Bugs): void {
  const existing = document.getElementById('bugframe');
  if (existing) { existing.remove(); return; }

  const all = catcher.all();
  const { got, total } = catcher.count();

  const pane = h('div', { class: 'bug-detail' }) as HTMLElement;
  const grid = h('div', { class: 'bug-grid', role: 'list' }) as HTMLElement;

  let chosen: HTMLElement | null = null;
  const choose = (slot: HTMLElement, bug: Bug, have: boolean): void => {
    chosen?.classList.remove('is-on');
    chosen?.setAttribute('aria-pressed', 'false');
    chosen = slot;
    slot.classList.add('is-on');
    slot.setAttribute('aria-pressed', 'true');
    detail(pane, bug, have);
  };

  for (const { bug, got: have } of all) {
    const slot = h(
      'button',
      {
        class: have ? 'bug-slot' : 'bug-slot is-empty',
        type: 'button',
        role: 'listitem',
        'aria-pressed': 'false',
        'aria-label': have ? `${bug.name}, ${RARITY_LABEL[bug.rarity]}` : `Not caught. ${RARITY_LABEL[bug.rarity]}.`,
      },
      h('span', { class: 'bug-slot-art' }, bugArt(bug, { size: 76, silhouette: !have })),
      h('span', { class: 'bug-slot-name' }, have ? bug.name : '?'),
    ) as HTMLElement;
    /*
     * Meet's own tooltip, not a title attribute. Nam listed "the label popup"
     * among the things that had to match, and the platform's tooltip is the
     * wrong shape, the wrong delay and the wrong colour in one go.
     */
    tip(slot, have ? `${bug.name} · ${RARITY_LABEL[bug.rarity]}` : `Not caught · ${RARITY_LABEL[bug.rarity]}`);
    slot.addEventListener('click', () => choose(slot, bug, have));
    grid.appendChild(slot);
  }

  /*
   * THE CASE OPENS ON YOUR LAST CATCH, not on the first empty slot.
   *
   * Nam: "if there is one bug found, we should put the focus on that bug,
   * instead of putting it on the very first bug that is not found. If there are
   * multiple bugs found, we put the selection on the latest found bug."
   *
   * The old rule was "the first one, because any other pick would be a
   * recommendation", which was right while the case was empty and wrong the
   * moment it was not. Opening a collection you have started onto a silhouette
   * shows you the one thing you have not done; opening it onto your most recent
   * catch shows you the thing you just did. The first is a chore list and the
   * second is a trophy case, and this is a trophy case.
   *
   * An empty case still opens on slot one, where every slot says the same thing.
   */
  const latest = catcher.latest();
  const at = latest ? all.findIndex((a) => a.bug.id === latest) : -1;
  const pick = at >= 0 ? at : 0;
  const opening = all[pick];
  const openingSlot = grid.children[pick] as HTMLElement | undefined;
  if (opening && openingSlot) {
    choose(openingSlot, opening.bug, opening.got);
    // The grid scrolls once the case is fuller than its frame, and a selected
    // slot below the fold reads as nothing being selected at all.
    openingSlot.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  const close = (): void => { box.remove(); };
  const shut = h('button', {
    class: 'bug-x', type: 'button', 'aria-label': 'Close',
  }, sym('close', 20)) as HTMLButtonElement;
  tip(shut, 'Close');

  const box = h(
    'div',
    { class: 'bug-scrim', id: 'bugframe', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'The bug collection' },
    h(
      'div',
      // Focusable so the dialog itself can take focus on open. Focusing the
      // close button instead put a ring on it at rest, which reads as "this is
      // the thing to press" on a screen whose point is the grid.
      { class: 'bug-dlg', tabindex: '-1' },
      h(
        'div',
        { class: 'bug-top' },
        h('h2', { class: 'bug-title' }, 'The collection'),
        h('span', { class: 'bug-tally' }, `${got} of ${total}`),
        shut,
      ),
      h('div', { class: 'bug-case' }, grid, pane),
    ),
  ) as HTMLElement;

  shut.addEventListener('click', close);
  // The scrim closes it; the dialog does not, so a mis-click inside the case
  // never costs the visitor the case.
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  box.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Escape') close(); });

  document.body.appendChild(box);
  // After the mount: the probe copies the pane's width, and the pane has none
  // until it is in the document.
  reserveCardHeight(pane, all);
  box.querySelector<HTMLElement>('.bug-dlg')?.focus();
}
