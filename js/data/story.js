// Cricket Legends (M17 Job 4) - story scenes: short talking scenes with a big portrait, a name,
// a speech box, tap to continue and SKIP. Text: story.* in the strings table. Logic: game/story.js.
// A line is [speaker, string key]. Speakers: a cast id below, 'rival' (the scene's rival) or
// 'coach' (your hired coach when you have one, otherwise Coach Line).
// Each scene is 2 to 5 lines and plays once per career.

const STORY_DATA = {
  minLines: 2, maxLines: 5,
  revealPerSecond: 70,          // letters per second (a tap shows the whole line at once)
  cast: {
    coach:    { art: 'coach_technique', nameKey: 'coach.technique' },   // (the default coach)
    manager:  { art: 'coach_mental', nameKey: 'story.cast.manager' },
    press:    { art: 'support_press', nameKey: 'story.cast.press' },
    teammate: { art: 'support_teammate', nameKey: 'story.cast.teammate' },
    captain:  { art: 'support_teammate_f', nameKey: 'story.cast.captain' },
    master:   { art: 'support_hidden_master', nameKey: 'story.cast.master' },
  },
  scenes: {
    // stage starts
    stage_local:         [['coach', 'story.stage_local.1'], ['captain', 'story.stage_local.2'], ['coach', 'story.stage_local.3']],
    stage_regional:      [['manager', 'story.stage_regional.1'], ['coach', 'story.stage_regional.2'], ['teammate', 'story.stage_regional.3']],
    stage_domestic:      [['press', 'story.stage_domestic.1'], ['manager', 'story.stage_domestic.2'], ['coach', 'story.stage_domestic.3']],
    stage_franchise:     [['press', 'story.stage_franchise.1'], ['manager', 'story.stage_franchise.2'], ['teammate', 'story.stage_franchise.3'], ['coach', 'story.stage_franchise.4']],
    stage_national:      [['manager', 'story.stage_national.1'], ['coach', 'story.stage_national.2'], ['captain', 'story.stage_national.3']],
    stage_international: [['press', 'story.stage_international.1'], ['captain', 'story.stage_international.2'], ['coach', 'story.stage_international.3']],
    stage_world:         [['press', 'story.stage_world.1'], ['manager', 'story.stage_world.2'], ['captain', 'story.stage_world.3'], ['coach', 'story.stage_world.4']],
    stage_elite:         [['master', 'story.stage_elite.1'], ['coach', 'story.stage_elite.2'], ['master', 'story.stage_elite.3']],
    // a rival's first appearance (before the build-up choice): story.rival.<id>.1..3
    rival:               [['rival', 'story.rival.{id}.1'], ['coach', 'story.rival.{id}.2'], ['rival', 'story.rival.{id}.3']],
    // promoted (any stage) and retirement
    promoted:            [['manager', 'story.promoted.1'], ['press', 'story.promoted.2'], ['coach', 'story.promoted.3']],
    retire:              [['coach', 'story.retire.1'], ['manager', 'story.retire.2'], ['press', 'story.retire.3'], ['master', 'story.retire.4']],
  },
};
