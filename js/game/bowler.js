// Cricket Arcade — bowling for both sides (plan 6.2, 7.12, 7.15, 8.2).
//   Bowling.release()  turns "who bowls what, where, how well released" into a
//                      delivery. The player's bowling and the computer's go
//                      through the same function.
//   Bowling.aiChoose() the computer bowler's delivery, line and length.
//   BowlerRules        over limits, no two overs in a row, fatigue, who bowls next.
//   Aim                the reticle drag (up the screen = toward the batter).

const Bowling = {
  family(id) { return BOWLING_DATA.families[id] || BOWLING_DATA.families.fast; },
  conditions(c) {
    const S = STADIUM_DATA;
    return { pitch: S.pitchTypes[(c && c.pitch) || 'balanced'], weather: S.weather[(c && c.weather) || 'clear'] };
  },

  // Everything random about a release, rolled once. o: see release().
  roll(o, rng) {
    const C = BOWLING_DATA.charge;
    const sc = C.scatter[o.grade] * Duel.scatterMult(o.bowler, o.fatigue) * ((o.boost && o.boost.scatter) || 1);
    const cond = this.conditions(o.cond);
    return {
      dx: rng.range(-1, 1) * sc,
      dz: rng.range(-1, 1) * sc * 2.5,
      seam: rng.range(-1, 1),
      vary: cond.pitch.variable ? rng.range(-1, 1) * cond.pitch.variable : 0,
    };
  },

  // o: { bowler, family, typeIdx, target {x,z}, grade, power (0..1), fatigue,
  //      cond {pitch, weather}, index, swipe? {dir, mag},
  //      boost? {scatter, speed, move, turn, reverse, threat} (techniques, game/techniques.js) }
  // r: the roll (from roll()); rebuilding with a swipe reuses it.
  build(o, r) {
    const C = BOWLING_DATA.charge;
    const F = this.family(o.family), t = F.deliveries[o.typeIdx] || F.deliveries[0];
    const cond = this.conditions(o.cond);
    const bw = o.bowler, power = Math.max(0, Math.min(1, o.power));
    const lerp = (a, k) => a[0] + (a[1] - a[0]) * k;
    let speed, turnK = 1;
    if (F.powerTo === 'spin') {
      speed = lerp(F.speed, 0.5) * lerp(C.spinPower.pace, power) * (1 + 0.3 * (Duel.paceMult(bw) - 1));
      turnK = lerp(C.spinPower.turn, power) * Duel.turnMult(bw);
    } else {
      speed = lerp(F.speed, power) * Duel.paceMult(bw);
    }
    speed *= t.speed * cond.pitch.pace;
    const bo = o.boost || {};
    if (bo.speed) speed *= bo.speed;
    const move = C.movement[o.grade] || 1, mm = Duel.moveMult(bw);
    let seam = r.seam * (t.seam || 0) * mm * move * cond.pitch.seam;
    let swing = (t.swing || 0) * mm * move * cond.pitch.swing * cond.weather.swing;
    let turn = (t.turn || 0) * (F.powerTo === 'spin' ? turnK : mm) * move * cond.pitch.turn * cond.weather.turn;
    turn += r.vary * (F.powerTo === 'spin' ? 2 : 1);
    if (bo.move) { seam *= bo.move; swing *= bo.move; }
    if (bo.turn) turn *= bo.turn;
    if (bo.reverse) { swing = -swing; turn = -turn; seam = -seam; }

    // Step 4: the movement swipe.
    if (o.swipe && t.swipe && o.swipe.mag > 0) {
      const W = BOWLING_DATA.swipe;
      const natural = swing || turn;
      if (!natural) seam += o.swipe.dir * o.swipe.mag * W.seamSwipe * mm;
      else {
        const same = Math.sign(natural) === Math.sign(o.swipe.dir);
        const k = 1 + W.extra * o.swipe.mag * (same ? 1 : W.againstFactor);
        swing *= k; turn *= k;
      }
    }

    const d = Delivery.build({
      index: o.index || 0, speed, releaseX: F.releaseX, releaseHeight: F.releaseHeight,
      bounceX: o.target.x + r.dx, bounceZ: Math.max(0.3, o.target.z + r.dz),
      movement: seam + turn, restitution: t.bounce * cond.pitch.bounce, swing, skid: t.skid,
      type: t.id, family: F.id,
    });
    d.threat = (t.threat || 1) * (bo.threat || 1);
    d.variation = o.typeIdx !== 0;
    d.releaseGrade = o.grade;
    d.power = power;
    d.kind = F.kind;
    d.canSwipe = !!t.swipe;
    d.icon = t.icon;
    d.timingBias = t.batterTimingBias || 0;
    return d;
  },

  release(o, rng) {
    const r = this.roll(o, rng);
    const d = this.build(o, r);
    d.recipe = { o, r };
    return d;
  },

  // Rebuild a delivery with a swipe (same scatter and seam as before).
  withSwipe(d, swipe) {
    const o = Object.assign({}, d.recipe.o, { swipe });
    const nd = this.build(o, d.recipe.r);
    nd.recipe = { o, r: d.recipe.r };
    return nd;
  },

  // The computer bowler: which delivery, where, and how well it comes out.
  // ctx: { phase, fatigue }
  aiChoose(bowler, ctx, rng) {
    const F = this.family(bowler.family);
    const list = F.deliveries.map((t, i) => ({ i, t, weight: t.ai * (ctx.phase === 'death' && t.id === 'yorker' ? 2 : 1) }));
    const pick = rng.weighted(list);
    const t = pick.t;
    const z = rng.rangeOf(t.zone);
    // Aim so the ball ARRIVES on or just outside off stump: allow for the turn
    // it will take off the pitch.
    const want = rng.range(-0.08, 0.3);
    const vAfter = (F.powerTo === 'spin' ? (F.speed[0] + F.speed[1]) / 2 : F.speed[1] * 0.9) * t.speed * 0.9;
    const x = want - (t.turn || 0) * (z / vAfter);
    const grade = Duel.aiReleaseGrade(bowler, ctx.fatigue, rng);
    const power = F.powerTo === 'spin' ? rng.range(0.35, 0.9) : rng.range(0.7, 1);
    return { typeIdx: pick.i, target: { x, z }, grade, power };
  },
};

// ---- who may bowl the next over -------------------------------------------------
const BowlerRules = {
  maxOvers(inn, fmt) { return inn.isSuper ? MATCH_DATA.superOver.maxOvers : (fmt || Match.fmt).maxOvers; },
  oversBy(inn, id) { return (inn.overBowlers || []).filter((b) => b === id).length; },
  lastOverBy(inn) {
    const o = inn.overBowlers || [];
    // the bowler of the last COMPLETED over (the current one, if any, is at the end)
    const done = Math.floor(inn.legal / 6);
    return done > 0 ? o[done - 1] : null;
  },

  // Every bowler with { p, ok, reason: null | 'lastOver' | 'noOvers' }.
  options(inn, team, fmt) {
    const max = this.maxOvers(inn, fmt);
    const last = inn.isSuper ? null : this.lastOverBy(inn);
    return team.players.filter((p) => p.family).map((p) => {
      let reason = null;
      if (p.id === last) reason = 'lastOver';
      else if (this.oversBy(inn, p.id) >= max) reason = 'noOvers';
      return { p, ok: !reason, reason, overs: this.oversBy(inn, p.id), max };
    });
  },
  canBowl(inn, team, id, fmt) {
    const o = this.options(inn, team, fmt).find((x) => x.p.id === id);
    return !!o && o.ok;
  },

  phase(inn, fmt) {
    const f = fmt || Match.fmt;
    if (inn.isSuper) return 'death';
    const over = Math.floor(inn.legal / 6);
    if (over < f.powerplay) return 'powerplay';
    if (over >= f.overs - f.death) return 'death';
    return 'middle';
  },

  // The computer's pick (also used when you let it choose): the freshest good
  // bowler with overs left, pace at the start and end, spin in the middle.
  aiPick(inn, team, fatigue, rng, fmt) {
    let opts = this.options(inn, team, fmt).filter((o) => o.ok);
    if (!opts.length) opts = this.options(inn, team, fmt).filter((o) => o.reason !== 'lastOver');
    if (!opts.length) opts = this.options(inn, team, fmt);
    const ph = this.phase(inn, fmt);
    let best = null, bestScore = -1e9;
    for (const o of opts) {
      const kind = Bowling.family(o.p.family).kind;
      let s = Teams.bowlRating(o.p) - (fatigue[o.p.id] || 0) * 40 + rng.range(0, 8);
      if (ph !== 'middle' && kind === 'pace') s += 8;
      if (ph === 'middle' && kind === 'spin') s += 8;
      if (s > bestScore) { bestScore = s; best = o.p; }
    }
    return best;
  },

  // End of an over: the bowler tires, everyone else on that side recovers.
  overDone(fatigue, team, bowlerId, hardBalls) {
    const F = PLAYER_DATA.fatigue;
    for (const p of team.players) {
      if (!p.family) continue;
      if (p.id === bowlerId) {
        const add = (F.perOver * (1 - F.fitnessSaves * Teams.u(p.stats.fitness)) + F.perHardBall * (hardBalls || 0)) * Duel.perk(p, 'fatigue', 1);
        fatigue[p.id] = Math.min(1, (fatigue[p.id] || 0) + add);
      } else {
        fatigue[p.id] = Math.max(0, (fatigue[p.id] || 0) - F.restPerOver);
      }
    }
  },
};

// ---- the aiming reticle --------------------------------------------------------
const Aim = {
  // Move the target by a thumb drag (logical px). Dragging UP the screen moves
  // the target UP the screen: toward the batter, a fuller length (z smaller).
  // settings: { invert, sensitivity: 'low' | 'normal' | 'high' }
  drag(aim, d, settings) {
    const R0 = BOWLING_DATA.reticle, s = settings || {};
    const k = R0.sensitivity[s.sensitivity || 'normal'] || 1;
    aim.x += d.x * R0.dragX * k;
    aim.z += d.y * R0.dragZ * k * (s.invert ? -1 : 1);
    return this.clamp(aim);
  },
  // Keyboard: up = toward the batter (like the drag).
  keys(aim, k, dt, settings) {
    const R0 = BOWLING_DATA.reticle, s = settings || {};
    const inv = s.invert ? -1 : 1;
    if (k.left) aim.x -= R0.keySpeedX * dt;
    if (k.right) aim.x += R0.keySpeedX * dt;
    if (k.up) aim.z -= R0.keySpeedZ * dt * inv;
    if (k.down) aim.z += R0.keySpeedZ * dt * inv;
    return this.clamp(aim);
  },
  clamp(aim) {
    const R0 = BOWLING_DATA.reticle;
    aim.x = Math.max(R0.minX, Math.min(R0.maxX, aim.x));
    aim.z = Math.max(R0.minZ, Math.min(R0.maxZ, aim.z));
    return aim;
  },
  settings() {
    const s = (typeof Save !== 'undefined' && Save.data && Save.data.settings) || {};
    return { invert: !!s.aimInvert, sensitivity: s.aimSensitivity || 'normal' };
  },
};
