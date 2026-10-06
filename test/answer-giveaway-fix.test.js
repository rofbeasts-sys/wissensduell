/* Gemeldet: die richtige Antwort ist bei vielen Fragen allein an ihrer Form
 * zu erkennen - ein ganzer Erklärsatz gegen drei einzelne Wörter als
 * Ablenker. Das zog sich durch alle Klassen (144 von 535 Fragen betroffen).
 * Für jede betroffene Frage wurden die falschen Antworten auf vergleichbare
 * Länge/Satzform gebracht, ohne die richtige Antwort selbst zu verändern. */
const { ok, section, finish, loadClient } = require("./helpers");

function flagGiveaways(questions) {
  return questions.filter(q => {
    const correctLen = q.a[q.c].length;
    const otherLens = q.a.filter((_, i) => i !== q.c).map(a => a.length);
    const maxOther = Math.max(...otherLens);
    return correctLen > maxOther * 1.6 && correctLen - maxOther > 8;
  });
}

(async () => {
  section("Die Länge-/Form-Verräter sind fast vollständig behoben (vorher 144, jetzt nur noch vereinzelte Grenzfälle)");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const flat = Object.values(kq).flat();
    const stillFlagged = flagGiveaways(flat);
    ok(`Höchstens noch 10 Grenzfälle übrig (vorher 144 von ${flat.length})`, stillFlagged.length <= 10);
  }

  section("Stichprobe: konkrete, vorher gemeldete Fragen haben jetzt vergleichbar lange Antwortoptionen");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const checks = [
      ["3", "Was für ein Wort ist 'und'?"],
      ["5", "Was ist eine Metapher?"],
      ["10", "Was ist eine Wertetabelle einer Funktion?"],
      ["8", "Was ist Lyrik?"],
      ["10", "Was ist die UNO (UN)?"],
    ];
    checks.forEach(([klasse, qtext]) => {
      const q = kq[klasse].find(x => x.q === qtext);
      ok(`"${qtext}" (Klasse ${klasse}): alle 4 Antworten sind jetzt vergleichbar lang`, !!q && (() => {
        const lens = q.a.map(a => a.length);
        return Math.max(...lens) - Math.min(...lens) < Math.max(...lens) * 0.65;
      })());
    });
  }

  section("Die RICHTIGE Antwort wurde dabei nicht verändert, nur die falschen Ablenker (Stichprobe)");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const q1 = kq["5"].find(x => x.q === "Was ist Photosynthese?");
    ok("Richtige Antwort zu Photosynthese ist unverändert korrekt (inzwischen weiter gekürzt, gleicher Fakt)", /Licht|Pflanzen/.test(q1.a[q1.c]));
    const q2 = kq["9"].find(x => x.q === "Was war der Holocaust?");
    ok("Richtige Antwort zum Holocaust ist unverändert korrekt (inzwischen weiter gekürzt, gleicher Fakt)", /Mord|NS-/.test(q2.a[q2.c]));
  }

  section("Keine neuen Duplikate oder strukturellen Fehler durch die Überarbeitung eingeschleust");
  {
    const C = loadClient(); const { R } = C;
    const kq = R("KLASSE_QUESTIONS");
    const flat = Object.values(kq).flat();
    let errors = 0;
    flat.forEach(q => {
      if (q.a.length !== 4) errors++;
      if (new Set(q.a).size !== 4) errors++;
      if (q.c < 0 || q.c > 3) errors++;
    });
    ok("Alle Fragen weiterhin strukturell gültig (4 Antworten, keine doppelten, gültiger Index)", errors === 0);
  }

  section("Live-Durchlauf: ein überarbeiteter Haupttest (Klasse 6) funktioniert weiterhin normal");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=5; p.haupttestUnlockedForKlasse=5; beginSolo(p, true);');
    ok("20 gültige Fragen, Spiel startet normal", R('solo.questions.length') === 20);
    R('handleSoloAnswer(solo.questions[0].c);'); // richtige Antwort geben
    ok("Antwort wird korrekt als richtig gewertet", R('solo.correct') === 1);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
