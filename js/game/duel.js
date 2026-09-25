// Cricket Arcade — the duel: batter's stats against the bowler's (plan 9, 7.2, 7.7).
// Pure maths, no drawing, no randomness except where an rng is passed in.
// Every number comes from PLAYER_DATA.duel / BOWLING_DATA, so balance is tuned
// in the data files. No single factor decides a ball: timing, aim, delivery,
// release, power and both players' stats all feed in together.

const Duel = {
  _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },
  // How much of the bowler's fatigue actually hurts (0 below the threshold).
  tired(f) { const F = PLAYER_DATA.fatigue; return Math.max(0, (f || 0) - F.startsAt) / (1 - F.startsAt); },

  // Situation pressure on a batter, 0..1: a chase at a high rate, the last
  // over, wickets down. Composure resists it (in windowScale / AI sigma).
  pressure(inn) {
    if (!inn) return 0;
    const P = PLAYER_DATA.duel.pressure;
    let p = 0;
    if (inn.ballsLeft !== undefined && inn.ballsLeft <= 6) p += P.lastOver;
    if (inn.target && inn.ballsLeft > 0) p += Math.max(0, inn.requiredRate - P.reqRateBase) * P.perReqRateAbove;
    p += (inn.wickets || 0) * P.wicketsDown;
    return this._clamp(p, 0, P.max);
  },

  // Wicket Tree perks carried on a career player's match entity (SkillTree.mods).
  perk(p, k, dflt) { return p && p.perks && p.perks[k] !== undefined ? p.perks[k] : dflt; },

  // ---- the batter's timing window (player batting) ----
  // ctx: { pressure, fatigue (bowler's), kind: 'pace'|'spin', chase: true in a run chase }
  windowScale(bat, bowl, ctx) {
    const W = PLAYER_DATA.duel.window, c = ctx || {};
    let k = 1 + W.timing * Teams.n(bat.stats.timing) - W.delivery * Teams.n(bowl.stats.delivery);
    const pr = (c.pressure || 0) * this.perk(bat, 'pressure', 1) * (c.chase ? this.perk(bat, 'chasePressure', 1) : 1);
    k -= W.pressure * pr * (1 - W.composureSaves * Teams.u(bat.stats.composure));
    k += W.fatigue * this.tired(c.fatigue);            // a tired bowler is easier to time
    if (c.kind === 'spin') k *= PLAYER_DATA.duel.spinWindow;
    return this._clamp(k, W.min, W.max);
  },

  // ---- the AI batter's timing spread (player bowling) ----
  // ctx: { variation: true when it's not the stock ball }
  aiSigmaMult(bat, bowl, ctx) {
    const A = PLAYER_DATA.duel.aiSigma, c = ctx || {};
    let k = 1 - A.timing * Teams.n(bat.stats.timing) + A.delivery * Teams.n(bowl.stats.delivery);
    if (c.variation) k += A.deception * Teams.n(bowl.stats.deception);
    k -= PLAYER_DATA.duel.window.fatigue * this.tired(c.fatigue);
    return this._clamp(k, A.min, A.max);
  },
  aiPressureMult(bat) { return (1 - PLAYER_DATA.duel.aiPressure.composureSaves * Teams.u(bat.stats.composure)) * this.perk(bat, 'pressure', 1); },
  // Variations fool the AI more when your Deception is high (x its timing bias).
  aiReadMult(bowl) { return 1 + PLAYER_DATA.duel.aiRead.deception * Teams.n(bowl.stats.deception); },

  edgeMult(bat, bowl) {
    const E = PLAYER_DATA.duel.edge;
    const k = 1 - E.contact * Teams.n(bat.stats.contact) + E.movement * Teams.n(bowl.stats.movement)
      + E.deception * Teams.n(bowl.stats.deception);
    return this._clamp(k, E.min, E.max) * this.perk(bat, 'edge', 1);
  },
  powerMult(bat, shotId) {
    const P = PLAYER_DATA.duel.power;
    const n = Teams.n(bat.stats.power);
    return 1 + P.power * n * (shotId === 'defend' ? 0 : 1) + (shotId === 'power' ? P.powerShotOnly * n : 0);
  },
  jitterMult(bat) {
    const P = PLAYER_DATA.duel.placement;
    return this._clamp(1 - P.placement * Teams.n(bat.stats.placement), P.min, P.max);
  },
  runTimeMult(bat) { return 1 - PLAYER_DATA.duel.running.running * Teams.n(bat.stats.running); },

  // Fielding side: catches, clean stops, fielder speed (+ the field preset's effects).
  fieldMods(team, preset) {
    const F = PLAYER_DATA.duel.fielding;
    let f = 50;
    let pc = 0, ps = 0;
    if (team && team.players) {
      f = team.players.reduce((t, p) => t + p.stats.fielding, 0) / team.players.length;
      for (const p of team.players) { pc += this.perk(p, 'catchBonus', 0); ps += this.perk(p, 'stopBonus', 0); }   // Safe Hands, Field General
    }
    const n = Teams.n(f), e = (preset && preset.effects) || {};
    return { catchBonus: F.catchSkill * n + (e.catch || 0) + pc, stopBonus: F.cleanStop * n + (e.stop || 0) + ps, speedMult: 1 + F.speed * n, fielding: f };
  },

  // ---- the bowler's release ----
  scatterMult(bowl, fatigue) {
    const S = PLAYER_DATA.duel.scatter;
    return this._clamp(1 - S.accuracy * Teams.n(bowl.stats.accuracy) + S.fatigue * this.tired(fatigue), S.min, S.max);
  },
  paceMult(bowl) { return 1 + PLAYER_DATA.duel.pace.delivery * Teams.n(bowl.stats.delivery); },
  turnMult(bowl) {
    const T = PLAYER_DATA.duel.spinTurn;
    return Math.max(0.3, 1 + T.delivery * Teams.n(bowl.stats.delivery) + T.movement * Teams.n(bowl.stats.movement));
  },
  moveMult(bowl) { return Math.max(0.3, 1 + PLAYER_DATA.duel.movement.movement * Teams.n(bowl.stats.movement)); },
  // Release bands (gold / green) widen with Control, shrink when tired.
  bandScale(bowl, fatigue) {
    const B = PLAYER_DATA.duel.band;
    const tired = this.tired(fatigue) * B.fatigue * (1 - B.controlSaves * Teams.u(bowl.stats.control));
    return this._clamp(1 + B.control * Teams.n(bowl.stats.control) - tired, 0.5, 1.5);
  },

  // Computer bowler's release quality.
  aiReleaseGrade(bowl, fatigue, rng) {
    const A = PLAYER_DATA.duel.aiRelease;
    const s = (Teams.n(bowl.stats.control) + Teams.n(bowl.stats.accuracy)) / 2;
    const t = this.tired(fatigue) * A.fatigue;
    const pPerfect = this._clamp(A.perfect + A.stat * s - t, 0.05, 0.7);
    const pLoose = this._clamp(A.loose - A.stat * s + t, 0.03, 0.7);
    const r = rng.next();
    return r < pPerfect ? 'perfect' : r < pPerfect + pLoose ? 'loose' : 'good';
  },

  // ---- "beaten": a stumps-bound ball that the batter doesn't middle ----
  // o: { grade, shotId, threat, releaseGrade, stumpsX, bat, bowl }
  beatenChance(o) {
    const B = PLAYER_DATA.duel.beaten;
    const g = B.grade[o.grade];
    if (!g) return 0;
    const line = Math.abs(o.stumpsX || 0) <= BATTING_DATA.pitch.stumpsHalfWidth * 0.5 ? B.middleStump : B.edgeOfStumps;
    const bowlN = B.bowlerStats.reduce((t, k) => t + Teams.n(o.bowl.stats[k]), 0) / B.bowlerStats.length;
    const batN = B.batterStats.reduce((t, k) => t + Teams.n(o.bat.stats[k]), 0) / B.batterStats.length;
    const stat = Math.exp(B.stats * (bowlN - batN));
    const p = g * (o.threat || 1) * (B.release[o.releaseGrade] || 1) * (B.shot[o.shotId] || 1) * line * stat;
    return this._clamp(p, 0, B.max);
  },

  // ---- hit wicket: rare, bad swings by weak batters only ----
  hitWicketChance(bat, shotId, grade) {
    const H = BOWLING_DATA.hitWicket;
    const s = H.shot[shotId] || 0, g = H.grade[grade] || 0;
    if (!s || !g) return 0;
    const avg = (bat.stats.contact + bat.stats.composure) / 2;
    const weak = Math.max(0, (H.safeAbove - avg) / H.safeAbove);
    return s * g * weak * weak;
  },

  // ---- the ball beat the bat: LBW, bowled, or not out ----
  // Returns 'lbw' | 'bowled' | 'padLeg' (hit the pad, pitched outside leg:
  // not out) | null (it misses the stumps). left = the batter didn't play a shot.
  missResult(del, left, rng) {
    const sim = del.sim;
    if (!sim.hitsStumps) return null;
    const L = BOWLING_DATA.lbw;
    const at = sim.path.at(sim.contactIdx * CONFIG.PHYSICS_STEP, {});
    const inLine = at.x >= L.padMinX && at.x <= L.padMaxX && at.y <= L.maxY;
    if (inLine && rng.chance(left ? L.padChanceLeave : L.padChance)) {
      return this.pitchedOutsideLeg(del) ? 'padLeg' : 'lbw';
    }
    return 'bowled';
  },
  pitchedOutsideLeg(del) {
    const bx = del.sim.bounceX !== null && del.sim.bounceX !== undefined ? del.sim.bounceX : del.bounceX;
    return bx < -(BATTING_DATA.pitch.stumpsHalfWidth + BATTING_DATA.physics.ballRadius);
  },

  // ---- who has the edge (the matchup card) ----
  // Returns { bat, bowl, diff, edge: 'bat' | 'bowl' | 'even' }
  matchup(bat, bowl) {
    const a = Teams.batRating(bat), b = Teams.bowlRating(bowl);
    const d = a - b;
    return { bat: a, bowl: b, diff: d, edge: Math.abs(d) <= PLAYER_DATA.duel.edgeCard.even ? 'even' : d > 0 ? 'bat' : 'bowl' };
  },
};
