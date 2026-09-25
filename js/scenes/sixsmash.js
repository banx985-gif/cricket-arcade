// Cricket Arcade — Six Smash (plan 16): every ruleset, with the picked player.
// Per ball:
//   ready -> runup -> delivery -> (contact -> inplay) -> outcome -> next
// The computer bowls real deliveries (Bowling.release) from a rotating attack
// (Boss Bowler: the boss). Your player's stats, techniques and frozen Legacy
// loadout shape every ball through the same duel as a match (game/duel.js).
// Stadium targets, the Golden Ball and Fever sit on top (SixSmashRules).
// Ground, camera and ball-in-play behaviour are shared with Wicket Rush
// (game/pitchscene.js). The Quick Match batting scene (matchbat.js) is built
// from this one.

const SixSmashScene = Object.assign({}, PitchScene, {
  isChallenge: false,     // true only on this scene (the match scenes built from it stay false)
  rules: null,
  seed: 0,
  state: 'ready',
  stateT: 0,
  banner: null,
  timingLabel: null,
  chal: null,             // Challenge.current
  target: null,           // this ball's stadium target { angle }

  // ---------------------------------------------------------------- setup
  enter(params) {
    this.isChallenge = true;
    Tech.end();
    this._initPitch();
    this.chal = Challenge.begin('six', params && params.rs ? params : null);
    this.seed = RNG.begin(Dev.nextSeed());
    this.rules = new SixSmashRules(this.chal.rs);
    this.inn = this.rules;                  // the techniques read the innings from here
    this.batterP = this.chal.player;
    if (this.chal.pc) Tech.beginMany([{ pid: this.batterP.id, c: this.chal.pc }]);
    this._bowlRng = RNG.stream('aiBowl:six');
    this._goldRng = RNG.stream('golden');
    this._targetRng = RNG.stream('targets');
    Fielding.clear();
    Stadium.setConditions(null);
    Effects.init();
    BatControls.init((k) => this.onShot(k));
    BatControls.reset();
    BatControls.enabled = false;
    this._layout();
    Log.add('challenge', `six ${this.rules.rs.id} ${this.chal.diff} player ${this.batterP.name}`);
    this._startBall();
  },

  exit() { BatControls.reset(); Tech.end(); TechUI.btns = []; },

  _layout() {
    this._layoutPause('sixsmash', this.isChallenge ? { rs: this.chal.rs, diff: this.chal.diff, pick: this.chal.pick } : null, 'challenges');
    BatControls.layout();
  },

  setPaused(p) {
    this.paused = p;
    if (p) BatControls.reset();
  },

  _startBall() {
    const r = this.rules, S = CHALLENGE_DATA.six, rs = r.rs;
    this._setState('ready');
    this._resetBall();
    // Last balls: a big enough score turns on Fever to the end.
    if (r.startBall()) this._feverFx(true);
    // The bowler and a real delivery (never a wide: every ball is hittable).
    this.bowlerP = Challenge.sixBowler(r, this.chal.diff);
    const rng = this._bowlRng;
    for (let tries = 0; tries < 4; tries++) {
      const ch = Bowling.aiChoose(this.bowlerP, { phase: rs.boss ? 'death' : 'middle', fatigue: 0 }, rng);
      this.del = Bowling.release({ bowler: this.bowlerP, family: this.bowlerP.family, typeIdx: ch.typeIdx, target: ch.target,
        grade: ch.grade, power: ch.power, fatigue: 0, cond: null, index: r.ball }, rng);
      if (!BallPlay.isWide(this.del)) break;
    }
    const golden = Dev.forceGolden || (rs.golden && this._goldRng.chance(S.golden.chance));
    Dev.forceGolden = false;
    this.del.golden = !!golden;
    // Stadium target for this ball?
    const T0 = rs.targets;
    this.target = T0 && ((r.ball + 1) % T0.every === 0) ? { angle: this._targetRng.pick(S.targets.spots) } : null;
    // Your stats (and techniques) against this bowler.
    this.batP = Tech.batStats(this.batterP, r);
    this._duelPlayers = { bat: this.batP, bowl: this.bowlerP };
    this._baseWindow = Duel.windowScale(this.batP, this.bowlerP, { pressure: 0, fatigue: 0, kind: this.del.kind }) * Challenge.diff(this.chal.diff).window;
    this._techBall();

    const n = r.ball + 1, total = rs.balls;
    const text = rs.lives ? T('chal.ballN', { n }) : n === total ? T('hud.lastBall') : T('hud.ballNo', { n, total });
    this.banner = { text, color: '#ffffff', t: 0 };
    if (this.del.golden) { this.banner.sub = T('hud.golden'); this.banner.icon = 'icon_golden_ball'; }
    else if (this.target) { this.banner.sub = T('chal.targetUp'); this.banner.subColor = '#5fd4ff'; }
  },

  _techBall() {
    const tw = Tech.batWindows(this);
    this.windowScale = this._baseWindow * tw.k;
    this.techExtra = tw.extra;
    TechUI.layout('bat', this.rules, () => this.state === 'ready' || this.state === 'runup');
  },
  _techMods(m, sh, aim) { return Tech.contactMods(m, sh, aim, this); },
  _techContact(c, sh) { Tech.afterContact(c, sh, this); },

  // ---------------------------------------------------------------- input
  onShot(shotId) {
    if (this.paused) return;
    // A tap during the result skips ahead to the next ball.
    if (this.state === 'outcome' && this.stateT > 0.35) { this.stateT = this.outcome.hold; return; }
    if (this.state !== 'delivery' || this.shot) return;
    const tIdeal = this.del.sim.contactIdx * CONFIG.PHYSICS_STEP;
    const err = this.dT - tIdeal;
    let grade = Contact.grade(shotId, err, this.windowScale, this.techExtra);
    const ballAtContact = this.del.sim.path.at(tIdeal, {});
    const shot = { id: shotId, pressT: this.dT, err, grade, swingStart: this.dT, contactT: null, done: false };
    this.shot = shot;
    BatControls.enabled = false;
    if (grade !== 'miss' && !Contact.inReach(ballAtContact)) { grade = shot.grade = 'miss'; shot.missReason = 'outOfReach'; }
    else if (grade === 'miss') shot.missReason = err < 0 ? 'tooEarly' : 'tooLate';

    const f = BallPlay.fate({ del: this.del, shotId, grade, bat: this.batP, bowl: this.bowlerP, releaseGrade: this.del.releaseGrade }, RNG.stream('duel'));
    this.fate = f;
    if (f.kind === 'contact') {
      // Early presses wait for the ball; late ones connect straight away.
      shot.contactT = Math.max(this.dT, tIdeal);
      shot.swingStart = Math.max(this.dT, shot.contactT - this._swingTime(shotId) * 0.5);
    } else {
      Sound.play('swish');
      if (f.kind === 'hitwicket') f.at = this.dT + this._swingTime(shotId) * 0.6;
      if (f.kind === 'beaten') this._showTiming('beaten', grade === 'good' ? null : grade === 'early' ? 'tooEarly' : 'tooLate');
      else this._showTiming('miss', shot.missReason);
    }
  },

  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    Fullscreen.request();
    if (this._pauseDown(id, x, y)) return;
    if (TechUI.down(id, x, y, () => this._techBall())) return;
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
    Tech.update(realDt);
    this.stateT += dt;
    if (this.banner) this.banner.t += dt;
    if (this.timingLabel) this.timingLabel.t += dt;
    Moments.update(this, dt);

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
          Sound.play(this.del.kind === 'spin' ? 'sfx_delivery_spin' : 'sfx_delivery_fast');
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
    const sim = this.del.sim, step = CONFIG.PHYSICS_STEP;
    const tIdeal = sim.contactIdx * step;
    const sh = this.shot;

    // Scheduled contact reached?
    if (sh && sh.contactT !== null && !sh.done && this.dT >= sh.contactT) {
      sh.done = true;
      const hit = this._connect(BatControls.aim(), RNG.stream('batting'), RNG.stream('fielding'));
      this._showTiming(sh.grade);
      Log.add('ball', `#${this.rules.ball + 1} ${this.del.family}/${this.del.type} ${sh.id} ${sh.grade} err=${Math.round(sh.err * 1000)}ms -> ${hit.plan.result}`);
      return;
    }
    // No shot and the late window has closed: the ball goes on (pad, stumps or keeper).
    const late = tIdeal + Contact.lateLimit('power', this.windowScale, this.techExtra) + 0.02;
    if (!sh && this.dT > late) {
      BatControls.enabled = false;
      if (!this.fate) {
        this.fate = BallPlay.fate({ del: this.del, left: true, bat: this.batP, bowl: this.bowlerP }, RNG.stream('duel'));
        if (this.fate.result) this._showTiming('miss', 'noShot');
      }
    }
    if (this._stepFate()) return;
    if (this.dT >= sim.path.duration()) {
      if (!sh && !(this.fate && this.fate.result)) this._showTiming('miss', 'noShot');
      this._endBall('miss');
    }
  },

  // Did this six land in the target zone? (the angle it crossed the rope)
  _inTarget(cp) {
    if (!this.target || !cp) return false;
    const a = Math.atan2(cp.x, cp.z - BATTING_DATA.field.boundaryCentreZ) * 180 / Math.PI;
    return Math.abs(a - this.target.angle) <= CHALLENGE_DATA.six.targets.halfWidth;
  },

  // Score the ball and start the outcome hold.
  _endBall(key, runs) {
    const F = BATTING_DATA.feel;
    const perfect = !!(this.hit && this.hit.perfect);
    const target = key === 'six' && this._inTarget(this.hit && this.hit.plan.crossPoint);
    const ruleKey = key === 'padLeg' ? 'dot' : key;
    const res = this.rules.apply(ruleKey, { runs: runs || 0, perfect, golden: this.del.golden, target });
    const wicket = SixSmashRules.isWicket(key);
    if (Tech.mine(this.batterP)) Tech.batBallEnd(key, true, wicket ? key : null);
    TechUI.btns = [];
    const look = this._outcomeLook(key, runs);
    this.outcome = Object.assign(look, {
      key, res, t: 0,
      hold: F.outcomeHold + (key === 'six' ? F.sixHoldExtra : 0) + (res.bossBeaten || res.feverStart ? 0.5 : 0),
      showText: wicket || key === 'padLeg',
      umpire: key === 'caught' || key === 'lbw',
      fingerUp: key === 'lbw',
    });
    this._setState('outcome');
    BatControls.enabled = false;

    const cx = CONFIG.LOGICAL_W / 2;
    if (res.points > 0) Effects.text(T('outcome.points', { n: formatNumber(res.points) }), cx, 640, res.fever ? '#ffb13b' : '#9cff6a', 72, { life: 1.3 });
    if (res.penalty > 0) Effects.text(T('outcome.penalty', { n: formatNumber(res.penalty) }), cx, 640, '#ff6b6b', 64, { life: 1.3 });
    if (res.comboUp) Effects.text(T('outcome.comboUp', { n: res.mult }), cx, 720, '#ff9d2e', 64, { life: 1.4 });
    if (res.streakLost) Effects.text(T('outcome.streakLost'), cx, 720, '#ff9d9d', 48, { life: 1.2 });
    if (res.target) { Effects.text(T('chal.targetHit'), cx, 560, '#5fd4ff', 70, { life: 1.5 }); Sound.play('combo'); }
    if (res.lifeLost) Effects.text(T('chal.lifeLost', { n: this.rules.livesLeft }), cx, 800, '#ff6b6b', 54, { life: 1.5 });
    if (res.bossBeaten) { Effects.text(T('chal.bossBeaten'), cx, 300, '#ffd23f', 84, { life: 2.2 }); Sound.play('fanfare'); }
    if (res.feverStart) this._feverFx(false);
    if (res.golden && key === 'six') { const v = Display.viewRect(); for (let i = 0; i < 6; i++) Effects.sparks(v.x + v.w * (0.1 + i * 0.16), v.y + 180, 16, '#ffd23f', 900); }

    this._outcomeFeel(key);
    if (key === 'six') {
      if (res.comboUp) Sound.play('combo');
      const v = Display.viewRect();
      for (let i = 0; i < 5; i++) Effects.sparks(v.x + v.w * (0.15 + i * 0.175), v.y + 140, 12,
        ['#ffd23f', '#ff5a5a', '#5fd4ff', '#9cff6a', '#ffffff'][i], 700);
    } else if (wicket) {
      // The batter is you: the crowd groans and the screen flashes red.
      Sound.play('crowdGroan');
      Effects.flash(0.3, '#ff3b3b');
    }
    Log.add('score', `ball ${this.rules.ball}: ${key} +${res.points} -${res.penalty} = ${this.rules.score}${res.target ? ' TARGET' : ''}${res.fever ? ' FEVER' : ''}`);
  },

  // Fever starts: a bright but steady (not flashing) glow and the crowd.
  _feverFx(final) {
    const cx = CONFIG.LOGICAL_W / 2;
    Effects.text(T(final ? 'chal.feverFinal' : 'chal.fever'), cx, 330, '#ffb13b', 90, { life: 1.8 });
    Sound.play('crowdRoar'); Sound.play('combo');
    Stadium.cheer(1);
  },

  _finish() {
    const r = this.rules;
    const sum = Challenge.finish(Save.data, {
      rs: r.rs.id, raw: r.score, diff: this.chal.diff, player: this.batterP, pick: this.chal.pick,
      stats: { streak: r.bestStreak, sixes: r.sixes, targets: r.targetsHit, perfects: r.perfects }, fever: r.fever.triggers, goldenSixes: r.goldenSixes,
    });
    Scenes.go('result', Object.assign(sum, {
      mode: 'sixsmash', game: 'six', rs: r.rs.id, titleKey: 'chal.rs.' + r.rs.id, seed: this.seed,
      again: { rs: this.chal.rs, diff: this.chal.diff, pick: this.chal.pick },
      stats: [
        ['result.sixes', r.sixes], ['result.bestStreak', r.bestStreak],
        r.rs.targets ? ['chal.stat.targets', r.targetsHit] : r.rs.perfectOnly ? ['chal.stat.perfects', r.perfects] : ['result.fours', r.fours],
        r.rs.boss ? ['chal.stat.boss', r.boss.beaten ? T('chal.beaten') : T('chal.hp', { n: r.boss.health })] : ['result.wickets', r.wickets],
      ],
    }));
  },

  // ---------------------------------------------------------------- render
  render(ctx) {
    View3D.set(this.cam.pos, this.cam.tgt, this.cam.focal);
    Stadium.drawBackground(ctx);
    Stadium.drawField(ctx);
    if (this.isChallenge) this._drawTarget(ctx);
    this._drawWorld(ctx);
    Effects.drawParticles(ctx);
    this._drawTimingRing(ctx);
    if (Dev.hitzone) this._drawDebug(ctx);
    Effects.drawFlash(ctx);
    if (this.isChallenge) { Moments.draw(ctx, this); this._drawFever(ctx); }
    this._drawHud(ctx);
    BatControls.draw(ctx);
    if (this.isChallenge) this._drawTargetAim(ctx);
    this._drawOutcome(ctx);
    Effects.drawTexts(ctx);
    if (this.isChallenge && !this.paused) TechUI.draw(ctx);
    if (this.paused) this._drawPause(ctx);
  },

  // Code-drawn stadium target (plan 16.3): a glowing band beyond the rope with a
  // ring hanging over it. The batting camera looks from behind the bowler, so the
  // zone itself shows once the camera follows the ball; before the ball, the aim
  // pad shows where to push for it (_drawTargetAim).
  _drawTarget(ctx) {
    if (!this.target) return;
    const F = BATTING_DATA.field, S = CHALLENGE_DATA.six.targets;
    const a0 = (this.target.angle - S.halfWidth) * Math.PI / 180, a1 = (this.target.angle + S.halfWidth) * Math.PI / 180;
    const pts = [], n = 10, r0 = F.boundaryRadius + 1, r1 = F.boundaryRadius + 16;
    const at = (a, r) => View3D.project(Math.sin(a) * r, 0.05, F.boundaryCentreZ + Math.cos(a) * r);
    for (let i = 0; i <= n; i++) { const q = at(a0 + (a1 - a0) * i / n, r0); if (q) pts.push(q); }
    for (let i = n; i >= 0; i--) { const q = at(a0 + (a1 - a0) * i / n, r1); if (q) pts.push(q); }
    const pulse = 0.55 + Math.sin(Stadium._time * 5) * 0.2;
    if (pts.length >= 4) {
      ctx.save();
      ctx.globalAlpha = pulse;
      R.poly(pts, 'rgba(95,212,255,0.45)', '#bff0ff', 4);
      ctx.restore();
    }
    const a = this.target.angle * Math.PI / 180, rr = F.boundaryRadius + 8;
    const q = View3D.project(Math.sin(a) * rr, 9, F.boundaryCentreZ + Math.cos(a) * rr);
    const v = Display.viewRect();
    if (q && q.x > v.x && q.x < v.x + v.w && q.y > v.y) {
      const r = Math.max(34, Math.min(160, 6 * q.s)) * (1 + Math.sin(Stadium._time * 5) * 0.06);
      ctx.save();
      ctx.globalAlpha = 0.9;
      R.circle(q.x, q.y, r * 1.25, 'rgba(95,212,255,0.18)');
      R.circle(q.x, q.y, r, null, '#bff0ff', 8);
      R.circle(q.x, q.y, r * 0.55, null, '#5fd4ff', 6);
      R.circle(q.x, q.y, r * 0.18, '#ffffff');
      ctx.restore();
      R.text(T('chal.target'), q.x, q.y - r - 26, 30, '#bff0ff');
    }
  },

  // Where to push the aim pad for this ball's target (left/right = direction,
  // up = loft for a six). Shown before and during the delivery.
  _drawTargetAim(ctx) {
    if (!this.target || !(this.state === 'ready' || this.state === 'runup' || this.state === 'delivery')) return;
    const L = BatControls.LAYOUT, pd = BatControls.pad;
    const bx = pd.active ? pd.ox : BatControls.home.x, by = pd.active ? pd.oy : BatControls.home.y;
    const k = Math.max(-1, Math.min(1, this.target.angle / BATTING_DATA.direction.maxAim));
    const x = bx + k * L.maxTravel, y = by - L.maxTravel * 0.7;
    const pulse = 1 + Math.sin(Stadium._time * 6) * 0.1;
    ctx.save();
    ctx.globalAlpha = 0.9;
    R.circle(x, y, 34 * pulse, 'rgba(95,212,255,0.3)', '#bff0ff', 5);
    R.circle(x, y, 10, '#ffffff');
    ctx.restore();
    R.text(T('chal.aimHere'), x, y - 52, 22, '#bff0ff');
  },

  // Fever: a steady warm glow round the edge of the screen (no flashing).
  _drawFever(ctx) {
    const r = this.rules;
    if (!r.feverOn) return;
    const v = Display.viewRect();
    const a = 0.35 + Math.sin(Stadium._time * 2.2) * 0.08;
    ctx.save();
    ctx.lineWidth = 36;
    ctx.strokeStyle = `rgba(255,150,40,${a})`;
    ctx.strokeRect(v.x + 18, v.y + 18, v.w - 36, v.h - 36);
    ctx.restore();
    Sprites.ui('icon_fever', CONFIG.LOGICAL_W / 2 - 180, Display.safe.bottom - 60, 70, 70);
    R.text(T('chal.feverOn', { n: CHALLENGE_DATA.six.fever.mult }), CONFIG.LOGICAL_W / 2 + 20, Display.safe.bottom - 60, 40, '#ffb13b');
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
    const w = Contact.windows('power', this.windowScale || 1, this.techExtra);
    const r = 26 + Math.max(0, left) * 260;
    const perfect = Math.abs(left) <= w.perfect;
    const good = Math.abs(left) <= w.good;
    const A = Access.ring(perfect, good), col = A.col;           // colour-safe / high-contrast targeting (Settings)
    const a = Math.min(1, (0.75 - left) / 0.25);
    ctx.globalAlpha = Math.max(0, a);
    R.circle(p.x, p.y, r, null, CONFIG.COLOR.ink, A.outline);
    R.circle(p.x, p.y, r, null, col, A.w);
    if (A.label) R.text(T(perfect ? 'timing.perfect' : 'timing.good'), p.x, p.y - r - 26, 24, col);
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
      `ideal t ${(i * CONFIG.PHYSICS_STEP).toFixed(3)}s  hitsStumps ${sim.hitsStumps}  window x${(this.windowScale || 1).toFixed(2)}` +
        (this.shot ? `  press err ${Math.round(this.shot.err * 1000)}ms  ${this.shot.grade}` : ''),
      this.hit ? `hit ${this.hit.c.kind} dir ${this.hit.c.dirDeg.toFixed(0)}° loft ${this.hit.c.loftDeg.toFixed(0)}° ${this.hit.c.speed.toFixed(1)}m/s -> ${this.hit.plan.result}` : '',
    ];
    const s = Display.safe;
    R.rect(s.left + 20, s.top + 250, 1000, 110, 'rgba(0,0,0,0.6)');
    lines.forEach((l, k) => R.plainText(l, s.left + 34, s.top + 275 + k * 32, 24, '#00ffff'));
  },

  _drawHud(ctx) {
    const s = Display.safe, r = this.rules, rs = r.rs;
    // ---- top-left: score, balls (or lives), multiplier ----
    R.panel(s.left + 22, s.top + 18, 470, 200);
    R.text(T('hud.score'), s.left + 48, s.top + 50, 28, '#b8c6d6', 'left', false);
    R.text(formatNumber(r.score), s.left + 46, s.top + 112, 76, '#ffffff', 'left');
    if (rs.lives) {
      R.text(T('chal.lives'), s.left + 48, s.top + 180, 26, '#b8c6d6', 'left', false);
      for (let i = 0; i < rs.lives; i++) R.circle(s.left + 170 + i * 44, s.top + 180, 16, i < r.livesLeft ? '#ff5a5a' : 'rgba(255,255,255,0.15)', '#ffffff', 3);
    } else {
      R.text(T('hud.balls'), s.left + 48, s.top + 180, 26, '#b8c6d6', 'left', false);
      R.text(T('hud.ballsLeft', { n: r.ballsLeft }), s.left + 150, s.top + 181, 32, '#ffffff', 'left', false);
    }
    const bx = s.left + 405, by = s.top + 100;
    const hot = r.streak > 0;
    R.circle(bx, by, 64, hot ? '#ff7a1a' : 'rgba(255,255,255,0.12)', hot ? '#ffd23f' : 'rgba(255,255,255,0.3)', 5);
    R.text(T('hud.mult', { n: r.mult }), bx, by + 2, 50, '#ffffff');
    if (r.streak > 0) R.text(T(rs.perfectOnly ? 'chal.perfectChain' : 'hud.streak', { n: r.streak }), bx, by + 88, 22, '#ffd23f');

    if (this.isChallenge) {
      // Fever meter under the panel.
      let y = s.top + 232;
      if (rs.fever) {
        const F = CHALLENGE_DATA.six.fever;
        const k = r.feverOn ? 1 : r.fever.meter / F.meter;
        Sprites.ui('icon_fever', s.left + 50, y + 16, 44, 44);
        R.roundRect(s.left + 80, y + 2, 400, 28, 12, 'rgba(0,0,0,0.55)');
        if (k > 0) R.roundRect(s.left + 83, y + 5, 394 * Math.min(1, k), 22, 10, r.feverOn ? '#ffb13b' : '#ff7a1a');
        R.text(r.feverOn ? T('chal.feverOn', { n: F.mult }) : T('chal.feverMeter'), s.left + 280, y + 17, 18, '#ffffff', 'center', false);
        y += 42;
      }
      // Who's batting and the difficulty.
      R.text(T('chal.playerLine', { name: this.batterP.short || this.batterP.name, d: T('chal.diff.' + this.chal.diff) }), s.left + 30, y + 16, 22, '#d8e4f0', 'left', false);
      // Boss health across the top.
      if (r.boss) {
        // the boss's health bar, top right under the pause button
        const w = 440, x0 = s.right - w - 30, yy = s.top + 150;
        const k = r.boss.health / r.boss.max;
        R.panel(x0 - 10, yy, w + 20, 80);
        R.text(r.boss.beaten ? T('chal.bossDown', { name: this.bowlerP.short }) : T('chal.bossName', { name: this.bowlerP.short }), x0 + w / 2, yy + 24, 22, '#ffd23f');
        R.roundRect(x0, yy + 42, w, 26, 10, 'rgba(0,0,0,0.6)');
        if (k > 0) R.roundRect(x0 + 3, yy + 45, (w - 6) * k, 20, 8, k > 0.5 ? '#ff5a5a' : k > 0.25 ? '#ffb400' : '#9cff6a');
      }
    }

    this._drawPauseButton();
    this._drawBanner(ctx, this.state === 'ready' || this.state === 'runup');
    this._drawTimingLabel(ctx);
  },
});
