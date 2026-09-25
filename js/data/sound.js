// Cricket Arcade — every sound in the game, by id (plan 31). Engine: core/audio.js.
//
// No audio files exist yet: each id has a placeholder "recipe" that is synthesised
// in code (WebAudio). When a real file is added as game/assets/audio/<id>.mp3 it is
// used instead, automatically — same id, no code change.
//
// bus: 'sfx' | 'crowd' | 'ui' | 'music' (each has its own volume slider; ui follows SFX)
// Recipe kinds: tone, thump, crack, noise, crowd, clatter, sweep, arp, arp2, chord, loop (music)

const SOUND_DATA = {
  fileDir: 'assets/audio/', fileExt: '.mp3',
  sfx: {
    // ---- Batting ----
    sfx_bat_light:   { bus: 'sfx', kind: 'thump', freq: 240, a: 0.003, h: 0.008, r: 0.07, gain: 0.22, vary: 0.05, lp: 2000, noise: 0.5 },
    sfx_bat_heavy:   { bus: 'sfx', kind: 'thump', freq: 360, a: 0.002, h: 0.012, r: 0.10, gain: 0.34, vary: 0.06, lp: 3400, noise: 1.0 },
    sfx_bat_perfect: { bus: 'sfx', kind: 'crack', freq: 300, a: 0.002, h: 0.02, r: 0.26, gain: 0.45, vary: 0.03, lp: 4200 },
    sfx_bat_edge:    { bus: 'sfx', kind: 'thump', freq: 900, a: 0.002, h: 0.004, r: 0.05, gain: 0.18, vary: 0.1, lp: 4200, noise: 1.2 },
    sfx_bat_miss:    { bus: 'sfx', kind: 'noise', freq: 1200, a: 0.03, h: 0.02, r: 0.10, gain: 0.10, vary: 0.1, lp: 3000 },
    sfx_ball_bounce: { bus: 'sfx', kind: 'thump', freq: 120, a: 0.003, h: 0.01, r: 0.08, gain: 0.16, vary: 0.08, lp: 900, noise: 0.6, throttle: 0.06 },
    sfx_boundary:    { bus: 'sfx', kind: 'arp2', freq: 440, a: 0.01, h: 0.06, r: 0.22, gain: 0.18, vary: 0, lp: 3000 },
    sfx_six_crowd:   { bus: 'crowd', kind: 'crowd', freq: 820, a: 0.08, h: 1.2, r: 2.0, gain: 0.46, vary: 0.05, lp: 3200 },
    // ---- Bowling ----
    sfx_release:        { bus: 'sfx', kind: 'noise', freq: 700, a: 0.02, h: 0.01, r: 0.08, gain: 0.07, vary: 0.1, lp: 2000 },
    sfx_delivery_fast:  { bus: 'sfx', kind: 'noise', freq: 1600, a: 0.01, h: 0.05, r: 0.12, gain: 0.08, vary: 0.08, lp: 3600 },
    sfx_delivery_spin:  { bus: 'sfx', kind: 'sweep', from: 620, to: 780, a: 0.02, h: 0.05, r: 0.12, gain: 0.06, vary: 0.05, lp: 2400, type: 'sine' },
    sfx_stumps:         { bus: 'sfx', kind: 'clatter', freq: 700, a: 0.002, h: 0.02, r: 0.3, gain: 0.34, vary: 0.05, lp: 4200 },
    sfx_bails:          { bus: 'sfx', kind: 'tone', freq: 1450, type: 'triangle', a: 0.002, h: 0.01, r: 0.14, gain: 0.12, vary: 0.08, lp: 4800 },
    sfx_appeal:         { bus: 'crowd', kind: 'crowd', freq: 1100, a: 0.05, h: 0.35, r: 0.5, gain: 0.26, vary: 0.05, lp: 3000 },
    sfx_wicket_crowd:   { bus: 'crowd', kind: 'crowd', freq: 760, a: 0.06, h: 0.9, r: 1.5, gain: 0.40, vary: 0.05, lp: 2800 },
    // ---- Fielding ----
    sfx_catch:   { bus: 'sfx', kind: 'thump', freq: 180, a: 0.003, h: 0.01, r: 0.1, gain: 0.25, vary: 0.04, lp: 1400, noise: 0.8 },
    sfx_throw:   { bus: 'sfx', kind: 'noise', freq: 900, a: 0.04, h: 0.03, r: 0.12, gain: 0.08, vary: 0.1, lp: 2600 },
    sfx_glove:   { bus: 'sfx', kind: 'thump', freq: 150, a: 0.003, h: 0.01, r: 0.08, gain: 0.22, vary: 0.05, lp: 1200, noise: 0.9 },
    sfx_dive:    { bus: 'sfx', kind: 'noise', freq: 300, a: 0.02, h: 0.06, r: 0.18, gain: 0.12, vary: 0.1, lp: 1200 },
    sfx_runout:  { bus: 'sfx', kind: 'clatter', freq: 820, a: 0.002, h: 0.02, r: 0.25, gain: 0.32, vary: 0.05, lp: 4200 },
    // ---- Game moments (stings) ----
    sfx_six:     { bus: 'sfx', kind: 'arp', freq: 523, a: 0.01, h: 0.07, r: 0.3, gain: 0.22, vary: 0, lp: 3200 },
    sfx_combo:   { bus: 'sfx', kind: 'sweep', from: 300, to: 900, a: 0.01, h: 0.05, r: 0.2, gain: 0.14, vary: 0, lp: 2800, type: 'triangle' },
    sfx_wicket:  { bus: 'sfx', kind: 'sweep', from: 360, to: 90, a: 0.01, h: 0.08, r: 0.45, gain: 0.26, vary: 0, lp: 1400, type: 'triangle' },
    sfx_fanfare: { bus: 'sfx', kind: 'arp', freq: 392, a: 0.02, h: 0.12, r: 0.45, gain: 0.26, vary: 0, lp: 3000 },
    // ---- UI ----
    ui_press:    { bus: 'ui', kind: 'tone', freq: 520, type: 'sine', a: 0.005, h: 0.01, r: 0.07, gain: 0.14, vary: 0.02, lp: 2400, throttle: 0.04 },
    ui_confirm:  { bus: 'ui', kind: 'arp2', freq: 660, a: 0.005, h: 0.03, r: 0.1, gain: 0.14, vary: 0, lp: 3000 },
    ui_back:     { bus: 'ui', kind: 'sweep', from: 520, to: 380, a: 0.005, h: 0.02, r: 0.08, gain: 0.12, vary: 0, lp: 2400, type: 'sine' },
    ui_unlock:   { bus: 'ui', kind: 'arp', freq: 587, a: 0.01, h: 0.08, r: 0.35, gain: 0.2, vary: 0, lp: 3400 },
    ui_rare:     { bus: 'ui', kind: 'chord', freq: 440, a: 0.02, h: 0.3, r: 0.9, gain: 0.2, vary: 0, lp: 3600 },
    ui_currency: { bus: 'ui', kind: 'arp2', freq: 988, a: 0.003, h: 0.02, r: 0.12, gain: 0.12, vary: 0.02, lp: 4200 },
    ui_levelup:  { bus: 'ui', kind: 'arp', freq: 659, a: 0.01, h: 0.1, r: 0.5, gain: 0.22, vary: 0, lp: 3600 },
    ui_error:    { bus: 'ui', kind: 'tone', freq: 150, type: 'square', a: 0.005, h: 0.08, r: 0.08, gain: 0.08, vary: 0, lp: 1200 },
    // ---- Crowd (layered) ----
    crowd_ambience: { bus: 'crowd', kind: 'crowd', freq: 600, a: 1.0, h: 6, r: 1.5, gain: 0.05, vary: 0.05, lp: 1800, loop: true },
    crowd_excite:   { bus: 'crowd', kind: 'crowd', freq: 700, a: 0.6, h: 0.8, r: 1.2, gain: 0.22, vary: 0.05, lp: 2400 },
    crowd_cheer:    { bus: 'crowd', kind: 'crowd', freq: 900, a: 0.25, h: 0.6, r: 1.4, gain: 0.30, vary: 0.05, lp: 2600 },
    crowd_roar:     { bus: 'crowd', kind: 'crowd', freq: 800, a: 0.12, h: 1.1, r: 1.8, gain: 0.42, vary: 0.05, lp: 3000 },
    crowd_wicket:   { bus: 'crowd', kind: 'crowd', freq: 700, a: 0.08, h: 0.8, r: 1.4, gain: 0.36, vary: 0.05, lp: 2600 },
    crowd_groan:    { bus: 'crowd', kind: 'crowd', freq: 420, a: 0.15, h: 0.3, r: 0.8, gain: 0.22, vary: 0.05, lp: 1200, sweepDown: true },
  },

  // Music: 8 tracks (plan 31). Placeholder = a soft generated loop per track:
  // bpm, root note (Hz), chord progression (semitones from the root), and a style.
  music: {
    music_main:        { bpm: 96,  root: 196, chords: [0, 5, 7, 5], style: 'anthem' },
    music_career:      { bpm: 88,  root: 220, chords: [0, 9, 5, 7], style: 'calm' },
    music_match:       { bpm: 112, root: 174.6, chords: [0, 7, 9, 5], style: 'drive' },
    music_rival:       { bpm: 118, root: 164.8, chords: [0, 3, 8, 7], style: 'tense' },
    music_sixsmash:    { bpm: 124, root: 196, chords: [0, 5, 9, 7], style: 'drive' },
    music_wicketrush:  { bpm: 116, root: 185, chords: [0, 3, 10, 7], style: 'tense' },
    music_final:       { bpm: 104, root: 207.7, chords: [0, 8, 5, 7], style: 'anthem' },
    music_victory:     { bpm: 92,  root: 233.1, chords: [0, 5, 7, 0], style: 'calm' },
  },

  // Older names the game already uses -> the ids above (so every call site is covered).
  aliases: {
    uiTap: 'ui_press', batHit: 'sfx_bat_heavy', batPerfect: 'sfx_bat_perfect', batDefend: 'sfx_bat_light', edge: 'sfx_bat_edge',
    swish: 'sfx_bat_miss', bounce: 'sfx_ball_bounce', stumps: 'sfx_stumps', catchIt: 'sfx_catch', release: 'sfx_release',
    crowdCheer: 'crowd_cheer', crowdRoar: 'crowd_roar', crowdGroan: 'crowd_groan', six: 'sfx_six', four: 'sfx_boundary',
    combo: 'sfx_combo', wicket: 'sfx_wicket', fanfare: 'sfx_fanfare',
  },

  // Which music plays on which screen (null = keep what's playing), and the crowd bed.
  sceneMusic: {
    title: 'music_main', settings: 'music_main', collection: 'music_main', records: 'music_main', halloffame: 'music_main', trophyroom: 'music_main',
    quickmatch: 'music_main', challenges: 'music_main', missions: 'music_main', tutorial: 'music_career',
    careerselect: 'music_career', careercreate: 'music_career', careersign: 'music_career', careerhome: 'music_career', careerprematch: 'music_career',
    careertree: 'music_career', careerloadout: 'music_career', careergear: 'music_career', careershop: 'music_career', careerjoin: 'music_career',
    careeroffers: 'music_career', careertable: 'music_career', careercoach: 'music_career', careerpromoted: 'music_victory', careerretire: 'music_victory',
    myxicreate: 'music_career', myxihome: 'music_career', myxisquad: 'music_career', myxilineup: 'music_career', myxitable: 'music_career',
    toss: 'music_match', matchbat: 'match', matchbowl: 'match', matchbreak: 'match', careersim: 'match',
    sixsmash: 'music_sixsmash', wicketrush: 'music_wicketrush',
    result: 'music_victory', matchresult: 'music_victory', careerresult: 'music_victory', missionresult: 'music_victory', myxiresult: 'music_victory', myxiending: 'music_victory',
  },
  // Match screens: quieter music under the crowd.
  inMatchMusic: 0.45,
  crowdScenes: ['toss', 'matchbat', 'matchbowl', 'matchbreak', 'sixsmash', 'wicketrush', 'careersim'],
};
