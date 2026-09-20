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
        if(TURN == player.turn && player.is_not_discovered_yet(m)){ //only if turn is my turn
          const idCompleto = this.id;
          const m = this.dataset.m;
          print(m);
          player.hunt(m);
          player.player_status();
          
          //const numeroCasilla = idCompleto.split('-')[1];       
          //console.log(`Clic en la casilla ID: ${idCompleto}, Posición: ${numeroCasilla}`);
          
    
          this.style.backgroundColor = '#e74c3c'; 
          TURN = toogle_turn(TURN);
          turns[toogle_turn(player.turn)].continue();
          
        }
        
      });
    }

    contenedor.appendChild(casilla);
  }
}
// human player
const player = new Battleship_Agent("Fersa", 0);
const bot = new Battleship_GBA(1);
crearTablero(tableroJugador1, 'p1', true, player);
crearTablero(tableroJugador2, 'p2', false);

const turns = [player, bot];
const PlayerA = player;
const PlayerB = bot;


//game();