// Cricket Arcade — sprite registry.
// EVERY visible character/prop is drawn through Sprites.draw(id, …).
// Right now each id has a code-drawn placeholder. When real art is listed in
// ASSET_MANIFEST under the same id (optionally "id:frame"), the image is used
// instead — gameplay code never changes.
//
// World sprites are drawn at a screen "foot" point with ppm = screen pixels per
// world metre at that depth, so they scale correctly with distance.

const Sprites = {
  images: {},       // id -> { img, anchorX, anchorY, heightM, heightPx }

  // Load every entry of an asset group. Missing files are simply skipped and
  // the placeholder keeps drawing. optional entries (art not made yet) that
  // aren't there are not reported as missing.
  status: {},       // id -> 'loading' | 'ok' | 'missing'   (read by the content check)
  _pending: [],

  loadGroup(name) {
    const group = (ASSET_MANIFEST.groups || {})[name] || {};
    for (const id of Object.keys(group)) {
      const e = group[id];
      if (!e || !e.src) continue;
      if (this.status[id] === 'ok' || this.status[id] === 'loading') continue;   // already here (or on its way)
      this.status[id] = 'loading';
      this._pending.push(new Promise((done) => {
        const img = new Image();
        img.onload = () => { this.images[id] = Object.assign({ img }, e); this.status[id] = 'ok'; done(); };
        img.onerror = () => {
          this.status[id] = e.optional ? 'pending' : 'missing';
          if (!e.optional) Log.add('asset', 'missing ' + e.src);
          done();
        };
        img.src = e.src;
      }));
    }
  },

  // Resolves when every requested image has loaded or failed.
  settled() { return Promise.all(this._pending); },

  has(id) { return !!this.images[id]; },

  // opts: frame, alpha, flip, rot (radians, around the feet), shadow
  draw(id, x, y, ppm, opts) {
    const o = opts || {};
    const key = o.frame ? id + ':' + o.frame : id;
    const art = this.images[key] || this.images[id];
    const ctx = R.ctx;
    if (art) {
      const h = art.heightM ? art.heightM * ppm : (art.heightPx || art.img.height);
      const w = h * (art.img.width / art.img.height);
      if (art.heightM && o.shadow !== false) R.ellipse(x, y, 0.5 * ppm, 0.13 * ppm, 'rgba(0,0,0,0.28)');
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
      ctx.translate(x, y);
      if (o.rot) ctx.rotate(o.rot);
      if (o.flip) ctx.scale(-1, 1);
      ctx.drawImage(art.img, -w * (art.anchorX ?? 0.5), -h * (art.anchorY ?? 1), w, h);
      ctx.restore();
      return;
    }
    const fn = this.PLACEHOLDERS[id];
    if (fn) {
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
      fn(ctx, x, y, ppm, o);
      ctx.restore();
    }
  },

  // Draw a UI image fitted inside a box of size (w x h) centred on (cx, cy).
  // Returns false if the art isn't loaded, so the caller can draw a fallback.
  ui(id, cx, cy, w, h, opts) {
    const art = this.images[id];
    if (!art) return false;
    const o = opts || {};
    const iw = art.img.width, ih = art.img.height;
    const k = Math.min(w / iw, (h || w) / ih);
    const ctx = R.ctx;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    ctx.translate(cx, cy);
    if (o.rot) ctx.rotate(o.rot);
    if (o.scaleY) ctx.scale(1, o.scaleY);
    ctx.drawImage(art.img, -iw * k / 2, -ih * k / 2, iw * k, ih * k);
    ctx.restore();
    return true;
  },

  // ---- Code-drawn placeholders (simple clean shapes) ----------------------
  PLACEHOLDERS: {
    // Batter, right-handed, seen from the bowler's end. opts.bat = bat angle
    // (radians, screen space; 0 = pointing right, PI/2 = pointing down).
    batter(ctx, x, y, s, o) {
      const kit = o.kit || '#1d4ed8';
      const pad = '#f4f4ef';
      const skin = '#c98e62';
      const lean = o.lean || 0;               // forward lean for the swing
      // shadow
      R.ellipse(x, y, 0.55 * s, 0.14 * s, 'rgba(0,0,0,0.28)');
      // legs / pads
      R.roundRect(x - 0.24 * s, y - 0.86 * s, 0.2 * s, 0.86 * s, 0.06 * s, pad, '#b9b9b0', Math.max(1, 0.02 * s));
      R.roundRect(x + 0.05 * s, y - 0.86 * s, 0.2 * s, 0.86 * s, 0.06 * s, pad, '#b9b9b0', Math.max(1, 0.02 * s));
      // torso
      const tx = x + lean * 0.18 * s;
      R.roundRect(tx - 0.27 * s, y - 1.48 * s, 0.54 * s, 0.68 * s, 0.14 * s, kit);
      // number stripe
      R.rect(tx - 0.27 * s, y - 1.22 * s, 0.54 * s, 0.07 * s, 'rgba(255,210,63,0.9)');
      // head + helmet
      const hx = tx + lean * 0.1 * s, hy = y - 1.66 * s;
      R.circle(hx, hy, 0.17 * s, skin);
      ctx.beginPath();
      ctx.arc(hx, hy - 0.02 * s, 0.19 * s, Math.PI, 0);
      ctx.fillStyle = '#0f1f4a';
      ctx.fill();
      R.rect(hx - 0.16 * s, hy + 0.01 * s, 0.32 * s, 0.03 * s, '#9aa4b5'); // grille
      // hands + bat
      const hxh = tx + 0.12 * s, hyh = y - 1.08 * s;
      const a = o.bat !== undefined ? o.bat : 1.9;
      const len = 0.92 * s;
      const bx = hxh + Math.cos(a) * len, by = hyh + Math.sin(a) * len;
      ctx.save();
      ctx.translate(hxh, hyh);
      ctx.rotate(a);
      R.roundRect(0, -0.035 * s, 0.3 * s, 0.07 * s, 0.03 * s, '#2b2b2b');           // handle
      R.roundRect(0.28 * s, -0.07 * s, len - 0.28 * s, 0.14 * s, 0.04 * s, '#e8cf93', '#9c7b3c', Math.max(1, 0.02 * s)); // blade
      ctx.restore();
      R.circle(hxh, hyh, 0.08 * s, '#f0f0f0'); // gloves
      o._batTip = { x: bx, y: by };
    },

    bowler(ctx, x, y, s, o) {
      const kit = o.kit || '#1f8a4c';   // fielding side wears green (matches the bowler art)
      const skin = '#8d5a3b';
      const run = o.run || 0;                 // run cycle phase (radians)
      const arm = o.arm !== undefined ? o.arm : null; // bowling arm angle
      R.ellipse(x, y, 0.5 * s, 0.13 * s, 'rgba(0,0,0,0.28)');
      const stride = Math.sin(run) * 0.22 * s;
      R.roundRect(x - 0.2 * s + stride * 0.5, y - 0.9 * s, 0.17 * s, 0.9 * s, 0.06 * s, '#f1f1ea');
      R.roundRect(x + 0.03 * s - stride * 0.5, y - 0.9 * s, 0.17 * s, 0.9 * s, 0.06 * s, '#e3e3da');
      R.roundRect(x - 0.26 * s, y - 1.5 * s, 0.52 * s, 0.66 * s, 0.13 * s, kit);
      R.circle(x, y - 1.68 * s, 0.17 * s, skin);
      ctx.beginPath();
      ctx.arc(x, y - 1.72 * s, 0.18 * s, Math.PI, 0);
      ctx.fillStyle = kit;
      ctx.fill();
      // arms
      const sx = x + 0.22 * s, sy = y - 1.4 * s;
      const aa = arm !== null ? arm : 1.2 + Math.sin(run) * 0.5;
      R.line(sx, sy, sx + Math.cos(aa) * 0.62 * s, sy + Math.sin(aa) * 0.62 * s, kit, 0.12 * s);
      const la = arm !== null ? arm + Math.PI : 1.9 - Math.sin(run) * 0.5;
      R.line(x - 0.22 * s, sy, x - 0.22 * s + Math.cos(la) * 0.55 * s, sy + Math.sin(la) * 0.55 * s, kit, 0.12 * s);
    },

    fielder(ctx, x, y, s, o) {
      const kit = o.kit || '#1f8a4c';   // fielding side wears green (matches the bowler art)
      const run = o.run || 0;
      R.ellipse(x, y, 0.45 * s, 0.12 * s, 'rgba(0,0,0,0.25)');
      const stride = Math.sin(run) * 0.2 * s;
      R.roundRect(x - 0.18 * s + stride * 0.4, y - 0.85 * s, 0.15 * s, 0.85 * s, 0.05 * s, '#f1f1ea');
      R.roundRect(x + 0.03 * s - stride * 0.4, y - 0.85 * s, 0.15 * s, 0.85 * s, 0.05 * s, '#e3e3da');
      R.roundRect(x - 0.24 * s, y - 1.42 * s, 0.48 * s, 0.62 * s, 0.12 * s, kit);
      R.circle(x, y - 1.6 * s, 0.16 * s, '#a8714c');
      ctx.beginPath();
      ctx.arc(x, y - 1.63 * s, 0.17 * s, Math.PI, 0);
      ctx.fillStyle = '#111';
      ctx.fill();
      if (o.catching) {
        // arms up
        R.line(x - 0.2 * s, y - 1.35 * s, x - 0.3 * s, y - 1.95 * s, kit, 0.1 * s);
        R.line(x + 0.2 * s, y - 1.35 * s, x + 0.3 * s, y - 1.95 * s, kit, 0.1 * s);
      }
    },

    keeper(ctx, x, y, s, o) {
      const kit = o.kit || '#1f8a4c';   // fielding side wears green (matches the bowler art)
      R.ellipse(x, y, 0.5 * s, 0.13 * s, 'rgba(0,0,0,0.25)');
      // crouched
      R.roundRect(x - 0.26 * s, y - 0.5 * s, 0.2 * s, 0.5 * s, 0.06 * s, '#f1f1ea');
      R.roundRect(x + 0.06 * s, y - 0.5 * s, 0.2 * s, 0.5 * s, 0.06 * s, '#f1f1ea');
      R.roundRect(x - 0.3 * s, y - 1.05 * s, 0.6 * s, 0.6 * s, 0.14 * s, kit);
      R.circle(x, y - 1.2 * s, 0.17 * s, '#b07a53');
      ctx.beginPath();
      ctx.arc(x, y - 1.23 * s, 0.18 * s, Math.PI, 0);
      ctx.fillStyle = '#0f1f4a';
      ctx.fill();
      // big gloves
      R.circle(x - 0.26 * s, y - 0.62 * s, 0.12 * s, '#f5f5f5', '#999', Math.max(1, 0.02 * s));
      R.circle(x + 0.26 * s, y - 0.62 * s, 0.12 * s, '#f5f5f5', '#999', Math.max(1, 0.02 * s));
    },

    // opts.finger = the umpire's finger is up (OUT).
    umpire(ctx, x, y, s, o) {
      R.ellipse(x, y, 0.5 * s, 0.13 * s, 'rgba(0,0,0,0.25)');
      R.roundRect(x - 0.2 * s, y - 0.9 * s, 0.17 * s, 0.9 * s, 0.05 * s, '#2a2a2a');
      R.roundRect(x + 0.03 * s, y - 0.9 * s, 0.17 * s, 0.9 * s, 0.05 * s, '#2a2a2a');
      if (o && o.finger) {
        // right arm straight up, one finger raised
        R.line(x + 0.24 * s, y - 1.42 * s, x + 0.34 * s, y - 2.3 * s, '#f5f5f0', 0.13 * s);
        R.circle(x + 0.345 * s, y - 2.33 * s, 0.075 * s, '#c79b76');
        R.line(x + 0.345 * s, y - 2.36 * s, x + 0.35 * s, y - 2.6 * s, '#c79b76', 0.045 * s);
      }
      R.roundRect(x - 0.3 * s, y - 1.52 * s, 0.6 * s, 0.72 * s, 0.14 * s, '#f5f5f0');
      R.circle(x, y - 1.7 * s, 0.17 * s, '#c79b76');
      R.rect(x - 0.26 * s, y - 1.86 * s, 0.52 * s, 0.05 * s, '#f5f5f0');
      R.roundRect(x - 0.15 * s, y - 1.98 * s, 0.3 * s, 0.14 * s, 0.05 * s, '#f5f5f0');
    },

    // Three stumps + two bails. opts.broken = 0..1 time since hit.
    stumps(ctx, x, y, s, o) {
      const hw = 0.114 * s, h = 0.71 * s;
      const lw = Math.max(2, 0.038 * s);
      const b = o.broken;
      for (let i = -1; i <= 1; i++) {
        const sx = x + i * hw;
        let tip = 0;
        if (b !== undefined) tip = Math.min(1, b * 6) * (0.5 + i * 0.35);
        const ex = sx + Math.sin(tip) * h, ey = y - Math.cos(tip) * h;
        R.line(sx, y, ex, ey, '#f3e7c9', lw);
      }
      if (b === undefined) {
        R.line(x - hw, y - h - lw * 0.4, x + hw, y - h - lw * 0.4, '#e8c872', lw * 0.8);
      } else if (o.back) {
        // hit wicket: the bails fly off behind the batter (away from us:
        // up the screen, getting smaller) and tumble
        const t = b;
        for (const dir of [-1, 1]) {
          const k = Math.max(0.25, 1 - t * 0.55);
          const bx = x + dir * (hw * 0.4 + t * 0.35 * s);
          const by = y - h - lw - (t * 2.6 - t * t * 2.2) * s - t * 0.9 * s;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(t * 11 * dir);
          R.rect(-hw * 0.5 * k, -lw * 0.4 * k, hw * k, lw * 0.8 * k, '#e8c872');
          ctx.restore();
        }
      } else {
        // bails fly
        const t = b;
        for (const dir of [-1, 1]) {
          const bx = x + dir * (hw * 0.5 + t * 1.6 * s);
          const by = y - h - lw - (t * 3.2 - t * t * 5.5) * s;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(t * 14 * dir);
          R.rect(-hw * 0.5, -lw * 0.4, hw, lw * 0.8, '#e8c872');
          ctx.restore();
        }
      }
    },

    ball(ctx, x, y, s, o) {
      const r = o.r || 8;
      const golden = o.golden;
      R.circle(x, y, r, golden ? '#ffcf33' : '#c1121f');
      ctx.beginPath();
      ctx.arc(x, y, r * 0.72, -0.6, 0.9);
      ctx.strokeStyle = golden ? '#fff3b0' : 'rgba(255,255,255,0.8)';
      ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.stroke();
      R.circle(x - r * 0.35, y - r * 0.35, r * 0.25, 'rgba(255,255,255,0.45)');
    },

    ball_shadow(ctx, x, y, s, o) {
      const r = o.r || 8;
      R.ellipse(x, y, r * 1.2, r * 0.5, `rgba(0,0,0,${o.a !== undefined ? o.a : 0.35})`);
    },
  },
};
