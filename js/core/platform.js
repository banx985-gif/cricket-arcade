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
  },

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

  // Plan 6.4: light on Good, stronger on Perfect, pulse on a wicket.
  haptic(kind) {
    if (!this.hapticsOn) return;
    const pattern = { light: 12, strong: 30, wicket: [40, 40, 40] }[kind];
    try { if (pattern && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* optional */ }
  },
};
