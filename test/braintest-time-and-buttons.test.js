/* Auf Wunsch: die beiden Haupt-Tasten unten in der Brain-Test-Übersicht
 * ("Übungstest starten/fortsetzen", "Haupttest starten") sind weg, da man
 * ja direkt auf die jeweilige Klasse tippen kann (öffnet den
 * Klassen-Detailbildschirm mit denselben Aktionen). Zusätzlich zeigt der
 * Klassen-Detailbildschirm jetzt die beim Haupttest benötigte Zeit an
 * (relevant für den Erfolg "Schnellster Kopf" - jede Klasse in unter 1
 * Minute). */
const { ok, section, finish, loadClient, startServer, post } = require("./helpers");

(async () => {
  section("Die beiden Haupt-Tasten sind aus der Übersicht verschwunden, stattdessen ein Hinweistext");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.klasse=0; renderKlassenOverview(p);');
    const html = state.last;
    ok("Kein direkter 'Übungstest starten/fortsetzen'-Knopf mehr (kein onclick=\"beginSolo(klassenOverviewProfile, false)\" außerhalb des Popups)", !html.includes('onclick="beginSolo(klassenOverviewProfile, false)"'));
    ok("Kein direkter 'Haupttest starten'-Knopf mehr (kein onclick=\"beginSolo(klassenOverviewProfile, true)\" außerhalb des Popups)", !html.includes('onclick="beginSolo(klassenOverviewProfile, true)"'));
    ok("Stattdessen ein Hinweistext, der zum Antippen der Klasse auffordert", html.includes("Tippe auf"));
    ok("Prestige- und Zurück-Knopf bleiben erhalten", html.includes("Prestige") && html.includes(">${t('btn_back')}<".replace("${t('btn_back')}", "ZURÜCK")) || html.includes("ZURÜCK"));
  }

  section("Der Hinweistext passt sich dem jeweiligen Zustand an (Start / Weiter / Haupttest bereit / gesperrt)");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.klasse=0; renderKlassenOverview(p);');
    ok("Ganz am Anfang: 'Übungstest zu starten'", state.last.includes("den Übungstest zu starten"));

    R('var p2=createProfile("T2"); p2.klasse=0; p2.braintestScores={0:{practice:{correct:48,total:50}}}; p2.haupttestUnlockedForKlasse=0; renderKlassenOverview(p2);');
    ok("Haupttest bereit: 'Haupttest zu starten'", state.last.includes("um den Haupttest zu starten"));

    R('var p3=createProfile("T3"); p3.klasse=0; p3.braintestGate={klasse:0,type:"needPractice"}; renderKlassenOverview(p3);');
    ok("Gesperrt (needPractice): Hinweis verweist auf die aktuelle Klasse", state.last.includes("Übungstest erneut zu versuchen"));

    R('var p4=createProfile("T4"); p4.klasse=1; p4.braintestGate={klasse:1,type:"needPriorMain"}; renderKlassenOverview(p4);');
    ok("Gesperrt (needPriorMain): Hinweis verweist auf die vorherige Klasse", state.last.includes("Tippe auf Klasse 1 oben, um die Sperre aufzuheben"));
  }

  section("Klassen-Detailbildschirm zeigt die Haupttest-Zeit an, grün hervorgehoben unter 1 Minute");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      var p=createProfile("T"); p.klasse=1; klassenOverviewProfile=p;
      p.braintestScores = {0:{main:{correct:19,total:20,elapsedSec:47}}};
      renderBrainTestClassModal(0);
    `);
    ok("Zeigt die Zeit (47s)", state.last.includes("47s"));
    ok("Hervorgehoben als 'unter 1 Min.'", state.last.includes("unter 1 Min."));
    ok("Nutzt das Blitz-Symbol für die schnelle Zeit", state.last.includes("⚡ 47s"));
  }
  section("Zeit über 1 Minute wird angezeigt, aber NICHT als 'unter 1 Minute' hervorgehoben");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      var p=createProfile("T"); p.klasse=1; klassenOverviewProfile=p;
      p.braintestScores = {0:{main:{correct:18,total:20,elapsedSec:78}}};
      renderBrainTestClassModal(0);
    `);
    ok("Zeigt die Zeit (78s)", state.last.includes("78s"));
    ok("KEIN 'unter 1 Min.'-Hinweis", !state.last.includes("unter 1 Min."));
    ok("Nutzt das Uhr-Symbol statt des Blitzes", state.last.includes("⏱️ 78s"));
  }
  section("Ohne je versuchten Haupttest erscheint keine Zeitanzeige (kein Absturz, kein 'undefined')");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); klassenOverviewProfile=p; renderBrainTestClassModal(0);');
    ok("Kein 'undefined' im Markup", !state.last.includes("undefined"));
    ok("Kein 's' (Sekunden-Suffix) ohne zugehörige Zahl - also keine leere Zeitanzeige", !/<div style="font-size:11px[^"]*">\s*s<\/div>/.test(state.last));
  }

  section("Die Zeit wird nach einem echten Haupttest-Durchlauf korrekt im Punktestand gespeichert");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p, true);');
    advance(15000); // 15 Sekunden vergehen lassen
    R('solo.correct = 19; solo.wrong = 1; solo.qIndex = solo.questions.length; solo.remaining = solo.timeLimit - 15;');
    R('endSoloRound();');
    const stored = R('p.braintestScores[0].main');
    ok("Punktestand gespeichert", stored.correct === 19 && stored.total === 20);
    ok("Zeit wurde mitgespeichert und liegt im plausiblen Bereich (ca. 15s)", typeof stored.elapsedSec === "number" && stored.elapsedSec >= 10 && stored.elapsedSec <= 20);
  }

  section("Server: elapsedSec wird korrekt validiert und übersteht einen erneuten Login");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "TimeTest", password: "test1234" });
    const token = reg.token;
    const save = await post(S.port, "/api/save-stats", {
      token, stats: { braintestScores: { 0: { main: { correct: 19, total: 20, elapsedSec: 47 } } } }
    });
    ok("elapsedSec korrekt gespeichert", save.profile.braintestScores["0"].main.elapsedSec === 47);
    const login = await post(S.port, "/api/login", { username: "TimeTest", password: "test1234" });
    ok("elapsedSec übersteht einen erneuten Login", login.profile.braintestScores["0"].main.elapsedSec === 47);

    const bad = await post(S.port, "/api/save-stats", {
      token, stats: { braintestScores: { 0: { main: { correct: 19, total: 20, elapsedSec: -5 } }, 1: { practice: { correct: 40, total: 50, elapsedSec: 999 } } } }
    });
    ok("Negative elapsedSec wird verworfen (kein Wert gespeichert)", bad.profile.braintestScores["0"].main.elapsedSec === undefined);
    ok("elapsedSec bei 'practice' wird ignoriert (nur beim Haupttest sinnvoll)", bad.profile.braintestScores["1"].practice.elapsedSec === undefined);
    await S.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
