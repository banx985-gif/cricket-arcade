// Cricket Arcade — the systems every mode shares (M12): difficulty (plan 20), the
// Global Profile Level and its rewards (21.1), Collection Book milestones (21.3),
// the Trophy Room (21.4), the mode unlock order (21.6), the first-time tutorial
// (26, 39), Quick Match (19) and the settings (34). Rules in game/meta.js.

// ---- Difficulty (plan 20): never just "every opponent stat x N" ----
//   window    your batting timing windows            band      your release bands (bowling)
//   aiSigma   the AI batter's timing spread (bigger = more mistakes when you bowl)
//   aiRead    how well the AI batter reads your variations
//   aimAssist batting gap assist / bowling length snap (x the Aim assist setting)
//   punish    chance a mistimed shot beats the bat and hits the stumps
//   pressure  how much a tense chase squeezes your timing
//   opp       opponent team strength (+/- rating), a small part of it
//   coins     Quick Match coin reward
const DIFFICULTY_DATA = {
  levels: ['rookie', 'pro', 'legend'],
  default: 'pro',
  rookie: { icon: 'chal_diff_rookie', window: 1.15, band: 1.15, aiSigma: 1.2, aiRead: 0.85, aimAssist: 1.5, punish: 0.75, pressure: 0.7, opp: -6, coins: 0.8 },
  pro:    { icon: 'chal_diff_pro',    window: 1,    band: 1,    aiSigma: 1,   aiRead: 1,    aimAssist: 1,   punish: 1,    pressure: 1,   opp: 0,  coins: 1 },
  legend: { icon: 'chal_diff_legend', window: 0.88, band: 0.88, aiSigma: 0.84, aiRead: 1.15, aimAssist: 0.5, punish: 1.15, pressure: 1.3, opp: 6,  coins: 1.25 },
};

// ---- Global Profile Level (plan 21.1): 1–50, account-wide ----
const PROFILE_DATA = {
  maxLevel: 50,
  // XP to go from level n to n + 1.
  xpBase: 100, xpPerLevel: 25,
  // Where profile XP comes from.
  xp: {
    tutorial: 100,
    careerMatch: 10, careerPromotion: 150, careerComplete: 800,
    myxiWin: 20, myxiTrophy: 300,
    missionClear: 60, missionStar: 25,
    medal: { bronze: 40, silver: 60, gold: 90, diamond: 140 }, challengeMilestone: 200,
    quickWin: 15,
  },
  // Rewards (plan 21.1: cosmetics, coach access, starting archetypes, challenge
  // rulesets, collection rewards). Levels not listed pay coins: 100 + 10 x level.
  rewards: {
    2: { coins: 200 },
    3: { archetype: 'finisher' },
    4: { look: 'look_hair_11' },
    5: { ruleset: 'bossBowler' },
    6: { ruleset: 'bossBatter' },
    7: { item: 'acc_headband' },
    8: { look: 'look_hair_12' },
    10: { coach: 'mental', lm: 1 },
    12: { archetype: 'bowlingAllRounder' },
    14: { facial: 'look_facial_04' },
    15: { coach: 'gear' },
    18: { item: 'acc_sunglasses' },
    20: { coach: 'allrounder', lm: 1 },
    25: { item: 'uniform_regional', lm: 1 },
    30: { mc: 1 },
    35: { item: 'acc_crown' },
    40: { lm: 2 },
    45: { item: 'uniform_legends_elite' },
    50: { mc: 1, title: 'legend' },
  },
  // What a level reward locks until it's reached (so it really is a reward).
  locked: {
    archetype: ['finisher', 'bowlingAllRounder'],
    look: ['look_hair_11', 'look_hair_12', 'look_facial_04'],
    ruleset: ['bossBowler', 'bossBatter'],
  },
  // Profile titles shown under the level (from levels and Collection Book milestones).
  titles: ['rookie', 'collector', 'curator', 'archivist', 'completionist', 'legend'],
};

// ---- Collection Book milestones (plan 21.3) and secrets (21.5) ----
// pct = gear + techniques discovered, as a share of all of them.
const COLLECTION_DATA = {
  milestones: [
    { id: 'c10',  pct: 10,  reward: { coins: 300, title: 'collector' } },
    { id: 'c25',  pct: 25,  reward: { lm: 1, clue: true } },
    { id: 'c50',  pct: 50,  reward: { mc: 1, title: 'curator' } },
    { id: 'c75',  pct: 75,  reward: { lm: 2, title: 'archivist' } },
    { id: 'c100', pct: 100, reward: { mc: 2, title: 'completionist' } },
  ],
  // Unowned items of these rarities show as a silhouette with a clue (by where they come from).
  secretRarities: ['legendary', 'mythic'],
};

// ---- Trophy Room (plan 21.4): major feats as physical trophies ----
// Each is checked against the save; art ids are existing trophy / medal / reward art.
const TROPHY_DATA = {
  list: [
    { id: 'first_career',  art: 'reward_hall_of_fame', check: 'retired', min: 1 },
    { id: 'world_champ',   art: 'reward_tournament_victory', check: 'careerTrophy', trophy: 'world_champion' },
    { id: 'elite_champ',   art: 'reward_tournament_victory', check: 'careerTrophy', trophy: 'elite_champion' },
    { id: 'myxi_club',     art: 'myxi_trophy_club', check: 'myxiTrophy', comp: 'club' },
    { id: 'myxi_premier',  art: 'myxi_trophy_premier', check: 'myxiTrophy', comp: 'premier' },
    { id: 'myxi_cont',     art: 'myxi_trophy_continental', check: 'myxiTrophy', comp: 'continental' },
    { id: 'myxi_world',    art: 'myxi_trophy_world_club', check: 'myxiTrophy', comp: 'world_club' },
    { id: 'myxi_champs',   art: 'myxi_trophy_champions', check: 'myxiTrophy', comp: 'champions' },
    { id: 'myxi_legends',  art: 'myxi_trophy_legends', check: 'myxiTrophy', comp: 'legends' },
    { id: 'six_diamond',   art: 'medal_diamond', check: 'medal', game: 'six', medal: 'diamond' },
    { id: 'rush_diamond',  art: 'medal_diamond', check: 'medal', game: 'rush', medal: 'diamond' },
    { id: 'missions_all',  art: 'medal_gold', check: 'missionsPerfect', min: 48 },
    { id: 'profile_50',    art: 'medal_record', check: 'profile', min: 50 },
    { id: 'legend_win',    art: 'medal_badge', check: 'achievement', ach: 'legend_victory' },
  ],
};

// ---- Mode unlock order (plan 21.6), exactly ----
//   career      immediate (the tutorial is the first career)
//   quickmatch  after the tutorial match
//   collection / records   after the first real reward (the tutorial's)
//   sixsmash / wicketrush  during the Local stage: after the first career match, by
//               discipline (batter: Six Smash, bowler: Wicket Rush, all-rounder: both)
//   both challenges       by the end of the Regional stage (reaching Stage 3)
//   missions    after the Local stage (reaching Stage 2)
//   myxi        after the first retirement (My XI's own rule)
const MODE_DATA = {
  order: ['career', 'quickmatch', 'collection', 'records', 'sixsmash', 'wicketrush', 'missions', 'myxi'],
  hints: { quickmatch: 'tutorialMatch', collection: 'firstReward', records: 'firstReward', sixsmash: 'localBat', wicketrush: 'localBowl', missions: 'afterLocal', myxi: 'retire' },
};

// ---- The first-time tutorial (plan 26, 39) ----
const TUTORIAL_DATA = {
  // One prompt at a time. anchor = what the arrow points at.
  bat: [
    { id: 'aim',      anchor: 'pad' },
    { id: 'control',  anchor: 'control' },
    { id: 'power',    anchor: 'power' },
    { id: 'timing',   anchor: 'ring' },
    { id: 'run',      anchor: 'run' },
    { id: 'boundary', anchor: 'power' },
  ],
  bowl: [
    { id: 'pick',    anchor: 'slots' },
    { id: 'aim',     anchor: 'reticle' },
    { id: 'release', anchor: 'bowl' },
    { id: 'swipe',   anchor: 'swipe' },
  ],
  // First reward (plan 26 step 3): coins + the first usable gear item.
  reward: { coins: 200, item: 'bat_balanced' },
  // The short scripted first match (step 5), with the new career player.
  match: {
    bat:  { side: 'bat',  fmt: 'quick5', at: { over: 4, ball: 0, runs: 31, wkts: 4 }, balls: 6, target: 10, goal: { kind: 'runs' }, opp: { rating: 36, bowl: 36, attack: ['swing'] } },
    bowl: { side: 'bowl', fmt: 'quick5', at: { over: 4, ball: 0, runs: 33, wkts: 5 }, balls: 6, target: 12, goal: { kind: 'defend' }, opp: { rating: 36 } },
    reward: { xp: 60, coins: 100, selection: 8 },
  },
  // The batting and bowling lessons (a real match, gentle bowling / batting).
  lessons: {
    bat:  { side: 'bat',  fmt: 'quick5', at: { over: 0, ball: 0, runs: 0, wkts: 0 }, balls: 24, goal: { kind: 'lesson' }, opp: { rating: 30, bowl: 26, attack: ['swing', 'offspin'] } },
    bowl: { side: 'bowl', fmt: 'quick5', at: { over: 0, ball: 1, runs: 0, wkts: 0 }, balls: 17, goal: { kind: 'lesson' }, opp: { rating: 34 } },
  },
  // The Career Home tour (step 6).
  tour: ['selection', 'train', 'equipment', 'play'],
  lessonDiff: 'rookie',
};

// ---- Quick Match (plan 19) ----
const QUICKMATCH_DATA = {
  formats: ['quick5', 'quick10', 'quick20'],
  coins: { win: 60, loss: 20 },           // modest (x difficulty); never touches Career or Legacy
  pitches: [
    { id: 'balanced', icon: 'qm_pitch_balanced' }, { id: 'green', icon: 'qm_pitch_green' }, { id: 'dry', icon: 'qm_pitch_dry' },
    { id: 'hardFast', icon: 'qm_pitch_hard' }, { id: 'worn', icon: 'qm_pitch_worn' },
  ],
  weathers: [
    { id: 'clear', icon: 'qm_weather_clear' }, { id: 'overcast', icon: 'qm_weather_overcast' },
    { id: 'windy', icon: 'qm_weather_windy' }, { id: 'hotDry', icon: 'qm_weather_hot' },
  ],
  // The elite squads are "discovered" by reaching them (Stage 8 in a career, or the
  // Legends Invitational in My XI).
  eliteRating: 88,
};

// ---- Settings (plan 34): defaults for everything on the Settings screen ----
const SETTINGS_DATA = {
  defaults: {
    muted: false, haptics: true,
    master: 80, music: 50, sfx: 80, crowd: 70,
    leftHanded: false, controlSize: 'normal', aimAssist: 'normal', batSensitivity: 'normal',
    aimInvert: false, aimSensitivity: 'normal',
    fps: 60, vfx: 'normal', shake: true, reduceFlash: false,
    textSize: 'normal', contrastBall: false, contrastTarget: false, reducedMotion: false, colourSafe: false,
  },
  controlSize: { small: 0.85, normal: 1, large: 1.18 },
  aimAssist: { low: 0.5, normal: 1, high: 1.6 },
  batSensitivity: { low: 0.8, normal: 1, high: 1.25 },
  vfx: { low: 0.4, normal: 1, high: 1.4 },
  textSize: { normal: 1, large: 1.15 },
};
