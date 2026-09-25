// Cricket Arcade — achievements (M09, docs/ACHIEVEMENTS_v1.md). Rules in game/achievements.js.
// Text: ach.<id> (name) and ach.<id>.desc. Medal art: badges/medals/.
//
// cond: { on, stat, min } — earned when that stat reaches min:
//   on 'match'    one match you just played (you = the career player; in Quick
//                 Match, your whole side). stat names a MatchFacts value.
//   on 'life'     a lifetime counter in the global save (every mode, every career)
//   on 'career'   the career you're playing (CareerFacts)
//   on 'account'  the whole account (AccountFacts)
// reward: { coins } | { st } (Skill Tokens: to the career you're playing, or
//   banked for the next one) | { lm } (Legacy Marks) | { mc } (Mythic Core) | { item }
// hidden: shows as ??? until earned.
// requires: a mode or system that isn't built yet — stays hidden and doesn't
//   count until it exists (see ACHIEVEMENT_DATA.features).

const ACHIEVEMENT_DATA = {
  version: 1,
  tiers: { bronze: 'medal_bronze', silver: 'medal_silver', gold: 'medal_gold', diamond: 'medal_diamond' },
  cats: ['batting', 'bowling', 'fielding', 'career', 'rivals', 'progress', 'myxi', 'challenges', 'secrets'],
  // Systems that exist now. An achievement whose 'requires' isn't here waits.
  features: [],
  list: [
    // ---- Batting ----
    { id: 'first_blood',       cat: 'batting', tier: 'bronze',  cond: { on: 'match', stat: 'sixes', min: 1 }, reward: { coins: 100 } },
    { id: 'half_century',      cat: 'batting', tier: 'bronze',  cond: { on: 'match', stat: 'runs', min: 50 }, reward: { coins: 200 } },
    { id: 'ton_up',            cat: 'batting', tier: 'silver',  cond: { on: 'match', stat: 'runs', min: 100 }, reward: { st: 1 } },
    { id: 'six_machine',       cat: 'batting', tier: 'silver',  cond: { on: 'match', stat: 'sixes', min: 6 }, reward: { st: 1 } },
    { id: 'six_sixes',         cat: 'batting', tier: 'diamond', cond: { on: 'match', stat: 'sixesInOver', min: 6 }, reward: { mc: 1 } },
    { id: 'perfect_timing',    cat: 'batting', tier: 'silver',  cond: { on: 'match', stat: 'perfect', min: 10 }, reward: { coins: 300 } },
    { id: 'finisher',          cat: 'batting', tier: 'gold',    cond: { on: 'match', stat: 'finalOverWinner', min: 1 }, reward: { st: 1 } },
    { id: 'monster_hit',       cat: 'batting', tier: 'silver',  cond: { on: 'match', stat: 'longestSix', min: 110 }, reward: { coins: 300 }, requires: 'hitDistance' },
    { id: 'fifty_sixes',       cat: 'batting', tier: 'bronze',  cond: { on: 'life', stat: 'sixes', min: 50 }, reward: { coins: 300 } },
    { id: 'two_hundred_sixes', cat: 'batting', tier: 'silver',  cond: { on: 'life', stat: 'sixes', min: 200 }, reward: { st: 1 } },
    { id: 'thousand_club',     cat: 'batting', tier: 'diamond', cond: { on: 'life', stat: 'sixes', min: 1000 }, reward: { mc: 1 } },
    { id: 'run_machine',       cat: 'batting', tier: 'gold',    cond: { on: 'life', stat: 'runs', min: 5000 }, reward: { lm: 1 } },
    { id: 'anchor_man',        cat: 'batting', tier: 'silver',  cond: { on: 'match', stat: 'carriedBat', min: 1 }, reward: { st: 1 } },
    { id: 'boundary_blitz',    cat: 'batting', tier: 'silver',  cond: { on: 'match', stat: 'boundaryStreak', min: 5 }, reward: { coins: 300 } },
    { id: 'free_hit_punisher', cat: 'batting', tier: 'bronze',  cond: { on: 'match', stat: 'freeHitSixes', min: 1 }, reward: { coins: 150 } },
    { id: 'spin_killer',       cat: 'batting', tier: 'silver',  cond: { on: 'match', stat: 'spinSixes', min: 3 }, reward: { coins: 200 } },
    // ---- Bowling ----
    { id: 'first_scalp',       cat: 'bowling', tier: 'bronze',  cond: { on: 'match', stat: 'wickets', min: 1 }, reward: { coins: 100 } },
    { id: 'timber',            cat: 'bowling', tier: 'bronze',  cond: { on: 'match', stat: 'bowled', min: 1 }, reward: { coins: 100 } },
    { id: 'plumb',             cat: 'bowling', tier: 'bronze',  cond: { on: 'match', stat: 'lbw', min: 1 }, reward: { coins: 150 } },
    { id: 'hat_trick',         cat: 'bowling', tier: 'gold',    cond: { on: 'match', stat: 'hatTricks', min: 1 }, reward: { st: 1 } },
    { id: 'five_for',          cat: 'bowling', tier: 'gold',    cond: { on: 'match', stat: 'wickets', min: 5 }, reward: { st: 1 } },
    { id: 'maiden_voyage',     cat: 'bowling', tier: 'silver',  cond: { on: 'match', stat: 'maidens', min: 1 }, reward: { coins: 200 } },
    { id: 'turn_it_square',    cat: 'bowling', tier: 'silver',  cond: { on: 'match', stat: 'googlyWickets', min: 1 }, reward: { coins: 200 } },
    { id: 'dot_wall',          cat: 'bowling', tier: 'silver',  cond: { on: 'match', stat: 'dots', min: 12 }, reward: { coins: 200 } },
    { id: 'hundred_scalps',    cat: 'bowling', tier: 'silver',  cond: { on: 'life', stat: 'wickets', min: 100 }, reward: { st: 1 } },
    { id: 'five_hundred_scalps', cat: 'bowling', tier: 'diamond', cond: { on: 'life', stat: 'wickets', min: 500 }, reward: { mc: 1 } },
    { id: 'bails_flying',      cat: 'bowling', tier: 'silver',  cond: { on: 'life', stat: 'bowled', min: 25 }, reward: { coins: 300 } },
    { id: 'death_over_hero',   cat: 'bowling', tier: 'gold',    cond: { on: 'match', stat: 'deathDefend', min: 1 }, reward: { st: 1 } },
    { id: 'swing_king',        cat: 'bowling', tier: 'silver',  cond: { on: 'life', stat: 'swingKing', min: 3 }, reward: { st: 1 } },
    { id: 'full_toolkit',      cat: 'bowling', tier: 'gold',    cond: { on: 'life', stat: 'fullToolkit', min: 1 }, reward: { st: 1 } },
    { id: 'wicket_maiden',     cat: 'bowling', tier: 'gold',    cond: { on: 'match', stat: 'wicketMaidens', min: 1 }, reward: { st: 1 } },
    { id: 'clean_hands',       cat: 'bowling', tier: 'bronze',  cond: { on: 'match', stat: 'cleanSpell', min: 1 }, reward: { coins: 200 } },
    // ---- Fielding and matches ----
    { id: 'direct_hit',        cat: 'fielding', tier: 'silver', cond: { on: 'match', stat: 'directHits', min: 1 }, reward: { coins: 200 } },
    { id: 'safe_hands',        cat: 'fielding', tier: 'silver', cond: { on: 'match', stat: 'catches', min: 3 }, reward: { coins: 200 } },
    { id: 'super_over_hero',   cat: 'fielding', tier: 'gold',   cond: { on: 'match', stat: 'superOverWin', min: 1 }, reward: { st: 1 } },
    { id: 'last_ball_thriller', cat: 'fielding', tier: 'gold',  cond: { on: 'match', stat: 'lastBallWin', min: 1 }, reward: { st: 1 } },
    { id: 'rocket_arm',        cat: 'fielding', tier: 'silver', cond: { on: 'life', stat: 'runouts', min: 10 }, reward: { st: 1 } },
    { id: 'hundred_catches',   cat: 'fielding', tier: 'gold',   cond: { on: 'life', stat: 'catches', min: 100 }, reward: { lm: 1 } },
    { id: 'diving_stop',       cat: 'fielding', tier: 'bronze', cond: { on: 'match', stat: 'divingStops', min: 1 }, reward: { coins: 150 }, requires: 'fieldingDetail' },
    { id: 'overthrow_thief',   cat: 'fielding', tier: 'bronze', cond: { on: 'match', stat: 'overthrowRuns', min: 1 }, reward: { coins: 100 }, requires: 'fieldingDetail' },
    { id: 'first_win',         cat: 'fielding', tier: 'bronze', cond: { on: 'account', stat: 'quickWins', min: 1 }, reward: { coins: 100 } },
    { id: 'ten_wins',          cat: 'fielding', tier: 'silver', cond: { on: 'account', stat: 'quickWins', min: 10 }, reward: { coins: 300 } },
    { id: 'fifty_wins',        cat: 'fielding', tier: 'gold',   cond: { on: 'account', stat: 'quickWins', min: 50 }, reward: { st: 1 } },
    { id: 'hammering',         cat: 'fielding', tier: 'silver', cond: { on: 'match', stat: 'bigWin', min: 1 }, reward: { coins: 300 } },
    { id: 'every_format',      cat: 'fielding', tier: 'silver', cond: { on: 'account', stat: 'formatsWon', min: 3 }, reward: { st: 1 }, requires: 'formats' },
    { id: 'legend_victory',    cat: 'fielding', tier: 'gold',   cond: { on: 'match', stat: 'legendWin', min: 1 }, reward: { lm: 1 }, requires: 'legend' },
    // ---- Career ----
    { id: 'signed_up',         cat: 'career', tier: 'bronze',  cond: { on: 'career', stat: 'clubSigned', min: 1 }, reward: { coins: 100 } },
    { id: 'moving_up',         cat: 'career', tier: 'bronze',  cond: { on: 'career', stat: 'stageN', min: 2 }, reward: { coins: 200 } },
    { id: 'big_time',          cat: 'career', tier: 'silver',  cond: { on: 'career', stat: 'stageN', min: 3 }, reward: { st: 1 } },
    { id: 'franchise_player',  cat: 'career', tier: 'silver',  cond: { on: 'career', stat: 'franchiseSigned', min: 1 }, reward: { st: 1 } },
    { id: 'called_up',         cat: 'career', tier: 'gold',    cond: { on: 'career', stat: 'nationalSelected', min: 1 }, reward: { lm: 1 } },
    { id: 'skipper',           cat: 'career', tier: 'gold',    cond: { on: 'career', stat: 'captain', min: 1 }, reward: { lm: 1 } },
    { id: 'world_champion',    cat: 'career', tier: 'diamond', cond: { on: 'career', stat: 'worldChampion', min: 1 }, reward: { mc: 1 } },
    { id: 'legend_retires',    cat: 'career', tier: 'gold',    cond: { on: 'account', stat: 'retired', min: 1 }, reward: { lm: 1 } },
    { id: 'batters_road',      cat: 'career', tier: 'gold',    cond: { on: 'account', stat: 'retiredBatter', min: 1 }, reward: { lm: 1 } },
    { id: 'bowlers_road',      cat: 'career', tier: 'gold',    cond: { on: 'account', stat: 'retiredBowler', min: 1 }, reward: { lm: 1 } },
    { id: 'all_round_road',    cat: 'career', tier: 'gold',    cond: { on: 'account', stat: 'retiredAllrounder', min: 1 }, reward: { lm: 1 } },
    { id: 'trilogy',           cat: 'career', tier: 'diamond', cond: { on: 'account', stat: 'retiredRoles', min: 3 }, reward: { mc: 1 } },
    { id: 'world_tour',        cat: 'career', tier: 'gold',    cond: { on: 'account', stat: 'retiredOrigins', min: 4 }, reward: { lm: 1 } },
    { id: 'every_flag',        cat: 'career', tier: 'diamond', cond: { on: 'account', stat: 'retiredOrigins', min: 12 }, reward: { mc: 1, item: 'uniform_national_world_stage' } },
    { id: 'straight_through',  cat: 'career', tier: 'diamond', cond: { on: 'account', stat: 'straightThrough', min: 1 }, reward: { mc: 1 } },
    { id: 'straight_a',        cat: 'career', tier: 'gold',    cond: { on: 'life', stat: 'sGrades', min: 10 }, reward: { st: 1 } },
    { id: 'never_say_die',     cat: 'career', tier: 'silver',  cond: { on: 'career', stat: 'comebacks', min: 1 }, reward: { coins: 300 } },
    { id: 'hard_way',          cat: 'career', tier: 'diamond', cond: { on: 'account', stat: 'legendCareers', min: 1 }, reward: { mc: 1 }, requires: 'legend' },
    // ---- Rivals and coaches ----
    { id: 'game_on',           cat: 'rivals', tier: 'bronze',  cond: { on: 'account', stat: 'rivalsBeaten', min: 1 }, reward: { coins: 200 } },
    { id: 'giant_killer',      cat: 'rivals', tier: 'gold',    cond: { on: 'match', stat: 'rivalGap', min: 15 }, reward: { st: 1 } },
    { id: 'nemesis_down',      cat: 'rivals', tier: 'diamond', cond: { on: 'account', stat: 'championBeaten', min: 1 }, reward: { mc: 1 } },
    { id: 'rival_collector',   cat: 'rivals', tier: 'gold',    cond: { on: 'account', stat: 'rivalsBeaten', min: 12 }, reward: { lm: 1 } },
    { id: 'recruited',         cat: 'rivals', tier: 'silver',  cond: { on: 'account', stat: 'rivalsRecruited', min: 1 }, reward: { st: 1 }, requires: 'myxi' },
    { id: 'coached_up',        cat: 'rivals', tier: 'silver',  cond: { on: 'account', stat: 'coachesHired', min: 12 }, reward: { coins: 300 } },
    { id: 'hidden_master',     cat: 'rivals', tier: 'gold',    cond: { on: 'account', stat: 'hiddenMaster', min: 1 }, reward: { st: 1 }, hidden: true, requires: 'hiddenMaster' },
    // ---- Progression and gear ----
    { id: 'level_10',          cat: 'progress', tier: 'bronze',  cond: { on: 'account', stat: 'profileLevel', min: 10 }, reward: { coins: 200 }, requires: 'profileLevel' },
    { id: 'level_50',          cat: 'progress', tier: 'gold',    cond: { on: 'account', stat: 'profileLevel', min: 50 }, reward: { lm: 1 }, requires: 'profileLevel' },
    { id: 'stat_star',         cat: 'progress', tier: 'silver',  cond: { on: 'career', stat: 'maxStat', min: 80 }, reward: { st: 1 } },
    { id: 'maxed_out',         cat: 'progress', tier: 'gold',    cond: { on: 'career', stat: 'maxStat', min: 99 }, reward: { lm: 1 } },
    { id: 'technician',        cat: 'progress', tier: 'silver',  cond: { on: 'career', stat: 'masteredTechs', min: 1 }, reward: { st: 1 } },
    { id: 'technique_library', cat: 'progress', tier: 'gold',    cond: { on: 'account', stat: 'techsDiscovered', min: 20 }, reward: { lm: 1 } },
    { id: 'evolution',         cat: 'progress', tier: 'silver',  cond: { on: 'account', stat: 'evolved', min: 1 }, reward: { st: 1 }, requires: 'evolution' },
    { id: 'mythic_gear',       cat: 'progress', tier: 'diamond', cond: { on: 'account', stat: 'mythicOwned', min: 1 }, reward: { mc: 1 } },
    { id: 'kitted_out',        cat: 'progress', tier: 'silver',  cond: { on: 'career', stat: 'fullSet', min: 1 }, reward: { item: 'uniform_premier_domestic' } },
    // ---- My XI (the next job) ----
    { id: 'club_founded',      cat: 'myxi', tier: 'bronze',  cond: { on: 'account', stat: 'myxiClub', min: 1 }, reward: { coins: 200 }, requires: 'myxi' },
    { id: 'chemistry_lesson',  cat: 'myxi', tier: 'silver',  cond: { on: 'account', stat: 'chemistryLinks', min: 3 }, reward: { st: 1 }, requires: 'myxi' },
    { id: 'silverware',        cat: 'myxi', tier: 'gold',    cond: { on: 'account', stat: 'myxiTrophies', min: 1 }, reward: { lm: 1 }, requires: 'myxi' },
    { id: 'invincibles',       cat: 'myxi', tier: 'diamond', cond: { on: 'account', stat: 'legendsInvitational', min: 1 }, reward: { mc: 1 }, requires: 'myxi' },
    { id: 'full_squad',        cat: 'myxi', tier: 'silver',  cond: { on: 'account', stat: 'myxiPlayers', min: 25 }, reward: { coins: 300 }, requires: 'myxi' },
    { id: 'dynasty',           cat: 'myxi', tier: 'gold',    cond: { on: 'account', stat: 'myxiTrophies', min: 5 }, reward: { lm: 1 }, requires: 'myxi' },
    { id: 'all_legends_xi',    cat: 'myxi', tier: 'diamond', cond: { on: 'account', stat: 'legendsXI', min: 1 }, reward: { mc: 1 }, requires: 'myxi' },
    { id: 'unbeaten_run',      cat: 'myxi', tier: 'gold',    cond: { on: 'account', stat: 'myxiStreak', min: 10 }, reward: { st: 1 }, requires: 'myxi' },
    // ---- Challenges and missions (their medal tiers come later) ----
    { id: 'smash_hit',         cat: 'challenges', tier: 'silver', cond: { on: 'account', stat: 'sixSmashGold', min: 1 }, reward: { coins: 300 }, requires: 'challengeTiers' },
    { id: 'rush_hour',         cat: 'challenges', tier: 'silver', cond: { on: 'account', stat: 'wicketRushGold', min: 1 }, reward: { coins: 300 }, requires: 'challengeTiers' },
    { id: 'mission_master',    cat: 'challenges', tier: 'gold',   cond: { on: 'account', stat: 'missionStars', min: 20 }, reward: { st: 1 }, requires: 'missions' },
    { id: 'diamond_smash',     cat: 'challenges', tier: 'gold',   cond: { on: 'account', stat: 'sixSmashDiamond', min: 1 }, reward: { st: 1 }, requires: 'challengeTiers' },
    { id: 'diamond_rush',      cat: 'challenges', tier: 'gold',   cond: { on: 'account', stat: 'wicketRushDiamond', min: 1 }, reward: { st: 1 }, requires: 'challengeTiers' },
    { id: 'fever_pitch',       cat: 'challenges', tier: 'silver', cond: { on: 'account', stat: 'feverTriggers', min: 3 }, reward: { coins: 200 }, requires: 'fever' },
    { id: 'golden_touch',      cat: 'challenges', tier: 'silver', cond: { on: 'account', stat: 'goldenSix', min: 1 }, reward: { coins: 200 }, requires: 'goldenBall' },
    // ---- Secrets (hidden until earned) ----
    { id: 'secret_triple',     cat: 'secrets', tier: 'diamond', cond: { on: 'match', stat: 'legendTriple', min: 1 }, reward: { mc: 1 }, hidden: true, requires: 'legend' },
    { id: 'nelson',            cat: 'secrets', tier: 'bronze',  cond: { on: 'match', stat: 'nelson', min: 1 }, reward: { coins: 111 }, hidden: true },
    { id: 'golden_duck',       cat: 'secrets', tier: 'silver',  cond: { on: 'match', stat: 'goldenDuckWin', min: 1 }, reward: { st: 1 }, hidden: true },
    { id: 'tail_wags',         cat: 'secrets', tier: 'gold',    cond: { on: 'match', stat: 'tailWags', min: 1 }, reward: { st: 1 }, hidden: true },
    { id: 'perfect_game',      cat: 'secrets', tier: 'diamond', cond: { on: 'match', stat: 'perfectGame', min: 1 }, reward: { mc: 1 }, hidden: true, requires: 'droppedCatches' },
  ],
};
