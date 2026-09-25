// Cricket Arcade — bat contact (plan 6.1, 7.2–7.4).
// Turns "which button, how well timed, where aimed" into a launch velocity.
// Uses the 'batting' random stream only.

const Contact = {
  // err = press time minus ideal time (seconds). Negative = early.
  // scale = the duel's window size (Duel.windowScale: batter Timing vs bowler
  // Delivery, pressure, Composure). 1 = the windows in batting.js.
  // extra (optional, techniques and perks): { perfect, good } make just that
  // window bigger (Perfect Window, Sharp Eye); perfectIsGood = the Perfect
  // window is Good-sized (the Legend Moment).
  grade(shotId, err, scale, extra) {
    const w = this.windows(shotId, scale, extra);
    const a = Math.abs(err);
    if (a <= w.perfect) return 'perfect';
    if (a <= w.good) return 'good';
    if (a <= w.edge) return err < 0 ? 'early' : 'late';
    return 'miss';
  },

  // The windows in use, in seconds either side of the ideal moment.
  windows(shotId, scale, extra) {
    const w = BATTING_DATA.shots[shotId].window, k = scale || 1, x = extra || {};
    const good = w.good * k * (x.good || 1);
    const perfect = x.perfectIsGood ? good : Math.min(good, w.perfect * k * (x.perfect || 1));
    return { perfect, good, edge: Math.max(w.edge * k, good) };
  },

  // Latest press (after the ideal moment) that can still make contact.
  lateLimit(shotId, scale, extra) { return this.windows(shotId, scale, extra).edge; },

  inReach(ball) {
    const PI = BATTING_DATA.pitch;
    return Math.abs(ball.x - PI.reachCentreX) <= PI.reachHalfWidth && ball.y <= PI.reachMaxHeight;
  },

  // o.mods (from the duel, optional): { edge, power, jitter } multipliers, and
  // speedGrade = hit it as far as this grade would (Boundary King).
  // Returns { kind: 'hit'|'edge'|'defend', vel, dirDeg, loftDeg, speed }
  resolve(o, rng) {
    const S = BATTING_DATA.shots[o.shotId], DIR = BATTING_DATA.direction, PI = BATTING_DATA.pitch;
    const grade = o.grade;
    const m = o.mods || {};

    // Edges: mistimed shots can take the edge and fly fine behind the stumps.
    // Contact makes them rarer; the bowler's Movement and Deception more common.
    if (rng.chance(Math.min(0.9, (S.edgeChance[grade] || 0) * (m.edge || 1)))) {
      const side = rng.chance(DIR.insideEdgeChance) ? -1 : 1;
      const dirDeg = side * rng.rangeOf(DIR.edgeAngle);
      const loftDeg = rng.rangeOf(DIR.edgeLoft) * (o.shotId === 'defend' ? 0.4 : 1);
      const speed = rng.rangeOf(DIR.edgeSpeed) * (o.shotId === 'defend' ? 0.5 : 1);
      return this._pack('edge', dirDeg, loftDeg, speed);
    }

    // Direction: the stick if used, otherwise follow the line of the ball.
    let dirDeg;
    if (o.aim && o.aim.active) {
      dirDeg = o.aim.x * DIR.maxAim;
      if (o.shotId !== 'defend') dirDeg = Fielding.gapAssist(dirDeg);
    } else {
      dirDeg = Math.max(-45, Math.min(45, (o.ball.x - PI.reachCentreX) * DIR.autoFromLine));
    }
    // Timing drags the ball: early -> leg side, late -> off side.
    const sev = grade === 'early' || grade === 'late' ? 1 : grade === 'good' ? 0.35 : 0;
    if (o.err < 0) dirDeg += DIR.earlyPull * sev; else dirDeg += DIR.latePush * sev;
    dirDeg += rng.range(-1, 1) * S.directionJitter * (m.jitter || 1);
    dirDeg = Math.max(-150, Math.min(150, dirDeg));

    // Loft: stick up = in the air, stick down = along the ground.
    const ay = o.aim && o.aim.active ? o.aim.y : 0;
    let loftDeg = ay < 0 ? S.loft.neutral + (S.loft.up - S.loft.neutral) * (-ay)
                         : S.loft.neutral + (S.loft.down - S.loft.neutral) * ay;
    if (o.shotId !== 'defend' && o.ball.y > 1.15) loftDeg += DIR.highBallExtraLoft;
    loftDeg += rng.range(-2, 2);
    loftDeg = Math.max(0, loftDeg);

    let speed = S.speed[m.speedGrade || grade] * rng.range(0.97, 1.03) * (m.power || 1);
    return this._pack(o.shotId === 'defend' ? 'defend' : 'hit', dirDeg, loftDeg, speed);
  },

  _pack(kind, dirDeg, loftDeg, speed) {
    const d = dirDeg * Math.PI / 180, l = loftDeg * Math.PI / 180;
    return {
      kind, dirDeg, loftDeg, speed,
      vel: {
        x: speed * Math.cos(l) * Math.sin(d),
        y: speed * Math.sin(l),
        z: speed * Math.cos(l) * Math.cos(d),
      },
    };
  },
};
