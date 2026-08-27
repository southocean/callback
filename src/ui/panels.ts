// Tier-one panels: the story.
//
// Chat is the cover letter, People is the career timeline, Present is the case
// studies. Review U7 pushed everything technical out of here and behind one
// Engineering door, so these three stay narrative.

import { h, clear, icon, icons } from '../dom.js';
import { sym } from './icons.js';
import { ripple } from './gm3.js';
import { layoutTimeline, overlaps } from '../state.js';
import { currentPitch } from '../data/companies.js';
import type { Store } from '../state.js';
import { chat, roles, caseStudies, profile } from '../data/cv.js';
import { transcriptLines } from '../data/tour.js';

/** 2026-08-20 as a decimal year, for timeline geometry. */
export const NOW = 2026.63;

/**
 * The cover letter, as Meet's chat.
 *
 * MEASURED off the live panel, 2026-08-25, with the chat open during a share:
 *
 *   own bubble   #004a77, radius `20px 20px 4px`, text #e3e3e3 14/20,
 *                right-aligned, capped at 244 inside a 360 panel
 *   info card    #282a2c, radius 8, padding 12, #c4c7c5 at 12/16
 *
 * Nam: "wrong chat text color, should be an input here for the chat." Both.
 * Ours painted every bubble in the neutral surface at 4px/16px and left-aligned
 * them, and had no composer at all.
 *
 * These are Nam's own messages in Nam's own session, so they take the own-message
 * side. Anything a visitor types is a guest and takes the other side -- which is
 * Meet's actual rule (own right in blue, others left in grey) rather than a
 * layout picked to look tidy.
 */
export function renderChat(): HTMLElement {
  /*
   * The cover letter's opening line is company-specific. cv.ts holds the neutral
   * version; a ?c= code swaps in one that names the employer. Substituted here by
   * position rather than by matching the text, so editing the neutral copy in
   * cv.ts cannot silently break the swap.
   */
  const opener = currentPitch().opener;
  let swapped = false;
  const textFor = (m: { from: string; text: string }): string => {
    if (m.from !== 'nam' || swapped) return m.text;
    swapped = true;
    return opener;
  };

  const list = h('div', { class: 'msg-list' },
    h('div', { class: 'msg-card' }, 'The cover letter. It is a chat panel because a chat panel is where people actually read things.'),
    ...chat.map((m) =>
      h(
        'div',
        { class: m.from === 'system' ? 'msg msg-sys' : 'msg msg-own' },
        m.from === 'nam' ? h('div', { class: 'msg-from' }, `Nam Nguyen  ${m.at}`) : null,
        h('div', { class: 'msg-body' }, textFor(m)),
      ),
    ),
    h('div', { class: 'shead' }, 'Transcript'),
    renderTranscript(),
  ) as HTMLElement;

  const field = h('input', {
    class: 'msg-field', type: 'text', 'aria-label': 'Send a message',
    placeholder: 'Send a message', autocomplete: 'off',
  }) as HTMLInputElement;
  const send = h('button', {
    class: 'msg-send', type: 'button', 'aria-label': 'Send a message',
  }, icon(icons.send, 24)) as HTMLButtonElement;

  /**
   * Sending really does add the message, for the length of the session.
   *
   * Nam: "typing the chat and sending doesnt do anything on our site. I would
   * like to still add the message to the chat as if we have sent it, but of
   * course if you refresh the site those messages will be gone. It adds to the
   * illusion." Nothing is persisted, which is the intended behaviour rather than
   * a shortcut -- a reload puts the cover letter back exactly as written.
   *
   * It was already being added, in fact. The bug was that nobody could see it:
   * the bubble landed 1813px down a 423px-tall scrollport with scrollTop still
   * at 0, so the panel looked inert. Hence the scroll below -- a send that
   * produces no visible change is indistinguishable from a dead button.
   *
   * Timestamped HH:MM to match the messages it sits beside. `clock()` in state.ts
   * would give "2:47 PM", which is right for the top-bar clock and wrong next to
   * a column of "09:00".
   *
   * No auto-reply from Nam. It was tempting and it would be inventing a
   * conversation the CV does not claim to have had.
   */
  const submit = (): void => {
    const text = field.value.trim();
    if (!text) return;
    field.value = '';
    send.disabled = true;
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const bubble = h('div', { class: 'msg msg-guest' },
      h('div', { class: 'msg-from' }, `You  ${at}`),
      h('div', { class: 'msg-body' }, text)) as HTMLElement;
    // Before the Transcript heading, so sent messages land at the end of the
    // conversation and stack in order across several sends.
    list.insertBefore(bubble, list.querySelector('.shead'));
    // Bring it to the bottom of the scrollport rather than calling
    // scrollIntoView, which would be free to scroll ancestors too.
    const top = bubble.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    list.scrollTop = top - list.clientHeight + bubble.offsetHeight + 16;
  };
  send.disabled = true;
  field.addEventListener('input', () => { send.disabled = field.value.trim() === ''; });
  field.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') submit(); });
  send.addEventListener('click', submit);

  // The send control lives INSIDE the frame, so the frame is its own element
  // wrapping both rather than a background on the field. See styles.css.
  return h('div', { class: 'msg-wrap' },
    list,
    h('div', { class: 'msg-composer' },
      h('div', { class: 'msg-box' }, field, send)));
}

/**
 * Meet's two participant lists, above our own timeline.
 *
 * Nam asked for these mirrored "including the raised hands list and contributors
 * list — only the raised hands list allow interaction: lower or lower all", and
 * that restriction is the right one. Meet's contributor row offers mute and an
 * overflow that this page has nothing behind; rendering them as controls would
 * be three buttons that lie. They are labels here, and marked as such.
 *
 * Geometry measured in the live panel at 1440x900 — see the note in styles.css
 * for the offsets.
 */
export function peopleLists(o: { handRaised: boolean; pinned: boolean; onLower: () => void; name: string }): HTMLElement {
  const initials = o.name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();

  const section = (title: string, n: number, body: HTMLElement): HTMLElement => {
    const caret = h('span', { class: 'ppl-sec-caret' }, sym('expand_more', 24));
    const sec = h('div', { class: 'ppl-sec' },
      h('button', { class: 'ppl-sec-toggle', type: 'button', 'aria-expanded': 'true' },
        h('div', { class: 'ppl-sec-head' }, h('span', {}, title), h('span', { class: 'ppl-sec-n' }, String(n)), caret)),
      h('div', { class: 'ppl-sec-body' }, body)) as HTMLElement;
    const btn = sec.querySelector('button') as HTMLButtonElement;
    btn.addEventListener('click', () => {
      const shut = sec.classList.toggle('is-shut');
      btn.setAttribute('aria-expanded', String(!shut));
    });
    return sec;
  };

  /**
   * MEASURED: the pinned marker rides the row avatar's bottom-right — a 15px
   * `keep` in #e3e3e3 over a 32px circle, offset +20/+20 from its top left.
   *
   * It appears on the CONTRIBUTORS row only. With a hand up there are two rows
   * for the same person and just one marker, on the lower one, so `showPin`
   * is a parameter rather than something derived from `o.pinned` inside here.
   */
  const row = (sub: string, action: HTMLElement | null, showPin = false): HTMLElement =>
    h('div', { class: 'ppl-row' },
      h('span', { class: 'ppl-av', 'aria-hidden': 'true' }, initials,
        ...(showPin && o.pinned
          ? [h('span', { class: 'ppl-pin', role: 'img', 'aria-label': 'Pinned for yourself' }, sym('keep', 15))]
          : [])),
      h('div', { class: 'ppl-who' },
        h('span', { class: 'ppl-name' }, o.name + ' (You)'),
        h('span', { class: 'ppl-sub' }, sub)),
      action);

  const lowerOne = h('button', {
    class: 'ppl-act', type: 'button', 'aria-label': `Lower ${o.name}'s hand`,
  }, sym('back_hand', 20)) as HTMLButtonElement;
  lowerOne.addEventListener('click', o.onLower);
  ripple(lowerOne);

  const lowerAll = h('button', { class: 'ppl-lowerall-btn', type: 'button', 'aria-label': 'Lower all hands' }, 'Lower all') as HTMLButtonElement;
  lowerAll.addEventListener('click', o.onLower);
  ripple(lowerAll);

  const hands = o.handRaised
    ? h('div', {}, h('div', { class: 'ppl-lowerall' }, lowerAll), row('Meeting host', lowerOne))
    : h('div', { class: 'ppl-empty' }, 'No one has their hand up.');

  const micLabel = h('span', { class: 'ppl-act is-static', role: 'img', 'aria-label': 'Microphone off' }, sym('mic_off', 20));

  return h('div', { class: 'ppl-lists' },
    section('Raised hands', o.handRaised ? 1 : 0, hands),
    section('Contributors', 1, row('Meeting host', micLabel, true)));
}

/**
 * The career timeline, which used to squat inside People.
 *
 * Nam: "in our version this People side panel also contain all this info
 * 'Mahjong Logic Apr 2019 — present' and more stuff from my CV. Dont put it
 * here. This is a panel for the people in the meeting."
 *
 * Correct, and the fix is better than a deletion: it gets its own panel, reached
 * from the participant-count popup where Meet offers "View everyone in this
 * call". Ours offers "View more about Nam" — which is the moment the clone stops
 * being a clone and starts being the CV.
 */
export function renderAbout(): HTMLElement {
  const placed = layoutTimeline(
    roles.map((r) => ({ id: r.id, from: r.from, to: r.to })),
    NOW,
  );
  const byLane = new Map<number, typeof placed>();
  for (const p of placed) {
    const lane = byLane.get(p.lane) ?? [];
    lane.push(p);
    byLane.set(p.lane, lane);
  }

  const kindOf = (id: string): string => roles.find((r) => r.id === id)?.kind ?? '';
  const orgOf = (id: string): string => roles.find((r) => r.id === id)?.org ?? '';

  const axis = h(
    'div',
    { class: 'axis', role: 'img', 'aria-label': 'Timeline of roles from 2013 to 2026. Wasabi Productions runs from 2019 to the present and is the longest engagement.' },
    ...[...byLane.keys()]
      .sort((a, b) => a - b)
      .map((lane) =>
        h(
          'div',
          { class: 'axis-row' },
          ...(byLane.get(lane) ?? []).map((p) =>
            h(
              'div',
              {
                class: `axis-bar ${kindOf(p.id) === 'engineering' ? 'eng' : kindOf(p.id)}`,
                style: `left:${(p.x * 100).toFixed(2)}%;width:${Math.max(p.w * 100, 9).toFixed(2)}%`,
                title: orgOf(p.id),
              },
              orgOf(p.id),
            ),
          ),
        ),
      ),
    h('div', { class: 'axis-ticks' }, h('span', {}, '2013'), h('span', {}, '2019'), h('span', {}, 'today')),
  );

  // Review H2: the two concurrent roles are the thing a recruiter squints at,
  // so say it out loud instead of letting them guess.
  const concurrent = roles.filter((r) => r.to === null);
  const note =
    concurrent.length > 1 && overlaps(concurrent[0]!, concurrent[1]!, NOW)
      ? h(
          'p',
          { class: 'overlap-note' },
          'Two of these overlap, and that is not a typo on the CV. The engineering role has been running for ',
          h('b', {}, 'seven years'),
          ' and still is; the commercial one was taken on alongside it in late 2025 to learn the customer side of the same industry. The long bar is the career.',
        )
      : null;

  return h(
    'div',
    {},
    h('p', { class: 'pnote' }, 'Every participant in this call is a chapter. They joined in this order.'),
    axis,
    note,
    ...roles.map((r) =>
      h(
        'div',
        { class: 'role' },
        h(
          'div',
          { class: 'role-head' },
          h('h3', { class: 'role-org' }, r.org),
          h('span', { class: 'role-when' }, `${r.fromLabel}, ${r.toLabel}`),
        ),
        h('div', { class: 'role-title' }, `${r.title} · ${r.place}`),
        h('ul', {}, ...r.bullets.map((b) => h('li', {}, b))),
      ),
    ),
  );
}

export function renderPresent(store: Store): HTMLElement {
  const wrap = h('div', {});
  const body = h('div', {});

  const nav = h(
    'div',
    { class: 'slide-nav', role: 'tablist', 'aria-label': 'Case studies' },
    ...caseStudies.map((cs) =>
      h(
        'button',
        {
          class: 'chip',
          type: 'button',
          role: 'tab',
          'aria-pressed': 'false',
          'data-cs': cs.id,
          onclick: () => store.dispatch({ t: 'spotlight', id: cs.id }),
        },
        cs.org,
      ),
    ),
  );

  const draw = (): void => {
    const id = store.get().spotlight ?? caseStudies[0]!.id;
    const cs = caseStudies.find((c) => c.id === id) ?? caseStudies[0]!;
    for (const chip of nav.querySelectorAll('button')) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-cs') === cs.id ? 'true' : 'false');
    }
    clear(body);
    body.appendChild(
      h(
        'div',
        { class: 'slide' },
        h('h3', {}, cs.title),
        h('div', { class: 'slide-org' }, `${cs.org} · ${cs.years}`),
        h('div', { class: 'slide-label' }, 'The problem'),
        h('p', {}, cs.problem),
        h('div', { class: 'slide-label' }, 'What I did'),
        h('ul', {}, ...cs.approach.map((a) => h('li', {}, a))),
        h('div', { class: 'slide-label' }, 'Why it matters for this team'),
        h('p', { class: 'relevance' }, cs.relevance),
        h('div', { class: 'stack' }, ...cs.stack.map((s) => h('span', {}, s))),
      ),
    );
  };

  wrap.append(
    h('p', { class: 'pnote' }, 'Screen share. Three projects and this page, which is the fourth.'),
    nav,
    body,
  );
  draw();
  store.subscribe(draw);
  return wrap;
}

export function renderTranscript(): HTMLElement {
  /*
   * Review T11 and A1: labelled as scripted, and rendered as a static list
   * rather than a live region that floods a screen reader.
   *
   * N45. This used to render an eleven-line array of its own from data/cv.ts,
   * which was a second script — the one the call played on a loop behind
   * everything else. Now it renders the conversation itself, stamped by the same
   * derived clock the Scripts panel prints, so a transcript that disagrees with
   * what is actually said is no longer a thing that can happen.
   */
  const transcript = transcriptLines(profile.name);
  return h(
    'div',
    {},
    h(
      'p',
      { class: 'pnote' },
      'Transcript. Scripted, not recognised: there is no audio track here, and pretending otherwise would be a lie ' +
        'told in a job application. Live recognition is a separate, optional thing: turn on your microphone and it ' +
        'transcribes you. The timestamps are where each line falls if nobody interrupts; you almost certainly did.',
    ),
    ...transcript.map((l) =>
      h(
        'p',
        { class: 'msg' },
        h('span', { class: 'msg-from' }, `${l.speaker} · ${String(Math.floor(l.at / 60)).padStart(2, '0')}:${String(l.at % 60).padStart(2, '0')}`),
        h('span', { class: 'msg-body', style: 'display:block' }, l.text),
      ),
    ),
  );
}


/**
 * The People panel proper — the participants and nothing else, which is all the
 * original puts here.
 */
export function renderPeople(o: { handRaised: boolean; pinned: boolean; onLower: () => void }): HTMLElement {
  return peopleLists({ handRaised: o.handRaised, pinned: o.pinned, onLower: o.onLower, name: profile.name });
}
