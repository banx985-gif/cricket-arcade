// Cricket Arcade — bowling touch controls (plan 6.2).
// Step 1: tap one of four DELIVERY slots on the right.
// Step 2: left thumb drags the target reticle on the pitch.
// Step 3: hold BOWL — the bowler runs in and the meter fills; let go in the
//         gold band for a PERFECT release.
// Step 4: straight after release, a quick sideways swipe anywhere adds extra
//         swing or spin (only for deliveries that can move; see BOWLING_DATA.swipe).
// Each control belongs to one finger ID, so aiming and bowling work together.

const BowlControls = {
  LAYOUT: {
    bowl: { r: 128, dx: 210, dy: 210 },
    slotR: 80,
    slots: [ { dx: 500, dy: 150 }, { dx: 505, dy: 345 }, { dx: 380, dy: 500 }, { dx: 200, dy: 520 } ],
    meterR: 158,
    padX: 270, padY: 265, padR: 150,
  },

  bowl: { id: null, pressed: false, x: 0, y: 0 },
  slots: [],
  drag: { id: null, lx: 0, ly: 0, dx: 0, dy: 0, active: false, ox: 0, oy: 0 },
  home: { x: 0, y: 0 },
  enabled: true,          // BOWL/aim usable
  selected: 0,
  meter: 0,               // shown charge (0..max)
  meterOn: false,
  deliveries: null,       // the bowler's four deliveries (a family from BOWLING_DATA)
  bands: null,            // { perfect: [a, b], good: [a, b] } for this bowler (Control, fatigue)
  swipeOpen: false,       // Step 4 window
  sw: { id: null, x0: 0, dx: 0 },
  onSelect: null, onBowlDown: null, onBowlUp: null, onSwipe: null,

  init(handlers, deliveries) {
    this.onSelect = handlers.select;
    this.onBowlDown = handlers.bowlDown;
    this.onBowlUp = handlers.bowlUp;
    this.onSwipe = handlers.swipe || null;
    this.setDeliveries(deliveries || BOWLING_DATA.deliveries);
    this.bands = null;
    this.layout();
  },

  setDeliveries(list) {
    this.deliveries = list;
    this.slots = list.map(() => ({ x: 0, y: 0, flash: 0 }));
    this.layout();
  },

  // Release bands in use (defaults from BOWLING_DATA.charge).
  band(name) { return (this.bands && this.bands[name]) || BOWLING_DATA.charge[name]; },

  layout() {
    if (!this.BASE) this.BASE = this.LAYOUT;
    this.LAYOUT = ControlPrefs.scaled(this.BASE);            // Settings: control size
    const s = Display.safe, L = this.LAYOUT;
    this.bowl.x = ControlPrefs.fromRight(s, L.bowl.dx);      // Settings: left-handed layout mirrors it
    this.bowl.y = s.bottom - L.bowl.dy;
    L.slots.forEach((p, i) => { if (this.slots[i]) { this.slots[i].x = ControlPrefs.fromRight(s, p.dx); this.slots[i].y = s.bottom - p.dy; } });
    this.home.x = ControlPrefs.fromLeft(s, L.padX);
    this.home.y = s.bottom - L.padY;
  },

  reset() {
    this.bowl.id = null; this.bowl.pressed = false;
    this.drag.id = null; this.drag.active = false; this.drag.dx = 0; this.drag.dy = 0;
    this.sw.id = null; this.sw.dx = 0; this.swipeOpen = false;
  },

  down(id, x, y) {
    if (this.swipeOpen) {
      this.sw.id = id; this.sw.x0 = x; this.sw.dx = 0;
      return true;
    }
    const b = this.bowl;
    if (b.id === null && Math.hypot(x - b.x, y - b.y) <= this.LAYOUT.bowl.r * 1.18) {
      b.id = id; b.pressed = true;
      if (this.onBowlDown) this.onBowlDown();
      return true;
    }
    for (let i = 0; i < this.slots.length; i++) {
      const sl = this.slots[i];
      if (Math.hypot(x - sl.x, y - sl.y) <= this.LAYOUT.slotR * 1.15) {
        sl.flash = 1;
        if (this.onSelect) this.onSelect(i);
        return true;
      }
    }
    const s = Display.safe;
    if (this.drag.id === null && ControlPrefs.aimSide(s, x, 0.45) && y > s.top + 240) {
      const d = this.drag;
      d.id = id; d.lx = x; d.ly = y; d.active = true; d.ox = x; d.oy = y;
      return true;
    }
    return false;
  },

  move(id, x, y) {
    if (this.sw.id === id) {
      this.sw.dx = x - this.sw.x0;
      if (this.swipeOpen && Math.abs(this.sw.dx) >= BOWLING_DATA.swipe.fullPx && this.onSwipe) { this.onSwipe(this.sw.dx); this.sw.id = null; }
      return true;
    }
    const d = this.drag;
    if (d.id !== id) return false;
    d.dx += x - d.lx; d.dy += y - d.ly;
    d.lx = x; d.ly = y;
    return true;
  },

  up(id) {
    if (this.sw.id === id) {
      this.sw.id = null;
      if (this.swipeOpen && Math.abs(this.sw.dx) >= BOWLING_DATA.swipe.minPx && this.onSwipe) this.onSwipe(this.sw.dx);
      return true;
    }
    if (this.bowl.id === id) {
      this.bowl.id = null; this.bowl.pressed = false;
      if (this.onBowlUp) this.onBowlUp();
      return true;
    }
    if (this.drag.id === id) { this.drag.id = null; this.drag.active = false; return true; }
    return false;
  },

  // Thumb movement since last frame (logical px), then cleared.
  takeDrag() {
    const d = this.drag;
    const out = { x: d.dx, y: d.dy };
    d.dx = 0; d.dy = 0;
    return out;
  },

  // Keyboard: 1–4 pick a delivery; Space/K hold to bowl.
  keyDown(code) {
    if (this.swipeOpen && this.onSwipe) {
      const dir = { KeyA: -1, ArrowLeft: -1, KeyD: 1, ArrowRight: 1 }[code];
      if (dir) { this.onSwipe(dir * BOWLING_DATA.swipe.fullPx); return true; }
    }
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[code];
    if (n !== undefined) { this.slots[n].flash = 1; if (this.onSelect) this.onSelect(n); return true; }
    if ((code === 'Space' || code === 'KeyK') && !this.bowl.pressed) {
      this.bowl.pressed = true; this.bowl.key = true;
      if (this.onBowlDown) this.onBowlDown();
      return true;
    }
    return false;
  },
  keyUp(code) {
    if ((code === 'Space' || code === 'KeyK') && this.bowl.key) {
      this.bowl.pressed = false; this.bowl.key = false;
      if (this.onBowlUp) this.onBowlUp();
      return true;
    }
    return false;
  },

  update(realDt) {
    for (const sl of this.slots) sl.flash = Math.max(0, sl.flash - realDt * 4);
  },

  draw(ctx) {
    const L = this.LAYOUT, C = BOWLING_DATA.charge;

    // ---- aim hint (left) ----
    const d = this.drag;
    const hx = d.active ? d.lx : this.home.x, hy = d.active ? d.ly : this.home.y;
    const alpha = this.enabled ? (d.active ? 0.85 : 0.6) : 0.3;
    if (!Sprites.ui('hud_aim_pad', hx, hy, L.padR * 2, L.padR * 2, { alpha })) {
      R.circle(hx, hy, L.padR, `rgba(10,20,15,${alpha * 0.5})`, `rgba(255,255,255,${alpha})`, 5);
    }
    if (!d.active) R.text(T('bowl.dragAim'), this.home.x, this.home.y + L.padR + 28, 26, '#ffffff');

    // ---- delivery slots ----
    this.slots.forEach((sl, i) => {
      const def = this.deliveries[i];
      const sel = i === this.selected;
      const r = L.slotR * (sel ? 1.08 : 1);
      R.circle(sl.x + 4, sl.y + 6, r, 'rgba(0,0,0,0.35)');
      R.circle(sl.x, sl.y, r, sel ? 'rgba(255,210,63,0.95)' : 'rgba(12,30,50,0.85)', sel ? '#ffffff' : 'rgba(255,255,255,0.45)', sel ? 6 : 3);
      if (!Sprites.ui(def.icon, sl.x, sl.y - 8, r * 1.6, r * 1.3)) {
        R.circle(sl.x, sl.y - 8, r * 0.45, '#c1121f');
      }
      R.roundRect(sl.x - r * 0.95, sl.y + r * 0.42, r * 1.9, 36, 12, 'rgba(0,0,0,0.65)');
      R.text(T('bowl.type.' + def.id), sl.x, sl.y + r * 0.42 + 19, 24, sel ? '#ffd23f' : '#ffffff', 'center', false);
      if (sl.flash > 0) R.circle(sl.x, sl.y, r + 14 * (1 - sl.flash), null, `rgba(255,255,255,${sl.flash})`, 6);
      if (!this.enabled) R.circle(sl.x, sl.y, r, 'rgba(20,20,20,0.4)');
    });

    // ---- charge meter: arc around BOWL with the release bands ----
    const b = this.bowl;
    const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
    const ang = (v) => a0 + span * (v / C.max);
    const ring = (v0, v1, col, w) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, L.meterR, ang(v0), ang(v1));
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.stroke();
    };
    ring(0, C.max, 'rgba(0,0,0,0.55)', 26);
    const good = this.band('good'), perfect = this.band('perfect');
    ring(good[0], good[1], 'rgba(120,230,110,0.8)', 18);
    ring(perfect[0], perfect[1], '#ffd23f', 18);
    ring(C.noBallAbove, C.max, 'rgba(255,70,70,0.85)', 18);
    if (this.meterOn || this.meter > 0) {
      const v = Math.min(C.max, this.meter);
      ring(0, v, 'rgba(255,255,255,0.35)', 8);
      const a = ang(v);
      const px = b.x + Math.cos(a) * L.meterR, py = b.y + Math.sin(a) * L.meterR;
      R.circle(px, py, 17, '#ffffff', CONFIG.COLOR.ink, 4);
    }

    // ---- BOWL button ----
    const off = b.pressed ? 5 : 0;
    const r = L.bowl.r;
    R.circle(b.x + 5, b.y + 8, r, 'rgba(0,0,0,0.4)');
    R.circle(b.x, b.y + off, r, '#1f8a4c', CONFIG.COLOR.ink, 6);
    R.circle(b.x, b.y + off - r * 0.28, r * 0.62, 'rgba(255,255,255,0.18)');
    Sprites.ui(this.deliveries[this.selected].icon, b.x, b.y + off - 18, r * 1.1, r * 0.9, { alpha: 0.9 });
    R.text(T('bowl.bowl'), b.x, b.y + off + r * 0.52, 40, '#ffffff');
    if (!this.enabled) R.circle(b.x, b.y + off, r, 'rgba(20,20,20,0.45)');
  },
};
