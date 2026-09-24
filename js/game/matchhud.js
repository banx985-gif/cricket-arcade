// Cricket Arcade — match scoreboard + chase panel (M03, HUD plan 27).
// Uses the real scoreboard / target art. That art has example numbers painted
// in, so matching insets cover them and the live numbers are written on top
// (patch rects live in MATCH_DATA.hudArt). Falls back to plain panels if the
// art hasn't loaded.

const MatchHud = {
  _patch(ctx, k, p) {
    const [x, y, w, h, c0, c1] = p;
    const g = ctx.createLinearGradient(0, y * k, 0, (y + h) * k);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.save();
    ctx.shadowColor = c1;
    ctx.shadowBlur = 6 * k;          // soft edge so the inset blends into the art
    R.roundRectPath(x * k, y * k, w * k, h * k, 8 * k);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  },

  _txt(k, spec, str, color) {
    const [x, y, size, align] = spec;
    R.text(str, x * k, y * k, size * k, color || '#ffffff', align, false);
  },

  // Top-left scoreboard. w = drawn width in logical px.
  scoreboard(ctx, x, y, w, inn, teamShort) {
    const A = MATCH_DATA.hudArt.scoreboard;
    const art = Sprites.images[A.id];
    const line = inn.target
      ? T('match.lineNeed', { need: inn.need, balls: inn.ballsLeft })
      : T('match.lineRR', { rr: inn.runRate.toFixed(2) });
    if (!art) {
      R.panel(x, y, w, w * 0.45);
      R.text(teamShort, x + 24, y + 34, 26, '#b8c6d6', 'left', false);
      R.text(`${inn.runs}/${inn.wickets}`, x + 22, y + 92, 66, '#ffffff', 'left');
      R.text(T('match.oversN', { n: inn.overs }), x + w - 24, y + 92, 34, '#ffffff', 'right', false);
      R.text(line, x + 24, y + w * 0.45 - 26, 24, '#ffd23f', 'left', false);
      return w * 0.45;
    }
    const k = w / art.img.width;
    const h = art.img.height * k;
    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(art.img, 0, 0, w, h);
    for (const p of A.patches) this._patch(ctx, k, p);
    const t = A.text;
    this._txt(k, t.team, teamShort, '#cfe0ff');
    this._txt(k, t.score, `${inn.runs}/${inn.wickets}`);
    this._txt(k, t.oversLabel, T('match.overs'), '#cfe0ff');
    this._txt(k, t.overs, inn.overs);
    this._txt(k, t.line, line, inn.target ? '#ffd23f' : '#ffffff');
    ctx.restore();
    return h;
  },

  // Chase panel: target, runs needed, balls left, required rate.
  target(ctx, x, y, w, inn) {
    const A = MATCH_DATA.hudArt.target;
    const art = Sprites.images[A.id];
    if (!art) {
      const h = w * 0.72;
      R.panel(x, y, w, h);
      R.text(T('match.targetN', { n: inn.target }), x + w / 2, y + 40, 34, '#ffd23f');
      R.text(T('match.needFrom', { need: inn.need, balls: inn.ballsLeft }), x + w / 2, y + 100, 30, '#ffffff');
      R.text(T('match.reqRate', { rr: inn.requiredRate.toFixed(2) }), x + w / 2, y + h - 34, 24, '#ffd23f', 'center', false);
      return h;
    }
    const k = w / art.img.width;
    const h = art.img.height * k;
    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(art.img, 0, 0, w, h);
    for (const p of A.patches) this._patch(ctx, k, p);
    const t = A.text;
    this._txt(k, t.target, String(inn.target));
    this._txt(k, t.need, String(inn.need));
    this._txt(k, t.balls, String(inn.ballsLeft));
    this._txt(k, t.rate, inn.ballsLeft > 0 ? inn.requiredRate.toFixed(2) : '-', '#ffd23f');
    ctx.restore();
    return h;
  },

  // "AHEAD BY 6" / "BEHIND BY 4" against a steady chase (par = even pace to the target).
  paceChip(ctx, x, y, w, inn, forPlayer) {
    if (!inn.target) return;
    const par = Math.round((inn.target - 1) * inn.legal / inn.maxBalls);
    const diff = inn.runs - par;
    const good = forPlayer ? diff >= 0 : diff < 0;     // when bowling, the AI being behind is good for you
    const key = diff > 0 ? 'match.ahead' : diff < 0 ? 'match.behind' : 'match.onPace';
    const who = inn.battingSide === 'player' ? '' : T('match.theyPrefix');
    const fill = diff === 0 ? 'rgba(60,80,110,0.92)' : good ? 'rgba(40,160,70,0.92)' : 'rgba(200,50,50,0.92)';
    R.roundRect(x, y, w, 48, 20, fill, 'rgba(255,255,255,0.6)', 3);
    R.text(who + T(key, { n: Math.abs(diff) }), x + w / 2, y + 25, 24, '#ffffff', 'center', false);
  },

  // Balls of the current over as little bubbles.
  thisOver(ctx, x, y, inn) {
    R.text(T('match.thisOver'), x, y, 20, '#ffffff', 'left');
    let bx = x + 150;
    for (const s of inn.thisOver) {
      const col = s === 'W' ? '#ff4b4b' : s === '6' ? '#ffd23f' : s === '4' ? '#5fd4ff' : (s === 'Wd' || s === 'Nb') ? '#ffb36b' : 'rgba(255,255,255,0.9)';
      R.circle(bx, y, 21, 'rgba(0,0,0,0.6)', col, 3);
      R.text(s, bx, y + 1, s.length > 1 ? 16 : 22, col, 'center', false);
      bx += 50;
    }
  },
};
