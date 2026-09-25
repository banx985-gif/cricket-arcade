// Cricket Arcade — Career match screens (M05, plan 8.23, 8.24, 8.7).
//   CareerPreMatchScene  the fixture: both clubs, toss, conditions, your role, the objective
//   CareerSimScene       the balls you're not in, simulated quickly with a ticker;
//                        hands over when you're on strike or it's your over
//   CareerResultScene    D–S grade, figures, objective, XP, form, Selection Meter;
//                        at the end of the stage: promoted / qualifier / extra block
//   CareerPromotedScene  "Promoted!" and Stage 2 coming next

const CareerPreMatchScene = {
  buttons: new ButtonList(),
  _t: 0,
  enter() {
    this._t = 0;
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    this.buttons.add('career.play', cx - 260, 900, 520, 130, () => this._go(), { size: 56, color: '#9cff6a' });
    // Change techniques before the match (plan 11): the loadout, or the tree itself.
    const c = CareerMatch.career, go = (scene) => () => Scenes.go(scene, { slot: CareerMatch.slot, career: c, from: 'prematch', back: 'prematch' });
    this.buttons.add('tree.loadout', cx - 780, 900, 420, 130, go('careerloadout'), { size: 40, color: '#9be7ff',
      sub: () => { const lo = SkillTree.loadout(c); return T('career.loadoutSub', { a: lo.active.length, p: lo.passive.length }); } });
    this.buttons.add('career.skillTree', cx + 360, 900, 420, 130, go('careertree'), { size: 38, color: '#ffd23f',
      sub: () => T('career.treeSub', { n: c.player.skillTokens }) });
    Stadium.setConditions(Match.cond);
  },
  _go() { Scenes.go(Match.startInnings()); },
  update(dt) { this._t += dt; Stadium.update(dt); },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Enter' || code === 'Space') this._go(); },
  render(ctx) {
    drawMatchBackdrop(ctx, this._t, 0.6);
    const cx = CONFIG.LOGICAL_W / 2, c = CareerMatch.career, fx = CareerMatch.fixture;
    R.text(T('career.fixtureKind.' + fx.kind, { n: fx.n, total: Career.stage(c).matches }), cx, 90, 56, fx.kind === 'final' ? '#ffd23f' : '#ffffff');
    Crest.draw(ctx, c.club.crest, cx - 520, 280, 250);
    Crest.draw(ctx, fx.opp.crest, cx + 520, 280, 250);
    R.text(c.club.name, cx - 520, 450, 38, '#ffffff');
    R.text(fx.opp.name, cx + 520, 450, 38, '#ffffff');
    R.text(T('career.vs'), cx, 280, 70, '#ffd23f');
    const toss = Match.toss;
    const ours = toss.firstBatting === 'player' ? 'match.bat' : 'match.bowl';
    R.text(T(toss.winner === 'player' ? 'career.tossWon' : 'career.tossLost', { c: T(ours) }), cx, 530, 32, '#ffffff', 'center', false);
    // Your job in this match
    const pos = parseInt(CareerMatch.pid.replace('player', ''), 10);
    let role = T('career.youBatAt', { n: pos });
    if (CareerMatch.assigned.length) role += ' · ' + T('career.youBowlOvers', { o: CareerMatch.assigned.map((o) => o + 1).join(' & ') });
    R.text(role, cx, 600, 32, '#9be7ff', 'center', false);
    R.text(T('career.objective') + ' ' + CareerText.objective(fx.objective), cx, 660, 32, '#9cff6a', 'center', false);
    const co = Match.cond;
    const pitchIcon = { balanced: 'balanced', green: 'green', dry: 'dry', hardFast: 'hard', worn: 'worn' }[co.pitch];
    const weatherIcon = { clear: 'clear', overcast: 'overcast', windy: 'windy', hotDry: 'hot' }[co.weather];
    Sprites.ui('cond_pitch_icon_' + pitchIcon, cx - 300, 770, 100, 100);
    R.text(T(STADIUM_DATA.pitchTypes[co.pitch].nameKey), cx - 240, 770, 26, '#ffffff', 'left', false);
    Sprites.ui('cond_weather_' + weatherIcon, cx + 120, 770, 100, 100);
    R.text(T(STADIUM_DATA.weather[co.weather].nameKey), cx + 180, 770, 26, '#ffffff', 'left', false);
    if (c.energy < CAREER_DATA.energy.low) R.text(T('career.lowEnergyWarn'), cx, 850, 26, '#ff9d7a', 'center', false);
    else R.text(T('career.formLine', { f: T('career.formLevel.' + c.form) }), cx, 850, 24, '#d8e4f0', 'center', false);
    // Your equipped techniques, and anything from the tree that's switched on today.
    const lo = SkillTree.loadout(c);
    const eq = lo.active.concat(lo.passive);
    if (eq.length) R.roundRect(cx - 890, 745, 30 + eq.length * 110, 110, 24, 'rgba(8,20,36,0.7)', '#9be7ff', 3);
    eq.forEach((id, i) => TreeArt.draw(SKILL_TREE_DATA.techniques[id].icon, cx - 820 + i * 110, 800, 110));
    const notes = (CareerMatch.matchNotes || []).map((id) => TreeText.name(id));
    if (notes.length) R.text(T('career.matchPerks', { list: notes.join(' · ') }), cx, 488, 22, '#ffe28a', 'center', false);
    this.buttons.draw();
  },
};

// =====================================================================================
const CareerSimScene = {
  buttons: new ButtonList(),
  _t: 0, _acc: 0,
  fast: false,
  handover: null,          // { scene, t } — about to go live
  STEP: 0.16,              // seconds per simulated ball (normal speed)

  enter() {
    this._t = 0; this._acc = 0; this.fast = false; this.handover = null;
    const s = Display.safe;
    this.buttons.clear();
    this.buttons.add('career.skip', s.right - 360, s.bottom - 150, 330, 120, () => { this.fast = true; }, { size: 44, color: '#ffd23f' });
    Stadium.setConditions(Match.cond);
  },

  _next() {
    const inn = Match.current();
    if (inn.ended) { Scenes.go('matchbreak', Match.afterInnings()); return false; }
    const live = CareerMatch.liveFor(inn);
    if (live) {
      this.handover = { scene: live === 'bat' ? 'matchbat' : 'matchbowl', t: 0, kind: live };
      Sound.play('crowdCheer', { gain: 0.5 });
      return false;
    }
    const r = CareerMatch.simBall(inn);
    if (r.res.wicket) Sound.play('wicket', { gain: 0.4 });
    else if (r.b.boundary) Sound.play(r.b.boundary === 6 ? 'six' : 'four', { gain: 0.35 });
    return true;
  },

  update(dt) {
    this._t += dt;
    Stadium.update(dt);
    if (this.handover) {
      this.handover.t += dt;
      if (this.handover.t > (this.fast ? 0.2 : 1.1)) Scenes.go(this.handover.scene);
      return;
    }
    if (this.fast) {
      for (let i = 0; i < 240 && Scenes.current === this; i++) if (!this._next()) return;
      return;
    }
    this._acc += dt;
    while (this._acc >= this.STEP && Scenes.current === this && !this.handover) {
      this._acc -= this.STEP;
      if (!this._next()) return;
    }
  },

  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Space' || code === 'Enter') this.fast = true; },

  render(ctx) {
    drawMatchBackdrop(ctx, this._t, 0.55);
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, inn = Match.current();
    if (!inn) return;
    MatchHud.scoreboard(ctx, s.left + 16, s.top + 12, 470, inn, CareerMatch.teamShort(inn.battingSide));
    if (inn.target) MatchHud.target(ctx, s.right - 330, s.top + 10, 290, inn);
    R.text(T(inn.battingSide === 'player' ? 'career.simBatting' : 'career.simBowling'), cx, 150, 44, '#ffffff');
    R.text(T('career.simSub'), cx, 205, 26, '#d8e4f0', 'center', false);
    // ball ticker
    const list = CareerMatch.ticker;
    list.forEach((l, i) => {
      const y = 290 + i * 70, a = 0.4 + 0.6 * (i + 1) / list.length;
      ctx.globalAlpha = a;
      R.panel(cx - 460, y - 30, 920, 60, l.mine ? 'rgba(60,50,10,0.9)' : 'rgba(10,22,40,0.85)');
      R.text(T('career.tickerLine', { b: l.bowler, bat: l.who }), cx - 430, y, 24, '#ffffff', 'left', false);
      const col = l.sym === 'W' ? '#ff4b4b' : l.sym === '6' ? '#ffd23f' : l.sym === '4' ? '#5fd4ff' : '#ffffff';
      R.text(l.sym === 'W' ? T('career.tickerOut', { how: T('how.' + l.how) }) : l.sym, cx + 400, y, 30, col, 'right');
      ctx.globalAlpha = 1;
    });
    if (this.handover) {
      const k = Math.min(1, this.handover.t / 0.2);
      R.panel(cx - 520, 460, 1040, 200, 'rgba(10,40,20,0.96)', '#9cff6a');
      ctx.save(); ctx.translate(cx, 530); ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
      R.text(T(this.handover.kind === 'bat' ? 'career.yourTurnBat' : 'career.yourTurnBowl'), 0, 0, 64, '#9cff6a');
      ctx.restore();
      R.text(T('career.getReady'), cx, 610, 28, '#ffffff', 'center', false);
    } else this.buttons.draw();
  },
};

// =====================================================================================
const CareerResultScene = {
  buttons: new ButtonList(),
  r: null,
  _t: 0,
  enter(params) {
    this.r = params;
    this._dropFx = false;
    this._t = 0;
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    const promoted = params.gate && params.gate.result === 'promoted';
    this.buttons.add(promoted ? 'career.seePromotion' : 'career.toHome', cx - 280, 940, 560, 116,
      () => Scenes.go(promoted ? 'careerpromoted' : 'careerhome', { slot: CareerMatch.slot, career: CareerMatch.career }), { size: 44 });
    Sound.play(this.r.grade === 'S' || this.r.grade === 'A' ? 'fanfare' : 'four');
    if (promoted) Sound.play('crowdRoar');
  },
  update(dt) { this._t += dt; Effects.update(dt); },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Enter' || code === 'Space') this.buttons.items[0].cb(); },
  render(ctx) {
    const r = this.r, c = CareerMatch.career, cx = CONFIG.LOGICAL_W / 2;
    CareerUI.bg(ctx, 'bg_locker_room', 0.6);
    const banner = r.won ? 'result_banner_you_win' : 'result_banner_you_lose';
    if (!Sprites.ui(banner, cx, 110, 520, 200)) R.text(T(r.won ? 'match.youWon' : 'match.youLost'), cx, 110, 70, r.won ? '#ffd23f' : '#ff8f8f');
    // Grade
    const pop = Math.min(1, this._t / 0.35);
    ctx.save(); ctx.translate(cx - 560, 420); ctx.scale(0.4 + 0.6 * pop, 0.4 + 0.6 * pop);
    CareerUI.gradeBadge(r.grade, 0, 0, 360);
    ctx.restore();
    R.text(T('career.matchGrade'), cx - 560, 640, 34, '#ffffff');
    R.text(T('career.gradeScore', { n: r.score }), cx - 560, 685, 22, '#b8c6d6', 'center', false);
    // Figures
    const p = r.perf, x = cx - 250;
    R.panel(x, 230, 800, 440, 'rgba(10,22,40,0.9)');
    R.text(T('career.vsName', { name: r.opp.name }) + '  ·  ' + (p.scoreLine || ''), x + 30, 270, 26, '#ffffff', 'left', false);
    R.text(p.bat.batted ? T('career.batFig', { r: p.bat.runs, b: p.bat.balls, no: p.bat.out ? '' : '*', f: p.bat.fours, s: p.bat.sixes }) : T('career.didNotBat'),
      x + 30, 330, 30, '#9fd0ff', 'left', false);
    const ov = Math.floor(p.bowl.balls / 6) + '.' + (p.bowl.balls % 6);
    if (Career.bowls(c)) R.text(p.bowl.bowled ? T('career.bowlFig', { w: p.bowl.wkts, r: p.bowl.runs, o: ov, d: p.bowl.dots }) : T('career.didNotBowl'), x + 30, 385, 30, '#b8f5c0', 'left', false);
    R.text(T('career.objective') + ' ' + CareerText.objective(r.objective), x + 30, 450, 26, '#ffffff', 'left', false);
    R.text(r.objectiveMet ? T('career.objMet') : T('career.objMissed'), x + 770, 450, 28, r.objectiveMet ? '#9cff6a' : '#ff9d9d', 'right');
    R.text(T('career.xpGain', { n: r.xp }), x + 30, 510, 28, '#c9a6ff', 'left', false);
    if (r.levels) R.text(T('career.levelUp', { n: c.player.level, g: r.levels * CAREER_DATA.levels.growthPerLevel }), x + 770, 620, 26, '#ffb400', 'right');
    R.text(T('career.formChange', { a: T('career.formLevel.' + r.formBefore), b: T('career.formLevel.' + r.formAfter) }), x + 30, 565, 26, '#ffffff', 'left', false);
    // Coins, and what the Wicket Tree did this match (M06)
    if (r.coins) R.text(T('career.coinsGain', { n: r.coins }), x + 770, 510, 26, '#ffe28a', 'right', false);
    const extra = [];
    if (r.crowd) extra.push(T('career.crowdBonus', { n: r.crowd }));
    if (r.formSaved) extra.push(T('career.formSaved'));
    const used = Object.keys(r.techUses || {}).filter((id) => SKILL_TREE_DATA.techniques[id]).map((id) => TreeText.name(id));
    if (used.length) extra.push(T('career.techUsed', { list: used.slice(0, 3).join(', ') + (used.length > 3 ? '…' : '') }));
    extra.forEach((line, i) => R.text(line, cx - 560, 720 + i * 30, 19, '#9be7ff', 'center', false));
    R.text(T('career.energyNow', { n: r.energyAfter }), x + 770, 565, 26, '#ffffff', 'right', false);
    // A gear drop (M07): new item, or a duplicate turned into Coins.
    if (r.drop && this._t > 0.9) this._drawDrop(ctx, r.drop);
    // Selection Meter, filling up
    const S = CAREER_DATA.stages.find((st) => st.id === (c.promotedFrom && r.gate && r.gate.result === 'promoted' ? c.promotedFrom : c.stage)) || Career.stage(c);
    const k = Math.min(1, Math.max(0, (this._t - 0.4) / 0.8));
    const val = r.selBefore + (r.selAfter - r.selBefore) * k;
    R.text(T('career.selectionGain', { n: r.selection }), cx, 730, 30, '#ffd23f');
    if (S.gate) CareerUI.meter(cx - 600, 760, 1200, 36, val, CAREER_DATA.selection.max, '#ffb400',
      [{ at: S.gate.nearMiss, color: '#9be7ff', label: T('career.qualifierMark') }, { at: S.gate.threshold, color: '#9cff6a', label: T('career.promotionMark') }]);
    if (r.gate && this._t > 1.3) {
      const g = r.gate.result;
      R.panel(cx - 620, 845, 1240, 80, g === 'promoted' ? 'rgba(20,70,20,0.96)' : 'rgba(60,40,10,0.96)', g === 'promoted' ? '#9cff6a' : '#ffb400');
      R.text(T('career.gate.' + g, { n: r.gate.matches || 0 }), cx, 885, 32, '#ffffff');
    }
    this.buttons.draw();
    Effects.drawParticles(ctx);
  },

  // Bottom-left: the reward card with the item (or the Coins it turned into).
  _drawDrop(ctx, d) {
    const s = Display.safe, x = Math.max(s.left + 20, CONFIG.LOGICAL_W / 2 - 950), y = 700, w = 300, h = 330;
    const pop = Math.min(1, (this._t - 0.9) / 0.3);
    if (!this._dropFx) {
      this._dropFx = true;
      Effects.sparks(x + w / 2, y + 150, 30, '#ffd23f', 900);
      Sound.play(d.item ? 'fanfare' : 'four');
    }
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop); ctx.translate(-(x + w / 2), -(y + h / 2));
    R.panel(x, y, w, h, 'rgba(40,24,8,0.96)', '#ffd23f');
    if (d.item) {
      const it = Gear.item(d.item);
      R.text(T(d.final ? 'career.dropFinal' : 'career.dropNew'), x + w / 2, y + 30, 26, '#ffd23f');
      GearUI.framed(it, x + w / 2, y + 150, 190, 190);
      CareerTreeScene._fit(T('gear.' + it.id), x + 16, y + 262, w - 32, 24, '#ffffff', true);
      R.text(GearUI.rarityText(it), x + w / 2, y + 295, 18, Gear.rarity(it).colour, 'center', false);
    } else {
      const it = Gear.item(d.dup);
      R.text(T('career.dropDup'), x + w / 2, y + 30, 24, '#ffd23f');
      GearUI.framed(it, x + w / 2, y + 140, 150, 150, { alpha: 0.6 });
      Sprites.ui(d.coins ? 'econ_coin' : 'econ_legacy_mark', x + 70, y + 262, 60, 60);
      R.text(d.coins ? T('career.coinsGain', { n: d.coins }) : T('career.dropMark'), x + 190, y + 262, 26, '#ffe28a');
      R.text(T('career.dropDupSub'), x + w / 2, y + 302, 16, '#d8e4f0', 'center', false);
    }
    ctx.restore();
  },
};

// =====================================================================================
const CareerPromotedScene = {
  buttons: new ButtonList(),
  _t: 0,
  enter(params) {
    this.slot = params.slot; this.career = params.career; this._t = 0;
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    this.buttons.add('career.toHome', cx - 260, 930, 520, 116, () => Scenes.go('careerhome', { slot: this.slot, career: this.career, stay: true }), { size: 44 });
    Effects.init();
    Sound.play('fanfare');
  },
  update(dt) {
    this._t += dt;
    Effects.update(dt);
    if (this._t % 0.4 < dt) Effects.sparks(300 + ((this._t * 977) % 1320), 180, 16, ['#ffd23f', '#9cff6a', '#5fd4ff', '#ff5a5a'][Math.floor(this._t * 3) % 4], 800);
  },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Enter' || code === 'Space') this.buttons.items[0].cb(); },
  render(ctx) {
    const c = this.career, cx = CONFIG.LOGICAL_W / 2;
    CareerUI.bg(ctx, 'bg_scout_room', 0.55);
    Sprites.ui('milestone_domestic_promotion', cx - 430, 470, 700, 520);
    Sprites.ui('stage_regional', cx + 450, 440, 480, 400);
    const pop = Math.min(1, this._t / 0.3);
    ctx.save(); ctx.translate(cx, 110); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
    R.text(T('career.promoted'), 0, 0, 90, '#ffd23f');
    ctx.restore();
    R.text(T('career.promotedTo', { stage: CareerUI.pathwayLabel(c, 2) }), cx, 200, 40, '#ffffff');
    R.text(T('career.stage2Next'), cx + 450, 700, 32, '#9cff6a');
    R.text(T('career.tokensEarned', { n: CAREER_DATA.levels.skillTokensPerPromotion }), cx, 820, 30, '#ffd23f', 'center', false);
    R.text(T('career.stage2Soon'), cx, 870, 26, '#d8e4f0', 'center', false);
    this.buttons.draw();
    Effects.drawParticles(ctx);
  },
};
