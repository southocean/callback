# Adversarial design review

Three rounds against the plan, before a line of product code was written. Each round is run in the voice of someone who will actually see this artifact and has a reason to be sceptical. A round closes only when every point has a resolution that changed the build.

Roles: **HR** (Google staffing, Stockholm) · **TL** (tech lead, Meet web client) · **UX** (product designer on the team) · **REF** (the friend inside Meet who puts his name on the referral) · **SEC** (privacy/security reviewer — camera access invites scrutiny).

---

## Round 1 — against the first concept

### HR

**H1. "A website is not in my workflow."** I screen a PDF in an applicant tracking system, 30-90 seconds. If the only artifact is a web app, I cannot process the application at all.
→ **Resolved.** The PDF stays the primary artifact; the site is the amplifier. One-click PDF download from the *first* screen, not buried behind "end call". Plain mode is print-styled so Ctrl+P yields a clean, ATS-parseable one-pager.

**H2. "His current role is Sales Representative."** Nobisoft, Nov 2025-present. On a scan that reads as *left engineering*. And "Mahjong Logic, Apr 2019-Present" overlaps it — two concurrent "Present" roles look like an error or moonlighting.
→ **Resolved.** The People panel is a real timeline with the overlap drawn honestly, and Nobisoft is framed for what it is: a commercial-facing role held alongside continuing engineering work. The engineering spine is unmistakable because it is the longest bar on the chart. Not hidden, not spun.

**H3. "TypeScript does not appear on his CV."** It is a hard requirement for SWE III. Neither does test automation. On a keyword screen he fails.
→ **Resolved.** The artifact *is* the evidence: written in TypeScript, zero dependencies, with a real test suite the visitor can run. Both keywords appear in plain mode inside true statements. Highest-value fix in the project.

**H4. "The referral is worth more than the website."** If his friend refers him, what the recruiter reads is the referral note.
→ **Resolved.** Added a **For my referrer** block on the end screen: a short, copy-paste, fact-only blurb for the internal referral form. Nobody builds this. It is the highest-leverage 200 words on the site.

**H5. "Which role is he applying for?"** Applying to both at once reads as unsure.
→ **Resolved.** The target role is named on the pre-join screen, and the site maps his experience to that ad's requirements line by line.

**H6. "Legal will not be amused."** If it ships Google's logo and brand colours I cannot forward it internally.
→ **Resolved.** No logos, no wordmarks, no Google palette. Own identity, own accent colour, explicit "not affiliated with Google" line in the footer.

### TL

**T1. "A Meet clone is cute for ten seconds."** What tells me he can work in *our* codebase is constraints met, not features added.
→ **Resolved.** Hard budget published and enforced in CI: under 50 KB gzipped JS, zero runtime deps. The measured byte count is stamped into the page at build time, not typed in by hand.

**T2. "If it's React with 400 KB of JS it's an anti-signal."** We run Wiz — tiny, hand-rolled, performance-first.
→ **Resolved.** Vanilla TS, single bundle, no framework. Framework-free is the flex.

**T3. "Anyone can put a11y in a panel."** I will tab through it and I will turn on a screen reader.
→ **Resolved.** Roving tabindex on the tile grid, focus trapping in panels, Esc to close, visible focus rings, `aria-live` on captions and participant changes, no keyboard traps. The audit panel runs assertions against the live DOM and is allowed to fail.

**T4. "An in-browser test runner is usually three fake tests."**
→ **Resolved.** Real tests over real logic — state reducer, timeline overlap maths, caption scheduler, shader parameter clamping, network simulator distribution. The same suite runs in CI. Plus a **chaos switch** that injects a fault so the visitor can watch the suite go red: proof the harness is live and not a screenshot of green ticks.

**T5. "If the WebGL effects drop frames or cook my laptop, they prove the opposite of the point."**
→ **Resolved.** FX capped at 30 fps, `powerPreference: 'low-power'`, auto-suspend on hidden tab, FPS readout, CSS-filter fallback when WebGL is unavailable, default OFF, one keystroke to kill.

**T6. "The mahjong client is the most relevant thing on his CV and it's three bullets."** Real-time state sync, reconnection, latency compensation, a desktop-to-web migration, a team of five — that is the story that maps onto a video client.
→ **Resolved.** Mahjong Logic is the headline case study, written with the parallels to conferencing problems made explicit.

**T7. "There is exactly one number on this entire CV: 'team of 5'."**
→ **Resolved, with a hard rule.** Every case study states specifics of *what* was built. Where a magnitude would help but cannot be sourced, it becomes an action item for Nam in the build log — it never renders as a claim. A fabricated metric is fatal in an interview; this project invents nothing.

**T8. "I will open this on a locked-down corporate laptop."** No camera permission, strict CSP.
→ **Resolved.** Full content with zero permissions granted. Camera and mic are strictly opt-in behind a click.

### UX

**U1. "Novelty UIs make content unreachable."** If I have to discover his experience by clicking a fake camera button, I bounce.
→ **Resolved.** Persistent labelled navigation plus plain mode — the whole CV as one scrolling document, same data source. Dual mode is mandatory, not a nice-to-have.

**U2. "What happens on a 375 px phone?"** A six-tile grid is unusable.
→ **Resolved.** Mobile layout: single column, tiles become cards, control bar becomes a bottom sheet.

**U3. "Pre-join screens are friction, and Google spends real effort removing them."** Ironic to add friction to a CV.
→ **Resolved.** Pre-join is one click, and deep links (`#chat`, `#present/mahjong`) bypass it entirely so the referrer can link straight to a section.

**U4. "'Trippy effects' plus autoplay is an accessibility hazard."** Motion sickness, and seizure risk.
→ **Resolved.** `prefers-reduced-motion` honoured globally, FX default off, nothing flashes above 3 Hz (WCAG 2.3.1), and the strongest preset warns before it engages.

**U5. "A joke has five seconds to land, or it isn't a joke, it's a puzzle."**
→ **Resolved.** The pre-join screen says in plain words who he is, what role he wants, and one line of why. Charm second, clarity first.

**U6. "Cohesion means honouring one metaphor everywhere"** — copy, icons, empty states, error states.
→ **Resolved.** Empty and error states stay in character. Camera denied reads *"Your camera is off. So is mine — let's talk anyway."*

### REF (the friend)

**R1. "My name goes on this internally. If it's cringe, that's on me."**
→ **Resolved.** Affectionate homage only. No jokes at Google's expense, no "Meet is broken and I would fix it".

**R2. "I need three sentences I can defend in one breath."**
→ **Resolved.** See H4.

**R3. "If it prompts for camera access on a corporate machine, that's an awkward conversation."**
→ **Resolved.** Never auto-prompted. Explicit click, with a plain statement that processing is local and nothing is uploaded — verifiable, since there is no backend at all.

**R4. "Don't imply I got him the job."**
→ **Resolved.** The referral is acknowledged with thanks and kept subordinate to Nam's own work.

### SEC

**S1. "Third-party requests, analytics, CDN fonts."** Any of them and I stop trusting the privacy claim.
→ **Resolved.** Zero third-party requests. Everything self-hosted. Works offline after first load.

**S2. "Prove the camera stream doesn't leave the device."**
→ **Resolved.** Stated on the page and made checkable: open DevTools, Network tab, zero requests. A CSP meta tag backs it up.

---

## Round 2 — against the revised plan

**H7. "Your two artifacts now contradict each other."** The site fixes the narrative; the PDF you link is the old one, which lacks TypeScript and testing and shows Sales as the current role. Inconsistency between artifacts is worse than either alone.
→ **Resolved.** Plain mode carries a print stylesheet that generates a tuned one-pager from the same data, so both artifacts tell one story. The original PDF is kept alongside it, and replacing it is action item #1.

**H8. "Your dev report hands me the objection."** An HR reader who opens it and finds *"his current role is sales, which looks bad"* has just been handed the reason to pass.
→ **Resolved, and this reframed the whole feature.** The panel is a **build log** — an engineering design review of *the artifact*, which is what it actually is. Criticisms are stated as design constraints, never as candidate weaknesses, and no criticism appears without its resolution in the same block. Showing you ran an adversarial review on your own work is a strength; publishing a list of your flaws is not.

**T9. "A test runner is only credible if it can fail."** Give me a way to break it.
→ **Resolved.** The chaos switch, added in T4.

**T10. "You claim under 50 KB. Prove it at build time and fail the build if it's exceeded."**
→ **Resolved.** The build script measures the gzipped bundle, stamps the real number into the HTML, and exits non-zero over budget. CI runs it on every push.

**T11. "Captions implying live speech recognition when there is no audio is a lie."**
→ **Resolved.** The transcript is labelled a scripted transcript. Separately, if the visitor grants a mic, real `SpeechRecognition` transcribes *them*. Honest in both directions.

**T12. "Back and forward must work."** No-framework routing is where this usually breaks.
→ **Resolved.** History API routing; every panel is linkable and the back button behaves.

**U7. "This is a Swiss Army knife."** Six controls, five panels, a build log, an audit, a test runner, a perf HUD, a network simulator. It will read as a tech demo, not a portfolio.
→ **Resolved, and it reshaped the information architecture.** Two tiers. Tier 1 is the story: tiles, chat, present, people, captions, end call. Tier 2 is everything technical, behind a single **Engineering** door. One door, clearly labelled, so the depth is available without cluttering the narrative.

**U8. "Effects with no purpose are decoration, and decoration undercuts seriousness."**
→ **Resolved.** The effects live in the Engineering menu framed as what they are — a real-time WebGL filter chain, the same class of feature Meet ships. Sober presets sit next to the fun one. On-domain, not random.

**R5. "The blurb must not oversell."** If I write "best front-end engineer I know" and he bombs the loop, that costs me.
→ **Resolved.** The referral blurb is fact-only, no superlatives, every sentence checkable against the CV.

---

## Round 3 — final pass

**T13. "Plain mode and call mode will drift apart."**
→ **Resolved.** Both render from `src/data/cv.ts`. There is no second copy of the content anywhere.

**U9. "What do I see in the first 200 ms?"** If it's a blank screen, the magic is gone before it starts.
→ **Resolved.** The pre-join screen is static HTML with inlined critical CSS. It paints with JS disabled.

**A1 (a11y specialist). "An `aria-live` region that updates constantly will flood a screen reader."**
→ **Resolved.** Captions are `aria-live="polite"` and debounced; the full transcript is a static readable region rather than a firehose.

**R6. "I'm pasting this link into a chat. The preview card is what people see."**
→ **Resolved.** Open Graph and Twitter meta, name and target role in the `<title>`, and a generated share card.

**S3. "A public repo with his phone number invites scrapers."**
→ **Resolved.** The phone number is deliberately omitted from the public page. Email is assembled in script rather than sitting in the markup. The number stays in the PDF, which is sent deliberately rather than crawled.

**H9. "Contact details above the fold in plain mode, and name the role."**
→ **Resolved.**

---

## Open action items for Nam

The things this build deliberately refused to invent.

1. **Replace the PDF.** Print plain mode and attach that file. The old one omits TypeScript and test automation, both hard requirements.
2. **Confirm or supply magnitudes** for Mahjong Logic — player counts, concurrent users, release cadence, platform split. Every one was left out rather than guessed.
3. **Record a 20-second pitch clip** for the host tile. The site works without it; it is better with it.
4. **Decide the role.** The plan targets Senior; the copy is written for it.
5. **Check the Nobisoft framing** on the People panel reads the way you want it to.
