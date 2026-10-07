/* Auf Wunsch heißen vier Modi jetzt überall gleich - egal welche Sprache
 * eingestellt ist (einfacher, weil es dieselben Namen sind):
 *   Einordnen          -> Drag and Drop
 *   Mehr oder Weniger  -> Higher or Lower
 *   Stadt Land Fluss   -> Scattergories
 *   Nenn's Blitz       -> Quick-Fire
 * Betrifft Menükarten, Bildschirmtitel, Statistik, Erfolge (Deutsch UND
 * Englisch), Rundenbau, Server-Labels und die Datensatz-Präfixe. Die
 * Fragen selbst bleiben unverändert (nur die Modus-Namen sind gemeint). */
const { ok, section, finish, loadClient, startServer, wsConnect, sleep } = require("./helpers");
const Achv = require("../public/achievements.js");
const fs = require("fs"), path = require("path");

const NEW_NAMES = ["Drag and Drop", "Higher or Lower", "Scattergories", "Quick-Fire"];
const OLD_NAMES = ["Einordnen", "Mehr oder Weniger", "Stadt Land Fluss", "Nenn's Blitz"];

(async () => {
  section("Hauptmenü zeigt die neuen Namen - auf Deutsch UND auf Englisch identisch");
  {
    for (const lang of ["de", "en"]) {
      const C = loadClient(); const { R, state } = C;
      R(`currentLang="${lang}"; renderMainMenu();`);
      NEW_NAMES.forEach(n => ok(`[${lang}] Menü zeigt '${n}'`, state.last.includes(n)));
      OLD_NAMES.forEach(n => ok(`[${lang}] Menü zeigt NICHT mehr '${n}'`, !state.last.includes(n)));
    }
  }

  section("DEDICATED_MODES: Titel und Bildschirmtitel (Großbuchstaben) sind aktualisiert");
  {
    const C = loadClient(); const { R } = C;
    const m = R("DEDICATED_MODES");
    ok("ordering", m.ordering.title === "Drag and Drop" && m.ordering.screenTitle === "DRAG AND DROP");
    ok("higherlower", m.higherlower.title === "Higher or Lower" && m.higherlower.screenTitle === "HIGHER OR LOWER");
    ok("slf", m.slf.title === "Scattergories" && m.slf.screenTitle === "SCATTERGORIES");
    ok("blitz", m.blitz.title === "Quick-Fire" && m.blitz.screenTitle === "QUICK-FIRE");
  }

  section("Statistik: die drei betroffenen Kacheln tragen die neuen Namen");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); renderStatistik();');
    ["Drag and Drop", "Higher or Lower", "Scattergories"].forEach(n => ok(`Statistik zeigt '${n}'`, state.last.includes(n)));
    ok("Keine alten Namen mehr in der Statistik", !["Einordnen", "Mehr oder Weniger", "Stadt Land Fluss"].some(n => state.last.includes(n)));
  }

  section("Erfolge: Kategorien UND Beschreibungen nennen die neuen Namen (Deutsch wie Englisch)");
  {
    const catDe = id => Achv.getCategoryTitle(id, "de"), catEn = id => Achv.getCategoryTitle(id, "en");
    [["ordering", "Drag and Drop"], ["mow", "Higher or Lower"], ["blitz", "Quick-Fire"], ["slf", "Scattergories"]].forEach(([id, name]) => {
      ok(`Kategorie '${id}': Deutsch = '${name}'`, catDe(id) === name);
      ok(`Kategorie '${id}': Englisch = '${name}' (identisch)`, catEn(id) === name);
    });
    const allText = Achv.DEFS.flatMap(d => ["de", "en"].map(l => Achv.getTitle(d.id, l) + " " + Achv.getDesc(d.id, l))).join("\n");
    OLD_NAMES.forEach(n => ok(`In keinem Erfolgstext steht noch '${n}'`, !allText.includes(n)));
    ok("Auch die alten englischen Namen 'Sorting'/'More or Less'/'Quick Naming' sind raus", !/Sorting|More or Less|Quick Naming/.test(allText));
    ok("Die deutsche Beschreibung nennt den neuen Namen", Achv.getDesc("ord_complete", "de").includes("Drag-and-Drop"));
    ok("Die englische Beschreibung nennt den neuen Namen", Achv.getDesc("ord_complete", "en").includes("Drag and Drop"));
  }

  section("Rundenbau und Multiplayer-Titel");
  {
    const C = loadClient(); const { R } = C;
    const meta = R("PARTY_MODE_META");
    ok("Rundenbau: orderingGame/higherLowerGame/stadtLandFluss heißen jetzt neu", meta.orderingGame === "Drag and Drop" && meta.higherLowerGame === "Higher or Lower" && meta.stadtLandFluss === "Scattergories");
    const src = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    ok("Multiplayer-Titel 'SCATTERGORIES – MULTIPLAYER'", src.includes("'SCATTERGORIES – MULTIPLAYER'"));
    ok("Multiplayer-Titel 'QUICK-FIRE – MULTIPLAYER'", src.includes("'QUICK-FIRE – MULTIPLAYER'"));
  }

  section("Datensätze und Server-Labels: Präfixe sind umbenannt, nichts Altes mehr übrig");
  {
    const raw = fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasets.json"), "utf8");
    ok("Keine 'Einordnen: '-Präfixe mehr", !raw.includes('"Einordnen: '));
    ok("Keine 'Mehr oder Weniger: '-Präfixe mehr", !raw.includes('"Mehr oder Weniger: '));
    ok("29 'Drag and Drop: '-Präfixe vorhanden", (raw.match(/"Drag and Drop: /g) || []).length === 29);
    ok("29 'Higher or Lower: '-Präfixe vorhanden", (raw.match(/"Higher or Lower: /g) || []).length === 29);
    JSON.parse(raw);
    ok("JSON bleibt gültig", true);
  }

  section("Live-Server: Rundenlabels kommen mit den neuen Präfixen an (Einordnen, Mehr oder Weniger, Quick-Fire, Scattergories)");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "A", language: "de", gameMode: "mixed" });
    await sleep(300);
    const ru = h.parsed.filter(m => m.type === "roomUpdate").pop();
    const labels = (ru.availableRoundDefs || []).map(d => d.label);
    ok("Es gibt 'Drag and Drop: ...'-Labels", labels.some(l => l.startsWith("Drag and Drop: ")));
    ok("Es gibt 'Higher or Lower: ...'-Labels", labels.some(l => l.startsWith("Higher or Lower: ")));
    ok("Es gibt 'Quick-Fire: ...'-Labels", labels.some(l => l.startsWith("Quick-Fire: ")));
    ok("Keine Labels mit den alten Präfixen", !labels.some(l => /^(Einordnen|Mehr oder Weniger|Nenn's Blitz): /.test(l)));

    const hs = await wsConnect(S.port);
    hs.send({ action: "createRoom", name: "S", language: "de", gameMode: "slf" });
    await sleep(300);
    const rs = hs.parsed.filter(m => m.type === "roomUpdate").pop();
    const slfLabels = (rs.availableRoundDefs || []).map(d => d.label);
    ok("Scattergories-Labels beginnen mit 'Scattergories: '", slfLabels.length > 0 && slfLabels.every(l => l.startsWith("Scattergories: ")));
    await S.stop();
  }

  section("Der Präfix wird im Client weiterhin sauber abgeschnitten (shortLabel arbeitet generisch beim ersten ': ')");
  {
    const C = loadClient(); const { R } = C;
    ok("'Drag and Drop: Planeten' -> 'Planeten'", R('shortLabel("Drag and Drop: Planeten")') === "Planeten");
    ok("'Higher or Lower: Einwohner' -> 'Einwohner'", R('shortLabel("Higher or Lower: Einwohner")') === "Einwohner");
    ok("'Quick-Fire: Bands' -> 'Bands'", R('shortLabel("Quick-Fire: Bands")') === "Bands");
  }

  section("Biologie-Karte nennt jetzt die tatsächliche Fragenzahl (vorher veraltet: '5 Fragen')");
  {
    const C = loadClient(); const { R, state } = C;
    R('renderMainMenu();');
    ok("Zeigt '20 Fragen'", state.last.includes("alle 20 Fragen"));
    ok("Zeigt nicht mehr '5 Fragen beantworten'", !state.last.includes("5 Fragen beantworten"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
