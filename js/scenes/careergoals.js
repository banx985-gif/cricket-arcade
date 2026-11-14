// Cricket Legends (M17 Job 3) - season goals screens.
//   CareerGoalsScene  at the start of a stage: pick 3 of the 6 goals (targets from your stats)
//   GoalsUI           the Career Home panel (progress bars) and the result screen's goal chips

const CareerGoalsScene = {
  buttons: new ButtonList(),
  career: null, slot: 1, sel: [], _t: 0,

  enter(params) {
    this.slot = params.slot || this.slot; this.career = params.career || this.career;
    this.sel = []; this._t = 0;
    SeasonGoals.ensure(this.career);
    this._layout();
  },
  _layout() {
    const b = this.buttons, c = this.career, g = c.goals, cx = CONFIG.LOGICAL_W / 2, s = Display.safe;
    b.clear();
    g.offer.forEach((o, i) => {
      const x = cx - 885 + (i % 3) * 595, y = 230 + Math.floor(i / 3) * 315;
      const bt = b.add(() => '', x, y, 575, 295, () => this._toggle(o.id), { color: 'rgba(0,0,0,0)', disabled: () => !o.ok });
      bt.invisible = true; bt.goal = o;
    });
    b.add('goals.confirm', cx - 300, s.bottom - 150, 600, 124, () => this._confirm(), { size: 48, color: '#9cff6a',
      disabled: () => this.sel.length !== CAREER_DATA.seasonGoals.pick });
  },
  _toggle(id) {
    const i = this.sel.indexOf(id);
    if (i >= 0) this.sel.splice(i, 1);
    else if (this.sel.length < CAREER_DATA.seasonGoals.pick) this.sel.push(id);
    else { this.sel.shift(); this.sel.push(id); }          // a 4th tap swaps out the oldest pick
  },
  _confirm() {
    const c = this.career;
    if (!SeasonGoals.choose(c, this.sel)) return;
    CareerSave.save(c, this.slot);
    Sound.play('fanfare');
    Scenes.go('careerhome', { slot: this.slot, career: c, stay: true });
  },
  update(dt) { this._t += dt; },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Enter') this._confirm(); },

  render(ctx) {
    const c = this.career, cx = CONFIG.LOGICAL_W / 2;
    CareerUI.bg(ctx, 'bg_scout_room', 0.6);
    if (!c || !c.goals) return;
    R.text(T('goals.title', { stage: CareerUI.pathwayLabel(c) }), cx, 80, 54, '#ffd23f');
    R.text(T('goals.sub', { n: SeasonGoals.coins(c), b: SeasonGoals.bonusCoins(c), k: CAREER_DATA.seasonGoals.pick }), cx, 145, 26, '#ffffff', 'center', false, 1700);
    R.text(T('goals.picked', { n: this.sel.length, k: CAREER_DATA.seasonGoals.pick }), cx, 192, 24, '#9be7ff', 'center', false);
    for (const bt of this.buttons.items) {
      if (!bt.goal) continue;
      const o = bt.goal, on = this.sel.includes(o.id);
      R.panel(bt.x, bt.y, bt.w, bt.h, !o.ok ? 'rgba(30,30,36,0.85)' : on ? 'rgba(30,70,24,0.96)' : 'rgba(10,22,40,0.92)', on ? '#9cff6a' : o.ok ? '#ffd23f' : 'rgba(255,255,255,0.2)');
      if (bt.pressed) R.roundRect(bt.x, bt.y, bt.w, bt.h, 22, 'rgba(255,255,255,0.08)', null);
      R.text(SeasonGoals.label(o.id), bt.x + bt.w / 2, bt.y + 62, 40, o.ok ? '#ffffff' : '#8a8f99');
      R.text(SeasonGoals.targetText(o.id, o.target), bt.x + bt.w / 2, bt.y + 138, 30, o.ok ? '#ffe28a' : '#8a8f99', 'center', false, bt.w - 40);
      R.text(T(o.ok ? 'goals.' + o.id + '.how' : CAREER_DATA.seasonGoals.needsBowling.includes(o.id) ? 'goals.needsBowling' : 'goals.needsBatting'), bt.x + bt.w / 2, bt.y + 196, 20, o.ok ? '#d8e4f0' : '#8a8f99', 'center', false, bt.w - 40);
      if (o.ok) R.text(T('goals.pays', { n: SeasonGoals.coins(c) }), bt.x + bt.w / 2, bt.y + 250, 24, '#ffd23f', 'center', false);
      if (on) { R.circle(bt.x + bt.w - 40, bt.y + 40, 24, '#9cff6a'); R.text(String(this.sel.indexOf(o.id) + 1), bt.x + bt.w - 40, bt.y + 41, 26, CONFIG.COLOR.ink); }
    }
    const keep = this.buttons.items;
    this.buttons.items = keep.filter((b) => !b.invisible);
    this.buttons.draw();
    this.buttons.items = keep;
  },
};

const GoalsUI = {
  // Career Home panel: each picked goal with a progress bar.
  panel(ctx, c) {
    const cx = CONFIG.LOGICAL_W / 2, g = c.goals;
    R.text(T('goals.panelTitle', { stage: CareerUI.pathwayLabel(c) }), cx, 100, 54, '#ffd23f');
    R.text(T('goals.panelSub', { n: SeasonGoals.coins(c), b: SeasonGoals.bonusCoins(c) }), cx, 160, 24, '#d8e4f0', 'center', false, 1600);
    SeasonGoals.all(c).forEach((p, i) => {
      const y = 230 + i * 190, x = cx - 700;
      R.panel(x, y, 1400, 165, p.done ? 'rgba(30,70,24,0.95)' : 'rgba(10,22,40,0.92)', p.done ? '#9cff6a' : '#ffd23f');
      R.text(SeasonGoals.label(p.id), x + 40, y + 45, 34, '#ffffff', 'left');
      R.text(SeasonGoals.targetText(p.id, p.target), x + 1360, y + 45, 26, '#ffe28a', 'right', false);
      CareerUI.meter(x + 40, y + 85, 1000, 34, p.frac, 1, p.done || p.onTrack ? '#3ddc5a' : '#2f9bff');
      R.text(SeasonGoals.valueText(p), x + 1360, y + 102, 28, '#ffffff', 'right', false);
      R.text(p.done ? T('goals.paid', { n: g.paid[p.id] }) : T(SeasonGoals.isRate(p.id) ? 'goals.rateNote' : 'goals.countNote'), x + 40, y + 142, 20, p.done ? '#9cff6a' : '#b8c6d6', 'left', false);
    });
    if (g.bonus) R.text(T('goals.bonusPaid', { n: g.bonus }), cx, 820, 30, '#ffd23f');
  },

  // Result screen: three small chips (name + progress, green when done).
  chips(ctx, c, x, y, w) {
    const list = c && c.goals && c.goals.picked ? SeasonGoals.all(c) : [];
    if (!list.length) return;
    const cw = (w - 20) / list.length;
    list.forEach((p, i) => {
      const xx = x + i * (cw + 10);
      R.roundRect(xx, y, cw, 50, 16, p.done ? 'rgba(40,110,30,0.95)' : 'rgba(255,255,255,0.08)', p.done ? '#9cff6a' : 'rgba(255,255,255,0.3)', 2);
      R.text(T('goals.short.' + p.id) + '  ' + SeasonGoals.valueText(p), xx + cw / 2, y + 25, 19, p.done ? '#ffffff' : '#d8e4f0', 'center', false, cw - 16);
    });
  },
};
