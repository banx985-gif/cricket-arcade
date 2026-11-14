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
    this.overlay = null;                                   // (an overlay never outlives its screen)
    if (!this.registry[name]) { console.error('Unknown scene', name); return; }
    const missing = this._artMissing(name);
    if (!missing.length || !this.current) { this.pending = null; this._switch(name, params); return; }
    // Keep the game's random numbers exactly as they are now (a resumed match must carry on
    // with the same next ball), whatever the old screen does while the art loads.
    const rng = typeof RNG !== 'undefined' ? RNG.snapshot() : null;
    const p = this.pending = { name, params, t: 0, rng };
    Promise.all(missing.map((g) => Sprites.loadGroup(g))).then(() => { if (this.pending === p) this._finishPending(); });
  },

  _finishPending() {
    const p = this.pending;
    this.pending = null;
    if (p.rng) RNG.restore(p.rng);
    this._switch(p.name, p.params);
  },

  _switch(name, params) {
    const next = this.registry[name];
    // Let go of any held fingers so nothing carries over into the new scene.
    if (this.current) PointerHub.releaseAll();
    if (this.current && this.current.exit) this.current.exit();
    if (this._story()) { Story.open = false; Story.onDone = null; }
    this.current = next;
    this.currentName = name;
    Log.add('scene', name);
    if (next.enter) next.enter(params || {});
    if (typeof Sound !== 'undefined' && Sound.forScene) Sound.forScene(name);     // the screen's music + crowd (M12)
    if (typeof Platform !== 'undefined' && Platform.keepAwake && typeof SOUND_DATA !== 'undefined') Platform.keepAwake(SOUND_DATA.crowdScenes.includes(name));   // screen on in matches (M13)
    // Notifications (Rule B): a tapped notification opens its screen once the game is on a menu;
    // after the first win, the one friendly question shows on the next calm screen.
    if (typeof Notify !== 'undefined' && typeof Save !== 'undefined' && Save.data) {
      if (name === 'missions') Notify.ensure(Save.data).missionsSeen = Notify._missionsOpen(Save.data);
      if (Notify.pendingRoute && name === 'title' && !(Scenes.registry.title.resume)) { Notify.follow(); return; }
      // Never over the title's resume or welcome panels.
      const busy = name === 'title' && (next.resume || next.welcome);
      if (!busy && Notify.shouldAsk(Save.data, name)) NotifyAsk.show();
    }
  },

  update(dt, realDt) {
    if (this.pending) {
      this.pending.t += realDt || dt;
      if (this.pending.t > this.LOAD_WAIT_MAX) this._finishPending();
      return;
    }
    if (this._story()) Story.update(realDt || dt);
    if (this.overlay) { if (this.overlay.update) this.overlay.update(realDt || dt); return; }   // the scene under it waits (paused)
    if (this.current && this.current.update) this.current.update(dt, realDt);
  },
  // M19: a screen opened over the current one without leaving it (Settings from the pause menu).
  // The scene below keeps its state; closing the overlay goes straight back to it.
  overlay: null,
  openOverlay(scene, params) { this.overlay = scene; if (scene.enter) scene.enter(Object.assign({ overlay: true }, params || {})); },
  closeOverlay() { const o = this.overlay; this.overlay = null; if (o && o.exit) o.exit(); if (this.current && this.current.onOverlayClosed) this.current.onOverlayClosed(); },
  _ask() { return typeof NotifyAsk !== 'undefined' && NotifyAsk.open; },
  _story() { return typeof Story !== 'undefined' && Story.open; },        // M17: a story scene over the screen
  render(ctx) {
    if (this.current && this.current.render) this.current.render(ctx);
    if (this.overlay && this.overlay.render) this.overlay.render(ctx);
    if (this._story()) Story.render(ctx);
    if (this._ask()) NotifyAsk.render(ctx);
    if (this.pending && this.pending.t > 0.15) {        // a quick loading moment (only if it takes a while)
      const v = Display.viewRect();
      ctx.fillStyle = 'rgba(5,12,22,0.6)';
      ctx.fillRect(v.x, v.y, v.w, v.h);
      R.text(T('boot.loading'), CONFIG.LOGICAL_W / 2, CONFIG.LOGICAL_H / 2, 48, '#ffffff');
    }
  },
  pointerDown(id, x, y) { if (this.pending) return; if (this._ask()) { NotifyAsk.pointerDown(id, x, y); return; } if (this._story()) { Story.pointerDown(id, x, y); return; } if (this.overlay) { if (this.overlay.pointerDown) this.overlay.pointerDown(id, x, y); return; } if (this.current && this.current.pointerDown) this.current.pointerDown(id, x, y); },
  pointerMove(id, x, y) { if (this._ask()) { NotifyAsk.pointerMove(id, x, y); return; } if (this._story()) { Story.pointerMove(id, x, y); return; } if (this.overlay) { if (this.overlay.pointerMove) this.overlay.pointerMove(id, x, y); return; } if (this.current && this.current.pointerMove) this.current.pointerMove(id, x, y); },
  pointerUp(id) { if (this._ask()) { NotifyAsk.pointerUp(id); return; } if (this._story()) { Story.pointerUp(id); return; } if (this.overlay) { if (this.overlay.pointerUp) this.overlay.pointerUp(id); return; } if (this.current && this.current.pointerUp) this.current.pointerUp(id); },
  keyDown(code) { if (this._ask()) { if (code === 'Escape') NotifyAsk.dismiss(); return; } if (this._story()) { Story.keyDown(code); return; } if (this.overlay) { if (this.overlay.keyDown) this.overlay.keyDown(code); return; } if (this.current && this.current.keyDown) this.current.keyDown(code); },
  keyUp(code) { if (this.current && this.current.keyUp) this.current.keyUp(code); },
  appHidden() { if (this.current && this.current.onAppHidden) this.current.onAppHidden(); },
};
