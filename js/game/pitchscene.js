// Cricket Arcade — shared "on the pitch" scene behaviour.
// Six Smash (batting) and Wicket Rush (bowling) both show the same ground,
// the same ball flight, the same fielders and the same TV-style cameras.
// Everything they share lives here; each scene mixes it in with
// Object.assign({}, PitchScene, { …its own rules and controls… }).
//
// Common state each scene keeps:
//   state/stateT, del (delivery), dT (secs since release), shot (the batter's
//   swing), hit (ball in play), outcome, ballStopT (delivery stopped early —
//   stumps or pad), stumpsBroken, trail, cam/camMode, paused.

const PitchScene = {
  // ---------------------------------------------------------------- setup
  _initPitch() {
    const P = BATTING_DATA.camera.pitch;
    this.cam = {
      pos: { x: P.pos[0], y: P.pos[1], z: P.pos[2] },
      tgt: { x: P.target[0], y: P.target[1], z: P.target[2] },
      focal: P.focal,
    };
    this.camMode = 'pitch';
    this.paused = false;
    this._ball = {};
    this.trail = [];
    if (!this.pauseButtons) this.pauseButtons = new ButtonList();
    this.pauseBtn = { x: 0, y: 0, w: 116, h: 116, id: null, pressed: false };
  },

  _resetBall() {
    this.dT = 0;
    this.shot = null;
    this.hit = null;
    this.outcome = null;
    this.ballStopT = null;
    this.stumpsBroken = false;
    this.stumpsBrokenAt = 0;
    this.fate = null;          // BallPlay.fate() for this ball
    this.moment = null;        // an LBW / hit-wicket moment playing (game/moments.js)
    this.trail = [];
    this.timingLabel = null;
  },

  _setState(s) { this.state = s; this.stateT = 0; },

  // params: what RESTART starts the scene with (a challenge: the same ruleset,
  // player and difficulty). quitTo: where QUIT goes (default: the Title).
  _layoutPause(sceneName, params, quitTo) {
    const s = Display.safe;
    this.pauseBtn.x = s.right - this.pauseBtn.w - 22;
    this.pauseBtn.y = s.top + 20;
    const cx = CONFIG.LOGICAL_W / 2;
    const b = this.pauseButtons;
    b.clear();
    b.add('pause.resume', cx - 260, 330, 520, 110, () => this.setPaused(false), { size: 48 });
    if (typeof MissionMatch !== 'undefined' && MissionMatch.on) {
      // Missions (M11): try again from the start, or back to the Mission Hub.
      b.add('pause.restart', cx - 260, 460, 520, 110, () => Scenes.go(MissionMatch.startDef(MissionMatch.m)), { size: 48, color: '#e9eef5' });
      b.add(() => T(Sound.muted ? 'common.soundOff' : 'common.soundOn'), cx - 260, 590, 520, 110, () => {
        Sound.setMuted(!Sound.muted); Save.setMuted(Sound.muted);
      }, { size: 44, color: '#e9eef5' });
      if (MissionMatch.m.tutorial) b.add('tut.skip', cx - 260, 720, 520, 110, () => { MissionMatch.leave(); TutorialScene.skipAll(); }, { size: 44, color: '#ffb3b3' });
      else b.add('mis.toHub', cx - 260, 720, 520, 110, () => { MissionMatch.leave(); Scenes.go('missions'); }, { size: 44, color: '#ffb3b3' });
      return;
    }
    if (typeof CareerMatch !== 'undefined' && CareerMatch.on) {
      // Career: no restart. Leave to Career Home; Play Next picks up from the start of the over.
      b.add('pause.careerHome', cx - 260, 460, 520, 110, () => { CareerMatch.leave(); Scenes.go('careerhome', { slot: CareerMatch.slot }); }, { size: 44, color: '#e9eef5' });
    } else if (typeof MyXIMatch !== 'undefined' && MyXIMatch.on) {
      // My XI: leave to My XI Home (the fixture is still to play).
      b.add('pause.myxiHome', cx - 260, 460, 520, 110, () => { MyXIMatch.on = false; Tech.end(); Scenes.go('myxihome'); }, { size: 44, color: '#e9eef5' });
    } else {
      b.add('pause.restart', cx - 260, 460, 520, 110, () => Scenes.go(sceneName, params || undefined), { size: 48, color: '#e9eef5' });
    }
    b.add(() => T(Sound.muted ? 'common.soundOff' : 'common.soundOn'), cx - 260, 590, 520, 110, () => {
      Sound.setMuted(!Sound.muted); Save.setMuted(Sound.muted);
    }, { size: 44, color: '#e9eef5' });
    b.add('pause.quit', cx - 260, 720, 520, 110, () => { if (typeof CareerMatch !== 'undefined') CareerMatch.leave(); if (typeof MyXIMatch !== 'undefined') MyXIMatch.on = false; Scenes.go(quitTo || 'title'); }, { size: 44, color: '#ffb3b3' });
  },

  onAppHidden() { this.setPaused(true); },

  // Pause button + pause menu input. Return true if the touch was used.
  _pauseDown(id, x, y) {
    if (this.paused) { this.pauseButtons.down(id, x, y); return true; }
    const pb = this.pauseBtn;
    if (x >= pb.x - 10 && x <= pb.x + pb.w + 10 && y >= pb.y - 10 && y <= pb.y + pb.h + 10) {
      pb.id = id; pb.pressed = true; return true;
    }
    return false;
  },
  _pauseMove(id, x, y) {
    if (this.paused) { this.pauseButtons.move(id, x, y); return true; }
    return false;
  },
  _pauseUp(id) {
    if (this.paused) { this.pauseButtons.up(id); return true; }
    const pb = this.pauseBtn;
    if (pb.id === id) {
      pb.id = null; pb.pressed = false;
      Sound.play('uiTap');
      this.setPaused(true);
      return true;
    }
    return false;
  },

  _swingTime(shotId) { return shotId === 'defend' ? 0.16 : 0.26; },

  // ---------------------------------------------------------------- when the ball wins
  // The ball beat the bat (this.fate: beaten / miss / hit wicket). Plays it out:
  //   lbw / padLeg  it stops at the pad -> anim_lbw -> out (or not out)
  //   bowled        it hits the stumps
  //   hitwicket     the swing clips the stumps -> anim_hit_wicket
  // Returns true once the ball's end has been handled (the scene waits).
  _stepFate() {
    const f = this.fate;
    if (!f || f.kind === 'contact' || !this.del) return false;
    if (this.moment || this.state !== 'delivery') return true;
    const step = CONFIG.PHYSICS_STEP, sim = this.del.sim;
    if (f.kind === 'hitwicket') {
      if (this.dT >= f.at) {
        Moments.start(this, 'anim_hit_wicket', () => this._endBall('hitwicket'));
        return true;
      }
      return false;
    }
    if (f.result === 'lbw' || f.result === 'padLeg') {
      const tPad = sim.contactIdx * step;
      if (this.dT >= tPad) {
        this.ballStopT = tPad;
        Moments.start(this, 'anim_lbw', () => this._endBall(f.result), { notOut: f.result === 'padLeg' });
        return true;
      }
      return false;
    }
    if (f.result === 'bowled') {
      const tS = sim.stumpsIdx * step;
      if (this.dT >= tS && this.ballStopT === null) {
        this.ballStopT = tS;
        this.stumpsBroken = true;
        this.stumpsBrokenAt = Stadium._time;
        this._endBall('bowled');
        return true;
      }
    }
    return false;
  },

  // ---------------------------------------------------------------- contact
  // Resolve a scheduled swing that connects. Returns the hit.
  _connect(aim, battingRng, fieldingRng) {
    const sh = this.shot;
    const sim = this.del.sim;
    const tIdeal = sim.contactIdx * CONFIG.PHYSICS_STEP;
    // Late contacts meet the ball a touch behind the ideal point.
    const pos = sim.path.at(Math.min(this.dT, tIdeal + 0.035), {});
    let mods = this._duelPlayers ? BallPlay.mods(this._duelPlayers.bat, this._duelPlayers.bowl, sh.id) : null;
    // Career techniques (game/techniques.js) adjust the contact, then the hit.
    if (this._techMods) mods = this._techMods(mods || { edge: 1, power: 1, jitter: 1 }, sh, aim);
    const c = Contact.resolve({ shotId: sh.id, grade: sh.grade, err: sh.err, aim, ball: pos, mods }, battingRng);
    if (this._techContact) this._techContact(c, sh);
    const plan = Fielding.resolve(pos, c, sh.id, fieldingRng);
    this.hit = { c, plan, t: 0, pos, grade: sh.grade, perfect: sh.grade === 'perfect', dropShown: false };
    this._setState('inplay');
    this._contactFeel(pos, c, sh.grade, this.feelScale === undefined ? 1 : this.feelScale);
    return this.hit;
  },

  // Sound + sparks + slow-mo for bat on ball. scale < 1 tones it down
  // (Wicket Rush: the AI's good shots shouldn't feel like a celebration).
  _contactFeel(pos, c, grade, scale) {
    const F = BATTING_DATA.feel;
    const sp = View3D.project(pos.x, pos.y, pos.z);
    if (c.kind === 'edge') {
      Sound.play('edge');
      if (sp) Effects.sparks(sp.x, sp.y, 6, '#ffffff', 300);
    } else if (c.kind === 'defend') {
      Sound.play('batDefend');
      if (sp) Effects.sparks(sp.x, sp.y, 5, '#fff6df', 220);
    } else if (grade === 'perfect' && scale >= 1) {
      Sound.play('batPerfect');
      Effects.slowMo(F.perfectSlowMo.duration, F.perfectSlowMo.scale);
      Effects.shake(F.perfectShake.amp, F.perfectShake.dur);
      Effects.flash(0.55, '#fff4c2');
      if (sp) {
        Effects.sparks(sp.x, sp.y, 26, '#ffd23f', 900);
        Effects.sparks(sp.x, sp.y, 10, '#ffffff', 600);
        Effects.ring(sp.x, sp.y, 190, '#ffd23f', 0.45, 14);
        Effects.ring(sp.x, sp.y, 110, '#ffffff', 0.3, 8);
      }
      Stadium.cheer(0.7);
      Sound.play('crowdCheer', { gain: 0.8 });
      Platform.haptic('strong');
    } else {
      Sound.play('batHit', { gain: grade === 'good' || grade === 'perfect' ? 1 : 0.7 });
      if (grade === 'good' && scale >= 1) { Effects.shake(F.goodShake.amp, F.goodShake.dur); Platform.haptic('light'); }
      if (sp) Effects.sparks(sp.x, sp.y, grade === 'good' || grade === 'perfect' ? 12 : 6, '#ffffff', 600);
    }
  },

  // Advance a ball in play; when it's finished, returns the outcome key
  // ('six','four','caught','defended','edge','runs','dot') else null.
  _stepInPlay() {
    const h = this.hit, plan = h.plan;
    const p = plan.path.at(h.t, this._ball);
    if (h.lastBounce === undefined) h.lastBounce = 0;
    for (const b of plan.path.bounces) {
      if (b <= p.i && b > h.lastBounce) {
        h.lastBounce = b;
        Sound.play('bounce');
        const sp = View3D.project(plan.path.x[b], 0, plan.path.z[b]);
        if (sp) Effects.dust(sp.x, sp.y, 5, Math.min(1.5, sp.s / 60));
      }
    }
    if (plan.dropped && !h.dropShown && h.t >= plan.dropped.t) {
      h.dropShown = true;
      Effects.text(T('outcome.dropped'), CONFIG.LOGICAL_W / 2, 470, '#ffd23f', 64);
      Sound.play('crowdCheer', { gain: 0.6 });
    }
    const endT = this._inPlayEnd(h);
    if (h.t < endT) return null;
    const c = h.c;
    if (plan.result === 'six') return 'six';
    if (plan.result === 'four') return 'four';
    if (plan.result === 'caught') return 'caught';
    if (c.kind === 'defend') return 'defended';
    if (c.kind === 'edge') return 'edge';
    return plan.runs > 0 ? 'runs' : 'dot';
  },

  // Crowd / sound / shake for a finished ball, from the crowd's point of view
  // (they cheer boundaries and groan at wickets whichever side you play).
  _outcomeFeel(key) {
    const F = BATTING_DATA.feel;
    if (key === 'six') {
      Sound.play('sfx_six_crowd');
      Sound.play('six');
      Stadium.cheer(1);
      Effects.shake(10, 0.3);
    } else if (key === 'four') {
      Sound.play('crowdCheer');
      Sound.play('four');
      Stadium.cheer(0.7);
    } else if (key === 'miss' || key === 'leave') {
      Sound.play('sfx_glove', { gain: 0.7 });           // into the keeper's gloves
    } else if (key === 'caught' || key === 'bowled' || key === 'lbw' || key === 'hitwicket') {
      Sound.play(key === 'bowled' ? 'stumps' : key === 'lbw' || key === 'hitwicket' ? 'wicket' : 'catchIt');
      if (key === 'bowled' || key === 'hitwicket') Sound.play('sfx_bails');
      if (key === 'lbw' || key === 'caught') Sound.play('sfx_appeal');
      Sound.play('wicket');
      Sound.play('crowd_wicket', { gain: 0.8 });
      Effects.shake(F.wicketShake.amp, F.wicketShake.dur);
      Platform.haptic('wicket');
    }
  },

  // Standard outcome popup contents for a key.
  _outcomeLook(key, runs) {
    const map = {
      six:      ['outcome.six', '#ffd23f', 170, 'marker_six'],
      four:     ['outcome.four', '#5fd4ff', 140, 'marker_four'],
      dot:      ['outcome.dot', '#d7dde2', 90],
      miss:     ['outcome.miss', '#d7dde2', 90],
      leave:    ['outcome.leave', '#d7dde2', 90],
      defended: ['outcome.defended', '#d7dde2', 90],
      caught:   ['outcome.caught', '#ff4b4b', 140, 'marker_wicket'],
      bowled:   ['outcome.bowled', '#ff4b4b', 140, 'marker_wicket'],
      lbw:      ['outcome.lbwOut', '#ff4b4b', 120, 'marker_lbw'],
      hitwicket:['outcome.hitWicketOut', '#ff4b4b', 110, 'marker_hit_wicket'],
      runout:   ['outcome.runOut', '#ff4b4b', 140, 'marker_run_out'],
      padLeg:   ['outcome.notOutLeg', '#ffd23f', 80],
      wide:     ['outcome.wide', '#ffb36b', 120, 'marker_wide'],
      noball:   ['outcome.noball', '#ffb36b', 120, 'marker_no_ball'],
      notout:   ['outcome.notOut', '#ffd23f', 110, 'marker_free_hit'],
    };
    let m = map[key];
    if (key === 'runs' || (key === 'edge' && runs > 0)) {
      return { text: runs === 1 ? T('outcome.runs1') : T('outcome.runsN', { n: runs }), color: '#ffffff', size: 120, marker: null };
    }
    else if (key === 'edge') m = ['outcome.edge', '#d7dde2', 90];
    return { text: T(m[0]), color: m[1], size: m[2], marker: m[3] || null };
  },

  // ---------------------------------------------------------------- ball + camera
  // When a ball in play is finished with. Matches override this (the ball is
  // thrown back and the batters may still be running).
  _inPlayEnd(h) {
    const plan = h.plan;
    return plan.result === 'fielded' ? Math.max(plan.endT, plan.fieldT || 0) : plan.endT;
  },

  // Add a throw back to the stumps after the ball is fielded (matches only).
  _addThrow(h) {
    const plan = h.plan, R = MATCH_DATA.running;
    if (plan.result !== 'fielded') return null;
    const n = plan.path.n - 1;
    const from = { x: plan.path.x[n], y: 1.2, z: plan.path.z[n] };
    const to = R.throwTarget;
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    const t0 = Math.max(plan.endT, plan.fieldT || 0) + R.pickupTime;
    h.throw = { from, to, t0, t1: t0 + dist / R.throwSpeed, peak: 1.5 + dist * 0.04 };
    return h.throw;
  },

  _throwPos(th, t, out) {
    const k = Math.max(0, Math.min(1, (t - th.t0) / Math.max(0.001, th.t1 - th.t0)));
    out.x = th.from.x + (th.to.x - th.from.x) * k;
    out.z = th.from.z + (th.to.z - th.from.z) * k;
    out.y = th.from.y + (th.to.y - th.from.y) * k + th.peak * 4 * k * (1 - k);
    out.i = 0;
    return out;
  },

  _ballPos() {
    if (this.hit && this.hit.throw && this.hit.t >= this.hit.throw.t0) return this._throwPos(this.hit.throw, this.hit.t, this._ball);
    if (this.hit) return this.hit.plan.path.at(this.hit.t, this._ball);
    if (!this.del) return null;
    if (this.state === 'delivery' || this.state === 'outcome') {
      const t = this.ballStopT !== null ? Math.min(this.dT, this.ballStopT) : this.dT;
      return this.del.sim.path.at(t, this._ball);
    }
    return null;
  },

  _updateTrail() {
    const b = this.hit ? this._ballPos() : null;
    if (b && this.state === 'inplay') {
      this.trail.push({ x: b.x, y: b.y, z: b.z });
      if (this.trail.length > 16) this.trail.shift();
    } else if (this.trail.length && this.state !== 'inplay') {
      this.trail.shift();
    }
  },

  // Ball-in-play camera (plan 7.11): shortly after contact the view CUTS (like
  // a TV broadcast) to a high camera behind the batter, looking the way the
  // ball is travelling, then follows it. The next ball cuts back.
  _followWant(t) {
    const C = BATTING_DATA.camera.follow;
    const h = this.hit;
    const d = h.c.dirDeg * Math.PI / 180;
    const hx = Math.sin(d), hz = Math.cos(d);
    const b = h.plan.path.at(t, {});
    const n = h.plan.path.n - 1;
    const ex = h.plan.path.x[n], ez = h.plan.path.z[n];
    const tx = b.x + (ex - b.x) * C.lead, tz = b.z + (ez - b.z) * C.lead;
    return {
      tgt: { x: tx, y: Math.min(b.y, 12) * 0.5, z: tz },
      pos: { x: tx - hx * C.back, y: C.height, z: tz - hz * C.back },
      focal: C.focal,
    };
  },

  _updateCamera(dt) {
    const C = BATTING_DATA.camera;
    let want;
    // Follow the ball after contact; once it's thrown back, cut to the pitch
    // view so the running batters and the stumps are in shot.
    const following = this.hit && (this.state === 'inplay' || this.state === 'outcome') &&
      this.hit.t >= C.follow.cutDelay && !(this.hit.throw && this.hit.t >= this.hit.throw.t0);
    const highlight = !following && this._highlightOn && this._highlightOn();
    if (following) {
      want = this._followWant(this.hit.t);
    } else if (highlight) {
      const H = C.highlight;
      want = { pos: { x: H.pos[0], y: H.pos[1], z: H.pos[2] }, tgt: { x: H.target[0], y: H.target[1], z: H.target[2] }, focal: H.focal };
    } else {
      const P = C.pitch;
      want = {
        pos: { x: P.pos[0], y: P.pos[1], z: P.pos[2] },
        tgt: { x: P.target[0], y: P.target[1], z: P.target[2] },
        focal: P.focal,
      };
    }
    const cam = this.cam;
    const mode = following ? 'follow' : highlight ? 'highlight' : 'pitch';
    if (mode !== this.camMode) {
      this.camMode = mode;       // hard cut between the two camera positions
      Object.assign(cam.pos, want.pos); Object.assign(cam.tgt, want.tgt); cam.focal = want.focal;
    }
    const ease = following ? C.followEase : highlight ? 8 : C.resetEase;
    const k = 1 - Math.exp(-ease * dt);
    for (const a of ['x', 'y', 'z']) {
      cam.pos[a] += (want.pos[a] - cam.pos[a]) * k;
      cam.tgt[a] += (want.tgt[a] - cam.tgt[a]) * k;
    }
    cam.focal += (want.focal - cam.focal) * k;
    View3D.set(cam.pos, cam.tgt, cam.focal);
  },

  // Highlight camera (plan 7.11): a low shot of the stumps for bowled and
  // hit-wicket moments.
  _highlightOn() {
    if (this.moment && this.moment.id === 'anim_hit_wicket') return true;
    return !!(this.outcome && this.state === 'outcome' && (this.outcome.key === 'bowled' || this.outcome.key === 'hitwicket')
      && this.stateT < BATTING_DATA.camera.highlight.hold);
  },

  _showTiming(grade, reason) {
    const colors = { perfect: '#ffd23f', good: '#9cff6a', early: '#ffb36b', late: '#ffb36b', miss: '#ff8f8f', loose: '#ffb36b', beaten: '#ff8f8f' };
    this.timingLabel = { text: T('timing.' + grade), color: colors[grade], t: 0, sub: reason ? T('timing.' + reason) : null };
  },

  // ---------------------------------------------------------------- world drawing
  // Bowler run-up progress: 0..1 while running in, then seconds since release.
  // Scenes can override (Wicket Rush runs up while BOWL is held).
  _bowlerPhase() {
    const D = BATTING_DATA.delivery;
    if (this.state === 'ready') return { runT: 0, after: -1 };
    if (this.state === 'runup') return { runT: this.stateT / D.runUpTime, after: -1 };
    return { runT: 1, after: this.dT + (this.hit ? this.hit.t : 0) };
  },

  // Where the two batters stand. The challenge modes show only the striker;
  // matches (showNonStriker) show both, and move them while running.
  _batterPositions() {
    const PI = BATTING_DATA.pitch;
    const home = { x: PI.batterX, z: 0.95 };
    if (!this.showNonStriker) return { striker: home, nonStriker: null };
    const far = { x: -1.0, z: PI.length - 0.7 };
    const run = this.hit && this.hit.running;
    // The non-striker stands right in front of the pitch camera, so he stays
    // out of shot until the batters actually run.
    if (!run || (!run.cur && run.completed === 0)) return { striker: home, nonStriker: null };
    const p = run.position(this.hit.t);
    return {
      running: !!run.cur,
      striker: { x: home.x - 0.3 * Math.sin(p * Math.PI), z: home.z + (PI.length - 1.3 - home.z) * p },
      nonStriker: { x: far.x + 0.3 * Math.sin(p * Math.PI), z: far.z + (1.3 - far.z) * p },
    };
  },

  _drawWorld(ctx) {
    const PI = BATTING_DATA.pitch, D = BATTING_DATA.delivery, F = BATTING_DATA.field, C = BATTING_DATA.camera;
    const items = [];
    const add = (id, x, y, z, opts) => {
      const p = View3D.project(x, y, z);
      if (p) items.push({ id, p, opts: opts || {}, d: p.d });
    };

    const brokenT = Math.min(1.5, Math.max(0, Stadium._time - (this.stumpsBrokenAt || 0)));
    add('stumps', 0, 0, 0, this.stumpsBroken ? { broken: brokenT, back: this.stumpsBroken === 'hitwicket' } : {});
    add('stumps', 0, 0, PI.length, {});
    add('umpire', -1.3, 0, PI.length + 1.6, { finger: Moments.fingerUp(this) });

    // Bowler
    const ph = this._bowlerPhase();
    const relX = this.del ? this.del.release.x : 0.35;
    const bx = relX - 0.3;
    let bz, bopts;
    if (ph.after < 0) {
      const e = Math.max(0, Math.min(1, ph.runT));
      bz = D.runUpStartZ + (D.releaseZ + 0.5 - D.runUpStartZ) * e;
      bopts = { run: e * 16 };
      if (e > 0.85) bopts.arm = -Math.PI / 2 - 1.2 + (e - 0.85) / 0.15 * 1.2;   // arm coming over
      if (Sprites.has('bowler')) bopts.rot = Math.sin(e * 16) * 0.05;         // running bob
    } else {
      const slow = Math.min(1, ph.after / 0.9);
      bz = D.releaseZ + 0.5 - (D.releaseZ + 0.5 - F.bowlerFollowThroughZ) * (1 - (1 - slow) * (1 - slow));
      bopts = { run: 16 + slow * 6, arm: ph.after < 0.25 ? -Math.PI / 2 + ph.after * 6 : 1.4 };
    }
    add('bowler', bx, 0, bz, bopts);

    // Fielders
    const hitT = this.hit ? this.hit.t : 0;
    const active = this.hit && this.hit.plan.fielder;
    for (const f of Fielding.fielders()) {
      let fx = f.x, fz = f.z, running = false, catching = false;
      if (active && active.id === f.id) {
        const dx = active.to.x - f.x, dz = active.to.z - f.z;
        const dist = Math.hypot(dx, dz);
        const need = active.chase ? dist : Math.max(0, dist - F.reach * 0.6);
        const moved = Math.min(need, Math.max(0, hitT - F.reaction) * F.fielderSpeed);
        if (dist > 0) { fx += dx / dist * moved; fz += dz / dist * moved; }
        running = moved > 0 && moved < need;
        catching = this.hit.plan.result === 'caught' && hitT > this.hit.plan.endT - 0.4;
      }
      add(f.keeper ? 'keeper' : 'fielder', fx, 0, fz, { run: running ? hitT * 14 : 0, catching });
    }

    // Batter
    const swing = this._swingProgress();
    const batterItemOpts = { bat: this._batAngle(swing), lean: this.shot && this.shot.id !== 'defend' ? 0.4 : 0 };
    if (Sprites.has('batter')) {
      // Single-pose art: lean into the shot while swinging.
      const s = swing === null ? 0 : Math.sin(Math.min(1, swing) * Math.PI);
      batterItemOpts.rot = this.shot && this.shot.id === 'defend' ? s * 0.05 : s * 0.13;
    }
    const pos = this._batterPositions();
    if (pos.running) { batterItemOpts.rot = Math.sin(this.hit.t * 18) * 0.06; }
    add('batter', pos.striker.x, 0, pos.striker.z, batterItemOpts);
    const batterItem = items[items.length - 1];
    if (pos.nonStriker) {
      add('batter', pos.nonStriker.x, 0, pos.nonStriker.z,
        { bat: 1.6, rot: pos.running ? Math.sin(this.hit.t * 18 + 1) * 0.06 : 0 });
    }

    // Ball
    const b = this._ballPos();
    let ballItem = null;
    if (b && (this.state === 'delivery' || this.state === 'inplay' || this.state === 'outcome')) {
      const bp = View3D.project(b.x, b.y, b.z);
      const sp = View3D.project(b.x, 0, b.z);
      if (sp) {
        const r = Math.max(C.minBallPx, BATTING_DATA.physics.ballRadius * C.ballDrawScale * sp.s);
        const fade = Math.max(0.12, 0.45 - b.y * 0.02);
        Sprites.draw('ball_shadow', sp.x, sp.y, sp.s, { r: r * Math.max(0.5, 1 - b.y * 0.03), a: fade });
      }
      if (bp) {
        const r = Math.max(C.minBallPx, BATTING_DATA.physics.ballRadius * C.ballDrawScale * bp.s);
        ballItem = { id: 'ball', p: bp, opts: { r, golden: this.del.golden }, d: bp.d };
        items.push(ballItem);
      }
    }

    items.sort((a, b2) => b2.d - a.d);
    for (const it of items) {
      if (it === ballItem) {
        this._drawTrail(ctx);
        if (C.farBallGlow && this.camMode === 'follow') {
          R.circle(it.p.x, it.p.y, it.opts.r * 2.6, 'rgba(255,255,255,0.28)');
          R.circle(it.p.x, it.p.y, it.opts.r * 1.7, 'rgba(255,255,255,0.45)');
        }
      }
      Sprites.draw(it.id, it.p.x, it.p.y, it.p.s, it.opts);
      if (it === ballItem && Access.on('contrastBall')) {
        R.circle(it.p.x, it.p.y, it.opts.r + 5, null, '#000000', 5);
        R.circle(it.p.x, it.p.y, it.opts.r + 10, null, '#fff35c', 4);
      }
      if (it === batterItem && Sprites.has('batter')) this._drawSwoosh(ctx, it.p, swing);
    }
    if (!ballItem) this._drawTrail(ctx);
  },

  // 0..1 through the swing, or null when not swinging.
  _swingProgress() {
    const sh = this.shot;
    if (!sh || sh.leave) return null;
    const now = this.state === 'delivery' ? this.dT : (this.hit ? this.dT + this.hit.t : this.dT);
    const p = (now - sh.swingStart) / this._swingTime(sh.id);
    return p < 0 ? null : Math.min(1.2, p);
  },

  _batAngle(swing) {
    const sh = this.shot;
    if (swing === null) {
      if (this.state === 'delivery') return 1.9 + (4.0 - 1.9) * Math.min(1, this.dT / 0.35);   // backlift
      return 1.9 + Math.sin(this.stateT * 3) * 0.06;                                         // stance tap
    }
    const p = Math.min(1, swing);
    if (sh.id === 'defend') return 4.0 + (1.7 - 4.0) * Math.min(1, p * 1.4);
    return 4.0 + (-0.9 - 4.0) * p;
  },

  // Code-drawn swing arc for the single-pose batter art (a trail effect, not art).
  _drawSwoosh(ctx, p, swing) {
    if (swing === null || swing > 1.15) return;
    const s = p.s;
    const cx = p.x + 0.1 * s, cy = p.y - 1.05 * s;
    const r = 0.95 * s;
    const defend = this.shot.id === 'defend';
    const a0 = defend ? 2.4 : 3.9, a1 = defend ? 1.6 : -0.7;
    const head = a0 + (a1 - a0) * Math.min(1, swing);
    const tail = a0 + (a1 - a0) * Math.max(0, Math.min(1, swing) - 0.45);
    const fade = swing > 1 ? 1 - (swing - 1) / 0.15 : 1;
    ctx.save();
    ctx.globalAlpha = 0.75 * fade;
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.hit && this.hit.perfect ? '#ffd23f' : '#ffffff';
    ctx.lineWidth = Math.max(4, 0.12 * s);
    ctx.beginPath();
    ctx.arc(cx, cy, r, head, tail, head < tail ? false : true);
    ctx.stroke();
    ctx.restore();
  },

  _drawTrail(ctx) {
    if (this.trail.length < 2) return;
    const gold = this.hit && this.hit.perfect;
    let prev = null;
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const p = View3D.project(t.x, t.y, t.z);
      if (p && prev) {
        const k = i / this.trail.length;
        R.line(prev.x, prev.y, p.x, p.y, gold ? `rgba(255,210,63,${k * 0.9})` : `rgba(255,255,255,${k * 0.6})`,
          Math.max(2, (gold ? 14 : 8) * k));
      }
      prev = p;
    }
  },

  // ---------------------------------------------------------------- HUD pieces
  _drawPauseButton() {
    const pb = this.pauseBtn;
    const off = pb.pressed ? 4 : 0;
    R.roundRect(pb.x, pb.y + off, pb.w, pb.h, 22, CONFIG.COLOR.panel, 'rgba(255,255,255,0.5)', 4);
    R.rect(pb.x + 38, pb.y + off + 32, 14, 52, '#ffffff');
    R.rect(pb.x + 64, pb.y + off + 32, 14, 52, '#ffffff');
  },

  _drawBanner(ctx, showWhen) {
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    if (this.banner && showWhen) {
      const a = Math.min(1, this.banner.t / 0.15);
      ctx.globalAlpha = a;
      const tall = !!this.banner.sub;
      R.panel(cx - 280, s.top + 22, 560, tall ? 130 : 84);
      R.text(this.banner.text, cx, s.top + 64, 44, this.banner.color);
      if (tall) {
        const icon = this.banner.icon;
        if (icon) Sprites.ui(icon, cx - 230, s.top + 118, 70, 70);
        R.text(this.banner.sub, cx, s.top + 118, 38, this.banner.subColor || '#ffd23f');
      }
      ctx.globalAlpha = 1;
    } else if (this.del && (this.state === 'delivery' || this.state === 'inplay' || this.state === 'outcome')) {
      R.text(T('hud.speed', { n: this.del.kmh }), cx, s.top + 50, 34, '#ffffff');
    }
  },

  _drawTimingLabel(ctx) {
    const tl = this.timingLabel;
    if (!tl) return;
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    const pop = Math.min(1, tl.t / 0.1);
    const fade = tl.t > 1.6 ? Math.max(0, 1 - (tl.t - 1.6) / 0.3) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(cx, s.top + 150);
    ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
    R.text(tl.text, 0, 0, 78, tl.color);
    if (tl.sub) R.text(tl.sub, 0, 62, 34, '#ffffff');
    ctx.restore();
  },

  // Big result popup: marker art when we have it, text underneath.
  _drawOutcome(ctx) {
    const o = this.outcome;
    if (!o) return;
    const cx = CONFIG.LOGICAL_W / 2;
    const t = this.stateT;
    const pop = Math.min(1, t / 0.14);
    const scale = 0.5 + 0.5 * pop + Math.max(0, 0.18 - t) * 1.2;
    const fade = t > o.hold - 0.25 ? Math.max(0, (o.hold - t) / 0.25) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(cx, 400);
    ctx.scale(scale, scale);
    const hasArt = o.marker && Sprites.has(o.marker);
    if (hasArt) {
      Sprites.ui(o.marker, 0, -40, 330, 300);
      // markers for six/four/wicket already say it; others get the text too
      if (o.showText) R.text(o.text, 0, 150, Math.min(90, o.size * 0.7), o.color);
    } else {
      R.text(o.text, 0, 0, o.size, o.color);
    }
    ctx.restore();
    // Umpire signals OUT for LBW and caught.
    if (o.umpire && Sprites.has('umpire_out')) {
      const slide = Math.min(1, t / 0.2);
      const s = Display.safe;
      Sprites.ui('umpire_out', s.right - 170 + (1 - slide) * 300, 640, 260, 420, { alpha: fade });
    }
  },

  _drawPause(ctx) {
    const v = Display.viewRect();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    R.text(T('pause.title'), CONFIG.LOGICAL_W / 2, 220, 96, '#ffffff');
    this.pauseButtons.draw();
  },
};
