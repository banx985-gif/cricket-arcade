// Cricket Arcade — equipment, shop and collection data (M07, plan 12, 5.5E, 5.10, 5.26).
// Every gear number lives here: slots, rarities, items, perks, set bonuses,
// shop prices, match drops and the duplicate rule. Rules are in game/gear.js.
//
// An item:
//   slot      bat | gloves | pads | shoes | accessory | uniform
//   rarity    common | rare | epic | legendary | mythic      signature: true = the Signature tag
//   tier      the career tier (stage number, 1 = Local) needed to buy or equip it
//   stats     added to the career player's stats (uniforms: none, they're cosmetic)
//   perk      a perk id (perks below)          set: the named line it belongs to
//   src       where it comes from: starter | shop | drop | final (the Local Final)
//             | rival | tournament | evolution | legacy  (the last four are hooks
//             for later milestones: shown in the Collection as hints)
//   art       sprite id (the 'equipment' asset group)
//   price     optional: overrides the rarity price
//
// Plan 12.4 caps: bats 30, gloves 18, pads 18, shoes 18, accessories 16,
// uniforms 12 (112). Every item here has its own art; colour variants can fill
// toward the cap later.

const EQUIPMENT_DATA = {
  version: 1,

  slots: ['bat', 'gloves', 'pads', 'shoes', 'accessory', 'uniform'],
  slotArt: { bat: 'slot_bat', gloves: 'slot_gloves', pads: 'slot_pads', shoes: 'slot_shoes', accessory: 'slot_accessory', uniform: 'slot_uniform' },
  caps: { bat: 30, gloves: 18, pads: 18, shoes: 18, accessory: 16, uniform: 12 },
  // Uniforms are presentation only (plan 12.2A): no stats, not part of sets, and
  // the career team's kit is always worn in matches.
  cosmetic: ['uniform'],

  // ---- rarity (plan 12.1, 12.3) --------------------------------------------------------------
  // price: shop Coins (+ shop.tierStep per tier above 1).  dupCoins: what a
  // duplicate drop turns into once its pool is all owned (plan 12.8).
  rarities: {
    common:    { n: 1, colour: '#c9d0d6', frame: 'frame_common',    price: 90,   dupCoins: 25 },
    rare:      { n: 2, colour: '#46a8ff', frame: 'frame_rare',      price: 240,  dupCoins: 60 },
    epic:      { n: 3, colour: '#b56cff', frame: 'frame_epic',      price: 560,  dupCoins: 140 },
    legendary: { n: 4, colour: '#ffb400', frame: 'frame_legendary', price: 1300, dupCoins: 320 },
    mythic:    { n: 5, colour: '#ff5fd2', frame: 'frame_mythic',    price: 3200, dupCoins: 800 },
  },
  rarityOrder: ['common', 'rare', 'epic', 'legendary', 'mythic'],
  signatureFrame: 'frame_signature',

  // ---- shop (plan 5.5E): a fixed catalogue, opened by career tier ---------------------------------
  // No refreshes, no random pulls. Items with 'shop' in src are for sale.
  shop: { tierStep: 70, art: { sign: 'shop_sign', merchant: 'shop_merchant', merchantPortrait: 'shop_merchant_portrait' } },

  // ---- perks (plan 12.3) ---------------------------------------------------------------------------
  // They ride on the same modifiers as the Wicket Tree (SkillTree.mods):
  //   mult  multiplies a modifier (edge, goodWindow, perfectBand, throwZone, fatigue,
  //         pressure, chasePressure, comboBoost, energy)
  //   add   adds to one (catchBonus, stopBonus, xp, coins, restEnergy, techCharges)
  //   floor Composure never counts below this        flag: switches a keystone effect on
  perks: {
    grip_tape:    { mod: 'edge', mult: 0.94 },                       // fewer edges
    sweet_spot:   { mod: 'goodWindow', mult: 1.05 },                 // bigger Good timing window
    big_hitter:   { mod: 'comboBoost', mult: 1.12 },                 // stacking techniques build faster
    chase_calm:   { mod: 'chasePressure', mult: 0.85 },
    cool_mind:    { mod: 'pressure', mult: 0.92 },
    soft_catch:   { mod: 'catchBonus', add: 0.03 },
    clean_stops:  { mod: 'stopBonus', add: 0.04 },
    rocket_throw: { mod: 'throwZone', mult: 1.08 },
    steady_hands: { mod: 'perfectBand', mult: 1.06 },                // wider gold release band
    stamina:      { mod: 'fatigue', mult: 0.92 },                    // bowling tires you less
    fresh_legs:   { mod: 'energy', mult: 0.92 },                     // career matches / training cost less energy
    scout:        { mod: 'xp', add: 0.05 },
    lucky:        { mod: 'coins', add: 0.1 },
    // Legendary: distinct perks
    iron_will:    { mod: 'composureFloor', floor: 45 },
    crown_strike: { flag: 'boundaryKing' },                          // Power + Good hits go Perfect distance
    // Mythic: build-changing (technique interaction)
    phantom:      { mod: 'techCharges', add: 1 },                    // +1 charge on every trigger technique
  },

  // ---- set bonuses (plan 12.9) -------------------------------------------------------------------------
  // Pieces = every item with that set (bat, gloves, pads, shoes; uniforms never
  // count). Thresholds: 2 pieces small, 3 pieces stronger, full set = the named
  // effect. Each threshold can add stats and / or a perk (perk ids above, or the
  // set's own named perk in setPerks).
  sets: {
    iron_root:     { colour: '#b0835a', 2: { stats: { composure: 2 } }, 3: { stats: { composure: 2, fitness: 2 }, perk: 'cool_mind' }, 4: { stats: { contact: 3 }, perk: 'set_iron_root' } },
    stormwood:     { colour: '#5fb8ff', 2: { stats: { power: 3 } }, 3: { stats: { power: 3 }, perk: 'big_hitter' }, 4: { stats: { power: 3, timing: 2 }, perk: 'set_stormwood' } },
    golden_willow: { colour: '#ffd23f', 2: { stats: { timing: 3 } }, 3: { stats: { contact: 3 }, perk: 'sweet_spot' }, 4: { stats: { timing: 3, placement: 3 }, perk: 'set_golden_willow' } },
    tempest:       { colour: '#7fd6ff', 2: { stats: { delivery: 3 } }, 3: { stats: { accuracy: 3 }, perk: 'stamina' }, 4: { stats: { delivery: 3, control: 3 }, perk: 'set_tempest' } },
    ember_strike:  { colour: '#ff6a2b', 2: { stats: { power: 4 } }, 3: { stats: { running: 3 }, perk: 'big_hitter' }, 4: { stats: { power: 4, delivery: 3 }, perk: 'set_ember_strike' } },
    nightglass:    { colour: '#9b6bff', 2: { stats: { deception: 4 } }, 3: { stats: { movement: 4 }, perk: 'steady_hands' }, 4: { stats: { deception: 4, placement: 3 }, perk: 'set_nightglass' } },
    skybreaker:    { colour: '#6fe0ff', 2: { stats: { placement: 4 } }, 3: { stats: { power: 4 }, perk: 'grip_tape' }, 4: { stats: { power: 4, running: 4 }, perk: 'set_skybreaker' } },
    crown_edge:    { colour: '#ffcf4d', 2: { stats: { composure: 5 } }, 3: { stats: { timing: 4, accuracy: 4 }, perk: 'chase_calm' }, 4: { stats: { composure: 5 }, perk: 'set_crown_edge' } },
    kingmaker:     { colour: '#e0b04a', 2: { stats: { timing: 3, accuracy: 3 } }, 3: { stats: { power: 3, delivery: 3 }, perk: 'lucky' }, 4: { stats: { composure: 4 }, perk: 'set_kingmaker' } },
  },
  // The full-set named effects (a list of perk parts each).
  setPerks: {
    set_iron_root:     [{ mod: 'composureFloor', floor: 45 }, { mod: 'pressure', mult: 0.85 }],                   // Deep Roots
    set_stormwood:     [{ flag: 'boundaryKing' }, { mod: 'comboBoost', mult: 1.15 }],                           // Storm Awakened
    set_golden_willow: [{ mod: 'goodWindow', mult: 1.1 }, { mod: 'edge', mult: 0.9 }],                          // Golden Touch
    set_tempest:       [{ mod: 'perfectBand', mult: 1.12 }, { mod: 'fatigue', mult: 0.85 }],                    // Eye of the Storm
    set_ember_strike:  [{ mod: 'comboBoost', mult: 1.3 }, { mod: 'edge', mult: 0.9 }],                          // Wildfire
    set_nightglass:    [{ flag: 'chokeHold' }, { mod: 'perfectBand', mult: 1.08 }],                             // Midnight Veil
    set_skybreaker:    [{ mod: 'goodWindow', mult: 1.06 }, { mod: 'edge', mult: 0.85 }],                        // Sky's the Limit
    set_crown_edge:    [{ mod: 'composureFloor', floor: 55 }, { mod: 'chasePressure', mult: 0.7 }, { mod: 'xp', add: 0.1 }],   // Crowned
    set_kingmaker:     [{ mod: 'techCharges', add: 1 }, { mod: 'coins', add: 0.2 }],                            // King's Ransom
  },

  // ---- Gear Mastery (the Wicket Tree passive, plan 11.3) ------------------------------------------------
  // Equipped item stats x (1 + this), rounded up. Mastered: x the mastery boost too.
  gearMasteryBoost: 0.3,

  // ---- match drops (plan 12.7, 12.8) ---------------------------------------------------------------------
  // A league match has a chance (by grade) to drop an item from its stage's pool;
  // the Local Final always drops one from its own pool if you win (lost: 'lost' chance).
  // Duplicate rule: reroll to an item you don't own in the same pool; if the
  // whole pool is owned, you get the item's rarity dupCoins instead.
  drops: {
    chanceByGrade: { S: 0.4, A: 0.28, B: 0.18, C: 0.1, D: 0.05 },
    final: { won: 1, lost: 0.4 },
    pools: {
      local: ['bat_local_club', 'bat_balanced', 'acc_cap', 'acc_headband', 'gloves_iron_root', 'shoes_iron_root', 'acc_power_band', 'acc_fielding_charm'],
      localFinal: ['shoes_stormwood', 'acc_sunglasses', 'acc_fielding_charm', 'bat_power_hitter', 'gloves_keeper'],
      regional: ['bat_dry_pitch_specialist', 'gloves_golden_willow', 'pads_tempest', 'acc_pace_charm', 'acc_spin_charm', 'shoes_stormwood'],
      regionalFinal: ['bat_finisher', 'gloves_golden_willow', 'pads_tempest', 'acc_keeper_helmet'],
      // M19 (plan 12.7): drops at every stage; the franchise and world finals give tournament gear
      domestic: ['pads_ember_strike', 'acc_focus_charm', 'gloves_golden_willow', 'pads_tempest', 'bat_dry_pitch_specialist'],
      domesticFinal: ['pads_ember_strike', 'acc_focus_charm', 'bat_premier_pro'],
      franchise: ['pads_nightglass', 'gloves_skybreaker', 'pads_ember_strike', 'acc_focus_charm'],
      franchiseFinal: ['gloves_crown_edge', 'acc_champion_crest'],
      national: ['pads_nightglass', 'gloves_skybreaker', 'acc_clutch_band'],
      nationalFinal: ['gloves_crown_edge', 'pads_crown_edge'],
      international: ['gloves_crown_edge', 'pads_nightglass', 'gloves_skybreaker'],
      internationalFinal: ['gloves_crown_edge', 'acc_champion_crest', 'shoes_crown_edge'],
      world: ['gloves_crown_edge', 'pads_crown_edge', 'acc_crown'],
      worldFinal: ['uniform_national_world_stage', 'acc_champion_crest', 'gloves_crown_edge'],
      elite: ['gloves_crown_edge', 'acc_crown', 'bat_kingmaker'],
      eliteFinal: ['uniform_national_world_stage', 'acc_champion_crest'],
    },
    byStage: { local: { league: 'local', final: 'localFinal' }, regional: { league: 'regional', final: 'regionalFinal' },
      domestic: { league: 'domestic', final: 'domesticFinal' }, franchise: { league: 'franchise', final: 'franchiseFinal' },
      national: { league: 'national', final: 'nationalFinal' }, international: { league: 'international', final: 'internationalFinal' },
      world: { league: 'world', final: 'worldFinal' }, elite: { league: 'elite', final: 'eliteFinal' } },
    // the Legacy Emblem: given when a career that reached this stage retires (src 'legacy')
    legacyItem: { id: 'acc_legacy_emblem', minStage: 6 },
  },

  // ---- evolution (M19, plan 12.6, 22.3, 22.4) ----------------------------------------------------------------
  // An owned item evolves into a stronger form (one rarity up) once it has played enough career matches
  // while worn, the account has the feat (medal: a Gold or better challenge medal; trophy: any career
  // trophy), and you pay Legacy Marks (and Mythic Core for the top step). The old item stays in the Locker;
  // a career wearing it switches to the new one. Numbers are defaults for Aaron to tune.
  evolution: {
    lines: [
      { from: 'bat_stormwood', to: 'bat_stormwood_awakened', matches: 12, lm: 2, mc: 1, feat: 'trophy' },
      { from: 'bat_iron_root', to: 'bat_iron_root_evo', matches: 6, lm: 1 },
      { from: 'bat_golden_willow', to: 'bat_golden_willow_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'bat_tempest', to: 'bat_tempest_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'bat_ember_strike', to: 'bat_ember_strike_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'bat_nightglass', to: 'bat_nightglass_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'bat_skybreaker', to: 'bat_skybreaker_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'bat_crown_edge', to: 'bat_crown_edge_evo', matches: 12, lm: 3, mc: 1, feat: 'trophy' },
      { from: 'bat_kingmaker', to: 'bat_kingmaker_evo', matches: 12, lm: 3, mc: 1, feat: 'trophy' },
      { from: 'bat_premier_pro', to: 'bat_premier_pro_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'gloves_keeper', to: 'gloves_keeper_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'gloves_stormwood', to: 'gloves_stormwood_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'gloves_golden_willow', to: 'gloves_golden_willow_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'gloves_tempest', to: 'gloves_tempest_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'gloves_ember_strike', to: 'gloves_ember_strike_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'gloves_nightglass', to: 'gloves_nightglass_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'gloves_skybreaker', to: 'gloves_skybreaker_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'pads_iron_root', to: 'pads_iron_root_evo', matches: 6, lm: 1 },
      { from: 'pads_stormwood', to: 'pads_stormwood_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'pads_golden_willow', to: 'pads_golden_willow_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'pads_tempest', to: 'pads_tempest_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'pads_ember_strike', to: 'pads_ember_strike_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'pads_nightglass', to: 'pads_nightglass_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'pads_skybreaker', to: 'pads_skybreaker_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'pads_crown_edge', to: 'pads_crown_edge_evo', matches: 12, lm: 3, mc: 1, feat: 'trophy' },
      { from: 'shoes_iron_root', to: 'shoes_iron_root_evo', matches: 6, lm: 1 },
      { from: 'shoes_stormwood', to: 'shoes_stormwood_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'shoes_golden_willow', to: 'shoes_golden_willow_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'shoes_tempest', to: 'shoes_tempest_evo', matches: 8, lm: 1, feat: 'medal' },
      { from: 'shoes_ember_strike', to: 'shoes_ember_strike_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'shoes_nightglass', to: 'shoes_nightglass_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'shoes_skybreaker', to: 'shoes_skybreaker_evo', matches: 10, lm: 2, feat: 'trophy' },
      { from: 'shoes_crown_edge', to: 'shoes_crown_edge_evo', matches: 12, lm: 3, mc: 1, feat: 'trophy' },
      { from: 'acc_cap', to: 'acc_cap_evo', matches: 6, lm: 1 },
    ],
  },

  // ---- the items ------------------------------------------------------------------------------------------
  items: [
    // ===== starter kit (every account owns these) =====
    { id: 'bat_standard',        slot: 'bat',       rarity: 'common', tier: 1, stats: { power: 1, contact: 1 }, src: ['starter'], art: 'gear_bat_standard' },
    { id: 'gloves_standard',     slot: 'gloves',    rarity: 'common', tier: 1, stats: { contact: 1 }, src: ['starter'], art: 'gear_gloves_standard' },
    { id: 'pads_standard',       slot: 'pads',      rarity: 'common', tier: 1, stats: { composure: 1 }, src: ['starter'], art: 'gear_pads_standard' },
    { id: 'shoes_standard',      slot: 'shoes',     rarity: 'common', tier: 1, stats: { running: 1 }, src: ['starter'], art: 'gear_shoes_standard' },
    { id: 'acc_helmet_standard', slot: 'accessory', rarity: 'common', tier: 1, stats: { composure: 1 }, src: ['starter'], art: 'gear_acc_helmet_standard' },
    { id: 'uniform_local_club',  slot: 'uniform',   rarity: 'common', tier: 1, stats: {}, src: ['starter'], art: 'gear_uniform_local_club' },

    // ===== bats =====
    { id: 'bat_local_club',  slot: 'bat', rarity: 'common', tier: 1, stats: { power: 2, contact: 2 }, src: ['shop', 'drop'], art: 'gear_bat_local_club' },
    { id: 'bat_balanced',    slot: 'bat', rarity: 'common', tier: 1, stats: { timing: 2, contact: 1, placement: 1 }, src: ['shop', 'drop'], art: 'gear_bat_balanced' },
    { id: 'bat_power_hitter',slot: 'bat', rarity: 'rare', tier: 1, stats: { power: 5, timing: 2 }, perk: 'big_hitter', src: ['shop', 'final'], art: 'gear_bat_power_hitter' },
    { id: 'bat_technician',  slot: 'bat', rarity: 'rare', tier: 1, stats: { timing: 3, contact: 3, placement: 1 }, perk: 'grip_tape', src: ['shop'], art: 'gear_bat_technician' },
    { id: 'bat_pace_tamer',  slot: 'bat', rarity: 'rare', tier: 2, stats: { timing: 4, contact: 3 }, perk: 'sweet_spot', src: ['shop'], art: 'gear_bat_pace_tamer' },
    { id: 'bat_dry_pitch_specialist', slot: 'bat', rarity: 'rare', tier: 2, stats: { placement: 4, timing: 3 }, perk: 'chase_calm', src: ['drop'], art: 'gear_bat_dry_pitch_specialist' },
    { id: 'bat_finisher',    slot: 'bat', rarity: 'epic', tier: 2, stats: { power: 5, composure: 4, running: 2 }, perk: 'chase_calm', src: ['shop', 'final'], art: 'gear_bat_finisher' },
    { id: 'bat_premier_pro', slot: 'bat', rarity: 'epic', tier: 3, stats: { timing: 4, contact: 4, power: 3 }, perk: 'sweet_spot', src: ['shop'], art: 'gear_bat_premier_pro' },
    { id: 'bat_phantom_grip',slot: 'bat', rarity: 'mythic', signature: true, tier: 7, stats: { timing: 7, contact: 6, placement: 7 }, perk: 'phantom', src: ['rival'], art: 'gear_bat_phantom_grip' },
    { id: 'bat_stormwood_awakened', slot: 'bat', rarity: 'mythic', signature: true, set: 'stormwood', tier: 6, stats: { power: 10, timing: 6, contact: 4 }, perk: 'crown_strike', src: ['evolution'], art: 'gear_bat_stormwood_awakened' },

    // ===== the named lines (sets): bat, gloves, pads, shoes =====
    // Iron Root — common, tier 1: steady and hard to rattle
    { id: 'bat_iron_root',    slot: 'bat',    set: 'iron_root', rarity: 'common', tier: 1, stats: { contact: 2, composure: 2 }, src: ['shop'], art: 'gear_bat_iron_root' },
    { id: 'gloves_iron_root', slot: 'gloves', set: 'iron_root', rarity: 'common', tier: 1, stats: { contact: 2, fielding: 2 }, src: ['shop', 'drop'], art: 'gear_gloves_iron_root' },
    { id: 'pads_iron_root',   slot: 'pads',   set: 'iron_root', rarity: 'common', tier: 1, stats: { composure: 3, fitness: 1 }, src: ['shop'], art: 'gear_pads_iron_root' },
    { id: 'shoes_iron_root',  slot: 'shoes',  set: 'iron_root', rarity: 'common', tier: 1, stats: { fitness: 2, running: 2 }, src: ['shop', 'drop'], art: 'gear_shoes_iron_root' },
    // Stormwood — rare, tier 1: power
    { id: 'bat_stormwood',    slot: 'bat',    set: 'stormwood', rarity: 'rare', tier: 1, stats: { power: 5, timing: 2 }, perk: 'big_hitter', src: ['shop'], art: 'gear_bat_stormwood' },
    { id: 'gloves_stormwood', slot: 'gloves', set: 'stormwood', rarity: 'rare', tier: 1, stats: { power: 3, contact: 3, fielding: 1 }, perk: 'soft_catch', src: ['shop'], art: 'gear_gloves_stormwood' },
    { id: 'pads_stormwood',   slot: 'pads',   set: 'stormwood', rarity: 'rare', tier: 1, stats: { power: 2, composure: 3, fitness: 2 }, src: ['shop'], art: 'gear_pads_stormwood' },
    { id: 'shoes_stormwood',  slot: 'shoes',  set: 'stormwood', rarity: 'rare', tier: 1, stats: { running: 4, power: 3 }, perk: 'stamina', src: ['final', 'drop'], art: 'gear_shoes_stormwood' },
    // Golden Willow — rare, tier 2: timing and touch
    { id: 'bat_golden_willow',    slot: 'bat',    set: 'golden_willow', rarity: 'rare', tier: 2, stats: { timing: 4, contact: 3 }, perk: 'sweet_spot', src: ['shop'], art: 'gear_bat_golden_willow' },
    { id: 'gloves_golden_willow', slot: 'gloves', set: 'golden_willow', rarity: 'rare', tier: 2, stats: { contact: 4, placement: 3 }, src: ['drop'], art: 'gear_gloves_golden_willow' },
    { id: 'pads_golden_willow',   slot: 'pads',   set: 'golden_willow', rarity: 'rare', tier: 2, stats: { composure: 4, timing: 3 }, src: ['shop'], art: 'gear_pads_golden_willow' },
    { id: 'shoes_golden_willow',  slot: 'shoes',  set: 'golden_willow', rarity: 'rare', tier: 2, stats: { running: 4, placement: 3 }, perk: 'fresh_legs', src: ['shop'], art: 'gear_shoes_golden_willow' },
    // Tempest — rare, tier 2: pace bowling
    { id: 'bat_tempest',    slot: 'bat',    set: 'tempest', rarity: 'rare', tier: 2, stats: { timing: 3, power: 2, delivery: 2 }, src: ['shop'], art: 'gear_bat_tempest' },
    { id: 'gloves_tempest', slot: 'gloves', set: 'tempest', rarity: 'rare', tier: 2, stats: { accuracy: 4, control: 3 }, perk: 'steady_hands', src: ['shop'], art: 'gear_gloves_tempest' },
    { id: 'pads_tempest',   slot: 'pads',   set: 'tempest', rarity: 'rare', tier: 2, stats: { fitness: 4, delivery: 3 }, src: ['drop'], art: 'gear_pads_tempest' },
    { id: 'shoes_tempest',  slot: 'shoes',  set: 'tempest', rarity: 'rare', tier: 2, stats: { delivery: 4, fitness: 3 }, perk: 'stamina', src: ['shop'], art: 'gear_shoes_tempest' },
    // Ember Strike — epic, tier 3: all-out attack
    { id: 'bat_ember_strike',    slot: 'bat',    set: 'ember_strike', rarity: 'epic', tier: 3, stats: { power: 7, timing: 4 }, perk: 'big_hitter', src: ['shop'], art: 'gear_bat_ember_strike' },
    { id: 'gloves_ember_strike', slot: 'gloves', set: 'ember_strike', rarity: 'epic', tier: 3, stats: { power: 4, contact: 4, delivery: 3 }, src: ['shop'], art: 'gear_gloves_ember_strike' },
    { id: 'pads_ember_strike',   slot: 'pads',   set: 'ember_strike', rarity: 'epic', tier: 3, stats: { power: 4, composure: 4, fitness: 3 }, perk: 'cool_mind', src: ['drop'], art: 'gear_pads_ember_strike' },
    { id: 'shoes_ember_strike',  slot: 'shoes',  set: 'ember_strike', rarity: 'epic', tier: 3, stats: { running: 5, delivery: 3, power: 3 }, src: ['shop'], art: 'gear_shoes_ember_strike' },
    // Nightglass — epic, tier 4: spin and disguise
    { id: 'bat_nightglass',    slot: 'bat',    set: 'nightglass', rarity: 'epic', tier: 4, stats: { placement: 6, timing: 5 }, perk: 'grip_tape', src: ['shop'], art: 'gear_bat_nightglass' },
    { id: 'gloves_nightglass', slot: 'gloves', set: 'nightglass', rarity: 'epic', tier: 4, stats: { deception: 6, movement: 5 }, perk: 'steady_hands', src: ['shop'], art: 'gear_gloves_nightglass' },
    { id: 'pads_nightglass',   slot: 'pads',   set: 'nightglass', rarity: 'epic', tier: 4, stats: { control: 5, composure: 6 }, src: ['drop'], art: 'gear_pads_nightglass' },
    { id: 'shoes_nightglass',  slot: 'shoes',  set: 'nightglass', rarity: 'epic', tier: 4, stats: { movement: 5, deception: 3, fitness: 3 }, src: ['shop'], art: 'gear_shoes_nightglass' },
    // Skybreaker — epic, tier 4: clearing the ropes
    { id: 'bat_skybreaker',    slot: 'bat',    set: 'skybreaker', rarity: 'epic', tier: 4, stats: { power: 6, placement: 5 }, perk: 'big_hitter', src: ['shop'], art: 'gear_bat_skybreaker' },
    { id: 'gloves_skybreaker', slot: 'gloves', set: 'skybreaker', rarity: 'epic', tier: 4, stats: { contact: 6, power: 5 }, src: ['drop'], art: 'gear_gloves_skybreaker' },
    { id: 'pads_skybreaker',   slot: 'pads',   set: 'skybreaker', rarity: 'epic', tier: 4, stats: { composure: 5, power: 3, fitness: 3 }, src: ['shop'], art: 'gear_pads_skybreaker' },
    { id: 'shoes_skybreaker',  slot: 'shoes',  set: 'skybreaker', rarity: 'epic', tier: 4, stats: { running: 6, power: 5 }, perk: 'fresh_legs', src: ['shop'], art: 'gear_shoes_skybreaker' },
    // Crown Edge — legendary, tier 5: the big-occasion player
    { id: 'bat_crown_edge',    slot: 'bat',    set: 'crown_edge', rarity: 'legendary', tier: 5, stats: { timing: 6, contact: 5, composure: 4 }, perk: 'crown_strike', src: ['shop'], art: 'gear_bat_crown_edge' },
    { id: 'gloves_crown_edge', slot: 'gloves', set: 'crown_edge', rarity: 'legendary', tier: 5, stats: { accuracy: 5, control: 5, contact: 5 }, perk: 'steady_hands', src: ['tournament', 'drop'], art: 'gear_gloves_crown_edge' },
    { id: 'pads_crown_edge',   slot: 'pads',   set: 'crown_edge', rarity: 'legendary', tier: 5, stats: { composure: 8, fitness: 4, control: 3 }, perk: 'iron_will', src: ['shop'], art: 'gear_pads_crown_edge' },
    { id: 'shoes_crown_edge',  slot: 'shoes',  set: 'crown_edge', rarity: 'legendary', tier: 5, stats: { fitness: 5, running: 5, delivery: 5 }, perk: 'fresh_legs', src: ['shop'], art: 'gear_shoes_crown_edge' },
    // Kingmaker — legendary, tier 6: the complete all-rounder
    { id: 'bat_kingmaker',    slot: 'bat',    set: 'kingmaker', rarity: 'legendary', tier: 6, stats: { power: 5, timing: 5, placement: 5 }, perk: 'crown_strike', src: ['shop'], art: 'gear_bat_kingmaker' },
    { id: 'gloves_kingmaker', slot: 'gloves', set: 'kingmaker', rarity: 'legendary', tier: 6, stats: { delivery: 5, accuracy: 5, contact: 5 }, perk: 'soft_catch', src: ['shop'], art: 'gear_gloves_kingmaker' },
    { id: 'pads_kingmaker',   slot: 'pads',   set: 'kingmaker', rarity: 'legendary', tier: 6, stats: { composure: 5, control: 5, fitness: 5 }, perk: 'iron_will', src: ['rival'], art: 'gear_pads_kingmaker' },
    { id: 'shoes_kingmaker',  slot: 'shoes',  set: 'kingmaker', rarity: 'legendary', tier: 6, stats: { running: 5, movement: 5, fielding: 5 }, perk: 'clean_stops', src: ['shop'], art: 'gear_shoes_kingmaker' },

    // ===== gloves (other) =====
    { id: 'gloves_keeper', slot: 'gloves', rarity: 'rare', tier: 1, stats: { fielding: 5, contact: 2 }, perk: 'soft_catch', src: ['shop', 'final'], art: 'gear_gloves_keeper' },

    // ===== accessories =====
    { id: 'acc_cap',            slot: 'accessory', rarity: 'common', tier: 1, stats: { fielding: 2, composure: 2 }, src: ['shop', 'drop'], art: 'gear_acc_cap' },
    { id: 'acc_headband',       slot: 'accessory', rarity: 'common', tier: 1, stats: { fitness: 2, timing: 2 }, src: ['shop', 'drop'], art: 'gear_acc_headband' },
    { id: 'acc_power_band',     slot: 'accessory', rarity: 'rare', tier: 1, stats: { power: 5, running: 2 }, src: ['shop', 'drop'], art: 'gear_acc_power_band' },
    { id: 'acc_sunglasses',     slot: 'accessory', rarity: 'rare', tier: 1, stats: { fielding: 4, timing: 3 }, perk: 'soft_catch', src: ['final'], art: 'gear_acc_sunglasses' },
    { id: 'acc_fielding_charm', slot: 'accessory', rarity: 'rare', tier: 1, stats: { fielding: 5, running: 2 }, perk: 'rocket_throw', src: ['drop', 'final'], art: 'gear_acc_fielding_charm' },
    { id: 'acc_keeper_helmet',  slot: 'accessory', rarity: 'rare', tier: 2, stats: { composure: 4, fielding: 3 }, perk: 'cool_mind', src: ['shop', 'final'], art: 'gear_acc_keeper_helmet' },
    { id: 'acc_pace_charm',     slot: 'accessory', rarity: 'rare', tier: 2, stats: { delivery: 5, fitness: 2 }, perk: 'stamina', src: ['shop', 'drop'], art: 'gear_acc_pace_charm' },
    { id: 'acc_spin_charm',     slot: 'accessory', rarity: 'rare', tier: 2, stats: { movement: 4, deception: 3 }, perk: 'steady_hands', src: ['shop', 'drop'], art: 'gear_acc_spin_charm' },
    { id: 'acc_clutch_band',    slot: 'accessory', rarity: 'epic', tier: 3, stats: { composure: 7, control: 4 }, perk: 'cool_mind', src: ['shop'], art: 'gear_acc_clutch_band' },
    { id: 'acc_focus_charm',    slot: 'accessory', rarity: 'epic', tier: 3, stats: { timing: 6, accuracy: 5 }, perk: 'scout', src: ['drop'], art: 'gear_acc_focus_charm' },
    { id: 'acc_rival_token',    slot: 'accessory', rarity: 'epic', signature: true, tier: 4, stats: { power: 3, timing: 3, delivery: 3, accuracy: 2 }, perk: 'lucky', src: ['rival'], art: 'gear_acc_rival_token' },
    { id: 'acc_champion_crest', slot: 'accessory', rarity: 'legendary', signature: true, tier: 5, stats: { composure: 6, timing: 5, accuracy: 4 }, perk: 'iron_will', src: ['tournament'], art: 'gear_acc_champion_crest' },
    { id: 'acc_crown',          slot: 'accessory', rarity: 'legendary', tier: 6, stats: { composure: 6, power: 5, delivery: 4 }, perk: 'crown_strike', src: ['shop'], art: 'gear_acc_crown' },
    { id: 'acc_legacy_emblem',  slot: 'accessory', rarity: 'mythic', signature: true, tier: 8, stats: { timing: 4, power: 4, delivery: 4, accuracy: 4, composure: 4 }, perk: 'phantom', src: ['legacy'], art: 'gear_acc_legacy_emblem', dupFallback: 'legacyMark' },

    // ===== evolved forms (M19, plan 12.6): one rarity up, stronger, the same art with the evolved glow =====
    { id: 'bat_iron_root_evo', slot: 'bat', set: 'iron_root', rarity: 'rare', evo: true, tier: 1, stats: {contact: 3, composure: 3}, src: ['evolution'], art: 'gear_bat_iron_root' },
    { id: 'bat_golden_willow_evo', slot: 'bat', set: 'golden_willow', rarity: 'epic', evo: true, tier: 2, stats: {timing: 6, contact: 5}, perk: 'sweet_spot', src: ['evolution'], art: 'gear_bat_golden_willow' },
    { id: 'bat_tempest_evo', slot: 'bat', set: 'tempest', rarity: 'epic', evo: true, tier: 2, stats: {timing: 5, power: 3, delivery: 3}, src: ['evolution'], art: 'gear_bat_tempest' },
    { id: 'bat_ember_strike_evo', slot: 'bat', set: 'ember_strike', rarity: 'legendary', evo: true, tier: 3, stats: {power: 10, timing: 6}, perk: 'big_hitter', src: ['evolution'], art: 'gear_bat_ember_strike' },
    { id: 'bat_nightglass_evo', slot: 'bat', set: 'nightglass', rarity: 'legendary', evo: true, tier: 4, stats: {placement: 9, timing: 7}, perk: 'grip_tape', src: ['evolution'], art: 'gear_bat_nightglass' },
    { id: 'bat_skybreaker_evo', slot: 'bat', set: 'skybreaker', rarity: 'legendary', evo: true, tier: 4, stats: {power: 9, placement: 7}, perk: 'big_hitter', src: ['evolution'], art: 'gear_bat_skybreaker' },
    { id: 'bat_crown_edge_evo', slot: 'bat', set: 'crown_edge', rarity: 'mythic', evo: true, tier: 5, stats: {timing: 9, contact: 7, composure: 6}, perk: 'crown_strike', src: ['evolution'], art: 'gear_bat_crown_edge' },
    { id: 'bat_kingmaker_evo', slot: 'bat', set: 'kingmaker', rarity: 'mythic', evo: true, tier: 6, stats: {power: 7, timing: 7, placement: 7}, perk: 'crown_strike', src: ['evolution'], art: 'gear_bat_kingmaker' },
    { id: 'bat_premier_pro_evo', slot: 'bat', rarity: 'legendary', evo: true, tier: 3, stats: {timing: 6, contact: 6, power: 5}, perk: 'sweet_spot', src: ['evolution'], art: 'gear_bat_premier_pro' },
    { id: 'gloves_keeper_evo', slot: 'gloves', rarity: 'epic', evo: true, tier: 1, stats: {fielding: 7, contact: 3}, perk: 'soft_catch', src: ['evolution'], art: 'gear_gloves_keeper' },
    { id: 'gloves_stormwood_evo', slot: 'gloves', set: 'stormwood', rarity: 'epic', evo: true, tier: 1, stats: {power: 5, contact: 5, fielding: 2}, perk: 'soft_catch', src: ['evolution'], art: 'gear_gloves_stormwood' },
    { id: 'gloves_golden_willow_evo', slot: 'gloves', set: 'golden_willow', rarity: 'epic', evo: true, tier: 2, stats: {contact: 6, placement: 5}, src: ['evolution'], art: 'gear_gloves_golden_willow' },
    { id: 'gloves_tempest_evo', slot: 'gloves', set: 'tempest', rarity: 'epic', evo: true, tier: 2, stats: {accuracy: 6, control: 5}, perk: 'steady_hands', src: ['evolution'], art: 'gear_gloves_tempest' },
    { id: 'gloves_ember_strike_evo', slot: 'gloves', set: 'ember_strike', rarity: 'legendary', evo: true, tier: 3, stats: {power: 6, contact: 6, delivery: 5}, src: ['evolution'], art: 'gear_gloves_ember_strike' },
    { id: 'gloves_nightglass_evo', slot: 'gloves', set: 'nightglass', rarity: 'legendary', evo: true, tier: 4, stats: {deception: 9, movement: 7}, perk: 'steady_hands', src: ['evolution'], art: 'gear_gloves_nightglass' },
    { id: 'gloves_skybreaker_evo', slot: 'gloves', set: 'skybreaker', rarity: 'legendary', evo: true, tier: 4, stats: {contact: 9, power: 7}, src: ['evolution'], art: 'gear_gloves_skybreaker' },
    { id: 'pads_iron_root_evo', slot: 'pads', set: 'iron_root', rarity: 'rare', evo: true, tier: 1, stats: {composure: 5, fitness: 2}, src: ['evolution'], art: 'gear_pads_iron_root' },
    { id: 'pads_stormwood_evo', slot: 'pads', set: 'stormwood', rarity: 'epic', evo: true, tier: 1, stats: {power: 3, composure: 5, fitness: 3}, src: ['evolution'], art: 'gear_pads_stormwood' },
    { id: 'pads_golden_willow_evo', slot: 'pads', set: 'golden_willow', rarity: 'epic', evo: true, tier: 2, stats: {composure: 6, timing: 5}, src: ['evolution'], art: 'gear_pads_golden_willow' },
    { id: 'pads_tempest_evo', slot: 'pads', set: 'tempest', rarity: 'epic', evo: true, tier: 2, stats: {fitness: 6, delivery: 5}, src: ['evolution'], art: 'gear_pads_tempest' },
    { id: 'pads_ember_strike_evo', slot: 'pads', set: 'ember_strike', rarity: 'legendary', evo: true, tier: 3, stats: {power: 6, composure: 6, fitness: 5}, perk: 'cool_mind', src: ['evolution'], art: 'gear_pads_ember_strike' },
    { id: 'pads_nightglass_evo', slot: 'pads', set: 'nightglass', rarity: 'legendary', evo: true, tier: 4, stats: {control: 7, composure: 9}, src: ['evolution'], art: 'gear_pads_nightglass' },
    { id: 'pads_skybreaker_evo', slot: 'pads', set: 'skybreaker', rarity: 'legendary', evo: true, tier: 4, stats: {composure: 7, power: 5, fitness: 5}, src: ['evolution'], art: 'gear_pads_skybreaker' },
    { id: 'pads_crown_edge_evo', slot: 'pads', set: 'crown_edge', rarity: 'mythic', evo: true, tier: 5, stats: {composure: 12, fitness: 6, control: 5}, perk: 'iron_will', src: ['evolution'], art: 'gear_pads_crown_edge' },
    { id: 'shoes_iron_root_evo', slot: 'shoes', set: 'iron_root', rarity: 'rare', evo: true, tier: 1, stats: {fitness: 3, running: 3}, src: ['evolution'], art: 'gear_shoes_iron_root' },
    { id: 'shoes_stormwood_evo', slot: 'shoes', set: 'stormwood', rarity: 'epic', evo: true, tier: 1, stats: {running: 6, power: 5}, perk: 'stamina', src: ['evolution'], art: 'gear_shoes_stormwood' },
    { id: 'shoes_golden_willow_evo', slot: 'shoes', set: 'golden_willow', rarity: 'epic', evo: true, tier: 2, stats: {running: 6, placement: 5}, perk: 'fresh_legs', src: ['evolution'], art: 'gear_shoes_golden_willow' },
    { id: 'shoes_tempest_evo', slot: 'shoes', set: 'tempest', rarity: 'epic', evo: true, tier: 2, stats: {delivery: 6, fitness: 5}, perk: 'stamina', src: ['evolution'], art: 'gear_shoes_tempest' },
    { id: 'shoes_ember_strike_evo', slot: 'shoes', set: 'ember_strike', rarity: 'legendary', evo: true, tier: 3, stats: {running: 7, delivery: 5, power: 5}, src: ['evolution'], art: 'gear_shoes_ember_strike' },
    { id: 'shoes_nightglass_evo', slot: 'shoes', set: 'nightglass', rarity: 'legendary', evo: true, tier: 4, stats: {movement: 7, deception: 5, fitness: 5}, src: ['evolution'], art: 'gear_shoes_nightglass' },
    { id: 'shoes_skybreaker_evo', slot: 'shoes', set: 'skybreaker', rarity: 'legendary', evo: true, tier: 4, stats: {running: 9, power: 7}, perk: 'fresh_legs', src: ['evolution'], art: 'gear_shoes_skybreaker' },
    { id: 'shoes_crown_edge_evo', slot: 'shoes', set: 'crown_edge', rarity: 'mythic', evo: true, tier: 5, stats: {fitness: 7, running: 7, delivery: 7}, perk: 'fresh_legs', src: ['evolution'], art: 'gear_shoes_crown_edge' },
    { id: 'acc_cap_evo', slot: 'accessory', rarity: 'rare', evo: true, tier: 1, stats: {fielding: 3, composure: 3}, src: ['evolution'], art: 'gear_acc_cap' },

    // ===== uniforms (cosmetic, plan 12.2A) =====
    { id: 'uniform_regional',             slot: 'uniform', rarity: 'rare', tier: 2, stats: {}, src: ['shop'], art: 'gear_uniform_regional' },
    { id: 'uniform_premier_domestic',     slot: 'uniform', rarity: 'rare', tier: 3, stats: {}, src: ['shop'], art: 'gear_uniform_premier_domestic' },
    { id: 'uniform_global_franchise',     slot: 'uniform', rarity: 'epic', tier: 4, stats: {}, src: ['shop'], art: 'gear_uniform_global_franchise' },
    { id: 'uniform_national_world_stage', slot: 'uniform', rarity: 'legendary', tier: 6, stats: {}, src: ['tournament'], art: 'gear_uniform_national_world_stage' },
    { id: 'uniform_legends_elite',        slot: 'uniform', rarity: 'mythic', tier: 8, stats: {}, src: ['legacy'], art: 'gear_uniform_legends_elite' },
  ],
};
