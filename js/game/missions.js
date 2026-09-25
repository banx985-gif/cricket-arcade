// Cricket Arcade — Missions (plan 18): 48 handcrafted scenarios on the real match
// engine. Pure rules (Missions) + the match glue (MissionMatch). Data: MISSION_DATA.
//
// In the global save (account-wide, never reset — no daily treadmill):
//   save.missionStars[id]   { cleared: 1, stars: [0|1, 0|1, 0|1], plays, firstPaid, perfectPaid }
//   save.missionMeta        { milestones { id: 1 } }

const Missions = {
  D() { return MISSION_DATA; },
  def(id) { return MISSION_DATA.list.find((m) => m.id === id) || null; },
  inCat(cat) { return MISSION_DATA.list.filter((m) => m.cat === cat); },
  cat(id) { return MISSION_DATA.categories.find((c) => c.id === id) || null; },
  state(save, id) { return (save.missionStars || {})[id] || null; },
  stars(save, id) { const s = this.state(save, id); return s ? s.stars.reduce((a, b) => a + b, 0) : 0; },
  cleared(save, id) { const s = this.state(save, id); return !!(s && s.cleared); },
  clearedCount(save) { return MISSION_DATA.list.filter((m) => this.cleared(save, m.id)).length; },
  perfectCount(save) { return MISSION_DATA.list.filter((m) => this.stars(save, m.id) === 3).length; },
  totalStars(save) { return MISSION_DATA.list.reduce((a, m) => a + this.stars(save, m.id), 0); },
  reward(m) { return m.reward || MISSION_DATA.rewards[m.diff]; },

  // Categories open by missions cleared; inside one, each mission opens when the one before is cleared.
  catOpen(save, catId) { return this.clearedCount(save) >= this.cat(catId).opensAfter || !!(save.unlocks && save.unlocks.allMissions); },
  open(save, id) {
    const m = this.def(id);
    if (!m || !this.catOpen(save, m.cat)) return false;
    if (save.unlocks && save.unlocks.allMissions) return true;
    const list = this.inCat(m.cat), i = list.indexOf(m);
    return i === 0 || this.cleared(save, list[i - 1].id);
  },

  // ---- the preset players (MISSION_DATA.cast) ----
  // A match entity for a cast member in a slot, and its career-shaped object (techniques).
  castEntity(castId, side, slot) {
    const C = MISSION_DATA.cast[castId], S = PLAYER_DATA.stats, stats = {};
    const bat = C.role === 'bat' ? C.stat : 30, bowl = C.role === 'bowl' ? C.stat : 25;
    for (const k of S.batting) stats[k] = bat;
    for (const k of S.bowling) stats[k] = bowl;
    for (const k of S.shared) stats[k] = Math.round((C.stat + 50) / 2);
    for (const [k, v] of Object.entries(C.boost || {})) stats[k] = Math.min(99, stats[k] + v);
    const name = T('mis.cast.' + castId);
    const e = { id: side + slot, no: slot, name, short: MyXI._short(name), role: C.role, keeper: false, family: C.family || null, leftHanded: false, stats, cast: castId };
    const pc = this.castCareer(C, stats);
    if (pc) e.perks = SkillTree.mods(pc);
    e.overall = Teams.overall(e);
    return { e, pc };
  },
  castCareer(C, stats) {
    if (!C.tech || !C.tech.length) return null;
    const role = C.role === 'bat' ? 'batter' : C.role === 'bowl' ? 'bowler' : 'allrounder';
    const c = { seed: 0, stage: 'local', hooks: { coach: null }, phase: 'season',
      player: { role, archetype: null, level: 1, skillTokens: 0, stats: Object.assign({}, stats), equipment: {},
        tree: { v: 1, nodes: {}, granted: {}, free: {}, freeUsed: {}, spent: 0, respecs: 0, sources: { level: 0, promotion: 0, rival: 0 }, loadout: { active: [], passive: [] }, mastery: {} } } };
    for (const t of C.tech) {
      const node = SkillTree.techNode(t);
      if (node) c.player.tree.nodes[node.id] = 1;
      c.player.tree.loadout[SkillTree.slotOf(t)].push(t);
    }
    return c;
  },

  // ---- what happened (facts over the mission's balls) ----
  facts(ctx, inn) {
    const s = ctx.start, log = (inn.log || []).slice(s.log);
    const bat = ctx.m.side === 'bat';
    const f = { runs: inn.runs - s.runs, wktsLost: inn.wickets - s.wkts, wickets: inn.wickets - s.wkts, balls: inn.legal - s.legal,
      ballsLeft: inn.maxBalls - inn.legal, boundaries: 0, sixes: 0, fours: 0, perfect: 0, dots: 0, bestStreak: 0, extras: 0,
      bowled: 0, lbw: 0, caught: 0, runouts: 0, boundariesConceded: 0, runsConceded: inn.runs - s.runs, rivalOut: 0, techUsed: 0, heroRuns: 0 };
    let streak = 0;
    for (const e of log) {
      if (e.k !== 'l') f.extras++;
      if (e.x) { f.boundaries++; if (e.x === 6) f.sixes++; else f.fours++; }
      if (e.k === 'l' && e.r === 0) f.dots++;
      if (e.c === 'perfect') f.perfect++;
      if (e.o) { f[e.o] = (f[e.o] || 0) + 1; if (e.d && e.o !== 'runout') f['wk_' + e.d] = (f['wk_' + e.d] || 0) + 1; }
      if (e.k !== 'w') { streak = e.x && (!ctx.m.goal.sixes || e.x === 6) ? streak + 1 : 0; f.bestStreak = Math.max(f.bestStreak, streak); }
    }
    f.boundariesConceded = f.boundaries;
    if (bat) {
      const h = inn.bat(ctx.heroNo);
      f.heroRuns = h ? h.runs : 0;
      f.heroOut = h && h.out ? 1 : 0;
    }
    if (ctx.rivalNo) { const r = inn.bat(ctx.rivalNo); f.rivalOut = r && r.out ? 1 : 0; }
    f.techUsed = ctx.techUsed || 0;
    f.fields = ctx.fields || {};
    return f;
  },

  // The base objective. Returns 'won' | 'lost' | null (still going).
  // final: the innings is over (balls, wickets or target). Batting moments
  // (boundaries, a milestone) end the mission as soon as they happen; the bowling
  // goals play every ball, so the star objectives count the whole spell.
  judge(m, f, inn, final) {
    const g = m.goal, chased = !!(inn.target && inn.runs >= inn.target);
    switch (g.kind) {
      case 'runs': return chased ? 'won' : final ? 'lost' : null;
      case 'boundaries': return (g.consecutive ? f.bestStreak : g.sixes ? f.sixes : f.boundaries) >= g.n ? 'won' : final ? 'lost' : null;
      case 'survive': return final ? (inn.wickets < inn.maxWickets ? 'won' : 'lost') : null;
      case 'milestone': return f.heroRuns >= g.n ? 'won' : (final || f.heroOut) ? 'lost' : null;
      case 'defend': return final ? (chased ? 'lost' : 'won') : null;
      case 'wickets': return final ? (f.wickets >= g.n ? 'won' : 'lost') : null;
      case 'dots': return final ? (f.dots >= g.n ? 'won' : 'lost') : null;
      case 'dismiss': return final ? (f.rivalOut ? 'won' : 'lost') : null;
    }
    return final ? 'lost' : null;
  },
  starMet(st, f) {
    if (st.field) return !!(f.fields && f.fields[st.field]);
    const v = f[st.stat] || 0;
    return st.min !== undefined ? v >= st.min : v <= st.max;
  },

  // A finished attempt: stars (kept across attempts: the best of each), rewards once.
  // Returns { cleared, stars [3], got [3], newStars, first, perfect, rewards [], milestones [] }.
  record(save, m, cleared, f) {
    save.missionStars = save.missionStars || {};
    const prev = save.missionStars[m.id], st = prev ? JSON.parse(JSON.stringify(prev)) : { cleared: 0, stars: [0, 0, 0], plays: 0 };
    st.plays = (st.plays || 0) + 1;
    const got = m.stars.map((s) => (cleared && this.starMet(s, f) ? 1 : 0));
    const before = st.stars.reduce((a, b) => a + b, 0);
    if (cleared) { st.cleared = 1; st.stars = st.stars.map((v, i) => (v || got[i] ? 1 : 0)); }
    const out = { cleared, got, stars: st.stars.slice(), newStars: st.stars.reduce((a, b) => a + b, 0) - before, rewards: [], milestones: [] };
    const rw = this.reward(m);
    if (cleared && !st.firstPaid) { st.firstPaid = 1; out.first = true; out.rewards.push({ kind: 'first', reward: this.pay(save, rw.first) }); }
    if (st.stars.every((v) => v) && !st.perfectPaid) { st.perfectPaid = 1; out.perfect = true; out.rewards.push({ kind: 'perfect', reward: this.pay(save, rw.perfect) }); }
    save.missionStars[m.id] = st;
    const meta = save.missionMeta = save.missionMeta || { milestones: {} };
    const n = this.perfectCount(save);
    for (const ms of MISSION_DATA.milestones) {
      if (n >= ms.perfect && !meta.milestones[ms.id]) { meta.milestones[ms.id] = 1; out.milestones.push({ ms, reward: this.pay(save, ms.reward) }); }
    }
    return out;
  },
  // Pays a reward; an item you already own turns into coins. Returns what was paid.
  pay(save, r) {
    const out = Object.assign({}, r);
    if (r.item && Gear.owns(save, r.item)) { delete out.item; out.coins = (out.coins || 0) + MISSION_DATA.ownedItemCoins; }
    Challenge.pay(save, out);
    return out;
  },

  // For the achievements (Mission Master: 3 stars on 20 missions).
  accountFacts(save) { return { missionStars: this.perfectCount(save), missionsCleared: this.clearedCount(save) }; },
};

// ---- the match glue: a mission is a real match started at a preset moment ----
const MissionMatch = {
  on: false,
  m: null,
  ctx: null,       // { m, start {runs, wkts, legal, log}, heroNo, rivalNo, attack [ids], fields {}, techUsed }

  // Build the match and return the scene to go to.
  start(id) {
    const m = Missions.def(id);
    this.tries = this.m === m ? (this.tries || 0) + 1 : 1;      // each try bowls different balls
    this.on = true; this.m = m;
    CareerMatch.on = false;
    if (typeof MyXIMatch !== 'undefined') MyXIMatch.on = false;
    Tech.end();
    Save.clearResume();
    const seed = this._seed(m.id, this.tries);
    const ctx = this.ctx = { m, fields: {}, techUsed: 0, owners: [] };
    Match.start(m.fmt, {
      seed,
      teams: () => this.teams(m, ctx),
      cond: (cr) => ({ stadium: STADIUM_DATA.defaultStadium, pitch: (m.cond && m.cond.pitch) || 'balanced', weather: (m.cond && m.cond.weather) || 'clear' }),
    });
    const bat = m.side === 'bat';
    Match.toss = { winner: 'player', coin: 'heads', choice: m.side, firstBatting: bat ? 'player' : 'ai' };
    Match.mainBattedFirst = Match.toss.firstBatting;
    const inn = this._innings(m, ctx);
    Match.innings = [inn];
    Tech.beginMany(ctx.owners);
    ctx.start = { runs: inn.runs, wkts: inn.wickets, legal: inn.legal, log: 0 };
    Log.add('mission', `${m.id} ${m.side} at ${inn.overs} ${inn.runs}/${inn.wickets}${inn.target ? ' target ' + inn.target : ''} seed ${seed}`);
    return bat ? 'matchbat' : 'matchbowl';
  },
  _seed(id, n) { let h = 2166136261; for (const ch of id + ':' + n) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h % 999999937; },

  // Both sides: generated XIs at the mission's levels, the preset players dropped in.
  teams(m, ctx) {
    const rng = RNG.stream('teams'), O = m.opp || {};
    const player = Teams.generate({ side: 'player', rating: 60, rng });
    const ai = Teams.generate({ side: 'ai', rating: O.rating || 60, rng });
    player.name = T('mis.teamYou'); ai.name = T('mis.teamThem');
    const put = (team, side, slot, castId) => {
      const { e, pc } = Missions.castEntity(castId, side, slot);
      team.players[slot - 1] = e;
      if (pc) ctx.owners.push({ pid: e.id, c: pc });
      return e;
    };
    if (m.side === 'bat') {
      const striker = m.at.wkts + 1;
      ctx.heroNo = striker;
      put(player, 'player', striker, m.hero);
      if (m.partner) put(player, 'player', striker + 1, m.partner);
      // Their attack: one bowler per over, in the listed families (or the rival).
      const slots = [11, 10, 9, 8, 7, 6];
      if (O.rival) Rivals.inject(ai, O.rival);
      const rivalId = O.rival ? ai.players[Rivals.rival(O.rival).slot - 1].id : null;
      ctx.attack = [];
      let k = 0;
      for (const fam of O.attack || ['fast']) {
        if (fam === 'rival') { ctx.attack.push(rivalId); continue; }
        let p = ai.players.find((x) => x.family === fam && x.id !== rivalId && !ctx.attack.includes(x.id) && !x._mis);
        if (!p) { while (ai.players[slots[k] - 1].id === rivalId) k++; p = ai.players[slots[k++] - 1]; p.family = fam; }
        p._mis = true;
        for (const s of PLAYER_DATA.stats.bowling) p.stats[s] = O.bowl || O.rating || 60;
        ctx.attack.push(p.id);
      }
      for (const id of ctx.attack) {
        const p = ai.players.find((x) => x.id === id);
        for (const [s, v] of Object.entries(O.boost || {})) if (p.stats[s] !== undefined) p.stats[s] = Math.min(99, p.stats[s] + v);
        p.overall = Teams.overall(p);
      }
    } else {
      // You bowl: only your preset bowlers can bowl; their batters at the mission's level.
      for (const p of player.players) p.family = null;
      m.bowlers.forEach((castId, i) => put(player, 'player', 11 - i, castId));
      for (const p of ai.players) for (const [s, v] of Object.entries(O.boost || {})) if (p.stats[s] !== undefined) p.stats[s] = Math.min(99, p.stats[s] + v);
      if (O.rival) { Rivals.inject(ai, O.rival); ctx.rivalNo = Rivals.rival(O.rival).slot; }
    }
    return { player, ai };
  },

  // The innings, already under way: the score, wickets, strike and the overs gone.
  _innings(m, ctx) {
    const bat = m.side === 'bat', fmt = Match.fmt;
    const inn = new Innings({ index: 0, battingSide: bat ? 'player' : 'ai', overs: fmt.overs, wickets: 10, target: null, isSuper: !!m.super });
    const legal = m.at.over * 6 + m.at.ball;
    inn.legal = legal; inn.runs = m.at.runs; inn.wickets = m.at.wkts;
    inn.maxBalls = legal + m.balls;
    inn.maxWickets = m.at.wkts + (m.wkts || (10 - m.at.wkts));
    if (m.target) inn.target = m.at.runs + m.target;
    for (let i = 0; i < m.at.wkts; i++) { inn.batters[i].out = 'caught'; inn.batters[i].balls = 6 + i * 3; inn.batters[i].runs = Math.round(m.at.runs / (m.at.wkts + 2)); }
    inn.striker = m.at.wkts + 1; inn.nonStriker = m.at.wkts + 2; inn.nextBatter = m.at.wkts + 3;
    if (m.heroOn) Object.assign(inn.bat(inn.striker), { runs: m.heroOn.runs, balls: m.heroOn.balls });
    // The overs already bowled (nobody you'll meet): placeholders keep the over limits right.
    for (let o = 0; o < Math.floor(legal / 6); o++) inn.overBowlers.push('-');
    if (legal % 6) {
      // Mid-over: this over's bowler is already on.
      inn.overBowlers.push(bat ? ctx.attack[0] : 'player' + 11);
      inn.field = 'balanced';
    }
    return inn;
  },

  // Their bowler for the next over (you bat): the mission's attack, in order.
  aiBowler(inn) {
    const ctx = this.ctx, done = Math.floor((inn.legal - ctx.start.legal + (ctx.start.legal % 6)) / 6);
    const id = ctx.attack[done % ctx.attack.length];
    return Match.team('ai').players.find((p) => p.id === id) || null;
  },
  // Timing windows / release bands by the mission's difficulty.
  windowK() { return this.on ? Challenge.diff(this.m.diff).window : 1; },
  // A field setting used this over (field star objectives).
  noteField(id) { if (this.on && id) this.ctx.fields[id] = true; },
  noteTech() { if (this.on) this.ctx.techUsed++; },

  // After every ball: has the mission been decided? Ends the innings if so.
  afterBall(inn) {
    if (!this.on) return null;
    const f = Missions.facts(this.ctx, inn), res = Missions.judge(this.m, f, inn, inn.ended);
    if (res && !inn.ended) { inn.ended = true; inn.endReason = 'mission'; }
    this.ctx.result = res;
    return res;
  },
  // The end: stars and rewards. Returns the result screen's data.
  finish(save) {
    const inn = Match.current(), f = Missions.facts(this.ctx, inn);
    const res = Missions.judge(this.m, f, inn, true) || 'lost';
    const out = Missions.record(save, this.m, res === 'won', f);
    out.id = this.m.id; out.facts = f;
    out.score = inn.runs + '/' + inn.wickets + ' (' + inn.overs + ')';
    out.achievements = Achievements.checkAccount(save, null);
    this.leave();
    Save.write();
    return out;
  },
  leave() { this.on = false; Tech.end(); Fielding.clear(); },

  // ---- a scripted run (tests and the developer panel): the "perfect" answer to the
  // mission — plays every ball as the best outcome for its goal and stars.
  scriptWin() {
    const m = this.m, ctx = this.ctx;
    const need = (st) => m.stars.find((s) => s.stat === st);
    for (let guard = 0; guard < 60; guard++) {
      const inn = Match.current();
      if (inn.ended) break;
      if (Match.needsBowler(inn)) {
        const team = Match.team(inn.bowlingSide);
        const bw = m.side === 'bat' ? this.aiBowler(inn) : BowlerRules.aiPick(inn, team, Match.fatigue, RNG.stream('aiPick:0'));
        const field = (m.stars.find((s) => s.field) || {}).field || 'balanced';
        Match.setBowler(inn, bw.id, field);
        if (m.side === 'bowl') this.noteField(field);
      }
      if (need('techUsed') && !ctx.techUsed) this.noteTech();
      let b;
      if (m.side === 'bat') {
        const fours = need('fours'), f0 = Missions.facts(ctx, inn);
        b = { kind: 'legal', boundary: fours && f0.fours < fours.min ? 4 : 6, contact: 'perfect' };
      }
      else {
        // Dot balls first while a dot-ball goal / star still needs them (and there are
        // balls to spare for the wickets still wanted), then wickets.
        const f0 = Missions.facts(ctx, inn), wd = m.stars.find((s) => s.stat && s.stat.startsWith('wk_'));
        const dotsWanted = Math.max(m.goal.kind === 'dots' ? m.goal.n : 0, (need('dots') && need('dots').min) || 0);
        const wktsWanted = Math.max(m.goal.kind === 'wickets' ? m.goal.n : 0, (need('wickets') && need('wickets').min) || 0,
          ((need('bowled') || {}).min || 0) + ((need('lbw') || {}).min || 0) + ((need('caught') || {}).min || 0),
          m.goal.kind === 'dismiss' || need('rivalOut') || wd ? 1 : 0) - f0.wickets;
        const want = need('lbw') && !f0.lbw ? 'lbw' : need('caught') && !f0.caught ? 'caught' : 'bowled';
        const dot = f0.dots < dotsWanted && inn.maxBalls - inn.legal > Math.max(0, wktsWanted);
        b = dot ? { kind: 'legal' } : { kind: 'legal', wicket: want, dtype: wd ? wd.stat.slice(3) : null };
        // dismiss the rival: make sure he's on strike
        if (ctx.rivalNo && inn.bat(ctx.rivalNo) && !inn.bat(ctx.rivalNo).out && inn.striker !== ctx.rivalNo) { inn.nonStriker = inn.striker; inn.striker = ctx.rivalNo; }
      }
      const res = inn.apply(b);
      if (res.overDone || inn.ended) Match.overDone(inn);
      this.afterBall(inn);
    }
    return this.finish(Save.data);
  },
};
