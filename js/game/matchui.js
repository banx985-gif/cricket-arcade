// Cricket Arcade — match overlays (M04b):
//   BowlerPicker  before each over you bowl: choose the bowler and the field
//   MatchupCard   when a new bowler comes on: both players' key stats + who has the edge
//   ThrowMeter    fielding: stop the marker to throw (perfect / okay / bad)
//   ReadChip      batting: the computer's delivery, shown as the bowler runs in
//                 (later, or not at all, against a deceptive bowler)

const BowlerPicker = {
  open: false,
  inn: null, team: null,
  options: [],          // BowlerRules.options()
  bowlerId: null,       // selected
  fieldId: null,        // selected preset id, or 'auto'
  suggested: null,      // the computer's suggestion { bowlerId, fieldId }
  cards: [], fields: [], btns: new ButtonList(),
  onDone: null,
  _t: 0,

  // o: { inn, team, fatigue, suggest: { bowlerId, fieldId }, done(bowlerId, fieldId) }
  show(o) {
    this.open = true;
    this.inn = o.inn; this.team = o.team; this.fatigue = o.fatigue;
    this.options = BowlerRules.options(o.inn, o.team);
    this.suggested = o.suggest;
    this.bowlerId = o.suggest.bowlerId;
    this.fieldId = 'auto';
    this.onDone = o.done;
    this._t = 0;
    this.layout();
  },
  hide() { this.open = false; this.btns.clear(); },

  layout() {
    if (!this.open) return;
    const cx = CONFIG.LOGICAL_W / 2;
    const n = this.options.length, w = 262, gap = 16;
    const x0 = cx - (n * w + (n - 1) * gap) / 2;
    this.cards = this.options.map((o, i) => ({ o, x: x0 + i * (w + gap), y: 190, w, h: 360 }));
    const presets = FIELD_DATA.presets;
    const fw = 150, fg = 12, fn = presets.length + 1;
    const fx0 = cx - (fn * fw + (fn - 1) * fg) / 2;
    this.fields = [{ id: 'auto', icon: 'field_auto', x: fx0, y: 640, w: fw, h: 170, unlocked: true }]
      .concat(presets.map((p, i) => ({ id: p.id, icon: p.icon, x: fx0 + (i + 1) * (fw + fg), y: 640, w: fw, h: 170,
        unlocked: Unlocks.fieldPreset(p.id), unlock: p.unlock })));
    this.btns.clear();
    this.btns.add('picker.bowl', cx - 200, 860, 400, 120, () => this.confirm(), { size: 56 });
  },

  confirm() {
    if (!this.open) return;
    const ok = this.options.find((o) => o.p.id === this.bowlerId && o.ok);
    if (!ok) { Sound.play('edge'); return; }
    const field = this.fieldId === 'auto' ? this.suggested.fieldId : this.fieldId;
    const done = this.onDone;
    this.hide();
    done(this.bowlerId, field, this.fieldId === 'auto');
  },

  _hit(list, x, y) { return list.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) || null; },

  down(id, x, y) {
    if (!this.open) return false;
    if (this.btns.down(id, x, y)) return true;
    const c = this._hit(this.cards, x, y);
    if (c) {
      if (c.o.ok) { this.bowlerId = c.o.p.id; Sound.play('uiTap'); }
      else { Sound.play('edge'); c.shake = 0.3; }
      return true;
    }
    const f = this._hit(this.fields, x, y);
    if (f) {
      if (f.unlocked) { this.fieldId = f.id; Sound.play('uiTap'); }
      else { Sound.play('edge'); f.shake = 0.3; }
      return true;
    }
    return true;                      // the picker swallows every touch while open
  },
  move(id, x, y) { if (this.open) this.btns.move(id, x, y); return this.open; },
  up(id) { if (this.open) { this.btns.up(id); return true; } return false; },
  keyDown(code) {
    if (!this.open) return false;
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6 }[code];
    if (n !== undefined && this.options[n] && this.options[n].ok) this.bowlerId = this.options[n].p.id;
    if (code === 'Enter' || code === 'Space') this.confirm();
    return true;
  },

  update(dt) {
    this._t += dt;
    for (const c of this.cards.concat(this.fields)) if (c.shake) c.shake = Math.max(0, c.shake - dt);
  },

  draw(ctx) {
    if (!this.open) return;
    const v = Display.viewRect();
    ctx.fillStyle = 'rgba(3,10,20,0.78)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const cx = CONFIG.LOGICAL_W / 2, inn = this.inn;
    const over = Math.floor(inn.legal / 6) + 1;
    R.text(T(inn.isSuper ? 'picker.titleSuper' : 'picker.title', { n: over }), cx, 110, 58, '#ffffff');
    R.text(T('picker.sub', { max: BowlerRules.maxOvers(inn) }), cx, 160, 26, '#b8c6d6', 'center', false);

    for (const c of this.cards) {
      const o = c.o, p = o.p, sel = p.id === this.bowlerId;
      const jx = c.shake ? Math.sin(c.shake * 60) * 8 : 0;
      const x = c.x + jx, y = c.y;
      R.roundRect(x + 5, y + 8, c.w, c.h, 22, 'rgba(0,0,0,0.4)');
      R.roundRect(x, y, c.w, c.h, 22, sel ? 'rgba(30,70,40,0.97)' : 'rgba(12,28,48,0.95)', sel ? '#ffd23f' : 'rgba(255,255,255,0.35)', sel ? 7 : 3);
      const fam = Bowling.family(p.family);
      if (!Sprites.ui(fam.icon, x + c.w / 2, y + 70, 150, 100)) R.circle(x + c.w / 2, y + 70, 40, '#c1121f');
      R.text(p.short, x + c.w / 2, y + 150, 30, '#ffffff');
      R.text(T(fam.nameKey), x + c.w / 2, y + 186, 22, '#9be7ff', 'center', false);
      R.text(T('picker.overs', { n: o.overs, max: o.max }), x + c.w / 2, y + 222, 24, '#ffffff', 'center', false);
      // fatigue bar
      const f = (this.fatigue[p.id] || 0);
      R.roundRect(x + 24, y + 246, c.w - 48, 18, 8, 'rgba(0,0,0,0.6)');
      R.roundRect(x + 26, y + 248, (c.w - 52) * (1 - f), 14, 6, f > 0.6 ? '#ff5a1f' : f > 0.3 ? '#ffb400' : '#6fd36f');
      R.text(T('picker.fresh', { n: Math.round((1 - f) * 100) }), x + c.w / 2, y + 282, 18, '#b8c6d6', 'center', false);
      const st = p.stats;
      [['picker.del', st.delivery], ['picker.acc', st.accuracy], ['picker.mov', st.movement]].forEach(([k, val], i) => {
        const sx = x + c.w / 2 + (i - 1) * 78;
        R.text(T(k), sx, y + 306, 17, '#b8c6d6', 'center', false);
        R.text(String(val), sx, y + 334, 28, '#ffd23f', 'center', false);
      });
      if (!o.ok) {
        R.roundRect(x, y, c.w, c.h, 22, 'rgba(10,10,10,0.62)');
        R.text(T('picker.reason.' + o.reason), x + c.w / 2, y + c.h / 2, 26, '#ff9d9d');
      }
    }

    R.text(T('picker.field'), cx, 612, 32, '#ffffff');
    for (const f of this.fields) {
      const sel = f.id === this.fieldId;
      const jx = f.shake ? Math.sin(f.shake * 60) * 6 : 0;
      const x = f.x + jx;
      R.roundRect(x, f.y, f.w, f.h, 18, sel ? 'rgba(255,210,63,0.95)' : 'rgba(12,28,48,0.92)', sel ? '#ffffff' : 'rgba(255,255,255,0.3)', sel ? 5 : 2);
      const icon = f.unlocked ? f.icon : 'field_locked';
      if (!Sprites.ui(icon, x + f.w / 2, f.y + 62, 110, 110)) R.circle(x + f.w / 2, f.y + 62, 40, '#1f8a4c');
      const label = f.id === 'auto' ? T('picker.auto') : T('field.' + f.id);
      R.text(label, x + f.w / 2, f.y + 138, f.id === 'auto' ? 24 : 17, sel ? CONFIG.COLOR.ink : '#ffffff', 'center', false);
      if (!f.unlocked) R.text(Unlocks.hint(f.unlock), x + f.w / 2, f.y + 158, 14, '#ffb3b3', 'center', false);
    }
    if (this.fieldId === 'auto' && this.suggested.fieldId) {
      R.text(T('picker.autoIs', { f: T('field.' + this.suggested.fieldId) }), cx, 832, 22, '#b8c6d6', 'center', false);
    }
    this.btns.draw();
  },
};

const MatchupCard = {
  card: null,
  // bat, bowl = players; mine = which side is the player's ('bat' | 'bowl')
  show(bat, bowl, mine) {
    this.card = { bat, bowl, mine, m: Duel.matchup(bat, bowl), t: 0 };
  },
  hide() { this.card = null; },
  update(dt) { if (this.card) { this.card.t += dt; if (this.card.t > 3.6) this.card = null; } },
  draw(ctx, allowed) {
    const c = this.card;
    if (!c || allowed === false) return;
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, y = s.top + 132;
    const a = Math.min(1, c.t / 0.2) * Math.min(1, (3.6 - c.t) / 0.3);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    const w = 820, h = 150;
    R.panel(cx - w / 2, y, w, h, 'rgba(8,20,36,0.92)', 'rgba(255,255,255,0.4)');
    const b = c.bat.stats, w2 = c.bowl.stats;
    R.text(c.bat.short, cx - 390, y + 36, 30, '#9fd0ff', 'left');
    R.text(T('matchup.batStats', { t: b.timing, c: b.contact, p: b.power }), cx - 390, y + 82, 22, '#ffffff', 'left', false);
    R.text(T('matchup.rating', { n: c.m.bat }), cx - 390, y + 120, 22, '#b8c6d6', 'left', false);
    R.text(c.bowl.short, cx + 390, y + 36, 30, '#b8f5c0', 'right');
    R.text(T('matchup.bowlStats', { d: w2.delivery, a: w2.accuracy, m: w2.movement }), cx + 390, y + 82, 22, '#ffffff', 'right', false);
    R.text(T('matchup.rating', { n: c.m.bowl }), cx + 390, y + 120, 22, '#b8c6d6', 'right', false);
    // the arrow points at whoever has the edge; green = good for you
    const good = c.m.edge === 'even' ? null : c.m.edge === c.mine;
    const col = good === null ? '#ffb400' : good ? '#3ddc5a' : '#ff4b4b';
    const dir = c.m.edge === 'bat' ? -1 : c.m.edge === 'bowl' ? 1 : 0;
    const ay = y + 70;
    R.circle(cx, ay, 44, 'rgba(0,0,0,0.5)', col, 5);
    if (dir === 0) R.text('=', cx, ay + 2, 48, col);
    else {
      ctx.beginPath();
      ctx.moveTo(cx + dir * 30, ay); ctx.lineTo(cx - dir * 14, ay - 24); ctx.lineTo(cx - dir * 14, ay + 24); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
    }
    R.text(T(good === null ? 'matchup.even' : good ? 'matchup.yourEdge' : 'matchup.theirEdge'), cx, y + 134, 20, col, 'center', false);
    ctx.restore();
  },
};

const ThrowMeter = {
  m: null,           // { t (real secs), zones, pos, done }
  btn: { x: 0, y: 0, r: 110, id: null, pressed: false },

  start(fielding) {
    this.m = { t: 0, zones: Throw.zones(fielding), pos: -1 };
    const s = Display.safe;
    this.btn.x = s.right - 230; this.btn.y = s.bottom - 230;
  },
  stop() { this.m = null; this.btn.id = null; this.btn.pressed = false; },
  get active() { return !!this.m; },

  // Returns the grade if the meter finished (tapped or timed out), else null.
  update(realDt) {
    const m = this.m;
    if (!m) return null;
    m.t += realDt;
    m.pos = Throw.meterPos(m.t);
    if (m.t >= MATCH_DATA.throw.meter.maxTime) return 'okay';
    return m.tapped || null;
  },
  tap() {
    if (!this.m || this.m.tapped || this.m.t < 0.08) return false;
    this.m.tapped = Throw.grade(this.m.pos, this.m.zones);
    return true;
  },

  draw(ctx) {
    const m = this.m;
    if (!m) return;
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, y = s.bottom - 230, w = 900, h = 56;
    R.panel(cx - w / 2 - 30, y - 110, w + 60, 200, 'rgba(8,20,36,0.88)', '#ffd23f');
    R.text(T('throw.title'), cx, y - 72, 44, '#ffffff');
    const x0 = cx - w / 2;
    const bar = (a, b, col) => R.rect(x0 + (a + 1) / 2 * w, y - h / 2, (b - a) / 2 * w, h, col);
    bar(-1, 1, '#c0392b');
    bar(-m.zones.okay, m.zones.okay, '#3ddc5a');
    bar(-m.zones.perfect, m.zones.perfect, '#ffd23f');
    R.rect(x0, y - h / 2, w, h, null, '#ffffff', 4);
    R.text(T('throw.bad'), x0 + 70, y + 52, 20, '#ffb3b3', 'center', false);
    R.text(T('throw.okay'), cx - w * m.zones.okay / 2 + 50, y + 52, 20, '#b8f5c0', 'center', false);
    R.text(T('throw.perfect'), cx, y + 52, 20, '#ffd23f', 'center', false);
    const mx = x0 + (m.pos + 1) / 2 * w;
    R.rect(mx - 7, y - h / 2 - 16, 14, h + 32, '#ffffff', CONFIG.COLOR.ink, 3);
    // time left
    const k = 1 - m.t / MATCH_DATA.throw.meter.maxTime;
    R.rect(x0, y + 72, w * Math.max(0, k), 6, 'rgba(255,255,255,0.5)');
    // THROW button (a tap anywhere works too)
    const b = this.btn, off = b.pressed ? 5 : 0;
    R.circle(b.x + 5, b.y + 8, b.r, 'rgba(0,0,0,0.4)');
    R.circle(b.x, b.y + off, b.r, '#ff7a1a', CONFIG.COLOR.ink, 6);
    R.text(T('throw.button'), b.x, b.y + off, 46, '#ffffff');
  },
};

const ReadChip = {
  // del = the computer's delivery; runT = run-up progress 0..1; show = when it appears (0..1) or null = hidden
  draw(ctx, del, runT, showAt) {
    if (!del || runT <= 0) return;
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, y = s.top + 150;
    const known = showAt !== null && runT >= showAt;
    R.roundRect(cx - 170, y - 40, 340, 80, 26, 'rgba(8,20,36,0.85)', known ? '#9be7ff' : 'rgba(255,255,255,0.35)', 3);
    if (known) {
      Sprites.ui(del.icon, cx - 115, y, 80, 64);
      R.text(T('bowl.type.' + del.type), cx + 30, y, 30, '#ffffff');
    } else {
      R.text(T('read.unknown'), cx, y, 30, '#b8c6d6');
    }
  },
};
