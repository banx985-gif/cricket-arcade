// Cricket Legends (M19, plan 5.8, 10) - hands-on training. The first few sessions of each drill are a
// short skill check instead of an instant result: a marker sweeps along the bar and you tap when it is
// inside the glowing zone, three times (the same tap-in-the-ring timing as the match). Each drill moves at
// its own speed with its own zone size (CAREER_DATA.handsOn). The better you do, the more you get:
// 2 hits = +1 extra stat, 3 hits = a form bump and a little technique mastery too. A drill you've done
// enough times resolves instantly, as before. SKIP gives the plain quick result.
// Opens over Career Home with Scenes.openOverlay; calls back with { hits, of } (or null for skip).

const TrainingDrill = {
  drill: null, onDone: null, t: 0, round: 0, hits: 0, marks: [], done: null, buttons: new ButtonList(),

  // Should this drill be hands-on for this career? (the first H.sessions times each)
  handsOn(c, drillId) {
    const H = CAREER_DATA.handsOn;
    return !!(H && H.drills[drillId]) && ((c.drillCount && c.drillCount[drillId]) || 0) < H.sessions;
  },
  start(drillId, onDone) {
    this.drill = drillId; this.onDone = onDone;
    Scenes.openOverlay(this);
  },
  _cfg() { return CAREER_DATA.handsOn.drills[this.drill]; },

  enter() {
    this.t = 0; this.round = 0; this.hits = 0; this.marks = []; this.done = null;
    const b = this.buttons, s = Display.safe;
    b.clear();
    b.add('drill.skip', s.right - 300, s.top + 20, 270, 96, () => this._finish(true), { size: 30, color: '#e9eef5' }).tag = 'skip';
  },
  // Where the marker is now (0..1 along the bar): a smooth back-and-forth sweep.
  _pos() { const C = this._cfg(); return 0.5 + 0.5 * Math.sin(this.t * C.speed); },
  _zone() { const Z = CAREER_DATA.handsOn.zones; return Z[this.round % Z.length]; },
  _tap() {
    if (this.done || this.round >= CAREER_DATA.handsOn.rounds) return;
    const C = this._cfg(), x = this._pos(), z = this._zone(), hit = Math.abs(x - z) <= C.zone;
    this.marks.push({ x, hit });
    if (hit) { this.hits++; Sound.play('four'); Platform.haptic('light'); } else Sound.play('uiTap');
    this.round++;
    if (this.round >= CAREER_DATA.handsOn.rounds) this.done = { t: 0 };
  },
  _finish(skip) {
    Scenes.closeOverlay();
    const cb = this.onDone; this.onDone = null;
    if (cb) cb(skip ? null : { hits: this.hits, of: CAREER_DATA.handsOn.rounds });
  },

  update(dt) {
    this.t += dt;
    if (this.done) { this.done.t += dt; if (this.done.t > CAREER_DATA.handsOn.resultHold) this._finish(false); }
  },
  pointerDown(id, x, y) { if (!this.buttons.down(id, x, y)) this._tap(); },
  pointerMove(id, x, y) { this.buttons.move(id, x, y); },
  pointerUp(id) { this.buttons.up(id); },
  keyDown(code) { if (code === 'Space' || code === 'Enter') this._tap(); if (code === 'Escape') this._finish(true); },

  render(ctx) {
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2, C = this._cfg(), D = CAREER_DATA.training.find((d) => d.id === this.drill);
    ctx.fillStyle = 'rgba(3,10,20,0.92)'; ctx.fillRect(v.x, v.y, v.w, v.h);
    Sprites.ui(D.icon, cx, 230, 230, 230);
    R.text(T('train.' + D.id), cx, 390, 52, '#ffffff');
    R.text(T('drill.how.' + D.id), cx, 450, 26, '#d8e4f0', 'center', false, 1500);
    // the bar
    const x0 = cx - 700, w = 1400, y = 600, z = this._zone();
    R.roundRect(x0, y - 40, w, 80, 40, 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.4)', 3);
    if (!this.done) {
      R.roundRect(x0 + (z - C.zone) * w, y - 40, C.zone * 2 * w, 80, 30, 'rgba(156,255,106,0.35)', '#9cff6a', 4);
      const mx = x0 + this._pos() * w;
      R.circle(mx, y, 34, '#ffd23f', '#ffffff', 5);
    }
    // the taps so far
    for (let i = 0; i < CAREER_DATA.handsOn.rounds; i++) {
      const m = this.marks[i];
      R.circle(cx - 90 + i * 90, 740, 28, m ? (m.hit ? '#9cff6a' : '#ff7a7a') : 'rgba(255,255,255,0.15)', '#ffffff', 3);
    }
    R.text(this.done ? T('drill.result.' + this.hits) : T('drill.tap'), cx, 850, 40, this.done ? '#ffd23f' : '#ffffff');
    this.buttons.draw();
  },
};
