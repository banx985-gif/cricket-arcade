// Cricket Arcade — Quick Match: YOU BAT (M03).
// Built from the Six Smash scene (same controls, timing, contact, fielding),
// with match rules on top: an AI bowler (who sometimes bowls wides and
// no-balls), running between wickets, free hits, strike, overs, a chase
// target, and the innings ending on overs / all out / target reached.

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
    Effects.init();
    BatControls.init((k) => this.onShot(k));
    BatControls.reset();
    BatControls.enabled = false;
    RunControls.init({ run: () => this.onRun(), cancel: () => this.onCancel() });
    RunControls.reset();
    this._layout();
    this._startBall();
  },

  exit() { BatControls.reset(); RunControls.reset(); },

  _layout() {
    this._layoutPause('toss');               // RESTART = a fresh match
    BatControls.layout();
    RunControls.layout();
  },

  setPaused(p) {
    this.paused = p;
    if (p) { BatControls.reset(); RunControls.run.id = null; RunControls.cancel.id = null; }
  },

  // The AI bowler: a normal seeded delivery, sometimes turned into a wide or no-ball.
  _startBall() {
    Match.overStart();                       // resume checkpoint at the start of each over
    const A = MATCH_DATA.aiBowler, rng = this._bowlRng;
    let d = Delivery.make(this.inn.legal, rng);
    const roll = rng.next();
    this.extraKind = roll < A.wideChance ? 'wide' : roll < A.wideChance + A.noBallChance ? 'noball' : null;
    if (this.extraKind === 'wide') {
      const side = rng.chance(0.75) ? 1 : -1;
      d = Delivery.build(Object.assign({}, d.params, { bounceX: d.params.bounceX + side * A.wideOffset }));
    }
    this.del = d;
    this._setState('ready');
    this._resetBall();
    RunControls.visible = false;
    const inn = this.inn;
    this.banner = { text: this._ballLabel(), color: '#ffffff', t: 0 };
    if (inn.freeHit) { this.banner.sub = T('bowl.freeHit'); this.banner.subColor = '#ff9d2e'; }
  },

  _ballLabel() {
    const inn = this.inn;
    const txt = T('match.overBall', { over: Math.floor(inn.legal / 6) + 1, ball: (inn.legal % 6) + 1 });
    return inn.isSuper ? T('match.superOver') + ' · ' + txt : txt;
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

  _connect(aim, battingRng, fieldingRng) {
    const h = PitchScene._connect.call(this, aim, battingRng, fieldingRng);
    const th = this._addThrow(h);
    if (th) h.running = new Running(th.t1);
    return h;
  },

  _inPlayEnd(h) {
    if (h.throw) return h.running && !h.running.done ? h.throw.t1 + 0.5 : h.throw.t1 + 0.15;
    return PitchScene._inPlayEnd.call(this, h);
  },

  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    Fullscreen.request();
    if (this._pauseDown(id, x, y)) return;
    if (RunControls.down(id, x, y)) return;
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
          h.running.update(h.t);
          RunControls.visible = !h.running.done && !h.running.runOut;
          RunControls.risk = h.running.risk(h.t);
          RunControls.canCancel = h.running.canCancel();
          RunControls.queued = h.running.queued;
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

  _updateDelivery() {
    const sim = this.del.sim, step = CONFIG.PHYSICS_STEP;
    const tIdeal = sim.contactIdx * step;
    const sh = this.shot;

    if (sh && sh.contactT !== null && !sh.done && this.dT >= sh.contactT) {
      sh.done = true;
      const hit = this._connect(BatControls.aim(), RNG.stream('batting'), RNG.stream('fielding'));
      this._showTiming(sh.grade);
      Log.add('ball', `inn${this.inn.index + 1} ${this.inn.overs} ${sh.id} ${sh.grade} -> ${hit.plan.result}`);
      return;
    }

    // Missed, and it would hit the stumps: LBW if the pads were in the way, else bowled.
    const contactComing = sh && sh.contactT !== null;
    if (sim.hitsStumps && !contactComing && this.ballStopT === null) {
      const LP = BOWLING_DATA.lbwPads;
      const at = sim.path.at(tIdeal, {});
      const pad = at.x >= LP.minX && at.x <= LP.maxX && at.y <= LP.maxY;
      if (pad && this.dT >= tIdeal + Contact.lateLimit('power')) {
        this.ballStopT = tIdeal;
        if (!sh) this._showTiming('miss', 'noShot');
        Sound.play('batDefend');
        this._endBall('lbw');
        return;
      }
      if (!pad && this.dT >= sim.stumpsIdx * step) {
        this.ballStopT = sim.stumpsIdx * step;
        this.stumpsBroken = true;
        if (!sh) this._showTiming('miss', 'noShot');
        this._endBall('bowled');
        return;
      }
    }
    if (!sh && this.dT > tIdeal + Contact.lateLimit('power') + 0.02) BatControls.enabled = false;
    if (this.dT >= sim.path.duration()) {
      if (!sh && this.extraKind !== 'wide') this._showTiming('miss', 'noShot');
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
    if (key === 'caught' || key === 'bowled' || key === 'lbw') wicket = key;
    else if (run && run.runOut) wicket = 'runout';
    const res = inn.apply({ kind, batRuns, boundary, wicket });
    this._showBallResult(key, res, batRuns, wicket, true);
  },

  // Shared by both innings scenes: popup + sounds for a finished ball.
  // mine = the player is batting.
  _showBallResult(key, res, batRuns, wicket, mine) {
    const F = MATCH_DATA.feel;
    let lookKey = key;
    if (wicket === 'runout') lookKey = 'runout';
    else if (res.notOut) lookKey = 'notout';
    else if (!wicket && key !== 'six' && key !== 'four' && key !== 'wide') lookKey = batRuns > 0 ? 'runs' : (key === 'edge' ? 'edge' : key);
    const look = this._outcomeLook(lookKey, batRuns);
    if (res.notOut) look.text = T(this.extraKind === 'noball' || (this.release && this.release.noBall) ? 'outcome.notOutNoBall' : 'outcome.notOut');
    this.outcome = Object.assign(look, {
      key: lookKey, res, t: 0,
      hold: F.outcomeHold + (res.wicket ? 0.4 : 0) + (res.overDone ? F.overBreak : 0) + (this.inn.ended ? 0.6 : 0),
      showText: !!wicket || res.notOut,        // six/four/wide markers already say it
      umpire: res.wicket && (wicket === 'caught' || wicket === 'lbw'),
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

  // ---- render ----
  render(ctx) {
    SixSmashScene.render.call(this, ctx);
    if (!this.paused) RunControls.draw(ctx);
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
    const side = MATCH_DATA.teams[inn.battingSide];
    const h = MatchHud.scoreboard(ctx, s.left + 16, s.top + 12, 470, inn, T(side.shortKey));
    MatchHud.thisOver(ctx, s.left + 34, s.top + 12 + h + 30, inn);
    const b = inn.bat(inn.striker);
    R.text(T('match.batterLine', { n: b.no, r: b.runs, b: b.balls }), s.left + 34, s.top + 12 + h + 80, 24, '#ffffff', 'left');
    if (inn.target) {
      const w = 270;
      const x = s.right - 116 - 40 - w;
      const th = MatchHud.target(ctx, x, s.top + 10, w, inn);
      MatchHud.paceChip(ctx, x + 20, s.top + 16 + th, w - 40, inn, playerBatting);
    }
  },
};
