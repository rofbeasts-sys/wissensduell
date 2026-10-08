/* Quick-Fire und Scattergories sind jetzt auch auf Englisch spielbar (vorher
 * "Only available in German"); Arena ist vorerst "Coming soon". */
const { ok, section, finish, loadClient, startServer, wsConnect, sleep, fs, path } = require("./helpers");

function latestState(h) {
  return [...(h.parsed || [])].reverse().find(m => m.availableRoundDefs);
}

(async () => {
  section("Menü: Arena zeigt 'Coming soon' (Deutsch und Englisch), keine Kachel mehr 'nur auf Deutsch'");
  {
    for (const lang of ["de", "en"]) {
      const C = loadClient(); const { R, state } = C;
      R(`currentLang = "${lang}"; renderMainMenu();`);
      ok(`[${lang}] Arena-Kachel zeigt Coming soon`, state.last.includes("Coming soon"));
      ok(`[${lang}] Arena-Kachel startet nichts (kein startArenaFlow im Menü)`, !state.last.includes("startArenaFlow()"));
      ok(`[${lang}] Keine Sperrhinweise mehr im Hauptmenü (Chess Fantasy sperrt erst im Chess-Bereich)`, (state.last.match(/Only available in German|Nur auf Deutsch verfügbar/g) || []).length === 0);
      ok(`[${lang}] Quick-Fire und Scattergories sind anklickbar`, state.last.includes("startDedicatedMenu('blitz')") && state.last.includes("startDedicatedMenu('slf')"));
    }
  }

  section("Client: englische Kategorien-Auswahl für Scattergories");
  {
    const C = loadClient(); const { R } = C;
    R('currentLang = "en";');
    ok("Englische Standard-Kategorien", R("slfDefaultCatsClient()")[0] === "City" && R("slfDefaultCatsClient().length") === 10);
    ok("Englische Vorschläge", R("slfSuggestedCats()").includes("Car brand"));
    R('currentLang = "de";');
    ok("Deutsche Standard-Kategorien bleiben", R("slfDefaultCatsClient()")[0] === "Stadt");
  }

  section("Datensatz: alle 34 englisch spielbaren Quick-Fire-Kategorien haben ein englisches Label");
  {
    const dsDe = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasets.json"), "utf8")).nennsBlitz;
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasetsEN.json"), "utf8"));
    const playable = Object.entries(dsDe).filter(([, v]) => !v.germanOnly).map(([k]) => k);
    const missing = playable.filter(k => !(en.nennsBlitz[k] && en.nennsBlitz[k].label));
    ok(`${playable.length} spielbare Kategorien, fehlend: ${missing.join(",") || "keine"}`, missing.length === 0 && playable.length === 34);
    ok("Kein englisches Label enthält Umlaute", Object.values(en.nennsBlitz).every(o => !/[äöüß]/.test(o.label)));
    const groups = new Set(playable.map(k => dsDe[k].group));
    ok("Alle Gruppen der Quick-Fire-Kategorien sind übersetzt", [...groups].every(g => en._groups[g]));
  }

  section("Server: Quick-Fire-Raum auf Englisch – englische Labels, deutschlandspezifische fehlen, Runde startet");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "Tester", language: "en", gameMode: "blitz" });
    await sleep(400);
    const st = latestState(h);
    ok("Raum-Status mit Rundenliste vorhanden", !!st);
    const defs = st.availableRoundDefs;
    ok("Planeten-Kategorie hat englisches Label", defs.some(d => d.id === "blitz_planeten" && d.label === "Quick-Fire: Planets (our solar system)"));
    ok("Bundesländer sind bei Englisch nicht dabei", !defs.some(d => d.id === "blitz_laender_bundeslaender"));
    ok("Kein Label enthält Umlaute", defs.every(d => !/[äöüß]/.test(d.label)));
    ok("Themengruppen sind englisch", defs.every(d => !/Entertainment & Medien|Alltag, Konsum|Natur & Wissenschaft|Geografie/.test(d.topicGroup || "")));
    h.send({ action: "setRoundMode", mode: "custom" });
    for (let i = 0; i < 5; i++) h.send({ action: "setRoundDef", index: i, defId: "blitz_planeten" });
    await sleep(300);
    h.send({ action: "startGame" });
    await sleep(2500);
    const start = h.find("nennsBlitzStart");
    ok("Runde startet mit englischem Label", !!start && start.label === "Planets (our solar system)");
    ok("Server lebt", S.alive());
    h.s.destroy();

    const hd = await wsConnect(S.port);
    hd.send({ action: "createRoom", name: "Tester", language: "de", gameMode: "blitz" });
    await sleep(400);
    const dd = latestState(hd).availableRoundDefs;
    ok("Deutscher Raum: weiterhin deutsches Label und Bundesländer", dd.some(d => d.id === "blitz_planeten" && d.label === "Quick-Fire: Planeten (unser Sonnensystem)") && dd.some(d => d.id === "blitz_laender_bundeslaender"));
    hd.s.destroy();
    await S.stop();
  }

  section("Server: Scattergories-Raum auf Englisch – Rundenarten verfügbar, englische Kategorien und Buchstabe");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "Tester", language: "en", gameMode: "slf" });
    await sleep(400);
    const st = latestState(h);
    ok("Original und Party-Mix verfügbar", st.availableRoundDefs.some(d => d.id === "slf_original") && st.availableRoundDefs.some(d => d.id === "slf_party"));
    ok("Party-Mix-Label englisch", st.availableRoundDefs.some(d => d.id === "slf_party" && /Party mix/.test(d.label)));
    h.send({ action: "setRoundMode", mode: "custom" });
    for (let i = 0; i < 5; i++) h.send({ action: "setRoundDef", index: i, defId: "slf_original" });
    await sleep(300);
    h.send({ action: "startGame" });
    await sleep(2500);
    const rs = h.find("slfRoundStart");
    ok("Runde startet", !!rs);
    ok("Kategorien sind die englischen Standard-Kategorien", !!rs && rs.categories[0] === "City" && rs.categories.includes("Car brand"));
    ok("Buchstabe ist gesetzt", !!rs && /^[A-Z]$/.test(rs.letter));
    h.send({ action: "slfSubmit", answers: { City: rs.letter + "ville" } });
    await sleep(300);
    ok("Server lebt nach einer Antwort", S.alive());
    h.s.destroy();

    const hp = await wsConnect(S.port);
    hp.send({ action: "createRoom", name: "Tester", language: "en", gameMode: "slf" });
    await sleep(400);
    hp.send({ action: "setRoundMode", mode: "custom" });
    for (let i = 0; i < 5; i++) hp.send({ action: "setRoundDef", index: i, defId: "slf_party" });
    await sleep(300);
    hp.send({ action: "startGame" });
    await sleep(2500);
    const ps = hp.find("slfRoundStart");
    ok("Party-Mix auf Englisch: 10 englische Kategorien", !!ps && ps.categories.length === 10 && ps.categories.every(c => !/[äöüß]/.test(c)) && !ps.categories.includes("Stadt"));
    hp.s.destroy();

    const hd = await wsConnect(S.port);
    hd.send({ action: "createRoom", name: "Tester", language: "de", gameMode: "slf" });
    await sleep(400);
    hd.send({ action: "setRoundMode", mode: "custom" });
    for (let i = 0; i < 5; i++) hd.send({ action: "setRoundDef", index: i, defId: "slf_original" });
    await sleep(300);
    hd.send({ action: "startGame" });
    await sleep(2500);
    const ds = hd.find("slfRoundStart");
    ok("Deutscher Raum: weiterhin deutsche Kategorien", !!ds && ds.categories[0] === "Stadt");
    hd.s.destroy();
    await S.stop();
  }

  section("Server: Sprache lässt sich im Scattergories-Raum umschalten; eigene Kategorien bleiben erhalten");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "Tester", language: "de", gameMode: "slf" });
    await sleep(400);
    h.send({ action: "setRoundMode", mode: "custom" });
    h.send({ action: "setSlfCustomRoundDef", index: 0, categories: ["Hobby", "Snack"] });
    await sleep(200);
    h.send({ action: "setLanguage", language: "en" });
    await sleep(300);
    const st = latestState(h);
    ok("Eigene Kategorien in Runde 1 bleiben bestehen", (st.roundDefs[0] || {}).id === "slf_custom" && st.roundDefs[0].categories.join() === "Hobby,Snack");
    ok("Server lebt", S.alive());
    h.s.destroy();
    await S.stop();
  }

  section("Kurze Menü-Beschreibungen (DE/EN) und Speed-Math-Menü nur noch Meilenstein + Order of Speed");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="de"; renderMainMenu();');
    ok("[de] Kurztexte im Hauptmenü", state.last.includes("Allein spielen, Rang steigern.") && state.last.includes("Bis zu 6 Spieler, Teams, viele Modi.") && state.last.includes("Schnell kopfrechnen.") && state.last.includes("Körper entdecken – inkl. Sexualkunde."));
    R('currentLang="en"; renderMainMenu();');
    ok("[en] Kurztexte im Hauptmenü", state.last.includes("Play solo and rank up.") && state.last.includes("Up to 6 players, teams, many modes.") && state.last.includes("Quick mental math.") && state.last.includes("Explore the body – incl. sex ed."));
    R('var p = createProfile("M"); renderSpeedMathEntry(p);');
    ok("Speed-Math-Menü: keine Zeitwahl mehr", !state.last.includes("startSpeedMathGame(") && !/Minute/.test(state.last));
    ok("Speed-Math-Menü: Meilenstein und Order of Speed vorhanden", state.last.includes("startSpeedMathMilestoneFlow") && state.last.includes("startOrderOfSpeedFlow"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
