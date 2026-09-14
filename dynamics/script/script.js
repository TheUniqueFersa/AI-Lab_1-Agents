juego1 = document.getElementById("playervsdumb");
juego2 = document.getElementById("playervsai");
juego3 = document.getElementById("dumbvsai");
juego4 = document.getElementById("dumbvsdumb");
juego5 = document.getElementById("aivsai");

console.log("hola");
juego1.addEventListener('click', function(){
    datos = {
        player1: "player",
        player2: "dumb"
    };

    const parametros = new URLSearchParams(datos).toString();
    window.location.href = `./templates/game.html?${parametros}`;
});

juego2.addEventListener('click', function(){
    datos = {
        player1: "player",
        player2: "ai"
    };

    const parametros = new URLSearchParams(datos).toString();
    window.location.href = `./templates/game.html?${parametros}`;
});

juego3.addEventListener('click', function(){
    datos = {
        player1: "dumb",
        player2: "ai"
    };

    const parametros = new URLSearchParams(datos).toString();
    window.location.href = `./templates/game.html?${parametros}`;
});
juego4.addEventListener('click', function(){
    datos = {
        player1: "dumb",
        player2: "dumb"
    };

    const parametros = new URLSearchParams(datos).toString();
    window.location.href = `./templates/game.html?${parametros}`;
});
juego5.addEventListener('click', function(){
    datos = {
        player1: "ai",
        player2: "ai"
    };

    const parametros = new URLSearchParams(datos).toString();
    window.location.href = `./templates/game.html?${parametros}`;
});


