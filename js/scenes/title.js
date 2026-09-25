// Cricket Arcade — Title / Home: pick Six Smash, Quick Match or Wicket Rush.
// Offers to resume an unfinished match (M04). The stadium drifts behind.

const TitleScene = {
  _t: 0,
  cards: [],
  topBtns: new ButtonList(),      // top-right SETTINGS button
  resumeBtns: new ButtonList(),
  resume: null,                   // unfinished match checkpoint, if any

  enter() {
    this._t = 0;
    this.resume = BootScene.pendingResume;
    Effects.init();
    this._layout();
  },

  _layout() {
    const cx = CONFIG.LOGICAL_W / 2;
    const w = 436, h = 610, gap = 22, y = 320;
    const x0 = cx - (w * 4 + gap * 3) / 2;
    const card = (i, o) => Object.assign({ x: x0 + i * (w + gap), y, w, h, id: null, pressed: false }, o);
    this.cards = [
      card(0, { mode: 'careerselect', title: 'title.modeCareer', sub: 'title.careerSub', career: true,
        icon: 'stage_local', heroes: ['hero_allrounder'], color: '#9b5cff',
        strip: ['grade_s', 'career_form_hot', 'train_timing_cage', 'badge_india'] }),
      card(1, { mode: 'sixsmash', saveId: SIX_SMASH_DATA.classic.id, title: 'title.mode', sub: 'title.sixSub',
        icon: 'icon_six_smash', heroes: ['batter'], color: '#ff5a1f',
        strip: ['kit_bat', 'kit_helmet', 'kit_gloves', 'kit_pads'] }),
      card(2, { mode: 'toss', saveId: MATCH_DATA.defaultFormat, title: 'title.modeMatch', sub: 'title.matchSub',
        icon: 'icon_quick_match', heroes: ['batter', 'bowler'], color: '#ffb400', match: true,
        strip: ['icon_run', 'marker_six', 'marker_four', 'marker_wicket'] }),
      card(3, { mode: 'wicketrush', saveId: WICKET_RUSH_DATA.classic.id, title: 'title.modeWicket', sub: 'title.wicketSub',
        icon: 'icon_wicket_rush', heroes: ['bowler'], color: '#1f8a4c',
        strip: BOWLING_DATA.deliveries.map(d => d.icon) }),
    ];
    const s = Display.safe;
    this.topBtns.clear();
    this.topBtns.add('settings.title', s.right - 400, s.top + 24, 370, 96, () => Scenes.go('settings'),
      { size: 34, color: '#e9eef5' });
    this.topBtns.add('title.collection', s.left + 24, s.top + 24, 330, 96, () => Scenes.go('collection', { back: 'title' }),
      { size: 28, color: '#9be7ff', icon: 'icon_collection' });
    this.topBtns.add('title.records', s.left + 24, s.top + 132, 330, 90, () => Scenes.go('records', { back: 'title' }), { size: 28, color: '#e9eef5', icon: 'meta_records' });
    this.topBtns.add('title.hof', s.left + 24, s.top + 232, 330, 80, () => Scenes.go('halloffame', { back: 'title' }), { size: 24, color: '#ffd23f' });
    this.resumeBtns.clear();
    this.resumeBtns.add('resume.resume', cx - 430, 640, 420, 120, () => this._resume(), { size: 38 });
    this.resumeBtns.add('resume.abandon', cx + 10, 640, 420, 120, () => this._abandon(), { size: 40, color: '#e9eef5' });
  },

  _resume() {
    const cp = this.resume.checkpoint;
    this.resume = BootScene.pendingResume = null;
    if (cp.career) {
      // A career match: reload the career, then pick up the match.
      CareerMatch.resumeFrom(cp).then(([scene, params]) => Scenes.go(scene, params)).catch((e) => {
        Log.add('error', 'career resume failed: ' + e.message);
        Save.clearResume();
      });
      return;
    }
    try {
      CareerMatch.on = false;
      const [scene, params] = Match.restore(cp);
      Scenes.go(scene, params);
    } catch (e) {
      Log.add('error', 'resume failed: ' + e.message);
      Save.clearResume();
    }
  },

  _abandon() {
    this.resume = BootScene.pendingResume = null;
    Save.clearResume();
  },

  update(dt) {
    this._t += dt;
    Stadium.update(dt);
    Effects.update(dt);
  },

  _cardAt(x, y) {
    return this.cards.find(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) || null;
  },

  pointerDown(id, x, y) {
    if (Dev.pointerDown(id, x, y)) return;
    Sound.unlock();
    Fullscreen.request();
    if (this.resume) { this.resumeBtns.down(id, x, y); return; }
    if (this.topBtns.down(id, x, y)) return;
    const c = this._cardAt(x, y);
    if (c && c.id === null) { c.id = id; c.pressed = true; }
  },
  pointerMove(id, x, y) {
    if (Dev.pointerMove(id, x, y)) return;
    if (this.resume) { this.resumeBtns.move(id, x, y); return; }
    this.topBtns.move(id, x, y);
    for (const c of this.cards) if (c.id === id) c.pressed = this._cardAt(x, y) === c;
  },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this.resume) { this.resumeBtns.up(id); return; }
    if (this.topBtns.up(id)) return;
    for (const c of this.cards) {
      if (c.id !== id) continue;
      const go = c.pressed;
      c.id = null; c.pressed = false;
      if (go) { Sound.play('uiTap'); Scenes.go(c.mode); }
    }
  },
  keyDown(code) {
    if (this.resume) {
      if (code === 'Enter' || code === 'KeyR') this._resume();
      if (code === 'Escape') this._abandon();
      return;
    }
    if (code === 'Digit1' || code === 'Enter') { Sound.unlock(); Scenes.go('careerselect'); }
    if (code === 'Digit2') { Sound.unlock(); Scenes.go('sixsmash'); }
    if (code === 'Digit3') { Sound.unlock(); Scenes.go('toss'); }
    if (code === 'Digit4') { Sound.unlock(); Scenes.go('wicketrush'); }
    if (code === 'KeyO') Scenes.go('settings');
    if (code === 'KeyC') Scenes.go('collection', { back: 'title' });
  },

  render(ctx) {
    // Slowly drifting stadium shot behind the menu.
    const a = this._t * 0.06;
    View3D.set({ x: Math.sin(a) * 30, y: 16, z: 10 + Math.cos(a) * 50 }, { x: 0, y: 0, z: 10 }, 1300);
    Stadium.drawBackground(ctx);
    Stadium.drawField(ctx);
    for (const z of [0, BATTING_DATA.pitch.length]) {
      const p = View3D.project(0, 0, z);
      if (p) Sprites.draw('stumps', p.x, p.y, p.s, {});
    }
    const v = Display.viewRect();
    ctx.fillStyle = 'rgba(5,15,10,0.5)';
    ctx.fillRect(v.x, v.y, v.w, v.h);

    const cx = CONFIG.LOGICAL_W / 2;
    const bob = Math.sin(this._t * 2) * 5;
    R.text(T('title.game'), cx, 150 + bob, 120, '#ffffff');
    R.text(T('title.pick'), cx, 265, 40, '#ffd23f');

    for (const c of this.cards) this._drawCard(ctx, c);

    this.topBtns.draw();
    Sprites.ui('icon_settings', Display.safe.right - 356, Display.safe.top + 72, 60, 60);
    R.text(T('title.pcHint2'), cx, 1010, 24, '#b8c6d6', 'center', false);
    if (this.resume) this._drawResume(ctx);
  },

  // "You have a match in progress" box.
  _drawResume(ctx) {
    const v = Display.viewRect();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const cx = CONFIG.LOGICAL_W / 2;
    R.panel(cx - 560, 250, 1120, 560, 'rgba(12,28,48,0.97)', '#ffb400');
    Sprites.ui('icon_quick_match', cx, 340, 220, 150);
    R.text(T('resume.title'), cx, 450, 60, '#ffffff');
    const s = this.resume.checkpoint.summary;
    const team = this.resume.checkpoint.career ? this.resume.checkpoint.teams[s.battingSide].name || T(MATCH_DATA.teams[s.battingSide].nameKey) : T(MATCH_DATA.teams[s.battingSide].nameKey);
    let line = T('resume.score', { team, runs: s.runs, wkts: s.wickets, overs: s.overs });
    if (s.target) line += '  ·  ' + T('match.targetN', { n: s.target });
    if (s.isSuper) line = T('match.superOver') + '  ·  ' + line;
    R.text(line, cx, 530, 38, '#ffd23f', 'center', false);
    R.text(T(this.resume.checkpoint.phase === 'break' ? 'resume.fromBreak' : 'resume.fromOver'),
      cx, 585, 28, '#d8e4f0', 'center', false);
    this.resumeBtns.draw();
  },

  _drawCard(ctx, c) {
    const off = c.pressed ? 6 : 0;
    const x = c.x, y = c.y + off, w = c.w, h = c.h;
    R.roundRect(x + 8, c.y + 12, w, h, 34, 'rgba(0,0,0,0.45)');
    R.roundRect(x, y, w, h, 34, 'rgba(10,22,40,0.92)', c.color, 8);
    ctx.save();
    R.roundRectPath(x + 8, y + 8, w - 16, h - 16, 28);
    ctx.clip();
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, c.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    // hero art on the left (two smaller figures on the match card)
    c.heroes.forEach((hero, i) => {
      const two = c.heroes.length > 1;
      const hx = two ? x + 80 + i * 110 : x + 120, hy = two ? y + 255 + i * 12 : y + 250;
      if (!Sprites.ui(hero, hx, hy, two ? 170 : 230, two ? 300 : 380)) Sprites.draw(hero, hx, y + 420, 150, {});
    });
    ctx.restore();
    Sprites.ui(c.icon, x + w - 115, y + 125, 190, 160);
    // 2x2 strip: starting kit / delivery balls / match markers
    c.strip.forEach((k, i) => {
      const kx = x + w - 160 + (i % 2) * 86, ky = y + 280 + Math.floor(i / 2) * 82;
      R.roundRect(kx - 37, ky - 37, 74, 74, 14, 'rgba(255,255,255,0.12)');
      Sprites.ui(k, kx, ky, 64, 58);
    });
    R.text(T(c.title), x + w / 2, y + 470, 46, '#ffffff');
    R.text(T(c.sub), x + w / 2, y + 520, 22, '#d8e4f0', 'center', false);
    const best = c.saveId && Save.data && Save.best(c.saveId);
    let line;
    if (c.career) {
      const n = Save.data ? Save.data.careerSlots.filter(Boolean).length : 0;
      line = n ? T('title.careersActive', { n }) : T('title.noCareer');
    } else if (c.match) line = best ? T('title.matchRecord', { won: best.won || 0, played: best.played || 0 }) : T('title.noMatches');
    else line = best ? T('title.best', { score: formatNumber(best.score) }) : T('title.noBest');
    R.text(line, x + w / 2, y + 566, 30, '#ffd23f');
  },
};
