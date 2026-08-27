// "Off the clock" — the participant nobody expects in the call.
//
// The hobbies section of a CV is usually filler. This one names venues, films
// and press instead of drawing morals from them — Nam, on the earlier version:
// "The descriptions here are very vague, I dont like it." The SFX-makeup claim
// that used to justify the effects pipeline is gone with the pipeline itself.
//
// It plays as a reel: one clip auto-advances into the next, and the strip above
// the video always says what you are looking at and what it is evidence of.
// Nothing autoplays until you press play once, nothing has sound until you ask
// for it, and under reduced-motion it never advances by itself (reviews U4, R1).

import { h, clear } from '../dom.js';
import { reel, omitted } from '../data/clips.js';
import type { Clip } from '../data/clips.js';
import { prefersReducedMotion } from '../a11y.js';

export function renderOffClock(): HTMLElement {
  const reduced = prefersReducedMotion();
  let index = 0;
  let playing = false;
  let muted = true;

  const video = h('video', {
    class: 'reel-video',
    playsinline: true,
    preload: 'metadata',
    'aria-describedby': 'reel-label',
  }) as HTMLVideoElement;
  video.muted = true;

  const label = h('div', { class: 'reel-label', id: 'reel-label' });
  const caption = h('div', { class: 'reel-caption' });
  const noteRow = h('div', {});
  const live = h('div', { class: 'sr', 'aria-live': 'polite' });
  const dots = h('div', { class: 'reel-dots', role: 'tablist', 'aria-label': 'Clips' });
  const overlay = h('button', {
    class: 'reel-overlay',
    type: 'button',
    onclick: () => (playing ? pause() : play()),
  }, h('span', { class: 'clip-play' }, '▶'));

  const current = (): Clip => reel[index] ?? reel[0]!;

  const muteBtn = h(
    'button',
    { class: 'mbtn', type: 'button', onclick: () => setMuted(!muted) },
    'Unmute',
  );

  function setMuted(next: boolean): void {
    muted = next;
    video.muted = next;
    muteBtn.textContent = next ? 'Unmute' : 'Mute';
    muteBtn.setAttribute('aria-pressed', next ? 'false' : 'true');
  }

  function paint(): void {
    const c = current();
    video.src = c.src;
    video.poster = c.poster;
    video.muted = muted;

    label.textContent = '';
    label.append(
      h('span', { class: 'reel-index' }, `${index + 1} / ${reel.length}`),
      h('span', { class: 'reel-what' }, c.label),
    );
    caption.textContent = c.caption;

    clear(noteRow);
    if (c.note) noteRow.appendChild(h('p', { class: 'clip-note' }, c.note));
    if (!c.hasAudio) noteRow.appendChild(h('p', { class: 'clip-note' }, 'No sound on this one.'));

    clear(dots);
    reel.forEach((clip, i) =>
      dots.appendChild(
        h('button', {
          class: `reel-dot ${i === index ? 'on' : ''}`,
          type: 'button',
          role: 'tab',
          'aria-selected': i === index ? 'true' : 'false',
          'aria-label': clip.label,
          onclick: () => go(i, true),
        }),
      ),
    );

    muteBtn.disabled = !c.hasAudio;
    live.textContent = `Now playing: ${c.label}. ${c.caption}`;
    overlay.hidden = playing;
  }

  function go(next: number, andPlay: boolean): void {
    index = (next + reel.length) % reel.length;
    paint();
    if (andPlay) play();
  }

  function play(): void {
    playing = true;
    overlay.hidden = true;
    void video.play().catch(() => {
      playing = false;
      overlay.hidden = false;
    });
  }

  function pause(): void {
    playing = false;
    video.pause();
    overlay.hidden = false;
  }

  // Auto-advance. Under reduced-motion the reel stops at the end of each clip
  // and waits, so nobody gets a carousel they did not ask for.
  video.addEventListener('ended', () => {
    if (reduced) {
      playing = false;
      overlay.hidden = false;
      return;
    }
    go(index + 1, true);
  });

  video.addEventListener('error', () => {
    clear(noteRow);
    noteRow.appendChild(h('p', { class: 'clip-missing' }, 'That clip is missing from this build.'));
  });

  const wrap = h(
    'div',
    {},
    h(
      'p',
      { class: 'pnote' },
      'Not filler. Two of these are the reason the page you are looking at exists. Roughly forty seconds in total, ' +
        'cut to the highlight — nobody has time for the uncut version, including me.',
    ),

    h(
      'div',
      { class: 'reel' },
      label,
      caption,
      h('div', { class: 'reel-stage' }, video, overlay),
      h(
        'div',
        { class: 'reel-controls' },
        h('button', { class: 'mbtn', type: 'button', 'aria-label': 'Previous clip', onclick: () => go(index - 1, true) }, '‹ Prev'),
        h('button', { class: 'mbtn fill', type: 'button', onclick: () => (playing ? pause() : play()) }, reduced ? 'Play' : 'Play the reel'),
        h('button', { class: 'mbtn', type: 'button', 'aria-label': 'Next clip', onclick: () => go(index + 1, true) }, 'Next ›'),
        muteBtn,
      ),
      dots,
      noteRow,
      live,
      reduced
        ? h('p', { class: 'clip-note' }, 'Your system asks for reduced motion, so the reel will not advance on its own. Use Next.')
        : h('p', { class: 'clip-note' }, 'Clips advance automatically. Sound is off until you turn it on.'),
    ),

    h('div', { class: 'shead', style: 'margin-top:22px' }, 'What each one is doing here'),
    ...reel.map((c) =>
      h(
        'div',
        { class: 'clip' },
        h(
          'button',
          {
            class: 'clip-jump',
            type: 'button',
            onclick: () => go(reel.indexOf(c), true),
          },
          h('img', { src: c.poster, alt: '', width: '56', height: '56', class: 'clip-thumb' }),
          h('span', {}, h('span', { class: 'clip-what' }, c.label), h('span', { class: 'clip-why' }, c.why)),
        ),
      ),
    ),

    h('div', { class: 'shead', style: 'margin-top:20px' }, 'And one that is not here'),
    h('p', { class: 'clip-note' }, h('b', {}, `${omitted.what}. `), omitted.why),

    h('div', { class: 'shead', style: 'margin-top:20px' }, 'No footage, still true'),
    h(
      'dl',
      { class: 'kv' },
      h('dt', {}, 'Zombie walk organiser'),
      h('dd', { style: 'font-weight:400;color:var(--muted)' }, 'Crowd logistics, in makeup, on a schedule, with volunteers who do not report to you.'),
      h('dt', {}, 'Brazilian jiu-jitsu'),
      h('dd', { style: 'font-weight:400;color:var(--muted)' }, 'Losing repeatedly to better people, on purpose, as a hobby. Good preparation for code review.'),
      h('dt', {}, 'Game developer'),
      h('dd', { style: 'font-weight:400;color:var(--muted)' }, 'Seven years of it, professionally. It is why this page has side quests and why one keyboard shortcut here is older than the web.'),
    ),
  );

  paint();
  return wrap;
}
