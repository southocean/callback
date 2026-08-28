// The dialog that asks the wrong question on purpose.
//
// Fetched on the eleventh press and never before, so the question bank and every
// roast stay out of the initial payload. See the note at the top of admingate.ts
// for what that split cost when it was not there.

import { h } from '../dom.js';
import { trapFocus } from '../a11y.js';
import { grantAdmin } from '../prefs.js';
import {
  challenges, wrongRoasts, rightRoasts, grantedLines, alreadyAdminLines,
  judge, pick, KIND_LABEL, type Challenge,
} from '../data/admin.js';

const ID = 'admin-gate';

/** A short line under the top bar, for the state that does not deserve a dialog. */
export function alreadyToast(i: number): void {
  const t = h('div', { class: 'admin-toast', role: 'status' }, pick(alreadyAdminLines, i));
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
 * which is the joke, so the chrome has to be straight-faced: a lock, a single
 * field, an Unlock button. The moment it winks the turn is gone.
 *
 * ONE FIELD for both the decoy answer and the real password, because two fields
 * would give the game away before the reader has typed anything.
 */
export function openGate(granted: () => void): void {
  if (gateOpen()) return;

  let challenge: Challenge = pick(challenges, Math.floor(Math.random() * challenges.length));
  let attempts = 0;

  const prompt = h('p', { class: 'ag-q' }, challenge.q);
  const kind = h('span', { class: 'ag-kind' }, KIND_LABEL[challenge.kind]);
  const input = h('input', {
    class: 'ag-input', type: 'text', autocomplete: 'off', spellcheck: 'false',
    'aria-label': 'Answer', placeholder: 'Answer',
  }) as HTMLInputElement;

  /* aria-live so the roast is spoken, not just drawn. The whole payload of this
     dialog is its copy, and a screen reader that announces the question and then
     goes silent on the answer has been handed the setup without the joke. */
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
    attempts += 1;

    if (judge(challenge, v) === 'password') {
      grantAdmin();
      granted();
      say.className = 'ag-say is-granted';
      say.textContent = pick(grantedLines, attempts);
      input.disabled = true;
      // Long enough to read the line and notice the avatar change behind it.
      window.setTimeout(() => close(), 2600);
      return;
    }

    const right = judge(challenge, v) === 'right';
    say.className = right ? 'ag-say is-right' : 'ag-say is-wrong';
    say.textContent = right ? pick(rightRoasts, attempts) : pick(wrongRoasts, attempts);

    /* A NEW QUESTION ONLY AFTER A CORRECT ONE. Rerolling on a wrong answer would
       read as the dialog dodging, and would also leave the roast attached to a
       question no longer on screen. Rerolling after a right one keeps the decoy
       plausible: the box acts like it is still trying to let you in. */
    if (right) {
      challenge = pick(challenges, Math.floor(Math.random() * challenges.length));
      prompt.textContent = challenge.q;
      kind.textContent = KIND_LABEL[challenge.kind];
    }

    input.value = '';
    input.focus();
  }
}
