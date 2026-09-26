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

  // M14: art loads per screen. ASSET_MANIFEST.scenes lists the art groups a screen needs;
  // if they aren't in yet, the old screen stays (frozen, with a LOADING note) until they are.
  pending: null,             // { name, params, t }
  LOAD_WAIT_MAX: 12,         // seconds: after this, open the screen anyway (placeholders draw)

  _artMissing(name) {
    const need = (typeof ASSET_MANIFEST !== 'undefined' && ASSET_MANIFEST.scenes && ASSET_MANIFEST.scenes[name]) || [];
    return typeof Sprites === 'undefined' ? [] : need.filter((g) => !Sprites.groupReady(g));
  },

  go(name, params) {
    if (!this.registry[name]) { console.error('Unknown scene', name); return; }
    const missing = this._artMissing(name);
    if (!missing.length || !this.current) { this.pending = null; this._switch(name, params); return; }
    const p = this.pending = { name, params, t: 0 };
    Promise.all(missing.map((g) => Sprites.loadGroup(g))).then(() => {
      if (this.pending === p) { this.pending = null; this._switch(name, params); }
    });
  },

  _switch(name, params) {
    const next = this.registry[name];
    // Let go of any held fingers so nothing carries over into the new scene.
    if (this.current) PointerHub.releaseAll();
    if (this.current && this.current.exit) this.current.exit();
    this.current = next;
    this.currentName = name;
    Log.add('scene', name);
    if (next.enter) next.enter(params || {});
    if (typeof Sound !== 'undefined' && Sound.forScene) Sound.forScene(name);     // the screen's music + crowd (M12)
    if (typeof Platform !== 'undefined' && Platform.keepAwake && typeof SOUND_DATA !== 'undefined') Platform.keepAwake(SOUND_DATA.crowdScenes.includes(name));   // screen on in matches (M13)
  },

  update(dt, realDt) {
    if (this.pending) {
      this.pending.t += realDt || dt;
      if (this.pending.t > this.LOAD_WAIT_MAX) { const p = this.pending; this.pending = null; this._switch(p.name, p.params); }
      return;
    }
    if (this.current && this.current.update) this.current.update(dt, realDt);
  },
  render(ctx) {
    if (this.current && this.current.render) this.current.render(ctx);
    if (this.pending && this.pending.t > 0.15) {        // a quick loading moment (only if it takes a while)
      const v = Display.viewRect();
      ctx.fillStyle = 'rgba(5,12,22,0.6)';
      ctx.fillRect(v.x, v.y, v.w, v.h);
      R.text(T('boot.loading'), CONFIG.LOGICAL_W / 2, CONFIG.LOGICAL_H / 2, 48, '#ffffff');
    }
  },
  pointerDown(id, x, y) { if (this.pending) return; if (this.current && this.current.pointerDown) this.current.pointerDown(id, x, y); },
  pointerMove(id, x, y) { if (this.current && this.current.pointerMove) this.current.pointerMove(id, x, y); },
  pointerUp(id) { if (this.current && this.current.pointerUp) this.current.pointerUp(id); },
  keyDown(code) { if (this.current && this.current.keyDown) this.current.keyDown(code); },
  keyUp(code) { if (this.current && this.current.keyUp) this.current.keyUp(code); },
  appHidden() { if (this.current && this.current.onAppHidden) this.current.onAppHidden(); },
};
