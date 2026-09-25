// Cricket Arcade — Quick Match data (M03, plan 7.13 / 7.14 / 7A).
// A 5-over match: toss, two innings (you bat one, bowl the other), running
// between wickets, extras, and Super Overs until there's a winner.

const MATCH_DATA = {
  formats: {
    quick5: { id: 'quick5', overs: 5, wickets: 10 },
    // 10 / 20 over matches are just more overs once this plays well:
    quick10: { id: 'quick10', overs: 10, wickets: 10 },
    quick20: { id: 'quick20', overs: 20, wickets: 10 },
    // Developer/test format: 1 over a side, so the test gates finish quickly.
    test1: { id: 'test1', overs: 1, wickets: 10, devOnly: true },
  },
  defaultFormat: 'quick5',
  superOver: { overs: 1, wickets: 2 },

  teams: {
    player: { nameKey: 'match.teamYou', shortKey: 'match.shortYou', color: '#1d4ed8' },
    ai:     { nameKey: 'match.teamRivals', shortKey: 'match.shortRivals', color: '#1f8a4c' },
  },

  toss: {
    aiBowlFirstChance: 0.6,       // when the AI wins the toss, how often it chooses to chase
    flipTime: 1.6,                // seconds the coin spins
  },

  // ---- Running between wickets (plan 6.1) --------------------------------
  running: {
    runTime: 1.85,                // seconds for one run (crease to crease)
    maxQueued: 2,                 // extra runs you can queue ahead (so up to 3 total)
    cancelBefore: 0.5,            // a run can be cancelled until it's this far done
    startDelay: 0.15,             // batters react to the shot
    pickupTime: 0.35,             // fielder gathers the ball before throwing
    throwSpeed: 26,               // m/s
    throwTarget: { x: 0, y: 1.0, z: 0.3 },   // keeper's end
    runOutGrace: 0.06,            // a run finishing this close to the ball arriving is safe
    riskMargin: 0.35,             // RUN button: green if you'd make it with this to spare
  },

  // ---- AI side --------------------------------------------------------------
  aiBowler: {
    wideChance: 0.035,            // per delivery
    noBallChance: 0.025,
    wideOffset: 1.25,             // how far off line a wide lands (metres)
  },
  aiRunning: {
    riskyRunChance: 0.12,         // AI batters sometimes try one run too many
  },

  feel: {
    overBreak: 1.1,               // "END OF OVER" pause
    outcomeHold: 1.15,
  },

  // ---- HUD art patches ------------------------------------------------------
  // The scoreboard / target panel art has example numbers painted in, so we
  // cover those spots with matching insets and write the live numbers on top.
  // Rects are in the art's own pixels: [x, y, w, h, topColour, bottomColour].
  hudArt: {
    scoreboard: {
      id: 'hud_scoreboard',
      patches: [
        [127, 47, 190, 101, '#0a55d9', '#0232a4'],   // team + runs/wickets
        [357, 57, 90, 86, '#032660', '#02204f'],     // overs
        [92, 164, 314, 33, '#021c42', '#041a38'],    // bottom line
      ],
      text: {
        team:  [140, 62, 26, 'left'],     // x, y, size, align
        score: [140, 112, 62, 'left'],
        oversLabel: [404, 72, 20, 'center'],
        overs: [406, 112, 40, 'center'],
        line:  [249, 181, 22, 'center'],
      },
    },
    target: {
      id: 'hud_target',
      patches: [
        [148, 50, 136, 60, '#00307a', '#00225d'],    // target number
        [86, 176, 84, 51, '#001d46', '#001d47'],     // runs needed
        [266, 176, 84, 51, '#001e48', '#001d46'],    // balls left
        [262, 277, 88, 27, '#3c230c', '#221509'],    // required rate
      ],
      text: {
        target: [216, 81, 52, 'center'],
        need:   [128, 202, 46, 'center'],
        balls:  [308, 202, 46, 'center'],
        rate:   [306, 291, 24, 'center'],
      },
    },
  },
};
