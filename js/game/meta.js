// Cricket Arcade — the shared systems (M12). Pure rules; data in data/meta.js.
//   Difficulty    Rookie / Pro / Legend for the match in play (plan 20)
//   Profile       the Global Profile Level 1–50 and its rewards (21.1)
//   Modes         the mode unlock order (21.6) and "NEW MODE" pop-ups
//   CollectionBook  Collection Book milestones and secret clues (21.3, 21.5)
//   Trophies      the Trophy Room entries (21.4)
//   GameSettings  reading the Settings (34) from anywhere
//   QuickMatch    the Quick Match teams and setup (19)
//   Tutorial      the first-time tutorial's progress (26, 39)
//
// In the global save:
//   globalLevel   { level, xp, total, backfilled, rewards { level: 1 }, title }
//   unlocks       mode_<id>: date · looks / archetypes / rulesets unlocked by level (lvl_<kind>_<id>)
//   collectionMeta { milestones { id: 1 }, clues }
//   tutorial      { step, done, skipped, slot }

const Difficulty = {
  D(id) { return DIFFICULTY_DATA[id] || DIFFICULTY_DATA.pro; },
  // The difficulty of the match in play (Match.difficulty is set when a match starts).
  id() { return (typeof Match !== 'undefined' && Match.difficulty) || DIFFICULTY_DATA.default; },
  k(key) { const v = this.D(this.id())[key]; return v === undefined ? 1 : v; },
  // Where a mode's difficulty lives (plan 20 "Difficulty Rules by Mode").
  forCareer(c) { return (c && c.diff) || 'pro'; },
  forMyXI(save) { const club = save && save.myXI; return (club && club.difficulty) || 'pro'; },
  next(id) { const L = DIFFICULTY_DATA.levels; return L[(L.indexOf(id) + 1) % L.length]; },
};

const Profile = {
  P() { return PROFILE_DATA; },
  state(save) {
    if (!save.globalLevel || typeof save.globalLevel.level !== 'number') save.globalLevel = { level: 1, xp: 0 };
    const g = save.globalLevel;
    g.total = g.total || 0; g.rewards = g.rewards || {};
    return g;
  },
  level(save) { return this.state(save).level; },
  xpFor(level) { return PROFILE_DATA.xpBase + PROFILE_DATA.xpPerLevel * level; },
  // Add profile XP. Returns the levels gained [{ level, reward }] (rewards paid once).
  add(save, xp, src) {
    const g = this.state(save), out = [];
    if (!xp || xp <= 0) return out;
    g.total += xp;
    if (g.level >= PROFILE_DATA.maxLevel) return out;
    g.xp += Math.round(xp);
    while (g.level < PROFILE_DATA.maxLevel && g.xp >= this.xpFor(g.level)) {
      g.xp -= this.xpFor(g.level);
      g.level++;
      out.push({ level: g.level, reward: this.payLevel(save, g.level) });
    }
    if (g.level >= PROFILE_DATA.maxLevel) g.xp = 0;
    if (out.length) {
      this.toasts.push(...out.map((l) => ({ kind: 'level', level: l.level, reward: l.reward, t: 0 })));
      if (typeof Sound !== 'undefined') Sound.play('ui_levelup');
    }
    return out;
  },
  reward(level) { return PROFILE_DATA.rewards[level] || { coins: 100 + 10 * level }; },
  payLevel(save, level) {
    const g = this.state(save);
    if (g.rewards[level]) return null;
    g.rewards[level] = 1;
    const r = this.reward(level), U = save.unlocks = save.unlocks || {};
    const C = save.currencies = save.currencies || {};
    if (r.coins) C.coins = (C.coins || 0) + r.coins;
    if (r.lm) C.legacyMarks = (C.legacyMarks || 0) + r.lm;
    if (r.mc) C.mythicCore = (C.mythicCore || 0) + r.mc;
    if (r.item && typeof Gear !== 'undefined') Gear.grant(save, r.item, 'profile');
    if (r.coach && typeof Coaches !== 'undefined') Coaches.unlock(save, r.coach);
    for (const kind of ['archetype', 'look', 'facial', 'ruleset']) if (r[kind]) U['lvl_' + kind + '_' + r[kind]] = level;
    if (r.title) g.title = r.title;
    return r;
  },
  // Is a level-locked option open? (kind: archetype | look | ruleset)
  open(save, kind, id) {
    const L = PROFILE_DATA.locked[kind] || [];
    if (!L.includes(id)) return true;
    const U = (save && save.unlocks) || {};
    return !!(U['lvl_' + kind + '_' + id] || U['lvl_facial_' + id] || U.allModes);
  },
  // The level that opens a locked option (for the "PROFILE LEVEL n" label).
  levelOf(kind, id) {
    for (const [lvl, r] of Object.entries(PROFILE_DATA.rewards)) if (r[kind] === id || (kind === 'look' && r.facial === id)) return +lvl;
    return 0;
  },
  // Older saves: profile XP for everything already done (once).
  backfill(save) {
    const g = this.state(save);
    if (g.backfilled) return 0;
    g.backfilled = new Date().toISOString().slice(0, 10);
    const X = PROFILE_DATA.xp;
    let xp = 0;
    for (const h of save.hallOfFame || []) xp += X.careerComplete + X.careerPromotion * Math.max(0, (h.stageReached || 1) - 1);
    for (const s of save.careerSlots || []) if (s) xp += X.careerPromotion * Math.max(0, (s.stageN || 1) - 1);
    for (const [id, rec] of Object.entries(save.challenges || {})) {
      const n = typeof Challenge !== 'undefined' && rec.medal ? Challenge.medalRank(rec.medal) : 0;
      for (const m of CHALLENGE_DATA.medals.slice(0, n)) xp += X.medal[m];
    }
    for (const st of Object.values(save.missionStars || {})) if (st.cleared) xp += X.missionClear + X.missionStar * st.stars.reduce((a, b) => a + b, 0);
    const club = save.myXI;
    if (club) xp += X.myxiTrophy * (club.trophies || []).length + X.myxiWin * ((club.stats && club.stats.wins) || 0);
    this.add(save, xp, 'backfill');
    this.toasts = [];
    return xp;
  },
  toasts: [],
};

const Modes = {
  unlocked(save, id) {
    if (id === 'career') return true;
    if (id === 'myxi') return typeof MyXI !== 'undefined' && MyXI.unlocked(save);
    const U = (save && save.unlocks) || {};
    return !!(U['mode_' + id] || U.allModes);
  },
  unlock(save, id, quiet) {
    save.unlocks = save.unlocks || {};
    if (this.unlocked(save, id)) return false;
    save.unlocks['mode_' + id] = new Date().toISOString().slice(0, 10);
    if (quiet) return true;
    this.toasts.push({ id, t: 0 });
    if (typeof Sound !== 'undefined') Sound.play('ui_unlock');
    return true;
  },
  hint(id) { return 'mode.hint.' + (MODE_DATA.hints[id] || 'none'); },
  // A career's progress unlocks modes (called whenever a career is saved).
  checkCareer(save, c) {
    if (!c || !c.player) return [];
    const got = [], n = Career.stage(c).n, played = (c.history || []).length;
    const add = (id) => { if (this.unlock(save, id)) got.push(id); };
    if (played >= 1) {
      const role = c.player.role;
      if (role !== 'bowler') add('sixsmash');
      if (role !== 'batter') add('wicketrush');
    }
    if (n >= 2) add('missions');
    if (n >= 3) { add('sixsmash'); add('wicketrush'); }
    return got;
  },
  // Older saves (before M12): everything they had stays open; the tutorial counts as done.
  backfill(save) {
    save.unlocks = save.unlocks || {};
    if (save.unlocks.modesBackfilled) return;
    save.unlocks.modesBackfilled = 1;
    const any = (save.careerSlots || []).some(Boolean) || (save.hallOfFame || []).length || Object.keys(save.challenges || {}).length
      || Object.keys(save.matches || {}).length || Object.keys(save.missionStars || {}).length;
    if (!any) return;
    for (const id of ['quickmatch', 'collection', 'records', 'sixsmash', 'wicketrush', 'missions']) save.unlocks['mode_' + id] = 'before M12';
    save.tutorial = Object.assign({ step: 'done', done: 'before M12' }, save.tutorial || {});
    save.tutorial.done = save.tutorial.done || 'before M12';
    save.tutorial.step = 'done';
  },
  toasts: [],
};

const CollectionBook = {
  meta(save) { if (!save.collectionMeta) save.collectionMeta = { milestones: {}, clues: 0 }; return save.collectionMeta; },
  counts(save) {
    const gear = EQUIPMENT_DATA.items, techs = Object.keys(SKILL_TREE_DATA.techniques);
    const g = gear.filter((it) => Gear.owns(save, it.id)).length, t = techs.filter((id) => SkillTree.discovered(save, id)).length;
    return { have: g + t, total: gear.length + techs.length, pct: Math.floor(100 * (g + t) / (gear.length + techs.length)) };
  },
  // Pays every milestone reached (once). Returns the new ones.
  check(save) {
    const M = this.meta(save), pct = this.counts(save).pct, got = [];
    for (const ms of COLLECTION_DATA.milestones) {
      if (pct < ms.pct || M.milestones[ms.id]) continue;
      M.milestones[ms.id] = 1;
      const r = ms.reward, C = save.currencies = save.currencies || {};
      if (r.coins) C.coins = (C.coins || 0) + r.coins;
      if (r.lm) C.legacyMarks = (C.legacyMarks || 0) + r.lm;
      if (r.mc) C.mythicCore = (C.mythicCore || 0) + r.mc;
      if (r.clue) M.clues = (M.clues || 0) + 1;
      if (r.title) Profile.state(save).title = r.title;
      got.push(ms);
    }
    return got;
  },
  // Secrets (plan 21.5): a hidden item shows only a silhouette and a clue.
  secret(save, item) { return COLLECTION_DATA.secretRarities.includes(item.rarity) && !Gear.owns(save, item.id); },
  clueKey(item) { return 'collection.clue.' + (item.src[0] || 'shop'); },
};

const Trophies = {
  has(save, T0) {
    switch (T0.check) {
      case 'retired': return (save.hallOfFame || []).length >= T0.min;
      case 'careerTrophy': return (save.hallOfFame || []).some((h) => (h.trophies || []).includes(T0.trophy));
      case 'myxiTrophy': return !!(save.myXI && (save.myXI.trophies || []).includes(T0.comp));
      case 'medal': return typeof Challenge !== 'undefined' && Challenge.rulesets(T0.game).some((r) => (Challenge.record(save, r.id) || {}).medal === T0.medal);
      case 'missionsPerfect': return typeof Missions !== 'undefined' && Missions.perfectCount(save) >= T0.min;
      case 'profile': return Profile.level(save) >= T0.min;
      case 'achievement': return !!(save.achievements && save.achievements[T0.ach]);
    }
    return false;
  },
  list(save) { return TROPHY_DATA.list.map((T0) => ({ def: T0, got: this.has(save, T0) })); },
};

const GameSettings = {
  get(key) {
    const s = (typeof Save !== 'undefined' && Save.data && Save.data.settings) || {};
    return s[key] !== undefined ? s[key] : SETTINGS_DATA.defaults[key];
  },
  factor(key) { const tbl = SETTINGS_DATA[key]; return tbl ? (tbl[this.get(key)] || 1) : 1; },
  // Fill in any settings an older save doesn't have.
  ensure(save) {
    save.settings = save.settings || {};
    for (const [k, v] of Object.entries(SETTINGS_DATA.defaults)) if (save.settings[k] === undefined) save.settings[k] = v;
    return save.settings;
  },
};

const QuickMatch = {
  // The teams you can pick (plan 19): 12 nations, 16 franchises, My XI once unlocked,
  // the elite squads once discovered. cat: 'nations' | 'franchises' | 'myxi' | 'elite'
  cats(save) {
    const out = ['nations', 'franchises'];
    if (typeof MyXI !== 'undefined' && MyXI.club(save) && MyXI.validate(save, 'quick5').ok) out.push('myxi');
    if (this.eliteFound(save)) out.push('elite');
    return out;
  },
  eliteFound(save) {
    return (save.careerSlots || []).some((s) => s && s.stageN >= 8) || (save.hallOfFame || []).some((h) => h.stageReached >= 8)
      || !!(save.myXI && save.myXI.comps && save.myXI.comps.legends) || !!(save.unlocks && save.unlocks.allModes);
  },
  teams(save, cat) {
    if (cat === 'nations') return CAREER_DATA.world.teams.map((t) => ({ cat, id: t.id, name: ORIGIN_PACKS.origins[t.id].displayName, crest: 'qm_badge_' + t.id, rating: t.rating, origin: t.id, colours: t.colours }));
    if (cat === 'franchises') return CAREER_DATA.franchise.teams.map((t) => ({ cat, id: t.id, name: T('franchise.' + t.id), crest: 'qm_crest_' + t.id, rating: t.rating, colours: t.colours }));
    if (cat === 'elite') return CAREER_DATA.elite.gauntlet.concat([CAREER_DATA.elite.champion]).map((t) => ({ cat, id: t.id, name: T('elite.' + t.id), crest: 'qm_elite_' + t.id, rating: QUICKMATCH_DATA.eliteRating + (t.id === 'champions' ? 4 : 0), colours: t.colours }));
    if (cat === 'myxi') { const club = MyXI.club(save); return [{ cat, id: 'myxi', name: club.name, crest: null, club: club.crest, rating: MyXI.teamFor(save).rating, colours: club.colours }]; }
    return [];
  },
  // A default setup (the last one used, kept in memory).
  last: null,
  defaults(save) {
    const nations = this.teams(save, 'nations');
    return this.last || { you: nations.find((t) => t.id === 'england') || nations[0], them: nations.find((t) => t.id === 'australia') || nations[1],
      fmt: 'quick5', diff: 'pro', stadium: 'local_oval', pitch: 'random', weather: 'random' };
  },
  // Build a side for the match (the AI side gets the difficulty's small rating change).
  side(save, t, side, rng, diff) {
    if (t.cat === 'myxi' && side === 'player') return MyXI.teamFor(save);
    const rating = Math.max(30, Math.min(95, t.rating + (side === 'ai' ? Difficulty.D(diff).opp : 0)));
    const team = Teams.generate({ side, rating, origin: t.origin || null, rng });
    team.name = t.name; team.crest = t.crest; team.qm = t.id;
    return team;
  },
  // Start the match from a setup; returns the toss scene.
  start(save, o) {
    this.last = o;
    if (typeof MissionMatch !== 'undefined') MissionMatch.on = false;
    if (typeof MyXIMatch !== 'undefined') MyXIMatch.on = false;
    CareerMatch.on = false;
    Tech.end();
    Save.clearResume();
    const pick = (cr, list, v) => (v === 'random' ? cr.pick(list.map((x) => x.id)) : v);
    Match.start(o.fmt, {
      difficulty: o.diff,
      quick: { you: o.you.id, them: o.them.id, fmt: o.fmt, diff: o.diff },
      teams: () => {
        const rng = RNG.stream('teams');
        return { player: this.side(save, o.you, 'player', rng, o.diff), ai: this.side(save, o.them, 'ai', rng, o.diff) };
      },
      cond: (cr) => ({ stadium: o.stadium || STADIUM_DATA.defaultStadium, pitch: pick(cr, QUICKMATCH_DATA.pitches, o.pitch), weather: pick(cr, QUICKMATCH_DATA.weathers, o.weather) }),
    });
    // My XI players bring their techniques (their frozen Legacy trees).
    if (o.you.cat === 'myxi') MyXIMatch.beginTech(save);
    return 'toss';
  },
  // Coins for a finished Quick Match (modest; never touches Career or Legacy).
  coins(won, diff) { return Math.round((won ? QUICKMATCH_DATA.coins.win : QUICKMATCH_DATA.coins.loss) * Difficulty.D(diff).coins); },
};

const Tutorial = {
  state(save) { if (!save.tutorial) save.tutorial = { step: 'welcome' }; return save.tutorial; },
  done(save) { const t = this.state(save); return !!t.done; },
  active(save) { const t = this.state(save); return !t.done && t.step !== 'welcome'; },
  // Skip it (returning players): the tutorial's own unlocks happen at once.
  skip(save) {
    const t = this.state(save);
    t.done = t.done || new Date().toISOString().slice(0, 10); t.skipped = true; t.step = 'done';
    Modes.unlock(save, 'quickmatch'); Modes.unlock(save, 'collection'); Modes.unlock(save, 'records');
    Modes.toasts = [];
  },
  setStep(save, step) { const t = this.state(save); t.step = step; return t; },
  finish(save) {
    const t = this.state(save);
    if (t.done) return;
    t.done = new Date().toISOString().slice(0, 10); t.step = 'done';
    Profile.add(save, PROFILE_DATA.xp.tutorial, 'tutorial');
  },
  // The first reward (plan 26 step 3): coins + the first usable gear item. Once.
  firstReward(save) {
    const t = this.state(save);
    if (t.rewarded) return null;
    t.rewarded = 1;
    const R0 = TUTORIAL_DATA.reward, C = save.currencies = save.currencies || {};
    C.coins = (C.coins || 0) + R0.coins;
    Gear.grant(save, R0.item, 'tutorial');
    Modes.unlock(save, 'collection'); Modes.unlock(save, 'records', true);     // (one pop-up for both)
    return R0;
  },
};

// The glue: called when a save loads and whenever a career is saved.
const Meta = {
  onLoad(save) {
    GameSettings.ensure(save);
    Modes.backfill(save);
    Profile.backfill(save);
    CollectionBook.check(save);
  },
  // A career's progress: profile XP for each new stage reached, and mode unlocks (plan 21.6).
  onCareerSave(save, c) {
    const n = Career.stage(c).n;
    c.profileStage = c.profileStage || 1;
    if (n > c.profileStage) { Profile.add(save, PROFILE_DATA.xp.careerPromotion * (n - c.profileStage), 'career'); c.profileStage = n; }
    Modes.checkCareer(save, c);
    CollectionBook.check(save);
  },
};
Meta.rewardText = function (r) {
  const out = [];
  if (r.coins) out.push(T('ach.rw.coins', { n: r.coins }));
  if (r.lm) out.push(T('ach.rw.lm', { n: r.lm }));
  if (r.mc) out.push(T('ach.rw.mc', { n: r.mc }));
  if (r.item) out.push(T('gear.' + r.item));
  if (r.coach) out.push(T('profile.rw.coach', { c: T('coach.' + r.coach) }));
  if (r.archetype) out.push(T('profile.rw.archetype', { a: T('create.arch.' + r.archetype) }));
  if (r.look || r.facial) out.push(T('profile.rw.look'));
  if (r.ruleset) out.push(T('profile.rw.ruleset', { r: T('chal.rs.' + r.ruleset) }));
  if (r.title) out.push(T('profile.rw.title', { t: T('profile.title.' + r.title) }));
  return out.join(' + ');
};
