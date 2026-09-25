// Cricket Arcade — generated teams (plan 7.16, 8.9, 9).
// Every player on both sides gets a name from an origin pack and a full stat
// block, made from a seeded stream so the same match seed = the same teams.
// Stat helpers used everywhere live here too.

const Teams = {
  // A stat as a number around 0: 50 -> 0, 90 -> +0.8, 30 -> -0.4.
  n(v) { return ((v === undefined ? 50 : v) - 50) / 50; },
  // 0..1 version (for "saves" and "reduces" factors).
  u(v) { return Math.max(0, Math.min(1, (v === undefined ? 50 : v) / 99)); },
  avg(p, keys) {
    let t = 0;
    for (const k of keys) t += p.stats[k];
    return t / keys.length;
  },

  batRating(p) { return this._weighted(p, PLAYER_DATA.overall.bat); },
  bowlRating(p) { return this._weighted(p, PLAYER_DATA.overall.bowl); },
  _weighted(p, w) {
    let t = 0, n = 0;
    for (const k of Object.keys(w)) { t += p.stats[k] * w[k]; n += w[k]; }
    return Math.round(t / n);
  },
  // Overall (plan 9.6): the better of the two roles, all-rounders get a bit of both.
  overall(p) {
    const a = this.batRating(p), b = this.bowlRating(p);
    if (p.role === 'all') return Math.round(Math.max(a, b) * 0.7 + Math.min(a, b) * 0.3);
    return p.role === 'bowl' ? b : a;
  },

  // ---- names ----
  _name(origin, gender, used, rng) {
    const O = ORIGIN_PACKS.origins[origin];
    const block = new Set(ORIGIN_PACKS.realNameBlocklist);
    const given = rng.pick(O.givenNames[gender]);
    for (let tries = 0; tries < 40; tries++) {
      const sur = rng.pick(O.surnames);
      const full = given + ' ' + sur;
      if (block.has(full.toLowerCase()) || used.has(sur)) continue;
      used.add(sur);
      return { full, short: given[0] + '. ' + sur };
    }
    const sur = rng.pick(O.surnames);
    return { full: given + ' ' + sur, short: given[0] + '. ' + sur };
  },

  // Build a team of 11. o: { side, rating, origin?, rng }
  generate(o) {
    const T = PLAYER_DATA.teams, S = PLAYER_DATA.stats;
    const rng = o.rng;
    const origins = Object.keys(ORIGIN_PACKS.origins);
    const origin = o.origin || rng.pick(origins);
    const gender = rng.chance(0.5) ? 'masculine' : 'feminine';
    const used = new Set();
    const clamp = (v) => Math.max(1, Math.min(99, Math.round(v)));
    const around = (c, spread) => clamp(c + rng.range(-spread, spread));
    const players = T.lineup.map((slot, i) => {
      const nm = this._name(origin, gender, used, rng);
      const stats = {};
      const bat = o.rating * slot.bat, bowl = o.rating * slot.bowl;
      const bowls = !!slot.families;
      for (const k of S.batting) stats[k] = around(bat, T.statSpread);
      for (const k of S.bowling) stats[k] = bowls ? around(bowl, T.statSpread) : clamp(rng.rangeOf(T.offRoleStat));
      for (const k of S.shared) stats[k] = around(o.rating, T.shared.spread);
      const p = {
        id: o.side + (i + 1), no: i + 1, name: nm.full, short: nm.short,
        role: slot.role, keeper: !!slot.keeper,
        family: bowls ? rng.pick(slot.families) : null,
        leftHanded: rng.chance(T.leftHanded),
        stats,
      };
      p.overall = this.overall(p);
      return p;
    });
    // Always at least one of each kind of attack: pace, swing and spin.
    const fams = players.filter((p) => p.family).map((p) => p.family);
    if (!fams.includes('swing')) players.find((p) => p.family === 'fast' && p.role === 'bowl').family = 'swing';
    if (!fams.some((f) => f === 'offspin' || f === 'legspin')) players.find((p) => p.role === 'all' && p.family).family = 'offspin';
    return { side: o.side, origin, rating: o.rating, players };
  },

  // The two Quick Match sides, from the match seed.
  forMatch(difficulty) {
    const D = PLAYER_DATA.difficulty[difficulty || PLAYER_DATA.quickMatchDifficulty];
    const rng = RNG.stream('teams');
    const player = this.generate({ side: 'player', rating: D.player, rng });
    let aiOrigin = rng.pick(Object.keys(ORIGIN_PACKS.origins));
    if (aiOrigin === player.origin) aiOrigin = rng.pick(Object.keys(ORIGIN_PACKS.origins));
    const ai = this.generate({ side: 'ai', rating: D.ai, origin: aiOrigin, rng });
    return { player, ai };
  },

  // A neutral 50-rated player (challenge modes, tests).
  plain(id, family) {
    const stats = {};
    for (const g of Object.values(PLAYER_DATA.stats)) for (const k of g) stats[k] = 50;
    return { id: id || 'x', no: 1, name: '', short: '', role: family ? 'bowl' : 'bat', family: family || null, stats, overall: 50 };
  },
  // Every stat set to one value (tests and the balance harness).
  flat(id, value, family) {
    const p = this.plain(id, family);
    for (const k of Object.keys(p.stats)) p.stats[k] = value;
    p.overall = value;
    return p;
  },
};
