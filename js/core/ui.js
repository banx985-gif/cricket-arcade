// Cricket Arcade — simple menu buttons (idea from Scrapcore ZERO's UIButtons).
// A button fires when the finger is released over it, so a thumb that slides
// off cancels the press. Labels are functions or string keys, never raw text.

class ButtonList {
  constructor() { this.items = []; this._owner = {}; }

  // label: a string key, or a function returning display text
  add(label, x, y, w, h, cb, opts) {
    const o = opts || {};
    const b = { label, x, y, w, h, cb, color: o.color || CONFIG.COLOR.yellow,
      textColor: o.textColor || CONFIG.COLOR.ink, size: o.size || 46, pressed: false, id: null,
      icon: o.icon || null,             // sprite id drawn on the left
      disabled: o.disabled || false,    // true or a function: greyed, and a tap does nothing
      sub: o.sub || null,               // small second line (string key or function)
      onLocked: o.onLocked || null };   // tapped while disabled (e.g. show what unlocks it)
    // enforce the minimum touch size (plan 6)
    if (b.h < CONFIG.MIN_TOUCH) { b.y -= (CONFIG.MIN_TOUCH - b.h) / 2; b.h = CONFIG.MIN_TOUCH; }
    if (b.w < CONFIG.MIN_TOUCH) { b.x -= (CONFIG.MIN_TOUCH - b.w) / 2; b.w = CONFIG.MIN_TOUCH; }
    this.items.push(b);
    return b;
  }

  clear() { this.items = []; }

  _at(x, y) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const b = this.items[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  down(id, x, y) {
    const b = this._at(x, y);
    if (!b || b.id !== null) return false;
    b.id = id;
    b.pressed = true;
    return true;
  }

  move(id, x, y) {
    for (const b of this.items) {
      if (b.id === id) b.pressed = (this._at(x, y) === b);
    }
  }

  up(id) {
    for (const b of this.items) {
      if (b.id !== id) continue;
      const fire = b.pressed;
      b.id = null;
      b.pressed = false;
      if (fire && this.isDisabled(b)) { Sound.play('ui_error'); if (b.onLocked) b.onLocked(); return true; }
      if (fire) {
        const key = typeof b.label === 'string' ? b.label : '';
        Sound.play(b.sound || (/back|close|cancel/i.test(key) ? 'ui_back' : /play|next|confirm|start|create|sign/i.test(key) ? 'ui_confirm' : 'uiTap'));
        b.cb();
        return true;
      }
    }
    return false;
  }

  labelOf(b) { return typeof b.label === 'function' ? b.label() : T(b.label); }
  isDisabled(b) { return typeof b.disabled === 'function' ? b.disabled() : !!b.disabled; }

  draw() {
    for (const b of this.items) {
      if (b.invisible) continue;                    // a tap area only (the screen draws it)
      const off = b.pressed ? 5 : 0;
      const dis = this.isDisabled(b);
      R.roundRect(b.x + 6, b.y + 8, b.w, b.h, 20, 'rgba(0,0,0,0.45)');
      R.roundRect(b.x, b.y + off, b.w, b.h, 20, dis ? '#5b6570' : b.color, CONFIG.COLOR.ink, 5);
      // top shine
      R.roundRect(b.x + 8, b.y + off + 6, b.w - 16, b.h * 0.32, 14, 'rgba(255,255,255,0.22)');
      if (b.pressed) R.roundRect(b.x, b.y + off, b.w, b.h, 20, 'rgba(0,0,0,0.15)');
      let tx = b.x + b.w / 2;
      if (b.icon) {
        const isz = Math.min(b.h - 16, 96);
        Sprites.ui(b.icon, b.x + 14 + isz / 2, b.y + off + b.h / 2, isz, isz, { alpha: dis ? 0.5 : 1 });
        tx = b.x + 14 + isz + (b.w - 14 - isz) / 2;
      }
      const tc = dis ? '#c9d0d6' : b.textColor;
      if (b.sub) {
        const sub = typeof b.sub === 'function' ? b.sub() : T(b.sub);
        R.text(this.labelOf(b), tx, b.y + off + b.h / 2 - b.size * 0.32, b.size, tc, 'center', false);
        R.text(sub, tx, b.y + off + b.h / 2 + b.size * 0.55, Math.round(b.size * 0.5), tc, 'center', false);
      } else {
        R.text(this.labelOf(b), tx, b.y + off + b.h / 2 + 2, b.size, tc, 'center', false);
      }
    }
  }
}

// Control settings (plan 34): the left-handed layout mirrors the match controls
// (aim on the right thumb, buttons on the left), and Control size scales them.
const ControlPrefs = {
  k() { return typeof GameSettings !== 'undefined' ? GameSettings.factor('controlSize') : 1; },
  left() { return typeof GameSettings !== 'undefined' && !!GameSettings.get('leftHanded'); },
  // x for something placed dx in from the right edge (from the left, mirrored)
  fromRight(s, dx) { return this.left() ? s.left + dx : s.right - dx; },
  fromLeft(s, dx) { return this.left() ? s.right - dx : s.left + dx; },
  // is x on the aiming thumb's side of the screen?
  aimSide(s, x, share) { return this.left() ? x > s.right - (s.right - s.left) * share : x < s.left + (s.right - s.left) * share; },
  // a copy of a layout table with every size and offset scaled (not dead zones or timings)
  scaled(base) {
    const k = this.k(), keep = { deadZone: 1, aimMemory: 1 };
    const walk = (o) => {
      if (Array.isArray(o)) return o.map(walk);
      if (o && typeof o === 'object') { const out = {}; for (const [key, v] of Object.entries(o)) out[key] = keep[key] ? v : walk(v); return out; }
      return typeof o === 'number' ? o * k : o;
    };
    return walk(base);
  },
};

// Accessibility settings (plan 34) used while drawing a match.
const Access = {
  on(key) { return typeof GameSettings !== 'undefined' && !!GameSettings.get(key); },
  // The batting timing ring: colours (colour-safe: blue / yellow, never red-green) and widths.
  ring(perfect, good) {
    const safe = this.on('colourSafe'), big = this.on('contrastTarget');
    const col = perfect ? (safe ? '#ffe14d' : '#ffd23f') : good ? (safe ? '#4da3ff' : '#9cff6a') : 'rgba(255,255,255,0.85)';
    return { col, w: big ? 9 : 5, outline: big ? 15 : 9, label: safe && (perfect || good) };
  },
};
