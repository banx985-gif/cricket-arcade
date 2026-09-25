// Cricket Arcade — hidden developer panel (plan 43A.3). Debug builds only:
// CONFIG.DEBUG_BUILD is switched off for release builds (publish.ps1 -Release).
// Open it with 5 quick taps on the TOP-LEFT corner of the screen (or the
// backquote ` key on a PC).
//
// Tabs:
//   MAIN  — seed, Golden Ball, slow-mo, hit-zone debug, FPS
//   JUMP  — go straight to any screen / mode (incl. a 1-over test match)
//   MATCH — force a match state: tie on the last ball, end the innings, free hit
//   SAVE  — inspect the save, print it, corrupt it (to test backup recovery), wipe it
//   CAREER — Wicket Tree testing: +10 Skill Tokens, +500 coins, "between stages" (respec)
// More commands are added as their systems arrive (career, items, …).

const Dev = {
  enabled: CONFIG.DEBUG_BUILD,
  open: false,
  tab: 'main',
  fixedSeed: null,        // when set, every new innings uses this seed
  forceGolden: false,     // next delivery is a Golden Ball
  slowmo: false,
  hitzone: false,
  showFps: false,
  matchFormat: null,      // quick match format override (e.g. 'test1')
  forceFate: null,        // next ball: 'lbw' | 'hitwicket' | 'padLeg' | 'bowled' (see BallPlay.fate)
  difficulty: null,       // Rivals strength override ('easy' | 'normal' | 'hard')
  pitch: null, weather: null,   // force match conditions (tests / art checks)
  _taps: [],
  _buttons: new ButtonList(),
  _msg: '',
  _msgT: 0,
  _saveLines: [],

  CORNER: 170,            // size of the secret tap zone (logical px)

  // Returns true if the touch was used by the panel (or its secret corner).
  pointerDown(id, x, y) {
    if (!this.enabled) return false;
    if (this.open) { this._buttons.down(id, x, y); return true; }
    const s = Display.safe;
    if (x < s.left + this.CORNER && y < s.top + this.CORNER) {
      const now = performance.now();
      this._taps.push(now);
      this._taps = this._taps.filter(t => now - t < 2000);
      if (this._taps.length >= 5) { this._taps = []; this.show(); return true; }
    }
    return false;
  },
  pointerMove(id, x, y) { if (this.open) { this._buttons.move(id, x, y); return true; } return false; },
  pointerUp(id) { if (this.open) { this._buttons.up(id); return true; } return false; },

  toggle() { if (this.open) this.hide(); else this.show(); },

  show() {
    if (!this.enabled) return;
    this.open = true;
    this._layout();
    Log.add('dev', 'panel opened');
  },

  hide() { this.open = false; },

  say(msg) { this._msg = msg; this._msgT = 2.5; },

  _state(on) { return on ? T('dev.on') : T('dev.off'); },

  _inMatch() {
    return (Scenes.currentName === 'matchbat' || Scenes.currentName === 'matchbowl' || Scenes.currentName === 'careersim') && Match.current();
  },

  _layout() {
    const b = this._buttons;
    b.clear();
    const cx = CONFIG.LOGICAL_W / 2;
    // tabs
    const tabs = ['main', 'jump', 'match', 'save', 'career', 'myxi', 'chal', 'mission'];
    tabs.forEach((t, i) => {
      b.add(() => T('dev.tab.' + t), cx - 792 + i * 198, 150, 190, 88, () => { this.tab = t; this._layout(); },
        { size: 26, color: this.tab === t ? '#ffd23f' : '#6b7a8c', textColor: this.tab === t ? '#000' : '#fff' });
    });
    const w = 600, h = 88, gap = 6;                 // (rows 94 apart: the CAREER tab has 8 rows)
    const L = cx - w - gap / 2, Rr = cx + gap / 2;
    const row = (i) => 270 + i * (h + gap);
    const opts = { size: 30, color: '#e9eef5' };
    const add = (col, i, label, fn, o) => b.add(label, col === 0 ? L : Rr, row(i), w, h, fn, Object.assign({}, opts, o || {}));

    if (this.tab === 'main') {
      add(0, 0, () => T('dev.setSeed'), () => this._askSeed());
      add(0, 1, () => T('dev.replaySeed'), () => { this.fixedSeed = RNG.seed; this.say(T('dev.seedNext', { seed: RNG.seed })); });
      add(0, 2, () => T('dev.clearSeed'), () => { this.fixedSeed = null; this.say(T('dev.seedRandom')); });
      add(1, 0, () => T('dev.golden', { state: this._state(this.forceGolden) }), () => { this.forceGolden = !this.forceGolden; });
      add(1, 1, () => T('dev.slowmo', { state: this._state(this.slowmo) }), () => { this.slowmo = !this.slowmo; });
      add(1, 2, () => T('dev.hitzone', { state: this._state(this.hitzone) }), () => { this.hitzone = !this.hitzone; });
      add(1, 3, () => T('dev.fps', { state: this._state(this.showFps) }), () => { this.showFps = !this.showFps; });
      add(0, 3, () => T('dev.layers', { state: this._state(Stadium.showLayers) }), () => { Stadium.showLayers = !Stadium.showLayers; });
      add(0, 4, () => T('dev.rivals', { state: T('dev.diff.' + (this.difficulty || PLAYER_DATA.quickMatchDifficulty)) }), () => {
        const k = ['easy', 'normal', 'hard'];
        this.difficulty = k[(k.indexOf(this.difficulty || PLAYER_DATA.quickMatchDifficulty) + 1) % 3];
      });
    } else if (this.tab === 'jump') {
      const go = (scene, params) => () => { this.hide(); Scenes.go(scene, params); };
      add(0, 0, () => T('dev.jump.title'), go('title'));
      add(0, 1, () => T('dev.jump.sixsmash'), go('sixsmash'));
      add(0, 2, () => T('dev.jump.wicketrush'), go('wicketrush'));
      add(0, 3, () => T('dev.jump.settings'), go('settings'));
      add(1, 0, () => T('dev.jump.match'), () => { this.matchFormat = null; go('toss')(); });
      add(1, 1, () => T('dev.jump.match1'), () => { this.matchFormat = 'test1'; go('toss', { format: 'test1' })(); });
      // M12: Quick Match setup, the Trophy Room, every mode open, profile XP, a fresh first launch
      add(1, 2, () => T('dev.jump.quickmatch'), go('quickmatch'));
      add(1, 3, () => T('dev.jump.trophies'), go('trophyroom'));
      add(1, 4, () => T('dev.meta.allModes', { state: this._state(Save.data.unlocks && Save.data.unlocks.allModes) }), () => {
        Save.data.unlocks = Save.data.unlocks || {}; Save.data.unlocks.allModes = !Save.data.unlocks.allModes; Save.write(); if (Scenes.currentName === 'title') TitleScene._layout();
      });
      add(1, 5, () => T('dev.meta.xp'), () => { Profile.add(Save.data, 1000, 'dev'); Save.write(); this.say(T('dev.meta.level', { n: Profile.level(Save.data) })); });
      add(0, 4, () => T('dev.meta.firstLaunch'), () => { Save.data.tutorial = { step: 'welcome' }; Save.write(); this.hide(); Scenes.go('title'); });
      add(0, 5, () => T('dev.meta.tutorial'), () => { this.hide(); Scenes.go('tutorial', { phase: 'batIntro', replay: true, career: null }); });
    } else if (this.tab === 'match') {
      add(0, 0, () => T('dev.match.tieLastBall'), () => this._tieLastBall());
      add(0, 1, () => T('dev.match.tieNow'), () => this._tieNow());
      add(1, 0, () => T('dev.match.endInnings'), () => this._endInnings());
      add(1, 1, () => T('dev.match.freeHit'), () => this._matchDo((inn) => { inn.freeHit = true; this.say(T('dev.done')); }));
      add(0, 2, () => T('dev.match.forceLbw'), () => { this.forceFate = 'lbw'; this.say(T('dev.done')); });
      add(0, 3, () => T('dev.match.forceHitWicket'), () => { this.forceFate = 'hitwicket'; this.say(T('dev.done')); });
      add(0, 4, () => T('dev.match.forceLegNotOut'), () => { this.forceFate = 'padLeg'; this.say(T('dev.done')); });
      add(1, 3, () => T('dev.match.careerSim'), () => {
        if (!CareerMatch.on) { this.say(T('dev.match.careerOnly')); return; }
        this.hide();
        CareerMatch.autoPlay();
        Scenes.go('careerresult', CareerMatch.finish());
      });
      add(1, 2, () => T('dev.match.checkpoint'), () => this._matchDo(() => { Match.checkpoint('over'); this.say(T('dev.done')); }));
    } else if (this.tab === 'career') {
      // Works on the career open on Career Home (or in a career match).
      const withCareer = (fn) => () => {
        const c = (Scenes.currentName === 'careerhome' && CareerHomeScene.career) || (Scenes.currentName === 'careertree' && CareerTreeScene.career) || (CareerMatch.on && CareerMatch.career);
        if (!c) { this.say(T('dev.career.none')); return; }
        const slot = Scenes.currentName === 'careertree' ? CareerTreeScene.slot : Scenes.currentName === 'careerhome' ? CareerHomeScene.slot : CareerMatch.slot;
        fn(c); CareerSave.save(c, slot); this.say(T('dev.done'));
      };
      add(0, 0, () => T('dev.career.tokens'), withCareer((c) => SkillTree.earn(c, 'level', 10)));
      add(0, 1, () => T('dev.career.coins'), () => { Save.data.currencies.coins = (Save.data.currencies.coins || 0) + 500; Save.write(); this.say(T('dev.done')); });
      add(1, 0, () => T('dev.career.between'), withCareer((c) => { if (c.phase === 'season') c.phase = 'promoted'; else if (c.phase === 'promoted' && c.fixtures.length) c.phase = 'season'; }));
      // M08: jump to a stage (ready to start it, with stats raised to that level), play a whole
      // match instantly, force an event / a sponsor offer, promote now.
      const home = () => { if (Scenes.currentName === 'careerhome') { CareerHomeScene._layout(); CareerHomeScene._checkEvent(); } };
      ['regional', 'domestic', 'franchise'].forEach((id, i) => add(1, 1 + i, () => T('dev.career.jump', { n: i + 2 }), withCareer((c) => { this._jumpStage(c, id); this.hide(); home(); })));
      // M09: Stages 5–8, and retire now
      ['national', 'international', 'world', 'elite'].forEach((id, i) => add(i % 2, 5 + Math.floor(i / 2), () => T('dev.career.jump', { n: i + 5 }), withCareer((c) => { this._jumpStage(c, id); this.hide(); home(); })));
      add(0, 7, () => T('dev.career.retire'), withCareer((c) => { c.phase = 'complete'; c.fixtures.forEach((f) => { f.played = true; }); this.hide(); Scenes.go('careerretire', { slot: CareerHomeScene.slot, career: c }); }));
      add(1, 7, () => T('dev.career.captain'), withCareer((c) => { c.captain = { stage: c.stage, since: c.history.length }; }));
      add(1, 4, () => T('dev.career.promote'), withCareer((c) => {
        if (c.phase !== 'season') return;
        Career.promote(c); const got = Coaches.unlockForStage(Save.data, Career.stage(c).n); Save.write();
        this.hide(); Scenes.go('careerpromoted', { slot: CareerHomeScene.slot, career: c, coaches: got });
      }));
      add(0, 2, () => T('dev.career.simMatch'), () => {
        const c = Scenes.currentName === 'careerhome' && CareerHomeScene.career;
        if (!c || c.phase !== 'season' || !Career.next(c)) { this.say(T('dev.career.none')); return; }
        this.hide();
        c.pendingEvent = null;
        CareerMatch.start(c, CareerHomeScene.slot);
        CareerMatch.autoPlay();
        Scenes.go('careerresult', CareerMatch.finish());
      });
      add(0, 3, () => T('dev.career.event'), withCareer((c) => { c.pendingEvent = null; Events.roll(c, true); this.hide(); home(); }));
      add(0, 4, () => T('dev.career.sponsor'), withCareer((c) => {
        c.pendingEvent = { id: 'sponsor_offer', offer: Career.roll(c, (r) => Sponsors.pick(c, r)) }; c.sponsor = null; this.hide(); home();
      }));
    } else if (this.tab === 'myxi') {
      // M10: a test Legacy Player (unlocks My XI), a quick club, each competition, win a match, the ending.
      const S = () => Save.data, done = () => { Save.write(); this.say(T('dev.done')); if (Scenes.currentName === 'myxihome') MyXIHomeScene._layout(); };
      add(0, 0, () => T('dev.myxi.legacy'), () => { this._makeLegacy(); done(); });
      add(0, 1, () => T('dev.myxi.club'), () => {
        if (!MyXI.unlocked(S())) this._makeLegacy();
        if (!MyXI.club(S())) MyXI.create(S(), { name: 'Dev XI', colours: ['#c8202f', '#16325c'], crest: { shield: 'shield_classic', emblem: 'emblem_lion', colours: ['#c8202f', '#16325c'] }, stadium: 'local_oval' }, 4242);
        done(); this.hide(); Scenes.go('myxihome');
      });
      MYXI_DATA.competitions.forEach((C, i) => add(i < 3 ? 0 : 1, 2 + (i % 3), () => T('dev.myxi.jump', { c: T('myxi.comp.' + C.id) }), () => {
        const club = MyXI.club(S());
        if (!club) { this.say(T('dev.myxi.noClub')); return; }
        for (const P of MYXI_DATA.competitions.slice(0, i)) { club.comps[P.id] = club.comps[P.id] || { cleared: 0, played: 0, won: 0 }; club.comps[P.id].cleared = Math.max(1, club.comps[P.id].cleared); }
        club.run = null; MyXI.startComp(S(), C.id); done(); this.hide(); Scenes.go('myxihome');
      }));
      add(1, 0, () => T('dev.myxi.win'), () => {
        const club = MyXI.club(S()), fx = club && MyXI.next(S());
        if (!fx) { this.say(T('dev.myxi.noMatch')); return; }
        const r = MyXI.afterMatch(S(), { won: true, runs: 80, balls: 30, oppRuns: 50, oppBalls: 30 }); Achievements.checkAccount(S(), null);
        done(); this.hide(); Scenes.go(r.ending ? 'myxiending' : 'myxihome');
      });
      add(1, 1, () => T('dev.myxi.ending'), () => { this.hide(); Scenes.go('myxiending'); });
    } else if (this.tab === 'chal') {
      // M11: straight into any Six Smash / Wicket Rush ruleset (your last player, Pro).
      const go = (game, rs) => () => {
        const last = Challenge.last[game] || {};
        this.hide();
        Scenes.go(game === 'six' ? 'sixsmash' : 'wicketrush', { rs, diff: last.diff || 'pro', pick: last.pick || (game === 'six' ? Challenge.athlete('six') : Challenge.athlete('rush', 'fast')) });
      };
      Challenge.rulesets('six').forEach((r, i) => add(0, i, () => T('dev.chal.go', { r: T('chal.rs.' + r.id) }), go('six', r.id)));
      Challenge.rulesets('rush').forEach((r, i) => add(1, i, () => T('dev.chal.go', { r: T('chal.rs.' + r.id) }), go('rush', r.id)));
      add(0, 5, () => T('dev.chal.fever'), () => {
        const r = Scenes.currentName === 'sixsmash' && SixSmashScene.rules;
        if (!r || !r.rs.fever) { this.say(T('dev.chal.sixOnly')); return; }
        r.fever.meter = CHALLENGE_DATA.six.fever.meter - 0.5; this.say(T('dev.done'));
      });
      add(1, 5, () => T('dev.chal.reset'), () => { Save.data.challenges = {}; Save.data.challengeMeta = null; Save.write(); this.say(T('dev.done')); }, { color: '#ffb3b3' });
    } else if (this.tab === 'mission') {
      // M11: open every mission, jump to one, win the one you're in (a scripted run).
      const S = () => Save.data;
      add(0, 0, () => T('dev.mis.unlock', { state: this._state(S().unlocks && S().unlocks.allMissions) }), () => {
        S().unlocks = S().unlocks || {}; S().unlocks.allMissions = !S().unlocks.allMissions; Save.write(); if (Scenes.currentName === 'missions') MissionHubScene._layout();
      });
      add(0, 1, () => T('dev.mis.jump'), () => this._askMission());
      add(0, 2, () => T('dev.mis.win'), () => {
        if (!MissionMatch.on) { this.say(T('dev.mis.notIn')); return; }
        this.hide(); Scenes.go('missionresult', MissionMatch.scriptWin());
      });
      add(0, 3, () => T('dev.mis.lose'), () => {
        if (!MissionMatch.on) { this.say(T('dev.mis.notIn')); return; }
        const inn = Match.current(); inn.ended = true; inn.endReason = 'mission';
        this.hide(); Scenes.go('missionresult', MissionMatch.finish(S()));
      });
      add(0, 4, () => T('dev.mis.reset'), () => { S().missionStars = {}; S().missionMeta = null; Save.write(); this.say(T('dev.done')); }, { color: '#ffb3b3' });
      MISSION_DATA.categories.forEach((c, i) => add(1, i, () => T('dev.mis.cat', { c: T('mis.cat.' + c.id) }), () => { this.hide(); Scenes.go('missions', { cat: c.id }); }));
    } else if (this.tab === 'save') {
      add(0, 3, () => T('dev.save.print'), () => { console.log('[save]', JSON.stringify(Save.data, null, 2)); this.say(T('dev.save.printed')); });
      add(1, 3, () => T('dev.save.corrupt'), () => {
        Store.set(Save.KEYS.main, '{this is not a save').then(() => this.say(T('dev.save.corrupted')));
      }, { color: '#ffd9a0' });
      add(0, 4, () => T('dev.wipe'), () => {
        BootScene.pendingResume = null;
        Save.wipe().then(() => { this.say(T('dev.wiped')); this._refreshSave(); });
      }, { color: '#ffb3b3' });
      this._refreshSave();
    }
    b.add(() => T('dev.close'), cx - 200, 900, 400, 92, () => this.hide(), { size: 36 });
  },

  // ---- MATCH tab ----
  // Put a career at the start of a stage (between stages: START STAGE on Career
  // Home), with its stats raised to that stage's level so the matches are fair.
  _jumpStage(c, id) {
    const S = CAREER_DATA.stages.find((s) => s.id === id), prev = CAREER_DATA.stages.find((s) => s.next === id);
    Object.assign(c, { stage: id, phase: 'promoted', fixtures: [], selection: 0, team: null, tour: null, contract: null, offers: null,
      pendingEvent: null, sponsor: null, matchInProgress: null, promotedFrom: prev ? prev.id : null, promotedSelection: 85 });
    if (!c.club) c.club = Career.clubOffers(c)[0];
    const floor = S.teamRating - 4;
    for (const k of Object.keys(c.player.stats)) c.player.stats[k] = Math.max(c.player.stats[k], floor);
    Coaches.unlockForStage(Save.data, S.n);
    Save.write();
  },

  // A retired test player (a random career, fast-forwarded): unlocks My XI.
  _makeLegacy() {
    const seed = RNG.freshSeed(), r = makeRng(seed), roles = ['batter', 'bowler', 'allrounder'], role = roles[r.int(0, 2)];
    const arch = CAREER_DATA.roles[role].archetypes[r.int(0, 2)].id, O = Object.keys(ORIGIN_PACKS.origins), origin = O[r.int(0, O.length - 1)];
    const pres = r.chance(0.5) ? 'masculine' : 'feminine', P = ORIGIN_PACKS.origins[origin];
    const c = Career.create({ name: r.pick(P.givenNames[pres]) + ' ' + r.pick(P.surnames), presentation: pres, look: CAREER_DATA.looks[pres][0], skin: 'tan', hairColour: 'brown',
      batHand: 'right', bowlHand: 'right', role, archetype: arch, batRole: 'top', family: 'fast', origin }, seed);
    Career.signClub(c, Career.clubOffers(c)[0]);
    for (const k of Object.keys(c.player.stats)) c.player.stats[k] = Math.max(c.player.stats[k], 68 + r.int(0, 10));
    c.history = [];
    for (let i = 0; i < 30; i++) c.history.push({ stage: 'international', kind: 'league', grade: r.pick(['S', 'A', 'B']), won: r.chance(0.6),
      bat: { batted: true, runs: r.int(5, 50), balls: 20, out: r.chance(0.6), fours: r.int(0, 4), sixes: r.int(0, 3) }, bowl: { bowled: role !== 'batter', wkts: role === 'batter' ? 0 : r.int(0, 3) }, facts: {} });
    c.stage = 'elite'; c.phase = 'complete'; c.trophies = ['local_final', 'world_champion'];
    const res = Legacy.retire(c, Save.data);
    if (MyXI.club(Save.data)) MyXI.syncLegacy(Save.data);
    return res.snap;
  },

  _matchDo(fn) {
    const inn = this._inMatch();
    if (!inn) { this.say(T('dev.match.notInMatch')); return null; }
    return fn(inn);
  },
  // The chase is level with one ball left: a dot ball ties the match.
  _tieLastBall() {
    this._matchDo((inn) => {
      if (!inn.target) { this.say(T('dev.match.chaseOnly')); return; }
      inn.runs = inn.target - 1;
      inn.legal = inn.maxBalls - 1;
      inn.thisOver = [];
      this.say(T('dev.done'));
    });
  },
  // Tie the match immediately (goes straight to the Super Over).
  _tieNow() {
    this._matchDo((inn) => {
      if (!inn.target) { this.say(T('dev.match.chaseOnly')); return; }
      inn.runs = inn.target - 1;
      inn.legal = inn.maxBalls;
      inn.ended = true; inn.endReason = 'overs';
      this.hide();
      Scenes.go('matchbreak', Match.afterInnings());
    });
  },
  _endInnings() {
    this._matchDo((inn) => {
      inn.legal = inn.maxBalls;
      inn.ended = true; inn.endReason = inn.target && inn.runs >= inn.target ? 'chased' : 'overs';
      this.hide();
      Scenes.go('matchbreak', Match.afterInnings());
    });
  },

  // ---- SAVE tab ----
  _refreshSave() {
    const d = Save.data, m = d.meta;
    const lines = [
      T('dev.save.meta', { build: m.build, schema: m.schema, content: m.content }),
      T('dev.save.writes', { n: m.writes, at: (m.savedAt || '').replace('T', ' ').slice(0, 19), store: Store.backend }),
      T('dev.save.recovered', { r: Save.recovered || T('dev.save.no') }),
      'challenges: ' + JSON.stringify(d.challenges),
      'matches: ' + JSON.stringify(d.matches) + '   settings: ' + JSON.stringify(d.settings),
    ];
    this._saveLines = lines;
    Promise.all([Store.get(Save.KEYS.backup), Save.loadResume()]).then(([bk, rs]) => {
      this._saveLines = lines.concat([
        T('dev.save.backup', { state: bk ? T('dev.save.yes') : T('dev.save.no') }) + '    ' +
        T('dev.save.resume', { state: rs ? rs.checkpoint.label : T('dev.save.no') }),
      ]);
    });
  },

  // A mission by number (1–48) or id (e.g. bat08): straight to its briefing.
  _askMission() {
    let v = null;
    try { v = window.prompt(T('dev.mis.prompt'), 'bat08'); } catch (e) { v = null; }
    if (v === null) return;
    const n = parseInt(v, 10), m = n >= 1 && n <= MISSION_DATA.list.length ? MISSION_DATA.list[n - 1] : Missions.def(String(v).trim());
    if (!m) { this.say(T('dev.mis.unknown')); return; }
    Save.data.unlocks = Save.data.unlocks || {}; Save.data.unlocks.allMissions = true;
    this.hide(); Scenes.go('missions', { brief: m.id });
  },

  _askSeed() {
    let v = null;
    try { v = window.prompt(T('dev.seedPrompt'), String(RNG.seed)); } catch (e) { v = null; }
    if (v === null || v === '') return;
    const n = parseInt(v, 10);
    if (isFinite(n) && n >= 0) {
      this.fixedSeed = n >>> 0;
      Log.add('dev', 'fixed seed ' + this.fixedSeed);
      this.say(T('dev.seedNext', { seed: this.fixedSeed }));
    }
  },

  // Seed for the next innings.
  nextSeed() {
    return this.fixedSeed !== null ? this.fixedSeed : RNG.freshSeed();
  },

  update(realDt) { if (this._msgT > 0) this._msgT -= realDt; },

  render(ctx, fps) {
    if (this.showFps) {
      const s = Display.safe;
      R.text(T('dev.fpsLabel', { n: Math.round(fps) }), s.right - 330, s.top + 40, 28, '#9cff9c', 'right');
    }
    if (!this.open) return;
    const v = Display.viewRect();
    ctx.fillStyle = 'rgba(0,0,0,0.86)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const cx = CONFIG.LOGICAL_W / 2;
    R.text(T('dev.title'), cx, 60, 48, CONFIG.COLOR.yellow);
    R.text(T('dev.seed', { seed: RNG.seed }) + '   ·   ' +
      (this.fixedSeed !== null ? T('dev.seedNext', { seed: this.fixedSeed }) : T('dev.seedRandom')),
      cx, 112, 26, '#b8c6d6', 'center', false);
    if (this.tab === 'match') {
      const inn = this._inMatch();
      R.text(inn ? T('dev.match.state', { runs: inn.runs, wkts: inn.wickets, overs: inn.overs, target: inn.target || '-' })
        : T('dev.match.notInMatch'), cx, 254, 24, '#ffffff', 'center', false);
    }
    if (this.tab === 'save') {
      this._saveLines.forEach((l, i) => R.plainText(l, cx - 620, 285 + i * 40, 24, '#cfe8ff'));
    }
    this._buttons.draw();
    R.text(T('dev.build', { v: CONFIG.BUILD_VERSION + (CONFIG.BUILD_STAMP ? ' +' + CONFIG.BUILD_STAMP : '') }) + ' · ' + Store.backend,
      cx, 1040, 22, '#8899aa', 'center', false);
    if (this._msgT > 0) R.text(this._msg, cx, 835, 30, '#9cff6a', 'center', false);
  },
};
