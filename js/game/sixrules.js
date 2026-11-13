// Cricket Legends — sixes are earned (M15 Job 3b, Aaron 15 Oct). Tuning: BATTING_DATA.sixes.
//
// Used by real matches only (you batting, you bowling, and simulated matches); Six Smash and
// Wicket Rush keep their own easier rules. A six needs everything at once:
//   - PERFECT timing (good timing on a loft clears the infield for 2 or 4, or hangs up as a catch;
//     a mistimed loft is skied),
//   - a lofted shot that suits the ball (line and length: half-volleys go straight, short balls
//     get pulled, yorkers are almost impossible to get under),
//   - enough Power,
//   - and it's a MATCHUP: my batting against THIS bowler's bowling (both ways round). The gap
//     widens or shrinks the perfect-timing window and how far the ball carries.
// The bowler fights back: after a boundary the computer bowler changes plan (another delivery,
// often slower / shorter / wider) and the captain moves a fielder back where it went, so the same
// spot twice in a row is harder. Stats never decide a ball alone, and timing never does either.

const SixRules = {
  D() { return BATTING_DATA.sixes; },

  // + = the batter is better than this bowler (overall batting v overall bowling).
  gap(bat, bowl) { return bat && bowl ? Teams.batRating(bat) - Teams.bowlRating(bowl) : 0; },

  // The perfect-timing window in a match: tighter than the challenge modes, and the matchup
  // widens or shrinks it. Returns a multiplier for Contact's `extra.perfect`.
  perfectK(bat, bowl) {
    const D = this.D(), W = D.window;
    const g = Math.max(W.min, Math.min(W.max, 1 + W.perGap * this.gap(bat, bowl)));
    const diff = typeof Difficulty !== 'undefined' ? (W.difficulty[Difficulty.id()] || 1) : 1;
    return W.base * g * diff;
  },

  // Is a loft the right shot for this ball? 0.7..1 (1 = the perfect ball to hit).
  fit(del, aim, dirDeg) {
    const F = this.D().fit;
    if (!del) return 1;
    const len = del.lengthId || 'good';
    const leg = dirDeg < -F.crossDeg, off = dirDeg > F.crossDeg;
    let k = F.length[len] !== undefined ? F.length[len] : 1;
    if (len === 'short' && leg) k = F.pull;                        // short ball pulled / hooked
    const x = del.line !== undefined ? del.line : 0;
    if (x > F.wideOff && leg) k *= F.crossLine;                    // dragging a wide one to leg
    if (x < F.onLegs && off) k *= F.crossLine;                     // hitting against the swing of the bat
    if (del.variation) k *= F.variation;                           // slower balls, cutters, googlies: harder to time a big hit
    return k;
  },

  // Called by Contact.resolve for a lofted hit (loftDeg >= lofted). Returns { speedK, loftAdd }.
  // m = BallPlay.mods(): { six: { bat, bowl, del, aim, releaseGrade, memory } }.
  carry(six, grade, dirDeg, rng, powerMult) {
    const D = this.D();
    const g = this.gap(six.bat, six.bowl);
    if (grade === 'early' || grade === 'late') return { speedK: D.skied.speed, loftAdd: D.skied.loftAdd };   // skied
    // Power on a loft: its own, gentler effect (the duel's power boost is swapped out for this one).
    const pow = (1 + D.power * Teams.n(six.bat && six.bat.stats.power)) / (powerMult || 1);
    const gapK = Math.max(D.gap.min, Math.min(D.gap.max, 1 + D.gap.perPoint * g));
    const rel = D.release[six.releaseGrade] || 1;
    let k = (D.grade[grade] || 1) * gapK * pow * this.fit(six.del, six.aim, dirDeg) * rel;
    const mem = six.memory;
    if (mem && mem.lastDir !== null && Math.abs(dirDeg - mem.lastDir) < D.repeat.withinDeg) k *= D.repeat.k;   // same spot again
    k *= 1 + (rng ? rng.range(-1, 1) : 0) * D.spread;
    if (grade !== 'perfect') return { speedK: Math.min(k, D.notPerfectCap / (powerMult || 1)), loftAdd: D.goodLoftAdd };   // only a perfect one clears the rope; good = flatter, into the deep
    return { speedK: k, loftAdd: 0 };
  },

  // ---- the bowler and captain fight back ----
  newMemory() { return { lastDir: null, after: 0, lastType: null }; },
  // A new over = a new bowler with a fresh plan (and the match checkpoint stays exact on resume).
  newOver(mem) { if (mem) { mem.after = 0; mem.lastDir = null; mem.lastType = null; } },
  // After each ball: a boundary sets the plan for the next balls.
  afterBall(mem, o) {
    if (!mem) return;
    const boundary = o.result === 'six' || o.result === 'four';
    if (boundary) {
      mem.lastDir = o.c ? o.c.dirDeg : null;
      mem.lastType = o.typeIdx;
      mem.after = this.D().fightBack.balls;
      if (mem.lastDir !== null && typeof Fielding !== 'undefined' && Fielding.moveBack) Fielding.moveBack(mem.lastDir);
    } else if (mem.after > 0) {
      mem.after--;
      if (mem.after === 0) mem.lastDir = null;
    }
  },
  // Bowling.aiChoose: reweight the deliveries after a boundary.
  reweight(list, mem) {
    const FB = this.D().fightBack;
    if (!mem || !mem.after) return list;
    return list.map((d) => Object.assign({}, d, { weight: d.weight * (d.i === mem.lastType ? FB.sameType : 1) * (FB.favour.includes(d.t.id) ? FB.favourK : 1) }));
  },
  // ...and bowl it wider of off now and then.
  lineAfter(mem, rng) {
    const FB = this.D().fightBack;
    if (!mem || !mem.after || !rng.chance(FB.widerChance)) return null;
    return rng.range(FB.widerLine[0], FB.widerLine[1]);
  },
};
