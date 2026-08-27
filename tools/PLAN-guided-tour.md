# The guided tour

A plan, written before the code, for the feature in board ticket **N24**.

Nam's brief, in full, is quoted in the ticket. The short version: the call
narrates itself through the captions, an on-screen cursor moves in sync with
what is being said, and when the visitor takes over the script switches from
*showing* to *commenting* — then finds its way back.

Same tagging as the other docs here: **[decided]** is settled, **[open]** needs a
call from Nam, **[risk]** is a thing that can go wrong and what we do about it.

---

## 0. What this actually is

Not a product tour. Product tours are a highlight ring and a Next button, and
everybody skips them.

This is closer to **a screen recording that can be interrupted**. Nam talks, the
cursor moves, the interface responds — and if the visitor clicks something, Nam
notices and talks about that instead. The thing being demonstrated is not the
CV's contents. It is that the person who built this can hold a demo together
while someone else is pulling at it.

**[decided]** The tour is opt-out, not opt-in. It starts on its own, because a
feature nobody presses is a feature nobody sees, and there is a Stop control from
the first second.

---

## 1. The three moving parts

| Part | Job | Lives in |
|---|---|---|
| **The script** | A tree of parts, each with lines, a target, and an action | `src/data/tour.ts` |
| **The director** | Decides what plays next, and reacts to the visitor | `src/tour/director.ts` |
| **The stage** | Captions, the cursor, and the clicks it performs | `src/tour/stage.ts` |

Three files because they fail differently. The script is data and should be
editable without touching logic (that is also what makes N26, the script editor,
possible). The director is a pure state machine and should be unit-testable with
no DOM. The stage is the only part that touches the document.

---

## 2. The script

### Shape

```ts
interface Part {
  id: string;
  /** Lower runs earlier. Also the order things get cut in. */
  priority: number;
  /** What the visitor has to be looking at for this to make sense. */
  needs?: 'call' | 'share' | 'cv' | 'panel';
  /** Spoken as captions, in order. */
  lines: Line[];
  /** What the cursor does, keyed to a line index. */
  beats?: Beat[];
  /** Where a jump may land without the visitor feeling a cut. */
  entry: 'clean' | 'mid';
  /** Said instead of `lines` when the visitor got here by clicking. */
  commentary: Line[];
  /** The shortest honest version, used when the queue is long. */
  brief: Line[];
}

interface Line { text: string; ms: number }

interface Beat {
  at: number;                      // line index this fires on
  move?: string;                   // CSS selector to move the cursor to
  click?: boolean;                 // press it on arrival
  hold?: number;                   // linger, ms
}
```

**[decided]** Three versions of every part — `lines`, `commentary`, `brief` — is
the part that makes the adaptivity possible rather than fake. A single script cut
short reads as a script cut short. Three variants let the director choose a
*register*, not just a length.

**[decided]** Timings are authored, not derived from string length. A joke needs
a pause a word count cannot predict.

### The parts

Ten, in priority order. Content is a first pass; the structure is what matters.

1. **Who and what** — name, role, what this page is. Never cut.
2. **The CV itself** — opens the share, browser centred, scrolls the document.
3. **Wasabi** — the seven years, and what the product actually is.
4. **This build** — measured not eyeballed, no dependencies, the budget in CI.
5. **The mock OS** — the desktop, because it is the surprise.
6. **Accessibility** — the audit panel, live.
7. **The tests** — run them, in front of them.
8. **Off the clock** — the reel.
9. **The referral** — Diep, and the Calls tab.
10. **Close** — how to get the plain document and the PDF.

**[open]** Nam wants a pass on the actual words. The doc specifies the machinery;
the copy is his.

---

## 3. The director

### States

```
idle → playing → (interrupted → commenting → playing) → finished
                              ↘ handedOver
```

- **playing** — working through the queue in priority order.
- **interrupted** — a click landed. Finish the current *line*, not the current
  part, then switch.
- **commenting** — saying the `commentary` of the part the visitor opened.
- **handedOver** — the visitor is clearly exploring. Stop talking, politely.
- **finished** — script exhausted.

### The visitor queue

**[decided]** Clicks go into a queue, they are not handled immediately. Handling
immediately means a fast clicker gets a stutter of half-sentences.

Rules, in order:

1. A click on a part already played, or currently playing → **ignore**, no queue
   entry. Re-narrating something is worse than silence.
2. Queue length 1–2 → play that part's `commentary` in full.
3. Queue length 3–4 → play `brief`, and say so once: *"Lots to look at — I will
   keep these short."*
4. Queue length ≥ 5 → **hand over**. One line, warm, then stop: *"You clearly
   know your way around. I will get out of the way — everything is where you
   would expect, and the plain document is in the top left. Thanks for the
   time."* Captions off.

**[decided]** Rule 4 is the important one and it must feel like generosity, not
sulking. Nam: *"be very polite with good will here."* The wording above is
deliberately not passive-aggressive; it is the thing a good presenter actually
says.

**[decided]** Hand-over is terminal for the session. Coming back mid-explore to
resume would be exactly the behaviour that made it annoying.

### Resumption

After commentary finishes and the queue is empty, resume at **the lowest-priority
unplayed part**, not where we were interrupted. Nam's example: interrupted in
part 2, visitor opens 5 → after 5, go to 3, then 4, then skip 5, then 6.

**[decided]** A part is marked played whether it was reached by script or by
click. That is what makes the skip in Nam's example correct.

---

## 4. The stage

### Captions

**[decided]** Reuse the existing caption surface. The call already renders
`transcript` lines with a real caption box measured off Meet; a second caption
system would be two things to keep in step.

### The cursor

**[decided]** A DOM element, not a real pointer. `position: fixed`, a drawn
arrow plus a soft ring, `pointer-events: none`, `aria-hidden`, `z-index` above
the call and below any modal.

Movement: `transform: translate()` with a 420ms `cubic-bezier(.4,.1,.3,1)`, then
a 120ms settle. It must overshoot slightly — a cursor that arrives with no
overshoot reads as a slide, not a hand.

**[risk]** A cursor that moves to a target that has moved is worse than no
cursor. Resolve the selector at beat time, and if it does not resolve, **skip the
beat and keep talking**. Never move to a stale coordinate.

**[decided]** Clicks the cursor performs are real `.click()` calls on real
elements, after the cursor arrives. Faking the effect separately would let the
demo drift from the app.

**[decided]** `prefers-reduced-motion`: the cursor teleports rather than travels,
and the captions still run. Turning the whole tour off would be a worse outcome
for the person who set that flag.

### The share sheet countdown

From the same ticket: the "Your meeting's ready" card auto-closes after 8s, with
a visible countdown that pauses on hover.

**[decided]** Reuse the ring from the ended screen — it is already measured and
already correct after the `calc()` fix. Pausing on hover means pausing the
animation *and* the timer, and `animation-play-state` handles the first half.

---

## 5. Risks

**[risk] It talks over the visitor's own reading.** Mitigation: rule 1, and every
part is skippable via the Stop control.

**[risk] It looks broken if a selector fails.** Mitigation: beats are
best-effort; a failed beat is silent.

**[risk] The queue makes it feel unresponsive.** Mitigation: the *cursor* moves
to a clicked target immediately even though the *narration* waits, so the click
is always acknowledged inside 100ms.

**[risk] It is the most likely thing here to be perceived as gimmicky.**
Mitigation: it ends. Ten parts, then quiet. A tour with no end is a nag.

**[risk] Autoplaying captions on a page dressed as Meet re-opens the trust
problem in the perception doc.** Mitigation: the first line says what this is in
plain words, and Stop is visible from the first frame.

---

## 6. Out of scope for this pass

- Audio. Text captions only. **[decided]** — a synthesised voice would be worse
  than silence, and a recorded one is a different project.
- Branching on visitor *identity* (a recruiter path vs an engineer path).
- N26, the script editor. Separate ticket, and it needs this to exist first.

---

## Review log

Three passes over this document before any code, as Nam asked.

### Pass 1 — 27 Aug

Found: **the resumption rule was underspecified.** The first draft said "resume
where we left off", which contradicts Nam's own example (interrupted in 2, visits
5, then 3 → 4 → 6). Rewritten as "lowest-priority unplayed part", and the
played-set now includes click-visited parts, which is what makes the skip work.

Found: **no rule for clicking something already narrated.** Without it, a visitor
clicking around a part they just heard would get it read back to them. Added as
queue rule 1.

### Pass 2 — 27 Aug

Found: **`brief` was missing from the shape.** The queue rules referenced a short
version that the data model had no room for, so a long queue would have had
nothing to fall back to except truncating mid-sentence. Added as a third variant,
and the reason it matters — register, not just length — is now written down.

Found: **the cursor and the narration were assumed to be in lockstep.** They must
not be: if narration waits for the queue but the cursor also waits, a click looks
ignored for several seconds. Split them — cursor acknowledges immediately,
narration follows. This is now a stated mitigation rather than an implementation
accident.

Found: **hand-over had no defined end state.** It said "let them be" without
saying whether the tour could resume. Now explicitly terminal.

### Pass 3 — 27 Aug

Found: **`needs` was declared and never used.** A part that narrates the CV makes
no sense if the share is closed. Behaviour now specified: if a part's `needs` is
unmet, the director performs the beat that satisfies it first (open the share,
open the panel) rather than talking about something off screen. If it cannot,
the part is skipped rather than narrated blind.

Found: **reduced-motion was going to disable the whole feature.** That is the
easy call and the wrong one — it denies the content to the person who asked for
less movement. Corrected: cursor teleports, captions run.

Found: **no accessibility story for the cursor.** It is decoration and is now
`aria-hidden`, with the captions carrying the meaning. The clicks it performs are
real, so anything it opens is announced by the surface that opened.

Found: **the doc did not say where the tour can be stopped from.** Added: Stop is
visible from the first frame, and hand-over also ends it. Without a stated
answer this would have shipped with the only exit being "wait it out".

---

## Status

Plan reviewed three times. Ready to implement.
