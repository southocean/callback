// A 20-line DOM helper instead of a framework.
//
// This is the whole "view layer". It exists because review T2 said arriving
// with 400 KB of framework would be an anti-signal on a team that runs a tiny
// hand-rolled one.

type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;
export type Child = Node | string | number | null | undefined | false | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') {
      el.addEventListener(k.replace(/^on/, '').toLowerCase(), v as EventListener);
    } else if (k === 'class') {
      el.className = String(v);
    } else if (k === 'html') {
      el.innerHTML = String(v);
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }

  append(el, children);
  return el;
}

function append(parent: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(parent, c);
    else if (c instanceof Node) parent.appendChild(c);
    else parent.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

export function must<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
}

/** Inline SVG icon. No icon font, no sprite request. */
export function icon(path: string, size = 20): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', path);
  p.setAttribute('fill', 'currentColor');
  svg.appendChild(p);
  return svg;
}

export const icons = {
  cam: 'M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4Z',
  camOff:
    'M21 6.5l-4 4V7a1 1 0 0 0-1-1H9.8l11 11h.2v-10.5ZM3.3 2.3 1.9 3.7l1.4 1.4A1 1 0 0 0 3 6v11a1 1 0 0 0 1 1h12c.2 0 .4 0 .6-.1l3.7 3.7 1.4-1.4L3.3 2.3Z',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V22h2v-3.1A7 7 0 0 0 19 12h-2Z',
  micOff:
    'M15 10.6V6a3 3 0 0 0-5.9-.7l5.9 5.3ZM4.4 3 3 4.4l6 5.4V12a3 3 0 0 0 4.5 2.6l1.5 1.3A5 5 0 0 1 7 12H5a7 7 0 0 0 6 6.9V22h2v-3.1a7 7 0 0 0 3.4-1.4L19.6 20 21 18.6 4.4 3Z',
  chat: 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-2 12H6v-2h12v2Zm0-4H6V8h12v2Z',
  people:
    'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13Zm8 0c-.3 0-.7 0-1.1.1 1.3.9 2.1 2 2.1 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5Z',
  present: 'M21 3H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h7v2H7v2h10v-2h-3v-2h7a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Zm-1 12H4V5h16v10Z',
  cc: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-9 7H9.5v-.5h-2v3h2V13H11v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1Zm7 0h-1.5v-.5h-2v3h2V13H18v1a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1Z',
  more: 'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  end: 'M12 9c-1.6 0-3.2.3-4.7.7v3.1c0 .4-.2.7-.6.9-1 .5-2 1.2-2.8 2-.2.2-.4.3-.7.3s-.5-.1-.7-.3l-2.5-2.5a1 1 0 0 1 0-1.4C3.2 8.9 7.4 7 12 7s8.8 1.9 12 4.8c.4.4.4 1 0 1.4L21.5 15.7c-.2.2-.4.3-.7.3s-.5-.1-.7-.3c-.8-.8-1.8-1.5-2.8-2-.4-.2-.6-.5-.6-.9v-3.1C15.2 9.3 13.6 9 12 9Z',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z',
  copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z',
  // Two glyphs the Calls tab needs that the 7 kB Material subset does not
  // carry, drawn here rather than growing the font: the search field's
  // magnifier, and the block mark on the call dialog's one menu item.
  search: 'M10 4a6 6 0 1 0 3.7 10.7l4.8 4.8 1.4-1.4-4.8-4.8A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
  block: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2c1.6 0 3.1.5 4.2 1.4L6.4 16.2A7 7 0 0 1 12 5Zm0 14c-1.6 0-3.1-.5-4.2-1.4l9.8-9.8A7 7 0 0 1 12 19Z',
  // The tile pill's two glyphs. Meet uses `visual_effects` and a framed-tile
  // mark; neither is in the subset, and Round 4's substitutes (blur_on,
  // close_fullscreen) read as different controls entirely.
  //
  // effects: a picture frame with a sparkle off its corner, which is what
  // visual_effects draws — an image plus the suggestion of alteration.
  effects: 'M4 6a2 2 0 0 1 2-2h7v2H6v12h12v-7h2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm3.2 10.8 3.1-4 2.2 2.7 1.9-2.4 2.4 3.7H7.2Zm11-14.3 1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1 1-2.3Z',
  // show-in-tile: a tile outline crossed through, the "take me out of / put me
  // back in the grid" control.
  tileOff: 'M3 6a2 2 0 0 1 2-2h11.2l2 2H5v12h9.2l2 2H5a2 2 0 0 1-2-2V6Zm16 1.8L21 9.8V18a2 2 0 0 1-.3 1l-1.7-1.7V7.8ZM3.6 2.2 21.8 20.4l-1.4 1.4L2.2 3.6l1.4-1.4Z',
};
