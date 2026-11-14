// Cricket Legends (M17 Job 1) - live text commentary: one caption line during play.
// The lines themselves are in the strings table as comm.<kind>.1 .. comm.<kind>.<variants>.
// game/commentary.js picks a line for each ball from what really happened
// (the shot, where it went, the fielder who caught it, the bowler's type).

const COMM_DATA = {
  variants: 8,                 // lines per kind (comm.<kind>.1..8); none repeats until all 8 are used
  hold: 2.3,                   // seconds a line stays up (the next line in the queue follows)
  holdShort: 1.4,              // ... when another line is waiting
  fade: 0.25,                  // fade in / out (seconds)
  maxQueue: 3,                 // result line + up to two follow-ups (milestone, situation)
  crowd: { chance: 0.35 },     // M19: your side's boundary / wicket: how often the home crowd line is heard (origins' crowdLines)

  // What a ball can be called (all need comm.<kind>.1..8).
  kinds: {
    result: ['dot', 'defended', 'beaten', 'single', 'runs', 'four', 'edgeFour', 'six', 'caught', 'caughtKeeper',
      'bowled', 'lbw', 'runout', 'hitwicket', 'stumped', 'byes', 'wide', 'noball', 'notOut'],
    milestone: ['fifty', 'hundred', 'hatTrickOn', 'threeWkts', 'newBatter'],
    situation: ['lastOver', 'chase', 'lastBall', 'freeHit', 'overRuns'],
  },

  // Where the ball went: the angle from straight down the ground (degrees, + = off side
  // for a right-hander, as in data/fields.js). The first band it fits is used.
  areas: [
    { id: 'straight', max: 15 },
    { id: 'cover', side: 'off', max: 50 }, { id: 'point', side: 'off', max: 100 }, { id: 'third', side: 'off', max: 181 },
    { id: 'midwicket', side: 'leg', max: 50 }, { id: 'square', side: 'leg', max: 100 }, { id: 'fine', side: 'leg', max: 181 },
  ],
  // The name of the shot from the button pressed and where it went (comm.shot.<name>).
  shots: {
    control: { straight: 'drive', cover: 'coverDrive', point: 'cut', third: 'glide', midwicket: 'flick', square: 'clip', fine: 'glance' },
    power: { straight: 'loft', cover: 'loftedDrive', point: 'slash', third: 'upperCut', midwicket: 'slog', square: 'pull', fine: 'hook' },
    defend: { straight: 'push', cover: 'push', point: 'push', third: 'push', midwicket: 'push', square: 'push', fine: 'push' },
  },
  // Every fielding position that can take a catch (comm.pos.<id>).
  positions: ['keeper', 'slip', 'slip2', 'gully', 'point', 'cover', 'extraCover', 'midOff', 'midOn', 'midwicket', 'squareLeg',
    'fineLeg', 'shortFine', 'thirdMan', 'shortThird', 'deepSquare', 'deepBackSquare', 'deepMidwicket', 'deepCover', 'deepPoint',
    'longOn', 'longOff', 'shortLeg', 'legSlip', 'sillyPoint', 'bowler'],
  // Bowler types (comm.type.<family>; anything else uses comm.type.<pace|spin>).
  types: ['fast', 'swing', 'offspin', 'legspin'],

  // When the situation is worth a line.
  situation: {
    chaseBalls: 18,            // a chase line in the last 3 overs ...
    chaseMaxRate: 2.4,         // ... while it's still on (need <= balls x this)
    overRunsFirstInnings: true, // the first innings: a score update at the end of each over
  },
  hatTrickAfter: 2,            // wickets in consecutive legal balls by one bowler
  threeWkts: 3,
};
