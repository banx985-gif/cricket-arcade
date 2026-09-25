// Cricket Arcade — Quick Match: YOU BOWL (M03, M04b).
// Built from the Wicket Rush scene (same delivery slots, reticle, charge
// release, swipe and AI batter), with match rules on top:
//   * before each over, choose the bowler (over limits, no two in a row,
//     fatigue) and the field (presets, some earned) — or let the computer pick
//   * each bowler bowls their own family's deliveries with their own stats
//   * the AI batters run between wickets; YOU throw the ball back (timing bar)
//   * wides / no-balls / free hits count against you; the innings ends on
//     overs / all out / target

const MatchBowlScene = Object.assign({}, WicketRushScene, {
  showNonStriker: true,
  inn: null,

  enter() {
    this._initPitch();
    this.inn = Match.current();
    this.rules = this.inn;                  // AI reads .pressure / .freeHit / .ball from here
    this.seed = Match.seed;
    this.team = Match.team('player');
    this.bowler = Match.bowlerOf(this.inn) || this.team.players.find((p) => p.family);
    this.batterP = Match.batter(this.inn);
    Stadium.setConditions(Match.cond);
    const R0 = BOWLING_DATA.reticle.start;
    this.aim = { x: R0.x, z: R0.z };
    this.typeIdx = 0;
    Effects.init();
    MatchupCard.hide();
    ThrowMeter.stop();
    this._initControls();
    this._layout();
    this._startBall();
  },

  exit() { BowlControls.reset(); BowlerPicker.hide(); ThrowMeter.stop(); Fielding.clear(); },

  _layout() {
    this._layoutPause('toss');
    BowlControls.layout();
    BowlerPicker.layout();
  },

  _fatigue() { return Match.fatigue[this.bowler.id] || 0; },
  _cond() { return Match.cond; },
  _pressure() { return Math.max(this.inn.pressure, Duel.pressure(this.inn)); },

  _startBall() {
    if (CareerMatch.route('matchbowl')) return;  // career: only your overs are bowled live
    Match.overStart();                       // resume checkpoint at the start of each over
    this._setState('aim');
    this._resetBall();
    this.del = null;
    this.release = null;
    this.ai = null;
    this.swipe = null;
    this.meter = 0;
    this.golden = false;
    BowlControls.meter = 0;
    BowlControls.meterOn = false;
    BowlControls.enabled = true;
    BowlControls.swipeOpen = false;
    ThrowMeter.stop();
    const prevBatter = this.batterP;
    this.batterP = Match.batter(this.inn);
    if (prevBatter && prevBatter !== this.batterP && !Match.needsBowler(this.inn)) MatchupCard.show(this.batterP, this.bowler, 'bowl');
    this.banner = { text: MatchBatScene._ballLabel.call(this), color: '#ffffff', t: 0 };
    if (this.inn.freeHit) { this.banner.sub = T('bowl.freeHit'); this.banner.subColor = '#ff9d2e'; }
    if (Match.needsBowler(this.inn)) this._pickBowler();
    else { this._applyOver(false); BowlControls.bands = this._bands(); }
  },

  // ---- choose the bowler + field for the next over ----
  _pickBowler() {
    const inn = this.inn;
    const rng = RNG.stream('aiPick:' + inn.index);
    const sug = BowlerRules.aiPick(inn, this.team, Match.fatigue, rng);
    const ph = BowlerRules.phase(inn);
    const fam = Bowling.family(sug.family);
    const fieldId = Fielding.aiChoose({ phase: ph, kind: fam.kind, family: fam.id, wicketsFell: false }, rng, (id) => Unlocks.fieldPreset(id));
    this._setState('pick');
    BowlControls.enabled = false;
    BowlerPicker.show({
      inn, team: this.team, fatigue: Match.fatigue, suggest: { bowlerId: sug.id, fieldId },
      done: (bowlerId, field) => {
        Match.setBowler(inn, bowlerId, field);
        this._applyOver(true);
        this._setState('aim');
        BowlControls.enabled = true;
        Log.add('match', `over ${Math.floor(inn.legal / 6) + 1}: ${bowlerId} bowls, field ${field}`);
      },
    });
  },

  // The chosen bowler's deliveries, bands and field take effect.
  _applyOver(fresh) {
    const inn = this.inn;
    this.bowler = Match.bowlerOf(inn) || this.bowler;
    BowlControls.setDeliveries(this._deliveries());
    if (fresh) { this.typeIdx = 0; BowlControls.selected = 0; }
    BowlControls.bands = this._bands();
    Fielding.setPreset(inn.field, BowlerRules.phase(inn) === 'powerplay');
    Fielding.mods = Duel.fieldMods(this.team, Fielding.preset);
    if (fresh) MatchupCard.show(this.batterP, this.bowler, 'bowl');
  },

  // ---- the AI batters run; you throw it back ----
  _connect(aim, battingRng, fieldingRng) {
    const h = PitchScene._connect.call(this, aim, battingRng, fieldingRng);
    const plan = h.plan;
    if (plan.result === 'fielded') {
      const n = plan.path.n - 1;
      const from = { x: plan.path.x[n], y: 1.2, z: plan.path.z[n] };
      const ready = Math.max(plan.endT, plan.fieldT || 0);
      const t0 = ready + MATCH_DATA.running.pickupTime;
      const ok = Throw.make(from, t0, 'okay'), pf = Throw.make(from, t0, 'perfect');
      h.throwPending = { from, ready, t0 };
      h.running = new Running(Infinity, { safe: pf.returnT, tight: ok.returnT }, Duel.runTimeMult(this.batterP));
      const expect = ok.t1 + MATCH_DATA.throw.keeperDelay * MATCH_DATA.aiRunning.expectKeeper;
      const want = Running.aiPlan(expect, RNG.stream('ai'), h.running.runTime);
      for (let i = 0; i < want; i++) h.running.run(0);
    }
    return h;
  },

  _throw(grade) {
    const h = this.hit, p = h.throwPending;
    h.throwPending = null;
    ThrowMeter.stop();
    h.throw = Throw.make(p.from, Math.max(p.t0, h.t + 0.05), grade);
    h.running.setReturn(h.throw.returnT, false);
    this._showTiming(grade === 'okay' ? 'good' : grade === 'bad' ? 'loose' : 'perfect', 'throw_' + grade);
    Sound.play('release');
    Log.add('ball', `throw ${grade} returnT ${h.throw.returnT.toFixed(2)}`);
  },

  _inPlayEnd(h) {
    if (h.throwPending) return Infinity;
    if (h.throw) {
      const r = h.running;
      if (r && !r.done && (r.cur || r.queued)) return Math.max(h.throw.t1, h.throw.returnT) + 0.3;
      return h.throw.t1 + 0.15;
    }
    return PitchScene._inPlayEnd.call(this, h);
  },

  // ---- input ----
  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    Fullscreen.request();
    if (this._pauseDown(id, x, y)) return;
    if (BowlerPicker.down(id, x, y)) return;
    if (ThrowMeter.active) {
      const b = ThrowMeter.btn;
      b.id = id; b.pressed = Math.hypot(x - b.x, y - b.y) <= b.r * 1.2;
      if (ThrowMeter.tap()) Sound.play('uiTap');
      return;
    }
    BowlControls.down(id, x, y);
  },
  pointerMove(id, x, y) {
    if (Dev.pointerMove(id, x, y)) return;
    if (this._pauseMove(id, x, y)) return;
    if (BowlerPicker.move(id, x, y)) return;
    BowlControls.move(id, x, y);
  },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this._pauseUp(id)) return;
    if (BowlerPicker.up(id)) return;
    if (ThrowMeter.btn.id === id) { ThrowMeter.btn.id = null; ThrowMeter.btn.pressed = false; return; }
    BowlControls.up(id);
  },
  keyDown(code) {
    if (code === 'Escape' || code === 'KeyP') { this.setPaused(!this.paused); return; }
    if (this.paused) return;
    if (BowlerPicker.keyDown(code)) return;
    if (ThrowMeter.active && (code === 'Space' || code === 'KeyT' || code === 'Enter')) { ThrowMeter.tap(); return; }
    BowlControls.keyDown(code);
  },

  update(dt, realDt) {
    BowlControls.update(realDt);
    BowlerPicker.update(realDt);
    MatchupCard.update(realDt);
    if (this.paused || Dev.open || Display.isPortrait) return;
    Effects.update(dt);
    Stadium.update(dt);
    this.stateT += dt;
    if (this.banner) this.banner.t += dt;
    if (this.timingLabel) this.timingLabel.t += dt;
    if (this.flashMarker) this.flashMarker.t += dt;
    Moments.update(this, dt);

    switch (this.state) {
      case 'pick':
        break;
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
        if (this.swipe && !this.swipe.done) {
          this.swipe.t += dt;
          if (this.swipe.t >= BOWLING_DATA.swipe.window) {
            this.swipe.done = true;
            BowlControls.swipeOpen = false;
            this._planBatter();
          }
          break;
        }
        this._updateDelivery();
        break;
      case 'inplay': {
        const h = this.hit;
        // The throw: the game slows while you stop the marker.
        if (h.throwPending && h.t >= h.throwPending.ready) {
          if (!ThrowMeter.active && !h.meterDone) { h.meterDone = true; ThrowMeter.start(Duel.fieldMods(this.team).fielding); Sound.play('uiTap'); }
          const g = ThrowMeter.update(realDt);
          if (g) this._throw(g);
          else dt *= MATCH_DATA.throw.meter.slowMo;
        }
        h.t += dt;
        if (h.running) {
          h.running.update(h.t);
          if (h.throw && h.throw.grade === 'bad' && h.t >= h.throw.t1 && !h.running.overthrow) {
            h.running.setReturn(h.throw.returnT, true);
            h.overthrow = true;
            this._overthrow();
            h.running.aiSteal(h.t);
          }
          if (h.running.runOut && !this.stumpsBroken) { this.stumpsBroken = true; this.stumpsBrokenAt = Stadium._time; Sound.play('stumps'); }
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

  _overthrow() {
    Effects.text(T('outcome.overthrow'), CONFIG.LOGICAL_W / 2, 330, '#ffb36b', 70, { life: 1.4 });
    this.flashMarker = { id: 'marker_overthrow', t: 0 };
    Sound.play('crowdCheer', { gain: 0.5 });
  },

  _endBall(key) {
    const inn = this.inn;
    const run = this.hit && this.hit.running;
    const kind = key === 'wide' ? 'wide' : this.release.noBall ? 'noball' : 'legal';
    const boundary = key === 'six' ? 6 : key === 'four' ? 4 : 0;
    const batRuns = run ? run.completed : 0;
    let wicket = null;
    if (key === 'caught' || key === 'bowled' || key === 'lbw' || key === 'hitwicket') wicket = key;
    else if (run && run.runOut) wicket = 'runout';
    ThrowMeter.stop();
    const res = inn.apply({ kind, batRuns, boundary, wicket });
    if (res.overDone || inn.ended) Match.overDone(inn);
    this.extraKind = null;
    MatchBatScene._showBallResult.call(this, key, res, batRuns, wicket, false);
    BowlControls.enabled = false;
  },

  render(ctx) {
    WicketRushScene.render.call(this, ctx);
    if (this.paused) return;
    MatchupCard.draw(ctx, this.state === 'aim' || this.state === 'charge');
    ThrowMeter.draw(ctx);
    MatchBatScene._drawFlashMarker.call(this, ctx);
    BowlerPicker.draw(ctx);
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
