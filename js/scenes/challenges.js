// Cricket Arcade — the Challenge hub (plan 4 "Challenge Flow", 16, 17, 20):
// Six Smash or Wicket Rush -> pick a ruleset -> player + difficulty -> play.
// Shows each ruleset's best score, medal and the medal thresholds.
// The player picker is an overlay on this screen (ChallengePicker).

const ChallengeAssets = { loaded: false, ensure() { if (!this.loaded) { this.loaded = true; Sprites.loadGroup('challenges'); } } };

const ChallengeHubScene = {
  buttons: new ButtonList(),
  game: 'six',
  sel: null,           // selected ruleset id
  diff: 'pro',
  pick: null,          // the picked player (a Challenge.options entry)
  options: null,       // every player you could pick (loads async)
  _t: 0,

  enter(params) {
    ChallengeAssets.ensure();
    this._t = 0;
    Tech.end();
    if (params && params.game) this.game = params.game;
    else if (Challenge.current) this.game = Challenge.current.game;
    this._choose(this.game);
    Effects.init();
    ChallengePicker.close();
  },

  // Switch game: restore the last choices for it, reload who can play.
  _choose(game) {
    this.game = game;
    const last = Challenge.last[game] || {};
    this.sel = last.rs || Challenge.rulesets(game)[0].id;
    this.diff = last.diff || 'pro';
    this.pick = last.pick || null;
    this.options = null;
    Challenge.options(Save.data, game).then((list) => {
      if (this.game !== game) return;
      this.options = list;
      // keep the same player, with fresh stats (or fall back to the first choice)
      const again = this.pick && list.find((o) => o.key === this.pick.key);
      this.pick = again || list[0];
      this._layout();
    }).catch((e) => { Log.add('error', 'challenge players: ' + e.message); });
    this._layout();
  },

  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    b.clear();
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go('title'), { size: 32, color: '#e9eef5' });
    b.add('title.mode', cx - 430, 116, 410, 96, () => this._choose('six'), { size: 40, color: this.game === 'six' ? '#ff7a3a' : '#5b6570', textColor: this.game === 'six' ? CONFIG.COLOR.ink : '#ffffff', icon: 'icon_six_smash' });
    b.add('title.modeWicket', cx + 20, 116, 410, 96, () => this._choose('rush'), { size: 40, color: this.game === 'rush' ? '#3ddc84' : '#5b6570', textColor: this.game === 'rush' ? CONFIG.COLOR.ink : '#ffffff', icon: 'icon_wicket_rush' });
    // ruleset cards (tap areas; drawn by the screen)
    this._cards().forEach((c) => { const bt = b.add(() => '', c.x, c.y, c.w, c.h, () => { if (FullGame.guard('ruleset', c.id, { scene: 'challenges', params: { game: this.game } })) return; if (Profile.open(Save.data, 'ruleset', c.id)) { this.sel = c.id; this._layout(); } else Sound.play('ui_error'); }); bt.invisible = true; });
    // right column: player, difficulty, play
    const rx = cx + 260;
    b.add('chal.changePlayer', rx + 452, 636, 190, 92, () => { if (this.options) ChallengePicker.open(this); }, { size: 28, color: '#9be7ff', disabled: () => !this.options });
    CHALLENGE_DATA.difficulties.forEach((d, i) => {
      b.add('chal.diff.' + d, rx - 10 + i * 220, 772, 210, 92, () => { this.diff = d; this._layout(); },
        { size: 24, color: this.diff === d ? '#ffd23f' : '#5b6570', textColor: this.diff === d ? CONFIG.COLOR.ink : '#ffffff', icon: CHALLENGE_DATA.difficulty[d].icon });
    });
    b.add('chal.play', rx, 900, 630, 130, () => this._play(), { size: 60, color: '#9cff6a', disabled: () => !this.pick });
  },

  _cards() {
    const list = Challenge.rulesets(this.game), cx = CONFIG.LOGICAL_W / 2;
    const w = 340, gap = 18, x0 = cx - (list.length * w + (list.length - 1) * gap) / 2;
    return list.map((r, i) => ({ id: r.id, r, x: x0 + i * (w + gap), y: 240, w, h: 330 }));
  },

  _play() {
    if (!this.pick) return;
    if (FullGame.guard('ruleset', this.sel, { scene: 'challenges', params: { game: this.game } })) return;
    Scenes.go(this.game === 'six' ? 'sixsmash' : 'wicketrush', { rs: this.sel, diff: this.diff, pick: this.pick });
  },

  update(dt) { this._t += dt; Stadium.update(dt); Effects.update(dt); },

  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    if (ChallengePicker.on) { ChallengePicker.buttons.down(id, x, y); return; }
    this.buttons.down(id, x, y);
  },
  pointerMove(id, x, y) { if (Dev.pointerMove(id, x, y)) return; (ChallengePicker.on ? ChallengePicker.buttons : this.buttons).move(id, x, y); },
  pointerUp(id) { if (Dev.pointerUp(id)) return; (ChallengePicker.on ? ChallengePicker.buttons : this.buttons).up(id); },
  keyDown(code) {
    if (ChallengePicker.on) { if (code === 'Escape') ChallengePicker.close(); return; }
    const list = Challenge.rulesets(this.game);
    const n = parseInt(code.replace('Digit', ''), 10);
    if (n >= 1 && n <= list.length) { this.sel = list[n - 1].id; this._layout(); }
    if (code === 'Tab') this._choose(this.game === 'six' ? 'rush' : 'six');
    if (code === 'Enter' || code === 'Space') this._play();
    if (code === 'Escape') Scenes.go('title');
  },

  render(ctx) {
    drawMatchBackdrop(ctx, this._t, 0.62);
    const cx = CONFIG.LOGICAL_W / 2, s = Display.safe, save = Save.data;
    R.text(T('chal.hubTitle'), cx, 62, 56, '#ffffff');
    // medal points + the next milestone
    const pts = Challenge.medalPoints(save), next = CHALLENGE_DATA.milestones.find((m) => pts < m.points);
    R.text(T('chal.points', { n: pts }), s.right - 40, s.top + 50, 28, '#ffd23f', 'right');
    if (next) R.text(T('chal.nextMilestone', { n: next.points, r: AchText.reward(next.reward) }), s.right - 40, s.top + 88, 20, '#d8e4f0', 'right', false);

    for (const c of this._cards()) this._drawCard(ctx, c);
    this._drawDetail(ctx);
    this._drawPlayer(ctx);
    this.buttons.draw();
    if (ChallengePicker.on) ChallengePicker.draw(ctx);
  },

  _drawCard(ctx, c) {
    const on = c.id === this.sel, rec = Challenge.record(Save.data, c.id), col = this.game === 'six' ? '#ff7a3a' : '#3ddc84';
    if (FullGame.locked('ruleset', c.id)) {
      // in the Full Game (M13): shown, with what it is, and a tap opens the Full Game screen
      R.roundRect(c.x, c.y, c.w, c.h, 26, 'rgba(20,24,30,0.9)', '#ffd23f', 3);
      Sprites.ui(c.r.icon, c.x + c.w / 2, c.y + 80, 110, 94, { alpha: 0.45 });
      R.text(T('chal.rs.' + c.id), c.x + c.w / 2, c.y + 170, 28, '#b8c6d6');
      R.roundRect(c.x + 40, c.y + 230, c.w - 80, 56, 22, '#ffd23f');
      R.text(T('full.badge'), c.x + c.w / 2, c.y + 258, 24, CONFIG.COLOR.ink, 'center', false);
      return;
    }
    if (!Profile.open(Save.data, 'ruleset', c.id)) {
      // opens with the Global Profile Level (plan 21.1: new challenge rulesets)
      R.roundRect(c.x, c.y, c.w, c.h, 26, 'rgba(20,24,30,0.9)', '#5b6570', 3);
      Sprites.ui('mode_locked', c.x + c.w / 2, c.y + 90, 110, 110, { alpha: 0.6 });
      R.text(T('chal.rs.' + c.id), c.x + c.w / 2, c.y + 190, 28, '#8a96a3');
      R.text(T('profile.lockedAt', { n: Profile.levelOf('ruleset', c.id) }), c.x + c.w / 2, c.y + 250, 22, '#ffd23f', 'center', false);
      return;
    }
    R.roundRect(c.x + 6, c.y + 8, c.w, c.h, 26, 'rgba(0,0,0,0.45)');
    R.roundRect(c.x, c.y, c.w, c.h, 26, on ? 'rgba(30,48,72,0.97)' : 'rgba(10,22,40,0.9)', on ? '#ffd23f' : col, on ? 7 : 4);
    Sprites.ui(c.r.icon, c.x + c.w / 2, c.y + 80, 130, 110);
    R.text(T('chal.rs.' + c.id), c.x + c.w / 2, c.y + 170, 30, '#ffffff');
    const sub = T('chal.rs.' + c.id + '.sub').split('|');
    sub.forEach((ln, i) => R.text(ln, c.x + c.w / 2, c.y + 208 + i * 28, 20, '#d8e4f0', 'center', false));
    if (rec) {
      if (rec.medal) Sprites.ui(CHALLENGE_DATA.medalIcon[rec.medal], c.x + 56, c.y + c.h - 44, 62, 62);
      R.text(T('chal.best', { n: formatNumber(rec.score) }), c.x + c.w / 2 + (rec.medal ? 26 : 0), c.y + c.h - 44, 26, '#ffd23f');
    } else R.text(T('chal.notPlayed'), c.x + c.w / 2, c.y + c.h - 44, 22, '#8a96a3', 'center', false);
  },

  _drawDetail(ctx) {
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, R0 = Challenge.def(this.sel), rec = Challenge.record(Save.data, this.sel);
    const x = s.left + 30, w = cx + 220 - x;
    R.panel(x, 600, w, 440);
    R.text(T('chal.rs.' + this.sel), x + 30, 640, 36, '#ffd23f', 'left');
    T('chal.rs.' + this.sel + '.rules').split('|').forEach((ln, i) => R.text(ln, x + 30, 690 + i * 36, 24, '#ffffff', 'left', false));
    // medal thresholds (the difficulty multiplies your score: Rookie x0.8, Legend x1.25)
    const have = Challenge.medalRank(rec && rec.medal);
    CHALLENGE_DATA.medals.forEach((m, i) => {
      const mx = x + 90 + i * (w - 120) / 4, my = 920;
      Sprites.ui(CHALLENGE_DATA.medalIcon[m], mx, my, 84, 84, { alpha: i < have ? 1 : 0.45 });
      R.text(formatNumber(R0.medals[i]), mx, my + 64, 24, i < have ? CHALLENGE_DATA.medalColour[m] : '#b8c6d6');
    });
    if (rec) R.text(T('chal.recordLine', { n: formatNumber(rec.score), name: rec.player || '', d: T('chal.diff.' + (rec.diff || 'pro')) }), x + 30, 845, 22, '#9be7ff', 'left', false);
  },

  _drawPlayer(ctx) {
    const cx = CONFIG.LOGICAL_W / 2, rx = cx + 260;
    R.panel(rx - 20, 600, 670, 160);
    R.text(T('chal.player'), rx, 624, 20, '#b8c6d6', 'left', false);
    if (!this.pick) { R.text(T('chal.loading'), rx + 150, 680, 28, '#ffffff', 'left', false); return; }
    ChallengePicker.face(ctx, this.pick, rx + 60, 690, 100, this.game);
    R.text(this.pick.name, rx + 130, 666, 30, '#ffffff', 'left');
    R.text(T('chal.kind.' + this.pick.kind), rx + 130, 704, 20, '#ffd23f', 'left', false);
    R.text(ChallengePicker.tagLine(this.pick).split(' · ').slice(1).join(' · '), rx + 130, 732, 18, '#d8e4f0', 'left', false);
    R.text(T('chal.diffNote.' + this.diff), rx + 315, 880, 20, '#d8e4f0', 'center', false);
  },
};

// ---- the player picker (plan 16.8 / 17.7) ---------------------------------------------
const ChallengePicker = {
  on: false, page: 0, host: null,
  buttons: new ButtonList(),
  PER: 8,
  open(host) {
    this.on = true; this.host = host; this.page = 0;
    if (host.options.some((o) => o.kind !== 'athlete')) CareerAssets.ensure();    // portraits
    this._layout();
  },
  close() { this.on = false; this.buttons.clear(); },
  _cells() {
    const cx = CONFIG.LOGICAL_W / 2, list = this.host.options.slice(this.page * this.PER, (this.page + 1) * this.PER);
    return list.map((o, i) => ({ o, x: cx - 850 + (i % 4) * 430, y: 220 + Math.floor(i / 4) * 330, w: 410, h: 310 }));
  },
  _layout() {
    const b = this.buttons, cx = CONFIG.LOGICAL_W / 2, n = this.host.options.length, pages = Math.ceil(n / this.PER);
    b.clear();
    for (const c of this._cells()) { const bt = b.add(() => '', c.x, c.y, c.w, c.h, () => { this.host.pick = c.o; this.close(); this.host._layout(); }); bt.invisible = true; }
    b.add('chal.cancel', cx - 200, 920, 400, 110, () => this.close(), { size: 40, color: '#e9eef5' });
    if (this.page > 0) b.add(() => '◀', cx - 520, 920, 160, 110, () => { this.page--; this._layout(); }, { size: 50, color: '#9be7ff' });
    if (this.page < pages - 1) b.add(() => '▶', cx + 360, 920, 160, 110, () => { this.page++; this._layout(); }, { size: 50, color: '#9be7ff' });
  },
  tagLine(o) {
    const role = T('chal.role.' + o.role);
    const fam = o.family ? ' · ' + T(Bowling.family(o.family).nameKey) : '';
    return T('chal.kind.' + o.kind) + ' · ' + role + fam + (o.ovr ? ' · ' + T('chal.ovr', { n: o.ovr }) : '');
  },
  face(ctx, o, x, y, size, game) {
    if ((o.kind === 'career' || o.kind === 'legacy') && o.look && o.look.look && Sprites.has(Portrait.lookId(o.look))) { Portrait.draw(ctx, o.look, x, y, size); return; }
    if (!Sprites.ui(game === 'six' || !o.family ? 'batter' : 'bowler', x, y, size * 0.8, size * 1.1)) {
      R.circle(x, y, size * 0.45, '#1d3350', '#9be7ff', 3);
      R.text(o.name.split(' ').map((w) => w[0]).join('').slice(0, 2), x, y, size * 0.34, '#ffffff');
    }
  },
  draw(ctx) {
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2, host = this.host;
    ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(v.x, v.y, v.w, v.h);
    R.text(T('chal.pickTitle'), cx, 110, 54, '#ffffff');
    R.text(T(host.game === 'six' ? 'chal.pickSubSix' : 'chal.pickSubRush'), cx, 170, 24, '#d8e4f0', 'center', false);
    for (const c of this._cells()) {
      const o = c.o, on = host.pick && host.pick.key === o.key;
      R.roundRect(c.x, c.y, c.w, c.h, 24, on ? 'rgba(30,48,72,0.98)' : 'rgba(12,26,44,0.96)', on ? '#ffd23f' : { career: '#9b5cff', legacy: '#ffd23f', athlete: '#b8c6d6' }[o.kind], on ? 6 : 3);
      this.face(ctx, o, c.x + c.w / 2, c.y + 90, 130, host.game);
      R.text(o.name, c.x + c.w / 2, c.y + 190, 28, '#ffffff');
      R.text(T('chal.kind.' + o.kind), c.x + c.w / 2, c.y + 228, 20, { career: '#c9a5ff', legacy: '#ffd23f', athlete: '#b8c6d6' }[o.kind], 'center', false);
      const fam = o.family ? T(Bowling.family(o.family).nameKey) : T('chal.role.' + o.role);
      R.text(fam + (o.ovr ? ' · ' + T('chal.ovr', { n: o.ovr }) : ''), c.x + c.w / 2, c.y + 264, 20, '#d8e4f0', 'center', false);
    }
    this.buttons.draw();
  },
};
