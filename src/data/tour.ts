// The guided tour's script.
//
// Data only. The director in src/tour/director.ts decides what plays; the stage
// in src/tour/stage.ts puts it on screen. Keeping the script here is what makes
// the script editor (board ticket N26) possible without it reaching into logic.
//
// See tools/PLAN-guided-tour.md for why the shape is what it is. The short
// version: every part carries THREE registers rather than one script that gets
// truncated. `lines` is the tour showing you something, `commentary` is the tour
// reacting to you opening it yourself, and `brief` is what it says when you are
// clicking faster than it can talk. A single script cut short reads as a script
// cut short; three registers let the director pick a tone instead of a length.

/** One caption. `ms` is authored, not derived — a joke needs a pause a word count cannot predict. */
export interface Line { text: string; ms: number }

/** What the cursor does, keyed to the line it fires on. */
export interface Beat {
  /** Index into the part's lines. */
  at: number;
  /** CSS selector, resolved at beat time. An unresolvable target is skipped, silently. */
  move?: string;
  /** Press it once the cursor arrives. */
  click?: boolean;
  /** Linger after arriving, ms. */
  hold?: number;
}

/** What has to be on screen for a part to make sense. */
export type Needs = 'call' | 'share' | 'cv' | 'panel';

export interface Part {
  id: string;
  label: string;
  /** Lower plays earlier, and is also the order things get cut in. */
  priority: number;
  needs?: Needs;
  /** A jump may land on a 'clean' part without feeling like a cut. */
  entry: 'clean' | 'mid';
  lines: Line[];
  beats?: Beat[];
  /** Said instead of `lines` when the visitor opened this themselves. */
  commentary: Line[];
  /** The shortest honest version, for when the queue is long. */
  brief: Line[];
  /** Clicking any of these is what "the visitor opened this part" means. */
  triggers?: string[];
}

const L = (text: string, ms: number): Line => ({ text, ms });

export const parts: Part[] = [
  {
    id: 'intro',
    label: 'Who and what',
    priority: 1,
    entry: 'clean',
    lines: [
      L('Hi — I am Nam. This is my CV, and it is a working rebuild of the Meet web client.', 4200),
      L('I will walk you through it. Click anything at any time and I will follow you instead.', 4000),
    ],
    commentary: [L('Starting from the top, then.', 2000)],
    brief: [L('I am Nam. This is my CV, built as a Meet clone.', 2600)],
  },
  {
    id: 'cv',
    label: 'The CV itself',
    priority: 2,
    needs: 'cv',
    entry: 'clean',
    lines: [
      L('This is the CV. Same document you would get as a PDF, rendered from one data module.', 4200),
      L('Seven years leading the front end of a real-time multiplayer client — which is the same shape of problem as a video call.', 5200),
    ],
    beats: [{ at: 0, move: '.cb-tab', hold: 300 }],
    commentary: [
      L('The CV, yes. One data module renders this and the call, so they cannot disagree.', 4200),
    ],
    brief: [L('The CV — one data module, also renders the call.', 2600)],
    triggers: ['[data-icon="cv"]', '.cb-tab'],
  },
  {
    id: 'wasabi',
    label: 'Wasabi Productions',
    priority: 3,
    needs: 'cv',
    entry: 'clean',
    lines: [
      L('Seven years at Wasabi Productions on a mahjong client — web, then Unity, now React Native for web and mobile.', 5200),
      L('Shared state across four seats, reconnection, latency. One of them is always on hotel wifi.', 4600),
    ],
    commentary: [L('Wasabi — the mahjong client, through three platform generations.', 3800)],
    brief: [L('Wasabi Productions: a real-time mahjong client, three platforms.', 3000)],
  },
  {
    id: 'build',
    label: 'How this was built',
    priority: 4,
    entry: 'clean',
    lines: [
      L('This page has no framework and no dependencies. The interface was measured off the real product, not eyeballed.', 5000),
      L('There is a size budget the CI fails on, and a test suite you can run from inside the call.', 4400),
    ],
    commentary: [L('The build: no dependencies, measured rather than eyeballed, budget enforced in CI.', 4400)],
    brief: [L('No framework, no dependencies, measured off the real product.', 3000)],
  },
  {
    id: 'desktop',
    label: 'The shared desktop',
    priority: 5,
    needs: 'share',
    entry: 'clean',
    lines: [
      L('The shared screen is not a screenshot. It is a desktop — windows that drag, snap, minimise and stack.', 5000),
      L('There is a file explorer, a browser, and a media player in there. All of it is ours.', 4200),
    ],
    beats: [{ at: 1, move: '.dk-task.dk-pin', hold: 400 }],
    commentary: [L('The desktop, yes — windows, an explorer, a browser and a player. All ours.', 4200)],
    brief: [L('A real desktop: windows, explorer, browser, player.', 2800)],
    triggers: ['.dk-icon', '.dk-task'],
  },
  {
    id: 'a11y',
    label: 'Accessibility',
    priority: 6,
    needs: 'panel',
    entry: 'clean',
    lines: [
      L('Accessibility is audited here rather than claimed. That panel runs the audit live, on this page.', 4600),
      L('Roving tabindex, live regions, reduced-motion, keyboard paths for everything.', 4000),
    ],
    commentary: [L('The accessibility audit — it runs live, against this page.', 3800)],
    brief: [L('Accessibility, audited live in that panel.', 2600)],
    triggers: ['[data-tab="a11y"]'],
  },
  {
    id: 'tests',
    label: 'The tests',
    priority: 7,
    needs: 'panel',
    entry: 'clean',
    lines: [
      L('Fifty-one tests, and you can run them right now. Same suite the CI runs.', 4200),
      L('There is also a switch that breaks them on purpose, so you can see them fail.', 4000),
    ],
    commentary: [L('The tests — same suite as CI, runnable from here.', 3600)],
    brief: [L('Fifty-one tests, runnable from that panel.', 2600)],
    triggers: ['[data-tab="tests"]'],
  },
  {
    id: 'offclock',
    label: 'Off the clock',
    priority: 8,
    entry: 'clean',
    lines: [
      L('Off the clock: stand-up, short films, and organising a zombie walk that ended up on SVT.', 4600),
    ],
    commentary: [L('Stand-up, short films, and a zombie walk that made the local news.', 3800)],
    brief: [L('Stand-up, acting, a zombie walk on SVT.', 2400)],
    triggers: ['[data-tab="offclock"]'],
  },
  {
    id: 'referral',
    label: 'The referral',
    priority: 9,
    entry: 'clean',
    lines: [
      L('There is a referral on the Calls tab — someone who has worked with me and offered to say so.', 4600),
    ],
    commentary: [L('That is the referral. He offered; I did not have to ask twice.', 3600)],
    brief: [L('A referral is on the Calls tab.', 2200)],
  },
  {
    id: 'close',
    label: 'Close',
    priority: 10,
    entry: 'clean',
    lines: [
      L('That is the tour. The plain document is in the top left if you would rather just read it, and there is a PDF.', 5000),
      L('Thanks for the time — genuinely. Have a look around.', 3400),
    ],
    commentary: [L('The plain document is top left, and there is a PDF next to it.', 3600)],
    brief: [L('Plain document top left, PDF beside it. Thanks for the time.', 3000)],
  },
];

/**
 * What the director says when it changes register, kept here so the script
 * editor can show them alongside the parts they interrupt.
 */
export const asides = {
  /** Queue is getting long: said once, then never again. */
  shorten: L('Lots to look at — I will keep these short.', 2800),
  /** Queue is too long: the tour hands over and stops. */
  handOver: L(
    'You clearly know your way around. I will get out of the way — everything is where you would expect, '
    + 'and the plain document is in the top left. Thanks for the time.',
    6000,
  ),
  /** The visitor pressed Stop. */
  stopped: L('Of course — I will leave you to it.', 2400),
};
