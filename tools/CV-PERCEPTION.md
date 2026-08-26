# CV perception analysis

A working doc. How this CV is likely to be *read* by the people who decide
whether Nam gets an interview — and what to change so the bet pays off.

Same tagging discipline as the other docs in this folder: **[measured]** means
read off the running build, **[inference]** is reasoning that has not been
verified, **[open]** is a question only Nam can answer. Keep them separate.

Status: first pass 2026-08-26; non-technical-reader pass merged in the same day.
Nothing here has been actioned yet — Nam authorises the fixes himself.

Section 4b ranks the subset that matters for a **non-technical first reader**,
which is a different order from the main list.

---

## 0. The one data point we have

Nam sent the link to a friend. She thought he had sent her a Google Meet
invitation. She did not realise it was a CV.

That is the whole analysis in miniature, and it cuts both ways:

- **The fidelity works.** A real person, given no context, could not tell the
  clone from the product. That is the hardest thing this project set out to do
  and it is done.
- **The artefact has no frame.** She was not confused about the *quality*. She
  was confused about the *category*. She could not tell what kind of thing she
  was looking at.

The usual conclusion drawn from this is "it is too faithful, dial it back."
That is the wrong conclusion, and following it would destroy the only thing here
that no other candidate has. A trompe-l'œil painting in a gallery is a marvel;
the same painting on a bare wall with no placard is a confusing wall. The
problem is not the painting. It is the missing placard.

**So the strategy for everything below is: frame it, do not dilute it.**

---

## 1. Who actually touches this, and in what order

This matters more than any individual fix, because the clone is built for an
audience that is usually *second* in the queue.

| # | Who | Time they give it | What they need | How the clone lands |
|---|-----|------------------|----------------|---------------------|
| 1 | **Recruiter / sourcer** | 30–60s, triaging dozens | Years of experience, current title, location, work authorisation, "plausibly qualified?" | **Badly.** Non-engineer, no context, no time. Cannot find the facts. |
| 2 | **Hiring manager / tech lead** | 2–10 min if intrigued | Can this person build hard front-end things? Judgement? Rigour? | **This is who it is for.** Likely decisive. |
| 3 | **Interview loop** | Skims before the session | Something to ask about | **Excellent.** `How this was built` is exactly the artefact they want. |
| 4 | **Mail filter / IT** | 0s, automated | Is this link safe? | **Risk.** Unfamiliar host, Google branding, unsolicited. |

**The structural problem: the recruiter is a gate, not an audience.** The payoff
is at stage 2, but stage 1 decides whether stage 2 ever happens. Right now the
artefact is optimised end-to-end for stage 2.

The design goal is therefore not "make it appeal to recruiters" — it never will,
and it should not try. It is: **survive stage 1 intact, then delight stage 2.**

---

## 2. Risk register

Ranked by expected cost to getting an interview, not by how easy they are to fix.

### R1 — It reads as a real Google product, or as phishing · **severity: high**

The friend incident is the proof. Three things compound it:

- **[measured]** Before JavaScript runs, the static shell in `docs/index.html`
  renders the Meet mark and the literal words **"Google Meet"**. Only after
  hydration does it become "Meet Nam Nguyen". On a phone on a slow connection,
  the first thing a recruiter sees is a page presenting itself as Google Meet.
- **[measured]** The URL is `southocean.github.io/callback`. No name, no "cv".
  `callback` is a good pun and communicates nothing to someone who has not got
  the joke yet.
- **[measured]** The GitHub account is `southocean`; the CV is for Nam Nguyen.
  A cautious reader checking the host finds a name that does not match.

A recruiter who half-suspects phishing does not investigate. They close the tab,
and in a well-run organisation they may report the link. This is the only risk
on the list with a plausible path to a *negative* outcome rather than a neutral
one.

Worth noting: the build is already unusually clean on this front — strict CSP,
no third-party origins except Google Fonts, no backend, nothing uploaded
**[measured]**. That is a genuine anti-phishing credential. It is just not
visible at the moment someone is deciding whether to trust the page.

### R2 — Nothing above the fold says who this is · **severity: high**

**[measured]** The default landing view's visible words are: *Meet Nam Nguyen ·
Enter a code or link · Join · New · Wed, Aug 26 · Short of time? Read this as a
plain document instead · Scheduled · Now · Nam's interview · Join · One
participant… · Download the PDF · How this was built.*

The name is there. A **job title is not**. Neither is a location, a seniority, or
the word "CV" anywhere except inside a sentence in the small print. A recruiter's
first job is to answer "who is this and what do they do" — and the answer is
available only by clicking through or reading a footnote.

### R3 — The content is behind an interaction · **severity: high**

**[measured]** The actual CV lives at `#plain` and it is *good* — clean, printable,
name and headline and contact at the top, real experience bullets. It is the
strongest recruiter-facing asset in the project and it is one click off the
default path, behind a banner competing with a large blue **Join** button.

Every click is a drop-off. The default path asks the visitor to join a call and
then discover that folders and a screen share contain the content.

### R4 — Trademark use · **severity: medium, decision already made**

**[measured]** The build uses the Meet mark, Google wordmarks and Product Sans.

Nam has already decided this is fine and that decision stands — it is his
application and his call. Recording it here only because the ask was a list of
*perception* risks and this is one: a recruiter almost certainly will not care,
but a brand or legal reader might, and there is an available (unfair, but
available) reading of "casual with someone else's IP". The mitigation is one
line of text, not a redesign — see M5.

### R5 — The page tells everyone the CV is five months stale · **severity: medium, trivial fix**

**[measured]** `src/ui/home.ts:549` and `src/index.html:196` hardcode:

> "One participant. He has been waiting since March, when the CV was last updated."

Today is August. The line is a joke about the waiting participant, but the clause
a skimming recruiter takes away is **"last updated in March"** — which is both
damaging and false, since the CV has been worked on continuously.

### R6 — The jump-scare · **severity: medium**

**[measured]** Raising your hand triggers `slap()`: a 42vmin hand lunging at the
viewer, a full-screen white flash peaking at 26% opacity, and a four-beat shake
of the entire interface.

Two problems.

1. **[measured]** It is the only animation in the build with **no
   `prefers-reduced-motion` guard.** Every other animation added this month has
   one. Applying to Google — where accessibility is a stated cultural value —
   the single effect that ignores the user's OS accessibility setting is a
   conspicuously bad thing to be caught on. It is also the kind of detail an
   interviewer who *likes* the project might go looking for.
2. **[inference]** Startle effects are high-variance. On the right reader it is
   the moment they remember. On a reader with vestibular sensitivity, or one
   demoing the link on a shared screen in a meeting, it is the moment they
   close the tab. The upside is a smile; the downside is a bad taste. That is
   not a good trade on an artefact whose job is to get past a gate.

Not arguing for deleting it — it is the one deliberate act of personality in an
otherwise deferential clone, and that has value. Arguing that it should respect
reduced-motion and probably be discovered rather than triggered by a control a
first-time visitor is likely to press.

### R7 — Mobile is where triage happens, and mobile is the weak surface · **severity: medium**

**[measured]** At 375×812 the call view renders, but the tile is small in a large
field of black and the bottom control bar runs off the right edge. The mock OS
and screen share — the strongest work in the project — are desktop-only
showpieces.

**[inference]** Recruiters triage on phones between meetings. If the first open
is on mobile, the visitor gets the least impressive version of the artefact plus
the most confusing version of the branding (see R1).

### R8 — Application channel vs. artefact · **severity: unknown, possibly high** · **[open]**

If the application goes through the Google Careers portal, the portal wants a
file. A link is a supplement, not a submission, and may not be looked at at all
before the résumé screen. In that case the **PDF is the primary artefact** and
everything above is about the secondary one.

**[measured]** `docs/NamNguyen_CV_2026.pdf` exists (64 KB). Nobody has assessed
whether it is good, whether it mentions the site, or whether it survives an ATS
parse.

### R9 — The effort could be read as poor prioritisation · **severity: low–medium** · **[inference]**

An unsympathetic reader sees "spent months pixel-cloning a product I do not work
on" and thinks *fandom*, or *cannot scope*, or *would gold-plate a sprint*.

The defence already exists and is strong — the project is framed around
*measurement*, not admiration: fingerprint harnesses, a CSS dead-code build gate,
a 50 KB budget enforced in CI, measured-vs-inferred tagging throughout. That is a
senior engineering story, not a fan project. But the framing has to arrive before
the impression does, and right now it lives one click deep in "How this was
built".

### R10 — The link says nothing when pasted · **severity: low**

**[inference]** Recruiters forward links into ATS notes, Slack and email.
`southocean.github.io/callback` carries no meaning in a list. `og:title` is
"Meet Nam Nguyen" **[measured]**, which in a link preview reinforces "this is a
meeting invitation" rather than "this is a CV".

### R11 — The browser asks for the camera · **severity: highest for a non-technical reader** · **[measured]**

`src/main.ts:60` calls `navigator.mediaDevices.getUserMedia`. To the build's
credit this is genuinely opt-in — `src/state.ts:165` records that it is only ever
reached from an explicit click, and `devlog.ts` logs the decision that every word
of content stays reachable with zero permissions granted.

That is the right architecture and it does not solve the perception problem,
because what frightens a non-technical reader is not the code. It is **Chrome's
own permission bar appearing on a page dressed as Google Meet**. That is the
exact shape of the scam they have been warned about: a page imitating a known
brand, asking for the camera.

An engineer reads that prompt as "it wants to show me my own webcam in the mock".
A recruiter reads it as the moment the trap closes. This is the single fastest
route from *confused* to *reporting the link*.

### R12 — The emulated browser is a phishing pattern · **severity: high** · **[measured]**

New since this register was first written. The screen-share surface now contains
an emulated Windows desktop holding an emulated Chrome: tab strip, back, forward,
reload, and an address bar that accepts a typed URL and loads the real site in an
iframe. `frame-src` was widened to `'self' https:` to allow it.

A browser drawn inside a web page, with a working URL bar, is one of the
canonical phishing patterns — the picture-in-picture attack. It is also the most
technically impressive thing in the build. Both are true at once.

**[inference]** For a non-technical reader the risk is not that they are fooled
into typing a password. It is simpler and worse: they lose track of which browser
is real, so they stop trusting the surface they are standing on.

### R13 — The disclaimer says something the build contradicts · **severity: high** · **[measured]**

`src/data/cv.ts`, `meta.disclaimer`, rendered in the `#plain` footer:

> "Not affiliated with, endorsed by, or built at Google. **No Google marks are
> used.** This is an homage to a product I like…"

The build uses `meet-mark.png` and renders the literal words "Google" and "Meet"
in the static shell (`src/index.html:129-131`), which is R4's own measurement.
The disclaimer is therefore false on its face.

A disclaimer that is itself untrue is worse than no disclaimer. It is read at
exactly the moment a cautious reader is deciding whether to trust the page, and a
reader who notices the contradiction has been handed a reason to distrust
everything else on it. The fix is one clause, not a redesign: drop the sentence,
or replace it with something true — *"Google marks are used to identify the
product this imitates."*

### R14 — The plain CV has never had a pass of its own · **severity: high** · **[measured]**

Nam: "we've never worked on that resume." Confirmed on reading it. It is
structurally sound and the content is real, but for the audience that will
actually be sent it, four things are wrong:

- **Work authorisation is missing from the document entirely.** `profile.commute`
  holds *"38 minutes from the Stockholm office. No relocation, no visa
  sponsorship needed"* — the single most decisive fact for a recruiter screening
  an international applicant — and `src/ui/plain.ts` never renders it. It is in
  the data and nowhere on the page.
- **The footer is written for engineers.** The last thing a reader sees is
  *"Build {commit} · 17.3 kB of JavaScript, gzipped · no dependencies · no
  third-party requests"*. On a CV that is noise, and it is the closing
  impression. It is also `no-print`, so the printed PDF loses the disclaimer with
  it.
- **No date anywhere.** A CV with no "updated August 2026" invites the reader to
  guess — and the landing page currently guesses for them, wrongly, at March
  (R5).
- **`skills.volume` measures lines of code.** *"Over 10,000 lines: C, C++, C#,
  Dart, Java, JavaScript"* reads as padding to a non-technical reader and as a
  weak proxy to a technical one. **[inference]** Years or shipped systems would
  carry the same claim with more weight.

Two smaller ones: the "Against this job ad" section marks partial matches with a
bare `~` that is never explained, and there is no line telling a reader who
landed on `#plain` directly what the interactive version is or why it exists.

### R15 — The mock OS has outgrown self-explanation · **severity: medium** · **[measured]**

The recent run added Task View, desktop icons, marquee selection, a context menu,
window snapping, a system tray, quick settings, a calendar, Start search and a
power menu, on top of the file explorer, the browser and the media player.

For an engineer this is the payoff. For a non-technical reader it is a Windows
desktop that has appeared inside a video call inside a CV, with no statement of
why. **[inference]** The reaction is probably not suspicion but *"I have gone
somewhere I was not meant to go"* — and the instinct that follows is Back, which
leaves the artefact entirely. There is currently no route from inside the share
back to the CV except stopping the share.

### R16 — Jargon, and controls that look broken · **severity: medium** · **[measured]**

Two small things with the same effect: the reader concludes this is not for them,
or that it is faulty.

The visible labels, and what they cost:

| Visible now | Reads as | Plain version |
|---|---|---|
| `Side quests 8/17` | a score the reader is being graded on | *Things to find: 8 of 17* |
| `Spec` | a filing category | *What it copies* |
| `Size & perf` | two abbreviations | *Speed & size* |
| `Network` | a settings screen | *Bad-connection demo* |
| `Meeting tools` | Meet's own label, but it holds the engineering panel | mismatch worth renaming |
| `Presentation audio`, `Enter a code or link` | Meet's own chrome | **leave** — fidelity wins, no trust gained by changing |

And the dead controls: the build's rule is that a control which cannot act is not
rendered as one, and disabled rows take no hover. Correct rule, correctly
followed. The gap is that a non-technical reader does not read *absence of hover*
as *deliberately inert* — they read a greyed row as a click that failed.
**[inference]** Two or three of those and the conclusion is "this is broken",
which is the worst available reading of a project whose entire argument is rigour.

---

## 3. What is working — do not dilute any of this

Listed because the mitigations below must not cost any of it.

- **The concept is genuinely differentiated.** Most senior front-end CVs are a
  PDF and a portfolio site. This is neither, and it is memorable. The friend
  incident is evidence it clears the "is this actually good" bar, not just the
  "is this different" bar.
- **The `#plain` document is structurally sound** **[measured]** — a real CV:
  name, headline, contact, a summary that connects real-time multiplayer to video
  calling, dated roles with substantive bullets. *Revised 2026-08-26: the earlier
  "excellent" was too generous. It has never had an editorial pass of its own and
  it omits work authorisation entirely — see R14. The bones are right; the
  content needs a read.*
- **"How this was built" is the artefact an interviewer wants.** Scope,
  timeline, method, stack, sourced from the build log.
- **The engineering receipts are real and rare**: zero runtime dependencies,
  17 KB gzip initial payload against a 50 KB budget gated in CI, 54 tests, a
  build that fails on dead CSS **[measured]**. Very few candidates can show a
  budget enforced in CI.
- **The accessibility work is now substantial and on-message** — roving
  tabindex patterns, live regions, named dialogs, keyboard window management,
  reduced-motion coverage. For Google specifically this is one of the highest
  value things in the project, and it is currently invisible from the outside.
- **The measurement discipline** — separating "I measured this" from "I believe
  this" — is a strong senior signal and shows up throughout the docs.
- **The security posture** — strict CSP, no third-party calls, no backend,
  "nothing here is uploaded and there is no backend" already written into the
  UI **[measured]**.

---

## 4. Mitigations

Ordered by leverage per hour of work. Effort estimates are rough.

### Tier 1 — before this goes to anyone at Google

**M1 · A framing strip, first visit only** · ~1h
A slim bar pinned above everything on first load. Not a modal, not a
click-through — it must not become the thing standing between the visitor and
the work.

> **This is Nam Nguyen's CV.** An interactive one, rebuilt from Google Meet.
> Not affiliated with Google. · **Read it as a normal document →** · ✕

Dismissal persists. Kills R1 and R2 at once, and does more for R3 than any other
single change.

**M2 · Fix the pre-JS shell** · ~15m
Change the static lockup in `src/index.html` from "Google Meet" to
"Meet Nam Nguyen", matching what the hydrated version already shows. The window
in which the page claims to be Google Meet should not exist. (R1)

**M3 · Delete "since March"** · ~5m
Derive from the build date, or cut the clause. (R5)

**M4 · `prefers-reduced-motion` on the slap** · ~15m
Bring the one hold-out into line with the rest of the build. (R6)

**M5 · A disclaimer line** · ~15m
Footer of the landing view and a line in the `#plain` document: *"An independent
personal project. Not affiliated with, endorsed by, or connected to Google."*
Closes R4 at its cheapest and reinforces R1.

**M6 · A URL that says what it is** · ~30m–2h
Cheap version: rename the repo path to `nam-nguyen-cv`. Strong version: a custom
domain (`namnguyen.dev` or similar) pointed at GitHub Pages. A personal domain is
the single most effective anti-phishing move available and it is worth the
€10/year on its own. (R1, R10)

### Tier 2 — raises the ceiling

**M7 · Two entry points, one site** · ~30m
Send recruiters `…/#plain` and engineers the root. Same artefact, audience-matched
first impression. Almost free, and it neutralises most of the stage-1 risk
without touching the clone at all. (R2, R3)

**M8 · A guided tour** · ~3–5h
A "Show me the highlights (60s)" button that *drives the demo itself* — opens the
share, walks the folders, surfaces the three things worth seeing, narrating in a
caption strip. A non-technical visitor should be able to see the payoff without
knowing what to click. This is also, not incidentally, an impressive thing to
have built. (R3)

**M9 · Surface the receipts on the landing view** · ~1h
One line under the meeting card: *"No frameworks, no dependencies, 17 KB. 54
tests. Built from measurements of the real client — how →"*. Converts R9 from a
risk into a strength before the reader forms an impression.

**M10 · Mobile pass on the call view** · ~3–4h
Fix the control-bar overflow; decide what the phone experience *is* rather than
letting it be a degraded desktop. Legitimate answer: on a phone, default to
`#plain` and offer the call as a choice. (R7)

**M11 · Audit the PDF** · ~1–2h
Read it as a recruiter. Does it stand alone? Does it carry the link and one line
explaining it? Does it survive an ATS text extraction? (R8)

**M12 · Fix the `og:` card** · ~30m
`og:title` → "Nam Nguyen — Senior Front-End Engineer"; description leads with CV,
not with the call. The link preview is often seen *before* the click. (R10)

### Tier 1b — the non-technical reader (added 2026-08-26)

**M16 · Our sentence before the browser's permission prompt** · ~30m
The click that triggers `getUserMedia` shows our own copy first, with **Skip** as
a visually equal option:

> Your camera stays on your device. Nothing is uploaded, recorded or sent — this
> page has no server. You can skip this and see everything anyway.

Converts the scariest moment in the funnel into the most reassuring one, because
it is the only place the page can prove it knows what the reader is afraid of.
(R11)

**M17 · Fix the disclaimer** · ~5m
Drop "No Google marks are used" or replace it with something true. A false
disclaimer is worse than none. (R13, R4)

**M18 · Put work authorisation on the CV** · ~10m
Render `profile.commute` in the `#plain` header block. It is already in the data.
For an international applicant it is the most decisive line on the page. (R14)

**M19 · Label the imitation surfaces** · ~20m
A small permanent tag in the emulated Chrome's own chrome — *"Not a real browser ·
part of this CV"* — and the same on the emulated desktop. Keeps the trick,
removes the ambiguity. Anything that convincingly copies a **trust boundary**
needs to say so on its face. (R12, R15)

**M20 · A caption and a way out on the share surface** · ~45m
One line saying what the desktop is and that nothing is installed, plus a visible
route back to the CV from inside it. (R15)

**M21 · Rewrite the `#plain` footer for a human** · ~20m
Move the build receipts behind a link; keep a date, the disclaimer and one line
explaining the interactive version. Make the disclaimer printable. (R14)

**M22 · Tooltips on the disabled rows** · ~30m
*"Not part of this CV — the real Meet does this."* Converts three apparent bugs
into three demonstrations of fidelity. (R16)

**M23 · Rename the four worst labels** · ~30m
`Side quests` → *Things to find*, `Spec` → *What it copies*, `Size & perf` →
*Speed & size*, `Network` → *Bad-connection demo*. Leave Meet's own chrome
untouched. (R16)

### Tier 3 — if there is time

**M13 · A 20-second screen recording** to paste into the email itself. Solves
"do not click unknown links" by showing what is behind the link before it is
clicked. Probably the highest-leverage item on this whole list per minute spent.

**M14 · Surface the accessibility work.** A short section in "How this was
built": what was audited, what was found, what was fixed. For this employer it
is a differentiator and currently nobody can see it.

**M15 · Make the scare discoverable rather than front-loaded** — move it off the
raise-hand control onto something a curious second-pass visitor finds. Keeps the
personality, removes the ambush. (R6)

---

## 4b. Ranked for the non-technical first reader

The whole list above is ordered by leverage for *getting an interview*. This one
is ordered by a narrower question: **how fast does each item push a
non-technical reader toward thinking this is a scam, or toward giving up?**
Awaiting Nam's authorisation; nothing here is actioned.

| # | Fix | What it stops | Effort | Status |
|---|-----|---------------|--------|--------|
| 1 | **M2** — static shell stops saying "Google Meet" | the first paint claiming to *be* Google | 15m | **[measured]** still live at `src/index.html:129-131` |
| 2 | **M17** — fix the false disclaimer | a reader catching the page in a lie | 5m | new |
| 3 | **M3** — delete "since March" | a false, damaging staleness claim | 5m | **[measured]** still live in two files |
| 4 | **M16** — our sentence before the camera prompt | the single scariest moment in the funnel | 30m | new |
| 5 | **M18** — work authorisation on the CV | a recruiter screening out an international applicant | 10m | new |
| 6 | **M1** — framing strip on first visit | *what am I even looking at* | 1h | from Tier 1 |
| 7 | **M19** — label the emulated browser and desktop | a live phishing pattern | 20m | new |
| 8 | **M7** — send recruiters `#plain` directly | the decision, entirely | free | from Tier 2 |
| 9 | **M21** — rewrite the `#plain` footer | build receipts as the closing impression | 20m | new |
| 10 | **M20** — caption and a way out of the share | the reader feeling lost and pressing Back | 45m | new |
| 11 | **M22** — tooltips on disabled rows | three apparent bugs | 30m | new |
| 12 | **M23** — rename the four worst labels | the panel reading as internal tooling | 30m | new |

Rows 1–5 are seventy minutes of work between them and remove every item on this
list that can produce a *negative* outcome rather than a neutral one.

### The tension, stated

Four of these — M16, M19, M20 and M1 — put text between the reader and the
illusion, and each makes the trick slightly less startling.

**[inference]** That trade is worth taking, and not for politeness. The
illusion's value is entirely in the reader *realising* it was an illusion. Someone
who never works out what they were looking at has not been impressed — they have
been confused, and confusion converts to nothing. The label is not a tax on the
trick; it is what lets the trick land.

The line to hold: labels belong on surfaces that imitate a **trust boundary** — a
browser, an operating system, a permission prompt. Meet's own chrome keeps its
own words. Changing `Presentation audio` costs fidelity and buys no trust.

---

## 5. How it is sent matters as much as what is sent

Free, and it does the framing the site cannot do for itself.

- **The message body carries the placard.** One line, before the link:
  *"My CV is an interactive rebuild of the Google Meet web client — it is a
  working front-end, not a mockup. Plain version here if you would rather just
  read it: [link]. Interactive version: [link]."*
- **Always attach the PDF.** Never make the link the only route to the facts.
- **Lead with the plain link for recruiters, the interactive one for engineers.**
- **A referral collapses most of R1.** A warm introduction means the recruiter
  trusts the source before they open the link, and nearly every trust risk on
  this list evaporates. If a referral is available at all, it is worth more than
  every mitigation above combined.

---

## 6. Open questions for Nam

Answers change the priority order significantly.

1. **Channel** — careers portal, recruiter email, LinkedIn, or referral? If it is
   the portal, M11 (the PDF) jumps to the top of Tier 1.
2. **Referral** — is one available? See above.
3. **Domain** — do you own one, or want one? Decides the cheap-vs-strong version
   of M6.
4. **Repo visibility** — is `southocean/callback` public, and do you want it to
   be? A public repo is strong evidence for stage 2 and another identity
   mismatch for stage 1.
5. **The scare** — how attached are you? M4 is not negotiable; M15 is.
6. **Name consistency** — worth putting "Nam Nguyen" on the GitHub profile so a
   cautious reader checking the host finds the right person.

---

## 7. The bet, stated plainly

The bet is: *a hiring manager who sees this will want to talk to me.*

That bet is almost certainly correct, and nothing in this document argues with
it. Every risk above is about the same thing — **the bet is currently being
placed on a table the manager may never reach**, because the artefact asks a
recruiter to work out what it is before it tells them.

The fix is not less ambition. It is a placard on the wall next to the painting.
Tier 1 is roughly a day's work and it removes almost all of the downside without
touching a pixel of the thing that makes it worth sending.

---

## Decision log

| Date | Decision | By |
|------|----------|-----|
| 2026-08-26 | Doc created. Nothing actioned yet. | — |
| 2026-08-26 | Merged the non-technical-reader pass in: R11–R16, M16–M23, section 4b. Nam authorises fixes himself; nothing actioned. | — |
| 2026-08-26 | Revised the "`#plain` is excellent" line — it has never had an editorial pass and omits work authorisation. | — |
