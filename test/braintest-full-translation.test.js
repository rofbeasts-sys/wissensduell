/* Die englischen Brain-Test-Fragen funktionierten schon, aber der ganze
 * RAHMEN drumherum (Klassenübersicht, Zwischenbildschirm, Fragenkopf,
 * Ergebnisbildschirm) war weiterhin fest auf Deutsch - genau das wurde
 * gemeldet ("die Namen sind noch auf Deutsch"). Dazu: "PARTY (WIFI)" sollte
 * wieder schlicht heißen, wie im Deutschen ("PARTY RAUM" ohne Zusatz). */
const { ok, section, finish, loadClient } = require("./helpers");

(async () => {
  section("Klassenübersicht komplett auf Englisch");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="en"; var p=createProfile("Pluto"); klassenOverviewProfile=p; renderKlassenOverview(p);');
    const html = state.last;
    ok("Titel 'BRAIN TEST' da (bleibt als Eigenname gleich)", html.includes("BRAIN TEST"));
    ok("Unterzeile auf Englisch ('all classes at a glance')", html.includes("all classes at a glance"));
    ok("'Class 1' statt 'Klasse 1'", html.includes("Class 1") && !html.includes("Klasse 1"));
    ok("'Current' statt 'Aktuell'", html.includes(">▶ Current<") || html.includes("▶ Current"));
    ok("'Not reached yet' statt 'Noch nicht erreicht'", html.includes("Not reached yet"));
    ok("'Practice ... questions · pass with ... correct' statt 'Übung ... Fragen · ab ... richtig'", /Practice \d+ questions · pass with \d+ correct/.test(html));
    ok("Kein deutsches 'Übung'/'richtig' mehr im Haupttext", !html.includes("Übung ") && !/ richtig</.test(html));
    ok("Start-Knopf sagt 'START PRACTICE TEST'", html.includes("START PRACTICE TEST"));
  }

  section("Zwischenbildschirm vor dem Test (beginSolo) komplett auf Englisch");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="en"; var p=createProfile("Pluto"); beginSolo(p, false);');
    const html = state.last;
    ok("'Practice test Class 1' statt 'Übungstest Klasse 1'", html.includes("Practice test Class 1"));
    ok("Englischer Hinweistext ('always runs through completely')", html.includes("always runs through completely"));
    ok("Knopf 'LET'S GO' statt 'LOS GEHT'S'", html.includes("LET'S GO"));
    ok("Kein deutsches Wort 'Fragen' mehr übrig", !html.includes("Fragen"));
  }

  section("Fragenbildschirm komplett auf Englisch");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="en"; var p=createProfile("Pluto"); beginSolo(p, false); renderSoloQuestion();');
    const html = state.last;
    ok("'Question 1 of 50' statt 'Frage 1 von 50'", /Question 1 of \d+/.test(html));
    ok("'correct'/'wrong' statt 'richtig'/'falsch'", html.includes("correct") && html.includes("wrong") && !html.includes("richtig") && !html.includes("falsch"));
  }

  section("Ergebnisbildschirm komplett auf Englisch");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="en"; var p=createProfile("Pluto"); beginSolo(p, false); renderSoloQuestion();');
    R('solo.correct=46; solo.wrong=4; solo.testNeeded=45; solo.qIndex=solo.questions.length; endSoloRound();');
    const html = state.last;
    ok("'ROUND OVER' statt 'RUNDE BEENDET'", html.includes("ROUND OVER"));
    ok("'Strong performance!' statt 'Starke Leistung!'", html.includes("Strong performance!"));
    ok("'Main test for Class 1 unlocked!' statt 'Haupttest für Klasse 1 freigeschaltet!'", html.includes("Main test for Class 1 unlocked!"));
    ok("'Correct answers (needed: 45)' statt 'Richtige Antworten (nötig: 45)'", html.includes("Correct answers (needed: 45)"));
    ok("'Wrong answers' statt 'Falsche Antworten'", html.includes("Wrong answers"));
    ok("'✓ Passed' statt '✓ Bestanden'", html.includes("✓ Passed"));
    ok("'Practice test' statt 'Übungstest' als Zeilenbezeichnung", html.includes(">Practice test<"));
    ok("'Main test is unlocked' statt 'Haupttest ist freigeschaltet'", html.includes("Main test is unlocked"));
    ok("Knöpfe: 'START MAIN TEST', 'ANOTHER ROUND', 'MAIN MENU'", html.includes("START MAIN TEST") && html.includes("ANOTHER ROUND") && html.includes("MAIN MENU"));
    ok("Kein deutsches Wort mehr im ganzen Ergebnisbildschirm (Stichprobe: 'nötig', 'Fragen', 'Klasse')", !html.includes("nötig") && !html.includes("Fragen") && !html.includes("Klasse "));
  }

  section("Deutsch bleibt unverändert, keine Regression");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="de"; var p=createProfile("Pluto"); klassenOverviewProfile=p; renderKlassenOverview(p);');
    const html = state.last;
    ok("Weiterhin 'Klasse 1', 'Aktuell', 'Noch nicht erreicht' bei Deutsch", html.includes("Klasse 1") && html.includes("Aktuell") && html.includes("Noch nicht erreicht"));
    ok("Weiterhin 'ÜBUNGSTEST STARTEN' bei Deutsch", html.includes("ÜBUNGSTEST STARTEN"));
  }

  section("Party-Raum: 'PARTY (WIFI)' entfernt, heißt jetzt schlicht wie im Deutschen");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="en"; renderMainMenu();');
    const html = state.last;
    ok("Zeigt 'PARTY ROOM' statt 'PARTY (WIFI)'", html.includes("PARTY ROOM"));
    ok("Kein 'WIFI' mehr im sichtbaren Titel", !html.includes("WIFI"));

    R('currentLang="de"; renderMainMenu();');
    ok("Deutsch weiterhin 'PARTY RAUM' wie gewohnt", R('document.getElementById("app").innerHTML').includes("PARTY RAUM"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
