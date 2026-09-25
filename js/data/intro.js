// Cricket Arcade — the free intro and the Full Game Unlock (M13, plan "Monetisation",
// 43A.11). Everything the free intro includes is listed here, so it's easy to tune.
// Rules: game/fullgame.js. Is the game unlocked? Only Platform.isFullGame() knows.
//
// One purchase, "Full Game Unlock", opens everything. Nothing else is ever sold:
// no premium currency, loot boxes, stat power, battle pass, energy timers or ads.
// With CONFIG.MONETISATION = 'paid_download' there are no locks at all.

const INTRO_DATA = {
  // Career: Stages 1 and 2 (Local, Regional) in full — tree, shop, locker, first coaches.
  careerMaxStage: 2,
  // Quick Match: 5 overs at the Local Oval.
  quickFormats: ['quick5'],
  quickGrounds: ['local_oval'],
  // Six Smash and Wicket Rush: the first ruleset of each.
  rulesets: ['classic20', 'wicketRush18'],
  // Missions: the Local set (the first, Rookie missions of Batting and Bowling).
  missions: ['bat01', 'bat02', 'bat03', 'bowl01', 'bowl02', 'bowl03'],
  // My XI needs the Full Game (and a retirement).
  myxi: false,
  // What the Full Game screen lists.
  perks: ['career', 'legacy', 'myxi', 'challenges', 'missions', 'quick'],
  // The one product (Play Console / App Store id).
  productId: 'full_game_unlock',
  // Shown by the pretend test store (the real store always supplies the price).
  testPrice: 'TEST PRICE',
};
