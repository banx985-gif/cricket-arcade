// Cricket Arcade — stadium layers, pitch types and weather (M04b B5, plan 7.8–7.10).
// The match background is stacked layers, back to front, each behind a sprite id:
//   sky (by weather) -> stands + crowd panorama -> floodlights / sightscreens ->
//   crowd cheer groups + flags + banners -> boundary boards -> outfield grass
//   tile (laid in perspective) -> pitch strip (by pitch type) -> players.
// The camera is a real 3D camera, so near layers slide more than far ones
// (parallax); the sky is screen-space and moves least of all.
// If a layer's art is missing, the old code-drawn look is used for it.

const STADIUM_DATA = {
  defaultStadium: 'local_oval',

  stadiums: {
    local_oval: {
      nameKey: 'stadium.local_oval',
      // Stands panorama wrapped round the ground on a circle. The art includes
      // a strip of outfield and a pitch at the bottom: crop = the part used
      // (source pixels [x, y, w, h]); the bottom of the crop is the fence line.
      // Copies go round the circle; every other copy is mirrored so the edges meet.
      stands: { id: 'stands_local_oval', crop: [0, 0, 2172, 404], radius: 75, copies: 4, mirror: true, centreDeg: -90, sink: 0.6 },
      // Boundary boards: a repeating strip just outside the rope.
      boards: { id: 'boards_local_oval', crop: [0, 0, 2172, 132], height: 1.25, gap: 1.6 },
      // World props: [sprite id, angle (deg, -90 = behind the batter), distance from the ground's centre (m), height (m)]
      props: [
        ['sightscreen', -90, 71, 7.5],
        ['sightscreen', 90, 71, 7.5],
        ['floodlight_tower', -135, 96, 42], ['floodlight_tower', -45, 96, 42],
        ['floodlight_tower', 45, 96, 42], ['floodlight_tower', 135, 96, 42],
        ['dugout_bench', 180, 71, 3.2],
        ['dugout_bench', 0, 71, 3.2],
      ],
      // Crowd cheer groups on the stands: [group, angle, distance, height up the stands (m), size (m)]
      crowd: [
        ['a', -118, 71, 2.6, 5.2], ['b', -104, 72, 3.6, 5.0], ['c', -62, 72, 3.0, 5.2], ['a', -76, 71, 2.2, 5.0],
        ['b', -150, 76, 2.4, 5.2], ['c', -30, 76, 2.4, 5.2], ['a', 160, 76, 2.4, 5.2], ['b', 20, 76, 2.4, 5.2],
        ['c', 120, 76, 2.4, 5.2], ['a', 60, 76, 2.4, 5.2],
      ],
      // Waving flags and banners: [sprite id, angle, distance, height of the bottom (m), size (m)]
      flags: [
        ['crowd_flag_01', -112, 73, 7.5, 3.6], ['crowd_flag_02', -70, 73, 8, 3.6], ['crowd_flag_03', -140, 73, 7, 3.6],
        ['crowd_flag_01', -40, 78, 7, 3.6], ['crowd_flag_02', 150, 78, 7, 3.6], ['crowd_flag_03', 40, 78, 7, 3.6],
      ],
      banners: [
        ['crowd_banner_02', -97, 74, 0.2, 3.2], ['crowd_banner_03', -84, 74, 0.2, 3.2],
        ['crowd_banner_02', -128, 74, 0.2, 3.2], ['crowd_banner_03', -52, 74, 0.2, 3.2],
      ],
    },
  },

  // Sky by weather (shared by every stadium). Drawn screen-space, behind all.
  skies: { clear: 'sky_clear', overcast: 'sky_overcast', windy: 'sky_windy', hotDry: 'sky_hot', dusk: 'sky_dusk', night: 'sky_night' },
  skyParallax: 380,              // screen px the sky slides per radian the camera turns

  // Outfield grass tile laid flat in perspective: one tile covers tileM metres.
  grass: { id: 'outfield_grass_tile', tileM: 16, maxCellPx: 420 },

  // Pitch strips by pitch type. rows = the two stump lines in the art (pixels
  // from the top); the top one is the batter's end. mPerPx = metres per pixel
  // across (the brown strip is 3.05 m wide).
  pitchArt: {
    balanced: { id: 'pitch_balanced', rows: [36.5, 374.5], cx: 123.5, mPerPx: 0.0185 },
    green:    { id: 'pitch_green',    rows: [36.5, 374.5], cx: 125,   mPerPx: 0.0185 },
    dry:      { id: 'pitch_dry',      rows: [36.5, 374.5], cx: 123.5, mPerPx: 0.0185 },
    hardFast: { id: 'pitch_hard',     rows: [36, 370.5],   cx: 128.5, mPerPx: 0.0185 },
    worn:     { id: 'pitch_worn',     rows: [36, 370.5],   cx: 125.5, mPerPx: 0.0185 },
  },

  // Crowd reactions: cheer flip-book on fours / wickets, a bigger roar (jumping) on a six.
  crowdAnim: { cheerFps: 5, jumpAbove: 0.85, cheerAbove: 0.25, flagWave: 3.2 },

  // ---- Pitch types (plan 7.8): small, readable effects ----------------------
  // Multipliers on seam movement, swing, spin turn, bounce and pace.
  pitchTypes: {
    balanced: { nameKey: 'pitch.balanced', seam: 1,    swing: 1,    turn: 1,    bounce: 1,    pace: 1 },
    green:    { nameKey: 'pitch.green',    seam: 1.35, swing: 1.1,  turn: 0.85, bounce: 1.02, pace: 1 },
    dry:      { nameKey: 'pitch.dry',      seam: 0.9,  swing: 0.9,  turn: 1.4,  bounce: 0.97, pace: 0.98 },
    hardFast: { nameKey: 'pitch.hardFast', seam: 1,    swing: 1,    turn: 0.9,  bounce: 1.1,  pace: 1.04 },
    worn:     { nameKey: 'pitch.worn',     seam: 1.2,  swing: 1,    turn: 1.2,  bounce: 1,    pace: 0.99, variable: 0.08 },
  },
  // ---- Weather (plan 7.9) -------------------------------------------------------
  weather: {
    clear:    { nameKey: 'weather.clear',    swing: 1,    turn: 1 },
    overcast: { nameKey: 'weather.overcast', swing: 1.4,  turn: 1 },
    windy:    { nameKey: 'weather.windy',    swing: 1.15, turn: 1 },
    hotDry:   { nameKey: 'weather.hotDry',   swing: 0.85, turn: 1.1 },
  },
  // Quick Match conditions (seeded). Career will use the origin's weights.
  quickMatch: {
    pitchWeights: { balanced: 35, green: 15, dry: 20, hardFast: 20, worn: 10 },
    weatherWeights: { clear: 50, overcast: 20, windy: 15, hotDry: 15 },
  },
};
