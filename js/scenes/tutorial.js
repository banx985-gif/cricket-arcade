// Cricket Arcade — the first-time tutorial (plan 26, 39). Rules: Tutorial (game/meta.js).
//   WelcomePanel    first launch: basic accessibility / audio, START or SKIP (on the Title)
//   TutorialScene   'tutorial': the steps between lessons (intros, the first reward,
//                   the first match's result), and running the lessons
//   TutorialCoach   one prompt at a time during a lesson, with an arrow to the control
//   TutorialTour    the Career Home tour (Selection Meter, training, equipment, next fixture)
// The lessons and the first match run on the real match engine (MissionMatch.startDef).
// Replayable from Settings with a temporary tutorial character.

const WelcomePanel = {
  buttons: new ButtonList(),
  layout(done) {
    const b = this.buttons, cx = CONFIG.LOGICAL_W / 2, st = () => Save.data.settings;
    b.clear();
    b.add(() => T('welcome.sound', { s: T(st().muted ? 'settings.off' : 'settings.on') }), cx + 20, 450, 420, 96, () => { Save.setMuted(!st().muted); }, { size: 28, color: '#e9eef5' });
    b.add(() => T('welcome.text', { s: T('settings.textSize.' + (st().textSize || 'normal')) }), cx + 20, 560, 420, 96, () => { Save.setSetting('textSize', st().textSize === 'large' ? 'normal' : 'large'); }, { size: 28, color: '#e9eef5' });
    b.add(() => T('welcome.flash', { s: T(st().reduceFlash ? 'settings.on' : 'settings.off') }), cx + 20, 670, 420, 96, () => { Save.setSetting('reduceFlash', !st().reduceFlash); }, { size: 26, color: '#e9eef5' });
    b.add('welcome.start', cx + 20, 820, 420, 120, () => { Tutorial.setStep(Save.data, 'create'); Save.write(); done(); Scenes.go('careercreate', { slot: 1 }); }, { size: 44, color: '#9cff6a' });
    b.add('welcome.skip', cx - 460, 850, 420, 96, () => { Tutorial.skip(Save.data); Save.write(); done(); }, { size: 26, color: '#e9eef5' });
  },
  draw(ctx) {
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2;
    ctx.fillStyle = 'rgba(4,10,18,0.9)'; ctx.fillRect(v.x, v.y, v.w, v.h);
    R.panel(cx - 900, 60, 1800, 960, 'rgba(12,26,44,0.97)', '#ffd23f');
    Sprites.ui('logo_banx_gamex', cx - 820, 150, 120, 144);
    R.text(T('welcome.title'), cx, 140, 60, '#ffffff');
    R.text(T('welcome.sub'), cx, 205, 26, '#d8e4f0', 'center', false);
    if (!Sprites.ui('tutorial_intro', cx - 440, 560, 760, 560)) R.panel(cx - 820, 280, 760, 560);
    R.text(T('welcome.setup'), cx + 230, 390, 30, '#ffd23f');
    this.buttons.draw();
    R.text(T('welcome.skipHint'), cx - 250, 960, 18, '#8a96a3', 'center', false);
  },
};

// ---- one prompt at a time during a lesson ----
const TutorialCoach = {
  kind: null, i: 0, steps: [], nice: 0, _aim0: null,
  begin(kind) { this.kind = kind; this.steps = TUTORIAL_DATA[kind]; this.i = 0; this.nice = 0; this._aim0 = null; },
  keep(kind) { if (this.kind !== kind) this.begin(kind); },     // a retried lesson keeps its progress
  step() { return this.steps[this.i] || null; },
  complete() { return !!this.kind && this.i >= this.steps.length; },
  _advance() {
    this.i++; this.nice = 1.2;
    Sound.play(this.complete() ? 'ui_unlock' : 'ui_confirm');
    if (this.complete()) Effects.text(T('tut.lessonDone'), CONFIG.LOGICAL_W / 2, 300, '#9cff6a', 70, { life: 2 });
  },
  // Things you did (from the scenes).
  event(name, data) {
    const st = this.step();
    if (!st || !MissionMatch.on || !MissionMatch.m.tutorial) return;
    if (name === 'pick' && st.id === 'pick') this._advance();
    if (name === 'release' && st.id === 'release' && (data === 'good' || data === 'perfect')) this._advance();
    if (name === 'swipe' && st.id === 'swipe') this._advance();
  },
  // A batting ball is over: { shot, grade, key, runs, boundary }
  ballEnd(o) {
    const st = this.step();
    if (!st) return;
    const hit = o.shot && o.shot !== 'leave' && ['perfect', 'good', 'early', 'late'].includes(o.grade) && o.key !== 'miss';
    const ok = { control: hit && o.shot === 'control', power: hit && o.shot === 'power', timing: o.grade === 'perfect' || (o.grade === 'good' && hit),
      run: o.runs >= 1, boundary: o.boundary > 0 }[st.id];
    if (ok) {
      if (st.id === 'boundary') { Effects.text(T('tut.boundaryWow'), CONFIG.LOGICAL_W / 2, 250, '#ffd23f', 90, { life: 2.2 }); Sound.play('fanfare'); Sound.play('crowd_roar'); Effects.flash(0.4, '#fff4c2'); }
      this._advance();
    }
  },
  // Polled every frame: the aim steps.
  _poll(scene) {
    const st = this.step();
    if (!st || st.id !== 'aim') return;
    if (this.kind === 'bat' && BatControls.aim().active) this._advance();
    if (this.kind === 'bowl' && scene.aim) {
      if (!this._aim0) this._aim0 = { x: scene.aim.x, z: scene.aim.z };
      if (Math.hypot(scene.aim.x - this._aim0.x, scene.aim.z - this._aim0.z) > 0.6) this._advance();
    }
  },
  _anchor(scene, id) {
    const s = Display.safe;
    switch (id) {
      case 'pad': return BatControls.home;
      case 'control': return BatControls.btn.control;
      case 'power': return BatControls.btn.power;
      case 'run': return { x: RunControls.run.x, y: RunControls.run.y };
      case 'ring': return { x: CONFIG.LOGICAL_W / 2, y: 470 };
      case 'slots': return BowlControls.slots[1] || BowlControls.bowl;
      case 'bowl': return BowlControls.bowl;
      case 'reticle': return BowlControls.home;
      case 'swipe': return { x: CONFIG.LOGICAL_W / 2, y: s.top + 262 };
    }
    return null;
  },
  draw(ctx, scene) {
    this._poll(scene);
    if (this.nice > 0) this.nice -= 1 / 60;
    const st = this.step(), cx = CONFIG.LOGICAL_W / 2, s = Display.safe;
    if (!st) return;
    const y = s.top + 190, key = 'tut.' + this.kind + '.' + st.id;
    R.roundRect(cx - 560, y - 50, 1120, 110, 30, 'rgba(8,20,36,0.9)', '#ffd23f', 4);
    R.text(T('tut.stepOf', { n: this.i + 1, t: this.steps.length }), cx - 530, y - 22, 20, '#ffd23f', 'left', false);
    R.text(T(key), cx, y + 14, 32, '#ffffff');
    const a = this._anchor(scene, st.anchor);
    if (a && a.x) {
      const pulse = 1 + Math.sin(performance.now() / 160) * 0.12;
      ctx.save();
      ctx.globalAlpha = 0.9;
      R.circle(a.x, a.y, 110 * pulse, null, '#ffd23f', 7);
      ctx.restore();
      // an arrow from the prompt towards the control
      const fx = cx + Math.max(-500, Math.min(500, a.x - cx)), fy = y + 64;
      const dx = a.x - fx, dy = a.y - 120 * pulse - fy, len = Math.hypot(dx, dy);
      if (len > 80) {
        const ex = fx + dx * (1 - 60 / len), ey = fy + dy * (1 - 60 / len);
        R.line(fx, fy, ex, ey, 'rgba(255,210,63,0.85)', 8);
        const ang = Math.atan2(dy, dx);
        R.poly([{ x: ex + Math.cos(ang) * 26, y: ey + Math.sin(ang) * 26 }, { x: ex + Math.cos(ang + 2.4) * 22, y: ey + Math.sin(ang + 2.4) * 22 }, { x: ex + Math.cos(ang - 2.4) * 22, y: ey + Math.sin(ang - 2.4) * 22 }], '#ffd23f');
      }
    }
  },
};

// ---- the steps between lessons ----
const TutorialScene = {
  buttons: new ButtonList(),
  phase: 'batIntro', slot: 1, career: null, out: null, replay: false, _t: 0,

  enter(params) {
    CareerAssets.ensure(); GearAssets.ensure();
    this._t = 0;
    if (params.slot) this.slot = params.slot;
    if ('career' in params) this.career = params.career;
    if (params.replay !== undefined) this.replay = !!params.replay;
    if (params.replay) TutorialCoach.kind = null;          // a replay starts the prompts again
    this.out = params.out || null;
    this.phase = params.phase || this.phase;
    if (this.phase === 'after') this._afterLesson();
    this._layout();
  },

  // Who plays the lessons: the new career player, or a temporary tutorial character
  // (a replay; a pure Batter still bowls with a tutorial bowler, plan 26 step 4).
  _hero(kind) {
    const c = this.career;
    if (!this.replay && c) {
      const b = Challenge.build({ kind: 'career', c });
      if (kind === 'bat' || (Career.bowls(c) && c.player.family !== 'fast')) return { e: b.player, pc: b.pc };
    }
    return kind === 'bat' ? 'rookie' : 'medium';
  },
  _lesson(kind) {
    const L = TUTORIAL_DATA.lessons[kind], hero = this._hero(kind);
    const def = Object.assign({ id: 'tut_' + kind, tutorial: kind, cat: 'tutorial', diff: TUTORIAL_DATA.lessonDiff, stars: [] }, JSON.parse(JSON.stringify(L)));
    if (kind === 'bat') def.hero = hero; else def.bowlers = [hero, 'spinner'];
    this.tempBowler = kind === 'bowl' && typeof hero === 'string';
    TutorialCoach.keep(kind);
    Scenes.go(MissionMatch.startDef(def));
  },
  _match() {
    const c = this.career, bowls = c && c.player.role === 'bowler';
    const M = TUTORIAL_DATA.match, base = bowls ? M.bowl : M.bat;
    const def = Object.assign({ id: 'tut_match', tutorial: 'match', cat: 'tutorial', diff: TUTORIAL_DATA.lessonDiff, stars: [] }, JSON.parse(JSON.stringify(base)));
    const b = Challenge.build({ kind: 'career', c }), hero = { e: b.player, pc: b.pc };
    if (bowls) def.bowlers = [hero, 'medium']; else def.hero = hero;
    Scenes.go(MissionMatch.startDef(def));
  },
  // A lesson (or the first match) just ended.
  _afterLesson() {
    const o = this.out || {};
    if (o.tutorial === 'bat') this.phase = o.cleared ? (this.replay ? 'bowlIntro' : 'reward') : 'batRetry';
    else if (o.tutorial === 'bowl') this.phase = o.cleared ? (this.replay ? 'replayDone' : 'matchIntro') : 'bowlRetry';
    else if (o.tutorial === 'match') { this._matchReward(!!o.cleared); this.phase = 'matchResult'; }
  },
  // The first match's result (plan 39 step 12): XP, Coins, the Selection Meter, stat growth.
  _matchReward(won) {
    const c = this.career, R0 = TUTORIAL_DATA.match.reward, save = Save.data;
    const lvl0 = c.player.level;
    const ups = Career.addXp(c, R0.xp);
    c.selection = (c.selection || 0) + (won ? R0.selection : Math.round(R0.selection / 2));
    save.currencies.coins = (save.currencies.coins || 0) + R0.coins;
    Modes.unlock(save, 'quickmatch');                   // plan 21.6: Quick Match after the tutorial match
    Tutorial.setStep(save, 'tour');
    this.matchOut = { won, xp: R0.xp, coins: R0.coins, selection: won ? R0.selection : Math.round(R0.selection / 2), level: ups ? c.player.level : 0, lvl0 };
    CareerSave.save(c, this.slot);
    Sound.play('ui_currency');
  },

  _layout() {
    const b = this.buttons, cx = CONFIG.LOGICAL_W / 2, save = Save.data;
    b.clear();
    const next = (label, fn, color) => b.add(label, cx + 60, 900, 520, 120, fn, { size: 44, color: color || '#9cff6a' });
    const skip = () => b.add('tut.skip', cx - 580, 915, 460, 96, () => this.skipAll(), { size: 28, color: '#e9eef5' });
    switch (this.phase) {
      case 'batIntro': case 'batRetry': next('tut.go', () => this._lesson('bat')); if (!this.replay) skip(); break;
      case 'reward': next('tut.continue', () => { this.phase = 'bowlIntro'; this._layout(); }); break;
      case 'bowlIntro': case 'bowlRetry': next('tut.go', () => this._lesson('bowl')); if (!this.replay) skip(); break;
      case 'matchIntro': next('tut.play', () => this._match()); skip(); break;
      case 'matchResult': next('tut.toHome', () => Scenes.go('careerhome', { slot: this.slot, career: this.career })); break;
      case 'replayDone': next('tut.backSettings', () => Scenes.go('settings'), '#e9eef5'); break;
    }
    if (this.phase === 'reward' && !this.rewardGiven) { this.rewardGiven = Tutorial.firstReward(save); Save.write(); Sound.play('ui_rare'); }
    if (this.phase === 'bowlIntro' && !this.replay) Tutorial.setStep(save, 'bowl');
    if (this.phase === 'batIntro' && !this.replay) Tutorial.setStep(save, 'bat');
  },
  // Skip the rest: the tutorial's unlocks happen, then Career Home (or the Title).
  skipAll() {
    const save = Save.data;
    if (this.replay) { this.replay = false; Scenes.go('settings'); return; }
    Tutorial.firstReward(save);
    Tutorial.skip(save);
    Save.write();
    if (this.career) Scenes.go('careerhome', { slot: this.slot, career: this.career }); else Scenes.go('title');
  },

  update(dt) { this._t += dt; Effects.update(dt); },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Enter' || code === 'Space') { const b = this.buttons.items.find((x) => x.color === '#9cff6a'); if (b) b.cb(); } },

  render(ctx) {
    CareerUI.bg(ctx, 'bg_scout_room', 0.55);
    const cx = CONFIG.LOGICAL_W / 2, p = this.phase;
    R.panel(cx - 860, 60, 1720, 800, 'rgba(12,26,44,0.95)', '#ffd23f');
    const title = { batIntro: 'tut.batTitle', batRetry: 'tut.batTitle', reward: 'tut.rewardTitle', bowlIntro: 'tut.bowlTitle', bowlRetry: 'tut.bowlTitle',
      matchIntro: 'tut.matchTitle', matchResult: 'tut.resultTitle', replayDone: 'tut.replayDone' }[p];
    R.text(T(title), cx, 130, 60, '#ffffff');
    const lines = (key) => T(key).split('|').forEach((ln, i) => R.text(ln, cx + 200, 260 + i * 50, 30, '#d8e4f0', 'center', false));
    if (p === 'batIntro' || p === 'batRetry' || p === 'bowlIntro' || p === 'bowlRetry' || p === 'matchIntro') {
      Sprites.ui('tutorial_intro', cx - 560, 470, 520, 400);
      lines(p.endsWith('Retry') ? 'tut.retry' : 'tut.' + p);
      if ((p === 'bowlIntro' || p === 'bowlRetry') && this.career && !(Career.bowls(this.career) && this.career.player.family !== 'fast')) R.text(T('tut.tempBowler'), cx + 200, 620, 24, '#9be7ff', 'center', false);
    } else if (p === 'reward') {
      const R0 = TUTORIAL_DATA.reward;
      Sprites.ui('menu_coin', cx - 300, 420, 160, 160);
      R.text(T('tut.coins', { n: R0.coins }), cx - 300, 560, 40, '#ffd23f');
      if (!Sprites.ui('gear_' + R0.item, cx + 300, 420, 220, 220)) R.circle(cx + 300, 420, 90, '#5b3a22');
      R.text(T('gear.' + R0.item), cx + 300, 560, 34, '#ffffff');
      R.text(T('tut.rewardHint'), cx, 680, 28, '#d8e4f0', 'center', false);
    } else if (p === 'matchResult') {
      const m = this.matchOut || {};
      R.text(T(m.won ? 'tut.matchWon' : 'tut.matchLost'), cx, 230, 48, m.won ? '#9cff6a' : '#ffb36b');
      const rows = [[T('tut.xp'), '+' + m.xp], [T('tut.coinsRow'), '+' + m.coins], [T('career.selection'), '+' + m.selection]];
      if (m.level) rows.push([T('tut.levelUp'), T('career.levelN', { n: m.level })]);
      rows.forEach(([k, v], i) => { R.text(k, cx - 300, 340 + i * 80, 34, '#b8c6d6', 'left', false); R.text(v, cx + 300, 340 + i * 80, 40, '#ffffff', 'right'); });
      R.text(T('tut.quickUnlocked'), cx, 720, 30, '#ffd23f');
    } else if (p === 'replayDone') lines('tut.replayDoneText');
    this.buttons.draw();
  },
};

// ---- the Career Home tour (plan 26 step 6) ----
const TutorialTour = {
  i: 0, on: false,
  start() { this.i = 0; this.on = true; },
  anchor(id) {
    const s = Display.safe, items = CareerHomeScene.buttons.items;
    const btn = (key) => { const b = items.find((x) => x.label === key); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h } : null; };
    if (id === 'selection') return { x: s.left + 570 + 420, y: 200, w: 840, h: 170 };
    return btn({ train: 'career.train', equipment: 'career.equipment', play: 'career.playNext' }[id]);
  },
  tap() {
    this.i++;
    Sound.play('ui_confirm');
    if (this.i >= TUTORIAL_DATA.tour.length) { this.on = false; Tutorial.finish(Save.data); Save.write(); Effects.text(T('tut.allDone'), CONFIG.LOGICAL_W / 2, 480, '#9cff6a', 60, { life: 2.5 }); }
  },
  draw(ctx) {
    if (!this.on) return;
    const id = TUTORIAL_DATA.tour[this.i], a = this.anchor(id), v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.restore();
    if (a) {
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.04;
      R.roundRect(a.x - a.w / 2 - 14, a.y - a.h / 2 - 14, a.w + 28, a.h + 28, 26, null, '#ffd23f', 8 * pulse);
    }
    const y = a && a.y > 540 ? 300 : 700;
    R.roundRect(cx - 620, y - 90, 1240, 190, 30, 'rgba(8,20,36,0.95)', '#ffd23f', 4);
    R.text(T('tut.tour.' + id), cx, y - 20, 38, '#ffffff');
    R.text(T('tut.tour.' + id + '.sub'), cx, y + 30, 24, '#d8e4f0', 'center', false);
    R.text(T('tut.tapNext', { n: this.i + 1, t: TUTORIAL_DATA.tour.length }), cx, y + 72, 20, '#ffd23f', 'center', false);
  },
};

// "NEW MODE UNLOCKED" and "PROFILE LEVEL UP" pop-ups (drawn over every screen by main.js).
const MetaToast = {
  _q() { return Modes.toasts.length ? Modes.toasts : Profile.toasts; },
  update(dt) {
    const q = this._q();
    if (!q.length || Achievements.toasts.length) return;
    q[0].t += dt * (q.length > 2 ? 2 : 1);
    if (q[0].t > 3) q.shift();
  },
  draw(ctx) {
    const q = this._q();
    if (!q.length || Achievements.toasts.length) return;          // (after any achievement pop-up, in the same place)
    const it = q[0], t = it.t, cx = CONFIG.LOGICAL_W / 2;
    const k = Math.max(0, Math.min(1, t / 0.25, (3 - t) / 0.3)), y = Display.safe.top + 20 - (1 - k) * 140;
    ctx.save(); ctx.globalAlpha = k;
    R.roundRect(cx - 420, y, 840, 110, 30, 'rgba(10,22,40,0.96)', '#9cff6a', 4);
    if (it.kind === 'level') {
      Sprites.ui('econ_profile_level', cx - 350, y + 55, 84, 84);
      R.text(T('profile.levelUp', { n: it.level }), cx - 290, y + 36, 32, '#9cff6a', 'left');
      R.text(it.reward ? Meta.rewardText(it.reward) : '', cx - 290, y + 78, 22, '#ffffff', 'left', false);
    } else {
      Sprites.ui('mode_locked', cx - 350, y + 55, 70, 70, { alpha: 0.4 });
      R.text(T('mode.unlocked'), cx - 290, y + 36, 24, '#9cff6a', 'left', false);
      R.text(T('mode.name.' + it.id), cx - 290, y + 76, 36, '#ffffff', 'left');
    }
    ctx.restore();
  },
};
