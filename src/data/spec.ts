// The reverse-engineered Meet spec.
//
// Every value below was measured off meet.google.com — computed styles and
// bounding boxes read from the live DOM across all four screens of the flow —
// and then rebuilt from scratch here. Nothing was guessed from a screenshot,
// and no Google asset, font or stylesheet is used or shipped.
//
// This module is the reference the interface is built against, and it is what
// the Spec panel renders.

export interface Token {
  name: string;
  value: string;
  where: string;
}

export interface Group {
  title: string;
  note: string;
  tokens: Token[];
}

export const surfaces: Group = {
  title: 'Surfaces',
  note: 'Meet runs a light Material 3 shell around a near-black call canvas. The two palettes barely overlap.',
  tokens: [
    { name: 'Call canvas', value: '#131314', where: 'in-call root' },
    { name: 'Tile / side panel', value: '#202124', where: 'video tiles, drawers' },
    { name: 'Control button', value: '#333537', where: 'mic, camera, present' },
    { name: 'Control, secondary', value: '#282a2c', where: 'the settings chevrons' },
    { name: 'Icon, primary', value: '#e3e3e3', where: 'control glyphs' },
    { name: 'Icon, secondary', value: '#8e918f', where: 'chevron glyphs' },
    { name: 'Leave call', value: '#dc362e', where: 'the red one' },
    { name: 'Light text', value: '#1f1f1f', where: 'home, lobby' },
    { name: 'Light text, secondary', value: '#444746', where: 'labels, captions' },
    { name: 'Primary blue', value: '#0b57d0', where: 'filled buttons' },
    { name: 'Text-button blue', value: '#1a73e8', where: 'dialog actions' },
    { name: 'Nav selected pill', value: '#c2e7ff', where: 'rail, on #001d35 icon' },
    { name: 'Nav label', value: '#00639b', where: 'rail label, 12px/500' },
    { name: 'Scheduled card', value: '#d3e3fd', where: 'home, upcoming meeting' },
    { name: 'Tonal button', value: '#c4eed0', where: 'the "New" button' },
    { name: 'Field / composer', value: '#f0f4f9', where: 'code input, link row' },
    { name: 'Snackbar', value: '#3c4043', where: 'toasts, device warnings' },
    { name: 'Outline', value: '#c4c7c5', where: 'cards, chips' },
  ],
};

export const geometry: Group = {
  title: 'Geometry',
  note: 'The numbers that make it read as Meet rather than as a dark website. Radii and the control-bar rhythm do most of the work.',
  tokens: [
    { name: 'Top bar', value: '56px', where: 'both light and dark' },
    { name: 'Control bar', value: '80px', where: 'group centred, 48px tall' },
    { name: 'Control height / radius', value: '48px / 24px', where: 'every pill in the bar' },
    { name: 'Video tile radius', value: '24px', where: 'in-call tiles' },
    { name: 'Side panel', value: '360px, radius 20px', where: 'inset 72px from top' },
    { name: 'Lobby preview', value: '740 × 416, radius 8px', where: 'green room' },
    { name: 'Lobby join column', value: '448px', where: 'beside the preview' },
    { name: 'Composer pill', value: '48px tall, radius 28px', where: 'home' },
    { name: 'Rail item', value: '104 × 56, pill 56 × 32', where: 'home nav' },
    { name: 'Week day column', value: '48px', where: 'home date strip' },
    { name: 'Dialog', value: 'radius 8px', where: 'Material 2 holdover' },
  ],
};

export const barLayout = {
  title: 'Control bar, left to right',
  note:
    'Measured from the live DOM at a 1875px viewport. Two of the units are compound: a 40px settings chevron fused ' +
    'to a 48px toggle inside one 88px pill. Everything is 48px tall with an 8px gap.',
  units: [
    { label: 'Audio', w: '40 + 48', note: 'chevron + mic, one pill' },
    { label: 'Video', w: '40 + 48', note: 'chevron + camera, one pill' },
    { label: 'Present', w: '56', note: 'computer_arrow_up' },
    { label: 'Reaction', w: '56', note: 'mood' },
    { label: 'Captions', w: '56', note: 'closed_caption' },
    { label: 'Raise hand', w: '56', note: 'back_hand' },
    { label: 'More', w: '36', note: 'more_vert, narrower than the rest' },
    { label: 'Leave', w: '72', note: '#dc362e, call_end' },
  ],
  right: 'Chat, Meeting tools and Host controls sit apart at the right edge: 48px, transparent, white glyphs.',
};

export const flow = {
  title: 'The flow',
  note: 'Four screens, and the transitions between them. Every one is deep-linkable.',
  steps: [
    { id: '#home', name: 'Home', body: 'Code composer, New, the rail, the week strip, and today’s scheduled meeting.' },
    { id: '#lobby', name: 'Green room', body: 'Camera preview, device chips, "Ready to join?" and the join actions.' },
    { id: '#call', name: 'In call', body: 'Tile grid, control bar, captions overlay, six side panels.' },
    { id: '#ended', name: 'Left the meeting', body: 'Rejoin, return home, and the things worth taking away.' },
  ],
  deviations: [
    {
      what: 'People are chapters',
      body:
        'Every participant tile is a role from the CV rather than a person. Clicking one opens the People panel, ' +
        'which draws the career as a real timeline, including the two roles that genuinely overlap.',
    },
    {
      what: 'Present is a portfolio',
      body: 'The screen-share panel holds four case studies instead of a shared window.',
    },
    {
      what: 'In-call messages is the cover letter',
      body: 'Written as a chat thread, because that is where people actually read things.',
    },
    {
      what: 'Meeting tools is the engineering wing',
      body:
        'Meet keeps whiteboards and polls here. This keeps the test suite, a live accessibility audit, the measured ' +
        'bundle size, a network-degradation simulator, and this spec.',
    },
    {
      what: 'Off the clock',
      body: 'A seventh tile that is not a job: a five-clip reel just under a minute, click to play, sound off until asked for.',
    },
    {
      what: 'Host controls is the handover',
      body: 'The PDF, the plain document, the email address, and a pre-written referral paragraph.',
    },
    {
      what: 'A document mode',
      body:
        'Meet has no equivalent. Press D, or take the CV item in the rail, and the whole thing renders as one ' +
        'accessible page that prints to a clean one-pager. Novelty must never be the only way to the content.',
    },
  ],
};

export const method = {
  title: 'How the spec was taken',
  steps: [
    'Drove meet.google.com through the full flow, home, an instant meeting, the in-call screen, the leave dialog, the ended screen and the green room.',
    'Read computed styles and bounding boxes straight off the live DOM at each stop, rather than sampling pixels from a screenshot.',
    'Recorded the Material Symbol names off the rendered glyphs, so the icon mapping is checkable rather than approximate.',
    'Rebuilt every glyph as an inline SVG path. The real icon font would be a third-party request, and this project makes none.',
    'Substituted a system font stack for Google Sans, which is not distributable. Shapes and spacing are exact; the typeface is the nearest thing already on your machine.',
  ],
  honest:
    'Two things are deliberately not faithful: there is no Google wordmark or logo anywhere, and the typeface is a ' +
    'substitute. Both are choices, not gaps, an homage should not ship someone else’s trademark.',
};

export const stats = {
  screens: 4,
  panels: 6,
  tokens: surfaces.tokens.length + geometry.tokens.length,
  icons: 34,
};
