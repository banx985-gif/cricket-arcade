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
    if (o.left) return { kind: 'miss', result: Duel.missResult(del, true, rng) };
    if (rng.chance(Duel.hitWicketChance(o.bat, o.shotId, o.grade))) return { kind: 'hitwicket', result: 'hitwicket' };
    if (o.grade === 'miss') return { kind: 'miss', result: Duel.missResult(del, false, rng) };
    if (del.sim.hitsStumps) {
      const p = Duel.beatenChance({
        grade: o.grade, shotId: o.shotId, threat: del.threat || 1,
        releaseGrade: o.releaseGrade || del.releaseGrade || 'ai', stumpsX: del.sim.stumpsX, bat: o.bat, bowl: o.bowl,
      });
      if (rng.chance(p)) return { kind: 'beaten', result: Duel.missResult(del, false, rng) || 'bowled' };
    }
    return { kind: 'contact', result: null };
  },

  // The duel's contact modifiers for Contact.resolve().
  mods(bat, bowl, shotId) {
    return { edge: Duel.edgeMult(bat, bowl), power: Duel.powerMult(bat, shotId), jitter: Duel.jitterMult(bat) };
  },
};
