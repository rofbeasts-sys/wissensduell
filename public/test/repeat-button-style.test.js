/* "Test wiederholen" lief frueher ueber einen kleinen Inline-Knopf direkt in
 * der Klassenzeile. Auf Wunsch ersetzt durch einen eigenen Klassen-Detail-
 * bildschirm (antippbare Zeile -> Popup mit bisherigen Ergebnissen +
 * Wiederholen-Knoepfen) - dieser Test prueft die neue Umsetzung. */
const { ok, section, finish, loadClient, fs, path } = require("./helpers");

(async () => {
  section("Klassenzeilen sind jetzt antippbar statt eines kleinen Inline-Knopfs");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.klasse=2; klassenOverviewProfile=p; renderKlassenOverview(p);');
    const html = state.last;
    ok("Kein alter Inline-Knopf 'Test wiederholen' mehr in der Übersicht", !html.includes("🔁 Test wiederholen"));
    ok("Bestandene UND aktuelle Klasse (hier 2+1=3x) rufen beim Antippen den Klassen-Detailbildschirm auf", (html.match(/onclick="renderBrainTestClassModal\(\d+\)"/g) || []).length === 3);
    const currentRowIdx = html.indexOf("Aktuell");
    const afterCurrent = html.slice(Math.max(0, currentRowIdx - 300), currentRowIdx);
    ok("Die aktuelle Zeile ist EBENFALLS antippbar (für ihre eigene Übungstest-Wiederholung)", afterCurrent.includes("renderBrainTestClassModal"));
  }

  section("Klassen-Detailbildschirm zeigt bisherige Ergebnisse und Wiederholen-Knöpfe");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      var p=createProfile("T"); p.klasse=2; p.haupttestUnlockedForKlasse=-1;
      p.braintestScores = { 0: { practice:{correct:45,total:50}, main:{correct:18,total:20} } };
      klassenOverviewProfile=p;
      renderBrainTestClassModal(0);
    `);
    const html = state.last;
    ok("Zeigt den bisherigen Übungstest-Punktestand (45 / 50)", html.includes("45 / 50"));
    ok("Zeigt den bisherigen Haupttest-Punktestand (18 / 20)", html.includes("18 / 20"));
    ok("Bietet 'Übungstest wiederholen' an", html.includes("Übungstest wiederholen"));
    ok("Bietet 'Haupttest wiederholen' an", html.includes("Haupttest wiederholen"));
    ok("Hat einen Zurück-Knopf zur Übersicht", html.includes("renderKlassenOverview"));
  }

  section("Eine noch nie versuchte Testart zeigt '–' statt einer falschen Zahl");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.klasse=1; klassenOverviewProfile=p; renderBrainTestClassModal(0);');
    const html = state.last;
    ok("Haupttest von Klasse 1 nie versucht -> zeigt '–'", /<div class="n">–<\/div>\s*<div class="l">Haupttest<\/div>/.test(html));
  }

  section("Layout-Fix bleibt erhalten: die Klassenzeile erlaubt weiterhin Zeilenumbruch");
  {
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    const marker = 'renderBrainTestClassModal(${i})';
    const markerIdx = html.indexOf(marker);
    const rowDecl = html.slice(Math.max(0, markerIdx - 400), markerIdx);
    ok("Die Brain-Test-Klassenzeile erlaubt weiterhin Zeilenumbruch (flex-wrap:wrap)", rowDecl.includes("flex-wrap:wrap"));
  }

  section("Tic-Tac-Toe-Rangübersicht (ähnliches Layout) bleibt unverändert, kein Klassen-Detailbildschirm-Aufruf dort");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); tttOverviewProfile=p; renderTttRankOverview(p);');
    ok("Kein 'renderBrainTestClassModal' auf der TTT-Rangübersicht", !state.last.includes("renderBrainTestClassModal"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
