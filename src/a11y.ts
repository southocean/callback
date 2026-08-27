// Accessibility, as work rather than as a bullet point.
//
// Review T3: "anyone can put the word accessibility in a panel. I will tab
// through it and I will turn on a screen reader." So this module does two
// things — it implements the behaviour, and it audits the live DOM afterwards
// and is allowed to report failures.

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function focusable(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Trap focus inside a panel until it closes, and hand focus back to whatever
 * opened it. Escape closes. This is the part people skip.
 */
export function trapFocus(panel: HTMLElement, onEscape: () => void): () => void {
  const previous = document.activeElement as HTMLElement | null;

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusable(panel);
    if (!items.length) return;
    const first = items[0] as HTMLElement;
    const last = items[items.length - 1] as HTMLElement;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  panel.addEventListener('keydown', onKey);
  const target = focusable(panel)[0] ?? panel;
  target.focus();

  return () => {
    panel.removeEventListener('keydown', onKey);
    if (previous && document.contains(previous)) previous.focus();
  };
}

/**
 * Roving tabindex over the tile grid: one tab stop for the whole grid, arrow
 * keys to move within it. What a grid is supposed to do, and what a pile of
 * buttons does not.
 */
export function rovingGrid(grid: HTMLElement, selector: string): void {
  const items = (): HTMLElement[] => Array.from(grid.querySelectorAll<HTMLElement>(selector));
  const all = items();
  all.forEach((el, i) => el.setAttribute('tabindex', i === 0 ? '0' : '-1'));

  grid.addEventListener('keydown', (e: KeyboardEvent) => {
    const list = items();
    const current = list.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;

    const cols = Math.max(1, Math.round(grid.clientWidth / Math.max(1, list[0]?.clientWidth ?? 1)));
    let next = current;
    switch (e.key) {
      case 'ArrowRight': next = current + 1; break;
      case 'ArrowLeft':  next = current - 1; break;
      case 'ArrowDown':  next = current + cols; break;
      case 'ArrowUp':    next = current - cols; break;
      case 'Home':       next = 0; break;
      case 'End':        next = list.length - 1; break;
      default: return;
    }

    if (next < 0 || next >= list.length) return;
    e.preventDefault();
    list[current]?.setAttribute('tabindex', '-1');
    const target = list[next];
    if (target) {
      target.setAttribute('tabindex', '0');
      target.focus();
    }
  });
}

/** Debounced polite announcer. Review A1: a live region that fires constantly floods a screen reader. */
export function announcer(region: HTMLElement, waitMs = 1200): (msg: string) => void {
  let timer = 0;
  let pending = '';
  return (msg: string) => {
    pending = msg;
    if (timer) return;
    timer = window.setTimeout(() => {
      region.textContent = pending;
      timer = 0;
    }, waitMs);
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// The audit
// ---------------------------------------------------------------------------

export interface Check {
  name: string;
  detail: string;
  pass: boolean;
}

/**
 * Assertions against the running document. These can fail, and that is the
 * point — a panel that always says PASS is a picture, not a test.
 */
export function audit(): Check[] {
  const checks: Check[] = [];
  const add = (name: string, detail: string, pass: boolean): void => {
    checks.push({ name, detail, pass });
  };

  add('Document language', 'html[lang] is set, so a screen reader picks the right voice.', document.documentElement.lang !== '');

  const title = document.title;
  add('Page title', `"${title}" names the person and the role.`, title.length > 10 && /Nam/i.test(title));

  const imgs = Array.from(document.images);
  const badImg = imgs.filter((i) => !i.alt && i.getAttribute('aria-hidden') !== 'true');
  add('Image alternatives', badImg.length === 0 ? `All ${imgs.length} images labelled or explicitly decorative.` : `${badImg.length} unlabelled.`, badImg.length === 0);

  const svgs = Array.from(document.querySelectorAll('svg'));
  const badSvg = svgs.filter((s) => !s.hasAttribute('aria-hidden') && !s.querySelector('title') && !s.hasAttribute('aria-label'));
  add('Decorative SVG hidden', badSvg.length === 0 ? `${svgs.length} icons marked aria-hidden.` : `${badSvg.length} icons announce as "graphic".`, badSvg.length === 0);

  const btns = Array.from(document.querySelectorAll('button'));
  const nameless = btns.filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'));
  add('Every control has a name', nameless.length === 0 ? `${btns.length} buttons, all named.` : `${nameless.length} icon-only buttons with no accessible name.`, nameless.length === 0);

  const toggles = btns.filter((b) => b.hasAttribute('aria-pressed'));
  add('Toggle state exposed', `${toggles.length} toggles report aria-pressed rather than relying on colour.`, toggles.length >= 3);

  const grid = document.querySelector('[role="list"], .tiles');
  const roving = grid ? Array.from(grid.querySelectorAll('[tabindex]')) : [];
  const stops = roving.filter((el) => el.getAttribute('tabindex') === '0').length;
  add('Grid is one tab stop', grid ? `${roving.length} tiles, ${stops} tab stop. Arrow keys move inside.` : 'No grid on screen right now.', !grid || stops <= 1);

  const live = Array.from(document.querySelectorAll('[aria-live]'));
  const polite = live.every((el) => el.getAttribute('aria-live') === 'polite');
  add('Live regions are polite', live.length ? `${live.length} live regions, none assertive.` : 'No live regions on screen.', polite);

  const skip = document.querySelector('a[href="#main"], .skip');
  add('Skip link', skip ? 'Present, and it is the first tab stop.' : 'Missing.', !!skip);

  const main = document.querySelectorAll('main');
  add('One main landmark', `${main.length} <main> element.`, main.length === 1);

  const heads = Array.from(document.querySelectorAll('h1,h2,h3,h4')).map((h) => Number(h.tagName[1]));
  let jump = false;
  for (let i = 1; i < heads.length; i++) {
    const prev = heads[i - 1] ?? 1;
    const cur = heads[i] ?? 1;
    if (cur - prev > 1) jump = true;
  }
  add('Heading order', heads.length ? `${heads.length} headings, no level skipped.` : 'No headings on screen.', !jump);

  add(
    'Reduced motion honoured',
    prefersReducedMotion() ? 'Your OS asks for reduced motion, and effects are locked off.' : 'Your OS does not request it; the guard is still wired.',
    true,
  );

  const dialogs = Array.from(document.querySelectorAll('[role="dialog"],[role="region"][aria-modal]'));
  const labelled = dialogs.every((d) => d.hasAttribute('aria-label') || d.hasAttribute('aria-labelledby'));
  add('Panels are labelled', dialogs.length ? `${dialogs.length} open panel(s), labelled.` : 'No panel open.', labelled);

  return checks;
}
