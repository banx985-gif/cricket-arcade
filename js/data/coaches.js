// Cricket Arcade — coaches (M08, plan 13, 5.12, 8.19). Rules in game/coaches.js.
//
// A coach:
//   drills     training drills they specialise in (CAREER_DATA.training ids):
//              those drills give extra XP and a chance of an extra stat point
//   stats      a small passive stat bonus while they're your coach
//   perks      passive modifiers (same parts as gear perks: mod + mult | add | floor, or flag)
//   tier       the career stage needed to hire them
//   unlock     how the account gets them: 'start' | { stage: n } (any career reaching
//              stage n) | 'rival' (beat a rival) | 'hidden' (late-game, M09+)
//   art        sprite id (characters/coaches/)
// Unlocks are account-wide; each career has one active coach (c.hooks.coach).
// Mastery (account-wide, plan 13): every specialty drill and every match with
// the coach adds a use; each level adds a little to the specialty only.

const COACH_DATA = {
  version: 1,
  // Uses to reach mastery levels 1, 2, 3.
  mastery: { levels: [8, 20, 40], perLevel: { xp: 0.1, extraStat: 0.08 } },
  // A specialty drill: +XP (fraction) and this chance of +1 extra stat point.
  specialty: { xp: 0.25, extraStat: 0.3 },
  coaches: [
    { id: 'power',      art: 'coach_power',      tier: 1, unlock: 'start',        drills: ['power_hitting'],                 stats: { power: 3 } },
    { id: 'technique',  art: 'coach_technique',  tier: 1, unlock: 'start',        drills: ['timing_cage', 'target_batting'],  stats: { contact: 2, placement: 1 } },
    { id: 'pace',       art: 'coach_pace',       tier: 1, unlock: 'start',        drills: ['pace_gate'],                     stats: { delivery: 3 } },
    { id: 'spin',       art: 'coach_spin',       tier: 1, unlock: 'start',        drills: ['movement_control'],              stats: { deception: 2, movement: 1 } },
    { id: 'swing',      art: 'coach_swing',      tier: 2, unlock: { stage: 2 },   drills: ['movement_control', 'yorker_board'], stats: { movement: 2, accuracy: 1 } },
    { id: 'fitness',    art: 'coach_fitness',    tier: 2, unlock: { stage: 2 },   drills: ['fitness_session'],               stats: { fitness: 3 }, perks: [{ mod: 'fatigue', mult: 0.9 }, { mod: 'restEnergy', add: 5 }] },
    { id: 'fielding',   art: 'coach_fielding',   tier: 2, unlock: { stage: 2 },   drills: ['fielding_reaction'],             stats: { fielding: 3 }, perks: [{ mod: 'catchBonus', add: 0.03 }, { mod: 'stopBonus', add: 0.03 }] },
    { id: 'mental',     art: 'coach_mental',     tier: 3, unlock: { stage: 3 },   drills: ['timing_cage'],                   stats: { composure: 3 }, perks: [{ mod: 'pressure', mult: 0.9 }, { mod: 'composureFloor', floor: 35 }] },
    { id: 'allrounder', art: 'coach_allrounder', tier: 3, unlock: { stage: 3 },   drills: ['timing_cage', 'yorker_board', 'fitness_session'], stats: { timing: 1, accuracy: 1, fitness: 1 }, perks: [{ mod: 'xp', add: 0.05 }] },
    { id: 'gear',       art: 'coach_gear',       tier: 3, unlock: { stage: 3 },   drills: ['target_batting'],                stats: { placement: 2 }, perks: [{ mod: 'coins', add: 0.15 }] },
    { id: 'rival',      art: 'coach_rival',      tier: 2, unlock: 'rival',        drills: ['power_hitting', 'pace_gate'],    stats: {}, rivalStats: 5 },   // +5 all stats in rival (boss) matches
    { id: 'legendary',  art: 'coach_legendary',  tier: 6, unlock: 'hidden',       drills: ['timing_cage', 'target_batting', 'pace_gate', 'yorker_board'], stats: { timing: 2, power: 2, delivery: 2, accuracy: 2 }, perks: [{ mod: 'xp', add: 0.1 }], hidden: true },
  ],
};
