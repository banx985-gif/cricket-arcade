// Cricket Arcade — small rolling debug log (plan 43A.7).
// Keeps the last few important events (scene changes, seeds, saves, errors)
// so a bug can be described with context. Nothing personal is recorded.

const Log = {
  MAX: 60,
  entries: [],

  add(kind, msg) {
    this.entries.push({ t: Math.round(performance.now()), kind, msg: String(msg) });
    if (this.entries.length > this.MAX) this.entries.shift();
  },

  snapshot() {
    return {
      build: CONFIG.BUILD_VERSION,
      content: CONFIG.CONTENT_VERSION,
      saveSchema: CONFIG.SAVE_SCHEMA_VERSION,
      scene: (typeof Scenes !== 'undefined' && Scenes.current) ? Scenes.currentName : null,
      seed: (typeof RNG !== 'undefined') ? RNG.seed : null,
      log: this.entries.slice(),
    };
  },
};

window.addEventListener('error', (e) => Log.add('error', e.message));
