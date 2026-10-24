/* Auf Wunsch: alle 62 Erfolge (Titel + Beschreibung) sowie alle 8
 * Kategorien ins Englische übersetzt. Technisch über eine separate
 * TEXT_EN-Tabelle in achievements.js gelöst (statt die DEFS-Struktur mit
 * ihren vielen .map()-generierten Einträgen umzubauen) - Achv.getTitle(id,
 * lang)/getDesc(id, lang)/getCategoryTitle(catId, lang) fallen bei
 * fehlender Übersetzung automatisch auf Deutsch zurück. */
const { ok, section, finish, loadClient } = require("./helpers");
const Achv = require("../public/achievements.js");

(async () => {
  section("Alle 62 Erfolge haben eine englische Übersetzung (kein stiller Rückfall auf Deutsch)");
  {
    let missing = [];
    Achv.DEFS.forEach(d => {
      const en = Achv.getTitle(d.id, "en");
      const deFallback = Achv.getTitle(d.id, "de");
      if (en === deFallback) missing.push(d.id);
    });
    ok(`Keine fehlenden Übersetzungen (gefunden: ${missing.length}: ${missing.join(",")})`, missing.length === 0);
  }

  section("Alle 8 Kategorien haben einen englischen Titel");
  {
    Achv.CATEGORIES.forEach(c => {
      const en = Achv.getCategoryTitle(c.id, "en");
      ok(`Kategorie '${c.id}' hat eine englische Übersetzung ('${en}')`, en && en !== "" && typeof en === "string");
    });
  }

  section("getTitle/getDesc/getCategoryTitle fallen bei 'de' (oder unbekannter Sprache) korrekt auf Deutsch zurück");
  {
    ok("getTitle('de') liefert den deutschen Originaltitel", Achv.getTitle("bt_all_classes", "de") === "Alle Klassen geschafft");
    ok("getTitle(unbekannte Sprache) fällt auf Deutsch zurück", Achv.getTitle("bt_all_classes", "fr") === "Alle Klassen geschafft");
    ok("getDesc('de') liefert die deutsche Originalbeschreibung", Achv.getDesc("bio_sexualkunde_unlocked", "de").includes("Körper-Themen"));
  }

  section("Stichprobe korrekter englischer Übersetzungen (inhaltlich richtig, nicht nur vorhanden)");
  {
    ok("bt_all_fast korrekt übersetzt", Achv.getTitle("bt_all_fast", "en") === "Fastest mind");
    ok("bio_sexualkunde_unlocked korrekt übersetzt", Achv.getTitle("bio_sexualkunde_unlocked", "en") === "Sex Ed unlocked");
    ok("sm_level_100 korrekt übersetzt", Achv.getTitle("sm_level_100", "en") === "Speed Math level 100");
    ok("cat_biology (automatisch generiert) korrekt übersetzt", Achv.getTitle("cat_biology", "en") === "Biology mastered");
    ok("collector_all korrekt übersetzt", Achv.getTitle("collector_all", "en") === "Complete");
  }

  section("Erfolge-Seite zeigt bei currentLang='en' durchgehend englische Texte, kein Deutsch mehr sichtbar");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="en"; var p=createProfile("T"); startAchievementsFlow();');
    const html = state.last;
    ok("Überschrift auf Englisch ('ACHIEVEMENTS')", html.includes("ACHIEVEMENTS"));
    ok("Zähler auf Englisch ('of ... unlocked')", /\d+ of \d+ unlocked/.test(html));
    ok("Kategorie 'Biology' auf Englisch sichtbar", html.includes("Biology"));
    ok("Kategorie 'Drag and Drop' auf Englisch sichtbar", html.includes("Drag and Drop"));
    ok("Kein deutsches 'ERFOLGE' mehr im Markup", !html.includes("🏆 ERFOLGE"));
    ok("Kein deutsches 'freigeschaltet' mehr im Zähler-Text", !/\d+ von \d+ freigeschaltet/.test(html));
  }

  section("Erfolge-Seite zeigt bei currentLang='de' weiterhin die gewohnten deutschen Texte (keine Regression)");
  {
    const C = loadClient(); const { R, state } = C;
    R('currentLang="de"; var p=createProfile("T"); startAchievementsFlow();');
    const html = state.last;
    ok("Überschrift weiterhin auf Deutsch ('ERFOLGE')", html.includes("🏆 ERFOLGE"));
    ok("Zähler weiterhin auf Deutsch", /\d+ von \d+ freigeschaltet/.test(html));
    ok("Kategorie 'Biologie' weiterhin auf Deutsch", html.includes("Biologie"));
  }

  section("Freischalt-Datum nutzt bei Englisch das englische Datumsformat");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      currentLang = "en";
      var p = createProfile("T");
      p.achv = Achv.newState();
      p.achv.unlocked["ord_complete"] = Date.now();
      p.achv.ord.completed = 1;
      startAchievementsFlow();
    `);
    ok("Zeigt 'unlocked on' statt 'freigeschaltet am'", state.last.includes("unlocked on"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
