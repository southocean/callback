# QA — against the running site

Reviewing a plan catches different things than opening the result. This pass ran in a real browser, in the same
voices as the design review: **TL** (tech lead), **UX** (product designer), **HR** (recruiter), **A11Y**
(accessibility specialist), **REF** (the friend who refers me).

Two of the six findings were caught by the page auditing itself, which is the argument for having built the
audit rather than writing "accessible" on a CV.

---

## Findings

**Q1 · UX — the first screen was gone.**
The static pre-join markup painted immediately and correctly, exactly as designed. Then the bundle booted,
decided it owned the screen, and replaced it with the minimal fallback. The one screen engineered to arrive
instantly was the one screen nobody would ever have seen.
→ **Fixed.** Boot leaves the static pre-join in place instead of rendering over it. Found by opening the page —
no test would have caught it, because both screens were individually correct.

**Q2 · A11Y — the audit failed its own check.**
Zero `<main>` landmarks in the call view. The stage was a `div` with `id="main"`, which the skip link pointed
at but which no screen reader treats as a landmark.
→ **Fixed.** The stage is a real `<main>`, and so is the document view. 13/13 checks pass now.

**Q3 · TL — the timeline wasted a lane.**
Lane packing compared each span only against the last one placed, so a role starting earlier than everything in
a lane got pushed to a new row it did not need.
→ **Fixed.** Replaced with interval-graph colouring: a span joins the first lane it collides with nothing in.
Five roles now fit in two lanes. Caught by a unit test.

**Q4 · TL — `clamp01(Infinity)` returned 0.**
Infinity is out of range, not invalid. Clamping it to the floor rather than the ceiling is wrong in the
direction nobody checks, and a NaN or a wrong-signed value reaching a GL uniform is a black screen with no
error message.
→ **Fixed.** Only NaN is refused; everything else clamps to the nearer bound. Caught by a unit test.

**Q5 · HR — the no-superlatives test failed on a true statement.**
It flagged "best-paper award" in the referral blurb, which is the name of an award rather than a boast.
→ **Fixed the test, not the sentence.** The rule is about self-description. A test that flags a true statement
is a bad test, and renaming a real award to satisfy a regex would have been the wrong repair.

**Q6 · REF — footage that was not mine to publish.**
A clip from a friend's film was on the shortlist for the reel. It is not my footage, and I could not confirm
from the frames which performer was me.
→ **Left out**, and the omission is stated on the page rather than passed over in silence. Publishing someone
else's film on my job application is not my call to make.

---

## Checks run

| | Result |
|---|---|
| Typecheck, strict TypeScript | clean |
| Unit suite (42 tests) | 42/42 |
| Chaos mode | goes red on demand, recovers |
| Bundle size gate | ~41 KB gzipped, 80% of the 50 KB budget |
| Live accessibility audit | 13/13 |
| Keyboard only, no mouse | complete — one tab stop into the grid, arrows inside, Esc closes, focus returns |
| Deep links (`#chat`, `#eng/a11y`, `#present/mahjong`, `#plain`) | all bypass pre-join; back button behaves |
| Horizontal overflow at 1280px and 375px | none |
| Mobile 375×812 | panel goes full-screen, focus traps, control bar wraps, nothing clipped |
| Camera and mic permission denied | full content, in-character empty state |
| Reduced motion | effects locked off, reel stops advancing |
| Third-party requests | zero |
| Phone number in the web build | absent, asserted by a test |
| Easter eggs | both fire |
| Reel payload | ~1.5 MB total, metadata-only preload |

## Not fixed, on purpose

- **The reel is muted by default even where the clip has audio.** Unmuting is one click. Autoplay with sound is
  blocked by browsers anyway, and a CV that makes noise in an open-plan office is a bad CV.
- **The stand-up clip's poster shows the audience rather than the performer.** Deliberate. The room laughing is
  better evidence than a man holding a microphone.
- **The SFX clip is a horror prosthetic in close-up.** It is fourth in the reel, behind an explicit play, framed
  as makeup craft and cropped to the appliance. Flagged to Nam as the one item to veto if he disagrees — it is
  the only piece of content here with any real risk attached to it.
