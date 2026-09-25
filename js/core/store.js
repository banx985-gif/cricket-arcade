// Cricket Arcade — key/value storage (IndexedDB, with fallbacks).
// Order of preference: IndexedDB -> localStorage -> memory only.
// Some browsers block IndexedDB on file:// pages or in private mode; the game
// must still work, it just may not remember scores between visits.
// The save logic itself (versions, backups, validation) lives in save.js.

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
          resolve(raw === null ? null : JSON.parse(raw));
          return;
        }
      } catch (e) { /* fall through */ }
      resolve(this._mem[key] !== undefined ? this._mem[key] : null);
    });
  },

  set(key, value) { return this.setMany({ [key]: value }); },

  // Write several keys in ONE transaction: either all land or none do
  // (plan 43A.10 "write transactionally where practical").
  // A value of undefined deletes that key.
  setMany(entries) {
    for (const k of Object.keys(entries)) {
      if (entries[k] === undefined) delete this._mem[k]; else this._mem[k] = entries[k];
    }
    return new Promise((resolve) => {
      try {
        if (this.backend === 'indexedDB' && this._db) {
          const tx = this._db.transaction(this.STORE, 'readwrite');
          const os = tx.objectStore(this.STORE);
          for (const k of Object.keys(entries)) {
            if (entries[k] === undefined) os.delete(k); else os.put(entries[k], k);
          }
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
          tx.onabort = () => resolve(false);
          return;
        }
        if (this.backend === 'localStorage') {
          for (const k of Object.keys(entries)) {
            if (entries[k] === undefined) localStorage.removeItem(this.LS_PREFIX + k);
            else localStorage.setItem(this.LS_PREFIX + k, JSON.stringify(entries[k]));
          }
          resolve(true);
          return;
        }
      } catch (e) { /* quota etc. — never crash */ }
      resolve(this.backend === 'memory');
    });
  },

  remove(key) { return this.setMany({ [key]: undefined }); },
};
