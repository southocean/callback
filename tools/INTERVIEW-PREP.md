# Interview prep: understanding the system, not just cloning it

Companion to `GOOGLE-FRONTEND-STACK.md`. That file records *what* Google's
frontend is. This one is the mechanics underneath it — the browser-level stuff a
frontend engineer is expected to actually understand, worked out from first
principles rather than repeated.

Same tagging discipline as the stack doc: **[measured]** means read off a live
product in this project, **[documented]** cites a first-party source,
**[inference]** is reasoning that has not been verified. Do not blur them in an
interview — "I measured X" and "I believe X" are different claims and the second
one is fine.

---

## 1. IIFE, in plain terms

```js
(function () { /* ... */ })();
```

Write a function and call it right where it sits. Nobody keeps a reference to it,
so it runs once and disappears.

The reason anyone bothers: **a function is the only reliable box in old
JavaScript.** Variables declared inside a function cannot be seen from outside.
So wrapping code in a function you immediately call gives you a private room —
you do your work in there, and the only things the rest of the page can see are
the ones you deliberately hand out through a global (`window.BOQ_wizbind`).

Without the wrapper, every variable would be global. On a page assembling
hundreds of independently-built scripts, that is a name collision waiting to
happen: two teams both using `var i` and silently corrupting each other.

Why it is the right tool *here* specifically: this code has to run inline in
`<head>`, before any HTML exists, with no module system, no imports, no bundler
at runtime. Just a `<script>` that executes the instant the parser reaches it.
Modern `import` would be too late and needs a network round trip. An IIFE needs
nothing but the parser.

---

## 2. How a DOM event actually travels

This is the part most people only half-know, and it is worth getting exactly
right because everything else here depends on it.

### The browser works out the target first

A click does **not** start at the root and search downward for what was hit. The
order is:

1. **Hit testing.** The browser takes the pointer coordinates and determines
   which element is topmost at that point. This uses the layout and paint
   information it already has. Result: *the target*.
2. **Build the propagation path.** The chain of ancestors from the root down to
   that target is computed up front.
3. **Construct the event object**, carrying `target`, coordinates,
   `relatedTarget` where applicable, modifier keys, and so on.
4. **Dispatch** along that path, calling whichever listeners are registered.
5. **Perform the default action** — navigate, submit, tick the checkbox — unless
   a listener cancelled it.

So the path is known before any listener runs. Nothing is being discovered on the
way down, and no information needs to travel back up to inform the root.

### Two stages, and do not conflate them

The single most confusing thing here, so state it separately:

**Stage 1 — preparation.** Hit-testing and path-building. NOT a phase. No
listener runs. This is where the target becomes known.

**Stage 2 — dispatch.** This is where the three phases live, and they run in
order 1 -> 2 -> 3, every time.

"The browser knows the target first" means it finished stage 1 before stage 2
began. It does NOT mean dispatch starts at phase 2. `event.target` is just a
property already filled in — readable during phase 1 even though phase 1 runs
first.

A train: it runs root -> target -> root, the whole route, every trip. You choose
which station to stand at, and whether to catch it outbound or on the return leg.
Your choice does not change the route. Non-bubbling events are trains with no
return leg, so at the root the outbound is your only chance.

### What each stage is actually for

**Preparation answers geometry.** What was hit, and what is the chain of nodes
from root to it. Pure spatial reasoning. At the end the browser knows the target
and the exact path.

What it does NOT know: **who wants to be told.** Listeners live on individual
elements, scattered; there is no master index of them.

**Dispatch is the visiting.** Walk the pre-computed path and ask at each node:
does anyone here listen for this type, in this phase? If so, call them.

It cannot be collapsed into a lookup, because dispatch must be ordered and
interruptible:

- order is semantic — capture (outside-in), target, bubble (inside-out), and
  which handler runs first decides who wins
- `stopPropagation()` means the remaining nodes are never visited, which is only
  expressible while walking
- `preventDefault()` changes what happens after the walk ends
- listeners run arbitrary code: adding, removing, even reparenting elements

### Why the split exists at all: determinism

**The path is snapshotted before any listener runs.**

If a capture listener at the root deletes the target from the DOM, the event
still continues along the original path. Nothing a listener does can rewrite the
route mid-flight.

The alternative — resolving "what is my parent?" at each step — would mean a
listener that reparents an element could redirect the event, and the same click
would behave differently depending on which handlers happened to be attached.
Freezing the path first is what makes event behaviour predictable at all.

So the seam is: **preparation is the part that must not be influenced by user
code; dispatch is the part that exists to run user code.**

Postman version: preparation plans the route, dispatch walks it and knocks. A
resident can say "stop, deliver no further" or "don't do the thing at the end",
but slamming a door does not redraw the map.

Which places jsaction exactly: it is **one resident with a door on the root**. It
does not touch preparation, does not alter the route, intercepts nothing. An
ordinary listener that happens to sit at the first or last stop on every route,
so it hears everything and can then do its own routing on top. Delivery, not
control.

### The three phases

```
capture   root → … → parent → target      (downward)
target    at the element itself
bubble    target → parent → … → root      (upward)
```

**Every event goes through all three phases.** "This event doesn't bubble" means
only that phase 3 is skipped for it — the capture phase still happens.

`event.target` is populated the whole time, in every phase. A capture-phase
listener at the root already knows precisely which element was hit. That is
exactly why root-level delegation works at all.

### So what is bubbling *for*?

Not for informing the root — it already knows. Bubbling exists to give you a
choice of **precedence**:

- **Bubble** runs specific-then-general. The button handles its own click, then
  an ancestor container can react afterwards. This is the natural authoring
  order and why it is the default.
- **Capture** runs general-then-specific. An ancestor sees the event *before*
  the target does, which is what you want when you intend to intercept, veto or
  observe something without the target's cooperation — a modal swallowing clicks
  outside itself, for example.

Two directions, so you can choose who gets first refusal.

### What `capture: true` means

```js
el.addEventListener('click', fn);         // phase 3, bubble  (default)
el.addEventListener('click', fn, true);   // phase 1, capture
```

It is **not** a switch that turns the capture phase on. The capture phase always
happens. The flag says *which phase your listener subscribes to.*

Which resolves the puzzle: how do you delegate a non-bubbling event? Register at
the root with `capture: true`. `focus`, `blur`, `load`, `error` and `toggle` never
come back up, but they always went down, so a capture listener at the root sees
every one of them. Not an optimisation — the only option.

### Correction worth internalising

`preventDefault()` and `stopPropagation()` are **not** "things that happen at the
end after bubbling". They can be called from any listener in any phase. Calling
`preventDefault()` in the capture phase at the root cancels the default action
before the target's own handler has even run.

---

## 3. Event delegation

### How it is done

Instead of attaching a handler to each of 500 buttons, attach **one** at the root:

1. One listener per event type on `document.documentElement`.
2. When it fires, read `event.target` — the element actually hit.
3. Walk up from the target looking for the nearest ancestor carrying the
   annotation you care about (`element.closest('[jsaction]')`).
4. Read that annotation, map this event type to a handler name.
5. Dispatch to the handler, or queue the event if the handler's code has not
   loaded yet.

The step people miss is 3. `event.target` is often a `<span>` or an icon *inside*
the button, not the button. You need the nearest meaningful ancestor, not the
literal target.

### Two traces, side by side

The same click, once with an ordinary listener and once through jsaction. Steps
1–6 are byte-identical; only step 7 differs.

**A. `button.addEventListener('click', fn)`**

1. Hit-test → target found
2. Browser builds the path `html → … → button`
3. Browser constructs the event object
4. Phase 1 (capture): walks down to the button's parent
5. Phase 2 (target): **`fn` fires here**
6. Phase 3 (bubble): walks back up
7. Browser performs the default action unless cancelled

A detail worth knowing: for a listener attached to the *target itself*, the
capture flag is irrelevant — it fires in phase 2 either way. The flag only
decides anything for **ancestors**.

Requirement: `fn` must exist at the moment `addEventListener` is called. That is
the constraint this whole architecture exists to escape.

**B. `<button jsaction="click:SomeHandler">`, nothing attached to it**

1–3. Identical. The browser has never heard of jsaction.
4. Phase 1: the contract's root listener fires *if* registered for capture —
   which is the non-bubbling types
5. Phase 2: **nothing.** No listener on the button
6. Phase 3: the event bubbles to `documentElement`, where the contract sits
7. **The library's turn:** read `target`, `closest('[jsaction]')`, parse the
   attribute, resolve `click` → `SomeHandler`, then either call it or stamp
   `eirp` and queue it
8. Browser performs the default action regardless — nothing cancelled it

### Where the library "takes over" — it does not

Steps 1–6 are **100% browser**, identical in both traces. The library is one
perfectly ordinary listener that happens to sit at the root. It takes
**delivery**, not control; everything it does happens at step 7, after the
browser has finished its work.

Which is the design principle, and it is the opposite of what you might guess:
**not** "do as much as possible in the library". Use the *smallest* browser
primitive available — delegation is a native capability — and spend it to defer
everything else. Two kilobytes of listener buys every megabyte of application
code the right to arrive whenever it likes. They did not reimplement events.
They found the one hook that makes the rest optional.

| | ordinary listener | jsaction |
|---|---|---|
| listeners | N, one per element | 1 per event type |
| handler must exist at bind time | **yes** | no |
| resolution cost | none | target → ancestor → name → module |
| dynamically added elements | need rebinding | just work |

### Why it enables lazy loading

The listener and the handler are decoupled. The listener exists from the first
parse of `<head>`; the handler code can arrive whenever. The markup is the
contract between them. That is the whole trick — and it is why the queue matters,
because there is now a real window where events have somewhere to arrive and
nowhere to go.

### The catches

- **Something must reach the root.** A bubbling event, or capture for the rest.
- **`stopPropagation()` anywhere in between kills it.** Any intermediate handler
  can silently break delegation for everything above it.
- **`preventDefault()` timing** — see §5.
- **Shadow DOM retargets `target`** at the boundary, so an open shadow tree needs
  `composedPath()` rather than `target`.
- **Dynamically added elements just work**, which is the underrated upside: the
  listener was never attached to them in the first place.

---

## 4. mouseenter/mouseleave, and who does what

`mouseover`/`mouseout` bubble. `mouseenter`/`mouseleave` do not, and their whole
meaning is boundary-crossing:

- `mouseover` fires entering the element **or any descendant**.
- `mouseenter` fires only crossing the element's own boundary, and *not* when
  moving between its children.

Delegation therefore subscribes to the bubbling cousin and filters it. The tool
is **`relatedTarget`**: for `mouseover` it is the element the pointer came *from*;
for `mouseout`, the one it went *to*.

The rule: if `relatedTarget` is inside the same annotated element, the pointer
only moved between children — suppress. If it is outside, a real boundary was
crossed — treat it as an enter.

### Who computes what

Nothing re-bubbles, and nothing recalculates a path. Splitting it cleanly:

| | responsibility |
|---|---|
| **Browser** | hit-test, build the path, construct the event *including* `relatedTarget`, dispatch through the phases, perform the default action |
| **Library** (jsaction) | one root listener; read `target`, walk up for the annotation, compare `relatedTarget` to decide if a boundary was crossed, then dispatch or queue |
| **App code** (Wiz) | the handlers, once their module has loaded |

`relatedTarget` is browser-provided, part of the `MouseEvent` spec. The library
does no geometry and no traversal — it compares two element references the
browser handed it. **[inference]** on jsaction's exact implementation of this;
the mechanism is standard, but I have not read their source for it.

---

## 5. preventDefault and stopPropagation, and why replay breaks them

Two different jobs, both **synchronous instructions to a dispatch that is
currently in flight.**

**`preventDefault()`** cancels the browser's built-in behaviour: following an
`<a href>`, submitting a form, scrolling on space, ticking a checkbox. All of that
happens *unless* cancelled during dispatch.

**`stopPropagation()`** halts the walk through the phases, so ancestors never see
the event. Classic use: a click inside a dropdown that must not reach the document
handler that closes dropdowns.

Now replay. The event fires at T=0, no handler exists, it is queued. The handler
arrives at T=400ms and receives it. But at T=0 the browser already finished
dispatching *and already performed the default action* — it navigated, submitted,
ticked the box. At T=400 there is no dispatch left to interrupt and no default
left to cancel. Both calls succeed silently and do nothing. **[documented]** in
Google's own README as a known caveat.

**Why it is a genuine design constraint:** any pattern that depends on
suppressing a default is unsafe for events that might arrive early — and early is
exactly the window this design exists to serve. Intercepting a link for
client-side routing, blocking a form post to validate first: both are built on
`preventDefault`, and both are unreliable pre-hydration.

**[inference]** This is likely why Meet's interactive surfaces are overwhelmingly
`<button>` and `<div>` rather than `<a href>`: a `<div>` has no default action, so
there is nothing to lose by not cancelling it. Cheap to verify, not verified.

---

## 6. `eirp`, and how a replayed event is handled differently

**[documented]** A boolean stamped on the event-info object when the event is
queued with no dispatcher installed. Angular's `event_info.ts` describes it as
marking a replay event.

Its purpose is to let downstream code tell "this arrived late" from "this just
happened". Two divergences follow directly and are safe to state:

1. **It must not be re-queued.** Without the flag, an event replayed while things
   are still settling could go back on the queue and loop.
2. **Default-suppression is already moot**, per §5 — a replay handler calling
   `preventDefault()` is a no-op, so anything conditioned on it needs a different
   path.

**[inference]** Beyond those two, what Angular's dispatcher branches on
specifically I have not read. If asked, say the flag's documented job is
identification and name those two consequences, rather than inventing a third.

---

## 7. What the binding vocabulary actually looks like

**[measured]** 2026-08-22, a live `google.com/search` results page, by walking
every `jsaction` attribute in the document:

```
449   elements carrying jsaction
927   total event:handler entries
102   entries with no event prefix  → default to click
 20   distinct real DOM event names
206   distinct CUSTOM (Wiz-internal) event names
```

The DOM events, by frequency:

```
click 46   mouseleave 35   mouseenter 34   focus 20   mouseover 17
mouseout 16   pointerdown 14   focusin 14   focusout 14   blur 10
keydown 9   pointerup 8   pointerenter 8   pointerleave 8
pointercancel 8   contextmenu 8   input 1   paste 1   mousedown 1
transitionend 1
```

Two things worth carrying into an interview.

**It corroborates §2 and §4 directly.** `mouseenter` and `mouseover` both appear.
`focus`/`blur` *and* `focusin`/`focusout` both appear — the non-bubbling pair and
the bubbling pair, bound side by side. That is the mechanism leaving fingerprints
in the markup.

**The bigger finding: 206 custom names against 20 DOM ones.** The overwhelming
majority of jsaction bindings are not browser events at all — they are Wiz's own
named actions, dispatched by application code. One (`rcuQ6b`) appears 155 times.

So jsaction is not really "an event delegation library". It is a **named-action
bus** that happens to be fed by DOM events at the edges. That reframes the whole
thing: the browser events are the entry points, and most of the traffic is
internal messages riding the same delivery mechanism.

### The same point in plain terms

You would expect that attribute to mean *"when clicked, do X"*. Twenty of the
names are exactly that — `click`, `focus`, `mouseenter` — real things the browser
reports.

The other 206 are **invented by Google's own application code.** Nothing in
Chrome has ever heard of `rcuQ6b`. Some piece of Search decides "the thing called
`rcuQ6b` just happened" and announces it, and every element with `rcuQ6b:` in its
attribute is told.

Think of an office mail room. Some post arrives from outside via the postman —
that is the browser, delivering clicks and keypresses. But most of the traffic is
internal memos between departments. Same mail room, same pigeonholes, same
delivery system; only the sender differs.

Calling jsaction "event delegation" describes the postman's door and misses the
mail room. It routes *anything that happens*, and browser events are one sender
among many — outnumbered ten to one by the application talking to itself.

### Honest limits on this measurement

- This is `google.com/search`, **not Meet.** Different app, different config.
- The "~60 event types" in `GOOGLE-FRONTEND-STACK.md` is a count of what Meet's
  contract *registers*. This is a count of what Search's markup *binds*. Related
  but not the same quantity, and they should not be quoted as if they were.
- I could not enumerate Meet's registration list. The regex approach over
  minified inline script is unreliable — it only catches names appearing as
  quoted literals with particular delimiters, and misses anything constructed at
  runtime. **The honest thing is to say the list was not obtained**, not to
  publish a partial one as if it were complete.
- The automated browser could not reach `google.com` at all: Google served its
  bot-detection page. This was measured through an ordinary browser session.

---

## 8. The Angular story

**[documented]** Timeline:

| when | what |
|---|---|
| ~2012 onward | jsaction in use inside Google; the Angular team later calls it "over a decade old" |
| Apr 2024 | Angular blog, *Event Dispatch in Angular*, explains the integration |
| 16 May 2024 | `google/jsaction` archived; code migrated into `angular/angular` under `packages/core/primitives/event-dispatch` |
| 22 May 2024 | Angular v18 ships `withEventReplay()` in developer preview |
| Angular 19+ | incremental hydration builds on it; enabling that enables event replay automatically |

**Why it happened:** the Wiz/Angular merger — two Google frameworks converging,
with jsaction the first concrete piece to cross over. **[documented]** the Angular
team's framing is that Wiz provides event dispatch to hundreds of Google
applications including google.com, and that integrating it is a first step toward
finer-grained hydration.

**Lineage, and don't get this backwards.** The industry vocabulary — partial
hydration, islands (Astro, Marko), resumability (Miško Hevery's Qwik, 2021) —
arrived *after* jsaction was already in production at Google. Addy Osmani named
the symptom, the "uncanny valley" where skeleton HTML looks interactive and is
not. Qwik went furthest by serialising listeners into the HTML so the client
resumes rather than re-executes. jsaction is the older, narrower answer to the
same problem: don't eliminate the gap, just don't drop anything that happens
during it.

### Benchmarks — and the honest answer

**No published benchmark isolates event replay**, and there is a structural reason
why: it does not make anything faster. It stops interactions being *dropped*. The
natural metric is "share of pre-hydration interactions preserved", which nobody
publishes, rather than a Core Web Vital.

Be precise about INP, since it is the tempting one to claim. INP measures JS
execution *during* an interaction. Event replay does not improve it; the gains
attributed to incremental hydration come from `@defer` shipping less JavaScript
so less competes for the main thread. **Anyone quoting an INP figure for
`withEventReplay()` alone is conflating it with deferred loading** — and saying so
is a stronger answer than repeating the figure.

The quantitative framing that *is* defensible is a ratio: a ~2 KB inline script
makes the page respond before any of the application exists. In one Meet document
`VfPpkd` appears 10,881 times. Two kilobytes covering that.

---

## 9. Answers worth having ready

**"How does event delegation work?"** — One listener at the root; read
`event.target`; walk up to the nearest annotated ancestor; dispatch. Cost goes
from N listeners to one per event type, and dynamically added elements work
without rebinding.

**"How would you delegate an event that doesn't bubble?"** — Register at the root
with `capture: true`. Every event has a capture phase even when it has no bubble
phase, so the root sees it on the way down. This is the question that separates
people who know the three phases from people who only know bubbling.

**"What breaks if you replay events after the fact?"** — `preventDefault` and
`stopPropagation`, because both are instructions to a dispatch that has already
finished. Which constrains the architecture: you cannot rely on suppressing a
default for any interaction that might land pre-hydration.

**"Why doesn't DevTools' Force :hover work on some Google UI?"** —
**[measured]** in the stack doc: the element has no `:hover` rule at all, it binds
`mouseenter`/`mouseleave` through jsaction. Force-hover only makes the CSS engine
*match* selectors; it dispatches no events, so nothing fires.

**"What did you learn cloning Meet?"** — The honest version, which is better than
a polished one: that measuring is a skill with failure modes. This project got the
reaction spawn band wrong twice, wrote both readings down as "measured", and only
caught it by sampling a dozen at a known viewport. A computed colour told me an
element was painted when it was not. `getAnimations()` read empty and I concluded
nothing animated, when it only lists *running* animations. Every one of those was
a correct reading of the wrong signal.
