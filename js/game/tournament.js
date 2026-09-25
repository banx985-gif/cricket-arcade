// Cricket Arcade — the Global Franchise tournament (M08, plan 8.6 Stage 4, 5.5G).
// Pure: no drawing. 16 franchises in 4 groups of 4; every group plays a round
// robin (3 rounds); group winners go to the semi-finals (A v B, C v D); then the
// final. You play your group's matches for real; everyone else's are quick,
// seeded results from the career's own stream.
//
// Saved on the career as c.tour:
//   groups   [[franchise id × 4] × 4]   (your franchise is first in its group)
//   mine / myGroup                      your franchise, its group index
//   results  [{ round: 'g1'|'g2'|'g3'|'semi'|'final', a, b, ra, rb, ba, bb, winner }]
//            (ra / rb runs, ba / bb balls faced — for net run rate)
//   phase    'group' | 'semi' | 'final' | 'done'
//   best     how far you got: 'group' | 'semi' | 'final' | 'champion'

const Tournament = {
  F() { return CAREER_DATA.franchise; },
  team(id) { return CAREER_DATA.franchise.teams.find((t) => t.id === id) || null; },
  name(id) { return T('franchise.' + id); },
  // Round robin for a group of 4 (indices): round -> [[a, b], [a, b]].
  ROUNDS: [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]],
  REACH: ['group', 'semi', 'final', 'champion'],

  // A new tournament for this career's franchise.
  create(c, mine) {
    const F = this.F(), ids = F.teams.map((t) => t.id).filter((id) => id !== mine);
    const groups = Career.roll(c, (r) => {
      for (let i = ids.length - 1; i > 0; i--) { const j = r.int(0, i); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      const g = [];
      const myGroup = r.int(0, F.groups - 1);
      let k = 0;
      for (let gi = 0; gi < F.groups; gi++) {
        const row = gi === myGroup ? [mine] : [];
        while (row.length < F.perGroup) row.push(ids[k++]);
        g.push(row);
      }
      return g;
    });
    const myGroup = groups.findIndex((g) => g[0] === mine);
    c.tour = { groups, mine, myGroup, results: [], phase: 'group', best: 'group' };
    return c.tour;
  },

  // Your group opponents in round order.
  myOpponents(tour) { const g = tour.groups[tour.myGroup]; return this.ROUNDS.map((rd) => g[rd[0][1]]); },

  // A quick seeded result between two franchises (never a tie).
  quick(c, a, b, round) {
    const S = this.F().simRuns, ta = this.team(a), tb = this.team(b);
    return Career.roll(c, (r) => {
      let ra = Math.round(S.base + r.range(-S.spread, S.spread) + (ta.rating - tb.rating) * S.perRating);
      let rb = Math.round(S.base + r.range(-S.spread, S.spread) + (tb.rating - ta.rating) * S.perRating);
      if (ra === rb) { if (ta.rating >= tb.rating) ra++; else rb++; }
      const balls = 30;
      return { round, a, b, ra, rb, ba: balls, bb: rb > ra ? Math.max(12, balls - r.int(0, 10)) : balls, winner: ra > rb ? a : b };
    });
  },

  // Group table rows, best first: { id, p, w, l, pts, rf, bf, ra, bb, nrr }.
  standings(tour, gi) {
    const rows = {};
    for (const id of tour.groups[gi]) rows[id] = { id, p: 0, w: 0, l: 0, pts: 0, rf: 0, bf: 0, rc: 0, bc: 0, nrr: 0 };
    for (const m of tour.results) {
      if (!/^g/.test(m.round) || !rows[m.a] || !rows[m.b]) continue;
      const A = rows[m.a], B = rows[m.b];
      A.p++; B.p++;
      A.rf += m.ra; A.bf += m.ba; A.rc += m.rb; A.bc += m.bb;
      B.rf += m.rb; B.bf += m.bb; B.rc += m.ra; B.bc += m.ba;
      const W = m.winner === m.a ? A : B, L = W === A ? B : A;
      W.w++; W.pts += this.F().pointsWin; L.l++;
    }
    for (const x of Object.values(rows)) x.nrr = (x.bf ? x.rf / x.bf * 6 : 0) - (x.bc ? x.rc / x.bc * 6 : 0);
    const order = tour.groups[gi];
    return Object.values(rows).sort((p, q) => q.pts - p.pts || q.nrr - p.nrr || order.indexOf(p.id) - order.indexOf(q.id));
  },
  winner(tour, gi) { return this.standings(tour, gi)[0].id; },
  semiPairs() { return [[0, 1], [2, 3]]; },
  result(tour, round, id) { return tour.results.find((m) => m.round === round && (m.a === id || m.b === id)) || null; },

  // The fixture opponent record for a franchise (Career fixtures use these).
  opp(id, final) { const t = this.team(id); return { name: this.name(id), franchise: id, colours: t.colours.slice(), crest: { image: t.crest, colours: t.colours.slice() }, rating: t.rating, final: !!final }; },

  // After one of your tournament matches: record it, play everyone else's
  // matches for that round, and move the tournament on. Returns the next
  // fixture to add ({ kind, opp }) or null (you're out, or it's over).
  // mine: { won, runs, balls, oppRuns, oppBalls }
  afterMatch(c, kind, round, oppId, mine) {
    const tour = c.tour;
    const me = tour.mine;
    tour.results.push({ round, a: me, b: oppId, ra: mine.runs, rb: mine.oppRuns, ba: mine.balls || 30, bb: mine.oppBalls || 30, winner: mine.won ? me : oppId });
    if (kind === 'group') {
      const ri = Number(round.slice(1)) - 1;
      // the other group matches of this round
      tour.groups.forEach((g, gi) => {
        for (const [x, y] of this.ROUNDS[ri]) if (!(gi === tour.myGroup && x === 0)) tour.results.push(this.quick(c, g[x], g[y], round));
      });
      if (ri < 2) return { kind: 'group', round: 'g' + (ri + 2), opp: this.myOpponents(tour)[ri + 1] };
      // groups done
      if (this.winner(tour, tour.myGroup) === me) {
        tour.phase = 'semi'; tour.best = 'semi';
        const other = this.winner(tour, tour.myGroup ^ 1);
        return { kind: 'semi', round: 'semi', opp: other };
      }
      this._finishWithout(c);
      return null;
    }
    if (kind === 'semi') {
      const [p, q] = this.semiPairs().find((s) => !s.includes(tour.myGroup));
      const s2 = this.quick(c, this.winner(tour, p), this.winner(tour, q), 'semi');
      tour.results.push(s2);
      if (mine.won) { tour.phase = 'final'; tour.best = 'final'; return { kind: 'final', round: 'final', opp: s2.winner }; }
      tour.results.push(this.quick(c, oppId, s2.winner, 'final'));      // the side that beat you plays the final
      tour.phase = 'done';
      return null;
    }
    // the final
    if (mine.won) tour.best = 'champion';
    tour.phase = 'done';
    return null;
  },
  // Knocked out in the groups: the rest of the tournament plays out quickly.
  _finishWithout(c) {
    const tour = c.tour, w = [0, 1, 2, 3].map((gi) => this.winner(tour, gi));
    const s1 = this.quick(c, w[0], w[1], 'semi'), s2 = this.quick(c, w[2], w[3], 'semi');
    tour.results.push(s1, s2, this.quick(c, s1.winner, s2.winner, 'final'));
    tour.phase = 'done';
  },
  // The champion (once it's over).
  champion(tour) { const f = tour.results.find((m) => m.round === 'final'); return f ? f.winner : null; },
  reached(tour, what) { return !!tour && this.REACH.indexOf(tour.best) >= this.REACH.indexOf(what); },
};
