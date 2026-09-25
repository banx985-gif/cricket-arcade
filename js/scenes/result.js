// Cricket Arcade — challenge result screen (shared by Six Smash + Wicket Rush).
// params (from Challenge.finish + the scene): { mode, game, rs, titleKey, score, raw, diff,
//   player, stats: [[stringKey, value]…], isBest, prevBest, medal, newMedal,
//   rewards [{ medal, reward }], milestones [], seed, again { rs, diff, pick } }

const ResultScene = {
  buttons: new ButtonList(),
  data: null,
  _t: 0,

  enter(params) {
    this.data = params;
    this._t = 0;
    Effects.init();
    Sprites.loadGroup('challenges');             // the medal art
    const cx = CONFIG.LOGICAL_W / 2;
    const b = this.buttons;
    b.clear();
    b.add('result.retry', cx - 640, 900, 400, 120, () => Scenes.go(params.mode, params.again), { size: 54 });
    b.add('chal.toHub', cx - 200, 900, 400, 120, () => Scenes.go('challenges', { game: params.game }), { size: 40, color: '#9be7ff' });
    b.add('result.title_btn', cx + 240, 900, 400, 120, () => Scenes.go('title'), { size: 50, color: '#e9eef5' });
    if (params.isBest || params.newMedal) { Sound.play('fanfare'); Sound.play('crowdRoar'); }
  },

  update(dt) {
    this._t += dt;
    Effects.update(dt);
    if ((this.data.isBest || this.data.newMedal) && this._t % 0.5 < dt) {
      const x = 360 + ((this._t * 977) % 1200);
      Effects.sparks(x, 200, 14, ['#ffd23f', '#ff5a5a', '#5fd4ff', '#9cff6a'][Math.floor(this._t * 2) % 4], 700);
    }
  },

  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) {
    if (code === 'Enter' || code === 'Space') Scenes.go(this.data.mode, this.data.again);
    if (code === 'Escape') Scenes.go('challenges', { game: this.data.game });
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
    Sprites.ui(icon, cx - 640, 250, 220, 200, { alpha: 0.9 });
    Sprites.ui(d.mode === 'wicketrush' ? 'bowler' : 'batter', cx + 660, 330, 280, 360, { alpha: 0.95 });
    R.text(T(d.titleKey), cx, 80, 58, '#ffffff');
    R.text(T('chal.resultLine', { name: d.player || '', d: T('chal.diff.' + (d.diff || 'pro')) }), cx, 138, 28, '#b8c6d6', 'center', false);

    // Score, counting up
    const k = Math.min(1, this._t / 1.0);
    const shown = Math.round(d.score * (1 - Math.pow(1 - k, 3)));
    R.text(formatNumber(shown), cx, 250, 130, '#ffd23f');
    if (d.raw !== undefined && d.raw !== d.score) R.text(T('chal.scoreDiff', { raw: formatNumber(d.raw), m: Challenge.diff(d.diff).score }), cx, 330, 26, '#d8e4f0', 'center', false);
    if (d.isBest && this._t > 1) {
      const s = 1 + Math.sin(this._t * 6) * 0.04;
      ctx.save(); ctx.translate(cx, 378); ctx.scale(s, s);
      R.text(T('result.newBest'), 0, 0, 46, '#9cff6a');
      ctx.restore();
    }
    // Medal
    if (d.medal && this._t > 0.8) {
      const p = Math.min(1, (this._t - 0.8) / 0.3);
      const mx = cx + 470, my = 260;
      ctx.save(); ctx.globalAlpha = p;
      if (!Sprites.ui(CHALLENGE_DATA.medalIcon[d.medal], mx, my, 170 * (0.6 + 0.4 * p), 170 * (0.6 + 0.4 * p))) R.circle(mx, my, 70, CHALLENGE_DATA.medalColour[d.medal], '#000', 5);
      R.text(T('chal.medal.' + d.medal), mx, my + 110, 30, CHALLENGE_DATA.medalColour[d.medal]);
      if (d.newMedal) R.text(T('chal.newMedal'), mx, my + 146, 22, '#9cff6a');
      ctx.restore();
    }

    const stats = d.stats;
    const w = 330, gap = 22, x0 = cx - (stats.length * w + (stats.length - 1) * gap) / 2;
    stats.forEach(([key, val], i) => {
      const x = x0 + i * (w + gap);
      R.panel(x, 430, w, 160);
      R.text(T(key), x + w / 2, 470, 26, '#b8c6d6', 'center', false);
      R.text(String(val), x + w / 2, 540, 64, '#ffffff');
    });

    const best = Math.max(d.score, d.prevBest || 0);
    R.text(T('result.pbLine', { score: formatNumber(best) }), cx, 640, 40, '#ffffff');
    // What the next medal needs.
    const R0 = Challenge.def(d.rs);
    if (R0) {
      const i = Challenge.medalRank(d.medal);
      if (i < 4) R.text(T('chal.nextMedal', { m: T('chal.medal.' + CHALLENGE_DATA.medals[i]), n: formatNumber(R0.medals[i]) }), cx, 690, 28, '#d8e4f0', 'center', false);
    }
    // Rewards paid this time (each medal pays once, ever).
    const lines = (d.rewards || []).map((r) => T('chal.rewardLine', { m: T('chal.medal.' + r.medal), r: AchText.reward(r.reward) }))
      .concat((d.milestones || []).map((m) => T('chal.milestoneLine', { n: m.points, r: AchText.reward(m.reward) })));
    lines.slice(0, 3).forEach((ln, i) => R.text(ln, cx, 750 + i * 40, 28, '#9cff6a', 'center', false));

    this.buttons.draw();
    Effects.drawParticles(ctx);
    R.text(T('result.seed', { seed: d.seed }), Display.safe.right - 30, Display.safe.bottom - 30, 22, 'rgba(255,255,255,0.35)', 'right', false);
  },
};
