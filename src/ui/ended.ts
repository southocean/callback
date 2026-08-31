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
import { profile, SITE } from '../data/cv.js';
import type { Quests } from '../achievements.js';
import type { Bugs } from '../bugs.js';
import { openBugFrame } from './bugframe.js';
import { openPlain } from './plainoverlay.js';
import { buildRail } from './rail.js';
import { passFinds, type PassPart } from '../pass.js';


/**
 * A tile per collection that gained something in this pass.
 *
 * Nam: "Each will have its own report tile, just like the side quest and the bugs
 * here." So it is the same `.safe` card the rest of this screen is built from --
 * glyph, heading, one paragraph -- and not a new shape. What changes is what the
 * paragraph holds: the NAMES, rather than a sentence about a number.
 *
 * Naming them is the whole point. "3 new side quests" is a score; "Hotel wifi,
 * Talk to the hand, Break it on purpose" is a memory of the last twenty minutes,
 * and it is also the only place a secret quest ever gets said out loud, since the
 * tray lists a secret only after it is found and this screen has just found it.
 *
 * A collection with nothing new draws nothing. An empty tile reading "0 new bugs"
 * is a reproach, and this screen has no business reproaching anybody.
 */
function findCards(pass: ReturnType<typeof passFinds>, bugs: Bugs): HTMLElement[] {
  /*
   * NO PASS, NO TILES. #ended is a real URL and can be reloaded or linked, which
   * means this screen can be reached without a call having happened. There is no
   * before-picture in that case, and the honest report is silence rather than a
   * list of everything the visitor has ever found dressed up as news.
   */
  if (!pass) return [];

  const glyph: Record<PassPart['key'], 'bolt' | 'science' | 'videocam'> = {
    quests: 'bolt', bugs: 'science', eggs: 'videocam',
  };

  const cards = pass.parts
    .filter((part) => part.names.length > 0)
    .map((part) => {
      const n = part.names.length;
      return h(
        'div',
        { class: 'safe' },
        sym(glyph[part.key], 24),
        h(
          'div',
          {},
          h('h2', {}, `${n} new ${n === 1 ? part.one : part.many}`),
          // Serial commas and a final "and", because this is a sentence about
          // things that happened rather than a list of rows.
          h('p', { style: part.key === 'bugs' ? undefined : 'margin:0' }, sentence(part.names)),
          /*
           * ONLY THE BUG TILE CARRIES A BUTTON, because only the bugs have a
           * room to go to. The quests have a tray inside the call and the clips
           * have the calendar; neither is somewhere to send a visitor who has
           * just left. The case is a dialog, so it opens over this screen and
           * gives it back.
           */
          part.key === 'bugs'
            ? h(
              'button',
              { class: 'm-btn m-outlined', type: 'button', onclick: () => openBugFrame(bugs) },
              'Open the case',
            )
            : h('span', {}),
        ),
      ) as HTMLElement;
    });

  if (cards.length) return cards;

  /*
   * NOTHING NEW, which is a real and frequent outcome -- a second run to beat a
   * time finds nothing by design, and so does a first run by somebody who came to
   * read a CV. It gets one quiet tile rather than none.
   *
   * The tile exists because the alternative is a screen that says nothing at all
   * about the layer, to the one visitor who has not yet met it. This is the only
   * place that can point at the ring without spoiling anything: the ring is on
   * the rail, to the left, and pressing it says how much there is. That is a
   * signpost to a total, not a hint to a hiding place.
   *
   * AND NOT ON A PHONE AT ALL -- board ticket N252. Nam: "If there is nothing
   * new, we just dont show it." The argument above is an argument for a wide
   * screen with room under the fold for a paragraph nobody asked for. At 390px
   * it is the only card between the heading and the footer, so a screen that
   * has nothing to report spends its entire body reporting that -- and the
   * thing it points at, the ring on the rail, is eighty pixels above it in the
   * row this screen already draws. The signpost is redundant where the
   * signposted thing is in the same glance.
   */
  return [h(
    'div',
    { class: 'safe narrow-hide' },
    sym('bolt', 24),
    h(
      'div',
      {},
      h('h2', {}, 'Nothing new this time'),
      h('p', { style: 'margin:0' },
        'There are quests, bugs and clips hidden in this build, and none of them gate anything. '
        + 'The ring on the left counts them, and knows how many are left.'),
    ),
  ) as HTMLElement];
}

/**
 * The sentence that leaves with the link.
 *
 * Nam wrote it: "Hey, check out this crazy CV: [link]". It is deliberately not
 * a pitch. Whoever presses this is not selling him to their colleague, they are
 * forwarding something odd they found, and "crazy CV" is what somebody actually
 * types into a message. A line that read "Nam Nguyen, Lead front-end developer,
 * seven years" would be the sender vouching for a stranger's CV, which is a
 * thing nobody does and a thing this button must not put in their mouth.
 */
const SHARE_LEAD = 'Hey, check out this crazy CV:';

/**
 * The phone's own share sheet, which is the whole point of the control.
 *
 * navigator.share is gated on a transient user activation, so it has to be
 * called synchronously out of the click -- no awaiting anything first, or the
 * browser rejects it as programmatic.
 *
 * THE URL GOES IN `url`, NOT INSIDE `text`. Chrome on Android hands the sheet a
 * single EXTRA_TEXT built by joining text and url itself, so a share object
 * carrying the address in both fields sends it twice, and the second copy lands
 * mid-sentence in whatever the receiving app does with it. SITE rather than
 * location.href for the reason data/cv.ts gives: the address has to be one a
 * stranger can be sent, and during development location.href is a localhost
 * port. It is also the bare URL with no fragment, so it opens on the title card
 * the way a cold arrival is meant to.
 *
 * TWO FALLBACKS, because this button is authored for a phone but the stylesheet
 * is what decides who sees it, and a narrow desktop window is a real viewport.
 * No sheet: copy the same sentence. No clipboard either (it is permissioned,
 * and denied in a few embedded browsers): show the address so it can be read
 * off the screen, which is worse than a copy and better than a dead button.
 *
 * A dismissed sheet rejects with AbortError, which is not a failure -- somebody
 * changed their mind -- so it is swallowed rather than reported.
 */
function shareButton(): HTMLElement {
  const btn = h(
    'button',
    { class: 'm-btn m-outlined narrow-only', type: 'button' },
    'Share this CV',
  ) as HTMLButtonElement;
  btn.addEventListener('click', () => {
    if (navigator.share) {
      void navigator.share({ title: 'Nam Nguyen, interactive CV', text: SHARE_LEAD, url: SITE }).catch(() => {});
      return;
    }
    void navigator.clipboard?.writeText(`${SHARE_LEAD} ${SITE}`).then(
      () => { btn.textContent = 'Link copied'; },
      () => { btn.textContent = SITE; },
    );
  });
  return btn;
}

/** "a", "a and b", "a, b and c" -- the last join is a word, not a comma. */
function sentence(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function renderEnded(store: Store, _quests: Quests, bugs: Bugs): HTMLElement {
  const address = `${profile.emailUser}@${profile.emailHost}`;
  /*
   * READ ONCE, at the top, and deliberately not re-read further down. This
   * function runs again on a re-render, and passFinds() is a pure diff against a
   * snapshot that nothing here disturbs -- so the tiles say the same thing on the
   * second render as the first, which is what a report of a finished pass has to
   * do. The quests argument is still taken because main.ts hands it to every
   * screen; nothing on this one reads it any more, hence the underscore.
   */
  const pass = passFinds();
  /*
   * HOW LONG IT TOOK IS NO LONGER ASKED — board ticket N164, which retires N51.
   *
   * A card stood here reading "You did the interview in 6:12", with the visitor's
   * own best under it and the authored runtime beside that. It was the honest
   * version of a scoreboard and it was still a scoreboard, and a scoreboard on the
   * last screen of a visit is an instruction about the next one.
   *
   * Nam: "I dont think we should incentivize that either. We want users to spend
   * more time in the call, in this CV. We built up a whole progression with side
   * quests and bug hunting to keep users around. So turning this into a speedrun
   * is against our other goals."
   *
   * He is describing a conflict between two things this build shipped, and the
   * timer is the one that loses. Everything else on this screen rewards having
   * stayed: the tiles name what was found, the ring counts what is left, the case
   * has a door. A best time rewards having left, and it was eighteen pixels above
   * a tile congratulating somebody for poking around.
   *
   * THE CLOCK ITSELF IS NOT GONE, and that is deliberate rather than a leftover.
   * recordInterview is what the rail asks in order to decide whether the
   * completion ring may exist at all, so deleting the write would quietly take the
   * ring off every visitor. And Host controls keeps a LIVE readout, which says
   * where you are in the conversation rather than how fast you got there. What
   * went is the one surface that turned the number into a target.
   */

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
    /*
     * THE RAIL, HERE TOO -- board ticket N137.
     *
     * Nam: "Then on the left panel, we will display the bug and the progression
     * ring, at the exact place they would be once we are back in home screen -
     * this might require copying the whole left panel in home screen but hide the
     * first two buttons - so we keep the UI fully consistent."
     *
     * It is the same builder the home screen calls, with the two navigation items
     * ghosted, so the bug glyph and the ring occupy the third and fourth slots
     * exactly as they will in a moment. Press "Return to home screen" and neither
     * of them moves by a pixel, which is the point: the total you were just
     * looking at is still where you left it, and the ended screen stops being a
     * cul-de-sac with its own furniture.
     *
     * Absolutely positioned rather than laid out beside the content, for two
     * reasons. The content column is centred against the VIEWPORT on this screen
     * and a 104px flex sibling would shove it off centre; and the geometry that
     * has to match is the home rail's distance from the top-left of the window,
     * which an absolute box states directly instead of reconstructing out of a
     * missing top bar. Same trick the countdown in the other corner already uses.
     *
     * animateRing, and only here: this is the surface that reports the pass, so
     * this is the one allowed to count the ring up and write the new baseline.
     */
    buildRail(store, bugs, { ghostNav: true, animateRing: true, announce: true }),
    h(
      'div',
      { class: 'ended-in' },
      h('h1', {}, 'You left the meeting'),
      h(
        'div',
        { class: 'ended-acts' },
        /*
         * REJOIN IS GONE EVERYWHERE -- board ticket N252, third pass.
         *
         * It was hidden on a phone first ("we hide the rejoin button on
         * mobile"), and Nam has now taken it off the desktop as well.
         *
         * The argument that retired it from the phone was never really about
         * width, which is why it generalises. Two pills of equal weight turn the
         * one question this screen asks -- do you want to go home -- into a
         * choice between two similar-looking answers, and that is as true at 1440
         * as at 390. Rejoining is not lost either: the home screen this returns
         * to has the meeting card on it with Join in it, one press away, which is
         * where somebody who wants back in is already looking.
         *
         * The `narrow-hide` it carried goes with the button; the class itself is
         * still doing work on six other things on this screen and the home one.
         */
        h(
          'button',
          { class: 'm-btn m-filled', type: 'button', onclick: () => store.dispatch({ t: 'screen', screen: 'home' }) },
          'Return to home screen',
        ),
        /*
         * THE SHARE TAKES REJOIN'S PLACE RATHER THAN A CARD OF ITS OWN -- board
         * ticket N252, second pass.
         *
         * It shipped an hour ago as a card, and the card was the mistake. Nam:
         * "the Pass it on box now is not justified. If anything, add the Share
         * this CV button under the return to home screen, and change the styling
         * so it looks like the Rejoin buttons styling."
         *
         * He is describing a shape problem and the diagnosis is exact. A .safe
         * card is a NOTICE -- glyph in the gutter, heading, a paragraph
         * explaining something. Strip the paragraph out for a phone and what is
         * left is a 100px box of border around one button, and the border is
         * making a promise about content that is no longer in there. The
         * heading had to be invented to fill it, which is the tell.
         *
         * So it becomes what it always was: an action, in the row where this
         * screen keeps its actions, one press below the primary. Outlined rather
         * than filled, and that is Rejoin's own styling for Rejoin's own reason
         * -- there is exactly one thing this screen is asking for, and a second
         * filled pill would make the ask a choice between two.
         */
        shareButton(),
      ),
      /*
       * NOT ON A PHONE EITHER. Nam: "submit feedback or bla bla we remove this
       * line."
       *
       * The original's "Submit feedback" is a text link, so it is quiet on a
       * desktop; ours carries a second clause hung off it, so at 390px it is a
       * full-width run of blue that reads as the loudest thing under the
       * heading. And the errand it offers is already served twice over on the
       * screen it returns you to -- the promo banner's Open document is the
       * same overlay, and the meeting card is the same call.
       */
      h(
        'div',
        { class: 'ended-feedback narrow-hide' },
        h(
          'button',
          { class: 'm-btn m-text', type: 'button', onclick: () => openPlain() },
          'Submit feedback, or just read the CV as a document',
        ),
      ),

      /*
       * THE TAKE-AWAY, AND IT IS A DESKTOP OBJECT -- board ticket N252.
       *
       * Whole card, off at 390. Every part of it is wrong on a phone for its own
       * reason, which is why trimming it down did not work and removing it does.
       *
       * THE PARAGRAPH argues with the reader about applicant tracking systems,
       * which is a thing to say to somebody at a desk who is about to file this.
       * Nam: "Remove. We dont need this on mobile."
       *
       * THE DOWNLOAD lands in a Files app the reader then has to go and find.
       * That argument is already settled on the home screen, where Download the
       * PDF carries the same narrow-hide.
       *
       * THE ADDRESS opens a compose window addressed to a stranger with an empty
       * body, which is a bigger errand than it looks -- and it is still in the CV
       * itself, one press away through Open document.
       *
       * What is left after those three is a bordered box with nothing in it, so
       * the box goes too and the one thing worth keeping -- the share -- moved up
       * into .ended-acts, where the note beside it explains why that is its right
       * home rather than a place it was put to save space.
       */
      h(
        'div',
        { class: 'safe narrow-hide' },
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
            { class: 'safe-acts' },
            h('a', { class: 'm-btn m-filled', href: 'NamNguyen_CV_2026.pdf', download: true }, 'Download the CV'),
            /*
             * THE BUTTON SAYS WHAT IT DOES, NOT WHERE IT GOES.
             *
             * Nam: "My email hainam2511@gmail.com dont show it like that, but
             * show Email me option that emails to that address."
             *
             * It was labelled with the raw address, which made it the one control
             * on the screen that read as data rather than as an action -- a pill
             * beside "Download the CV" that says a gmail address is asking to be
             * copied, not pressed. "Email me" is the same verb-shaped label the
             * host-controls panel already uses for the same mailto (call.ts), so
             * the two places this offer appears now agree.
             *
             * The address itself is not hidden, only unprinted here: it is on the
             * plain document, in the PDF, and in the mail client the moment this
             * is pressed. `address` still builds the href from profile, so there
             * is still exactly one place the address is written down.
             */
            h('a', { class: 'm-btn m-outlined', href: `mailto:${address}?subject=${mailSubject()}` }, 'Email me'),
          ),
        ),
      ),

      /*
       * WHAT THEY JUST FOUND -- board ticket N137.
       *
       * Three cards used to stand here and all three reported LIFETIME totals: a
       * completion ring with its breakdown, "Side quests: 12 of 17", and
       * "Bugs: 1 of 12". Nam took all three off. Two things were wrong with them.
       *
       * The small one was that they disagreed with each other in public. The ring
       * counted twenty-one side quests -- every one there is, secrets included,
       * because a bar that reads 100% with three still hidden is a lie -- and the
       * card underneath counted the seventeen the opening line promises out loud,
       * because secrets are not advertised. Both numbers are right for their own
       * question and they should never have been stacked eighteen pixels apart.
       * Nam, reasonably: "why side quest says 21 on top then 17 below?"
       *
       * The big one is that a total is the wrong thing to say here at all. It
       * reads identically on the fourth visit and the first, it is the same
       * sentence whether the pass you just finished was a triumph or a straight
       * run to the exit, and it belongs on a surface you go to rather than one you
       * land on. So the total moved to the ring on the rail -- always in view,
       * never in the way, one press from the breakdown -- and this space now
       * answers the only question a post-call screen is well placed to answer:
       * what did THAT do.
       *
       * One card per collection that gained something, naming the things by name,
       * and nothing at all for a collection that did not. Nam: "So yeah, ended
       * screen shows the new stuff user has found, if they have found it."
       */
      ...findCards(pass, bugs),

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
