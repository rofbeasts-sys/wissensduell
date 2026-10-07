/* Auf Wunsch: alle 360 Biologie-/Sexualkunde-Fragen auch ins Englische
 * übersetzt und in den englischen Brain Test (KLASSE_QUESTIONS_EN)
 * übernommen - gleiche Themen-zu-Klasse-Zuordnung wie beim Deutschen.
 * Englischer Brain Test wächst dadurch von 500 auf 859 Fragen. Dabei
 * wurden 77 neue Fragen auf das bekannte "Längen-Verräter"-Muster
 * geprüft und nachgekürzt. */
const { ok, section, finish, loadClient } = require("./helpers");

(async () => {
  section("Englischer Brain Test ist deutlich gewachsen (500 -> 859) durch die Biologie-Übernahme");
  {
    const C = loadClient(); const { R } = C;
    const en = R("KLASSE_QUESTIONS_EN");
    const flat = Object.values(en).flat();
    ok("Gesamtzahl jetzt 859 (vorher 500)", flat.length === 859);
    ok("Keine doppelten Fragen", (() => {
      const seen = new Set(); let dup = 0;
      flat.forEach(q => { const k = q.q.trim().toLowerCase(); if (seen.has(k)) dup++; seen.add(k); });
      return dup === 0;
    })());
  }

  section("Themenweise Verteilung passt zur deutschen Zuordnung (Hand/Fuß->3, Augen/Ohr->4, usw.)");
  {
    const C = loadClient(); const { R } = C;
    const en = R("KLASSE_QUESTIONS_EN");
    ok("Klasse 3 enthält Hand-Thema (z.B. Fingernägel)", en["3"].some(q => q.q.includes("fingernails")));
    ok("Klasse 4 enthält Augen-Thema (z.B. Blinzeln)", en["4"].some(q => q.q.toLowerCase().includes("blink")));
    ok("Klasse 5 enthält Pubertät-Thema", en["5"].some(q => q.q === "What is puberty?"));
    ok("Klasse 9 enthält Verhütungs-Thema (z.B. Kondom)", en["9"].some(q => q.q.toLowerCase().includes("condom")));
    ok("Klasse 10 enthält Einverständnis-Thema", en["10"].some(q => q.q.toLowerCase().includes("consent") || q.q.toLowerCase().includes("boundar")));
  }

  section("Strukturell gültig: 4 Antworten, gültiger Index, Erklärung vorhanden");
  {
    const C = loadClient(); const { R } = C;
    const en = R("KLASSE_QUESTIONS_EN");
    const flat = Object.values(en).flat();
    let errors = 0;
    flat.forEach(q => {
      if (!q.a || q.a.length !== 4 || new Set(q.a).size !== 4) errors++;
      if (q.c < 0 || q.c > 3) errors++;
      if (!q.e) errors++;
    });
    ok("Keine strukturellen Fehler in allen 859 Fragen", errors === 0);
  }

  section("Längen-Verräter-Muster wurde bei den neuen Fragen behoben (Regressionstest)");
  {
    const C = loadClient(); const { R } = C;
    const en = R("KLASSE_QUESTIONS_EN");
    const flat = Object.values(en).flat();
    const allAnswers = flat.flatMap(q => q.a);
    const longOnes = allAnswers.filter(a => a.length > 45);
    const ratio = longOnes.length / allAnswers.length;
    ok(`Lange Antworttexte bleiben die Ausnahme (${longOnes.length} von ${allAnswers.length}, ${(ratio * 100).toFixed(1)}%)`, ratio < 0.05);
  }

  section("Live-Durchlauf: Haupttest einer stark gewachsenen englischen Klasse funktioniert normal");
  {
    const C = loadClient(); const { R } = C;
    R(`
      currentLang = "en";
      var p = createProfile("T"); p.klasse = 6; p.haupttestUnlockedForKlasse = 6;
      beginSolo(p, true);
    `);
    ok("Haupttest liefert weiterhin genau 20 Fragen (Klasse 7, jetzt 110 Fragen Pool)", R("solo.questions.length") === 20);
    ok("Alle Fragen stammen aus dem englischen Pool", R(`solo.questions.every(q => KLASSE_QUESTIONS_EN["7"].some(x => x.q === q.q))`));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
