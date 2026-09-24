// Cricket Arcade â€” service worker (offline cache for the installed web app).
//
// NETWORK FIRST: when the phone is online it always fetches the newest files
// (so a new build shows up on the next open) and keeps a copy; when offline
// it plays from that copy.
//
// VERSION is stamped automatically by publish.ps1 on every publish. A new
// version makes the phone install this worker fresh and throw away old copies.
const VERSION = '20260925-015533';
const CACHE = 'cricket-arcade-' + VERSION;

// The page itself + the icon/manifest, so the app opens offline straight away.
// Everything else (scripts, art) is cached the first time the game loads it.
const CORE = ['./', './index.html', './manifest.webmanifest', './css/main.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' }))))
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
