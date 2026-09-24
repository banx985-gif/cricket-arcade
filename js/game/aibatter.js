// Cricket Arcade — AI batter for Wicket Rush (plan 7.7).
// The AI plays the SAME shots through the SAME contact + fielding rules as the
// player does in Six Smash — it just decides with numbers instead of thumbs.
// A harder ball (good line/length, perfect release, pressure, its weakness)
// widens its timing spread, so good bowling genuinely causes mistakes.
// Uses the 'ai' random stream only.

const AIBatter = {
  // Normal-distributed random number from the seeded stream (Box–Muller).
  _normal(rng) {
    const u = Math.max(1e-9, rng.next()), v = rng.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },

  // How hard this delivery is to play (0 = easy, ~1.5 = unplayable).
  difficulty(del, o) {
    const A = BOWLING_DATA.aiBatter;
    let d = A.difficulty[del.lengthId] || 0;
    const line = del.line;
    if (line >= -0.05 && line <= 0.45) d += A.corridorBonus;
    d += A.releaseGrade[o.releaseGrade] || 0;
    d += A.pressureEffect * (o.pressure || 0);
    if (A.weakness && del.lengthId === A.weakness.id) d += A.weakness.extra;
    if (o.freeHit) d -= 0.2;
    return Math.max(-0.3, d);
  },

  // Returns { leave } or { shot, err, aim, difficulty }.
  decide(del, o, rng) {
    const A = BOWLING_DATA.aiBatter;
    const sim = del.sim;
    const d = this.difficulty(del, o);

    // Leave balls well outside off that miss the stumps (not on a free hit).
    const i = sim.contactIdx;
    const bx = sim.path.x[i];
    if (!o.freeHit && !sim.hitsStumps && bx > 0.5 && rng.chance(A.leaveOutsideOff)) {
      return { leave: true, difficulty: d };
    }

    // Shot choice: aggressive on easy balls / free hits, blocks the hard ones.
    let shot;
    const powerChance = o.freeHit ? 0.95 : A.aggression * (1 - 0.45 * Math.min(1, Math.max(0, d)));
    if (rng.chance(powerChance)) shot = 'power';
    else if (d > 0.7 && rng.chance(A.defendWhenHard)) shot = 'defend';
    else shot = 'control';

    const sigma = A.timingSigma * (1 + Math.max(0, d) * A.difficultyToSigma);
    const err = (o.timingBias || 0) + this._normal(rng) * sigma;

    // Aim at a random part of the field; power shots go up, control stays low.
    const aim = {
      x: rng.range(-0.85, 0.85),
      y: shot === 'power' ? rng.range(-1, -0.4) : shot === 'control' ? rng.range(-0.2, 0.6) : 0,
      active: true,
    };
    return { shot, err, aim, difficulty: d };
  },
};
