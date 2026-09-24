// Cricket Arcade — Title / mode select. Two challenge modes:
// Six Smash (batting) and Wicket Rush (bowling). The stadium drifts behind.

const TitleScene = {
  _t: 0,
  cards: [],
  soundBtn: new ButtonList(),

  enter() {
    this._t = 0;
    Effects.init();
    this._layout();
  },

  _layout() {
    const cx = CONFIG.LOGICAL_W / 2;
    const w = 570, h = 610, gap = 34, y = 320;
    const x0 = cx - (w * 3 + gap * 2) / 2;
    const card = (i, o) => Object.assign({ x: x0 + i * (w + gap), y, w, h, id: null, pressed: false }, o);
    this.cards = [
      card(0, { mode: 'sixsmash', saveId: SIX_SMASH_DATA.classic.id, title: 'title.mode', sub: 'title.sixSub',
        icon: 'icon_six_smash', heroes: ['batter'], color: '#ff5a1f',
        strip: ['kit_bat', 'kit_helmet', 'kit_gloves', 'kit_pads'] }),
      card(1, { mode: 'toss', saveId: MATCH_DATA.defaultFormat, title: 'title.modeMatch', sub: 'title.matchSub',
        icon: 'icon_quick_match', heroes: ['batter', 'bowler'], color: '#ffb400', match: true,
        strip: ['icon_run', 'marker_six', 'marker_four', 'marker_wicket'] }),
      card(2, { mode: 'wicketrush', saveId: WICKET_RUSH_DATA.classic.id, title: 'title.modeWicket', sub: 'title.wicketSub',
        icon: 'icon_wicket_rush', heroes: ['bowler'], color: '#1f8a4c',
        strip: BOWLING_DATA.deliveries.map(d => d.icon) }),
    ];
    const s = Display.safe;
    this.soundBtn.clear();
    this.soundBtn.add(() => T(Sound.muted ? 'common.soundOff' : 'common.soundOn'), s.right - 360, s.top + 24, 330, 96, () => {
      Sound.setMuted(!Sound.muted);
      Save.setMuted(Sound.muted);
    }, { size: 34, color: '#e9eef5' });
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
    if (this.soundBtn.down(id, x, y)) return;
    const c = this._cardAt(x, y);
    if (c && c.id === null) { c.id = id; c.pressed = true; }
  },
  pointerMove(id, x, y) {
    if (Dev.pointerMove(id, x, y)) return;
    this.soundBtn.move(id, x, y);
    for (const c of this.cards) if (c.id === id) c.pressed = this._cardAt(x, y) === c;
  },
  pointerUp(id) {
    if (Dev.pointerUp(id)) return;
    if (this.soundBtn.up(id)) return;
    for (const c of this.cards) {
      if (c.id !== id) continue;
      const go = c.pressed;
      c.id = null; c.pressed = false;
      if (go) { Sound.play('uiTap'); Scenes.go(c.mode); }
    }
  },
  keyDown(code) {
    if (code === 'Digit1' || code === 'Enter') { Sound.unlock(); Scenes.go('sixsmash'); }
    if (code === 'Digit2') { Sound.unlock(); Scenes.go('toss'); }
    if (code === 'Digit3') { Sound.unlock(); Scenes.go('wicketrush'); }
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

    this.soundBtn.draw();
    R.text(T('title.pcHint2'), cx, 1010, 24, '#b8c6d6', 'center', false);
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
      const hx = two ? x + 95 + i * 135 : x + 150, hy = two ? y + 255 + i * 12 : y + 250;
      if (!Sprites.ui(hero, hx, hy, two ? 200 : 270, two ? 330 : 400)) Sprites.draw(hero, hx, y + 420, 170, {});
    });
    ctx.restore();
    Sprites.ui(c.icon, x + w - 145, y + 135, 230, 190);
    // 2x2 strip: starting kit / delivery balls / match markers
    c.strip.forEach((k, i) => {
      const kx = x + w - 195 + (i % 2) * 100, ky = y + 290 + Math.floor(i / 2) * 92;
      R.roundRect(kx - 42, ky - 42, 84, 84, 16, 'rgba(255,255,255,0.12)');
      Sprites.ui(k, kx, ky, 72, 66);
    });
    R.text(T(c.title), x + w / 2, y + 470, 56, '#ffffff');
    R.text(T(c.sub), x + w / 2, y + 520, 25, '#d8e4f0', 'center', false);
    const best = Save.data && Save.best(c.saveId);
    let line;
    if (c.match) line = best ? T('title.matchRecord', { won: best.won || 0, played: best.played || 0 }) : T('title.noMatches');
    else line = best ? T('title.best', { score: formatNumber(best.score) }) : T('title.noBest');
    R.text(line, x + w / 2, y + 566, 30, '#ffd23f');
  },
};
