// One decision, made before anything paints: is this a naked URL?
//
// If it is, the title card is the first screen -- board ticket N158.
//
// WHY THIS FILE EXISTS AT ALL, because a two-hundred-byte script with its own
// build entry looks like over-engineering until you try the alternatives.
//
// The home screen ships as static markup so first paint does not wait for the
// bundle (review U9), and the bundle is a deferred module. So the obvious version
// paints Google Meet, and then replaces it with a card whose entire job is to say
// that this is not Google Meet -- which on a slow connection is not a flicker, it
// is two seconds of exactly the ambush the ticket exists to remove.
//
// Three ways out, and two of them are closed:
//
//   * An inline <script> in the head. Closed: the CSP in index.html is
//     `script-src 'self'` with no 'unsafe-inline'. Inline STYLE is allowed and
//     inline script is not, and weakening that to save a request would be trading
//     a real defence for a small one.
//   * CSS alone. Closed: no selector can ask whether the URL has a fragment.
//   * A separate same-origin script that blocks. Open, allowed by 'self', and
//     what this is.
//
// It sets a class and adjusts one meta tag. The critical CSS does the hiding and
// ui/start.ts draws the card.
//
// ---------------------------------------------------------------------------
// IT USED TO REMEMBER, AND NOW IT DOES NOT
//
// The first version showed the card once per machine, on a localStorage flag.
// Nam's call to drop it: "we should always default to open #start on a naked url
// ... This means if you enter the naked link again, even on the same machine, you
// get the start. Or if you send the naked link to someone else they will see the
// start first."
//
// He is right, and the gain is larger than one press. The card was carrying a
// piece of hidden state that nobody could see and everybody could be confused by:
// the second person shown this CV over somebody's shoulder got no framing, a
// private window behaved differently from a normal one, storage denied needed its
// own answer, and testing the first minute needed a reset button in Settings. All
// of that came from remembering. The rule is now a pure function of the URL, and
// the cost is one press for somebody who has already decided to come back.
//
// The fragment is what carries "I have been here". Every navigation inside the
// app writes one -- #home, #call, #plain -- so a reload mid-visit lands where the
// visitor was, and only an address with nothing after it is a cold arrival.

/**
 * A fragment is an explicit intent and is never intercepted.
 *
 * #plain is the escape hatch a wary reader is sent to, #call and #tools are in
 * the README, and every panel is linkable. Putting a title card in front of a
 * link that already says where it is going would break a documented promise to
 * fix a problem that link does not have -- nobody who typed #plain is wondering
 * whether they are being invited to a meeting.
 *
 * #home IS a fragment, and that changed with the rule above. It used to count as
 * bare, on the reasoning that it is where a naked URL resolves to anyway. It is
 * now what the app writes the moment the visitor reaches the home screen under
 * their own steam, which makes it evidence rather than a synonym.
 */
if (!location.hash || location.hash === '#') {
  document.documentElement.className += ' pre-start';
  /*
   * And the browser furniture with it. index.html declares theme-color #ffffff,
   * which is correct for every other screen and wrong for this one: on a phone it
   * paints a white bar directly above a near-black page, which does not read as a
   * design, it reads as a page that failed to load.
   */
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', '#0b0b0d');
}
