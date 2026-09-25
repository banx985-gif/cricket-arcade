// Cricket Arcade — Quick Match: YOU BOWL (M03).
// Built from the Wicket Rush scene (same delivery slots, reticle, charge
// release and AI batter), with match rules on top: the AI batters run between
// wickets (and sometimes get themselves run out), wides / no-balls / free
// hits count against you, and the innings ends on overs / all out / target.

const MatchBowlScene = Object.assign({}, WicketRushScene, {
  showNonStriker: true,
  inn: null,

  enter() {
    this._initPitch();
    this.inn = Match.current();
    this.rules = this.inn;                  // AI reads .pressure / .freeHit / .ball from here
    this.seed = Match.seed;
    const R0 = BOWLING_DATA.reticle.start;
    this.aim = { x: R0.x, z: R0.z };
    this.typeIdx = 0;
    Effects.init();
    BowlControls.init({
      select: (i) => this.selectType(i),
      bowlDown: () => this.bowlDown(),
      bowlUp: () => this.bowlUp(),
    });
    BowlControls.reset();
    BowlControls.selected = 0;
    this._layout();
    this._startBall();
  },

  _layout() {
    this._layoutPause('toss');
    BowlControls.layout();
  },

  _startBall() {
    Match.overStart();                       // resume checkpoint at the start of each over
    this._setState('aim');
    this._resetBall();
    this.del = null;
    this.release = null;
    this.ai = null;
    this.meter = 0;
    this.golden = false;
    BowlControls.meter = 0;
    BowlControls.meterOn = false;
    BowlControls.enabled = true;
    this.banner = { text: MatchBatScene._ballLabel.call(this), color: '#ffffff', t: 0 };
    if (this.inn.freeHit) { this.banner.sub = T('bowl.freeHit'); this.banner.subColor = '#ff9d2e'; }
  },

  // AI batters decide at contact how many runs to go for.
  _connect(aim, battingRng, fieldingRng) {
    const h = PitchScene._connect.call(this, aim, battingRng, fieldingRng);
    const th = this._addThrow(h);
    if (th) {
      h.running = new Running(th.t1);
      const n = Running.aiPlan(th.t1, RNG.stream('ai'));
      for (let i = 0; i < n; i++) h.running.run(0);
    }
    return h;
  },

  _inPlayEnd(h) {
    if (h.throw) return h.running && !h.running.done ? h.throw.t1 + 0.5 : h.throw.t1 + 0.15;
    return PitchScene._inPlayEnd.call(this, h);
  },

  update(dt, realDt) {
    BowlControls.update(realDt);
    if (this.paused || Dev.open || Display.isPortrait) return;
    Effects.update(dt);
    Stadium.update(dt);
    this.stateT += dt;
    if (this.banner) this.banner.t += dt;
    if (this.timingLabel) this.timingLabel.t += dt;

    switch (this.state) {
      case 'aim':
        this._updateAim(realDt);
        break;
      case 'charge': {
        this._updateAim(realDt);
        const C = BOWLING_DATA.charge;
        this.meter = this.stateT / C.fillTime;
        BowlControls.meter = this.meter;
        if (this.meter >= C.max) { this.meter = C.max; this._release(); }
        break;
      }
      case 'delivery':
        this.dT += dt;
        this._updateDelivery();
        break;
      case 'inplay': {
        const h = this.hit;
        h.t += dt;
        if (h.running) {
          h.running.update(h.t);
          if (h.running.runOut && !this.stumpsBroken) { this.stumpsBroken = true; Sound.play('stumps'); }
        }
        const key = this._stepInPlay();
        if (key) this._endBall(key);
        break;
      }
      case 'outcome':
        if (this.hit) this.hit.t += dt;
        else this.dT += dt;
        if (this.stateT >= this.outcome.hold) {
          if (this.inn.ended) Scenes.go('matchbreak', Match.afterInnings());
          else this._startBall();
        }
        break;
    }
    this._updateTrail();
    this._updateCamera(dt);
  },

  _endBall(key) {
    const inn = this.inn;
    const run = this.hit && this.hit.running;
    const kind = key === 'wide' ? 'wide' : this.release.noBall ? 'noball' : 'legal';
    const boundary = key === 'six' ? 6 : key === 'four' ? 4 : 0;
    const batRuns = run ? run.completed : 0;
    let wicket = null;
    if (key === 'caught' || key === 'bowled' || key === 'lbw') wicket = key;
    else if (run && run.runOut) wicket = 'runout';
    const res = inn.apply({ kind, batRuns, boundary, wicket });
    this.extraKind = null;
    MatchBatScene._showBallResult.call(this, key, res, batRuns, wicket, false);
    BowlControls.enabled = false;
  },

  _drawHud(ctx) {
    MatchScoreHud.draw(ctx, this, false);
    this._drawPauseButton();
    this._drawBanner(ctx, this.state === 'aim' || this.state === 'charge');
    if (this.state === 'aim' && this.stateT > 0.2 && this.inn.legal === 0 && this.inn.index <= 1) {
      R.text(T('bowl.hint'), CONFIG.LOGICAL_W / 2, Display.safe.top + 330, 34, '#ffffff');
    }
    this._drawTimingLabel(ctx);
  },
});
