// Cricket Legends (M17 Job 4) - story scenes. A short talking scene over whatever screen is open:
// a big portrait, the speaker's name, a speech box; tap to continue, SKIP to end it.
// Scenes (data/story.js) play for stage starts, a rival's first appearance, promotions and retirement,
// each once per career (c.story remembers what was shown). Scenes.js gives the open scene every tap.

const Story = {
  open: false,
  id: null, lines: [], i: 0, t: 0,
  vars: {}, rival: null, career: null, onDone: null,
  buttons: null,                 // made on first use (core/ui.js loads after this file in tests)

  seen(c, key) { return !!(c && c.story && c.story[key]); },
  mark(c, key) { if (c) { c.story = c.story || {}; c.story[key] = true; } },

  // The lines of a scene (speaker + text), ready to show. Pure: used by the tests too.
  build(id, o) {
    const def = STORY_DATA.scenes[id];
    if (!def) return [];
    const opt = o || {}, c = opt.career;
    return def.map(([who, key]) => {
      const k = key.replace('{id}', opt.rival || '');
      let art, name;
      if (who === 'rival') { const R = Rivals.rival(opt.rival); art = R ? R.art : null; name = T('rival.' + opt.rival); }
      else if (who === 'coach') {
        const hired = c && typeof Coaches !== 'undefined' ? Coaches.active(c) : null;
        art = hired ? 'coach_' + hired : STORY_DATA.cast.coach.art; name = T(hired ? 'coach.' + hired : STORY_DATA.cast.coach.nameKey);
      } else { const P = STORY_DATA.cast[who]; art = P.art; name = T(P.nameKey); }
      const vars = Object.assign({ name: c ? c.player.name.split(' ')[0] : '' }, opt.vars || {});
      return { who, art, name, key: k, text: T(k, vars) };
    });
  },

  // Open a scene. o: { career, key (shown once per career: skipped if already seen), rival, vars, onDone }.
  // Returns true if it opened (onDone runs when it closes), false if there was nothing to show.
  play(id, o) {
    const opt = o || {};
    if (opt.key && this.seen(opt.career, opt.key)) return false;
    const lines = this.build(id, opt);
    if (!lines.length) return false;
    if (opt.key) this.mark(opt.career, opt.key);
    this.open = true; this.id = id; this.lines = lines; this.i = 0; this.t = 0;
    this.career = opt.career || null; this.onDone = opt.onDone || null;
    this._art(lines);
    this._laid = false;
    if (typeof Sound !== 'undefined') Sound.play('uiTap');
    return true;
  },
  // SKIP, top right (made when first drawn or touched: the screen size is known then).
  _layout() {
    if (this._laid) return;
    this._laid = true;
    this.buttons = this.buttons || new ButtonList();
    const s = Display.safe;
    this.buttons.clear();
    this.buttons.add('story.skip', s.right - 250, s.top + 24, 220, 90, () => this.close(), { size: 32, color: '#e9eef5' }).tag = 'skip';
  },
  // Load the art groups the portraits are in (the scene draws as soon as they arrive).
  _art(lines) {
    if (typeof Sprites === 'undefined' || typeof ASSET_MANIFEST === 'undefined') return;
    const groups = new Set();
    for (const l of lines) for (const [g, list] of Object.entries(ASSET_MANIFEST.groups)) if (list[l.art]) groups.add(g);
    for (const g of groups) if (!Sprites.groupReady(g)) Sprites.loadGroup(g);
  },

  // Career Home: the stage-start scene, then a new rival's introduction. Returns true if one opened.
  forHome(c, onDone) {
    if (!c || c.phase !== 'season') return false;
    if (this.play('stage_' + c.stage, { career: c, key: 'stage:' + c.stage, onDone, vars: { stage: typeof CareerUI !== 'undefined' ? CareerUI.pathwayLabel(c) : T(Career.stage(c).nameKey) } })) return true;
    const nx = Career.next(c);
    if (nx && nx.rival && STORY_DATA.scenes.rival) return this.play('rival', { career: c, key: 'rival:' + nx.rival, rival: nx.rival, onDone });
    return false;
  },

  _full() { const l = this.lines[this.i]; return !l || this.t * STORY_DATA.revealPerSecond >= l.text.length; },
  next() {
    if (!this._full()) { this.t = 999; return; }          // first tap: the whole line
    this.i++; this.t = 0;
    if (this.i >= this.lines.length) this.close();
  },
  close() {
    this.open = false;
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  },
  update(dt) { if (this.open) this.t += dt; },

  render(ctx) {
    const l = this.lines[this.i];
    if (!l) return;
    this._layout();
    const v = Display.viewRect(), s = Display.safe, cx = CONFIG.LOGICAL_W / 2;
    ctx.fillStyle = 'rgba(2,8,16,0.62)';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    // The speaker: big on the left (the rival stands on the right).
    const right = l.who === 'rival', px = right ? Math.min(s.right - 330, cx + 620) : Math.max(s.left + 330, cx - 620);
    const pop = Math.min(1, this.t / 0.18);
    ctx.save(); ctx.globalAlpha = pop;
    Sprites.ui(l.art, px, 470 + (1 - pop) * 30, 600, 700);
    ctx.restore();
    // The speech box across the bottom.
    const bx = Math.max(s.left + 30, cx - 900), bw = Math.min(s.right - 30, cx + 900) - bx, by = s.bottom - 330;
    R.panel(bx, by, bw, 300, 'rgba(10,22,40,0.96)', '#ffd23f');
    R.roundRect(right ? bx + bw - 520 : bx + 40, by - 40, 480, 72, 24, '#ffd23f', null);
    R.text(l.name, right ? bx + bw - 280 : bx + 280, by - 4, 34, CONFIG.COLOR.ink, 'center', true, 440);
    const shown = l.text.slice(0, Math.floor(this.t * STORY_DATA.revealPerSecond));
    if (typeof GearUI !== 'undefined') GearUI.wrap(shown, bx + 50, by + 80, bw - 100, 34, '#ffffff');
    else R.text(shown, bx + 50, by + 90, 34, '#ffffff', 'left', false, bw - 100);
    // tap to continue, and where we are
    if (this._full() && Math.floor(this.t * 2) % 2 === 0) R.text(T(this.i === this.lines.length - 1 ? 'story.tapEnd' : 'story.tap'), bx + bw - 40, by + 262, 22, '#9be7ff', 'right', false);
    for (let k = 0; k < this.lines.length; k++) R.circle(bx + 50 + k * 30, by + 262, 8, k <= this.i ? '#ffd23f' : 'rgba(255,255,255,0.25)');
    this.buttons.draw();
  },

  pointerDown(id, x, y) { this._layout(); if (!this.buttons.down(id, x, y)) this._tap = id; },
  pointerMove(id, x, y) { this._layout(); this.buttons.move(id, x, y); },
  pointerUp(id) { this._layout(); if (this.buttons.up(id)) return; if (this._tap === id) { this._tap = null; this.next(); } },
  keyDown(code) { if (code === 'Escape') this.close(); else if (code === 'Space' || code === 'Enter') this.next(); },
};
