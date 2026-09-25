// Cricket Arcade — short wicket "moments" (A4). Each is its own event, not a
// generic wicket, and each sits behind a named id so the 3D-rendered
// animation can drop in later with no logic change:
//   anim_lbw        ball thuds into the pad, a short pause, the umpire's finger goes up
//   anim_hit_wicket the batter's swing clips the stumps; the bails fly off behind
// Until that art exists they are code-drawn effects (rings, dust, shake, the
// umpire's raised arm). A scene holds one moment at a time in scene.moment.

const Moments = {
  defs: {
    anim_lbw: { dur: () => BOWLING_DATA.lbw.thudPause + 0.75 },
    anim_hit_wicket: { dur: () => 0.95 },
  },

  // info: { notOut } ; done() is called when the moment finishes.
  start(scene, id, done, info) {
    scene.moment = { id, t: 0, dur: this.defs[id].dur(), done, info: info || {} };
    const PI = BATTING_DATA.pitch;
    if (id === 'anim_lbw') {
      Sound.play('batDefend', { gain: 1.3 });
      Sound.play('catchIt', { gain: 0.6 });
      const b = scene._ballPos();
      const sp = b && View3D.project(b.x, b.y, b.z);
      if (sp) { Effects.ring(sp.x, sp.y, 90, '#ffffff', 0.35, 10); Effects.dust(sp.x, sp.y, 6, 1); }
      Effects.shake(5, 0.15);
      Effects.text(T('moment.thud'), CONFIG.LOGICAL_W / 2, 330, '#ffffff', 60, { life: 0.8 });
      Sound.play('crowdCheer', { gain: 0.35 });          // the appeal
    } else if (id === 'anim_hit_wicket') {
      scene.stumpsBroken = 'hitwicket';
      scene.stumpsBrokenAt = Stadium._time;
      Sound.play('stumps');
      const sp = View3D.project(0, PI.stumpsHeight, 0);
      if (sp) { Effects.sparks(sp.x, sp.y, 14, '#f3e7c9', 520); Effects.dust(sp.x, sp.y + 20, 8, 1.2); }
      Effects.shake(8, 0.25);
    }
  },

  update(scene, dt) {
    const m = scene.moment;
    if (!m) return;
    const before = m.t;
    m.t += dt;
    // LBW: after the pause, the umpire gives it (or doesn't).
    if (m.id === 'anim_lbw' && before < BOWLING_DATA.lbw.thudPause && m.t >= BOWLING_DATA.lbw.thudPause) {
      if (!m.info.notOut) { Sound.play('wicket', { gain: 0.8 }); Effects.text(T('moment.fingerUp'), CONFIG.LOGICAL_W / 2, 440, '#ff6b6b', 80, { life: 0.9 }); }
      else Effects.text(T('moment.notOutLeg'), CONFIG.LOGICAL_W / 2, 440, '#ffd23f', 50, { life: 1.1 });
    }
    if (m.t >= m.dur) {
      scene.moment = null;
      m.done();
    }
  },

  // Is the umpire's finger up right now? (drawn on the umpire in the world view)
  fingerUp(scene) {
    const m = scene.moment;
    if (m && m.id === 'anim_lbw') return !m.info.notOut && m.t >= BOWLING_DATA.lbw.thudPause;
    const o = scene.outcome;
    return !!(o && o.fingerUp && scene.state === 'outcome');
  },

  // Screen overlay while a moment plays (a code-drawn "replay" frame).
  draw(ctx, scene) {
    const m = scene.moment;
    if (!m) return;
    const v = Display.viewRect();
    const a = Math.min(1, m.t / 0.12) * 0.9;
    ctx.save();
    ctx.globalAlpha = a;
    // letterbox bars: a TV "moment" look
    ctx.fillStyle = '#000';
    ctx.fillRect(v.x, v.y, v.w, 70);
    ctx.fillRect(v.x, v.y + v.h - 70, v.w, 70);
    ctx.restore();
    const label = m.id === 'anim_lbw' ? T('moment.appeal') : T('moment.hitWicket');
    R.text(label, CONFIG.LOGICAL_W / 2, v.y + 35, 34, '#ffd23f', 'center', false);
    // The umpire's finger goes up (umpire art slides in; the world umpire raises an arm too).
    if (m.id === 'anim_lbw' && !m.info.notOut && m.t >= BOWLING_DATA.lbw.thudPause && Sprites.has('umpire_out')) {
      const k = Math.min(1, (m.t - BOWLING_DATA.lbw.thudPause) / 0.2);
      Sprites.ui('umpire_out', Display.safe.right - 170 + (1 - k) * 300, 640, 260, 420);
    }
  },
};
