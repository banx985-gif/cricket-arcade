// Cricket Arcade — strings table (plan 43A.9).
// Every piece of text the player can see lives here, looked up by key.
// Use T('key') or T('key', { n: 5 }) — {name} placeholders are filled in.
// A missing key shows as [key] so it is easy to spot and never crashes.

const STRINGS = {
  en: {
    'app.rotate': 'TURN YOUR PHONE SIDEWAYS TO PLAY',

    'boot.loading': 'LOADING…',

    'title.game': 'CRICKET ARCADE',
    'title.mode': 'SIX SMASH',
    'title.play': 'PLAY',
    'title.best': 'BEST: {score}',
    'title.noBest': 'NO BEST SCORE YET',
    'title.pcHint': 'PC: WASD / arrows = aim · J = CONTROL · K = POWER · L = DEFEND · Esc = pause',
    'title.touchHint': 'Left thumb aims · right thumb swings',

    'common.soundOn': 'SOUND: ON',
    'common.soundOff': 'SOUND: OFF',

    'hud.score': 'SCORE',
    'hud.balls': 'BALLS',
    'hud.ballsLeft': '{n} LEFT',
    'hud.mult': 'x{n}',
    'hud.streak': 'SIX STREAK {n}',
    'hud.ballNo': 'BALL {n} OF {total}',
    'hud.lastBall': 'LAST BALL!',
    'hud.aim': 'AIM',
    'hud.loft': 'LOFT',
    'hud.ground': 'GROUND',
    'hud.golden': 'GOLDEN BALL!',
    'hud.speed': '{n} km/h',

    'shot.control': 'CONTROL',
    'shot.power': 'POWER',
    'shot.defend': 'DEFEND',

    'timing.early': 'EARLY',
    'timing.good': 'GOOD',
    'timing.perfect': 'PERFECT!',
    'timing.late': 'LATE',
    'timing.miss': 'MISS',
    'timing.tooEarly': 'too early',
    'timing.tooLate': 'too late',
    'timing.noShot': 'no shot',
    'timing.outOfReach': 'out of reach',

    'outcome.six': 'SIX!',
    'outcome.four': 'FOUR!',
    'outcome.runs1': '1 RUN',
    'outcome.runs2': '2 RUNS',
    'outcome.dot': 'DOT BALL',
    'outcome.miss': 'MISSED',
    'outcome.edge': 'EDGED',
    'outcome.defended': 'DEFENDED',
    'outcome.caught': 'CAUGHT!',
    'outcome.bowled': 'BOWLED!',
    'outcome.dropped': 'DROPPED!',
    'outcome.points': '+{n}',
    'outcome.penalty': '-{n}',
    'outcome.streakLost': 'STREAK LOST',
    'outcome.comboUp': 'COMBO x{n}!',

    'pause.title': 'PAUSED',
    'pause.resume': 'RESUME',
    'pause.restart': 'RESTART',
    'pause.quit': 'QUIT TO TITLE',

    'result.title': 'SIX SMASH — RESULT',
    'result.score': 'SCORE',
    'result.sixes': 'SIXES',
    'result.fours': 'FOURS',
    'result.bestStreak': 'BEST SIX STREAK',
    'result.wickets': 'WICKETS',
    'result.pb': 'PERSONAL BEST',
    'result.newBest': 'NEW PERSONAL BEST!',
    'result.retry': 'RETRY',
    'result.title_btn': 'TITLE',
    'result.seed': 'seed {seed}',

    // ---- M02: mode select, bowling, Wicket Rush ----
    'title.pick': 'PICK A CHALLENGE',
    'title.modeWicket': 'WICKET RUSH',
    'title.sixSub': 'You bat · 20 balls · hit sixes',
    'title.wicketSub': 'You bowl · 18 balls · take wickets',
    'title.pcHint2': 'PC: 1 / 2 / 3 pick a mode · batting: WASD aim, J K L shots, R run, X cancel · bowling: WASD aim, 1–4 delivery, hold SPACE',

    'result.titleSix': 'SIX SMASH — RESULT',
    'result.titleWicket': 'WICKET RUSH — RESULT',
    'result.dots': 'DOT BALLS',
    'result.runsConceded': 'RUNS GIVEN',
    'result.bestCombo': 'WICKETS IN A ROW',
    'result.pbLine': 'PERSONAL BEST: {score}',

    'outcome.lbw': 'LBW!',
    'outcome.wide': 'WIDE',
    'outcome.noball': 'NO BALL!',
    'outcome.notOut': 'NOT OUT — FREE HIT',
    'outcome.notOutNoBall': 'NOT OUT — NO BALL',
    'outcome.leave': 'LEFT ALONE',

    'timing.loose': 'LOOSE',

    'bowl.bowl': 'BOWL',
    'bowl.dragAim': 'DRAG TO AIM',
    'bowl.type.stock': 'FAST',
    'bowl.type.yorker': 'YORKER',
    'bowl.type.bouncer': 'BOUNCER',
    'bowl.type.slower': 'SLOWER',
    'bowl.goldenWicket': 'GOLDEN WICKET BALL!',
    'bowl.freeHit': 'FREE HIT — can’t be out',
    'bowl.freeHitNext': 'NEXT BALL IS A FREE HIT',
    'bowl.overstep': 'OVERSTEPPED!',
    'bowl.extraPenalty': 'EXTRA -{n}',
    'bowl.comboDown': 'COMBO DOWN',
    'bowl.wicketsN': 'WICKETS {n}',
    'bowl.comboN': 'IN A ROW {n}',
    'bowl.pressure': 'PRESSURE',
    'bowl.hint': 'Pick a delivery · drag to aim · HOLD BOWL and let go in the gold',

    'length.yorker': 'YORKER',
    'length.full': 'FULL',
    'length.good': 'GOOD LENGTH',
    'length.short': 'SHORT',

    // ---- M03: Quick Match ----
    'title.modeMatch': 'QUICK MATCH',
    'title.matchSub': '5 overs · bat and bowl',
    'title.matchRecord': 'WON {won} OF {played}',
    'title.noMatches': 'NO MATCHES YET',

    'match.teamYou': 'YOUR XI',
    'match.shortYou': 'YOU',
    'match.teamRivals': 'RIVALS XI',
    'match.shortRivals': 'RIV',
    'match.overs': 'OVERS',
    'match.oversN': '{n} OV',
    'match.lineRR': 'RUN RATE {rr}',
    'match.lineNeed': 'NEED {need} OFF {balls}',
    'match.targetN': 'TARGET {n}',
    'match.needFrom': 'NEED {need} FROM {balls}',
    'match.reqRate': 'REQ. RATE {rr}',
    'match.ahead': 'AHEAD BY {n}',
    'match.behind': 'BEHIND BY {n}',
    'match.onPace': 'ON PACE',
    'match.theyPrefix': 'RIVALS ',
    'match.thisOver': 'THIS OVER',
    'match.batterLine': 'BATTER {n}: {r} ({b})',
    'match.overBall': 'OVER {over} · BALL {ball}',
    'match.superOver': 'SUPER OVER',
    'match.plusRuns': '+{n}',
    'match.endOfOver': 'END OF OVER',
    'match.inningsEnd.chased': 'TARGET REACHED!',
    'match.inningsEnd.allOut': 'ALL OUT!',
    'match.inningsEnd.overs': 'INNINGS OVER',

    'match.tossTitle': 'THE TOSS',
    'match.coin.heads': 'HEADS',
    'match.coin.tails': 'TAILS',
    'match.youWonToss': 'YOU WON THE TOSS!',
    'match.theyWonToss': 'RIVALS WON THE TOSS',
    'match.chooseBatBowl': 'Bat first, or bowl first?',
    'match.theyBat': 'They chose to BAT first — you bowl',
    'match.theyBowl': 'They chose to BOWL first — you bat',
    'match.bat': 'BAT',
    'match.bowl': 'BOWL',
    'match.play': 'PLAY',
    'match.formatLine': 'QUICK MATCH · {n} OVERS A SIDE',
    'match.continue': 'CONTINUE',
    'match.inningsBreak': 'INNINGS BREAK',
    'match.inningsLine': '{team}   {runs}/{wkts}   ({overs} ov)',
    'match.topScorer': 'Top score: Batter {n} — {r} ({b})',
    'match.extrasLine': 'Extras {n}',
    'match.youNeed': 'YOU NEED {n} FROM {balls} BALLS',
    'match.theyNeed': 'RIVALS NEED {n} FROM {balls} BALLS',
    'match.nowYouBat': 'Now you bat — chase it down!',
    'match.nowYouBowl': 'Now you bowl — defend it!',
    'match.scoresTied': 'SCORES TIED!',
    'match.superOverRules': '1 over each · {w} wickets · most runs wins · tie = another Super Over',
    'match.youBatFirstSO': 'You bat first',
    'match.youBowlFirstSO': 'You bowl first',
    'match.youWon': 'YOU WON!',
    'match.youLost': 'YOU LOST',
    'match.byWickets': '{team} won by {n} wickets ({balls} balls left)',
    'match.byWicketsOne': '{team} won by 1 wicket ({balls} balls left)',
    'match.byRuns': '{team} won by {n} runs',
    'match.byRunsOne': '{team} won by 1 run',
    'match.bySuperOver': '{team} won the Super Over!',
    'match.superOverN': 'SUPER OVER {n}',
    'match.inningsN': 'INNINGS {n}',
    'match.record': 'Quick Match record: won {won} of {played}',
    'match.playAgain': 'PLAY AGAIN',

    'outcome.runOut': 'RUN OUT!',
    'outcome.runsN': '{n} RUNS',

    'run.run': 'RUN',
    'run.runN': 'RUN x{n}',
    'run.cancel': 'CANCEL',
    'run.risk.safe': 'SAFE',
    'run.risk.risky': 'TIGHT!',
    'run.risk.danger': 'DANGER!',
    'run.risk.none': '',

    'dev.title': 'DEVELOPER PANEL',
    'dev.seed': 'Seed: {seed}',
    'dev.seedNext': 'Next innings seed: {seed}',
    'dev.seedRandom': 'Next innings seed: new each time',
    'dev.setSeed': 'SET SEED…',
    'dev.clearSeed': 'CLEAR FIXED SEED',
    'dev.replaySeed': 'REUSE THIS SEED',
    'dev.seedPrompt': 'Enter a seed number',
    'dev.golden': 'FORCE GOLDEN BALL: {state}',
    'dev.slowmo': 'SLOW-MO: {state}',
    'dev.hitzone': 'HIT-ZONE DEBUG: {state}',
    'dev.fps': 'SHOW FPS: {state}',
    'dev.wipe': 'WIPE SAVE',
    'dev.wiped': 'Save wiped',
    'dev.close': 'CLOSE',
    'dev.on': 'ON',
    'dev.off': 'OFF',
    'dev.fpsLabel': '{n} FPS',
    'dev.build': 'build {v}',
  },
};

const Strings = {
  lang: 'en',
  missing: {},
};

function T(key, vars) {
  const table = STRINGS[Strings.lang] || STRINGS.en;
  let s = table[key];
  if (s === undefined) s = STRINGS.en[key];
  if (s === undefined) {
    if (!Strings.missing[key]) {
      Strings.missing[key] = true;
      if (typeof console !== 'undefined') console.warn('Missing string key:', key);
    }
    return '[' + key + ']';
  }
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }
  return s;
}

// Locale-aware number formatting (plan 43A.9).
function formatNumber(n) {
  try { return Number(n).toLocaleString(); } catch (e) { return String(n); }
}
