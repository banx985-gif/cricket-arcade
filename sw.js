// Cricket Arcade â€” service worker (offline cache for the installed web app).
//
// NETWORK FIRST: when the phone is online it always fetches the newest files
// (so a new build shows up on the next open) and keeps a copy; when offline
// it plays from that copy.
//
// VERSION is stamped automatically by publish.ps1 on every publish. A new
// version makes the phone install this worker fresh and throw away old copies.
const VERSION = '20260925-212134';
const CACHE = 'cricket-arcade-' + VERSION;

// The page itself + the icon/manifest, so the app opens offline straight away.
// Everything else (scripts, art) is cached the first time the game loads it.
const CORE = ['./', './index.html', './manifest.webmanifest', './css/main.css'];
// Every script and art file the game uses â€” filled in by publish.ps1 so the
// whole game is saved on the very first visit. (Empty when run locally.)
const PRECACHE = ['./js/config.js', './js/main.js', './js/core/audio.js', './js/core/devpanel.js', './js/core/display.js', './js/core/effects.js', './js/core/input.js', './js/core/log.js', './js/core/platform.js', './js/core/renderer.js', './js/core/rng.js', './js/core/save.js', './js/core/scenes.js', './js/core/sprites.js', './js/core/store.js', './js/core/ui.js', './js/core/validate.js', './js/data/assets.js', './js/data/batting.js', './js/data/bowling.js', './js/data/career.js', './js/data/coaches.js', './js/data/equipment.js', './js/data/events.js', './js/data/fields.js', './js/data/match.js', './js/data/origins.js', './js/data/players.js', './js/data/sixsmash.js', './js/data/skilltree.js', './js/data/stadium.js', './js/data/strings.js', './js/game/aibatter.js', './js/game/ballpath.js', './js/game/ballplay.js', './js/game/batcontrols.js', './js/game/bowlcontrols.js', './js/game/bowler.js', './js/game/career.js', './js/game/careermatch.js', './js/game/careerui.js', './js/game/coaches.js', './js/game/contact.js', './js/game/delivery.js', './js/game/duel.js', './js/game/events.js', './js/game/fielding.js', './js/game/gear.js', './js/game/match.js', './js/game/matchhud.js', './js/game/matchui.js', './js/game/moments.js', './js/game/pitchscene.js', './js/game/runcontrols.js', './js/game/running.js', './js/game/simmatch.js', './js/game/sixsmash_rules.js', './js/game/skilltree.js', './js/game/stadium.js', './js/game/teams.js', './js/game/techniques.js', './js/game/throws.js', './js/game/tournament.js', './js/game/treeart.js', './js/game/unlocks.js', './js/game/view3d.js', './js/game/wicketrush_rules.js', './js/scenes/boot.js', './js/scenes/careerhome.js', './js/scenes/careermatchflow.js', './js/scenes/careerselect.js', './js/scenes/careerstages.js', './js/scenes/gear.js', './js/scenes/matchbat.js', './js/scenes/matchbowl.js', './js/scenes/matchflow.js', './js/scenes/result.js', './js/scenes/settings.js', './js/scenes/sixsmash.js', './js/scenes/skilltree.js', './js/scenes/title.js', './js/scenes/wicketrush.js', './assets/characters/player_batter_hero.png', './assets/characters/player_bowler_hero.png', './assets/characters/support/generic_umpire.png', './assets/hud/direction_control_pad.png', './assets/hud/bowling_target_reticle.png', './assets/icons/batting/control_shot.png', './assets/icons/batting/power_shot.png', './assets/icons/batting/defend.png', './assets/icons/bowling/stock_fast.png', './assets/icons/bowling/yorker.png', './assets/icons/bowling/bouncer.png', './assets/icons/bowling/slower_ball.png', './assets/icons/bowling/swing_seam.png', './assets/icons/bowling/inswing.png', './assets/icons/bowling/outswing.png', './assets/icons/bowling/cutter.png', './assets/icons/bowling/spin.png', './assets/icons/bowling/googly.png', './assets/icons/bowling/top_spinner.png', './assets/icons/bowling/arm_ball.png', './assets/icons/markers/marker_six.png', './assets/icons/markers/marker_four.png', './assets/icons/markers/marker_wicket.png', './assets/icons/markers/marker_wide.png', './assets/icons/markers/marker_no_ball.png', './assets/icons/markers/marker_free_hit.png', './assets/icons/markers/marker_lbw.png', './assets/icons/markers/marker_hit_wicket.png', './assets/icons/markers/marker_run_out.png', './assets/icons/markers/marker_overthrow.png', './assets/icons/markers/marker_super_over.png', './assets/icons/markers/marker_hat_trick.png', './assets/icons/field/field_balanced.png', './assets/icons/field/field_attacking.png', './assets/icons/field/field_defensive.png', './assets/icons/field/field_spin_trap.png', './assets/icons/field/field_yorker_death.png', './assets/icons/field/field_bouncer_trap.png', './assets/icons/field/field_off_side_ring.png', './assets/icons/field/field_leg_side_ring.png', './assets/icons/field/field_powerplay_squeeze.png', './assets/icons/field/field_auto.png', './assets/icons/field/field_locked.png', './assets/icons/field/field_settings_button.png', './assets/match/sky/sky_clear.png', './assets/match/sky/sky_overcast.png', './assets/match/sky/sky_windy.png', './assets/match/sky/sky_hot.png', './assets/match/sky/sky_dusk.png', './assets/match/sky/sky_night.png', './assets/stadiums/local_oval/local_oval_stands.png', './assets/stadiums/local_oval/local_oval_boards.png', './assets/match/pitch/outfield_grass_tile.png', './assets/match/pitch/pitch_balanced.png', './assets/match/pitch/pitch_green.png', './assets/match/pitch/pitch_dry.png', './assets/match/pitch/pitch_hard.png', './assets/match/pitch/pitch_worn.png', './assets/match/props/sightscreen.png', './assets/match/props/floodlight_tower.png', './assets/match/props/dugout_bench.png', './assets/match/props/stumps_closeup.png', './assets/match/crowd/crowd_a_sit.png', './assets/match/crowd/crowd_a_cheer.png', './assets/match/crowd/crowd_a_jump.png', './assets/match/crowd/crowd_b_sit.png', './assets/match/crowd/crowd_b_cheer.png', './assets/match/crowd/crowd_b_jump.png', './assets/match/crowd/crowd_c_sit.png', './assets/match/crowd/crowd_c_cheer.png', './assets/match/crowd/crowd_c_jump.png', './assets/match/crowd/crowd_flag_01.png', './assets/match/crowd/crowd_flag_02.png', './assets/match/crowd/crowd_flag_03.png', './assets/environment/props/crowd_banner_02.png', './assets/environment/props/crowd_banner_03.png', './assets/icons/challenge/six_smash.png', './assets/icons/challenge/wicket_rush.png', './assets/icons/challenge/golden_ball.png', './assets/icons/challenge/golden_wicket.png', './assets/hud/scoreboard_hud.png', './assets/hud/target_required_rate_hud.png', './assets/icons/batting/run.png', './assets/icons/batting/cancel_run.png', './assets/icons/modes/quick_match_icon.png', './assets/icons/modes/settings_icon.png', './assets/icons/modes/collection_icon.png', './assets/equipment/standard_cricket_bat.png', './assets/equipment/standard_batting_helmet.png', './assets/equipment/standard_batting_gloves.png', './assets/equipment/standard_batting_pads.png', './assets/characters/player_allrounder_hero.png', './assets/badges/national/badge_india.png', './assets/icons/career_status/form_hot.png', './assets/icons/training/timing_cage.png', './assets/icons/grades/grade_s.png', './assets/career/stages/local_cricket.png', './assets/icons/results/banner_tie.png', './assets/icons/results/banner_you_lose.png', './assets/icons/results/banner_you_win.png', './assets/icons/results/toss_coin_heads.png', './assets/icons/results/toss_coin_tails.png', './assets/branding/pwa/apple-touch-icon-180.png', './assets/branding/pwa/icon-192.png', './assets/branding/pwa/icon-512.png', './assets/branding/pwa/icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // One file failing (e.g. art still being re-filed) must not block the rest.
      .then((c) => Promise.allSettled(CORE.concat(PRECACHE).map((u) =>
        c.add(new Request(u, { cache: 'reload' })))))
      .catch(() => { /* offline during install: runtime caching will fill in */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cricket-arcade-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
