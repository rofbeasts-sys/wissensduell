/* Auf Wunsch: Speed Math um zwei weitere Stufen erweitert (75/100, vorher
 * bei 50 gedeckelt) und eine komplett neue Erfolge-Kategorie "Biologie"
 * ergänzt (gab es vorher gar nicht - Biologie war die einzige Solo-Aktivität
 * ohne jede Erfolgs-Anbindung). topicsDone/perfectCount sind Gesamtzähler
 * (aus profile.biologyDone/biologyPerfect abgeleitet), kein Pro-Ereignis-
 * Addieren, damit Wiederholungen nicht doppelt zählen. */
const { ok, section, finish, loadClient } = require("./helpers");
const Achv = require("../public/achievements.js");

(async () => {
  section("Speed Math: zwei neue, höhere Stufen (75/100) zusätzlich zur bisherigen Obergrenze (50)");
  {
    ok("sm_level_75 existiert", Achv.DEFS.some(d => d.id === "sm_level_75"));
    ok("sm_level_100 existiert", Achv.DEFS.some(d => d.id === "sm_level_100"));
    const s = Achv.newState();
    const newly = Achv.apply(s, { t: "speedmath", level: 100 });
    ok("Level 100 schaltet auch die alten Zwischenstufen (10/25/50) gleichzeitig frei", ["sm_level_10", "sm_level_25", "sm_level_50", "sm_level_75", "sm_level_100"].every(id => newly.includes(id)));
  }

  section("Neue Kategorie 'Biologie' ist vorhanden, mit Themen-, Perfekt- und Sexualkunde-Erfolgen");
  {
    ok("Kategorie 'biology' existiert", Achv.CATEGORIES.some(c => c.id === "biology"));
    ["bio_topics_3", "bio_topics_8", "bio_topics_14", "bio_topics_18", "bio_perfect_1", "bio_perfect_5", "bio_perfect_12", "bio_sexualkunde_unlocked"].forEach(id => {
      ok(`Erfolg '${id}' existiert`, Achv.DEFS.some(d => d.id === id));
    });
    ok("Automatischer Kategorie-Sammelerfolg 'cat_biology' existiert ebenfalls", Achv.DEFS.some(d => d.id === "cat_biology"));
  }

  section("topicsDone/perfectCount sind Gesamtzähler - mehrfaches Melden desselben Standes zählt nicht doppelt");
  {
    const s = Achv.newState();
    Achv.apply(s, { t: "biology", topicsDone: 3, perfectCount: 0, sexualkundeUnlocked: false });
    Achv.apply(s, { t: "biology", topicsDone: 3, perfectCount: 0, sexualkundeUnlocked: false });
    Achv.apply(s, { t: "biology", topicsDone: 3, perfectCount: 0, sexualkundeUnlocked: false });
    ok("Bleibt bei 3, auch nach 3x derselben Meldung", s.bio.topicsDone === 3);
    const newly = Achv.apply(s, { t: "biology", topicsDone: 8, perfectCount: 1, sexualkundeUnlocked: false });
    ok("Steigt korrekt auf 8 und schaltet den passenden Erfolg frei", s.bio.topicsDone === 8 && newly.includes("bio_topics_8"));
    ok("Erstes perfektes Thema schaltet sich bei perfectCount=1 frei", newly.includes("bio_perfect_1"));
  }

  section("Sexualkunde-Freischaltung ist ein eigener, einmaliger Erfolg (bleibt dauerhaft frei)");
  {
    const s = Achv.newState();
    Achv.apply(s, { t: "biology", topicsDone: 12, perfectCount: 12, sexualkundeUnlocked: true });
    ok("bio_sexualkunde_unlocked ist frei", !!s.unlocked.bio_sexualkunde_unlocked);
    ok("bio_perfect_12 (alle Körper-Themen fehlerfrei) ist ebenfalls frei", !!s.unlocked.bio_perfect_12);
  }

  section("backfill(): bereits vor diesem Feature vorhandener Biologie-Fortschritt zählt rückwirkend");
  {
    const s = Achv.newState();
    const profile = { klasse: 0, biologyDone: { herz: true, auge: true, ohr: true }, biologyPerfect: { herz: true } };
    Achv.backfill(s, profile);
    ok("topicsDone rückwirkend auf 3 gesetzt", s.bio.topicsDone === 3);
    ok("perfectCount rückwirkend auf 1 gesetzt", s.bio.perfectCount === 1);
  }

  section("Live-Durchlauf: ein echter Biologie-Rundenabschluss meldet korrekt an die Erfolge");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); biologyProfile=p; startBiologyTopic("body","herz");');
    R('for(let i=0;i<20;i++){ handleBiologyAnswer(biologySession.items[biologySession.qIndex].c); biologyNext(); }');
    ok("p.achv.bio.topicsDone ist 1 nach einem abgeschlossenen Thema", R("p.achv.bio.topicsDone") === 1);
    ok("p.achv.bio.perfectCount ist 1 (fehlerfrei gelöst)", R("p.achv.bio.perfectCount") === 1);
  }

  section("Live-Durchlauf: Sexualkunde-Freischaltung wird im selben Moment korrekt gemeldet");
  {
    const C = loadClient(); const { R } = C;
    R(`
      var p=createProfile("T"); biologyProfile=p;
      p.biologyPerfect = {}; p.biologyDone = {};
      Object.keys(BIOLOGY_TOPICS.body).forEach(k => { p.biologyPerfect[k]=true; p.biologyDone[k]=true; });
      startBiologyTopic("sexualkunde","puberty");
    `);
    R('for(let i=0;i<20;i++){ handleBiologyAnswer(biologySession.items[biologySession.qIndex].c); biologyNext(); }');
    ok("sexualkundeUnlocked ist gesetzt", R("p.achv.bio.sexualkundeUnlocked") === 1);
    ok("Der Erfolg ist tatsächlich freigeschaltet", R("p.achv.unlocked.bio_sexualkunde_unlocked") !== undefined);
  }

  section("Erfolge-Seite zeigt die neue Kategorie und den aktualisierten Gesamtzähler");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); startAchievementsFlow();');
    const html = state.last;
    ok("Zeigt 'Biologie' als Kategorie", html.includes("Biologie"));
    ok(`Zeigt den neuen Gesamtzähler (${Achv.DEFS.length} statt der alten 51)`, html.includes(`von ${Achv.DEFS.length} freigeschaltet`));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
