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
    // Special: never random. Offered in International cricket (CAREER_DATA.captaincy).
    { id: 'captaincy_offer',  portrait: 'support_umpire', minStage: 6, special: true,
      choices: [{ id: 'accept', fx: { captain: true } }, { id: 'decline', fx: { selection: 3 } }] },
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
    // ---- M09: the rest (Stages 5–8) ----
    { id: 'technician', art: 'rival_technician', slot: 3, boost: 24, stats: ['placement', 'timing', 'contact'],
      objective: { bat: { id: 'runs', n: 25 }, bowl: { id: 'wickets', n: 2 }, all: { id: 'win' } }, reward: { technique: 'cover_drive_mastery' },
      buildUp: [{ id: 'mirror', fx: { match: { stats: { placement: 5, timing: 3 } } } }, { id: 'tight', fx: { match: { stats: { accuracy: 5, control: 4 } } } }] },
    { id: 'magician',   art: 'rival_magician',   slot: 9, boost: 26, stats: ['deception', 'movement', 'control'], family: 'legspin',
      objective: { bat: { id: 'runs', n: 22 }, bowl: { id: 'wickets', n: 2 }, all: { id: 'runs', n: 15 } }, reward: { technique: 'googly_mastery' },
      buildUp: [{ id: 'read', fx: { match: { stats: { timing: 5, contact: 4 } } } }, { id: 'feet', fx: { match: { stats: { running: 4, power: 4 } } } }] },
    { id: 'veteran',    art: 'rival_veteran',    slot: 4, boost: 26, stats: ['composure', 'contact', 'timing'],
      objective: { bat: { id: 'notOut' }, bowl: { id: 'dots', n: 7 }, all: { id: 'win' } }, reward: { technique: 'iron_focus' },
      buildUp: [{ id: 'respect', fx: { match: { stats: { composure: 6, control: 3 } } } }, { id: 'rattle', fx: { match: { stats: { delivery: 5, deception: 3 } } } }] },
    { id: 'giant',      art: 'rival_giant',      slot: 5, boost: 28, stats: ['power', 'running', 'fitness'],
      objective: { bat: { id: 'boundaries', n: 3 }, bowl: { id: 'economy', n: 8 }, all: { id: 'win' } }, reward: { technique: 'power_surge' },
      buildUp: [{ id: 'fullbalance', fx: { match: { stats: { accuracy: 6, control: 3 } } } }, { id: 'slug', fx: { match: { stats: { power: 6, timing: 2 } } } }] },
    { id: 'trickster',  art: 'rival_trickster',  slot: 7, boost: 28, stats: ['deception', 'delivery', 'movement'], family: 'swing',
      objective: { bat: { id: 'runs', n: 25 }, bowl: { id: 'wickets', n: 2 }, all: { id: 'win' } }, reward: { technique: 'reverse_break' },
      buildUp: [{ id: 'watch', fx: { match: { stats: { timing: 5, composure: 3 } } } }, { id: 'swing', fx: { match: { stats: { movement: 5, deception: 3 } } } }] },
    { id: 'captain',    art: 'rival_captain',    slot: 4, boost: 28, stats: ['composure', 'timing', 'accuracy', 'control', 'fielding'],
      objective: { bat: { id: 'win' }, bowl: { id: 'win' }, all: { id: 'win' } }, reward: { technique: 'field_general' },
      buildUp: [{ id: 'lead', fx: { match: { stats: { composure: 5, timing: 3, accuracy: 3 } } } }, { id: 'outthink', fx: { match: { stats: { deception: 4, placement: 4 } } } }] },
    // The Phantom: the secret invitational rival (hidden until met). The Champion: the final boss.
    { id: 'phantom',    art: 'rival_phantom',    slot: 6, boost: 30, stats: ['timing', 'power', 'deception', 'delivery', 'composure'], secret: true,
      objective: { bat: { id: 'runs', n: 25 }, bowl: { id: 'wickets', n: 2 }, all: { id: 'win' } }, reward: { item: 'bat_phantom_grip' },
      buildUp: [{ id: 'accept', fx: { match: { stats: { timing: 5, delivery: 5 } } } }, { id: 'focus', fx: { match: { stats: { composure: 8 } } } }] },
    { id: 'champion',   art: 'rival_champion',   slot: 3, boost: 30, stats: ['timing', 'power', 'placement', 'composure', 'delivery', 'accuracy'], final: true,
      objective: { bat: { id: 'win' }, bowl: { id: 'win' }, all: { id: 'win' } }, reward: { item: 'acc_champion_crest', coach: 'legendary' },
      buildUp: [{ id: 'everything', fx: { match: { stats: { power: 5, delivery: 5, composure: 4 } } } }, { id: 'legacy', fx: { match: { stats: { timing: 5, accuracy: 5, composure: 4 } } } }] },
  ],
  // The Phantom's secret invitation: when Stage 8 starts, a career that has
  // beaten at least this many different rivals gets one extra match (before the
  // Champion) against The Phantom.
  phantom: { rivalsBeaten: 6 },
};
