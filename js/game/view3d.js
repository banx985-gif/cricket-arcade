// Cricket Arcade — simple 3D-to-screen camera for the 2D pitch view.
// The world is flat 3D (metres); this projects points onto the 1920x1080
// logical screen with a look-at perspective camera. There is no free camera:
// it is either the fixed pitch view or the ball-follow view (plan 7.11).

const View3D = {
  pos: { x: 0, y: 5, z: 30 },
  tgt: { x: 0, y: 1, z: 0 },
  focal: 2000,
  cx: CONFIG.LOGICAL_W / 2,
  cy: CONFIG.LOGICAL_H / 2,
  near: 0.6,
  // basis
  r: { x: 1, y: 0, z: 0 }, u: { x: 0, y: 1, z: 0 }, f: { x: 0, y: 0, z: -1 },

  set(pos, tgt, focal) {
    this.pos.x = pos.x; this.pos.y = pos.y; this.pos.z = pos.z;
    this.tgt.x = tgt.x; this.tgt.y = tgt.y; this.tgt.z = tgt.z;
    this.focal = focal;
    this._basis();
  },

  _basis() {
    let fx = this.tgt.x - this.pos.x, fy = this.tgt.y - this.pos.y, fz = this.tgt.z - this.pos.z;
    let fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl; fy /= fl; fz /= fl;
    // right = f × up(0,1,0)
    let rx = -fz, ry = 0, rz = fx;
    let rl = Math.hypot(rx, rz) || 1;
    rx /= rl; rz /= rl;
    // up = r × f
    const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    this.f = { x: fx, y: fy, z: fz };
    this.r = { x: rx, y: ry, z: rz };
    this.u = { x: ux, y: uy, z: uz };
  },

  // World -> camera space
  toCam(x, y, z) {
    const dx = x - this.pos.x, dy = y - this.pos.y, dz = z - this.pos.z;
    return {
      x: dx * this.r.x + dy * this.r.y + dz * this.r.z,
      y: dx * this.u.x + dy * this.u.y + dz * this.u.z,
      z: dx * this.f.x + dy * this.f.y + dz * this.f.z,
    };
  },

  // World point -> screen {x, y, s: px per metre, d: depth}, or null if behind.
  project(x, y, z) {
    const c = this.toCam(x, y, z);
    if (c.z < this.near) return null;
    const k = this.focal / c.z;
    return { x: this.cx + c.x * k + Effects.shakeX, y: this.cy - c.y * k + Effects.shakeY, s: k, d: c.z };
  },

  // Project a 3D polygon, clipping it against the near plane first so shapes
  // that pass behind the camera (the boundary, the ground) still draw right.
  projectPoly(points) {
    const cam = points.map(p => this.toCam(p.x, p.y, p.z));
    const out = [];
    const n = this.near;
    for (let i = 0; i < cam.length; i++) {
      const a = cam[i], b = cam[(i + 1) % cam.length];
      const aIn = a.z >= n, bIn = b.z >= n;
      if (aIn) out.push(a);
      if (aIn !== bIn) {
        const t = (n - a.z) / (b.z - a.z);
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: n });
      }
    }
    return out.map(c => {
      const k = this.focal / c.z;
      return { x: this.cx + c.x * k + Effects.shakeX, y: this.cy - c.y * k + Effects.shakeY };
    });
  },
};
