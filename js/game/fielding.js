// Cricket Arcade — automatic fielding + hit outcome (plan 6.3, 7.3).
// Flies the hit ball on the fixed step and asks, each step: has it cleared
// the rope? can a fielder get there in time to catch or stop it?
// Catch attempts roll on the 'fielding' random stream.

const Fielding = {
  // The field setting in use (a FIELD_DATA preset) and the fielding side's
  // quality (Duel.fieldMods). Scenes set these each over; null = the plain
  // balanced field from batting.js with average fielders.
  preset: null,
  powerplay: false,
  mods: null,

  setPreset(id, powerplay) {
    this.preset = FIELD_DATA.presets.find((p) => p.id === id) || null;
    this.powerplay = !!powerplay;
    this._cache = null;
  },
  clear() { this.preset = null; this.powerplay = false; this.mods = null; this._cache = null; },

  // Where a preset puts everyone (powerplay: extra deep fielders come in).
  positionsOf(preset, powerplay) {
    const list = preset.positions.map(([id, x, z]) => ({ id, x, z, keeper: id === 'keeper' }));
    if (powerplay) {
      const cz = BATTING_DATA.field.boundaryCentreZ;
      const dist = (f) => Math.hypot(f.x, f.z - cz);
      const outside = list.filter((f) => !f.keeper && dist(f) > FIELD_DATA.ringRadius).sort((a, b) => dist(a) - dist(b));
      for (const f of outside.slice(FIELD_DATA.powerplayMaxOutside)) {
        const k = (FIELD_DATA.ringRadius - 2) / dist(f);
        f.x *= k; f.z = cz + (f.z - cz) * k;
      }
    }
    return list;
  },

  // Home positions of every fielder this ball (bowler joins after delivery).
  fielders() {
    const F = BATTING_DATA.field;
    if (this._cache) return this._cache;
    const list = this.preset ? this.positionsOf(this.preset, this.powerplay)
      : F.positions.map(p => ({ id: p.id, x: p.x, z: p.z, keeper: !!p.keeper }));
    if (F.bowlerFields) list.push({ id: 'bowler', x: 0.4, z: F.bowlerFollowThroughZ, bowler: true });
    this._cache = list;
    return list;
  },

  // The computer's field for this over (plan 7.16), from FIELD_DATA.aiRules.
  // ctx: { phase, kind, family, wicketsFell }; allowed(id) limits the choice
  // (the player's auto-pick only uses unlocked presets).
  aiChoose(ctx, rng, allowed) {
    for (const rule of FIELD_DATA.aiRules) {
      const w = rule.when;
      if (w.phase && w.phase !== ctx.phase) continue;
      if (w.kind && w.kind !== ctx.kind) continue;
      if (w.family && w.family !== ctx.family) continue;
      if (w.wicketsFell && !ctx.wicketsFell) continue;
      if (allowed && !allowed(rule.pick)) continue;
      if (rng.chance(rule.chance)) return rule.pick;
    }
    return 'balanced';
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
    const M = this.mods || { catchBonus: 0, stopBonus: 0, speedMult: 1 };
    const speedF = F.fielderSpeed * M.speedMult;
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
        const run = Math.max(0, t - F.reaction) * speedF + F.reach;
        const d = Math.hypot(x - f.x, z - f.z);
        if (d > run) continue;
        if (bounced === 0 && catchable && y >= F.catchMinHeight && y <= F.catchMaxHeight) {
          if (noCatch[f.id]) continue;
          // Catch attempt: full-stretch catches are harder.
          const stretch = Math.max(0, Math.min(1, (d - (run - F.reach)) / F.reach));
          const p = F.catchSkill + M.catchBonus - F.hardCatchPenalty * stretch;
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
          if (tier && !rng.chance(Math.min(0.97, tier.chance + M.stopBonus))) { noStop[f.id] = true; continue; }
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
        const arrive = F.reaction + Math.max(0, d - F.reach) / speedF;
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
