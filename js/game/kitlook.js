// Cricket Legends (M18) - what each player on the pitch looks like, and drawing them.
//
// The rendered action frames (data/anims.js) show the kit and skin as light grey; each frame has a
// mask (main | trim | skin side by side). Drawing a frame: the picture, then each mask part filled
// with its colour and laid over with 'multiply' (keeps the light and shade). Frames without a helmet
// get the player's own head on top: head (skin tinted), facial hair, hair (hair colour), covering, or a
// rival's own head; the head pieces come in 12 turns, picked from the frame's head turn.
//
// Looks: your career player from the creator; computer players from their origin (LOOKS_DATA),
// picked by a hash of their name (no RNG: the same player always looks the same).

const KitLook = {
  _scratch: null,
  _looks: new Map(),
  _kits: null, _kitsFor: null,
  _headsOk: false,

  // ---- colours
  rgb(hex) { const n = parseInt(String(hex).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; },
  dist(a, b) { const x = this.rgb(a), y = this.rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); },
  hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
  pick(list, h, salt) { return list[(this.hash(h + '|' + salt)) % list.length]; },
  chance(p, h, salt) { return (this.hash(h + '|' + salt) % 10000) / 10000 < p; },

  // A team's kit: { main, trim, crest }. Colours from the team (career, Quick Match, My XI), or
  // from its origin's colour pool, or the defaults.
  _teamKit(t, side) {
    const L = LOOKS_DATA;
    let colours = t && t.kit && t.kit.colours, crest = t && t.kit ? t.kit.crest : null;
    if (!colours && t && t.origin && typeof ORIGIN_PACKS !== 'undefined' && ORIGIN_PACKS.origins[t.origin]) {
      const pool = ORIGIN_PACKS.origins[t.origin].colourPool, C = CAREER_DATA.clubs.colours;
      const combo = pool[this.hash(t.origin + (t.name || side)) % pool.length].split('_');
      colours = [C[combo[0]] || L.defaultKit[side][0], C[combo[1]] || L.defaultKit[side][1]];
    }
    colours = colours || L.defaultKit[side];
    return { main: colours[0], trim: colours[1], crest: crest || null };
  },
  // Both sides' kits for this match, with the clash rule (the away side changes).
  kits() {
    const T = typeof Match !== 'undefined' && Match.teams && this._inMatch ? Match.teams : null;
    if (this._kits && this._kitsFor === (T || 'none')) return this._kits;
    const k = { player: this._teamKit(T && T.player, 'player'), ai: this._teamKit(T && T.ai, 'ai') };
    const C = LOOKS_DATA.clash;
    if (this.dist(k.player.main, k.ai.main) < C.minDistance) {
      const away = k.ai;
      if (this.dist(k.player.main, away.trim) >= C.minDistance) k.ai = { main: away.trim, trim: away.main, crest: away.crest, changed: true };
      else k.ai = { main: C.away, trim: away.main, crest: away.crest, changed: true };
    }
    this._kits = k; this._kitsFor = T || 'none';
    return k;
  },
  umpireKit() { const u = LOOKS_DATA.umpire.kit; return { main: u[0], trim: u[1], crest: null }; },

  // ---- looks: { head, hair, facial, cover, rival, skin (colour), hairColour ({color, op, a} | null) }
  of(p, team) {
    if (!p) return this.umpire();
    const key = (p.isCareer ? 'career' : '') + (p.isRival || '') + '|' + (p.name || p.id) + '|' + (team && team.origin || '');
    let L = this._looks.get(key);
    if (!L) { L = this._make(p, team); this._looks.set(key, L); }
    return L;
  },
  umpire() {
    if (!this._ump) { const u = LOOKS_DATA.umpire.look; this._ump = this._finish({ head: u.head, hair: u.hair, facial: u.facial, cover: null }, u.skin, u.hairColour); }
    return this._ump;
  },
  _finish(o, skin, hc) {
    o.skin = LOOKS_DATA.skin[skin] || LOOKS_DATA.skin.tan;
    o.hairColour = hc ? LOOKS_DATA.hairColour[hc] || null : null;
    if (o.cover && LOOKS_DATA.coverHidesHair.includes(o.cover)) o.hair = null;
    return o;
  },
  _make(p, team) {
    const L = LOOKS_DATA, parts = typeof ANIM_HEADS !== 'undefined' && ANIM_HEADS ? ANIM_HEADS.parts : {};
    const ok = (id) => (id && parts[id] ? id : null);
    if (p.isRival) {
      const id = ok(L.rivals[p.isRival]) || ok('rival_the_' + p.isRival) || ok(L.rivals.captain);
      return this._finish({ rival: id }, L.rivalSkin[p.isRival] || 'tan', null);
    }
    if (p.look) {   // your own player (the creator's choices)
      const g = p.look.presentation === 'feminine' ? 'feminine' : 'masculine';
      return this._finish({ head: L.head[g], hair: ok(L.hairFromLook[p.look.look]) || L.hair[g][0], facial: ok(L.facialFromLook[p.look.facial]), cover: null },
        p.look.skin, p.look.hairColour);
    }
    const O = L.origins[team && team.origin] || L.origins._any, g = team && team.gender === 'feminine' ? 'f' : 'm', h = String(p.name || p.id);
    const hairs = (O.hair && O.hair[g]) || L.hair[g === 'f' ? 'feminine' : 'masculine'];
    const cov = O.cover && O.cover[g];
    return this._finish({
      head: ok(this.pick(O[g], h, 'head')) || L.head[g === 'f' ? 'feminine' : 'masculine'],
      hair: ok(this.pick(hairs, h, 'hair')),
      facial: g === 'm' && this.chance(O.facialChance !== undefined ? O.facialChance : L.facialChance, h, 'facial') ? ok(this.pick(L.facial, h, 'fh')) : null,
      cover: cov && this.chance(cov[1], h, 'cover') ? ok(cov[0]) : null,
    }, this.pick(O.skins, h, 'skin'), this.pick(O.hairColours || L.hairColours, h, 'hc'));
  },

  // Every head piece loaded? (frames that need a head wait for them, so nobody shows up headless)
  headsReady() {
    if (this._headsOk) return true;
    if (typeof ANIM_HEADS === 'undefined' || !ANIM_HEADS) return false;
    for (const [id, p] of Object.entries(ANIM_HEADS.parts)) for (let i = 0; i < p.files.length; i++) if (!Sprites.has('head_' + id + ':' + i)) return false;
    return (this._headsOk = true);
  },

  // ---- drawing
  _scr(w, h) {
    if (!this._scratch) { this._scratch = document.createElement('canvas'); this._scratch.width = 4; this._scratch.height = 4; }
    const c = this._scratch;
    if (c.width < w) c.width = Math.ceil(w); if (c.height < h) c.height = Math.ceil(h);
    return c;
  },
  // Lay `color` over the area where src (part sx..sx+sw of img) has alpha, using operation op.
  _tint(ctx, img, sx, sy, sw, sh, dx, dy, w, h, color, op, a) {
    const W = Math.ceil(w), H = Math.ceil(h);
    if (W < 1 || H < 1) return;
    const c = this._scr(W, H), g = c.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    const was = ctx.globalAlpha;
    ctx.globalCompositeOperation = op || 'multiply'; if (a !== undefined) ctx.globalAlpha = was * a;
    ctx.drawImage(c, 0, 0, w, h, dx, dy, w, h);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = was;
  },
  // A rendered frame in kit colours with its own head. o: { scale, flip, alpha }. false = not loaded.
  draw(act, frame, x, y, ppm, o, look, kit) {
    const art = Sprites.images['anim_' + act + ':' + frame], A = ANIM_DATA[act];
    if (!art || !A) return false;
    const ctx = R.ctx, h = art.heightM * ppm * (o.scale || 1), w = h * (art.img.width / art.img.height);
    if (o.shadow !== false) R.ellipse(x, y, 0.5 * ppm, 0.13 * ppm, 'rgba(0,0,0,0.28)');
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    ctx.translate(x, y);
    if (o.flip) ctx.scale(-1, 1);
    const dx = -w * A.anchorX, dy = -h * A.anchorY;
    ctx.drawImage(art.img, dx, dy, w, h);
    const m = Sprites.images['animm_' + act + ':' + frame];
    if (m && kit && look) {
      const mw = m.img.width / 3, mh = m.img.height, cols = [kit.main, kit.trim, look.skin];
      for (let k = 0; k < 3; k++) this._tint(ctx, m.img, k * mw, 0, mw, mh, dx, dy, w, h, cols[k]);
    }
    const pxm = h / A.heightM;           // pixels per metre in this frame
    if (kit && kit.crest && A.crest && A.crest[frame] && typeof Crest !== 'undefined') {
      const [cx, cy, facing] = A.crest[frame], C = LOOKS_DATA.crest;
      if (facing >= C.minFacing) {
        const s = C.sizeM * pxm;
        ctx.save(); ctx.translate(dx + cx * w, dy + cy * h); ctx.scale(facing * (o.flip ? -1 : 1), 1);   // (a crest never reads backwards)
        Crest.draw(ctx, kit.crest, 0, 0, s);
        ctx.restore();
      }
    }
    if (A.ownHead && A.head && A.head[frame] && look) this._head(ctx, look, A.head[frame], dx, dy, w, h, pxm);
    ctx.restore();
    return true;
  },
  _head(ctx, look, hd, dx, dy, w, h, pxm) {
    const H = ANIM_HEADS;
    if (!H) return;
    const [hx, hy, roll, yaw] = hd, n = H.yaws;
    const turn = ((Math.round(yaw / (360 / n)) % n) + n) % n, s = H.ortho * pxm;
    ctx.save();
    ctx.translate(dx + hx * w, dy + hy * h);
    if (roll) ctx.rotate(roll * Math.PI / 180);
    const piece = (id, tint) => {
      const im = id && Sprites.images['head_' + id + ':' + turn];
      if (!im) return;
      ctx.drawImage(im.img, -s / 2, -s / 2, s, s);
      if (tint) this._tint(ctx, im.img, 0, 0, im.img.width, im.img.height, -s / 2, -s / 2, s, s, tint.color, tint.op, tint.a);
    };
    if (look.rival) piece(look.rival);
    else {
      piece(look.head, { color: look.skin, op: 'multiply' });
      piece(look.facial, look.hairColour);
      piece(look.hair, look.hairColour);
      piece(look.cover);
    }
    ctx.restore();
  },
};
