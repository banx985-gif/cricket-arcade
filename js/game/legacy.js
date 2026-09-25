// Cricket Arcade — retirement and the Legacy Player (M09, plan 8.20–8.22, 21.2).
// Pure: no drawing. Data in LEGACY_DATA.
//
// Retiring a career:
//   1. Legacy.careerTotals(c)   everything the career did (from every match's facts)
//   2. Legacy.traits(c)         1 Primary + up to 1 Secondary Legacy Trait
//   3. Legacy.snapshot(c)       a frozen copy of the finished player (plan 8.20): a
//                               deep copy with item names, stats and set bonuses
//                               written in, so nothing on the account can change it
//   4. Legacy.retire(...)       Hall of Fame (save.hallOfFame), Legacy Marks, the
//                               first retirement unlocks My XI, and the slot is freed

const Legacy = {
  // Career totals (the stats LEGACY_DATA traits use).
  careerTotals(c) {
    const H = c.history || [], t = { matches: H.length, wins: 0, runs: 0, sixes: 0, fours: 0, notOuts: 0, wickets: 0, sGrades: 0,
      ppRuns: 0, spinRuns: 0, chaseWinsNotOut: 0, paceWickets: 0, newBallWickets: 0, deathWickets: 0, hatTricks: 0, threeFors: 0,
      closerWins: 0, knockoutGreats: 0, tournamentGreats: 0, bestBat: 0, bestBowl: 0 };
    const KO = ['final', 'semi', 'quarter', 'qualifier'];
    const tourWon = new Set((c.trophies || []).filter((x) => /_champion$/.test(x) && x !== 'elite_champion').map((x) => x.replace('_champion', '')));
    for (const h of H) {
      const b = h.bat || {}, w = h.bowl || {}, f = h.facts || {};
      if (h.won) t.wins++;
      t.runs += b.runs || 0; t.sixes += b.sixes || 0; t.fours += b.fours || 0;
      if (b.batted && !b.out) t.notOuts++;
      t.wickets += w.wkts || 0;
      if ((w.wkts || 0) >= 3) t.threeFors++;
      t.bestBat = Math.max(t.bestBat, b.runs || 0); t.bestBowl = Math.max(t.bestBowl, w.wkts || 0);
      if (h.grade === 'S') t.sGrades++;
      const great = h.grade === 'A' || h.grade === 'S';
      if (great && KO.includes(h.kind)) t.knockoutGreats++;
      if (great && h.tour && tourWon.has(h.tour)) t.tournamentGreats++;
      for (const k of ['ppRuns', 'spinRuns', 'paceWickets', 'newBallWickets', 'deathWickets', 'hatTricks']) t[k] += f[k] || 0;
      if (f.chaseWinNotOut) t.chaseWinsNotOut++;
      if (f.closerWin) t.closerWins++;
    }
    t.hatTrickScore = t.hatTricks * 5 + t.threeFors;
    t.rivalsBeaten = Rivals.beatenCount(c);
    t.captain = c.captain ? 1 : 0;
    const tr = c.trophies || [];
    t.homegrown = (tr.includes('local_final') ? 1 : 0) + (tr.includes('world_champion') ? 1 : 0);
    t.gateMisses = c.gateMisses || 0;
    return t;
  },

  // Plan 8.22: 1 Primary (guaranteed) + up to 1 Secondary. Returns { primary, secondary, scores }.
  traits(c, totals) {
    const t = totals || this.careerTotals(c);
    const pref = LEGACY_DATA.roleDefault[c.player.role];
    const scores = LEGACY_DATA.traits.map((tr) => ({ id: tr.id, k: (t[tr.stat] || 0) / tr.need })).sort((a, z) => z.k - a.k || (z.id === pref) - (a.id === pref));
    const earned = scores.filter((s) => s.k >= 1);
    return { primary: (earned[0] || scores[0]).id, secondary: earned[1] ? earned[1].id : null, earned: earned.map((s) => s.id), scores };
  },
  trait(id) { return LEGACY_DATA.traits.find((x) => x.id === id) || null; },

  // The frozen Legacy Snapshot (plan 8.20).
  snapshot(c, save) {
    const p = c.player, totals = this.careerTotals(c), tr = this.traits(c, totals), eq = Gear.equipped(c), lo = SkillTree.loadout(c);
    const gear = {};
    for (const [slot, id] of Object.entries(eq)) {
      const it = Gear.item(id);
      if (it) gear[slot] = { id, rarity: it.rarity, signature: !!it.signature, set: it.set || null, stats: Object.assign({}, it.stats), perk: it.perk || null, art: it.art };
    }
    const sets = Object.entries(Gear.setCounts(eq)).map(([set, n]) => ({ set, pieces: n, active: Gear.thresholds(set).filter((th) => n >= th) })).filter((s) => s.active.length);
    // the signature technique: the most-used unlocked technique
    const mastery = c.player.tree.mastery || {}, techs = SkillTree.unlockedTechs(c);
    const signature = techs.slice().sort((a, z) => (mastery[z] || 0) - (mastery[a] || 0))[0] || null;
    const snap = {
      id: 'legacy_' + c.seed + '_' + (c.created || '').replace(/\D/g, '').slice(0, 14),
      retiredAt: new Date().toISOString().slice(0, 10),
      name: p.name, presentation: p.presentation, look: p.look, facial: p.facial, skin: p.skin, hairColour: p.hairColour,
      batHand: p.batHand, bowlHand: p.bowlHand, origin: c.origin,
      role: p.role, archetype: p.archetype, batRole: p.batRole, family: p.family,
      stats: Object.assign({}, p.stats), ovr: Career.overall(c), level: p.level,
      traits: { primary: tr.primary, secondary: tr.secondary },
      gear, sets,
      loadout: { active: lo.active.slice(), passive: lo.passive.slice() },
      signatureTech: signature, signatureMastery: signature ? SkillTree.masteryLevel(c, signature) : null,
      tree: SkillTree.legacySnapshot(c),
      trophies: (c.trophies || []).slice(), captain: !!c.captain,
      stageReached: Career.stage(c).n, club: c.club ? c.club.name : null, franchise: c.contract ? c.contract.franchise : null,
      rivals: Object.keys((c.hooks && c.hooks.rivals) || {}).filter((id) => c.hooks.rivals[id].beaten),
      records: totals,
      championBeaten: !!(c.hooks && c.hooks.rivals && c.hooks.rivals.champion && c.hooks.rivals.champion.beaten),
    };
    return JSON.parse(JSON.stringify(snap));      // a plain frozen copy: no links back to the career or the data
  },

  marks(snap) { const M = LEGACY_DATA.marks; return M.base + M.perTrophy * snap.trophies.length + (snap.championBeaten ? M.champion : 0); },
  // Can this career retire? After Stage 8 (or from the developer panel).
  canRetire(c) { return c.phase === 'complete'; },

  // Retire: the snapshot joins the Hall of Fame; Legacy Marks; My XI unlocks the first time.
  // Frees the slot (the caller saves). Returns { snap, marks, firstRetirement }.
  retire(c, save) {
    const snap = this.snapshot(c, save);
    save.hallOfFame = save.hallOfFame || [];
    const first = save.hallOfFame.length === 0;
    snap.marks = this.marks(snap);
    save.hallOfFame.push(snap);
    save.currencies.legacyMarks = (save.currencies.legacyMarks || 0) + snap.marks;
    save.unlocks = save.unlocks || {};
    if (first) save.unlocks.myxi = snap.retiredAt;          // plan 8.21: the first retirement unlocks My XI
    return { snap, marks: snap.marks, firstRetirement: first };
  },
};
