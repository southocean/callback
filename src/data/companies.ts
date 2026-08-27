// Per-company customisation, unlocked by a query parameter.
//
// Nam: "this CV is really nicely done and quite sterile for different jobs, I can
// possibly use this to send other companies too. But that means I cannot have
// 'google meet' in the text anywhere... Can we do some kind of url param,
// something obsfucated that would trigger showing these google terms."
//
// Every company-specific line — the applying-for header, the scheduled meeting
// title, the opening chat line — resolves through here rather than being written
// into the renderers, so swapping employers is a parameter rather than a pass
// over the codebase.
//
// WHAT THE DEFAULT IS, AND WHY IT CHANGED (N66). It used to be the neutral
// version: no code, no employer named. Nam's call is that the reuse is
// hypothetical and the Google application is not, so no code now resolves to
// `?c=1`, and `?c=0` is how you ask for the neutral build back. The neutral copy
// below is untouched; only which one you get by default has moved.
//
// `?c=` is deliberately unremarkable either way. It reads like a campaign
// parameter, not like a switch that changes the content, and it survives being
// pasted into an email without looking like a tracking link.
//
// The clone itself is NOT gated. Rebuilding Meet is the portfolio piece whoever
// is reading it; only the claim "I am applying to you, for this role" is
// company-specific.

export interface Company {
  /** The ?c= value. Short, boring, no meaning to a stranger. */
  code: string;
  /** For the #company index only — never rendered in the CV. */
  label: string;
  /** Who the application is to. */
  employer: string;
  /** The role as they advertise it. */
  role: string;
  place: string;
  /** The one line under the name: "applying for ...". */
  target: string;
  /** The scheduled meeting on the home screen. */
  meeting: string;
  /** The opening line of the cover-letter chat. */
  opener: string;
  /** Anything else worth recording about this send. */
  notes: string;
}

/**
 * What every reader sees without a code. No employer, no product, no city —
 * every word of it is true regardless of who opens the link.
 */
export const NEUTRAL = {
  employer: '',
  role: 'Senior Software Engineer, Web Development',
  place: '',
  target: 'Senior Software Engineer, Web Development',
  meeting: 'Interview for Senior Software Engineer, Web Development',
  opener: "Hi. I'm Nam, I live in Uppsala, and I am applying for a senior web development role.",
} as const;

export const companies: Company[] = [
  {
    code: '1',
    label: 'Google Meet, Stockholm',
    employer: 'Google',
    role: 'Senior Software Engineer, Web Development',
    place: 'Stockholm',
    target: 'Senior Software Engineer, Web Development at Google Meet, Stockholm',
    meeting: 'Interview for Senior Software Engineer at Google Meet, Stockholm',
    opener: "Hi. I'm Nam, I live in Uppsala, and I want the Web Development role on Google Meet in Stockholm.",
    notes:
      'The original target, and the reason the whole site is a rebuild of Meet. This is the only code where ' +
      'naming the product is an asset rather than a liability.',
  },
];

/** The resolved copy for a code, falling back to the neutral version. */
export interface Pitch {
  employer: string;
  role: string;
  place: string;
  target: string;
  meeting: string;
  opener: string;
  /** True when a code matched, so callers can add company-only flourishes. */
  named: boolean;
}

export function companyByCode(code: string | null): Company | undefined {
  if (!code) return undefined;
  return companies.find((c) => c.code === code);
}

export function pitchFor(code: string | null): Pitch {
  const c = companyByCode(code);
  if (!c) return { ...NEUTRAL, named: false };
  return {
    employer: c.employer,
    role: c.role,
    place: c.place,
    target: c.target,
    meeting: c.meeting,
    opener: c.opener,
    named: true,
  };
}

/**
 * Read the code off the URL.
 *
 * `location.search`, not the hash — the hash is the app's router and a code has
 * to survive navigating between screens. Kept out of every rendered link so the
 * parameter is only ever present because someone was sent it.
 */
/**
 * The code that means "name nobody" -- board ticket N66.
 *
 * It has to be a REAL code rather than an unrecognised one, because an
 * unrecognised value now falls back to the default rather than to neutral. A
 * reader who wants the reusable build asks for it by name.
 */
export const NEUTRAL_CODE = '0';

/**
 * What a visitor with no code at all gets.
 *
 * Nam: "let's all in for google first, so let's just treat the default CV
 * (without c parameter) as c = 1 ... Lets try our chance with google first
 * before reusing the CV for other job ads."
 *
 * The machinery above was built for a reuse that has not happened, and until it
 * does, the neutral build is the one costing something: the single application
 * actually in flight was the one rendering a generic heading over one
 * employer's requirements. That is T7 on the board, and this closes it from the
 * other end.
 */
export const DEFAULT_CODE = '1';

export function codeFromUrl(search: string): string | null {
  const v = new URLSearchParams(search).get('c');
  if (v === NEUTRAL_CODE) return null;
  return v && companyByCode(v) ? v : DEFAULT_CODE;
}

/**
 * The pitch for whatever code is on the URL right now.
 *
 * Read from the URL rather than threaded through every renderer: the code cannot
 * change during a session, so there is one answer for the whole page life and
 * five call sites do not each need a new parameter.
 */
export function currentPitch(): Pitch {
  return pitchFor(codeFromUrl(location.search));
}

/**
 * The subject line for an "email me" link.
 *
 * Hard-coded as "Google Meet web — Stockholm" in three places, including the
 * neutral send, which quietly defeated the whole point of this module: no
 * employer is named unless a ?c= code names one. Found by sweeping the ended
 * screen.
 */
export function mailSubject(): string {
  const p = currentPitch();
  return encodeURIComponent(p.named ? p.target : 'Your interactive CV');
}
