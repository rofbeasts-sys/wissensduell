/* Englisch durchgehend: bisher waren viele Texte der englischen Oberfläche
 * fest auf Deutsch geschrieben (nur die Teile im I18N-Wörterbuch waren
 * übersetzt). Jetzt gibt es dafür den Helfer L(de, en): Deutsch bleibt
 * Deutsch, JEDE andere Sprache bekommt Englisch.
 * Außerdem: englischer Biologie-Pool (360 Fragen) und ein englisches
 * Overlay für die Drag-and-Drop-/Higher-or-Lower-Kategorien im Server
 * (Label, Einheit, Themengruppe, Elementnamen) sowie englische Bot-Stufen. */
const { ok, section, finish, loadClient, startServer, wsConnect, sleep } = require("./helpers");
const fs = require("fs"), path = require("path");

// Eindeutig deutsche Wörter (Groß-/Kleinschreibung beachtet) + Umlaute.
const GERMAN = /\b(und|oder|nicht|mit|für|Wähle|wähle|zurück|ZURÜCK|Fragen|Frage|Runde|Runden|Spieler|Münzen|Herzen|Erfolge|Einstellungen|Anmelden|Konto|Klasse|Haupttest|Übungstest|Punkte|jetzt|Siege|Niederlagen|Gürtel|richtig|falsch|Sekunden|Minuten|Gegen|Allein|Willkommen|Zahlen|Tippe)\b|[äöüßÄÖÜ]/;
const visible = html => (html || "").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, "\n").replace(/&[a-z#0-9]+;/g, " ").split("\n").map(s => s.trim()).filter(Boolean);
const germanLines = html => [...new Set(visible(html).filter(l => GERMAN.test(l)))];

(async () => {
  section("L(de, en): Deutsch bleibt Deutsch, jede andere Sprache bekommt Englisch");
  {
    const C = loadClient(); const { R } = C;
    R('currentLang="de";'); ok("de -> Deutsch", R('L("Hallo","Hello")') === "Hallo");
    R('currentLang="en";'); ok("en -> Englisch", R('L("Hallo","Hello")') === "Hello");
    R('currentLang="ja";'); ok("ja -> Englisch (statt versehentlich Deutsch)", R('L("Hallo","Hello")') === "Hello");
  }

  section("Die Prüfung erkennt Deutsch überhaupt (Gegenprobe: deutsches Hauptmenü wird als deutsch erkannt)");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="de"; renderMainMenu();');
    ok("Deutsches Menü enthält erkennbar deutsche Zeilen", germanLines(state.last).length >= 5);
  }

  section("Englische Oberfläche: wichtige Bildschirme enthalten keinen deutschen Text mehr");
  {
    const screens = {
      "Hauptmenü": "renderMainMenu()",
      "Anmeldung": "renderAccountAuth('login')",
      "Registrierung": "renderAccountAuth('register')",
      "Freunde": "renderFriendsList()",
      "Solo-Menü": "startSoloMenu()",
      "Drag and Drop (Menü)": "startDedicatedMenu('ordering')",
      "Higher or Lower (Menü)": "startDedicatedMenu('higherlower')",
      "Party-Einstieg": "startPartyFlow('mixed')",
      "Speed Math (Einstieg)": "var p=createProfile('T'); speedMathProfile=p; renderSpeedMathEntry(p)",
      "Speed Math (Meilenstein)": "var p=createProfile('T'); speedMathProfile=p; renderSpeedMathMilestoneEntry(p)",
      "Order of Speed (Einstieg)": "var p=createProfile('T'); speedMathProfile=p; renderOrderOfSpeedEntry(p)",
      "Tic Tac Toe (Gürtel)": "var p=createProfile('T'); tttOverviewProfile=p; renderTttRankOverview(p)",
      "Quantum (Einstieg)": "var p=createProfile('T'); tttOverviewProfile=p; tttQuantumEntry(p)",
      "Statistik": "var p=createProfile('T'); renderStatistik()",
      "Erfolge": "var p=createProfile('T'); startAchievementsFlow()",
      "Brain Test (Übersicht)": "var p=createProfile('T'); p.klasse=2; klassenOverviewProfile=p; renderKlassenOverview(p)",
      "Brain Test (Klassen-Popup)": "var p=createProfile('T'); p.klasse=2; klassenOverviewProfile=p; renderBrainTestClassModal(0)",
      "Brain Test (Sperr-Popup)": "var p=createProfile('T'); p.klasse=2; p.haupttestUnlockedForKlasse=2; p.braintestGate={klasse:2,type:'needPractice'}; klassenOverviewProfile=p; renderBrainTestClassModal(2)",
      "Profilbild-Auswahl": "var p=createProfile('T'); renderAvatarPicker(p.id, renderMainMenu)",
      "Biologie (Themenliste)": "var p=createProfile('T'); biologyProfile=p; renderBiologyTopics(p)",
      "Biologie (Frage)": "var p=createProfile('T'); biologyProfile=p; startBiologyTopic('body','herz')",
      "Biologie (Ergebnis)": "var p=createProfile('T'); biologyProfile=p; startBiologyTopic('body','herz'); for(let i=0;i<20;i++){ handleBiologyAnswer(biologySession.items[biologySession.qIndex].c); biologyNext(); }",
      "Solo-Quiz (Frage)": "var p=createProfile('T'); p.klasse=1; beginSolo(p,false)",
      "Lokaler Mehrspieler": "startMPFlow()"
    };
    for (const [name, code] of Object.entries(screens)) {
      const C = loadClient(); const { R, state } = C;
      let err = null;
      try { R('currentLang="en";'); R(code); } catch (e) { err = e.message; }
      const bad = germanLines(state.last);
      ok(`[en] ${name}: kein deutscher Text${bad.length ? " – gefunden: " + bad.slice(0, 3).join(" | ") : ""}${err ? " (Fehler: " + err.slice(0, 60) + ")" : ""}`, !err && bad.length === 0);
    }
    const C = loadClient(); const { R, state } = C;
    R('currentLang="ja"; renderMainMenu();');
    ok("[ja] Hauptmenü: die bisher fest deutschen Zeilen sind jetzt Englisch statt Deutsch", !germanLines(state.last).some(l => /Einstellungen|Online-Modus|Kopfrechnen|Körper entdecken/.test(l)));
  }

  section("Deutsch bleibt unverändert (keine Regression bei den umgestellten Stellen)");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="de"; renderMainMenu();');
    const t = visible(state.last).join("\n");
    ["Einstellungen", "Anmelden", "Online-Modus", "Kopfrechnen gegen die Uhr", "Körper entdecken", "Erfolge", "Drag and Drop"].forEach(w => ok(`[de] Menü enthält weiterhin '${w}'`, t.includes(w)));
    R('currentLang="de"; renderAccountAuth("login");');
    ok("[de] Anmeldung: 'Noch kein Konto?'", visible(state.last).join("\n").includes("Noch kein Konto?"));
    R('currentLang="de"; var p=createProfile("T"); tttOverviewProfile=p; renderTttRankOverview(p);');
    ok("[de] Tic-Tac-Toe-Gürtel heißen weiter 'Weißer Gürtel'", visible(state.last).join("\n").includes("Weißer Gürtel"));
    R('currentLang="en";');
    ok("[en] Gürtel heißen 'White belt'", R("TTT_RANKS[0].name") === "White belt" && R("TTT_RANKS[6].name") === "Master");
  }

  section("Englischer Biologie-Pool: 18 Themen x 20 Fragen, gleiche Schlüssel wie Deutsch, strukturell gültig");
  {
    const C = loadClient(); const { R } = C;
    const de = R("BIOLOGY_TOPICS"), en = R("BIOLOGY_TOPICS_EN");
    for (const sec of ["body", "sexualkunde"]) {
      ok(`[${sec}] gleiche Themen-Schlüssel wie Deutsch`, JSON.stringify(Object.keys(en[sec])) === JSON.stringify(Object.keys(de[sec])));
      Object.entries(en[sec]).forEach(([k, v]) => {
        ok(`[${sec}/${k}] genau 20 gültige Fragen, Label+Icon vorhanden`, v.items.length === 20 && !!v.label && !!v.icon && v.items.every(q => q.a.length === 4 && new Set(q.a).size === 4 && q.c >= 0 && q.c < 4 && q.e));
      });
    }
    ok("biologyTopics() liefert bei de den deutschen, bei en den englischen Pool", (R('currentLang="de"; biologyTopics().body.herz.label') === "Herz") && (R('currentLang="en"; biologyTopics().body.herz.label') === "Heart"));
  }

  section("Biologie auf Englisch: englische Fragen, gemischte Antwortpositionen, Fortschritt zählt unter denselben Schlüsseln");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="en"; var p=createProfile("T"); biologyProfile=p; startBiologyTopic("body","herz");');
    ok("Erste Frage ist englisch (kein deutscher Text)", germanLines(state.last).length === 0);
    const pos = [0, 0, 0, 0];
    for (let r = 0; r < 25; r++) { R('startBiologyTopic("body","herz");'); R("biologySession.items").forEach(q => pos[q.c]++); }
    ok(`Richtige Antwort steht nicht immer an erster Stelle (Verteilung ${pos.join("/")})`, pos.every(n => n > 60));
    R('startBiologyTopic("body","herz"); for(let i=0;i<20;i++){ handleBiologyAnswer(biologySession.items[biologySession.qIndex].c); biologyNext(); }');
    ok("Thema 'herz' zählt als erledigt und perfekt (gleicher Schlüssel wie im deutschen Pool)", R("p.biologyDone.herz") === true && R("p.biologyPerfect.herz") === true);
    R('currentLang="de"; startBiologyTopic("body","herz");');
    ok("Auf Deutsch sind es weiter die deutschen Fragen", R("biologySession.items.every(q => /[a-zäöüß]/i.test(q.q)) && biologySession.items[0].q.length > 5") && germanLines(state.last).length > 0);
    R('currentLang="en"; var p2=createProfile("U"); biologyProfile=p2; renderBiologyTopics(p2);');
    ok("Sperrtext nennt 20/20 (nicht mehr 5/5)", visible(state.last).join(" ").includes("20/20") && !visible(state.last).join(" ").includes("5/5"));
  }

  section("Server-Overlay (partyDatasetsEN.json): vollständig und konsistent zu den Original-Datensätzen");
  {
    const src = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasets.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasetsEN.json"), "utf8"));
    let expected = 0, missing = [], badIds = [], untranslatedUnits = [];
    for (const g of ["ordering", "higherLower"]) {
      Object.entries(src[g]).forEach(([k, ds]) => {
        if (ds.germanOnly) return;
        expected++;
        const ov = en[g][k];
        if (!ov || !ov.label) { missing.push(g + "/" + k); return; }
        const ids = new Set(ds.items.map(i => i.id));
        Object.keys(ov.names || {}).forEach(id => { if (!ids.has(id)) badIds.push(k + ":" + id); });
        if (!ov.unit && /Mio|Mrd|Einwohner|Titel|Episoden|Jahre|Plätze|Tore/.test(ds.unit || "")) untranslatedUnits.push(k);
      });
    }
    ok(`Alle ${expected} englisch spielbaren Kategorien haben ein englisches Label (fehlend: ${missing.join(",") || "keine"})`, expected === 53 && missing.length === 0);
    ok("Alle übersetzten Element-IDs gibt es im Original", badIds.length === 0);
    ok("Keine Einheit mit deutschem Text ohne Übersetzung", untranslatedUnits.length === 0);
    ok("Kein englisches Label enthält Umlaute oder alte Modus-Präfixe", Object.values(en.ordering).concat(Object.values(en.higherLower)).every(o => !/[äöüß]/.test(o.label) && !/Einordnen|Mehr oder Weniger/.test(o.label)));
    ok("Alle 8 Themengruppen sind übersetzt", Object.keys(en._groups).length === 8);
  }

  section("Live-Server: englischer Raum liefert englische Labels/Gruppen/Namen, deutscher Raum bleibt unverändert");
  {
    const S = await startServer();
    const he = await wsConnect(S.port);
    he.send({ action: "createRoom", name: "E", language: "en", gameMode: "ordering" });
    await sleep(300);
    const re = he.parsed.filter(m => m.type === "roomUpdate").pop();
    const defsEn = re.availableRoundDefs;
    ok("[en] alle Labels beginnen mit 'Drag and Drop: ' (oder sind die Planeten-Kategorie)", defsEn.filter(d => d.kind === "orderingGame").every(d => /^Drag and Drop: |^Planets /.test(d.label)));
    ok("[en] kein Label enthält Umlaute", defsEn.every(d => !/[äöüß]/.test(d.label)));
    ok("[en] Themengruppen sind englisch (z.B. 'Sports', 'Geography')", defsEn.some(d => d.topicGroup === "Sports") && defsEn.some(d => d.topicGroup === "Geography") && !defsEn.some(d => d.topicGroup === "Geografie"));
    ok("[en] 'Wissenstest' (nur Deutsch) ist nicht im Pool", !defsEn.some(d => d.kind === "knowledgeQuiz"));

    he.send({ action: "addBot" }); await sleep(250);
    const re2 = he.parsed.filter(m => m.type === "roomUpdate").pop();
    ok("[en] Bot-Stufen englisch", re2.botTierOptions.map(o => o.label).join(",") === "Dumb,Beginner,Smart,Doctor,Scientist");
    ok("[en] Bot-Spieler zeigt englische Stufe", re2.players.some(p => p.isBot && p.botTierLabel === "Smart"));

    he.send({ action: "setRoundMode", mode: "custom" }); await sleep(200);
    // Alle Slots belegen (sonst wuerfelt der Server beim Start den kompletten Plan neu)
    for (let i = 0; i < 5; i++) { he.send({ action: "setRoundDef", index: i, defId: "order_planeten_abstand" }); await sleep(120); }
    const re3 = he.parsed.filter(m => m.type === "roomUpdate").pop();
    ok("[en] gewählte Runde erscheint mit englischem Label im Rundenplan", re3.roundDefs[0] && re3.roundDefs[0].label === "Planets by distance from the Sun");
    he.send({ action: "startGame" });
    let w = 0; while (!he.find("orderingState") && w < 4000) { await sleep(100); w += 100; }
    const st = he.find("orderingState");
    ok("[en] Runde: englisches Label, englische Einheit und englische Elementnamen", !!st && st.label === "Planets by distance from the Sun" && st.unit === "Million km from the Sun" && st.pool.map(p => p.name).some(n => /Mercury|Earth|Neptune/.test(n)) && !st.pool.map(p => p.name).some(n => /Merkur|Erde|Neptun\b/.test(n)));

    const hj = await wsConnect(S.port);
    hj.send({ action: "createRoom", name: "J", language: "fr", gameMode: "ordering" });
    await sleep(300);
    const rj = hj.parsed.filter(m => m.type === "roomUpdate").pop();
    ok("[fr] (Server kennt de/en/fr/es) bekommt ebenfalls das englische Overlay statt Deutsch", rj.availableRoundDefs.some(d => d.label === "Drag and Drop: Mountains (height)"));

    const hd = await wsConnect(S.port);
    hd.send({ action: "createRoom", name: "D", language: "de", gameMode: "ordering" });
    await sleep(300);
    const rd = hd.parsed.filter(m => m.type === "roomUpdate").pop();
    ok("[de] Labels bleiben deutsch (mit neuem Modus-Präfix)", rd.availableRoundDefs.some(d => d.label === "Drag and Drop: Berge (Höhe)") && rd.availableRoundDefs.some(d => d.topicGroup === "Geografie"));
    hd.send({ action: "addBot" }); await sleep(250);
    const rd2 = hd.parsed.filter(m => m.type === "roomUpdate").pop();
    ok("[de] Bot-Stufen bleiben deutsch", rd2.botTierOptions.map(o => o.label).join(",") === "Dumm,Einsteiger,Schlau,Doktor,Wissenschaftler");
    await S.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
