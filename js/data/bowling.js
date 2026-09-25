// Cricket Arcade — bowling + Wicket Rush tuning data (M02, plan 6.2 / 7.7 / 17).
// Same world units as batting.js (metres; batter's stumps at z = 0, +x = off side).

const BOWLING_DATA = {
  // ---- Step 1: bowling families, 4 deliveries each (plan 6.2 / 8.2) --------
  // Directions are for a right-handed batter: +x = off side, -x = leg side.
  //   zone    = the length (bounce z) this delivery wants; the reticle is pulled
  //             gently toward it ("snaps toward useful zones, never auto-aims").
  //   snap    = how strongly (0..1) the aim is pulled into the zone.
  //   speed   = multiplier on the family's pace.
  //   bounce  = how high it kicks off the pitch (restitution).
  //   seam    = random sideways movement off the pitch (m/s, either way).
  //   swing   = sideways curve in the air before it pitches (m/s², signed).
  //   turn    = sideways spin off the pitch (m/s, signed; + = toward off side).
  //   skid    = pace kept through the bounce (default BATTING_DATA.delivery.bounceSpeedKeep).
  //   swipe   = the post-release swipe (Step 4) can add movement to this ball.
  //   threat  = how much this ball threatens the stumps when it is on target
  //             (feeds the "bowled" chance, see PLAYER_DATA.duel.beaten).
  //   batterTimingBias = pushes the AI batter's timing (negative = early, fooled by pace change).
  //   ai      = how often a computer bowler of this family picks it.
  families: {
    fast: {
      id: 'fast', nameKey: 'bowl.family.fast', icon: 'bowl_stock', kind: 'pace',
      speed: [18.5, 26.5], releaseX: 0.35, releaseHeight: 2.15, powerTo: 'pace',
      deliveries: [
        { id: 'stock',   icon: 'bowl_stock',   zone: [4.0, 7.0],  snap: 0.2,  speed: 1.0,  bounce: 0.58, seam: 0.45, threat: 1.0,  batterTimingBias: 0,      ai: 50 },
        { id: 'yorker',  icon: 'bowl_yorker',  zone: [0.8, 1.9],  snap: 0.45, speed: 1.03, bounce: 0.52, seam: 0.2,  threat: 1.6,  batterTimingBias: 0,      ai: 18 },
        { id: 'bouncer', icon: 'bowl_bouncer', zone: [8.0, 10.0], snap: 0.45, speed: 1.05, bounce: 0.78, seam: 0.2,  threat: 0.3,  batterTimingBias: 0.01,   ai: 14 },
        { id: 'slower',  icon: 'bowl_slower',  zone: [3.5, 6.5],  snap: 0.2,  speed: 0.72, bounce: 0.56, seam: 0.3,  threat: 1.1,  batterTimingBias: -0.075, ai: 18 },
      ],
    },
    swing: {
      id: 'swing', nameKey: 'bowl.family.swing', icon: 'bowl_swing', kind: 'pace',
      speed: [17.5, 24.5], releaseX: 0.35, releaseHeight: 2.1, powerTo: 'pace',
      deliveries: [
        { id: 'seam',     icon: 'bowl_swing',    zone: [4.0, 6.8], snap: 0.2, speed: 1.0,  bounce: 0.6,  seam: 0.75, threat: 1.05, batterTimingBias: 0,     swipe: true, ai: 40 },
        { id: 'inswing',  icon: 'bowl_inswing',  zone: [2.6, 5.6], snap: 0.3, speed: 0.98, bounce: 0.57, seam: 0.2,  swing: -1.5, threat: 1.4, batterTimingBias: 0, swipe: true, ai: 25 },
        { id: 'outswing', icon: 'bowl_outswing', zone: [2.6, 5.6], snap: 0.3, speed: 0.98, bounce: 0.57, seam: 0.2,  swing: 1.5,  threat: 0.75, batterTimingBias: 0, swipe: true, ai: 25 },
        { id: 'cutter',   icon: 'bowl_cutter',   zone: [4.5, 7.5], snap: 0.25, speed: 0.86, bounce: 0.6, seam: 0.15, turn: -1.3, threat: 1.15, batterTimingBias: -0.04, swipe: true, ai: 15 },
      ],
    },
    offspin: {
      id: 'offspin', nameKey: 'bowl.family.offspin', icon: 'bowl_spin', kind: 'spin',
      speed: [12.8, 16.4], releaseX: 0.3, releaseHeight: 1.95, powerTo: 'spin',
      deliveries: [
        { id: 'offbreak',   icon: 'bowl_spin',        zone: [3.2, 5.8], snap: 0.25, speed: 1.0,  bounce: 0.62, seam: 0.1, turn: -2.1, threat: 1.3,  batterTimingBias: 0,     swipe: true, ai: 45 },
        { id: 'armball',    icon: 'bowl_arm_ball',    zone: [3.0, 5.4], snap: 0.25, speed: 1.12, bounce: 0.5,  seam: 0.1, swing: 0.7, skid: 0.97, threat: 1.2, batterTimingBias: 0.03, swipe: false, ai: 20 },
        { id: 'topspinner', icon: 'bowl_top_spinner', zone: [3.4, 6.0], snap: 0.25, speed: 0.96, bounce: 0.74, seam: 0.1, turn: -0.3, threat: 0.9, batterTimingBias: -0.02, swipe: true, ai: 15 },
        { id: 'doosra',     icon: 'bowl_googly',      zone: [3.2, 5.8], snap: 0.25, speed: 1.0,  bounce: 0.62, seam: 0.1, turn: 2.0,  threat: 0.95, batterTimingBias: 0,   swipe: true, ai: 20 },
      ],
    },
    legspin: {
      id: 'legspin', nameKey: 'bowl.family.legspin', icon: 'bowl_spin', kind: 'spin',
      speed: [12.5, 16.0], releaseX: 0.3, releaseHeight: 1.95, powerTo: 'spin',
      deliveries: [
        { id: 'legbreak',   icon: 'bowl_spin',        zone: [3.2, 6.0], snap: 0.25, speed: 1.0,  bounce: 0.64, seam: 0.1, turn: 2.3,  threat: 0.9,  batterTimingBias: 0,     swipe: true, ai: 45 },
        { id: 'googly',     icon: 'bowl_googly',      zone: [3.2, 5.8], snap: 0.25, speed: 0.98, bounce: 0.64, seam: 0.1, turn: -2.0, threat: 1.35, batterTimingBias: 0,     swipe: true, ai: 22 },
        { id: 'topspinner', icon: 'bowl_top_spinner', zone: [3.4, 6.0], snap: 0.25, speed: 0.96, bounce: 0.76, seam: 0.1, turn: 0.3,  threat: 0.9,  batterTimingBias: -0.02, swipe: true, ai: 15 },
        { id: 'flipper',    icon: 'bowl_arm_ball',    zone: [3.0, 5.2], snap: 0.3,  speed: 1.14, bounce: 0.46, seam: 0.05, skid: 0.98, threat: 1.3, batterTimingBias: 0.035, swipe: false, ai: 18 },
      ],
    },
  },
  familyOrder: ['fast', 'swing', 'offspin', 'legspin'],

  // ---- Step 4: movement swipe after release (plan 6.2) --------------------
  // A short sideways swipe straight after letting go adds up to 'extra' of the
  // delivery's own swing / turn (forgiving: any swipe helps, a swipe the same
  // way as the ball's natural movement helps most). For balls with no natural
  // direction (seam) the swipe picks the way it moves.
  swipe: {
    window: 0.34,              // seconds after release the swipe is accepted
    fullPx: 200,               // this much thumb travel = a full swipe
    minPx: 24,
    extra: 0.65,               // up to +65% of the natural movement
    againstFactor: 0.35,       // a swipe against the natural way still adds a little
    seamSwipe: 0.9,            // m/s of seam movement a full swipe gives a seam ball
  },

  // ---- Step 2: aim reticle --------------------------------------------------
  reticle: {
    start: { x: 0.1, z: 5.5 },
    minX: -1.5, maxX: 1.6, minZ: 0.6, maxZ: 11,
    dragX: 0.0065,              // metres per logical pixel of thumb drag (sideways)
    dragZ: 0.022,               // metres per logical pixel (up/down = length)
    keySpeedX: 1.4,             // metres per second with keyboard
    keySpeedZ: 5,
    // Dragging UP the screen moves the target UP the screen, i.e. toward the
    // batter (a fuller length). Settings > "Bowling aim" can flip it.
    // Settings > "Aim sensitivity" scales the drag.
    sensitivity: { low: 0.65, normal: 1, high: 1.4 },
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
    scatter: { perfect: 0.05, good: 0.2, loose: 0.48 },   // aim error (metres)
    // Release quality also changes how much the ball moves: a Perfect release
    // keeps full swing/spin, a Loose one loses bite.
    movement: { perfect: 1.12, good: 1.0, loose: 0.6 },
    // Spinners: power sets how much it turns (and a little pace).
    spinPower: { turn: [0.6, 1.2], pace: [0.92, 1.04] },
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

  // ---- LBW (plan 7.5) ------------------------------------------------------
  // A ball that beats the bat (missed, beaten or left) and would go on to hit
  // the stumps can hit the pad first. If it's in line with the stumps (the ball
  // is inside the pad corridor at the batter) and low enough, it's LBW, unless
  // it PITCHED outside leg stump (then it's not out).
  // padChance = how often the pad is actually in the way of such a ball (the
  // rest go past the pad and hit the stumps: bowled). This sets how common LBW
  // is. Aim: roughly 1 in 8–10 wickets. Leaving the ball = pads right there.
  lbw: {
    padMinX: -0.32, padMaxX: 0.2, maxY: 0.8,
    padChance: 0.26,
    padChanceLeave: 0.5,
    thudPause: 0.55,           // ball thuds into the pad, pause, then the finger goes up
  },
  // Ball on the pad but not out (pitched outside leg / missing): a dot ball.
  // (Leg byes are left for later.)

  // ---- Hit wicket (rare) -----------------------------------------------------
  // Only a badly mistimed, wild swing from a batter with poor Contact and
  // Composure can knock their own stumps over. Aim: about 1 in 40 wickets.
  //   chance = shot[shotId] * grade[grade] * weakness²
  //   weakness = max(0, (safeAbove - average of Contact and Composure) / safeAbove)
  hitWicket: {
    shot: { power: 0.55, control: 0.1, defend: 0 },
    grade: { miss: 1, late: 0.55, early: 0.4, good: 0, perfect: 0 },
    safeAbove: 56,
  },

  feel: {
    outcomeHold: 1.15,
    wicketHoldExtra: 0.45,
    ballsBetween: 0.45,
  },
};

// Wicket Rush and the home screen use the fast bowler's four deliveries.
BOWLING_DATA.deliveries = BOWLING_DATA.families.fast.deliveries;

// ---- Wicket Rush rules (plan 17) ---------------------------------------------
const WICKET_RUSH_DATA = {
  classic: {
    id: 'wicketRush18',
    balls: 18,                   // legal deliveries
    points: {
      bowled: 150,
      lbw: 150,
      hitwicket: 150,
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
