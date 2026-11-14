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
  keyMoments: false,   // M17: play only your big moments, watch the rest (the career's choice, c.keyMoments)
  _kmOver: null,       // { inn, over, live }: whether the over you're bowling is played (decided at its start)

  teamName(side) {
    if (typeof MyXIMatch !== 'undefined' && MyXIMatch.on) return MyXIMatch.teamName(side);
    if ((Match.quick || (typeof MissionMatch !== 'undefined' && MissionMatch.on)) && Match.teams && Match.teams[side] && Match.teams[side].name) return Match.teams[side].name;
    if (this.on && this.career) return side === 'player' ? Career.team(this.career).name : this.fixture.opp.name;
    return T(MATCH_DATA.teams[side].nameKey);
  },
  teamShort(side) {
    if (typeof MyXIMatch !== 'undefined' && MyXIMatch.on) return MyXIMatch.teamName(side).split(' ')[0].slice(0, 3).toUpperCase();
    if (Match.quick && Match.teams && Match.teams[side] && Match.teams[side].name) return Match.teams[side].name.replace(/^The /, '').split(' ')[0].slice(0, 3).toUpperCase();
    if (this.on && this.career) {
      const n = side === 'player' ? Career.team(this.career).name : this.fixture.opp.name;
      return n.split(' ')[0].slice(0, 3).toUpperCase();
    }
    return T(MATCH_DATA.teams[side].shortKey);
  },

  // The career player as a team member (effective stats: form, energy, the
  // Wicket Tree's perks). perks = SkillTree.mods: the duel maths reads them
  // (Duel.perk), so they work in the simulated balls too.
  _playerEntity(c, pos) {
    const p = c.player;
    const ms = SkillTree.matchStats(c, Career.effectiveStats(c), this.fixture, Career.teamRating(c));
    this.matchNotes = ms.notes;
    // One-match boosts: a rival build-up choice (c.matchBuff) and the Rival coach in a boss match.
    const add = (k, v) => { if (ms.stats[k] !== undefined) ms.stats[k] = Math.min(120, ms.stats[k] + v); };
    if (c.matchBuff) { for (const [k, v] of Object.entries(c.matchBuff.stats || {})) add(k, v); this.matchNotes.push('matchBuff'); }
    const rb = Coaches.matchBoost(c, this.fixture);
    if (rb) { for (const k of Object.keys(ms.stats)) add(k, rb); this.matchNotes.push('coach_rival'); }
    return {
      id: 'player' + pos, no: pos, name: p.name, short: p.name.split(' ').length > 1 ? p.name[0] + '. ' + p.name.split(' ').slice(1).join(' ') : p.name,
      role: p.role === 'batter' ? 'bat' : p.role === 'bowler' ? 'bowl' : 'all', keeper: false,
      family: Career.bowls(c) ? p.family : null, leftHanded: p.batHand === 'left', stats: ms.stats, isCareer: true,
      look: { look: c.player.look, facial: c.player.facial, skin: c.player.skin, hairColour: c.player.hairColour, presentation: c.player.presentation },   // (M18: drawn in matches)
      perks: SkillTree.mods(c),
    };
  },

  batPos(c) {
    const tm = Career.team(c);
    let n;
    if (tm && tm.batPos) n = Math.min(c.player.role === 'batter' ? 5 : 11, tm.batPos);
    else n = c.player.role === 'bowler' ? CAREER_DATA.bowlerBatsAt : (CAREER_DATA.battingRoles[c.player.batRole] || 3);
    return Math.max(1, Math.min(11, n + (c.lineupNext || 0)));     // M19: the lineup event moves you for one match
  },

  // Build both sides for a fixture (from the match's seeded 'teams' stream).
  teams(c, fixture) {
    const rng = RNG.stream('teams');
    const club = Teams.generate({ side: 'player', rating: Career.teamRating(c), origin: c.origin, rng });
    const opp = Teams.generate({ side: 'ai', rating: fixture.opp.rating + Difficulty.D(Difficulty.forCareer(c)).opp, origin: c.origin, rng });
    const pos = this.batPos(c);
    club.players[pos - 1] = this._playerEntity(c, pos);
    club.name = Career.team(c).name; opp.name = fixture.opp.name;
    club.kit = { colours: Career.team(c).colours, crest: Career.team(c).crest };       // M18: team colours on the pitch
    opp.kit = { colours: fixture.opp.colours, crest: fixture.opp.crest };
    if (fixture.rival) Rivals.inject(opp, fixture.rival, Rivals.rematchBoost(c, fixture.rival));   // the boss joins their XI (plan 14); stronger in a rematch (M19)
    return { player: club, ai: opp };
  },

  // Start the next fixture. Returns the first scene.
  start(c, slot) {
    const fx = Career.next(c);
    if (!fx) return null;
    if (typeof MissionMatch !== 'undefined') MissionMatch.on = false;
    Tech.end();                                    // (no challenge / My XI techniques left over)
    this.on = true; this.career = c; this.slot = slot; this.fixture = fx;
    this.ticker = []; this.tactic = 'steady';
    this.keyMoments = !!c.keyMoments; this._kmOver = null;
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
      difficulty: Difficulty.forCareer(c),          // chosen between matches (plan 20)
    });
    this.pid = 'player' + this.batPos(c);
    this._assign(c);
    Tech.begin(c);                                  // techniques: charges, stacks, Legend Moment
    // Career matches resolve the toss automatically (plan 7.13).
    const t = Match.flipToss();
    // your side's captain reads the conditions too (M19); as captain (Stage 6+) you can change it on the next screen
    if (t.winner === 'player') t.choice = Match.tossPick(RNG.stream('toss'));
    Match.choose(t.choice);
    c.matchInProgress = { n: fx.n, attempt: fx.attempt };
    c.difficulty.push({ n: fx.n, stage: c.stage, difficulty: Difficulty.forCareer(c) });   // plan 8.25 tracking
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
    const f = Match.fmt, spell = CAREER_DATA.clubs.bowlSpells[(Career.team(c) && Career.team(c).spell) || 'newBall'];
    for (const o of spell) if (o < f.overs && this.assigned.length < f.maxOvers) this.assigned.push(o);
    if (!this.assigned.length) this.assigned.push(0);
  },

  // ---- captaincy (plan 8.12): simple between-over tactic calls in International+ matches ----
  tactic: 'steady',
  isCaptain() { return !!(this.on && this.career && this.career.captain && Career.stage(this.career).n >= 6); },
  tacticFx() { return this.isCaptain() ? CAREER_DATA.captaincy.effects[this.tactic] : null; },
  setTactic(t) { if (CAREER_DATA.captaincy.tactics.includes(t)) this.tactic = t; },

  ctx() { return this.on ? { slot: this.slot, n: this.fixture.n, pid: this.pid, assigned: this.assigned, tech: Tech.snapshot(), keyMoments: this.keyMoments } : null; },

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
      let field = Fielding.aiChoose({ phase: BowlerRules.phase(inn), kind: fam.kind, family: fam.id, wicketsFell: false }, rng);
      const tac = inn.bowlingSide === 'player' && this.tacticFx();
      if (tac && tac.field) field = tac.field;                     // the captain's call sets the field (plan 8.12)
      Match.setBowler(inn, bw.id, field);
    }
    if (inn.battingSide === 'player') {
      const me = Match.batter(inn);
      return me && me.id === this.pid ? 'bat' : null;
    }
    const bw = Match.bowlerOf(inn);
    return bw && bw.id === this.pid ? 'bowl' : null;
  },

  // ---- M17 Job 2: key moments only ----
  // Is this ball of yours a big moment (played), or watched (simulated with the same rules)?
  // kind: 'bat' | 'bowl'. A bowling over is decided once, at its first ball, and stays that way.
  isKeyMoment(inn, kind) {
    const K = CAREER_DATA.keyMoments, f = Match.fmt, over = Math.floor(inn.legal / 6);
    const death = K.deathOvers && over >= f.overs - (f.death || 1);
    const close = (k) => !!(inn.target && k && inn.ballsLeft <= k.balls && inn.need <= inn.ballsLeft * k.maxRate);
    if (inn.isSuper) return true;
    if (kind === 'bat') {
      const me = inn.bat(parseInt(this.pid.replace('player', ''), 10));
      const near = K.nearMilestone.length >= 2 && ((me.runs >= K.nearMilestone[0] && me.runs <= K.nearMilestone[1]) || (me.runs >= K.nearMilestone[2] && me.runs <= K.nearMilestone[3]));
      return me.balls < K.firstBalls || death || close(K.chase) || near;
    }
    const k = this._kmOver;
    if (k && k.inn === inn.index && k.over === over) return k.live;
    const myOvers = inn.overBowlers.filter((id) => id === this.pid).length;      // (this over included)
    const live = (K.firstBallOfSpell && myOvers <= 1) || death || close(K.defend);
    this._kmOver = { inn: inn.index, over, live };
    return live;
  },
  // Who plays the next ball: 'bat' | 'bowl' (you, live) or null (simulated). Key moments only filters liveFor.
  playFor(inn) {
    const l = this.liveFor(inn);
    if (!l || !this.keyMoments) return l;
    return this.isKeyMoment(inn, l) ? l : null;
  },
  // TAKE OVER on the watch screen: every ball of yours is played from now on (this match).
  takeOver() { this.keyMoments = false; },
  // One ball on the watch screen: yours to play (returns 'bat' | 'bowl'), or simulated (returns the sim ball).
  watchBall(inn) {
    const live = this.playFor(inn);
    if (live) return { live };
    const r = this.simBall(inn);
    if (typeof Commentary !== 'undefined') {
      const e = inn.log[inn.log.length - 1];
      const bat = Match.team(inn.battingSide).players[e.b - 1], bowl = Match.team(inn.bowlingSide).players.find((p) => p.id === e.w);
      Commentary.sim(inn, r.b, r.res, bat, bowl);
    }
    return r;
  },

  // The scene for the next ball of the current innings.
  sceneFor(inn) {
    if (inn.ended) return 'careersim';
    const l = this.playFor(inn);
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

  // A catch taken where the career player fields (not in their own overs, not when batting).
  _myCatch(inn, pos) {
    if (!this.on || !pos || inn.bowlingSide !== 'player') return false;
    const bw = Match.bowlerOf(inn);
    return !(bw && bw.id === this.pid) && pos === SeasonGoals.fieldPos();
  },

  // One simulated ball (same rules as the played ones).
  simBall(inn) {
    Match.overStart();
    const ballNo = Math.floor(inn.legal / 6) + '.' + (inn.legal % 6 + 1);
    const bowl = Match.bowlerOf(inn), bat = Match.batter(inn);
    Fielding.setPreset(inn.field, BowlerRules.phase(inn) === 'powerplay');
    Fielding.mods = Duel.fieldMods(Match.team(inn.bowlingSide), Fielding.preset);
    const r = SimMatch._streams('career:' + inn.index);
    const tac = inn.battingSide === 'player' && this.tacticFx();
    const b = SimMatch.ball({ inn, bat, bowl, fatigue: Match.fatigue[bowl.id] || 0, cond: Match.cond,
      fielding: Fielding.mods.fielding, phase: BowlerRules.phase(inn), index: inn.legal, aggression: tac ? tac.aggression : 0 }, r);
    const res = inn.apply({ kind: b.kind, batRuns: b.batRuns, boundary: b.boundary, byes: b.byes, legByes: b.legByes, power: b.shot === 'power', wicket: b.wicket, catcher: b.wicket === 'caught' ? b.fielder : null, myCatch: this._myCatch(inn, b.wicket === 'caught' ? b.fielder : null) });
    if (res.overDone || inn.ended) Match.overDone(inn);
    Fielding.clear();
    const line = { who: bat.short, bowler: bowl.short, sym: res.symbol, how: b.wicket || (b.boundary ? String(b.boundary) : b.kind !== 'legal' ? b.kind : String(b.batRuns)),
      mine: bat.id === this.pid || bowl.id === this.pid, ball: ballNo };
    this.ticker.push(line);
    if (this.ticker.length > 7) this.ticker.shift();
    return { b, res, line };
  },

  // ---- the end of the match ----
  performance() {
    const out = { bat: { batted: false, runs: 0, balls: 0, out: false, fours: 0, sixes: 0 },
      bowl: { bowled: false, balls: 0, runs: 0, wkts: 0, dots: 0, extras: 0 }, catches: 0, won: Match.result && Match.result.winner === 'player' };
    const pos = parseInt(this.pid.replace('player', ''), 10);
    for (const inn of Match.innings) {
      if (inn.battingSide === 'player') {
        const b = inn.bat(pos);
        if (b.balls > 0 || b.out) {
          out.bat.batted = true; out.bat.runs += b.runs; out.bat.balls += b.balls; out.bat.out = out.bat.out || !!b.out;
          out.bat.fours += b.fours || 0; out.bat.sixes += b.sixes || 0;
        }
      } else {
        // Your catches (M17 season goals: see SeasonGoals.fieldPos).
        for (const e of inn.log || []) if (e.mc) out.catches++;
        const f = inn.bowlerFigs[this.pid];
        if (f && f.balls + (f.extras || 0) > 0) {
          out.bowl.bowled = true; out.bowl.balls += f.balls; out.bowl.runs += f.runs; out.bowl.wkts += f.wkts;
          out.bowl.dots += f.dots || 0; out.bowl.extras += f.extras || 0;
        }
      }
    }
    const a = Match.innings[0], b = Match.innings[1];
    out.scoreLine = a && b ? `${a.runs}/${a.wickets} v ${b.runs}/${b.wickets}` : '';
    // Team totals (the tournament table's net run rate): the main innings only.
    for (const inn of [a, b]) {
      if (!inn) continue;
      if (inn.battingSide === 'player') { out.teamRuns = inn.runs; out.teamBalls = inn.legal; } else { out.oppRuns = inn.runs; out.oppBalls = inn.legal; }
    }
    return out;
  },

  // Grade it, apply it to the career, save. Returns the career result summary.
  finish() {
    const c = this.career, fx = this.fixture;
    const perf = this.performance();
    // What you did this match (ball-by-ball): for achievements and the Legacy Traits.
    const mf = MatchFacts.of({ pid: this.pid });
    perf.facts = { ppRuns: mf.ppRuns, spinRuns: mf.spinRuns, paceWickets: mf.paceWickets, newBallWickets: mf.newBallWickets, deathWickets: mf.deathWickets,
      hatTricks: mf.hatTricks, chaseWinNotOut: mf.chaseWinNotOut, closerWin: mf.closerWin };
    const stageId = c.stage;                        // (a final can promote the career, so note the stage first)
    const summary = Career.finishMatch(c, fx, perf);
    // Season goals (M17): add this match, pay the goals reached (the rates when the stage ends).
    const endStage = !!(summary.gate && (summary.gate.result === 'promoted' || summary.gate.result === 'complete'));
    summary.goals = SeasonGoals.afterMatch(c, perf, stageId, endStage);
    if (summary.won && typeof Notify !== 'undefined') Notify.won(Save.data);             // Rule B: ask once, after the first win
    summary.profile = Profile.add(Save.data, PROFILE_DATA.xp.careerMatch, 'career');            // Global Profile Level (M12)
    // Match drops (plan 12.7): sometimes a league match, the Local Final when you win.
    // Duplicates reroll, then turn into Coins (Gear.resolveDrop).
    // M19: every item worn this match counts toward its evolution (plan 12.6)
    for (const id of Object.values(Gear.equipped(c))) Gear.addMatch(Save.data, id);
    summary.drop = Gear.matchDrop(c, Save.data, stageId, fx, summary.grade, summary.won);
    // Salary, contract, sponsor, rival, coach mastery, coach unlocks, events (M08).
    summary.life = CareerLife.afterMatch(c, Save.data, fx, summary, perf, stageId);
    // Achievements (M09): this match, then the career and the account.
    if (summary.grade === 'S') { const L = Achievements.life(Save.data); L.sGrades = (L.sGrades || 0) + 1; }
    const rivalP = fx.rival && summary.life.rival && summary.life.rival.beaten && Match.teams.ai.players.find((p) => p.isRival);
    const meP = Match.teams.player.players.find((p) => p.id === this.pid);
    const extra = rivalP && meP ? { rivalGap: Teams.overall(rivalP) - Teams.overall(meP) } : {};
    const am = Achievements.afterMatch(Save.data, { pid: this.pid }, c, extra);
    summary.achievements = am.got.concat(Achievements.checkCareer(Save.data, c));
    summary.records = am.records || [];                       // M19: new bests for the record book
    summary.perf = perf;
    summary.opp = fx.opp;
    // Techniques used this match count toward their mastery (plan 11.4).
    summary.techUses = Tech.st ? Object.assign({}, Tech.st.uses) : {};
    SkillTree.addMastery(c, summary.techUses);
    Tech.end();
    // Coins go to the global purse (plan 22.1).
    Save.data.currencies.coins = (Save.data.currencies.coins || 0) + summary.coins + summary.goals.coins;
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
    this.keyMoments = !!cp.career.keyMoments; this._kmOver = null;
    Tech.begin(c, cp.career.tech);
    const [scene, params] = Match.restore(cp);
    if (scene === 'matchbreak') return [scene, params];
    return [this.sceneFor(Match.current()), params];
  },
};

// Career slot saving (plan 33): the career object in career.N, its summary
// in the global save for the Career Select screen.
const CareerSave = {
  save(c, slot) {
    if (typeof Achievements !== 'undefined' && Save.data) Achievements.checkCareer(Save.data, c);   // career / account achievements
    if (typeof Meta !== 'undefined' && Save.data) Meta.onCareerSave(Save.data, c);                 // profile XP for stages, mode unlocks (M12)
    return Save.saveCareer(slot, c, Career.summary(c));
  },
  load(slot) {
    return Save.loadCareer(slot).then((c) => {
      if (c) { SkillTree.ensure(c); Gear.ensureCareer(c); if (typeof Achievements !== 'undefined' && Save.data) Achievements.claimBanked(Save.data, c); }
      return c;
    });
  },
  remove(slot) { return Save.saveCareer(slot, null, null); },
};
