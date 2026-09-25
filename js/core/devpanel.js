// Cricket Arcade — hidden developer panel (plan 43A.3). Debug builds only:
// CONFIG.DEBUG_BUILD is switched off for release builds (publish.ps1 -Release).
// Open it with 5 quick taps on the TOP-LEFT corner of the screen (or the
// backquote ` key on a PC).
//
// Tabs:
//   MAIN  — seed, Golden Ball, slow-mo, hit-zone debug, FPS
//   JUMP  — go straight to any screen / mode (incl. a 1-over test match)
//   MATCH — force a match state: tie on the last ball, end the innings, free hit
//   SAVE  — inspect the save, print it, corrupt it (to test backup recovery), wipe it
// More commands are added as their systems arrive (career, items, …).

const Dev = {
  enabled: CONFIG.DEBUG_BUILD,
  open: false,
  tab: 'main',
  fixedSeed: null,        // when set, every new innings uses this seed
  forceGolden: false,     // next delivery is a Golden Ball
  slowmo: false,
  hitzone: false,
  showFps: false,
  matchFormat: null,      // quick match format override (e.g. 'test1')
  forceFate: null,        // next ball: 'lbw' | 'hitwicket' | 'padLeg' | 'bowled' (see BallPlay.fate)
  difficulty: null,       // Rivals strength override ('easy' | 'normal' | 'hard')
  pitch: null, weather: null,   // force match conditions (tests / art checks)
  _taps: [],
  _buttons: new ButtonList(),
  _msg: '',
  _msgT: 0,
  _saveLines: [],

  CORNER: 170,            // size of the secret tap zone (logical px)

  // Returns true if the touch was used by the panel (or its secret corner).
  pointerDown(id, x, y) {
    if (!this.enabled) return false;
    if (this.open) { this._buttons.down(id, x, y); return true; }
    const s = Display.safe;
    if (x < s.left + this.CORNER && y < s.top + this.CORNER) {
      const now = performance.now();
      this._taps.push(now);
      this._taps = this._taps.filter(t => now - t < 2000);
      if (this._taps.length >= 5) { this._taps = []; this.show(); return true; }
    }
    return false;
  },
  pointerMove(id, x, y) { if (this.open) { this._buttons.move(id, x, y); return true; } return false; },
  pointerUp(id) { if (this.open) { this._buttons.up(id); return true; } return false; },

  toggle() { if (this.open) this.hide(); else this.show(); },

  show() {
    if (!this.enabled) return;
    this.open = true;
    this._layout();
    Log.add('dev', 'panel opened');
  },

  hide() { this.open = false; },

  say(msg) { this._msg = msg; this._msgT = 2.5; },

  _state(on) { return on ? T('dev.on') : T('dev.off'); },

  _inMatch() {
    return (Scenes.currentName === 'matchbat' || Scenes.currentName === 'matchbowl') && Match.current();
  },

  _layout() {
    const b = this._buttons;
    b.clear();
    const cx = CONFIG.LOGICAL_W / 2;
    // tabs
    const tabs = ['main', 'jump', 'match', 'save'];
    tabs.forEach((t, i) => {
      b.add(() => T('dev.tab.' + t), cx - 620 + i * 310, 150, 300, 88, () => { this.tab = t; this._layout(); },
        { size: 30, color: this.tab === t ? '#ffd23f' : '#6b7a8c', textColor: this.tab === t ? '#000' : '#fff' });
    });
    const w = 600, h = 92, gap = 16;
    const L = cx - w - gap / 2, Rr = cx + gap / 2;
    const row = (i) => 270 + i * (h + gap);
    const opts = { size: 30, color: '#e9eef5' };
    const add = (col, i, label, fn, o) => b.add(label, col === 0 ? L : Rr, row(i), w, h, fn, Object.assign({}, opts, o || {}));

    if (this.tab === 'main') {
      add(0, 0, () => T('dev.setSeed'), () => this._askSeed());
      add(0, 1, () => T('dev.replaySeed'), () => { this.fixedSeed = RNG.seed; this.say(T('dev.seedNext', { seed: RNG.seed })); });
      add(0, 2, () => T('dev.clearSeed'), () => { this.fixedSeed = null; this.say(T('dev.seedRandom')); });
      add(1, 0, () => T('dev.golden', { state: this._state(this.forceGolden) }), () => { this.forceGolden = !this.forceGolden; });
      add(1, 1, () => T('dev.slowmo', { state: this._state(this.slowmo) }), () => { this.slowmo = !this.slowmo; });
      add(1, 2, () => T('dev.hitzone', { state: this._state(this.hitzone) }), () => { this.hitzone = !this.hitzone; });
      add(1, 3, () => T('dev.fps', { state: this._state(this.showFps) }), () => { this.showFps = !this.showFps; });
      add(0, 3, () => T('dev.layers', { state: this._state(Stadium.showLayers) }), () => { Stadium.showLayers = !Stadium.showLayers; });
      add(0, 4, () => T('dev.rivals', { state: T('dev.diff.' + (this.difficulty || PLAYER_DATA.quickMatchDifficulty)) }), () => {
        const k = ['easy', 'normal', 'hard'];
        this.difficulty = k[(k.indexOf(this.difficulty || PLAYER_DATA.quickMatchDifficulty) + 1) % 3];
      });
    } else if (this.tab === 'jump') {
      const go = (scene, params) => () => { this.hide(); Scenes.go(scene, params); };
      add(0, 0, () => T('dev.jump.title'), go('title'));
      add(0, 1, () => T('dev.jump.sixsmash'), go('sixsmash'));
      add(0, 2, () => T('dev.jump.wicketrush'), go('wicketrush'));
      add(0, 3, () => T('dev.jump.settings'), go('settings'));
      add(1, 0, () => T('dev.jump.match'), () => { this.matchFormat = null; go('toss')(); });
      add(1, 1, () => T('dev.jump.match1'), () => { this.matchFormat = 'test1'; go('toss', { format: 'test1' })(); });
    } else if (this.tab === 'match') {
      add(0, 0, () => T('dev.match.tieLastBall'), () => this._tieLastBall());
      add(0, 1, () => T('dev.match.tieNow'), () => this._tieNow());
      add(1, 0, () => T('dev.match.endInnings'), () => this._endInnings());
      add(1, 1, () => T('dev.match.freeHit'), () => this._matchDo((inn) => { inn.freeHit = true; this.say(T('dev.done')); }));
      add(0, 2, () => T('dev.match.forceLbw'), () => { this.forceFate = 'lbw'; this.say(T('dev.done')); });
      add(0, 3, () => T('dev.match.forceHitWicket'), () => { this.forceFate = 'hitwicket'; this.say(T('dev.done')); });
      add(0, 4, () => T('dev.match.forceLegNotOut'), () => { this.forceFate = 'padLeg'; this.say(T('dev.done')); });
      add(1, 2, () => T('dev.match.checkpoint'), () => this._matchDo(() => { Match.checkpoint('over'); this.say(T('dev.done')); }));
    } else if (this.tab === 'save') {
      add(0, 3, () => T('dev.save.print'), () => { console.log('[save]', JSON.stringify(Save.data, null, 2)); this.say(T('dev.save.printed')); });
      add(1, 3, () => T('dev.save.corrupt'), () => {
        Store.set(Save.KEYS.main, '{this is not a save').then(() => this.say(T('dev.save.corrupted')));
      }, { color: '#ffd9a0' });
      add(0, 4, () => T('dev.wipe'), () => {
        BootScene.pendingResume = null;
        Save.wipe().then(() => { this.say(T('dev.wiped')); this._refreshSave(); });
      }, { color: '#ffb3b3' });
      this._refreshSave();
    }
    b.add(() => T('dev.close'), cx - 200, 900, 400, 92, () => this.hide(), { size: 36 });
  },

  // ---- MATCH tab ----
  _matchDo(fn) {
    const inn = this._inMatch();
    if (!inn) { this.say(T('dev.match.notInMatch')); return null; }
    return fn(inn);
  },
  // The chase is level with one ball left: a dot ball ties the match.
  _tieLastBall() {
    this._matchDo((inn) => {
      if (!inn.target) { this.say(T('dev.match.chaseOnly')); return; }
      inn.runs = inn.target - 1;
      inn.legal = inn.maxBalls - 1;
      inn.thisOver = [];
      this.say(T('dev.done'));
    });
  },
  // Tie the match immediately (goes straight to the Super Over).
  _tieNow() {
    this._matchDo((inn) => {
      if (!inn.target) { this.say(T('dev.match.chaseOnly')); return; }
      inn.runs = inn.target - 1;
      inn.legal = inn.maxBalls;
      inn.ended = true; inn.endReason = 'overs';
      this.hide();
      Scenes.go('matchbreak', Match.afterInnings());
    });
  },
  _endInnings() {
    this._matchDo((inn) => {
      inn.legal = inn.maxBalls;
      inn.ended = true; inn.endReason = inn.target && inn.runs >= inn.target ? 'chased' : 'overs';
      this.hide();
      Scenes.go('matchbreak', Match.afterInnings());
    });
  },

  // ---- SAVE tab ----
  _refreshSave() {
    const d = Save.data, m = d.meta;
    const lines = [
      T('dev.save.meta', { build: m.build, schema: m.schema, content: m.content }),
      T('dev.save.writes', { n: m.writes, at: (m.savedAt || '').replace('T', ' ').slice(0, 19), store: Store.backend }),
      T('dev.save.recovered', { r: Save.recovered || T('dev.save.no') }),
      'challenges: ' + JSON.stringify(d.challenges),
      'matches: ' + JSON.stringify(d.matches) + '   settings: ' + JSON.stringify(d.settings),
    ];
    this._saveLines = lines;
    Promise.all([Store.get(Save.KEYS.backup), Save.loadResume()]).then(([bk, rs]) => {
      this._saveLines = lines.concat([
        T('dev.save.backup', { state: bk ? T('dev.save.yes') : T('dev.save.no') }) + '    ' +
        T('dev.save.resume', { state: rs ? rs.checkpoint.label : T('dev.save.no') }),
      ]);
    });
  },

  _askSeed() {
    let v = null;
    try { v = window.prompt(T('dev.seedPrompt'), String(RNG.seed)); } catch (e) { v = null; }
    if (v === null || v === '') return;
    const n = parseInt(v, 10);
    if (isFinite(n) && n >= 0) {
      this.fixedSeed = n >>> 0;
      Log.add('dev', 'fixed seed ' + this.fixedSeed);
      this.say(T('dev.seedNext', { seed: this.fixedSeed }));
    }
  },

  // Seed for the next innings.
  nextSeed() {
    return this.fixedSeed !== null ? this.fixedSeed : RNG.freshSeed();
  },

  update(realDt) { if (this._msgT > 0) this._msgT -= realDt; },

  render(ctx, fps) {
    if (this.showFps) {
      const s = Display.safe;
      R.text(T('dev.fpsLabel', { n: Math.round(fps) }), s.right - 330, s.top + 40, 28, '#9cff9c', 'right');
    }
    if (!this.open) return;
    const v = Display.viewRect();
    ctx.fillStyle = 'rgba(0,0,0,0.86)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const cx = CONFIG.LOGICAL_W / 2;
    R.text(T('dev.title'), cx, 60, 48, CONFIG.COLOR.yellow);
    R.text(T('dev.seed', { seed: RNG.seed }) + '   ·   ' +
      (this.fixedSeed !== null ? T('dev.seedNext', { seed: this.fixedSeed }) : T('dev.seedRandom')),
      cx, 112, 26, '#b8c6d6', 'center', false);
    if (this.tab === 'match') {
      const inn = this._inMatch();
      R.text(inn ? T('dev.match.state', { runs: inn.runs, wkts: inn.wickets, overs: inn.overs, target: inn.target || '-' })
        : T('dev.match.notInMatch'), cx, 254, 24, '#ffffff', 'center', false);
    }
    if (this.tab === 'save') {
      this._saveLines.forEach((l, i) => R.plainText(l, cx - 620, 285 + i * 40, 24, '#cfe8ff'));
    }
    this._buttons.draw();
    R.text(T('dev.build', { v: CONFIG.BUILD_VERSION + (CONFIG.BUILD_STAMP ? ' +' + CONFIG.BUILD_STAMP : '') }) + ' · ' + Store.backend,
      cx, 1040, 22, '#8899aa', 'center', false);
    if (this._msgT > 0) R.text(this._msg, cx, 835, 30, '#9cff6a', 'center', false);
  },
};
