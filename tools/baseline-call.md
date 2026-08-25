# The in-call view — measured baseline

Read off the live product on 2026-08-22 by joining `meet.google.com/gyw-urde-brr`
and driving it, at a **2560 × 1215** viewport. Sits alongside `baseline-calls.md`,
which covers the Calls tab.

Values came from `getBoundingClientRect` / `getComputedStyle` unless a line says
otherwise. Where a number is read off a screenshot it says so and gives the raw
screenshot pixel plus the conversion — screenshots are 1568 wide against a 2560
viewport, so **× 1.6327**.

## Method notes worth keeping

- **Synthetic clicks do not fire reactions.** `element.click()` toggles the tray
  fine but sends nothing: Meet listens for trusted pointer events. Reactions only
  appeared once real clicks were driven through the computer tool. Anything that
  looks inert under scripted clicking is worth retrying with a real one.
- **Reactions are not in the DOM.** No added nodes, no `<canvas>`, no shadow
  roots — a diff of `document.querySelectorAll('*')` across a burst returns
  nothing. They are only observable in screenshots. Every reaction number below
  is therefore screenshot-derived, and the animation timing was not captured.
- **Bursts are throttled.** Ten clicks in a row yield one reaction. Spacing them
  ~450 ms apart puts six or seven in flight at once, which is what a spread
  sample needs.
- **The share picker is a native Chrome dialog.** It does not appear in tab
  screenshots and cannot be read from the page. Not a problem for us — we are
  mocking it, not cloning a Meet surface — but it means no live measurement.
- **Alone in a call, Meet interrupts.** An "Are you still there?" dialog appears
  after a couple of idle minutes and steals focus mid-interaction; it ends the
  call if ignored. Press "Stay in the call" and carry on.
- A stuck "Presentation is starting…" tooltip after cancelling the picker
  intercepted clicks on the overflow button. Reload if that happens.

## The tile: one rule covers three states

The tile is **aspect-locked 16:9** and fits whatever height is left over, then
centres horizontally in whatever width is left over. Every state below is that
one rule with a different reservation — there is no separate layout per feature.

| state | tile | reserved below |
|---|---|---|
| plain | `1889 × 1063 @ 335,72` | — |
| reactions tray open | `1797 × 1011 @ 381,72` | **52** |
| captions on | `1505 × 847 @ 527,72` | **216** |
| chat panel open | `1889 × 1063 @ 147,72` | 0 (width only) |

1889/1063 = 1797/1011 = 1505/847 = **1.777**. Top edge stays at y 72 throughout.

- Radius **24px**, which matches the spec already in the repo.
- The chat panel takes width, not height: the tile keeps its full size and
  re-centres in the 2185px left over. `(2185 − 1889) / 2 = 148`, measured 147.
- The caption region is full-width `2560 × 216 @ y 919`, and 919 is exactly the
  tile's bottom edge in that state.

## Control bar

Bar sits at **y 1151, 48 tall**. Measured left to right:

| control | x | size |
|---|---|---|
| Audio settings (chevron) | 998 | 88 × 48 |
| Turn off microphone | 1038 | 48 × 48 |
| Video settings (chevron) | 1094 | 88 × 48 |
| Camera | 1134 | 48 × 48 |
| Share screen | 1190 | 56 × 48 |
| Send a reaction | 1254 | 56 × 48 |
| Turn on captions | 1318 | 56 × 48 |
| Raise hand | 1382 | 56 × 48 |
| More options | 1446 | 36 × 48 |
| Leave call | 1490 | 72 × 48 |
| Chat with everyone | 2404 | 48 × 48 |
| Meeting tools | 2452 | 48 × 48 |
| Host controls | 2500 | 48 × 48 |

This confirms the rhythm already documented in `call.ts`:
`[chev 40 + mic 48] [chev 40 + cam 48] [56] [56] [56] [56] [36] [72]`.

Idle fill `#333537`; the chevron pairs `#282a2c`; radius 24.

### The active state, and it is the lobby's morph again

A control that is *on* goes **radius 24 → 12** and fills **`#a8c7fa`**, carrying

```
transition: border-radius .2s steps(6, jump-none), background-color .2s
```

— the same six-step morph measured on the pre-join round controls. So "active"
in the bar and "off" in the lobby are one shape language: a pill becomes a
rounded square in a tinted fill, in six steps.

## Reactions

**All screenshot-derived** — see the method note above.

Two bursts of six to seven, thumbs and hearts, spaced ~450 ms. Emoji x positions
in screenshot pixels:

```
burst 1   249, 200, 141, 135, 72, 47, 45
burst 2   249, 178, 134, 129, 84, 47, 46
```

The tile's left edge is at screenshot x 235 (CSS 384). **Almost every reaction
falls outside the tile, in the left margin of the call area.** Converting the
moving band (excluding the 249 outlier, which sat at the very top of its track in
both bursts and may be a spent reaction rather than a fresh spawn):

- screenshot x **45 → 200**
- CSS x **73 → 327**, a band roughly **254 wide**, anchored to the left edge of
  the call area with about a 73px inset

### Two corrections to what `call.ts` currently claims

1. **The band is not "at the tile's bottom-left".** At this viewport it is not
   over the tile at all. Our implementation anchors the band inside the tile
   (`left: 55px` plus a 130px spread), which at a wide viewport puts reactions
   somewhere Meet never puts them. The two only coincide when the tile fills the
   width — which is why Nam's narrow-window screenshot looked so different from
   the earlier measurement, and why both could seem right.
2. **The name chip tracks its emoji.** Every chip sat directly beneath its own
   emoji, at the same x, across both bursts. The current code pins the chip at a
   fixed `left: 3px` and a comment claims Meet does the same and that following
   `--rx` was a bug. That is backwards: following the emoji is correct.

Chip is a light-blue pill reading `You`, sitting immediately under the emoji.
The rise carries them from the tile's bottom to its top, so the track is roughly
the tile's height rather than the fixed 508px currently coded.

**Not captured:** duration, easing, per-reaction spawn timing, and whether the
band scales with tile size. Nothing here should be turned into an animation curve
without another pass.

## Chat panel

- Panel `358 × 1061 @ 2185,73`, fill **`#1e1f20`**, radius 0, no padding.
  Ours uses `--panel: #202124` at 360 wide with radius 20 — three small misses.
- Composer `278 × 24 @ 2201,1082`, 14/24 Google Sans.
- Own message bubble `244 × 104 @ 2287,932`: fill **`#004a77`**, **radius 20**,
  **padding 12**, text **14/20** `#e3e3e3`, right-aligned, timestamp above it.
- **The bubble is capped at 244 inside a 358 panel** — roughly 68%. Ours sets no
  `max-width`, so bubbles run the full 312px content box. That is the likeliest
  cause of the clipping Nam reported.
- Empty state: an illustration plus "No chat messages yet".
- Meet right-aligns *your* messages in blue and left-aligns others' in grey. Our
  panel is Nam talking to the visitor, so left-aligned grey stays correct for the
  fiction — only the width cap and the radius need to change.

## Raise hand

- Control takes the active state (blue, radius 12).
- A green pill appears at the **top right of the bar**, showing the raiser's name.
- A green badge appears at the **tile's bottom left**, also with the name.
- **No animation of any kind.** Nothing moves, nothing flashes. Worth stating
  plainly because it is the flatness our jump scare is deviating from — the gag
  works precisely because the real control is this unremarkable.

## Screen share

The picker is Chrome's own dialog and is invisible to tab screenshots, so there
is nothing to measure from the page. Meet's part is only the trigger and the
tooltip "Presentation is starting…". What a live share does to the call layout —
the presenting banner, the tile arrangement, the stop-sharing affordance — was
**not measured**, because completing a share needs the native dialog driven.

## Not measured this session

- The presenting layout, per above.
- Picture-in-picture at any size.
- Per-button hover states in the bar.
- The overflow menu's contents (a stuck tooltip blocked it).
- Reaction timing and easing.

## The pinned state — measured 2026-08-25

Read off `meet.google.com/jxc-zfzi-vjt` at **2560 × 1215**, via *More options →
Pin to the screen → For myself only*. Nam drove the pin; the panel and hand were
toggled from the console.

### Pinning does not resize a solo tile

| state | tile | panel |
|---|---|---|
| pinned, nothing else | `1889 × 1063 @ 335,64` | — |
| pinned + People open | `1889 × 1063 @ 147,64` | `360 × 1063 @ 2184,64` |

Identical to the unpinned numbers in the table above — same size, same re-centring
(147). **Pin is orthogonal to layout.** It adds a marker and nothing else, which
is the whole reason this state is cheap for us to support: no new geometry.

Two corrections to the earlier chat-panel line while we are here: the panel reads
**360 × 1063 @ 2184,64**, not 358 × 1061 @ 2185,73. Our 360 was right.

### The tile marker

The bottom-left strip is a flex row, 16px in from the tile's left edge, with its
items centred on **y = tile bottom − 25**.

| part | box | detail |
|---|---|---|
| pin glyph | `20 × 20 @ 163,1092` | ligature **`keep`**, `#fff`, 20px, weight 400, Google Symbols |
| name | `96 × 20 @ 197,1092` | `#fff`, `500 16px/24px` Google Sans |

Pin's right edge is 183, name starts at 197 — a **14px** gap.

The glyph carries a visually-hidden span reading **"Pinned for yourself"** (12px
Roboto, parked at x −9853). That is the accessible name, and it is worth copying
verbatim: it names the scope, which is the distinction the submenu we skipped was
there to make.

### Pinned + hand raised — the marker survives

This is the pairing Nam asked about, and the answer is that **the pin stays put
and the name plate is what gives way**:

- pin glyph: `20 × 20 @ 163,1092` — *unchanged*
- green badge replaces the name: `140 × 32 @ 189,1086`, fill **`#6dd58c`**,
  text **`#0a3818`**, radius **16**

Badge centre y is 1102, exactly the pin's centre y. The gap from the pin's edge
to the badge box is **6px** rather than 14, because the badge carries its own
padding — so the text still lands about where the name text did.

**The tile badge and the top-bar chip are different chips.** Top bar is
`125 × 36 @ 2310,14`, fill `#80da88`, radius **48**. Tile badge is `#6dd58c`,
32 tall, radius **16**. Easy to conflate and wrong to share one rule.

### The People-panel marker

A second, smaller pin rides the avatar in the contributor row:

- ligature `keep`, `15 × 15 @ 2236,547`, `#e3e3e3`, 15px, Google Symbols
- the row avatar is `32 × 32 @ 2216,527`, radius 50%

So the marker sits at the avatar's **bottom-right, offset +20/+20** from its top
left corner, overlapping the circle. It is present whether or not the hand is
raised — when the hand goes up, a "Raised hands" section with *Lower all* appears
*above* Contributors, and the pinned row keeps its marker in place below.

### Still not captured

**Pinned + screen share.** Nam's recollection is that the video frame becomes
much taller when presenting while pinned. Starting a share needs Chrome's native
picker driven, which is invisible to the page and to tab screenshots — the same
wall documented above. Left unmeasured rather than guessed.

### Pinned + presenting — finally measured

Nam drove the native picker on 2026-08-25, which is the one thing that unblocks
this. His recollection was right: **the pinned tile becomes much taller.** It is
not a taller 16:9 — it turns portrait.

| part | box | detail |
|---|---|---|
| share surface | `1587 × 787 @ 16,202` | radius **8**, fill **`#3c4043`** |
| pinned self tile | `565 × 754 @ 1619,211` | radius **24**, AR **0.749** |
| People panel | `360 × 1063 @ 2184,64` | unchanged |

The self tile is **not aspect-locked** in this layout — it takes the column that
is left over. Share ends at x 1603, a 16px gutter, tile from 1619 to 2184, which
is exactly the panel's left edge: `2184 − 1619 = 565`. So width is leftover
space, and the video letterboxes inside it rather than driving the box. That is a
different rule from every other state in this document, where 16:9 drives
everything — worth flagging before anyone reuses the keystone here.

**The bottom-left strip rule does not change.** Pin glyph `20 × 20 @ 1635,930`
against a tile at x 1619 with its bottom at 965: **16px in, 15px up**, the same
two numbers as the wide tile. One rule covers both shapes, which is why the
marker needed no special case.

The top bar gains `Nam Nguyen (You, presenting, annotating)`, a *Presentation
audio* toggle and a red *Stop presenting* — and the People panel goes to
**Contributors 2**, adding a `Nam Nguyen / Your presentation` row. Both rows then
carry the 15px pin marker, so the presentation row inherits it.

Our own presenting view is a full-bleed composition of our own (see the note at
the top of the share block in `styles.css`) rather than this two-column layout.
Recording the real geometry here so that is a deliberate difference with a
measurement behind it, not a gap.

### The extreme state: pinned + presenting + hand + panel + tray + captions

Nam turned the emoji tray and captions on over the presenting state, which
answers the reservation question directly — and the answer is **not** the one the
solo-tile keystone would predict.

| | share surface | self tile |
|---|---|---|
| presenting | `1587 × 787 @ 16,**202**` | `565 × 754 @ 1619,**211**` |
| + tray + captions | `1587 × 787 @ 16,**70**` | `565 × 754 @ 1619,**79**` |

**Nothing resized. The whole stage moved up 132px.** Same widths, same heights,
new y.

The reservations are the same 52 and 216 measured on the solo tile — they just
land differently:

```
region        1151 − 64          = 1087
reserved      52 (tray) + 216 (cc) = 268
left over     1087 − 268          =  819
stage needs                          787   ->  fits, so it centres
centre        64 + (819 − 787) / 2 =  80   ->  measured 70 / 79
```

So the presenting stage is **centred in whatever is left over and only shrinks
once the region is smaller than it is**. With 787 needed and 819 available there
is 32px of slack, and Meet spends it on position rather than scale. The solo tile
shrinks because it is aspect-locked to fill; this stage is sized by the shared
content and merely placed. Two different rules, and conflating them is how you
would get a presenting layout that scales when the real one slides.

The pin marker holds at 16/15 against the tile through all of it.

### The tile menu while pinned

Read straight off the open menu — Nam held the hover so it survived long enough
to query, which the pill's own menu otherwise never does.

```
menu     247 x 160 @ 1926,476   radius 12      (3 x 48 rows + 8 top + 8 bottom)
row 1    close_fullscreen  Minimize                      aria-disabled=true
row 2    keep_off          Unpin                         LIVE
row 3    aspect_ratio      Show my full video to others  aria-disabled=true
```

Three things settled:

1. The live row genuinely reads **"Unpin"** when pinned. That was an inference
   before; it is measured now.
2. Its glyph is **`keep_off`**, which the 7 kB subset does not carry. We use
   `keep` for both faces and let the label carry the difference — drawing a
   stand-in is what Round 5 got wrong.
3. **The menu is 247 wide, not 232.** Round 4's 232 came off a screenshot;
   this is a `getBoundingClientRect`. Corrected.

Note also, from Nam: the centre controller is on the tile **at all times** — in
the pinned state and in the portrait presenting state alike. It is not a
pinned-only affordance, which matches ours living on `.solo`.

The surface itself, walked up from a row until something painted: **`#1e1f20`**,
radius 12, **no shadow**, padding `8px 0`. Labels are `500 14px/20px "Google
Sans Flex"` in `#e3e3e3` at **dx 52**. We had `#282a2c` on this surface — which
is the control bar's chevron-pair fill, near enough to pass a glance and still
the wrong token. Fixed.

The two dead rows read visibly dimmer than "Unpin" in a screenshot, but every
row, wrapper and label reports `opacity: 1` and `color: #e3e3e3`. So the dimming
is applied somewhere we did not find in four levels of ancestry — recorded as
unresolved rather than guessed at, since ours already distinguishes dead rows.
