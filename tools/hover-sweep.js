// Automated interaction-state sweep.
//
// WHY THIS EXISTS
//
// The first hover pass on Meet's home screen concluded that only one control in
// eight reacted to the pointer. That conclusion was wrong, and the method is
// why. It walked `document.querySelectorAll(':hover')` and read
// `background-color` off each ancestor. Two flaws, both fatal:
//
//   1. ANCESTOR-BLIND. Meet paints a hover state by fading in a dedicated
//      overlay element. That overlay is a *child* of the control, or a
//      positioned sibling — it is frequently not in the `:hover` chain at all,
//      because the chain only contains elements the pointer is literally over.
//      Every overlay that sits under a text node was invisible to the probe.
//
//   2. PROPERTY-BLIND. The overlay's background never changes. Its *opacity*
//      does — 0 to 1 on an already-coloured layer. Reading background-color
//      finds a constant and reports "no change".
//
// Anything that only inspects a property list you chose in advance will keep
// missing states you did not predict. So this works the other way round: snap
// everything in the region, perturb, snap again, and let the diff tell you what
// moved.
//
// WHAT IT DOES
//
//   snap(sel)  – every element whose box intersects the control's box, plus its
//                own subtree and ::before/::after, recorded across ~20
//                properties and its geometry. Region-based, so overlays and
//                positioned siblings are included whether or not they are
//                ancestors.
//   diff(a, b) – property-level differences, plus elements that appeared or
//                vanished (which is how tooltips and labels get caught).
//   settle()   – waits for transitions to finish instead of guessing a delay,
//                so we compare settled states rather than mid-animation frames.
//
// USAGE (the pointer must be real — synthetic events cannot set `:hover`)
//
//   1. inject this file
//   2. __hv.mark('supportBtn', '[aria-label="Support"]')   // rest snapshot
//   3. drive a real pointer onto the control
//   4. __hv.report('supportBtn')                           // diff vs rest
//
// Step 3 is the only part that needs the browser driver; everything else is in
// the page. That is deliberate: it makes the sweep a loop over a selector list
// rather than a human staring at screenshots.

(() => {
  const PROPS = [
    'opacity', 'backgroundColor', 'backgroundImage', 'color', 'boxShadow',
    'borderTopColor', 'borderTopWidth', 'borderRadius', 'outlineColor',
    'outlineWidth', 'outlineStyle', 'transform', 'filter', 'textDecorationLine',
    'fontWeight', 'letterSpacing', 'visibility', 'clipPath', 'transitionProperty',
    'transitionDuration', 'transitionTimingFunction', 'zIndex',
  ];

  /** A stable-enough identity for an element across two snapshots. */
  const key = (el, i) => {
    const r = el.getBoundingClientRect();
    return [
      el.tagName,
      el.getAttribute('aria-label') || '',
      Math.round(r.left), Math.round(r.top),
      Math.round(r.width), Math.round(r.height),
      i,
    ].join('|');
  };

  const readOne = (el, pseudo) => {
    const c = getComputedStyle(el, pseudo);
    const out = {};
    for (const p of PROPS) out[p] = c[p];
    // A ::before/::after with no content is not painted; recording it would
    // bury the real diffs in noise.
    if (pseudo && (c.content === 'none' || c.content === 'normal')) return null;
    return out;
  };

  /**
   * Every element intersecting the target's box. Overlays are usually exactly
   * the size of the control, so an intersection test finds them regardless of
   * where they sit in the tree.
   */
  const region = (target) => {
    const t = target.getBoundingClientRect();
    const pad = 24; // tooltips and labels land just outside the control
    const hits = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right < t.left - pad || r.left > t.right + pad) continue;
      if (r.bottom < t.top - pad || r.top > t.bottom + pad) continue;
      // Skip huge containers — they intersect everything and change nothing.
      if (r.width > t.width * 6 && r.height > t.height * 6) continue;
      hits.push(el);
    }
    return hits;
  };

  const snap = (sel) => {
    const target = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!target) return null;
    const out = {};
    region(target).forEach((el, i) => {
      const k = key(el, i);
      const rect = el.getBoundingClientRect();
      out[k] = {
        self: readOne(el, null),
        before: readOne(el, '::before'),
        after: readOne(el, '::after'),
        text: (el.childNodes.length === 1 && el.firstChild.nodeType === 3)
          ? el.textContent.trim().slice(0, 40) : '',
        rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)],
      };
    });
    return out;
  };

  /**
   * Resolve once no transition or animation is running. Meet's state changes are
   * transitions, so sampling too early reads a mid-curve value and sampling on a
   * fixed timeout is a guess. This also records how long settling took, which is
   * itself a measurement worth having.
   */
  const settle = async (maxMs = 1200) => {
    const t0 = performance.now();
    for (;;) {
      const running = document.getAnimations().filter((a) => a.playState === 'running');
      if (!running.length) break;
      if (performance.now() - t0 > maxMs) break;
      await new Promise((r) => requestAnimationFrame(r));
    }
    // One extra frame so the final computed values are committed.
    await new Promise((r) => requestAnimationFrame(r));
    return Math.round(performance.now() - t0);
  };

  const diffProps = (a, b) => {
    const changed = {};
    if (!a && !b) return null;
    if (!a || !b) return { existence: [!!a, !!b] };
    for (const p of PROPS) {
      if (a[p] !== b[p]) changed[p] = [a[p], b[p]];
    }
    return Object.keys(changed).length ? changed : null;
  };

  const diff = (before, after) => {
    const out = { changed: [], appeared: [], vanished: [] };
    if (!before || !after) return out;
    for (const k of Object.keys(after)) {
      if (!(k in before)) { out.appeared.push({ k, text: after[k].text, rect: after[k].rect }); continue; }
      const d = {};
      for (const slot of ['self', 'before', 'after']) {
        const c = diffProps(before[k][slot], after[k][slot]);
        if (c) d[slot] = c;
      }
      const ra = before[k].rect.join(','), rb = after[k].rect.join(',');
      if (ra !== rb) d.rect = [ra, rb];
      if (Object.keys(d).length) out.changed.push({ k, text: after[k].text, d });
    }
    for (const k of Object.keys(before)) {
      if (!(k in after)) out.vanished.push({ k, text: before[k].text });
    }
    return out;
  };

  const store = new Map();

  window.__hv = {
    /** Record the rest state of a control before the pointer arrives. */
    mark(name, sel) {
      const s = snap(sel);
      store.set(name, { sel, before: s });
      return s ? Object.keys(s).length + ' elements in region' : 'SELECTOR MISS: ' + sel;
    },
    /** Diff the current (hovered/focused/pressed) state against the mark. */
    async report(name) {
      const rec = store.get(name);
      if (!rec) return 'no mark: ' + name;
      const settled = await settle();
      const after = snap(rec.sel);
      const d = diff(rec.before, after);
      return {
        name,
        settledMs: settled,
        changed: d.changed.length,
        appeared: d.appeared.length,
        detail: d,
      };
    },
    snap,
    settle,
    /**
     * Candidate controls on a Meet-like screen. Anything focusable or carrying
     * an accessible name, deduped by box, so the sweep does not need a
     * hand-written list per screen and cannot silently skip a control.
     */
    controls() {
      const seen = new Set();
      const out = [];
      const sel = 'button,a,input,[role="button"],[role="tab"],[role="link"],[tabindex],[aria-label]';
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 12 || r.height < 12) continue;
        const box = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(',');
        if (seen.has(box)) continue;
        seen.add(box);
        out.push({
          name: (el.getAttribute('aria-label') || el.innerText || el.placeholder || el.tagName)
            .replace(/\s+/g, ' ').trim().slice(0, 34),
          cx: Math.round(r.left + r.width / 2),
          cy: Math.round(r.top + r.height / 2),
          box,
        });
      }
      return out;
    },
  };
  return 'hover-sweep ready';
})();
