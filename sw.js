// Cricket Arcade â€” service worker (offline cache for the installed web app).
//
// NETWORK FIRST: when the phone is online it always fetches the newest files
// (so a new build shows up on the next open) and keeps a copy; when offline
// it plays from that copy.
//
// VERSION is stamped automatically by publish.ps1 on every publish. A new
// version makes the phone install this worker fresh and throw away old copies.
const VERSION = '20260925-020152';
const CACHE = 'cricket-arcade-' + VERSION;

// The page itself + the icon/manifest, so the app opens offline straight away.
// Everything else (scripts, art) is cached the first time the game loads it.
const CORE = ['./', './index.html', './manifest.webmanifest', './css/main.css'];
// Every script and art file the game uses â€” filled in by publish.ps1 so the
// whole game is saved on the very first visit. (Empty when run locally.)
const PRECACHE = ['./js/config.js', './js/main.js', './js/core/audio.js', './js/core/devpanel.js', './js/core/display.js', './js/core/effects.js', './js/core/input.js', './js/core/log.js', './js/core/platform.js', './js/core/renderer.js', './js/core/rng.js', './js/core/scenes.js', './js/core/sprites.js', './js/core/store.js', './js/core/ui.js', './js/data/assets.js', './js/data/batting.js', './js/data/bowling.js', './js/data/match.js', './js/data/sixsmash.js', './js/data/strings.js', './js/game/aibatter.js', './js/game/ballpath.js', './js/game/batcontrols.js', './js/game/bowlcontrols.js', './js/game/contact.js', './js/game/delivery.js', './js/game/fielding.js', './js/game/match.js', './js/game/matchhud.js', './js/game/pitchscene.js', './js/game/runcontrols.js', './js/game/running.js', './js/game/sixsmash_rules.js', './js/game/stadium.js', './js/game/view3d.js', './js/game/wicketrush_rules.js', './js/scenes/boot.js', './js/scenes/matchbat.js', './js/scenes/matchbowl.js', './js/scenes/matchflow.js', './js/scenes/result.js', './js/scenes/sixsmash.js', './js/scenes/title.js', './js/scenes/wicketrush.js', './assets/characters/player_batter_hero.png', './assets/characters/player_bowler_hero.png', './assets/characters/support/generic_umpire.png', './assets/hud/direction_control_pad.png', './assets/hud/bowling_target_reticle.png', './assets/icons/batting/control_shot.png', './assets/icons/batting/power_shot.png', './assets/icons/batting/defend.png', './assets/icons/bowling/stock_fast.png', './assets/icons/bowling/yorker.png', './assets/icons/bowling/bouncer.png', './assets/icons/bowling/slower_ball.png', './assets/icons/markers/marker_six.png', './assets/icons/markers/marker_four.png', './assets/icons/markers/marker_wicket.png', './assets/icons/markers/marker_wide.png', './assets/icons/markers/marker_no_ball.png', './assets/icons/markers/marker_free_hit.png', './assets/icons/challenge/six_smash.png', './assets/icons/challenge/wicket_rush.png', './assets/icons/challenge/golden_ball.png', './assets/icons/challenge/golden_wicket.png', './assets/hud/scoreboard_hud.png', './assets/hud/target_required_rate_hud.png', './assets/icons/batting/run.png', './assets/icons/batting/cancel_run.png', './assets/icons/modes/quick_match_icon.png', './assets/equipment/standard_cricket_bat.png', './assets/equipment/standard_batting_helmet.png', './assets/equipment/standard_batting_gloves.png', './assets/equipment/standard_batting_pads.png', './assets/branding/pwa/apple-touch-icon-180.png', './assets/branding/pwa/icon-192.png', './assets/branding/pwa/icon-512.png', './assets/branding/pwa/icon-maskable-512.png'];

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
