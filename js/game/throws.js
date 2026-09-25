// Cricket Arcade — the throw back after a ball is fielded (A5, plan 6.3).
// A marker slides along a bar; where it's stopped decides the throw:
//   perfect -> direct hit on the stumps (run out if the batter is short)
//   okay    -> to the keeper, who takes keeperDelay longer to break the stumps
//   bad     -> overthrow: past the keeper, the batters can steal one more run
// The computer's fielders roll the same three outcomes from their Fielding.
// Pure: no drawing. Tuning in MATCH_DATA.throw.

const Throw = {
  // Marker position on the bar (-1..1) after t real seconds: sweeps to and fro.
  meterPos(t, period) {
    const p = period || MATCH_DATA.throw.meter.period;
    const k = ((t / p) % 1 + 1) % 1;              // 0..1
    return k < 0.5 ? -1 + k * 4 : 3 - k * 4;       // -1 -> 1 -> -1
  },

  // Zone half-widths, a little wider for a good fielder.
  zones(fielding) {
    const M = MATCH_DATA.throw.meter;
    const k = 1 + M.fieldingWidens * Teams.n(fielding === undefined ? 50 : fielding);
    return { perfect: M.perfect * k, okay: Math.min(0.95, M.okay * k) };
  },

  grade(pos, zones) {
    const z = zones || this.zones();
    const a = Math.abs(pos);
    return a <= z.perfect ? 'perfect' : a <= z.okay ? 'okay' : 'bad';
  },

  // The computer's throw.
  aiGrade(fielding, rng) {
    const A = MATCH_DATA.throw.ai;
    const n = Teams.n(fielding === undefined ? 50 : fielding);
    const pp = Math.max(0.02, Math.min(0.8, A.perfect + A.fielding * n));
    const pb = Math.max(0.02, Math.min(0.5, A.bad - A.fielding * 0.5 * n));
    const r = rng.next();
    return r < pp ? 'perfect' : r < pp + pb ? 'bad' : 'okay';
  },

  // Throw flight from the fielder. from: {x,y,z}; t0 = when it leaves the hand.
  // Returns { from, to, t0, t1, peak, grade, returnT, over: extra-stop point? }
  // returnT = when the stumps are broken at the keeper's end.
  make(from, t0, grade) {
    const R = MATCH_DATA.running, T = MATCH_DATA.throw;
    const target = grade === 'perfect' ? { x: 0, y: 0.45, z: 0 }
      : grade === 'okay' ? R.throwTarget
      : { x: from.x > 0 ? -3 : 3, y: 0.5, z: -16 };            // sails past the keeper
    const dist = Math.hypot(target.x - from.x, target.z - from.z);
    const t1 = t0 + dist / (R.throwSpeed * (T.speed[grade] || 1));
    let returnT = t1;
    if (grade === 'okay') returnT = t1 + T.keeperDelay;
    // Overthrow: the ball has further to go and someone has to chase it.
    if (grade === 'bad') returnT = t0 + Math.hypot(R.throwTarget.x - from.x, R.throwTarget.z - from.z) / R.throwSpeed + T.overthrowDelay;
    return { from, to: target, t0, t1, peak: 1.5 + dist * 0.04, grade, returnT };
  },
};
