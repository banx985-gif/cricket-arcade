// Cricket Arcade — hidden developer panel (plan 43A.3, M01 subset).
// Open it with 5 quick taps on the TOP-LEFT corner of the screen (or the
// backquote ` key on a PC). Commands: set seed, force Golden Ball, slow-mo,
// hit-zone debug, FPS counter, wipe save.

const Dev = {
  enabled: CONFIG.DEBUG_BUILD,
  open: false,
  fixedSeed: null,        // when set, every new innings uses this seed
  forceGolden: false,     // next delivery is a Golden Ball
  slowmo: false,
  hitzone: false,
  showFps: false,
  _taps: [],
  _buttons: new ButtonList(),
  _msg: '',
  _msgT: 0,

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
    this.open = true;
    this._layout();
    Log.add('dev', 'panel opened');
  },

  hide() { this.open = false; },

  _state(on) { return on ? T('dev.on') : T('dev.off'); },

  _layout() {
    const b = this._buttons;
    b.clear();
    const cx = CONFIG.LOGICAL_W / 2;
    const w = 620, h = 92, gap = 18;
    const left = cx - w - gap / 2, right = cx + gap / 2;
    let y = 300;
    const opts = { size: 32, color: '#e9eef5' };
    b.add(() => T('dev.setSeed'), left, y, w, h, () => this._askSeed(), opts);
    b.add(() => T('dev.golden', { state: this._state(this.forceGolden) }), right, y, w, h,
      () => { this.forceGolden = !this.forceGolden; }, opts);
    y += h + gap;
    b.add(() => T('dev.replaySeed'), left, y, w, h, () => {
      this.fixedSeed = RNG.seed;
    }, opts);
    b.add(() => T('dev.slowmo', { state: this._state(this.slowmo) }), right, y, w, h,
      () => { this.slowmo = !this.slowmo; }, opts);
    y += h + gap;
    b.add(() => T('dev.clearSeed'), left, y, w, h, () => { this.fixedSeed = null; }, opts);
    b.add(() => T('dev.hitzone', { state: this._state(this.hitzone) }), right, y, w, h,
      () => { this.hitzone = !this.hitzone; }, opts);
    y += h + gap;
    b.add(() => T('dev.wipe'), left, y, w, h, () => {
      Save.wipe().then(() => { this._msg = T('dev.wiped'); this._msgT = 2; });
    }, Object.assign({}, opts, { color: '#ffb3b3' }));
    b.add(() => T('dev.fps', { state: this._state(this.showFps) }), right, y, w, h,
      () => { this.showFps = !this.showFps; }, opts);
    y += h + gap + 10;
    b.add(() => T('dev.close'), cx - 200, y, 400, h, () => this.hide(), { size: 36 });
  },

  _askSeed() {
    let v = null;
    try { v = window.prompt(T('dev.seedPrompt'), String(RNG.seed)); } catch (e) { v = null; }
    if (v === null || v === '') return;
    const n = parseInt(v, 10);
    if (isFinite(n) && n >= 0) {
      this.fixedSeed = n >>> 0;
      Log.add('dev', 'fixed seed ' + this.fixedSeed);
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
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const cx = CONFIG.LOGICAL_W / 2;
    R.text(T('dev.title'), cx, 120, 56, CONFIG.COLOR.yellow);
    R.text(T('dev.seed', { seed: RNG.seed }), cx, 190, 34, '#fff', 'center', false);
    R.text(this.fixedSeed !== null ? T('dev.seedNext', { seed: this.fixedSeed }) : T('dev.seedRandom'),
      cx, 240, 28, '#b8c6d6', 'center', false);
    this._buttons.draw();
    R.text(T('dev.build', { v: CONFIG.BUILD_VERSION }) + ' · ' + Store.backend, cx, 1030, 24, '#8899aa', 'center', false);
    if (this._msgT > 0) R.text(this._msg, cx, 985, 30, '#9cff9c', 'center', false);
  },
};
