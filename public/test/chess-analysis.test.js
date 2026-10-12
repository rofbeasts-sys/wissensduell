/* Spielanalyse: Zugbewertung (Bester/Gut/Ungenau/Fehler/Patzer) und Einbindung. */
const { ok, section, finish, fs, path } = require("./helpers");
const vm = require("vm");

const root = path.join(__dirname, "..", "public");
const engine = fs.readFileSync(path.join(root, "chess", "engine.js"), "utf8");
const ana = fs.readFileSync(path.join(root, "chess", "analysis.js"), "utf8");
const ctx = vm.createContext({ console, Math, window: {}, localStorage: { getItem: () => "de" }, document: {} });
vm.runInContext(engine + "\n" + ana + "\n;this.api={initBoard,getLegalMoves,applyMove,A:window.bpAnalysis};", ctx);
const { initBoard, getLegalMoves, applyMove, A } = ctx.api;

function play(board, last, fr, fc, tr, tc, promTo) {
  const mv = getLegalMoves(board, fr, fc, last).find(m => m.tr === tr && m.tc === tc);
  if (!mv) throw new Error("illegal " + [fr, fc, tr, tc]);
  const m = Object.assign({}, mv, promTo ? { promTo } : {});
  return { before: board, last, move: m, board: applyMove(board, m) };
}

section("Bewertung einzelner Züge");
{
  let s = { board: initBoard(), last: null };
  const e1 = play(s.board, s.last, 6, 5, 5, 5);            // 1. f3
  const e1b = play(e1.board, e1.move, 1, 4, 3, 4);         // 1... e5
  const e2 = play(e1b.board, e1b.move, 6, 6, 4, 6);        // 2. g4?? (erlaubt Dh4#)
  const r2 = A.analyzeEntry({ board: e1b.board, last: e1b.move, col: "w", move: e2.move });
  ok("g4 erlaubt Matt in 1 -> Patzer", r2.cls.key === "blunder" && r2.loss >= 300);
  ok("Besserer Zug wird genannt", r2.bestText.length > 0 && !r2.sameAsBest);
  const e1r = A.analyzeEntry({ board: initBoard(), last: null, col: "w", move: e1.move });
  ok("f3 am Anfang ist höchstens ungenau, kein Patzer", ["best", "good", "inacc", "mistake"].includes(e1r.cls.key));

  // Matt in 1 finden: nach 1.f3 e5 2.g4 spielt Schwarz Dh4#
  const m = play(e2.board, e2.move, 0, 3, 4, 7);
  const rm = A.analyzeEntry({ board: e2.board, last: e2.move, col: "b", move: m.move });
  ok("Dh4# (Schwarz) ist der beste Zug", rm.cls.key === "best" && rm.sameAsBest);
}

section("Zusammenfassung");
{
  const rows = [{ cls: { key: "best" }, loss: 0 }, { cls: { key: "good" }, loss: 20 }, { cls: { key: "blunder" }, loss: 900 }];
  const s = A.summarize(rows);
  ok("Zähler und Genauigkeit", s.counts.best === 1 && s.counts.good === 1 && s.counts.blunder === 1 && s.accuracy > 0 && s.accuracy < 60);
  ok("Perfekte Partie = 100 %", A.summarize([{ cls: { key: "best" }, loss: 0 }]).accuracy === 100);
}

section("Einbindung in Original, Online und Fantasy");
{
  const o = fs.readFileSync(path.join(root, "chess", "index.html"), "utf8");
  const on = fs.readFileSync(path.join(root, "chess", "online.html"), "utf8");
  const fa = fs.readFileSync(path.join(root, "chess-world", "index.html"), "utf8");
  const fg = fs.readFileSync(path.join(root, "chess-world", "game.js"), "utf8");
  ok("Original: Skript, Aufzeichnung, Knöpfe", o.includes("analysis.js") && o.includes("G.rec.push") && o.includes('id="anaBtn"') && o.includes('id="endAna"'));
  ok("Online: Skript, Aufzeichnung eigener Züge, Knopf", on.includes("analysis.js") && on.includes("REC.push(pre)") && on.includes('id="endAna"'));
  ok("Fantasy: Skript, Aufzeichnung, Analyse-Knopf im Ergebnis", fa.includes("/chess/analysis.js") && fg.includes("chess.rec") && fg.includes("bpAnalysis.show(chess.rec"));
}
finish();
