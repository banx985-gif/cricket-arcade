// Cricket Arcade — the Trophy Room (plan 21.4): major feats as trophies on shelves
// (won ones lit, the rest as dark silhouettes with a hint), and the Credits screen
// (Settings > Credits; the same wording and logo as the My XI ending).

const TrophyRoomScene = {
  buttons: new ButtonList(),
  _t: 0,
  enter() {
    LegacyAssets.ensure(); MyXIAssets.ensure();
    this._t = 0;
    const s = Display.safe;
    this.buttons.clear();
    this.buttons.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go('title'), { size: 32, color: '#e9eef5' });
  },
  update(dt) { this._t += dt; },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Escape') Scenes.go('title'); },
  render(ctx) {
    CareerUI.bg(ctx, 'bg_hall_of_fame', 0.55);
    const cx = CONFIG.LOGICAL_W / 2, list = Trophies.list(Save.data), got = list.filter((t) => t.got).length;
    Sprites.ui('meta_trophy_room', cx - 330, 70, 90, 90);
    R.text(T('trophy.title'), cx + 20, 70, 58, '#ffffff');
    R.text(T('trophy.count', { n: got, t: list.length }), Display.safe.right - 40, Display.safe.top + 60, 28, '#ffd23f', 'right');
    const cols = 7, w = 240, h = 400;
    list.forEach((it, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = cx - (cols * w) / 2 + col * w + w / 2, y = 180 + row * (h + 20);
      R.roundRect(x - w / 2 + 8, y, w - 16, h - 8, 22, it.got ? 'rgba(40,30,8,0.82)' : 'rgba(6,10,18,0.82)', it.got ? '#ffd23f' : 'rgba(255,255,255,0.18)', 3);
      R.roundRect(x - w / 2 + 18, y + h - 70, w - 36, 22, 8, 'rgba(120,80,40,0.95)');          // the shelf
      const d = it.def;
      if (it.got) Sprites.ui(d.art, x, y + 150, 190, 190);
      else {
        ctx.save(); ctx.globalAlpha = 0.35; ctx.filter = 'brightness(0)';
        Sprites.ui(d.art, x, y + 150, 190, 190);
        ctx.restore();
      }
      R.text(T('trophy.' + d.id), x, y + h - 20, 20, it.got ? '#ffd23f' : '#8a96a3', 'center');
      if (!it.got) {
        // the hint, on up to two lines
        const words = T('trophy.' + d.id + '.how').split(' '), lines = [''];
        for (const wd of words) { if ((lines[lines.length - 1] + ' ' + wd).length > 22 && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + wd).trim(); }
        lines.slice(0, 2).forEach((ln, k) => R.text(ln, x, y + 270 + k * 24, 17, '#d8e4f0', 'center', false));
      }
    });
    this.buttons.draw();
  },
};

const CreditsScene = {
  buttons: new ButtonList(),
  _t: 0, back: 'settings',
  enter(params) {
    this._t = 0;
    this.back = (params && params.back) || 'settings';
    const cx = CONFIG.LOGICAL_W / 2;
    this.buttons.clear();
    this.buttons.add('settings.back', cx - 200, 900, 400, 110, () => Scenes.go(this.back), { size: 40, color: '#e9eef5' });
  },
  update(dt) { this._t += dt; },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) { if (code === 'Escape' || code === 'Enter') Scenes.go(this.back); },
  render(ctx) {
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2;
    ctx.fillStyle = '#05080f'; ctx.fillRect(v.x, v.y, v.w, v.h);
    // the studio logo on top (the art is about 180 x 220: never above ~2x)
    const a = Math.min(1, this._t / 0.6);
    ctx.save(); ctx.globalAlpha = a;
    if (!Sprites.ui('logo_banx_gamex', cx, 250, 250, 300)) R.text(T('credits.studio'), cx, 250, 60, '#ffd23f');
    ctx.restore();
    T('myxi.credits').split('|').forEach((ln, i) => R.text(ln, cx, 520 + i * 80, 38, i === 0 ? '#ffffff' : '#9be7ff', 'center', false));
    R.text(T('credits.thanks'), cx, 760, 28, '#ffd23f', 'center', false);
    this.buttons.draw();
  },
};
