# CV perception analysis

A working doc. How this CV is likely to be *read* by the people who decide
whether Nam gets an interview — and what to change so the bet pays off.

Same tagging discipline as the other docs in this folder: **[measured]** means
read off the running build, **[inference]** is reasoning that has not been
verified, **[open]** is a question only Nam can answer. Keep them separate.

Status: first pass, 2026-08-26. Nothing here has been actioned yet.

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

---

## 3. What is working — do not dilute any of this

Listed because the mitigations below must not cost any of it.

- **The concept is genuinely differentiated.** Most senior front-end CVs are a
  PDF and a portfolio site. This is neither, and it is memorable. The friend
  incident is evidence it clears the "is this actually good" bar, not just the
  "is this different" bar.
- **The `#plain` document is excellent** **[measured]** — a real CV: name,
  headline, contact, a summary that connects real-time multiplayer to video
  calling, dated roles with substantive bullets. It just needs to be easier to
  reach.
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
