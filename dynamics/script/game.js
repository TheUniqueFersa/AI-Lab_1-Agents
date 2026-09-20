
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

class Battleship_Agent {
    constructor(x = 10, y = 10){
        this.grid_x_size = x;
        this.grid_y_size = y;
        this.grid;
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
                console.log(`${X + Y}`)
                //this.grid[i][j-1] = X + Y;
            }
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

    }
    target(){

    }
    recalc(){

    }
}
let prueba = new Battleship_Agent();
//console.log(prueba.grid);
prueba.print_grid()


class Battleship_SRA extends Battleship_Agent{
    //Simple Reflex Agent

    //modify to support NxM size of grid
    constructor(name = "Simple Reflex Agent"){
        this.name = name;
        super()
    }
    hunt(){
        //to it random
    }
    target(){
        //stays empty
    }
    recalc(){
        //stays empty
    }
}

class Battleship_GBA extends Battleship_Agent{
    //Goal Base Agent

    //modify to support NxM size of grid
    constructor(name = "Simple Reflex Agent"){
        this.name = name;
        super()
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
        this.name = name;
        super()
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