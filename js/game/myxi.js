// Cricket Arcade — My XI rules (M10, plan 15). Pure except for the match glue at
// the bottom (MyXIMatch), which drives the real match engine. Data in MYXI_DATA.
//
// Saved in the global save as save.myXI:
//   name, colours [2], crest { shield, emblem, colours } | { image }, stadium, created
//   library   [entry]   every owned player (never deleted). An entry is
//             { id, kind: 'legacy'|'rival'|'starter'|'recruit', ref? , …record }
//             Legacy entries only point at the frozen Hall of Fame snapshot (ref).
//   active    [id]  the Active Squad (max 15)
//   lineup    { order [11 ids], keeper, captain, powerHitter, closer, bowlers [ids] }
//   comps     compId -> { cleared, played, won }
//   run       the competition being played (fixtures, table / tournament), or null
//   trophies  [compId]  one per competition won
//   stadiums  unlocked stadium ids · recruited rivalId -> date · stats { streak, bestStreak, maxChem, allLegends, wins }
//   ended     the date the first Legends Invitational was won (the ending plays once)

const MyXI = {
  D() { return MYXI_DATA; },
  club(save) { return (save && save.myXI) || null; },
  // Unlocked by the first retirement (plan 15.1).
  unlocked(save) { return !!(save && save.unlocks && save.unlocks.myxi && (save.hallOfFame || []).length); },

  // ---- club creation ----
  // o: { name, colours: [a, b], crest, stadium }. seed: for the starter squad.
  create(save, o, seed) {
    const hof = save.hallOfFame || [];
    if (!this.unlocked(save)) return null;
    const club = save.myXI = {
      v: 1, name: o.name, colours: o.colours.slice(), crest: JSON.parse(JSON.stringify(o.crest)), stadium: o.stadium || 'local_oval',
      created: new Date().toISOString().slice(0, 10), seed: seed >>> 0, rngState: seed >>> 0,
      library: [], active: [], lineup: null, comps: {}, run: null, trophies: [],
      stadiums: MYXI_DATA.stadiums.filter((s) => s.start).map((s) => s.id), recruited: {}, rewardsTaken: {},
      stats: { streak: 0, bestStreak: 0, maxChem: 0, allLegends: 0, wins: 0 }, ended: null,
    };
    this.syncLegacy(save);
    const first = club.library.find((e) => e.kind === 'legacy' && e.ref === hof[0].id);
    const starters = this._starters(club, this.view(save, first));
    club.library.push(...starters);
    club.active = [first.id].concat(starters.slice(0, 14).map((e) => e.id));
    club.lineup = this.autoLineup(save);
    return club;
  },
  // Every Legacy Player in the Hall of Fame is in the library (new retirees join).
  syncLegacy(save) {
    const club = this.club(save);
    if (!club) return 0;
    let n = 0;
    for (const h of save.hallOfFame || []) {
      if (club.library.some((e) => e.kind === 'legacy' && e.ref === h.id)) continue;
      club.library.push({ id: 'L:' + h.id, kind: 'legacy', ref: h.id });
      n++;
    }
    return n;
  },
  // 14 starters around the first Legacy Player (plan 15.2): one generated XI
  // (keeper at 5, five bowlers) minus the player matching the Legacy role, plus
  // 4 reserves (a batter, a keeper, a pace bowler, a spinner).
  _starters(club, legacy) {
    const S = MYXI_DATA.starters;
    return Career.roll(club, (r) => {
      const xi = Teams.generate({ side: 'ai', rating: S.rating, origin: r.pick(Object.keys(ORIGIN_PACKS.origins)), rng: r });
      const res = Teams.generate({ side: 'ai', rating: S.reserveRating, origin: r.pick(Object.keys(ORIGIN_PACKS.origins)), rng: r });
      const drop = legacy.role === 'bat' ? 2 : legacy.role === 'bowl' ? 9 : 6;        // (the keeper, slot 5, always stays)
      const pick = xi.players.filter((p, i) => i !== drop).concat([res.players[1], res.players[4], res.players[7], res.players[9]]);
      const tagFor = (no) => (no <= 2 ? ['opener'] : no === 3 ? ['top'] : no === 6 ? ['finisher'] : []);
      return pick.map((p, i) => ({
        id: 'S:' + (i + 1), kind: 'starter', name: p.name, short: p.short, role: p.role, keeper: !!p.keeper,
        family: p.family, leftHanded: !!p.leftHanded, stats: Object.assign({}, p.stats), origin: xi.origin, tags: tagFor(p.no),
      }));
    });
  },

  // ---- a player, whatever the source (the view the screens and the match use) ----
  entry(save, id) { const c = this.club(save); return c ? c.library.find((e) => e.id === id) || null : null; },
  view(save, e) {
    if (!e) return null;
    if (e.kind === 'legacy') {
      const s = (save.hallOfFame || []).find((h) => h.id === e.ref);
      if (!s) return null;
      const stats = Object.assign({}, s.stats);
      for (const g of Object.values(s.gear || {})) for (const [k, v] of Object.entries(g.stats || {})) stats[k] = Math.min(99, (stats[k] || 0) + v);
      const tags = [];
      if (s.batRole === 'opener') tags.push('opener'); else if (s.batRole === 'top') tags.push('top');
      if (s.batRole === 'finisher' || s.archetype === 'finisher' || [s.traits.primary, s.traits.secondary].some((t) => t === 'ice_cold' || t === 'big_match_player')) tags.push('finisher');
      const role = { batter: 'bat', bowler: 'bowl', allrounder: 'all' }[s.role];
      return { id: e.id, kind: 'legacy', name: s.name, short: this._short(s.name), role, keeper: false, family: s.family || null,
        leftHanded: s.batHand === 'left', origin: s.origin, stats, tags, snap: s, look: s };
    }
    if (e.kind === 'rival') {
      const R = MYXI_DATA.rivalRecruits[e.ref], stats = {};
      for (const g of Object.values(PLAYER_DATA.stats)) for (const k of g) stats[k] = R.base;
      for (const k of R.stats) stats[k] = Math.min(99, R.base + R.boost);
      if (!R.family) for (const k of PLAYER_DATA.stats.bowling) stats[k] = Math.max(20, R.base - 30);
      return { id: e.id, kind: 'rival', name: T('rival.' + e.ref), short: T('rival.' + e.ref + '.short'), role: R.role, keeper: false, family: R.family,
        leftHanded: false, origin: null, stats, tags: R.tags.concat(['rival']), rival: e.ref, tech: R.tech, art: Rivals.rival(e.ref).art };
    }
    if (e.kind === 'recruit') {
      const R = MYXI_DATA.rewardRecruits[e.ref], stats = {};
      for (const g of Object.values(PLAYER_DATA.stats)) for (const k of g) stats[k] = R.base;
      for (const k of R.stats) stats[k] = Math.min(99, R.base + R.boost);
      if (!R.family) for (const k of PLAYER_DATA.stats.bowling) stats[k] = Math.max(20, R.base - 30);
      return { id: e.id, kind: 'recruit', name: R.name, short: this._short(R.name), role: R.role, keeper: !!R.keeper, family: R.family,
        leftHanded: false, origin: R.origin, stats, tags: R.tags.slice() };
    }
    return Object.assign({}, e, { stats: Object.assign({}, e.stats), tags: (e.tags || []).slice() });
  },
  _short(n) { const p = n.split(' '); return p.length > 1 ? p[0][0] + '. ' + p.slice(1).join(' ') : n; },
  ovr(v) { return Teams.overall({ role: v.role, stats: v.stats }); },
  isBowler(v) { return !!v.family; },
  // Legacy Players are frozen (plan 15.5): never re-equipped or re-specced.
  canEquip(save, id) {
    const e = this.entry(save, id);
    if (!e) return { ok: false, reason: 'unknown' };
    if (e.kind === 'legacy') return { ok: false, reason: 'frozen' };
    return { ok: false, reason: 'noGear' };       // My XI has no gear screen for other players either (v1.0)
  },

  // ---- rival recruits (plan 14.3): every rival beaten in a career, once ----
  recruitable(save) {
    const club = this.club(save), beat = (save.collection && save.collection.rivals) || {};
    return Object.keys(beat).filter((id) => MYXI_DATA.rivalRecruits[id] && !(club && club.recruited[id]));
  },
  recruit(save, rivalId) {
    const club = this.club(save);
    if (!club || !this.recruitable(save).includes(rivalId)) return false;
    club.recruited[rivalId] = new Date().toISOString().slice(0, 10);
    club.library.push({ id: 'R:' + rivalId, kind: 'rival', ref: rivalId });
    return true;
  },
  // A deterministic reward recruit (plan 15.6), once.
  grantRecruit(save, id) {
    const club = this.club(save);
    if (!club || club.library.some((e) => e.id === 'C:' + id)) return false;
    club.library.push({ id: 'C:' + id, kind: 'recruit', ref: id });
    return true;
  },

  // ---- the library and the Active Squad (plan 15.3) ----
  // Moving never deletes: a player out of the squad stays in the library.
  toActive(save, id) {
    const club = this.club(save);
    if (!this.entry(save, id) || club.active.includes(id)) return { ok: false, reason: 'already' };
    if (club.active.length >= MYXI_DATA.squadMax) return { ok: false, reason: 'full' };
    club.active.push(id);
    return { ok: true };
  },
  toReserve(save, id) {
    const club = this.club(save), i = club.active.indexOf(id);
    if (i < 0) return { ok: false, reason: 'notActive' };
    club.active.splice(i, 1);
    const L = club.lineup;
    if (L) {
      L.order = L.order.filter((x) => x !== id); L.bowlers = L.bowlers.filter((x) => x !== id);
      for (const k of ['keeper', 'captain', 'powerHitter', 'closer']) if (L[k] === id) L[k] = null;
    }
    return { ok: true };
  },
  library(save, filter) {
    const club = this.club(save);
    return club.library.map((e) => this.view(save, e)).filter((v) => v && (!filter || filter === 'all' || v.kind === filter || v.role === filter));
  },

  // ---- the lineup (plan 15.7) ----
  bowlersNeeded(fmtId) { const f = MATCH_DATA.formats[fmtId]; return Math.ceil(f.overs / f.maxOvers); },
  // The best legal XI from the Active Squad: a keeper, the bowlers, then the best batters.
  autoLineup(save) {
    const club = this.club(save), vs = club.active.map((id) => this.view(save, this.entry(save, id))).filter(Boolean);
    const batR = (v) => Teams.batRating(v), bowlR = (v) => (v.family ? Teams.bowlRating(v) : -1);
    const pick = [];
    const keeper = vs.filter((v) => v.keeper).sort((a, z) => batR(z) - batR(a))[0];
    if (keeper) pick.push(keeper);
    for (const v of vs.filter((x) => x.family && !pick.includes(x)).sort((a, z) => bowlR(z) - bowlR(a)).slice(0, 5)) pick.push(v);
    for (const v of vs.filter((x) => !pick.includes(x)).sort((a, z) => batR(z) - batR(a))) { if (pick.length >= 11) break; pick.push(v); }
    const order = pick.slice().sort((a, z) => batR(z) - batR(a) - (z.family && !['bat', 'all'].includes(z.role) ? 0 : 0));
    const bowlers = pick.filter((v) => v.family).sort((a, z) => bowlR(z) - bowlR(a));
    const best = (list, f) => list.slice().sort((a, z) => f(z) - f(a))[0];
    return {
      order: order.map((v) => v.id), keeper: keeper ? keeper.id : null,
      captain: (best(pick, (v) => v.stats.composure + (v.kind === 'legacy' ? 10 : 0)) || {}).id || null,
      powerHitter: (best(pick.filter((v) => !v.family || v.role !== 'bowl'), (v) => v.stats.power) || {}).id || null,
      closer: (bowlers[0] || {}).id || null, bowlers: bowlers.map((v) => v.id),
    };
  },
  // { ok, problems: [key…] } for this match length.
  validate(save, fmtId) {
    const club = this.club(save), L = club.lineup, p = [];
    if (!L) return { ok: false, problems: ['noLineup'] };
    const vs = L.order.map((id) => this.view(save, this.entry(save, id))).filter(Boolean);
    if (L.order.length !== 11 || vs.length !== 11 || new Set(L.order).size !== 11) p.push('eleven');
    if (L.order.some((id) => !club.active.includes(id))) p.push('notActive');
    const kp = L.keeper && this.view(save, this.entry(save, L.keeper));
    if (!kp || !L.order.includes(L.keeper) || !kp.keeper) p.push('keeper');
    if (vs.filter((v) => v.family).length < this.bowlersNeeded(fmtId || 'quick10')) p.push('bowlers');
    if (!L.captain || !L.order.includes(L.captain)) p.push('captain');
    if (!L.powerHitter || !L.order.includes(L.powerHitter)) p.push('powerHitter');
    const cl = L.closer && this.view(save, this.entry(save, L.closer));
    if (!cl || !L.order.includes(L.closer) || !cl.family) p.push('closer');
    return { ok: !p.length, problems: p };
  },

  // ---- chemistry (plan 15.11): up to 2 of the 8 active ----
  // Returns { met: [{ id, who: [ids] }], active: [first 2 met] } for the XI (ids).
  chemistry(save, ids) {
    const vs = (ids || this.club(save).lineup.order).map((id) => this.view(save, this.entry(save, id))).filter(Boolean);
    const who = {};
    const pace = (v) => v.family === 'fast' || v.family === 'swing', spin = (v) => v.family === 'offspin' || v.family === 'legspin';
    const top2 = vs.slice(0, 2);
    who.opening_partnership = top2.length === 2 && top2.every((v) => v.tags.includes('opener') || v.tags.includes('top')) ? top2 : [];
    who.new_ball_attack = vs.filter((v) => pace(v) && v.stats.delivery >= MYXI_DATA.newBallDelivery);
    who.spin_twin = vs.filter(spin);
    who.finisher_pair = vs.filter((v) => v.tags.includes('finisher'));
    who.all_round_engine = vs.filter((v) => v.role === 'all');
    who.homegrown_xi = vs.filter((v) => v.kind === 'legacy');
    who.rival_duo = vs.filter((v) => v.kind === 'rival');
    const byOrigin = {};
    for (const v of vs) if (v.origin) (byOrigin[v.origin] = byOrigin[v.origin] || []).push(v);
    who.national_core = Object.values(byOrigin).sort((a, z) => z.length - a.length)[0] || [];
    const met = MYXI_DATA.chemistry.filter((ch) => who[ch.id].length >= ch.need).map((ch) => ({ id: ch.id, who: who[ch.id].map((v) => v.id) }));
    return { met, active: met.slice(0, MYXI_DATA.maxChemistry) };
  },
  // The captain's team perk (plan 15.13), from the captain's role.
  captainPerk(save) {
    const L = this.club(save).lineup, v = L && L.captain && this.view(save, this.entry(save, L.captain));
    if (!v) return null;
    const key = v.keeper ? 'keeper' : v.role;
    return Object.assign({ id: MYXI_DATA.captainPerkFor[key] }, MYXI_DATA.captainPerks[MYXI_DATA.captainPerkFor[key]]);
  },
  noteLineup(save) {
    const club = this.club(save), ch = this.chemistry(save);
    club.stats.maxChem = Math.max(club.stats.maxChem || 0, ch.met.length);
  },

  // ---- the match team (plan 15.8): the XI as match entities ----
  // Stats: the player's (Legacy: frozen snapshot + frozen gear) + chemistry +
  // the captain's perk + the power hitter / closer boost. Perks: a Legacy Player's
  // frozen tree and gear; a rival's signature technique.
  teamFor(save) {
    const club = this.club(save), L = club.lineup, ch = this.chemistry(save), cap = this.captainPerk(save);
    const players = L.order.map((id, i) => {
      const v = this.view(save, this.entry(save, id)), stats = Object.assign({}, v.stats);
      const add = (s, n) => { if (stats[s] !== undefined) stats[s] = Math.min(120, stats[s] + n); };
      for (const a of ch.active) if (a.who.includes(id)) for (const [s, n] of Object.entries(MYXI_DATA.chemistry.find((c) => c.id === a.id).stats)) add(s, n);
      if (cap) add(cap.stat, cap.n);
      if (id === L.powerHitter) for (const [s, n] of Object.entries(MYXI_DATA.roles.powerHitter)) add(s, n);
      if (id === L.closer) for (const [s, n] of Object.entries(MYXI_DATA.roles.closer)) add(s, n);
      const pc = this.pseudoCareer(save, v);
      let perks = pc ? SkillTree.mods(pc) : null;
      if (cap && cap.perks.length) {
        perks = perks || { flags: {} };
        for (const P of cap.perks) {
          if (P.mult !== undefined) perks[P.mod] = (perks[P.mod] === undefined ? 1 : perks[P.mod]) * P.mult;
          else if (P.add !== undefined) perks[P.mod] = (perks[P.mod] || 0) + P.add;
        }
      }
      const e = { id: 'player' + (i + 1), no: i + 1, name: v.name, short: v.short, role: v.role, keeper: id === L.keeper, family: v.family,
        leftHanded: v.leftHanded, stats, baseStats: Object.assign({}, stats), owner: id, kind: v.kind };
      if (perks) e.perks = perks;
      e.overall = Teams.overall(e);
      return e;
    });
    return { side: 'player', name: club.name, origin: 'myxi', rating: Math.round(players.reduce((a, p) => a + p.overall, 0) / players.length), players, myxi: true };
  },
  // A career-shaped object for a Legacy Player (from the frozen tree + gear) or a
  // rival (their signature technique), so perks and techniques work in matches.
  pseudoCareer(save, v) {
    const M = SKILL_TREE_DATA.mastery;
    const base = (role) => ({ seed: 0, stage: 'local', hooks: { coach: null }, phase: 'season',
      player: { role, archetype: null, level: 1, skillTokens: 0, stats: Object.assign({}, v.stats), equipment: {},
        tree: { v: 1, nodes: {}, granted: {}, free: {}, freeUsed: {}, spent: 0, respecs: 0, sources: { level: 0, promotion: 0, rival: 0 }, loadout: { active: [], passive: [] }, mastery: {} } } });
    if (v.kind === 'legacy') {
      const s = v.snap, c = base(s.role);
      c.player.archetype = s.archetype;
      c.player.tree.nodes = Object.assign({}, s.tree.nodes);
      c.player.tree.loadout = { active: s.loadout.active.slice(), passive: s.loadout.passive.slice() };
      for (const [id, lvl] of Object.entries(s.tree.mastery || {})) c.player.tree.mastery[id] = lvl === 'mastered' ? M.mastered : lvl === 'skilled' ? M.skilled : 0;
      for (const [slot, g] of Object.entries(s.gear || {})) c.player.equipment[slot] = g.id;
      return c;
    }
    if (v.kind === 'rival' && v.tech) {
      const c = base(v.role === 'bat' ? 'batter' : v.role === 'bowl' ? 'bowler' : 'allrounder'), node = SkillTree.techNode(v.tech);
      if (node) { c.player.tree.nodes[node.id] = 1; c.player.tree.loadout[SkillTree.slotOf(v.tech)].push(v.tech); }
      return c;
    }
    return null;
  },

  // ---- the competition ladder (plan 15.9) ----
  comp(id) { return MYXI_DATA.competitions.find((c) => c.id === id) || null; },
  compIndex(id) { return MYXI_DATA.competitions.findIndex((c) => c.id === id); },
  cleared(save, id) { const c = this.club(save); return !!(c && c.comps[id] && c.comps[id].cleared); },
  compOpen(save, id) { const i = this.compIndex(id); return i === 0 || this.cleared(save, MYXI_DATA.competitions[i - 1].id); },
  // Start (or restart) a competition. Returns the run.
  startComp(save, id) {
    const club = this.club(save), C = this.comp(id);
    if (!C || !this.compOpen(save, id)) return null;
    const seed = Career.roll(club, (r) => r.int(1, 999999999));
    const run = club.run = { comp: id, seed, rngState: seed, teams: {}, fixtures: [], status: 'active', results: [] };
    this._teams(run, C);
    if (C.kind === 'league') {
      run.league = this._roundRobin(Object.keys(run.teams));
      this._leagueNext(run, C);
    } else if (C.kind === 'cup') {
      this.registerRun(run);
      const t = Tournament.create(run, 'myxi', 'myxi_cup'), o = Tournament.myOpponents(t)[0];
      this._fixture(run, C, 'group', o, 'g1');
    } else {
      MYXI_DATA.legends.forEach((L, i) => this._fixture(run, C, i === MYXI_DATA.legends.length - 1 ? 'final' : 'series', 'lg_' + L.id));
    }
    club.comps[id] = club.comps[id] || { cleared: 0, played: 0, won: 0 };
    return run;
  },
  // The sides in a competition (with that competition's ratings).
  _teams(run, C) {
    const club = { name: '', colours: [], crest: null };
    run.teams.myxi = { id: 'myxi', name: 'MYXI', rating: 0 };
    const [lo, hi] = C.rating, n = C.kind === 'league' ? C.teams - 1 : C.kind === 'cup' ? 11 : MYXI_DATA.legends.length;
    const rate = (i) => Math.round(lo + (hi - lo) * i / Math.max(1, n - 1));
    Career.roll(run, (r) => {
      if (C.opp === 'clubs') {
        const pack = ORIGIN_PACKS.origins[r.pick(Object.keys(ORIGIN_PACKS.origins))], used = new Set();
        for (let i = 0; i < n; i++) {
          let name; do { name = r.pick(pack.clubFragments) + ' ' + r.pick(ORIGIN_PACKS.clubSuffixes); } while (used.has(name)); used.add(name);
          const colours = Career._clubColours(pack, r);
          run.teams['cl_' + i] = { id: 'cl_' + i, name, colours, crest: Career.makeCrest(r, colours), rating: rate(i) };
        }
      } else if (C.opp === 'legends') {
        MYXI_DATA.legends.forEach((L, i) => { run.teams['lg_' + L.id] = { id: 'lg_' + L.id, name: T('elite.' + L.id), colours: L.colours.slice(), crest: { image: L.crest, colours: L.colours.slice() }, rating: rate(i), rival: L.rival }; });
      } else {
        const F = CAREER_DATA.franchise.teams.slice().sort((a, z) => a.rating - z.rating);
        const src = C.opp === 'franchise_low' ? F.slice(0, 8) : C.opp === 'franchise_high' ? F.slice(4) : F.slice(F.length - 12).concat(F).slice(0, 12);
        const ids = src.map((t) => t.id);
        for (let i = ids.length - 1; i > 0; i--) { const j = r.int(0, i); [ids[i], ids[j]] = [ids[j], ids[i]]; }
        ids.slice(0, n).forEach((fid, i) => {
          const t = CAREER_DATA.franchise.teams.find((x) => x.id === fid);
          run.teams['mx_' + fid] = { id: 'mx_' + fid, name: T('franchise.' + fid), colours: t.colours.slice(), crest: { image: t.crest, colours: t.colours.slice() }, rating: rate(i),
            rival: C.opp === 'franchise_rivals' ? MYXI_DATA.seriesRivals[i % MYXI_DATA.seriesRivals.length] : null };
        });
      }
    });
  },
  // Cups run on the Tournament engine: register this run's sides with it.
  registerRun(run) {
    const ids = Object.keys(run.teams);
    Tournament.formats.myxi_cup = { groups: 4, perGroup: 3, advance: 2, pointsWin: 2, simRuns: CAREER_DATA.world.simRuns, teams: ids.map((id) => run.teams[id]) };
    Tournament.extra = Object.assign({}, run.teams);
  },
  // A league: everyone plays everyone once (circle method; a bye if odd).
  _roundRobin(ids) {
    const list = ids.slice();
    if (list.length % 2) list.push(null);
    const rounds = [], n = list.length;
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) { const a = list[i], b = list[n - 1 - i]; if (a && b) pairs.push([a, b]); }
      rounds.push(pairs);
      list.splice(1, 0, list.pop());
    }
    return { rounds, round: 0 };
  },
  // The next league round with a match for you (others' matches are played first).
  _leagueNext(run, C) {
    const L = run.league;
    while (L.round < L.rounds.length) {
      const pairs = L.rounds[L.round], mine = pairs.find((p) => p.includes('myxi'));
      if (mine) { this._fixture(run, C, 'league', mine[0] === 'myxi' ? mine[1] : mine[0], 'r' + L.round); return true; }
      for (const [a, b] of pairs) run.results.push(this._quick(run, a, b, 'r' + L.round));   // your bye round
      L.round++;
    }
    return false;
  },
  _fixture(run, C, kind, oppId, round) {
    const n = run.fixtures.length + 1, T0 = run.teams[oppId];
    const f = { n, kind, round, opp: oppId, fmt: kind === 'final' && C.finalFmt ? C.finalFmt : C.fmt, played: false, rival: T0.rival || null };
    f.seed = Career.roll(run, (r) => r.int(1, 999999999));
    run.fixtures.push(f);
    return f;
  },
  _quick(run, a, b, round) {
    const S = CAREER_DATA.world.simRuns, ra0 = run.teams[a].rating, rb0 = run.teams[b].rating;
    return Career.roll(run, (r) => {
      let ra = Math.round(S.base + r.range(-S.spread, S.spread) + (ra0 - rb0) * S.perRating), rb = Math.round(S.base + r.range(-S.spread, S.spread) + (rb0 - ra0) * S.perRating);
      if (ra === rb) ra++;
      return { round, a, b, ra, rb, ba: 30, bb: 30, winner: ra > rb ? a : b };
    });
  },
  next(save) { const run = this.club(save).run; return run ? run.fixtures.find((f) => !f.played) || null : null; },
  // A league table: { id, p, w, l, pts, nrr } best first.
  table(run) {
    const rows = {};
    for (const id of Object.keys(run.teams)) rows[id] = { id, p: 0, w: 0, l: 0, pts: 0, rf: 0, bf: 0, rc: 0, bc: 0, nrr: 0 };
    for (const m of run.results) {
      const A = rows[m.a], B = rows[m.b];
      if (!A || !B) continue;
      A.p++; B.p++; A.rf += m.ra; A.bf += m.ba; A.rc += m.rb; A.bc += m.bb; B.rf += m.rb; B.bf += m.bb; B.rc += m.ra; B.bc += m.ba;
      const W = m.winner === m.a ? A : B, L = W === A ? B : A; W.w++; W.pts += 2; L.l++;
    }
    for (const x of Object.values(rows)) x.nrr = (x.bf ? x.rf / x.bf * 6 : 0) - (x.bc ? x.rc / x.bc * 6 : 0);
    return Object.values(rows).sort((p, q) => q.pts - p.pts || q.nrr - p.nrr || (p.id === 'myxi' ? -1 : q.id === 'myxi' ? 1 : 0));
  },

  // After a My XI match. mine: { won, runs, balls, oppRuns, oppBalls }. Returns
  // { cleared, failed, first, reward, trophy, ending, next }.
  afterMatch(save, mine) {
    const club = this.club(save), run = club.run, C = this.comp(run.comp), fx = this.next(save), out = {};
    fx.played = true; fx.won = !!mine.won; fx.score = (mine.runs || 0) + ' v ' + (mine.oppRuns || 0);
    const st = club.stats, rec = club.comps[run.comp];
    rec.played++; if (mine.won) { rec.won++; st.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); } else st.streak = 0;
    if (mine.won) { save.currencies.coins = (save.currencies.coins || 0) + MYXI_DATA.winRewards.coins; out.coins = MYXI_DATA.winRewards.coins; }
    if (fx.rival && mine.won) { club.rivalsBeaten = club.rivalsBeaten || {}; club.rivalsBeaten[fx.rival] = 1; }
    if (C.kind === 'league') {
      run.results.push({ round: fx.round, a: 'myxi', b: fx.opp, ra: mine.runs, rb: mine.oppRuns, ba: mine.balls || 30, bb: mine.oppBalls || 30, winner: mine.won ? 'myxi' : fx.opp });
      const L = run.league;
      for (const [a, b] of L.rounds[L.round]) if (a !== 'myxi' && b !== 'myxi') run.results.push(this._quick(run, a, b, fx.round));
      L.round++;
      if (!this._leagueNext(run, C)) this._finish(save, this.table(run)[0].id === 'myxi', out);
    } else if (C.kind === 'cup') {
      this.registerRun(run);
      const nx = Tournament.afterMatch(run, fx.kind, fx.round, fx.opp, mine);
      if (nx) this._fixture(run, C, nx.kind, nx.opp, nx.round);
      else this._finish(save, run.tour.best === 'champion', out);
    } else if (!this.next(save)) this._finish(save, !!mine.won, out);   // the Legends: win the last one
    out.next = this.next(save);
    return out;
  },
  _finish(save, won, out) {
    const club = this.club(save), run = club.run, C = this.comp(run.comp), rec = club.comps[run.comp];
    run.status = won ? 'cleared' : 'failed';
    out[won ? 'cleared' : 'failed'] = true;
    if (!won) return;
    rec.cleared++;
    club.trophies.push(C.id);
    out.trophy = C.trophy;
    if (!club.rewardsTaken[C.id]) {                         // first clear: the competition's reward (plan 15.14)
      club.rewardsTaken[C.id] = new Date().toISOString().slice(0, 10);
      out.first = true;
      out.reward = this._reward(save, C.reward);
    }
    if (C.id === 'legends' && !club.ended) { club.ended = new Date().toISOString().slice(0, 10); out.ending = true; }   // plan 15.16: once
  },
  _reward(save, rw) {
    const club = this.club(save), C = save.currencies, got = {};
    if (rw.coins) { C.coins = (C.coins || 0) + rw.coins; got.coins = rw.coins; }
    if (rw.lm) { C.legacyMarks = (C.legacyMarks || 0) + rw.lm; got.lm = rw.lm; }
    if (rw.mc) { C.mythicCore = (C.mythicCore || 0) + rw.mc; got.mc = rw.mc; }
    if (rw.recruit && this.grantRecruit(save, rw.recruit)) got.recruit = rw.recruit;
    if (rw.stadium && !club.stadiums.includes(rw.stadium)) { club.stadiums.push(rw.stadium); got.stadium = rw.stadium; }
    if (rw.item) { Gear.grant(save, rw.item, 'myxi'); got.item = rw.item; }
    if (rw.coach) { Coaches.unlock(save, rw.coach); got.coach = rw.coach; }
    if (rw.technique) { SkillTree.discover(save, rw.technique); got.technique = rw.technique; }
    return got;
  },

  // ---- Quick Sim (plan 15.10) ----
  // Only once the competition has been cleared before; never finals or
  // knockouts, a rival you haven't beaten in My XI yet, or first-time Legends.
  quickSimCheck(save, fx) {
    const club = this.club(save), run = club.run;
    if (!fx) return { ok: false, reason: 'none' };
    if (!this.cleared(save, run.comp)) return { ok: false, reason: 'firstClear' };
    if (['final', 'semi', 'quarter'].includes(fx.kind)) return { ok: false, reason: 'decisive' };
    if (fx.rival && !(club.rivalsBeaten && club.rivalsBeaten[fx.rival])) return { ok: false, reason: 'rival' };
    return { ok: true };
  },

  // ---- achievements (the account facts My XI adds) ----
  facts(save) {
    const club = this.club(save);
    if (!club) return { myxiClub: 0 };
    return { myxiClub: 1, chemistryLinks: club.stats.maxChem || 0, myxiTrophies: club.trophies.length, legendsInvitational: this.cleared(save, 'legends') ? 1 : 0,
      myxiPlayers: club.library.length, legendsXI: club.stats.allLegends || 0, myxiStreak: club.stats.bestStreak || 0, rivalsRecruited: Object.keys(club.recruited).length };
  },
};

// =====================================================================================
// The match glue: a My XI match on the real engine (plan 15.8, 15.8A). You bat as
// whoever is on strike and pick any legal bowler each over (the Quick Match
// controls); between-over tactical calls (plan 15.12); techniques for every
// Legacy Player and rival in the XI (Tech, multi-owner).
const MyXIMatch = {
  on: false,
  tactic: { bat: 'balanced', bowl: 'balanced' },    // the calls in force
  queued: { bat: 'balanced', bowl: 'balanced' },    // chosen for the next over
  fixture: null,

  // Build both sides and start. Returns the toss scene.
  start(save) {
    const club = MyXI.club(save), run = club.run, fx = MyXI.next(save);
    if (!fx) return null;
    MyXI.registerRun(run);
    if (typeof MissionMatch !== 'undefined') MissionMatch.on = false;
    this.on = true; this.fixture = fx;
    this.tactic = { bat: 'balanced', bowl: 'balanced' }; this.queued = { bat: 'balanced', bowl: 'balanced' };
    CareerMatch.on = false;
    Match.start(fx.fmt, {
      seed: fx.seed, myxi: true,
      teams: () => this.teams(save, fx),
      cond: (cr) => ({ stadium: STADIUM_DATA.stadiums[club.stadium] ? club.stadium : STADIUM_DATA.defaultStadium,
        pitch: cr.pick(Object.keys(STADIUM_DATA.pitchTypes)), weather: cr.pick(Object.keys(STADIUM_DATA.weather)) }),
    });
    this.beginTech(save);
    const all = Match.teams.player.players.every((p) => p.kind === 'legacy');
    if (all) club.stats.allLegends = 1;
    return 'toss';
  },
  teams(save, fx) {
    const club = MyXI.club(save), run = club.run, O = run.teams[fx.opp];
    const player = MyXI.teamFor(save);
    const opp = Teams.generate({ side: 'ai', rating: O.rating, origin: null, rng: RNG.stream('teams') });
    opp.name = O.name;
    if (O.rival) Rivals.inject(opp, O.rival);
    return { player, ai: opp };
  },
  // Techniques for every Legacy Player / rival in the XI.
  beginTech(save, saved) {
    const owners = [];
    for (const p of Match.teams.player.players) {
      const v = MyXI.view(save, MyXI.entry(save, p.owner));
      const c = v && MyXI.pseudoCareer(save, v);
      if (c && (SkillTree.loadout(c).active.length || SkillTree.loadout(c).passive.length)) owners.push({ pid: p.id, c });
    }
    Tech.beginMany(owners, saved);
  },
  teamName(side) { return Match.teams && Match.teams[side] ? Match.teams[side].name : ''; },

  // ---- tactical calls (plan 15.12) ----
  call(kind, id) {
    const T0 = MYXI_DATA.tactics[kind].find((t) => t.id === id);
    if (!T0) return false;
    this.queued[kind] = id;
    return true;
  },
  fx(kind) { return MYXI_DATA.tactics[kind].find((t) => t.id === this.tactic[kind]); },
  // At the start of every over: the queued calls take effect for your side.
  onOver(inn) {
    if (!this.on || !inn) return;
    this.tactic = Object.assign({}, this.queued);
    const mineBat = inn.battingSide === 'player', t = this.fx(mineBat ? 'bat' : 'bowl');
    for (const p of Match.teams.player.players) {
      if (!p.baseStats) continue;
      const s = Object.assign({}, p.baseStats);
      for (const [k, v] of Object.entries(t.stats || {})) if (s[k] !== undefined) s[k] = Math.max(1, Math.min(120, s[k] + v));
      p.stats = s;
    }
  },
  // For the simulated balls (Quick Sim): AI batting intent and the field.
  aggression(inn) { return inn.battingSide === 'player' ? (this.fx('bat').aggression || 0) : 0; },
  field(inn) { return inn.bowlingSide === 'player' ? this.fx('bowl').field : null; },

  // ---- Quick Sim: the whole match headless (real stats, tactics, seeded) ----
  quickSim(save) {
    const scene = this.start(save);
    if (!scene) return null;
    const t = Match.flipToss();
    Match.choose(t.winner === 'player' ? 'bat' : t.choice);
    this.autoPlay();
    return this.finish(save);
  },
  autoPlay() {
    if (!Match.innings.length) Match.startInnings();
    for (let guard = 0; guard < 6000 && !Match.over; guard++) {
      const inn = Match.current();
      if (inn.ended) { if (Match.afterInnings().next === 'result') break; Match.startInnings(); continue; }
      if (Match.needsBowler(inn)) {
        const team = Match.team(inn.bowlingSide), rng = RNG.stream('aiPick:' + inn.index);
        const bw = BowlerRules.aiPick(inn, team, Match.fatigue, rng), fam = Bowling.family(bw.family);
        const field = this.field(inn) || Fielding.aiChoose({ phase: BowlerRules.phase(inn), kind: fam.kind, family: fam.id, wicketsFell: false }, rng);
        Match.setBowler(inn, bw.id, field);
      }
      Match.overStart();
      const bowl = Match.bowlerOf(inn), bat = Match.batter(inn);
      Fielding.setPreset(inn.field, BowlerRules.phase(inn) === 'powerplay');
      Fielding.mods = Duel.fieldMods(Match.team(inn.bowlingSide), Fielding.preset);
      const b = SimMatch.ball({ inn, bat, bowl, fatigue: Match.fatigue[bowl.id] || 0, cond: Match.cond, fielding: Fielding.mods.fielding,
        phase: BowlerRules.phase(inn), index: inn.legal, aggression: this.aggression(inn) }, SimMatch._streams('myxi:' + inn.index));
      const res = inn.apply({ kind: b.kind, batRuns: b.batRuns, boundary: b.boundary, wicket: b.wicket });
      if (res.overDone || inn.ended) Match.overDone(inn);
      Fielding.clear();
    }
  },

  // The end of a match: the competition moves on; achievements. Returns the summary.
  finish(save) {
    const won = !!(Match.result && Match.result.winner === 'player'), m = { won };
    for (const inn of Match.innings.slice(0, 2)) {
      if (inn.battingSide === 'player') { m.runs = inn.runs; m.balls = inn.legal; } else { m.oppRuns = inn.runs; m.oppBalls = inn.legal; }
    }
    const fx = this.fixture, out = MyXI.afterMatch(save, m);
    out.won = won; out.fixture = fx; out.score = (m.runs || 0) + ' v ' + (m.oppRuns || 0);
    out.achievements = Achievements.afterMatch(save, {}, null).got.concat(Achievements.checkAccount(save, null));
    Tech.end();
    this.on = false;
    Save.clearResume();
    Save.write();
    return out;
  },
  ctx() { return this.on ? { fixture: this.fixture.n, tactic: this.tactic, queued: this.queued, tech: Tech.snapshot() } : null; },
  // Back into a My XI match from a resume checkpoint.
  resumeFrom(cp) {
    const save = Save.data, fx = MyXI.next(save);
    if (!fx || fx.n !== cp.myxi.fixture) throw new Error('My XI fixture not found');
    this.on = true; this.fixture = fx; this.tactic = cp.myxi.tactic; this.queued = cp.myxi.queued;
    MyXI.registerRun(MyXI.club(save).run);
    const r = Match.restore(cp);
    this.beginTech(save, cp.myxi.tech);
    return r;
  },
};
