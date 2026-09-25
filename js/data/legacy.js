// Cricket Arcade — Legacy Traits and retirement (M09, plan 8.20–8.22). Rules in game/legacy.js.
//
// A retiring career gets 1 Primary Legacy Trait (always) and up to 1 Secondary.
// Each trait has one clear condition over the whole career:
//   stat   a career total (worked out by Legacy.careerTotals from every match played)
//   need   how much of it earns the trait
// A trait is earned when stat >= need. Primary = the earned trait you beat by the
// most (stat / need); Secondary = the next earned one. If none is earned, the
// Primary is the one you came closest to (plan 8.22: a Primary is guaranteed).
//
// Career totals (all from the career's matches):
//   sixes, runs, notOuts, ppRuns (runs in powerplay overs), spinRuns (off spin bowling),
//   chaseWinsNotOut (won a chase, not out), wickets, paceWickets (as a pace bowler),
//   newBallWickets (overs 1–2), deathWickets (the last over), hatTricks, threeFors,
//   closerWins (bowled the last over of a match your side won), knockoutGreats
//   (A/S grades in finals, semis, quarters, qualifiers), sGrades, rivalsBeaten,
//   captain (1 if national captain), homegrown (a local final AND the World
//   Nations Championship won: 0–2), tournamentGreats (A/S grades in a tournament you won)

const LEGACY_DATA = {
  version: 1,
  traits: [
    { id: 'six_machine',          icon: 'legacy_six_machine',          stat: 'sixes',            need: 40 },
    { id: 'ice_cold',             icon: 'legacy_ice_cold',             stat: 'chaseWinsNotOut',  need: 3 },
    { id: 'hat_trick_hunter',     icon: 'legacy_hat_trick_hunter',     stat: 'hatTrickScore',    need: 5 },   // hat-tricks x5 + three-wicket matches
    { id: 'giant_killer',         icon: 'legacy_giant_killer',         stat: 'rivalsBeaten',     need: 5 },
    { id: 'powerplay_punisher',   icon: 'legacy_powerplay_punisher',   stat: 'ppRuns',           need: 250 },
    { id: 'golden_arm',           icon: 'legacy_golden_arm',           stat: 'wickets',          need: 40 },
    { id: 'big_match_player',     icon: 'legacy_big_match_player',     stat: 'knockoutGreats',   need: 4 },
    { id: 'spin_tamer',           icon: 'legacy_spin_tamer',           stat: 'spinRuns',         need: 150 },
    { id: 'pace_terror',          icon: 'legacy_pace_terror',          stat: 'paceWickets',      need: 30 },
    { id: 'iron_wall',            icon: 'legacy_iron_wall',            stat: 'notOuts',          need: 10 },
    { id: 'closer',               icon: 'legacy_closer',               stat: 'closerWins',       need: 4 },
    { id: 'homegrown_hero',       icon: 'legacy_homegrown_hero',       stat: 'homegrown',        need: 2 },
    { id: 'century_machine',      icon: 'legacy_century_machine',      stat: 'runs',             need: 750 },
    { id: 'new_ball_menace',      icon: 'legacy_new_ball_menace',      stat: 'newBallWickets',   need: 15 },
    { id: 'death_overs_specialist', icon: 'legacy_death_overs_specialist', stat: 'deathWickets', need: 12 },
    { id: 'captains_call',        icon: 'legacy_captains_call',        stat: 'captain',          need: 1 },
    { id: 'tournament_mvp',       icon: 'legacy_tournament_mvp',       stat: 'tournamentGreats', need: 3 },
    { id: 'perfect_technician',   icon: 'legacy_perfect_technician',   stat: 'sGrades',          need: 8 },
  ],
  // When traits tie (e.g. a short career that earned none), the one that fits the role wins.
  roleDefault: { batter: 'century_machine', bowler: 'golden_arm', allrounder: 'big_match_player' },
  // Legacy Marks for retiring: base + per trophy + for beating the Champion.
  marks: { base: 3, perTrophy: 1, champion: 2 },
};
