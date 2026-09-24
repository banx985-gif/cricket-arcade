// Cricket Arcade — automatic fielding + hit outcome (plan 6.3, 7.3).
// Flies the hit ball on the fixed step and asks, each step: has it cleared
// the rope? can a fielder get there in time to catch or stop it?
// Catch attempts roll on the 'fielding' random stream.

const Fielding = {
  // Home positions of every fielder this ball (bowler joins after delivery).
  fielders() {
    const F = BATTING_DATA.field;
    const list = F.positions.map(p => ({ id: p.id, x: p.x, z: p.z, keeper: !!p.keeper }));
    if (F.bowlerFields) list.push({ id: 'bowler', x: 0.4, z: F.bowlerFollowThroughZ, bowler: true });
    return list;
  },

  // Placement assist (plan 6.1): nudge an aimed shot toward the nearest gap
  // so players don't have to find tiny angles. Returns the adjusted angle.
  gapAssist(dirDeg) {
    const max = BATTING_DATA.direction.gapAssist;
    let nearest = null;
    for (const f of this.fielders()) {
      if (f.keeper || f.z < 3) continue;
      const a = Math.atan2(f.x, f.z) * 180 / Math.PI;
      const diff = dirDeg - a;
      if (Math.abs(diff) < max && (nearest === null || Math.abs(diff) < Math.abs(nearest))) nearest = diff;
    }
    if (nearest === null) return dirDeg;
    return dirDeg + (max - Math.abs(nearest)) * (nearest >= 0 ? 1 : -1);
  },

  distToBoundary(x, z) {
    const F = BATTING_DATA.field;
    return F.boundaryRadius - Math.hypot(x, z - F.boundaryCentreZ);
  },

  // start: ball position at contact; c: Contact.resolve() result.
  resolve(start, c, shotId, rng) {
    const F = BATTING_DATA.field;
    const fielders = this.fielders();
    const catchable = c.kind === 'edge' || c.loftDeg >= F.minLoftForCatch;
    const noCatch = {};          // fielders who already dropped it
    const noStop = {};           // fielders the ball already beat
    const out = {
      result: null, runs: 0, fielder: null, catchPoint: null,
      dropped: null, crossPoint: null, endT: 0,
    };

    const sim = BallSim.hit(start, c.vel, (t, x, y, z, bounced, speed) => {
      if (this.distToBoundary(x, z) <= 0) {
        out.crossPoint = { x, z };
        return bounced === 0 ? 'six' : 'four';
      }
      for (const f of fielders) {
        const run = Math.max(0, t - F.reaction) * F.fielderSpeed + F.reach;
        const d = Math.hypot(x - f.x, z - f.z);
        if (d > run) continue;
        if (bounced === 0 && catchable && y >= F.catchMinHeight && y <= F.catchMaxHeight) {
          if (noCatch[f.id]) continue;
          // Catch attempt: full-stretch catches are harder.
          const stretch = Math.max(0, Math.min(1, (d - (run - F.reach)) / F.reach));
          const p = F.catchSkill - F.hardCatchPenalty * stretch;
          if (rng.chance(p)) {
            out.fielder = { id: f.id, from: { x: f.x, z: f.z }, to: { x, z }, t };
            out.catchPoint = { x, y, z };
            return 'caught';
          }
          noCatch[f.id] = true;
          out.dropped = { id: f.id, t, x, y, z };
          continue;
        }
        if (y <= F.groundPickupMaxHeight && (bounced > 0 || !catchable || noCatch[f.id])) {
          if (noStop[f.id]) continue;
          const tier = F.cleanStop.find(s => speed >= s.minSpeed);
          if (tier && !rng.chance(tier.chance)) { noStop[f.id] = true; continue; }
          out.fielder = { id: f.id, from: { x: f.x, z: f.z }, to: { x, z }, t };
          return 'fielded';
        }
      }
      return null;
    });

    out.path = sim.path;
    out.endT = sim.path.duration();
    const end = { x: sim.path.x[sim.path.n - 1], z: sim.path.z[sim.path.n - 1] };

    if (sim.endReason === 'six' || sim.endReason === 'four') {
      out.result = sim.endReason;
      out.runs = sim.endReason === 'six' ? 6 : 4;
      // nearest fielder gives chase toward where it crossed
      const f = this._nearest(fielders, end.x, end.z);
      out.fielder = { id: f.id, from: { x: f.x, z: f.z }, to: end, t: out.endT, chase: true };
    } else if (sim.endReason === 'caught') {
      out.result = 'caught';
    } else {
      // Fielded on the move, or the ball stopped and someone walks to it.
      let fieldT = out.endT;
      if (sim.endReason !== 'fielded') {
        const f = this._nearest(fielders, end.x, end.z);
        const d = Math.hypot(end.x - f.x, end.z - f.z);
        const arrive = F.reaction + Math.max(0, d - F.reach) / F.fielderSpeed;
        fieldT = Math.max(out.endT, arrive);
        out.fielder = { id: f.id, from: { x: f.x, z: f.z }, to: end, t: arrive };
      }
      out.result = 'fielded';
      out.runs = fieldT >= F.runs.twoRunsAfter ? 2 : fieldT >= F.runs.oneRunAfter ? 1 : 0;
      out.fieldT = fieldT;
    }
    return out;
  },

  _nearest(fielders, x, z) {
    let best = null, bd = Infinity;
    for (const f of fielders) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  },
};
