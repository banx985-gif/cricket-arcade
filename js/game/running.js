// Cricket Arcade — running between wickets (plan 6.1).
// After a hit that stays in the field, the batters can run. The game already
// knows (from the fielding simulation) when the ball will be back at the
// stumps — `returnT` — so it can show clear risk colours on the RUN button
// instead of making the player judge field geometry.
//
// Times are seconds since bat hit ball.
//   run()    — first tap starts a run; further taps queue more (up to a limit)
//   cancel() — turn back while the current run is less than half done
// If a run is still in progress when the ball arrives, it's a RUN OUT.

class Running {
  constructor(returnT) {
    const R = MATCH_DATA.running;
    this.returnT = returnT;
    this.runTime = R.runTime;
    this.completed = 0;
    this.cur = null;           // { start, dur, back: bool }
    this.queued = 0;
    this.runOut = false;
    this.done = false;
    this.t = 0;
  }

  // When would the NEXT run (if tapped now) finish?
  _nextFinish(t) {
    let start = Math.max(t, MATCH_DATA.running.startDelay);
    if (this.cur && !this.cur.back) start = this.cur.start + this.cur.dur + this.queued * this.runTime;
    else if (this.cur && this.cur.back) start = this.cur.start + this.cur.dur;
    return start + this.runTime;
  }

  // 'safe' | 'risky' | 'danger' | 'none' (can't run any more)
  risk(t) {
    if (this.done || this.runOut) return 'none';
    if (this.queued >= MATCH_DATA.running.maxQueued) return 'none';
    const f = this._nextFinish(t);
    const m = MATCH_DATA.running.riskMargin;
    if (f <= this.returnT - m) return 'safe';
    if (f <= this.returnT + MATCH_DATA.running.runOutGrace) return 'risky';
    return 'danger';
  }

  canCancel() {
    const c = this.cur;
    return !!c && !c.back && !this.done && (this.t - c.start) / c.dur < MATCH_DATA.running.cancelBefore;
  }

  run(t) {
    if (this.done || this.runOut) return false;
    if (!this.cur) {
      this.cur = { start: Math.max(t, MATCH_DATA.running.startDelay), dur: this.runTime, back: false };
      return true;
    }
    if (this.cur.back || this.queued >= MATCH_DATA.running.maxQueued) return false;
    this.queued++;
    return true;
  }

  cancel(t) {
    if (!this.canCancel()) return false;
    const done = Math.max(0, t - this.cur.start);
    this.cur = { start: t, dur: done, back: true };   // walk back the way they came
    this.queued = 0;
    return true;
  }

  // Advance to time t. Returns true once running is settled.
  update(t) {
    this.t = t;
    if (this.done) return true;
    while (this.cur && t >= this.cur.start + this.cur.dur) {
      const end = this.cur.start + this.cur.dur;
      if (!this.cur.back) this.completed++;
      this.cur = null;
      if (this.queued > 0) { this.queued--; this.cur = { start: end, dur: this.runTime, back: false }; }
    }
    if (t >= this.returnT) {
      if (this.cur) {
        const finish = this.cur.start + this.cur.dur;
        if (finish - this.returnT <= MATCH_DATA.running.runOutGrace) return false;   // just making it
        this.runOut = true;
        this.cur = null;
        this.queued = 0;
      }
      this.done = true;
    }
    return this.done;
  }

  // How far along the pitch the striker is (0 = batting end, 1 = other end),
  // for drawing the batters running.
  position(t) {
    let legs = this.completed;
    let p = 0;
    if (this.cur) {
      const k = Math.max(0, Math.min(1, (t - this.cur.start) / Math.max(0.001, this.cur.dur)));
      p = this.cur.back ? (1 - k) * (this.cur.dur / this.runTime) : k;
    }
    // odd completed runs = batters have swapped ends
    return legs % 2 === 0 ? p : 1 - p;
  }

  // AI batters decide up front: take every safe run, sometimes one risky extra.
  static aiPlan(returnT, rng) {
    const R = MATCH_DATA.running;
    const safe = Math.max(0, Math.floor((returnT - R.startDelay - R.riskMargin) / R.runTime));
    let n = Math.min(safe, R.maxQueued + 1);
    if (n < R.maxQueued + 1 && rng.chance(MATCH_DATA.aiRunning.riskyRunChance)) n++;
    return n;
  }
}
