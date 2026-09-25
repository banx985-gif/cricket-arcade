// Cricket Arcade — seeded random service (plan 43A.2).
// ALL gameplay randomness comes from here. Never call Math.random() in game code.
//
// Each innings gets one seed. From it we derive separate named streams
// ('bowling', 'batting', 'fielding', …) so that, for example, the player's
// shot choices never change which deliveries come next: same seed = same
// 20 deliveries, whatever the player does.
// The 'fx' stream is for purely visual jitter (sparks, crowd) and is kept apart
// so visuals can never disturb gameplay results.

// mulberry32: small, fast, good enough for games.
function makeRng(seed) {
  let a = seed >>> 0;
  const rng = {
    seed: seed >>> 0,
    // Saveable position in the sequence (for mid-match resume).
    getState() { return a >>> 0; },
    setState(v) { a = v >>> 0; },
    next() {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) { return min + (max - min) * rng.next(); },
    rangeOf(pair) { return pair[0] + (pair[1] - pair[0]) * rng.next(); },
    int(min, maxInclusive) { return min + Math.floor(rng.next() * (maxInclusive - min + 1)); },
    chance(p) { return rng.next() < p; },
    pick(list) { return list[Math.floor(rng.next() * list.length)]; },
    weighted(list, key) {
      const k = key || 'weight';
      let total = 0;
      for (const it of list) total += it[k];
      let r = rng.next() * total;
      for (const it of list) { r -= it[k]; if (r < 0) return it; }
      return list[list.length - 1];
    },
  };
  return rng;
}

// Stable string -> 32-bit hash (FNV-1a), used to derive stream seeds.
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const RNG = {
  seed: 0,
  streams: {},
  fx: makeRng(0x5eed),     // visual-only stream, never used for results

  // Start a fresh set of streams from one seed.
  begin(seed) {
    this.seed = seed >>> 0;
    this.streams = {};
    if (typeof Log !== 'undefined') Log.add('seed', 'Innings seed ' + this.seed);
    if (typeof console !== 'undefined') console.log('[Cricket Arcade] innings seed:', this.seed);
    return this.seed;
  },

  stream(name) {
    if (!this.streams[name]) {
      this.streams[name] = makeRng(hashString(name + ':' + this.seed));
    }
    return this.streams[name];
  },

  // Save / restore every stream exactly (mid-match resume).
  snapshot() {
    const streams = {};
    for (const k of Object.keys(this.streams)) streams[k] = this.streams[k].getState();
    return { seed: this.seed, streams };
  },
  restore(snap) {
    this.seed = snap.seed >>> 0;
    this.streams = {};
    for (const k of Object.keys(snap.streams || {})) {
      const r = this.stream(k);
      r.setState(snap.streams[k]);
    }
  },

  // A new seed when none is fixed. Uses the clock, not Math.random, so every
  // source of variation in the game still flows through this one file.
  freshSeed() {
    const t = Date.now() ^ Math.floor((typeof performance !== 'undefined' ? performance.now() : 0) * 1000);
    return (hashString(String(t)) % 1000000000) >>> 0;
  },
};
