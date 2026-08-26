# Design principles

The rules every UI change in this repo follows. Distilled from what was measured
off the live product — the raw tokens stay in `src/data/spec.ts` (surfaces,
geometry, bar layout, flow) and `src/data/design.ts` (motion, feedback, type,
shape). **Those two files are the source of record; this is the summary you read
before touching a control.**

Written because a "Back to the call" button shipped in a house style that exists
nowhere else in the build. One off-pattern control is enough to make a faithful
clone read as a copy.

---

## 0. The one rule that catches most mistakes

**If it is a surface the real product has, it uses the real product's tokens. If
it is a surface the real product does not have, it uses them anyway.**

There is no third style. Anything invented — a bordered grey button, a custom
radius, a plain `outline` focus ring — is immediately legible as not-Meet even to
someone who has never looked closely at Meet.

---

## 1. Two palettes, and they barely overlap

The build has exactly two environments. Nothing borrows across them.

| | Light shell (home, lobby, documents) | Dark call canvas |
|---|---|---|
| Ground | `#ffffff` | `#131314` |
| Raised surface | `#f0f4f9` fields · `#d3e3fd` cards | `#202124` tiles, panels |
| Control | `#0b57d0` filled · `#c4eed0` tonal | `#333537` · `#282a2c` secondary |
| Text | `#1f1f1f` · `#444746` secondary | `#e3e3e3` · `#8e918f` secondary |
| Action | `#1a73e8` text buttons | `#a8c7fa` on dark |
| Outline | `#c4c7c5` | `#202124` as a 1px ring |
| Destructive | — | `#dc362e` |

Picking a colour means finding the row, not inventing a value. If the row has no
entry for what you are building, you are probably building it in the wrong
environment.

---

## 2. The state layer is the whole interaction language

This is the single highest-fidelity detail in the build and the easiest to get
subtly wrong.

- A `::before` at `inset: 0`, inheriting the host's radius, `opacity: 0`.
- Hover takes it to **`.08`**. Icon buttons at 40×40 take it to **`.12`**.
- Pressed is **`.10`** *plus a radius morph* — the shape change is the feedback,
  the colour barely moves.
- Transition is **`opacity .075s linear`**. Fast enough to read as instant,
  still a ramp rather than a flip.

**The tint is the control's own on-colour, never a neutral black.** `#072711` on
the green tonal button, `#ffffff` on a blue filled one, `#0b57d0` on a blue text
link, `#1f1f1f` only on genuinely neutral surfaces. The layer should read as the
control gaining more of itself. *A generic 8% black is what makes a Material copy
look like a copy.*

Two corollaries that have both been violated at least once here:

- **Never flip a state.** If a property changes on interaction it gets a
  duration, even a 75ms one. A binary background swap is the most reliable tell
  of a fake.
- **State layers do not nest.** Hovering a button inside a card lights the button
  and leaves the card completely inert.

---

## 3. Focus is the ring, and only the ring

```css
box-shadow: 0 0 0 3px #00639b;   /* on a span inset -2px, radius = host + 2 */
```

Not an `outline` — outlines cannot animate. The colour is the secondary token
`#00639b`, not the primary blue you would guess.

**Do not also darken the fill.** A 12% layer under the ring is what made our
selected card look older and greyer than Meet's with the same `#d3e3fd`. The
ring is the entire feedback.

---

## 4. Geometry: the radii and the rhythm do the work

| Thing | Value |
|---|---|
| Control height / radius | **48px / 24px** — every pill in the bar |
| Gap between controls | **8px** |
| Video tile radius | **24px** |
| Side panel | **360px wide, radius 20px**, inset 72px from the top |
| Composer pill | 48px tall, **radius 28px** |
| Dialogs | **radius 8px** (a Material 2 holdover — keep it) |
| Top bar | 56px |
| Control bar | 80px band, 48px controls centred |
| Menu row | 48px tall, label at **dx 52**, surface radius 12, 8px top/bottom padding |

Two numbers to distrust in your own head: dialogs are 8, not 12 or 28; and the
menu label sits at 52 from the surface edge, not at the icon's edge.

---

## 5. Type

- **Google Sans / Google Sans Text**, with the system stack behind it.
- Control and menu labels: **500 14px/20px**.
- Nav labels: 500 12px.
- Panel headings: 400 18px/24px.
- Match type with type. The wordmark was a cropped bitmap for a while and it
  could not share a baseline with the text beside it; `text-stroke` supplies ink
  weight without moving a metric.

---

## 6. Motion

- **Simulate, do not choreograph.** CSS animations are independent timelines, so
  "this gives way once that has taken the blow" cannot be expressed as keyframes
  — it has to be one simulation with one clock.
- **Order the events, not the elements.** Overlapping two sequences is what
  produced a 9px jerk in the wordmark; sequencing them dropped it under 2px.
- Shape morph: `border-radius .2s steps(6, jump-none)` with the fill — the
  six-step morph is measured, on both the lobby round controls and the bar's
  active state.
- Standard easing `cubic-bezier(0.2, 0, 0, 1)`; the window/desktop snap uses
  `cubic-bezier(0.4, 0, 0.2, 1)` at `.3s`, measured.
- **Animate position, not size**, where the original does. The presenting tile
  transitions `left`/`bottom`, never `width` — and transitioning size there broke
  the layout maths twice.
- Every animation has a `prefers-reduced-motion` answer.

---

## 7. Controls: pick from the shelf

| Need | Use |
|---|---|
| Primary action | Filled `#0b57d0`, white ink, radius 24, height 48 |
| Secondary action | Tonal `#c4eed0` with `#072711` ink |
| Tertiary / dismiss | Text button, `#1a73e8`, no fill |
| Dismiss a surface | **Icon button, `close` glyph at 22px, `.icon-btn`** — the same control the side panel already uses |
| Destructive | `#dc362e`, and only in the call |

**There is no bordered grey button in this design language.** If a change wants
one, the answer is one of the five rows above.

---

## 8. Tooltips

- 4px from the anchor, centred on it.
- The side is **not uniform**: top-bar controls place below, the date row places
  above, because below would land on the meeting list.
- **Fewer controls get one than you would think.** The Join buttons get none at
  all, and touching the one inside the code field actively dismisses that field's
  tooltip. When in doubt, no tooltip.

---

## 9. Honesty rules, which are also design rules

These come from the project's own constraints and they have shaped more of the
UI than any colour has.

- **No dead controls.** A control that cannot act is not rendered as a control.
  Rows the original disables are disabled here and take no hover.
- **Label the imitations.** Any surface that convincingly copies a *trust
  boundary* — a browser, an operating system, a permission prompt — says on its
  face that it is part of a CV. Meet's own chrome keeps Meet's own words.
- **Say what is not measured.** A number read off the product and a number
  chosen by us are different things, and the comment says which.

---

## 10. Before you commit a UI change

1. Which of the two palettes is this in? Take every colour from that column.
2. Does it have a state layer, at `.08`/`.12`, tinted with its own on-colour, at
   75ms?
3. Is focus the ring alone?
4. Is the radius on the list in §4?
5. Is it one of the five controls in §7, or did I invent a sixth?
6. If it animates, does it have a reduced-motion answer?
7. If it imitates a trust boundary, does it say so?

---

## Known violations at the time of writing

- **`.btn btn-sm btn-primary` on "Back to the call"** in `src/ui/plain.ts` — a
  bordered button in a style used nowhere else. Fixed by making `#plain` an
  overlay dismissed by the standard `close` icon button (§7).
- **The dev portal is dark** while every surface that opens it is light. Being
  brought into the light shell.
