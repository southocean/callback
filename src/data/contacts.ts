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
   *
   * Optional, and left unset unless the referee has said the thing it would
   * claim. Nam: "He has not worked with me directly, so I cant really say this."
   * A line here is a sentence put in someone else's mouth on a public page, so
   * an empty slot beats a flattering one they never agreed to. Unset, the dialog
   * omits the paragraph rather than reserving space for it.
   */
  relation?: string;
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
  /*
   * EMPTY, AND THAT IS THE CURRENT STATE RATHER THAN A GAP -- board ticket N263.
   *
   * This held one real, confirmed entry: the referral into the employer this CV
   * was written for. Nam, after the rejection: "the referral, remove."
   *
   * A referral is the most employer-specific thing on the whole site. It names a
   * person who put their word behind one application, and carrying that into a
   * CV sent anywhere else is untrue about the application and unfair to him.
   *
   * The screen it feeds already handles this: renderHome drops the Calls tab
   * when the list comes back empty, which is exactly what the neutral build has
   * always done. So nothing renders half-built; the tab is simply not there.
   *
   * The structure stays because the next real reference goes here and nowhere
   * else, with `confirmed` still gating the address.
   */
];

/**
 * The contacts to show for this send. Referrals are employer-specific, so they
 * appear only when a ?c= code names one.
 */
export function referrableContacts(named: boolean): Contact[] {
  return CONTACTS.filter((c) => !c.referral || named);
}

/**
 * What Meet prints under the call buttons.
 *
 * It was Nam's actual work address. Nam: "this is irrelevant ... Its my current
 * work email and should not be even mentioned here." Right on both counts — a
 * job application is the last place to publish the address you are applying away
 * from, and it was answering a question nobody had asked.
 *
 * Meet does put the signed-in account here, so the slot is real; what goes in it
 * is the joke the slot invites. A test now asserts the old value cannot come
 * back — see test/suite.ts.
 *
 * The SUBJECT only: the view already writes "Calling as " in front of it, and the
 * first attempt at this line included the prefix too, which rendered as
 * "Calling as Calling as someone who really wants this job".
 */
export const CALLING_AS = 'someone who really wants this job';
