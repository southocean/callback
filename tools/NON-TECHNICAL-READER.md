# The non-technical reader

A companion to `CV-PERCEPTION.md`. That doc asks *will this get Nam an
interview* and answers it by audience and by risk. This one asks a narrower
question:

> A person who does not write software opens this link, cold, on the first try.
> Where exactly do they get confused, and where do they start suspecting a scam?

Same tagging discipline as the sibling docs. **[measured]** is read off the
running build or the source. **[inference]** is reasoning that has not been
tested on a real person. **[open]** needs Nam.

Status: first pass, 2026-08-26. Nothing here is actioned.

Where `CV-PERCEPTION.md` already has a fix for something, this doc points at it
by number instead of restating it — M1, M2, M3 and M6 there do most of the heavy
lifting for this audience and are not repeated below.

---

## The governing constraint

The first audience is almost never an engineer. It is a recruiter, an HR
coordinator, a friend Nam sends it to for a sanity check, or a hiring manager's
assistant. **[measured]** — and the one real data point we have is exactly this:
a friend received the link and thought she had been sent a Google Meet
invitation.

That person's mental model is not "clever rebuild". It is one of three:

1. *Someone sent me a meeting link.* (Confusion — harmless but wasted.)
2. *This is a Google page.* (Confusion — actively bad, see R1/R4.)
3. *Something is trying to trick me.* (Fatal. They close it and may report it.)

Everything below is sorted by how fast it pushes a reader toward **3**.

The principle from the sibling doc holds and is worth restating, because half the
obvious fixes here violate it: **frame it, do not dilute it.** A fix that costs
the illusion is only worth it if it buys trust that cannot be bought another way.

---

## 1. The scam signals, worst first

### S1 — The browser asks for the camera · **severity: highest** · **[measured]**

`src/main.ts:60` calls `navigator.mediaDevices.getUserMedia`. To the build's
credit this is genuinely opt-in — `src/state.ts:165` notes it is only ever
reached from an explicit click, and `devlog.ts` records the decision that every
word of content stays reachable with zero permissions granted.

That is the right architecture and it does not solve the perception problem,
because the thing that frightens a non-technical reader is not the code. It is
**Chrome's own permission bar appearing on a page that is dressed as Google
Meet**. That is the exact shape of the scam they have been warned about: a page
imitating a known brand, asking for the camera.

An engineer reads that prompt as "ah, it wants to show me my own webcam in the
mock". A recruiter reads it as the moment the trap closes.

**Fix.** Never let the browser prompt be the first explanation. Put our own
sentence *in front of* the permission call, in the click that triggers it:

> Your camera stays on your device. Nothing is uploaded, recorded or sent —
> this page has no server. You can skip this and see everything anyway.

with **Skip** as the visually equal option. Cheap (~30m) and it converts the
scariest moment in the funnel into the most reassuring one, because it is the
only moment where the page can prove it understands what the reader is afraid of.

**[inference]** I would also default the lobby to camera-off with the prompt
never fired unless asked twice — but that is a product call, not a perception
one.

### S2 — A fake browser with a working address bar · **severity: high** · **[measured]**

This is new since `CV-PERCEPTION.md` was written and it is not in that risk
register.

The screen-share surface now contains an emulated Windows desktop with an
emulated Chrome inside it: tab strip, back/forward/reload, and an address bar
that accepts a typed URL and loads the real site in an iframe. `frame-src` was
widened to `'self' https:` to make that work.

A browser drawn inside a web page, with a working URL bar, is not a neutral
object. It is one of the canonical phishing patterns — the picture-in-picture
attack — and it is the single most technically impressive thing in the build.
Those two facts are both true and they are in direct conflict.

**[inference]** For a non-technical reader the risk is not that they are fooled
into typing a password. It is simpler: they cannot tell which browser is which,
so they stop trusting the surface they are on.

**Fix.** Do not remove it. Label it. The emulated Chrome should carry a small,
permanent, non-dismissible tag in its own chrome — *"Not a real browser · part of
this CV"* — and the emulated desktop the same. One line of text keeps the trick
and removes the ambiguity. Anything that is a convincing copy of a trust surface
needs to say so on its face.

### S3 — The first paint says "Google Meet" · **severity: high** · **[measured]**

Still live, in the static shell that renders before JavaScript:

```html
<span class="lk-google">Google</span><span class="lk-meet">Meet</span>
```

`src/index.html:130`, with `meet-mark.png` beside it. The hydrated version
correctly becomes "Meet Nam Nguyen"; the shell does not. On a slow phone the
first thing a reader sees is a page claiming to be Google Meet.

This is `M2` in the sibling doc, estimated at 15 minutes, and it is still
outstanding. For this audience it is the highest value-per-minute item on either
list.

### S4 — No sender, no purpose, no way to verify · **severity: medium** · **[inference]**

A cautious non-technical reader does three things before trusting a page: looks
for a name they recognise, looks for a way to check it is really that person, and
looks for who is asking. This page offers a name (`Nam Nguyen`) and nothing to
tie it to a verifiable human.

**Fix.** One line in the footer of the landing view and in the `#plain`
document: a LinkedIn link, plus *"An independent personal project. Not
affiliated with, endorsed by, or connected to Google."* The disclaimer is `M5`;
the LinkedIn link next to it is the addition. A recruiter can cross-check a
LinkedIn profile in four seconds, and that is the cheapest trust primitive
available.

---

## 2. The comprehension failures

Not scary — just costly. Each one is a reader concluding *this is not for me*.

### C1 — The site opens on a task, not on an answer · **severity: high**

The default landing view asks the visitor to join a call. **[measured]** The
escape hatch exists and reads *"Short of time? Read this as a plain document
instead"* (`src/index.html:181`) — genuinely good copy, and it competes with a
large blue **Join** button.

Covered as R3/M7 in the sibling doc. The only thing to add for this audience:
`M7` (send recruiters `#plain` directly) is worth more here than anywhere else,
because it removes the decision entirely rather than making it easier.

### C2 — The jargon inventory · **severity: medium** · **[measured]**

Every string below is user-visible. The right-hand column is what a
non-technical reader would need instead. Most are inside the call, so this is
second-pass polish rather than a gate — but the Engineering panel is the single
densest patch of language in the build and it is one click from the bar.

| Visible now | Reads as | Plain version |
|---|---|---|
| `Spec` | a filing category | *What it copies* |
| `Design` | fine | fine |
| `Tests` | fine, if it says what passing means | *Tests — click Run* |
| `Accessibility` | fine | fine |
| `Size & perf` | two abbreviations | *Speed & size* |
| `Effects` | fine | fine |
| `Network` | a settings screen | *Bad-connection demo* |
| `The job ad` | good — keep | — |
| `Meeting tools` | Meet's own label for the panel | fine, but it holds the engineering content, which is a mismatch |
| `Side quests 8/17` | a game score in a CV | *Things to find: 8 of 17* |
| `Presentation audio` | Meet's own chrome | leave — fidelity wins here |
| `Enter a code or link` | asks for something they do not have | leave, but never focus it first |
| `Off the clock` | fine and charming | — |

**[inference]** `Side quests` is the one I would actually change. In the call bar
and on the end screen a bare fraction reads as a score the reader is being
graded on, and a non-technical reader who does not find all 17 may read it as
having failed at a CV.

### C3 — The mock OS has grown past the point of self-explanation · **severity: medium** · **[measured]**

The recent run added Task View, desktop icons, a marquee selection, a context
menu, window snapping, a system tray, quick settings, a calendar, Start search
and a power menu — on top of the file explorer, the browser and the media player.

For an engineer this is the payoff. For a non-technical reader it is a Windows
desktop that has appeared inside a video call inside a CV, with no statement of
why. **[inference]** The likely reaction is not suspicion, it is *"I have gone
somewhere I was not meant to go"* — and the instinct that follows is to press
Back, which leaves the artefact entirely.

**Fix.** Two things, both cheap. A caption strip on the share surface saying
what it is and why: *"A working Windows desktop, drawn in the browser — the files
are Nam's real projects. Nothing here is installed on your computer."* And a
visible way back to the CV from inside it, which is currently reachable only by
stopping the share.

### C4 — Dead-looking controls · **severity: low–medium** · **[measured]**

The build's rule is that a control which cannot act is not rendered as a
control, and disabled rows take no hover. That is the correct rule and it is
followed.

The gap is that a non-technical reader does not read *absence of hover* as
*deliberately inert*. They read a greyed-out row as something they failed to
click properly. **[inference]** Two or three of those in a row and the
conclusion is "this is broken", which is the worst possible read of a project
whose whole argument is rigour.

**Fix.** Give the disabled rows a tooltip that says why: *"Not part of this CV —
the real Meet does this."* It converts three apparent bugs into three
demonstrations of fidelity.

### C5 — "Last updated in March" · **severity: medium, five-minute fix** · **[measured]**

Still present in both places: `src/index.html:196` and `src/ui/home.ts:549`.

> "One participant. He has been waiting since March, when the CV was last
> updated."

It is August. The joke is about the waiting participant; the clause a skimming
reader keeps is *last updated in March*, which is false and damaging. This is
`M3`, estimated at five minutes, still outstanding. Derive it from the build date
or cut the clause.

---

## 3. What a non-technical reader should hit, in order

The target funnel, if all of the above were done. Offered as a design target,
not as a claim about the current build.

1. **Zero seconds.** A line at the top: whose CV, what job, and that it is not
   Google. Dismissible, remembered.
2. **Five seconds.** Name, title, location, and one sentence of what he does —
   without clicking anything.
3. **Ten seconds.** A visible, equal-weight choice: *read it as a document* or
   *open the interactive version*.
4. **Thirty seconds, document path.** The whole CV, printable, verifiable, with
   a LinkedIn link and the disclaimer.
5. **Any point, interactive path.** Every surface that imitates something real —
   the browser, the desktop, the permission prompt — says on its face that it is
   part of a CV.

Steps 1, 2 and 3 are `M1`, `M2` and `M7` in the sibling doc. Steps 4 and 5 are
this doc's additions: the LinkedIn link (S4) and the labelling of the imitation
surfaces (S2, C3).

---

## 4. The honest tension

Four of the fixes above — the permission preamble, the "not a real browser" tag,
the desktop caption, the framing strip — all put text between the reader and the
illusion. Every one of them makes the trick slightly less startling.

**[inference]** That trade is worth taking, and the reasoning is not about
politeness. The illusion's value is entirely in the reader *realising* it was an
illusion. A reader who never works out what they were looking at has not been
impressed; they have been confused, and confusion converts to nothing. The label
is not a tax on the trick — it is the thing that lets the trick land.

The one place I would not add text is Meet's own chrome. `Presentation audio`,
`Stop presenting`, `Enter a code or link` are the real product's words and
changing them costs fidelity for no trust gain. The labels belong on the
surfaces that imitate a **trust boundary** — a browser, an operating system, a
permission prompt — and nowhere else.

---

## 5. Ranked, with effort

| # | Fix | Buys | Effort |
|---|---|---|---|
| 1 | `M2` — static shell stops saying "Google Meet" | kills the worst first impression | 15m |
| 2 | `M3` — delete "since March" | removes a false, damaging claim | 5m |
| 3 | S1 — our own sentence before the camera prompt | defuses the scariest moment | 30m |
| 4 | `M1` — framing strip on first visit | answers *what is this* | 1h |
| 5 | S4 — LinkedIn link + disclaimer line | makes the person verifiable | 20m |
| 6 | S2 — "not a real browser" tag | removes a phishing pattern | 20m |
| 7 | C3 — caption + a way back on the share | stops the reader feeling lost | 45m |
| 8 | C4 — tooltips on disabled rows | turns three bugs into three proofs | 30m |
| 9 | C2 — rename `Side quests`, `Spec`, `Network` | stops the panel reading as internal tooling | 30m |
| 10 | `M7` — send recruiters `#plain` | removes the decision entirely | free |

Items 1, 2, 4 and 10 are already in `CV-PERCEPTION.md`; they are repeated in the
ranking only so this list is usable on its own.

---

## 6. Open questions for Nam

- **[open]** Who is the actual first reader — a Google recruiter, or a friend or
  contact who forwards it? The order changes which of S1–S4 matters most.
- **[open]** Is the interactive version meant to be *discovered*, or is it the
  main event? If it is the main event, `M7` is wrong and the framing strip has to
  do all the work.
- **[open]** Would you accept a permanent, small "part of a CV" tag on the
  emulated browser and desktop? It is the one fix here that touches the illusion
  on every visit rather than only the first.
