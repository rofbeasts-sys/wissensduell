/* Nenn's Blitz hat keinen Solo-Modus, deshalb läuft die Kategorie-Wahl über
 * den Mehrspieler-Rundenbau (openRoundBuilder/renderRoundBuilder). Dort
 * jetzt ebenfalls nach Themen gruppiert (wie bei Einordnen/Mehr oder
 * Weniger), plus 8 neue Kategorien aus dem Gemini-Beispiel-Screenshot. */
const { ok, section, finish, loadClient, startServer, wsConnect, fs, path } = require("./helpers");

(async () => {
  section("Alle Nenn's-Blitz-Kategorien haben eine Themengruppe");
  {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasets.json"), "utf8"));
    const nb = data.nennsBlitz;
    const missing = Object.entries(nb).filter(([, v]) => !v.group).map(([k]) => k);
    ok("Keine Kategorie ohne Themengruppe", missing.length === 0);
  }

  section("8 neue Kategorien aus dem Screenshot sind da, richtig gruppiert");
  {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasets.json"), "utf8"));
    const nb = data.nennsBlitz;
    const alltag = ["autos_automarken", "social_media_plattformen", "tech_marken_gadgets", "getraenke_allgemein"];
    const entertainment = ["hollywood_schauspieler", "film_genres", "videospiel_klassiker", "streaming_dienste_tv"];
    ok("Alle 4 'Alltag, Konsum & Marken'-Kategorien vorhanden", alltag.every(k => !!nb[k]));
    ok("... korrekt dieser Gruppe zugeordnet", alltag.every(k => nb[k].group === "Alltag, Konsum & Marken"));
    ok("Alle 4 'Entertainment & Medien'-Kategorien vorhanden", entertainment.every(k => !!nb[k]));
    ok("... korrekt dieser Gruppe zugeordnet", entertainment.every(k => nb[k].group === "Entertainment & Medien"));
    ok("Keine davon ist germanOnly (international spielbar, wie die letzte Erweiterung)", [...alltag, ...entertainment].every(k => !nb[k].germanOnly));
    ok("Gesamtzahl jetzt 41 Nenn's-Blitz-Kategorien (vorher 33)", Object.keys(nb).length === 41);
  }

  section("Server: topicGroup kommt jetzt auch für Nenn's Blitz beim Client an");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "T", language: "de", gameMode: "blitz" });
    await new Promise(r => setTimeout(r, 250));
    const upd = h.find("roomUpdate");
    const defs = upd.availableRoundDefs || [];
    ok("Nenn's-Blitz-Kategorien sind da", defs.length > 10);
    ok("Jede hat ein topicGroup-Feld", defs.every(d => "topicGroup" in d));
    ok("'Entertainment & Medien' kommt als Gruppe vor", defs.some(d => d.topicGroup === "Entertainment & Medien"));
    ok("'Alltag, Konsum & Marken' kommt als Gruppe vor", defs.some(d => d.topicGroup === "Alltag, Konsum & Marken"));
    ok("Die neue Kategorie 'Hollywood-Schauspieler:innen' ist dabei", defs.some(d => d.id === "blitz_hollywood_schauspieler"));
    ok("Die neue Kategorie 'Social-Media-Plattformen' ist dabei", defs.some(d => d.id === "blitz_social_media_plattformen"));
    h.s.destroy();
    await S.stop();
  }

  section("Mehrspieler-Rundenbau: Kategorie-Liste zeigt Themenüberschriften (ohne aktive Suche)");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      party = { room: { gameMode:"blitz", roundCount:5, roundDefs:[], availableRoundDefs: [
        {id:"blitz_bands", kind:"nennsBlitz", label:"Nenn's Blitz: Bands", topicGroup:"Entertainment & Medien"},
        {id:"blitz_social", kind:"nennsBlitz", label:"Nenn's Blitz: Social Media", topicGroup:"Alltag, Konsum & Marken"},
        {id:"blitz_laender", kind:"nennsBlitz", label:"Nenn's Blitz: Länder", topicGroup:"Geografie"}
      ]}};
      openRoundBuilder('lobby');
      party.roundBuilder.selectedKind = 'nennsBlitz';
      renderRoundBuilder();
    `);
    const html = state.last;
    ok("Überschrift 'Entertainment & Medien' erscheint", html.includes("Entertainment &amp; Medien") || html.includes("Entertainment & Medien"));
    ok("Überschrift 'Alltag, Konsum & Marken' erscheint", html.includes("Alltag, Konsum &amp; Marken") || html.includes("Alltag, Konsum & Marken"));
    ok("Überschrift 'Geografie' erscheint", html.includes("Geografie"));
    ok("Kategorie-Text zeigt keinen 'Nenn's Blitz: '-Präfix mehr", !html.includes("Nenn's Blitz:"));
    ok("Alle drei Kategorien sind als Einträge da (Bands, Social Media, Länder)", html.includes("Bands") && html.includes("Social Media") && html.includes("Länder"));
  }

  section("Mehrspieler-Rundenbau: BEI aktiver Suche keine Gruppenüberschriften (nur flache Treffer)");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      party = { room: { gameMode:"blitz", roundCount:5, roundDefs:[], availableRoundDefs: [
        {id:"blitz_bands", kind:"nennsBlitz", label:"Nenn's Blitz: Bands", topicGroup:"Entertainment & Medien"},
        {id:"blitz_social", kind:"nennsBlitz", label:"Nenn's Blitz: Social Media", topicGroup:"Alltag, Konsum & Marken"}
      ]}};
      openRoundBuilder('lobby');
      party.roundBuilder.selectedKind = 'nennsBlitz';
      party.roundBuilder.categorySearch = 'band';
      renderRoundBuilder();
    `);
    const html = state.last;
    ok("Bei aktiver Suche keine Themenüberschrift mehr", !html.includes("Entertainment &amp; Medien") && !html.includes("Entertainment & Medien"));
    ok("Treffer ('Bands') ist trotzdem da", html.includes("Bands"));
    ok("Nicht-Treffer ('Social Media') ist durch die Suche herausgefiltert", !html.includes("Social Media"));
  }

  section("Deutschlandspezifische Kategorien bleiben bei Englisch weiterhin ausgeschlossen (keine Regression)");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "T", language: "en", gameMode: "blitz" });
    await new Promise(r => setTimeout(r, 250));
    const upd = h.find("roomUpdate");
    const ids = (upd.availableRoundDefs || []).map(d => d.id);
    ok("Bundesländer weiterhin nicht bei Englisch", !ids.includes("blitz_laender_bundeslaender"));
    ok("Neue internationale Kategorien (Hollywood-Schauspieler) sind bei Englisch da", ids.includes("blitz_hollywood_schauspieler"));
    h.s.destroy();
    await S.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
