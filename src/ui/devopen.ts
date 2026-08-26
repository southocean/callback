// Opening Project specifications, in the palette of whatever opened it.
//
// Nam: "our home screen is light mode, so opening the project specs here should
// have light mode too. But when in the call, everything looks dark, so if we open
// project specs it should be in dark mode. Then after the call, the project specs
// should be light mode again."
//
// So the mode is derived from the current screen rather than stored, which means
// it cannot go stale: leaving the call puts the next open back in light without
// anything having to remember to reset it.

import type { Store } from '../state.js';

export async function openDev(store: Store): Promise<void> {
  const s = store.get();
  const m = await import('./devportal.js');
  m.openDevPortal(s.reducedMotion, s.screen === 'call' ? 'dark' : 'light');
}
