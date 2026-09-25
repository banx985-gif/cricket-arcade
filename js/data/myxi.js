// Cricket Arcade — My XI, the dream-team mode (M10, plan 15, 5.5F, 5.5G). Rules in game/myxi.js.
// Every My XI number lives here.

const MYXI_DATA = {
  version: 1,
  squadMax: 15,                                  // the Active Squad (plan 15.3)
  // ---- club creation (plan 15.1, 5.5F) ----
  crest: {
    shields: ['shield_classic', 'shield_kite', 'shield_round', 'shield_hexagon', 'shield_banner', 'shield_star'],
    emblems: ['emblem_lion', 'emblem_eagle', 'emblem_tiger', 'emblem_wolf', 'emblem_bull', 'emblem_falcon',
      'emblem_crossed_bats', 'emblem_stumps_ball', 'emblem_rising_sun', 'emblem_lightning', 'emblem_oak', 'emblem_anchor'],
    badges: ['myxi_shield_round', 'myxi_shield_angular', 'myxi_emblem_crown_ball', 'myxi_emblem_crossed_bats'],   // ready-made My XI badges
  },
  colours: ['#c8202f', '#1d4ed8', '#1f8a4c', '#e8b21c', '#6a3ab8', '#f07a1a', '#139a9a', '#16325c', '#1b1b1b', '#f2f2f2', '#7a1f2b', '#56b4f0'],
  // Home stadiums: 'local_oval' from the start; the rest are My XI rewards.
  stadiums: [
    { id: 'local_oval', art: 'myxi_stadium_local_oval', start: true },
    { id: 'coastal_ground', art: 'myxi_stadium_coastal_ground' },
    { id: 'city_arena', art: 'myxi_stadium_city_arena' },
    { id: 'desert_stadium', art: 'myxi_stadium_desert_stadium' },
    { id: 'world_championship_stadium', art: 'myxi_stadium_world_championship_stadium' },
    { id: 'legends_arena', art: 'myxi_stadium_legends_arena' },
  ],

  // ---- the 14 starter players (plan 15.2) ----
  // Generated from the origin name packs (Teams.generate), low/mid rated. With the
  // first Legacy Player they make a legal 15: a keeper, enough bowlers, batting cover.
  starters: { rating: 50, reserveRating: 47 },

  // ---- rival recruits (plan 14.3, 15.6): fixed authored players, once each ----
  // role: bat | bowl | all · base: every stat starts here · boost: these stats +
  // the rival's boost · tech: their signature technique · tags: for chemistry.
  rivalRecruits: {
    prodigy:    { role: 'all',  family: 'fast',    base: 66, boost: 10, stats: ['timing', 'power', 'delivery', 'accuracy'], tech: 'quick_starter', tags: ['top'] },
    wall:       { role: 'bat',  family: null,      base: 64, boost: 16, stats: ['contact', 'composure', 'placement'], tech: 'anchor', tags: ['opener'] },
    finisher:   { role: 'bat',  family: null,      base: 66, boost: 14, stats: ['power', 'composure', 'running'], tech: 'finisher', tags: ['finisher'] },
    cannon:     { role: 'bowl', family: 'fast',    base: 64, boost: 18, stats: ['delivery', 'accuracy', 'fitness'], tech: 'heat_ball', tags: ['newball'] },
    technician: { role: 'bat',  family: null,      base: 68, boost: 14, stats: ['placement', 'timing', 'contact'], tech: 'cover_drive_mastery', tags: ['opener'] },
    magician:   { role: 'bowl', family: 'legspin', base: 68, boost: 16, stats: ['deception', 'movement', 'control'], tech: 'googly_mastery', tags: [] },
    veteran:    { role: 'bat',  family: null,      base: 70, boost: 14, stats: ['composure', 'contact', 'timing'], tech: 'iron_focus', tags: ['top'] },
    giant:      { role: 'bat',  family: null,      base: 70, boost: 18, stats: ['power', 'running', 'fitness'], tech: 'power_surge', tags: ['finisher'] },
    trickster:  { role: 'bowl', family: 'swing',   base: 70, boost: 16, stats: ['deception', 'delivery', 'movement'], tech: 'reverse_break', tags: ['newball'] },
    captain:    { role: 'all',  family: 'offspin', base: 72, boost: 12, stats: ['composure', 'timing', 'accuracy', 'control'], tech: 'field_general', tags: ['top'] },
    phantom:    { role: 'all',  family: 'legspin', base: 76, boost: 12, stats: ['timing', 'power', 'deception', 'delivery'], tech: 'last_stand', tags: ['finisher'] },
    champion:   { role: 'all',  family: 'fast',    base: 78, boost: 12, stats: ['timing', 'power', 'placement', 'delivery', 'accuracy'], tech: 'unplayable', tags: ['top', 'finisher'] },
  },
  // Deterministic competition reward recruits (plan 15.6): fill essential roles early.
  rewardRecruits: {
    utility_keeper:  { name: 'Sam Keeley',    role: 'bat',  keeper: true, family: null,      base: 60, boost: 8, stats: ['fielding', 'contact'], tags: ['top'], origin: 'england' },
    spin_specialist: { name: 'Ravi Tandon',   role: 'bowl', family: 'offspin', base: 64, boost: 8, stats: ['movement', 'deception'], tags: [], origin: 'india' },
    pace_spearhead:  { name: 'Jaxon Reid',    role: 'bowl', family: 'fast',    base: 68, boost: 8, stats: ['delivery', 'accuracy'], tags: ['newball'], origin: 'australia' },
    engine_room:     { name: 'Kofi Mensah',   role: 'all',  family: 'swing',   base: 72, boost: 6, stats: ['timing', 'accuracy', 'fitness'], tags: [], origin: 'westindies' },
    death_hitter:    { name: 'Arjun Vale',    role: 'bat',  family: null,      base: 76, boost: 8, stats: ['power', 'composure'], tags: ['finisher'], origin: 'srilanka' },
  },

  // ---- the lineup (plan 15.7) ----
  // Power hitter and closer: a small boost for their job.
  roles: { powerHitter: { power: 4, timing: 2 }, closer: { accuracy: 4, control: 3 } },
  // Bowlers needed for a format: overs / maxOvers per bowler (rounded up).

  // ---- chemistry (plan 15.11): up to 2 active, in this order of priority ----
  // need: how many players qualify · who: which players get the bonus.
  chemistry: [
    { id: 'opening_partnership', icon: 'chem_opening_partnership', need: 2, stats: { timing: 3, contact: 3 } },
    { id: 'new_ball_attack',     icon: 'chem_new_ball_attack',     need: 2, stats: { delivery: 3, accuracy: 3 } },
    { id: 'spin_twin',           icon: 'chem_spin_twin',           need: 2, stats: { movement: 3, deception: 3 } },
    { id: 'finisher_pair',       icon: 'chem_finisher_pair',       need: 2, stats: { power: 3, composure: 3 } },
    { id: 'all_round_engine',    icon: 'chem_all_round_engine',    need: 3, stats: { timing: 2, accuracy: 2, fielding: 2 } },
    { id: 'homegrown_xi',        icon: 'chem_homegrown_xi',        need: 5, stats: { composure: 2, timing: 2, accuracy: 2 } },
    { id: 'rival_duo',           icon: 'chem_rival_duo',           need: 2, stats: { power: 2, delivery: 2, composure: 2 } },
    { id: 'national_core',       icon: 'chem_national_core',       need: 3, stats: { timing: 2, accuracy: 2, fielding: 2 } },
  ],
  maxChemistry: 2,
  newBallDelivery: 55,                            // a new-ball bowler: pace with Delivery at least this

  // ---- between-over tactical calls (plan 15.12) ----
  // stats: added to your side for the over · aggression: AI batting intent (the
  // simulated balls and AI-controlled teammates) · field: your field preset.
  tactics: {
    bat: [
      { id: 'attack',   icon: 'tac_attack_batting',   stats: { power: 6, contact: -4 }, aggression: 0.2 },
      { id: 'balanced', icon: 'tac_balanced_batting', stats: {}, aggression: 0 },
      { id: 'rotate',   icon: 'tac_rotate_strike',    stats: { running: 8, placement: 3, power: -4 }, aggression: -0.08 },
      { id: 'protect',  icon: 'tac_protect_wicket',   stats: { contact: 6, composure: 4, power: -6 }, aggression: -0.2 },
    ],
    bowl: [
      { id: 'hunt',     icon: 'tac_hunt_wickets',     stats: { deception: 6, movement: 3, accuracy: -4 }, field: 'attacking' },
      { id: 'balanced', icon: 'tac_balanced_bowling', stats: {}, field: null },
      { id: 'control',  icon: 'tac_control_runs',     stats: { accuracy: 5, control: 4, deception: -3 }, field: 'defensive' },
      { id: 'guard',    icon: 'tac_boundary_guard',   stats: { control: 3, delivery: -2 }, field: 'defensive', stopBonus: 0.05 },
    ],
  },

  // ---- the captain's team perk (plan 15.13): chosen by the captain's role ----
  captainPerks: {
    chase:     { stat: 'composure', n: 3, perks: [{ mod: 'chasePressure', mult: 0.85 }] },
    fielding:  { stat: 'fielding', n: 4, perks: [{ mod: 'catchBonus', add: 0.03 }] },
    control:   { stat: 'control', n: 3, perks: [] },
    powerplay: { stat: 'power', n: 2, perks: [] },
  },
  captainPerkFor: { bat: 'chase', bowl: 'control', all: 'fielding', keeper: 'powerplay' },

  // ---- the competition ladder (plan 15.9) ----
  // kind: league (you play everyone once; win the table) | cup (groups of 3, top
  // two, quarters, semis, final) | series (play them in turn; win the last).
  // fmt: match length (finalFmt for the final) · ratings: opponent strength.
  competitions: [
    { id: 'club', kind: 'league', teams: 5, opp: 'clubs', fmt: 'quick5', rating: [48, 56], trophy: 'myxi_trophy_club',
      reward: { coins: 300, lm: 1, recruit: 'utility_keeper', stadium: 'coastal_ground' } },
    { id: 'premier', kind: 'league', teams: 6, opp: 'franchise_low', fmt: 'quick5', rating: [56, 63], trophy: 'myxi_trophy_premier',
      reward: { coins: 400, lm: 1, recruit: 'spin_specialist', stadium: 'city_arena', item: 'bat_finisher' } },
    { id: 'continental', kind: 'cup', opp: 'franchise_high', fmt: 'quick5', finalFmt: 'quick10', rating: [63, 70], trophy: 'myxi_trophy_continental',
      reward: { coins: 500, lm: 2, recruit: 'pace_spearhead', stadium: 'desert_stadium', technique: 'boundary_hunter' } },
    { id: 'world_club', kind: 'cup', opp: 'franchise_top', fmt: 'quick10', rating: [70, 77], trophy: 'myxi_trophy_world_club',
      reward: { coins: 600, lm: 2, recruit: 'engine_room', stadium: 'world_championship_stadium', item: 'acc_crown' } },
    { id: 'champions', kind: 'cup', opp: 'franchise_rivals', fmt: 'quick10', rating: [77, 84], trophy: 'myxi_trophy_champions',
      reward: { coins: 800, lm: 3, recruit: 'death_hitter', coach: 'legendary', item: 'bat_stormwood_awakened' } },
    { id: 'legends', kind: 'series', opp: 'legends', fmt: 'quick10', rating: [84, 92], trophy: 'myxi_trophy_legends',
      reward: { coins: 1500, lm: 5, stadium: 'legends_arena', item: 'uniform_legends_elite', mc: 1 } },
  ],
  // The four bespoke Legends Invitational squads (the last is the climax, with The Champion).
  legends: [
    { id: 'masters',   crest: 'elite_invitational_crest_02', colours: ['#16325c', '#e8b21c'], rival: 'veteran' },
    { id: 'allstars',  crest: 'elite_invitational_crest_03', colours: ['#b0122a', '#e8b21c'], rival: 'giant' },
    { id: 'phantoms',  crest: 'elite_invitational_crest_04', colours: ['#1b1b1b', '#6a3ab8'], rival: 'phantom' },
    { id: 'champions', crest: 'elite_invitational_crest_01', colours: ['#e8b21c', '#f2f2f2'], rival: 'champion' },
  ],
  // Champions Series: each franchise brings a rival (in this order).
  seriesRivals: ['cannon', 'magician', 'trickster', 'captain', 'wall', 'finisher', 'technician', 'prodigy', 'giant', 'veteran', 'cannon'],
  winRewards: { coins: 40 },                      // Coins for every My XI win
};
