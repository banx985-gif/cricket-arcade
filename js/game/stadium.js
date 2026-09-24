// Cricket Arcade — code-drawn stadium: sky, ground, outfield, rope, crowd,
// pitch, creases. Placeholder until stadium art arrives; everything is drawn
// in world metres through View3D so the camera can move freely.

const Stadium = {
  _circle: null,
  excitement: 0,       // 0..1, crowd bounce + colour flicker
  _time: 0,

  _ring(radius, y, segs) {
    const F = BATTING_DATA.field;
    const pts = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * radius, y, z: F.boundaryCentreZ + Math.sin(a) * radius });
    }
    return pts;
  },

  update(dt) {
    this._time += dt;
    this.excitement = Math.max(0, this.excitement - dt * 0.35);
  },

  cheer(amount) { this.excitement = Math.min(1, Math.max(this.excitement, amount)); },

  drawBackground(ctx) {
    const v = Display.viewRect();
    // Sky
    const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h);
    g.addColorStop(0, CONFIG.COLOR.sky);
    g.addColorStop(0.6, CONFIG.COLOR.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(v.x, v.y, v.w, v.h);

    const F = BATTING_DATA.field;
    const Rb = F.boundaryRadius;

    // Stands (a sloped ring outside the rope). Drawn as quads, far ones first.
    const segs = 56;
    const inner = Rb + 5, outer = Rb + 34, top = 22;
    const quads = [];
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const cz = F.boundaryCentreZ;
      const q = [
        { x: c0 * inner, y: 0, z: cz + s0 * inner },
        { x: c1 * inner, y: 0, z: cz + s1 * inner },
        { x: c1 * outer, y: top, z: cz + s1 * outer },
        { x: c0 * outer, y: top, z: cz + s0 * outer },
      ];
      const mid = View3D.toCam((c0 + c1) / 2 * inner, 0, cz + (s0 + s1) / 2 * inner);
      quads.push({ q, depth: mid.z, i });
    }
    quads.sort((a, b) => b.depth - a.depth);

    // Ground beyond the stands (big quad), then the outfield disc on top.
    const big = 700;
    R.poly(View3D.projectPoly([
      { x: -big, y: 0, z: -big }, { x: big, y: 0, z: -big },
      { x: big, y: 0, z: big }, { x: -big, y: 0, z: big },
    ]), '#3d7f3a');

    // Stands and roof band
    for (const it of quads) {
      const pts = View3D.projectPoly(it.q);
      if (pts.length < 3) continue;
      R.poly(pts, it.i % 2 ? '#34405a' : '#2c3750');
    }
    // Crowd dots on the stands
    this._drawCrowd(ctx, quads, inner, outer, top);

    // Advertising board ring just outside the rope
    const boardIn = Rb + 1.5;
    for (const it of quads) {
      const a0 = (it.i / segs) * Math.PI * 2, a1 = ((it.i + 1) / segs) * Math.PI * 2;
      const cz = F.boundaryCentreZ;
      const pts = View3D.projectPoly([
        { x: Math.cos(a0) * boardIn, y: 0, z: cz + Math.sin(a0) * boardIn },
        { x: Math.cos(a1) * boardIn, y: 0, z: cz + Math.sin(a1) * boardIn },
        { x: Math.cos(a1) * boardIn, y: 1.1, z: cz + Math.sin(a1) * boardIn },
        { x: Math.cos(a0) * boardIn, y: 1.1, z: cz + Math.sin(a0) * boardIn },
      ]);
      R.poly(pts, ['#1d6fe0', '#f2b705', '#e0412b', '#12a57a'][it.i % 4]);
    }
  },

  _drawCrowd(ctx, quads, inner, outer, top) {
    const F = BATTING_DATA.field;
    const segs = quads.length;
    const cols = ['#ff5a5a', '#ffd23f', '#3fb6ff', '#ffffff', '#7cff7a', '#ff9d2e', '#c47bff'];
    const jump = this.excitement;
    for (const it of quads) {
      if (it.depth < 2) continue;
      const a0 = (it.i / segs) * Math.PI * 2, a1 = ((it.i + 1) / segs) * Math.PI * 2;
      for (let row = 0; row < 5; row++) {
        const f = (row + 0.5) / 5;
        const rad = inner + (outer - inner) * f;
        const y = top * f;
        for (let k = 0; k < 4; k++) {
          const a = a0 + (a1 - a0) * ((k + 0.5) / 4);
          const h = (it.i * 31 + row * 17 + k * 7) % 97;   // stable per seat
          const bob = jump > 0 ? Math.max(0, Math.sin(this._time * 14 + h)) * jump * 1.4 : 0;
          const p = View3D.project(Math.cos(a) * rad, y + 0.6 + bob, F.boundaryCentreZ + Math.sin(a) * rad);
          if (!p) continue;
          const r = Math.max(1.2, 0.45 * p.s);
          ctx.fillStyle = cols[h % cols.length];
          ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        }
      }
    }
  },

  drawField(ctx) {
    const F = BATTING_DATA.field, PI = BATTING_DATA.pitch;
    const Rb = F.boundaryRadius;
    if (!this._circle) this._circle = this._ring(Rb, 0, 72);
    const disc = View3D.projectPoly(this._circle);
    R.poly(disc, '#4c9a45');

    // Mowing stripes, clipped to the outfield
    ctx.save();
    ctx.beginPath();
    if (disc.length) {
      ctx.moveTo(disc[0].x, disc[0].y);
      for (let i = 1; i < disc.length; i++) ctx.lineTo(disc[i].x, disc[i].y);
      ctx.closePath();
      ctx.clip();
      for (let i = -8; i < 8; i += 2) {
        const z0 = F.boundaryCentreZ + i * 9, z1 = z0 + 9;
        R.poly(View3D.projectPoly([
          { x: -Rb, y: 0, z: z0 }, { x: Rb, y: 0, z: z0 }, { x: Rb, y: 0, z: z1 }, { x: -Rb, y: 0, z: z1 },
        ]), 'rgba(255,255,255,0.06)');
      }
      // 30-yard circle (dotted look via dashes)
      const inner = this._ring(27.4, 0, 60);
      const ip = View3D.projectPoly(inner);
      if (ip.length > 2) {
        ctx.setLineDash([10, 12]);
        R.poly(ip, null, 'rgba(255,255,255,0.35)', 2);
        ctx.setLineDash([]);
      }
    }
    ctx.restore();

    // Boundary rope
    const rope = View3D.projectPoly(this._ring(Rb - 0.3, 0.05, 72));
    if (rope.length > 2) R.poly(rope, null, '#f5f5f5', 5);

    // Pitch strip
    const hw = PI.width / 2;
    R.poly(View3D.projectPoly([
      { x: -hw, y: 0, z: -2.2 }, { x: hw, y: 0, z: -2.2 },
      { x: hw, y: 0, z: PI.length + 2.2 }, { x: -hw, y: 0, z: PI.length + 2.2 },
    ]), '#d6c08a');
    // Worn patches near each end
    for (const zc of [2.5, PI.length - 2.5]) {
      R.poly(View3D.projectPoly([
        { x: -0.9, y: 0, z: zc - 2.2 }, { x: 0.9, y: 0, z: zc - 2.2 },
        { x: 0.9, y: 0, z: zc + 2.2 }, { x: -0.9, y: 0, z: zc + 2.2 },
      ]), 'rgba(160,125,70,0.35)');
    }
    // Creases
    const crease = (z, half) => R.poly(View3D.projectPoly([
      { x: -half, y: 0, z: z - 0.04 }, { x: half, y: 0, z: z - 0.04 },
      { x: half, y: 0, z: z + 0.04 }, { x: -half, y: 0, z: z + 0.04 },
    ]), '#ffffff');
    crease(PI.creaseZ, 1.83);
    crease(PI.length - PI.creaseZ, 1.83);
    crease(0, 1.32);
    crease(PI.length, 1.32);
    for (const sx of [-1.32, 1.32]) {
      for (const [z0, z1] of [[-1.0, PI.creaseZ], [PI.length - PI.creaseZ, PI.length + 1.0]]) {
        R.poly(View3D.projectPoly([
          { x: sx - 0.04, y: 0, z: z0 }, { x: sx + 0.04, y: 0, z: z0 },
          { x: sx + 0.04, y: 0, z: z1 }, { x: sx - 0.04, y: 0, z: z1 },
        ]), '#ffffff');
      }
    }
  },
};
