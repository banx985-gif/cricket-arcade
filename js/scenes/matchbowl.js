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
    DiveMoment.stop();
    this._initControls();
    this._layout();
    this._startBall();
  },

  exit() { BowlControls.reset(); BowlerPicker.hide(); ThrowMeter.stop(); DiveMoment.stop(); Fielding.clear(); TechUI.btns = []; },

  // ---- career techniques (game/techniques.js) ----
  // Release bands with the bowler's stats for this ball, then the techniques.
  _bands() {
    const C = BOWLING_DATA.charge;
    const k = Duel.bandScale(this.bowlP || this.bowler, this._fatigue()) * Difficulty.k('band');      // difficulty (plan 20)
    const around = (b) => { const m = (b[0] + b[1]) / 2, h = (b[1] - b[0]) / 2 * k; return [m - h, m + h]; };
    return Tech.bands({ perfect: around(C.perfect), good: around(C.good) }, this);
  },
  _techSetup() {
    this.bowlP = Tech.bowlStats(this.bowler, this.inn);
    BowlControls.bands = this._bands();
    TechUI.layout('bowl', this.inn, () => this.state === 'aim');
    if (MyXIMatch.on) TacticBar.layout('bowl'); else TacticBar.btns = [];    // My XI: between-over calls (M10)
  },
  _techBoost() { return Tech.releaseBoost(this); },
  // The AI batter against you: your techniques, then the difficulty (a Rookie AI makes more mistakes).
  _techAi() { const o = Tech.aiCtx(this); o.sigmaK *= Difficulty.k('aiSigma'); o.readK /= Difficulty.k('aiRead'); return o; },
  _techMods(m) { return Tech.hitMods(m, this); },

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
    DiveMoment.stop();
    const prevBatter = this.batterP;
    this.batterP = Match.batter(this.inn);
    if (prevBatter && prevBatter !== this.batterP && !Match.needsBowler(this.inn)) MatchupCard.show(this.batterP, this.bowler, 'bowl');
    this.banner = { text: MatchBatScene._ballLabel.call(this), color: '#ffffff', t: 0 };
    if (this.inn.freeHit) { this.banner.sub = T('bowl.freeHit'); this.banner.subColor = '#ff9d2e'; }
    if (Match.needsBowler(this.inn)) this._pickBowler();
    else { this._applyOver(false); this._techSetup(); }
  },

  // ---- choose the bowler + field for the next over ----
  _pickBowler() {
    const inn = this.inn;
    const rng = RNG.stream('aiPick:' + inn.index);
    const sug = BowlerRules.aiPick(inn, this.team, Match.fatigue, rng);
    const ph = BowlerRules.phase(inn);
    const fam = Bowling.family(sug.family);
    // My XI: the captain's bowling call brings its own field (you can still change it).
    const called = MyXIMatch.on ? MyXIMatch.field(inn) : null;
    const fieldId = called || Fielding.aiChoose({ phase: ph, kind: fam.kind, family: fam.id, wicketsFell: false }, rng, (id) => Unlocks.fieldPreset(id));
    this._setState('pick');
    BowlControls.enabled = false;
    BowlerPicker.show({
      inn, team: this.team, fatigue: Match.fatigue, suggest: { bowlerId: sug.id, fieldId },
      done: (bowlerId, field) => {
        Match.setBowler(inn, bowlerId, field);
        MissionMatch.noteField(field);
        this._applyOver(true);
        this._setState('aim');
        this._techSetup();
        BowlControls.enabled = true;
        Log.add('match', `over ${Math.floor(inn.legal / 6) + 1}: ${bowlerId} bowls, field ${field}`);
      },
    });
  },

  // The chosen bowler's deliveries, bands and field take effect.
  _applyOver(fresh) {
    const inn = this.inn;
    this.bowler = Match.bowlerOf(inn) || this.bowler;
    this.bowlP = this.bowler;
    BowlControls.setDeliveries(this._deliveries());
    if (fresh) { this.typeIdx = 0; BowlControls.selected = 0; }
    BowlControls.bands = this._bands();
    Fielding.setPreset(inn.field, BowlerRules.phase(inn) === 'powerplay');
    Fielding.mods = Duel.fieldMods(this.team, Fielding.preset);
    if (fresh) MatchupCard.show(this.batterP, this.bowler, 'bowl');
  },

  // ---- the AI batters run; you throw it back ----
  // Your side fields, so hard-hit balls can bring a diving stop (not in the tutorial).
  _fieldOpts() { return MissionMatch.on && MissionMatch.m && MissionMatch.m.tutorial ? undefined : { dive: RNG.stream('dive') }; },

  // Real-match six rules (M15 3b): the AI batter's lofts depend on its stats v YOURS and your release.
  _sixCtx(aim) { return { del: this.del, aim, releaseGrade: (this.release && this.release.grade) || 'good', memory: null }; },

  _connect(aim, battingRng, fieldingRng) {
    const h = PitchScene._connect.call(this, aim, battingRng, fieldingRng);
    if (h.plan.dive) h.dive = h.plan.dive;
    this._setupRunning(h);
    return h;
  },

  // Fielded: the throw waits for the pick-up and the AI batters plan their runs.
  _setupRunning(h) {
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
  },

  // The dive is decided: a stop swaps in the saved ball; a miss lets it run on.
  _dive(result) {
    const h = this.hit, dv = h.dive;
    dv.result = result;
    DiveMoment.stop();
    Sound.play('sfx_dive');
    const sp = View3D.project(dv.x, 0, dv.z);
    if (result === 'saved') {
      h.plan = dv.alt;
      h.throwPending = null;
      h.running = null;
      this._setupRunning(h);
      Effects.text(T('moment.diveSaved'), CONFIG.LOGICAL_W / 2, 330, '#3ddc5a', 80, { life: 1.2 });
      if (sp) Effects.dust(sp.x, sp.y, 10, 1.4);
      Stadium.cheer(0.5);
      Sound.play('crowdCheer', { gain: 0.5 });
      Platform.haptic('light');
    } else {
      Effects.text(T('moment.diveMissed'), CONFIG.LOGICAL_W / 2, 330, '#ffb36b', 64, { life: 1.1 });
      if (sp) Effects.dust(sp.x, sp.y, 6, 1);
    }
    Log.add('ball', `dive ${result} (saves ${dv.saves})`);
  },

  _throw(grade) {
    const h = this.hit, p = h.throwPending;
    h.throwPending = null;
    ThrowMeter.stop();
    h.throw = Throw.make(p.from, Math.max(p.t0, h.t + 0.05), grade);
    h.running.setReturn(h.throw.returnT, false);
    this._showTiming(grade === 'okay' ? 'good' : grade === 'bad' ? 'loose' : 'perfect', 'throw_' + grade);
    Sound.play('sfx_throw');
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
    if (DiveMoment.down(id, x, y)) return;
    if (!ThrowMeter.active && TechUI.down(id, x, y, () => { BowlControls.bands = this._bands(); })) return;
    if (MyXIMatch.on && !BowlerPicker.open && !ThrowMeter.active && TacticBar.down(x, y)) return;
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
    if (DiveMoment.move(id, x, y)) return;
    BowlControls.move(id, x, y);
  },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this._pauseUp(id)) return;
    if (BowlerPicker.up(id)) return;
    if (DiveMoment.up(id)) return;
    if (ThrowMeter.btn.id === id) { ThrowMeter.btn.id = null; ThrowMeter.btn.pressed = false; return; }
    BowlControls.up(id);
  },
  keyDown(code) {
    if (code === 'Escape' || code === 'KeyP') { this.setPaused(!this.paused); return; }
    if (this.paused) return;
    if (BowlerPicker.keyDown(code)) return;
    if (DiveMoment.active && (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD')) { DiveMoment.swipe(code === 'ArrowLeft' || code === 'KeyA' ? -1 : 1); return; }
    if (ThrowMeter.active && (code === 'Space' || code === 'KeyT' || code === 'Enter')) { ThrowMeter.tap(); return; }
    BowlControls.keyDown(code);
  },

  update(dt, realDt) {
    BowlControls.update(realDt);
    BowlerPicker.update(realDt);
    MatchupCard.update(realDt);
    if (this.paused || Dev.open || Display.isPortrait) return;
    Effects.update(dt);
    Commentary.update(dt);
    Stadium.update(dt);
    Tech.update(realDt);
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
        // The dive: the game slows right down while the ring closes.
        if (h.dive && !h.dive.result) {
          const D = MATCH_DATA.dive;
          if (!DiveMoment.active && h.t >= h.dive.t - D.lead) {
            const a = View3D.project(h.dive.from.x, 0, h.dive.from.z), b = View3D.project(h.dive.x, 0, h.dive.z);
            h.dive.dir = a && b ? Math.sign(b.x - a.x) || 1 : 1;
            DiveMoment.start(h.dive, h.dive.dir, Duel.fieldMods(this.team).fielding);
            Sound.play('uiTap');
          }
          if (DiveMoment.active) {
            const r = DiveMoment.update(realDt);
            if (r) this._dive(r); else dt *= D.slowMo;
          }
        }
        // The throw: the game slows while you stop the marker.
        if (h.throwPending && h.t >= h.throwPending.ready) {
          if (!ThrowMeter.active && !h.meterDone) { h.meterDone = true; ThrowMeter.start(Duel.fieldMods(this.team).fielding, Tech.throwZone()); Sound.play('uiTap'); }
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
          if (h.running.runOut && !this.stumpsBroken) { this.stumpsBroken = true; this.stumpsBrokenAt = Stadium._time; Sound.play('sfx_runout'); Sound.play('sfx_bails'); }
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
    if (key === 'caught' || key === 'bowled' || key === 'lbw' || key === 'hitwicket' || key === 'stumped') wicket = key;
    else if (run && run.runOut) wicket = 'runout';
    const fx = !this.hit && this.fate ? this.fate : null;          // M19: byes / leg byes
    const thr = ThrowMeter.m && ThrowMeter.m.tapped;
    DiveMoment.stop();
    const fam = this.bowler && Bowling.family(this.bowler.family), dtype = fam && fam.deliveries[this.typeIdx] ? fam.deliveries[this.typeIdx].id : null;
    ThrowMeter.stop();
    const catcher = wicket === 'caught' && this.hit && this.hit.plan.fielder ? this.hit.plan.fielder.id : null;
    // M19: diving stops and dropped catches (achievements: Diving Stop, Perfect Game)
    const ds = this.hit && this.hit.dive && this.hit.dive.result === 'saved', dc = !!(this.hit && this.hit.plan && this.hit.plan.dropped && this.hit.dropShown);
    const res = inn.apply({ kind, batRuns, boundary, wicket, dtype, thr, catcher, myCatch: CareerMatch._myCatch(inn, catcher), ds, dc, byes: fx && fx.byes, legByes: fx && fx.legByes, dist: this._hitDist ? this._hitDist() : null });
    if (MissionMatch.on) MissionMatch.afterBall(inn);
    if (res.overDone || inn.ended) Match.overDone(inn);
    if (Tech.mine(this.bowler)) Tech.bowlBallEnd(key, kind === 'legal', !!res.wicket, res.runs);
    TechUI.btns = [];
    this.extraKind = null;
    MatchBatScene._showBallResult.call(this, key, res, batRuns, wicket, false);
    BowlControls.enabled = false;
  },

  render(ctx) {
    WicketRushScene.render.call(this, ctx);
    if (this.paused) return;
    MatchupCard.draw(ctx, this.state === 'aim' || this.state === 'charge');
    ThrowMeter.draw(ctx);
    DiveMoment.draw(ctx);
    MatchBatScene._drawFlashMarker.call(this, ctx);
    if (!BowlerPicker.open && !ThrowMeter.active && !DiveMoment.active) TechUI.draw(ctx);
    if (MyXIMatch.on && !BowlerPicker.open && !ThrowMeter.active) TacticBar.draw(ctx);
    if (MissionMatch.on && !BowlerPicker.open) { if (MissionMatch.m.tutorial) TutorialCoach.draw(ctx, this); else MissionHud.draw(ctx, this); }
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
