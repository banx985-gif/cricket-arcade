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

    // Bowling
    const types = dupes('bowling deliveries', BOWLING_DATA.deliveries, 'id');
    for (const d of BOWLING_DATA.deliveries) { art(d.icon, 'delivery ' + d.id); str('bowl.type.' + d.id, 'delivery ' + d.id); }
    const A = BOWLING_DATA.aiBatter;
    if (A.weakness && !lengths.has(A.weakness.id)) p.push(`AI batter weakness "${A.weakness.id}" is not a delivery length`);
    for (const k of Object.keys(A.difficulty)) if (!lengths.has(k)) p.push(`AI batter difficulty "${k}" is not a delivery length`);
    if (types.size !== 4) p.push('bowling needs exactly 4 delivery slots');

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
