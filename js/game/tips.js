// Cricket Legends (M20) - one-time tips. The first time you meet something new (key moments, season
// goals, gear evolution, the Legacy Shop, records, the training games) a one-line tip slides in over the
// screen. Tap anywhere (or SKIP ALL) to close; it never shows again. Settings > OTHER > TIPS lists them all.
// Seen tips: save.tipsSeen { id: 1 }. The list: TIPS_DATA (data/meta.js); text: tip.<id> in the strings.

const Tips = {
  queue: [], cur: null, t: 0,
  seen(save, id) { return !!(save && save.tipsSeen && save.tipsSeen[id]); },
  // Show this tip if it hasn't been seen (and tips are on). Safe to call every time the thing appears.
  show(id) {
    const S = typeof Save !== 'undefined' && Save.data;
    if (!S || this.seen(S, id) || S.tipsOff || !TIPS_DATA.list.includes(id) || this.queue.includes(id) || (this.cur === id)) return false;
    this.queue.push(id);
    return true;
  },
  _mark(id) { const S = Save.data; S.tipsSeen = S.tipsSeen || {}; S.tipsSeen[id] = 1; Save.write(); },
  // Scenes.update calls this: opens the next tip when nothing else is over the screen.
  pump() {
    if (this.cur || !this.queue.length || Scenes.overlay || Scenes.pending) return;
    this.cur = this.queue.shift(); this.t = 0;
    Scenes.openOverlay(this);
  },
  _close(all) {
    if (this.t < TIPS_DATA.minShow) return;
    this._mark(this.cur);
    if (all) { Save.data.tipsOff = true; Save.write(); this.queue = []; }
    this.cur = null;
    Scenes.closeOverlay();
  },
  // ---- overlay hooks
  enter() { const s = Display.safe; this.skipBtn = { x: s.right - 330, y: s.bottom - 130, w: 300, h: 100 }; },
  update(dt) { this.t += dt; },
  pointerDown(id, x, y) { this._down = { x, y }; },
  pointerMove() {},
  pointerUp() { const d = this._down; this._down = null; if (d) this._tapAt(d.x, d.y); },
  _tapAt(x, y) { const b = this.skipBtn; this._close(b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h); },
  keyDown(code) { if (code === 'Escape' || code === 'Enter' || code === 'Space') this._close(false); },
  render(ctx) {
    if (!this.cur) return;
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2, k = Math.min(1, this.t / 0.25), y = 760 + (1 - k) * 120;
    ctx.save();
    ctx.globalAlpha = 0.45 * k; ctx.fillStyle = '#000'; ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.globalAlpha = k;
    R.roundRect(cx - 820, y, 1640, 170, 34, 'rgba(10,22,40,0.97)', '#9be7ff', 5);
    R.text(T('tip.title'), cx - 780, y + 40, 26, '#9be7ff', 'left');
    R.text(T('tip.' + this.cur), cx, y + 96, 32, '#ffffff', 'center', false, 1560);
    R.text(T('tip.tap'), cx, y + 146, 20, '#b8c6d6', 'center', false);
    const b = this.skipBtn;
    if (b) { R.roundRect(b.x, b.y, b.w, b.h, 24, '#e9eef5', CONFIG.COLOR.ink, 4); R.text(T('tip.skipAll'), b.x + b.w / 2, b.y + b.h / 2, 26, CONFIG.COLOR.ink); }
    ctx.restore();
  },
};
