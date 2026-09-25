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
  stages: [
    {
      id: 'local', n: 1, nameKey: 'career.stage.local', art: 'stage_local', format: 'quick5',
      matches: 4,                               // the 4th is the local final
      teamRating: 30, opponentRating: [26, 34], finalOpponentRating: 36,
      gate: { threshold: 70, nearMiss: 52, keyObjective: { finalGrade: 'C' } },
      qualifier: { passGrade: 'B' },
      extraBlock: { matches: 2 },
      next: 'regional',
    },
    {
      id: 'regional', n: 2, nameKey: 'career.stage.regional', art: 'stage_regional', comingSoon: true,
    },
  ],
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
