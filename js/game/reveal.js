// Cricket Legends (M19, plan 5.30, 6.4, 32) - the Reward Reveal: one shared overlay for new gear,
// evolutions, techniques, coaches, recruits, trophies and secrets. It opens over the current screen
// (Scenes.openOverlay), shows the reward in its rarity colours with code-drawn rays and sparks, and
// gives Legendary / Mythic rewards a "rare" haptic pulse. The first reveal must be watched for a
// moment; after that a tap skips at once. Several rewards queue and show one after another.
//   Reveal.show({ item: id } | { tech: id } | { coach: id } | { art, name, sub, rarity }, title?)

const Reveal = {
  queue: [], cur: null, t: 0,

  show(r) {
    if (!r) return;
    this.queue.push(r);
    if (!this.cur) this._next();
  },
  _next() {
    this.cur = this.queue.shift() || null;
    this.t = 0;
    if (!this.cur) { if (Scenes.overlay === this) Scenes.closeOverlay(); return; }
    const rar = this._rarity(this.cur);
    if (REVEAL_DATA.rarePulse.includes(rar) && typeof Platform !== 'undefined') Platform.haptic('rare');
    if (typeof Sound !== 'undefined') Sound.play(REVEAL_DATA.rarePulse.includes(rar) ? 'fanfare' : 'ui_currency');
    if (Scenes.overlay !== this) Scenes.openOverlay(this);
  },
  _rarity(r) {
    if (r.item && typeof Gear !== 'undefined' && Gear.item(r.item)) return Gear.item(r.item).rarity;
    return r.rarity || 'rare';
  },
  // How long before a tap closes it: longer the very first time (plan: skippable after the first).
  _minShow() {
    const seen = typeof Save !== 'undefined' && Save.data && Save.data.flags && Save.data.flags.revealSeen;
    return seen ? REVEAL_DATA.minShow : REVEAL_DATA.firstMinShow;
  },
  _close() {
    if (this.t < this._minShow()) return;
    if (typeof Save !== 'undefined' && Save.data) { Save.data.flags = Save.data.flags || {}; Save.data.flags.revealSeen = 1; }
    this._next();
  },

  // ---- overlay hooks (Scenes.openOverlay) ----
  enter() {},
  update(dt) { this.t += dt; },
  pointerDown() {},
  pointerMove() {},
  pointerUp() { this._close(); },
  keyDown(code) { if (code === 'Escape' || code === 'Enter' || code === 'Space') this._close(); },

  render(ctx) {
    const r = this.cur;
    if (!r) return;
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2, cy = 470, t = this.t;
    const rar = this._rarity(r), col = (typeof EQUIPMENT_DATA !== 'undefined' && EQUIPMENT_DATA.rarities[rar] && EQUIPMENT_DATA.rarities[rar].colour) || '#ffd23f';
    const k = Math.min(1, t / REVEAL_DATA.grow), ease = 1 - Math.pow(1 - k, 3);
    ctx.save();
    ctx.fillStyle = 'rgba(4,8,18,' + (0.82 * Math.min(1, t * 4)) + ')';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    // rays (Legendary and Mythic get more and they turn)
    const rays = REVEAL_DATA.rays[rar] || 8, spin = t * 0.4;
    ctx.globalAlpha = 0.35 * ease;
    for (let i = 0; i < rays; i++) {
      const a = spin + (i / rays) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 620, a - 0.07, a + 0.07); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
    }
    ctx.globalAlpha = 1;
    R.circle(cx, cy, 250 * ease, col + '33', col, 6);
    // the reward
    if (r.item && typeof GearUI !== 'undefined' && Gear.item(r.item)) {
      const it = Gear.item(r.item);
      GearUI.card(it, cx - 150 * ease, cy - 200 * ease, 300 * ease);
    } else {
      const art = r.art || (r.coach && typeof Coaches !== 'undefined' && Coaches.coach(r.coach) ? Coaches.coach(r.coach).art : null)
        || (r.tech && SKILL_TREE_DATA.techniques[r.tech] ? SKILL_TREE_DATA.techniques[r.tech].icon : null);
      if (!art || !Sprites.ui(art, cx, cy, 320 * ease, 320 * ease)) R.circle(cx, cy, 120 * ease, col, '#ffffff', 6);
    }
    R.text(T(r.title || 'reveal.title.' + (r.item ? 'item' : r.tech ? 'tech' : r.coach ? 'coach' : 'other')), cx, 130, 64, col);
    const name = r.name || (r.item ? T('gear.' + r.item) : r.tech ? T('tech.' + r.tech) : r.coach ? T('coach.' + r.coach) : '');
    if (name) R.text(name, cx, 790, 52, '#ffffff');
    R.text(r.sub || T('gear.rarity.' + rar), cx, 850, 30, col, 'center', false);
    if (t >= this._minShow()) R.text(T('reveal.tap'), cx, 980, 26, 'rgba(255,255,255,0.7)', 'center', false);
    ctx.restore();
  },
};
