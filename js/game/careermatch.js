// Cricket Arcade — Career matches (plan 8.23). The M03 match engine, with the
// career player at the centre:
//   Batter      the innings simulates until you're on strike; you play while
//               you're facing; the rest fast-sims (and after you're out)
//   Bowler      you bowl your assigned overs; the other overs simulate
//   All-Rounder both
// The simulated balls use the same rules as the played ones (SimMatch.ball).
// CareerMatch.route() decides, before every ball, whether it's played live
// (matchbat / matchbowl) or simulated (careersim).

const CareerMatch = {
  on: false,
  career: null,        // the career object (saved in its slot)
  slot: 0,
  fixture: null,       // the fixture being played
  pid: null,           // the career player's id in the team ('player' + batting position)
  assigned: [],        // over numbers the career player bowls (0-based)
  ticker: [],          // recent simulated balls (for the fast-sim screen)

  teamName(side) {
    if (this.on && this.career) return side === 'player' ? this.career.club.name : this.fixture.opp.name;
    return T(MATCH_DATA.teams[side].nameKey);
  },
  teamShort(side) {
    if (this.on && this.career) {
      const n = side === 'player' ? this.career.club.name : this.fixture.opp.name;
      return n.split(' ')[0].slice(0, 3).toUpperCase();
    }
    return T(MATCH_DATA.teams[side].shortKey);
  },

  // The career player as a team member (effective stats: form, energy, the
  // Wicket Tree's perks). perks = SkillTree.mods: the duel maths reads them
  // (Duel.perk), so they work in the simulated balls too.
  _playerEntity(c, pos) {
    const p = c.player;
    const ms = SkillTree.matchStats(c, Career.effectiveStats(c), this.fixture, Career.stage(c).teamRating);
    this.matchNotes = ms.notes;
    return {
      id: 'player' + pos, no: pos, name: p.name, short: p.name.split(' ').length > 1 ? p.name[0] + '. ' + p.name.split(' ').slice(1).join(' ') : p.name,
      role: p.role === 'batter' ? 'bat' : p.role === 'bowler' ? 'bowl' : 'all', keeper: false,
      family: Career.bowls(c) ? p.family : null, leftHanded: p.batHand === 'left', stats: ms.stats, isCareer: true,
      perks: SkillTree.mods(c),
    };
  },

  batPos(c) {
    if (c.club && c.club.batPos) return Math.min(c.player.role === 'batter' ? 5 : 11, c.club.batPos);
    return c.player.role === 'bowler' ? CAREER_DATA.bowlerBatsAt : (CAREER_DATA.battingRoles[c.player.batRole] || 3);
  },

  // Build both sides for a fixture (from the match's seeded 'teams' stream).
  teams(c, fixture) {
    const S = Career.stage(c), rng = RNG.stream('teams');
    const club = Teams.generate({ side: 'player', rating: S.teamRating, origin: c.origin, rng });
    const opp = Teams.generate({ side: 'ai', rating: fixture.opp.rating, origin: c.origin, rng });
    const pos = this.batPos(c);
    club.players[pos - 1] = this._playerEntity(c, pos);
    club.name = c.club.name; opp.name = fixture.opp.name;
    return { player: club, ai: opp };
  },

  // Start the next fixture. Returns the first scene.
  start(c, slot) {
    const fx = Career.next(c);
    if (!fx) return null;
    this.on = true; this.career = c; this.slot = slot; this.fixture = fx;
    this.ticker = [];
    fx.attempt = (fx.attempt || 0) + 1;
    const S = Career.stage(c);
    const fmt = Dev.matchFormat || S.format;
    const seed = (fx.seed + fx.attempt * 7919) >>> 0;
    // Conditions: the origin's home weighting (plan 8.5).
    const O = ORIGIN_PACKS.origins[c.origin];
    Match.start(fmt, {
      seed,
      teams: (m) => this.teams(c, fx),
      cond: (cr) => {
        const pitchKey = { hardFast: 'hardFast' };
        const pick = (w) => cr.weighted(Object.entries(w).map(([id, weight]) => ({ id: pitchKey[id] || id, weight }))).id;
        return { stadium: STADIUM_DATA.defaultStadium, pitch: pick(O.pitchWeights), weather: pick(O.weatherWeights) };
      },
      career: true,
    });
    this.pid = 'player' + this.batPos(c);
    this._assign(c);
    Tech.begin(c);                                  // techniques: charges, stacks, Legend Moment
    // Career matches resolve the toss automatically (plan 7.13).
    const t = Match.flipToss();
    if (t.winner === 'player') t.choice = RNG.stream('toss').chance(0.5) ? 'bat' : 'bowl';
    Match.choose(t.choice);
    c.matchInProgress = { n: fx.n, attempt: fx.attempt };
    c.difficulty.push({ n: fx.n, stage: c.stage, difficulty: 'normal' });   // plan 8.25 tracking
    CareerSave.save(c, slot);                                                // autosave before entering a match
    Log.add('career', `fixture ${fx.n} v ${fx.opp.name} (${fmt}) toss ${t.winner} ${t.choice}`);
    return 'careerprematch';
  },

  // The loadout / tree changed on the pre-match screen (no ball bowled yet):
  // rebuild the career player's match entity and the technique state.
  refreshPlayer() {
    if (!this.on || !Match.teams) return;
    const pos = parseInt(this.pid.replace('player', ''), 10);
    Match.teams.player.players[pos - 1] = this._playerEntity(this.career, pos);
    Tech.begin(this.career);
  },

  // Which overs the career player bowls (from the club's spell: new ball,
  // first change or death). Never two in a row.
  _assign(c) {
    this.assigned = [];
    if (!Career.bowls(c)) return;
    const f = Match.fmt, spell = CAREER_DATA.clubs.bowlSpells[(c.club && c.club.spell) || 'newBall'];
    for (const o of spell) if (o < f.overs && this.assigned.length < f.maxOvers) this.assigned.push(o);
    if (!this.assigned.length) this.assigned.push(0);
  },

  ctx() { return this.on ? { slot: this.slot, n: this.fixture.n, pid: this.pid, assigned: this.assigned, tech: Tech.snapshot() } : null; },

  // ---- routing: live or simulated? ----
  // Sets the bowler at the start of an over (career side: the assignment;
  // otherwise the computer's pick), then says who plays the next ball.
  liveFor(inn) {
    if (inn.ended) return null;
    const over = Math.floor(inn.legal / 6);
    if (Match.needsBowler(inn)) {
      const team = Match.team(inn.bowlingSide), rng = RNG.stream('aiPick:' + inn.index);
      let bw = null;
      const mine = inn.bowlingSide === 'player' && team.players.some((p) => p.id === this.pid && p.family);
      if (mine && (inn.isSuper || this.assigned.includes(over)) && BowlerRules.canBowl(inn, team, this.pid)) bw = team.players.find((p) => p.id === this.pid);
      if (!bw) {
        const others = Object.assign({}, team, { players: team.players.filter((p) => p.id !== this.pid || !mine) });
        bw = BowlerRules.aiPick(inn, others, Match.fatigue, rng);
      }
      const fam = Bowling.family(bw.family);
      const field = Fielding.aiChoose({ phase: BowlerRules.phase(inn), kind: fam.kind, family: fam.id, wicketsFell: false }, rng);
      Match.setBowler(inn, bw.id, field);
    }
    if (inn.battingSide === 'player') {
      const me = Match.batter(inn);
      return me && me.id === this.pid ? 'bat' : null;
    }
    const bw = Match.bowlerOf(inn);
    return bw && bw.id === this.pid ? 'bowl' : null;
  },

  // The scene for the next ball of the current innings.
  sceneFor(inn) {
    if (inn.ended) return 'careersim';
    const l = this.liveFor(inn);
    return l === 'bat' ? 'matchbat' : l === 'bowl' ? 'matchbowl' : 'careersim';
  },

  // Called by the live scenes before each ball. Returns true if it moved on
  // to another scene (the scene should stop setting up the ball).
  route(sceneName) {
    if (!this.on) return false;
    const inn = Match.current();
    const want = this.sceneFor(inn);
    if (want === sceneName) return false;
    Scenes.go(want);
    return true;
  },

  // One simulated ball (same rules as the played ones).
  simBall(inn) {
    Match.overStart();
    const bowl = Match.bowlerOf(inn), bat = Match.batter(inn);
    Fielding.setPreset(inn.field, BowlerRules.phase(inn) === 'powerplay');
    Fielding.mods = Duel.fieldMods(Match.team(inn.bowlingSide), Fielding.preset);
    const r = SimMatch._streams('career:' + inn.index);
    const b = SimMatch.ball({ inn, bat, bowl, fatigue: Match.fatigue[bowl.id] || 0, cond: Match.cond,
      fielding: Fielding.mods.fielding, phase: BowlerRules.phase(inn), index: inn.legal }, r);
    const res = inn.apply({ kind: b.kind, batRuns: b.batRuns, boundary: b.boundary, wicket: b.wicket });
    if (res.overDone || inn.ended) Match.overDone(inn);
    Fielding.clear();
    const line = { who: bat.short, bowler: bowl.short, sym: res.symbol, how: b.wicket || (b.boundary ? String(b.boundary) : b.kind !== 'legal' ? b.kind : String(b.batRuns)),
      mine: bat.id === this.pid || bowl.id === this.pid };
    this.ticker.push(line);
    if (this.ticker.length > 8) this.ticker.shift();
    return { b, res, line };
  },

  // ---- the end of the match ----
  performance() {
    const out = { bat: { batted: false, runs: 0, balls: 0, out: false, fours: 0, sixes: 0 },
      bowl: { bowled: false, balls: 0, runs: 0, wkts: 0, dots: 0, extras: 0 }, won: Match.result && Match.result.winner === 'player' };
    const pos = parseInt(this.pid.replace('player', ''), 10);
    for (const inn of Match.innings) {
      if (inn.battingSide === 'player') {
        const b = inn.bat(pos);
        if (b.balls > 0 || b.out) {
          out.bat.batted = true; out.bat.runs += b.runs; out.bat.balls += b.balls; out.bat.out = out.bat.out || !!b.out;
          out.bat.fours += b.fours || 0; out.bat.sixes += b.sixes || 0;
        }
      } else {
        const f = inn.bowlerFigs[this.pid];
        if (f && f.balls + (f.extras || 0) > 0) {
          out.bowl.bowled = true; out.bowl.balls += f.balls; out.bowl.runs += f.runs; out.bowl.wkts += f.wkts;
          out.bowl.dots += f.dots || 0; out.bowl.extras += f.extras || 0;
        }
      }
    }
    const a = Match.innings[0], b = Match.innings[1];
    out.scoreLine = a && b ? `${a.runs}/${a.wickets} v ${b.runs}/${b.wickets}` : '';
    return out;
  },

  // Grade it, apply it to the career, save. Returns the career result summary.
  finish() {
    const c = this.career, fx = this.fixture;
    const perf = this.performance();
    const summary = Career.finishMatch(c, fx, perf);
    summary.perf = perf;
    summary.opp = fx.opp;
    // Techniques used this match count toward their mastery (plan 11.4).
    summary.techUses = Tech.st ? Object.assign({}, Tech.st.uses) : {};
    SkillTree.addMastery(c, summary.techUses);
    Tech.end();
    // Coins go to the global purse (plan 22.1).
    Save.data.currencies.coins = (Save.data.currencies.coins || 0) + summary.coins;
    CareerSave.save(c, this.slot);                  // autosave after match completion
    Save.clearResume();
    this.on = false;
    Log.add('career', `fixture ${fx.n} graded ${summary.grade} (${summary.score}) selection ${c.selection}`);
    return summary;
  },

  // Play every remaining ball headless, the career player included (tests,
  // and the developer panel's "sim the rest"). Leaves Match finished.
  autoPlay() {
    if (!Match.innings.length) Match.startInnings();
    for (let guard = 0; guard < 5000 && !Match.over; guard++) {
      const inn = Match.current();
      if (inn.ended) {
        if (Match.afterInnings().next === 'result') break;
        Match.startInnings();
        continue;
      }
      this.liveFor(inn);
      this.simBall(inn);
    }
  },

  // Leave a match part-way (pause -> Career Home). The resume checkpoint stays.
  leave() { this.on = false; },

  // Back into a match from a resume checkpoint (title screen or Play Next).
  async resumeFrom(cp) {
    const c = await CareerSave.load(cp.career.slot);
    if (!c) throw new Error('career slot ' + cp.career.slot + ' is empty');
    this.career = c; this.slot = cp.career.slot; this.pid = cp.career.pid; this.assigned = cp.career.assigned;
    this.fixture = c.fixtures.find((f) => f.n === cp.career.n);
    if (!this.fixture) throw new Error('fixture ' + cp.career.n + ' not found');
    this.on = true; this.ticker = [];
    Tech.begin(c, cp.career.tech);
    const [scene, params] = Match.restore(cp);
    if (scene === 'matchbreak') return [scene, params];
    return [this.sceneFor(Match.current()), params];
  },
};

// Career slot saving (plan 33): the career object in career.N, its summary
// in the global save for the Career Select screen.
const CareerSave = {
  save(c, slot) { return Save.saveCareer(slot, c, Career.summary(c)); },
  load(slot) { return Save.loadCareer(slot).then((c) => { if (c) SkillTree.ensure(c); return c; }); },
  remove(slot) { return Save.saveCareer(slot, null, null); },
};
