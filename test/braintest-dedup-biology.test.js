/* Gemeldet: Fragen kommen in Klasse 3/4/5 doppelt vor. Gefunden: "Was
 * passiert bei Photosynthese in Pflanzen?" (Klasse 3) testet praktisch
 * dasselbe wie "Was ist Photosynthese?" (Klasse 5), und "Was ist die EU?"
 * / "Wofür steht die Abkürzung 'EU'?" standen beide in Klasse 4. Beide
 * behoben, dazu neue Biologie-/Sexualkunde-Fragen altersgerecht verteilt
 * (ab der Klassenstufe, in der diese Themen im echten Lehrplan vorkommen),
 * ohne Wortlaut-Überschneidung mit dem eigenständigen Biologie-Modus. */
const { ok, section, finish, loadClient, fs, path } = require("./helpers");

function getKlasseQuestions(R) {
  return R("KLASSE_QUESTIONS");
}

(async () => {
  section("Die beiden gemeldeten (Near-)Duplikate sind behoben");
  {
    const C = loadClient(); const { R } = C;
    const kq = getKlasseQuestions(R);
    ok("Klasse 3: 'Was passiert bei Photosynthese...' ist weg (Photosynthese wird bereits in Klasse 5 behandelt)", !kq["3"].some(q => q.q.includes("Photosynthese")));
    ok("Klasse 3 hat weiterhin mindestens 50 Fragen (nur ersetzt, nicht verloren - kann seither durch spätere Ergänzungen gewachsen sein)", kq["3"].length >= 50);
    const euQuestions = kq["4"].filter(q => q.q.includes("EU"));
    ok("Klasse 4: beide EU-Fragen sind jetzt inhaltlich unterschiedlich, nicht mehr dieselbe Frage zweimal", new Set(euQuestions.map(q => q.q)).size === euQuestions.length);
  }

  section("Keine Frage kommt mehrfach vor (gesamter Brain-Test-Datensatz, alle 10 Klassen)");
  {
    const C = loadClient(); const { R } = C;
    const kq = getKlasseQuestions(R);
    const allQ = Object.values(kq).flat().map(q => q.q.trim().toLowerCase());
    // Das bekannte, bewusst wiederverwendete Frage-Schema ("Wie schreibt man
    // richtig?" mit unterschiedlichen Wörtern in a) rausrechnen - ist kein
    // echtes Duplikat (unterschiedliche Antwortoptionen).
    const withoutKnownTemplate = allQ.filter(q => q !== "wie schreibt man richtig?" || allQ.indexOf(q) === allQ.lastIndexOf(q));
    const seen = new Set(); let realDupes = 0;
    allQ.forEach(q => {
      if (q === "wie schreibt man richtig?") return; // bekanntes, legitimes Schema - siehe oben
      if (seen.has(q)) realDupes++;
      seen.add(q);
    });
    ok("Keine echten doppelten Fragen mehr im gesamten Datensatz", realDupes === 0);
  }

  section("Neue Biologie-/Sexualkunde-Fragen sind da, altersgerecht verteilt");
  {
    const C = loadClient(); const { R } = C;
    const kq = getKlasseQuestions(R);
    ok("Klasse 4 (Sachkunde-Niveau): einfache Körperfragen ergänzt", kq["4"].length === 54);
    ok("Klasse 5 (Biologie beginnt): Skelett/Niere/Pubertäts-Einstieg ergänzt", kq["5"].some(q => q.q.includes("Pubertät")));
    ok("Klasse 6: vertiefte Körperfunktionen ergänzt", kq["6"].length === 55);
    ok("Klasse 7 (Fortpflanzungsorgane beginnen): z.B. Hoden/Eizellen-Themen", kq["7"].some(q => q.cat === "Biologie" && q.d === 7));
    ok("Klasse 8 (Zyklus/Schwangerschaft): passende Fragen ergänzt", kq["8"].some(q => q.q.toLowerCase().includes("schwangerschaft") || q.q.toLowerCase().includes("zyklus") || q.q.toLowerCase().includes("embryo")));
    ok("Klasse 9 (Verhütung/Einverständnis): passende Fragen ergänzt", kq["9"].some(q => q.q.toLowerCase().includes("verhütung") || q.q.toLowerCase().includes("pille") || q.q.toLowerCase().includes("einvernehmlichkeit")));
    ok("Klasse 10 (STI/Beratung): passende Fragen ergänzt", kq["10"].some(q => q.q.toLowerCase().includes("übertragbare") || q.q.toLowerCase().includes("beratungsstelle") || q.q.toLowerCase().includes("vertrauensvoll")));
    ok("Klasse 4: neue Fragen tragen 'Sachkunde' (wie der Rest der Klasse 4 - 'Biologie' als Fach beginnt erst ab Klasse 5)", kq["4"].filter(q => q.cat === "Sachkunde" && q.d === 4).length >= 2);
    ok("Klasse 5-10: neue Fragen tragen die Kategorie 'Biologie'", [5,6,7,8,9,10].every(k => kq[String(k)].some(q => q.cat === "Biologie" && q.d === k)));
  }

  section("Keine Wortlaut-Überschneidung mit dem eigenständigen Biologie-Modus (BIOLOGY_TOPICS)");
  {
    const C = loadClient(); const { R } = C;
    const kq = getKlasseQuestions(R);
    const bioModeQs = new Set();
    const bt = R("BIOLOGY_TOPICS");
    Object.values(bt.body).forEach(cat => cat.items.forEach(q => bioModeQs.add(q.q.trim().toLowerCase())));
    Object.values(bt.sexualkunde).forEach(cat => cat.items.forEach(q => bioModeQs.add(q.q.trim().toLowerCase())));
    const allBrainTestQ = Object.values(kq).flat().map(q => q.q.trim().toLowerCase());
    const collisions = allBrainTestQ.filter(q => bioModeQs.has(q));
    ok("Keine der Brain-Test-Fragen ist wortgleich mit einer Frage aus dem Biologie-Modus", collisions.length === 0);
  }

  section("Schwierigkeit (d-Feld) der neu hinzugefügten Fragen passt zur jeweiligen Klasse");
  {
    // Nur die neu hinzugefuegten Fragen pruefen (per Text identifiziert) -
    // bereits VOR dieser Änderung vorhandene Biologie-Fragen (Klasse 5/6)
    // nutzen ein anderes, aelteres d-Schema, das 'd' wird ohnehin nirgends
    // fuer die Fragenauswahl ausgewertet (rein informativ) und war nicht
    // Teil dieser Anfrage.
    const C = loadClient(); const { R } = C;
    const kq = getKlasseQuestions(R);
    const newTexts = {
      5: "Was ist die Pubertät?",
      6: "Welcher Muskel ist hauptsächlich für die Atmung verantwortlich?",
      7: "Wo werden beim Mann die Spermien gebildet?",
      8: "Wie lange dauert ein durchschnittlicher weiblicher Zyklus?",
      9: "Was versteht man unter Einvernehmlichkeit (Consent)?",
      10: "Wie nennt man Infektionen, die hauptsächlich durch sexuellen Kontakt übertragen werden?"
    };
    ok("Jede geprüfte neue Frage hat d gleich ihrer Klassenzahl", Object.entries(newTexts).every(([k, text]) => {
      const q = kq[k].find(x => x.q === text);
      return q && q.d === Number(k);
    }));
  }

  section("shared/klasseQuestions.json (Arena-Server-Quelle) ist deckungsgleich mit dem eingebetteten Client-Datensatz");
  {
    const C = loadClient(); const { R } = C;
    const kqClient = getKlasseQuestions(R);
    const kqServer = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "klasseQuestions.json"), "utf8"));
    for (const klasse of Object.keys(kqClient)) {
      ok(`Klasse ${klasse}: gleiche Fragenanzahl in Client-Einbettung und Server-JSON`, kqClient[klasse].length === kqServer[klasse].length);
    }
  }

  section("Live-Durchlauf: Haupttest einer betroffenen Klasse (Klasse 4) funktioniert weiterhin normal");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=3; p.haupttestUnlockedForKlasse=3; beginSolo(p, true);');
    ok("Haupttest liefert weiterhin genau 20 Fragen (fester Wert, unabhängig von der gewachsenen Pool-Größe)", R('solo.questions.length') === 20);
  }
  section("Live-Durchlauf: Übungstest zeigt weiterhin 50 Fragen (nicht die gewachsene Poolgröße)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=4; beginSolo(p, false);'); // Klasse 5 (0-indiziert), jetzt 53 im Pool
    ok("Übungstest bleibt bei 50 Fragen (BRAINTEST_PRACTICE_COUNT), obwohl der Pool jetzt größer ist", R('solo.questions.length') === 50);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
