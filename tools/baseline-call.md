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
