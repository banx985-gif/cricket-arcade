// Cricket Arcade — content check (plan 43A.4). Debug builds run it at boot.
//
// Checks the data files for:
//   * duplicate ids and ids that point at nothing
//   * string keys the data needs that aren't in the strings table
//   * sprite ids whose art file is missing from game/assets
// If anything is wrong it FAILS LOUDLY: a red panel over the game (tap to
// dismiss) and console errors. The test gates run the same checks.
// runData() needs no browser, so tests/run.js can call it under Node too.

const Validate = {
  problems: [],
  done: false,
  _dismissed: false,

  // ---- data checks (no images needed) ----------------------------------
  runData() {
    const p = [];
    const dupes = (label, list, key) => {
      const seen = new Set();
      for (const it of list) {
        const id = key ? it[key] : it;
        if (id === undefined || id === null || id === '') p.push(`${label}: entry with no id`);
        else if (seen.has(id)) p.push(`${label}: duplicate id "${id}"`);
        seen.add(id);
      }
      return seen;
    };
    const str = (key, where) => { if (STRINGS.en[key] === undefined) p.push(`missing string "${key}" (${where})`); };
    const art = (id, where) => { if (!ASSET_MANIFEST.groups['match-common'][id]) p.push(`sprite id "${id}" (${where}) is not in the asset manifest`); };

    // Batting
    const lengths = dupes('delivery lengths', BATTING_DATA.delivery.lengths, 'id');
    dupes('fielders', BATTING_DATA.field.positions, 'id');
    for (const l of lengths) str('length.' + l, 'delivery length');
    for (const s of Object.keys(BATTING_DATA.shots)) str('shot.' + s, 'shot type');
    for (const g of ['perfect', 'good', 'early', 'late', 'miss', 'loose']) str('timing.' + g, 'timing grade');

    // Bowling: every family has exactly 4 deliveries (plan 6.2)
    for (const [fid, fam] of Object.entries(BOWLING_DATA.families)) {
      if (fam.id !== fid) p.push(`bowling family "${fid}" has id "${fam.id}"`);
      const types = dupes('bowling deliveries (' + fid + ')', fam.deliveries, 'id');
      if (types.size !== 4) p.push(`bowling family "${fid}" needs exactly 4 deliveries`);
      art(fam.icon, 'family ' + fid); str(fam.nameKey, 'family ' + fid);
      for (const d of fam.deliveries) { art(d.icon, 'delivery ' + d.id); str('bowl.type.' + d.id, 'delivery ' + d.id); }
    }
    for (const id of BOWLING_DATA.familyOrder) if (!BOWLING_DATA.families[id]) p.push(`family order lists unknown family "${id}"`);
    const A = BOWLING_DATA.aiBatter;
    if (A.weakness && !lengths.has(A.weakness.id)) p.push(`AI batter weakness "${A.weakness.id}" is not a delivery length`);
    for (const k of Object.keys(A.difficulty)) if (!lengths.has(k)) p.push(`AI batter difficulty "${k}" is not a delivery length`);

    // Teams: every lineup bowler has a real family; at least 5 bowlers (plan 7.12)
    const bowlers = PLAYER_DATA.teams.lineup.filter((l) => l.families);
    if (bowlers.length < 5) p.push('a team needs at least 5 bowlers');
    for (const l of bowlers) for (const f of l.families) if (!BOWLING_DATA.families[f]) p.push(`lineup bowler family "${f}" doesn't exist`);
    for (const [k, d] of Object.entries(PLAYER_DATA.difficulty)) str('dev.diff.' + k, 'difficulty');

    // Field settings
    const presetIds = dupes('field presets', FIELD_DATA.presets, 'id');
    for (const pr of FIELD_DATA.presets) {
      art(pr.icon, 'field ' + pr.id); str('field.' + pr.id, 'field ' + pr.id);
      if (pr.positions.length !== 10) p.push(`field "${pr.id}" needs 10 fielders (it has ${pr.positions.length})`);
      if (!pr.positions.length || pr.positions[0][0] !== 'keeper') p.push(`field "${pr.id}" must list the keeper first`);
      dupes('field "' + pr.id + '" positions', pr.positions.map((x) => x[0]));
      if (pr.unlock !== 'always' && !(pr.unlock && pr.unlock.quickMatchWins > 0)) p.push(`field "${pr.id}" has an unknown unlock condition`);
    }
    for (const r of FIELD_DATA.aiRules) if (!presetIds.has(r.pick)) p.push(`field AI rule picks unknown preset "${r.pick}"`);

    // Stadium layers
    for (const [sid, st] of Object.entries(STADIUM_DATA.stadiums)) {
      str(st.nameKey, 'stadium ' + sid);
      art(st.stands.id, 'stadium ' + sid); art(st.boards.id, 'stadium ' + sid);
      for (const pr of st.props) art(pr[0], 'stadium ' + sid + ' prop');
      for (const f of st.flags.concat(st.banners)) art(f[0], 'stadium ' + sid);
      for (const c of st.crowd) for (const fr of ['sit', 'cheer', 'jump']) art('crowd_' + c[0] + '_' + fr, 'stadium ' + sid + ' crowd');
    }
    for (const [w, id] of Object.entries(STADIUM_DATA.skies)) art(id, 'sky ' + w);
    for (const [k, pa] of Object.entries(STADIUM_DATA.pitchArt)) { art(pa.id, 'pitch ' + k); if (!STADIUM_DATA.pitchTypes[k]) p.push(`pitch art "${k}" has no pitch type`); }
    for (const [k, pt] of Object.entries(STADIUM_DATA.pitchTypes)) { str(pt.nameKey, 'pitch ' + k); if (!STADIUM_DATA.pitchArt[k]) p.push(`pitch type "${k}" has no pitch art`); }
    for (const [k, w] of Object.entries(STADIUM_DATA.weather)) { str(w.nameKey, 'weather ' + k); if (!STADIUM_DATA.skies[k]) p.push(`weather "${k}" has no sky`); }
    art(STADIUM_DATA.grass.id, 'grass');

    // Scoring tiers must climb
    const climbing = (label, tiers) => {
      for (let i = 1; i < tiers.length; i++) if (tiers[i].min <= tiers[i - 1].min) p.push(`${label}: combo tiers out of order`);
    };
    climbing('Six Smash', SIX_SMASH_DATA.classic.combo);
    climbing('Wicket Rush', WICKET_RUSH_DATA.classic.combo);

    // Match
    for (const [key, f] of Object.entries(MATCH_DATA.formats)) {
      if (f.id !== key) p.push(`match format "${key}" has id "${f.id}"`);
      if (!(f.overs > 0) || !(f.wickets > 0)) p.push(`match format "${key}" needs overs and wickets`);
      if (!(f.maxOvers > 0)) p.push(`match format "${key}" needs a bowler over limit`);
      else if (f.maxOvers * bowlers.length < f.overs) p.push(`match format "${key}": not enough bowlers to bowl ${f.overs} overs`);
    }
    if (!MATCH_DATA.formats[MATCH_DATA.defaultFormat]) p.push(`default match format "${MATCH_DATA.defaultFormat}" doesn't exist`);
    for (const side of ['player', 'ai']) {
      const t = MATCH_DATA.teams[side];
      if (!t) { p.push(`team "${side}" missing`); continue; }
      str(t.nameKey, 'team ' + side); str(t.shortKey, 'team ' + side);
    }
    for (const h of Object.values(MATCH_DATA.hudArt)) art(h.id, 'match HUD');
    for (const r of ['chased', 'allOut', 'overs']) str('match.inningsEnd.' + r, 'innings end');
    for (const r of ['safe', 'risky', 'danger', 'none']) str('run.risk.' + r, 'run button');

    // Career (M05)
    const allArt = Object.assign({}, ...Object.values(ASSET_MANIFEST.groups));
    const cart = (id, where) => { if (!allArt[id]) p.push(`sprite id "${id}" (${where}) is not in the asset manifest`); };
    const statKeys = new Set([].concat(...Object.values(PLAYER_DATA.stats)));
    for (const [rid, role] of Object.entries(CAREER_DATA.roles)) {
      str(role.nameKey, 'career role'); str('career.role.' + rid, 'career role');
      for (const a of role.archetypes) {
        str('create.arch.' + a.id, 'archetype'); str('create.archDesc.' + a.id, 'archetype');
        for (const k of a.key.concat(a.weak, a.grow)) if (!statKeys.has(k)) p.push(`archetype "${a.id}" names unknown stat "${k}"`);
        if (a.family && !BOWLING_DATA.families[a.family]) p.push(`archetype "${a.id}" has unknown family "${a.family}"`);
      }
    }
    for (const r of Object.keys(CAREER_DATA.battingRoles)) str('create.batRole.' + r, 'batting role');
    for (const pres of Object.keys(CAREER_DATA.looks)) for (const id of CAREER_DATA.looks[pres]) { cart(id, 'look'); cart('mask_' + id + '_skin', 'look mask'); cart('mask_' + id + '_hair', 'look mask'); }
    for (const id of CAREER_DATA.facialHair) if (id !== 'none') { cart(id, 'facial hair'); cart('mask_' + id + '_skin', 'look mask'); }
    for (const d of CAREER_DATA.training) { cart(d.icon, 'training'); str('train.' + d.id, 'training'); if (!statKeys.has(d.stat)) p.push(`training "${d.id}" raises unknown stat "${d.stat}"`); }
    for (const id of CAREER_DATA.clubs.shields.concat(CAREER_DATA.clubs.animalEmblems, CAREER_DATA.clubs.framedEmblems)) cart(id, 'club crest');
    for (const v of CAREER_DATA.clubs.venues) str('venue.' + v, 'club venue');
    for (const e of CAREER_DATA.clubs.emphases) str('emphasis.' + e, 'club emphasis');
    for (const k of Object.keys(CAREER_DATA.clubs.bowlSpells)) str('spell.' + k, 'bowling spell');
    for (const o of Object.values(ORIGIN_PACKS.origins)) {
      cart('badge_' + o.id, 'origin badge');
      for (const c of o.colourPool) for (const w of c.split('_')) if (!CAREER_DATA.clubs.colours[w]) p.push(`origin "${o.id}" colour "${w}" has no colour value`);
      for (const k of Object.keys(o.pitchWeights)) if (!STADIUM_DATA.pitchTypes[k]) p.push(`origin "${o.id}" pitch "${k}" isn't a pitch type`);
      for (const k of Object.keys(o.weatherWeights)) if (!STADIUM_DATA.weather[k]) p.push(`origin "${o.id}" weather "${k}" isn't a weather type`);
      if (o.pathwayLabels.length !== 8) p.push(`origin "${o.id}" needs 8 pathway labels`);
    }
    for (const lv of CAREER_DATA.form.levels) { cart('career_form_' + lv, 'form'); str('career.formLevel.' + lv, 'form'); }
    for (const g of CAREER_DATA.gradeOrder) cart('grade_' + g.toLowerCase(), 'grade');
    for (const st of CAREER_DATA.stages) { str(st.nameKey, 'stage'); cart(st.art, 'stage'); if (!st.comingSoon && !MATCH_DATA.formats[st.format]) p.push(`stage "${st.id}" uses unknown format`); }
    for (const pool of Object.values(CAREER_DATA.objectives)) for (const o of [].concat(pool)) str('objective.' + o.id, 'objective');

    // The Wicket Tree (M06): every node, technique, pair, name and picture
    if (typeof SKILL_TREE_DATA !== 'undefined') {
      const D = SKILL_TREE_DATA, ids = dupes('skill tree nodes', D.nodes, 'id');
      const techs = Object.keys(D.techniques);
      if (techs.length !== 36) p.push('the Wicket Tree needs 36 techniques (it has ' + techs.length + ')');
      for (const t of techs) {
        const nodes = D.nodes.filter((n) => n.tech === t);
        if (nodes.length !== 1) p.push('technique "' + t + '" must be on exactly one tree node');
        str('tech.' + t, 'technique'); str('tech.' + t + '.desc', 'technique');
        cart(D.techniques[t].icon, 'technique ' + t);
        if (!['bat', 'bowl', 'passive'].includes(D.techniques[t].kind)) p.push('technique "' + t + '" has an unknown kind');
      }
      for (const n of D.nodes) {
        if (n.tech && !D.techniques[n.tech]) p.push('tree node "' + n.id + '" names unknown technique "' + n.tech + '"');
        if (n.type !== 'capstone' && !D.branches.includes(n.branch)) p.push('tree node "' + n.id + '" has unknown branch');
        if (!n.tech) { str('tree.' + n.id, 'tree node'); str('tree.' + n.id + '.desc', 'tree node'); }
        if (n.type === 'minor' || n.type === 'keystone') { cart(n.id, 'tree node art'); str('tree.glyph.' + n.id, 'tree node'); }
        if (n.type === 'keystone') {
          const other = D.nodes.find((x) => x.id === n.pair);
          if (!other || other.pair !== n.id || other.branch !== n.branch) p.push('keystone "' + n.id + '" needs a matching pair in its branch');
        }
        if (n.effect && n.effect.stat && !statKeys.has(n.effect.stat)) p.push('perk "' + n.id + '" raises unknown stat');
      }
      for (const b of D.branches) {
        if (D.nodes.filter((n) => n.branch === b && n.type === 'minor').length !== 6) p.push('branch "' + b + '" needs 6 minor perks');
        if (D.nodes.filter((n) => n.branch === b && n.type === 'keystone').length !== 2) p.push('branch "' + b + '" needs 2 keystones');
        str('tree.branch.' + b, 'branch'); cart(D.art.branch[b], 'branch emblem');
      }
      for (const [a, id] of Object.entries(D.archetypeStart)) if (!ids.has(id) || D.nodes.find((n) => n.id === id).type !== 'minor') p.push('archetype "' + a + '" starts with unknown perk "' + id + '"');
      for (const r of Object.keys(CAREER_DATA.roles)) if (!D.roles[r]) p.push('tree role rules missing for "' + r + '"');
      for (const id of [D.art.bg, D.art.perkPip, D.art.token, D.art.respec, D.art.legend].concat(Object.values(D.art.node))) cart(id, 'tree art');
    }

    // Equipment (M07): items, perks, sets, drop pools, names and pictures
    if (typeof EQUIPMENT_DATA !== 'undefined') {
      const E = EQUIPMENT_DATA, ids = dupes('equipment items', E.items, 'id');
      const srcs = ['starter', 'shop', 'drop', 'final', 'rival', 'tournament', 'evolution', 'legacy'];
      const perkIds = new Set(Object.keys(E.perks).concat(Object.keys(E.setPerks)));
      const perSlot = {};
      for (const s of E.slots) { str('gear.slot.' + s, 'slot'); cart(E.slotArt[s], 'slot art'); }
      for (const [r, R] of Object.entries(E.rarities)) { str('gear.rarity.' + r, 'rarity'); cart(R.frame, 'rarity frame'); }
      cart(E.signatureFrame, 'signature frame');
      for (const id of Object.values(E.shop.art)) cart(id, 'shop art');
      for (const it of E.items) {
        const w = 'item "' + it.id + '"';
        if (!E.slots.includes(it.slot)) p.push(w + ' has unknown slot "' + it.slot + '"');
        if (!E.rarities[it.rarity]) p.push(w + ' has unknown rarity "' + it.rarity + '"');
        if (!(it.tier >= 1 && it.tier <= 8)) p.push(w + ' needs a career tier 1–8');
        for (const k of Object.keys(it.stats || {})) if (!statKeys.has(k)) p.push(w + ' raises unknown stat "' + k + '"');
        if (E.cosmetic.includes(it.slot) && (Object.keys(it.stats || {}).length || it.set || it.perk)) p.push(w + ' is cosmetic: no stats, set or perk');
        if (it.perk && !E.perks[it.perk]) p.push(w + ' has unknown perk "' + it.perk + '"');
        if (it.set && !E.sets[it.set]) p.push(w + ' names unknown set "' + it.set + '"');
        if (!Array.isArray(it.src) || !it.src.length || it.src.some((x) => !srcs.includes(x))) p.push(w + ' needs a known source');
        cart(it.art, w); str('gear.' + it.id, w);
        for (const x of it.src) { str('gear.src.' + x, w); str('gear.hint.' + x, w); }
        perSlot[it.slot] = (perSlot[it.slot] || 0) + 1;
      }
      for (const [s, n] of Object.entries(perSlot)) if (n > E.caps[s]) p.push('too many ' + s + ' items (' + n + ', cap ' + E.caps[s] + ')');
      for (const s of E.slots) if (E.items.filter((it) => it.slot === s && it.src.includes('starter')).length !== 1) p.push('slot "' + s + '" needs exactly one starter item');
      for (const k of Object.keys(E.perks)) { str('gear.perk.' + k, 'perk'); str('gear.perk.' + k + '.desc', 'perk'); }
      const setIds = Object.keys(E.sets);
      if (setIds.length < 8) p.push('at least 8 named gear lines need set bonuses (plan 12.9)');
      for (const [sid, S] of Object.entries(E.sets)) {
        str('gear.setName.' + sid, 'set');
        const slots = new Set(E.items.filter((it) => it.set === sid).map((it) => it.slot));
        const th = Object.keys(S).filter((k) => /^\d+$/.test(k)).map(Number);
        if (!th.includes(2) || !th.includes(3) || !th.includes(slots.size)) p.push('set "' + sid + '" needs 2-piece, 3-piece and full-set (' + slots.size + ') bonuses');
        for (const t of th) {
          if (S[t].perk && !perkIds.has(S[t].perk)) p.push('set "' + sid + '" has unknown perk "' + S[t].perk + '"');
          for (const k of Object.keys(S[t].stats || {})) if (!statKeys.has(k)) p.push('set "' + sid + '" raises unknown stat "' + k + '"');
        }
      }
      for (const k of Object.keys(E.setPerks)) { str('gear.perk.' + k, 'set effect'); str('gear.perk.' + k + '.desc', 'set effect'); }
      for (const [pid, pool] of Object.entries(E.drops.pools)) for (const id of pool) if (!ids.has(id)) p.push('drop pool "' + pid + '" lists unknown item "' + id + '"');
      for (const [st, by] of Object.entries(E.drops.byStage)) {
        if (!CAREER_DATA.stages.find((x) => x.id === st)) p.push('drops for unknown stage "' + st + '"');
        for (const pl of Object.values(by)) if (!E.drops.pools[pl]) p.push('stage "' + st + '" uses unknown drop pool "' + pl + '"');
      }
    }

    // Career stages 2–4, coaches, events, sponsors, rivals, franchises (M08)
    if (typeof COACH_DATA !== 'undefined' && typeof EVENT_DATA !== 'undefined') {
      const item = (id, w) => { if (typeof EQUIPMENT_DATA !== 'undefined' && !EQUIPMENT_DATA.items.some((it) => it.id === id)) p.push(w + ' names unknown item "' + id + '"'); };
      const coachIds = dupes('coaches', COACH_DATA.coaches, 'id');
      if (coachIds.size !== 12) p.push('there must be 12 coaches (plan 13)');
      const drills = new Set(CAREER_DATA.training.map((d) => d.id));
      for (const k of COACH_DATA.coaches) {
        cart(k.art, 'coach ' + k.id); str('coach.' + k.id, 'coach'); str('coach.cat.' + k.id, 'coach'); str('coach.' + k.id + '.desc', 'coach');
        for (const d of k.drills) if (!drills.has(d)) p.push('coach "' + k.id + '" has unknown drill "' + d + '"');
        for (const s of Object.keys(k.stats || {})) if (!statKeys.has(s)) p.push('coach "' + k.id + '" raises unknown stat "' + s + '"');
        if (!(k.unlock === 'start' || k.unlock === 'rival' || k.unlock === 'hidden' || (k.unlock && k.unlock.stage))) p.push('coach "' + k.id + '" has an unknown unlock');
      }
      for (const e of EVENT_DATA.events) {
        str('event.' + e.id + '.title', 'event'); str('event.' + e.id + '.body', 'event'); str('event.kind.' + e.portrait, 'event');
        if (e.choices.length !== 2) p.push('event "' + e.id + '" needs 2 choices');
        for (const ch of e.choices) str('event.' + e.id + '.' + ch.id, 'event choice');
        if (e.portrait !== 'coach' && e.portrait !== 'sponsor') cart(e.portrait, 'event ' + e.id);
      }
      for (const s of EVENT_DATA.sponsors) {
        cart(s.logo, 'sponsor ' + s.id); str('sponsor.' + s.id, 'sponsor'); str('sponsor.goal.' + s.goal, 'sponsor');
        if (!(s.fixtures >= 1 && s.fixtures <= 3)) p.push('sponsor "' + s.id + '" should run 1–3 fixtures');
        if (s.reward.item) item(s.reward.item, 'sponsor ' + s.id);
      }
      for (const r of EVENT_DATA.rivals) {
        cart(r.art, 'rival ' + r.id); str('rival.' + r.id, 'rival'); str('rival.' + r.id + '.short', 'rival'); str('rival.' + r.id + '.intro', 'rival');
        for (const b of r.buildUp) str('rival.' + r.id + '.' + b.id, 'rival build-up');
        for (const k of r.stats) if (!statKeys.has(k)) p.push('rival "' + r.id + '" boosts unknown stat "' + k + '"');
        if (r.reward.item) item(r.reward.item, 'rival ' + r.id);
        if (r.reward.coach && !coachIds.has(r.reward.coach)) p.push('rival "' + r.id + '" rewards unknown coach');
        if (r.reward.technique && !SKILL_TREE_DATA.techniques[r.reward.technique]) p.push('rival "' + r.id + '" rewards unknown technique');
      }
      for (const st of CAREER_DATA.stages) {
        if (st.milestone) cart(st.milestone, 'stage ' + st.id);
        for (const rv of [].concat(st.rival || [])) if (!EVENT_DATA.rivals.find((r) => r.id === rv.id)) p.push('stage "' + st.id + '" names unknown rival "' + rv.id + '"');
        if (st.next && !CAREER_DATA.stages.find((x) => x.id === st.next)) p.push('stage "' + st.id + '" leads to unknown stage "' + st.next + '"');
      }
      const F = CAREER_DATA.franchise;
      dupes('franchises', F.teams, 'id');
      if (F.teams.length !== F.groups * F.perGroup) p.push('the franchise tournament needs ' + F.groups * F.perGroup + ' franchises');
      for (const t of F.teams) { cart(t.crest, 'franchise ' + t.id); str('franchise.' + t.id, 'franchise'); }
      for (const o of F.offers.objectives) str('offer.obj.' + o.id, 'contract objective');
      for (const k of F.offers.coaches) if (!coachIds.has(k)) p.push('contract offers name unknown coach "' + k + '"');
      for (const id of F.offers.rewards) item(id, 'contract reward');
      for (const r of ['group', 'semi', 'final', 'champion']) str('table.reach.' + r, 'tournament');
    }

    // Legacy Traits and achievements (M09)
    if (typeof LEGACY_DATA !== 'undefined' && typeof ACHIEVEMENT_DATA !== 'undefined') {
      dupes('legacy traits', LEGACY_DATA.traits, 'id');
      if (LEGACY_DATA.traits.length !== 18) p.push('there must be 18 Legacy Traits (plan 8.22)');
      for (const t of Object.values(LEGACY_DATA.roleDefault)) if (!LEGACY_DATA.traits.some((x) => x.id === t)) p.push('trait role default "' + t + '" is not a trait');
      for (const t of LEGACY_DATA.traits) { cart(t.icon, 'trait ' + t.id); str('trait.' + t.id, 'trait'); str('trait.' + t.id + '.desc', 'trait'); if (!(t.need > 0)) p.push('trait "' + t.id + '" needs a threshold'); }
      const A = ACHIEVEMENT_DATA, ids = dupes('achievements', A.list, 'id');
      if (ids.size !== 100) p.push('there must be 100 achievements (docs/ACHIEVEMENTS_v1.md), not ' + ids.size);
      for (const t of Object.values(A.tiers)) cart(t, 'medal');
      for (const k of A.cats) str('ach.cat.' + k, 'achievement category');
      for (const a of A.list) {
        str('ach.' + a.id, 'achievement'); str('ach.' + a.id + '.desc', 'achievement');
        if (!A.tiers[a.tier]) p.push('achievement "' + a.id + '" has unknown tier');
        if (!A.cats.includes(a.cat)) p.push('achievement "' + a.id + '" has unknown category');
        if (!['match', 'life', 'career', 'account'].includes(a.cond.on) || !a.cond.stat || !(a.cond.min > 0)) p.push('achievement "' + a.id + '" has a bad condition');
        if (a.reward.item && !EQUIPMENT_DATA.items.some((it) => it.id === a.reward.item)) p.push('achievement "' + a.id + '" rewards unknown item');
      }
      for (const r of EVENT_DATA.rivals) if (!CAREER_DATA.stages.some((st) => [].concat(st.rival || []).some((x) => x.id === r.id)) && r.id !== 'phantom') p.push('rival "' + r.id + '" never appears in a stage');
      if (EVENT_DATA.rivals.length !== 12) p.push('there must be 12 rivals (plan 14.1)');
    }

    // My XI (M10)
    if (typeof MYXI_DATA !== 'undefined') {
      const M = MYXI_DATA, item = (id, w) => { if (!EQUIPMENT_DATA.items.some((it) => it.id === id)) p.push(w + ' names unknown item "' + id + '"'); };
      dupes('My XI chemistry', M.chemistry, 'id');
      if (M.chemistry.length !== 8) p.push('My XI needs the 8 chemistry types (plan 15.11)');
      for (const c of M.chemistry) { cart(c.icon, 'chemistry ' + c.id); str('myxi.chem.' + c.id, 'chemistry'); for (const k of Object.keys(c.stats)) if (!statKeys.has(k)) p.push('chemistry "' + c.id + '" raises unknown stat'); }
      for (const kind of ['bat', 'bowl']) {
        if (M.tactics[kind].length !== 4) p.push('My XI needs 4 ' + kind + ' tactical calls (plan 15.12)');
        for (const t of M.tactics[kind]) { cart(t.icon, 'tactic ' + t.id); str('myxi.tac.' + t.id, 'tactic'); if (t.field && !FIELD_DATA.presets.some((f) => f.id === t.field)) p.push('tactic "' + t.id + '" uses unknown field'); }
      }
      dupes('My XI competitions', M.competitions, 'id');
      if (M.competitions.length !== 6) p.push('My XI needs 6 competitions (plan 15.9)');
      for (const C of M.competitions) {
        cart(C.trophy, 'competition ' + C.id); str('myxi.comp.' + C.id, 'competition');
        for (const f of [C.fmt, C.finalFmt].filter(Boolean)) if (!MATCH_DATA.formats[f]) p.push('competition "' + C.id + '" uses unknown format');
        const rw = C.reward;
        if (rw.item) item(rw.item, 'competition ' + C.id);
        if (rw.recruit && !M.rewardRecruits[rw.recruit]) p.push('competition "' + C.id + '" rewards unknown recruit');
        if (rw.stadium && !M.stadiums.some((s) => s.id === rw.stadium)) p.push('competition "' + C.id + '" rewards unknown stadium');
        if (rw.coach && !COACH_DATA.coaches.some((k) => k.id === rw.coach)) p.push('competition "' + C.id + '" rewards unknown coach');
      }
      for (const s of M.stadiums) { cart(s.art, 'stadium ' + s.id); str('stadium.' + s.id, 'stadium'); }
      for (const id of Object.keys(M.rivalRecruits)) if (!EVENT_DATA.rivals.some((r) => r.id === id)) p.push('My XI rival recruit "' + id + '" is not a rival');
      if (Object.keys(M.rivalRecruits).length !== EVENT_DATA.rivals.length) p.push('every rival needs a My XI recruit profile');
      for (const [id, R] of Object.entries(M.rivalRecruits)) { if (!SKILL_TREE_DATA.techniques[R.tech]) p.push('rival recruit "' + id + '" has unknown technique'); if (R.family && !BOWLING_DATA.families[R.family]) p.push('rival recruit "' + id + '" has unknown family'); }
      for (const L of M.legends) { cart(L.crest, 'legends squad ' + L.id); str('elite.' + L.id, 'legends squad'); }
      for (const [k, v] of Object.entries(M.captainPerkFor)) { if (!M.captainPerks[v]) p.push('captain perk "' + v + '" missing'); str('myxi.cap.' + v, 'captain perk'); }
      for (const id of M.seriesRivals) if (!M.rivalRecruits[id]) p.push('series rival "' + id + '" unknown');
    }

    // ---- Six Smash / Wicket Rush rulesets and Missions (M11) ----
    if (typeof CHALLENGE_DATA !== 'undefined') {
      const cstr = (k, what) => { if (STRINGS.en[k] === undefined) p.push(what + ' text "' + k + '" missing'); };
      for (const g of ['six', 'rush']) {
        const list = CHALLENGE_DATA[g].rulesets;
        dupes(g + ' rulesets', list, 'id');
        if (list.length !== 5) p.push(g + ' needs 5 rulesets');
        for (const r of list) {
          if (!allArt[r.icon]) p.push('ruleset "' + r.id + '" icon not in the manifest');
          if (r.medals.length !== 4 || r.medals.some((v, i) => i && v <= r.medals[i - 1])) p.push('ruleset "' + r.id + '" medals must be 4 rising scores');
          for (const k of ['', '.sub', '.rules']) cstr('chal.rs.' + r.id + k, 'ruleset');
          if (r.boss && !EVENT_DATA.rivals.some((x) => x.id === r.boss.rival)) p.push('ruleset "' + r.id + '" boss is not a rival');
          if (r.lives && !r.loseLife) p.push('ruleset "' + r.id + '" has lives but nothing loses one');
        }
      }
      for (const [d, D] of Object.entries(CHALLENGE_DATA.difficulty)) { if (!allArt[D.icon]) p.push('difficulty "' + d + '" icon missing'); cstr('chal.diff.' + d, 'difficulty'); }
      for (const m of CHALLENGE_DATA.medals) if (!allArt[CHALLENGE_DATA.medalIcon[m]]) p.push('medal "' + m + '" art missing');
    }
    if (typeof MISSION_DATA !== 'undefined') {
      const M = MISSION_DATA, ids = dupes('missions', M.list, 'id');
      const counts = { batting: 12, bowling: 12, pressure: 8, rival: 8, expert: 8 };
      if (M.list.length !== 48) p.push('there must be 48 missions (' + M.list.length + ')');
      for (const [c, n] of Object.entries(counts)) if (M.list.filter((m) => m.cat === c).length !== n) p.push('mission category "' + c + '" needs ' + n);
      const stats = ['runs', 'wktsLost', 'boundaries', 'sixes', 'fours', 'perfect', 'dots', 'ballsLeft', 'techUsed', 'heroRuns',
        'wickets', 'bowled', 'lbw', 'caught', 'runsConceded', 'boundariesConceded', 'extras', 'rivalOut'];
      const deliveries = new Set(Object.values(BOWLING_DATA.families).flatMap((f) => f.deliveries.map((d) => d.id)));
      const goals = { bat: ['runs', 'boundaries', 'survive', 'milestone'], bowl: ['defend', 'wickets', 'dots', 'dismiss'] };
      for (const [id, C] of Object.entries(M.cast)) {
        if (STRINGS.en['mis.cast.' + id] === undefined) p.push('mission cast "' + id + '" has no name text');
        for (const t of C.tech) if (!SKILL_TREE_DATA.techniques[t]) p.push('mission cast "' + id + '" has unknown technique ' + t);
        if (C.family && !BOWLING_DATA.families[C.family]) p.push('mission cast "' + id + '" has unknown family');
      }
      for (const m of M.list) {
        const where = 'mission "' + m.id + '"', F = MATCH_DATA.formats[m.fmt];
        if (!F) { p.push(where + ' unknown format'); continue; }
        for (const k of ['', '.brief']) if (STRINGS.en['mis.' + m.id + k] === undefined) p.push(where + ' text "mis.' + m.id + k + '" missing');
        if (!goals[m.side] || !goals[m.side].includes(m.goal.kind)) p.push(where + ' goal "' + m.goal.kind + '" does not fit side ' + m.side);
        if ((m.goal.kind === 'runs' || m.goal.kind === 'defend') && !m.target) p.push(where + ' needs a target');
        if (!m.super && m.at.over * 6 + m.at.ball + m.balls > F.overs * 6) p.push(where + ' runs past the last over');
        if (m.stars.length !== 3) p.push(where + ' needs 3 stars');
        for (const s of m.stars) {
          if (s.field) { if (!FIELD_DATA.presets.some((f) => f.id === s.field)) p.push(where + ' star field unknown'); continue; }
          if (s.stat.startsWith('wk_') ? !deliveries.has(s.stat.slice(3)) : !stats.includes(s.stat)) p.push(where + ' star stat "' + s.stat + '" unknown');
          if (STRINGS.en['mis.star.' + (s.stat.startsWith('wk_') ? 'wk' : s.stat + (s.min !== undefined ? '.min' : '.max'))] === undefined) p.push(where + ' star text for ' + s.stat + ' missing');
        }
        if (m.side === 'bat' && !M.cast[m.hero]) p.push(where + ' hero unknown');
        if (m.partner && !M.cast[m.partner]) p.push(where + ' partner unknown');
        if (m.side === 'bowl') for (const b of m.bowlers || []) if (!M.cast[b] || !M.cast[b].family) p.push(where + ' bowler "' + b + '" is not a bowler');
        if (m.side === 'bowl' && m.balls > 6 && (m.bowlers || []).length < 2) p.push(where + ' needs two bowlers (no two overs in a row)');
        const O = m.opp || {};
        if (O.rival) {
          const R0 = EVENT_DATA.rivals.find((r) => r.id === O.rival);
          if (!R0) p.push(where + ' rival unknown');
          else if (m.side === 'bowl' && R0.slot !== m.at.wkts + 1) p.push(where + ' the rival must be on strike (slot ' + R0.slot + ')');
          else if (m.side === 'bat' && (O.attack || []).includes('rival') && !R0.family) p.push(where + ' rival does not bowl');
        }
        for (const f of O.attack || []) if (f !== 'rival' && !BOWLING_DATA.families[f]) p.push(where + ' attack family "' + f + '" unknown');
        const rw = m.reward || M.rewards[m.diff];
        for (const r of [rw.first, rw.perfect]) if (r.item && !EQUIPMENT_DATA.items.some((it) => it.id === r.item)) p.push(where + ' rewards unknown item');
      }
      for (const c of M.categories) if (!allArt[c.icon]) p.push('mission category "' + c.id + '" icon not in the manifest');
      if (ids.size !== M.list.length) p.push('mission ids repeat');
    }

    // Manifest: every entry needs a file path, every id once (object keys are unique by nature)
    for (const [gname, g] of Object.entries(ASSET_MANIFEST.groups)) {
      for (const [id, e] of Object.entries(g)) if (!e || !e.src) p.push(`asset "${id}" in group ${gname} has no file path`);
    }
    return p;
  },

  // ---- full check at boot (waits for the art to finish loading) --------
  run() {
    this.problems = this.runData();
    this.done = false;
    return Sprites.settled().then(() => {
      for (const [id, st] of Object.entries(Sprites.status)) {
        if (st === 'missing') this.problems.push(`art file missing for sprite "${id}"`);
      }
      this.done = true;
      if (this.problems.length) {
        console.error('[content check] ' + this.problems.length + ' problem(s):\n' + this.problems.join('\n'));
        Log.add('error', 'content check failed: ' + this.problems.length);
      } else {
        Log.add('content', 'content check passed');
      }
      return this.problems;
    });
  },

  // Red panel over everything until tapped (debug builds only).
  render(ctx) {
    if (!this.done || !this.problems.length || this._dismissed) return;
    const v = Display.viewRect();
    ctx.fillStyle = 'rgba(90,0,0,0.9)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    const cx = CONFIG.LOGICAL_W / 2;
    R.text(T('dev.contentFailed', { n: this.problems.length }), cx, 110, 60, '#ffffff');
    this.problems.slice(0, 16).forEach((msg, i) => R.plainText(msg, 120, 200 + i * 44, 30, '#ffd0d0'));
    if (this.problems.length > 16) R.plainText('…', 120, 200 + 16 * 44, 30, '#ffd0d0');
    R.text(T('dev.contentDismiss'), cx, 1010, 30, '#ffffff', 'center', false);
  },

  // Returns true if the tap was used to dismiss the panel.
  dismiss() {
    if (this.done && this.problems.length && !this._dismissed) { this._dismissed = true; return true; }
    return false;
  },
};
