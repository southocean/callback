// An egg, playing as a shared screen.
//
// The route to get here is deliberately Meet's: a marked day, a meeting on it,
// join the meeting, and someone is already presenting. Honouring the click count
// is the point — the clip is not a lightbox on a CV, it is a thing that happens
// inside a call — but a hunt with no shortcut is a chore, so this also carries
// a "Next" control that walks the eggs in order.
//
// Nothing here autoplays with sound. The clip starts muted like every
// screen share does, and the first thing the control bar offers is the volume.

import { h, clear } from '../dom.js';
import { sym } from './icons.js';
import { tip } from './tooltip.js';
import { eggs, eggById } from '../data/eggs.js';

export interface EggPlayOpts {
  id: string;
  onLeave: () => void;
  onGo: (id: string) => void;
}

export function renderEgg(o: EggPlayOpts): HTMLElement {
  const egg = eggById(o.id) ?? eggs[0]!;
  const idx = eggs.findIndex((e) => e.id === egg.id);
  const next = eggs[(idx + 1) % eggs.length]!;

  const video = h('video', {
    class: 'egg-video',
    src: egg.clip,
    poster: egg.poster,
    playsinline: 'true',
    loop: 'true',
    preload: 'metadata',
  }) as HTMLVideoElement;
  video.muted = true;
  // Autoplay is only permitted while muted, which is also the behaviour we
  // want: a share that starts talking at you is worse than one you have to
  // unmute.
  void video.play().catch(() => { /* a paused poster is a fine fallback */ });

  const capt = h('div', { class: 'egg-capt' }, egg.caption);

  const soundBtn = h(
    'button',
    { class: 'cbtn', type: 'button', 'aria-label': 'Unmute the shared audio' },
    sym('mic_off', 22),
  );
  const updateSound = (): void => {
    clear(soundBtn);
    soundBtn.appendChild(sym(video.muted ? 'mic_off' : 'mic', 22));
    soundBtn.setAttribute('aria-label', video.muted ? 'Unmute the shared audio' : 'Mute the shared audio');
    soundBtn.classList.toggle('active', !video.muted);
  };
  soundBtn.addEventListener('click', () => { video.muted = !video.muted; updateSound(); });

  const capBtn = h(
    'button',
    { class: 'cbtn', type: 'button', 'aria-label': 'Turn off captions' },
    sym('closed_caption', 22),
  );
  let caps = true;
  capBtn.addEventListener('click', () => {
    caps = !caps;
    capt.style.display = caps ? '' : 'none';
    clear(capBtn);
    capBtn.appendChild(sym(caps ? 'closed_caption' : 'closed_caption_off', 22));
    capBtn.setAttribute('aria-label', caps ? 'Turn off captions' : 'Turn on captions');
  });

  const nextBtn = h(
    'button',
    { class: 'cbtn', type: 'button', 'aria-label': `Next: ${next.title}`, onclick: () => o.onGo(next.id) },
    sym('chevron_right', 22),
  );

  const leave = h(
    'button',
    { class: 'cbtn leave', type: 'button', 'aria-label': 'Leave the call', onclick: () => o.onLeave() },
    sym('call_end', 22),
  );

  for (const b of [soundBtn, capBtn, nextBtn, leave]) tip(b);

  const wrap = h(
    'div',
    { class: 'egg' },
    h(
      'div',
      { class: 'egg-stage' },
      h(
        'div',
        { class: 'egg-share' },
        h(
          'div',
          { class: 'egg-share-bar' },
          sym('present_to_all', 18),
          h('span', {}, 'Nam Nguyen is presenting'),
        ),
        video,
      ),
      h('div', { class: 'egg-tile' }, h('span', {}, 'NN')),
      capt,
    ),
    h(
      'div',
      { class: 'egg-bar' },
      h('div', { class: 'egg-meta' }, h('b', {}, egg.title), h('span', {}, egg.blurb)),
      h('div', { class: 'egg-ctrls' }, soundBtn, capBtn, nextBtn, leave),
    ),
  );

  updateSound();
  return wrap;
}
