// Counts the basic operations of each agent. Run from the report folder with the game.js of the application:
//   (echo "globalThis.document = {getElementById: () => null};"; cat game.js scripts/count_ops.js) | node

// Count cell examinations of the ABAOP density function and list scans of SRA/GBA per shot
let calls = 0;
const orig = Battleship_Agent.prototype.is_a_valid_coord;
Battleship_Agent.prototype.is_a_valid_coord = function(x, y){ calls++; return orig.call(this, x, y); };

// 1) first shot on an empty board
let a = new Battleship_ABAOP(0);
calls = 0; a.nextValidMove();
console.log("ABAOP, first shot, cell examinations:", calls, " (upper bound 2*N*S =", 2*100*17, ")");

// 2) average per shot over full games
let tot = 0, shots = 0, games = 3000;
for (let g = 0; g < games; g++) {
  const ag = new Battleship_ABAOP(0);
  while (!ag.is_over()) {
    calls = 0; ag.step(); tot += calls; shots++;
  }
}
console.log("ABAOP average cell examinations per shot over", games, "games:", (tot / shots).toFixed(0), "| shots per game:", (shots / games).toFixed(1));

// 3) SRA: average length of avail_moves scanned by indexOf per shot (list length at each shot)
let scan = 0, sh = 0;
for (let g = 0; g < games; g++) {
  const ag = new Battleship_SRA(0);
  while (!ag.is_over()) { scan += ag.avail_moves.length; ag.step(); sh++; }
}
console.log("SRA average length of the list scanned/spliced per shot:", (scan / sh).toFixed(1), "(indexOf finds the element at a uniformly random position => about half of it)");

// 4) GBA: size of the parity list at each hunt shot and number of rebuilds per game
let gl = 0, gs = 0, rebuilds = 0;
const ga = Battleship_GBA.prototype.recalc;
Battleship_GBA.prototype.recalc = function(){ rebuilds++; return ga.call(this); };
for (let g = 0; g < games; g++) {
  const ag = new Battleship_GBA(0);
  while (!ag.is_over()) { gl += ag.avail_moves.length; ag.step(); gs++; }
}
console.log("GBA average parity-list length per shot:", (gl / gs).toFixed(1), "| recalc() calls per game:", (rebuilds / games).toFixed(2), "(one per sunk ship)");

// 5) sanity check: mean shots per game of each agent with THIS game.js (must agree with the CSV files)
for (const [name, cls] of [["SRA", Battleship_SRA], ["GBA", Battleship_GBA], ["ABAOP", Battleship_ABAOP]]) {
  let s = 0; const G = 2000;
  for (let g = 0; g < G; g++) { const ag = new cls(0); while (!ag.is_over()) { ag.step(); } s += ag.getMOVES(); }
  console.log(name, "mean shots per game:", (s / G).toFixed(2));
}
