// Cricket Arcade — batting / ball / field tuning data.
// Every gameplay number for the batting slice lives here, so balance can be
// changed without touching logic.
//
// WORLD UNITS: metres. Batter's stumps at z = 0, bowler's stumps at z = 20.12.
// +z points up the pitch toward the bowler. +x is the batter's OFF side
// (right-handed batter), which appears on the RIGHT of the screen. y is up.
// Angles for hit direction: 0° = straight back past the bowler, +90° = square
// on the off side, -90° = square on the leg side, ±180° = behind the keeper.

const BATTING_DATA = {
  physics: {
    gravity: 9.81,
    ballRadius: 0.036,
    bounceRestitution: 0.55,   // vertical energy kept on a bounce (hit balls)
    bounceFriction: 0.78,      // horizontal speed kept on a bounce (hit balls)
    rollDecel: 3.2,            // m/s² slowdown while rolling
    airDrag: 0.018,            // fraction of speed lost per second in the air
    maxSimTime: 9,             // seconds a hit ball is simulated before forcing an end
  },

  pitch: {
    length: 20.12,
    width: 3.05,
    creaseZ: 1.22,             // batter's popping crease
    stumpsHalfWidth: 0.114,
    stumpsHeight: 0.71,
    contactZ: 1.3,             // where the bat meets the ball (ideal timing moment)
    batterX: -0.42,            // batter stands a little leg side of the stumps
    reachCentreX: 0.12,        // centre of the batter's hitting reach
    reachHalfWidth: 0.95,      // ball further than this from reach centre = out of reach
    reachMaxHeight: 2.1,
    keeperZ: -9,               // an unplayed delivery ends here (keeper takes it)
  },

  // ---- Bowling (seeded) --------------------------------------------------
  delivery: {
    releaseZ: 18.6,
    releaseHeight: 2.15,
    releaseX: [0.15, 0.55],    // bowler's arm position range (over the wicket)
    speed: [19.5, 26.5],       // SIM speed in m/s (arcade-slowed so humans can time it)
    displayKmhPerMs: 5.1,      // shown km/h = sim speed × this (reads as 100–135 km/h)
    // Where the ball would cross the stumps line, before movement.
    line: [-0.28, 0.42],
    lengths: [
      { id: 'yorker', weight: 8,  bounceZ: [0.9, 2.0] },
      { id: 'full',   weight: 32, bounceZ: [2.2, 4.4] },
      { id: 'good',   weight: 40, bounceZ: [4.4, 7.0] },
      { id: 'short',  weight: 20, bounceZ: [7.0, 9.8] },
    ],
    bounceRestitution: [0.52, 0.66],  // how high it kicks off the pitch
    bounceSpeedKeep: 0.9,             // pitch takes a little pace off
    movement: [-0.9, 0.9],            // sideways m/s added at the bounce (seam)
    runUpTime: 1.05,                  // seconds of run-up before release
    runUpStartZ: 29,
    betweenBalls: 0.5,                // pause before the next run-up starts
  },

  // ---- Timing windows (seconds either side of the ideal moment) ----------
  // |error| <= perfect -> PERFECT, <= good -> GOOD, <= edge -> EARLY/LATE,
  // beyond -> MISS.
  shots: {
    control: {
      window: { perfect: 0.045, good: 0.095, edge: 0.165 },
      speed:  { perfect: 26, good: 23.5, early: 17, late: 15 },
      loft:   { up: 34, neutral: 4, down: 1 },    // launch angle in degrees
      edgeChance: { perfect: 0, good: 0.03, early: 0.18, late: 0.28 },
      directionJitter: 5,
    },
    power: {
      window: { perfect: 0.04, good: 0.085, edge: 0.15 },
      speed:  { perfect: 35, good: 31, early: 24, late: 21 },
      loft:   { up: 40, neutral: 31, down: 6 },
      edgeChance: { perfect: 0, good: 0.04, early: 0.24, late: 0.34 },
      directionJitter: 8,
    },
    defend: {
      window: { perfect: 0.07, good: 0.14, edge: 0.22 },
      speed:  { perfect: 7, good: 6, early: 5, late: 4.5 },
      loft:   { up: 4, neutral: 1, down: 0 },
      edgeChance: { perfect: 0, good: 0, early: 0.08, late: 0.12 },
      directionJitter: 20,
    },
  },

  direction: {
    maxAim: 95,              // full stick left/right aims this far (degrees)
    autoFromLine: 70,        // no stick: off-side balls go off side (deg per metre)
    earlyPull: -28,          // early timing drags the ball toward leg side
    latePush: 30,            // late timing pushes it toward off side
    edgeAngle: [148, 172],   // edges fly fine behind the stumps (off side mostly)
    insideEdgeChance: 0.25,  // fraction of edges that go leg side instead
    edgeSpeed: [13, 21],
    edgeLoft: [4, 22],
    highBallExtraLoft: 8,    // chest-high balls fly up more
    gapAssist: 9,            // aimed shots are nudged up to this many degrees away from a fielder
  },

  // ---- Sixes are earned (M15 Job 3b; game/sixrules.js). Real matches only, not Six Smash. ----
  // A lofted hit's speed is multiplied by: grade x matchup x fit x release (x same-spot) +- spread.
  // Range grows with speed squared: about 0.77 is needed to clear a 66-75 m rope.
  sixes: {
    lofted: 18,                     // launch angle (degrees) from which a hit counts as a loft
    grade: { perfect: 0.805, good: 0.68 },
    notPerfectCap: 0.72,            // a not-perfect loft never carries the rope (2, 4 or a catch out deep)
    goodLoftAdd: -9,                // ...and it comes out flatter: over the infield, into the deep
    power: 0.07,                    // Power on a loft: speed +-7% from Power 1 to 99 (replaces the duel's power boost)
    skied: { speed: 0.55, loftAdd: 18 },   // a mistimed loft goes straight up
    spread: 0.05,                   // +- this much from ball to ball
    gap: { perPoint: 0.0018, min: 0.9, max: 1.12 },    // batting v this bowler's bowling
    release: { perfect: 0.95, good: 1, loose: 1.05, ai: 1 },
    fit: {                          // is a loft the right shot for this ball?
      length: { yorker: 0.8, full: 1, good: 0.92, short: 0.88 },
      pull: 0.98,                   // a short ball pulled or hooked to leg
      crossDeg: 20, wideOff: 0.35, onLegs: -0.08, crossLine: 0.93, variation: 0.95,
    },
    repeat: { withinDeg: 22, k: 0.95 },   // the same spot as the last boundary
    // Perfect-timing window in matches (x the duel's window): base, matchup, difficulty.
    window: { base: 0.72, perGap: 0.008, min: 0.7, max: 1.35, difficulty: { rookie: 1.1, pro: 1, legend: 0.85 } },
    // After a boundary: the bowler changes plan for a few balls, the captain moves a fielder back.
    fightBack: { balls: 2, sameType: 0.25, favour: ['slower', 'bouncer', 'yorker', 'cutter', 'armball', 'googly', 'flipper'], favourK: 1.8,
      widerChance: 0.45, widerLine: [0.3, 0.5], deepRadius: 61 },
  },

  // ---- Field --------------------------------------------------------------
  field: {
    boundaryRadius: 66,
    boundaryCentreZ: 10.06,    // middle of the pitch
    fielderSpeed: 6.6,         // m/s
    reaction: 0.32,            // seconds before a fielder starts moving
    reach: 1.5,                // diving/stretching reach in metres
    catchMaxHeight: 2.7,       // above this the ball sails over their hands
    catchMinHeight: 0.15,
    catchSkill: 0.82,          // chance a comfortable catch is held
    hardCatchPenalty: 0.35,    // taken off catchSkill for a full-stretch catch
    // M15 3b: running catches are harder the further the fielder ran (up to penalty at metres),
    // and a catch within ropeWithin metres of the rope loses rope more.
    runCatch: { metres: 18, penalty: 0.3, ropeWithin: 4, rope: 0.12 },
    groundPickupMaxHeight: 1.1,
    // Hard-hit ground balls can beat a fielder (misfield / through the hands).
    cleanStop: [
      { minSpeed: 22, chance: 0.45 },
      { minSpeed: 15, chance: 0.75 },
    ],
    minLoftForCatch: 9,        // degrees; flat drives are not catchable
    runs: { oneRunAfter: 1.5, twoRunsAfter: 3.4 }, // seconds until fielded
    // Ten fielders including the keeper (the bowler makes eleven).
    positions: [
      { id: 'keeper',      x: 0.25,  z: -9,   keeper: true },
      { id: 'slip',        x: 1.7,   z: -10 },
      { id: 'point',       x: 21,    z: 1 },
      { id: 'cover',       x: 19,    z: 14 },
      { id: 'midOff',      x: 14,    z: 31 },
      { id: 'midOn',       x: -14,   z: 31 },
      { id: 'midwicket',   x: -20,   z: 11 },
      { id: 'deepSquare',  x: -52,   z: 4 },
      { id: 'longOn',      x: -22,   z: 62 },
      { id: 'longOff',     x: 24,    z: 62 },
    ],
    bowlerFollowThroughZ: 15.5,
    bowlerFields: false,       // arcade: the bowler gets out of the way of straight drives
  },

  // ---- Camera / presentation ---------------------------------------------
  // M16: the code-drawn swing (straight bat, down the line). Angles in radians in the swing plane:
  // 0 = bat pointing straight down, + = back towards the keeper, - = towards the bowler / up.
  // side = how far the bat leans across the screen (+ = off side).
  swing: {
    stance: 0.3, stanceSide: -0.3, backlift: 2.55, backliftSide: 0.22, backliftTime: 0.35,
    control: { contactAt: 0.55, finish: -2.0, finishSide: -0.3 },      // checked drive: finish high
    power:   { contactAt: 0.5, finish: -2.75, finishSide: -0.4 },      // lofted hit: big, full finish over the shoulder
    defend:  { contactAt: 0.85, finish: -0.25, finishSide: -0.05 },    // dead bat: stops at the ball
  },
  // M16: playing the rendered action frames (pitchscene.js).
  // sizeK: drawn this much bigger than life, like the rest of the game's players.
  // stride: each bowling action starts at `from` of the run-up (before that the run-up cycle plays);
  //   its first frame shows him `back` metres behind the release spot. followTime = follow-through seconds.
  // stanceFps: the stance's little bat tap. pick: which batting action a shot plays (degrees from straight,
  //   + = off side): cut from cutFrom, pull / sweep (spin) from legFrom, a ball this high (m) gets pulled,
  //   aiming up this far (-1..0) lofts it. backFromZ: fielders further up the pitch than this are seen from behind.
  //   Catch / throw / keeper: seconds before and after the moment of the catch / release / take.
  anim: {
    sizeK: 1.3, followTime: 0.4, stanceFps: 5,
    stride: { bowl_fast: { from: 0.8, back: 2.0 }, bowl_spin: { from: 0.86, back: 1.4 } },
    pick: { cutFrom: 50, legFrom: -45, highBall: 1.15, loftAim: -0.5 },
    backFromZ: 0,
    catchBefore: 0.4, catchAfter: 0.6, throwBefore: 0.35, throwAfter: 0.35,
    keeperDelay: 0.3, keeperRise: 0.35, keeperAfter: 0.4, keeperHitFrame: 2,
  },
  camera: {
    pitch: { pos: [1.3, 7.5, 33], target: [0.1, 0.3, 3.5], focal: 2700 },
    follow: { height: 20, back: 34, focal: 1350, lead: 0.3, cutDelay: 0.18 },
    // Highlight camera (plan 7.11): low, beside the stumps, for bowled / hit wicket.
    highlight: { pos: [4.4, 1.2, 5.6], target: [-0.3, 0.5, -0.2], focal: 1600, hold: 1.25 },
    followEase: 3.2,
    resetEase: 5,
    ballDrawScale: 3.8,        // balls are drawn bigger than life so they read on a phone
    minBallPx: 8,
    farBallGlow: true,         // soft halo so a far-away ball stays easy to spot
  },

  feel: {
    perfectSlowMo: { duration: 0.42, scale: 0.28 },
    perfectShake: { amp: 16, dur: 0.35 },
    goodShake: { amp: 6, dur: 0.18 },
    wicketShake: { amp: 12, dur: 0.3 },
    showTimingRing: true,
    outcomeHold: 1.15,         // seconds the result shows before the next ball (a tap skips it)
    sixHoldExtra: 0.35,
  },
};
