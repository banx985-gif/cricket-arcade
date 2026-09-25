// Cricket Arcade — Audio (engine from Scrapcore ZERO; M12 sound system, plan 31, 34).
// Every sound has a named id (data/sound.js). Each id is synthesised in code for now
// (WebAudio placeholders: no files, nothing to download). If a real recording exists
// at assets/audio/<id>.mp3 it is used instead, automatically, with no code change.
//
// Buses (each with a Settings slider): music · sfx (+ ui) · crowd, under master.
// Music: one track at a time, per screen (SOUND_DATA.sceneMusic); a quiet crowd bed
// plays under the match screens.
//
// Everything is guarded: if WebAudio is unavailable, blocked, or the context
// cannot start, the game runs silently rather than failing.

const Sound = {
  ctx: null,
  master: null,
  bus: {},             // music / sfx / ui / crowd gains
  ready: false,
  blocked: false,
  muted: false,
  _lastPlay: {},
  _voices: 0,
  MAX_VOICES: 16,          // plan 36: max 16 simultaneous SFX
  _noiseSeed: 12345,
  _files: {},              // id -> 'loading' | 'none' | AudioBuffer
  _music: null,            // { id, def, step, nextT, src?, gain }
  _musicWant: null,
  _crowdBed: null,
  _duck: 1,

  init() {
    if (this.ready || this.blocked) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.blocked = true; return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();

      // Phone speakers exaggerate everything above ~5kHz; a gentle low-pass,
      // a high-shelf cut and a compressor keep synth sounds from being harsh.
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

      for (const b of ['music', 'sfx', 'ui', 'crowd']) { this.bus[b] = this.ctx.createGain(); this.bus[b].connect(this.tone); }
      this.tone.connect(this.shelf);
      this.shelf.connect(this.comp);
      this.comp.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.ready = true;
      this.applyVolume();
      this._musicTimer = setInterval(() => this._tickMusic(), 60);
      if (this._musicWant) { const w = this._musicWant; this._musicWant = null; this.music(w); }
      if (this._crowdWant) this.crowdBed(true);
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

  // The Settings sliders (0–100) -> the bus volumes.
  vol(key) {
    const s = (typeof Save !== 'undefined' && Save.data && Save.data.settings) || {};
    const v = s[key] !== undefined ? s[key] : (typeof SETTINGS_DATA !== 'undefined' ? SETTINGS_DATA.defaults[key] : 80);
    return Math.max(0, Math.min(100, v)) / 100;
  },
  applyVolume() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const set = (g, v) => { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(v, t, 0.05); };
    set(this.master, this.muted ? 0 : 0.85 * this.vol('master'));
    set(this.bus.sfx, 0.5 * this.vol('sfx'));
    set(this.bus.ui, 0.5 * this.vol('sfx'));
    set(this.bus.crowd, 0.55 * this.vol('crowd'));
    set(this.bus.music, 0.55 * this.vol('music') * this._duck);
  },

  // ---- every id (for the tests and the sound list) ----
  ids() { return Object.keys(SOUND_DATA.sfx).concat(Object.keys(SOUND_DATA.music)); },
  resolve(id) { const a = SOUND_DATA.aliases[id]; return a || id; },
  known(id) { const r = this.resolve(id); return !!(SOUND_DATA.sfx[r] || SOUND_DATA.music[r]); },

  _now() { return this.ctx.currentTime; },

  // Audio-only noise generator (not gameplay, so it keeps its own tiny LCG).
  _rand() {
    this._noiseSeed = (Math.imul(this._noiseSeed, 1664525) + 1013904223) >>> 0;
    return this._noiseSeed / 4294967296;
  },

  // A real recording for this id, if one has been added (fetched once, in the background).
  _file(id) {
    const f = this._files[id];
    if (f && f !== 'loading' && f !== 'none') return f;
    if (f) return null;
    if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol) || typeof fetch === 'undefined') { this._files[id] = 'none'; return null; }
    this._files[id] = 'loading';
    fetch(SOUND_DATA.fileDir + id + SOUND_DATA.fileExt).then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) => (buf ? this.ctx.decodeAudioData(buf) : null))
      .then((ab) => { this._files[id] = ab || 'none'; if (ab && this._music && this._music.id === id) { const m = this._music; this._music = null; this.music(m.id); } })
      .catch(() => { this._files[id] = 'none'; });
    return null;
  },

  _env(node, t, attack, hold, release, peak, bus) {
    const g = this.ctx.createGain();
    attack = Math.max(attack, 0.004);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), t + attack);
    g.gain.setValueAtTime(Math.max(0.0001, peak), t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    node.connect(g);
    g.connect(this._out || this.bus.sfx);
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

  // Play a sound by id (or one of the older names). opts: { gain, pitch }
  play(id, opts) {
    if (!this.ready || this.blocked || this.muted) return false;
    if (this.ctx.state === 'suspended') return false;
    const rid = this.resolve(id), def = SOUND_DATA.sfx[rid];
    if (!def) return false;
    if (this._voices > this.MAX_VOICES) return false;

    const t = this._now();
    if (def.throttle) {
      if (this._lastPlay[rid] && t - this._lastPlay[rid] < def.throttle) return false;
      this._lastPlay[rid] = t;
    }
    const o = opts || {};
    const vary = def.vary || 0;
    const pitch = (1 + (this._rand() * 2 - 1) * vary) * (o.pitch || 1);
    const gain = (def.gain || 0.2) * (o.gain !== undefined ? o.gain : 1);
    try {
      this._out = this.bus[def.bus] || this.bus.sfx;
      const file = this._file(rid);
      if (file) {
        const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
        src.buffer = file; src.playbackRate.value = pitch; g.gain.value = o.gain !== undefined ? o.gain : 1;
        src.connect(g); g.connect(this._out); src.start(t);
      } else this._render(def, t, pitch, gain);
    } catch (e) { /* never let audio break the frame */ }
    this._out = null;
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
    } else if (def.kind === 'chord') {
      // A shimmering held chord (rare reveal).
      [0, 4, 7, 11, 14].forEach((semi, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 2 ? 'sine' : 'triangle';
        const st = t + i * 0.05;
        osc.frequency.setValueAtTime(def.freq * Math.pow(2, semi / 12), st);
        this._env(osc, st, def.a, def.h, def.r, gain * 0.3);
        osc.start(st);
        osc.stop(st + dur + 0.05);
      });
    }
  },

  // ---- the crowd bed under match screens (a looped, filtered noise) ----
  crowdBed(on) {
    this._crowdWant = !!on;
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    if (on && !this._crowdBed) {
      const def = SOUND_DATA.sfx.crowd_ambience;
      const file = this._file('crowd_ambience');
      const src = file ? this.ctx.createBufferSource() : this._noise(2.5);
      if (file) src.buffer = file;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = def.freq; f.Q.value = 0.35;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(def.gain * 1.6, t + def.a);
      if (file) src.connect(g); else { src.connect(f); f.connect(g); }
      g.connect(this.bus.crowd);
      src.start(t);
      this._crowdBed = { src, g };
    } else if (!on && this._crowdBed) {
      const b = this._crowdBed;
      this._crowdBed = null;
      b.g.gain.cancelScheduledValues(t); b.g.gain.setTargetAtTime(0, t, 0.3);
      setTimeout(() => { try { b.src.stop(); } catch (e) { /* already stopped */ } }, 1500);
    }
  },

  // ---- music (one track at a time) ----
  music(id) {
    if (!id) return;
    if (!this.ready) { this._musicWant = id; return; }
    if (this._music && this._music.id === id) return;
    this.stopMusic();
    const def = SOUND_DATA.music[id];
    if (!def) return;
    const t = this.ctx.currentTime, g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.2);
    g.connect(this.bus.music);
    const m = this._music = { id, def, step: 0, nextT: t + 0.15, gain: g };
    const file = this._file(id);
    if (file) {
      const src = this.ctx.createBufferSource();
      src.buffer = file; src.loop = true; src.connect(g); src.start(t);
      m.src = src;
    }
  },
  stopMusic() {
    const m = this._music;
    if (!m || !this.ready) { this._music = null; return; }
    this._music = null;
    const t = this.ctx.currentTime;
    m.gain.gain.cancelScheduledValues(t); m.gain.gain.setTargetAtTime(0, t, 0.25);
    setTimeout(() => { try { if (m.src) m.src.stop(); m.gain.disconnect(); } catch (e) { /* gone */ } }, 1600);
  },
  // Which music for a screen; match screens duck the music under the crowd.
  forScene(name) {
    const S = SOUND_DATA;
    let id = S.sceneMusic[name];
    if (id === 'match') {
      const fx = (typeof CareerMatch !== 'undefined' && CareerMatch.on && CareerMatch.fixture) || (typeof MyXIMatch !== 'undefined' && MyXIMatch.on && MyXIMatch.fixture) || null;
      id = fx && fx.rival ? 'music_rival' : fx && (fx.kind === 'final' || fx.final) ? 'music_final' : 'music_match';
    }
    const inMatch = S.crowdScenes.includes(name);
    this._duck = inMatch ? S.inMatchMusic : 1;
    if (id) this.music(id);
    this.crowdBed(inMatch);
    this.applyVolume();
  },

  // The placeholder music: a soft generated loop (pad + bass + arpeggio + light beat),
  // scheduled a little ahead so it never stutters.
  _tickMusic() {
    const m = this._music;
    if (!m || m.src || !this.ready || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime, d = m.def, step = 60 / d.bpm / 2;
    if (m.nextT < now) m.nextT = now + 0.05;
    while (m.nextT < now + 0.3) {
      this._musicStep(m, m.step, m.nextT, step);
      m.step++; m.nextT += step;
    }
  },
  _musicStep(m, s, t, step) {
    const d = m.def, ctx = this.ctx, out = m.gain;
    const bar = Math.floor(s / 8), b8 = s % 8;
    const root = d.root * Math.pow(2, d.chords[bar % d.chords.length] / 12);
    const minor = d.style === 'tense';
    const third = minor ? 3 : 4;
    const note = (freq, st, len, type, g, lp) => {
      const o = ctx.createOscillator(), gg = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = type; o.frequency.setValueAtTime(freq, st);
      f.type = 'lowpass'; f.frequency.value = lp || 2200;
      gg.gain.setValueAtTime(0, st); gg.gain.linearRampToValueAtTime(g, st + Math.min(0.08, len * 0.3));
      gg.gain.exponentialRampToValueAtTime(0.0001, st + len);
      o.connect(f); f.connect(gg); gg.connect(out);
      o.start(st); o.stop(st + len + 0.05);
    };
    // pad: the chord for the whole bar
    if (b8 === 0) for (const semi of [0, third, 7]) note(root * Math.pow(2, semi / 12), t, step * 8, 'sine', 0.035, 1600);
    // bass
    const bassEvery = d.style === 'calm' ? 4 : 2;
    if (b8 % bassEvery === 0) note(root / 2, t, step * bassEvery * 0.9, 'triangle', 0.07, 700);
    // arpeggio
    if (d.style !== 'calm' || b8 % 2 === 0) {
      const arp = [0, third, 7, 12, 7, third, 0, 7][b8];
      note(root * 2 * Math.pow(2, arp / 12), t, step * 0.9, 'triangle', d.style === 'calm' ? 0.022 : 0.028, 3000);
    }
    // a light beat
    if (d.style !== 'calm') {
      if (b8 % 4 === 0) note(62, t, 0.18, 'sine', 0.12, 400);
      if (b8 % 2 === 1) {
        const n = this._noise(0.05), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'highpass'; f.frequency.value = 6000;
        g.gain.setValueAtTime(0.018, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        n.connect(f); f.connect(g); g.connect(out); n.start(t);
      }
      if (d.style === 'drive' && (b8 === 2 || b8 === 6)) {
        const n = this._noise(0.12), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
        g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        n.connect(f); f.connect(g); g.connect(out); n.start(t);
      }
    }
  },
};
