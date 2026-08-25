# Build plan: the in-call view

Written against `tools/baseline-call.md`. Reviewed twice before any code —
review notes are folded in below rather than appended, so what you read is the
resolved plan.

## The keystone

Meet's tile is **16:9, letterboxed inside the available area**. Ours is
`width:100%; height:100%` and simply fills `.grid-wrap.is-solo`. That one
structural difference is the reason we have no frame-shrink: with a stretch-fit
tile there is nothing for a reserved strip to shrink.

Fix the tile, and items 3 and 4 stop being features and become consequences.
Reserving 52px for the tray or 216px for captions just makes the box shorter,
and an aspect-locked tile refits itself.

```css
.grid-wrap.is-solo { display: grid; place-items: center; container-type: size; }
.solo { aspect-ratio: 16 / 9; width: min(100cqw, calc(100cqh * 16 / 9)); height: auto; }
```

`container-type: size` plus `cqw`/`cqh` is the one CSS-only formulation that
actually fits a ratio box to a container both ways. The obvious attempts do not
work: `width:100%` makes width definite so `max-height` clamps height and breaks
the ratio, and `height:100%` breaks it the other way. Do not "simplify" this
back to max-width/max-height — it silently un-locks the aspect.

Then the two reservations are one line each:

```css
body.tray-open .grid-wrap.is-solo { bottom: calc(var(--botbar) + 52px); }
body.cc-on     .grid-wrap.is-solo { bottom: calc(var(--botbar) + 216px); }
```

They compose additively when both are on, which is correct and needs no special
case.

**Risk, and the mitigation.** `.solo` currently relies on filling its parent —
`.solo-blur` is `position:absolute; inset:0`, the avatar is centred by grid, and
`.grid-wrap.is-solo` is `display:block`. Switching the parent to grid and the
child to a ratio box changes what "100%" means for every descendant. After the
change, re-check: the blur layer, the scrim, the name plate, the hover control
strip, and the reaction layer's coordinate space. QA step 1 below covers this.

## 1. Reactions

Two corrections from the baseline, both against comments in `call.ts` that claim
to be measured:

- The band is **not** at the tile's bottom-left. At 2560 it is in the call
  area's left margin, entirely outside the tile: CSS x **73 → 327**, about 254
  wide. Anchor to the call area, not the tile.
- The chip **tracks its emoji's x**. The current fixed `left: 3px` and the
  comment defending it are both wrong. Chip sits directly under its emoji.

Also: the rise covers roughly the tile's height, not a fixed 508px. Derive
`--rise` from the tile's measured height at spawn.

**Honest limit.** Only one viewport was sampled, so whether the band is absolute
or proportional to the tile is unknown. Use the absolute px measured, and say so
in the comment — do not invent a scaling rule.

Keep our own emoji set. The mechanic is Meet's; the set is Nam's.

## 2. Reactions tray

Today the reaction button fires a reaction immediately. It should open a tray.

- Row of emoji buttons **40 × 40 on a 40px pitch**, above the bar, reserving 52.
- The button takes the **active state**: radius 24 → 12, fill `#a8c7fa`,
  `transition: border-radius .2s steps(6, jump-none), background-color .2s`.
  This is the same six-step morph as the lobby's round controls — reuse it
  rather than writing a second one.
- Clicking an emoji sends that reaction and leaves the tray open.
- Escape and an outside press close it.

Meet also shows a skin-tone control after a 12px gap. Skip it: it configures a
Google account preference we have no equivalent for, and an inert control that
looks configurable is worse than its absence. Note the omission in the comment.

## 3 & 4. Frame shrink

Falls out of the keystone. No separate work beyond the two body classes and
wiring them to the tray and captions state.

Captions must change from an overlay to a **reserved region**: currently `.cc` is
absolutely positioned over the tile. Meet gives it a full-width 216px band at
the tile's bottom edge.

## 5. Chat panel

Three small misses plus the actual bug:

- Panel fill `#1e1f20`, not our `--panel: #202124`.
- Panel 358 wide, ours 360. Radius 0 where ours is 20.
- **Bubble `max-width`, which is the clipping Nam reported.** Meet caps bubbles
  at 244 inside a 358 panel — about 68%. Ours has no cap, so bubbles run the
  full 312px content box. Cap at 68% of the panel.
- Bubble radius 20 and padding 12.

Keep our bubbles left-aligned grey. Meet right-aligns *your own* messages in
`#004a77`, but our panel is Nam talking to the visitor, so the visitor is
reading someone else's messages. The fiction is right; only the geometry is wrong.

## 6. Raise hand — already built

`slap()` in `call.ts`, CSS under "THE HAND THAT HITS THE GLASS", secret `slap`
achievement, `SCARE` as the single dial at 0.85.

The baseline makes the case for it stronger than expected: Meet's raise hand has
**no animation whatsoever** — a blue control, a green pill, a green badge, and
nothing moves. That flatness is exactly what the gag subverts, and it is worth a
line in the comment.

## 7. Screen share — the augmented picker

Not a clone of a Meet surface. Chrome's picker is a native dialog, invisible to
tab screenshots and unmeasurable from the page, so this is **our mockup of a
browser dialog**, with content we author presented as though the browser rendered
it. That is the whole point of it — full control over what a recruiter sees.

Scope for this pass, deliberately bounded:

- A picker panel with the three tabs (Chrome Tab / Window / Entire Screen), rows
  with favicon and title, a selected state, a preview pane, and Share / Cancel.
- **Chrome Tab** is the valuable one: rows that mount a real `<iframe>` of the
  thing — the CV, the job ad with the boxes ticked, a tool.
- **Window / Entire Screen**: one convincing desktop with a folder tree and the
  CV as a document. Not a trash can, not a PDF viewer, not four thin surfaces.
  Nam's open question was exactly this and my read stands: the folder tree with
  real iframes carries nearly all the value.
- Must be a **deferred chunk**. The initial bundle budget is 50 kB gzip enforced
  in CI and this screen cannot ride in it.

**Unknown, and it must be said in the code:** what a live share does to Meet's
own layout — presenting banner, tile arrangement, stop-sharing affordance — was
never measured, because completing a share needs the native dialog driven. So
the picker and its content are ours, but the *call's* presenting state is
un-cloned. Do not invent it.

## 8. Picture-in-picture

**Not measured.** Meet uses document PiP; nothing was captured at PiP size.
Building it would mean inventing the reduced control bar's contents and order.
Left out of this pass, and recorded as such.

## QA, against the screenshots in this session

1. **The keystone first.** After the aspect-ratio change, check the blur layer,
   scrim, name plate, hover strip and reaction coordinates before anything else.
   This is the change most likely to break something silently.
2. Tile ratio holds at 1.777 in all four states.
3. Tray reserves 52, captions 216, both compose.
4. Reaction band sits left of the tile; chips track their emoji.
5. Bubbles cap at 68% and stop clipping.
6. `npm run verify` green — 44 tests, typecheck, and the size budget.

## Order

Keystone → reactions → tray → captions → chat panel → screen share. The keystone
first because everything else measures against it, and the screen share last
because it is the only item that can be cut short without leaving the rest
half-done.

---

## Outcome, 2026-08-22

Built and verified against the baseline:

- **Keystone** — tile is 16:9 via `container-type: size` + `cqw/cqh`. Verified
  ratio 1.778 / 1.777 / 1.777 across plain, tray and captions, with the blur
  layer, scrim and name plate all following it.
- **Reactions** — band re-anchored to the call area, chip rides with its emoji
  on a matching animation, rise derived from the tile's height.
- **Tray** — 6 buttons, reserves 52, control takes the measured active state.
- **Captions** — reserve 216. Tray + captions compose to 268, verified.
- **Chat panel** — `#1e1f20`, bubbles capped at 68%, radius 20, padding 12. The
  clipping is gone (`overflowingBody: false`).
- **Raise hand** — the scare, from the previous session.
- **Screen share** — picker with three tabs and four authored sources, sharing
  mounts the content in the tile with browser chrome and a stop control.

Not built: **picture-in-picture**, exactly as this plan said. It was never
measured, and the reduced control bar's contents and order would have had to be
invented.

One reconciliation worth recording. QA flagged that reactions overlap the tile at
1280 wide, which looked like a bug against a baseline taken at 2560 where they
sat entirely outside it. It is not a bug: the band is anchored in absolute px to
the call area, so at a narrow viewport the tile grows into it. That is also what
Nam's own narrow-window screenshot shows. One absolute band explains both
observations, where a proportional one would explain neither.

---

# Round 3 — Nam's QA of 2026-08-23, measured live in "Test" (wge-xywx-srv)

Twelve faults. Analysis phase done the way the last two rounds established: join a
real call, drive synthetic pointer sequences (Meet ignores `el.click()`), and read
geometry and computed styles back out. Everything below is measured at 1440x900
unless stated.

## 1. The reaction tray must be gated, and it animates in

Ours renders the strip permanently. Meet's only exists while the button is on.

    emoji pill    540,780 360x40, #282a2c, radius 36
    nine emoji    540..900, 40x40 each, pitch 40, no gaps
    skin tone     912,780 40x40 — OUTSIDE the pill, its own control
    tray opens    float up + fade in

The skin-tone button being outside the pill is why the screenshots read as a row
plus a separate circle.

## 2. The skin tone popup

    popup    695,732 256x40, #282a2c, radius 8, WITH a shadow
    six      703 / 743 / 783 / 823 / 863 / 903, 40x40, y 732
    labels   Unspecified · Light · Medium-light · Medium · Medium-dark · Dark
    aria     "Skin tone. Unspecified skin tone selected."

Right-aligned to its button (row ends 943, button ends 952), 48px above the emoji
row, and it floats up and fades in the same way the tray does. It carries a
tooltip like every other control.

## 3. The frame resize is animated, and ours snaps

Sampling the tile every 16ms while the tray opens:

    t=170  748    t=361  724    t=553  698
    t=218  747    t=410  713    t=602  697
    t=268  744    t=457  706    t=649  696
    t=316  734    t=506  701

So: ~200ms of nothing, then 52px over ~430ms on an S-curve — slow, fast, slow.
Same mechanism must drive the captions reserve. Ours changes size instantly,
which is the single most un-Google thing left on the screen.

## 4. Reactions — four separate faults

The emoji is an **animated WebP**: `img src=.../1f44f/512.webp`, 53x53. Not a
still glyph, which is what Nam meant. Ours is a text emoji and static.

    chip        41,770 41x22, #8ab4f8, radius 22, 500 14px, ink #3c4043
    emoji       35,711 53x53
    gap         chipTop 770 - emojiBottom 764 = 6px
    centring    emoji 35..88 centre 61.5; chip 41..82 centre 61.5 — centred

Ours overlaps them and pins the chip at a fixed offset.

Fade: the chip's opacity holds 1.0 until t=2851 at y=368, then 0.86 / 0.64 / 0.41
/ 0.19, and both emoji and chip are gone at t=3651. Viewport 900, so the fade
begins at y 368 — **just above the midpoint**, exactly as Nam described. Rise is
140 px/s linear over the whole life.

Ours fades the chip out early and the emoji seconds later. They must go together,
over the same ~800ms window, starting just above half height.

## 5. The tile controls have a background, and only on hover

    container  656,398 128x44, #202124, radius 44
    Reframe    656,398 44x44 r22, frame_person
    Effects    700,398 44x44 r22, visual_effects
    More       744,400 40x40 r20, more_vert

128 = 44 + 44 + 40 with no gaps. Hidden until the tile is hovered, and each of
the three carries a tooltip. Ours has no container, the wrong glyphs and no tips.

## 6. The Gemini notes panel, which opens on entering the meeting

    panel     1103,65 320x536, #282a2c, radius 16
    heading   "Let Gemini take notes for this meeting" @1127,89 272x64, 500 24px,
              painted with a gradient fill (computed colour is transparent)
    row 1     email glyph 20px #c4c7c5 @1139,191
              "Send notes to:" 400 12px #c4c7c5 @1175,185
              "The host and co-hosts" 400 12px #a8c7fa @1175,201
              caret in a 28x32 r16 #333537 button @1371,185
              options: All invited guests / Invited guests in your organization /
                       The host and co-hosts
    row 2     language glyph @1139,251, "English" #a8c7fa @1279,253 (a link)
    expander  "More settings" @1119,439 288x50, radius 12 12 0 0
              holds Notes length: Standard · Sections: Summary, Details, Next steps
    primary   "Start taking notes (English)" @1119,509 288x56, #a8c7fa, radius 16

## 7. The tooltip flow Nam described, which is a three-state machine

1. Cold: hovering a control waits a grace period before the label appears.
2. Primed: once one has shown, moving to another control shows its label with no
   delay — the "lock".
3. Leaving does not hide it instantly; it lingers briefly.

We have 1 and 2. The linger is missing, which is what makes it feel abrupt.

## 8. Screen share — the biggest gap

- The mock file window is macOS: traffic-light dots, Finder proportions. It has
  to be **Windows Explorer**.
- Text must not be selectable, but right-click, a second click on a selected
  name, or F2 renames — established Windows behaviour, so it should be honoured.
- The window must be resizable.
- Clicking a file must open that resource. NamNguyen_CV_2026.pdf currently does
  nothing.
- "Window" and "Entire screen" currently return the same content. They must not.
- The Chrome-tab share should show the real pages in an iframe so the responsive
  UI is genuinely responsive. Our own pages can be framed; careers.google.com
  cannot (it will refuse), and Nam likes the authored version, so that one stays
  authored. This needs `frame-src 'self'` added to a CSP that currently ships
  `default-src 'none'`.

## 9. The ! badges belong on the in-call mic and camera

Present in Meet whenever the device is genuinely missing, absent otherwise —
never unconditional.

## 10. The raised hand leaves a pill

After the scare, a green pill with a hand glyph and the name sits at the bottom
left. Colour and animation to be matched from Nam's screenshot; I could not
reproduce the state in the DOM before leaving the call, so this one is
screenshot-derived and flagged as such.

## 11. Captions overlap the reaction tray

They occupy the same band. The captions reserve and the tray reserve have to
compose rather than collide — which the aspect-locked tile now makes possible.

## Order

Gating and animation first (1, 2, 3), because the resize transition is shared by
everything after it. Then reactions (4), then the tile controls (5), the badges
(9) and the hand (10) as small independent fixes. Then the tooltip machine (7),
the Gemini panel (6), captions (11), and the share window (8) last because it is
the largest and least entangled.

---

## Round 4 — measured with `document.getAnimations()`, 2026-08-23

Nam restored a live session, which changed the method. Instead of sampling
screenshots and inferring curves, I read the running animations straight off the
product: `document.getAnimations()` returns every active animation with its
target, its resolved timing, and its keyframes as authored. That is not a
reconstruction of an effect, it IS the effect — Google's own keyframe names
included.

Two practical notes for next time:

- **Synthetic `.click()` does not reach Meet's jsaction handlers** for some
  controls. Reactions never fired from script; a real pointer event through the
  `computer` tool did (and produced the MDC ripple to prove it). Use real clicks
  when the thing you want to observe is downstream of a jsaction.
- **An unfocused tab throttles `setInterval` to ~1Hz**, which silently produced a
  4-sample "trace" I nearly read as a steady state. If a capture returns
  implausibly few frames, the tab lost focus — do not interpret the samples.

### The raised hand

| animation | target | dur | delay |
|---|---|---|---|
| `expandPill` | green background | 1000 | 0 |
| `popUpIconLargeTile` | icon wrapper + icon | 750 | 0 |
| `rotateIcon` | icon | 900 | 750 |
| `expandName` | label | 1000 | 0 |

All four `cubic-bezier(0.4, 0, 0.2, 1)`, all `fill: none`.

```
expandPill          0% scale(0)   ml 4px  w 24px
                 36.7% scale(1.1) ml 4px  w 24px
                   75% scale(1)   ml 4px  w 24px
                  100% none       ml 0    w 100%

popUpIconLargeTile  0% translateY(32px)
                   22% translateY(32px)
                48.93% translateY(-5px)
                  100% translateY(0)

rotateIcon          0% 0deg   20.33% 14deg   38.89% -9deg
                57.44% 14deg  74.11% -9deg   88.89% 5deg   100% 0

expandName       0,75% w 0     100% w 100%
```

`fill: none` is the load-bearing detail. Every keyframe set ends where the
resting style already is, so nothing needs holding — the animation plays and
stops existing. That is how the pill stays expanded with no `forwards` fill:
140px IS its base width. Verified by screenshotting 1s and 4s after a raise,
because an earlier reading of mine said it collapsed; that reading was the
throttled-tab artefact above, not the product.

The beat my earlier build was missing: **the hand waves.** `rotateIcon` fires the
moment the pill settles and swings six times, damped.

Geometry, settled: frame `140x35` `overflow: hidden`; pill `140x32` r16
`#6dd58c` on `#0a3818`; inset **left 8, bottom 8** from the tile (I had 16/15);
icon `front_hand` 16x16 centred at x17; label `96x24` at x32, 500 16px Google
Sans, 12px right padding. Width is content-driven — 32 + text + 12 — and
"Nam Nguyen" at 500 16px measures 96, which is where 140 comes from.

Our icon stays `back_hand`: the self-hosted symbols font is a fixed 7 kB subset
of 56 names and `front_hand` is not one of them, so asking for it would render
the literal string.

### The reactions tray

Tile bottom 815 · tray `758,827 360x40` · button tops 883. So **12px above the
tray, 16px below** — the numbers behind item 1. Tray `#282a2c` r36, nine 40x40
buttons on a 40 pitch with zero padding, skin-tone button a further 12px out.

Ours read 6 above and 22 below, and the asymmetry was not where it looked: both
offsets were 6px from the *bar*, but the bar's buttons are 48 tall centred in 80,
so 16px of bar sat under the tray. Sitting the tray's bottom edge on the bar's
top edge gives 16 to the buttons, and the tile's existing +52 gives the 12.

Meet's nine, as Noto Emoji codepoints rather than guesses from a screenshot:
`1f496` `1f44d` `1f389` `1f44f` `1f602` `1f62e` `1f622` `1f914` `1f44e`.

### The mic bubble

Card `386x127` `#3c4043` r8, MDC elevation-2 shadow, centred on the mic button,
22px above the button tops, tail 22x34 dead-centre.

```
enter   max-height 56px -> 125px   200ms  cubic-bezier(0, 0, 0.2, 1)
exit    opacity 1 -> 0             100ms  linear
```

That is the whole animation, and it explains what Nam described. The card is
anchored by its BOTTOM edge with `overflow: visible`, so growing max-height moves
the TOP edge up 69px in 200ms, and the close button pinned to that top edge rides
along — "the X going very fast from left to the top right corner". Nothing
travels left-to-right; the box grows upward and its furniture follows.

Behaviour verified, not assumed: the button's accessible name went "Turn off
microphone" → click the X → "Turn on microphone". **The close is the off switch.**

Ours measures 386x125 against their 386x127. The 2px is a 1px border in the same
colour as the card (their outer div is 386x127 around a 384x125 inner). Left
alone deliberately: matching it with a real border would trade an invisible 2px
of height for a visible 2px of content width.

### Bonus, not asked for but worth having

The mic button's own on/off morph, which settles a question from an earlier
round: `background-color` `#333537` → `#f9dedc` and `border-radius` `24px` →
`12px`, both **200ms `steps(6, jump-none)`**. A stepped, six-frame transition —
so the circle-to-squarish morph Nam described is deliberately chunky, not smooth.

The GM3 ripple, again from the live product: 450ms `cubic-bezier(0.2, 0, 0, 1)`,
a 9px dot translated from the pointer to the centre and scaled ~17x. Hover state
layer opacity 0.08–0.10, confirming the token values.

---

## Round 5 — the device rows, the level meter, the mute badge

### The `...` is one component wearing two faces

The best find of this round. Google's tile mute badge (`.JHK7jb`) and the control
bar's level meter (`.IisKdb`) **share their sizing rules** — `1.625em` normally,
`1.75em` under `.iPFm3e` (the 28px tile size) — and a state class swaps which
face shows: `.FTMc0c` hides the three-bar meter and reveals the crossed mic. So
an unmuted tile shows a *live meter* inside that same circle. One component, two
sizes, two states.

### The level meter is a sprite, not a keyframe

```
.IisKdb > .DwvCqe, .HPxjXe, .UBNDXc { width: .25em; height: 1em; background: url(data:image/png…) }
.IisKdb > .HPxjXe { margin-left: .125em; margin-right: .125em; animation-delay: .2s }
.IisKdb > .DwvCqe { animation-delay: .4s }
.IisKdb.gjg47c > * { animation-name: none; background-position-x: 0 }
```

Each bar is a `0.25em × 1em` window onto a PNG strip and the **level is a
`background-position-x` step** — five of them (`0`, `-0.3125`, `-0.625`,
`-0.9375`, `-1.25em`) with the middle bar reading a different set (`0`,
`-1.5625`, `-1.875`, `-2.1875`, `-2.5em`) so it never matches its neighbours.
Level classes in order: `gjg47c` (silent) → `OgVli` → `HX2H7` → `wEsLMd` →
`I8fSpb`/`Oaajhc`.

Bars measure 5px on a 6px pitch at x 15/21/27 inside a 20×20 slot. Idle is not a
slower wobble — it is `animation-name: none`, dead stop.

We rebuild the mechanism rather than ship the sprite: three drawn bars stepping
height, keeping the real 0.2s/0.4s stagger.

**Hover** is a plain `display` swap in that one slot — `display:none` on the
meter, `inline-block` on the `keyboard_arrow_up`. No crossfade.

### The settings rows

One shell, two fillings, both **576×56** at the same position, `#202124` r36:

```
audio   Mic not found 223x32 · Speaker not found 277x32 · gear 40x40
video   Permission needed 148x32 · Blur background 157x32 ·
        Backgrounds and effects 187x32 · gear 40x40
```

The chips **flex, they are not sized to content**. The audio pair sums to exactly
500 and the video trio to 492 — in both cases the 576 shell less its 20 of
insets, the 40 gear and the 8px gaps. The text only decides how the slack splits.

```
enter   max-width 56px -> 576px   200ms  cubic-bezier(0, 0, 0.2, 1)
        opacity   0 -> 1          100ms  linear
exit    opacity   1 -> 0          100ms  linear
```

Two behaviours worth recording. Opening a row **dismisses the mic bubble**, and
unlike the emoji tray the row **does not shrink the tile** — it floats over the
bottom 52px (tile stayed 748 tall with the row open).

Caret is `keyboard_arrow_up` collapsed, `keyboard_arrow_down` expanded, with
`aria-expanded` tracking it.

**One correction to the brief.** Nam described the motion as "going up and fading
in, going down and fading out". There is no translate on the row at all — what
reads as rising is the 56px seed opening to 576 while it fades. The up-and-fade
is the emoji tray's own entrance, which really is a 10px lift (Google's
`fadeInUp`: `translateY(0.625rem)` plus a fade). So the tray keeps the lift and
gains a symmetrical exit; the row gets the expansion it actually has.

### The mic device check

**535ms** from clicking the mic to the card appearing, timed on the live product.
Suspiciously close to the tooltip's 540ms cold delay — looks like one house number
for "long enough to read as thinking".

Also a refinement on the bubble: it grows from a **56px seed in both axes**
(`max-height 56→125` in one capture, `max-width 56→384` in another), not just
height.

### The mute badge

28×28 at inset 10/10 from the tile's top-right, `#002e69` fill, 18px glyph in
`#adc6ff`.

### Still on the shelf

`fadeOutPill` (`0% 1 · 87.5% 1 · 100% 0`) and `whitenName` (`#202124` + no shadow
→ `#fff` + `0 1px 2px rgba(0,0,0,.6), 0 0 2px rgba(0,0,0,.3)`) mean the raised-hand
pill **eventually fades out and its label whitens into the ordinary name plate**.
That reconciles the two readings from Round 4 — it holds, then hands over. The
delay before it fires is unmeasured, so it is not built.

`reaction-overlay-emoji-scuttle` (`0% -5deg · 25% -5deg · 75% 5deg · 100% 5deg`)
is the reaction wobble, and it is **±5° with holds**, where ours uses 7° and no
holds. Cheap fix next time reactions come up.

The mic button's own on/off morph: `background-color` `#333537` → `#f9dedc` and
`border-radius` `24px` → `12px`, both 200ms **`steps(6, jump-none)`**.

---

## Round 6 — the presenting top bar and the participant lists

### The raised-hand chip

Measured live at 1440×900: `125x36`, radius 48, `#80da88`, holding a 32×32
`#00381f` disc at inset 2 with `front_hand` at 20px, then the name at x36 in
500 12px Google Sans on `#00381f`.

**The green is not the tile pill's `#6dd58c`.** Two surfaces, two values. Reusing
one for both would have been the easy wrong answer.

Clicking the chip does not open a menu of its own — it opens the **People panel**.
The chip is a shortcut into the list.

### The People panel's two lists

Offsets relative to a 358-wide panel at `1065,73`, background `#1e1f20`:

```
header "People"   x24 y20    400 18px  #e3e3e3
close             x314 y20   40x40 r20
All muted         x19 y78    134x40 r20  bg #004a77
Add people        x182 y78   147x40 r20  bg #004a77
section label     x31        500 14px  #e8eaed
section caret     x303       keyboard_arrow_down
Lower all         x273       500 14px  #a8c7fa, button 82x40 r20 at x261
row avatar        x31        32x32 r50%
name / subtitle   x79        subtitle 500 12px #9aa0a6
row action        x299       40x40 r20   front_hand / more_vert
```

Contributors is deliberately inert on our side. Meet's row there offers mute and
an overflow that this page has nothing behind, and three buttons that lie is
worse than a label that does not pretend.

### The presenting bar — from screenshots, not measured

This one could not be captured. Presenting requires `getDisplayMedia`, whose
picker is **browser chrome rather than page DOM**, so there is no way to drive it
from automation and read the result back. Built from Nam's screenshots and
flagged in source.

What is not guesswork: the hover tint is M3's state layer at **0.08**, the same
token every other control on this page already uses, so it is a system value
rather than something eyeballed to match a picture.

### Two corrections

**The share was too wide.** Ours filled the stage and ran under the self tile.
It now reserves the tile's column (240 + 16 each side = 272), verified at a 16px
gap with the side panel both open and closed.

**The folder was too yellow.** `#ffd04b` is the flat brand yellow and against a
`#272727` pane it was the only thing the eye could find. Windows 11's own folder
is a desaturated amber with a lighter front and a cool document behind it — now
`#9c7530` / `#c2a05a` / `#c4cedb`, with the blue strip on the taskbar variant.

---

## Round 7 — the hover popups, and the top-right cluster

### One shell, two popups

Both hover panels are the same component in Google's hands:

```
surface  320 wide, radius 16, #282a2c
header   56 tall, title at 16,16 in 500 16px #e3e3e3
footer   a 256x40 action at x32, 500 14px #a8c7fa
```

**Raised hands** fills it with a 288×128 card on `#333537` r16 — a 40px
"Lower all" right-aligned, then a 64-tall row (avatar 40 at x16, name 500 14px at
x72, glyph 24 at x248). **People** fills it with a 288×56 `#a8c7fa` primary, a
pair of 140×40 outlined buttons at an 8px gap, the joined count, and the footer.

Same box, different filling — the third time that pattern has turned up, after
the device settings rows and the Explorer/Chrome windows.

### The row's glyph swaps, it does not gain a button

On row hover `front_hand` becomes **`cancel`** in the same 24×24 slot. Measured.
Nam described it as a Lower button appearing; functionally that is what it is,
but the implementation is a swap, and building it as an extra control would have
put two things in a slot that only ever holds one.

### The top-right cluster

Every element is identical: **36 tall, radius 48**, with **8px gaps**.

```
hand chip     1190,17  125x36  #80da88
people count  1323,17   57x36  #282a2c
Gemini pen    1388,17   36x36  #282a2c
```

Ours were 36 / 32 / 32 on a 4px gap, which is exactly the raggedness Nam saw. One
rule now sets all three rather than each carrying its own height.

### The People panel is for people

The career timeline moved out to its own `about` panel, reached from the
participant-count popup where the original offers "View everyone in this call".
Ours offers **"View more about Nam"** — Nam: "This is the part we start to inject
more about us into this CV."

### Windows, round 3

- **Wallpaper.** A radial glow is the abstract idea of Bloom, not a wallpaper.
  Now layered bezier ribbons curling out of the lower left with a bright core and
  a vignette — the shape of the shipped image, drawn rather than copied.
- **Chrome's mark** lost the white disc that read as a yellow plate at taskbar
  size. The real mark has no plate.
- **Per-tab favicons.** Every tab wore the browser's own mark, which is the one
  icon a tab never shows. Four marks for four pages.
- **Caption glyphs** were text at three unrelated optical sizes. Now drawn on one
  10px box with one stroke width, which is how Windows draws its own.
- **Tab switching** was broken because the old builder replaced the page node on
  every click while the strip kept stale closures. One page node, repainted.
- **Files open tabs.** Each file names a tab; clicking focuses an open Chrome or
  opens one. Single click, because on a drawn desktop the double-click
  convention only costs people the discovery.

---

## Round 8 — the yellow plates, the count button, two animations

### The yellow was a ghost

`.wx-bar-ico` and `.dk-task.is-on` both painted `#ffc83d`, and neither rule
belonged to the current design — they were survivors of the first-draft Explorer,
a light-theme window with a coloured square standing in for a folder icon. That
whole 96-line block had been superseded months of work ago and never deleted, so
two of its rules were quietly winning against the rebuilt ones.

Deleted rather than overridden. **Dead CSS is not inert** — it is a rule waiting
for a selector to match it again.

With the plate gone the folder could go back up toward Windows' real amber
(`#c98f22` / `#f2c04b` / `#dbe6f2`), which is what Nam actually wanted: a yellower
folder on no background, not a duller folder on a yellow one.

### The [hidden] trap, third time

`.hand-chip-wrap` declared `display: inline-flex`, the JS set `hidden = true`, and
the UA's `[hidden] { display: none }` lost. Same shape as the reactions tray and
the hand pill before it. Standing rule for this codebase: **if script hides it,
the stylesheet has to say so too**, written at the same moment the display is.

### The side panel slide

```
aside   transform: translateX(376px) -> none   500ms  cubic-bezier(0.4, 0, 0.2, 1)
stage   width: 1329px -> 1031px                500ms  same curve
```

The second half is the one that is easy to miss. Animate only the panel and the
stage snaps out from under it a frame early; it is the paired width transition
that makes it read as a push rather than an overlay.

### The end-screen countdown

A 56×56 ring at `20,20` in Google blue, the number inside at 14px/400, the label
beside it, ticking once a second (sampled 41 → 40 → 39).

Google draws the ring with a two-half rotating mask — its `fillWrapper`, `fill`
and `mask` keyframes flip `overflow` at the halfway mark so one rotating half-disc
can describe a full circle. Ours uses `stroke-dasharray` on an SVG instead: same
read, one animated property, and it cannot drift from the countdown because both
run off the same duration.

---

# Round 4: the right panel, and the tile's own controls

Analysis on a live call (bmf-stjd-suh) at 2560x1215. Every item below is either
measured there or explicitly marked otherwise.

## 1. The panel corners — a mis-attribution, twice

Measured: the rounded surface is the outer `<aside>` — **360x1063, radius 20px,
`#202124`**, `overflow: hidden`. Inside it sits a **358x1061 `#1e1f20`** box at
radius 0.

Our `.side` currently says `border-radius: 0` and `background-color: #1e1f20`,
with a comment citing "358x746, #1e1f20, radius 0". Both values came from
measuring the INNER box and attributing them to the panel. I made the same
mistake with the colour in an earlier round, so this is the second time the inner
container has been mistaken for the surface.

Fix: radius **20**. Keep `#1e1f20` as the fill, since the inner box covers all
but a 1px rim, and add that rim as a 1px `#202124` ring rather than nesting a
second element for one pixel.

## 2. The animation re-runs on everything

Cause found, and it is not the animation. `store.subscribe(() => { sync();
drawPanel(); })` fires on EVERY state change, and `drawPanel()` opens with
`clear(panelHost)` and rebuilds the `<aside>` from scratch. A new element means
`animation: side-in` runs again. Toggling the mic rebuilds the panel.

Measured on the live product, switching content with the panel open: the aside's
x stays 2184, `transform` stays `none`, and `document.getAnimations()` filtered
to that element returns **zero**. Meet does not animate a content change at all.

Fix: keep a reference to the mounted aside and the panel kind it is showing.

- closed -> open: build and append. Animation runs. This is the only case that animates.
- open -> different panel: swap the heading text and the body. Element stays, so
  nothing animates.
- open -> same panel, unrelated state change: swap the body only. No animation.
- open -> closed: remove.

Toggle-to-close already works — the reducer returns `'none'` when the dispatched
panel equals the current one, so a second press on the trigger closes it. Verified
on the live product too: one press on the lit chat button closed the panel and the
tile re-expanded. Nothing to change; QA it rather than touch it.

## 3. The tile menu renders light — a selector that cannot match

`attachMenu` puts `opts.cls` on the WRAPPER (`.gm-pop`), but the surface rule is
`.gm-menu.gm-dark`, which needs both classes on one element. `.gm-menu` is the
wrapper's child, so that rule never matches.

The other five dark rules are descendant selectors (`.gm-dark .gm-label` and so
on) and DO match. So the menu got dark-mode text on a light surface, which is
exactly the "light mode, unreadable" Nam reported. Five of six rules applied; the
one that sets the background did not.

Fix: `.gm-menu.gm-dark` -> `.gm-dark .gm-menu`, matching the other five.

## 4. The menu opens the wrong way

Ours passes `side: 'above'`. Nam's screenshot of the original shows it dropping
DOWNWARD from the control. Change to `'below'`.

## 5. The pill is solid and has no hover response

Measured: pill **128x44, `#202124`, radius 44**, and `transition: opacity 0.1s
linear`. With the cursor on the pill it reads **opacity 0.9**. With the tile not
hovered it is 0. Our width already matches (44 + 44 + 40 = 128) and so does the
fill and radius; what is missing is that it never drops below 1 and never
responds to hover.

- `opacity: 0` at rest, `transition: opacity .1s linear` — measured
- tile hovered: **0.72** — NOT MEASURED. The base visible opacity was never
  captured: the synthetic hover in a batched action does not persist, so the pill
  had already faded whenever the probe ran. 0.72 is chosen to leave the hover
  headroom Nam describes. Flag it in the source as chosen, not read.
- pill hovered: **0.9** — measured

## 6. The glyphs are the wrong set

Measured, left to right: `visual_effects` (44x44, r22, "Backgrounds and
effects"), a remove-tile control (44x44, r100, DISABLED — ink
`rgba(232,234,237,.38)`, tooltip "Can't remove your tile in this layout"), and
`more_vert` (40x40, r20).

Ours has Reframe, effects, more. So the middle control is wrong.

Substitutions, because the 7 kB subset lacks Meet's glyphs: `blur_on` for
effects — already what the lobby uses for the same control — and
`close_fullscreen` for remove-tile. Both flagged in source.

Keep it disabled with Meet's own tooltip. A control that cannot work should look
like it cannot work.

## Not attempted this round, and why

The pin work — pin glyph at the tile's bottom left, the taller frame when
presenting while pinned, and the pin marker in the People row — is from Nam's
screenshots only.

The live measurement stalled, and the reason is worth recording so the next
attempt does not repeat it. The menu itself is CLICK-opened, not hover-opened —
that part is straightforward. The problem is the pill it lives in: the pill only
exists while the tile is hovered, so reaching the `more_vert` button needs a
hover that persists until the click lands. A synthetic hover in a batched action
does not survive that long, so the pill had faded before the click arrived and
Pin was never reached.

Next time: drive hover and click as separate calls so the pointer genuinely
rests on the tile between them, or dispatch a real pointer sequence that holds
position. Building the pin work from screenshots alone would mean shipping a
feature without a single measured number, which is the thing this project
refuses to do.

## QA

1. Panel radius reads 20 and the rim is present.
2. Toggle the mic with a panel open: no animation, no rebuild.
3. Switch chat -> people: heading and body change, element identity does not.
4. Closed -> open: animation runs exactly once.
5. Second press on the trigger closes it.
6. Tile menu: dark surface, opens downward.
7. Pill: invisible at rest, partly transparent on tile hover, less so on pill hover.
8. `npm run verify` green.

---

# Round 5: polishing the tile's control pill

Analysed on a live call (gcp-vuep-yta) at 2560x1271. Three items are measured,
three are from Nam's screenshots, and the split is marked per item because the
hover state could not be reached this session.

## What could not be measured, and why

The pill never appeared under a synthetic hover this session — a zoom of the tile
centre after a held hover shows the avatar alone. Meet drives that pill from a
jsaction `mouseenter`, which wants a trusted event; our synthetic pointer fires
something the handler does not accept. It DID work in an earlier session on a
different call, which is how opacity 0.9 was captured, so this is flaky rather
than impossible.

Computed styles still read fine while hidden, because they do not depend on
layout. That is where the two headline values below come from.

## 1. The appear transition — measured

`transition: opacity 0.3s linear` on the pill while hidden.

Note the discrepancy with Round 4, which recorded 0.1s. Both are real reads at
different moments: 0.1s was read while the pill was visible, 0.3s while hidden.
The transition that governs a change is the one on the element when the change
BEGINS, so hidden -> visible is the 0.3s one. That is the appear, which is what
Nam is complaining about ("just pops up instantly"), so **0.3s is the value to
use**. The 0.1s reading is not wrong, it just governs the other direction.

Ours currently declares 0.1s for both. Change the base to 0.3s.

## 2. The soft glow — measured

```
box-shadow: rgba(0,0,0,.3) 0 1px 2px 0, rgba(0,0,0,.15) 0 1px 3px 1px
```

Two layers, which is GM3's elevation 1. This is Nam's "slight shadow/dark glow
around it so it looks much softer". We had none.

## 3. Opacity — one measured, one still chosen

- pill hovered: **0.9**, measured in the Round 4 session, and independently
  corroborated by Nam ("something like 90 or 95%, I can barely see my avatar
  through it").
- tile hovered but not the pill: **0.72**, still CHOSEN. Never captured. Left as
  is and still flagged in source. Nam's description does not pin it either.

## 4. The buttons have no hover response — cause found

`.solo-ctl` sets `--sl: #fff` but was never added to the shared state-layer
`::before` rule list, so there is no layer to raise. That is the whole of
"nothing has any hover effect whatsoever".

Fix: add `.solo-ctl` to the shared list, `--sl-hover: .08`. Nam calls it "a
subtle white tint", which is exactly what a white state layer at .08 is.

## 5. The glyphs — measured names, and a discovery

Measured left to right:

| control | glyph | radius | ink |
|---|---|---|---|
| Backgrounds and effects | `visual_effects` | 22 | `#e3e3e3` |
| middle | (icon font, no ligature name read) | 100 | `#fff` |
| More options for Nam Nguyen | `more_vert` | 20 | `#e3e3e3` |

**The middle control is context-dependent**, which Round 4 got wrong. In one call
it read "Can't remove your tile in this layout" and was DISABLED; in this call it
reads **"Show in a tile"** and is NOT disabled. Round 4 hard-coded the first as
permanent. It is a layout-dependent control, so ours should carry one honest
label rather than pretend to switch on a layout we do not have.

`more_vert` we already have right. The other two are not in the 7 kB subset, and
Round 4's substitutes (`blur_on`, `close_fullscreen`) are what Nam is calling
wrong. Author them as SVG paths in `dom.ts` instead — the same route `search` and
`block` took — rather than settling for a glyph that means something else.

## 6. The dropdown — from Nam's screenshot, not measured

The menu could not be opened (see above), so this is read off his screenshot of
the original. Marked as such in source.

- It lines up with `more_vert`. Ours passes `align: 'right'` and lands off to the
  side; the original's left edge sits under the button. Change to `'left'`.
- **Three items, not four.** The original has Minimize, Pin to the screen, Show
  my full video to others. Ours invents a fourth, "Remove this tile", which is
  also the one that overflows the surface.
- Wording: "to others", not "to everyone".
- **Minimize and Show my full video are disabled; Pin to the screen is not.** The
  disabled rows have no hover response, the live one does. Ours gives none of
  them any.
- Pin to the screen carries a submenu arrow.

`MenuItem` has no `disabled` field, so add one: skip the ripple, drop the state
layer, dim the ink, and set `aria-disabled`.

## QA

1. Pill fades in over 0.3s rather than popping.
2. Shadow present, two layers.
3. Pill 0.72 on tile hover, 0.9 on pill hover.
4. Each button takes a white tint at .08 on hover.
5. Three glyphs, two of them new SVG paths.
6. Menu: left-aligned to the button, three items, no overflow, two disabled rows
   with no hover and one live row with hover.
7. `npm run verify` green.

---

# Round 6 — the pinned state, and unpin

## Phase 1 findings that decided the design

Full measurements in `baseline-call.md`. The one that shaped everything:

> **Pinning changes no geometry.** Tile stayed `1889 × 1063`; with a panel open
> it still re-centred to x 147. Identical to unpinned.

So there is no "pinned layout" to build. There is a marker, and a 34px lead that
the rest of the bottom-left strip shifts by. That reduces the whole feature to
one boolean, two markers and one custom property — which is why this round is
small despite covering five combined states.

Second finding, and the answer to what Nam actually asked: **the pin survives a
raised hand.** The name plate is what gives way to the green badge; the pin does
not move. So the marker is driven by `pinned` alone and never consults
`handRaised`.

## Phase 2 — the plan, reviewed twice

1. `state.ts` — `pinned: boolean`, a `{ t: 'pin'; on }` action, reset on `leave`
   alongside `handRaised`. A CV should not remember a pin after you walk away.
2. `call.ts` — a `pinMark` element in the tile's bottom-left strip, `hidden`
   driven from `sync()`. `body.is-pinned` follows the existing `has-panel` /
   `tray-open` / `cc-on` pattern, so no tile reference has to be threaded around.
3. The menu's one live row toggles label and dispatches. Built inside the
   existing callback so it reads the store on each open rather than freezing.
4. `panels.ts` — a `showPin` parameter on `row()`, not a value derived inside it.
   With a hand up there are two rows for one person and **only the lower one is
   marked**, so the caller has to decide.
5. `styles.css` — `--pin-lead`, one number with two consumers.

**Reviewed twice, two things caught:**

- The `[hidden]` trap, for the fourth time in this file. `.solo-pin` needs
  `display: grid` to centre its glyph, which would beat the UA rule and the
  marker would never hide. Written as an explicit `[hidden] { display: none }`
  with a comment, rather than discovered again in QA.
- There was no visually-hidden utility in the codebase, and the first draft put
  an `aria-label` on the glyph span. Wrong shape: the glyph should be
  `aria-hidden` and a real `.sr-only` sentence should carry the meaning. Added
  the utility.

## Phase 3 — QA against the captured evidence

Driven on our own build at a 1010×568 tile (so every number is a rule check, not
a coincidence of matching viewports):

| rule | original | ours | |
|---|---|---|---|
| pin inset from tile left | 16 | `151 − 135 = 16` | ✓ |
| pin above tile bottom | 15 | `640 − 625 = 15` | ✓ |
| pin → name gap | 14 | `185 − 171 = 14` | ✓ |
| name lead when pinned | +34 | `151 → 185` | ✓ |
| badge lead when pinned | +34 | `143 → 177` | ✓ |
| pin → badge gap | 6 | `177 − 171 = 6` | ✓ |
| badge fill | `#6dd58c` | `rgb(109,213,140)` | ✓ |
| panel marker offset on avatar | +20/+20 | `1318−1298 / 345−325` | ✓ |
| panel marker | 15px `#e3e3e3` | 15px `rgb(227,227,227)` | ✓ |
| marked rows in panel | contributors only | 1 of 2 avatars | ✓ |
| tile size, pinned vs not | unchanged | `1010×568` both | ✓ |

Round trip: pinned → menu reads "Unpin" → click → marker hidden, name back to
16, badge back to 8, panel marker gone, tile untouched → menu reads "Pin to the
screen" → click → all three back. Both directions, verified by measurement.

Two corrections fell out of the live menu while it was open: the surface is
`#1e1f20` (we had the control bar's `#282a2c`) and it is **247** wide, not the
232 Round 4 read off a screenshot.

## Left deliberately undone

The **presenting layout** is now measured for the first time — share surface
`1587 × 787` radius 8 `#3c4043`, self tile `565 × 754` radius 24, portrait, and
the stage *re-centres* rather than shrinking for the tray and captions. Ours is a
full-bleed composition of its own, so adopting that two-column layout is a round
of its own. It is written down in `baseline-call.md` now, which means the gap is
a decision with a measurement behind it instead of an unknown.

---

# Round 8 — five items from Nam's overlay QA

Nam sent three screenshots (ours presenting, and Meet presenting with the People
and chat panels) and asked for them overlaid. The live call was still up, so
almost everything below is a live read rather than a screenshot estimate — the
first time the presenting surfaces have been measurable at all, because reaching
that state needs the native picker driven by hand.

## What the original actually does

| surface | measured |
|---|---|
| presenting pill | `678 × 46 @ 1630,4`; glyph `present_to_all` 24px `#e3e3e3`; label `500 14px/20px` Google Sans `#e3e3e3`; then a divider, `Presentation audio`, and a switch whose knob carries `volume_up` at 12px in `#d3e3fd` |
| side panel | `360 × 1015 @ 2184,64`, `#202124`, radius 20 — top and bottom shared with the stage |
| panel scroller | `358` outer / `350` client, so an **8px** gutter |
| own chat bubble | `#004a77`, radius `20px 20px 4px`, `#e3e3e3` at 14/20, right-aligned, capped 244 |
| chat info card | `#282a2c`, radius 8, padding 12, `#c4c7c5` at 12/16 |
| share surface | radius **8** on **`#3c4043`** |
| pinned self tile, panel open | `565 × 754 @ 1619,211` |
| pinned self tile, panel closed | `666 × 889 @ 1892,119` |

Two rules fall out of the last two rows, and they are what make this
implementable rather than two more magic numbers:

- `565/754 = 666/889 = 0.749`. The pinned tile is **aspect-locked 3:4 portrait**.
- It is **26.2%** of the stage in both cases (`666/2542`, `565/2152`), with the
  share taking the rest less a 16px gutter, and the tile's right edge flush with
  the stage's.

## The five, and what was actually wrong

1. **"font is very small, missing some info"** — the pill was `500 12px/12px`
   with an 18px glyph in `#a8c7fa`: two size misses and a colour. And it had no
   second half at all. Now 14/20, a 24px glyph in `#e3e3e3`, plus the divider,
   the label and the switch.
2. **"the right panel is way too short, the scrollbar is wrong"** — `.side`
   carried `height: 746px`, a pixel height read off a 1440×900 session. It could
   only ever be right at that one size: at 1280×720 it made the panel 26px
   **taller** than the window, and on Nam's 2560×1215 screen it stopped short.
   Replaced with the two insets the stage already uses, so the panel shares the
   stage's extent the way the measurement says it does.
3. **"wrong chat text color, should be an input"** — every bubble was painted in
   the neutral surface at radius `4px 16px 16px`, left-aligned, and there was no
   composer. Now own messages take the measured own-message side, the intro line
   becomes the measured info card, and there is a working field and send.
4. **"the pinned video frame is completely wrong… should be much bigger, pushing
   the screensharing frame smaller"** and **"the hand raised text is hiding the
   pinned icon"** — ours was a `240 × 135` landscape thumbnail that pinning did
   nothing to. Now 3:4 portrait at 26.2%. The overlap was a separate bug: the
   presenting overrides set a flat `left: 6px` on the hand pill that beat the
   `--pin-lead` calc outright.
5. **"no red stop sharing button on the bottom"** — removed. Confirmed against
   both screenshots: the only red bar in them is Chrome's own "Sharing … to this
   tab", which is browser chrome and not ours to draw. Nothing is orphaned,
   because `presStop` in the top bar has always called `stopShare()`.

## The bug that cost the most time

The pinned tile rule would not apply. It was in the built CSS, it matched, it had
the highest specificity of any matching rule, nothing after it overrode it, and
there was no `!important` anywhere — and the computed width stayed at the old
`872px`. Even an inline `width !important` was ignored, while an inline
`aspect-ratio !important` on the same element took effect immediately.

What settled it was building a twin: same class, same parent, same properties. It
laid out correctly at `228 × 305`. So the cascade was innocent and the element
was not — and `getAnimations()` on the real tile returned a live **`width`**
animation that never ended.

`body.presenting .solo` carries `transition: width .24s` for the thumbnail's
grow and shrink. Against a **percentage** width inside a `container-type: size`
parent it never settles, so the computed width sits at its old value forever and
the rule looks like it is losing a fight it is winning. `transition: none` on the
pinned rule fixes it, and Meet does not animate this change anyway.

Worth keeping as a diagnostic habit: when a rule that should win appears to lose,
check `getAnimations()` before re-reading the cascade. A stuck transition and a
lost specificity battle look identical from the computed style alone.

A smaller version of the same lesson in the scrollbar. Two measured false starts:
`scrollbar-width: thin` alongside `::-webkit-scrollbar` gives 10px, and
`scrollbar-color` alone gives 15px. Touching **either** standard property opts
Chrome into its own scrollbar and makes the webkit rules inert. Both are now
quarantined behind a support query only Firefox fails, and Chrome lands on 8.

## QA against the captured evidence

Driven on our build at 1280×720 — deliberately not Nam's viewport, so each row
is a rule holding rather than two screenshots happening to agree.

| rule | original | ours | |
|---|---|---|---|
| pinned tile aspect | 0.749 | 0.748 | ✓ |
| tile share of stage | 26.2% | 26.1% | ✓ |
| tile right edge | flush with stage | `888` = `888` | ✓ |
| share/tile gutter | 16 | 16 | ✓ |
| pin inset / above | 16 / 15 | 16 / 15 | ✓ |
| pin → hand pill gap | 6 | 6 | ✓ |
| panel height | = stage | `568` = `568` | ✓ |
| panel scroll gutter | 8 | 8 | ✓ |
| own bubble | `#004a77`, `20px 20px 4px`, max 244 | identical | ✓ |
| own bubble ink | `#e3e3e3` at 14/20 | identical | ✓ |
| info card | `#282a2c`, r8, p12, `#c4c7c5` 12/16 | identical | ✓ |
| share surface | radius 8, `#3c4043` | identical | ✓ |
| pill label | `500 14px/20px` | identical | ✓ |
| pill glyph | 24px `#e3e3e3` | identical | ✓ |
| bottom banner | none | removed | ✓ |

Composer checked behaviourally too: send is disabled until the field has content,
Enter and the button both post, and a posted message renders as a guest bubble on
the opposite side with the mirrored radius.

## Stated rather than dressed up

The switch's own track and the Stop presenting button's box are **matched to the
screenshot, not measured** — the call ended before I could read them. The switch
also gates nothing, because an authored HTML page has no audio track to share;
that is recorded in `state.ts` next to the flag rather than left for someone to
find out by clicking it.

## Round 9 — transient surfaces dismiss on action

Three reports from Nam, one underlying rule: **activating a control closes the
surface it lives on.** Ours left all of them up.

`.gm-menu` rows (pin, and unpin, which is the same row in its other face). The
row had no way to reach a close: `menu()` builds the list while `close()` lives
in `attachMenu`. Threaded through as an `onPicked` callback rather than reached
for through the DOM. Disabled rows deliberately dismiss nothing — a dead row
should not answer the pointer at all, and closing on one would read as the menu
accepting a choice it cannot act on.

`hoverPop` — the count chip's popup and the raised-hands popup, four or five
actions between them. Worse than the menu, because these are **hover**-driven:
the only close path was `pointerleave`, so the popup sat under a cursor that had
not moved, on top of the panel it had just opened. One handler on the container,
because "activating a control closes the popup" belongs to the popup rather than
to each button that happens to live in it. Focus is handed back to the chip when
the hidden subtree held it, so a keyboard user does not get dropped to the body.

Verified: pin and unpin both dismiss; Minimize (dead) does not; outside
pointerdown and Escape still close. In both popups every action dismisses and
still performs its job, and hover reopen is unaffected.

Two probe lessons, both mine:
- `document.body.click()` never closes these — the outside-click listener is on
  `pointerdown` with capture. A synthetic `click` misses it entirely, so that
  path has to be tested with a real `PointerEvent`.
- The first hands-popup check asserted `hidden === true` after a click without
  establishing it was `false` before, which proves nothing when the surface
  starts hidden. Re-run with the before-state asserted.

## Round 10 — the top pill, the share's centring, and a retraction

### The pill: I measured a wrapper, not the surface

`678 x 46 @ 1630,4` from last round is a WRAPPER. The painted pill is
**`654 x 36 @ 1775,14`, radius 18, `#282a2c`**, padding `0 0 0 12px`. So the
height was 10px too tall, the radius 5 too round, and the fill was the control
bar's `#333537` yet again.

That is Nam's "lopsided… the bottom padding is too small": a 46-tall pill next to
a 36-tall participant chip reads top-heavy. Inside the real pill everything is
symmetric — `Stop presenting` is `127 x 32` with **2px** clear above and below,
and the audio switch is `39 x 24` with **6px**. Ours now matches both.

Also measured: the button's text reports as `13.33px Arial`, i.e. the UA default
with no font set on it at all, and its 127px includes a leading
`cancel_presentation` glyph the 7 kB subset does not carry. The font ships
pre-subset, so that glyph is deliberately left out.

Standing habit, third time now: **walk up to whatever actually paints before
trusting a rect.** Same mistake as the panel radius (measured the lining) and the
dark menu surface.

### The share is centred, and the tile floats over it

Nam had this before I measured it: "the screensharing is centered on the space
that is left after we exclude the right panel… The minimized video tile is fixed
to the right side at a certain padding, so when we show the right panel, it only
pushes the video tile to the left, keeping the same right-padding. This is what
ends up creating that overlap."

Confirmed unpinned at 2560×1215: share video `2047 × 1017 @ 61,63` centred in the
`0..2184` left of the panel, tile `235 × 132 @ 1917,931` with its right edge at
2152 — and **191px of overlap**. Ours reserved a 272px column so the share shrank
instead. The tile's position was already right; the share was wrong.

Verified after: right gap 16 in both panel states, tile moves left by exactly the
336 the stage loses, share fills the stage, 251px overlap. The pinned state keeps
its own genuinely two-column reservation.

### Retraction: the "stuck width transition" was my test rig

Last round I diagnosed a width transition that "never settles against a
percentage width inside a `container-type: size` parent", wrote it into a comment
and a commit message as a standing lesson, and removed the transition.

**That cause was wrong.** This QA pane runs with `document.visibilityState ===
"hidden"`, and `document.timeline.currentTime` is **0** while `performance.now()`
is 91 seconds. The timeline has never advanced, so *no* transition or animation
ever completes here — every animated property sits frozen at its `from` value.
The twin element laid out correctly only because it had no transition to be
frozen in.

So `transition: none` was a workaround for the harness, not a product fix, and it
has been reverted. The real bug behind Nam's original report stands on its own:
there was no `body.presenting.is-pinned .solo` rule at all, so pinning while
presenting did nothing.

**How to QA animated layout in this pane:** call
`document.getAnimations().forEach(a => a.finish())` before reading geometry. Doing
that turned the frozen stage/panel numbers into the real settled layout
immediately — and confirmed both presenting layouts are correct with the
transitions left in place.

The wider lesson replaces the one I wrote last round: a live entry in
`getAnimations()` does **not** imply a broken transition. Check whether the
document timeline is running at all first.

## Round 11 — the composer has to be outside the scrollport

Nam: "the send message in the chat panel has solid background so you dont see the
text as you scroll past it. in our version we do."

Ours had the composer `position: sticky` inside `.side-body` — the element that
scrolls. A sticky footer still lives in the scrolling box, so messages travelled
through that container's 24px side and bottom padding and showed up around and
below the field. No background on the composer could ever cover it, because the
gap was outside the composer's own box. Reaching for a bigger background would
have been treating the symptom.

The original does it structurally, and the earlier panel measurement already
proved it without my noticing: the scroller is `358 x 869 @ 2185,129`, ending at
998, while the panel runs to 1079. That 81px is a strip the list cannot reach.

So `.side-body` stops scrolling for this panel, `.msg-list` becomes the scroller,
and the composer is its sibling rather than its child. `:has(.msg-wrap)` rather
than a new class, because `drawPanel` builds `.side-body` generically for all
seven panels and chat is the only one that needs to own its vertical layout. The
8px scrollbar gutter follows the scrollport to its new owner.

Verified: `.side-body` no longer scrolls, the list does, gutter 8, strip 80
against the measured 81, composer flush to the panel's bottom edge at full width,
and the list's box ends exactly where the composer begins — so nothing can show
through rather than merely being painted over.

## Round 12 — the dismissal that dismissed and then undid itself

Nam, reporting the same bug a second time: "clicking view more about nam still
doesnt also auto close that hover panel. I reported this bug earlier."

Round 9's fix was real but incomplete, and the incompleteness was mine: the
focus-restoration I added *re-opened the popup it had just closed*.

`open` is bound to `focusin`. `dismiss()` hides the popup, then hands focus back
to the chip so a keyboard user is not dropped to the body. But `focus()` fires
`focusin` **synchronously**, and the chip lives inside `host` — so the restore
immediately undid the hide. Guarded with a `restoring` flag that `open` checks.

**Why the Round 9 test passed a broken fix.** Clicking a real button focuses it,
so `pop.contains(document.activeElement)` is true and the restore branch runs. A
synthetic `.click()` moves no focus at all, so the probe took the
`hadFocus === false` path — the one branch where the bug cannot occur — and
reported green.

That is the second false pass from a synthetic event this session, after
`document.body.click()` never reaching a `pointerdown` listener. Both share a
shape worth naming: **`.click()` is not a click.** It dispatches one event and
skips everything the browser does around it — focus, pointerdown/up, default
scroll behaviour. When the code under test reacts to any of those, drive them
explicitly or the test exercises a path the user never takes.

Re-tested with `btn.focus(); btn.click()`, which reproduces the real ordering.
All four actions across both popups dismiss and still perform their job, focus
lands on the chip without re-opening, and hover reopen is unaffected.

## Round 13 — the composer frame

Three claims from Nam, all three measured on the live composer rather than taken
on trust:

```
frame  328 x 50 @ 2200,1013   TRANSPARENT, 1px solid #444746, radius 25
send    48 x 48 @ 2479,1014   INSIDE the frame, transparent, #a8c7fa, radius 24
field  278 x 24               transparent, padding 0 16px
```

Ours had the send button as a **sibling** of the field, so it sat outside the
frame; painted the field itself with `#333537` rather than using a bordered
frame; and put `outline: 2px solid #a8c7fa` on focus.

**The focus ring is measured, not inferred.** I read the frame focused and
blurred: every property identical — same 1px `#444746`, no box-shadow, textarea
outline `none`. So there genuinely is no focus treatment. The caret is the
indicator, which is why dropping the ring is acceptable on a text field in a way
it would not be on a button.

The geometry also cross-checks against last round: the frame sits 15px below the
list, 16px above the panel's bottom and 16px in from each side, which reconstructs
the 81px strip measured independently from the scrollport. Two readings taken for
different reasons agreeing is the useful part.

Verified on ours: frame `328 x 50` transparent radius 25 with the same 1px
`#444746`, field `278 x 24` at padding `0 16px`, send `48 x 48` radius 24 fully
inside the frame's box, side insets 16/16, gaps 15 above and 16 below, and
focusing changes nothing. Send is `#5f6368` and disabled while empty, `#a8c7fa`
and live once there is text — the same ink the original showed with text in it.

## Round 14 — closing the panel closes the panel

Nam: open About, then Chat, then hit close — "I only close the chat panel, but the
more about nam panel is still up!? … The right panel is contextual… Closing the
right panel is closing right panel - not closing it onto another right panel that
is still open underneath."

There was never a second panel underneath. There is one `panel` value in the
store and one aside in the DOM. What happened is that **close switched panels
instead of closing.**

The close button dispatched `{ t: 'panel', panel: s.panel }`, leaning on the
reducer's toggle — and `s` is captured from the render that first *mounted* the
aside. Round 4's re-animation fix deliberately keeps that element alive and swaps
only the heading and body, so the handler kept pointing at whichever panel opened
first. With About opened first and Chat showing, close dispatched
`{panel:'about'}` against a state of `'chat'`, and
`s.panel === a.panel ? 'none' : a.panel` resolved to **'about'**.

So the panel-reuse optimisation and the toggle-based close were each fine alone
and wrong together. Fixed by making close unconditional — `panel: 'none'`. A close
button has no business consulting the current panel; the toggle belongs to the bar
controls, where clicking People while People is open should close it.

The same staleness had a quieter victim: the close button's `aria-label` was baked
in at mount, so it still announced "Close More about Nam" while the chat was
showing. Now refreshed alongside the heading.

Verified: About → Chat → close leaves no aside and no `has-panel`; the button's
accessible name tracks the content; and the bar controls still toggle.

## Round 15 — sending a message actually shows it

Nam: "typing the chat and sending doesnt do anything on our site. I would like to
still add the message to the chat as if we have sent it, but of course if you
refresh the site those messages will be gone. It adds to the illusion."

It was already being added. Nobody could see it: the bubble landed **1813px down
a 423px-tall scrollport** with `scrollTop` still at 0. So the panel looked inert
while working correctly — a send that produces no visible change is
indistinguishable from a dead button, which is the actual defect.

Fixed by bringing the new bubble to the bottom of the scrollport. Computed
against the list rather than `scrollIntoView`, which is free to scroll ancestors
too. Also timestamped `HH:MM` to match the messages beside it — `clock()` in
state.ts returns "2:47 PM", which is right for the top-bar clock and wrong next
to a column of "09:00".

Nothing is persisted, which is the intended behaviour rather than a shortcut: a
reload restores the cover letter exactly as authored.

No auto-reply from Nam. It was tempting, and it would be inventing a conversation
the CV does not claim to have had.

Verified: both the button and Enter add a visible bubble, labelled `You  HH:MM`,
inserted before the Transcript heading so several sends stack in order; the field
clears and send re-disables each time; and a whitespace-only send does nothing.

## Round 16 — the small tile becomes a real tile

Nam audited the centre control across all three tile states and found it on 2/3,
then discovered two more behaviours by accident.

### The control belongs on every state

MEASURED with a real hover: the pill is `128 x 44 @ 2347,975` on a `235 x 132`
tile at `2293,931` — **dead centre** (both centres land on 2411/997) and **not
scaled down**. Same `#202124`, same radius 44, same 44 + 44 + 40 = 128 as the
full-stage tile, at opacity .9.

Ours hid it with `body.presenting .solo-ctl { display: none }`, and last round's
pinned rule only put it back for the pinned case. Since the pill is already
centred on `.solo`, the fix was a deletion rather than any new geometry.

Nam also explained why it had been so hard to reach: it triggers on **mouse
enter**, not on position, so the pointer has to travel from outside the tile to
inside. A single hover to the centre never fires it; two hovers do.

### Minimize is context-dependent

MEASURED, and this contradicts what we had: on the full-stage tile the row
reports `aria-disabled=true`, but on the small tile while presenting unpinned it
is **live**, with only "Show my full video to others" dead. We had it permanently
dead. It now mirrors the original's own condition.

The collapsed bar: `208 x 36`, **`#4a4e51`**, radius 8, sharing the tile's exact
bottom-right corner (right edge 2528, bottom 1063 — identical to the `235 x 132`
tile it replaces, so it collapses in place). Inside: a level glyph,
`videocam_off`, the name at `500 14px/20px` white, then Expand at `32 x 32`
carrying `open_in_full` at 20px. `open_in_full` is not in the 7 kB subset — it has
`close_fullscreen` but not its counterpart — so that one is an authored path
beside `send`.

### Drag, and latch to a corner

MEASURED off the tile's own style rather than the gesture: absolutely positioned
in the stage with concrete `left`/`right`/`top`/`bottom` at a **16px** inset, and
a transition of `bottom .3s cubic-bezier(0.4, 0, 0.2, 1)` plus
`left .3s cubic-bezier(0.4, 0, 0.2, 1)`.

Both axes animated — that is the latch. The offsets are real numbers, never
`auto`, which matters: `auto` does not interpolate, so a rule flipping between
`left: auto` and `left: 16px` could not produce that transition. Ours therefore
drives numeric left/top from script.

**Honest limit:** `left_click_drag` could not reproduce the gesture — it presses,
jumps and releases without the intermediate pointermove events the handler needs.
Nam confirmed the same thing from the other side ("make sure to move the mouse in
instead of just poping the mouse up at the exact location"). So the corners, the
inset and the easing are read off the computed style; the *feel* of the drag is
not measured.

### The invented transition that broke the placement

`body.presenting .solo` carried `transition: width .24s, height .24s`. The
original's list is `bottom`/`left` — it animates **position, never size** — so
ours was invented.

It also broke the corner maths: `place()` reads `offsetWidth` for the right-hand
inset, and mid-transition that still reported the old full-stage 872, so
`872 - 872 - 16` clamped to 16 and the tile opened bottom-**left**. Removing it
makes the size correct on the frame the class lands. Note this is a *different*
justification from Round 10's retracted removal — that one was a frozen-timeline
artefact; this one is a measurement plus a reproducible off-by-a-corner.

### QA

Initial corner bottom-right at 16/16. All four corners snap to exactly 16px on
both axes. Menu rows match the original's small-tile state (Minimize live, Pin
live, full-video dead). Minimized bar `208 x 36` `#4a4e51` radius 8 with the menu
auto-closing; Expand restores `235 x 132` **in the same corner**. A press on the
control pill does not drag; a press on the bare tile does.

Third synthetic-event lesson, and the same shape as the previous two. Two probes
were invalid before they were right: one dispatched pointerdown on the tile so
`e.target` was never the button the guard checks, and one snapshotted the tile
mid-frozen-transition so a completing snap read as a drag. Settle animations
first, and dispatch on the element a user would actually hit.

## Round 17 — reactions are clipped at the stage's bottom

Nam: "there is a cut off below which you dont see any emojis. We dont have this."

MEASURED by firing a burst on the live product and reading the screenshot, since
reactions are not in the DOM at all — no added nodes, no canvas, no shadow roots
— so a screenshot is the only instrument. An emoji sat sliced in half at **y 662
of a 745-tall shot, about 1080 CSS**, which is exactly where the shared surface's
bottom edge lands. The boundary is the stage's bottom, not the viewport's.

Ours had no clip. Reactions were appended to `layer`, an unstyled div directly
inside `.call`, so `bottom: 55px` measured up from the **viewport** and the emojis
carried on below the shared surface into the dark band under it — exactly what
Nam's second screenshot shows.

Two constraints decided where the clip could live:

- not on `layer`, which also carries menus and toasts and would clip those;
- not inside `.grid-wrap` either, because the band is anchored to the call area's
  left edge at x 73 rather than the stage's, so nesting it there would shift every
  reaction sideways by the stage's left inset.

So: a full-width layer, clipped along the bottom only, tracking the same tray and
caption reservations the stage uses. The measurement supports that — the burst was
fired with the tray open, and `1215 − (80 + 52) = 1083` against a measured ~1080.

Moving reactions into it also corrects their anchor as a side effect: they now
spawn 55px above the **stage's** bottom rather than the viewport's, which is what
the baseline recorded in the first place.

Verified with animations settled across every reservation combination — plain 640,
tray open 588, captions on 424, tray plus captions 372 — the clip's bottom edge
equals the stage's bottom in all four.

Fourth time the frozen timeline produced a false reading: the first pass showed
the clip and stage disagreeing with the tray closed, purely because the stage
transitions its insets and was mid-flight. `document.getAnimations().forEach(a =>
a.finish())` before every geometry read should now be reflexive in this pane.

## Round 18 — the tile menu flips per corner

Nam: "our dropdown option is overflowing here into the corner of the screen…
they relocate the dropdown to the empty space such that its not running off
screen. So on bottom right, the dropdown expands to the top left, aligning to the
right of the more_vert button."

MEASURED on that corner: menu `247 x 160 @ 2228,817` against a more_vert at
`2435,977`. The menu's right edge is flush with the button's right edge (delta
**0**) and its bottom edge sits exactly on the button's top edge (delta **0**).
So `align: right` + `side: above`, both flush, no nudge. The other three follow by
symmetry, which is what the four screenshots show:

```
tl -> below / left      tr -> below / right
bl -> above / left      br -> above / right
```

`attachMenu` could not express this. It read `align` and `side` **once at attach
time**, so whichever placement was right when the call first rendered was frozen
in for the session — harmless before the tile could move, useless now it can be
dragged between corners. It now takes a function for its options and resolves
them on every open, which also makes the option set consistent: `cls`, `width`,
`dx` and `dy` were already read at open time; `align` and `side` were the odd ones
out.

Only the free-floating small tile needs the flip. The full-stage and pinned tiles
centre their pill in a large box where below/left already fits.

Verified by dragging between all four corners and reading the placement each
time: tl left/below flush at 0, tr right/below, bl left/above, br right/above —
`br` reproducing the original's measured pair of zeroes — and the menu's box
entirely inside the viewport in every one.

## Round 19 — reactions are born below the line

Nam: "we are now emitting them all above the cut line, but thats not the case in
the original meet. The emojis are emitted below the cut line, they are just not
visible below that line."

Right — and I had the evidence for this last round and let it pass. My own capture
of the original shows an emoji sliced almost in half **at** the boundary with only
its top few pixels showing, which is only possible if it was already alive
underneath and rising through. I wrote that observation down, added the clip, and
still left the spawn above the line. So the boundary existed and nothing ever
crossed it.

Spawn is now `-88px`, clearing the whole 81px group (53px emoji plus trailing
chip). The 88 is **added** to the travel rather than taken out of it, so the top of
the arc is unchanged. The fade keyframe sits at 85% of the animation, so the longer
travel moves the fade's absolute position down by `0.15 × 88 = 13px` — worth
stating, because the fade was measured at a screen *position* rather than a
fraction of the life.

### Three `bottom` declarations, and only the last one counts

Getting the value to apply took three passes through the cascade. `.reaction`
carries a `bottom` in three places, each from a different round of QA: the base
rule, the "Reactions rewrite" block, and a later correction. **The last one wins**,
so editing the base rule did nothing; removing that one just handed the win to the
middle one. Both live declarations now say `-88px`, so no future ordering accident
can quietly reinstate a positive spawn.

The superseded derivation is left in place with its workings rather than deleted:
"Meet starts with the EMOJI's bottom flush on the tile's bottom edge (820) …
900 − 81 − 766 = 53". That put the entire group above the line, and it was taken in
the **non-presenting** state against a tile bottom of 820 in a 900 viewport — a
different edge from the stage bottom the clip actually uses. A superseded
measurement with its reasoning visible is more useful than a silent replacement.

Verified by driving the animation frame by frame: born fully below the line with
7px clear, first sliver visible at 76ms (2% of life), fully above the line by
680ms (15%), arc ending where it did before.

## Round 20 — the mocked OS

Nam listed seven things. **Three needed building; four already worked** — worth
recording so a later round does not rebuild them.

### Already working (verified by driving Entire Screen mode)

Explorer maximize / unmaximize / minimize / restore-from-taskbar; Chrome
minimize / maximize / close; tab switching (strip highlights, page repaints); and
a file click opening Chrome on the right tab.

Why it may have looked broken: in **Window** mode minimize and maximize are
deliberately absent and close ends the share — Nam's own earlier request, since a
window you can minimise with no taskbar to minimise it *to* is a dead end. Only
**Entire Screen** carries the full desktop.

### Not selectable

Nam's screenshot has "Nam Nguyen" highlighted blue in the Start menu, which is
the tell: a real screen share is a video stream, so there is nothing to select.
Ours was real DOM and behaved like it. `user-select: none` across the shared
surface, with the rename field exempted — an input you cannot select inside is an
input you cannot correct.

### Folder navigation

The tree was four static rows with no handlers; the folders were decoration. Now
Real-time client, Tools, This CV and Hobby all open, from the tree **or** the file
list, with the breadcrumb, item count and tree highlight following. The
breadcrumb's `Work` segment is the way back out, since this layout has no Back
button. "Off the clock" is "Hobby".

### Files

`requirement-map.md` and `measured-spec.md` are gone. They opened the work and
riichi tabs, which had nothing to do with either name — exactly the dead
affordance this project keeps deleting.

The rule is now **nothing is listed that cannot be opened**. Every file names one
of the four pages the emulated Chrome already serves, so the listing cannot drift
from what exists. Hobby holds the mahjong client, which is the honest link rather
than filler: the hobby is what became the product.

| folder | contents |
|---|---|
| Work | the four folders + `NamNguyen_CV_2026.pdf` |
| Real-time client | `Riichi Mahjong client.url`, `Four things I built.url` |
| Tools | `Four things I built.url` |
| This CV | `NamNguyen_CV_2026.pdf`, `Google Careers posting.url` |
| Hobby | `Riichi Mahjong client.url` |

Verified: into all four folders with correct contents, crumb, singular/plural
count and tree highlight; back out via the crumb with the highlight clearing;
navigation from the file list as well as the tree; the CV pdf opening the CV tab;
a `.url` inside Hobby opening the riichi tab.

## Round 21 — resizing, tab management, real pages, and the clips

### Resizing

Eight handles per window. The **north and west** edges move the origin as well as
the size, which is the part a naive version gets wrong — drag the left edge and
the right edge must stay put. Clamped to `340 × 200`; handles hidden while
maximised.

Verified: SE grows `720×406 → 820×466`; the W edge shrinks width while holding
the right edge **exactly**; a large inward drag clamps at `340×200`.

### Tab management

Before this the strip was the picker's four sources permanently, and each tab
painted a stub paragraph reading *"one of the four sources the picker offers"* —
a dead end dressed as content, and the weakest thing on the desktop.

Now: every tab closes, `+` opens one, closing the last tab closes the window as
Chrome does, and a tab renders its **real** page. Opening a file creates a tab if
that page has none — which is what lets Tools and Hobby have their own pages
without inventing two more "already open" tabs in the picker. A `DOCS` registry
holds everything openable, keyed by the id a file carries; `TABS` stays the four
that are already open.

### Extensions and clips

Nam: "what the heck is that .url?" Fair — a Windows shortcut stub nobody
recognises on sight. Now `.pdf` and `.html`, plus the six easter-egg clips as
`.mp4` in Hobby: the real files in `docs/media` described by `src/data/eggs.ts`,
with their real posters and captions, muted with controls on. Finding a clip
through the fake Explorer and through the calendar now land on identical content.

### Window mode

Gets **Maximize**. Minimize still does not — with no taskbar there is nowhere to
restore from.

### The bug I introduced and fixed

Window mode routes file clicks to the host app's `openDoc`, which knew only two
legacy ids — so every new id (`tools`, `hobby`, `vid:*`) fell through to the
Engineering panel's **network** tab. A file click that opened a graph of packet
loss. Mapped explicitly now, defaulting to the plain document view.

Honest limitation recorded beside it: sharing a single window and opening a file
is a case where a real viewer would see nothing at all, because the browser is
not the window being captured. Routing to the host app is the useful lie; the
alternative is a dead row.
