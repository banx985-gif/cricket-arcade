// Cricket Arcade — entry point (loop structure from Scrapcore ZERO's main.js).
// requestAnimationFrame + clamped delta time. Slow-motion scales GAME time,
// never the real clock, so frame pacing stays honest. Ball physics runs on a
// fixed step inside the ball path simulation (ballpath.js).

const Main = {
  fps: 60,
  _lastT: 0,
  _fpsAcc: 0,
  _fpsFrames: 0,
  frozen: false,          // app is in the background: nothing updates, no input
  tapToContinue: false,   // back from the background: waiting for a tap
  _tapT: 0,

  start() {
    document.getElementById('rotate-text').textContent = T('app.rotate');
    const canvas = document.getElementById('game-canvas');
    Display.init(canvas);
    R.init(Display.ctx);
    Platform.init();
    Effects.init();

    PointerHub.init(canvas, {
      down: (id, x, y) => {
        if (this.frozen) return;
        if (this.tapToContinue) { this._continue(); return; }
        if (Validate.dismiss()) return;
        Scenes.pointerDown(id, x, y);
      },
      move: (id, x, y) => { if (!this.frozen && !this.tapToContinue) Scenes.pointerMove(id, x, y); },
      up: (id) => { if (!this.frozen && !this.tapToContinue) Scenes.pointerUp(id); },
    });
    Keys.init((code) => {
      if (this.frozen) return;
      if (this.tapToContinue) { this._continue(); return; }
      if (code === 'Backquote' && Dev.enabled) { Dev.toggle(); return; }
      if (Dev.open) { if (code === 'Escape') Dev.hide(); return; }
      Sound.unlock();
      Scenes.keyDown(code);
    }, (code) => { if (!Dev.open && !this.frozen && !this.tapToContinue) Scenes.keyUp(code); });

    // Plan 43A.6 — background: block input, autosave at the nearest safe point
    // (the save + the start-of-over match checkpoint), pause audio, freeze.
    Platform.onPause(() => {
      this.frozen = true;
      PointerHub.releaseAll();
      Scenes.appHidden();
      Save.write();
      Sound.suspend();
    });
    // Back again: never fast-forward; wait for a tap before sound comes back.
    Platform.onResume(() => {
      this.frozen = false;
      this.tapToContinue = true;
      this._tapT = 0;
      this._lastT = performance.now();
    });

    Display.onResize(() => {
      const sc = Scenes.current;
      if (sc && sc._layout) sc._layout();
      if (Dev.open) Dev._layout();
    });

    Scenes.register('boot', BootScene);
    Scenes.register('title', TitleScene);
    Scenes.register('settings', SettingsScene);
    Scenes.register('sixsmash', SixSmashScene);
    Scenes.register('wicketrush', WicketRushScene);
    Scenes.register('result', ResultScene);
    Scenes.register('toss', TossScene);
    Scenes.register('matchbat', MatchBatScene);
    Scenes.register('matchbowl', MatchBowlScene);
    Scenes.register('matchbreak', MatchBreakScene);
    Scenes.register('matchresult', MatchResultScene);
    Scenes.register('careerselect', CareerSelectScene);
    Scenes.register('careercreate', CareerCreateScene);
    Scenes.register('careersign', CareerSignScene);
    Scenes.register('careerhome', CareerHomeScene);
    Scenes.register('careerprematch', CareerPreMatchScene);
    Scenes.register('careersim', CareerSimScene);
    Scenes.register('careerresult', CareerResultScene);
    Scenes.register('careerpromoted', CareerPromotedScene);
    Scenes.register('careertree', CareerTreeScene);
    Scenes.register('careerloadout', CareerLoadoutScene);
    Scenes.register('careergear', CareerGearScene);
    Scenes.register('careershop', CareerShopScene);
    Scenes.register('collection', CollectionScene);
    Scenes.register('careerjoin', CareerJoinScene);
    Scenes.register('careeroffers', CareerOffersScene);
    Scenes.register('careertable', CareerTableScene);
    Scenes.register('careercoach', CareerCoachScene);
    Scenes.register('careerretire', CareerRetireScene);
    Scenes.register('halloffame', HallOfFameScene);
    Scenes.register('records', RecordsScene);
    Scenes.go('boot');

    this._lastT = performance.now();
    requestAnimationFrame((t) => this._tick(t));
  },

  _continue() {
    this.tapToContinue = false;
    Sound.unlock();
    Sound.resume();
    this._lastT = performance.now();
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
      const running = !this.frozen && !this.tapToContinue;
      if (running) {
        Effects.updateReal(dt);
        Dev.update(dt);
        Scenes.update(dt * scale, dt);
        AchievementToast.update(dt);
      }
      Display.beginFrame();
      Scenes.render(Display.ctx);
      Stadium.drawLayerOverlay(Display.ctx);
      AchievementToast.draw(Display.ctx);           // an achievement just earned (M09)
      Dev.render(Display.ctx, this.fps);
      if (typeof Validate !== 'undefined') Validate.render(Display.ctx);
      if (this.tapToContinue) this._drawTapToContinue(Display.ctx, dt);
    } catch (e) {
      Log.add('error', e && e.stack ? e.stack.split('\n')[0] : String(e));
      console.error(e);
    }

    requestAnimationFrame((tt) => this._tick(tt));
  },

  _drawTapToContinue(ctx, dt) {
    this._tapT += dt;
    const v = Display.viewRect();
    ctx.fillStyle = 'rgba(4,12,8,0.93)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const cx = CONFIG.LOGICAL_W / 2;
    R.panel(cx - 560, 380, 1120, 300, 'rgba(12,28,48,0.97)', '#ffd23f');
    const s = 1 + Math.sin(this._tapT * 4) * 0.04;
    ctx.save();
    ctx.translate(cx, 500);
    ctx.scale(s, s);
    R.text(T('app.tapToContinue'), 0, 0, 90, '#ffffff');
    ctx.restore();
    R.text(T('app.welcomeBack'), cx, 610, 34, '#ffd23f', 'center', false);
  },
};

window.addEventListener('load', () => Main.start());
