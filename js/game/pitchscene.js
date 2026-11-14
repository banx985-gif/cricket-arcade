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
    // M19 (plan 4, pause flow): Controls and Audio open Settings over the paused match
    b.add('pause.controls', cx - 260, 590, 255, 110, () => Scenes.openOverlay(SettingsScene, { tab: 'controls' }), { size: 34, color: '#9be7ff' });
    b.add('pause.audio', cx + 5, 590, 255, 110, () => Scenes.openOverlay(SettingsScene, { tab: 'audio' }), { size: 34, color: '#9be7ff' });
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
    if (f.result === 'stumped') {       // M19: into the keeper's gloves, bails off, the batter out of the crease
      const tK = sim.path.duration();
      if (this.dT >= Math.min(tK, (sim.stumpsIdx || sim.contactIdx) * step + MATCH_DATA.extrasPlay.stumpDelay) && this.ballStopT === null) {
        this.ballStopT = this.dT;
        this.stumpsBroken = true;
        this.stumpsBrokenAt = Stadium._time;
        this._endBall('stumped');
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
    let mods = this._duelPlayers ? BallPlay.mods(this._duelPlayers.bat, this._duelPlayers.bowl, sh.id, this._sixCtx ? this._sixCtx(aim) : null, this._sixCtx ? this.inn : null) : null;
    // Career techniques (game/techniques.js) adjust the contact, then the hit.
    if (this._techMods) mods = this._techMods(mods || { edge: 1, power: 1, jitter: 1 }, sh, aim);
    const c = Contact.resolve({ shotId: sh.id, grade: sh.grade, err: sh.err, aim, ball: pos, mods }, battingRng);
    if (this._techContact) this._techContact(c, sh);
    const plan = Fielding.resolve(pos, c, sh.id, fieldingRng, this._fieldOpts ? this._fieldOpts() : undefined);
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
    } else if (key === 'caught' || key === 'bowled' || key === 'lbw' || key === 'hitwicket' || key === 'stumped') {
      Sound.play(key === 'bowled' ? 'stumps' : key === 'lbw' || key === 'hitwicket' || key === 'stumped' ? 'wicket' : 'catchIt');
      if (key === 'bowled' || key === 'hitwicket' || key === 'stumped') Sound.play('sfx_bails');
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
      stumped:  ['outcome.stumped', '#ff4b4b', 120, 'marker_wicket'],
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

  // M19: how far the hit carried (metres, from the bat to where it first lands; the whole flight
  // if it never lands inside the path). Monster Hit, longest six, the record book.
  _hitDist() {
    const p = this.hit && this.hit.plan && this.hit.plan.path;
    if (!p || !p.n) return null;
    const end = p.bounces && p.bounces.length ? p.bounces[0] : p.n - 1;
    return Math.round(Math.hypot(p.x[end] - p.x[0], p.z[end] - p.z[0]));
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
      if (this.trailKind !== 'hit') { this.trail = []; this.trailKind = 'hit'; }
      this.trail.push({ x: b.x, y: b.y, z: b.z });
      if (this.trail.length > 16) this.trail.shift();
    } else if (this.state === 'delivery' && this.del && this._delTint()) {
      // M19: a swing or spin delivery leaves a faint coloured trail
      const d = this._ballPos();
      if (this.trailKind !== 'del') { this.trail = []; this.trailKind = 'del'; }
      if (d) { this.trail.push({ x: d.x, y: d.y, z: d.z }); if (this.trail.length > 12) this.trail.shift(); }
    } else if (this.trail.length && this.state !== 'inplay') {
      this.trail.shift();
    }
  },
  _delTint() {
    const fam = this.del && this.del.family && typeof Bowling !== 'undefined' && Bowling.family(this.del.family);
    if (!fam) return null;
    const k = fam.kind === 'spin' ? 'spin' : this.del.swing ? 'swing' : 'pace';
    return BATTING_DATA.trail.delivery[k];
  },
  // The colour of a hit's trail: gold when perfect, the bat's rarity in a career (M19), else white.
  _hitTint() {
    const T0 = BATTING_DATA.trail;
    if (this.hit && this.hit.perfect) return T0.perfect;
    if (typeof CareerMatch !== 'undefined' && CareerMatch.on && CareerMatch.career && this.inn && this.inn.battingSide === 'player' && typeof Gear !== 'undefined') {
      const it = Gear.item(Gear.equipped(CareerMatch.career).bat), col = it && it.rarity !== 'common' ? Gear.rarity(it).colour : null;
      if (col) { const n = parseInt(col.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
    }
    return T0.plain;
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
      const H = highlight === 'big' ? C.big : C.highlight;
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
  // M19: big moments (a perfect six, a hat-trick, a rival out, the ball that wins a final) get a slow,
  // low wide shot of the middle; the first time it plays in full, after that it's shorter (skippable).
  _highlightOn() {
    if (this.moment && this.moment.id === 'anim_hit_wicket') return true;
    if (this.outcome && this.state === 'outcome') {
      if (this.outcome._big === undefined) this.outcome._big = this._isBig(this.outcome.key);
      if (this.outcome._big && this.stateT < (this.outcome.bigHold || this._bigHold())) return 'big';
    }
    return !!(this.outcome && this.state === 'outcome' && (this.outcome.key === 'bowled' || this.outcome.key === 'hitwicket' || this.outcome.key === 'stumped')
      && this.stateT < BATTING_DATA.camera.highlight.hold);
  },
  _markBigSeen() { if (Save.data) { Save.data.flags = Save.data.flags || {}; Save.data.flags.bigCamSeen = 1; } },
  _bigHold() {
    const B = BATTING_DATA.camera.big, seen = Save.data && Save.data.flags && Save.data.flags.bigCamSeen;
    return seen ? B.holdAgain : B.hold;
  },
  _isBig(key) {
    const inn = this.inn;
    if (!inn || !inn.log || typeof Match === 'undefined' || !Match.teams) return false;
    const e = inn.log[inn.log.length - 1];
    let big = false;
    if (key === 'six' && this.hit && this.hit.perfect) big = true;
    if (e && e.o && e.o !== 'runout' && e.w) {                         // a hat-trick: this bowler's last three legal balls all wickets
      const mine = inn.log.filter((x) => x.w === e.w && x.k === 'l').slice(-3);
      if (mine.length === 3 && mine.every((x) => x.o && x.o !== 'runout')) big = true;
    }
    if (e && e.o) { const b = Match.teams[inn.battingSide].players[e.b - 1]; if (b && b.isRival) big = true; }
    if (inn.ended && CareerMatch.on && CareerMatch.fixture && CareerMatch.fixture.kind === 'final' && inn.target && inn.runs >= inn.target && inn.battingSide === 'player') big = true;
    return big;
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

    // M18: everyone in their team's colours with their own looks (game/kitlook.js)
    KitLook._inMatch = !!this.showNonStriker;
    const W = this._people(), AK = BATTING_DATA.anim.sizeK, cel = this._celebrate();
    const addA = (a, x, z, look, kit) => add('anim_' + a.id + ':' + a.frame, x, 0, z, { scale: AK, flip: !!a.flip, kl: { act: a.id, frame: a.frame, look, kit } });

    const brokenT = Math.min(1.5, Math.max(0, Stadium._time - (this.stumpsBrokenAt || 0)));
    add('stumps', 0, 0, 0, this.stumpsBroken ? { broken: brokenT, back: this.stumpsBroken === 'hitwicket' } : {});
    add('stumps', 0, 0, PI.length, {});
    const ua = this._umpireAnim();
    if (ua) addA(ua, -1.3, PI.length + 1.6, KitLook.umpire(), KitLook.umpireKit());
    else add('umpire', -1.3, 0, PI.length + 1.6, { finger: Moments.fingerUp(this) });

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
    // M16: the rendered run-up and bowling action, when its frames are in (else the art / stand-in above).
    let ba = this._bowlerAnim(ph, bz);
    if (ba && cel && cel.wicket && this._anim('cele_bowler')) ba = { id: 'cele_bowler', frame: this._f01(this._anim('cele_bowler'), cel.t / BATTING_DATA.anim.celeTime), z: ba.z };
    if (ba) addA(ba, bx, ba.z, W.bowler, W.fieldKit);
    else add('bowler', bx, 0, bz, bopts);

    // Fielders
    const hitT = this.hit ? this.hit.t : 0;
    const active = this.hit && this.hit.plan.fielder;
    const dv = this.hit && this.hit.dive && this.hit.dive.result ? this.hit.dive : null;   // a diving stop (M15)
    let fi = -1;
    for (const f of Fielding.fielders()) {
      fi++;
      let fx = f.x, fz = f.z, running = false, catching = false, rot = 0;
      const st = { dive: null, catchT: null, throwT: null, ran: 0, running: false };      // M16 action frames
      if (dv && dv.id === f.id && !(dv.result === 'missed' && active && active.id === f.id && hitT > dv.t + 0.6)) {
        // Run toward the ball, then slide the last bit on the ground (all the way if it was stopped).
        const dx = dv.x - f.x, dz = dv.z - f.z, dist = Math.hypot(dx, dz);
        const ranTo = Math.min(dist, Math.max(0, hitT - F.reaction) * F.fielderSpeed);
        const k = Math.max(0, Math.min(1, (hitT - dv.t + 0.3) / 0.3));
        const to = dist * (dv.result === 'saved' ? 1 : 0.85);
        const moved = ranTo + Math.max(0, to - ranTo) * k;
        if (dist > 0) { fx += dx / dist * moved; fz += dz / dist * moved; }
        running = k === 0 && ranTo < dist;
        rot = (dv.dir || 1) * 1.35 * k;
        if (k > 0) st.dive = { k, dir: dv.dir || 1 }; else { st.ran = ranTo; st.running = running; }
      } else if (active && active.id === f.id) {
        const dx = active.to.x - f.x, dz = active.to.z - f.z;
        const dist = Math.hypot(dx, dz);
        const need = active.chase ? dist : Math.max(0, dist - F.reach * 0.6);
        const moved = Math.min(need, Math.max(0, hitT - F.reaction) * F.fielderSpeed);
        if (dist > 0) { fx += dx / dist * moved; fz += dz / dist * moved; }
        running = moved > 0 && moved < need;
        catching = this.hit.plan.result === 'caught' && hitT > this.hit.plan.endT - 0.4;
        st.ran = moved; st.running = running;
        const M = BATTING_DATA.anim, th = this.hit.throw;
        if (this.hit.plan.result === 'caught' && hitT >= this.hit.plan.endT - M.catchBefore) st.catchT = hitT - this.hit.plan.endT;
        else if (th && hitT >= th.t0 - M.throwBefore) st.throwT = hitT - th.t0;
      }
      let fa = f.keeper ? (st.catchT !== null && this._anim('keep_take') ? { id: 'keep_take', frame: this._fAround(this._anim('keep_take'), this._anim('keep_take').contact, st.catchT, BATTING_DATA.anim.catchBefore, BATTING_DATA.anim.catchAfter) } : this._keeperAnim())
        : this._fielderAnim({ z: fz }, st);
      // a wicket: the fielders jump (once a catch is safely held), each a moment apart
      if (fa && cel && cel.wicket && !f.keeper && !st.dive && (st.catchT === null || st.catchT > BATTING_DATA.anim.catchAfter)) {
        const id = 'cele_team' + (fz > BATTING_DATA.anim.backFromZ ? '_b' : ''), A = this._anim(id);
        if (A) fa = { id, frame: this._f01(A, (cel.t - (fi % 3) * 0.12) / BATTING_DATA.anim.celeTime) };
      }
      if (fa) addA(fa, fx, fz, W.fielder(fi, f), W.fieldKit);
      else add(f.keeper ? 'keeper' : 'fielder', fx, 0, fz, { run: running ? hitT * 14 : 0, catching, rot });
    }

    // Batter
    const swing = this._swingProgress();
    const bp = this._batPose(swing);
    const batterItemOpts = { bat: bp.a, batLen: bp.len, lean: this.shot && this.shot.id !== 'defend' ? 0.4 : 0 };
    if (Sprites.has('batter')) {
      // Single-pose art: lean into the shot while swinging.
      const s = swing === null ? 0 : Math.sin(Math.min(1, swing) * Math.PI);
      batterItemOpts.rot = this.shot && this.shot.id === 'defend' ? s * 0.05 : s * 0.13;
    }
    const pos = this._batterPositions();
    if (pos.running) { batterItemOpts.rot = Math.sin(this.hit.t * 18) * 0.06; }
    // M16: the rendered frames while batting at the crease: stance, backlift, then each shot's own action.
    // M18: running between the wickets (run, reach / dive for the crease), the walk off when out,
    // the bat raised for a 50 or 100.
    const M = BATTING_DATA.anim, hasRun = this.hit && this.hit.running && (this.hit.running.cur || this.hit.running.completed > 0);
    let bf = hasRun ? this._runnerAnim('s') : this._batterAnim(swing), sz = pos.striker.z;
    if (cel && cel.wicket && !cel.runout && this._anim('bat_walkoff')) {
      const A = this._anim('bat_walkoff');
      bf = { id: 'bat_walkoff', frame: this._fLoop(A, Math.max(0, cel.t - M.walkDelay) * M.walkSpeed / A.cycleM * A.frames) };
      sz += Math.max(0, cel.t - M.walkDelay) * M.walkSpeed;
    } else if (cel && cel.mile && this._anim('bat_raise')) bf = { id: 'bat_raise', frame: this._f01(this._anim('bat_raise'), cel.t / M.celeTime) };
    if (bf) addA(bf, pos.striker.x, sz, W.striker, W.batKit);
    else add('batter', pos.striker.x, 0, pos.striker.z, batterItemOpts);
    const batterItem = items[items.length - 1];
    if (pos.nonStriker) {
      const nf = this._runnerAnim('n');
      if (nf) addA(nf, pos.nonStriker.x, pos.nonStriker.z, W.nonStriker, W.batKit);
      else add('batter', pos.nonStriker.x, 0, pos.nonStriker.z,
        { bat: 1.6, rot: pos.running ? Math.sin(this.hit.t * 18 + 1) * 0.06 : 0 });
    } else if (this.showNonStriker && this.camMode === 'follow' && this._anim('ns_ready')) {
      // the non-striker (out of the pitch camera's shot until the ball is hit): backed up, watching
      addA({ id: 'ns_ready', frame: 0 }, M.nsX, PI.length - M.nsBackedUp, W.nonStriker, W.batKit);
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
      const kl = it.opts.kl;
      if (!(kl && KitLook.draw(kl.act, kl.frame, it.p.x, it.p.y, it.p.s, it.opts, kl.look, kl.kit))) Sprites.draw(it.id, it.p.x, it.p.y, it.p.s, it.opts);
      if (it === ballItem && Access.on('contrastBall')) {
        R.circle(it.p.x, it.p.y, it.opts.r + 5, null, '#000000', 5);
        R.circle(it.p.x, it.p.y, it.opts.r + 10, null, '#fff35c', 4);
      }
      if (it === batterItem && it.id === 'batter' && Sprites.has('batter')) this._drawSwoosh(ctx, it.p, swing);
    }
    if (!ballItem) this._drawTrail(ctx);
  },

  // ---- M16: rendered action frames (data/anims.js); null = not in yet, use the single pose ----
  // Only once EVERY frame has loaded (a half-loaded set would make the player blink out).
  _anim(id) {
    const A = typeof ANIM_DATA !== 'undefined' && ANIM_DATA[id];
    if (!A) return null;
    if (A._ready) return A;
    if (!PitchScene._animLoad) { PitchScene._animLoad = true; Sprites.loadGroup('match-anims'); }   // (boot normally started it)
    for (let i = 0; i < A.frames; i++) if (!Sprites.has('anim_' + id + ':' + i) || (A.masks && !Sprites.has('animm_' + id + ':' + i))) return null;
    if (A.ownHead && !KitLook.headsReady()) return null;     // (M18: never a player without a head)
    A._ready = true;
    return A;
  },
  // A frame from a 0..1 progress through an action (clamped), or a looping one from a count.
  _f01(A, k) { return Math.max(0, Math.min(A.frames - 1, Math.round(k * (A.frames - 1)))); },
  _fLoop(A, n) { return ((Math.floor(n) % A.frames) + A.frames) % A.frames; },
  // Frames before / after a key frame: from `start` to `key` the action plays 0..key, then key..last over `after`.
  _fAround(A, key, t, before, after) {
    const last = A.frames - 1;
    if (t < 0) return Math.max(0, Math.min(key, Math.round(key * (1 + t / before))));
    return Math.min(last, Math.round(key + (last - key) * Math.min(1, t / after)));
  },

  // Which batting action this shot plays (M16 Job 3): the button, where it's aimed (or the line
  // of the ball), the bowler type and the height of the ball. Picked once, when the swing starts.
  shotAction(sh) {
    if (!sh || sh.leave) return null;
    if (sh.anim !== undefined) return sh.anim;
    const P = BATTING_DATA.anim.pick, PI = BATTING_DATA.pitch, DIR = BATTING_DATA.direction;
    let id;
    if (sh.id === 'defend') id = 'bat_defence';
    else {
      const aim = sh.aim || (this.ai && this.ai.aim) || (typeof BatControls !== 'undefined' && this.ai === undefined ? BatControls.aim() : null);
      const tI = this.del && this.del.sim ? this.del.sim.contactIdx * CONFIG.PHYSICS_STEP : 0;
      const ball = this.del && this.del.sim ? this.del.sim.path.at(tI, {}) : { x: PI.reachCentreX, y: 0.8 };
      const dir = aim && aim.active ? aim.x * DIR.maxAim : Math.max(-45, Math.min(45, (ball.x - PI.reachCentreX) * DIR.autoFromLine));
      const spin = this.del && this.del.kind === 'spin', high = ball.y >= P.highBall, up = aim && aim.active && aim.y <= P.loftAim;
      if (dir >= P.cutFrom) id = 'bat_cut';
      else if (dir <= P.legFrom) id = spin && !high ? 'bat_sweep' : 'bat_pull';
      else if (high && sh.id === 'power') id = 'bat_pull';
      else id = sh.id === 'power' || up ? 'bat_lofted' : 'bat_cover_drive';
    }
    sh.anim = id;
    return id;
  },

  // The striker at the crease: stance (a small bat tap) while waiting, the backlift as the ball
  // comes, then the shot's own action with bat-on-ball on its contact frame (the swing reaches
  // the ball half way through, see _swingProgress), then the finish. null = no frames yet.
  _batterAnim(swing) {
    const M = BATTING_DATA.anim;
    if (swing !== null && this.shot) {
      const id = this.shotAction(this.shot), A = id && (this._anim(id) || this._anim('bat_cover_drive'));
      if (!A) return null;
      const use = this._anim(id) ? id : 'bat_cover_drive', hit = A.contact, last = A.frames - 1;
      const p = Math.min(1.2, swing);
      const f = p <= 0.5 ? hit * (p / 0.5) : hit + (last - hit) * Math.min(1, (p - 0.5) / 0.6);
      return { id: use, frame: Math.max(0, Math.min(last, Math.round(f))) };
    }
    if (this.state === 'delivery') {
      const A = this._anim('bat_backlift');
      return A ? { id: 'bat_backlift', frame: this._f01(A, this.dT / BATTING_DATA.swing.backliftTime) } : null;
    }
    const A = this._anim('bat_stance');
    return A ? { id: 'bat_stance', frame: this._fLoop(A, (this.stateT || 0) * M.stanceFps) } : null;
  },

  // The bowler: the run-up stride cycle, then the delivery stride (the frames carry him forward
  // themselves, so he's drawn from the release spot), release on the release frame, then the
  // follow-through. Spinners use their own action.
  _bowlerAnim(ph, runZ) {
    const D = BATTING_DATA.delivery, M = BATTING_DATA.anim, at = D.releaseZ + 0.5;
    const id = this.del && this.del.kind === 'spin' && this._anim('bowl_spin') ? 'bowl_spin' : 'bowl_fast';
    const A = this._anim(id);
    if (!A) return null;
    const S = M.stride[id], rel = A.release, last = A.frames - 1;
    if (ph.after < 0) {
      const e = Math.max(0, Math.min(1, ph.runT));
      if (e < S.from) {
        const R = this._anim('bowl_run');
        if (R) return { id: 'bowl_run', frame: this._fLoop(R, (D.runUpStartZ - runZ) / R.cycleM * R.frames), z: runZ };
        return { id, frame: 0, z: runZ - S.back };
      }
      return { id, frame: Math.round(rel * (e - S.from) / (1 - S.from)), z: at };
    }
    return { id, frame: Math.min(last, Math.round(rel + (last - rel) * Math.min(1, ph.after / M.followTime))), z: at };
  },

  // A fielder (M16 Job 5): ready, running, catching, diving, throwing. Fielders between the camera
  // and the batter are seen from behind ('_b' frames). null = no frames yet (the drawn stand-in).
  _fielderAnim(f, st) {
    const M = BATTING_DATA.anim, back = f.z > M.backFromZ ? '_b' : '';
    const pick = (base) => { const id = base + back; const A = this._anim(id); return A ? { id, A } : null; };
    if (st.dive) {
      const a = pick('field_dive');
      // the frames dive to the right of the screen seen from the front (to the left from behind)
      if (a) return { id: a.id, frame: this._f01(a.A, st.dive.k), flip: back ? st.dive.dir > 0 : st.dive.dir < 0 };
    }
    if (st.catchT !== null) {
      const a = pick('field_catch');
      if (a) return { id: a.id, frame: this._fAround(a.A, a.A.contact, st.catchT, M.catchBefore, M.catchAfter) };
    }
    if (st.throwT !== null) {
      const a = pick('field_throw');
      if (a) return { id: a.id, frame: this._fAround(a.A, a.A.release, st.throwT, M.throwBefore, M.throwAfter) };
    }
    if (st.ran > 0 && st.running) {
      const a = pick('field_run');
      if (a) return { id: a.id, frame: this._fLoop(a.A, st.ran / a.A.cycleM * a.A.frames) };
    }
    const a = pick('field_ready');
    return a ? { id: a.id, frame: 0 } : null;
  },

  // The keeper: crouched, rises as the ball reaches the batter, takes it on the contact frame
  // when it goes through (missed / left), stays half up when it's hit.
  _keeperAnim() {
    const A = this._anim('keep_take'), M = BATTING_DATA.anim;
    if (!A) return null;
    if (!this.del || !this.del.sim || (this.state !== 'delivery' && this.state !== 'outcome' && this.state !== 'inplay')) return { id: 'keep_take', frame: 0 };
    const tI = this.del.sim.contactIdx * CONFIG.PHYSICS_STEP;
    const now = this.dT + (this.hit ? this.hit.t : 0);
    const t = now - tI - M.keeperDelay;
    const f = this._fAround(A, A.contact, t, M.keeperRise, M.keeperAfter);
    return { id: 'keep_take', frame: this.hit ? Math.min(f, M.keeperHitFrame) : f };
  },

  // ---- M18: who's who on the pitch (looks + kits), the umpire, running, celebrations ----
  _people() {
    const T = KitLook._inMatch && typeof Match !== 'undefined' ? Match.teams : null;
    const inn = T && Match.current ? Match.current() : null;
    const kits = KitLook.kits();
    const batSide = inn ? inn.battingSide : 'player', fieldSide = batSide === 'player' ? 'ai' : 'player';
    const bt = T && T[batSide], ft = T && T[fieldSide];
    const stand = (id) => ({ id, name: id });
    const byNo = (t, n) => (t && n ? t.players.find((p) => p.no === n) : null);
    // the striker of this ball (inn.striker may already have changed ends after the runs)
    const st = this.batterP && bt && bt.players.includes(this.batterP) ? this.batterP : byNo(bt, inn && inn.striker);
    const ns = inn ? byNo(bt, st && st.no === inn.striker ? inn.nonStriker : inn.striker) : null;
    const bid = inn && inn.overBowlers ? inn.overBowlers[inn.overBowlers.length - 1] : null;
    const bowler = (this.bowlerP && ft && ft.players.includes(this.bowlerP) ? this.bowlerP : ft && ft.players.find((p) => p.id === bid)) || stand('bowler');
    const rest = ft ? ft.players.filter((p) => p !== bowler) : [];
    const keeper = rest.find((p) => p.keeper) || rest[0] || stand('keeper');
    const others = rest.filter((p) => p !== keeper);
    return {
      batKit: kits[batSide], fieldKit: kits[fieldSide],
      striker: KitLook.of(st || stand('striker'), bt), nonStriker: KitLook.of(ns || stand('nonstriker'), bt),
      bowler: KitLook.of(bowler, ft),
      fielder: (i, f) => KitLook.of(f.keeper ? keeper : (others.length ? others[i % others.length] : stand('fielder' + i)), ft),
    };
  },
  // After the ball: a wicket (the bowler and fielders celebrate, the batter walks off) or a batter's 50 / 100.
  _celebrate() {
    const o = this.state === 'outcome' && this.outcome;
    if (!o || !o.res) return null;
    return { t: this.stateT || 0, wicket: !!o.res.wicket, runout: o.key === 'runout', mile: !!o.mile };
  },
  // The umpire: standing (seen from behind), then the signal for the ball.
  _umpireAnim() {
    const M = BATTING_DATA.anim, o = this.state === 'outcome' && this.outcome;
    let id = null, done = false;
    if (Moments.fingerUp(this)) { id = 'ump_out'; done = true; }
    else if (o && o.res) {
      if (o.res.wicket) id = 'ump_out';
      else if (o.key === 'six') id = 'ump_six';
      else if (o.key === 'four') id = 'ump_four';
      else if (o.key === 'wide') id = 'ump_wide';
      else if (this.extraKind === 'noball') id = 'ump_noball';
    }
    const A = id && this._anim(id);
    if (A) return { id, frame: done ? A.frames - 1 : this._f01(A, Math.max(0, (this.stateT || 0) - M.umpDelay) / (M.umpTime[id] || M.umpTime.other)) };
    return this._anim('ump_stand') ? { id: 'ump_stand', frame: 0 } : null;
  },
  // A batter running between the wickets ('s' = this ball's striker, 'n' = the non-striker):
  // seen from the front running towards the camera's end, from behind running away; the bat
  // reached over the line at the end of each run (a dive when a throw is coming in).
  _runnerAnim(who) {
    const run = this.hit && this.hit.running;
    if (!run) return null;
    const M = BATTING_DATA.anim, t = this.hit.t;
    // which way: the striker runs to the far end (towards the camera) on even-numbered runs
    const towards = (run.completed % 2 === 0) === (who === 's');
    if (run.cur && !run.cur.back) {
      const k = (t - run.cur.start) / Math.max(0.001, run.cur.dur), b = towards ? '' : '_b';
      if (k > 1 - M.groundK) {
        const th = this.hit.throw, dive = th && t >= th.t0 && this._anim('bat_dive' + b);
        const id = (dive ? 'bat_dive' : 'bat_ground') + b, A = this._anim(id);
        if (A) return { id, frame: this._f01(A, (k - (1 - M.groundK)) / M.groundK) };
      }
      const id = 'bat_run' + b, A = this._anim(id);
      return A ? { id, frame: this._fLoop(A, Math.max(0, t - run.cur.start) * M.runSpeed / A.cycleM * A.frames) } : null;
    }
    // stopped (or walking back): the last reach for the crease, held
    const last = run.completed % 2 === 1 ? who === 's' : who !== 's';     // the last run was towards the camera
    const id = 'bat_ground' + (last ? '' : '_b'), A = this._anim(id);
    return A ? { id, frame: A.frames - 1 } : null;
  },

  // 0..1 through the swing, or null when not swinging.
  _swingProgress() {
    const sh = this.shot;
    if (!sh || sh.leave) return null;
    const now = this.state === 'delivery' ? this.dT : (this.hit ? this.dT + this.hit.t : this.dT);
    const p = (now - sh.swingStart) / this._swingTime(sh.id);
    return p < 0 ? null : Math.min(1.2, p);
  },

  // M16: a cricket swing, not a baseball one. The bat moves in a plane that runs straight down the
  // pitch: up into the backlift, down past the front pad at contact, then up into a high finish.
  // th = the bat's angle in that plane (0 = pointing straight down, + = back towards the keeper,
  // - = towards the bowler and up). Seen from the bowler's end the bat mostly goes up and down,
  // and looks shorter as it points at us or away. Tuning: BATTING_DATA.swing.
  _batPose(swing) {
    const sh = this.shot, W = BATTING_DATA.swing;
    let th, side;
    if (swing === null) {
      if (this.state === 'delivery') { const k = Math.min(1, this.dT / W.backliftTime); th = W.stance + (W.backlift - W.stance) * k; side = W.stanceSide + (W.backliftSide - W.stanceSide) * k; }
      else { th = W.stance + Math.sin(this.stateT * 3) * 0.05; side = W.stanceSide; }
    } else {
      const p = Math.min(1, swing), F = sh.id === 'defend' ? W.defend : sh.id === 'power' ? W.power : W.control;
      // ease in: the bat speeds up into the ball, then slows into the finish
      const e = p < F.contactAt ? (p / F.contactAt) ** 1.6 * F.contactAt : p;
      th = e <= F.contactAt ? W.backlift + (0 - W.backlift) * (e / F.contactAt)
        : 0 + (F.finish - 0) * ((e - F.contactAt) / (1 - F.contactAt));
      side = e <= F.contactAt ? W.backliftSide * (1 - e / F.contactAt) : F.finishSide * ((e - F.contactAt) / (1 - F.contactAt));
    }
    const dx = side, dy = Math.cos(th);
    return { a: Math.atan2(dy, dx), len: Math.hypot(dx, dy) };
  },
  _batAngle(swing) { return this._batPose(swing).a; },

  // Code-drawn swing arc for the single-pose batter art (a trail effect, not art).
  _drawSwoosh(ctx, p, swing) {
    if (swing === null || swing > 1.15) return;
    const s = p.s;
    // M16: the bat comes straight down the line, so the trail is a tall, thin loop (down at the
    // front pad, up into the finish), not a flat circle round the body (that looked like baseball).
    const cx = p.x + 0.06 * s, cy = p.y - 1.15 * s;
    const ry = 0.95 * s, rx = 0.2 * s;
    const defend = this.shot.id === 'defend';
    const t0 = -Math.PI / 2, t1 = defend ? 0.35 * Math.PI : 1.45 * Math.PI;
    const head = t0 + (t1 - t0) * Math.min(1, swing);
    const tail = t0 + (t1 - t0) * Math.max(0, Math.min(1, swing) - 0.4);
    const fade = swing > 1 ? 1 - (swing - 1) / 0.15 : 1;
    ctx.save();
    ctx.globalAlpha = 0.75 * fade;
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.hit && this.hit.perfect ? '#ffd23f' : '#ffffff';
    ctx.lineWidth = Math.max(4, 0.12 * s);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, tail, head, false);
    ctx.stroke();
    ctx.restore();
  },

  _drawTrail(ctx) {
    if (this.trail.length < 2) return;
    const del = this.trailKind === 'del', gold = !del && this.hit && this.hit.perfect;
    const col = del ? this._delTint() : this._hitTint();
    if (!col) return;
    const amax = del ? BATTING_DATA.trail.deliveryAlpha : gold ? 0.9 : col === BATTING_DATA.trail.plain ? 0.6 : 0.8;
    let prev = null;
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const p = View3D.project(t.x, t.y, t.z);
      if (p && prev) {
        const k = i / this.trail.length;
        R.line(prev.x, prev.y, p.x, p.y, `rgba(${col},${k * amax})`, Math.max(2, (gold ? 14 : del ? 6 : 8) * k));
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
