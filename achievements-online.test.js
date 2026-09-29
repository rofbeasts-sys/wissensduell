/* Erfolge: was der SERVER dem Client fuer die Erfolge mitteilt (echte Abläufe mit 2 Clients) */
const { ok, section, sleep, finish, startServer, wsConnect } = require("./helpers");

(async () => {
  const S = await startServer({ TTT_DUEL_TYPE: "math", TTT_SPRINT_MS: "600", SLF_HURRY_MS: "1200", WS_DEAD_AFTER_MS: "600000" });
  const P = S.port;
  const waitFor = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(80); } return null; };
  const solve = p => p.op === "+" ? p.a + p.b : p.op === "-" ? p.a - p.b : p.op === "×" ? p.a * p.b : p.a / p.b;

  // ------------------------------------------------------------- TTT-Raum
  const tttRoom = async (mode) => {
    const a = await wsConnect(P), b = await wsConnect(P);
    a.send({ action: "tttCreateRoom", name: "A", mode }); await sleep(200);
    const j = a.find("tttJoined");
    b.send({ action: "tttJoinRoom", code: j.roomCode, name: "B" }); await sleep(250);
    const bySym = { [j.symbol]: a, [b.find("tttJoined").symbol]: b };
    return { a, b, X: bySym.X, O: bySym.O };
  };
  const lastState = (c) => c.last("tttState");

  section("Tic Tac Toe online (klassisch): Sieg in 3 Zuegen wird gemeldet");
  {
    const r = await tttRoom("classic");
    for (const [sym, i] of [["X", 0], ["O", 3], ["X", 1], ["O", 4], ["X", 2]]) { r[sym].send({ action: "tttMove", index: i }); await sleep(120); }
    const x = lastState(r.X), o = lastState(r.O);
    ok("Sieg mit dem 3. Zug: Gewinner bekommt achv.in3 = true", x.gameOver && x.winner === "X" && x.achv && x.achv.in3 === true);
    ok("Der Verlierer bekommt keine Erfolge-Info (achv = null)", o.achv === null);
    const r2 = await tttRoom("classic");
    for (const [sym, i] of [["X", 0], ["O", 3], ["X", 1], ["O", 4], ["X", 5], ["O", 8], ["X", 2]]) { r2[sym].send({ action: "tttMove", index: i }); await sleep(120); }
    const x2 = lastState(r2.X);
    ok("Sieg erst mit dem 4. Zug: in3 = false", x2.gameOver && x2.winner === "X" && x2.achv && x2.achv.in3 === false);
    const states = r2.X.parsed.filter(m => m.type === "tttState");
    ok("Waehrend das Spiel laeuft, ist achv immer null (erst am Ende gefuellt)", states.length >= 7 && states.slice(0, -1).every(m => m.achv === null));
  }
  section("Tic Tac Toe online (Quantum): Zuege werden gezaehlt");
  {
    const r = await tttRoom("quantum");
    for (const [sym, i] of [["X", 0], ["O", 3], ["X", 1], ["O", 4], ["X", 2]]) { r[sym].send({ action: "tttMove", index: i }); await sleep(120); }
    const x = lastState(r.X);
    ok("Quantum: Sieg in 3 Zuegen -> mode quantum + in3", x.mode === "quantum" && x.winner === "X" && x.achv && x.achv.in3 === true);
  }

  section("Tic Tac Toe online (QuizMix, Zahlen-Duelle erzwungen): 3 Duelle / alle richtig");
  {
    // winner = Symbol, das die Sprint-Aufgaben loest. picks: wer dran ist tippt das Feld, Gewinner bekommt es.
    const duel = async (r, cell, winner, { wrongFirst = false, tie = false } = {}) => {
      const turn = lastState(r.X).turnSymbol;
      const picker = r[turn];
      const before = (winner ? r[winner] : r.X).parsed.filter(m => m.type === "tttSprintStart").length;
      picker.send({ action: "tttQuizmixTap", index: cell });
      await waitFor(() => (r.X.parsed || []).filter(m => m.type === "tttSprintStart").length > before && (r.O.parsed || []).filter(m => m.type === "tttSprintStart").length > before);
      if (!tie) {
        const c = r[winner];
        const prob = c.last("tttSprintStart").problem;
        if (wrongFirst) { c.send({ action: "tttSprintAnswer", value: -999 }); await sleep(150); }
        const p2 = wrongFirst ? c.last("tttSprintNextProblem").problem : prob;
        c.send({ action: "tttSprintAnswer", value: solve(p2) });
      }
      const n = (r.X.parsed || []).filter(m => m.type === "tttSprintFinished").length;
      await waitFor(() => (r.X.parsed || []).filter(m => m.type === "tttSprintFinished").length > 0 && lastState(r.X).turnSymbol !== undefined && true, 4000);
      await sleep(900);
    };
    // Spiel 1: Gewinner "X" gewinnt 3 Duelle, macht keinen Fehler
    let r = await tttRoom("quizmix");
    await duel(r, 0, "X"); await duel(r, 1, "X"); await duel(r, 2, "X");
    let x = lastState(r.X);
    ok("QuizMix: alle 3 Duelle gewonnen, keine falsche Antwort -> in3 + allCorrect", x.gameOver && x.winner === "X" && x.achv && x.achv.in3 === true && x.achv.allCorrect === true);
    ok("Der Verlierer bekommt keine Info", lastState(r.O).achv === null);
    // Spiel 2: eine falsche Antwort dazwischen
    r = await tttRoom("quizmix");
    await duel(r, 0, "X"); await duel(r, 1, "X", { wrongFirst: true }); await duel(r, 2, "X");
    x = lastState(r.X);
    ok("QuizMix: in 3 Duellen gewonnen, aber EINE falsche Antwort -> in3 true, allCorrect false", x.gameOver && x.winner === "X" && x.achv && x.achv.in3 === true && x.achv.allCorrect === false);
    // Spiel 3: ein Unentschieden-Duell dazwischen -> 4 Duelle
    r = await tttRoom("quizmix");
    await duel(r, 8, null, { tie: true }); await duel(r, 0, "X"); await duel(r, 1, "X"); await duel(r, 2, "X");
    x = lastState(r.X);
    ok("QuizMix: 4 Duelle (eines unentschieden) -> Sieg zaehlt NICHT als 'in 3 Zuegen'", x.gameOver && x.winner === "X" && x.achv && x.achv.in3 === false);
    // Rematch setzt die Zaehler zurueck
    r.X.send({ action: "tttRematch" }); await sleep(300);
    ok("Nach dem Rematch ist das Brett leer, keine Erfolge-Info mehr", lastState(r.X).board.every(c => !c) && lastState(r.X).achv === null);
  }

  // ------------------------------------------------------------- Party: SLF
  const partyRoom = async (gameMode) => {
    const h = await wsConnect(P), g = await wsConnect(P);
    h.send({ action: "createRoom", name: "Host", language: "de", gameMode }); await sleep(250);
    const j = h.find("joined");
    g.send({ action: "joinRoom", code: j.roomCode, name: "Gast" }); await sleep(250);
    return { h, g, hostId: j.playerId, gastId: g.find("joined").playerId };
  };
  section("Stadt Land Fluss: wer war als Erste/r mit allen Feldern fertig");
  {
    let { h, g, hostId, gastId } = await partyRoom("slf");
    h.send({ action: "setTeamMode", teamMode: "ffa" }); await sleep(150); h.send({ action: "startGame" });
    const st = await waitFor(() => h.find("slfRoundStart"));
    const full = pre => Object.fromEntries(st.categories.map(c => [c, st.letter + pre + c.slice(0, 3)]));
    const part = pre => ({ [st.categories[0]]: st.letter + pre });
    g.send({ action: "slfSubmit", answers: part("g") }); await sleep(150);
    h.send({ action: "slfSubmit", answers: full("h") });
    let rv = await waitFor(() => h.find("slfReveal"), 10000);
    ok("Gast gab UNVOLLSTAENDIG ab, Host vollstaendig: firstFullId = Host, humanCount = 2", !!rv && rv.firstFullId === hostId && rv.humanCount === 2);
    ({ h, g, hostId, gastId } = await partyRoom("slf"));
    h.send({ action: "setTeamMode", teamMode: "ffa" }); await sleep(150); h.send({ action: "startGame" });
    const st2 = await waitFor(() => h.find("slfRoundStart"));
    const full2 = pre => Object.fromEntries(st2.categories.map(c => [c, st2.letter + pre + c.slice(0, 3)]));
    g.send({ action: "slfSubmit", answers: full2("g") }); await sleep(250);
    h.send({ action: "slfSubmit", answers: full2("h") });
    rv = await waitFor(() => h.find("slfReveal"), 10000);
    ok("Beide vollstaendig: wer ZUERST abgab (Gast) ist firstFullId", !!rv && rv.firstFullId === gastId);
    ({ h, g, hostId, gastId } = await partyRoom("slf"));
    h.send({ action: "setTeamMode", teamMode: "ffa" }); await sleep(150); h.send({ action: "startGame" });
    const st3 = await waitFor(() => h.find("slfRoundStart"));
    const half = pre => ({ [st3.categories[0]]: st3.letter + pre });
    h.send({ action: "slfSubmit", answers: half("h") }); g.send({ action: "slfSubmit", answers: half("g") });
    rv = await waitFor(() => h.find("slfReveal"), 10000);
    ok("Niemand hat alle Felder gefuellt: firstFullId = null", !!rv && rv.firstFullId === null);
  }

  // ------------------------------------------------------------- Mehr oder Weniger
  section("Mehr oder Weniger: Rundenende meldet die Leben");
  {
    const h = await wsConnect(P);
    h.send({ action: "createRoom", name: "Solo", language: "de", gameMode: "higherlower" }); await sleep(250);
    h.send({ action: "startGame" });
    let guard = 0, last = null;
    while (!h.find("rankReveal") && guard++ < 80) {
      const rs = h.last("rankState");
      if (rs && rs.currentItem && rs.currentItem.id !== last) { last = rs.currentItem.id; h.send({ action: "rankPlace", itemId: rs.currentItem.id, insertIndex: 0 }); await sleep(200); h.send({ action: "continue" }); }
      await sleep(150);
    }
    const rr = h.find("rankReveal");
    ok("rankReveal kam an", !!rr);
    const team = Object.keys(rr.mistakes)[0];
    ok("rankReveal enthaelt livesLeft je Team (Zahl 0-3), passend zu den Fehlern", !!rr.livesLeft && Number.isInteger(rr.livesLeft[team]) && rr.livesLeft[team] >= 0 && rr.livesLeft[team] <= 3 && rr.livesLeft[team] === Math.max(0, 3 - rr.mistakes[team]));
  }

  // ------------------------------------------------------------- Musik
  section("Musik raten: Abgabe meldet, ob wiederholt wurde");
  {
    const h = await wsConnect(P);
    h.send({ action: "createRoom", name: "Solo", language: "de", gameMode: "music" }); await sleep(250);
    h.send({ action: "startGame" });
    const it1 = await waitFor(() => h.find("musicItem"), 8000);
    ok("Musik-Runde startet", !!it1);
    h.send({ action: "guessSubmit", answers: { artist: "x", title: "y", year: "1999" } });
    const s1 = await waitFor(() => h.find("musicPlayerSubmitted"));
    ok("Abgabe ohne Wiederholung: replaysUsed = 0", !!s1 && s1.replaysUsed === 0);
    const n = h.parsed.filter(m => m.type === "musicItem").length;
    await waitFor(() => h.parsed.filter(m => m.type === "musicItem").length > n, 9000);
    h.send({ action: "musicReplay" });
    await waitFor(() => h.find("musicReplayGranted"), 5000); // auf die Bestaetigung des Servers warten, nicht raten
    h.send({ action: "guessSubmit", answers: { artist: "x", title: "y", year: "1999" } });
    const subs = await waitFor(() => h.parsed.filter(m => m.type === "musicPlayerSubmitted").length >= 2 && h.parsed.filter(m => m.type === "musicPlayerSubmitted")[1]);
    ok("Abgabe NACH einer Wiederholung: replaysUsed = 1", !!subs && subs.replaysUsed === 1);
    if (!subs || subs.replaysUsed !== 1) console.log("   DEBUG Musik:", JSON.stringify(h.parsed.filter(m => /music/i.test(m.type)).map(m => ({ t: m.type, r: m.replaysUsed, n: m.total }))));
  }
  ok("Server lebt nach allen Abläufen", S.alive());
  await S.stop();
  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
