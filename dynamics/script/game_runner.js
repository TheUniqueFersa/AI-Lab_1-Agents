// game_runner.js: Game (one match), Series (many matches), statistics and export.
// NO DOM in this file, so the exact same code can be tested in Node.

const MAX_GAMES = 10000;
const AGENT_KINDS = ["player", "dumb", "gba", "abaop"];
const KIND_LABEL = {player: "Human", dumb: "Dumb (SRA)", gba: "GBA", abaop: "ABAOP"};

function make_agent(kind, turn){
    switch(kind){
        case "player": return new Battleship_Agent("Player", turn);   // human: auto = false
        case "dumb":   return new Battleship_SRA(turn);
        case "gba":    return new Battleship_GBA(turn);
        case "abaop":  return new Battleship_ABAOP(turn);
    }
    throw new Error(`Unknown agent type: ${kind}`);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const total_hits = a => [...a.map_fleet.values()].reduce((s, v) => s + v, 0);

// =====================================================================
//  ONE MATCH
// =====================================================================
class Game {
    constructor(kinds, {first = 0, same_layout = true, T = [500, 500], play_out = true} = {}){
        winner = null;                                    // legacy global of game.js
        this.kinds = kinds;
        this.agents = kinds.map((k, i) => make_agent(k, i));
        if(same_layout){
            // both agents attack the SAME fleet layout (paired comparison)
            this.agents[1].grid = this.agents[0].grid.map(row => row.slice());
        }
        this.agents.forEach((a, i) => a.setT(T[i]));
        this.first = first;             // index of the agent that shoots first
        this.turn = first;              // index of the agent that shoots now
        this.play_out = play_out;       // stats mode: let the loser finish too (uncensored moves)
        this.running = false;           // timers are running
        this.armed = false;             // the game is part of a started series (human clicks are accepted, even while paused)
        this.over = false;
        this.winner_index = null;
        this.end = null;                // snapshot of both agents at the moment the game ended
        this.full = null;               // shots each agent needed to sink its whole fleet (stats mode only)
        this.cpu_ms = [0, 0];
        this.timer = null;
        this.on_shot = null;            // (agent_index) => void    UI redraw hook
        this.on_over = null;            // (game) => void
    }
    has_human(){ return this.agents.some(a => !a.getAUTO()); }
    stats_mode(){ return !this.has_human() && this.agents.every(a => a.getT() === 0); }

    // ONE automatic shot by the agent whose turn it is
    step(draw = true, notify = true){
        const i = this.turn;
        const t0 = performance.now();
        this.agents[i].step();
        this.cpu_ms[i] += performance.now() - t0;
        this.settle(i);
        if(draw && this.on_shot) this.on_shot(i);
        if(this.over && notify) this.fire_over();
    }
    settle(i){
        if(this.agents[i].is_over()){
            this.over = true;
            this.running = false;
            this.armed = false;
            this.winner_index = i;
            clearTimeout(this.timer);
            this.end = this.agents.map(a => ({moves: a.getMOVES(), hits: total_hits(a), sunk: SHIPS.size - a.fleet.length}));
        } else {
            this.turn = 1 - i;
        }
    }
    fire_over(){
        if(this.on_over){ const f = this.on_over; this.on_over = null; f(this); }
    }

    // Human click. Returns true if the shot was accepted.
    human_shot(agent, coord){
        const i = this.agents.indexOf(agent);
        if(!this.armed || this.over || this.turn !== i) return false;
        if(!agent.is_not_discovered_yet(coord)) return false;
        agent.hunt(coord);
        this.settle(i);
        if(this.on_shot) this.on_shot(i);
        if(this.over) this.fire_over(); else this.schedule();
        return true;
    }

    // ONE shot on demand by the agent whose turn it is (the "Next move" button).
    // Returns false if it is a human's turn (the human has to click) or the game is over.
    next_move(){
        if(this.over) return false;
        if(!this.agents[this.turn].getAUTO()) return false;
        this.step();
        return true;
    }

    start(){ this.running = true; this.schedule(); }
    pause(){ this.running = false; clearTimeout(this.timer); }

    // Decides who acts next. Reads T at this moment, so a change of T applies to the next shot
    schedule(){
        clearTimeout(this.timer);
        if(!this.running || this.over) return;
        if(this.stats_mode()){ this.run_headless(); return; }
        const agent = this.agents[this.turn];
        if(!agent.getAUTO()) return;                          // human: wait for the click
        this.timer = setTimeout(() => { this.step(); this.schedule(); }, agent.getT());
    }

    // Synchronous: no timers, no drawing
    run_headless(){
        this.running = true;
        let guard = 0;
        while(!this.over){
            this.step(false, false);
            if(++guard > 1000) throw new Error("The game did not finish");
        }
        if(this.play_out){
            // The two agents never interact, so the loser can finish too:
            // this gives the real number of shots each one needs (not cut short by the opponent).
            this.agents.forEach((a, i) => {
                let g = 0;
                while(!a.is_over()){
                    const t0 = performance.now();
                    a.step();
                    this.cpu_ms[i] += performance.now() - t0;
                    if(++g > 1000) throw new Error("An agent did not finish");
                }
            });
            this.full = this.agents.map(a => a.getMOVES());
        }
        if(this.on_shot){ this.on_shot(0); this.on_shot(1); }   // one final redraw
        this.fire_over();
    }
}

// =====================================================================
//  MANY MATCHES
// =====================================================================
class Series {
    constructor(kinds, {games = 1, same_layout = true, alternate = true, T = [500, 500], play_out = true, between_ms = 1200} = {}){
        this.kinds = kinds;
        this.total = games;
        this.same_layout = same_layout;
        this.alternate = alternate;       // who shoots first alternates every game (removes the first-move bias)
        this.T = T.slice();
        this.play_out = play_out;
        this.between_ms = between_ms;
        this.results = [];
        this.game = null;
        this.created = 0;
        this.paused = false;
        this.stopped = false;
        this.running = false;
        this._release = null;
        this._pending_step = false;       // "Next move" pressed between games: take the first shot of the next one
        this.hooks = {new_game: null, progress: null, done: null};
    }
    has_human(){ return this.kinds.includes("player"); }
    stats_mode(){ return !this.has_human() && this.T.every(t => t === 0); }
    finished(){ return this.results.length >= this.total || this.stopped; }

    new_game(){
        const first = (this.alternate && !this.has_human()) ? this.created % 2 : 0;
        this.created++;
        this.game = new Game(this.kinds, {first, same_layout: this.same_layout, T: this.T, play_out: this.play_out});
        // in stats mode nothing is drawn, so we don't even build the boards (unless the user is stepping by hand)
        if(this.hooks.new_game && (!this.stats_mode() || this.paused)) this.hooks.new_game(this.game);
        return this.game;
    }

    async run({paused = false} = {}){
        this.running = true;
        this.stopped = false;
        this.paused = paused;             // run({paused: true}): start without timers, for stepping with next_move()
        let last_yield = performance.now();
        while(this.results.length < this.total && !this.stopped){
            if(!this.game || this.game.over) this.new_game();
            await this.play_current();
            if(this.stopped) break;
            if(this.hooks.progress) this.hooks.progress(this);
            if(this.results.length < this.total){
                if(!this.stats_mode()) await sleep(this.between_ms);            // let the user see the final board
                else if(performance.now() - last_yield > 40){                  // let the page breathe ~25 times/s
                    await sleep(0);
                    last_yield = performance.now();
                }
                // paused between games: wait here until Resume (or Next move)
                while(this.paused && !this.stopped && !this._pending_step) await sleep(50);
            }
        }
        this.running = false;
        if(this.hooks.done) this.hooks.done(this);
    }
    play_current(){
        return new Promise(resolve => {
            const g = this.game;
            this._release = resolve;
            g.on_over = () => { this.record(g); this._release = null; resolve(); };
            g.armed = true;
            const step_now = this._pending_step;
            this._pending_step = false;
            if(!this.paused) g.start();              // timers (or the fast statistics loop)
            else if(step_now) g.next_move();         // paused, but "Next move" was pressed between games
        });
    }
    pause(){ this.paused = true; if(this.game) this.game.pause(); }
    resume(){
        this.paused = false;
        if(this.game && !this.game.over && this._release) this.game.start();
    }
    // Manual step. Stepping implies pause. Returns false if it is a human's turn or nothing can move.
    next_move(){
        if(this.stopped || !this.running) return false;
        if(!this.paused) this.pause();
        if(!this.game || this.game.over){ this._pending_step = true; return true; }   // go on to the next game
        return this.game.next_move();
    }
    stop(){
        this.stopped = true;
        this.paused = false;
        if(this.game){ this.game.pause(); this.game.armed = false; }
        if(this._release){ this._release(); this._release = null; }
    }
    // Live change of T (any time). Applies to the very next shot; T = 0 for both => stats mode.
    set_T(i, value){
        this.T[i] = value;
        if(this.game){
            this.game.agents[i].setT(value);
            this.game.schedule();
        }
    }

    // One flat record per game, built from the agents' state at the end
    record(g){
        const [a, b] = g.agents;
        const [ea, eb] = g.end;
        const rec = {
            game: this.results.length + 1,
            A: g.kinds[0], B: g.kinds[1],
            first: g.first === 0 ? "A" : "B",
            winner: g.winner_index === 0 ? "A" : "B",
            same_layout: this.same_layout,
            // state at the moment the game ended (what really happened)
            moves_A: ea.moves, moves_B: eb.moves,
            hits_A: ea.hits, hits_B: eb.hits,
            sunk_A: ea.sunk, sunk_B: eb.sunk,
            // shots each agent needs to sink ALL its ships (only in stats mode)
            full_A: g.full ? g.full[0] : null,
            full_B: g.full ? g.full[1] : null,
            first_hit_A: a.stats.first_hit, first_hit_B: b.stats.first_hit,
            sunk_at_A: a.stats.sunk.map(s => s[1]),
            sunk_at_B: b.stats.sunk.map(s => s[1]),
            cpu_ms_A: +g.cpu_ms[0].toFixed(2), cpu_ms_B: +g.cpu_ms[1].toFixed(2)
        };
        this.results.push(rec);
        return rec;
    }
}

// =====================================================================
//  STATISTICS
// =====================================================================
function describe(v){
    const n = v.length;
    if(n === 0) return null;
    const s = [...v].sort((x, y) => x - y);
    const mean = s.reduce((p, c) => p + c, 0) / n;
    const sd = n > 1 ? Math.sqrt(s.reduce((p, c) => p + (c - mean) ** 2, 0) / (n - 1)) : 0;
    const q = p => s[Math.min(n - 1, Math.floor(p * (n - 1) + 0.5))];
    return {n, mean, sd, min: s[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: s[n - 1]};
}
function wilson(k, n){                       // 95% interval for a proportion
    if(n === 0) return [0, 0];
    const z = 1.96, p = k / n, d = 1 + z * z / n;
    const c = (p + z * z / (2 * n)) / d;
    const h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
    return [c - h, c + h];
}
function summarize(records){
    const n = records.length;
    const out = {games: n, sides: {}};
    for(const side of ["A", "B"]){
        const wins = records.filter(r => r.winner === side).length;
        const full = records.map(r => r["full_" + side]).filter(v => v !== null);
        out.sides[side] = {
            kind: n ? records[0][side] : null,
            wins,
            win_rate: n ? wins / n : 0,
            win_ci95: wilson(wins, n),
            moves_at_end: describe(records.map(r => r["moves_" + side])),
            full_moves: describe(full),
            hit_rate: n ? records.reduce((s, r) => s + r["hits_" + side] / Math.max(1, r["moves_" + side]), 0) / n : 0,
            first_hit: describe(records.map(r => r["first_hit_" + side]).filter(v => v !== null)),
            cpu_ms: describe(records.map(r => r["cpu_ms_" + side]))
        };
    }
    out.first_mover_win_rate = n ? records.filter(r => r.winner === r.first).length / n : 0;
    // paired difference of shots needed (A - B): negative => A is better
    const diffs = records.filter(r => r.full_A !== null).map(r => r.full_A - r.full_B);
    const d = describe(diffs);
    out.paired_diff = d ? {mean: d.mean, ci95: 1.96 * d.sd / Math.sqrt(d.n), n: d.n} : null;
    return out;
}

// =====================================================================
//  EXPORT
// =====================================================================
function results_to_json(series){
    return JSON.stringify({
        meta: {
            created: new Date().toISOString(),
            agents: {A: series.kinds[0], B: series.kinds[1]},
            games_requested: series.total,
            games_played: series.results.length,
            same_layout: series.same_layout,
            alternate_first: series.alternate
        },
        summary: summarize(series.results),
        records: series.results
    }, null, 1);
}
function results_to_csv(series){
    const rows = series.results;
    if(rows.length === 0) return "";
    const cols = Object.keys(rows[0]);
    const cell = v => Array.isArray(v) ? v.join("|") : (v === null ? "" : String(v));
    return [cols.join(","), ...rows.map(r => cols.map(c => cell(r[c])).join(","))].join("\n");
}