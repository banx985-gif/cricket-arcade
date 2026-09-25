// Cricket Arcade — headless ball-by-ball simulation (plan 43A.5 balance
// harness, and later the career's "sim the rest of the innings", plan 7.16).
// It uses the SAME rules as the playable match: the computer bowler's
// delivery choice and release, the AI batter, BallPlay.fate, contact,
// fielding, the throw and running. Nothing is faked to create drama.

const SimMatch = {
  _streams(tag) {
    return {
      bowl: RNG.stream('sim:bowl:' + tag), ai: RNG.stream('sim:ai:' + tag), duel: RNG.stream('sim:duel:' + tag),
      bat: RNG.stream('sim:bat:' + tag), field: RNG.stream('sim:field:' + tag),
    };
  },

  // One ball, computer against computer.
  // s: { inn, bat, bowl, fatigue, cond, fielding (avg stat), phase, index }
  ball(s, r) {
    const bowl = s.bowl, bat = s.bat;
    const ch = Bowling.aiChoose(bowl, { phase: s.phase, fatigue: s.fatigue }, r.bowl);
    const del = Bowling.release({ bowler: bowl, family: bowl.family, typeIdx: ch.typeIdx, target: ch.target,
      grade: ch.grade, power: ch.power, fatigue: s.fatigue, cond: s.cond, index: s.index || 0 }, r.bowl);
    const A = MATCH_DATA.aiBowler;
    const accK = 1 - PLAYER_DATA.duel.aiExtras.accuracy * Teams.n(bowl.stats.accuracy);
    const roll = r.bowl.next();
    const noBall = roll < A.noBallChance * accK;
    if (BallPlay.isWide(del) || (!noBall && roll < (A.noBallChance + A.wideChance) * accK)) return { kind: 'wide', del };
    const kind = noBall ? 'noball' : 'legal';
    const freeHit = s.inn.freeHit || noBall;

    const dec = AIBatter.decide(del, {
      releaseGrade: ch.grade, pressure: Duel.pressure(s.inn), freeHit, timingBias: del.timingBias,
      bat, bowl, fatigue: s.fatigue,
    }, r.ai);
    const tIdeal = del.sim.contactIdx * CONFIG.PHYSICS_STEP;
    const at = del.sim.path.at(tIdeal, {});
    let grade = dec.leave ? 'miss' : Contact.grade(dec.shot, dec.err);
    if (!dec.leave && grade !== 'miss' && !Contact.inReach(at)) grade = 'miss';
    const f = BallPlay.fate({ del, shotId: dec.shot || 'leave', grade, left: !!dec.leave, bat, bowl, releaseGrade: ch.grade }, r.duel);
    const out = { kind, del, batRuns: 0, boundary: 0, wicket: null, shot: dec.shot || 'leave', grade, fate: f.kind };
    if (f.kind !== 'contact') {
      if (f.result === 'lbw' || f.result === 'bowled' || f.result === 'hitwicket') out.wicket = f.result;
      return out;
    }
    const pos = del.sim.path.at(Math.min(tIdeal + Math.max(0, dec.err), tIdeal + 0.035), {});
    const c = Contact.resolve({ shotId: dec.shot, grade, err: dec.err, aim: dec.aim, ball: pos, mods: BallPlay.mods(bat, bowl, dec.shot) }, r.bat);
    const plan = Fielding.resolve(pos, c, dec.shot, r.field);
    if (plan.result === 'six' || plan.result === 'four') { out.boundary = plan.runs; return out; }
    if (plan.result === 'caught') { out.wicket = 'caught'; return out; }
    // Fielded: the throw, and the batters run.
    const n = plan.path.n - 1;
    const from = { x: plan.path.x[n], y: 1.2, z: plan.path.z[n] };
    const t0 = Math.max(plan.endT, plan.fieldT || 0) + MATCH_DATA.running.pickupTime;
    const tg = Throw.aiGrade(s.fielding, r.field);
    const th = Throw.make(from, t0, tg);
    const res = this.run(from, t0, th, bat, r.ai);
    out.batRuns = res.completed;
    out.throwGrade = tg;
    if (res.runOut) out.wicket = 'runout';
    return out;
  },

  // Computer batters running against a throw. Returns the Running when settled.
  run(from, t0, th, bat, rng) {
    const T = MATCH_DATA.throw;
    const ok = Throw.make(from, t0, 'okay'), pf = Throw.make(from, t0, 'perfect');
    const run = new Running(Infinity, { safe: pf.returnT, tight: ok.returnT }, Duel.runTimeMult(bat));
    const expect = ok.t1 + T.keeperDelay * MATCH_DATA.aiRunning.expectKeeper;
    const want = Running.aiPlan(expect, rng, run.runTime);
    for (let i = 0; i < want; i++) run.run(0);
    let stole = false;
    for (let t = 0; t < 30; t += 0.02) {
      if (t >= th.t1 && run.returnT === Infinity) run.setReturn(th.returnT, th.grade === 'bad');
      if (run.overthrow && !stole) { stole = true; run.aiSteal(t); }
      if (run.update(t)) break;
    }
    return run;
  },

  // A whole innings. o: { inn, batting (team), bowling (team), fmt, fatigue, cond, tag }
  innings(o) {
    const inn = o.inn, r = this._streams(o.tag || inn.index);
    const fieldMods = Duel.fieldMods(o.bowling);
    let lastWkts = 0;
    while (!inn.ended) {
      if (inn.legal % 6 === 0 && (inn.overBowlers || []).length === inn.legal / 6) {
        const bw = BowlerRules.aiPick(inn, o.bowling, o.fatigue, r.bowl, o.fmt);
        inn.overBowlers.push(bw.id);
        const ph = BowlerRules.phase(inn, o.fmt);
        const fam = Bowling.family(bw.family);
        Fielding.setPreset(Fielding.aiChoose({ phase: ph, kind: fam.kind, family: fam.id, wicketsFell: inn.wickets > lastWkts }, r.field), ph === 'powerplay');
        Fielding.mods = Duel.fieldMods(o.bowling, Fielding.preset);
        lastWkts = inn.wickets;
      }
      const bowlerId = inn.overBowlers[inn.overBowlers.length - 1];
      const bowl = o.bowling.players.find((p) => p.id === bowlerId);
      const bat = o.batting.players[inn.striker - 1];
      const b = this.ball({ inn, bat, bowl, fatigue: o.fatigue[bowlerId] || 0, cond: o.cond,
        fielding: fieldMods.fielding, phase: BowlerRules.phase(inn, o.fmt), index: inn.legal }, r);
      const res = inn.apply({ kind: b.kind, batRuns: b.batRuns, boundary: b.boundary, wicket: b.wicket });
      if (o.onBall) o.onBall(b, res);
      if (res.overDone) BowlerRules.overDone(o.fatigue, o.bowling, bowlerId, 0);
    }
    Fielding.clear();
    return inn;
  },

  // A whole match between two teams (no Super Over: a tie counts as a tie).
  match(a, b, fmtId, seed, onBall) {
    RNG.begin(seed);
    const fmt = MATCH_DATA.formats[fmtId];
    const cond = { pitch: 'balanced', weather: 'clear' };
    const fatigue = {};
    const i1 = this.innings({ inn: new Innings({ index: 0, battingSide: 'player', overs: fmt.overs, wickets: fmt.wickets }),
      batting: a, bowling: b, fmt, fatigue, cond, tag: 'a', onBall });
    const i2 = this.innings({ inn: new Innings({ index: 1, battingSide: 'ai', overs: fmt.overs, wickets: fmt.wickets, target: i1.runs + 1 }),
      batting: b, bowling: a, fmt, fatigue, cond, tag: 'b', onBall });
    return { a: i1.runs, b: i2.runs, winner: i1.runs > i2.runs ? 'a' : i2.runs > i1.runs ? 'b' : 'tie', i1, i2 };
  },
};
