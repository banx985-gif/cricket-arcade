// Cricket Arcade — save system (plan 33, 43A.8, 43A.10).
//
// Storage keys:
//   global          the global save (settings, challenge bests, match record,
//                   and empty sections for everything the plan adds later)
//   global.backup   the previous save that passed validation (last-known-good)
//   career.1..3     career slots (empty until Career arrives in M05)
//   resume          mid-match checkpoint (start of each over / innings break)
//   profile         OLD pre-M04 save — read once and migrated, then removed
//
// Safety rules:
//   * every save is validated before it's written; an invalid one is refused
//   * the save that is being replaced becomes the backup, in the same
//     transaction, but only if it is itself valid
//   * if the newest save can't be read, the backup is used instead
//   * build / content / save-schema versions are recorded separately

const Save = {
  KEYS: { main: 'global', backup: 'global.backup', resume: 'resume', legacy: 'profile', career: (n) => 'career.' + n },
  CAREER_SLOTS: 3,
  data: null,
  recovered: null,          // null | 'backup' | 'fresh' — what happened at load
  lastError: null,
  _queue: Promise.resolve(),

  // ---------------------------------------------------------------- shape
  defaults() {
    return {
      meta: this._meta(),
      settings: { muted: false, haptics: true },
      challenges: {},            // modeId -> { score, streak, sixes, wickets, combo … }
      matches: {},               // formatId -> { played, won }
      // ---- empty until their systems exist (plan 33) ----
      currencies: {},            // e.g. { coins: 0, gems: 0 }
      globalLevel: { level: 1, xp: 0 },
      unlocks: {},
      collection: {},
      myXI: null,
      hallOfFame: [],
      records: {},
      achievements: {},
      missionStars: {},
      careerSlots: [null, null, null],   // summaries only; the careers live in career.1..3
    };
  },

  _meta(old) {
    return {
      schema: CONFIG.SAVE_SCHEMA_VERSION,
      build: CONFIG.BUILD_VERSION + (CONFIG.BUILD_STAMP ? '+' + CONFIG.BUILD_STAMP : ''),
      content: CONFIG.CONTENT_VERSION,
      created: (old && old.created) || new Date().toISOString(),
      savedAt: new Date().toISOString(),
      writes: ((old && old.writes) || 0) + 1,
    };
  },

  // Required fields. Returns a list of problems (empty = valid).
  validate(doc) {
    const p = [];
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (!isObj(doc)) return ['not an object'];
    if (!isObj(doc.meta) || typeof doc.meta.schema !== 'number') p.push('meta.schema missing');
    else if (doc.meta.schema > CONFIG.SAVE_SCHEMA_VERSION) p.push('save is from a newer version');
    if (!isObj(doc.settings) || typeof doc.settings.muted !== 'boolean') p.push('settings invalid');
    if (!isObj(doc.challenges)) p.push('challenges missing');
    if (!isObj(doc.matches)) p.push('matches missing');
    if (!Array.isArray(doc.careerSlots) || doc.careerSlots.length !== this.CAREER_SLOTS) p.push('careerSlots invalid');
    for (const [id, rec] of Object.entries(isObj(doc.challenges) ? doc.challenges : {})) {
      if (!isObj(rec) || typeof rec.score !== 'number' || rec.score < 0) p.push('challenge ' + id + ' invalid');
    }
    for (const [id, rec] of Object.entries(isObj(doc.matches) ? doc.matches : {})) {
      if (!isObj(rec) || typeof rec.played !== 'number' || typeof rec.won !== 'number') p.push('match record ' + id + ' invalid');
    }
    return p;
  },

  // ---------------------------------------------------------------- migrations
  // One step per schema version. Each takes the old save and returns the next.
  MIGRATIONS: [
    {
      from: 1, to: 2,
      note: 'M01–M03 "profile" save -> M04 global save',
      run(old) {
        const d = Save.defaults();
        const best = (old && old.best) || {};
        for (const [id, rec] of Object.entries(best)) {
          if (!rec || typeof rec.score !== 'number') continue;
          if (typeof rec.played === 'number') d.matches[id] = { played: rec.played, won: rec.won || 0 };
          else d.challenges[id] = Object.assign({}, rec);
        }
        if (old && old.settings && typeof old.settings.muted === 'boolean') d.settings.muted = old.settings.muted;
        d.meta.schema = 2;
        return d;
      },
    },
  ],

  migrate(doc) {
    let d = doc;
    let v = (d && d.meta && d.meta.schema) || (d && d.version) || 1;
    for (const m of this.MIGRATIONS) {
      if (v === m.from) { d = m.run(d); v = m.to; Log.add('save', 'migrated ' + m.from + '->' + m.to); }
    }
    // Fill in any sections added since (new empty sections never break old saves).
    const base = this.defaults();
    for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
    if (d.settings && d.settings.haptics === undefined) d.settings.haptics = true;
    return d;
  },

  // ---------------------------------------------------------------- load
  _parse(raw) {
    if (raw === null || raw === undefined) return null;
    try {
      const doc = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const m = this.migrate(doc);
      return this.validate(m).length ? null : m;
    } catch (e) { return null; }
  },

  async load() {
    this.recovered = null;
    const [main, backup, legacy] = await Promise.all([
      Store.get(this.KEYS.main), Store.get(this.KEYS.backup), Store.get(this.KEYS.legacy)]);
    let doc = this._parse(main);
    if (!doc && main !== null) {
      Log.add('save', 'newest save unreadable — trying backup');
      doc = this._parse(backup);
      this.recovered = doc ? 'backup' : 'fresh';
    }
    if (!doc && main === null && legacy !== null) doc = this._parse(legacy);   // old M01–M03 save
    if (!doc) doc = this.defaults();
    this.data = doc;
    this._applySettings();
    // Write it back in the current format (repairs a bad main from the backup,
    // finishes a migration, and drops the old key).
    if (main === null || this.recovered || legacy !== null) {
      await this.write({ keepBackup: this.recovered === 'backup' });
      if (legacy !== null) await Store.remove(this.KEYS.legacy);
    }
    if (this.recovered) Log.add('save', 'recovered: ' + this.recovered);
    return this.data;
  },

  _applySettings() {
    const s = this.data.settings;
    if (typeof Sound !== 'undefined') Sound.setMuted(s.muted);
    if (typeof Platform !== 'undefined') Platform.hapticsOn = s.haptics !== false;
  },

  // ---------------------------------------------------------------- write
  // Writes are queued so two saves can never interleave.
  write(opts) {
    const o = opts || {};
    this._queue = this._queue.then(() => this._write(o)).catch((e) => {
      this.lastError = String(e);
      Log.add('error', 'save failed: ' + e);
      return false;
    });
    return this._queue;
  },

  async _write(o) {
    if (!this.data) return false;              // still loading: nothing to save yet
    const next = JSON.parse(JSON.stringify(this.data));
    next.meta = this._meta(this.data.meta);
    const problems = this.validate(next);
    if (problems.length) {
      Log.add('error', 'save refused: ' + problems.join('; '));
      if (typeof console !== 'undefined') console.error('[save] refused invalid save:', problems);
      return false;
    }
    const entries = { [this.KEYS.main]: JSON.stringify(next) };
    // The save being replaced becomes the backup — only if it's valid itself.
    if (!o.keepBackup) {
      const current = await Store.get(this.KEYS.main);
      if (current !== null && this._parse(current)) entries[this.KEYS.backup] = current;
    }
    const ok = await Store.setMany(entries);
    if (ok) this.data.meta = next.meta;
    Log.add('save', 'write #' + next.meta.writes + (ok ? '' : ' FAILED'));
    return ok;
  },

  // ---------------------------------------------------------------- game-facing API
  best(id) { return this.data.challenges[id] || this.data.matches[id] || null; },

  // A finished challenge. stats = { name: number } kept as personal bests too.
  // Returns true for a new best score. Autosaves.
  submit(mode, score, stats) {
    const prev = this.data.challenges[mode];
    const isBest = !prev || score > prev.score;
    const rec = prev ? Object.assign({}, prev) : { score: 0 };
    if (isBest) rec.score = score;
    for (const k of Object.keys(stats || {})) rec[k] = Math.max(rec[k] || 0, stats[k]);
    this.data.challenges[mode] = rec;
    this.write();
    return isBest;
  },

  // A finished Quick Match. Autosaves.
  recordMatch(formatId, won) {
    const rec = Object.assign({ played: 0, won: 0 }, this.data.matches[formatId] || {});
    rec.played += 1;
    if (won) rec.won += 1;
    this.data.matches[formatId] = rec;
    this.write();
    return rec;
  },

  setSetting(key, value) {
    this.data.settings[key] = value;
    this._applySettings();
    this.write();
  },
  setMuted(m) { this.setSetting('muted', !!m); },

  // ---------------------------------------------------------------- career slots (M05 fills these)
  async loadCareer(slot) {
    const raw = await Store.get(this.KEYS.career(slot));
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },
  async saveCareer(slot, career, summary) {
    if (slot < 1 || slot > this.CAREER_SLOTS) throw new Error('bad career slot ' + slot);
    this.data.careerSlots[slot - 1] = summary || null;
    await Store.set(this.KEYS.career(slot), career ? JSON.stringify(career) : undefined);
    return this.write();
  },

  // ---------------------------------------------------------------- mid-match resume
  saveResume(checkpoint) {
    const doc = { v: 1, build: CONFIG.BUILD_VERSION, savedAt: new Date().toISOString(), checkpoint };
    Log.add('save', 'match checkpoint ' + (checkpoint.label || ''));
    return Store.set(this.KEYS.resume, JSON.stringify(doc));
  },
  async loadResume() {
    const raw = await Store.get(this.KEYS.resume);
    try {
      const doc = raw ? JSON.parse(raw) : null;
      return doc && doc.v === 1 && doc.checkpoint ? doc : null;
    } catch (e) { return null; }
  },
  clearResume() { return Store.remove(this.KEYS.resume); },

  // ---------------------------------------------------------------- reset
  async wipe() {
    const keys = [this.KEYS.main, this.KEYS.backup, this.KEYS.resume, this.KEYS.legacy];
    for (let n = 1; n <= this.CAREER_SLOTS; n++) keys.push(this.KEYS.career(n));
    const entries = {};
    for (const k of keys) entries[k] = undefined;
    await Store.setMany(entries);
    this.data = this.defaults();
    this._applySettings();
    this.recovered = null;
    Log.add('save', 'full data reset');
    return this.write();
  },
};
