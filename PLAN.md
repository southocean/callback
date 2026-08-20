# Callback — plan

An interactive web CV for **Nam Nguyen**, targeting the Google Meet web-client roles in Stockholm.
Local path: `C:/projects/friends/Google-CV` · Remote: `southocean/callback` · Live: GitHub Pages.

## 0. Why "Callback"

Three meanings, all true at once:

1. **A phone callback** — what he wants from the recruiter.
2. **A JS callback** — the job is front-end.
3. **A standup callback** — a joke that references an earlier joke. Nam is a working standup comedian.

The name is the thesis: the same artifact read three ways by three audiences.

## 1. Target roles (verified 2026-08-20)

| | SWE III, Google Meet Web Experiences | Senior SWE, Web Development, Google Meet |
|---|---|---|
| ID | 83575773499138758 | 112689007451611846 |
| Bar | 2y front-end + 2y SWE | 5y SWE, 3y front-end, 3y shipping, 1y architecture |
| Hard reqs | **TypeScript, web applications, test automation** | design + architecture, launch record |
| Preferred | DS&A, cross-functional launches, Java, Wiz/Soy/GSS | MSc/PhD, DS&A, tech leadership, **accessible technologies** |
| Comp | 840–860k SEK + 15% + equity | 1.00–1.02M SEK + 15% + equity |
| Notable | — | "Work with Agentic Coding techniques and tools" |

**Primary target: the Senior role.** Nam clears its stated bar on paper (7y front-end lead, team of 5,
desktop→web→hybrid re-architecture, MSc, publications, prior technical leadership). The SWE III role is the
fallback, and its TypeScript + test-automation requirements are answered by this artifact itself.

## 2. The core metaphor

The site is a video call. **Every control in the bar is a CV section** — nothing is decorative:

| Control | Becomes |
|---|---|
| Camera | The visitor's own camera (opt-in, local-only) |
| Mic | Optional live speech → captions |
| People | Career timeline; each role is a participant who "joined" at a date |
| Chat | The cover letter, as a chat thread |
| Present | Project case studies, presented as shared screen |
| Captions | Full transcript / plain-text CV |
| ⋮ Engineering | One door for all the nerd depth (below) |
| End call | Handoff: PDF, email, referral blurb |

Behind **⋮ Engineering**, in one place so the main story stays clean:

- **Effects pipeline** — a real WebGL video filter chain (Meet ships effects; this shows he can build one). Default OFF.
- **Test runner** — the project's real unit tests, executed in the browser, with a chaos switch that makes them go red on demand.
- **Accessibility audit** — assertions run against the live DOM, not a claim.
- **Performance** — measured bundle size (stamped at build time), FPS, memory.
- **Network simulator** — degrade the call: packet loss, jitter, resolution drop. The problem a Meet engineer actually fights.
- **Dev report** — this plan, the adversarial reviews, and how each criticism was resolved.

## 3. Non-negotiable constraints

- **Vanilla TypeScript. Zero runtime dependencies.** Target < 50 KB gzipped JS, enforced in CI.
- **Dual mode.** `?plain` renders the entire CV as one accessible scrolling document from the same data source. Novelty must never gate content.
- **Works with zero permissions** — no camera, no mic, no autoplay, offline after first load, strict CSP.
- **No Google logos, wordmarks, or brand colours.** Affectionate homage, clearly unaffiliated, stated in the footer. This protects the referrer.
- **No invented metrics.** Anything unverifiable becomes an action item for Nam, not a claim on the page.
- **Accessible for real.** Roving tabindex, focus trapping, `prefers-reduced-motion`, nothing flashing above 3 Hz.

## 4. Architecture

Single source of truth in `src/data/cv.ts`; both modes render from it.

    src/
      main.ts            entry, router (History API), boot
      state.ts           reducer + subscribe, pure and unit-tested
      data/cv.ts         all CV content, typed
      data/devlog.ts     plan + reviews + resolutions
      ui/*.ts            prejoin, shell, tiles, controls, panels, plain, end
      fx/*.ts            WebGL pipeline + shaders
      net/degrade.ts     network condition simulator
      test/*.ts          real unit tests, run in-browser and in CI

## 5. Phases

1. Plan (this file) → 3 adversarial review rounds → resolve every point.
2. Build.
3. QA under the same roles, in the real browser.
4. Ship: CI typecheck + tests + size gate, GitHub Pages, tagged release.
