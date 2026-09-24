// Cricket Arcade — Audio (engine copied from Scrapcore ZERO, new sound list).
// Every sound is synthesised at runtime with WebAudio — no files, nothing to
// download. These are placeholder sounds; real recorded SFX can replace a
// recipe later under the same id.
//
// Everything is guarded: if WebAudio is unavailable, blocked, or the context
// cannot start, the game runs silently rather than failing.

const Sound = {
  ctx: null,
  master: null,
  sfxGain: null,
  ready: false,
  blocked: false,
  muted: false,
  _lastPlay: {},
  _voices: 0,
  MAX_VOICES: 16,          // plan 36: max 16 simultaneous SFX
  _noiseSeed: 12345,

  init() {
    if (this.ready || this.blocked) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.blocked = true; return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      // Phone speakers exaggerate everything above ~5kHz; a gentle low-pass,
      // a high-shelf cut and a compressor keep synth SFX from sounding harsh.
      this.tone = this.ctx.createBiquadFilter();
      this.tone.type = 'lowpass';
      this.tone.frequency.value = 5600;
      this.tone.Q.value = 0.4;

      this.shelf = this.ctx.createBiquadFilter();
      this.shelf.type = 'highshelf';
      this.shelf.frequency.value = 3200;
      this.shelf.gain.value = -5;

      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -20;
      this.comp.knee.value = 24;
      this.comp.ratio.value = 6;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.2;

      this.sfxGain.connect(this.tone);
      this.tone.connect(this.shelf);
      this.shelf.connect(this.comp);
      this.comp.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.ready = true;
      this.applyVolume();
    } catch (e) {
      this.blocked = true;
    }
  },

  // Mobile browsers refuse to start audio until a real user gesture, so this
  // is called from the first touch.
  unlock() {
    this.init();
    if (!this.ready) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },

  suspend() { if (this.ready) this.ctx.suspend().catch(() => {}); },
  resume() { if (this.ready) this.ctx.resume().catch(() => {}); },

  setMuted(m) {
    this.muted = !!m;
    this.applyVolume();
  },

  applyVolume() {
    if (!this.ready) return;
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.sfxGain.gain.value = 0.5;
  },

  _now() { return this.ctx.currentTime; },

  // Audio-only noise generator (not gameplay, so it keeps its own tiny LCG).
  _rand() {
    this._noiseSeed = (Math.imul(this._noiseSeed, 1664525) + 1013904223) >>> 0;
    return this._noiseSeed / 4294967296;
  },

  _env(node, t, attack, hold, release, peak) {
    const g = this.ctx.createGain();
    attack = Math.max(attack, 0.004);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), t + attack);
    g.gain.setValueAtTime(Math.max(0.0001, peak), t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    node.connect(g);
    g.connect(this.sfxGain);
    this._voices++;
    setTimeout(() => { this._voices = Math.max(0, this._voices - 1); },
      (attack + hold + release) * 1000 + 60);
    return g;
  },

  _noise(dur) {
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = this._rand() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  },

  _shaped(t, dur, cutoff) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(180, cutoff * 0.55), t + dur);
    f.Q.value = 0.7;
    return f;
  },

  // ---- the sound list -----------------------------------------------------
  DEFS: {
    uiTap:      { kind: 'tone',  freq: 520, type: 'sine', a: 0.005, h: 0.01, r: 0.07, gain: 0.14, vary: 0.02, lp: 2400 },
    batHit:     { kind: 'thump', freq: 360, a: 0.002, h: 0.012, r: 0.10, gain: 0.34, vary: 0.06, lp: 3400, noise: 1.0 },
    batPerfect: { kind: 'crack', freq: 300, a: 0.002, h: 0.02, r: 0.26, gain: 0.45, vary: 0.03, lp: 4200 },
    batDefend:  { kind: 'thump', freq: 240, a: 0.003, h: 0.008, r: 0.07, gain: 0.22, vary: 0.05, lp: 2000, noise: 0.5 },
    edge:       { kind: 'thump', freq: 900, a: 0.002, h: 0.004, r: 0.05, gain: 0.18, vary: 0.1, lp: 4200, noise: 1.2 },
    swish:      { kind: 'noise', freq: 1200, a: 0.03, h: 0.02, r: 0.10, gain: 0.10, vary: 0.1, lp: 3000 },
    bounce:     { kind: 'thump', freq: 120, a: 0.003, h: 0.01, r: 0.08, gain: 0.16, vary: 0.08, lp: 900, noise: 0.6 },
    stumps:     { kind: 'clatter', freq: 700, a: 0.002, h: 0.02, r: 0.3, gain: 0.34, vary: 0.05, lp: 4200 },
    catchIt:    { kind: 'thump', freq: 180, a: 0.003, h: 0.01, r: 0.1, gain: 0.25, vary: 0.04, lp: 1400, noise: 0.8 },
    release:    { kind: 'noise', freq: 700, a: 0.02, h: 0.01, r: 0.08, gain: 0.07, vary: 0.1, lp: 2000 },
    crowdCheer: { kind: 'crowd', freq: 900, a: 0.25, h: 0.6, r: 1.4, gain: 0.30, vary: 0.05, lp: 2600 },
    crowdRoar:  { kind: 'crowd', freq: 800, a: 0.12, h: 1.1, r: 1.8, gain: 0.42, vary: 0.05, lp: 3000 },
    crowdGroan: { kind: 'crowd', freq: 420, a: 0.15, h: 0.3, r: 0.8, gain: 0.22, vary: 0.05, lp: 1200, sweepDown: true },
    six:        { kind: 'arp',   freq: 523, a: 0.01, h: 0.07, r: 0.3, gain: 0.22, vary: 0, lp: 3200 },
    four:       { kind: 'arp2',  freq: 440, a: 0.01, h: 0.06, r: 0.22, gain: 0.18, vary: 0, lp: 3000 },
    combo:      { kind: 'sweep', from: 300, to: 900, a: 0.01, h: 0.05, r: 0.2, gain: 0.14, vary: 0, lp: 2800, type: 'triangle' },
    wicket:     { kind: 'sweep', from: 360, to: 90, a: 0.01, h: 0.08, r: 0.45, gain: 0.26, vary: 0, lp: 1400, type: 'triangle' },
    fanfare:    { kind: 'arp',   freq: 392, a: 0.02, h: 0.12, r: 0.45, gain: 0.26, vary: 0, lp: 3000 },
  },

  THROTTLE: { bounce: 0.06, uiTap: 0.04 },

  play(id, opts) {
    if (!this.ready || this.blocked || this.muted) return false;
    if (this.ctx.state === 'suspended') return false;
    const def = this.DEFS[id];
    if (!def) return false;
    if (this._voices > this.MAX_VOICES) return false;

    const t = this._now();
    const gap = this.THROTTLE[id];
    if (gap) {
      if (this._lastPlay[id] && t - this._lastPlay[id] < gap) return false;
      this._lastPlay[id] = t;
    }

    const o = opts || {};
    const vary = def.vary || 0;
    const pitch = (1 + (this._rand() * 2 - 1) * vary) * (o.pitch || 1);
    const gain = (def.gain || 0.2) * (o.gain !== undefined ? o.gain : 1);

    try {
      this._render(def, t, pitch, gain);
    } catch (e) { /* never let audio break the frame */ }
    return true;
  },

  _render(def, t, pitch, gain) {
    const ctx = this.ctx;
    const dur = (def.a || 0) + (def.h || 0) + (def.r || 0);
    const lp = def.lp || 4000;

    if (def.kind === 'thump') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(def.freq * pitch * 1.6, t);
      osc.frequency.exponentialRampToValueAtTime(def.freq * pitch * 0.7, t + dur);
      const bf = this._shaped(t, dur, lp);
      osc.connect(bf);
      this._env(bf, t, def.a, def.h, def.r, gain);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      if (def.noise) {
        const n = this._noise(dur);
        const nf = this._shaped(t, dur, lp * 1.4);
        n.connect(nf);
        this._env(nf, t, def.a, def.h * 0.6, def.r * 0.7, gain * def.noise * 0.55);
        n.start(t);
      }
    } else if (def.kind === 'crack') {
      // Perfect contact: a sharp wooden crack plus a low body thump.
      const n = this._noise(0.06);
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 2400 * pitch;
      hp.Q.value = 0.8;
      n.connect(hp);
      this._env(hp, t, 0.001, 0.01, 0.06, gain * 0.9);
      n.start(t);
      for (const [mul, g] of [[1, 1], [2.4, 0.45]]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(def.freq * pitch * mul, t);
        osc.frequency.exponentialRampToValueAtTime(def.freq * pitch * mul * 0.6, t + dur);
        const f = this._shaped(t, dur, lp);
        osc.connect(f);
        this._env(f, t, def.a, def.h, def.r, gain * g);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      }
    } else if (def.kind === 'tone') {
      const osc = ctx.createOscillator();
      osc.type = def.type || 'triangle';
      osc.frequency.setValueAtTime(def.freq * pitch, t);
      const tf = this._shaped(t, dur, lp);
      osc.connect(tf);
      this._env(tf, t, def.a, def.h, def.r, gain);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } else if (def.kind === 'noise') {
      const n = this._noise(dur);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(def.freq * pitch, t);
      f.Q.value = 0.9;
      n.connect(f);
      this._env(f, t, def.a, def.h, def.r, gain);
      n.start(t);
    } else if (def.kind === 'crowd') {
      // Crowd: wide band-passed noise with slow attack; two layers for body.
      for (const [mul, g] of [[1, 1], [0.55, 0.6]]) {
        const n = this._noise(dur);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(def.freq * pitch * mul, t);
        if (def.sweepDown) f.frequency.exponentialRampToValueAtTime(def.freq * mul * 0.5, t + dur);
        f.Q.value = 0.5;
        n.connect(f);
        this._env(f, t, def.a, def.h, def.r, gain * g);
        n.start(t);
      }
    } else if (def.kind === 'clatter') {
      // Stumps: a few quick woody knocks.
      [0, 0.035, 0.075].forEach((off, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(def.freq * pitch * (1 - i * 0.18), t + off);
        const f = this._shaped(t + off, 0.12, lp);
        osc.connect(f);
        this._env(f, t + off, 0.002, 0.01, 0.12, gain * (1 - i * 0.2));
        osc.start(t + off);
        osc.stop(t + off + 0.16);
      });
    } else if (def.kind === 'sweep') {
      const osc = ctx.createOscillator();
      osc.type = def.type || 'triangle';
      osc.frequency.setValueAtTime(def.from * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, def.to * pitch), t + dur);
      const f = this._shaped(t, dur, lp);
      osc.connect(f);
      this._env(f, t, def.a, def.h, def.r, gain);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } else if (def.kind === 'arp' || def.kind === 'arp2') {
      const steps = def.kind === 'arp' ? [0, 4, 7, 12] : [0, 7];
      steps.forEach((semi, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        const f = def.freq * Math.pow(2, semi / 12);
        const st = t + i * 0.075;
        osc.frequency.setValueAtTime(f, st);
        this._env(osc, st, def.a, def.h, def.r, gain * 0.5);
        osc.start(st);
        osc.stop(st + def.a + def.h + def.r + 0.02);
      });
    }
  },
};
