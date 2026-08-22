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
