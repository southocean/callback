<div align="center">

# Callback

**An interactive CV, built as a working replica of Google Meet.**

[**→ Open it**](https://southocean.github.io/callback/) · [Download the PDF](https://southocean.github.io/callback/NamNguyen_CV_2026.pdf) · [Read it as a plain document](https://southocean.github.io/callback/#plain)

Nam Nguyen · Lead front-end developer, Uppsala
Applying for **Senior Software Engineer, Web Development — Google Meet, Stockholm**

</div>

---

## What this is

A CV that opens the way the product does. You land on a home screen with one meeting scheduled, press **Join**, pass through the green room, and end up in a call where the participants are the chapters of a career and every control in the bar leads somewhere real.

The interface is not a lookalike. It is a rebuild from a measured spec: computed styles, bounding boxes and transition curves read off `meet.google.com` across the whole flow, then implemented from scratch in TypeScript with no framework and no dependencies. The **Spec** and **Design** panels inside the app publish every number, so you can check the work — and `tools/QA.md` documents the diff loop used to find the mismatches, because eyeballing does not scale.

If you have ninety seconds and no interest in any of that, the plain document and the PDF are one click from the first screen. Novelty is never the only route to the content.

---

## Finding your way around

Four screens, all deep-linkable:

| Link | Screen |
|---|---|
| [`#home`](https://southocean.github.io/callback/#home) | Code composer, the rail, the week strip, one scheduled meeting |
| [`#lobby`](https://southocean.github.io/callback/#lobby) | Camera preview, device chips, *Ready to join?* |
| [`#call`](https://southocean.github.io/callback/#call) | Tile grid, control bar, captions, six side panels |
| [`#plain`](https://southocean.github.io/callback/#plain) | The whole CV as one printable page |

**Where it deliberately differs from Meet.** A faithful clone on its own would be an empty call, so eight things diverge:

- **People** — every participant tile is a role, not a person. The panel draws the career as a timeline, including the two positions that genuinely overlap.
- **Presenting** — the screen share holds four case studies.
- **In-call messages** — the cover letter, written as a chat thread.
- **Meeting tools** — where Meet keeps whiteboards and polls, this keeps the engineering case: the measured spec, the test suite, a live accessibility audit, bundle size, a WebGL effects pipeline, a network-degradation simulator, and a map against the job ad.
- **Off the clock** — a seventh tile that is not a job. A forty-second reel, click to play, sound off until you ask for it.
- **Host controls** — the handover: PDF, plain document, email, and a referral note already written.
- **Document mode** — no equivalent in Meet. Press <kbd>D</kbd>, or take *CV* in the rail.
- **Calls** — Meet's Calls tab rings someone you know. This one reaches the people who can vouch for the work. The screen is a clone down to the chips and the selection model; the contents are references, and the dialog gains one line Meet has no reason to carry — what that person can actually speak to.

Two smaller, deliberate departures, both documented where they live: the pre-join mic meter fades out instead of vanishing (Meet uses `display: none` with no transition), and Calls opens a one-person dialog where Meet would ring a group — a screen never measured is a screen not guessed at.

Press <kbd>?</kbd> for the shortcuts. There are two easter eggs; one of them is older than the web.

---

## The measured spec

The interface was specified before it was written. A sample of what was read off the live product and rebuilt:

| | |
|---|---|
| Call canvas | `#131314` |
| Tile / side panel | `#202124`, radius **24px** / **20px** |
| Control button | `#333537`, secondary `#282a2c`, icons `#e3e3e3` |
| Leave call | `#dc362e` |
| Control bar | 80px tall, buttons 48px at radius 24 |
| Bar rhythm | `[chev 40 + mic 48] [chev 40 + cam 48] [56] [56] [56] [56] [36] [72]`, 8px gaps |
| Side panel | 360px, inset 72px from the top |
| Lobby preview | 740 × 416 at radius 8 |
| Light shell | text `#1f1f1f` / `#444746`, primary `#0b57d0`, nav pill `#c2e7ff` |

Twenty-nine tokens and eleven layout measurements in total, all listed in the **Spec** panel with the surface each came from. Icons are the real thing: Meet drives Google Symbols through variable axes and flips `FILL` 0→1 for the selected nav item, so this ships a 7 kB subset of Material Symbols Outlined — the Apache-2.0 sibling of the same design programme — with that axis wired the same way.

The typefaces are Google's own — Google Sans, Google Sans Text and Product Sans. None of them are open source, so none are copied into this repo; they are linked from the Google Fonts API, which is the route Google provides for exactly this. That is the one place this page reaches off-origin, and it is stated in the app rather than glossed over.

---

## Engineering

```
Initial payload   16.0 kB gzipped JavaScript   (budget 50 kB, enforced in CI)
Dev portal        13.1 kB, a deferred chunk nobody who misses it ever fetches
Runtime deps      0
Third-party       Google Fonts only — the typeface is Google's and is licensed
                  for linking, not redistribution. No analytics, no backend.
Tests             44, run in CI and in the browser
A11y assertions   13, run against the live DOM
```

- **No framework.** The entire view layer is a 20-line `h()` helper. The size budget is measured at build time, stamped into the page and gated in CI — if the bundle goes over, the build exits non-zero.
- **State is a pure reducer**, which is why the router, the timeline geometry, the caption scheduler and the network model can all be unit-tested without a DOM.
- **The tests run in your browser**, in Meeting tools → Tests. Same file CI runs. There is a chaos switch that injects a real fault so you can watch the suite go red — a runner that cannot fail proves nothing.
- **Accessibility is asserted, not claimed.** Roving tabindex on the tile grid, focus trapping, polite live regions, reduced-motion honoured, nothing flashing above 3 Hz. The audit panel checks the live document and is allowed to fail; during QA it caught a missing `<main>` landmark.
- **Complete with zero permissions.** No camera, no microphone, no autoplay. Camera is opt-in behind a click, processed locally, and there is no server for it to reach — the only requests this page makes off-origin are for Google's fonts.
- **Real-time video work**, because the role is real-time video: a WebGL filter chain capped at 30 fps on a low-power context that suspends on a hidden tab, and a seeded network simulator that degrades the call to hotel wifi and shows what a client should do about it.

```bash
npm run verify   # typecheck, tests, build with the size gate
```

---

## Built with agentic tooling

The senior posting asks for experience with agentic coding techniques, so it seemed fair to use them here and say so plainly.

**My part.** The brief, and every judgement call inside it: that the CV should be the product rather than a document about it; that the interface had to be measured rather than approximated; the flow, the mapping of each control onto a section, the reel and what belongs in it; the game layer and the easter eggs. Every factual claim on the page is mine and checkable. Where a number could not be sourced, I chose to leave it out rather than round it up — the app says so out loud.

**The tooling's part.** Claude Code drove the browser to take the spec off the live product, wrote the bulk of the TypeScript against it, and ran an adversarial review of the plan in the voices of the people who would open it — a recruiter, a tech lead, a designer, an accessibility specialist. That review changed the architecture three times before any product code existed.

**What made it work** was treating the model as a colleague who needed a spec and a critic, not as an autocomplete. The reviews caught real problems on the plan; QA on the finished build caught six more, two of which the page found by auditing itself. The full working record — process, reviews, QA findings, and the argument about how to tell the story — ships inside the app, behind an easter egg, for anyone curious enough to look.

---

## Layout

```
src/
  main.ts           entry, History-API router, shared camera, global keys
  state.ts          pure reducer, routing, timeline geometry — unit-tested
  dom.ts            the entire view layer
  a11y.ts           focus trap, roving tabindex, the live audit
  data/spec.ts      the measured Meet spec
  data/cv.ts        all CV content — one source, both views render from it
  fx/pipeline.ts    WebGL filter chain
  net/degrade.ts    seeded network simulator
  ui/               home · lobby · call · ended · panels · document
  test/suite.ts     the tests, shared by CI and the browser
docs/               the built site, served by GitHub Pages
```

---

<div align="center">
<sub>

Not affiliated with, endorsed by, or built at Google. The interface is rebuilt from the outside, from measurements
of the live product. Two Google-owned things are used rather than recreated, and both are named here rather than
glossed over: the Google Sans / Product Sans typefaces, linked from the Google Fonts API because that is the route
Google provides for them; and the Meet camera mark, cropped from Google’s own published lockup asset so the logo is
exact. The “Google” wordmark beside it is set in type, not copied. No Google stylesheets or code are used. A hand-drawn SVG of the mark ships alongside it and is one flag away,
for any context where redistributing the artwork is not wanted.

</sub>
</div>
