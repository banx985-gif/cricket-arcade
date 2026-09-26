// Cricket Arcade — Boot scene: open storage, load the save (with backup
// recovery), look for an unfinished match, run the content check (debug
// builds), then go to the Title / Home screen.

const BootScene = {
  _t: 0,
  _ready: false,
  pendingResume: null,       // an unfinished match found at start-up

  enter() {
    this._t = 0;
    this._ready = false;
    this._artIn = false;
    // M14: only the home screen's art at start-up. Once it's in, the match art follows in
    // the background (every other screen's art loads when that screen first opens).
    const home = Sprites.loadGroup('home');
    home.then(() => { this._artIn = true; Sprites.loadGroup('match-common'); });
    setTimeout(() => { this._artIn = true; }, 6000);     // slow connection: don't hold the home screen back
    Store.open()
      .then(() => Save.load())
      .catch((e) => { Log.add('error', 'save load failed: ' + e); Save.data = Save.defaults(); })
      .then(() => Platform.initFullGame({ grandfather: Save.existedContent !== null && Save.existedContent < 8 }))
      .catch((e) => { Log.add('error', 'entitlement: ' + e); })
      .then(() => Save.loadResume())
      .then((r) => { this.pendingResume = r; })
      .catch(() => { this.pendingResume = null; })
      .then(() => {
        if (CONFIG.DEBUG_BUILD && typeof Validate !== 'undefined') Validate.run();
        this._ready = true;
      });
  },

  update(dt) {
    this._t += dt;
    if (this._ready && this._artIn && this._t > 0.25) Scenes.go('title');
  },

  render(ctx) {
    R.clear('#0d2a1a');
    R.text(T('boot.loading'), CONFIG.LOGICAL_W / 2, CONFIG.LOGICAL_H / 2, 48, '#ffffff');
  },
};
