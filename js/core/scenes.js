// Cricket Arcade — scene manager.
// Boot -> Title -> Six Smash -> Result. Each scene is a plain object with
// optional enter(params), exit(), update(dt, realDt), render(ctx),
// pointerDown(id,x,y), pointerMove(id,x,y), pointerUp(id), keyDown(code),
// onAppHidden().

const Scenes = {
  registry: {},
  current: null,
  currentName: null,

  register(name, scene) { this.registry[name] = scene; },

  go(name, params) {
    const next = this.registry[name];
    if (!next) { console.error('Unknown scene', name); return; }
    // Let go of any held fingers so nothing carries over into the new scene.
    if (this.current) PointerHub.releaseAll();
    if (this.current && this.current.exit) this.current.exit();
    this.current = next;
    this.currentName = name;
    Log.add('scene', name);
    if (next.enter) next.enter(params || {});
  },

  update(dt, realDt) { if (this.current && this.current.update) this.current.update(dt, realDt); },
  render(ctx) { if (this.current && this.current.render) this.current.render(ctx); },
  pointerDown(id, x, y) { if (this.current && this.current.pointerDown) this.current.pointerDown(id, x, y); },
  pointerMove(id, x, y) { if (this.current && this.current.pointerMove) this.current.pointerMove(id, x, y); },
  pointerUp(id) { if (this.current && this.current.pointerUp) this.current.pointerUp(id); },
  keyDown(code) { if (this.current && this.current.keyDown) this.current.keyDown(code); },
  keyUp(code) { if (this.current && this.current.keyUp) this.current.keyUp(code); },
  appHidden() { if (this.current && this.current.onAppHidden) this.current.onAppHidden(); },
};
