// Cricket Arcade — the stadium, drawn as stacked layers (M04b B5).
// Back to front, each behind its own sprite id (see js/data/stadium.js):
//   1 sky (by weather, screen-space, slides a little as the camera turns)
//   2 stands + crowd panorama, wrapped round the ground on a circle
//   3 floodlights, sightscreens, dugouts; crowd cheer groups; flags; banners
//   4 boundary boards
//   5 outfield grass tile, laid flat in perspective
//   6 pitch strip (by pitch type)
// Everything but the sky is placed in world metres and drawn through View3D,
// so near layers slide more than far ones (parallax) and zoom with the camera.
// Any layer whose art is missing falls back to the old code-drawn look.

const Stadium = {
  _circle: null,
  excitement: 0,       // 0..1, crowd cheers + bounce
  _time: 0,
  cond: { stadium: 'local_oval', pitch: 'balanced', weather: 'clear' },
  _strips: {},         // prepared canvases (mirrored copies, crops)
  showLayers: false,   // developer overlay: outline + pixel size of each layer (art templates)
  layerInfo: {},

  setConditions(c) {
    this.cond = Object.assign({ stadium: STADIUM_DATA.defaultStadium, pitch: 'balanced', weather: 'clear' }, c || {});
  },
  _def() { return STADIUM_DATA.stadiums[this.cond.stadium] || STADIUM_DATA.stadiums[STADIUM_DATA.defaultStadium]; },

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

  // A crop of an image as a canvas, plain and mirrored side by side:
  // [ crop | mirrored crop ]. Made once per image.
  _strip(id, crop) {
    const key = id + ':' + (crop || []).join(',');
    if (this._strips[key]) return this._strips[key];
    const art = Sprites.images[id];
    if (!art || typeof document === 'undefined') return null;
    const [sx, sy, sw, sh] = crop || [0, 0, art.img.width, art.img.height];
    const c = document.createElement('canvas');
    c.width = sw * 2; c.height = sh;
    const g = c.getContext('2d');
    g.drawImage(art.img, sx, sy, sw, sh, 0, 0, sw, sh);
    g.save(); g.translate(sw * 2, 0); g.scale(-1, 1);
    g.drawImage(art.img, sx, sy, sw, sh, 0, 0, sw, sh);
    g.restore();
    this._strips[key] = { canvas: c, w: sw, h: sh };
    return this._strips[key];
  },

  // An image and its mirror images as a seamless 2x2 block.
  _mirror4(id) {
    const key = id + ':m4';
    if (this._strips[key]) return this._strips[key];
    const art = Sprites.images[id];
    if (!art || typeof document === 'undefined') return null;
    const w = art.img.width, h = art.img.height;
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    const g = c.getContext('2d');
    for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      g.save();
      g.translate(fx ? w * 2 : 0, fy ? h * 2 : 0);
      g.scale(fx ? -1 : 1, fy ? -1 : 1);
      g.drawImage(art.img, fx ? 0 : 0, 0, w, h);
      g.restore();
    }
    this._strips[key] = c;
    return c;
  },

  _note(layer, x0, y0, x1, y1, artPxPerScreenPx, artSize) {
    if (!this.showLayers) return;
    const L = this.layerInfo[layer] || (this.layerInfo[layer] = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, k: 0, artSize });
    L.x0 = Math.min(L.x0, x0); L.y0 = Math.min(L.y0, y0); L.x1 = Math.max(L.x1, x1); L.y1 = Math.max(L.y1, y1);
    // keep the most enlarged piece (fewest art pixels per screen pixel)
    if (artPxPerScreenPx > 0) L.k = L.k ? Math.min(L.k, artPxPerScreenPx) : artPxPerScreenPx;
  },

  // ---------------------------------------------------------------- 1. sky
  _drawSky(ctx, v) {
    const id = STADIUM_DATA.skies[this.cond.weather] || STADIUM_DATA.skies.clear;
    const st = this._strip(id);
    if (!st) {
      const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h);
      g.addColorStop(0, CONFIG.COLOR.sky);
      g.addColorStop(0.6, CONFIG.COLOR.skyLow);
      ctx.fillStyle = g;
      ctx.fillRect(v.x, v.y, v.w, v.h);
      return;
    }
    const f = View3D.f;
    const yaw = Math.atan2(f.x, -f.z);
    const scale = (v.h * 1.02) / st.h;
    const tileW = st.w * 2 * scale;
    let off = (-yaw * STADIUM_DATA.skyParallax) % tileW;
    if (off > 0) off -= tileW;
    for (let x = v.x + off; x < v.x + v.w; x += tileW) {
      ctx.drawImage(st.canvas, 0, 0, st.w * 2, st.h, x, v.y, tileW + 1, v.h * 1.02);
    }
    this._note('sky', v.x, v.y, v.x + v.w, v.y + v.h, 1 / scale, st.w + '×' + st.h);
  },

  drawBackground(ctx) {
    const v = Display.viewRect();
    this._drawSky(ctx, v);

    const S = this._def();
    const standsArt = S.stands && Sprites.has(S.stands.id);
    // Ground outside the rope, under everything else. With stands art it
    // stops at the stands, so the sky shows above them (not more grass).
    if (standsArt) {
      R.poly(View3D.projectPoly(this._ring(S.stands.radius + 0.5, 0, 72)), '#4a8f3a');
    } else {
      const big = 700;
      R.poly(View3D.projectPoly([
        { x: -big, y: 0, z: -big }, { x: big, y: 0, z: -big },
        { x: big, y: 0, z: big }, { x: -big, y: 0, z: big },
      ]), '#4a8f3a');
    }
    if (!standsArt) { this._drawStandsPlaceholder(ctx); return; }

    // Collect every background piece with its depth, then paint far to near.
    const items = [];
    this._standSlices(S.stands, items);
    this._props(S, items);
    if (S.boards && Sprites.has(S.boards.id)) this._boardSlices(S.boards, items);
    else this._boardsPlaceholder(items);
    items.sort((a, b) => b.d - a.d);
    for (const it of items) it.draw(ctx);
  },

  // ---------------------------------------------------------------- 2. stands panorama
  // Vertical slices of the panorama stood round a circle. Every other copy
  // is mirrored so the edges meet.
  _standSlices(def, items) {
    const st = this._strip(def.id, def.crop);
    if (!st) return;
    const F = BATTING_DATA.field, cz = F.boundaryCentreZ;
    const Rr = def.radius, copies = def.copies;
    const span = Math.PI * 2 / copies;
    const height = (Rr * span) * (st.h / st.w);
    const perCopy = 18;
    const centre = def.centreDeg * Math.PI / 180;
    for (let c = 0; c < copies; c++) {
      const mid = centre + c * span;
      const mirrored = def.mirror && c % 2 === 1;
      for (let j = 0; j < perCopy; j++) {
        const a0 = mid - span / 2 + span * j / perCopy, a1 = a0 + span / perCopy;
        const am = (a0 + a1) / 2;
        const cm = View3D.toCam(Math.cos(am) * Rr, height / 2, cz + Math.sin(am) * Rr);
        if (cm.z < 2) continue;
        const p00 = View3D.project(Math.cos(a0) * Rr, -def.sink, cz + Math.sin(a0) * Rr);
        const p10 = View3D.project(Math.cos(a1) * Rr, -def.sink, cz + Math.sin(a1) * Rr);
        const p01 = View3D.project(Math.cos(a0) * Rr, height, cz + Math.sin(a0) * Rr);
        const p11 = View3D.project(Math.cos(a1) * Rr, height, cz + Math.sin(a1) * Rr);
        if (!p00 || !p10 || !p01 || !p11) continue;
        const x0 = Math.min(p00.x, p01.x), x1 = Math.max(p10.x, p11.x);
        if (x1 < -400 || x0 > CONFIG.LOGICAL_W + 400 || x1 - x0 <= 0) continue;
        const yT = (p01.y + p11.y) / 2, yB = (p00.y + p10.y) / 2;
        const sw = st.w / perCopy;
        const sx = mirrored ? st.w + j * sw : j * sw;
        items.push({ d: cm.z, draw: (ctx) => this._quadImg(ctx, st.canvas, [sx, 0, sw, st.h], p00, p10, p01, p11) });
        this._note('stands', x0, yT, x1, yB, sw / Math.max(1, x1 - x0), st.w + '×' + st.h + ' (crop)');
      }
    }
  },

  // ---------------------------------------------------------------- 4. boards
  _boardSlices(def, items) {
    const st = this._strip(def.id, def.crop);
    if (!st) return;
    const F = BATTING_DATA.field, cz = F.boundaryCentreZ;
    const Rr = F.boundaryRadius + def.gap;
    const copyW = def.height * st.w / st.h;
    const copies = Math.max(1, Math.round(Math.PI * 2 * Rr / copyW));
    const span = Math.PI * 2 / copies, per = 4;
    for (let c = 0; c < copies; c++) {
      for (let j = 0; j < per; j++) {
        const a0 = c * span + span * j / per, a1 = a0 + span / per, am = (a0 + a1) / 2;
        const cm = View3D.toCam(Math.cos(am) * Rr, 0.5, cz + Math.sin(am) * Rr);
        if (cm.z < 1) continue;
        const p00 = View3D.project(Math.cos(a0) * Rr, 0, cz + Math.sin(a0) * Rr);
        const p10 = View3D.project(Math.cos(a1) * Rr, 0, cz + Math.sin(a1) * Rr);
        const p01 = View3D.project(Math.cos(a0) * Rr, def.height, cz + Math.sin(a0) * Rr);
        const p11 = View3D.project(Math.cos(a1) * Rr, def.height, cz + Math.sin(a1) * Rr);
        if (!p00 || !p10 || !p01 || !p11) continue;
        const x0 = Math.min(p00.x, p01.x), x1 = Math.max(p10.x, p11.x);
        if (x1 < -200 || x0 > CONFIG.LOGICAL_W + 200 || x1 - x0 <= 0) continue;
        const sw = st.w / per, sx = j * sw;
        const yT0 = p01.y, yT1 = p11.y, yB0 = p00.y, yB1 = p10.y;
        items.push({ d: cm.z, draw: (ctx) => this._quadImg(ctx, st.canvas, [sx, 0, sw, st.h], p00, p10, p01, p11) });
        this._note('boards', x0, Math.min(yT0, yT1), x1, Math.max(yB0, yB1), sw / Math.max(1, x1 - x0), st.w + '×' + st.h + ' (crop)');
      }
    }
  },

  // ---------------------------------------------------------------- 3. props, crowd, flags, banners
  _billboard(items, id, x, y, z, heightM, opts, layer) {
    const art = Sprites.images[id];
    if (!art) return;
    const cm = View3D.toCam(x, y + heightM / 2, z);
    if (cm.z < 2) return;
    const p = View3D.project(x, y, z);
    if (!p) return;
    const h = heightM * p.s, w = h * art.img.width / art.img.height;
    if (p.x + w < -100 || p.x - w > CONFIG.LOGICAL_W + 100) return;
    const o = opts || {};
    items.push({ d: cm.z, draw: (ctx) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (o.wave) ctx.transform(1 + o.wave * 0.06, o.wave * 0.05, 0, 1, 0, 0);   // flag flutter (skew from the pole)
      if (o.bob) ctx.translate(0, -o.bob * h);
      ctx.drawImage(art.img, -w * (art.anchorX ?? 0.5), -h * (art.anchorY ?? 1), w, h);
      ctx.restore();
    } });
    if (layer) this._note(layer, p.x - w / 2, p.y - h, p.x + w / 2, p.y, art.img.height / Math.max(1, h), art.img.width + '×' + art.img.height);
  },

  _props(S, items) {
    const cz = BATTING_DATA.field.boundaryCentreZ, rad = Math.PI / 180;
    const at = (deg, dist) => ({ x: Math.cos(deg * rad) * dist, z: cz + Math.sin(deg * rad) * dist });
    for (const [id, deg, dist, h] of S.props || []) {
      const q = at(deg, dist);
      this._billboard(items, id, q.x, 0, q.z, h, null, 'props');
    }
    // Crowd cheer groups: sit, then a cheer flip-book on fours / wickets, jumping on a six.
    const A = STADIUM_DATA.crowdAnim, ex = this.excitement;
    (S.crowd || []).forEach(([g, deg, dist, up, size], i) => {
      const q = at(deg, dist);
      let frame = 'sit', bob = 0;
      const beat = Math.floor(this._time * A.cheerFps + i * 1.7) % 2;
      if (ex > A.jumpAbove) { frame = beat ? 'jump' : 'cheer'; bob = beat ? 0.06 : 0; }
      else if (ex > A.cheerAbove) frame = beat ? 'cheer' : 'sit';
      this._billboard(items, 'crowd_' + g + '_' + frame, q.x, up, q.z, size, { bob }, 'crowd');
    });
    (S.flags || []).forEach(([id, deg, dist, up, size], i) => {
      const q = at(deg, dist);
      const wave = Math.sin(this._time * A.flagWave + i * 1.3) * (1 + ex);
      this._billboard(items, id, q.x, up, q.z, size, { wave }, 'flags');
    });
    for (const [id, deg, dist, up, size] of S.banners || []) {
      const q = at(deg, dist);
      this._billboard(items, id, q.x, up, q.z, size, null, 'banners');
    }
  },

  // ---------------------------------------------------------------- code-drawn fallbacks
  _standQuads() {
    const F = BATTING_DATA.field, Rb = F.boundaryRadius;
    const segs = 56, inner = Rb + 5, outer = Rb + 34, top = 22;
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
    return { quads, inner, outer, top, segs };
  },

  _drawStandsPlaceholder(ctx) {
    const { quads, inner, outer, top, segs } = this._standQuads();
    for (const it of quads) {
      const pts = View3D.projectPoly(it.q);
      if (pts.length < 3) continue;
      R.poly(pts, it.i % 2 ? '#34405a' : '#2c3750');
    }
    this._drawCrowdDots(ctx, quads, inner, outer, top);
    const items = [];
    this._boardsPlaceholder(items);
    items.sort((a, b) => b.d - a.d);
    for (const it of items) it.draw(ctx);
  },

  _boardsPlaceholder(items) {
    const F = BATTING_DATA.field, cz = F.boundaryCentreZ;
    const segs = 56, boardIn = F.boundaryRadius + 1.5;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2, am = (a0 + a1) / 2;
      const cm = View3D.toCam(Math.cos(am) * boardIn, 0.5, cz + Math.sin(am) * boardIn);
      items.push({ d: cm.z, draw: () => {
        R.poly(View3D.projectPoly([
          { x: Math.cos(a0) * boardIn, y: 0, z: cz + Math.sin(a0) * boardIn },
          { x: Math.cos(a1) * boardIn, y: 0, z: cz + Math.sin(a1) * boardIn },
          { x: Math.cos(a1) * boardIn, y: 1.1, z: cz + Math.sin(a1) * boardIn },
          { x: Math.cos(a0) * boardIn, y: 1.1, z: cz + Math.sin(a0) * boardIn },
        ]), ['#1d6fe0', '#f2b705', '#e0412b', '#12a57a'][i % 4]);
      } });
    }
  },

  _drawCrowdDots(ctx, quads, inner, outer, top) {
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

  // ---------------------------------------------------------------- textured ground
  // Draw part of an image onto a flat world rectangle in perspective: the
  // rectangle is split until each piece is small on screen, and each piece is
  // drawn with an affine transform from three of its corners.
  // corners: world { x0, x1, z0, z1 } (y = 0); src: [sx, sy, sw, sh] maps
  // x0->x1 across and z0->z1 down the image.
  _texQuad(ctx, img, src, q, maxPx, depth) {
    const P = (x, z) => View3D.toCam(x, 0, z);
    const c00 = P(q.x0, q.z0), c10 = P(q.x1, q.z0), c01 = P(q.x0, q.z1), c11 = P(q.x1, q.z1);
    const near = View3D.near + 0.2;
    const allBehind = c00.z < near && c10.z < near && c01.z < near && c11.z < near;
    if (allBehind) return;
    const someBehind = c00.z < near || c10.z < near || c01.z < near || c11.z < near;
    let p00, p10, p01, p11, big = false;
    if (!someBehind) {
      p00 = View3D.project(q.x0, 0, q.z0); p10 = View3D.project(q.x1, 0, q.z0);
      p01 = View3D.project(q.x0, 0, q.z1); p11 = View3D.project(q.x1, 0, q.z1);
      const minX = Math.min(p00.x, p10.x, p01.x, p11.x), maxX = Math.max(p00.x, p10.x, p01.x, p11.x);
      const minY = Math.min(p00.y, p10.y, p01.y, p11.y), maxY = Math.max(p00.y, p10.y, p01.y, p11.y);
      if (maxX < -50 || minX > CONFIG.LOGICAL_W + 50 || maxY < -50 || minY > CONFIG.LOGICAL_H + 50) return;
      // big on screen, or strongly foreshortened = split again
      const dz = Math.max(c00.z, c10.z, c01.z, c11.z) / Math.min(c00.z, c10.z, c01.z, c11.z);
      big = (maxX - minX > maxPx || maxY - minY > maxPx || dz > 1.35);
    }
    if ((someBehind || big) && depth < 5) {
      const xm = (q.x0 + q.x1) / 2, zm = (q.z0 + q.z1) / 2;
      const [sx, sy, sw, sh] = src;
      this._texQuad(ctx, img, [sx, sy, sw / 2, sh / 2], { x0: q.x0, x1: xm, z0: q.z0, z1: zm }, maxPx, depth + 1);
      this._texQuad(ctx, img, [sx + sw / 2, sy, sw / 2, sh / 2], { x0: xm, x1: q.x1, z0: q.z0, z1: zm }, maxPx, depth + 1);
      this._texQuad(ctx, img, [sx, sy + sh / 2, sw / 2, sh / 2], { x0: q.x0, x1: xm, z0: zm, z1: q.z1 }, maxPx, depth + 1);
      this._texQuad(ctx, img, [sx + sw / 2, sy + sh / 2, sw / 2, sh / 2], { x0: xm, x1: q.x1, z0: zm, z1: q.z1 }, maxPx, depth + 1);
      return;
    }
    if (someBehind) return;
    // Two triangles, each with its own exact affine map, so neighbouring
    // pieces meet corner to corner with no gaps or overlaps.
    this._texTri(ctx, img, src, p00, p10, p01, p00, p10.x - p00.x, p10.y - p00.y, p01.x - p00.x, p01.y - p00.y);
    const ax = p11.x - p01.x, ay = p11.y - p01.y, bx = p11.x - p10.x, by = p11.y - p10.y;
    this._texTri(ctx, img, src, p11, p01, p10, { x: p10.x - ax, y: p10.y - ay }, ax, ay, bx, by);
  },

  // An upright image panel from its four projected corners (bottom-left,
  // bottom-right, top-left, top-right): two exactly-mapped triangles.
  _quadImg(ctx, img, src, p00, p10, p01, p11) {
    this._texTri(ctx, img, src, p01, p11, p00, p01, p11.x - p01.x, p11.y - p01.y, p00.x - p01.x, p00.y - p01.y);
    const ax = p10.x - p00.x, ay = p10.y - p00.y, bx = p10.x - p11.x, by = p10.y - p11.y;
    this._texTri(ctx, img, src, p10, p00, p11, { x: p11.x - ax, y: p11.y - ay }, ax, ay, bx, by);
  },

  // One triangle (clipped, grown by half a pixel to hide hairline seams) of
  // the image mapped by origin o + u*(ax,ay) + v*(bx,by).
  _texTri(ctx, img, src, t0, t1, t2, o, ax, ay, bx, by) {
    const cx = (t0.x + t1.x + t2.x) / 3, cy = (t0.y + t1.y + t2.y) / 3;
    const grow = (p) => { const dx = p.x - cx, dy = p.y - cy, l = Math.hypot(dx, dy) || 1; return { x: p.x + dx / l * 0.7, y: p.y + dy / l * 0.7 }; };
    const a = grow(t0), b = grow(t1), c = grow(t2);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
    ctx.clip();
    ctx.transform(ax, ay, bx, by, o.x, o.y);
    ctx.drawImage(img, src[0], src[1], src[2], src[3], 0, 0, 1, 1);
    ctx.restore();
  },

  // The ground (grass tiles, rope, pitch) only changes when the camera moves,
  // so while the camera is still it's drawn once into a spare canvas and
  // copied each frame (screen shake just offsets the copy).
  drawField(ctx) {
    const V = View3D;
    const key = [V.pos.x, V.pos.y, V.pos.z, V.tgt.x, V.tgt.y, V.tgt.z, V.focal].map((v) => v.toFixed(3)).join(',')
      + '|' + ctx.canvas.width + 'x' + ctx.canvas.height + '|' + Display.originX + ',' + Display.originY + '|' + this.cond.pitch;
    const still = key === this._lastKey;
    this._lastKey = key;
    if (!still || this.showLayers || typeof document === 'undefined') { this._drawFieldNow(ctx); return; }
    if (this._fieldKey !== key) {
      if (!this._fieldCanvas) this._fieldCanvas = document.createElement('canvas');
      const c = this._fieldCanvas;
      if (c.width !== ctx.canvas.width || c.height !== ctx.canvas.height) { c.width = ctx.canvas.width; c.height = ctx.canvas.height; }
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      g.setTransform(ctx.getTransform());
      const sx = Effects.shakeX, sy = Effects.shakeY, rc = R.ctx;
      Effects.shakeX = 0; Effects.shakeY = 0; R.ctx = g;
      try { this._drawFieldNow(g); } finally { Effects.shakeX = sx; Effects.shakeY = sy; R.ctx = rc; }
      this._fieldKey = key;
    }
    const k = Display.dpr * Display.scale;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this._fieldCanvas, Effects.shakeX * k, Effects.shakeY * k);
    ctx.restore();
  },

  _drawFieldNow(ctx) {
    const F = BATTING_DATA.field, PI = BATTING_DATA.pitch;
    const Rb = F.boundaryRadius;
    if (!this._circle) this._circle = this._ring(Rb, 0, 72);
    const disc = View3D.projectPoly(this._circle);
    R.poly(disc, '#4c9a45');

    ctx.save();
    ctx.beginPath();
    if (disc.length) {
      ctx.moveTo(disc[0].x, disc[0].y);
      for (let i = 1; i < disc.length; i++) ctx.lineTo(disc[i].x, disc[i].y);
      ctx.closePath();
      ctx.clip();
      const G = STADIUM_DATA.grass, grass = Sprites.images[G.id];
      const quad = grass && this._mirror4(G.id);
      if (quad) {
        // 5. the grass tile laid flat. A 2x2 block of mirrored copies repeats
        // with no seams, so the mowing stripes run on unbroken.
        const T2 = G.tileM * 2, n = Math.ceil(Rb / T2);
        const cz = F.boundaryCentreZ;
        for (let i = -n; i < n; i++) {
          for (let j = -n; j < n; j++) {
            const x0 = i * T2, z0 = cz + j * T2;
            if (Math.hypot(Math.min(Math.abs(x0), Math.abs(x0 + T2)), Math.min(Math.abs(z0 - cz), Math.abs(z0 + T2 - cz))) > Rb) continue;
            this._texQuad(ctx, quad, [0, 0, quad.width, quad.height], { x0, x1: x0 + T2, z0, z1: z0 + T2 }, G.maxCellPx, 0);
          }
        }
        const gp = View3D.project(0, 0, cz), gq = View3D.project(G.tileM, 0, cz);
        this._note('grass', 0, 0, 0, 0, gp && gq ? grass.img.width / Math.max(1, Math.abs(gq.x - gp.x)) : 0, grass.img.width + '×' + grass.img.height + ' per ' + G.tileM + ' m tile');
      } else {
        // Mowing stripes
        for (let i = -8; i < 8; i += 2) {
          const z0 = F.boundaryCentreZ + i * 9, z1 = z0 + 9;
          R.poly(View3D.projectPoly([
            { x: -Rb, y: 0, z: z0 }, { x: Rb, y: 0, z: z0 }, { x: Rb, y: 0, z: z1 }, { x: -Rb, y: 0, z: z1 },
          ]), 'rgba(255,255,255,0.06)');
        }
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

    // 6. pitch strip: the art for this pitch type, or code-drawn
    const PA = STADIUM_DATA.pitchArt[this.cond.pitch] || STADIUM_DATA.pitchArt.balanced;
    const pitch = Sprites.images[PA.id];
    if (pitch) {
      const w = pitch.img.width, h = pitch.img.height;
      const mPerRow = PI.length / (PA.rows[1] - PA.rows[0]);
      const z0 = -PA.rows[0] * mPerRow, z1 = z0 + h * mPerRow;
      const x0 = -PA.cx * PA.mPerPx, x1 = x0 + w * PA.mPerPx;
      this._texQuad(ctx, pitch.img, [0, 0, w, h], { x0, x1, z0, z1 }, 260, 0);
      const a = View3D.project(x0, 0, z0), b = View3D.project(x1, 0, z1);
      if (a && b) this._note('pitch', Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y), h / Math.max(1, Math.abs(b.y - a.y)), w + '×' + h);
      return;
    }
    const hw = PI.width / 2;
    R.poly(View3D.projectPoly([
      { x: -hw, y: 0, z: -2.2 }, { x: hw, y: 0, z: -2.2 },
      { x: hw, y: 0, z: PI.length + 2.2 }, { x: -hw, y: 0, z: PI.length + 2.2 },
    ]), '#d6c08a');
    for (const zc of [2.5, PI.length - 2.5]) {
      R.poly(View3D.projectPoly([
        { x: -0.9, y: 0, z: zc - 2.2 }, { x: 0.9, y: 0, z: zc - 2.2 },
        { x: 0.9, y: 0, z: zc + 2.2 }, { x: -0.9, y: 0, z: zc + 2.2 },
      ]), 'rgba(160,125,70,0.35)');
    }
    const crease = (z, half) => R.poly(View3D.projectPoly([
      { x: -half, y: 0, z: z - 0.04 }, { x: half, y: 0, z: z - 0.04 },
      { x: half, y: 0, z: z + 0.04 }, { x: -half, y: 0, z: z + 0.04 },
    ]), '#ffffff');
    crease(PI.creaseZ, 1.83);
    crease(PI.length - PI.creaseZ, 1.83);
    crease(0, 1.32);
    crease(PI.length, 1.32);
    for (const sx of [-1.32, 1.32]) {
      for (const [za, zb] of [[-1.0, PI.creaseZ], [PI.length - PI.creaseZ, PI.length + 1.0]]) {
        R.poly(View3D.projectPoly([
          { x: sx - 0.04, y: 0, z: za }, { x: sx + 0.04, y: 0, z: za },
          { x: sx + 0.04, y: 0, z: zb }, { x: sx - 0.04, y: 0, z: zb },
        ]), '#ffffff');
      }
    }
  },

  // Developer overlay: each layer's outline on screen, and how many art pixels
  // it shows per screen pixel (1.0 = the art is exactly sharp at 1920×1080).
  drawLayerOverlay(ctx) {
    if (!this.showLayers) return;
    const cols = { sky: '#7ec8f0', stands: '#ff5aff', boards: '#ffd23f', props: '#ffffff', crowd: '#ff7a1a', flags: '#9cff6a', banners: '#22d9ff', pitch: '#ff3b3b', grass: '#2fbf5b' };
    let row = 0;
    for (const [k, L] of Object.entries(this.layerInfo)) {
      const col = cols[k] || '#fff';
      if (L.x1 > L.x0 && L.y1 > L.y0) {
        const x0 = Math.max(-10, L.x0), y0 = Math.max(-10, L.y0), x1 = Math.min(1930, L.x1), y1 = Math.min(1090, L.y1);
        ctx.setLineDash([14, 8]);
        R.rect(x0, y0, x1 - x0, y1 - y0, null, col, 3);
        ctx.setLineDash([]);
      }
      const onScreen = L.x1 > L.x0 ? `${Math.round(Math.min(1920, L.x1) - Math.max(0, L.x0))}×${Math.round(Math.min(1080, L.y1) - Math.max(0, L.y0))} px on screen` : '';
      const need = L.k > 0 ? ` · art shows at ${(1 / L.k).toFixed(2)} screen px per art px` : '';
      R.rect(20, 20 + row * 34, 1180, 32, 'rgba(0,0,0,0.7)');
      R.plainText(`${k}: art ${L.artSize}  ${onScreen}${need}`, 30, 36 + row * 34, 22, col);
      row++;
    }
    this.layerInfo = {};
  },
};
