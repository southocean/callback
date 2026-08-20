// Icons and the product lockup.
//
// Meet renders its icons with "Google Symbols", a proprietary superset of
// Material Symbols driven by variable axes: FILL, wght, GRAD, opsz and Google's
// own ROND. Read straight off the live DOM:
//
//   font: 400 24px/24px "Google Symbols"
//   font-variation-settings: "FILL" 0, "GRAD" 0, "ROND" 50, "opsz" 24, "wght" 400
//   selected rail item: identical but "FILL" 1
//
// Google Symbols is not distributable. Material Symbols Outlined is — Apache-2.0,
// same design programme, same axes minus ROND — so this ships a 7 kB subset of it
// covering exactly the 39 glyphs used here, self-hosted. That makes the icons the
// real thing rather than my approximations of them, and keeps the promise of zero
// third-party requests.
//
// The FILL axis is wired up the way Meet wires it: unselected 0, selected 1.

export type IconName =
  | 'add' | 'apps' | 'back_hand' | 'bolt' | 'calendar_month' | 'call' | 'call_end'
  | 'chat' | 'check' | 'chevron_left' | 'chevron_right' | 'close' | 'closed_caption'
  | 'closed_caption_off' | 'content_copy' | 'description' | 'event' | 'expand_more'
  | 'frame_person' | 'group' | 'help' | 'info' | 'keyboard' | 'keyboard_arrow_up'
  | 'link' | 'lock_person' | 'mic' | 'mic_off' | 'mood' | 'more_vert' | 'person_add'
  | 'present_to_all' | 'science' | 'settings' | 'shield' | 'speed' | 'video_call' | 'videocam'
  | 'videocam_off' | 'visual_effects';

export interface SymOpts {
  /** Meet fills the glyph for the selected nav item. */
  fill?: boolean;
  /** Optical size, matched to the rendered size like Meet does. */
  opsz?: number;
}

/**
 * One Material Symbol. A span, not an SVG — same mechanism as the real product,
 * which is why the shapes match instead of merely resembling.
 */
export function sym(name: IconName, size = 24, opts: SymOpts = {}): HTMLElement {
  const el = document.createElement('span');
  el.className = 'ms';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = name;
  const opsz = opts.opsz ?? (size <= 20 ? 20 : size >= 40 ? 40 : 24);
  el.style.fontSize = `${size}px`;
  el.style.fontVariationSettings = `"FILL" ${opts.fill ? 1 : 0}, "wght" 400, "GRAD" 0, "opsz" ${opsz}`;
  return el;
}

/**
 * The mark, redrawn from the 2026 asset.
 *
 * Sampled off gstatic's own PNG: body a yellow gradient around #FFD723 → #FECE06,
 * lens horn #F9AA01, and a white record dot low-left. Not the old tricolour
 * camera — that logo was retired.
 */
function mark(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  // Traced off gstatic's 124x40 asset at 16x. Meet renders that image at its
  // natural size, so the glyph is 34.75 x 27.6 on screen — a body that is very
  // nearly square with a small flared horn. The first attempt was far too
  // small and far too wide, which is what made ours look like a different logo.
  svg.setAttribute('viewBox', '0 0 37 32');
  svg.setAttribute('width', '37');
  svg.setAttribute('height', '32');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'lk-mark');

  const grad = document.createElementNS(ns, 'linearGradient');
  grad.setAttribute('id', 'lkg');
  grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '1'); grad.setAttribute('y2', '1');
  for (const [off, col] of [['0', '#FFDA45'], ['0.55', '#FFD11B'], ['1', '#FBC900']]) {
    const s = document.createElementNS(ns, 'stop');
    s.setAttribute('offset', off);
    s.setAttribute('stop-color', col);
    grad.appendChild(s);
  }
  const defs = document.createElementNS(ns, 'defs');
  defs.appendChild(grad);
  svg.appendChild(defs);

  // The horn is a trapezoid, taller at the outer edge, tucked behind the body.
  // Its corners are softened with a matching stroke rather than arcs, so the
  // path stays readable — hence the inset coordinates.
  const horn = document.createElementNS(ns, 'path');
  horn.setAttribute('d', 'M27 11.9 L35.3 8.4 V26.2 L27 22.7 Z');
  horn.setAttribute('fill', '#F9AA01');
  horn.setAttribute('stroke', '#F9AA01');
  horn.setAttribute('stroke-width', '1.6');
  horn.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(horn);

  const body = document.createElementNS(ns, 'rect');
  body.setAttribute('x', '1.25'); body.setAttribute('y', '3');
  body.setAttribute('width', '25.75'); body.setAttribute('height', '27.6');
  body.setAttribute('rx', '4.2');
  body.setAttribute('fill', 'url(#lkg)');
  svg.appendChild(body);

  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', '7.2'); dot.setAttribute('cy', '24.6'); dot.setAttribute('r', '2.8');
  dot.setAttribute('fill', '#fff');
  svg.appendChild(dot);

  return svg;
}

/**
 * The lockup, and the one liberty this clone takes with it.
 *
 * It renders as "Google Meet", then "Nam" flies in from the right, lands, the
 * whole wordmark takes the hit, and "Google" is knocked out of it — leaving
 * "Meet Nam". Which is the entire pitch, in one word of movement.
 *
 * Under reduced-motion it is simply "Meet Nam" from the start; nothing flies.
 */
export function lockup(reducedMotion = false, onHome?: () => void): HTMLElement {
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.className = `lockup${reducedMotion ? ' lk-static' : ' lk-play'}`;
  wrap.appendChild(mark());

  const words = document.createElement('div');
  words.className = 'lk-words';

  const google = document.createElement('span');
  google.className = 'lk-google';
  google.textContent = 'Google';

  const meet = document.createElement('span');
  meet.className = 'lk-meet';
  meet.textContent = 'Meet';

  const nam = document.createElement('span');
  nam.className = 'lk-nam';
  nam.textContent = 'Nam';

  words.append(google, meet, nam);
  wrap.appendChild(words);

  // One accessible name for the whole thing, so a screen reader hears the
  // destination rather than three fragments mid-animation.
  wrap.setAttribute('aria-label', 'Meet Nam');
  for (const el of [google, meet, nam]) el.setAttribute('aria-hidden', 'true');

  wrap.addEventListener('click', () => {
    onHome?.();
    if (reducedMotion) return;
    // Restart the animation: drop the class, force a reflow so the browser
    // notices, then put it back. Cheaper and more reliable than juggling
    // animationName, and it means the gag can be watched twice.
    wrap.classList.remove('lk-play');
    void wrap.offsetWidth;
    wrap.classList.add('lk-play');
  });

  return wrap;
}
