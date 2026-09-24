// Cricket Arcade — challenge result screen (shared by Six Smash + Wicket Rush).
// params: { mode, titleKey, score, stats: [[stringKey, value]…], isBest, prevBest, seed }

const ResultScene = {
  buttons: new ButtonList(),
  data: null,
  _t: 0,

  enter(params) {
    this.data = params;
    this._t = 0;
    Effects.init();
    const cx = CONFIG.LOGICAL_W / 2;
    const b = this.buttons;
    b.clear();
    b.add('result.retry', cx - 440, 850, 400, 130, () => Scenes.go(params.mode), { size: 60 });
    b.add('result.title_btn', cx + 40, 850, 400, 130, () => Scenes.go('title'), { size: 54, color: '#e9eef5' });
    if (params.isBest) { Sound.play('fanfare'); Sound.play('crowdRoar'); }
  },

  update(dt) {
    this._t += dt;
    Effects.update(dt);
    if (this.data.isBest && this._t % 0.5 < dt) {
      const x = 360 + ((this._t * 977) % 1200);
      Effects.sparks(x, 200, 14, ['#ffd23f', '#ff5a5a', '#5fd4ff', '#9cff6a'][Math.floor(this._t * 2) % 4], 700);
    }
  },

  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) {
    if (code === 'Enter' || code === 'Space') Scenes.go(this.data.mode);
    if (code === 'Escape') Scenes.go('title');
  },

  render(ctx) {
    const v = Display.viewRect();
    const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h);
    g.addColorStop(0, '#12472b');
    g.addColorStop(1, '#07170e');
    ctx.fillStyle = g;
    ctx.fillRect(v.x, v.y, v.w, v.h);

    const d = this.data;
    const cx = CONFIG.LOGICAL_W / 2;
    const icon = d.mode === 'wicketrush' ? 'icon_wicket_rush' : 'icon_six_smash';
    Sprites.ui(icon, cx - 560, 300, 260, 240, { alpha: 0.9 });
    Sprites.ui(d.mode === 'wicketrush' ? 'bowler' : 'batter', cx + 600, 330, 300, 380, { alpha: 0.95 });
    R.text(T(d.titleKey), cx, 110, 64, '#ffffff');

    // Score, counting up
    const k = Math.min(1, this._t / 1.0);
    const shown = Math.round(d.score * (1 - Math.pow(1 - k, 3)));
    R.text(T('result.score'), cx, 220, 40, '#b8c6d6', 'center', false);
    R.text(formatNumber(shown), cx, 320, 150, '#ffd23f');
    if (d.isBest && this._t > 1) {
      const s = 1 + Math.sin(this._t * 6) * 0.04;
      ctx.save(); ctx.translate(cx, 440); ctx.scale(s, s);
      R.text(T('result.newBest'), 0, 0, 58, '#9cff6a');
      ctx.restore();
    }

    const stats = d.stats;
    const w = 360, gap = 24, x0 = cx - (stats.length * w + (stats.length - 1) * gap) / 2;
    stats.forEach(([key, val], i) => {
      const x = x0 + i * (w + gap);
      R.panel(x, 520, w, 170);
      R.text(T(key), x + w / 2, 565, 28, '#b8c6d6', 'center', false);
      R.text(String(val), x + w / 2, 640, 72, '#ffffff');
    });

    const best = Math.max(d.score, d.prevBest || 0);
    R.text(T('result.pbLine', { score: formatNumber(best) }), cx, 770, 44, '#ffffff');

    this.buttons.draw();
    Effects.drawParticles(ctx);
    R.text(T('result.seed', { seed: d.seed }), Display.safe.right - 30, Display.safe.bottom - 30, 22, 'rgba(255,255,255,0.35)', 'right', false);
  },
};
