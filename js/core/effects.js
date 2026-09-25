// Cricket Arcade — code-drawn effects (pool pattern from Scrapcore ZERO).
// Sparks, dust, rings, floating text, screen flash, screen shake and slow-mo.
// All hard-capped (plan 36). Visual randomness uses RNG.fx, never gameplay streams.

const Effects = {
  MAX_PARTICLES: 160,
  MAX_TEXT: 20,
  pool: [],
  texts: [],
  _next: 0,

  shakeAmp: 0, shakeT: 0, shakeDur: 1,
  shakeX: 0, shakeY: 0,
  flashA: 0, flashColor: '#ffffff',

  // ---- slow motion / hit-stop (from Scrapcore ZERO) ----
  _slowT: 0,
  _slowScale: 1,

  init() {
    this.pool = [];
    for (let i = 0; i < this.MAX_PARTICLES; i++) this.pool.push({ active: false });
    this._next = 0;
    this.texts = [];
    this.shakeAmp = 0; this.shakeT = 0;
    this.flashA = 0;
    this._slowT = 0; this._slowScale = 1;
  },

  // (Settings, plan 34: Reduced motion turns slow-motion and shake off; Reduce flash
  // softens flashes; VFX Low/Normal/High scales the particle count.)
  slowMo(dur, scale) {
    if ((typeof GameSettings !== 'undefined' ? GameSettings.get('reducedMotion') : null)) return;
    if (dur >= this._slowT) { this._slowT = dur; this._slowScale = scale; }
  },

  // Called with REAL delta time; returns the multiplier for game time.
  timeScale(realDt) {
    if (this._slowT > 0) {
      this._slowT = Math.max(0, this._slowT - realDt);
      // ease back to full speed over the last third
      return this._slowScale;
    }
    return 1;
  },

  shake(amp, dur) {
    if ((typeof GameSettings !== 'undefined' ? GameSettings.get('shake') : null) === false || (typeof GameSettings !== 'undefined' ? GameSettings.get('reducedMotion') : null)) return;
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeT = Math.max(this.shakeT, dur);
    this.shakeDur = Math.max(dur, 0.01);
  },

  flash(alpha, color) {
    if ((typeof GameSettings !== 'undefined' ? GameSettings.get('reduceFlash') : null)) alpha *= 0.2;
    this.flashA = Math.max(this.flashA, alpha);
    this.flashColor = color || '#ffffff';
  },

  _spawn(props) {
    const p = this.pool[this._next];
    this._next = (this._next + 1) % this.MAX_PARTICLES;
    Object.assign(p, { active: true, t: 0 }, props);
    return p;
  },

  sparks(x, y, count, color, speed) {
    const f = RNG.fx;
    if (typeof GameSettings !== 'undefined') count = Math.max(1, Math.round(count * GameSettings.factor('vfx')));
    for (let i = 0; i < count; i++) {
      const a = f.range(0, Math.PI * 2);
      const s = (speed || 600) * f.range(0.35, 1.1);
      this._spawn({
        kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: f.range(0.2, 0.45), size: f.range(4, 9), color: color || '#ffd23f', g: 900,
      });
    }
  },

  dust(x, y, count, scale) {
    const f = RNG.fx;
    const k = scale || 1;
    for (let i = 0; i < count; i++) {
      this._spawn({
        kind: 'dust', x: x + f.range(-10, 10) * k, y: y + f.range(-3, 3) * k,
        vx: f.range(-70, 70) * k, vy: f.range(-60, -15) * k,
        life: f.range(0.35, 0.7), size: f.range(6, 14) * k, color: 'rgba(214,184,128,0.8)', g: 0,
      });
    }
  },

  ring(x, y, maxR, color, life, width) {
    this._spawn({ kind: 'ring', x, y, maxR, color: color || '#ffffff', life: life || 0.4, width: width || 10 });
  },

  // Floating text (screen space). size in logical px.
  text(str, x, y, color, size, opts) {
    if (this.texts.length >= this.MAX_TEXT) this.texts.shift();
    const o = opts || {};
    this.texts.push({ str, x, y, color: color || '#fff', size: size || 64, t: 0,
      life: o.life || 1.1, rise: o.rise !== undefined ? o.rise : 60, pop: o.pop !== false });
  },

  // Real-time update (shake/flash should not slow down in slow-mo too much).
  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.t += dt;
      if (p.t >= p.life) { p.active = false; continue; }
      if (p.kind === 'spark' || p.kind === 'dust') {
        p.vy += (p.g || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= (1 - 2.5 * dt);
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const tx = this.texts[i];
      tx.t += dt;
      if (tx.t >= tx.life) this.texts.splice(i, 1);
    }
  },

  updateReal(realDt) {
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - realDt);
      const k = this.shakeT / this.shakeDur;
      const a = this.shakeAmp * k;
      this.shakeX = RNG.fx.range(-1, 1) * a;
      this.shakeY = RNG.fx.range(-1, 1) * a;
      if (this.shakeT === 0) { this.shakeAmp = 0; this.shakeX = 0; this.shakeY = 0; }
    }
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - realDt * 3.2);
  },

  drawParticles(ctx) {
    for (const p of this.pool) {
      if (!p.active) continue;
      const k = 1 - p.t / p.life;
      if (p.kind === 'spark') {
        ctx.globalAlpha = k;
        R.circle(p.x, p.y, p.size * k, p.color);
      } else if (p.kind === 'dust') {
        ctx.globalAlpha = k * 0.8;
        R.circle(p.x, p.y, p.size * (1.6 - k * 0.6), p.color);
      } else if (p.kind === 'ring') {
        ctx.globalAlpha = k;
        R.circle(p.x, p.y, p.maxR * (1 - k * k), null, p.color, p.width * k + 2);
      }
    }
    ctx.globalAlpha = 1;
  },

  drawTexts(ctx) {
    for (const tx of this.texts) {
      const pop = tx.pop ? Math.min(1, tx.t / 0.12) : 1;
      const scale = 0.6 + pop * 0.4 + (tx.pop ? Math.max(0, 0.16 - tx.t) * 1.5 : 0);
      const fade = tx.t > tx.life * 0.7 ? 1 - (tx.t - tx.life * 0.7) / (tx.life * 0.3) : 1;
      ctx.save();
      ctx.translate(tx.x, tx.y - tx.rise * (tx.t / tx.life));
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.max(0, fade);
      R.text(tx.str, 0, 0, tx.size, tx.color);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  drawFlash(ctx) {
    if (this.flashA <= 0) return;
    const v = Display.viewRect();
    ctx.globalAlpha = Math.min(0.85, this.flashA);
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.globalAlpha = 1;
  },
};
