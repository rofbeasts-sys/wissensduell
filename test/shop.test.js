/* Münzen-Shop (auf Wunsch): Münzen verdienen (Erfolge, bestandene
 * Haupttests), Herzen in Arena (serverautoritativ) und Speed-Math-
 * Meilenstein (clientseitig) damit auffüllen. */
const { ok, section, finish, loadClient, startServer, post, fs, path } = require("./helpers");

(async () => {
  section("Münzen verdienen: neu freigeschaltete Erfolge");
  {
    const C = loadClient(); const { R } = C;
    R('var p = createProfile("T");');
    const before = R('p.coins');
    // Ein leicht auszuloesender Erfolg: 1 richtige allgemeine Antwort
    R('achvRecord({t:"gen", n:1}, p);');
    const after = R('p.coins');
    ok("Münzstand startet bei 0", before === 0);
    ok("Erster Treffer löst noch keinen Erfolg aus ODER gibt Münzen, je nach Schwelle - jedenfalls kein Fehler", typeof after === "number" && after >= before);
  }
  section("Münzen verdienen: ein tatsächlich auslösbarer Erfolg gibt +5 Münzen");
  {
    const C = loadClient(); const { R } = C;
    R('var p = createProfile("T");');
    // 100 korrekte allgemeine Antworten - loest zuverlaessig mindestens einen Erfolg aus
    R('for(let i=0;i<100;i++) achvRecord({t:"gen", n:1}, p);');
    const unlockedCount = R('Object.values(p.achv.unlocked||{}).filter(Boolean).length') ?? R('Achv.normalize(p.achv).unlocked ? Object.keys(Achv.normalize(p.achv).unlocked).length : 0');
    ok("Mindestens ein Erfolg wurde freigeschaltet", R('p.coins') > 0);
    ok("Münzen sind ein Vielfaches von 5 (ACHV_COIN_REWARD)", R('p.coins') % 5 === 0);
  }

  section("Münzen verdienen: bestandener Haupttest gibt +10 Münzen");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p, true);');
    const coinsBefore = R('p.coins');
    R('solo.correct = solo.testNeeded; solo.wrong = 0; solo.qIndex = solo.questions.length;');
    R('endSoloRound();');
    ok("Haupttest bestanden gibt genau +10 Münzen", R('p.coins') === coinsBefore + 10);
  }
  section("Münzen verdienen: NICHT bestandener Haupttest gibt KEINE Münzen");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p, true);');
    R('solo.correct = 0; solo.wrong = solo.testNeeded; solo.qIndex = solo.questions.length;');
    R('endSoloRound();');
    ok("Kein Münzgewinn bei nicht bestandenem Haupttest", R('p.coins') === 0);
  }
  section("Münzen verdienen: bestandener ÜBUNGSTEST gibt KEINE Münzen (nur Haupttest zählt)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0; beginSolo(p, false);');
    R('solo.correct = solo.testNeeded; solo.wrong = 0; solo.qIndex = solo.questions.length;');
    R('endSoloRound();');
    ok("Kein Münzgewinn beim Übungstest", R('p.coins') === 0);
  }

  section("Shop: Meilenstein-Herz kaufen (clientseitig)");
  {
    const C = loadClient({ fakeTime: true }); const { R } = C;
    R('var p=createProfile("T"); p.coins=50; p.speedMathHearts=1; p.speedMathHeartsDate=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin"});');
    const ok1 = R('speedMathBuyHeart(p)');
    ok("Kauf erfolgreich (genug Münzen, nicht voll)", ok1 === true);
    ok("15 Münzen abgezogen", R('p.coins') === 35);
    ok("Ein Herz mehr", R('p.speedMathHearts') === 2);
  }
  section("Shop: Meilenstein-Herz NICHT kaufbar ohne genug Münzen");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.coins=5; p.speedMathHearts=1; p.speedMathHeartsDate=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin"});');
    const result = R('speedMathBuyHeart(p)');
    ok("Kauf schlägt fehl (zu wenig Münzen)", result === false);
    ok("Münzen unangetastet", R('p.coins') === 5);
    ok("Herzen unangetastet", R('p.speedMathHearts') === 1);
  }
  section("Shop: Meilenstein-Herz NICHT kaufbar bei bereits vollen Herzen");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.coins=50; p.speedMathHearts=3; p.speedMathHeartsDate=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin"});');
    const result = R('speedMathBuyHeart(p)');
    ok("Kauf schlägt fehl (bereits voll)", result === false);
    ok("Münzen unangetastet (kein Kauf durchgeführt)", R('p.coins') === 50);
  }

  section("Server: Arena-Herz kaufen - voller Ablauf mit echtem Server");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "ShopAcc", password: "test1234" });
    const token = reg.token;
    await post(S.port, "/api/save-stats", { token, stats: { coins: 50 } });
    await post(S.port, "/api/arena-start-match", { token }); // verbraucht 1 Herz -> 2 uebrig

    const buy = await post(S.port, "/api/arena-buy-heart", { token });
    ok("Kauf erfolgreich", buy.ok === true);
    ok("20 Münzen abgezogen (50 -> 30)", buy.coins === 30);
    ok("Ein Herz mehr (2 -> 3)", buy.hearts === 3);

    const status = await post(S.port, "/api/arena-status", { token });
    ok("Serverstand bestätigt: 30 Münzen", status.coins === 30);
    ok("Serverstand bestätigt: 3 Herzen (voll)", status.hearts === 3);
    await S.stop();
  }
  section("Server: Arena-Herz NICHT kaufbar ohne genug Münzen");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "ShopAcc2", password: "test1234" });
    const token = reg.token;
    await post(S.port, "/api/save-stats", { token, stats: { coins: 5 } });
    await post(S.port, "/api/arena-start-match", { token });
    const buy = await post(S.port, "/api/arena-buy-heart", { token });
    ok("Kauf wird abgelehnt (zu wenig Münzen)", buy.ok === false);
    const status = await post(S.port, "/api/arena-status", { token });
    ok("Münzen unangetastet (kein Teilkauf)", status.coins === 5);
    ok("Herzen unangetastet", status.hearts === 2);
    await S.stop();
  }
  section("Server: Arena-Herz NICHT kaufbar bei bereits vollen Herzen (auch mit genug Münzen)");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "ShopAcc3", password: "test1234" });
    const token = reg.token;
    await post(S.port, "/api/save-stats", { token, stats: { coins: 100 } });
    // Herzen NICHT verbraucht -> bereits voll (3/3)
    const buy = await post(S.port, "/api/arena-buy-heart", { token });
    ok("Kauf wird abgelehnt (bereits volle Herzen)", buy.ok === false);
    const status = await post(S.port, "/api/arena-status", { token });
    ok("Münzen unangetastet, da kein Kauf stattfand", status.coins === 100);
    await S.stop();
  }
  section("Server: Käufe über das Tageskontingent hinaus sind unmöglich (mehrfacher Kaufversuch)");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "ShopAcc4", password: "test1234" });
    const token = reg.token;
    await post(S.port, "/api/save-stats", { token, stats: { coins: 1000 } });
    await post(S.port, "/api/arena-start-match", { token }); // 2 uebrig
    let lastBuy;
    for (let i = 0; i < 5; i++) lastBuy = await post(S.port, "/api/arena-buy-heart", { token });
    const status = await post(S.port, "/api/arena-status", { token });
    ok("Herzen landen nie über dem Tageskontingent (max 3), egal wie oft gekauft wird", status.hearts === 3);
    ok("Nur EIN Kauf hat tatsächlich Münzen gekostet (1000 - 20 = 980)", status.coins === 980);
    await S.stop();
  }

  section("Shop-Bildschirm: zeigt den Münzstand und beide Kaufoptionen bei einem Konto");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      account = { token:"T", profile:{ username:"Pluto", klasse:0, coins:50, speedMathHearts:1, speedMathHeartsDate:new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin"}), modeStats:{} } };
      shopProfile = accountAsProfile();
      shopArenaInfo = { hearts: 2, maxHearts: 3 };
      renderShopScreen();
    `);
    const html = state.last;
    ok("Münzstand '50' wird angezeigt", html.includes("🪙 50") || html.includes(">50<"));
    ok("Meilenstein-Kaufoption vorhanden", html.includes("Speed-Math-Meilenstein-Herz"));
    ok("Arena-Kaufoption vorhanden (Konto vorhanden)", html.includes("Arena-Herz") && html.includes("20 – Herz auffüllen"));
  }
  section("Shop-Bildschirm: ohne Konto wird Arena als 'braucht ein Konto' angezeigt, nicht als Kaufoption");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      account = null;
      var p = createProfile("Lokal"); p.coins = 50; p.speedMathHearts = 1; p.speedMathHeartsDate = new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin"});
      shopProfile = p;
      renderShopScreen();
    `);
    const html = state.last;
    ok("Hinweis 'Dafür brauchst du ein Konto' erscheint", html.includes("Dafür brauchst du ein Konto"));
    ok("Kein aktiver Kauf-Button für Arena (kein 'Herz auffüllen' im Arena-Bereich)", !/Arena-Herz[\s\S]{0,150}Herz auffüllen/.test(html));
  }

  section("Shop-Zugang vom Hauptmenü aus vorhanden");
  {
    const C = loadClient(); const { R, state } = C;
    R('renderMainMenu();');
    ok("🪙 Shop-Knopf ist im Hauptmenü", state.last.includes("🪙 Shop") && state.last.includes("startShopFlow()"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
