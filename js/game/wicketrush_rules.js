// Cricket Arcade — Wicket Rush scoring, every ruleset (plan 17).
// Pure rules: no drawing, no randomness. Numbers: WICKET_RUSH_DATA (Classic points,
// combo, pressure) and CHALLENGE_DATA.rush (rulesets, Golden Wicket Ball, targets).
// Like SixSmashRules, it also looks like a match innings for the techniques.

class WicketRushRules {
  static ruleset(id) {
    const list = CHALLENGE_DATA.rush.rulesets;
    const R = list.find((r) => r.id === id) || list[0], base = WICKET_RUSH_DATA.classic;
    return Object.assign({}, base, R, { points: Object.assign({}, base.points, R.points || {}) });
  }

  constructor(ruleset) {
    this.rs = typeof ruleset === 'string' ? WicketRushRules.ruleset(ruleset) : (ruleset || WicketRushRules.ruleset('wicketRush18'));
    const rs = this.rs;
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
    this.onTargets = 0;      // balls that would have hit the target stump
    this.targetWickets = 0;
    this.goldens = 0;
    this.goldenWickets = 0;
    this.perfects = 0;
    this.byKind = { bowled: 0, lbw: 0, caught: 0, hitwicket: 0 };
    this.livesLeft = rs.lives || 0;
    this.boss = rs.boss ? { left: rs.boss.lives, max: rs.boss.lives, beaten: false } : null;
    this.ended = false;
  }

  // ---- looks like an innings (techniques read these) ----
  get index() { return 0; }
  get target() { return null; }
  get requiredRate() { return 0; }
  get legal() { return this.ball; }
  get maxWickets() { return 99; }
  get ballsLeft() { return this.rs.balls - this.ball; }
  get finished() { return this.ended || this.ball >= this.rs.balls || (this.rs.lives > 0 && this.livesLeft <= 0); }
  get ramp() { const R = this.rs.ramp; return R ? Math.min(R.max, Math.floor(this.ball / R.every) * R.stat) : 0; }

  multFor(combo) {
    let m = 1;
    for (const tier of this.rs.combo) if (combo >= tier.min) m = tier.mult;
    return m;
  }
  get mult() { return this.multFor(this.combo); }

  static isWicket(key) { return key === 'bowled' || key === 'lbw' || key === 'caught' || key === 'hitwicket'; }

  // Is the Golden Wicket Ball due? (pressure high, not used up)
  goldenDue() {
    const G = CHALLENGE_DATA.rush.golden;
    return !!this.rs.golden && this.pressure >= G.pressure && this.goldens < G.max;
  }

  // key: how the ball ended — 'bowled'|'lbw'|'caught'|'hitwicket'|'dot'|'miss'|'leave'|
  //   'padLeg'|'defended'|'edge'|'runs'|'four'|'six'|'wide'
  // info: { runs, noBall, golden, perfectRelease, onTarget, onStumps }
  apply(key, info) {
    const rs = this.rs, P = rs.points, PR = rs.pressure, C = CHALLENGE_DATA.rush;
    const i = info || {};
    const runs = i.runs || 0;
    const res = { points: 0, penalty: 0, comboUp: false, comboDown: false, mult: 1, notOut: false, freeHitNext: false,
      onTarget: false, golden: !!i.golden, lifeLost: false, bossOut: false, bossBeaten: false };
    const wasFreeHit = this.freeHit;
    const prevCombo = this.combo;
    let pressure = 0;
    if (i.golden) this.goldens++;

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
      if (i.perfectRelease) this.perfects++;
    }
    if (i.noBall && rs.freeHitAfterNoBall) { this.freeHit = true; res.freeHitNext = true; }
    const counts = !rs.perfectOnly || i.perfectRelease;     // Perfect Line: only PERFECT releases score

    let wicket = false;
    if (WicketRushRules.isWicket(key)) {
      if (i.noBall || wasFreeHit) {
        res.notOut = true;             // can't be out off a no-ball / free hit
      } else {
        wicket = true;
        this.wickets++;
        this.byKind[key] = (this.byKind[key] || 0) + 1;
        this.combo++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        res.mult = this.mult;
        let pts = P[key] * res.mult;
        if (i.onTarget && (key === 'bowled' || key === 'lbw')) { pts *= C.targets.wicketMult; this.targetWickets++; }
        if (this.boss && !this.boss.beaten) {
          pts *= rs.boss.wicketMult;
          this.boss.left--;
          res.bossOut = true;
          if (this.boss.left <= 0) {
            this.boss.beaten = true; res.bossBeaten = true;
            pts += rs.boss.bonus + this.ballsLeft * 50;
            this.ended = true;
          }
        }
        if (i.golden) { pts *= C.golden.mult; this.goldenWickets++; }
        res.points = counts ? pts : 0;
        pressure += PR.wicket;
      }
    } else if (key === 'four' || key === 'six') {
      this.runs += runs;
      this.combo = Math.max(0, this.combo - 1);
      pressure += PR.boundary;
      if (rs.lives && rs.loseLife.includes(key)) { this.livesLeft--; res.lifeLost = true; }
    } else if (key !== 'wide') {
      if (runs > 0) {
        this.runs += runs;
        pressure += PR.perRun * runs;
      } else if (!isExtra) {
        this.dots++;
        if (counts) res.points += P.dot;
        pressure += PR.dot;
      }
    }
    const quiet = !isExtra && runs === 0 && key !== 'four' && key !== 'six';
    if (i.perfectRelease && quiet && !rs.perfectOnly) res.points += P.perfectRelease;
    if (rs.perfectOnly && i.perfectRelease && quiet && i.onStumps) res.points += rs.lineBonus;
    // Target stump: the ball was on it (and wasn't hit away).
    if (i.onTarget && quiet) {
      this.onTargets++;
      res.onTarget = true;
      if (counts && !wicket) res.points += (rs.targets && rs.targets.onTarget) || C.targets.onTarget;
    }
    if (rs.perfectOnly && !i.perfectRelease && !isExtra) this.combo = 0;

    res.comboUp = this.combo > prevCombo && this.mult > this.multFor(prevCombo);
    res.comboDown = this.combo < prevCombo;
    this.pressure = Math.max(0, Math.min(1, this.pressure + pressure));
    if (i.golden) this.pressure = Math.min(this.pressure, C.golden.pressureAfter);
    this.score = Math.max(0, this.score + res.points - res.penalty);
    return res;
  }
}
