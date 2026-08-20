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
  | 'present_to_all' | 'science' | 'settings' | 'shield' | 'speed' | 'videocam'
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
function mark(size = 26): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 34 28');
  svg.setAttribute('width', String(Math.round(size * 34 / 28)));
  svg.setAttribute('height', String(size));
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

  // lens horn first, so the body's rounded corner sits over its root
  const horn = document.createElementNS(ns, 'path');
  horn.setAttribute('d', 'M21 11.2 30.2 6.4a1 1 0 0 1 1.5.9v13.4a1 1 0 0 1-1.5.9L21 16.8Z');
  horn.setAttribute('fill', '#F9AA01');
  svg.appendChild(horn);

  const body = document.createElementNS(ns, 'rect');
  body.setAttribute('x', '1.6'); body.setAttribute('y', '4.4');
  body.setAttribute('width', '20.6'); body.setAttribute('height', '19.2');
  body.setAttribute('rx', '4.6');
  body.setAttribute('fill', 'url(#lkg)');
  svg.appendChild(body);

  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', '7.2'); dot.setAttribute('cy', '18.2'); dot.setAttribute('r', '2.5');
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
export function lockup(reducedMotion = false): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = `lockup${reducedMotion ? ' lk-static' : ' lk-play'}`;
  wrap.appendChild(mark(26));

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
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Meet Nam');
  for (const el of [google, meet, nam]) el.setAttribute('aria-hidden', 'true');

  return wrap;
}
