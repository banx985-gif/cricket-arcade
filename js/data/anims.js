// Cricket Legends (M16) - rendered cricket actions (written by tools/anims_sync.js: don't edit by hand).
// Frames: assets/anims/<action>/<action>_NN.png, drawn as sprite 'anim_<action>' with frame n.
// anchorX / anchorY = where the feet are (0..1 of the frame), heightM = frame height in metres,
// contact / release = the frame where bat meets ball / the ball leaves the hand.

const ANIM_DATA = {
  "bat_backlift": {
    "frames": 5,
    "files": [
      "assets/anims/bat_backlift/bat_backlift_00.webp",
      "assets/anims/bat_backlift/bat_backlift_01.webp",
      "assets/anims/bat_backlift/bat_backlift_02.webp",
      "assets/anims/bat_backlift/bat_backlift_03.webp",
      "assets/anims/bat_backlift/bat_backlift_04.webp"
    ],
    "anchorX": 0.3209,
    "anchorY": 0.9238,
    "heightM": 1.9591,
    "contact": null,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "bat_cover_drive": {
    "frames": 10,
    "files": [
      "assets/anims/bat_cover_drive/bat_cover_drive_00.webp",
      "assets/anims/bat_cover_drive/bat_cover_drive_01.webp",
      "assets/anims/bat_cover_drive/bat_cover_drive_02.webp",
      "assets/anims/bat_cover_drive/bat_cover_drive_03.webp",
      "assets/anims/bat_cover_drive/bat_cover_drive_04.webp",
      "assets/anims/bat_cover_drive/bat_cover_drive_05.webp",
      "assets/anims/bat_cover_drive/bat_cover_drive_06.webp",
      "assets/anims/bat_cover_drive/bat_cover_drive_07.webp",
      "assets/anims/bat_cover_drive/bat_cover_drive_08.webp",
      "assets/anims/bat_cover_drive/bat_cover_drive_09.webp"
    ],
    "anchorX": 0.1882,
    "anchorY": 0.8987,
    "heightM": 2.5392,
    "contact": 5,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "bat_cut": {
    "frames": 10,
    "files": [
      "assets/anims/bat_cut/bat_cut_00.webp",
      "assets/anims/bat_cut/bat_cut_01.webp",
      "assets/anims/bat_cut/bat_cut_02.webp",
      "assets/anims/bat_cut/bat_cut_03.webp",
      "assets/anims/bat_cut/bat_cut_04.webp",
      "assets/anims/bat_cut/bat_cut_05.webp",
      "assets/anims/bat_cut/bat_cut_06.webp",
      "assets/anims/bat_cut/bat_cut_07.webp",
      "assets/anims/bat_cut/bat_cut_08.webp",
      "assets/anims/bat_cut/bat_cut_09.webp"
    ],
    "anchorX": 0.1157,
    "anchorY": 0.935,
    "heightM": 2.2939,
    "contact": 5,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "bat_defence": {
    "frames": 7,
    "files": [
      "assets/anims/bat_defence/bat_defence_00.webp",
      "assets/anims/bat_defence/bat_defence_01.webp",
      "assets/anims/bat_defence/bat_defence_02.webp",
      "assets/anims/bat_defence/bat_defence_03.webp",
      "assets/anims/bat_defence/bat_defence_04.webp",
      "assets/anims/bat_defence/bat_defence_05.webp",
      "assets/anims/bat_defence/bat_defence_06.webp"
    ],
    "anchorX": 0.29,
    "anchorY": 0.8761,
    "heightM": 2.0988,
    "contact": 4,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "bat_lofted": {
    "frames": 10,
    "files": [
      "assets/anims/bat_lofted/bat_lofted_00.webp",
      "assets/anims/bat_lofted/bat_lofted_01.webp",
      "assets/anims/bat_lofted/bat_lofted_02.webp",
      "assets/anims/bat_lofted/bat_lofted_03.webp",
      "assets/anims/bat_lofted/bat_lofted_04.webp",
      "assets/anims/bat_lofted/bat_lofted_05.webp",
      "assets/anims/bat_lofted/bat_lofted_06.webp",
      "assets/anims/bat_lofted/bat_lofted_07.webp",
      "assets/anims/bat_lofted/bat_lofted_08.webp",
      "assets/anims/bat_lofted/bat_lofted_09.webp"
    ],
    "anchorX": 0.2211,
    "anchorY": 0.8889,
    "heightM": 2.3625,
    "contact": 5,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "bat_pull": {
    "frames": 10,
    "files": [
      "assets/anims/bat_pull/bat_pull_00.webp",
      "assets/anims/bat_pull/bat_pull_01.webp",
      "assets/anims/bat_pull/bat_pull_02.webp",
      "assets/anims/bat_pull/bat_pull_03.webp",
      "assets/anims/bat_pull/bat_pull_04.webp",
      "assets/anims/bat_pull/bat_pull_05.webp",
      "assets/anims/bat_pull/bat_pull_06.webp",
      "assets/anims/bat_pull/bat_pull_07.webp",
      "assets/anims/bat_pull/bat_pull_08.webp",
      "assets/anims/bat_pull/bat_pull_09.webp"
    ],
    "anchorX": 0.513,
    "anchorY": 0.934,
    "heightM": 2.2597,
    "contact": 5,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "bat_stance": {
    "frames": 6,
    "files": [
      "assets/anims/bat_stance/bat_stance_00.webp",
      "assets/anims/bat_stance/bat_stance_01.webp",
      "assets/anims/bat_stance/bat_stance_02.webp",
      "assets/anims/bat_stance/bat_stance_03.webp",
      "assets/anims/bat_stance/bat_stance_04.webp",
      "assets/anims/bat_stance/bat_stance_05.webp"
    ],
    "anchorX": 0.3684,
    "anchorY": 0.9273,
    "heightM": 1.9063,
    "contact": null,
    "release": null,
    "fps": 30,
    "loop": true,
    "cycleM": null
  },
  "bat_sweep": {
    "frames": 10,
    "files": [
      "assets/anims/bat_sweep/bat_sweep_00.webp",
      "assets/anims/bat_sweep/bat_sweep_01.webp",
      "assets/anims/bat_sweep/bat_sweep_02.webp",
      "assets/anims/bat_sweep/bat_sweep_03.webp",
      "assets/anims/bat_sweep/bat_sweep_04.webp",
      "assets/anims/bat_sweep/bat_sweep_05.webp",
      "assets/anims/bat_sweep/bat_sweep_06.webp",
      "assets/anims/bat_sweep/bat_sweep_07.webp",
      "assets/anims/bat_sweep/bat_sweep_08.webp",
      "assets/anims/bat_sweep/bat_sweep_09.webp"
    ],
    "anchorX": 0.468,
    "anchorY": 0.8823,
    "heightM": 2.0514,
    "contact": 5,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "bowl_fast": {
    "frames": 12,
    "files": [
      "assets/anims/bowl_fast/bowl_fast_00.webp",
      "assets/anims/bowl_fast/bowl_fast_01.webp",
      "assets/anims/bowl_fast/bowl_fast_02.webp",
      "assets/anims/bowl_fast/bowl_fast_03.webp",
      "assets/anims/bowl_fast/bowl_fast_04.webp",
      "assets/anims/bowl_fast/bowl_fast_05.webp",
      "assets/anims/bowl_fast/bowl_fast_06.webp",
      "assets/anims/bowl_fast/bowl_fast_07.webp",
      "assets/anims/bowl_fast/bowl_fast_08.webp",
      "assets/anims/bowl_fast/bowl_fast_09.webp",
      "assets/anims/bowl_fast/bowl_fast_10.webp",
      "assets/anims/bowl_fast/bowl_fast_11.webp"
    ],
    "anchorX": 0.4114,
    "anchorY": 0.9109,
    "heightM": 2.4414,
    "contact": null,
    "release": 6,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "bowl_run": {
    "frames": 8,
    "files": [
      "assets/anims/bowl_run/bowl_run_00.webp",
      "assets/anims/bowl_run/bowl_run_01.webp",
      "assets/anims/bowl_run/bowl_run_02.webp",
      "assets/anims/bowl_run/bowl_run_03.webp",
      "assets/anims/bowl_run/bowl_run_04.webp",
      "assets/anims/bowl_run/bowl_run_05.webp",
      "assets/anims/bowl_run/bowl_run_06.webp",
      "assets/anims/bowl_run/bowl_run_07.webp"
    ],
    "anchorX": 0.4414,
    "anchorY": 0.9974,
    "heightM": 2.0068,
    "contact": null,
    "release": null,
    "fps": 30,
    "loop": true,
    "cycleM": 3.6
  },
  "bowl_spin": {
    "frames": 11,
    "files": [
      "assets/anims/bowl_spin/bowl_spin_00.webp",
      "assets/anims/bowl_spin/bowl_spin_01.webp",
      "assets/anims/bowl_spin/bowl_spin_02.webp",
      "assets/anims/bowl_spin/bowl_spin_03.webp",
      "assets/anims/bowl_spin/bowl_spin_04.webp",
      "assets/anims/bowl_spin/bowl_spin_05.webp",
      "assets/anims/bowl_spin/bowl_spin_06.webp",
      "assets/anims/bowl_spin/bowl_spin_07.webp",
      "assets/anims/bowl_spin/bowl_spin_08.webp",
      "assets/anims/bowl_spin/bowl_spin_09.webp",
      "assets/anims/bowl_spin/bowl_spin_10.webp"
    ],
    "anchorX": 0.4145,
    "anchorY": 0.9302,
    "heightM": 2.2773,
    "contact": null,
    "release": 6,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "field_catch": {
    "frames": 8,
    "files": [
      "assets/anims/field_catch/field_catch_00.webp",
      "assets/anims/field_catch/field_catch_01.webp",
      "assets/anims/field_catch/field_catch_02.webp",
      "assets/anims/field_catch/field_catch_03.webp",
      "assets/anims/field_catch/field_catch_04.webp",
      "assets/anims/field_catch/field_catch_05.webp",
      "assets/anims/field_catch/field_catch_06.webp",
      "assets/anims/field_catch/field_catch_07.webp"
    ],
    "anchorX": 0.4788,
    "anchorY": 0.9976,
    "heightM": 2.1738,
    "contact": 4,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "field_catch_b": {
    "frames": 8,
    "files": [
      "assets/anims/field_catch_b/field_catch_b_00.webp",
      "assets/anims/field_catch_b/field_catch_b_01.webp",
      "assets/anims/field_catch_b/field_catch_b_02.webp",
      "assets/anims/field_catch_b/field_catch_b_03.webp",
      "assets/anims/field_catch_b/field_catch_b_04.webp",
      "assets/anims/field_catch_b/field_catch_b_05.webp",
      "assets/anims/field_catch_b/field_catch_b_06.webp",
      "assets/anims/field_catch_b/field_catch_b_07.webp"
    ],
    "anchorX": 0.5212,
    "anchorY": 0.9977,
    "heightM": 2.1973,
    "contact": 4,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "field_dive": {
    "frames": 7,
    "files": [
      "assets/anims/field_dive/field_dive_00.webp",
      "assets/anims/field_dive/field_dive_01.webp",
      "assets/anims/field_dive/field_dive_02.webp",
      "assets/anims/field_dive/field_dive_03.webp",
      "assets/anims/field_dive/field_dive_04.webp",
      "assets/anims/field_dive/field_dive_05.webp",
      "assets/anims/field_dive/field_dive_06.webp"
    ],
    "anchorX": 0.4106,
    "anchorY": 0.9865,
    "heightM": 1.8105,
    "contact": 4,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "field_dive_b": {
    "frames": 7,
    "files": [
      "assets/anims/field_dive_b/field_dive_b_00.webp",
      "assets/anims/field_dive_b/field_dive_b_01.webp",
      "assets/anims/field_dive_b/field_dive_b_02.webp",
      "assets/anims/field_dive_b/field_dive_b_03.webp",
      "assets/anims/field_dive_b/field_dive_b_04.webp",
      "assets/anims/field_dive_b/field_dive_b_05.webp",
      "assets/anims/field_dive_b/field_dive_b_06.webp"
    ],
    "anchorX": 0.5894,
    "anchorY": 0.9835,
    "heightM": 1.9125,
    "contact": 4,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "field_ready": {
    "frames": 1,
    "files": [
      "assets/anims/field_ready/field_ready_00.webp"
    ],
    "anchorX": 0.4875,
    "anchorY": 0.9971,
    "heightM": 1.793,
    "contact": null,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "field_ready_b": {
    "frames": 1,
    "files": [
      "assets/anims/field_ready_b/field_ready_b_00.webp"
    ],
    "anchorX": 0.5125,
    "anchorY": 0.9973,
    "heightM": 1.8838,
    "contact": null,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "field_run": {
    "frames": 8,
    "files": [
      "assets/anims/field_run/field_run_00.webp",
      "assets/anims/field_run/field_run_01.webp",
      "assets/anims/field_run/field_run_02.webp",
      "assets/anims/field_run/field_run_03.webp",
      "assets/anims/field_run/field_run_04.webp",
      "assets/anims/field_run/field_run_05.webp",
      "assets/anims/field_run/field_run_06.webp",
      "assets/anims/field_run/field_run_07.webp"
    ],
    "anchorX": 0.4655,
    "anchorY": 0.9973,
    "heightM": 1.916,
    "contact": null,
    "release": null,
    "fps": 30,
    "loop": true,
    "cycleM": 3.4
  },
  "field_run_b": {
    "frames": 8,
    "files": [
      "assets/anims/field_run_b/field_run_b_00.webp",
      "assets/anims/field_run_b/field_run_b_01.webp",
      "assets/anims/field_run_b/field_run_b_02.webp",
      "assets/anims/field_run_b/field_run_b_03.webp",
      "assets/anims/field_run_b/field_run_b_04.webp",
      "assets/anims/field_run_b/field_run_b_05.webp",
      "assets/anims/field_run_b/field_run_b_06.webp",
      "assets/anims/field_run_b/field_run_b_07.webp"
    ],
    "anchorX": 0.5345,
    "anchorY": 0.9974,
    "heightM": 1.9863,
    "contact": null,
    "release": null,
    "fps": 30,
    "loop": true,
    "cycleM": 3.4
  },
  "field_throw": {
    "frames": 7,
    "files": [
      "assets/anims/field_throw/field_throw_00.webp",
      "assets/anims/field_throw/field_throw_01.webp",
      "assets/anims/field_throw/field_throw_02.webp",
      "assets/anims/field_throw/field_throw_03.webp",
      "assets/anims/field_throw/field_throw_04.webp",
      "assets/anims/field_throw/field_throw_05.webp",
      "assets/anims/field_throw/field_throw_06.webp"
    ],
    "anchorX": 0.6308,
    "anchorY": 0.9582,
    "heightM": 2.1533,
    "contact": null,
    "release": 4,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "field_throw_b": {
    "frames": 7,
    "files": [
      "assets/anims/field_throw_b/field_throw_b_00.webp",
      "assets/anims/field_throw_b/field_throw_b_01.webp",
      "assets/anims/field_throw_b/field_throw_b_02.webp",
      "assets/anims/field_throw_b/field_throw_b_03.webp",
      "assets/anims/field_throw_b/field_throw_b_04.webp",
      "assets/anims/field_throw_b/field_throw_b_05.webp",
      "assets/anims/field_throw_b/field_throw_b_06.webp"
    ],
    "anchorX": 0.3692,
    "anchorY": 0.968,
    "heightM": 2.0859,
    "contact": null,
    "release": 4,
    "fps": 30,
    "loop": false,
    "cycleM": null
  },
  "keep_take": {
    "frames": 7,
    "files": [
      "assets/anims/keep_take/keep_take_00.webp",
      "assets/anims/keep_take/keep_take_01.webp",
      "assets/anims/keep_take/keep_take_02.webp",
      "assets/anims/keep_take/keep_take_03.webp",
      "assets/anims/keep_take/keep_take_04.webp",
      "assets/anims/keep_take/keep_take_05.webp",
      "assets/anims/keep_take/keep_take_06.webp"
    ],
    "anchorX": 0.4948,
    "anchorY": 0.9523,
    "heightM": 1.8896,
    "contact": 4,
    "release": null,
    "fps": 30,
    "loop": false,
    "cycleM": null
  }
};
