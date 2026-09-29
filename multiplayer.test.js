/* Echte Mehrspieler-Ablaeufe gegen den Server (2 Clients) */
const { ok, section, sleep, finish, startServer, wsConnect } = require("./helpers");

(async () => {
  const S = await startServer({ NENNSBLITZ_DUELL_MS: "5000", SLF_HURRY_MS: "1500", WS_DEAD_AFTER_MS: "600000" });
  const P = S.port;
  const newRoom = async (gameMode, hostName = "Host", guestName = "Gast") => {
    const h = await wsConnect(P), g = await wsConnect(P);
    h.send({ action: "createRoom", name: hostName, language: "de", gameMode }); await sleep(250);
    const code = h.find("joined").roomCode;
    g.send({ action: "joinRoom", code: code.toLowerCase(), name: guestName }); await sleep(250);
    return { h, g, code };
  };
  const waitFor = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(100); } return null; };

  section("Party-Raum: Namen bereinigt, Raumcode unabhaengig von Gross/Klein");
  {
    const { h, g, code } = await newRoom("mixed", '<img src=x onerror=alert(1)>Anna Lange Name Ueber Zwanzig', "  Ben  ");
    const ru = h.last("roomUpdate");
    const names = ru.players.map(p => p.name);
    ok("< und > sind aus dem Namen entfernt, Name auf 20 Zeichen gekuerzt", names.every(n => !/[<>]/.test(n) && n.length <= 20));
    ok("Beitritt mit kleingeschriebenem Code klappt, Leerzeichen getrimmt", names.includes("Ben"));
    const t = await wsConnect(P); t.send({ action: "tttCreateRoom", name: "<b>" + "A".repeat(50000), mode: "classic" }); await sleep(300);
    const t2 = await wsConnect(P); t2.send({ action: "tttJoinRoom", code: t.find("tttJoined").roomCode, name: "Gast" }); await sleep(300);
    const size = JSON.stringify(t2.parsed || []).length;
    ok("Tic-Tac-Toe: 50.000-Zeichen-Name wird auf 20 gekuerzt", size < 3000 && !JSON.stringify(t2.parsed).includes("A".repeat(21)));
  }

  section("Stadt Land Fluss 1 gegen 1: Daumen runter (frueher hing das Anfechten hier)");
  {
    const { h, g } = await newRoom("slf");
    h.send({ action: "setTeamMode", teamMode: "ffa" }); await sleep(150); h.send({ action: "startGame" });
    const start = await waitFor(() => h.find("slfRoundStart"));
    ok("Runde startet", !!start);
    const fill = pre => Object.fromEntries(start.categories.map(c => [c, start.letter + pre + c.slice(0, 3)]));
    h.send({ action: "slfSubmit", answers: fill("host") }); g.send({ action: "slfSubmit", answers: fill("gast") });
    const reveal = await waitFor(() => h.find("slfReveal"), 12000);
    ok("Aufloesung kommt", !!reveal);
    const hostId = reveal.players.find(p => p.name === "Host").id, gastId = reveal.players.find(p => p.name === "Gast").id;
    const c1 = start.categories[0], c2 = start.categories[1];
    g.send({ action: "slfThumb", targetPlayerId: hostId, category: c1 }); await sleep(250);
    ok("Ein Daumen des Gegners entfernt die Antwort SOFORT (bei 2 Personen genuegt einer)", !!h.last("slfThumbUpdate").thumbs.some(t => t.playerId === hostId && t.category === c1 && t.removed));
    h.send({ action: "slfThumb", targetPlayerId: hostId, category: c2 }); await sleep(250);
    ok("Eigene Antwort selbst Daumen runter geht", !!g.last("slfThumbUpdate").thumbs.some(t => t.playerId === hostId && t.category === c2 && t.removed));
    h.send({ action: "continue" }); await sleep(500);
    const fin = h.find("slfFinalReveal");
    ok("Endwertung: entfernte Antworten zaehlen 0, uebrige weiter, Gast unberuehrt", !!fin && fin.scores[hostId][c1] === 0 && fin.scores[hostId][c2] === 0 && fin.scores[gastId][c1] > 0 && (start.categories.length < 3 || fin.scores[hostId][start.categories[2]] > 0));
  }

  section("Nenn's Blitz 1 gegen 1: Daumen runter");
  {
    const { h, g } = await newRoom("blitz");
    h.send({ action: "setTeamMode", teamMode: "ffa" }); await sleep(150); h.send({ action: "startGame" });
    await waitFor(() => h.find("nennsBlitzStart")); await sleep(300); // erst nach echtem Rundenbeginn antworten
    h.send({ action: "nennsBlitzSubmit", text: "Apfel" }); h.send({ action: "nennsBlitzSubmit", text: "Birne" }); g.send({ action: "nennsBlitzSubmit", text: "Nudel" });
    const reveal = await waitFor(() => h.find("nennsBlitzReveal"), 12000);
    ok("Aufloesung kommt", !!reveal);
    const hostId = reveal.players.find(p => p.name === "Host").id, gastId = reveal.players.find(p => p.name === "Gast").id;
    const apfel = reveal.answers[hostId].find(a => a.text === "Apfel").id, birne = reveal.answers[hostId].find(a => a.text === "Birne").id;
    g.send({ action: "nennsBlitzThumb", targetPlayerId: hostId, answerId: apfel });
    h.send({ action: "nennsBlitzThumb", targetPlayerId: hostId, answerId: birne }); await sleep(300);
    ok("Gegnerischer + eigener Daumen sofort wirksam", h.last("nennsBlitzThumbUpdate").thumbs.filter(t => t.removed).length === 2);
    h.send({ action: "continue" }); await sleep(500);
    const fin = g.find("nennsBlitzFinal");
    ok("Endwertung: Host 0 gueltige, Gast 1", !!fin && fin.results.find(r => r.playerId === hostId).total === 0 && fin.results.find(r => r.playerId === gastId).total === 1);
  }

  section("Speed Math Sprint im Tic-Tac-Toe-Duell (online)");
  {
    let found = null;
    for (let attempt = 0; attempt < 20 && !found; attempt++) {
      const h = await wsConnect(P), g = await wsConnect(P);
      h.send({ action: "tttCreateRoom", name: "H", mode: "quizmix" }); await sleep(200);
      const j = h.find("tttJoined"); g.send({ action: "tttJoinRoom", code: j.roomCode, name: "G" }); await sleep(200);
      (j.symbol === "X" ? h : g).send({ action: "tttQuizmixTap", index: 4 }); await sleep(350);
      if (h.find("tttSprintStart")) found = { h, g, sym: j.symbol }; else { h.s.destroy(); g.s.destroy(); }
    }
    ok("Ein Speed-Math-Duell wurde ausgelost", !!found);
    const { h, g, sym } = found;
    const hp = h.find("tttSprintStart").problem, gp = g.find("tttSprintStart").problem;
    ok("Aufgabe enthaelt KEINE Loesung mehr, aber 4 Antwort-Kreise", hp.answer === undefined && gp.answer === undefined && hp.choices.length === 4 && new Set(hp.choices).size === 4);
    const solve = p => p.op === "+" ? p.a + p.b : p.op === "-" ? p.a - p.b : p.op === "×" ? p.a * p.b : p.a / p.b;
    ok("Die richtige Loesung ist unter den Kreisen", hp.choices.includes(solve(hp)));
    let cur = hp;
    for (let i = 0; i < 5; i++) { h.send({ action: "tttSprintAnswer", value: solve(cur) }); await sleep(150); cur = h.last("tttSprintNextProblem").problem; }
    ok("5 richtige in Folge ohne auf den Gegner zu warten: Punktestand 5", h.last("tttSprintScoreUpdate").scores[sym] === 5);
    h.send({ action: "tttSprintAnswer", value: -12345 }); await sleep(200);
    ok("Falscher Wert zaehlt nicht", h.last("tttSprintScoreUpdate").scores[sym] === 5);
  }
  ok("Server lebt nach allen Ablaeufen", S.alive());
  await S.stop();
  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
