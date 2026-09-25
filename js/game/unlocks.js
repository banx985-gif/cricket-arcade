// Cricket Arcade — unlocks (one system for everything that can be earned).
// An unlock condition lives in the data next to the thing it unlocks:
//   'always'                    starter content
//   { quickMatchWins: n }       total Quick Match wins (any length)
// Career stages, coaches and rewards add their own condition types here later
// (e.g. { careerStage: 3 }, { reward: 'id' }). Once met, the unlock is written
// to the save (Save.data.unlocks) so it can never be lost again.

const Unlocks = {
  _key(kind, id) { return kind + '.' + id; },

  stats(save) {
    const d = save || (typeof Save !== 'undefined' && Save.data) || { matches: {} };
    let wins = 0;
    for (const [id, rec] of Object.entries(d.matches || {})) {
      const f = MATCH_DATA.formats[id];
      if (f && !f.devOnly) wins += rec.won || 0;
    }
    return { quickMatchWins: wins };
  },

  met(cond, st) {
    if (!cond || cond === 'always') return true;
    if (cond.quickMatchWins !== undefined) return st.quickMatchWins >= cond.quickMatchWins;
    return false;
  },

  has(kind, id, cond, save) {
    const d = save || (typeof Save !== 'undefined' && Save.data);
    if (d && d.unlocks && d.unlocks[this._key(kind, id)]) return true;
    return this.met(cond, this.stats(d));
  },

  fieldPreset(id, save) {
    const p = FIELD_DATA.presets.find((x) => x.id === id);
    if (typeof MissionMatch !== 'undefined' && MissionMatch.on) return !!p;     // missions: every field setting
    return !!p && this.has('field', id, p.unlock, save);
  },

  // Text for a locked item ("Win 3 Quick Matches").
  hint(cond) {
    if (cond && cond.quickMatchWins !== undefined) return T(cond.quickMatchWins === 1 ? 'unlock.winMatch1' : 'unlock.winMatches', { n: cond.quickMatchWins });
    return '';
  },

  // Call after anything that could unlock something (e.g. a match result).
  // Records new unlocks in the save and returns them: [{ kind, id }].
  check(save) {
    const d = save || Save.data;
    if (!d.unlocks) d.unlocks = {};
    const st = this.stats(d);
    const fresh = [];
    for (const p of FIELD_DATA.presets) {
      const key = this._key('field', p.id);
      if (p.unlock === 'always' || d.unlocks[key]) continue;
      if (this.met(p.unlock, st)) { d.unlocks[key] = { at: new Date().toISOString() }; fresh.push({ kind: 'field', id: p.id }); }
    }
    return fresh;
  },
};
