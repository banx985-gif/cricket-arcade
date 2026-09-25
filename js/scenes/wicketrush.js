// Cricket Arcade — Wicket Rush Classic scene (M02 bowling slice, plan 6.2 / 17).
// You bowl 18 legal deliveries at an AI batter. Per ball:
//   aim (pick delivery + drag reticle) -> charge (hold BOWL, bowler runs in)
//   -> delivery (AI plays its shot) -> inplay (if hit) -> outcome -> next
// The ball, fielding, cameras and ground are shared with Six Smash
// (game/pitchscene.js), so a ball behaves identically in both modes.

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

  // ---------------------------------------------------------------- setup
  enter() {
    this._initPitch();
    this.seed = RNG.begin(Dev.nextSeed());
    this.rules = new WicketRushRules(WICKET_RUSH_DATA.classic);
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

  exit() { BowlControls.reset(); },

  _layout() {
    this._layoutPause('wicketrush');
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

  _type() { return BOWLING_DATA.deliveries[this.typeIdx]; },

  _startBall() {
    this._setState('aim');
    this._resetBall();
    this.del = null;
    this.release = null;
    this.ai = null;
    this.meter = 0;
    BowlControls.meter = 0;
    BowlControls.meterOn = false;
    BowlControls.enabled = true;
    const r = this.rules;
    const n = r.ball + 1, total = r.rs.balls;
    this.banner = { text: n === total ? T('hud.lastBall') : T('hud.ballNo', { n, total }), color: '#ffffff', t: 0 };
    this.golden = false;
    const G = WICKET_RUSH_DATA.hooks.goldenWicket;
    if (Dev.forceGolden || (G.enabled && r.pressure >= G.pressureNeeded)) {
      this.golden = true; Dev.forceGolden = false;
      this.banner.sub = T('bowl.goldenWicket'); this.banner.icon = 'icon_golden_wicket';
    } else if (r.freeHit) {
      this.banner.sub = T('bowl.freeHit'); this.banner.subColor = '#ff9d2e';
    }
  },

  // ---------------------------------------------------------------- input
  selectType(i) {
    if (this.paused) return;
    if (this.state !== 'aim' && this.state !== 'charge') return;
    if (this.state === 'charge') return;   // no changing mind mid run-up
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

  _updateAim(realDt) {
    const R0 = BOWLING_DATA.reticle;
    const d = BowlControls.takeDrag();
    // dragging UP the screen = further from the batter (shorter length)
    this.aim.x += d.x * R0.dragX;
    this.aim.z -= d.y * R0.dragZ;
    if (Keys.any(['KeyA', 'ArrowLeft'])) this.aim.x -= R0.keySpeedX * realDt;
    if (Keys.any(['KeyD', 'ArrowRight'])) this.aim.x += R0.keySpeedX * realDt;
    if (Keys.any(['KeyW', 'ArrowUp'])) this.aim.z += R0.keySpeedZ * realDt;
    if (Keys.any(['KeyS', 'ArrowDown'])) this.aim.z -= R0.keySpeedZ * realDt;
    this.aim.x = Math.max(R0.minX, Math.min(R0.maxX, this.aim.x));
    this.aim.z = Math.max(R0.minZ, Math.min(R0.maxZ, this.aim.z));
  },

  // ---------------------------------------------------------------- release
  _release() {
    const C = BOWLING_DATA.charge, t = this._type();
    const m = this.meter;
    const noBall = m > C.noBallAbove;
    const grade = (m >= C.perfect[0] && m <= C.perfect[1]) ? 'perfect'
      : (m >= C.good[0] && m <= C.good[1]) ? 'good' : 'loose';
    const power = Math.max(0, Math.min(1, (Math.min(m, 1) - C.minPower) / (1 - C.minPower)));
    const speed = (C.speed[0] + (C.speed[1] - C.speed[0]) * power) * t.speed;

    // Accuracy: the release grade decides how far the ball strays from the aim.
    const acc = RNG.stream('bowlAcc');
    const sc = C.scatter[grade];
    const target = this._snapped();
    const bounceX = target.x + acc.range(-1, 1) * sc;
    const bounceZ = Math.max(0.3, target.z + acc.range(-1, 1) * sc * 2.5);
    const movement = acc.range(-1, 1) * t.seam;

    this.del = Delivery.build({
      index: this.rules.ball, speed, releaseX: C.releaseX, bounceX, bounceZ, movement, restitution: t.bounce,
    });
    this.del.golden = this.golden;
    this.release = { grade, noBall, type: t.id, meter: m };
    BowlControls.meterOn = false;
    BowlControls.enabled = false;
    this._setState('delivery');
    this.dT = 0;
    Sound.play('release');
    this._showTiming(grade === 'loose' ? 'loose' : grade);
    if (noBall) Effects.text(T('bowl.overstep'), CONFIG.LOGICAL_W / 2, 300, '#ff6b6b', 60);

    this._planBatter();
  },

  // Decide what the AI batter does with this ball and schedule its swing.
  _planBatter() {
    const sim = this.del.sim, PI = BATTING_DATA.pitch, W = BOWLING_DATA.wide, LP = BOWLING_DATA.lbwPads;
    const tIdeal = sim.contactIdx * CONFIG.PHYSICS_STEP;
    const at = sim.path.at(tIdeal, {});
    this.isWide = at.x > W.offX || at.x < W.legX;
    // Would it hit the pads first (LBW) rather than the stumps (bowled)?
    this.padHit = sim.hitsStumps && at.x >= LP.minX && at.x <= LP.maxX && at.y <= LP.maxY;

    const ai = this.isWide ? { leave: true, difficulty: 0 }
      : AIBatter.decide(this.del, {
        releaseGrade: this.release.grade, pressure: this.rules.pressure,
        freeHit: this.rules.freeHit || this.release.noBall,
        timingBias: this._type().batterTimingBias,
      }, RNG.stream('ai'));
    this.ai = ai;

    if (ai.leave) { this.shot = { leave: true, id: 'leave', contactT: null }; return; }
    const pressT = tIdeal + ai.err;
    let grade = Contact.grade(ai.shot, ai.err);
    const shot = { id: ai.shot, pressT, err: ai.err, grade, swingStart: pressT, contactT: null, done: false };
    if (grade !== 'miss' && !Contact.inReach(at)) grade = shot.grade = 'miss';
    if (grade !== 'miss') {
      shot.contactT = Math.max(pressT, tIdeal);
      shot.swingStart = Math.max(0, shot.contactT - this._swingTime(ai.shot) * 0.5);
    }
    this.shot = shot;
    Log.add('ai', `#${this.rules.ball + 1} ${this.del.lengthId} ${this.release.grade} d=${ai.difficulty.toFixed(2)} ${ai.shot} ${grade} err=${Math.round(ai.err * 1000)}ms`);
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
    const sim = this.del.sim, step = CONFIG.PHYSICS_STEP;
    const sh = this.shot;
    if (sh && sh.contactT !== null && !sh.done && this.dT >= sh.contactT) {
      sh.done = true;
      const hit = this._connect(sh.aim || this.ai.aim, RNG.stream('batting'), RNG.stream('fielding'));
      Log.add('ball', `#${this.rules.ball + 1} AI ${sh.id} ${sh.grade} -> ${hit.plan.result}`);
      return;
    }
    if (sh && !sh.leave && sh.contactT === null && !sh.swishPlayed && this.dT >= sh.swingStart) {
      sh.swishPlayed = true;
      Sound.play('swish');
    }
    const contactComing = sh && sh.contactT !== null;
    if (sim.hitsStumps && !contactComing && this.ballStopT === null) {
      const tPad = sim.contactIdx * step, tStumps = sim.stumpsIdx * step;
      if (this.padHit && this.dT >= tPad) {
        this.ballStopT = tPad;
        Sound.play('batDefend');
        this._endBall('lbw');
        return;
      }
      if (!this.padHit && this.dT >= tStumps) {
        this.ballStopT = tStumps;
        this.stumpsBroken = true;
        this._endBall('bowled');
        return;
      }
    }
    if (this.dT >= sim.path.duration()) {
      if (this.isWide) this._endBall('wide');
      else this._endBall(sh && sh.leave ? 'leave' : 'miss');
    }
  },

  _endBall(key, runs) {
    const F = BOWLING_DATA.feel;
    const r = this.rules;
    const res = r.apply(key, {
      runs: runs || 0, noBall: this.release.noBall, golden: this.del.golden,
      perfectRelease: this.release.grade === 'perfect',
    });
    const wicket = WicketRushRules.isWicket(key) && !res.notOut;
    const look = this._outcomeLook(res.notOut ? 'notout' : key, runs);
    if (res.notOut) look.text = T(this.release.noBall ? 'outcome.notOutNoBall' : 'outcome.notOut');
    this.outcome = Object.assign(look, {
      key, res, t: 0,
      hold: F.outcomeHold + (wicket ? F.wicketHoldExtra : 0),
      showText: wicket || res.notOut,          // six/four/wide markers already say it
      umpire: wicket && key !== 'bowled',
    });
    this._setState('outcome');

    const cx = CONFIG.LOGICAL_W / 2;
    if (res.points > 0) Effects.text(T('outcome.points', { n: formatNumber(res.points) }), cx, 640, '#9cff6a', 72, { life: 1.3 });
    if (res.penalty > 0) Effects.text(T('bowl.extraPenalty', { n: formatNumber(res.penalty) }), cx, 720, '#ff6b6b', 56, { life: 1.4 });
    if (res.comboUp) Effects.text(T('outcome.comboUp', { n: res.mult }), cx, 720, '#ff9d2e', 64, { life: 1.4 });
    else if (res.comboDown) Effects.text(T('bowl.comboDown'), cx, 780, '#ff9d9d', 44, { life: 1.2 });
    if (this.release.noBall) Effects.text(T('outcome.noball'), cx, 250, '#ffb36b', 70, { life: 1.4 });
    if (res.freeHitNext) Effects.text(T('bowl.freeHitNext'), cx, 860, '#ff9d2e', 44, { life: 1.6 });

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
    const prev = Save.best(r.rs.id);
    const isBest = Save.submit(r.rs.id, r.score, { wickets: r.wickets, combo: r.bestCombo });
    Scenes.go('result', {
      mode: 'wicketrush', titleKey: 'result.titleWicket',
      score: r.score, seed: this.seed, isBest, prevBest: prev ? prev.score : 0,
      stats: [
        ['result.wickets', r.wickets], ['result.dots', r.dots],
        ['result.runsConceded', r.runs], ['result.bestCombo', r.bestCombo],
      ],
    });
  },

  // ---------------------------------------------------------------- bowler animation
  _bowlerPhase() {
    if (this.state === 'aim') return { runT: 0, after: -1 };
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
    Effects.drawParticles(ctx);
    if (Dev.hitzone && this.del) this._drawDebug(ctx);
    Effects.drawFlash(ctx);
    this._drawHud(ctx);
    BowlControls.draw(ctx);
    this._drawOutcome(ctx);
    Effects.drawTexts(ctx);
    if (this.paused) this._drawPause(ctx);
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
    const d = this.del, ai = this.ai || {};
    const lines = [
      `seed ${this.seed}  ball ${this.rules.ball + 1}  ${d.lengthId}  ${d.kmh}km/h  line ${d.line.toFixed(2)}  release ${this.release.grade} (${this.release.meter.toFixed(2)})`,
      `hitsStumps ${sim.hitsStumps} pads ${this.padHit} wide ${this.isWide}  AI d=${(ai.difficulty || 0).toFixed(2)} ${ai.leave ? 'leave' : ai.shot + ' err ' + Math.round((ai.err || 0) * 1000) + 'ms'}`,
      `pressure ${this.rules.pressure.toFixed(2)}  combo ${this.rules.combo}`,
    ];
    const s = Display.safe;
    R.rect(s.left + 20, s.top + 250, 1100, 110, 'rgba(0,0,0,0.6)');
    lines.forEach((l, k) => R.plainText(l, s.left + 34, s.top + 275 + k * 32, 24, '#00ffff'));
  },

  _drawHud(ctx) {
    const s = Display.safe, r = this.rules;
    R.panel(s.left + 22, s.top + 18, 470, 220);
    R.text(T('hud.score'), s.left + 48, s.top + 50, 28, '#b8c6d6', 'left', false);
    R.text(formatNumber(r.score), s.left + 46, s.top + 112, 76, '#ffffff', 'left');
    R.text(T('hud.ballsLeft', { n: r.ballsLeft }), s.left + 48, s.top + 172, 30, '#ffffff', 'left', false);
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

    this._drawPauseButton();
    this._drawBanner(ctx, this.state === 'aim' || this.state === 'charge');
    if (this.state === 'aim' && this.stateT > 0.2 && r.ball === 0) {
      R.text(T('bowl.hint'), CONFIG.LOGICAL_W / 2, Display.safe.top + 200, 34, '#ffffff');
    }
    this._drawTimingLabel(ctx);
  },
});
