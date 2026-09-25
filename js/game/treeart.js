// Cricket Arcade — Wicket Tree pictures (M06). Every tree picture is drawn
// through a sprite id (SKILL_TREE_DATA.art, perk_<id>, keystone_<id>, the
// trait icons). When Cowork files the batch B13 art in game/assets/skilltree/
// under those ids it is used; until then these clean code placeholders draw.
//   TreeArt        draw(id, x, y, size) — the art, or its placeholder
//   TreeText       names and descriptions of nodes and techniques (string keys)
//   TreeUIColours  branch colours

const TreeUIColours = {
  branchOf(id) {
    if (SKILL_TREE_DATA.techniques[id]) { const n = SkillTree.techNode(id); return n ? n.branch : 'mindbody'; }
    const n = SkillTree.node(id);
    return n ? n.branch : 'bails';
  },
  forId(id) { return SKILL_TREE_DATA.colours[this.branchOf(id)] || '#ffffff'; },
};

const TreeText = {
  // id: a technique id ('pull_specialist') or a node id ('tech_…', 'perk_…', 'keystone_…', 'capstone_…').
  _key(id) {
    if (SKILL_TREE_DATA.techniques[id]) return 'tech.' + id;
    const n = SkillTree.node(id);
    if (n && n.tech) return 'tech.' + n.tech;
    return 'tree.' + id;
  },
  name(id) { return T(this._key(id)); },
  desc(id) { return T(this._key(id) + '.desc'); },
};

const TreeArt = {
  // The sprite id that shows a node / technique.
  iconOf(id) {
    const TD = SKILL_TREE_DATA.techniques;
    if (TD[id]) return TD[id].icon;
    const n = SkillTree.node(id);
    if (n && n.tech) return TD[n.tech].icon;
    if (n && n.type === 'capstone') return SKILL_TREE_DATA.art.legend;
    return id;
  },

  // Draw a UI picture fitted in a size x size box centred on (x, y).
  draw(id, x, y, size, opts) {
    if (Sprites.ui(id, x, y, size, size, opts)) return;
    const ctx = R.ctx, o = opts || {};
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    const fn = this.PH[id] || this._generic(id);
    fn(ctx, x, y, size, o);
    ctx.restore();
  },

  hasArt(id) { return !!Sprites.images[id]; },

  // A ring frame (node_*), drawn so its icon hole is 'hole' across and centred
  // on (x, y). The frame pictures aren't centred (crowns, padlocks), so each
  // one's hole is listed in SKILL_TREE_DATA.art.frameHole.
  frame(id, x, y, hole, opts) {
    const art = Sprites.images[id], H = SKILL_TREE_DATA.art.frameHole[id], o = opts || {};
    if (art && H) {
      const k = hole / H[2], ctx = R.ctx;
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(art.img, x - H[0] * k, y - H[1] * k, art.img.width * k, art.img.height * k);
      ctx.restore();
      return;
    }
    this.draw(id, x, y, hole * 1.55, o);            // placeholder: a ring around the hole
  },
  // A dark disc behind an icon, so the painted tree doesn't show through the hole.
  holeBack(x, y, hole) { R.circle(x, y, hole * 0.53, 'rgba(8,16,30,0.92)'); },
  // A rank pip: the pip ring with a coloured dot inside when the rank is owned.
  pip(x, y, size, on, colour) {
    if (!this.hasArt(SKILL_TREE_DATA.art.perkPip)) { this.draw(SKILL_TREE_DATA.art.perkPip, x, y, size, { on, colour }); return; }
    const hole = size * 0.62;
    R.circle(x, y, hole * 0.55, on ? (colour || '#ffd23f') : 'rgba(8,16,30,0.85)');
    this.frame(SKILL_TREE_DATA.art.perkPip, x, y, hole, { alpha: on ? 1 : 0.6 });
  },

  // Placeholders by id pattern.
  _generic(id) {
    if (id.startsWith('perk_') && id !== 'perk_pip') return (ctx, x, y, s) => this._perk(id, x, y, s);
    if (id.startsWith('keystone_')) return (ctx, x, y, s) => this._keystone(id, x, y, s);
    if (id.startsWith('trait_')) return (ctx, x, y, s) => { R.circle(x, y, s * 0.4, '#2a3a4f', '#9be7ff', 3); R.text('?', x, y, s * 0.4, '#ffffff'); };
    return (ctx, x, y, s) => R.circle(x, y, s * 0.4, 'rgba(255,255,255,0.2)');
  },

  _perk(id, x, y, s) {
    const col = TreeUIColours.forId(id);
    R.circle(x, y, s * 0.46, '#10202f', col, Math.max(2, s * 0.06));
    R.circle(x, y, s * 0.34, col + '55');
    R.text(T('tree.glyph.' + id), x, y + 1, s * 0.3, '#ffffff', 'center', false);
  },

  _keystone(id, x, y, s) {
    const col = TreeUIColours.forId(id), h = s * 0.48;
    R.poly([{ x, y: y - h }, { x: x + h, y }, { x, y: y + h }, { x: x - h, y }], '#1d1428', col, Math.max(3, s * 0.06));
    R.poly([{ x, y: y - h * 0.62 }, { x: x + h * 0.62, y }, { x, y: y + h * 0.62 }, { x: x - h * 0.62, y }], col + '66');
    R.text(T('tree.glyph.' + id), x, y + 1, s * 0.24, '#ffffff', 'center', false);
  },

  PH: {
    // Node frames (drawn around a technique icon). size = the node's diameter.
    node_locked(ctx, x, y, s) { R.circle(x, y, s / 2, '#1a222c', '#56606b', Math.max(3, s * 0.06)); },
    node_available(ctx, x, y, s) { R.circle(x, y, s / 2, '#16283a', '#9be7ff', Math.max(3, s * 0.07)); },
    node_unlocked(ctx, x, y, s, o) { R.circle(x, y, s / 2, '#1d3350', o.colour || '#ffffff', Math.max(4, s * 0.08)); },
    node_mastered(ctx, x, y, s, o) {
      R.circle(x, y, s / 2, '#2a2410', '#ffd23f', Math.max(5, s * 0.1));
      R.circle(x, y, s / 2 - s * 0.1, null, o.colour || '#ffffff', Math.max(2, s * 0.03));
    },
    node_keystone(ctx, x, y, s, o) {
      const h = s / 2;
      R.poly([{ x, y: y - h }, { x: x + h, y }, { x, y: y + h }, { x: x - h, y }], '#1d1428', o.colour || '#e8c8ff', Math.max(4, s * 0.07));
    },
    perk_pip(ctx, x, y, s, o) { R.circle(x, y, s / 2, o.on ? (o.colour || '#ffd23f') : 'rgba(255,255,255,0.18)', '#0b1622', Math.max(1, s * 0.15)); },

    // Branch emblems: the badge at the foot of each branch.
    branch_batting(ctx, x, y, s) {
      R.circle(x, y, s * 0.46, '#2b2208', '#ffc53d', s * 0.06);
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6);
      R.roundRect(-s * 0.06, -s * 0.34, s * 0.12, s * 0.2, s * 0.03, '#3b2b17');
      R.roundRect(-s * 0.1, -s * 0.16, s * 0.2, s * 0.5, s * 0.05, '#ffe6a8', '#b8863a', 2);
      ctx.restore();
    },
    branch_bowling(ctx, x, y, s) {
      R.circle(x, y, s * 0.46, '#2b0c12', '#ff5a6e', s * 0.06);
      R.circle(x, y, s * 0.24, '#c1121f');
      ctx.beginPath(); ctx.arc(x, y, s * 0.17, -0.7, 0.9); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    },
    branch_mindbody(ctx, x, y, s) {
      R.circle(x, y, s * 0.46, '#0b2b17', '#5fe08a', s * 0.06);
      // a heart-beat line
      const w = s * 0.3;
      ctx.beginPath();
      ctx.moveTo(x - w, y); ctx.lineTo(x - w * 0.35, y); ctx.lineTo(x - w * 0.15, y - w * 0.6);
      ctx.lineTo(x + w * 0.1, y + w * 0.55); ctx.lineTo(x + w * 0.3, y); ctx.lineTo(x + w, y);
      ctx.strokeStyle = '#9cff6a'; ctx.lineWidth = Math.max(2, s * 0.05); ctx.lineJoin = 'round'; ctx.stroke();
    },

    // Small icons.
    icon_skill_token(ctx, x, y, s) {
      R.circle(x, y, s * 0.44, '#ffcf33', '#8a5a00', Math.max(2, s * 0.06));
      R.circle(x, y, s * 0.32, null, '#fff3b0', Math.max(1, s * 0.03));
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.11 : s * 0.25; pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }); }
      R.poly(pts, '#8a5a00');
    },
    icon_respec(ctx, x, y, s) {
      R.circle(x, y, s * 0.44, '#12304a', '#9be7ff', Math.max(2, s * 0.05));
      ctx.lineWidth = Math.max(2, s * 0.07); ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, s * 0.24, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, s * 0.24, Math.PI + 0.3, -0.3); ctx.stroke();
      R.poly([{ x: x + s * 0.3, y: y - s * 0.02 }, { x: x + s * 0.14, y: y - s * 0.02 }, { x: x + s * 0.22, y: y - s * 0.14 }], '#ffffff');
      R.poly([{ x: x - s * 0.3, y: y + s * 0.02 }, { x: x - s * 0.14, y: y + s * 0.02 }, { x: x - s * 0.22, y: y + s * 0.14 }], '#ffffff');
    },
    icon_legend_bails(ctx, x, y, s) {
      // three stumps with two glowing bails on top
      const w = s * 0.36, top = y - s * 0.16, bot = y + s * 0.36;
      ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = s * 0.2;
      for (let i = -1; i <= 1; i++) R.line(x + i * w * 0.55, bot, x + i * w * 0.55, top, '#f3e7c9', Math.max(3, s * 0.07));
      R.roundRect(x - w * 0.62, top - s * 0.12, w * 0.58, s * 0.08, s * 0.04, '#ffd23f');
      R.roundRect(x + w * 0.04, top - s * 0.12, w * 0.58, s * 0.08, s * 0.04, '#ffd23f');
      ctx.shadowBlur = 0;
    },
  },

  // Full-screen tree background (tree_bg): night sky, a glow behind the tree,
  // the pitch at the foot of the stumps. Drawn in screen space.
  // plain: just the fill (the tree screen draws the picture itself, in tree space).
  background(ctx, v, plain) {
    if (Sprites.images[SKILL_TREE_DATA.art.bg]) {
      ctx.fillStyle = SKILL_TREE_DATA.layout.edge;
      ctx.fillRect(v.x, v.y, v.w, v.h);
      if (!plain) this._cover(ctx, v);
      return;
    }
    const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h);
    g.addColorStop(0, '#07101f'); g.addColorStop(0.65, '#0d2236'); g.addColorStop(1, '#10301c');
    ctx.fillStyle = g;
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const cx = v.x + v.w / 2, rg = ctx.createRadialGradient(cx, v.y + v.h * 0.45, 20, cx, v.y + v.h * 0.45, v.h * 0.8);
    rg.addColorStop(0, 'rgba(255,226,138,0.12)'); rg.addColorStop(1, 'rgba(255,226,138,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(v.x, v.y, v.w, v.h);
    // stars (fixed pattern, not random)
    for (let i = 0; i < 70; i++) {
      const sx = v.x + ((i * 733) % 1000) / 1000 * v.w, sy = v.y + ((i * 379) % 1000) / 1000 * v.h * 0.6;
      R.circle(sx, sy, 1 + (i % 3), 'rgba(255,255,255,' + (0.15 + (i % 5) * 0.08) + ')');
    }
  },
  // The picture filling a screen rect (cropped, never stretched), dimmed.
  _cover(ctx, v) {
    const img = Sprites.images[SKILL_TREE_DATA.art.bg].img, k = Math.max(v.w / img.width, v.h / img.height);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(img, v.x + (v.w - img.width * k) / 2, v.y + (v.h - img.height * k) / 2, img.width * k, img.height * k);
    ctx.restore();
  },
  // The painted tree in tree space (rect = TreeLayout.bg()). Without the art: a
  // plain night-sky gradient the same size.
  treeBackground(ctx, rect) {
    const art = Sprites.images[SKILL_TREE_DATA.art.bg];
    if (art) { ctx.drawImage(art.img, rect.x, rect.y, rect.w, rect.h); return; }
    const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    g.addColorStop(0, '#07101f'); g.addColorStop(0.7, '#0d2236'); g.addColorStop(1, '#10301c');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  },
};
