# How Google Meet's frontend is actually built

Written for Nam, who reasonably objected that cloning Meet's CSS teaches you their
UX designer's job and not a frontend engineer's. This is the engineer's half.

Every claim is tagged:

- **[measured]** — I observed it myself, either in the live app during this
  project or by grepping a 1.63 MB capture of Meet's app document
  (`meet.google.com/abc-defg-hij`, unauthenticated, 2026-08-23).
- **[documented]** — a named first-party source, cited.
- **[inference]** — my reasoning from the above, labelled so you can disagree.
- **[rumour]** — anonymous or uncorroborated. Included only where it is worth
  knowing that a claim is circulating.

---

## 1. The stack, top to bottom

Meet is a **Boq** application using the **Wiz** frontend flavour, rendered
server-side from **Soy** templates, with **Closure** Library/Compiler underneath
and **GM3** (Google's internal Material 3) for components.

**[measured]** From the capture:

| marker | count | what it tells you |
|---|---|---|
| `VfPpkd` | **10,881** | the renamed Material/MDC class prefix |
| `jscontroller` | 80 | one per interactive region |
| `jsaction` | 79 | event bindings |
| `jsname` | 66 | named child handles |
| `jslazy` | 25 | deferred subtrees |
| `jslog` | 12 | analytics instrumentation |
| `c-wiz` | 7 | Wiz component roots |
| `boq-rtc` | 16 | the Boq app name, in bundle URLs |
| `BOQ_wizbind` | 1 | the global event contract |

**[measured]** The marketing page at `meet.google.com/` is *not* Wiz — it serves
Vite-style hashed bundles and has zero `jsaction`. Only the app entry point is.
Worth knowing if you go looking and find nothing.

**[documented]** Boq is Google's internal application framework; "Boq Angular"
and "Boq Wiz" are its two sanctioned frontend flavours. This is attested in
Google job postings for "Java & Boq Framework" roles rather than in developer
docs — Boq has no public documentation.

**[documented]** Wiz is Google's second web framework, internal only, behind
Search, Photos, Payments and YouTube mobile web. Source: the Angular team's own
post, *Angular and Wiz Are Better Together* (Ramanathan + Gechev, March 2024).

**[measured]** Meet being Wiz is not in any Google post I could find, but the
capture settles it.

---

## 2. jsaction: events are a contract, not listeners

### The mechanism

**[measured]** Meet inlines a ~2 KB IIFE in `<head>`, before any content,
carrying two licence headers — Closure Library (Apache-2.0) and Google (MIT). It
installs listeners for **~60 event types on `document.documentElement`** and
exports itself as `window.BOQ_wizbind`.

Three details from that code, all verified by grep:

```js
var m = ["focus","blur","error","load","toggle"];      // registered with capture:true
                                                        // because they do not bubble

a==="mouseenter" ? "mouseover" :                        // enter/leave do not bubble
a==="mouseleave" ? "mouseout"  :                        // either, so they are
a==="pointerenter"? "pointerover":                      // substituted for the
a==="pointerleave"? "pointerout" : a                    // bubbling equivalents

function q(a,b){ if(a.j) a.j(b); else { b.eirp=!0; ... push(b) } }
                                                        // no dispatcher yet?
                                                        // mark as replay, queue it
```

`eirp` is **[documented]** in Angular's `event_info.ts` as *"Whether this Event is
a replay event, meaning no dispatcher was installed when this Event was
originally dispatched"*. The field names are literally Angular's now — jsaction
was migrated into `angular/angular` and `google/jsaction` was archived on
2024-05-16.

**So the whole point is:** the page is clickable before its JavaScript exists.
Events that arrive early are queued and replayed once the controller's module
loads. That is what makes server-rendering plus fine-grained lazy loading
survivable.

**[documented]** And the cost, stated in the README: *"Because JSAction may
potentially replay queued events some time after the events originally fired,
certain APIs like `e.preventDefault()` or `e.stopPropagation()` won't function
correctly."*

### The grammar

**[documented]** From Angular's README, the EBNF reduces to:

```
jsaction="[event:]handler; [event:]handler; ..."
```

Omit the event and it defaults to `click`. `:` `;` and `.` are illegal inside
names. The handler string is **opaque to jsaction** — *"The user of JSAction can
choose to define the semantics of the handler string however they like."* So the
naming scheme is Wiz's, not jsaction's.

**[measured]** Meet uses a form the published grammar does not allow —
**comma-separated handler lists per event**:

```
jsaction="U5vxQc:GBSJZc;C0XLUe:zLM8ec;vP0K7b:xp7Lke;;imax1e:LTrxfc;
  JIbuQc:iCqzi(TE8cKe),O5t46c(Lyfqwe),LKGzUd(QnzFXb),zdwaId(oEtFAe),
          GBSJZc(Qx7uuf),YF9C1e(hNGZQc),EQYr0(w5gBed),MQOaNc(VO20se);;
  G0rSQ:PtV1Fd;"
```

One event, `JIbuQc`, fanning out to **eight handlers**, each with a parenthesised
argument. **[inference]** Those arguments are `jsname` references — which is what
`jsname` is *for*: it lets a handler be told which named child to act on, without
a selector or an id. Wiz's parser is therefore a superset of the open-sourced one.

Note the `;;` — empty entries are tolerated.

### Why "Force :hover" in DevTools does nothing

**[measured]** The warning badge binds `jsaction="mouseenter:GmbEHd;
mouseleave:vmjvrd; ..."`. There is no `:hover` rule for it anywhere.

DevTools' *Force element state → :hover* only makes the CSS engine **match**
`:hover` selectors. It dispatches no events. So there is nothing to switch on and
Wiz never hears anything.

**To trigger it manually,** select the element (making it `$0`) and dispatch the
real event. `mouseenter` does not bubble, so it must go on that exact element:

```js
$0.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
```

Then, while it is still moving, read the actual animation:

```js
document.getAnimations().map(a => ({
  target: a.effect.target.className,
  timing: a.effect.getTiming(),
  frames: a.effect.getKeyframes(),
}))
```

**[inference]** That badge animation is driven by the Web Animations API from JS,
not CSS. It cost me two wrong conclusions to work out: computed
`transition-duration` reads `0s` on every element in the chain (there *is* no
transition), and `getAnimations()` is empty at rest (it only lists *running*
animations). I read the first as "the reveal is instant" and the second as
"nothing animates here". Both were correct readings of the wrong signal.

---

## 3. The `js*` attribute family

Only `jsaction` has first-party documentation. The rest is **[measured]**
structure plus the consistent community reading.

| attribute | what it does |
|---|---|
| `jsaction` | event → handler map. **[documented]** |
| `jscontroller` | names the controller that owns this element and its subtree; the value is a lazy-loadable module id |
| `jsname` | a stable handle so a controller can find a child without a selector — and the thing `handler(arg)` refers to |
| `jsmodel` | binds model/observable objects. Seen as `jsmodel="WynQKc;CcZnhe;"` |
| `jsdata` | serialized or deferred data. Seen as `jsdata="deferred-i1"` on a `<c-wiz>`, with an `id;_;index` table on its `<c-data>` child |
| `jslog` | analytics. `jslog="341316;track:JIbuQc;"` — a numeric visual-element id. **Ignore it when reverse-engineering behaviour** |
| `jsrenderer` | the server-side renderer for a `<c-wiz>` subtree, *and* a JS module id |
| `jslazy` | gates deferred instantiation |

**[measured]** `<c-wiz>` and `<c-data>` are real custom elements, and the page's
own CSS treats the first as a containment boundary:

```css
c-wiz { contain: style }
c-wiz > c-data { display: none }
```

---

## 4. The minified identifiers — and a correction

I told Nam earlier that `Fd638c` and `GmbEHd` "come from Closure Compiler's
advanced mode". **That is wrong**, and the reasoning against it is clean.

**[documented]** Closure's renamer emits the *shortest available* names — `a`,
`b`, `Ea`, `$jscomp`. Minimality is the entire point. A six-character mixed-case
token is ~36 bits of entropy. That is a **hash**, not a minimizer.

**[measured]** The decisive evidence: `XCoqFe` appears **both** as a
`jsrenderer` attribute — written by the Java/Soy server — **and** as a module id
in the client's loader URL:

```
/js/k=boq-rtc.MeetingsUi.en_US.YrPreguzNzM.2020.O
   /excm=XCoqFe,_b,_tp,calldesktoppageview,q0xTif,sOXFj
   /m=_b,_tp,XCoqFe,q0xTif,sOXFj
```

Sequential renaming cannot be stable across two independently compiled
artifacts. A content hash can.

**[documented]** Angular's `event_info.ts` documents exactly this constraint for
its own shared type: the short keys were chosen by hand *"to support sharing this
type across multiple binaries and prevent renaming during compilation."*

**[inference]** So these ids are build-time-stable identifiers, most plausibly a
truncated hash of a fully-qualified symbol name, produced by the Wiz/Boq build.
No public Google document describes the algorithm; treat anything that claims to
know it as unsourced.

### CSS class renaming, which *is* documented

**[documented]** `closure-stylesheets`, "More on CSS Renaming": `--rename CLOSURE`
*"splits class names on hyphens and renames each part independently using the
shortest available names"*, with the guarantee that **if `.foo-bar` becomes
`.a-b`, then `.bar-foo` becomes `.b-a`.**

That property is exactly what makes Meet readable. **[measured]** From my own
inspection of two unrelated components:

| renamed part | meaning | seen on |
|---|---|---|
| `LgbsSe` | button root | `UywwFc-LgbsSe`, `vNWS4-LgbsSe` |
| `vQzf8d` | label span | both |
| `RLmnJb` | **touch target** | 240×56 on Join now; 179×48 on a 179×**32** chip |
| `kBDsod-Rtc0Jf` | icon slot | both |
| `UTNHae` | state-layer host | carries `::before` at .08 and the `::after` ripple |
| `XjoK4b` | focus ring | runs `gm3-focus-ring-outward-*` |
| `quRWN-Bz112c` | Material Symbols glyph | everywhere |

`UywwFc` is the filled-button family, `vNWS4` the chip family — different blocks,
**same renamed element suffixes**. So BEM survives renaming: `Block__element`
becomes `hash-hash`. Learn four suffixes and you can read any component.

**[inference]** Production uses a hash-based per-part strategy rather than
`minimal` (`.a`, `.b`), for the same cross-binary reason as the JS ids.

---

## 5. What survives minification — and is therefore the real spec

Three categories cannot be renamed, because they cross a boundary by string.
**This is where to look when you want the truth about a Google UI.**

1. **Keyframe names.** `gm3-focus-ring-outward-grows`, `gm3-cpi-active-grow`.
   This is how the whole progress-indicator formula was recovered.
2. **Custom properties.** `--gm3-linear-progress-track-thickness`,
   `--componentsweb-custom-badge-height`, `--ws-sys-color-extended-blue-fill`.
   The first segment is the *design system name*: `md` = open-source Material,
   `gm3` = Google's internal Material 3, `ws` = Workspace. Then `ref` / `sys` /
   `comp`. **[documented]** — m3.material.io/foundations/design-tokens/overview.
3. **`role` and `aria-*`.** Which is why aria-labels were the most reliable
   handle on this entire project.

---

## 6. GM3 — and its source is public

**[documented]** `github.com/material-web/material-components-web-angular-shared-styles`
— MIT, author "Google", *"Styles shared between Material Web and Angular
Material."* It is an internal export with the internal comments left in:
`go/gm3-wiz-new-feature-request`, `screenshot.googleplex.com` links,
`// go/keep-sorted` markers.

Its README cites a google3 path that lays out the architecture:

```
javascript/materialdesign/gm3/wiz/button/button_elevated.scss
  → imports third_party/javascript/material/m3/sass/tokens/v0_161
```

So: a shared **m3 Sass + token core**, with three sibling consumers — public
`@material/web`, Angular Material, and **`gm3/wiz`**, the internal one Meet uses.

**[documented]** m3.material.io/develop/web: *"Material Web Components are
currently in maintenance mode... **Material 3 Expressive is not implemented on
Web.**"* So the wavy progress indicator, configurable track thickness and the
active-indicator/track gap I decoded from Meet have **no public web
implementation at all**.

### The numbers worth having

**[documented]** State layer opacities, from the shipped tokens
(`_md-sys-state.scss`) — note the prose on m3.material.io says 8/10/10/16 and is
**stale**:

| state | token value |
|---|---|
| hover | **0.08** |
| focus | **0.12** |
| pressed | **0.12** |
| dragged | **0.16** |

Only one layer applies at a time, and it is tinted with the container's **`on-`
colour**, not neutral black.

**[documented]** The press ripple, `ripple/internal/_ripple.scss`:

```scss
radial-gradient(closest-side, $pressed-color max(calc(100% - 70px), 65%), transparent 100%)
```

**[measured]** I had read `max(100% - 70px, 65%)` off Meet frame by frame before
finding this. Exact match.

**[documented]** The focus ring, `focusring/_focus_ring_outward.scss`:

```scss
box-shadow: 0 0 0 $track-width $ring-color;   // base, 3px
outline: $track-width solid transparent;      // HCM ignores box-shadow

@keyframes gm3-focus-ring-outward-grows   { from { 0 0 0 0 } to { 0 0 0 8px } }
@keyframes gm3-focus-ring-outward-shrinks { from { 0 0 0 8px } }   // NO `to`

animation-duration: 150ms, 450ms;
animation-delay:    0s,    150ms;
animation-timing-function: cubic-bezier(0.2, 0, 0, 1) ×2;
```

Two things here. The **delay plus no backwards fill** is what lets two animations
share one property: before 150ms `shrinks` contributes nothing, so `grows` owns
it; at 150ms `shrinks` takes over and, having no `to`, lands on the base rule's
3px. And **Windows High Contrast Mode ignores `box-shadow` entirely** — the
transparent outline of equal width is there to put the ring back for those users.
We were missing it.

**[documented]** `md.sys.motion.easing.emphasized` has **no CSS value** — the
spec says *"N/A (Use Standard as a fallback)"*, because the real curve is a
two-segment Android `pathInterpolator`. That is why `cubic-bezier(0.2, 0, 0, 1)`
is everywhere in Meet: on the web, it *is* emphasized.

**[documented]** Durations: short 50/100/150/200, medium 250/300/350/400, long
450/500/550/600, extra-long 700/800/900/1000.

---

## 7. Reading Meet's DOM: a procedure

1. Find the `<script>` in `<head>` containing `BOQ_wizbind`. That is the event
   contract, and it lists every delegated event type.
2. `document.documentElement` is the single delegation root. Almost nothing has a
   real listener.
3. Walk up from any element to the nearest `[jscontroller]` — that is the
   component that owns its behaviour.
4. `<c-wiz jsrenderer="X">` marks a server-rendered, independently code-split
   subtree, and `X` is also the module name in the bundle URL.
5. `jslog` is analytics. Ignore it.
6. To trigger an interaction, **dispatch the real event** — forcing a CSS state
   will not do it.

---

## 8. The three ideas we actually adopted

Not the CSS. All three are the same move: **give the concern its own element.**

- **Touch target as an element** (`RLmnJb`), not padding. A 32px chip with a 48px
  hit area, because visual size and hit size are different requirements.
- **State layer as an element** (`UTNHae`), not a background on the control. This
  is why hover can be an 8% tint of the control's own on-colour without touching
  its fill — and why our repeated `background:` shorthand bugs were a symptom of
  doing it the wrong way.
- **Focus ring as an element** (`XjoK4b`), not `outline`. So it can animate, and
  carry a radius 2px larger than its host.

---

## Sources

**jsaction / Wiz**
- https://github.com/angular/angular/blob/main/packages/core/primitives/event-dispatch/README.md
- https://raw.githubusercontent.com/angular/angular/main/packages/core/primitives/event-dispatch/src/event_info.ts
- https://github.com/google/jsaction (archived 2024-05-16)
- https://blog.angular.dev/angular-and-wiz-are-better-together-91e633d8cd5a
- https://blog.angular.dev/event-dispatch-in-angular-89d868d2351c
- https://angular.dev/guide/hydration
- https://changelog.com/jsparty/318

**Closure**
- https://github.com/google/closure-stylesheets/wiki/More-on-CSS-Renaming
- https://developers.google.com/closure/compiler/docs/compilation_levels
- https://github.com/google/postcss-rename

**GM3 / Material**
- https://github.com/material-web/material-components-web-angular-shared-styles
- https://github.com/material-web/material-components-web-angular-shared-styles/blob/main/focusring/_focus_ring_outward.scss
- https://github.com/material-components/material-web/blob/main/ripple/internal/_ripple.scss
- https://github.com/material-components/material-web/blob/main/tokens/versions/v0_192/_md-sys-state.scss
- https://m3.material.io/foundations/interaction/states/state-layers
- https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
- https://m3.material.io/foundations/design-tokens/overview
- https://m3.material.io/develop/web
- https://developers.google.com/fonts/docs/material_symbols

---

## 9. Before you search: two things called Wiz

**[documented]** Alphabet agreed to acquire **Wiz Inc.**, a cloud-security
company, for ~$32B (announced March 2025). It has nothing to do with the
framework. Search results mix them constantly. Add `framework`, `jsaction`, or
`angular` to every query.

Also: Boq has no public documentation at all. What exists is job postings for
"Java & Boq Framework" roles. If you need to describe it in an interview, say
"Google's internal application framework, with Angular and Wiz as its two
sanctioned frontend flavours" and stop there.

---

## 10. The Angular + Wiz convergence, dated

Useful because it is the one part of this stack Google talks about publicly, and
it is a reasonable thing to have an opinion about in an interview.

| date | event |
|---|---|
| ~2014 | Wiz originates, per Jatin Ramanathan on JS Party #318, out of Google+'s need for systematic code chunking. Podcast recollection, not a dated document |
| ~20 Mar 2024 | ng-conf keynote (Jeremy Elbourn + Minko Gechev) announces joining forces. 100% of YouTube mobile web traffic now on Angular Signals *inside Wiz* |
| late Mar 2024 | Angular Blog, *Angular and Wiz Are Better Together*. Merge to happen "gradually and responsibly over the coming years", via public RFC |
| 28 Mar 2024 | Gechev on HN, asked whether Wiz would be open-sourced: **"Yes, via Angular."** |
| 24 Apr 2024 | Angular Blog, *Event Dispatch in Angular*. Calls jsaction "over a decade old" and notes it powers "hundreds of Google applications (including google.com)" |
| 16 May 2024 | `google/jsaction` archived; code migrated into `angular/angular` |
| 22 May 2024 | **Angular v18** ships event replay in developer preview — `provideClientHydration(withEventReplay())` |
| ongoing | Incremental hydration; enabling it auto-enables event replay |

**[inference]** The verifiable deliverables are code moving both ways — jsaction
into Angular, Signals into Wiz — plus Wiz-shaped ideas landing in Angular
(`@defer`, incremental hydration). No public source describes a single merged
framework with a date, and I would not claim one.

**[rumour]** HN threads carry insider-flavoured claims worth knowing but not
citing: that Wiz "favours performance over ergonomics in the extreme", that it is
the most-used internal framework, that React/Vue and Node are unsanctioned. All
anonymous and uncorroborated.

---

## 11. Material Symbols, with real numbers

**[documented]** Four axes: `FILL` 0–1, `wght` 100–700, `GRAD` −50–200, `opsz`
20–48. Ligatures are the recommended rendering path. `icon_names=` must be
**comma-separated, alphabetically ordered, snake_case**.

**[measured]** Against `fonts.googleapis.com`:

| | bytes |
|---|---|
| full four-axis variable font | **3,960,036** |
| 3-icon subset | 5,804 |
| **our 56-glyph subset** | **8,444** |

So our subset is a **469× cut**. Note the docs' oft-quoted "295 KB" refers to a
static single-axis cut, not the variable font — the real number to compare
against is 4 MB.

Subsets come from `/l/font?kit=…&skey=…&v=v367` (dynamic); full faces from
`/s/<family>/<version>/`. The subset request needs a browser UA or you get TTF.

---

## 12. What we have mirrored, and what is left

The point of this document. Kept honest — "ours" means measured-and-verified in
this repo, not intended.

### Adopted, verified

| pattern | where |
|---|---|
| state layer as its own element, `on-`colour tinted, .08 / .12 | every control |
| press ripple: `radial-gradient(closest-side, … max(100% - 70px, 65%), …)`, translate-then-scale so it blooms from the finger | `gm3.ts` `ripple()` |
| focus ring as an element with animated `box-shadow` + the HCM outline, GM3's real 150ms/450ms two-phase | `.focus-ring` |
| touch target as a separate element, larger than the visual control | device chips (48 on a 32) |
| 48px minimum interactive target | bar and chips |
| `steps(6, jump-none)` shape morph on the control toggles | `.round-ctl`, `.cbtn` |
| Material Symbols as a subsetted variable font driven by `FILL` | `icons.ts` |
| tokens as CSS custom properties, not literals | `--sl`, `--rx`, `--rise` |
| `prefers-reduced-motion` on every animation | throughout |

### Worth adopting next

1. **A real token layer.** We have ad-hoc custom properties. GM3's own
   `internal/_theme.scss` is eleven lines and generates the whole
   `var(--prefix-key, fallback)` surface from a Sass map. A `--cb-sys-*` /
   `--cb-comp-*` split would make the palette themeable instead of hand-edited,
   and it is the single biggest structural gap between our CSS and theirs.
2. **Event delegation.** We attach listeners per element. One root listener with
   a `data-act="event:handler"` convention would be a genuine echo of the
   architecture rather than the styling — and it is the piece that would let the
   page be interactive before its JS arrives.
3. **Named child handles.** `jsname`'s job. We use `querySelector` with class
   names, which couples behaviour to styling; a `data-name` attribute would
   decouple them.
4. **Component boundaries with `contain`.** `c-wiz { contain: style }` is free
   layout isolation we are not taking.
5. **Two-phase animations sharing one property.** Now understood — delay plus no
   backwards fill. Reusable anywhere we want overshoot-then-settle.

### Deliberate divergences, with reasons

- **CSS instead of Web Animations** for the badge spring. Same result, and it is
  inspectable and tunable in DevTools, which Meet's is not. Nam tuned it himself
  in one sitting, which is the argument.
- **Text emoji with a CSS loop** instead of Google's animated WebPs. Ours is a
  custom set; several glyphs have no animated Noto equivalent.
- **Authored recreation for `careers.google.com`** in the share view. It refuses
  to be framed; the framed pages are our own origin under `frame-src 'self'`.
- **No Wiz.** Obviously. The point of the clone is that a recruiter cannot tell,
  not that the internals match — but the patterns in §12.1 are worth having on
  their own merits.
