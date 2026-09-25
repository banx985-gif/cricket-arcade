// Cricket Arcade — Career Mode data (M05, plan 5.4–5.7, 8.1–8.9, 8.13–8.15, 8.23, 8.24, 9, 10).
// Every career number lives here: starting stats, growth, energy, form,
// training, grades, the Selection Meter, stage gates and club offers.

const CAREER_DATA = {
  slots: 3,

  // ---- Character creator (plan 5.5) -------------------------------------------
  // The customisation art is whole portraits (face + hair + shirt), so a
  // "look" is one portrait. Skin tone and hair colour are tints, applied
  // through masks made by tests/tools/masks.js.
  looks: {
    masculine: [
      'look_base_male', 'look_hair_01', 'look_hair_02', 'look_hair_03', 'look_hair_05', 'look_hair_06',
      'look_hair_07', 'look_hair_08', 'look_hair_09', 'look_hair_10', 'look_hair_11', 'look_hair_12',
    ],
    feminine: ['look_base_female', 'look_hair_04'],
  },
  // Facial hair (masculine only, optional). Each is its own portrait.
  facialHair: ['none', 'look_facial_01', 'look_facial_02', 'look_facial_03', 'look_facial_04'],
  // Tints: op = how the colour is laid over the masked area, a = strength.
  skinTones: [
    { id: 'porcelain', color: '#ffe6d2', op: 'soft-light', a: 0.9 },
    { id: 'light',     color: '#ffd9b8', op: 'soft-light', a: 0.55 },
    { id: 'tan',       color: '#000000', op: 'source-over', a: 0 },
    { id: 'olive',     color: '#b88452', op: 'multiply', a: 0.35 },
    { id: 'brown',     color: '#8a5530', op: 'multiply', a: 0.55 },
    { id: 'deep',      color: '#5a3219', op: 'multiply', a: 0.72 },
  ],
  hairColours: [
    { id: 'black',  color: '#141010', op: 'multiply', a: 0.75 },
    { id: 'brown',  color: '#000000', op: 'source-over', a: 0 },
    { id: 'auburn', color: '#b3421b', op: 'color', a: 0.7 },
    { id: 'blonde', color: '#f0c96a', op: 'screen', a: 0.75 },
    { id: 'grey',   color: '#c9c9c9', op: 'luminosity', a: 0.7 },
    { id: 'blue',   color: '#2f7bff', op: 'color', a: 0.75 },
  ],
  hands: ['right', 'left'],

  // ---- Roles and archetypes (plan 8.1, 8.2, 9.4) ------------------------------
  // Starting stats: key = 28–35, neutral = 20–28, weak = 15–22 (plan 9.4).
  // grow = stats that cost less to raise (plan 10 "Archetype Growth").
  startRanges: { key: [28, 35], neutral: [20, 28], weak: [15, 22] },
  roles: {
    batter: {
      nameKey: 'career.role.batter', bowls: false,
      archetypes: [
        { id: 'powerHitter', key: ['power', 'timing', 'running'], weak: ['delivery', 'accuracy', 'movement', 'deception', 'control'], grow: ['power', 'contact'] },
        { id: 'technician',  key: ['timing', 'contact', 'placement'], weak: ['delivery', 'accuracy', 'movement', 'deception', 'control'], grow: ['contact', 'placement'] },
        { id: 'finisher',    key: ['power', 'composure', 'running'], weak: ['delivery', 'accuracy', 'movement', 'deception', 'control'], grow: ['composure', 'power'] },
      ],
      grow: ['power', 'contact', 'placement', 'composure'],
    },
    bowler: {
      nameKey: 'career.role.bowler', bowls: true,
      archetypes: [
        { id: 'paceStrike', key: ['delivery', 'accuracy', 'fitness'], weak: ['power', 'placement', 'composure'], grow: ['delivery', 'accuracy'], family: 'fast' },
        { id: 'swingSeam',  key: ['movement', 'accuracy', 'control'], weak: ['power', 'placement', 'composure'], grow: ['movement', 'control'], family: 'swing' },
        { id: 'spinWizard', key: ['movement', 'deception', 'control'], weak: ['power', 'placement', 'composure'], grow: ['deception', 'movement'], family: 'offspin' },
      ],
      grow: ['delivery', 'accuracy', 'movement', 'deception'],
    },
    allrounder: {
      nameKey: 'career.role.allrounder', bowls: true,
      archetypes: [
        { id: 'battingAllRounder', key: ['timing', 'power', 'accuracy'], weak: ['deception'], grow: ['timing', 'accuracy'] },
        { id: 'bowlingAllRounder', key: ['delivery', 'accuracy', 'contact'], weak: ['placement'], grow: ['delivery', 'contact'] },
        { id: 'balanced',          key: ['timing', 'accuracy', 'fielding'], weak: [], grow: ['timing', 'accuracy'] },
      ],
      grow: [],   // all-rounders grow evenly (slower specialist growth, plan 8.1)
    },
  },
  // Preferred batting role -> batting position in the XI (plan 8.2 / 8.23).
  battingRoles: { opener: 1, top: 3, middle: 4, finisher: 5 },
  bowlerBatsAt: 8,

  // ---- XP, levels and growth (plan 10) ---------------------------------------
  levels: {
    max: 50,
    xpFor: (level) => 60 + level * 40,        // XP needed to go from level to level + 1
    growthPerLevel: 3,
    skillTokensPerLevel: 1,                    // spent in the Wicket Tree (data/skilltree.js)
    skillTokensPerPromotion: 2,
  },
  // Growth Point cost to raise a stat by 1: gets dearer at high ratings.
  growthCost: [{ below: 40, cost: 1 }, { below: 60, cost: 2 }, { below: 80, cost: 3 }, { below: 100, cost: 4 }],
  growthDiscountStats: 1,                      // preferred stats cost 1 less (never below 1)
  statMax: 99,

  // ---- Energy and form (plan 8.14, 8.15) -------------------------------------
  energy: {
    start: 100, max: 100,
    match: 25,                  // a match uses this much
    low: 30,                    // below this: performance drops, slump risk
    lowStatPenalty: 4,          // effective stats -4 when low
    slumpChance: 0.35,          // chance form drops a level after a match played on low energy
  },
  form: {
    levels: ['poor', 'normal', 'good', 'hot'],
    start: 'normal',
    statBonus: { poor: -4, normal: 0, good: 3, hot: 6 },   // added to every stat in matches
    // A match grade moves form this many levels.
    fromGrade: { S: 2, A: 1, B: 0, C: 0, D: -1 },
  },

  // ---- The schedule loop (plan 8.13) -----------------------------------------
  prepPerBlock: 2,              // two prep actions, then the match
  rest: { energy: 40, formUpFromPoor: true },
  // Training drills (quick resolve). stat = what it improves, gain = stat
  // points, energy = cost, xp = XP gained. Club emphasis adds emphasisBonus.
  training: [
    { id: 'timing_cage',       icon: 'train_timing_cage',       stat: 'timing',    gain: 1, energy: 20, xp: 30, for: 'bat' },
    { id: 'power_hitting',     icon: 'train_power_hitting',     stat: 'power',     gain: 1, energy: 25, xp: 30, for: 'bat', emphasis: 'power' },
    { id: 'target_batting',    icon: 'train_target_batting',    stat: 'placement', gain: 1, energy: 20, xp: 30, for: 'bat', emphasis: 'technique' },
    { id: 'pace_gate',         icon: 'train_pace_gate',         stat: 'delivery',  gain: 1, energy: 25, xp: 30, for: 'bowl', emphasis: 'power' },
    { id: 'yorker_board',      icon: 'train_yorker_board',      stat: 'accuracy',  gain: 1, energy: 20, xp: 30, for: 'bowl', emphasis: 'technique' },
    { id: 'movement_control',  icon: 'train_movement_control',  stat: 'movement',  gain: 1, energy: 20, xp: 30, for: 'bowl' },
    { id: 'fitness_session',   icon: 'train_fitness_session',   stat: 'fitness',   gain: 1, energy: 15, xp: 20, for: 'all' },
    { id: 'fielding_reaction', icon: 'train_fielding_reaction', stat: 'fielding',  gain: 1, energy: 15, xp: 20, for: 'all' },
  ],
  emphasisBonus: { xp: 10, extraStatChance: 0.35 },

  // ---- Match grade (plan 8.24) ---------------------------------------------------
  // Batting score: runs + strike-rate bonus + not-out bonus. Bowling score:
  // wickets, economy, dots, minus extras. All-rounders: both, weighted.
  grade: {
    bat: { perRun: 2.2, srBase: 120, perSrPoint: 0.12, notOut: 8, duck: -6, didNotBat: 30 },
    bowl: { perWicket: 26, econBase: 10, perEconPoint: 4, perDot: 2.5, perExtra: -3, didNotBowl: 30 },
    allWeights: { bat: 0.55, bowl: 0.55 },
    won: 6,                                    // team win bonus
    objective: 12,                             // match objective met
    // score -> grade
    thresholds: [{ min: 80, g: 'S' }, { min: 55, g: 'A' }, { min: 35, g: 'B' }, { min: 12, g: 'C' }, { min: -999, g: 'D' }],
    xp: { S: 160, A: 120, B: 90, C: 65, D: 45 },
  },

  // ---- Selection Meter and stages (plan 8.6, 8.7) ---------------------------------
  selection: {
    fromGrade: { S: 30, A: 22, B: 15, C: 8, D: 3 },
    objective: 6,
    finalMult: 1.5,                            // the local final counts extra
    max: 100,
  },
  // Each stage: matches (the last is its final), team / opponent ratings, the
  // gate (plan 8.7: threshold + key objective = promoted; near miss = one
  // qualifier; bigger miss = a short extra block), and what's special:
  //   team         the side you play for: 'club' (your local club) | 'stage' (a
  //                generated representative side, teamSuffix) | 'franchise' (a contract)
  //   sponsors / scouts / rival    sponsor offers can appear / "scouts watching" / a boss match
  //   tournament   the Stage 4 format (CAREER_DATA.franchise): groups, then knockouts
  //   milestone    art shown on the promotion screen into this stage
  stages: [
    {
      id: 'local', n: 1, nameKey: 'career.stage.local', art: 'stage_local', format: 'quick5',
      matches: 4,                               // the 4th is the local final
      teamRating: 30, opponentRating: [26, 34], finalOpponentRating: 36,
      gate: { threshold: 70, nearMiss: 52, keyObjective: { finalGrade: 'C' } },
      qualifier: { passGrade: 'B' },
      extraBlock: { matches: 2 },
      team: 'club', milestone: 'milestone_local_club_signing',
      next: 'regional',
    },
    {
      id: 'regional', n: 2, nameKey: 'career.stage.regional', art: 'stage_regional', format: 'quick5',
      matches: 4,                               // the 4th is the regional final
      teamRating: 40, opponentRating: [37, 45], finalOpponentRating: 48,
      gate: { threshold: 70, nearMiss: 52, keyObjective: { finalGrade: 'C' } },
      qualifier: { passGrade: 'B' },
      extraBlock: { matches: 2 },
      team: 'stage', teamSuffix: 'Pathway XI', sponsors: true, rival: { n: 2, id: 'prodigy' },
      milestone: 'milestone_domestic_promotion',
      next: 'domestic',
    },
    {
      id: 'domestic', n: 3, nameKey: 'career.stage.domestic', art: 'stage_top_domestic', format: 'quick5',
      matches: 5,                               // the 5th is the domestic final
      teamRating: 50, opponentRating: [47, 56], finalOpponentRating: 59,
      gate: { threshold: 72, nearMiss: 54, keyObjective: { finalGrade: 'C' } },
      qualifier: { passGrade: 'B' },
      extraBlock: { matches: 2 },
      team: 'stage', teamSuffix: 'domestic', sponsors: true, scouts: true, rival: [{ n: 2, id: 'wall' }, { n: 4, id: 'finisher' }],
      milestone: 'milestone_domestic_promotion',
      next: 'franchise',
    },
    {
      id: 'franchise', n: 4, nameKey: 'career.stage.franchise', art: 'stage_global_franchise', format: 'quick5',
      matches: 5,                               // 3 group matches + semi + final (when you go all the way)
      teamRating: 60, opponentRating: [57, 66], finalOpponentRating: 68,
      // Key objective: reach the semi-finals (win your group).
      gate: { threshold: 70, nearMiss: 52, keyObjective: { reach: 'semi' } },
      qualifier: { passGrade: 'B' },
      extraBlock: { matches: 2 },
      team: 'franchise', tournament: true, sponsors: true, scouts: true, rival: { n: 3, id: 'cannon' },
      milestone: 'milestone_franchise_signing',
      next: 'national',
    },
    {
      // Plan 8.11: the Development XI. 3 trial matches (role objectives), the last
      // is the final trial. A miss: a short domestic qualifier block, then another
      // trial (extra blocks keep the Selection Meter). Selection is permanent once earned.
      id: 'national', n: 5, nameKey: 'career.stage.national', art: 'stage_national_development', format: 'quick5',
      matches: 3,
      teamRating: 66, opponentRating: [64, 69], finalOpponentRating: 71,
      gate: { threshold: 70, nearMiss: 52, keyObjective: { finalGrade: 'B' } },
      qualifier: { passGrade: 'B' },
      extraBlock: { matches: 2 },
      team: 'devxi', trials: true, sponsors: true, scouts: true, rival: { n: 2, id: 'technician' },
      milestone: 'milestone_national_callup',
      next: 'international',
    },
    {
      // International cricket: 5 matches against rotating national sides; a
      // captaincy offer for exceptional careers (plan 8.12).
      id: 'international', n: 6, nameKey: 'career.stage.international', art: 'stage_international_cricket', format: 'quick5',
      matches: 5,
      teamRating: 72, opponentRating: [70, 77], finalOpponentRating: 79,
      gate: { threshold: 72, nearMiss: 54, keyObjective: { finalGrade: 'C' } },
      qualifier: { passGrade: 'B' },
      extraBlock: { matches: 2 },
      team: 'national', captaincy: true, sponsors: true, rival: [{ n: 2, id: 'magician' }, { n: 4, id: 'veteran' }],
      milestone: 'milestone_national_callup',
      next: 'world',
    },
    {
      // The World Nations Championship (CAREER_DATA.world): groups of 3, top two to the quarter-finals.
      id: 'world', n: 7, nameKey: 'career.stage.world', art: 'stage_world_stage', format: 'quick5',
      matches: 5,                               // 2 group matches + quarter + semi + final (going all the way)
      teamRating: 78, opponentRating: [75, 84], finalOpponentRating: 86,
      gate: { threshold: 70, nearMiss: 52, keyObjective: { reach: 'semi' } },
      qualifier: { passGrade: 'B' },
      extraBlock: { matches: 2 },
      team: 'national', tournament: 'world', sponsors: true, rival: [{ n: 1, id: 'giant' }, { kind: 'quarter', id: 'trickster' }, { kind: 'final', id: 'captain' }],
      milestone: 'milestone_world_stage_selection',
      next: 'elite',
    },
    {
      // The Elite Invitational: 3 gauntlet matches, then the Champion. The
      // Phantom's secret invitation (EVENT_DATA.phantom) adds one match before the
      // final. After the final the career is complete: retire (or a rematch).
      id: 'elite', n: 8, nameKey: 'career.stage.elite', art: 'stage_elite_invitational', format: 'quick5',
      matches: 4,
      teamRating: 84, opponentRating: [82, 88], finalOpponentRating: 92,
      team: 'national', elite: true, rival: { kind: 'final', id: 'champion' },
      milestone: 'milestone_world_stage_selection',
      final: true,
    },
  ],
  // Stage 8's gauntlet sides (elite crests) and the Champion's XI.
  elite: {
    gauntlet: [
      { id: 'masters', crest: 'elite_invitational_crest_02', colours: ['#16325c', '#e8b21c'] },
      { id: 'legends', crest: 'elite_invitational_crest_01', colours: ['#6a3ab8', '#e8b21c'] },
      { id: 'allstars', crest: 'elite_invitational_crest_02', colours: ['#b0122a', '#e8b21c'] },
    ],
    phantom: { id: 'phantoms', crest: 'elite_invitational_crest_01', colours: ['#1b1b1b', '#6a3ab8'] },
    champion: { id: 'champions', crest: 'elite_invitational_crest_01', colours: ['#e8b21c', '#f2f2f2'] },
  },
  // The World Nations Championship (plan 8.6 Stage 7): the 12 origins' national sides.
  world: {
    groups: 4, perGroup: 3, pointsWin: 2,
    simRuns: { base: 50, spread: 14, perRating: 0.9 },
    teams: [
      { id: 'australia', rating: 84, colours: ['#f5d020', '#1f8a4c'] }, { id: 'england', rating: 83, colours: ['#16325c', '#c8202f'] },
      { id: 'india', rating: 85, colours: ['#2447b8', '#f39c12'] }, { id: 'newzealand', rating: 80, colours: ['#1b1b1b', '#f2f2f2'] },
      { id: 'pakistan', rating: 81, colours: ['#0f9d58', '#f2f2f2'] }, { id: 'southafrica', rating: 82, colours: ['#1f8a4c', '#f5d020'] },
      { id: 'srilanka', rating: 78, colours: ['#16325c', '#f5d020'] }, { id: 'bangladesh', rating: 76, colours: ['#1f8a4c', '#c8202f'] },
      { id: 'afghanistan', rating: 77, colours: ['#2447b8', '#c8202f'] }, { id: 'westindies', rating: 79, colours: ['#7f1734', '#f5d020'] },
      { id: 'ireland', rating: 74, colours: ['#0f9d58', '#2447b8'] }, { id: 'zimbabwe', rating: 73, colours: ['#c8202f', '#f5d020'] },
    ],
  },
  // Captaincy (plan 8.12): offered in International cricket after this many
  // matches, if you've had enough A/S grades in the stage or strong Composure.
  captaincy: { afterMatches: 3, gradesA: 2, composure: 70, tactics: ['attack', 'steady', 'defend'],
    // what a tactic call does in the simulated balls: batting aggression / the field
    effects: { attack: { aggression: 0.18, field: 'attacking' }, steady: { aggression: 0, field: null }, defend: { aggression: -0.15, field: 'defensive' } } },
  // Names for generated representative sides (team: 'stage'): a town from the
  // origin pack + the stage's teamSuffix; 'domestic' picks one of these.
  domesticSuffixes: ['Titans', 'Royals', 'Strikers', 'Stallions', 'Hawks', 'Knights', 'Warriors'],

  // ---- Stage 4: Global Franchise (plan 5.5C, 8.10, 8.6) ------------------------------
  // 16 fixed fictional franchises (crest = art id). 4 groups of 4; the group
  // winners play the semi-finals (A v B, C v D), then the final. Win = 2 points,
  // ties on points split by net run rate.
  franchise: {
    groups: 4, perGroup: 4, pointsWin: 2,
    teams: [
      { id: 'crown_lions',      crest: 'franchise_crest_01', colours: ['#b0122a', '#e8b21c'], rating: 63 },
      { id: 'blue_eagles',       crest: 'franchise_crest_02', colours: ['#1d4ed8', '#e8b21c'], rating: 61 },
      { id: 'thunder_tigers',   crest: 'franchise_crest_03', colours: ['#f07a1a', '#1b1b1b'], rating: 64 },
      { id: 'bay_sharks',       crest: 'franchise_crest_04', colours: ['#139a9a', '#f2f2f2'], rating: 58 },
      { id: 'iron_spartans',    crest: 'franchise_crest_05', colours: ['#c8202f', '#b0703a'], rating: 62 },
      { id: 'emerald_dragons',  crest: 'franchise_crest_06', colours: ['#0f9d58', '#e8b21c'], rating: 60 },
      { id: 'desert_warriors',  crest: 'franchise_desert_warriors', colours: ['#7a1f2b', '#e8b21c'], rating: 65 },
      { id: 'jungle_rangers',   crest: 'franchise_jungle_rangers', colours: ['#1f8a4c', '#f5d020'], rating: 59 },
      { id: 'ocean_titans',     crest: 'franchise_ocean_titans', colours: ['#2447b8', '#56b4f0'], rating: 66 },
      { id: 'phoenix_strikers', crest: 'franchise_phoenix_strikers', colours: ['#f07a1a', '#b0122a'], rating: 62 },
      { id: 'royal_kings',      crest: 'franchise_royal_kings', colours: ['#16325c', '#e8b21c'], rating: 67 },
      { id: 'stellar_chargers', crest: 'franchise_stellar_chargers', colours: ['#6a3ab8', '#e8b21c'], rating: 61 },
      { id: 'golden_prides',    crest: 'franchise_crest_13', colours: ['#16325c', '#f5d020'], rating: 63 },
      { id: 'blaze_riders',     crest: 'franchise_crest_14', colours: ['#c8202f', '#f39c12'], rating: 59 },
      { id: 'reef_hunters',     crest: 'franchise_crest_15', colours: ['#56b4f0', '#16325c'], rating: 60 },
      { id: 'night_gladiators', crest: 'franchise_crest_16', colours: ['#1b1b1b', '#c8202f'], rating: 64 },
    ],
    // Quick results for the matches you're not in (seeded): runs around this,
    // plus this many per rating point of difference.
    simRuns: { base: 48, spread: 14, perRating: 0.9 },
    // Contract offers (plan 5.5C, 8.10): 2, or 3 when you came up with a high
    // Selection Meter or have beaten a rival.
    offers: {
      base: 2, bonusAt: 80,
      salary: [40, 55, 70],                     // Coins per completed franchise match (by offer strength)
      objectives: [
        { id: 'reachSemi' }, { id: 'tourRuns', n: 60 }, { id: 'tourWickets', n: 5 }, { id: 'tourSixes', n: 4 }, { id: 'tourGradeA', n: 2 },
      ],
      objectiveBonus: 200,                      // Coins when the contract objective is met (plus the reward route)
      coaches: ['power', 'technique', 'pace', 'swing', 'spin', 'fitness', 'fielding', 'mental', 'allrounder', 'gear'],
      rewards: ['uniform_global_franchise', 'bat_premier_pro', 'acc_clutch_band', 'acc_focus_charm', 'bat_ember_strike'],
    },
  },
  // Opponent club strength by fixture number within the stage (added to the range).
  gradeOrder: ['D', 'C', 'B', 'A', 'S'],

  // ---- Match objectives (plan 8.24) ------------------------------------------------
  objectives: {
    bat: [{ id: 'runs', n: 15 }, { id: 'runs', n: 20 }, { id: 'notOut' }, { id: 'boundaries', n: 2 }],
    bowl: [{ id: 'wickets', n: 1 }, { id: 'wickets', n: 2 }, { id: 'economy', n: 9 }, { id: 'dots', n: 5 }],
    final: { id: 'win' },
  },

  // ---- Local club offers (plan 5.5B, 8.8) ------------------------------------------
  clubs: {
    offers: 3,
    shields: ['shield_classic', 'shield_kite', 'shield_round', 'shield_hexagon', 'shield_banner', 'shield_star'],
    // Animal emblems sit on a shield; cricket-symbol emblems have their own frame.
    animalEmblems: ['emblem_lion', 'emblem_eagle', 'emblem_tiger', 'emblem_wolf', 'emblem_bull', 'emblem_falcon'],
    framedEmblems: ['emblem_crossed_bats', 'emblem_stumps_ball', 'emblem_rising_sun', 'emblem_lightning', 'emblem_oak', 'emblem_anchor'],
    framedChance: 0.35,
    venues: ['park', 'village', 'seaside', 'university', 'hillside', 'riverside'],
    emphases: ['power', 'technique', 'balanced'],
    // Colour words used in the origin packs' colourPool.
    colours: {
      maroon: '#7a1f2b', gold: '#e8b21c', sky: '#56b4f0', green: '#1f8a4c', teal: '#139a9a', black: '#1b1b1b',
      navy: '#16325c', red: '#c8202f', white: '#f2f2f2', blue: '#1d4ed8', orange: '#f07a1a', purple: '#6a3ab8',
      yellow: '#f5d020', silver: '#b8c0c8', emerald: '#0f9d58', crimson: '#b0122a', royal: '#2447b8', bronze: '#b0703a',
      cream: '#f4ead2', grey: '#8a948e', lime: '#8fd13a', pink: '#e0569b', brown: '#6b4226', saffron: '#f39c12', claret: '#7f1734',
    },
    // Lineup roles offered (a club says where you'd bat / when you'd bowl).
    bowlSpells: { newBall: [0, 2], firstChange: [1, 3], death: [2, 4] },
  },

  // ---- Hooks for later milestones (named so they're easy to find) ----------------
  // The Wicket Tree (M06) is in data/skilltree.js + game/skilltree.js: player.tree
  //   holds it, player.skillTokens the points; CareerStats.bonus() adds its perks.
  // Equipment (M07) is in data/equipment.js + game/gear.js: player.equipment
  //   holds what's worn; CareerStats.bonus() adds its stats, SkillTree.mods() its perks.
  // coach / records / sponsors / rivals / events: buttons are on
  //   Career Home, greyed "coming soon"; career.hooks keeps their save space.
  //   Rivals: call SkillTree.rivalWin(c) when one is beaten (+1 Skill Token).
  comingSoon: ['coach', 'records'],
};
