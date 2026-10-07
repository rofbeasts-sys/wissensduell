/* Statistik erweitert um die vier bisher fehlenden Modi: Biologie, Stadt
 * Land Fluss, Tic Tac Toe und Quantum. Alle vier hatten bisher KEINE eigene
 * Rundenzählung in profile.modeStats - jetzt über einen gemeinsamen Helfer
 * (recordModeStat) an allen vier Stellen ergänzt. Tic Tac Toe deckt dabei
 * auch Quizmix und Online-Mehrspieler mit ab (laufen alle durch dieselbe
 * tttApplyRankOutcome()), Quantum läuft bewusst separat davon (kein
 * Gürtel-Auf-/Abstieg). SLF gibt es nur im Mehrspieler, daher über
 * achvOwner() aufgelöst (gleicher Mechanismus wie die Erfolge). */
const { ok, section, finish, loadClient, startServer, post } = require("./helpers");

(async () => {
  section("MODE_STAT_DEFS enthält jetzt alle vier neuen Modi mit passendem zweiten Label");
  {
    const C = loadClient(); const { R } = C;
    const defs = R("MODE_STAT_DEFS");
    ["biology", "slf", "ttt", "quantum"].forEach(k => {
      ok(`'${k}' ist in MODE_STAT_DEFS vorhanden`, defs.some(d => d.key === k));
    });
    ok("Tic Tac Toe zeigt 'Siege' statt 'richtig'", defs.find(d => d.key === "ttt").correctLabel === "Siege");
    ok("Quantum zeigt 'Siege' statt 'richtig'", defs.find(d => d.key === "quantum").correctLabel === "Siege");
    ok("Scattergories (Stadt Land Fluss) zeigt 'Alle Felder' statt 'richtig'", defs.find(d => d.key === "slf").correctLabel === "Alle Felder");
    ok("Biologie nutzt weiterhin den Standard-Begriff 'richtig'", !defs.find(d => d.key === "biology").correctLabel);
  }

  section("Biologie: ein abgeschlossenes Thema zählt mit, inkl. korrekter Anzahl richtiger Antworten");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); biologyProfile=p; startBiologyTopic("body","herz");');
    R('for(let i=0;i<20;i++){ handleBiologyAnswer(biologySession.items[biologySession.qIndex].c); biologyNext(); }');
    ok("played=1, correct=20 (alle richtig)", JSON.stringify(R("p.modeStats.biology")) === JSON.stringify({ played: 1, correct: 20 }));
  }

  section("Tic Tac Toe: Sieg/Niederlage/Unentschieden zählen korrekt (über die gemeinsame tttApplyRankOutcome)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); tttOverviewProfile=p;');
    R('tttApplyRankOutcome(p, 0, "win"); tttApplyRankOutcome(p, 0, "loss"); tttApplyRankOutcome(p, 0, "draw");');
    ok("3 Runden gespielt, 1 Sieg", JSON.stringify(R("p.modeStats.ttt")) === JSON.stringify({ played: 3, correct: 1 }));
  }

  section("Quantum: läuft unabhängig von normalem Tic Tac Toe, eigener Zähler");
  {
    const C = loadClient(); const { R } = C;
    R(`
      var p=createProfile("T"); tttOverviewProfile=p;
      ttq={playerMoves:3, board:Array(9).fill(null), xPieces:[], oPieces:[], difficultyName:"Test"};
      ttqFinish("X");
      ttq={playerMoves:3, board:Array(9).fill(null), xPieces:[], oPieces:[], difficultyName:"Test"};
      ttqFinish("O");
    `);
    ok("Quantum: 2 gespielt, 1 Sieg", JSON.stringify(R("p.modeStats.quantum")) === JSON.stringify({ played: 2, correct: 1 }));
    ok("Normales Tic Tac Toe bleibt bei 0 (komplett getrennter Zähler)", JSON.stringify(R("p.modeStats.ttt")) === JSON.stringify({ played: 0, correct: 0 }));
  }

  section("Stadt Land Fluss: zählt über den Mehrspieler-Nachrichtenpfad (gibt es nur dort, kein Solo)");
  {
    const C = loadClient(); const { R } = C;
    R(`
      var p=createProfile("T");
      localStorage.setItem(LAST_PROFILE_KEY, p.id);
      party = { room:{players:[]}, playerId:"myid" };
      achvOnPartyMessage({ type:"slfReveal", answers:{myid:{Stadt:"Berlin"}}, categories:["Stadt"], firstFullId:null, humanCount:2, scores:{myid:{Stadt:20}} });
    `);
    ok("Alle Felder gefüllt -> played=1, correct=1", JSON.stringify(R("p.modeStats.slf")) === JSON.stringify({ played: 1, correct: 1 }));

    R(`achvOnPartyMessage({ type:"slfReveal", answers:{myid:{Stadt:""}}, categories:["Stadt"], firstFullId:null, humanCount:2, scores:{} });`);
    ok("Nicht alle Felder gefüllt -> played steigt, correct bleibt gleich", JSON.stringify(R("p.modeStats.slf")) === JSON.stringify({ played: 2, correct: 1 }));

    R(`achvOnPartyMessage({ type:"slfReveal", answers:{}, categories:["Stadt"] });`);
    ok("Fremde/keine eigene Abgabe zählt NICHT mit (played bleibt bei 2)", R("p.modeStats.slf.played") === 2);
  }

  section("Statistik-Seite zeigt alle vier neuen Kacheln mit Icon und Farbe");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); renderStatistik();');
    const html = state.last;
    ["Biologie", "Scattergories", "Tic Tac Toe", "Quantum"].forEach(label => {
      ok(`Kachel '${label}' ist vorhanden`, html.includes(label));
    });
    ok("Zeigt 'Siege' bei Tic Tac Toe", /Tic Tac Toe[\s\S]{0,200}Siege/.test(html));
    ok("Zeigt 'Alle Felder' bei Scattergories", /Scattergories[\s\S]{0,200}Alle Felder/.test(html));
  }

  section("Account: Avatar/modeStats-Erweiterung funktioniert genauso über syncAccountStats mit echtem Server");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "StatsExt", password: "test1234" });
    const save = await post(S.port, "/api/save-stats", {
      token: reg.token,
      stats: { modeStats: { biology: { played: 5, correct: 90 }, ttt: { played: 10, correct: 7 }, quantum: { played: 2, correct: 1 }, slf: { played: 3, correct: 2 } } }
    });
    ok("biology gespeichert", JSON.stringify(save.profile.modeStats.biology) === JSON.stringify({ played: 5, correct: 90 }));
    ok("ttt gespeichert", JSON.stringify(save.profile.modeStats.ttt) === JSON.stringify({ played: 10, correct: 7 }));
    ok("quantum gespeichert", JSON.stringify(save.profile.modeStats.quantum) === JSON.stringify({ played: 2, correct: 1 }));
    ok("slf gespeichert", JSON.stringify(save.profile.modeStats.slf) === JSON.stringify({ played: 3, correct: 2 }));
    const login = await post(S.port, "/api/login", { username: "StatsExt", password: "test1234" });
    ok("Alle vier übersteht einen erneuten Login", login.profile.modeStats.biology.played === 5 && login.profile.modeStats.ttt.played === 10 && login.profile.modeStats.quantum.played === 2 && login.profile.modeStats.slf.played === 3);
    await S.stop();
  }

  section("Live-Durchlauf: ein echter Quantum-Bot-Sieg über den normalen Spielablauf synchronisiert fürs Konto");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "QuantumFlow", password: "test1234" });
    const C = loadClient({ fetchImpl: async (url, opts) => {
      const http = require("http");
      return new Promise((resolve) => {
        const req = http.request({ host: "localhost", port: S.port, path: url, method: "POST", headers: { "Content-Type": "application/json" } }, res => {
          let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ ok: res.statusCode < 400, json: async () => JSON.parse(d) }));
        });
        req.write(opts.body); req.end();
      });
    }});
    const { R } = C;
    R(`account = { token:"${reg.token}", profile: ${JSON.stringify(reg.profile)} };`);
    R(`
      tttOverviewProfile = accountAsProfile();
      ttq={playerMoves:3, board:Array(9).fill(null), xPieces:[], oPieces:[], difficultyName:"Test"};
      ttqFinish("X");
    `);
    await new Promise(r => setTimeout(r, 300));
    const check = await post(S.port, "/api/login", { username: "QuantumFlow", password: "test1234" });
    ok("Quantum-Sieg kam wirklich auf dem Server an", check.profile.modeStats.quantum.played === 1 && check.profile.modeStats.quantum.correct === 1);
    await S.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
