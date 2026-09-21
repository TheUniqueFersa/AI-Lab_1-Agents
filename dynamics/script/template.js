const tableroJugador1 = document.getElementById('container_player1');
const tableroJugador2 = document.getElementById('container_player2');

function crearTablero(contenedor, prefijoJugador, permiteClick, player) {
  for (let i = 0; i < 100; i++) {
    const casilla = document.createElement('div');
    casilla.classList.add('casilla');
    
    casilla.id = `${prefijoJugador}-${i}`; 

    let [x,y] = [Math.floor(i/10), i%10];
    //print(`${x},  ${y}`)
    player.visual_grid = contenedor;
    player.prefix_board = prefijoJugador;
    if (permiteClick) {
      let m = player.map_grid_to_coord.get(player.stringyfyCoord(x, y))
      casilla.dataset.m = m;

      casilla.classList.add('interactiva');
      casilla.addEventListener('click', function(t) {
        //print(t);
        if(TURN == player.turn && player.is_not_discovered_yet(m)){ //only if turn is my turn
          const idCompleto = this.id;
          const m = this.dataset.m;
          print(m);
          player.hunt(m);
          player.player_status();
          //player.draw_visual_grid(); // TO DRAW THE GRID
          
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
const bot = new Battleship_ABAOP(1);
new Battleship_SRA(1)
new Battleship_ABAOP(1)
crearTablero(tableroJugador1, 'p1', true, player);
crearTablero(tableroJugador2, 'p2', false, bot);

attach_decision_view(player, 'player1');   // does nothing for the human
attach_decision_view(bot, 'player2');

const turns = [player, bot];
const PlayerA = player;
const PlayerB = bot;




//game();