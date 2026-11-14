// Cricket Legends - hands-on training (M19, M20; plan 5.8, 10). Each drill is its own short game (20-40 s),
// scored Bronze / Silver / Gold. A better medal pays more (Career.train: Silver = +1 extra stat, Gold = + a form
// bump and technique practice). The first sessions of a drill must be played; after that SKIP gives the quick
// result. Opens over Career Home (Scenes.openOverlay); calls back with { hits (medal 0-3), of: 3, medal, score }
// or null for SKIP. Numbers: CAREER_DATA.handsOn. Randomness: the seeded 'drill' stream.
//   timing_cage        TIMING NETS     tap as the ball reaches you: early pulls it, late cuts it; hit the lit zone
//   power_hitting      POWER           stop the swing meter at the top; the throw-down flies that far
//   target_batting     SHOT SELECTION  a line-and-length card flashes: tap the right shot before it's gone
//   pace_gate          PACE            hold to run in faster, let go in the green (too long = no-ball)
//   yorker_board       ACCURACY        the marker sweeps the pitch: drop the ball on a cone
//   movement_control   SPIN            drag to set the turn, let go: the ball must bend through the gate
//   fielding_reaction  FIELDING        catch the high ones as they land, then throw at one stump
//   fitness_session    FITNESS & MIND  tap the green signals, ignore the red ones and the fakes

const TrainingDrill = {
  drill: null, onDone: null, t: 0, g: null, done: null, buttons: new ButtonList(),

  handsOn(c, drillId) { const H = CAREER_DATA.handsOn; return !!(H && H.games[drillId]); },
  canSkip(c, drillId) { return ((c && c.drillCount && c.drillCount[drillId]) || 0) >= CAREER_DATA.handsOn.sessions; },
  start(drillId, onDone, career) {
    this.drill = drillId; this.onDone = onDone; this.career = career || null;
    Tips.show('training');
    Scenes.openOverlay(this);
  },
  _cfg() { return CAREER_DATA.handsOn.games[this.drill]; },
  _rng() { return RNG.stream('drill'); },

  enter() {
    this.t = 0; this.done = null; this.down = null;
    const b = this.buttons, s = Display.safe;
    b.clear();
    if (this.canSkip(this.career, this.drill)) b.add('drill.skip', s.right - 300, s.top + 20, 270, 96, () => this._finish(true), { size: 30, color: '#e9eef5' }).tag = 'skip';
    this.g = Object.assign({ score: 0, n: 0 }, DrillGames[this.drill].init(this._cfg(), this._rng()));
  },
  _medal() {
    const M = this._cfg().medals, s = this.g.score;
    return s >= M[2] ? 3 : s >= M[1] ? 2 : s >= M[0] ? 1 : 0;
  },
  _end() { if (!this.done) { this.done = { t: 0, medal: this._medal() }; Sound.play(this.done.medal >= 2 ? 'fanfare' : 'uiTap'); } },
  _finish(skip) {
    Scenes.closeOverlay();
    const cb = this.onDone; this.onDone = null;
    const m = this.done ? this.done.medal : this._medal();
    if (cb) cb(skip ? null : { hits: m, of: 3, medal: ['none', 'bronze', 'silver', 'gold'][m], score: this.g.score });
  },

  update(dt) {
    this.t += dt;
    if (this.done) { this.done.t += dt; if (this.done.t > CAREER_DATA.handsOn.resultHold) this._finish(false); return; }
    const C = this._cfg(), G = DrillGames[this.drill];
    G.update(this.g, dt, C, this._rng());
    if (this.t >= C.time || this.g.over) this._end();
  },
  pointerDown(id, x, y) {
    if (this.buttons.down(id, x, y)) return;
    if (this.done) return;
    this.down = { id, x, y, x0: x, y0: y };
    const G = DrillGames[this.drill];
    if (G.down) G.down(this.g, x, y, this._cfg(), this._rng());
  },
  pointerMove(id, x, y) {
    this.buttons.move(id, x, y);
    if (this.down && this.down.id === id) { this.down.x = x; this.down.y = y; const G = DrillGames[this.drill]; if (G.move) G.move(this.g, x, y, this.down, this._cfg()); }
  },
  pointerUp(id) {
    if (this.buttons.up(id)) return;
    const d = this.down; this.down = null;
    if (!d || this.done) return;
    const G = DrillGames[this.drill];
    if (G.up) G.up(this.g, d, this._cfg(), this._rng());
  },
  keyDown(code) {
    if (code === 'Escape' && this.canSkip(this.career, this.drill)) { this._finish(true); return; }
    if ((code === 'Space' || code === 'Enter') && !this.done) {
      const G = DrillGames[this.drill], cx = CONFIG.LOGICAL_W / 2;
      if (G.down) G.down(this.g, cx, 600, this._cfg(), this._rng());
      if (G.up) G.up(this.g, { x: cx, y: 600, x0: cx, y0: 600 }, this._cfg(), this._rng());
    }
  },

  render(ctx) {
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2, C = this._cfg(), D = CAREER_DATA.training.find((d) => d.id === this.drill);
    // a solid practice-ground backdrop (the screen behind doesn't show through)
    const gr = ctx.createLinearGradient(0, v.y, 0, v.y + v.h); gr.addColorStop(0, '#0b1a2c'); gr.addColorStop(1, '#0f2a1c');
    ctx.fillStyle = gr; ctx.fillRect(v.x, v.y, v.w, v.h);
    Sprites.ui(D.icon, v.x + 150 > Display.safe.left + 90 ? Display.safe.left + 110 : v.x + 150, 110, 140, 140);
    R.text(T('drill.game.' + this.drill), cx, 70, 44, '#ffffff');
    R.text(T('drill.how2.' + this.drill), cx, 120, 24, '#d8e4f0', 'center', false, 1500);
    DrillGames[this.drill].draw(ctx, this.g, C, this);
    // time and score
    const left = Math.max(0, C.time - this.t), M = C.medals;
    R.text(T('drill.score', { n: this.g.score }), Display.safe.left + 40, Display.safe.bottom - 60, 34, '#ffd23f', 'left');
    R.text(T('drill.time', { n: Math.ceil(left) }), Display.safe.right - 40, Display.safe.bottom - 60, 34, '#ffffff', 'right');
    R.text(T('drill.medals', { b: M[0], s: M[1], g: M[2] }), cx, Display.safe.bottom - 40, 22, '#b8c6d6', 'center', false);
    if (this.done) {
      const m = this.done.medal, col = ['#8a96a3', '#e39a5a', '#d8e4f0', '#ffd23f'][m];
      ctx.save(); ctx.globalAlpha = Math.min(1, this.done.t * 4);
      R.roundRect(cx - 420, 430, 840, 220, 40, 'rgba(10,22,40,0.97)', col, 6);
      R.text(T('drill.medal.' + m), cx, 510, 64, col);
      R.text(T('drill.final', { n: this.g.score }), cx, 590, 30, '#ffffff', 'center', false);
      ctx.restore();
    }
    this.buttons.draw();
  },
};

// ---- the eight games. Each: init(cfg, rng) -> state; update(g, dt, cfg, rng); down / move / up; draw(ctx, g, cfg).
// The play area is the middle of the screen (y 180-900), clear of the top text and the bottom score line.
const DrillGames = {
  // TIMING NETS: a ball comes down the lane; tap when it's in the ring. Early = to the left zone, on time = the
  // middle, late = the right. A zone lights up for each ball: hit that one.
  timing_cage: {
    init(C, rng) { return { ball: null, wait: 0.6, lit: rng.int ? rng.int(0, 2) : Math.floor(rng.next() * 3), shots: [] }; },
    update(g, dt, C, rng) {
      if (g.n >= C.balls) { if (!g.ball) g.over = true; return; }
      if (!g.ball) { g.wait -= dt; if (g.wait <= 0) { g.ball = { t: 0, dur: C.ballTime[0] + rng.next() * (C.ballTime[1] - C.ballTime[0]) }; g.lit = Math.floor(rng.next() * 3); } return; }
      g.ball.t += dt;
      if (g.ball.t > g.ball.dur + C.window) { g.shots.push({ zone: -1 }); g.ball = null; g.n++; g.wait = 0.5; }
    },
    down(g, x, y, C) {
      if (!g.ball) return;
      const e = (g.ball.t - g.ball.dur) / C.window;              // -1 early .. +1 late
      if (Math.abs(e) > 1.6) return;
      const zone = e < -1 / 3 ? 0 : e > 1 / 3 ? 2 : 1;
      if (zone === g.lit) { g.score++; Sound.play('four'); } else Sound.play('uiTap');
      g.shots.push({ zone }); g.ball = null; g.n++; g.wait = 0.45;
    },
    draw(ctx, g, C) {
      const cx = CONFIG.LOGICAL_W / 2;
      ['L', 'C', 'R'].forEach((k, i) => { const x = cx - 480 + i * 480; R.roundRect(x - 200, 200, 400, 140, 26, i === g.lit ? 'rgba(156,255,106,0.4)' : 'rgba(255,255,255,0.08)', i === g.lit ? '#9cff6a' : 'rgba(255,255,255,0.3)', 4); R.text(T('drill.zone.' + k), x, 270, 30, '#ffffff'); });
      R.line(cx, 380, cx, 860, 'rgba(255,255,255,0.2)', 60);
      R.circle(cx, 780, 70, null, '#ffd23f', 6);
      if (g.ball) { const k = Math.min(1.3, g.ball.t / g.ball.dur), y = 400 + 380 * k; R.circle(cx, y, 16 + 20 * k, '#c8202f', '#ffffff', 3); }
      R.text(T('drill.tapRing'), cx, 900, 24, '#b8c6d6', 'center', false);
    },
  },
  // POWER: a swing meter goes up and down; tap at the top. The throw-down flies further the closer you are.
  power_hitting: {
    init() { return { m: 0, dir: 1, fly: null, best: 0, total: 0 }; },
    update(g, dt, C) {
      if (g.fly) { g.fly.t += dt; if (g.fly.t > 1.1) { g.fly = null; if (g.n >= C.balls) g.over = true; } return; }
      g.m += g.dir * dt * C.speed; if (g.m > 1) { g.m = 1; g.dir = -1; } if (g.m < 0) { g.m = 0; g.dir = 1; }
    },
    down(g, x, y, C) {
      if (g.fly || g.n >= C.balls) return;
      const q = 1 - Math.abs(1 - g.m) / C.sweet, d = Math.max(20, Math.round(C.maxDist * Math.max(0, Math.min(1, q))));
      g.fly = { t: 0, d }; g.n++;
      if (d >= C.rope) { g.score++; Sound.play('six'); } else Sound.play('four');
      g.best = Math.max(g.best, d);
    },
    draw(ctx, g, C) {
      const cx = CONFIG.LOGICAL_W / 2, x = cx - 600, top = 220, h = 600;
      R.roundRect(x - 40, top, 80, h, 30, 'rgba(255,255,255,0.1)', '#ffffff', 3);
      R.roundRect(x - 40, top, 80, h * C.sweet, 30, 'rgba(156,255,106,0.35)', null, 0);
      R.circle(x, top + h * (1 - g.m), 34, '#ffd23f', '#ffffff', 4);
      // the field: how far it went (the rope marked)
      const fx = cx - 300, fw = 900, rp = fx + fw * C.rope / C.maxDist;
      R.line(fx, 640, fx + fw, 640, 'rgba(120,200,120,0.6)', 120);
      R.line(rp, 560, rp, 720, '#ffffff', 6); R.text(T('drill.rope'), rp, 540, 22, '#ffffff');
      if (g.fly) { const k = Math.min(1, g.fly.t / 0.9), bx = fx + fw * (g.fly.d / C.maxDist) * k, by = 640 - Math.sin(Math.PI * k) * 300; R.circle(bx, by, 16, '#c8202f', '#ffffff', 3); if (k >= 1) R.text(g.fly.d + ' m', bx, 760, 34, g.fly.d >= C.rope ? '#ffd23f' : '#ffffff'); }
      R.text(T('drill.best', { n: g.best }), cx + 300, 860, 26, '#9be7ff');
    },
  },
  // SHOT SELECTION: a card (length + line) flashes; tap the shot that fits before it's gone.
  target_batting: {
    init(C, rng) { return { card: null, wait: 0.4, flash: null }; },
    update(g, dt, C, rng) {
      if (g.flash) { g.flash.t += dt; if (g.flash.t > 0.35) g.flash = null; }
      if (g.n >= C.cards) { if (!g.card) g.over = true; return; }
      if (!g.card) { g.wait -= dt; if (g.wait <= 0) { const k = C.deck[Math.floor(rng.next() * C.deck.length)]; g.card = { k, t: 0 }; } return; }
      g.card.t += dt;
      if (g.card.t > C.cardTime) { g.flash = { ok: false, t: 0 }; g.card = null; g.n++; g.wait = 0.35; }
    },
    _btns() { const cx = CONFIG.LOGICAL_W / 2; return ['drive', 'cut', 'pull', 'defend'].map((id, i) => ({ id, x: cx - 820 + i * 420, y: 700, w: 380, h: 150 })); },
    down(g, x, y, C) {
      if (!g.card) return;
      const b = this._btns().find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
      if (!b) return;
      const ok = C.answer[g.card.k] === b.id;
      if (ok) { g.score++; Sound.play('four'); } else Sound.play('uiTap');
      g.flash = { ok, t: 0 }; g.card = null; g.n++; g.wait = 0.35;
    },
    draw(ctx, g, C) {
      const cx = CONFIG.LOGICAL_W / 2;
      if (g.card) {
        const k = 1 - g.card.t / C.cardTime;
        R.roundRect(cx - 360, 230, 720, 300, 30, 'rgba(255,255,255,0.95)', '#ffd23f', 6);
        R.text(T('drill.card.' + g.card.k), cx, 360, 54, CONFIG.COLOR.ink);
        R.rect(cx - 340, 500, 680 * Math.max(0, k), 14, '#46a8ff');
      }
      if (g.flash) R.text(T(g.flash.ok ? 'drill.right' : 'drill.wrong'), cx, 610, 46, g.flash.ok ? '#9cff6a' : '#ff7a7a');
      for (const b of this._btns()) { R.roundRect(b.x, b.y, b.w, b.h, 28, '#e9eef5', CONFIG.COLOR.ink, 5); R.text(T('drill.shot.' + b.id), b.x + b.w / 2, b.y + b.h / 2, 38, CONFIG.COLOR.ink); }
    },
  },
  // PACE: hold to run in (the speed climbs), let go in the green; past the red it's a no-ball.
  pace_gate: {
    init() { return { hold: null, last: null }; },
    update(g, dt, C) {
      if (g.hold) { g.hold.v = Math.min(1.08, g.hold.v + dt / C.fillTime); }
      if (g.n >= C.balls && !g.hold) g.over = true;
    },
    down(g) { if (!g.hold) g.hold = { v: 0 }; },
    up(g, d, C) {
      if (!g.hold) return;
      const v = g.hold.v; g.hold = null; g.n++;
      const nb = v > 1, good = !nb && v >= C.green[0];
      const kmh = Math.round(C.kmh[0] + (C.kmh[1] - C.kmh[0]) * Math.min(1, v));
      g.last = { kmh, nb, good };
      if (good) { g.score++; Sound.play('four'); } else Sound.play(nb ? 'ui_error' : 'uiTap');
    },
    draw(ctx, g, C) {
      const cx = CONFIG.LOGICAL_W / 2, x0 = cx - 700, w = 1400, y = 470;
      R.roundRect(x0, y, w, 80, 40, 'rgba(255,255,255,0.1)', '#ffffff', 3);
      R.roundRect(x0 + w * C.green[0] / 1.08, y, w * (1 - C.green[0]) / 1.08, 80, 30, 'rgba(156,255,106,0.4)', null, 0);
      R.roundRect(x0 + w / 1.08, y, w * 0.08 / 1.08, 80, 20, 'rgba(255,90,90,0.6)', null, 0);
      if (g.hold) R.roundRect(x0, y + 10, w * g.hold.v / 1.08, 60, 30, '#ffd23f', null, 0);
      if (g.last) R.text(g.last.nb ? T('drill.noBall') : T('drill.kmh', { n: g.last.kmh }), cx, 660, 54, g.last.nb ? '#ff7a7a' : g.last.good ? '#9cff6a' : '#ffffff');
      R.text(T('drill.holdRelease'), cx, 800, 28, '#b8c6d6', 'center', false);
    },
  },
  // ACCURACY: a marker sweeps across the pitch; tap to land the ball. Hit the cone (it moves each ball).
  yorker_board: {
    init(C, rng) { return { cone: 0.5, m: 0, dir: 1, shot: null, conez: 0.5 }; },
    update(g, dt, C, rng) {
      if (g.shot) { g.shot.t += dt; if (g.shot.t > 0.7) { g.shot = null; g.cone = 0.15 + rng.next() * 0.7; if (g.n >= C.balls) g.over = true; } return; }
      g.m += g.dir * dt * C.speed; if (g.m > 1) { g.m = 1; g.dir = -1; } if (g.m < 0) { g.m = 0; g.dir = 1; }
    },
    down(g, x, y, C) {
      if (g.shot || g.n >= C.balls) return;
      const hit = Math.abs(g.m - g.cone) <= C.zone; g.n++;
      g.shot = { t: 0, x: g.m, hit };
      if (hit) { g.score++; Sound.play('stumps'); } else Sound.play('uiTap');
    },
    draw(ctx, g, C) {
      const cx = CONFIG.LOGICAL_W / 2, x0 = cx - 600, w = 1200;
      // the pitch from above, the cone and the sweeping marker
      R.roundRect(x0, 300, w, 360, 20, '#c9b48a', '#8c7650', 4);
      const kx = x0 + w * g.cone;
      R.roundRect(kx - w * C.zone, 330, w * C.zone * 2, 300, 16, 'rgba(255,120,40,0.25)', null, 0);
      ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(kx, 420); ctx.lineTo(kx - 34, 520); ctx.lineTo(kx + 34, 520); ctx.closePath(); ctx.fill();
      if (g.shot) { R.circle(x0 + w * g.shot.x, 480, 20, '#c8202f', '#ffffff', 3); R.text(T(g.shot.hit ? 'drill.hitCone' : 'drill.missCone'), cx, 720, 44, g.shot.hit ? '#9cff6a' : '#ff7a7a'); }
      else R.line(x0 + w * g.m, 300, x0 + w * g.m, 660, '#ffd23f', 8);
    },
  },
  // SPIN: drag sideways to set the turn (the dotted line shows the bend), let go: through the gate scores.
  movement_control: {
    init(C, rng) { return { gate: 0.3, turn: 0, aiming: false, shot: null }; },
    update(g, dt, C, rng) {
      if (g.shot) { g.shot.t += dt; if (g.shot.t > 0.9) { g.shot = null; g.gate = (rng.next() * 2 - 1) * 0.8; if (g.n >= C.balls) g.over = true; } }
    },
    down(g) { if (!g.shot) { g.aiming = true; g.turn = 0; } },
    move(g, x, y, d, C) { if (g.aiming) g.turn = Math.max(-1, Math.min(1, (x - d.x0) / C.dragPx)); },
    up(g, d, C) {
      if (!g.aiming) return;
      g.aiming = false; g.n++;
      const hit = Math.abs(g.turn - g.gate) <= C.zone;
      g.shot = { t: 0, turn: g.turn, hit };
      if (hit) { g.score++; Sound.play('stumps'); } else Sound.play('uiTap');
    },
    _path(turn, k) { const cx = CONFIG.LOGICAL_W / 2; return { x: cx + turn * 500 * k * k, y: 820 - 560 * k }; },
    draw(ctx, g, C) {
      const cx = CONFIG.LOGICAL_W / 2, gx = cx + g.gate * 500;
      R.roundRect(gx - 500 * C.zone, 230, 1000 * C.zone, 70, 20, 'rgba(156,255,106,0.35)', '#9cff6a', 4);
      R.text(T('drill.gate'), gx, 265, 24, '#ffffff');
      const turn = g.shot ? g.shot.turn : g.turn;
      for (let i = 0; i <= 20; i++) { const p = this._path(turn, i / 20); R.circle(p.x, p.y, 5, 'rgba(255,255,255,0.5)'); }
      if (g.shot) { const p = this._path(g.shot.turn, Math.min(1, g.shot.t / 0.6)); R.circle(p.x, p.y, 18, '#c8202f', '#ffffff', 3); if (g.shot.t > 0.6) R.text(T(g.shot.hit ? 'drill.through' : 'drill.missGate'), cx, 560, 44, g.shot.hit ? '#9cff6a' : '#ff7a7a'); }
      R.circle(cx, 820, 22, '#c8202f', '#ffffff', 3);
      R.text(T('drill.dragTurn'), cx, 880, 26, '#b8c6d6', 'center', false);
    },
  },
  // FIELDING: a high catch (the shadow shrinks: tap when it's smallest), then a throw (tap when the
  // marker crosses the stump). Turns alternate.
  fielding_reaction: {
    init() { return { kind: 'catch', t: 0, res: null }; },
    update(g, dt, C) {
      if (g.res) { g.res.t += dt; if (g.res.t > 0.6) { g.res = null; g.kind = g.kind === 'catch' ? 'throw' : 'catch'; g.t = 0; if (g.n >= C.turns) g.over = true; } return; }
      g.t += dt;
      const lim = g.kind === 'catch' ? C.catchTime + C.window : 1e9;
      if (g.t > lim) { g.res = { ok: false, t: 0 }; g.n++; }
    },
    down(g, x, y, C) {
      if (g.res || g.n >= C.turns) return;
      let ok;
      if (g.kind === 'catch') ok = Math.abs(g.t - C.catchTime) <= C.window;
      else { const p = 0.5 + 0.5 * Math.sin(g.t * C.throwSpeed); ok = Math.abs(p - 0.5) <= C.stump; }
      g.res = { ok, t: 0 }; g.n++;
      if (ok) { g.score++; Sound.play(g.kind === 'catch' ? 'catchIt' : 'stumps'); } else Sound.play('uiTap');
    },
    draw(ctx, g, C) {
      const cx = CONFIG.LOGICAL_W / 2;
      if (g.kind === 'catch') {
        const k = Math.min(1, g.t / C.catchTime);
        R.circle(cx, 560, 40 + 220 * (1 - k), 'rgba(0,0,0,0.35)');
        R.circle(cx, 560 - 300 * (1 - k), 20, '#c8202f', '#ffffff', 3);
        R.circle(cx, 560, 46, null, '#ffd23f', 5);
        R.text(T('drill.catchIt'), cx, 860, 28, '#b8c6d6', 'center', false);
      } else {
        const p = 0.5 + 0.5 * Math.sin(g.t * C.throwSpeed), x0 = cx - 600;
        R.line(x0, 560, x0 + 1200, 560, 'rgba(255,255,255,0.2)', 40);
        R.rect(cx - 8, 470, 16, 180, '#f0e2b8');
        R.circle(x0 + 1200 * p, 560, 26, '#ffd23f', '#ffffff', 4);
        R.text(T('drill.throwIt'), cx, 860, 28, '#b8c6d6', 'center', false);
      }
      if (g.res) R.text(T(g.res.ok ? (g.kind === 'catch' ? 'drill.caught' : 'drill.direct') : 'drill.missed'), cx, 360, 50, g.res.ok ? '#9cff6a' : '#ff7a7a');
    },
  },
  // FITNESS & MIND: signals pop up around the screen. Green: tap it. Red, and the yellow fakes: leave them.
  fitness_session: {
    init() { return { sig: [], spawn: 0.4, miss: 0 }; },
    update(g, dt, C, rng) {
      g.spawn -= dt;
      if (g.spawn <= 0) {
        g.spawn = C.every[0] + rng.next() * (C.every[1] - C.every[0]);
        const r = rng.next(), kind = r < C.greenShare ? 'go' : r < C.greenShare + (1 - C.greenShare) / 2 ? 'stop' : 'fake';
        g.sig.push({ kind, x: 0.15 + rng.next() * 0.7, y: 0.25 + rng.next() * 0.55, t: 0 });
      }
      for (const s of g.sig) s.t += dt;
      for (const s of g.sig.filter((q) => q.t > C.life)) { if (s.kind === 'go') g.miss++; }
      g.sig = g.sig.filter((q) => q.t <= C.life);
    },
    down(g, x, y, C) {
      const cx = CONFIG.LOGICAL_W / 2;
      const hit = g.sig.find((s) => Math.hypot(x - (cx - 800 + 1600 * s.x), y - (1080 * s.y)) < C.radius);
      if (!hit) return;
      g.sig = g.sig.filter((s) => s !== hit);
      if (hit.kind === 'go') { g.score++; Sound.play('ui_press'); } else { g.score = Math.max(0, g.score - 1); Sound.play('ui_error'); }
    },
    draw(ctx, g, C) {
      const cx = CONFIG.LOGICAL_W / 2;
      for (const s of g.sig) {
        const x = cx - 800 + 1600 * s.x, y = 1080 * s.y, k = 1 - s.t / C.life;
        const col = s.kind === 'go' ? '#3fd46b' : s.kind === 'stop' ? '#ff4b4b' : '#ffd23f';
        R.circle(x, y, C.radius * (0.7 + 0.3 * k), col, '#ffffff', 5);
        R.text(s.kind === 'go' ? '✓' : s.kind === 'stop' ? '✕' : '?', x, y, 60, '#ffffff');
      }
      R.text(T('drill.signals'), cx, 900, 26, '#b8c6d6', 'center', false);
    },
  },
};
