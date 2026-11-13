// Cricket Legends — notification tuning (Rule B, 13 Nov). Logic: game/notify.js.
// Only things worth coming back for. All text is in strings.js (notify.*).

const NOTIFY_DATA = {
  // The four kinds, each with its own on/off switch in Settings > ALERTS.
  kinds: ['reward', 'missions', 'rival', 'career'],
  // When more want to go out than the daily cap allows, this order wins.
  priority: ['rival', 'reward', 'career', 'missions'],
  // How long after the player leaves the game each kind is sent (hours).
  delayHours: { reward: 3, missions: 26, rival: 20, career: 23 },
  maxPerDay: 3,                    // never more than this on one calendar day
  quiet: { from: 22, to: 8 },      // no notifications 10 pm - 8 am (moved to 8 am)
  spacingMin: 90,                  // at least this many minutes between two of them
  horizonDays: 3,                  // nothing is planned further ahead than this
  variants: 3,                     // notify.<kind>.title.1..N / notify.<kind>.body.1..N
  // Settings keys (saved with the game in save.settings).
  mainKey: 'notifyOn',
  keys: { reward: 'notifyReward', missions: 'notifyMissions', rival: 'notifyRival', career: 'notifyCareer' },
  // Screens that are calm enough to show the "can we nudge you?" question on.
  askOn: ['title', 'careerhome', 'myxihome', 'missions', 'challenges', 'quickmatch'],
  // Native ids (whole numbers): base + kind index * 10 + n.
  idBase: 7100,
};
