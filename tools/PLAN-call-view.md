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
