// Cricket Arcade — Six Smash Classic scoring (plan 16.1–16.2).
// Pure rules: no drawing, no randomness. All numbers come from SIX_SMASH_DATA.

class SixSmashRules {
  constructor(ruleset) {
    this.rs = ruleset || SIX_SMASH_DATA.classic;
    this.score = 0;
    this.ball = 0;           // balls bowled so far
    this.sixes = 0;
    this.fours = 0;
    this.wickets = 0;
    this.streak = 0;         // consecutive sixes
    this.bestStreak = 0;
  }

  get ballsLeft() { return this.rs.balls - this.ball; }
  get finished() { return this.ball >= this.rs.balls; }

  multFor(streak) {
    let m = 1;
    for (const tier of this.rs.combo) if (streak >= tier.min) m = tier.mult;
    return m;
  }
  get mult() { return this.multFor(this.streak); }

  // outcome: 'six'|'four'|'runs'|'dot'|'miss'|'edge'|'defended'|'caught'|'bowled'
  // info: { runs, perfect, golden }
  apply(outcome, info) {
    const P = this.rs.points;
    const i = info || {};
    const res = { points: 0, penalty: 0, comboUp: false, streakLost: false, mult: 1 };
    const prevMult = this.mult;
    const prevStreak = this.streak;
    this.ball++;

    if (outcome === 'six') {
      this.sixes++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      res.mult = this.mult;
      res.points = P.six * (this.rs.multiplierAppliesTo.includes('six') ? res.mult : 1);
      res.comboUp = res.mult > prevMult;
    } else {
      res.streakLost = prevStreak >= 2;
      this.streak = 0;
      if (outcome === 'four') { this.fours++; res.points = P.four; }
      else if (outcome === 'runs' || outcome === 'edge') { res.points = P.run * (i.runs || 0); }
      if (outcome === 'caught' || outcome === 'bowled') {
        this.wickets++;
        res.penalty = Math.min(this.score, P.wicketPenalty);
      }
    }
    if (i.perfect && res.points > 0) res.points += P.perfectBonus;
    if (i.golden && res.points > 0) res.points *= SIX_SMASH_DATA.hooks.goldenBall.multiplier;

    this.score = Math.max(0, this.score + res.points - res.penalty);
    return res;
  }
}
