/* Chess World (eingebautes Schach-RPG): Dateien, Menükarte, Statistik, Auslieferung. */
const { ok, section, finish, loadClient, startServer, fs, path } = require("./helpers");

(async () => {
  const dir = path.join(__dirname, "..", "public", "chess-world");

  section("Dateien vorhanden, Querwerbung entfernt, Rückweg zu Brain Pulse");
  {
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const js = fs.readFileSync(path.join(dir, "game.js"), "utf8");
    ok("index.html, game.js, style.css, bild/cover.jpg", ["index.html", "game.js", "style.css", "bild/cover.jpg"].every(f => fs.existsSync(path.join(dir, f))));
    ok("Kein 'Andere Spiele'-Fenster / Realm-of-Roulette-Werbung mehr", !html.includes("chessSpielModal") && !html.includes("REALM OF ROULETTE") && !html.includes("ANDERE SPIELE"));
    ok("Zurück-Pfeil zu Brain Pulse in der Kopfleiste (im Rahmen per Nachricht an die App)", html.includes('href="/" class="bp-back"') && html.includes("bpChessBack"));
    ok("Keine relativen ../-Sprünge mehr", !js.includes("'../index.html'"));
    ok("game.js ist syntaktisch gültig", (() => { try { new Function(js); return true; } catch (e) { return false; } })());
  }

  section("Brain-Pulse-Look: keine Gold-/Braun-Farben der Vorlage mehr, Schrift wie in der App");
  {
    const css = fs.readFileSync(path.join(dir, "style.css"), "utf8"), js = fs.readFileSync(path.join(dir, "game.js"), "utf8"), html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const all = css + js + html;
    ok("Kein Gold (#c8a000 / #ffd700) und kein Braun (#0d0a06, #4a3010) mehr", !/#c8a000|#ffd700|#0d0a06|#4a3010/i.test(all));
    ok("Akzentfarbe und Hintergrund von Brain Pulse", css.includes("#c6ff3d") && css.includes("--panel:#151b2b") && css.includes("#0a0d16"));
    ok("Keine Serifenschrift (Cinzel) mehr", !/Cinzel/.test(all));
  }

  section("Menü: Chess-Karte bei den Mini Games, Hub mit Original und Fantasy (Fantasy nur Deutsch)");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="de"; renderMainMenu();');
    ok("[de] Mini-Games-Karte 'Chess' öffnet den Hub", state.last.includes("renderChessHub()") && />Chess</.test(state.last));
    ok("Die alte Einzelkarte 'Chess World' im Modi-Bereich ist weg", !state.last.includes("openChessWorld()"));
    R('renderChessHub();');
    ok("[de] Hub: Original und Fantasy aktiv", state.last.includes('onclick="openChessOriginal()"') && state.last.includes('onclick="openChessWorld()"') && state.last.includes("Chess Original") && state.last.includes("Chess Fantasy"));
    R('openChessOriginal();');
    ok("Original öffnet im Vollbild-Rahmen innerhalb der App (keine Weiterleitung)", state.last.includes('<iframe id="chessFrame" src="/chess/index.html"'));
    R('openChessWorld();');
    ok("Fantasy ebenfalls im Rahmen", state.last.includes('src="/chess-world/index.html"'));
    R('currentLang="en"; renderChessHub();');
    ok("[en] Hub: Original aktiv, Fantasy gesperrt", state.last.includes('onclick="openChessOriginal()"') && !state.last.includes('onclick="openChessWorld()"') && state.last.includes("Only available in German"));
  }

  section("Statistik: Rang und Bilanz aus dem Chess-World-Speicherstand");
  {
    const save = JSON.stringify({ totalFights: 12, totalWins: 7, rankIdx: 4 });
    const C = loadClient({ localStorageData: { cw_v4: save } }); const { R, state } = C;
    R('currentLang="de"; var p = createProfile("Z"); renderStatistik();');
    ok("Zeigt Rang Bronze 2, 12 gespielt, 7 Siege", state.last.includes("Chess Fantasy · Bronze 2") && />12</.test(state.last) && />7</.test(state.last));
    R('currentLang="en"; renderStatistik();');
    ok("Englisch: Rangname englisch", state.last.includes("Chess Fantasy · Bronze 2") && R("chessWorldSummary().rank") === "Bronze 2");
    const C2 = loadClient(); C2.R('var p = createProfile("Z"); renderStatistik();');
    ok("Ohne Partie keine Chess-World-Zeile", !C2.state.last.includes("Chess Fantasy ·"));
    const C3 = loadClient({ localStorageData: { cw_v4: "kaputt{" } }); C3.R('var p = createProfile("Z"); renderStatistik();');
    ok("Kaputter Speicherstand stürzt nicht ab", !C3.state.last.includes("Chess Fantasy ·"));
    const C4 = loadClient({ localStorageData: { cw_v4: JSON.stringify({ totalFights: 1, totalWins: 0, rankIdx: 999 }) } });
    ok("Unsinniger Rang wird auf Legende begrenzt", C4.R("chessWorldSummary().rank") === "Legende");
  }

  section("Statistik: Chess Original aus dem Speicherstand der Schachseite");
  {
    const C = loadClient({ localStorageData: { bp_chess_orig: JSON.stringify({ games: 5, wins: 3, losses: 1, draws: 1 }) } }); const { R, state } = C;
    R('currentLang="de"; var p = createProfile("Z"); renderStatistik();');
    ok("Zeigt Chess Original mit 5 gespielt, 3 Siegen, 1 Remis", state.last.includes("♟ Chess Original") && />5</.test(state.last) && />3</.test(state.last));
    const C2 = loadClient({ localStorageData: { bp_chess_orig: "kaputt{" } }); C2.R('var p = createProfile("Z"); renderStatistik();');
    ok("Kaputter Speicherstand stürzt nicht ab", !C2.state.last.includes("♟ Chess Original"));
  }

  section("Chess Original: Seite, Engine und Spielregeln");
  {
    const dir2 = path.join(__dirname, "..", "public", "chess");
    const html = fs.readFileSync(path.join(dir2, "index.html"), "utf8");
    ok("Seite und Engine vorhanden, Zurück-Link zu Brain Pulse", fs.existsSync(path.join(dir2, "engine.js")) && html.includes('href="/"'));
    ok("Deutsch und Englisch in der Seite", html.includes("Klassisches Schach gegen den Bot") && html.includes("Classic chess against the bot"));
    const src = fs.readFileSync(path.join(dir2, "engine.js"), "utf8") + ";return {initBoard,getAllLegalMoves,applyMove,isInCheck,getAIMove,setLevel:(l)=>{AI_LEVEL=l;}};";
    const E = new Function(src)();
    const perft = (b, col, d, last) => { if (d === 0) return 1; let n = 0; for (const m of E.getAllLegalMoves(b, col, last)) n += perft(E.applyMove(b, m), col === "w" ? "b" : "w", d - 1, m); return n; };
    const b0 = E.initBoard();
    ok("Zugerzeugung korrekt (Perft 20 / 400 / 8902 / 197281)", E.getAllLegalMoves(b0, "w", null).length === 20 && perft(b0, "w", 2, null) === 400 && perft(b0, "w", 3, null) === 8902 && perft(b0, "w", 4, null) === 197281);
    // Schaeferschach-Matt: 1.f3 e5 2.g4 Qh4#
    const play = (b, last, col, [fr, fc, tr, tc]) => { const m = E.getAllLegalMoves(b, col, last).find(x => x.fr === fr && x.fc === fc && x.tr === tr && x.tc === tc); return [E.applyMove(b, m), m]; };
    let b = b0, last = null;
    [["w", [6, 5, 5, 5]], ["b", [1, 4, 3, 4]], ["w", [6, 6, 4, 6]], ["b", [0, 3, 4, 7]]].forEach(([c, mv]) => { [b, last] = play(b, last, c, mv); });
    ok("Narrenmatt: Weiß steht im Schach und hat keinen legalen Zug", E.isInCheck(b, "w") && E.getAllLegalMoves(b, "w", last).length === 0);
    // Patt: Schwarzer Koenig a8, weisser Koenig c7, Dame b6
    const empty = Array.from({ length: 8 }, () => Array(8).fill(null));
    empty[0][0] = { t: "K", col: "b", moved: true }; empty[1][2] = { t: "K", col: "w", moved: true }; empty[2][1] = { t: "Q", col: "w", moved: true };
    ok("Patt erkannt: kein Zug, kein Schach", E.getAllLegalMoves(empty, "b", null).length === 0 && !E.isInCheck(empty, "b"));
    // Rochade und en passant
    const c0 = Array.from({ length: 8 }, () => Array(8).fill(null));
    c0[7][4] = { t: "K", col: "w", moved: false }; c0[7][7] = { t: "R", col: "w", moved: false }; c0[7][0] = { t: "R", col: "w", moved: false }; c0[0][4] = { t: "K", col: "b", moved: true };
    const ms = E.getAllLegalMoves(c0, "w", null);
    ok("Kurze und lange Rochade möglich", ms.some(m => m.castle === "k") && ms.some(m => m.castle === "q"));
    const ep = Array.from({ length: 8 }, () => Array(8).fill(null));
    ep[7][4] = { t: "K", col: "w", moved: true }; ep[0][4] = { t: "K", col: "b", moved: true }; ep[3][4] = { t: "P", col: "w", moved: true }; ep[1][3] = { t: "P", col: "b", moved: false };
    const dbl = E.getAllLegalMoves(ep, "b", null).find(m => m.dbl);
    const after = E.applyMove(ep, dbl);
    ok("En passant möglich", E.getAllLegalMoves(after, "w", dbl).some(m => m.ep));
    // Bot findet Matt in 1
    const m1 = Array.from({ length: 8 }, () => Array(8).fill(null));
    m1[0][7] = { t: "K", col: "b", moved: true }; m1[7][0] = { t: "K", col: "w", moved: true }; m1[1][5] = { t: "Q", col: "b", moved: true }; m1[2][6] = { t: "K", col: "w", moved: true };
    ok("(Sanity) Stellung ohne Weiß-Zug-Problem: Bot liefert einen Zug", !!E.getAIMove(E.initBoard(), null, []));
    E.setLevel({ depth: 2, jitter: 0, blunderChance: 0 });
    const mate = Array.from({ length: 8 }, () => Array(8).fill(null));
    mate[7][7] = { t: "K", col: "w", moved: true }; mate[6][5] = { t: "K", col: "b", moved: true }; mate[0][6] = { t: "Q", col: "b", moved: true };
    const bm = E.getAIMove(mate, null, []);
    ok("Bot (Stufe Mittel) setzt Matt in einem Zug", !!bm && E.getAllLegalMoves(E.applyMove(mate, bm), "w", bm).length === 0 && E.isInCheck(E.applyMove(mate, bm), "w"));
  }

  section("Server liefert die Seite und das Skript aus");
  {
    const S = await startServer();
    for (const [f, type] of [["index.html", "text/html"], ["game.js", "javascript"], ["style.css", "text/css"], ["bild/cover.jpg", "image/jpeg"]]) {
      const r = await fetch(`http://127.0.0.1:${S.port}/chess-world/${f}`);
      ok(`/chess-world/${f} -> 200 ${type}`, r.status === 200 && (r.headers.get("content-type") || "").includes(type));
    }
    for (const [f, type] of [["index.html", "text/html"], ["engine.js", "javascript"]]) {
      const r = await fetch(`http://127.0.0.1:${S.port}/chess/${f}`);
      ok(`/chess/${f} -> 200 ${type}`, r.status === 200 && (r.headers.get("content-type") || "").includes(type));
    }
    await S.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
