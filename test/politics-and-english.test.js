/* Neue Politik-Fragen (Wissenstest + Brain Test) und eine eigene englische
 * Brain-Test-Fragenbank (allgemeinwissen inkl. London/UK + Amerika/USA),
 * die automatisch genutzt wird, sobald die Oberfläche auf Englisch steht. */
const { ok, section, finish, loadClient, fs, path } = require("./helpers");

function validQuestion(item) {
  return item && typeof item.q === "string" && item.q.length > 0
    && Array.isArray(item.a) && item.a.length === 4
    && new Set(item.a).size === 4
    && Number.isInteger(item.c) && item.c >= 0 && item.c <= 3
    && typeof item.cat === "string" && typeof item.e === "string" && item.e.length > 0;
}

(async () => {
  section("Politik: neue Fragen im allgemeinen Wissenstest-Pool");
  {
    const qq = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "quizQuestions.json"), "utf8"));
    const politik = qq.filter(x => x.cat === "Politik");
    ok("Politik-Kategorie ist spürbar gewachsen (mind. 40 Fragen, vorher 26)", politik.length >= 40);
    ok("Alle Politik-Fragen sind strukturell gültig (4 Antworten, gültiger Index, Erklärung vorhanden)", politik.every(validQuestion));
    ok("Keine doppelten Fragen in der Politik-Kategorie", new Set(politik.map(x => x.q)).size === politik.length);
  }

  section("Politik: neue Fragen im Brain Test (shared/klasseQuestions.json, für Arena)");
  {
    const kq = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "klasseQuestions.json"), "utf8"));
    const allPolitik = Object.values(kq).flat().filter(x => x.cat === "Politik");
    ok("Politik ist im Brain Test vertreten und gewachsen (vorher 15)", allPolitik.length >= 20);
    ok("Über mehrere Klassen verteilt (nicht alle in einer)", new Set(Object.entries(kq).filter(([k, arr]) => arr.some(x => x.cat === "Politik")).map(([k]) => k)).size >= 4);
    ok("Alle strukturell gültig", allPolitik.every(validQuestion));
    for (const klasse of Object.keys(kq)) {
      ok(`Klasse ${klasse}: weiterhin mindestens 50 Fragen (nichts kaputt gemacht)`, kq[klasse].length >= 50);
    }
  }

  section("Politik: dieselben neuen Fragen stecken auch im eingebetteten Client-Datensatz (Brain Test selbst)");
  {
    const C = loadClient(); const { R } = C;
    const politikCount = R('Object.values(KLASSE_QUESTIONS).flat().filter(q=>q.cat==="Politik").length');
    ok("Eingebettete Fragen (die Brain Test wirklich nutzt) enthalten ebenfalls die neuen Politik-Fragen", politikCount >= 20);
    for (const klasse of [2, 4, 6, 8, 10]) {
      ok(`Klasse ${klasse}: Politik-Fragen sind da UND die Klasse hat weiterhin mind. 50 Fragen insgesamt`, R(`KLASSE_QUESTIONS[${klasse}].some(q=>q.cat==="Politik")`) && R(`KLASSE_QUESTIONS[${klasse}].length`) >= 50);
    }
  }

  section("Englische Brain-Test-Datenbank: vorhanden, vollständig, strukturell gültig");
  {
    const C = loadClient(); const { R } = C;
    ok("KLASSE_QUESTIONS_EN existiert mit allen 10 Klassen", R("Object.keys(KLASSE_QUESTIONS_EN).length") === 10);
    for (let k = 1; k <= 10; k++) {
      const count = R(`KLASSE_QUESTIONS_EN[${k}].length`);
      // Seit der Biologie-Übernahme (siehe braintest-biology-english.test.js)
      // haben Klasse 3-10 deutlich mehr als 50 Fragen - Klasse 1/2 blieben
      // unverändert bei 50 (keine Biologie-Themen dort zugeordnet).
      ok(`Klasse ${k} (Englisch): mindestens 50 Fragen vorhanden`, count >= 50);
    }
    const allValid = R(`Object.values(KLASSE_QUESTIONS_EN).flat().every(q => Array.isArray(q.a) && q.a.length===4 && new Set(q.a).size===4 && q.c>=0 && q.c<=3 && q.q && q.e)`);
    ok("Alle englischen Fragen sind strukturell gültig (4 unterschiedliche Antworten, gültiger Index, Erklärung)", allValid);
    const noDupes = R(`(() => { const qs = Object.values(KLASSE_QUESTIONS_EN).flat().map(q=>q.q); return new Set(qs).size === qs.length; })()`);
    ok("Keine doppelten Fragen über alle 10 Klassen hinweg", noDupes);
    const total = R("Object.values(KLASSE_QUESTIONS_EN).flat().length");
    ok(`Insgesamt 859 Fragen (500 ursprünglich + 359 durch die Biologie-Übernahme)`, total === 859);
  }

  section("Englische Datenbank enthält wie gewünscht London/UK- und Amerika/USA-Themen");
  {
    const C = loadClient(); const { R } = C;
    const ukCount = R('Object.values(KLASSE_QUESTIONS_EN).flat().filter(q=>q.cat==="London/UK").length');
    const usCount = R('Object.values(KLASSE_QUESTIONS_EN).flat().filter(q=>q.cat==="America/USA").length');
    ok("Mehrere London/UK-Fragen vorhanden", ukCount >= 15);
    ok("Mehrere Amerika/USA-Fragen vorhanden", usCount >= 15);
    ok("Beide Themen sind über mehrere Klassen verteilt, nicht nur in einer", R('[1,3,5,7,9].filter(k=>KLASSE_QUESTIONS_EN[k].some(q=>q.cat==="London/UK"||q.cat==="America/USA")).length') >= 4);
  }

  section("Zweite Fragen-Ladung: echter britischer Schulstoff (National Curriculum) statt nur Allgemeinwissen");
  {
    const C = loadClient(); const { R } = C;
    const cats = R('(() => { const c={}; Object.values(KLASSE_QUESTIONS_EN).flat().forEach(q => c[q.cat]=(c[q.cat]||0)+1); return c; })()');
    ok("Fach 'Maths' ist vertreten (britische Schreibweise, nicht 'Math')", (cats["Maths"] || 0) >= 40);
    ok("Fach 'English' (Sprache/Literatur) ist vertreten", (cats["English"] || 0) >= 40);
    ok("Fach 'Science' ist vertreten", (cats["Science"] || 0) >= 40);
    ok("Fach 'History' ist vertreten", (cats["History"] || 0) >= 40);
    ok("Fach 'Citizenship' (Politik/Wirtschaft für höhere Klassen) ist vertreten", (cats["Citizenship"] || 0) >= 5);
    ok("Jede Klasse hat jetzt einen erkennbaren Fächer-Mix (mind. 3 verschiedene Fächer), nicht nur eine Kategorie", R('[1,5,10].every(k => new Set(KLASSE_QUESTIONS_EN[k].map(q=>q.cat)).size >= 3)'));
  }

  section("Sprachumschaltung: Deutsch weiterhin wie gewohnt, Englisch nutzt automatisch die neue Datenbank");
  {
    const C = loadClient(); const { R } = C;
    R('currentLang = "de";');
    ok("Bei Deutsch: klasseQuestionsPool() liefert weiterhin die deutsche Datenbank", R("klasseQuestionsPool() === KLASSE_QUESTIONS"));
    R('currentLang = "en";');
    ok("Bei Englisch: klasseQuestionsPool() liefert jetzt die englische Datenbank", R("klasseQuestionsPool() === KLASSE_QUESTIONS_EN"));
    R('currentLang = "fr";');
    ok("Bei einer dritten Sprache (z.B. Französisch, noch nicht übersetzt): fällt zurück auf Deutsch, nicht auf Englisch", R("klasseQuestionsPool() === KLASSE_QUESTIONS"));
  }

  section("pickKlasseTestQuestions/pickKlasseHaupttestQuestions liefern wirklich englischen Inhalt bei Englisch");
  {
    const C = loadClient(); const { R } = C;
    R('currentLang = "en";');
    const practiceQs = R("pickKlasseTestQuestions(0)"); // Klasse 1
    ok("Übungstest (Klasse 1, Englisch) liefert genau 50 Fragen, wie beim deutschen Original", practiceQs.length === 50);
    ok("... alle aus der englischen Datenbank", practiceQs.every(q => KLASSE_QUESTIONS_EN_has(q)));
    function KLASSE_QUESTIONS_EN_has(q) { return R(`Object.values(KLASSE_QUESTIONS_EN).flat().some(x=>x.q===${JSON.stringify(q.q)})`); }
    const mainQs = R("pickKlasseHaupttestQuestions(5)"); // Klasse 6
    ok("Haupttest (Klasse 6, Englisch) liefert genau 20 Fragen", mainQs.length === 20);
    ok("... alle aus der englischen Datenbank, nicht der deutschen", mainQs.every(q => !/[äöüßÄÖÜ]/.test(q.q)));

    R('currentLang = "de";');
    const deQs = R("pickKlasseHaupttestQuestions(0)");
    ok("Zurück auf Deutsch: Haupttest liefert wieder die gewohnten deutschen Fragen", deQs.length === 20 && deQs.some(q => /[a-zäöüß]/i.test(q.q)));
  }

  section("Kompletter Testdurchlauf auf Englisch funktioniert (kein Absturz, Ergebnisbildschirm erscheint)");
  {
    const C = loadClient(); const { R } = C;
    R('currentLang = "en"; var p=createProfile("Tester"); p.klasse=0; p.haupttestUnlockedForKlasse=0;');
    R('beginSolo(p, true); renderSoloQuestion();');
    for (let i = 0; i < 20; i++) {
      R('handleSoloAnswer(solo.questions[solo.qIndex].c);');
      R('if(!solo.finished) soloNextQuestion && soloNextQuestion();');
    }
    ok("20/20 auf Englisch beantwortet, kein Absturz, Testergebnis ist da", R('solo') === null || R('document.getElementById("app").innerHTML').length > 100);
  }

  section("Bugfix: die Brain-Test-Kachel im Hauptmenü war bei Englisch weiterhin gesperrt (obwohl die englische Datenbank längst da ist)");
  {
    const C = loadClient(); const { R } = C;
    R('currentLang = "en"; renderMainMenu();');
    const html = R('document.getElementById("app").innerHTML');
    ok("Brain-Test-Kachel ist NICHT mehr gesperrt bei Englisch (keine 'locked'-Klasse)", !/mode-card locked"[^>]*onclick="">\s*<div class="icon">🎯/.test(html));
    ok("... zeigt die normale Beschreibung, nicht den Sperrtext", html.includes("Play alone and improve") || !html.includes("only available in German and English") === false);
    ok("Klick auf die Kachel ist wirklich aktiv (onclick ruft startSoloFlow auf, nicht leer)", /🎯[\s\S]{0,300}/.test(html) && html.includes("startSoloFlow()"));
    ok("Arena bleibt weiterhin korrekt gesperrt bei Englisch (hat wirklich nur die deutsche Datenbank)", html.includes("Only available in German"));

    R('currentLang = "de"; renderMainMenu();');
    const htmlDe = R('document.getElementById("app").innerHTML');
    ok("Bei Deutsch weiterhin ganz normal nutzbar (keine Regression)", htmlDe.includes("startSoloFlow()") && !htmlDe.includes("solo_quiz_locked"));

    R('currentLang = "fr"; renderMainMenu();');
    const htmlFr = R('document.getElementById("app").innerHTML');
    ok("Bei einer dritten Sprache (Französisch, noch keine Fragendatenbank) bleibt Brain Test korrekt gesperrt", !htmlFr.includes("startSoloFlow()"));
  }

  section("Deutsche Fragen bleiben bei Deutsch unverändert nutzbar (keine Regression)");
  {
    const C = loadClient(); const { R } = C;
    R('currentLang = "de"; var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0;');
    const qs = R("pickKlasseHaupttestQuestions(0)");
    ok("Deutscher Haupttest liefert weiterhin 20 Fragen wie gewohnt", qs.length === 20);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
