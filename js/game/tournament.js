// Cricket Arcade — career tournaments (M08 Stage 4, M09 Stage 7; plan 8.6, 5.5G).
// Pure: no drawing. Two formats (CAREER_DATA.franchise / CAREER_DATA.world):
//   franchise  16 franchises, 4 groups of 4, group winners -> semi-finals -> final
//   world      12 nations (the World Nations Championship), 4 groups of 3,
//              top two -> quarter-finals -> semi-finals -> final
// Every group is a round robin; you play your group's matches for real and
// everyone else's are quick, seeded results from the career's own stream.
//
// Saved on the career as c.tour:
//   fmt      'franchise' | 'world'
//   groups   [[team id …] × 4]   (your side is first in its group)
//   mine / myGroup
//   results  [{ round: 'g1'|'g2'|'g3'|'quarter'|'semi'|'final', a, b, ra, rb, ba, bb, winner }]
//   bracket  { quarter?: [[a, b] …], semi: [[a, b], [a, b]], final: [[a, b]] } (filled as it goes)
//   phase    'group' | 'quarter' | 'semi' | 'final' | 'done'
//   best     how far you got: 'group' | 'quarter' | 'semi' | 'final' | 'champion'

const Tournament = {
  REACH: ['group', 'quarter', 'semi', 'final', 'champion'],
  // Round robins by group size (indices; your side is index 0).
  ROUNDS: {
    4: [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]],
    3: [[[0, 1]], [[0, 2]], [[1, 2]]],
  },
  fmt(tour) { return (tour && tour.fmt) || 'franchise'; },
  F(fmt) { return fmt === 'world' ? CAREER_DATA.world : CAREER_DATA.franchise; },
  // A side in either competition (franchise ids and origin ids never clash).
  team(id) { return CAREER_DATA.franchise.teams.find((t) => t.id === id) || CAREER_DATA.world.teams.find((t) => t.id === id) || null; },
  isNation(id) { return !!CAREER_DATA.world.teams.find((t) => t.id === id); },
  name(id) { return this.isNation(id) ? ORIGIN_PACKS.origins[id].pathwayLabels[5] : T('franchise.' + id); },
  crest(id) { return this.isNation(id) ? 'badge_' + id : this.team(id).crest; },
  opp(id, final) {
    const t = this.team(id);
    return { name: this.name(id), franchise: id, colours: t.colours.slice(), crest: { image: this.crest(id), colours: t.colours.slice() }, rating: t.rating, final: !!final };
  },

  // A new tournament for this career's side.
  create(c, mine, fmt) {
    fmt = fmt || 'franchise';
    const F = this.F(fmt), ids = F.teams.map((t) => t.id).filter((id) => id !== mine);
    const groups = Career.roll(c, (r) => {
      for (let i = ids.length - 1; i > 0; i--) { const j = r.int(0, i); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      const g = [], myGroup = r.int(0, F.groups - 1);
      let k = 0;
      for (let gi = 0; gi < F.groups; gi++) {
        const row = gi === myGroup ? [mine] : [];
        while (row.length < F.perGroup) row.push(ids[k++]);
        g.push(row);
      }
      return g;
    });
    c.tour = { fmt, groups, mine, myGroup: groups.findIndex((g) => g[0] === mine), results: [], bracket: {}, phase: 'group', best: 'group' };
    return c.tour;
  },
  rounds(tour) { return this.ROUNDS[this.F(this.fmt(tour)).perGroup]; },
  // The group rounds you play in, and your opponent in each.
  myRounds(tour) { return this.rounds(tour).map((rd, i) => ({ i, m: rd.find((p) => p.includes(0)) })).filter((x) => x.m); },
  myOpponents(tour) { const g = tour.groups[tour.myGroup]; return this.myRounds(tour).map((x) => g[x.m[0] === 0 ? x.m[1] : x.m[0]]); },

  // A quick seeded result between two sides (never a tie).
  quick(c, a, b, round) {
    const S = this.F(this.fmt(c.tour)).simRuns, ta = this.team(a), tb = this.team(b);
    return Career.roll(c, (r) => {
      let ra = Math.round(S.base + r.range(-S.spread, S.spread) + (ta.rating - tb.rating) * S.perRating);
      let rb = Math.round(S.base + r.range(-S.spread, S.spread) + (tb.rating - ta.rating) * S.perRating);
      if (ra === rb) { if (ta.rating >= tb.rating) ra++; else rb++; }
      const balls = 30;
      return { round, a, b, ra, rb, ba: balls, bb: rb > ra ? Math.max(12, balls - r.int(0, 10)) : balls, winner: ra > rb ? a : b };
    });
  },

  // Group table rows, best first: { id, p, w, l, pts, rf, bf, rc, bc, nrr }.
  standings(tour, gi) {
    const rows = {}, win = this.F(this.fmt(tour)).pointsWin;
    for (const id of tour.groups[gi]) rows[id] = { id, p: 0, w: 0, l: 0, pts: 0, rf: 0, bf: 0, rc: 0, bc: 0, nrr: 0 };
    for (const m of tour.results) {
      if (!/^g/.test(m.round) || !rows[m.a] || !rows[m.b]) continue;
      const A = rows[m.a], B = rows[m.b];
      A.p++; B.p++;
      A.rf += m.ra; A.bf += m.ba; A.rc += m.rb; A.bc += m.bb;
      B.rf += m.rb; B.bf += m.bb; B.rc += m.ra; B.bc += m.ba;
      const W = m.winner === m.a ? A : B, L = W === A ? B : A;
      W.w++; W.pts += win; L.l++;
    }
    for (const x of Object.values(rows)) x.nrr = (x.bf ? x.rf / x.bf * 6 : 0) - (x.bc ? x.rc / x.bc * 6 : 0);
    const order = tour.groups[gi];
    return Object.values(rows).sort((p, q) => q.pts - p.pts || q.nrr - p.nrr || order.indexOf(p.id) - order.indexOf(q.id));
  },
  winner(tour, gi) { return this.standings(tour, gi)[0].id; },
  groupsDone(tour) {
    const per = this.rounds(tour).reduce((n, rd) => n + rd.length, 0);
    return tour.results.filter((m) => /^g/.test(m.round)).length >= per * tour.groups.length;
  },
  // Knockout pairings once the groups are done.
  //   franchise: A1 v B1, C1 v D1 (semis).   world: A1 v B2, B1 v A2, C1 v D2, D1 v C2 (quarters).
  firstKnockout(tour) {
    const top = (gi, k) => this.standings(tour, gi)[k].id;
    if (this.fmt(tour) === 'world') return { round: 'quarter', pairs: [[top(0, 0), top(1, 1)], [top(1, 0), top(0, 1)], [top(2, 0), top(3, 1)], [top(3, 0), top(2, 1)]] };
    return { round: 'semi', pairs: [[top(0, 0), top(1, 0)], [top(2, 0), top(3, 0)]] };
  },
  nextRound(round) { return { quarter: 'semi', semi: 'final' }[round] || null; },
  result(tour, round, id) { return tour.results.find((m) => m.round === round && (m.a === id || m.b === id)) || null; },

  // After one of your tournament matches: record it, play everyone else's
  // matches for that round, and move on. Returns the next fixture to add
  // ({ kind, round, opp }) or null (you're out, or it's over).
  // mine: { won, runs, balls, oppRuns, oppBalls }
  afterMatch(c, kind, round, oppId, mine) {
    const tour = c.tour, me = tour.mine;
    tour.results.push({ round, a: me, b: oppId, ra: mine.runs, rb: mine.oppRuns, ba: mine.balls || 30, bb: mine.oppBalls || 30, winner: mine.won ? me : oppId });
    if (kind === 'group') {
      const ri = Number(round.slice(1)) - 1, R = this.rounds(tour);
      const simRound = (i) => tour.groups.forEach((g, gi) => {
        for (const [x, y] of R[i]) if (!(gi === tour.myGroup && (x === 0 || y === 0))) tour.results.push(this.quick(c, g[x], g[y], 'g' + (i + 1)));
      });
      simRound(ri);
      const nextMine = this.myRounds(tour).find((x) => x.i > ri);
      if (nextMine) {
        for (let i = ri + 1; i < nextMine.i; i++) simRound(i);          // rounds you sit out
        const g = tour.groups[tour.myGroup];
        return { kind: 'group', round: 'g' + (nextMine.i + 1), opp: g[nextMine.m[0] === 0 ? nextMine.m[1] : nextMine.m[0]] };
      }
      for (let i = ri + 1; i < R.length; i++) simRound(i);
      const ko = this.firstKnockout(tour);
      tour.bracket[ko.round] = ko.pairs;
      return this._enterRound(c, ko.round);
    }
    // a knockout round: the other ties of that round, then the next round
    for (const [a, b] of tour.bracket[round] || []) if (a !== me && b !== me) tour.results.push(this.quick(c, a, b, round));
    if (!mine.won) { this._playOut(c, round); return null; }
    if (round === 'final') { tour.best = 'champion'; tour.phase = 'done'; return null; }
    const nx = this.nextRound(round);
    tour.bracket[nx] = this._pairWinners(tour, round);
    return this._enterRound(c, nx);
  },
  _pairWinners(tour, round) {
    const w = (tour.bracket[round] || []).map(([a, b]) => { const m = tour.results.find((x) => x.round === round && ((x.a === a && x.b === b) || (x.a === b && x.b === a))); return m ? m.winner : null; });
    const out = [];
    for (let i = 0; i < w.length; i += 2) out.push([w[i], w[i + 1]]);
    return out;
  },
  // You're in round 'round' if you're in its pairings; otherwise it all plays out.
  _enterRound(c, round) {
    const tour = c.tour, me = tour.mine, pair = tour.bracket[round].find((p) => p.includes(me));
    if (!pair) { this._playOut(c, null, round); return null; }
    tour.phase = round;
    if (this.REACH.indexOf(round) > this.REACH.indexOf(tour.best)) tour.best = round;
    return { kind: round, round, opp: pair[0] === me ? pair[1] : pair[0] };
  },
  // You're out: every remaining knockout plays out quickly. (from: the round
  // you just lost, already recorded; start: a round to play from scratch)
  _playOut(c, from, start) {
    const tour = c.tour;
    let round = from ? this.nextRound(from) : start;
    if (from) { if (!round) { tour.phase = 'done'; return; } tour.bracket[round] = this._pairWinners(tour, from); }
    while (round) {
      for (const [a, b] of tour.bracket[round]) if (!this.result(tour, round, a)) tour.results.push(this.quick(c, a, b, round));
      const nx = this.nextRound(round);
      if (nx) tour.bracket[nx] = this._pairWinners(tour, round);
      round = nx;
    }
    tour.phase = 'done';
  },
  // The champion (once it's over).
  champion(tour) { const f = tour.results.find((m) => m.round === 'final'); return f ? f.winner : null; },
  reached(tour, what) { return !!tour && this.REACH.indexOf(tour.best) >= this.REACH.indexOf(what); },
};
