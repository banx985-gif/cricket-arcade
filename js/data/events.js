// Cricket Arcade — career events, sponsors and rivals (M08, plan 8.16, 8.17, 5.9, 14).
// Rules in game/events.js. Text is in the strings table (event.<id>.*, sponsor.*, rival.*).
//
// ---- effects (used by event choices and rival build-ups) ----
//   energy / selection / xp / coins    add (coins go to the account purse)
//   form        +1 / -1 form level
//   stat        { key: 'best' | stat id, n }  permanent (+1 or so; 'best' = the
//               archetype's first key stat)
//   match       { stats } a one-match boost for the next match only
//   sponsor     true: sign the offered sponsor deal

const EVENT_DATA = {
  version: 1,
  // After a match (not a promotion), the chance a short event appears on Career Home.
  chance: 0.5,
  events: [
    { id: 'coach_advice',     portrait: 'coach', minStage: 1,
      choices: [{ id: 'extra', fx: { stat: { key: 'best', n: 1 }, energy: -10 } }, { id: 'easy', fx: { energy: 10 } }] },
    { id: 'teammate_request', portrait: 'support_teammate', minStage: 1,
      choices: [{ id: 'help', fx: { xp: 40, energy: -10 } }, { id: 'decline', fx: { energy: 5 } }] },
    { id: 'fatigue_decision', portrait: 'support_teammate_f', minStage: 1, when: { energyBelow: 55 },
      choices: [{ id: 'push', fx: { form: 1, energy: -10 } }, { id: 'rest', fx: { energy: 25, selection: -2 } }] },
    { id: 'form_talk',        portrait: 'coach', minStage: 1, when: { form: ['poor', 'normal'] },
      choices: [{ id: 'video', fx: { form: 1 } }, { id: 'nets', fx: { xp: 30 } }] },
    { id: 'press_moment',     portrait: 'support_press', minStage: 2,
      choices: [{ id: 'bold', fx: { selection: 5, energy: -5 } }, { id: 'humble', fx: { xp: 40 } }] },
    { id: 'scout_invite',     portrait: 'support_hidden_master', minStage: 2,
      choices: [{ id: 'attend', fx: { selection: 6, energy: -20 } }, { id: 'skip', fx: { energy: 10 } }] },
    // A sponsor offer is an event too (plan 8.13): only when the stage allows sponsors.
    { id: 'sponsor_offer',    portrait: 'sponsor', minStage: 2, sponsor: true, weight: 2,
      choices: [{ id: 'accept', fx: { sponsor: true } }, { id: 'decline', fx: {} }] },
  ],

  // ---- sponsors (plan 8.16): fictional, 1–3 fixtures, one objective, one reward ----
  // goal: boundaries | wickets | runs | dots | wins | grade (a match at grade 'min' or better)
  // for: bat | bowl | all (who gets offered it)
  // reward: { coins } | { item } (gear; if already owned, its duplicate Coins)
  sponsors: [
    { id: 'boundary_cola', logo: 'sponsor_boundary_cola', for: 'bat',  goal: 'boundaries', n: 4,  fixtures: 2, reward: { coins: 150 } },
    { id: 'swift_sports',  logo: 'sponsor_swift_sports',  for: 'bat',  goal: 'runs',       n: 45, fixtures: 2, reward: { item: 'shoes_golden_willow' } },
    { id: 'crownstrike',   logo: 'sponsor_crownstrike',   for: 'bowl', goal: 'wickets',    n: 3,  fixtures: 2, reward: { coins: 150 } },
    { id: 'pitch_perfect', logo: 'sponsor_pitch_perfect', for: 'bowl', goal: 'dots',       n: 10, fixtures: 2, reward: { item: 'acc_spin_charm' } },
    { id: 'golden_over',   logo: 'sponsor_golden_over',   for: 'all',  goal: 'grade', min: 'A', n: 1, fixtures: 3, reward: { item: 'uniform_regional' } },
    { id: 'willow_co',     logo: 'sponsor_willow_co',     for: 'all',  goal: 'wins',       n: 2,  fixtures: 3, reward: { coins: 220 } },
  ],

  // ---- rivals (plan 14): the first four, as boss matches in Stages 2–4 ----
  // Each joins the other side as a boosted player: slot = batting position in
  // their XI, boost = added to their stats in 'stats'. build-up: a pre-match
  // event with two choices (one-match boosts). objective: by your role.
  // reward (plan 14.2), once per account: coach | item | technique; plus the
  // +1 rival Skill Token for this career (SkillTree.rivalWin).
  rivals: [
    { id: 'prodigy',  art: 'rival_prodigy',  slot: 6, boost: 16, stats: ['timing', 'power', 'delivery', 'accuracy', 'composure'], origin: 'career',
      objective: { bat: { id: 'runs', n: 20 }, bowl: { id: 'wickets', n: 2 }, all: { id: 'win' } }, reward: { coach: 'rival' },
      buildUp: [{ id: 'fired', fx: { match: { stats: { power: 4, delivery: 4 } } } }, { id: 'calm', fx: { match: { stats: { composure: 6, control: 3 } } } }] },
    { id: 'wall',     art: 'rival_wall',     slot: 3, boost: 22, stats: ['contact', 'composure', 'placement'],
      objective: { bat: { id: 'runs', n: 25 }, bowl: { id: 'wickets', n: 2 }, all: { id: 'wickets', n: 1 } }, reward: { item: 'pads_kingmaker' },
      buildUp: [{ id: 'attack', fx: { match: { stats: { deception: 5, power: 3 } } } }, { id: 'patient', fx: { match: { stats: { accuracy: 5, control: 4 } } } }] },
    { id: 'finisher', art: 'rival_finisher', slot: 5, boost: 20, stats: ['power', 'composure', 'running'],
      objective: { bat: { id: 'win' }, bowl: { id: 'economy', n: 8 }, all: { id: 'win' } }, reward: { technique: 'last_stand' },
      buildUp: [{ id: 'pressure', fx: { match: { stats: { accuracy: 5, composure: 3 } } } }, { id: 'race', fx: { match: { stats: { power: 5, running: 3 } } } }] },
    { id: 'cannon',   art: 'rival_cannon',   slot: 8, boost: 24, stats: ['delivery', 'accuracy', 'fitness'], family: 'fast',
      objective: { bat: { id: 'runs', n: 20 }, bowl: { id: 'economy', n: 8 }, all: { id: 'runs', n: 15 } }, reward: { item: 'acc_rival_token' },
      buildUp: [{ id: 'hook', fx: { match: { stats: { power: 5, timing: 3 } } } }, { id: 'duck', fx: { match: { stats: { contact: 5, composure: 3 } } } }] },
  ],
};
