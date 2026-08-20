// The design principles, compiled from the crawl.
//
// This is the contract for adding anything new to this page. Every value was
// read off meet.google.com's live DOM — computed styles, bounding boxes and
// transition declarations — not guessed from a screenshot. If a new element
// follows these rules it will sit inside the clone; if it does not, it will
// stick out, and that is the whole point of writing them down.
//
// Rendered in Meeting tools → Design.

export interface Rule {
  name: string;
  value: string;
  note: string;
}

export interface Section {
  title: string;
  lead: string;
  rules: Rule[];
}

export const motion: Section = {
  title: 'Motion',
  lead:
    'Three curves do all the work, and two of them overshoot. That springiness is the single most recognisable ' +
    'thing about the product in motion — a linear or plain ease-out reads as "not Meet" instantly.',
  rules: [
    { name: 'When keyframes are the wrong tool', value: 'simulate, do not choreograph', note: 'The wordmark impact was keyframed three times and read wrong every time. CSS animations are independent timelines — nothing can be triggered by the state of another element — so "this gives way once that has taken the blow" has to be faked as a guessed delay, and each element eases into its own end state, which is why nothing could transmit an impulse it had already spent. It is now one simulation with one clock: constant-velocity approach, then momentum spent displacing what is in front of it, then a damped spring. ui/impact.ts.' },
    { name: 'Order the events, not the elements', value: 'Google out at 456ms, spring peaks at 505ms', note: 'The two overlapped in an earlier version, so the name was pushed right by the spring and then yanked left again as the last of Google died. Sequencing them dropped that jerk from 9px to under 2px. The trigger is computed from the spring, not typed in: the word must be gone by (pi/2)/omega, the moment the spring crosses zero.' },
    { name: 'Match type with type', value: 'text plus 0.32px of stroke', note: 'The wordmark was a bitmap cropped from Google’s own lockup for a while, because nothing else matched a flat-ink bitmap for weight. Wrong trade: an image cannot share a baseline with the text beside it without hacks, and a clipping box’s baseline is its bottom margin edge, so the word floated above the line. The metrics were never the issue — Product Sans at 23.5px measures 75.8px against the bitmap’s 76 — only ink weight was, and text-stroke supplies that without moving a metric.' },
    { name: 'Displace, never distort', value: 'shoved left 44px, fading late', note: 'An earlier version squashed the Google wordmark with scaleX. It read as crushing Google’s own artwork, which is a poor look on a page addressed to Google and unnecessary — pushing it out of frame says the same thing about making room without mangling it.' },
    {
      name: 'Shape morph',
      value: '.35s cubic-bezier(0.4, 0.1, 0.5, 1.4)',
      note: 'Buttons round down toward a squircle on press. The 1.4 overshoot is deliberate. Read off the New button and every icon button.',
    },
    {
      name: 'Emphasised move',
      value: '.1s cubic-bezier(0.27, 1.06, 0.18, 1)',
      note: 'Nav pill width and opacity. Fast and slightly past the mark.',
    },
    {
      name: 'Standard',
      value: '.15s–.25s cubic-bezier(0.4, 0, 0.2, 1)',
      note: 'Opacity and transform on panels and inputs. The Material standard curve, no overshoot.',
    },
    {
      name: 'What animates',
      value: 'border-radius, width, opacity, transform, background-color',
      note: 'Never height, never top/left. Shape and opacity carry the feedback.',
    },
    {
      name: 'Entrance',
      value: 'content fades and lifts in on load',
      note: 'The meeting list arrives after the shell, not with it. The shell must never wait for the content.',
    },
    { name: 'Cold load order', value: 'spinner, then the list, then the promo', note: 'The shell paints at once; a wavy circular indicator holds the content area alone for about a second; the meeting list fades in over 500ms; then the promo banner arrives above it and pushes the list down. Meet ships that layout shift rather than reserving space for it.' },
    { name: 'The loader is wavy', value: 'one ring, R 22 about (32,32)', note: 'Taken from Google’s own path data: a circle of radius exactly 22.0000, sampled one point per degree, sweeping 0 to 339 degrees — a 21 degree gap. That is the plain track. The wave rides the same radius, crest out and trough in, and the track is only the arc the wave does not occupy.' },
    { name: 'Amplitude falls out of it', value: '2.5', note: 'The one number Google’s path did not give. At R 22 with a 4px stroke an amplitude of 2.5 paints a 53.0px extent, which is what a frame of a real cold load measures. Nine crests per turn so the wave closes on itself.' },
    { name: 'Two periods, not one', value: 'ring 2.2s, arc 1.5s', note: 'The ring turns steadily while the lit arc breathes on a slower eased cycle. Matching the two periods is what makes a spinner look mechanical.' },
    { name: 'Sweep signals the load', value: 'short arc for light work', note: 'Meet gives a cold start a long wavy arc and a day switch a short one, so the indicator says how much is actually happening. Reproduced by one parameter.' },
    {
      name: 'Reduced motion',
      value: 'all of the above collapses to ~0s',
      note: 'Non-negotiable, and it must also disable auto-advancing content — not merely shorten it.',
    },
  ],
};

export const feedback: Section = {
  title: 'Interaction feedback',
  lead:
    'Every interactive control reacts to the pointer, and they all do it the same way: a ::before at inset 0 ' +
    'whose opacity ramps from 0 to .08 over 75ms. An earlier pass on this screen concluded the opposite — that ' +
    'Meet barely responds — because it read background-color on the :hover chain, and the layer is a pseudo-element ' +
    'on an inner span whose opacity, not colour, is what moves. Worth stating plainly: the probe was confidently ' +
    'wrong, and the fix was to stop choosing which properties to look at.',
  rules: [
    { name: 'State layers', value: '::before, inset 0, opacity 0 → .08', note: 'Every interactive control carries an absolutely-positioned ::before at inset 0 with the host’s radius. Hover raises its opacity; nothing else moves. Icon buttons at 40x40 go to .12 instead of .08.' },
    { name: 'The tint is the on-colour', value: 'never a neutral black', note: '#6991d6 on a day, #041e49 on today’s blue pill, #072711 on the green New button, #0b57d0 on a blue text link, #ffffff on a blue Join, #1f1f1f only on neutral surfaces. The layer reads as the control gaining more of itself. A generic 8% black is what makes a Material copy look like a copy.' },
    { name: 'State transition', value: 'opacity .075s linear', note: '75ms is fast enough to read as instant but is still a ramp, not a flip. Measured identically on every Meet-owned control. The only exception is the account bar, at .3s ease-out, because it is a different team’s component.' },
    { name: 'Never flip a state', value: 'every change is a transition', note: 'A binary on/off background is the single most reliable tell of a fake. If a property changes on interaction it gets a duration, even a 75ms one.' },
    { name: 'State layers do not nest', value: 'the child wins, the parent stays put', note: 'Hovering the Join inside a meeting card lights Join and leaves the card completely inert, so the button reads as sitting outside the row it is inside. Same for the Join inside the code field, which also dismisses the field’s tooltip.' },
    { name: 'Fill changes, separately', value: '#e9eef6 → #dde3ea', note: 'The code field is the one control that also changes its actual fill, on top of having no state layer of its own.' },
    { name: 'Tooltip placement', value: '4px, and the side is not uniform', note: 'Top-bar controls place the tooltip below; the date row places it above, because below would land on the meeting list. Both centred on the anchor.' },
    { name: 'Which controls get one', value: 'fewer than you would think', note: 'In the date row: the two week arrows, the calendar button, and today — whose tooltip reads “Selected” rather than the date. The other six day columns get nothing, measured cold and primed. And the Join buttons get none at all: touching the one inside the code field actively dismisses the field’s own tooltip.' },
    { name: 'Focus (visible)', value: 'the ring, and nothing else', note: 'A 12% layer on top of the ring was the reason our selected card looked older and greyer than Meet’s when both used the same #d3e3fd. The ring is the whole feedback; darkening the fill as well just ages the colour.' },
    { name: 'Pressed', value: '10% layer + radius morph', note: 'The shape change is the press feedback; the colour barely moves.' },
    { name: 'Focus ring', value: 'box-shadow 0 0 0 3px #00639b, inset -2px', note: 'Not an outline — outlines cannot animate. Google ships it as a span inset -2px around the control, so its radius is the host’s plus 2, carrying a box-shadow spread. The colour is the secondary token #00639b, not the blue you would guess.' },
    { name: 'Focus ring entrance', value: 'grows to 8px in 150ms, settles to 3px over 450ms', note: 'Google’s own keyframes, gm3-focus-ring-outward-grows and -shrinks, both on cubic-bezier(0.2, 0, 0, 1). The overshoot is the pulse you see on load and again every time you return to the tab.' },
    { name: 'Selection is :focus-visible', value: 'not a class we manage', note: 'The most relevant meeting is focused on load, and the ring rides on :focus-visible. That is why alt-tabbing hides it, returning replays the pulse, and clicking empty space clears it — three behaviours inherited from the browser rather than implemented.' },
    { name: 'Selected', value: 'secondary container #c2e7ff', note: 'A filled pill, plus the icon switches to FILL 1. Not a colour change on an outline.' },
    { name: 'Disabled', value: 'bg rgba(31,31,31,.12), text rgba(16,16,16,.3)', note: 'A real filled surface, not ghosted text. Measured off the inactive Join button.' },
    { name: 'Hit area', value: '40px minimum, 48px for primary', note: 'Icon buttons are 40×40 even when the glyph is 24. Never shrink the target to fit the art.' },
    { name: 'Tooltip surface', value: '#303030 on #f2f2f2, radius 4, padding 4px 8px', note: '400 12px/16px in Google Sans Flex, no shadow. Which side it takes is not fixed — see placement above.' },
    { name: 'Tooltip entrance', value: 'opacity + translateY, .15s cubic-bezier(0, 0, 0.2, 1)', note: 'The decelerate curve, not the spring. Tooltips arrive; they do not bounce.' },
    { name: 'Tooltip delay, cold', value: '~540ms', note: 'Measured three times on the live product: 541, 543, 567.' },
    { name: 'Tooltip delay, primed', value: '~0ms', note: 'Showing one arms the next — move to any other target and its tooltip appears at once. Measured at 38ms.' },
    { name: 'Tooltip cooldown', value: '600ms touching nothing', note: 'Then it forgets and the next one waits again. Ours: Google publishes no figure, and 1.6s idle was enough to reset it.' },
    { name: 'Where tooltips go', value: 'icon-only controls, the logo, the code field', note: 'NOT the rail items — they carry a visible label already, so a tooltip would only repeat it. Meet leaves them alone.' },
  ],
};

export const type: Section = {
  title: 'Type',
  lead:
    'Meet renders in Google Sans, Google Sans Text and Google Sans Flex, with Product Sans for the wordmark. None ' +
    'of those are open source, so none are copied into this repo — they are linked from the Google Fonts API, ' +
    'which is the route Google provides for exactly this. Google Sans Flex, which Meet names first on tooltips, ' +
    'is not served there; Google Sans Text is the next family Meet itself names. Sizes, weights and tracking are ' +
    'Meet\'s own.',
  rules: [
    { name: 'Page / section title', value: '400 22px/1.2', note: '"Thu, Aug 20". Regular weight, never bold.' },
    { name: 'Card title', value: '400 20px/28px', note: 'The meeting name.' },
    { name: 'Body', value: '400 14px/20px', note: 'Default. 13px for secondary lines.' },
    { name: 'Button label', value: '500 14px', note: 'Medium, not bold, no uppercase.' },
    { name: 'Input', value: '400 16px/24px', note: '16px so mobile Safari does not zoom on focus.' },
    { name: 'Nav label', value: '500 12px/16px, +0.1px tracking', note: 'The one place tracking is opened up.' },
    { name: 'Overline / day name', value: '500 11px/16px, +0.1px, uppercase', note: 'SUN, MON, TUE.' },
    { name: 'Weight range', value: 'mostly 400 and 500', note: 'With one measured exception: the meeting time on a card is 700. Nothing else on the home screen is bold.' },
    { name: 'Which face where', value: 'Text for body, Sans for display', note: 'Google Sans Text for body, labels and buttons; Google Sans for titles, the code input, day numbers and card titles; Product Sans for the wordmark and nothing else.' },
  ],
};

export const shape: Section = {
  title: 'Shape and colour',
  lead:
    'Radius encodes size and role: the bigger and more interactive a thing is, the rounder. Two palettes that ' +
    'barely overlap — a light Material 3 shell, and a near-black call canvas.',
  rules: [
    { name: 'Pill', value: '999px', note: 'Composer, nav pill. Anything that reads as a field or a chip.' },
    { name: 'Button', value: '20px @40px tall, 24px @48px', note: 'Exactly half the height. Then it morphs to ~10px on press.' },
    { name: 'Day / small target', value: '28px on a 48×56 box', note: 'The selected day is a filled pill behind BOTH the weekday and the number.' },
    { name: 'Card', value: '12px outlined, 16px filled', note: 'The promo banner is outlined at 12; the meeting card is filled at 16.' },
    { name: 'Video tile', value: '24px', note: 'In call.' },
    { name: 'Side panel', value: '20px', note: 'Inset from the edges, not flush.' },
    { name: 'Dialog / toast', value: '8px', note: 'A Material 2 holdover Meet has not moved off.' },
    { name: 'Light surfaces', value: '#fff · #e9eef6 · #f0f4f9 · #d3e3fd · #c2e7ff · #c4eed0', note: 'Page, composer, field, meeting card, selected, tonal.' },
    { name: 'Light text', value: '#1f1f1f · #444746 · #5f6368', note: 'Primary, secondary, fine print.' },
    { name: 'Dark surfaces', value: '#131314 · #202124 · #333537 · #282a2c', note: 'Canvas, tile/panel, control, control-secondary.' },
    { name: 'Accents', value: '#0b57d0 filled · #1a73e8 text · #dc362e destructive', note: 'Only one destructive colour, and only ever on Leave.' },
  ],
};

export const layout: Section = {
  title: 'Layout and responsiveness',
  lead:
    'A fixed rail, a centred content column, and a top bar that is a three-column grid rather than a flex row — ' +
    'so the composer is centred against the viewport, not against whatever the logo leaves over.',
  rules: [
    { name: 'Home top bar', value: '64px', note: 'The in-call bar is 56px. They are not the same, which is easy to get wrong.' },
    { name: 'Nav rail', value: '104px wide, items 104×56 on a 70px pitch', note: 'Icon 24px in a 56×32 pill, label beneath.' },
    { name: 'Content column', value: 'max 1052px, centred', note: 'main is display:flex; justify-content:center. Not left-aligned.' },
    { name: 'Day strip', value: '48×56 columns on a 58px pitch', note: '10px of air between days.' },
    { name: 'Call control bar', value: '80px band, 48px controls', note: 'Group centred; chat/tools/host pinned right.' },
    { name: 'Side panel', value: '360px', note: 'Full-screen below 960px, where it also traps focus.' },
    { name: 'Breakpoints', value: '1100 · 960 · 720', note: 'Tile grid 3→2→1; panel becomes an overlay at 960; top bar wraps and the rail moves to the bottom at 720.' },
    { name: 'Touch', value: 'nothing below 40px', note: 'The control bar keeps 44px targets on mobile rather than scaling everything down.' },
  ],
};

export const a11y: Section = {
  title: 'Accessibility',
  lead:
    'The rules that let a new element be added without regressing anything. All of these are asserted by the ' +
    'audit in Meeting tools → Accessibility, which runs against the live DOM and is allowed to fail.',
  rules: [
    { name: 'Every control is named', value: 'aria-label on icon-only buttons', note: 'The glyph is decorative; the name carries the meaning.' },
    { name: 'Icons are hidden', value: 'aria-hidden="true"', note: 'Otherwise a screen reader reads the ligature text — "videocam".' },
    { name: 'Toggle state', value: 'aria-pressed, not colour', note: 'Mic, camera, captions, hand, and every panel button.' },
    { name: 'Grids are one tab stop', value: 'roving tabindex + arrow keys', note: 'Tiles and day columns. A pile of tab stops is not a grid.' },
    { name: 'Panels', value: 'role="region" + label; focus trapped only when modal', note: 'On desktop the panel sits beside the content, so trapping there would be wrong.' },
    { name: 'Escape', value: 'closes, and focus returns', note: 'Back to the control that opened it, every time.' },
    { name: 'Live regions', value: 'aria-live="polite", debounced', note: 'Captions update constantly; a firehose gets switched off by the people who need it.' },
    { name: 'Motion safety', value: 'nothing modulates above 3 Hz', note: 'WCAG 2.3.1. The strongest effect warns before it engages and is unavailable under reduced-motion.' },
    { name: 'Focus visible', value: '3px ring, offset 2px', note: 'Never removed, never relying on the state layer alone.' },
    { name: 'Landmarks', value: 'one main, one nav, skip link first', note: 'The skip link is the first tab stop on every screen.' },
    { name: 'Colour is never alone', value: 'pair it with a glyph or a label', note: 'The network chip carries a word, not just a dot.' },
  ],
};

export const sections: Section[] = [motion, feedback, type, shape, layout, a11y];

export const gaps = {
  title: 'Known gaps in the spec',
  lead:
    'Honest inventory. These were not captured in the crawl, so anything built in these areas is inference rather ' +
    'than measurement, and should be marked as such until it is measured.',
  items: [
    'Pressed and focus state layers are still Material\'s documented opacities rather than values read off the product. Hover itself is now measured: the code field goes #e9eef6 to #dde3ea, and the logo has no hover surface at all.',
    'The Gemini notes panel, the avatar hover card and the People panel are still not captured — including the two status pills that animate from full-width to icon-only once notes start.',
    'Ripple geometry and origin on click.',
    'Panel open/close transitions in call, and the tile-grid reflow when someone joins.',
    'Focus-ring colour and offset in the dark call surface specifically.',
    'Anything below 720px on the real product.',
  ],
};
