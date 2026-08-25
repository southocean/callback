/**
 * A computed-style fingerprint of the whole app, for refactoring the stylesheet
 * without changing what it renders.
 *
 * styles.css reached 6,253 lines and 1,654 rule blocks by accretion — each round
 * of QA appended a new section, and 128 selectors ended up declared more than
 * once. That is how the #ffc83d ghost survived: a rule from a superseded draft
 * kept winning because nothing ever deleted it. Consolidating is worth doing,
 * but a stylesheet refactor is the easiest kind of change to get silently wrong,
 * so it needs evidence rather than confidence.
 *
 * The method: walk the app through every state, and for each element record the
 * FULL computed style — all ~340 longhand properties — hashed to a short string.
 * A path built from the element's ancestry keys it. Then diff the hashes before
 * and after. Nothing visual can change without a hash changing, and any hash
 * that does change can be re-dumped in full to see exactly which property moved.
 *
 * Hashing rather than storing means full coverage at a size that fits in a tool
 * result, which matters because a curated property list would have to guess in
 * advance which properties the refactor might disturb — and the whole point is
 * that we do not know.
 *
 * Usage. The page has a strict CSP (script-src 'self'), so this has to be
 * served from the same origin rather than eval'd:
 *
 *   cp tools/css-snapshot.js docs/         # then, in the page:
 *   localStorage.removeItem('callback.quests')   // and callback.ready
 *   location.reload()                             // MUST reload — see __cssReset
 *   <script src="./css-snapshot.js">  then  await window.__cssSnap()
 *
 * Run it once on the old stylesheet, store the result, run it again on the new
 * one, and compare. Always run the control too — the same stylesheet twice —
 * because a harness that has not been shown to be stable is not evidence.
 *
 * Remove the copy from docs/ before committing; it is a tool, not part of the
 * published site.
 */
(() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * Subtrees whose presence or progress depends on the clock, so they cannot be
   * compared across two runs.
   *
   * Both entries were found by the harness rather than guessed, and each took a
   * run to surface:
   *
   *   .end-timer   the countdown ring drains over sixty seconds, so its
   *                stroke-dashoffset is whatever frame the capture lands on.
   *   .quest-tray  the achievement toasts auto-dismiss on a timer, so whether
   *                one is on screen at capture time is a race. This one showed up
   *                as 36 "gone" elements in exactly the states where a quest
   *                unlocks — hand-raised, tray-open, and the three shares.
   *
   * Excluded rather than frozen. Freezing the ring was tried and still flaked,
   * because pinning a property after layout has resolved it does not undo the
   * frame it was resolved on. Two small subtrees with one animated property each
   * are cheap to check by hand, and a verdict that quietly includes a coin flip
   * is worse than one with a stated hole in it.
   */
  const TRANSIENT = '.end-timer, .quest-tray';

  /** djb2, enough to notice a one-character change and cheap on ~1000 nodes. */
  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };

  /**
   * A path that survives a re-render. Tag plus sorted class list plus the index
   * among siblings that share it — class order in the attribute is not stable
   * when script toggles classes, so it is sorted before use.
   */
  const pathOf = (el) => {
    const parts = [];
    let n = el;
    while (n && n.nodeType === 1 && parts.length < 14) {
      const cls = (typeof n.className === 'string' ? n.className : '')
        .trim().split(/\s+/).filter(Boolean).sort().join('.');
      const key = n.tagName.toLowerCase() + (cls ? '.' + cls : '');
      const twins = n.parentElement
        ? [...n.parentElement.children].filter((c) => {
            const cc = (typeof c.className === 'string' ? c.className : '')
              .trim().split(/\s+/).filter(Boolean).sort().join('.');
            return c.tagName.toLowerCase() + (cc ? '.' + cc : '') === key;
          })
        : [n];
      parts.unshift(twins.length > 1 ? key + ':' + twins.indexOf(n) : key);
      n = n.parentElement;
    }
    return parts.join('>');
  };

  /**
   * Freeze everything that legitimately differs between two runs.
   *
   * The clock was the subtle one. Its text is the wall time, so its width
   * changes as the minute rolls, and because it is a flex sibling that MOVES
   * EVERY CONTROL BESIDE IT — the info button, the whole top-right cluster. A
   * fingerprint that includes geometry will report those as changes and they have
   * nothing to do with the stylesheet. Excluding the clock alone would not have
   * helped; the damage is to its neighbours.
   *
   * The quest counter is the same story in miniature: "4/17" and "7/17" are
   * different widths.
   *
   * Called immediately before each capture, so the interval that repaints the
   * clock cannot get between the two.
   */
  const freeze = () => {
    for (const [sel, text] of [
      ['.call-clock', '00:00 AM'],
      ['.dk-clock b', '00:00'],
      ['.dk-clock i', '01/01/2000'],
      ['.dk-weather', '0°C  Frozen'],

      ['.wx-status span', 'frozen'],
    ]) {
      for (const el of document.querySelectorAll(sel)) el.textContent = text;
    }
    // Anything whose text is a bare clock, wherever it lives.
    for (const el of document.querySelectorAll('span,div,b,i')) {
      if (el.children.length === 0 && /^\d{1,2}:\d{2}(\s?[AP]M)?$/.test((el.textContent || '').trim())) {
        el.textContent = '00:00';
      }
      // "Side quests 4/17" and "…7/17" are different widths, and the tray they
      // sit in is a flex row, so the count drags its neighbours too.
      if (el.children.length === 0 && /^Side quests \d+\/\d+$/.test((el.textContent || '').trim())) {
        el.textContent = 'Side quests 0/17';
      }
    }
    /*
     * The end screen's countdown ring drains over sixty seconds, so its
     * stroke-dashoffset is whatever the clock says at the instant of capture.
     * The control run found this and nothing else — five elements inside
     * .end-timer, every other state byte-identical — which is the harness
     * earning its keep: a long animation sampled at an arbitrary moment is
     * noise, not evidence.
     *
     * Pinned rather than skipped, so the ring's static properties are still
     * compared and only its progress is held still.
     */
    for (const el of document.querySelectorAll('.end-arc')) {
      el.style.animation = 'none';
      el.style.strokeDashoffset = '0';
    }
    for (const el of document.querySelectorAll('.end-n')) el.textContent = '60';
  };

  /** Every element's full computed style, hashed. */
  const capture = (label, sig) => {
    freeze();
    for (const el of document.querySelectorAll('*')) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      /*
       * The end screen's countdown ring is excluded, not frozen.
       *
       * Freezing it was not enough: the ring drains over sixty seconds, and
       * pinning stroke-dashoffset at capture time still leaves the value the
       * layout engine had already resolved, so two runs agree only when they
       * happen to land on the same rounded frame. One control run was clean and
       * the next flagged the same five nodes, which is the signature of a flake
       * rather than a finding.
       *
       * Five elements with one animated property between them are cheap to check
       * by hand, and excluding them is honest. Pretending a flaky signal is a
       * real one would make every future verdict worth less.
       */
      if (el.closest(TRANSIENT)) continue;
      const cs = getComputedStyle(el);
      let acc = '';
      for (let i = 0; i < cs.length; i++) {
        const p = cs[i];
        acc += p + ':' + cs.getPropertyValue(p) + ';';
      }
      const r = el.getBoundingClientRect();
      // Geometry too: a cascade change can move a box without altering any
      // property on the box itself.
      acc += '@' + Math.round(r.width) + 'x' + Math.round(r.height)
           + '+' + Math.round(r.left) + ',' + Math.round(r.top);
      const key = label + ' ' + pathOf(el);
      // Collisions mean the path was not unique; count them so a silent
      // undercount cannot be mistaken for agreement.
      if (sig[key]) sig[key] = 'DUP:' + sig[key];
      else sig[key] = hash(acc);
    }
  };

  const q = (sel) => document.querySelector(sel);
  const byLabel = (sel, re) => [...document.querySelectorAll(sel)]
    .find((e) => re.test(e.getAttribute('aria-label') || ''));
  const byText = (sel, re) => [...document.querySelectorAll(sel)]
    .find((e) => re.test((e.textContent || '').trim()));

  const go = async (hashStr, wait = 1500) => {
    location.hash = hashStr;
    await sleep(wait);
  };

  /** Open the share picker and pick a source by its tab and row. */
  const share = async (tab, rowRe) => {
    const b = byLabel('button.cbtn', /^Share screen$/);
    if (!b) return false;
    b.click();
    await sleep(900);
    const t = byText('.sp-tab', new RegExp('^' + tab + '$'));
    if (t) { t.click(); await sleep(350); }
    if (rowRe) { const r = byText('.sp-row', rowRe); if (r) { r.click(); await sleep(250); } }
    const go2 = byText('button', /^Share$/);
    if (go2) { go2.click(); await sleep(1600); }
    return true;
  };

  const stopShare = async () => {
    const s = byText('button', /Stop sharing/i);
    if (s) { s.click(); await sleep(500); }
  };

  /**
   * Clear the app's persisted state and reload.
   *
   * This has to exist, and finding out why was the most useful thing the harness
   * did. The first before/after comparison reported all 26 states changed and 289
   * FEWER elements — impossible from a CSS-only edit. The cause: the app persists
   * `callback.quests` and `callback.ready` in localStorage, and the baseline run
   * itself unlocks quests as it raises a hand and shares a screen. So run two
   * started with a different quest count, a different tray, and a different DOM.
   *
   * A fingerprint is only evidence if both sides start from the same place. Call
   * this, let the page reload, then run __cssSnap. The harness's own unlocking is
   * fine because it visits states in a fixed order, so progression is identical
   * at each capture point on both sides.
   */
  window.__cssReset = () => {
    for (const k of ['callback.quests', 'callback.ready']) localStorage.removeItem(k);
    location.hash = '#home';
    location.reload();
  };

  window.__cssSnap = async () => {
    const dirty = ['callback.quests', 'callback.ready'].filter((k) => localStorage.getItem(k) !== null);
    if (dirty.length) {
      return { error: 'persisted app state present: ' + dirty.join(', ')
        + ' — call __cssReset() and re-run, or the comparison is meaningless' };
    }
    const sig = {};
    const seen = [];
    const at = async (label, fn) => {
      if (fn) await fn();
      capture(label, sig);
      seen.push(label);
    };

    // --- the plain screens ------------------------------------------------
    await go('#home');       await at('home');
    await go('#built');      await at('built');
    await go('#calls');      await at('calls');
    await go('#lobby', 2200);await at('lobby');
    await go('#plain', 2000);await at('plain');
    await go('#ended', 1800);await at('ended');

    // --- the call, and every panel ---------------------------------------
    await go('#call', 2600); await at('call');
    for (const p of ['chat', 'people', 'about', 'tools', 'host', 'present', 'offclock']) {
      await go('#' + p, 1700);
      await at('panel-' + p);
    }

    // --- in-call states --------------------------------------------------
    await go('#call', 1800);
    await at('hand-raised', async () => {
      const b = byLabel('button.cbtn', /^Raise hand$/);
      if (b) { b.click(); await sleep(1800); }
    });
    await at('hand-popup', async () => {
      const w = q('.hand-chip-wrap');
      if (w) { w.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true })); await sleep(500); }
    });
    await at('count-popup', async () => {
      const w = q('.count-wrap');
      if (w) { w.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true })); await sleep(500); }
    });
    await at('tray-open', async () => {
      const b = byLabel('button.cbtn', /^Send a reaction$/);
      if (b) { b.click(); await sleep(700); }
    });
    await at('audio-row', async () => {
      const b = byLabel('button.chev', /^Audio settings$/);
      if (b) { b.click(); await sleep(700); }
    });
    await at('video-row', async () => {
      const b = byLabel('button.chev', /^Video settings$/);
      if (b) { b.click(); await sleep(700); }
    });
    await at('captions-on', async () => {
      const b = byLabel('button.cbtn', /captions/i);
      if (b) { b.click(); await sleep(900); }
    });
    await at('overflow-menu', async () => {
      const b = byLabel('button.cbtn', /^More options$/);
      if (b) { b.click(); await sleep(600); }
    });

    // --- sharing ----------------------------------------------------------
    await go('#call', 1800);
    await at('share-picker', async () => {
      const b = byLabel('button.cbtn', /^Share screen$/);
      if (b) { b.click(); await sleep(1000); }
    });
    await at('share-screen', async () => {
      const c = byText('button', /^Cancel$/); if (c) { c.click(); await sleep(400); }
      await share('Entire Screen');
    });
    await at('share-window', async () => { await stopShare(); await share('Window'); });
    await at('share-tab-cv', async () => { await stopShare(); await share('Chrome Tab', /Senior SWE/); });
    await stopShare();

    // The full map stays in the page — 25 states x ~1000 elements is far too
    // much to hand back through a tool result. What comes back is one digest
    // per state plus a grand total, which is all a before/after diff needs; if a
    // digest moves, __cssDiff drills into that state and names the elements.
    window.__cssSig = sig;
    const perState = {};
    for (const label of seen) {
      const keys = Object.keys(sig).filter((k) => k.startsWith(label + ' ')).sort();
      perState[label] = keys.length + ':' + hash(keys.map((k) => k + '=' + sig[k]).join('|'));
    }
    const all = Object.keys(sig).sort();
    return {
      states: seen.length,
      elements: all.length,
      dups: all.filter((k) => String(sig[k]).startsWith('DUP:')).length,
      total: hash(all.map((k) => k + '=' + sig[k]).join('|')),
      perState,
    };
  };

  /**
   * Diff a stored baseline against the live page. Pass the baseline's sig back
   * in and it reports which elements changed and, for the first few, which
   * properties — so a moved value can be traced to the rule that moved it.
   */
  window.__cssDiff = (baseSig, limit = 25) => {
    const live = window.__cssSig || {};
    const keys = new Set([...Object.keys(baseSig), ...Object.keys(live)]);
    const changed = [], gone = [], added = [];
    for (const k of keys) {
      if (!(k in live)) gone.push(k);
      else if (!(k in baseSig)) added.push(k);
      else if (baseSig[k] !== live[k]) changed.push(k);
    }
    return {
      changed: changed.length, gone: gone.length, added: added.length,
      sampleChanged: changed.slice(0, limit),
      sampleGone: gone.slice(0, limit),
      sampleAdded: added.slice(0, limit),
    };
  };
  return 'ready';
})();
