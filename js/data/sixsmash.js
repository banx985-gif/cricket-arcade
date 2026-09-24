// Cricket Arcade — Six Smash rules data (plan 16).
// Point values and combo tiers are balance data, not logic.

const SIX_SMASH_DATA = {
  classic: {
    id: 'classic20',
    balls: 20,
    points: {
      six: 100,
      four: 40,
      run: 10,              // per run on a non-boundary hit
      perfectBonus: 25,     // extra for PERFECT timing on a scoring shot
      wicketPenalty: 50,    // a wicket costs this many points (score never below 0)
    },
    // Consecutive-six combo multiplier (plan 16.2). "min" = six streak length.
    combo: [
      { min: 1,  mult: 1 },
      { min: 3,  mult: 2 },
      { min: 5,  mult: 3 },
      { min: 8,  mult: 4 },
      { min: 11, mult: 5 },
    ],
    multiplierAppliesTo: ['six'],
    // Anything that is not a six resets the streak; a wicket also costs points.
  },

  // ---- Hooks only (M01) --------------------------------------------------
  // These flags exist so later milestones can switch the features on without
  // re-plumbing. Only the Golden Ball multiplier is wired (dev panel can force it).
  hooks: {
    goldenBall: { enabled: false, chance: 0.06, multiplier: 3 },
    targetZones: { enabled: false, zones: [] },
    fever: { enabled: false, lastBalls: 5, threshold: 1200, extraMult: 1 },
  },
};
