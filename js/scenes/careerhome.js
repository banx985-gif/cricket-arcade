// Cricket Arcade — Career Home (M05, plan 5.6, 5.7, 8.13–8.15, 10).
// Portrait, club, role, overall, energy, form, the next fixture, the Selection
// Meter and the current objective. The schedule loop: two prep actions
// (TRAIN or REST), then PLAY NEXT. Panels open over the screen:
//   schedule  every fixture this stage, with grades
//   train     pick a drill (quick resolve)
//   result    what training / rest did
//   player    stats, level, XP; spend Growth Points (plan 10)
// SKILL TREE opens the Wicket Tree, LOADOUT the technique loadout (M06).
// EQUIPMENT, SHOP and COLLECTION open the gear screens (M07). Coach and Records
// are shown greyed out, "coming soon".

const CareerHomeScene = {
  career: null,
  slot: 1,
  panel: null,            // null | 'schedule' | 'train' | 'result' | 'player'
  result: null,
  buttons: new ButtonList(),
  panelBtns: new ButtonList(),
  _t: 0,

  enter(params) {
    CareerAssets.ensure(); GearAssets.ensure();
    CareerMatch.on = false;
    this.slot = params.slot || this.slot;
    this.career = params.career || this.career;
    this.panel = null;
    this._t = 0;
    if (!params.career) {
      // coming back without the object (e.g. pause -> Career Home): reload it
      CareerSave.load(this.slot).then((c) => { if (c) { this.career = c; this._layout(); } });
    }
    if (this.career && this.career.phase === 'promoted' && !params.stay) { Scenes.go('careerpromoted', { slot: this.slot, career: this.career }); return; }
    this._layout();
    this._checkEvent();
  },
  // A pending event (or a rival's build-up before a boss match) opens its panel.
  _checkEvent() {
    const c = this.career;
    if (!c || c.phase !== 'season') return;
    if (!c.pendingEvent) Rivals.pendingFor(c);
    if (c.pendingEvent) EventPanel.open(c, this.slot, () => this._layout());
  },

  _save() { return CareerSave.save(this.career, this.slot); },

  _layout() {
    const b = this.buttons, s = Display.safe, c = this.career;
    b.clear();
    if (!c) return;
    b.add('career.backHome', s.left + 24, s.top + 24, 220, 90, () => Scenes.go('careerselect'), { size: 34, color: '#e9eef5' });
    const promoted = c.phase === 'promoted';
    const noPrep = () => promoted || Career.prepsLeft(c) <= 0;
    const y = s.bottom - 170;
    b.add('career.schedule', s.left + 30, y, 330, 140, () => (c.tour ? Scenes.go('careertable', { slot: this.slot, career: c }) : this._open('schedule')), { size: 34, color: '#e9eef5', icon: 'stage_selection_meter' });
    b.add('career.train', s.left + 380, y, 330, 140, () => this._open('train'), { size: 38, icon: 'train_timing_cage', disabled: noPrep, sub: () => T('career.prepLeft', { n: Career.prepsLeft(c) }) });
    b.add('career.rest', s.left + 730, y, 330, 140, () => this._rest(), { size: 38, color: '#9be7ff', icon: 'career_rest', disabled: noPrep, sub: 'career.restSub' });
    b.add('career.playNext', s.right - 520, y - 10, 490, 160, () => this._play(), { size: 54, color: '#9cff6a', disabled: () => c.phase !== 'season' || !Career.next(c) });
    // Between stages: start the next one (Stage 4: see the contract offers first).
    const S = Career.stage(c);
    if (promoted && !S.comingSoon) b.add('career.startStage', s.right - 520, y - 10, 490, 160, () => this._startStage(), { size: 40, color: '#ffd23f',
      sub: () => CareerUI.pathwayLabel(c) });
    // Stage 8 over: retire (plan 8.21), or face the Champion again.
    if (c.phase === 'complete') {
      b.add('legacy.retireBtn', s.right - 520, y - 10, 490, 160, () => Scenes.go('careerretire', { slot: this.slot, career: c }), { size: 44, color: '#ffd23f' });
      if (!(c.hooks.rivals && c.hooks.rivals.champion && c.hooks.rivals.champion.beaten)) b.add('career.rematch', s.left + 710, 680, 560, 90, () => { Career.rematch(c); this._save(); this._layout(); this._checkEvent(); }, { size: 30, color: '#ff9d7a' });
    }
    if (c.phase === 'offers') b.add('career.seeOffers', s.right - 520, y - 10, 490, 160, () => Scenes.go('careeroffers', { slot: this.slot, career: c }), { size: 40, color: '#ffd23f', icon: 'stage_contract_offer' });
    // The Wicket Tree and the technique loadout (M06)
    b.add('career.skillTree', s.right - 520, 130, 490, 170, () => Scenes.go('careertree', { slot: this.slot, career: c }), {
      size: 44, color: '#ffd23f', icon: 'train_technique_practice', sub: () => T('career.treeSub', { n: c.player.skillTokens }),
    });
    b.add('tree.loadout', s.right - 520, 320, 490, 130, () => Scenes.go('careerloadout', { slot: this.slot, career: c }), {
      size: 40, color: '#9be7ff', sub: () => { const lo = SkillTree.loadout(c); return T('career.loadoutSub', { a: lo.active.length, p: lo.passive.length }); },
    });
    // Equipment, the shop and the Collection Book (M07)
    b.add('career.equipment', s.right - 520, 470, 490, 124, () => Scenes.go('careergear', { slot: this.slot, career: c }), {
      size: 40, color: '#ffb36b', icon: 'slot_bat', sub: () => T('career.equipmentSub', { n: Gear.ownedCount(Save.data) }),
    });
    b.add('career.shop', s.right - 520, 612, 240, 104, () => Scenes.go('careershop', { slot: this.slot, career: c }), { size: 28, color: '#ffd23f', icon: 'shop_sign' });
    b.add('career.collection', s.right - 270, 612, 240, 104, () => Scenes.go('collection', { back: 'careerhome', slot: this.slot, career: c }), { size: 18, color: '#9be7ff', icon: 'icon_collection' });
    // The coach (M08); Records is still to come.
    b.add('career.coach', s.right - 520, 734, 240, 90, () => Scenes.go('careercoach', { slot: this.slot, career: c }), { size: 24, color: '#c9b3ff', icon: 'meta_coach',
      sub: () => (Coaches.active(c) ? T('coach.' + Coaches.active(c)) : T('coach.noneShort')) });
    b.add('career.records', s.right - 270, 734, 240, 90, () => Scenes.go('records', { back: 'careerhome', slot: this.slot, career: c }), { size: 22, color: '#e9eef5', icon: 'meta_records',
      sub: () => T('ach.short', { n: Object.keys(Save.data.achievements || {}).length }) });
    // tap the portrait area for the player panel
    b.add(() => '', s.left + 40, 150, 470, 470, () => this._open('player'), { color: 'rgba(0,0,0,0)' });
    b.items[b.items.length - 1].invisible = true;
  },

  _open(p) {
    this.panel = p;
    const c = this.career, pb = this.panelBtns, cx = CONFIG.LOGICAL_W / 2;
    pb.clear();
    pb.add('career.close', cx - 200, 930, 400, 100, () => { this.panel = null; }, { size: 40, color: '#e9eef5' });
    if (p === 'train') {
      const drills = CAREER_DATA.training.filter((d) => d.for === 'all' || (d.for === 'bat' && (c.player.role !== 'bowler')) || (d.for === 'bowl' && Career.bowls(c)));
      drills.forEach((d, i) => {
        const x = cx - 880 + (i % 4) * 445, y = 240 + Math.floor(i / 4) * 300;
        const emph = d.emphasis && c.club && (c.club.emphasis === d.emphasis || c.club.emphasis === 'balanced');
        pb.add('train.' + d.id, x, y, 425, 270, () => this._train(d.id), {
          size: 24, color: emph ? '#ffe28a' : '#e9eef5', icon: d.icon,
          sub: () => T('career.drillSub', { stat: T('stat.' + d.stat), e: d.energy }),
        });
      });
    }
    if (p === 'player') {
      PLAYER_DATA.stats.batting.concat(PLAYER_DATA.stats.bowling, PLAYER_DATA.stats.shared).forEach((k, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        pb.add(() => '+', cx - 170 + col * 820, 250 + row * 92, 110, 80, () => { if (Career.spendGrowth(c, k)) this._save(); },
          { size: 36, color: '#9cff6a', disabled: () => c.player.growthPoints < Career.growthCost(c, k), sub: () => T('career.cost', { n: Career.growthCost(c, k) }) });
      });
    }
  },

  _train(id) {
    const res = Career.train(this.career, id);
    if (!res) return;
    this.result = { kind: 'train', res };
    this._save();                                   // autosave after a career action
    Sound.play(res.levels ? 'fanfare' : 'four');
    this._open('result');
  },

  _rest() {
    const res = Career.rest(this.career);
    if (!res) return;
    this.result = { kind: 'rest', res };
    this._save();
    Sound.play('uiTap');
    this._open('result');
  },

  // Start the stage the career was promoted into.
  _startStage() {
    const c = this.career, r = Career.beginStage(c);
    if (!r) return;
    this._save();
    if (r === 'offers') Scenes.go('careeroffers', { slot: this.slot, career: c });
    else Scenes.go('careerjoin', { slot: this.slot, career: c });
  },

  _play() {
    const c = this.career;
    const go = (scene) => { this.panel = null; Scenes.go(scene); };
    // A match left part-way: pick it up from its checkpoint if it's still there.
    if (c.matchInProgress) {
      Save.loadResume().then((doc) => {
        const cp = doc && doc.checkpoint;
        if (cp && cp.career && cp.career.slot === this.slot && cp.career.n === c.matchInProgress.n) {
          CareerMatch.resumeFrom(cp).then(([scene, params]) => Scenes.go(scene, params)).catch(() => go(CareerMatch.start(c, this.slot)));
        } else go(CareerMatch.start(c, this.slot));
      });
      return;
    }
    go(CareerMatch.start(c, this.slot));
  },

  update(dt) { this._t += dt; if (EventPanel.isOpen()) EventPanel.update(dt); },

  _list() { return EventPanel.isOpen() && EventPanel.career === this.career ? EventPanel.buttons : this.panel ? this.panelBtns : this.buttons; },
  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); this._list().down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this._list().move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this._list().up(id); },
  keyDown(code) {
    if (EventPanel.isOpen()) return;
    if (code === 'Escape') { if (this.panel) this.panel = null; else Scenes.go('careerselect'); }
    if (this.panel) return;
    if (code === 'Enter' || code === 'Space') this._play();
    if (code === 'KeyT') this._open('train');
    if (code === 'KeyR') this._rest();
    if (code === 'KeyK') Scenes.go('careertree', { slot: this.slot, career: this.career });
    if (code === 'KeyE') Scenes.go('careergear', { slot: this.slot, career: this.career });
  },

  // ---------------------------------------------------------------- drawing
  render(ctx) {
    const c = this.career;
    CareerUI.bg(ctx, 'bg_locker_room', 0.35);
    if (!c) return;
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, p = c.player, S = Career.stage(c);

    // ---- left: the player ----
    R.panel(s.left + 30, 130, 500, 740, 'rgba(10,22,40,0.9)', '#ffd23f');
    Portrait.draw(ctx, p, s.left + 280, 330, 330);
    R.text(p.name, s.left + 280, 540, 40, '#ffffff');
    const arch = T('create.arch.' + p.archetype);
    R.text(T('career.role.' + p.role) + ' · ' + arch, s.left + 280, 588, 19, '#9be7ff', 'center', false);
    R.text(T('career.ovr', { n: Career.overall(c) }), s.left + 150, 650, 44, '#ffd23f');
    R.text(T('career.levelN', { n: p.level }), s.left + 400, 634, 30, '#ffffff');
    CareerUI.meter(s.left + 300, 660, 200, 18, p.xp, CAREER_DATA.levels.xpFor(p.level), '#9b5cff');
    if (p.growthPoints > 0) {
      const pulse = 1 + Math.sin(this._t * 5) * 0.05;
      R.roundRect(s.left + 70, 700, 420, 56, 20, 'rgba(60,160,60,0.9)');
      R.text(T('career.growthReady', { n: p.growthPoints }), s.left + 280, 728, 26 * pulse, '#ffffff', 'center', false);
    } else R.text(T('career.tapForStats'), s.left + 280, 728, 22, '#b8c6d6', 'center', false);
    R.text(T('career.skillTokens', { n: p.skillTokens }), s.left + 280, 772, 20, '#ffd23f', 'center', false);
    const tm = Career.team(c);
    Crest.draw(ctx, tm.crest, s.left + 110, 830, 90);
    CareerTreeScene._fit(tm.name, s.left + 170, 830, 270, 26, '#ffffff');
    Sprites.ui('badge_' + c.origin, s.left + 470, 830, 70, 70);

    // ---- centre: the stage, Selection Meter, next fixture ----
    const x0 = s.left + 570, w = 840;
    R.text(T('career.stageTitle', { n: S.n, stage: CareerUI.pathwayLabel(c) }), x0 + w / 2, 70, 44, '#ffffff');
    R.panel(x0, 115, w, 170, 'rgba(10,22,40,0.88)');
    R.text(T('career.selection'), x0 + 30, 150, 28, '#ffd23f', 'left');
    R.text(String(c.selection), x0 + w - 30, 150, 34, '#ffffff', 'right');
    if (S.gate) {
      CareerUI.meter(x0 + 30, 180, w - 60, 34, c.selection, CAREER_DATA.selection.max, '#ffb400',
        [{ at: S.gate.nearMiss, color: '#9be7ff', label: T('career.qualifierMark') }, { at: S.gate.threshold, color: '#9cff6a', label: T('career.promotionMark') }]);
    }
    CareerUI.energyForm(ctx, c, x0 + 10, 300);

    const nx = Career.next(c);
    R.panel(x0, 400, w, 330, 'rgba(10,22,40,0.9)', nx && nx.kind === 'final' ? '#ffd23f' : 'rgba(255,255,255,0.35)');
    if (nx) {
      R.text(T('career.nextFixture'), x0 + 30, 432, 24, '#b8c6d6', 'left', false);
      R.text(T('career.fixtureKind.' + nx.kind, { n: nx.n, total: S.matches }), x0 + w - 30, 432, 26, nx.kind === 'final' || nx.kind === 'semi' ? '#ffd23f' : '#ffffff', 'right');
      Crest.draw(ctx, tm.crest, x0 + 210, 525, 110);
      R.text(T('career.vs'), x0 + w / 2, 530, 40, '#ffffff');
      Crest.draw(ctx, nx.opp.crest, x0 + w - 210, 525, 110);
      R.text(tm.name, x0 + 210, 598, 24, '#ffffff', 'center', false);
      if (nx.rival) {
        R.roundRect(x0 + w / 2 - 140, 452, 280, 44, 20, '#b0122a', '#ffd23f', 3);
        R.text(T('career.bossMatch'), x0 + w / 2, 474, 24, '#ffffff');
        Sprites.ui(Rivals.rival(nx.rival).art, x0 + w - 70, 530, 120, 150);
      }
      R.text(nx.opp.name, x0 + w - 210, 598, 24, '#ffffff', 'center', false);
      R.text(T('career.oppRating', { n: nx.opp.rating }), x0 + w / 2, 575, 18, '#b8c6d6', 'center', false);
      R.text(T('career.objective') + ' ' + CareerText.objective(nx.objective), x0 + w / 2, 648, 26, '#9cff6a', 'center', false);
      const dots = CAREER_DATA.prepPerBlock;
      for (let i = 0; i < dots; i++) R.circle(x0 + w / 2 - 30 + i * 60, 695, 16, i < c.block.preps ? '#ffd23f' : 'rgba(255,255,255,0.2)', '#ffffff', 3);
      R.text(T('career.prepDots'), x0 + w / 2 + 70, 695, 20, '#b8c6d6', 'left', false);
    } else if (c.phase === 'promoted' && S.comingSoon) {
      Sprites.ui(S.art, x0 + w / 2, 530, 200, 180);
      R.text(T('career.nextComing', { stage: CareerUI.pathwayLabel(c) }), x0 + w / 2, 660, 32, '#ffd23f');
    } else if (c.phase === 'promoted') {
      Sprites.ui(S.art, x0 + w / 2, 530, 200, 180);
      R.text(T('career.readyForStage', { n: S.n, stage: CareerUI.pathwayLabel(c) }), x0 + w / 2, 660, 30, '#ffd23f');
    } else if (c.phase === 'complete') {
      Sprites.ui('milestone_career_retirement', x0 + w / 2, 520, 260, 200);
      const beat = c.hooks.rivals && c.hooks.rivals.champion && c.hooks.rivals.champion.beaten;
      R.text(T(beat ? 'career.completeChamp' : 'career.complete'), x0 + w / 2, 650, 30, '#ffd23f');
    } else if (c.phase === 'offers') {
      Sprites.ui('stage_contract_offer', x0 + w / 2, 530, 200, 180);
      R.text(T('career.offersWaiting'), x0 + w / 2, 660, 30, '#ffd23f');
    }
    this._drawExtras(ctx, x0, w);
    if (c.player.growthPoints === 0 && c.energy < CAREER_DATA.energy.low) {
      R.text(T('career.lowEnergyTip'), x0 + w / 2, 880, 24, '#ff9d7a', 'center', false);
    }

    this.buttons.items.forEach((bt) => { if (bt.invisible) bt._skip = true; });
    this._drawButtons();

    if (this.panel) this._drawPanel(ctx);
    if (EventPanel.isOpen() && EventPanel.career === c) EventPanel.draw(ctx);
  },

  // Under the fixture: the sponsor deal, the contract, and 'scouts watching' (M08).
  _drawExtras(ctx, x0, w) {
    const c = this.career, S = Career.stage(c);
    let y = 770;
    if (c.sponsor) {
      const P = Sponsors.sponsor(c.sponsor.id);
      R.panel(x0, y - 36, w, 72, 'rgba(10,22,40,0.9)', '#ffd23f');
      Sprites.ui(P.logo, x0 + 50, y, 80, 64);
      R.text(T('sponsor.active', { name: T('sponsor.' + P.id), goal: EventText.goal(P) }), x0 + 100, y - 12, 20, '#ffffff', 'left', false);
      R.text(T('sponsor.progress', { have: c.sponsor.have, need: c.sponsor.need, left: c.sponsor.left, reward: EventText.reward(P.reward) }), x0 + 100, y + 16, 18, '#9cff6a', 'left', false);
      y += 84;
    }
    if (c.contract && c.phase === 'season' && S.team === 'franchise') {
      R.text(T('career.contractLine', { n: c.contract.salary, obj: EventText.contract(c.contract.objective) }), x0 + w / 2, y, 20, '#ffe28a', 'center', false);
      y += 34;
    }
    if (S.scouts && c.phase === 'season') R.text(T('career.scouts'), x0 + w / 2, y, 22, '#9be7ff', 'center');
  },

  _drawButtons() {
    const list = this.buttons, keep = list.items;
    list.items = keep.filter((b) => !b.invisible);
    list.draw();
    list.items = keep;
  },

  _drawPanel(ctx) {
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2, c = this.career;
    ctx.fillStyle = 'rgba(3,10,20,0.85)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    if (this.panel === 'schedule') this._drawSchedule(ctx);
    else if (this.panel === 'train') {
      R.text(T('career.trainTitle'), cx, 110, 64, '#ffffff');
      R.text(T('career.trainSub', { e: c.energy, emph: T('emphasis.' + c.club.emphasis) }), cx, 175, 26, '#d8e4f0', 'center', false);
    } else if (this.panel === 'result') this._drawResult(ctx);
    else if (this.panel === 'player') this._drawPlayer(ctx);
    this.panelBtns.draw();
  },

  _drawSchedule(ctx) {
    const c = this.career, cx = CONFIG.LOGICAL_W / 2, S = Career.stage(c);
    R.text(T('career.scheduleTitle', { stage: CareerUI.pathwayLabel(c) }), cx, 100, 56, '#ffffff');
    R.text(T('career.scheduleSub', { t: S.gate ? S.gate.threshold : '-', q: S.gate ? S.gate.nearMiss : '-' }), cx, 160, 24, '#d8e4f0', 'center', false);
    const nx = Career.next(c);
    c.fixtures.forEach((f, i) => {
      const y = 210 + i * 110, x = cx - 700;
      R.panel(x, y, 1400, 96, f === nx ? 'rgba(40,60,20,0.95)' : 'rgba(10,22,40,0.9)', f.kind === 'final' ? '#ffd23f' : 'rgba(255,255,255,0.3)');
      R.text(T('career.fixtureKind.' + f.kind, { n: f.n, total: S.matches }), x + 30, y + 48, 26, '#ffffff', 'left', false);
      Crest.draw(ctx, f.opp.crest, x + 420, y + 48, 80);
      R.text(T('career.vsName', { name: f.opp.name }), x + 480, y + 48, 26, '#ffffff', 'left', false);
      if (f.played) {
        R.text(T(f.won ? 'career.won' : 'career.lost') + '  ' + (f.score || ''), x + 1000, y + 48, 24, f.won ? '#9cff6a' : '#ff9d9d', 'center', false);
        CareerUI.gradeBadge(f.grade, x + 1330, y + 48, 84);
      } else if (f === nx) R.text(T('career.upNext'), x + 1250, y + 48, 26, '#ffd23f', 'center');
    });
  },

  _drawResult(ctx) {
    const r = this.result, cx = CONFIG.LOGICAL_W / 2, c = this.career;
    if (!r) return;
    if (r.kind === 'train') {
      const D = CAREER_DATA.training.find((d) => d.id === r.res.drill);
      Sprites.ui(D.icon, cx, 330, 300, 300);
      R.text(T('train.' + D.id), cx, 530, 54, '#ffffff');
      R.text(r.res.gain > 0 ? T('career.statUp', { n: r.res.gain, stat: T('stat.' + D.stat) }) : T('career.tooTired'), cx, 610, 46, r.res.gain > 0 ? '#9cff6a' : '#ff9d7a');
      R.text(T('career.xpEnergy', { xp: r.res.xp, e: -r.res.energy }), cx, 680, 30, '#d8e4f0', 'center', false);
      if (r.res.emphasis) R.text(T('career.emphasisBonus'), cx, 730, 26, '#ffd23f', 'center', false);
      if (r.res.levels) R.text(T('career.levelUp', { n: c.player.level, g: r.res.levels * CAREER_DATA.levels.growthPerLevel }), cx, 800, 44, '#ffb400');
    } else {
      Sprites.ui('career_rest', cx, 330, 300, 300);
      R.text(T('career.rested'), cx, 530, 54, '#ffffff');
      R.text(T('career.energyUp', { n: r.res.energy, e: c.energy }), cx, 610, 40, '#9cff6a');
      if (r.res.formUp) R.text(T('career.formRecovered'), cx, 680, 30, '#ffd23f', 'center', false);
    }
    R.text(Career.prepsLeft(c) ? T('career.prepLeftLong', { n: Career.prepsLeft(c) }) : T('career.readyToPlay'), cx, 870, 28, '#b8c6d6', 'center', false);
  },

  _drawPlayer(ctx) {
    const c = this.career, p = c.player, cx = CONFIG.LOGICAL_W / 2;
    R.text(T('career.playerTitle', { name: p.name }), cx, 90, 52, '#ffffff');
    R.text(T('career.growthLine', { g: p.growthPoints, lvl: p.level, xp: p.xp, need: CAREER_DATA.levels.xpFor(p.level) }), cx, 150, 26, '#ffd23f', 'center', false);
    const keys = PLAYER_DATA.stats.batting.concat(PLAYER_DATA.stats.bowling, PLAYER_DATA.stats.shared);
    const eff = Career.effectiveStats(c);
    keys.forEach((k, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = cx - 820 + col * 820, y = 288 + row * 92;
      R.text(T('stat.' + k), x, y, 28, '#ffffff', 'left', false);
      CareerUI.meter(x + 220, y - 14, 330, 28, p.stats[k], 99, '#2f9bff');
      R.text(String(p.stats[k]), x + 575, y, 30, '#ffffff', 'left');
      if (eff[k] !== p.stats[k]) R.text((eff[k] > p.stats[k] ? '+' : '') + (eff[k] - p.stats[k]), x + 630, y, 22, eff[k] > p.stats[k] ? '#9cff6a' : '#ff9d7a', 'left', false);
    });
    R.text(T('career.formNote'), cx, 890, 20, '#b8c6d6', 'center', false);
  },
};

// Text for objectives etc.
const CareerText = {
  objective(o) {
    if (!o) return '';
    return T('objective.' + o.id, { n: o.n });
  },
};
