// Cricket Arcade — Quick Match setup (plan 19): pick both teams (12 nations,
// 16 franchises, My XI once unlocked, the elite squads once discovered), the
// length, the difficulty, the ground, the pitch and the weather. Quick Match pays
// modest Coins and never touches a Career or a Legacy Player.

const QuickMatchAssets = { loaded: false, ensure() { if (!this.loaded) { this.loaded = true; Sprites.loadGroup('quickmatch'); Sprites.loadGroup('challenges'); } } };

const QuickMatchScene = {
  buttons: new ButtonList(),
  o: null,           // the setup
  cat: { you: 'nations', them: 'nations' },
  tiles: [],         // icon tiles drawn by the screen: { x, y, w, h, icon, on, label }
  _t: 0,

  enter() {
    QuickMatchAssets.ensure();
    Tech.end();
    this._t = 0;
    this.o = Object.assign({}, QuickMatch.defaults(Save.data));
    // a team from a category that's no longer offered falls back to the nations
    const cats = QuickMatch.cats(Save.data);
    for (const side of ['you', 'them']) { if (!cats.includes(this.o[side].cat)) this.o[side] = QuickMatch.teams(Save.data, 'nations')[side === 'you' ? 0 : 1]; this.cat[side] = this.o[side].cat; }
    this._layout();
  },

  _list(side) { return QuickMatch.teams(Save.data, this.cat[side]).filter((t) => !(side === 'them' && t.cat === 'myxi')); },
  _cycle(side, dir) {
    const list = this._list(side);
    const i = list.findIndex((t) => t.id === this.o[side].id);
    this.o[side] = list[(i + dir + list.length) % list.length];
    this._layout();
  },
  _setCat(side, cat) { this.cat[side] = cat; this.o[side] = this._list(side)[0]; this._layout(); },

  _layout() {
    const b = this.buttons, s = Display.safe, o = this.o, save = Save.data;
    b.clear();
    this.tiles = [];
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go('title'), { size: 32, color: '#e9eef5' });
    // the two teams
    for (const [side, x0] of [['you', 80], ['them', 1020]]) {
      const cats = QuickMatch.cats(save).filter((c) => !(side === 'them' && c === 'myxi'));
      cats.forEach((c, i) => b.add('qm.cat.' + c, x0 + 20 + i * 200, 196, 190, 70, () => this._setCat(side, c),
        { size: 20, color: this.cat[side] === c ? '#ffd23f' : '#5b6570', textColor: this.cat[side] === c ? CONFIG.COLOR.ink : '#ffffff' }));
      if (this._list(side).length > 1) {
        b.add(() => '◀', x0 + 20, 300, 110, 130, () => this._cycle(side, -1), { size: 50, color: '#e9eef5' });
        b.add(() => '▶', x0 + 710, 300, 110, 130, () => this._cycle(side, 1), { size: 50, color: '#e9eef5' });
      }
    }
    // length and difficulty
    QUICKMATCH_DATA.formats.forEach((f, i) => b.add(() => T('qm.overs', { n: MATCH_DATA.formats[f].overs }), 280 + i * 205, 606, 195, 88, () => { o.fmt = f; this._layout(); },
      { size: 30, color: o.fmt === f ? '#ffd23f' : '#5b6570', textColor: o.fmt === f ? CONFIG.COLOR.ink : '#ffffff' }));
    DIFFICULTY_DATA.levels.forEach((d, i) => b.add('chal.diff.' + d, 280 + i * 205, 722, 195, 88, () => { o.diff = d; this._layout(); },
      { size: 22, icon: DIFFICULTY_DATA[d].icon, color: o.diff === d ? '#ffd23f' : '#5b6570', textColor: o.diff === d ? CONFIG.COLOR.ink : '#ffffff' }));
    // the ground
    const grounds = MYXI_DATA.stadiums.map((g) => g.id), gi = grounds.indexOf(o.stadium);
    b.add(() => '◀', 250, 846, 100, 110, () => { o.stadium = grounds[(gi - 1 + grounds.length) % grounds.length]; this._layout(); }, { size: 44, color: '#e9eef5' });
    b.add(() => '▶', 790, 846, 100, 110, () => { o.stadium = grounds[(gi + 1) % grounds.length]; this._layout(); }, { size: 44, color: '#e9eef5' });
    // pitch and weather: icon tiles (RANDOM first)
    const row = (list, key, y) => {
      [{ id: 'random', icon: null }].concat(list).forEach((it, i) => {
        const x = 1190 + i * 112;
        const bt = b.add(() => '', x, y, 104, 104, () => { o[key] = it.id; this._layout(); });
        bt.invisible = true;
        this.tiles.push({ x, y, w: 104, h: 104, icon: it.icon, on: o[key] === it.id, id: it.id, key });
      });
    };
    row(QUICKMATCH_DATA.pitches, 'pitch', 606);
    row(QUICKMATCH_DATA.weathers, 'weather', 760);
    b.add('qm.play', 1330, 900, 510, 130, () => Scenes.go(QuickMatch.start(Save.data, this.o), { keep: true }), { size: 60, color: '#9cff6a' });
  },

  update(dt) { this._t += dt; Stadium.update(dt); },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) {
    if (code === 'Escape') Scenes.go('title');
    if (code === 'Enter' || code === 'Space') Scenes.go(QuickMatch.start(Save.data, this.o), { keep: true });
  },

  _team(ctx, side, x0) {
    const t = this.o[side], cx = x0 + 420;
    R.panel(x0, 140, 840, 430);
    R.text(T(side === 'you' ? 'qm.you' : 'qm.them'), x0 + 30, 168, 26, '#b8c6d6', 'left', false);
    if (t.cat === 'myxi') MyXIUI.crest(ctx, t.club, cx, 365, 190);
    else if (!Sprites.ui(t.crest, cx, 365, 190, 190)) { R.circle(cx, 365, 90, t.colours[0], t.colours[1], 10); R.text(t.name.slice(0, 2).toUpperCase(), cx, 365, 60, '#ffffff'); }
    R.text(t.name, cx, 492, 40, '#ffffff');
    R.text(T('chal.ovr', { n: t.rating + (side === 'them' ? DIFFICULTY_DATA[this.o.diff].opp : 0) }), cx, 538, 26, '#ffd23f');
  },

  render(ctx) {
    drawMatchBackdrop(ctx, this._t, 0.6);
    const cx = CONFIG.LOGICAL_W / 2, o = this.o;
    Sprites.ui('icon_quick_match', cx - 250, 70, 120, 90);
    R.text(T('title.modeMatch'), cx + 40, 70, 56, '#ffffff');
    this._team(ctx, 'you', 80);
    this._team(ctx, 'them', 1020);
    R.text(T('qm.vs'), cx, 365, 60, '#ffd23f');
    // settings panel
    R.panel(60, 590, 1800, 470);
    R.text(T('qm.length'), 90, 650, 26, '#b8c6d6', 'left', false);
    R.text(T('qm.difficulty'), 90, 766, 26, '#b8c6d6', 'left', false);
    R.text(T('qm.ground'), 90, 900, 26, '#b8c6d6', 'left', false);

    const g = MYXI_DATA.stadiums.find((x) => x.id === o.stadium);
    Sprites.ui('qm_stadium_' + g.id, 570, 880, 260, 110);
    R.text(T('stadium.' + g.id), 570, 950, 22, '#ffffff');
    if (g.id !== STADIUM_DATA.defaultStadium && !STADIUM_DATA.stadiums[g.id]) R.text(T('qm.groundSoon'), 570, 1012, 17, '#8a96a3', 'center', false);
    R.text(T('qm.pitch'), 1000, 658, 26, '#b8c6d6', 'left', false);
    R.text(T('qm.weather'), 1000, 812, 26, '#b8c6d6', 'left', false);
    for (const t of this.tiles) {
      R.roundRect(t.x, t.y, t.w, t.h, 18, t.on ? 'rgba(255,210,63,0.9)' : 'rgba(10,22,40,0.85)', t.on ? '#ffffff' : 'rgba(255,255,255,0.3)', t.on ? 4 : 2);
      if (t.icon) Sprites.ui(t.icon, t.x + t.w / 2, t.y + t.h / 2 - 6, 78, 78);
      else R.text('?', t.x + t.w / 2, t.y + t.h / 2 - 6, 50, t.on ? CONFIG.COLOR.ink : '#ffffff');
      const name = T('qm.short.' + t.id);
      R.text(name, t.x + t.w / 2, t.y + t.h + 16, 15, '#ffffff', 'center', false);
    }
    R.text(T('qm.coins', { w: QuickMatch.coins(true, o.diff), l: QuickMatch.coins(false, o.diff) }), 1585, 1050, 18, '#d8e4f0', 'center', false);
    this.buttons.draw();
  },
};
