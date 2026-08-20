// Network condition simulator.
//
// The reason this exists: a video client's hard problems are not in the happy
// path. Review T6 pointed out that the story worth telling is four people on
// four networks, one of them on hotel wifi. So the site lets you break the
// call on purpose and watch the UI cope.
//
// Deterministic by design — a seeded generator rather than Math.random — so the
// distribution can be asserted in a unit test.

export type Profile = 'good' | 'shaky' | 'hotel' | 'collapse';

export interface Conditions {
  /** Round-trip time, ms. */
  rtt: number;
  /** Packet loss, 0..1. */
  loss: number;
  /** Jitter, ms. */
  jitter: number;
  /** Vertical resolution the encoder would settle on. */
  height: number;
  label: string;
  /** Copy shown to the visitor when things are bad. */
  note: string;
}

interface ProfileSpec {
  rtt: [number, number];
  loss: [number, number];
  jitter: [number, number];
  heights: number[];
  label: string;
  note: string;
}

export const profiles: Record<Profile, ProfileSpec> = {
  good: {
    rtt: [18, 34],
    loss: [0, 0.002],
    jitter: [1, 4],
    heights: [1080, 1080, 720],
    label: 'Fibre',
    note: 'Nothing to do. This is the network nobody files a bug about.',
  },
  shaky: {
    rtt: [60, 140],
    loss: [0.005, 0.03],
    jitter: [8, 26],
    heights: [720, 540, 540],
    label: 'Mobile, moving',
    note: 'Resolution steps down before the audio does. Audio is the thing you protect.',
  },
  hotel: {
    rtt: [180, 420],
    loss: [0.04, 0.12],
    jitter: [40, 110],
    heights: [360, 270, 180],
    label: 'Hotel wifi',
    note: 'The one from the case study. Four players, one of them here, all of them expecting the same board.',
  },
  collapse: {
    rtt: [600, 1400],
    loss: [0.18, 0.45],
    jitter: [150, 400],
    heights: [180, 180, 90],
    label: 'Falling over',
    note: 'Past this point the honest move is to stop pretending and tell the user. Silence is worse than a warning.',
  },
};

/** mulberry32 — small, fast, and repeatable, which is the whole point. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(range: [number, number], r: number): number {
  return range[0] + (range[1] - range[0]) * r;
}

export function sample(profile: Profile, seed: number): Conditions {
  const spec = profiles[profile];
  const r = rng(seed);
  const heights = spec.heights;
  const height = heights[Math.floor(r() * heights.length)] ?? heights[0] ?? 720;
  return {
    rtt: Math.round(lerp(spec.rtt, r())),
    loss: Number(lerp(spec.loss, r()).toFixed(4)),
    jitter: Math.round(lerp(spec.jitter, r())),
    height,
    label: spec.label,
    note: spec.note,
  };
}

/**
 * What a client should actually do about the conditions. This is the bit that
 * matters: a stats readout is a toy, a policy is engineering.
 */
export function policy(c: Conditions): { action: string; severity: 'ok' | 'warn' | 'bad' } {
  if (c.loss > 0.15 || c.rtt > 500) {
    return { action: 'Drop to audio only, tell the user why, keep the session alive for resync.', severity: 'bad' };
  }
  if (c.loss > 0.03 || c.rtt > 160) {
    return { action: 'Step resolution down, raise the jitter buffer, protect audio first.', severity: 'warn' };
  }
  return { action: 'Hold the current layer. Do not chase small variance — churn looks worse than the loss.', severity: 'ok' };
}
