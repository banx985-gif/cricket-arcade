// Cricket Arcade — the Full Game screen (M13). A friendly page, not a nag: what you
// get, the price the store returns, BUY, RESTORE and NOT NOW. It only opens when
// you tap something locked (or once, when a career finishes the free intro).
// params: { reason, back: { scene, params } }

const FullGameScene = {
  buttons: new ButtonList(),
  confirmBtns: new ButtonList(),
  back: null, reason: null, msg: null, busy: false, confirming: false, done: false, _t: 0,

  enter(params) {
    this.back = params.back || { scene: 'title' };
    this.reason = params.reason || null;
    this.msg = null; this.busy = false; this.confirming = false; this._t = 0;
    this.done = Platform.isFullGame();
    ChallengeAssets.ensure();                       // (the background)
    Effects.init();
    this._layout();
  },
  _layout() {
    const b = this.buttons, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    if (this.done) { b.add('full.continue', cx - 260, 900, 520, 120, () => this._leave(), { size: 44, color: '#9cff6a' }); return; }
    b.add(() => T('full.buy', { p: Platform.fullGamePrice() || T('full.priceStore') }), cx + 40, 880, 600, 130, () => this._buy(), { size: 40, color: '#9cff6a', disabled: () => this.busy });
    b.add('full.restore', cx - 640, 895, 420, 100, () => this._restore(), { size: 30, color: '#e9eef5', disabled: () => this.busy });
    b.add('full.notNow', cx - 200, 895, 220, 100, () => this._leave(), { size: 26, color: '#b8c6d6' });
    const c = this.confirmBtns;
    c.clear();
    c.add('full.testConfirm', cx - 460, 700, 440, 120, () => { this.confirming = false; this._doBuy(); }, { size: 36, color: '#9cff6a' });
    c.add('full.testCancel', cx + 20, 700, 440, 120, () => { this.confirming = false; this.msg = { key: 'full.cancelled' }; }, { size: 36, color: '#e9eef5' });
  },
  _leave() { Scenes.go(this.back.scene, this.back.params || {}); },
  _buy() {
    // The pretend store asks first, so nobody thinks a real payment happened.
    if (Platform.usingTestStore()) { this.confirming = true; return; }
    this._doBuy();
  },
  _doBuy() {
    this.busy = true; this.msg = { key: 'full.working' };
    Platform.buyFullGame().then((r) => {
      this.busy = false;
      if (r.ok) this._unlocked();
      else this.msg = { key: r.cancelled ? 'full.cancelled' : 'full.failed', bad: !r.cancelled };
    });
  },
  _restore() {
    this.busy = true; this.msg = { key: 'full.working' };
    Platform.restoreFullGame().then((r) => {
      this.busy = false;
      if (r.found) this._unlocked();
      else this.msg = { key: r.ok ? 'full.nothingToRestore' : 'full.failed', bad: !r.ok };
    });
  },
  _unlocked() {
    this.done = true;
    this.msg = null;
    Sound.play('ui_unlock'); Sound.play('sfx_fanfare');
    Effects.flash(0.3, '#fff4c2');
    this._layout();
  },

  update(dt) {
    this._t += dt; Effects.update(dt);
    if (this.done && this._t % 0.5 < dt) Effects.sparks(300 + ((this._t * 977) % 1320), 180, 14, ['#ffd23f', '#9cff6a', '#5fd4ff'][Math.floor(this._t * 2) % 3], 700);
  },
  _list() { return this.confirming ? this.confirmBtns : this.buttons; },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this._list().down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this._list().move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this._list().up(id); },
  keyDown(code) { if (code === 'Escape') { if (this.confirming) this.confirming = false; else this._leave(); } },

  render(ctx) {
    CareerUI.bg(ctx, 'bg_mission_hub', 0.6);
    const cx = CONFIG.LOGICAL_W / 2;
    R.panel(cx - 860, 50, 1720, 800, 'rgba(10,22,40,0.95)', '#ffd23f');
    Sprites.ui('logo_banx_gamex', cx - 760, 150, 110, 132);
    if (this.done) {
      R.text(T('full.thanks'), cx, 200, 70, '#9cff6a');
      R.text(T('full.allOpen'), cx, 300, 34, '#ffffff', 'center', false);
      R.text(T('full.keepSave'), cx, 360, 26, '#d8e4f0', 'center', false);
    } else {
      R.text(T('full.title'), cx, 130, 66, '#ffffff');
      R.text(T(this.reason ? 'full.why.' + this.reason : 'full.sub'), cx, 205, 28, '#ffd23f', 'center', false);
      INTRO_DATA.perks.forEach((k, i) => {
        const y = 290 + i * 78;
        R.circle(cx - 640, y, 16, '#9cff6a');
        R.text(T('full.perk.' + k), cx - 600, y - 10, 30, '#ffffff', 'left');
        R.text(T('full.perk.' + k + '.sub'), cx - 600, y + 22, 20, '#b8c6d6', 'left', false);
      });
      R.text(T('full.promise'), cx, 800, 22, '#9be7ff', 'center', false);
    }
    if (this.msg) R.text(T(this.msg.key), cx, 1050, 26, this.msg.bad ? '#ff9d7a' : '#d8e4f0', 'center', false);
    this.buttons.draw();
    Effects.drawParticles(ctx);
    if (this.confirming) {
      const v = Display.viewRect();
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(v.x, v.y, v.w, v.h);
      R.panel(cx - 560, 300, 1120, 580, 'rgba(12,26,44,0.98)', '#9be7ff');
      R.text(T('full.testTitle'), cx, 390, 50, '#ffffff');
      R.text(T('full.testLine1'), cx, 480, 28, '#d8e4f0', 'center', false);
      R.text(T('full.testLine2'), cx, 530, 28, '#ffd23f', 'center', false);
      this.confirmBtns.draw();
    }
  },
};
