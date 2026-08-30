// The dialog that asks the wrong question on purpose.
//
// Fetched on the eleventh press and never before, so the question bank and every
// roast stay out of the initial payload. See the note at the top of admingate.ts
// for what that split cost when it was not there.

import { h } from '../dom.js';
import { trapFocus } from '../a11y.js';
import { grantAdmin, solvedGate, solveGate } from '../prefs.js';
import {
  wrongRoasts, rightLines, passedLines, grantedLines, alreadyAdminLines,
  judge, pick, normalise, remaining, score, shuffled, KIND_LABEL,
  ADMIN_PASS_MARK, ADMIN_PASSWORD,
} from '../data/admin.js';

const ID = 'admin-gate';

/**
 * How long a press on the backdrop is ignored after the box opens -- N172.
 *
 * Nam, QA: "by the 11th click, the admin gate appears, but then immediately
 * closes because I would misclick one more time and it registers as closing the
 * admin gate. So you need to ignore further clicking on the background for a
 * short while after the admin gate opens, so we tolerate some overclicking."
 *
 * The gesture causes this and nothing else in the build can hit it: eleven
 * presses is a RHYTHM, and a rhythm does not stop on the beat it succeeded on.
 * The hand is already going for the twelfth when the eleventh opens the box, and
 * the backdrop is directly under the help button, so the leftover press lands on
 * the one target that means dismiss.
 *
 * 700ms because that is about four presses at the rate people actually click a
 * button they are counting, and because it costs a deliberate dismissal nothing:
 * closing this box means reading it first. Escape and the close button are not
 * gated at all, since neither can be a leftover.
 */
const MISCLICK_GRACE = 700;

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

  /*
   * TWO DOORS NOW, AND THE BOX ONLY ADMITS TO ONE -- board ticket N175.
   *
   * The password is still the short way in and the dialog still never names it.
   * What is new is that the questions are no longer a dead end: thirty correct
   * out of forty opens the same door, for the reader who will never be told what
   * `konami` is. See data/admin.ts for why thirty of forty rather than all of
   * them.
   *
   * The queue is built once, here, from what has already been banked. Shuffling
   * the opening order matters more than it looks: without it every visitor meets
   * the same first question forever, and the second door starts to feel like a
   * fixed script rather than a bank.
   */
  const solved = solvedGate();
  let queue = remaining(solved).slice();
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j]!, queue[i]!];
  }

  let mark = score(solved);
  let attempts = 0;

  const prompt = h('p', { class: 'ag-q' }, '');
  const kind = h('span', { class: 'ag-kind' }, '');
  const input = h('input', {
    class: 'ag-input', type: 'text', autocomplete: 'off', spellcheck: 'false',
    'aria-label': 'Answer', placeholder: 'Answer',
  }) as HTMLInputElement;

  /* aria-live so the roast is spoken, not just drawn. The whole payload of this
     dialog is its copy, and a screen reader that announces the question and then
     goes silent on the answer has been handed the setup without the joke. */
  const say = h('p', { class: 'ag-say', role: 'status', 'aria-live': 'polite' });

  /*
   * THE PROGRESS BAR IS THE HONEST PART OF A DISHONEST DIALOG.
   *
   * Everything above it is dressed as a password prompt that is lying about what
   * it wants. This is the one element that states a real rule and keeps it: this
   * many, that many, and the door opens. Without it the grind is unsignposted
   * and nobody would start, which is the whole reason the second door exists.
   *
   * It is a count and not a percentage. "12 of 30" tells you what to do next;
   * "40%" tells you how you are being measured, and the first is the useful one
   * when the units are questions you have to sit and answer.
   */
  const barFill = h('i', { class: 'ag-fill' }) as HTMLElement;
  const barCount = h('span', { class: 'ag-count' }, '');
  const bar = h(
    'div',
    {
      class: 'ag-prog',
      role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(ADMIN_PASS_MARK),
      'aria-label': 'Questions answered correctly',
    },
    h('span', { class: 'ag-prog-head' },
      h('span', { class: 'ag-prog-t' }, `Answer ${ADMIN_PASS_MARK} correctly to unlock`),
      barCount),
    h('span', { class: 'ag-track' }, barFill),
  ) as HTMLElement;

  /*
   * SHUFFLE MOVES THE QUESTION, IT DOES NOT REPLACE IT.
   *
   * Nam: "I want a button to shuffle which will get you a different question in
   * the list of unanswered questions, this is to prevent users from stalling in
   * this trivial quiz ... we put the skipped question to the end of the list, so
   * its unlikely to reoccur."
   *
   * Disabled with one question left, because rotating a queue of one hands back
   * the same question and a button that visibly does nothing is worse than a
   * button that says it cannot.
   */
  const skip = h('button', {
    class: 'ag-skip', type: 'button',
    onclick: () => { queue = shuffled(queue); ask(); input.focus(); },
  }, 'Shuffle') as HTMLButtonElement;

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
    h('div', { class: 'ag-tools' }, skip),
    say,
    bar,
    h('button', { class: 'ag-close', type: 'button', 'aria-label': 'Close', onclick: () => close() }, '×'),
  );

  const back = h('div', { class: 'ag-back', id: ID }, panel);
  const openedAt = Date.now();
  back.addEventListener('mousedown', (e) => {
    if (e.target !== back) return;
    if (Date.now() - openedAt < MISCLICK_GRACE) return;
    close();
  });
  document.body.appendChild(back);

  ask();
  paint();

  const release = trapFocus(panel, () => close());
  input.focus();

  function close(): void {
    release();
    back.remove();
  }

  /** Draw the head of the queue, or the state where there is nothing left. */
  function ask(): void {
    const c = queue[0];
    if (!c) {
      /*
       * THE BANK IS EMPTY AND THE MARK WAS NOT REACHED, which is reachable: get
       * ten wrong and never come back to them and there is nothing left to ask.
       * It says so rather than showing a blank question, and the field stays
       * live because the password still works from here. That is the point of
       * testing it first and unconditionally in judge().
       */
      prompt.textContent = 'That is every question in the bank. The other way in is still open.';
      kind.textContent = '';
      skip.disabled = true;
      return;
    }
    prompt.textContent = c.q;
    kind.textContent = KIND_LABEL[c.kind];
    skip.disabled = queue.length < 2;
  }

  function paint(): void {
    const pct = Math.min(100, Math.round((mark.got / mark.need) * 100));
    barFill.style.width = `${pct}%`;
    barCount.textContent = `${mark.got} of ${mark.need}`;
    bar.setAttribute('aria-valuenow', String(Math.min(mark.got, mark.need)));
  }

  function open(line: string): void {
    grantAdmin();
    granted();
    say.className = 'ag-say is-granted';
    say.textContent = line;
    input.disabled = true;
    skip.disabled = true;
    // Long enough to read the line and notice the avatar change behind it.
    window.setTimeout(() => close(), 2600);
  }

  function submit(): void {
    const v = input.value;
    if (!v.trim()) return;
    attempts += 1;

    const c = queue[0];
    /*
     * With the bank exhausted there is no challenge to judge against, so the
     * password is tested on its own. Anything else here is simply wrong, and
     * says so without a question to attach the roast to.
     */
    if (!c) {
      if (normalise(v) === ADMIN_PASSWORD) { open(pick(grantedLines, attempts)); return; }
      say.className = 'ag-say is-wrong';
      say.textContent = pick(wrongRoasts, attempts);
      input.value = '';
      input.focus();
      return;
    }

    const verdict = judge(c, v);

    if (verdict === 'password') { open(pick(grantedLines, attempts)); return; }

    if (verdict === 'wrong') {
      /* THE QUESTION STAYS. Rerolling on a miss would read as the dialog dodging
         -- the argument that was already here before the bank existed -- and now
         it would also be a free skip, which is what Shuffle is for and what it
         costs a place in the queue to do. */
      say.className = 'ag-say is-wrong';
      say.textContent = pick(wrongRoasts, attempts);
      input.value = '';
      input.focus();
      return;
    }

    // Right, and it counts. Banked first, so a crash between here and the next
    // line cannot lose it.
    const solvedNow = solveGate(c.id);
    mark = score(solvedNow);
    queue = queue.slice(1);
    paint();

    if (mark.passed) { open(pick(passedLines, attempts)); return; }

    say.className = 'ag-say is-right';
    say.textContent = pick(rightLines, mark.got - 1);
    ask();
    input.value = '';
    input.focus();
  }
}
