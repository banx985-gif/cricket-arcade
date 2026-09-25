// Cricket Arcade — batting touch controls (plan 6.1).
// Left thumb: analog AIM pad (left/right = side, up = loft, down = ground).
// Right thumb: CONTROL, POWER, DEFEND buttons.
// Each control is owned by one finger ID, so both thumbs work at once
// (stick handling pattern from Scrapcore ZERO's Controls).

const BatControls = {
  LAYOUT: {
    padRadius: 165, knobRadius: 64, maxTravel: 130, deadZone: 0.14,
    padX: 270, padY: 265,               // home, from safe bottom-left
    aimMemory: 0.35,                    // aim is remembered briefly after lifting the thumb
    buttons: {
      power:   { r: 128, dx: 205, dy: 205, color: '#ff5a1f' },
      control: { r: 106, dx: 480, dy: 150, color: '#2f9bff' },
      defend:  { r: 96,  dx: 190, dy: 475, color: '#8a9aa8' },
    },
  },

  pad: { id: null, ox: 0, oy: 0, kx: 0, ky: 0, x: 0, y: 0, active: false, lastT: -9, lastX: 0, lastY: 0 },
  home: { x: 0, y: 0 },
  btn: {},
  enabled: true,        // false = buttons shown dimmed (e.g. between balls)
  onShot: null,         // callback(shotId)
  _time: 0,

  init(onShot) {
    this.onShot = onShot;
    for (const k of Object.keys(this.LAYOUT.buttons)) {
      this.btn[k] = { id: null, pressed: false, x: 0, y: 0, r: this.LAYOUT.buttons[k].r, flash: 0 };
    }
    this.layout();
  },

  layout() {
    if (!this.BASE) this.BASE = this.LAYOUT;
    this.LAYOUT = ControlPrefs.scaled(this.BASE);            // Settings: control size
    const s = Display.safe, L = this.LAYOUT;
    this.home.x = ControlPrefs.fromLeft(s, L.padX);          // Settings: left-handed layout mirrors it
    this.home.y = s.bottom - L.padY;
    for (const k of Object.keys(L.buttons)) {
      const b = L.buttons[k];
      this.btn[k].x = ControlPrefs.fromRight(s, b.dx);
      this.btn[k].y = s.bottom - b.dy;
      this.btn[k].r = b.r;
    }
  },

  reset() {
    this._releasePad();
    for (const k of Object.keys(this.btn)) { this.btn[k].id = null; this.btn[k].pressed = false; }
  },

  // ---- pointer routing: return true if consumed ----
  down(id, x, y) {
    // Buttons first (with a fat-finger margin).
    for (const k of ['power', 'control', 'defend']) {
      const b = this.btn[k];
      if (b.id === null && Math.hypot(x - b.x, y - b.y) <= b.r * 1.18) {
        b.id = id; b.pressed = true; b.flash = 1;
        if (this.onShot) this.onShot(k);   // the scene decides whether a swing is allowed
        return true;
      }
    }
    // Aim pad: anywhere in the lower-left region; the pad follows the thumb.
    const s = Display.safe;
    const inZone = ControlPrefs.aimSide(s, x, 0.42) && y > s.top + 260;
    if (inZone && this.pad.id === null) {
      const p = this.pad;
      p.id = id;
      // start at the home pad if the touch lands on it, otherwise float to the thumb
      if (Math.hypot(x - this.home.x, y - this.home.y) <= this.LAYOUT.padRadius) { p.ox = this.home.x; p.oy = this.home.y; }
      else { p.ox = x; p.oy = y; }
      p.active = true;
      this._updatePad(x, y);
      return true;
    }
    return false;
  },

  move(id, x, y) {
    if (this.pad.id === id) { this._updatePad(x, y); return true; }
    return false;
  },

  up(id) {
    if (this.pad.id === id) { this._releasePad(); return true; }
    for (const k of Object.keys(this.btn)) {
      const b = this.btn[k];
      if (b.id === id) { b.id = null; b.pressed = false; return true; }
    }
    return false;
  },

  keyShot(code) {
    const map = { KeyJ: 'control', KeyK: 'power', Space: 'power', KeyL: 'defend' };
    const k = map[code];
    if (!k) return false;
    this.btn[k].flash = 1;
    if (this.onShot) this.onShot(k);
    return true;
  },

  _updatePad(x, y) {
    const p = this.pad, L = this.LAYOUT;
    let dx = x - p.ox, dy = y - p.oy;
    const len = Math.hypot(dx, dy);
    if (len > L.maxTravel) {
      // drag the base along behind the thumb
      const pull = 1 - L.maxTravel / len;
      p.ox += dx * pull; p.oy += dy * pull;
      dx = dx / len * L.maxTravel; dy = dy / len * L.maxTravel;
    }
    p.kx = dx; p.ky = dy;
    const fx = dx / L.maxTravel, fy = dy / L.maxTravel;
    const mag = Math.hypot(fx, fy);
    if (mag < L.deadZone) { p.x = 0; p.y = 0; }
    else { const k = (mag - L.deadZone) / (1 - L.deadZone) / mag; p.x = fx * k; p.y = fy * k; }
    p.lastT = this._time; p.lastX = p.x; p.lastY = p.y;
  },

  _releasePad() {
    const p = this.pad;
    if (p.active) { p.lastT = this._time; p.lastX = p.x; p.lastY = p.y; }
    p.id = null; p.active = false; p.kx = 0; p.ky = 0; p.x = 0; p.y = 0;
  },

  update(realDt) {
    this._time += realDt;
    for (const k of Object.keys(this.btn)) this.btn[k].flash = Math.max(0, this.btn[k].flash - realDt * 4);
  },

  // Current aim: {x: -1..1 (right = off side), y: -1..1 (up = loft), active}
  aim() {
    const p = this.pad;
    // Keyboard (PC)
    let kx = 0, ky = 0;
    if (Keys.any(['KeyA', 'ArrowLeft'])) kx -= 1;
    if (Keys.any(['KeyD', 'ArrowRight'])) kx += 1;
    if (Keys.any(['KeyW', 'ArrowUp'])) ky -= 1;
    if (Keys.any(['KeyS', 'ArrowDown'])) ky += 1;
    if (kx || ky) {
      const l = Math.hypot(kx, ky);
      return { x: kx / l, y: ky / l, active: true };
    }
    // Settings: batting direction sensitivity
    const sens = typeof GameSettings !== 'undefined' ? GameSettings.factor('batSensitivity') : 1;
    if (p.active && (p.x || p.y)) return { x: Math.max(-1, Math.min(1, p.x * sens)), y: p.y, active: true };
    if (this._time - p.lastT < this.LAYOUT.aimMemory && (p.lastX || p.lastY)) {
      return { x: p.lastX, y: p.lastY, active: true };
    }
    return { x: 0, y: 0, active: false };
  },

  draw(ctx) {
    const L = this.LAYOUT, p = this.pad;
    // ---- aim pad ----
    const bx = p.active ? p.ox : this.home.x, by = p.active ? p.oy : this.home.y;
    const art = Sprites.ui('hud_aim_pad', bx, by, L.padRadius * 2.1, L.padRadius * 2.1, { alpha: p.active ? 0.95 : 0.8 });
    if (!art) {
      R.circle(bx, by, L.padRadius, 'rgba(10,20,15,0.38)', 'rgba(255,255,255,0.55)', 5);
      R.text('▲', bx, by - L.padRadius + 30, 30, 'rgba(255,255,255,0.8)', 'center', false);
      R.text('▼', bx, by + L.padRadius - 28, 30, 'rgba(255,255,255,0.8)', 'center', false);
      R.text('◀', bx - L.padRadius + 28, by, 30, 'rgba(255,255,255,0.8)', 'center', false);
      R.text('▶', bx + L.padRadius - 28, by, 30, 'rgba(255,255,255,0.8)', 'center', false);
    }
    R.text(T('hud.loft'), bx, by - L.padRadius - 26, 26, '#ffffff');
    R.text(T('hud.ground'), bx, by + L.padRadius + 26, 26, '#ffffff');
    const kx = bx + p.kx, ky = by + p.ky;
    if (art) {
      // glowing thumb marker over the pad art
      if (p.active) {
        R.circle(kx, ky, L.knobRadius * 0.95, 'rgba(120,200,255,0.35)');
        R.circle(kx, ky, L.knobRadius * 0.7, 'rgba(255,255,255,0.85)', '#ffd23f', 5);
      }
    } else {
      R.circle(kx, ky, L.knobRadius, p.active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.5)', CONFIG.COLOR.ink, 4);
      if (!p.active) R.text(T('hud.aim'), kx, ky + 2, 26, CONFIG.COLOR.ink, 'center', false);
    }

    // ---- shot buttons ----
    for (const k of ['defend', 'control', 'power']) {
      const b = this.btn[k], def = L.buttons[k];
      const off = b.pressed ? 5 : 0;
      const sc = b.pressed ? 0.94 : 1;
      R.circle(b.x + 5, b.y + 8, b.r, 'rgba(0,0,0,0.4)');
      const drewArt = Sprites.ui('shot_' + k, b.x, b.y + off, b.r * 2.1 * sc, b.r * 2.1 * sc);
      if (!drewArt) {
        R.circle(b.x, b.y + off, b.r, def.color, CONFIG.COLOR.ink, 6);
        R.circle(b.x, b.y + off - b.r * 0.28, b.r * 0.62, 'rgba(255,255,255,0.18)');
      }
      if (b.flash > 0) R.circle(b.x, b.y + off, b.r + 16 * (1 - b.flash), null, `rgba(255,255,255,${b.flash})`, 8);
      if (!this.enabled) R.circle(b.x, b.y + off, b.r * 1.02, 'rgba(20,20,20,0.45)');
      // label: centred on plain buttons, on a strip across the bottom of art buttons
      const size = k === 'power' ? 40 : 32;
      if (drewArt) {
        R.roundRect(b.x - b.r * 0.8, b.y + off + b.r * 0.55, b.r * 1.6, size * 1.25, 14, 'rgba(0,0,0,0.6)');
        R.text(T('shot.' + k), b.x, b.y + off + b.r * 0.55 + size * 0.63, size, '#ffffff');
      } else {
        R.text(T('shot.' + k), b.x, b.y + off, size, '#ffffff');
      }
    }
  },
};
