// Cricket Arcade — career events, sponsors, rivals and the after-match extras
// (M08, plan 8.16, 8.17, 5.9, 14). Pure: no drawing. Data in EVENT_DATA.
//
// On the career save:
//   c.pendingEvent   { id } | { rival: id, n } — shown as a panel on Career Home
//   c.sponsor        { id, left, have, need } — an active sponsor deal
//   c.matchBuff      { stats } — a one-match boost (rival build-up), cleared after the match
//   c.hooks.rivals   id -> { met, beaten, tries }   (flags for later stages)
//   c.hooks.events   { last, log: [id:choice] }
// Account-wide: save.collection.rivals id -> date first beaten (rewards once per account).
// Events never block progression: every panel can be skipped.

const Events = {
  event(id) { return EVENT_DATA.events.find((e) => e.id === id) || null; },

  // Events this career could get now.
  eligible(c) {
    const S = Career.stage(c), last = c.hooks && c.hooks.events && c.hooks.events.last;
    return EVENT_DATA.events.filter((e) => {
      if (e.special || e.id === last || S.n < e.minStage) return false;
      if (e.once && c.hooks && c.hooks.events && (c.hooks.events.log || []).some((x) => x.startsWith(e.id + ':'))) return false;   // M19: once per career
      if (e.sponsor && (!S.sponsors || c.sponsor)) return false;
      const w = e.when || {};
      if (w.energyBelow !== undefined && c.energy >= w.energyBelow) return false;
      if (w.form && !w.form.includes(c.form)) return false;
      return true;
    });
  },
  // After a match: maybe set a pending event (seeded). force: always (dev panel).
  roll(c, force) {
    if (c.pendingEvent || c.phase !== 'season') return null;
    return Career.roll(c, (r) => {
      if (!force && !r.chance(EVENT_DATA.chance)) return null;
      const list = this.eligible(c);
      if (!list.length) return null;
      const e = r.weighted(list.map((x) => ({ id: x.id, weight: x.weight || 1 }))).id;
      c.pendingEvent = { id: e };
      if (this.event(e).sponsor) c.pendingEvent.offer = Sponsors.pick(c, r);
      return c.pendingEvent;
    });
  },

  // Make a choice (or skip: choiceId null). Returns { fx, text } for the panel.
  choose(c, save, choiceId) {
    const p = c.pendingEvent;
    if (!p) return null;
    c.pendingEvent = null;
    c.hooks.events = c.hooks.events || { log: [] };
    c.hooks.events.log = c.hooks.events.log || [];
    let fx = {};
    if (p.rival) {
      const R = Rivals.rival(p.rival), ch = choiceId && R.buildUp.find((b) => b.id === choiceId);
      if (ch) fx = ch.fx;
      const fxt = c.fixtures.find((f) => f.n === p.n);
      if (fxt) fxt.rivalIntro = true;
      c.hooks.events.log.push('rival_' + p.rival + ':' + (choiceId || 'skip'));
    } else {
      const E = this.event(p.id), ch = choiceId && E.choices.find((x) => x.id === choiceId);
      if (ch) fx = ch.fx;
      c.hooks.events.last = p.id;
      c.hooks.events.log.push(p.id + ':' + (choiceId || 'skip'));
      if (fx.sponsor && p.offer) Sponsors.sign(c, p.offer);
    }
    return { fx, applied: this.apply(c, save, fx) };
  },

  // Apply effects. Returns a list of { k, n } that actually changed (for the panel).
  apply(c, save, fx) {
    const out = [], F = CAREER_DATA.form.levels;
    if (fx.energy) { const b = c.energy; c.energy = Math.max(0, Math.min(CAREER_DATA.energy.max, c.energy + fx.energy)); out.push({ k: 'energy', n: c.energy - b }); }
    if (fx.selection) { const b = c.selection; c.selection = Math.max(0, Math.min(CAREER_DATA.selection.max, c.selection + fx.selection)); out.push({ k: 'selection', n: c.selection - b }); }
    if (fx.xp) { Career.addXp(c, fx.xp); out.push({ k: 'xp', n: fx.xp }); }
    if (fx.coins && save) { save.currencies.coins = (save.currencies.coins || 0) + fx.coins; out.push({ k: 'coins', n: fx.coins }); }
    if (fx.form) { const i = F.indexOf(c.form), j = Math.max(0, Math.min(F.length - 1, i + fx.form)); c.form = F[j]; out.push({ k: 'form', n: j - i }); }
    if (fx.stat) {
      const key = fx.stat.key === 'best' ? Career.archetype(c.player.role, c.player.archetype).key[0] : fx.stat.key;
      c.player.stats[key] = Math.min(CAREER_DATA.statMax, c.player.stats[key] + fx.stat.n);
      out.push({ k: 'stat', stat: key, n: fx.stat.n });
    }
    if (fx.match) { c.matchBuff = { stats: Object.assign({}, fx.match.stats) }; out.push({ k: 'match', stats: fx.match.stats }); }
    if (fx.captain) { c.captain = { stage: c.stage, since: (c.history || []).length }; out.push({ k: 'captain', n: 1 }); }
    // M19: where you bat next match (+ = lower down the order)
    if (fx.lineup) { c.lineupNext = fx.lineup; out.push({ k: 'lineup', n: fx.lineup }); }
    // M19: the craftsman makes a piece you don't own (seeded), if you can pay
    if (fx.craft && save) {
      const C = save.currencies, cost = fx.craft.cost;
      if ((C.coins || 0) < cost) out.push({ k: 'craftNoCoins', n: cost });
      else {
        const tier = Career.stage(c).n, pool = EQUIPMENT_DATA.items.filter((it) => EVENT_DATA.craft.rarities.includes(it.rarity) && it.tier <= tier && !it.evo && !Gear.cosmetic(it) && !Gear.owns(save, it.id));
        if (!pool.length) out.push({ k: 'craftNone', n: 0 });
        else {
          const id = Career.roll(c, (r) => r.pick(pool).id);
          C.coins -= cost; Gear.grant(save, id, 'event');
          out.push({ k: 'coins', n: -cost }, { k: 'item', item: id });
        }
      }
    }
    // M19: the hidden master's challenge is on for the next match
    if (fx.hiddenMaster) { c.hiddenMaster = { objective: Object.assign({}, EVENT_DATA.hiddenMaster.objective[c.player.role === 'batter' ? 'bat' : c.player.role === 'bowler' ? 'bowl' : 'all']) }; out.push({ k: 'hiddenMaster', n: 1 }); }
    return out;
  },
  // Coach chains (M19, plan 13): the next lesson of your coach's chain, once their mastery is high enough.
  // Each lesson shows once per account (a "later" still counts as seen). Returns the pending event or null.
  chainDue(c, save) {
    const k = Coaches.active(c);
    if (!k || c.pendingEvent) return null;
    const S = Coaches.store(save), done = S.chain = S.chain || {}, step = (done[k] || 0) + 1;
    if (step > 3 || Coaches.level(save, k) < EVENT_DATA.chainLevels[step - 1]) return null;
    done[k] = step;
    c.pendingEvent = { id: 'coach_' + k + '_' + step };
    return c.pendingEvent;
  },
  // After the next match: the hidden master's verdict. Returns { met, technique } or null.
  hiddenMasterAfter(c, save, perf) {
    const H = c.hiddenMaster;
    if (!H) return null;
    c.hiddenMaster = null;
    const o = H.objective;
    const met = o.id === 'runs' ? (perf.bat.runs || 0) >= o.n : o.id === 'wickets' ? (perf.bowl.wkts || 0) >= o.n : false;
    const out = { met, objective: o };
    if (met) {
      const t = EVENT_DATA.hiddenMaster.techniques.find((id) => !SkillTree.discovered(save, id)) || EVENT_DATA.hiddenMaster.techniques[0];
      SkillTree.discover(save, t);
      out.technique = t;
      save.collection = save.collection || {};
      save.collection.hiddenMaster = save.collection.hiddenMaster || new Date().toISOString().slice(0, 10);
    }
    return out;
  },
};

// ---- sponsors (plan 8.16) ----
const Sponsors = {
  sponsor(id) { return EVENT_DATA.sponsors.find((s) => s.id === id) || null; },
  // An offer that suits this career's role (rng: the career stream).
  pick(c, r) {
    const bat = c.player.role !== 'bowler', bowl = Career.bowls(c);
    const list = EVENT_DATA.sponsors.filter((s) => s.for === 'all' || (s.for === 'bat' && bat) || (s.for === 'bowl' && bowl));
    return r.pick(list).id;
  },
  sign(c, id) {
    const S = this.sponsor(id);
    c.sponsor = { id, left: S.fixtures, have: 0, need: S.n };
    return c.sponsor;
  },
  // A match's contribution to a goal.
  measure(S, perf, grade) {
    switch (S.goal) {
      case 'boundaries': return (perf.bat.fours || 0) + (perf.bat.sixes || 0);
      case 'runs': return perf.bat.runs || 0;
      case 'wickets': return perf.bowl.wkts || 0;
      case 'dots': return perf.bowl.dots || 0;
      case 'wins': return perf.won ? 1 : 0;
      case 'grade': return Career.gradeAtLeast(grade, S.min) ? 1 : 0;
      default: return 0;
    }
  },
  // After a match. Pays the reward when done. Returns { id, done, failed, have, need, reward } or null.
  afterMatch(c, save, perf, grade) {
    const d = c.sponsor;
    if (!d) return null;
    const S = this.sponsor(d.id);
    d.have += this.measure(S, perf, grade);
    d.left--;
    const out = { id: d.id, have: d.have, need: d.need };
    if (d.have >= d.need) {
      out.done = true;
      out.reward = this.pay(save, S.reward);
      c.sponsor = null;
      c.hooks.sponsors = c.hooks.sponsors || {};
      c.hooks.sponsors[d.id] = (c.hooks.sponsors[d.id] || 0) + 1;
    } else if (d.left <= 0) { out.failed = true; c.sponsor = null; }
    return out;
  },
  // A reward: Coins, or a gear item (its duplicate Coins if already owned).
  pay(save, reward) {
    if (reward.coins) { save.currencies.coins = (save.currencies.coins || 0) + reward.coins; return { coins: reward.coins }; }
    if (reward.item) {
      if (Gear.grant(save, reward.item, 'event')) return { item: reward.item };
      const coins = Gear.rarity(Gear.item(reward.item)).dupCoins;
      save.currencies.coins = (save.currencies.coins || 0) + coins;
      return { dup: reward.item, coins };
    }
    return {};
  },
};

// ---- rivals (plan 14) ----
const Rivals = {
  rival(id) { return EVENT_DATA.rivals.find((r) => r.id === id) || null; },
  flags(c) { c.hooks.rivals = c.hooks.rivals || {}; return c.hooks.rivals; },
  beatenOnAccount(save, id) { return !!(save && save.collection && save.collection.rivals && save.collection.rivals[id]); },
  // The rival scheduled for this fixture (by number in the stage, or by kind: 'final', 'quarter').
  forFixture(stage, n, kind) {
    const list = [].concat(stage.rival || []);
    const hit = list.find((x) => (x.n !== undefined && x.n === n && !x.kind) || (x.kind && x.kind === kind));
    return hit ? hit.id : null;
  },
  // A rematch (M19): stronger for every earlier meeting this career.
  rematchBoost(c, id) { const f = c && c.hooks && c.hooks.rivals && c.hooks.rivals[id]; return f ? f.tries * EVENT_DATA.rematchBoost : 0; },
  // Different rivals this career has beaten.
  beatenCount(c) { return Object.values((c.hooks && c.hooks.rivals) || {}).filter((f) => f.beaten).length; },
  // The boss objective for this career's role.
  objective(c, id) {
    const O = this.rival(id).objective, role = c.player.role;
    return Object.assign({}, role === 'batter' ? O.bat : role === 'bowler' ? O.bowl : O.all);
  },
  // Put the rival into the other side's XI (a boosted player at their slot).
  inject(team, id, extra) {
    const R = this.rival(id), i = Math.min(team.players.length, R.slot) - 1, p = team.players[i], boost = R.boost + (extra || 0);
    p.name = T('rival.' + id); p.short = T('rival.' + id + '.short');
    p.isRival = id;
    for (const k of R.stats) p.stats[k] = Math.min(99, p.stats[k] + boost);
    if (R.family && p.family) p.family = R.family;
    p.overall = Teams.overall(p);
    return p;
  },
  // Career Home: the build-up event before a rival fixture (once).
  pendingFor(c) {
    const nx = Career.next(c);
    if (!nx || !nx.rival || nx.rivalIntro || c.pendingEvent) return null;
    c.pendingEvent = { rival: nx.rival, n: nx.n };
    return c.pendingEvent;
  },
  // After a rival fixture. Beaten = the boss objective met.
  // Returns { id, beaten, first, token, reward }.
  afterMatch(c, save, fixture, objectiveMet) {
    const id = fixture.rival, F = this.flags(c), f = F[id] = F[id] || { met: true, beaten: false, tries: 0 };
    f.tries++;
    const out = { id, beaten: !!objectiveMet };
    if (!objectiveMet) return out;
    if (!f.beaten) { SkillTree.rivalWin(c); out.token = true; }         // +1 Skill Token, once per rival per career
    f.beaten = true;
    save.collection = save.collection || {};
    const acc = save.collection.rivals = save.collection.rivals || {};
    if (!acc[id]) {
      acc[id] = new Date().toISOString().slice(0, 10);
      out.first = true;
      out.reward = this.giveReward(save, this.rival(id).reward);
    }
    const rc = Coaches.unlockForRival(save);
    if (rc.length) out.coachUnlocked = rc;
    return out;
  },
  // A reward can have several parts (the Champion: an item and a coach).
  giveReward(save, rw) {
    const out = {};
    if (rw.coach) { Coaches.unlock(save, rw.coach); out.coach = rw.coach; }
    if (rw.item) { Gear.grant(save, rw.item, 'rival'); out.item = rw.item; }
    if (rw.technique) { SkillTree.discover(save, rw.technique); out.technique = rw.technique; }
    return out;
  },
};

// ---- everything else that happens after a career match (called by CareerMatch.finish) ----
// Salary, the contract objective, the sponsor deal, the rival result, coach
// mastery, coach unlocks on promotion, and maybe an event. Returns lines for
// the result screen.
const CareerLife = {
  afterMatch(c, save, fixture, summary, perf, stageId) {
    const out = {};
    // franchise salary (plan 8.10): per completed franchise match
    if (c.contract && stageId === 'franchise') {
      out.salary = c.contract.salary;
      save.currencies.coins = (save.currencies.coins || 0) + c.contract.salary;
      const P = c.contract.progress;
      P.runs += perf.bat.runs || 0; P.wickets += perf.bowl.wkts || 0; P.sixes += perf.bat.sixes || 0;
      if (Career.gradeAtLeast(summary.grade, 'A')) P.gradeA++;
      if (!c.contract.done && c.tour && c.tour.phase === 'done') out.contract = this.contractEnd(c, save);
    }
    if (c.sponsor) out.sponsor = Sponsors.afterMatch(c, save, perf, summary.grade);
    if (c.hiddenMaster) out.hiddenMaster = Events.hiddenMasterAfter(c, save, perf);    // M19
    c.lineupNext = 0;                                                                     // (one match only)
    if (fixture.rival) out.rival = Rivals.afterMatch(c, save, fixture, summary.objectiveMet);
    const coach = Coaches.active(c);
    if (coach) Coaches.addUse(save, coach, 1);
    if (summary.gate && summary.gate.result === 'promoted') {
      out.coachesUnlocked = Coaches.unlockForStage(save, Career.stage(c).n);
    } else if (c.phase === 'season') {
      if (this.captaincyDue(c, stageId)) { c.pendingEvent = { id: 'captaincy_offer' }; c.captainOffered = true; out.captaincyOffer = true; }
      else if (!Events.chainDue(c, save)) Events.roll(c);
    }
    return out;
  },
  // Plan 8.12: exceptional International careers are offered the captaincy (once).
  captaincyDue(c, stageId) {
    const S = CAREER_DATA.stages.find((x) => x.id === stageId), K = CAREER_DATA.captaincy;
    if (!S || !S.captaincy || c.captain || c.captainOffered || c.stage !== stageId) return false;
    const here = c.history.filter((h) => h.stage === stageId);
    if (here.length < K.afterMatches) return false;
    const good = here.filter((h) => h.grade === 'A' || h.grade === 'S').length;
    return good >= K.gradesA || Career.effectiveStats(c).composure >= K.composure;
  },
  // The contract objective (checked when the tournament is over).
  contractMet(c) {
    const K = c.contract, P = K.progress, o = K.objective;
    switch (o.id) {
      case 'reachSemi': return Tournament.reached(c.tour, 'semi');
      case 'tourRuns': return P.runs >= o.n;
      case 'tourWickets': return P.wickets >= o.n;
      case 'tourSixes': return P.sixes >= o.n;
      case 'tourGradeA': return P.gradeA >= o.n;
      default: return false;
    }
  },
  contractEnd(c, save) {
    const met = this.contractMet(c), K = c.contract;
    K.done = true; K.met = met;
    const out = { met };
    if (met) {
      const bonus = CAREER_DATA.franchise.offers.objectiveBonus;
      save.currencies.coins = (save.currencies.coins || 0) + bonus;
      out.coins = bonus;
      out.reward = Sponsors.pay(save, { item: K.reward });
    }
    return out;
  },
};
