// Cricket Arcade — global configuration.
// All gameplay/UI layout uses ONE logical coordinate system: 1920 x 1080.
// The Display module maps it onto any real landscape screen without distortion.
// Gameplay tuning lives in js/data/, not here — this file is engine/app level.

const CONFIG = {
  // The game's name: the ONE place to change it (M14). The home screen, welcome panel,
  // settings, browser tab, installed web app, Android and iOS app names and the store
  // text (docs/store/) all read it. After changing it, run the publish / app build as usual.
  TITLE: 'Cricket Legends',
  TITLE_SHORT: 'Cricket Legends', // under the phone's home-screen icon (some phones cut names over ~12 letters)

  BUILD_VERSION: '0.14.0-m14',
  BUILD_STAMP: '20260926-234417',            // filled in by publish.ps1 (date-time of the published build)
  CONTENT_VERSION: 8,
  SAVE_SCHEMA_VERSION: 2,
  DEBUG_BUILD: true,          // dev panel + content checks. publish.ps1 -Release turns this off.
  // How the game is sold (plan 44 item 6, still open): 'free_intro' = free download,
  // one Full Game Unlock purchase; 'paid_download' = everything open, no unlock screens.
  MONETISATION: 'free_intro',

  LOGICAL_W: 1920,
  LOGICAL_H: 1080,

  DPR_CAP: 2,                 // cap devicePixelRatio for performance
  MAX_DT: 0.05,               // hitch clamp (seconds)
  PHYSICS_STEP: 1 / 120,      // fixed ball-physics step (seconds)

  MIN_TOUCH: 88,              // minimum touch target (logical px)

  FONT: '"Arial Black", "Arial Bold", Arial, sans-serif',

  COLOR: {
    ink:       '#0a0f0c',
    white:     '#ffffff',
    cream:     '#fff6df',
    yellow:    '#ffd23f',
    gold:      '#ffb400',
    orange:    '#ff7a1a',
    red:       '#ff3b3b',
    lime:      '#a8e832',
    green:     '#2fbf5b',
    cyan:      '#22d9ff',
    blue:      '#2f7bff',
    violet:    '#9b5cff',
    grey:      '#8a948e',
    panel:     'rgba(8, 20, 14, 0.78)',
    panelEdge: 'rgba(255, 255, 255, 0.18)',
    sky:       '#7ec8f0',
    skyLow:    '#cfeaf7',
  },
};
