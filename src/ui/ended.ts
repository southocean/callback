// "You left the meeting" — Meet's post-call screen.
//
// Measured: white canvas, 36px/400 h1 in #3c4043, a 40px outlined "Rejoin" and a
// filled "Return to home screen", a text "Submit feedback", then the "Your
// meeting is safe" card. Same furniture, different contents -- and one card
// fewer than the original, since the referral card was removed.

import { h } from '../dom.js';
import { mailSubject } from '../data/companies.js';
import { sym } from './icons.js';
import type { Store } from '../state.js';
import { profile } from '../data/cv.js';
import type { Quests } from '../achievements.js';
import { loadInterview, clockMs } from '../prefs.js';
import { openPlain } from './plainoverlay.js';
import { runtimeMs } from '../data/tour.js';

export function renderEnded(store: Store, quests: Quests): HTMLElement {
  const address = `${profile.emailUser}@${profile.emailHost}`;
  const { got, total } = quests.count();
  /*
   * HOW LONG IT TOOK — board ticket N51.
   *
   * Read, not measured, here: the clock is kept by the conversation and written
   * to storage the moment it reaches its last line, so this screen can be arrived
   * at by any route — Rejoin, an easter egg, a reload — without the number
   * changing meaning. Null for anybody who has not heard the whole thing, and the
   * card is simply absent for them rather than showing a zero.
   */
  const run = loadInterview();

  /*
   * THE REFERRAL CARD IS GONE. Its copy button went first, then the card with
   * it. Nam: "please remove this referral code in the meeting end screen."
   *
   * It addressed a reader who had already agreed to refer him, on the screen
   * every other visitor also lands on -- so for almost everyone it answered a
   * question they had not asked, in the last position they would read. The
   * referral itself still exists where it is actually wanted: on the Calls page,
   * behind a company code.
   */

  /**
   * The auto-return, copied from the original.
   *
   * Meet counts down from 60 and goes home on its own, with a ring draining
   * beside the number — measured at a 56x56 ring ticking once a second. It is a
   * small thing that matters: a dead-end screen with only a button on it makes
   * leaving feel like a failure state, and the countdown says the product still
   * has somewhere to put you.
   *
   * The interval is cleared if anything else navigates first, so a click on
   * "Return to home screen" cannot race the timer.
   */
  const SECONDS = 60;
  /**
   * MEASURED, finally, and not from a screenshot.
   *
   * The original's ring is a <canvas> — canvas.XMqAKd, 56x56 at dpr 1, so its
   * units are CSS pixels. Canvas geometry is not in the DOM, which is why every
   * computed-style probe reported border: 0px none and why two earlier passes
   * had to guess. But the canvas is same-origin, so getImageData works: casting
   * rays from the centre and recording where ink starts and stops gives the
   * inner and outer edge directly.
   *
   * Rays at 0/30/90/120/240 degrees, inner -> outer:
   *   15.5 -> 19.3,  15.0 -> 19.0,  15.5 -> 19.3,  15.8 -> 20.0,  16.8 -> 20.8
   *
   * So the stroke is ~4 and the CENTRELINE RADIUS IS ~18. Ours was 22, which is
   * why Nam said the radius was still off after the first correction — 26 was
   * far too big, and 22 was still 4 too big.
   *
   * The same scan settled the sweep direction as a side effect: at 48s of 60
   * remaining, the rays at -90, -60 and -30 had NO ink, so the spent 20% (72
   * degrees) opens at 12 o'clock and grows CLOCKWISE. That is measurement
   * agreeing with the dashoffset reasoning in styles.css rather than just my
   * arithmetic.
   */
  const RING_R = 18;
  const CIRC = 2 * Math.PI * RING_R;
  const numEl = h('span', { class: 'end-n' }, String(SECONDS));
  const timer = h(
    'div',
    { class: 'end-timer', role: 'status', 'aria-live': 'polite' },
    h('span', { class: 'end-ring' },
      h('span', { class: 'end-n-host', 'aria-hidden': 'true' }),
      numEl),
    h('span', {}, 'Returning to home screen'),
  ) as HTMLElement;
  {
    const ring = timer.querySelector('.end-ring') as HTMLElement;
    /*
     * IN PIXELS, and the unit is the whole fix.
     *
     * Nam: "this weird bug with the count down timer ... it either fully blue or
     * fully white, I dont see the timer ticking off over time. That must be a
     * recent bug cause in some earlier QA everything was fine." Both halves of
     * that are right, including which change broke it.
     *
     * --c used to be a bare number, which is legal for stroke-dasharray -- an SVG
     * geometry property accepts a <number> and Chrome reads 113.097 as 113.097px.
     * Then the clockwise fix introduced `calc(var(--c) * -1)` in the keyframe,
     * and calc() is STRICTLY TYPED: a unitless number stays a <number>, so the
     * "to" value never resolved to a length. Chrome cannot interpolate a length
     * against that, so it fell back to DISCRETE animation -- the arc holds at
     * full for the first thirty seconds and then vanishes for the rest. Not a
     * frozen animation; a two-frame one.
     *
     * Measured, both ways, by driving Animation.currentTime on a 1s duration:
     *   unitless  100ms 0px   400ms 0px   600ms calc(-113.097px)  900ms same
     *   with px   100ms -11.3 400ms -45.2 600ms -67.9             900ms -101.8
     *
     * So --c carries its unit from here on. That also makes it safe for the next
     * person to put it inside a calc, which is the trap that caught this one.
     */
    ring.style.setProperty('--c', CIRC + 'px');
    ring.style.setProperty('--dur', SECONDS + 's');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 56 56');
    svg.setAttribute('aria-hidden', 'true');
    // Only the arc. The original draws this with the rotating-mask trick, which
    // has no separate track — and ours was painting one in rgba(255,255,255,.16),
    // a white track on a light surface, so it was invisible anyway.
    for (const cls of ['end-arc']) {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', '28'); c.setAttribute('cy', '28'); c.setAttribute('r', String(RING_R));
      c.setAttribute('class', cls);
      svg.appendChild(c);
    }
    ring.insertBefore(svg as unknown as Node, ring.firstChild);
    /**
     * THE COUNTDOWN MUST NOT OUTLIVE THE SCREEN.
     *
     * Nam: "sometimes the call auto ends on me and im back on home screen."
     * This was it, and the cause was a guard that had never once run:
     *
     *     const stop = () => window.clearInterval(tick);
     *     window.addEventListener('hashchange', stop, { once: true });
     *
     * The store subscriber in main.ts writes the URL with history.pushState, and
     * pushState DOES NOT fire hashchange. So nothing ever cleared the interval.
     * Leave a call, press Rejoin, and sixty seconds later the orphaned countdown
     * reached zero and dispatched screen: 'home' from underneath you -- while you
     * were in the middle of the call. "Sometimes" because it only happened when
     * you had passed through the ended screen in the last minute.
     *
     * Worse, each visit armed another independent timer, so a QA session that
     * ended and rejoined a few times had several of them queued up, firing at
     * what felt like random moments.
     *
     * Reproduced by overriding window.setInterval to run at 20ms instead of
     * 1000ms -- same code path, faster clock -- which turned a sixty-second wait
     * into a second and a half:
     *   on #ended [ended] -> Rejoin -> #call [call] -> (countdown) -> #home [home]
     *
     * The fix is to stop relying on an event and let the tick check whether it is
     * still wanted. Two questions, because either alone leaves a gap: the node is
     * detached once main.ts swaps the screen, and the state has moved on even in
     * the window before that. A tick that is no longer the ended screen clears
     * itself and dispatches nothing.
     */
    let left = SECONDS;
    const tick = window.setInterval(() => {
      if (!timer.isConnected || store.get().screen !== 'ended') {
        window.clearInterval(tick);
        return;
      }
      left -= 1;
      numEl.textContent = String(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(tick);
        store.dispatch({ t: 'screen', screen: 'home' });
      }
    }, 1000);
  }

  return h(
    'main',
    { class: 'ended', id: 'main' },
    timer,
    h(
      'div',
      { class: 'ended-in' },
      h('h1', {}, 'You left the meeting'),
      h(
        'div',
        { class: 'ended-acts' },
        h('button', { class: 'm-btn m-outlined', type: 'button', onclick: () => store.dispatch({ t: 'join' }) }, 'Rejoin'),
        h(
          'button',
          { class: 'm-btn m-filled', type: 'button', onclick: () => store.dispatch({ t: 'screen', screen: 'home' }) },
          'Return to home screen',
        ),
      ),
      h(
        'div',
        { class: 'ended-feedback' },
        h(
          'button',
          { class: 'm-btn m-text', type: 'button', onclick: () => openPlain() },
          'Submit feedback, or just read the CV as a document',
        ),
      ),

      h(
        'div',
        { class: 'safe' },
        sym('description', 24),
        h(
          'div',
          {},
          h('h2', {}, 'Take the boring version too'),
          h(
            'p',
            {},
            'A recruiter screens a file in an applicant tracking system, not a web app. The site was always the ' +
              'amplifier. This is the artifact.',
          ),
          h(
            'div',
            { style: 'display:flex;gap:10px;flex-wrap:wrap' },
            h('a', { class: 'm-btn m-filled', href: 'NamNguyen_CV_2026.pdf', download: true }, 'Download the CV'),
            h('a', { class: 'm-btn m-outlined', href: `mailto:${address}?subject=${mailSubject()}` }, address),
          ),
        ),
      ),

      /*
       * Only for somebody who actually finished it. Nam wanted the gamification
       * and this is the honest version of it: a time, their own best, and the
       * authored benchmark to measure both against — which is the number that
       * makes the first two interesting, because beating it takes knowing that
       * lines can be skipped and that triggering a segment early cuts the one
       * being spoken short.
       *
       * No leaderboard. See board ticket N52 for why: this page promises no
       * backend in four separate places, and its own CSP forbids the request.
       */
      run
        ? h(
          'div',
          { class: 'safe' },
          // 'speed' rather than a stopwatch: the subset has no timer glyph, and
          // this card is about how fast rather than how long anyway.
          sym('speed', 24),
          h(
            'div',
            {},
            h('h2', {}, `You did the interview in ${clockMs(run.lastMs)}`),
            h(
              'p',
              { style: 'margin:0' },
              run.lastMs <= run.bestMs
                ? `That is your best of ${run.runs} ${run.runs === 1 ? 'run' : 'runs'}. `
                : `Your best is ${clockMs(run.bestMs)}, over ${run.runs} runs. `,
              `Unhurried, it runs ${clockMs(runtimeMs())}. Every line can be skipped with a click, so `
              + 'faster than that is a choice rather than a glitch.',
            ),
          ),
        )
        : h('span', {}),

      h(
        'div',
        { class: 'safe' },
        sym('bolt', 24),
        h(
          'div',
          {},
          h('h2', {}, `Side quests: ${got} of ${total}`),
          h(
            'p',
            { style: 'margin:0' },
            got === total
              ? 'All of them, which is more thorough than most interview loops. The main quest is the one in the job ad: four people on four networks, all seeing the same thing at the same instant.'
              : 'A few are still open, under Meeting tools → Storyline. Two more are not on the list at all, and one of them is the oldest keyboard shortcut in games.',
          ),
        ),
      ),

      h(
        'div',
        { class: 'ended-fine' },
        h('p', {}, ...profile.links.map((l, i) => h('span', {}, i ? ' · ' : '', h('a', { href: l.href }, `${l.label}/${l.handle}`)))),
        /*
         * ONE LINE. Nam: "Shorten it to just this."
         *
         * Two paragraphs went. The Google disclaimer was three sentences of
         * legal throat-clearing on a screen whose job is to say thank you and
         * hand over a link — and one of its sentences ("No Google marks are
         * used") was not even true, since the shell renders the Meet mark. That
         * is R13 in tools/CV-PERCEPTION.md, and it was already removed from the
         * CV footer for the same reason. This was the last place it survived, so
         * meta.disclaimer goes with it rather than sitting in the data unused.
         *
         * And the camera clause went because the camera did: there is no stream
         * to have nowhere to go (T29). A joke about a feature nobody can find is
         * just a confusing sentence.
         */
        h(
          'p',
          {},
          'Built in TypeScript with no framework and no dependencies. No analytics, no third-party requests and no '
            + 'backend. Powered by Claude.',
        ),
      ),
    ),
  );
}
