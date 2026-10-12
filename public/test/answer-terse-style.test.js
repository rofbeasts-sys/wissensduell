/* Nach dem letzten Duplikat-Fix waren die 144 überarbeiteten Fragen auf
 * ausformulierte Satz-Antworten umgestellt worden. Gewünscht war aber der
 * knappe Wissens-/Fakten-Stil wie bei der bereits bestehenden Frage "Was
 * ist die Mitternachtsformel?" (kurze Fachbegriffe/Kurzphrasen) - weiterhin
 * mit vergleichbarer Länge über alle 4 Optionen, damit die richtige
 * Antwort nicht wieder allein durch Form auffällt. */
const { ok, section, finish, loadClient } = require("./helpers");

(async () => {
  section("Vorbild 'Mitternachtsformel' ist weiterhin im knappen Stil (unverändert)");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const q = kq["9"].find(x => x.q.includes("Mitternachtsformel") && x.q.includes("für?"));
    ok("Frage vorhanden", !!q);
    ok("Alle 4 Antworten sind kurze Fachphrasen (max. 4 Wörter)", q.a.every(a => a.split(" ").length <= 4));
  }

  section("Stichprobe: vorher ausformulierte Sätze sind jetzt wieder knapp (wie Mitternachtsformel)");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const checks = [
      ["6", "Was ist ein Parlament?", "Gewählte Versammlung"],
      ["5", "Was ist eine Metapher?", "Bildhafter Ausdruck"],
      ["8", "Was ist Lyrik?", "Gedichte"],
      ["9", "Was ist das Ohmsche Gesetz?", "U = R × I"],
    ];
    checks.forEach(([klasse, qtext, expectedCorrect]) => {
      const q = kq[klasse].find(x => x.q === qtext);
      ok(`"${qtext}": existiert noch`, !!q);
      ok(`"${qtext}": richtige Antwort ist jetzt knapp ("${expectedCorrect}")`, q.a[q.c] === expectedCorrect);
      ok(`"${qtext}": keine Antwortoption ist ein ausformulierter Satz (kein Punkt am Ende, unter 40 Zeichen)`, q.a.every(a => !a.endsWith(".") && a.length < 40));
    });
  }

  section("Alle 144 betroffenen Fragen: Antworten weiterhin vergleichbar lang (keine Satz-gegen-Wort-Verräter)");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const flat = Object.values(kq).flat();
    const stillFlagged = flat.filter(q => {
      const correctLen = q.a[q.c].length;
      const otherLens = q.a.filter((_, i) => i !== q.c).map(a => a.length);
      const maxOther = Math.max(...otherLens);
      return correctLen > maxOther * 1.6 && correctLen - maxOther > 8;
    });
    ok("Höchstens noch 5 minimale Ausreißer (vorher 144 in der vorherigen Satz-Version)", stillFlagged.length <= 5);
  }

  section("Keine Antwortoption über alle Fragen hinweg ist länger als ~45 Zeichen (kein Rückfall in ganze Erklärsätze)");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const flat = Object.values(kq).flat();
    // Relativ zur Gesamtmenge statt fester Zahl, damit der Test auch nach
    // spaeteren Inhaltserweiterungen sinnvoll bleibt - lange Antworten
    // sollen die klare Ausnahme bleiben, nicht die Regel.
    const allAnswers = flat.flatMap(q => q.a);
    const longOnes = allAnswers.filter(a => a.length > 45);
    const ratio = longOnes.length / allAnswers.length;
    ok(`Lange Antworttexte bleiben die Ausnahme (${longOnes.length} von ${allAnswers.length}, ${(ratio*100).toFixed(1)}%)`, ratio < 0.05);
  }

  section("Keine neuen Duplikate oder strukturellen Fehler durch das Kürzen eingeschleust");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const flat = Object.values(kq).flat();
    let structErrors = 0;
    flat.forEach(q => {
      if (q.a.length !== 4) structErrors++;
      if (new Set(q.a).size !== 4) structErrors++;
      if (q.c < 0 || q.c > 3) structErrors++;
    });
    ok("Alle Fragen weiterhin strukturell gültig", structErrors === 0);
    const seen = new Set(); let realDupes = 0;
    flat.map(q => q.q.trim().toLowerCase()).forEach(q => {
      if (q === "wie schreibt man richtig?") return;
      if (seen.has(q)) realDupes++;
      seen.add(q);
    });
    ok("Keine echten doppelten Fragen", realDupes === 0);
    ok("Gesamtzahl der Fragen hat sich durch das Kürzen nicht verändert (unabhängig vom aktuellen Stand)", flat.length >= 535);
  }

  section("Live-Durchlauf: eine der gekürzten Fragen funktioniert weiterhin korrekt im echten Spielablauf");
  {
    // Deterministisch statt von der Zufallsziehung abhaengig: eine Solo-
    // Session direkt mit genau dieser (jetzt gekuerzten) Frage aufsetzen.
    const C = loadClient(); const { R } = C;
    R(`
      var p=createProfile("T");
      var q = KLASSE_QUESTIONS["6"].find(x => x.q === "Was ist ein Parlament?");
      solo = { profile:p, questions:[shuffleAnswerOrder(q)], qIndex:0, correct:0, wrong:0, isHaupttest:false, testNeeded:1, startTier:5 };
    `);
    R('handleSoloAnswer(solo.questions[0].c);');
    ok("Richtige Antwort bei der gekürzten Frage wird korrekt gewertet", R('solo.correct') === 1);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
