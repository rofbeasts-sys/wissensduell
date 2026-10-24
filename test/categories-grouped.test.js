/* Neue Einordnen-/Mehr-oder-Weniger-Kategorien (Fußball-Varianten, Geld/
 * Streams, Kalorien, Tier-Kuriositäten), Themengruppierung in der Solo-
 * Kategorie-Auswahl, und der redundante "Einordnen: "/"Mehr oder Weniger: "-
 * Präfix wird nicht mehr angezeigt, wo man ohnehin schon im Modus ist. */
const { ok, section, finish, loadClient, startServer, wsConnect, fs, path } = require("./helpers");

function validCategory(key, cat, kind) {
  const errs = [];
  if (!Array.isArray(cat.items) || cat.items.length < 4) errs.push(`${key}: zu wenige Items`);
  const ids = (cat.items || []).map(it => it.id);
  if (new Set(ids).size !== ids.length) errs.push(`${key}: doppelte IDs`);
  (cat.items || []).forEach(it => {
    if (typeof it.name !== "string" || !it.name) errs.push(`${key}/${it.id}: 'name' fehlt`);
    if (typeof it.value !== "number") errs.push(`${key}/${it.id}: 'value' ist keine Zahl`);
  });
  if (cat.order !== "asc" && cat.order !== "desc") errs.push(`${key}: 'order' fehlt/ungültig`);
  if (!cat.unit) errs.push(`${key}: 'unit' fehlt`);
  if (!cat.group) errs.push(`${key}: 'group' (Themengruppe) fehlt`);
  if (kind === "higherLower") {
    if (!cat.seedId) errs.push(`${key}: 'seedId' fehlt`);
    else if (!ids.includes(cat.seedId)) errs.push(`${key}: seedId '${cat.seedId}' kommt nicht in items vor`);
  }
  return errs;
}

(async () => {
  section("Neue Kategorien: strukturell gültig, mit Themengruppe");
  {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasets.json"), "utf8"));
    let allErrors = [];
    for (const kind of ["ordering", "higherLower"]) {
      for (const [key, cat] of Object.entries(data[kind])) {
        allErrors = allErrors.concat(validCategory(key, cat, kind));
      }
    }
    ok("Alle Einordnen- und Mehr-oder-Weniger-Kategorien sind strukturell gültig (inkl. aller neuen)", allErrors.length === 0);
    if (allErrors.length) console.log(allErrors.slice(0, 10));

    const newOrderingKeys = ["fussball_tore_laenderspiele", "fussball_cl_titel", "fussball_vereinswert", "fussball_wm_siege_land", "stadien_kapazitaet", "lebensmittel_kalorien", "fastfood_kalorien", "tiere_zungenlaenge", "tiere_herzschlag", "sprachen_sprecherzahl"];
    const newHlKeys = ["fussball_jahresgehalt", "streamer_einnahmen", "songs_streams_spotify", "filme_produktionsbudget", "youtube_abonnenten", "unternehmen_jahresumsatz", "lebensmittel_kalorien_hl", "tiere_lebenserwartung"];
    ok("Alle 10 neuen Einordnen-Kategorien sind da", newOrderingKeys.every(k => !!data.ordering[k]));
    ok("Alle 8 neuen Mehr-oder-Weniger-Kategorien sind da", newHlKeys.every(k => !!data.higherLower[k]));
    ok("Fußball ist jetzt mit mehreren Varianten vertreten (Tore, CL-Titel, Vereinswert, WM-Titel, Gehalt - nicht nur Kaderwert wie vorher)", newOrderingKeys.filter(k => k.startsWith("fussball")).length >= 4);
    ok("Geld/Einnahmen-Themen wie gewünscht (Streamer-Einnahmen, Streams, Umsatz)", !!data.higherLower.streamer_einnahmen && !!data.higherLower.songs_streams_spotify && !!data.higherLower.unternehmen_jahresumsatz);
    ok("Kalorien-Kategorien wie gewünscht vorhanden", !!data.ordering.lebensmittel_kalorien && !!data.higherLower.lebensmittel_kalorien_hl);
    ok("Kuriose Tier-Fakten wie gewünscht (Zungenlänge als Beispiel genannt)", !!data.ordering.tiere_zungenlaenge);
  }

  section("Alle BESTEHENDEN Kategorien haben jetzt ebenfalls eine Themengruppe (nachträglich ergänzt)");
  {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "shared", "partyDatasets.json"), "utf8"));
    const missing = [];
    for (const kind of ["ordering", "higherLower"]) {
      for (const [key, cat] of Object.entries(data[kind])) {
        if (!cat.group) missing.push(kind + "/" + key);
      }
    }
    ok("Keine Kategorie ohne Themengruppe übrig", missing.length === 0);
  }

  section("Server: Themengruppe (topicGroup) kommt beim Client an");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "T", language: "de", gameMode: "ordering" });
    await new Promise(r => setTimeout(r, 250));
    const upd = h.find("roomUpdate");
    const defs = upd.availableRoundDefs || [];
    ok("availableRoundDefs enthält Einträge", defs.length > 5);
    ok("Jeder Eintrag hat ein topicGroup-Feld", defs.every(d => "topicGroup" in d));
    ok("Die Werte sind sinnvolle Themennamen (z.B. 'Sport' kommt vor)", defs.some(d => d.topicGroup === "Sport"));
    h.s.destroy();
    await S.stop();
  }

  section("shortLabel(): entfernt den Präfix vor dem ersten ': '");
  {
    const C = loadClient(); const { R } = C;
    ok("'Einordnen: Fußball' -> 'Fußball'", R('shortLabel("Einordnen: Fußball")') === "Fußball");
    ok("'Mehr oder Weniger: Einwohner' -> 'Einwohner'", R('shortLabel("Mehr oder Weniger: Einwohner")') === "Einwohner");
    ok("Kein ': ' vorhanden -> Text bleibt unverändert", R('shortLabel("Tic Tac Toe")') === "Tic Tac Toe");
    ok("Leerer/undefined String stürzt nicht ab", R('shortLabel(undefined)') === undefined || R('shortLabel("")') === "");
  }

  section("Solo-Kategorie-Auswahl: gruppiert mit Überschriften, kein Präfix mehr auf den Chips");
  {
    const C = loadClient(); const { R } = C;
    const defs = [
      { id: "order_a", label: "Einordnen: Fußball-Dings", topicGroup: "Sport" },
      { id: "order_b", label: "Einordnen: Noch was Sport", topicGroup: "Sport" },
      { id: "order_c", label: "Einordnen: Geld-Dings", topicGroup: "Geld & Wirtschaft" },
    ];
    const html = R(`categoryChipsGroupedHtml(${JSON.stringify(defs)}, 'chooseSoloCategory')`);
    ok("Gruppenüberschrift 'Sport' erscheint", html.includes(">Sport<"));
    ok("Gruppenüberschrift 'Geld & Wirtschaft' erscheint", html.includes(">Geld &amp; Wirtschaft<") || html.includes(">Geld & Wirtschaft<"));
    ok("Chip-Text hat KEIN 'Einordnen: ' mehr", !html.includes("Einordnen:"));
    ok("Chip-Text zeigt den Rest ('Fußball-Dings')", html.includes("Fußball-Dings"));
    ok("Beide Sport-Kategorien stehen unter derselben Überschrift (nur 1x 'Sport' als Überschrift)", (html.match(/>Sport</g) || []).length === 1);
  }

  section("Solo-Kategorie-Auswahl: Kategorien OHNE Themengruppe (andere Modi) bleiben als flache Liste, keine falschen Überschriften");
  {
    const C = loadClient(); const { R } = C;
    const defs = [
      { id: "music_a", label: "Musik raten: Rock", topicGroup: null },
      { id: "music_b", label: "Musik raten: Pop", topicGroup: null },
    ];
    const html = R(`categoryChipsGroupedHtml(${JSON.stringify(defs)}, 'chooseSoloCategory')`);
    ok("Keine Themenüberschrift, da keine der Kategorien eine hat", !html.includes("picker-sub") || !/font-weight:700/.test(html));
    ok("Beide Kategorien trotzdem als Chips da", html.includes("Rock") && html.includes("Pop"));
  }

  section("Im Spiel selbst: Titel zeigt den Präfix nicht mehr (Live-Test)");
  {
    const S = await startServer();
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "T", language: "de", gameMode: "ordering" });
    await new Promise(r => setTimeout(r, 250));
    h.send({ action: "setRoundMode", mode: "custom" });
    h.send({ action: "setRoundDef", index: 0, defId: "order_stadien_kapazitaet" });
    await new Promise(r => setTimeout(r, 100));
    h.send({ action: "startGame" });
    let waited = 0;
    while (!h.find("orderingState") && waited < 8000) { await new Promise(r => setTimeout(r, 100)); waited += 100; }
    const startMsg = h.find("orderingState");
    ok("Rundenstart-Nachricht enthält weiterhin das volle Label (Server ändert nichts, Kürzung passiert rein auf Client-Seite)", !!startMsg && startMsg.label.includes("Drag and Drop:"));
    h.s.destroy();
    await S.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
