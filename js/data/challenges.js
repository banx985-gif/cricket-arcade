// Cricket Arcade — Six Smash and Wicket Rush: every ruleset, medals, rewards and
// the challenge players (plan 16, 17, 20). Rules in game/sixsmash_rules.js,
// game/wicketrush_rules.js and game/challenges.js. All numbers are balance data.
//
// A ruleset starts from its game's Classic numbers (SIX_SMASH_DATA.classic /
// WICKET_RUSH_DATA.classic) and changes only what it lists. Rule switches:
//   golden   Golden Ball / Golden Wicket Ball (plan 16.4 / 17.4)
//   fever    Fever meter + final-balls Fever (plan 16.5)
//   targets  stadium targets beyond the rope (16.3) / target stumps (17.3)
//   lives    Survival: the run ends when the lives are gone (balls = the cap)
//   perfectOnly  only PERFECT timing (or a PERFECT release) scores
//   boss     a boss opponent with a health bar
//   ramp     the opponent gets better every N balls (Survival)
// medals: the score for Bronze / Silver / Gold / Diamond (after the difficulty multiplier).

const CHALLENGE_DATA = {
  version: 1,
  // Plan 20: chosen per attempt; records store it. window x the batter's timing
  // windows (Six Smash) or the release bands (Wicket Rush); opp = opponent stat
  // change; score = final score multiplier (so medals need more on Rookie).
  difficulty: {
    rookie: { icon: 'chal_diff_rookie', window: 1.15, opp: -10, score: 0.8 },
    pro:    { icon: 'chal_diff_pro',    window: 1.0,  opp: 0,   score: 1.0 },
    legend: { icon: 'chal_diff_legend', window: 0.88, opp: 10,  score: 1.25 },
  },
  difficulties: ['rookie', 'pro', 'legend'],
  medals: ['bronze', 'silver', 'gold', 'diamond'],
  medalIcon: { bronze: 'chal_medal_bronze', silver: 'chal_medal_silver', gold: 'chal_medal_gold', diamond: 'chal_medal_diamond' },
  medalColour: { bronze: '#e39a5a', silver: '#d8e4f0', gold: '#ffd23f', diamond: '#9be7ff' },
  // First time a ruleset reaches a medal (each paid once, ever).
  medalRewards: {
    bronze:  { coins: 100 },
    silver:  { coins: 200 },
    gold:    { coins: 400 },
    diamond: { coins: 600, st: 1 },
  },
  // Milestones: medal points across all 10 rulesets (Bronze 1 · Silver 2 · Gold 3 · Diamond 4). Finite.
  medalPoints: { bronze: 1, silver: 2, gold: 3, diamond: 4 },
  milestones: [
    { id: 'm10', points: 10, reward: { coins: 500 } },
    { id: 'm20', points: 20, reward: { st: 1 } },
    { id: 'm30', points: 30, reward: { lm: 1 } },
    { id: 'm40', points: 40, reward: { mc: 1 } },
  ],

  // The default challenge players (plan 16.8 / 17.7) when no owned player fits.
  athlete: {
    bat:  { stat: 60 },
    bowl: { stat: 60, families: ['fast', 'swing', 'offspin', 'legspin'] },
  },

  // ---- Six Smash (plan 16) ------------------------------------------------------------
  six: {
    // Golden Ball: rolled on its own stream so it never changes the deliveries.
    golden: { chance: 0.07, mult: 3, fever: 2 },
    // Fever: sixes (+1), PERFECT contacts (+0.5), target hits (+1) and a Golden Ball (+2)
    // fill the meter; full = Fever for 'balls' balls (points x mult). In the last
    // 'finalBalls' balls, a score of at least 'finalScore' starts Fever to the end.
    fever: { meter: 4, balls: 3, mult: 2, six: 1, perfect: 0.5, target: 1, finalBalls: 5 },
    // Stadium targets: a glowing zone beyond the rope; a six that lands in it.
    //   angle = direction from the pitch (0 = straight, - = leg side / + = off side)
    targets: { spots: [-45, -28, -12, 0, 12, 28, 45], halfWidth: 12, bonus: 150, mult: 2, fever: 1 },
    // The bowling attack for each spell of 'spell' balls (rotates).
    attack: ['fast', 'swing', 'offspin', 'fast', 'legspin'],
    bowlerStat: 62,
    rulesets: [
      { id: 'classic20', icon: 'icon_six_smash', key: 'classic', balls: 20, spell: 5, golden: true, fever: true, finalScore: 900,
        targets: { every: 4 },
        medals: [700, 1400, 2300, 3400] },
      { id: 'targetSmash', icon: 'hud_reticle', key: 'target', balls: 20, spell: 5, golden: true, fever: true, finalScore: 1200,
        targets: { every: 1, bonus: 250, mult: 2 }, offTargetSix: 0.5,
        medals: [900, 1800, 3000, 4400] },
      { id: 'survivalSmash', icon: 'icon_combo', key: 'survival', balls: 60, spell: 6, golden: true, fever: false,
        lives: 3, loseLife: ['caught', 'bowled', 'lbw', 'hitwicket', 'miss'], ramp: { every: 6, stat: 4, max: 40 },
        medals: [800, 1700, 2900, 4500] },
      { id: 'perfectTiming', icon: 'grade_s', key: 'perfect', balls: 15, spell: 5, golden: false, fever: true, finalScore: 900,
        perfectOnly: true, points: { six: 150, four: 70, run: 20, perfectBonus: 0 },
        medals: [500, 1100, 1900, 2800] },
      { id: 'bossBowler', icon: 'icon_fever', key: 'boss', balls: 18, spell: 6, golden: true, fever: true, finalScore: 1000,
        boss: { rival: 'cannon', family: 'fast', stat: 84, health: 1600, heal: 250, bonus: 1000, yorkerWeight: 2 },
        medals: [800, 1500, 2600, 3600] },
    ],
  },

  // ---- Wicket Rush (plan 17) -----------------------------------------------------------
  rush: {
    // Golden Wicket Ball: when the pressure meter is high (at most 'max' a run).
    golden: { pressure: 0.8, mult: 3, max: 2, pressureAfter: 0.45 },
    // Target stumps (plan 17.3): the ball's line at the stumps. bail = it would hit the top.
    targets: { kinds: ['off', 'middle', 'leg', 'bail'], onTarget: 40, wicketMult: 2, bailHeight: 0.62 },
    batterStat: 58,
    rulesets: [
      { id: 'wicketRush18', icon: 'icon_wicket_rush', key: 'classic', balls: 18, golden: true, targets: { every: 6 },
        medals: [500, 1000, 1700, 2600] },
      { id: 'stumpTarget', icon: 'marker_wicket', key: 'stump', balls: 18, golden: true, targets: { every: 1, onTarget: 60 },
        medals: [700, 1400, 2300, 3300] },
      { id: 'survivalRush', icon: 'marker_hat_trick', key: 'survival', balls: 60, golden: true, lives: 3, loseLife: ['four', 'six'],
        ramp: { every: 6, stat: 4, max: 40 },
        medals: [500, 1100, 2000, 3200] },
      { id: 'perfectLine', icon: 'bowl_yorker', key: 'perfect', balls: 18, golden: false, perfectOnly: true, lineBonus: 30,
        medals: [400, 850, 1500, 2300] },
      { id: 'bossBatter', icon: 'icon_golden_wicket', key: 'boss', balls: 18, golden: true,
        boss: { rival: 'wall', stat: 82, lives: 3, bonus: 1000, wicketMult: 2 },
        medals: [500, 1100, 1900, 2900] },
    ],
  },
};
