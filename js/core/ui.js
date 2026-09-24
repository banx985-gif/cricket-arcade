// Cricket Arcade — simple menu buttons (idea from Scrapcore ZERO's UIButtons).
// A button fires when the finger is released over it, so a thumb that slides
// off cancels the press. Labels are functions or string keys, never raw text.

class ButtonList {
  constructor() { this.items = []; this._owner = {}; }

  // label: a string key, or a function returning display text
  add(label, x, y, w, h, cb, opts) {
    const o = opts || {};
    const b = { label, x, y, w, h, cb, color: o.color || CONFIG.COLOR.yellow,
      textColor: o.textColor || CONFIG.COLOR.ink, size: o.size || 46, pressed: false, id: null };
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
      if (fire) {
        Sound.play('uiTap');
        b.cb();
        return true;
      }
    }
    return false;
  }

  labelOf(b) { return typeof b.label === 'function' ? b.label() : T(b.label); }

  draw() {
    for (const b of this.items) {
      const off = b.pressed ? 5 : 0;
      R.roundRect(b.x + 6, b.y + 8, b.w, b.h, 20, 'rgba(0,0,0,0.45)');
      R.roundRect(b.x, b.y + off, b.w, b.h, 20, b.color, CONFIG.COLOR.ink, 5);
      // top shine
      R.roundRect(b.x + 8, b.y + off + 6, b.w - 16, b.h * 0.32, 14, 'rgba(255,255,255,0.22)');
      if (b.pressed) R.roundRect(b.x, b.y + off, b.w, b.h, 20, 'rgba(0,0,0,0.15)');
      R.text(this.labelOf(b), b.x + b.w / 2, b.y + off + b.h / 2 + 2, b.size, b.textColor, 'center', false);
    }
  }
}
