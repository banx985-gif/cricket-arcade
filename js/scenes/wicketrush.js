// Cricket Arcade — Wicket Rush Classic scene (M02 bowling slice, plan 6.2 / 17).
// You bowl 18 legal deliveries at an AI batter. Per ball:
//   aim (pick delivery + drag reticle) -> charge (hold BOWL, bowler runs in)
//   -> delivery (swipe for extra movement, AI plays its shot) -> inplay (if hit)
//   -> outcome -> next
// The ball, fielding, cameras and ground are shared with Six Smash
// (game/pitchscene.js), so a ball behaves identically in both modes. The
// Quick Match bowling innings (matchbowl.js) is built from this scene.

const WicketRushScene = Object.assign({}, PitchScene, {
  rules: null,
  seed: 0,
  state: 'aim',
  stateT: 0,
  banner: null,
  timingLabel: null,
  aim: { x: 0, z: 0 },
  typeIdx: 0,
  meter: 0,
  release: null,       // { grade, noBall, type }
  ai: null,            // the AI's decision for this ball
  feelScale: 0.6,      // the AI's hits are toned down (it's not your celebration)
  bowler: null,        // your bowler (stats + family)
  batterP: null,       // the AI batter (stats)
  swipe: null,         // Step 4 window: { t, done }

  isChallenge: false,  // true only on this scene (the match scene built from it stays false)
  chal: null,          // Challenge.current
  target: null,        // this ball's target stump: 'off' | 'middle' | 'leg' | 'bail'

  // ---------------------------------------------------------------- setup
  // params: { rs, diff, pick } from the Challenge hub (plan 17). Your picked
  // bowler's stats, techniques and frozen Legacy loadout apply.
  enter(params) {
    this.isChallenge = true;
    Tech.end();
    this._initPitch();
    this.chal = Challenge.begin('rush', params && params.rs ? params : null);
    this.seed = RNG.begin(Dev.nextSeed());
    this.rules = new WicketRushRules(this.chal.rs);
    this.inn = this.rules;                  // the techniques read the innings from here
    this.bowler = this.chal.player;
    if (!this.bowler.family) this.bowler.family = 'fast';
    this.bowlP = this.bowler;
    if (this.chal.pc) Tech.beginMany([{ pid: this.bowler.id, c: this.chal.pc }]);
    this.batterP = Challenge.rushBatter(this.rules, this.chal.diff);
    this._targetRng = RNG.stream('targets');
    Fielding.clear();
    Stadium.setConditions(null);
    const R0 = BOWLING_DATA.reticle.start;
    this.aim = { x: R0.x, z: R0.z };
    this.typeIdx = 0;
    Effects.init();
    this._initControls();
    this._layout();
    Log.add('challenge', `rush ${this.rules.rs.id} ${this.chal.diff} bowler ${this.bowler.name} (${this.bowler.family})`);
    this._startBall();
  },

  // ---- your techniques (game/techniques.js), as in a match ----
  _techSetup() {
    this.bowlP = Tech.bowlStats(this.bowler, this.inn);
    BowlControls.bands = this._bands();
    TechUI.layout('bowl', this.inn, () => this.state === 'aim');
  },
  _techBoost() { return Tech.releaseBoost(this); },
  _techAi() { return Tech.aiCtx(this); },
  _techMods(m) { return Tech.hitMods(m, this); },

  _initControls() {
    BowlControls.init({
      select: (i) => this.selectType(i),
      bowlDown: () => this.bowlDown(),
      bowlUp: () => this.bowlUp(),
      swipe: (dx) => this.onSwipe(dx),
    }, this._deliveries());
    BowlControls.reset();
    BowlControls.selected = 0;
  },

  exit() { BowlControls.reset(); Tech.end(); TechUI.btns = []; },

  _layout() {
    this._layoutPause('wicketrush', this.isChallenge ? { rs: this.chal.rs, diff: this.chal.diff, pick: this.chal.pick } : null, 'challenges');
    BowlControls.layout();
  },

  setPaused(p) {
    this.paused = p;
    if (p) {
      BowlControls.reset();
      // a half-finished run-up is cancelled, not bowled
      if (this.state === 'charge') { this._setState('aim'); this.meter = 0; BowlControls.meter = 0; }
    }
  },

  _family() { return Bowling.family(this.bowler.family); },
  _deliveries() { return this._family().deliveries; },
  _type() { return this._deliveries()[this.typeIdx] || this._deliveries()[0]; },
  _fatigue() { return 0; },
  _cond() { return null; },
  _pressure() { return this.rules.pressure; },

  // Release bands for this bowler: Control widens them, fatigue shrinks them.
  // (a challenge: the difficulty widens / narrows them too, then the techniques)
  _bands() {
    const C = BOWLING_DATA.charge;
    const k = Duel.bandScale(this.bowlP || this.bowler, this._fatigue()) * (this.chal ? Challenge.diff(this.chal.diff).window : 1);
    const around = (b) => { const m = (b[0] + b[1]) / 2, h = (b[1] - b[0]) / 2 * k; return [m - h, m + h]; };
    return Tech.bands({ perfect: around(C.perfect), good: around(C.good) }, this);
  },

  _startBall() {
    this._setState('aim');
    this._resetBall();
    this.del = null;
    this.release = null;
    this.ai = null;
    this.swipe = null;
    this.meter = 0;
    BowlControls.meter = 0;
    BowlControls.meterOn = false;
    BowlControls.enabled = true;
    BowlControls.swipeOpen = false;
    const r = this.rules, rs = r.rs;
    // The batter (Survival: better as the run goes on) and your techniques for this ball.
    this.batterP = Challenge.rushBatter(r, this.chal.diff);
    this._techSetup();
    const n = r.ball + 1, total = rs.balls;
    const text = rs.lives ? T('chal.ballN', { n }) : n === total ? T('hud.lastBall') : T('hud.ballNo', { n, total });
    this.banner = { text, color: '#ffffff', t: 0 };
    this.golden = false;
    // Target stump (plan 17.3).
    const T0 = rs.targets;
    this.target = T0 && ((r.ball + 1) % T0.every === 0) ? this._targetRng.pick(CHALLENGE_DATA.rush.targets.kinds) : null;
    if (Dev.forceGolden || r.goldenDue()) {
      this.golden = true; Dev.forceGolden = false;
      this.banner.sub = T('bowl.goldenWicket'); this.banner.icon = 'icon_golden_wicket';
    } else if (r.freeHit) {
      this.banner.sub = T('bowl.freeHit'); this.banner.subColor = '#ff9d2e';
    } else if (this.target) {
      this.banner.sub = T('chal.stumpTarget.' + this.target); this.banner.subColor = '#5fd4ff';
    }
  },

  // Was the ball on the target stump? (its line where it reaches the stumps)
  _onTarget() {
    if (!this.target || !this.del || this.release.noBall) return false;
    const sim = this.del.sim;
    if (!sim.hitsStumps) return false;
    const hw = BATTING_DATA.pitch.stumpsHalfWidth, x = sim.stumpsX;
    if (this.target === 'bail') return sim.path.y[sim.stumpsIdx] >= CHALLENGE_DATA.rush.targets.bailHeight;
    if (this.target === 'off') return x > hw / 3;
    if (this.target === 'leg') return x < -hw / 3;
    return Math.abs(x) <= hw / 3;
  },

  // ---------------------------------------------------------------- input
  selectType(i) {
    if (this.paused) return;
    if (this.state !== 'aim') return;       // no changing mind mid run-up
    if (!this._deliveries()[i]) return;
    this.typeIdx = i;
    BowlControls.selected = i;
    Sound.play('uiTap');
  },

  bowlDown() {
    if (this.paused) return;
    if (this.state === 'outcome' && this.stateT > 0.35) { this.stateT = this.outcome.hold; return; }
    if (this.state !== 'aim') return;
    this._setState('charge');
    this.meter = 0;
    BowlControls.meterOn = true;
  },

  bowlUp() {
    if (this.paused || this.state !== 'charge') return;
    this._release();
  },

  // Step 4: a sideways swipe straight after release.
  onSwipe(dx) {
    const sw = this.swipe;
    if (!sw || sw.done || this.state !== 'delivery') return;
    const W = BOWLING_DATA.swipe;
    sw.done = true;
    BowlControls.swipeOpen = false;
    const mag = Math.min(1, Math.abs(dx) / W.fullPx);
    this.del = Bowling.withSwipe(this.del, { dir: Math.sign(dx), mag });
    this.del.golden = this.golden;
    sw.dir = Math.sign(dx);
    sw.flash = 1;
    Sound.play('swish', { gain: 0.8 });
    const sp = View3D.project(this.del.release.x, this.del.release.y, this.del.release.z);
    if (sp) Effects.ring(sp.x, sp.y, 120, '#9be7ff', 0.3, 8);
    Effects.text(T(this._family().kind === 'spin' ? 'bowl.moreSpin' : 'bowl.moreSwing'), CONFIG.LOGICAL_W / 2, 330, '#9be7ff', 50, { life: 0.9 });
    this._planBatter();
  },

  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    Fullscreen.request();
    if (this._pauseDown(id, x, y)) return;
    BowlControls.down(id, x, y);
  },
  pointerMove(id, x, y) {
    if (Dev.pointerMove(id, x, y)) return;
    if (this._pauseMove(id, x, y)) return;
    BowlControls.move(id, x, y);
  },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this._pauseUp(id)) return;
    BowlControls.up(id);
  },
  keyDown(code) {
    if (code === 'Escape' || code === 'KeyP') { this.setPaused(!this.paused); return; }
    if (!this.paused) BowlControls.keyDown(code);
  },
  keyUp(code) { if (!this.paused) BowlControls.keyUp(code); },

  // ---------------------------------------------------------------- aim
  // The reticle is pulled gently toward the chosen delivery's length zone.
  _snapped() {
    const t = this._type();
    let z = this.aim.z;
    if (z < t.zone[0]) z += (t.zone[0] - z) * t.snap;
    else if (z > t.zone[1]) z -= (z - t.zone[1]) * t.snap;
    return { x: this.aim.x, z };
  },

  // Dragging UP the screen moves the target up the screen (toward the batter).
  _updateAim(realDt) {
    const st = Aim.settings();
    Aim.drag(this.aim, BowlControls.takeDrag(), st);
    Aim.keys(this.aim, {
      left: Keys.any(['KeyA', 'ArrowLeft']), right: Keys.any(['KeyD', 'ArrowRight']),
      up: Keys.any(['KeyW', 'ArrowUp']), down: Keys.any(['KeyS', 'ArrowDown']),
    }, realDt, st);
  },

  // ---------------------------------------------------------------- release
  _release() {
    const C = BOWLING_DATA.charge;
    const m = this.meter;
    const B = this._bands();
    const noBall = m > C.noBallAbove;
    const grade = (m >= B.perfect[0] && m <= B.perfect[1]) ? 'perfect'
      : (m >= B.good[0] && m <= B.good[1]) ? 'good' : 'loose';
    const power = Math.max(0, Math.min(1, (Math.min(m, 1) - C.minPower) / (1 - C.minPower)));
    if (power > 0.9 && this.inn) this.inn._hardBalls = (this.inn._hardBalls || 0) + 1;

    // bowlP / _techBoost: the career bowler's techniques (Quick Match / career only).
    this.del = Bowling.release({
      bowler: this.bowlP || this.bowler, family: this.bowler.family, typeIdx: this.typeIdx, target: this._snapped(),
      grade, power, fatigue: this._fatigue(), cond: this._cond(), index: this.rules.ball,
      boost: this._techBoost ? this._techBoost() : null,
    }, RNG.stream('bowlAcc'));
    this.del.golden = this.golden;
    this.release = { grade, noBall, type: this._type().id, meter: m };
    BowlControls.meterOn = false;
    BowlControls.enabled = false;
    this._setState('delivery');
    this.dT = 0;
    Sound.play('release');
    this._showTiming(grade === 'loose' ? 'loose' : grade);
    if (noBall) Effects.text(T('bowl.overstep'), CONFIG.LOGICAL_W / 2, 300, '#ff6b6b', 60);

    // Step 4: movement deliveries get a short swipe window before the batter commits.
    if (this.del.canSwipe) {
      this.swipe = { t: 0, done: false };
      BowlControls.swipeOpen = true;
    } else {
      this._planBatter();
    }
  },

  // Decide what the AI batter does with this ball and schedule its swing.
  _planBatter() {
    const sim = this.del.sim;
    const tIdeal = sim.contactIdx * CONFIG.PHYSICS_STEP;
    const at = sim.path.at(tIdeal, {});
    this.isWide = BallPlay.isWide(this.del);
    const bat = this.batterP, bowl = this.bowlP || this.bowler;
    const tk = this._techAi ? this._techAi() : {};

    const ai = this.isWide ? { leave: true, difficulty: 0 }
      : AIBatter.decide(this.del, {
        releaseGrade: this.release.grade, pressure: this._pressure(),
        freeHit: this.rules.freeHit || this.release.noBall,
        timingBias: this.del.timingBias, bat, bowl, fatigue: this._fatigue(), sigmaK: tk.sigmaK, readK: tk.readK,
      }, RNG.stream('ai'));
    this.ai = ai;
    this._duelPlayers = { bat, bowl };

    if (ai.leave) {
      this.shot = { leave: true, id: 'leave', contactT: null };
      this.fate = this.isWide ? { kind: 'miss', result: null } : BallPlay.fate({ del: this.del, left: true, bat, bowl }, RNG.stream('duel'));
      return;
    }
    const pressT = tIdeal + ai.err;
    let grade = Contact.grade(ai.shot, ai.err);
    const shot = { id: ai.shot, pressT, err: ai.err, grade, swingStart: pressT, contactT: null, done: false };
    if (grade !== 'miss' && !Contact.inReach(at)) grade = shot.grade = 'miss';
    const f = BallPlay.fate({ del: this.del, shotId: ai.shot, grade, bat, bowl, releaseGrade: this.release.grade }, RNG.stream('duel'));
    this.fate = f;
    if (f.kind === 'contact') {
      shot.contactT = Math.max(pressT, tIdeal);
      shot.swingStart = Math.max(0, shot.contactT - this._swingTime(ai.shot) * 0.5);
    } else if (f.kind === 'hitwicket') {
      f.at = pressT + this._swingTime(ai.shot) * 0.6;
    }
    this.shot = shot;
    Log.add('ai', `#${this.rules.ball + 1} ${this.del.family}/${this.del.type} ${this.del.lengthId} ${this.release.grade} d=${ai.difficulty.toFixed(2)} ${ai.shot} ${grade} err=${Math.round(ai.err * 1000)}ms -> ${f.kind}${f.result ? ' ' + f.result : ''}`);
  },

  // ---------------------------------------------------------------- update
  update(dt, realDt) {
    BowlControls.update(realDt);
    if (this.paused || Dev.open || Display.isPortrait) return;
    Effects.update(dt);
    Stadium.update(dt);
    this.stateT += dt;
    if (this.banner) this.banner.t += dt;
    if (this.timingLabel) this.timingLabel.t += dt;
    Moments.update(this, dt);

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
        this.hit.t += dt;
        const key = this._stepInPlay();
        if (key) this._endBall(key, key === 'defended' ? 0 : this.hit.plan.runs);   // a block is a dot
        break;
      }
      case 'outcome':
        if (this.hit) this.hit.t += dt;
        else this.dT += dt;
        if (this.stateT >= this.outcome.hold) {
          if (this.rules.finished) this._finish();
          else this._startBall();
        }
        break;
    }
    this._updateTrail();
    this._updateCamera(dt);
  },

  _updateDelivery() {
    const sim = this.del.sim;
    const sh = this.shot;
    if (!sh) return;
    if (sh.contactT !== null && !sh.done && this.dT >= sh.contactT) {
      sh.done = true;
      const hit = this._connect(sh.aim || this.ai.aim, RNG.stream('batting'), RNG.stream('fielding'));
      Log.add('ball', `#${this.rules.ball + 1} AI ${sh.id} ${sh.grade} -> ${hit.plan.result}`);
      return;
    }
    if (!sh.leave && sh.contactT === null && !sh.swishPlayed && this.dT >= sh.swingStart) {
      sh.swishPlayed = true;
      Sound.play('swish');
      if (this.fate && this.fate.kind === 'beaten') this._showTiming('beaten');
    }
    if (this._stepFate()) return;
    if (this.dT >= sim.path.duration()) {
      if (this.isWide) this._endBall('wide');
      else this._endBall(sh.leave ? 'leave' : 'miss');
    }
  },

  _endBall(key, runs) {
    const F = BOWLING_DATA.feel;
    const r = this.rules;
    const res = r.apply(key === 'padLeg' ? 'dot' : key, {
      runs: runs || 0, noBall: this.release.noBall, golden: this.del.golden,
      perfectRelease: this.release.grade === 'perfect', onTarget: this._onTarget(), onStumps: !!this.del.sim.hitsStumps,
    });
    const wicket = WicketRushRules.isWicket(key) && !res.notOut;
    if (Tech.mine(this.bowler)) Tech.bowlBallEnd(key, !this.release.noBall && key !== 'wide', wicket, runs || 0);
    TechUI.btns = [];
    const look = this._outcomeLook(res.notOut ? 'notout' : key, runs);
    if (res.notOut) look.text = T(this.release.noBall ? 'outcome.notOutNoBall' : 'outcome.notOut');
    this.outcome = Object.assign(look, {
      key, res, t: 0,
      hold: F.outcomeHold + (wicket ? F.wicketHoldExtra : 0),
      showText: wicket || res.notOut || key === 'padLeg',   // six/four/wide markers already say it
      umpire: wicket && key !== 'bowled' && key !== 'hitwicket',
      fingerUp: wicket && key === 'lbw',
    });
    this._setState('outcome');

    const cx = CONFIG.LOGICAL_W / 2;
    if (res.points > 0) Effects.text(T('outcome.points', { n: formatNumber(res.points) }), cx, 640, '#9cff6a', 72, { life: 1.3 });
    if (res.penalty > 0) Effects.text(T('bowl.extraPenalty', { n: formatNumber(res.penalty) }), cx, 720, '#ff6b6b', 56, { life: 1.4 });
    if (res.comboUp) Effects.text(T('outcome.comboUp', { n: res.mult }), cx, 720, '#ff9d2e', 64, { life: 1.4 });
    else if (res.comboDown) Effects.text(T('bowl.comboDown'), cx, 780, '#ff9d9d', 44, { life: 1.2 });
    if (this.release.noBall) Effects.text(T('outcome.noball'), cx, 250, '#ffb36b', 70, { life: 1.4 });
    if (res.freeHitNext) Effects.text(T('bowl.freeHitNext'), cx, 860, '#ff9d2e', 44, { life: 1.6 });
    if (res.onTarget) { Effects.text(T(wicket ? 'chal.targetWicket' : 'chal.onTarget'), cx, 560, '#5fd4ff', 62, { life: 1.5 }); Sound.play('combo'); }
    if (res.lifeLost) Effects.text(T('chal.lifeLost', { n: r.livesLeft }), cx, 800, '#ff6b6b', 54, { life: 1.5 });
    if (res.bossOut && !res.bossBeaten) Effects.text(T('chal.bossOut', { n: r.boss.left }), cx, 300, '#ffd23f', 64, { life: 1.8 });
    if (res.bossBeaten) { Effects.text(T('chal.bossBeaten'), cx, 300, '#ffd23f', 84, { life: 2.2 }); Sound.play('fanfare'); }

    this._outcomeFeel(key === 'wide' ? 'none' : (res.notOut ? 'none' : key));
    if (wicket) {
      // You're the bowler: a wicket is YOUR moment.
      Sound.play('fanfare');
      Sound.play('crowdRoar', { gain: 0.8 });
      Stadium.cheer(1);
      Effects.flash(0.4, '#fff4c2');
      const sp = View3D.project(0, 0.5, 0);
      if (sp) { Effects.sparks(sp.x, sp.y, 28, '#ffd23f', 900); Effects.ring(sp.x, sp.y, 220, '#ffd23f', 0.5, 14); }
      if (res.comboUp) Sound.play('combo');
    } else if (key === 'four' || key === 'six') {
      Effects.flash(0.18, '#ff3b3b');
    } else if (key === 'wide' || this.release.noBall) {
      Sound.play('crowdGroan', { gain: 0.6 });
    }
    Log.add('score', `ball ${r.ball}: ${key}${this.release.noBall ? ' (no-ball)' : ''} +${res.points} -${res.penalty} = ${r.score} pressure=${r.pressure.toFixed(2)}`);
  },

  _finish() {
    const r = this.rules;
    const sum = Challenge.finish(Save.data, {
      rs: r.rs.id, raw: r.score, diff: this.chal.diff, player: this.bowler, pick: this.chal.pick,
      stats: { wickets: r.wickets, combo: r.bestCombo, streak: r.bestCombo, targets: r.onTargets, perfects: r.perfects },
    });
    Scenes.go('result', Object.assign(sum, {
      mode: 'wicketrush', game: 'rush', rs: r.rs.id, titleKey: 'chal.rs.' + r.rs.id, seed: this.seed,
      again: { rs: this.chal.rs, diff: this.chal.diff, pick: this.chal.pick },
      stats: [
        ['result.wickets', r.wickets], ['result.dots', r.dots],
        r.rs.targets ? ['chal.stat.onTarget', r.onTargets] : r.rs.perfectOnly ? ['chal.stat.perfectRel', r.perfects] : ['result.runsConceded', r.runs],
        r.rs.boss ? ['chal.stat.bossOuts', (r.boss.max - r.boss.left) + ' / ' + r.boss.max] : ['result.bestCombo', r.bestCombo],
      ],
    }));
  },

  // ---------------------------------------------------------------- bowler animation
  _bowlerPhase() {
    if (this.state === 'aim' || this.state === 'pick') return { runT: 0, after: -1 };
    if (this.state === 'charge') return { runT: Math.min(1, this.meter), after: -1 };
    return { runT: 1, after: this.dT + (this.hit ? this.hit.t : 0) };
  },

  // ---------------------------------------------------------------- render
  render(ctx) {
    View3D.set(this.cam.pos, this.cam.tgt, this.cam.focal);
    Stadium.drawBackground(ctx);
    Stadium.drawField(ctx);
    if (this.state === 'aim' || this.state === 'charge') this._drawReticle(ctx);
    this._drawWorld(ctx);
    if (this.isChallenge) this._drawTarget(ctx);
    Effects.drawParticles(ctx);
    if (Dev.hitzone && this.del) this._drawDebug(ctx);
    Effects.drawFlash(ctx);
    Moments.draw(ctx, this);
    this._drawHud(ctx);
    if (!ThrowMeter.active) BowlControls.draw(ctx);
    this._drawSwipeHint(ctx);
    this._drawOutcome(ctx);
    Effects.drawTexts(ctx);
    if (this.isChallenge && !this.paused) TechUI.draw(ctx);
    if (this.paused) this._drawPause(ctx);
  },

  // Code-drawn target stump (plan 17.3): a glowing ring on that stump (or the bails).
  _drawTarget(ctx) {
    if (!this.target || this.state === 'outcome') return;
    const hw = BATTING_DATA.pitch.stumpsHalfWidth, h = BATTING_DATA.pitch.stumpsHeight;
    const x = this.target === 'off' ? hw : this.target === 'leg' ? -hw : 0;
    const y = this.target === 'bail' ? h : h * 0.5;
    const p = View3D.project(x, y, 0);
    if (!p) return;
    const pulse = 1 + Math.sin(Stadium._time * 6) * 0.12;
    const r = Math.max(24, (this.target === 'bail' ? 0.2 : 0.12) * p.s) * pulse;
    ctx.save();
    ctx.globalAlpha = 0.85;
    R.circle(p.x, p.y, r * 1.6, 'rgba(95,212,255,0.25)');
    R.circle(p.x, p.y, r, null, '#bff0ff', 5);
    ctx.restore();
    R.text(T('chal.target'), p.x + r + 50, p.y, 22, '#bff0ff');
  },

  // "SWIPE FOR MORE SWING / SPIN" with arrows while the Step 4 window is open.
  _drawSwipeHint(ctx) {
    const sw = this.swipe;
    if (!sw || sw.done || this.state !== 'delivery') return;
    const cx = CONFIG.LOGICAL_W / 2, y = Display.safe.top + 262;
    const k = 1 - sw.t / BOWLING_DATA.swipe.window;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2);
    R.roundRect(cx - 360, y - 50, 720, 100, 30, 'rgba(8,20,40,0.8)', '#9be7ff', 4);
    const nudge = Math.sin(sw.t * 30) * 12;
    R.text('◀', cx - 300 - nudge, y, 56, '#9be7ff');
    R.text('▶', cx + 300 + nudge, y, 56, '#9be7ff');
    R.text(T(this._family().kind === 'spin' ? 'bowl.swipeSpin' : 'bowl.swipeSwing'), cx, y, 36, '#ffffff');
    R.roundRect(cx - 250, y + 36, 500 * k, 8, 4, '#9be7ff');
    ctx.restore();
  },

  _drawReticle(ctx) {
    const s = this._snapped();
    const p = View3D.project(s.x, 0.01, s.z);
    if (!p) return;
    const size = 1.3 * p.s;
    const pulse = 1 + Math.sin(this.stateT * 6) * 0.04;
    if (!Sprites.ui('hud_reticle', p.x, p.y - size * 0.06, size * 1.25 * pulse, size * pulse, { scaleY: 0.55 })) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1, 0.4);
      R.circle(0, 0, size * 0.5 * pulse, 'rgba(47,155,255,0.25)', '#7fd0ff', 5);
      R.circle(0, 0, size * 0.2, null, '#ffffff', 4);
      ctx.restore();
    }
    // Where the thumb is pointing, if the snap has pulled the reticle away from it.
    if (Math.abs(s.z - this.aim.z) > 0.25) {
      const q = View3D.project(this.aim.x, 0.01, this.aim.z);
      if (q) R.circle(q.x, q.y, 7, 'rgba(255,255,255,0.6)');
    }
    // Which way this delivery will move (swing in the air, turn off the pitch).
    const t = this._type();
    const mv = (t.swing || 0) * 0.35 + (t.turn || 0) * 0.25;
    if (Math.abs(mv) > 0.05) {
      const q = View3D.project(s.x + Math.sign(mv) * Math.min(0.7, Math.abs(mv)), 0.01, s.z - 1.6);
      if (q) {
        R.line(p.x, p.y, q.x, q.y, 'rgba(155,231,255,0.85)', 5);
        R.circle(q.x, q.y, 9, '#9be7ff');
      }
    }
    R.text(T('length.' + Delivery.lengthOf(s.z)), p.x, p.y + size * 0.42 + 26, 30, '#ffffff');
  },

  _drawDebug(ctx) {
    const sim = this.del.sim;
    ctx.globalAlpha = 0.5;
    let prev = null;
    for (let k = 0; k < sim.path.n; k += 4) {
      const q = View3D.project(sim.path.x[k], sim.path.y[k], sim.path.z[k]);
      if (q && prev) R.line(prev.x, prev.y, q.x, q.y, '#ff00ff', 2);
      prev = q;
    }
    ctx.globalAlpha = 1;
    const d = this.del, ai = this.ai || {}, f = this.fate || {};
    const lines = [
      `seed ${this.seed}  ball ${this.rules.ball + 1}  ${d.family}/${d.type} ${d.lengthId}  ${d.kmh}km/h  line ${d.line.toFixed(2)}  swing ${d.swing.toFixed(2)} move ${d.movement.toFixed(2)}  release ${this.release.grade} (${this.release.meter.toFixed(2)})`,
      `hitsStumps ${sim.hitsStumps} wide ${this.isWide}  AI d=${(ai.difficulty || 0).toFixed(2)} ${ai.leave ? 'leave' : (ai.shot || '-') + ' err ' + Math.round((ai.err || 0) * 1000) + 'ms'}  fate ${f.kind || '-'} ${f.result || ''}`,
      `pressure ${this._pressure().toFixed(2)}  bowler ${this.bowler.short || this.bowler.id} vs ${this.batterP.short || this.batterP.id}`,
    ];
    const s = Display.safe;
    R.rect(s.left + 20, s.top + 250, 1300, 110, 'rgba(0,0,0,0.6)');
    lines.forEach((l, k) => R.plainText(l, s.left + 34, s.top + 275 + k * 32, 24, '#00ffff'));
  },

  _drawHud(ctx) {
    const s = Display.safe, r = this.rules;
    R.panel(s.left + 22, s.top + 18, 470, 220);
    R.text(T('hud.score'), s.left + 48, s.top + 50, 28, '#b8c6d6', 'left', false);
    R.text(formatNumber(r.score), s.left + 46, s.top + 112, 76, '#ffffff', 'left');
    if (r.rs && r.rs.lives) {
      R.text(T('chal.lives'), s.left + 48, s.top + 172, 26, '#b8c6d6', 'left', false);
      for (let i = 0; i < r.rs.lives; i++) R.circle(s.left + 170 + i * 44, s.top + 172, 16, i < r.livesLeft ? '#ff5a5a' : 'rgba(255,255,255,0.15)', '#ffffff', 3);
    } else R.text(T('hud.ballsLeft', { n: r.ballsLeft }), s.left + 48, s.top + 172, 30, '#ffffff', 'left', false);
    R.text(T('bowl.wicketsN', { n: r.wickets }), s.left + 48, s.top + 208, 30, '#ffd23f', 'left', false);
    // combo badge
    const bx = s.left + 405, by = s.top + 100;
    const hot = r.combo > 0;
    R.circle(bx, by, 64, hot ? '#1f8a4c' : 'rgba(255,255,255,0.12)', hot ? '#ffd23f' : 'rgba(255,255,255,0.3)', 5);
    R.text(T('hud.mult', { n: r.mult }), bx, by + 2, 50, '#ffffff');
    if (r.combo > 0) R.text(T('bowl.comboN', { n: r.combo }), bx, by + 88, 22, '#ffd23f');

    // pressure meter under the panel
    const px = s.left + 22, py = s.top + 252, pw = 470, ph = 30;
    R.roundRect(px, py, pw, ph, 12, 'rgba(0,0,0,0.55)');
    if (r.pressure > 0) R.roundRect(px + 3, py + 3, (pw - 6) * r.pressure, ph - 6, 10,
      r.pressure > 0.75 ? '#ff5a1f' : r.pressure > 0.4 ? '#ffb400' : '#6fd36f');
    R.text(T('bowl.pressure'), px + 14, py + ph / 2 + 1, 20, '#ffffff', 'left', false);
    if (this.isChallenge) {
      R.text(T('chal.playerLine', { name: this.bowler.short || this.bowler.name, d: T('chal.diff.' + this.chal.diff) }), s.left + 30, py + 56, 22, '#d8e4f0', 'left', false);
      if (r.boss) {
        // Boss Batter: his lives across the top.
        const cx = s.right - 290, yy = s.top + 240;
        R.panel(cx - 260, yy, 520, 76);
        R.text(T('chal.bossName', { name: this.batterP.short }), cx, yy + 24, 22, '#ffd23f');
        for (let i = 0; i < r.boss.max; i++) Sprites.ui('marker_wicket', cx - 70 + i * 70, yy + 54, 44, 40, { alpha: i < r.boss.max - r.boss.left ? 1 : 0.25 });
      }
    }

    this._drawPauseButton();
    this._drawBanner(ctx, this.state === 'aim' || this.state === 'charge');
    if (this.state === 'aim' && this.stateT > 0.2 && r.ball === 0) {
      R.text(T('bowl.hint'), CONFIG.LOGICAL_W / 2, Display.safe.top + 200, 34, '#ffffff');
    }
    this._drawTimingLabel(ctx);
  },
});
