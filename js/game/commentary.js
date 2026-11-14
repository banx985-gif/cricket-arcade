// Cricket Legends (M17 Job 1) - live text commentary.
// One short caption line at a time tells the story of each ball and the match:
//   result lines     "Caught at deep midwicket!", "Cracked through the covers for four"
//   milestone lines  a fifty, a hat-trick on, a new batter
//   situation lines  "Last over, 12 needed, 2 wickets left"
// Lines come from the strings table (comm.<kind>.1..8, data/commentary.js). Each kind deals its
// variants like a shuffled deck, so a line never repeats until the others have been used.
// Variety only ever uses RNG.fx (the visual-only stream), so commentary can never change a result.
// Settings > Video > COMMENTARY switches it off.

const Commentary = {
  cur: null,          // the line on screen: { kind, text, t, hold }
  queue: [],          // lines waiting (after the current one)
  decks: {},          // kind -> variant numbers still to use
  last: {},           // kind -> the variant used last (no repeat across a reshuffle)

  on() { return typeof GameSettings === 'undefined' || GameSettings.get('commentary') !== false; },
  reset() { this.cur = null; this.queue = []; },

  // Where the ball went (data/commentary.js areas), from its landing / stopping point.
  area(x, z) {
    const deg = Math.atan2(x, z) * 180 / Math.PI, a = Math.abs(deg), side = deg >= 0 ? 'off' : 'leg';
    for (const b of COMM_DATA.areas) if ((!b.side || b.side === side) && a <= b.max) return b.id;
    return 'straight';
  },
  shotName(shotId, area, edge) {
    if (edge) return 'edge';
    const t = COMM_DATA.shots[shotId];
    return t ? t[area] : 'push';
  },
  typeKey(bowl) {
    if (!bowl) return 'comm.type.pace';
    if (COMM_DATA.types.includes(bowl.family)) return 'comm.type.' + bowl.family;
    const fam = typeof Bowling !== 'undefined' && bowl.family ? Bowling.family(bowl.family) : null;
    return 'comm.type.' + (fam && fam.kind === 'spin' ? 'spin' : 'pace');
  },

  // The next variant for a kind (1..variants), dealt from a shuffled deck.
  pick(kind) {
    const n = COMM_DATA.variants;
    let d = this.decks[kind];
    if (!d || !d.length) {
      d = [];
      for (let i = 1; i <= n; i++) d.push(i);
      for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(RNG.fx.next() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
      if (d[0] === this.last[kind] && d.length > 1) [d[0], d[1]] = [d[1], d[0]];
      this.decks[kind] = d;
    }
    const v = d.shift();
    this.last[kind] = v;
    return v;
  },
  text(kind, vars) { return T('comm.' + kind + '.' + this.pick(kind), vars); },

  // What to say about the ball just applied to inn. Pure (no state, no text): returns [{ kind, vars }].
  // info: { inn, res (Innings.apply result), kind ('legal'|'wide'|'noball'), wicket, batRuns, boundary,
  //         shot ('control'|'power'|'defend'|null), edge, fielder (position id), end {x,z}, bat, bowl, team }
  lines(info) {
    const inn = info.inn, res = info.res, out = [];
    const bat = info.bat || {}, bowl = info.bowl || {};
    const end = info.end || { x: 0, z: 1 };
    const area = this.area(end.x, end.z);
    const vars = {
      bat: bat.short || bat.name || '', bowl: bowl.short || bowl.name || '', type: T(this.typeKey(bowl)),
      area: T('comm.area.' + area), over: T('comm.over.' + area), shot: T('comm.shot.' + this.shotName(info.shot, area, info.edge)),
      pos: T('comm.pos.' + (COMM_DATA.positions.includes(info.fielder) ? info.fielder : 'fielder')), n: info.batRuns || 0,
    };
    // 1. The ball itself.
    let k;
    if (info.kind === 'wide') k = 'wide';
    else if (res.wicket) k = info.wicket === 'caught' && info.fielder === 'keeper' ? 'caughtKeeper' : info.wicket;
    else if (res.notOut) k = 'notOut';
    else if (info.boundary === 6) k = 'six';
    else if (info.boundary === 4) k = info.edge ? 'edgeFour' : 'four';
    else if (info.kind === 'noball') k = 'noball';
    else if (info.batRuns === 1) k = 'single';
    else if (info.batRuns > 1) k = 'runs';
    else if (res.byes) { k = 'byes'; vars.n = res.byes; }                // M19: past the keeper
    else if (info.shot === 'defend') k = 'defended';
    else if (!info.shot || info.miss) k = 'beaten';
    else k = 'dot';
    out.push({ kind: k, vars });

    // 2. Milestones.
    const e = inn.log && inn.log[inn.log.length - 1];
    if (e && info.kind !== 'wide') {
      const b = inn.bat(e.b), before = b.runs - (info.batRuns || 0) - (info.boundary || 0);
      if (before < 100 && b.runs >= 100) out.push({ kind: 'hundred', vars });
      else if (before < 50 && b.runs >= 50) out.push({ kind: 'fifty', vars });
    }
    if (res.wicket && info.wicket !== 'runout' && e && e.w) {
      const mine = inn.log.filter((x) => x.w === e.w && x.k === 'l');
      const tail = mine.slice(-COMM_DATA.hatTrickAfter);
      const figs = inn.bowlerFigs[e.w] || { wkts: 0 };
      if (tail.length === COMM_DATA.hatTrickAfter && tail.every((x) => x.o && x.o !== 'runout') && !inn.ended) out.push({ kind: 'hatTrickOn', vars });
      else if (figs.wkts === COMM_DATA.threeWkts) out.push({ kind: 'threeWkts', vars });
    }
    if (res.wicket && !inn.ended) {
      const team = info.team || (typeof Match !== 'undefined' && Match.teams ? Match.team(inn.battingSide) : null);
      const nb = team && team.players[inn.striker - 1];
      if (nb && inn.bat(inn.striker).balls === 0) out.push({ kind: 'newBatter', vars: Object.assign({}, vars, { bat: nb.short || nb.name }) });
    }

    // 3. The situation (only while the innings goes on).
    if (!inn.ended) {
      const S = COMM_DATA.situation;
      const sv = Object.assign({}, vars, { need: inn.need, balls: inn.ballsLeft, wkts: inn.maxWickets - inn.wickets, wkts_down: inn.wickets, runs: inn.runs });
      if (res.freeHitNext) out.push({ kind: 'freeHit', vars: sv });
      else if (inn.target) {
        if (inn.ballsLeft === 1) out.push({ kind: 'lastBall', vars: sv });
        else if (inn.ballsLeft === 6 && res.overDone) out.push({ kind: 'lastOver', vars: sv });
        else if (inn.ballsLeft <= S.chaseBalls && inn.need <= inn.ballsLeft * S.chaseMaxRate && (res.overDone || res.wicket || info.boundary)) out.push({ kind: 'chase', vars: sv });
      } else if (res.overDone && S.overRunsFirstInnings) {
        const over = inn.legal / 6 - 1;
        const ovRuns = inn.log.filter((x) => Math.floor((x.k === 'l' ? x.n - 1 : x.n) / 6) === over).reduce((a, x) => a + x.r, 0);
        out.push({ kind: 'overRuns', vars: Object.assign(sv, { n: ovRuns }) });
      }
    }
    return out.slice(0, COMM_DATA.maxQueue);
  },

  // After every ball, live or simulated: replace whatever was waiting with this ball's lines.
  ball(info) {
    if (!this.on()) { this.reset(); return []; }
    const ls = this.lines(info);
    this.queue = ls.map((l) => ({ kind: l.kind, text: this.text(l.kind, l.vars) }));
    const cr = this.crowd(info);
    if (cr) this.queue.push({ kind: 'crowd', text: cr, crowd: true });
    this.cur = null;
    this._next();
    return ls;
  },
  // The same, from a simulated ball (SimMatch.ball's result + the Innings.apply result).
  sim(inn, b, res, bat, bowl) {
    return this.ball({ inn, res, kind: b.kind, wicket: b.wicket, batRuns: b.batRuns, boundary: b.boundary, shot: b.shot === 'leave' ? null : b.shot,
      miss: b.grade === 'miss', edge: !!b.edge, fielder: b.fielder, end: b.end, bat, bowl });
  },

  // The same, from a played ball (the batting or bowling scene, just after Innings.apply).
  live(sc, key, res, batRuns, wicket) {
    const inn = sc.inn, e = inn && inn.log && inn.log[inn.log.length - 1];
    if (!e || typeof Match === 'undefined' || !Match.teams) return [];
    const bat = Match.team(inn.battingSide).players[e.b - 1];
    const bowl = e.w ? Match.team(inn.bowlingSide).players.find((p) => p.id === e.w) : null;
    const plan = sc.hit && sc.hit.plan, path = plan && plan.path;
    const shot = sc.shot && sc.shot.id !== 'leave' ? sc.shot.id : null;
    return this.ball({ inn, res, kind: e.k === 'w' ? 'wide' : e.k === 'n' ? 'noball' : 'legal', wicket, batRuns,
      boundary: key === 'six' ? 6 : key === 'four' ? 4 : 0, shot, miss: !sc.hit, edge: !!(sc.hit && sc.hit.c.kind === 'edge'),
      fielder: plan && plan.fielder ? plan.fielder.id : null, end: path && path.n ? { x: path.x[path.n - 1], z: path.z[path.n - 1] } : null, bat, bowl });
  },

  // M19 (plan 8.9): the home crowd. When your side (with a country / origin) hits a boundary or takes
  // a wicket, now and then a line from its origin pack's crowdLines is heard. Cosmetic stream only.
  crowd(info) {
    const C = COMM_DATA.crowd, res = info.res, inn = info.inn;
    if (!C || typeof Match === 'undefined' || !Match.teams || !inn || typeof ORIGIN_PACKS === 'undefined') return null;
    const t = Match.teams.player, O = t && t.origin && ORIGIN_PACKS.origins[t.origin];
    const lines = O && O.crowdLines;
    if (!lines || !lines.length) return null;
    const ours = (info.boundary && inn.battingSide === 'player') || (res && res.wicket && inn.bowlingSide === 'player');
    if (!ours || RNG.fx.next() >= C.chance) return null;
    return T('comm.crowd', { line: lines[Math.floor(RNG.fx.next() * lines.length)] });
  },

  _next() {
    const n = this.queue.shift();
    this.cur = n ? Object.assign(n, { t: 0, hold: this.queue.length ? COMM_DATA.holdShort : COMM_DATA.hold }) : null;
  },
  update(dt) {
    if (!this.cur) return;
    this.cur.t += dt;
    if (this.cur.t >= this.cur.hold) this._next();
  },

  // The caption strip, bottom centre (between the corner controls). Never more than one line.
  draw(ctx, yOverride) {
    const c = this.cur;
    if (!c || !this.on()) return;
    const F = COMM_DATA.fade, a = Math.max(0, Math.min(1, c.t / F, (c.hold - c.t) / F));
    const s = Display.safe, cx = CONFIG.LOGICAL_W / 2, y = yOverride || s.bottom - 46, w = 1040;
    ctx.save();
    ctx.globalAlpha = a;
    R.roundRect(cx - w / 2, y - 30, w, 60, 22, c.crowd ? 'rgba(90,20,30,0.85)' : 'rgba(6,14,26,0.82)', 'rgba(255,210,63,0.6)', 2);
    R.text(c.text, cx, y, 28, c.crowd ? '#ffd23f' : '#ffffff', 'center', false, w - 40);
    ctx.restore();
  },
};
