// Cricket Arcade — techniques in a career match (M06, plan 11, docs/SKILL_TREE_v1.md).
// The Wicket Tree unlocks techniques; the loadout switches up to 2 active + 2
// passive on. This is what they DO, ball by ball, for the career player.
//
//   Tech      match-time state (charges, stacks, the Legend Moment) and the
//             hooks the live scenes call. Saved in the mid-match checkpoint.
//   TechUI    the TECHNIQUE buttons, the LEGEND button, and the small chip
//             that pops up whenever a technique or perk changes a ball.
//
// Two kinds of active technique (SKILL_TREE_DATA.techniques[id].mode):
//   trigger  tap its button before the ball (charges per match)
//   always   works by itself whenever its moment comes (a short ball, a chase…)
// Minor perks and keystones ride on the player's match entity (entity.perks,
// see Duel.perk) so they also work in the simulated balls.
// Numbers: SKILL_TREE_DATA. No randomness here.

const Tech = {
  c: null,             // the career
  st: null,            // match state (null = not a career match: every hook is neutral)
  m: null,             // SkillTree.mods(c)
  chips: [],           // pop-ups: { id, t }

  // ---- start / save / restore ----
  begin(c, saved) {
    this.c = c;
    this.m = SkillTree.mods(c);
    this.chips = [];
    const TD = SKILL_TREE_DATA.techniques, lo = SkillTree.loadout(c);
    const charges = {};
    for (const id of lo.active) if (TD[id].mode === 'trigger') charges[id] = TD[id].charges + (this.m.techCharges || 0);   // gear can add charges
    this.st = saved ? JSON.parse(JSON.stringify(saved)) : {
      charges, armed: null, legendLeft: this.m.flags.legend ? SKILL_TREE_DATA.legend.usesPerMatch : 0, legendArmed: false,
      stacks: { anchor: 0, boundary: 0, pressure: 0 }, dots: 0, hunter: 0, strike: false, faced: 0, bowled: 0,
      edgeSafe: {}, uses: {},
    };
    this.st.armed = null;
    this.st.legendArmed = false;
    this._ball = {};
  },
  end() { this.st = null; this.c = null; this.chips = []; this._ball = {}; this.multi = null; },
  snapshot() {
    if (this.multi) { const o = {}; for (const [pid, x] of Object.entries(this.multi)) o[pid] = JSON.parse(JSON.stringify(x.st)); return { multi: o }; }
    return this.st ? JSON.parse(JSON.stringify(this.st)) : null;
  },
  // My XI (M10): several players in one side have techniques (Legacy Players,
  // rivals). owners: [{ pid, c }] (c: a career-shaped object). Each has its own
  // state; mine(p) switches to p's, so every hook works for whoever is playing.
  multi: null,
  beginMany(owners, saved) {
    this.multi = {};
    this.chips = [];
    for (const o of owners) {
      this.begin(o.c, saved && saved.multi && saved.multi[o.pid]);
      this.multi[o.pid] = { c: this.c, st: this.st, m: this.m };
    }
    this.st = null; this.c = null; this.m = null;
  },

  on() {
    if (this.multi) return !!this.st;
    return !!(this.st && typeof CareerMatch !== 'undefined' && CareerMatch.on);
  },
  mine(p) {
    if (this.multi) {
      const x = p && this.multi[p.id];
      if (!x) { this.st = null; this.c = null; this.m = null; return false; }
      this.st = x.st; this.c = x.c; this.m = x.m;
      return true;
    }
    return this.on() && !!p && p.id === CareerMatch.pid;
  },
  lo() { return SkillTree.loadout(this.c); },
  has(id) { const L = this.lo(); return L.active.includes(id) || L.passive.includes(id); },
  T(id) { return SKILL_TREE_DATA.techniques[id]; },
  // A multiplier made stronger when the technique is Mastered (plan 11.4).
  k(id, v) {
    const b = SkillTree.masteryLevel(this.c, id) === 'mastered' ? SKILL_TREE_DATA.mastery.masteredBoost : 1;
    return 1 + (v - 1) * b;
  },
  // A technique / perk / keystone changed this ball: count a use (mastery,
  // once a ball) and show it.
  note(id) {
    if (!this.st) return;
    this._ball = this._ball || {};
    if (this._ball[id]) return;
    this._ball[id] = true;
    if (SKILL_TREE_DATA.techniques[id]) this.st.uses[id] = (this.st.uses[id] || 0) + 1;
    if (!this.chips.some((ch) => ch.id === id && ch.t < 0.6)) this.chips.push({ id, t: 0 });
    if (this.chips.length > 3) this.chips.shift();
  },
  _stack(name, max) { this.st.stacks[name] = Math.min(max, this.st.stacks[name] + this.m.comboBoost); },

  // ---- trigger techniques ----
  // The trigger techniques you could fire now. kind: 'bat' | 'bowl'.
  triggers(kind, inn) {
    if (!this.on()) return [];
    return this.lo().active.filter((id) => {
      const t = this.T(id);
      if (t.kind !== kind || t.mode !== 'trigger' || !(this.st.charges[id] > 0)) return false;
      if (t.when && inn) {
        const late = inn.ballsLeft <= t.when.ballsLeft || (inn.maxWickets - inn.wickets) <= t.when.wicketsLeft;
        if (!late) return false;
      }
      return true;
    });
  },
  arm(id) {
    if (!this.st || this.st.armed || !(this.st.charges[id] > 0)) return false;
    this.st.charges[id]--;
    this.st.armed = id;
    if (typeof MissionMatch !== 'undefined') MissionMatch.noteTech();     // (mission star objectives)
    this.note(id);
    Sound.play('combo');
    Effects.flash(0.25, '#9be7ff');
    return true;
  },
  armed(id) { return !!this.st && this.st.armed === id; },

  // ---- Legend's Bails: the once-a-match Legend Moment ----
  legendReady() { return this.on() && this.st.legendLeft > 0 && !this.st.legendArmed; },
  armLegend() {
    if (!this.legendReady()) return false;
    this.st.legendLeft--;
    this.st.legendArmed = true;
    this.note('capstone_legends_bails');
    Sound.play('crowdRoar'); Sound.play('fanfare');
    Stadium.cheer(1);
    Effects.flash(0.6, '#ffe28a');
    Effects.shake(8, 0.35);
    const cx = CONFIG.LOGICAL_W / 2;
    Effects.sparks(cx, 420, 40, '#ffd23f', 1100);
    Effects.ring(cx, 420, 320, '#ffe28a', 0.6, 16);
    Effects.text(T('tech.legendMoment'), cx, 360, '#ffe28a', 84, { life: 1.8 });
    return true;
  },

  // ================================================================ batting (you're on strike)
  // Your stats for this ball: Quick Starter, Iron Focus, Comeback Specialist, Anchor.
  batStats(p, inn) {
    if (!this.mine(p)) return p;
    const out = Object.assign({}, p, { stats: Object.assign({}, p.stats) });
    const add = (stats, scale) => { for (const [k, v] of Object.entries(stats)) if (out.stats[k] !== undefined) out.stats[k] += Math.round(v * (scale || 1)); };
    const TD = SKILL_TREE_DATA.techniques, P = this.lo().passive;
    if (P.includes('quick_starter') && this.st.faced < TD.quick_starter.balls) { add(TD.quick_starter.stats); this.note('quick_starter'); }
    if (P.includes('iron_focus') && inn.ballsLeft <= TD.iron_focus.ballsLeft) { add(TD.iron_focus.stats); this.note('iron_focus'); }
    if (P.includes('comeback_specialist') && inn.target && inn.requiredRate >= TD.comeback_specialist.reqRate) { add(TD.comeback_specialist.stats); this.note('comeback_specialist'); }
    if (this.has('anchor') && this.st.stacks.anchor >= 1) add({ composure: TD.anchor.perStack.composure * this.st.stacks.anchor });
    return out;
  },

  // Extra timing-window size for this ball: { k (all windows), extra (for Contact.grade) }.
  batWindows(scene) {
    const out = { k: 1, extra: { perfect: 1, good: this.m ? this.m.goodWindow : 1 } };
    if (!this.mine(scene.batterP)) return { k: 1, extra: null };
    const del = scene.del, inn = scene.inn, TD = SKILL_TREE_DATA.techniques;
    const use = (id, v) => { out.k *= this.k(id, v); this.note(id); };
    if (this.has('pull_specialist') && TD.pull_specialist.lengths.includes(del.lengthId)) use('pull_specialist', TD.pull_specialist.window);
    if (this.has('fast_hands') && del.kind === 'pace' && del.kmh >= TD.fast_hands.kmh) use('fast_hands', TD.fast_hands.window);
    if (this.has('counter_spin') && del.kind === 'spin') use('counter_spin', TD.counter_spin.window);
    if (this.has('finisher') && inn.target && inn.requiredRate >= TD.finisher.reqRate) use('finisher', TD.finisher.window);
    if (this.has('anchor') && this.st.stacks.anchor >= 1) { out.k *= 1 + TD.anchor.perStack.window * this.st.stacks.anchor; this.note('anchor'); }
    if (this.armed('perfect_window')) out.extra.perfect *= this.k('perfect_window', TD.perfect_window.perfect);
    if (this.armed('last_stand')) out.k *= this.k('last_stand', TD.last_stand.window);
    if (this.st.legendArmed) out.extra.perfectIsGood = true;
    if (this.m.goodWindow > 1) this.note('perk_sharp_eye');
    return out;
  },

  // Contact modifiers for your shot (power, edges, placement).
  contactMods(m, sh, aim, scene) {
    if (!this.mine(scene.batterP) || sh.id === 'leave') return m;
    const out = Object.assign({}, m), TD = SKILL_TREE_DATA.techniques, del = scene.del, inn = scene.inn;
    const dir = aim && aim.active ? aim.x * BATTING_DATA.direction.maxAim : null;
    const hitting = sh.id !== 'defend';
    const inDir = (r) => dir !== null && dir >= r[0] && dir <= r[1];
    if (this.armed('power_surge') && hitting) out.power *= this.k('power_surge', TD.power_surge.power);
    if (this.has('cover_drive_mastery') && hitting && inDir(TD.cover_drive_mastery.dir)) {
      out.power *= this.k('cover_drive_mastery', TD.cover_drive_mastery.power); out.jitter *= TD.cover_drive_mastery.jitter; this.note('cover_drive_mastery');
    }
    if (this.has('sweep_specialist') && hitting && del.kind === 'spin' && inDir(TD.sweep_specialist.dir)) {
      out.power *= this.k('sweep_specialist', TD.sweep_specialist.power); out.edge *= TD.sweep_specialist.edge; this.note('sweep_specialist');
    }
    if (this.has('pull_specialist') && hitting && TD.pull_specialist.lengths.includes(del.lengthId)) out.power *= this.k('pull_specialist', TD.pull_specialist.power);
    if (this.has('counter_spin') && del.kind === 'spin') out.edge *= TD.counter_spin.edge;
    if (this.has('late_cut_mastery') && sh.grade === 'late') out.edge *= TD.late_cut_mastery.edge;
    if (this.has('boundary_hunter') && hitting && this.st.stacks.boundary >= 1) {
      out.power *= 1 + TD.boundary_hunter.perStack * this.st.stacks.boundary * (this.k('boundary_hunter', 2) - 1); this.note('boundary_hunter');
    }
    if (this.has('finisher') && hitting && inn.target && inn.requiredRate >= TD.finisher.reqRate) out.power *= this.k('finisher', TD.finisher.power);
    if (this.armed('last_stand')) out.edge = 0;
    if (this.m.flags.boundaryKing && sh.id === 'power' && sh.grade === 'good') { out.speedGrade = 'perfect'; this.note('keystone_boundary_king'); }
    if (this.m.edge < 1) this.note('perk_soft_hands');
    return out;
  },

  // After the bat meets the ball: Late Cut Mastery steers a late one fine;
  // Unbreakable keeps the first edge of the innings along the ground.
  afterContact(c, sh, scene) {
    if (!this.mine(scene.batterP)) return;
    const TD = SKILL_TREE_DATA.techniques;
    if (this.has('late_cut_mastery') && sh.grade === 'late' && c.kind === 'hit') {
      Object.assign(c, Contact._pack('hit', Math.min(150, c.dirDeg + TD.late_cut_mastery.turn), c.loftDeg * 0.6, c.speed * 1.12));
      this.note('late_cut_mastery');
    }
    const key = scene.inn.index;
    if (c.kind === 'edge' && this.m.flags.unbreakable && !this.st.edgeSafe[key]) {
      this.st.edgeSafe[key] = true;
      Object.assign(c, Contact._pack('edge', c.dirDeg, 0, c.speed * 0.7));
      this.note('keystone_unbreakable');
    }
  },

  // The ball is over (you were batting). key: the outcome key; wicket: how out.
  batBallEnd(key, legal, wicket) {
    if (!this.st) return;
    const st = this.st, TD = SKILL_TREE_DATA.techniques;
    if (legal) st.faced++;
    const safe = !wicket && ['defended', 'runs', 'dot', 'four', 'six'].includes(key);
    if (this.has('anchor')) { if (safe) this._stack('anchor', TD.anchor.maxStacks); else st.stacks.anchor = 0; }
    if (this.has('boundary_hunter')) { if (key === 'four' || key === 'six') this._stack('boundary', TD.boundary_hunter.maxStacks); else st.stacks.boundary = 0; }
    st.armed = null;
    st.legendArmed = false;
    this._ball = {};
  },

  // ================================================================ bowling (your over)
  // Your stats for this ball: Quick Starter, Iron Focus, Comeback, Strike Force.
  bowlStats(p, inn) {
    if (!this.mine(p)) return p;
    const out = Object.assign({}, p, { stats: Object.assign({}, p.stats) });
    const add = (stats) => { for (const [k, v] of Object.entries(stats)) if (out.stats[k] !== undefined) out.stats[k] += v; };
    const TD = SKILL_TREE_DATA.techniques, P = this.lo().passive;
    if (P.includes('quick_starter') && this.st.bowled < TD.quick_starter.balls) { add(TD.quick_starter.stats); this.note('quick_starter'); }
    if (P.includes('iron_focus') && inn.ballsLeft <= TD.iron_focus.ballsLeft) { add(TD.iron_focus.stats); this.note('iron_focus'); }
    if (P.includes('comeback_specialist') && inn.target && inn.requiredRate <= TD.comeback_specialist.defend) { add(TD.comeback_specialist.stats); this.note('comeback_specialist'); }
    if (this.st.strike && this.m.flags.strikeForce) { add({ deception: SKILL_TREE_DATA.keystones.strikeForce.deception }); this.note('keystone_strike_force'); }
    return out;
  },

  // Release bands (gold / green): Steady Run-up, Pressure Builder, Closer, Legend.
  bands(b, scene) {
    if (!this.mine(scene.bowler)) return b;
    const TD = SKILL_TREE_DATA.techniques;
    const widen = (band, k) => { const mid = (band[0] + band[1]) / 2, h = (band[1] - band[0]) / 2 * k; return [mid - h, mid + h]; };
    let perfect = b.perfect, good = b.good, k = 1;
    if (this.has('pressure_builder') && this.st.stacks.pressure >= 1) { k *= 1 + TD.pressure_builder.perStack.band * this.st.stacks.pressure; this.note('pressure_builder'); }
    if (this.has('closer') && scene.inn.ballsLeft <= TD.closer.ballsLeft) { k *= this.k('closer', TD.closer.band); this.note('closer'); }
    good = widen(good, k);
    perfect = widen(perfect, k * this.m.perfectBand);
    if (this.m.perfectBand > 1) this.note('perk_steady_runup');
    if (this.st.legendArmed) perfect = good.slice();
    perfect = [Math.max(good[0], perfect[0]), Math.min(good[1], perfect[1])];
    return { perfect, good };
  },

  // Changes to the delivery itself (Bowling.release o.boost).
  releaseBoost(scene) {
    if (!this.mine(scene.bowler)) return null;
    const TD = SKILL_TREE_DATA.techniques, b = {};
    const type = scene._type ? scene._type().id : '';
    if (this.armed('deadeye_yorker')) { b.scatter = TD.deadeye_yorker.scatter; if (type === 'yorker') b.threat = TD.deadeye_yorker.yorkerThreat; }
    if (this.armed('spin_burst')) { b.turn = this.k('spin_burst', TD.spin_burst.turn); b.move = TD.spin_burst.move; }
    if (this.armed('heat_ball')) b.speed = this.k('heat_ball', TD.heat_ball.speed);
    if (this.armed('reverse_break')) b.reverse = true;
    if (this.has('late_swing')) {
      b.move = (b.move || 1) * this.k('late_swing', TD.late_swing.swing);
      b.turn = (b.turn || 1) * TD.late_swing.turn;
      this.note('late_swing');
    }
    return b;
  },

  // After the release: the AI batter's timing spread / read (x), and threat.
  // Returns { sigmaK, readK }.
  aiCtx(scene) {
    const out = { sigmaK: 1, readK: 1 };
    if (!this.mine(scene.bowler)) return out;
    const TD = SKILL_TREE_DATA.techniques, del = scene.del, inn = scene.inn, st = this.st;
    const mul = (id, v, show) => { out.sigmaK *= this.k(id, v); if (show !== false) this.note(id); };
    if (this.has('pressure_builder') && st.stacks.pressure >= 1) out.sigmaK *= 1 + TD.pressure_builder.perStack.sigma * st.stacks.pressure;
    if (this.has('bouncer_trap') && TD.bouncer_trap.lengths.includes(del.lengthId)) { mul('bouncer_trap', TD.bouncer_trap.sigma); del.threat *= TD.bouncer_trap.threat; }
    if (this.has('late_swing')) mul('late_swing', TD.late_swing.sigma, false);
    if (this.has('wicket_hunter') && st.hunter > 0) mul('wicket_hunter', TD.wicket_hunter.sigma);
    if (this.armed('heat_ball')) mul('heat_ball', TD.heat_ball.sigma, false);
    if (this.has('googly_mastery') && del.variation) { out.readK *= this.k('googly_mastery', TD.googly_mastery.read); mul('googly_mastery', TD.googly_mastery.sigma); }
    if (this.armed('reverse_break')) mul('reverse_break', TD.reverse_break.sigma, false);
    if (this.has('closer') && inn.ballsLeft <= TD.closer.ballsLeft) mul('closer', TD.closer.sigma, false);
    if (this.armed('unplayable')) {
      if (scene.release && scene.release.grade === 'perfect') { mul('unplayable', TD.unplayable.sigma, false); del.threat *= TD.unplayable.threat; }
      else Effects.text(T('tech.needsPerfect'), CONFIG.LOGICAL_W / 2, 400, '#ff9d7a', 40, { life: 1.4 });
    }
    if (this.m.flags.chokeHold && st.dots >= 2) {
      const K = SKILL_TREE_DATA.keystones.chokeHold;
      out.sigmaK *= 1 + Math.min(K.max, K.perTwoDots * Math.floor(st.dots / 2));
      this.note('keystone_choke_hold');
    }
    return out;
  },

  // The AI batter's contact against you (Heavy Ball).
  hitMods(m, scene) {
    if (!this.mine(scene.bowler) || !this.has('heavy_ball')) return m;
    this.note('heavy_ball');
    return Object.assign({}, m, { power: (m.power || 1) * this.k('heavy_ball', SKILL_TREE_DATA.techniques.heavy_ball.power) });
  },

  // Your throw meter's zones are bigger with Rocket Arm.
  throwZone() { return this.st && this.m ? this.m.throwZone : 1; },

  bowlBallEnd(key, legal, wicket, runs) {
    if (!this.st) return;
    const st = this.st, TD = SKILL_TREE_DATA.techniques;
    if (legal) st.bowled++;
    const dot = legal && !runs && !wicket;
    st.dots = dot ? st.dots + 1 : 0;
    if (this.has('pressure_builder')) { if (dot) this._stack('pressure', TD.pressure_builder.maxStacks); else st.stacks.pressure = 0; }
    st.strike = false;
    if (st.hunter > 0) st.hunter--;
    if (wicket) {
      st.strike = !!this.m.flags.strikeForce;
      if (this.has('wicket_hunter')) st.hunter = TD.wicket_hunter.balls;
      st.dots = 0;
    }
    st.armed = null;
    st.legendArmed = false;
    this._ball = {};
  },

  update(dt) { for (const ch of this.chips) ch.t += dt; this.chips = this.chips.filter((ch) => ch.t < 1.8); },
};

// The on-screen parts: TECHNIQUE buttons (trigger techniques), the LEGEND
// button, and the chips that say which technique just changed the ball.
const TechUI = {
  btns: [],            // { id, x, y, r, legend }
  kind: null,
  open: () => false,   // can you fire one right now (before the ball is bowled)?

  // kind: 'bat' | 'bowl'. open: a function (the scene's "before the ball" test).
  layout(kind, inn, open) {
    this.kind = kind;
    this.btns = [];
    this.open = open || (() => false);
    if (!Tech.on()) return;
    const s = Display.safe;
    let i = 0;
    for (const id of Tech.triggers(kind, inn)) {
      this.btns.push({ id, x: s.right - 120 - i * 170, y: s.bottom - 730, r: 70 });
      i++;
    }
    if (Tech.legendReady()) this.btns.push({ id: 'legend', legend: true, x: s.left + 130, y: s.bottom - 580, r: 76 });
  },

  // Returns true if the touch was on one of the buttons.
  down(id, x, y, fire) {
    for (const b of this.btns) {
      if (Math.hypot(x - b.x, y - b.y) <= Math.max(b.r * 1.15, CONFIG.MIN_TOUCH / 2)) {
        if (!Tech.st || !this.open()) return false;                    // hidden during the ball: the tap goes through
        if (b.legend ? Tech.st.legendArmed : Tech.st.armed) { Sound.play('edge'); return true; }
        const ok = b.legend ? Tech.armLegend() : Tech.arm(b.id);
        if (ok && fire) fire(b.id);
        return true;
      }
    }
    return false;
  },

  draw(ctx) {
    if (!Tech.st) return;
    const open = this.open();
    for (const b of this.btns) {
      const armed = b.legend ? Tech.st.legendArmed : Tech.armed(b.id);
      if (!armed && !open) continue;               // only shown before the ball (or while it's in use)
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.05;
      const r = b.r * (!armed ? pulse : 1);
      ctx.save();
      R.circle(b.x + 4, b.y + 6, r, 'rgba(0,0,0,0.4)');
      R.circle(b.x, b.y, r, b.legend ? '#3a2a00' : '#0d2238', armed ? '#ffffff' : (b.legend ? '#ffd23f' : '#9be7ff'), armed ? 9 : 6);
      if (b.legend) TreeArt.draw('icon_legend_bails', b.x, b.y - 6, r * 1.3);
      else TreeArt.draw(SKILL_TREE_DATA.techniques[b.id].icon, b.x, b.y, r * 1.9);
      if (!b.legend) {
        const n = Tech.st.charges[b.id] || 0;
        R.circle(b.x + r * 0.72, b.y - r * 0.72, 22, '#ffd23f', CONFIG.COLOR.ink, 3);
        R.text(String(n), b.x + r * 0.72, b.y - r * 0.72, 24, CONFIG.COLOR.ink, 'center', false);
      }
      R.text(T(b.legend ? 'tech.legendBtn' : 'tech.' + b.id), b.x, b.y + r + 22, 20, armed ? '#ffffff' : (b.legend ? '#ffe28a' : '#9be7ff'));
      ctx.restore();
    }
    // chips: "PULL SPECIALIST" etc. whenever one changed the ball
    const cx = CONFIG.LOGICAL_W / 2;
    Tech.chips.forEach((ch, i) => {
      const a = Math.min(1, ch.t / 0.12) * Math.min(1, (1.8 - ch.t) / 0.35);
      const y = 255 + i * 66;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      R.roundRect(cx - 230, y - 28, 460, 56, 26, 'rgba(8,20,36,0.85)', TreeUIColours.forId(ch.id), 3);
      TreeArt.draw(TreeArt.iconOf(ch.id), cx - 196, y, 60);
      R.text(TreeText.name(ch.id), cx + 18, y, 26, '#ffffff', 'center', false);
      ctx.restore();
    });
  },
};
