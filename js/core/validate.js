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
