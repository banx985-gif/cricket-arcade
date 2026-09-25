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
      bowl_swing:    { src: 'assets/icons/bowling/swing_seam.png' },
      bowl_inswing:  { src: 'assets/icons/bowling/inswing.png' },
      bowl_outswing: { src: 'assets/icons/bowling/outswing.png' },
      bowl_cutter:   { src: 'assets/icons/bowling/cutter.png' },
      bowl_spin:     { src: 'assets/icons/bowling/spin.png' },
      bowl_googly:   { src: 'assets/icons/bowling/googly.png' },
      bowl_top_spinner: { src: 'assets/icons/bowling/top_spinner.png' },
      bowl_arm_ball: { src: 'assets/icons/bowling/arm_ball.png' },

      // Outcome markers
      marker_six:     { src: 'assets/icons/markers/marker_six.png' },
      marker_four:    { src: 'assets/icons/markers/marker_four.png' },
      marker_wicket:  { src: 'assets/icons/markers/marker_wicket.png' },
      marker_wide:    { src: 'assets/icons/markers/marker_wide.png' },
      marker_no_ball: { src: 'assets/icons/markers/marker_no_ball.png' },
      marker_free_hit:{ src: 'assets/icons/markers/marker_free_hit.png' },
      marker_lbw:     { src: 'assets/icons/markers/marker_lbw.png' },
      marker_hit_wicket: { src: 'assets/icons/markers/marker_hit_wicket.png' },
      marker_run_out: { src: 'assets/icons/markers/marker_run_out.png' },
      marker_overthrow: { src: 'assets/icons/markers/marker_overthrow.png' },
      marker_super_over: { src: 'assets/icons/markers/marker_super_over.png' },
      marker_hat_trick: { src: 'assets/icons/markers/marker_hat_trick.png' },

      // Field settings (M04b)
      field_balanced:    { src: 'assets/icons/field/field_balanced.png' },
      field_attacking:   { src: 'assets/icons/field/field_attacking.png' },
      field_defensive:   { src: 'assets/icons/field/field_defensive.png' },
      field_spin_trap:   { src: 'assets/icons/field/field_spin_trap.png' },
      field_yorker_death:{ src: 'assets/icons/field/field_yorker_death.png' },
      field_bouncer_trap:{ src: 'assets/icons/field/field_bouncer_trap.png' },
      field_off_side_ring: { src: 'assets/icons/field/field_off_side_ring.png' },
      field_leg_side_ring: { src: 'assets/icons/field/field_leg_side_ring.png' },
      field_powerplay_squeeze: { src: 'assets/icons/field/field_powerplay_squeeze.png' },
      field_auto:        { src: 'assets/icons/field/field_auto.png' },
      field_locked:      { src: 'assets/icons/field/field_locked.png' },
      field_settings_button: { src: 'assets/icons/field/field_settings_button.png' },

      // Stadium layers (M04b B5) — see js/data/stadium.js
      sky_clear:    { src: 'assets/match/sky/sky_clear.png' },
      sky_overcast: { src: 'assets/match/sky/sky_overcast.png' },
      sky_windy:    { src: 'assets/match/sky/sky_windy.png' },
      sky_hot:      { src: 'assets/match/sky/sky_hot.png' },
      sky_dusk:     { src: 'assets/match/sky/sky_dusk.png' },
      sky_night:    { src: 'assets/match/sky/sky_night.png' },
      stands_local_oval: { src: 'assets/stadiums/local_oval/local_oval_stands.png' },
      boards_local_oval: { src: 'assets/stadiums/local_oval/local_oval_boards.png' },
      outfield_grass_tile: { src: 'assets/match/pitch/outfield_grass_tile.png' },
      pitch_balanced: { src: 'assets/match/pitch/pitch_balanced.png' },
      pitch_green:    { src: 'assets/match/pitch/pitch_green.png' },
      pitch_dry:      { src: 'assets/match/pitch/pitch_dry.png' },
      pitch_hard:     { src: 'assets/match/pitch/pitch_hard.png' },
      pitch_worn:     { src: 'assets/match/pitch/pitch_worn.png' },
      sightscreen:      { src: 'assets/match/props/sightscreen.png', anchorX: 0.5, anchorY: 0.87 },
      floodlight_tower: { src: 'assets/match/props/floodlight_tower.png', anchorX: 0.5, anchorY: 0.98 },
      dugout_bench:     { src: 'assets/match/props/dugout_bench.png', anchorX: 0.5, anchorY: 0.95 },
      stumps_closeup:   { src: 'assets/match/props/stumps_closeup.png' },
      crowd_a_sit:   { src: 'assets/match/crowd/crowd_a_sit.png', anchorX: 0.5, anchorY: 0.97 },
      crowd_a_cheer: { src: 'assets/match/crowd/crowd_a_cheer.png', anchorX: 0.5, anchorY: 0.97 },
      crowd_a_jump:  { src: 'assets/match/crowd/crowd_a_jump.png', anchorX: 0.5, anchorY: 0.97 },
      crowd_b_sit:   { src: 'assets/match/crowd/crowd_b_sit.png', anchorX: 0.5, anchorY: 0.97 },
      crowd_b_cheer: { src: 'assets/match/crowd/crowd_b_cheer.png', anchorX: 0.5, anchorY: 0.97 },
      crowd_b_jump:  { src: 'assets/match/crowd/crowd_b_jump.png', anchorX: 0.5, anchorY: 0.97 },
      crowd_c_sit:   { src: 'assets/match/crowd/crowd_c_sit.png', anchorX: 0.5, anchorY: 0.97 },
      crowd_c_cheer: { src: 'assets/match/crowd/crowd_c_cheer.png', anchorX: 0.5, anchorY: 0.97 },
      crowd_c_jump:  { src: 'assets/match/crowd/crowd_c_jump.png', anchorX: 0.5, anchorY: 0.97 },
      crowd_flag_01: { src: 'assets/match/crowd/crowd_flag_01.png', anchorX: 0.12, anchorY: 0.94 },
      crowd_flag_02: { src: 'assets/match/crowd/crowd_flag_02.png', anchorX: 0.12, anchorY: 0.94 },
      crowd_flag_03: { src: 'assets/match/crowd/crowd_flag_03.png', anchorX: 0.12, anchorY: 0.94 },
      crowd_banner_02: { src: 'assets/environment/props/crowd_banner_02.png', anchorX: 0.5, anchorY: 0.95 },
      crowd_banner_03: { src: 'assets/environment/props/crowd_banner_03.png', anchorX: 0.5, anchorY: 0.95 },

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
      icon_settings:    { src: 'assets/icons/modes/settings_icon.png' },

      // Starting kit (shown on the mode card)
      kit_bat:     { src: 'assets/equipment/standard_cricket_bat.png' },
      kit_helmet:  { src: 'assets/equipment/standard_batting_helmet.png' },
      kit_gloves:  { src: 'assets/equipment/standard_batting_gloves.png' },
      kit_pads:    { src: 'assets/equipment/standard_batting_pads.png' },
    },
  },
};
