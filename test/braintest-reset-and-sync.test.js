/* Kritischer Fund beim Nachtesten: braintestScores/braintestGate/
 * braintestDaily wurden nirgends mit einem Konto synchronisiert - weder in
 * accountAsProfile() noch in syncAccountStats() noch serverseitig in
 * saveUserStats(). Für angemeldete Nutzer:innen gingen Punktestände,
 * Sperren und Tagesversuche dadurch bei jeder Konto-Synchronisierung
 * verloren. Jetzt behoben, dazu ein neuer "Fortschritt zurücksetzen"-Knopf
 * (ohne Umweg über die Datenbank), analog zum bestehenden
 * Tic-Tac-Toe-Rang-Reset. */
const { ok, section, finish, loadClient, startServer, post } = require("./helpers");

(async () => {
  section("Server: braintestScores/-Gate/-Daily werden jetzt korrekt gespeichert UND überleben einen erneuten Login");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "SyncFix1", password: "test1234" });
    const token = reg.token;
    const save = await post(S.port, "/api/save-stats", {
      token, stats: {
        klasse: 1, haupttestUnlockedForKlasse: -1,
        braintestScores: { 0: { main: { correct: 19, total: 20 } }, 1: { practice: { correct: 20, total: 50 } } },
        braintestGate: { klasse: 1, type: "needPriorMain" },
        braintestDaily: { klasse: 1, date: "2026-10-06", practiceAttempts: 3, mainAttempts: 0 }
      }
    });
    ok("Speichern erfolgreich", save.ok);
    ok("braintestScores korrekt gespeichert", JSON.stringify(save.profile.braintestScores) === JSON.stringify({ 0: { main: { correct: 19, total: 20 } }, 1: { practice: { correct: 20, total: 50 } } }));
    ok("braintestGate korrekt gespeichert", JSON.stringify(save.profile.braintestGate) === JSON.stringify({ klasse: 1, type: "needPriorMain" }));
    ok("braintestDaily korrekt gespeichert", JSON.stringify(save.profile.braintestDaily) === JSON.stringify({ klasse: 1, date: "2026-10-06", practiceAttempts: 3, mainAttempts: 0 }));

    const login = await post(S.port, "/api/login", { username: "SyncFix1", password: "test1234" });
    ok("braintestScores übersteht einen erneuten Login (vorher der eigentliche Fehler)", JSON.stringify(login.profile.braintestScores) === JSON.stringify(save.profile.braintestScores));
    ok("braintestGate übersteht einen erneuten Login", JSON.stringify(login.profile.braintestGate) === JSON.stringify(save.profile.braintestGate));
    ok("braintestDaily übersteht einen erneuten Login", JSON.stringify(login.profile.braintestDaily) === JSON.stringify(save.profile.braintestDaily));
    await S.stop();
  }

  section("Server: Validierung lehnt unsinnige/schadhafte Werte ab, ohne abzustürzen");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "SyncFix2", password: "test1234" });
    const token = reg.token;
    const bad = await post(S.port, "/api/save-stats", {
      token, stats: {
        braintestScores: { "99": { main: { correct: 5, total: 20 } }, "0": { main: { correct: 25, total: 20 } } }, // Klasse 99 ungueltig, correct>total ungueltig
        braintestGate: { klasse: 0, type: "irgendwas_erfundenes" },
        braintestDaily: { klasse: 0, date: "kein-datum", practiceAttempts: 999 }
      }
    });
    ok("Anfrage schlägt nicht fehl (kein Absturz)", bad.ok);
    ok("Ungültiger Klassenindex (99) wird verworfen", !bad.profile.braintestScores["99"]);
    ok("Ungültiger Punktestand (correct>total) wird verworfen", !bad.profile.braintestScores["0"]);
    ok("Ungültiger Sperrtyp wird verworfen (Gate bleibt null)", bad.profile.braintestGate === null);
    ok("Ungültiges Tagesversuch-Objekt (kein echtes Datum) wird verworfen (bleibt null)", bad.profile.braintestDaily === null);
    await S.stop();
  }

  section("Client: accountAsProfile() gibt die drei Felder jetzt korrekt weiter (vorher immer undefined)");
  {
    const C = loadClient(); const { R } = C;
    R(`
      account = { token:"t", profile: {
        username:"x", klasse:0,
        braintestScores: {0:{main:{correct:18,total:20}}},
        braintestGate: {klasse:0, type:"needPractice"},
        braintestDaily: {klasse:0, date:"2026-10-06", practiceAttempts:1, mainAttempts:2}
      }};
    `);
    const p = R("accountAsProfile()");
    ok("braintestScores wird übernommen", JSON.stringify(p.braintestScores) === JSON.stringify({ 0: { main: { correct: 18, total: 20 } } }));
    ok("braintestGate wird übernommen", JSON.stringify(p.braintestGate) === JSON.stringify({ klasse: 0, type: "needPractice" }));
    ok("braintestDaily wird übernommen", JSON.stringify(p.braintestDaily) === JSON.stringify({ klasse: 0, date: "2026-10-06", practiceAttempts: 1, mainAttempts: 2 }));
  }

  section("Vollständiger End-zu-End-Ablauf mit echtem Server: 3 Haupttest-Fehlversuche lösen die Sperre aus UND sie übersteht eine Konto-Synchronisierung");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "E2EGate", password: "test1234" });
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
    R(`account = { token: "${reg.token}", profile: ${JSON.stringify(reg.profile)} };`);
    R(`
      var p = accountAsProfile();
      p.haupttestUnlockedForKlasse = 0;
    `);
    for (let i = 0; i < 3; i++) {
      R('beginSolo(p, true);');
      R('solo.correct = 10; solo.wrong = 10; solo.qIndex = solo.questions.length; endSoloRound();');
      await new Promise(r => setTimeout(r, 300)); // echte Netzwerk-Synchronisierung abwarten
    }
    const gateAfterSync = R("account.profile.braintestGate");
    ok("Sperre ist nach echter Server-Synchronisierung im account.profile sichtbar", JSON.stringify(gateAfterSync) === JSON.stringify({ klasse: 0, type: "needPractice" }));
    const serverCheck = await post(S.port, "/api/login", { username: "E2EGate", password: "test1234" });
    ok("...und ist auch wirklich auf dem Server gelandet (nicht nur lokal im Speicher)", JSON.stringify(serverCheck.profile.braintestGate) === JSON.stringify({ klasse: 0, type: "needPractice" }));
    await S.stop();
  }

  section("Neuer 'Fortschritt zurücksetzen'-Knopf in der Klassenübersicht");
  {
    const C = loadClient(); const { R, state, sb } = C;
    sb.confirm = () => true;
    R(`
      var p = createProfile("T"); p.klasse=3; p.haupttestUnlockedForKlasse=-1;
      p.braintestScores = {0:{main:{correct:19,total:20}}, 1:{main:{correct:18,total:20}}, 2:{main:{correct:20,total:20}}};
      p.braintestGate = {klasse:3, type:"needPractice"};
      renderKlassenOverview(p);
    `);
    ok("Knopf 'Fortschritt zurücksetzen' ist vorhanden", state.last.includes("Fortschritt zurücksetzen"));
    R('braintestResetProgress();');
    ok("Klasse zurückgesetzt auf 0", R("klassenOverviewProfile.klasse") === 0);
    ok("haupttestUnlockedForKlasse zurückgesetzt auf -1", R("klassenOverviewProfile.haupttestUnlockedForKlasse") === -1);
    ok("braintestScores geleert", JSON.stringify(R("klassenOverviewProfile.braintestScores")) === "{}");
    ok("braintestGate gelöscht", R("klassenOverviewProfile.braintestGate") === null);
    ok("braintestDaily gelöscht", R("klassenOverviewProfile.braintestDaily") === null);
  }

  section("'Fortschritt zurücksetzen' bricht ab, wenn die Sicherheitsabfrage verneint wird");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => false;
    R(`
      var p = createProfile("T"); p.klasse=5;
      klassenOverviewProfile = p;
      braintestResetProgress();
    `);
    ok("Klasse bleibt unverändert, wenn die Abfrage verneint wird", R("klassenOverviewProfile.klasse") === 5);
  }

  section("Reset rührt bewusst NICHTS anderes an (Münzen, andere Modi, Erfolge)");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => true;
    R(`
      var p = createProfile("T"); p.klasse=3; p.coins=250; p.wins=10; p.losses=2;
      p.modeStats.ordering = {played:5, correct:4};
      klassenOverviewProfile = p;
      braintestResetProgress();
    `);
    ok("Münzen bleiben unverändert", R("klassenOverviewProfile.coins") === 250);
    ok("Allgemeine Siege/Niederlagen bleiben unverändert", R("klassenOverviewProfile.wins") === 10 && R("klassenOverviewProfile.losses") === 2);
    ok("Andere Modus-Statistiken bleiben unverändert", JSON.stringify(R("klassenOverviewProfile.modeStats.ordering")) === JSON.stringify({ played: 5, correct: 4 }));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
