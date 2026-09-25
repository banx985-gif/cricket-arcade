// Cricket Arcade — My XI screens (M10, plan 15, 5.5F, 5.17–5.20).
//   MyXICreateScene   club creation: name, two colours, a crest, the home stadium
//   MyXIHomeScene     the club, trophies, the competition ladder, the next match
//   MyXISquadScene    the library (filters), the Active Squad (15), rival recruits
//   MyXILineupScene   batting order, keeper, captain, power hitter, closer, bowlers, chemistry
//   MyXITableScene    the league table or the cup bracket
//   MyXIResultScene   after a match: the competition, rewards, trophies
//   MyXIEndingScene   the first Legends Invitational win: trophy, Legacy montage, credits
//   TacticBar         the between-over calls in a My XI match (matchbat / matchbowl)

const MyXIAssets = { loaded: false, ensure() { if (!this.loaded) { this.loaded = true; Sprites.loadGroup('myxi'); CareerAssets.ensure(); LegacyAssets.ensure(); } } };
const MyXIUI = {
  crest(ctx, crest, cx, cy, size) { Crest.draw(ctx, crest, cx, cy, size); },
  roleLabel(v) { return T('myxi.role.' + (v.keeper ? 'keeper' : v.role)); },
  kindColour: { legacy: '#ffd23f', rival: '#ff8f6b', starter: '#b8c6d6', recruit: '#9be7ff' },
  // A small player chip (portrait / rival art / initials) at (x, y).
  face(ctx, v, x, y, size) {
    if (v.kind === 'legacy') { Portrait.draw(ctx, v.look, x, y, size); return; }
    if (v.kind === 'rival') { Sprites.ui(v.art, x, y, size, size); return; }
    R.circle(x, y, size * 0.45, '#1d3350', MyXIUI.kindColour[v.kind], 3);
    R.text(v.name.split(' ').map((w) => w[0]).join('').slice(0, 2), x, y, size * 0.34, '#ffffff');
  },
};

// =====================================================================================
const MyXICreateScene = {
  d: null, done: false, _t: 0,
  buttons: new ButtonList(),
  enter() {
    MyXIAssets.ensure();
    const r = makeRng(RNG.freshSeed()), C = MYXI_DATA;
    this.d = { name: this._randomName(r), colours: [C.colours[0], C.colours[7]], style: 'build', shield: 0, emblem: 0, badge: 0, stadium: 'local_oval' };
    this.done = false; this._t = 0;
    this._layout();
  },
  _randomName(r) {
    const O = ORIGIN_PACKS.origins[r.pick(Object.keys(ORIGIN_PACKS.origins))];
    return r.pick(O.clubFragments) + ' ' + r.pick(ORIGIN_PACKS.clubSuffixes);
  },
  crest() {
    const d = this.d, C = MYXI_DATA.crest;
    return d.style === 'badge' ? { image: C.badges[d.badge], colours: d.colours.slice() } : { shield: C.shields[d.shield], emblem: C.emblems[d.emblem], colours: d.colours.slice() };
  },
  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2, d = this.d, C = MYXI_DATA;
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go('title'), { size: 32, color: '#e9eef5' });
    if (this.done) { b.add('myxi.toHome', cx - 280, s.bottom - 150, 560, 120, () => Scenes.go('myxihome'), { size: 44, color: '#9cff6a' }); return; }
    b.add('myxi.nameEdit', cx - 860, 200, 260, 90, () => this._editName(), { size: 28, color: '#e9eef5' });
    b.add('create.random', cx - 580, 200, 200, 90, () => { this.d.name = this._randomName(makeRng(RNG.freshSeed())); }, { size: 26, color: '#e9eef5' });
    // colours
    C.colours.forEach((col, i) => {
      for (let k = 0; k < 2; k++) b.add(() => '', cx - 860 + i * 74, 380 + k * 100, 66, 88, () => { d.colours[k] = col; }, { color: col }).tag = 'colour' + k + '_' + i;
    });
    // crest
    const arrow = (label, x, y, fn) => b.add(() => label, x, y, 90, 90, fn, { size: 40, color: '#e9eef5' });
    b.add(() => T(d.style === 'badge' ? 'myxi.crestBuild' : 'myxi.crestBadge'), cx + 120, 180, 330, 90, () => { d.style = d.style === 'badge' ? 'build' : 'badge'; this._layout(); }, { size: 24, color: '#9be7ff' });
    if (d.style === 'build') {
      arrow('‹', cx + 120, 360, () => { d.shield = (d.shield + C.crest.shields.length - 1) % C.crest.shields.length; });
      arrow('›', cx + 770, 360, () => { d.shield = (d.shield + 1) % C.crest.shields.length; });
      arrow('‹', cx + 120, 520, () => { d.emblem = (d.emblem + C.crest.emblems.length - 1) % C.crest.emblems.length; });
      arrow('›', cx + 770, 520, () => { d.emblem = (d.emblem + 1) % C.crest.emblems.length; });
    } else {
      arrow('‹', cx + 120, 440, () => { d.badge = (d.badge + C.crest.badges.length - 1) % C.crest.badges.length; });
      arrow('›', cx + 770, 440, () => { d.badge = (d.badge + 1) % C.crest.badges.length; });
    }
    // stadium: those unlocked (the rest come as My XI rewards)
    C.stadiums.forEach((st, i) => b.add(() => '', cx - 860 + i * 175, 700, 165, 150, () => { if (st.start) d.stadium = st.id; }, { color: 'rgba(0,0,0,0)' }).invisible = true);
    b.add('myxi.create', cx + 250, s.bottom - 150, 560, 120, () => this._create(), { size: 44, color: '#9cff6a' }).tag = 'create';
  },
  _editName() {
    let v = null;
    try { v = window.prompt(T('myxi.namePrompt'), this.d.name); } catch (e) { v = null; }
    if (v && v.trim()) this.d.name = v.trim().slice(0, 24);
  },
  _create() {
    const d = this.d;
    MyXI.create(Save.data, { name: d.name, colours: d.colours, crest: this.crest(), stadium: d.stadium }, RNG.freshSeed());
    Achievements.checkAccount(Save.data, null);
    Save.write();
    this.done = true; this._t = 0;
    Effects.init();
    Sound.play('fanfare'); Sound.play('crowdRoar');
    this._layout();
  },
  update(dt) { this._t += dt; Effects.update(dt); if (this.done && this._t % 0.5 < dt) Effects.sparks(300 + ((this._t * 977) % 1320), 180, 14, '#ffd23f', 700); },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Escape') Scenes.go('title'); },
  render(ctx) {
    const cx = CONFIG.LOGICAL_W / 2, d = this.d, C = MYXI_DATA;
    CareerUI.bg(ctx, 'bg_locker_room', 0.6);
    if (this.done) {
      const club = MyXI.club(Save.data);
      Sprites.ui('reward_first_myxi', cx, 430, 620, 560);
      R.text(T('myxi.founded', { name: club.name }), cx, 90, 56, '#ffd23f');
      MyXIUI.crest(ctx, club.crest, cx - 560, 430, 260);
      R.text(T('myxi.foundedSub'), cx, 780, 28, '#ffffff', 'center', false);
      this.buttons.draw(); Effects.drawParticles(ctx); return;
    }
    R.text(T('myxi.createTitle'), cx, 80, 56, '#ffffff');
    R.text(T('myxi.createSub'), cx, 130, 22, '#ffe28a', 'center', false);
    R.text(T('myxi.name'), cx - 860, 175, 22, '#9be7ff', 'left', false);
    R.text(d.name, cx - 360, 245, 40, '#ffffff', 'left');
    R.text(T('myxi.colours'), cx - 860, 350, 22, '#9be7ff', 'left', false);
    for (let k = 0; k < 2; k++) {
      const i = C.colours.indexOf(d.colours[k]);
      if (i >= 0) R.roundRect(cx - 866 + i * 74, 374 + k * 100, 78, 100, 16, null, '#ffffff', 5);
    }
    R.text(T('myxi.stadium'), cx - 860, 675, 22, '#9be7ff', 'left', false);
    C.stadiums.forEach((st, i) => {
      const x = cx - 860 + i * 175, on = d.stadium === st.id;
      R.roundRect(x, 700, 165, 150, 16, 'rgba(10,22,40,0.9)', on ? '#ffd23f' : 'rgba(255,255,255,0.2)', on ? 5 : 2);
      Sprites.ui(st.art, x + 82, 760, 150, 110, { alpha: st.start ? 1 : 0.35 });
      R.text(st.start ? T('stadium.' + st.id) : T('myxi.stadiumLocked'), x + 82, 832, 14, st.start ? '#ffffff' : '#8a96a3', 'center', false);
    });
    R.panel(cx + 90, 150, 800, 510, 'rgba(10,22,40,0.9)', '#ffd23f');
    MyXIUI.crest(ctx, this.crest(), cx + 490, 460, 290);
    R.text(T('myxi.crest'), cx + 490, 300, 22, '#9be7ff', 'center', false);
    if (d.style === 'build') { R.text(T('myxi.shieldLbl'), cx + 260, 405, 18, '#9be7ff', 'center', false); R.text(T('myxi.emblemLbl'), cx + 260, 565, 18, '#9be7ff', 'center', false); }
    this.buttons.draw();
  },
};

// =====================================================================================
const MyXIHomeScene = {
  buttons: new ButtonList(), _t: 0, flash: null,
  enter() {
    MyXIAssets.ensure();
    const S = Save.data;
    if (!MyXI.club(S)) { Scenes.go('myxicreate'); return; }
    MyXI.syncLegacy(S);
    this._t = 0;
    this._layout();
  },
  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2, S = Save.data, club = MyXI.club(S);
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go('title'), { size: 32, color: '#e9eef5' });
    b.add('myxi.squad', s.right - 520, 150, 490, 120, () => Scenes.go('myxisquad'), { size: 38, color: '#9be7ff', sub: () => T('myxi.squadSub', { a: club.active.length, n: club.library.length }) });
    b.add('myxi.lineup', s.right - 520, 290, 490, 120, () => Scenes.go('myxilineup'), { size: 38, color: '#ffd23f',
      sub: () => { const v = MyXI.validate(S, (MyXI.next(S) || {}).fmt); return v.ok ? T('myxi.lineupOk') : T('myxi.lineupBad'); } });
    b.add('myxi.recruit', s.right - 520, 430, 490, 110, () => Scenes.go('myxisquad', { tab: 'recruit' }), { size: 32, color: '#ff8f6b',
      sub: () => T('myxi.recruitSub', { n: MyXI.recruitable(S).length }) });
    // the competition ladder
    MYXI_DATA.competitions.forEach((C, i) => {
      const x = cx - 520, y = 150 + i * 118;
      b.add(() => '', x, y, 600, 106, () => this._comp(C.id), { color: 'rgba(0,0,0,0)', disabled: () => !MyXI.compOpen(S, C.id) }).invisible = true;
    });
    const run = club.run;
    if (run && run.status === 'active') {
      b.add('myxi.play', s.right - 520, s.bottom - 180, 490, 160, () => this._play(), { size: 50, color: '#9cff6a' }).tag = 'play';
      b.add('myxi.quickSim', s.right - 520, s.bottom - 300, 240, 100, () => this._quick(), { size: 24, color: '#e9eef5', disabled: () => !MyXI.quickSimCheck(S, MyXI.next(S)).ok }).tag = 'quick';
      b.add('myxi.table', s.right - 270, s.bottom - 300, 240, 100, () => Scenes.go('myxitable'), { size: 24, color: '#e9eef5' });
    }
  },
  _comp(id) {
    const S = Save.data, club = MyXI.club(S);
    if (club.run && club.run.status === 'active' && club.run.comp === id) return;
    if (club.run && club.run.status === 'active') { this.flash = { text: T('myxi.finishFirst'), t: 0 }; Sound.play('edge'); return; }
    MyXI.startComp(S, id);
    Save.write();
    Sound.play('fanfare');
    this._layout();
  },
  _play() {
    const S = Save.data, v = MyXI.validate(S, MyXI.next(S).fmt);
    if (!v.ok) { this.flash = { text: T('myxi.fixLineup'), t: 0 }; Sound.play('edge'); Scenes.go('myxilineup'); return; }
    const scene = MyXIMatch.start(S);
    if (scene) Scenes.go('toss', { keep: true });
  },
  _quick() {
    const S = Save.data;
    if (!MyXI.quickSimCheck(S, MyXI.next(S)).ok || !MyXI.validate(S, MyXI.next(S).fmt).ok) return;
    Scenes.go('myxiresult', Object.assign(MyXIMatch.quickSim(S), { quick: true }));
  },
  update(dt) { this._t += dt; if (this.flash) { this.flash.t += dt; if (this.flash.t > 2.2) this.flash = null; } },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Escape') Scenes.go('title'); },
  render(ctx) {
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, S = Save.data, club = MyXI.club(S);
    CareerUI.bg(ctx, 'bg_stadium_plaza_sunset', 0.55);
    if (!club) return;
    // the club
    R.panel(s.left + 30, 130, 520, 900, 'rgba(10,22,40,0.9)', club.colours[0]);
    MyXIUI.crest(ctx, club.crest, s.left + 290, 290, 250);
    CareerTreeScene._fit(club.name, s.left + 60, 450, 460, 40, '#ffffff', true);
    const st = MYXI_DATA.stadiums.find((x) => x.id === club.stadium);
    Sprites.ui(st.art, s.left + 290, 560, 300, 150);
    R.text(T('stadium.' + st.id), s.left + 290, 650, 20, '#d8e4f0', 'center', false);
    R.text(T('myxi.trophies', { n: club.trophies.length }), s.left + 290, 700, 24, '#ffd23f');
    MYXI_DATA.competitions.forEach((C, i) => {
      const won = club.trophies.filter((t) => t === C.id).length;
      Sprites.ui(C.trophy, s.left + 90 + (i % 3) * 150, 790 + Math.floor(i / 3) * 130, 110, 120, { alpha: won ? 1 : 0.2 });
      if (won > 1) R.text('×' + won, s.left + 130 + (i % 3) * 150, 840 + Math.floor(i / 3) * 130, 20, '#ffd23f');
    });
    // the ladder
    R.text(T('myxi.ladder'), cx - 220, 110, 28, '#ffffff');
    MYXI_DATA.competitions.forEach((C, i) => {
      const x = cx - 520, y = 150 + i * 118, open = MyXI.compOpen(S, C.id), rec = club.comps[C.id] || {}, cur = club.run && club.run.comp === C.id && club.run.status === 'active';
      R.panel(x, y, 600, 106, cur ? 'rgba(40,70,30,0.95)' : open ? 'rgba(10,22,40,0.92)' : 'rgba(10,14,22,0.8)', cur ? '#9cff6a' : open ? '#ffd23f' : 'rgba(255,255,255,0.15)');
      Sprites.ui(C.trophy, x + 55, y + 53, 70, 90, { alpha: open ? 1 : 0.3 });
      R.text(T('myxi.comp.' + C.id), x + 110, y + 34, 26, open ? '#ffffff' : '#8a96a3', 'left');
      R.text(T('myxi.compLine.' + C.kind, { o: MATCH_DATA.formats[C.fmt].overs }) + (C.finalFmt ? T('myxi.finalOvers', { o: MATCH_DATA.formats[C.finalFmt].overs }) : ''), x + 110, y + 72, 16, '#b8c6d6', 'left', false);
      const tag = cur ? T('myxi.inProgress') : !open ? T('myxi.lockedComp') : rec.cleared ? T('myxi.clearedN', { n: rec.cleared }) : T('myxi.tapToStart');
      R.text(tag, x + 585, y + 53, 18, cur ? '#9cff6a' : rec.cleared ? '#ffd23f' : '#9be7ff', 'right', false);
    });
    // the next match
    const run = club.run, fx = MyXI.next(S);
    if (run && run.status === 'active' && fx) {
      const O = run.teams[fx.opp], x = s.right - 520;
      R.panel(x, 556, 490, 214, 'rgba(10,22,40,0.94)', fx.rival ? '#ff8f6b' : '#ffd23f');
      R.text(T('myxi.nextMatch', { k: T('myxi.kind.' + fx.kind), o: MATCH_DATA.formats[fx.fmt].overs }), x + 245, 584, 20, '#ffe28a', 'center', false);
      MyXIUI.crest(ctx, club.crest, x + 80, 650, 90); MyXIUI.crest(ctx, O.crest, x + 410, 650, 90);
      R.text(T('career.vs'), x + 245, 640, 30, '#ffffff');
      CareerTreeScene._fit(O.name + '  (' + T('myxi.oppRating', { n: O.rating }) + ')', x + 130, 675, 230, 18, '#ffffff');
      if (fx.rival) R.text(T('myxi.withRival', { name: T('rival.' + fx.rival) }), x + 245, 715, 18, '#ff8f6b', 'center', false);
      const q = MyXI.quickSimCheck(S, fx);
      if (!q.ok) CareerTreeScene._fit(T('myxi.qs.' + q.reason), x + 16, 748, 458, 14, '#8a96a3');
    } else if (run && run.status !== 'active') {
      R.text(T(run.status === 'cleared' ? 'myxi.runCleared' : 'myxi.runFailed', { c: T('myxi.comp.' + run.comp) }), s.right - 275, 700, 24, run.status === 'cleared' ? '#9cff6a' : '#ff9d7a', 'center');
      R.text(T('myxi.pickComp'), s.right - 275, 740, 20, '#d8e4f0', 'center', false);
    } else R.text(T('myxi.pickComp'), s.right - 275, 700, 22, '#d8e4f0', 'center', false);
    if (club.ended) R.text(T('myxi.postgame'), cx - 220, 870, 20, '#ffd23f', 'center', false);
    this.buttons.draw();
    if (this.flash) R.text(this.flash.text, cx, 1040, 30, '#ff9d7a');
  },
};

// =====================================================================================
const MyXISquadScene = {
  tab: 'all', sel: null, page: 0,
  buttons: new ButtonList(), cards: [],
  TABS: ['all', 'legacy', 'rival', 'starter', 'recruit', 'recruitRivals'],
  PER: 12,
  enter(params) {
    MyXIAssets.ensure();
    this.tab = params && params.tab === 'recruit' ? 'recruitRivals' : 'all';
    this.sel = null; this.page = 0;
    this._layout();
  },
  _items() {
    const S = Save.data;
    if (this.tab === 'recruitRivals') return MyXI.recruitable(S).map((id) => ({ id: 'R:' + id, rivalId: id, kind: 'rival', name: T('rival.' + id), recruit: true, art: Rivals.rival(id).art }));
    return MyXI.library(S, this.tab);
  },
  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2, S = Save.data, club = MyXI.club(S);
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go('myxihome'), { size: 32, color: '#e9eef5' });
    this.TABS.forEach((t, i) => b.add(() => T('myxi.tab.' + t), cx - 900 + i * 205, 140, 195, 80, () => { this.tab = t; this.page = 0; this.sel = null; this._layout(); },
      { size: 18, color: this.tab === t ? '#ffd23f' : '#e9eef5' }));
    const items = this._items();
    this.cards = items.slice(this.page * this.PER, (this.page + 1) * this.PER).map((v, i) => ({ v, x: cx - 900 + (i % 4) * 300, y: 240 + Math.floor(i / 4) * 230, w: 285, h: 218 }));
    const pages = Math.ceil(items.length / this.PER);
    if (pages > 1) {
      b.add(() => '‹', cx - 900, s.bottom - 110, 120, 90, () => { this.page = (this.page + pages - 1) % pages; this._layout(); }, { size: 50, color: '#e9eef5' });
      b.add(() => '›', cx + 180, s.bottom - 110, 120, 90, () => { this.page = (this.page + 1) % pages; this._layout(); }, { size: 50, color: '#e9eef5' });
    }
    const rx = cx + 330;
    b.add(() => this._actionLabel(), rx, s.bottom - 140, 560, 110, () => this._action(), { size: 34, color: '#9cff6a', disabled: () => !this.sel }).tag = 'action';
  },
  _actionLabel() {
    const S = Save.data, club = MyXI.club(S);
    if (!this.sel) return T('myxi.pickPlayer');
    if (this.sel.recruit) return T('myxi.recruitBtn');
    return club.active.includes(this.sel.id) ? T('myxi.toReserve') : T('myxi.toActive');
  },
  _action() {
    const S = Save.data, club = MyXI.club(S), v = this.sel;
    if (!v) return;
    let ok;
    if (v.recruit) { ok = MyXI.recruit(S, v.rivalId); if (ok) { this.flash = T('myxi.recruited', { name: v.name }); Achievements.checkAccount(S, null); } }
    else if (club.active.includes(v.id)) ok = MyXI.toReserve(S, v.id).ok;
    else { const r = MyXI.toActive(S, v.id); ok = r.ok; if (!ok) this.flash = T('myxi.why.' + r.reason); }
    Sound.play(ok ? 'uiTap' : 'edge');
    Save.write();
    this.sel = null;
    this._layout();
  },
  update() {},
  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); if (!this.buttons.down(id, x, y)) this._down = { id, x, y }; },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this.buttons.up(id)) return;
    const d = this._down; this._down = null;
    if (!d) return;
    const k = this.cards.find((q) => CareerScene.inBox(q, d.x, d.y));
    if (k) { this.sel = k.v; this.flash = null; Sound.play('uiTap'); }
  },
  keyDown(code) { if (code === 'Escape') Scenes.go('myxihome'); },
  render(ctx) {
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, S = Save.data, club = MyXI.club(S);
    CareerUI.bg(ctx, 'bg_locker_room', 0.65);
    R.text(T('myxi.squadTitle'), cx, 60, 50, '#ffffff');
    R.text(T('myxi.squadSub', { a: club.active.length, n: club.library.length }), cx, 110, 22, '#ffe28a', 'center', false);
    for (const k of this.cards) {
      const v = k.v, on = !v.recruit && club.active.includes(v.id), picked = this.sel && this.sel.id === v.id;
      R.panel(k.x, k.y, k.w, k.h, picked ? 'rgba(40,60,90,0.97)' : 'rgba(10,22,40,0.92)', picked ? '#ffffff' : MyXIUI.kindColour[v.kind]);
      if (v.recruit) { Sprites.ui(v.art, k.x + k.w / 2, k.y + 90, 150, 150); R.text(v.name, k.x + k.w / 2, k.y + 185, 22, '#ffffff'); continue; }
      MyXIUI.face(ctx, v, k.x + 70, k.y + 75, 110);
      R.text(String(MyXI.ovr(v)), k.x + k.w - 55, k.y + 60, 40, '#ffd23f');
      R.text(T('legacy.ovr'), k.x + k.w - 55, k.y + 92, 14, '#ffffff', 'center', false);
      CareerTreeScene._fit(v.name, k.x + 14, k.y + 150, k.w - 28, 22, '#ffffff');
      R.text(MyXIUI.roleLabel(v) + ' · ' + T('myxi.kindName.' + v.kind), k.x + 14, k.y + 180, 15, MyXIUI.kindColour[v.kind], 'left', false);
      if (on) { R.roundRect(k.x + 8, k.y + 8, 96, 28, 12, '#9cff6a', CONFIG.COLOR.ink, 2); R.text(T('myxi.inSquad'), k.x + 56, k.y + 22, 14, CONFIG.COLOR.ink, 'center', false); }
    }
    if (!this.cards.length) R.text(T(this.tab === 'recruitRivals' ? 'myxi.noRecruits' : 'myxi.noPlayers'), cx - 300, 480, 26, '#d8e4f0');
    // the selected player
    const rx = cx + 330, v = this.sel;
    R.panel(rx, 240, 560, s.bottom - 400, 'rgba(8,16,30,0.95)', '#ffd23f');
    if (v && !v.recruit) {
      MyXIUI.face(ctx, v, rx + 90, 330, 130);
      CareerTreeScene._fit(v.name, rx + 170, 300, 370, 30, '#ffffff', true);
      R.text(MyXIUI.roleLabel(v) + (v.family ? ' · ' + T(BOWLING_DATA.families[v.family].nameKey) : ''), rx + 170, 345, 18, '#9be7ff', 'left', false);
      const keys = PLAYER_DATA.stats.batting.concat(PLAYER_DATA.stats.bowling, PLAYER_DATA.stats.shared);
      keys.forEach((k, i) => {
        const x = rx + 30 + (i % 2) * 260, y = 420 + Math.floor(i / 2) * 40;
        R.text(T('stat.' + k), x, y, 15, '#d8e4f0', 'left', false);
        R.text(String(v.stats[k]), x + 220, y, 18, '#ffffff', 'right');
      });
      const note = v.kind === 'legacy' ? T('myxi.frozen') : v.kind === 'rival' ? T('myxi.rivalNote', { t: T('tech.' + v.tech) }) : T('myxi.starterNote');
      GearUI.wrap(note, rx + 30, 720, 500, 18, '#ffe28a');
      if (v.tags && v.tags.length) R.text(T('myxi.tags', { list: v.tags.map((t) => T('myxi.tag.' + t)).join(', ') }), rx + 30, 800, 16, '#9be7ff', 'left', false);
    } else if (v && v.recruit) {
      Sprites.ui(v.art, rx + 280, 440, 300, 300);
      GearUI.wrap(T('myxi.recruitNote', { name: v.name }), rx + 30, 640, 500, 20, '#ffe28a');
    } else R.text(T('myxi.tapPlayer'), rx + 280, 480, 22, '#b8c6d6', 'center', false);
    this.buttons.draw();
    if (this.flash) R.text(this.flash, cx - 300, s.bottom - 40, 22, '#ffe28a', 'center', false);
  },
};

// =====================================================================================
const MyXILineupScene = {
  sel: null, benchSel: null, msg: null,
  buttons: new ButtonList(), rows: [], bench: [],
  enter() {
    MyXIAssets.ensure();
    const S = Save.data, club = MyXI.club(S);
    if (!club.lineup || club.lineup.order.length !== 11) club.lineup = MyXI.autoLineup(S);
    this.sel = null; this.benchSel = null; this.msg = null;
    this._layout();
  },
  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2, S = Save.data, club = MyXI.club(S), L = club.lineup;
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => this._done(), { size: 32, color: '#e9eef5' });
    b.add('myxi.auto', s.right - 300, s.top + 16, 280, 96, () => { club.lineup = MyXI.autoLineup(S); this.sel = null; this._save(); this._layout(); }, { size: 30, color: '#9be7ff' });
    this.rows = L.order.map((id, i) => ({ id, x: cx - 900, y: 140 + i * 78, w: 820, h: 70 }));
    const bench = club.active.filter((id) => !L.order.includes(id));
    this.bench = bench.map((id, i) => ({ id, x: cx - 60, y: 185 + i * 78, w: 360, h: 70 }));
    const role = (key, label, i, fn) => b.add(label, cx + 340 + (i % 2) * 280, 560 + Math.floor(i / 2) * 104, 270, 94, () => { if (this.sel) { fn(this.sel); this._save(); this._layout(); } }, { size: 22, color: '#ffd23f', disabled: () => !this.sel }).tag = key;
    role('keeper', 'myxi.makeKeeper', 0, (id) => { L.keeper = id; });
    role('captain', 'myxi.makeCaptain', 1, (id) => { L.captain = id; });
    role('powerHitter', 'myxi.makePower', 2, (id) => { L.powerHitter = id; });
    role('closer', 'myxi.makeCloser', 3, (id) => { L.closer = id; });
    role('bowl', 'myxi.toggleBowler', 4, (id) => { const i = L.bowlers.indexOf(id); if (i >= 0) L.bowlers.splice(i, 1); else L.bowlers.push(id); });
    role('up', 'myxi.moveUp', 5, (id) => { const i = L.order.indexOf(id); if (i > 0) [L.order[i - 1], L.order[i]] = [L.order[i], L.order[i - 1]]; });
  },
  _save() { MyXI.noteLineup(Save.data); Achievements.checkAccount(Save.data, null); Save.write(); },
  _done() { this._save(); Scenes.go('myxihome'); },
  update() {},
  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); if (!this.buttons.down(id, x, y)) this._down = { id, x, y }; },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this.buttons.up(id)) return;
    const d = this._down; this._down = null;
    if (!d) return;
    const L = MyXI.club(Save.data).lineup;
    const row = this.rows.find((q) => CareerScene.inBox(q, d.x, d.y)), bn = this.bench.find((q) => CareerScene.inBox(q, d.x, d.y));
    if (row) {
      if (this.benchSel) {                                   // bring a squad player in for this one
        const i = L.order.indexOf(row.id); L.order[i] = this.benchSel;
        for (const k of ['keeper', 'captain', 'powerHitter', 'closer']) if (L[k] === row.id) L[k] = null;
        L.bowlers = L.bowlers.filter((x) => x !== row.id);
        this.benchSel = null; this.sel = null; this._save();
      } else if (this.sel && this.sel !== row.id) {          // swap batting positions
        const a = L.order.indexOf(this.sel), b = L.order.indexOf(row.id); [L.order[a], L.order[b]] = [L.order[b], L.order[a]];
        this.sel = null; this._save();
      } else this.sel = this.sel === row.id ? null : row.id;
      Sound.play('uiTap'); this._layout();
    } else if (bn) { this.benchSel = this.benchSel === bn.id ? null : bn.id; this.sel = null; Sound.play('uiTap'); }
  },
  keyDown(code) { if (code === 'Escape') this._done(); },
  render(ctx) {
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, S = Save.data, club = MyXI.club(S), L = club.lineup;
    CareerUI.bg(ctx, 'bg_locker_room', 0.65);
    R.text(T('myxi.lineupTitle'), cx, 60, 50, '#ffffff');
    const fmt = (MyXI.next(S) || {}).fmt || 'quick10', v = MyXI.validate(S, fmt);
    R.text(v.ok ? T('myxi.lineupValid') : v.problems.map((p) => T('myxi.why.' + p, { n: MyXI.bowlersNeeded(fmt) })).join(' · '), cx, 110, 20, v.ok ? '#9cff6a' : '#ff9d7a', 'center', false);
    for (const r of this.rows) {
      const p = MyXI.view(S, MyXI.entry(S, r.id)), picked = this.sel === r.id;
      R.panel(r.x, r.y, r.w, r.h, picked ? 'rgba(40,60,90,0.97)' : 'rgba(10,22,40,0.9)', picked ? '#ffffff' : MyXIUI.kindColour[p.kind]);
      R.text(String(L.order.indexOf(r.id) + 1), r.x + 34, r.y + r.h / 2, 26, '#ffd23f');
      MyXIUI.face(ctx, p, r.x + 100, r.y + r.h / 2, 58);
      CareerTreeScene._fit(p.name, r.x + 140, r.y + 25, 300, 22, '#ffffff');
      R.text(MyXIUI.roleLabel(p) + (p.family ? ' · ' + T(BOWLING_DATA.families[p.family].nameKey) : ''), r.x + 140, r.y + 52, 14, '#9be7ff', 'left', false);
      R.text(String(MyXI.ovr(p)), r.x + 500, r.y + r.h / 2, 28, '#ffd23f');
      const marks = [];
      if (L.keeper === r.id) marks.push(T('myxi.mk.keeper')); if (L.captain === r.id) marks.push(T('myxi.mk.captain'));
      if (L.powerHitter === r.id) marks.push(T('myxi.mk.power')); if (L.closer === r.id) marks.push(T('myxi.mk.closer'));
      const bi = L.bowlers.indexOf(r.id); if (bi >= 0) marks.push(T('myxi.mk.bowler', { n: bi + 1 }));
      R.text(marks.join(' '), r.x + r.w - 20, r.y + r.h / 2, 18, '#ffe28a', 'right', false);
    }
    R.text(T('myxi.bench'), cx + 120, 160, 20, '#9be7ff', 'center', false);
    for (const k of this.bench) {
      const p = MyXI.view(S, MyXI.entry(S, k.id)), picked = this.benchSel === k.id;
      R.panel(k.x, k.y, k.w, k.h, picked ? 'rgba(40,60,90,0.97)' : 'rgba(10,22,40,0.85)', picked ? '#ffffff' : 'rgba(255,255,255,0.2)');
      CareerTreeScene._fit(p.name, k.x + 16, k.y + 24, 250, 20, '#ffffff');
      R.text(MyXIUI.roleLabel(p), k.x + 16, k.y + 50, 14, '#9be7ff', 'left', false);
      R.text(String(MyXI.ovr(p)), k.x + k.w - 34, k.y + k.h / 2, 24, '#ffd23f');
    }
    GearUI.wrap(T(this.benchSel ? 'myxi.hintBench' : this.sel ? 'myxi.hintRow' : 'myxi.hint'), cx - 60, 900, 380, 16, '#b8c6d6');
    // chemistry and the captain's perk
    const ch = MyXI.chemistry(S), rx = cx + 340;
    R.panel(rx, 140, 560, 400, 'rgba(8,16,30,0.95)', '#ffd23f');
    R.text(T('myxi.chemistry', { n: ch.active.length, max: MYXI_DATA.maxChemistry }), rx + 280, 175, 24, '#ffffff');
    MYXI_DATA.chemistry.forEach((c, i) => {
      const x = rx + 70 + (i % 4) * 140, y = 260 + Math.floor(i / 4) * 140, act = ch.active.some((a) => a.id === c.id), met = ch.met.some((a) => a.id === c.id);
      Sprites.ui(c.icon, x, y, 80, 80, { alpha: act ? 1 : met ? 0.55 : 0.18 });
      if (act) R.circle(x, y, 46, null, '#9cff6a', 4);
      CareerTreeScene._fit(T('myxi.chem.' + c.id), x - 65, y + 56, 130, 13, act ? '#9cff6a' : met ? '#ffe28a' : '#8a96a3');
    });
    const cap = MyXI.captainPerk(S);
    CareerTreeScene._fit(cap ? T('myxi.captainPerk', { p: T('myxi.cap.' + cap.id) }) : T('myxi.noCaptain'), rx + 20, 516, 520, 18, '#ffe28a');
    this.buttons.draw();
  },
};

// =====================================================================================
const MyXITableScene = {
  buttons: new ButtonList(),
  enter() {
    MyXIAssets.ensure();
    this.buttons.clear();
    this.buttons.add('career.close', Display.safe.left + 24, Display.safe.top + 24, 220, 90, () => Scenes.go('myxihome'), { size: 34, color: '#e9eef5' });
  },
  update() {},
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Escape') Scenes.go('myxihome'); },
  render(ctx) {
    const cx = CONFIG.LOGICAL_W / 2, S = Save.data, club = MyXI.club(S), run = club.run;
    if (!run) { CareerUI.bg(ctx, 'bg_scout_room', 0.7); this.buttons.draw(); return; }
    const C = MyXI.comp(run.comp);
    MyXI.registerRun(run);
    Tournament.extra.myxi = { id: 'myxi', name: club.name, crest: club.crest, colours: club.colours, rating: 0 };
    if (C.kind === 'cup') {                         // the bracket screen from Career (M08/M09)
      CareerTableScene.render.call({ career: { tour: run.tour, titleText: T('myxi.comp.' + C.id) }, buttons: this.buttons }, ctx);
      return;
    }
    CareerUI.bg(ctx, 'bg_scout_room', 0.7);
    R.text(T('myxi.comp.' + C.id), cx, 60, 50, '#ffffff');
    if (C.kind === 'league') {
      R.text(T('myxi.leagueSub'), cx, 112, 22, '#ffe28a', 'center', false);
      const rows = MyXI.table(run);
      R.panel(cx - 600, 150, 1200, 110 + rows.length * 90, 'rgba(10,22,40,0.93)', '#ffd23f');
      ['P', 'W', 'L', 'PTS', 'NRR'].forEach((h, i) => R.text(T('table.h.' + h.toLowerCase()), cx + 120 + i * 100, 190, 18, '#9be7ff', 'center', false));
      rows.forEach((r, i) => {
        const y = 250 + i * 90, me = r.id === 'myxi', t = run.teams[r.id];
        if (i === 0) R.roundRect(cx - 590, y - 38, 1180, 76, 16, 'rgba(255,210,63,0.16)');
        MyXIUI.crest(ctx, me ? club.crest : t.crest, cx - 530, y, 64);
        R.text(me ? club.name : t.name, cx - 480, y, 26, me ? '#9cff6a' : '#ffffff', 'left', false);
        [r.p, r.w, r.l, r.pts, (r.nrr >= 0 ? '+' : '') + r.nrr.toFixed(2)].forEach((v, j) => R.text(String(v), cx + 120 + j * 100, y, j === 3 ? 26 : 20, j === 3 ? '#ffd23f' : '#ffffff', 'center', false));
      });
      R.text(T('myxi.leagueWin'), cx, 250 + rows.length * 90 + 20, 18, '#ffd23f', 'center', false);
    } else {
      run.fixtures.forEach((f, i) => {
        const y = 200 + i * 150, t = run.teams[f.opp];
        R.panel(cx - 600, y, 1200, 130, 'rgba(10,22,40,0.93)', f.kind === 'final' ? '#ffd23f' : 'rgba(255,255,255,0.3)');
        MyXIUI.crest(ctx, t.crest, cx - 520, y + 65, 100);
        R.text(t.name + (t.rival ? ' · ' + T('rival.' + t.rival) : ''), cx - 450, y + 50, 28, '#ffffff', 'left');
        R.text(T('myxi.kind.' + f.kind), cx - 450, y + 90, 18, '#9be7ff', 'left', false);
        if (f.played) R.text(T(f.won ? 'career.won' : 'career.lost') + '  ' + f.score, cx + 560, y + 65, 26, f.won ? '#9cff6a' : '#ff9d9d', 'right');
      });
    }
    this.buttons.draw();
  },
};

// =====================================================================================
const MyXIResultScene = {
  r: null, _t: 0,
  buttons: new ButtonList(),
  enter(params) {
    MyXIAssets.ensure();
    this.r = params; this._t = 0;
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    this.buttons.add(params.ending ? 'myxi.toEnding' : 'myxi.toHome', cx - 280, 940, 560, 116, () => Scenes.go(params.ending ? 'myxiending' : 'myxihome'), { size: 42, color: params.ending ? '#ffd23f' : '#9cff6a' });
    Effects.init();
    Sound.play(params.won ? 'fanfare' : 'four');
    if (params.cleared) Sound.play('crowdRoar');
  },
  update(dt) { this._t += dt; Effects.update(dt); if (this.r.cleared && this._t % 0.4 < dt) Effects.sparks(300 + ((this._t * 977) % 1320), 180, 16, '#ffd23f', 800); },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Enter' || code === 'Space') this.buttons.items[0].cb(); },
  render(ctx) {
    const r = this.r, cx = CONFIG.LOGICAL_W / 2, S = Save.data, club = MyXI.club(S), run = club.run, C = MyXI.comp(run.comp);
    CareerUI.bg(ctx, 'bg_stadium_plaza_sunset', 0.6);
    if (!Sprites.ui(r.won ? 'result_banner_you_win' : 'result_banner_you_lose', cx, 110, 520, 200)) R.text(T(r.won ? 'match.youWon' : 'match.youLost'), cx, 110, 70, '#ffd23f');
    const opp = run.teams[r.fixture.opp];
    R.text(T('myxi.resultLine', { us: club.name, them: opp.name, s: r.score }) + (r.quick ? '  ' + T('myxi.quickTag') : ''), cx, 240, 30, '#ffffff', 'center', false);
    R.text(T('myxi.comp.' + C.id) + ' · ' + T('myxi.kind.' + r.fixture.kind), cx, 285, 22, '#ffe28a', 'center', false);
    if (r.coins) R.text(T('career.coinsGain', { n: r.coins }), cx, 330, 24, '#ffe28a', 'center', false);
    if (r.cleared) {
      Sprites.ui(C.trophy, cx - 400, 600, 300, 380);
      R.text(T('myxi.trophyWon', { c: T('myxi.comp.' + C.id) }), cx + 150, 440, 40, '#ffd23f');
      if (r.reward) GearUI.wrap(T('myxi.rewardLine') + ' ' + MyXIText.reward(r.reward), cx - 150, 520, 700, 24, '#9cff6a');
    } else if (r.failed) {
      R.text(T('myxi.compFailed', { c: T('myxi.comp.' + C.id) }), cx, 560, 34, '#ff9d7a');
      R.text(T('myxi.tryAgain'), cx, 610, 22, '#d8e4f0', 'center', false);
    } else if (r.next) {
      const t = run.teams[r.next.opp];
      R.text(T('myxi.nextUp', { k: T('myxi.kind.' + r.next.kind), name: t.name }), cx, 560, 30, '#ffffff', 'center', false);
      if (C.kind === 'league') { const rows = MyXI.table(run), pos = rows.findIndex((x) => x.id === 'myxi') + 1; R.text(T('myxi.leaguePos', { n: pos, of: rows.length }), cx, 610, 24, '#9be7ff', 'center', false); }
    }
    this.buttons.draw();
    Effects.drawParticles(ctx);
  },
};
const MyXIText = {
  reward(rw) {
    const out = [];
    if (rw.coins) out.push(T('career.coinsGain', { n: rw.coins }));
    if (rw.lm) out.push(T('ach.rw.lm', { n: rw.lm }));
    if (rw.mc) out.push(T('ach.rw.mc', { n: rw.mc }));
    if (rw.recruit) out.push(T('myxi.recruitReward', { name: MYXI_DATA.rewardRecruits[rw.recruit].name }));
    if (rw.stadium) out.push(T('myxi.stadiumReward', { name: T('stadium.' + rw.stadium) }));
    if (rw.item) out.push(T('gear.' + rw.item));
    if (rw.coach) out.push(T('coach.' + rw.coach));
    if (rw.technique) out.push(T('tech.' + rw.technique));
    return out.join(' · ');
  },
};

// =====================================================================================
// The ending (plan 15.16): the trophy, a montage of your Legacy Players, the credits.
const MyXIEndingScene = {
  _t: 0, phase: 'trophy',
  buttons: new ButtonList(),
  TROPHY: 5, CARD: 2.4,
  enter() {
    MyXIAssets.ensure();
    this._t = 0; this.phase = 'trophy';
    this.legends = (Save.data.hallOfFame || []).slice();
    Save.write();                                    // (the win that led here is safe)
    this.buttons.clear();
    Effects.init();
    Sound.play('fanfare'); Sound.play('crowdRoar');
  },
  _montageEnd() { return this.TROPHY + Math.max(1, this.legends.length) * this.CARD; },
  _creditsEnd() { return this._montageEnd() + 9; },
  _finish() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    this.buttons.add('myxi.toHome', cx - 280, 940, 560, 116, () => Scenes.go('myxihome'), { size: 42, color: '#9cff6a' });
  },
  update(dt) {
    this._t += dt; Effects.update(dt);
    if (this.phase !== 'done') this.phase = this._t < this.TROPHY ? 'trophy' : this._t < this._montageEnd() ? 'montage' : 'credits';
    if (this.phase === 'trophy' && this._t % 0.3 < dt) Effects.sparks(300 + ((this._t * 977) % 1320), 160, 20, ['#ffd23f', '#ffffff', '#9cff6a'][Math.floor(this._t * 4) % 3], 900);
    if (this._t > this._creditsEnd()) this._finish();
  },
  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; if (this.phase === 'done') this.buttons.down(id, x, y); else { this._t = this.phase === 'trophy' ? this.TROPHY : this.phase === 'montage' ? this._montageEnd() : this._creditsEnd() + 1; } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Escape') this._finish(); },
  render(ctx) {
    const cx = CONFIG.LOGICAL_W / 2, v = Display.viewRect(), club = MyXI.club(Save.data);
    ctx.fillStyle = '#05080f'; ctx.fillRect(v.x, v.y, v.w, v.h);
    if (this.phase === 'trophy') {
      const k = Math.min(1, this._t / 0.8);
      CareerUI.bg(ctx, 'bg_hall_of_fame', 0.5);
      ctx.save(); ctx.translate(cx, 520); ctx.scale(0.5 + 0.5 * k, 0.5 + 0.5 * k);
      Sprites.ui('reward_legends_victory', 0, 0, 700, 640);
      ctx.restore();
      R.text(T('myxi.endTitle'), cx, 100, 64, '#ffd23f');
      R.text(T('myxi.endSub', { name: club.name }), cx, 930, 34, '#ffffff');
    } else if (this.phase === 'montage') {
      CareerUI.bg(ctx, 'bg_hall_of_fame', 0.7);
      const i = Math.min(this.legends.length - 1, Math.floor((this._t - this.TROPHY) / this.CARD)), h = this.legends[i];
      const t = (this._t - this.TROPHY) % this.CARD, a = Math.min(1, t / 0.4, (this.CARD - t) / 0.4);
      R.text(T('myxi.montage'), cx, 90, 44, '#ffd23f');
      if (h) {
        ctx.save(); ctx.globalAlpha = Math.max(0, a);
        LegacyCard.draw(ctx, h, cx - 230, 170, 460);
        R.text(T('trait.' + h.traits.primary), cx, 740, 30, '#ffffff');
        R.text(T('hof.line', { m: h.records.matches, runs: h.records.runs, w: h.records.wickets, s: h.records.sixes, t: h.trophies.length }), cx, 790, 22, '#d8e4f0', 'center', false);
        ctx.restore();
      }
    } else {
      // The credits (M11): the studio logo at the top, then two lines. The art is small
      // (about 180 x 220), so it is never drawn above ~2x.
      const t = this._t - this._montageEnd(), lines = T('myxi.credits').split('|');
      Sprites.ui('reward_ending_credits', cx, 560, 700, 620, { alpha: Math.min(0.22, t / 3) });
      const a = Math.min(1, t / 0.8);
      ctx.save(); ctx.globalAlpha = a;
      if (!Sprites.ui('logo_banx_gamex', cx, 230, 250, 300)) R.text(T('credits.studio'), cx, 230, 60, '#ffd23f');
      ctx.restore();
      lines.forEach((ln, i) => {
        const k = Math.max(0, Math.min(1, (t - 0.8 - i * 0.9) / 0.6));
        ctx.save(); ctx.globalAlpha = k;
        R.text(ln, cx, 490 + i * 80, 38, i === 0 ? '#ffffff' : '#9be7ff', 'center', false);
        ctx.restore();
      });
      if (this.phase === 'done') { R.text(T('myxi.postgameUnlocked'), cx, 860, 30, '#9cff6a'); this.buttons.draw(); }
    }
    Effects.drawParticles(ctx);
    if (this.phase !== 'done') R.text(T('myxi.tapSkip'), cx, 1050, 18, '#8a96a3', 'center', false);
  },
};

// =====================================================================================
// Between-over tactical calls (plan 15.12) in a My XI match: four call buttons down
// the left side (the crest-component icons). A call takes effect from the next over.
const TacticBar = {
  btns: [],
  layout(kind) {
    const s = Display.safe;
    this.kind = kind;
    // a row at the top right, under the pause button (clear of the scoreboard, the matchup card and the controls)
    this.btns = MYXI_DATA.tactics[kind].map((t, i) => ({ id: t.id, icon: t.icon, x: s.right - 470 + i * 112, y: 196, r: 44 }));
  },
  down(x, y) {
    for (const b of this.btns) {
      if (Math.hypot(x - b.x, y - b.y) <= Math.max(b.r * 1.1, CONFIG.MIN_TOUCH / 2)) {
        MyXIMatch.call(this.kind, b.id);
        Sound.play('uiTap');
        return true;
      }
    }
    return false;
  },
  draw(ctx) {
    if (!this.btns.length) return;
    const cur = MyXIMatch.tactic[this.kind], q = MyXIMatch.queued[this.kind];
    const b0 = this.btns[0], bl = this.btns[this.btns.length - 1];
    const mid = (b0.x + bl.x) / 2;
    R.text(q !== cur ? T('myxi.callsNext', { c: T('myxi.tac.' + q) }) : T('myxi.calls'), mid, b0.y + b0.r + 42, 15, '#ffd23f', 'center');
    for (const b of this.btns) {
      const on = cur === b.id, next = q === b.id && q !== cur;
      R.circle(b.x, b.y, b.r + 4, 'rgba(8,20,36,0.8)', on ? '#9cff6a' : next ? '#ffd23f' : 'rgba(255,255,255,0.3)', on || next ? 5 : 2);
      Sprites.ui(b.icon, b.x, b.y, b.r * 1.7, b.r * 1.7, { alpha: on || next ? 1 : 0.6 });
      R.text(T('myxi.tac.' + b.id), b.x, b.y + b.r + 14, 13, on ? '#9cff6a' : next ? '#ffd23f' : '#ffffff', 'center');
    }
    const fx = MyXIMatch.fx(this.kind);
    if (this.kind === 'bowl' && fx.field) R.text(T('myxi.fieldHint', { f: T('field.' + fx.field) }), mid, b0.y + b0.r + 64, 13, '#9be7ff', 'center', false);
  },
};
