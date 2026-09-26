// Cricket Arcade — gear screens (M07, plan 5.10, 5.5E, 5.26).
//   CareerGearScene   Equipment: the 6 slots, your Locker items for a slot, and a
//                     compare card (now vs new: green / red stat changes, perks,
//                     set bonuses). Tap an item, then EQUIP.
//   CareerShopScene   the Equipment Shop: a fixed catalogue opened by career tier,
//                     Coin prices, owned state. No refreshes, no random pulls.
//   CollectionScene   the Collection Book: every item (owned in colour, the rest
//                     as silhouettes with a hint), and discovered techniques.
// Every picture goes through a sprite id (the 'equipment' asset group).

const GearUI = {
  _sil: {},
  // A dark cut-out of an item's art (Collection: not found yet).
  silhouette(id) {
    if (this._sil[id]) return this._sil[id];
    const art = Sprites.images[id];
    if (!art || typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = art.img.width; cv.height = art.img.height;
    cv._artId = id;
    const g = cv.getContext('2d');
    g.drawImage(art.img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#2a3b5c';
    g.fillRect(0, 0, cv.width, cv.height);
    return (this._sil[id] = cv);
  },
  // The item's picture fitted in a size x size box.
  art(it, cx, cy, size, o) {
    const opts = o || {};
    if (opts.silhouette) {
      const cv = this.silhouette(it.art);
      if (cv) {
        const k = Math.min(size / cv.width, size / cv.height);
        R.ctx.drawImage(cv, cx - cv.width * k / 2, cy - cv.height * k / 2, cv.width * k, cv.height * k);
        return;
      }
    }
    if (Sprites.ui(it.art, cx, cy, size, size, opts)) return;
    // placeholder: the slot's shape in the rarity colour
    const col = Gear.rarity(it).colour;
    R.roundRect(cx - size * 0.3, cy - size * 0.36, size * 0.6, size * 0.72, size * 0.1, opts.silhouette ? '#16223a' : col + '55', col, 3);
    R.text(T('gear.slot.' + it.slot).slice(0, 3), cx, cy, size * 0.2, '#ffffff');
  },
  // The item in its rarity frame (or the Signature frame), fitted in a w x h box.
  framed(it, cx, cy, w, h, o) {
    const opts = o || {}, fr = Gear.frame(it);
    if (!opts.silhouette) R.circle(cx, cy, Math.min(w, h) * 0.34, Gear.rarity(it).colour + '26');
    this.art(it, cx, cy, Math.min(w, h) * 0.66, opts);
    if (!Sprites.ui(fr, cx, cy, w, h, { alpha: opts.silhouette ? 0.45 : 1 })) R.roundRect(cx - w * 0.42, cy - h * 0.46, w * 0.84, h * 0.92, 14, null, Gear.rarity(it).colour, 5);
  },
  rarityText(it) { return it.signature ? T('gear.rarity.' + it.rarity) + ' · ' + T('gear.signature') : T('gear.rarity.' + it.rarity); },
  statLine(stats) { return Object.entries(stats || {}).map(([k, v]) => '+' + v + ' ' + T('stat.' + k)).join('  '); },
  perkName(id) { return T('gear.perk.' + id); },
  perkDesc(id) { return T('gear.perk.' + id + '.desc'); },
  // One threshold of a set as text: "+3 Power · Big Hitter".
  thresholdText(set, t) {
    const S = EQUIPMENT_DATA.sets[set][t], parts = [];
    if (S.stats) parts.push(this.statLine(S.stats));
    if (S.perk) parts.push(EQUIPMENT_DATA.setPerks[S.perk] ? T('gear.perk.' + S.perk) + ': ' + this.perkDesc(S.perk) : this.perkName(S.perk));
    return parts.join(' · ');
  },

  // The item card (ui/panels/equipment_item_card.png as the card, its inside
  // redrawn for this item). w wide; h = w x the card's shape. o: { label, dim, locked }
  CARD: { w: 328, h: 438, inner: [22, 14, 288, 410], badge: [258, 2, 66, 68] },
  card(it, x, y, w, o) {
    const opts = o || {}, C = this.CARD, k = w / C.w, h = C.h * k, ctx = R.ctx, col = Gear.rarity(it).colour;
    const art = Sprites.images.panel_item_card;
    if (art) ctx.drawImage(art.img, x, y, w, h);
    else R.roundRect(x, y, w, h, 18 * k, '#2a1650', '#e8b21c', 6 * k);
    // the inside: rarity-tinted, then the item in its frame
    const ix = x + C.inner[0] * k, iy = y + C.inner[1] * k, iw = C.inner[2] * k, ih = C.inner[3] * k;
    const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
    g.addColorStop(0, col + '66'); g.addColorStop(0.45, '#1b0d3c'); g.addColorStop(1, '#120830');
    R.roundRect(ix, iy, iw, ih, 16 * k, '#120830');
    R.roundRect(ix, iy, iw, ih, 16 * k, g);
    if (art) ctx.drawImage(art.img, C.badge[0], C.badge[1], C.badge[2], C.badge[3], x + C.badge[0] * k, y + C.badge[1] * k, C.badge[2] * k, C.badge[3] * k);
    this.framed(it, x + w / 2, iy + 120 * k, 220 * k, 210 * k, { alpha: opts.dim ? 0.5 : 1 });
    // rarity pill
    R.roundRect(ix + 8 * k, iy + 10 * k, 118 * k, 34 * k, 16 * k, col, CONFIG.COLOR.ink, 3 * k);
    CareerTreeScene._fit(T('gear.rarity.' + it.rarity), ix + 16 * k, iy + 27 * k, 102 * k, 18 * k, CONFIG.COLOR.ink);
    if (it.signature) { R.roundRect(ix + 8 * k, iy + 48 * k, 118 * k, 26 * k, 12 * k, '#1b1b1b', '#ffd23f', 2 * k); CareerTreeScene._fit(T('gear.signature'), ix + 16 * k, iy + 61 * k, 102 * k, 14 * k, '#ffd23f'); }
    // name and what it is
    const nm = T('gear.' + it.id);
    ctx.font = `900 ${Math.round(30 * k)}px ${CONFIG.FONT}`;
    const sz = Math.floor(30 * k * Math.min(1, (iw - 20 * k) / Math.max(1, ctx.measureText(nm).width)));
    R.text(nm, x + w / 2, iy + 262 * k, sz, '#ffffff');
    const sub = it.set ? T('gear.setName.' + it.set) + ' · ' + T('gear.slot.' + it.slot) : T('gear.slot.' + it.slot);
    R.text(sub, x + w / 2, iy + 294 * k, Math.round(18 * k), it.set ? EQUIPMENT_DATA.sets[it.set].colour : '#c9b8ff', 'center', false);
    // stats (or "kit only")
    const lines = Gear.cosmetic(it) ? [T('gear.cosmeticShort')] : Object.entries(it.stats).map(([s, v]) => '+' + v + ' ' + T('stat.' + s));
    lines.slice(0, 3).forEach((l, i) => R.text(l, x + w / 2, iy + (326 + i * 26) * k, Math.round(20 * k), '#e9eef5', 'center', false));
    if (it.perk) CareerTreeScene._fit('★ ' + this.perkName(it.perk), ix + 14 * k, iy + 398 * k, iw - 28 * k, 18 * k, '#ffe28a');
    if (opts.label) {
      R.roundRect(x + w / 2 - 70 * k, y - 20 * k, 140 * k, 40 * k, 18 * k, opts.labelColour || '#e9eef5', CONFIG.COLOR.ink, 3 * k);
      R.text(opts.label, x + w / 2, y, Math.round(22 * k), CONFIG.COLOR.ink, 'center', false);
    }
    if (opts.locked) {
      ctx.save(); ctx.globalAlpha = 0.55; R.roundRect(ix, iy, iw, ih, 16 * k, '#000000'); ctx.restore();
      R.text(opts.locked, x + w / 2, y + h / 2, Math.round(30 * k), '#ff9d7a');
    }
    return h;
  },
  coins(x, y, align) {
    const n = formatNumber((Save.data.currencies && Save.data.currencies.coins) || 0);
    const w = 80 + String(n).length * 26;
    const x0 = align === 'right' ? x - w : x;
    R.roundRect(x0, y, w, 70, 32, 'rgba(40,30,5,0.92)', '#ffd23f', 4);
    if (!Sprites.ui('econ_coin', x0 + 38, y + 35, 54, 54)) R.circle(x0 + 38, y + 35, 24, '#ffcf33', '#8a5a00', 4);
    R.text(n, x0 + 74, y + 36, 38, '#ffd23f', 'left');
  },
  // Word-wrapped text; returns the y of the last line.
  wrap(text, x, y, w, size, color) { return CareerTreeScene._wrap(text, x, y, w, size, color); },
};

// =====================================================================================
const CareerGearScene = {
  career: null, slot: 1,
  sel: 'bat',               // the slot being looked at
  pick: null,               // the item picked in the Locker list (compare card)
  page: 0,
  flash: null,
  _t: 0,
  buttons: new ButtonList(),
  tiles: [], cards: [],

  enter(params) {
    CareerAssets.ensure(); GearAssets.ensure();
    this.slot = params.slot || this.slot;
    this.career = params.career || this.career;
    Gear.ensureCareer(this.career);
    this.flash = null; this._t = 0;
    this._select(params.focus || this.sel || 'bat', params.pick);
  },

  _owned(slot) {
    const S = Save.data, O = EQUIPMENT_DATA.rarityOrder;
    return Gear.items(slot).filter((it) => Gear.owns(S, it.id))
      .sort((a, z) => a.tier - z.tier || O.indexOf(a.rarity) - O.indexOf(z.rarity) || (a.id < z.id ? -1 : 1));
  },
  PER_PAGE: 12,
  _select(slot, pick) {
    this.sel = slot;
    const list = this._owned(slot), worn = Gear.equipped(this.career)[slot];
    this.pick = pick && list.some((it) => it.id === pick) ? pick : worn;
    const i = list.findIndex((it) => it.id === this.pick);
    this.page = Math.max(0, Math.floor(i / this.PER_PAGE));
    this._layout();
  },
  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2, c = this.career;
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => this._back(), { size: 32, color: '#e9eef5' });
    b.add('gear.shop', s.right - 560, s.top + 16, 260, 96, () => Scenes.go('careershop', { slot: this.slot, career: c, from: 'gear' }), { size: 32, color: '#ffd23f', icon: 'shop_sign' });
    b.add('gear.collection', s.right - 290, s.top + 16, 270, 96, () => Scenes.go('collection', { back: 'careergear', slot: this.slot, career: c }), { size: 21, color: '#9be7ff', icon: 'icon_collection' });
    // the 6 slots (left)
    this.tiles = EQUIPMENT_DATA.slots.map((sl, i) => ({ slot: sl, x: s.left + 24 + (i % 2) * 262, y: 140 + Math.floor(i / 2) * 300, w: 250, h: 286 }));
    // the Locker list for the slot (middle)
    const list = this._owned(this.sel), x0 = cx - 390;
    this.cards = list.slice(this.page * this.PER_PAGE, (this.page + 1) * this.PER_PAGE).map((it, i) => ({ id: it.id, x: x0 + (i % 4) * 158, y: 200 + Math.floor(i / 4) * 196, w: 148, h: 186 }));
    const pages = Math.ceil(list.length / this.PER_PAGE);
    if (pages > 1) {
      b.add(() => '‹', x0, 800, 110, 90, () => { this.page = (this.page + pages - 1) % pages; this._layout(); }, { size: 50, color: '#e9eef5' });
      b.add(() => '›', x0 + 520, 800, 110, 90, () => { this.page = (this.page + 1) % pages; this._layout(); }, { size: 50, color: '#e9eef5' });
    }
    // equip (right)
    const rx = this._rx();
    b.add(() => this._equipLabel(), rx + 40, s.bottom - 132, 560, 112, () => this._equip(), { size: 44, color: '#9cff6a', disabled: () => !this._canEquip() }).tag = 'equip';
  },
  _rx() { return Math.min(Display.safe.right, CONFIG.LOGICAL_W + 60) - 660; },
  _canEquip() {
    if (!this.pick) return false;
    return Gear.equipped(this.career)[this.sel] !== this.pick && Gear.canEquip(this.career, Save.data, this.pick).ok;
  },
  _equipLabel() {
    if (this.pick && Gear.equipped(this.career)[this.sel] === this.pick) return T('gear.wearing');
    const chk = this.pick ? Gear.canEquip(this.career, Save.data, this.pick) : { ok: false };
    return chk.ok ? T('gear.equip') : chk.reason === 'tier' ? T('gear.needsStage', chk.params) : T('gear.equip');
  },
  _equip() {
    const c = this.career, before = Career.overall(c), r = Gear.equip(c, Save.data, this.pick);
    if (!r.ok) { Sound.play('ui_error'); return; }
    CareerSave.save(c, this.slot);
    Sound.play('fanfare');
    const t = this.tiles.find((k) => k.slot === this.sel), col = Gear.rarity(Gear.item(this.pick)).colour;
    Effects.sparks(t.x + t.w / 2, t.y + t.h / 2, 28, col, 900);
    Effects.ring(t.x + t.w / 2, t.y + t.h / 2, 160, col, 0.5, 10);
    const after = Career.overall(c);
    this.flash = { text: after !== before ? T('gear.ovrChange', { a: before, b: after }) : T('gear.equippedFlash'), t: 0 };
  },
  _back() { Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true }); },

  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); if (!this.buttons.down(id, x, y)) this._down = { id, x, y }; },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this.buttons.up(id)) return;
    const d = this._down; this._down = null;
    if (!d || d.id !== id) return;
    const t = this.tiles.find((k) => CareerScene.inBox(k, d.x, d.y));
    if (t) { Sound.play('uiTap'); this._select(t.slot); return; }
    const k = this.cards.find((q) => CareerScene.inBox(q, d.x, d.y));
    if (k) { Sound.play('uiTap'); this.pick = k.id; }
  },
  keyDown(code) {
    if (code === 'Escape') this._back();
    if (code === 'Enter' && this._canEquip()) this._equip();
  },
  update(dt) { this._t += dt; Effects.update(dt); if (this.flash) { this.flash.t += dt; if (this.flash.t > 2.4) this.flash = null; } },

  render(ctx) {
    const c = this.career, s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    CareerUI.bg(ctx, 'bg_locker_room', 0.55);
    if (!c) return;
    R.text(T('gear.title'), cx - 120, s.top + 50, 52, '#ffffff');
    R.text(T('gear.subtitle', { ovr: Career.overall(c), t: Gear.tier(c) }), cx - 120, s.top + 98, 22, '#ffe28a', 'center', false);
    GearUI.coins(s.right - 580, s.top + 29, 'right');
    const worn = Gear.equipped(c), counts = Gear.setCounts(worn);
    // ---- the slots ----
    for (const t of this.tiles) {
      const on = t.slot === this.sel, it = Gear.item(worn[t.slot]);
      R.panel(t.x, t.y, t.w, t.h, on ? 'rgba(30,50,80,0.96)' : 'rgba(10,22,40,0.9)', on ? '#ffd23f' : 'rgba(255,255,255,0.3)');
      if (it) GearUI.framed(it, t.x + t.w / 2, t.y + 120, 190, 190);
      Sprites.ui(EQUIPMENT_DATA.slotArt[t.slot], t.x + 38, t.y + 36, 64, 64);
      R.text(T('gear.slot.' + t.slot), t.x + t.w / 2 + 20, t.y + 26, 22, on ? '#ffd23f' : '#d8e4f0', 'center', false);
      if (it) CareerTreeScene._fit(T('gear.' + it.id), t.x + 14, t.y + t.h - 42, t.w - 28, 20, '#ffffff');
      if (it && it.set) R.text(T('gear.setCount', { n: counts[it.set] || 0, max: Gear.setSize(it.set) }), t.x + t.w / 2, t.y + t.h - 16, 16, EQUIPMENT_DATA.sets[it.set].colour, 'center', false);
    }
    // ---- the Locker list ----
    const x0 = cx - 390, list = this._owned(this.sel), all = Gear.items(this.sel).length;
    R.text(T('gear.lockerTitle', { slot: T('gear.slot.' + this.sel), n: list.length, all }), x0 + 310, 160, 28, '#ffffff');
    for (const k of this.cards) {
      const it = Gear.item(k.id), on = worn[this.sel] === k.id, picked = this.pick === k.id;
      const ok = Gear.canEquip(c, Save.data, k.id).ok;
      R.panel(k.x, k.y, k.w, k.h, picked ? 'rgba(40,60,90,0.97)' : 'rgba(10,22,40,0.9)', picked ? '#ffffff' : Gear.rarity(it).colour);
      GearUI.framed(it, k.x + k.w / 2, k.y + 76, 124, 124, { alpha: ok ? 1 : 0.4 });
      CareerTreeScene._fit(T('gear.' + it.id), k.x + 8, k.y + k.h - 36, k.w - 16, 16, ok ? '#ffffff' : '#8a96a3');
      if (on) R.roundRect(k.x + 6, k.y + 6, 70, 26, 12, '#9cff6a', CONFIG.COLOR.ink, 2), R.text(T('gear.on'), k.x + 41, k.y + 19, 15, CONFIG.COLOR.ink, 'center', false);
      if (!ok) R.text(T('gear.needsStage', { t: it.tier }), k.x + k.w / 2, k.y + k.h - 14, 15, '#ff9d7a', 'center', false);
    }
    if (list.length <= 1) GearUI.wrap(T('gear.lockerHint'), x0 + 10, 620, 620, 22, '#b8c6d6');
    // gear totals
    const bonus = Gear.statBonus(c), line = Object.entries(bonus).filter(([, v]) => v).map(([k, v]) => '+' + v + ' ' + T('stat.' + k)).join(' · ');
    R.panel(x0, 910, 630, s.bottom - 930, 'rgba(10,22,40,0.88)');
    R.text(T('gear.totals'), x0 + 20, 938, 20, '#ffd23f', 'left', false);
    GearUI.wrap(line || T('gear.noBonus'), x0 + 20, 972, 590, 19, '#e9eef5');
    // ---- the compare card ----
    this._drawCompare(ctx);
    this.buttons.draw();
    Effects.drawParticles(ctx);
    if (this.flash) {
      const a = Math.max(0, Math.min(1, (2.4 - this.flash.t) / 0.4));
      ctx.save(); ctx.globalAlpha = a; R.text(this.flash.text, cx - 70, 150 - Math.min(20, this.flash.t * 40), 40, '#9cff6a'); ctx.restore();
    }
  },

  _drawCompare(ctx) {
    const c = this.career, rx = this._rx(), top = 130, worn = Gear.equipped(c);
    if (!this.pick) return;
    const it = Gear.item(this.pick), cur = Gear.item(worn[this.sel]), same = cur && cur.id === it.id;
    R.panel(rx, top, 640, Display.safe.bottom - top - 150, 'rgba(8,16,30,0.94)', Gear.rarity(it).colour);
    const cw = 250;
    if (same) GearUI.card(it, rx + 195, top + 28, cw, { label: T('gear.nowLabel'), labelColour: '#9cff6a' });
    else {
      if (cur) GearUI.card(cur, rx + 50, top + 28, cw, { label: T('gear.nowLabel') });
      R.text('›', rx + 320, top + 190, 60, '#ffd23f');
      GearUI.card(it, rx + 340, top + 28, cw, { label: T('gear.newLabel'), labelColour: '#ffd23f' });
    }
    let y = top + 380;
    const chk = Gear.canEquip(c, Save.data, it.id);
    if (Gear.cosmetic(it)) {
      y = GearUI.wrap(T('gear.cosmetic'), rx + 30, y, 580, 22, '#9be7ff') + 34;
    } else if (!same) {
      const cmp = Gear.compare(c, it.id), diffs = Object.entries(cmp.stats);
      if (!diffs.length) { R.text(T('gear.noChange'), rx + 30, y, 24, '#b8c6d6', 'left', false); y += 36; }
      diffs.forEach(([k, d], i) => {
        const col = i % 2, row = Math.floor(i / 2);
        R.text((d > 0 ? '+' : '') + d + ' ' + T('stat.' + k), rx + 30 + col * 300, y + row * 34, 24, d > 0 ? '#9cff6a' : '#ff7a7a', 'left', false);
      });
      y += Math.ceil(diffs.length / 2) * 34 + 6;
    } else {
      R.text(T('gear.wearingNow'), rx + 30, y, 24, '#9cff6a', 'left', false); y += 36;
    }
    // perk
    if (it.perk) { y = GearUI.wrap('★ ' + GearUI.perkName(it.perk) + ': ' + GearUI.perkDesc(it.perk), rx + 30, y, 580, 20, '#ffe28a') + 30; }
    // set bonus lines
    if (it.set) {
      const S = EQUIPMENT_DATA.sets[it.set], next = Object.assign({}, worn, { [it.slot]: it.id });
      const have = Gear.setCounts(next)[it.set] || 0, size = Gear.setSize(it.set);
      R.text(T('gear.setTitle', { name: T('gear.setName.' + it.set), n: have, max: size }), rx + 30, y, 22, S.colour, 'left'); y += 32;
      for (const t of Gear.thresholds(it.set)) {
        const on = have >= t, label = t >= size ? T('gear.setFull') : T('gear.setPieces', { n: t });
        y = GearUI.wrap((on ? '✓ ' : '○ ') + label + ': ' + GearUI.thresholdText(it.set, t), rx + 30, y, 580, 18, on ? '#9cff6a' : '#8a96a3') + 26;
      }
    }
    if (!chk.ok && chk.reason === 'tier') R.text(T('gear.why.tier', chk.params), rx + 320, Display.safe.bottom - 158, 22, '#ff9d7a');
    // where it came from
    const L = Save.data.locker && Save.data.locker[it.id];
    if (L) R.text(T('gear.gotFrom', { src: T('gear.src.' + L.src) }), rx + 320, Math.min(y + 6, Display.safe.bottom - 190), 16, '#8a96a3', 'center', false);
  },
};

// =====================================================================================
const CareerShopScene = {
  career: null, slot: 1, from: 'home',
  tab: 'all', page: 0, pick: null, flash: null, justBought: null, _t: 0,
  buttons: new ButtonList(),
  cards: [],
  TABS: ['all', 'bat', 'gloves', 'pads', 'shoes', 'accessory', 'uniform'],
  PER_PAGE: 10,

  enter(params) {
    CareerAssets.ensure(); GearAssets.ensure();
    this.slot = params.slot || this.slot;
    this.career = params.career || this.career;
    this.from = params.from || 'home';
    Gear.ensureCareer(this.career);
    this.flash = null; this.justBought = null; this._t = 0;
    this.page = 0;
    const list = this._list();
    this.pick = (list.find((it) => Gear.canBuy(this.career, Save.data, it.id).reason !== 'owned' && it.tier <= Gear.tier(this.career)) || list[0] || {}).id || null;
    this._layout();
  },
  _list() { return Gear.catalogue().filter((it) => this.tab === 'all' || it.slot === this.tab); },
  _layout() {
    const b = this.buttons, s = Display.safe, c = this.career, x0 = this._gx();
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => this._back(), { size: 32, color: '#e9eef5' });
    b.add('shop.toGear', s.left + 236, s.top + 16, 300, 96, () => Scenes.go('careergear', { slot: this.slot, career: c }), { size: 30, color: '#9be7ff', icon: 'slot_bat' });
    this.TABS.forEach((t, i) => b.add(() => T(t === 'all' ? 'shop.tab.all' : 'gear.slot.' + t), x0 + i * 147, 140, 140, 88, () => { this.tab = t; this.page = 0; this._layout(); }, {
      size: 18, color: this.tab === t ? '#ffd23f' : '#e9eef5' }));
    const list = this._list(), pages = Math.max(1, Math.ceil(list.length / this.PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    this.cards = list.slice(this.page * this.PER_PAGE, (this.page + 1) * this.PER_PAGE).map((it, i) => ({ id: it.id, x: x0 + (i % 5) * 206, y: 250 + Math.floor(i / 5) * 330, w: 196, h: 318 }));
    if (pages > 1) {
      b.add(() => '‹', x0, s.bottom - 116, 120, 96, () => { this.page = (this.page + pages - 1) % pages; this._layout(); }, { size: 54, color: '#e9eef5' });
      b.add(() => '›', x0 + 910, s.bottom - 116, 120, 96, () => { this.page = (this.page + 1) % pages; this._layout(); }, { size: 54, color: '#e9eef5' });
    }
    const rx = this._rx();
    b.add(() => this._buyLabel(), rx + 30, s.bottom - 128, 330, 108, () => this._buy(), { size: 34, color: '#9cff6a', disabled: () => !(this.pick && Gear.canBuy(c, Save.data, this.pick).ok) }).tag = 'buy';
    b.add('shop.equipNow', rx + 380, s.bottom - 128, 230, 108, () => this._equipNow(), { size: 26, color: '#9be7ff',
      disabled: () => !(this.pick && Gear.owns(Save.data, this.pick) && Gear.equipped(c)[Gear.item(this.pick).slot] !== this.pick && Gear.canEquip(c, Save.data, this.pick).ok) }).tag = 'equipNow';
  },
  _gx() { return CONFIG.LOGICAL_W / 2 - 900; },
  _rx() { return Math.min(Display.safe.right, CONFIG.LOGICAL_W + 60) - 660; },
  _buyLabel() {
    if (!this.pick) return T('shop.buy', { n: '-' });
    const it = Gear.item(this.pick), chk = Gear.canBuy(this.career, Save.data, it.id);
    if (chk.reason === 'owned') return T('shop.owned');
    if (chk.reason === 'tier') return T('gear.needsStage', chk.params);
    return T('shop.buy', { n: formatNumber(Gear.price(it)) });
  },
  _buy() {
    const c = this.career, r = Gear.buy(c, Save.data, this.pick);
    if (!r.ok) { Sound.play('ui_error'); return; }
    Save.write();
    Sound.play('fanfare');
    const k = this.cards.find((q) => q.id === this.pick);
    if (k) { Effects.sparks(k.x + k.w / 2, k.y + 110, 30, '#ffd23f', 900); Effects.ring(k.x + k.w / 2, k.y + 110, 140, '#ffd23f', 0.5, 10); }
    this.justBought = this.pick;
    this.flash = { text: T('shop.bought', { name: T('gear.' + this.pick) }), t: 0 };
  },
  _equipNow() {
    const r = Gear.equip(this.career, Save.data, this.pick);
    if (!r.ok) { Sound.play('ui_error'); return; }
    CareerSave.save(this.career, this.slot);
    Sound.play('four');
    this.flash = { text: T('gear.equippedFlash'), t: 0 };
  },
  _back() {
    if (this.from === 'gear') Scenes.go('careergear', { slot: this.slot, career: this.career });
    else Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true });
  },

  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); if (!this.buttons.down(id, x, y)) this._down = { id, x, y }; },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this.buttons.up(id)) return;
    const d = this._down; this._down = null;
    if (!d || d.id !== id) return;
    const k = this.cards.find((q) => CareerScene.inBox(q, d.x, d.y));
    if (k) { Sound.play('uiTap'); this.pick = k.id; this.justBought = null; }
  },
  keyDown(code) { if (code === 'Escape') this._back(); },
  update(dt) { this._t += dt; Effects.update(dt); if (this.flash) { this.flash.t += dt; if (this.flash.t > 2.4) this.flash = null; } },

  render(ctx) {
    const c = this.career, s = Display.safe, x0 = this._gx(), rx = this._rx();
    CareerUI.bg(ctx, 'bg_locker_room', 0.62);
    if (!c) return;
    Sprites.ui('shop_sign', x0 + 620, s.top + 62, 130, 112);
    R.text(T('shop.title'), x0 + 700, s.top + 46, 42, '#ffffff', 'left');
    R.text(T('shop.tierLine', { t: Gear.tier(c) }), x0 + 700, s.top + 94, 19, '#ffe28a', 'left', false);
    GearUI.coins(s.right - 30, s.top + 29, 'right');
    // ---- the catalogue ----
    for (const k of this.cards) {
      const it = Gear.item(k.id), chk = Gear.canBuy(c, Save.data, it.id), picked = this.pick === k.id;
      const owned = chk.reason === 'owned', locked = chk.reason === 'tier';
      R.panel(k.x, k.y, k.w, k.h, picked ? 'rgba(40,60,90,0.97)' : 'rgba(10,22,40,0.92)', picked ? '#ffffff' : Gear.rarity(it).colour);
      GearUI.framed(it, k.x + k.w / 2, k.y + 100, 150, 160, { alpha: locked ? 0.35 : 1 });
      CareerTreeScene._fit(T('gear.' + it.id), k.x + 10, k.y + 200, k.w - 20, 18, locked ? '#8a96a3' : '#ffffff');
      R.text(T('gear.slot.' + it.slot), k.x + k.w / 2, k.y + 228, 14, Gear.rarity(it).colour, 'center', false);
      if (owned) { R.roundRect(k.x + 16, k.y + 250, k.w - 32, 48, 20, '#2f7a3a', CONFIG.COLOR.ink, 3); R.text(T('shop.owned'), k.x + k.w / 2, k.y + 274, 20, '#ffffff'); }
      else if (locked) { R.roundRect(k.x + 16, k.y + 250, k.w - 32, 48, 20, '#4a3030', CONFIG.COLOR.ink, 3); R.text(T('gear.needsStage', { t: it.tier }), k.x + k.w / 2, k.y + 274, 18, '#ff9d7a'); }
      else {
        const afford = chk.ok;
        R.roundRect(k.x + 16, k.y + 250, k.w - 32, 48, 20, afford ? '#6b4f0a' : '#3a3322', CONFIG.COLOR.ink, 3);
        Sprites.ui('econ_coin', k.x + 44, k.y + 274, 34, 34);
        R.text(formatNumber(Gear.price(it)), k.x + k.w / 2 + 14, k.y + 274, 22, afford ? '#ffd23f' : '#b8a878');
      }
    }
    const list = this._list(), pages = Math.max(1, Math.ceil(list.length / this.PER_PAGE));
    if (pages > 1) R.text(T('shop.page', { n: this.page + 1, of: pages }), x0 + 515, s.bottom - 68, 24, '#d8e4f0', 'center', false);
    // ---- the detail panel: the merchant, the card, BUY ----
    R.panel(rx, 130, 640, s.bottom - 280, 'rgba(8,16,30,0.94)', '#ffd23f');
    Sprites.ui('shop_merchant_portrait', rx + 130, 205, 230, 124);
    GearUI.wrap(T(this.justBought ? 'shop.merchantThanks' : 'shop.merchantHello'), rx + 260, 175, 360, 20, '#ffe28a');
    if (this.pick) {
      const it = Gear.item(this.pick), chk = Gear.canBuy(c, Save.data, it.id);
      GearUI.card(it, rx + 24, 290, 270, { locked: chk.reason === 'tier' ? T('gear.needsStage', { t: it.tier }) : null });
      let y = 300;
      const tx = rx + 318, tw = 300;
      R.text(T('shop.compareTitle'), tx, y, 22, '#ffffff', 'left'); y += 36;
      if (Gear.cosmetic(it)) y = GearUI.wrap(T('gear.cosmetic'), tx, y, tw, 18, '#9be7ff') + 30;
      else if (Gear.equipped(c)[it.slot] === it.id) { R.text(T('gear.wearingNow'), tx, y, 20, '#9cff6a', 'left', false); y += 40; }
      else {
        const cmp = Gear.compare(c, it.id), diffs = Object.entries(cmp.stats);
        if (!diffs.length) { R.text(T('gear.noChange'), tx, y, 20, '#b8c6d6', 'left', false); y += 30; }
        for (const [k, d] of diffs) { R.text((d > 0 ? '+' : '') + d + ' ' + T('stat.' + k), tx, y, 22, d > 0 ? '#9cff6a' : '#ff7a7a', 'left', false); y += 30; }
        R.text(T('shop.vsWorn', { name: T('gear.' + cmp.current) }), tx, y, 15, '#8a96a3', 'left', false); y += 34;
      }
      if (it.perk) y = GearUI.wrap('★ ' + GearUI.perkName(it.perk) + ': ' + GearUI.perkDesc(it.perk), tx, y, tw, 18, '#ffe28a') + 30;
      if (it.set) {
        R.text(T('gear.setName.' + it.set), tx, y, 20, EQUIPMENT_DATA.sets[it.set].colour, 'left'); y += 28;
        for (const t of Gear.thresholds(it.set)) y = GearUI.wrap((t >= Gear.setSize(it.set) ? T('gear.setFull') : T('gear.setPieces', { n: t })) + ': ' + GearUI.thresholdText(it.set, t), tx, y, tw, 15, '#b8c6d6') + 22;
      }
      const why = chk.ok || chk.reason === 'owned' ? '' : chk.reason === 'coins' ? T('shop.why.coins', chk.params) : T('shop.why.' + chk.reason, chk.params);
      if (why) R.text(why, rx + 320, s.bottom - 170, 20, '#ff9d7a');
    }
    this.buttons.draw();
    Effects.drawParticles(ctx);
    if (this.flash) {
      const a = Math.max(0, Math.min(1, (2.4 - this.flash.t) / 0.4));
      ctx.save(); ctx.globalAlpha = a; R.text(this.flash.text, x0 + 515, 600, 46, '#9cff6a'); ctx.restore();
    }
  },
};

// =====================================================================================
const CollectionScene = {
  tab: 'gear', sel: null, back: 'title', params: null,
  buttons: new ButtonList(),
  cells: [],

  enter(params) {
    CareerAssets.ensure(); GearAssets.ensure();
    this.params = params || {};
    this.back = this.params.back || 'title';
    this.sel = null;
    CollectionBook.check(Save.data);             // Collection Book milestones (plan 21.3)
    this._layout();
  },
  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => this._back(), { size: 32, color: '#e9eef5' });
    b.add('collection.tab.gear', s.right - 600, s.top + 16, 280, 96, () => { this.tab = 'gear'; this.sel = null; this._layout(); }, { size: 30, color: this.tab === 'gear' ? '#ffd23f' : '#e9eef5' });
    b.add('collection.tab.techniques', s.right - 310, s.top + 16, 290, 96, () => { this.tab = 'techniques'; this.sel = null; this._layout(); }, { size: 24, color: this.tab === 'techniques' ? '#ffd23f' : '#e9eef5' });
    const ids = this._ids(), cols = 12, size = 138, gap = 8, x0 = cx - (cols * (size + gap) - gap) / 2;
    this.cells = ids.map((id, i) => ({ id, x: x0 + (i % cols) * (size + gap), y: 190 + Math.floor(i / cols) * (size + gap), w: size, h: size }));
  },
  _ids() { return this.tab === 'gear' ? EQUIPMENT_DATA.items.map((it) => it.id) : Object.keys(SKILL_TREE_DATA.techniques); },
  _have(id) { return this.tab === 'gear' ? Gear.owns(Save.data, id) : SkillTree.discovered(Save.data, id); },
  _back() {
    if (this.back === 'careergear') Scenes.go('careergear', { slot: this.params.slot, career: this.params.career });
    else if (this.back === 'careerhome') Scenes.go('careerhome', { slot: this.params.slot, career: this.params.career, stay: true });
    else Scenes.go('title');
  },

  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); if (!this.buttons.down(id, x, y)) this._down = { id, x, y }; },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this.buttons.up(id)) return;
    const d = this._down; this._down = null;
    if (!d || d.id !== id) return;
    const k = this.cells.find((q) => CareerScene.inBox(q, d.x, d.y));
    Sound.play('uiTap');
    this.sel = k && k.id !== this.sel ? k.id : null;
  },
  keyDown(code) { if (code === 'Escape') { if (this.sel) this.sel = null; else this._back(); } },
  update() {},

  render(ctx) {
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    CareerUI.bg(ctx, 'bg_scout_room', 0.6);
    const ids = this._ids(), have = ids.filter((id) => this._have(id)).length;
    Sprites.ui('icon_collection', s.left + 310, s.top + 64, 130, 110);
    R.text(T('collection.title'), cx - 140, s.top + 48, 50, '#ffffff');
    R.text(T('collection.count', { n: have, total: ids.length }), cx - 140, s.top + 98, 22, '#ffe28a', 'center', false);
    // Collection Book milestones (plan 21.3): gear + techniques together
    const bk = CollectionBook.counts(Save.data), M = CollectionBook.meta(Save.data);
    const next = COLLECTION_DATA.milestones.find((m) => !M.milestones[m.id]);
    const marks = COLLECTION_DATA.milestones.map((m) => (M.milestones[m.id] ? '✓' : '') + m.pct + '%').join('  ·  ');
    R.text(T('collection.book', { p: bk.pct, marks }) + (next ? '   ' + T('collection.nextMilestone', { p: next.pct, r: Meta.rewardText(next.reward) }) : ''), cx - 140, s.top + 136, 18, '#9be7ff', 'center', false);
    for (const k of this.cells) {
      const got = this._have(k.id), picked = this.sel === k.id;
      if (this.tab === 'gear') {
        const it = Gear.item(k.id);
        R.roundRect(k.x, k.y, k.w, k.h, 16, picked ? 'rgba(50,70,100,0.96)' : got ? 'rgba(14,28,48,0.92)' : 'rgba(6,12,22,0.85)', picked ? '#ffffff' : got ? Gear.rarity(it).colour : 'rgba(255,255,255,0.15)', 3);
        if (got) GearUI.framed(it, k.x + k.w / 2, k.y + k.h / 2, k.w - 12, k.h - 12);
        else { GearUI.art(it, k.x + k.w / 2, k.y + k.h / 2, k.w * 0.7, { silhouette: true }); R.text('?', k.x + k.w - 22, k.y + 24, 26, '#56657a'); }
      } else {
        const t = SKILL_TREE_DATA.techniques[k.id];
        R.roundRect(k.x, k.y, k.w, k.h, 16, picked ? 'rgba(50,70,100,0.96)' : got ? 'rgba(14,28,48,0.92)' : 'rgba(6,12,22,0.85)', picked ? '#ffffff' : got ? TreeUIColours.forId(k.id) : 'rgba(255,255,255,0.15)', 3);
        if (got) TreeArt.draw(t.icon, k.x + k.w / 2, k.y + k.h / 2, k.w - 20);
        else {
          const cv = GearUI.silhouette(t.icon);
          if (cv) { const z = Math.min((k.w - 30) / cv.width, (k.h - 30) / cv.height); ctx.drawImage(cv, k.x + k.w / 2 - cv.width * z / 2, k.y + k.h / 2 - cv.height * z / 2, cv.width * z, cv.height * z); }
          R.text('?', k.x + k.w / 2, k.y + k.h / 2, 44, '#56657a');
        }
      }
    }
    if (this.sel) this._drawInfo(ctx);
    else R.text(T('collection.hint'), cx, s.bottom - 30, 22, '#b8c6d6', 'center', false);
    this.buttons.draw();
  },

  // The entry's card: name (or ???), rarity, where it comes from, when you got it.
  _drawInfo(ctx) {
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, id = this.sel, got = this._have(id);
    const cell = this.cells.find((k) => k.id === id), w = 1100, h = 190, x = cx - w / 2;
    const y = cell && cell.y > 560 ? 180 : s.bottom - h - 10;            // keep clear of the picked entry
    R.panel(x, y, w, h, 'rgba(8,16,30,0.97)', '#ffd23f');
    if (this.tab === 'gear') {
      const it = Gear.item(id), L = Save.data.locker && Save.data.locker[id];
      if (got) GearUI.framed(it, x + 100, y + h / 2, 160, 160); else GearUI.art(it, x + 100, y + h / 2, 120, { silhouette: true });
      R.text(got ? T('gear.' + id) : T('collection.unknown'), x + 200, y + 40, 34, got ? '#ffffff' : '#8a96a3', 'left');
      R.text(GearUI.rarityText(it) + ' · ' + T('gear.slot.' + it.slot) + (it.set ? ' · ' + T('gear.setName.' + it.set) : ''), x + 200, y + 82, 20, Gear.rarity(it).colour, 'left', false);
      if (got) {
        R.text(T('collection.obtained', { date: L.got, src: T('gear.src.' + L.src) }), x + 200, y + 118, 20, '#9cff6a', 'left', false);
        if (!Gear.cosmetic(it)) R.text(GearUI.statLine(it.stats) + (it.perk ? '   ★ ' + GearUI.perkName(it.perk) : ''), x + 200, y + 152, 20, '#e9eef5', 'left', false);
      } else {
        R.text(T('collection.hintLabel') + ' ' + this._hint(it), x + 200, y + 124, 22, '#ffe28a', 'left', false);
      }
    } else {
      const t = SKILL_TREE_DATA.techniques[id];
      if (got) TreeArt.draw(t.icon, x + 100, y + h / 2, 150);
      R.text(got ? TreeText.name(id) : T('collection.unknown'), x + 200, y + 44, 34, got ? '#ffffff' : '#8a96a3', 'left');
      const n = SkillTree.techNode(id);
      R.text(T('tree.cardLine', { type: T('tree.type.technique'), branch: T('tree.branch.' + n.branch), t: n.tier }), x + 200, y + 88, 20, TreeUIColours.forId(id), 'left', false);
      if (got) CareerTreeScene._wrap(TreeText.desc(id), x + 200, y + 126, w - 240, 20, '#e9eef5');
      else R.text(T('collection.techHint'), x + 200, y + 130, 22, '#ffe28a', 'left', false);
    }
  },
  // A clue for an item you haven't found: the first place it comes from.
  _hint(it) {
    // Secrets (plan 21.5): the rarest pieces keep their clue hidden until the Collection Book gives one.
    if (CollectionBook.secret(Save.data, it) && !(CollectionBook.meta(Save.data).clues > 0)) return T('collection.secretClue');
    const src = it.src.find((x) => x !== 'starter') || 'shop';
    return T('gear.hint.' + src, { t: it.tier });
  },
};
