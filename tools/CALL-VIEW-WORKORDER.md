# Work order: the in-call view

Nam's batch, opened 2026-08-21. **Nothing here is measured yet.** This file is a
shopping list for the measurement pass, deliberately carrying no numbers — the
discipline of this project is that numbers come off the live product, and a
plausible guess written down here gets read as a measurement three sessions
later. Fill each `MEASURE:` line during the sweep, then build. Delete a line
only when a real value sits next to it.

## What this batch is actually for

Seven of the eight items below are faithful cloning. Two are not, and they are
the point: the reactions and the raised hand are where Nam's own ideas show.
His framing, and it should shape how they are built —

> so far there hasn't been a lot of creativity in this clone, we are just purely
> copying with dedication, but I want to show them I have my own ideas too. It
> started with the emojis then escalate to the raise hand.

So the clone earns the trust and the two deviations spend it. Build them in that
order and let the second one land harder than the first.

## Ground rules for the sweep

Screenshot **every** state, before and after **every** interaction — click and
hover both. Nam wants these as the QA benchmark to check our build against, so a
state with no screenshot is a state nobody can verify later. When an interaction
spawns new UI, work that new surface the same way and screenshot it too, and
keep cascading until nothing new appears. Menus, trays, tooltips, panels,
pickers, hover states on things that only exist after a click.

Record for each surface: bounding box, fill, radius, shadow, padding, gaps, type
(size/line-height/weight/family), ink, transition property and duration and
easing, and the ARIA role and state attributes.

Three traps already found — do not spend time rediscovering them:

- **Companion mode.** `Use Companion mode` sits directly beneath `Join now` in
  the green room's option list and is easy to mis-hit. It loads a different
  screen: no video frame, reduced control bar. If the call has no tile, this is
  why. Hang up and rejoin.
- **The join button.** Clicking it by element ref focused it without pressing
  it. Click by coordinate, and confirm the tile has appeared before measuring.
- **One session holds the call.** If Meet offers `Switch here` rather than
  `Join now`, Nam is in the call from somewhere else and joining will boot him.
  Ask before taking it.

Keep mic and camera off throughout. Never press a control that reaches a real
person.

## 1. Reactions — clone the mechanic, our own set

Ours spawn in too narrow a band and carry no attribution, so you cannot tell who
reacted. Nam's reference shows them scattered across most of the tile width with
a name chip under each.

- MEASURE: spawn region as a fraction of the tile — x range and y range
- MEASURE: the attribution chip — size, radius, fill, ink, type, offset from the
  emoji, and what it reads when the reactor is you
- MEASURE: emoji size, drift path, duration, easing, fade
- MEASURE: several at once — do they avoid each other, or overlap freely
- OURS: the mechanic is Meet's, the set is Nam's. Agree the set with him.

## 2. The in-call messages panel

Ours is clipped on the side. Suspect the panel's own width, or a flex child
missing `min-width: 0`, rather than the scroller itself.

- MEASURE: panel width, inset from top, gap to the tile, internal padding
- MEASURE: whether the tile is resized by the panel or overlaid by it
- MEASURE: message rows — bubble fill, radius, max width, author line

## 3. The reactions tray shrinks the frame

Pressing the reactions button opens a tray AND resizes the video frame. Ours
does neither.

- MEASURE: tile geometry before and after, so the resize is exact
- MEASURE: the tray — height, fill, radius, position relative to the bar
- MEASURE: the emoji set in order, plus the paging arrows either side
- MEASURE: the transition — property, duration, easing

## 4. CC shrinks the frame

Same shape of change as 3, different trigger.

- MEASURE: tile geometry before and after
- MEASURE: the caption area — position, type, fill, how lines roll
- MEASURE: the language chip, bottom-left in Nam's reference

## 5. Screen share — the augmented one. The gold mine.

**Read this before assuming the shape of the job.** An earlier pass got this
wrong and called it out of scope. It is not.

We are not restyling Chrome's picker, and we are not launching a real share. We
are building **our own mockup that looks like the browser's share dialog** and
is entirely fake — every tab, window and screen it offers is content we author,
presented as though the browser rendered it. Nam's word for it is a gold mine,
and the reason is exactly that: full control over what a recruiter sees on the
"shared screen".

Which means the real feature must be analysed and recorded **in full**, the same
as any other clone target, and all of that behaviour brought across:

- MEASURE: the picker dialog — the three tabs (Chrome Tab / Window / Entire
  Screen), the entry rows with their favicons and titles, the selected state,
  the preview pane, the "Also share tab audio" toggle, the Share and Cancel
  buttons. Nam has already sent a reference screenshot of this dialog; measure
  it live as well.
- MEASURE: what changes in the call once a share is live — the tile layout, the
  presenting banner, the stop-sharing affordance, what the control bar does.
- MEASURE: hover and selected states on every row and tab.

Then the content behind it, which is ours:

- The Chrome Tab list offers the real things in iframes — the mahjong client,
  the tools, the CV, the job ad with the boxes ticked.
- Window and Entire Screen offer a light simulated machine: mostly empty,
  holding only what is relevant — a trash can, the CV as a PDF, and a folder
  tree of the work plus one folder for Off the clock.
- Lean on existing open-source work for the desktop shell rather than building
  one from nothing, and keep it light. The bundle budget is enforced in CI and
  this screen must be a deferred chunk.

- OPEN QUESTION for Nam: whether this earns a folder tree AND a PDF viewer AND a
  trash can AND live iframes, or whether one convincing window beats four thin
  ones. My read is the folder tree with real iframe tabs carries nearly all the
  value and the trash can is set dressing. His call, and it sets the size.

## 6. Raise hand — the jump scare

Nam wants this to break the illusion: every other control behaves, and this one
is a slap on the screen, with an achievement behind it. Escalating from the
reactions set — first sign of a hand, then this.

- No measurement needed. This is ours.
- Nam is fine-tuning how hard it lands, so build the intensity as one tunable
  value rather than baking it in.
- Nam has explicitly ruled out a reduced-motion carve-out. Don't reopen it.
- One fact the next agent needs, not an argument: `src/a11y.ts` runs a live
  audit that is displayed inside the app, in Meeting tools -> the audit panel,
  and it is allowed to fail in public. Two of its assertions bear on this —
  reduced motion honoured, and nothing flashing above 3 Hz. If the scare trips
  one, the app will say so on its own screen. Tell Nam what it reports and let
  him decide; that panel failing honestly is more in keeping with this project
  than quietly weakening the joke.

## 7. Picture-in-picture

Meet uses document PiP, so it is real DOM in a separate window.

- MEASURE: at PiP size — the tile, the reaction strip and its paging arrows, the
  reduced control bar (which controls survive, and in what order)
- MEASURE: behaviour at the window's smallest size

## 8. Everything else in the call

Sweep the rest: every control in the bar, both panels, and whatever each one
opens. Click and hover all of it, cascade into what appears, screenshot
throughout.

---

## Status after the 2026-08-21 evening session

**The live measurement pass did not happen.** Three separate failure modes, all
worth knowing before the next attempt:

1. `Use Companion mode` was hit twice instead of `Join now`. It is directly
   beneath it and the green room reflows while the join is pending, so a
   coordinate captured from a screenshot can be stale by the time it is clicked.
2. `javascript_tool` on the Chrome MCP returns `{}` for any async IIFE that
   awaits more than briefly. Use synchronous expressions and poll across
   separate calls instead.
3. The third join stalled in a pending state — button greyed, never entered the
   call, no error.

**Reliable recipe for next time:** navigate to the meeting URL, then in ONE
synchronous call do `[...document.querySelectorAll('button')].find(b =>
/^Join now$/.test(b.textContent.trim())).click()`. Then poll with separate
synchronous calls until a `Leave call` button exists. Do not click any
coordinates after the JS click — that is what landed in Companion mode both
times, because the JS click had already worked.

### One contradiction to resolve first

`src/ui/call.ts` documents the reaction spawn as measured: a randomised band
about **130px wide at the tile's bottom-left**, with the name chip pinned at a
fixed x. Nam's spam screenshot flatly contradicts it — emoji across most of the
tile's width at many different heights, with a `You` chip under most of them.

One of the two is wrong and it matters, because the whole spawn geometry hangs
off it. Possibilities worth testing: the original measurement sampled too few
reactions; or Meet widens the band under load; or the band is proportional to
tile size and was measured at a smaller tile. **Re-measure with 15+ reactions
in quick succession**, at a known tile size, before touching the numbers. Do not
just widen `BAND` to match the screenshot — that would replace one unverified
number with another.

### Built and pushed this session

On branch `calls-tab-and-the-hand`, not main, because `docs/` is served by Pages
from main and the scare is untuned.

- Item 6, the raise-hand jump scare, is done: `slap()` in `call.ts`, CSS under
  "THE HAND THAT HITS THE GLASS", and a secret `slap` achievement. `SCARE` is
  the single dial, currently 0.85. Fires once per raise, on the way up only.
- Nothing else from this batch is built.

### Deliberately not built, to avoid inventing numbers

Items 1, 3, 4, 5 and 7 all need the live pass. In particular the messages panel
clipping (item 2) looked tempting to fix blind, but the fix depends on what
Meet's panel width and padding actually are, and guessing that is how a clone
stops being a clone.
