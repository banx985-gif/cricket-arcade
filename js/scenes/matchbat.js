// Cricket Arcade — Quick Match: YOU BAT (M03, M04b).
// Built from the Six Smash scene (same controls, timing, contact, fielding),
// with match rules on top: a computer bowling attack (each bowler with their
// own family, stats and over limit, changed every over), wides and no-balls,
// running between wickets against the computer's throws, free hits, strike,
// overs, a chase target, and the innings ending on overs / all out / target.
// Your batter's stats against the bowler's shape every ball (game/duel.js).

const MatchBatScene = Object.assign({}, SixSmashScene, {
  showNonStriker: true,
  inn: null,
  extraKind: null,

  enter() {
    this._initPitch();
    this.inn = Match.current();
    this.rules = this.inn;                   // shared code reads .ball from here
    this.seed = Match.seed;
    this._bowlRng = RNG.stream('aiBowl:' + this.inn.index);
    this.team = Match.team('ai');            // the computer's attack
    Stadium.setConditions(Match.cond);
    Effects.init();
    MatchupCard.hide();
    BatControls.init((k) => this.onShot(k));
    BatControls.reset();
    BatControls.enabled = false;
    RunControls.init({ run: () => this.onRun(), cancel: () => this.onCancel() });
    RunControls.reset();
    this._layout();
    this._startBall();
  },

  exit() { BatControls.reset(); RunControls.reset(); Fielding.clear(); },

  _layout() {
    this._layoutPause('toss');               // RESTART = a fresh match
    BatControls.layout();
    RunControls.layout();
  },

  setPaused(p) {
    this.paused = p;
    if (p) { BatControls.reset(); RunControls.run.id = null; RunControls.cancel.id = null; }
  },

  // ---- the computer's bowling ----
  _startBall() {
    if (CareerMatch.route('matchbat')) return;   // career: only your balls are played live
    Match.overStart();                       // resume checkpoint at the start of each over
    const inn = this.inn;
    const prevBatter = this.batterP;
    this.batterP = Match.batter(inn);
    if (Match.needsBowler(inn)) {
      const rng = RNG.stream('aiPick:' + inn.index);
      const bw = BowlerRules.aiPick(inn, this.team, Match.fatigue, rng);
      const ph = BowlerRules.phase(inn);
      const fam = Bowling.family(bw.family);
      Match.setBowler(inn, bw.id, Fielding.aiChoose({ phase: ph, kind: fam.kind, family: fam.id, wicketsFell: inn.wickets > (this._wktsAtOver || 0) }, rng));
      this._wktsAtOver = inn.wickets;
      this.bowlerP = Match.bowlerOf(inn);
      MatchupCard.show(this.batterP, this.bowlerP, 'bat');
    } else {
      this.bowlerP = Match.bowlerOf(inn);
      if (prevBatter && prevBatter !== this.batterP) MatchupCard.show(this.batterP, this.bowlerP, 'bat');
    }
    Fielding.setPreset(inn.field, BowlerRules.phase(inn) === 'powerplay');
    Fielding.mods = Duel.fieldMods(this.team, Fielding.preset);
    // Career: your techniques' stat boosts for this ball (game/techniques.js).
    this.batP = Tech.batStats(this.batterP, inn);
    this._duelPlayers = { bat: this.batP, bowl: this.bowlerP };

    const A = MATCH_DATA.aiBowler, rng = this._bowlRng, bowl = this.bowlerP;
    const fatigue = Match.fatigue[bowl.id] || 0;
    const ch = Bowling.aiChoose(bowl, { phase: BowlerRules.phase(inn), fatigue }, rng);
    const accK = 1 - PLAYER_DATA.duel.aiExtras.accuracy * Teams.n(bowl.stats.accuracy);
    const roll = rng.next();
    this.extraKind = roll < A.wideChance * accK ? 'wide' : roll < (A.wideChance + A.noBallChance) * accK ? 'noball' : null;
    if (this.extraKind === 'wide') ch.target.x += (rng.chance(0.75) ? 1 : -1) * A.wideOffset;
    this.del = Bowling.release({ bowler: bowl, family: bowl.family, typeIdx: ch.typeIdx, target: ch.target,
      grade: ch.grade, power: ch.power, fatigue, cond: Match.cond, index: inn.legal }, rng);
    if (!this.extraKind && BallPlay.isWide(this.del)) this.extraKind = 'wide';
    // Reading the variation: a deceptive bowler shows it later, or not at all.
    const Rd = PLAYER_DATA.duel.read, dec = Teams.u(bowl.stats.deception);
    this.readAt = this.del.variation && rng.chance(Rd.hideChance * dec) ? null : Rd.showAt[0] + (Rd.showAt[1] - Rd.showAt[0]) * dec;
    this._baseWindow = Duel.windowScale(this.batP, bowl, { pressure: Duel.pressure(inn), fatigue, kind: this.del.kind, chase: !!inn.target });
    this._techBall();

    this._setState('ready');
    this._resetBall();
    RunControls.visible = false;
    this.banner = { text: this._ballLabel(), color: '#ffffff', t: 0 };
    if (inn.freeHit) { this.banner.sub = T('bowl.freeHit'); this.banner.subColor = '#ff9d2e'; }
  },

  // Techniques that size the timing windows for this ball; re-run when you
  // fire one (TECHNIQUE / LEGEND buttons, before the ball is bowled).
  _techBall() {
    const tw = Tech.batWindows(this);
    this.windowScale = this._baseWindow * tw.k;
    this.techExtra = tw.extra;
    TechUI.layout('bat', this.inn, () => this.state === 'ready' || this.state === 'runup');
  },
  _techMods(m, sh, aim) { return Tech.contactMods(m, sh, aim, this); },
  _techContact(c, sh) { Tech.afterContact(c, sh, this); },

  _ballLabel() {
    const inn = this.inn;
    const txt = T('match.overBall', { over: Math.floor(inn.legal / 6) + 1, ball: (inn.legal % 6) + 1 });
    return inn.isSuper ? T('match.superOver') + ' · ' + txt : txt;
  },

  // ---- batting: the shot, with the duel's timing window ----
  onShot(shotId) {
    if (this.paused) return;
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

  // ---- running ----
  onRun() {
    const h = this.hit;
    if (this.paused || !h || !h.running || this.state !== 'inplay') return;
    if (h.running.run(h.t)) Sound.play('uiTap');
  },
  onCancel() {
    const h = this.hit;
    if (this.paused || !h || !h.running) return;
    if (h.running.cancel(h.t)) Sound.play('swish');
  },

  // The computer fields: its throw is rolled from its Fielding (same three
  // outcomes as yours). The RUN colours judge a direct hit / a keeper throw.
  _connect(aim, battingRng, fieldingRng) {
    const h = PitchScene._connect.call(this, aim, battingRng, fieldingRng);
    const plan = h.plan;
    if (plan.result === 'fielded') {
      const n = plan.path.n - 1;
      const from = { x: plan.path.x[n], y: 1.2, z: plan.path.z[n] };
      const t0 = Math.max(plan.endT, plan.fieldT || 0) + MATCH_DATA.running.pickupTime;
      const grade = Throw.aiGrade(Duel.fieldMods(this.team).fielding, fieldingRng);
      h.throw = Throw.make(from, t0, grade);
      const ok = Throw.make(from, t0, 'okay'), pf = Throw.make(from, t0, 'perfect');
      h.running = new Running(Infinity, { safe: pf.returnT, tight: ok.returnT }, Duel.runTimeMult(this.batP || this.batterP));
    }
    return h;
  },

  _inPlayEnd(h) {
    if (h.throw) {
      const r = h.running;
      if (r && !r.done && (r.cur || r.queued)) return Math.max(h.throw.t1, h.throw.returnT) + 0.3;
      return h.throw.t1 + 0.15;
    }
    return PitchScene._inPlayEnd.call(this, h);
  },

  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    Fullscreen.request();
    if (this._pauseDown(id, x, y)) return;
    if (RunControls.down(id, x, y)) return;
    if (TechUI.down(id, x, y, () => this._techBall())) return;
    BatControls.down(id, x, y);
  },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this._pauseUp(id)) return;
    if (RunControls.up(id)) return;
    BatControls.up(id);
  },
  keyDown(code) {
    if (code === 'Escape' || code === 'KeyP') { this.setPaused(!this.paused); return; }
    if (this.paused) return;
    if (code === 'KeyR') { this.onRun(); return; }
    if (code === 'KeyX' || code === 'KeyC') { this.onCancel(); return; }
    BatControls.keyShot(code);
  },

  // ---- update ----
  update(dt, realDt) {
    BatControls.update(realDt);
    RunControls.update(realDt);
    MatchupCard.update(realDt);
    if (this.paused || Dev.open || Display.isPortrait) return;
    Effects.update(dt);
    Stadium.update(dt);
    Tech.update(realDt);
    this.stateT += dt;
    if (this.banner) this.banner.t += dt;
    if (this.timingLabel) this.timingLabel.t += dt;
    if (this.flashMarker) this.flashMarker.t += dt;
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
          if (this.extraKind === 'noball') {
            Effects.text(T('outcome.noball'), CONFIG.LOGICAL_W / 2, 300, '#ffb36b', 64, { life: 1.4 });
            Sound.play('crowdCheer', { gain: 0.4 });
          }
        }
        break;
      case 'delivery':
        this.dT += dt;
        this._updateDelivery();
        break;
      case 'inplay': {
        const h = this.hit;
        h.t += dt;
        if (h.running) {
          const th = h.throw;
          if (th && h.t >= th.t1 && h.running.returnT === Infinity) {
            h.running.setReturn(th.returnT, th.grade === 'bad');
            if (th.grade === 'bad') this._overthrow();
          }
          h.running.update(h.t);
          RunControls.visible = !h.running.done && !h.running.runOut;
          RunControls.risk = h.running.risk(h.t);
          RunControls.canCancel = h.running.canCancel();
          RunControls.queued = h.running.queued;
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
    Sound.play('crowdCheer', { gain: 0.6 });
  },

  _updateDelivery() {
    const sim = this.del.sim, step = CONFIG.PHYSICS_STEP;
    const tIdeal = sim.contactIdx * step;
    const sh = this.shot;

    if (sh && sh.contactT !== null && !sh.done && this.dT >= sh.contactT) {
      sh.done = true;
      const hit = this._connect(BatControls.aim(), RNG.stream('batting'), RNG.stream('fielding'));
      this._showTiming(sh.grade);
      Log.add('ball', `inn${this.inn.index + 1} ${this.inn.overs} ${this.del.family}/${this.del.type} ${sh.id} ${sh.grade} -> ${hit.plan.result}`);
      return;
    }
    // No shot, and the late window has closed: the ball goes on (it may hit
    // the pad or the stumps).
    const late = tIdeal + Contact.lateLimit('power', this.windowScale, this.techExtra) + 0.02;
    if (!sh && this.dT > late) {
      BatControls.enabled = false;
      if (!this.fate) {
        this.fate = this.extraKind === 'wide' ? { kind: 'miss', result: null }
          : BallPlay.fate({ del: this.del, left: true, bat: this.batP, bowl: this.bowlerP }, RNG.stream('duel'));
        if (this.fate.result) this._showTiming('miss', 'noShot');
      }
    }
    if (this._stepFate()) return;
    if (this.dT >= sim.path.duration()) {
      if (!sh && this.extraKind !== 'wide' && !(this.fate && this.fate.result)) this._showTiming('miss', 'noShot');
      this._endBall(this.extraKind === 'wide' ? 'wide' : 'miss');
    }
  },

  // Turn the finished ball into a scoreboard entry.
  _endBall(key) {
    const inn = this.inn;
    const run = this.hit && this.hit.running;
    const kind = key === 'wide' ? 'wide' : this.extraKind === 'noball' ? 'noball' : 'legal';
    const boundary = key === 'six' ? 6 : key === 'four' ? 4 : 0;
    const batRuns = run ? run.completed : 0;
    let wicket = null;
    if (key === 'caught' || key === 'bowled' || key === 'lbw' || key === 'hitwicket') wicket = key;
    else if (run && run.runOut) wicket = 'runout';
    const res = inn.apply({ kind, batRuns, boundary, wicket });
    if (res.overDone || inn.ended) Match.overDone(inn);
    if (Tech.mine(this.batterP)) Tech.batBallEnd(key, kind === 'legal', res.wicket ? wicket : null);
    TechUI.btns = [];
    this._showBallResult(key, res, batRuns, wicket, true);
  },

  // Shared by both innings scenes: popup + sounds for a finished ball.
  // mine = the player is batting.
  _showBallResult(key, res, batRuns, wicket, mine) {
    const F = MATCH_DATA.feel;
    let lookKey = key;
    if (wicket === 'runout') lookKey = 'runout';
    else if (res.notOut) lookKey = 'notout';
    else if (key === 'padLeg') lookKey = 'padLeg';
    else if (!wicket && key !== 'six' && key !== 'four' && key !== 'wide') lookKey = batRuns > 0 ? 'runs' : (key === 'edge' ? 'edge' : key);
    const look = this._outcomeLook(lookKey, batRuns);
    if (res.notOut) look.text = T(this.extraKind === 'noball' || (this.release && this.release.noBall) ? 'outcome.notOutNoBall' : 'outcome.notOut');
    this.outcome = Object.assign(look, {
      key: lookKey, res, t: 0,
      hold: F.outcomeHold + (res.wicket ? 0.4 : 0) + (res.overDone ? F.overBreak : 0) + (this.inn.ended ? 0.6 : 0),
      showText: !!wicket || res.notOut || lookKey === 'padLeg',   // six/four/wide markers already say it
      umpire: res.wicket && (wicket === 'caught' || wicket === 'lbw'),
      fingerUp: res.wicket && wicket === 'lbw',
    });
    this._setState('outcome');
    RunControls.visible = false;
    BatControls.enabled = false;

    const cx = CONFIG.LOGICAL_W / 2;
    if (res.runs > 0 && !res.wicket) Effects.text(T('match.plusRuns', { n: res.runs }), cx, 650, '#9cff6a', 64, { life: 1.2 });
    if (res.freeHitNext) Effects.text(T('bowl.freeHitNext'), cx, 860, '#ff9d2e', 44, { life: 1.6 });
    if (res.overDone && !this.inn.ended) Effects.text(T('match.endOfOver'), cx, 760, '#ffffff', 54, { life: 1.9 });
    if (this.inn.ended) Effects.text(T('match.inningsEnd.' + this.inn.endReason), cx, 250, '#ffd23f', 60, { life: 2 });

    this._outcomeFeel(res.wicket ? (wicket === 'runout' ? 'caught' : wicket) : (res.notOut ? 'none' : key));
    if (res.wicket) {
      if (mine) { Sound.play('crowdGroan'); Effects.flash(0.3, '#ff3b3b'); }
      else {
        Sound.play('fanfare'); Stadium.cheer(1); Effects.flash(0.4, '#fff4c2');
        const sp = View3D.project(0, 0.5, 0);
        if (sp) { Effects.sparks(sp.x, sp.y, 28, '#ffd23f', 900); Effects.ring(sp.x, sp.y, 220, '#ffd23f', 0.5, 14); }
      }
    } else if (!mine && (key === 'four' || key === 'six')) {
      Effects.flash(0.18, '#ff3b3b');
    }
    Log.add('score', `inn${this.inn.index + 1} ${this.inn.overs}: ${lookKey} ${res.symbol} => ${this.inn.runs}/${this.inn.wickets}`);
  },

  // A small marker pop (e.g. OVERTHROW) that isn't the ball's result.
  _drawFlashMarker(ctx) {
    const f = this.flashMarker;
    if (!f || f.t > 1.4) return;
    const a = Math.min(1, f.t / 0.1) * Math.min(1, (1.4 - f.t) / 0.25);
    const s = 0.6 + Math.min(1, f.t / 0.14) * 0.4;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    Sprites.ui(f.id, CONFIG.LOGICAL_W / 2, 470, 260 * s, 240 * s);
    ctx.restore();
  },

  // ---- render ----
  render(ctx) {
    SixSmashScene.render.call(this, ctx);
    if (this.paused) return;
    Moments.draw(ctx, this);
    RunControls.draw(ctx);
    MatchupCard.draw(ctx, this.state === 'ready' || this.state === 'runup');
    if (this.state === 'runup' || (this.state === 'ready' && this.stateT > 0.2)) {
      const runT = this.state === 'runup' ? this.stateT / BATTING_DATA.delivery.runUpTime : 0.01;
      if (!MatchupCard.card) ReadChip.draw(ctx, this.del, runT, this.readAt);
    }
    this._drawFlashMarker(ctx);
    TechUI.draw(ctx);
  },

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
    const col = perfect ? '#ffd23f' : good ? '#9cff6a' : 'rgba(255,255,255,0.85)';
    const a = Math.min(1, (0.75 - left) / 0.25);
    ctx.globalAlpha = Math.max(0, a);
    R.circle(p.x, p.y, r, null, CONFIG.COLOR.ink, 9);
    R.circle(p.x, p.y, r, null, col, 5);
    R.circle(p.x, p.y, 22, null, 'rgba(255,255,255,0.5)', 3);
    ctx.globalAlpha = 1;
  },

  _drawHud(ctx) {
    MatchScoreHud.draw(ctx, this, true);
    this._drawPauseButton();
    this._drawBanner(ctx, this.state === 'ready' || this.state === 'runup');
    this._drawTimingLabel(ctx);
  },
});

// The top-of-screen match HUD, shared by both innings scenes.
const MatchScoreHud = {
  draw(ctx, scene, playerBatting) {
    const s = Display.safe, inn = scene.inn;
    const h = MatchHud.scoreboard(ctx, s.left + 16, s.top + 12, 470, inn, CareerMatch.teamShort(inn.battingSide));
    MatchHud.thisOver(ctx, s.left + 34, s.top + 12 + h + 30, inn);
    const b = inn.bat(inn.striker), bp = Match.batter(inn);
    R.text(T('match.batterLine', { name: bp ? bp.short : b.no, r: b.runs, b: b.balls }), s.left + 34, s.top + 12 + h + 78, 24, '#ffffff', 'left');
    const bw = Match.bowlerOf(inn);
    if (bw) {
      const f = inn.bowlerFigs[bw.id] || { balls: 0, runs: 0, wkts: 0 };
      const fam = Bowling.family(bw.family);
      Sprites.ui(fam.icon, s.left + 52, s.top + 12 + h + 118, 40, 34);
      R.text(T('match.bowlerLine', { name: bw.short, w: f.wkts, r: f.runs, o: Math.floor(f.balls / 6) + '.' + (f.balls % 6) }),
        s.left + 80, s.top + 12 + h + 118, 22, '#b8f5c0', 'left');
    }
    if (inn.target) {
      const w = 270;
      const x = s.right - 116 - 40 - w;
      const th = MatchHud.target(ctx, x, s.top + 10, w, inn);
      MatchHud.paceChip(ctx, x + 20, s.top + 16 + th, w - 40, inn, playerBatting);
    }
  },
};
