// Cricket Arcade — asset manifest (plan 35: manifest-driven loading).
// Every visible thing is drawn through a sprite id. If an id here has art, the
// art is used; if the file is missing or fails to load, the code-drawn
// placeholder keeps drawing — gameplay code never changes.
// Paths point at Cowork's filed art in game/assets/ (never renamed here).
//
// World sprites (drawn standing on the pitch):
//   anchorX/anchorY = which point of the image sits on the feet (0..1)
//   heightM         = how tall the whole image is in world metres
// UI sprites are drawn fitted into a box by the calling code.

const ASSET_MANIFEST = {
  groups: {
    'match-common': {
      // Characters — single poses for now; swing/run frames come from the 3D
      // pipeline later and can be added as 'batter:swing' etc.
      batter:        { src: 'assets/characters/player_batter_hero.png', anchorX: 0.5, anchorY: 0.995, heightM: 2.15 },
      bowler:        { src: 'assets/characters/player_bowler_hero.png', anchorX: 0.5, anchorY: 0.995, heightM: 2.0 },
      umpire_out:    { src: 'assets/characters/support/generic_umpire.png' },

      // HUD
      hud_aim_pad:   { src: 'assets/hud/direction_control_pad.png' },
      hud_reticle:   { src: 'assets/hud/bowling_target_reticle.png' },
      shot_control:  { src: 'assets/icons/batting/control_shot.png' },
      shot_power:    { src: 'assets/icons/batting/power_shot.png' },
      shot_defend:   { src: 'assets/icons/batting/defend.png' },

      // Bowling delivery slots (plan 6.2)
      bowl_stock:    { src: 'assets/icons/bowling/stock_fast.png' },
      bowl_yorker:   { src: 'assets/icons/bowling/yorker.png' },
      bowl_bouncer:  { src: 'assets/icons/bowling/bouncer.png' },
      bowl_slower:   { src: 'assets/icons/bowling/slower_ball.png' },

      // Outcome markers
      marker_six:     { src: 'assets/icons/markers/marker_six.png' },
      marker_four:    { src: 'assets/icons/markers/marker_four.png' },
      marker_wicket:  { src: 'assets/icons/markers/marker_wicket.png' },
      marker_wide:    { src: 'assets/icons/markers/marker_wide.png' },
      marker_no_ball: { src: 'assets/icons/markers/marker_no_ball.png' },
      marker_free_hit:{ src: 'assets/icons/markers/marker_free_hit.png' },

      // Challenge icons
      icon_six_smash:   { src: 'assets/icons/challenge/six_smash.png' },
      icon_wicket_rush: { src: 'assets/icons/challenge/wicket_rush.png' },
      icon_golden_ball: { src: 'assets/icons/challenge/golden_ball.png' },
      icon_golden_wicket: { src: 'assets/icons/challenge/golden_wicket.png' },

      // Match (M03)
      hud_scoreboard:   { src: 'assets/hud/scoreboard_hud.png' },
      hud_target:       { src: 'assets/hud/target_required_rate_hud.png' },
      icon_run:         { src: 'assets/icons/batting/run.png' },
      icon_cancel_run:  { src: 'assets/icons/batting/cancel_run.png' },
      icon_quick_match: { src: 'assets/icons/modes/quick_match_icon.png' },

      // Starting kit (shown on the mode card)
      kit_bat:     { src: 'assets/equipment/standard_cricket_bat.png' },
      kit_helmet:  { src: 'assets/equipment/standard_batting_helmet.png' },
      kit_gloves:  { src: 'assets/equipment/standard_batting_gloves.png' },
      kit_pads:    { src: 'assets/equipment/standard_batting_pads.png' },
    },
  },
};
