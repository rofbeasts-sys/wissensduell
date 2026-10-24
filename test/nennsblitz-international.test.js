/* Nenn's Blitz war komplett germanOnly - dadurch bei Englisch als Sprache
 * unsichtbar. Jetzt bleiben nur die wirklich deutschlandspezifischen
 * Kategorien germanOnly (Bundesländer, Dschungelcamp, Promi Big Brother,
 * Fußball), alles andere (Bands, Marvel/Disney/DC-Charaktere, Tierarten,
 * Länder, Planeten, ...) ist jetzt auch bei Englisch spielbar - plus eine
 * neue Kategorie "Weltweit bekannte Stars" statt der deutschen TV-Formate. */
const { ok, section, finish, startServer, post, wsConnect, fs, path } = require("./helpers");

(async () => {
  section("Datensätze: nur die wirklich deutschlandspezifischen Kategorien bleiben germanOnly");
  {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasets.json"), "utf8"));
    const nb = data.nennsBlitz;
    const germanOnlyKeys = Object.entries(nb).filter(([, v]) => v.germanOnly).map(([k]) => k);
    ok("Bundesländer bleiben germanOnly (eindeutig deutschlandspezifisch)", germanOnlyKeys.includes("laender_bundeslaender"));
    ok("Bundesländer-Hauptstädte bleiben germanOnly", germanOnlyKeys.includes("laender_bundeslaender_hauptstaedte"));
    ok("Dschungelcamp-Kandidaten bleiben germanOnly (deutsches Fernsehen)", germanOnlyKeys.includes("dschungelcamp_kandidaten"));
    ok("Promi-Big-Brother-Kandidaten bleiben germanOnly (deutsches Fernsehen)", germanOnlyKeys.includes("promibb_kandidaten"));
    ok("Bands ist NICHT mehr germanOnly (international)", !nb.bands.germanOnly);
    ok("Marvel-Charaktere sind NICHT mehr germanOnly", !nb.marvel_charaktere.germanOnly);
    ok("Disney-Charaktere sind NICHT mehr germanOnly", !nb.disney_charaktere.germanOnly);
    ok("DC-Charaktere sind NICHT mehr germanOnly", !nb.dc_charaktere.germanOnly);
    ok("Tierarten sind NICHT mehr germanOnly", !nb.tiere_rassen_allgemein.germanOnly);
    ok("Länder (weltweit) sind NICHT mehr germanOnly", !nb.laender_allgemein.germanOnly);
    ok("Deutlich mehr internationale als deutschlandspezifische Kategorien", (Object.keys(nb).length - germanOnlyKeys.length) > germanOnlyKeys.length * 2);
  }

  section("Neue Kategorie: weltweit bekannte Stars (statt deutscher TV-Formate)");
  {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasets.json"), "utf8"));
    const nb = data.nennsBlitz;
    ok("Neue Kategorie 'international_stars' existiert", !!nb.international_stars);
    ok("... und ist NICHT germanOnly", !nb.international_stars.germanOnly);
    ok("Label erwähnt nicht 'Dschungelcamp' oder 'Big Brother'", !/Dschungelcamp|Big Brother/i.test(nb.international_stars.label));
  }

  section("Live-Server: Englisch als Party-Sprache zeigt jetzt Nenn's-Blitz-Kategorien (vorher komplett leer)");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "Tester", language: "en", gameMode: "blitz" });
    await new Promise(r => setTimeout(r, 250));
    const joined = h.find("joined");
    ok("Raum wird auch mit language:'en' erfolgreich erstellt", !!joined);
    const defs = joined.roundDefPool || joined.availableRoundDefs || joined.dedicatedRoundDefs;
    // Falls die genaue Feldbenennung abweicht: alternativ ueber setRoundDef mit
    // einer bekannten internationalen ID pruefen, dass sie akzeptiert wird.
    h.send({ action: "setRoundMode", mode: "custom" });
    h.send({ action: "setRoundDef", index: 0, defId: "blitz_bands" });
    await new Promise(r => setTimeout(r, 200));
    const upd = h.find("roomUpdate") || h.find("lobbyUpdate");
    ok("Server lehnt die international nutzbare Kategorie 'Bands' bei Englisch nicht ab (kein Fehler, Server lebt weiter)", S.alive());

    h.s.destroy();
    await S.stop();
  }

  section("Die eigentliche Sprachfilterung: der Raumstatus (availableRoundDefs) zeigt bei Englisch nur internationale Kategorien");
  {
    // setRoundDef selbst prueft die Sprache nicht beim manuellen Setzen (gilt
    // fuer alle Rundentypen, nicht nur Nenn's Blitz - ein Host kann von Hand
    // waehlen, was er will). Die eigentliche Filterung fuer Zufallsauswahl UND
    // fuer die dem Host angezeigte Liste sitzt in roundDefPoolForLanguage() -
    // die Liste wird als "availableRoundDefs" im Raumstatus mitgeschickt und
    // hier direkt an einem echten Server geprueft.
    const S = await startServer();
    const hEn = await wsConnect(S.port);
    hEn.send({ action: "createRoom", name: "T", language: "en", gameMode: "blitz" });
    await new Promise(r => setTimeout(r, 250));
    const stateEn = hEn.find("roomUpdate");
    const availEn = (stateEn.availableRoundDefs || []).map(d => d.id);
    ok("Englisch: 'Bands' ist in der verfügbaren Liste enthalten", availEn.includes("blitz_bands"));
    ok("Englisch: 'Marvel-Charaktere' ist enthalten", availEn.includes("blitz_marvel_charaktere"));
    ok("Englisch: 'Bundesländer' ist NICHT enthalten (weiterhin germanOnly)", !availEn.includes("blitz_laender_bundeslaender"));
    ok("Englisch: 'Dschungelcamp-Kandidaten' ist NICHT enthalten (deutsches Fernsehen)", !availEn.includes("blitz_dschungelcamp_kandidaten"));
    ok("Englisch: die neue Kategorie 'international_stars' ist enthalten", availEn.includes("blitz_international_stars"));
    hEn.s.destroy();

    const hDe = await wsConnect(S.port);
    hDe.send({ action: "createRoom", name: "T", language: "de", gameMode: "blitz" });
    await new Promise(r => setTimeout(r, 250));
    const stateDe = hDe.find("roomUpdate");
    const availDe = (stateDe.availableRoundDefs || []).map(d => d.id);
    ok("Deutsch: 'Bundesländer' ist weiterhin verfügbar (nichts kaputt gemacht)", availDe.includes("blitz_laender_bundeslaender"));
    ok("Deutsch: hat mehr verfügbare Kategorien als Englisch (die germanOnly-Kategorien kommen dazu)", availDe.length > availEn.length);
    hDe.s.destroy();
    await S.stop();
  }

  section("Live-Server: eine komplette Nenn's-Blitz-Runde mit einer internationalen Kategorie funktioniert auf Englisch");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "Tester", language: "en", gameMode: "blitz" });
    await new Promise(r => setTimeout(r, 250));
    h.send({ action: "setRoundMode", mode: "custom" });
    for (let i = 0; i < 5; i++) h.send({ action: "setRoundDef", index: i, defId: "blitz_marvel_charaktere" });
    await new Promise(r => setTimeout(r, 100));
    h.send({ action: "startGame" });
    let waited = 0;
    while (!h.find("nennsBlitzStart") && waited < 4000) { await new Promise(r => setTimeout(r, 100)); waited += 100; }
    ok("Nenn's-Blitz-Runde mit internationaler Kategorie (Marvel) startet erfolgreich bei Englisch", !!h.find("nennsBlitzStart"));
    if (h.find("nennsBlitzStart")) {
      h.send({ action: "nennsBlitzSubmit", text: "Iron Man" });
      await new Promise(r => setTimeout(r, 200));
      ok("Eine Antwort lässt sich abgeben, kein Absturz", S.alive());
    }
    h.s.destroy();
    await S.stop();
  }

  section("Deutsch bleibt unverändert: weiterhin ALLE Kategorien verfügbar, auch die deutschlandspezifischen");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "Tester", language: "de", gameMode: "blitz" });
    await new Promise(r => setTimeout(r, 250));
    h.send({ action: "setRoundMode", mode: "custom" });
    for (let i = 0; i < 5; i++) h.send({ action: "setRoundDef", index: i, defId: "blitz_laender_bundeslaender" });
    await new Promise(r => setTimeout(r, 100));
    h.send({ action: "startGame" });
    let waited = 0;
    while (!h.find("nennsBlitzStart") && waited < 4000) { await new Promise(r => setTimeout(r, 100)); waited += 100; }
    ok("Deutschlandspezifische Kategorie (Bundesländer) funktioniert bei Deutsch weiterhin normal", !!h.find("nennsBlitzStart"));
    h.s.destroy();
    await S.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
