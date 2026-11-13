// Cricket Arcade — platform adapter (plan 43A.1 / 43A.6).
// The only place that touches device/browser lifecycle and haptics. Game code
// calls Platform.*, never navigator.* directly, so a phone wrapper can swap
// these out later.
//
// Lifecycle contract (43A.6):
//   going to background -> block input, autosave, pause audio, freeze the game
//   coming back         -> never fast-forward; show "Tap to continue"; audio
//                          comes back only on that tap (phones require a tap)

const Platform = {
  _pauseHandlers: [],
  _resumeHandlers: [],
  hapticsOn: true,
  backgrounded: false,

  init() {
    const hide = () => this._background();
    const show = () => this._foreground();
    document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); else show(); });
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', (e) => { if (!document.hidden) show(); });
    // Chrome's page lifecycle: the tab may be frozen without a visibility change.
    document.addEventListener('freeze', hide);
    document.addEventListener('resume', show);
    // The Android / iOS app (Capacitor): pause / resume and the back button.
    const App = this.native() && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App) {
      App.addListener('pause', hide);
      App.addListener('resume', show);
      App.addListener('backButton', () => this._back(App));
    }
    this._initNotify();
  },

  // Running inside the store app (not a browser)?
  native() { return typeof window !== 'undefined' && !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); },
  // Android back button: works like Escape (close a panel, pause a match, go back); on the Title it leaves the app.
  _back(App) {
    if (typeof Scenes === 'undefined') return;
    if (Scenes.currentName === 'title') { App.exitApp(); return; }
    Scenes.keyDown('Escape');
  },

  // Keep the screen on during matches (Screen Wake Lock: phones' browsers and the app).
  _wake: null,
  keepAwake(on) {
    try {
      if (on && !this._wake && navigator.wakeLock) navigator.wakeLock.request('screen').then((w) => { this._wake = w; w.addEventListener('release', () => { this._wake = null; }); }).catch(() => {});
      if (!on && this._wake) { this._wake.release().catch(() => {}); this._wake = null; }
    } catch (e) { /* optional */ }
  },

  // ---- the Full Game Unlock (M13, plan 43A.11): gameplay asks ONLY isFullGame() ----
  initFullGame(o) { return Entitlement.init(o); },
  isFullGame() { return typeof Entitlement === 'undefined' ? true : Entitlement.isFull(); },
  fullGamePrice() { return typeof Entitlement === 'undefined' ? null : Entitlement.price(); },
  buyFullGame() { return Entitlement.buy(); },
  restoreFullGame() { return Entitlement.restore(); },
  usingTestStore() { return typeof Entitlement !== 'undefined' && Entitlement.store === TestStore; },
  relockFullGameTest() { return Entitlement.relockTest(); },

  _background() {
    if (this.backgrounded) return;
    this.backgrounded = true;
    Log.add('lifecycle', 'background');
    for (const fn of this._pauseHandlers) { try { fn(); } catch (e) { Log.add('error', 'onPause: ' + e.message); } }
  },

  _foreground() {
    if (!this.backgrounded) return;
    this.backgrounded = false;
    Log.add('lifecycle', 'foreground');
    for (const fn of this._resumeHandlers) { try { fn(); } catch (e) { Log.add('error', 'onResume: ' + e.message); } }
  },

  // Called when the app goes to the background.
  onPause(fn) { this._pauseHandlers.push(fn); },
  // Called when the app comes back.
  onResume(fn) { this._resumeHandlers.push(fn); },

  // ---- notifications (Rule B). Game code calls these, never the plugin / browser API. ----
  // App: Capacitor Local Notifications. Web: browser notifications if allowed (they can only
  // fire while the page is still alive in the background); otherwise everything is a quiet no-op.
  _notifyTimers: {},
  _localNotif() { return this.native() && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications || null; },
  _webNotif() { return typeof window !== 'undefined' && 'Notification' in window ? window.Notification : null; },
  // Can we ask at all on this device (the phone hasn't blocked us)? True if already allowed too.
  notifyCanAsk() {
    // Automated test browsers can't answer a question: skip quietly (tests switch it on with __notifyTest).
    if (typeof navigator !== 'undefined' && navigator.webdriver && !window.__notifyTest) return false;
    if (this._localNotif()) return this._nativePerm !== 'denied';
    const N = this._webNotif();
    return !!N && N.permission !== 'denied';
  },
  // Has the player (and the phone) said yes?
  notifyAllowed() {
    if (this._localNotif()) return this._nativePerm === 'granted';
    const N = this._webNotif();
    return !!N && N.permission === 'granted';
  },
  _nativePerm: 'prompt',
  _initNotify() {
    const LN = this._localNotif();
    if (LN) {
      try {
        LN.checkPermissions().then((p) => { this._nativePerm = p.display; }).catch(() => {});
        LN.addListener('localNotificationActionPerformed', (a) => {
          const extra = a && a.notification && a.notification.extra;
          if (typeof Notify !== 'undefined') Notify.tapped(extra);
        });
      } catch (e) { /* optional */ }
    }
    // Web: a tap on a service-worker notification comes back as a message, or a ?notify= address.
    try {
      if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.notifyTap && typeof Notify !== 'undefined') Notify.tapped(e.data.notifyTap);
      });
      const q = new URLSearchParams(location.search), k = q.get('notify');
      if (k && typeof Notify !== 'undefined') Notify.pendingRoute = { kind: k, slot: +q.get('slot') || null };
    } catch (e) { /* optional */ }
  },
  notifyRequest() {
    const LN = this._localNotif();
    if (LN) return LN.requestPermissions().then((p) => { this._nativePerm = p.display; return p.display === 'granted'; });
    const N = this._webNotif();
    if (!N) return Promise.resolve(false);
    try {
      const r = N.requestPermission();
      return (r && r.then ? r : Promise.resolve(N.permission)).then((p) => p === 'granted');
    } catch (e) { return Promise.resolve(false); }
  },
  // list: [{ id, at, title, body, extra }]
  notifySchedule(list) {
    if (!list || !list.length || !this.notifyAllowed()) return;
    const LN = this._localNotif();
    if (LN) {
      LN.schedule({ notifications: list.map((n) => ({ id: n.id, title: n.title, body: n.body, extra: n.extra,
        schedule: { at: new Date(n.at), allowWhileIdle: true } })) }).catch((e) => Log.add('error', 'notify: ' + e));
      return;
    }
    for (const n of list) {
      const wait = n.at - Date.now();
      if (wait > 2147483000) continue;                       // too far ahead for a browser timer
      clearTimeout(this._notifyTimers[n.id]);
      this._notifyTimers[n.id] = setTimeout(() => this._webShow(n), Math.max(0, wait));
    }
  },
  _webShow(n) {
    delete this._notifyTimers[n.id];
    const N = this._webNotif();
    if (!N || N.permission !== 'granted') return;
    const opts = { body: n.body, icon: 'assets/branding/pwa/icon-192.png', tag: 'cl-' + n.extra.kind, data: n.extra };
    const plain = () => {
      try {
        const x = new N(n.title, opts);
        x.onclick = () => { try { window.focus(); } catch (e) { /* ignore */ } x.close(); if (typeof Notify !== 'undefined') Notify.tapped(n.extra); };
      } catch (e) { /* phones' browsers only allow service-worker notifications */ }
    };
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then((reg) => (reg ? reg.showNotification(n.title, opts) : plain())).catch(plain);
    } else plain();
  },
  notifyCancel(ids) {
    const LN = this._localNotif();
    if (LN) { LN.cancel({ notifications: ids.map((id) => ({ id })) }).catch(() => {}); return; }
    for (const id of ids) { clearTimeout(this._notifyTimers[id]); delete this._notifyTimers[id]; }
  },

  // Plan 6.4: light on Good, stronger on Perfect, pulse on a wicket.
  haptic(kind) {
    if (!this.hapticsOn) return;
    const pattern = { light: 12, strong: 30, wicket: [40, 40, 40] }[kind];
    try { if (pattern && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* optional */ }
  },
};
