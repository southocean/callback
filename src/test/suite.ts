// The test suite.
//
// Review T4: "an in-browser test runner is usually three fake tests and a green
// tick." So these cover the real logic — the reducer, timeline geometry, the
// caption scheduler, the routing, the network model, parameter clamping — and
// the same file runs in CI (`npm test`) and in the browser (Engineering →
// Tests). One suite, two hosts, no separate demo version.
//
// Review T9 added the chaos flag: passing `true` injects a genuine fault so the
// suite can be watched going red. A runner that cannot fail proves nothing.

import { reduce, initial, parseRoute, routeToHash, layoutTimeline, overlaps, clamp01, clock } from '../state.js';
import { tokenise } from '../ui/caption.js';
import type { State } from '../state.js';
import { sample, policy, rng, profiles } from '../net/degrade.js';
import {
  readInterview, afterInterview, clockMs, INTERVIEW_MIN_MS, INTERVIEW_MAX_MS,
  readAdmin,
} from '../prefs.js';
import { reduceTour, initialTour, nextScripted, registerFor, QUEUE_BRIEF, type TourState } from '../tour/director.js';
import {
  challenges, wrongRoasts, rightLines, passedLines, grantedLines, judge, normalise, pick,
  ADMIN_PASSWORD, ADMIN_PASS_MARK, remaining, score, shuffled,
} from '../data/admin.js';
import { ADMIN_CLICKS, ADMIN_HINT_FROM, DROP_COLOURS, dropColour, dropDir } from '../ui/admingate.js';
import { tasks as boardTasks, columns as boardColumns } from '../data/project.js';
import {
  parts as tourParts, quips as tourQuips, acks as tourAcks, story as tourStory,
  asides, timeline, runtimeMs, transcriptLines, OUTRO_CAP_MS,
  banter, outroOpen, outroClose, outroTease, outroAllFound,
  OUTRO_GAPS, OUTRO_COUNT_SLOT, BANTER_SLOTS,
  opener, resumeAt, askQuestion,
} from '../data/tour.js';
import {
  observe, initialVisitor, tier, pace, passive, acknowledge, interests,
  BAIL_MS, IDLE_MS, PACE_MAX, type Visitor,
} from '../tour/profile.js';
import { readSeenEggs, stillUnseen, chooseBanter, readHeard } from '../prefs.js';
import { percent, tally } from '../completion.js';
import { newFinds, type Found } from '../pass.js';
import { quests } from '../data/quests.js';
import { bugs as allBugs } from '../data/bugs.js';
import { eggs as allEggs } from '../data/eggs.js';
import { eggs, eggMap, weekendMark, lastWeekendMark, key as dayKey, type Egg } from '../data/eggs.js';
import { VISIBLE_QUESTS, board as questBoard } from '../data/quests.js';
import { bugs as bugList, bugById, BUG_COUNT } from '../data/bugs.js';
import { codeFromUrl, pitchFor, DEFAULT_CODE, NEUTRAL_CODE } from '../data/companies.js';

export interface Result {
  suite: string;
  name: string;
  pass: boolean;
  error?: string;
  ms: number;
}

type Fn = () => void;
interface Case { suite: string; name: string; fn: Fn }

const cases: Case[] = [];
let currentSuite = '';

function suite(name: string, body: () => void): void {
  currentSuite = name;
  body();
}
function test(name: string, fn: Fn): void {
  cases.push({ suite: currentSuite, name, fn });
}

function eq<T>(actual: T, expected: T, msg = ''): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg || 'not equal'}\n  expected ${b}\n  received ${a}`);
}
function ok(cond: boolean, msg = 'expected true'): void {
  if (!cond) throw new Error(msg);
}

// Chaos is read at run time by one specific assertion below.
let chaos = false;

// ---------------------------------------------------------------------------

suite('state / reducer', () => {
  test('join moves from the green room into the call', () => {
    eq(reduce(initial, { t: 'join' }).screen, 'call');
  });

  test('the reducer never mutates its input', () => {
    const before = JSON.stringify(initial);
    reduce(initial, { t: 'panel', panel: 'chat' });
    reduce(initial, { t: 'camera', on: true });
    eq(JSON.stringify(initial), before, 'initial state was mutated');
  });

  test('clicking an open panel closes it', () => {
    const open = reduce(initial, { t: 'panel', panel: 'chat' });
    eq(open.panel, 'chat');
    eq(reduce(open, { t: 'panel', panel: 'chat' }).panel, 'none');
  });

  test('switching panels does not close the drawer', () => {
    const chat = reduce(initial, { t: 'panel', panel: 'chat' });
    eq(reduce(chat, { t: 'panel', panel: 'people' }).panel, 'people');
  });

  test('leaving the call releases camera and mic', () => {
    let s: State = reduce(initial, { t: 'join' });
    s = reduce(s, { t: 'camera', on: true });
    s = reduce(s, { t: 'mic', on: true });
    s = reduce(s, { t: 'leave' });
    ok(!s.cameraOn && !s.micOn, 'a CV kept the webcam warm after the visitor left');
    eq(s.screen, 'ended');
  });

  test('selecting an engineering tab opens the engineering panel', () => {
    const s = reduce(initial, { t: 'engTab', tab: 'tests' });
    eq(s.panel, 'tools');
    eq(s.engTab, 'tests');
  });
});

suite('routing', () => {
  test('the empty hash is the home screen', () => {
    eq(parseRoute('').screen, 'home');
    eq(parseRoute('#').screen, 'home');
  });

  test('a deep link goes straight into the call', () => {
    // Review U3: the referrer must be able to link straight at a section.
    const r = parseRoute('#chat');
    eq(r.screen, 'call');
    eq(r.panel, 'chat');
  });

  test('a case-study link carries the spotlight', () => {
    const r = parseRoute('#present/mahjong');
    eq(r.panel, 'present');
    eq(r.spotlight, 'mahjong');
  });

  test('engineering tabs are linkable', () => {
    eq(parseRoute('#tools/tests').engTab, 'tests');
    eq(parseRoute('#tools/a11y').engTab, 'a11y');
  });

  test('an unknown engineering tab falls back rather than throwing', () => {
    eq(parseRoute('#tools/nonsense').engTab, 'spec');
  });

  test('garbage in the hash does not break the app', () => {
    eq(parseRoute('#../../etc/passwd').screen, 'home');
    eq(parseRoute('#%%%').screen, 'home');
  });

  test('hash round-trips through state', () => {
    for (const hash of ['#chat', '#people', '#tools/perf', '#present/mahjong', '#plain']) {
      const r = parseRoute(hash);
      let s: State = { ...initial, screen: r.screen, panel: r.panel };
      if (r.engTab) s = { ...s, engTab: r.engTab };
      if (r.spotlight) s = { ...s, spotlight: r.spotlight };
      if (r.plain) s = { ...s, plain: true };
      eq(routeToHash(s), hash, `${hash} did not round-trip`);
    }
  });
});

suite('timeline geometry', () => {
  const now = 2026.6;
  const spans = [
    { id: 'mahjong', from: 2019.25, to: null },
    { id: 'nobisoft', from: 2025.85, to: null },
    { id: 'bkav', from: 2013.7, to: 2015.85 },
  ];

  test('the two concurrent roles are detected as concurrent', () => {
    // Review H2: the overlap gets drawn honestly, so it has to be computed.
    ok(overlaps(spans[0]!, spans[1]!, now), 'concurrent roles read as sequential');
  });

  test('a finished role does not overlap a later one', () => {
    ok(!overlaps(spans[2]!, spans[1]!, now));
  });

  test('overlapping spans land in different lanes', () => {
    const placed = layoutTimeline(spans, now);
    const a = placed.find((p) => p.id === 'mahjong')!;
    const b = placed.find((p) => p.id === 'nobisoft')!;
    ok(a.lane !== b.lane, 'overlapping roles were stacked on top of each other');
  });

  test('non-overlapping spans reuse a lane', () => {
    const placed = layoutTimeline(spans, now);
    const bkav = placed.find((p) => p.id === 'bkav')!;
    ok(bkav.lane === 0, 'the axis wasted a lane');
  });

  test('bars stay inside the axis', () => {
    for (const p of layoutTimeline(spans, now)) {
      ok(p.x >= 0 && p.x <= 1, `${p.id} starts off-axis at ${p.x}`);
      ok(p.x + p.w <= 1.0001, `${p.id} overflows the axis`);
    }
  });

  test('the longest role takes the top lane', () => {
    const placed = layoutTimeline(spans, now);
    eq(placed.find((p) => p.lane === 0)?.id, 'mahjong');
  });

  test('a single span fills the axis', () => {
    const placed = layoutTimeline([{ id: 'solo', from: 2020, to: 2024 }], 2024);
    eq(placed[0]?.w, 1);
  });
});

suite('the call clock', () => {
  /*
   * The five captionAt tests that used to open this suite went with the function
   * -- see the note in src/state.ts. What replaced them is not here but in the
   * caption suite below, which tests the thing that actually decides when a line
   * ends now: how a sentence is cut into the words it arrives in.
   */
  test('the clock matches Meet\'s format', () => {
    eq(clock(new Date(2026, 7, 20, 9, 2)), '9:02 AM');
    eq(clock(new Date(2026, 7, 20, 0, 5)), '12:05 AM');
    eq(clock(new Date(2026, 7, 20, 12, 0)), '12:00 PM');
    eq(clock(new Date(2026, 7, 20, 13, 30)), '1:30 PM');
  });
});

suite('network model', () => {
  test('worse profiles really are worse', () => {
    const order = ['good', 'shaky', 'hotel', 'collapse'] as const;
    for (let i = 1; i < order.length; i++) {
      const prev = profiles[order[i - 1]!];
      const cur = profiles[order[i]!];
      ok(cur.rtt[0] > prev.rtt[0], `${order[i]} is not worse than ${order[i - 1]} on rtt`);
      ok(cur.loss[1] > prev.loss[1], `${order[i]} is not worse on loss`);
    }
  });

  test('the generator is deterministic', () => {
    eq(sample('hotel', 42), sample('hotel', 42), 'same seed gave different conditions');
  });

  test('samples stay inside the profile envelope', () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = sample('hotel', seed);
      const spec = profiles.hotel;
      ok(c.rtt >= spec.rtt[0] - 1 && c.rtt <= spec.rtt[1] + 1, `rtt ${c.rtt} out of range`);
      ok(c.loss >= 0 && c.loss <= spec.loss[1] + 0.001, `loss ${c.loss} out of range`);
      ok(spec.heights.includes(c.height), `height ${c.height} not offered by the profile`);
    }
  });

  test('the seeded generator stays in [0,1)', () => {
    const r = rng(7);
    for (let i = 0; i < 500; i++) {
      const v = r();
      ok(v >= 0 && v < 1, `rng produced ${v}`);
    }
  });

  test('policy protects audio before it protects resolution', () => {
    const bad = policy({ rtt: 900, loss: 0.3, jitter: 300, height: 180, label: '', note: '' });
    eq(bad.severity, 'bad');
    ok(/audio/i.test(bad.action), 'the collapse policy does not mention audio');
  });

  test('policy does not churn on small variance', () => {
    const fine = policy({ rtt: 30, loss: 0.001, jitter: 2, height: 1080, label: '', note: '' });
    eq(fine.severity, 'ok');
  });

  test('policy escalates monotonically across profiles', () => {
    const rank = { ok: 0, warn: 1, bad: 2 };
    let last = -1;
    for (const p of ['good', 'shaky', 'hotel', 'collapse'] as const) {
      const worst = Math.max(...Array.from({ length: 40 }, (_, i) => rank[policy(sample(p, i)).severity]));
      ok(worst >= last, `${p} escalated below the profile before it`);
      last = worst;
    }
  });
});

suite('effects', () => {
  test('parameters clamp into range', () => {
    eq(clamp01(-3), 0);
    eq(clamp01(2.5), 1);
    eq(clamp01(0.4), 0.4);
  });

  test('NaN clamps to zero rather than poisoning a uniform', () => {
    // Review T5: a NaN reaching a GL uniform is a black screen with no error.
    eq(clamp01(NaN), 0);
    eq(clamp01(Infinity), 1);
  });

});

suite('content integrity', () => {
  /*
   * N58 retired the test that used to live here.
   *
   * It pinned "all 17 achievements" in the opening line against the quest list,
   * which was exactly right for as long as the opening named a number. It does
   * not any more: the third sentence now hands over a different goal, and a
   * count nobody says cannot go stale.
   *
   * What replaces it is the same idea one level up. Any number a spoken line
   * commits to has to be checkable, so this asserts the general rule rather than
   * one instance of it: if the script ever starts counting achievements again,
   * the count has to be the real one.
   */
  test('a spoken achievement count, if there is one, is the real one', () => {
    const spoken = tourParts.flatMap((p) => p.lines.map((l) => l.text)).join(' ');
    const said = /\b(\d+) achievements\b/.exec(spoken);
    if (!said) return;
    eq(Number(said[1]), VISIBLE_QUESTS, 'the script promises a different number of achievements than exist');
  });

  /*
   * N58's own line, and the only thing worth pinning about it: it promises bugs,
   * and there had better be some.
   */
  test('the opening promises bugs, and there are bugs', () => {
    const intro = tourParts.find((p) => p.id === 'intro');
    const line = intro?.lines.map((l) => l.text).join(' ') ?? '';
    ok(/\bbugs\b/i.test(line), 'the opening no longer hands over the bug hunt');
    ok(BUG_COUNT > 0, 'the opening promises bugs and the collection is empty');
  });

  /*
   * N66. Nam: "let's just treat the default CV (without c parameter) as c = 1."
   *
   * Worth a test rather than a read of the source, because the failure mode is
   * silent and expensive: a send that renders a generic heading looks fine and
   * is the one thing the whole companies module exists to prevent.
   */
  test('no code at all resolves to the employer, and ?c=0 does not', () => {
    eq(codeFromUrl(''), DEFAULT_CODE, 'a bare link no longer names the employer');
    eq(codeFromUrl('?c=' + NEUTRAL_CODE), null, 'the neutral build is no longer reachable');
    eq(codeFromUrl('?c=' + DEFAULT_CODE), DEFAULT_CODE);
    // An unknown code is a typo in a link, not a request for a generic CV.
    eq(codeFromUrl('?c=zzz'), DEFAULT_CODE, 'an unrecognised code fell back to nobody');
    ok(pitchFor(codeFromUrl('')).named, 'the default pitch names no employer');
    ok(!pitchFor(codeFromUrl('?c=' + NEUTRAL_CODE)).named, 'the neutral pitch named an employer');
  });

  test('the referral blurb carries no superlatives', async () => {
    /*
     * Review R5 asked for fact-only, because the friend has to defend every
     * sentence. N130 relaxed that deliberately: the blurb is four lines in Nam's
     * own voice now and one of them is a characterisation, which is his to make.
     * What the gate still holds is the narrower and more useful line - the words
     * that read as somebody else's marketing copy pasted into a referral form.
     */
    const { referralBlurb } = await import('../data/cv.js');
    // 'best-paper award' is an award's name, not self-description, so it is exempt.
    const banned = /\b(best(?![- ]paper)|amazing|incredible|world[- ]class|rockstar|ninja|guru|exceptional|brilliant)\b/i;
    ok(!banned.test(referralBlurb), 'a superlative crept into the referral blurb');
  });

  test('every measured token names where it came from', async () => {
    const { surfaces, geometry } = await import('../data/spec.js');
    for (const t of [...surfaces.tokens, ...geometry.tokens]) {
      ok(t.value.trim().length > 0, `${t.name} has no measured value`);
      ok(t.where.trim().length > 2, `${t.name} does not say where it was measured`);
    }
  });

  test('every documented screen actually routes', async () => {
    const { flow } = await import('../data/spec.js');
    const screens = new Set(flow.steps.map((s) => parseRoute(s.id).screen));
    for (const s of flow.steps) {
      ok(parseRoute(s.id).screen !== undefined, s.id + ' does not route');
    }
    eq(screens.size, flow.steps.length, 'two documented screens resolve to the same route');
    ok(flow.deviations.length >= 5, 'the deviations from Meet are undocumented');
  });

  test('no placeholder text survived into the content', async () => {
    const cv = await import('../data/cv.js');
    const blob = JSON.stringify(cv);
    for (const bad of ['TODO', 'FIXME', 'Lorem ipsum', 'XXX']) {
      ok(!blob.includes(bad), `content still contains ${bad}`);
    }
    // Chaos hooks in here: a real assertion, made to fail on demand.
    ok(!chaos, 'chaos mode is on: this failure is deliberate, and proves the runner is live');
  });

  test('the phone number is nowhere in the web build', async () => {
    // Review S3: it stays in the PDF, which is sent rather than crawled.
    const cv = await import('../data/cv.js');
    ok(!/07\d[\s.\-]?\d{3}[\s.\-]?\d{4}/.test(JSON.stringify(cv)), 'a phone number leaked into the public build');
  });

  /*
   * The work address, asserted gone.
   *
   * Nam: "Control the site and make sure we dont leave any other reference to
   * nam@wasabiproductions.com. Its my current work email and should not be even
   * mentioned here."
   *
   * A grep answers that once; a test answers it every build. It walks the data
   * modules a reader can actually reach rather than the whole tree, because the
   * point is what gets published, and it matches the domain rather than the full
   * address so a different local part cannot slip past.
   */
  test('the work address is nowhere in the web build', async () => {
    const mods = await Promise.all([
      import('../data/cv.js'),
      import('../data/contacts.js'),
      import('../data/companies.js'),
      import('../data/project.js'),
      import('../data/story.js'),
    ]);
    const blob = mods.map((m) => JSON.stringify(m)).join(' ');
    ok(!/wasabiproductions/i.test(blob), 'the current work address leaked into the public build');
  });
});


suite('the conversation director', () => {
  /* A tour that has been started, for the tests that do not care how. */
  const started = (): TourState => reduceTour(initialTour, { t: 'start' });

  test('starts on the lowest-priority part', () => {
    const s = started();
    eq(s.mode, 'playing');
    eq(s.current, 'intro', 'it did not open on the introduction');
  });

  test('plays the script in priority order', () => {
    let s = started();
    const seen: string[] = [];
    for (let i = 0; i < tourParts.length; i += 1) {
      seen.push(s.current!);
      s = reduceTour(s, { t: 'partDone' });
    }
    const expected = [...tourParts].sort((a, b) => a.priority - b.priority).map((p) => p.id);
    eq(seen.join(','), expected.join(','), 'the script did not run in priority order');
    eq(s.mode, 'finished');
  });

  /*
   * Nam's own example, which is the reason the resumption rule is what it is:
   * interrupted during part 2, the visitor opens a later part, and afterwards
   * the tour should carry on from the lowest UNPLAYED part and skip the one they
   * already saw when it reaches it.
   */
  test('a visited part is skipped when the script reaches it', () => {
    let s = started();
    s = reduceTour(s, { t: 'partDone' });               // intro done, now on 'cv'
    eq(s.current, 'cv');
    s = reduceTour(s, { t: 'visit', id: 'offclock' });  // priority 5
    s = reduceTour(s, { t: 'partDone' });               // cv done -> commentary on offclock
    eq(s.mode, 'commenting');
    eq(s.current, 'offclock');
    s = reduceTour(s, { t: 'partDone' });               // offclock done -> back to script
    eq(s.current, 'jobreq', 'did not resume at the lowest unplayed part');
    s = reduceTour(s, { t: 'partDone' });
    eq(s.current, 'built');
    s = reduceTour(s, { t: 'partDone' });
    eq(s.current, 'close', 'the visited part was narrated twice');
  });

  test('a visitor request outranks the script', () => {
    let s = started();
    s = reduceTour(s, { t: 'visit', id: 'built' });
    s = reduceTour(s, { t: 'partDone' });
    eq(s.current, 'built', 'the script carried on instead of following the visitor');
    eq(s.mode, 'commenting');
  });

  test('never narrates the same part twice', () => {
    let s = started();
    s = reduceTour(s, { t: 'partDone' });
    const before = s.current;
    s = reduceTour(s, { t: 'visit', id: 'intro' });   // already played
    eq(s.queue.length, 0, 'a played part was queued for a replay');
    eq(s.current, before);
  });

  test('clicking the part being spoken does not queue it', () => {
    let s = started();
    s = reduceTour(s, { t: 'visit', id: 'intro' });
    eq(s.queue.length, 0, 'the part already on air was queued');
  });

  test('a busy queue switches to the brief register', () => {
    let s = started();
    for (const id of ['cv', 'jobreq', 'built']) s = reduceTour(s, { t: 'visit', id });
    eq(s.queue.length, QUEUE_BRIEF);
    s = reduceTour(s, { t: 'partDone' });
    eq(s.register, 'brief', 'a long queue did not shorten the commentary');
    ok(s.warned, 'the shortening was never announced');
  });

  test('the register depends only on how long the queue is', () => {
    eq(registerFor(1), 'commentary');
    eq(registerFor(2), 'commentary');
    eq(registerFor(QUEUE_BRIEF), 'brief');
  });

  test('too many requests hands over instead of talking faster', () => {
    let s = started();
    // Five, which is QUEUE_HANDOVER. Spelled out so the test fails loudly if
    // the threshold moves rather than silently following it.
    const ids = ['cv', 'jobreq', 'built', 'offclock', 'close'];
    for (const id of ids) s = reduceTour(s, { t: 'visit', id });
    eq(s.mode, 'handedOver', 'it kept narrating a visitor who was clearly exploring');
    eq(s.queue.length, 0, 'a handed-over run still had work queued');
  });

  test('handing over is terminal', () => {
    let s = started();
    for (const id of ['cv', 'jobreq', 'built', 'offclock', 'close']) s = reduceTour(s, { t: 'visit', id });
    const after = reduceTour(s, { t: 'visit', id: 'cv' });
    eq(after.mode, 'handedOver', 'it came back after handing over');
    eq(reduceTour(s, { t: 'partDone' }).mode, 'handedOver');
  });

  test('stop ends it from anywhere', () => {
    let s = started();
    s = reduceTour(s, { t: 'visit', id: 'cv' });
    s = reduceTour(s, { t: 'stop' });
    eq(s.mode, 'finished');
    eq(s.queue.length, 0);
    eq(s.current, null);
  });

  /*
   * SKIP INTRO -- board ticket N148. The button is offered to a returning
   * visitor who left part way through the questions, and this is the whole of
   * what pressing it does to the running order.
   */
  test('skip intro goes straight to the questions', () => {
    let s = started();
    eq(s.mode, 'playing');
    s = reduceTour(s, { t: 'skipIntro' });
    eq(s.mode, 'telling', 'the press did not reach the questions');
    eq(s.current, null);
    eq(s.queue.length, 0);
  });

  /*
   * The half that is easy to leave out. With the parts still unplayed the
   * running order has six things in it, so any later route back into `playing`
   * would start narrating the walkthrough the visitor had just declined.
   */
  test('skip intro records the parts as decided, not as pending', () => {
    let s = reduceTour(started(), { t: 'skipIntro' });
    eq(s.played.length, 6, 'the skipped parts were left in the running order');
    eq(nextScripted(s), null, 'the walkthrough could still be narrated after a skip');
  });

  test('skip intro does not restart a segment that has already run', () => {
    let s = started();
    s = reduceTour(s, { t: 'skipIntro' });
    s = reduceTour(s, { t: 'toldDone' });
    eq(s.told, true);
    eq(reduceTour(s, { t: 'skipIntro' }).mode, 'finished', 'a second press replayed the answers');
  });

  test('skip intro is ignored once the questions are running', () => {
    const s = reduceTour(started(), { t: 'skipIntro' });
    eq(reduceTour(s, { t: 'skipIntro' }), s, 'pressing again mid-segment changed the state');
  });

  test('skip intro cannot rescue a run that handed over', () => {
    let s = started();
    for (const id of ['cv', 'jobreq', 'built', 'offclock', 'close']) s = reduceTour(s, { t: 'visit', id });
    eq(s.mode, 'handedOver');
    eq(reduceTour(s, { t: 'skipIntro' }).mode, 'handedOver');
  });

  /*
   * N33. Going quiet drops a BACKLOG. A queue collected while the visitor was
   * exploring is stale by the time they stop, and narrating it then is answering
   * a question nobody remembers asking.
   */
  test('going quiet drops a stale backlog', () => {
    let s = started();
    for (const id of ['cv', 'jobreq', 'built']) s = reduceTour(s, { t: 'visit', id });
    eq(s.queue.length, QUEUE_BRIEF);
    s = reduceTour(s, { t: 'settle' });
    eq(s.queue.length, 0, 'it kept a backlog the visitor had moved on from');
    eq(s.current, 'intro', 'settling stole the floor from the part on air');
  });

  /*
   * The bug the rule above shipped with, and the reason it has a threshold.
   * Clicking one thing and then looking at it for three seconds is not
   * exploration — it is the most ordinary way anyone uses anything — and the
   * first version of the settle rule threw that request away.
   */
  test('going quiet does NOT drop a single deliberate request', () => {
    let s = started();
    s = reduceTour(s, { t: 'visit', id: 'built' });
    s = reduceTour(s, { t: 'settle' });
    eq(s.queue, ['built'], 'a visitor request was discarded for the crime of being followed by a pause');
    s = reduceTour(s, { t: 'partDone' });
    eq(s.current, 'built', 'the request was kept and then not honoured');
    eq(s.register, 'commentary');
  });

  test('settling does not disturb a run that has handed over', () => {
    let s = started();
    for (const id of ['cv', 'jobreq', 'built', 'offclock', 'close']) s = reduceTour(s, { t: 'visit', id });
    eq(reduceTour(s, { t: 'settle' }).mode, 'handedOver');
  });

  test('every part has all three registers', () => {
    for (const p of tourParts) {
      ok(p.lines.length > 0, `${p.id} has no lines`);
      ok(p.commentary.length > 0, `${p.id} has no commentary`);
      ok(p.brief.length > 0, `${p.id} has no brief version`);
    }
  });

  test('the brief version is never longer than the full one', () => {
    for (const p of tourParts) {
      const full = p.lines.reduce((a, l) => a + l.text.length, 0);
      const brief = p.brief.reduce((a, l) => a + l.text.length, 0);
      ok(brief <= full, `${p.id}: the brief register is longer than the full one`);
    }
  });

  test('priorities are unique, so the order is not luck', () => {
    const seen = new Set(tourParts.map((p) => p.priority));
    eq(seen.size, tourParts.length, 'two parts share a priority');
  });

  /*
   * N46. The timeline is derived from the dwells, so the two cannot disagree by
   * construction -- but "by construction" is a claim about code that gets
   * refactored. These pin the construction itself: the stamps are the running sum
   * and nothing else, and the benchmark the Scripts panel prints is the same
   * number the last stamp implies.
   */
  test('the timeline is the running sum of the dwells', () => {
    const t = timeline();
    ok(t.length > 0, 'the timeline is empty');
    eq(t[0]!.at, 0, 'the first line is not at zero');
    let ms = 0;
    for (const stamp of t) {
      eq(stamp.at, Math.round(ms / 1000), `the stamp on "${stamp.line.text.slice(0, 30)}" is not the running sum`);
      ms += stamp.line.ms;
    }
    eq(ms, runtimeMs(), 'the benchmark disagrees with the timeline it is made of');
  });

  test('the timeline covers every line of every part, in priority order', () => {
    const t = timeline();
    eq(t.length, tourParts.reduce((a, p) => a + p.lines.length, 0), 'the timeline lost or gained a line');
    const order = [...tourParts].sort((a, b) => a.priority - b.priority).map((p) => p.id);
    // Each part appears as one unbroken run, and the runs are in priority order.
    const runs: string[] = [];
    for (const stamp of t) if (runs[runs.length - 1] !== stamp.part.id) runs.push(stamp.part.id);
    eq(runs.join(','), order.join(','), 'the timeline is not in priority order, or a part is split across runs');
  });

  test('the transcript is the script, stamped by the same clock', () => {
    const lines = transcriptLines('Nam');
    const t = timeline();
    eq(lines.length, t.length, 'the transcript and the timeline are different lengths');
    for (let i = 0; i < lines.length; i += 1) {
      eq(lines[i]!.text, t[i]!.line.text, `transcript line ${i} is not the script's`);
      eq(lines[i]!.at, t[i]!.at, `transcript line ${i} carries a different timestamp`);
    }
  });

  /*
   * N49. Two properties, and the outro is only funny if both hold. Gaps that
   * grow read as somebody running out of things to say; a gap that shrinks reads
   * as a new section starting, which is the opposite of an ending. And the cap
   * exists because the visitor cannot see how much is left.
   */
  test('the outro silences only ever grow', () => {
    // The last slot has no silence after it -- the captions go off instead.
    const gaps = OUTRO_GAPS.slice(0, -1);
    for (let i = 1; i < gaps.length; i += 1) {
      ok(gaps[i]! > gaps[i - 1]!,
        `outro slot ${i} comes back sooner than the one before it, so the winding-down reads as a restart`);
    }
    eq(OUTRO_GAPS[OUTRO_GAPS.length - 1], 0, 'the last slot has a silence after it, so nothing ends the outro');
  });

  /*
   * Nam: "the post end scripts all of the sudden have very long time out cause
   * its waiting for the next line - this gives away that there are more! We dont
   * spoil it like that."
   *
   * The giveaway was a visible bubble with a filling ring sitting there for
   * twenty-six seconds. The fix splits each line into a display and a silence,
   * and the property worth pinning is that no bubble is EVER up for an unusual
   * length of time: the display has to look like every other line in the script,
   * so it is checked against the longest one the flow actually uses.
   */
  test('no outro bubble sits on screen longer than a normal line', () => {
    const longestInFlow = Math.max(...tourParts.flatMap((p) => p.lines.map((l) => l.ms)));
    for (const l of [outroOpen, outroClose, outroTease, outroAllFound, ...banter]) {
      ok(l.ms <= longestInFlow,
        `an outro bubble is up for ${l.ms}ms, longer than the flow's longest line (${longestInFlow}ms),`
        + ' which is what tells the visitor another line is coming');
    }
  });

  /*
   * QA caught that the authored sum is not the number Nam's two minutes applies
   * to: the DISPLAY of each line is scaled by pace() on the way to the caption,
   * and a visitor sitting perfectly still is the SLOWEST case rather than the
   * fastest. The silences are not scaled -- a comedic beat is authored -- so the
   * cap is checked with the worst pace applied to the half that moves.
   */
  /*
   * The worst case is now a DRAW rather than a fixed script, so the cap has to
   * hold against the unluckiest one: the four longest lines in the pool landing
   * in the four drawn slots, with the longer of the two counting lines.
   */
  test('the outro fits inside its cap even at the slowest pace', () => {
    const worstDrawn = [...banter].sort((a, b) => b.ms - a.ms).slice(0, BANTER_SLOTS);
    const shown = outroOpen.ms + outroClose.ms
      + Math.max(outroTease.ms, outroAllFound.ms)
      + worstDrawn.reduce((a, l) => a + l.ms, 0);
    const silent = OUTRO_GAPS.reduce((a, g) => a + g, 0);
    const total = shown + silent;
    ok(total <= OUTRO_CAP_MS, `the outro runs ${Math.round(total / 1000)}s, over its ${OUTRO_CAP_MS / 1000}s cap`);
    const worst = shown * PACE_MAX + silent;
    ok(worst <= OUTRO_CAP_MS,
      `at the slowest pace the outro runs ${Math.round(worst / 1000)}s, over its ${OUTRO_CAP_MS / 1000}s cap`);
  });

  test('the outro ends on the goodbye, not on a joke', () => {
    ok(/thank you/i.test(outroClose.text), 'the last thing said after the goodbye is not a thank you');
  });

  /*
   * N67, second pass. Nam: "we need more of these, cause these are banters and
   * they shouldnt repeat so much ... the post credit should be playful and much
   * less repetitive."
   *
   * The property that delivers that is arithmetic rather than taste: the pool
   * has to be big enough that several visits pass before a repeat. Four a run
   * against twenty lines is five, and this fails the moment somebody adds a slot
   * without adding lines to fill it.
   */
  test('the banter pool outlasts several visits', () => {
    eq(new Set(banter.map((b) => b.id)).size, banter.length, 'two banter lines share an id');
    ok(banter.length >= BANTER_SLOTS * 4,
      `${banter.length} lines at ${BANTER_SLOTS} a visit repeats after ${Math.floor(banter.length / BANTER_SLOTS)} runs`);
    eq(OUTRO_GAPS.length - 3, BANTER_SLOTS, 'the drawn slots and the fixed ones do not add up');
    ok(OUTRO_COUNT_SLOT > 0 && OUTRO_COUNT_SLOT < OUTRO_GAPS.length - 1,
      'the counting slot is the opener or the goodbye, so one of them would never play');
  });

  /*
   * And the tease still has to be a template with something to fill it, or the
   * line says "{left}" out loud. Its partner has to NOT be one, since it is the
   * version for a visitor with nothing left to count.
   */
  test('the counting line is a template and its alternative is not', () => {
    ok(outroTease.text.includes('{left}'), 'the counting line has nothing to fill in');
    ok(!outroAllFound.text.includes('{left}'), 'the everything-found line still counts something');
    for (const l of [outroOpen, outroClose, outroAllFound, ...banter]) {
      ok(!/[{}]/.test(l.text), `an unfilled placeholder is in "${l.text.slice(0, 40)}"`);
    }
  });

  /*
   * N44. The word was the problem, not the label -- so this checks the SCRIPT,
   * which is the place it would come back. A line calling the conversation a
   * tour is a line written by somebody thinking of it as one.
   */
  /*
   * Nam: "everything in the script would be user facing, and we dont want any em
   * dashes there, remove all of them."
   *
   * Twenty-two of them came out, and this stops the twenty-third going in. It
   * covers the story's QUESTIONS as well as its lines: the hiring-manager
   * questions are printed in the Scripts panel beside the answers, so they are
   * read by a person too.
   *
   * En dash is included. It is a different character doing the same job, and
   * "no em dashes" plainly means "not that punctuation" rather than "not that
   * codepoint".
   */
  test('no em dashes anywhere in the script', () => {
    const lines = [
      ...tourParts.flatMap((p) => [...p.lines, ...p.commentary, ...p.brief, ...(p.bail?.lines ?? [])]),
      ...tourQuips, ...tourAcks,
      outroOpen, outroClose, outroTease, outroAllFound, ...banter,
      ...tourStory.flatMap((c) => c.lines),
      ...Object.values(asides),
    ];
    // N60's `alt` is spoken text too, and it is exactly the kind of second
    // wording a sweep forgets: it only ever plays on the neutral build.
    const spoken = lines.flatMap((l) => ('alt' in l && l.alt ? [l.text, l.alt] : [l.text]));
    const all = [...spoken, ...tourStory.map((c) => c.q)];
    for (const text of all) {
      ok(!/[—–]/.test(text), `an em dash is still in the script: "${text.slice(0, 56)}"`);
    }
  });

  test('nothing in the script calls itself a tour', () => {
    const spoken = [
      ...tourParts.flatMap((p) => [...p.lines, ...p.commentary, ...p.brief, ...(p.bail?.lines ?? [])]),
      ...tourQuips, ...tourAcks,
      outroOpen, outroClose, outroTease, outroAllFound, ...banter,
      ...tourStory.flatMap((c) => c.lines),
    ].map((l) => l.text);
    for (const text of spoken) {
      ok(!/\btour\b/i.test(text), `a spoken line still calls this a tour: "${text.slice(0, 48)}"`);
    }
  });

  test('every beat points at a line that exists', () => {
    for (const p of tourParts) {
      for (const b of p.beats ?? []) {
        ok(b.at >= 0 && b.at < p.lines.length, `${p.id}: a beat fires on line ${b.at}, which is not there`);
      }
      if (p.bail) {
        ok(p.bail.at >= 0 && p.bail.at < p.lines.length,
          `${p.id}: the bail protects line ${p.bail.at}, which is not there`);
      }
    }
  });

  /*
   * N157. The close demonstrates controls that award nothing, and raising the
   * hand is not one of them: it is a side quest AND one of the twelve bugs, so a
   * script that performs it spends both on the visitor's behalf.
   *
   * Asserted against the BEATS rather than against the line text, because the
   * spoiler is the gesture. A line reading "raise your hand" with nothing behind
   * it is a suggestion, which is allowed; the hand actually pressing the control
   * is the thing that hands the surprise over.
   */
  test('the script never performs the raised hand for you', () => {
    for (const p of tourParts) {
      for (const b of p.beats ?? []) {
        ok(!/data-ctl="hand"/.test(b.move ?? ''),
          `${p.id}: a beat presses the raise-hand control, which is a side quest and a bug`);
      }
    }
  });

  test('the close puts back the two controls it opens', () => {
    const close = tourParts.find((p) => p.id === 'close');
    ok(!!close, 'the close is gone');
    const cues = (close?.beats ?? []).map((b) => b.cue).filter(Boolean);
    // Both are cues rather than a bare move-and-click precisely so the stage can
    // hold them open and then close them again. See showChat and sendHeart.
    ok(cues.includes('chat'), 'the chat is opened by a raw press, so nothing closes it');
    ok(cues.includes('heart'), 'the heart no longer runs through the cue that tidies up');
  });

  test('nextScripted returns nothing once everything is played', () => {
    const all: TourState = { ...initialTour, played: tourParts.map((p) => p.id) };
    eq(nextScripted(all), null);
  });
});

/* ------------------------------------------------------------------------- */

suite('the script: flow and commentary are separate', () => {
  /* N43. The whole point of the split is that these two lists never mix. */

  test('a quip fires once, ever', () => {
    const q = tourQuips[0]!;
    // Commentary belongs to exploring, so the floor has to be the visitor's.
    let s: TourState = { ...initialTour, mode: 'finished' };
    s = reduceTour(s, { t: 'quip', id: q.id, captions: true });
    eq(s.interject, q.id, 'the quip did not take the floor');
    s = reduceTour(s, { t: 'quipDone' });
    const again = reduceTour(s, { t: 'quip', id: q.id, captions: true });
    eq(again.interject, null, 'a throwaway line was said twice');
  });

  test('the walkthrough is not talked over, and the line is spent anyway', () => {
    /*
     * N221, and both halves matter. A remark fired over a narrated tour is a
     * second voice competing with the first, so it stays quiet -- and it is used
     * up regardless, because a discovery made in silence is still a discovery and
     * a line that waits around for its moment turns the visit into a backlog.
     */
    const q = tourQuips[0]!;
    const playing = reduceTour(initialTour, { t: 'start' });
    eq(playing.mode, 'playing', 'the tour did not start');
    const s = reduceTour(playing, { t: 'quip', id: q.id, captions: true });
    eq(s.interject, null, 'commentary talked over the walkthrough');
    ok(s.quipped.includes(q.id), 'the discovery was not registered');
    // And it never comes back, even once the visitor has the floor.
    const later = reduceTour({ ...s, mode: 'finished' }, { t: 'quip', id: q.id, captions: true });
    eq(later.interject, null, 'a spent line came back');
  });

  test('with the captions off there is nowhere to say it, and it is still spent', () => {
    const q = tourQuips[0]!;
    const s = reduceTour({ ...initialTour, mode: 'finished' }, { t: 'quip', id: q.id, captions: false });
    eq(s.interject, null, 'commentary was raised with no captions to carry it');
    ok(s.quipped.includes(q.id), 'the discovery was not registered');
  });

  test('a quip never enters the queue or changes the register', () => {
    let s = reduceTour(initialTour, { t: 'start' });
    const before = { queue: s.queue.length, register: s.register, current: s.current };
    for (const q of tourQuips.slice(0, 4)) {
      s = reduceTour(s, { t: 'quip', id: q.id, captions: true });
      s = reduceTour(s, { t: 'quipDone' });
    }
    eq(s.queue.length, before.queue, 'commentary was queued as if it were a part');
    eq(s.register, before.register, 'commentary changed the register');
    eq(s.current, before.current, 'commentary took the floor from the flow');
  });

  test('an unknown quip id is refused rather than half-played', () => {
    const s = reduceTour(reduceTour(initialTour, { t: 'start' }), { t: 'quip', id: 'nope', captions: true });
    eq(s.interject, null);
    eq(s.quipped.length, 0);
  });

  test('no quip trigger is also a flow trigger', () => {
    /*
     * A click that is both would produce two voices at once, and the stage
     * resolves it in favour of the part — which is right, and also means a
     * duplicated selector is a quip that can never fire. Better caught here.
     */
    const flowTriggers = new Set(tourParts.flatMap((p) => p.triggers ?? []));
    for (const q of tourQuips) {
      ok(!flowTriggers.has(q.on), `the quip ${q.id} is shadowed by a flow trigger`);
    }
  });

  test('every quip is short enough to be thrown away', () => {
    // Nam: "Short and punchy, so we can go back to whatever we were talking
    // about." Five seconds is not punchy.
    for (const q of tourQuips) {
      ok(q.ms <= 5000, `the quip ${q.id} holds the floor for ${q.ms}ms`);
      ok(q.text.length <= 130, `the quip ${q.id} is ${q.text.length} characters`);
    }
  });

  test('quip ids are unique, or one of them can never be spent', () => {
    eq(new Set(tourQuips.map((q) => q.id)).size, tourQuips.length, 'two quips share an id');
  });

  test('an event quip carries a key and a click quip carries a selector', () => {
    for (const q of tourQuips) {
      if (q.kind === 'event') ok(/^[a-z]+:[a-z]+$/.test(q.on), `${q.id}: "${q.on}" is not an event key`);
      else ok(/^[.[]/.test(q.on), `${q.id}: "${q.on}" does not look like a selector`);
    }
  });
});

/* ------------------------------------------------------------------------- */

suite('the personal segment', () => {
  test('it waits for the flow to finish', () => {
    const mid = reduceTour(initialTour, { t: 'start' });
    eq(reduceTour(mid, { t: 'tell' }).mode, 'playing', 'the story cut in over the demo');
  });

  test('it runs once the flow is done', () => {
    let s: TourState = { ...initialTour, mode: 'finished' };
    s = reduceTour(s, { t: 'tell' });
    eq(s.mode, 'telling');
    s = reduceTour(s, { t: 'toldDone' });
    eq(s.mode, 'finished');
    ok(s.told);
  });

  test('it runs at most once', () => {
    const after: TourState = { ...initialTour, mode: 'finished', told: true };
    eq(reduceTour(after, { t: 'tell' }).mode, 'finished', 'the story ran twice');
  });

  test('nothing interrupts it except Stop', () => {
    const telling: TourState = { ...initialTour, mode: 'telling' };
    eq(reduceTour(telling, { t: 'visit', id: 'cv' }).mode, 'telling');
    eq(reduceTour(telling, { t: 'quip', id: tourQuips[0]!.id, captions: true }).interject, null);
    eq(reduceTour(telling, { t: 'settle' }).mode, 'telling');
    eq(reduceTour(telling, { t: 'stop' }).mode, 'finished', 'Stop did not stop it');
  });

  test('every chapter answers exactly one question', () => {
    for (const c of tourStory) {
      ok(c.q.trim().endsWith('?'), `a chapter's question is not a question: "${c.q}"`);
      ok(c.lines.length > 0, `the chapter "${c.q}" has no answer`);
    }
  });

  test('the questions are distinct', () => {
    eq(new Set(tourStory.map((c) => c.q)).size, tourStory.length, 'two chapters ask the same thing');
  });
});

/* ------------------------------------------------------------------------- */

/*
 * THE BUG COLLECTION -- board ticket N59.
 *
 * Everything here is a property of the data rather than of the catching, and
 * that split is deliberate: the catching is three lines of counting, and what
 * actually goes wrong with a collection is the content. A duplicate id silently
 * merges two bugs, a shared body plan makes two of them the same drawing, and a
 * missing hint leaves a slot in the case that can never be filled by anyone who
 * did not write it.
 */
suite('the bug collection', () => {
  test('every bug is distinct, all the way down', () => {
    eq(new Set(bugList.map((b) => b.id)).size, bugList.length, 'two bugs share an id');
    eq(new Set(bugList.map((b) => b.name)).size, bugList.length, 'two bugs share a name');
    eq(new Set(bugList.map((b) => b.species)).size, bugList.length, 'two bugs are the same species');
    /*
     * The one that matters most. Nam asked for a drawer, and twelve tints of one
     * beetle is a palette: if two bugs share a body plan they share a
     * silhouette, and the silhouette is the entire content of an empty slot.
     */
    eq(new Set(bugList.map((b) => b.plan)).size, bugList.length, 'two bugs are drawn the same way');
  });

  test('every bug can be found, and says how', () => {
    for (const b of bugList) {
      ok(b.repeat >= 1, `${b.id} needs ${b.repeat} presses, which is not a number of presses`);
      ok(b.hint.trim().length > 0, `${b.id} has no hint, so an empty slot says nothing`);
      ok(b.where.trim().length > 0, `${b.id} does not say where it was`);
      ok(b.fact.trim().length > 0, `${b.id} has no fact, so catching it pays nothing`);
      eq(b.palette.length, 4, `${b.id} has the wrong number of colours to be drawn`);
    }
  });

  test('lookup finds them and does not invent them', () => {
    eq(bugById(bugList[0]!.id)?.name, bugList[0]!.name);
    eq(bugById('no-such-bug'), undefined);
    eq(BUG_COUNT, bugList.length, 'the count the outro reads is not the number there are');
  });

  /* The hints and the labels are read by a person, so the same rule applies. */
  test('no em dashes anywhere in the collection', () => {
    for (const b of bugList) {
      for (const text of [b.name, b.species, b.hint, b.where, b.fact]) {
        ok(!/[—–]/.test(text), `an em dash is in the collection: "${text.slice(0, 48)}"`);
      }
    }
  });
});

/* ------------------------------------------------------------------------- */

suite('the side quest board', () => {
  /*
   * Board ticket N166. Three rules interact here and all three are the kind that
   * look obviously right and are off by one, which is exactly why the arithmetic
   * lives in data/quests.ts rather than inside the dialog that draws it.
   */
  const secretIds = quests.filter((q) => q.secret).map((q) => q.id);
  const openIds = quests.filter((q) => !q.secret).map((q) => q.id);

  test('an empty board lists every promised quest and no secrets', () => {
    const b = questBoard([]);
    eq(b.rows.length, VISIBLE_QUESTS, 'the board is not showing the quests that were promised');
    eq(b.got, 0);
    eq(b.total, VISIBLE_QUESTS, 'an unfound secret was counted into the total');
    ok(b.rows.every((r) => !r.done), 'an empty board has something marked done');
  });

  /*
   * THE INVARIANT THE WHOLE BOARD RESTS ON, and the one that would have caught
   * the bug Nam reported by hand: he counted 21 rows under a sentence reading
   * 17. Both numbers were right and neither could be checked against the other.
   * Now the pair IS the board, so anyone counting ticks and rows by eye gets
   * exactly what the header prints.
   */
  test('the tally is the board: got is the ticks, total is the rows', () => {
    for (const found of [[], [openIds[0]!], secretIds, [...openIds, ...secretIds]]) {
      const b = questBoard(found);
      eq(b.total, b.rows.length, 'the denominator is not the number of rows drawn');
      eq(b.got, b.rows.filter((r) => r.done).length, 'the numerator is not the number of ticks drawn');
    }
  });

  test('a found secret joins the list AND the total', () => {
    const first = secretIds[0]!;
    const b = questBoard([openIds[0]!, first]);
    eq(b.rows.length, VISIBLE_QUESTS + 1, 'the found secret did not join the list');
    /*
     * 2 of 18, not 1 of 17. Nam: "So like 12 of 17, but if you complete 1 secret
     * quest then its 13/18." The denominator moving is the point rather than a
     * side effect: a secret nobody knows about cannot be in a total, and the
     * moment it is found it is a quest like any other.
     */
    eq(b.total, VISIBLE_QUESTS + 1, 'the found secret did not join the total');
    eq(b.got, 2, 'the found secret was not counted as done');
    ok(b.rows.find((r) => r.quest.id === first)?.done === true, 'the found secret is not marked found');
  });

  /* The case in the report: twelve of the promised ones and all four secrets. */
  test('twelve promised and four secrets reads as 16 of 21', () => {
    const b = questBoard([...openIds.slice(0, 12), ...secretIds]);
    eq(b.got, 16);
    eq(b.total, VISIBLE_QUESTS + secretIds.length);
    eq(b.total, 21, 'the board no longer has 21 rows to count');
  });

  test('an id that no longer names a quest counts for nothing', () => {
    const b = questBoard(['a-quest-that-was-renamed', openIds[0]!]);
    eq(b.rows.length, VISIBLE_QUESTS, 'a stale id conjured a row');
    eq(b.total, VISIBLE_QUESTS, 'a stale id inflated the total');
    eq(b.got, 1);
  });

  test('the rows come back in declared order, not the order they were found', () => {
    const shuffled = [...openIds].reverse();
    const b = questBoard(shuffled);
    eq(b.rows.map((r) => r.quest.id).join(','), openIds.join(','), 'the board reordered itself');
    eq(b.got, VISIBLE_QUESTS);
  });

  /* Every row prints its name and nothing else, so an empty one says nothing. */
  test('every quest has a name short enough to be the hint', () => {
    for (const q of quests) {
      ok(q.name.trim().length > 0, `${q.id} has no name, and the name is the whole row`);
      ok(q.name.length <= 28, `"${q.name}" is too long to sit in a two-column row`);
    }
  });
});

/* ------------------------------------------------------------------------- */

suite('the banter, drawn fresh', () => {
  /*
   * The rule Nam asked for, as a property: a second visit does not repeat the
   * first. Everything here runs against a fixed random source, because "did it
   * avoid what it already said" is exactly the kind of thing that looks right
   * every time you watch it and is wrong one run in five.
   */
  const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }];
  /** Always takes the first of whatever is left, so the picks are predictable. */
  const first = (): number => 0;

  test('it never repeats what has already been heard', () => {
    const { picks, reset } = chooseBanter(pool, ['a', 'b'], 2, first);
    eq(picks.map((p) => p.id).join(','), 'c,d');
    eq(reset, false);
  });

  test('it asks for as many as it needs, and no more', () => {
    eq(chooseBanter(pool, [], 4, first).picks.length, 4);
    eq(new Set(chooseBanter(pool, [], 4, () => Math.random()).picks.map((p) => p.id)).size, 4,
      'the same line was drawn twice in one run');
  });

  /*
   * THE POOL WRAPS WHOLE. Somebody on their sixth visit has earned more banter
   * than exists, and the alternatives are worse than repeating: saying less each
   * time, or saying nothing. Wrapping to the full pool means the second cycle is
   * as varied as the first rather than being whichever four were left over.
   */
  test('a pool too small to fill the slots starts over', () => {
    const { picks, reset } = chooseBanter(pool, ['a', 'b', 'c', 'd', 'e'], 3, first);
    eq(reset, true, 'it did not reset when it ran out');
    eq(picks.length, 3);
    eq(new Set(picks.map((p) => p.id)).size, 3, 'a reset run drew the same line twice');
  });

  test('an exhausted pool is still exhausted, not empty', () => {
    const { picks } = chooseBanter(pool, pool.map((b) => b.id), 6, first);
    eq(picks.length, 6, 'a fully-heard pool returned nothing at all');
  });
});

/* ------------------------------------------------------------------------- */

suite('the visitor profile', () => {
  /* N33. Pure, so every one of these is a fixed clock and an assertion. */

  const fresh = (): Visitor => ({ ...initialVisitor, lastInput: 1000 });

  test('a section left inside three seconds is a bail', () => {
    let v = fresh();
    v = observe(v, { t: 'enter', at: 1000, id: 'cv' });
    v = observe(v, { t: 'leave', at: 1000 + BAIL_MS - 1, id: 'cv' });
    eq(v.bails, ['cv']);
    ok(v.restless > 0, 'bolting out of a section moved nothing');
  });

  test('a section held long enough is a read, and calms them down', () => {
    let v = { ...fresh(), restless: 0.5 };
    v = observe(v, { t: 'enter', at: 1000, id: 'cv' });
    v = observe(v, { t: 'leave', at: 1000 + 12000, id: 'cv' });
    eq(v.bails, []);
    ok(v.restless < 0.5, 'reading a section did not settle the score');
    eq(v.dwell['cv'], 12000);
  });

  test('an ordinary look is neither', () => {
    let v = fresh();
    v = observe(v, { t: 'enter', at: 1000, id: 'cv' });
    v = observe(v, { t: 'leave', at: 6000, id: 'cv' });
    eq(v.restless, 0, 'an ordinary look changed the score');
  });

  test('entering a second section closes the first', () => {
    let v = fresh();
    v = observe(v, { t: 'enter', at: 1000, id: 'cv' });
    v = observe(v, { t: 'enter', at: 5000, id: 'built' });
    eq(v.dwell['cv'], 4000, 'a dwell was lost when they moved on');
    eq(v.open, 'built');
  });

  test('scrolling faster than reading speed reads as skimming', () => {
    const slow = observe(fresh(), { t: 'scroll', at: 2000, px: 300, ms: 1000 });
    const fast = observe(fresh(), { t: 'scroll', at: 2000, px: 3000, ms: 1000 });
    eq(slow.restless, 0, 'reading pace was scored as impatience');
    ok(fast.restless > 0, 'a skim was scored as reading');
  });

  test('a scroll sample with no duration carries no verdict', () => {
    const v = observe(fresh(), { t: 'scroll', at: 2000, px: 9000, ms: 0 });
    eq(v.restless, 0, 'a zero-length sample produced an infinite speed');
  });

  test('clicks close together are one impatience, not several decisions', () => {
    let v = fresh();
    v = observe(v, { t: 'click', at: 1100 });
    v = observe(v, { t: 'click', at: 1300 });
    v = observe(v, { t: 'click', at: 1500 });
    eq(v.clicks, 3);
    eq(v.bursty, 3);
    ok(v.restless > 0);
  });

  test('clicks spread out are not a burst', () => {
    let v = fresh();
    v = observe(v, { t: 'click', at: 3000 });
    v = observe(v, { t: 'click', at: 9000 });
    eq(v.bursty, 0);
    eq(v.restless, 0);
  });

  test('coming back to something is the strongest interest signal there is', () => {
    let v = { ...fresh(), restless: 0.4 };
    v = observe(v, { t: 'enter', at: 1000, id: 'cv' });
    v = observe(v, { t: 'leave', at: 6000, id: 'cv' });
    const before = v.restless;
    v = observe(v, { t: 'enter', at: 9000, id: 'cv' });
    eq(v.revisits, 1);
    ok(v.restless < before, 'a revisit did not count in their favour');
  });

  test('restlessness decays while nothing is happening', () => {
    const v = observe({ ...fresh(), restless: 0.5, lastInput: 0 }, { t: 'idle', at: 20000 });
    ok(v.restless < 0.5, 'the score never came back down');
    ok(v.restless >= 0, 'the score went below zero');
  });

  test('the score is clamped at both ends', () => {
    let v = { ...fresh(), restless: 0.95 };
    for (let i = 0; i < 10; i += 1) {
      v = observe(v, { t: 'enter', at: 1000 + i * 4000, id: 'x' + i });
      v = observe(v, { t: 'leave', at: 1001 + i * 4000, id: 'x' + i });
    }
    ok(v.restless <= 1, 'the score went above one');
  });

  test('the tiers are in the right order', () => {
    eq(tier({ ...fresh(), restless: 0 }), 'settled');
    eq(tier({ ...fresh(), restless: 0.3 }), 'browsing');
    eq(tier({ ...fresh(), restless: 0.6 }), 'skimming');
    eq(tier({ ...fresh(), restless: 0.9 }), 'bolting');
  });

  test('a restless visitor is talked to faster, but never gabbled at', () => {
    const calm = pace({ ...fresh(), restless: 0 });
    const rushed = pace({ ...fresh(), restless: 1 });
    ok(rushed < calm, 'impatience did not shorten the pauses');
    ok(rushed >= 0.62, 'the pace floor was breached');
    ok(calm <= 1.08, 'the pace ceiling was breached');
  });

  test('passive means no input at all for three seconds', () => {
    const v = fresh();
    ok(!passive(v, 1000 + IDLE_MS - 1));
    ok(passive(v, 1000 + IDLE_MS));
  });

  test('an acknowledgement is never used twice', () => {
    let v = { ...fresh(), restless: 0.9 };
    const said = new Set<string>();
    for (let i = 0; i < tourAcks.length; i += 1) {
      const got = acknowledge(v, tourAcks);
      if (!got) break;
      ok(!said.has(got.line.id), `the line ${got.line.id} was used twice`);
      said.add(got.line.id);
      v = got.next;
    }
    eq(said.size, tourAcks.length, 'the pool ran dry before it was empty');
    eq(acknowledge(v, tourAcks), null, 'an exhausted pool kept handing out lines');
  });

  test('the acknowledgement matches the tier', () => {
    const got = acknowledge({ ...fresh(), restless: 0.9 }, tourAcks);
    eq(got?.line.tier, 'bolting', 'a bolting visitor got a polite line');
  });

  test('a dry tier falls up, not down', () => {
    /*
     * Running out of teasing lines does not mean the visitor became patient
     * again, so the pool escalates rather than retreating.
     */
    const spent = tourAcks.filter((a) => a.tier === 'skimming').map((a) => a.id);
    const got = acknowledge({ ...fresh(), restless: 0.6, spent }, tourAcks);
    eq(got?.line.tier, 'bolting', 'an exhausted tier fell back to a softer one');
  });

  test('interest is ranked by how long they stayed', () => {
    let v = fresh();
    v = observe(v, { t: 'enter', at: 0, id: 'a' });
    v = observe(v, { t: 'leave', at: 5000, id: 'a' });
    v = observe(v, { t: 'enter', at: 5000, id: 'b' });
    v = observe(v, { t: 'leave', at: 25000, id: 'b' });
    eq(interests(v)[0], 'b', 'the section they actually read was not ranked first');
  });

  test('keyboard beats pointer, because it is the accessible path', () => {
    let v = observe(fresh(), { t: 'key', at: 1000 });
    v = observe(v, { t: 'move', at: 2000 });
    eq(v.modality, 'keyboard', 'a stray pointer move demoted a keyboard visitor');
  });
});

/* ------------------------------------------------------------------------- */

/*
 * Where the eggs land, which is a rule rather than a list.
 *
 * The strip runs Sunday to Saturday and does NOT move with the selection, so a
 * placement counted in days from today is off screen for most of the week. The
 * teaching egg is anchored to the weekend of the visitor's own week instead.
 * None of that is checkable by reading the data: the rule is only correct
 * relative to a strip whose shape lives in another file, so the test states the
 * strip's shape itself and then asserts against it.
 */
suite('where the marks land', () => {
  /** The seven days home.ts draws: Sunday to Saturday, containing `on`. */
  const strip = (on: Date): string[] => {
    const sunday = new Date(on);
    sunday.setDate(on.getDate() - on.getDay());
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      out.push(dayKey(d));
    }
    return out;
  };

  /** Every opening day in a leap year, so nothing passes by landing on a good month. */
  const year = (): Date[] => {
    const out: Date[] = [];
    for (let i = 0; i < 366; i++) {
      const d = new Date(2024, 0, 1);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  };

  const at = (marks: Map<string, Egg[]>, on: string[], id: string): number =>
    on.findIndex((k) => (marks.get(k) ?? []).some((e) => e.id === id));

  test('the teaching egg is on screen every day of the year', () => {
    for (const today of year()) {
      const found = at(eggMap(today), strip(today), 'premiere');
      ok(found >= 0, `the premiere fell outside the strip on ${dayKey(today)}`);
    }
  });

  test('it lands on a weekend, and never on today', () => {
    for (const today of year()) {
      const d = weekendMark(today);
      ok(d.getDay() === 0 || d.getDay() === 6, `not a weekend on ${dayKey(today)}`);
      ok(dayKey(d) !== dayKey(today), `landed on today on ${dayKey(today)}`);
    }
  });

  test('Saturday, unless today is Saturday, and then the Sunday of the same week', () => {
    // Nam: "If today is sat, then the egg will be on sun, and vice versa."
    const sat = new Date(2026, 7, 29);
    eq(weekendMark(sat).getDay(), 0);
    eq(dayKey(weekendMark(sat)), '2026-08-23');

    const sun = new Date(2026, 7, 23);
    eq(weekendMark(sun).getDay(), 6);
    eq(dayKey(weekendMark(sun)), '2026-08-29');

    // A weekday takes the Saturday that closes its own week.
    eq(dayKey(weekendMark(new Date(2026, 7, 28))), '2026-08-29');
  });

  test('the jump is the weekend before, which is off the strip on purpose', () => {
    // The acknowledged cost of a fixed week. Nam: "Now it will be off screen
    // unfortunately." Asserted so that it stays a decision rather than becoming
    // a bug somebody fixes by accident.
    for (const today of year()) {
      const marks = eggMap(today);
      const on = strip(today);
      eq(at(marks, on, 'skydive'), -1);
      const back = strip(new Date(new Date(today).setDate(today.getDate() - 7)));
      ok(at(marks, back, 'skydive') >= 0, `not reachable one week back on ${dayKey(today)}`);
    }
  });

  test('the two roamers never share a weekday', () => {
    // Nam: "say movie is on sat, then tandem on sun last week, and vice versa.
    // We change it up a little bit." So the pair reads Saturday-then-Sunday or
    // Sunday-then-Saturday depending on the day the visitor arrives, and two
    // people opening the page on different days do not see the same arrangement.
    for (const today of year()) {
      const first = weekendMark(today);
      const back = lastWeekendMark(today);
      ok(back.getDay() === 0 || back.getDay() === 6, `not a weekend on ${dayKey(today)}`);
      ok(first.getDay() !== back.getDay(), `both on the same weekday on ${dayKey(today)}`);
      // A week apart on the strip, whichever way round they fall.
      const days = Math.round((first.getTime() - back.getTime()) / 86400000);
      ok(days === 13 || days === 1, `${days} days apart on ${dayKey(today)}`);
    }
  });

  test('a fixed egg is allowed to land on today, and four of them do', () => {
    /*
     * The roamers never land on today, asserted above. The eggs on real dates
     * still can, and home.ts used to draw the interview and return, so on those
     * four days the strip showed a dot over today with nothing behind it. The
     * day holds both now. This asserts the collision is real, so the branch that
     * handles it never looks like dead code to somebody tidying up.
     */
    const collides = eggs.filter((e) => e.on).map((e) => {
      const today = new Date(2026, e.on![0] - 1, e.on![1]);
      return (eggMap(today).get(dayKey(today)) ?? []).length;
    });
    eq(collides.filter((n) => n === 0), []);
  });

  test('a date holding two meetings keeps both, in the order they are declared', () => {
    const marks = eggMap(new Date(2026, 7, 28));
    const night = marks.get('2026-03-15') ?? [];
    eq(night.map((e) => e.id), ['standup', 'winner']);
  });

  test('every egg is reachable from some date', () => {
    const marks = eggMap(new Date(2026, 7, 28));
    const placed = new Set([...marks.values()].flat().map((e) => e.id));
    eq(eggs.filter((e) => !placed.has(e.id)).map((e) => e.id), []);
  });

  test('every clip and poster is named, and no two eggs share a file', () => {
    // The filenames are the spoiler surface: Explorer lists them. A duplicate
    // would mean two eggs playing the same footage, which reads as a bug in
    // the hunt rather than as a repeat.
    const clips = eggs.map((e) => e.clip);
    eq(new Set(clips).size, eggs.length);
    eq(clips.filter((c) => !c.startsWith('media/') || !c.endsWith('.mp4')), []);
    eq(eggs.filter((e) => e.poster !== e.clip.replace('.mp4', '.jpg')).map((e) => e.id), []);
  });
});

/* ------------------------------------------------------------------------- */

suite('the eggs the visitor has found', () => {
  test('nothing remembered means nothing is skipped', () => {
    eq(stillUnseen([{ id: 'a' }, { id: 'b' }], []).length, 2);
  });

  test('a found clip is not offered again', () => {
    eq(stillUnseen([{ id: 'a' }, { id: 'b' }], ['a']).map((e) => e.id), ['b']);
  });

  test('a corrupt record reads as a first visit', () => {
    eq(readSeenEggs('not json'), []);
    eq(readSeenEggs('{"a":1}'), []);
    eq(readSeenEggs(null), []);
  });

  test('only strings survive the record', () => {
    eq(readSeenEggs('["a", 3, null, "b"]'), ['a', 'b']);
  });
});

// ---------------------------------------------------------------------------

suite('the caption speaks', () => {
  /*
   * N47. The tokeniser is what turns a sentence into the words it arrives in, so
   * the property that matters is that the sentence survives the trip. It used to
   * insert hesitations too, and most of this suite was about those; the insertion
   * is gone (N53) and so are the seven tests that measured its rate, its
   * determinism and its variety.
   *
   * One of them is worth remembering rather than just deleting: it asserted that
   * the flow hesitated "once or twice, not constantly", and it passed. The rate
   * was right and the placement was wrong, which is not something a counting test
   * can see -- both hesitations landed immediately before a punchline. A test that
   * measures how often a thing happens will happily green-light every instance of
   * it happening in the worst possible place.
   */
  test('the words survive being cut up', () => {
    const text = 'Four players, four networks, one shared board, no excuses about latency.';
    const back = tokenise(text).map((t) => t.text).join(' ');
    eq(back, text, 'the sentence did not survive tokenising');
  });

  test('nothing is inserted into a line', () => {
    // The whole script, not a sample: an insertion anywhere would be a word the
    // Scripts panel and the transcript do not have.
    for (const t of timeline()) {
      const back = tokenise(t.line.text).map((x) => x.text).join(' ');
      eq(back, t.line.text, `a word was added to or lost from "${t.line.text.slice(0, 40)}"`);
    }
  });

  test('tokenising is stable', () => {
    const text = 'And the tests are real, they run in your browser, and you can break them.';
    const shape = (v: string): string => tokenise(v).map((x) => `${x.text}:${x.restMs}`).join(' ');
    eq(shape(text), shape(text), 'the same line tokenised two different ways');
  });

  test('punctuation earns a rest and a bare word does not', () => {
    const t = tokenise('One, two three.');
    eq(t[0]!.text, 'One,');
    ok(t[0]!.restMs > 0, 'a comma bought no pause');
    eq(t[1]!.restMs, 0, 'a bare word bought a pause it had not earned');
    ok(t[2]!.restMs > t[0]!.restMs, 'a full stop is not a longer pause than a comma');
  });

  /*
   * N60. The authored hesitation, which is the only thing the renderer knows
   * about a stumble. A test rather than a read of the regex, because the failure
   * is invisible: without the rest, "Claude, uh, made this section redundant"
   * still reads correctly and just does not pause, and nobody notices a beat
   * that is missing.
   */
  test('an authored hesitation earns a longer rest than a comma', () => {
    const t = tokenise('Claude, uh, made this whole section redundant LOL.');
    const uh = t.find((w) => w.text === 'uh,');
    const claude = t.find((w) => w.text === 'Claude,');
    ok(!!uh && !!claude, 'the line was not tokenised as written');
    ok(uh!.restMs > claude!.restMs, 'the hesitation does not hold longer than an ordinary comma');
    // And a sentence merely ending on one is not a stumble.
    eq(tokenise('Talk to the hand.').every((w) => w.restMs <= 260), true);
  });

  test('an empty line does not throw', () => {
    eq(tokenise('').length, 0);
    eq(tokenise('   ').length, 0);
  });
});

suite('how long the interview took', () => {
  /*
   * N51. The rules that are worth pinning are the defensive ones. This is read
   * out loud on the last screen a visitor sees, so a hand-edited or corrupt
   * record has to read as "no record" rather than print a number that is wrong.
   */
  test('a first run is its own best', () => {
    const r = afterInterview(null, 90_000);
    eq(r?.lastMs, 90_000);
    eq(r?.bestMs, 90_000);
    eq(r?.runs, 1);
  });

  test('a slower run keeps the old best', () => {
    const r = afterInterview({ lastMs: 90_000, bestMs: 90_000, runs: 1 }, 120_000);
    eq(r?.lastMs, 120_000, 'the last run was not recorded');
    eq(r?.bestMs, 90_000, 'a slower run overwrote the best');
    eq(r?.runs, 2);
  });

  test('a faster run takes the best', () => {
    const r = afterInterview({ lastMs: 120_000, bestMs: 120_000, runs: 3 }, 61_000);
    eq(r?.bestMs, 61_000);
    eq(r?.runs, 4);
  });

  test('an impossible time is not recorded at all', () => {
    const prev = { lastMs: 90_000, bestMs: 90_000, runs: 1 };
    // A clock that went backwards, and a tab left open for a week.
    eq(afterInterview(prev, 0), prev, 'a zero-length run was recorded');
    eq(afterInterview(prev, -5), prev, 'a negative run was recorded');
    eq(afterInterview(prev, INTERVIEW_MAX_MS + 1), prev, 'an overnight tab was recorded as a run');
    eq(afterInterview(null, INTERVIEW_MIN_MS - 1), null, 'a sub-second run became a record');
  });

  test('junk in storage reads as no record rather than throwing', () => {
    eq(readInterview(null), null);
    eq(readInterview(''), null);
    eq(readInterview('not json'), null);
    eq(readInterview('{}'), null);
    eq(readInterview('[1,2,3]'), null);
    eq(readInterview('{"lastMs":0,"bestMs":0,"runs":1}'), null, 'a zeroed record was trusted');
    eq(readInterview('{"lastMs":"fast","bestMs":1000,"runs":1}'), null);
  });

  test('a best slower than the last is repaired, not printed', () => {
    // Only reachable by hand-editing, and printing it would show a "best" that
    // is worse than the run beside it.
    const r = readInterview('{"lastMs":60000,"bestMs":90000,"runs":2}');
    eq(r?.bestMs, 60_000, 'an impossible best survived the read');
  });

  test('the time reads as minutes and seconds', () => {
    eq(clockMs(0), '0:00');
    eq(clockMs(9_000), '0:09');
    eq(clockMs(69_000), '1:09');
    eq(clockMs(600_000), '10:00');
  });
});

suite('the questions, and remembering them', () => {
  /*
   * N110. The segment resumes by ID, and the ids are the one thing in it that a
   * rewording must not break: they are written into localStorage the first time
   * somebody hears an answer and read back weeks later.
   */
  test('every chapter has an id, and no two share one', () => {
    for (const c of tourStory) {
      ok(!!c.id && c.id.length > 1, `a chapter has no usable id: "${c.q.slice(0, 40)}"`);
    }
    const ids = tourStory.map((c) => c.id);
    eq(new Set(ids).size, ids.length, 'two chapters share an id, so one would resume as the other');
  });

  test('an id is not derived from the question it belongs to', () => {
    /*
     * The point of the id is surviving a reword. If somebody ever generates them
     * by slugifying `q`, this catches it: none of them should be long enough to
     * be the question, and the numbering must not be positional either.
     */
    for (const c of tourStory) {
      ok(c.id.length < 24, `"${c.id}" looks generated from the question text`);
      ok(!/^\d+$/.test(c.id), `"${c.id}" is positional, so reordering would rewrite history`);
    }
  });

  test('the resume line names a real question', () => {
    const first = tourStory[0]!;
    const line = resumeAt(1, first.q);
    ok(line.text.includes(first.q), 'the resume line does not carry the question it resumes at');
    ok(/question 1/i.test(line.text), 'the resume line does not number the question');
  });

  test('the question is asked before it is answered', () => {
    const c = tourStory[2]!;
    const ask = askQuestion(3, c.q);
    eq(ask.text, `3. ${c.q}`);
  });

  test('the opener is two lines, and the tease is a third', () => {
    // "Still here?" alone is the pause. Running them together is what N110 fixed.
    ok(/still here/i.test(opener.stillHere.text), 'the opener no longer asks if they are still there');
    ok(!/never answers/i.test(opener.stillHere.text), 'the framing line got merged back into the opener');
    ok(/never answers/i.test(opener.more.text), 'the framing line lost its subject');
    // "Since" for somebody with answers left, "If" for somebody who has them all.
    ok(/^since/i.test(opener.more.text), 'the first-time framing should not be conditional');
    ok(/^if/i.test(opener.again.text), 'the tease should be conditional, that is the joke');
    ok(opener.allHeard.length >= 2, 'the all-heard branch has nothing to say');
  });

  test('a heard record survives a reload and junk reads as fresh', () => {
    eq(readHeard(null), []);
    eq(readHeard('nonsense'), []);
    eq(readHeard('{}'), []);
    eq(readHeard('["why-now","strongest"]'), ['why-now', 'strongest']);
    // A hand-edited record with a number in it keeps the strings and drops it.
    eq(readHeard('["why-now",7,"strongest"]'), ['why-now', 'strongest']);
  });

  test('every stored id still matches a chapter', () => {
    // The failure this guards: a chapter renamed in the data while somebody's
    // saved progress still names the old id, which would silently replay it.
    const ids = new Set(tourStory.map((c) => c.id));
    for (const id of ['why-now', 'what-i-like', 'strongest', 'weakness',
      'with-people', 'when-wrong', 'hardest', 'why-me']) {
      ok(ids.has(id), `the stored id "${id}" no longer matches a chapter`);
    }
  });
});

suite('completion', () => {
  // The three id lists, read from the same data the tally reads.
  const questIds = (): string[] => quests.map((q) => q.id);
  const bugIds = (): string[] => allBugs.map((b) => b.id);
  const eggIds = (): string[] => allEggs.map((e) => e.id);

  /*
   * N118. The number is read out loud on the last screen a visitor sees and
   * carried on the home rail after that, so the two ends are what matter: it must
   * not say 100 while something is missing, and it must not say 0 to somebody who
   * has found something.
   */
  test('the ends are exact and the middle is rounded', () => {
    eq(percent(0, 52), 0, 'nothing found should read zero');
    eq(percent(52, 52), 100, 'everything found should read one hundred');
    eq(percent(1, 52), 2, 'one of fifty-two is two percent');
    // The clamps only bite where rounding would reach an end it has not earned.
    eq(percent(1, 500), 1, 'one find rounded down to nothing');
    eq(percent(499, 500), 99, 'one missing rounded up to everything');
    eq(percent(51, 52), 98);
    eq(percent(26, 52), 50);
    eq(percent(13, 52), 25);
  });

  test('an empty collection does not divide by zero', () => {
    eq(percent(0, 0), 0);
    eq(percent(3, 0), 0);
  });

  test('every collection is counted, and none twice', () => {
    const p = tally({ quests: [], bugs: [], eggs: [] });
    eq(p.parts.length, 3, 'a collection went missing from the tally');
    eq(p.got, 0);
    eq(p.total, p.parts.reduce((a, x) => a + x.total, 0), 'the total is not the sum of its parts');
    ok(p.total > 30, `only ${p.total} findable things, which suggests a list did not load`);
  });

  test('a saved id for something that no longer exists is ignored', () => {
    /*
     * The failure this guards is specific and would be invisible: a quest, bug or
     * clip renamed or dropped leaves its old id in somebody's localStorage.
     * Counting one of those would push the numerator past the denominator and
     * print 108%.
     */
    const p = tally({
      quests: ['nope', 'also-nope'], bugs: ['ghost'], eggs: ['gone'],
    });
    eq(p.got, 0, 'ids for deleted things were counted');
    eq(p.pct, 0);
  });

  test('duplicates in a saved list count once', () => {
    const p = tally({ quests: ['join', 'join', 'join'], bugs: [], eggs: [] });
    eq(p.got, 1, 'a repeated id was counted more than once');
  });

  test('finding everything really does reach a hundred', () => {
    const all = tally({ quests: [], bugs: [], eggs: [] });
    // Rebuild the full set from the totals the tally itself reports.
    const full = tally({
      quests: questIds(), bugs: bugIds(), eggs: eggIds(),
    });
    eq(full.got, all.total, 'the three id lists do not add up to the total');
    eq(full.pct, 100);
  });
});

suite('the pass', () => {
  /*
   * N137. The ended screen stopped reporting lifetime totals and now reports what
   * turned up in the visit just finished, which is a set difference taken against
   * a snapshot the router stamps on the way into the call. A wrong answer here is
   * a screen congratulating somebody for things they found last Tuesday, so the
   * diff is exercised rather than trusted.
   */
  const none: Found = { quests: [], bugs: [], eggs: [] };
  const names = (parts: ReturnType<typeof newFinds>, key: string): string[] =>
    parts.find((p) => p.key === key)?.names ?? [];

  test('an unchanged pass found nothing', () => {
    const had: Found = { quests: ['join', 'chat'], bugs: [bugList[0]!.id], eggs: [] };
    const parts = newFinds(had, { ...had });
    eq(parts.reduce((a, p) => a + p.names.length, 0), 0, 'a pass that found nothing reported a find');
  });

  test('only what arrived during the pass is reported', () => {
    const had: Found = { quests: ['join'], bugs: [], eggs: [] };
    const now: Found = { quests: ['join', 'chat'], bugs: [bugList[0]!.id], eggs: [] };
    eq(names(newFinds(had, now), 'quests').length, 1, 'a quest held before the pass was reported as new');
    eq(names(newFinds(had, now), 'quests')[0], 'Read the messages');
    eq(names(newFinds(had, now), 'bugs')[0], bugList[0]!.name);
  });

  test('an id for something that no longer exists is not reported', () => {
    /*
     * The same guard the tally has, and it matters more here: the tally would
     * only miscount, while this would have to print a NAME for an id it cannot
     * look up. Silence is the only honest output.
     */
    const now: Found = { quests: ['ghost-quest'], bugs: ['ghost-bug'], eggs: ['ghost-clip'] };
    eq(newFinds(none, now).reduce((a, p) => a + p.names.length, 0), 0, 'a deleted id was named');
  });

  test('storage cleared mid-pass is not a find', () => {
    // The admin panel can forget a collection while a call is running. Losing
    // things is not finding them, and the screen must not say otherwise.
    const had: Found = { quests: ['join', 'chat'], bugs: [], eggs: [] };
    eq(newFinds(had, none).reduce((a, p) => a + p.names.length, 0), 0, 'a cleared list was read as a gain');
  });

  test('a duplicate saved id is named once', () => {
    const now: Found = { quests: ['join', 'join'], bugs: [], eggs: [] };
    eq(names(newFinds(none, now), 'quests').length, 1, 'a repeated id was named twice');
  });

  test('secret quests are reported by name, since this is where they surface', () => {
    // The tray lists a secret only after it is found, so the pass report is the
    // first place a visitor ever reads one of these titles.
    const secret = quests.find((q) => q.secret)!;
    const now: Found = { quests: [secret.id], bugs: [], eggs: [] };
    eq(names(newFinds(none, now), 'quests')[0], secret.name, 'a secret quest went unnamed');
  });

  test('names come out in declared order, not the order they were found', () => {
    // Stable between renders, and it reads as a list rather than a log.
    const now: Found = { quests: ['chat', 'join'], bugs: [], eggs: [] };
    const got = names(newFinds(none, now), 'quests');
    eq(got[0], 'Join the call', 'the pass reported finds in storage order');
    eq(got[1], 'Read the messages');
  });
});

/*
 * THE BOARD IS A DOCUMENT, and it can be wrong in ways nothing else notices.
 *
 * Board ticket N134. Two sessions working the same afternoon both numbered from
 * N108, so eight ids named two cards each. Nothing caught it: the panel renders
 * the cards in order, so two N110s look like two cards, and every code comment
 * that says "board ticket N110" quietly stopped being a reference.
 *
 * An id is the only part of a card that anything else depends on, so it is the
 * only part worth asserting.
 */
suite('the board', () => {
  test('every ticket id is unique', () => {
    const seen = new Map<string, string>();
    for (const t of boardTasks) {
      const first = seen.get(t.id);
      ok(first === undefined, `${t.id} is used twice: "${first}" and "${t.title}"`);
      seen.set(t.id, t.title);
    }
    eq(seen.size, boardTasks.length, 'a card was lost to a duplicate id');
  });

  test('every card is in a column the board renders', () => {
    const ids = new Set(boardColumns.map((c) => c.id));
    for (const t of boardTasks) {
      ok(ids.has(t.col), `${t.id} sits in "${t.col}", which is not a column`);
    }
  });

  test('no card is left without a title or a note', () => {
    for (const t of boardTasks) {
      ok(t.title.trim().length > 0, `${t.id} has no title`);
      ok(t.note.trim().length > 0, `${t.id} has no note`);
    }
  });
});

export async function run(withChaos = false): Promise<Result[]> {
  chaos = withChaos;
  const results: Result[] = [];
  for (const c of cases) {
    const t0 = performance.now();
    try {
      await c.fn();
      results.push({ suite: c.suite, name: c.name, pass: true, ms: performance.now() - t0 });
    } catch (err) {
      results.push({
        suite: c.suite,
        name: c.name,
        pass: false,
        error: err instanceof Error ? err.message : String(err),
        ms: performance.now() - t0,
      });
    }
  }
  return results;
}

export const total = cases.length;

suite('the admin gate', () => {
  const q = challenges[0]!;

  test('the password opens it, whatever the question was', () => {
    for (const c of challenges) eq(judge(c, 'konami'), 'password', `${c.id} refused the password`);
  });

  test('the password is forgiving about case and stray spacing', () => {
    eq(judge(q, 'KONAMI'), 'password');
    eq(judge(q, '  Konami  '), 'password');
    eq(judge(q, 'kOnAmI'), 'password');
  });

  test('a right answer to the decoy is right, and still not the password', () => {
    eq(judge(q, q.answers[0]!), 'right');
  });

  test('anything else is wrong', () => {
    eq(judge(q, 'no idea'), 'wrong');
    eq(judge(q, 'password'), 'wrong');
    eq(judge(q, 'admin'), 'wrong');
  });

  /*
   * The data test that matters. Every listed answer has to survive its own
   * normalisation, or the bank ships a question whose printed answer the dialog
   * rejects -- which reads as the joke being broken rather than as a typo.
   */
  test('every listed answer is accepted by its own question', () => {
    for (const c of challenges) {
      for (const a of c.answers) {
        eq(judge(c, a), 'right', `${c.id} rejected its own answer "${a}"`);
      }
    }
  });

  test('answers survive the spacing and casing a person would actually type', () => {
    for (const c of challenges) {
      const a = c.answers[0]!;
      eq(judge(c, ` ${a.toUpperCase()} `), 'right', `${c.id} failed on padded uppercase`);
      eq(judge(c, `${a}.`), 'right', `${c.id} failed on a trailing full stop`);
    }
  });

  /* If a question ever grew the password as an answer the door would open for a
     reason nobody intended. judge() checks the lock first, so it would still be
     a 'password', but the bank should not be quietly carrying the word. */
  test('no question accidentally carries the password as an answer', () => {
    for (const c of challenges) {
      ok(!c.answers.some((a) => normalise(a) === ADMIN_PASSWORD), `${c.id} lists the password`);
    }
  });

  test('every question is non-empty and has at least one answer', () => {
    for (const c of challenges) {
      ok(c.q.trim().length > 0, `${c.id} has no question`);
      ok(c.answers.length > 0, `${c.id} has no answer`);
    }
  });

  test('question ids are unique', () => {
    eq(new Set(challenges.map((c) => c.id)).size, challenges.length, 'two questions share an id');
  });

  test('there is a line for every outcome', () => {
    ok(wrongRoasts.length > 0, 'no roast for a wrong answer');
    ok(rightLines.length > 0, 'nothing to say when an answer counts');
    ok(passedLines.length > 0, 'nothing to say when the mark is reached');
    ok(grantedLines.length > 0, 'nothing to say when the password lands');
  });

  /*
   * THE SECOND DOOR -- board ticket N175. The password is unhintable on purpose,
   * so the bank is the only route for a reader who never makes that leap. All of
   * this is arithmetic over two lists, which is why it lives in data/admin.ts
   * and can be driven here without a DOM.
   */
  test('the bank is big enough for the mark, with room to be wrong', () => {
    ok(challenges.length >= ADMIN_PASS_MARK, 'the mark cannot be reached at all');
    ok(
      challenges.length > ADMIN_PASS_MARK,
      'the mark needs every question, so one bad question is a permanent wall',
    );
    /*
     * N190. The slack is not a nicety, it is what Shuffle spends: skipping is
     * only a decision if there are questions you can afford never to answer.
     * Half the bank is the floor Nam set when he cut the mark to twenty and
     * deliberately left the bank at forty.
     */
    ok(
      challenges.length >= ADMIN_PASS_MARK * 2,
      'less than half the bank is spare, which makes Shuffle a stall again',
    );
  });

  test('a solved question is not asked again', () => {
    const first = challenges[0]!.id;
    const left = remaining([first]);
    eq(left.length, challenges.length - 1, 'the solved question stayed in the queue');
    ok(!left.some((c) => c.id === first), 'the solved question came back');
  });

  test('an id that no longer names a question counts for nothing', () => {
    eq(remaining(['a-question-that-was-renamed']).length, challenges.length, 'a stale id removed a row');
    eq(score(['a-question-that-was-renamed']).got, 0, 'a stale id counted toward the mark');
  });

  test('the same id twice is one answer, not two', () => {
    const id = challenges[0]!.id;
    eq(score([id, id, id]).got, 1, 'a repeated id inflated the score');
  });

  test('the mark is what opens it, and not one short', () => {
    const ids = challenges.map((c) => c.id);
    ok(!score(ids.slice(0, ADMIN_PASS_MARK - 1)).passed, 'one short of the mark opened the door');
    ok(score(ids.slice(0, ADMIN_PASS_MARK)).passed, 'the mark did not open the door');
  });

  /*
   * Shuffle rotates rather than re-rolls, and this is the property that matters:
   * a random pick can hand back the question just skipped, which reads as the
   * button being broken. See shuffled() for the argument.
   */
  test('shuffle sends the question to the back, and keeps the rest in order', () => {
    const q = challenges.slice(0, 4);
    const after = shuffled(q);
    eq(after.length, q.length, 'shuffling lost or gained a question');
    ok(after[0]!.id !== q[0]!.id, 'the skipped question came straight back');
    eq(after[after.length - 1]!.id, q[0]!.id, 'the skipped question did not go to the back');
    eq(after.slice(0, 3).map((c) => c.id).join(), q.slice(1).map((c) => c.id).join());
  });

  test('shuffling one question is a no-op rather than a crash', () => {
    eq(shuffled(challenges.slice(0, 1)).length, 1);
    eq(shuffled([]).length, 0);
  });

  test('the password outranks the bank from any question', () => {
    for (const c of challenges) {
      eq(judge(c, ADMIN_PASSWORD), 'password', `the lock lost to the decoy on ${c.id}`);
    }
  });

  test('pick wraps rather than running off the end', () => {
    const xs = ['a', 'b', 'c'];
    eq(pick(xs, 0), 'a');
    eq(pick(xs, 4), 'b');
    eq(pick(xs, -1), 'c', 'a negative index fell off the front');
  });

  test('the counter opens the box on the eleventh press, not before', () => {
    ok(ADMIN_CLICKS === 11, 'the gesture is no longer eleven presses');
    ok(ADMIN_HINT_FROM < ADMIN_CLICKS, 'the hint starts after the box already opened');
    ok(ADMIN_HINT_FROM > 1, 'the very first press gives the gesture away');
  });

  /* The click effect is a pure function of the press count, which is the only
     reason it can be tested at all, and the two properties worth pinning are the
     two that took a revision each to get right. */
  test('the numbers walk the colour wheel and never repeat back to back', () => {
    const seen: number[] = [];
    for (let n = ADMIN_HINT_FROM; n <= ADMIN_CLICKS; n++) seen.push(dropColour(n));
    for (const c of seen) ok(c >= 0 && c < DROP_COLOURS, `colour ${c} is not on the wheel`);
    for (let i = 1; i < seen.length; i++) {
      ok(seen[i] !== seen[i - 1], `two ${seen[i]}s back to back at press ${ADMIN_HINT_FROM + i}`);
    }
    // Eight visible presses over the wheel: every colour on it shows up at least once.
    eq(new Set(seen).size, DROP_COLOURS, 'the run does not show every colour on the wheel');
  });

  test('the numbers are thrown both ways, strictly alternating', () => {
    const dirs: number[] = [];
    for (let n = ADMIN_HINT_FROM; n <= ADMIN_CLICKS; n++) dirs.push(dropDir(n));
    ok(dirs.includes(1), 'nothing is ever thrown to the right');
    ok(dirs.includes(-1), 'nothing is ever thrown to the left');
    for (let i = 1; i < dirs.length; i++) {
      eq(dirs[i], -dirs[i - 1], `press ${ADMIN_HINT_FROM + i} went the same way as the one before it`);
    }
  });

  test('a stored grant reads back, and anything else reads as locked', () => {
    ok(readAdmin('1'), 'a granted flag did not read back');
    ok(!readAdmin(null), 'a missing flag granted admin');
    ok(!readAdmin(''), 'an empty flag granted admin');
    ok(!readAdmin('0'), 'a zero granted admin');
    ok(!readAdmin('true'), 'a hand-edited flag granted admin');
  });
});
