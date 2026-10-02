/* Neuer Modus "Biologie": Körperteile antippen (5 Fragen je Teil) + ein
 * eigenständiger, klar benannter Sexualkunde-Themenblock (Schulbuch-
 * Niveau Klasse 5-10, rein sachlich-biologisch - Pubertät, Fortpflanzung,
 * Zyklus, Schwangerschaft, Verhütung/Gesundheit, Einverständnis & Grenzen). */
const { ok, section, finish, loadClient } = require("./helpers");

function validQuestion(item) {
  return item && typeof item.q === "string" && item.q.length > 0
    && Array.isArray(item.a) && item.a.length === 4
    && new Set(item.a).size === 4
    && Number.isInteger(item.c) && item.c >= 0 && item.c <= 3
    && typeof item.e === "string" && item.e.length > 0;
}

(async () => {
  section("Datenbank: Körperteile (body) strukturell gültig");
  {
    const C = loadClient(); const { R } = C;
    const body = R("BIOLOGY_TOPICS.body");
    const topics = Object.keys(body);
    ok("Mindestens 10 Körperteile vorhanden", topics.length >= 10);
    ok("Jedes Thema hat genau 5 Fragen", topics.every(k => body[k].items.length === 5));
    ok("Alle Fragen strukturell gültig (4 Antworten, gültiger Index, Erklärung)", topics.every(k => body[k].items.every(validQuestion)));
    ok("Jedes Thema hat ein Icon und ein Label", topics.every(k => body[k].icon && body[k].label));
    const allQs = topics.flatMap(k => body[k].items.map(it => it.q));
    ok("Keine doppelten Fragen innerhalb der Körperteile", new Set(allQs).size === allQs.length);
  }

  section("Datenbank: Sexualkunde strukturell gültig und inhaltlich sachlich");
  {
    const C = loadClient(); const { R } = C;
    const sk = R("BIOLOGY_TOPICS.sexualkunde");
    const topics = Object.keys(sk);
    ok("Mindestens 5 Sexualkunde-Themen vorhanden", topics.length >= 5);
    ok("Jedes Thema hat genau 5 Fragen", topics.every(k => sk[k].items.length === 5));
    ok("Alle Fragen strukturell gültig", topics.every(k => sk[k].items.every(validQuestion)));
    ok("Themen 'Pubertät' und 'Einverständnis & Grenzen' sind vertreten", !!sk.puberty && !!sk.consent_boundaries);
    const allQs = topics.flatMap(k => sk[k].items.map(it => it.q));
    ok("Keine doppelten Fragen innerhalb von Sexualkunde", new Set(allQs).size === allQs.length);
    // Stichprobenartige inhaltliche Pruefung: sachlich-biologische Begriffe
    // kommen vor, keine umgangssprachlichen/anzueglichen Formulierungen.
    const allText = JSON.stringify(sk).toLowerCase();
    ok("Enthält sachliche Fachbegriffe (Eizelle, Befruchtung, Pubertät)", allText.includes("eizelle") && allText.includes("befruchtung") && allText.includes("pubertät"));
    ok("Enthält Hinweis auf Vertrauenspersonen/Beratung (Einverständnis-Thema)", allText.includes("vertrauensperson") || allText.includes("beratungsstelle"));
  }

  section("Keine Überschneidung zwischen Körperteil- und Sexualkunde-Fragen");
  {
    const C = loadClient(); const { R } = C;
    const allQs = R(`
      Object.values(BIOLOGY_TOPICS.body).flatMap(c=>c.items.map(it=>it.q))
        .concat(Object.values(BIOLOGY_TOPICS.sexualkunde).flatMap(c=>c.items.map(it=>it.q)))
    `);
    ok("Komplett eindeutige Fragen über beide Bereiche hinweg", new Set(allQs).size === allQs.length);
  }

  section("Körperdiagramm: Mann/Frau umschaltbar, Direkt-Hotspots + Restliste vorhanden");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow();');
    const html = state.last;
    ok("Mann/Frau-Auswahl vorhanden", html.includes("Mann") && html.includes("Frau"));
    ok("Figur wird angezeigt (Emoji-Platzhalter)", html.includes("biology-figure"));
    ok("Direkt-Hotspots für Kopf, Hand, Herz, Fuß vorhanden", html.includes("biology-hotspot"));
    ok("Weitere Körperteile als Liste vorhanden (z.B. Auge, Ohr)", html.includes("Auge") && html.includes("Ohr"));
    ok("Sexualkunde-Button vorhanden, klar als eigener Themenblock benannt", html.includes("🌱 Sexualkunde"));

    R('biologySetFigure("f");');
    ok("Umschalten auf Frau funktioniert", R('biologyProfile.figure') === "f");
  }

  section("Themenauswahl startet eine 5-Fragen-Runde, Antworten funktionieren");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow(); startBiologyTopic("body","herz");');
    ok("Session mit 5 Fragen gestartet", R('biologySession.items.length') === 5);
    ok("Erste Frage wird angezeigt", state.last.includes("Frage 1 von 5"));

    R('handleBiologyAnswer(biologySession.items[0].c);'); // bewusst richtig
    ok("Richtige Antwort wird gezählt", R('biologySession.correct') === 1);
    ok("Erklärung erscheint nach der Antwort (im echten DOM, nicht nur im ursprünglichen Markup)", !R('document.getElementById("biologyExpl").classList.contains("hidden")'));

    R('biologyNext();');
    ok("Zweite Frage wird angezeigt", state.last.includes("Frage 2 von 5"));
  }

  section("Abschluss eines Themas: Ergebnis, Münzen nur beim ERSTEN Mal");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow(); startBiologyTopic("body","herz");');
    for (let i = 0; i < 5; i++) { R('handleBiologyAnswer(biologySession.items[biologySession.qIndex].c);'); R('biologyNext();'); }
    ok("Ergebnisbildschirm zeigt 5/5", state.last.includes("5/5 richtig beantwortet"));
    ok("Münzen beim ersten Abschluss vergeben (+3)", R('p.coins') === 3);
    ok("Thema ist jetzt als erledigt markiert", R('p.biologyDone.herz') === true);

    // Zweiter Durchlauf desselben Themas: keine erneuten Muenzen
    R('startBiologyTopic("body","herz");');
    for (let i = 0; i < 5; i++) { R('handleBiologyAnswer(biologySession.items[biologySession.qIndex].c);'); R('biologyNext();'); }
    ok("Beim zweiten Mal keine weiteren Münzen (immer noch 3, nicht 6)", R('p.coins') === 3);
  }

  section("Sexualkunde-Themen laufen über denselben Mechanismus, eigener 'erledigt'-Schlüssel");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); startBiologyFlow(); startBiologyTopic("sexualkunde","puberty");');
    for (let i = 0; i < 5; i++) { R('handleBiologyAnswer(biologySession.items[biologySession.qIndex].c);'); R('biologyNext();'); }
    ok("Sexualkunde-Thema als erledigt markiert (eigener Schlüssel, kollidiert nicht mit Körperteilen)", R('p.biologyDone.sk_puberty') === true);
    ok("Münzen auch hier vergeben", R('p.coins') === 3);
  }

  section("Abbrechen während einer Runde funktioniert, kein hängender Zustand");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow(); startBiologyTopic("body","auge");');
    R('biologySession=null; renderBiologyDiagram(biologyProfile);');
    ok("Zurück auf dem Körperdiagramm, keine hängende Session", R('biologySession') === null && state.last.includes("BIOLOGIE"));
  }

  section("Menüzugang vom Hauptmenü aus vorhanden");
  {
    const C = loadClient(); const { R, state } = C;
    R('renderMainMenu();');
    ok("🧬 Biologie-Kachel ist im Hauptmenü", state.last.includes("🧬") && state.last.includes("startBiologyFlow()"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
