/* Modus "Biologie": auf Wunsch OHNE Körperfigur (Mann/Frau-Diagramm) -
 * stattdessen eine gruppierte Themenliste im selben Stil wie Einordnen/
 * Mehr oder Weniger/Nenn's Blitz. Jedes Thema hat jetzt 8 Fragen im Pool
 * (vorher 5) für mehr Abwechslung, gespielt werden pro Runde weiterhin 5,
 * zufällig gezogen. Sexualkunde bleibt ein eigenständiger, klar benannter
 * Themenblock (Schulbuch-Niveau, rein sachlich-biologisch). */
const { ok, section, finish, loadClient } = require("./helpers");

function validQuestion(item) {
  return item && typeof item.q === "string" && item.q.length > 0
    && Array.isArray(item.a) && item.a.length === 4
    && new Set(item.a).size === 4
    && Number.isInteger(item.c) && item.c >= 0 && item.c <= 3
    && typeof item.e === "string" && item.e.length > 0;
}

(async () => {
  section("Datenbank: Körperteile (body) strukturell gültig, jetzt 8 Fragen je Thema");
  {
    const C = loadClient(); const { R } = C;
    const body = R("BIOLOGY_TOPICS.body");
    const topics = Object.keys(body);
    ok("Mindestens 10 Körperteile vorhanden", topics.length >= 10);
    ok("Jedes Thema hat jetzt mindestens 18 Fragen im Pool (vorher 5, dann 8 - jetzt nochmal deutlich mehr Abwechslung)", topics.every(k => body[k].items.length >= 18));
    ok("Alle Fragen strukturell gültig (4 Antworten, gültiger Index, Erklärung)", topics.every(k => body[k].items.every(validQuestion)));
    ok("Jedes Thema hat ein Icon und ein Label", topics.every(k => body[k].icon && body[k].label));
    const allQs = topics.flatMap(k => body[k].items.map(it => it.q));
    ok("Keine doppelten Fragen innerhalb der Körperteile", new Set(allQs).size === allQs.length);
  }

  section("Datenbank: Sexualkunde strukturell gültig, jetzt 8 Fragen je Thema, weiterhin sachlich");
  {
    const C = loadClient(); const { R } = C;
    const sk = R("BIOLOGY_TOPICS.sexualkunde");
    const topics = Object.keys(sk);
    ok("Mindestens 5 Sexualkunde-Themen vorhanden", topics.length >= 5);
    ok("Jedes Thema hat jetzt mindestens 18 Fragen im Pool", topics.every(k => sk[k].items.length >= 18));
    ok("Alle Fragen strukturell gültig", topics.every(k => sk[k].items.every(validQuestion)));
    ok("Themen 'Pubertät' und 'Einverständnis & Grenzen' sind vertreten", !!sk.puberty && !!sk.consent_boundaries);
    const allQs = topics.flatMap(k => sk[k].items.map(it => it.q));
    ok("Keine doppelten Fragen innerhalb von Sexualkunde", new Set(allQs).size === allQs.length);
    const allText = JSON.stringify(sk).toLowerCase();
    ok("Enthält sachliche Fachbegriffe (Eizelle, Befruchtung, Pubertät)", allText.includes("eizelle") && allText.includes("befruchtung") && allText.includes("pubertät"));
    ok("Enthält Hinweis auf Vertrauenspersonen/Beratung (Einverständnis-Thema)", allText.includes("vertrauensperson") || allText.includes("beratungsstelle") || allText.includes("nummer gegen kummer"));
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

  section("Themenliste: KEINE Körperfigur mehr, stattdessen gruppierte Chip-Liste wie bei Einordnen/Mehr oder Weniger");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow();');
    const html = state.last;
    ok("Kein Mann/Frau-Umschalter mehr vorhanden", !html.includes("🧍‍♂️ Mann") && !html.includes("🧍‍♀️ Frau"));
    ok("Keine Körperfigur/Hotspot-Elemente mehr im Markup", !html.includes("biology-figure") && !html.includes("biology-hotspot"));
    ok("Gruppenüberschrift 'Körper' vorhanden", html.includes(">Körper<"));
    ok("Gruppenüberschrift 'Sexualkunde' vorhanden", html.includes(">Sexualkunde<"));
    ok("Alle Körperteile als Chips in der Liste (z.B. Auge, Ohr, Herz)", ["Auge", "Ohr", "Herz"].every(t => html.includes(t)));
    ok("Chips nutzen dieselbe CSS-Klasse wie bei Einordnen/Mehr oder Weniger (chip-btn)", /class="chip-btn[^"]*" onclick="startBiologyTopic/.test(html));
    // Sexualkunde ist bei einem frischen Profil noch gesperrt (siehe eigener
    // Testabschnitt weiter unten) - hier nur pruefen, dass ueberhaupt eine
    // "Sexualkunde"-Gruppe als Gliederungspunkt existiert, nicht deren Inhalt.
  }

  section("Themenauswahl zieht 5 zufällige Fragen aus dem 8er-Pool, Antworten funktionieren");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow(); startBiologyTopic("body","herz");');
    ok("Session mit 5 Fragen gestartet (aus einem größeren Pool)", R('biologySession.items.length') === 5);
    ok("Alle 5 gezogenen Fragen stammen tatsächlich aus dem Herz-Pool", R('biologySession.items.every(q => BIOLOGY_TOPICS.body.herz.items.some(x=>x.q===q.q))'));
    ok("Erste Frage wird angezeigt", state.last.includes("Frage 1 von 5"));

    R('handleBiologyAnswer(biologySession.items[0].c);');
    ok("Richtige Antwort wird gezählt", R('biologySession.correct') === 1);
    ok("Erklärung erscheint nach der Antwort", !R('document.getElementById("bioExpl").classList.contains("hidden")'));

    R('biologyNext();');
    ok("Zweite Frage wird angezeigt", state.last.includes("Frage 2 von 5"));
  }

  section("Zwei aufeinanderfolgende Ziehungen desselben Themas können unterschiedliche Fragen liefern (echte Abwechslung)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); startBiologyFlow();');
    const sets = [];
    for (let i = 0; i < 6; i++) {
      R('startBiologyTopic("body","herz");');
      sets.push(JSON.stringify(R('biologySession.items.map(q=>q.q)').sort()));
    }
    ok("Mindestens zwei der 6 Ziehungen unterscheiden sich voneinander (großer Pool, nur 5 gezogen - nicht immer dieselben 5)", new Set(sets).size > 1);
  }

  section("Abschluss eines Themas: Ergebnis, Münzen nur beim ERSTEN Mal");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow(); startBiologyTopic("body","herz");');
    for (let i = 0; i < 5; i++) { R('handleBiologyAnswer(biologySession.items[biologySession.qIndex].c);'); R('biologyNext();'); }
    ok("Ergebnisbildschirm zeigt 5/5", state.last.includes("5/5 richtig beantwortet"));
    ok("Münzen beim ersten Abschluss vergeben (+3)", R('p.coins') === 3);
    ok("Thema ist jetzt als erledigt markiert", R('p.biologyDone.herz') === true);

    R('startBiologyTopic("body","herz");');
    for (let i = 0; i < 5; i++) { R('handleBiologyAnswer(biologySession.items[biologySession.qIndex].c);'); R('biologyNext();'); }
    ok("Beim zweiten Mal keine weiteren Münzen (immer noch 3, nicht 6)", R('p.coins') === 3);
  }

  section("Sexualkunde-Themen laufen über denselben Mechanismus, eigener 'erledigt'-Schlüssel");
  {
    const C = loadClient(); const { R } = C;
    // Freischaltung direkt simulieren (das Freischalten selbst ist bereits
    // in einem eigenen Abschnitt weiter unten ausfuehrlich getestet).
    R(`
      var p=createProfile("T"); startBiologyFlow();
      p.biologyPerfect = {}; Object.keys(BIOLOGY_TOPICS.body).forEach(k => p.biologyPerfect[k] = true);
      startBiologyTopic("sexualkunde","puberty");
    `);
    for (let i = 0; i < 5; i++) { R('handleBiologyAnswer(biologySession.items[biologySession.qIndex].c);'); R('biologyNext();'); }
    ok("Sexualkunde-Thema als erledigt markiert (eigener Schlüssel, kollidiert nicht mit Körperteilen)", R('p.biologyDone.sk_puberty') === true);
    ok("Münzen auch hier vergeben", R('p.coins') === 3);
  }

  section("Abbrechen während einer Runde funktioniert, kein hängender Zustand");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow(); startBiologyTopic("body","auge");');
    R('biologySession=null; renderBiologyTopics(biologyProfile);');
    ok("Zurück auf der Themenliste, keine hängende Session", R('biologySession') === null && state.last.includes("BIOLOGIE"));
  }

  section("Sexualkunde ist zu Beginn gesperrt, erst nach allen Körper-Themen fehlerfrei freigeschaltet");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow();');
    const html = state.last;
    ok("Zeigt 'Noch gesperrt' statt der Sexualkunde-Themen", html.includes("Noch gesperrt"));
    ok("Zeigt den Fortschritt (0 / 12)", /0\s*\/\s*12/.test(html));
    ok("Kein anklickbarer Sexualkunde-Chip im Markup", !html.includes("startBiologyTopic('sexualkunde'"));
    ok("biologySexualkundeUnlocked(p) ist false", R('biologySexualkundeUnlocked(p)') === false);

    // Direkter Versuch, trotzdem zu starten, muss ins Leere laufen
    R('biologySession = null; startBiologyTopic("sexualkunde","puberty");');
    ok("Direkter Aufruf wird abgelehnt (keine Session gestartet, da noch gesperrt)", R('biologySession') === null);
  }
  section("Sexualkunde schaltet sich frei, sobald alle 12 Körper-Themen einmal fehlerfrei (5/5) gelöst wurden");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startBiologyFlow();');
    const bodyKeys = R('Object.keys(BIOLOGY_TOPICS.body)');
    // Alle bis auf das letzte Thema fehlerfrei durchspielen
    for (const key of bodyKeys.slice(0, -1)) {
      R(`startBiologyTopic("body","${key}");`);
      for (let i = 0; i < 5; i++) { R('handleBiologyAnswer(biologySession.items[biologySession.qIndex].c);'); R('biologyNext();'); }
    }
    ok("Noch nicht freigeschaltet (ein Thema fehlt noch)", R('biologySexualkundeUnlocked(p)') === false);

    // Letztes Thema ebenfalls fehlerfrei
    const lastKey = bodyKeys[bodyKeys.length - 1];
    R(`startBiologyTopic("body","${lastKey}");`);
    for (let i = 0; i < 5; i++) { R('handleBiologyAnswer(biologySession.items[biologySession.qIndex].c);'); R('biologyNext();'); }
    ok("Jetzt freigeschaltet (alle 12 Themen fehlerfrei)", R('biologySexualkundeUnlocked(p)') === true);
    ok("Meldung 'Sexualkunde freigeschaltet' erscheint genau in diesem Moment", state.last.includes("Sexualkunde freigeschaltet"));

    R('renderBiologyTopics(p);');
    ok("Sexualkunde-Themen sind jetzt als Chips anklickbar", R('document.getElementById("app").innerHTML').includes("startBiologyTopic('sexualkunde'"));
  }
  section("Ein NICHT fehlerfreier Durchlauf zählt nicht für die Freischaltung (muss wirklich 5/5 sein)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); startBiologyFlow(); startBiologyTopic("body","herz");');
    R('handleBiologyAnswer(-1);'); R('biologyNext();'); // bewusst falsch (ungueltiger Index)
    for (let i = 0; i < 4; i++) { R('handleBiologyAnswer(biologySession.items[biologySession.qIndex].c);'); R('biologyNext();'); }
    ok("Thema ist als 'besucht' markiert", R('p.biologyDone.herz') === true);
    ok("...aber NICHT als 'perfekt' (eine Antwort war falsch)", !R('p.biologyPerfect.herz'));
  }

  section("Menüzugang vom Hauptmenü aus vorhanden");
  {
    const C = loadClient(); const { R, state } = C;
    R('renderMainMenu();');
    ok("🧬 Biologie-Kachel ist im Hauptmenü", state.last.includes("🧬") && state.last.includes("startBiologyFlow()"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
