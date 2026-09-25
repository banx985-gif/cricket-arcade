// Cricket Arcade — Career Mode rules (M05). Pure: no drawing, no scenes.
// A career is one plain object (saved whole in a career slot, see Save):
//   player      the created cricketer: look, hands, role, stats, level, XP,
//               growth points, skill tokens (+ hooks: tree, techniques, gear)
//   origin      cricket origin id (ORIGIN_PACKS)          club: the signed club
//   stage       the stage id ('local', …)                 fixtures: this stage's matches
//   block       the schedule block: prep actions used before the next match
//   energy, form, selection                               history: finished matches
// All numbers come from CAREER_DATA. All randomness from the career's own
// seeded stream (its position is saved, so reloading never re-rolls).

const Career = {
  VERSION: 1,

  // ---- seeded randomness that survives save/load ----
  rng(c) {
    const r = makeRng(c.seed);
    r.setState(c.rngState >>> 0);
    const save = () => { c.rngState = r.getState(); };
    return { r, save };
  },
  roll(c, fn) {
    const { r, save } = this.rng(c);
    try { return fn(r); } finally { save(); }
  },

  stage(c) { return CAREER_DATA.stages.find((s) => s.id === c.stage) || CAREER_DATA.stages[0]; },
  role(c) { return CAREER_DATA.roles[c.player.role]; },
  archetype(role, id) { return CAREER_DATA.roles[role].archetypes.find((a) => a.id === id) || CAREER_DATA.roles[role].archetypes[0]; },
  bats(c) { return true; },
  bowls(c) { return CAREER_DATA.roles[c.player.role].bowls; },

  // ---- creating a player (plan 5.5, 8.2, 9.4) ----
  // o: { name, presentation, look, facial, skin, hairColour, batHand, bowlHand,
  //      role, archetype, batRole, family }
  startStats(role, archetypeId, rng) {
    const R = CAREER_DATA.startRanges, A = this.archetype(role, archetypeId);
    const stats = {};
    for (const g of Object.values(PLAYER_DATA.stats)) {
      for (const k of g) {
        const band = A.key.includes(k) ? R.key : A.weak.includes(k) ? R.weak : R.neutral;
        stats[k] = Math.round(rng.rangeOf(band));
      }
    }
    return stats;
  },

  create(o, seed) {
    const c = {
      v: this.VERSION, seed: seed >>> 0, rngState: seed >>> 0,
      created: new Date().toISOString(),
      player: {
        name: o.name, presentation: o.presentation, look: o.look, facial: o.facial || 'none',
        skin: o.skin, hairColour: o.hairColour, batHand: o.batHand, bowlHand: o.bowlHand,
        role: o.role, archetype: o.archetype, batRole: o.batRole || 'top',
        family: CAREER_DATA.roles[o.role].bowls ? (o.family || 'fast') : null,
        stats: null, level: 1, xp: 0, growthPoints: 0, skillTokens: 0,
        // ---- hooks for later milestones ----
        tree: null,                              // the Wicket Tree (SkillTree.ensure fills it in)
        techniques: [], equipment: {},
      },
      origin: o.origin || null,
      club: null, offers: null,
      stage: CAREER_DATA.stages[0].id,
      fixtures: [], block: { preps: 0, log: [] },
      energy: CAREER_DATA.energy.start, form: CAREER_DATA.form.start, selection: 0,
      phase: 'create',                           // create -> club -> season -> promoted
      history: [], difficulty: [], matchInProgress: null,
      hooks: { rivals: {}, sponsors: {}, events: {}, coach: null },
    };
    c.player.stats = this.roll(c, (r) => this.startStats(o.role, o.archetype, r));
    SkillTree.ensure(c);                         // role point + archetype perk rank
    Gear.ensureCareer(c);                        // the starter kit in every slot
    return c;
  },

  // ---- overall / effective stats ----
  overall(c) {
    const p = Object.assign({ role: c.player.role === 'batter' ? 'bat' : c.player.role === 'bowler' ? 'bowl' : 'all' }, { stats: c.player.stats });
    return Teams.overall(p);
  },
  // What the player actually plays with: base + form + low-energy penalty +
  // later bonuses (Skill Tree perks, equipment) through CareerStats.bonus().
  effectiveStats(c) {
    const out = {};
    const form = CAREER_DATA.form.statBonus[c.form] || 0;
    const low = c.energy < CAREER_DATA.energy.low ? -CAREER_DATA.energy.lowStatPenalty : 0;
    const extra = CareerStats.bonus(c);
    for (const [k, v] of Object.entries(c.player.stats)) out[k] = Math.max(1, Math.min(120, v + form + low + (extra[k] || 0)));
    return out;
  },

  // ---- XP, levels, growth (plan 10) ----
  addXp(c, xp) {
    const L = CAREER_DATA.levels, p = c.player;
    p.xp += xp;
    let ups = 0;
    while (p.level < L.max && p.xp >= L.xpFor(p.level)) {
      p.xp -= L.xpFor(p.level);
      p.level++;
      p.growthPoints += L.growthPerLevel;
      SkillTree.earn(c, 'level', L.skillTokensPerLevel);
      ups++;
    }
    return ups;
  },
  growthCost(c, stat) {
    const v = c.player.stats[stat];
    const tier = CAREER_DATA.growthCost.find((t) => v < t.below) || CAREER_DATA.growthCost[CAREER_DATA.growthCost.length - 1];
    const pref = this.archetype(c.player.role, c.player.archetype).grow.concat(this.role(c).grow);
    return Math.max(1, tier.cost - (pref.includes(stat) ? CAREER_DATA.growthDiscountStats : 0));
  },
  spendGrowth(c, stat) {
    const cost = this.growthCost(c, stat);
    if (c.player.growthPoints < cost || c.player.stats[stat] >= CAREER_DATA.statMax) return false;
    c.player.growthPoints -= cost;
    c.player.stats[stat]++;
    return true;
  },

  // ---- clubs (plan 5.5B, 8.8) ----
  _clubColours(pack, r) {
    const C = CAREER_DATA.clubs.colours;
    const combo = r.pick(pack.colourPool).split('_');
    return [C[combo[0]] || '#1d4ed8', C[combo[1]] || '#e8b21c'];
  },
  makeCrest(r, colours) {
    const K = CAREER_DATA.clubs;
    if (r.chance(K.framedChance)) return { shield: null, emblem: r.pick(K.framedEmblems), colours };
    return { shield: r.pick(K.shields), emblem: r.pick(K.animalEmblems), colours };
  },
  _clubName(pack, r, used) {
    for (let i = 0; i < 20; i++) {
      const n = r.pick(pack.clubFragments) + ' ' + r.pick(ORIGIN_PACKS.clubSuffixes);
      if (!used.has(n)) { used.add(n); return n; }
    }
    return r.pick(pack.clubFragments) + ' CC';
  },
  // Three offers. Differences stay small: the batting slot / bowling spell
  // you'd get, the training emphasis and the venue theme.
  clubOffers(c) {
    return this.roll(c, (r) => {
      const pack = ORIGIN_PACKS.origins[c.origin], K = CAREER_DATA.clubs, used = new Set();
      const bowls = this.bowls(c), p = c.player;
      const home = CAREER_DATA.battingRoles[p.batRole] || 3;
      const batSlots = c.player.role === 'bowler' ? [CAREER_DATA.bowlerBatsAt, CAREER_DATA.bowlerBatsAt, CAREER_DATA.bowlerBatsAt - 1]
        : [home, Math.max(1, home - 1), Math.min(6, home + 1)];
      const spells = Object.keys(K.bowlSpells);
      const emph = K.emphases.slice();
      const offers = [];
      for (let i = 0; i < K.offers; i++) {
        const colours = this._clubColours(pack, r);
        offers.push({
          id: 'club' + i, name: this._clubName(pack, r, used), colours, crest: this.makeCrest(r, colours),
          venue: r.pick(K.venues), emphasis: emph.splice(r.int(0, emph.length - 1), 1)[0] || 'balanced',
          batPos: batSlots[i], spell: bowls ? spells[i % spells.length] : null,
        });
      }
      return offers;
    });
  },

  signClub(c, club) {
    c.club = club;
    c.offers = null;
    c.phase = 'season';
    this.startStage(c, c.stage);
  },

  // ---- fixtures ----
  _opponent(c, rating, final, kind) {
    const S0 = Career.stage(c);
    // Stages 5–8: other nations (their Development XI in Stage 5); a short domestic block in Stage 5 plays domestic sides.
    if ((S0.team === 'devxi' || S0.team === 'national') && !(S0.team === 'devxi' && kind === 'extra')) {
      return this.roll(c, (r) => this._nationOpp(c, r.pick(CAREER_DATA.world.teams.filter((t) => t.id !== c.origin)).id, rating, final));
    }
    if (S0.team === 'devxi') {
      return this.roll(c, (r) => {
        const pack = ORIGIN_PACKS.origins[c.origin], colours = this._clubColours(pack, r);
        return { name: r.pick(pack.clubFragments) + ' ' + r.pick(CAREER_DATA.domesticSuffixes), colours, crest: this.makeCrest(r, colours), rating: Math.round(rating), final: !!final };
      });
    }
    // Stage 4: another franchise (not yours).
    if (Career.stage(c).team === 'franchise') {
      return this.roll(c, (r) => {
        const mine = c.team && c.team.franchise;
        const id = r.pick(CAREER_DATA.franchise.teams.filter((t) => t.id !== mine)).id;
        const o = Tournament.opp(id, final);
        return o;
      });
    }
    return this.roll(c, (r) => {
      const me = this.team(c), pack = ORIGIN_PACKS.origins[c.origin], used = new Set([c.club.name, me.name]);
      const town = c.club.name.split(' ')[0];
      pack.clubFragments.forEach((f) => { if (f === town) for (const sfx of ORIGIN_PACKS.clubSuffixes) used.add(f + ' ' + sfx); });
      const colours = this._clubColours(pack, r);
      const S = Career.stage(c);
      const name = S.team === 'stage' ? this._stageTeamName(c, pack, r, used) : this._clubName(pack, r, used);
      return { name, colours, crest: this.makeCrest(r, colours), rating: Math.round(rating), final: !!final };
    });
  },
  // A representative side's name: a town + the stage's suffix.
  _stageTeamName(c, pack, r, used) {
    const S = Career.stage(c);
    for (let i = 0; i < 20; i++) {
      const sfx = S.teamSuffix === 'domestic' ? r.pick(CAREER_DATA.domesticSuffixes) : S.teamSuffix;
      const n = r.pick(pack.clubFragments) + ' ' + sfx;
      if (!used.has(n)) { used.add(n); return n; }
    }
    return r.pick(pack.clubFragments) + ' XI';
  },
  // A national side as an opponent (Stage 5: their Development XI).
  _nationOpp(c, id, rating, final) {
    const t = CAREER_DATA.world.teams.find((x) => x.id === id), dev = this.stage(c).team === 'devxi';
    return { name: ORIGIN_PACKS.origins[id].pathwayLabels[dev ? 4 : 5], nation: id, colours: t.colours.slice(), crest: { image: 'badge_' + id, colours: t.colours.slice() },
      rating: Math.round(rating || t.rating), final: !!final };
  },
  _fixture(c, kind, rating, opp) {
    const n = c.fixtures.length + 1;
    const f = { n, kind, opp: opp || this._opponent(c, rating, kind === 'final', kind), played: false, seed: 0 };
    f.seed = this.roll(c, (r) => r.int(1, 999999999));
    // A rival boss match (plan 14): only in the stage's main block.
    const rival = ['league', 'group', 'final', 'quarter', 'semi', 'gauntlet', 'invitational'].includes(kind) && Rivals.forFixture(this.stage(c), n, kind);
    if (rival) f.rival = rival;
    f.objective = rival ? Rivals.objective(c, rival) : this.objectiveFor(c, f);
    return f;
  },
  startStage(c, stageId) {
    const S = CAREER_DATA.stages.find((s) => s.id === stageId);
    c.stage = stageId;
    c.fixtures = [];
    c.selection = 0;
    c.stageMisses = 0;
    c.block = { preps: 0, log: [] };
    if (S.comingSoon) return;
    if (S.tournament) {
      // Stages 4 and 7: your group's first match; the tournament adds the rest as it goes.
      const t = S.tournament === 'world' ? Tournament.create(c, c.origin, 'world') : Tournament.create(c, c.team.franchise), o = Tournament.myOpponents(t)[0];
      const f = this._fixture(c, 'group', Tournament.team(o).rating, Tournament.opp(o));
      f.round = 'g1';
      c.fixtures.push(f);
      return;
    }
    if (S.elite) { this._eliteFixtures(c, S); return; }
    // Stages 5–6: a different nation each match (rotating).
    const nations = S.team === 'devxi' || S.team === 'national' ? this.roll(c, (r) => {
      const ids = CAREER_DATA.world.teams.map((t) => t.id).filter((id) => id !== c.origin);
      for (let i = ids.length - 1; i > 0; i--) { const j = r.int(0, i); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      return ids;
    }) : null;
    for (let i = 0; i < S.matches; i++) {
      const last = i === S.matches - 1;
      const rating = last ? S.finalOpponentRating : S.opponentRating[0] + (S.opponentRating[1] - S.opponentRating[0]) * i / Math.max(1, S.matches - 2);
      c.fixtures.push(this._fixture(c, last ? 'final' : 'league', rating, nations ? this._nationOpp(c, nations[i % nations.length], rating, last) : null));
    }
  },
  // Stage 8: 3 gauntlet matches, the Phantom's secret invitation (if earned), then the Champion.
  _eliteFixtures(c, S) {
    const E = CAREER_DATA.elite, side = (d, rating, final) => ({ name: T('elite.' + d.id), colours: d.colours.slice(), crest: { image: d.crest, colours: d.colours.slice() }, rating, final: !!final });
    E.gauntlet.forEach((d, i) => c.fixtures.push(this._fixture(c, 'gauntlet', 0, side(d, S.opponentRating[0] + (S.opponentRating[1] - S.opponentRating[0]) * i / 2))));
    if (Rivals.beatenCount(c) >= EVENT_DATA.phantom.rivalsBeaten) {
      const f = this._fixture(c, 'invitational', 0, side(E.phantom, S.finalOpponentRating - 2));
      f.rival = 'phantom'; f.objective = Rivals.objective(c, 'phantom');
      c.fixtures.push(f);
    }
    c.fixtures.push(this._fixture(c, 'final', 0, side(E.champion, S.finalOpponentRating, true)));
  },
  // After the Champion match: play him again (the career stays complete either way).
  rematch(c) {
    const S = this.stage(c);
    if (!S.final || c.phase !== 'complete') return false;
    c.fixtures.push(this._fixture(c, 'final', 0, Object.assign({}, c.fixtures.filter((f) => f.kind === 'final').pop().opp)));
    c.phase = 'season';
    return true;
  },
  next(c) { return c.fixtures.find((f) => !f.played) || null; },

  // ---- the side you play for (plan 8.6) ----
  // Stage 1: your local club. Stages 2–3: a representative side (c.team). Stage 4: your franchise.
  team(c) { return (this.stage(c).team !== 'club' && c.team) || c.club; },
  teamRating(c) { const t = this.team(c); return (t && t.rating) || this.stage(c).teamRating; },
  _stageTeam(c) {
    return this.roll(c, (r) => {
      const pack = ORIGIN_PACKS.origins[c.origin], colours = this._clubColours(pack, r);
      const name = this._stageTeamName(c, pack, r, new Set([c.club.name]));
      return { name, colours, crest: this.makeCrest(r, colours), rating: this.stage(c).teamRating,
        batPos: c.club.batPos, spell: c.club.spell, emphasis: c.club.emphasis };
    });
  },
  // Between stages (phase 'promoted'): start the stage the career was promoted
  // into. Returns 'season' | 'offers' (Stage 4: pick a contract first) | null (coming soon).
  beginStage(c) {
    const S = this.stage(c);
    if (S.comingSoon || c.phase !== 'promoted') return null;
    if (S.team === 'franchise') {
      c.offers = this.franchiseOffers(c);
      c.phase = 'offers';
      return 'offers';
    }
    c.team = S.team === 'stage' ? this._stageTeam(c) : S.team === 'devxi' || S.team === 'national' ? this._nationalTeam(c, S) : null;
    c.phase = 'season';
    this.startStage(c, S.id);
    return 'season';
  },

  // Stages 5–8: your country (its Development XI in Stage 5).
  _nationalTeam(c, S) {
    const t = CAREER_DATA.world.teams.find((x) => x.id === c.origin), O = ORIGIN_PACKS.origins[c.origin];
    return { name: O.pathwayLabels[S.team === 'devxi' ? 4 : 5], nation: c.origin, colours: t.colours.slice(), crest: { image: 'badge_' + c.origin, colours: t.colours.slice() },
      rating: S.teamRating, batPos: (c.team && c.team.batPos) || c.club.batPos, spell: (c.team && c.team.spell) || c.club.spell, emphasis: c.club.emphasis };
  },

  // ---- Stage 4 contract offers (plan 5.5C, 8.10) ----
  // Up to 3: 2, plus 1 for a strong Selection Meter coming up or a rival beaten.
  franchiseOffers(c) {
    const F = CAREER_DATA.franchise, O = F.offers;
    const rivalBeaten = Object.values((c.hooks && c.hooks.rivals) || {}).some((f) => f.beaten);
    const n = Math.min(3, O.base + ((c.promotedSelection || 0) >= O.bonusAt || rivalBeaten ? 1 : 0));
    return this.roll(c, (r) => {
      const teams = F.teams.slice(), objs = O.objectives.slice(), rewards = O.rewards.slice(), coaches = O.coaches.slice();
      const take = (list) => list.splice(r.int(0, list.length - 1), 1)[0];
      const home = CAREER_DATA.battingRoles[c.player.batRole] || 3, bowls = this.bowls(c), spells = Object.keys(CAREER_DATA.clubs.bowlSpells);
      const out = [];
      for (let i = 0; i < n; i++) {
        const t = take(teams);
        out.push({
          id: 'offer' + i, franchise: t.id, salary: O.salary[Math.min(i, O.salary.length - 1)],
          batPos: c.player.role === 'bowler' ? CAREER_DATA.bowlerBatsAt : [home, Math.max(1, home - 1), Math.min(6, home + 1)][i % 3],
          spell: bowls ? spells[i % spells.length] : null,
          objective: Object.assign({}, take(objs)), coach: take(coaches), reward: take(rewards),
        });
      }
      return out;
    });
  },
  // Sign a contract: your franchise, its tournament, and the first fixture.
  signFranchise(c, offer) {
    const t = Tournament.team(offer.franchise);
    c.team = { name: Tournament.name(t.id), franchise: t.id, colours: t.colours.slice(), crest: { image: t.crest, colours: t.colours.slice() },
      rating: t.rating, batPos: offer.batPos, spell: offer.spell || c.club.spell, emphasis: c.club.emphasis };
    c.contract = { franchise: t.id, salary: offer.salary, objective: offer.objective, coach: offer.coach, reward: offer.reward,
      progress: { runs: 0, wickets: 0, sixes: 0, gradeA: 0 }, done: false };
    c.offers = null;
    c.phase = 'season';
    this.startStage(c, c.stage);
  },

  objectiveFor(c, f) {
    const O = CAREER_DATA.objectives;
    // Stage 5's final trial is about your role, not the result (plan 8.11).
    const trialFinal = this.stage(c).trials && f.kind === 'final';
    if (!trialFinal && ['final', 'qualifier', 'semi', 'quarter'].includes(f.kind)) return Object.assign({}, O.final);
    return this.roll(c, (r) => {
      const pool = c.player.role === 'batter' ? O.bat : c.player.role === 'bowler' ? O.bowl : r.chance(0.5) ? O.bat : O.bowl;
      return Object.assign({}, r.pick(pool));
    });
  },
  objectiveMet(obj, perf) {
    switch (obj.id) {
      case 'runs': return perf.bat.runs >= obj.n;
      case 'notOut': return perf.bat.batted && !perf.bat.out;
      case 'boundaries': return perf.bat.fours + perf.bat.sixes >= obj.n;
      case 'wickets': return perf.bowl.wkts >= obj.n;
      case 'economy': return perf.bowl.balls >= 6 && perf.bowl.runs / perf.bowl.balls * 6 <= obj.n;
      case 'dots': return perf.bowl.dots >= obj.n;
      case 'win': return !!perf.won;
      default: return false;
    }
  },

  // ---- the schedule loop (plan 8.13) ----
  prepsLeft(c) { return Math.max(0, CAREER_DATA.prepPerBlock - c.block.preps); },

  // Train: small stat gain, costs energy, gives XP. Returns what happened.
  train(c, drillId) {
    const D = CAREER_DATA.training.find((t) => t.id === drillId);
    if (!D || this.prepsLeft(c) <= 0) return null;
    const M = SkillTree.mods(c);
    const energy = Math.round(D.energy * M.energy);
    const res = { drill: D.id, stat: D.stat, gain: D.gain, xp: D.xp, energy: -energy, levels: 0, emphasis: false };
    this.roll(c, (r) => {
      if (D.emphasis && c.club && (c.club.emphasis === D.emphasis || c.club.emphasis === 'balanced')) {
        res.emphasis = true;
        res.xp += CAREER_DATA.emphasisBonus.xp;
        if (c.club.emphasis === D.emphasis && r.chance(CAREER_DATA.emphasisBonus.extraStatChance)) res.gain++;
      }
    });
    // Your coach's specialty drills train better (plan 13).
    const K = typeof Coaches !== 'undefined' && typeof Save !== 'undefined' && Save.data ? Coaches.training(c, Save.data, D.id) : { specialty: false };
    if (K.specialty) {
      res.coach = Coaches.active(c);
      res.xp = Math.round(res.xp * (1 + K.xp));
      if (this.roll(c, (r) => r.chance(K.extraStat))) res.gain++;
      Coaches.addUse(Save.data, res.coach, 1);
    }
    // Tired training still helps, but less.
    if (c.energy < CAREER_DATA.energy.low) res.gain = Math.max(0, res.gain - 1);
    c.player.stats[D.stat] = Math.min(CAREER_DATA.statMax, c.player.stats[D.stat] + res.gain);
    c.energy = Math.max(0, c.energy - energy);
    res.xp = Math.round(res.xp * (1 + M.xp));
    res.levels = this.addXp(c, res.xp);
    c.block.preps++;
    c.block.log.push('train:' + D.id);
    return res;
  },

  rest(c) {
    if (this.prepsLeft(c) <= 0) return null;
    const R = CAREER_DATA.rest;
    const before = c.energy;
    c.energy = Math.min(CAREER_DATA.energy.max, c.energy + R.energy + SkillTree.mods(c).restEnergy);
    let formUp = false;
    if (R.formUpFromPoor && c.form === 'poor') { c.form = 'normal'; formUp = true; }
    c.block.preps++;
    c.block.log.push('rest');
    return { energy: c.energy - before, formUp };
  },

  // ---- the match grade (plan 8.24) ----
  // perf: { bat: { batted, runs, balls, out, fours, sixes }, bowl: { bowled, balls, runs, wkts, dots, extras }, won }
  gradeMatch(c, perf, objective) {
    const G = CAREER_DATA.grade, role = c.player.role;
    const b = perf.bat, w = perf.bowl;
    let batScore = G.bat.didNotBat;
    if (b.batted) {
      const sr = b.balls ? b.runs / b.balls * 100 : 0;
      batScore = b.runs * G.bat.perRun + (b.balls >= 4 ? (sr - G.bat.srBase) * G.bat.perSrPoint : 0) + (!b.out ? G.bat.notOut : 0) + (b.out && b.runs === 0 ? G.bat.duck : 0);
    }
    let bowlScore = G.bowl.didNotBowl;
    if (w.bowled) {
      const econ = w.balls ? w.runs / w.balls * 6 : 12;
      bowlScore = w.wkts * G.bowl.perWicket + (G.bowl.econBase - econ) * G.bowl.perEconPoint + w.dots * G.bowl.perDot + w.extras * G.bowl.perExtra;
    }
    let score = role === 'batter' ? batScore : role === 'bowler' ? bowlScore
      : batScore * G.allWeights.bat + bowlScore * G.allWeights.bowl;
    if (perf.won) score += G.won;
    const objectiveMet = objective ? this.objectiveMet(objective, perf) : false;
    if (objectiveMet) score += G.objective;
    const grade = G.thresholds.find((t) => score >= t.min).g;
    return { score: Math.round(score), grade, objectiveMet, batScore: Math.round(batScore), bowlScore: Math.round(bowlScore) };
  },
  gradeAtLeast(g, min) { const o = CAREER_DATA.gradeOrder; return o.indexOf(g) >= o.indexOf(min); },

  // A finished match: grade it and apply everything (energy, form, XP,
  // Selection Meter, the fixture, the next block). Returns the summary shown
  // on the career result screen.
  finishMatch(c, fixture, perf) {
    const G = this.gradeMatch(c, perf, fixture.objective);
    const S = CAREER_DATA.selection, F = CAREER_DATA.form;
    const lowEnergy = c.energy < CAREER_DATA.energy.low;
    const M = SkillTree.mods(c), lo = SkillTree.loadout(c), TD = SKILL_TREE_DATA.techniques;
    let energyCost = CAREER_DATA.energy.match * M.energy;
    if (lo.passive.includes('fitness_freak')) energyCost -= TD.fitness_freak.energy;
    c.energy = Math.max(0, c.energy - Math.max(0, Math.round(energyCost)));
    // Selection Meter
    let sel = S.fromGrade[G.grade] + (G.objectiveMet ? S.objective : 0);
    // Crowd Favourite: your boundaries and wickets catch the selectors' eye.
    let crowd = 0;
    if (lo.passive.includes('crowd_favourite')) {
      const CF = TD.crowd_favourite;
      crowd = Math.min(CF.max, CF.perMoment * ((perf.bat.fours || 0) + (perf.bat.sixes || 0) + (perf.bowl.wkts || 0)));
      sel += crowd;
    }
    if (fixture.kind === 'final') sel *= S.finalMult;
    sel = Math.round(sel);
    const selBefore = c.selection;
    c.selection = Math.min(S.max, c.selection + sel);
    // Form
    const formBefore = c.form;
    let step = F.fromGrade[G.grade];
    if (lowEnergy && this.roll(c, (r) => r.chance(CAREER_DATA.energy.slumpChance))) step -= 1;
    // Iron Engine: form drops more slowly.
    let formSaved = false;
    if (step < 0 && M.flags.ironEngine && this.roll(c, (r) => r.chance(SKILL_TREE_DATA.keystones.ironEngine.formDropSave))) { step += 1; formSaved = true; }
    const i = F.levels.indexOf(c.form);
    c.form = F.levels[Math.max(0, Math.min(F.levels.length - 1, i + step))];
    // XP
    const xp = Math.round((CAREER_DATA.grade.xp[G.grade] + (G.objectiveMet ? 20 : 0)) * (1 + M.xp));
    const levels = this.addXp(c, xp);
    // Coins (the global currency, plan 22.1): CareerMatch.finish pays them into the save.
    const coins = Math.round(SKILL_TREE_DATA.coinsFromGrade[G.grade] * (1 + M.coins));
    // The fixture and the schedule
    fixture.played = true;
    fixture.grade = G.grade;
    fixture.won = !!perf.won;
    fixture.score = perf.scoreLine || '';
    fixture.objectiveMet = G.objectiveMet;
    c.block = { preps: 0, log: [] };
    c.matchInProgress = null;
    c.matchBuff = null;                            // a rival build-up boost lasts one match
    const S0 = this.stage(c);
    const rec = { stage: c.stage, n: fixture.n, kind: fixture.kind, opp: fixture.opp.name, grade: G.grade, won: !!perf.won,
      tour: S0.tournament ? (S0.tournament === 'world' ? 'world' : 'franchise') : null, rival: fixture.rival || null, facts: perf.facts || null,
      bat: perf.bat, bowl: perf.bowl, selection: sel, xp };
    c.history.push(rec);
    const out = Object.assign({}, G, { xp, levels, selection: sel, selBefore, selAfter: c.selection, formBefore, formAfter: c.form,
      energyAfter: c.energy, objective: fixture.objective, kind: fixture.kind, won: !!perf.won, coins, crowd, formSaved });
    // Stage 4: the tournament moves on (it may add your semi-final / final).
    if (c.tour && c.tour.phase !== 'done' && ['group', 'quarter', 'semi', 'final'].includes(fixture.kind) && fixture.opp.franchise) {
      const nx = Tournament.afterMatch(c, fixture.kind, fixture.round, fixture.opp.franchise, {
        won: !!perf.won, runs: perf.teamRuns || 0, balls: perf.teamBalls || 30, oppRuns: perf.oppRuns || 0, oppBalls: perf.oppBalls || 30 });
      out.tour = { phase: c.tour.phase, best: c.tour.best };
      if (nx) {
        const S = this.stage(c), f = this._fixture(c, nx.kind, Tournament.team(nx.opp).rating, Tournament.opp(nx.opp, nx.kind === 'final'));
        f.round = nx.round;
        c.fixtures.push(f);
      }
    }
    // Trophies (plan 8.20: for the Legacy): a stage final won, a tournament won, the Champion beaten.
    c.trophies = c.trophies || [];
    const S8 = this.stage(c);
    if (fixture.kind === 'final' && perf.won) {
      const id = S8.tournament ? (S8.tournament === 'world' ? 'world' : 'franchise') + '_champion' : S8.elite ? 'elite_champion' : S8.id + '_final';
      if (!c.trophies.includes(id)) { c.trophies.push(id); out.trophy = id; }
    }
    // Stage gate after the last fixture of the block (Stage 8 has none: the career is complete).
    if (!this.next(c)) out.gate = S8.final ? this.complete(c) : this.gate(c, fixture);
    return out;
  },

  // ---- the stage gate (plan 8.7) ----
  // threshold + key objective = promoted; near miss = one qualifier match;
  // bigger miss = a short extra block, then another look. Never a dead end.
  gate(c, last) {
    const S = this.stage(c), G = S.gate;
    const finalFx = c.fixtures.filter((f) => f.kind === 'final' || f.kind === 'qualifier').pop();
    // key objective: a grade in the final, or how far you got in the tournament
    const keyMet = G.keyObjective.reach ? Tournament.reached(c.tour, G.keyObjective.reach) : !!finalFx && this.gradeAtLeast(finalFx.grade || 'D', G.keyObjective.finalGrade);
    if (last && last.kind === 'qualifier') {
      if (this.gradeAtLeast(last.grade, S.qualifier.passGrade)) return this.promote(c);
      return this._extraBlock(c);
    }
    if (c.selection >= G.threshold && keyMet) return this.promote(c);
    if (c.selection >= G.nearMiss) {
      c.fixtures.push(this._fixture(c, 'qualifier', S.finalOpponentRating));
      c.gateMisses = (c.gateMisses || 0) + 1; c.stageMisses = (c.stageMisses || 0) + 1;
      return { result: 'qualifier' };
    }
    return this._extraBlock(c);
  },
  _extraBlock(c) {
    const S = this.stage(c);
    c.gateMisses = (c.gateMisses || 0) + 1; c.stageMisses = (c.stageMisses || 0) + 1;
    for (let i = 0; i < S.extraBlock.matches; i++) c.fixtures.push(this._fixture(c, i === S.extraBlock.matches - 1 ? 'final' : 'extra', S.opponentRating[1]));
    return { result: 'extra', matches: S.extraBlock.matches };
  },
  // Stage 8 over: time to retire (or a rematch with the Champion).
  complete(c) {
    c.phase = 'complete';
    return { result: 'complete' };
  },
  promote(c) {
    const S = this.stage(c);
    if (S.id === 'national') c.nationalSelected = true;     // plan 8.11: once earned, it's permanent
    if (c.stageMisses) c.comebacks = (c.comebacks || 0) + 1;   // promoted after missing a gate this stage
    SkillTree.earn(c, 'promotion', CAREER_DATA.levels.skillTokensPerPromotion);
    c.promotedFrom = S.id;
    c.promotedSelection = c.selection;             // (a strong finish earns an extra contract offer)
    c.stage = S.next;
    c.phase = 'promoted';
    c.fixtures = [];
    return { result: 'promoted', to: S.next };
  },

  // What the Career Select slot shows.
  summary(c) {
    const S = this.stage(c), nx = this.next(c);
    return {
      name: c.player.name, role: c.player.role, look: c.player.look, facial: c.player.facial, skin: c.player.skin, hairColour: c.player.hairColour,
      overall: this.overall(c), level: c.player.level, stage: S.id, stageN: S.n,
      fixture: nx ? nx.n : null, fixtures: c.fixtures.length, club: c.club ? this.team(c).name : null, origin: c.origin,
      phase: c.phase, savedAt: new Date().toISOString(),
    };
  },
};

// Stat bonuses from things that aren't base stats: the Wicket Tree's minor
// perks (M06), equipment with its set bonuses (M07) and the coach (M08).
const CareerStats = {
  bonus(c) {
    const out = {};
    const add = (b) => { for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v; };
    if (typeof SkillTree !== 'undefined' && SkillTree.statBonus) add(SkillTree.statBonus(c));
    if (typeof Gear !== 'undefined') add(Gear.statBonus(c));
    if (typeof Coaches !== 'undefined') add(Coaches.statBonus(c));   // the coach (M08)
    return out;
  },
};
