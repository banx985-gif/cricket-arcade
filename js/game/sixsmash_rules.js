// Cricket Arcade — Six Smash scoring, every ruleset (plan 16).
// Pure rules: no drawing, no randomness. Numbers: SIX_SMASH_DATA (Classic points
// and combo) and CHALLENGE_DATA.six (rulesets, Golden Ball, Fever, targets).
//
// Per ball the scene calls, in order:
//   startBall()      final-balls Fever check (returns true when Fever starts)
//   apply(key, info) score the ball. key: 'six'|'four'|'runs'|'edge'|'dot'|'defended'|
//                    'miss'|'padLeg'|'caught'|'bowled'|'lbw'|'hitwicket'
//                    info: { runs, perfect, golden, target (the six landed in the target) }
// The rules also look like a match innings (index, target, ballsLeft, wickets…)
// so a player's techniques (game/techniques.js) work in a challenge.

class SixSmashRules {
  // The full ruleset: Classic numbers + the ruleset's own changes.
  static ruleset(id) {
    const list = CHALLENGE_DATA.six.rulesets;
    const R = list.find((r) => r.id === id) || list[0], base = SIX_SMASH_DATA.classic;
    return Object.assign({}, base, R, { points: Object.assign({}, base.points, R.points || {}) });
  }
  static isWicket(key) { return key === 'caught' || key === 'bowled' || key === 'lbw' || key === 'hitwicket'; }

  constructor(ruleset) {
    this.rs = typeof ruleset === 'string' ? SixSmashRules.ruleset(ruleset) : (ruleset || SixSmashRules.ruleset('classic20'));
    const rs = this.rs;
    this.score = 0;
    this.ball = 0;           // balls faced so far
    this.sixes = 0;
    this.fours = 0;
    this.wickets = 0;
    this.streak = 0;         // consecutive sixes (Perfect Timing: consecutive PERFECT scoring shots)
    this.bestStreak = 0;
    this.perfects = 0;
    this.targetsHit = 0;
    this.goldens = 0;        // Golden Balls bowled
    this.goldenSixes = 0;    // … hit for six
    this.livesLeft = rs.lives || 0;
    this.fever = { meter: 0, left: 0, final: false, triggers: 0 };
    this.boss = rs.boss ? { health: rs.boss.health, max: rs.boss.health, beaten: false } : null;
  }

  // ---- looks like an innings (techniques read these) ----
  get index() { return 0; }
  get target() { return null; }
  get requiredRate() { return 0; }
  get legal() { return this.ball; }
  get maxWickets() { return this.rs.lives || 99; }
  get ballsLeft() { return this.rs.balls - this.ball; }
  get finished() { return this.ball >= this.rs.balls || (this.rs.lives > 0 && this.livesLeft <= 0); }

  multFor(streak) {
    let m = 1;
    for (const tier of this.rs.combo) if (streak >= tier.min) m = tier.mult;
    return m;
  }
  get mult() { return this.multFor(this.streak); }
  get feverOn() { return this.fever.left > 0 || this.fever.final; }
  // Survival: the bowler gets better as the run goes on.
  get ramp() { const R = this.rs.ramp; return R ? Math.min(R.max, Math.floor(this.ball / R.every) * R.stat) : 0; }

  // Before each ball: in the last balls, a big enough score starts Fever to the end.
  startBall() {
    const F = CHALLENGE_DATA.six.fever;
    if (!this.rs.fever || this.fever.final || this.ballsLeft > F.finalBalls || this.score < this.rs.finalScore) return false;
    this.fever.final = true;
    this.fever.left = 0;
    this.fever.triggers++;
    return true;
  }

  apply(outcome, info) {
    const rs = this.rs, P = rs.points, i = info || {}, C = CHALLENGE_DATA.six;
    const res = { points: 0, penalty: 0, comboUp: false, streakLost: false, mult: 1, target: false, golden: !!i.golden,
      fever: this.feverOn, feverStart: false, lifeLost: false, bossHit: 0, bossBeaten: false };
    const prevMult = this.mult, prevStreak = this.streak;
    const wicket = SixSmashRules.isWicket(outcome);
    const scoring = outcome === 'six' || outcome === 'four' || ((outcome === 'runs' || outcome === 'edge') && (i.runs || 0) > 0);
    this.ball++;
    if (i.golden) this.goldens++;
    if (i.perfect) this.perfects++;

    let pts = 0;
    if (rs.perfectOnly) {
      // Only PERFECT timing scores; a chain of them builds the multiplier.
      if (scoring && i.perfect) {
        this.streak++;
        res.mult = this.mult;
        pts = (outcome === 'six' ? P.six : outcome === 'four' ? P.four : P.run * (i.runs || 0)) * res.mult;
      } else {
        res.streakLost = prevStreak >= 2;
        this.streak = 0;
      }
      if (outcome === 'six') this.sixes++;
      if (outcome === 'four') this.fours++;
    } else if (outcome === 'six') {
      this.sixes++;
      this.streak++;
      res.mult = this.mult;
      pts = P.six * (rs.multiplierAppliesTo.includes('six') ? res.mult : 1);
      if (rs.offTargetSix && !i.target) pts = Math.round(pts * rs.offTargetSix);
    } else {
      res.streakLost = prevStreak >= 2;
      this.streak = 0;
      if (outcome === 'four') { this.fours++; pts = P.four; }
      else if (outcome === 'runs' || outcome === 'edge') pts = P.run * (i.runs || 0);
    }
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    res.comboUp = this.mult > prevMult;
    if (i.perfect && pts > 0 && P.perfectBonus) pts += P.perfectBonus;
    // Stadium target: bonus, and the ball's points multiplied.
    if (outcome === 'six' && i.target) {
      const T0 = Object.assign({}, C.targets, rs.targets || {});
      pts = pts * T0.mult + T0.bonus;
      this.targetsHit++;
      res.target = true;
    }
    if (i.golden && pts > 0) pts *= C.golden.mult;
    if (i.golden && outcome === 'six') this.goldenSixes++;
    if (res.fever && pts > 0) pts *= C.fever.mult;
    res.points = Math.round(pts);

    if (wicket) {
      this.wickets++;
      if (!rs.lives) res.penalty = Math.min(this.score, P.wicketPenalty);
    }
    if (rs.lives && rs.loseLife.includes(outcome)) { this.livesLeft--; res.lifeLost = true; }

    // Boss Bowler: your points are damage; a wicket heals the boss.
    if (this.boss) {
      const B = rs.boss;
      if (!this.boss.beaten) {
        res.bossHit = Math.min(this.boss.health, res.points);
        this.boss.health -= res.bossHit;
        if (wicket) this.boss.health = Math.min(this.boss.max, this.boss.health + B.heal);
        if (this.boss.health <= 0) { this.boss.beaten = true; res.bossBeaten = true; res.points += B.bonus; }
      }
    }

    // Fever: the meter fills from sixes, PERFECT hits, targets and the Golden Ball.
    if (rs.fever) {
      const F = C.fever;
      if (this.fever.left > 0) this.fever.left--;
      else if (!this.fever.final) {
        this.fever.meter += (outcome === 'six' ? F.six : 0) + (i.perfect && scoring ? F.perfect : 0) + (res.target ? F.target : 0) + (i.golden && scoring ? C.golden.fever : 0);
        if (this.fever.meter >= F.meter && this.ballsLeft > 0) {
          this.fever.meter = 0;
          this.fever.left = F.balls;
          this.fever.triggers++;
          res.feverStart = true;
        }
      }
    }

    this.score = Math.max(0, this.score + res.points - res.penalty);
    return res;
  }
}
