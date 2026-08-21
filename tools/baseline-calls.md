# Calls tab — measured baseline

Read off the live product on 2026-08-21 by driving `meet.google.com/home?calling=1`
at a **2560 × 1271** viewport, rail 104 wide, content column `main` = `104,64 2456×1207`.

Every number below was read from `getBoundingClientRect` / `getComputedStyle` /
`document.getAnimations()`, not from a screenshot. Where a value is derived
(e.g. a size read while a scale transform was mid-flight) it says so.

Method notes that cost time and are worth keeping:

- **The Calls tab is `/home?calling=1`.** `meet.google.com/calls` is a 404.
- **`requestAnimationFrame` never fires in the automated tab** — it is a
  background tab, so rAF is throttled to nothing. A frame-polling recorder
  returns an empty log and looks like "no animation". Call
  `document.getAnimations()` *directly* instead: it returns live `CSSTransition`
  objects with `getTiming()` and `getKeyframes()`, which is strictly better data
  than sampling would have given.
- **`getComputedStyle(el).transition` reads as `all` / `0s`** on almost
  everything here, because Meet's transitions are installed per-interaction.
  A `0s` reading is NOT proof that nothing animates — check `getAnimations()`.
- **Boxes read during the dialog's entrance are scaled.** The panel enters at
  `scale(0.8)`; anything measured mid-flight must be divided by the current
  scale. Wait for `transform: none` before trusting a box.

---

## 1. The band (collapsed)

```
holder   position:absolute; top:0; left:860px; right:860px; margin:0 8px;
         padding:16px 0 0; width:720px; z-index:2
band     972,80  720×96   #f0f4f9  radius 28
pill     992,100 680×56   #fff     radius 28   margin 20 (= the band's inset)
search   dx 16 from the pill, 24×24, #444746
input    dx 52 from the pill (16 pad + 24 glyph + 12 gap), 16/24 Google Sans Text, #1f1f1f
```

**The holder is `position: absolute`.** This is the single most important fact on
this screen: the band is out of flow, pinned to the top of the content column and
centred in it (`left`/`right` symmetric + 8px margin). Expanding it can therefore
never move anything. The flow content below starts at y=176 — the collapsed
holder's full 112px height is reserved by a spacer, not by the band itself.

Horizontal centring is on the **content column** (centre 1332), not the viewport
(centre 1280). The dialog, by contrast, centres on the viewport — see §6.

### The shadow

There is no `box-shadow` on the band or on any ancestor. It comes from a GM3
elevation helper class, `MMvswb`, that paints two shadows on its own pseudos:

```css
.MMvswb, .MMvswb::after, .MMvswb::before { border-radius: inherit; inset: 0; position: absolute; pointer-events: none }
.MMvswb::after, .MMvswb::before { transition: box-shadow 75ms linear; content: "" }
```

Both shadow offsets are `calc()` expressions driven by one custom property,
`--yXuigc` = the elevation **level**. Resolved, the system is:

| level | `::before` (key, opacity .3) | `::after` (ambient, opacity .15) |
|---|---|---|
| 1 | `0 1px 2px 0` | `0 1px 3px 1px` |
| **2** | **`0 1px 2px 0`** | **`0 2px 6px 2px`** |
| 3 | `0 1px 3px 0` | `0 4px 8px 3px` |

The band sits at **level 2**, shadow colour `#000`. So:

```css
box-shadow: 0 1px 2px 0 rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15);
```

The call dialog sits at **level 3**; the overflow menu at level 2.

---

## 2. The band (expanded — the field has focus)

Same x, y, width and radius. Height **96 → 406**, and there is **no transition**
on it: `getAnimations()` is empty across the change and the height is not in any
transition list. Meet snaps this open. The class `FFSsVc` lands on the holder.

```
band     972,80  720×406
pill     loses its white fill (background → transparent); stays 56 tall
list     first row top at 157 = band top + 77   (pill bottom 150, then a 7px gap)
row      712×72, x=972 — flush to both band edges; the missing 8px on the right
         is the scrollbar gutter, not a margin
avatar   40×40 at dx 16, dy 16 within the row
name     16/24, #1f1f1f, at dx 72 (16 + 40 + 16)
address  14/20, #444746, at dx 72
list box max-height 256px, overflow-y auto      <- NOT 334
footer   72px tall; Continue 125×40 at 16 from the band's bottom and right
```

`406 = 72 (pill zone) + 334`, and the 334 is a `max-height: 336px` wrapper
holding the 256px list viewport plus the 72px footer.

### Row hover

```css
.row::before { content:""; position:absolute; inset:0; background:#444746; opacity:0 }
.row:hover::before { opacity:.08 }
```

**No transition on this one** (`all 0s ease`). Rows snap. This differs from the
home screen's controls, which all use `opacity 75ms linear` — do not assume one
rule covers both surfaces.

### Continue

```
disabled  bg rgba(31,31,31,.12)   ink rgba(16,16,16,.3)
enabled   bg #0b57d0              ink #fff
both      125×40, radius 20, padding 0 16 0 24
```

---

## 3. Selecting a contact — the check

This is a distinct element that appears over the avatar, not a swapped avatar:

```css
.s38Kwb {                      /* the blue disc */
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  border-radius: 50%;
  background-color: #0b57d0;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transform: scale(0);
  transition: transform .15s ease-out;     /* <- the whole effect */
}
.row[selected] .s38Kwb { opacity: 1; transform: scale(1) }
```

So: **opacity snaps 0→1, and the disc scales 0→1 over 150ms ease-out.** Only
`transform` is transitioned. Deselecting runs it backwards, same curve. The
white check glyph inside is 24×24, centred (`fill: #fff`).

The photo underneath is not removed — it carries
`transition: opacity 50ms ease-in-out` and stays in place behind the disc.

### What lands in the field

```
chip      174×32 at dx 52 from the pill, dy 12 (centred in the 56 pill)
          #dde3ea, fully rounded, ink #444746, margin 4
chip av   28×28 at 2px inset inside the chip, radius 50%      <- not 24
clear     40×40 at 16 from the pill's right edge, radius 20,
          icon `close` 24px #444746, tooltip "Clear search input"
```

**The placeholder is retained.** With a chip in the field the input still reads
`Search contacts or dial` — Meet does not blank it. The row keeps
`aria-selected="true"` and the state layer stays at .08, so a selected row and a
hovered row are identical in a still; only the disc distinguishes them.

---

## 4. Pressing Continue

Three things happen at once, and the first is easy to miss:

1. **The band collapses back to 96** and the input loses focus. The chip stays,
   the pill takes its white fill back. The panel behind the dialog is *not* left
   standing open.
2. The scrim fades in.
3. The dialog scales up.

### The entrance, from `getAnimations()`

| target | property | from → to | duration | easing |
|---|---|---|---|---|
| content wrapper | `opacity` | 0 → 1 | **75ms** | linear |
| panel | `transform` | `scale(0.8)` → `none` | **150ms** | `cubic-bezier(0, 0, .2, 1)` |
| scrim | `opacity` | 0 → 1 | **150ms** | linear |

```
scrim   position:fixed; inset:0; background:rgba(0,0,0,.32); z-index:-1
layer   position:fixed; inset:0; z-index:2001
```

The scrim is a `z-index:-1` child of the fixed layer, which is why it paints
behind the panel without a separate stacking context.

Also observed: the GM3 ripple on the pressed button runs
**450ms `cubic-bezier(0.2, 0, 0, 1)`**, scaling from 1 to ~13.6.

---

## 5. Divergence check — what Meet does NOT do here

Confirmed absent, so ours should not invent them:

- No transition on the band's expand/collapse.
- No transition on the row hover layer.
- No tooltip on Voice call / Video call — their labels are visible.
- No elevation change on button hover (`--yXuigc` stays 0 on `:hover`); the
  feedback is the state layer alone.

---

## 6. The call dialog

Centred on the **viewport** (512 wide → x 1024 at vw 2560; centre y 636 at
vh 1271), which is `position:fixed; inset:0; display:grid; place-items:center`.

```
panel      512×532   #e9eef6   radius 28   elevation 3
header     512×56    padding 16 16 0 0
more_vert  40×40 at dx 408 (64 from the right edge), dy 16, radius 20
close      40×40 at dx 456 (16 from the right edge), dy 16 — 8px gap
body       padding 32 32 0
avatar     88×88 round, centred, dy 104, placeholder fill #dde3ea
name       28/36 Google Sans, dy 208, colour #444746          <- not #1f1f1f
address    16/24 Google Sans, dy 248, #444746, margin-bottom 32
button row 317×56, dy 320
voice      150×56  #c2e7ff  icon+label #001d35
video      152×56  #0b57d0  icon+label #fff        16px between them
both       radius 28, padding 0 24, label 500 16/20 Google Sans,
           icon 24 with margin-right 8
calling as 14/20 Google Sans Flex / Google Sans Text, #444746, dy 392
notice     480×88 at 16px inset, dy 428, #dde3ea, radius 28, padding 16
  title    500 12/16 Google Sans, #444746, ls .1px, margin-bottom 8
  body     12/16 Google Sans, #444746, ls .1px
  link     #0b57d0
  Got it   ~88×40, radius 20, padding 0 24, transparent,
           1px solid #747775, label 500 14/20 Google Sans, #0b57d0
```

**Voice call is a live, enabled `<button>`** — not disabled, `cursor: pointer`.

### Hover — the state layer, and the rule behind it

Every control here paints its hover state on a `::before` of an inner state-layer
span, and the tint is **the control's own on-colour**, never neutral black:

| control | box | tint | opacity | radius |
|---|---|---|---|---|
| more_vert / close | 40×40 | `#444746` | .08 | 20 |
| Voice call | 150×56 | `#001d35` | .08 | 28 |
| Video call | 152×56 | `#ffffff` | .08 | 28 |
| Got it | 88×40 | `#0b57d0` | .08 | 20 |
| Clear search input | 40×40 | `#444746` | .08 | 20 |

```css
::before { position:absolute; inset:0; border-radius:inherit;
           background:<on-colour>; opacity:0;
           transition: opacity 75ms linear; pointer-events:none }
:hover ::before { opacity:.08 }
```

`::after` is the press layer, `transition: opacity .25s linear`.

### Tooltip (more_vert, close, clear — not the call buttons)

```
bg #303030   ink #e3e3e3   12/16 Google Sans   ls .1px
padding 4px 8px   radius 4   height 24   outer position:fixed z-index:2101
```

### Overflow menu

```
131×64 (content-sized), radius 12, padding 8 0, elevation 2
right-aligned to the button's right edge, 0px gap below it
one item, "Block user", 48 tall, padding 8 12, 16/16 Google Sans Flex, with a `block` icon
```

---

## 7. The empty state behind the band

```
wrapper  972,176  720×350   display:flex; align-items:center; padding:110px 0 0
art      348×152 at 1158,286   (176 + 110)
headline 45/52 Google Sans, #1f1f1f, centred, y 438 — margin 0, directly under the art
subtitle 22/28 Google Sans, #1f1f1f, centred, y 498 — margin 0
```

Both text blocks have **zero margin**; the only vertical spacing in the group is
the wrapper's 110px top padding. The expanded band (bottom 486) covers the art
completely and clips the headline, which is the intended look — see §1.
