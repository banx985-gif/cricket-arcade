// Cricket Arcade — Quick Match flow screens (M03):
//   TossScene       — coin flip; winner chooses Bat or Bowl (AI decides if it wins)
//   MatchBreakScene — between innings / before a Super Over: the score and the target
//   MatchResultScene — who won and by how much, both innings (and any Super Overs)

// Shared stadium backdrop for the menu-style match screens.
function drawMatchBackdrop(ctx, t, dim) {
  const a = t * 0.05;
  View3D.set({ x: Math.sin(a) * 30, y: 16, z: 10 + Math.cos(a) * 50 }, { x: 0, y: 0, z: 10 }, 1300);
  Stadium.drawBackground(ctx);
  Stadium.drawField(ctx);
  const v = Display.viewRect();
  ctx.fillStyle = `rgba(5,15,10,${dim})`;
  ctx.fillRect(v.x, v.y, v.w, v.h);
}

function inningsLine(inn) {
  const side = MATCH_DATA.teams[inn.battingSide];
  return T('match.inningsLine', { team: CareerMatch.teamName(inn.battingSide), runs: inn.runs, wkts: inn.wickets, overs: inn.overs });
}

const TossScene = {
  buttons: new ButtonList(),
  _t: 0,
  phase: 'flip',

  enter(params) {
    Save.clearResume();                      // a new match replaces any unfinished one
    CareerMatch.on = false;
    // My XI (M10) has already set its match up (MyXIMatch.start): keep it.
    if (typeof MissionMatch !== 'undefined' && MissionMatch.on) MissionMatch.leave();
    if (!(params && params.keep)) { Tech.end(); if (typeof MyXIMatch !== 'undefined') MyXIMatch.on = false; Match.start((params && params.format) || Dev.matchFormat || MATCH_DATA.defaultFormat); }
    Match.flipToss();
    Stadium.setConditions(Match.cond);
    this._t = 0;
    this.phase = 'flip';
    Effects.init();
    this.buttons.clear();
    Sound.play('swish');
  },

  _layout() { if (this.phase === 'result') this._showChoice(); },

  _showChoice() {
    const cx = CONFIG.LOGICAL_W / 2;
    const b = this.buttons;
    b.clear();
    if (Match.toss.winner === 'player') {
      b.add('match.bat', cx - 440, 800, 400, 130, () => this._go('bat'), { size: 60, color: '#5fb0ff' });
      b.add('match.bowl', cx + 40, 800, 400, 130, () => this._go('bowl'), { size: 60, color: '#6fd36f' });
    } else {
      b.add('match.play', cx - 220, 800, 440, 130, () => this._go(Match.toss.choice), { size: 60 });
    }
  },

  _go(choice) {
    Match.choose(choice);
    Scenes.go(Match.startInnings());
  },

  update(dt) {
    this._t += dt;
    Stadium.update(dt);
    Effects.update(dt);
    if (this.phase === 'flip' && this._t >= MATCH_DATA.toss.flipTime) {
      this.phase = 'result';
      Sound.play(Match.toss.winner === 'player' ? 'four' : 'uiTap');
      this._showChoice();
    }
  },

  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) {
    if (this.phase !== 'result') return;
    if (Match.toss.winner === 'player') {
      if (code === 'KeyB' || code === 'Digit1') this._go('bat');
      if (code === 'KeyW' || code === 'Digit2') this._go('bowl');
    } else if (code === 'Enter' || code === 'Space') this._go(Match.toss.choice);
    if (code === 'Escape') Scenes.go('title');
  },

  render(ctx) {
    drawMatchBackdrop(ctx, this._t, 0.55);
    const cx = CONFIG.LOGICAL_W / 2;
    Sprites.ui('icon_quick_match', cx, 150, 280, 200);
    R.text(T('match.tossTitle'), cx, 290, 70, '#ffffff');
    // Code-drawn coin: squash its width to fake a spin.
    const spin = this.phase === 'flip' ? this._t * 18 : 0;
    const w = Math.abs(Math.cos(spin));
    const hop = this.phase === 'flip' ? Math.sin(Math.min(1, this._t / MATCH_DATA.toss.flipTime) * Math.PI) * 120 : 0;
    const cy = 480 - hop;
    const face = this.phase === 'flip' ? (Math.cos(spin) > 0 ? 'heads' : 'tails') : Match.toss.coin;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.max(0.06, w), 1);
    if (!Sprites.ui('result_toss_coin_' + face, 0, 0, 250, 250)) {
      R.circle(0, 0, 110, '#ffcf33', '#a87400', 10);
      R.circle(0, 0, 84, null, 'rgba(168,116,0,0.6)', 5);
      R.text(T('match.coin.' + face), 0, 4, 34, '#8a5a00', 'center', false);
    }
    ctx.restore();

    if (this.phase === 'result') {
      const won = Match.toss.winner === 'player';
      R.text(T(won ? 'match.youWonToss' : 'match.theyWonToss'), cx, 660, 56, won ? '#9cff6a' : '#ffb36b');
      R.text(won ? T('match.chooseBatBowl') : T(Match.toss.choice === 'bat' ? 'match.theyBat' : 'match.theyBowl'),
        cx, 730, 38, '#ffffff', 'center', false);
      this.buttons.draw();
    }
    R.text(T('match.formatLine', { n: Match.fmt.overs }), cx, 1010, 28, '#b8c6d6', 'center', false);
    if (Match.cond) {
      const c = Match.cond;
      R.text(T('match.conditions', { ground: T('stadium.' + c.stadium), pitch: T(STADIUM_DATA.pitchTypes[c.pitch].nameKey),
        weather: T(STADIUM_DATA.weather[c.weather].nameKey) }), cx, 960, 30, '#ffd23f', 'center', false);
    }
  },
};

const MatchBreakScene = {
  buttons: new ButtonList(),
  data: null,
  _t: 0,

  enter(params) {
    this.data = params;
    this._t = 0;
    Stadium.setConditions(Match.cond);
    if (MissionMatch.on) {                               // (M11 missions; M12 the tutorial)
      const tut = MissionMatch.m.tutorial, out = MissionMatch.finish(Save.data);
      Scenes.go(tut ? 'tutorial' : 'missionresult', tut ? { phase: 'after', out } : out);
      return;
    }
    if (params.next === 'result') { Scenes.go('matchresult'); return; }
    Match.checkpoint('break', params.next);   // resume point: the innings break
    Effects.init();
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    this.buttons.add('match.continue', cx - 240, 820, 480, 130, () => Scenes.go(Match.startInnings()), { size: 56 });
    if (params.next === 'superOver') { Sound.play('crowdRoar'); Stadium.cheer(1); }
  },

  update(dt) { this._t += dt; Stadium.update(dt); Effects.update(dt); },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Enter' || code === 'Space') Scenes.go(Match.startInnings()); },

  render(ctx) {
    drawMatchBackdrop(ctx, this._t, 0.6);
    const cx = CONFIG.LOGICAL_W / 2;
    const inns = Match.innings;
    const last = inns[inns.length - 1];
    if (this.data.next === 'superOver') {
      R.text(T('match.scoresTied'), cx, 170, 80, '#ffd23f');
      R.text(T('match.superOver'), cx, 290, 110, '#ffffff');
      R.text(T('match.superOverRules', { w: MATCH_DATA.superOver.wickets }), cx, 390, 34, '#d8e4f0', 'center', false);
      const nextBat = Match._nextBatting();
      R.text(T(nextBat === 'player' ? 'match.youBatFirstSO' : 'match.youBowlFirstSO'), cx, 470, 40, '#9cff6a');
    } else {
      R.text(T('match.inningsBreak'), cx, 150, 70, '#ffffff');
      R.panel(cx - 520, 230, 1040, 190);
      R.text(inningsLine(last), cx, 290, 50, '#ffffff');
      const top = last.topScorer();
      const topP = Match.teams ? Match.teams[last.battingSide].players[top.no - 1] : null;
      R.text(T('match.topScorer', { name: topP ? topP.short : top.no, r: top.runs, b: top.balls }) + ' · ' +
        T('match.extrasLine', { n: last.extras.wides + last.extras.noBalls }), cx, 365, 30, '#b8c6d6', 'center', false);
      const target = last.runs + 1;
      const chaser = last.bowlingSide;
      const balls = (last.isSuper ? MATCH_DATA.superOver.overs : Match.fmt.overs) * 6;
      R.text(T('match.targetN', { n: target }), cx, 520, 90, '#ffd23f');
      R.text(T(chaser === 'player' ? 'match.youNeed' : 'match.theyNeed', { n: target, balls }), cx, 620, 44, '#ffffff');
      R.text(T(chaser === 'player' ? 'match.nowYouBat' : 'match.nowYouBowl'), cx, 700, 36, '#9cff6a', 'center', false);
    }
    this.buttons.draw();
  },
};

const MatchResultScene = {
  buttons: new ButtonList(),
  _t: 0,
  won: false,

  enter() {
    this._t = 0;
    Effects.init();
    const r = Match.result;
    this.won = r.winner === 'player';
    Save.clearResume();
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    this.unlocked = [];
    this.coins = 0;
    if (MyXIMatch.on) {
      // My XI: the competition moves on (the My XI result screen), not the Quick Match record.
      this.buttons.add('myxi.seeResult', cx - 280, 880, 560, 130, () => Scenes.go('myxiresult', MyXIMatch.finish(Save.data)), { size: 46 });
      if (this.won) { Sound.play('fanfare'); Sound.play('crowdRoar'); } else Sound.play('crowdGroan');
      return;
    }
    if (CareerMatch.on) {
      // Career: the result is graded on the career screen, not the Quick Match record.
      this.buttons.add('career.seeGrade', cx - 280, 880, 560, 130, () => Scenes.go('careerresult', CareerMatch.finish()), { size: 50 });
      if (this.won) { Sound.play('fanfare'); Sound.play('crowdRoar'); } else Sound.play('crowdGroan');
      return;
    }
    Save.recordMatch(Match.fmt.id, this.won);
    // Quick Match (plan 19): modest Coins (x difficulty) and a little profile XP for a win.
    this.coins = QuickMatch.coins(this.won, Match.difficulty);
    Save.data.currencies.coins = (Save.data.currencies.coins || 0) + this.coins;
    if (this.won) Profile.add(Save.data, PROFILE_DATA.xp.quickWin, 'quick');
    Sound.play('ui_currency');
    Achievements.afterMatch(Save.data, {}, null); Achievements.checkAccount(Save.data, null);   // (M09)
    // Anything earned by this result (e.g. field settings at Quick Match win milestones).
    this.unlocked = Unlocks.check();
    if (this.unlocked.length) Save.write();
    this.buttons.add('match.playAgain', cx - 440, 880, 400, 130, () => (Match.quick && QuickMatch.last ? Scenes.go(QuickMatch.start(Save.data, QuickMatch.last), { keep: true }) : Scenes.go('toss')), { size: 50 });
    this.buttons.add('result.title_btn', cx + 40, 880, 400, 130, () => Scenes.go('title'), { size: 54, color: '#e9eef5' });
    if (this.won) { Sound.play('fanfare'); Sound.play('crowdRoar'); }
    else Sound.play('crowdGroan');
  },

  update(dt) {
    this._t += dt;
    Effects.update(dt);
    if (this.won && this._t % 0.45 < dt) {
      const x = 300 + ((this._t * 977) % 1320);
      Effects.sparks(x, 180, 16, ['#ffd23f', '#ff5a5a', '#5fd4ff', '#9cff6a'][Math.floor(this._t * 2) % 4], 750);
    }
  },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) {
    if (code === 'Enter' || code === 'Space') Scenes.go('toss');
    if (code === 'Escape') Scenes.go('title');
  },

  render(ctx) {
    const v = Display.viewRect();
    const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h);
    g.addColorStop(0, this.won ? '#12472b' : '#3a1414');
    g.addColorStop(1, '#07170e');
    ctx.fillStyle = g;
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const cx = CONFIG.LOGICAL_W / 2;
    const r = Match.result;
    Sprites.ui(this.won ? 'batter' : 'icon_quick_match', cx - 650, 330, 300, 380, { alpha: 0.95 });
    Sprites.ui(this.won ? 'bowler' : 'marker_wicket', cx + 650, 330, 300, 380, { alpha: 0.95 });

    const pop = Math.min(1, this._t / 0.3);
    ctx.save(); ctx.translate(cx, 140); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
    if (!Sprites.ui(this.won ? 'result_banner_you_win' : 'result_banner_you_lose', 0, 0, 440, 210)) {
      R.text(T(this.won ? 'match.youWon' : 'match.youLost'), 0, 0, 120, this.won ? '#ffd23f' : '#ff8f8f');
    }
    ctx.restore();
    const winnerName = CareerMatch.teamName(r.winner);
    R.text(T(r.marginKey, { team: winnerName, n: r.margin, balls: r.ballsLeft }), cx, 270, 44, '#ffffff');

    // Rows shrink if Super Overs add more innings, so everything fits above the buttons.
    const rowH = Math.min(96, 470 / Math.max(1, Match.innings.length));
    let y = 350;
    Match.innings.forEach((inn, i) => {
      const label = inn.isSuper ? T('match.superOverN', { n: Math.floor((i - 2) / 2) + 1 }) : T('match.inningsN', { n: i + 1 });
      R.panel(cx - 520, y, 1040, rowH - 12);
      R.text(label, cx - 490, y + (rowH - 12) / 2, 26, '#b8c6d6', 'left', false);
      R.text(inningsLine(inn), cx + 490, y + (rowH - 12) / 2, Math.min(36, rowH * 0.42), inn.battingSide === 'player' ? '#9fd0ff' : '#b8f5c0', 'right');
      y += rowH;
    });
    if (this.unlocked && this.unlocked.length) {
      const u = this.unlocked[0];
      const p = FIELD_DATA.presets.find((x) => x.id === u.id);
      const pulse = 1 + Math.sin(this._t * 5) * 0.04;
      R.panel(cx - 470, 770, 940, 90, 'rgba(40,30,4,0.95)', '#ffd23f');
      if (p) Sprites.ui(p.icon, cx - 400, 815, 80 * pulse, 80 * pulse);
      R.text(T('unlock.newField', { f: T('field.' + u.id) }), cx + 40, 815, 38, '#ffd23f');
    }
    const rec = Save.best(Match.fmt.id);
    if (rec && !CareerMatch.on && !MyXIMatch.on && !(this.unlocked && this.unlocked.length)) R.text(T('match.record', { won: rec.won || 0, played: rec.played || 0 }), cx, 840, 30, '#d8e4f0', 'center', false);
    if (this.coins) R.text(T('qm.coinsWon', { n: this.coins, d: T('chal.diff.' + (Match.difficulty || 'pro')) }), cx, 800, 30, '#ffd23f', 'center', false);

    this.buttons.draw();
    Effects.drawParticles(ctx);
    R.text(T('result.seed', { seed: Match.seed }), Display.safe.right - 30, Display.safe.bottom - 30, 22, 'rgba(255,255,255,0.35)', 'right', false);
  },
};
