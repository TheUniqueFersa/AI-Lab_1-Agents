const tableroJugador1 = document.getElementById('container_player1');
const tableroJugador2 = document.getElementById('container_player2');

function crearTablero(contenedor, prefijoJugador, permiteClick) {
  for (let i = 0; i < 100; i++) {
    const casilla = document.createElement('div');
    casilla.classList.add('casilla');
    
    casilla.id = `${prefijoJugador}-${i}`; 

    if (permiteClick) {
      casilla.classList.add('interactiva');
      casilla.addEventListener('click', function() {
        const idCompleto = this.id;
        
        //const numeroCasilla = idCompleto.split('-')[1];       
        //console.log(`Clic en la casilla ID: ${idCompleto}, Posición: ${numeroCasilla}`);
  
        this.style.backgroundColor = '#e74c3c'; 
      });
    }

    contenedor.appendChild(casilla);
  }
}

crearTablero(tableroJugador1, 'p1', true);
crearTablero(tableroJugador2, 'p2', false);