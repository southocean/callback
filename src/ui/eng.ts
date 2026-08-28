// Meeting tools.
//
// Meet keeps whiteboards and polls behind this button. This keeps the technical
// case: the spec the interface was rebuilt from, the test suite, a live
// accessibility audit, measured bundle size, the effects pipeline, a network
// simulator, and a map against the job ad.
//
// One door, so the story in the tiles stays a story (review U7).

import { h, clear } from '../dom.js';
import type { Store, EngTab, NetProfile } from '../state.js';
import { surfaces, geometry, barLayout, flow, method, stats } from '../data/spec.js';
import type { Group } from '../data/spec.js';
import { audit } from '../a11y.js';
import { run, total } from '../test/suite.js';
import type { Result } from '../test/suite.js';
import { sample, policy, profiles } from '../net/degrade.js';
import type { Profile } from '../net/degrade.js';
import type { Quests } from '../achievements.js';

/** One day of history, `d` as yyyy-mm-dd. Stamped by build.mjs from git log. */
export interface CommitDay { d: string; n: number }

interface Build {
  jsGzip: number; jsRaw: number; cssGzip: number; budget: number; deps: number; commit: string;
  commits: CommitDay[];
}

export function buildMeta(): Build {
  const el = document.getElementById('build-meta');
  const fallback: Build = {
    jsGzip: 0, jsRaw: 0, cssGzip: 0, budget: 61440, deps: 0, commit: 'dev', commits: [],
  };
  if (!el?.textContent) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(el.textContent) as Partial<Build>) };
  } catch {
    return fallback;
  }
}

/**
 * Five tabs, in Nam's order.
 *
 * Two are gone because they were answering questions asked better elsewhere:
 *
 *   The job ad  -- the requirement map already has a home in the About panel,
 *                  and the mock Chrome opens the posting itself. Three copies of
 *                  one thing is how they start disagreeing.
 *   Design      -- Nam: "its not super relevant to this and I also want to keep
 *                  some mystery." His call; the measurements it published are
 *                  still in data/design.ts for anyone who goes looking.
 *
 * Effects is still here and probably should not be -- see the note on fxView.
 */
const TABS: { id: EngTab; label: string }[] = [
  { id: 'spec', label: 'Spec' },
  { id: 'perf', label: 'Size & perf' },
  { id: 'a11y', label: 'Accessibility' },
  { id: 'net', label: 'Network' },
  { id: 'tests', label: 'Tests' },
];

export function renderEng(
  store: Store,
  quests: Quests,
): HTMLElement {
  const body = h('div', {});
  const tabs = h(
    'div',
    { class: 'tabs', role: 'tablist', 'aria-label': 'Meeting tools' },
    ...TABS.map((t) =>
      h(
        'button',
        {
          class: 'tab', type: 'button', role: 'tab', 'aria-selected': 'false', 'data-tab': t.id,
          onclick: () => store.dispatch({ t: 'engTab', tab: t.id }),
        },
        t.label,
      ),
    ),
  );

  const draw = (): void => {
    const tab = store.get().engTab;
    for (const b of tabs.querySelectorAll('button')) {
      b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false');
    }
    clear(body);
    body.appendChild(view(tab, store, quests));
  };

  draw();
  store.subscribe(draw);
  return h('div', { style: 'display:contents' }, tabs, h('div', { class: 'side-body' }, body));
}

function view(
  tab: EngTab,
  store: Store,
  quests: Quests,
): HTMLElement {
  switch (tab) {
    case 'spec': return specView(quests);
    case 'tests': return testsView(store);
    case 'a11y': return a11yView();
    case 'perf': return perfView();
    case 'net': return netView(store);
  }
}

// ------------------------------------------------------------------- spec ----

function swatches(g: Group): HTMLElement {
  return h(
    'div',
    {},
    h('p', { class: 'pnote' }, g.note),
    ...g.tokens.map((t) =>
      h(
        'div',
        { class: 'tok' },
        t.value.startsWith('#')
          ? h('span', { class: 'tok-chip', style: `background:${t.value}` })
          : h('span', { class: 'tok-num' }, t.value),
        h('span', {}, h('b', {}, t.name), h('span', { class: 'tok-where' }, t.where)),
        t.value.startsWith('#') ? h('code', { class: 'tok-hex' }, t.value) : h('span', {}),
      ),
    ),
  );
}

function specView(quests: Quests): HTMLElement {
  quests.unlock('spec');
  return h(
    'div',
    {},
    h(
      'p',
      { class: 'pnote' },
      'This interface is a rebuild of Google Meet, measured rather than eyeballed. ',
      h('b', {}, `${stats.tokens} tokens`),
      ' and every layout number below were read off the live product, computed styles and bounding boxes from the ' +
        'real DOM, across all four screens, then implemented from scratch. No Google stylesheet, font or asset is ' +
        'used or shipped.',
    ),

    h('div', { class: 'shead' }, surfaces.title),
    swatches(surfaces),

    h('div', { class: 'shead' }, geometry.title),
    swatches(geometry),

    h('div', { class: 'shead' }, barLayout.title),
    h('p', { class: 'pnote' }, barLayout.note),
    h(
      'div',
      { class: 'bar-spec' },
      ...barLayout.units.map((u) =>
        h('div', { class: 'bar-spec-row' }, h('b', {}, u.label), h('code', {}, `${u.w}px`), h('span', {}, u.note)),
      ),
    ),
    h('p', { class: 'pnote' }, barLayout.right),

    h('div', { class: 'shead' }, flow.title),
    h('p', { class: 'pnote' }, flow.note),
    ...flow.steps.map((s) =>
      h('div', { class: 'phase' }, h('h4', {}, `${s.name}  `, h('code', {}, s.id)), h('p', {}, s.body)),
    ),

    h('div', { class: 'shead' }, 'Where it deliberately differs'),
    h(
      'p',
      { class: 'pnote' },
      'A faithful clone would be an empty call. These are the seven places the flow diverges, and why.',
    ),
    ...flow.deviations.map((d) =>
      h('div', { class: 'finding' }, h('div', { class: 'finding-body', style: 'padding-top:12px' },
        h('h4', { style: 'font-size:14px;margin-bottom:5px;color:#fff' }, d.what),
        h('p', { class: 'pnote', style: 'margin:0' }, d.body),
      )),
    ),

    h('div', { class: 'shead' }, method.title),
    h('ol', { class: 'actions-list' }, ...method.steps.map((s) => h('li', {}, s))),
    h('p', { class: 'fx-warn' }, method.honest),
  );
}

// ------------------------------------------------------------------ tests ----

function testsView(store: Store): HTMLElement {
  const out = h('div', {});
  const tally = h('span', { class: 'test-tally' }, `${total} tests`);
  const results = h('div', {});

  const chaosBox = h('input', {
    type: 'checkbox', id: 'chaos', checked: store.get().chaos,
    onchange: (e: Event) => { store.dispatch({ t: 'chaos', on: (e.target as HTMLInputElement).checked }); void go(); },
  });

  async function go(): Promise<void> {
    tally.textContent = 'running…';
    tally.className = 'test-tally';
    clear(results);
    paint(await run(store.get().chaos));
  }

  function paint(rs: Result[]): void {
    const failed = rs.filter((r) => !r.pass);
    const ms = rs.reduce((a, r) => a + r.ms, 0);
    tally.textContent = `${rs.length - failed.length}/${rs.length} passing · ${ms.toFixed(0)}ms`;
    tally.className = `test-tally ${failed.length ? 'fail' : 'pass'}`;
    clear(results);
    let suite = '';
    for (const r of rs) {
      if (r.suite !== suite) { suite = r.suite; results.appendChild(h('div', { class: 'shead' }, suite)); }
      results.appendChild(
        h(
          'div',
          { class: `test ${r.pass ? 'pass' : 'fail'}` },
          h('span', { class: 'test-mark' }, r.pass ? '✓' : '✕'),
          h('span', { class: 'test-name' }, r.name, !r.pass && r.error ? h('div', { class: 'test-err' }, r.error) : null),
          h('span', { class: 'test-ms' }, `${r.ms.toFixed(1)}ms`),
        ),
      );
    }
  }

  out.append(
    h(
      'p',
      { class: 'pnote' },
      'The project’s unit tests, executed here, in your browser, right now, the same file CI runs on every push. ' +
        'They cover the state reducer, the router, timeline geometry, the caption scheduler, the network model and ' +
        'shader parameter clamping.',
    ),
    h(
      'div',
      { class: 'test-run' },
      tally,
      h('button', { class: 'mbtn fill', type: 'button', onclick: () => void go() }, 'Run again'),
      h('label', { class: 'switch', for: 'chaos' }, chaosBox, 'Chaos mode'),
    ),
    h(
      'p',
      { class: 'pnote' },
      'Chaos mode injects a real fault. A runner that cannot be made to fail is a screenshot of green ticks, so ' +
        'here is the switch, turn it on and watch one go red with the assertion it actually threw.',
    ),
    results,
  );
  void go();
  return out;
}

// ---------------------------------------------------------- accessibility ----

function a11yView(): HTMLElement {
  const list = h('div', {});
  const draw = (): void => {
    const checks = audit();
    const failed = checks.filter((c) => !c.pass).length;
    clear(list);
    list.appendChild(
      h('p', { class: `test-tally ${failed ? 'fail' : 'pass'}` },
        failed ? `${failed} of ${checks.length} checks failing` : `${checks.length} checks passing`),
    );
    for (const c of checks) {
      list.appendChild(
        h(
          'div',
          { class: `check ${c.pass ? 'pass' : 'fail'}` },
          h('span', { class: 'check-mark' }, c.pass ? '✓' : '✕'),
          h('span', {}, h('div', { class: 'check-name' }, c.name), h('div', { class: 'check-detail' }, c.detail)),
        ),
      );
    }
  };
  draw();

  return h(
    'div',
    {},
    h(
      'p',
      { class: 'pnote' },
      'Assertions against the document as it exists on your screen this second, not a list of intentions. Some ' +
        'depend on what is open, so re-run it with a panel showing and watch the numbers move. It is allowed to ' +
        'fail, a panel that always says PASS is a picture.',
    ),
    h(
      'p',
      { class: 'pnote' },
      h('b', {}, 'Try it: '),
      'tab from the top. One stop gets you into the tile grid and the arrow keys move inside it. ',
      h('kbd', {}, 'Esc'),
      ' closes any panel and returns focus to the control that opened it. ',
      h('kbd', {}, '?'),
      ' lists the rest.',
    ),
    h('div', { class: 'test-run' }, h('button', { class: 'mbtn fill', type: 'button', onclick: draw }, 'Re-run audit')),
    list,
  );
}

// ------------------------------------------------------------ size & perf ----

function stat(k: string, v: string, cls: string): HTMLElement {
  return h('div', { class: 'stat' }, h('div', { class: 'stat-k' }, k), h('div', { class: `stat-v ${cls}` }, v));
}

function perfView(): HTMLElement {
  const b = buildMeta();
  const pct = b.budget ? ((b.jsGzip / b.budget) * 100).toFixed(1) : '0';
  return h(
    'div',
    {},
    h(
      'p',
      { class: 'pnote' },
      'Measured at build time and stamped into the page, not typed in by hand. If the bundle goes over budget the ' +
        'build exits non-zero and CI goes red, so the number cannot drift from the truth.',
    ),
    h(
      'div',
      { class: 'stat-grid' },
      stat('JS, gzipped', `${(b.jsGzip / 1024).toFixed(1)} kB`, b.jsGzip <= b.budget ? 'good' : 'bad'),
      stat('Budget', `${(b.budget / 1024).toFixed(0)} kB`, ''),
      stat('Used', `${pct}%`, Number(pct) < 85 ? 'good' : 'warn'),
      stat('Runtime dependencies', String(b.deps), b.deps === 0 ? 'good' : 'warn'),
      stat('CSS, gzipped', `${(b.cssGzip / 1024).toFixed(1)} kB`, ''),
      stat('Third-party origins', '2', 'warn'),
    ),
    h(
      'dl',
      { class: 'kv' },
      h('dt', {}, 'Framework'), h('dd', { class: 'good' }, 'none'),
      h('dt', {}, 'View layer'), h('dd', {}, 'a 20-line h() helper'),
      h('dt', {}, 'Icons'), h('dd', {}, `${stats.icons} inline SVG paths`),
      h('dt', {}, 'Build'), h('dd', {}, b.commit),
    ),
    h(
      'p',
      { class: 'pnote' },
      h('b', {}, 'Verify it yourself: '),
      'open DevTools, Network tab, reload. Everything leaving this origin goes to Google’s own font CDN and nothing ' +
        'else. Google Sans, Google Sans Text and Product Sans are not open source, the licence says so in as many ' +
        'words, so they are linked from the Fonts API rather than copied, which is the licensed way to use them. ' +
        'No analytics, no tracking, no backend. Which is why the camera stream has nowhere to go even if it wanted one.',
    ),
  );
}
// ---------------------------------------------------------------- network ----

function netView(store: Store): HTMLElement {
  const out = h('div', {});
  const readout = h('div', {});
  const list: Profile[] = ['good', 'shaky', 'hotel', 'collapse'];
  let seed = 0;

  const grid = h(
    'div',
    { class: 'net-grid' },
    ...list.map((p) =>
      h('button', {
        class: 'fx-btn', type: 'button', 'aria-pressed': 'false', 'data-net': p,
        onclick: () => store.dispatch({ t: 'net', profile: p as NetProfile }),
      }, profiles[p].label),
    ),
  );

  const draw = (): void => {
    const s = store.get();
    for (const b of grid.querySelectorAll('button')) {
      b.setAttribute('aria-pressed', b.getAttribute('data-net') === s.net ? 'true' : 'false');
    }
    const c = sample(s.net as Profile, seed);
    const pol = policy(c);
    clear(readout);
    readout.append(
      h(
        'div',
        { class: 'stat-grid' },
        stat('Round trip', `${c.rtt} ms`, c.rtt > 400 ? 'bad' : c.rtt > 150 ? 'warn' : 'good'),
        stat('Packet loss', `${(c.loss * 100).toFixed(1)}%`, c.loss > 0.15 ? 'bad' : c.loss > 0.03 ? 'warn' : 'good'),
        stat('Jitter', `${c.jitter} ms`, c.jitter > 100 ? 'bad' : c.jitter > 25 ? 'warn' : 'good'),
        stat('Encoder settles at', `${c.height}p`, c.height < 360 ? 'bad' : c.height < 720 ? 'warn' : 'good'),
      ),
      h('p', { class: 'policy' }, h('b', {}, 'What a client should do: '), pol.action),
      h('p', { class: 'pnote', style: 'margin-top:12px' }, c.note),
    );
  };

  draw();
  store.subscribe(draw);
  window.setInterval(() => { seed++; draw(); }, 1600);

  out.append(
    h(
      'p',
      { class: 'pnote' },
      'A video client’s hard problems are not on the happy path. This models the one from the case study, four ' +
        'players on four networks, one of them in a hotel, with a seeded generator, so the same seed always gives ' +
        'the same conditions and the distribution can be asserted in a test.',
    ),
    grid,
    readout,
    h(
      'p',
      { class: 'pnote', style: 'margin-top:14px' },
      'The readout is the toy. The policy line under it is the engineering: protect audio first, step video down ' +
        'before you step it up, and do not chase small variance, churn looks worse to a user than the loss did.',
    ),
  );
  return out;
}
