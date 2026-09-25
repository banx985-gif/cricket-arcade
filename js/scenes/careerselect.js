// Cricket Arcade — Career Select and New Career (M05, plan 5.4, 5.5, 5.5A, 5.5B, Tutorial Step 1).
//   CareerSelectScene  3 career slots: continue, start new, or delete (with a confirm)
//   CareerCreateScene  make your cricketer in 4 steps:
//                      look -> role & style -> cricket origin -> local club offers
//   CareerSignScene    "SIGNED!" with the local club signing art

// Career art is large, so it loads the first time Career is opened.
const CareerAssets = {
  loaded: false,
  ensure() {
    if (this.loaded) return;
    this.loaded = true;
    Sprites.loadGroup('career');
    Sprites.loadGroup('skilltree');              // technique icons (M06)
    Sprites.loadGroup('skilltreeArt');           // Wicket Tree art, when it's filed
  },
};

// Small helpers shared by the career scenes.
const CareerScene = {
  pointers(scene, lists) {
    return {
      pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); for (const l of lists()) if (l.down(id, x, y)) return; if (scene.tap) scene.tap(x, y); },
      pointerMove(id, x, y) { if (Dev.pointerMove(id, x, y)) return; for (const l of lists()) l.move(id, x, y); },
      pointerUp(id) { if (Dev.pointerUp(id)) return; for (const l of lists()) if (l.up(id)) return; },
    };
  },
  roleIcon(role) { return { batter: 'shot_power', bowler: 'bowl_stock', allrounder: 'hero_allrounder' }[role]; },
  inBox(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; },
};

// =====================================================================================
const CareerSelectScene = {
  buttons: new ButtonList(),
  confirmBtns: new ButtonList(),
  confirming: null,       // slot being deleted
  _t: 0,

  enter() {
    CareerAssets.ensure();
    this._t = 0;
    this.confirming = null;
    this._layout();
  },

  _slots() { return Save.data.careerSlots; },

  _layout() {
    const cx = CONFIG.LOGICAL_W / 2, s = Display.safe;
    const b = this.buttons;
    b.clear();
    b.add('common.back', s.left + 24, s.top + 24, 220, 96, () => Scenes.go('title'), { size: 40, color: '#e9eef5' });
    const w = 540, gap = 30, x0 = cx - (w * 3 + gap * 2) / 2;
    this.cards = [];
    for (let i = 0; i < CAREER_DATA.slots; i++) {
      const slot = i + 1, x = x0 + i * (w + gap), sum = this._slots()[i];
      this.cards.push({ x, y: 230, w, h: 620, slot, sum });
      if (sum) {
        b.add('career.continue', x + 30, 720, w - 60, 100, () => this._continue(slot), { size: 44 });
        b.add('career.delete', x + w - 190, 250, 160, 70, () => { this.confirming = slot; this._layoutConfirm(); }, { size: 26, color: '#ff9b9b' });
      } else {
        b.add('career.new', x + 30, 720, w - 60, 100, () => Scenes.go('careercreate', { slot }), { size: 44, color: '#9cff6a' });
      }
    }
  },

  _layoutConfirm() {
    const cx = CONFIG.LOGICAL_W / 2, c = this.confirmBtns;
    c.clear();
    c.add('career.deleteYes', cx - 460, 640, 440, 120, () => this._delete(this.confirming), { size: 40, color: '#ff6b6b' });
    c.add('settings.resetNo', cx + 20, 640, 440, 120, () => { this.confirming = null; }, { size: 44, color: '#e9eef5' });
  },

  _continue(slot) {
    CareerSave.load(slot).then((c) => {
      if (!c) { Log.add('error', 'career slot ' + slot + ' is empty'); return; }
      if (c.phase === 'create' || c.phase === 'club') Scenes.go('careercreate', { slot, career: c });
      else Scenes.go('careerhome', { slot, career: c });
    });
  },

  _delete(slot) {
    this.confirming = null;
    CareerSave.remove(slot).then(() => this._layout());
  },

  update(dt) { this._t += dt; },

  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); (this.confirming ? this.confirmBtns : this.buttons).down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) (this.confirming ? this.confirmBtns : this.buttons).move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) (this.confirming ? this.confirmBtns : this.buttons).up(id); },
  keyDown(code) {
    if (code === 'Escape') { if (this.confirming) this.confirming = null; else Scenes.go('title'); }
    const n = { Digit1: 1, Digit2: 2, Digit3: 3 }[code];
    if (n && !this.confirming) { if (this._slots()[n - 1]) this._continue(n); else Scenes.go('careercreate', { slot: n }); }
  },

  render(ctx) {
    CareerUI.bg(ctx, 'bg_locker_room', 0.55);
    const cx = CONFIG.LOGICAL_W / 2;
    R.text(T('career.selectTitle'), cx, 130, 80, '#ffffff');
    R.text(T('career.selectSub'), cx, 195, 28, '#d8e4f0', 'center', false);
    for (const c of this.cards) {
      R.panel(c.x, c.y, c.w, c.h, 'rgba(10,22,40,0.92)', c.sum ? '#ffd23f' : 'rgba(255,255,255,0.35)');
      R.text(T('career.slotN', { n: c.slot }), c.x + 30, c.y + 42, 26, '#b8c6d6', 'left', false);
      const s = c.sum;
      if (!s) {
        R.text(T('career.emptySlot'), c.x + c.w / 2, c.y + 260, 44, 'rgba(255,255,255,0.55)');
        Sprites.ui('stage_local', c.x + c.w / 2, c.y + 390, 200, 160, { alpha: 0.5 });
        continue;
      }
      Portrait.draw(ctx, s, c.x + c.w / 2, c.y + 190, 220);
      R.text(s.name, c.x + c.w / 2, c.y + 340, 40, '#ffffff');
      R.text(T('career.role.' + s.role) + ' · ' + T('career.ovr', { n: s.overall }) + ' · ' + T('career.levelN', { n: s.level }),
        c.x + c.w / 2, c.y + 390, 26, '#9be7ff', 'center', false);
      const O = ORIGIN_PACKS.origins[s.origin];
      R.text(s.club || (O ? O.displayName : ''), c.x + c.w / 2, c.y + 432, 26, '#ffffff', 'center', false);
      const stageLine = s.phase === 'promoted' ? T('career.slotPromoted')
        : s.fixture ? T('career.slotStage', { n: s.stageN, stage: O ? O.pathwayLabels[s.stageN - 1] : '', f: s.fixture }) : T('career.slotCreating');
      R.text(stageLine, c.x + c.w / 2, c.y + 472, 24, '#ffd23f', 'center', false);
      if (O) Sprites.ui('badge_' + s.origin, c.x + 70, c.y + 110, 80, 80);
    }
    this.buttons.draw();
    if (this.confirming) {
      const v = Display.viewRect();
      ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(v.x, v.y, v.w, v.h);
      R.panel(cx - 560, 300, 1120, 520, 'rgba(40,14,14,0.97)', '#ff6b6b');
      R.text(T('career.deleteConfirm', { n: this.confirming }), cx, 420, 54, '#ffffff');
      R.text(T('career.deleteWarn'), cx, 520, 32, '#ffd0d0', 'center', false);
      this.confirmBtns.draw();
    }
  },
};

// =====================================================================================
const CareerCreateScene = {
  step: 'look',
  steps: ['look', 'role', 'origin', 'club'],
  draft: null,
  career: null,
  slot: 1,
  buttons: new ButtonList(),
  _t: 0,

  enter(params) {
    CareerAssets.ensure();
    this.slot = params.slot || 1;
    this._t = 0;
    if (params.career) {
      // an unfinished creation: straight to the club offers
      this.career = params.career;
      this.draft = Object.assign({}, params.career.player, { origin: params.career.origin, seed: params.career.seed });
      if (!this.career.offers) this.career.offers = Career.clubOffers(this.career);
      this.step = 'club';
    } else {
      this.career = null;
      const seed = Dev.fixedSeed !== null ? Dev.fixedSeed : RNG.freshSeed();
      const r = makeRng(seed ^ 0x51ed);
      this.draft = {
        seed, presentation: 'masculine', look: CAREER_DATA.looks.masculine[0], facial: 'none',
        skin: 'tan', hairColour: 'brown', batHand: 'right', bowlHand: 'right',
        role: 'batter', archetype: 'powerHitter', batRole: 'top', family: 'fast', origin: 'england',
      };
      this.draft.name = this._randomName(r);
      this.step = 'look';
    }
    this._layout();
  },

  _randomName(r) {
    const O = ORIGIN_PACKS.origins[r.pick(Object.keys(ORIGIN_PACKS.origins))];
    const block = new Set(ORIGIN_PACKS.realNameBlocklist);
    for (let i = 0; i < 20; i++) {
      const n = r.pick(O.givenNames[this.draft ? this.draft.presentation : 'masculine']) + ' ' + r.pick(O.surnames);
      if (!block.has(n.toLowerCase())) return n;
    }
    return 'Sam Taylor';
  },

  // Starting stats for the chosen role (the same numbers the career will get).
  _previewStats() {
    const d = this.draft;
    const r = makeRng(d.seed);
    return Career.startStats(d.role, d.archetype, r);
  },

  _go(step) { this.step = step; this._layout(); },

  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2, d = this.draft;
    b.clear();
    const back = { look: () => Scenes.go('careerselect'), role: () => this._go('look'), origin: () => this._go('role'), club: null }[this.step];
    if (back) b.add('common.back', s.left + 24, s.top + 24, 220, 96, back, { size: 40, color: '#e9eef5' });
    const sel = (on) => (on ? '#ffd23f' : '#e9eef5');

    if (this.step === 'look') {
      const x = 860;
      b.add('create.editName', x + 620, 196, 190, 80, () => this._editName(), { size: 30, color: '#e9eef5' });
      b.add('create.random', x + 820, 196, 170, 80, () => { this.draft.name = this._randomName(makeRng(RNG.freshSeed())); }, { size: 30, color: '#e9eef5' });
      for (const [i, p] of ['masculine', 'feminine'].entries()) {
        b.add('create.pres.' + p, x + 220 + i * 290, 300, 270, 80, () => this._setPresentation(p), { size: 28, color: sel(d.presentation === p) });
      }
      b.add(() => '◀', x + 220, 400, 100, 90, () => this._cycle('look', -1), { size: 44, color: '#e9eef5' });
      b.add(() => '▶', x + 670, 400, 100, 90, () => this._cycle('look', 1), { size: 44, color: '#e9eef5' });
      if (d.presentation === 'masculine') {
        b.add(() => '◀', x + 220, 505, 100, 90, () => this._cycle('facial', -1), { size: 44, color: '#e9eef5' });
        b.add(() => '▶', x + 670, 505, 100, 90, () => this._cycle('facial', 1), { size: 44, color: '#e9eef5' });
      }
      CAREER_DATA.skinTones.forEach((t, i) => b.add(() => '', x + 220 + i * 100, 615, 88, 88, () => { d.skin = t.id; }, { color: this._swatch('skin', t) }));
      CAREER_DATA.hairColours.forEach((t, i) => b.add(() => '', x + 220 + i * 100, 720, 88, 88, () => { d.hairColour = t.id; }, { color: this._swatch('hair', t) }));
      for (const [i, h] of CAREER_DATA.hands.entries()) {
        b.add('create.batHand.' + h, x + 220 + i * 185, 830, 175, 80, () => { d.batHand = h; }, { size: 24, color: sel(d.batHand === h) });
        b.add('create.bowlHand.' + h, x + 600 + i * 185, 830, 175, 80, () => { d.bowlHand = h; }, { size: 24, color: sel(d.bowlHand === h) });
      }
      b.add('create.next', s.right - 330, s.bottom - 130, 300, 110, () => this._go('role'), { size: 48 });
    } else if (this.step === 'role') {
      Object.keys(CAREER_DATA.roles).forEach((role, i) => {
        b.add('career.role.' + role, 200 + i * 330, 200, 310, 110, () => this._setRole(role), { size: role === 'allrounder' ? 26 : 32, color: sel(d.role === role), icon: CareerScene.roleIcon(role) });
      });
      CAREER_DATA.roles[d.role].archetypes.forEach((a, i) => {
        b.add('create.arch.' + a.id, 200 + i * 330, 380, 310, 100, () => { d.archetype = a.id; if (a.family) d.family = a.family; this._layout(); },
          { size: 21, color: sel(d.archetype === a.id) });
      });
      if (d.role !== 'bowler') {
        Object.keys(CAREER_DATA.battingRoles).forEach((r, i) => {
          b.add('create.batRole.' + r, 200 + i * 245, 580, 230, 90, () => { d.batRole = r; this._layout(); }, { size: 26, color: sel(d.batRole === r) });
        });
      }
      if (CAREER_DATA.roles[d.role].bowls) {
        BOWLING_DATA.familyOrder.forEach((f, i) => {
          b.add(BOWLING_DATA.families[f].nameKey, 200 + i * 245, 770, 230, 100, () => { d.family = f; this._layout(); },
            { size: 18, color: sel(d.family === f), icon: BOWLING_DATA.families[f].icon });
        });
      }
      b.add('create.next', s.right - 330, s.bottom - 130, 300, 110, () => this._go('origin'), { size: 48 });
    } else if (this.step === 'origin') {
      const ids = Object.keys(ORIGIN_PACKS.origins).sort((a, c) => ORIGIN_PACKS.origins[a].displayName.localeCompare(ORIGIN_PACKS.origins[c].displayName));
      this.originCells = ids.map((id, i) => ({ id, x: 170 + (i % 6) * 190, y: 200 + Math.floor(i / 6) * 250, w: 176, h: 230 }));
      b.add('create.next', s.right - 330, s.bottom - 130, 300, 110, () => this._makeCareer(), { size: 48 });
    } else if (this.step === 'club') {
      const offers = this.career.offers;
      this.clubCards = offers.map((o, i) => ({ o, x: cx - 870 + i * 590, y: 200, w: 560, h: 640 }));
      this.clubCards.forEach((c) => b.add('create.signClub', c.x + 60, c.y + c.h - 110, c.w - 120, 100, () => this._sign(c.o), { size: 40, color: '#9cff6a' }));
    }
  },

  _swatch(kind, t) {
    // What a tint looks like on a mid skin / dark hair, for the swatch button.
    const base = kind === 'skin' ? { porcelain: '#f6d7bf', light: '#eec39a', tan: '#d8995c', olive: '#b67a45', brown: '#8a5530', deep: '#5a3219' }
      : { black: '#1c1714', brown: '#5b3a22', auburn: '#8e3a1c', blonde: '#d9b25a', grey: '#9a9a9a', blue: '#2f5bd6' };
    return base[t.id] || t.color;
  },

  _setPresentation(p) {
    const d = this.draft;
    d.presentation = p;
    d.look = CAREER_DATA.looks[p][0];
    if (p === 'feminine') d.facial = 'none';
    d.name = this._randomName(makeRng(RNG.freshSeed()));
    this._layout();
  },
  _cycle(what, dir) {
    const d = this.draft;
    const list = what === 'look' ? CAREER_DATA.looks[d.presentation] : CAREER_DATA.facialHair;
    const cur = what === 'look' ? d.look : d.facial;
    const i = (list.indexOf(cur) + dir + list.length) % list.length;
    if (what === 'look') d.look = list[i]; else d.facial = list[i];
  },
  _setRole(role) {
    const d = this.draft;
    d.role = role;
    const a = CAREER_DATA.roles[role].archetypes[0];
    d.archetype = a.id;
    if (a.family) d.family = a.family;
    if (role !== 'batter' && !d.family) d.family = 'fast';
    this._layout();
  },
  _editName() {
    let v = null;
    try { v = window.prompt(T('create.namePrompt'), this.draft.name); } catch (e) { v = null; }
    if (v && v.trim()) this.draft.name = v.trim().slice(0, 22);
  },

  _makeCareer() {
    const d = this.draft;
    this.career = Career.create(d, d.seed);
    this.career.phase = 'club';
    this.career.offers = Career.clubOffers(this.career);
    CareerSave.save(this.career, this.slot);          // autosave after a career action
    this._go('club');
  },

  _sign(club) {
    Career.signClub(this.career, club);
    CareerSave.save(this.career, this.slot);
    Scenes.go('careersign', { slot: this.slot, career: this.career });
  },

  tap(x, y) {
    if (this.step === 'origin') {
      const c = (this.originCells || []).find((o) => CareerScene.inBox(o, x, y));
      if (c) { this.draft.origin = c.id; Sound.play('uiTap'); }
    }
  },

  update(dt) { this._t += dt; },
  pointerDown(id, x, y) { if (Dev.pointerDown(id, x, y)) return; Sound.unlock(); if (!this.buttons.down(id, x, y)) this.tap(x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) {
    if (code === 'Enter') {
      if (this.step === 'look') this._go('role');
      else if (this.step === 'role') this._go('origin');
      else if (this.step === 'origin') this._makeCareer();
      else if (this.step === 'club') this._sign(this.career.offers[0]);
    }
    if (code === 'Escape') Scenes.go('careerselect');
  },

  render(ctx) {
    CareerUI.bg(ctx, this.step === 'origin' || this.step === 'club' ? 'bg_scout_room' : 'bg_locker_room', 0.6);
    const cx = CONFIG.LOGICAL_W / 2, d = this.draft;
    const n = this.steps.indexOf(this.step) + 1;
    R.text(T('create.step.' + this.step), cx, 80, 60, '#ffffff');
    R.text(T('create.stepN', { n, total: this.steps.length }), cx, 135, 26, '#b8c6d6', 'center', false);
    if (this.step === 'look') this._drawLook(ctx);
    else if (this.step === 'role') this._drawRole(ctx);
    else if (this.step === 'origin') this._drawOrigin(ctx);
    else if (this.step === 'club') this._drawClubs(ctx);
    this.buttons.draw();
  },

  _drawLook(ctx) {
    const d = this.draft, x = 860;
    R.panel(150, 180, 620, 760, 'rgba(10,22,40,0.85)');
    Portrait.draw(ctx, d, 460, 470, 480);
    R.text(d.name, 460, 790, 44, '#ffffff');
    R.text(T('create.handsLine', { bat: T('create.hand.' + d.batHand), bowl: T('create.hand.' + d.bowlHand) }), 460, 850, 26, '#9be7ff', 'center', false);
    const label = (k, y) => R.text(T(k), x, y, 26, '#d8e4f0', 'left', false);
    label('create.name', 236); R.text(d.name, x + 220, 236, 34, '#ffffff', 'left');
    label('create.presentation', 340);
    label('create.look', 445);
    const looks = CAREER_DATA.looks[d.presentation];
    R.text(T('create.lookN', { n: looks.indexOf(d.look) + 1, total: looks.length }), x + 495, 445, 30, '#ffffff');
    if (d.presentation === 'masculine') {
      label('create.facial', 550);
      const fi = CAREER_DATA.facialHair.indexOf(d.facial);
      R.text(fi === 0 ? T('create.none') : T('create.styleN', { n: fi }), x + 495, 550, 30, '#ffffff');
    }
    label('create.skin', 659); label('create.hairColour', 764);
    const mark = (list, id, y) => { const i = list.findIndex((t) => t.id === id); R.circle(x + 264 + i * 100, y, 52, null, '#ffffff', 5); };
    mark(CAREER_DATA.skinTones, d.skin, 659); mark(CAREER_DATA.hairColours, d.hairColour, 764);
    label('create.bats', 870);
    if (d.presentation === 'feminine') R.text(T('create.moreLooksSoon'), x + 495, 505, 22, '#b8c6d6', 'center', false);
  },

  _drawRole(ctx) {
    const d = this.draft, role = CAREER_DATA.roles[d.role];
    R.text(T('create.chooseRole'), 200, 170, 26, '#d8e4f0', 'left', false);
    R.text(T('create.archetype'), 200, 355, 26, '#d8e4f0', 'left', false);
    R.text(T('create.archDesc.' + d.archetype), 200, 510, 24, '#9be7ff', 'left', false);
    if (d.role !== 'bowler') R.text(T('create.batRole'), 200, 555, 26, '#d8e4f0', 'left', false);
    if (role.bowls) R.text(T('create.family'), 200, 745, 26, '#d8e4f0', 'left', false);
    // stats preview (right)
    const st = this._previewStats();
    R.panel(1240, 180, 540, 760, 'rgba(10,22,40,0.88)');
    R.text(T('create.startStats'), 1510, 222, 30, '#ffd23f');
    const keys = PLAYER_DATA.stats.batting.concat(PLAYER_DATA.stats.bowling, PLAYER_DATA.stats.shared);
    CareerUI.statRows(ctx, st, 1270, 275, keys, { gap: 49, labelW: 170, barW: 230, size: 22 });
    R.text(T('create.nothingLocked'), 1510, 915, 18, '#b8c6d6', 'center', false);
  },

  _drawOrigin(ctx) {
    const d = this.draft;
    for (const c of this.originCells) {
      const sel = c.id === d.origin;
      R.roundRect(c.x, c.y, c.w, c.h, 18, sel ? 'rgba(60,50,10,0.95)' : 'rgba(10,22,40,0.88)', sel ? '#ffd23f' : 'rgba(255,255,255,0.3)', sel ? 6 : 2);
      if (!Sprites.ui('badge_' + c.id, c.x + c.w / 2, c.y + 95, 150, 150)) R.circle(c.x + c.w / 2, c.y + 95, 60, '#1d4ed8');
      R.text(ORIGIN_PACKS.origins[c.id].displayName, c.x + c.w / 2, c.y + 200, 22, '#ffffff', 'center', false);
    }
    const O = ORIGIN_PACKS.origins[d.origin];
    R.panel(1330, 190, 470, 740, 'rgba(10,22,40,0.9)', '#ffd23f');
    Sprites.ui('badge_' + d.origin, 1565, 290, 160, 160);
    R.text(O.displayName, 1565, 400, 44, '#ffffff');
    R.text(T('create.pathway'), 1565, 450, 22, '#ffd23f', 'center', false);
    O.pathwayLabels.forEach((l, i) => R.text((i + 1) + '. ' + l, 1360, 490 + i * 34, 21, i === 0 ? '#9cff6a' : '#d8e4f0', 'left', false));
    const top = (w) => Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
    R.text(T('create.homeConditions', { pitch: T(STADIUM_DATA.pitchTypes[top(O.pitchWeights)].nameKey), weather: T(STADIUM_DATA.weather[top(O.weatherWeights)].nameKey) }),
      1565, 790, 18, '#9be7ff', 'center', false);
    R.text(T('create.originNoStats'), 1565, 850, 19, '#b8c6d6', 'center', false);
  },

  _drawClubs(ctx) {
    R.text(T('create.clubsSub', { stage: CareerUI.pathwayLabel(this.career, 1) }), CONFIG.LOGICAL_W / 2, 175, 28, '#d8e4f0', 'center', false);
    for (const c of this.clubCards) {
      const o = c.o;
      R.panel(c.x, c.y + 20, c.w, c.h, 'rgba(10,22,40,0.92)', o.colours[1]);
      Crest.draw(ctx, o.crest, c.x + c.w / 2, c.y + 170, 220);
      R.text(o.name, c.x + c.w / 2, c.y + 320, 38, '#ffffff');
      R.rect(c.x + c.w / 2 - 80, c.y + 350, 70, 26, o.colours[0]); R.rect(c.x + c.w / 2 + 10, c.y + 350, 70, 26, o.colours[1]);
      const lines = [
        T('create.venue', { v: T('venue.' + o.venue) }),
        o.spell ? T('create.lineupBowl', { spell: T('spell.' + o.spell), pos: o.batPos }) : T('create.lineupBat', { pos: o.batPos }),
        T('create.emphasis', { e: T('emphasis.' + o.emphasis) }),
      ];
      lines.forEach((l, i) => R.text(l, c.x + c.w / 2, c.y + 405 + i * 44, 24, i === 2 ? '#9cff6a' : '#d8e4f0', 'center', false));
    }
  },
};

// =====================================================================================
const CareerSignScene = {
  buttons: new ButtonList(),
  _t: 0,
  enter(params) {
    this.slot = params.slot; this.career = params.career; this._t = 0;
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    this.buttons.add('career.toHome', cx - 260, 900, 520, 120, () => Scenes.go('careerhome', { slot: this.slot, career: this.career }), { size: 46 });
    Sound.play('fanfare');
  },
  update(dt) {
    this._t += dt;
    if (this._t % 0.5 < dt) Effects.sparks(300 + ((this._t * 977) % 1320), 160, 12, ['#ffd23f', '#9cff6a', '#5fd4ff'][Math.floor(this._t * 2) % 3], 700);
    Effects.update(dt);
  },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Enter' || code === 'Space') Scenes.go('careerhome', { slot: this.slot, career: this.career }); },
  render(ctx) {
    CareerUI.bg(ctx, 'bg_scout_room', 0.5);
    const cx = CONFIG.LOGICAL_W / 2, c = this.career;
    if (!Sprites.ui('milestone_local_club_signing', cx, 420, 900, 560)) R.panel(cx - 450, 140, 900, 560);
    const pop = Math.min(1, this._t / 0.3);
    ctx.save(); ctx.translate(cx, 110); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
    R.text(T('career.signed', { club: c.club.name }), 0, 0, 72, '#ffd23f');
    ctx.restore();
    Crest.draw(ctx, c.club.crest, cx - 520, 790, 170);
    Portrait.draw(ctx, c.player, cx + 520, 790, 170);
    R.text(T('career.signedSub', { stage: CareerUI.pathwayLabel(c, 1) }), cx, 790, 34, '#ffffff', 'center', false);
    this.buttons.draw();
    Effects.drawParticles(ctx);
  },
};
