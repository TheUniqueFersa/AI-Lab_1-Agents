// game_page.js: everything that happens on game.html.
// It REPLACES the old code that had crearTablero(...), `const player = new Battleship_Agent(...)`, `turns`, etc.

const tableroJugador1 = document.getElementById('container_player1');
const tableroJugador2 = document.getElementById('container_player2');
const $ = id => document.getElementById(id);

// ------------------------------------------------------------------
//  Boards (same as before, but a click now goes through the Game object)
// ------------------------------------------------------------------
function crearTablero(contenedor, prefijoJugador, permiteClick, player, game){
    player.visual_grid = contenedor;
    player.prefix_board = prefijoJugador;      // NEW: 'p1' / 'p2', must match the ids below

    for(let i = 0; i < 100; i++){
        const casilla = document.createElement('div');
        casilla.classList.add('casilla');
        casilla.id = `${prefijoJugador}-${i}`;

        let [x, y] = [Math.floor(i / 10), i % 10];
        if(permiteClick){
            let m = player.map_grid_to_coord.get(player.stringyfyCoord(x, y));
            casilla.dataset.m = m;
            casilla.classList.add('interactiva');
            casilla.addEventListener('click', function(){
                game.human_shot(player, this.dataset.m);     // no inline colour any more (see point 3)
            });
        }
        contenedor.appendChild(casilla);
    }
}

// Called by the Series for every NEW visible game
function build_view(game){
    tableroJugador1.innerHTML = "";
    tableroJugador2.innerHTML = "";
    crearTablero(tableroJugador1, 'p1', kind1 === "player", game.agents[0], game);
    crearTablero(tableroJugador2, 'p2', kind2 === "player", game.agents[1], game);
    attach_decision_view(game.agents[0], 'player1');
    attach_decision_view(game.agents[1], 'player2');
    game.on_shot = i => {
        const a = game.agents[i];
        if(typeof a.draw_visual_grid === "function") a.draw_visual_grid();
        if(a.decision_view) a.decision_view.refresh();
        update_turn_hint();
    };
    game.on_shot(0);      // initial draw: ships of the bots + empty decision grids
    game.on_shot(1);
}

// ------------------------------------------------------------------
//  Parameters (GET): player1, player2 (+ games, same_layout, alternate)
// ------------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const pick_kind = (name, fallback) => AGENT_KINDS.includes(params.get(name)) ? params.get(name) : fallback;
const kind1 = pick_kind("player1", "player");
let   kind2 = pick_kind("player2", "dumb");
if(kind1 === "player" && kind2 === "player") kind2 = "dumb";          // only one human
const has_human = kind1 === "player" || kind2 === "player";
const total_games = has_human ? 1 : Math.min(MAX_GAMES, Math.max(1, parseInt(params.get("games")) || 1));
const same_layout = params.get("same_layout") !== "0";
const alternate = params.get("alternate") !== "0";

// ------------------------------------------------------------------
//  Controls
// ------------------------------------------------------------------
const t_inputs = [$('t1'), $('t2')];
const kinds = [kind1, kind2];
t_inputs.forEach((input, i) => { if(kinds[i] === "player") $(`t_field${i + 1}`).classList.add('hidden'); });
const read_T = input => Math.max(0, Math.floor(Number(input.value)) || 0);

let series = null;

function update_mode_hint(){
    $('mode_hint').textContent = series.stats_mode()
        ? "T = 0 for both agents: statistics mode (nothing is drawn, games run at full speed)."
        : "";
}
// While paused / stepping: tells whose move is next
function update_turn_hint(){
    const g = series.game;
    let text = "";
    if(series.running && series.paused && g && !g.over){
        const i = g.turn;
        text = g.agents[i].getAUTO()
            ? `Next move: ${i === 0 ? "left" : "right"} (${label(kinds[i])})`
            : "Your turn: click on your board";
    }
    $('turn_hint').textContent = text;
}
function label(kind){ return KIND_LABEL[kind]; }
function winner_text(rec){
    const w = rec.winner;
    return `🏆 ${label(rec[w])} (${w === "A" ? "left" : "right"}) wins in ${rec["moves_" + w]} shots`;
}
function update_status(s){
    const n = s.results.length;
    let text;
    if(!s.running && n === 0){
        text = has_human ? "Press Start, then click on your board." : "Ready. Press Start.";
    } else if(s.total === 1 && n === 1){
        text = winner_text(s.results[0]);
    } else {
        const wa = s.results.filter(r => r.winner === "A").length;
        const wb = n - wa;
        const shown = Math.min(n + (s.running ? 1 : 0), s.total);
        text = `${s.running ? "Game" : "Played"} ${shown} / ${s.total} · ${label(s.kinds[0])} ${wa} – ${wb} ${label(s.kinds[1])}`;
        if(!s.running && n > 0 && s.stopped) text += " (stopped)";
    }
    $('status').textContent = text;
    $('progress').max = s.total;
    $('progress').value = n;
}

// ------------------------------------------------------------------
//  Results table + downloads
// ------------------------------------------------------------------
const f1 = v => v === null || v === undefined ? "–" : v.toFixed(1);
const pct = v => (100 * v).toFixed(1) + "%";
function render_results(s){
    const S = summarize(s.results);
    const row = side => {
        const d = S.sides[side];
        const m = d.full_moves || d.moves_at_end;              // full = uncensored (stats mode only)
        const ci = d.win_ci95;
        return `<tr>
            <th>${side === "A" ? "Left (A)" : "Right (B)"}: ${label(d.kind)}</th>
            <td>${d.wins}</td>
            <td>${pct(d.win_rate)} <small>(${pct(ci[0])} – ${pct(ci[1])})</small></td>
            <td>${f1(m.mean)} ± ${f1(m.sd)}</td>
            <td>${m.median} <small>(${m.min} – ${m.max})</small></td>
            <td>${pct(d.hit_rate)}</td>
            <td>${d.first_hit ? f1(d.first_hit.mean) : "–"}</td>
            <td>${d.cpu_ms ? d.cpu_ms.mean.toFixed(2) : "–"}</td>
        </tr>`;
    };
    const has_full = S.sides.A.full_moves !== null;
    let extra = `<p>The agent that shot first won <b>${pct(S.first_mover_win_rate)}</b> of the games.</p>`;
    if(S.paired_diff){
        extra += `<p>Shots needed, A − B: <b>${S.paired_diff.mean.toFixed(1)} ± ${S.paired_diff.ci95.toFixed(1)}</b> (95% CI, ${S.paired_diff.n} games). Negative means A needs fewer shots.</p>`;
    }
    $('summary_table').innerHTML = `
        <p><b>${S.games}</b> game(s). ${has_full ? "Shots = shots needed to sink the whole fleet." : "Shots = shots taken when the game ended (T &gt; 0: the loser did not finish)."}</p>
        <div class="table_scroll"><table>
            <thead><tr><th>Agent</th><th>Wins</th><th>Win rate (95% CI)</th><th>Shots (mean ± sd)</th><th>Median (min – max)</th>
            <th>Hit rate</th><th>1st hit at shot</th><th>CPU ms/game</th></tr></thead>
            <tbody>${row("A")}${row("B")}</tbody>
        </table></div>${extra}`;
    $('results').hidden = false;
}
function download(filename, text, mime){
    const url = URL.createObjectURL(new Blob([text], {type: mime}));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const file_name = ext => `battleship_${kind1}_vs_${kind2}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`;
$('btn_json').addEventListener('click', () => download(file_name("json"), results_to_json(series), "application/json"));
$('btn_csv').addEventListener('click', () => download(file_name("csv"), results_to_csv(series), "text/csv"));

// ------------------------------------------------------------------
//  Series wiring
// ------------------------------------------------------------------
let last_status = 0, last_table = 0;
function on_progress(s){
    const now = performance.now();
    const last = s.results.length >= s.total;
    if(!last && s.stats_mode() && now - last_status < 150) return;      // don't flood the DOM
    last_status = now;
    update_status(s);
    if(!has_human && s.total > 1 && (last || now - last_table > 500)){
        last_table = now;
        render_results(s);
    }
}
function set_buttons(running){
    $('btn_start').disabled = running;
    $('btn_pause').disabled = !running;
    $('btn_stop').disabled = !running;
    $('btn_pause').textContent = "Pause";
    $('btn_start').textContent = series && series.results.length > 0 ? "Run again" : "Start";
}
function on_done(s){
    set_buttons(false);
    update_status(s);
    update_turn_hint();
    if(!has_human && s.results.length > 0){
        render_results(s);
        if(s.total > 1) $('results').scrollIntoView({behavior: "smooth"});
    }
}
function init_series(){
    series = new Series(kinds, {
        games: total_games, same_layout, alternate,
        T: [read_T(t_inputs[0]), read_T(t_inputs[1])]
    });
    series.hooks.new_game = build_view;
    series.hooks.progress = on_progress;
    series.hooks.done = on_done;
    series.new_game();                       // preview: empty boards (and decision grids) before pressing Start
    update_status(series);
    update_mode_hint();
    $('results').hidden = true;
}

$('btn_start').addEventListener('click', () => {
    if(series.results.length > 0 || series.stopped) init_series();       // "Run again"
    set_buttons(true);
    series.run();
});
$('btn_pause').addEventListener('click', () => {
    if(series.paused){ series.resume(); $('btn_pause').textContent = "Pause"; }
    else { series.pause(); $('btn_pause').textContent = "Resume"; }
    update_turn_hint();
});
// NEXT MOVE: one shot by whoever's turn it is. Works before Start, while running (it pauses) and while paused.
$('btn_next').addEventListener('click', () => {
    if(!series.running){
        if(series.results.length > 0 || series.stopped) init_series();   // after a finished series: start a new one
        set_buttons(true);
        series.run({paused: true});                                      // started without timers
    }
    series.next_move();                                                  // (a human's turn is ignored: the human clicks)
    $('btn_pause').textContent = "Resume";
    update_turn_hint();
});
$('btn_stop').addEventListener('click', () => series.stop());

// T can be changed at any moment
t_inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
        if(input.value === "" || kinds[i] === "player") return;
        series.set_T(i, read_T(input));
        update_mode_hint();
    });
});

init_series();
set_buttons(false);