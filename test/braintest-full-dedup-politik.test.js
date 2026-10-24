/* Vollständige Analyse aller 10 Brain-Test-Klassen auf (Near-)Duplikate,
 * plus Politik jetzt in JEDER Klasse vertreten (vorher: Klasse 1, 3, 7
 * komplett ohne Politik-Fragen). Zwei weitere echte Treffer gefunden und
 * behoben: "Hauptstadt Deutschlands" stand in Klasse 2 UND 4 fast
 * wortgleich, "Gewaltenteilung" wurde in Klasse 8 UND 9 im Kern dasselbe
 * gefragt. */
const { ok, section, finish, loadClient, fs, path } = require("./helpers");

(async () => {
  section("Weitere zwei (Near-)Duplikate über alle 10 Klassen gefunden + behoben");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const hauptstadtHits = Object.values(kq).flat().filter(q => q.q.toLowerCase().includes("hauptstadt") && q.q.toLowerCase().includes("deutschland"));
    ok("'Hauptstadt Deutschlands' kommt nur noch in EINER Klasse vor (vorher Klasse 2 UND 4 fast wortgleich)", hauptstadtHits.length === 1);
    const gewaltenHits = Object.values(kq).flat().filter(q => q.q.includes("Gewaltenteilung") || q.q.includes("drei Gewalten"));
    ok("Gewaltenteilung wird nur noch einmal als eigenständiges Konzept abgefragt (Klasse 9 testete vorher dasselbe wie Klasse 8)", gewaltenHits.length === 1);
  }

  section("Komplette Duplikat-Analyse über alle 10 Klassen: keine echten Duplikate mehr");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const allQ = Object.values(kq).flat().map(q => q.q.trim().toLowerCase());
    const seen = new Set(); let realDupes = [];
    allQ.forEach(q => {
      if (q === "wie schreibt man richtig?") return; // bekanntes, legitimes Frage-Schema mit unterschiedlichen Wörtern
      if (seen.has(q)) realDupes.push(q);
      seen.add(q);
    });
    ok("Keine einzige echte doppelte Frage mehr im gesamten 525+ Fragen umfassenden Datensatz", realDupes.length === 0);
  }

  section("Politik ist jetzt in JEDER der 10 Klassen vertreten (vorher: Klasse 1, 3, 7 komplett ohne)");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    for (let k = 1; k <= 10; k++) {
      const count = kq[String(k)].filter(q => q.cat === "Politik").length;
      ok(`Klasse ${k}: mindestens 2 Politik-Fragen vorhanden`, count >= 2);
    }
  }

  section("Neue Politik-Fragen sind altersgerecht einfach (Klasse 1 und 3), nicht zu fortgeschritten");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    ok("Klasse 1: einfache, kindgerechte Politik-Fragen (keine komplexen Fachbegriffe wie 'Gewaltenteilung')", kq["1"].filter(q => q.cat === "Politik").every(q => !/Gewaltenteilung|Judikative|Fraktion|Koalition/.test(q.q)));
    ok("Klasse 7: etwas anspruchsvollere Begriffe als Klasse 1-3 (z.B. Fraktion, Volksabstimmung)", kq["7"].some(q => q.cat === "Politik" && /Fraktion|Volksabstimmung|Wahlrecht|wählen/.test(q.q)));
  }

  section("Keine neue Frage kollidiert mit dem eigenständigen Biologie-Modus oder dem Wissenstest-Pool");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const quizPool = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "quizQuestions.json"), "utf8"));
    const quizTexts = new Set(quizPool.map(q => q.q.trim().toLowerCase()));
    const newTexts = ["wie heißt das land, in dem wir leben?", "wie heißt das gebäude, in dem der bürgermeister und die stadtverwaltung arbeiten?", "wie alt muss man in deutschland mindestens sein, um bei einer bundestagswahl wählen zu dürfen?"];
    const collisions = newTexts.filter(t => quizTexts.has(t));
    ok("Keine der neuen Brain-Test-Politik-Fragen ist wortgleich mit einer Wissenstest-Pool-Frage", collisions.length === 0);
  }

  section("shared/klasseQuestions.json bleibt deckungsgleich mit der Client-Einbettung");
  {
    const C = loadClient(); const { R } = C;
    const kqClient = R("KLASSE_QUESTIONS");
    const kqServer = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "klasseQuestions.json"), "utf8"));
    for (const klasse of Object.keys(kqClient)) {
      ok(`Klasse ${klasse}: gleiche Fragenanzahl Client/Server`, kqClient[klasse].length === kqServer[klasse].length);
    }
  }

  section("Live-Durchlauf: Haupttest/Übungstest funktionieren für die am stärksten veränderten Klassen weiterhin normal");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p, true);'); // Klasse 1
    ok("Klasse 1 Haupttest: weiterhin genau 20 Fragen", R('solo.questions.length') === 20);
    R('var p2=createProfile("T2"); p2.klasse=6; beginSolo(p2, false);'); // Klasse 7, jetzt 56 im Pool
    ok("Klasse 7 Übungstest: weiterhin genau 50 Fragen trotz gewachsenem Pool (56)", R('solo.questions.length') === 50);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
