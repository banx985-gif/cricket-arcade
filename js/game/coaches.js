// Cricket Arcade — coach rules (M08, plan 13, 8.19). Pure: no drawing. Numbers in COACH_DATA.
//
// Account-wide, in the global save:
//   save.coaches = { unlocked: { id: 'YYYY-MM-DD' }, mastery: { id: uses } }
// Per career: c.hooks.coach = the active coach id (or null).
// A coach helps three ways: a small passive stat bonus and perks (CareerStats /
// SkillTree.mods), and their specialty drills train better (Career.train).

const Coaches = {
  D() { return COACH_DATA; },
  coach(id) { return COACH_DATA.coaches.find((k) => k.id === id) || null; },
  list() { return COACH_DATA.coaches; },

  store(save) {
    if (!save.coaches || typeof save.coaches !== 'object') save.coaches = {};
    save.coaches.unlocked = save.coaches.unlocked || {};
    save.coaches.mastery = save.coaches.mastery || {};
    return save.coaches;
  },
  // The starting coaches are unlocked on every account (safe to call on every load).
  ensure(save) { for (const k of COACH_DATA.coaches) if (k.unlock === 'start') this.unlock(save, k.id); return save; },
  unlocked(save, id) { return !!(save && save.coaches && save.coaches.unlocked && save.coaches.unlocked[id]); },
  unlock(save, id) {
    const S = this.store(save);
    if (S.unlocked[id] || !this.coach(id)) return false;
    S.unlocked[id] = new Date().toISOString().slice(0, 10);
    return true;
  },
  // Any career reaching a stage unlocks that stage's coaches for the account. Returns the new ones.
  unlockForStage(save, n) {
    return COACH_DATA.coaches.filter((k) => k.unlock && k.unlock.stage && k.unlock.stage <= n && this.unlock(save, k.id)).map((k) => k.id);
  },
  // Beating any rival unlocks the Rival coach.
  unlockForRival(save) { return COACH_DATA.coaches.filter((k) => k.unlock === 'rival' && this.unlock(save, k.id)).map((k) => k.id); },

  // ---- the career's coach ----
  active(c) { return (c.hooks && c.hooks.coach) || null; },
  // { ok, reason: 'unknown' | 'locked' | 'tier', params }
  canHire(c, save, id) {
    const k = this.coach(id);
    if (!k) return { ok: false, reason: 'unknown' };
    if (!this.unlocked(save, id)) return { ok: false, reason: 'locked' };
    if (k.tier > Career.stage(c).n) return { ok: false, reason: 'tier', params: { t: k.tier } };
    return { ok: true };
  },
  hire(c, save, id) {
    const chk = this.canHire(c, save, id);
    if (!chk.ok) return chk;
    c.hooks = c.hooks || {};
    c.hooks.coach = id;
    const S = this.store(save); S.hired = S.hired || {}; S.hired[id] = 1;   // (achievement: hire every coach)
    return { ok: true };
  },

  // ---- mastery (account-wide, modest) ----
  uses(save, id) { return (save && save.coaches && save.coaches.mastery && save.coaches.mastery[id]) || 0; },
  level(save, id) { const u = this.uses(save, id); return COACH_DATA.mastery.levels.filter((n) => u >= n).length; },
  addUse(save, id, n) { if (!id || !save) return; const S = this.store(save); S.mastery[id] = (S.mastery[id] || 0) + (n || 1); },

  // ---- what the coach does ----
  statBonus(c) { const k = this.coach(this.active(c)); return k ? Object.assign({}, k.stats) : {}; },
  applyMods(c, m) {
    const k = this.coach(this.active(c));
    for (const P of (k && k.perks) || []) {
      if (P.flag) m.flags[P.flag] = true;
      else if (P.mult !== undefined) m[P.mod] = (m[P.mod] === undefined ? 1 : m[P.mod]) * P.mult;
      else if (P.add !== undefined) m[P.mod] = (m[P.mod] || 0) + P.add;
      else if (P.floor !== undefined) m[P.mod] = Math.max(m[P.mod] || 0, P.floor);
    }
    return m;
  },
  // Whole-match extras: the Rival coach in a boss match.
  matchBoost(c, fixture) {
    const k = this.coach(this.active(c));
    return k && k.rivalStats && fixture && fixture.rival ? k.rivalStats : 0;
  },
  // A training drill with the coach: { specialty, xp (fraction), extraStat (chance) }.
  training(c, save, drillId) {
    const id = this.active(c), k = this.coach(id);
    if (!k || !k.drills.includes(drillId)) return { specialty: false, xp: 0, extraStat: 0 };
    const L = this.level(save, id), S = COACH_DATA.specialty, P = COACH_DATA.mastery.perLevel;
    return { specialty: true, xp: S.xp + P.xp * L, extraStat: S.extraStat + P.extraStat * L };
  },
};
