// The dialog that asks the wrong question on purpose.
//
// Fetched on the eleventh press and never before, so the question bank and every
// roast stay out of the initial payload. See the note at the top of admingate.ts
// for what that split cost when it was not there.

import { h } from '../dom.js';
import { trapFocus } from '../a11y.js';
import { sym } from './icons.js';
import { tip } from './tooltip.js';
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
/**
 * The shuffle glyph, authored.
 *
 * The icon font here is a 7 kB subset of exactly the symbols this build uses and
 * there is no shuffle in it. Adding one means regenerating the subset for a
 * single control, so the path is drawn instead -- which is the rule the spec
 * already states for this case ("where the subset lacks a glyph, the path is
 * authored and said to be authored") rather than an exception made for it.
 *
 * It is Material's own shuffle at 24: two arrows crossing. currentColor, so it
 * takes the button's colour in both palettes without knowing which it is in.
 */
function shuffleGlyph(): SVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute(
    'd',
    'M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5z'
    + 'm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
  );
  svg.appendChild(path);
  return svg;
}

export interface GateOpts {
  /** The palette to wear. Light on the home screen, dark inside a call. */
  mode?: 'light' | 'dark';
  /**
   * Fired once the box is gone, however it went -- granted, closed or escaped.
   *
   * Board ticket N192: the spec panel takes itself down before opening this and
   * puts itself back here, so it has to be told on the cancel path as well as
   * the grant path. Somebody who reads the box and closes it has not asked to
   * leave the spec.
   */
  onClosed?: () => void;
}

export function openGate(granted: () => void, opts: GateOpts = {}): void {
  if (gateOpen()) return;

  /*
   * TWO DOORS, AND THE BOX ONLY ADMITS TO ONE -- board ticket N175.
   *
   * The password is still the short way in and the dialog still never names it.
   * What is new is that the questions are no longer a dead end: twenty correct
   * out of forty opens the same door, for the reader who will never be told what
   * `konami` is. See data/admin.ts for why twenty of forty rather than all.
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
  let closed = false;

  const prompt = h('p', { class: 'ag-q' }, '');
  const kind = h('span', { class: 'ag-kind' }, '');
  /*
   * THE BUTTON IS BACK, AND IT IS MEET'S -- board ticket N199.
   *
   * N191 removed it on preference, and the note left behind said Meet would have
   * kept one because its own code field has a Join beside it. Nam read that and
   * reversed himself: "youre right, lets add the button back in, the button
   * would be answer, along the google design principles ... I think it comes
   * with a validator too, like if the answer field is empty, then they button is
   * not clickable. Once its filled up then you can click or Enter should work
   * too."
   *
   * That is exactly .composer-join two hundred lines up: a REAL filled button in
   * its disabled state -- a 12% black surface with a 30% black label, not ghost
   * text -- which goes blue the moment there is something to submit. Copying the
   * class's behaviour rather than the class itself, because that one is sized to
   * a 48px pill and this sits beside a 44px field.
   *
   * Enter still submits. It is a form and always did; the button is the visible
   * half of a rule the form already had.
   */
  /*
   * THE PLACEHOLDER IS WHERE "PASSWORD" LIVES NOW -- the tail of N208.
   *
   * It read "Your answer" from N199, which was right while the lead line said
   * "Put down a password or answer to unlock". N204 deleted that line and N208
   * took the phrase out of the title too, which left the word nowhere a reader
   * could see it -- and it is the one word that makes typing a cheat code a
   * plausible thing to do in this box. Without it the grind is the only door
   * anybody would ever find, which is a strange outcome for the door that came
   * second.
   *
   * The placeholder is the cheapest place to put it back: no row, no second
   * sentence, and it sits in the field at the moment somebody is deciding what
   * to type. It also matches the accessible name, which never stopped saying
   * both.
   */
  const input = h('input', {
    class: 'ag-input', type: 'text', autocomplete: 'off', spellcheck: 'false',
    'aria-label': 'Password or answer', placeholder: 'Password or answer',
  }) as HTMLInputElement;

  /*
   * THE TICK, WHICH IS HALF OF THE CELEBRATION -- board ticket N204.
   *
   * Nam: "when we get a wrong answer we get a very good feedback on the input
   * dialogue, the nudge and flash. But when we get a correct answer its very
   * anti climatic ... just a flash green, nothing like ta da."
   *
   * He is right and the asymmetry was structural rather than a matter of taste.
   * Wrong had two channels, MOVEMENT and colour; right had colour alone. One
   * channel against two reads as the dialog caring more about your mistakes than
   * your progress, which is the wrong lesson for the screen whose entire job is
   * to keep somebody answering twenty of these.
   *
   * So right gets its own movement -- a tick that lands, a field that swells,
   * and the count popping as it goes up -- and none of it is confetti, because
   * this is still a lock screen in a Google product.
   */
  const tick = h('span', { class: 'ag-tick', 'aria-hidden': 'true' }, sym('check', 18));
  const field = h('span', { class: 'ag-field' }, input, tick);

  const go = h('button', {
    class: 'ag-go', type: 'submit', 'aria-label': 'Answer',
  }, 'Answer') as HTMLButtonElement;

  /**
   * Live only when there is something to judge.
   *
   * aria-disabled rather than disabled, and the guard is in submit() as well: a
   * disabled button is skipped by the tab order, and a control that vanishes
   * from the keyboard path the moment the field is empty is a worse experience
   * than one that is present and inert. Meet's own Join does the same.
   */
  const validate = (): void => {
    const live = input.value.trim().length > 0;
    go.classList.toggle('live', live);
    go.setAttribute('aria-disabled', live ? 'false' : 'true');
  };
  input.addEventListener('input', validate);

  /* aria-live so the line is spoken, not just drawn. The verdict itself no
     longer depends on it -- the field flashes and shakes -- but a screen reader
     gets nothing from a flash, so this is the whole of the feedback there. */
  const say = h('p', { class: 'ag-say', role: 'status', 'aria-live': 'polite' });

  /*
   * THE PROGRESS BAR IS THE HONEST PART OF A DISHONEST DIALOG.
   *
   * Everything above it is dressed as a password prompt that is lying about what
   * it wants. This is the one element that states a real rule and keeps it: this
   * many, that many, and the door opens. Without it the grind is unsignposted
   * and nobody would start, which is the whole reason the second door exists.
   *
   * It is a count and not a percentage. "12 of 20" tells you what to do next;
   * "60%" tells you how you are being measured, and the first is the useful one
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
      /*
       * "to unlock" comes back with N208. It was dropped in N204 only because
       * the title had taken the phrase, and the title has given it back -- so
       * this is once again the only line in the dialog that states the rule.
       */
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
   * An icon button beside the question rather than a text button under the form,
   * which is N191 and is the more intuitive of the two: it is an action ON this
   * question, so it belongs next to it. It is a real .icon-btn, so it inherits
   * the state layer, the press and the focus ring every other control has, and
   * it carries a tooltip because a lone glyph has to say its own name.
   *
   * Disabled with one question left, because rotating a queue of one hands back
   * the same question and a control that visibly does nothing is worse than one
   * that says it cannot.
   */
  const skip = h('button', {
    class: 'icon-btn ag-shuffle', type: 'button', 'aria-label': 'Another question',
    onclick: () => { queue = shuffled(queue); ask(); input.focus(); },
  }, shuffleGlyph()) as HTMLButtonElement;
  tip(skip, undefined, 'above');

  const closeBtn = h('button', {
    class: 'icon-btn ag-close', type: 'button', 'aria-label': 'Close', onclick: () => close(),
  }, sym('close', 20));
  tip(closeBtn, undefined, 'above');

  /*
   * THE CHIP TRAVELS WITH THE QUESTION -- board ticket N199.
   *
   * It used to ride the header, opposite the title, which was right when the
   * dialog asked one question and the chip was describing the dialog. Since the
   * bank it describes THIS question and the next one may be a different kind, so
   * a label pinned to the top of the box is labelling the wrong thing. Nam:
   * "whatever is contextualizing the question should be close to the question."
   *
   * On its own line above rather than inline beside it, because the questions
   * run to fifty characters and a chip sharing that row would be squeezed
   * between the text and the shuffle control on every long one.
   */
  /*
   * THE LEAD LINE IS GONE AND THE TITLE IS SHORT AGAIN -- N204, then N208.
   *
   * N204 deleted the lead row, which was the right call: clunky here was six
   * stacked rows on four alignments, so the fix that helps is the one that
   * DELETES a row. It then moved the whole instruction into the title, and that
   * half did not survive contact. Nam: "Put a password or answer to unlock =>
   * lets put back to Restricted, and have a bigger title in font size."
   *
   * He is right that a heading is a name and not a sentence. A dialog titled
   * with its own instructions has stopped having a title, and at 17px -- shrunk
   * to make the sentence fit -- it had stopped looking like a heading too. One
   * word at 22px reads as the heading of something; six words at 17px read as
   * body copy that happens to be bold.
   *
   * WHAT WENT WITH IT is worth knowing: "password" no longer appears anywhere a
   * reader can see it. It survives in the field's accessible name and in the
   * progress line's promise that answers are not the only way in. That is a real
   * cost to the decoy -- it was the one word making a cheat code a plausible
   * thing to type here -- and it is the kind of cost that belongs in a note
   * rather than in an argument, because the lock glyph and a single text field
   * are themselves a password prompt to anybody who has seen one.
   */
  const panel = h('div', {
    class: 'ag-panel', role: 'dialog', 'aria-modal': 'true',
    'aria-label': 'Restricted',
  },
    h('div', { class: 'ag-head' },
      h('span', { class: 'ag-lock', 'aria-hidden': 'true' }, '\u{1F512}'),
      h('h2', { class: 'ag-title' }, 'Restricted')),
    h('div', { class: 'ag-ask' },
      kind,
      h('div', { class: 'ag-qrow' }, prompt, skip)),
    h('form', { class: 'ag-form', onsubmit: (e: Event) => { e.preventDefault(); submit(); } }, field, go),
    say,
    bar,
    closeBtn,
  );

  /*
   * THE PALETTE COMES FROM WHATEVER OPENED IT -- board ticket N191.
   *
   * It was hardcoded dark, which was right for as long as it had one door: the
   * gesture is on the home bar, and the box was written next to the call. Nam,
   * seeing it over the light spec panel: "Shouldnt it be on light mode instead?"
   *
   * Rather than pick one, it does what the spec panel already does -- one class
   * on the root, every rule below reading --dp-* custom properties. Light on the
   * home screen, dark inside a call, and nothing new invented for it.
   */
  const back = h('div', { class: `ag-back dp-${opts.mode ?? 'light'}`, id: ID }, panel);
  const openedAt = Date.now();
  back.addEventListener('mousedown', (e) => {
    if (e.target !== back) return;
    if (Date.now() - openedAt < MISCLICK_GRACE) return;
    close();
  });
  document.body.appendChild(back);

  ask();
  paint();
  validate();

  const release = trapFocus(panel, () => close());
  input.focus();

  function close(): void {
    if (closed) return;
    closed = true;
    release();
    back.remove();
    opts.onClosed?.();
  }

  /**
   * The verdict, on the field itself.
   *
   * Nam: "When your answer is wrong, I want the input to nudge with red flash",
   * and then the larger point: "if we have the result feedback on the input
   * panel itself ... then we may not even need to show these correct and
   * incorrect reads ... as I notice when my friend tested the CV, he doesnt read
   * all that text either - he didnt care."
   *
   * He is right that the text was carrying too much. It stays, cut to one line,
   * but it is no longer the only thing saying which way it went.
   *
   * The class is removed and re-added across a forced reflow, or a second wrong
   * answer in a row would not restart the animation and the field would sit
   * still on exactly the press that most needs an answer.
   */
  function flash(cls: 'is-bad' | 'is-good'): void {
    input.classList.remove('is-bad', 'is-good');
    field.classList.remove('is-good');
    void input.offsetWidth;
    input.classList.add(cls);
    // The tick lives on the wrapper, because it has to outlast nothing and be
    // positioned against the field rather than inside its text flow.
    if (cls === 'is-good') field.classList.add('is-good');
    window.setTimeout(() => {
      input.classList.remove(cls);
      field.classList.remove('is-good');
    }, 900);
  }

  /** The count popping as it goes up. The other half of the ta-da. */
  function cheer(): void {
    barCount.classList.remove('is-up');
    void barCount.offsetWidth;
    barCount.classList.add('is-up');
    window.setTimeout(() => barCount.classList.remove('is-up'), 600);
  }

  /** Draw the head of the queue, or the state where there is nothing left. */
  function ask(): void {
    const c = queue[0];
    if (!c) {
      /*
       * THE BANK IS EMPTY AND THE MARK WAS NOT REACHED, which is reachable: be
       * wrong about twenty and never come back to them and there is nothing left
       * to ask. It says so rather than showing a blank question, and the field
       * stays live because the password still works from here. That is the point
       * of testing it first and unconditionally in judge().
       */
      prompt.textContent = 'That is every question in the bank. The other way in is still open.';
      kind.textContent = '';
      kind.hidden = true;
      skip.disabled = true;
      return;
    }
    prompt.textContent = c.q;
    kind.textContent = KIND_LABEL[c.kind];
    kind.hidden = false;
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
    flash('is-good');
    say.className = 'ag-say is-granted';
    say.textContent = line;
    input.disabled = true;
    skip.disabled = true;
    go.classList.remove('live');
    go.setAttribute('aria-disabled', 'true');
    // Long enough to read the line and notice the avatar change behind it.
    window.setTimeout(() => close(), 2600);
  }

  function submit(): void {
    const v = input.value;
    // The guard the button is the visible half of. Enter reaches here too.
    if (!v.trim()) return;
    attempts += 1;

    const c = queue[0];
    /*
     * With the bank exhausted there is no challenge to judge against, so the
     * password is tested on its own. Anything else here is simply wrong, and
     * says so without a question to attach the line to.
     */
    if (!c) {
      if (normalise(v) === ADMIN_PASSWORD) { open(pick(grantedLines, attempts)); return; }
      flash('is-bad');
      say.className = 'ag-say is-wrong';
      say.textContent = pick(wrongRoasts, attempts);
      input.value = '';
      validate();
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
      flash('is-bad');
      say.className = 'ag-say is-wrong';
      say.textContent = pick(wrongRoasts, attempts);
      input.value = '';
      validate();
      input.focus();
      return;
    }

    // Right, and it counts. Banked first, so a crash between here and the next
    // line cannot lose it.
    const solvedNow = solveGate(c.id);
    mark = score(solvedNow);
    queue = queue.slice(1);
    paint();
    cheer();

    if (mark.passed) { open(pick(passedLines, attempts)); return; }

    flash('is-good');
    say.className = 'ag-say is-right';
    say.textContent = pick(rightLines, mark.got - 1);
    ask();
    input.value = '';
    validate();
    input.focus();
  }
}
