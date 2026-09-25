// Cricket Arcade — the Full Game Unlock entitlement (plan 43A.11). Called ONLY
// through Platform (Platform.isFullGame / buyFullGame / restoreFullGame / fullGamePrice):
// no gameplay file ever talks to a store.
//
//   purchase             buy the one non-consumable product (INTRO_DATA.productId)
//   restore              ask the store what this account owns (reinstall, new phone)
//   cached offline unlock  a successful unlock is kept in storage ('entitlement'),
//                        so the game stays unlocked with no connection
//   no save data lost    the unlock never touches the save (a full reset doesn't
//                        remove it either — a purchase belongs to the player)
//
// Stores:
//   test   browser and debug builds (GitHub Pages, a test APK): a pretend store so the whole
//          flow can be tried on a phone. It "remembers" a test purchase.
//   play   the Android app, release build: Google Play Billing via the purchase plugin
//          (cordova-plugin-purchase, window.CdvPurchase), when present.
// CONFIG.MONETISATION = 'paid_download': always unlocked, no store at all.

const Entitlement = {
  KEY: 'entitlement',
  TEST_KEY: 'teststore',
  state: { full: false, source: null, at: null },
  store: null,               // the adapter in use
  ready: false,
  lastError: null,

  paid() { return typeof CONFIG !== 'undefined' && CONFIG.MONETISATION === 'paid_download'; },
  isFull() { return this.paid() || !!this.state.full; },

  // o: { grandfather } — the save was made before the free intro existed (test store only).
  async init(o) {
    const opts = o || {};
    try { const raw = await Store.get(this.KEY); if (raw) this.state = Object.assign({ full: false }, JSON.parse(raw)); } catch (e) { /* no cache yet */ }
    if (this.paid()) { this.ready = true; return this.state; }
    await this._deviceReady();                       // (the app: the store plugin arrives with 'deviceready')
    // Debug builds (the dev panel is on) always use the pretend store, even in the app,
    // so a hand-installed test APK can try the whole flow. Release builds use the real store.
    this.store = (!CONFIG.DEBUG_BUILD && this._native()) || TestStore;
    await this.store.init().catch((e) => { this.lastError = String(e); });
    // Aaron's own phone keeps everything: a save from before the free intro counts as unlocked (test store only).
    if (this.store === TestStore && opts.grandfather && !this.state.source) await this._grant('existing save');
    this.ready = true;
    this.refresh();                                   // in the background: never blocks start-up
    return this.state;
  },
  _deviceReady() {
    if (typeof window === 'undefined' || !window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform() || window.CdvPurchase) return Promise.resolve();
    return new Promise((done) => { document.addEventListener('deviceready', () => done(), { once: true }); setTimeout(done, 4000); });
  },
  _native() {
    if (typeof window === 'undefined' || !window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) return null;
    return window.CdvPurchase ? PlayStore : null;
  },
  async _save() { try { await Store.set(this.KEY, JSON.stringify(this.state)); } catch (e) { this.lastError = String(e); } },
  async _grant(source) {
    this.state = { full: true, source, at: new Date().toISOString() };
    await this._save();
    return true;
  },

  // Ask the store again (quietly). A verified "not owned" (e.g. a refund) relocks;
  // no connection keeps the cached unlock.
  async refresh() {
    if (this.paid() || !this.store) return;
    try {
      const owned = await this.store.owned();
      if (owned === true && !this.state.full) await this._grant('store');
      if (owned === false && this.state.full && this.state.source === 'store' && this.store.verified) { this.state = { full: false, source: 'store-refunded', at: new Date().toISOString() }; await this._save(); }
    } catch (e) { this.lastError = String(e); }
  },
  price() { return this.paid() ? null : (this.store && this.store.price()) || null; },
  // Returns { ok, cancelled?, error? }
  async buy() {
    if (this.isFull()) return { ok: true, already: true };
    try {
      const r = await this.store.buy();
      if (r.ok) await this._grant(this.store.id);
      return r;
    } catch (e) { this.lastError = String(e); return { ok: false, error: String(e) }; }
  },
  // Returns { ok, found }
  async restore() {
    try {
      const found = await this.store.restore();
      if (found) await this._grant(this.store.id + '-restore');
      return { ok: true, found: !!found };
    } catch (e) { this.lastError = String(e); return { ok: false, found: false, error: String(e) }; }
  },
  // Test builds only: forget the local unlock (the test store still remembers the purchase).
  async relockTest() { this.state = { full: false, source: 'relocked', at: new Date().toISOString() }; await this._save(); },
};

// ---- the pretend store (browser / dev / GitHub Pages) ----
const TestStore = {
  id: 'test', verified: true, _owned: false,
  async init() { try { const raw = await Store.get(Entitlement.TEST_KEY); this._owned = !!(raw && JSON.parse(raw).owned); } catch (e) { this._owned = false; } },
  price() { return INTRO_DATA.testPrice; },
  async owned() { return null; },                    // the test store never relocks by itself
  async buy() { this._owned = true; await Store.set(Entitlement.TEST_KEY, JSON.stringify({ owned: true, at: new Date().toISOString() })); return { ok: true }; },
  async restore() { return this._owned; },
};

// ---- Google Play Billing (the Android app), via cordova-plugin-purchase ----
const PlayStore = {
  id: 'play', verified: false, _price: null, _pending: null,
  _p() { return window.CdvPurchase; },
  _product() { return this._p().store.get(INTRO_DATA.productId, this._p().Platform.GOOGLE_PLAY); },
  async init() {
    const C = this._p(), store = C.store;
    store.register([{ id: INTRO_DATA.productId, type: C.ProductType.NON_CONSUMABLE, platform: C.Platform.GOOGLE_PLAY }]);
    store.when()
      .approved((t) => t.verify())
      .verified((r) => r.finish())
      .finished(() => { if (this._pending) { this._pending({ ok: true }); this._pending = null; } })
      .productUpdated(() => { const p = this._product(); if (p && p.pricing) this._price = p.pricing.price; });
    store.error((e) => { if (this._pending) { this._pending({ ok: false, error: e && e.message }); this._pending = null; } });
    await store.initialize([C.Platform.GOOGLE_PLAY]);
    this.verified = true;
  },
  price() { const p = this._product(); return (p && p.pricing && p.pricing.price) || this._price; },
  async owned() { const p = this._product(); return p ? !!p.owned : null; },
  buy() {
    const p = this._product(), offer = p && p.getOffer();
    if (!offer) return Promise.resolve({ ok: false, error: 'not available' });
    return new Promise((resolve) => {
      this._pending = resolve;
      offer.order().then((err) => { if (err) { this._pending = null; resolve({ ok: false, cancelled: err.code === this._p().ErrorCode.PAYMENT_CANCELLED, error: err.message }); } });
    });
  },
  async restore() { await this._p().store.restorePurchases(); const p = this._product(); return !!(p && p.owned); },
};
