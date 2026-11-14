// Cricket Legends (M17 Job 3) - season goals.
// At the start of each career stage the player picks 3 of 6 goals (runs, strike rate, wickets,
// economy, catches, boundaries). Targets come from the player's stats against the stage's opposition
// and the number of matches. Each goal pays Coins (more in later stages); all three pay a bonus.
// Totals (runs, wickets, catches, boundaries) pay the moment they're reached; the two rates
// (strike rate, economy) are judged when the stage ends (promotion, or the career complete).
// Numbers: CAREER_DATA.seasonGoals. State: c.goals = { stage, offer, picked, have, done, paid, bonus, closed }.

const SeasonGoals = {
  D() { return CAREER_DATA.seasonGoals; },
  isRate(id) { return this.D().rateGoals.includes(id); },
  can(c, id) {
    if (this.D().needsBowling.includes(id) && !Career.bowls(c)) return false;
    if (this.D().needsBatting.includes(id) && c.player.role === 'bowler') return false;
    return true;
  },
  // Where you field this ball (the field preset in use): a catch there is yours.
  fieldPos() {
    const ids = typeof Fielding !== 'undefined' && Fielding.preset ? Fielding.preset.positions.map((p) => p[0]) : BATTING_DATA.field.positions.map((p) => p.id);
    return this.D().fieldAt.find((id) => ids.includes(id)) || 'cover';
  },
  // Where you field this ball (the field preset in use): a catch there is yours.
  fieldPos() {
    const ids = typeof Fielding !== 'undefined' && Fielding.preset ? Fielding.preset.positions.map((p) => p[0]) : BATTING_DATA.field.positions.map((p) => p.id);
    return this.D().fieldAt.find((id) => ids.includes(id)) || 'cover';
  },

  // How hard: the player's stats against this stage's opposition.
  mult(c, id) {
    const G = this.D(), S = Career.stage(c);
    const me = { stats: Career.effectiveStats(c) };
    const bowl = ['wickets', 'economy'].includes(id);
    const mine = id === 'catches' ? me.stats.fielding : bowl ? Teams.bowlRating(me) : Teams.batRating(me);
    const opp = S.opponentRating ? (S.opponentRating[0] + S.opponentRating[1]) / 2 : S.teamRating;
    return Math.max(G.multClamp[0], Math.min(G.multClamp[1], 1 + (mine - opp) * G.gapK));
  },
  target(c, id) {
    const G = this.D(), S = Career.stage(c), m = this.mult(c, id);
    const r = (v, step) => Math.round(v / step) * step;
    if (id === 'strikeRate') return Math.max(G.rateClamp.strikeRate[0], Math.min(G.rateClamp.strikeRate[1], r(G.rate.strikeRate * m, G.round.strikeRate)));
    if (id === 'economy') return Math.max(G.rateClamp.economy[0], Math.min(G.rateClamp.economy[1], r(G.rate.economy / m, G.round.economy)));
    const v = G.perMatch[id] * S.matches * m;
    return Math.max(G.minimum[id], id === 'runs' ? r(v, G.round.runs) : Math.round(v));
  },
  // (by the goals' own stage: after a promotion c.stage is already the next one)
  coins(c) {
    const G = this.D(), id = c.goals ? c.goals.stage : c.stage, S = CAREER_DATA.stages.find((s) => s.id === id) || Career.stage(c);
    return G.coins[Math.min(G.coins.length, S.n) - 1];
  },
  bonusCoins(c) { return Math.round(this.coins(c) * this.D().bonusK); },

  // ---- the stage's goals ----
  // Make the offer for the current stage (once per stage). Returns c.goals.
  ensure(c) {
    if (!c || c.phase !== 'season') return c && c.goals;
    if (!c.goals || c.goals.stage !== c.stage) {
      const offer = this.D().ids.map((id) => ({ id, target: this.target(c, id), ok: this.can(c, id) }));
      c.goals = { stage: c.stage, offer, picked: null, have: { runs: 0, balls: 0, fours: 0, sixes: 0, wkts: 0, bowlBalls: 0, bowlRuns: 0, catches: 0 },
        done: {}, paid: {}, bonus: 0, closed: false };
    }
    return c.goals;
  },
  // Career Home opens the picking screen when this is true.
  needsPick(c) { const g = this.ensure(c); return !!(g && !g.picked && !g.closed); },
  choose(c, ids) {
    const g = this.ensure(c), G = this.D();
    const ok = ids.length === G.pick && new Set(ids).size === G.pick && ids.every((id) => g.offer.some((o) => o.id === id && o.ok));
    if (!ok) return false;
    g.picked = ids.slice();
    return true;
  },
  goal(g, id) { return g.offer.find((o) => o.id === id); },

  // Where a goal stands: { id, target, value, done, ok (on track), shown (text-ready numbers) }.
  progress(c, id) {
    const g = c.goals, G = this.D(), h = g.have, o = this.goal(g, id);
    let value;
    if (id === 'runs') value = h.runs;
    else if (id === 'boundaries') value = h.fours + h.sixes;
    else if (id === 'wickets') value = h.wkts;
    else if (id === 'catches') value = h.catches;
    else if (id === 'strikeRate') value = h.balls ? Math.round(h.runs / h.balls * 100) : 0;
    else if (id === 'economy') value = h.bowlBalls ? Math.round(h.bowlRuns / h.bowlBalls * 6 * 10) / 10 : 0;
    const enough = id === 'strikeRate' ? h.balls >= G.minBalls.strikeRate : id === 'economy' ? h.bowlBalls >= G.minBalls.economy : true;
    const met = enough && (id === 'economy' ? value <= o.target : value >= o.target);
    return { id, target: o.target, value, enough, onTrack: met, done: !!g.done[id], frac: id === 'economy' ? (met ? 1 : enough ? Math.min(1, o.target / Math.max(0.1, value)) : h.bowlBalls / G.minBalls.economy * 0.5)
      : Math.min(1, value / o.target) };
  },
  all(c) { const g = c.goals; return g && g.picked ? g.picked.map((id) => this.progress(c, id)) : []; },
  doneCount(c) { const g = c.goals; return g && g.picked ? g.picked.filter((id) => g.done[id]).length : 0; },

  // After a career match (CareerMatch.finish): add what you did, pay goals reached.
  // stageId = the stage the match was played in; endStage = it was the stage's last match.
  // Returns { list: [progress...], paid: [{ id, coins }], bonus, coins } (coins = total paid now).
  afterMatch(c, perf, stageId, endStage) {
    const g = c.goals, out = { list: [], paid: [], bonus: 0, coins: 0 };
    if (!g || g.stage !== stageId || !g.picked || g.closed) return out;
    const h = g.have;
    h.runs += perf.bat.runs || 0; h.balls += perf.bat.balls || 0; h.fours += perf.bat.fours || 0; h.sixes += perf.bat.sixes || 0;
    h.wkts += perf.bowl.wkts || 0; h.bowlBalls += perf.bowl.balls || 0; h.bowlRuns += perf.bowl.runs || 0; h.catches += perf.catches || 0;
    const pay = (id) => { g.done[id] = true; g.paid[id] = this.coins(c); out.paid.push({ id, coins: g.paid[id] }); out.coins += g.paid[id]; };
    for (const id of g.picked) {
      if (g.done[id]) continue;
      const p = this.progress(c, id);
      if (p.onTrack && (!this.isRate(id) || endStage)) pay(id);
    }
    if (endStage) g.closed = true;
    if (!g.bonus && g.picked.every((id) => g.done[id])) { g.bonus = this.bonusCoins(c); out.bonus = g.bonus; out.coins += g.bonus; }
    out.list = this.all(c);
    return out;
  },

  // Text helpers (strings: goals.*).
  label(id) { return T('goals.' + id); },
  targetText(id, target) { return T('goals.' + id + '.target', { n: target }); },
  valueText(p) {
    if (p.id === 'strikeRate' || p.id === 'economy') return p.enough ? T('goals.rateNow', { v: p.value, t: p.target }) : T('goals.rateWait');
    return T('goals.count', { v: Math.min(p.value, p.target), t: p.target });
  },
};
