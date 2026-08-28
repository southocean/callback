// Project specifications.
//
// Was the dev portal: Konami-only, dark, full-bleed, framed as "nothing here is
// part of the CV". Nam has promoted it to a real destination, so it now behaves
// like one:
//
//   - It opens as a CARD over the client, the same shape as the CV overlay, so
//     the two read as one family rather than as two unrelated screens.
//   - Its palette follows the surface that opened it. Light from the home
//     screen, dark from inside the call, decided by the caller and applied once
//     on the root so every tab inherits it. Previously each tab carried its own
//     dark colours and only the ones I had touched flipped.
//   - The tabs are the project's own record: what it is, when it was made, how
//     the work ran, who has reviewed it, and what is still open.
//
// Reachable from the Settings button on the home screen, the Settings row in the
// call's overflow menu, and the Konami code.

import { h, clear } from '../dom.js';
import { sym } from './icons.js';
import { trapFocus } from '../a11y.js';
import { buildDoc } from './built.js';
import { renderScriptEditor } from './scripted.js';
import {
  commitsPerDay, milestones, phasesOfWork, personas, reviews,
  columns, tasks, type Task, type Column,
} from '../data/project.js';
import { START } from '../data/cv.js';
import { bugs as collection, RARITY_LABEL } from '../data/bugs.js';
import { bugArt } from './bugart.js';
import { isAdmin, FORGETTABLE, storedCount, forget } from '../prefs.js';
import {
  challenges, wrongRoasts, rightRoasts, grantedLines, alreadyAdminLines,
  KIND_LABEL, ADMIN_PASSWORD, type ChallengeKind,
} from '../data/admin.js';
import { ADMIN_CLICKS, ADMIN_HINT_FROM } from './admingate.js';

type Tab = 'overview' | 'process' | 'reviews' | 'board' | 'script' | 'bugs' | 'gate' | 'settings';

/*
 * Timeline is gone as a tab and lives inside Overview instead. Nam: "I actually
 * now think the timeline should be merged into the overview. The commit chart on
 * top of the overview, and the milestone on the bottom."
 *
 * Which is the better shape anyway: the chart is the answer to "how was this
 * built", and Overview is where that question gets asked.
 */
/*
 * N60. THREE OF THESE ARE BEHIND THE ADMIN GATE.
 *
 * Nam: "the project spec has some info I dont want to show everyone. Let's hide
 * it behind the admin mode."
 *
 * Which two, and why, was already written down here before the gate existed. The
 * Collection tab's own note calls itself the answer key and says out loud that
 * publishing it "is a real cost to the hunt"; Scripts is the whole running order
 * with its timings, which is the ending of a thing the reader is in the middle
 * of. Both were shipped open because the alternative was hiding them from the
 * author too. A gate is the third option, and it is the one that was missing.
 *
 * The gate's own page joins them, because a hidden page describing the lock is
 * the only page that cannot spoil anything by being hidden.
 */
const TABS: { id: Tab; label: string; admin?: true }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'process', label: 'Process' },
  { id: 'reviews', label: 'Design reviews' },
  { id: 'board', label: 'Kanban board' },
  /*
   * N26. The guided tour is only maintainable if its branching is visible. Named
   * "Scripts", plural, since it also carries the call's own caption loop — a
   * script the tour suspends and hands back, and the one Nam wants to fold in.
   */
  { id: 'script', label: 'Scripts', admin: true },
  /*
   * N59. Nam: "List of bugs, where they are hidden and the image for them, add
   * these info in the project spec."
   *
   * IT IS THE ANSWER KEY, and putting it in a panel any visitor can open is a
   * real cost to the hunt. It goes in anyway, and the page says so in its first
   * line. This build has published every measurement including the one that was
   * wrong; a mechanic whose design is documented everywhere except where it
   * would spoil something is a mechanic being marketed rather than specified.
   * Anyone who does not want the answers is one tab away from not reading them.
   */
  { id: 'bugs', label: 'Collection', admin: true },
  { id: 'gate', label: 'The gate', admin: true },
  /*
   * N80. Nam: "add a new settings tab, where we have a button to clear out
   * achivements and clear out bugs, just so we can test out the onboarding
   * behavior."
   *
   * Behind the gate for the obvious reason and one less obvious one: it is not
   * only a developer convenience, it is a set of buttons that quietly delete a
   * visitor's progress, and the last thing this drawer should offer a stranger
   * who wandered into the spec is a way to lose their collection.
   */
  { id: 'settings', label: 'Settings', admin: true },
];

export type PortalMode = 'light' | 'dark';

/**
 * THE SPEC ITSELF — tabs and body, with no chrome around it.
 *
 * Board ticket N50. Nam: "how this was built was still the wrong page, it should
 * open the project spec that we are already showing in home screen."
 *
 * It was a second copy. The browser tab inside the shared screen rendered
 * `buildDoc()` on its own, which is ONE SECTION of this panel's Overview — so the
 * screen being presented showed something that looked like the spec, was missing
 * four of its five tabs, and was free to drift from it.
 *
 * Extracted rather than duplicated, and the split is where the chrome starts: the
 * dialog below adds the scrim, the header, the close button and a focus trap; the
 * page inside the share adds nothing. That asymmetry is deliberate — a modal with
 * a focus trap, rendered inside a fake browser window inside a screen share, would
 * capture the keyboard for a window that is a drawing.
 *
 * IT RETURNS THE TWO PARTS, NOT A WRAPPER AROUND THEM, and that is a bug fix
 * rather than a preference. The first version returned `.dp-inner` holding both,
 * which stopped the dialog scrolling: `.dp-card` is a column flexbox with
 * `overflow: hidden`, and `.dp-body` earns its scrollbar from `flex: 1 1 auto`
 * plus `min-height: 0` AS A DIRECT CHILD OF IT. Put a plain div between them and
 * the body sizes to its content instead, the card clips it, and the wheel does
 * nothing. Nam: "now I cannot scroll on the project spec?!"
 *
 * Handing back the parts lets the dialog rebuild exactly the DOM it had before
 * this was extracted, which is the only version of it that has been looked at.
 */
export function specBody(): { tabs: HTMLElement; body: HTMLElement } {
  /*
   * Resolved once, when the panel is built, rather than read per draw. The grant
   * cannot change while this is on screen: the gesture that grants it is on the
   * home screen, which is behind this dialog. Reading it once means the tab strip
   * and the view guard cannot disagree with each other mid-session.
   */
  const admin = isAdmin();
  const shown = TABS.filter((t) => !t.admin || admin);

  let tab: Tab = 'overview';
  const body = h('div', { class: 'dp-body' });

  const tabs = h(
    'div',
    { class: 'dp-tabs', role: 'tablist', 'aria-label': 'Project spec' },
    ...shown.map((t) =>
      h('button', {
        class: t.admin ? 'dp-tab is-admin' : 'dp-tab',
        type: 'button', role: 'tab', 'aria-selected': 'false', 'data-t': t.id,
        onclick: () => { tab = t.id; draw(); },
      }, t.label),
    ),
  );

  function draw(): void {
    /*
     * The guard, and not only the filter. A tab id can arrive here from something
     * other than a press on a rendered button -- a deep link, a future caller,
     * this function being asked to open on a tab -- and a hidden view that is one
     * assignment away from rendering is not hidden, it is unlisted.
     */
    if (!shown.some((t) => t.id === tab)) tab = 'overview';

    for (const b of tabs.querySelectorAll('button')) {
      b.setAttribute('aria-selected', b.getAttribute('data-t') === tab ? 'true' : 'false');
    }
    clear(body);
    body.appendChild(
      tab === 'overview' ? overviewView()
      : tab === 'process' ? processView()
      : tab === 'reviews' ? reviewsView()
      : tab === 'script' ? renderScriptEditor()
      : tab === 'bugs' ? collectionView()
      : tab === 'gate' ? gateView()
      : tab === 'settings' ? settingsView()
      : boardView(),
    );
    body.scrollTop = 0;
  }

  draw();
  return { tabs, body };
}

export function openDevPortal(reducedMotion: boolean, mode: PortalMode = 'light'): void {
  if (document.getElementById('devportal')) return;

  let release: (() => void) | null = null;
  const close = (): void => {
    release?.();
    portal.remove();
  };

  // Both go in as direct children of .dp-card — see the note on specBody().
  const { tabs, body } = specBody();

  /*
   * The mode is one class on the root and every rule below it reads custom
   * properties, so a tab cannot be in the wrong palette. That was the bug: the
   * colours lived on the individual tab views.
   */
  const portal = h(
    'div',
    {
      class: `dp dp-${mode}${reducedMotion ? '' : ' dp-in'}`,
      id: 'devportal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Project spec',
    },
    h('div', { class: 'dp-card' },
      h('div', { class: 'dp-head' },
        h('span', { class: 'dp-head-ico', 'aria-hidden': 'true' }, sym('science', 22)),
        h('div', { class: 'dp-title' },
          h('h1', {}, 'Project spec'),
          h('p', {}, 'One week, one agent, one interactive CV.')),
        h('button', {
          class: 'icon-btn dp-close', type: 'button', 'aria-label': 'Close project spec', onclick: close,
        }, sym('close', 22))),
      tabs,
      body),
  ) as HTMLElement;

  /*
   * A press on the dimmed ground closes it. Nam: "clicking the dimmed background
   * outside the project spec should close it too, the same way as clicking close
   * button." Guarded on e.target being the scrim itself, so a press that starts
   * inside the card and drifts out does not count as an outside press.
   */
  portal.addEventListener('pointerdown', (e) => { if (e.target === portal) close(); });

  document.body.appendChild(portal);
  release = trapFocus(portal, close);
  portal.querySelector<HTMLElement>('.dp-close')?.focus();
}

// ------------------------------------------------------------------ views --

const fmt = (iso: string): string => {
  const [, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(d)} ${months[Number(m) - 1]}`;
};

/**
 * The timeline, drawn rather than bulleted.
 *
 * Nam: "Present it in like a literal timeline graph, not bullet point text. This
 * is to show off the progress we could make with agentic programming."
 *
 * So the bars carry the argument: 126 commits across seven days, with the shape
 * of the work visible — two very heavy days, one where nothing happened, and a
 * long tail of correction. The numbers are read off `git log`, not estimated.
 */
/**
 * OVERVIEW, with the timeline folded into it.
 *
 * Nam: "the timeline should be merged into the overview. The commit chart on top
 * of the overview, and the milestone on the bottom. Although I wonder if the
 * milestones can spread horizontally kinda cascading, so we see the milestones
 * along with the date too."
 *
 * So: the chart answers "how was this built" before the prose does, and the
 * milestones run left to right as one column per working day, which is the shape
 * the question actually has. A vertical list of eight items said "here is a list";
 * five dated columns say "this happened over five days".
 */
function overviewView(): HTMLElement {
  const total = commitsPerDay.reduce((a, b) => a + b.n, 0);
  // Thin days are hidden from the chart, not from the total. See project.ts.
  const shown = commitsPerDay.filter((d) => !d.thin);
  const peak = Math.max(...shown.map((d) => d.n));
  const hidden = commitsPerDay.length - shown.length;

  // One column per day that produced a milestone, in order.
  const days = [...new Set(milestones.map((m) => m.day))].sort();

  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      `${total} commits from ${fmt(START)}, one person and an agent. The shape matters more than the count: ` +
      `two very heavy days and a long tail of correction after the interface existed.`),

    h('div', { class: 'tl-chart', role: 'img', 'aria-label': `${total} commits across ${commitsPerDay.length} days` },
      ...shown.map((d) => h('div', { class: 'tl-bar-wrap' },
        h('div', { class: 'tl-bar-n' }, String(d.n)),
        h('div', { class: 'tl-bar-track' },
          h('div', { class: 'tl-bar', style: `height:${Math.max(2, Math.round((d.n / peak) * 100))}%` })),
        h('div', { class: 'tl-bar-d' }, fmt(d.day))))),
    hidden
      ? h('p', { class: 'dp-note tl-omit' },
        `${hidden} near-empty days are left off the chart. They are still in the total.`)
      : h('span', {}),

    buildDoc(),

    /*
     * MILESTONES, on a rail.
     *
     * Nam: "How it got here => Change to milestones." And on the strip it
     * replaced: "very bland, just a table, nothing exciting. I actually
     * contemplate using the old layout of the milestone (vertical, with some
     * blue highlight), only because it has some more color and movement."
     *
     * The thing he is remembering is real: the old vertical list ran down a
     * spine with an accent dot per entry, and the dots were most of what made it
     * read as a timeline rather than as a list. The horizontal strip that
     * replaced it kept the dates and dropped the spine, which is exactly how it
     * became a table.
     *
     * So the spine comes back, turned ninety degrees. Same rail, same dots, same
     * accent, laid out left to right because that is the axis he asked to keep
     * and because a week reads better along one. The last day's node is live,
     * since the most recent thing is the one a reader is looking for.
     */
    h('h2', { class: 'dp-head2' }, 'Milestones'),
    railStrip(days),
  );
}

/**
 * The milestone rail, and the wheel handler that makes it browsable.
 *
 * Nam: "if we scroll, it should go horizontally. For lazy browsing that is."
 *
 * A wheel over a horizontal strip does nothing by default, which means the only
 * way past the fold is a drag on a scrollbar. So vertical wheel is translated
 * into horizontal scroll — but only while the strip has somewhere to go in that
 * direction. At either end the event is left alone and the page scrolls on,
 * which is the difference between a strip that browses and a strip that traps
 * you.
 */
function railStrip(days: string[]): HTMLElement {
  const strip = h('div', {
    class: 'ms-strip', tabindex: '0', role: 'group', 'aria-label': 'Milestones, by day',
  },
    ...days.map((day, i) => {
      const m = milestones.find((x) => x.day === day);
      return h('div', { class: 'ms-day' + (i === days.length - 1 ? ' is-latest' : '') },
        h('span', { class: 'ms-node', 'aria-hidden': 'true' }),
        h('span', { class: 'ms-date' }, fmt(day)),
        h('span', { class: 'ms-n' }, `${commitsPerDay.find((d) => d.day === day)?.n ?? 0} commits`),
        h('span', { class: 'ms-title' }, m?.title ?? ''));
    })) as HTMLElement;

  /*
   * WHERE THE STRIP IS HEADING, not where it is.
   *
   * `scroll-behavior: smooth` means scrollLeft animates toward whatever it was
   * assigned, so reading it during a run of wheel events reads a position from
   * a few frames ago. That is fine for scrolling and wrong for the end check:
   * wheeling up while a scroll to zero was still animating found a non-zero
   * scrollLeft, decided the strip had room, and swallowed the event. The strip
   * held the wheel and the panel behind it would not move.
   *
   * So the decision uses the target and the browser uses the animation. Cleared
   * once the wheel goes quiet, after which the live position is the truth again.
   */
  let target: number | null = null;
  let settle = 0;

  strip.addEventListener('wheel', (e) => {
    const ev = e as WheelEvent;
    // A trackpad's horizontal gesture already does the right thing; taking it
    // over would fight the axis the visitor chose.
    if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
    const max = strip.scrollWidth - strip.clientWidth;
    if (max <= 0) return;
    const at = target ?? strip.scrollLeft;
    // Hand the event back at the ends so the page keeps scrolling past it. A
    // strip that eats the wheel at its own edge is a trap, not a control.
    if ((ev.deltaY < 0 && at <= 0) || (ev.deltaY > 0 && at >= max - 1)) {
      target = null;
      return;
    }
    ev.preventDefault();
    target = Math.max(0, Math.min(max, at + ev.deltaY));
    strip.scrollLeft = target;
    window.clearTimeout(settle);
    settle = window.setTimeout(() => { target = null; }, 180);
  }, { passive: false });

  return strip;
}

/** How the work actually ran: three phases per task, and a fourth per batch. */
function processView(): HTMLElement {
  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      'Every task ran through the same three phases, in the same order. The fourth happens at the end of a ' +
      'batch rather than per task, and it has caught the most expensive problems.'),
    h('div', { class: 'ph-grid' },
      ...phasesOfWork.map((p) => h('div', { class: 'ph-card' + (p.n === 4 ? ' is-extra' : '') },
        h('div', { class: 'ph-n' }, `Phase ${p.n}`),
        h('h3', {}, p.name),
        h('p', {}, p.body),
        h('ul', { class: 'ph-out' }, ...p.outputs.map((o) => h('li', {}, o)))))),
    h('p', { class: 'dp-note' },
      'The order is the point. Measuring before building is what makes a correction cheap; reviewing before ' +
      'coding is why three findings changed the architecture instead of the paint.'),
  );
}

/** The three readers, and a current read of the CV in each of their voices. */
/**
 * The collection, with nothing withheld.
 *
 * The counterpart of the case on the ended screen, which shows an uncaught bug
 * as an outline and its hint and nothing else. This is the specification: every
 * animal, every trigger, every fact, in one table, so the mechanic can be
 * checked rather than taken on trust.
 */
function collectionView(): HTMLElement {
  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      'Twelve bugs are hidden in this build. Each is caught by doing one thing three times, except the '
      + 'three that hide behind a single act nobody performs by accident. This page names all of them, '
      + 'which does spoil the hunt: the case on the way out shows an outline and a hint instead.'),
    h('p', { class: 'dp-note' },
      'The drawings are authored SVG, one body plan per animal rather than one beetle in twelve colours. '
      + 'A silhouette is the same geometry drawn in a single colour, so an empty slot has exactly the right '
      + 'outline and gives away nothing else.'),

    h('div', { class: 'bugspec' },
      ...collection.map((b) => h('div', { class: 'bugspec-row' },
        h('div', { class: 'bugspec-art' }, bugArt(b, { size: 72 })),
        h('div', { class: 'bugspec-txt' },
          h('div', { class: 'bugspec-head' },
            h('h3', {}, b.name),
            h('span', { class: `bug-rar is-${b.rarity}` }, RARITY_LABEL[b.rarity])),
          h('div', { class: 'bugspec-sp' }, b.species),
          h('p', {}, h('b', {}, 'Hidden in: '), b.where),
          h('p', {}, h('b', {}, 'Hint shown: '), b.hint),
          h('p', { class: 'bugspec-fact' }, b.fact))))),
  );
}

/**
 * THE GATE, WRITTEN DOWN.
 *
 * Nam: "All these banters related to the admin code challenge, the problems, the
 * answers and different roasts in different scenarios, please put all these in
 * the project spec too, also as a hidden tab."
 *
 * It is the one page in this panel that can be complete without cost. Every other
 * hidden tab is hidden because publishing it would spoil something a reader is in
 * the middle of; this one is hidden because it is the inside of the joke, and the
 * only person who can reach it has already heard the joke.
 *
 * So it prints the answers next to the questions, which no quiz should do and
 * this one must: the decoy's whole risk is that a question turns out to be
 * ambiguous or wrong, and a table nobody can read is a table nobody can check.
 */
/**
 * The reset bench -- board ticket N80.
 *
 * Every row says what it is about to forget and how much of it it is holding,
 * because a button labelled Clear with no number beside it is a button nobody
 * presses twice. Pressing one wipes the record and rewrites its own row, so the
 * count going to zero IS the confirmation and there is no toast about it.
 *
 * The problem it solves gets worse the longer the project runs. Almost
 * everything interesting here happens once: the quest toasts, the empty drawer,
 * the clips you have not seen, the four post-credit lines you have not heard.
 * Anybody who has worked on this has spent all of it, and the visitor it was
 * designed for has spent none. Without a reset the only way to check the first
 * minute is a private window, which loses the devtools you were about to use.
 *
 * NO "CLEAR EVERYTHING" BUTTON. It would be one press away from a state nobody
 * asked for, and the point of the tab is to reach a SPECIFIC first-visit
 * experience: usually the drawer, occasionally the clips, rarely both.
 */
function settingsView(): HTMLElement {
  const list = h('div', { class: 'rb-rows' }) as HTMLElement;

  const paintRow = (row: HTMLElement, f: typeof FORGETTABLE[number]): void => {
    clear(row);
    const n = storedCount(f.key);
    const btn = h('button', {
      class: 'm-btn m-outlined rb-clear', type: 'button',
    }, n ? 'Clear' : 'Empty') as HTMLButtonElement;
    btn.disabled = n === 0;
    btn.addEventListener('click', () => { forget(f.key); paintRow(row, f); });
    row.append(
      h('div', { class: 'rb-txt' }, h('b', {}, f.label), h('span', {}, f.what)),
      h('span', { class: 'rb-n' }, n ? String(n) : 'none'),
      btn,
    );
  };

  for (const f of FORGETTABLE) {
    const row = h('div', { class: 'rb-row' }) as HTMLElement;
    paintRow(row, f);
    list.appendChild(row);
  }

  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      'Everything this page remembers about you, and a way to make it forget. Clearing a record and '
      + 'reloading gives you the visit a stranger gets, which is the only way to check the first minute '
      + 'once you have already spent it.'),
    h('p', { class: 'dp-note' },
      'Nothing here leaves your machine, which is the same promise the rest of the site makes: these are '
      + 'localStorage keys, and this reads and deletes them.'),
    list,
  );
}

function gateView(): HTMLElement {
  const kinds: ChallengeKind[] = ['math', 'history', 'sense'];

  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      `The help button in the home screen's top bar opens this panel's hidden tabs after ${ADMIN_CLICKS} `
      + 'presses. '
      + `From press ${ADMIN_HINT_FROM} each click throws a number out of the pointer, cycling blue, red `
      + 'and green and alternating left and right so a fast run fans out. It is the only signal the '
      + 'gesture exists, and it is on that button rather than the account avatar because a coloured '
      + 'number thrown out of a coloured circle cannot be read. The logo yellow is left out of the '
      + 'cycle for the same reason: it is 1.7:1 on a white bar. '
      + 'The dialog that opens then asks a general knowledge question, and the question is a decoy.'),
    h('p', { class: 'dp-note' },
      'Answering it correctly is a dead end: it pays out in applause and an insult, rerolls, and leaves the '
      + `door shut. The password is the word "${ADMIN_PASSWORD}", which the dialog never asks for. It is `
      + 'findable only because the gesture that opened the box was itself a cheat code, which is the whole '
      + 'of the puzzle. The lock is checked before the decoy, so the password wins even if a question ever '
      + 'grows it as an answer.'),
    h('p', { class: 'dp-note' },
      'Not a security boundary, and the code says so in as many words. Everything behind the gate ships in '
      + 'the same bundle. It is a spoiler curtain: the threat model is a first-time reader being handed the '
      + "bug hunt's answer key and the script's ending without asking for either."),

    h('h3', { class: 'ag-h' }, `The question bank (${challenges.length})`),
    ...kinds.map((k) => h('div', { class: 'ag-bank' },
      h('h4', { class: 'ag-bank-h' }, KIND_LABEL[k]),
      h('div', { class: 'ag-rows' },
        ...challenges.filter((c) => c.kind === k).map((c) => h('div', { class: 'ag-row' },
          h('span', { class: 'ag-row-q' }, c.q),
          h('span', { class: 'ag-row-a' }, c.answers.join(' / '))))))),

    h('h3', { class: 'ag-h' }, `Roasts, wrong answer (${wrongRoasts.length})`),
    h('ol', { class: 'ag-list' }, ...wrongRoasts.map((r) => h('li', {}, r))),

    h('h3', { class: 'ag-h' }, `Roasts, right answer (${rightRoasts.length})`),
    h('p', { class: 'dp-note' },
      'Each of these has to congratulate and deflate in the same breath. This is the moment the reader '
      + 'learns they were solving the wrong problem, so a line that only praises loses the turn and a line '
      + 'that only mocks reads as the form rejecting a correct answer.'),
    h('ol', { class: 'ag-list' }, ...rightRoasts.map((r) => h('li', {}, r))),

    h('h3', { class: 'ag-h' }, `On the password landing (${grantedLines.length})`),
    h('ol', { class: 'ag-list' }, ...grantedLines.map((r) => h('li', {}, r))),

    h('h3', { class: 'ag-h' }, `Pressing it again once already admin (${alreadyAdminLines.length})`),
    h('ol', { class: 'ag-list' }, ...alreadyAdminLines.map((r) => h('li', {}, r))),
  );
}

function reviewsView(): HTMLElement {
  const byPersona = (id: string): HTMLElement[] =>
    reviews.filter((r) => r.persona === id).map((r) => h('div', { class: `rv rv-${r.verdict}` },
      h('div', { class: 'rv-tag' }, r.verdict === 'strong' ? 'Working' : r.verdict === 'mixed' ? 'Mixed' : 'Risk'),
      h('div', {},
        h('b', {}, r.heading),
        h('span', {}, r.body))));

  return h('div', { class: 'dp-col' },
    h('p', { class: 'dp-lead' },
      'Three people decide whether this works, and they want different things in different amounts of time. ' +
      'Below is a current read of the site in each of their voices, not the reviews of the original plan, ' +
      'which were about a build that no longer exists.'),

    h('div', { class: 'pr-grid' },
      ...personas.map((p) => h('div', { class: 'pr-card' },
        h('h3', {}, p.name),
        h('div', { class: 'pr-role' }, p.role),
        h('div', { class: 'pr-time' }, p.time),
        h('p', {}, p.wants)))),

    ...personas.flatMap((p) => [
      h('h2', { class: 'dp-head2' }, p.name),
      ...byPersona(p.id),
    ]),
  );
}

/**
 * A board, with cards that move.
 *
 * Nam: "This is what we should have done in the very beginning, has a task pool
 * and slowly take up tasks to solve. But we can do it now."
 *
 * Native drag and drop rather than pointer maths, because the browser already
 * handles the hard parts — the drag image, the drop targets, the cancel. Cards
 * are also focusable and move with the arrow keys, since a board that only works
 * with a mouse is a board half this project's own accessibility notes would fail.
 */
function boardView(): HTMLElement {
  const live: Task[] = tasks.map((t) => ({ ...t }));
  const wrap = h('div', { class: 'kb-wrap' }) as HTMLElement;
  const counts = new Map<Column, HTMLElement>();

  const move = (id: string, to: Column): void => {
    const t = live.find((x) => x.id === id);
    if (!t || t.col === to) return;
    t.col = to;
    paint();
    wrap.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus();
  };

  /**
   * The ticket. Nam wanted the card to stay one line and the detail to live
   * behind a click, which is the right split: a board is for seeing the shape of
   * the work, and a ticket is for doing it.
   *
   * Opened by click, Enter or Space. Not by drag — dragstart suppresses the
   * click that would otherwise follow, so the two gestures do not collide.
   */
  const openTicket = (t: Task): void => {
    if (document.getElementById('kb-ticket')) return;
    const d = t.detail ?? {};
    let rel: (() => void) | null = null;
    const shut = (): void => { rel?.(); sheet.remove(); wrap.querySelector<HTMLElement>(`[data-id="${t.id}"]`)?.focus(); };

    const block = (label: string, node: HTMLElement | null): HTMLElement | null =>
      node ? h('div', { class: 'kb-tk-b' }, h('h4', {}, label), node) : null;

    const sheet = h('div', {
      /*
       * THE PALETTE HAS TO COME WITH IT.
       *
       * --dp-bg and its siblings are declared on .dp-light / .dp-dark, and this
       * sheet is appended to document.body — outside the portal — so the tokens
       * did not resolve and every surface fell back to transparent. QA caught a
       * ticket that opened, took focus and read correctly while being
       * see-through, which a screenshot alone would have let through.
       *
       * Copying the mode class rather than reparenting: the portal runs a
       * transform animation, and a transformed ancestor becomes the containing
       * block for a position:fixed child, which would break the scrim.
       */
      class: `kb-tk ${document.getElementById('devportal')?.classList.contains('dp-dark') ? 'dp-dark' : 'dp-light'}`,
      id: 'kb-ticket', role: 'dialog', 'aria-modal': 'true',
      'aria-label': `${t.id}: ${t.title}`,
    },
      h('div', { class: 'kb-tk-card' },
        h('div', { class: 'kb-tk-h' },
          h('span', { class: 'kb-id' }, t.id),
          h('span', { class: `kb-tag kb-${t.tag}` }, t.tag),
          h('span', { class: 'kb-size' }, t.size),
          h('span', { class: 'kb-tk-col' }, columns.find((c) => c.id === t.col)?.label ?? t.col),
          h('button', {
            class: 'icon-btn kb-tk-x', type: 'button', 'aria-label': 'Close ticket', onclick: shut,
          }, sym('close', 20))),
        h('h3', { class: 'kb-tk-t' }, t.title),
        h('p', { class: 'kb-tk-n' }, t.note),
        block('Why', d.why ? h('p', {}, d.why) : null),
        block('Done when', d.done?.length
          ? h('ul', {}, ...d.done.map((x) => h('li', {}, x)))
          : null),
        block('Raised by', d.raised ? h('p', {}, d.raised) : null),
        block('Notes', d.notes ? h('p', {}, d.notes) : null),
        d.why || d.done || d.raised || d.notes
          ? h('span', {})
          : h('p', { class: 'kb-tk-thin' }, 'No detail written for this one yet.')),
    ) as HTMLElement;

    // A press on the dimmed ground closes it, same contract as the portal.
    sheet.addEventListener('pointerdown', (e) => { if (e.target === sheet) shut(); });
    document.body.appendChild(sheet);
    rel = trapFocus(sheet, shut);
    sheet.querySelector<HTMLElement>('.kb-tk-x')?.focus();
  };

  const card = (t: Task): HTMLElement => {
    const el = h('div', {
      class: 'kb-card', draggable: 'true', tabindex: '0', 'data-id': t.id,
      role: 'listitem',
      'aria-label': `${t.title}. Column ${t.col}. Enter opens the ticket, arrow keys move it.`,
    },
      h('div', { class: 'kb-card-t' }, t.title),
      h('div', { class: 'kb-card-n' }, t.note),
      h('div', { class: 'kb-card-f' },
        h('span', { class: `kb-tag kb-${t.tag}` }, t.tag),
        h('span', { class: 'kb-size' }, t.size),
        h('span', { class: 'kb-id' }, t.id))) as HTMLElement;

    el.addEventListener('dragstart', (e) => {
      (e as DragEvent).dataTransfer?.setData('text/plain', t.id);
      el.classList.add('is-drag');
    });
    el.addEventListener('dragend', () => el.classList.remove('is-drag'));
    el.addEventListener('click', () => openTicket(t));
    el.addEventListener('keydown', (e) => {
      const k = (e as KeyboardEvent).key;
      if (k === 'Enter' || k === ' ') { e.preventDefault(); openTicket(t); return; }
      if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
      e.preventDefault();
      const i = columns.findIndex((c) => c.id === t.col);
      const j = k === 'ArrowLeft' ? i - 1 : i + 1;
      if (j < 0 || j >= columns.length) return;
      move(t.id, columns[j]!.id);
    });
    return el;
  };

  function paint(): void {
    clear(wrap);
    for (const c of columns) {
      const mine = live.filter((t) => t.col === c.id);
      const list = h('div', { class: 'kb-list', role: 'list' }, ...mine.map(card)) as HTMLElement;
      const n = h('span', { class: 'kb-count' }, String(mine.length)) as HTMLElement;
      counts.set(c.id, n);

      const col = h('section', { class: 'kb-col', 'aria-label': c.label },
        h('div', { class: 'kb-col-h' }, h('h3', {}, c.label), n),
        list) as HTMLElement;

      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('is-over');
        const id = (e as DragEvent).dataTransfer?.getData('text/plain');
        if (id) move(id, c.id);
      });
      wrap.appendChild(col);
    }
  }

  paint();

  return h('div', { class: 'dp-col dp-col-wide' },
    h('p', { class: 'dp-lead' },
      'The work, as a board. Drag a card between columns, or focus one and use the arrow keys. ' +
      'Several cards are uncomfortable to read, which is the point, a board holding only finished things is ' +
      'a trophy cabinet rather than a plan.'),
    wrap,
  );
}
