// Cricket Arcade — Six Smash Classic scene (M01 batting slice).
// One innings of 20 balls. Per ball:
//   ready -> runup -> delivery -> (contact -> inplay) -> outcome -> next
// Deliveries come pre-made from the innings seed; the ball's path is played
// back from a fixed-step simulation (see ballpath.js). Ground, camera and
// ball-in-play behaviour are shared with Wicket Rush (game/pitchscene.js).

const SixSmashScene = Object.assign({}, PitchScene, {
  rules: null,
  deliveries: [],
  seed: 0,
  state: 'ready',
  stateT: 0,
  banner: null,
  timingLabel: null,

  // ---------------------------------------------------------------- setup
  enter() {
    this._initPitch();
    this.seed = RNG.begin(Dev.nextSeed());
    this.rules = new SixSmashRules(SIX_SMASH_DATA.classic);
    this.deliveries = Delivery.innings(this.rules.rs.balls);
    Log.add('innings', 'deliveries ' + Delivery.fingerprint(this.deliveries).slice(0, 80) + '…');
    Effects.init();
    BatControls.init((k) => this.onShot(k));
    BatControls.reset();
    BatControls.enabled = false;
    this._layout();
    this._startBall();
  },

  exit() { BatControls.reset(); },

  _layout() {
    this._layoutPause('sixsmash');
    BatControls.layout();
  },

  setPaused(p) {
    this.paused = p;
    if (p) BatControls.reset();
  },

  _startBall() {
    this.del = this.deliveries[this.rules.ball];
    if (Dev.forceGolden) { this.del.golden = true; Dev.forceGolden = false; }
    this._setState('ready');
    this._resetBall();
    const n = this.rules.ball + 1, total = this.rules.rs.balls;
    this.banner = { text: n === total ? T('hud.lastBall') : T('hud.ballNo', { n, total }), color: '#ffffff', t: 0 };
    if (this.del.golden) { this.banner.sub = T('hud.golden'); this.banner.icon = 'icon_golden_ball'; }
  },

  // ---------------------------------------------------------------- input
  onShot(shotId) {
    if (this.paused) return;
    // A tap during the result skips ahead to the next ball.
    if (this.state === 'outcome' && this.stateT > 0.35) { this.stateT = this.outcome.hold; return; }
    if (this.state !== 'delivery' || this.shot) return;
    const tIdeal = this.del.sim.contactIdx * CONFIG.PHYSICS_STEP;
    const err = this.dT - tIdeal;
    const grade = Contact.grade(shotId, err);
    const ballAtContact = this.del.sim.path.at(tIdeal, {});
    const shot = { id: shotId, pressT: this.dT, err, grade, swingStart: this.dT, contactT: null, done: false };
    this.shot = shot;
    BatControls.enabled = false;

    if (grade === 'miss') {
      shot.missReason = err < 0 ? 'tooEarly' : 'tooLate';
      Sound.play('swish');
    } else if (!Contact.inReach(ballAtContact)) {
      shot.grade = 'miss';
      shot.missReason = 'outOfReach';
      Sound.play('swish');
    } else {
      // Early presses wait for the ball; late ones connect straight away.
      shot.contactT = Math.max(this.dT, tIdeal);
      shot.swingStart = Math.max(this.dT, shot.contactT - this._swingTime(shotId) * 0.5);
    }
    if (shot.grade === 'miss') this._showTiming('miss', shot.missReason);
  },

  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    Fullscreen.request();
    if (this._pauseDown(id, x, y)) return;
    BatControls.down(id, x, y);
  },
  pointerMove(id, x, y) {
    if (Dev.pointerMove(id, x, y)) return;
    if (this._pauseMove(id, x, y)) return;
    BatControls.move(id, x, y);
  },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this._pauseUp(id)) return;
    BatControls.up(id);
  },
  keyDown(code) {
    if (code === 'Escape' || code === 'KeyP') { this.setPaused(!this.paused); return; }
    if (!this.paused) BatControls.keyShot(code);
  },

  // ---------------------------------------------------------------- update
  update(dt, realDt) {
    BatControls.update(realDt);
    if (this.paused || Dev.open || Display.isPortrait) return;
    Effects.update(dt);
    Stadium.update(dt);
    this.stateT += dt;
    if (this.banner) this.banner.t += dt;
    if (this.timingLabel) this.timingLabel.t += dt;

    const D = BATTING_DATA.delivery;
    switch (this.state) {
      case 'ready':
        if (this.stateT >= D.betweenBalls) this._setState('runup');
        break;
      case 'runup':
        if (this.stateT >= D.runUpTime) {
          this._setState('delivery');
          BatControls.enabled = true;
          Sound.play('release');
        }
        break;
      case 'delivery':
        this.dT += dt;
        this._updateDelivery();
        break;
      case 'inplay': {
        this.hit.t += dt;
        const key = this._stepInPlay();
        if (key) this._endBall(key, this.hit.plan.runs);
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
    const step = CONFIG.PHYSICS_STEP;
    const tIdeal = sim.contactIdx * step;
    const sh = this.shot;

    // Scheduled contact reached?
    if (sh && sh.contactT !== null && !sh.done && this.dT >= sh.contactT) {
      sh.done = true;
      const hit = this._connect(BatControls.aim(), RNG.stream('batting'), RNG.stream('fielding'));
      this._showTiming(sh.grade);
      Log.add('ball', `#${this.rules.ball + 1} ${sh.id} ${sh.grade} err=${Math.round(sh.err * 1000)}ms -> ${hit.plan.result}`);
      return;
    }

    // Bowled: the ball reached the stumps and no contact is coming.
    const tStumps = sim.stumpsIdx * step;
    const contactComing = sh && sh.contactT !== null;
    if (sim.hitsStumps && !contactComing && this.dT >= tStumps && this.ballStopT === null) {
      this.ballStopT = tStumps;
      this.stumpsBroken = true;
      if (!sh) this._showTiming('miss', 'noShot');
      BatControls.enabled = false;
      this._endBall('bowled');
      return;
    }

    // Late window closed with no shot: too late to play now.
    if (!sh && this.dT > tIdeal + Contact.lateLimit('power') + 0.02) BatControls.enabled = false;

    // Ball reached the keeper.
    if (this.dT >= sim.path.duration()) {
      if (!sh) this._showTiming('miss', 'noShot');
      this._endBall('miss');
    }
  },

  // Score the ball and start the outcome hold.
  _endBall(key, runs) {
    const F = BATTING_DATA.feel;
    const perfect = !!(this.hit && this.hit.perfect);
    const res = this.rules.apply(key, { runs: runs || 0, perfect, golden: this.del.golden });
    const look = this._outcomeLook(key, runs);
    this.outcome = Object.assign(look, {
      key, res, t: 0,
      hold: F.outcomeHold + (key === 'six' ? F.sixHoldExtra : 0),
      showText: key === 'caught' || key === 'bowled',
      umpire: key === 'caught',
    });
    this._setState('outcome');
    BatControls.enabled = false;

    const cx = CONFIG.LOGICAL_W / 2;
    if (res.points > 0) Effects.text(T('outcome.points', { n: formatNumber(res.points) }), cx, 640, '#9cff6a', 72, { life: 1.3 });
    if (res.penalty > 0) Effects.text(T('outcome.penalty', { n: formatNumber(res.penalty) }), cx, 640, '#ff6b6b', 64, { life: 1.3 });
    if (res.comboUp) Effects.text(T('outcome.comboUp', { n: res.mult }), cx, 720, '#ff9d2e', 64, { life: 1.4 });
    if (res.streakLost) Effects.text(T('outcome.streakLost'), cx, 720, '#ff9d9d', 48, { life: 1.2 });

    this._outcomeFeel(key);
    if (key === 'six') {
      if (res.comboUp) Sound.play('combo');
      const v = Display.viewRect();
      for (let i = 0; i < 5; i++) Effects.sparks(v.x + v.w * (0.15 + i * 0.175), v.y + 140, 12,
        ['#ffd23f', '#ff5a5a', '#5fd4ff', '#9cff6a', '#ffffff'][i], 700);
    } else if (key === 'caught' || key === 'bowled') {
      // The batter is you: the crowd groans and the screen flashes red.
      Sound.play('crowdGroan');
      Effects.flash(0.3, '#ff3b3b');
    }
    Log.add('score', `ball ${this.rules.ball}: ${key} +${res.points} -${res.penalty} = ${this.rules.score}`);
  },

  _finish() {
    const r = this.rules;
    const prev = Save.best(r.rs.id);
    const isBest = Save.submit(r.rs.id, r.score, { streak: r.bestStreak, sixes: r.sixes });
    Scenes.go('result', {
      mode: 'sixsmash', titleKey: 'result.titleSix',
      score: r.score, seed: this.seed, isBest, prevBest: prev ? prev.score : 0,
      stats: [
        ['result.sixes', r.sixes], ['result.fours', r.fours],
        ['result.bestStreak', r.bestStreak], ['result.wickets', r.wickets],
      ],
    });
  },

  // ---------------------------------------------------------------- render
  render(ctx) {
    View3D.set(this.cam.pos, this.cam.tgt, this.cam.focal);
    Stadium.drawBackground(ctx);
    Stadium.drawField(ctx);
    this._drawWorld(ctx);
    Effects.drawParticles(ctx);
    this._drawTimingRing(ctx);
    if (Dev.hitzone) this._drawDebug(ctx);
    Effects.drawFlash(ctx);
    this._drawHud(ctx);
    BatControls.draw(ctx);
    this._drawOutcome(ctx);
    Effects.drawTexts(ctx);
    if (this.paused) this._drawPause(ctx);
  },

  // Code-drawn timing circle around the contact point: it closes in as the
  // ball arrives and turns gold in the PERFECT window.
  _drawTimingRing(ctx) {
    if (!BATTING_DATA.feel.showTimingRing || this.state !== 'delivery' || this.shot) return;
    const sim = this.del.sim;
    const tIdeal = sim.contactIdx * CONFIG.PHYSICS_STEP;
    const left = tIdeal - this.dT;
    if (left < -0.1 || left > 0.75) return;
    const i = sim.contactIdx;
    const p = View3D.project(sim.path.x[i], sim.path.y[i], sim.path.z[i]);
    if (!p) return;
    const w = BATTING_DATA.shots.power.window;
    const r = 26 + Math.max(0, left) * 260;
    const perfect = Math.abs(left) <= w.perfect;
    const good = Math.abs(left) <= w.good;
    const col = perfect ? '#ffd23f' : good ? '#9cff6a' : 'rgba(255,255,255,0.85)';
    const a = Math.min(1, (0.75 - left) / 0.25);
    ctx.globalAlpha = Math.max(0, a);
    R.circle(p.x, p.y, r, null, CONFIG.COLOR.ink, 9);
    R.circle(p.x, p.y, r, null, col, 5);
    R.circle(p.x, p.y, 22, null, 'rgba(255,255,255,0.5)', 3);
    ctx.globalAlpha = 1;
  },

  _drawDebug(ctx) {
    const PI = BATTING_DATA.pitch;
    const z = PI.contactZ;
    const x0 = PI.reachCentreX - PI.reachHalfWidth, x1 = PI.reachCentreX + PI.reachHalfWidth;
    R.poly(View3D.projectPoly([
      { x: x0, y: 0, z }, { x: x1, y: 0, z }, { x: x1, y: PI.reachMaxHeight, z }, { x: x0, y: PI.reachMaxHeight, z },
    ]), 'rgba(0,255,255,0.12)', '#00ffff', 2);
    const sim = this.del.sim;
    const i = sim.contactIdx;
    const p = View3D.project(sim.path.x[i], sim.path.y[i], sim.path.z[i]);
    if (p) R.circle(p.x, p.y, 10, '#ff00ff');
    ctx.globalAlpha = 0.5;
    let prev = null;
    for (let k = 0; k < sim.path.n; k += 4) {
      const q = View3D.project(sim.path.x[k], sim.path.y[k], sim.path.z[k]);
      if (q && prev) R.line(prev.x, prev.y, q.x, q.y, '#ff00ff', 2);
      prev = q;
    }
    ctx.globalAlpha = 1;
    const d = this.del;
    const lines = [
      `seed ${this.seed}  ball ${this.rules.ball + 1}  ${d.lengthId}  ${d.kmh}km/h  line ${d.line.toFixed(2)}  move ${d.movement.toFixed(2)}`,
      `ideal t ${(i * CONFIG.PHYSICS_STEP).toFixed(3)}s  hitsStumps ${sim.hitsStumps}` +
        (this.shot ? `  press err ${Math.round(this.shot.err * 1000)}ms  ${this.shot.grade}` : ''),
      this.hit ? `hit ${this.hit.c.kind} dir ${this.hit.c.dirDeg.toFixed(0)}° loft ${this.hit.c.loftDeg.toFixed(0)}° ${this.hit.c.speed.toFixed(1)}m/s -> ${this.hit.plan.result}` : '',
    ];
    const s = Display.safe;
    R.rect(s.left + 20, s.top + 250, 1000, 110, 'rgba(0,0,0,0.6)');
    lines.forEach((l, k) => R.plainText(l, s.left + 34, s.top + 275 + k * 32, 24, '#00ffff'));
  },

  _drawHud(ctx) {
    const s = Display.safe, r = this.rules;
    // ---- top-left: score, balls, multiplier ----
    R.panel(s.left + 22, s.top + 18, 470, 200);
    R.text(T('hud.score'), s.left + 48, s.top + 50, 28, '#b8c6d6', 'left', false);
    R.text(formatNumber(r.score), s.left + 46, s.top + 112, 76, '#ffffff', 'left');
    R.text(T('hud.balls'), s.left + 48, s.top + 180, 26, '#b8c6d6', 'left', false);
    R.text(T('hud.ballsLeft', { n: r.ballsLeft }), s.left + 150, s.top + 181, 32, '#ffffff', 'left', false);
    const bx = s.left + 405, by = s.top + 100;
    const hot = r.streak > 0;
    R.circle(bx, by, 64, hot ? '#ff7a1a' : 'rgba(255,255,255,0.12)', hot ? '#ffd23f' : 'rgba(255,255,255,0.3)', 5);
    R.text(T('hud.mult', { n: r.mult }), bx, by + 2, 50, '#ffffff');
    if (r.streak > 0) R.text(T('hud.streak', { n: r.streak }), bx, by + 88, 22, '#ffd23f');

    this._drawPauseButton();
    this._drawBanner(ctx, this.state === 'ready' || this.state === 'runup');
    this._drawTimingLabel(ctx);
  },
});
