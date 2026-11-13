// Cricket Legends — notifications (Rule B, 13 Nov). Tuning: data/notify.js. Text: notify.*.
//
// Only four kinds, each worth coming back for: a reward waiting, new missions open,
// a rival match (or event) next, the next career match ready.
//   - Nothing is sent unless the player said yes. We ask ONCE, after the first win,
//     with a friendly line first (NotifyAsk). A "no" is final.
//   - Settings > ALERTS: one main switch + one per kind (save.settings). Off = cancel waiting.
//   - When the game goes to the background we plan what to send (plan()), and hand it to
//     the phone through Platform.notify* (Capacitor Local Notifications in the app,
//     browser notifications on the web). Coming back cancels anything not sent yet.
//   - At most NOTIFY_DATA.maxPerDay a day, never in quiet hours (moved to the morning).
//   - Tapping one opens the right screen (route()).
// Not gameplay, so no RNG: the text variant is picked from a hash of the day + kind.

const Notify = {
  D() { return NOTIFY_DATA; },

  // ---- saved state (save.notify) ----
  ensure(save) {
    const n = save.notify = save.notify && typeof save.notify === 'object' ? save.notify : {};
    if (typeof n.asked !== 'boolean') n.asked = false;         // the question has been shown
    if (n.answer !== 'yes' && n.answer !== 'no') n.answer = null;
    if (typeof n.wantAsk !== 'boolean') n.wantAsk = false;     // a win happened: ask on the next calm screen
    if (!Array.isArray(n.log)) n.log = [];                     // [{ kind, at }] sent (for the daily cap)
    if (!Array.isArray(n.planned)) n.planned = [];             // [{ id, kind, at }] handed to the phone
    if (typeof n.missionsSeen !== 'number') n.missionsSeen = 0;
    return n;
  },

  // ---- switches ----
  on(save) { return GameSettings.getIn(save, this.D().mainKey) !== false; },
  kindOn(save, kind) { return this.on(save) && GameSettings.getIn(save, this.D().keys[kind]) !== false; },
  // Called by Settings when a switch changes: anything now off is cancelled straight away.
  switched(save, key, value) {
    const D0 = this.D(), n0 = this.ensure(save);
    // The player turning the main switch back on themselves is the only way to be asked again.
    if (value && key === D0.mainKey && n0.answer !== 'yes' && Platform.notifyCanAsk()) { this.answer(save, true).then(() => Save.write()); return; }
    if (value) return;
    const n = this.ensure(save), D = this.D();
    const kinds = key === D.mainKey ? D.kinds : D.kinds.filter((k) => D.keys[k] === key);
    const drop = n.planned.filter((p) => kinds.includes(p.kind));
    if (drop.length) Platform.notifyCancel(drop.map((p) => p.id));
    n.planned = n.planned.filter((p) => !kinds.includes(p.kind));
  },

  // For Settings: 'on' | 'off' | 'notAsked' | 'declined' | 'blocked' | 'unsupported'.
  status(save) {
    const n = this.ensure(save);
    if (!this.on(save)) return 'off';
    if (Platform.notifyAllowed() && n.answer === 'yes') return 'on';
    if (!Platform._localNotif() && !Platform._webNotif()) return 'unsupported';
    if (n.answer === 'no') return Platform.notifyCanAsk() ? 'declined' : 'blocked';
    return Platform.notifyCanAsk() ? 'notAsked' : 'blocked';
  },

  // ---- what is worth a nudge right now ----
  _activeCareers(save) {
    return (save.careerSlots || []).map((s, i) => (s ? Object.assign({ slot: i + 1 }, s) : null))
      .filter((s) => s && !['create', 'club', 'complete'].includes(s.phase))
      .sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
  },
  _missionsOpen(save) {
    if (typeof Missions === 'undefined' || typeof Modes === 'undefined' || !Modes.unlocked(save, 'missions')) return 0;
    return MISSION_DATA.list.filter((m) => Missions.open(save, m.id)).length;
  },
  // A list of { kind, slot?, vars } (unfiltered by the switches).
  candidates(save) {
    const out = [], careers = this._activeCareers(save);
    const tokens = ((save.currencies && save.currencies.bankedTokens) || 0) + careers.reduce((a, c) => a + (c.tokens || 0), 0);
    if (tokens > 0) {
      const c = careers.find((x) => x.tokens > 0) || careers[0];
      out.push({ kind: 'reward', slot: c ? c.slot : null, vars: { n: tokens, name: c ? c.name : '' } });
    }
    const n = this.ensure(save), open = this._missionsOpen(save);
    if (open > n.missionsSeen) out.push({ kind: 'missions', vars: { n: open - n.missionsSeen } });
    const riv = careers.find((c) => c.rival);
    if (riv) out.push({ kind: 'rival', slot: riv.slot, vars: { name: riv.name, rival: T('rival.' + riv.rival) } });
    const next = careers.find((c) => !riv || c.slot !== riv.slot);
    if (next) out.push({ kind: 'career', slot: next.slot, vars: { name: next.name } });
    return out;
  },

  // ---- timing rules ----
  // Quiet hours: anything from 10 pm to 8 am moves to 8 am.
  fitQuiet(t) {
    const Q = this.D().quiet, d = new Date(t), h = d.getHours();
    if (h >= Q.from) { d.setDate(d.getDate() + 1); d.setHours(Q.to, 0, 0, 0); return d.getTime(); }
    if (h < Q.to) { d.setHours(Q.to, 0, 0, 0); return d.getTime(); }
    return t;
  },
  inQuiet(t) { const Q = this.D().quiet, h = new Date(t).getHours(); return h >= Q.from || h < Q.to; },
  dayKey(t) { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
  _nextMorning(t) { const d = new Date(t); d.setDate(d.getDate() + 1); d.setHours(this.D().quiet.to, 0, 0, 0); return d.getTime(); },

  // What to send if the player leaves now: [{ id, kind, at, title, body, extra }].
  plan(save, now) {
    const D = this.D(), n = this.ensure(save);
    if (!this.on(save) || n.answer !== 'yes') return [];
    const want = this.candidates(save).filter((c) => this.kindOn(save, c.kind))
      .sort((a, b) => D.priority.indexOf(a.kind) - D.priority.indexOf(b.kind));
    const taken = n.log.filter((e) => e.at > now - 2 * 864e5).map((e) => e.at);     // already sent recently
    const out = [], gap = D.spacingMin * 60e3, horizon = now + D.horizonDays * 864e5;
    const perDay = (t) => taken.concat(out.map((o) => o.at)).filter((x) => this.dayKey(x) === this.dayKey(t)).length;
    for (const c of want) {
      let t = now + D.delayHours[c.kind] * 3600e3;
      for (let guard = 0; guard < 40 && t <= horizon; guard++) {
        t = this.fitQuiet(t);
        if (perDay(t) >= D.maxPerDay) { t = this._nextMorning(t); continue; }
        const clash = taken.concat(out.map((o) => o.at)).find((x) => Math.abs(x - t) < gap);
        if (clash !== undefined) { t = clash + gap; continue; }
        break;
      }
      if (t > horizon || this.inQuiet(t) || perDay(t) >= D.maxPerDay) continue;
      const k = D.kinds.indexOf(c.kind), v = this._variant(c.kind, t);
      out.push({ id: D.idBase + k * 10, kind: c.kind, at: t,
        title: T(`notify.${c.kind}.title.${v}`, c.vars), body: T(`notify.${c.kind}.body.${v}`, c.vars),
        extra: { kind: c.kind, slot: c.slot || null } });
    }
    return out.sort((a, b) => a.at - b.at);
  },
  _variant(kind, t) {
    let h = 2166136261;
    for (const ch of kind + this.dayKey(t)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return 1 + (h % this.D().variants);
  },

  // ---- lifecycle (main.js) ----
  // Going to the background: hand the plan to the phone.
  leaving(save, now) {
    const n = this.ensure(save);
    this._settle(n, now);
    if (n.planned.length) Platform.notifyCancel(n.planned.map((p) => p.id));
    const list = Platform.notifyAllowed() ? this.plan(save, now) : [];
    n.planned = list.map((p) => ({ id: p.id, kind: p.kind, at: p.at }));
    if (list.length) Platform.notifySchedule(list);
    return list;
  },
  // Back again: whatever was due has been sent (count it for the daily cap); the rest is cancelled.
  back(save, now) {
    const n = this.ensure(save);
    this._settle(n, now);
    if (n.planned.length) Platform.notifyCancel(n.planned.map((p) => p.id));
    n.planned = [];
  },
  _settle(n, now) {
    for (const p of n.planned) if (p.at <= now) n.log.push({ kind: p.kind, at: p.at });
    n.planned = n.planned.filter((p) => p.at > now);
    n.log = n.log.filter((e) => e.at > now - 7 * 864e5).slice(-30);
  },

  // ---- the one-time question ----
  // After any win: if we've never asked (and could), ask on the next calm screen.
  won(save) {
    const n = this.ensure(save);
    if (!n.asked && n.answer === null && this.on(save) && Platform.notifyCanAsk()) n.wantAsk = true;
  },
  shouldAsk(save, scene) {
    const n = this.ensure(save);
    return n.wantAsk && !n.asked && n.answer === null && this.D().askOn.includes(scene) && Platform.notifyCanAsk();
  },
  // The player's answer to our friendly line. "Yes" then shows the phone's own question.
  answer(save, yes) {
    const n = this.ensure(save);
    n.asked = true; n.wantAsk = false;
    if (!yes) { n.answer = 'no'; return Promise.resolve(false); }
    return Platform.notifyRequest().then((ok) => { n.answer = ok ? 'yes' : 'no'; return ok; })
      .catch(() => { n.answer = 'no'; return false; });
  },

  // ---- tapping a notification ----
  pendingRoute: null,
  tapped(extra) {
    this.pendingRoute = extra && extra.kind ? extra : null;
    if (this.pendingRoute && typeof Scenes !== 'undefined' && Scenes.current && this.D().askOn.concat(['settings', 'careerselect']).includes(Scenes.currentName)) this.follow();
  },
  // Opens the screen the notification was about. Returns the screen name (for tests).
  follow() {
    const r = this.pendingRoute;
    this.pendingRoute = null;
    if (!r) return null;
    if (r.kind === 'missions' && Modes.unlocked(Save.data, 'missions')) { Scenes.go('missions'); return 'missions'; }
    if (r.slot && Save.data.careerSlots[r.slot - 1]) {
      CareerSave.load(r.slot).then((c) => { if (c) Scenes.go('careerhome', { slot: r.slot, career: c }); });
      return 'careerhome';
    }
    Scenes.go('careerselect');
    return 'careerselect';
  },
};

// The friendly question, drawn over whatever calm screen is showing (core/scenes.js).
const NotifyAsk = {
  open: false,
  buttons: null,                 // made on first use (core/ui.js loads after this file in tests)
  show() {
    this.open = true;
    this.buttons = this.buttons || new ButtonList();
    const cx = CONFIG.LOGICAL_W / 2, cy = CONFIG.LOGICAL_H / 2;
    this.buttons.clear();
    this.buttons.add('notify.ask.yes', cx - 470, cy + 120, 450, 120, () => this._answer(true), { size: 40, color: '#9cff6a' });
    this.buttons.add('notify.ask.no', cx + 20, cy + 120, 450, 120, () => this._answer(false), { size: 40, color: '#e9eef5' });
  },
  // Back button / Escape: not an answer. Close, and ask again after another win.
  dismiss() { this.open = false; Notify.ensure(Save.data).wantAsk = false; },
  _answer(yes) {
    this.open = false;
    Notify.answer(Save.data, yes).then(() => Save.write());
    Save.write();
  },
  render(ctx) {
    const v = Display.viewRect(), cx = CONFIG.LOGICAL_W / 2, cy = CONFIG.LOGICAL_H / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(v.x, v.y, v.w, v.h);
    R.panel(cx - 560, cy - 300, 1120, 600, 'rgba(12,26,44,0.97)', '#ffd23f');
    R.text(T('notify.ask.title'), cx, cy - 210, 56, '#ffd23f');
    T('notify.ask.line').split('|').forEach((ln, i) => R.text(ln, cx, cy - 110 + i * 50, 32, '#ffffff', 'center', false, 1000));
    R.text(T('notify.ask.small'), cx, cy + 70, 22, '#b8c6d6', 'center', false, 1000);
    this.buttons.draw();
  },
  pointerDown(id, x, y) { this.buttons.down(id, x, y); },
  pointerMove(id, x, y) { this.buttons.move(id, x, y); },
  pointerUp(id) { this.buttons.up(id); },
};
