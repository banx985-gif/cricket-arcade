// Cricket Arcade — the Mission Hub (plan 4 "Mission Flow", 18):
//   Mission Hub -> category -> mission -> briefing -> play -> star result -> reward -> next
//   MissionHubScene     categories, the missions with their stars, the briefing
//   MissionResultScene  cleared / failed, the three stars, rewards
//   MissionHud          the objective chip during a mission (matchbat / matchbowl)
//   MissionText         objective / star / situation wording

const MissionText = {
  goal(m) {
    const g = m.goal, rival = m.opp && m.opp.rival ? T('rival.' + m.opp.rival) : '';
    const n = g.n, t = m.target, b = m.balls;
    switch (g.kind) {
      case 'runs': return T(m.side === 'bat' && m.at.runs === 0 && !m.super ? 'mis.goal.score' : 'mis.goal.chase', { n: t, b });
      case 'boundaries': return T(g.consecutive ? (g.sixes ? 'mis.goal.sixesRow' : 'mis.goal.boundRow') : (g.sixes ? 'mis.goal.sixes' : 'mis.goal.bound'), { n, b });
      case 'survive': return T('mis.goal.survive', { b });
      case 'milestone': return T('mis.goal.milestone', { n, b });
      case 'defend': return T('mis.goal.defend', { n: t, b });
      case 'wickets': return T(n === 1 ? 'mis.goal.wicket' : 'mis.goal.wickets', { n, b });
      case 'dots': return T('mis.goal.dots', { n, b });
      case 'dismiss': return T('mis.goal.dismiss', { r: rival, b });
    }
    return '';
  },
  star(st) {
    if (st.field) return T('mis.star.field', { f: T('field.' + st.field) });
    if (st.stat.startsWith('wk_')) return T('mis.star.wk', { d: T('bowl.type.' + st.stat.slice(3)) });
    // "Hit a six" / "Don't lose a wicket" read better than "1+" / "no more than 0"
    const key = 'mis.star.' + st.stat, n = st.min !== undefined ? st.min : st.max;
    if (st.min === 1 && STRINGS.en[key + '.one']) return T(key + '.one');
    if (st.max === 0 && STRINGS.en[key + '.none']) return T(key + '.none');
    return T(key + (st.min !== undefined ? '.min' : '.max'), { n });
  },
  situation(m) {
    const over = m.at.over + '.' + m.at.ball, wk = m.wkts || 10 - m.at.wkts;
    const base = m.super ? T('mis.sit.super') : T('mis.sit.score', { r: m.at.runs, w: m.at.wkts, o: over });
    return base + ' · ' + T(wk === 1 ? 'mis.sit.lastWicket' : 'mis.sit.wickets', { n: wk });
  },
  reward(r) { return r ? AchText.reward(r) : ''; },
};

// A code-drawn star (never art): gold when earned.
function drawMissionStar(cx, cy, r, on, pop) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  const k = pop || 1;
  if (k !== 1) for (const p of pts) { p.x = cx + (p.x - cx) * k; p.y = cy + (p.y - cy) * k; }
  R.poly(pts, on ? '#ffd23f' : 'rgba(255,255,255,0.12)', on ? '#7a4d00' : 'rgba(255,255,255,0.45)', 3);
}

const MissionHubScene = {
  buttons: new ButtonList(),
  cat: 'batting',
  sel: null,             // the mission being briefed (null = the list)
  _t: 0,

  enter(params) {
    ChallengeAssets.ensure();
    Sprites.loadGroup('careerWorld');       // rival art
    Sprites.loadGroup('careerLate');
    this._t = 0;
    if (params && params.cat) this.cat = params.cat;
    this.sel = params && params.brief ? params.brief : null;
    if (this.sel) this.cat = Missions.def(this.sel).cat;
    Effects.init();
    this._layout();
  },

  _layout() {
    const b = this.buttons, s = Display.safe, cx = CONFIG.LOGICAL_W / 2, save = Save.data;
    b.clear();
    if (this.sel) {
      const m = Missions.def(this.sel);
      b.add('mis.play', cx + 250, 920, 520, 120, () => Scenes.go(MissionMatch.start(m.id)), { size: 56, color: '#9cff6a' });
      b.add('gear.back', cx - 770, 920, 380, 120, () => { this.sel = null; this._layout(); }, { size: 40, color: '#e9eef5' });
      return;
    }
    b.add('gear.back', s.left + 20, s.top + 16, 200, 96, () => Scenes.go('title'), { size: 32, color: '#e9eef5' });
    MISSION_DATA.categories.forEach((c, i) => {
      const open = Missions.catOpen(save, c.id);
      b.add(() => T('mis.cat.' + c.id), cx - 870 + i * 350, 140, 330, 100, () => { if (open) { this.cat = c.id; this._layout(); } },
        { size: 30, color: this.cat === c.id ? c.colour : '#5b6570', textColor: this.cat === c.id ? CONFIG.COLOR.ink : '#ffffff', icon: c.icon,
          disabled: !open, sub: () => (open ? T('mis.catStars', { n: Missions.inCat(c.id).reduce((a, m) => a + Missions.stars(save, m.id), 0), t: Missions.inCat(c.id).length * 3 }) : T('mis.catLocked', { n: c.opensAfter })) });
    });
    for (const c of this._cells()) {
      const bt = b.add(() => '', c.x, c.y, c.w, c.h, () => { if (Missions.open(save, c.m.id)) { this.sel = c.m.id; this._layout(); } else Sound.play('edge'); });
      bt.invisible = true;
    }
  },

  _cells() {
    const cx = CONFIG.LOGICAL_W / 2, list = Missions.inCat(this.cat);
    return list.map((m, i) => ({ m, i, x: cx - 860 + (i % 4) * 432, y: 280 + Math.floor(i / 4) * 236, w: 410, h: 216 }));
  },

  update(dt) { this._t += dt; Effects.update(dt); },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) { Sound.unlock(); this.buttons.down(id, x, y); } },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) {
    if (code === 'Escape') { if (this.sel) { this.sel = null; this._layout(); } else Scenes.go('title'); }
    if (this.sel && (code === 'Enter' || code === 'Space')) Scenes.go(MissionMatch.start(this.sel));
  },

  render(ctx) {
    CareerUI.bg(ctx, 'bg_mission_hub', 0.62);
    const cx = CONFIG.LOGICAL_W / 2, s = Display.safe, save = Save.data;
    if (this.sel) { this._drawBrief(ctx, Missions.def(this.sel)); this.buttons.draw(); return; }
    Sprites.ui('icon_missions', cx - 270, 70, 90, 90);
    R.text(T('mis.title'), cx, 70, 58, '#ffffff');
    R.text(T('mis.totals', { s: Missions.totalStars(save), t: MISSION_DATA.list.length * 3, p: Missions.perfectCount(save) }), s.right - 40, s.top + 60, 26, '#ffd23f', 'right');
    this.buttons.draw();
    for (const c of this._cells()) this._drawCell(ctx, c);
    R.text(T('mis.hint'), cx, 1050, 22, '#b8c6d6', 'center', false);
  },

  _drawCell(ctx, c) {
    const save = Save.data, m = c.m, open = Missions.open(save, m.id), st = Missions.state(save, m.id);
    const col = Missions.cat(m.cat).colour;
    R.roundRect(c.x + 5, c.y + 7, c.w, c.h, 22, 'rgba(0,0,0,0.45)');
    R.roundRect(c.x, c.y, c.w, c.h, 22, open ? 'rgba(12,26,44,0.94)' : 'rgba(30,34,40,0.9)', open ? col : '#5b6570', open ? 4 : 2);
    R.text(String(c.i + 1), c.x + 34, c.y + 38, 34, open ? col : '#8a96a3');
    Sprites.ui(CHALLENGE_DATA.difficulty[m.diff].icon, c.x + c.w - 40, c.y + 38, 56, 56, { alpha: open ? 1 : 0.4 });
    R.text(T('mis.' + m.id), c.x + c.w / 2, c.y + 88, 28, open ? '#ffffff' : '#8a96a3');
    R.text(T(m.side === 'bat' ? 'mis.youBat' : 'mis.youBowl') + ' · ' + T('chal.diff.' + m.diff), c.x + c.w / 2, c.y + 124, 18, '#b8c6d6', 'center', false);
    if (!open) { R.text(T('mis.locked'), c.x + c.w / 2, c.y + 170, 22, '#8a96a3', 'center', false); return; }
    for (let k = 0; k < 3; k++) drawMissionStar(c.x + c.w / 2 - 60 + k * 60, c.y + 170, 22, !!(st && st.stars[k]));
  },

  _drawBrief(ctx, m) {
    const cx = CONFIG.LOGICAL_W / 2, save = Save.data, st = Missions.state(save, m.id), rw = Missions.reward(m);
    const col = Missions.cat(m.cat).colour;
    R.panel(cx - 880, 40, 1760, 860, 'rgba(10,22,40,0.95)', col);
    R.text(T('mis.cat.' + m.cat) + ' · ' + (Missions.inCat(m.cat).indexOf(m) + 1), cx, 86, 26, col);
    R.text(T('mis.' + m.id), cx, 140, 56, '#ffffff');
    Sprites.ui(CHALLENGE_DATA.difficulty[m.diff].icon, cx + 700, 120, 90, 90);
    R.text(T('chal.diff.' + m.diff), cx + 700, 184, 20, '#d8e4f0', 'center', false);
    T('mis.' + m.id + '.brief').split('|').forEach((ln, i) => R.text(ln, cx, 210 + i * 36, 26, '#d8e4f0', 'center', false));
    // the situation and the objective
    R.panel(cx - 820, 300, 1640, 150, 'rgba(0,0,0,0.35)');
    R.text(MissionText.situation(m), cx, 340, 30, '#ffffff', 'center', false);
    R.text(MissionText.goal(m), cx, 400, 40, '#ffd23f');
    // your player(s)
    const who = m.side === 'bat' ? [m.hero].concat(m.partner ? [m.partner] : []) : m.bowlers;
    R.text(T(m.side === 'bat' ? 'mis.yourBatters' : 'mis.yourBowlers'), cx - 800, 492, 22, '#b8c6d6', 'left', false);
    who.forEach((id, i) => {
      const C = MISSION_DATA.cast[id], y = 540 + i * 56;
      const fam = C.family ? T(Bowling.family(C.family).nameKey) + ' · ' : '';
      R.text(T('mis.cast.' + id), cx - 800, y, 28, '#ffffff', 'left');
      R.text(fam + (C.tech.length ? C.tech.map((t) => TreeText.name(t)).join(' + ') : T('mis.noTech')), cx - 800, y + 26, 18, '#9be7ff', 'left', false);
    });
    if (m.opp && m.opp.rival) {
      const R0 = Rivals.rival(m.opp.rival);
      Sprites.ui(R0.art, cx - 160, 640, 200, 240);
      R.text(T('mis.facing', { r: T('rival.' + m.opp.rival) }), cx - 160, 780, 22, '#ff9d7a');
    }
    // stars
    R.text(T('mis.starsTitle'), cx + 120, 492, 22, '#b8c6d6', 'left', false);
    m.stars.forEach((s0, k) => {
      const y = 548 + k * 70, on = !!(st && st.stars[k]);
      drawMissionStar(cx + 150, y, 26, on);
      R.text(MissionText.star(s0), cx + 200, y, 28, on ? '#ffd23f' : '#ffffff', 'left', false);
    });
    // rewards
    const paid = (k) => (st && st[k] ? ' ' + T('mis.paid') : '');
    R.text(T('mis.rewardFirst', { r: MissionText.reward(rw.first) }) + paid('firstPaid'), cx + 120, 790, 24, '#9cff6a', 'left', false);
    R.text(T('mis.rewardPerfect', { r: MissionText.reward(rw.perfect) }) + paid('perfectPaid'), cx + 120, 830, 24, '#9cff6a', 'left', false);
  },
};

// The objective during the mission (top centre, under the ball banner).
const MissionHud = {
  draw(ctx, scene) {
    const ctx0 = MissionMatch.ctx, m = MissionMatch.m, inn = scene.inn;
    if (!ctx0 || !inn) return;
    const f = Missions.facts(ctx0, inn), g = m.goal, cx = CONFIG.LOGICAL_W / 2, y = Display.safe.top + 186;
    let line;
    switch (g.kind) {
      case 'boundaries': line = T('mis.hud.count', { a: g.consecutive ? f.bestStreak : g.sixes ? f.sixes : f.boundaries, n: g.n }); break;
      case 'milestone': line = T('mis.hud.milestone', { r: f.heroRuns, n: g.n }); break;
      case 'wickets': line = T('mis.hud.count', { a: f.wickets, n: g.n }); break;
      case 'dots': line = T('mis.hud.count', { a: f.dots, n: g.n }); break;
      case 'dismiss': line = f.rivalOut ? T('mis.hud.done') : T('mis.hud.rival', { r: T('rival.' + m.opp.rival) }); break;
      case 'survive': line = T('mis.hud.survive', { n: inn.maxBalls - inn.legal }); break;
      default: line = null;
    }
    const text = T('mis.hud.label') + ' ' + MissionText.goal(m) + (line ? '  ·  ' + line : '');
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    const w = Math.min(1100, ctx.measureText(text).width + 60);
    ctx.restore();
    R.roundRect(cx - w / 2, y - 24, w, 48, 22, 'rgba(8,20,36,0.82)', Missions.cat(m.cat).colour, 3);
    R.text(text, cx, y, 22, '#ffffff', 'center', false);
  },
};

const MissionResultScene = {
  buttons: new ButtonList(),
  d: null, _t: 0,
  enter(params) {
    ChallengeAssets.ensure();
    this.d = params; this._t = 0;
    Effects.init();
    const cx = CONFIG.LOGICAL_W / 2, m = Missions.def(params.id), b = this.buttons;
    b.clear();
    b.add('result.retry', cx - 640, 920, 400, 120, () => Scenes.go(MissionMatch.start(m.id)), { size: 52 });
    const list = Missions.inCat(m.cat), next = list[list.indexOf(m) + 1];
    if (next && Missions.open(Save.data, next.id)) b.add('mis.next', cx - 200, 920, 400, 120, () => Scenes.go('missions', { brief: next.id }), { size: 48, color: '#9cff6a' });
    b.add('mis.toHub', cx + 240, 920, 400, 120, () => Scenes.go('missions', { cat: m.cat }), { size: 44, color: '#e9eef5' });
    if (params.cleared) { Sound.play('fanfare'); Sound.play('crowdRoar'); } else Sound.play('crowdGroan');
  },
  update(dt) {
    this._t += dt; Effects.update(dt);
    if (this.d.cleared && this._t % 0.5 < dt) Effects.sparks(360 + ((this._t * 977) % 1200), 180, 14, ['#ffd23f', '#9cff6a', '#5fd4ff'][Math.floor(this._t * 2) % 3], 700);
  },
  pointerDown(id, x, y) { if (!Dev.pointerDown(id, x, y)) this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { if (!Dev.pointerMove(id, x, y)) this.buttons.move(id, x, y); },
  pointerUp(id) { if (!Dev.pointerUp(id)) this.buttons.up(id); },
  keyDown(code) {
    if (code === 'Enter' || code === 'Space') Scenes.go(MissionMatch.start(this.d.id));
    if (code === 'Escape') Scenes.go('missions', { cat: Missions.def(this.d.id).cat });
  },
  render(ctx) {
    const d = this.d, m = Missions.def(d.id), cx = CONFIG.LOGICAL_W / 2;
    CareerUI.bg(ctx, 'bg_mission_hub', 0.7);
    R.text(T('mis.' + m.id), cx, 90, 44, '#d8e4f0');
    const pop = Math.min(1, this._t / 0.3);
    ctx.save(); ctx.translate(cx, 190); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
    R.text(T(d.cleared ? 'mis.cleared' : 'mis.failed'), 0, 0, 110, d.cleared ? '#9cff6a' : '#ff8f8f');
    ctx.restore();
    R.text(MissionText.goal(m), cx, 290, 30, '#ffffff', 'center', false);
    R.text(T('mis.scoreLine', { s: d.score }), cx, 334, 24, '#b8c6d6', 'center', false);
    // the three stars: this attempt, then the best
    m.stars.forEach((st, k) => {
      const y = 430 + k * 92, gotNow = !!d.got[k], have = !!d.stars[k];
      const t = this._t - 0.5 - k * 0.35, p = t > 0 ? Math.min(1, t / 0.25) : 0;
      drawMissionStar(cx - 520, y, 34, have && (gotNow ? p > 0 : true), gotNow ? 0.6 + 0.4 * p + Math.max(0, 0.25 - t) : 1);
      R.text(MissionText.star(st), cx - 460, y, 32, gotNow ? '#ffd23f' : '#ffffff', 'left', false);
      R.text(gotNow ? T('mis.starGot') : have ? T('mis.starBefore') : T('mis.starMissed'), cx + 520, y, 24, gotNow ? '#9cff6a' : have ? '#d8e4f0' : '#ff9d9d', 'right', false);
    });
    let y = 740;
    for (const r of d.rewards || []) { R.text(T(r.kind === 'first' ? 'mis.gotFirst' : 'mis.gotPerfect', { r: MissionText.reward(r.reward) }), cx, y, 30, '#9cff6a'); y += 44; }
    for (const r of d.milestones || []) { R.text(T('mis.gotMilestone', { n: r.ms.perfect, r: MissionText.reward(r.reward) }), cx, y, 26, '#ffd23f', 'center', false); y += 40; }
    if (!d.cleared) R.text(T('mis.tryAgain'), cx, 760, 28, '#d8e4f0', 'center', false);
    this.buttons.draw();
    Effects.drawParticles(ctx);
  },
};
