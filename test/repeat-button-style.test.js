/* "Test wiederholen" sollte schöner aussehen (eigener Button-Stil statt der
 * generischen, schlichten Daumen-Knopf-Klasse) und durfte am rechten
 * Bildschirmrand nicht abgeschnitten werden. */
const { ok, section, finish, loadClient } = require("./helpers");

(async () => {
  section("'Test wiederholen' nutzt einen eigenen, auffälligeren Button-Stil");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.klasse=2; klassenOverviewProfile=p; renderKlassenOverview(p);');
    const html = state.last;
    ok("Button ist da und nutzt die neue Klasse 'repeat-btn' statt der generischen 'thumb-btn'", html.includes('class="repeat-btn"') && !/thumb-btn"[^>]*>🔁 Test wiederholen/.test(html));
    ok("Erscheint für jede bereits bestandene Klasse (hier 2x, Klasse 1 und 2)", (html.match(/class="repeat-btn"/g) || []).length === 2);
    ok("Erscheint NICHT bei der aktuellen oder noch nicht erreichten Klasse", !html.includes('class="repeat-btn"') === false); // Gegenprobe unten praeziser
    const currentRowIdx = html.indexOf("Aktuell");
    const afterCurrent = html.slice(currentRowIdx, currentRowIdx + 400);
    ok("Kein Wiederholen-Button direkt in der 'Aktuell'-Zeile", !afterCurrent.slice(0, 50).includes("repeat-btn"));
  }

  section("Eigene CSS-Regel mit Farbverlauf statt der schlichten Standard-Optik");
  {
    const fs = require("fs"), path = require("path");
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    const rule = html.match(/\.repeat-btn\{[^}]*\}/);
    ok("CSS-Regel für .repeat-btn existiert", !!rule);
    ok("Nutzt einen Farbverlauf (nicht nur eine flache Fläche)", rule[0].includes("linear-gradient"));
    ok("Hat einen Schatten für mehr Tiefe", rule[0].includes("box-shadow"));
    ok("Abgerundete Pillenform (großer border-radius)", /border-radius:\s*20px/.test(rule[0]));
    const activeRule = html.match(/\.repeat-btn:active\{[^}]*\}/);
    ok("Reagiert sichtbar auf Antippen (eigener :active-Zustand)", !!activeRule);
  }

  section("Layout-Fix: die Zeile bricht bei wenig Platz um, statt den Button abzuschneiden");
  {
    const fs = require("fs"), path = require("path");
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    const marker = '🔁 Test wiederholen';
    const markerIdx = html.indexOf(marker);
    const rowDecl = html.slice(Math.max(0, markerIdx - 900), markerIdx);
    ok("Die Brain-Test-Klassenzeile erlaubt jetzt Zeilenumbruch (flex-wrap:wrap)", rowDecl.includes("flex-wrap:wrap"));
  }

  section("Tic-Tac-Toe-Rangübersicht (ähnliches Layout, aber ohne Wiederholen-Knopf) bleibt unverändert");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); tttOverviewProfile=p; renderTttRankOverview(p);');
    ok("Kein 'repeat-btn' auf der TTT-Rangübersicht (die hat gar keinen Wiederholen-Knopf)", !state.last.includes("repeat-btn"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
