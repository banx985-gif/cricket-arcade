// Cricket Arcade — tiny save (IndexedDB, with fallbacks).
// Order of preference: IndexedDB -> localStorage -> memory only.
// Some browsers block IndexedDB on file:// pages or in private mode; the game
// must still work, it just may not remember scores between visits.
//
// Save data is one versioned object. Unknown/invalid fields are ignored on load.

const Store = {
  DB_NAME: 'cricket-arcade',
  STORE: 'kv',
  LS_PREFIX: 'cricket-arcade:',
  backend: 'memory',
  _db: null,
  _mem: {},

  open() {
    return new Promise((resolve) => {
      let done = false;
      const finish = (backend) => {
        if (done) return;
        done = true;
        this.backend = backend;
        Log.add('save', 'storage backend: ' + backend);
        resolve(backend);
      };
      const fallback = () => finish(this._lsWorks() ? 'localStorage' : 'memory');
      // Never hang the boot if IndexedDB is slow to answer.
      setTimeout(fallback, 1500);
      try {
        if (!window.indexedDB) { fallback(); return; }
        const req = indexedDB.open(this.DB_NAME, 1);
        req.onupgradeneeded = () => {
          try { req.result.createObjectStore(this.STORE); } catch (e) { /* exists */ }
        };
        req.onsuccess = () => { this._db = req.result; finish('indexedDB'); };
        req.onerror = () => fallback();
        req.onblocked = () => fallback();
      } catch (e) {
        fallback();
      }
    });
  },

  _lsWorks() {
    try {
      const k = this.LS_PREFIX + '__test';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  },

  get(key) {
    return new Promise((resolve) => {
      try {
        if (this.backend === 'indexedDB' && this._db) {
          const tx = this._db.transaction(this.STORE, 'readonly');
          const req = tx.objectStore(this.STORE).get(key);
          req.onsuccess = () => resolve(req.result === undefined ? null : req.result);
          req.onerror = () => resolve(null);
          return;
        }
        if (this.backend === 'localStorage') {
          const raw = localStorage.getItem(this.LS_PREFIX + key);
          resolve(raw ? JSON.parse(raw) : null);
          return;
        }
      } catch (e) { /* fall through */ }
      resolve(this._mem[key] !== undefined ? this._mem[key] : null);
    });
  },

  set(key, value) {
    this._mem[key] = value;
    return new Promise((resolve) => {
      try {
        if (this.backend === 'indexedDB' && this._db) {
          const tx = this._db.transaction(this.STORE, 'readwrite');
          tx.objectStore(this.STORE).put(value, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
          return;
        }
        if (this.backend === 'localStorage') {
          localStorage.setItem(this.LS_PREFIX + key, JSON.stringify(value));
          resolve(true);
          return;
        }
      } catch (e) { /* quota etc. — never crash */ }
      resolve(false);
    });
  },

  remove(key) {
    delete this._mem[key];
    return new Promise((resolve) => {
      try {
        if (this.backend === 'indexedDB' && this._db) {
          const tx = this._db.transaction(this.STORE, 'readwrite');
          tx.objectStore(this.STORE).delete(key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
          return;
        }
        if (this.backend === 'localStorage') localStorage.removeItem(this.LS_PREFIX + key);
      } catch (e) { /* ignore */ }
      resolve(true);
    });
  },
};

// The game's save profile: best scores + settings.
const Save = {
  KEY: 'profile',
  data: null,

  defaults() {
    return {
      version: CONFIG.SAVE_SCHEMA_VERSION,
      best: {},                // modeId -> { score, streak, sixes }
      settings: { muted: false },
    };
  },

  async load() {
    this.data = this.defaults();
    const raw = await Store.get(this.KEY);
    if (!raw || typeof raw !== 'object') return this.data;
    if ((raw.version || 0) > CONFIG.SAVE_SCHEMA_VERSION) return this.data; // future save: don't half-read it
    if (raw.best && typeof raw.best === 'object') {
      for (const k of Object.keys(raw.best)) {
        const b = raw.best[k];
        if (b && typeof b.score === 'number' && b.score >= 0) {
          // keep only plain non-negative numbers
          const rec = {};
          for (const f of Object.keys(b)) {
            if (typeof b[f] === 'number' && isFinite(b[f]) && b[f] >= 0) rec[f] = Math.floor(b[f]);
          }
          this.data.best[k] = rec;
        }
      }
    }
    if (raw.settings && typeof raw.settings.muted === 'boolean') {
      this.data.settings.muted = raw.settings.muted;
    }
    return this.data;
  },

  write() {
    Log.add('save', 'write');
    return Store.set(this.KEY, JSON.parse(JSON.stringify(this.data)));
  },

  best(mode) { return this.data.best[mode] || null; },

  // Record a finished game. stats = { name: number } — each is kept as a
  // personal best too (e.g. best streak). Returns true for a new best score.
  submit(mode, score, stats) {
    const prev = this.data.best[mode];
    const isBest = !prev || score > prev.score;
    const rec = prev ? Object.assign({}, prev) : { score: 0 };
    if (isBest) rec.score = score;
    for (const k of Object.keys(stats || {})) rec[k] = Math.max(rec[k] || 0, stats[k]);
    this.data.best[mode] = rec;
    this.write();
    return isBest;
  },

  // Quick Match record: matches played / won per format.
  recordMatch(formatId, won) {
    const rec = Object.assign({ score: 0, played: 0, won: 0 }, this.data.best[formatId] || {});
    rec.played += 1;
    if (won) rec.won += 1;
    rec.score = rec.won;
    this.data.best[formatId] = rec;
    this.write();
    return rec;
  },

  setMuted(m) {
    this.data.settings.muted = !!m;
    this.write();
  },

  async wipe() {
    this.data = this.defaults();
    await Store.remove(this.KEY);
    Log.add('save', 'wiped');
  },
};
