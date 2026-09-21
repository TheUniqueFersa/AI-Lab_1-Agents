// Main menu. The game page still receives everything by GET: player1, player2 (+ games, same_layout, alternate)
const MAX_GAMES_MENU = 10000;
const form = document.getElementById("menu_form");
const games_input = document.getElementById("games");
const games_note = document.getElementById("games_note");
let last_games = games_input.value;

const selected = name => form.querySelector(`input[name="${name}"]:checked`).value;
const radio = (name, value) => form.querySelector(`input[name="${name}"][value="${value}"]`);

function refresh(changed){
    // only one human: if both end up on "Human", the side that did not just change goes back to Dumb
    if(selected("player1") === "player" && selected("player2") === "player"){
        radio(changed === "player1" ? "player2" : "player1", "dumb").checked = true;
    }
    const p1 = selected("player1"), p2 = selected("player2");
    radio("player1", "player").disabled = p2 === "player";
    radio("player2", "player").disabled = p1 === "player";

    const human = p1 === "player" || p2 === "player";
    if(!games_input.disabled) last_games = games_input.value;     // remember what the user typed
    games_input.disabled = human;
    games_input.value = human ? 1 : last_games;
    games_note.textContent = human ? "Against a human: 1 game" : `(1 - ${MAX_GAMES_MENU})`;
}

form.addEventListener("change", e => refresh(e.target.name));
form.addEventListener("submit", e => {
    e.preventDefault();
    const p1 = selected("player1"), p2 = selected("player2");
    const human = p1 === "player" || p2 === "player";
    let games = parseInt(games_input.value, 10);
    if(!(games >= 1)) games = 1;
    games = Math.min(games, MAX_GAMES_MENU);

    const datos = {
        player1: p1,
        player2: p2,
        games: human ? 1 : games,
        same_layout: document.getElementById("same_layout").checked ? 1 : 0,
        alternate: document.getElementById("alternate").checked ? 1 : 0
    };
    const parametros = new URLSearchParams(datos).toString();
    window.location.href = `./templates/game.html?${parametros}`;
});
refresh();