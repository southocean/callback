# Prompt for the next session

Copy everything below the line.

---

Work on the project at `C:/projects/friends/callback` — an interactive CV built
as a working replica of Google Meet. TypeScript, no framework, zero runtime
dependencies. `src/` is the source, `docs/` is the built site that GitHub Pages
serves at https://southocean.github.io/callback/. Read `README.md` and
`tools/QA.md` first, then `tools/CALL-VIEW-WORKORDER.md`, which is your task
list for this session.

## The discipline that matters here

This project's whole claim is that the interface was **measured**, not
approximated: computed styles, bounding boxes and transition curves read off
`meet.google.com` and reimplemented. The Spec and Design panels inside the app
publish every number so a reader can check the work, and there is a test
asserting that every measured token names where it came from.

So: never write a plausible-looking number. If you have not read a value off the
live product, either go and read it or leave it out and say so. Code comments in
this repo explain *why* a value is what it is and what was got wrong before —
match that voice, it is load-bearing documentation, not decoration.

`npm run verify` runs typecheck + 44 tests + the build with a hard 50 kB gzip
budget on the initial payload, enforced in CI. It must stay green. `npm run
serve` serves `docs/` on :4173.

## Your job this session

Build the in-call view batch in `tools/CALL-VIEW-WORKORDER.md`. Eight items:
reactions, the clipped messages panel, the reactions tray shrinking the video
frame, CC doing the same, the augmented screen share, the raise-hand jump scare,
picture-in-picture, and a general sweep of everything else in the call.

**Measure first, in one thorough pass, before building anything.** Drive the real
Google Meet in the user's Chrome (the `claude-in-chrome` tools — his Google
session is already signed in) and:

- Screenshot every state, before and after every interaction, click and hover
  both. Nam wants these explicitly as the QA benchmark to check the build
  against, so a state with no screenshot cannot be verified later.
- When an interaction spawns new UI, work that new surface the same way and
  screenshot it too. Keep cascading until nothing new appears — menus, trays,
  tooltips, panels, pickers, and hover states on things that only exist after a
  click.
- Record per surface: box, fill, radius, shadow, padding, gaps, type, ink,
  transition property/duration/easing, ARIA role and state.

Then fill in the `MEASURE:` lines in the work order and build against them.

Traps, already paid for once:

- `Use Companion mode` sits right under `Join now` in the green room and is easy
  to mis-hit; it loads a different screen with no video frame. Hang up, rejoin.
- Clicking `Join now` by element ref focuses it without pressing it. Click by
  coordinate and confirm the tile appeared.
- Only one session can hold the call. If Meet offers `Switch here` instead of
  `Join now`, Nam is in it elsewhere and joining boots him — ask first.
- Keep mic and camera off. Never press a control that reaches a real person
  (Voice call / Video call in the Calls tab both do).

## Two items are not clones, and they are the point

Nam, in his own words: *"so far there hasn't been a lot of creativity in this
clone, we are just purely copying with dedication, but I want to show them I have
my own ideas too. It started with the emojis then escalate to the raise hand."*

The clone earns the trust; these two spend it. The reactions keep Meet's
mechanic with Nam's own emoji set. The raised hand is a deliberate jump scare —
a slap on the screen — with an achievement behind it. He is fine-tuning how hard
it lands, so build the intensity as one tunable value. **He has explicitly ruled
out a reduced-motion carve-out for it; do not reopen that.** Do tell him what
the app's own a11y audit panel reports about it, since that panel is displayed
in-app and is allowed to fail in public — then let him decide.

## Screen share: read the work order before assuming the shape

An earlier session got this wrong and called it out of scope. It is not. We are
not restyling Chrome's picker and not launching a real share — we are building
**our own fake that looks like the browser's share dialog**, where every tab,
window and screen it offers is content we author and present as though the
browser rendered it. That is why Nam calls it the gold mine: total control over
what a recruiter sees on the "shared screen". So the real feature still gets
analysed and recorded in full, and all of that behaviour comes across.

There is one open question in the work order for Nam about how many surfaces
that content deserves. Ask it before building; it sets the size of the job.

## Environment notes

- Windows. Both Bash (Git Bash) and PowerShell are available; the Bash tool
  works fine for this repo.
- The repo stores LF. The original clone wrote CRLF and `core.autocrlf` is now
  `false` locally; files touched so far were normalised to LF. When editing via
  a script, normalise with `.replace(/\r\n/g, '\n')` first or exact-match
  replacements will silently miss.
- Large or quote-heavy files: use the Write tool. A `cat <<'EOF'` heredoc has
  failed on this content before.
- After a build, the browser must be cache-busted or it requests the previous
  build's chunk hashes and the screen dies with "That screen failed to load".
  Load `/?v=<timestamp>#route`.
- The in-app preview pane is often hidden, so `requestAnimationFrame` never
  fires and CSS transitions do not progress. Screenshots time out there too.
  Verify transitions by asserting the rule's target values with transitions
  neutralised, and do the visual pass in the real Chrome instead.
- The icon font is a 7 kB Material Symbols subset. All 56 names in
  `src/ui/icons.ts` resolve, but anything outside that list will render as its
  literal word. For a glyph the subset lacks, add an SVG path to `icons` in
  `src/dom.ts` — `search` and `block` were added that way — and note that
  `MenuItem` takes `svgPath` for menu rows.
- Watch for bare `span` selectors with a `font` shorthand: `sym()` returns a
  span, so such a rule resets `font-family` off the symbol font and the ligature
  renders as text. That bug has been diagnosed twice in this repo.

## Recently finished, so you do not redo it

The Calls tab was rebuilt from measurement this session: no composer on that tab,
band 720x96 `#f0f4f9` r28 with a 680x56 white pill, the expand-on-focus panel,
72-tall contact rows, multi-select with chips, Continue, and the call dialog
(512 wide, `#e9eef6`, r28, and notably no scrim and no shadow — it separates by
fill alone on a `z-index: 2001` layer). Contacts live in `src/data/contacts.ts`
and ship as deliberate placeholders: nothing real goes in until a referee has
agreed to appear on a public page. Also fixed: the Meetings rail button had no
click handler at all, `#calls` had no state so every dispatch stomped the hash,
and `render()` did not invalidate in-flight chunk mounts so Back rendered the
right screen and then had the old one painted over it a millisecond later. The
pre-join mic meter now fades with the mic. `content_copy` renders properly. All
share URLs read a new `SITE` constant in `src/data/cv.ts` instead of
`location.href`, which was handing out `localhost:4173`.
