// Cricket Arcade — retirement, the Legacy card, the Hall of Fame and Records (M09,
// plan 8.20–8.22, 21.2, 5.27, 5.28).
//   LegacyCard         the permanent player card (ui/panels/player_legacy_card.png
//                      as the card, its inside redrawn; the portrait in the Signature frame)
//   CareerRetireScene  the full career summary, the Legacy Traits, then RETIRE
//   HallOfFameScene    every retired player (hall_of_fame_bg), tap one for its card
//   RecordsScene       achievements by category with progress bars (??? for hidden)

const LegacyCard = {
  SRC: [64, 2, 358, 432], BADGE: [356, 4, 62, 60],
  // Draw a snapshot's card, w wide, top-left at (x, y). Returns its height.
  draw(ctx, s, x, y, w) {
    const S = this.SRC, k = w / S[2], h = S[3] * k, art = Sprites.images.panel_player_legacy_card;
    if (art) ctx.drawImage(art.img, S[0], S[1], S[2], S[3], x, y, w, h);
    else R.roundRect(x, y, w, h, 20 * k, '#16325c', '#e8b21c', 8 * k);
    // the inside
    const ix = x + 12 * k, iy = y + 10 * k, iw = w - 24 * k, ih = h - 20 * k;
    const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
    g.addColorStop(0, '#1d3f86'); g.addColorStop(0.6, '#0f2150'); g.addColorStop(1, '#0a1433');
    R.roundRect(ix, iy, iw, ih, 18 * k, g);
    if (art) ctx.drawImage(art.img, this.BADGE[0], this.BADGE[1], this.BADGE[2], this.BADGE[3], x + (this.BADGE[0] - S[0]) * k, y + (this.BADGE[1] - S[1]) * k, this.BADGE[2] * k, this.BADGE[3] * k);
    // portrait in the Signature frame
    const px = x + w * 0.36, py = iy + 110 * k;
    Portrait.draw(ctx, s, px, py, 150 * k);
    Sprites.ui('frame_signature', px, py, 230 * k, 216 * k);
    // OVR and origin badge
    R.text(String(s.ovr), x + w - 62 * k, iy + 110 * k, 58 * k, '#ffd23f');
    R.text(T('legacy.ovr'), x + w - 62 * k, iy + 150 * k, 16 * k, '#ffffff', 'center', false);
    Sprites.ui('badge_' + s.origin, x + w - 62 * k, iy + 200 * k, 56 * k, 56 * k);
    // name, role
    CareerTreeScene._fit(s.name, ix + 16 * k, iy + 238 * k, iw - 32 * k, 34 * k, '#ffffff', true);
    CareerTreeScene._fit(T('career.role.' + s.role) + ' · ' + T('create.arch.' + s.archetype), ix + 16 * k, iy + 272 * k, iw - 90 * k, 15 * k, '#9be7ff');
    // stats: batting / bowling / fielding / fitness (averages)
    const avg = (keys) => Math.round(keys.reduce((a, q) => a + (s.stats[q] || 0), 0) / keys.length);
    const rows = [['legacy.bat', avg(PLAYER_DATA.stats.batting)], ['legacy.bowl', avg(PLAYER_DATA.stats.bowling)], ['legacy.field', s.stats.fielding], ['legacy.fit', s.stats.fitness]];
    rows.forEach(([key, v], i) => {
      const ry = iy + 296 * k + i * 24 * k;
      R.text(T(key), ix + 16 * k, ry, 14 * k, '#d8e4f0', 'left', false);
      R.roundRect(ix + 104 * k, ry - 6 * k, 90 * k, 12 * k, 6 * k, 'rgba(255,255,255,0.15)');
      R.roundRect(ix + 104 * k, ry - 6 * k, 90 * k * Math.min(1, v / 99), 12 * k, 6 * k, '#46a8ff');
      R.text(String(v), ix + 200 * k, ry, 15 * k, '#ffffff', 'left', false);
    });
    // Legacy Traits (primary big, secondary small)
    const tx = x + w - 70 * k;
    if (s.traits.primary) { Sprites.ui(Legacy.trait(s.traits.primary).icon, tx, iy + 306 * k, 66 * k, 66 * k); }
    if (s.traits.secondary) { Sprites.ui(Legacy.trait(s.traits.secondary).icon, tx, iy + 362 * k, 42 * k, 42 * k); }
    // trophies and captaincy
    R.text(T('legacy.trophiesN', { n: s.trophies.length }) + (s.captain ? ' · ' + T('legacy.captain') : ''), ix + 16 * k, iy + ih - 16 * k, 14 * k, '#ffe28a', 'left', false);
    return h;
  },
};

// =====================================================================================
const CareerRetireScene = {
  // (M13: retirement and Legacy are in the Full Game; Career Home checks first)
  career: null, slot: 1, done: null, _t: 0,
  buttons: new ButtonList(),
  enter(params) {
    CareerAssets.ensure(); LegacyAssets.ensure();
    this.slot = params.slot; this.career = params.career; this.done = null; this._t = 0;
    this.totals = Legacy.careerTotals(this.career);
    this.tr = Legacy.traits(this.career, this.totals);
    this.preview = Legacy.snapshot(this.career, Save.data);
    this._layout();
  },
  _layout() {
    const b = this.buttons, cx = CONFIG.LOGICAL_W / 2, s = Display.safe;
    b.clear();
    if (!this.done) {
      b.add('legacy.retire', cx + 260, s.bottom - 140, 560, 120, () => this._retire(), { size: 44, color: '#ffd23f' }).tag = 'retire';
      b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true }), { size: 32, color: '#e9eef5' });
    } else b.add('legacy.toHall', cx + 260, s.bottom - 140, 560, 120, () => Scenes.go('halloffame', { focus: this.done.snap.id }), { size: 40, color: '#9cff6a' }).tag = 'hall';
  },
  _retire() {
    const c = this.career, r = Legacy.retire(c, Save.data);
    this.done = r;
    Save.saveCareer(this.slot, null, null);            // the slot is free again; the player lives in the Hall of Fame
    Story.play('retire', { career: c });               // M17: a farewell scene
    Achievements.checkAccount(Save.data, null);
    Save.write();
    Sound.play('fanfare'); Sound.play('crowdRoar');
    Effects.init();
    this._t = 0;
    this._layout();
  },
  update(dt) {
    this._t += dt; Effects.update(dt);
    if (this.done && this._t % 0.4 < dt) Effects.sparks(300 + ((this._t * 977) % 1320), 180, 16, ['#ffd23f', '#9cff6a', '#5fd4ff'][Math.floor(this._t * 3) % 3], 800);
  },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown() {},
  render(ctx) {
    const cx = CONFIG.LOGICAL_W / 2, t = this.totals, snap = this.done ? this.done.snap : this.preview;
    CareerUI.bg(ctx, this.done ? 'bg_hall_of_fame' : 'bg_locker_room', 0.55);
    R.text(T(this.done ? 'legacy.inducted' : 'legacy.title', { name: snap.name }), cx, 70, 54, '#ffd23f');
    // left: the card
    LegacyCard.draw(ctx, snap, cx - 900, 130, 420);
    // middle: the career in numbers
    const x = cx - 430, rows = [
      ['legacy.s.matches', t.matches], ['legacy.s.wins', t.wins], ['legacy.s.runs', t.runs], ['legacy.s.sixes', t.sixes],
      ['legacy.s.wickets', t.wickets], ['legacy.s.bestBat', t.bestBat], ['legacy.s.bestBowl', t.bestBowl], ['legacy.s.sGrades', t.sGrades],
      ['legacy.s.rivals', t.rivalsBeaten], ['legacy.s.trophies', snap.trophies.length], ['legacy.s.stage', CareerUI.pathwayLabel({ origin: snap.origin }, snap.stageReached)],
    ];
    R.panel(x, 130, 560, 640, 'rgba(10,22,40,0.92)', '#ffd23f');
    R.text(T('legacy.summary'), x + 280, 170, 28, '#ffffff');
    rows.forEach(([k, v], i) => {
      R.text(T(k), x + 30, 220 + i * 48, 22, '#b8c6d6', 'left', false);
      R.text(String(v), x + 530, 220 + i * 48, 24, '#ffffff', 'right');
    });
    // right: the traits and the rewards
    const rx = cx + 170;
    R.panel(rx, 130, 760, 640, 'rgba(10,22,40,0.92)', '#ffd23f');
    R.text(T('legacy.traits'), rx + 380, 170, 28, '#ffffff');
    const trait = (id, y, big) => {
      if (!id) return;
      const L = Legacy.trait(id);
      Sprites.ui(L.icon, rx + 90, y, big ? 130 : 96, big ? 130 : 96);
      R.text(T(big ? 'legacy.primary' : 'legacy.secondary'), rx + 170, y - 36, 18, '#ffd23f', 'left', false);
      R.text(T('trait.' + id), rx + 170, y, big ? 34 : 28, '#ffffff', 'left');
      R.text(T('trait.' + id + '.desc'), rx + 170, y + 36, 18, '#d8e4f0', 'left', false);
    };
    trait(this.tr.primary, 290, true);
    if (this.tr.secondary) trait(this.tr.secondary, 460, false);
    else R.text(T('legacy.noSecondary'), rx + 380, 460, 20, '#8a96a3', 'center', false);
    const marks = this.done ? this.done.marks : Legacy.marks(snap);
    Sprites.ui('econ_legacy_mark', rx + 90, 640, 80, 80);
    R.text(T('legacy.marks', { n: marks }), rx + 150, 640, 30, '#ffe28a', 'left');
    if (this.done && this.done.firstRetirement) {
      Sprites.ui('reward_first_myxi', cx - 90, 900, 200, 200);
      R.text(T('legacy.myxiNext'), cx - 90, 1030, 26, '#9cff6a', 'center');
    } else if (!this.done) GearUI.wrap(T('legacy.retireNote'), cx - 430, 820, 640, 22, '#d8e4f0');
    if (this.done) Sprites.ui('reward_hall_of_fame', cx - 520, 900, 220, 200);
    this.buttons.draw();
    Effects.drawParticles(ctx);
  },
};

// =====================================================================================
const HallOfFameScene = {
  sel: null, page: 0,
  buttons: new ButtonList(), cards: [],
  PER: 4,
  enter(params) {
    CareerAssets.ensure(); LegacyAssets.ensure();
    const hof = Save.data.hallOfFame || [];
    const i = params && params.focus ? hof.findIndex((h) => h.id === params.focus) : -1;
    this.sel = i >= 0 ? hof[i].id : null;
    this.page = i >= 0 ? Math.floor(i / this.PER) : 0;
    this.back = (params && params.back) || 'title';
    this.shop = false; this.cmp = null; this.msg = null;
    this._layout();
    Tips.show('legacyShop');                              // M20
  },
  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2, hof = Save.data.hallOfFame || [];
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go(this.back === 'careerselect' ? 'careerselect' : 'title'), { size: 32, color: '#e9eef5' });
    if (this.shop) {        // M19: the Legacy shop (permanent unlocks for Legacy Marks)
      b.add('hof.close', cx - 160, 900, 320, 100, () => { this.shop = false; this._layout(); }, { size: 36, color: '#e9eef5' });
      Legacy.shopItems(Save.data).forEach((it, i) => {
        b.add(() => (it.owned ? T('hof.shopOwned') : it.mc ? T('hof.shopSwap', { n: it.mc }) : T('hof.shopBuy', { n: it.lm })), cx + 260, 300 + i * 165, 360, 110, () => {
          const r = Legacy.buy(Save.data, it.id);
          if (!r.ok) { Sound.play('ui_error'); this.msg = T('hof.shopWhy.' + r.reason); return; }
          Save.write(); Sound.play('fanfare'); this.msg = T('hof.shopDone', { name: T('hof.shop.' + it.id) }); this._layout();
        }, { size: 30, color: it.owned ? '#5b6570' : '#ffd23f', disabled: () => !it.ok });
      });
      return;
    }
    b.add('hof.shopBtn', s.right - 400, s.top + 16, 380, 96, () => { this.shop = true; this.msg = null; this._layout(); }, { size: 28, color: '#ffd23f' });
    const sel = this.sel && hof.find((x) => x.id === this.sel);
    if (sel) {   // M19 (plan 5.27): favourite, compare
      b.add(() => T(sel.fav ? 'hof.unfav' : 'hof.fav'), s.right - 400, s.top + 124, 380, 90, () => { sel.fav = !sel.fav; Save.write(); }, { size: 26, color: '#ffe28a' });
      if (hof.length > 1) b.add(() => T(this.cmp ? 'hof.cmpCancel' : 'hof.cmp'), s.left + 240, s.top + 16, 330, 96, () => { this.cmp = this.cmp ? null : this.sel; }, { size: 28, color: '#9be7ff' });
    }
    // favourites first, then the order they retired in
    const order = hof.slice().sort((a, z) => (z.fav ? 1 : 0) - (a.fav ? 1 : 0));
    const list = order.slice(this.page * this.PER, (this.page + 1) * this.PER);
    this.cards = list.map((h, i) => ({ id: h.id, x: cx - 900 + i * 455, y: 170, w: 420 }));
    const pages = Math.ceil(hof.length / this.PER);
    if (pages > 1) {
      b.add(() => '‹', s.left + 30, 950, 110, 90, () => { this.page = (this.page + pages - 1) % pages; this._layout(); }, { size: 50, color: '#e9eef5' });
      b.add(() => '›', s.right - 140, 950, 110, 90, () => { this.page = (this.page + 1) % pages; this._layout(); }, { size: 50, color: '#e9eef5' });
    }
  },
  update() {},
  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; if (!this.buttons.down(id, x, y)) this._down = { id, x, y }; },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this.buttons.up(id)) return;
    const d = this._down; this._down = null;
    if (!d) return;
    if (this.shop) return;
    const k = this.cards.find((q) => d.x >= q.x && d.x <= q.x + q.w && d.y >= q.y && d.y <= q.y + 520);
    if (this.cmp && k && k.id !== this.cmp) { this.sel = k.id; Sound.play('uiTap'); this._layout(); return; }   // the second card to compare
    if (this.cmp && !k) this.cmp = null;
    this.sel = k && k.id !== this.sel ? k.id : null;
    Sound.play('uiTap');
    this._layout();
  },
  keyDown(code) { if (code === 'Escape') { if (this.shop) { this.shop = false; this._layout(); } else if (this.cmp) this.cmp = null; else Scenes.go('title'); } },
  render(ctx) {
    const cx = CONFIG.LOGICAL_W / 2, hof = Save.data.hallOfFame || [];
    CareerUI.bg(ctx, 'bg_hall_of_fame', 0.35);
    R.text(T('hof.title'), cx, 70, 56, '#ffd23f');
    R.text(T('hof.sub', { n: hof.length }), cx, 125, 24, '#ffffff', 'center', false);
    if (!hof.length) { Sprites.ui('reward_hall_of_fame', cx, 520, 420, 380); R.text(T('hof.empty'), cx, 780, 30, '#d8e4f0'); }
    if (this.shop) { this._drawShop(ctx); this.buttons.draw(); return; }
    const gold = Legacy.hasFrame(Save.data);
    for (const k of this.cards) {
      const h = hof.find((x) => x.id === k.id);
      if (gold) R.roundRect(k.x - 14, k.y - 14, k.w + 28, 552, 28, null, '#ffd23f', 8);
      LegacyCard.draw(ctx, h, k.x, k.y, k.w);
      if (h.fav) R.text('★', k.x + k.w - 30, k.y + 30, 54, '#ffd23f');
      if (this.cmp === k.id) R.roundRect(k.x - 8, k.y - 8, k.w + 16, 540, 24, null, '#9be7ff', 6);
      if (this.sel === k.id) R.roundRect(k.x - 8, k.y - 8, k.w + 16, 540, 24, null, '#ffffff', 5);
      R.text(T('hof.retired', { d: h.retiredAt }), k.x + k.w / 2, k.y + 540, 18, '#d8e4f0', 'center', false);
    }
    const h = this.sel && hof.find((x) => x.id === this.sel);
    const a = this.cmp && this.cmp !== this.sel && hof.find((x) => x.id === this.cmp);
    if (a && h) this._compare(ctx, a, h);
    else if (h) this._detail(ctx, h);
    if (this.cmp && !a) R.text(T('hof.cmpPick'), cx, 745, 24, '#9be7ff', 'center', false);
    this.buttons.draw();
  },
  // Two Legacy players side by side (M19, plan 5.27): their records, the better one in green.
  _compare(ctx, a, b) {
    const cx = CONFIG.LOGICAL_W / 2, y = 760;
    R.panel(cx - 780, y, 1560, 270, 'rgba(10,22,40,0.95)', '#9be7ff');
    R.text(a.name, cx - 420, y + 36, 28, '#ffffff'); R.text(T('hof.vs'), cx, y + 36, 26, '#9be7ff'); R.text(b.name, cx + 420, y + 36, 28, '#ffffff');
    const rows = [['matches', (h) => h.records.matches], ['runs', (h) => h.records.runs], ['wickets', (h) => h.records.wickets], ['sixes', (h) => h.records.sixes], ['trophies', (h) => h.trophies.length]];
    rows.forEach(([k, f], i) => {
      const va = f(a) || 0, vb = f(b) || 0, yy = y + 80 + i * 38;
      R.text(T('hof.row.' + k), cx, yy, 20, '#b8c6d6', 'center', false);
      R.text(String(va), cx - 420, yy, 24, va > vb ? '#9cff6a' : '#ffffff');
      R.text(String(vb), cx + 420, yy, 24, vb > va ? '#9cff6a' : '#ffffff');
    });
  },
  _drawShop(ctx) {
    const cx = CONFIG.LOGICAL_W / 2;
    R.panel(cx - 700, 190, 1400, 660, 'rgba(10,22,40,0.96)', '#ffd23f');
    R.text(T('hof.shopTitle2', { n: (Save.data.currencies && Save.data.currencies.legacyMarks) || 0, c: (Save.data.currencies && Save.data.currencies.mythicCore) || 0 }), cx, 250, 34, '#ffd23f');
    Legacy.shopItems(Save.data).forEach((it, i) => {
      const y = 355 + i * 165;
      R.text(T('hof.shop.' + it.id), cx - 640, y - 16, 30, '#ffffff', 'left');
      R.text(T('hof.shop.' + it.id + '.desc'), cx - 640, y + 24, 20, '#b8c6d6', 'left', false);
      if (!it.ok && it.reason === 'myxi') R.text(T('hof.shopWhy.myxi'), cx - 640, y + 56, 18, '#ff9d7a', 'left', false);
    });
    R.text(T('hof.shopMore'), cx, 790, 20, '#9be7ff', 'center', false, 1300);
    if (this.msg) R.text(this.msg, cx, 1040, 28, '#9cff6a');
  },
  _detail(ctx, h) {
    const cx = CONFIG.LOGICAL_W / 2, y = 760, r = h.records;
    R.panel(cx - 780, y, 1560, 250, 'rgba(10,22,40,0.95)', '#ffd23f');
    R.text(h.name + ' · ' + T('trait.' + h.traits.primary) + (h.traits.secondary ? ' / ' + T('trait.' + h.traits.secondary) : ''), cx - 750, y + 40, 28, '#ffffff', 'left');
    R.text(T('hof.line', { m: r.matches, runs: r.runs, w: r.wickets, s: r.sixes, t: h.trophies.length }), cx - 750, y + 90, 22, '#d8e4f0', 'left', false);
    const gear = Object.values(h.gear).filter((g) => g.stats && Object.keys(g.stats).length).map((g) => T('gear.' + g.id)).join(', ');
    GearUI.wrap(T('hof.gear', { list: gear || '-' }), cx - 750, y + 130, 1500, 18, '#ffe28a');
    const techs = h.loadout.active.concat(h.loadout.passive).map((id) => T('tech.' + id)).join(', ');
    R.text(T('hof.techs', { list: techs || '-' }) + (h.captain ? ' · ' + T('legacy.captain') : ''), cx - 750, y + 200, 18, '#9be7ff', 'left', false);
  },
};

// =====================================================================================
const RecordsScene = {
  cat: 'batting', page: 0, back: 'title', params: null,
  buttons: new ButtonList(),
  PER: 7,
  enter(params) {
    LegacyAssets.ensure();
    this.params = params || {};
    this.back = this.params.back || 'title';
    this.page = 0;
    this._layout();
    Tips.show('records');                                 // M20
  },
  _cats() { return ACHIEVEMENT_DATA.cats.filter((k) => Achievements.list().some((a) => a.cat === k)); },
  _items() { return this.cat === 'records' ? RECORD_DATA.list : Achievements.list().filter((a) => a.cat === this.cat); },
  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => this._back(), { size: 32, color: '#e9eef5' });
    // M19: the record book has its own button (top right), so the category tabs keep their size
    b.add('ach.cat.records', s.right - 320, s.top + 16, 300, 96, () => { this.cat = 'records'; this.page = 0; this._layout(); }, { size: 30, color: this.cat === 'records' ? '#ffd23f' : '#9be7ff' });
    const cats = this._cats();
    const L = Math.max(cx - 900, s.left + 10), W = Math.min(cx + 900, s.right - 10) - L;      // Rule A: clear of a notch
    cats.forEach((k, i) => b.add(() => T('ach.cat.' + k), L + i * (W / cats.length), 140, W / cats.length - 10, 84, () => { this.cat = k; this.page = 0; this._layout(); },
      { size: 20, color: this.cat === k ? '#ffd23f' : '#e9eef5' }));
    const pages = Math.ceil(this._items().length / (this.cat === 'records' ? this.PER * 2 : this.PER));
    if (pages > 1) {
      b.add(() => '‹', L, s.bottom - 110, 120, 90, () => { this.page = (this.page + pages - 1) % pages; this._layout(); }, { size: 50, color: '#e9eef5' });
      b.add(() => '›', cx + 780, s.bottom - 110, 120, 90, () => { this.page = (this.page + 1) % pages; this._layout(); }, { size: 50, color: '#e9eef5' });
    }
  },
  _back() {
    if (this.back === 'careerhome') Scenes.go('careerhome', { slot: this.params.slot, career: this.params.career, stay: true });
    else Scenes.go('title');
  },
  update() {},
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Escape') this._back(); },
  render(ctx) {
    const cx = CONFIG.LOGICAL_W / 2, S = Save.data, all = Achievements.list(), got = all.filter((a) => Achievements.earned(S, a.id)).length;
    CareerUI.bg(ctx, 'bg_hall_of_fame', 0.7);
    Sprites.ui('meta_records', cx - 480, 62, 100, 100);
    R.text(T('ach.title'), cx, 60, 50, '#ffffff');
    R.text(T('ach.count', { n: got, total: all.length, later: ACHIEVEMENT_DATA.list.length - all.length }), cx, 110, 22, '#ffe28a', 'center', false);
    const c = this.params.career || null;
    if (this.cat === 'records') { this._drawRecords(ctx); this.buttons.draw(); return; }
    this._items().slice(this.page * this.PER, (this.page + 1) * this.PER).forEach((a, i) => {
      const y = 250 + i * 104, on = Achievements.earned(S, a.id), hide = a.hidden && !on;
      R.panel(cx - 900, y, 1800, 92, on ? 'rgba(30,60,30,0.94)' : 'rgba(10,22,40,0.9)', on ? '#9cff6a' : 'rgba(255,255,255,0.2)');
      Sprites.ui(hide ? 'medal_badge' : ACHIEVEMENT_DATA.tiers[a.tier], cx - 850, y + 46, 76, 76, { alpha: on ? 1 : 0.45 });
      R.text(hide ? T('collection.unknown') : T('ach.' + a.id), cx - 790, y + 30, 26, on ? '#ffffff' : '#c9d0d6', 'left');
      R.text(hide ? T('ach.hiddenHint') : T('ach.' + a.id + '.desc'), cx - 790, y + 64, 18, '#b8c6d6', 'left', false);
      const pr = !on && !hide && Achievements.progress(S, a, c);
      if (pr) { CareerUI.meter(cx + 180, y + 34, 380, 22, pr.have, pr.need, '#46a8ff'); R.text(pr.have + ' / ' + pr.need, cx + 370, y + 70, 16, '#ffffff', 'center', false); }
      R.text(on ? T('ach.earnedOn', { d: S.achievements[a.id].at }) : AchText.reward(a.reward), cx + 870, y + 46, 20, on ? '#9cff6a' : '#ffe28a', 'right', false);
    });
    this.buttons.draw();
  },
};

// The record book tab (M19) and the NEW RECORD flag on result screens.
const RecordsUI = {
  flag(ids, cx, y) {
    const t = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000, k = 1 + 0.04 * Math.sin(t * 6);
    const txt = T('rec.new', { list: ids.slice(0, 3).map((id) => T('rec.' + id)).join(' · ') });
    R.roundRect(cx - 520 * k, y - 32, 1040 * k, 64, 28, 'rgba(90,20,30,0.92)', '#ffd23f', 4);
    R.text(txt, cx, y, 28, '#ffd23f', 'center', false, 1000);
  },
};
RecordsScene._drawRecords = function (ctx) {
  const cx = CONFIG.LOGICAL_W / 2, all = Records.all(Save.data), page = all.slice(this.page * this.PER * 2, (this.page + 1) * this.PER * 2);
  page.forEach((r, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = cx - 900 + col * 910, y = 250 + row * 104;
    R.panel(x, y, 890, 92, 'rgba(10,22,40,0.9)', r.text !== '-' ? '#ffd23f' : 'rgba(255,255,255,0.2)');
    R.text(T('rec.' + r.id), x + 30, y + 30, 24, '#ffffff', 'left');
    if (r.at) R.text(T('rec.on', { d: r.at }), x + 30, y + 64, 16, '#b8c6d6', 'left', false);
    R.text(r.text, x + 860, y + 46, 34, r.text !== '-' ? '#ffd23f' : '#5b6570', 'right');
  });
};

const LegacyAssets = { loaded: false, ensure() { if (!this.loaded) { this.loaded = true; Sprites.loadGroup('legacy'); GearAssets.ensure(); Sprites.loadGroup('career'); } } };
