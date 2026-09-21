
let TURN = 0; // 0, 1

let winner = null;
// priv. UPPER
const SHIPS = new Map([
    ['A', "Aircraft"],
    ['B', "Battleship"],
    ['S', "Submarine"],
    ['C', "Cruiser"],
    ['D', "Destroyer"]
]);
function print(a){
    console.log(a)
}
const compass_points = new Map();
compass_points.set("N", [-1, 0]);
compass_points.set("E", [0, 1]);
compass_points.set("S", [1,0]);
compass_points.set("W", [0, -1]);
compass_points.set("U", [-1, 0]);
compass_points.set("R", [0, 1]);
compass_points.set("D", [1,0]);
compass_points.set("L", [0, -1]);

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function swap(arr, val1, val2) {
    let index1 = arr.indexOf(val1);
    let index2 = arr.indexOf(val2);

    // Ensure both values actually exist in the array before swapping
    if (index1 !== -1 && index2 !== -1) {
        // Swap using destructuring assignment
        [arr[index1], arr[index2]] = [arr[index2], arr[index1]];
    }
}


class Battleship_Agent {
    #N = 100;
    #MOVES = 0;
    #STATUS = "HUNT";
    #T = 0;
    #AUTO;
    constructor(name = "Bot", turn, auto = false, x = 10, y = 10, t = 1000){
        this.name = name;
        this.turn = turn;
        this.#AUTO = auto;
        this.grid_x_size = x;
        this.grid_y_size = y;
        this.#T = t;
        this.grid;
        this.current_target = null;
        this.index_of_prox_directions_in_target = 0;
        this.avail_moves = []; // with the form of a coord: A10
        this.map_grid_to_coord = new Map();
        this.map_coord_to_grid = new Map();
        this.fleet = [2, 3, 3, 4, 5];
        this.fleet_symbols = ['A', 'B', 'S', 'C', 'D'];
        this.visual_grid = null;
        this.prefix_board = null;
        

        this.prox_directions = ["U", "R", "D", "L"];
        this.bool_locked_direction = false;

        this.map_fleet = new Map([
            ['A', 0],
            ['B', 0],
            ['S', 0],
            ['C', 0],
            ['D', 0]
        ]);
        this.map_fleet_terminal = new Map([
            ['A', 5],
            ['B', 4],
            ['S', 3],
            ['C', 3],
            ['D', 2]
        ]);
        this.timer = null;
        this.#init_grid(x, y);
        this.#init_grid_map(x, y);
        this.#generate_fleet_locations();        
    }
    //GRAPHIC
    draw_visual_grid(){
        //console.log(this.name);
        //console.log(this.visual_grid)   
        console.log(this.prefix_board);
        let board = this.visual_grid
        for(let x =0 ; x < this.grid_x_size ; x ++ ){
            for(let y = 0 ; y < this.grid_y_size ; y ++){
                let symbol = this.grid[x][y];
                if(symbol === 'o') continue;

                let i = x * this.grid_y_size + y ;
                let casilla = document.getElementById(`${this.prefix_board}-${i}`);
                if(!casilla) continue;

                if(symbol === 'X'){
                    casilla.classList.add('miss')
                }else if(symbol === symbol.toLowerCase()){
                    // golpeado, siempre se muestra (fue descubierto)
                    casilla.classList.add(`ship-${symbol.toUpperCase()}`, 'hit');
                }else{
                    casilla.classList.add(`ship-${symbol}`);
                }
            }
        }
        
    }
    //only occurs when is a Bot
    #stop_timer(){
        if(this.timer){
            print("TIRO DEL BOT");
            this.player_status();

            clearTimeout(this.timer);
            this.timer = null;
            console.log("Timer stopped");
            
        }
    }
    init_timer(f){
        if(this.timer){
            this.#stop_timer();
        }
        console.log("Timer start");
        this.timer = setTimeout(() => {
            f();
            if(this.getAUTO()){
                print(TURN);
                this.draw_visual_grid(); // DRAW GRID
                TURN = toogle_turn(TURN);
                print(TURN);
            }
            this.#stop_timer();
        }, this.#T);
    }
    #init_grid(x, y){
        this.grid = Array.from({length: x}, () => Array(y).fill('o'));
    }
    #init_grid_map(x, y){
        let horizontal_axis = 0;
        let vertical_axis = 'A';
        for(let i = 0; i < x; i++){
            for(let j = 1; j <= y; j++){
                //a coordinate has the form XY: A9, E10; therefore Y goes from 1 to 10.
                let new_corrd_y = horizontal_axis+j;
                let Y = new_corrd_y.toString();

                
                let codigo_actual = vertical_axis.charCodeAt(0);
                let new_corrd_x = codigo_actual + i;
                let X = String.fromCharCode(new_corrd_x);
                //console.log(`${X + Y}`)
                //this.grid[i][j-1] = X + Y;
                let string_key = X + Y;

                let tuple_numbers = this.stringyfyCoord(i, j-1);
                this.avail_moves.push(string_key);
                this.map_grid_to_coord.set(tuple_numbers, string_key);
                this.map_coord_to_grid.set(string_key, [i, j-1]);
            }
        }
    }
    print_map_to_coord(){
        for(const [key, value] of this.map_grid_to_coord.entries()){
            console.log(`${key}: ${value}`);
        }
    }
    draw_ship(init, size, direction, symbol) {
        //console.log(init, size, direction, symbol);
        // The firs iteration validate if it gets out of boundaries and if it is occupied
        let valid = true;
        let [x, y] = init;
        for(let i = 0; i<size; i++){
            const out_of_grid = x<0 || x>=this.grid_x_size || y<0 || y>=this.grid_y_size; 
            if(out_of_grid){
                return false;
            }
            if(this.grid[x][y] !== 'o'){
                return false;
            }
            x += compass_points.get(direction)[0];
            y += compass_points.get(direction)[1];
        }
        
        // The second iteration only add the ship on grid
        [x, y] = init
        for(let i = 0; i<size; i++){
            this.grid[x][y] = symbol;
            x += compass_points.get(direction)[0];
            y += compass_points.get(direction)[1];
        }
        return true;
    }

    //Random number [0,9]
    #random_start_pixel(){
        return [Math.floor(Math.random() * this.grid_x_size), Math.floor(Math.random() * this.grid_y_size)];
    }
    #random_direction(){
        let direction = ["N", "E", "S", "W", "U", "R", "D", "L"];
        return direction[Math.floor(Math.random() * (7+0))]; // Random number [0,7]
    }    
    #generate_fleet_locations(){
        //in order to can recalculate, draw_ship must return a boolean
        let symbol = 'A';
        let start_pixel = [1, 3];
        let ship_size = 5;        
        let ship_calculated_bool;
        // Aircraft
        //randomize this
        [ship_size, symbol] = [5, 'A'];
        do {
            ship_calculated_bool = this.draw_ship(this.#random_start_pixel(), ship_size, this.#random_direction(), symbol);
        } while (!ship_calculated_bool);

        // Battleship
        [ship_size, symbol] = [4, 'B'];
        do {
            ship_calculated_bool = this.draw_ship(this.#random_start_pixel(), ship_size, this.#random_direction(), symbol);
            
        } while (!ship_calculated_bool);
        // Submarine
        [ship_size, symbol] = [3, 'S'];
        do {
             ship_calculated_bool = this.draw_ship(this.#random_start_pixel(), ship_size, this.#random_direction(), symbol);
            
        } while (!ship_calculated_bool);
        // Cruiser
        [ship_size, symbol] = [3, 'C'];
        do {
             ship_calculated_bool = this.draw_ship(this.#random_start_pixel(), ship_size, this.#random_direction(), symbol);
            
        } while (!ship_calculated_bool);
        // Destroyer
        [ship_size, symbol] = [2, 'D'];
        do {
             ship_calculated_bool = this.draw_ship(this.#random_start_pixel(), ship_size, this.#random_direction(), symbol);
            
        } while (!ship_calculated_bool);
    }
    print_grid(){
        // Print grid in command, and also reload the interface
        let row = new Array(this.grid_x_size).fill("");
        for(let i=0; i< this.grid_x_size; i++){
            for(let j=0; j<this.grid_y_size; j++){
                row[i] = row[i] + this.grid[i][j] + " ";
            }
            console.log(row[i]);
        }
    }
    nextValidMove(){
        //super naive implementation
        let size_of_availables = this.grid_x_size*this.grid_y_size;
        let m = getRandom(0, size_of_availables-1);
        return this.avail_moves[m];
    }
    stringyfyCoord(i, j){
        return `${i},${j}`;
    }
    //returns 1 if the target was not discovered yet, 0 otherwise (meaning is a repeated target)
    is_not_discovered_yet(m){
        
        let [x,y] = this.map_coord_to_grid.get(m)
        let sym = this.grid[x][y];
        let terminals = ["X"];
        for(const [key, value] of this.map_fleet_terminal.entries()){
            terminals.push(key.toLowerCase());
        }
        print(terminals.indexOf(sym));
        if(terminals.indexOf(sym) == -1) return 1
        else return 0;

    }
    //to override
    hunt(next_target = null){
        if(this.getAUTO()){
            //this.setSTATUS("HUNT");
            if(next_target === null){//redundant
                do{
                    next_target = this.nextValidMove();
                }while(!this.is_not_discovered_yet(next_target));
            }
        }
        console.log(next_target);
        //console.log(this.is_hit_or_miss(next_target));

        if(this.is_not_discovered_yet(next_target)){
            if(this.is_hit_or_miss(next_target)){
                this.hit(next_target);
                this.current_target = next_target;
                if(this.getAUTO()){
                    this.setSTATUS("TARGET");
                }
            } else {
                this.miss(next_target);
            }
        }
    }
    target(){

    }
    recalc(){
        return (this.fleet.length == 0) // 1 if the game is over, 0 otherwise
    }
    valid_move(m){
        this.#N--;
        this.#MOVES++;
        //delete the coord to avoid looping (SRA definition)
        let index = this.avail_moves.indexOf(m);
        if(index !== -1){
            this.avail_moves.splice(index, 1);
        }
    }
    //for all functoins, m has the form of a coord
    is_hit_or_miss(m){
        let grid = this.map_coord_to_grid.get(m);
        let [x, y] = grid;
        //console.log(x, y);
        console.log(this.grid[x][y])
        let pixel_symbol = this.grid[x][y];

        return this.fleet_symbols.includes(pixel_symbol); //0 if is a miss, 1 if is a hit
    }
    check_sunk(){
        
        for(const symbol of this.fleet_symbols){
            
            let terminal_fleed_value = this.map_fleet_terminal.get(symbol);
            let actual_fleed_value = this.map_fleet.get(symbol);
            
            if(actual_fleed_value == terminal_fleed_value)
                return (actual_fleed_value == terminal_fleed_value) //1 if there is a new SUNK!!
        }
        return false;
    }
    sunk(symbol){
    console.log(`${SHIPS.get(symbol)} has been SUNK!!`);

    let index_sym = this.fleet_symbols.indexOf(symbol);
    let index_fleet = this.fleet.indexOf(this.map_fleet_terminal.get(symbol));
    this.fleet_symbols.splice(index_sym, 1);
    this.fleet.splice(index_fleet, 1);

    if(this.getAUTO()){
        this.setSTATUS("HUNT"); // default; recalc() may switch it back to TARGET
    }
    if(this.recalc()){
        winner = this;
        alert(`The player: '${winner.name}' WINS!!`);
    }
}
    hit(m){
        let [x, y] = this.map_coord_to_grid.get(m);
        let to_lower_symbol = this.grid[x][y].toLowerCase()
        this.grid[x][y] = to_lower_symbol;
        
        let symbol_of_m = this.grid[x][y].toUpperCase();

        //Increment the value of the number of strikes for each ship
        let prev_fleet_value_for_m = this.map_fleet.get(symbol_of_m);
        this.map_fleet.set(symbol_of_m, prev_fleet_value_for_m+1);

        if(this.check_sunk()){ // SUNK!
            this.sunk(symbol_of_m);    
        }
        
        this.valid_move(m);
    }
    miss(m){
        let [x, y] = this.map_coord_to_grid.get(m);
        this.grid[x][y] = 'X';

        this.valid_move(m);
    }
    player_status(){
        print(`${this.name}: ${this.getN()}`);
        this.print_grid();
        this.printAvailableMoves();
        print("-----------------");
    }
    continue(){
        if(this.getSTATUS() == "HUNT"){
            this.init_timer(() => this.hunt());
        } else if(this.getSTATUS() == "TARGET"){
            this.init_timer(() => this.target());
        }/* 
        else if(this.getSTATUS() == "RECALC"){
            this.init_timer(() => this.recalc());
        }*/
    }
    getSTATUS(){
        return this.#STATUS;
    }
    setSTATUS(status){
        this.#STATUS = status;
    }
    getN(){
        return this.#N;
    }
    getAUTO(){
        return this.#AUTO;
    }
    
    printAvailableMoves(){
        console.log(this.avail_moves)
    }
    is_a_valid_coord(x, y){
        let A = x >= 0;
        let B = x < this.grid_x_size;
        let C = y >= 0;
        let D = y < this.grid_y_size;
        return A && B && C && D;
    }
}

class Battleship_SRA extends Battleship_Agent{
    //Simple Reflex Agent

    //modify to support NxM size of grid
    constructor(turn, name = "Simple Reflex Agent", auto = true){
        super(name, turn, auto);
    }
    nextValidMove(){
        let size_of_availables = this.avail_moves.length;
        let m = getRandom(0, size_of_availables-1);
        console.log(m);
        return this.avail_moves[m];
    }
    /*
    hunt(){
        
    }
    */
    target(){
        //STAYS EMPTy
    }/*
    recalc(){
        
    }*/
    continue(){
        this.init_timer(() => this.hunt());   
    }
    
}
//let prueba = new Battleship_SRA();
//console.log(prueba.grid);
//prueba.print_grid()
//prueba.print_map_to_coord();
//prueba.continue();
//console.log(prueba.avail_moves);
//console.log(prueba.map_coord_to_grid);

class Battleship_GBA extends Battleship_Agent{
    //Goal Base Agent
    #PARITY = 2;
    //modify to support NxM size of grid
    constructor(turn, name = "Goal Based Agent", auto = true){
        super(name, turn, auto)
        this.decision_grid;
        this.frontier = null; //last cell hit in the direction being explored
        this.#init_decision_grid();
        this.#update_parity();
    }
    #init_decision_grid(x=this.grid_x_size, y=this.grid_y_size){
        this.decision_grid = Array.from({length: x}, () => Array(y).fill(0));
    }
    nextValidMove(){
        if(this.avail_moves.length === 0){
            this.avail_moves = [...this.map_coord_to_grid.keys()].filter(c => this.is_not_discovered_yet(c));
        }
        return this.avail_moves[getRandom(0, this.avail_moves.length - 1)];
    }
    print_decision_grid(){
        let row = new Array(this.grid_x_size).fill("");
        for(let i=0; i< this.grid_x_size; i++){
            for(let j=0; j<this.grid_y_size; j++){
                row[i] = row[i] + this.decision_grid[i][j] + " ";
            }
            console.log(row[i]);
        }
    }
    #update_parity(){
        this.#PARITY = this.fleet[0];
        this.#update_decision_grid();
        return this.#PARITY;
    }
    #update_decision_grid(){
        this.avail_moves = [];
        this.#init_decision_grid();
        let main_diagonal = [];
        for(let i = 0; i < this.grid_x_size; i++){
            main_diagonal.push([i, i]);
        }
        main_diagonal.forEach((value, index) => {
            let [x, y] = value;
            for(let i = x; i<this.grid_x_size; i+=this.#PARITY){
                //for available moves
                let grid_coord = this.stringyfyCoord(i, y);
                let coord = this.map_grid_to_coord.get(grid_coord);
                if(this.is_not_discovered_yet(coord)) this.avail_moves.push(coord);
                this.decision_grid[i][y] = 1;
            }
            for(let j = y+this.#PARITY; j<this.grid_y_size; j+=this.#PARITY){
                //for available moves
                let grid_coord = this.stringyfyCoord(x, j);
                let coord = this.map_grid_to_coord.get(grid_coord);
                this.avail_moves.push(coord);
                this.decision_grid[x][j] = 1;
            }
        });
        
    }
    player_status(){
        print(`${this.name}: ${this.getN()}`);
        print("GRID:")
        this.print_grid();
        print("DESICION GRID")
        this.print_decision_grid();
        print("AVAILABLE MOVES")
        this.printAvailableMoves();
        print("---------------");
    }
/*
    hunt(){
        //random according to parity
    }
  */  
    
    // ---------- TARGET MODE ----------
    #reset_target_state(){
        this.frontier = null;
        this.index_of_prox_directions_in_target = 0;
        this.prox_directions = ["U", "R", "D", "L"];
        this.bool_locked_direction = false;
    }
    // A direction is exhausted: the next one always starts again from the FIRST hit
    #next_direction(){
        this.index_of_prox_directions_in_target++;
        this.frontier = this.current_target;
    }
    // First hit after the origin: [dir, opposite, ...the rest]
    #lock_direction(dir){
        const opposite = {U: "D", D: "U", L: "R", R: "L"}[dir];
        const rest = ["U", "R", "D", "L"].filter(d => d !== dir && d !== opposite);
        this.prox_directions = [dir, opposite, ...rest];
        this.index_of_prox_directions_in_target = 0;
        this.bool_locked_direction = true;
    }
    // A hit on a ship that is not sunk yet and still has an unshot neighbour
    #find_unsunk_hit(){
        for(let x = 0; x < this.grid_x_size; x++){
            for(let y = 0; y < this.grid_y_size; y++){
                const s = this.grid[x][y];
                const is_hit = s === s.toLowerCase() && this.fleet_symbols.includes(s.toUpperCase());
                if(!is_hit) continue;
                for(const d of ["U", "R", "D", "L"]){
                    const [dx, dy] = compass_points.get(d);
                    if(this.is_a_valid_coord(x + dx, y + dy)){
                        const n = this.map_grid_to_coord.get(this.stringyfyCoord(x + dx, y + dy));
                        if(this.is_not_discovered_yet(n)){
                            return this.map_grid_to_coord.get(this.stringyfyCoord(x, y));
                        }
                    }
                }
            }
        }
        return null;
    }
    #start_target(coord){
        this.#reset_target_state();
        this.current_target = coord;
        this.frontier = coord;
        this.setSTATUS("TARGET");
    }

    target(){
        if(this.frontier === null) this.frontier = this.current_target;

        while(this.index_of_prox_directions_in_target < this.prox_directions.length){
            const dir = this.prox_directions[this.index_of_prox_directions_in_target];
            const [dx, dy] = compass_points.get(dir);
            let [x, y] = this.map_coord_to_grid.get(this.frontier); // from the LAST hit, not the first
            x += dx;
            y += dy;

            if(this.is_a_valid_coord(x, y)){
                const coord = this.map_grid_to_coord.get(this.stringyfyCoord(x, y));
                if(this.is_not_discovered_yet(coord)){
                    if(this.is_hit_or_miss(coord)){
                        this.frontier = coord;                 // set state BEFORE hit(): it may sink the ship
                        if(!this.bool_locked_direction) this.#lock_direction(dir);
                        this.hit(coord);
                    } else {
                        this.miss(coord);
                        this.#next_direction();
                    }
                    return; // one shot per turn
                }
            }
            // off the board or already shot: skip this direction without spending a turn
            this.#next_direction();
        }

        // Every direction is exhausted but the ship isn't sunk (ships touching each other)
        const pivot = this.#find_unsunk_hit();
        if(pivot !== null){
            this.#start_target(pivot);
            this.target();
        } else {
            this.#reset_target_state();
            this.setSTATUS("HUNT");
            this.hunt();
        }
    }

    recalc(){
        this.#reset_target_state();
        if(this.fleet.length == 0) return true;   // game over
        this.#update_parity();                    // parity = smallest remaining ship
        const pivot = this.#find_unsunk_hit();    // leftover hits from another ship?
        if(pivot !== null) this.#start_target(pivot);
        return false;
    }
}
//let prueba2 = new Battleship_GBA();
/*
print("INITIAL GRIDS:");
prueba2.print_grid();
print("------------------------");
prueba2.print_decision_grid();
print("------------------------");
prueba2.continue();*/
//prueba2.print_decision_grid();

class Battleship_ABAOP extends Battleship_Agent{
    //Agent Based on Achieving Optimal Performance
    constructor(turn, name = "Optimal Performance Agent", auto = true){
        super(name, turn, auto)
        this.decision_grid;
        this.#init_decision_grid();
    }
    #init_decision_grid(x = this.grid_x_size, y = this.grid_y_size){
        this.decision_grid = Array.from({length: x}, () => Array(y).fill(0));
    }
    print_decision_grid(){
        for(let i = 0; i < this.grid_x_size; i++){
            console.log(this.decision_grid[i].map(v => String(v).padStart(4)).join(""));
        }
    }
    player_status(){
        print(`${this.name}: ${this.getN()}`);
        print("GRID:");
        this.print_grid();
        print("DENSITY (used for the last shot):");
        this.print_decision_grid();
        print("---------------");
    }

    // What the agent KNOWS about a cell: "free" | "blocked" | "hit"
    // blocked = a miss, or a cell of a ship that is already sunk
    // hit     = a hit on a ship that is NOT sunk yet
    // Uppercase ship letters are undiscovered, so they count as "free" (the agent can't see them)
    #cell_state(x, y){
        const s = this.grid[x][y];
        if(s === 'X') return "blocked";
        if(s !== 'o' && s === s.toLowerCase()){
            return this.fleet_symbols.includes(s.toUpperCase()) ? "hit" : "blocked";
        }
        return "free";
    }
    #has_unsunk_hit(){
        for(let x = 0; x < this.grid_x_size; x++){
            for(let y = 0; y < this.grid_y_size; y++){
                if(this.#cell_state(x, y) === "hit") return true;
            }
        }
        return false;
    }

    // The density function
    #compute_density(){
        this.#init_decision_grid();
        const any_hit = this.#has_unsunk_hit();

        for(const size of this.fleet){                 // only ships still afloat
            for(const dir of ["R", "D"]){              // horizontal / vertical
                const [dx, dy] = compass_points.get(dir);
                for(let x = 0; x < this.grid_x_size; x++){      // (x, y) = top-left pivot
                    for(let y = 0; y < this.grid_y_size; y++){
                        const cells = [];
                        let legal = true;
                        let hits = 0;
                        for(let k = 0; k < size; k++){
                            const cx = x + dx * k;
                            const cy = y + dy * k;
                            if(!this.is_a_valid_coord(cx, cy)){ legal = false; break; }
                            const state = this.#cell_state(cx, cy);
                            if(state === "blocked"){ legal = false; break; }
                            if(state === "hit") hits++;
                            cells.push([cx, cy]);
                        }
                        if(!legal) continue;
                        if(any_hit && hits === 0) continue;               // target mode: ignore placements that explain no hit
                        const weight = any_hit ? Math.pow(10, hits) : 1;  // more hits covered = much more likely
                        for(const [cx, cy] of cells){
                            this.decision_grid[cx][cy] += weight;
                        }
                    }
                }
            }
        }
    }

    // Highest-density undiscovered cell (random among ties).
    // hunt() (inherited) calls this, and so does target() below.
    nextValidMove(){
        this.#compute_density();
        let best = -1;
        let best_moves = [];
        for(const m of this.avail_moves){              // avail_moves = undiscovered cells only
            const [x, y] = this.map_coord_to_grid.get(m);
            const d = this.decision_grid[x][y];
            if(d > best){ best = d; best_moves = [m]; }
            else if(d === best){ best_moves.push(m); }
        }
        return best_moves[getRandom(0, best_moves.length - 1)];
    }

    target(){
        const coord = this.nextValidMove();   // same density, now steered by the hits
        if(this.is_hit_or_miss(coord)){
            this.hit(coord);
        } else {
            this.miss(coord);
        }
    }

    recalc(){
        if(this.fleet.length == 0) return true;               // game over
        // sunk() already set HUNT; go back to TARGET if another ship still has hits
        if(this.#has_unsunk_hit()) this.setSTATUS("TARGET");
        return false;
    }
}

function game_continues(){
    if(winner == null)
        return 1;
    else return 0;
}
function toogle_turn(t){
    if (t) return 0;
    else return 1;
}



// 2 PLAYES PER GAME
// CREATION OF OBJECTS CORRESPONDING TO EVERY PLAYER

//let player1 = new Battleship_Agent();
//let player2 = new Battleship_SRA();
