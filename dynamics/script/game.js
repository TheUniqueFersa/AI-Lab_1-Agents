
let turn = 0; // 0, 1

// priv. UPPER

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

class Battleship_Agent {
    #N = 100;
    constructor(x = 10, y = 10){
        this.grid_x_size = x;
        this.grid_y_size = y;

        this.grid;
        this.avail_moves = []; // with the form of a coord: A10
        this.map_grid_to_coord = new Map();
        this.map_coord_to_grid = new Map();
        this.fleet = [2, 3, 3, 4, 5];
        this.fleet_symbols = ['A', 'B', 'S', 'C', 'P'];
        this.map_fleet = new Map([
            ['A', 0],
            ['B', 0],
            ['S', 0],
            ['C', 0],
            ['P', 0]
        ]);
        this.map_fleet_terminal = new Map([
            ['A', 5],
            ['B', 4],
            ['S', 3],
            ['C', 3],
            ['P', 2]
        ]);
        this.#init_grid(x, y);
        this.#init_grid_map(x, y);
        this.#generate_fleet_locations();
        
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
                let tuple_numbers = `${i},${j-1}`;
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
        let [x, y] = init
        for(let i = 0; i<size; i++){
            x += compass_points.get(direction)[0];
            y += compass_points.get(direction)[1];
            this.grid[x][y] = symbol;
        }
    }
    #generate_fleet_locations(){
        // Aircraft
        let symbol = 'A';
        let start_pixel = [1, 3];
        let ship_size = 5
        //randomize this
        this.draw_ship(start_pixel, ship_size, "E", symbol);

        // Battleship
        [start_pixel, ship_size, symbol] = [[6, 1], 4, 'B'];
        this.draw_ship(start_pixel, ship_size, "N", symbol);
        // Submarine
        [start_pixel, ship_size, symbol] = [[5, 5], 3, 'S'];
        this.draw_ship(start_pixel, ship_size, "R", symbol);
        // Cruiser
        [start_pixel, ship_size, symbol] = [[6, 1], 3, 'C'];
        this.draw_ship(start_pixel, ship_size, "D", symbol);
        // Destroyer
        [start_pixel, ship_size, symbol] = [[0, 6], 2, 'D'];
        this.draw_ship(start_pixel, ship_size, "L", symbol);
    }
    print_grid(){
        let row = new Array(this.grid_x_size).fill("");
        for(let i=0; i< this.grid_x_size; i++){
            for(let j=0; j<this.grid_y_size; j++){
                row[i] = row[i] + this.grid[i][j] + " ";
            }
            console.log(row[i]);
        }
    }
    //to override
    hunt(){
        //super naive implementation
        let size_of_availables = this.grid_x_size*this.grid_y_size;
        let m = getRandom(0, size_of_availables);
        return this.avail_moves[m];
    }
    target(){

    }
    recalc(){

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
    hit(m){
        let [x, y] = this.map_coord_to_grid.get(m);
        this.grid[x][y] = 'X';

        //take out the coord to avoid looping (SRA definition)
        let index = this.avail_moves.indexOf(m);
        if(index !== -1){
            this.avail_moves.splice(index, 1);
        }
        this.#N --;

        //tests:
        console.log(this.getN());
        this.print_grid();
        this.printAvailableMoves();
    }
    miss(m){

    }
    continue(){
        let next_target = this.hunt();
        console.log(next_target);
        //console.log(this.is_hit_or_miss(next_target));
        if(this.is_hit_or_miss(next_target)){
            this.hit(next_target);
        } else {
            this.miss(next_target);
        }
    }
    getN(){
        return this.#N;
    }
    printAvailableMoves(){
        console.log(this.avail_moves)
    }
}

class Battleship_SRA extends Battleship_Agent{
    //Simple Reflex Agent

    //modify to support NxM size of grid
    constructor(name = "Simple Reflex Agent"){
        super()
        this.name = name;
        
    }
    hunt(){
        let size_of_availables = this.avail_moves.length;
        let m = getRandom(0, size_of_availables);
        console.log(m);
        return this.avail_moves[m];
    }
    target(){
        //stays empty
    }
    recalc(){
        //stays empty
    }
    
}
let prueba = new Battleship_SRA();
//console.log(prueba.grid);
prueba.print_grid()
console.log(prueba.avail_moves);
console.log(prueba.map_coord_to_grid);
//prueba.print_map_to_coord();
prueba.continue();

class Battleship_GBA extends Battleship_Agent{
    //Goal Base Agent

    //modify to support NxM size of grid
    constructor(name = "Simple Reflex Agent"){
        super()
        this.name = name;
    }
    hunt(){
        //random according to parity
    }
    target(){
        //do the cross method
    }
    recalc(){
        //recalc new parity: next smallest available ship size
    }
}

class Battleship_ABAOP extends Battleship_Agent{
    //Agent Based on Achieveing Optimal Performance

    //modify to support NxM size of grid
    constructor(name = "Simple Reflex Agent"){
        super()
        this.name = name;
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
let game_status = "INIT";
function game_continues(){
    if(game_status != "END")
        return 1;
    else return 0;
}
function toogle_turn(){
    if (turn) return 0;
    else return 1;
}
function game(){
    const PlayerA = new Battleship_SRA;
    const PlayerB = new Battleship_GBA;
    while(game_continues()){
        if(turn){ // 1: Player B
            PlayerB.continue();
        }
        else {  // 0: Player A
            PlayerA.continue();
        }
        turn = toogle_turn();
    }
}
//game();