// Cricket Arcade — platform adapter (plan 43A.1 / 43A.6).
// The only place that touches device/browser lifecycle and haptics. Game code
// calls Platform.*, never navigator.* directly, so a phone wrapper can swap
// these out later.

const Platform = {
  _pauseHandlers: [],
  _resumeHandlers: [],
  hapticsOn: true,

  init() {
    const onHide = () => { for (const fn of this._pauseHandlers) fn(); };
    const onShow = () => { for (const fn of this._resumeHandlers) fn(); };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onHide(); else onShow();
    });
    window.addEventListener('pagehide', onHide);
    window.addEventListener('blur', onHide);
  },

  // Called when the app goes to the background (block input, pause, mute).
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
