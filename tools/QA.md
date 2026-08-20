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

## 6. What the hover pass found

Step 4 of the order below, done properly: eight controls on the home screen,
each hovered with a **real** pointer, with `document.querySelectorAll(':hover')`
walked and every ancestor's background — plus `::before` and `::after` — read at
rest and again while hovered.

The result was almost entirely negative, and that is the finding:

| Control | Rest | Hovered |
|---|---|---|
| Code field | `#e9eef6` | **`#dde3ea`** |
| Logo lockup | — | no change |
| Support / Settings / Google apps | transparent | no change |
| Avatar | transparent | no change |
| Rail item, selected | `#c2e7ff` pill | no change |
| Rail item, unselected | transparent | no change |
| Week arrows | transparent | no change |
| Day column | `#fff` | no change |
| New button | `#c4eed0`, no shadow | no change |
| Meeting card | `#f0f4f9` | no change |

One hover state on the entire screen. Ours had six, all invented from
Material's documented 8% state layer — so this pass was almost entirely
deletions. That is worth saying out loud, because a clone drifts toward *more*
feedback than the original: every individual state layer feels like an
improvement, and the accumulation is what makes a copy feel like a copy.

Two traps specific to this step:

- **Synthetic events are not the problem people think they are.** They *do*
  reach JS listeners, so a JS-toggled state layer would have shown up. What they
  cannot do is make `:hover` match. Since you rarely know which mechanism a
  target uses, drive a real pointer and both are covered at once.
- **Read the element, not the tree.** The painted surface is usually a bare
  overlay `div` that is neither the button nor its parent — walking up from
  `elementFromPoint` found a transparent wrapper and missed the `#f0f4f9` layer
  sitting at the same coordinates. Query by computed style (`borderRadius ===
  '28px'`) instead, and A/B the *same element* pointer-away vs pointer-on.

Steps 1–4 are now done for the home screen. 5 (focus) and 6 (press) are next,
and the press morph is the one place Meet is known to be doing something.
