// Cricket Arcade — career stages 2–4 screens (M08, plan 5.5C, 5.5G, 5.9, 5.12).
//   EventPanel          the short event panel over Career Home (plan 5.9): a
//                       portrait, the dialogue box, two choices (and SKIP)
//   CareerJoinScene     "you're now playing for …" (a representative side or a franchise)
//   CareerOffersScene   Stage 4 contract offers (plan 5.5C)
//   CareerTableScene    the tournament: group tables and the knockout bracket (plan 5.5G)
//   CareerCoachScene    coaches (plan 5.12) — and the Wicket Tree respec lives here now


// =====================================================================================
const EventPanel = {
  career: null, slot: 1, onClose: null,
  buttons: new ButtonList(),
  result: null, _t: 0,
  // The dialogue box art (ui/panels/dialogue_panel.png): its bottom part (the name
  // tab and the cream box) is used, with the example text painted over.
  BOX: { src: [40, 268, 405, 162], tab: [58, 268, 162, 30], cream: [60, 298, 362, 110] },

  open(c, slot, onClose) {
    this.career = c; this.slot = slot; this.onClose = onClose; this.result = null; this._t = 0;
    this._layout();
  },
  isOpen() { return !!(this.career && (this.career.pendingEvent || this.result)); },
  _geom() { const w = 1040, k = w / this.BOX.src[2]; return { x: CONFIG.LOGICAL_W / 2 - w / 2, y: 560, w, k, h: this.BOX.src[3] * k }; },
  _choices() {
    const p = this.career.pendingEvent;
    if (!p) return [];
    if (p.rival) return Rivals.rival(p.rival).buildUp.map((b) => ({ id: b.id, key: 'rival.' + p.rival + '.' + b.id, fx: b.fx }));
    return Events.event(p.id).choices.map((ch) => ({ id: ch.id, key: 'event.' + p.id + '.' + ch.id, fx: ch.fx }));
  },
  _layout() {
    const b = this.buttons, g = this._geom();
    b.clear();
    if (this.result) {
      b.add('event.ok', CONFIG.LOGICAL_W / 2 - 200, g.y + g.h - 150, 400, 104, () => this._close(), { size: 40, color: '#9cff6a' });
      return;
    }
    const ch = this._choices();
    ch.forEach((x, i) => b.add(x.key, g.x + 70 + i * 470, g.y + g.h - 170, 440, 124, () => this._choose(x.id), {
      size: 30, color: i ? '#9be7ff' : '#ffd23f', sub: () => EventText.fx(x.fx, this.career),
    }).tag = 'choice' + i);
    b.add('event.skip', g.x + g.w - 200, g.y - 70, 190, 90, () => this._choose(null), { size: 26, color: '#e9eef5' }).tag = 'skip';
  },
  _choose(id) {
    const r = Events.choose(this.career, Save.data, id);
    CareerSave.save(this.career, this.slot);
    Sound.play(id ? 'fanfare' : 'uiTap');
    this.result = { applied: r ? r.applied : [], skipped: !id };
    if (!id) { this._close(); return; }
    this._layout();
  },
  _close() { this.result = null; this.buttons.clear(); if (this.onClose) this.onClose(); },

  down(id, x, y) { return this.buttons.down(id, x, y) || true; },
  move(id, x, y) { this.buttons.move(id, x, y); },
  up(id) { this.buttons.up(id); return true; },
  update(dt) { this._t += dt; },

  // The portrait for an event: the coach, a support character, or the rival.
  _portrait(p) {
    if (p.rival) return Rivals.rival(p.rival).art;
    const E = Events.event(p.id);
    if (E.portrait === 'coach') { const k = Coaches.coach(Coaches.active(this.career) || 'technique'); return k.art; }
    if (E.portrait === 'sponsor') return p.offer ? Sponsors.sponsor(p.offer).logo : 'stage_sponsor';
    return E.portrait;
  },

  draw(ctx) {
    const c = this.career, v = Display.viewRect(), g = this._geom(), B = this.BOX;
    ctx.fillStyle = 'rgba(3,10,20,0.8)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const p = c.pendingEvent || this._last || {};
    if (c.pendingEvent) this._last = c.pendingEvent;
    // portrait (above the box, left) and the heading
    const pop = Math.min(1, this._t / 0.25);
    ctx.save(); ctx.globalAlpha = pop;
    Sprites.ui(this._portrait(p), g.x + 230, g.y - 190, 430, 430);
    ctx.restore();
    const title = p.rival ? T('rival.' + p.rival) : T('event.' + p.id + '.title');
    R.text(title, g.x + 480, g.y - 250, 52, p.rival ? '#ff8f6b' : '#ffd23f', 'left');
    if (p.rival) R.text(T('rival.bossLine', { obj: CareerText.objective(Rivals.objective(c, p.rival)) }), g.x + 480, g.y - 190, 26, '#ffffff', 'left', false);
    if (p.offer) {
      const S = Sponsors.sponsor(p.offer);
      R.text(T('sponsor.' + S.id), g.x + 480, g.y - 190, 30, '#ffffff', 'left');
      R.text(T('sponsor.deal', { goal: EventText.goal(S), f: S.fixtures, reward: EventText.reward(S.reward) }), g.x + 480, g.y - 140, 24, '#9cff6a', 'left', false);
    }
    // the dialogue box
    const art = Sprites.images.panel_dialogue, k = g.k, sx = (px) => g.x + (px - B.src[0]) * k, sy = (py) => g.y + (py - B.src[1]) * k;
    if (art) ctx.drawImage(art.img, B.src[0], B.src[1], B.src[2], B.src[3], g.x, g.y, g.w, g.h);
    else R.roundRect(g.x, g.y, g.w, g.h, 30, '#f7e7cd', '#e8b21c', 8);
    R.roundRect(sx(B.cream[0]), sy(B.cream[1]), B.cream[2] * k, B.cream[3] * k, 24, '#f7e7cd');
    R.roundRect(sx(B.tab[0]), sy(B.tab[1]), B.tab[2] * k, B.tab[3] * k, 14, '#033781');
    R.text(T(p.rival ? 'event.kind.rival' : 'event.kind.' + (Events.event(p.id) || {}).portrait), sx(B.tab[0]) + B.tab[2] * k / 2, sy(B.tab[1]) + B.tab[3] * k / 2, 26, '#ffffff', 'center', false);
    const body = this.result ? EventText.applied(this.result.applied) : p.rival ? T('rival.' + p.rival + '.intro') : T('event.' + p.id + '.body');
    R.ctx.save();
    GearUI.wrap(body, sx(B.cream[0]) + 40, sy(B.cream[1]) + 50, B.cream[2] * k - 80, 30, this.result ? '#1f6b2a' : '#2a1c10');
    R.ctx.restore();
    this.buttons.draw();
  },
};

// Text helpers for events, sponsors and effects.
const EventText = {
  fx(fx, c) {
    const out = [];
    if (fx.stat) out.push('+' + fx.stat.n + ' ' + T('stat.' + (fx.stat.key === 'best' ? Career.archetype(c.player.role, c.player.archetype).key[0] : fx.stat.key)));
    if (fx.energy) out.push((fx.energy > 0 ? '+' : '') + fx.energy + ' ' + T('event.fx.energy'));
    if (fx.selection) out.push((fx.selection > 0 ? '+' : '') + fx.selection + ' ' + T('event.fx.selection'));
    if (fx.xp) out.push('+' + fx.xp + ' XP');
    if (fx.form) out.push(T(fx.form > 0 ? 'event.fx.formUp' : 'event.fx.formDown'));
    if (fx.coins) out.push('+' + fx.coins + ' ' + T('event.fx.coins'));
    if (fx.match) out.push(Object.entries(fx.match.stats).map(([k, v]) => '+' + v + ' ' + T('stat.' + k)).join(' ') + ' ' + T('event.fx.thisMatch'));
    if (fx.sponsor) out.push(T('event.fx.sponsor'));
    if (fx.captain) out.push(T('event.fx.captain'));
    return out.join(' · ') || T('event.fx.none');
  },
  applied(list) {
    if (!list.length) return T('event.result.none');
    return list.map((a) => a.k === 'stat' ? '+' + a.n + ' ' + T('stat.' + a.stat)
      : a.k === 'form' ? T(a.n > 0 ? 'event.fx.formUp' : a.n < 0 ? 'event.fx.formDown' : 'event.fx.formSame')
      : a.k === 'match' ? T('event.result.match')
      : (a.n > 0 ? '+' : '') + a.n + ' ' + T('event.fx.' + a.k)).join(' · ');
  },
  goal(S) { return T('sponsor.goal.' + S.goal, { n: S.n, min: S.min }); },
  reward(rw) { return rw.coins ? T('career.coinsGain', { n: rw.coins }) : T('gear.' + rw.item); },
};

// =====================================================================================
const CareerJoinScene = {
  buttons: new ButtonList(),
  _t: 0,
  enter(params) {
    this.slot = params.slot; this.career = params.career; this._t = 0;
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    this.buttons.add('career.toHome', cx - 260, 920, 520, 120, () => this._go(), { size: 46 });
    Effects.init();
    Sound.play('fanfare');
  },
  _go() { Scenes.go('careerhome', { slot: this.slot, career: this.career }); },
  update(dt) {
    this._t += dt;
    if (this._t % 0.5 < dt) Effects.sparks(300 + ((this._t * 977) % 1320), 160, 12, ['#ffd23f', '#9cff6a', '#5fd4ff'][Math.floor(this._t * 2) % 3], 700);
    Effects.update(dt);
  },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Enter' || code === 'Space') this._go(); },
  render(ctx) {
    const c = this.career, cx = CONFIG.LOGICAL_W / 2, S = Career.stage(c), tm = Career.team(c);
    CareerUI.bg(ctx, 'bg_scout_room', 0.5);
    R.panel(cx - 470, 150, 940, 560, 'rgba(10,22,40,0.7)', '#ffd23f');
    Sprites.ui(S.team === 'franchise' ? S.milestone : S.art, cx, 430, 900, 540);
    const pop = Math.min(1, this._t / 0.3);
    ctx.save(); ctx.translate(cx, 90); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
    R.text(T(c.contract ? 'career.signedFranchise' : 'career.joined', { club: tm.name }), 0, 0, 64, '#ffd23f');
    ctx.restore();
    Crest.draw(ctx, tm.crest, cx - 560, 800, 180);
    Portrait.draw(ctx, c.player, cx + 560, 800, 180);
    R.text(T('career.joinedSub', { stage: CareerUI.pathwayLabel(c) }), cx, 780, 34, '#ffffff', 'center', false);
    if (c.contract) R.text(T('offer.salaryLine', { n: c.contract.salary }), cx, 830, 28, '#ffe28a', 'center', false);
    this.buttons.draw();
    Effects.drawParticles(ctx);
  },
};

// =====================================================================================
const CareerOffersScene = {
  buttons: new ButtonList(),
  _t: 0,
  enter(params) {
    CareerAssets.ensure();
    this.slot = params.slot; this.career = params.career; this._t = 0;
    const offers = this.career.offers || [], cx = CONFIG.LOGICAL_W / 2, w = 560, gap = 30, x0 = cx - (offers.length * w + (offers.length - 1) * gap) / 2;
    this.cards = offers.map((o, i) => ({ o, x: x0 + i * (w + gap), y: 190, w, h: 700 }));
    this.buttons.clear();
    this.cards.forEach((k, i) => this.buttons.add('offer.sign', k.x + 60, k.y + k.h - 130, k.w - 120, 104, () => this._sign(k.o), { size: 40, color: '#9cff6a' }).tag = 'sign' + i);
    this.buttons.add('gear.back', Display.safe.left + 24, Display.safe.top + 24, 220, 90, () => Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true }), { size: 34, color: '#e9eef5' });
  },
  _sign(o) {
    const c = this.career;
    Career.signFranchise(c, o);
    // the coach perk: that coach joins the account and becomes your coach
    Coaches.unlock(Save.data, o.coach);
    Coaches.hire(c, Save.data, o.coach);
    CareerSave.save(c, this.slot);
    Scenes.go('careerjoin', { slot: this.slot, career: c });
  },
  update(dt) { this._t += dt; },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Escape') Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true }); },
  render(ctx) {
    const c = this.career, cx = CONFIG.LOGICAL_W / 2;
    CareerUI.bg(ctx, 'bg_scout_room', 0.6);
    Sprites.ui('stage_contract_offer', cx - 520, 80, 120, 110);
    R.text(T('offer.title'), cx, 70, 56, '#ffffff');
    R.text(T('offer.sub', { n: this.cards.length }), cx, 128, 24, '#ffe28a', 'center', false);
    for (const k of this.cards) {
      const o = k.o, t = Tournament.team(o.franchise);
      R.panel(k.x, k.y, k.w, k.h, 'rgba(10,22,40,0.94)', t.colours[1]);
      R.roundRect(k.x + 8, k.y + 8, k.w - 16, 12, 6, t.colours[0]);
      Sprites.ui(t.crest, k.x + k.w / 2, k.y + 130, 200, 200);
      R.text(Tournament.name(o.franchise), k.x + k.w / 2, k.y + 258, 36, '#ffffff');
      const rows = [
        [T('offer.role'), T('career.youBatAt', { n: o.batPos }) + (o.spell ? ' · ' + T('spell.' + o.spell) : '')],
        [T('offer.salary'), T('offer.salaryVal', { n: o.salary })],
        [T('offer.objective'), EventText.contract(o.objective)],
        [T('offer.coach'), T('coach.' + o.coach)],
        [T('offer.reward'), T('gear.' + o.reward)],
      ];
      rows.forEach(([a, b], i) => {
        const y = k.y + 318 + i * 50;
        R.text(a, k.x + 30, y, 20, '#9be7ff', 'left', false);
        CareerTreeScene._fit(b, k.x + 200, y, k.w - 230, 22, '#ffffff');
      });
      Sprites.ui(Coaches.coach(o.coach).art, k.x + k.w - 70, k.y + 70, 110, 110);
    }
    this.buttons.draw();
  },
};
EventText.contract = (o) => T('offer.obj.' + o.id, { n: o.n });

// A side's crest in a table (a picture, or a built club crest for My XI).
const TourCrest = {
  draw(id, x, y, w) {
    const X = Tournament.extra[id];
    if (X && X.crest && !X.crest.image) { Crest.draw(R.ctx, X.crest, x, y, w); return; }
    Sprites.ui(Tournament.crest(id), x, y, w, w);
  },
};

// =====================================================================================
const CareerTableScene = {
  buttons: new ButtonList(),
  enter(params) {
    CareerAssets.ensure();
    this.slot = params.slot; this.career = params.career;
    this.buttons.clear();
    this.buttons.add('career.close', Display.safe.left + 24, Display.safe.top + 24, 220, 90, () => Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true }), { size: 34, color: '#e9eef5' });
  },
  update() {},
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Escape') Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true }); },
  render(ctx) {
    const c = this.career, tour = c.tour, cx = CONFIG.LOGICAL_W / 2;
    CareerUI.bg(ctx, 'bg_scout_room', 0.7);
    const F = Tournament.F(Tournament.fmt(tour)), world = (F.advance || 1) === 2;   // (World Nations, My XI cups: quarter-finals)
    R.text(this.career.titleText || T(Tournament.fmt(tour) === 'world' ? 'table.titleWorld' : 'table.title'), cx, 60, 50, '#ffffff');
    if (!tour) return this.buttons.draw();
    R.text(T(world ? 'table.subWorld' : 'table.sub'), cx, 112, 22, '#ffe28a', 'center', false);
    const adv = world ? 2 : 1, rowH = F.perGroup === 3 ? 96 : 78;
    // the four groups
    for (let gi = 0; gi < tour.groups.length; gi++) {
      const x = cx - 900 + (gi % 2) * 620, y = 150 + Math.floor(gi / 2) * 440, rows = Tournament.standings(tour, gi);
      R.panel(x, y, 600, 420, gi === tour.myGroup ? 'rgba(30,50,30,0.94)' : 'rgba(10,22,40,0.92)', gi === tour.myGroup ? '#9cff6a' : 'rgba(255,255,255,0.3)');
      R.text(T('table.group', { g: 'ABCD'[gi] }), x + 24, y + 34, 28, '#ffd23f', 'left');
      ['P', 'W', 'L', 'PTS', 'NRR'].forEach((h, i) => R.text(T('table.h.' + h.toLowerCase()), x + 330 + i * 56, y + 34, 16, '#9be7ff', 'center', false));
      rows.forEach((r, i) => {
        const ry = y + 92 + i * rowH, me = r.id === tour.mine;
        if (i < adv) R.roundRect(x + 10, ry - 34, 580, 68, 16, 'rgba(255,210,63,0.16)');
        TourCrest.draw((r.id), x + 52, ry, 60, 60);
        CareerTreeScene._fit(Tournament.name(r.id), x + 92, ry, 200, 22, me ? '#9cff6a' : '#ffffff');
        [r.p, r.w, r.l, r.pts, (r.nrr >= 0 ? '+' : '') + r.nrr.toFixed(2)].forEach((v, j) => R.text(String(v), x + 330 + j * 56, ry, j === 3 ? 24 : 18, j === 3 ? '#ffd23f' : '#ffffff', 'center', false));
      });
      const ly = y + 92 + (adv - 0.5) * rowH;
      R.line(x + 20, ly, x + 580, ly, '#ffd23f', 2);
      R.text(T(world ? 'table.qualifyWorld' : 'table.qualify'), x + 580, ly + 15, 14, '#ffd23f', 'right', false);
    }
    // the knockouts (quarter-finals only in the World Nations Championship)
    const bx = cx + 360, rounds = (world ? ['quarter', 'semi', 'final'] : ['semi', 'final']);
    R.panel(bx, 150, 540, 880, 'rgba(10,22,40,0.94)', '#ffd23f');
    R.text(T('table.knockouts'), bx + 270, 185, 28, '#ffd23f');
    const size = { quarter: 4, semi: 2, final: 1 };
    const bh = world ? 76 : 150;
    let y = 225;
    for (const rd of rounds) {
      R.text(T('table.round.' + rd), bx + 270, y + 6, 18, '#9be7ff', 'center', false);
      y += 20;
      const pairs = tour.bracket[rd] || [];
      for (let i = 0; i < size[rd]; i++) {
        const pr = pairs[i], m = pr && tour.results.find((q) => q.round === rd && ((q.a === pr[0] && q.b === pr[1]) || (q.a === pr[1] && q.b === pr[0])));
        R.roundRect(bx + 30, y, 480, bh - 8, 14, 'rgba(20,34,56,0.95)', 'rgba(255,255,255,0.3)', 2);
        if (!pr) R.text(T('table.tbd'), bx + 270, y + (bh - 8) / 2, 20, '#8a96a3', 'center', false);
        else pr.forEach((id, j) => {
          if (!id) return;
          const yy = y + (world ? 18 + j * 32 : 42 + j * 66), won = m && m.winner === id, sz = world ? 28 : 52;
          TourCrest.draw((id), bx + 70, yy, sz, sz);
          CareerTreeScene._fit(Tournament.name(id), bx + 100, yy, 280, world ? 18 : 22, id === tour.mine ? '#9cff6a' : won ? '#ffd23f' : '#ffffff');
          if (m) R.text(String(m.a === id ? m.ra : m.rb), bx + 470, yy, world ? 20 : 26, won ? '#ffd23f' : '#b8c6d6', 'right');
        });
        y += bh;
      }
      y += 10;
    }
    const champ = Tournament.champion(tour);
    if (champ) R.text(T('table.champion', { name: Tournament.name(champ) }), bx + 270, 990, 24, champ === tour.mine ? '#9cff6a' : '#ffd23f');
    if (tour.phase === 'done' && champ !== tour.mine) R.text(T('table.youReached', { r: T('table.reach.' + tour.best) }), bx + 270, 1018, 18, '#d8e4f0', 'center', false);
    this.buttons.draw();
  },
};

// =====================================================================================
const CareerCoachScene = {
  career: null, slot: 1, sel: null, popup: null, flash: null, _t: 0,
  buttons: new ButtonList(), popBtns: new ButtonList(), cards: [],

  enter(params) {
    CareerAssets.ensure();
    this.slot = params.slot || this.slot; this.career = params.career || this.career;
    this.sel = Coaches.active(this.career) || 'power'; this.popup = null; this.flash = null; this._t = 0;
    this._layout();
  },
  _layout() {
    const b = this.buttons, s = Display.safe, c = this.career, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go('careerhome', { slot: this.slot, career: c, stay: true }), { size: 32, color: '#e9eef5' });
    this.cards = Coaches.list().map((k, i) => ({ id: k.id, x: cx - 900 + (i % 6) * 190, y: 150 + Math.floor(i / 6) * 330, w: 178, h: 316 }));
    const rx = cx + 280;
    b.add(() => this._hireLabel(), rx + 30, 800, 560, 104, () => this._hire(), { size: 36, color: '#9cff6a', disabled: () => !this._canHire() }).tag = 'hire';
    b.add('coach.respec', rx + 30, 920, 560, 110, () => this._openRespec(), { size: 30, color: '#ffd9a0', icon: 'icon_respec',
      sub: () => T('tree.respecSub', { n: SkillTree.respecCost(c) }) }).tag = 'respec';
  },
  _canHire() { return Coaches.active(this.career) !== this.sel && Coaches.canHire(this.career, Save.data, this.sel).ok; },
  _hireLabel() {
    if (Coaches.active(this.career) === this.sel) return T('coach.current');
    const chk = Coaches.canHire(this.career, Save.data, this.sel);
    return chk.ok ? T('coach.hire') : chk.reason === 'tier' ? T('gear.needsStage', chk.params) : T('coach.locked');
  },
  _hire() {
    if (!Coaches.hire(this.career, Save.data, this.sel).ok) { Sound.play('edge'); return; }
    CareerSave.save(this.career, this.slot);
    Sound.play('fanfare');
    this.flash = { text: T('coach.hired', { name: T('coach.' + this.sel) }), t: 0 };
  },
  // ---- the Wicket Tree respec (between stages, costs coins) ----
  _openRespec() {
    const c = this.career, chk = SkillTree.canRespec(c, Save.data.currencies.coins || 0);
    if (!chk.ok && chk.reason !== 'coins') { this.flash = { text: T('tree.respec.' + chk.reason), t: 0, bad: true }; Sound.play('edge'); return; }
    this.popup = 'respec';
    const b = this.popBtns, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    b.add('tree.respecYes', cx - 440, 760, 400, 110, () => this._respec(), { size: 44, color: '#ffb36b', disabled: () => !SkillTree.canRespec(c, Save.data.currencies.coins || 0).ok }).tag = 'respecYes';
    b.add('tree.respecNo', cx + 40, 760, 400, 110, () => { this.popup = null; }, { size: 44, color: '#e9eef5' });
  },
  _respec() {
    const c = this.career;
    if (!SkillTree.canRespec(c, Save.data.currencies.coins || 0).ok) return;
    Save.data.currencies.coins -= SkillTree.respec(c);
    CareerSave.save(c, this.slot);
    this.popup = null;
    Sound.play('fanfare');
    this.flash = { text: T('tree.respecDone'), t: 0 };
  },

  _list() { return this.popup ? this.popBtns : this.buttons; },
  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); if (!this._list().down(id, x, y)) this._down = { id, x, y }; },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this._list().move(id, x, y); },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this._list().up(id)) return;
    const d = this._down; this._down = null;
    if (!d || d.id !== id || this.popup) return;
    const k = this.cards.find((q) => CareerScene.inBox(q, d.x, d.y));
    if (k) { Sound.play('uiTap'); this.sel = k.id; }
  },
  keyDown(code) { if (code === 'Escape') { if (this.popup) this.popup = null; else Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true }); } },
  update(dt) { this._t += dt; if (this.flash) { this.flash.t += dt; if (this.flash.t > 2.2) this.flash = null; } },

  render(ctx) {
    const c = this.career, s = Display.safe, cx = CONFIG.LOGICAL_W / 2, S = Save.data;
    CareerUI.bg(ctx, 'bg_training_academy', 0.6);
    if (!c) return;
    Sprites.ui('meta_coach', cx - 330, s.top + 62, 100, 100);
    R.text(T('coach.title'), cx - 120, s.top + 50, 52, '#ffffff');
    const cur = Coaches.active(c);
    R.text(cur ? T('coach.yourCoach', { name: T('coach.' + cur) }) : T('coach.none'), cx - 120, s.top + 98, 22, '#ffe28a', 'center', false);
    GearUI.coins(s.right - 30, s.top + 29, 'right');
    for (const k of this.cards) {
      const K = Coaches.coach(k.id), open = Coaches.unlocked(S, k.id), hidden = K.hidden && !open, on = cur === k.id, picked = this.sel === k.id;
      R.panel(k.x, k.y, k.w, k.h, picked ? 'rgba(40,60,90,0.97)' : 'rgba(10,22,40,0.9)', on ? '#9cff6a' : picked ? '#ffffff' : 'rgba(255,255,255,0.25)');
      if (hidden) { const cv = GearUI.silhouette(K.art); if (cv) { const z = Math.min(150 / cv.width, 200 / cv.height); ctx.drawImage(cv, k.x + k.w / 2 - cv.width * z / 2, k.y + 120 - cv.height * z / 2, cv.width * z, cv.height * z); } }
      else Sprites.ui(K.art, k.x + k.w / 2, k.y + 120, 170, 210, { alpha: open ? 1 : 0.35 });
      CareerTreeScene._fit(hidden ? T('collection.unknown') : T('coach.' + k.id), k.x + 10, k.y + 250, k.w - 20, 20, open ? '#ffffff' : '#8a96a3');
      const L = Coaches.level(S, k.id);
      for (let i = 0; i < 3; i++) R.circle(k.x + k.w / 2 - 30 + i * 30, k.y + 284, 9, i < L ? '#ffd23f' : 'rgba(255,255,255,0.18)');
      if (on) R.roundRect(k.x + 6, k.y + 6, 70, 26, 12, '#9cff6a', CONFIG.COLOR.ink, 2), R.text(T('gear.on'), k.x + 41, k.y + 19, 15, CONFIG.COLOR.ink, 'center', false);
      if (!open && !hidden) R.text(T('coach.lockedShort'), k.x + k.w / 2, k.y + 120, 20, '#ff9d7a');
    }
    // details
    const rx = cx + 280, K = Coaches.coach(this.sel), open = Coaches.unlocked(S, this.sel), hidden = K.hidden && !open;
    R.panel(rx, 150, 620, 630, 'rgba(8,16,30,0.95)', '#ffd23f');
    if (!hidden) Sprites.ui(K.art, rx + 110, 290, 190, 240);
    R.text(hidden ? T('collection.unknown') : T('coach.' + K.id), rx + 230, 200, 34, '#ffffff', 'left');
    R.text(T('coach.cat.' + K.id), rx + 230, 240, 20, '#ffd23f', 'left', false);
    let y = 290;
    if (hidden) GearUI.wrap(T('coach.hiddenHint'), rx + 230, y, 360, 22, '#b8c6d6');
    else {
      R.text(T('coach.specialty'), rx + 230, y, 18, '#9be7ff', 'left', false); y += 28;
      y = GearUI.wrap(K.drills.map((d) => T('train.' + d)).join(', '), rx + 230, y, 370, 20, '#ffffff') + 40;
      R.text(T('coach.passive'), rx + 230, y, 18, '#9be7ff', 'left', false); y += 28;
      y = GearUI.wrap(T('coach.' + K.id + '.desc'), rx + 230, y, 370, 20, '#ffffff') + 40;
      y = Math.max(y, 450);
      const L = Coaches.level(S, K.id), M = COACH_DATA.mastery.levels, u = Coaches.uses(S, K.id);
      R.text(T('coach.mastery', { l: L, u, next: L < 3 ? M[L] : '-' }), rx + 30, y, 22, '#ffe28a', 'left', false); y += 34;
      GearUI.wrap(T('coach.masteryNote'), rx + 30, y, 560, 18, '#b8c6d6');
      if (!open) R.text(T('coach.unlock.' + (K.unlock.stage ? 'stage' : K.unlock), { n: K.unlock.stage }), rx + 310, 740, 22, '#ff9d7a');
    }
    this.buttons.draw();
    if (!SkillTree.betweenStages(c)) R.text(T('coach.respecWhen'), rx + 310, 1050, 16, '#b8c6d6', 'center', false);
    if (this.popup) this._drawRespec(ctx);
    if (this.flash) {
      const a = Math.max(0, Math.min(1, (2.2 - this.flash.t) / 0.4));
      ctx.save(); ctx.globalAlpha = a; R.text(this.flash.text, cx - 120, 140, 38, this.flash.bad ? '#ff9d7a' : '#9cff6a'); ctx.restore();
    }
  },
  _drawRespec(ctx) {
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2, c = this.career;
    ctx.fillStyle = 'rgba(3,10,20,0.82)'; ctx.fillRect(v.x, v.y, v.w, v.h);
    R.panel(cx - 560, 170, 1120, 780, 'rgba(10,22,40,0.97)', '#ffd23f');
    TreeArt.draw(SKILL_TREE_DATA.art.respec, cx, 300, 140);
    R.text(T('tree.respecTitle'), cx, 420, 54, '#ffffff');
    GearUI.wrap(T('tree.respecBody'), cx - 480, 510, 960, 30, '#d8e4f0');
    const coins = Save.data.currencies.coins || 0, cost = SkillTree.respecCost(c);
    R.text(T('tree.respecCost', { n: cost, have: coins }), cx, 660, 32, coins >= cost ? '#ffe28a' : '#ff9d7a');
    this.popBtns.draw();
  },
};
