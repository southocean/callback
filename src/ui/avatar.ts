// The visitor's avatar and the visitor's name, in one place.
//
// Nam: "the avatar is all over the place! In home screen, the avatar is a green G
// by default, but then if you get admin right then its A with more like orange
// avatar. Here in the greenroom the avatar is A with green background, but then on
// the call its NN with green avatar. I think this is a big problem of
// inconsistency ... We need to fix the avatar such that we get avatar from the
// same place, so any changes to the avatar gets populated to all the right places,
// not that we have to go and change the avatar one by one and potentially miss
// one."
//
// He is describing the fault correctly and also the reason for it: there was no
// single answer to "who is looking at this", so three screens each invented one.
// The green room said A on green because it copied the home screen's letter and
// not its state class; the call said NN because it borrowed the CV subject's
// initials for a tile that is not him.
//
// SO THIS MODULE IS THE ONLY PLACE EITHER ANSWER LIVES. Every screen that draws
// the visitor asks here, and a change to the letters or the name reaches all of
// them at once. That is the whole point of it -- there is nothing clever in this
// file and there should not be.

import { h } from '../dom.js';
import { isAdmin } from '../prefs.js';
import { onAdminGranted } from './admingate.js';

/**
 * WHAT THE VISITOR IS CALLED. Nam: "This is their google meet and they will have
 * a meeting with me, so the name there should be You instead of Nam Nguyen ... I
 * dont want to write the name Recruiter cause I may send this to people who are
 * not recruiter, so we can settle for the name You."
 *
 * Which is the right answer for a second reason he then gives: it fixes who the
 * two people in the call are. "You" are in the tile and Nam is the name attached
 * to the hand that moves. Before this, both tiles were labelled Nam Nguyen and
 * the visitor was nowhere on their own screen.
 */
export const VISITOR_NAME = 'You';

/**
 * TWO LETTERS, NOT ONE, and GG rather than G.
 *
 * One letter reads as somebody's initial, which invites the question of whose --
 * and the answer is nobody's, because this is the person holding the phone. Two
 * reads as a label. AD once the gate is open, on the same logic.
 */
export function visitorInitials(): string {
  return isAdmin() ? 'AD' : 'GG';
}

/**
 * The letters as an element, kept current if the gate opens while it is on
 * screen. Every caller gets that for free rather than remembering to wire it.
 */
export function visitorAvatar(): HTMLElement {
  const span = h('span', {}, visitorInitials());
  onAdminGranted(() => { span.textContent = visitorInitials(); });
  return span;
}

/**
 * The avatar as a control.
 *
 * It opens the spec panel on every screen that has one -- Nam, about the green
 * room: "if you click this avatar, we open up the how this is built screen in a
 * popup screen just like if we were to click it in the home screen." Same control,
 * same reward, so the caller supplies only what to do rather than what it is.
 */
export function visitorAvatarButton(onclick: () => void): HTMLButtonElement {
  const label = (): string => (isAdmin() ? 'How this was built. Admin unlocked.' : 'How this was built');
  const btn = h(
    'button',
    {
      class: isAdmin() ? 'avatar-btn is-admin' : 'avatar-btn',
      type: 'button',
      'aria-label': label(),
      onclick,
    },
    visitorAvatar(),
  ) as HTMLButtonElement;
  onAdminGranted(() => {
    btn.classList.add('is-admin');
    btn.setAttribute('aria-label', label());
  });
  return btn;
}
