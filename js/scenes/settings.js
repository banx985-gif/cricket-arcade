// Cricket Arcade — Settings (plan 34): five tabs.
//   CONTROLS       left-handed layout, control size, aim assist, batting direction and
//                  bowling target sensitivity, the bowling vertical flip (M04b)
//   AUDIO          master / music / SFX / crowd volume, sound on/off, vibration
//   VIDEO          30/60 FPS, effects Low/Normal/High, screen shake, reduce flashing
//   ACCESSIBILITY  text size, high-contrast ball and targeting, reduced motion,
//                  reduced flashing, colour-safe target indicators
//   OTHER          restore defaults, credits, privacy/legal, replay the tutorial,
//                  reset a career, full reset (each reset asks first)
// Everything saves at once and applies straight away. Defaults: SETTINGS_DATA.

const SettingsScene = {
  buttons: new ButtonList(),
  confirmBtns: new ButtonList(),
  tab: 'controls',
  confirming: null,         // { kind: 'full' | 'career' | 'defaults', slot }
  legal: false,
  _msg: null, _msgT: 0,
  _t: 0,

  TABS: ['controls', 'audio', 'video', 'access', 'other'],
  ROWS: {
    controls: [['leftHanded', 'bool'], ['controlSize', ['small', 'normal', 'large']], ['aimAssist', ['low', 'normal', 'high']],
      ['batSensitivity', ['low', 'normal', 'high']], ['aimSensitivity', ['low', 'normal', 'high']], ['aimInvert', 'bool']],
    audio: [['master', 'slider'], ['music', 'slider'], ['sfx', 'slider'], ['crowd', 'slider'], ['muted', 'boolNot'], ['haptics', 'bool']],
    video: [['fps', [30, 60]], ['vfx', ['low', 'normal', 'high']], ['shake', 'bool'], ['reduceFlash', 'bool']],
    access: [['textSize', ['normal', 'large']], ['contrastBall', 'bool'], ['contrastTarget', 'bool'], ['reducedMotion', 'bool'], ['reduceFlash', 'bool'], ['colourSafe', 'bool']],
  },

  enter(params) {
    this.confirming = null;
    this.legal = false;
    this._msg = null;
    this._t = 0;
    if (params && params.tab) this.tab = params.tab;
    GameSettings.ensure(Save.data);
    this._layout();
  },

  _set(key, v) {
    if (key === 'muted') Save.setMuted(v); else Save.setSetting(key, v);
    if (key === 'haptics' && v) Platform.haptic('strong');
    if (['sfx', 'master', 'crowd'].includes(key)) Sound.play('ui_press');
    this._layout();
  },
  _value(key, kind) {
    const v = GameSettings.get(key);
    if (kind === 'bool') return T(v ? 'settings.on' : 'settings.off');
    if (kind === 'boolNot') return T(v ? 'settings.off' : 'settings.on');
    if (key === 'aimInvert') return T(v ? 'settings.aimInverted' : 'settings.aimNormal');
    if (key === 'fps') return T('settings.fpsN', { n: v });
    return T('settings.opt.' + v);
  },

  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    b.add('settings.back', s.left + 24, s.top + 24, 240, 96, () => Scenes.go('title'), { size: 40, color: '#e9eef5' });
    this.TABS.forEach((t, i) => b.add('settings.tab.' + t, cx - 800 + i * 324, 150, 310, 90, () => { this.tab = t; this._layout(); },
      { size: 26, color: this.tab === t ? '#ffd23f' : '#5b6570', textColor: this.tab === t ? CONFIG.COLOR.ink : '#ffffff' }));
    const rows = this.ROWS[this.tab];
    if (rows) {
      rows.forEach(([key, kind], i) => {
        const y = 290 + i * 108;
        if (kind === 'slider') {
          b.add(() => '−', cx + 60, y, 110, 90, () => this._set(key, Math.max(0, GameSettings.get(key) - 10)), { size: 50, color: '#e9eef5' });
          b.add(() => '+', cx + 650, y, 110, 90, () => this._set(key, Math.min(100, GameSettings.get(key) + 10)), { size: 50, color: '#e9eef5' });
        } else {
          const cycle = () => {
            const v = GameSettings.get(key);
            if (kind === 'bool') this._set(key, !v);
            else if (kind === 'boolNot') this._set(key, !v);
            else this._set(key, kind[(kind.indexOf(v) + 1) % kind.length]);
          };
          b.add(() => this._value(key, kind), cx + 60, y, 700, 90, cycle, { size: 32, color: '#e9eef5' });
        }
      });
    } else {
      // OTHER
      const add = (label, i, fn, color) => b.add(label, cx - 700 + (i % 2) * 720, 290 + Math.floor(i / 2) * 130, 680, 110, fn, { size: 34, color: color || '#e9eef5' });
      add('settings.defaults', 0, () => { this.confirming = { kind: 'defaults' }; this._layoutConfirm(); });
      add('settings.credits', 1, () => Scenes.go('credits', { back: 'settings' }), '#ffd23f');
      add('settings.legal', 2, () => { this.legal = true; });
      add('settings.replayTutorial', 3, () => Scenes.go('tutorial', { phase: 'batIntro', replay: true, career: null }), '#9cff6a');
      add('settings.resetCareer', 4, () => { this.confirming = { kind: 'pickCareer' }; this._layoutConfirm(); }, '#ffc2a0');
      add('settings.reset', 5, () => { this.confirming = { kind: 'full' }; this._layoutConfirm(); }, '#ff9b9b');
    }
  },

  _layoutConfirm() {
    const c = this.confirmBtns, cx = CONFIG.LOGICAL_W / 2, k = this.confirming;
    c.clear();
    if (k.kind === 'pickCareer') {
      Save.data.careerSlots.forEach((sum, i) => {
        if (!sum) return;
        c.add(() => T('settings.careerSlot', { n: i + 1, name: sum.name }), cx - 420, 380 + i * 130, 840, 110, () => { this.confirming = { kind: 'career', slot: i + 1, name: sum.name }; this._layoutConfirm(); }, { size: 32, color: '#ffc2a0' });
      });
      c.add('settings.resetNo', cx - 220, 800, 440, 110, () => { this.confirming = null; }, { size: 40, color: '#e9eef5' });
      return;
    }
    c.add('settings.resetYes', cx - 460, 690, 440, 120, () => this._confirm(), { size: 40, color: '#ff6b6b' });
    c.add('settings.resetNo', cx + 20, 690, 440, 120, () => { this.confirming = null; }, { size: 44, color: '#e9eef5' });
  },

  _confirm() {
    const k = this.confirming;
    this.confirming = null;
    if (k.kind === 'full') {
      BootScene.pendingResume = null;
      Save.wipe().then(() => { this._msg = T('settings.resetDone'); this._msgT = 2.5; this._layout(); });
    } else if (k.kind === 'career') {
      CareerSave.remove(k.slot).then(() => { this._msg = T('settings.careerRemoved', { name: k.name }); this._msgT = 2.5; });
    } else if (k.kind === 'defaults') {
      const keep = { muted: Save.data.settings.muted };
      Save.data.settings = Object.assign({}, SETTINGS_DATA.defaults, keep);
      Save.setSetting('muted', keep.muted);
      this._msg = T('settings.defaultsDone'); this._msgT = 2.5;
      this._layout();
    }
  },

  update(dt) {
    this._t += dt;
    Stadium.update(dt);
    if (this._msgT > 0) this._msgT -= dt;
  },

  _list() { return this.confirming ? this.confirmBtns : this.buttons; },
  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    if (this.legal) { this.legal = false; return; }
    this._list().down(id, x, y);
  },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this._list().move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this._list().up(id); },
  keyDown(code) {
    if (code === 'Escape') { if (this.legal) this.legal = false; else if (this.confirming) this.confirming = null; else Scenes.go('title'); }
  },

  render(ctx) {
    drawMatchBackdrop(ctx, this._t, 0.72);
    const cx = CONFIG.LOGICAL_W / 2;
    Sprites.ui('icon_settings', cx - 330, 80, 90, 90);
    R.text(T('settings.title'), cx + 40, 80, 70, '#ffffff');
    const rows = this.ROWS[this.tab];
    if (rows) {
      R.panel(cx - 820, 265, 1640, rows.length * 108 + 40, 'rgba(10,22,40,0.85)');
      rows.forEach(([key, kind], i) => {
        const y = 290 + i * 108 + 45;
        R.text(T('settings.row.' + key), cx - 780, y - 12, 30, '#ffffff', 'left');
        R.text(T('settings.row.' + key + '.sub'), cx - 780, y + 22, 18, '#b8c6d6', 'left', false);
        if (kind === 'slider') {
          const v = GameSettings.get(key);
          CareerUI.meter(cx + 190, y - 18, 440, 36, v, 100, '#9cff6a');
          R.text(String(v), cx + 410, y + 40, 18, '#d8e4f0', 'center', false);
        }
      });
    }
    this.buttons.draw();
    const m = Save.data.meta;
    R.text(T('settings.info', { v: m.build, n: m.writes, store: Store.backend }), cx, 1040, 20, 'rgba(255,255,255,0.45)', 'center', false);
    if (this._msgT > 0) R.text(this._msg, cx, 990, 36, '#9cff6a');

    if (this.confirming) {
      const v = Display.viewRect(), k = this.confirming;
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(v.x, v.y, v.w, v.h);
      R.panel(cx - 560, 220, 1120, 700, 'rgba(40,14,14,0.97)', '#ff6b6b');
      const title = { full: 'settings.resetConfirm', career: 'settings.careerConfirm', defaults: 'settings.defaultsConfirm', pickCareer: 'settings.pickCareer' }[k.kind];
      R.text(T(title, { name: k.name || '' }), cx, 300, 50, '#ffffff');
      if (k.kind === 'full') { R.text(T('settings.resetWarn1'), cx, 500, 32, '#ffd0d0', 'center', false); R.text(T('settings.resetWarn2'), cx, 550, 32, '#ffd0d0', 'center', false); }
      if (k.kind === 'career') R.text(T('settings.careerWarn'), cx, 520, 32, '#ffd0d0', 'center', false);
      if (k.kind === 'pickCareer' && !Save.data.careerSlots.some(Boolean)) R.text(T('settings.noCareers'), cx, 520, 32, '#ffd0d0', 'center', false);
      this.confirmBtns.draw();
    }
    if (this.legal) {
      const v = Display.viewRect();
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(v.x, v.y, v.w, v.h);
      R.panel(cx - 760, 140, 1520, 800, 'rgba(12,26,44,0.97)', '#ffd23f');
      R.text(T('settings.legalTitle'), cx, 210, 50, '#ffffff');
      T('settings.legalText').split('|').forEach((ln, i) => R.text(ln, cx, 300 + i * 52, 28, '#d8e4f0', 'center', false));
      R.text(T('settings.tapClose'), cx, 900, 24, '#ffd23f', 'center', false);
    }
  },
};
