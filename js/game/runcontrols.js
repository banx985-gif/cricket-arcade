// Cricket Arcade — RUN / CANCEL buttons (plan 6.1, HUD plan 27 "contextual centre-low").
// Shown while the ball is in play on a hit that stays in the field.
// The RUN button's ring shows the risk of one more run:
//   green = safe, amber = tight, red = you'll probably be run out.

const RunControls = {
  run: { x: 0, y: 0, r: 96, id: null, pressed: false, flash: 0 },
  cancel: { x: 0, y: 0, r: 76, id: null, pressed: false },
  visible: false,
  canCancel: false,
  risk: 'none',
  queued: 0,
  onRun: null, onCancel: null,
  _t: 0,

  init(handlers) { this.onRun = handlers.run; this.onCancel = handlers.cancel; this.layout(); },

  layout() {
    const s = Display.safe;
    const cx = (s.left + s.right) / 2;
    this.run.x = cx + 20; this.run.y = s.bottom - 150;
    this.cancel.x = cx - 200; this.cancel.y = s.bottom - 130;
  },

  reset() { this.run.id = null; this.run.pressed = false; this.cancel.id = null; this.cancel.pressed = false; this.visible = false; },

  down(id, x, y) {
    if (!this.visible) return false;
    const b = this.run;
    if (b.id === null && Math.hypot(x - b.x, y - b.y) <= b.r * 1.15) {
      b.id = id; b.pressed = true; b.flash = 1;
      if (this.onRun) this.onRun();
      return true;
    }
    const c = this.cancel;
    if (this.canCancel && c.id === null && Math.hypot(x - c.x, y - c.y) <= c.r * 1.2) {
      c.id = id; c.pressed = true;
      if (this.onCancel) this.onCancel();
      return true;
    }
    return false;
  },

  up(id) {
    for (const b of [this.run, this.cancel]) if (b.id === id) { b.id = null; b.pressed = false; return true; }
    return false;
  },

  update(realDt) {
    this._t += realDt;
    this.run.flash = Math.max(0, this.run.flash - realDt * 4);
  },

  draw(ctx) {
    if (!this.visible) return;
    const b = this.run;
    const colors = { safe: '#3ddc5a', risky: '#ffb400', danger: '#ff3b3b', none: '#666' };
    const col = colors[this.risk];
    const pulse = this.risk === 'safe' ? 1 + Math.sin(this._t * 9) * 0.05 : 1;
    const off = b.pressed ? 5 : 0;
    R.circle(b.x + 5, b.y + 8, b.r, 'rgba(0,0,0,0.4)');
    R.circle(b.x, b.y + off, b.r * 1.12 * pulse, null, col, 12);
    if (!Sprites.ui('icon_run', b.x, b.y + off, b.r * 2.05, b.r * 2.05)) R.circle(b.x, b.y + off, b.r, '#2fbf5b', CONFIG.COLOR.ink, 6);
    if (this.risk === 'none') R.circle(b.x, b.y + off, b.r, 'rgba(20,20,20,0.5)');
    if (b.flash > 0) R.circle(b.x, b.y + off, b.r + 20 * (1 - b.flash), null, `rgba(255,255,255,${b.flash})`, 8);
    R.roundRect(b.x - 80, b.y + off + b.r * 0.5, 160, 46, 14, 'rgba(0,0,0,0.7)');
    R.text(this.queued > 0 ? T('run.runN', { n: this.queued + 1 }) : T('run.run'), b.x, b.y + off + b.r * 0.5 + 24, 32, col === '#666' ? '#aaa' : col, 'center', false);
    R.text(T('run.risk.' + this.risk), b.x, b.y - b.r - 34, 28, col);

    if (this.canCancel) {
      const c = this.cancel;
      const o2 = c.pressed ? 4 : 0;
      R.circle(c.x + 4, c.y + 6, c.r, 'rgba(0,0,0,0.4)');
      if (!Sprites.ui('icon_cancel_run', c.x, c.y + o2, c.r * 2.05, c.r * 2.05)) R.circle(c.x, c.y + o2, c.r, '#d33', CONFIG.COLOR.ink, 6);
      R.roundRect(c.x - 72, c.y + o2 + c.r * 0.5, 144, 40, 14, 'rgba(0,0,0,0.7)');
      R.text(T('run.cancel'), c.x, c.y + o2 + c.r * 0.5 + 21, 26, '#ffffff', 'center', false);
    }
  },
};
