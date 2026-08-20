# Callback

An interactive CV for **Nam Nguyen**, built as a video call. Written for the Google Meet web-client roles in
Stockholm, and designed so that every requirement in the job ad has something on the page you can click on.

**Live:** https://southocean.github.io/callback/

Three meanings, all true at once: a phone callback, a JS callback, and a stand-up callback — a joke that refers
back to an earlier joke.

## The idea

The site is a call, and **every control in the bottom bar is a section of the CV.** Nothing in the interface is
decorative.

| Control | Is |
|---|---|
| Camera | Your camera, opt-in, processed locally, never uploaded |
| Participants | The career timeline — each role is a participant who joined on a date |
| Cover letter | The cover letter, as a chat thread |
| Screen share | Project case studies |
| Captions | The transcript, and the plain-text CV |
| Off the clock | A 40-second reel: skydiving, stand-up, acting, SFX makeup, a Robinson audition |
| Engineering | One door for the technical depth (below) |
| End call | The handover: PDF, email, and a pre-written referral blurb |

Behind **Engineering**: the build log and its adversarial review, the real test suite with a chaos switch, a
live accessibility audit, measured bundle size, a WebGL effects pipeline, a network-degradation simulator, a
requirement-by-requirement map against the job ad, and the storyline argument.

`?` lists the keyboard shortcuts. There are two easter eggs; one of them is older than the web.

## Constraints

These are the point, more than the features are.

- **Vanilla TypeScript. No framework, zero runtime dependencies.** The view layer is a 20-line `h()` helper.
- **Under 50 KB of gzipped JavaScript**, measured at build time, stamped into the page, and enforced by CI —
  the build exits non-zero over budget, so the number in the footer cannot drift from the truth.
- **Complete with zero permissions granted.** No camera, no mic, no autoplay, works offline after first load.
- **No third-party requests.** No analytics, no CDN, no external fonts. There is no backend, which is why the
  camera stream has nowhere to go.
- **Dual mode.** `#plain` renders the whole CV as one accessible document from the same data module, with a
  print stylesheet that produces the one-pager worth attaching to an application.
- **Accessible for real.** Roving tabindex, focus trapping, polite live regions, reduced-motion honoured,
  nothing flashing above 3 Hz. The audit in the Engineering panel asserts against the live DOM and is allowed
  to fail — it caught a missing `<main>` landmark during QA.
- **No invented metrics.** Anything unverifiable is an open action item in the build log, never a claim on the
  page.
- **No Google marks.** An affectionate homage, clearly unaffiliated, stated in the footer.

## Layout

    src/
      main.ts            entry, History-API router, global keys
      state.ts           pure reducer, routing, timeline geometry — all unit-tested
      dom.ts             the entire view layer
      a11y.ts            focus trap, roving tabindex, the live audit
      achievements.ts    side quests and easter eggs
      data/cv.ts         all CV content — the single source of truth
      data/devlog.ts     the reviews, and what each one changed
      data/story.ts      the narrative argument, for and against
      data/clips.ts      the reel manifest
      fx/pipeline.ts     WebGL filter chain
      net/degrade.ts     seeded network simulator
      ui/*.ts            call shell, panels, engineering, reel, document, end screen
      test/suite.ts      the tests — run in CI and in the browser
    docs/                the built site, served by GitHub Pages
    PLAN.md              the plan
    REVIEWS.md           four rounds of adversarial review
    QA.md                what QA found after it was built

## Commands

```bash
npm run verify   # typecheck, test, build with the size gate
npm test         # the same suite the browser runs
npm run build    # bundle, measure, stamp, gate
npm run serve    # http://localhost:4173
```

`npm test -- --chaos` injects the deliberate fault and the suite goes red, which is the proof that it can.

## Process

Planned, then reviewed three times before any product code existed, in the voices of the people who would
actually open it — a recruiter, a tech lead on the team, a product designer, the friend whose name goes on the
referral, and a privacy reviewer. A fourth round covered the game layer and the narrative once those were
added, and a QA pass went through the finished site. Every finding and its resolution is in `REVIEWS.md`,
`QA.md`, and the Engineering → Build log panel.

Built with agentic tooling, because the senior posting asks for exactly that, and the log was left in.

---

Not affiliated with, endorsed by, or built at Google. No Google marks are used.
