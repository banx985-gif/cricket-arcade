// Cricket Arcade — what the free intro includes (M13). Data: INTRO_DATA.
// The only question asked of the platform is Platform.isFullGame(); everything
// else here is the game's own rules. A locked thing opens the friendly Full Game
// screen (scenes/fullgame.js) — never during a match, never on a timer.
//
//   kind: 'stage' (career stage number) | 'ruleset' | 'mission' | 'quickFormat' |
//         'ground' | 'myxi' | 'legacy'

const FullGame = {
  full() { return typeof Platform === 'undefined' || Platform.isFullGame(); },
  locked(kind, id) {
    if (this.full()) return false;
    const I = INTRO_DATA;
    switch (kind) {
      case 'stage': return id > I.careerMaxStage;
      case 'ruleset': return !I.rulesets.includes(id);
      case 'mission': return !I.missions.includes(id);
      case 'quickFormat': return !I.quickFormats.includes(id);
      case 'ground': return !I.quickGrounds.includes(id);
      case 'myxi': return !I.myxi;
      case 'legacy': return true;
    }
    return false;
  },
  // Blocked? Then show the Full Game screen (NOT NOW goes back to 'back') and return true.
  guard(kind, id, back) {
    if (!this.locked(kind, id)) return false;
    if (typeof Scenes !== 'undefined') Scenes.go('fullgame', { reason: kind, back: back || { scene: 'title' } });
    return true;
  },
  // The number of the stage a promoted career starts next.
  nextStageN(c) {
    const S = Career.stage(c), nx = CAREER_DATA.stages.find((x) => x.id === S.next);
    return nx ? nx.n : S.n;
  },
  // The one gentle prompt (plan: at most one, when the intro's end is reached):
  // a career promoted out of the last free stage. True once per account.
  introEnd(save, c) {
    if (this.full() || !c || this.nextStageN(c) <= INTRO_DATA.careerMaxStage || save.fullGamePrompted) return false;
    save.fullGamePrompted = new Date().toISOString().slice(0, 10);
    return true;
  },
};
