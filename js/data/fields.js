// Cricket Arcade — field settings (a design change from Aaron, M04b B3).
// Preset layouts only: no drag-every-fielder editor. Pick one in the bowler
// picker before an over, or let the computer choose. Some presets are earned.
//
// Positions are for a right-handed batter, in metres: +x = off side,
// z = distance from the batter's stumps toward the bowler (negative = behind
// the batter). The keeper is always first. Ten fielders (the bowler makes 11).
// For reference: the rope is ~66 m out, the 30-yard ring ~27 m.
//
// effects (optional, modest): catch = +catch chance, stop = +clean-stop chance.
// unlock: 'always', or { quickMatchWins: n } (the same unlock system career
// stages, coaches and rewards will use later: see game/unlocks.js).

const FIELD_DATA = {
  ringRadius: 27.4,
  presets: [
    {
      id: 'balanced', icon: 'field_balanced', unlock: 'always',
      positions: [
        ['keeper', 0.25, -9], ['slip', 1.7, -10], ['point', 21, 1], ['cover', 19, 14], ['midOff', 14, 31],
        ['midOn', -14, 31], ['midwicket', -20, 11], ['deepSquare', -52, 4], ['longOn', -22, 62], ['longOff', 24, 62],
      ],
    },
    {
      id: 'attacking', icon: 'field_attacking', unlock: 'always', effects: { catch: 0.03 },
      positions: [
        ['keeper', 0.25, -9], ['slip', 1.7, -10], ['slip2', 3.3, -9.6], ['gully', 8, -5], ['shortLeg', -3.2, 2.2],
        ['point', 19, 2], ['cover', 18, 15], ['midOff', 12, 27], ['midOn', -12, 27], ['midwicket', -19, 10],
      ],
    },
    {
      id: 'defensive', icon: 'field_defensive', unlock: 'always', effects: { stop: 0.04 },
      positions: [
        ['keeper', 0.25, -9], ['deepPoint', 56, 6], ['deepCover', 44, 42], ['longOff', 22, 64], ['longOn', -22, 64],
        ['deepMidwicket', -46, 40], ['deepSquare', -55, 3], ['fineLeg', -30, -50], ['thirdMan', 34, -48], ['cover', 19, 14],
      ],
    },
    {
      id: 'spin_trap', icon: 'field_spin_trap', unlock: { quickMatchWins: 1 }, effects: { catch: 0.04 },
      positions: [
        ['keeper', 0.2, -2.2], ['slip', 1.1, -3.4], ['shortLeg', -3, 2.2], ['sillyPoint', 3.2, 2.6], ['legSlip', -1.6, -3.2],
        ['cover', 18, 14], ['midOff', 12, 26], ['midOn', -12, 26], ['midwicket', -20, 12], ['longOn', -22, 62],
      ],
    },
    {
      id: 'yorker_death', icon: 'field_yorker_death', unlock: { quickMatchWins: 2 }, effects: { stop: 0.03 },
      positions: [
        ['keeper', 0.25, -9], ['longOff', 16, 70], ['longOn', -16, 70], ['deepCover', 44, 42], ['deepMidwicket', -46, 40],
        ['deepSquare', -55, 3], ['thirdMan', 34, -48], ['fineLeg', -30, -50], ['point', 20, 1], ['cover', 18, 15],
      ],
    },
    {
      id: 'bouncer_trap', icon: 'field_bouncer_trap', unlock: { quickMatchWins: 3 },
      positions: [
        ['keeper', 0.25, -9], ['slip', 1.7, -10], ['fineLeg', -24, -54], ['deepSquare', -58, -2], ['deepBackSquare', -46, -30],
        ['midwicket', -20, 10], ['point', 20, 1], ['cover', 18, 14], ['midOff', 14, 31], ['longOff', 24, 62],
      ],
    },
    {
      id: 'off_side_ring', icon: 'field_off_side_ring', unlock: { quickMatchWins: 4 },
      positions: [
        ['keeper', 0.25, -9], ['slip', 1.7, -10], ['point', 20, 1], ['cover', 19, 13], ['extraCover', 15, 21],
        ['midOff', 10, 27], ['deepCover', 45, 40], ['midOn', -12, 28], ['midwicket', -20, 11], ['fineLeg', -28, -46],
      ],
    },
    {
      id: 'leg_side_ring', icon: 'field_leg_side_ring', unlock: { quickMatchWins: 5 },
      positions: [
        ['keeper', 0.25, -9], ['shortFine', -8, -7], ['squareLeg', -20, 2], ['midwicket', -19, 13], ['midOn', -11, 27],
        ['deepMidwicket', -46, 38], ['fineLeg', -30, -50], ['point', 20, 1], ['midOff', 12, 28], ['cover', 19, 14],
      ],
    },
    {
      id: 'powerplay_squeeze', icon: 'field_powerplay_squeeze', unlock: { quickMatchWins: 6 }, effects: { stop: 0.05 },
      positions: [
        ['keeper', 0.25, -9], ['slip', 1.7, -10], ['point', 18, 2], ['cover', 17, 13], ['midOff', 11, 24],
        ['midOn', -11, 24], ['midwicket', -17, 10], ['squareLeg', -17, 1], ['shortThird', 10, -15], ['shortFine', -9, -12],
      ],
    },
  ],

  // Powerplay (plan 7A): at most this many fielders outside the ring; any
  // extra deep fielders are brought in to the edge of the ring.
  powerplayMaxOutside: 2,

  // How the computer picks (plan 7.16): the first rule that matches (and
  // passes its chance) wins. when: phase = 'powerplay' | 'middle' | 'death';
  // kind = 'pace' | 'spin'; defending = batting side needs a lot (req. rate high).
  aiRules: [
    { when: { phase: 'powerplay' }, pick: 'powerplay_squeeze', chance: 0.55 },
    { when: { phase: 'death', kind: 'pace' }, pick: 'yorker_death', chance: 0.7 },
    { when: { kind: 'spin' }, pick: 'spin_trap', chance: 0.45 },
    { when: { family: 'fast', phase: 'middle' }, pick: 'bouncer_trap', chance: 0.2 },
    { when: { wicketsFell: true }, pick: 'attacking', chance: 0.5 },
    { when: { phase: 'death' }, pick: 'defensive', chance: 0.6 },
    { when: {}, pick: 'off_side_ring', chance: 0.2 },
    { when: {}, pick: 'balanced', chance: 1 },
  ],
};
