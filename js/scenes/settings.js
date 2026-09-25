// Cricket Arcade — Settings (plan 34, M04 subset): sound, vibration, and a
// full data reset behind a confirmation step (plan 33 "Reset").
// "Reset active career" joins this screen when Career exists (M05).

const SettingsScene = {
  buttons: new ButtonList(),
  confirmBtns: new ButtonList(),
  confirming: false,
  _msg: null, _msgT: 0,
  _t: 0,

  enter() {
    this.confirming = false;
    this._msg = null;
    this._t = 0;
    this._layout();
  },

  _layout() {
    const cx = CONFIG.LOGICAL_W / 2;
    const b = this.buttons;
    b.clear();
    const on = (v) => T(v ? 'settings.on' : 'settings.off');
    b.add(() => T('settings.sound', { state: on(!Save.data.settings.muted) }), cx - 330, 225, 660, 110,
      () => { Save.setMuted(!Save.data.settings.muted); }, { size: 44, color: '#e9eef5' });
    b.add(() => T('settings.vibration', { state: on(Save.data.settings.haptics !== false) }), cx - 330, 355, 660, 110,
      () => { Save.setSetting('haptics', Save.data.settings.haptics === false); Platform.haptic('strong'); },
      { size: 44, color: '#e9eef5' });
    // Controls (plan 34): bowling aim direction and sensitivity.
    b.add(() => T('settings.aim', { state: T(Save.data.settings.aimInvert ? 'settings.aimInverted' : 'settings.aimNormal') }), cx - 330, 485, 660, 110,
      () => { Save.setSetting('aimInvert', !Save.data.settings.aimInvert); }, { size: 36, color: '#e9eef5' });
    const sens = ['low', 'normal', 'high'];
    b.add(() => T('settings.aimSens', { state: T('settings.sens.' + (Save.data.settings.aimSensitivity || 'normal')) }), cx - 330, 615, 660, 110,
      () => { const i = sens.indexOf(Save.data.settings.aimSensitivity || 'normal'); Save.setSetting('aimSensitivity', sens[(i + 1) % 3]); },
      { size: 36, color: '#e9eef5' });
    b.add('settings.reset', cx - 330, 760, 660, 100, () => { this.confirming = true; }, { size: 38, color: '#ff9b9b' });
    b.add('settings.back', Display.safe.left + 30, Display.safe.top + 30, 260, 100, () => Scenes.go('title'), { size: 44 });

    const c = this.confirmBtns;
    c.clear();
    c.add('settings.resetYes', cx - 460, 690, 440, 120, () => this._wipe(), { size: 40, color: '#ff6b6b' });
    c.add('settings.resetNo', cx + 20, 690, 440, 120, () => { this.confirming = false; }, { size: 44, color: '#e9eef5' });
  },

  _wipe() {
    this.confirming = false;
    BootScene.pendingResume = null;
    Save.wipe().then(() => { this._msg = T('settings.resetDone'); this._msgT = 2.5; });
  },

  update(dt) {
    this._t += dt;
    Stadium.update(dt);
    if (this._msgT > 0) this._msgT -= dt;
  },

  _list() { return this.confirming ? this.confirmBtns : this.buttons; },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this._list().down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this._list().move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this._list().up(id); },
  keyDown(code) {
    if (code === 'Escape') { if (this.confirming) this.confirming = false; else Scenes.go('title'); }
  },

  render(ctx) {
    drawMatchBackdrop(ctx, this._t, 0.7);
    const cx = CONFIG.LOGICAL_W / 2;
    Sprites.ui('icon_settings', cx - 330, 130, 100, 100);
    R.text(T('settings.title'), cx + 40, 130, 80, '#ffffff');
    this.buttons.draw();
    const m = Save.data.meta;
    R.text(T('settings.info', { v: m.build, n: m.writes, store: Store.backend }), cx, 1010, 22, 'rgba(255,255,255,0.45)', 'center', false);
    if (this._msgT > 0) R.text(this._msg, cx, 910, 40, '#9cff6a');

    if (this.confirming) {
      const v = Display.viewRect();
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(v.x, v.y, v.w, v.h);
      R.panel(cx - 560, 280, 1120, 580, 'rgba(40,14,14,0.97)', '#ff6b6b');
      R.text(T('settings.resetConfirm'), cx, 400, 58, '#ffffff');
      R.text(T('settings.resetWarn1'), cx, 500, 32, '#ffd0d0', 'center', false);
      R.text(T('settings.resetWarn2'), cx, 550, 32, '#ffd0d0', 'center', false);
      this.confirmBtns.draw();
    }
  },
};
