// The gesture, the falling numbers and the dialog that lies to you.
//
// Board ticket N60. The content, and the reasoning behind the decoy, are in
// data/admin.ts; this file is only the behaviour. Nam: "man Im having way too
// much fun with this lol", which is the actual specification.
//
// THE COUNTER IS DELIBERATELY FORGIVING. It has no timeout, so a reader who
// clicks four times, reads the number, wanders off and comes back to click the
// rest still gets in. A cheat code that punishes hesitation is a cheat code
// nobody completes, and there is nothing behind this worth defending with a
// stopwatch.
//
// It does reset once the dialog opens, so closing the box and pressing the
// avatar again means starting the eleven over. That is the one place strictness
// reads as intent rather than as a bug: the box is the reward for the gesture,
// so it should cost the gesture every time.

import { h } from '../dom.js';
import { trapFocus } from '../a11y.js';
import { isAdmin, grantAdmin } from '../prefs.js';
import {
  challenges, wrongRoasts, rightRoasts, grantedLines, alreadyAdminLines,
  judge, pick, ADMIN_CLICKS, ADMIN_HINT_FROM, KIND_LABEL,
  type Challenge,
} from '../data/admin.js';

const ID = 'admin-gate';

let clicks = 0;
/** Told to whoever is showing the avatar, so the G can become an A. */
let onGrant: (() => void) | null = null;

export function onAdminGranted(fn: () => void): void {
  onGrant = fn;
}

/**
 * A number, falling out of the point that was pressed.
 *
 * Positioned against the viewport rather than the button, because the avatar
 * sits in a top bar with its own stacking and overflow, and a child of the
 * button gets clipped by it. A fixed element parented to <body> has neither
 * problem and costs one node that removes itself.
 *
 * It counts UP rather than down. A countdown would announce that there is a
 * target and how far away it is, which turns a discovery into a progress bar.
 * Counting up says only that something is being tallied, and leaves the reader
 * to decide whether to keep going.
 */
function fallingNumber(n: number, x: number, y: number): void {
  const el = h('span', { class: 'admin-drop', 'aria-hidden': 'true' }, String(n));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  // Belt and braces: if the animation never runs (reduced motion, a background
  // tab) the node still goes, rather than stacking up one per click forever.
  window.setTimeout(() => el.remove(), 2000);
}

/**
 * Press the avatar. Returns nothing and owns the whole gesture, so the home
 * screen's wiring stays a one-liner.
 */
export function avatarPressed(e: MouseEvent, el: HTMLElement): void {
  if (isAdmin()) {
    toast(pick(alreadyAdminLines, clicks));
    clicks += 1;
    return;
  }

  clicks += 1;

  if (clicks >= ADMIN_HINT_FROM) {
    // The pointer position when there is one, and the button's own centre when
    // there is not: a keyboard activation reports 0,0, and a number falling out
    // of the top left corner of the screen is a bug with a nice animation on it.
    const r = el.getBoundingClientRect();
    const x = e.clientX || r.left + r.width / 2;
    const y = e.clientY || r.top + r.height / 2;
    fallingNumber(clicks, x, y);
  }

  if (clicks >= ADMIN_CLICKS) {
    clicks = 0;
    openGate();
  }
}

/** A short line under the top bar, for the states that do not deserve a dialog. */
function toast(text: string): void {
  const t = h('div', { class: 'admin-toast', role: 'status' }, text);
  document.body.appendChild(t);
  window.setTimeout(() => t.remove(), 3200);
}

export function gateOpen(): boolean {
  return !!document.getElementById(ID);
}

/**
 * THE DIALOG.
 *
 * It is dressed as a password prompt and asks a general knowledge question,
 * which is the joke, so the chrome has to be straight-faced: a lock icon, a
 * single field, a Unlock button. The moment it winks the turn is gone.
 *
 * One field for both the decoy answer and the real password, because two fields
 * would give the game away before the reader has typed anything.
 */
export function openGate(): void {
  if (gateOpen()) return;

  let challenge: Challenge = pick(challenges, Math.floor(Math.random() * challenges.length));
  let attempts = 0;

  const prompt = h('p', { class: 'ag-q' }, challenge.q);
  const kind = h('span', { class: 'ag-kind' }, KIND_LABEL[challenge.kind]);
  const input = h('input', {
    class: 'ag-input', type: 'text', autocomplete: 'off', spellcheck: 'false',
    'aria-label': 'Answer', placeholder: 'Answer',
  }) as HTMLInputElement;

  /* aria-live so the roast is read out, not just drawn. The whole payload of
     this dialog is its copy, and a screen reader that announces the question and
     then goes silent on the answer has been handed the setup without the joke. */
  const say = h('p', { class: 'ag-say', role: 'status', 'aria-live': 'polite' });

  const panel = h('div', { class: 'ag-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Restricted' },
    h('div', { class: 'ag-head' },
      h('span', { class: 'ag-lock', 'aria-hidden': 'true' }, '\u{1F512}'),
      h('h2', { class: 'ag-title' }, 'Restricted'),
      kind),
    h('p', { class: 'ag-lead' }, 'This area is for the maintainer. Answer to continue.'),
    prompt,
    h('form', { class: 'ag-form', onsubmit: (e: Event) => { e.preventDefault(); submit(); } },
      input,
      h('button', { class: 'ag-go', type: 'submit' }, 'Unlock')),
    say,
    h('button', { class: 'ag-close', type: 'button', 'aria-label': 'Close', onclick: () => close() }, '×'),
  );

  const back = h('div', { class: 'ag-back', id: ID }, panel);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.body.appendChild(back);

  const release = trapFocus(panel, () => close());
  input.focus();

  function close(): void {
    release();
    back.remove();
  }

  function submit(): void {
    const v = input.value;
    if (!v.trim()) return;
    const verdict = judge(challenge, v);
    attempts += 1;

    if (verdict === 'password') {
      grantAdmin();
      onGrant?.();
      panel.classList.add('is-open');
      say.className = 'ag-say is-granted';
      say.textContent = pick(grantedLines, attempts);
      input.disabled = true;
      // Long enough to read the line and notice the avatar change behind it.
      window.setTimeout(() => close(), 2600);
      return;
    }

    say.className = verdict === 'right' ? 'ag-say is-right' : 'ag-say is-wrong';
    say.textContent = verdict === 'right'
      ? pick(rightRoasts, attempts)
      : pick(wrongRoasts, attempts);

    /* A NEW QUESTION ONLY AFTER A CORRECT ONE. Rerolling on a wrong answer would
       read as the dialog dodging, and it would also make the roast about a
       question no longer on screen. Rerolling after a right one keeps the decoy
       plausible: the box acts like it is still trying to let you in. */
    if (verdict === 'right') {
      challenge = pick(challenges, Math.floor(Math.random() * challenges.length));
      prompt.textContent = challenge.q;
      kind.textContent = KIND_LABEL[challenge.kind];
    }

    input.value = '';
    input.focus();
  }
}
