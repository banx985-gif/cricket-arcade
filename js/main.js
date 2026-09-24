// Cricket Arcade — entry point (loop structure from Scrapcore ZERO's main.js).
// requestAnimationFrame + clamped delta time. Slow-motion scales GAME time,
// never the real clock, so frame pacing stays honest. Ball physics runs on a
// fixed step inside the ball path simulation (ballpath.js).

const Main = {
  fps: 60,
  _lastT: 0,
  _fpsAcc: 0,
  _fpsFrames: 0,

  start() {
    document.getElementById('rotate-text').textContent = T('app.rotate');
    const canvas = document.getElementById('game-canvas');
    Display.init(canvas);
    R.init(Display.ctx);
    Platform.init();
    Effects.init();

    PointerHub.init(canvas, {
      down: (id, x, y) => Scenes.pointerDown(id, x, y),
      move: (id, x, y) => Scenes.pointerMove(id, x, y),
      up: (id) => Scenes.pointerUp(id),
    });
    Keys.init((code) => {
      if (code === 'Backquote' && Dev.enabled) { Dev.toggle(); return; }
      if (Dev.open) { if (code === 'Escape') Dev.hide(); return; }
      Sound.unlock();
      Scenes.keyDown(code);
    }, (code) => { if (!Dev.open) Scenes.keyUp(code); });

    // Plan 43A.6: going to the background pauses play and audio.
    Platform.onPause(() => {
      PointerHub.releaseAll();
      Scenes.appHidden();
      Sound.suspend();
    });
    Platform.onResume(() => Sound.resume());

    Display.onResize(() => {
      const sc = Scenes.current;
      if (sc && sc._layout) sc._layout();
      if (Dev.open) Dev._layout();
    });

    Scenes.register('boot', BootScene);
    Scenes.register('title', TitleScene);
    Scenes.register('sixsmash', SixSmashScene);
    Scenes.register('wicketrush', WicketRushScene);
    Scenes.register('result', ResultScene);
    Scenes.register('toss', TossScene);
    Scenes.register('matchbat', MatchBatScene);
    Scenes.register('matchbowl', MatchBowlScene);
    Scenes.register('matchbreak', MatchBreakScene);
    Scenes.register('matchresult', MatchResultScene);
    Scenes.go('boot');

    this._lastT = performance.now();
    requestAnimationFrame((t) => this._tick(t));
  },

  _tick(t) {
    let dt = (t - this._lastT) / 1000;
    this._lastT = t;
    if (dt > CONFIG.MAX_DT) dt = CONFIG.MAX_DT;
    if (dt < 0) dt = 0;

    this._fpsAcc += dt;
    this._fpsFrames++;
    if (this._fpsAcc >= 0.5) {
      this.fps = this._fpsFrames / this._fpsAcc;
      this._fpsAcc = 0;
      this._fpsFrames = 0;
    }

    let scale = Effects.timeScale(dt);
    if (Dev.slowmo) scale *= 0.3;

    try {
      Effects.updateReal(dt);
      Dev.update(dt);
      Scenes.update(dt * scale, dt);
      Display.beginFrame();
      Scenes.render(Display.ctx);
      Dev.render(Display.ctx, this.fps);
    } catch (e) {
      Log.add('error', e && e.stack ? e.stack.split('\n')[0] : String(e));
      console.error(e);
    }

    requestAnimationFrame((tt) => this._tick(tt));
  },
};

window.addEventListener('load', () => Main.start());
