/* Auf Wunsch: Klassen dürfen (und sollen) mehr als 50 Fragen im Pool haben
 * (mehr Abwechslung bei Wiederholungen), aber pro Übungstest-Start wird
 * trotzdem nur eine zufällige 50er-Auswahl gezogen - und der Haupttest soll
 * seine 20 Fragen NICHT unabhängig nochmal aus dem ganzen (größeren) Pool
 * ziehen, sondern aus genau dieser 50er-Auswahl. */
const { ok, section, finish, loadClient } = require("./helpers");

(async () => {
  section("Haupttest zieht aus der zuletzt gezogenen Übungstest-50er-Auswahl, nicht unabhängig aus dem ganzen Pool");
  {
    const C = loadClient(); const { R } = C;
    R('var p = createProfile("T");');
    // Klasse 7 (Index 6) hat 56 Fragen im Pool - mehr als 50
    const practiceQs = R('pickKlasseTestQuestions(6, p)');
    ok("Übungstest zieht 50 Fragen aus einem Pool von 56", practiceQs.length === 50);
    const practiceTexts = new Set(practiceQs.map(q => q.q));

    const mainQs = R('pickKlasseHaupttestQuestions(6, p)');
    ok("Haupttest liefert 20 Fragen", mainQs.length === 20);
    ok("ALLE 20 Haupttest-Fragen kommen aus der 50er-Auswahl des Übungstests (keine unabhängig gezogene, evtl. im Übungstest nie gezeigte Frage)", mainQs.every(q => practiceTexts.has(q.q)));
  }

  section("Ohne vorherigen Übungstest in dieser Sitzung: Haupttest fällt auf den vollen Klassen-Pool zurück (kein Absturz, keine leere Liste)");
  {
    const C = loadClient(); const { R } = C;
    R('var p = createProfile("T");'); // noch nie pickKlasseTestQuestions aufgerufen
    const mainQs = R('pickKlasseHaupttestQuestions(6, p)');
    ok("Trotzdem 20 gültige Fragen (Rückfall auf den vollen Pool)", mainQs.length === 20);
  }

  section("Jedes Profil hat seine eigene gemerkte Auswahl (keine Vermischung zwischen zwei Profilen)");
  {
    const C = loadClient(); const { R } = C;
    R('var p1 = createProfile("P1"); var p2 = createProfile("P2");');
    R('pickKlasseTestQuestions(6, p1);');
    R('pickKlasseTestQuestions(6, p2);');
    const p1Pool = R('p1._lastPracticePool[7].map(q=>q.q)');
    const p2Pool = R('p2._lastPracticePool[7].map(q=>q.q)');
    ok("Beide Profile haben eine eigene gemerkte 50er-Auswahl (nicht zwingend identisch, da zufällig gezogen, aber unabhängig voneinander gespeichert)", Array.isArray(p1Pool) && Array.isArray(p2Pool) && p1Pool.length === 50 && p2Pool.length === 50);
  }

  section("Neue Übungstest-Ziehung ersetzt die alte gemerkte Auswahl (Haupttest folgt der NEUESTEN, nicht einer veralteten)");
  {
    const C = loadClient({ fakeTime: true }); const { R } = C;
    R('var p = createProfile("T");');
    R('pickKlasseTestQuestions(6, p);'); // erste Ziehung
    const firstMain = new Set(R('pickKlasseHaupttestQuestions(6, p)').map(q => q.q));
    R('pickKlasseTestQuestions(6, p);'); // zweite, neue Ziehung ueberschreibt die erste
    const secondPracticeTexts = new Set(R('p._lastPracticePool[7]').map(q => q.q));
    const secondMain = R('pickKlasseHaupttestQuestions(6, p)');
    ok("Haupttest nach der zweiten Übungstest-Ziehung schöpft aus der NEUEN Auswahl", secondMain.every(q => secondPracticeTexts.has(q.q)));
  }

  section("Gemerkte Auswahl wird NICHT mitgespeichert/synchronisiert (rein temporär im Arbeitsspeicher)");
  {
    const C = loadClient(); const { R } = C;
    R('var p = createProfile("T"); pickKlasseTestQuestions(6, p);');
    ok("Das Feld ist nicht aufzählbar (taucht z.B. nicht in JSON.stringify/Object.keys auf, wird also nie mitgespeichert)", R('Object.keys(p).includes("_lastPracticePool")') === false);
    ok("JSON.stringify(profile) enthält die gemerkte Auswahl nicht", !R('JSON.stringify(p)').includes("_lastPracticePool"));
  }

  section("Live-Durchlauf über beginSolo(): funktioniert genauso wie die direkten Funktionsaufrufe oben");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=6; beginSolo(p, false);'); // Übungstest Klasse 7
    const practiceTexts = new Set(R('solo.questions').map(q => q.q));
    R('p.haupttestUnlockedForKlasse=6; beginSolo(p, true);'); // Haupttest Klasse 7, selbes Profil
    const mainTexts = R('solo.questions').map(q => q.q);
    ok("Haupttest-Fragen (über den echten Spielablauf gestartet) kommen alle aus dem vorherigen Übungstest", mainTexts.every(q => practiceTexts.has(q)));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
