// Cricket Arcade — Six Smash and Wicket Rush around the ball-by-ball rules
// (plan 16, 17, 20): the player picker, the opponents, records, medals and the
// finite rewards. Data: CHALLENGE_DATA. Scoring: SixSmashRules / WicketRushRules.
//
// In the global save:
//   save.challenges[rulesetId]   { score, medal, player, role, diff, at, plays,
//                                   streak (best streak), …bests, paid { medal: 1 } }
//   save.challengeMeta           { milestones { id: 1 }, goldenSixes, feverBest }

const Challenge = {
  current: null,        // { game, rs, diff, pick, player, pc }
  last: { six: null, rush: null },   // the last choice per game (the hub remembers it)

  D() { return CHALLENGE_DATA; },
  rulesets(game) { return CHALLENGE_DATA[game].rulesets; },
  def(id) {
    for (const g of ['six', 'rush']) { const r = CHALLENGE_DATA[g].rulesets.find((x) => x.id === id); if (r) return r; }
    return null;
  },
  gameOf(id) { return CHALLENGE_DATA.six.rulesets.some((r) => r.id === id) ? 'six' : 'rush'; },
  diff(id) { return CHALLENGE_DATA.difficulty[id] || CHALLENGE_DATA.difficulty.pro; },

  // ---- the player picker (plan 16.8 / 17.7) ----
  // Six Smash: Batters and All-Rounders. Wicket Rush: Bowlers and All-Rounders.
  roleFits(game, role) { return role === 'allrounder' || role === (game === 'six' ? 'batter' : 'bowler'); },
  // Every player you could pick: the careers you're playing, your Legacy Players,
  // then the default athlete(s). Async (careers live in their own save slots).
  async options(save, game) {
    const out = [];
    for (let slot = 1; slot <= Save.CAREER_SLOTS; slot++) {
      const sum = save.careerSlots[slot - 1];
      if (!sum || !this.roleFits(game, sum.role)) continue;
      const c = await CareerSave.load(slot);
      if (!c || c.phase === 'retired') continue;
      out.push({ key: 'career:' + slot, kind: 'career', slot, c, name: c.player.name, role: c.player.role,
        family: Career.bowls(c) ? c.player.family : null, ovr: Career.overall(c), look: c.player });
    }
    for (const h of save.hallOfFame || []) {
      if (!this.roleFits(game, h.role)) continue;
      out.push({ key: 'legacy:' + h.id, kind: 'legacy', ref: h.id, name: h.name, role: h.role, family: h.family || null, ovr: h.ovr || null, look: h });
    }
    const A = CHALLENGE_DATA.athlete;
    if (game === 'six') out.push(this.athlete('six'));
    else for (const f of A.bowl.families) out.push(this.athlete('rush', f));
    return out;
  },
  athlete(game, family) {
    const A = CHALLENGE_DATA.athlete[game === 'six' ? 'bat' : 'bowl'];
    return { key: 'athlete:' + (family || 'bat'), kind: 'athlete', name: T('chal.athlete'), role: game === 'six' ? 'batter' : 'bowler',
      family: family || null, ovr: A.stat };
  },

  // The picked player as a match entity (id 'player1'), and a career-shaped object
  // for the techniques (the real career; a Legacy Player's frozen tree; none).
  build(pick) {
    const save = Save.data;
    if (pick.kind === 'career' && pick.c) {
      const c = pick.c, p = c.player;
      const ms = SkillTree.matchStats(c, Career.effectiveStats(c), null, null);
      return { pc: c, player: { id: 'player1', no: 1, name: p.name, short: this._short(p.name), role: { batter: 'bat', bowler: 'bowl', allrounder: 'all' }[p.role],
        family: Career.bowls(c) ? p.family : null, leftHanded: p.batHand === 'left', stats: ms.stats, perks: SkillTree.mods(c), isCareer: true } };
    }
    if (pick.kind === 'legacy') {
      const v = MyXI.view(save, { id: 'L:' + pick.ref, kind: 'legacy', ref: pick.ref });
      if (v) {
        const pc = MyXI.pseudoCareer(save, v);
        return { pc, player: { id: 'player1', no: 1, name: v.name, short: v.short, role: v.role, family: v.family, leftHanded: v.leftHanded,
          stats: Object.assign({}, v.stats), perks: pc ? SkillTree.mods(pc) : undefined, legacy: pick.ref } };
      }
    }
    const A = CHALLENGE_DATA.athlete[pick.family ? 'bowl' : 'bat'];
    const e = Teams.flat('player1', A.stat, pick.family || null);
    e.name = T('chal.athlete'); e.short = e.name;
    return { pc: null, player: e };
  },
  _short(n) { const p = n.split(' '); return p.length > 1 ? p[0][0] + '. ' + p.slice(1).join(' ') : n; },

  // Start an attempt. o: { rs, diff, pick } (missing parts: the last choice, then defaults).
  begin(game, o) {
    const p = o || {}, last = this.last[game] || {};
    const rs = p.rs || last.rs || this.rulesets(game)[0].id;
    const diff = p.diff || last.diff || 'pro';
    const pick = p.pick || last.pick || (game === 'six' ? this.athlete('six') : this.athlete('rush', 'fast'));
    this.last[game] = { rs, diff, pick };
    const b = this.build(pick);
    this.current = { game, rs, diff, pick, player: b.player, pc: b.pc };
    return this.current;
  },

  // ---- the opponents ----
  // Six Smash bowler for ball n: the attack rotates each spell; Survival gets
  // better as it goes; Boss Bowler is the boss (a rival).
  sixBowler(rules, diffId) {
    const S = CHALLENGE_DATA.six, rs = rules.rs, d = this.diff(diffId);
    const boss = rs.boss;
    const family = boss ? boss.family : S.attack[Math.floor(rules.ball / (rs.spell || 5)) % S.attack.length];
    const stat = Math.max(20, Math.min(99, (boss ? boss.stat : S.bowlerStat) + d.opp + rules.ramp));
    const e = Teams.flat('ai1', stat, family);
    e.name = boss ? T('rival.' + boss.rival) : T('chal.bowlerName');
    e.short = boss ? T('rival.' + boss.rival + '.short') : e.name;
    return e;
  },
  rushBatter(rules, diffId) {
    const W = CHALLENGE_DATA.rush, rs = rules.rs, d = this.diff(diffId), boss = rs.boss;
    const stat = Math.max(20, Math.min(99, (boss ? boss.stat : W.batterStat) + d.opp + rules.ramp));
    const e = Teams.flat('ai1', stat);
    e.role = 'bat';
    for (const k of PLAYER_DATA.stats.bowling) e.stats[k] = 25;
    e.name = boss ? T('rival.' + boss.rival) : T('chal.batterName');
    e.short = boss ? T('rival.' + boss.rival + '.short') : e.name;
    return e;
  },

  // ---- medals, records, rewards ----
  medalFor(rsId, score) {
    const R = this.def(rsId);
    let m = null;
    CHALLENGE_DATA.medals.forEach((id, i) => { if (score >= R.medals[i]) m = id; });
    return m;
  },
  medalRank(m) { return m ? CHALLENGE_DATA.medals.indexOf(m) + 1 : 0; },
  record(save, rsId) { return (save.challenges || {})[rsId] || null; },
  meta(save) {
    if (!save.challengeMeta) save.challengeMeta = { milestones: {}, goldenSixes: 0, feverBest: 0 };
    return save.challengeMeta;
  },
  medalPoints(save) {
    let n = 0;
    for (const g of ['six', 'rush']) for (const r of this.rulesets(g)) {
      const rec = this.record(save, r.id);
      if (rec && rec.medal) n += CHALLENGE_DATA.medalPoints[rec.medal];
    }
    return n;
  },

  // A finished attempt. o: { rs, raw (score before the difficulty), diff, player
  // (the entity), pick, stats { name: n } (kept as personal bests), fever, goldenSixes }.
  // Returns the summary for the result screen. Rewards are paid once, ever.
  finish(save, o) {
    const d = this.diff(o.diff);
    const score = Math.round(o.raw * d.score);
    const prev = this.record(save, o.rs);
    const rec = prev ? Object.assign({}, prev) : { score: 0, plays: 0, paid: {} };
    rec.paid = Object.assign({}, rec.paid || {});
    const isBest = !prev || score > prev.score;
    rec.plays = (rec.plays || 0) + 1;
    if (isBest) {
      rec.score = score;
      rec.player = o.player ? o.player.name : '';
      rec.role = o.pick ? o.pick.kind : 'athlete';
      rec.diff = o.diff;
      rec.at = new Date().toISOString().slice(0, 10);
    }
    for (const k of Object.keys(o.stats || {})) rec[k] = Math.max(rec[k] || 0, o.stats[k] || 0);
    const medal = this.medalFor(o.rs, score);
    const prevMedal = prev ? prev.medal || null : null;
    if (this.medalRank(medal) > this.medalRank(prevMedal)) rec.medal = medal;
    // First time at each medal: its reward (a jump from nothing to Gold pays Bronze, Silver and Gold).
    const rewards = [];
    for (const m of CHALLENGE_DATA.medals.slice(0, this.medalRank(medal))) {
      if (rec.paid[m]) continue;
      rec.paid[m] = 1;
      const r = CHALLENGE_DATA.medalRewards[m];
      this.pay(save, r);
      rewards.push({ medal: m, reward: r });
    }
    save.challenges[o.rs] = rec;
    const M = this.meta(save);
    M.goldenSixes = (M.goldenSixes || 0) + (o.goldenSixes || 0);
    M.feverBest = Math.max(M.feverBest || 0, o.fever || 0);
    // Milestones across every ruleset.
    const pts = this.medalPoints(save), milestones = [];
    for (const ms of CHALLENGE_DATA.milestones) {
      if (pts >= ms.points && !M.milestones[ms.id]) { M.milestones[ms.id] = 1; this.pay(save, ms.reward); milestones.push(ms); }
    }
    const achievements = typeof Achievements !== 'undefined' ? Achievements.checkAccount(save, null) : [];
    Save.write();
    return { score, raw: o.raw, diff: o.diff, isBest, prevBest: prev ? prev.score : 0, medal, newMedal: this.medalRank(medal) > this.medalRank(prevMedal),
      rewards, milestones, points: pts, achievements, player: o.player ? o.player.name : '' };
  },

  pay(save, r) {
    const C = save.currencies = save.currencies || {};
    if (r.coins) C.coins = (C.coins || 0) + r.coins;
    if (r.st) C.bankedTokens = (C.bankedTokens || 0) + r.st;      // Skill Tokens go to the next career opened
    if (r.lm) C.legacyMarks = (C.legacyMarks || 0) + r.lm;
    if (r.mc) C.mythicCore = (C.mythicCore || 0) + r.mc;
    if (r.item && typeof Gear !== 'undefined') Gear.grant(save, r.item, 'challenge');
  },

  // For the achievements (plan 16/17: Smash Hit, Rush Hour, Diamond Smash / Rush, Fever Pitch, Golden Touch).
  facts(save) {
    const rank = (id) => this.medalRank((this.record(save, id) || {}).medal);
    const best = (g) => Math.max(0, ...this.rulesets(g).map((r) => rank(r.id)));
    const M = save.challengeMeta || {};
    return {
      sixSmashGold: rank('classic20') >= 3 ? 1 : 0, wicketRushGold: rank('wicketRush18') >= 3 ? 1 : 0,
      sixSmashDiamond: best('six') >= 4 ? 1 : 0, wicketRushDiamond: best('rush') >= 4 ? 1 : 0,
      feverTriggers: M.feverBest || 0, goldenSix: M.goldenSixes || 0, medalPoints: this.medalPoints(save),
    };
  },
};
