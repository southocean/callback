// The build log.
//
// Framing matters here, and it was itself a review finding (H8). This panel is
// an engineering design review of *the artifact* — which is what it actually
// is. Every objection appears with the resolution that answered it, in the same
// block. It is a record of a process, not a list of a candidate's flaws.

export type Role = 'HR' | 'TL' | 'UX' | 'REF' | 'SEC' | 'A11Y';

export interface Finding {
  id: string;
  role: Role;
  round: 1 | 2 | 3 | 4;
  objection: string;
  resolution: string;
  /** What actually changed in the repo. Empty means nothing did, which is not allowed. */
  changed: string;
}

export const roleNames: Record<Role, string> = {
  HR: 'Recruiter',
  TL: 'Tech lead, Meet web',
  UX: 'Product designer',
  REF: 'The friend who refers me',
  SEC: 'Privacy reviewer',
  A11Y: 'Accessibility specialist',
};

export const phases = [
  {
    name: 'Plan',
    body:
      'One metaphor: the site is a call, and every control in the bar is a section of the CV. Nothing ' +
      'decorative. Constraints fixed up front — vanilla TypeScript, zero runtime dependencies, a size budget ' +
      'enforced by CI, full content with zero permissions granted, and no Google marks anywhere.',
  },
  {
    name: 'Review',
    body:
      'Three adversarial rounds against the plan before any product code was written, in the voices of the ' +
      'people who will actually open this and have reason to be sceptical — plus a fourth round against the game ' +
      'layer and the narrative, once those existed. Every finding changed something in the repo; three of them ' +
      'changed the architecture.',
  },
  {
    name: 'Build',
    body:
      'Strict TypeScript in modules with one job each. State is a pure reducer, which is why it can be ' +
      'unit-tested. The content lives in a single data module that both the call view and the plain document ' +
      'view render from, so they cannot drift.',
  },
  {
    name: 'QA',
    body:
      'The same roles again, against the running site in a real browser rather than against the plan. Keyboard ' +
      'only, then screen-reader semantics, then 375px, then reduced-motion, then with every permission denied.',
  },
];

export const findings: Finding[] = [
  {
    id: 'H1',
    role: 'HR',
    round: 1,
    objection:
      'A website is not in my workflow. I screen a PDF in an applicant tracking system, 30 to 90 seconds per ' +
      'candidate. If the only artifact is a web app I cannot process the application at all.',
    resolution:
      'The PDF stays the primary artifact and the site is the amplifier — never the other way round. Download ' +
      'is one click from the very first screen, not a reward for finishing.',
    changed: 'PDF link on the pre-join screen, the end screen and the plain document. Plain mode is print-styled.',
  },
  {
    id: 'H2',
    role: 'HR',
    round: 1,
    objection:
      'Two roles both marked "present", and the more recent one is in sales. On a fast scan that reads as ' +
      'having left engineering, or as a mistake on the CV.',
    resolution:
      'Draw the overlap honestly instead of hiding it. The People panel is a real timeline; the engineering ' +
      'bar is the longest one on it, which is the argument. The commercial role is described for what it is ' +
      'and what it was good for.',
    changed: 'Timeline geometry in the People panel, with concurrent roles shown as concurrent.',
  },
  {
    id: 'H3',
    role: 'HR',
    round: 1,
    objection:
      'TypeScript is a hard requirement for one of these roles and it does not appear anywhere on the CV. ' +
      'Neither does test automation. On a keyword screen this fails before a human sees it.',
    resolution:
      'Make the artifact the evidence rather than adding words to a document. This site is strict TypeScript ' +
      'with no dependencies and a real test suite you can run right here.',
    changed: 'The whole project. This objection is the reason it is written in TypeScript rather than JS.',
  },
  {
    id: 'H4',
    role: 'HR',
    round: 1,
    objection:
      'The referral matters more than the website. What I read first is the note the referrer writes, and ' +
      'most referrers write four vague sentences at 11pm.',
    resolution:
      'Write it for him. A short, fact-only, copy-paste blurb on the end screen, every sentence checkable ' +
      'against the CV, no superlatives to defend.',
    changed: 'The "For my referrer" block, with a copy button. Arguably the highest-leverage 200 words here.',
  },
  {
    id: 'H5',
    role: 'HR',
    round: 1,
    objection: 'Which of the two roles is this for? Applying to both simultaneously reads as unsure.',
    resolution: 'Name the target role on the first screen and map the experience to that specific posting.',
    changed: 'Target role on the pre-join screen; the requirement map in the Engineering panel.',
  },
  {
    id: 'H6',
    role: 'HR',
    round: 1,
    objection:
      'If this ships Google logos and brand colours, our brand team will not be amused and I cannot forward ' +
      'it internally. That is a hard stop, not a preference.',
    resolution:
      'No logos, no wordmarks, no Google palette. Its own name and its own accent colour, borrowing only the ' +
      'interaction language, with an explicit unaffiliated notice.',
    changed: 'Own visual identity. Disclaimer in the footer and on the end screen.',
  },
  {
    id: 'T1',
    role: 'TL',
    round: 1,
    objection:
      'A clone of our product is charming for ten seconds. What tells me you can work in our codebase is ' +
      'constraints met, not features added.',
    resolution:
      'Publish a hard budget and let CI enforce it. Under 50 KB of gzipped JavaScript, zero runtime ' +
      'dependencies. The number in the footer is measured at build time, so it cannot become a lie.',
    changed: 'build.mjs measures the gzipped bundle, stamps it into the HTML, and exits non-zero over budget.',
  },
  {
    id: 'T2',
    role: 'TL',
    round: 1,
    objection: 'If this arrives as React with 400 KB of JavaScript it is an anti-signal. We run a tiny hand-rolled framework.',
    resolution: 'No framework. Vanilla TypeScript, one bundle, hand-rolled DOM. Framework-free is the point.',
    changed: 'Zero runtime dependencies. The only devDependencies are the compiler and the bundler.',
  },
  {
    id: 'T3',
    role: 'TL',
    round: 1,
    objection: 'Anyone can put the word accessibility in a panel. I will tab through this and I will turn on a screen reader.',
    resolution:
      'Do the work, then let the page audit itself. Roving tabindex on the grid, focus trapped in panels, Esc ' +
      'to close, visible focus rings, polite live regions. The audit asserts against the live DOM and can fail.',
    changed: 'a11y module, and the audit tab in the Engineering panel.',
  },
  {
    id: 'T4',
    role: 'TL',
    round: 1,
    objection: 'An in-browser test runner is usually three fake tests and a green tick. Why would I believe this one?',
    resolution:
      'Test real logic — the state reducer, timeline overlap maths, the caption scheduler, the network model, ' +
      'shader parameter clamping. Then add a chaos switch that injects a fault so you can watch it go red.',
    changed: 'src/test/*, run both in CI and in the browser. Chaos toggle in the Tests tab.',
  },
  {
    id: 'T5',
    role: 'TL',
    round: 1,
    objection: 'If your WebGL effects drop frames or cook my laptop, they prove the opposite of what you want them to prove.',
    resolution:
      'Cap the effect loop at 30fps, request a low-power context, suspend on a hidden tab, show the frame ' +
      'time, fall back to CSS filters without WebGL, default to off, one keystroke to kill.',
    changed: 'fx/pipeline.ts: frame cap, visibility suspend, FPS readout, graceful fallback.',
  },
  {
    id: 'T6',
    role: 'TL',
    round: 1,
    objection:
      'The mahjong client is the most relevant thing on this CV and it is compressed into three bullets. ' +
      'Real-time shared state, reconnection, a desktop-to-web migration, an embedded renderer, five people — ' +
      'that is the story that maps onto a video client. Lead with it.',
    resolution: 'Promote it to the headline case study and write the parallels to conferencing out explicitly.',
    changed: 'First slide in Present, and the pitch line on the host tile.',
  },
  {
    id: 'T7',
    role: 'TL',
    round: 1,
    objection:
      'There is exactly one number on this entire CV: "team of 5". Everything else is unfalsifiable. And if ' +
      'you invent one, I will ask about it in the interview and we will both find out.',
    resolution:
      'A hard rule: nothing gets invented. Case studies say precisely what was built. Where a magnitude would ' +
      'help but could not be sourced, it stays out of the page and becomes an action item instead.',
    changed: 'Five open action items at the end of this log. Zero fabricated metrics anywhere in the build.',
  },
  {
    id: 'T8',
    role: 'TL',
    round: 1,
    objection: 'I will open this on a locked-down corporate laptop. No camera permission, no autoplay, strict policy.',
    resolution: 'Every word of content reachable with zero permissions granted. Camera and mic are opt-in behind a click.',
    changed: 'Nothing is gated behind a permission. Camera-off is the default state, not an error state.',
  },
  {
    id: 'U1',
    role: 'UX',
    round: 1,
    objection:
      'Novelty interfaces make content unreachable. If I have to discover your job history by clicking a fake ' +
      'camera button, I close the tab and you have lost.',
    resolution:
      'Dual mode, mandatory. A persistent labelled nav in the call, and a plain document mode that renders the ' +
      'entire CV as one accessible scrolling page from the same data.',
    changed: 'ui/plain.ts, linked from the pre-join screen, the control bar and the end screen.',
  },
  {
    id: 'U2',
    role: 'UX',
    round: 1,
    objection: 'What happens on a 375-pixel phone? A six-tile grid at that width is unusable.',
    resolution: 'Single column, tiles become cards, the control bar becomes a bottom sheet, panels go full-screen.',
    changed: 'Mobile layout rules, tested at 375px.',
  },
  {
    id: 'U3',
    role: 'UX',
    round: 1,
    objection: 'Pre-join screens are friction, and this company spends real engineering effort removing them. Ironic to add one.',
    resolution: 'One click, and any deep link skips it entirely so a link can point straight at a section.',
    changed: 'History-API routing. #chat, #present/mahjong, #plain all bypass pre-join.',
  },
  {
    id: 'U4',
    role: 'UX',
    round: 1,
    objection: 'Trippy effects plus autoplaying motion is an accessibility hazard — motion sickness at best, seizure risk at worst.',
    resolution:
      'Reduced-motion honoured globally, effects default to off, nothing flashes above 3Hz per WCAG 2.3.1, ' +
      'and the strongest preset says what it does before it engages.',
    changed: 'Motion guard in the FX pipeline and a note on the strongest preset.',
  },
  {
    id: 'U5',
    role: 'UX',
    round: 1,
    objection: 'A joke has five seconds to land. After that it is not a joke, it is a puzzle, and nobody solves a stranger’s puzzle.',
    resolution: 'The first screen says in plain words who, what role, and one line of why. Clarity first, charm second.',
    changed: 'Pre-join copy rewritten to lead with the plain facts.',
  },
  {
    id: 'U6',
    role: 'UX',
    round: 1,
    objection: 'Cohesion means honouring the metaphor everywhere — copy, icons, empty states, error states. Most people drop it at the edges.',
    resolution: 'Empty and error states stay in character. Denied camera reads "Your camera is off. So is mine — let’s talk anyway."',
    changed: 'All empty and error strings rewritten in voice.',
  },
  {
    id: 'R1',
    role: 'REF',
    round: 1,
    objection: 'My name goes on this internally. If it is cringe, or if it takes shots at the product, that lands on me.',
    resolution: 'Affectionate homage only. No jokes at the company’s expense, no "your product is broken and I would fix it".',
    changed: 'Tone pass over every string in the build.',
  },
  {
    id: 'R3',
    role: 'REF',
    round: 1,
    objection: 'If this prompts for camera access on a corporate machine, that is an awkward conversation I have to have.',
    resolution:
      'Never auto-prompted. Explicit click, with a plain statement that processing is local and nothing is ' +
      'uploaded — which is verifiable, because there is no backend to upload to.',
    changed: 'Camera is click-to-enable with the privacy note adjacent, not in a footer.',
  },
  {
    id: 'R4',
    role: 'REF',
    round: 1,
    objection: 'Do not imply I got you the job.',
    resolution: 'Thank the referral, keep it subordinate to the work.',
    changed: 'End-screen copy.',
  },
  {
    id: 'S1',
    role: 'SEC',
    round: 1,
    objection: 'Any analytics, any CDN, any third-party font, and I stop believing the privacy claim.',
    resolution: 'Zero third-party requests. Everything self-hosted, system fonts, works offline after first load.',
    changed: 'No external requests in the build. CSP meta tag.',
  },
  {
    id: 'S2',
    role: 'SEC',
    round: 1,
    objection: 'Prove the camera stream does not leave the device. Do not just tell me.',
    resolution: 'Say it on the page and make it checkable: open the Network tab and watch nothing happen.',
    changed: 'Privacy note invites verification instead of asking for trust.',
  },
  {
    id: 'H7',
    role: 'HR',
    round: 2,
    objection:
      'Your two artifacts now contradict each other. The site fixes the story and the PDF you link is the old ' +
      'one, still missing TypeScript and testing. Inconsistency between artifacts is worse than either alone.',
    resolution:
      'Print stylesheet on plain mode generates a tuned one-pager from the same data, so both artifacts say ' +
      'the same thing. Replacing the attached PDF is action item one.',
    changed: 'Print styles, and the action item.',
  },
  {
    id: 'H8',
    role: 'HR',
    round: 2,
    objection:
      'This panel hands me the objection. A recruiter who opens it and reads "his current role is sales, which ' +
      'looks bad" has just been given the reason to pass on you. You are doing my job for me, badly.',
    resolution:
      'Reframe the whole feature. It is a design review of the artifact — because that is what it is. ' +
      'Findings are constraints on the build, never weaknesses of the candidate, and no objection appears ' +
      'without its resolution attached. Running an adversarial review on your own work is a strength. ' +
      'Publishing a list of your flaws is not.',
    changed: 'Renamed to Build log, restructured so objection and resolution are inseparable. This one changed the feature.',
  },
  {
    id: 'T10',
    role: 'TL',
    round: 2,
    objection: 'You claim under 50 KB. Measure it at build time and fail the build when it is exceeded, or it is just a number in a footer.',
    resolution: 'The build measures, stamps and gates. CI runs it on every push.',
    changed: 'Size gate in build.mjs, wired into the GitHub Actions workflow.',
  },
  {
    id: 'T11',
    role: 'TL',
    round: 2,
    objection: 'Captions that imply live speech recognition when there is no audio are a lie, and I will notice.',
    resolution:
      'Label the transcript as scripted. Separately, if you grant a mic, real SpeechRecognition transcribes ' +
      'you. Honest in both directions.',
    changed: 'Transcript labelled; optional live recognition kept clearly separate.',
  },
  {
    id: 'T12',
    role: 'TL',
    round: 2,
    objection: 'Hand-rolled routing is where these projects break. Make the back button work.',
    resolution: 'History API routing, every panel linkable, back and forward behave.',
    changed: 'Router in main.ts.',
  },
  {
    id: 'U7',
    role: 'UX',
    round: 2,
    objection:
      'This is a Swiss Army knife. Six controls, five panels, a build log, an audit, a test runner, a perf ' +
      'readout, a network simulator. It will read as a tech demo, and a tech demo is not a portfolio.',
    resolution:
      'Two tiers. Tier one is the story: tiles, chat, present, people, captions, end call. Tier two is every ' +
      'technical thing, behind one door labelled Engineering. Depth without clutter.',
    changed: 'Information architecture rebuilt around a single Engineering panel with tabs.',
  },
  {
    id: 'U8',
    role: 'UX',
    round: 2,
    objection: 'Effects with no purpose are decoration, and decoration undercuts everything serious next to it.',
    resolution:
      'Frame them as what they are: a real-time filter chain, the same class of feature this product ships. ' +
      'Sober presets next to the fun one. On-domain, not random.',
    changed: 'Effects moved into the Engineering panel with engineering framing and a frame-time readout.',
  },
  {
    id: 'R5',
    role: 'REF',
    round: 2,
    objection: 'The blurb must not oversell. If I write "best front-end engineer I know" and you bomb the loop, that is my credibility.',
    resolution: 'Fact-only, no superlatives, every sentence checkable against the CV.',
    changed: 'Referral blurb rewritten with every adjective removed.',
  },
  {
    id: 'T13',
    role: 'TL',
    round: 3,
    objection: 'Your plain mode and your call mode will drift apart within a week. They always do.',
    resolution: 'Both render from one data module. There is no second copy of the content to drift.',
    changed: 'src/data/cv.ts as the only source. Enforced by there being nowhere else to put content.',
  },
  {
    id: 'U9',
    role: 'UX',
    round: 3,
    objection: 'What do I see in the first 200 milliseconds? If it is a white screen, the trick is dead before it starts.',
    resolution: 'The first screen is static HTML with critical CSS inlined. It paints with JavaScript disabled.',
    changed: 'Pre-join markup lives in index.html, not in the bundle.',
  },
  {
    id: 'A1',
    role: 'A11Y',
    round: 3,
    objection: 'A live region that updates every two seconds does not help a screen reader user. It floods them and they turn it off.',
    resolution: 'Captions are polite and debounced; the full transcript is a static readable region rather than a firehose.',
    changed: 'Caption live region debounced; transcript rendered as a static list.',
  },
  {
    id: 'R6',
    role: 'REF',
    round: 3,
    objection: 'I am pasting this into a chat. The preview card is what people actually see, and a bare URL looks like spam.',
    resolution: 'Open Graph and Twitter meta, name and target role in the title, generated share card.',
    changed: 'Meta tags and share-card.svg.',
  },
  {
    id: 'S3',
    role: 'SEC',
    round: 3,
    objection: 'A public repo with a phone number in it is a gift to scrapers, and it will be in the git history forever.',
    resolution:
      'The phone number is not on this site at all. The email is assembled in script rather than sitting in ' +
      'the markup. The number stays in the PDF, which is sent deliberately rather than crawled.',
    changed: 'Phone omitted from the web build entirely; email assembled at runtime.',
  },
  {
    id: 'U10',
    role: 'UX',
    round: 4,
    objection:
      'You now have two metaphors. Round one said honour one and honour it everywhere, and now there is a video ' +
      'call wearing an achievement system. Two costumes read as no costume.',
    resolution:
      'The call is the container; the game is the subtext, never a competing layer. There is no scoreboard, no ' +
      'HUD, no progress bar across the top — one quiet toast and one list, inside the Storyline tab. And every ' +
      'quest is named after something you do in a call: answer it, read the letter, meet the participants. The ' +
      'game describes the call instead of replacing it.',
    changed: 'Quest names rewritten in call language. Single toast tray, no persistent scoreboard.',
  },
  {
    id: 'H10',
    role: 'HR',
    round: 4,
    objection:
      'Gamifying a job application is a real risk with me. I have to file this, not play it, and if the game is ' +
      'in my way I will resent it by the second toast.',
    resolution:
      'Nothing is gated behind a quest, and the counter is one small line in the corner of the control bar. ' +
      'Plain mode carries no game layer at all — so the version you print, file, or skim is entirely straight.',
    changed: 'Zero game UI in plain mode. Quests never block content or interrupt a control.',
  },
  {
    id: 'H11',
    role: 'HR',
    round: 4,
    objection:
      'The proposed story was that working here is the dream and the main quest. That sentence is in half my ' +
      'inbox, always from the least prepared candidates, and it tells me nothing about whether you can do the ' +
      'work. It also implies your last seven years were a warm-up.',
    resolution:
      'The game framing stayed; the prestige framing went. The main quest is now the problem — four people on ' +
      'four networks who must see the same thing at the same instant — not the company. Same energy, and it ' +
      'points at the job instead of the logo.',
    changed: 'src/data/story.ts, with the full argument published in the Storyline tab rather than quietly applied.',
  },
  {
    id: 'T14',
    role: 'TL',
    round: 4,
    objection:
      'Forty seconds of video on a page whose whole pitch is a 50 KB budget. Pick one.',
    resolution:
      'The budget is a JavaScript budget and it still holds at around 38 KB gzipped. The reel is roughly 1.5 MB ' +
      'in total, which is one stock photo on a normal careers page, and it loads metadata only — no clip is ' +
      'fetched until you ask for it. Said out loud on the page rather than hidden.',
    changed: 'preload="metadata", lazy clip loading, and the payload stated in the panel.',
  },
  {
    id: 'A2',
    role: 'A11Y',
    round: 4,
    objection:
      'An auto-advancing carousel is a straightforward WCAG failure: moving content with no way to stop it. ' +
      'Adding video that plays itself makes it worse, not better.',
    resolution:
      'Nothing plays until you press play once. Pause, previous and next are always present. Sound stays off ' +
      'until you ask for it, and under reduced-motion the reel stops at the end of every clip and waits.',
    changed: 'Reduced-motion branch in the reel, explicit controls, muted by default.',
  },
  {
    id: 'U11',
    role: 'UX',
    round: 4,
    objection:
      'Five clips from five sources, three of them phone-vertical and one landscape. A reel that changes shape ' +
      'every eight seconds looks broken, and the viewer blames the page rather than the footage.',
    resolution:
      'Everything is cut to a square 480 box and centre-cropped rather than letterboxed, so each clip fills the ' +
      'frame and the frame never moves. The label strip above it always says what you are looking at and what ' +
      'it is evidence of.',
    changed: 'One encode profile for the whole reel. Persistent label and caption above the player.',
  },
];

/** What the build refused to invent (T7). */
export const actionItems = [
  'Replace the attached PDF with a print of plain mode. The old file omits TypeScript and test automation, which are hard requirements.',
  'Supply real magnitudes for Mahjong Logic — players, concurrent tables, release cadence, platform split. Every one was left out rather than guessed.',
  'Record a 20-second pitch clip for the host tile. The page works without it and is better with it.',
  'Confirm the target role. The copy is written for the senior posting.',
];

export interface QaFinding {
  id: string;
  role: Role;
  found: string;
  fix: string;
}

/** Post-build QA, against the running site rather than the plan. */
export const qa: QaFinding[] = [
  {
    id: 'Q1',
    role: 'UX',
    found:
      'The first screen was gone. The static pre-join markup painted correctly, and then the bundle booted, ' +
      'decided it owned the screen, and replaced it with a plain fallback — so the one screen that was ' +
      'engineered to arrive instantly was the one screen nobody ever saw.',
    fix: 'Boot now leaves the static pre-join in place instead of re-rendering over it. Found by opening the page.',
  },
  {
    id: 'Q2',
    role: 'A11Y',
    found:
      'The accessibility audit failed its own check: zero <main> landmarks in the call view. The stage was a div ' +
      'with id="main", which the skip link pointed at but no screen reader treats as a landmark.',
    fix:
      'The stage is a real <main>, and so is the document view. Worth noting the audit caught this unprompted — ' +
      'which is the argument for having built it in the first place.',
  },
  {
    id: 'Q3',
    role: 'TL',
    found:
      'The timeline wasted a lane. Lane packing compared each span only against the last one placed, so a role ' +
      'that started earlier than everything in a lane was pushed to a new row it did not need.',
    fix:
      'Replaced with interval-graph colouring: a span joins the first lane it collides with nothing in. Five roles ' +
      'now fit in two lanes. Caught by a unit test, not by looking.',
  },
  {
    id: 'Q4',
    role: 'TL',
    found:
      'clamp01(Infinity) returned 0. Infinity is out of range, not invalid — clamping it to the floor rather ' +
      'than the ceiling is silently wrong in the direction nobody checks.',
    fix: 'Only NaN is refused now; everything else clamps to the nearer bound. Caught by a unit test.',
  },
  {
    id: 'Q5',
    role: 'HR',
    found:
      'The no-superlatives test failed on the referral blurb — because of the phrase "best-paper award", which ' +
      'is the name of an award rather than a boast.',
    fix:
      'The rule is about self-description, so the award name is exempt. A test that flags a true statement is a ' +
      'bad test, not a reason to rename the award.',
  },
  {
    id: 'Q6',
    role: 'REF',
    found:
      'A clip from a friend’s film was on the shortlist for the reel. It is not my footage, and I could not ' +
      'confirm from the frames which performer was me.',
    fix:
      'Left out, and the omission is stated on the page rather than passed over in silence. Publishing someone ' +
      'else’s film on my job application is not my call to make.',
  },
];

export const stats = {
  findings: findings.length,
  rounds: 3,
  architectureChanges: 3,
  qa: qa.length,
};
