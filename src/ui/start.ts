// The front door -- board ticket N158.
//
// Nam gave the link to a friend, cold. The friend has a PhD in computer science
// and read it as a real meeting invitation: scared to click Join, because Join
// is a risk you take for a reason and there was no reason on offer. He
// downloaded the PDF instead, which is the escape hatch working correctly and is
// not what this CV is for.
//
// THE FIX IS NOT A LOUDER SENTENCE. The scheduled card already says interactive
// CV. What was missing is that nobody had agreed to anything: the clone was the
// status quo on arrival, so the only available reaction to it was confusion. A
// Start button is agreement, and agreement is the mechanism that actually
// dissolves that particular fear -- reassurance is not, because unsolicited
// reassurance reads as the register of the thing it denies.
//
// It also aims the illusion rather than weakening it. Behind a curtain the clone
// becomes a REVEAL, and "he rebuilt Meet" is the double take worth having. "Is
// this Meet?" is the one that cost us the first tester.
//
// ---------------------------------------------------------------------------
// WHY IT DOES NOT LOOK LIKE MEET
//
// Nam: "it shouldnt have the same google meet vibe." Right, and the reason is
// the same paradox as the copy: a Google-looking page saying this is not Google
// cancels itself out. Nothing on this screen loads Google Sans or Product Sans,
// the display face is a system serif, and the ground is near black so that
// pressing Start opens onto Meet's white as a change of state rather than as a
// continuation of one.
//
// ---------------------------------------------------------------------------
// ONE ANIMATION, WHERE THERE WERE EIGHT
//
// It shipped with eight and a picker, because "Implement a couple of variants and
// let me choose on the physical start page" is the only way to choose between
// animations. Nam chose: "we remove all the tiles, measure, trace, signal and the
// rest of the 8 graphic effects, the drones would be the one and only mode we
// have, we are only polishing what the drones are showing."
//
// So the seven textures are gone, the pointer plumbing that existed for one of
// them is gone with them, and the second row that used to pick a drone programme
// is now the only row. The drone show itself lives in ui/drones.ts, which is
// where the argument for all of it is written down.
//
// TWO PROGRAMMES, and the first has a job beyond being first. Nam: "the geometry
// becomes the benchmark for how well the drone effect looks." A sphere becoming a
// cube has a known correct answer, so a bad transit shows up there with nothing
// to blame it on. Motifs is the cultural set -- the lotus and the midsommarstang.
//
// STILL A PURE FUNCTION OF TIME. Nothing accumulates between frames. That is not
// tidiness for its own sake: it is what makes reduced motion a one-line answer --
// draw a single representative frame and stop -- rather than a second
// implementation of the show, and it means a resize, a tab switch or a dropped
// frame cannot leave the animation somewhere it can never get out of.

import { h } from '../dom.js';
import { loadTheme, saveTheme } from '../prefs.js';
import { PROGRAMMES, drawShow } from './drones.js';
import type { Copy, Pal, Programme } from './drones.js';
import type { Store } from '../state.js';

/* --- the canvas ----------------------------------------------------------- */

/**
 * Mount the show on a canvas and keep it fed.
 *
 * Returns a teardown, and the teardown matters: this screen is left for good the
 * moment Start is pressed, and a requestAnimationFrame loop drawing into a
 * detached canvas is a leak nothing on the page would ever complain about.
 */
function paint(
  canvas: HTMLCanvasElement, prog: Programme, reduced: boolean, col: HTMLElement,
): () => void {
  const c = canvas.getContext('2d');
  if (!c) return () => { /* no 2d context, no animation, and no error either */ };

  let w = 0;
  let hh = 0;
  let raf = 0;
  let stopped = false;

  /*
   * READ ONCE, NOT EVERY FRAME, and the first version got this wrong.
   *
   * getComputedStyle is a layout read, and it was being called sixty times a
   * second to fetch two strings that change only when the stylesheet does. It is
   * refreshed on resize, which is the only moment a media query could have
   * changed the answer.
   */
  let pal: Pal = { line: '#ffffff', accent: '#d8b46a' };

  /*
   * WHERE THE COPY IS, measured off the element rather than assumed from the
   * stylesheet. The show fits its formations into whatever is left over, and
   * since N183 slides the column sideways for the motifs, no constant describes
   * where its edges are.
   *
   * Re-read for the first second, because the slide is a CSS transition and the
   * box moves for as long as it runs. A getBoundingClientRect a frame is a layout
   * read and would be exactly the cost this file removed from the palette, so it
   * stops as soon as the copy has landed.
   */
  let copy: Copy = { left: 0, right: 0 };
  let settleFrom = -1;

  const measure = (): void => {
    const box = col.getBoundingClientRect();
    const own = canvas.getBoundingClientRect();
    copy = { left: box.left - own.left, right: box.right - own.left };
  };

  const frame = (t: number): void => {
    /*
     * NOTHING IS DRAWN AT A DEGENERATE SIZE.
     *
     * paint() runs while the canvas is still detached -- renderStart builds the
     * tree and main.ts appends it afterwards -- so clientWidth is 0 until the
     * ResizeObserver catches the attach. One or two frames run at 0 by 0 before
     * that, and at that size the projection divides by a scale of zero. The next
     * frame is requested after the draw, so a throw in here does not skip a
     * frame, it ends the animation permanently -- which is exactly how the old
     * Tiles variant used to paint a black page until you pressed its own button.
     */
    if (w <= 0 || hh <= 0) return;
    if (settleFrom < 0) settleFrom = t;
    if (t - settleFrom < 1) measure();
    c.clearRect(0, 0, w, hh);
    drawShow(c, w, hh, t, pal, prog, copy);
  };

  const size = (): void => {
    // Capped at two: past that the cost is real and nobody can see the
    // difference on a two pixel dot.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    hh = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(hh * dpr));
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Read off the element, so retuning the palette stays a CSS job.
    const cs = getComputedStyle(canvas);
    pal = {
      line: cs.getPropertyValue('--st-line').trim() || '#ffffff',
      accent: cs.getPropertyValue('--st-accent').trim() || '#d8b46a',
    };
    measure();
  };

  const loop = (ms: number): void => {
    if (stopped) return;
    frame(ms / 1000);
    raf = requestAnimationFrame(loop);
  };

  const ro = new ResizeObserver(() => {
    size();
    if (reduced) frame(prog.still);
  });
  ro.observe(canvas);
  size();

  if (reduced) {
    /*
     * ONE FRAME, AND NOT A BLANK ONE. Reduced motion means less movement, not
     * less content -- the same rule the guided tour follows when it teleports
     * the hand rather than refusing to point. Each programme nominates the moment
     * that represents it, and it is deliberately never mid transit: a handover
     * sampled at one instant is a formless cloud, and a still owes the visitor a
     * FORMATION.
     */
    frame(prog.still);
  } else {
    /*
     * No pause on visibilitychange, and that is not an oversight. A hidden tab
     * gets no rAF, so there are no frames to save; and since the show is a
     * pure function of the rAF timestamp, coming back after two minutes away
     * lands two minutes into the cycle with nothing out of step. Holding a
     * paused clock would be more code and a worse result.
     */
    raf = requestAnimationFrame(loop);
  }

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}

/* --- the screen ----------------------------------------------------------- */

/**
 * The title card.
 *
 * ONE BUTTON, and it lands on the HOME SCREEN.
 *
 * It offered two for a version: a walkthrough lane and a look-around lane, which
 * would have promoted the director's `handedOver` state to a front door. Nam cut
 * it, and the reason is the better one: "we only expose them once we are in the
 * call, cause that is the only place its relevant." A choice about narration made
 * before you have seen anything to narrate is a choice made on no information,
 * and the control that actually answers it -- Stop talking, in the control bar --
 * is already there, in the room, at the moment the question becomes real.
 *
 * It went to the LOBBY for a version, on the reasoning that the green room is the
 * shortest path to the walkthrough the card just promised. Nam moved it, and the
 * move is right for the same reason the second lane was cut: the card is a door,
 * not a shortcut. Home is where the product actually begins -- the rail, the week
 * strip, the meeting card with Join on it -- and skipping it would mean the title
 * card quietly deciding, on the visitor behalf, which parts of the CV they get to
 * see. It also puts the fragment at #home the moment they arrive, which is what
 * makes a reload land where they were rather than back at the door.
 *
 * NOT A PRESS-ANYWHERE. Nam raised the misclick himself and answered it: a page
 * that starts on any click starts by accident, and starting by accident is the
 * exact failure this whole screen exists to remove. The press has to be aimed.
 */
export function renderStart(store: Store, reduced: boolean): HTMLElement {
  const canvas = h('canvas', { class: 'st-art', 'aria-hidden': 'true' }) as HTMLCanvasElement;

  let teardown = (): void => { /* replaced by the first show() below */ };

  /*
   * THE ONLY ROW LEFT, and it picks what the fleet is flying rather than which
   * animation is playing. There is only one animation now.
   *
   * Two entries, and they are not peers. Geometry is the BENCHMARK -- Nam's
   * word -- so it is the default and it stays: a sphere becoming a cube has a
   * known correct answer, and a transit that goes wrong there cannot be blamed
   * on how a lotus was drawn. Motifs is the show.
   */
  const themes = h(
    'div',
    { class: 'st-themes', role: 'group', 'aria-label': 'Drone programme, for choosing' },
  );

  const runTheme = (th: Programme): void => {
    /*
     * A full restart rather than a swap of a variable the loop reads. It costs
     * one cancelled frame and it means the canvas cannot be left holding half of
     * one programme and half of another -- and under reduced motion it is the
     * only way the new still gets painted at all.
     */
    /*
     * THE COPY MOVES ASIDE FOR THE MOTIFS, and the attribute is how the
     * stylesheet knows to. Nam: "the constant changing from left to right screen
     * is very annoying ... lets move all the text in the center towards the right
     * side. Now we have more space on the left to show the drone swarms."
     *
     * Set BEFORE paint, so the first measurement of the column box is taken
     * against the layout the show is about to be drawn into rather than the one
     * it is leaving.
     */
    wrap.dataset['prog'] = th.id;
    teardown();
    teardown = paint(canvas, th, reduced, col);
    for (const b of themes.querySelectorAll<HTMLElement>('.st-theme-b')) {
      const on = b.dataset['theme'] === th.id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };

  for (const th of PROGRAMMES) {
    themes.appendChild(h(
      'button',
      {
        class: 'st-theme-b',
        type: 'button',
        'data-theme': th.id,
        onclick: () => { saveTheme(th.id); runTheme(th); },
      },
      th.label,
    ));
  }

  const go = h(
    'button',
    {
      class: 'st-go',
      type: 'button',
      onclick: () => {
        teardown();
        store.dispatch({ t: 'screen', screen: 'home' });
      },
    },
    /*
     * ONE WORD, AND IT USED TO BE THREE LINES. The button carried "About ten
     * minutes" and, under that, "though you might spend an hour" -- a promise and
     * then a caveat qualifying the promise, on a control whose entire job is to be
     * pressed. Nam: "The Start is enough, we dont need any fine print."
     *
     * The measurement behind the ten minutes was real and it is not the point. A
     * duration offered before anybody has agreed to anything is a COST, and it
     * invites the arithmetic of whether to spend it. Start invites a press. The
     * span survives because the stylesheet still wants something to letterspace.
     */
    h('span', { class: 'st-go-t' }, 'Start'),
  );

  const col = h(
    'main',
    { class: 'st-col', id: 'main' },
    h('p', { class: 'st-eyebrow' }, 'Interactive CV'),
    h('h1', { class: 'st-name' }, 'Nam Nguyen'),
    h(
      'p',
      { class: 'st-sub' },
      /*
       * Safe in the neutral build too, and worth being explicit about since
       * companies.ts exists to stop exactly this kind of line leaking. What that
       * module gates is the claim "I am applying to you, for this role" and
       * nothing else: the clone is the portfolio piece whoever is reading it, so
       * naming what was rebuilt is a statement about the artifact rather than
       * about the employer.
       */
      'A CV that opens as a video call, rebuilt from a measured spec of Google Meet.',
    ),
    /*
     * THE REASSURANCES ARE GONE, and that is a reversal of the thing this whole
     * screen was built to do. It carried "Nothing is recorded. No camera, no
     * microphone, nobody else in the room." and "You can stop it at any point."
     *
     * Nam: "Basically we want as little reading here as possible. We want user to
     * press start - choosing to start the experience. They can always go back in
     * the browser to the previous page."
     *
     * Which is the stronger version of the argument the first pass half made. That
     * pass already knew unsolicited reassurance reads as the register of the thing
     * it denies -- and then wrote four lines of it anyway. The fear the tester had
     * was not answered by being told there is no camera; it was answered by there
     * being a door with his hand on it. A back button is a better promise than a
     * sentence about one, and it is one the browser makes rather than one we do.
     */
    h('div', { class: 'st-acts' }, go),
    /*
     * ONE LINK, WHERE THERE WERE THREE.
     *
     * "Read it as a document" and "How this was built" are gone, and Nam is right
     * about both of them for reasons that are not really about clutter. They open
     * Meet-styled surfaces in light mode, so opening them from here would put the
     * Google surface in front of the visitor a screen early -- from the one screen
     * whose whole argument is that it is not that. Making them work would have
     * meant a dark variant of two large panels, which is a lot of stylesheet to
     * spend on undoing the point. And the spec panel is a receipt for a claim that
     * has not been made yet: it is the best door on the home screen precisely
     * because by then you have seen the thing it accounts for.
     *
     * THE DOWNLOAD STAYS, and it is the one of the three with an argument. It is
     * not a surface: it is an anchor with a download attribute, so it has no
     * theme, no panel and no close button to get wrong. And it is what the only
     * real tester of this CV actually reached for -- his first instinct, cold, was
     * to download the PDF. Taking that away from the screen where he did it, to
     * tidy up, would be tidying away the evidence.
     *
     * It sits under Start rather than beside it, and quietly, because it is the
     * exit and this is the entrance. See the note in ui/home.ts on N151, which is
     * the same argument in the other direction.
     */
    h(
      'p',
      { class: 'st-links' },
      h('a', { href: 'NamNguyen_CV_2026.pdf', download: true }, 'Download the PDF'),
    ),
  );

  const wrap = h('div', { class: 'start' }, canvas, col, themes);

  runTheme(PROGRAMMES.find((th) => th.id === loadTheme()) ?? PROGRAMMES[0]!);

  /*
   * The number keys, bound on the wrapper rather than on the window so they die
   * with the screen. main.ts already owns a global keydown handler, and a second
   * one that outlived its screen would eat digits typed into the meeting-code
   * field on the home screen.
   */
  wrap.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const i = Number(e.key) - 1;
    if (!Number.isInteger(i) || i < 0 || i >= PROGRAMMES.length) return;
    saveTheme(PROGRAMMES[i]!.id);
    runTheme(PROGRAMMES[i]!);
  });
  wrap.tabIndex = -1;

  // Meet autofocuses Join now in the green room and this is the same beat: the
  // one thing on screen you came here to press.
  requestAnimationFrame(() => go.focus({ preventScroll: true }));

  return wrap;
}
