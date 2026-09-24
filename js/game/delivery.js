// Cricket Arcade — deliveries.
// Six Smash: all 20 deliveries of an innings are made up front from the
// 'bowling' stream, so the same seed always gives the same 20 balls.
// Wicket Rush: the player's inputs choose the bounce point and pace, and
// Delivery.build() turns them into the same kind of ball.

const Delivery = {
  // Build a delivery from an exact bounce point.
  // p: { index, lengthId, speed, releaseX, bounceX, bounceZ, movement, restitution, releaseHeight? }
  build(p) {
    const D = BATTING_DATA.delivery, P = BATTING_DATA.physics;
    const release = { x: p.releaseX, y: p.releaseHeight || D.releaseHeight, z: D.releaseZ };
    const dx = p.bounceX - release.x, dz = p.bounceZ - release.z;
    const distXZ = Math.hypot(dx, dz);
    const t1 = distXZ / p.speed;
    const vy = (P.ballRadius - release.y + 0.5 * P.gravity * t1 * t1) / t1;
    const vel = { x: dx / distXZ * p.speed, y: vy, z: dz / distXZ * p.speed };
    // Where the ball would cross the stumps line before any movement.
    const line = release.x + dx * (release.z / (release.z - p.bounceZ));
    const d = {
      index: p.index || 0, lengthId: p.lengthId || this.lengthOf(p.bounceZ), speed: p.speed,
      line, bounceZ: p.bounceZ, movement: p.movement || 0, restitution: p.restitution,
      release, vel,
      kmh: Math.round(p.speed * D.displayKmhPerMs),
      golden: false,
      params: p,            // kept so a delivery can be rebuilt (e.g. turned into a wide)
    };
    d.sim = BallSim.delivery(d);
    return d;
  },

  lengthOf(bounceZ) {
    for (const l of BATTING_DATA.delivery.lengths) {
      if (bounceZ >= l.bounceZ[0] && bounceZ < l.bounceZ[1]) return l.id;
    }
    return bounceZ < 2 ? 'yorker' : 'short';
  },

  make(index, rng) {
    const D = BATTING_DATA.delivery;
    const len = rng.weighted(D.lengths);
    const speed = rng.rangeOf(D.speed);
    const line = rng.rangeOf(D.line);
    const bounceZ = rng.rangeOf(len.bounceZ);
    const releaseX = rng.rangeOf(D.releaseX);
    const movement = rng.rangeOf(D.movement);
    const restitution = rng.rangeOf(D.bounceRestitution);
    // The bounce point sits on the straight line from release through `line`.
    const bounceX = releaseX + (line - releaseX) * ((D.releaseZ - bounceZ) / D.releaseZ);
    return this.build({ index, lengthId: len.id, speed, releaseX, bounceX, bounceZ, movement, restitution });
  },

  innings(count) {
    const rng = RNG.stream('bowling');
    const list = [];
    for (let i = 0; i < count; i++) list.push(this.make(i, rng));
    // Golden Ball hook: rolled on its own stream so turning the feature on
    // never changes the deliveries themselves.
    const G = SIX_SMASH_DATA.hooks.goldenBall;
    if (G.enabled) {
      const g = RNG.stream('golden');
      for (const d of list) d.golden = g.chance(G.chance);
    }
    return list;
  },

  // A short text fingerprint of an innings, for checking determinism.
  fingerprint(list) {
    return list.map(d => `${d.lengthId[0]}${d.speed.toFixed(2)}/${d.line.toFixed(3)}/${d.movement.toFixed(2)}`).join(' ');
  },
};
