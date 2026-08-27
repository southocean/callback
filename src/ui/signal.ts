// One channel, for the things the app does that are not clicks on anything.
//
// The guided tour answers back when you touch the shared desktop — drag a
// window, snap it, open the calendar. Most of those it can hear as clicks, but
// three of them it cannot: a drag is a gesture, a snap is the end of a gesture,
// and a panel can be opened from the keyboard. Those have to be announced.
//
// A CustomEvent on `document` rather than an imported callback, deliberately:
// the desktop is built inside a deferred chunk that knows nothing about the tour
// and must keep working when the tour is not running at all. An event that
// nobody is listening for costs one dispatch and changes nothing, which is the
// right price for a feature that is optional by construction.
//
// The key is `<source>:<what>` and the script matches it exactly — see the
// `event` quips in src/data/tour.ts.

export function signal(key: string): void {
  document.dispatchEvent(new CustomEvent('tour:signal', { detail: { key } }));
}
