# How this clone is kept honest

Eyeballing does not scale, and "fix the thing the reviewer noticed" is not a
process — it guarantees that whatever they did not notice stays broken. This is
the loop instead. It found fifteen errors on the home screen in one pass,
including several nobody had spotted.

Two techniques, used together. The numeric one is the workhorse; the visual one
catches what numbers cannot.

---

## 1. The fingerprint diff (primary)

The idea: ask both pages to describe themselves, then compare the descriptions.

`tools/fingerprint.js` walks every visible element and records a normalised
entry — position, size, font family, size, weight, line-height, letter-spacing,
colour, background, radius, padding — keyed by something stable across both
trees. The key is the accessible name if there is one, otherwise the text,
otherwise the placeholder. DOM structure is ignored, because the two trees have
nothing structurally in common.

### Running it

1. Open `meet.google.com/home` in a tab the automation can reach.
2. Run the extractor. Keep the output — that is the reference.
3. Point the same tab at our build.
4. Run it again, and diff.

Geometry is compared with a tolerance (3px). Style properties are compared
exactly, because a 1px font-size difference or a single wrong hex is exactly the
class of bug that makes a clone read as a fake.

### Two traps worth knowing

**Viewport parity.** Compare captures taken at the same `innerWidth`. Ours
renders 3px wider than the reference used here, which shifts every centred
element by 1.5px. Either normalise the window or widen the tolerance — but know
which you did.

**Hidden duplicate labels.** Google ships visually-hidden copies of some labels
for screen readers, and a naive "smallest element with this key" rule picks the
hidden one. The rail label is the example: there is a 14px copy at the icon's
position and a real 12px one below the pill. When a value looks strange, measure
that specific element directly before believing the sweep.

### Why not just diff pixels

Pixel diffing tells you *that* something moved. The fingerprint tells you
*which property* is wrong, which is the part you need in order to fix it. It also
survives content differences — this is a CV, so half the strings are
deliberately ours.

---

## 2. The screen overlay (confirmation)

Numbers miss things that are obvious the moment two images are stacked: a whole
column drifting, a typeface that is subtly wrong, an entrance animation landing
in the wrong place.

The browser automation can display a screenshot but cannot write one to disk, so
the capture goes through the OS instead.

    powershell -File tools/shot.ps1 -Match "<window title>" -Out ref.png

Or, for a whole monitor, `System.Windows.Forms.Screen.AllScreens` and
`Graphics.CopyFromScreen` — see the commands in the build notes.

Then, with both sites on screen at the same window size:

```bash
# crop both to the same viewport rectangle
ffmpeg -y -i display2.png -vf "crop=1920:420:0:86" ref.png
ffmpeg -y -i display1.png -vf "crop=1920:420:0:86" ours.png

# 50/50 blend: anything doubled is misaligned
ffmpeg -y -i ref.png -i ours.png -filter_complex "[0][1]blend=all_mode=average" overlay.png

# difference map: anything not white is a discrepancy
ffmpeg -y -i ref.png -i ours.png \
  -filter_complex "[0][1]blend=all_mode=difference,format=gray,eq=gamma=0.5:contrast=3,negate" diff.png
```

### Finding the crop offset automatically

Both browser windows must be the same size, and the crop must start at the
viewport, not the window. Detect it rather than guessing: scan down for the
first row that is near-white across the middle of the frame. On this setup both
browsers reported y=86, which is what makes the two crops directly comparable.

### Traps

- **The automated tab is usually a background tab.** A screen capture records
  whatever is in front, which may be a completely different page. Verify by
  capturing the top strip of each monitor and reading the address bar before
  trusting any overlay.
- **Debug banners shift the viewport.** The "Claude has started debugging this
  browser" notification pushes the page down ~56px and silently invalidates the
  crop offset. Re-detect it every session.
- **State differences are not bugs.** Meet showed a past meeting in grey while
  ours showed an upcoming one in blue. Compare like states, or compare style
  only.

---

## 3. Deciding what a mismatch means

Every difference falls into one of three buckets, and they get different
treatment:

**Not deliberate → fix it.** Wrong font, wrong weight, wrong colour, wrong
padding, wrong offset. Iterate until the diff is clean.

**Deliberately different content → match the style, not the pixels.** "Short of
time? Read this as a plain document" is ours, not Meet's. It will never occupy
the same box as "Unlock premium Meet features" — but it must use the same font,
size, weight, colour, padding, radius and icon treatment. Compare the style
properties and skip the geometry for these keys.

**Deliberately different behaviour → document it.** The seven documented
divergences live in `src/data/spec.ts` and are surfaced in the app. If it is not
in that list, it is a bug.

---

## 4. What this pass found

For the record, because it is the argument for doing it this way. All fifteen
were found by the two techniques above, not by looking:

| | Was | Should be |
|---|---|---|
| Body typeface | Roboto | **Google Sans Text** |
| Titles, input, day numbers | Roboto | **Google Sans** |
| Wordmark | Roboto | **Product Sans** |
| Wordmark colour | dark + grey | **#1f1f1f throughout** |
| Day numbers | 400, #1f1f1f | **500, #444746** |
| Date title line-height | 26.4px | **28px** |
| Week arrows | 40×40 r20 | **48×56 r28** |
| Google apps button | r20 | **circle** |
| Banner title | 14px/500 | **16px/500 Google Sans, lh 24** |
| Section label | 13px/400 | **14px/500 Google Sans, inset 16px** |
| Meeting time | 13px/500 | **14px/700** |
| Meeting title | 20px/28px | **24px/32px** |
| Card horizontal padding | 26px | **40px** |
| "New" ink | #0b2818 | **#072711** |
| Content vertical offset | +10px | top bar +22px |
| Date row inset | 0 | **16px both sides** |
| Composer centring | grid, dragged 4.5px by asymmetric bar padding | absolutely centred on the viewport |
| Composer icon gap | 5px | **16px** |

Result: 16 of 17 tracked reference points inside 3px, with every font, weight,
colour and radius matching exactly. The one outlier is 4px, on a cluster whose
own internal gaps in the real product are irregular by 8px.

---

## 5. The order to work in

Per screen, and it matters — later steps rebuild on earlier ones:

1. **Tokens first.** Typeface, palette, radius scale. Everything inherits from
   these, so fixing them late means re-measuring everything.
2. **Idle layout.** Fingerprint, diff, fix, repeat until clean.
3. **Overlay check.** Confirms the numbers and catches whole-block drift.
4. **Hover.** Every interactive element. Requires a real pointer — synthetic
   events do not trigger `:hover`, which is a trap that will quietly hand you
   "no change" for a state that definitely changes.
5. **Focus.** Tab through. The ring is part of the design.
6. **Press / active.** Meet morphs `border-radius` on press; that is the
   feedback, and it is easy to miss entirely.
7. **Transient UI.** Tooltips, menus, toasts — including their timing, which is
   measurable and was measured.


---

## 6. The hover pass, and why the first one was wrong

The first attempt concluded that only one control in eight reacted to the
pointer, and wrote that up as a finding about Meet being restrained. It was
wrong. Every interactive control on the home screen reacts. The method is what
failed, and it failed in a way worth recording because it is the default way
anyone would write this probe:

    for (el of document.querySelectorAll(":hover"))
        read el.backgroundColor          // <- two fatal assumptions

**Ancestor-blind.** `:hover` returns only the elements the pointer is literally
over. Meet paints its state on a `::before` belonging to an inner span, and on
many controls the pointer is over a *text node* whose parent is not that span.
The layer was never in the list.

**Property-blind.** The layer's background never changes. Its `opacity` does,
0 to 0.08. Reading `background-color` finds a constant and reports "no change"
with total confidence.

The lesson generalises: a probe that inspects a property list chosen in advance
can only find states you already predicted. `tools/hover-sweep.js` inverts it —
snapshot every element whose box intersects the control, across ~20 properties
plus both pseudo-elements, perturb, snapshot again, and diff. Region-based
rather than ancestor-based, so overlays and positioned siblings are included; and
it reports elements that *appeared*, which is how the tooltips got caught.

Rewritten with that harness, one pass over every `::before` in the document
recovered the entire system at once:

    ::before, position absolute, inset 0, border-radius matching the host
    transition: opacity .075s linear, border-radius 0s linear
    opacity 0 -> .08 on surfaces, 0 -> .12 on 40x40 icon buttons

| Control | Box | Layer tint | Radius |
|---|---|---|---|
| Support / Settings | 40x40 | `#1f1f1f` @ .12 | 20 |
| Google apps / avatar | 40x40 | `#444746`, **.3s ease-out** | 50% |
| Open calendar | 40x40 | `#444746` | 20 |
| Week arrows | 48x56 | `#1f1f1f` | 28 |
| Day | 48x56 | `#6991d6` | 28 |
| Today | 48x56 | `#041e49` | 28 |
| Rail item | 56x32 | `#001d35` | 9999 |
| New meeting | 89x48 | `#072711` | 24 |
| Explore plan | 103x40 | `#0b57d0` | 20 |
| Meeting card | 1020x108 | `#1f1f1f` | 28 |
| Card Join | 79x56 | `#ffffff` | 28 |

The tint is the thing to steal. It is never a neutral black — it is the
control's own on-colour, so the layer reads as the control gaining more of
itself rather than as grey being poured over it. A generic 8% black is what
makes a Material copy look like a Material copy.

The avatar and apps buttons are the single exception at .3s ease-out, because
they come from Google's shared account bar rather than from Meet.

### Traps specific to this step

- **Synthetic events are not the blocker people assume.** They *do* reach JS
  listeners. What they cannot do is make `:hover` match. Drive a real pointer
  and both mechanisms are covered.
- **Read the element, not the tree.** Walking up from `elementFromPoint` finds
  transparent wrappers and misses the layer sitting at the same coordinates.
  Query by computed style instead.
- **Tooltip placement is not uniform.** The top bar places them 4px *below* the
  control; the week strip places them 4px *above*. Both centred. Assuming one
  rule gets half of them wrong.
- **Settle, do not sleep.** Poll `document.getAnimations()` until nothing is
  running. A fixed delay either samples mid-transition or wastes seconds per
  control, and at 75ms the mid-transition value looks like a plausible answer.

---

## 7. The cascade bug that hid a dozen fixes

Worth its own section because it wasted more time than any measurement error,
and because the failure mode is invisible.

`index.html` inlines critical CSS so the shell paints before `styles.css`
arrives. That `<style>` block sat **after** `<link rel="stylesheet"
href="styles.css">`. Same specificity, later in source order — so every
selector duplicated in the shell silently beat the real stylesheet.

The symptom is maddening: you add a rule to `styles.css`, the rule is present
in the served file, `document.styleSheets` contains it, the selector matches the
element, and the element does not change. Four separate fixes in one pass
appeared to do nothing, while a fifth (`.lk-mark`, which the shell happened not
to mention) worked — which is the clue, if you notice it.

The fix is to move the inline block **before** the link. Critical CSS should
paint first and lose every argument afterwards; the full stylesheet is the
source of truth. Inline styles in `<head>` are parsed immediately regardless of
position, so nothing is given up by moving it.

Two lessons for the loop:

- **Verify fixes by measuring, never by reasoning.** "The rule is in the file,
  therefore it applies" was wrong twice in this project — here, and with
  `background: var(--x)` in section 6. Both times the CSS was correct and the
  cascade was not.
- **A rule that appears to do nothing is a cascade question, not a syntax
  question.** Check what else claims the same selector before rewriting it.

## 8. Final home-screen geometry

After the sweep, ours against the live product at a 1440x900 viewport:

| Element | Meet | Ours |
|---|---|---|
| Logo mark | 21,17 35x28 | **21,17 35x28** |
| Date title | 262,100 117x28 | **262,100 117x28** |
| Open calendar | 383,94 40x40 | **383,94 40x40** |
| Support | 1253,12 40x40 | **1253,12 40x40** |
| Settings | 1293,12 40x40 | **1293,12 40x40** |
| Google apps | 1338,12 40x40 | **1338,12 40x40** |
| Avatar | 1386,12 40x40 | **1386,12 40x40** |
| Week arrows / days | 770..1234, 48x56 | identical |
| Promo row | 1050x68 @247,167 | 1052x70 @246,167 (1px border) |
| Selected card | 1052x134 @246 | **1052x134 @246** |
| Tooltip on today | "Selected" 64x24 @1052,58 | **"Selected" 64x24 @1052,58** |

The top-bar cluster is the interesting one: Meet's gaps are 0, 5 and 8 px, not
a uniform rhythm. Support and Settings touch; the last two carry the shared
account bar's own margins. Ours had an even 4px gap, which put all four in the
wrong place while looking perfectly deliberate.

---

## 9. The Calls tab, and three traps that only show up in motion

The full measured baseline for this screen is `tools/baseline-calls.md`. This
section is only the method — the parts that generalise to the next screen.

Nam's QA pass listed six faults. Every one of them was a *behaviour*, not a
static style: a missing shadow, a panel that pushed the page instead of covering
it, a check that appeared instead of growing, a dialog with no entrance, controls
that were inert to the pointer, and a screen that never loaded. Sections 1-8
above are built around comparing two still frames, and a still frame cannot see
any of that. So the loop needed a third technique.

### 9.1 Ask the page what is animating, do not watch it

The obvious probe is to poll every frame and diff:

    requestAnimationFrame(function tick() { snapshot(); ... })

It returns nothing. Not "no animation" — literally an empty log, every time.
**The automated tab is a background tab, and `requestAnimationFrame` does not
fire in one.** The same throttling means CSS transitions do not advance either,
so a fixed `setTimeout` then a re-read returns the *start* value and looks like a
property that never changed.

The replacement is not a better sampler, it is not sampling at all:

    document.getAnimations()          // live Animation objects
      -> a.effect.getTiming()         // duration, delay, easing, fill
      -> a.effect.getKeyframes()      // the actual from/to values

Called directly, this works in a background tab and is *better* data than
sampling: it gives the authored duration and curve rather than an interpolated
value you then have to fit a curve to. The whole dialog entrance came out of one
call:

| target | property | from -> to | duration | easing |
|---|---|---|---|---|
| wrapper | `opacity` | 0 -> 1 | 75ms | linear |
| panel | `transform` | `scale(0.8)` -> none | 150ms | `cubic-bezier(0, 0, .2, 1)` |
| scrim | `opacity` | 0 -> 1 | 150ms | linear |

Three elements, three durations. No single-node implementation could have
matched it, and no screenshot would have suggested it.

Corollary, and it bit twice: `getComputedStyle(el).transition` reads `all` /
`0s` on almost every element in Meet, because the transitions are installed
per-interaction. **A `0s` reading is not evidence that nothing animates.** Check
`getAnimations()` before concluding a surface is static — and when it genuinely
is static, say so explicitly, because that is also a measurement (the band's
96 -> 406 expand really has no transition, and the row hover layer really is `0s`
where every home-screen control is 75ms).

### 9.2 A shadow that is on no element

The band obviously has a soft shadow. Every ancestor reports
`box-shadow: none`. So does the band. So does every descendant.

It is painted by a GM3 helper class on `::before` *and* `::after`, and the two
offsets are `calc()` expressions over a single custom property holding the
elevation **level**. Resolving that formula by hand is what turns one screen's
shadow into a reusable scale — level 2 for the search band and the overflow
menu, level 3 for the call dialog — instead of a magic number copied off one
surface. The table is in the baseline doc.

Generalises: when a visible effect is on no element, scan **pseudo-elements
across the whole document**, not the ancestor chain. `tools/hover-sweep.js`
already does this for state layers (section 6); the same blind spot produced the
same class of miss here. The one-liner:

    for (const el of document.querySelectorAll('*'))
      for (const pe of ['::before', '::after'])
        if (getComputedStyle(el, pe).boxShadow !== 'none') report(el, pe)

### 9.3 The layout bug was one property

Ours pushed the illustration and headline down the page when the panel opened.
Meet's wrapper is `position: absolute` with the column reserving its collapsed
height as flow space, so growing it 96 -> 406 cannot move anything. That is the
entire mechanism, and it was one property in the wrong state — with the visible
symptom being "the animation is wrong", which is the wrong place to look.

Worth internalising: **before treating a motion complaint as a timing problem,
check whether the thing is even in the flow.** Nothing about the transition was
at fault.

### 9.4 A correct transition that still snaps

This one is the best trap of the three, because the fix looked finished and
measured clean.

The check's growth is `transition: transform .15s ease-out` on an overlay disc.
That was implemented exactly, verified against the original property by property
— and it still snapped. A transition needs the element to **survive** the change
so there is a previous computed value to interpolate from, and `paint()` rebuilt
every row on selection. The "newly selected" row was a brand-new node born with
`aria-selected="true"` and `scale(1)` already applied. Nothing to animate from.

Nothing in the CSS is wrong. The only way to see it is to ask:

    row.click();
    void getComputedStyle(disc).transform;     // force a style flush
    disc.getAnimations()                       // -> [] means no transition exists

`[]` after a click that visibly changed the screen is the whole diagnosis. The
fix was to split painting: rebuild rows only when the *set* of rows changes,
and let selection flip an attribute on the row already on screen.

So: **verify an animation by asking whether a transition object was created, not
by confirming the CSS says what you meant.** Twice now this project has had
correct CSS defeated by something else — the cascade in section 7, the DOM
lifecycle here.

And the positive confirmation, once it was right: one tick after the click,
`opacity` had snapped to 1 while `transform` was still `scale(0)`. Two properties
on one element behaving differently in the same frame is the fingerprint of a
transition list that names only one of them — which is exactly what Meet
authored.

### 9.5 Traps specific to this screen

- **The Calls tab is `/home?calling=1`.** `meet.google.com/calls` is a 404.
- **`.focus()` does not dispatch a focus event in a background tab**, so
  anything gated on focus never opens. Dispatch the event the handler actually
  listens for, or drive a real pointer.
- **Boxes measured during an entrance are scaled.** The dialog enters at
  `scale(0.8)`; every child box read mid-flight is 80% of its real size. Wait
  for `transform: none` or divide. Reading 410 and recording it as the panel
  width would have been an easy, invisible error — the real number is 512.
- **`gap` counts empty flex children.** An empty chips container has no width,
  but the pill's 12px gap applies on both sides of it, which put our caret 12px
  right of Meet's with nothing selected. `:empty { display: none }`.
- **A screenshot forces a paint**, which advances a transition the throttled tab
  had frozen. Useful as a deliberate tool; misleading if you forget you did it.

### 9.6 What this pass found

| | Was | Should be |
|---|---|---|
| Band shadow | none | GM3 elevation 2, both halves |
| Band in flow | pushed the page down | `position: absolute`, 112px reserved |
| Band y | 102 | **80** (the Calls tab drops the Meetings tab's 22px) |
| List cap | 334px | **256px** (334 includes the footer) |
| Expanded pill inset | 20 all round | **14, with a 7px gap** to the first row |
| First row | band + 96 | **band + 77** |
| Check on select | node swap, instant | overlay disc, `scale(0->1)` 150ms ease-out |
| Selection repaint | rebuilt every row | attribute flip, node persists |
| Placeholder with a chip | blanked | **kept** |
| Chip avatar | 24 | **28** |
| Pill right padding | 12 | **16** |
| Caret with no chip | x 1056 | **1044** (empty flex child ate a gap) |
| Continue pressed | panel left open | **band collapses, focus drops** |
| Dialog entrance | none | 75 / 150 / 150ms, three elements |
| Dialog scrim | none | **rgba(0,0,0,.32)**, fades 150ms |
| Dialog shadow | none | GM3 elevation 3 |
| Button hover | nothing at all | state layer, own on-colour @ .08, 75ms |
| Press ripple | wired in JS, no CSS | added to both selector lists |
| Voice call | permanently disabled | **live**, as it is on the original |
| Dialog name ink | `--ink` #1f1f1f | **#444746** |
| Notice | #f0f4f9, radius 12 | **#dde3ea, radius 28**, padding 16 |
| Notice title | 14/20 body face | **12/16 Google Sans**, 500 |
| "Got it" ink | `--nav-label` #00639b | **#0b57d0** |
| Referral note | spinner forever | loads (see below) |

The referral note was not a Calls bug at all. `render()` bumped its staleness
ticket **above** the early-return guard, so any caller that dispatched twice —
set the screen, then set the panel, which is exactly what that button does —
started the call chunk on ticket N and then moved the ticket to N+1 while
returning early and painting nothing. The chunk arrived, found itself stale, and
threw itself away. An early return paints nothing, so it has nothing to
invalidate; the bump belongs below the guard. One line, and it had made a whole
screen unreachable with no error anywhere.
