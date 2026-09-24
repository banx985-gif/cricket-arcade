// Cricket Arcade — Boot scene: open storage, load the save, then go to Title.

const BootScene = {
  _t: 0,
  _ready: false,

  enter() {
    this._t = 0;
    this._ready = false;
    Sprites.loadGroup('boot');
    Sprites.loadGroup('match-common');
    Store.open()
      .then(() => Save.load())
      .catch(() => { Save.data = Save.defaults(); })
      .then(() => {
        Sound.setMuted(Save.data.settings.muted);
        this._ready = true;
      });
  },

  update(dt) {
    this._t += dt;
    if (this._ready && this._t > 0.25) Scenes.go('title');
  },

  render(ctx) {
    R.clear('#0d2a1a');
    R.text(T('boot.loading'), CONFIG.LOGICAL_W / 2, CONFIG.LOGICAL_H / 2, 48, '#ffffff');
  },
};
