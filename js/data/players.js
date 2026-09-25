// Cricket Arcade — player stats and how they drive every ball (plan 9, 7.2, 7.7, 7.15).
// Every batter and bowler, on both sides, has a full 1–99 stat block. Timing is
// still the skill: stats scale how forgiving and how strong that skill is.
// Every duel is the batter's stats against the bowler's. All tuning is here.
//
// A stat is turned into a number around 0 before it's used:
//   n = (stat - 50) / 50        so 50 = 0 (average), 90 = +0.8, 30 = -0.4

const PLAYER_DATA = {
  stats: {
    batting: ['power', 'contact', 'placement', 'timing', 'composure'],
    bowling: ['delivery', 'accuracy', 'movement', 'deception', 'control'],
    shared: ['fielding', 'fitness', 'running'],
  },

  // ---- Generated teams (plan 7.16) -------------------------------------------
  // Each side is 11 players. The batting order decides who bats well and who
  // bowls: 'bat' / 'bowl' multiply the team's rating for that player's batting
  // and bowling stats. Bowlers get a family; there are always at least 5
  // bowlers with a mix of pace, swing and spin.
  teams: {
    lineup: [
      { role: 'bat',   bat: 1.06, bowl: 0.45 },
      { role: 'bat',   bat: 1.04, bowl: 0.45 },
      { role: 'bat',   bat: 1.08, bowl: 0.45 },
      { role: 'bat',   bat: 1.05, bowl: 0.5 },
      { role: 'bat',   bat: 1.0,  bowl: 0.5, keeper: true },
      { role: 'all',   bat: 0.95, bowl: 0.92, families: ['swing', 'fast'] },
      { role: 'all',   bat: 0.9,  bowl: 0.95, families: ['offspin', 'legspin'] },
      { role: 'bowl',  bat: 0.7,  bowl: 1.05, families: ['fast'] },
      { role: 'bowl',  bat: 0.6,  bowl: 1.04, families: ['swing', 'fast'] },
      { role: 'bowl',  bat: 0.55, bowl: 1.05, families: ['legspin', 'offspin'] },
      { role: 'bowl',  bat: 0.5,  bowl: 1.06, families: ['fast'] },
    ],
    statSpread: 7,              // each stat is the player's level +/- this (seeded)
    offRoleStat: [18, 30],      // stats a player doesn't use (a batter's bowling)
    shared: { spread: 12 },     // fielding / fitness / running around the team level
    leftHanded: 0.25,           // (handedness is recorded; mirroring arrives with the 3D art)
  },

  // Team strength for a Quick Match. 'player' = your XI, 'ai' = the Rivals.
  difficulty: {
    easy:   { player: 52, ai: 40 },
    normal: { player: 52, ai: 52 },
    hard:   { player: 52, ai: 64 },
  },
  quickMatchDifficulty: 'normal',

  // ---- The duel: batter against bowler ---------------------------------------
  duel: {
    // How big the batter's timing windows are (x the shot's windows in batting.js).
    // + batter Timing, - bowler Delivery (pace or spin), - pressure unless Composure.
    window: { timing: 0.34, delivery: 0.24, pressure: 0.22, composureSaves: 0.8, fatigue: 0.35, min: 0.55, max: 1.5 },
    // Spin gives the batter a touch more time than pace (window x this).
    spinWindow: 1.08,
    // AI batter timing spread (x its sigma): + bowler, - batter.
    aiSigma: { timing: 0.36, delivery: 0.3, deception: 0.16, min: 0.5, max: 1.9 },
    aiPressure: { composureSaves: 0.7 },        // pressure hurts less with Composure
    // Edge chance multiplier: - Contact, + Movement / Deception.
    edge: { contact: 0.5, movement: 0.32, deception: 0.15, min: 0.35, max: 1.9 },
    // Hit speed: Power (sixes) and a little Timing.
    power: { power: 0.11, powerShotOnly: 0.05 },
    // Direction wobble multiplier: - Placement.
    placement: { placement: 0.5, min: 0.35, max: 1.6 },

    // "Beaten": a ball that would hit the stumps, and the batter swings but
    // doesn't middle it, can still beat the bat and bowl them (or hit the pad).
    // Everything counts at once:
    //   chance = grade[timing] x delivery.threat x release[grade] x shot[shotId]
    //            x line(how straight) x exp(stats x (bowler - batter))
    beaten: {
      grade: { perfect: 0, good: 0.035, early: 0.26, late: 0.3 },
      release: { perfect: 1.25, good: 1.0, loose: 0.55, ai: 1.0 },
      shot: { defend: 0.55, control: 1.0, power: 1.3 },
      middleStump: 1.12,         // dead straight
      edgeOfStumps: 0.85,        // just clipping off or leg stump
      stats: 1.1,                // how strongly the stat gap bends it
      max: 0.93,
      bowlerStats: ['delivery', 'accuracy', 'movement', 'deception'],
      batterStats: ['timing', 'contact', 'composure'],
    },

    // Bowler's release: Accuracy tightens the scatter, Delivery adds pace or
    // spin, Movement adds swing/seam/turn, Control widens the gold band.
    scatter: { accuracy: 0.45, fatigue: 0.6, min: 0.45, max: 1.8 },
    pace: { delivery: 0.07 },
    spinTurn: { delivery: 0.22, movement: 0.28 },
    movement: { movement: 0.4 },
    band: { control: 0.3, fatigue: 0.5, controlSaves: 0.6 },

    // Computer bowler's release quality (perfect / good / loose), from Control
    // and Accuracy, less when tired.
    aiRelease: { perfect: 0.3, loose: 0.22, stat: 0.18, fatigue: 0.25 },
    // Computer bowler's wides and no-balls (x MATCH_DATA.aiBowler chances).
    aiExtras: { accuracy: 0.6 },
    // Deception: when the computer's variation is shown to you, and how often
    // it isn't shown at all (the "read" chip above the bowler).
    read: { showAt: [0.3, 0.85], hideChance: 0.45 },
    // AI batter reads your variations worse when your Deception is high.
    aiRead: { deception: 0.7 },

    // Fielding: catches, clean stops, fielder speed.
    fielding: { catchSkill: 0.1, cleanStop: 0.12, speed: 0.08 },
    // Running: time for one run.
    running: { running: 0.1 },

    // The small "who has the edge" card: batting rating vs bowling rating.
    edgeCard: { even: 6 },       // within this many points = amber (even)
    // Pressure (0..1) for a batter: chases, free hits, the last over.
    pressure: { lastOver: 0.35, perReqRateAbove: 0.06, reqRateBase: 12, wicketsDown: 0.03, max: 1 },
  },

  // ---- Bowler fatigue (plan 7.15) --------------------------------------------
  fatigue: {
    perOver: 0.2,              // added for each over bowled
    fitnessSaves: 0.5,         // high Fitness reduces it (x (1 - this * fitness01))
    perHardBall: 0.012,        // extra for a full-power release
    restPerOver: 0.09,         // recovered for each over not bowling
    startsAt: 0.25,            // no penalty below this
  },

  // Overall rating (plan 9.6): role-weighted, informational only.
  overall: {
    bat: { power: 1, contact: 1, placement: 0.8, timing: 1.2, composure: 0.8 },
    bowl: { delivery: 1.1, accuracy: 1.1, movement: 1, deception: 0.8, control: 0.8 },
  },
};
