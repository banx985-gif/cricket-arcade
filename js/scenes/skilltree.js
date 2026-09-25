// Cricket Arcade — the Wicket Tree screen and the Technique Loadout (M06).
//   CareerTreeScene     the full-screen tree: three branches grow out of the
//                       stumps, Legend's Bails on top. Drag to pan, pinch (or
//                       the mouse wheel / + -) to zoom, tap a node for its card.
//                       Points counter at the top (tap it for where they came
//                       from), RESPEC (between stages) and LOADOUT buttons.
//   CareerLoadoutScene  equip 2 active + 2 passive unlocked techniques (plan 11).
// Every picture goes through TreeArt (sprite ids, code placeholders for now).

const TreeLayout = {
  _pos: null,
  // Tree space: the painted background (SKILL_TREE_DATA.layout.bg) scaled up,
  // x centred on the middle stump, y down from the top of the picture.
  bg() { const B = SKILL_TREE_DATA.layout.bg; return { x: -B.centreX * B.scale, y: 0, w: B.w * B.scale, h: B.h * B.scale }; },
  toTree(px, py) { const B = SKILL_TREE_DATA.layout.bg; return { x: (px - B.centreX) * B.scale, y: py * B.scale }; },
  // Tree-space position and radius of every node (hand-placed on the painted branches).
  pos() {
    if (this._pos) return this._pos;
    const L = SKILL_TREE_DATA.layout, out = {};
    for (const n of SKILL_TREE_DATA.nodes) {
      const p = L.pos[n.id], t = this.toTree(p[0], p[1]);
      out[n.id] = { x: t.x, y: t.y, r: L.radius[n.type] };
    }
    this._pos = out;
    return out;
  },
  // Where a closed tier's label goes (open sky beside the tier).
  tierLabel(b, t) { const p = SKILL_TREE_DATA.layout.tierLabels[b][t - 2]; return this.toTree(p[0], p[1]); },
  emblem(b) { const e = SKILL_TREE_DATA.layout.emblem[b]; return this.toTree(e[0], e[1]); },
};

const CareerTreeScene = {
  career: null, slot: 1, from: 'home',
  cam: { x: 0, y: 950, zoom: 0.5 },
  sel: null,              // selected node id (the card)
  popup: null,            // null | 'points' | 'respec'
  flash: null,            // { text, t, color }
  _t: 0,
  ptrs: {},               // pointerId -> { x, y, sx, sy, moved }
  pinch: null,            // { d, zoom, wx, wy }
  hud: new ButtonList(),
  cardBtns: new ButtonList(),
  popBtns: new ButtonList(),

  enter(params) {
    CareerAssets.ensure();
    this.slot = params.slot || this.slot;
    this.career = params.career || this.career;
    this.from = params.from || 'home';
    SkillTree.ensure(this.career);
    this.sel = null; this.popup = null; this.flash = null; this._t = 0; this.ptrs = {}; this.pinch = null;
    this._fitCam();
    this._layout();
    this._wheel = (e) => {
      e.preventDefault();
      const p = Display.toLogical(e.clientX, e.clientY);
      this._zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    const cv = document.getElementById('game-canvas');
    if (cv) cv.addEventListener('wheel', this._wheel, { passive: false });
  },
  exit() {
    const cv = document.getElementById('game-canvas');
    if (cv && this._wheel) cv.removeEventListener('wheel', this._wheel);
  },

  // ---- camera ----
  _view() { const v = Display.viewRect(); return { x: v.x, y: v.y + 130, w: v.w, h: v.h - 130 }; },
  // Fully zoomed out, the picture still fills the screen (no empty edges).
  _limits() { const v = this._view(), B = TreeLayout.bg(); return { min: Math.max(v.w / B.w, v.h / B.h), max: 1.6 }; },
  _fitCam() {
    const v = this._view();
    this.cam.zoom = this._limits().min;
    this.cam.x = 0; this.cam.y = v.h / 2 / this.cam.zoom;       // the top of the tree (tier 4 and the tips)
    this._clampCam();
    this._fitZoom = this.cam.zoom;
  },
  toScreen(wx, wy) { const v = this._view(); return { x: v.x + v.w / 2 + (wx - this.cam.x) * this.cam.zoom, y: v.y + v.h / 2 + (wy - this.cam.y) * this.cam.zoom }; },
  toWorld(sx, sy) { const v = this._view(); return { x: this.cam.x + (sx - v.x - v.w / 2) / this.cam.zoom, y: this.cam.y + (sy - v.y - v.h / 2) / this.cam.zoom }; },
  _zoomAt(sx, sy, k) {
    const before = this.toWorld(sx, sy), lim = this._limits();
    this.cam.zoom = Math.max(lim.min, Math.min(lim.max, this.cam.zoom * k));
    const after = this.toWorld(sx, sy);
    this.cam.x += before.x - after.x; this.cam.y += before.y - after.y;
    this._clampCam();
  },
  // Keep the view inside the picture.
  _clampCam() {
    const v = this._view(), B = TreeLayout.bg(), z = this.cam.zoom;
    const hw = v.w / 2 / z, hh = v.h / 2 / z;
    this.cam.x = hw * 2 >= B.w ? B.x + B.w / 2 : Math.max(B.x + hw, Math.min(B.x + B.w - hw, this.cam.x));
    this.cam.y = hh * 2 >= B.h ? B.y + B.h / 2 : Math.max(B.y + hh, Math.min(B.y + B.h - hh, this.cam.y));
  },

  // ---- buttons ----
  _save() { return CareerSave.save(this.career, this.slot); },
  _layout() {
    const s = Display.safe, h = this.hud, c = this.career;
    h.clear();
    h.add('tree.back', s.left + 20, s.top + 16, 200, 96, () => this._back(), { size: 32, color: '#e9eef5' });
    h.add('tree.loadout', s.right - 300, s.top + 16, 280, 96, () => Scenes.go('careerloadout', { slot: this.slot, career: c, from: 'tree', back: this.from }), { size: 32, color: '#9be7ff' });
    h.add('tree.respec', s.right - 590, s.top + 16, 270, 96, () => this._openRespec(), {
      size: 30, color: '#ffd9a0', sub: () => T('tree.respecSub', { n: SkillTree.respecCost(c) }),
      disabled: () => !SkillTree.betweenStages(c),
    });
    // the points counter (tap for where the points came from)
    const pc = h.add(() => '', s.left + 240, s.top + 16, 330, 96, () => this._openPoints(), { color: 'rgba(0,0,0,0)' });
    pc.invisible = true;
    h.add(() => '+', s.left + 30, s.bottom - 250, 100, 100, () => this._zoomAt(CONFIG.LOGICAL_W / 2, 600, 1.25), { size: 56, color: '#e9eef5' });
    h.add(() => '−', s.left + 30, s.bottom - 135, 100, 100, () => this._zoomAt(CONFIG.LOGICAL_W / 2, 600, 0.8), { size: 56, color: '#e9eef5' });
  },
  _back() {
    if (this.from === 'prematch') { CareerMatch.refreshPlayer(); Scenes.go('careerprematch'); }
    else Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true });
  },

  // ---- the node card ----
  _select(id) {
    this.sel = id;
    const b = this.cardBtns, c = this.career, n = SkillTree.node(id), x = this._cardX();
    b.clear();
    if (!id) return;
    const owned = SkillTree.owned(c, id);
    const label = () => (SkillTree.rank(c, id) >= SkillTree.ranks(n) ? T('tree.maxed') : owned ? T('tree.rankUp') : T('tree.unlock'));
    const canBuy = () => SkillTree.check(c, id).ok;
    if (!(n.type !== 'minor' && owned)) {
      b.add(label, x + 40, 880, 540, 110, () => this._unlock(id), { size: 48, color: '#9cff6a', disabled: () => !canBuy() }).tag = 'unlock';
    }
    if (n.tech && owned) {
      b.add(() => T(SkillTree.equipped(c, n.tech) ? 'tree.unequip' : 'tree.equip'), x + 40, 880, 540, 110, () => this._equip(n.tech), { size: 44, color: '#9be7ff' }).tag = 'equip';
    }
    b.add(() => '✕', x + 520, 150, 96, 96, () => this._select(null), { size: 44, color: '#e9eef5' });
  },
  _cardX() { return Display.safe.right - 660; },

  _unlock(id) {
    const c = this.career, r = SkillTree.unlock(c, id);
    if (!r.ok) { Sound.play('edge'); return; }
    const n = SkillTree.node(id);
    let text = T('tree.unlocked');
    if (r.discovered) {
      SkillTree.discover(Save.data, r.discovered);
      // First slot free? Put a new technique straight into the loadout.
      if (SkillTree.toggle(c, r.discovered)) text = T('tree.equipped');
      else text = T('tree.newTech');
    }
    this._save();
    Sound.play(n.type === 'minor' ? 'four' : 'fanfare');
    if (n.type === 'capstone' || n.type === 'keystone') Sound.play('crowdRoar');
    const p = TreeLayout.pos()[id], sp = this.toScreen(p.x, p.y), col = TreeUIColours.forId(id);
    Effects.sparks(sp.x, sp.y, 30, col, 900);
    Effects.ring(sp.x, sp.y, 180, col, 0.5, 12);
    this.flash = { text, t: 0, color: col };
    this._select(id);
  },
  _equip(techId) {
    const c = this.career;
    if (!SkillTree.toggle(c, techId)) { this.flash = { text: T('tree.slotsFull'), t: 0, color: '#ff9d7a' }; Sound.play('edge'); return; }
    this._save();
  },

  // ---- popups ----
  _openPoints() {
    this.popup = 'points';
    const b = this.popBtns, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    b.add('tree.close', cx - 200, 820, 400, 100, () => { this.popup = null; }, { size: 40, color: '#e9eef5' });
  },
  _openRespec() {
    const c = this.career, chk = SkillTree.canRespec(c, Save.data.currencies.coins || 0);
    if (!chk.ok && chk.reason !== 'coins') { this.flash = { text: T('tree.respec.' + chk.reason), t: 0, color: '#ff9d7a' }; Sound.play('edge'); return; }
    this.popup = 'respec';
    const b = this.popBtns, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    b.add('tree.respecYes', cx - 440, 760, 400, 110, () => this._respec(), { size: 44, color: '#ffb36b', disabled: () => !SkillTree.canRespec(c, Save.data.currencies.coins || 0).ok });
    b.add('tree.respecNo', cx + 40, 760, 400, 110, () => { this.popup = null; }, { size: 44, color: '#e9eef5' });
  },
  _respec() {
    const c = this.career, chk = SkillTree.canRespec(c, Save.data.currencies.coins || 0);
    if (!chk.ok) return;
    Save.data.currencies.coins -= SkillTree.respec(c);
    this._save();
    this.popup = null;
    this._select(null);
    Sound.play('fanfare');
    this.flash = { text: T('tree.respecDone'), t: 0, color: '#ffd23f' };
  },

  // ---- input ----
  _lists() { return this.popup ? [this.popBtns] : this.sel ? [this.cardBtns, this.hud] : [this.hud]; },
  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    for (const l of this._lists()) if (l.down(id, x, y)) return;
    if (this.popup) return;
    if (this.sel && x >= this._cardX() && y >= 120) return;          // taps on the card itself
    this.ptrs[id] = { x, y, sx: x, sy: y, moved: false };
    const ids = Object.keys(this.ptrs);
    if (ids.length === 2) {
      const a = this.ptrs[ids[0]], b = this.ptrs[ids[1]];
      a.moved = b.moved = true;
      this.pinch = { d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), zoom: this.cam.zoom };
    }
  },
  pointerMove(id, x, y) {
    if (Dev.pointerMove(id, x, y)) return;
    for (const l of this._lists()) l.move(id, x, y);
    const p = this.ptrs[id];
    if (!p) return;
    const dx = x - p.x, dy = y - p.y;
    p.x = x; p.y = y;
    if (Math.hypot(x - p.sx, y - p.sy) > 14) p.moved = true;
    const ids = Object.keys(this.ptrs);
    if (ids.length >= 2 && this.pinch) {
      const a = this.ptrs[ids[0]], b = this.ptrs[ids[1]];
      const d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this._zoomAt(mx, my, (this.pinch.zoom * d / this.pinch.d) / this.cam.zoom);
      this.cam.x -= dx / 2 / this.cam.zoom; this.cam.y -= dy / 2 / this.cam.zoom;   // two-finger drag pans too
      this._clampCam();
    } else if (p.moved) {
      this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom;
      this._clampCam();
    }
  },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    for (const l of this._lists()) if (l.up(id)) { delete this.ptrs[id]; return; }
    const p = this.ptrs[id];
    delete this.ptrs[id];
    if (Object.keys(this.ptrs).length < 2) this.pinch = null;
    if (!p || p.moved || this.popup) return;
    // A tap: the nearest node under the finger (generous when zoomed out).
    const hit = this.nodeAt(p.x, p.y);
    if (hit) { Sound.play('uiTap'); this._select(hit); }
    else if (this.sel) this._select(null);
  },
  nodeAt(sx, sy) {
    const w = this.toWorld(sx, sy), pos = TreeLayout.pos();
    let best = null, bd = Infinity;
    for (const [id, p] of Object.entries(pos)) {
      const d = Math.hypot(w.x - p.x, w.y - p.y);
      const reach = Math.max(p.r * 1.15, 48 / this.cam.zoom);        // at least ~96px across on screen
      if (d <= reach && d < bd) { bd = d; best = id; }
    }
    return best;
  },
  keyDown(code) {
    if (code === 'Escape') { if (this.popup) this.popup = null; else if (this.sel) this._select(null); else this._back(); }
    if (code === 'Equal' || code === 'NumpadAdd') this._zoomAt(CONFIG.LOGICAL_W / 2, 600, 1.2);
    if (code === 'Minus' || code === 'NumpadSubtract') this._zoomAt(CONFIG.LOGICAL_W / 2, 600, 1 / 1.2);
    const pan = 60 / this.cam.zoom;
    if (code === 'ArrowLeft' || code === 'KeyA') this.cam.x -= pan;
    if (code === 'ArrowRight' || code === 'KeyD') this.cam.x += pan;
    if (code === 'ArrowUp' || code === 'KeyW') this.cam.y -= pan;
    if (code === 'ArrowDown' || code === 'KeyS') this.cam.y += pan;
    this._clampCam();
  },

  update(dt) {
    this._t += dt;
    Effects.update(dt);
    if (this.flash) { this.flash.t += dt; if (this.flash.t > 2.2) this.flash = null; }
  },

  // ---------------------------------------------------------------- drawing
  render(ctx) {
    const c = this.career, v = Display.viewRect();
    TreeArt.background(ctx, v, true);
    if (!c) return;
    const vw = this._view();
    ctx.save();
    ctx.translate(vw.x + vw.w / 2 - this.cam.x * this.cam.zoom, vw.y + vw.h / 2 - this.cam.y * this.cam.zoom);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    this._drawTrunk(ctx);
    this._drawVines(ctx);
    this._drawNodes(ctx);
    this._drawTierLabels(ctx);
    ctx.restore();
    this._drawHud(ctx);
    if (this.sel) this._drawCard(ctx);
    Effects.drawParticles(ctx);
    if (this.popup) this._drawPopup(ctx);
    if (this.flash) {
      const f = this.flash, a = Math.min(1, (2.2 - f.t) / 0.4);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      R.text(f.text, CONFIG.LOGICAL_W / 2 - (this.sel ? 330 : 0), 190, 44, f.color);
      ctx.restore();
    }
  },

  // The painted tree (tree_bg) in tree space, so it pans and zooms with the
  // nodes. Branch emblems on the stumps; a label on each tier that isn't open yet.
  _drawTrunk(ctx) {
    const c = this.career, L = SKILL_TREE_DATA.layout;
    TreeArt.treeBackground(ctx, TreeLayout.bg());
    for (const b of SKILL_TREE_DATA.branches) {
      const e = TreeLayout.emblem(b), col = SKILL_TREE_DATA.colours[b], sz = L.emblemSize * L.bg.scale;
      TreeArt.draw(SKILL_TREE_DATA.art.branch[b], e.x, e.y, sz);
      R.roundRect(e.x - 120, e.y + sz * 0.5, 240, 46, 22, 'rgba(3,8,16,0.72)');
      R.text(T('tree.branch.' + b), e.x, e.y + sz * 0.5 + 24, 26, col);
    }
  },
  // Closed tiers say what opens them (drawn over the nodes, in open sky).
  _drawTierLabels(ctx) {
    const c = this.career;
    for (const b of SKILL_TREE_DATA.branches) {
      const col = SKILL_TREE_DATA.colours[b];
      for (let t = 2; t <= 4; t++) {
        if (SkillTree.tierOpen(c, b, t)) continue;
        const sp = TreeLayout.tierLabel(b, t), capped = t > SkillTree.roleCap(c, b);
        const txt = capped ? T('tree.tierCapped') : T('tree.tierOpensAt', { t, n: SKILL_TREE_DATA.tierGates[t - 1] });
        R.roundRect(sp.x - 170, sp.y - 22, 340, 44, 20, 'rgba(3,8,16,0.8)', col, 3);
        R.text(txt, sp.x, sp.y, 20, capped ? '#ff9d7a' : '#ffffff', 'center', false);
      }
    }
  },

  // Owned nodes glow in their branch colour (a soft breathing halo behind them).
  _drawVines(ctx) {
    const c = this.career, pos = TreeLayout.pos();
    ctx.save();
    for (const n of SKILL_TREE_DATA.nodes) {
      if (!SkillTree.owned(c, n.id)) continue;
      const p = pos[n.id], col = SKILL_TREE_DATA.colours[n.branch] || SKILL_TREE_DATA.colours.bails;
      const pulse = 0.65 + 0.35 * Math.sin(this._t * 3 + p.x * 0.01);
      ctx.globalAlpha = 0.3 * pulse; R.circle(p.x, p.y, p.r * 1.45, col);
      ctx.globalAlpha = 0.25 * pulse; R.circle(p.x, p.y, p.r * 1.2, '#ffffff');
    }
    ctx.restore();
  },

  // Ring frames (node_*) are drawn so the icon sits in the frame's hole
  // (TreeArt.frame); minor perks are whole badges.
  _drawNodes(ctx) {
    const c = this.career, pos = TreeLayout.pos(), A = SKILL_TREE_DATA.art, hole = SKILL_TREE_DATA.layout.hole;
    for (const n of SKILL_TREE_DATA.nodes) {
      const p = pos[n.id], st = SkillTree.state(c, n.id), col = SKILL_TREE_DATA.colours[n.branch];
      const d = p.r * 2, h = p.r * hole, sel = this.sel === n.id;
      ctx.save();
      if (st === 'available') {                          // glowing edge
        const pulse = 0.5 + 0.5 * Math.sin(this._t * 4);
        ctx.shadowColor = '#9be7ff'; ctx.shadowBlur = 20 + 20 * pulse;
      } else if (st === 'mastered') { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 26; }
      if (sel) R.circle(p.x, p.y, p.r + 16, null, '#ffffff', 6);
      const dim = st === 'locked' || st === 'excluded';
      let lockDrawn = false;
      if (n.type === 'minor') {
        TreeArt.draw(n.id, p.x, p.y, d, { alpha: dim ? 0.45 : 1 });
        ctx.shadowBlur = 0;
        if (st === 'available') R.circle(p.x, p.y, p.r + 3, null, '#9be7ff', 5);
        // rank pips
        const R0 = SkillTree.rank(c, n.id);
        for (let i = 0; i < SkillTree.ranks(n); i++) TreeArt.pip(p.x + (i - 1) * 26, p.y + p.r + 16, 20, i < R0, col);
      } else if (n.type === 'keystone') {
        const glow = ctx.shadowBlur; ctx.shadowBlur = 0;
        TreeArt.holeBack(p.x, p.y, h);
        TreeArt.draw(n.id, p.x, p.y, h * 1.04, { alpha: dim ? 0.4 : 1 });
        ctx.shadowBlur = glow;
        TreeArt.frame(A.node.keystone, p.x, p.y, h, { colour: st === 'unlocked' ? col : st === 'available' ? '#9be7ff' : '#56606b' });
        ctx.shadowBlur = 0;
      } else {
        const frame = st === 'mastered' ? A.node.mastered : st === 'unlocked' ? A.node.unlocked : st === 'available' ? A.node.available : A.node.locked;
        const glow = ctx.shadowBlur; ctx.shadowBlur = 0;
        TreeArt.holeBack(p.x, p.y, h);
        TreeArt.draw(TreeArt.iconOf(n.id), p.x, p.y, h * 1.02, { alpha: dim ? 0.4 : 1 });
        ctx.shadowBlur = glow;
        TreeArt.frame(frame, p.x, p.y, h, { colour: col });
        ctx.shadowBlur = 0;
        lockDrawn = st === 'locked' && TreeArt.hasArt(A.node.locked);   // the locked frame has its own padlock
        if (n.type === 'capstone') {
          R.roundRect(p.x - 150, p.y + p.r + 10, 300, 48, 22, 'rgba(3,8,16,0.72)');
          R.text(T('tree.capstone_legends_bails'), p.x, p.y + p.r + 34, 28, '#ffe28a');
        }
        if (dim && n.tech && SkillTree.discovered(Save.data, n.tech)) {
          R.roundRect(p.x - 70, p.y - p.r - 30, 140, 30, 14, 'rgba(20,30,40,0.9)', '#9aa4b5', 2);
          R.text(T('tree.discovered'), p.x, p.y - p.r - 15, 16, '#c9d0d6', 'center', false);
        }
        if (n.tech && SkillTree.owned(c, n.id) && SkillTree.equipped(c, n.tech)) R.circle(p.x + p.r * 0.72, p.y - p.r * 0.72, 14, '#9cff6a', CONFIG.COLOR.ink, 3);
      }
      if (dim && n.type !== 'minor' && !lockDrawn) this._lock(p.x, p.y, p.r * 0.34, st === 'excluded');
      ctx.restore();
    }
  },
  _lock(x, y, s, cross) {
    if (cross) { R.line(x - s, y - s, x + s, y + s, '#ff6b6b', s * 0.3); R.line(x + s, y - s, x - s, y + s, '#ff6b6b', s * 0.3); return; }
    const ctx = R.ctx;
    ctx.beginPath(); ctx.arc(x, y - s * 0.35, s * 0.55, Math.PI, 0); ctx.strokeStyle = '#d8dde2'; ctx.lineWidth = s * 0.22; ctx.stroke();
    R.roundRect(x - s * 0.8, y - s * 0.35, s * 1.6, s * 1.2, s * 0.2, '#d8dde2');
  },

  _drawHud(ctx) {
    const s = Display.safe, c = this.career, cx = CONFIG.LOGICAL_W / 2;
    const v = Display.viewRect();
    const g = ctx.createLinearGradient(0, v.y, 0, v.y + 150);
    g.addColorStop(0, 'rgba(3,8,16,0.95)'); g.addColorStop(1, 'rgba(3,8,16,0)');
    ctx.fillStyle = g; ctx.fillRect(v.x, v.y, v.w, 150);
    // points counter
    R.roundRect(s.left + 240, s.top + 16, 330, 96, 30, 'rgba(40,30,5,0.92)', '#ffd23f', 4);
    TreeArt.draw(SKILL_TREE_DATA.art.token, s.left + 292, s.top + 64, 70);
    R.text(String(c.player.skillTokens), s.left + 390, s.top + 62, 54, '#ffd23f');
    const free = Object.entries(c.player.tree.free).filter(([, n]) => n > 0);
    if (free.length) R.text(free.map(([b, n]) => '+' + n + ' ' + T('tree.branch.' + b)).join(' '), s.left + 500, s.top + 64, 18, '#ffffff', 'center', false);
    R.text(T('tree.title'), cx - 60, s.top + 48, 44, '#ffffff');
    R.text(T('tree.coins', { n: formatNumber(Save.data.currencies.coins || 0) }), cx - 60, s.top + 96, 20, '#ffe28a', 'center', false);
    if (!this.sel) { R.roundRect(cx - 290, s.bottom - 64, 580, 48, 22, 'rgba(3,8,16,0.75)'); R.text(T('tree.hint'), cx, s.bottom - 40, 22, '#b8c6d6', 'center', false); }
    const keep = this.hud.items;
    this.hud.items = keep.filter((b) => !b.invisible);
    this.hud.draw();
    this.hud.items = keep;
  },

  _drawCard(ctx) {
    const c = this.career, id = this.sel, n = SkillTree.node(id), x = this._cardX(), y = 130, w = 640, h = 890;
    const col = SKILL_TREE_DATA.colours[n.branch];
    R.panel(x, y, w, h, 'rgba(8,18,32,0.96)', col);
    TreeArt.draw(TreeArt.iconOf(id), x + 150, y + 120, 180);
    const r = SkillTree.rank(c, id), max = SkillTree.ranks(n);
    if (max > 1) R.text(T('tree.rank', { r, max }), x + 290, y + 120, 28, '#ffd23f', 'left');
    this._fit(TreeText.name(id), x + 40, y + 265, w - 80, 44, '#ffffff', true);
    const type = T('tree.type.' + n.type), branch = T('tree.branch.' + n.branch);
    this._fit(n.type === 'capstone' ? T('tree.cardLineTop', { type, branch }) : T('tree.cardLine', { type, branch, t: n.tier }), x + 40, y + 315, w - 80, 22, col);
    if (n.tech) {
      const t = SKILL_TREE_DATA.techniques[n.tech];
      const mode = t.kind === 'passive' ? T('tech.mode.passive') : t.mode === 'trigger' ? T('tech.mode.trigger', { n: t.charges }) : T('tech.mode.always');
      this._fit(mode, x + 40, y + 352, w - 80, 22, '#9be7ff');
    }
    // description (wrapped)
    this._wrap(TreeText.desc(id), x + 40, y + 420, w - 80, 30, '#e9eef5');
    // cost / status
    const chk = SkillTree.check(c, id), owned = r > 0;
    let yy = y + 580;
    if (r < max) R.text(T('tree.cost', { n: SkillTree.cost(n) }), x + 40, yy, 32, '#ffd23f', 'left');
    if (n.tech && owned) {
      yy += 50;
      R.text(T('tree.masteryLine', { level: T('tree.mastery.' + SkillTree.masteryLevel(c, n.tech)), n: c.player.tree.mastery[n.tech] || 0 }), x + 40, yy, 24, '#ffe28a', 'left', false);
      if (SkillTree.equipped(c, n.tech)) { yy += 44; R.text(T('tree.equipped'), x + 40, yy, 24, '#9cff6a', 'left', false); }
    }
    if (!chk.ok && chk.reason !== 'maxed' && !(owned && n.type !== 'minor')) {
      const why = chk.reason === 'pairTaken' ? T('tree.why.pairTaken', { other: TreeText.name(chk.params.other) }) : T('tree.why.' + chk.reason, chk.params);
      this._wrap(why, x + 40, y + 650, w - 80, 26, '#ff9d7a');
    } else if (chk.reason === 'maxed' && n.type === 'minor') R.text(T('tree.why.maxed'), x + 40, y + 670, 26, '#9cff6a', 'left', false);
    if (!owned && n.tech && SkillTree.discovered(Save.data, n.tech)) this._wrap(T('tree.discoveredNote'), x + 40, y + 715, w - 80, 22, '#c9d0d6');
    this.cardBtns.draw();
  },

  // One line of text, shrunk to fit a width.
  _fit(text, x, y, w, size, color, outline) {
    const ctx = R.ctx;
    ctx.font = `900 ${size}px ${CONFIG.FONT}`;
    const k = Math.min(1, w / Math.max(1, ctx.measureText(text).width));
    R.text(text, x, y, Math.floor(size * k), color, 'left', outline ? undefined : false);
  },

  _wrap(text, x, y, w, size, color) {
    const ctx = R.ctx;
    ctx.font = `700 ${size}px ${CONFIG.FONT}`;
    const words = String(text).split(' ');
    let line = '', yy = y;
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd;
      if (ctx.measureText(test).width > w && line) { R.text(line, x, yy, size, color, 'left', false); line = wd; yy += size * 1.3; }
      else line = test;
    }
    if (line) R.text(line, x, yy, size, color, 'left', false);
    return yy;
  },

  _drawPopup(ctx) {
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2, c = this.career, t = c.player.tree;
    ctx.fillStyle = 'rgba(3,10,20,0.82)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    R.panel(cx - 560, 170, 1120, 780, 'rgba(10,22,40,0.97)', '#ffd23f');
    if (this.popup === 'points') {
      TreeArt.draw(SKILL_TREE_DATA.art.token, cx - 330, 260, 110);
      R.text(T('tree.pointsTitle'), cx + 40, 260, 52, '#ffd23f');
      const rows = [
        [T('tree.src.level'), t.sources.level || 0], [T('tree.src.promotion'), t.sources.promotion || 0], [T('tree.src.rival'), t.sources.rival || 0],
      ];
      for (const [b, n] of Object.entries(t.free)) if (n + (t.freeUsed[b] || 0) > 0) rows.push([T('tree.src.free', { branch: T('tree.branch.' + b) }), n + (t.freeUsed[b] || 0)]);
      rows.push([T('tree.src.spent'), -(t.spent + Object.values(t.freeUsed).reduce((a, z) => a + z, 0))]);
      rows.push([T('tree.src.left'), c.player.skillTokens + Object.values(t.free).reduce((a, z) => a + z, 0)]);
      rows.forEach(([label, n], i) => {
        const y = 370 + i * 62, last = i === rows.length - 1;
        R.text(label, cx - 420, y, 32, last ? '#ffd23f' : '#ffffff', 'left', false);
        R.text((n > 0 && i < rows.length - 1 ? '+' : '') + n, cx + 420, y, 36, last ? '#ffd23f' : n < 0 ? '#ff9d9d' : '#9cff6a', 'right');
      });
      R.text(T('tree.pointsNote'), cx, 790, 22, '#b8c6d6', 'center', false);
    } else if (this.popup === 'respec') {
      TreeArt.draw(SKILL_TREE_DATA.art.respec, cx, 300, 140);
      R.text(T('tree.respecTitle'), cx, 420, 54, '#ffffff');
      this._wrap(T('tree.respecBody'), cx - 480, 510, 960, 30, '#d8e4f0');
      const coins = Save.data.currencies.coins || 0, cost = SkillTree.respecCost(c);
      R.text(T('tree.respecCost', { n: cost, have: coins }), cx, 660, 32, coins >= cost ? '#ffe28a' : '#ff9d7a');
    }
    this.popBtns.draw();
  },
};

// =====================================================================================
const CareerLoadoutScene = {
  career: null, slot: 1,
  buttons: new ButtonList(),
  cards: [],               // { id, x, y, w, h }
  msg: null,

  enter(params) {
    CareerAssets.ensure();
    this.slot = params.slot || this.slot;
    this.career = params.career || this.career;
    this.from = params.from || 'home';
    this.back = params.back || 'home';
    this.msg = null;
    SkillTree.ensure(this.career);
    this._layout();
  },

  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    b.add('loadout.done', s.right - 330, s.bottom - 140, 300, 110, () => this._done(), { size: 44, color: '#9cff6a' });
    b.add('loadout.toTree', s.left + 30, s.bottom - 140, 360, 110, () => Scenes.go('careertree', { slot: this.slot, career: this.career, from: this.back === 'prematch' ? 'prematch' : 'home' }), { size: 34, color: '#ffd23f' });
    // every unlocked technique as a card
    const techs = SkillTree.unlockedTechs(this.career);
    this.cards = techs.map((id, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      return { id, x: cx - 900 + col * 455, y: 360 + row * 150, w: 435, h: 136 };
    });
  },
  _done() {
    CareerSave.save(this.career, this.slot);
    if (this.from === 'tree') Scenes.go('careertree', { slot: this.slot, career: this.career, from: this.back === 'prematch' ? 'prematch' : 'home' });
    else if (this.from === 'prematch') { CareerMatch.refreshPlayer(); Scenes.go('careerprematch'); }
    else Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true });
  },

  _tapCard(x, y) {
    const card = this.cards.find((k) => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h);
    if (!card) return false;
    if (SkillTree.toggle(this.career, card.id)) { Sound.play('uiTap'); this.msg = null; }
    else { Sound.play('edge'); this.msg = T('tree.slotsFull'); }
    return true;
  },

  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); if (!this.buttons.down(id, x, y)) this._downAt = { id, x, y }; },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this.buttons.up(id)) return;
    if (this._downAt && this._downAt.id === id) this._tapCard(this._downAt.x, this._downAt.y);
    this._downAt = null;
  },
  keyDown(code) { if (code === 'Escape' || code === 'Enter') this._done(); },
  update() {},

  render(ctx) {
    const c = this.career, cx = CONFIG.LOGICAL_W / 2, s = Display.safe;
    TreeArt.background(ctx, Display.viewRect());
    R.text(T('loadout.title'), cx, s.top + 60, 56, '#ffffff');
    const lo = SkillTree.loadout(c), L = SKILL_TREE_DATA.loadout;
    // the four slots
    const slot = (list, max, x, label, colour) => {
      R.text(T(label, { n: list.length, max }), x + 380, 150, 28, colour);
      for (let i = 0; i < max; i++) {
        const id = list[i], sx = x + i * 390;
        R.panel(sx, 180, 370, 130, id ? 'rgba(20,40,30,0.95)' : 'rgba(10,22,40,0.8)', id ? colour : 'rgba(255,255,255,0.25)');
        if (id) {
          TreeArt.draw(SKILL_TREE_DATA.techniques[id].icon, sx + 70, 245, 100);
          CareerTreeScene._fit(TreeText.name(id), sx + 130, 245, 225, 22, '#ffffff');
        } else R.text(T('loadout.empty'), sx + 185, 245, 26, '#8a96a3', 'center', false);
      }
    };
    slot(lo.active, L.active, cx - 900, 'loadout.active', '#9be7ff');
    slot(lo.passive, L.passive, cx + 120, 'loadout.passive', '#9cff6a');
    if (!this.cards.length) R.text(T('loadout.none'), cx, 520, 34, '#d8e4f0');
    else R.text(this.msg || T('loadout.tapHint'), cx, 335, 24, this.msg ? '#ff9d7a' : '#b8c6d6', 'center', false);
    for (const k of this.cards) {
      const t = SKILL_TREE_DATA.techniques[k.id], on = SkillTree.equipped(c, k.id);
      const offRole = t.kind === 'bowl' && !Career.bowls(c);
      R.panel(k.x, k.y, k.w, k.h, on ? 'rgba(30,60,30,0.96)' : 'rgba(10,22,40,0.92)', on ? '#9cff6a' : TreeUIColours.forId(k.id));
      TreeArt.draw(t.icon, k.x + 66, k.y + k.h / 2, 106, { alpha: offRole ? 0.5 : 1 });
      CareerTreeScene._fit(TreeText.name(k.id), k.x + 130, k.y + 34, k.w - 180, 22, '#ffffff');
      const mode = t.kind === 'passive' ? T('tech.mode.passive') : T('tech.kind.' + t.kind) + ' · ' + (t.mode === 'trigger' ? T('tech.mode.trigger', { n: t.charges }) : T('tech.mode.always'));
      CareerTreeScene._fit(offRole ? T('loadout.notYourRole') : mode, k.x + 130, k.y + 68, k.w - 150, 16, offRole ? '#ff9d7a' : '#9be7ff');
      R.text(T('tree.mastery.' + SkillTree.masteryLevel(c, k.id)), k.x + 130, k.y + 100, 16, '#ffe28a', 'left', false);
      if (on) R.circle(k.x + k.w - 30, k.y + 30, 16, '#9cff6a', CONFIG.COLOR.ink, 3);
    }
    this.buttons.draw();
  },
};
