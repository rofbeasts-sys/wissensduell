/* Auf Wunsch: alle Fragen aus dem eigenständigen Biologie-Modus (Körper +
 * Sexualkunde, 343 Fragen) zusätzlich in den Brain Test übernommen,
 * verteilt nach Thema auf passende Klassenstufen. */
const { ok, section, finish, loadClient, fs, path } = require("./helpers");

(async () => {
  section("Alle 343 Biologie-Modus-Fragen sind jetzt auch im Brain Test vertreten");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const bt = R("BIOLOGY_TOPICS");
    const bioModeQs = new Set();
    Object.values(bt.body).forEach(cat => cat.items.forEach(q => bioModeQs.add(q.q.trim().toLowerCase())));
    Object.values(bt.sexualkunde).forEach(cat => cat.items.forEach(q => bioModeQs.add(q.q.trim().toLowerCase())));
    const allBrainTestQ = new Set(Object.values(kq).flat().map(q => q.q.trim().toLowerCase()));
    const missing = [...bioModeQs].filter(q => !allBrainTestQ.has(q));
    ok(`Alle Biologie-Modus-Fragen (343) sind im Brain Test wiederzufinden (fehlend: ${missing.length})`, missing.length === 0);
  }

  section("Themenweise Verteilung auf die richtigen Klassenstufen (einfache Körperteile früh, Sexualkunde aufsteigend)");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const bt = R("BIOLOGY_TOPICS");
    const findInKlasse = (klasse, qtext) => kq[klasse].some(q => q.q === qtext);
    ok("Hand-Fragen stehen in Klasse 3", bt.body.hand.items.every(it => findInKlasse("3", it.q)));
    ok("Fuß-Fragen stehen in Klasse 3", bt.body.fuss.items.every(it => findInKlasse("3", it.q)));
    ok("Augen-Fragen stehen in Klasse 4", bt.body.auge.items.every(it => findInKlasse("4", it.q)));
    ok("Ohr-Fragen stehen in Klasse 4", bt.body.ohr.items.every(it => findInKlasse("4", it.q)));
    ok("Kopf/Gehirn-Fragen stehen in Klasse 5", bt.body.kopf_gehirn.items.every(it => findInKlasse("5", it.q)));
    ok("Pubertät-Fragen stehen in Klasse 5", bt.sexualkunde.puberty.items.every(it => findInKlasse("5", it.q)));
    ok("Herz-Fragen stehen in Klasse 6", bt.body.herz.items.every(it => findInKlasse("6", it.q)));
    ok("Fortpflanzungsorgane-Fragen stehen in Klasse 6", bt.sexualkunde.reproductive_organs.items.every(it => findInKlasse("6", it.q)));
    ok("Menstruationszyklus-Fragen stehen in Klasse 7", bt.sexualkunde.menstrual_cycle.items.every(it => findInKlasse("7", it.q)));
    ok("Schwangerschafts-Fragen stehen in Klasse 8", bt.sexualkunde.pregnancy.items.every(it => findInKlasse("8", it.q)));
    ok("Verhütung-Fragen stehen in Klasse 9", bt.sexualkunde.contraception_health.items.every(it => findInKlasse("9", it.q)));
    ok("Einverständnis/Grenzen-Fragen stehen in Klasse 10", bt.sexualkunde.consent_boundaries.items.every(it => findInKlasse("10", it.q)));
  }

  section("Übertragene Fragen tragen die richtige Kategorie (Sachkunde in Klasse 3/4, sonst Biologie) und passendes d-Feld");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const handQ = kq["3"].find(q => q.q === "Wie viele Gelenke hat ein einzelner Finger (außer dem Daumen) normalerweise?");
    ok("Klasse 3: übertragene Frage hat Kategorie 'Sachkunde'", !!handQ && handQ.cat === "Sachkunde" && handQ.d === 3);
    const herzQ = kq["6"].find(q => q.q === "Wie oft schlägt ein ruhendes, gesundes Herz in etwa pro Minute?" || q.q.includes("Blutdruck"));
    ok("Klasse 6: übertragene Frage hat Kategorie 'Biologie'", !!herzQ && herzQ.cat === "Biologie" && herzQ.d === 6);
  }

  section("Keine neuen Duplikate oder strukturellen Fehler durch die Übernahme");
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
    ok("Keine echten doppelten Fragen (auch nicht innerhalb derselben Klasse durch die Übernahme)", realDupes === 0);
  }

  section("Längen-Verräter-Muster auch bei den übertragenen Fragen behoben (gleiche Sorgfalt wie beim letzten Mal)");
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
    ok(`Höchstens noch vereinzelte Ausreißer im gesamten, jetzt 878 Fragen umfassenden Datensatz (gefunden: ${stillFlagged.length})`, stillFlagged.length <= 10);
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

  section("Live-Durchlauf: Übungstest einer stark gewachsenen Klasse (Klasse 6, jetzt 112 Fragen) funktioniert normal");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=5; beginSolo(p, false);');
    ok("Übungstest liefert weiterhin genau 50 Fragen trotz stark gewachsenem Pool", R('solo.questions.length') === 50);
    R('var p2=createProfile("T2"); p2.klasse=5; p2.haupttestUnlockedForKlasse=5; beginSolo(p2, true);');
    ok("Haupttest liefert weiterhin genau 20 Fragen", R('solo.questions.length') === 20);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
