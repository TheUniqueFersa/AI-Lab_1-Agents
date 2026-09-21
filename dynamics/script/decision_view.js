// decision_view.js: draws an agent's decision_grid. Touches no game logic.
const SCALE_STOPS = [[68, 1, 84], [33, 145, 140], [253, 231, 37]]; // purple -> teal -> yellow

function scale_color(t){                       // t in [0,1]
    const seg = t < 0.5 ? 0 : 1;
    const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const a = SCALE_STOPS[seg], b = SCALE_STOPS[seg + 1];
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * local));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
function compact(v){
    if(v >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if(v >= 1e3) return (v / 1e3).toFixed(1) + "k";
    return String(v);
}

// who = 'player1' | 'player2' (the ids used in game.html)
function attach_decision_view(agent, who){
    if(agent.decision_grid === undefined) return;          // human / SRA: nothing to show
    const panel  = document.getElementById(`panel_${who}`);
    const grid   = document.getElementById(`decision_grid_${who}`);
    const legend = document.getElementById(`legend_${who}`);
    const button = document.getElementById(`toggle_${who}`);
    if(!panel || !grid) return;

    const is_density = agent instanceof Battleship_ABAOP;
    const X = agent.grid_x_size, Y = agent.grid_y_size;

    grid.style.gridTemplateColumns = `repeat(${Y}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${X}, 1fr)`;
    const cells = [];
    for(let i = 0; i < X * Y; i++){
        const c = document.createElement('div');
        c.className = 'dcell';
        grid.appendChild(c);
        cells.push(c);
    }

    legend.innerHTML = is_density
        ? `<span>less likely <i class="bar"></i> more likely</span>
           <span><i class="sw d-best"></i>best cell(s)</span>
           <span><i class="sw d-skip"></i>impossible</span>
           <span><i class="sw d-miss">✕</i>miss</span><span><i class="sw d-hit">●</i>hit</span>`
        : `<span><i class="sw d-parity"></i>parity: may be shot</span>
           <span><i class="sw d-skip"></i>skipped by parity</span>
           <span><i class="sw d-miss">✕</i>miss</span><span><i class="sw d-hit">●</i>hit</span>`;

    function refresh(){
        // ABAOP: recompute now, so the grid shows what the NEXT shot will use
        if(is_density && agent.recompute_decision_grid) agent.recompute_decision_grid();

        const is_miss = s => s === 'X';
        const is_hit  = s => s !== 'o' && s === s.toLowerCase();   // uppercase = not discovered yet

        let min = Infinity, max = -Infinity;                        // range of the still-selectable cells
        if(is_density){
            for(let x = 0; x < X; x++){
                for(let y = 0; y < Y; y++){
                    const s = agent.grid[x][y];
                    const v = agent.decision_grid[x][y];
                    if(!is_miss(s) && !is_hit(s) && v > 0){ min = Math.min(min, v); max = Math.max(max, v); }
                }
            }
        }

        for(let x = 0; x < X; x++){
            for(let y = 0; y < Y; y++){
                const cell = cells[x * Y + y];
                const s = agent.grid[x][y];
                const v = agent.decision_grid[x][y];
                const coord = agent.map_grid_to_coord.get(agent.stringyfyCoord(x, y));

                cell.className = 'dcell';
                cell.style.background = '';
                cell.style.color = '';
                cell.textContent = '';
                cell.title = `${coord}: ${v}`;

                if(is_miss(s)){ cell.classList.add('d-miss'); cell.textContent = '✕'; }
                else if(is_hit(s)){ cell.classList.add('d-hit'); cell.textContent = '●'; }
                else if(!is_density){ cell.classList.add(v === 1 ? 'd-parity' : 'd-skip'); }
                else if(v <= 0){ cell.classList.add('d-skip'); }
                else {
                    const t = max === min ? 1 : (v - min) / (max - min);
                    cell.style.background = scale_color(t);
                    cell.style.color = t > 0.55 ? '#111' : '#fff';
                    cell.textContent = compact(v);
                    if(v === max) cell.classList.add('d-best');
                }
            }
        }
    }

    button.addEventListener('click', () => {
        const on = panel.classList.toggle('show-decision');
        button.setAttribute('aria-pressed', String(on));
    });

    panel.classList.add('has-decision');    // shows the button
    agent.decision_view = { refresh };
    refresh();                              // initial state
}