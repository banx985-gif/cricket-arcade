// Cricket Arcade — Wicket Rush Classic scoring (plan 17).
// Pure rules: no drawing, no randomness. All numbers come from WICKET_RUSH_DATA.

class WicketRushRules {
  constructor(ruleset) {
    this.rs = ruleset || WICKET_RUSH_DATA.classic;
    this.score = 0;
    this.ball = 0;           // LEGAL balls bowled (wides/no-balls don't count)
    this.wickets = 0;
    this.dots = 0;
    this.runs = 0;           // runs conceded (including extras)
    this.extras = 0;
    this.combo = 0;          // consecutive-wicket combo level
    this.bestCombo = 0;
    this.pressure = 0;       // 0..1 — dots build it; it makes the batter nervier
    this.freeHit = false;    // next ball is a free hit (after a no-ball)
  }

  get ballsLeft() { return this.rs.balls - this.ball; }
  get finished() { return this.ball >= this.rs.balls; }

  multFor(combo) {
    let m = 1;
    for (const tier of this.rs.combo) if (combo >= tier.min) m = tier.mult;
    return m;
  }
  get mult() { return this.multFor(this.combo); }

  static isWicket(key) { return key === 'bowled' || key === 'lbw' || key === 'caught' || key === 'hitwicket'; }

  // key: how the ball ended — 'bowled'|'lbw'|'caught'|'dot'|'miss'|'leave'|
  //   'defended'|'edge'|'runs'|'four'|'six'|'wide'
  // info: { runs, noBall, golden, perfectRelease }
  apply(key, info) {
    const P = this.rs.points, PR = this.rs.pressure;
    const i = info || {};
    const runs = i.runs || 0;
    const res = { points: 0, penalty: 0, comboUp: false, comboDown: false, mult: 1, notOut: false, freeHitNext: false };
    const wasFreeHit = this.freeHit;
    const prevCombo = this.combo;
    let pressure = 0;

    // Extras: a wide or no-ball is not a legal ball and costs points.
    const isExtra = key === 'wide' || i.noBall;
    if (isExtra) {
      this.extras += 1;
      this.runs += 1;
      res.penalty += P.extra;
      this.combo = Math.max(0, this.combo - 1);
      pressure += PR.extra;
    } else {
      this.ball++;
      this.freeHit = false;
    }
    if (i.noBall && this.rs.freeHitAfterNoBall) { this.freeHit = true; res.freeHitNext = true; }

    if (WicketRushRules.isWicket(key)) {
      if (i.noBall || wasFreeHit) {
        res.notOut = true;             // can't be out off a no-ball / free hit
      } else {
        this.wickets++;
        this.combo++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        res.mult = this.mult;
        res.points = P[key] * res.mult;
        if (i.golden) res.points *= WICKET_RUSH_DATA.hooks.goldenWicket.multiplier;
        pressure += PR.wicket;
      }
    } else if (key === 'four' || key === 'six') {
      this.runs += runs;
      this.combo = Math.max(0, this.combo - 1);
      pressure += PR.boundary;
    } else if (key !== 'wide') {
      if (runs > 0) {
        this.runs += runs;
        pressure += PR.perRun * runs;
      } else if (!isExtra) {
        this.dots++;
        res.points += P.dot;
        pressure += PR.dot;
      }
    }
    if (i.perfectRelease && runs === 0 && !isExtra) res.points += P.perfectRelease;

    res.comboUp = this.combo > prevCombo && this.mult > this.multFor(prevCombo);
    res.comboDown = this.combo < prevCombo;
    this.pressure = Math.max(0, Math.min(1, this.pressure + pressure));
    this.score = Math.max(0, this.score + res.points - res.penalty);
    return res;
  }
}
