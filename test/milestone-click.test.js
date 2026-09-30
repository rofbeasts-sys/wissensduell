/* Bugfix: Speed Math -> "MEILENSTEIN-MODUS"-Knopf tat beim Antippen nichts.
 * Ursache: onclick="startSpeedMathMilestoneFlow(profile)" (ohne ${}) referenzierte
 * beim echten Klick eine GLOBALE Variable "profile", die es nicht gibt - "profile"
 * war nur der lokale Funktionsparameter von renderSpeedMathEntry(profile) zur
 * RENDER-Zeit, aber inline onclick-Attribute werten im globalen Scope aus.
 * Ergebnis: ReferenceError beim Klick, lautlos, kein Bildschirmwechsel.
 * Betraf 3 Stellen (Einstieg, "Zurück", "Zur Übersicht" nach Levelende) - Fix:
 * ueberall die tatsaechlich globale Variable speedMathProfile referenzieren.
 * Dieser Test simuliert einen ECHTEN Klick (extrahiert den onclick-String aus
 * dem gerenderten HTML und fuehrt ihn im GLOBALEN Scope aus, exakt wie ein
 * Browser das bei einem inline onclick-Handler tut) statt die Funktion direkt
 * aufzurufen - ein direkter Aufruf haette den Bug NICHT gefunden. */
const { ok, section, finish, loadClient } = require("./helpers");

// Extrahiert den onclick-Inhalt des ERSTEN Buttons mit "fnName(" im aktuell
// gerenderten HTML und fuehrt ihn GENAU so aus, wie ein echter Klick es
// taete (globaler Scope - kein Zugriff auf lokale Variablen der zuletzt
// aufgerufenen render*-Funktion).
function realClick(R, fnName) {
  const html = R('document.getElementById("app").innerHTML');
  const marker = 'onclick="' + fnName + '(';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('Button mit "' + fnName + '(" nicht im aktuellen Bildschirm gefunden. HTML-Anfang: ' + html.slice(0, 150));
  const attrStart = start + 'onclick="'.length;
  const attrEnd = html.indexOf('"', attrStart);
  R(html.slice(attrStart, attrEnd));
}
const title = (R) => (R('document.getElementById("app").innerHTML').match(/picker-title">([^<]*)</) || [, ""])[1];

(async () => {
  section("Echter Klickpfad: Speed Math -> Meilenstein -> zurück -> Level -> Ergebnis -> Übersicht");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("Test");');
    R('startSpeedMathFlow();'); // entspricht dem Antippen der Speed-Math-Karte im Hauptmenü
    ok("Speed-Math-Einstieg zeigt (auch) das Wort 'MEILENSTEIN' im Knopftext - deshalb reicht ein bloßes includes() nicht zur Unterscheidung der Bildschirme", R('document.getElementById("app").innerHTML').includes("MEILENSTEIN"));

    realClick(R, "startSpeedMathMilestoneFlow");
    ok("1) Klick auf 'MEILENSTEIN-MODUS' öffnet wirklich die Meilenstein-Übersicht (vorher: stiller Fehler, nichts passierte)", title(R) === "SPEED MATH – MEILENSTEIN");

    realClick(R, "renderSpeedMathEntry");
    ok("2) 'Zurück'-Knopf auf der Meilenstein-Seite führt wirklich zurück zu Speed Math", title(R) === "SPEED MATH");

    realClick(R, "startSpeedMathMilestoneFlow");
    realClick(R, "startSpeedMathLevel");
    ok("3) 'LEVEL STARTEN' funktioniert (Session wurde angelegt)", R("speedMathLevelSession") !== null);

    // Level als bestanden simulieren: die 4 Antwort-Knöpfe sind gemischt, ein
    // realClick() würfe zufällig auf die falsche Antwort - deshalb gezielt
    // die tatsächlich richtige einreichen (die Auswahlknöpfe selbst sind
    // schon anderswo getestet, hier geht es um den 'ZUR ÜBERSICHT'-Knopf danach).
    // Level gilt als bestanden, sobald die Serie das Zielband erreicht -
    // dafür kurz auf 1 setzen, damit die nächste richtige Antwort reicht.
    R("speedMathLevelSession.config.streakTarget = 1; speedMathLevelSession.streak = 0;");
    R("speedMathLevelSubmit(speedMathLevelSession.currentProblem.answer);");
    ok("4) Level-Ende-Bildschirm erscheint", R('document.getElementById("app").innerHTML').includes("GESCHAFFT"));

    realClick(R, "renderSpeedMathMilestoneEntry");
    ok("5) 'ZUR ÜBERSICHT' (der ursprünglich gemeldete, nicht funktionierende Knopf) führt wirklich zurück zur Meilenstein-Übersicht", title(R) === "SPEED MATH – MEILENSTEIN");
  }

  section("Direkter Funktionsaufruf haette den Bug NICHT gefunden (zur Einordnung, kein Widerspruch)");
  {
    // Absichtlich zum Vergleich: ruft die Funktionen DIREKT auf (wie ein Test
    // es normalerweise tut) statt ueber den extrahierten onclick-String -
    // das funktioniert IMMER, unabhaengig vom Bug, weil "profile" dabei ganz
    // normal als Funktionsparameter uebergeben wird, nicht als globale
    // Variable nachgeschlagen wird. Zeigt, warum der Bug frueher durchrutschte.
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("Test"); startSpeedMathMilestoneFlow(p);');
    ok("(zur Einordnung) direkter Aufruf funktioniert immer, auch mit dem alten, kaputten Code", title(R) === "SPEED MATH – MEILENSTEIN");
  }

  section("Keine weiteren Stellen mit demselben Fehlermuster im Code");
  {
    const fs = require("fs"), path = require("path");
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    // Sucht nach onclick="irgendwas(...profile...)" wo "profile" als bloßes
    // Wort vorkommt (nicht als "xyz.profile"-Eigenschaftszugriff auf ein
    // echtes globales Objekt wie ttt/solo, und nicht "speedMathProfile" o.ä.)
    const matches = html.match(/onclick="[a-zA-Z_]+\([^)"]*\bprofile\b[^)"]*\)"/g) || [];
    const suspicious = matches.filter(m => !/speedMathProfile|\bttt\.profile|\bsolo\.profile|klassenOverviewProfile|accountAsProfile\(\)/.test(m));
    ok("Keine weiteren onclick-Handler referenzieren ein bloßes 'profile' ohne globale Variable dahinter" + (suspicious.length ? " - gefunden: " + suspicious.join(", ") : ""), suspicious.length === 0);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
