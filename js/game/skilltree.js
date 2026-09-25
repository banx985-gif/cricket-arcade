// Cricket Arcade — The Wicket Tree rules (M06, docs/SKILL_TREE_v1.md). Pure:
// no drawing, no scenes. All numbers from SKILL_TREE_DATA.
//
// The tree lives in the career save as c.player.tree:
//   nodes      id -> rank owned (1 for techniques / keystones / capstone)
//   granted    id -> free ranks from the archetype (kept through a respec)
//   free       branch -> role points not spent yet (Batter: 1 in Batting …)
//   freeUsed   branch -> role points spent (given back by a respec)
//   spent      Skill Tokens spent in the tree (given back by a respec)
//   sources    where the career's Skill Tokens came from (the points counter)
//   respecs    how many respecs so far (each costs more)
//   loadout    { active: [techId, …], passive: [techId, …] } (plan 11)
//   mastery    techId -> uses (plan 11.4)
// Skill Tokens themselves stay in c.player.skillTokens (M05).

const SkillTree = {
  D() { return SKILL_TREE_DATA; },
  _byId: null,
  node(id) {
    if (!this._byId) { this._byId = {}; for (const n of SKILL_TREE_DATA.nodes) this._byId[n.id] = n; }
    return this._byId[id] || null;
  },
  nodes(branch) { return SKILL_TREE_DATA.nodes.filter((n) => !branch || n.branch === branch); },
  techNode(techId) { return SKILL_TREE_DATA.nodes.find((n) => n.tech === techId) || null; },
  tech(techId) { return SKILL_TREE_DATA.techniques[techId] || null; },

  // ---- setting up / upgrading a career's tree ----
  // Safe to call on every load: fills anything missing (M05 saves had
  // { nodes: {}, keystones: {} }) and applies the role and archetype gifts once.
  ensure(c) {
    const p = c.player;
    const t = p.tree = p.tree || {};
    t.nodes = t.nodes || {};
    t.granted = t.granted || {};
    t.free = t.free || {};
    t.freeUsed = t.freeUsed || {};
    t.spent = t.spent || 0;
    t.respecs = t.respecs || 0;
    t.loadout = t.loadout || { active: [], passive: [] };
    t.mastery = t.mastery || {};
    if (!t.sources) {
      // Older careers: work out where their tokens came from.
      const lv = Math.max(0, (p.level - 1) * CAREER_DATA.levels.skillTokensPerLevel);
      t.sources = { level: lv, promotion: Math.max(0, (p.skillTokens || 0) - lv), rival: 0 };
    }
    delete t.keystones;                           // (M05 placeholder; the pair rule uses nodes)
    if (!t.v) {
      t.v = SKILL_TREE_DATA.version;
      const role = SKILL_TREE_DATA.roles[p.role] || {};
      for (const [b, n] of Object.entries(role.free || {})) t.free[b] = (t.free[b] || 0) + n;
      const start = SKILL_TREE_DATA.archetypeStart[p.archetype];
      if (start && this.node(start)) { t.granted[start] = 1; t.nodes[start] = Math.max(t.nodes[start] || 0, 1); }
    }
    return t;
  },

  // ---- points ----
  // Every Skill Token the career earns goes through here (so the counter can
  // say where they came from). source: 'level' | 'promotion' | 'rival'.
  earn(c, source, n) {
    const t = this.ensure(c);
    c.player.skillTokens += n;
    t.sources[source] = (t.sources[source] || 0) + n;
  },
  rivalWin(c) { this.earn(c, 'rival', SKILL_TREE_DATA.points.perRivalWin); },
  tokens(c) { return c.player.skillTokens; },
  freeIn(c, branch) { return (this.ensure(c).free[branch] || 0); },

  // ---- costs, gates ----
  cost(n) {
    const C = SKILL_TREE_DATA.costs;
    if (n.type === 'minor') return C.minor;
    if (n.type === 'technique') return C.technique[n.tier];
    if (n.type === 'keystone') return C.keystone;
    return C.capstone;
  },
  ranks(n) { return n.type === 'minor' ? SKILL_TREE_DATA.minorRanks : 1; },
  rank(c, id) { return this.ensure(c).nodes[id] || 0; },
  owned(c, id) { return this.rank(c, id) > 0; },

  // Points in a branch (what opens its tiers). Archetype ranks count too.
  branchSpent(c, branch) {
    const t = this.ensure(c);
    let s = 0;
    for (const [id, r] of Object.entries(t.nodes)) {
      const n = this.node(id);
      if (n && n.branch === branch) s += this.cost(n) * r;
    }
    return s;
  },
  // Highest tier this role may use in a branch (Batters: Bowling to tier 2 …).
  roleCap(c, branch) {
    const r = SKILL_TREE_DATA.roles[c.player.role] || {};
    return (r.cap && r.cap[branch]) || 4;
  },
  tierOpen(c, branch, tier) {
    if (tier > this.roleCap(c, branch)) return false;
    return this.branchSpent(c, branch) >= SKILL_TREE_DATA.tierGates[tier - 1];
  },
  // Branches whose tier 4 is open (the capstone needs 2).
  branchesAtTier4(c) {
    return SKILL_TREE_DATA.branches.filter((b) => this.roleCap(c, b) >= 4 && this.branchSpent(c, b) >= SKILL_TREE_DATA.tierGates[3]).length;
  },

  // Can this node be bought (its next rank)? Returns { ok, reason, params }.
  //   reason: maxed | pairTaken | roleCap | tier | capstone | cost
  check(c, id) {
    const n = this.node(id);
    if (!n) return { ok: false, reason: 'unknown' };
    const r = this.rank(c, id);
    if (r >= this.ranks(n)) return { ok: false, reason: 'maxed' };
    if (n.type === 'keystone' && this.owned(c, n.pair)) return { ok: false, reason: 'pairTaken', params: { other: n.pair } };
    if (n.type === 'capstone') {
      const have = this.branchesAtTier4(c), need = SKILL_TREE_DATA.capstone.branchesAtTier4;
      if (have < need) return { ok: false, reason: 'capstone', params: { n: need, have } };
    } else {
      if (n.tier > this.roleCap(c, n.branch)) return { ok: false, reason: 'roleCap', params: { tier: this.roleCap(c, n.branch) } };
      const gate = SKILL_TREE_DATA.tierGates[n.tier - 1], spent = this.branchSpent(c, n.branch);
      if (spent < gate) return { ok: false, reason: 'tier', params: { need: gate, have: spent, tier: n.tier } };
    }
    const cost = this.cost(n), can = this.tokens(c) + (n.branch ? this.freeIn(c, n.branch) : 0);
    if (can < cost) return { ok: false, reason: 'cost', params: { need: cost, have: can } };
    return { ok: true, cost };
  },

  // Buy the next rank. Role points for that branch are spent first.
  // Returns { ok, reason, discovered: techId | null }.
  unlock(c, id) {
    const chk = this.check(c, id);
    if (!chk.ok) return chk;
    const n = this.node(id), t = this.ensure(c);
    let cost = chk.cost;
    const free = Math.min(cost, t.free[n.branch] || 0);
    if (free) { t.free[n.branch] -= free; t.freeUsed[n.branch] = (t.freeUsed[n.branch] || 0) + free; cost -= free; }
    c.player.skillTokens -= cost;
    t.spent += cost;
    t.nodes[id] = (t.nodes[id] || 0) + 1;
    return { ok: true, discovered: n.tech || null };
  },

  // Node state for the tree screen:
  //   locked | available (glowing: can buy now) | unlocked | mastered | excluded (the other keystone)
  state(c, id) {
    const n = this.node(id), r = this.rank(c, id);
    if (n.type === 'keystone' && !r && this.owned(c, n.pair)) return 'excluded';
    if (r > 0) {
      if (n.tech && this.masteryLevel(c, n.tech) === 'mastered') return 'mastered';
      if (r < this.ranks(n) && this.check(c, id).ok) return 'available';
      return 'unlocked';
    }
    return this.check(c, id).ok ? 'available' : 'locked';
  },

  // ---- respec (between stages, costs Coins, dearer each time) ----
  respecCost(c) { const R = SKILL_TREE_DATA.respec; return R.baseCoins + R.stepCoins * this.ensure(c).respecs; },
  betweenStages(c) { return c.phase === 'promoted'; },
  canRespec(c, coins) {
    const t = this.ensure(c);
    if (!this.betweenStages(c)) return { ok: false, reason: 'notBetween' };
    const bought = Object.keys(t.nodes).some((id) => (t.nodes[id] || 0) > (t.granted[id] || 0));
    if (!bought) return { ok: false, reason: 'nothing' };
    const cost = this.respecCost(c);
    if ((coins || 0) < cost) return { ok: false, reason: 'coins', params: { need: cost, have: coins || 0 } };
    return { ok: true, cost };
  },
  // Gives every point back (keystones and the capstone too). The archetype's
  // starting rank stays. Returns the Coins to charge (the caller pays them).
  respec(c) {
    const t = this.ensure(c), cost = this.respecCost(c);
    c.player.skillTokens += t.spent;
    t.spent = 0;
    for (const [b, n] of Object.entries(t.freeUsed)) t.free[b] = (t.free[b] || 0) + n;
    t.freeUsed = {};
    t.nodes = Object.assign({}, t.granted);
    t.loadout = { active: [], passive: [] };
    t.respecs++;
    return cost;
  },

  // ---- techniques and the loadout (plan 11) ----
  unlockedTechs(c) {
    return SKILL_TREE_DATA.nodes.filter((n) => n.tech && this.owned(c, n.id)).map((n) => n.tech);
  },
  slotOf(techId) { return this.tech(techId).kind === 'passive' ? 'passive' : 'active'; },
  equipped(c, techId) { const L = this.ensure(c).loadout; return L.active.includes(techId) || L.passive.includes(techId); },
  // Equip / unequip. Returns false if the slots are full or it isn't unlocked.
  toggle(c, techId) {
    const L = this.ensure(c).loadout, slot = this.slotOf(techId), list = L[slot];
    const i = list.indexOf(techId);
    if (i >= 0) { list.splice(i, 1); return true; }
    if (!this.unlockedTechs(c).includes(techId)) return false;
    if (list.length >= SKILL_TREE_DATA.loadout[slot]) return false;
    list.push(techId);
    return true;
  },
  // The equipped techniques that are still unlocked (a respec clears them anyway).
  loadout(c) {
    const L = this.ensure(c).loadout, have = this.unlockedTechs(c);
    return { active: L.active.filter((x) => have.includes(x)), passive: L.passive.filter((x) => have.includes(x)) };
  },

  // ---- mastery (plan 11.4): Learned -> Skilled -> Mastered ----
  masteryLevel(c, techId) {
    const u = this.ensure(c).mastery[techId] || 0, M = SKILL_TREE_DATA.mastery;
    return u >= M.mastered ? 'mastered' : u >= M.skilled ? 'skilled' : 'learned';
  },
  addMastery(c, uses) {
    const t = this.ensure(c);
    for (const [id, n] of Object.entries(uses || {})) if (this.tech(id)) t.mastery[id] = (t.mastery[id] || 0) + n;
  },

  // ---- what the tree does ----
  // Minor-perk stat bonuses (CareerStats.bonus adds them to effective stats).
  statBonus(c) {
    const out = {}, t = this.ensure(c);
    for (const [id, r] of Object.entries(t.nodes)) {
      const n = this.node(id);
      if (n && n.type === 'minor' && n.effect.stat) out[n.effect.stat] = (out[n.effect.stat] || 0) + n.effect.per * r;
    }
    return out;
  },
  flag(c, name) {
    const t = this.ensure(c);
    return Object.keys(t.nodes).some((id) => { const n = this.node(id); return n && n.effect && n.effect.flag === name; });
  },
  // Duel modifiers from minor perks, keystones and equipped passives. Plain
  // numbers (it's stored on the career player's match entity, so the duel
  // maths and the simulated balls use it too — see Duel).
  //   goodWindow / perfectBand / throwZone  x size        edge / fatigue / pressure  x
  //   chasePressure  x pressure in a chase                catchBonus / stopBonus  +
  //   composureFloor Composure never counts below this    xp / restEnergy / coins / energy
  mods(c) {
    const m = { goodWindow: 1, perfectBand: 1, throwZone: 1, edge: 1, fatigue: 1, pressure: 1, chasePressure: 1,
      catchBonus: 0, stopBonus: 0, composureFloor: 0, comboBoost: 1, xp: 0, restEnergy: 0, coins: 0, energy: 1, flags: {} };
    const t = this.ensure(c);
    for (const [id, r] of Object.entries(t.nodes)) {
      const n = this.node(id);
      if (!n || !n.effect) continue;
      const e = n.effect;
      if (e.flag) m.flags[e.flag] = true;
      if (!e.mod) continue;
      if (e.mod === 'composureFloor') m.composureFloor = Math.max(m.composureFloor, e.base + e.per * r);
      else if (['catchBonus', 'xp', 'restEnergy'].includes(e.mod)) m[e.mod] += e.per * r;
      else m[e.mod] *= Math.max(0.05, 1 + e.per * r);
    }
    const TD = SKILL_TREE_DATA.techniques, P = this.loadout(c).passive;
    const boost = (id) => (this.masteryLevel(c, id) === 'mastered' ? SKILL_TREE_DATA.mastery.masteredBoost : 1);
    if (P.includes('fitness_freak')) m.fatigue *= 1 - (1 - TD.fitness_freak.fatigue) * boost('fitness_freak');
    if (P.includes('pressure_proof')) m.pressure *= 1 - TD.pressure_proof.pressure * boost('pressure_proof');
    if (P.includes('fast_learner')) m.xp += TD.fast_learner.xp * boost('fast_learner');
    if (P.includes('treasure_sense')) m.coins += TD.treasure_sense.coins * boost('treasure_sense');
    if (P.includes('field_general')) { m.catchBonus += TD.field_general.catchBonus * boost('field_general'); m.stopBonus += TD.field_general.stopBonus * boost('field_general'); }
    if (m.flags.ironEngine) m.energy *= SKILL_TREE_DATA.keystones.ironEngine.energy;
    return m;
  },

  // Whole-match stat changes for the career player's match entity: the
  // Composure floor, Big Stage (finals / knockouts), Tournament Player,
  // Rival Slayer (a stronger opponent, until rivals exist) and Gear Mastery.
  // Returns { stats, notes: [techId | keystone id that applied] }.
  matchStats(c, stats, fixture, clubRating) {
    const out = Object.assign({}, stats), notes = [];
    const m = this.mods(c), P = this.loadout(c).passive, TD = SKILL_TREE_DATA.techniques;
    const add = (k, v) => { if (out[k] !== undefined) out[k] = Math.min(120, out[k] + v); };
    const addAll = (v) => { for (const k of Object.keys(out)) add(k, v); };
    const knockout = fixture && (fixture.kind === 'final' || fixture.kind === 'qualifier');
    if (m.composureFloor && out.composure < m.composureFloor) { out.composure = m.composureFloor; notes.push('perk_steel_nerve'); }
    if (knockout && m.flags.bigStage) { const B = SKILL_TREE_DATA.keystones.bigStage; add('composure', B.composure); add('control', B.control); notes.push('keystone_big_stage'); }
    if (knockout && P.includes('tournament_player')) { addAll(TD.tournament_player.stats); notes.push('tournament_player'); }
    if (fixture && fixture.opp && clubRating && fixture.opp.rating > clubRating && P.includes('rival_slayer')) { addAll(TD.rival_slayer.stats); notes.push('rival_slayer'); }
    if (P.includes('gear_mastery')) { for (const [k, v] of Object.entries(TD.gear_mastery.stats)) add(k, v); notes.push('gear_mastery'); }
    return { stats: out, notes };
  },

  // ---- Legacy (plan 8.21): the tree shape for the Legacy Snapshot / My XI ----
  legacySnapshot(c) {
    const t = this.ensure(c);
    const spent = {};
    for (const b of SKILL_TREE_DATA.branches) spent[b] = this.branchSpent(c, b);
    const lo = this.loadout(c);
    const mastery = {};
    for (const id of this.unlockedTechs(c)) mastery[id] = this.masteryLevel(c, id);
    return {
      v: SKILL_TREE_DATA.version, nodes: Object.assign({}, t.nodes), spent,
      keystones: SKILL_TREE_DATA.nodes.filter((n) => n.type === 'keystone' && t.nodes[n.id]).map((n) => n.id),
      legend: !!t.nodes.capstone_legends_bails,
      loadout: { active: lo.active.slice(), passive: lo.passive.slice() }, mastery,
    };
  },

  // ---- account-wide discovery (plan 11.5) ----
  // Stored in the global save's collection: collection.techniques[id] = first date.
  discovered(save, techId) { return !!(save && save.collection && save.collection.techniques && save.collection.techniques[techId]); },
  discover(save, techId) {
    if (!save || !techId) return false;
    save.collection = save.collection || {};
    const lib = save.collection.techniques = save.collection.techniques || {};
    if (lib[techId]) return false;
    lib[techId] = new Date().toISOString().slice(0, 10);
    return true;
  },
};
