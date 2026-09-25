// Cricket Arcade — Missions: 48 handcrafted scenarios (plan 18). Rules in game/missions.js.
// Text: mis.<id> (name), mis.<id>.brief (the situation), mis.cast.<id> (preset players).
//
// A mission drops you into a real match at a preset moment:
//   side      'bat' (you bat) | 'bowl' (you bowl)
//   fmt       the match format (sets the powerplay / death overs)
//   at        the scoreboard when you walk in: { over, ball, runs, wkts }
//   balls     how many balls the mission lasts
//   wkts      wickets in hand (lose them all = the mission ends); default 10 - at.wkts
//   target    runs needed (bat) / runs the batters need (bowl) — reaching it ends the innings
//   super     a Super Over
//   goal      the base objective:
//               runs        score the target (bat)
//               boundaries  n boundaries (consecutive: in a row; sixes: sixes only) (bat)
//               survive     don't lose the wickets in hand before the balls run out (bat)
//               milestone   the hero reaches n personal runs (bat)
//               defend      they don't reach the target (bowl)
//               wickets     take n wickets (bowl)
//               dots        bowl n dot balls (bowl)
//               dismiss     get the rival out (bowl)
//   hero      the preset player on strike (cast id); partner = the non-striker; heroOn { runs, balls }
//   bowlers   your bowlers (cast ids) — only they can bowl
//   opp       { rating, bowl (their bowlers' level), attack [family | 'rival'] per over, rival, boost {stat: n} }
//   cond      { pitch, weather }
//   stars     3 star objectives: { stat, min } | { stat, max } | { field } (a field setting used)
//             stats: runs wktsLost boundaries sixes fours perfect dots ballsLeft techUsed heroRuns
//                    wickets bowled lbw caught runsConceded boundariesConceded extras rivalOut wk_<delivery>
//   reward    { first, perfect }: { coins } | { st } | { item } | { lm }
// Missions unlock in order inside each category; Rival opens after 6 clears, Expert after 16.
// Preset players (plan 18: difficulty comes from the scenario, not your best player).

const MISSION_DATA = {
  version: 1,
  categories: [
    { id: 'batting',  icon: 'shot_power',   colour: '#ff7a3a', opensAfter: 0 },
    { id: 'bowling',  icon: 'bowl_stock',   colour: '#3ddc84', opensAfter: 0 },
    { id: 'pressure', icon: 'hud_target',   colour: '#ffb400', opensAfter: 0 },
    { id: 'rival',    icon: 'marker_hat_trick', colour: '#ff5a5a', opensAfter: 6 },
    { id: 'expert',   icon: 'icon_golden_ball', colour: '#9b5cff', opensAfter: 16 },
  ],
  // The preset players. stat: every stat in their discipline; boost: on top; tech: their loadout.
  cast: {
    rookie:    { role: 'bat',  stat: 58, boost: {}, tech: [] },
    opener:    { role: 'bat',  stat: 68, boost: { timing: 10, contact: 8 }, tech: ['perfect_window', 'quick_starter'] },
    slugger:   { role: 'bat',  stat: 70, boost: { power: 18 }, tech: ['power_surge', 'boundary_hunter'] },
    anchor:    { role: 'bat',  stat: 70, boost: { contact: 14, composure: 14 }, tech: ['anchor', 'pressure_proof'] },
    finisher:  { role: 'bat',  stat: 74, boost: { power: 12, composure: 12 }, tech: ['finisher', 'iron_focus'] },
    spinwiz:   { role: 'bat',  stat: 72, boost: { placement: 12, timing: 8 }, tech: ['counter_spin', 'sweep_specialist'] },
    hooker:    { role: 'bat',  stat: 72, boost: { power: 10, timing: 10 }, tech: ['pull_specialist', 'fast_hands'] },
    tailender: { role: 'bat',  stat: 40, boost: {}, tech: ['last_stand'] },
    medium:    { role: 'bowl', family: 'swing',   stat: 60, boost: {}, tech: [] },
    spinner:   { role: 'bowl', family: 'offspin', stat: 60, boost: {}, tech: [] },
    express:   { role: 'bowl', family: 'fast',    stat: 74, boost: { delivery: 14, accuracy: 6 }, tech: ['deadeye_yorker', 'heat_ball'] },
    swinger:   { role: 'bowl', family: 'swing',   stat: 72, boost: { movement: 16 }, tech: ['late_swing'] },
    offie:     { role: 'bowl', family: 'offspin', stat: 70, boost: { control: 12, accuracy: 10 }, tech: ['pressure_builder'] },
    leggie:    { role: 'bowl', family: 'legspin', stat: 72, boost: { deception: 16, movement: 8 }, tech: ['googly_mastery', 'spin_burst'] },
    enforcer:  { role: 'bowl', family: 'fast',    stat: 72, boost: { delivery: 12 }, tech: ['bouncer_trap', 'heavy_ball'] },
    closer:    { role: 'bowl', family: 'fast',    stat: 74, boost: { control: 12, accuracy: 12 }, tech: ['closer', 'deadeye_yorker'] },
    maestro:   { role: 'bowl', family: 'legspin', stat: 82, boost: { deception: 10 }, tech: ['unplayable', 'googly_mastery'] },
  },
  // Rewards by difficulty (a mission can give its own).
  rewards: {
    rookie: { first: { coins: 100 }, perfect: { coins: 150 } },
    pro:    { first: { coins: 200 }, perfect: { coins: 300 } },
    legend: { first: { coins: 350 }, perfect: { st: 1 } },
  },
  // An item reward you already own becomes these coins instead.
  ownedItemCoins: 300,
  // Account-wide milestones: missions finished with all 3 stars.
  milestones: [
    { id: 'p12', perfect: 12, reward: { lm: 1 } },
    { id: 'p24', perfect: 24, reward: { item: 'acc_focus_charm' } },
    { id: 'p48', perfect: 48, reward: { mc: 1 } },
  ],

  list: [
    // ================================================================ BATTING (12)
    { id: 'bat01', cat: 'batting', diff: 'rookie', side: 'bat', fmt: 'quick5', at: { over: 0, ball: 0, runs: 0, wkts: 0 }, balls: 12, wkts: 2, target: 12,
      goal: { kind: 'runs' }, hero: 'opener', opp: { rating: 44, bowl: 46, attack: ['swing', 'offspin'] },
      stars: [{ stat: 'wktsLost', max: 0 }, { stat: 'boundaries', min: 1 }, { stat: 'ballsLeft', min: 3 }] },
    { id: 'bat02', cat: 'batting', diff: 'rookie', side: 'bat', fmt: 'quick5', at: { over: 2, ball: 0, runs: 18, wkts: 1 }, balls: 6, wkts: 1,
      goal: { kind: 'boundaries', n: 2, sixes: true }, hero: 'slugger', opp: { rating: 44, bowl: 44, attack: ['offspin'] },
      stars: [{ stat: 'wktsLost', max: 0 }, { stat: 'perfect', min: 1 }, { stat: 'ballsLeft', min: 2 }] },
    { id: 'bat03', cat: 'batting', diff: 'rookie', side: 'bat', fmt: 'quick10', at: { over: 4, ball: 0, runs: 31, wkts: 2 }, balls: 12, wkts: 2,
      goal: { kind: 'boundaries', n: 3, consecutive: true }, hero: 'slugger', opp: { rating: 46, bowl: 46, attack: ['swing', 'fast'] },
      stars: [{ stat: 'wktsLost', max: 0 }, { stat: 'sixes', min: 2 }, { stat: 'ballsLeft', min: 6 }] },
    { id: 'bat04', cat: 'batting', diff: 'pro', side: 'bat', fmt: 'quick10', at: { over: 3, ball: 0, runs: 22, wkts: 1 }, balls: 18, wkts: 1, target: 30,
      goal: { kind: 'runs' }, hero: 'anchor', partner: 'opener', opp: { rating: 56, bowl: 58, attack: ['fast', 'offspin', 'swing'] },
      stars: [{ stat: 'perfect', min: 3 }, { stat: 'boundaries', min: 4 }, { stat: 'ballsLeft', min: 3 }] },
    { id: 'bat05', cat: 'batting', diff: 'pro', side: 'bat', fmt: 'quick20', at: { over: 8, ball: 0, runs: 61, wkts: 2 }, balls: 12, wkts: 2, target: 20,
      goal: { kind: 'runs' }, hero: 'hooker', opp: { rating: 58, bowl: 60, attack: ['fast', 'fast'], boost: { delivery: 12 } }, cond: { pitch: 'hard' },
      stars: [{ stat: 'fours', min: 2 }, { stat: 'wktsLost', max: 0 }, { stat: 'sixes', min: 1 }] },
    { id: 'bat06', cat: 'batting', diff: 'pro', side: 'bat', fmt: 'quick20', at: { over: 11, ball: 0, runs: 82, wkts: 3 }, balls: 12, wkts: 2, target: 24,
      goal: { kind: 'runs' }, hero: 'spinwiz', opp: { rating: 58, bowl: 62, attack: ['offspin', 'legspin'], boost: { movement: 10 } }, cond: { pitch: 'dry' },
      stars: [{ stat: 'sixes', min: 1 }, { stat: 'wktsLost', max: 0 }, { stat: 'dots', max: 3 }] },
    { id: 'bat07', cat: 'batting', diff: 'pro', side: 'bat', fmt: 'quick20', at: { over: 2, ball: 0, runs: 9, wkts: 2 }, balls: 12, wkts: 1,
      goal: { kind: 'survive' }, hero: 'anchor', opp: { rating: 60, bowl: 66, attack: ['fast', 'fast'], boost: { delivery: 22 } }, cond: { pitch: 'hard' },
      stars: [{ stat: 'runs', min: 10 }, { stat: 'boundaries', min: 1 }, { stat: 'perfect', min: 2 }] },
    { id: 'bat08', cat: 'batting', diff: 'pro', side: 'bat', fmt: 'quick20', at: { over: 19, ball: 0, runs: 152, wkts: 6 }, balls: 6, target: 18,
      goal: { kind: 'runs' }, hero: 'finisher', partner: 'hooker', opp: { rating: 60, bowl: 62, attack: ['fast'] },
      stars: [{ stat: 'ballsLeft', min: 1 }, { stat: 'sixes', min: 2 }, { stat: 'wktsLost', max: 0 }] },
    { id: 'bat09', cat: 'batting', diff: 'pro', side: 'bat', fmt: 'quick20', at: { over: 1, ball: 0, runs: 4, wkts: 1 }, balls: 12, wkts: 1, target: 20,
      goal: { kind: 'runs' }, hero: 'opener', opp: { rating: 60, bowl: 64, attack: ['swing', 'swing'], boost: { movement: 16 } }, cond: { pitch: 'green', weather: 'overcast' },
      stars: [{ stat: 'wktsLost', max: 0 }, { stat: 'fours', min: 2 }, { stat: 'perfect', min: 2 }] },
    { id: 'bat10', cat: 'batting', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 17, ball: 0, runs: 141, wkts: 4 }, balls: 12, wkts: 3,
      goal: { kind: 'milestone', n: 100 }, hero: 'finisher', heroOn: { runs: 88, balls: 58 }, opp: { rating: 66, bowl: 70, attack: ['fast', 'swing'] },
      stars: [{ stat: 'sixes', min: 1 }, { stat: 'ballsLeft', min: 4 }, { stat: 'perfect', min: 2 }] },
    { id: 'bat11', cat: 'batting', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 18, ball: 0, runs: 139, wkts: 5 }, balls: 12, target: 36,
      goal: { kind: 'runs' }, hero: 'slugger', partner: 'finisher', opp: { rating: 66, bowl: 70, attack: ['fast', 'swing'] },
      stars: [{ stat: 'techUsed', min: 1 }, { stat: 'sixes', min: 4 }, { stat: 'wktsLost', max: 0 }] },
    { id: 'bat12', cat: 'batting', diff: 'legend', side: 'bat', fmt: 'quick10', at: { over: 9, ball: 0, runs: 88, wkts: 4 }, balls: 6, wkts: 1,
      goal: { kind: 'boundaries', n: 4, consecutive: true, sixes: true }, hero: 'slugger', opp: { rating: 60, bowl: 58, attack: ['offspin'] },
      stars: [{ stat: 'perfect', min: 3 }, { stat: 'wktsLost', max: 0 }, { stat: 'ballsLeft', min: 2 }] },

    // ================================================================ BOWLING (12)
    { id: 'bowl01', cat: 'bowling', diff: 'rookie', side: 'bowl', fmt: 'quick5', at: { over: 1, ball: 0, runs: 9, wkts: 0 }, balls: 6, target: 13,
      goal: { kind: 'dots', n: 4 }, bowlers: ['medium'], opp: { rating: 44 },
      stars: [{ stat: 'extras', max: 0 }, { stat: 'runsConceded', max: 4 }, { stat: 'wickets', min: 1 }] },
    { id: 'bowl02', cat: 'bowling', diff: 'rookie', side: 'bowl', fmt: 'quick10', at: { over: 2, ball: 0, runs: 17, wkts: 1 }, balls: 12, target: 30,
      goal: { kind: 'wickets', n: 1 }, bowlers: ['express', 'medium'], opp: { rating: 46 },
      stars: [{ stat: 'bowled', min: 1 }, { stat: 'runsConceded', max: 12 }, { stat: 'extras', max: 0 }] },
    { id: 'bowl03', cat: 'bowling', diff: 'rookie', side: 'bowl', fmt: 'quick5', at: { over: 4, ball: 0, runs: 38, wkts: 4 }, balls: 6, target: 12,
      goal: { kind: 'defend' }, bowlers: ['closer'], opp: { rating: 46 },
      stars: [{ stat: 'boundariesConceded', max: 0 }, { stat: 'wickets', min: 1 }, { stat: 'dots', min: 3 }] },
    { id: 'bowl04', cat: 'bowling', diff: 'pro', side: 'bowl', fmt: 'quick20', at: { over: 6, ball: 0, runs: 48, wkts: 1 }, balls: 6, target: 20,
      goal: { kind: 'wickets', n: 2 }, bowlers: ['express'], opp: { rating: 58 },
      stars: [{ stat: 'bowled', min: 1 }, { stat: 'runsConceded', max: 6 }, { stat: 'wk_yorker', min: 1 }] },
    { id: 'bowl05', cat: 'bowling', diff: 'pro', side: 'bowl', fmt: 'quick20', at: { over: 19, ball: 0, runs: 151, wkts: 5 }, balls: 6, target: 8,
      goal: { kind: 'defend' }, bowlers: ['closer'], opp: { rating: 60 },
      stars: [{ stat: 'wickets', min: 1 }, { stat: 'boundariesConceded', max: 0 }, { stat: 'extras', max: 0 }] },
    { id: 'bowl06', cat: 'bowling', diff: 'pro', side: 'bowl', fmt: 'quick20', at: { over: 2, ball: 0, runs: 14, wkts: 0 }, balls: 12, target: 26,
      goal: { kind: 'wickets', n: 2 }, bowlers: ['swinger', 'medium'], opp: { rating: 58 }, cond: { pitch: 'green', weather: 'overcast' },
      stars: [{ stat: 'lbw', min: 1 }, { stat: 'wk_inswing', min: 1 }, { stat: 'runsConceded', max: 10 }] },
    { id: 'bowl07', cat: 'bowling', diff: 'pro', side: 'bowl', fmt: 'quick20', at: { over: 9, ball: 0, runs: 70, wkts: 2 }, balls: 12, target: 20,
      goal: { kind: 'wickets', n: 2 }, bowlers: ['offie', 'leggie'], opp: { rating: 58 }, cond: { pitch: 'dry' },
      stars: [{ field: 'spin_trap' }, { stat: 'caught', min: 1 }, { stat: 'runsConceded', max: 12 }] },
    { id: 'bowl08', cat: 'bowling', diff: 'pro', side: 'bowl', fmt: 'quick20', at: { over: 12, ball: 0, runs: 94, wkts: 3 }, balls: 12, target: 22,
      goal: { kind: 'wickets', n: 1 }, bowlers: ['leggie', 'offie'], opp: { rating: 60 }, cond: { pitch: 'worn' },
      stars: [{ stat: 'wk_googly', min: 1 }, { stat: 'dots', min: 6 }, { stat: 'boundariesConceded', max: 1 }] },
    { id: 'bowl09', cat: 'bowling', diff: 'pro', side: 'bowl', fmt: 'quick20', at: { over: 14, ball: 0, runs: 118, wkts: 3 }, balls: 12, target: 24,
      goal: { kind: 'wickets', n: 2 }, bowlers: ['enforcer', 'express'], opp: { rating: 60 }, cond: { pitch: 'hard' },
      stars: [{ field: 'bouncer_trap' }, { stat: 'caught', min: 1 }, { stat: 'runsConceded', max: 14 }] },
    { id: 'bowl10', cat: 'bowling', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 19, ball: 0, runs: 160, wkts: 4 }, balls: 6, target: 10,
      goal: { kind: 'defend' }, bowlers: ['closer'], opp: { rating: 76, boost: { power: 8 } },
      stars: [{ stat: 'wk_yorker', min: 1 }, { stat: 'boundariesConceded', max: 0 }, { stat: 'runsConceded', max: 5 }] },
    { id: 'bowl11', cat: 'bowling', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 16, ball: 0, runs: 131, wkts: 3 }, balls: 12, target: 26,
      goal: { kind: 'wickets', n: 3 }, bowlers: ['express', 'swinger'], opp: { rating: 70 },
      stars: [{ stat: 'bowled', min: 2 }, { stat: 'runsConceded', max: 10 }, { stat: 'extras', max: 0 }] },
    { id: 'bowl12', cat: 'bowling', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 10, ball: 0, runs: 77, wkts: 2 }, balls: 6, target: 14,
      goal: { kind: 'dots', n: 6 }, bowlers: ['offie'], opp: { rating: 70 },
      stars: [{ stat: 'wickets', min: 1 }, { stat: 'extras', max: 0 }, { field: 'defensive' }] },

    // ================================================================ PRESSURE (8)
    { id: 'press01', cat: 'pressure', diff: 'pro', side: 'bat', fmt: 'quick20', at: { over: 18, ball: 0, runs: 128, wkts: 9 }, balls: 12, target: 15,
      goal: { kind: 'runs' }, hero: 'finisher', partner: 'tailender', opp: { rating: 60, bowl: 64, attack: ['fast', 'swing'] },
      stars: [{ stat: 'ballsLeft', min: 2 }, { stat: 'boundaries', min: 2 }, { stat: 'perfect', min: 2 }] },
    { id: 'press02', cat: 'pressure', diff: 'pro', side: 'bat', fmt: 'quick20', super: true, at: { over: 0, ball: 0, runs: 0, wkts: 0 }, balls: 6, wkts: 2, target: 14,
      goal: { kind: 'runs' }, hero: 'slugger', partner: 'finisher', opp: { rating: 62, bowl: 66, attack: ['fast'] },
      stars: [{ stat: 'sixes', min: 1 }, { stat: 'wktsLost', max: 0 }, { stat: 'ballsLeft', min: 1 }] },
    { id: 'press03', cat: 'pressure', diff: 'pro', side: 'bowl', fmt: 'quick20', super: true, at: { over: 0, ball: 0, runs: 0, wkts: 0 }, balls: 6, wkts: 2, target: 12,
      goal: { kind: 'defend' }, bowlers: ['closer'], opp: { rating: 64 },
      stars: [{ stat: 'wickets', min: 1 }, { stat: 'boundariesConceded', max: 1 }, { stat: 'extras', max: 0 }] },
    { id: 'press04', cat: 'pressure', diff: 'pro', side: 'bat', fmt: 'quick20', at: { over: 19, ball: 5, runs: 158, wkts: 7 }, balls: 1, target: 2,
      goal: { kind: 'runs' }, hero: 'finisher', opp: { rating: 62, bowl: 66, attack: ['fast'] },
      stars: [{ stat: 'boundaries', min: 1 }, { stat: 'sixes', min: 1 }, { stat: 'perfect', min: 1 }] },
    { id: 'press05', cat: 'pressure', diff: 'legend', side: 'bat', fmt: 'quick10', at: { over: 8, ball: 0, runs: 58, wkts: 6 }, balls: 12, target: 22,
      goal: { kind: 'runs' }, hero: 'anchor', partner: 'tailender', opp: { rating: 66, bowl: 70, attack: ['legspin', 'fast'] },
      stars: [{ stat: 'wktsLost', max: 0 }, { stat: 'ballsLeft', min: 2 }, { stat: 'fours', min: 2 }] },
    { id: 'press06', cat: 'pressure', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 19, ball: 0, runs: 144, wkts: 9 }, balls: 6, target: 6,
      goal: { kind: 'defend' }, bowlers: ['express'], opp: { rating: 70 },
      stars: [{ stat: 'wickets', min: 1 }, { stat: 'dots', min: 3 }, { stat: 'runsConceded', max: 2 }] },
    { id: 'press07', cat: 'pressure', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 18, ball: 0, runs: 130, wkts: 5 }, balls: 12, target: 30,
      goal: { kind: 'runs' }, hero: 'finisher', partner: 'slugger', opp: { rating: 68, bowl: 72, attack: ['fast', 'swing'] },
      stars: [{ stat: 'sixes', min: 3 }, { stat: 'wktsLost', max: 0 }, { stat: 'ballsLeft', min: 1 }] },
    { id: 'press08', cat: 'pressure', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 17, ball: 0, runs: 121, wkts: 5 }, balls: 18, target: 40,
      goal: { kind: 'runs' }, hero: 'hooker', partner: 'finisher', opp: { rating: 68, bowl: 72, attack: ['fast', 'legspin', 'swing'] }, cond: { weather: 'overcast' },
      stars: [{ stat: 'sixes', min: 3 }, { stat: 'wktsLost', max: 1 }, { stat: 'ballsLeft', min: 2 }] },

    // ================================================================ RIVAL (8)
    { id: 'rival01', cat: 'rival', diff: 'pro', side: 'bat', fmt: 'quick20', at: { over: 15, ball: 0, runs: 118, wkts: 3 }, balls: 6, target: 15,
      goal: { kind: 'runs' }, hero: 'hooker', opp: { rating: 62, bowl: 62, attack: ['rival'], rival: 'cannon' },
      stars: [{ stat: 'fours', min: 1 }, { stat: 'sixes', min: 1 }, { stat: 'wktsLost', max: 0 }] },
    { id: 'rival02', cat: 'rival', diff: 'pro', side: 'bowl', fmt: 'quick20', at: { over: 4, ball: 0, runs: 31, wkts: 2 }, balls: 12, target: 30,
      goal: { kind: 'dismiss' }, bowlers: ['swinger', 'offie'], opp: { rating: 60, rival: 'wall' },
      stars: [{ stat: 'boundariesConceded', max: 0 }, { stat: 'runsConceded', max: 8 }, { stat: 'bowled', min: 1 }] },
    { id: 'rival03', cat: 'rival', diff: 'pro', side: 'bat', fmt: 'quick20', at: { over: 10, ball: 0, runs: 72, wkts: 3 }, balls: 12, target: 18,
      goal: { kind: 'runs' }, hero: 'spinwiz', opp: { rating: 62, bowl: 62, attack: ['rival', 'offspin'], rival: 'magician' }, cond: { pitch: 'dry' },
      stars: [{ stat: 'wktsLost', max: 0 }, { stat: 'sixes', min: 1 }, { stat: 'dots', max: 4 }] },
    { id: 'rival04', cat: 'rival', diff: 'pro', side: 'bowl', fmt: 'quick20', at: { over: 19, ball: 0, runs: 148, wkts: 4 }, balls: 6, target: 14,
      goal: { kind: 'defend' }, bowlers: ['closer'], opp: { rating: 62, rival: 'finisher' },
      stars: [{ stat: 'rivalOut', min: 1 }, { stat: 'boundariesConceded', max: 1 }, { stat: 'dots', min: 2 }] },
    { id: 'rival05', cat: 'rival', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 3, ball: 0, runs: 19, wkts: 1 }, balls: 12, wkts: 1, target: 16,
      goal: { kind: 'runs' }, hero: 'opener', opp: { rating: 66, bowl: 66, attack: ['rival', 'fast'], rival: 'trickster' }, cond: { weather: 'overcast' },
      stars: [{ stat: 'perfect', min: 2 }, { stat: 'boundaries', min: 2 }, { stat: 'ballsLeft', min: 2 }] },
    { id: 'rival06', cat: 'rival', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 7, ball: 0, runs: 55, wkts: 2 }, balls: 12, target: 20,
      goal: { kind: 'dismiss' }, bowlers: ['leggie', 'swinger'], opp: { rating: 66, rival: 'technician' },
      stars: [{ stat: 'boundariesConceded', max: 1 }, { stat: 'runsConceded', max: 10 }, { stat: 'wickets', min: 2 }] },
    { id: 'rival07', cat: 'rival', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 18, ball: 0, runs: 139, wkts: 4 }, balls: 12, target: 16,
      goal: { kind: 'defend' }, bowlers: ['enforcer', 'closer'], opp: { rating: 68, rival: 'giant' },
      stars: [{ stat: 'rivalOut', min: 1 }, { stat: 'boundariesConceded', max: 1 }, { stat: 'extras', max: 0 }] },
    { id: 'rival08', cat: 'rival', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 13, ball: 0, runs: 104, wkts: 2 }, balls: 12, target: 18,
      goal: { kind: 'dismiss' }, bowlers: ['leggie', 'express'], opp: { rating: 72, rival: 'champion' },
      stars: [{ stat: 'runsConceded', max: 8 }, { stat: 'dots', min: 6 }, { stat: 'boundariesConceded', max: 0 }],
      reward: { first: { coins: 500 }, perfect: { item: 'acc_champion_crest' } } },

    // ================================================================ EXPERT (8)
    { id: 'exp01', cat: 'expert', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 19, ball: 1, runs: 150, wkts: 6 }, balls: 5, target: 20,
      goal: { kind: 'runs' }, hero: 'finisher', partner: 'slugger', opp: { rating: 72, bowl: 78, attack: ['fast'] },
      stars: [{ stat: 'sixes', min: 3 }, { stat: 'ballsLeft', min: 1 }, { stat: 'wktsLost', max: 0 }] },
    { id: 'exp02', cat: 'expert', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 10, ball: 0, runs: 88, wkts: 2 }, balls: 12, target: 24,
      goal: { kind: 'wickets', n: 3 }, bowlers: ['maestro', 'express'], opp: { rating: 80 }, cond: { pitch: 'worn' },
      stars: [{ stat: 'techUsed', min: 1 }, { stat: 'runsConceded', max: 10 }, { stat: 'wk_googly', min: 1 }] },
    { id: 'exp03', cat: 'expert', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 18, ball: 0, runs: 151, wkts: 3 }, balls: 12, wkts: 2,
      goal: { kind: 'milestone', n: 100 }, hero: 'slugger', heroOn: { runs: 70, balls: 40 }, opp: { rating: 72, bowl: 78, attack: ['fast', 'swing'] },
      stars: [{ stat: 'sixes', min: 3 }, { stat: 'wktsLost', max: 0 }, { stat: 'ballsLeft', min: 2 }] },
    { id: 'exp04', cat: 'expert', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 19, ball: 0, runs: 170, wkts: 5 }, balls: 6, target: 5,
      goal: { kind: 'defend' }, bowlers: ['closer'], opp: { rating: 84, boost: { power: 6 } },
      stars: [{ stat: 'wickets', min: 2 }, { stat: 'boundariesConceded', max: 0 }, { stat: 'extras', max: 0 }] },
    { id: 'exp05', cat: 'expert', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 13, ball: 0, runs: 97, wkts: 4 }, balls: 12, target: 30,
      goal: { kind: 'runs' }, hero: 'spinwiz', opp: { rating: 72, bowl: 84, attack: ['legspin', 'offspin'], boost: { deception: 10 } }, cond: { pitch: 'worn' },
      stars: [{ stat: 'wktsLost', max: 0 }, { stat: 'sixes', min: 2 }, { stat: 'dots', max: 2 }] },
    { id: 'exp06', cat: 'expert', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 4, ball: 0, runs: 28, wkts: 1 }, balls: 12, target: 24,
      goal: { kind: 'runs' }, hero: 'hooker', opp: { rating: 72, bowl: 84, attack: ['fast', 'fast'], boost: { delivery: 14 } }, cond: { pitch: 'hard' },
      stars: [{ stat: 'wktsLost', max: 0 }, { stat: 'fours', min: 3 }, { stat: 'perfect', min: 3 }] },
    { id: 'exp07', cat: 'expert', diff: 'legend', side: 'bowl', fmt: 'quick20', at: { over: 14, ball: 0, runs: 112, wkts: 2 }, balls: 18, target: 24,
      goal: { kind: 'wickets', n: 4 }, bowlers: ['express', 'swinger', 'offie'], opp: { rating: 78 },
      stars: [{ stat: 'bowled', min: 2 }, { stat: 'runsConceded', max: 15 }, { stat: 'extras', max: 0 }] },
    { id: 'exp08', cat: 'expert', diff: 'legend', side: 'bat', fmt: 'quick20', at: { over: 18, ball: 0, runs: 124, wkts: 9 }, balls: 12, wkts: 1, target: 36,
      goal: { kind: 'runs' }, hero: 'slugger', partner: 'tailender', opp: { rating: 74, bowl: 78, attack: ['fast', 'swing'] },
      stars: [{ stat: 'sixes', min: 6 }, { stat: 'techUsed', min: 1 }, { stat: 'ballsLeft', min: 1 }],
      reward: { first: { coins: 600 }, perfect: { lm: 1 } } },
  ],
};
