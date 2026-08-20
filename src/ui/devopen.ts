// One door to the build notes, from two places: the Settings cog on the home
// screen and the Konami code anywhere. Kept in its own module so the portal
// stays a deferred chunk — importing this costs nothing until it is called.

import type { Store } from '../state.js';

export async function openDev(store: Store): Promise<void> {
  const m = await import('./devportal.js');
  m.openDevPortal(store.get().reducedMotion);
}
