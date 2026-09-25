// Cricket Arcade — equipment rules (M07, plan 12, 5.5E, 8.19). Pure: no drawing,
// no scenes. All numbers from EQUIPMENT_DATA.
//
// The Global Locker (plan 12.8) is account-wide, in the global save:
//   save.locker   id -> { got: 'YYYY-MM-DD', src: 'shop' | 'drop' | 'final' | 'starter' … }
// Owning an item puts it in the Locker and the Collection for good. A career
// may equip an owned item once the career's tier (its stage number) reaches
// the item's tier. What a career wears is in the career save:
//   c.player.equipment   slot -> item id
// Gear stats reach matches through CareerStats.bonus() (effective stats ->
// the duel maths); perks and set effects through SkillTree.mods().

const Gear = {
  D() { return EQUIPMENT_DATA; },
  _byId: null,
  item(id) {
    if (!this._byId) { this._byId = {}; for (const it of EQUIPMENT_DATA.items) this._byId[it.id] = it; }
    return this._byId[id] || null;
  },
  items(slot) { return EQUIPMENT_DATA.items.filter((it) => !slot || it.slot === slot); },
  rarity(it) { return EQUIPMENT_DATA.rarities[it.rarity]; },
  cosmetic(it) { return EQUIPMENT_DATA.cosmetic.includes(it.slot); },
  frame(it) { return it.signature ? EQUIPMENT_DATA.signatureFrame : this.rarity(it).frame; },
  starterFor(slot) { const it = EQUIPMENT_DATA.items.find((x) => x.slot === slot && x.src.includes('starter')); return it ? it.id : null; },

  // ---- the Global Locker ----
  locker(save) { if (!save.locker) save.locker = {}; return save.locker; },
  owns(save, id) { return !!(save && save.locker && save.locker[id]); },
  // Add an item to the Locker. Returns true if it's new.
  grant(save, id, src) {
    const L = this.locker(save);
    if (L[id] || !this.item(id)) return false;
    L[id] = { got: new Date().toISOString().slice(0, 10), src: src || 'shop' };
    return true;
  },
  // Every account owns the starter kit (safe to call on every load).
  ensure(save) {
    for (const it of EQUIPMENT_DATA.items) if (it.src.includes('starter')) this.grant(save, it.id, 'starter');
    return save;
  },
  ownedCount(save) { return EQUIPMENT_DATA.items.filter((it) => this.owns(save, it.id)).length; },

  // ---- a career's gear ----
  tier(c) { return Career.stage(c).n; },
  // Fill empty slots with the starter kit (new careers, older saves).
  ensureCareer(c) {
    const eq = c.player.equipment = c.player.equipment || {};
    for (const s of EQUIPMENT_DATA.slots) if (!eq[s] || !this.item(eq[s])) eq[s] = this.starterFor(s);
    return eq;
  },
  equipped(c) { return this.ensureCareer(c); },
  // Can this career wear it? { ok, reason: 'unknown' | 'notOwned' | 'tier', params }
  canEquip(c, save, id) {
    const it = this.item(id);
    if (!it) return { ok: false, reason: 'unknown' };
    if (!this.owns(save, id)) return { ok: false, reason: 'notOwned' };
    if (it.tier > this.tier(c)) return { ok: false, reason: 'tier', params: { t: it.tier } };
    return { ok: true };
  },
  equip(c, save, id) {
    const chk = this.canEquip(c, save, id);
    if (!chk.ok) return chk;
    this.ensureCareer(c)[this.item(id).slot] = id;
    return { ok: true };
  },

  // ---- what the gear does ----
  // Pieces of each set worn (distinct slots; cosmetics never count).
  // eq: slot -> id (defaults to what the career wears).
  setCounts(eq) {
    const out = {};
    for (const [slot, id] of Object.entries(eq)) {
      const it = this.item(id);
      if (it && it.set && !this.cosmetic(it)) out[it.set] = (out[it.set] || 0) + 1;
    }
    return out;
  },
  setSize(set) { return new Set(EQUIPMENT_DATA.items.filter((it) => it.set === set).map((it) => it.slot)).size; },
  // The thresholds a set has (2, 3, 4 …) and which are met with n pieces.
  thresholds(set) { return Object.keys(EQUIPMENT_DATA.sets[set]).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, z) => a - z); },
  // Gear Mastery (the Wicket Tree passive): equipped item stats go up.
  masteryBoost(c) {
    if (typeof SkillTree === 'undefined' || !SkillTree.loadout(c).passive.includes('gear_mastery')) return 1;
    const m = SkillTree.masteryLevel(c, 'gear_mastery') === 'mastered' ? SKILL_TREE_DATA.mastery.masteredBoost : 1;
    return 1 + EQUIPMENT_DATA.gearMasteryBoost * m;
  },
  // Stat bonus from gear: item stats (x Gear Mastery) + set thresholds met.
  // eq: optional slot -> id to try (the compare card); defaults to what's worn.
  statBonus(c, eq) {
    const worn = eq || this.equipped(c), out = {}, k = this.masteryBoost(c);
    const add = (stats, mult) => { for (const [s, v] of Object.entries(stats || {})) out[s] = (out[s] || 0) + (mult > 1 ? Math.ceil(v * mult) : v); };
    for (const id of Object.values(worn)) { const it = this.item(id); if (it && !this.cosmetic(it)) add(it.stats, k); }
    for (const [set, n] of Object.entries(this.setCounts(worn))) {
      for (const t of this.thresholds(set)) if (n >= t) add(EQUIPMENT_DATA.sets[set][t].stats, 1);
    }
    return out;
  },
  // Perk parts from items and set thresholds. Each part: { mod, mult | add | floor } or { flag }.
  perkParts(c, eq) {
    const worn = eq || this.equipped(c), parts = [];
    const push = (id) => {
      if (!id) return;
      if (EQUIPMENT_DATA.perks[id]) parts.push(EQUIPMENT_DATA.perks[id]);
      else if (EQUIPMENT_DATA.setPerks[id]) parts.push(...EQUIPMENT_DATA.setPerks[id]);
    };
    for (const id of Object.values(worn)) { const it = this.item(id); if (it && !this.cosmetic(it)) push(it.perk); }
    for (const [set, n] of Object.entries(this.setCounts(worn))) {
      for (const t of this.thresholds(set)) if (n >= t) push(EQUIPMENT_DATA.sets[set][t].perk);
    }
    return parts;
  },
  // Adds gear perks into a SkillTree.mods() result (called from there).
  applyMods(c, m) {
    if (!c || !c.player) return m;
    for (const P of this.perkParts(c)) {
      if (P.flag) m.flags[P.flag] = true;
      else if (P.mult !== undefined) m[P.mod] = (m[P.mod] === undefined ? 1 : m[P.mod]) * P.mult;
      else if (P.add !== undefined) m[P.mod] = (m[P.mod] || 0) + P.add;
      else if (P.floor !== undefined) m[P.mod] = Math.max(m[P.mod] || 0, P.floor);
    }
    return m;
  },
  // The compare card: what changes if 'id' goes in its slot.
  // Returns { stats: { stat: diff }, before, after, sets: { set: [before, after] } }.
  compare(c, id) {
    const it = this.item(id), now = this.equipped(c), next = Object.assign({}, now, { [it.slot]: id });
    const before = this.statBonus(c, now), after = this.statBonus(c, next), stats = {};
    for (const s of new Set(Object.keys(before).concat(Object.keys(after)))) {
      const d = (after[s] || 0) - (before[s] || 0);
      if (d) stats[s] = d;
    }
    const a = this.setCounts(now), b = this.setCounts(next), sets = {};
    for (const s of new Set(Object.keys(a).concat(Object.keys(b)))) sets[s] = [a[s] || 0, b[s] || 0];
    return { stats, before, after, sets, current: now[it.slot] };
  },

  // ---- the shop (plan 5.5E): a fixed catalogue, opened by career tier ----
  forSale(it) { return it.src.includes('shop'); },
  price(it) { return it.price || (this.rarity(it).price + EQUIPMENT_DATA.shop.tierStep * (it.tier - 1)); },
  // Every shop item, cheapest tier first, then slot order, then price.
  catalogue() {
    const S = EQUIPMENT_DATA.slots;
    return EQUIPMENT_DATA.items.filter((it) => this.forSale(it))
      .sort((a, z) => a.tier - z.tier || S.indexOf(a.slot) - S.indexOf(z.slot) || this.price(a) - this.price(z) || (a.id < z.id ? -1 : 1));
  },
  // { ok, reason: 'notForSale' | 'owned' | 'tier' | 'coins', params }
  canBuy(c, save, id) {
    const it = this.item(id);
    if (!it || !this.forSale(it)) return { ok: false, reason: 'notForSale' };
    if (this.owns(save, id)) return { ok: false, reason: 'owned' };
    if (it.tier > this.tier(c)) return { ok: false, reason: 'tier', params: { t: it.tier } };
    const coins = (save.currencies && save.currencies.coins) || 0, price = this.price(it);
    if (coins < price) return { ok: false, reason: 'coins', params: { need: price, have: coins } };
    return { ok: true, price };
  },
  buy(c, save, id) {
    const chk = this.canBuy(c, save, id);
    if (!chk.ok) return chk;
    save.currencies.coins -= chk.price;
    this.grant(save, id, 'shop');
    return { ok: true, price: chk.price };
  },

  // ---- match drops and the duplicate rule (plan 12.7, 12.8) ----
  // A picked item from a pool: yours if new; otherwise reroll to one you don't
  // own in the same pool; if the pool is all owned, a fixed Coin reward (or a
  // Legacy Mark for high one-offs). Returns { item, rerolled } or { dup, coins | legacyMarks }.
  resolveDrop(save, pool, pick, rng, src) {
    if (!this.owns(save, pick)) { this.grant(save, pick, src || 'drop'); return { item: pick }; }
    const open = pool.filter((id) => !this.owns(save, id));
    if (open.length) {
      const id = rng.pick(open);
      this.grant(save, id, src || 'drop');
      return { item: id, rerolled: pick };
    }
    save.currencies = save.currencies || {};
    const it = this.item(pick);
    if (it.dupFallback === 'legacyMark') {
      save.currencies.legacyMarks = (save.currencies.legacyMarks || 0) + 1;
      return { dup: pick, legacyMarks: 1 };
    }
    const coins = this.rarity(it).dupCoins;
    save.currencies.coins = (save.currencies.coins || 0) + coins;
    return { dup: pick, coins };
  },
  // After a career match (stageId = the stage the match was in). Uses the
  // career's own seeded stream, so reloading never re-rolls. Returns the drop or null.
  matchDrop(c, save, stageId, fixture, grade, won) {
    const R = EQUIPMENT_DATA.drops, by = R.byStage[stageId];
    if (!by) return null;
    const final = fixture.kind === 'final';
    const pool = R.pools[final ? by.final : by.league];
    if (!pool || !pool.length) return null;
    const p = final ? (won ? R.final.won : R.final.lost) : (R.chanceByGrade[grade] || 0);
    return Career.roll(c, (r) => {
      if (!r.chance(p)) return null;
      const out = this.resolveDrop(save, pool, r.pick(pool), r, final ? 'final' : 'drop');
      out.final = final;
      return out;
    });
  },

  // ---- Legacy (plan 12.8): the signature equipment on the permanent card ----
  legacySnapshot(c) { return Object.assign({}, this.equipped(c)); },
};

// Loads the gear art the first time a gear screen (or the career) opens.
const GearAssets = {
  loaded: false,
  ensure() { if (!this.loaded) { this.loaded = true; Sprites.loadGroup('equipment'); } },
};
