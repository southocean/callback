// Style fingerprint extractor.
//
// Paste-and-run in a browser tab. It walks every visible element and records a
// normalised description: what it is, where it is, and every style property that
// can make a clone look wrong. Run it on meet.google.com/home, run it on ours,
// diff the two, fix what differs, repeat.
//
// This exists because eyeballing does not scale and screenshots of a logged-in
// page cannot be written to disk from this toolchain. Numbers can.
//
// Usage:
//   const ref = fingerprint();        // on Meet
//   const got = fingerprint();        // on ours
//   diff(ref, got);                   // -> list of mismatches
//
// Matching is by semantic key, not DOM order, because the two trees have
// nothing in common structurally. A key is the accessible name, or the text, or
// a role guess from geometry — whichever is stable across both.

globalThis.fingerprint = function fingerprint() {
  const R = (n) => Math.round(n * 10) / 10;
  const px = (v) => (v === 'normal' || v === 'none' ? v : v);

  const interesting = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return false;
    if (r.top > window.innerHeight || r.bottom < 0) return false;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.opacity === '0' || s.display === 'none') return false;
    // Skip pure wrappers: no text of their own, no background, no border.
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const painted = s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.borderStyle !== 'none'
      || s.backgroundImage !== 'none';
    const isControl = /^(BUTTON|INPUT|A|I|IMG|SVG)$/.test(el.tagName);
    return ownText || painted || isControl;
  };

  /** A key that means the same thing on both sites. */
  const keyOf = (el) => {
    const aria = el.getAttribute('aria-label');
    if (aria) return 'aria:' + aria.toLowerCase().split(/[—–\-|(]/)[0].trim();
    const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    if (txt && txt.length <= 40) return 'txt:' + txt.toLowerCase();
    if (el.tagName === 'INPUT') return 'input:' + (el.placeholder || '').toLowerCase();
    return null;
  };

  const out = [];
  for (const el of document.querySelectorAll('*')) {
    if (!interesting(el)) continue;
    const key = keyOf(el);
    if (!key) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    out.push({
      key,
      tag: el.tagName.toLowerCase(),
      x: R(r.x), y: R(r.y), w: R(r.width), h: R(r.height),
      font: s.fontFamily.split(',')[0].replace(/["']/g, ''),
      size: s.fontSize, weight: s.fontWeight, lh: s.lineHeight, ls: px(s.letterSpacing),
      color: s.color, bg: s.backgroundColor,
      radius: s.borderRadius, pad: s.padding, gap: px(s.gap),
      border: s.borderStyle === 'none' ? 'none' : `${s.borderWidth} ${s.borderStyle} ${s.borderColor}`,
      transform: s.textTransform,
    });
  }
  // De-duplicate: nested elements often share a key; keep the innermost, which
  // is the one that actually carries the type.
  const best = new Map();
  for (const e of out) {
    const prev = best.get(e.key);
    if (!prev || e.w * e.h < prev.w * prev.h) best.set(e.key, e);
  }
  return { viewport: `${window.innerWidth}x${window.innerHeight}`, items: [...best.values()] };
};

globalThis.diff = function diff(ref, got, opts = {}) {
  const tol = opts.tol ?? 2;
  const skipGeometry = new Set(opts.skipGeometry ?? []);
  const gotMap = new Map(got.items.map((i) => [i.key, i]));
  const report = { viewport: { ref: ref.viewport, got: got.viewport }, missing: [], extra: [], mismatches: [] };

  for (const a of ref.items) {
    const b = gotMap.get(a.key);
    if (!b) { report.missing.push(a.key); continue; }
    gotMap.delete(a.key);
    const bad = [];
    // Style properties must match exactly — these are what make it look wrong.
    for (const p of ['font', 'size', 'weight', 'lh', 'ls', 'color', 'bg', 'radius', 'pad', 'transform']) {
      if (String(a[p]) !== String(b[p])) bad.push(`${p}: ${b[p]}  ≠  ${a[p]}`);
    }
    // Geometry with a tolerance, and skippable where the content differs on purpose.
    if (!skipGeometry.has(a.key)) {
      for (const p of ['x', 'y', 'w', 'h']) {
        if (Math.abs(a[p] - b[p]) > tol) bad.push(`${p}: ${b[p]}  ≠  ${a[p]}`);
      }
    }
    if (bad.length) report.mismatches.push({ key: a.key, problems: bad });
  }
  report.extra = [...gotMap.keys()];
  report.summary = `${report.mismatches.length} mismatched, ${report.missing.length} missing, ${report.extra.length} extra`;
  return report;
};

'fingerprint() and diff() installed';
