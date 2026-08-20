// The green room — Meet's "Ready to join?" screen.
//
// Measured: 740x416 preview tile at radius 8 on #202124, a 448px column beside
// it, 28px/400 heading, 44px round controls inside the tile, outlined device
// chips underneath, a 48px filled "Join now" pill and an outlined
// "Other ways to join".
//
// Review U3 said pre-join screens are friction and Google spends real effort
// removing them — so this one is one click, and any deep link skips it.

import { h, clear } from '../dom.js';
import { sym, spinner, focusRing, dropCaret } from './icons.js';
import type { IconName } from './icons.js';
import { tipAllAbove } from './tooltip.js';
import type { Store } from '../state.js';
import { profile } from '../data/cv.js';

export interface Media {
  video: HTMLVideoElement;
  toggleCamera: () => Promise<void>;
  cameraOn: () => boolean;
}

/**
 * The green room runs through two states before it settles, and Meet's timings
 * for them were taken off a screen recording of a real join:
 *
 *   +250ms  the "Joining..." scrim over the home screen ends and this mounts
 *   +0      dark rect and spinner, no words yet
 *   +80     "Getting ready..." and its subline fade in
 *   +1500   they clear and the pre-join screen rises
 *
 * Meet holds that middle stage for about 1.5s because it is negotiating a call.
 * We are not, so ours is 900ms — the same figure the home screen uses, which is
 * long enough to read as the product and short enough not to read as a slow
 * site. Coming back from the call skips it entirely: nothing is being prepared
 * the second time either.
 */
const READY_MS = 900;
/** The words arrive a beat after the shape, exactly as they do in the product. */
const READY_TEXT_MS = 80;
/** And the offer card lands a beat after the panel it sits in. */
const OFFER_MS = 260;

let greeted = false;

let keysWired = false;
function wireKeys(): void {
  if (keysWired) return;
  keysWired = true;
  window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k !== 'd' && k !== 'e') return;
    const ctls = document.querySelectorAll<HTMLElement>('.lobby .round-ctl');
    const hit = k === 'd' ? ctls[0] : ctls[1];
    if (!hit) return;
    e.preventDefault();
    hit.click();
  });
}

export function renderLobby(store: Store, media: Media): HTMLElement {
  const warn = h('div', {});

  const avatar = h('div', {}, h('div', { class: 'preview-avatar', 'aria-hidden': 'true' }, 'NN'),
    h('p', { class: 'preview-ask', style: 'margin:0' }, 'Do you want people to see you in the meeting?'));

  const stage = h(
    'div',
    { class: 'preview' },
    h('span', { class: 'preview-name' }, profile.name),
    media.video,
    avatar,
    warn,
    h(
      'div',
      { class: 'preview-ctls' },
      h(
        'button',
        {
          class: 'round-ctl off',
          type: 'button',
          'aria-label': 'Turn on microphone',
          'data-key': 'ctrl + d',
          onclick: (e: Event) => {
            const b = e.currentTarget as HTMLButtonElement;
            const on = b.classList.toggle('off');
            b.setAttribute('aria-label', on ? 'Turn on microphone' : 'Turn off microphone');
            clear(b);
            b.appendChild(sym(on ? 'mic_off' : 'mic', 24));
            store.dispatch({ t: 'mic', on: !on });
          },
        },
        sym('mic_off', 24),
      ),
      h(
        'button',
        {
          class: 'round-ctl off',
          type: 'button',
          'aria-label': 'Turn on camera',
          'data-key': 'ctrl + e',
          onclick: (e: Event) => {
            void media.toggleCamera().then(() => {
              const b = e.currentTarget as HTMLButtonElement;
              const on = media.cameraOn();
              b.classList.toggle('off', !on);
              b.setAttribute('aria-label', on ? 'Turn off camera' : 'Turn on camera');
              clear(b);
              b.appendChild(sym(on ? 'videocam' : 'videocam_off', 24));
              avatar.style.display = on ? 'none' : '';
              if (!on) {
                clear(warn);
                warn.appendChild(
                  h(
                    'div',
                    { class: 'preview-warn', role: 'status' },
                    h('b', {}, 'Camera off'),
                    h('span', {}, 'Entirely fine. Nothing on this page needs it, and nothing would leave your machine if it did.'),
                  ),
                );
                window.setTimeout(() => clear(warn), 4500);
              } else {
                clear(warn);
              }
            });
          },
        },
        sym('videocam_off', 24),
      ),
      h(
        'button',
        {
          class: 'round-ctl',
          type: 'button',
          'aria-label': 'Backgrounds and effects',
          onclick: () => {
            store.dispatch({ t: 'join' });
            store.dispatch({ t: 'engTab', tab: 'fx' });
          },
        },
        sym('auto_awesome', 24),
      ),
    ),
  );

  // Four chips at 179px with 8px gaps is 740 — exactly the tile width, which is
  // why Meet has four. Ours say what is true of this page rather than naming
  // hardware it never asks for: there is no microphone here at all, and the
  // camera is an offer rather than a device that is already on.
  // The two live chips. Meet's open a menu; these do the thing directly and say
  // so in their label, which is the honest version of the same promise — the
  // caret is there because every one of Meet's chips has one.
  const capChip = h(
    'button',
    { class: 'device-chip', type: 'button', 'aria-label': 'Captions' },
    sym('closed_caption', 20),
    h('span', { class: 'chip-label' }, 'Captions off'),
    dropCaret(20),
  ) as HTMLButtonElement;
  capChip.addEventListener('click', () => {
    const on = !store.get().captionsOn;
    store.dispatch({ t: 'captions', on });
    const l = capChip.querySelector('.chip-label');
    if (l) l.textContent = on ? 'Captions on' : 'Captions off';
    capChip.classList.toggle('is-on', on);
  });

  const camChip = h(
    'button',
    { class: 'device-chip', type: 'button', 'aria-label': 'Camera' },
    sym('videocam_off', 20),
    h('span', { class: 'chip-label' }, 'Camera off'),
    dropCaret(20),
  ) as HTMLButtonElement;
  camChip.addEventListener('click', () => {
    void media.toggleCamera().then(() => {
      const on = media.cameraOn();
      const l = camChip.querySelector('.chip-label');
      if (l) l.textContent = on ? 'Camera on' : 'Camera off';
      clear(camChip.querySelector('.ms') as HTMLElement);
      camChip.replaceChild(sym(on ? 'videocam' : 'videocam_off', 20), camChip.firstChild as Node);
      camChip.classList.toggle('is-on', on);
    });
  });

  /**
   * The chip row, rebuilt after hovering and clicking Meet's own. Measured:
   *
   *   chip     179x32 r16, 1px #c4c7c5, inline-flex, padding 0 16, gap 4
   *   hit area 179x48 — the target is 16px taller than the chip on both sides
   *   layer    the padding box, 177x30, r16, #444746 at .08, .075s linear
   *   icon     20px #444746 at dx 17
   *   label    500 14px "Google Sans" #444746 at dx 41, ellipsis
   *   caret    arrow_drop_down, flush right, ending at dx 162
   *
   * Four things there we did not have at all: the caret, the state layer, the
   * taller hit area, and the truncation. And two we had backwards — the label
   * colour (a warm grey #444746, not our --sec) and which chips are live. Meet
   * enables the first two and disables the last two; ours had it inverted.
   *
   * Long-hovering every chip produced no tooltip, so they get none. That is a
   * measurement, not an omission: the label is already the whole message.
   */
  const chip = (icon: IconName, label: string, live: boolean): HTMLElement => h(
    'button',
    {
      class: 'device-chip' + (live ? '' : ' is-off'),
      type: 'button',
      ...(live ? {} : { 'aria-disabled': 'true' }),
      'aria-label': label,
    },
    sym(icon, 20),
    h('span', { class: 'chip-label' }, label),
    dropCaret(20),
  );

  const chips = h(
    'div',
    { class: 'devices' },
    // Disabled, and honestly so: there is no microphone here to choose between.
    chip('mic_off', 'No microphone', false),
    capChip,
    camChip,
    // Informational. Nothing to pick, so nothing to open.
    chip('speed', 'Fibre · 32 ms', false),
  );

  // Turning the transcript on here carries into the call, which is the only
  // reason an offer on a pre-join screen is worth anything.
  const transcriptBtn = h(
    'button',
    { class: 'm-btn m-text', type: 'button' },
    'Start',
  ) as HTMLButtonElement;
  transcriptBtn.addEventListener('click', () => {
    const on = !store.get().captionsOn;
    store.dispatch({ t: 'captions', on });
    transcriptBtn.textContent = on ? 'On' : 'Start';
    transcriptBtn.classList.toggle('is-on', on);
  });

  // One line, not two. Meet's subline is short by design — ours wrapped to a
  // second line and pushed everything below it 11px down, which is how a copy
  // length becomes a layout bug.
  //
  // It also narrates, the way the real one does: it says it is looking, and then
  // says what it found. Measured at ~750ms apart in the recording.
  const subLine = h('p', { class: 'join-sub' }, 'Looking for others in the call…');
  window.setTimeout(() => { subLine.textContent = 'Nam Nguyen is already here'; }, 750);

  const col = h(
    'div',
    { class: 'join-col' },
    h('h1', {}, 'Ready to join?'),
    subLine,
    h(
      'div',
      { class: 'join-card' },
      sym('closed_caption', 20),
      h(
        'div',
        {},
        h('b', {}, 'Use the transcript'),
        h('span', {}, 'Captions and a written script'),
      ),
      transcriptBtn,
    ),
    h(
      'div',
      { class: 'join-actions' },
      h(
        'button',
        {
          // ring-host so it can carry the same gm3 focus ring the meeting card
          // uses. Meet autofocuses this button on arrival and draws exactly that
          // ring around it, so the machinery is already ours.
          class: 'm-btn m-filled join-now ring-host',
          type: 'button',
          onclick: () => store.dispatch({ t: 'join' }),
        },
        focusRing(),
        h('span', {}, 'Join now'),
        // Meet puts a warning badge on this button when it cannot find a
        // microphone: a 16px circle straddling the top-left corner that expands
        // into a pill on hover. Ours says the same thing and means it — this page
        // never requests a microphone, so you really are joining without one.
        // The alternative was showing the badge to people who DO have a mic,
        // which would be a false statement in Google’s voice.
        h(
          'span',
          { class: 'warn-pill', role: 'note', tabindex: '0' },
          h('span', { class: 'warn-dot', 'aria-hidden': 'true' }, '!'),
          h('span', { class: 'warn-text' }, 'You’re joining without mic'),
          // The expanded badge ends in a caret in Meet too — 15px, #6D3A01,
          // finishing 5px short of the pill's right edge.
          dropCaret(20),
        ),
      ),
      // Meet opens dial-in numbers here. We have no phone number, so this keeps
      // the shape of the screen and does nothing — a deliberate choice, recorded
      // in the plan, rather than an unfinished control.
      h(
        'button',
        { class: 'other-ways', type: 'button', 'aria-disabled': 'true' },
        'Other ways to join',
        sym('expand_more', 18),
      ),
    ),
  );

  // The pre-join content, so the stage below can withhold it.
  // A <main>, not a div: this is the page landmark and our own a11y audit
  // checks for it. Swapping it for a div here is how that regresses silently.
  // Meet tips all three round controls, ABOVE them, 4px clear — and the text
  // carries the keyboard shortcut: "Turn off microphone (ctrl + d)". So ours
  // says the same, and ctrl+d / ctrl+e are wired below so the text is true.
  // The chips are deliberately not tipped; long-hovering Meet's produced none.
  tipAllAbove(...stage.querySelectorAll<HTMLElement>('.round-ctl'));

  // The tooltips promise ctrl+d and ctrl+e, so here they are: Meet's own
  // accelerators, and the reason the promise is allowed to be made at all.
  //
  // Wired once at module scope rather than per render. The lobby is remounted
  // on every visit, so a listener per visit would fire three times a press by
  // the third visit — and there is no teardown hook to hang a removal on. The
  // handler looks the controls up when the key lands instead, which also means
  // it is inert on every other screen without needing to know about them.
  wireKeys();

  const stageWrap = h('main', { class: 'lobby-body', id: 'main' });

  const gettingReady = (): HTMLElement => {
    const pad = h('div', { class: 'ready-pad' });
    const art = h('div', { class: 'ready-art' });
    const words = h(
      'div',
      { class: 'ready-words' },
      h('p', { class: 'ready-h' }, 'Getting ready\u2026'),
      h('p', { class: 'ready-s' }, 'You\u2019ll be able to join in just a moment'),
    );
    pad.append(art, h('div', { class: 'ready-side' }, words, spinner(true, true)));
    // The shape lands first and the words catch up. One beat, and it is most of
    // what makes the screen feel like it is doing something rather than waiting.
    words.style.opacity = '0';
    window.setTimeout(() => { words.style.opacity = ''; }, READY_TEXT_MS);
    return pad;
  };

  const settle = (): void => {
    greeted = true;
    clear(stageWrap);
    stageWrap.append(h('div', { class: 'preview-col' }, stage, chips), col);
    stageWrap.classList.add('is-in');
    // The offer card arrives after the rest of the panel, which is the order the
    // product uses: the thing you came for first, the extra second.
    const card = col.querySelector<HTMLElement>('.join-card');
    if (card) {
      card.classList.add('offer-late');
      window.setTimeout(() => card.classList.remove('offer-late'), OFFER_MS);
    }
    // Meet autofocuses Join now. The ring rides :focus-visible plus the class,
    // same as the meeting card, so it settles thick-to-thin on arrival.
    const jn = col.querySelector<HTMLElement>('.join-now');
    if (jn) {
      jn.classList.add('is-selected');
      jn.focus({ preventScroll: true });
    }
  };

  if (greeted || store.get().reducedMotion) {
    settle();
  } else {
    stageWrap.appendChild(gettingReady());
    window.setTimeout(() => { if (stageWrap.isConnected) settle(); }, READY_MS);
  }

  return h(
    'div',
    { class: 'lobby' },
    h(
      'header',
      { class: 'lobby-bar' },
      // In the real product this is *your* account. Here the visitor is the
      // one taking the interview, so it is theirs — not Nam's. No real address
      // is invented: Google publishes none for this, and it would be a strange
      // thing to fabricate on a job application.
      h(
        'div',
        { class: 'lobby-acct' },
        h('b', {}, 'you@google.com'),
        h('span', {}, 'Switch account'),
      ),
    ),
    stageWrap,
  );
}
