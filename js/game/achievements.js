// Cricket Arcade — achievements (M09, docs/ACHIEVEMENTS_v1.md). Pure rules, plus
// a small pop-up queue that main.js draws. Data in ACHIEVEMENT_DATA.
//
// In the global save:
//   save.achievements           id -> { at: 'YYYY-MM-DD' }
//   save.records.lifetime       sixes, runs, wickets, bowled, catches, runouts, sGrades
//   save.records.wicketTypes    delivery id -> wickets (lifetime: Swing King, Full Toolkit)
//   save.currencies             coins, legacyMarks, mythicCore, bankedTokens (Skill Tokens
//                               earned outside a career go to the next career you open)

// ---- what happened in the match just played (from the ball-by-ball logs) ----
// me: { pid } in a career (the career player's id, e.g. 'player3'), or {} for
// Quick Match (you control your whole side: the best batter / bowler counts).
const MatchFacts = {
  of(me) {
    const inns = Match.innings || [], fmt = Match.fmt || { overs: 5, powerplay: 1 }, won = !!(Match.result && Match.result.winner === 'player');
    const pos = me.pid ? parseInt(me.pid.replace('player', ''), 10) : null;
    const myBat = (e) => (pos ? e.b === pos : true), myBowl = (e) => (me.pid ? e.w === me.pid : !!(e.w && e.w.startsWith('player')));
    const kindOf = (id) => { const p = this._player(id); return p && p.family ? Bowling.family(p.family).kind : null; };
    const batRuns = (e) => (e.k === 'w' ? 0 : e.r - (e.k === 'n' ? 1 : 0));
    const f = { won, runs: 0, sixes: 0, perfect: 0, sixesInOver: 0, finalOverWinner: 0, carriedBat: 0, boundaryStreak: 0, freeHitSixes: 0, spinSixes: 0,
      ppRuns: 0, spinRuns: 0, goldenDuckWin: 0, chaseWinNotOut: 0,
      wickets: 0, bowled: 0, lbw: 0, hatTricks: 0, maidens: 0, wicketMaidens: 0, googlyWickets: 0, dots: 0, deathDefend: 0, cleanSpell: 0,
      newBallWickets: 0, deathWickets: 0, paceWickets: 0, closerWin: 0, wicketTypes: [],
      catches: 0, directHits: 0, runouts: 0, superOverWin: 0, lastBallWin: 0, bigWin: 0, nelson: 0, tailWags: 0,
      teamSixes: 0, teamRuns: 0 };
    const main = inns.filter((i) => !i.isSuper);
    for (const inn of inns) {
      const log = inn.log || [], lastOver = inn.maxBalls / 6 - 1, over = (e) => Math.floor(((e.k === 'l' ? e.n : e.n + 1) - 1) / 6);
      if (inn.battingSide === 'player') {
        // batting: per batter (Quick Match counts your best batter)
        const byBat = {};
        for (const b of inn.batters) if (myBat({ b: b.no }) && (b.balls || b.out)) byBat[b.no] = b;
        for (const b of Object.values(byBat)) {
          if (pos) { f.runs += b.runs; f.sixes += b.sixes || 0; } else { f.runs = Math.max(f.runs, b.runs); f.sixes = Math.max(f.sixes, b.sixes || 0); }
        }
        f.teamSixes += inn.sixes; f.teamRuns += inn.runs;
        const overSix = {}, streak = {}, best = {};
        for (const e of log) {
          if (!myBat(e) || e.k === 'w') continue;
          if (e.c === 'perfect') f.perfect++;
          if (e.x === 6) { const k = e.b + ':' + over(e); overSix[k] = (overSix[k] || 0) + 1; f.sixesInOver = Math.max(f.sixesInOver, overSix[k]); }
          streak[e.b] = e.x ? (streak[e.b] || 0) + 1 : 0; best[e.b] = Math.max(best[e.b] || 0, streak[e.b]);
          if (e.fh && e.x === 6) f.freeHitSixes++;
          const spin = kindOf(e.w) === 'spin';
          if (spin && e.x === 6) f.spinSixes++;
          if (spin) f.spinRuns += batRuns(e);
          if (!inn.isSuper && (e.k === 'l' ? e.n - 1 : e.n) < fmt.powerplay * 6) f.ppRuns += batRuns(e);
        }
        f.boundaryStreak = Math.max(f.boundaryStreak, ...Object.values(best), 0);
        const last = log[log.length - 1];
        if (won && inn.target && inn.endReason === 'chased' && last && myBat(last) && last.x && over(last) >= lastOver) f.finalOverWinner++;
        if (won && inn.target && inn.endReason === 'chased' && last && last.b === 11 && last.r > 0) f.tailWags++;
        if (!inn.isSuper && inn.ended && inn.runs === 111) f.nelson++;
        // carried the bat: in from the first ball (an opener), still not out at the end
        for (const no of pos ? [pos] : [1, 2]) {
          const b = inn.bat(no);
          if (no <= 2 && b.balls >= 6 && !b.out && inn.ended && inn.endReason !== 'allOut' && !inn.isSuper) f.carriedBat = 1;
        }
        if (pos) {
          const b = inn.bat(pos);
          if (won && b.out && b.balls === 1) f.goldenDuckWin = 1;
          if (won && inn.target && !inn.isSuper && b.balls > 0 && !b.out) f.chaseWinNotOut = 1;
        }
      } else {
        // bowling and fielding
        const seq = {}, overRuns = {}, overWk = {}, overBalls = {};
        for (const e of log) {
          if (e.o === 'caught') f.catches++;
          if (e.o === 'runout') { f.runouts++; if (e.t === 'perfect') f.directHits++; }
          if (!myBowl(e)) continue;
          const o = over(e), key = e.w + ':' + o;
          overRuns[key] = (overRuns[key] || 0) + e.r;
          if (e.k === 'l') overBalls[key] = (overBalls[key] || 0) + 1;
          const wk = e.o && e.o !== 'runout';
          if (wk) {
            overWk[key] = (overWk[key] || 0) + 1;
            if (e.o === 'bowled') f.bowled++;
            if (e.o === 'lbw') f.lbw++;
            if (e.d === 'googly') f.googlyWickets++;
            if (e.d) f.wicketTypes.push(this._player(e.w).family + ':' + e.d);
            if (o <= 1) f.newBallWickets++;
            if (o === lastOver) f.deathWickets++;
            if (kindOf(e.w) === 'pace') f.paceWickets++;
          }
          if (e.k === 'l') { seq[e.w] = wk ? (seq[e.w] || 0) + 1 : 0; if (seq[e.w] === 3) f.hatTricks++; }
        }
        for (const key of Object.keys(overBalls)) if (overBalls[key] >= 6 && !overRuns[key]) { f.maidens++; if (overWk[key]) f.wicketMaidens++; }
        // Quick Match: your best bowler's wickets / dots; career: the career player's figures
        const figs = me.pid ? [inn.bowlerFigs[me.pid]].filter(Boolean) : Object.entries(inn.bowlerFigs).filter(([id]) => id.startsWith('player')).map(([, v]) => v);
        if (me.pid) f.dots += figs.reduce((a, x) => a + (x.dots || 0), 0);
        else { f.wickets = Math.max(f.wickets, ...figs.map((x) => x.wkts), 0); f.dots = Math.max(f.dots, ...figs.map((x) => x.dots || 0), 0); }
        if (figs.some((x) => x.balls >= 12 && !(x.extras || 0))) f.cleanSpell = 1;
        // the last over of a match your side won / defended
        const lastBowler = inn.overBowlers[inn.overBowlers.length - 1];
        if (won && inn === inns[inns.length - 1] && lastBowler && myBowl({ w: lastBowler })) {
          f.closerWin = 1;
          if (inn.target && !inn.isSuper) {
            const before = log.filter((e) => over(e) < lastOver).reduce((a, e) => a + e.r, 0);
            if (inn.overBowlers.length - 1 === lastOver && inn.target - before <= 6) f.deathDefend = 1;
          }
        }
      }
    }
    if (me.pid) f.wickets = (() => { let w = 0; for (const inn of inns) if (inn.bowlingSide === 'player' && inn.bowlerFigs[me.pid]) w += inn.bowlerFigs[me.pid].wkts; return w; })();
    // results
    const dec = inns[inns.length - 1];
    if (won && inns.length > 2) f.superOverWin = 1;
    // Legend difficulty (plan 20): a win, and the secret wicket + six + catch
    const legend = Match.difficulty === 'legend';
    f.legendWin = won && legend ? 1 : 0;
    f.legendTriple = legend && f.wickets >= 1 && f.sixes >= 1 && f.catches >= 1 ? 1 : 0;
    if (won && dec && dec.log && dec.log.length && dec.log[dec.log.length - 1].n === dec.maxBalls && dec.log[dec.log.length - 1].k === 'l') f.lastBallWin = 1;
    if (won && main.length === 2) {
      const [a, b] = main;
      if (a.battingSide === 'player' && a.runs - b.runs >= 50) f.bigWin = 1;
      if (b.battingSide === 'player' && b.endReason === 'chased' && b.wickets <= 2) f.bigWin = 1;
    }
    return f;
  },
  _player(id) {
    const T0 = Match.teams || {};
    for (const side of ['player', 'ai']) { const p = T0[side] && T0[side].players.find((x) => x.id === id); if (p) return p; }
    return null;
  },
};

// ---- the achievement rules ----
const Achievements = {
  toasts: [],
  D() { return ACHIEVEMENT_DATA; },
  def(id) { return ACHIEVEMENT_DATA.list.find((a) => a.id === id) || null; },
  available(a) { return !a.requires || ACHIEVEMENT_DATA.features.includes(a.requires); },
  list() { return ACHIEVEMENT_DATA.list.filter((a) => this.available(a)); },
  earned(save, id) { return !!(save.achievements && save.achievements[id]); },

  life(save) {
    save.records = save.records || {};
    save.records.lifetime = save.records.lifetime || {};
    save.records.wicketTypes = save.records.wicketTypes || {};
    return save.records.lifetime;
  },
  // Lifetime-derived values.
  lifeStat(save, stat) {
    const L = this.life(save), W = save.records.wicketTypes;
    if (stat === 'swingKing') return ['inswing', 'outswing', 'cutter'].filter((d) => Object.keys(W).some((k) => k.endsWith(':' + d))).length;
    if (stat === 'fullToolkit') return Object.values(BOWLING_DATA.families).some((fam) => fam.deliveries.every((d) => W[fam.id + ':' + d.id])) ? 1 : 0;
    return L[stat] || 0;
  },
  // The career you're playing.
  careerFacts(c) {
    const p = c.player, eq = typeof Gear !== 'undefined' ? Gear.equipped(c) : {};
    const counts = typeof Gear !== 'undefined' ? Gear.setCounts(eq) : {};
    return {
      clubSigned: c.club ? 1 : 0, stageN: Career.stage(c).n, franchiseSigned: c.contract ? 1 : 0,
      nationalSelected: c.nationalSelected || Career.stage(c).n >= 6 ? 1 : 0, captain: c.captain ? 1 : 0,
      worldChampion: (c.trophies || []).includes('world_champion') ? 1 : 0, comebacks: c.comebacks || 0,
      maxStat: Math.max(...Object.values(p.stats)),
      masteredTechs: SkillTree.unlockedTechs(c).filter((id) => SkillTree.masteryLevel(c, id) === 'mastered').length,
      fullSet: Object.entries(counts).some(([s, n]) => n >= Gear.setSize(s)) ? 1 : 0,
    };
  },
  accountFacts(save) {
    const hof = save.hallOfFame || [], roles = new Set(hof.map((h) => h.role)), rivals = (save.collection && save.collection.rivals) || {};
    return {
      quickWins: Object.entries(save.matches || {}).reduce((a, [, m]) => a + (m.won || 0), 0),
      retired: hof.length, retiredBatter: hof.filter((h) => h.role === 'batter').length, retiredBowler: hof.filter((h) => h.role === 'bowler').length,
      retiredAllrounder: hof.filter((h) => h.role === 'allrounder').length, retiredRoles: roles.size, retiredOrigins: new Set(hof.map((h) => h.origin)).size,
      straightThrough: hof.filter((h) => h.records && h.records.gateMisses === 0).length,
      rivalsBeaten: Object.keys(rivals).length, championBeaten: rivals.champion ? 1 : 0,
      coachesHired: Object.keys((save.coaches && save.coaches.hired) || {}).length,
      techsDiscovered: Object.keys((save.collection && save.collection.techniques) || {}).length,
      mythicOwned: EQUIPMENT_DATA.items.some((it) => it.rarity === 'mythic' && Gear.owns(save, it.id)) ? 1 : 0,
      ...(typeof MyXI !== 'undefined' ? MyXI.facts(save) : {}),     // My XI (M10)
      legendCareers: hof.filter((h) => h.legendCareer).length,                   // Hard Way (M12)
      formatsWon: ['quick5', 'quick10', 'quick20'].filter((f) => save.matches && save.matches[f] && save.matches[f].won > 0).length,
      profileLevel: typeof Profile !== 'undefined' ? Profile.level(save) : 1,
      ...(typeof Challenge !== 'undefined' ? Challenge.facts(save) : {}),        // Six Smash / Wicket Rush medals (M11)
      ...(typeof Missions !== 'undefined' ? Missions.accountFacts(save) : {}),   // Missions (M11)
    };
  },
  // Progress toward one (for the Records screen's bars): { have, need } or null.
  progress(save, a, c) {
    const { on, stat, min } = a.cond;
    if (on === 'life') return { have: Math.min(min, this.lifeStat(save, stat)), need: min };
    if (on === 'account') return { have: Math.min(min, this.accountFacts(save)[stat] || 0), need: min };
    if (on === 'career' && c) return { have: Math.min(min, this.careerFacts(c)[stat] || 0), need: min };
    return null;
  },

  // Check a set of facts against every achievement of that kind. Returns newly earned ids.
  _check(save, on, facts, c) {
    const got = [];
    for (const a of this.list()) {
      if (a.cond.on !== on || this.earned(save, a.id)) continue;
      const v = on === 'life' ? this.lifeStat(save, a.cond.stat) : facts[a.cond.stat] || 0;
      if (v >= a.cond.min) got.push(this.award(save, a, c));
    }
    return got;
  },
  award(save, a, c) {
    save.achievements = save.achievements || {};
    save.achievements[a.id] = { at: new Date().toISOString().slice(0, 10) };
    const r = a.reward, C = save.currencies = save.currencies || {};
    if (r.coins) C.coins = (C.coins || 0) + r.coins;
    if (r.lm) C.legacyMarks = (C.legacyMarks || 0) + r.lm;
    if (r.mc) C.mythicCore = (C.mythicCore || 0) + r.mc;
    if (r.item) Gear.grant(save, r.item, 'achievement');
    if (r.st) { if (c) SkillTree.earn(c, 'achievement', r.st); else C.bankedTokens = (C.bankedTokens || 0) + r.st; }
    this.toasts.push({ id: a.id, t: 0 });
    return a.id;
  },
  // Skill Tokens earned outside a career: into the next career opened.
  claimBanked(save, c) {
    const n = (save.currencies && save.currencies.bankedTokens) || 0;
    if (!n || !c) return 0;
    SkillTree.earn(c, 'achievement', n);
    save.currencies.bankedTokens = 0;
    return n;
  },

  // ---- the triggers ----
  // After any real match (career or Quick Match). extra: more match facts (e.g. rivalGap).
  afterMatch(save, me, c, extra) {
    const f = Object.assign(MatchFacts.of(me), extra || {});
    const L = this.life(save), W = save.records.wicketTypes;
    const add = (k, n) => { L[k] = (L[k] || 0) + (n || 0); };
    // lifetime: the career player (or your whole side in Quick Match)
    add('sixes', me.pid ? f.sixes : f.teamSixes); add('runs', me.pid ? f.runs : f.teamRuns); add('bowled', f.bowled);
    add('wickets', me.pid ? f.wickets : (Match.innings || []).filter((i) => i.bowlingSide === 'player').reduce((a, i) => a + Object.entries(i.bowlerFigs).reduce((s, [, x]) => s + x.wkts, 0), 0));
    add('catches', f.catches); add('runouts', f.runouts);
    for (const k of f.wicketTypes) W[k] = (W[k] || 0) + 1;
    const got = this._check(save, 'match', f, c).concat(this._check(save, 'life', null, c));
    return { facts: f, got };
  },
  // Any time a career is saved (cheap): career and account achievements.
  checkCareer(save, c) { return this._check(save, 'career', this.careerFacts(c), c).concat(this.checkAccount(save, c)); },
  checkAccount(save, c) { return this._check(save, 'account', this.accountFacts(save), c).concat(this._check(save, 'life', null, c)); },
};

// The pop-up when an achievement is earned (drawn over every screen by main.js).
const AchievementToast = {
  update(dt) {
    const q = Achievements.toasts;
    if (!q.length) return;
    q[0].t += dt * (q.length > 2 ? 2.2 : 1);          // a backlog moves faster
    if (q[0].t > 3.2) q.shift();
  },
  draw(ctx) {
    const q = Achievements.toasts;
    if (!q.length) return;
    const a = Achievements.def(q[0].id), t = q[0].t, cx = CONFIG.LOGICAL_W / 2;
    const k = Math.min(1, t / 0.25, (3.2 - t) / 0.3), y = Display.safe.top + 20 - (1 - k) * 160;
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, k));
    R.roundRect(cx - 420, y, 840, 120, 30, 'rgba(10,22,40,0.96)', '#ffd23f', 4);
    Sprites.ui(ACHIEVEMENT_DATA.tiers[a.tier], cx - 350, y + 60, 96, 96);
    R.text(T('ach.unlocked'), cx - 280, y + 34, 22, '#ffd23f', 'left', false);
    R.text(T('ach.' + a.id), cx - 280, y + 72, 36, '#ffffff', 'left');
    R.text(AchText.reward(a.reward), cx + 400, y + 72, 22, '#9cff6a', 'right', false);
    ctx.restore();
  },
};
const AchText = {
  reward(r) {
    const out = [];
    if (r.coins) out.push(T('ach.rw.coins', { n: r.coins }));
    if (r.st) out.push(T('ach.rw.st', { n: r.st }));
    if (r.lm) out.push(T('ach.rw.lm', { n: r.lm }));
    if (r.mc) out.push(T('ach.rw.mc', { n: r.mc }));
    if (r.item) out.push(T('gear.' + r.item));
    return out.join(' + ');
  },
};
