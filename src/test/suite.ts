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
  readyCardOpens, afterReadyShown, afterReadyClosed, READY_MUTE_MS, READY_MAX_SHOWS,
  readInterview, afterInterview, clockMs, INTERVIEW_MIN_MS, INTERVIEW_MAX_MS,
} from '../prefs.js';
import { reduceTour, initialTour, nextScripted, registerFor, QUEUE_BRIEF, type TourState } from '../tour/director.js';
import {
  parts as tourParts, quips as tourQuips, acks as tourAcks, story as tourStory,
  outro, asides, timeline, runtimeMs, transcriptLines, OUTRO_CAP_MS,
} from '../data/tour.js';
import {
  observe, initialVisitor, tier, pace, passive, acknowledge, interests,
  BAIL_MS, IDLE_MS, PACE_MAX, type Visitor,
} from '../tour/profile.js';
import { readSeenEggs, stillUnseen } from '../prefs.js';
import { VISIBLE_QUESTS } from '../data/quests.js';

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

suite("the meeting's ready card", () => {
  // The whole point of splitting prefs.ts into pure rules plus two lines of
  // storage is that the rules can be driven against a fixed clock. T0 is
  // arbitrary; every case below is relative to it.
  const T0 = 1_700_000_000_000;
  const HOUR = READY_MUTE_MS;

  test('a first-time visitor sees it', () => {
    ok(readyCardOpens(null, T0), 'nothing remembered should mean it opens');
  });

  test('it opens a second time if the first went unread', () => {
    const g = afterReadyShown(null, T0);
    eq(g.shows, 1);
    ok(readyCardOpens(g, T0 + 60_000), 'one unread show is not enough to mute it');
  });

  test('two shows mute it', () => {
    const g = afterReadyShown(afterReadyShown(null, T0), T0 + 60_000);
    eq(g.shows, READY_MAX_SHOWS);
    ok(!readyCardOpens(g, T0 + 120_000), 'it should be muted after the second show');
  });

  test('closing it mutes it immediately, after only one show', () => {
    const g = afterReadyClosed(afterReadyShown(null, T0), T0 + 5_000);
    ok(g.closed);
    ok(!readyCardOpens(g, T0 + 6_000), 'closing it is the clearest possible signal');
  });

  test('the mute expires after exactly an hour', () => {
    const g = afterReadyClosed(null, T0);
    ok(!readyCardOpens(g, T0 + HOUR - 1), 'still muted one millisecond early');
    ok(readyCardOpens(g, T0 + HOUR), 'the hour is up, so it may open again');
  });

  test('an expired record resets the count rather than carrying it', () => {
    // Otherwise a visitor who saw it twice yesterday gets one show today
    // instead of two, and the count would only ever ratchet upward.
    const stale = afterReadyShown(afterReadyShown(null, T0), T0 + 1);
    eq(afterReadyShown(stale, T0 + HOUR * 2).shows, 1);
  });

  test('closing it survives a reload inside the window', () => {
    // The bug this guards: reading the flag but rebuilding the record from
    // scratch on the next visit, which un-mutes it on every page load.
    const g = afterReadyClosed(null, T0);
    const roundTripped = JSON.parse(JSON.stringify(g)) as typeof g;
    ok(!readyCardOpens(roundTripped, T0 + 30 * 60_000));
  });

  test('junk in storage reads as a first visit rather than throwing', () => {
    // localStorage is hand-editable, so none of these may take the card down.
    for (const junk of [{}, { shows: 'lots' }, { shows: 1 }, { at: T0 }, null]) {
      ok(readyCardOpens(junk as never, T0), `junk ${JSON.stringify(junk)} should open`);
    }
  });

  test('a clock that jumped backwards does not mute it forever', () => {
    // A record stamped in the future would otherwise never satisfy now - at >= HOUR.
    const future = afterReadyClosed(null, T0 + HOUR * 24);
    ok(readyCardOpens(future, T0), 'a future record is a moved clock, not a mute');
  });

  test('being closed always implies having been seen', () => {
    // shows: 0 with closed: true is contradictory, and would read as muted
    // forever to anything that counts shows instead of checking the flag.
    ok(afterReadyClosed(null, T0).shows >= 1);
  });
});

suite('content integrity', () => {
  /*
   * N30. The tour's opening line names a number out loud: "maybe you can
   * complete all 17 achievements." A number in a script that nothing checks is a
   * number that goes wrong the first time somebody adds a quest, and it goes
   * wrong in the worst possible place -- the second sentence a stranger hears.
   */
  test('the number of achievements the script promises is the number there are', () => {
    const intro = tourParts.find((p) => p.id === 'intro');
    const line = intro?.lines.map((l) => l.text).join(' ') ?? '';
    const said = /\ball (\d+) achievements\b/.exec(line);
    ok(!!said, 'the opening no longer names an achievement count');
    eq(Number(said![1]), VISIBLE_QUESTS, 'the script promises a different number of achievements than exist');
  });

  test('the referral blurb carries no superlatives', async () => {
    // Review R5: the friend has to defend every sentence of it.
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
    ok(!chaos, 'chaos mode is on — this failure is deliberate, and proves the runner is live');
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
    // The last line has no silence after it -- the captions go off instead.
    const gaps = outro.slice(0, -1).map((l) => l.gap);
    for (let i = 1; i < gaps.length; i += 1) {
      ok(gaps[i]! > gaps[i - 1]!,
        `outro line ${i} comes back sooner than the one before it, so the winding-down reads as a restart`);
    }
    eq(outro[outro.length - 1]!.gap, 0, 'the last line has a silence after it, so nothing ends the outro');
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
    for (const l of outro) {
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
  test('the outro fits inside its cap even at the slowest pace', () => {
    const shown = outro.reduce((a, l) => a + l.ms, 0);
    const silent = outro.reduce((a, l) => a + l.gap, 0);
    const total = shown + silent;
    ok(total <= OUTRO_CAP_MS, `the outro runs ${Math.round(total / 1000)}s, over its ${OUTRO_CAP_MS / 1000}s cap`);
    const worst = shown * PACE_MAX + silent;
    ok(worst <= OUTRO_CAP_MS,
      `at the slowest pace the outro runs ${Math.round(worst / 1000)}s, over its ${OUTRO_CAP_MS / 1000}s cap`);
  });

  test('the outro ends on the goodbye, not on a joke', () => {
    const last = outro[outro.length - 1]?.text ?? '';
    ok(/thank you/i.test(last), 'the last thing said after the goodbye is not a thank you');
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
    const spoken = [
      ...tourParts.flatMap((p) => [...p.lines, ...p.commentary, ...p.brief, ...(p.bail?.lines ?? [])]),
      ...tourQuips, ...tourAcks, ...outro,
      ...tourStory.flatMap((c) => c.lines),
      ...Object.values(asides),
    ].map((l) => l.text);
    const all = [...spoken, ...tourStory.map((c) => c.q)];
    for (const text of all) {
      ok(!/[—–]/.test(text), `an em dash is still in the script: "${text.slice(0, 56)}"`);
    }
  });

  test('nothing in the script calls itself a tour', () => {
    const spoken = [
      ...tourParts.flatMap((p) => [...p.lines, ...p.commentary, ...p.brief, ...(p.bail?.lines ?? [])]),
      ...tourQuips, ...tourAcks, ...outro,
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
    let s = reduceTour(initialTour, { t: 'start' });
    s = reduceTour(s, { t: 'quip', id: q.id });
    eq(s.interject, q.id, 'the quip did not take the floor');
    s = reduceTour(s, { t: 'quipDone' });
    const again = reduceTour(s, { t: 'quip', id: q.id });
    eq(again.interject, null, 'a throwaway line was said twice');
  });

  test('a quip never enters the queue or changes the register', () => {
    let s = reduceTour(initialTour, { t: 'start' });
    const before = { queue: s.queue.length, register: s.register, current: s.current };
    for (const q of tourQuips.slice(0, 4)) {
      s = reduceTour(s, { t: 'quip', id: q.id });
      s = reduceTour(s, { t: 'quipDone' });
    }
    eq(s.queue.length, before.queue, 'commentary was queued as if it were a part');
    eq(s.register, before.register, 'commentary changed the register');
    eq(s.current, before.current, 'commentary took the floor from the flow');
  });

  test('an unknown quip id is refused rather than half-played', () => {
    const s = reduceTour(reduceTour(initialTour, { t: 'start' }), { t: 'quip', id: 'nope' });
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
    eq(reduceTour(telling, { t: 'quip', id: tourQuips[0]!.id }).interject, null);
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
    const text = 'And the tests are real — they run in your browser, and you can break them.';
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
