/* Auf Wunsch: der Brain-Test-Reset wird zum Prestige-System (500 Münzen je
 * Stufe, bis zu 100 Stufen), dazu ein kaufbarer Extra-Haupttest-Versuch
 * (150 Münzen) bei der "needPractice"-Sperre - einmal pro Sperre, wird erst
 * wieder verfügbar, sobald der Übungstest regulär erneut bestanden wurde. */
const { ok, section, finish, loadClient, startServer, post } = require("./helpers");

(async () => {
  section("Prestige: Reset bringt 500 Münzen und zählt die Stufe hoch");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => true;
    R(`
      var p=createProfile("T"); p.klasse=5; p.coins=0;
      p.braintestScores = {0:{main:{correct:19,total:20}}};
      p.braintestGate = {klasse:3, type:"needPractice"};
      klassenOverviewProfile = p;
      braintestPrestige();
    `);
    ok("Klasse zurückgesetzt auf 0", R("p.klasse") === 0);
    ok("500 Münzen gutgeschrieben", R("p.coins") === 500);
    ok("Prestige-Zähler auf 1", R("p.braintestPrestige") === 1);
    ok("Punktestände gelöscht", JSON.stringify(R("p.braintestScores")) === "{}");
    ok("Sperre gelöscht", R("p.braintestGate") === null);
  }

  section("Prestige: mehrfach möglich, Münzen summieren sich");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => true;
    R('var p=createProfile("T"); p.coins=0; klassenOverviewProfile=p;');
    for (let i = 0; i < 3; i++) R('braintestPrestige();');
    ok("3x Prestige -> 1500 Münzen (3x500)", R("p.coins") === 1500);
    ok("Prestige-Zähler auf 3", R("p.braintestPrestige") === 3);
  }

  section("Prestige: Deckel bei 100 - danach keine Münzen mehr, Zähler bleibt bei 100");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => true;
    R('var p=createProfile("T"); p.braintestPrestige=100; p.coins=50; klassenOverviewProfile=p;');
    R('braintestPrestige();');
    ok("Keine weiteren Münzen bei bereits erreichtem Deckel", R("p.coins") === 50);
    ok("Zähler bleibt bei 100 (nicht 101)", R("p.braintestPrestige") === 100);
    ok("Reset selbst funktioniert trotzdem noch (Klasse zurückgesetzt)", R("p.klasse") === 0);
  }

  section("Prestige: bricht ab, wenn die Sicherheitsabfrage verneint wird");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => false;
    R('var p=createProfile("T"); p.klasse=5; p.coins=100; klassenOverviewProfile=p; braintestPrestige();');
    ok("Nichts verändert sich", R("p.klasse") === 5 && R("p.coins") === 100);
  }

  section("Extra-Versuch kaufen: kostet 150 Münzen, hebt die Sperre auf, gibt einen Tagesversuch zurück");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => true;
    R(`
      var p=createProfile("T"); p.klasse=0; p.coins=200;
      p.braintestGate = {klasse:0, type:"needPractice"};
      p.braintestDaily = {klasse:0, date: braintestToday(), practiceAttempts:0, mainAttempts:3};
      klassenOverviewProfile = p;
      braintestBuyExtraAttempt();
    `);
    ok("150 Münzen abgezogen (200 -> 50)", R("p.coins") === 50);
    ok("Sperre aufgehoben", R("p.braintestGate") === null);
    ok("Ein Tagesversuch zurückgegeben (3 -> 2)", R("p.braintestDaily.mainAttempts") === 2);
    ok("Als genutzt markiert", R("p.braintestExtraAttemptUsed") === true);
  }

  section("Extra-Versuch: nur einmal pro Sperre - zweiter Versuch im selben Zyklus wird abgelehnt");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => true;
    R(`
      var p=createProfile("T"); p.klasse=0; p.coins=500;
      p.braintestGate = {klasse:0, type:"needPractice"};
      p.braintestDaily = {klasse:0, date: braintestToday(), practiceAttempts:0, mainAttempts:3};
      klassenOverviewProfile = p;
      braintestBuyExtraAttempt();
    `);
    const coinsAfterFirst = R("p.coins");
    R('p.braintestGate = {klasse:0, type:"needPractice"}; braintestBuyExtraAttempt();'); // erneut gesperrt simuliert
    ok("Zweiter Kaufversuch im selben Zyklus kostet nichts (wird abgelehnt)", R("p.coins") === coinsAfterFirst);
  }

  section("Extra-Versuch: wird wieder verfügbar, sobald der Übungstest regulär erneut bestanden wurde");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; p.braintestExtraAttemptUsed=true;');
    for (let i = 0; i < 3; i++) { R('beginSolo(p, true);'); R('solo.correct=10; solo.wrong=10; solo.qIndex=solo.questions.length; endSoloRound();'); }
    ok("Sperre ist aktiv", JSON.stringify(R("p.braintestGate")) === JSON.stringify({ klasse: 0, type: "needPractice" }));
    R('beginSolo(p, false);');
    R('solo.correct=48; solo.wrong=2; solo.qIndex=solo.questions.length; endSoloRound();');
    ok("Extra-Versuch-Nutzung ist nach bestandenem Übungstest zurückgesetzt", R("p.braintestExtraAttemptUsed") === false);
  }

  section("Extra-Versuch: ohne genug Münzen wird abgelehnt, keine Abbuchung");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => true; sb.alert = () => {};
    R(`
      var p=createProfile("T"); p.klasse=0; p.coins=50;
      p.braintestGate = {klasse:0, type:"needPractice"};
      p.braintestDaily = {klasse:0, date: braintestToday(), practiceAttempts:0, mainAttempts:3};
      klassenOverviewProfile = p;
      braintestBuyExtraAttempt();
    `);
    ok("Münzen unverändert (50)", R("p.coins") === 50);
    ok("Sperre bleibt bestehen", R("p.braintestGate") !== null);
  }

  section("Extra-Versuch: Knopf nur sichtbar, wenn tatsächlich 'needPractice' gesperrt (Übersicht verweist nur noch per Hinweistext auf die Klasse, der Kauf-Knopf selbst steckt im Klassen-Detailbildschirm)");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.klasse=2; p.coins=500; klassenOverviewProfile=p; renderKlassenOverview(p);');
    ok("Kein Kauf-Knopf in der Übersicht ohne Sperre", !state.last.includes("einen Haupttest-Versuch dazukaufen"));
    R('p.braintestGate = {klasse:2, type:"needPractice"}; renderKlassenOverview(p);');
    ok("Übersicht verweist bei Sperre per Hinweistext auf die Klasse (kein eigener Knopf mehr dort)", state.last.includes("Übungstest erneut zu versuchen"));
    R('renderBrainTestClassModal(2);');
    ok("Kauf-Knopf erscheint im Klassen-Detailbildschirm bei aktiver 'needPractice'-Sperre", state.last.includes("einen Haupttest-Versuch dazukaufen"));
  }

  section("Übersicht zeigt den Prestige-Knopf mit aktuellem Stand");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.braintestPrestige=7; klassenOverviewProfile=p; renderKlassenOverview(p);');
    ok("Zeigt '7/100' im Prestige-Knopf", state.last.includes("7/100"));
    ok("Zeigt den Münzbetrag (500)", /Prestige[\s\S]{0,80}500/.test(state.last));
  }

  section("Server: braintestPrestige und braintestExtraAttemptUsed werden korrekt gespeichert und überstehen einen erneuten Login");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "PrestigeSync", password: "test1234" });
    const token = reg.token;
    const save = await post(S.port, "/api/save-stats", { token, stats: { braintestPrestige: 42, braintestExtraAttemptUsed: true, coins: 21000 } });
    ok("Speichern erfolgreich", save.ok);
    ok("braintestPrestige korrekt gespeichert (42)", save.profile.braintestPrestige === 42);
    ok("braintestExtraAttemptUsed korrekt gespeichert (true)", save.profile.braintestExtraAttemptUsed === true);
    const login = await post(S.port, "/api/login", { username: "PrestigeSync", password: "test1234" });
    ok("braintestPrestige übersteht einen erneuten Login", login.profile.braintestPrestige === 42);
    ok("braintestExtraAttemptUsed übersteht einen erneuten Login", login.profile.braintestExtraAttemptUsed === true);
    await S.stop();
  }

  section("Client: accountAsProfile() gibt Prestige und ExtraAttemptUsed korrekt weiter");
  {
    const C = loadClient(); const { R } = C;
    R('account = { token:"t", profile: { username:"x", klasse:0, braintestPrestige: 13, braintestExtraAttemptUsed: true } };');
    const p = R("accountAsProfile()");
    ok("braintestPrestige übernommen (13)", p.braintestPrestige === 13);
    ok("braintestExtraAttemptUsed übernommen (true)", p.braintestExtraAttemptUsed === true);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
