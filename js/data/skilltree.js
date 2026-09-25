// Cricket Arcade — The Wicket Tree (M06, docs/SKILL_TREE_v1.md, plan 11).
// Every node, cost, gate and bonus lives here. Three branches grow out of the
// stumps (Batting left, Mind & Body middle, Bowling right); the bails on top
// are the capstone, Legend's Bails.
//
// Node types:
//   minor      small round perk, always on, 3 ranks, 1 point a rank
//   technique  unlocks one of the 36 techniques for the loadout (plan 11)
//   keystone   tier 4, pick ONE of the branch's pair (the other locks)
//   capstone   Legend's Bails: needs tier 4 reached in any 2 branches
//
// Points are the career's Skill Tokens (CAREER_DATA.levels: 1 a level, 2 a
// promotion) + perRivalWin below once rivals exist.

const SKILL_TREE_DATA = {
  version: 1,

  // ---- points and gates --------------------------------------------------------
  points: { perRivalWin: 1 },                 // (levels and promotions: CAREER_DATA.levels)
  branches: ['batting', 'mindbody', 'bowling'],
  // Points spent in a branch that open each tier (tier 1 is always open).
  tierGates: [0, 5, 12, 20],
  costs: {
    minor: 1,                                 // per rank
    technique: { 1: 2, 2: 2, 3: 3, 4: 3 },
    keystone: 5,
    capstone: 6,
  },
  minorRanks: 3,
  capstone: { branchesAtTier4: 2 },

  // ---- role rules ------------------------------------------------------------------
  // free: a point that can only be spent in that branch. cap: highest tier allowed.
  roles: {
    batter:     { free: { batting: 1 }, cap: { bowling: 2 } },
    bowler:     { free: { bowling: 1 }, cap: { batting: 2 } },
    allrounder: { free: {}, cap: {} },
  },
  // Archetype (plan 8.2) -> one starting rank of a minor perk in its branch.
  archetypeStart: {
    powerHitter: 'perk_clean_strike', technician: 'perk_sharp_eye', finisher: 'perk_cool_head',
    paceStrike: 'perk_pace_kick', swingSeam: 'perk_extra_rip', spinWizard: 'perk_disguise',
    battingAllRounder: 'perk_gap_finder', bowlingAllRounder: 'perk_true_line', balanced: 'perk_safe_hands',
  },

  // ---- respec (at the Coach / on the tree, between stages) -----------------------------
  respec: { baseCoins: 150, stepCoins: 100 },   // 150, 250, 350 …

  // ---- loadout (plan 11) --------------------------------------------------------------
  loadout: { active: 2, passive: 2 },

  // ---- technique mastery (plan 11.4) ----------------------------------------------------
  // Uses (times the technique actually fired in a match) to reach each level.
  mastery: { skilled: 8, mastered: 20, masteredBoost: 1.25 },   // mastered: effect x this

  // ---- Legend's Bails (the capstone) ---------------------------------------------------------
  legend: { usesPerMatch: 1 },

  // ---- Coins from career matches (so a respec can be paid for) --------------------------------
  // A stopgap until the full economy (plan 22.1) arrives.
  coinsFromGrade: { S: 60, A: 45, B: 35, C: 25, D: 15 },

  // ---- the nodes -------------------------------------------------------------------------
  // effect (minor): stat = +per rank to that stat; or a named modifier per rank.
  // tech: the technique id (TECHNIQUES below).  pair: the other keystone.
  nodes: [
    // ===== Batting (gold, left stump) =====
    { id: 'perk_clean_strike',  branch: 'batting', tier: 1, type: 'minor', effect: { stat: 'power', per: 2 } },
    { id: 'perk_sharp_eye',     branch: 'batting', tier: 1, type: 'minor', effect: { mod: 'goodWindow', per: 0.05 } },
    { id: 'tech_perfect_window',     branch: 'batting', tier: 1, type: 'technique', tech: 'perfect_window' },
    { id: 'tech_anchor',             branch: 'batting', tier: 1, type: 'technique', tech: 'anchor' },
    { id: 'tech_cover_drive_mastery',branch: 'batting', tier: 1, type: 'technique', tech: 'cover_drive_mastery' },
    { id: 'perk_soft_hands',    branch: 'batting', tier: 2, type: 'minor', effect: { mod: 'edge', per: -0.06 } },
    { id: 'perk_gap_finder',    branch: 'batting', tier: 2, type: 'minor', effect: { stat: 'placement', per: 2 } },
    { id: 'tech_pull_specialist',    branch: 'batting', tier: 2, type: 'technique', tech: 'pull_specialist' },
    { id: 'tech_sweep_specialist',   branch: 'batting', tier: 2, type: 'technique', tech: 'sweep_specialist' },
    { id: 'tech_late_cut_mastery',   branch: 'batting', tier: 2, type: 'technique', tech: 'late_cut_mastery' },
    { id: 'tech_fast_hands',         branch: 'batting', tier: 2, type: 'technique', tech: 'fast_hands' },
    { id: 'perk_quick_singles', branch: 'batting', tier: 3, type: 'minor', effect: { stat: 'running', per: 2 } },
    { id: 'perk_cool_head',     branch: 'batting', tier: 3, type: 'minor', effect: { mod: 'chasePressure', per: -0.12 } },
    { id: 'tech_power_surge',        branch: 'batting', tier: 3, type: 'technique', tech: 'power_surge' },
    { id: 'tech_counter_spin',       branch: 'batting', tier: 3, type: 'technique', tech: 'counter_spin' },
    { id: 'tech_boundary_hunter',    branch: 'batting', tier: 3, type: 'technique', tech: 'boundary_hunter' },
    { id: 'tech_finisher',           branch: 'batting', tier: 3, type: 'technique', tech: 'finisher' },
    { id: 'tech_last_stand',         branch: 'batting', tier: 4, type: 'technique', tech: 'last_stand' },
    { id: 'keystone_boundary_king',  branch: 'batting', tier: 4, type: 'keystone', pair: 'keystone_unbreakable', effect: { flag: 'boundaryKing' } },
    { id: 'keystone_unbreakable',    branch: 'batting', tier: 4, type: 'keystone', pair: 'keystone_boundary_king', effect: { flag: 'unbreakable' } },

    // ===== Mind & Body (green, middle stump) =====
    { id: 'perk_safe_hands',    branch: 'mindbody', tier: 1, type: 'minor', effect: { mod: 'catchBonus', per: 0.03 } },
    { id: 'perk_study_tape',    branch: 'mindbody', tier: 1, type: 'minor', effect: { mod: 'xp', per: 0.05 } },
    { id: 'tech_quick_starter',      branch: 'mindbody', tier: 1, type: 'technique', tech: 'quick_starter' },
    { id: 'tech_fitness_freak',      branch: 'mindbody', tier: 1, type: 'technique', tech: 'fitness_freak' },
    { id: 'tech_fast_learner',       branch: 'mindbody', tier: 1, type: 'technique', tech: 'fast_learner' },
    { id: 'perk_recovery',      branch: 'mindbody', tier: 2, type: 'minor', effect: { mod: 'restEnergy', per: 5 } },
    { id: 'perk_rocket_arm',    branch: 'mindbody', tier: 2, type: 'minor', effect: { mod: 'throwZone', per: 0.08 } },
    { id: 'tech_iron_focus',         branch: 'mindbody', tier: 2, type: 'technique', tech: 'iron_focus' },
    { id: 'tech_pressure_proof',     branch: 'mindbody', tier: 2, type: 'technique', tech: 'pressure_proof' },
    { id: 'tech_crowd_favourite',    branch: 'mindbody', tier: 2, type: 'technique', tech: 'crowd_favourite' },
    { id: 'tech_field_general',      branch: 'mindbody', tier: 2, type: 'technique', tech: 'field_general' },
    { id: 'perk_crowd_energy',  branch: 'mindbody', tier: 3, type: 'minor', effect: { mod: 'comboBoost', per: 0.15 } },
    { id: 'perk_steel_nerve',   branch: 'mindbody', tier: 3, type: 'minor', effect: { mod: 'composureFloor', base: 35, per: 5 } },
    { id: 'tech_comeback_specialist',branch: 'mindbody', tier: 3, type: 'technique', tech: 'comeback_specialist' },
    { id: 'tech_gear_mastery',       branch: 'mindbody', tier: 3, type: 'technique', tech: 'gear_mastery' },
    { id: 'tech_tournament_player',  branch: 'mindbody', tier: 3, type: 'technique', tech: 'tournament_player' },
    { id: 'tech_treasure_sense',     branch: 'mindbody', tier: 3, type: 'technique', tech: 'treasure_sense' },
    { id: 'tech_rival_slayer',       branch: 'mindbody', tier: 4, type: 'technique', tech: 'rival_slayer' },
    { id: 'keystone_big_stage',      branch: 'mindbody', tier: 4, type: 'keystone', pair: 'keystone_iron_engine', effect: { flag: 'bigStage' } },
    { id: 'keystone_iron_engine',    branch: 'mindbody', tier: 4, type: 'keystone', pair: 'keystone_big_stage', effect: { flag: 'ironEngine' } },

    // ===== Bowling (crimson, right stump) =====
    { id: 'perk_pace_kick',     branch: 'bowling', tier: 1, type: 'minor', effect: { stat: 'delivery', per: 2 } },
    { id: 'perk_extra_rip',     branch: 'bowling', tier: 1, type: 'minor', effect: { stat: 'movement', per: 2 } },
    { id: 'tech_deadeye_yorker',     branch: 'bowling', tier: 1, type: 'technique', tech: 'deadeye_yorker' },
    { id: 'tech_pressure_builder',   branch: 'bowling', tier: 1, type: 'technique', tech: 'pressure_builder' },
    { id: 'tech_bouncer_trap',       branch: 'bowling', tier: 1, type: 'technique', tech: 'bouncer_trap' },
    { id: 'perk_steady_runup',  branch: 'bowling', tier: 2, type: 'minor', effect: { mod: 'perfectBand', per: 0.06 } },
    { id: 'perk_true_line',     branch: 'bowling', tier: 2, type: 'minor', effect: { stat: 'accuracy', per: 2 } },
    { id: 'tech_late_swing',         branch: 'bowling', tier: 2, type: 'technique', tech: 'late_swing' },
    { id: 'tech_spin_burst',         branch: 'bowling', tier: 2, type: 'technique', tech: 'spin_burst' },
    { id: 'tech_heavy_ball',         branch: 'bowling', tier: 2, type: 'technique', tech: 'heavy_ball' },
    { id: 'tech_wicket_hunter',      branch: 'bowling', tier: 2, type: 'technique', tech: 'wicket_hunter' },
    { id: 'perk_disguise',      branch: 'bowling', tier: 3, type: 'minor', effect: { stat: 'deception', per: 2 } },
    { id: 'perk_long_spell',    branch: 'bowling', tier: 3, type: 'minor', effect: { mod: 'fatigue', per: -0.08 } },
    { id: 'tech_heat_ball',          branch: 'bowling', tier: 3, type: 'technique', tech: 'heat_ball' },
    { id: 'tech_googly_mastery',     branch: 'bowling', tier: 3, type: 'technique', tech: 'googly_mastery' },
    { id: 'tech_reverse_break',      branch: 'bowling', tier: 3, type: 'technique', tech: 'reverse_break' },
    { id: 'tech_closer',             branch: 'bowling', tier: 3, type: 'technique', tech: 'closer' },
    { id: 'tech_unplayable',         branch: 'bowling', tier: 4, type: 'technique', tech: 'unplayable' },
    { id: 'keystone_strike_force',   branch: 'bowling', tier: 4, type: 'keystone', pair: 'keystone_choke_hold', effect: { flag: 'strikeForce' } },
    { id: 'keystone_choke_hold',     branch: 'bowling', tier: 4, type: 'keystone', pair: 'keystone_strike_force', effect: { flag: 'chokeHold' } },

    // ===== The bails =====
    { id: 'capstone_legends_bails',  branch: 'bails', tier: 5, type: 'capstone', effect: { flag: 'legend' } },
  ],

  // ---- keystone numbers ---------------------------------------------------------------------
  keystones: {
    boundaryKing: {},                                 // Power + Good = Perfect distance
    unbreakable: {},                                  // first edge each innings stays on the ground
    strikeForce: { deception: 25 },                   // next ball after your wicket
    chokeHold: { perTwoDots: 0.07, max: 0.35 },       // AI timing spread up, per 2 dots in a row
    bigStage: { composure: 5, control: 5 },           // finals, qualifiers (knockouts)
    ironEngine: { energy: 0.75, formDropSave: 0.5 },  // energy costs x; chance a form drop is ignored
  },

  // ---- the 36 techniques (plan 11.1–11.3) ------------------------------------------------------
  // kind: bat | bowl | passive.   mode: trigger = the TECHNIQUE button (charges a
  // match); always = on whenever it's equipped and its moment comes.
  // icon: the existing trait art (game/assets/traits/).
  techniques: {
    // ---- batting ----
    perfect_window:     { kind: 'bat', mode: 'trigger', charges: 3, icon: 'trait_perfect_window', perfect: 1.7 },
    anchor:             { kind: 'bat', mode: 'always', icon: 'trait_anchor', perStack: { composure: 4, window: 0.03 }, maxStacks: 5 },
    cover_drive_mastery:{ kind: 'bat', mode: 'always', icon: 'trait_cover_drive_mastery', dir: [15, 70], power: 1.12, jitter: 0.5 },
    pull_specialist:    { kind: 'bat', mode: 'always', icon: 'trait_pull_specialist', lengths: ['short'], power: 1.15, window: 1.15 },
    sweep_specialist:   { kind: 'bat', mode: 'always', icon: 'trait_sweep_specialist', dir: [-120, -15], power: 1.15, edge: 0.6 },
    late_cut_mastery:   { kind: 'bat', mode: 'always', icon: 'trait_late_cut_mastery', turn: 32, edge: 0.4 },
    fast_hands:         { kind: 'bat', mode: 'always', icon: 'trait_fast_hands', kmh: 128, window: 1.14 },
    power_surge:        { kind: 'bat', mode: 'trigger', charges: 2, icon: 'trait_power_surge', power: 1.3 },
    counter_spin:       { kind: 'bat', mode: 'always', icon: 'trait_counter_spin', window: 1.1, edge: 0.75 },
    boundary_hunter:    { kind: 'bat', mode: 'always', icon: 'trait_boundary_hunter', perStack: 0.07, maxStacks: 3 },
    finisher:           { kind: 'bat', mode: 'always', icon: 'trait_finisher', reqRate: 8, window: 1.12, power: 1.08 },
    last_stand:         { kind: 'bat', mode: 'trigger', charges: 1, icon: 'trait_last_stand', window: 2.2, when: { ballsLeft: 12, wicketsLeft: 3 } },
    // ---- bowling ----
    deadeye_yorker:     { kind: 'bowl', mode: 'trigger', charges: 3, icon: 'trait_deadeye_yorker', scatter: 0.25, yorkerThreat: 1.3 },
    pressure_builder:   { kind: 'bowl', mode: 'always', icon: 'trait_pressure_builder', perStack: { sigma: 0.05, band: 0.04 }, maxStacks: 4 },
    bouncer_trap:       { kind: 'bowl', mode: 'always', icon: 'trait_bouncer_trap', lengths: ['short'], threat: 1.3, sigma: 1.15 },
    late_swing:         { kind: 'bowl', mode: 'always', icon: 'trait_late_swing', swing: 1.3, turn: 1.12, sigma: 1.08 },
    spin_burst:         { kind: 'bowl', mode: 'trigger', charges: 2, icon: 'trait_spin_burst', turn: 1.6, move: 1.35 },
    heavy_ball:         { kind: 'bowl', mode: 'always', icon: 'trait_heavy_ball', power: 0.86 },
    wicket_hunter:      { kind: 'bowl', mode: 'always', icon: 'trait_wicket_hunter', balls: 3, sigma: 1.2 },
    heat_ball:          { kind: 'bowl', mode: 'trigger', charges: 2, icon: 'trait_heat_ball', speed: 1.12, sigma: 1.15 },
    googly_mastery:     { kind: 'bowl', mode: 'always', icon: 'trait_googly_mastery', read: 1.35, sigma: 1.1 },
    reverse_break:      { kind: 'bowl', mode: 'trigger', charges: 2, icon: 'trait_reverse_break', sigma: 1.25 },
    closer:             { kind: 'bowl', mode: 'always', icon: 'trait_closer_technique', ballsLeft: 12, band: 1.15, sigma: 1.1 },
    unplayable:         { kind: 'bowl', mode: 'trigger', charges: 1, icon: 'trait_unplayable', sigma: 1.8, threat: 1.5 },
    // ---- passives (Mind & Body) ----
    quick_starter:      { kind: 'passive', icon: 'trait_quick_starter', balls: 6, stats: { timing: 8, accuracy: 8, control: 4 } },
    fitness_freak:      { kind: 'passive', icon: 'trait_fitness_freak', fatigue: 0.7, energy: 5 },
    fast_learner:       { kind: 'passive', icon: 'trait_fast_learner', xp: 0.15 },
    iron_focus:         { kind: 'passive', icon: 'trait_iron_focus', ballsLeft: 12, stats: { timing: 6, control: 6 } },
    pressure_proof:     { kind: 'passive', icon: 'trait_pressure_proof', pressure: 0.5 },
    crowd_favourite:    { kind: 'passive', icon: 'trait_crowd_favourite', perMoment: 2, max: 6 },
    field_general:      { kind: 'passive', icon: 'trait_field_general', catchBonus: 0.06, stopBonus: 0.06 },
    comeback_specialist:{ kind: 'passive', icon: 'trait_comeback_specialist', reqRate: 10, defend: 6, stats: { timing: 6, power: 4, accuracy: 6, deception: 4 } },
    gear_mastery:       { kind: 'passive', icon: 'trait_gear_mastery', stats: { power: 3, timing: 3, delivery: 3, accuracy: 3 } },
    tournament_player:  { kind: 'passive', icon: 'trait_tournament_player', stats: 5 },
    treasure_sense:     { kind: 'passive', icon: 'trait_treasure_sense', coins: 0.5 },
    rival_slayer:       { kind: 'passive', icon: 'trait_rival_slayer', stats: 4 },
  },

  // ---- art ids (batch B13). Until the art is filed these draw as code placeholders. ----
  art: {
    bg: 'tree_bg',
    node: { locked: 'node_locked', available: 'node_available', unlocked: 'node_unlocked', mastered: 'node_mastered', keystone: 'node_keystone' },
    perkPip: 'perk_pip',
    branch: { batting: 'branch_batting', mindbody: 'branch_mindbody', bowling: 'branch_bowling' },
    token: 'icon_skill_token', respec: 'icon_respec', legend: 'icon_legend_bails',
  },
  colours: { batting: '#ffc53d', mindbody: '#5fe08a', bowling: '#ff5a6e', bails: '#ffe28a' },

  // ---- the tree picture: where nodes sit (tree space, drawn by TreeScene) ------------------------
  layout: {
    size: { w: 2700, h: 1900 },
    branchX: { batting: -760, mindbody: 0, bowling: 760 },
    lean: { batting: -70, mindbody: 0, bowling: 70 },    // each tier leans out this much more
    tierY: [1300, 980, 660, 340],                         // tier 1..4 (techniques row)
    perkRow: 150,                                         // perks sit this far below their tier's techniques
    techGap: 170, perkGap: 150,
    capstoneY: 115,
    trunkTop: 1660, groundY: 1820,
    radius: { technique: 62, minor: 36, keystone: 74, capstone: 90 },
  },
};
