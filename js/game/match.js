// Cricket Arcade — match rules (M03, plan 7.13 / 7A).
// Pure bookkeeping: no drawing. Innings keeps the score, strike, extras and
// free hits; Match runs the toss, the two innings, the result and any
// Super Overs. All randomness goes through RNG streams.

class Innings {
  // o: { index, battingSide, overs, wickets, target (null in the 1st innings), isSuper }
  constructor(o) {
    this.index = o.index;
    this.battingSide = o.battingSide;          // 'player' | 'ai'
    this.bowlingSide = o.battingSide === 'player' ? 'ai' : 'player';
    this.maxBalls = o.overs * 6;
    this.maxWickets = o.wickets;
    this.target = o.target || null;
    this.isSuper = !!o.isSuper;
    this.runs = 0;
    this.wickets = 0;
    this.legal = 0;
    this.extras = { wides: 0, noBalls: 0 };
    this.fours = 0; this.sixes = 0; this.dots = 0;
    this.freeHit = false;
    this.pressure = 0;
    this.batters = [];
    for (let n = 1; n <= 11; n++) this.batters.push({ no: n, runs: 0, balls: 0, out: null });
    this.striker = 1; this.nonStriker = 2; this.nextBatter = 3;
    this.thisOver = [];
    this.lastOver = [];
    this.ended = false;
    this.endReason = null;
  }

  get ball() { return this.legal; }                     // legal balls so far
  get ballsLeft() { return this.maxBalls - this.legal; }
  get overs() { return `${Math.floor(this.legal / 6)}.${this.legal % 6}`; }
  get runRate() { return this.legal ? this.runs / this.legal * 6 : 0; }
  get need() { return this.target ? Math.max(0, this.target - this.runs) : null; }
  get requiredRate() { return this.target && this.ballsLeft > 0 ? this.need / this.ballsLeft * 6 : 0; }
  bat(no) { return this.batters[no - 1]; }

  static canBeOutOn(kind, freeHit, how) {
    // No-ball / free hit: only a run out can dismiss the batter (plan 7A).
    if (how === 'runout') return true;
    return kind !== 'noball' && !freeHit;
  }

  // b: { kind: 'legal'|'wide'|'noball', batRuns (ran), boundary: 0|4|6,
  //      wicket: null|'bowled'|'caught'|'lbw'|'runout' }
  apply(b) {
    const PR = WICKET_RUSH_DATA.classic.pressure;
    const kind = b.kind || 'legal';
    const batRuns = b.batRuns || 0, boundary = b.boundary || 0;
    const wasFreeHit = this.freeHit;
    const res = { runs: 0, wicket: false, notOut: false, overDone: false, freeHitNext: false, symbol: '' };
    let pressure = 0;

    const extra = kind === 'wide' || kind === 'noball' ? 1 : 0;
    res.runs = extra + batRuns + boundary;
    this.runs += res.runs;
    const st = this.bat(this.striker);

    if (kind === 'wide') { this.extras.wides++; pressure += PR.extra; }
    if (kind === 'noball') { this.extras.noBalls++; this.freeHit = true; res.freeHitNext = true; pressure += PR.extra; }
    if (kind === 'legal') { this.legal++; this.freeHit = false; st.balls++; }
    if (kind !== 'wide') st.runs += batRuns + boundary;
    if (boundary === 4) this.fours++;
    if (boundary === 6) this.sixes++;
    if (boundary) pressure += PR.boundary;
    else if (batRuns) pressure += PR.perRun * batRuns;
    else if (kind === 'legal' && !b.wicket) { this.dots++; pressure += PR.dot; }

    // Completed runs: odd = batters swap ends.
    if (batRuns % 2 === 1) this._swap();

    if (b.wicket) {
      if (!Innings.canBeOutOn(kind, wasFreeHit, b.wicket)) {
        res.notOut = true;
      } else {
        res.wicket = true;
        this.wickets++;
        pressure += PR.wicket;
        const out = this.bat(this.striker);
        out.out = b.wicket;
        if (this.wickets < this.maxWickets && this.nextBatter <= 11) this.striker = this.nextBatter++;
      }
    }

    res.symbol = res.wicket ? 'W' : kind === 'wide' ? 'Wd' : kind === 'noball' ? 'Nb'
      : boundary ? String(boundary) : batRuns ? String(batRuns) : '•';
    this.thisOver.push(res.symbol);

    if (kind === 'legal' && this.legal % 6 === 0) {
      res.overDone = true;
      this._swap();
      this.lastOver = this.thisOver;
      this.thisOver = [];
    }
    this.pressure = Math.max(0, Math.min(1, this.pressure + pressure));

    if (this.target && this.runs >= this.target) { this.ended = true; this.endReason = 'chased'; }
    else if (this.wickets >= this.maxWickets) { this.ended = true; this.endReason = 'allOut'; }
    else if (this.legal >= this.maxBalls) { this.ended = true; this.endReason = 'overs'; }
    return res;
  }

  _swap() { const s = this.striker; this.striker = this.nonStriker; this.nonStriker = s; }

  topScorer() {
    let best = this.batters[0];
    for (const b of this.batters) if (b.runs > best.runs) best = b;
    return best;
  }
}

const Match = {
  fmt: null,
  seed: 0,
  toss: null,          // { winner, choice, firstBatting }
  innings: [],
  mainBattedFirst: null,
  superOvers: 0,
  over: false,
  result: null,

  start(formatId) {
    this.fmt = MATCH_DATA.formats[formatId || MATCH_DATA.defaultFormat];
    this.seed = RNG.begin(Dev.nextSeed());
    this.innings = [];
    this.superOvers = 0;
    this.over = false;
    this.result = null;
    this.toss = null;
    Log.add('match', `start ${this.fmt.id} seed ${this.seed}`);
  },

  // Random toss winner (plan 7.13). The AI picks from its own stream.
  flipToss() {
    const rng = RNG.stream('toss');
    const winner = rng.chance(0.5) ? 'player' : 'ai';
    const coin = rng.chance(0.5) ? 'heads' : 'tails';
    let choice = null;
    if (winner === 'ai') choice = rng.chance(MATCH_DATA.toss.aiBowlFirstChance) ? 'bowl' : 'bat';
    this.toss = { winner, coin, choice };
    return this.toss;
  },

  choose(choice) {
    this.toss.choice = choice;
    const w = this.toss.winner;
    this.toss.firstBatting = (choice === 'bat') ? w : (w === 'player' ? 'ai' : 'player');
    this.mainBattedFirst = this.toss.firstBatting;
    Log.add('match', `toss ${w} chose ${choice}; ${this.toss.firstBatting} bats first`);
  },

  current() { return this.innings[this.innings.length - 1] || null; },

  // Which side bats in the innings about to start?
  _nextBatting() {
    const n = this.innings.length;
    if (n === 0) return this.toss.firstBatting;
    if (n === 1) return this.innings[0].bowlingSide;
    // Super Overs: the side that batted second last time bats first (plan 7A).
    const prevPairStart = n - 2;
    if ((n - 2) % 2 === 0) return this.innings[prevPairStart + 1].battingSide;
    return this.innings[n - 1].bowlingSide;
  },

  // Create the next innings and return the scene that plays it.
  startInnings() {
    const n = this.innings.length;
    const isSuper = n >= 2;
    const SO = MATCH_DATA.superOver;
    const batting = this._nextBatting();
    let target = null;
    if (n % 2 === 1) target = this.innings[n - 1].runs + 1;
    const inn = new Innings({
      index: n, battingSide: batting, target, isSuper,
      overs: isSuper ? SO.overs : this.fmt.overs,
      wickets: isSuper ? SO.wickets : this.fmt.wickets,
    });
    this.innings.push(inn);
    Log.add('match', `innings ${n + 1}: ${batting} bats${target ? ', target ' + target : ''}${isSuper ? ' (super over)' : ''}`);
    return batting === 'player' ? 'matchbat' : 'matchbowl';
  },

  // Called when an innings finishes. Returns what happens next:
  // { next: 'innings' } | { next: 'superOver' } | { next: 'result' }
  afterInnings() {
    const n = this.innings.length;
    if (n % 2 === 1) return { next: 'innings' };
    const a = this.innings[n - 2], b = this.innings[n - 1];
    if (b.runs === a.runs) {
      this.superOvers++;
      return { next: 'superOver' };
    }
    this.over = true;
    const chaserWon = b.runs > a.runs;
    const winner = chaserWon ? b.battingSide : a.battingSide;
    const res = { winner, superOver: n > 2 };
    if (res.superOver) res.marginKey = 'match.bySuperOver';
    else if (chaserWon) { res.marginKey = 'match.byWickets'; res.margin = b.maxWickets - b.wickets; res.ballsLeft = b.ballsLeft; }
    else { res.marginKey = 'match.byRuns'; res.margin = a.runs - b.runs; }
    if (res.margin === 1) res.marginKey += 'One';
    this.result = res;
    Log.add('match', `result: ${winner} wins ${res.marginKey} ${res.margin || ''}`);
    return { next: 'result' };
  },
};
