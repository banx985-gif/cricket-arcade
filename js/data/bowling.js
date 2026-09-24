// Cricket Arcade — bowling + Wicket Rush tuning data (M02, plan 6.2 / 7.7 / 17).
// Same world units as batting.js (metres; batter's stumps at z = 0, +x = off side).

const BOWLING_DATA = {
  // ---- Step 1: delivery types (fast-bowler set, plan 6.2) -----------------
  // zone    = the length (bounce z) this delivery wants; the reticle is pulled
  //           gently toward it ("snaps toward useful zones, never auto-aims").
  // snap    = how strongly (0..1) the aim is pulled into the zone.
  // speed   = multiplier on pace from the BOWL charge.
  // bounce  = how high it kicks off the pitch.
  // batterTimingBias = pushes the AI batter's timing (negative = early, fooled by pace change).
  deliveries: [
    { id: 'stock',   icon: 'bowl_stock',   zone: [4.0, 7.0],  snap: 0.2,  speed: 1.0,  bounce: 0.58, seam: 0.45, batterTimingBias: 0 },
    { id: 'yorker',  icon: 'bowl_yorker',  zone: [0.8, 1.9],  snap: 0.45, speed: 1.03, bounce: 0.52, seam: 0.2,  batterTimingBias: 0 },
    { id: 'bouncer', icon: 'bowl_bouncer', zone: [8.0, 10.0], snap: 0.45, speed: 1.05, bounce: 0.78, seam: 0.2,  batterTimingBias: 0.01 },
    { id: 'slower',  icon: 'bowl_slower',  zone: [3.5, 6.5],  snap: 0.2,  speed: 0.72, bounce: 0.56, seam: 0.3,  batterTimingBias: -0.075 },
  ],

  // ---- Step 2: aim reticle --------------------------------------------------
  reticle: {
    start: { x: 0.1, z: 5.5 },
    minX: -1.5, maxX: 1.6, minZ: 0.6, maxZ: 11,
    dragX: 0.0065,              // metres per logical pixel of thumb drag (sideways)
    dragZ: 0.022,               // metres per logical pixel (up/down = length)
    keySpeedX: 1.4,             // metres per second with keyboard
    keySpeedZ: 5,
  },

  // ---- Step 3: hold BOWL to charge, release in the band ---------------------
  // The bowler runs in while BOWL is held; the meter fills 0 -> 1 in fillTime
  // then keeps creeping into the red. Letting go = the ball is released.
  charge: {
    fillTime: 1.05,
    max: 1.2,                    // held this long = overstep (no-ball), auto-release
    perfect: [0.86, 0.96],
    good: [0.72, 1.03],
    noBallAbove: 1.08,           // released past this = overstepped
    minPower: 0.3,               // meter value that gives the slowest ball
    speed: [18.5, 26.5],         // sim speed range (m/s) from weakest to full charge
    scatter: { perfect: 0.05, good: 0.2, loose: 0.48 },   // aim error (metres)
    releaseX: 0.35,
  },

  wide: { offX: 1.0, legX: -0.8 },   // ball this far out at the batter = wide

  // ---- AI batter (plan 7.7) -------------------------------------------------
  // The "default balanced challenge batter" (plan 17.7).
  aiBatter: {
    name: 'balanced',
    timingSigma: 0.05,           // spread of their timing error (seconds) on an easy ball
    aggression: 0.42,            // base chance of going for POWER
    defendWhenHard: 0.45,        // chance of blocking a really hard ball
    leaveOutsideOff: 0.55,       // chance of leaving a ball outside off stump that misses the stumps
    difficulty: {                // how hard each length is to play (adds to timing spread)
      yorker: 0.9, full: -0.1, good: 0.45, short: 0.3,
    },
    corridorBonus: 0.3,          // ball on/just outside off stump (x 0..0.4 at the stumps)
    releaseGrade: { perfect: 0.3, good: 0.1, loose: -0.25 },
    pressureEffect: 0.7,         // at full pressure, this much extra difficulty
    difficultyToSigma: 1.5,      // sigma = timingSigma * (1 + difficulty * this)
    weakness: { id: 'yorker', extra: 0.25 },
  },

  // Pad zone for LBW: a ball the batter misses that would hit the stumps is
  // LBW (not bowled) if it hits the batter's pads first.
  lbwPads: { minX: -0.62, maxX: 0.02, maxY: 0.75 },

  feel: {
    outcomeHold: 1.15,
    wicketHoldExtra: 0.45,
    ballsBetween: 0.45,
  },
};

// ---- Wicket Rush rules (plan 17) ---------------------------------------------
const WICKET_RUSH_DATA = {
  classic: {
    id: 'wicketRush18',
    balls: 18,                   // legal deliveries
    points: {
      bowled: 150,
      lbw: 150,
      caught: 100,
      dot: 15,
      extra: 30,                 // wides / no-balls cost this many points
      perfectRelease: 10,        // bonus for a PERFECT release that isn't hit for runs
    },
    // Consecutive-wicket combo: wickets build it; boundaries and extras knock it
    // down a step; dots and singles keep it (plan 17.1 / 17.2).
    combo: [
      { min: 0, mult: 1 },
      { min: 2, mult: 2 },
      { min: 3, mult: 3 },
      { min: 5, mult: 4 },
    ],
    pressure: { dot: 0.18, perRun: -0.06, boundary: -0.35, wicket: -0.25, extra: -0.15 },
    freeHitAfterNoBall: true,
  },
  hooks: {
    goldenWicket: { enabled: false, pressureNeeded: 0.8, multiplier: 3 },
    stumpTargets: { enabled: false },
  },
};
