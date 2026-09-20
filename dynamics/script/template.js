const tableroJugador1 = document.getElementById('container_player1');
const tableroJugador2 = document.getElementById('container_player2');

function crearTablero(contenedor, prefijoJugador, permiteClick, player) {
  for (let i = 0; i < 100; i++) {
    const casilla = document.createElement('div');
    casilla.classList.add('casilla');
    
    casilla.id = `${prefijoJugador}-${i}`; 

    let [x,y] = [Math.floor(i/10), i%10];
    //print(`${x},  ${y}`)

    if (permiteClick) {
      let m = player.map_grid_to_coord.get(player.stringyfyCoord(x, y))
      casilla.dataset.m = m;

      casilla.classList.add('interactiva');
      casilla.addEventListener('click', function() {
        const idCompleto = this.id;
        const m = this.dataset.m;
        print(m);
        player.hunt(m)
        
        //const numeroCasilla = idCompleto.split('-')[1];       
        //console.log(`Clic en la casilla ID: ${idCompleto}, Posición: ${numeroCasilla}`);
        
  
        this.style.backgroundColor = '#e74c3c'; 
      });
    }

    contenedor.appendChild(casilla);
  }
}
// human player
const player = new Battleship_Agent();
const bot = new Battleship_SRA();
crearTablero(tableroJugador1, 'p1', true, player);
crearTablero(tableroJugador2, 'p2', false);

const turns = [player, bot];
const PlayerA = player;
const PlayerB = bot;

function game(){
    while(game_continues()){
        if(turn){ // 1: Player B
          if(PlayerB.getAUTO() === true){
            PlayerB.continue();
          }
        }
        else {  // 0: Player A
          if(PlayerA.getAUTO() === true){
            PlayerA.continue();
          }
        }
        turn = toogle_turn();
    }
    print(`The player: '${winner.name}' WINS!!`);
}

//game();