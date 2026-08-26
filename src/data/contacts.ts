// The people the Calls tab can reach.
//
// Meet's Calls tab exists to ring someone you know. Ours keeps that job and
// changes who: the people who can vouch for this application. The screen is a
// clone; the contents are references.
//
// PRIVACY, AND WHY THIS FILE SHIPS WITH PLACEHOLDERS
// -------------------------------------------------
// Everything in this array ends up in a public, indexable page. A referee's
// address published there is published for good — crawlers keep copies long
// after an edit. That is the referee's call to make, not ours, so nothing real
// goes in until they have said yes.
//
// To use a real person: replace one entry, keep the shape. `href` is where the
// button actually goes, so it is the only field that has to be reachable.
//
// Deliberately NOT here: any phone number. The build asserts that Nam's own
// number appears nowhere in the web bundle (see test/suite.ts), and a referee's
// number on a public page is a worse version of the same problem. `tel:` is
// supported by the shape if a referee ever asks for it.

export interface Contact {
  id: string;
  name: string;
  /** Shown under the name, exactly as Meet shows an address. */
  email: string;
  /** Monogram for the fallback avatar, when there is no photo. */
  initials: string;
  /** Avatar tint. Meet assigns these per contact; ours are chosen, not measured. */
  tint: string;
  /** Ink on that tint. */
  ink: string;
  /**
   * What this person can speak to. Meet has no equivalent line — it knows who
   * your contacts are and does not need to say. On a CV the whole point is
   * saying, so this is a deliberate addition, shown in the call dialog.
   */
  relation: string;
  /** Where "Video call" goes. A mailto: is honest for a page with no backend. */
  href: string;
  /**
   * Where "Voice call" goes. Undefined disables the button — but note that on
   * the live product Voice call is always a live, enabled button, so leaving
   * this unset on every contact (which is what shipped) produced a control that
   * is permanently dead in a clone of a screen where it never is. Set it.
   */
  voice?: string;
  /** True once the person has agreed to appear here. Gates the real address. */
  confirmed: boolean;
  /**
   * A referral into a specific employer. Shown only when a company code is set,
   * because naming a referral for a company you are not applying to is untrue.
   */
  referral?: boolean;
}

/**
 * PLACEHOLDERS. Structurally complete so the screen is real and clickable, but
 * no third party's address is published until Nam has asked them. Swap in the
 * real entries and set confirmed: true.
 */
export const CONTACTS: Contact[] = [
  {
    /*
     * A real person, and the only confirmed entry. Nam: "I have the contact of my
     * referral here: https://diepbp.github.io/. Guard this against the company
     * param, add him into the list as my referral."
     *
     * Guarded because a referral is specific to the company being applied to --
     * naming someone as your route into an employer you are not applying to is
     * both untrue and unfair to them. It appears only when a ?c= code is present;
     * see referrableContacts() below.
     *
     * No address published: the link is his own public page, which he controls
     * and can take down. That keeps the privacy rule at the top of this file
     * intact while still making the referral real.
     */
    id: 'ref-diep',
    name: 'Diep — referral',
    email: 'diepbp.github.io',
    initials: 'D',
    tint: '#c4eed0',
    ink: '#072711',
    relation: 'Can refer me internally, and has worked with me directly. His own page is the introduction.',
    href: 'https://diepbp.github.io/',
    voice: 'https://diepbp.github.io/',
    confirmed: true,
    referral: true,
  },
  {
    id: 'ref-lead',
    name: 'Reference — engineering lead',
    email: 'ask@example.com',
    initials: 'EL',
    tint: '#0b57d0',
    ink: '#ffffff',
    relation: 'Led the team through two of the four case studies. Can speak to how I work under a deadline.',
    href: 'mailto:ask@example.com?subject=Reference%20for%20Nam%20Nguyen',
    voice: 'mailto:ask@example.com?subject=Reference%20call%20for%20Nam%20Nguyen',
    confirmed: false,
  },
  {
    id: 'ref-peer',
    name: 'Reference — client-side peer',
    email: 'ask@example.com',
    initials: 'CP',
    tint: '#c2e7ff',
    ink: '#001d35',
    relation: 'Paired on the real-time client for three years. Can speak to the code rather than the outcome.',
    href: 'mailto:ask@example.com?subject=Reference%20for%20Nam%20Nguyen',
    voice: 'mailto:ask@example.com?subject=Reference%20call%20for%20Nam%20Nguyen',
    confirmed: false,
  },
];

/**
 * The contacts to show for this send. Referrals are employer-specific, so they
 * appear only when a ?c= code names one.
 */
export function referrableContacts(named: boolean): Contact[] {
  return CONTACTS.filter((c) => !c.referral || named);
}

/** The account the call goes out as. Meet prints the signed-in address here. */
export const CALLING_AS = 'nam@wasabiproductions.com';
