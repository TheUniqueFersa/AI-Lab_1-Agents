
let turn = 0; // 0, 1
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
    constructor(name = "Bot", auto = false, x = 10, y = 10, t = 1000){
        this.name = name;
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
        this.#AUTO = auto;

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
    #stop_timer(){
        if(this.timer){
            clearTimeout(this.timer);
            this.timer = null;
            console.log("Timer stopped");
        }
    }
    #init_timer(f){
        if(this.timer){
            this.#stop_timer();
        }
        console.log("Timer start");
        this.timer = setTimeout(() => {
            f();
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
        return `${i},${j-1}`;
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
            this.setSTATUS("HUNT");
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
        let name_of_ship = SHIPS.get(symbol)
        console.log(`${name_of_ship} has been SUNK!!`);
        //DESIGN 
        setTimeout(()=>{
            let index_sym = this.fleet_symbols.indexOf(symbol);

            let terminal_value_for_symbol_of_m = this.map_fleet_terminal.get(symbol);
            let index_fleet = this.fleet.indexOf(terminal_value_for_symbol_of_m);
            this.fleet_symbols.splice(index_sym, 1);
            this.fleet.splice(index_fleet, 1);

            if(this.getAUTO()){
                this.setSTATUS("RECALC");
            } else{
                if(this.recalc()){
                    winner = this;
                }
            }

        }, this.#T);
        
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
        console.log(this.getN());
        this.print_grid();
        this.printAvailableMoves();
    }
    continue(){
        if(this.#STATUS == "HUNT"){
            this.#init_timer(() => this.hunt());
        } else if(this.#STATUS == "TARGET"){
            this.#init_timer(this.target);
        } else if(this.#STATUS == "RECALC"){
            this.#init_timer(this.recalc);
        }
        //tests:
        this.player_status();
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
    constructor(name = "Simple Reflex Agent", auto = true){
        super(name, auto)
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
    
}
let prueba = new Battleship_SRA();
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
    constructor(name = "Simple Reflex Agent", auto = true){
        super(name, auto)
        this.decision_grid;
        this.#init_decision_grid();
        this.#update_parity();
    }
    #init_decision_grid(x=this.grid_x_size, y=this.grid_y_size){
        this.decision_grid = Array.from({length: x}, () => Array(y).fill(0));
    }
    nextValidMove(){
        let size_of_availables = this.avail_moves.length;
        let m = getRandom(0, size_of_availables-1);
        console.log(m);
        return this.avail_moves[m];
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
                this.avail_moves.push(coord);
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
        //console.log(this.getN());
        print("GRID:")
        this.print_grid();
        print("DESICION GRID")
        this.print_decision_grid();
        print("AVAILABLE MOVES")
        this.printAvailableMoves();
    }
/*
    hunt(){
        //random according to parity
    }
  */  
    
    target(){
        //this.current_target;

        //nextTry():
        let [x, y] = this.map_coord_to_grid.get(this.current_target);
        let try_direction = this.prox_directions[this.index_of_prox_directions_in_target];
        x += compass_points.get(try_direction)[0];
        y += compass_points.get(try_direction)[1];
        if(is_a_valid_coord(x, y)){
            let coord_of_try = this.map_grid_to_coord.get(this.stringyfyCoord(x, y));
            if(this.is_hit_or_miss(coord_of_try)){
                this.hit(coord_of_try);
                if(!this.bool_locked_direction){
                    if(this.index_of_prox_directions_in_target == 0){
                        //swap priority of directions
                        swap(this.prox_directions, this.prox_directions[1], this.prox_directions[2]);
                    } else if (this.index_of_prox_directions_in_target == 1){
                        swap(this.prox_directions, this.prox_directions[2], this.prox_directions[3]);
                    }
                    this.bool_locked_direction = true;
                }

            } else{
                this.index_of_prox_directions_in_target++;        
                this.miss(coord_of_try);
            }
        } else {
            this.index_of_prox_directions_in_target++;
        }
        

    }
    recalc(){
        this.index_of_prox_directions_in_target = 0;
        this.prox_directions = ["U", "R", "D", "L"];
        //recalc new parity: next smallest available ship size
        this.#update_parity();
    }
}
let prueba2 = new Battleship_GBA();
/*
print("INITIAL GRIDS:");
prueba2.print_grid();
print("------------------------");
prueba2.print_decision_grid();
print("------------------------");
prueba2.continue();*/
//prueba2.print_decision_grid();

class Battleship_ABAOP extends Battleship_Agent{
    //Agent Based on Achieveing Optimal Performance

    //modify to support NxM size of grid
    constructor(name = "Simple Reflex Agent", auto = true){
        super(name, auto)
    }
    hunt(){
        //prob function: top most
    }
    target(){
        //do the cross method (modified with proba)
    }
    recalc(){
        //recalc all board: new probability function
    }
}

function game_continues(){
    if(winner == null)
        return 1;
    else return 0;
}
function toogle_turn(){
    if (turn) return 0;
    else return 1;
}
