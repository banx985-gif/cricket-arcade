// Cricket Arcade — Input.
// PointerHub is copied from Scrapcore ZERO: raw multi-touch via Pointer Events,
// one ID per finger, converted to logical coords. Each finger is handled on
// its own, so the left thumb can hold the aim while the right thumb taps a
// shot button at the same moment.
// Keys adds a small keyboard layer so the game is playable on a PC too.

const PointerHub = {
  handlers: null,
  active: {},            // pointerId -> {x, y}

  init(canvas, handlers) {
    this.handlers = handlers; // { down(id,x,y), move(id,x,y), up(id) }

    const down = (e) => {
      e.preventDefault();
      try { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      const p = Display.toLogical(e.clientX, e.clientY);
      this.active[e.pointerId] = p;
      this.handlers.down(e.pointerId, p.x, p.y);
    };
    const move = (e) => {
      if (!this.active[e.pointerId]) return;   // ignore hover (mouse without button)
      e.preventDefault();
      const p = Display.toLogical(e.clientX, e.clientY);
      this.active[e.pointerId] = p;
      this.handlers.move(e.pointerId, p.x, p.y);
    };
    const up = (e) => {
      if (!this.active[e.pointerId]) return;
      e.preventDefault();
      delete this.active[e.pointerId];
      this.handlers.up(e.pointerId);
    };

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  // Drop every finger (used when the app is backgrounded).
  releaseAll() {
    for (const id of Object.keys(this.active)) {
      delete this.active[id];
      this.handlers.up(Number(id));
    }
  },
};

const Keys = {
  held: {},
  _down: [],

  init(onDown, onUp) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.held[e.code] = true;
      if (onDown) onDown(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.held[e.code] = false;
      if (onUp) onUp(e.code);
    });
    window.addEventListener('blur', () => { this.held = {}; });
  },

  any(codes) {
    for (const c of codes) if (this.held[c]) return true;
    return false;
  },
};
