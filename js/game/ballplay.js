// Cricket Arcade — what happens to one ball (shared by the match scenes, the
// challenges and the balance harness).
//
// BallPlay.fate() decides, the moment the batter commits, whether the bat meets
// the ball or the ball wins: beaten (bowled / LBW), hit wicket, or a clean
// miss. It combines everything at once (A3): the ball's line (does it hit the
// stumps, how straight), the delivery's threat, the release quality, the shot
// and its timing, and both players' stats. Uses the 'duel' stream.

const BallPlay = {
  isWide(del) {
    const W = BOWLING_DATA.wide;
    const at = del.sim.path.at(del.sim.contactIdx * CONFIG.PHYSICS_STEP, {});
    return at.x > W.offX || at.x < W.legX;
  },

  // o: { del, shotId, grade, left, bat, bowl, releaseGrade }
  // Returns { kind: 'contact' | 'beaten' | 'miss' | 'hitwicket', result: null | 'lbw' | 'bowled' | 'padLeg' }
  //   contact    the bat meets the ball (Contact.resolve takes over)
  //   beaten     the batter swung but the ball beat the bat
  //   miss       swung and missed / left it
  //   result     for beaten / miss: what the ball then did (null = missed the stumps too)
  fate(o, rng) {
    const del = o.del;
    // Developer panel: force the next ball's outcome (to see the moments).
    if (typeof Dev !== 'undefined' && Dev.forceFate) {
      const f = Dev.forceFate; Dev.forceFate = null;
      return f === 'hitwicket' ? { kind: 'hitwicket', result: 'hitwicket' } : { kind: o.left ? 'miss' : 'beaten', result: f };
    }
    if (o.left) return this._past({ kind: 'miss', result: Duel.missResult(del, true, rng) }, o, rng);
    if (rng.chance(Duel.hitWicketChance(o.bat, o.shotId, o.grade))) return { kind: 'hitwicket', result: 'hitwicket' };
    if (o.grade === 'miss') return this._past({ kind: 'miss', result: Duel.missResult(del, false, rng) }, o, rng);
    if (del.sim.hitsStumps) {
      const p = Duel.beatenChance({
        grade: o.grade, shotId: o.shotId, threat: del.threat || 1,
        releaseGrade: o.releaseGrade || del.releaseGrade || 'ai', stumpsX: del.sim.stumpsX, bat: o.bat, bowl: o.bowl,
      }) * (o.punish || 1);                     // difficulty: how hard a mistimed shot is punished
      if (rng.chance(p)) return { kind: 'beaten', result: Duel.missResult(del, false, rng) || 'bowled' };
    }
    return { kind: 'contact', result: null };
  },
  // M19 (plan 7.5, 7.6): a ball that beat the bat and missed the stumps. Against spin, a swing and a miss
  // (most of all a POWER shot, out of the crease) can be stumped by the keeper; otherwise now and then it
  // gets past the keeper for byes, and one off the pad (not out) can run away for leg byes.
  // Draws from the same stream only on these balls, so other balls are unchanged.
  _past(f, o, rng) {
    if (!o.match) return f;                    // (real matches only: the challenges keep their own rules)
    const M = MATCH_DATA.extrasPlay, fam = o.bowl && o.bowl.family && typeof Bowling !== 'undefined' ? Bowling.family(o.bowl.family) : null;
    if (f.result === null && !o.left && !o.freeHit && fam && fam.kind === 'spin' && rng.chance(o.shotId === 'power' ? M.stumpPower : M.stumpOther)) return { kind: f.kind, result: 'stumped' };
    if (f.result === null && rng.chance(M.byeChance)) f.byes = rng.weighted(M.byeRuns.map((r) => ({ id: r[0], weight: r[1] }))).id;
    else if (f.result === 'padLeg' && rng.chance(M.legByeChance)) f.legByes = 1;
    return f;
  },

  // The duel's contact modifiers for Contact.resolve().
  // six (real matches only, M15 Job 3b): { del, aim, releaseGrade, memory } -> SixRules decides how far lofts carry.
  mods(bat, bowl, shotId, six, inn) {
    const m = { edge: Duel.edgeMult(bat, bowl), power: Duel.powerMult(bat, shotId), jitter: Duel.jitterMult(bat) };
    if (inn && shotId === 'power' && typeof BatFatigue !== 'undefined') m.jitter *= BatFatigue.jitterMult(inn);   // M19: tired = less steady
    if (six) m.six = Object.assign({ bat, bowl }, six);
    return m;
  },
};
