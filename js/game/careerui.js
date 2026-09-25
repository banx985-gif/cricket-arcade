// Cricket Arcade — Career screen pieces (M05).
//   Portrait  the player's portrait with skin tone / hair colour tints
//             (tinted only where the masks from tests/tools/masks.js say)
//   Crest     a club crest: grey shield + grey emblem tinted in the club's two
//             colours, or a framed cricket emblem on its own
//   CareerUI  backgrounds, meters, stat bars, the energy / form chips
// Every picture is drawn through a sprite id, so real / 3D art can replace it.

const Tint = {
  _cache: {},
  // A tinted copy of an image: grey art x colour (multiply), alpha kept.
  // colours: one colour, or [top, bottom] for a two-colour gradient.
  of(id, colours) {
    const key = id + '|' + [].concat(colours).join(',');
    if (this._cache[key]) return this._cache[key];
    const art = Sprites.images[id];
    if (!art || typeof document === 'undefined') return null;
    const w = art.img.width, h = art.img.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(art.img, 0, 0);
    g.globalCompositeOperation = 'multiply';
    if (Array.isArray(colours)) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0.2, colours[0]); gr.addColorStop(0.8, colours[1]);
      g.fillStyle = gr;
    } else g.fillStyle = colours;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(art.img, 0, 0);
    this._cache[key] = c;
    return c;
  },
};

const Portrait = {
  _cache: {},
  // The portrait sprite id for a player (facial hair portraits replace the look).
  lookId(p) { return p.facial && p.facial !== 'none' ? p.facial : p.look; },

  _tone(list, id) { return list.find((t) => t.id === id) || null; },

  canvas(p) {
    const id = this.lookId(p);
    const key = id + '|' + p.skin + '|' + p.hairColour;
    if (this._cache[key]) return this._cache[key];
    const art = Sprites.images[id];
    if (!art || typeof document === 'undefined') return null;
    const w = art.img.width, h = art.img.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(art.img, 0, 0);
    const layer = (maskId, tone) => {
      if (!tone || !tone.a) return true;
      const mask = Sprites.images[maskId];
      if (!mask) return false;
      const t = document.createElement('canvas');
      t.width = w; t.height = h;
      const tg = t.getContext('2d');
      tg.drawImage(mask.img, 0, 0, w, h);
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = tone.color;
      tg.fillRect(0, 0, w, h);
      g.save();
      g.globalAlpha = tone.a;
      g.globalCompositeOperation = tone.op;
      g.drawImage(t, 0, 0);
      g.restore();
      return true;
    };
    const okSkin = layer('mask_' + id + '_skin', this._tone(CAREER_DATA.skinTones, p.skin));
    const okHair = layer('mask_' + id + '_hair', this._tone(CAREER_DATA.hairColours, p.hairColour));
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(art.img, 0, 0);
    if (okSkin && okHair) this._cache[key] = c;   // don't cache until the masks have loaded
    return c;
  },

  // Draw fitted in a circle-ish frame. Returns false if the art isn't loaded yet.
  draw(ctx, p, cx, cy, size, opts) {
    const o = opts || {};
    const c = this.canvas(p);
    if (o.frame !== false) R.circle(cx, cy, size * 0.52, o.bg || 'rgba(20,40,70,0.9)', o.ring || '#ffd23f', Math.max(3, size * 0.03));
    if (!c) {
      R.circle(cx, cy - size * 0.05, size * 0.22, '#c98e62');
      return false;
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2); ctx.clip();
    const k = size / Math.max(c.width, c.height) * 1.05;
    ctx.drawImage(c, cx - c.width * k / 2, cy - c.height * k / 2 + size * 0.04, c.width * k, c.height * k);
    ctx.restore();
    return true;
  },
};

const Crest = {
  draw(ctx, crest, cx, cy, size) {
    if (!crest) return;
    // a franchise crest is a finished picture (M08)
    if (crest.image) { if (!Sprites.ui(crest.image, cx, cy, size, size)) R.circle(cx, cy, size * 0.45, crest.colours[0], crest.colours[1], 6); return; }
    const [c0, c1] = crest.colours;
    if (!crest.shield) {
      const t = Tint.of(crest.emblem, [c0, c1]);
      if (!t) { R.circle(cx, cy, size * 0.45, c0, c1, 6); return; }
      const k = size / Math.max(t.width, t.height);
      ctx.drawImage(t, cx - t.width * k / 2, cy - t.height * k / 2, t.width * k, t.height * k);
      return;
    }
    // A dark second colour would vanish on the shield: the emblem goes silver instead.
    const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; };
    const s = Tint.of(crest.shield, c0), e = Tint.of(crest.emblem, lum(c1) < 0.3 ? '#eef1f4' : c1);
    if (!s) { R.circle(cx, cy, size * 0.45, c0, c1, 6); return; }
    const k = size / Math.max(s.width, s.height);
    ctx.drawImage(s, cx - s.width * k / 2, cy - s.height * k / 2, s.width * k, s.height * k);
    if (e) {
      const ke = size * 0.52 / Math.max(e.width, e.height);
      ctx.drawImage(e, cx - e.width * ke / 2, cy - e.height * ke / 2 + size * 0.04, e.width * ke, e.height * ke);
    }
  },
};

const CareerUI = {
  // Full-screen background art (covering the view), dimmed.
  bg(ctx, id, dim) {
    const v = Display.viewRect();
    const art = Sprites.images[id];
    if (art) {
      const k = Math.max(v.w / art.img.width, v.h / art.img.height);
      const w = art.img.width * k, h = art.img.height * k;
      ctx.drawImage(art.img, v.x + (v.w - w) / 2, v.y + (v.h - h) / 2, w, h);
    } else {
      const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h);
      g.addColorStop(0, '#1b2f4a'); g.addColorStop(1, '#0a1522');
      ctx.fillStyle = g; ctx.fillRect(v.x, v.y, v.w, v.h);
    }
    if (dim) { ctx.fillStyle = `rgba(5,12,22,${dim})`; ctx.fillRect(v.x, v.y, v.w, v.h); }
  },

  // A horizontal meter: value 0..max, optional marker lines (e.g. thresholds).
  meter(x, y, w, h, value, max, color, marks) {
    R.roundRect(x, y, w, h, h / 2, 'rgba(0,0,0,0.55)', 'rgba(255,255,255,0.35)', 2);
    const k = Math.max(0, Math.min(1, value / max));
    if (k > 0) R.roundRect(x + 3, y + 3, Math.max(h - 6, (w - 6) * k), h - 6, (h - 6) / 2, color);
    for (const m of marks || []) {
      const mx = x + w * (m.at / max);
      R.rect(mx - 2, y - 6, 4, h + 12, m.color || '#ffffff');
      if (m.label) R.text(m.label, mx, y + h + 20, 18, m.color || '#ffffff', 'center', false);
    }
  },

  // Energy + form chips.
  energyForm(ctx, c, x, y) {
    Sprites.ui('career_energy', x + 30, y + 30, 60, 60);
    R.text(T('career.energy'), x + 70, y + 14, 20, '#b8c6d6', 'left', false);
    const low = c.energy < CAREER_DATA.energy.low;
    this.meter(x + 70, y + 30, 230, 26, c.energy, CAREER_DATA.energy.max, low ? '#ff5a1f' : '#3ddc5a');
    R.text(String(c.energy), x + 316, y + 44, 24, low ? '#ff9d7a' : '#ffffff', 'left', false);
    Sprites.ui('career_form_' + c.form, x + 400, y + 30, 60, 60);
    R.text(T('career.form'), x + 440, y + 14, 20, '#b8c6d6', 'left', false);
    R.text(T('career.formLevel.' + c.form), x + 440, y + 46, 30, { poor: '#ff8f8f', normal: '#ffffff', good: '#9cff6a', hot: '#ffb400' }[c.form], 'left');
  },

  statRows(ctx, stats, x, y, keys, opts) {
    const o = opts || {};
    keys.forEach((k, i) => {
      const yy = y + i * (o.gap || 40);
      R.text(T('stat.' + k), x, yy, o.size || 22, '#d8e4f0', 'left', false);
      this.meter(x + (o.labelW || 170), yy - 10, o.barW || 220, 20, stats[k], 99, o.color || '#2f9bff');
      R.text(String(stats[k]), x + (o.labelW || 170) + (o.barW || 220) + 14, yy, o.size || 22, '#ffffff', 'left', false);
    });
  },

  gradeBadge(grade, cx, cy, size) {
    if (!Sprites.ui('grade_' + grade.toLowerCase(), cx, cy, size, size)) {
      R.circle(cx, cy, size * 0.45, '#12304f', '#ffd23f', 6);
      R.text(grade, cx, cy, size * 0.5, '#ffd23f');
    }
  },

  pathwayLabel(c, stageN) {
    const O = ORIGIN_PACKS.origins[c.origin];
    return O ? O.pathwayLabels[(stageN || Career.stage(c).n) - 1] : '';
  },
};
