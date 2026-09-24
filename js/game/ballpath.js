// Cricket Arcade — ball flight on a fixed physics step.
// Every ball's whole path is simulated ONCE up front at a fixed step
// (CONFIG.PHYSICS_STEP) and stored. The live game then just plays the stored
// path back by time, drawing between steps. That makes every flight exactly
// repeatable (same seed = same deliveries) and lets the game know the outcome
// (six? caught?) the moment the bat hits the ball.

class BallPath {
  constructor() {
    this.x = []; this.y = []; this.z = [];
    this.bounces = [];      // step indices where the ball hit the ground
    this.step = CONFIG.PHYSICS_STEP;
  }
  get n() { return this.x.length; }
  push(x, y, z) { this.x.push(x); this.y.push(y); this.z.push(z); }
  duration() { return (this.n - 1) * this.step; }

  // Position at time t (seconds from the path start), interpolated.
  at(t, out) {
    const o = out || {};
    const f = Math.max(0, t / this.step);
    const i = Math.min(this.n - 1, Math.floor(f));
    const j = Math.min(this.n - 1, i + 1);
    const k = Math.min(1, f - i);
    o.x = this.x[i] + (this.x[j] - this.x[i]) * k;
    o.y = this.y[i] + (this.y[j] - this.y[i]) * k;
    o.z = this.z[i] + (this.z[j] - this.z[i]) * k;
    o.i = i;
    return o;
  }

  // Cut the path short (ball caught / fielded).
  truncate(n) {
    this.x.length = n; this.y.length = n; this.z.length = n;
    this.bounces = this.bounces.filter(b => b < n);
  }
}

const BallSim = {
  // Simulate a DELIVERY from release to the keeper.
  delivery(d) {
    const P = BATTING_DATA.physics, PI = BATTING_DATA.pitch;
    const dt = CONFIG.PHYSICS_STEP, g = P.gravity, r = P.ballRadius;
    const path = new BallPath();
    let x = d.release.x, y = d.release.y, z = d.release.z;
    let vx = d.vel.x, vy = d.vel.y, vz = d.vel.z;
    let bounced = 0;
    path.push(x, y, z);
    for (let s = 0; s < 600; s++) {
      vy -= g * dt;
      x += vx * dt; y += vy * dt; z += vz * dt;
      if (y <= r && vy < 0) {
        y = r;
        if (bounced === 0) {
          vy = -vy * d.restitution;
          vx = vx * BATTING_DATA.delivery.bounceSpeedKeep + d.movement;
          vz = vz * BATTING_DATA.delivery.bounceSpeedKeep;
        } else {
          vy = -vy * P.bounceRestitution;
          vx *= P.bounceFriction; vz *= P.bounceFriction;
        }
        bounced++;
        path.bounces.push(path.n);
      }
      path.push(x, y, z);
      if (z <= PI.keeperZ) break;
    }

    // Key moments.
    let contactIdx = -1, stumpsIdx = -1, hitsStumps = false;
    for (let i = 1; i < path.n; i++) {
      if (contactIdx < 0 && path.z[i] <= PI.contactZ) contactIdx = i;
      if (stumpsIdx < 0 && path.z[i] <= 0) {
        stumpsIdx = i;
        // interpolate to the exact stumps plane
        const k = path.z[i - 1] / (path.z[i - 1] - path.z[i]);
        const sx = path.x[i - 1] + (path.x[i] - path.x[i - 1]) * k;
        const sy = path.y[i - 1] + (path.y[i] - path.y[i - 1]) * k;
        hitsStumps = Math.abs(sx) <= PI.stumpsHalfWidth + r && sy <= PI.stumpsHeight + r;
      }
    }
    return { path, contactIdx, stumpsIdx, hitsStumps };
  },

  // Simulate a HIT ball from a start point and velocity. onStep(t, x, y, z,
  // bouncedCount, groundSpeed) may return true to stop the ball there (caught/fielded).
  hit(start, vel, onStep) {
    const P = BATTING_DATA.physics;
    const dt = CONFIG.PHYSICS_STEP, g = P.gravity, r = P.ballRadius;
    const path = new BallPath();
    let x = start.x, y = Math.max(r, start.y), z = start.z;
    let vx = vel.x, vy = vel.y, vz = vel.z;
    let bounced = 0, rolling = false;
    path.push(x, y, z);
    const maxSteps = Math.ceil(P.maxSimTime / dt);
    let endReason = 'timeout';
    for (let s = 1; s <= maxSteps; s++) {
      if (!rolling) {
        vy -= g * dt;
        const drag = 1 - P.airDrag * dt;
        vx *= drag; vz *= drag;
      } else {
        const sp = Math.hypot(vx, vz);
        const nsp = Math.max(0, sp - P.rollDecel * dt);
        if (sp > 0) { vx *= nsp / sp; vz *= nsp / sp; }
      }
      x += vx * dt; y += vy * dt; z += vz * dt;
      if (!rolling && y <= r && vy < 0) {
        y = r;
        vy = -vy * P.bounceRestitution;
        vx *= P.bounceFriction; vz *= P.bounceFriction;
        bounced++;
        path.bounces.push(path.n);
        if (vy < 1.2) { vy = 0; rolling = true; }
      }
      path.push(x, y, z);
      const res = onStep ? onStep(s * dt, x, y, z, bounced, Math.hypot(vx, vz)) : null;
      if (res) { endReason = res; break; }
      if (rolling && Math.hypot(vx, vz) < 0.05) { endReason = 'stopped'; break; }
    }
    return { path, endReason, bounced };
  },
};
