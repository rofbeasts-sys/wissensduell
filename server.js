/**
 * BRAIN PULSE PARTY (ehem. WISSENSDUELL PARTY), Server
 * ---------------------------------------------------------------------------
 * Kleiner Node.js-Server (http + ws), den der Host im eigenen WLAN startet.
 * Andere Geräte im selben Netzwerk verbinden sich per Browser mit der
 * angezeigten Adresse (z.B. http://192.168.1.23:3000).
 *
 * Verantwortlich für:
 *  - Räume (Lobby, Beitreten per Code)
 *  - Rundenkonfiguration (Anzahl, Zufallsrunde / Spiel erstellen)
 *  - Teams (Alle gegen alle, 2v2, 3v3, 2v2v2)
 *  - Punktesysteme (Runde / Steigend / Punkteabzug)
 *  - Die vier Spiel-Engines: knowledgeQuiz, orderingGame, chronologyGame, higherLowerGame
 *
 * Alle Inhalte (Fragen, Einordnen-/Mehr-oder-Weniger-Datensätze) liegen
 * getrennt in ./shared/*.json und werden hier nur eingelesen, neue
 * Kategorien lassen sich dort ergänzen, ohne den Server-Code anzufassen.
 * ---------------------------------------------------------------------------
 */
const http = require("http");
const https = require("https");
const querystring = require("querystring");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { WebSocketServer } = require("./lib/miniws");
// Erfolge: gleiche Datei wie im Browser (public/achievements.js) - eine Definition, ein Regelwerk
const Achv = require("./public/achievements.js");
const DailyPz = require("./lib/dailyPuzzles.js");
const DailyWords = require("./lib/dailyWords.js");

/* ------------------------------------------------------------------------ */
/* Sicherheits-/Stabilitaets-Helfer                                          */
/* ------------------------------------------------------------------------ */
// Notbremse: ein unerwarteter Fehler in EINEM Handler darf nie den ganzen
// Server (und damit alle laufenden Spiele) beenden. Wird nur protokolliert.
process.on("uncaughtException", (err) => { console.error("[uncaughtException]", err && err.stack || err); });
process.on("unhandledRejection", (err) => { console.error("[unhandledRejection]", err && err.stack || err); });

// Nutzertext bereinigen: nur Strings, Steuerzeichen und < > entfernt (kein
// HTML moeglich), getrimmt, auf max Zeichen gekuerzt. Alles andere -> "".
function cleanStr(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max);
}
// ------------------------------------------------------------------------
// Ratenbegrenzung (Login-Sperre, Registrierungs-/API-Limit)
// ------------------------------------------------------------------------
// Hinter einem Proxy (Render) steht die echte Client-IP in X-Forwarded-For;
// den Header vertrauen wir nur dort - direkt am Internet waere er faelschbar.
// Angenommen wird: der Proxy HAENGT die Peer-Adresse hinten an -> letzter Eintrag.
const TRUST_PROXY = process.env.TRUST_PROXY === "1" || !!process.env.RENDER;
function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = req.headers && req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.trim()) {
      const parts = xff.split(",").map(x => x.trim()).filter(Boolean);
      if (parts.length) return parts[parts.length - 1].slice(0, 64);
    }
  }
  return (req.socket && req.socket.remoteAddress) || "unbekannt";
}
const AUTH_WINDOW_MS = Number(process.env.AUTH_WINDOW_MS) || 10 * 60 * 1000; // Zaehlfenster
const AUTH_LOCK_MS   = Number(process.env.AUTH_LOCK_MS)   || 10 * 60 * 1000; // Sperrdauer
const AUTH_MAX_FAILS_PAIR = 5;    // falsche Logins je Benutzername + IP
const AUTH_MAX_FAILS_IP   = 30;   // falsche Logins je IP (beliebige Namen)
const AUTH_MAX_FAILS_USER = 40;   // je Benutzername ueber ALLE IPs (verteilter Angriff)
const JOIN_MAX_FAILS_IP   = 40;   // falsche Raumcodes je IP und 5 Minuten (Schulklasse mit Tippfehlern ist ok)
const REGISTER_MAX_PER_IP = 10;   // neue Konten je IP und Stunde
const API_MAX_PER_MIN_IP  = 600;  // alle API-Aufrufe je IP und Minute (Schulklasse hinter EINER IP ist ok)
const rlStore = new Map();        // key -> { count, windowStart, lockedUntil }
function rlWait(key) { // Sekunden bis zur Entsperrung (0 = frei)
  const e = rlStore.get(key);
  if (!e || !e.lockedUntil) return 0;
  const left = e.lockedUntil - Date.now();
  return left > 0 ? Math.ceil(left / 1000) : 0;
}
function rlHit(key, max, windowMs, lockMs) { // zaehlt einen Treffer, sperrt ab "max"
  const now = Date.now();
  let e = rlStore.get(key);
  if (!e || now - e.windowStart > windowMs) { e = { count: 0, windowStart: now, lockedUntil: 0 }; rlStore.set(key, e); }
  e.count++;
  if (e.count >= max) e.lockedUntil = now + lockMs;
  return e;
}
function rlReset(key) { rlStore.delete(key); }
setInterval(() => { // aufraeumen, damit die Map nicht ewig waechst
  const now = Date.now();
  for (const [k, e] of rlStore) { if (now - e.windowStart > 3600000 && e.lockedUntil < now) rlStore.delete(k); }
  if (rlStore.size > 200000) rlStore.clear();
}, 5 * 60 * 1000).unref();
function waitText(sec, lang) {
  if (lang === "en") return sec >= 90 ? Math.ceil(sec / 60) + " minutes" : sec + " seconds";
  return sec >= 90 ? Math.ceil(sec / 60) + " Minuten" : sec + " Sekunden";
}

// Raumcode: nur String, nur Buchstaben/Ziffern, max 8 Zeichen.
function cleanCode(v) {
  return typeof v === "string" ? v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) : "";
}

const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------------------ */
/* Datenbasis laden (zentral, getrennt vom Spielcode)                        */
/* ------------------------------------------------------------------------ */
const QUIZ_QUESTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/quizQuestions.json"), "utf8"));

// Die Fragen-Datensaetze wurden beim Erstellen nicht zufaellig durchmischt -
// die richtige Antwort lag dadurch weit ueberproportional auf Feld 2 (beim
// allgemeinen Wissenstest-Pool ~65%) bzw. mit steigender Klasse zunehmend auf
// Feld 1 (Klasse 10: ~98%). Deshalb wird die Reihenfolge der Antworten bei
// JEDER Auswahl neu gemischt - die Original-JSON-Dateien bleiben unveraendert,
// nur die ausgelieferte Reihenfolge wird zufaellig.
function shuffleAnswerOrder(q) {
  const order = q.a.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, a: order.map(i => q.a[i]), c: order.indexOf(q.c) };
}
// Klassen-Fragenpool (1-10, je 50 Fragen) - dieselbe Quelle, aus der auch der
// Client sein KLASSE_QUESTIONS erzeugt (siehe public/index.html) - wird hier
// für die Quiz-Blöcke im Arena-Match nach Liga/Klassenbereich gefiltert.
const KLASSE_QUESTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/klasseQuestions.json"), "utf8"));
const DATASETS = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/partyDatasets.json"), "utf8"));
// Englische Fassung der Drag-and-Drop-/Higher-or-Lower-Kategorien (Label,
// Einheit, Gruppe, Elementnamen) - wird je nach Raumsprache darueber gelegt.
// Jede Sprache ausser Deutsch bekommt Englisch (wie L() im Client).
const DATASETS_EN = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/partyDatasetsEN.json"), "utf8"));
function dsFor(group, key, language) {
  const ds = DATASETS[group] && DATASETS[group][key];
  if (!ds || language === "de") return ds;
  const ov = DATASETS_EN[group] && DATASETS_EN[group][key];
  if (!ov) return ds;
  const names = ov.names || {};
  return Object.assign({}, ds, {
    label: ov.label || ds.label,
    unit: ov.unit || ds.unit,
    items: !ds.items ? ds.items : ds.items.map(it => names[it.id] ? Object.assign({}, it, { name: names[it.id] }) : it)
  });
}
function localizeDef(def, language) {
  if (def && language !== "de" && def.kind === "stadtLandFluss") {
    if (def.slfPartyMix) return Object.assign({}, def, { label: "Scattergories: Party mix (10 random categories)" });
    if (def.id === "slf_custom") return Object.assign({}, def, { label: "Scattergories: Custom categories (" + (def.categories || []).join(", ") + ")" });
    return def;
  }
  if (!def || language === "de" || !def.datasetKey) return def;
  const ov = DATASETS_EN[def.datasetGroup] && DATASETS_EN[def.datasetGroup][def.datasetKey];
  if (!ov) return def;
  const ovLabel = def.kind === "nennsBlitz" && ov.label ? "Quick-Fire: " + ov.label : ov.label;
  return Object.assign({}, def, { label: ovLabel || def.label, topicGroup: (DATASETS_EN._groups || {})[def.topicGroup] || def.topicGroup });
}

// Konfigurierbarer Punktabzug für Punktesystem 3 ("Punkteabzug").
// Hier zentral anpassbar, ohne die restliche Logik zu berühren.
const MISTAKE_PENALTY = 1;

// Feste Zeitlimits im Party-Modus (Party-Runden sind session-basiert,
// unabhängig vom persönlichen Solo-/Multiplayer-Rang).
const QUIZ_TIME_LIMIT = 20; // Sekunden pro Frage (normaler Wissenstest/Multiplayer)
const ARENA_TIME_LIMIT = 10; // Sekunden pro Frage/Zug in der Arena (bewusst kürzer als normal)

/* ------------------------------------------------------------------------ */
/* BOTS (ausschließlich im Party-Raum, sauber getrennt vom restlichen Spiel) */
/* ------------------------------------------------------------------------ */
// Zentrale Definition aller Bot-Schwierigkeitsstufen. Hier lassen sich später
// problemlos weitere Stufen, Werte oder ganze Bot-Persönlichkeiten ergänzen,
// ohne den Rest des Codes anzufassen.
const BOT_TIERS = {
  dumm:            { label: "Dumm",            prob: 0.40, quizMinPct: 0.55, quizMaxPct: 0.98, rankDelayMin: 2200, rankDelayMax: 4200 },
  einsteiger:      { label: "Einsteiger",       prob: 0.55, quizMinPct: 0.45, quizMaxPct: 0.9,  rankDelayMin: 1800, rankDelayMax: 3400 },
  schlau:          { label: "Schlau",           prob: 0.70, quizMinPct: 0.3,  quizMaxPct: 0.75, rankDelayMin: 1400, rankDelayMax: 2600 },
  doktor:          { label: "Doktor",           prob: 0.85, quizMinPct: 0.2,  quizMaxPct: 0.6,  rankDelayMin: 900,  rankDelayMax: 1900 },
  wissenschaftler: { label: "Wissenschaftler",  prob: 0.95, quizMinPct: 0.1,  quizMaxPct: 0.45, rankDelayMin: 600,  rankDelayMax: 1300 }
};
const BOT_TIER_ORDER = ["dumm", "einsteiger", "schlau", "doktor", "wissenschaftler"];
const BOT_TIER_LABELS_EN = { dumm: "Dumb", einsteiger: "Beginner", schlau: "Smart", doktor: "Doctor", wissenschaftler: "Scientist" };
function botTierLabel(key, language) {
  if (language !== "de" && BOT_TIER_LABELS_EN[key]) return BOT_TIER_LABELS_EN[key];
  return (BOT_TIERS[key] && BOT_TIERS[key].label) || key;
}
const BOT_NAME_POOL = ["Alex", "Max", "Lisa", "Tom", "Anna", "Chris", "Ben", "Leon", "Sophie", "Daniel"];
const DEFAULT_BOT_TIER = "schlau";
const MAX_PARTICIPANTS = 6;
// Aktuell im Client wählbar: nur "de"/"en". "fr"/"es" bleiben hier als
// bereits akzeptierte Werte im Hintergrund vorbereitet (Client bietet sie
// nur noch nicht als Auswahl an); ja/zh/it wurden auf Wunsch entfernt.
const SUPPORTED_LANGS = ["de", "en", "fr", "es"];

// Stadt-Land-Fluss-Konstanten (hier oben, da schon beim Aufbau des
// Rundenpools benötigt, siehe buildRoundDefPool()/slfBuildRoundDef()).
const SLF_DEFAULT_CATEGORIES = ["Stadt", "Land", "Fluss", "Name", "Tier", "Beruf", "Pflanze", "Farbe", "Automarke", "Promi"];
const SLF_LETTERS = "ABCDEFGHIJKLMNOPRSTUVWZ".split(""); // Q, X, Y ausgelassen (zu schwer für flüssiges Spiel)
const SLF_ANSWER_MS = 80000;      // Zeit zum Schreiben
const SLF_HURRY_MS = Number(process.env.SLF_HURRY_MS) || 15000; // Env nur fuer Tests       // Verkürzte Restzeit, sobald jemand ALLE Felder ausgefüllt abgegeben hat
// Kein Zeitlimit mehr fürs Anfechten (auf Wunsch entfernt) - Anfechtungsphase
// läuft jetzt, bis der Host manuell per "continue" weitergeht.
const SLF_PARTY_ROUND_SIZE = 10;  // Anzahl Kategorien pro Party-Mix-Runde

// Großer Kategorien-Pool für den Party-Mix-Modus von Stadt Land Fluss:
// bunt gemischt, enthält auch einige der klassischen Original-Kategorien
// (siehe SLF_DEFAULT_CATEGORIES) sowie die bisherigen Vorschläge, damit
// gelegentlich auch mal ein "normales" Feld dabei ist.
const SLF_PARTY_CATEGORIES = [
  "Stadt", "Land", "Fluss", "Name", "Tier", "Beruf", "Pflanze",
  "Farbe", "Automarke", "Filmtitel", "Promi", "Getränk", "Sportart",
  "Musiktitel", "Superkraft", "Zaubertrick", "Serientitel", "Videospiel",
  "Comicfigur", "Superheld", "Zeichentrickfigur", "Fastfood-Gericht",
  "Süßigkeit", "Musikinstrument", "Handymarke", "Kleidungsstück", "Frisur",
  "Influencer", "App", "Brettspiel", "Kartenspiel", "Cocktail", "Insel",
  "Reiseziel", "Hauptstadt", "Sprache", "Feiertag", "Käsesorte",
  "Gemüsesorte", "Obstsorte", "Fabelwesen", "Dinosaurierart", "Zeitschrift",
  "Fernsehsender", "Kochshow", "Partymotto", "Karnevalskostüm",
  "Weihnachtsgeschenk", "Ausrede", "Fußballverein"
];

function randRange(min, max) { return min + Math.random() * (max - min); }

// Zieht `count` zufällige, unterschiedliche Kategorien aus SLF_PARTY_CATEGORIES.
function pickRandomSlfPartyCategories(count, language) {
  const pool = [...(language === "de" || !language ? SLF_PARTY_CATEGORIES : SLF_PARTY_CATEGORIES_EN)];
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function pickBotName(room) {
  const used = new Set(Array.from(room.players.values()).filter(p => p.isBot).map(p => p.name));
  const free = BOT_NAME_POOL.filter(n => !used.has(n));
  if (free.length > 0) return free[Math.floor(Math.random() * free.length)];
  // Falls alle Namen vergeben sind (mehr als 10 Bots wären ohnehin nie möglich, da max. 6 Teilnehmer)
  return "Bot" + Math.floor(Math.random() * 1000);
}

// Bot-Wortschatz für Stadt Land Fluss: NUR für die 7 klassischen
// Original-Kategorien (fest, überschaubar), für den 50-Kategorien-
// Party-Mix-Pool wäre ein vollständiges, verlässliches Wörterbuch über alle
// Buchstaben kein seriös leistbarer Umfang. Bots lassen ein Feld einfach
// leer, wenn sie für Buchstabe+Kategorie kein Wort kennen.
const SLF_BOT_WORDS = {
  Stadt: { A:"Aachen", B:"Berlin", C:"Chemnitz", D:"Dresden", E:"Essen", F:"Frankfurt", G:"Göttingen", H:"Hamburg", I:"Ingolstadt", J:"Jena", K:"Köln", L:"Leipzig", M:"München", N:"Nürnberg", O:"Offenbach", P:"Potsdam", R:"Rostock", S:"Stuttgart", T:"Trier", U:"Ulm", V:"Villingen", W:"Wien", Z:"Zürich" },
  Land: { A:"Argentinien", B:"Brasilien", C:"Chile", D:"Dänemark", E:"Ecuador", F:"Frankreich", G:"Griechenland", H:"Holland", I:"Italien", J:"Jamaika", K:"Kanada", L:"Litauen", M:"Mexiko", N:"Norwegen", O:"Österreich", P:"Polen", R:"Russland", S:"Spanien", T:"Türkei", U:"Ungarn", V:"Vietnam", W:"Wales", Z:"Zypern" },
  Fluss: { A:"Amazonas", D:"Donau", E:"Elbe", G:"Ganges", I:"Inn", J:"Jordan", L:"Lech", M:"Mississippi", N:"Nil", O:"Oder", R:"Rhein", S:"Saale", T:"Themse", V:"Volga", W:"Weser" },
  Name: { A:"Anna", B:"Ben", C:"Clara", D:"David", E:"Emma", F:"Felix", G:"Greta", H:"Hannah", I:"Ida", J:"Julia", K:"Karl", L:"Lukas", M:"Maria", N:"Nina", O:"Oskar", P:"Paul", R:"Rosa", S:"Sarah", T:"Tim", U:"Uwe", V:"Vera", W:"Willi", Z:"Zoe" },
  Tier: { A:"Adler", B:"Bär", D:"Delfin", E:"Elefant", F:"Fuchs", G:"Giraffe", H:"Hase", I:"Iltis", J:"Jaguar", K:"Katze", L:"Löwe", M:"Maus", N:"Nashorn", O:"Otter", P:"Panda", R:"Reh", S:"Schwein", T:"Tiger", U:"Uhu", W:"Wolf", Z:"Ziege" },
  Beruf: { A:"Arzt", B:"Bäcker", D:"Dolmetscher", E:"Elektriker", F:"Friseur", G:"Gärtner", H:"Hebamme", I:"Ingenieur", J:"Journalist", K:"Koch", L:"Lehrer", M:"Maler", N:"Notar", O:"Optiker", P:"Pilot", R:"Richter", S:"Sänger", T:"Tischler", V:"Verkäufer", W:"Winzer", Z:"Zahnarzt" },
  Pflanze: { B:"Buche", C:"Calla", D:"Distel", E:"Eiche", F:"Farn", G:"Gänseblümchen", H:"Hortensie", J:"Jasmin", K:"Kaktus", L:"Lavendel", M:"Minze", N:"Narzisse", O:"Olive", P:"Palme", R:"Rose", S:"Sonnenblume", T:"Tulpe", V:"Veilchen", W:"Weide", Z:"Zypresse" }
};

// Englische Fassung (Scattergories): Standard-Kategorien, Party-Mix-Pool und
// Bot-Woerter fuer die 7 klassischen Felder. Jede Sprache ausser Deutsch
// bekommt Englisch (wie bei den uebrigen Datensaetzen).
const SLF_DEFAULT_CATEGORIES_EN = ["City", "Country", "River", "Name", "Animal", "Job", "Plant", "Color", "Car brand", "Celebrity"];
const SLF_PARTY_CATEGORIES_EN = [
  "City", "Country", "River", "Name", "Animal", "Job", "Plant",
  "Color", "Car brand", "Movie title", "Celebrity", "Drink", "Sport",
  "Song title", "Superpower", "Magic trick", "TV series", "Video game",
  "Comic character", "Superhero", "Cartoon character", "Fast-food dish",
  "Candy", "Musical instrument", "Phone brand", "Clothing item", "Hairstyle",
  "Influencer", "App", "Board game", "Card game", "Cocktail", "Island",
  "Travel destination", "Capital city", "Language", "Holiday", "Type of cheese",
  "Vegetable", "Fruit", "Mythical creature", "Dinosaur", "Magazine",
  "TV channel", "Cooking show", "Party theme", "Costume",
  "Christmas gift", "Excuse", "Football club"
];
const SLF_BOT_WORDS_EN = {
  City: { A:"Amsterdam", B:"Berlin", C:"Chicago", D:"Dallas", E:"Edinburgh", F:"Florence", G:"Geneva", H:"Houston", I:"Istanbul", J:"Jakarta", K:"Kyoto", L:"London", M:"Madrid", N:"Nairobi", O:"Oslo", P:"Paris", R:"Rome", S:"Sydney", T:"Tokyo", U:"Utrecht", V:"Vienna", W:"Warsaw", Z:"Zurich" },
  Country: { A:"Argentina", B:"Brazil", C:"Canada", D:"Denmark", E:"Egypt", F:"France", G:"Germany", H:"Hungary", I:"Italy", J:"Japan", K:"Kenya", L:"Lebanon", M:"Mexico", N:"Norway", O:"Oman", P:"Peru", R:"Russia", S:"Spain", T:"Turkey", U:"Uruguay", V:"Vietnam", W:"Wales", Z:"Zambia" },
  River: { A:"Amazon", D:"Danube", E:"Elbe", G:"Ganges", H:"Hudson", I:"Indus", J:"Jordan", L:"Loire", M:"Mississippi", N:"Nile", O:"Ohio", P:"Po", R:"Rhine", S:"Seine", T:"Thames", V:"Volga", Z:"Zambezi" },
  Name: { A:"Anna", B:"Ben", C:"Clara", D:"David", E:"Emma", F:"Frank", G:"Grace", H:"Hannah", I:"Isaac", J:"Julia", K:"Kate", L:"Lucas", M:"Mia", N:"Nina", O:"Oliver", P:"Paul", R:"Rose", S:"Sarah", T:"Tom", U:"Uma", V:"Victor", W:"Will", Z:"Zoe" },
  Animal: { A:"Antelope", B:"Bear", C:"Camel", D:"Dolphin", E:"Elephant", F:"Fox", G:"Giraffe", H:"Horse", I:"Iguana", J:"Jaguar", K:"Koala", L:"Lion", M:"Monkey", N:"Newt", O:"Otter", P:"Panda", R:"Rabbit", S:"Snake", T:"Tiger", V:"Vulture", W:"Wolf", Z:"Zebra" },
  Job: { A:"Architect", B:"Baker", C:"Chef", D:"Doctor", E:"Electrician", F:"Farmer", G:"Gardener", H:"Hairdresser", I:"Interpreter", J:"Judge", L:"Lawyer", M:"Mechanic", N:"Nurse", O:"Optician", P:"Pilot", R:"Reporter", S:"Surgeon", T:"Teacher", V:"Vet", W:"Waiter", Z:"Zookeeper" },
  Plant: { A:"Aloe", B:"Bamboo", C:"Cactus", D:"Daisy", E:"Elm", F:"Fern", G:"Geranium", H:"Hibiscus", I:"Ivy", J:"Jasmine", L:"Lavender", M:"Mint", N:"Nettle", O:"Oak", P:"Palm", R:"Rose", S:"Sunflower", T:"Tulip", V:"Violet", W:"Willow", Z:"Zinnia" }
};

/* ------------------------------------------------------------------------ */
/* Verfügbare Rundentypen (modular, leicht erweiterbar, Punkt 15)           */
/* Stadt Land Fluss ist EIGENSTÄNDIGER Modus (eigener Menüpunkt, eigenes    */
/* Solo & Multiplayer) und steht daher NICHT mehr im normalen Mix-Pool.     */
/* ------------------------------------------------------------------------ */
const TABOO_CARDS = (() => {   // sucht die Kartenliste an mehreren Stellen, stuerzt nie ab, wenn sie fehlt
  for (const p of ["shared/tabooDE.json", "tabooDE.json", "public/tabooDE.json", "shared/taboode.json"]) {
    try { const j = JSON.parse(fs.readFileSync(path.join(__dirname, p), "utf8")); if (Array.isArray(j) && j.length) { console.log("Taboo: " + j.length + " Karten aus " + p); return j; } } catch (e) {}
  }
  console.error("Taboo: tabooDE.json nicht gefunden - Taboo ist deaktiviert (Datei nach shared/tabooDE.json hochladen).");
  return [];
})();
function buildRoundDefPool() {
  const pool = [{ id: "quiz", kind: "knowledgeQuiz", label: "Wissenstest", germanOnly: true }];
  pool.push({ id: "tictactoe", kind: "ticTacToeGame", label: "Tic Tac Toe", germanOnly: false });
  pool.push({ id: "tictactoe_quantum", kind: "ticTacToeGame", variant: "quantum", label: "Tic Tac Toe Quantum", germanOnly: false });
  pool.push({ id: "tictactoe_quizmix", kind: "ticTacToeGame", variant: "quizmix", label: "Tic Tac Toe Quiz-Mix", germanOnly: true });
  pool.push({ id: "fourups", kind: "fourupsGame", label: "4 gewinnt", germanOnly: false });
  if (TABOO_CARDS.length) {
    pool.push({ id: "taboo", kind: "tabooGame", label: "Taboo", germanOnly: true });
    pool.push({ id: "taboo_ffa", kind: "tabooGame", variant: "ffa", label: "Taboo Wettbewerb", germanOnly: true });
  }
  Object.entries(DATASETS.ordering).forEach(([key, ds]) => {
    pool.push({ id: "order_" + key, kind: "orderingGame", label: ds.label, datasetGroup: "ordering", datasetKey: key, germanOnly: !!ds.germanOnly, topicGroup: ds.group || null });
  });
  // Chronologie und Bild erraten sind auf Wunsch vorübergehend komplett
  // draußen (kommen als späteres Patch-Update zurück) - Datensätze und
  // Spiel-Engine bleiben unangetastet im Code, hier wird nur bewusst
  // NICHTS aus DATASETS.chronology/guessPicture in den Pool aufgenommen.
  // Zum Reaktivieren: die beiden folgenden forEach-Blöcke (auskommentiert)
  // einfach wieder einkommentieren.
  // Object.entries(DATASETS.chronology || {}).forEach(([key, ds]) => {
  //   pool.push({ id: "chrono_" + key, kind: "chronologyGame", label: ds.label, datasetGroup: "chronology", datasetKey: key, germanOnly: !!ds.germanOnly });
  // });
  Object.entries(DATASETS.higherLower).forEach(([key, ds]) => {
    pool.push({ id: "hilo_" + key, kind: "higherLowerGame", label: ds.label, datasetGroup: "higherLower", datasetKey: key, germanOnly: !!ds.germanOnly, topicGroup: ds.group || null });
  });
  // Object.entries(DATASETS.guessPicture || {}).forEach(([key, ds]) => {
  //   pool.push({ id: "guess_" + key, kind: "guessPicture", label: ds.label, datasetGroup: "guessPicture", datasetKey: key, germanOnly: !!ds.germanOnly });
  // });
  // Musik raten ist auf Wunsch komplett aus dem Spiel entfernt (inkl.
  // Erfolge/Statistik, siehe achievements.js und MODE_STAT_DEFS im Client) -
  // Datensaetze/Engine bleiben unangetastet im Code, hier wird bewusst
  // NICHTS aus DATASETS.guessMusic in den Pool aufgenommen.
  // Object.entries(DATASETS.guessMusic || {}).forEach(([key, ds]) => {
  //   pool.push({ id: "music_" + key, kind: "guessMusic", label: ds.label, datasetGroup: "guessMusic", datasetKey: key, germanOnly: !!ds.germanOnly });
  // });
  Object.entries(DATASETS.nennsBlitz || {}).forEach(([key, ds]) => {
    // Reine Freitext-Kategorie ohne Lösungsliste (siehe Abschnitt "RUNDE:
    // nennsBlitz" weiter unten). Anders als frueher NICHT mehr pauschal
    // germanOnly: die meisten Kategorien (Bands, Marvel/Disney/DC-Charaktere,
    // Tierarten, Laender, Planeten, ...) lassen sich unabhaengig von der
    // Sprache nennen - nur die wirklich Deutschland-spezifischen (siehe
    // germanOnly-Markierung direkt am jeweiligen Datensatz in
    // shared/partyDatasets.json) bleiben aussen vor.
    pool.push({ id: "blitz_" + key, kind: "nennsBlitz", label: "Quick-Fire: " + ds.label, datasetGroup: "nennsBlitz", datasetKey: key, germanOnly: !!ds.germanOnly, topicGroup: ds.group || null });
  });
  return pool;
}
const ROUND_DEF_POOL = buildRoundDefPool();
// Eigener, kleiner Pool nur für den Stadt-Land-Fluss-Modus: Original (feste
// 7 Kategorien) und Party-Mix (bei jedem Rundenstart frisch gezogene 10
// Kategorien aus SLF_PARTY_CATEGORIES). "Eigene Kategorien" ist kein
// Pool-Eintrag, sondern wird interaktiv über setSlfCustomRoundDef gebaut.
// SLF ist ein Sonderfall: sein Pool ist NICHT im normalen Mix enthalten
// (siehe Anforderung), anders als alle anderen dedizierten Modi unten.
const SLF_ROUND_DEF_POOL = [slfBuildRoundDef(null, null), slfBuildRoundDef(null, "party")];
// Generische dedizierte Modi: jeweils "wie Stadt Land Fluss/Musik raten/
// Nenn's Blitz" ein eigener Hauptmenüpunkt (Solo/Multiplayer), dessen Pool
// einfach die Teilmenge des normalen Mix-Pools mit diesem "kind" ist –
// bleiben (anders als SLF) bewusst AUCH im normalen Mix verfügbar. Neue
// dedizierte Modi lassen sich hier einfach durch eine weitere Zeile
// ergänzen, ohne woanders im Server etwas anfassen zu müssen.
const DEDICATED_MODE_KINDS = {
  // music: "guessMusic", // auf Wunsch komplett entfernt (inkl. Erfolge/Statistik) - siehe buildRoundDefPool()
  blitz: "nennsBlitz",
  ordering: "orderingGame",
  // chronology: "chronologyGame", // vorübergehend draußen (Patch-Update später), siehe buildRoundDefPool()
  higherlower: "higherLowerGame"
  // picture: "guessPicture" // vorübergehend draußen (Patch-Update später), siehe buildRoundDefPool()
};
const DEDICATED_POOLS = {};
Object.entries(DEDICATED_MODE_KINDS).forEach(([mode, kind]) => {
  DEDICATED_POOLS[mode] = ROUND_DEF_POOL.filter(r => r.kind === kind);
});
// Eigener Pool nur für die Arena-Herausforderungsrunden. Bewusst nur
// Rundentypen, die rein anhand objektiver Werte automatisch bewertet
// werden - Stadt Land Fluss und Nenn's Blitz sind hier NICHT dabei, siehe
// ausführlicher Kommentar bei ARENA_CHALLENGE_MODES weiter unten (Bugfix -
// beide ließen sich in der Solo-Arena durch beliebige Eingaben ausnutzen,
// da die normale "Anfechten"-Prüfung echte Mitspieler braucht).
const ARENA_CHALLENGE_POOL = ROUND_DEF_POOL.filter(r => ["orderingGame", "chronologyGame", "higherLowerGame"].includes(r.kind));
DEDICATED_POOLS.arena = ARENA_CHALLENGE_POOL;
function findRoundDef(id) {
  // Alle DEDICATED_POOLS-Einträge sind Teilmengen von ROUND_DEF_POOL (siehe
  // oben), nur SLF_ROUND_DEF_POOL enthält davon unabhängige, eigene IDs.
  return ROUND_DEF_POOL.find(r => r.id === id) || SLF_ROUND_DEF_POOL.find(r => r.id === id);
}
function roundDefPoolForLanguage(language, gameMode) {
  let base = gameMode === "slf" ? SLF_ROUND_DEF_POOL : (DEDICATED_POOLS[gameMode] || ROUND_DEF_POOL);
  const okGate = r => r.id === "taboo" ? (!featureLocked("taboo") && !featureLocked("taboo_team")) : r.id === "taboo_ffa" ? (!featureLocked("taboo") && !featureLocked("taboo_ffa")) : true;
  base = base.filter(okGate);
  return language === "de" ? base : base.filter(r => !r.germanOnly).map(r => localizeDef(r, language));
}

/* ------------------------------------------------------------------------ */
/* Räume                                                                     */
/* ------------------------------------------------------------------------ */
const rooms = new Map(); // code -> room

// Raumcode: 6 Zeichen (32^6 = ~1 Mrd. Moeglichkeiten) aus kryptografisch
// sicherem Zufall - vorher 4 Zeichen mit Math.random (1 Mio., erratbar).
const ROOM_CODE_LEN = 6;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomRoomCode() {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LEN; i++) code += ROOM_CODE_CHARS[crypto.randomInt(ROOM_CODE_CHARS.length)];
  return code;
}
function makeRoomCode() {
  let code;
  do { code = randomRoomCode(); } while (rooms.has(code));
  return code;
}

function createRoom(hostWs, hostName, language, gameMode) {
  const code = makeRoomCode();
  const hostId = "pl_" + Math.random().toString(36).slice(2, 9);
  const room = {
    code,
    hostId,
    players: new Map(), // id -> {id,name,ws,teamId,connected}
    teamMode: "ffa",
    teams: new Map(), // teamId -> {id,name,memberIds:[],score:0}
    pointSystem: 1,
    roundCount: 5,
    roundMode: "random", // 'random' | 'custom'
    roundDefs: [],
    language: SUPPORTED_LANGS.includes(language) ? language : "de",
    // 'mixed' (Standard, alle Rundentypen außer Stadt Land Fluss) oder 'slf'
    // (eigenständiger Stadt-Land-Fluss-Modus, nicht im Mix enthalten) oder
    // einer der generischen dedizierten Modi aus DEDICATED_MODE_KINDS
    // (bleiben zusätzlich auch im normalen Mix verfügbar).
    gameMode: gameMode === "slf" ? "slf" : (gameMode === "arena" ? "arena" : (DEDICATED_MODE_KINDS[gameMode] ? gameMode : "mixed")),
    currentRoundIndex: -1,
    phase: "lobby", // lobby | roundIntro | playing | roundResult | gameEnd
    runtime: null
  };
  rooms.set(code, room);
  addPlayer(room, hostWs, hostId, hostName);
  randomizeRoundDefs(room); // gleich passend zur Sprache vorbefüllen
  return room;
}

function addPlayer(room, ws, id, name) {
  room.players.set(id, { id, name: cleanStr(name, 20) || "Spieler", ws, teamId: null, connected: true, isBot: false, botTier: null });
  ws.playerId = id;
  ws.roomCode = room.code;
}

function addBot(room, tier) {
  const id = "bot_" + Math.random().toString(36).slice(2, 9);
  const name = pickBotName(room);
  const bot = { id, name, ws: null, teamId: null, connected: true, isBot: true, botTier: BOT_TIERS[tier] ? tier : DEFAULT_BOT_TIER };
  room.players.set(id, bot);
  assignNewParticipantToSmallestTeam(room, bot);
  return bot;
}

function removeBot(room, botId) {
  const bot = room.players.get(botId);
  if (!bot || !bot.isBot) return;
  room.players.delete(botId);
  room.teams.forEach(t => { t.memberIds = t.memberIds.filter(id => id !== botId); });
  if (room.teamMode === "ffa") rebuildFfaTeams(room);
}

// Host wirft einen menschlichen Mitspieler aus dem Wartezimmer. Der Host
// selbst und Bots (dafür gibt es removeBot) können nicht gekickt werden.
function kickPlayer(room, playerId) {
  const player = room.players.get(playerId);
  if (!player || player.isBot || playerId === room.hostId) return false;
  room.players.delete(playerId);
  room.teams.forEach(t => { t.memberIds = t.memberIds.filter(id => id !== playerId); });
  if (room.teamMode === "ffa") rebuildFfaTeams(room);
  if (player.ws) {
    send(player.ws, { type: "kicked" });
    try { player.ws.close(); } catch (e) { /* Verbindung ggf. schon zu */ }
  }
  return true;
}

function assignNewParticipantToSmallestTeam(room, participant) {
  if (room.teamMode === "ffa") { rebuildFfaTeams(room); return; }
  const teams = Array.from(room.teams.values());
  if (teams.length === 0) return;
  teams.sort((a, b) => a.memberIds.length - b.memberIds.length);
  const target = teams[0];
  target.memberIds.push(participant.id);
  participant.teamId = target.id;
}


function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) {
    try { ws.send(JSON.stringify(msg)); } catch (e) { /* ignore */ }
  }
}
function broadcast(room, msg) {
  room.players.forEach(p => send(p.ws, msg));
}

/* ------------------------------------------------------------------------ */
/* Tic Tac Toe - Mehrspieler (eigenes, bewusst schlankes Raumsystem, völlig  */
/* getrennt vom komplexen Quiz-Party-System oben - braucht nur 2 Spieler,   */
/* ein Baord, wer gerade dran ist. Gegen Bots läuft rein clientseitig,      */
/* dieser Teil ist NUR für "mit Freunden spielen".                          */
/* ------------------------------------------------------------------------ */
const tttRooms = new Map(); // code -> room

function tttMakeRoomCode() {
  let code;
  do { code = randomRoomCode(); } while (tttRooms.has(code));
  return code;
}

const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function tttCheckWinner(board) {
  for (const [a,b,c] of TTT_LINES) {
    if (board[a] && board[a]===board[b] && board[a]===board[c]) return board[a];
  }
  if (board.every(c => c)) return "draw";
  return null;
}

// Quantum-Modus: höchstens 3 Symbole je Seite auf dem Feld - beim vierten
// Zug verschwindet automatisch das jeweils älteste eigene Symbol (gleiche
// Regel wie im Bot-Quantum-Modus, hier serverseitig für den Online-Modus).
function tttQuantumApplyMove(room, symbol, index) {
  const pieces = symbol === "X" ? room.xPieces : room.oPieces;
  if (pieces.length >= 3) {
    const removed = pieces.shift();
    room.board[removed] = null;
  }
  pieces.push(index);
  room.board[index] = symbol;
}

// Zaehler fuer die Erfolge (werden bei jedem neuen Spiel/Rematch zurueckgesetzt)
function tttFreshCounters() { return { moves: { X: 0, O: 0 }, wrong: { X: 0, O: 0 }, duels: 0 }; }
function tttAchvInfo(room, symbol) {
  if (!room.gameOver || room.winner !== symbol) return null;
  const c = room.counters || tttFreshCounters();
  if (room.mode === "quizmix") return { in3: c.duels === 3, allCorrect: c.wrong[symbol] === 0 };
  return { in3: c.moves[symbol] === 3, allCorrect: true };
}
function tttBroadcastState(room) {
  if (room.gameOver && !room.zpDone && room.players.length === 2) {
    room.zpDone = true;
    const [p0, p1] = room.players, mv = room.counters ? (room.counters.moves.X + room.counters.moves.O) : 0;
    const res = zpDuel("ttt", { username: p0.ws && p0.ws.accountUsername }, { username: p1.ws && p1.ws.accountUsername }, room.winner === "draw" ? "draw" : (room.winner === p0.symbol ? "a" : "b"), mv, 5);
    if (res) room.zpRes = { [p0.symbol]: res.a, [p1.symbol]: res.b };
  }
  const playersPublic = room.players.map(p => ({ name: p.name, symbol: p.symbol, connected: p.connected }));
  room.players.forEach(p => {
    send(p.ws, {
      achv: tttAchvInfo(room, p.symbol),
      type: "tttState",
      board: room.board,
      turnSymbol: room.turnSymbol,
      gameOver: room.gameOver,
      winner: room.winner || null,
      zp: (room.zpRes && room.zpRes[p.symbol]) || null,
      yourSymbol: p.symbol, // personalisiert - wichtig nach einem Rematch, bei dem Symbole tauschen
      mode: room.mode,
      players: playersPublic
    });
  });
}


// Brainups fuer ein Duell zwischen zwei ECHTEN Konten: Mitspielen 50, Sieg 100 (Remis: beide 50).
// Schutz: zwei verschiedene Konten, Mindestzuege, je Paar und Tag nur wenige Partien mit Punkten.
const zpPairDay = new Map(), ZP_PAIR_PER_DAY = 4;
function zpDuel(game, a, b, result /* "a" | "b" | "draw" */, moves, minMoves) {
  try {
    if (!a || !b || !a.username || !b.username) return null;
    if (a.username.toLowerCase() === b.username.toLowerCase()) return null;
    if ((moves || 0) < (minMoves || 5)) return null;
    const ua = findUserByName(a.username), ub = findUserByName(b.username); if (!ua || !ub) return null;
    const pk = [a.username.toLowerCase(), b.username.toLowerCase()].sort().join("|") + "|" + todayDateString();
    if ((zpPairDay.get(pk) || 0) >= ZP_PAIR_PER_DAY) return null;
    zpPairDay.set(pk, (zpPairDay.get(pk) || 0) + 1); if (zpPairDay.size > 5000) zpPairDay.clear();
    const key = game === "dame" ? "chess" : game;
    return { a: zpAdd(ua, result === "a" ? 100 : 50, game, key), b: zpAdd(ub, result === "b" ? 100 : 50, game, key) };
  } catch (e) { console.error("zpDuel", e); return null; }
}

/* ---- QuizMix: Variante mit Wissensduell-Feldern statt direktem Setzen -- */
/* Auf ein leeres Feld tippen startet ein 5-Fragen-Duell zwischen beiden    */
/* Spielenden (gleichzeitig, jede Frage mit Timer). Wer mehr richtige       */
/* Antworten hat, bekommt das Feld mit seinem Symbol. Bei Gleichstand       */
/* bleibt das Feld leer und ist erneut antippbar.                          */
const TTT_DUEL_QUESTIONS_PER_CELL = 5;
const TTT_DUEL_QUESTION_MS = 12000;

function tttStartDuel(room, cellIndex) {
  // Auf Wunsch: der Duell-Typ wird pro Feld zufaellig zwischen Wissenstest
  // (5 feste Fragen) und Speed Math (1-Minuten-Sprint) gemischt.
  // TTT_DUEL_TYPE (nur fuer Tests) erzwingt eine Duell-Art; normal: 50/50
  const duelType = (process.env.TTT_DUEL_TYPE === "math" || process.env.TTT_DUEL_TYPE === "quiz") ? process.env.TTT_DUEL_TYPE : (Math.random() < 0.5 ? "quiz" : "math");
  if (duelType === "math") {
    tttStartMathSprintDuel(room, cellIndex);
    return;
  }
  const questions = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, TTT_DUEL_QUESTIONS_PER_CELL).map(shuffleAnswerOrder);
  room.duel = {
    cellIndex,
    type: "quiz",
    questions,
    qIndex: 0,
    scores: Object.fromEntries(room.players.map(p => [p.symbol, 0])),
    answered: {}, // symbol -> selectedIndex fuer die aktuelle Frage
    timer: null
  };
  tttSendDuelQuestion(room);
}

// Speed-Math-Duell: auf Wunsch KEIN festes 5er-Set mehr, sondern ein
// echter 1-Minuten-Sprint - jede Seite bekommt ihren EIGENEN, unabhängigen
// Strom an Aufgaben (nicht dieselbe Aufgabe gleichzeitig), löst so viele
// wie möglich, wer nach 60s mehr richtig hat, bekommt das Feld. Beide
// sehen den jeweils aktuellen Punktestand der anderen Seite live mit.
const TTT_MATH_SPRINT_MS = Number(process.env.TTT_SPRINT_MS) || 60000; // Env nur fuer Tests
function tttStartMathSprintDuel(room, cellIndex) {
  room.duel = {
    cellIndex,
    type: "math",
    scores: Object.fromEntries(room.players.map(p => [p.symbol, 0])),
    problems: Object.fromEntries(room.players.map(p => [p.symbol, tttGenerateMathProblem()])),
    timer: null
  };
  room.players.forEach(p => send(p.ws, {
    type: "tttSprintStart",
    cellIndex,
    durationMs: TTT_MATH_SPRINT_MS,
    problem: tttPublicProblem(room.duel.problems[p.symbol])
  }));
  room.duel.timer = setTimeout(() => tttFinishMathSprint(room), TTT_MATH_SPRINT_MS + 300);
}

function tttHandleSprintAnswer(room, symbol, value) {
  const duel = room.duel;
  if (!duel || duel.type !== "math") return;
  const problem = duel.problems[symbol];
  if (!problem) return;
  if (value === problem.answer) duel.scores[symbol] = (duel.scores[symbol] || 0) + 1;
  else room.counters.wrong[symbol]++;
  duel.problems[symbol] = tttGenerateMathProblem();
  const player = room.players.find(p => p.symbol === symbol);
  if (player) send(player.ws, { type: "tttSprintNextProblem", problem: tttPublicProblem(duel.problems[symbol]) });
  broadcast(room, { type: "tttSprintScoreUpdate", scores: duel.scores });
}

function tttFinishMathSprint(room) {
  const duel = room.duel;
  if (!duel || duel.type !== "math") return;
  clearTimeout(duel.timer);
  const symbols = Object.keys(duel.scores);
  const [symA, symB] = symbols;
  let winnerSymbol = null;
  if (duel.scores[symA] > duel.scores[symB]) winnerSymbol = symA;
  else if (duel.scores[symB] > duel.scores[symA]) winnerSymbol = symB;
  room.counters.duels++;
  if (winnerSymbol) {
    room.board[duel.cellIndex] = winnerSymbol;
    const w = tttCheckWinner(room.board);
    if (w) { room.gameOver = true; room.winner = w; }
  }
  if (!room.gameOver) {
    room.turnSymbol = room.turnSymbol === "X" ? "O" : "X";
  }
  broadcast(room, { type: "tttSprintFinished", cellIndex: duel.cellIndex, winnerSymbol, tie: !winnerSymbol, finalScores: duel.scores });
  room.duel = null;
  tttBroadcastState(room);
}

// Server-Pendant zu speedMathGenerateProblem() im Client - dieselbe Logik
// (Division geht immer sauber auf, Subtraktion nie negativ, Zahlen 1-10).
// Antwort-Kreise (1 richtige + 3 plausible falsche) - Gegenstueck zum Client.
function tttAddMathChoices(p) {
  const cands = [p.answer + 1, p.answer - 1, p.answer + 2, p.answer - 2, p.answer + 10, p.answer - 10, p.answer + 3, p.answer - 3];
  if (p.op === "×") cands.push(p.answer + p.a, p.answer - p.a, p.answer + p.b, p.answer - p.b);
  const wrong = [];
  const pool = cands.filter(v => v >= 0 && v !== p.answer).sort(() => Math.random() - 0.5);
  for (const v of pool) { if (!wrong.includes(v)) wrong.push(v); if (wrong.length === 3) break; }
  let extra = p.answer + 4;
  while (wrong.length < 3) { if (!wrong.includes(extra) && extra !== p.answer) wrong.push(extra); extra++; }
  p.choices = [p.answer, ...wrong].sort(() => Math.random() - 0.5);
  return p;
}
// Schickt die Aufgabe OHNE die Loesung an den Client (vorher ging "answer" mit).
function tttPublicProblem(p) { return { a: p.a, b: p.b, op: p.op, choices: p.choices }; }

function tttGenerateMathProblem() {
  const ops = ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;
  if (op === "+") {
    a = 1 + Math.floor(Math.random() * 10); b = 1 + Math.floor(Math.random() * 10);
    answer = a + b;
  } else if (op === "-") {
    a = 1 + Math.floor(Math.random() * 10); b = 1 + Math.floor(Math.random() * 10);
    if (b > a) { const t = a; a = b; b = t; }
    answer = a - b;
  } else if (op === "×") {
    a = 1 + Math.floor(Math.random() * 10); b = 1 + Math.floor(Math.random() * 10);
    answer = a * b;
  } else {
    b = 1 + Math.floor(Math.random() * 10);
    answer = 1 + Math.floor(Math.random() * 10);
    a = b * answer;
  }
  return tttAddMathChoices({ a, b, op, answer });
}

function tttSendDuelQuestion(room) {
  const duel = room.duel;
  if (!duel) return;
  duel.answered = {};
  const q = duel.questions[duel.qIndex];
  room.players.forEach(p => send(p.ws, {
    type: "tttDuelQuestion",
    cellIndex: duel.cellIndex,
    qIndex: duel.qIndex,
    qTotal: duel.questions.length,
    question: q.q,
    options: q.a,
    durationMs: TTT_DUEL_QUESTION_MS
  }));
  clearTimeout(duel.timer);
  duel.timer = setTimeout(() => tttResolveDuelQuestion(room), TTT_DUEL_QUESTION_MS + 400);
}

function tttResolveDuelQuestion(room) {
  const duel = room.duel;
  if (!duel) return;
  clearTimeout(duel.timer);
  const q = duel.questions[duel.qIndex];
  const results = {};
  room.players.forEach(p => {
    const selected = duel.answered[p.symbol];
    const correct = selected === q.c;
    if (correct) duel.scores[p.symbol] = (duel.scores[p.symbol] || 0) + 1;
    else room.counters.wrong[p.symbol]++; // auch "keine Antwort" zaehlt als falsch
    results[p.symbol] = { selected: selected === undefined ? null : selected, correct };
  });
  broadcast(room, {
    type: "tttDuelReveal",
    cellIndex: duel.cellIndex,
    correctIndex: q.c,
    correctAnswer: Array.isArray(q.a) ? q.a[q.c] : null,
    explanation: q.e || "",
    results,
    scores: duel.scores
  });
  duel.qIndex++;
  if (duel.qIndex >= duel.questions.length) {
    setTimeout(() => tttFinishDuel(room), 2200);
  } else {
    setTimeout(() => tttSendDuelQuestion(room), 2200);
  }
}

function tttFinishDuel(room) {
  const duel = room.duel;
  if (!duel) return;
  const symbols = Object.keys(duel.scores);
  const [symA, symB] = symbols;
  let winnerSymbol = null;
  if (duel.scores[symA] > duel.scores[symB]) winnerSymbol = symA;
  else if (duel.scores[symB] > duel.scores[symA]) winnerSymbol = symB;
  // Bei Gleichstand (winnerSymbol bleibt null) bleibt das Feld leer.
  room.counters.duels++;
  if (winnerSymbol) {
    room.board[duel.cellIndex] = winnerSymbol;
    const w = tttCheckWinner(room.board);
    if (w) { room.gameOver = true; room.winner = w; }
  }
  // Wer das nächste Feld wählen darf, wechselt jetzt IMMER (auf Wunsch),
  // unabhängig davon, wer das Duell gewonnen hat oder ob es unentschieden war.
  if (!room.gameOver) {
    room.turnSymbol = room.turnSymbol === "X" ? "O" : "X";
  }
  broadcast(room, { type: "tttDuelFinished", cellIndex: duel.cellIndex, winnerSymbol, tie: !winnerSymbol });
  room.duel = null;
  tttBroadcastState(room);
}

function tttHandleDuelAnswer(room, symbol, selectedIndex) {
  const duel = room.duel;
  if (!duel) return;
  if (duel.answered[symbol] !== undefined) return; // schon geantwortet
  duel.answered[symbol] = selectedIndex;
  const allAnswered = room.players.every(p => duel.answered[p.symbol] !== undefined);
  if (allAnswered) tttResolveDuelQuestion(room);
}

// Zufallsgegner fuer Tic Tac Toe: je Modus eine Warteschlange
const tttQueues = { classic: [], quizmix: [], quantum: [] };
function tttQueueRemove(ws) { for (const k of Object.keys(tttQueues)) tttQueues[k] = tttQueues[k].filter(q => q.ws !== ws); }
function tttHandleDisconnect(ws) {
  tttQueueRemove(ws);
  const code = ws.tttRoomCode;
  if (!code) return;
  const room = tttRooms.get(code);
  if (!room) return;
  if (room.duel) { clearTimeout(room.duel.timer); room.duel = null; }
  const player = room.players.find(p => p.ws === ws);
  if (player) player.connected = false;
  const other = room.players.find(p => p.ws !== ws);
  if (other) {
    send(other.ws, { type: "tttOpponentLeft" });
  }
  // Raum sofort entfernen, wenn niemand mehr verbunden ist; sonst kurz
  // stehen lassen, falls die Person nur kurz die Verbindung verliert und
  // die Seite neu lädt (kommt dann aber als neue Verbindung rein, ein
  // echtes Wiederverbinden mit demselben Platz ist hier bewusst nicht
  // eingebaut, das würde den Umfang für ein kleines Minigame sprengen).
  if (room.players.every(p => !p.connected)) tttRooms.delete(code);
}

/* ------------------------------------------------------------------------ */
/* Team-Hilfsfunktionen                                                      */
/* ------------------------------------------------------------------------ */
function rebuildFfaTeams(room) {
  room.teams.clear();
  room.players.forEach(p => {
    room.teams.set(p.id, { id: p.id, name: p.name, memberIds: [p.id], score: room.teams.get(p.id)?.score || 0 });
    p.teamId = p.id;
  });
}

function roomStateForClient(room) {
  return {
    type: "roomUpdate",
    code: room.code,
    hostId: room.hostId,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id, name: p.name, teamId: p.teamId, connected: p.connected,
      isBot: !!p.isBot, botTier: p.botTier, botTierLabel: p.isBot ? botTierLabel(p.botTier, room.language) : null
    })),
    teamMode: room.teamMode,
    teams: Array.from(room.teams.values()).map(t => ({ id: t.id, name: t.name, memberIds: t.memberIds, score: t.score })),
    pointSystem: room.pointSystem,
    roundCount: room.roundCount,
    roundMode: room.roundMode,
    olympiadTheme: room.olympiadTheme || "fussball",
    olympiadThemes: OLYMPIAD_THEMES.map(t => ({ id: t.id, label: room.language === "de" ? t.de : t.en })),
    gameMode: room.gameMode,
    roundDefs: room.roundDefs.map(r => r ? ({ id: r.id, kind: r.kind, label: r.label, categories: r.categories }) : null),
    availableRoundDefs: roundDefPoolForLanguage(room.language, room.gameMode).map(r => ({ id: r.id, kind: r.kind, label: r.label, topicGroup: r.topicGroup || null })),
    language: room.language,
    botTierOptions: BOT_TIER_ORDER.map(key => ({ id: key, label: botTierLabel(key, room.language) })),
    maxParticipants: MAX_PARTICIPANTS,
    phase: room.phase,
    currentRoundIndex: room.currentRoundIndex,
    nennsBlitzSoloDurationMs: room.nennsBlitzSoloDurationMs || null
  };
}
function pushRoomState(room) { broadcast(room, roomStateForClient(room)); }

/* ------------------------------------------------------------------------ */
/* Rundenauswahl                                                             */
/* ------------------------------------------------------------------------ */
// Olympiade: vorgegebene Themen-Runden - es kommen NUR Runden zu einem Thema
// (z. B. Fussball: nur Fussball-Einordnen/Mehr-oder-Weniger/Nenn's Blitz).
const OLYMPIAD_THEMES = [
  { id: "fussball", de: "⚽ Fußball", en: "⚽ Football", keyRe: /fussball|kaderwert|wm_titel|stadien/ },
  { id: "sport", de: "🏅 Sport", en: "🏅 Sports", groups: ["Sport"] },
  { id: "geografie", de: "🌍 Geografie", en: "🌍 Geography", groups: ["Geografie"] },
  { id: "kultur", de: "🎬 Film, Musik & TV", en: "🎬 Film, music & TV", groups: ["Kultur & Unterhaltung", "Entertainment & Medien", "Deutsches TV"] },
  { id: "natur", de: "🔬 Natur & Wissenschaft", en: "🔬 Nature & science", groups: ["Natur & Wissenschaft"] },
  { id: "alltag", de: "🍔 Alltag & Kurioses", en: "🍔 Everyday & curiosities", groups: ["Alltag & Kurioses", "Alltag, Konsum & Marken", "Kurioses & Vergleiche"] },
  { id: "technik", de: "💰 Technik & Geld", en: "💰 Tech & money", groups: ["Technik & Medien", "Geld & Wirtschaft"] }
];
function olympiadThemeById(id) { return OLYMPIAD_THEMES.find(t => t.id === id) || OLYMPIAD_THEMES[0]; }
function olympiadPool(room) {
  const theme = olympiadThemeById(room.olympiadTheme);
  const base = roundDefPoolForLanguage(room.language, room.gameMode).filter(d => d.datasetGroup && d.datasetKey);
  const out = base.filter(d => {
    const ds = DATASETS[d.datasetGroup] && DATASETS[d.datasetGroup][d.datasetKey];
    if (!ds) return false;
    if (theme.keyRe) return theme.keyRe.test(d.datasetKey) && d.datasetKey !== "olympia_gold";
    return theme.groups.includes(ds.group);
  });
  return out;
}
function randomizeRoundDefs(room) {
  let availablePool = roundDefPoolForLanguage(room.language, room.gameMode);
  const defs = [];
  if (room.roundMode === "olympiad") {
    const op = olympiadPool(room);
    if (op.length) {
      // jede Runde einmal, bevor sich etwas wiederholt
      let bag = [];
      for (let i = 0; i < room.roundCount; i++) {
        if (!bag.length) bag = op.slice().sort(() => Math.random() - 0.5);
        defs.push(bag.pop());
      }
      room.roundDefs = defs;
      return;
    }
  }
  for (let i = 0; i < room.roundCount; i++) {
    const def = availablePool[Math.floor(Math.random() * availablePool.length)];
    defs.push(def);
  }
  room.roundDefs = defs;
}

/* ------------------------------------------------------------------------ */
/* Punktesysteme                                                             */
/* ------------------------------------------------------------------------ */
function awardRoundPoints(room, roundNumber, winnerTeamIds) {
  const teams = Array.from(room.teams.values());
  if (room.pointSystem === 2) {
    winnerTeamIds.forEach(id => {
      const t = room.teams.get(id);
      if (t) t.score += roundNumber; // Steigend: Rundennummer = Punktwert
    });
  } else {
    // System 1 (Runde) und System 3 (Punkteabzug) vergeben Basis +1 je Sieg.
    winnerTeamIds.forEach(id => {
      const t = room.teams.get(id);
      if (t) t.score += 1;
    });
  }
  // Score darf nie unter 0 fallen (konsistent mit dem übrigen Spiel)
  teams.forEach(t => { t.score = Math.max(0, t.score); });
}
function applyMistakePenalty(room, teamId) {
  if (room.pointSystem !== 3) return;
  const t = room.teams.get(teamId);
  if (t) t.score = Math.max(0, t.score - MISTAKE_PENALTY);
}

/* ------------------------------------------------------------------------ */
/* RUNDE: knowledgeQuiz                                                      */
/* ------------------------------------------------------------------------ */
// Gewichtung der Schwierigkeitsgrade im Party-Wissenstest (1=leicht … 4=extrem
// schwer). Session-basiert, da der Party-Modus keinen persönlichen Rang je
// Spieler kennt. Hier zentral anpassbar.
const QUIZ_DIFFICULTY_WEIGHTS = [0.25, 0.35, 0.30, 0.10];

function weightedQuizDifficulty() {
  const r = Math.random();
  const w = QUIZ_DIFFICULTY_WEIGHTS;
  if (r < w[0]) return 1;
  if (r < w[0] + w[1]) return 2;
  if (r < w[0] + w[1] + w[2]) return 3;
  return 4;
}

function pickQuizQuestions(n) {
  const picks = [];
  const usedIdx = new Set();
  for (let i = 0; i < n; i++) {
    const diff = weightedQuizDifficulty();
    let pool = QUIZ_QUESTIONS.map((q, idx) => ({ ...q, idx })).filter(q => q.d === diff && !usedIdx.has(q.idx));
    if (pool.length === 0) pool = QUIZ_QUESTIONS.map((q, idx) => ({ ...q, idx })).filter(q => !usedIdx.has(q.idx));
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    usedIdx.add(chosen.idx);
    picks.push(shuffleAnswerOrder(chosen));
  }
  return picks;
}
// Für die Arena-Quiz-Blöcke: n zufällige, unterschiedliche Fragen aus dem
// vereinigten Fragenpool der Klassen klasseMin bis klasseMax (statt aus dem
// allgemeinen QUIZ_QUESTIONS-Pool wie beim normalen Wissenstest).
function pickKlasseRangeQuestions(klasseMin, klasseMax, n) {
  const combined = [];
  for (let k = klasseMin; k <= klasseMax; k++) {
    (KLASSE_QUESTIONS[k] || []).forEach(q => combined.push(q));
  }
  const pool = combined.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).map(shuffleAnswerOrder);
}

function startQuizRound(room) {
  room.runtime = {
    kind: "knowledgeQuiz",
    questions: pickQuizQuestions(5),
    qIndex: 0,
    answers: new Map(), // playerId -> {selectedIndex, correct, delta}
    roundPointsByTeam: new Map(Array.from(room.teams.keys()).map(id => [id, 0])),
    timeLimit: QUIZ_TIME_LIMIT,
    timer: null
  };
  sendNextQuizQuestion(room);
}
// Wie startQuizRound, aber mit Klassen-gefiltertem Fragenpool für die
// Arena-Quiz-Blöcke (def.klasseMin/def.klasseMax kommen vom Client, der die
// aktuelle Liga kennt - siehe setArenaRoundPlan). Nutzt dieselbe
// sendNextQuizQuestion()/resolveQuizQuestion()-Pipeline wie der normale
// Wissenstest unverändert weiter, nur die Fragenauswahl unterscheidet sich
// und die Zeit ist bewusst kürzer (ARENA_TIME_LIMIT statt QUIZ_TIME_LIMIT).
function startArenaQuizRound(room, def) {
  room.runtime = {
    kind: "knowledgeQuiz",
    questions: pickKlasseRangeQuestions(def.klasseMin || 1, def.klasseMax || 10, 5),
    qIndex: 0,
    answers: new Map(),
    roundPointsByTeam: new Map(Array.from(room.teams.keys()).map(id => [id, 0])),
    timeLimit: ARENA_TIME_LIMIT,
    timer: null
  };
  sendNextQuizQuestion(room);
}

function sendNextQuizQuestion(room) {
  const rt = room.runtime;
  const q = rt.questions[rt.qIndex];
  rt.answers.clear();
  const timeLimit = rt.timeLimit || QUIZ_TIME_LIMIT;
  rt.questionDeadline = Date.now() + timeLimit * 1000;
  broadcast(room, {
    type: "quizQuestion",
    index: rt.qIndex,
    total: rt.questions.length,
    q: q.q, a: q.a, cat: q.cat,
    timeLimit
  });
  clearTimeout(rt.timer);
  rt.timer = setTimeout(() => resolveQuizQuestion(room), timeLimit * 1000 + 200);
  scheduleBotQuizAnswers(room);
}

// Lässt jeden Bot im Raum die aktuelle Frage nach einer schwierigkeitsabhängigen
// Verzögerung mit einer schwierigkeitsabhängigen Trefferquote beantworten.
function scheduleBotQuizAnswers(room) {
  const rt = room.runtime;
  const qIndexAtSchedule = rt.qIndex;
  room.players.forEach(p => {
    if (!p.isBot) return;
    const tier = BOT_TIERS[p.botTier] || BOT_TIERS[DEFAULT_BOT_TIER];
    const delayMs = Math.max(400, randRange(tier.quizMinPct, tier.quizMaxPct) * QUIZ_TIME_LIMIT * 1000);
    setTimeout(() => {
      if (!room.runtime || room.runtime !== rt || rt.qIndex !== qIndexAtSchedule) return;
      const q = rt.questions[rt.qIndex];
      const correct = Math.random() < tier.prob;
      let selectedIndex = q.c;
      if (!correct) {
        const wrongOptions = [0, 1, 2, 3].filter(i => i !== q.c);
        selectedIndex = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
      }
      handleQuizAnswer(room, p.id, selectedIndex);
    }, delayMs);
  });
}

function handleQuizAnswer(room, playerId, selectedIndex) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "knowledgeQuiz") return;
  if (rt.answers.has(playerId)) return;
  const q = rt.questions[rt.qIndex];
  const correct = selectedIndex === q.c;
  const delta = correct ? 100 : -150;
  rt.answers.set(playerId, { selectedIndex, correct, delta });

  const player = room.players.get(playerId);
  if (player && player.teamId) {
    rt.roundPointsByTeam.set(player.teamId, (rt.roundPointsByTeam.get(player.teamId) || 0) + delta);
    if (!correct) applyMistakePenalty(room, player.teamId);
  }

  const allAnswered = Array.from(room.players.keys()).every(pid => rt.answers.has(pid));
  if (allAnswered) {
    clearTimeout(rt.timer);
    resolveQuizQuestion(room);
  }
}

function resolveQuizQuestion(room) {
  const rt = room.runtime;
  if (!rt || rt.resolved) return;
  const q = rt.questions[rt.qIndex];
  const results = Array.from(room.players.values()).map(p => {
    const ans = rt.answers.get(p.id);
    return { playerId: p.id, name: p.name, selectedIndex: ans ? ans.selectedIndex : null, correct: ans ? ans.correct : false, delta: ans ? ans.delta : -150 };
  });
  // Spieler, die nicht geantwortet haben, gelten als falsch (Zeit abgelaufen)
  results.forEach(r => {
    if (!rt.answers.has(r.playerId)) {
      const player = room.players.get(r.playerId);
      if (player && player.teamId) {
        rt.roundPointsByTeam.set(player.teamId, (rt.roundPointsByTeam.get(player.teamId) || 0) - 150);
        applyMistakePenalty(room, player.teamId);
      }
    }
  });

  broadcast(room, {
    type: "quizReveal",
    correctIndex: q.c,
    correctAnswer: Array.isArray(q.a) ? q.a[q.c] : null,
    explanation: q.e || null,
    results
  });

  // Kein automatisches Weiterspringen mehr: der Host muss über die
  // "WEITER"-Aktion (case "continue") explizit bestätigen, siehe dort.
  rt.awaitingContinue = true;
}

// Wird vom Host über action "continue" ausgelöst, wenn eine Frage aufgelöst
// ist und auf Bestätigung wartet (siehe resolveQuizQuestion).
function advanceQuizQuestion(room) {
  const rt = room.runtime;
  if (!rt || !rt.awaitingContinue) return;
  rt.awaitingContinue = false;
  rt.qIndex++;
  if (rt.qIndex >= rt.questions.length) {
    finishRoundEngine(room, rt.roundPointsByTeam);
  } else {
    sendNextQuizQuestion(room);
  }
}

/* ------------------------------------------------------------------------ */
/* RUNDE: chronologyGame & higherLowerGame (gemeinsame Engine, rundenbasiert)*/
/* Unterschied: higherLower startet mit einem bekannten Referenzelement und  */
/* deckt Werte direkt nach jedem Zug auf; Chronologie deckt Werte erst am    */
/* Ende der Runde auf (Auflösung). Teams sind hier abwechselnd am Zug.       */
/* Einordnen (orderingGame) hat seit dem großen Umbau eine EIGENE, komplett  */
/* gleichzeitige Engine (jeder Spieler für sich, eigenes Raster, eigene      */
/* Leben, kein Rundenwechsel), siehe Abschnitt "RUNDE: orderingGame" weiter */
/* unten, NICHT diese Funktion hier.                                        */
/* ------------------------------------------------------------------------ */
function startRankingRound(room, def) {
  const group = def.datasetGroup;
  const dsRaw = dsFor(group, def.datasetKey, room.language);
  const revealOnTurn = group === "higherLower";
  // Chronologie: alle Elemente liegen von Anfang an offen sichtbar im Pool,
  // das aktive Team wählt selbst, welches Element es als Nächstes versucht.
  // Mehr oder Weniger (higherLowerGame): weiterhin ein zufällig gezogenes
  // Element pro Zug, dafür wird der Wert direkt aufgedeckt.
  const freeChoice = !revealOnTurn;

  // Manche Kategorien enthalten deutlich mehr als MAX_ROUND_ITEMS Elemente
  // (größerer, "echter" Datenpool). Damit eine Runde nicht ewig dauert, wird
  // daraus jedes Mal eine zufällige Auswahl gezogen, bei "Mehr oder Weniger"
  // bleibt das Referenzelement (seedId) dabei garantiert immer Teil der
  // Auswahl, egal wie die Zufallsauswahl sonst ausfällt.
  // Ausnahme: "Chronologie" soll bewusst IMMER die vollständige Liste zeigen
  // (z. B. wirklich jeder MCU-Film), auch wenn das mehr als 10 Elemente sind –
  // dafür ist das Spielfenster clientseitig scrollbar.
  const MAX_ROUND_ITEMS = 10;
  const allItems = dsRaw.items.map(it => ({ ...it }));
  let selected;
  if (def.kind === "chronologyGame" || allItems.length <= MAX_ROUND_ITEMS) {
    selected = allItems.sort(() => Math.random() - 0.5); // nur die Anzeige-Reihenfolge mischen, nichts weglassen
  } else if (revealOnTurn && dsRaw.seedId) {
    const seedItem = allItems.find(it => it.id === dsRaw.seedId);
    const rest = allItems.filter(it => it.id !== dsRaw.seedId).sort(() => Math.random() - 0.5).slice(0, MAX_ROUND_ITEMS - 1);
    selected = seedItem ? [seedItem, ...rest] : allItems.sort(() => Math.random() - 0.5).slice(0, MAX_ROUND_ITEMS);
  } else {
    selected = allItems.sort(() => Math.random() - 0.5).slice(0, MAX_ROUND_ITEMS);
  }

  let pool = selected;
  let placed = []; // aufsteigend nach Spielreihenfolge, in "order" sortiert (true Reihenfolge)
  let seed = null;

  if (revealOnTurn && dsRaw.seedId) {
    seed = pool.find(it => it.id === dsRaw.seedId);
    pool = pool.filter(it => it.id !== dsRaw.seedId);
    placed = [{ ...seed, revealed: true }];
  }
  if (def.kind !== "chronologyGame") {
    pool = pool.slice(0, 10 - placed.length);
  }
  pool = pool.sort(() => Math.random() - 0.5);

  const teamIds = Array.from(room.teams.keys());
  room.runtime = {
    kind: def.kind,
    label: dsRaw.label,
    unit: dsRaw.unit,
    order: dsRaw.order, // 'desc' oder 'asc'
    revealOnTurn,
    freeChoice,
    pool,               // bei Chronologie: sichtbare, noch nicht platzierte Elemente
                        // bei Mehr-oder-Weniger: verdeckter Nachziehstapel
    placed,             // bestätigte Elemente in wahrer Reihenfolge
    currentItem: null,  // nur bei Mehr-oder-Weniger genutzt
    turnOrder: teamIds,
    turnPointer: 0,
    lives: new Map(teamIds.map(id => [id, 3])),
    mistakes: new Map(teamIds.map(id => [id, 0])),
    correctCount: new Map(teamIds.map(id => [id, 0])),
    eliminated: new Set(),
    roundPointsByTeam: new Map(teamIds.map(id => [id, 0]))
  };
  advanceRankingTurn(room, true);
}

function activeTeamsRemaining(room) {
  return room.runtime.turnOrder.filter(id => !room.runtime.eliminated.has(id));
}

function advanceRankingTurn(room, first) {
  const rt = room.runtime;
  const active = activeTeamsRemaining(room);

  if (active.length === 0 || rt.pool.length === 0) {
    return finishRankingRound(room);
  }

  if (!first) {
    do {
      rt.turnPointer = (rt.turnPointer + 1) % rt.turnOrder.length;
    } while (rt.eliminated.has(rt.turnOrder[rt.turnPointer]));
  } else {
    while (rt.eliminated.has(rt.turnOrder[rt.turnPointer])) {
      rt.turnPointer = (rt.turnPointer + 1) % rt.turnOrder.length;
    }
  }

  if (!rt.freeChoice) {
    rt.currentItem = rt.pool.shift(); // Mehr oder Weniger: nächstes verdecktes Element ziehen
  }
  broadcastRankState(room);
  scheduleBotRankMove(room);
  scheduleRankingArenaTimer(room);
}

// Arena: bewusst kurzes Zeitlimit (ARENA_TIME_LIMIT) für die Entscheidung
// des gerade aktiven Teams - reagiert es nicht rechtzeitig, zählt das wie
// eine falsche Antwort (Leben weg), danach geht's normal weiter (gleiche
// "awaitingRankContinue"-Pause bei Mehr-oder-Weniger wie bei einer echten
// Antwort). Außerhalb der Arena bleibt die Entscheidungszeit unverändert
// unbegrenzt (kein Timer wird gesetzt).
function scheduleRankingArenaTimer(room) {
  const rt = room.runtime;
  if (!rt) return;
  clearTimeout(rt.arenaTurnTimer);
  if (room.gameMode !== "arena") return;
  rt.arenaTurnTimer = setTimeout(() => handleRankingArenaTimeout(room), ARENA_TIME_LIMIT * 1000 + 200);
}

function handleRankingArenaTimeout(room) {
  const rt = room.runtime;
  if (!rt) return;
  const teamId = rt.turnOrder[rt.turnPointer];
  if (!teamId || rt.eliminated.has(teamId)) return;

  rt.mistakes.set(teamId, (rt.mistakes.get(teamId) || 0) + 1);
  rt.lives.set(teamId, Math.max(0, (rt.lives.get(teamId) || 3) - 1));
  applyMistakePenalty(room, teamId);
  if (rt.lives.get(teamId) <= 0) rt.eliminated.add(teamId);

  let itemName = "–";
  if (rt.currentItem) {
    itemName = rt.currentItem.name;
    rt.pool.push(rt.currentItem);
    rt.currentItem = null;
  }

  broadcast(room, {
    type: "rankAttempt",
    teamId,
    itemName,
    timeout: true,
    correct: false,
    livesLeft: rt.lives.get(teamId),
    awaitingContinue: rt.revealOnTurn
  });

  if (rt.revealOnTurn) {
    rt.awaitingRankContinue = true;
  } else {
    setTimeout(() => advanceRankingTurn(room, false), 1600);
  }
}

// Ermittelt die tatsächlich korrekte Einfügeposition für einen Wert
// (basierend auf den bereits bestätigten, wahr sortierten Elementen).
function correctInsertIndexFor(rt, value) {
  const desc = rt.order === "desc";
  let idx = 0;
  for (; idx < rt.placed.length; idx++) {
    const v = rt.placed[idx].value;
    if (desc ? value > v : value < v) break;
  }
  return idx;
}

// Lässt einen Bot automatisch ziehen, wenn das gerade aktive Team
// ausschließlich aus Bots besteht (ein menschliches Teammitglied zieht
// weiterhin immer selbst). Gilt nur für Chronologie & Mehr-oder-Weniger
// (rundenbasiert), Einordnen hat eine eigene Bot-Funktion, siehe unten.
function scheduleBotRankMove(room) {
  const rt = room.runtime;
  if (!rt) return;
  const activeTeamId = rt.turnOrder[rt.turnPointer];
  const team = room.teams.get(activeTeamId);
  if (!team) return;
  const members = team.memberIds.map(id => room.players.get(id)).filter(Boolean);
  const allBots = members.length > 0 && members.every(p => p.isBot);
  if (!allBots) return;
  if (rt.freeChoice && rt.pool.length === 0) return;
  if (!rt.freeChoice && !rt.currentItem) return;

  const bot = members[0];
  const tier = BOT_TIERS[bot.botTier] || BOT_TIERS[DEFAULT_BOT_TIER];
  const turnSnapshot = rt.turnPointer;
  const delayMs = randRange(tier.rankDelayMin, tier.rankDelayMax);

  setTimeout(() => {
    if (!room.runtime || room.runtime !== rt) return; // Runde inzwischen beendet/gewechselt
    if (rt.turnPointer !== turnSnapshot || rt.turnOrder[rt.turnPointer] !== activeTeamId) return; // Zug hat sich geändert

    let targetItem;
    if (rt.freeChoice) {
      if (rt.pool.length === 0) return;
      targetItem = rt.pool[Math.floor(Math.random() * rt.pool.length)]; // Bot wählt ein beliebiges sichtbares Element
    } else {
      if (!rt.currentItem) return;
      targetItem = rt.currentItem;
    }

    const correct = Math.random() < tier.prob;
    const trueIndex = correctInsertIndexFor(rt, targetItem.value);
    let insertIndex = trueIndex;
    if (!correct) {
      const wrongOptions = [];
      for (let i = 0; i <= rt.placed.length; i++) if (i !== trueIndex) wrongOptions.push(i);
      insertIndex = wrongOptions.length ? wrongOptions[Math.floor(Math.random() * wrongOptions.length)] : trueIndex;
    }
    handleRankPlace(room, bot.id, targetItem.id, insertIndex);
  }, delayMs);
}

function broadcastRankState(room) {
  const rt = room.runtime;
  broadcast(room, {
    type: "rankState",
    kind: rt.kind,
    label: rt.label,
    unit: rt.unit,
    order: rt.order,
    freeChoice: rt.freeChoice,
    placed: rt.placed.map(it => ({ id: it.id, name: it.name, value: it.revealed ? it.value : undefined })),
    currentItem: (!rt.freeChoice && rt.currentItem) ? { id: rt.currentItem.id, name: rt.currentItem.name } : null,
    pool: rt.freeChoice ? rt.pool.map(it => ({ id: it.id, name: it.name })) : undefined,
    turnTeamId: rt.turnOrder[rt.turnPointer],
    lives: Object.fromEntries(rt.lives),
    mistakes: Object.fromEntries(rt.mistakes),
    eliminated: Array.from(rt.eliminated),
    remainingInPool: rt.pool.length,
    arenaTimeLimitMs: room.gameMode === "arena" ? ARENA_TIME_LIMIT * 1000 : null
  });
}

// Prüft, ob das Einfügen an insertIndex (0..placed.length) korrekt ist.
// Gleiche Werte werden toleriert (z.B. reale Gleichstände bei Titeln).
function isPlacementCorrect(rt, value, insertIndex) {
  const before = rt.placed[insertIndex - 1];
  const after = rt.placed[insertIndex];
  const desc = rt.order === "desc";
  const okBefore = !before || (desc ? value <= before.value : value >= before.value);
  const okAfter = !after || (desc ? value >= after.value : value <= after.value);
  return okBefore && okAfter;
}

function handleRankPlace(room, playerId, itemId, insertIndex) {
  const rt = room.runtime;
  // Nur in echten Ranking-Runden (Mehr oder Weniger / Chronologie). Eine
  // verspaetete Nachricht waehrend einer anderen Rundenart darf nie crashen.
  if (!rt || !Array.isArray(rt.turnOrder) || !Array.isArray(rt.placed)) return;
  const player = room.players.get(playerId);
  if (!player || player.teamId !== rt.turnOrder[rt.turnPointer]) return; // nur das Team am Zug darf ziehen
  if (typeof insertIndex !== "number" || insertIndex < 0 || insertIndex > rt.placed.length) return;
  clearTimeout(rt.arenaTurnTimer); // echte Aktion kam rechtzeitig - Timeout nicht mehr nötig

  let item;
  if (rt.freeChoice) {
    // Chronologie: freie Auswahl aus dem sichtbaren Pool
    const idx = rt.pool.findIndex(p => p.id === itemId);
    if (idx === -1) return;
    item = rt.pool[idx];
    rt.pool.splice(idx, 1); // vorerst entfernen, kommt bei Fehlversuch zurück
  } else {
    // Mehr oder Weniger: muss das aktuell gezogene Element sein
    if (!rt.currentItem || rt.currentItem.id !== itemId) return;
    item = rt.currentItem;
  }

  const teamId = player.teamId;
  const correct = isPlacementCorrect(rt, item.value, insertIndex);

  if (correct) {
    rt.placed.splice(insertIndex, 0, { ...item, revealed: false });
    rt.correctCount.set(teamId, (rt.correctCount.get(teamId) || 0) + 1);
    rt.roundPointsByTeam.set(teamId, (rt.roundPointsByTeam.get(teamId) || 0) + 10);
  } else {
    rt.mistakes.set(teamId, (rt.mistakes.get(teamId) || 0) + 1);
    rt.lives.set(teamId, Math.max(0, (rt.lives.get(teamId) || 3) - 1));
    applyMistakePenalty(room, teamId);
    if (rt.lives.get(teamId) <= 0) rt.eliminated.add(teamId);

    // Bei falscher Antwort wird NICHTS einsortiert, das Element bleibt
    // unplatziert und stellt sich hinten wieder in den Nachziehstapel/Pool
    // an, sodass beim nächsten Zug automatisch das nächste (andere) Element
    // dran ist. Das falsch geratene Element kann später erneut versucht
    // werden (bei Mehr oder Weniger: erneutes Ziehen vom Stapelanfang,
    // sobald es wieder vorne ansteht; bei Chronologie: erneute freie Wahl).
    rt.pool.push(item);
  }
  rt.currentItem = null;

  broadcast(room, {
    type: "rankAttempt",
    teamId,
    itemName: item.name,
    value: item.value,
    unit: rt.unit,
    correct,
    livesLeft: rt.lives.get(teamId),
    // Bei Mehr oder Weniger (revealOnTurn) bewusst KEIN automatischer
    // Weiterschalt-Timer mehr - der aufgedeckte Wert (z.B. "X Mio. Streams")
    // soll in Ruhe angeschaut werden koennen. Der Host schaltet manuell per
    // "continue" weiter. Bei Chronologie bleibt der bisherige kurze
    // automatische Rhythmus unveraendert (dort wird ja kein Wert aufgedeckt).
    awaitingContinue: rt.revealOnTurn
  });

  if (rt.revealOnTurn) {
    rt.awaitingRankContinue = true;
  } else {
    setTimeout(() => advanceRankingTurn(room, false), 1600);
  }
}

function finishRankingRound(room) {
  const rt = room.runtime;
  clearTimeout(rt.arenaTurnTimer);
  // Endauflösung: alle Werte aufdecken und Restpunkte je Team ausweisen.
  const fullyRevealed = [...rt.placed, ...rt.pool].sort((a, b) => rt.order === "desc" ? b.value - a.value : a.value - b.value);

  broadcast(room, {
    type: "rankReveal",
    kind: rt.kind,
    label: rt.label,
    unit: rt.unit,
    fullOrder: fullyRevealed.map(it => ({ id: it.id, name: it.name, value: it.value })),
    correctCount: Object.fromEntries(rt.correctCount),
    mistakes: Object.fromEntries(rt.mistakes),
    livesLeft: Object.fromEntries(rt.lives), // fuer die Erfolge: wer noch dabei (nicht raus) ist
    // Bugfix (auf Wunsch): die Endauflösung ging bisher nach fest 2,6
    // Sekunden automatisch weiter, ohne dass man die eigenen/gegnerischen
    // Antworten in Ruhe anschauen konnte. Jetzt kein automatischer Timer
    // mehr - der Host schaltet manuell per "WEITER" weiter, sobald alle
    // fertig geschaut haben. Betrifft gleichermaßen Mehr oder Weniger und
    // Chronologie, da beide dieselbe Engine hier nutzen.
    awaitingContinue: true
  });

  rt.awaitingRoundEndContinue = true;
}

/* ------------------------------------------------------------------------ */
/* RUNDE: orderingGame ("Einordnen"), EIGENE, komplett gleichzeitige Engine */
/* Jeder Spieler (nicht Team!) bekommt sein eigenes, unabhängiges 1..N-      */
/* Positionsraster mit denselben Elementen und eigene 3 Leben. Alle Spieler  */
/* platzieren gleichzeitig, ohne Rundenwechsel. Der erste UND der letzte     */
/* Tipp sind automatisch immer richtig (beim ersten gibt es noch keinen      */
/* Nachbarn zum Vergleichen; beim letzten bleibt rechnerisch zwangsläufig    */
/* nur noch das passende Element für den letzten freien Slot übrig), beides */
/* ergibt sich automatisch aus der Nachbar-Prüfung unten, ohne Sonderfall.   */
/* Sobald jemand ALLE Elemente korrekt UND ohne ein Leben zu verlieren       */
/* geschafft hat, bekommen alle anderen nur noch ORDERING_HURRY_MS Zeit.     */
/* Eine Obergrenze ORDERING_ROUND_CAP_MS gilt in jedem Fall für die ganze    */
/* Runde. Rang am Ende: fertige Spieler vor allen anderen; unter den         */
/* fertigen zählen zuerst mehr verbliebene Leben, dann höhere Geschwindig-   */
/* keit; unter den übrigen (eliminiert oder Zeit abgelaufen) zählen mehr     */
/* korrekt platzierte Elemente.                                             */
/* ------------------------------------------------------------------------ */
const ORDERING_LIVES = 3;
const ORDERING_HURRY_MS = 30000;       // Restzeit für alle anderen, sobald jemand PERFEKT fertig ist
// Kein absolutes Zeitlimit mehr für die Runde selbst (auf Wunsch entfernt,
// wie beim Anfechten) - die Runde läuft, bis alle fertig/eliminiert sind
// ODER der Host manuell per "continue" abschließt (Sicherheitsventil, falls
// jemand offensichtlich nicht mehr weiterspielt). Der Hurry-Timer, sobald
// jemand PERFEKT fertig ist, bleibt unverändert (das ist eine bewusste
// Dringlichkeit, kein "es geht zu schnell weg"-Problem).
const ORDERING_POINTS_PER_CORRECT = 10;

function startOrderingSimultaneousRound(room, def) {
  const dsRaw = dsFor("ordering", def.datasetKey, room.language);
  const MAX_ROUND_ITEMS = 10;
  const allItems = dsRaw.items.map(it => ({ ...it }));
  const selected = allItems.length <= MAX_ROUND_ITEMS
    ? allItems.sort(() => Math.random() - 0.5)
    : allItems.sort(() => Math.random() - 0.5).slice(0, MAX_ROUND_ITEMS);

  const perPlayer = new Map();
  room.players.forEach(p => {
    perPlayer.set(p.id, {
      slots: new Array(selected.length).fill(null),
      pool: selected.map(it => ({ ...it })), // eigene, unabhängige Kopie je Spieler
      lives: ORDERING_LIVES,
      mistakes: 0,
      correctCount: 0,
      finished: false,        // alle Elemente platziert (mit oder ohne Fehler unterwegs)
      finishedPerfect: false, // alle Elemente platziert UND 0 Fehler (alle 3 Leben noch da)
      eliminated: false,      // 0 Leben, konnte nicht fertig werden
      finishedAt: null,       // Date.now() bei Abschluss (Geschwindigkeits-Tiebreak)
      arenaTimer: null        // nur in der Arena genutzt (siehe unten)
    });
  });

  room.runtime = {
    kind: "orderingGame",
    label: dsRaw.label,
    unit: dsRaw.unit,
    order: dsRaw.order,
    totalItems: selected.length,
    sortedValues: selected.map(i => i.value).sort((a, b) => dsRaw.order === "desc" ? b - a : a - b),
    perPlayer,
    startedAt: Date.now(),
    hurryDeadline: null,
    timer: null,
    finalized: false
  };

  broadcastOrderingState(room);
  scheduleBotOrderingPlays(room);

  // Arena: bewusst kurzes Zeitlimit (ARENA_TIME_LIMIT) je Spieler für die
  // NÄCHSTE Platzierung, statt der sonst hier unbegrenzten Zeit - reagiert
  // niemand rechtzeitig, zählt das wie eine falsche Platzierung (Leben
  // weg) und der Timer läuft für den nächsten Versuch direkt weiter.
  if (room.gameMode === "arena") {
    room.players.forEach(p => tttScheduleOrderingArenaTimer(room, p.id));
  }
}

function tttScheduleOrderingArenaTimer(room, playerId) {
  const rt = room.runtime;
  const st = rt.perPlayer.get(playerId);
  if (!st || st.finished || st.eliminated) return;
  clearTimeout(st.arenaTimer);
  st.arenaTimer = setTimeout(() => handleOrderingArenaTimeout(room, playerId), ARENA_TIME_LIMIT * 1000 + 200);
}

function handleOrderingArenaTimeout(room, playerId) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "orderingGame") return;
  const st = rt.perPlayer.get(playerId);
  if (!st || st.finished || st.eliminated || st.pool.length === 0) return;
  // Keine rechtzeitige Platzierung -> zaehlt wie ein Fehlversuch (Leben
  // weg), das Element bleibt im eigenen Pool erhalten (kann später erneut
  // versucht werden, genau wie bei einer normalen falschen Platzierung).
  st.mistakes++;
  st.lives = Math.max(0, st.lives - 1);
  if (st.lives <= 0) {
    st.eliminated = true;
  }
  broadcastOrderingState(room);
  checkOrderingRoundEnd(room);
  if (!st.finished && !st.eliminated) tttScheduleOrderingArenaTimer(room, playerId);
}

// Prüft, ob das Einsortieren an slotIndex im festen 1..N-Positionsraster
// EINES Spielers korrekt ist. Verglichen wird nur mit den jeweils nächsten
// bereits befüllten Nachbarslots (leere Slots dazwischen werden
// übersprungen), noch leere Slots links/rechts vom Spielfeldrand gelten
// als "kein Widerspruch". Dadurch ist der allererste Tipp automatisch immer
// richtig (kein Nachbar vorhanden), und der letzte verbleibende Tipp bei nur
// noch einem freien Slot ist es rechnerisch zwangsläufig ebenfalls.
function isOrderingSlotCorrect(slots, order, value, slotIndex, sortedValues) {
  // ABSOLUT: Element zählt nur, wenn es exakt auf seinem Endrang liegt
  if (sortedValues) return sortedValues[slotIndex] === value;
  const desc = order === "desc";
  let beforeVal = null, afterVal = null;
  for (let i = slotIndex - 1; i >= 0; i--) {
    if (slots[i]) { beforeVal = slots[i].value; break; }
  }
  for (let i = slotIndex + 1; i < slots.length; i++) {
    if (slots[i]) { afterVal = slots[i].value; break; }
  }
  const okBefore = beforeVal === null || (desc ? value <= beforeVal : value >= beforeVal);
  const okAfter = afterVal === null || (desc ? value >= afterVal : value <= afterVal);
  return okBefore && okAfter;
}

// Liefert alle aktuell noch offenen Slots, die für den gegebenen Wert im
// Moment gültig wären (für Bot-Entscheidungen).
function validOrderingSlots(slots, order, value, sortedValues) {
  const valid = [];
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null && isOrderingSlotCorrect(slots, order, value, i, sortedValues)) valid.push(i);
  }
  return valid;
}

function handleOrderingPlace(room, playerId, itemId, slotIndex) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "orderingGame" || rt.finalized) return;
  const st = rt.perPlayer.get(playerId);
  if (!st || st.finished || st.eliminated) return;
  if (typeof slotIndex !== "number" || slotIndex < 0 || slotIndex >= st.slots.length || st.slots[slotIndex] !== null) return;

  const idx = st.pool.findIndex(p => p.id === itemId);
  if (idx === -1) return;
  const item = st.pool[idx];
  st.pool.splice(idx, 1);

  const correct = isOrderingSlotCorrect(st.slots, rt.order, item.value, slotIndex, rt.sortedValues);

  if (correct) {
    st.slots[slotIndex] = { ...item, revealed: false };
    st.correctCount++;
  } else {
    st.mistakes++;
    st.lives = Math.max(0, st.lives - 1);
    const player = room.players.get(playerId);
    if (player && player.teamId) applyMistakePenalty(room, player.teamId);
    st.pool.push(item); // zurück in den eigenen Pool, später erneut versuchbar
    if (st.lives <= 0) {
      st.eliminated = true;
      st.finishedAt = Date.now();
    }
  }

  if (!st.eliminated && st.pool.length === 0) {
    st.finished = true;
    st.finishedAt = Date.now();
    st.finishedPerfect = st.mistakes === 0;
    if (st.finishedPerfect && !rt.hurryDeadline) {
      rt.hurryDeadline = Date.now() + ORDERING_HURRY_MS;
      clearTimeout(rt.timer);
      rt.timer = setTimeout(() => finalizeOrderingRound(room), ORDERING_HURRY_MS + 300);
      broadcast(room, { type: "orderingHurry", remainingMs: ORDERING_HURRY_MS });
    }
  }

  broadcastOrderingState(room);
  checkOrderingRoundEnd(room);
  if (room.gameMode === "arena") tttScheduleOrderingArenaTimer(room, playerId); // no-op falls fertig/eliminiert
}

function checkOrderingRoundEnd(room) {
  const rt = room.runtime;
  const stillActive = Array.from(rt.perPlayer.values()).some(s => !s.finished && !s.eliminated);
  if (!stillActive) {
    clearTimeout(rt.timer);
    finalizeOrderingRound(room);
  }
}

// Personalisierter Zustand: jeder Spieler sieht nur sein eigenes Raster/Pool,
// dazu eine Mini-Bestenliste mit dem FORTSCHRITT (nicht den Antworten) der
// anderen für das Wettrennen-Gefühl.
function broadcastOrderingState(room) {
  const rt = room.runtime;
  const leaderboard = Array.from(room.players.values()).map(p => {
    const st = rt.perPlayer.get(p.id);
    if (!st) return null;
    return {
      playerId: p.id, name: p.name, isBot: p.isBot,
      lives: st.lives, correctCount: st.correctCount,
      finished: st.finished, finishedPerfect: st.finishedPerfect, eliminated: st.eliminated
    };
  }).filter(Boolean);

  room.players.forEach(p => {
    if (p.isBot || !p.ws) return;
    const st = rt.perPlayer.get(p.id);
    if (!st) return;
    send(p.ws, {
      type: "orderingState",
      label: rt.label, unit: rt.unit, order: rt.order, totalItems: rt.totalItems,
      slots: st.slots.map(s => s ? { id: s.id, name: s.name } : null),
      pool: st.pool.map(it => ({ id: it.id, name: it.name })),
      lives: st.lives, correctCount: st.correctCount,
      finished: st.finished, finishedPerfect: st.finishedPerfect, eliminated: st.eliminated,
      hurryActive: !!rt.hurryDeadline,
      remainingMs: rt.hurryDeadline ? Math.max(0, rt.hurryDeadline - Date.now()) : null,
      arenaTimeLimitMs: room.gameMode === "arena" ? ARENA_TIME_LIMIT * 1000 : null,
      leaderboard
    });
  });
}

function finalizeOrderingRound(room) {
  const rt = room.runtime;
  if (!rt || rt.finalized) return;
  rt.finalized = true;
  clearTimeout(rt.timer);
  // Alle individuellen Arena-Timer sauber stoppen, sonst könnten sie nach
  // Rundenende noch verspätet feuern und auf einem bereits abgeschlossenen
  // Zustand herumrechnen.
  rt.perPlayer.forEach(st => clearTimeout(st.arenaTimer));

  const results = Array.from(rt.perPlayer.entries()).map(([playerId, st]) => ({ playerId, ...st }));

  // Rang: fertige Spieler (auch mit Fehlern) vor allen anderen. Unter den
  // fertigen: mehr Leben zuerst, dann schneller (frühere finishedAt) zuerst.
  // Unter den übrigen (eliminiert oder Zeit abgelaufen): mehr korrekt
  // platzierte Elemente zuerst.
  results.sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished) {
      if (a.lives !== b.lives) return b.lives - a.lives;
      return (a.finishedAt || Infinity) - (b.finishedAt || Infinity);
    }
    return b.correctCount - a.correctCount;
  });
  results.forEach((r, i) => { r.rank = i + 1; });

  // Endauflösung je Spieler: platzierte + noch offene Elemente in wahrer Reihenfolge
  const fullOrderByPlayer = {};
  rt.perPlayer.forEach((st, pid) => {
    const items = [...st.slots.filter(Boolean), ...st.pool];
    fullOrderByPlayer[pid] = items
      .sort((a, b) => rt.order === "desc" ? b.value - a.value : a.value - b.value)
      .map(it => ({ id: it.id, name: it.name, value: it.value }));
  });

  const roundPointsByTeam = new Map(Array.from(room.teams.keys()).map(id => [id, 0]));
  rt.perPlayer.forEach((st, pid) => {
    const player = room.players.get(pid);
    if (!player || !player.teamId) return;
    roundPointsByTeam.set(player.teamId, (roundPointsByTeam.get(player.teamId) || 0) + st.correctCount * ORDERING_POINTS_PER_CORRECT);
  });

  broadcast(room, {
    type: "orderingFinalReveal",
    label: rt.label,
    results: results.map(r => ({
      playerId: r.playerId, rank: r.rank, lives: r.lives, correctCount: r.correctCount,
      totalItems: rt.totalItems, finished: r.finished, finishedPerfect: r.finishedPerfect, eliminated: r.eliminated
    })),
    fullOrderByPlayer,
    players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, teamId: p.teamId }))
  });

  setTimeout(() => finishRoundEngine(room, roundPointsByTeam), 2600);
}

// Bots spielen unabhängig auf ihrem eigenen Raster mit, ohne Rundenwechsel:
// nach jeder eigenen (verzögerten) Platzierung wird gleich der nächste Zug
// eingeplant, bis der Bot fertig, eliminiert ist oder die Runde endet.
function scheduleBotOrderingPlays(room) {
  const rt = room.runtime;
  Array.from(room.players.values()).filter(p => p.isBot).forEach(bot => {
    const tier = BOT_TIERS[bot.botTier] || BOT_TIERS[DEFAULT_BOT_TIER];
    scheduleNextBotOrderingMove(room, rt, bot, tier);
  });
}
function scheduleNextBotOrderingMove(room, rt, bot, tier) {
  if (room.runtime !== rt || rt.finalized) return;
  const st = rt.perPlayer.get(bot.id);
  if (!st || st.finished || st.eliminated) return;
  const delayMs = randRange(tier.rankDelayMin, tier.rankDelayMax);
  setTimeout(() => {
    if (room.runtime !== rt || rt.finalized) return;
    const st2 = rt.perPlayer.get(bot.id);
    if (!st2 || st2.finished || st2.eliminated || st2.pool.length === 0) return;

    const targetItem = st2.pool[Math.floor(Math.random() * st2.pool.length)];
    const correct = Math.random() < tier.prob;
    const emptySlots = [];
    for (let i = 0; i < st2.slots.length; i++) if (st2.slots[i] === null) emptySlots.push(i);
    const valid = validOrderingSlots(st2.slots, rt.order, targetItem.value, rt.sortedValues);
    let slotIndex;
    if (correct && valid.length) {
      slotIndex = valid[Math.floor(Math.random() * valid.length)];
    } else {
      const wrongSlots = emptySlots.filter(i => !valid.includes(i));
      slotIndex = wrongSlots.length
        ? wrongSlots[Math.floor(Math.random() * wrongSlots.length)]
        : (valid.length ? valid[Math.floor(Math.random() * valid.length)] : emptySlots[0]);
    }
    handleOrderingPlace(room, bot.id, targetItem.id, slotIndex);
    scheduleNextBotOrderingMove(room, rt, bot, tier);
  }, delayMs);
}

/* ------------------------------------------------------------------------ */
/* RUNDE: guessPicture ("Bild erraten")                                      */
/* Ein Bild/Emoji wird zunehmend deutlicher; je früher richtig geraten wird  */
/* (Freitext, tippfehlertolerant), desto mehr Punkte gibt es. Alle Spieler   */
/* können jederzeit raten, wer zuerst richtig liegt, bekommt die Punkte.   */
/* ------------------------------------------------------------------------ */
const GUESS_TIER_MS = 3000;           // Dauer je Punktestufe
const GUESS_TIERS = [5, 3, 2, 1];     // Punkte je Stufe (zentral anpassbar)
const GUESS_TOTAL_MS = GUESS_TIER_MS * GUESS_TIERS.length;

function normalizeGuess(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Akzente entfernen
    .replace(/[^a-z0-9]/g, "") // Leerzeichen/Sonderzeichen entfernen
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isGuessCorrect(guessText, item) {
  const norm = normalizeGuess(guessText);
  if (!norm) return false;
  const candidates = [item.answer, ...(item.alt || [])].map(normalizeGuess);
  return candidates.some(c => {
    if (norm === c) return true;
    const maxDist = c.length <= 4 ? 0 : (c.length <= 8 ? 1 : 2);
    return levenshtein(norm, c) <= maxDist;
  });
}

function currentGuessTierPoints(rt) {
  const elapsed = Date.now() - rt.currentStartedAt;
  const tierIdx = Math.min(Math.floor(elapsed / GUESS_TIER_MS), GUESS_TIERS.length - 1);
  return GUESS_TIERS[Math.max(0, tierIdx)];
}

function startGuessPictureRound(room, def) {
  const dsRaw = DATASETS.guessPicture[def.datasetKey];
  const items = [...dsRaw.items].sort(() => Math.random() - 0.5).slice(0, 10);
  const teamIds = Array.from(room.teams.keys());
  room.runtime = {
    kind: "guessPicture",
    label: dsRaw.label,
    promptType: dsRaw.promptType, // Datensatz-weit ("emoji" oder "image"), nicht pro Element
    items,
    index: -1,
    current: null,
    currentStartedAt: 0,
    currentResolved: false,
    timer: null,
    roundPointsByTeam: new Map(teamIds.map(id => [id, 0]))
  };
  nextGuessItem(room);
}

function nextGuessItem(room) {
  const rt = room.runtime;
  clearTimeout(rt.timer);
  rt.index++;
  if (rt.index >= rt.items.length) {
    return finishRoundEngine(room, rt.roundPointsByTeam);
  }
  rt.current = rt.items[rt.index];
  rt.currentStartedAt = Date.now();
  rt.currentResolved = false;

  broadcast(room, {
    type: "guessItem",
    index: rt.index,
    total: rt.items.length,
    label: rt.label,
    promptType: rt.promptType,
    promptValue: rt.current.promptValue,
    durationMs: GUESS_TOTAL_MS,
    tierMs: GUESS_TIER_MS,
    tiers: GUESS_TIERS,
    startedAt: rt.currentStartedAt
  });

  rt.timer = setTimeout(() => resolveGuessItem(room, null, 0), GUESS_TOTAL_MS + 300);
  scheduleBotGuesses(room);
}

function handleGuessSubmit(room, playerId, text) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "guessPicture" || rt.currentResolved || !rt.current) return;
  const player = room.players.get(playerId);
  if (!player) return;
  const correct = isGuessCorrect(text, rt.current);
  broadcast(room, { type: "guessAttempt", teamId: player.teamId, playerName: player.name, text: (text || "").slice(0, 40), correct });
  if (correct) {
    const pts = currentGuessTierPoints(rt);
    resolveGuessItem(room, player.teamId, pts);
  }
}

function resolveGuessItem(room, winnerTeamId, points) {
  const rt = room.runtime;
  if (!rt || rt.currentResolved) return;
  rt.currentResolved = true;
  clearTimeout(rt.timer);
  if (winnerTeamId) {
    rt.roundPointsByTeam.set(winnerTeamId, (rt.roundPointsByTeam.get(winnerTeamId) || 0) + points);
  }
  broadcast(room, {
    type: "guessResolved",
    correctAnswer: rt.current.answer,
    winnerTeamId: winnerTeamId || null,
    points: points || 0
  });
  setTimeout(() => nextGuessItem(room), 2600);
}

// Bots raten mit schwierigkeitsabhängiger Verzögerung und Trefferquote –
// analog zu den Bots beim Wissenstest.
function scheduleBotGuesses(room) {
  const rt = room.runtime;
  const itemAtSchedule = rt.index;
  room.players.forEach(p => {
    if (!p.isBot) return;
    const tier = BOT_TIERS[p.botTier] || BOT_TIERS[DEFAULT_BOT_TIER];
    const delayMs = Math.max(400, randRange(tier.quizMinPct, tier.quizMaxPct) * GUESS_TOTAL_MS);
    setTimeout(() => {
      if (!room.runtime || room.runtime !== rt || rt.index !== itemAtSchedule || rt.currentResolved) return;
      if (Math.random() < tier.prob) {
        const pts = currentGuessTierPoints(rt);
        broadcast(room, { type: "guessAttempt", teamId: p.teamId, playerName: p.name, text: rt.current.answer, correct: true });
        resolveGuessItem(room, p.teamId, pts);
      }
    }, delayMs);
  });
}

/* ------------------------------------------------------------------------ */
/* RUNDE: guessMusic ("Musik raten")                                         */
/* Ein YouTube-Clip spielt für alle gemeinsam/synchron (geteilte Wiedergabe).*/
/* Jede/r kann bis zu MUSIC_MAX_REPLAYS mal "Nochmal hören" anfordern, der  */
/* Clip spielt dabei ab der Stopp-Stelle weiter (nicht von vorne). Das senkt */
/* die maximal erreichbare Punktzahl je Feld für ALLE Spieler (geteilte      */
/* Entscheidung, da alle dasselbe hören). Jede/r gibt unabhängig von den     */
/* anderen drei Antworten ab: Künstler, Titel, Jahr, jedes Feld zählt       */
/* einzeln (schon ein richtiges Feld gibt Punkte, mehr richtige Felder geben */
/* entsprechend mehr). Punkte je richtigem Feld = MUSIC_FIELD_MAX_POINTS     */
/* minus Anzahl der bis zur EIGENEN Abgabe bereits genutzten Wiederholungen  */
/* (mindestens 1). Freitext bei Künstler/Titel ist tippfehlertolerant        */
/* (dieselbe isGuessCorrect()-Logik wie bei Bild erraten), Jahr exakt.       */
/* ------------------------------------------------------------------------ */
const MUSIC_FIELD_MAX_POINTS = 3;      // Punkte je richtigem Feld ohne genutzte Wiederholung
const MUSIC_MAX_REPLAYS = 2;           // max. "Nochmal hören"-Anfragen pro Song (geteilt, für alle)
const MUSIC_DEFAULT_CLIP_SECONDS = 10; // Länge je Hördurchgang (erster Durchgang + jede Wiederholung)
const MUSIC_ROUND_CAP_MS = 60000;      // Sicherheits-Obergrenze je Song, falls jemand nie abgibt

function startGuessMusicRound(room, def) {
  const dsRaw = DATASETS.guessMusic[def.datasetKey];
  const items = [...dsRaw.items].sort(() => Math.random() - 0.5).slice(0, 10);
  const teamIds = Array.from(room.teams.keys());
  room.runtime = {
    kind: "guessMusic",
    label: dsRaw.label,
    // Bei Serien-Intros wird bewusst kein Interpret abgefragt/gewertet -
    // nur Serie (Feld "title") und Erscheinungsjahr (siehe Anforderung).
    noArtist: !!dsRaw.noArtist,
    items,
    index: -1,
    current: null,
    replaysUsed: 0,     // geteilter Zähler für den aktuellen Song (0..MUSIC_MAX_REPLAYS)
    perPlayer: new Map(), // playerId -> { submitted, answers:{artist,title,year}, points:{artist,title,year} }
    timer: null,
    roundPointsByTeam: new Map(teamIds.map(id => [id, 0]))
  };
  nextMusicItem(room);
}

function nextMusicItem(room) {
  const rt = room.runtime;
  clearTimeout(rt.timer);
  rt.index++;
  if (rt.index >= rt.items.length) {
    return finishRoundEngine(room, rt.roundPointsByTeam);
  }
  rt.current = rt.items[rt.index];
  rt.replaysUsed = 0;
  rt.perPlayer = new Map();
  room.players.forEach(p => {
    rt.perPlayer.set(p.id, { submitted: false, answers: null, points: null });
  });

  const clipSeconds = rt.current.clipSeconds || MUSIC_DEFAULT_CLIP_SECONDS;
  broadcast(room, {
    type: "musicItem",
    index: rt.index,
    total: rt.items.length,
    label: rt.label,
    noArtist: rt.noArtist,
    youtubeId: rt.current.youtubeId,
    startSeconds: rt.current.startSeconds || 0,
    clipSeconds,
    maxReplays: MUSIC_MAX_REPLAYS,
    fieldMaxPoints: MUSIC_FIELD_MAX_POINTS
  });

  rt.timer = setTimeout(() => resolveMusicItem(room), MUSIC_ROUND_CAP_MS);
  scheduleBotMusicGuesses(room);
}

// Jede/r Spieler/in kann das anfordern (nicht nur der Host), wirkt sich auf
// ALLE aus, da die Wiedergabe geteilt ist. Läuft ab der Stopp-Stelle weiter.
function handleMusicReplay(room, playerId) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "guessMusic" || !rt.current) return;
  if (rt.replaysUsed >= MUSIC_MAX_REPLAYS) return;
  const player = room.players.get(playerId);
  if (!player) return;
  rt.replaysUsed++;
  const clipSeconds = rt.current.clipSeconds || MUSIC_DEFAULT_CLIP_SECONDS;
  const continueFromSeconds = (rt.current.startSeconds || 0) + clipSeconds * rt.replaysUsed;
  broadcast(room, {
    type: "musicReplayGranted",
    startSeconds: continueFromSeconds,
    clipSeconds,
    replaysUsed: rt.replaysUsed,
    maxReplays: MUSIC_MAX_REPLAYS,
    fieldMaxPoints: Math.max(1, MUSIC_FIELD_MAX_POINTS - rt.replaysUsed),
    requestedBy: player.name
  });
}

function currentMusicFieldCap(rt) {
  return Math.max(1, MUSIC_FIELD_MAX_POINTS - rt.replaysUsed);
}

function handleMusicSubmit(room, playerId, answers) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "guessMusic" || !rt.current) return;
  const st = rt.perPlayer.get(playerId);
  if (!st || st.submitted) return;
  const player = room.players.get(playerId);
  if (!player) return;

  // Punkte-Obergrenze je Feld wird JETZT festgeschrieben (Stand der bis zu
  // diesem Zeitpunkt genutzten Wiederholungen), spätere Wiederholungen durch
  // andere Spieler wirken sich nicht mehr rückwirkend auf diese Abgabe aus.
  const cap = currentMusicFieldCap(rt);
  const clean = {
    artist: ((answers && answers.artist) || "").toString().slice(0, 60),
    title: ((answers && answers.title) || "").toString().slice(0, 60),
    year: ((answers && answers.year) || "").toString().slice(0, 10)
  };
  // Bei Serien-Intros (rt.noArtist) zählt der Interpret nicht mit - unabhängig
  // davon, was (falls überhaupt) im Feld ankommt, gibt es dafür nie Punkte.
  const artistCorrect = !rt.noArtist && isGuessCorrect(clean.artist, { answer: rt.current.artist, alt: [] });
  const titleCorrect = isGuessCorrect(clean.title, { answer: rt.current.title, alt: [] });
  const yearCorrect = clean.year.trim() !== "" && parseInt(clean.year, 10) === rt.current.year;

  const points = {
    artist: artistCorrect ? cap : 0,
    title: titleCorrect ? cap : 0,
    year: yearCorrect ? cap : 0
  };
  const total = points.artist + points.title + points.year;

  st.submitted = true;
  st.answers = clean;
  st.points = points;

  if (total > 0 && player.teamId) {
    rt.roundPointsByTeam.set(player.teamId, (rt.roundPointsByTeam.get(player.teamId) || 0) + total);
  }

  broadcast(room, {
    type: "musicPlayerSubmitted",
    playerId,
    playerName: player.name,
    total,
    replaysUsed: rt.replaysUsed || 0, // fuer den Erfolg "ohne nochmal zuhoeren"
    correct: { artist: artistCorrect, title: titleCorrect, year: yearCorrect }
  });

  const allSubmitted = Array.from(room.players.keys())
    .filter(pid => !room.players.get(pid).isBot)
    .every(pid => rt.perPlayer.get(pid) && rt.perPlayer.get(pid).submitted);
  if (allSubmitted) { clearTimeout(rt.timer); resolveMusicItem(room); }
}

function resolveMusicItem(room) {
  const rt = room.runtime;
  if (!rt || !rt.current) return;
  clearTimeout(rt.timer);

  const results = Array.from(rt.perPlayer.entries()).map(([pid, st]) => {
    const player = room.players.get(pid);
    return {
      playerId: pid,
      name: player ? player.name : "?",
      submitted: st.submitted,
      answers: st.answers,
      points: st.points,
      total: st.points ? (st.points.artist + st.points.title + st.points.year) : 0
    };
  });

  broadcast(room, {
    type: "musicResolved",
    title: rt.current.title,
    artist: rt.current.artist,
    year: rt.current.year || null,
    cover: rt.current.cover || null,
    genre: rt.current.genre || null,
    noArtist: rt.noArtist,
    results
  });

  rt.current = null;
  setTimeout(() => nextMusicItem(room), 3800);
}

// Bots geben wie bei anderen Modi mit schwierigkeitsabhängiger Verzögerung
// und Trefferquote ab, über denselben handleMusicSubmit()-Weg wie Menschen,
// damit sie exakt denselben Regeln (inkl. aktuellem Wiederholungs-Stand)
// unterliegen. Bots fordern selbst keine Wiederholungen an.
function scheduleBotMusicGuesses(room) {
  const rt = room.runtime;
  const itemAtSchedule = rt.index;
  const clipSeconds = (rt.current.clipSeconds || MUSIC_DEFAULT_CLIP_SECONDS);
  room.players.forEach(p => {
    if (!p.isBot) return;
    const tier = BOT_TIERS[p.botTier] || BOT_TIERS[DEFAULT_BOT_TIER];
    const delayMs = Math.max(600, randRange(tier.quizMinPct, tier.quizMaxPct) * clipSeconds * 1000);
    setTimeout(() => {
      if (!room.runtime || room.runtime !== rt || rt.index !== itemAtSchedule || !rt.current) return;
      const knowsIt = Math.random() < tier.prob;
      handleMusicSubmit(room, p.id, {
        artist: knowsIt ? rt.current.artist : "",
        title: knowsIt ? rt.current.title : "",
        year: knowsIt ? String(rt.current.year || "") : ""
      });
    }, delayMs);
  });
}

/* ------------------------------------------------------------------------ */
/* RUNDE: nennsBlitz ("Nenn's Blitz")                                        */
/* Freitext, keine feste Lösungsliste, alle Spieler:innen tippen GLEICH-    */
/* ZEITIG frei Begriffe zu einer Kategorie (kein Buzzer, kein reihum mehr,  */
/* nach Rückfrage bewusst so vereinfacht). Jede neu getippte, im EIGENEN     */
/* Feld noch nicht genannte Antwort zählt vorläufig, dieselbe Antwort von   */
/* zwei verschiedenen Spieler:innen zählt für beide unabhängig (kein "wer    */
/* zuerst"-Wettrennen, jede/r sammelt für sich). Nach Ablauf der Zeit folgt  */
/* eine Anfechtungsphase (Mechanik von Stadt Land Fluss übernommen:          */
/* Anfechten + Mitspieler-Abstimmung, 30s Fenster, 20s je Einzelabstimmung), */
/* erst danach steht die Wertung fest.                                      */
/*                                                                          */
/* Zeit (nach Rückfrage so festgelegt): Solo wählbar zwischen 60/90/120/180 */
/* Sekunden (Auswahl vorab in der Lobby über setNennsBlitzDuration, auf     */
/* room.nennsBlitzSoloDurationMs gespeichert, Standard 60s falls nie        */
/* gesetzt). Duell/Multiplayer immer fest 120 Sekunden, keine Auswahl.      */
/* Punkte: 1 pro gültiger Antwort, je Team aufsummiert.                     */
/* ------------------------------------------------------------------------ */
const NENNSBLITZ_SOLO_DURATION_OPTIONS_MS = [60000, 90000, 120000, 180000];
const NENNSBLITZ_SOLO_DEFAULT_MS = 60000;
const NENNSBLITZ_DUELL_MS = Number(process.env.NENNSBLITZ_DUELL_MS) || 120000; // Env nur fuer Tests        // fest für 2+ Spieler:innen, keine Auswahl
// Kein Zeitlimit mehr fürs Anfechten (auf Wunsch entfernt) - läuft jetzt,
// bis der Host manuell per "continue" weitergeht.

function normalizeNennsBlitzText(text) {
  return (text || "").trim().toLowerCase().replace(/[^a-zäöüß0-9 ]/gi, "").replace(/\s+/g, " ").trim();
}

function startNennsBlitzRound(room, def) {
  const ds = dsFor("nennsBlitz", def.datasetKey, room.language);
  const teamIds = Array.from(room.teams.keys());
  // Solo-Party-Räume bestehen strukturell immer aus genau 1 menschlichen
  // Spieler:in (keine Bots, kein Warten auf weitere Beitritte), daher
  // ist "genau 1 Spieler im Raum" hier ein zuverlässiges Solo-Kriterium.
  const isSolo = room.players.size === 1;
  const durationMs = isSolo
    ? (NENNSBLITZ_SOLO_DURATION_OPTIONS_MS.includes(room.nennsBlitzSoloDurationMs) ? room.nennsBlitzSoloDurationMs : NENNSBLITZ_SOLO_DEFAULT_MS)
    : NENNSBLITZ_DUELL_MS;
  const perPlayer = new Map();
  room.players.forEach(p => { perPlayer.set(p.id, { answers: [] }); }); // {id, text}

  room.runtime = {
    kind: "nennsBlitz",
    label: ds.label,
    phase: "answering",
    perPlayer,
    answerCounter: 0,
    thumbs: new Map(),       // "playerId|answerId" -> Set(voterId) (Daumen runter)
    startedAt: Date.now(),
    durationMs,
    timer: null,
    roundPointsByTeam: new Map(teamIds.map(id => [id, 0]))
  };

  broadcast(room, { type: "nennsBlitzStart", label: ds.label, durationMs });
  room.runtime.timer = setTimeout(() => resolveNennsBlitzAnswering(room), durationMs + 400);
  scheduleNennsBlitzBots(room, durationMs);
}

// Lässt jeden Bot im Raum unabhängig voneinander über die gesamte Antwort-
// zeit hinweg ein paar Platzhalter-Antworten abgeben (schwierigkeitsabhängige
// Trefferquote/Tempo aus BOT_TIERS). Da die Validierung bewusst freitext-
// basiert ist (keine feste Lösungsliste), kennen Bots keine "echten"
// Kategorie-Begriffe, sie tragen trotzdem zum Tempo/Ablauf bei, zählen aber
// inhaltlich nicht als realistische Antworten.
function scheduleNennsBlitzBots(room, durationMs) {
  const rt = room.runtime;
  room.players.forEach(bot => {
    if (!bot.isBot) return;
    const tier = BOT_TIERS[bot.botTier] || BOT_TIERS[DEFAULT_BOT_TIER];
    const attempt = (n) => {
      const delay = randRange(500, Math.max(700, durationMs * 0.8));
      setTimeout(() => {
        if (!room.runtime || room.runtime !== rt || rt.phase !== "answering") return;
        if (Math.random() < tier.prob) {
          handleNennsBlitzSubmit(room, bot.id, `${room.language === "de" ? "Antwort" : "Answer"} ${bot.name} ${n}`);
        }
        if (n < 8) attempt(n + 1);
      }, delay);
    };
    attempt(1);
  });
}

function handleNennsBlitzSubmit(room, playerId, text) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "nennsBlitz" || rt.phase !== "answering") return;
  const st = rt.perPlayer.get(playerId);
  if (!st) return;
  const trimmed = cleanStr(text, 60);
  if (!trimmed) return;
  const norm = normalizeNennsBlitzText(trimmed);
  if (!norm) return;
  // Duplikat-Prüfung im eigenen Feld, dieselbe Antwort von einer anderen
  // Person zählt unabhängig davon ebenfalls (siehe Kommentar oben).
  if (st.answers.some(a => normalizeNennsBlitzText(a.text) === norm)) return;
  const id = "a" + (++rt.answerCounter);
  st.answers.push({ id, text: trimmed });
  const player = room.players.get(playerId);
  if (player && player.ws) send(player.ws, { type: "nennsBlitzOwnUpdate", answers: st.answers });
}

function resolveNennsBlitzAnswering(room) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "nennsBlitz" || rt.phase !== "answering") return;
  rt.phase = "challenge";
  clearTimeout(rt.timer);
  rt.readyPlayers = new Set();

  broadcast(room, {
    type: "nennsBlitzReveal",
    label: rt.label,
    players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, teamId: p.teamId, isBot: p.isBot })),
    answers: Object.fromEntries(Array.from(rt.perPlayer.entries()).map(([pid, st]) => [pid, st.answers]))
  });
  // Kein Zeitlimit mehr: jede·r meldet sich per "Fertig" bereit, der Host
  // sieht den Stand und löst per "continue" selbst die Auflösung aus.
  broadcastNennsBlitzThumbs(room);
}

function handleNennsBlitzChallengeReady(room, playerId) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "nennsBlitz" || rt.phase !== "challenge") return;
  if (!rt.readyPlayers) rt.readyPlayers = new Set();
  rt.readyPlayers.add(playerId);
  broadcastNennsBlitzThumbs(room);
}

// Daumen runter (statt Anfechten): JEDE menschliche Person - auch die, der
// die Antwort gehoert - kann bei jeder Antwort 👎 druecken (nochmal druecken
// nimmt es zurueck). Eine Antwort ist ungueltig, sobald mindestens die
// Haelfte (aufgerundet, min. 1) der menschlichen Spielenden 👎 gedrueckt
// hat. Bei 2 Personen (1 gegen 1) reicht also ein einziger Daumen - dadurch
// funktioniert es auch dort, wo das alte Anfechten mangels dritter
// stimmberechtigter Person haengen blieb.
function thumbsThreshold(room) {
  const humans = Array.from(room.players.values()).filter(p => !p.isBot).length;
  return Math.max(1, Math.ceil(humans / 2));
}

function handleNennsBlitzThumb(room, voterId, targetPlayerId, answerId) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "nennsBlitz" || rt.phase !== "challenge") return;
  const voter = room.players.get(voterId);
  if (!voter || voter.isBot) return;
  const st = rt.perPlayer.get(targetPlayerId);
  if (!st || !st.answers.some(a => a.id === answerId)) return;
  const key = targetPlayerId + "|" + answerId;
  const set = rt.thumbs.get(key) || new Set();
  if (set.has(voterId)) set.delete(voterId); else set.add(voterId);
  rt.thumbs.set(key, set);
  broadcastNennsBlitzThumbs(room);
}

function broadcastNennsBlitzThumbs(room) {
  const rt = room.runtime;
  const humanCount = Array.from(room.players.values()).filter(p => !p.isBot).length;
  const threshold = thumbsThreshold(room);
  broadcast(room, {
    type: "nennsBlitzThumbUpdate",
    thumbs: Array.from(rt.thumbs.entries()).filter(([, set]) => set.size > 0).map(([key, set]) => {
      const [playerId, answerId] = key.split("|");
      return { playerId, answerId, voters: Array.from(set), removed: set.size >= threshold };
    }),
    threshold,
    readyCount: rt.readyPlayers ? rt.readyPlayers.size : 0,
    readyTotal: humanCount
  });
}

function finalizeNennsBlitzRound(room) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "nennsBlitz" || rt.phase === "done") return;
  rt.phase = "done";
  clearTimeout(rt.timer);

  const invalidatedIds = new Set();
  const nbThreshold = thumbsThreshold(room);
  rt.thumbs.forEach((set, key) => { if (set.size >= nbThreshold) invalidatedIds.add(key); });

  const results = [];
  rt.perPlayer.forEach((st, pid) => {
    const player = room.players.get(pid);
    const validCount = st.answers.filter(a => !invalidatedIds.has(pid + "|" + a.id)).length;
    results.push({ playerId: pid, name: player ? player.name : "?", total: validCount });
    if (player && player.teamId) {
      // 1 Punkt pro gültiger Antwort, je Team aufsummiert, für Solo wie
      // Duell gleichermaßen (vom Nutzer bestätigt).
      rt.roundPointsByTeam.set(player.teamId, (rt.roundPointsByTeam.get(player.teamId) || 0) + validCount);
    }
  });
  results.sort((a, b) => b.total - a.total);

  broadcast(room, { type: "nennsBlitzFinal", label: rt.label, results });
  setTimeout(() => finishRoundEngine(room, rt.roundPointsByTeam), 2600);
}


/* Alle Spieler schreiben gleichzeitig zu einem zufälligen Buchstaben Wörter */
/* je Kategorie. Nach Ablauf der Zeit: Auflösung mit vorläufiger Wertung     */
/* (eindeutig=20, mehrfach=10, ungültig/leer=0), danach eine Anfechtungs-   */
/* /Abstimmungsphase, in der alle anderen Spieler über strittige Antworten  */
/* abstimmen können, bevor die Runde final gewertet wird.                   */
/* ------------------------------------------------------------------------ */
function slfBuildRoundDef(categories, mode) {
  // mode: null/undefined = Original (feste 7 Kategorien), "custom" = vom Host
  // gewählte eigene Kategorien, "party" = Party-Mix (10 zufällige Kategorien,
  // frisch gezogen bei jedem tatsächlichen Rundenstart, siehe
  // startStadtLandFlussRound()).
  if (mode === "party") {
    return {
      id: "slf_party",
      kind: "stadtLandFluss",
      label: "Scattergories: Party-Mix (10 zufällige Kategorien)",
      germanOnly: false,
      slfPartyMix: true,
      categories: null
    };
  }
  // Original: Kategorien bleiben null und werden erst beim Rundenstart passend
  // zur Raumsprache aufgeloest (Deutsch oder Englisch).
  const isCustom = mode === "custom";
  const cats = isCustom ? (categories && categories.length ? categories : SLF_DEFAULT_CATEGORIES).slice(0, 10) : null;
  return {
    id: mode === "custom" ? "slf_custom" : "slf_original",
    kind: "stadtLandFluss",
    label: "Scattergories: " + (mode === "custom" ? "Eigene Kategorien (" + cats.join(", ") + ")" : "Original"),
    germanOnly: false,
    categories: cats
  };
}

function normalizeSlfWord(s) {
  return (s || "").toString().trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function startStadtLandFlussRound(room, def) {
  // Party-Mix: Kategorien werden JETZT frisch zufällig gezogen (nicht schon
  // beim Zusammenstellen der Runde), damit jede Party-Mix-Runde neu mischt.
  const isDe = room.language === "de";
  const categories = def.slfPartyMix
    ? pickRandomSlfPartyCategories(SLF_PARTY_ROUND_SIZE, room.language)
    : (def.categories && def.categories.length ? def.categories : (isDe ? SLF_DEFAULT_CATEGORIES : SLF_DEFAULT_CATEGORIES_EN));
  const letter = SLF_LETTERS[Math.floor(Math.random() * SLF_LETTERS.length)];
  const teamIds = Array.from(room.teams.keys());
  room.runtime = {
    kind: "stadtLandFluss",
    label: def.label,
    categories,
    letter,
    phase: "answering",
    answers: new Map(),      // playerId -> { category: text }
    submitted: new Set(),
    hurryStarted: false,     // wird true, sobald jemand mit ALLEN Feldern ausgefüllt abgegeben hat
    thumbs: new Map(),       // "playerId|category" -> Set(voterId) (Daumen runter)
    timer: null,
    roundPointsByTeam: new Map(teamIds.map(id => [id, 0]))
  };
  broadcast(room, { type: "slfRoundStart", categories, letter, durationMs: SLF_ANSWER_MS });
  room.runtime.timer = setTimeout(() => slfFinishAnswering(room), SLF_ANSWER_MS + 400);
  scheduleBotSlfAnswers(room);
}

// Bots "tippen" mit realistischer, unterschiedlicher Verzögerung mit. Sie
// kennen nur für die 7 klassischen Original-Kategorien (SLF_BOT_WORDS)
// überhaupt mögliche Wörter; für alle anderen (z.B. Party-Mix-Kategorien)
// oder wenn ihnen für den gezogenen Buchstaben kein Wort bekannt ist, bzw.
// laut Bot-Stufe "danebengreifen", bleibt das Feld leer.
function scheduleBotSlfAnswers(room) {
  const rt = room.runtime;
  const letterUpper = rt.letter.toUpperCase();
  Array.from(room.players.values()).filter(p => p.isBot).forEach(bot => {
    const tier = BOT_TIERS[bot.botTier] || BOT_TIERS[DEFAULT_BOT_TIER];
    const delay = randRange(SLF_ANSWER_MS * 0.25, SLF_ANSWER_MS * 0.8);
    setTimeout(() => {
      if (room.runtime !== rt || rt.phase !== "answering") return;
      const answers = {};
      rt.categories.forEach(cat => {
        const word = ((room.language === "de" ? SLF_BOT_WORDS : SLF_BOT_WORDS_EN)[cat] || {})[letterUpper];
        answers[cat] = (word && Math.random() < (tier.prob || 0.7)) ? word : "";
      });
      handleSlfSubmit(room, bot.id, answers);
    }, delay);
  });
}

// Laufende Zwischenspeicherung des Eingabestands (nicht "Abgeben", das
// Feld bleibt editierbar und zählt NICHT zu rt.submitted). Grund: mobile
// Browser können JS-Timer drosseln/pausieren, wenn der Bildschirm ausgeht
// oder die App in den Hintergrund geht - der lokale Auto-Abgabe-Timer auf
// dem Client kann dadurch verspätet oder gar nicht feuern. Damit beim
// serverseitigen Timeout (slfFinishAnswering) trotzdem nicht alles leer
// gewertet wird, übernimmt der Server hier laufend den letzten bekannten
// Tippstand - unabhängig davon, ob eine explizite Abgabe je ankommt.
function handleSlfDraftUpdate(room, playerId, answers) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "stadtLandFluss" || rt.phase !== "answering") return;
  if (rt.submitted.has(playerId)) return; // schon final abgegeben, keine Überschreibung mehr
  const clean = {};
  rt.categories.forEach(cat => { clean[cat] = (answers && typeof answers[cat] === "string") ? cleanStr(answers[cat], 40) : ""; });
  rt.answers.set(playerId, clean);
}

function handleSlfSubmit(room, playerId, answers) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "stadtLandFluss" || rt.phase !== "answering") return;
  if (rt.submitted.has(playerId)) return;
  const clean = {};
  rt.categories.forEach(cat => { clean[cat] = (answers && typeof answers[cat] === "string") ? cleanStr(answers[cat], 40) : ""; });
  rt.answers.set(playerId, clean);
  rt.submitted.add(playerId);
  // Erfolg "als Erste/r mit allen Feldern fertig": wer zuerst mit ALLEN Feldern abgibt
  const filledAll = rt.categories.every(cat => clean[cat] && clean[cat].trim().length > 0);
  if (filledAll && !rt.firstFullId && !room.players.get(playerId).isBot) rt.firstFullId = playerId;

  const allSubmitted = Array.from(room.players.keys())
    .filter(pid => !room.players.get(pid).isBot)
    .every(pid => rt.submitted.has(pid));
  if (allSubmitted) { clearTimeout(rt.timer); slfFinishAnswering(room); return; }

  // Sobald jemand ALLE Felder ausgefüllt abgegeben hat, bekommen alle
  // anderen nur noch SLF_HURRY_MS Zeit (einmalig verkürzt, kein erneutes
  // Zurücksetzen bei weiteren vollständigen Abgaben danach).
  const allFieldsFilled = rt.categories.every(cat => clean[cat] && clean[cat].trim().length > 0);
  if (allFieldsFilled && !rt.hurryStarted) {
    rt.hurryStarted = true;
    clearTimeout(rt.timer);
    rt.timer = setTimeout(() => slfFinishAnswering(room), SLF_HURRY_MS + 400);
    broadcast(room, { type: "slfHurryUp", remainingMs: SLF_HURRY_MS });
  }
}

function slfIsValidLetter(word, letter) {
  const n = normalizeSlfWord(word);
  return n.length > 0 && n[0].toUpperCase() === letter.toUpperCase();
}

// Einfache Levenshtein-Distanz (Editierdistanz) für die Tippfehler-Erkennung
// in slfComputeScores() weiter unten.
function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// Berechnet die (vorläufige oder finale) Punkte je Spieler und Kategorie.
// Grundwertung, pro Kategorie unter allen gültigen (richtiger Anfangsbuchstabe,
// nicht per Anfechtung für ungültig erklärten) Antworten:
//  - gleiches Wort wie mind. 1 anderer Spieler:                     5 Punkte
//  - eigenes Wort einzigartig, aber mind. 1 anderer Spieler hat
//    ebenfalls eine gültige (andere) Antwort in dieser Kategorie:  10 Punkte
//  - als einzige/r überhaupt eine gültige Antwort in der Kategorie: 20 Punkte
//  - ungültig / leer / angefochten:                                  0 Punkte
// Zusätzlich: vermuteter Schreibfehler. Wenn zwei unterschiedliche, aber sich
// nur in einem Buchstaben unterscheidende Wörter (Editierdistanz 1) in
// derselben Kategorie auftauchen, ist das sehr wahrscheinlich dasselbe
// gemeinte Wort mit einem Tippfehler, dann ziehen wir beiden Beteiligten
// 5 Punkte von der jeweiligen Grundwertung ab (nie unter 0).
// `invalidPlayerCatPairs` enthält per Anfechtung für ungültig erklärte
// Antworten (Set aus "playerId|kategorie") und wird wie eine leere Antwort
// behandelt, dadurch wirkt sich eine erfolgreiche Anfechtung automatisch auf
// die Wertung der ÜBRIGEN Antworten in derselben Kategorie aus (z.B. wird aus
// "10 Punkte, da noch jemand anders gültig war" wieder "20 Punkte, da jetzt
// einzige gültige Antwort", sobald die Konkurrenz-Antwort wegfällt).
function slfComputeScores(rt, invalidPlayerCatPairs) {
  const scores = new Map(); // playerId -> {category: points}
  const playerIds = Array.from(rt.answers.keys());
  playerIds.forEach(pid => scores.set(pid, {}));

  rt.categories.forEach(cat => {
    const entries = []; // { pid, norm } nur gültige, nicht angefochtene Antworten
    playerIds.forEach(pid => {
      const word = rt.answers.get(pid)[cat];
      const invalidated = invalidPlayerCatPairs && invalidPlayerCatPairs.has(pid + "|" + cat);
      if (invalidated || !slfIsValidLetter(word, rt.letter)) return;
      entries.push({ pid, norm: normalizeSlfWord(word) });
    });

    const wordCount = new Map();
    entries.forEach(e => wordCount.set(e.norm, (wordCount.get(e.norm) || 0) + 1));
    const validCount = entries.length;

    // Tippfehler-Verdacht: zwei unterschiedliche Wörter mit Editierdistanz 1.
    const typoFlag = new Set();
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i].norm === entries[j].norm) continue;
        if (levenshteinDistance(entries[i].norm, entries[j].norm) === 1) {
          typoFlag.add(entries[i].pid);
          typoFlag.add(entries[j].pid);
        }
      }
    }

    playerIds.forEach(pid => {
      const word = rt.answers.get(pid)[cat];
      const invalidated = invalidPlayerCatPairs && invalidPlayerCatPairs.has(pid + "|" + cat);
      if (invalidated || !slfIsValidLetter(word, rt.letter)) { scores.get(pid)[cat] = 0; return; }
      const norm = normalizeSlfWord(word);
      let points;
      if (wordCount.get(norm) > 1) points = 5;
      else if (validCount > 1) points = 10;
      else points = 20;
      if (typoFlag.has(pid)) points = Math.max(0, points - 5);
      scores.get(pid)[cat] = points;
    });
  });
  return scores;
}

function slfFinishAnswering(room) {
  const rt = room.runtime;
  if (!rt || rt.phase !== "answering") return;
  rt.phase = "reveal";
  // Wer nicht abgegeben hat, bekommt eine leere Antwort je Kategorie
  room.players.forEach(p => {
    if (!rt.answers.has(p.id)) {
      const empty = {};
      rt.categories.forEach(cat => { empty[cat] = ""; });
      rt.answers.set(p.id, empty);
    }
  });
  const scores = slfComputeScores(rt, null);
  broadcast(room, {
    type: "slfReveal",
    categories: rt.categories,
    letter: rt.letter,
    answers: Object.fromEntries(rt.answers),
    players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, teamId: p.teamId })),
    scores: Object.fromEntries(scores),
    firstFullId: rt.firstFullId || null,
    humanCount: Array.from(room.players.values()).filter(p => !p.isBot).length
  });
  rt.phase = "challenge";
  // Kein Zeitlimit mehr: jede·r kann anfechten und sich per "Fertig" als
  // bereit melden; der Host sieht den Bereitschaftsstand und entscheidet
  // selbst per "continue", wann es weitergeht (nicht an alle gebunden).
  rt.readyPlayers = new Set();
  broadcastSlfThumbs(room);
}

function handleSlfChallengeReady(room, playerId) {
  const rt = room.runtime;
  if (!rt || rt.phase !== "challenge") return;
  if (!rt.readyPlayers) rt.readyPlayers = new Set();
  rt.readyPlayers.add(playerId);
  broadcastSlfThumbs(room);
}

function handleSlfThumb(room, voterId, targetPlayerId, category) {
  const rt = room.runtime;
  if (!rt || rt.phase !== "challenge") return;
  if (!rt.categories.includes(category)) return;
  const voter = room.players.get(voterId);
  if (!voter || voter.isBot) return;
  const targetAnswers = rt.answers.get(targetPlayerId);
  if (!targetAnswers || !targetAnswers[category]) return;
  const key = targetPlayerId + "|" + category;
  const set = rt.thumbs.get(key) || new Set();
  if (set.has(voterId)) set.delete(voterId); else set.add(voterId);
  rt.thumbs.set(key, set);
  broadcastSlfThumbs(room);
}

function broadcastSlfThumbs(room) {
  const rt = room.runtime;
  const humanCount = Array.from(room.players.values()).filter(p => !p.isBot).length;
  const threshold = thumbsThreshold(room);
  broadcast(room, {
    type: "slfThumbUpdate",
    thumbs: Array.from(rt.thumbs.entries()).filter(([, set]) => set.size > 0).map(([key, set]) => {
      const i = key.indexOf("|");
      return { playerId: key.slice(0, i), category: key.slice(i + 1), voters: Array.from(set), removed: set.size >= threshold };
    }),
    threshold,
    readyCount: rt.readyPlayers ? rt.readyPlayers.size : 0,
    readyTotal: humanCount
  });
}

function slfFinalizeRound(room) {
  const rt = room.runtime;
  if (!rt || rt.phase === "done") return;
  rt.phase = "done";
  const invalidPairs = new Set();
  const slfThreshold = thumbsThreshold(room);
  rt.thumbs.forEach((set, key) => { if (set.size >= slfThreshold) invalidPairs.add(key); });
  const finalScores = slfComputeScores(rt, invalidPairs);

  // Punkte je Spieler aufsummieren, dann auf dessen Team addieren
  finalScores.forEach((catScores, playerId) => {
    const player = room.players.get(playerId);
    if (!player || !player.teamId) return;
    const total = Object.values(catScores).reduce((a, b) => a + b, 0);
    rt.roundPointsByTeam.set(player.teamId, (rt.roundPointsByTeam.get(player.teamId) || 0) + total);
  });

  broadcast(room, {
    type: "slfFinalReveal",
    scores: Object.fromEntries(finalScores)
  });
  setTimeout(() => finishRoundEngine(room, rt.roundPointsByTeam), 2200);
}

/* ------------------------------------------------------------------------ */
/* Rundenabschluss (gemeinsam für alle Engines)                              */
/* ------------------------------------------------------------------------ */
function finishRoundEngine(room, roundPointsByTeam) {
  const maxPoints = Math.max(...Array.from(roundPointsByTeam.values()));
  const winnerTeamIds = Array.from(roundPointsByTeam.entries())
    .filter(([, pts]) => pts === maxPoints)
    .map(([id]) => id);

  const roundNumber = room.currentRoundIndex + 1;
  awardRoundPoints(room, roundNumber, winnerTeamIds);

  room.phase = "roundResult";
  broadcast(room, {
    type: "roundEnd",
    roundIndex: room.currentRoundIndex,
    roundNumber,
    totalRounds: room.roundCount,
    roundScores: Object.fromEntries(roundPointsByTeam),
    winnerTeamIds,
    totalScores: Object.fromEntries(Array.from(room.teams.values()).map(t => [t.id, t.score])),
    teams: Array.from(room.teams.values()).map(t => ({ id: t.id, name: t.name, score: t.score })),
    isLastRound: roundNumber >= room.roundCount
  });
}

// Tic Tac Toe als Party-Runde: team- statt einzelspielerbasiert, jedes der
// beiden Teams spielt gemeinsam eine Seite (X/O) - JEDES Teammitglied darf
// ziehen, wenn das eigene Team dran ist (kein festes "wer genau" innerhalb
// des Teams). Braucht bewusst GENAU 2 Teams (das Spiel selbst ist
// zwangsläufig 2-seitig) - bei einer anderen Teamanzahl (z.B. FFA mit mehr
// als 2 Personen, oder 2v2v2) wird die Runde übersprungen statt
// abzustürzen; ein Mehr-Team-Turniersystem dafür wäre ein eigenes, viel
// größeres Feature.
function startPartyTicTacToeRound(room, def) {
  const teamIds = Array.from(room.teams.keys());
  if (teamIds.length !== 2) {
    broadcast(room, { type: "ticTacToeSkipped", reason: "Tic Tac Toe braucht genau 2 Teams, diese Runde entfällt." });
    return finishRoundEngine(room, new Map(teamIds.map(id => [id, 0])));
  }
  const [teamA, teamB] = teamIds;
  const aGetsX = Math.random() < 0.5;
  room.runtime = {
    kind: "ticTacToeGame",
    board: Array(9).fill(null),
    teamSymbols: { [teamA]: aGetsX ? "X" : "O", [teamB]: aGetsX ? "O" : "X" },
    turnSymbol: "X",
    gameOver: false,
    winnerTeamId: null,
    variant: def.variant || "classic",
    xPieces: [], oPieces: [], moves: 0,
    duel: null
  };
  broadcastPartyTicTacToe(room);
}

function broadcastPartyTicTacToe(room) {
  const rt = room.runtime;
  broadcast(room, {
    type: "ticTacToeState",
    board: rt.board,
    turnSymbol: rt.turnSymbol,
    teamSymbols: rt.teamSymbols,
    gameOver: rt.gameOver,
    winnerTeamId: rt.winnerTeamId,
    variant: rt.variant,
    duelActive: !!rt.duel
  });
}

function handlePartyTicTacToeMove(room, playerId, index) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "ticTacToeGame" || rt.gameOver) return;
  const player = room.players.get(playerId);
  if (!player || !player.teamId) return;
  const mySymbol = rt.teamSymbols[player.teamId];
  if (!mySymbol || mySymbol !== rt.turnSymbol) return; // eigenes Team nicht am Zug
  if (typeof index !== "number" || index < 0 || index > 8 || rt.board[index]) return;
  if (rt.duel) return;
  if (rt.variant === "quizmix") { partyTttStartDuel(room, index, player.teamId); return; }
  if (rt.variant === "quantum") tttQuantumApplyMove(rt, mySymbol, index); else rt.board[index] = mySymbol;
  rt.moves++;
  partyTttAfterPlacement(room, rt.variant === "quantum" && rt.moves >= 24 ? "draw" : null);
}

// Nach jeder Platzierung/jedem Duell: Sieg pruefen oder Zug wechseln
function partyTttAfterPlacement(room, forcedDraw) {
  const rt = room.runtime;
  let winner = tttCheckWinner(rt.board); // dieselbe Funktion wie beim eigenstaendigen Tic-Tac-Toe-Modus
  if (!winner && forcedDraw) winner = "draw";
  if (winner) {
    rt.gameOver = true;
    if (winner !== "draw") {
      rt.winnerTeamId = Object.keys(rt.teamSymbols).find(tid => rt.teamSymbols[tid] === winner);
    }
    broadcastPartyTicTacToe(room);
    const teamIds = Object.keys(rt.teamSymbols);
    const points = new Map();
    if (winner === "draw") teamIds.forEach(tid => points.set(tid, 5));
    else teamIds.forEach(tid => points.set(tid, rt.teamSymbols[tid] === winner ? 10 : 0));
    setTimeout(() => finishRoundEngine(room, points), 1800);
  } else {
    rt.turnSymbol = rt.turnSymbol === "X" ? "O" : "X";
    broadcastPartyTicTacToe(room);
  }
}

/* ---- Party-Quiz-Mix: Feld waehlen -> Wissensduell zwischen den Teams ---- */
// Pro Team zaehlt die ERSTE Antwort eines beliebigen Teammitglieds.
const PARTY_TTT_DUEL_QUESTIONS = 3;
function partyTttStartDuel(room, cellIndex, startTeamId) {
  const rt = room.runtime;
  const teamIds = Object.keys(rt.teamSymbols);
  const questions = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, PARTY_TTT_DUEL_QUESTIONS).map(shuffleAnswerOrder);
  rt.duel = { cellIndex, questions, qIndex: 0, scores: Object.fromEntries(teamIds.map(t => [t, 0])), answered: {}, timer: null };
  broadcastPartyTicTacToe(room);
  partyTttSendDuelQuestion(room);
}
function partyTttSendDuelQuestion(room) {
  const rt = room.runtime; const duel = rt && rt.duel; if (!duel) return;
  duel.answered = {};
  const q = duel.questions[duel.qIndex];
  broadcast(room, { type: "ticTacToeDuelQuestion", cellIndex: duel.cellIndex, qIndex: duel.qIndex, qTotal: duel.questions.length, question: q.q, options: q.a, durationMs: TTT_DUEL_QUESTION_MS, teamSymbols: rt.teamSymbols });
  clearTimeout(duel.timer);
  duel.timer = setTimeout(() => partyTttResolveDuelQuestion(room), TTT_DUEL_QUESTION_MS + 400);
}
function partyTttDuelAnswer(room, playerId, selected) {
  const rt = room.runtime; const duel = rt && rt.duel; if (!duel) return;
  const player = room.players.get(playerId);
  if (!player || !player.teamId || !(player.teamId in duel.scores)) return;
  if (!Number.isInteger(selected) || selected < 0 || selected > 3) return;
  if (duel.answered[player.teamId] !== undefined) return;
  duel.answered[player.teamId] = selected;
  if (Object.keys(duel.scores).every(t => duel.answered[t] !== undefined)) partyTttResolveDuelQuestion(room);
}
function partyTttResolveDuelQuestion(room) {
  const rt = room.runtime; const duel = rt && rt.duel; if (!duel) return;
  clearTimeout(duel.timer);
  const q = duel.questions[duel.qIndex];
  const results = {};
  Object.keys(duel.scores).forEach(tid => {
    const sel = duel.answered[tid];
    const correct = sel === q.c;
    if (correct) duel.scores[tid]++;
    results[tid] = { selected: sel === undefined ? null : sel, correct };
  });
  broadcast(room, { type: "ticTacToeDuelReveal", correctIndex: q.c, correctAnswer: Array.isArray(q.a) ? q.a[q.c] : null, explanation: q.e || "", results, scores: duel.scores });
  duel.qIndex++;
  if (duel.qIndex >= duel.questions.length) setTimeout(() => partyTttFinishDuel(room), 2200);
  else setTimeout(() => partyTttSendDuelQuestion(room), 2200);
}
function partyTttFinishDuel(room) {
  const rt = room.runtime; const duel = rt && rt.duel; if (!duel || rt.kind !== "ticTacToeGame") return;
  const [a, b] = Object.keys(duel.scores);
  let winTeam = null;
  if (duel.scores[a] > duel.scores[b]) winTeam = a; else if (duel.scores[b] > duel.scores[a]) winTeam = b;
  if (winTeam) rt.board[duel.cellIndex] = rt.teamSymbols[winTeam];
  rt.duel = null;
  rt.moves++;
  const full = rt.board.every(c => c);
  // Wer das naechste Feld waehlen darf, wechselt immer (wie im Online-Modus)
  partyTttAfterPlacement(room, full ? "draw" : null);
}

/* ---- 4 gewinnt als Party-Runde (team-basiert, genau 2 Teams) ---- */
const FOURUPS_ROWS = 6, FOURUPS_COLS = 7, FOURUPS_TURN_MS = 25000;
function fourupsWinCells(b, r, c) {
  const p = b[r][c]; if (!p) return null;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [[r, c]];
    for (const sgn of [1, -1]) { let rr = r + dr * sgn, cc = c + dc * sgn; while (rr >= 0 && rr < FOURUPS_ROWS && cc >= 0 && cc < FOURUPS_COLS && b[rr][cc] === p) { cells.push([rr, cc]); rr += dr * sgn; cc += dc * sgn; } }
    if (cells.length >= 4) return cells;
  }
  return null;
}
/* ---- 4 gewinnt: Duell mit Freunden (eigene Raeume, wie Tic Tac Toe) ---- */
const fuRooms = new Map();
function fuMakeCode() { let c; do { c = randomRoomCode(); } while (fuRooms.has(c) || tttRooms.has(c)); return c; }
function fuBroadcast(room) {
  if (room.over && !room.zpDone && room.players.length === 2) {
    room.zpDone = true;
    const p1 = room.players.find(p => p.num === 1), p2 = room.players.find(p => p.num === 2), mv = room.board.reduce((n, row) => n + row.filter(v => v).length, 0);
    if (p1 && p2) { const res = zpDuel("fourups", { username: p1.ws && p1.ws.accountUsername }, { username: p2.ws && p2.ws.accountUsername }, room.winner === "draw" ? "draw" : (room.winner === 1 ? "a" : "b"), mv, 6); if (res) room.zpRes = { 1: res.a, 2: res.b }; }
  }
  const names = room.players.map(p => p.num === 1 ? p.name : null), n2 = room.players.find(p => p.num === 2);
  const n1 = room.players.find(p => p.num === 1);
  room.players.forEach(p => {
    if (!p.connected) return;
    send(p.ws, { type: "fuState", roomCode: room.code, you: p.num, board: room.board, turn: room.turn, over: room.over, winner: room.winner, winCells: room.winCells, last: room.last, zp: (room.zpRes && room.zpRes[p.num]) || null,
      names: [n1 ? n1.name : "", n2 ? n2.name : ""], scores: room.scores, full: room.players.length === 2 });
  });
}
function fuHandleDisconnect(ws) {
  const code = ws.fuRoomCode; if (!code) return;
  const room = fuRooms.get(code); ws.fuRoomCode = null; if (!room) return;
  const pl = room.players.find(p => p.ws === ws); if (pl) pl.connected = false;
  const other = room.players.find(p => p.ws !== ws && p.connected);
  if (other) send(other.ws, { type: "fuOpponentLeft" });
  if (room.players.every(p => !p.connected)) fuRooms.delete(code);
}
/* ---- Brain Royale (Raumcode-Duell + Zufallsgegner, Fragen je Spieler in eigener Sprache) ---- */
const BR = require("./lib/brainRoyale");
const BR_QUESTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/brQuestions.json"), "utf8"));
const BR_GRACE_MS = 60000; // so lange wird der Platz nach einem Verbindungsabbruch freigehalten (Neuladen/Handy-Sperre)
const brRooms = new Map();
let brQueue = []; // wartende Spieler { ws, name, lang }
function brAllowed(adminKey, ip) { return gateOk("brain_royale", adminKey, ip); }
function brMakeCode() { let c; do { c = randomRoomCode(); } while (brRooms.has(c) || fuRooms.has(c) || tttRooms.has(c)); return c; }
function brLang(v) { return v === "de" ? "de" : "en"; }
// Frage in BEIDEN Sprachen mit gleicher Antwortreihenfolge - jeder sieht sie in seiner Sprache
function brMakeQuestion() {
  if (Math.random() < 0.5 && BR_QUESTIONS.length) {
    const q = BR_QUESTIONS[crypto.randomInt(BR_QUESTIONS.length)];
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const pick = a => order.map(i => a[i]);
    return { kind: { de: "QUIZ", en: "QUIZ" }, text: { de: q.de.q, en: q.en.q }, opts: { de: pick(q.de.a), en: pick(q.en.a) }, correct: order.indexOf(0) };
  }
  const a = 3 + crypto.randomInt(17), b = 2 + crypto.randomInt(9), t = crypto.randomInt(3);
  const real = t === 0 ? a + b * 3 : t === 1 ? a * b : a + 20 - b;
  const text = t === 0 ? a + " + " + (b * 3) + " = ?" : t === 1 ? a + " × " + b + " = ?" : a + " + " + (20 - b) + " = ?";
  const set = new Set([real]);
  while (set.size < 4) { const d = (crypto.randomInt(7) - 3) || 4; set.add(Math.max(0, real + d)); }
  const opts = [...set].sort(() => Math.random() - 0.5).map(String);
  return { kind: { de: "KOPFRECHNEN", en: "MATH" }, text: { de: text, en: text }, opts: { de: opts, en: opts }, correct: opts.indexOf(String(real)) };
}
const BR_MIN_MOVES_FOR_CREDIT = 8;
function brCredit(room) {
  try {
    const st = room.st;
    room.credited = true;
    if (!st.winner || st.winner === "draw" || room.players.length !== 2 || st.moves < BR_MIN_MOVES_FOR_CREDIT) return;
    const win = room.players.find(p => p.side === st.winner), lose = room.players.find(p => p !== win);
    if (!win || !lose || !win.username || !lose.username || win.username.toLowerCase() === lose.username.toLowerCase()) return;
    const wu = findUserByName(win.username); if (!wu || isRestricted(wu)) return;
    const day = new Date().toISOString().slice(0, 10);
    const pk = "br|" + day + "|" + win.username.toLowerCase() + "|" + lose.username.toLowerCase();
    if ((dmPairDay.get(pk) || 0) >= DM_PAIR_CAP_PER_DAY) return;
    dmPairDay.set(pk, (dmPairDay.get(pk) || 0) + 1);
    wu.stats.dameWins = (wu.stats.dameWins || 0) + 1; // gemeinsamer Stein-Zaehler (Dame + Brain Royale)
    win.credited = true;
    saveUsers();
  } catch (e) { console.error("brCredit", e); }
}
function brBroadcast(room) {
  if (room.st.over && !room.credited) brCredit(room);
  const n = side => { const p = room.players.find(x => x.side === side); return p ? p.name : ""; };
  room.players.forEach(p => {
    if (!p.connected) return;
    const uu = p.username ? findUserByName(p.username) : null, w = uu ? (uu.stats.dameWins || 0) : null;
    send(p.ws, { type: "brState", roomCode: room.code, ...BR.view(room.st, p.side, [n(p.side), n(p.side === "a" ? "b" : "a")], room.players.length === 2, p.lang), credited: p.credited ? { wins: w } : null, dameWins: w });
  });
}
function brArmDuel(room) {
  clearTimeout(room.timer);
  const d = room.st.duel; if (!d || d.done) return;
  room.timer = setTimeout(() => { if (room.st.duel === d && BR.finishDuel(room.st, null)) brAfterFinish(room); }, BR.DUEL_MS + 300);
}
function brAfterFinish(room) {
  clearTimeout(room.timer);
  brBroadcast(room);
  room.timer = setTimeout(() => { BR.resolveDuel(room.st); brBroadcast(room); }, 1600);
}
function brQueueRemove(ws) { brQueue = brQueue.filter(q => q.ws !== ws); }
function brNewRoom(p1, p2) {
  const code = brMakeCode();
  const sides = Math.random() < 0.5 ? ["a", "b"] : ["b", "a"];
  const mk = (p, side) => ({ ws: p.ws, name: p.name, username: p.username || null, lang: p.lang, side, connected: true, key: crypto.randomBytes(8).toString("hex") });
  const room = { code, players: p2 ? [mk(p1, sides[0]), mk(p2, sides[1])] : [mk(p1, "a")], st: BR.create(), timer: null };
  brRooms.set(code, room);
  room.players.forEach(pl => { pl.ws.brRoomCode = code; send(pl.ws, { type: "brJoined", roomCode: code, key: pl.key }); });
  brBroadcast(room);
  return room;
}
function brHandleDisconnect(ws, leaveForGood) {
  brQueueRemove(ws);
  const code = ws.brRoomCode; if (!code) return;
  const room = brRooms.get(code); ws.brRoomCode = null; if (!room) return;
  const pl = room.players.find(p => p.ws === ws); if (!pl) return;
  pl.connected = false;
  const other = room.players.find(p => p !== pl && p.connected);
  if (other) send(other.ws, { type: "brOpponentLeft", graceSec: leaveForGood ? 0 : Math.round(BR_GRACE_MS / 1000) });
  clearTimeout(pl.graceTimer);
  if (room.players.every(p => !p.connected)) {
    if (leaveForGood) { clearTimeout(room.timer); brRooms.delete(code); return; }
    pl.graceTimer = setTimeout(() => { if (room.players.every(p => !p.connected)) { clearTimeout(room.timer); brRooms.delete(code); } }, BR_GRACE_MS);
    return;
  }
  if (leaveForGood) { forfeit(room, pl); return; }
  pl.graceTimer = setTimeout(() => { if (!pl.connected) forfeit(room, pl); }, BR_GRACE_MS);
}
// Spieler weg: wer noch da ist, gewinnt
function forfeit(room, gone) {
  if (!room.st.over && room.players.length === 2) { room.st.over = true; room.st.winner = gone.side === "a" ? "b" : "a"; room.st.why = "left"; room.st.duel = null; clearTimeout(room.timer); brBroadcast(room); }
}
/* ---- DAME (Deutsche Dame, serverautoritativ): Raumcode-Duell + Zufallsgegner. Meilensteine zaehlen NUR Siege gegen echte Spieler. ---- */
const Dame = require("./public/dame-engine.js");
const DM_GRACE_MS = 60000, DM_MOVE_MS = 120000, DM_QUIET_LIMIT = 40, DM_MIN_PLIES_FOR_CREDIT = 12, DM_PAIR_CAP_PER_DAY = 3;
const DAME_SKINS = [{ id: "wood", wins: 0 }, { id: "neon", wins: 3 }, { id: "glass", wins: 8 }, { id: "flat", wins: 15 }, { id: "metal", wins: 30 }, { id: "pulse", wins: 50 }];
const dmRooms = new Map();
let dmQueue = [];
const dmPairDay = new Map(); // "tag|a|b" -> gezaehlte Siege
function dameAllowed(adminKey, ip) { return gateOk("dame", adminKey, ip); }
function dmMakeCode() { let c; do { c = randomRoomCode(); } while (dmRooms.has(c) || brRooms.has(c) || fuRooms.has(c) || tttRooms.has(c)); return c; }
function dmFreshState() { return { board: Dame.initialBoard(), turn: "w", plies: 0, quiet: 0, over: false, winner: null, why: null, last: null }; }
function dmView(room, p) {
  const opp = room.players.find(x => x !== p);
  const wins = p.username && findUserByName(p.username) ? (findUserByName(p.username).stats.dameWins || 0) : null;
  return { type: "dmState", roomCode: room.code, you: p.color, board: room.st.board, turn: room.st.turn, over: room.st.over, winner: room.st.winner, why: room.st.why,
    plies: room.st.plies, last: room.st.last, names: [p.name, opp ? opp.name : ""], full: room.players.length === 2, remaining: room.deadline ? Math.max(0, room.deadline - Date.now()) : null,
    credited: p.credited ? { wins } : null, dameWins: wins, zp: (room.zpRes && room.zpRes[p.color]) || null };
}
function dmBroadcast(room) { room.players.forEach(p => { if (p.connected) send(p.ws, dmView(room, p)); }); }
function dmArm(room) {
  clearTimeout(room.timer); room.deadline = null;
  if (room.st.over || room.players.length < 2) return;
  room.deadline = Date.now() + DM_MOVE_MS;
  const turnAt = room.st.plies;
  room.timer = setTimeout(() => { if (!room.st.over && room.st.plies === turnAt) dmEnd(room, Dame.other(room.st.turn), "timeout"); }, DM_MOVE_MS + 200);
}
function dmEnd(room, winnerColor, why) {
  if (room.st.over) return;
  room.st.over = true; room.st.winner = winnerColor; room.st.why = why; clearTimeout(room.timer); room.deadline = null;
  dmCredit(room);
  dmBroadcast(room);
}
// Meilenstein: nur Sieg gegen einen ECHTEN Mitspieler (zwei verschiedene angemeldete Konten), nie gegen den Bot
function dmCredit(room) {
  try {
    const st = room.st;
    if (!room.zpDone && room.players.length === 2) {
      room.zpDone = true;
      const [d0, d1] = room.players, res = zpDuel("dame", d0, d1, st.winner === "draw" || !st.winner ? "draw" : (st.winner === d0.color ? "a" : "b"), st.plies || 0, DM_MIN_PLIES_FOR_CREDIT);
      if (res) room.zpRes = { [d0.color]: res.a, [d1.color]: res.b };
    }
    if (!st.winner || st.winner === "draw" || room.players.length !== 2 || st.plies < DM_MIN_PLIES_FOR_CREDIT) return;
    const win = room.players.find(p => p.color === st.winner), lose = room.players.find(p => p !== win);
    if (!win.username || !lose.username || win.username.toLowerCase() === lose.username.toLowerCase()) return;
    const wu = findUserByName(win.username); if (!wu || isRestricted(wu)) return;
    const day = new Date().toISOString().slice(0, 10);
    const pk = day + "|" + win.username.toLowerCase() + "|" + lose.username.toLowerCase();
    if ((dmPairDay.get(pk) || 0) >= DM_PAIR_CAP_PER_DAY) return;
    dmPairDay.set(pk, (dmPairDay.get(pk) || 0) + 1);
    wu.stats.dameWins = (wu.stats.dameWins || 0) + 1;
    win.credited = true;
    saveUsers();
  } catch (e) { console.error("dmCredit", e); }
}
function dmQueueRemove(ws) { dmQueue = dmQueue.filter(q => q.ws !== ws); }
function dmNewRoom(p1, p2) {
  const code = dmMakeCode();
  const colors = Math.random() < 0.5 ? ["w", "b"] : ["b", "w"];
  const mk = (p, color) => ({ ws: p.ws, name: p.name, username: p.username, color, connected: true, key: crypto.randomBytes(8).toString("hex") });
  const room = { code, players: p2 ? [mk(p1, colors[0]), mk(p2, colors[1])] : [mk(p1, "w")], st: dmFreshState(), timer: null, deadline: null };
  dmRooms.set(code, room);
  room.players.forEach(pl => { pl.ws.dmRoomCode = code; send(pl.ws, { type: "dmJoined", roomCode: code, key: pl.key }); });
  dmArm(room);
  dmBroadcast(room);
  return room;
}
function dmHandleDisconnect(ws, leaveForGood) {
  dmQueueRemove(ws);
  const code = ws.dmRoomCode; if (!code) return;
  const room = dmRooms.get(code); ws.dmRoomCode = null; if (!room) return;
  const pl = room.players.find(p => p.ws === ws); if (!pl) return;
  pl.connected = false;
  const other = room.players.find(p => p !== pl && p.connected);
  if (other) send(other.ws, { type: "dmOpponentLeft", graceSec: leaveForGood ? 0 : Math.round(DM_GRACE_MS / 1000) });
  clearTimeout(pl.graceTimer);
  if (room.players.every(p => !p.connected)) {
    if (leaveForGood) { clearTimeout(room.timer); dmRooms.delete(code); return; }
    pl.graceTimer = setTimeout(() => { if (room.players.every(p => !p.connected)) { clearTimeout(room.timer); dmRooms.delete(code); } }, DM_GRACE_MS);
    return;
  }
  if (leaveForGood) { if (!room.st.over && room.players.length === 2) dmEnd(room, other ? other.color : null, "left"); return; }
  pl.graceTimer = setTimeout(() => { if (!pl.connected && !room.st.over && room.players.length === 2) dmEnd(room, other ? other.color : null, "left"); }, DM_GRACE_MS);
}
/* ---- MUEHLE (Neun-Maenner-Muehle, serverautoritativ): Raumcode-Duell + Zufallsgegner. Nur Admin, solange "muehle" gesperrt ist. ---- */
const Mill = require("./public/muehle-engine.js");
const MU_GRACE_MS = 60000, MU_MOVE_MS = 120000, MU_QUIET_LIMIT = 50;
const muRooms = new Map();
let muQueue = [];
function muehleAllowed(adminKey, ip) { return gateOk("muehle", adminKey, ip); }
function muMakeCode() { let c; do { c = randomRoomCode(); } while (muRooms.has(c) || brRooms.has(c) || dmRooms.has(c) || fuRooms.has(c) || tttRooms.has(c)); return c; }
function muFreshState() { return { ...Mill.initial(), plies: 0, over: false, winner: null, why: null, last: null }; }
function muView(room, p) {
  const opp = room.players.find(x => x !== p), st = room.st;
  return { type: "muState", roomCode: room.code, you: p.color, b: st.b, hand: st.hand, turn: st.turn, over: st.over, winner: st.winner, why: st.why,
    plies: st.plies, last: st.last, names: [p.name, opp ? opp.name : ""], full: room.players.length === 2, remaining: room.deadline ? Math.max(0, room.deadline - Date.now()) : null };
}
function muBroadcast(room) { room.players.forEach(p => { if (p.connected) send(p.ws, muView(room, p)); }); }
function muArm(room) {
  clearTimeout(room.timer); room.deadline = null;
  if (room.st.over || room.players.length < 2) return;
  room.deadline = Date.now() + MU_MOVE_MS;
  const turnAt = room.st.plies;
  room.timer = setTimeout(() => { if (!room.st.over && room.st.plies === turnAt) muEnd(room, Mill.other(room.st.turn), "timeout"); }, MU_MOVE_MS + 200);
}
function muEnd(room, winnerColor, why) {
  if (room.st.over) return;
  room.st.over = true; room.st.winner = winnerColor; room.st.why = why; clearTimeout(room.timer); room.deadline = null;
  muBroadcast(room);
}
function muQueueRemove(ws) { muQueue = muQueue.filter(q => q.ws !== ws); }
function muNewRoom(p1, p2) {
  const code = muMakeCode();
  const colors = Math.random() < 0.5 ? ["w", "b"] : ["b", "w"];
  const mk = (p, color) => ({ ws: p.ws, name: p.name, color, connected: true, key: crypto.randomBytes(8).toString("hex") });
  const room = { code, players: p2 ? [mk(p1, colors[0]), mk(p2, colors[1])] : [mk(p1, "w")], st: muFreshState(), timer: null, deadline: null };
  muRooms.set(code, room);
  room.players.forEach(pl => { pl.ws.muRoomCode = code; send(pl.ws, { type: "muJoined", roomCode: code, key: pl.key }); });
  muArm(room);
  muBroadcast(room);
  return room;
}
function muHandleDisconnect(ws, leaveForGood) {
  muQueueRemove(ws);
  const code = ws.muRoomCode; if (!code) return;
  const room = muRooms.get(code); ws.muRoomCode = null; if (!room) return;
  const pl = room.players.find(p => p.ws === ws); if (!pl) return;
  pl.connected = false;
  const other = room.players.find(p => p !== pl && p.connected);
  if (other) send(other.ws, { type: "muOpponentLeft", graceSec: leaveForGood ? 0 : Math.round(MU_GRACE_MS / 1000) });
  clearTimeout(pl.graceTimer);
  if (room.players.every(p => !p.connected)) {
    if (leaveForGood) { clearTimeout(room.timer); muRooms.delete(code); return; }
    pl.graceTimer = setTimeout(() => { if (room.players.every(p => !p.connected)) { clearTimeout(room.timer); muRooms.delete(code); } }, MU_GRACE_MS);
    return;
  }
  if (leaveForGood) { if (!room.st.over && room.players.length === 2) muEnd(room, other ? other.color : null, "left"); return; }
  pl.graceTimer = setTimeout(() => { if (!pl.connected && !room.st.over && room.players.length === 2) muEnd(room, other ? other.color : null, "left"); }, MU_GRACE_MS);
}
function fuFreshBoard() { return Array.from({ length: FOURUPS_ROWS }, () => Array(FOURUPS_COLS).fill(0)); }
function startPartyFourupsRound(room, def) {
  const teamIds = Array.from(room.teams.keys());
  if (teamIds.length !== 2) {
    broadcast(room, { type: "ticTacToeSkipped", reason: "4 gewinnt braucht genau 2 Teams, diese Runde entfällt." });
    return finishRoundEngine(room, new Map(teamIds.map(id => [id, 0])));
  }
  const [a, b] = teamIds; const aFirst = Math.random() < 0.5;
  room.runtime = { kind: "fourupsGame", board: Array.from({ length: FOURUPS_ROWS }, () => Array(FOURUPS_COLS).fill(0)),
    teamNums: { [a]: aFirst ? 1 : 2, [b]: aFirst ? 2 : 1 }, turn: 1, gameOver: false, winnerTeamId: null, winCells: null, last: null, timer: null };
  broadcastPartyFourups(room);
  partyFourupsArmTimer(room);
}
function broadcastPartyFourups(room) {
  const rt = room.runtime;
  broadcast(room, { type: "fourupsState", board: rt.board, turn: rt.turn, teamNums: rt.teamNums, gameOver: rt.gameOver, winnerTeamId: rt.winnerTeamId, winCells: rt.winCells, last: rt.last, turnMs: FOURUPS_TURN_MS });
}
function partyFourupsArmTimer(room) {
  const rt = room.runtime; if (!rt || rt.kind !== "fourupsGame") return;
  clearTimeout(rt.timer);
  if (rt.gameOver) return;
  const turnAtArm = rt.turn, movesAtArm = rt.moveCount || 0;
  rt.timer = setTimeout(() => { // Zeitueberschreitung: zufaellige freie Spalte
    if (!room.runtime || room.runtime !== rt || rt.gameOver || (rt.moveCount || 0) !== movesAtArm) return;
    const free = [0, 1, 2, 3, 4, 5, 6].filter(c => !rt.board[0][c]);
    if (free.length) partyFourupsPlace(room, free[Math.floor(Math.random() * free.length)], turnAtArm);
  }, FOURUPS_TURN_MS + 300);
}
function partyFourupsPlace(room, col, num) {
  const rt = room.runtime;
  let row = -1; for (let r = FOURUPS_ROWS - 1; r >= 0; r--) if (!rt.board[r][col]) { row = r; break; }
  if (row < 0) return false;
  rt.board[row][col] = num; rt.last = [row, col]; rt.moveCount = (rt.moveCount || 0) + 1;
  const win = fourupsWinCells(rt.board, row, col);
  const full = rt.board[0].every(v => v);
  if (win || full) {
    rt.gameOver = true; clearTimeout(rt.timer);
    if (win) { rt.winCells = win; rt.winnerTeamId = Object.keys(rt.teamNums).find(t => rt.teamNums[t] === num); }
    broadcastPartyFourups(room);
    const points = new Map();
    Object.keys(rt.teamNums).forEach(t => points.set(t, win ? (rt.teamNums[t] === num ? 10 : 0) : 5));
    setTimeout(() => finishRoundEngine(room, points), 2200);
  } else {
    rt.turn = 3 - rt.turn; broadcastPartyFourups(room); partyFourupsArmTimer(room);
  }
  return true;
}
function handlePartyFourupsMove(room, playerId, col) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "fourupsGame" || rt.gameOver) return;
  const player = room.players.get(playerId);
  if (!player || !player.teamId) return;
  if (rt.teamNums[player.teamId] !== rt.turn) return;
  if (!Number.isInteger(col) || col < 0 || col >= FOURUPS_COLS) return;
  partyFourupsPlace(room, col, rt.turn);
}

/* ------------------------------------------------------------------------ */
/* TABOO (Party-Runde): 2 Teams, je 60 s. Erklaerer sieht Begriff + 5 verbotene Woerter, */
/* Rater tippen, Gegner-Aufpasser druecken TABU. Richtig +1, Tabu -1.        */
/* ------------------------------------------------------------------------ */
/* TABOO_CARDS: siehe oben (frueh geladen, wird von buildRoundDefPool gebraucht) */
const TABOO_TURN_MS = 90000, TABOO_SKIPS = 3, TABOO_BREAK_MS = 5000;
const tabooCfgOf = room => { const c = room.tabooCfg || {}; return { ms: Math.max(30000, Math.min(300000, Number(c.ms) || TABOO_TURN_MS)), voice: c.voice === true }; };
const tabooNorm = s => String(s || "").toLowerCase().replace(/ß/g, "ss").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/[^a-z0-9]/g, "");
function tabooHumans(room, teamId) { return Array.from(room.players.values()).filter(p => p.teamId === teamId && !p.isBot && p.connected && p.ws); }
function startPartyTabooRound(room, def) {
  const teamIds = Array.from(room.teams.keys());
  const humansOk = teamIds.length === 2 && teamIds.every(t => tabooHumans(room, t).length > 0);
  if (!humansOk) {
    broadcast(room, { type: "ticTacToeSkipped", reason: "Taboo braucht genau 2 Teams mit je mindestens einem echten Spieler, diese Runde entfällt." });
    return finishRoundEngine(room, new Map(teamIds.map(id => [id, 0])));
  }
  const deck = TABOO_CARDS.map((_, i) => i).sort(() => Math.random() - 0.5);
  const order = teamIds.slice().sort(() => Math.random() - 0.5);
  room.runtime = { kind: "tabooGame", teams: order, turn: -1, deck, di: 0, scores: { [order[0]]: 0, [order[1]]: 0 }, phase: "intro", timer: null, ms: tabooCfgOf(room).ms, voice: tabooCfgOf(room).voice, rot: { [order[0]]: 0, [order[1]]: 0 }, log: [], feed: [] };
  tabooBroadcast(room);
  const rt = room.runtime;
  rt.timer = setTimeout(() => tabooNextTurn(room, rt), 4000);
}
/* Wettbewerb: jeder erklaert einmal, alle anderen raten gleichzeitig. Schneller = mehr Punkte (10 .. 3), Erklaerer bekommt die Haelfte, Tabu = -3 fuer den Erklaerer. */
const TABOO_FFA_MS = Number(process.env.TABOO_FFA_MS) || 90000;
function startPartyTabooFfaRound(room, def) {
  const hs = Array.from(room.players.values()).filter(p => !p.isBot && p.connected && p.ws);
  if (hs.length < 2) {
    broadcast(room, { type: "ticTacToeSkipped", reason: "Taboo Wettbewerb braucht mindestens 2 echte Spieler, diese Runde entfällt." });
    return finishRoundEngine(room, new Map(Array.from(room.teams.keys()).map(id => [id, 0])));
  }
  const deck = TABOO_CARDS.map((_, i) => i).sort(() => Math.random() - 0.5);
  const order = hs.map(p => p.id).sort(() => Math.random() - 0.5);
  const pts = {}; order.forEach(id => { pts[id] = 0; });
  room.runtime = { kind: "tabooGame", ffa: true, ms: tabooCfgOf(room).ms, voice: tabooCfgOf(room).voice, order, turn: -1, deck, di: 0, pts, scores: {}, teams: [], phase: "intro", timer: null, log: [], feed: [] };
  tabooBroadcast(room);
  const rt = room.runtime;
  rt.timer = setTimeout(() => tabooNextTurn(room, rt), 4000);
}
function tabooFfaNextTurn(room, rt) {
  rt.turn++;
  while (rt.turn < rt.order.length) { const d = room.players.get(rt.order[rt.turn]); if (d && d.connected && d.ws) break; rt.turn++; }
  if (rt.turn >= rt.order.length) {
    rt.phase = "result"; clearTimeout(rt.timer); tabooBroadcast(room);
    rt.timer = setTimeout(() => {
      if (room.runtime !== rt) return;
      const byTeam = new Map(Array.from(room.teams.keys()).map(id => [id, 0]));
      room.players.forEach(p => { if (rt.pts[p.id] != null && byTeam.has(p.teamId)) byTeam.set(p.teamId, byTeam.get(p.teamId) + Math.max(0, rt.pts[p.id])); });
      finishRoundEngine(room, byTeam);
    }, 7000);
    return;
  }
  rt.describerId = rt.order[rt.turn]; rt.watcherId = rt.order.length >= 3 && !rt.voice ? rt.order[(rt.turn + 1) % rt.order.length] : null;
  rt.phase = "turn"; rt.skips = TABOO_SKIPS; rt.card = tabooDrawCard(rt); rt.cardAt = Date.now(); rt.endsAt = Date.now() + rt.ms; rt.feed = []; rt.found = []; rt.bad = []; rt.skipped = [];
  clearTimeout(rt.timer);
  tabooBroadcast(room);
  rt.timer = setTimeout(() => tabooEndTurn(room, rt), rt.ms + 200);
}
function tabooDrawCard(rt) { const c = TABOO_CARDS[rt.deck[rt.di % rt.deck.length]]; rt.di++; return c; }
function tabooNextTurn(room, rt) {
  if (room.runtime !== rt) return;
  if (rt.ffa) return tabooFfaNextTurn(room, rt);
  rt.turn++;
  if (rt.turn >= 2) {
    rt.phase = "result"; clearTimeout(rt.timer); tabooBroadcast(room);
    rt.timer = setTimeout(() => {
      if (room.runtime !== rt) return;
      finishRoundEngine(room, new Map(Object.entries(rt.scores)));
    }, 6000);
    return;
  }
  const tid = rt.teams[rt.turn], hs = tabooHumans(room, tid);
  if (!hs.length) return tabooNextTurn(room, rt);
  rt.describerId = hs[rt.rot[tid] % hs.length].id; rt.rot[tid]++;
  rt.phase = "turn"; rt.skips = TABOO_SKIPS; rt.card = tabooDrawCard(rt); rt.endsAt = Date.now() + rt.ms; rt.feed = []; rt.found = []; rt.bad = []; rt.skipped = [];
  clearTimeout(rt.timer);
  tabooBroadcast(room);
  rt.timer = setTimeout(() => tabooEndTurn(room, rt), rt.ms + 200);
}
function tabooEndTurn(room, rt) {
  if (room.runtime !== rt || rt.phase !== "turn") return;
  rt.phase = "break"; rt.log.push({ team: rt.teams[rt.turn], describer: rt.ffa ? (room.players.get(rt.describerId) || {}).name : undefined, found: rt.found, bad: rt.bad, skipped: rt.skipped });
  clearTimeout(rt.timer); tabooBroadcast(room);
  rt.timer = setTimeout(() => tabooNextTurn(room, rt), TABOO_BREAK_MS);
}
function tabooRoleOf(room, rt, p) {
  if (rt.phase !== "turn") return "spectator";
  const dp = room.players.get(rt.describerId), tid = rt.teams[rt.turn];
  if (p.id === rt.describerId) return "describer";
  if (rt.voice) return "guesser";   // Nur erklaeren: alle anderen raten laut und haben keine Knoepfe, der Erklaerer bedient alles
  if (rt.ffa) return rt.pts[p.id] == null ? "spectator" : (p.id === rt.watcherId ? "watcher" : "guesser");   // Wettbewerb: ein Waechter (naechster Erklaerer) sieht die Karte + TABU, alle anderen raten ohne Hilfswoerter
  const mates = Array.from(room.players.values()).filter(x => x.teamId === tid && x.id !== rt.describerId && !x.isBot && x.connected);
  if (p.teamId === tid) return "guesser";
  return mates.length ? "watcher" : "guesserWatcher";   // Gegner: aufpassen (und raten, wenn der Erklaerer allein im Team ist)
}
function tabooBroadcast(room) {
  const rt = room.runtime; if (!rt || rt.kind !== "tabooGame") return;
  const names = {}; room.teams.forEach(t => { names[t.id] = t.name; });
  const board = rt.ffa ? Object.keys(rt.pts).map(id => ({ id, name: (room.players.get(id) || {}).name || "?", pts: rt.pts[id] })).sort((a, b) => b.pts - a.pts) : null;
  const base = { type: "tabooState", ffa: !!rt.ffa, voice: !!rt.voice, ci: rt.di, secs: Math.round((rt.ms || TABOO_TURN_MS) / 1000), board, nTurns: rt.ffa ? rt.order.length : 2, phase: rt.phase, turn: rt.turn, teams: rt.teams, teamNames: names, scores: rt.scores, turnTeam: rt.teams[rt.turn] || null, describerId: rt.describerId || null,
    describerName: rt.describerId && room.players.get(rt.describerId) ? room.players.get(rt.describerId).name : "", nextName: rt.ffa && rt.order[rt.turn + 1] && room.players.get(rt.order[rt.turn + 1]) ? room.players.get(rt.order[rt.turn + 1]).name : "", remainingMs: rt.phase === "turn" ? Math.max(0, rt.endsAt - Date.now()) : 0, skips: rt.skips || 0, cardAgeMs: rt.ffa && rt.phase === "turn" && rt.cardAt ? Math.max(0, Date.now() - rt.cardAt) : 0,
    feed: rt.feed.slice(-6), found: rt.found || [], bad: rt.bad || [], skipped: rt.skipped || [], log: rt.phase === "result" || rt.phase === "break" ? rt.log : null };
  room.players.forEach(p => {
    if (!p.ws) return;
    const role = tabooRoleOf(room, rt, p), m = Object.assign({ role, you: p.id, yourTeam: p.teamId }, base);
    if (rt.phase === "turn" && rt.card) {
      if (role === "describer" || role === "watcher") m.card = rt.card;                       // sieht Begriff + verbotene Woerter
      else if (role === "guesserWatcher") m.card = { w: "?".repeat(rt.card.w.length), t: [] }; // Rater sehen nie die verbotenen Woerter (das waeren Hinweise)
      if (role === "guesser" || role === "guesserWatcher") m.wordLen = rt.card.w.length;
    }
    send(p.ws, m);
  });
}
function handleTabooGuess(room, playerId, text) {
  const rt = room.runtime; if (!rt || rt.kind !== "tabooGame" || rt.phase !== "turn") return;
  const p = room.players.get(playerId); if (!p) return;
  if (rt.voice) return;
  const role = tabooRoleOf(room, rt, p); if (role !== "guesser" && role !== "guesserWatcher") return;
  text = String(text || "").slice(0, 40); if (!tabooNorm(text)) return;
  if (p.lastGuessAt && Date.now() - p.lastGuessAt < 250) return; p.lastGuessAt = Date.now();
  const ok = tabooNorm(text) === tabooNorm(rt.card.w), tid = rt.teams[rt.turn];
  if (rt.ffa) {
    if (!ok) { rt.feed.push({ name: p.name, text, ok: false }); return tabooBroadcast(room); }
    const gp = Math.max(3, 10 - Math.floor((Date.now() - rt.cardAt) / 3000));
    rt.pts[p.id] += gp; rt.pts[rt.describerId] += Math.ceil(gp / 2);
    rt.feed.push({ name: p.name, text: rt.card.w + " +" + gp, ok: true });
    rt.found.push(rt.card.w); rt.card = tabooDrawCard(rt); rt.cardAt = Date.now();
    return tabooBroadcast(room);
  }
  rt.feed.push({ name: p.name, text, ok });
  if (ok) { rt.scores[tid]++; rt.found.push(rt.card.w); rt.card = tabooDrawCard(rt); }
  tabooBroadcast(room);
}
function handleTabooTabu(room, playerId) {
  const rt = room.runtime; if (!rt || rt.kind !== "tabooGame" || rt.phase !== "turn") return;
  const p = room.players.get(playerId); if (!p) return;
  const role = tabooRoleOf(room, rt, p); if (!(rt.voice && role === "describer") && role !== "watcher" && role !== "guesserWatcher") return;
  if (rt.lastTabuAt && Date.now() - rt.lastTabuAt < 800) return; rt.lastTabuAt = Date.now();
  if (rt.ffa) { rt.pts[rt.describerId] -= 3; rt.bad.push(rt.card.w); rt.feed.push({ name: p.name, text: "TABU! −3", tabu: true }); rt.card = tabooDrawCard(rt); rt.cardAt = Date.now(); return tabooBroadcast(room); }
  const tid = rt.teams[rt.turn]; rt.scores[tid]--; rt.bad.push(rt.card.w); rt.feed.push({ name: p.name, text: "TABU!", tabu: true }); rt.card = tabooDrawCard(rt);
  tabooBroadcast(room);
}
function handleTabooOk(room, playerId, by, ci) {   // Nur-erklaeren-Modus: Erklaerer ODER ein Rater bestaetigt, dass das Wort laut erraten wurde
  const rt = room.runtime; if (!rt || rt.kind !== "tabooGame" || rt.phase !== "turn" || !rt.voice) return;
  const p = room.players.get(playerId); if (!p) return;
  if (playerId !== rt.describerId) return;
  const role = "describer";
  if (ci != null && Number(ci) !== rt.di) return;   // Karte hat schon gewechselt (zweiter Klick) -> ignorieren
  if (rt.lastOkAt && Date.now() - rt.lastOkAt < 600) return; rt.lastOkAt = Date.now();
  const d = room.players.get(rt.describerId);
  if (rt.ffa) {
    const gid = role === "describer" ? by : playerId;
    if (!gid || gid === rt.describerId || rt.pts[gid] == null) return;
    const gp = Math.max(3, 10 - Math.floor((Date.now() - rt.cardAt) / 3000)), g = room.players.get(gid);
    rt.pts[gid] += gp; rt.pts[rt.describerId] += Math.ceil(gp / 2);
    rt.feed.push({ name: g ? g.name : "?", text: rt.card.w + " +" + gp, ok: true });
    rt.found.push(rt.card.w); rt.card = tabooDrawCard(rt); rt.cardAt = Date.now();
    return tabooBroadcast(room);
  }
  const tid = rt.teams[rt.turn]; rt.scores[tid]++; rt.feed.push({ name: p.name, text: rt.card.w + " ✔", ok: true });
  rt.found.push(rt.card.w); rt.card = tabooDrawCard(rt); tabooBroadcast(room);
}
function handleTabooSkip(room, playerId) {
  const rt = room.runtime; if (!rt || rt.kind !== "tabooGame" || rt.phase !== "turn" || playerId !== rt.describerId || rt.skips <= 0) return;
  rt.skips--; rt.skipped.push(rt.card.w); rt.card = tabooDrawCard(rt); rt.cardAt = Date.now();
  tabooBroadcast(room);
}


/* ---- Taboo Solo: Wort in 5 Versuchen erraten (Wordle-Farben). Wort bleibt auf dem Server. ---- */
const TABOO_SOLO_CARDS = (() => {
  for (const pth of ["shared/tabooSoloDE.json", "tabooSoloDE.json", "public/tabooSoloDE.json"]) {
    try { const j = JSON.parse(fs.readFileSync(path.join(__dirname, pth), "utf8")); const l = (Array.isArray(j) ? j : []).filter(c => c && typeof c.w === "string" && /^[A-Za-zÄÖÜäöü]{4,10}$/.test(c.w.replace(/[^A-Za-zÄÖÜäöü]/g, "")) && Array.isArray(c.h) && c.h.length === 5); if (l.length) { console.log("Taboo Solo: " + l.length + " Wörter aus " + pth); return l; } } catch (e) {}
  }
  console.error("Taboo Solo: tabooSoloDE.json nicht gefunden - Ersatz aus den Taboo-Karten (Datei nach shared/tabooSoloDE.json hochladen).");
  return TABOO_CARDS.filter(c => /^[A-Za-zÄÖÜäöü]{4,8}$/.test(c.w) && Array.isArray(c.t) && c.t.length >= 5).map(c => ({ w: c.w, c: "Allgemein", h: c.t.slice(0, 5).map(x => ({ k: "w", t: x })) }));
})();
const TABOO_SOLO_PTS = [100, 80, 60, 40, 20], TABOO_HINT_COST = 5, tabooSolo = new Map();
function tabooSoloView(g, extra) { const c = TABOO_SOLO_CARDS[g.idx]; return Object.assign({ ok: true, len: g.word.length, tries: g.rows.length, max: 5, rows: g.rows, cat: c.c, hints: c.h.slice(0, g.hn).map(h => ({ k: h.k, t: h.t })), hintsLeft: 5 - g.hn, hintCost: TABOO_HINT_COST, done: !!g.done }, extra || {}); }
function tabooSoloPts(g) { return TABOO_SOLO_PTS[g.rows.length - 1]; }  // Hinweise kosten Muenzen, keine Punkte
function tabooSoloApi(p, lang) {
  const sid = String(p.sid || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40); if (!sid) return { ok: false };
  if (!TABOO_SOLO_CARDS.length) return { ok: false };
  if (p.action === "start") {
    let idx = Math.floor(Math.random() * TABOO_SOLO_CARDS.length);
    const prev = tabooSolo.get(sid); if (prev && prev.idx === idx) idx = (idx + 1) % TABOO_SOLO_CARDS.length;
    if (process.env.TABOO_TEST_WORD) { const f = TABOO_SOLO_CARDS.findIndex(c => c.w === process.env.TABOO_TEST_WORD); if (f >= 0) idx = f; }  // nur fuer Tests
    const g = { idx, word: TABOO_SOLO_CARDS[idx].w.replace(/[^A-Za-zÄÖÜäöü]/g, "").toUpperCase(), rows: [], hn: 0, done: false, t: Date.now() };
    tabooSolo.set(sid, g);
    if (tabooSolo.size > 4000) Array.from(tabooSolo.keys()).slice(0, 1000).forEach(k => tabooSolo.delete(k));
    return tabooSoloView(g, { pts: TABOO_SOLO_PTS });
  }
  const g = tabooSolo.get(sid); if (!g) return { ok: false, expired: true };
  if (p.action === "state") return tabooSoloView(g, { pts: TABOO_SOLO_PTS });
  if (p.action === "hint") {
    if (g.done || g.hn >= 5) return tabooSoloView(g, { pts: TABOO_SOLO_PTS });
    const hu = p.token ? findUserByToken(p.token) : null;  // mit Konto: 5 Muenzen je Hinweis, ohne Konto kostenlos (es gibt dort keine Punkte)
    if (hu) {
      if ((hu.stats.coins || 0) < TABOO_HINT_COST) return tabooSoloView(g, { pts: TABOO_SOLO_PTS, noCoins: true, coins: hu.stats.coins || 0 });
      hu.stats.coins -= TABOO_HINT_COST; coinSrc = "taboo-hinweis"; saveUsers().catch(() => {});
    }
    g.hn++;
    return tabooSoloView(g, { pts: TABOO_SOLO_PTS, coins: hu ? hu.stats.coins : undefined });
  }
  if (p.action !== "guess" || g.done) return tabooSoloView(g);
  const guess = String(p.text || "").toUpperCase().replace(/[^A-ZÄÖÜ]/g, "");
  if (guess.length !== g.word.length) return Object.assign(tabooSoloView(g), { ok: true, rejected: "length" });
  const res = Array(guess.length).fill("k"), left = {};
  for (let i = 0; i < guess.length; i++) { if (guess[i] === g.word[i]) res[i] = "g"; else left[g.word[i]] = (left[g.word[i]] || 0) + 1; }
  for (let i = 0; i < guess.length; i++) if (res[i] !== "g" && left[guess[i]] > 0) { res[i] = "y"; left[guess[i]]--; }
  g.rows.push({ w: guess, s: res.join("") });
  let extra = {};
  if (guess === g.word) {
    g.done = true; extra.won = true; extra.word = TABOO_SOLO_CARDS[g.idx].w.toUpperCase();
    const user = p.token ? findUserByToken(p.token) : null, pts = tabooSoloPts(g);
    extra.zpPossible = pts;
    if (user && Date.now() - g.t > 2500) { const r = zpAdd(user, pts, "taboo", "taboo"); extra.zp = r.gain; extra.zpTotal = r.total; }
  } else if (g.rows.length >= 5) { g.done = true; extra.won = false; extra.word = TABOO_SOLO_CARDS[g.idx].w.toUpperCase(); }
  return tabooSoloView(g, extra);
}

/* ------------------------------------------------------------------------ */
/* Rundensteuerung                                                           */
/* ------------------------------------------------------------------------ */
function startNextRound(room) {
  room.currentRoundIndex++;
  if (room.currentRoundIndex >= room.roundDefs.length) {
    return endGame(room);
  }
  const def = room.roundDefs[room.currentRoundIndex];
  statHit("party_" + def.id);
  room.phase = "playing";
  broadcast(room, {
    type: "roundStart",
    roundIndex: room.currentRoundIndex,
    roundNumber: room.currentRoundIndex + 1,
    totalRounds: room.roundCount,
    kind: def.kind,
    label: def.label
  });

  setTimeout(() => {
    if (def.kind === "knowledgeQuiz") startQuizRound(room);
    else if (def.kind === "arenaQuiz") startArenaQuizRound(room, def);
    else if (def.kind === "guessPicture") startGuessPictureRound(room, def);
    else if (def.kind === "guessMusic") startGuessMusicRound(room, def);
    else if (def.kind === "stadtLandFluss") startStadtLandFlussRound(room, def);
    else if (def.kind === "orderingGame") startOrderingSimultaneousRound(room, def);
    else if (def.kind === "nennsBlitz") startNennsBlitzRound(room, def);
    else if (def.kind === "ticTacToeGame") startPartyTicTacToeRound(room, def);
    else if (def.kind === "fourupsGame") startPartyFourupsRound(room, def);
    else if (def.kind === "tabooGame") (def.variant === "ffa" ? startPartyTabooFfaRound : startPartyTabooRound)(room, def);
    else startRankingRound(room, def);
  }, 1800);
}

function endGame(room) {
  room.phase = "gameEnd";
  const ranking = Array.from(room.teams.values()).sort((a, b) => b.score - a.score);
  broadcast(room, {
    type: "gameEnd",
    ranking: ranking.map(t => ({ id: t.id, name: t.name, score: t.score }))
  });
}

/* ------------------------------------------------------------------------ */
/* Benutzerkonten (Benutzername + Passwort, serverseitig gespeichert)        */
/* ------------------------------------------------------------------------ */
// Passwörter werden NIE im Klartext gespeichert, sondern mit scrypt (Node-
// Bordmittel, sicher, kein externes Paket) + zufälligem Salt pro Nutzer
// gehasht.
//
// Speicherung: Falls die Umgebungsvariablen UPSTASH_REDIS_REST_URL und
// UPSTASH_REDIS_REST_TOKEN gesetzt sind (z.B. bei Render als Environment
// Variable hinterlegt), wird die komplette Nutzerliste dort als ein JSON-
// Blob unter einem festen Schlüssel gespeichert - das übersteht Neustarts/
// Deployments auch bei Hosting-Anbietern mit "ephemeral" (nicht dauerhaftem)
// Dateisystem wie Render's kostenlosem Web-Service-Tier. Ohne diese beiden
// Variablen (z.B. beim lokalen Testen) wird wie bisher auf eine einfache
// JSON-Datei zurückgegriffen - das reicht für lokales Ausprobieren, aber
// NICHT für dauerhaftes Hosting auf einer Plattform mit ephemeral disk.
// USERS_FILE (Umgebungsvariable) ist fuer Tests: sie duerfen nie echte Daten anfassen
const USERS_FILE = process.env.USERS_FILE || path.join(__dirname, "data", "users.json");
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_UPSTASH = !!(UPSTASH_URL && UPSTASH_TOKEN);
// Schutz: Haengt Upstash (kein Fehler, nur keine Antwort), darf das den Server
// nie blockieren. Alle Upstash-Aufrufe bekommen ein Zeitlimit.
if (USE_UPSTASH && typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
  const _origFetch = globalThis.fetch;
  globalThis.fetch = (u, o) => {
    o = o || {};
    if (!o.signal && String(u).startsWith(UPSTASH_URL)) o = Object.assign({}, o, { signal: AbortSignal.timeout(10000) });
    return _origFetch(u, o);
  };
}
const UPSTASH_USERS_KEY = "brainpulse_users";

let users = [];
// Schutz vor Datenverlust: Solange die Kontenliste NICHT sicher geladen wurde,
// wird NIEMALS gespeichert. Sonst wuerde ein Ladefehler (Netz, Limit, kaputte
// Datei) zu users = [] fuehren und die naechste Speicherung die komplette
// Datenbank ueberschreiben.
let usersLoaded = false;
let loadingPromise = null;

async function loadUsersOnce() {
  if (USE_UPSTASH) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/${UPSTASH_USERS_KEY}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || typeof data !== "object" || !("result" in data)) throw new Error("Unerwartete Antwort: " + JSON.stringify(data).slice(0, 80));
      const parsed = data.result ? JSON.parse(data.result) : []; // null = noch nie gespeichert
      if (!Array.isArray(parsed)) throw new Error("Kontenliste ist kein Array");
      users = parsed;
      usersLoaded = true;
      console.log(`Nutzerdaten aus Upstash geladen (${users.length} Konten).`);
      return true;
    } catch (e) {
      console.error("Konnte Nutzerdaten NICHT aus Upstash laden (Speichern bleibt gesperrt, bis es klappt):", e.message);
      return false;
    }
  }
  // Lokale Datei (+ Sicherungskopie)
  const tryRead = (file) => {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Kontenliste ist kein Array");
    return parsed;
  };
  try {
    users = tryRead(USERS_FILE); usersLoaded = true; return true;
  } catch (e) {
    if (e.code === "ENOENT") {
      // Wenn es noch eine Sicherung gibt, aber die Hauptdatei fehlt: Sicherung nehmen
      try { users = tryRead(USERS_FILE + ".bak"); usersLoaded = true; console.error("users.json fehlt - Sicherung (.bak) geladen."); return true; }
      catch (e2) { users = []; usersLoaded = true; return true; } // wirklich noch nie gespeichert
    }
    console.error("users.json ist nicht lesbar:", e.message);
    try { fs.copyFileSync(USERS_FILE, USERS_FILE + ".corrupt-" + Date.now()); } catch (e3) { /* ignore */ }
    try { users = tryRead(USERS_FILE + ".bak"); usersLoaded = true; console.error("Sicherung (.bak) geladen."); return true; }
    catch (e4) { console.error("Auch keine brauchbare Sicherung - Speichern bleibt gesperrt."); return false; }
  }
}
// Mehrere gleichzeitige Aufrufe teilen sich EINEN Ladeversuch.
function loadUsers() {
  if (!loadingPromise) loadingPromise = loadUsersOnce().finally(() => { loadingPromise = null; });
  return loadingPromise;
}
async function ensureUsersLoaded() {
  if (usersLoaded) return true;
  return await loadUsers();
}
// Server-Fehlermeldungen zweisprachig (de/en) - der Client schickt bei
// jedem Aufruf sein aktuelles "lang" mit (siehe apiCall() im Client bzw.
// das "language"-Feld bei WS-Nachrichten), Server faellt bei fehlendem/
// unbekanntem Wert auf Deutsch zurueck (bisheriges Verhalten unveraendert).
const ERR_TEXT = {
  invalidInput: { de: "Ungültige Eingabe.", en: "Invalid input." },
  usernameLength: { de: "Benutzername muss 3-20 Zeichen haben (Buchstaben, Zahlen, _).", en: "Username must be 3-20 characters (letters, numbers, _)." },
  passwordLength: { de: "Passwort muss mindestens 6 Zeichen haben.", en: "Password must be at least 6 characters." },
  loginNameTaken: { de: "Dieser Anmeldename ist bereits vergeben.", en: "This login name is already taken." },
  loginNameSame: { de: "Der Anmeldename muss sich vom Spielnamen unterscheiden.", en: "The login name must be different from your game name." },
  usernameTaken: { de: "Dieser Benutzername ist bereits vergeben.", en: "This username is already taken." },
  tooManyAccounts: { de: "Von diesem Anschluss wurden zu viele Konten angelegt. Bitte in ", en: "Too many accounts have been created from this connection. Please try again in " },
  loginFailed: { de: "Benutzername oder Passwort ist falsch.", en: "Username or password is incorrect." },
  tooManyAttempts: { de: "Zu viele Fehlversuche. Bitte in ", en: "Too many failed attempts. Please try again in " },
  notLoggedIn: { de: "Nicht angemeldet.", en: "Not logged in." },
  userNotFound: { de: "Diesen Benutzernamen gibt es nicht.", en: "This username doesn't exist." },
  cantAddSelf: { de: "Du kannst dich nicht selbst hinzufügen.", en: "You can't add yourself." },
  alreadyFriends: { de: "Ihr seid bereits befreundet.", en: "You're already friends." },
  requestAlreadySent: { de: "Anfrage wurde bereits gesendet.", en: "Request has already been sent." },
  noOpenRequest: { de: "Keine offene Anfrage von dieser Person.", en: "No open request from this person." },
  notFriendsAnymore: { de: "Ihr seid nicht (mehr) befreundet.", en: "You're not (or no longer) friends." },
  emptyMessage: { de: "Leere Nachricht.", en: "Empty message." },
  notEnoughCoins: { de: "Nicht genug Münzen.", en: "Not enough coins." },
  heartsAlreadyFull: { de: "Bereits volle Herzen.", en: "Hearts are already full." },
  shopNotConfigured: { de: "Der Münzen-Kauf ist noch nicht eingerichtet.", en: "Coin purchases aren't set up yet." },
  unknownPackage: { de: "Unbekanntes Paket.", en: "Unknown package." },
  stripeFailed: { de: "Verbindung zu Stripe fehlgeschlagen.", en: "Connection to Stripe failed." },
  incompleteMetadata: { de: "Unvollständige Metadaten.", en: "Incomplete metadata." },
  userNotFoundShort: { de: "Nutzer nicht gefunden.", en: "User not found." },
  noHeartsLeft: { de: "Keine Herzen mehr übrig. Morgen gibt's wieder welche!", en: "No hearts left. More tomorrow!" },
  noActiveMatch: { de: "Kein laufendes Match (oder es wurde schon ausgewertet).", en: "No active match (or it has already been scored)." },
  matchTooFast: { de: "Das Match wurde unrealistisch schnell beendet.", en: "The match finished unrealistically fast." },
  streamerNoRequests: { de: "Dieser Spieler nimmt gerade keine Freundschaftsanfragen an.", en: "This player is not accepting friend requests right now." },
  inviteNotFriend: { de: "Das ist keiner deiner Freunde.", en: "That is not one of your friends." },
  inviteOffline: { de: "Dein Freund ist gerade nicht online.", en: "Your friend is not online right now." },
  inviteRoomGone: { de: "Dieser Raum ist nicht mehr offen.", en: "This room is no longer open." },
  inviteTooOften: { de: "Bitte kurz warten, bevor du erneut einlädst.", en: "Please wait a moment before inviting again." },
  tooManyRequests: { de: "Zu viele Anfragen. Bitte kurz warten.", en: "Too many requests. Please wait a moment." },
  unknownEndpoint: { de: "Unbekannter Endpunkt.", en: "Unknown endpoint." },
  internalErrorRetry: { de: "Interner Fehler. Bitte nochmal versuchen.", en: "Internal error. Please try again." },
  internalError: { de: "Interner Fehler.", en: "Internal error." },
  serviceDown: { de: "Der Kontodienst ist gerade nicht erreichbar. Bitte gleich nochmal versuchen.", en: "The account service isn't reachable right now. Please try again shortly." },
  serverBusy: { de: "Der Server ist gerade ausgelastet. Bitte gleich nochmal versuchen.", en: "The server is currently busy. Please try again shortly." },
  connectionFailed: { de: "Verbindung zum Server fehlgeschlagen.", en: "Connection to the server failed." },
  stripeDeclined: { de: "Stripe hat den Kauf abgelehnt.", en: "Stripe declined the purchase." }
};
function et(key, lang) { const e = ERR_TEXT[key]; if (!e) return key; return (lang === "en" ? e.en : e.de) || e.de; }
function errObj(key, lang, extra) { return { ok: false, error: et(key, lang) + (extra || "") }; }

function serviceDownMsg(lang) { return { ok: false, unavailable: true, error: et("serviceDown", lang) }; }
function busyMsg(lang) { return { ok: false, error: et("serverBusy", lang) }; }
const SERVICE_DOWN = { ok: false, unavailable: true, error: "Der Kontodienst ist gerade nicht erreichbar. Bitte gleich nochmal versuchen." };

// Gibt true zurueck, wenn wirklich gespeichert wurde.
// Muenz-Verlauf: bei jedem Speichern wird der Kontostand mit dem zuletzt gesehenen verglichen.
// Jede Aenderung landet (mit der gerade laufenden Anfrage als Quelle) im Verlauf des Kontos.
let coinSrc = "";
function coinLedgerScan() {
  const now = Date.now();
  for (const u of users) {
    const c = u && u.stats && u.stats.coins;
    if (typeof c !== "number" || !Number.isFinite(c)) continue;
    if (typeof u.coinSnap !== "number") { u.coinSnap = c; continue; }
    if (c === u.coinSnap) continue;
    if (!Array.isArray(u.coinLog)) u.coinLog = [];
    u.coinLog.push({ t: now, d: c - u.coinSnap, b: c, s: coinSrc || "?" });
    u.coinSnap = c;
    if (u.coinLog.length > 300) { // je Richtung die letzten 100 behalten (Platz sparen)
      const inc = u.coinLog.filter(e => e.d > 0).slice(-100), out = u.coinLog.filter(e => e.d <= 0).slice(-100);
      u.coinLog = inc.concat(out).sort((a, b) => a.t - b.t);
    }
  }
}
async function saveUsers() {
  try { coinLedgerScan(); } catch (e) { console.error("Muenz-Verlauf:", e.message); }
  if (!usersLoaded) { console.error("Speichern verweigert: Kontenliste wurde nicht sicher geladen."); return false; }
  if (USE_UPSTASH) {
    try {
      const res = await fetch(`${UPSTASH_URL}/set/${UPSTASH_USERS_KEY}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "text/plain" },
        body: JSON.stringify(users)
      });
      if (!res.ok) { console.error("Upstash-Speichern fehlgeschlagen, Status:", res.status); return false; }
      return true;
    } catch (e) {
      console.error("Konnte Nutzerdaten nicht in Upstash speichern:", e.message);
      return false;
    }
  }
  try {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    // Atomar: erst in Temp-Datei, alte Fassung als .bak sichern, dann umbenennen.
    const tmp = USERS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(users, null, 1), "utf8");
    try { fs.copyFileSync(USERS_FILE, USERS_FILE + ".bak"); } catch (e) { /* noch keine alte Datei */ }
    fs.renameSync(tmp, USERS_FILE);
    return true;
  } catch (e) {
    console.error("Konnte Nutzerdaten nicht speichern:", e.message);
    return false;
  }
}

// ASYNCHRON (scryptSync blockierte den ganzen Server ~40 ms pro Aufruf, also
// auch alle laufenden Spiele). Zusaetzlich Obergrenze fuer gleichzeitige Hashes.
let hashInFlight = 0;
const MAX_HASH_IN_FLIGHT = 12;
function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => err ? reject(err) : resolve(key.toString("hex")));
  });
}
const BUSY = { ok: false, error: "Der Server ist gerade ausgelastet. Bitte gleich nochmal versuchen." };
const DUMMY_SALT = "0".repeat(32);
// Anmeldename (privat) - getrennt vom Spielnamen (oeffentlich, user.username). Aeltere Konten
// ohne eigenen Anmeldenamen melden sich weiter mit dem Spielnamen an, bis sie einen setzen.
function findUserByLogin(name) {
  const norm = (typeof name === "string" ? name : "").trim().toLowerCase();
  if (!norm) return undefined;
  return users.find(u => (u.loginName || u.username).toLowerCase() === norm);
}
function findUserByName(username) {
  const norm = (typeof username === "string" ? username : "").trim().toLowerCase();
  return users.find(u => u.username.toLowerCase() === norm);
}
// Sitzungs-Token laufen nach 30 Tagen OHNE Nutzung ab (jede Nutzung am Tag
// darauf erneuert sie), pro Konto gibt es hoechstens 5 gleichzeitige Token.
const TOKEN_MAX_AGE_MS = 30 * 24 * 3600 * 1000;
const TOKEN_REFRESH_AFTER_MS = 24 * 3600 * 1000;
const TOKEN_MAX_PER_USER = 5;
function findSession(token) {
  if (!token || typeof token !== "string") return null;
  const now = Date.now();
  for (const u of users) {
    const entry = (u.tokens || []).find(t => t.token === token);
    if (entry) { if (isBanned(u)) return null; return (now - (entry.createdAt || 0) <= TOKEN_MAX_AGE_MS) ? { user: u, entry } : null; }
  }
  return null;
}
// Bann (dauerhaft) oder Timeout (bis bannedUntil): Sitzungen sind ungueltig, Anmelden geht nicht.
function isBanned(u) { return !!(u && (u.banned === true || (u.bannedUntil && u.bannedUntil > Date.now()))); }
function isMuted(u) { return !!(u && u.mutedUntil && u.mutedUntil > Date.now()); }
function banText(u, lang) {
  if (u.banned) return lang === "en" ? "Your account is banned." + (u.banReason ? " Reason: " + u.banReason : "") : "Dein Konto ist gesperrt." + (u.banReason ? " Grund: " + u.banReason : "");
  const min = Math.max(1, Math.ceil((u.bannedUntil - Date.now()) / 60000));
  return lang === "en" ? "You are in timeout for " + min + " more minutes." : "Du bist noch " + min + " Minuten im Timeout.";
}
function findUserByToken(token) {
  const s = findSession(token);
  return s ? s.user : null;
}
function pruneTokens(user) {
  const now = Date.now();
  user.tokens = (user.tokens || []).filter(t => now - (t.createdAt || 0) <= TOKEN_MAX_AGE_MS)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).slice(-TOKEN_MAX_PER_USER);
}
function defaultStats() {
  return { score: 0, tier: 0, klasse: 0, consecutiveFails: 0, roundsPlayed: 0, wins: 0, losses: 0, correctAnswers: 0, wrongAnswers: 0, bestScore: 0,
    arenaLeague: 0, arenaPoints: 0, arenaHearts: ARENA_DAILY_HEARTS, arenaHeartsDate: null, arenaMatchesPlayed: 0, tttRank: 0, tttWinsAtRank: 0,
    haupttestUnlockedForKlasse: -1,
    braintestScores: {}, braintestGate: null, braintestDaily: null, braintestPrestige: 0, braintestExtraAttemptUsed: false,
    avatar: "🙂",
    speedMathLevel: 1, speedMathHearts: 3, speedMathHeartsDate: null,
    biologyBest: {}, biologyPerfect: {}, oosLast: null, oosBest: null,
    coins: 0,
    fruit: null,
    brain: null,
    achv: Achv.newState(),
    modeStats: freshModeStats() };
}
const MODE_STAT_KEYS = ["ordering", "chronology", "higherlower", "music", "picture", "speedmath", "orderofspeed", "biology", "slf", "ttt", "quantum"];
function freshModeStats() {
  const s = {};
  MODE_STAT_KEYS.forEach(k => { s[k] = { played: 0, correct: 0 }; });
  return s;
}
function publicProfile(user) {
  // Interne Anticheat-Daten gehoeren nicht zum Client

  return { username: user.username, avatar: user.avatar || null, ...user.stats, streamerMode: !!user.streamerMode, feedOptIn: !!user.feedOptIn, hasLoginName: !!user.loginName, totpOn: !!user.totpOn, canTest: !!userRole(user), role: userRole(user), betaPhase: user.betaPhase | 0, socialClaimed: Object.keys(user.social || {}), socialHandles: user.socialHandles || {}, cheatFlags: undefined, lastCheat: undefined, restricted: undefined, chess: undefined, fourups: undefined, daily: undefined, clientCoinsDay: undefined };
}

function checkLoginName(loginName, gameName, selfUser, lang) {
  if (typeof loginName !== "string") return errObj("invalidInput", lang);
  const ln = loginName.trim();
  if (ln.length < 3 || ln.length > 20 || !/^[a-zA-Z0-9_äöüÄÖÜß]+$/.test(ln)) return errObj("usernameLength", lang);
  if (typeof gameName === "string" && ln.toLowerCase() === gameName.trim().toLowerCase()) return errObj("loginNameSame", lang);
  const other = findUserByLogin(ln);
  if (other && other !== selfUser) return errObj("loginNameTaken", lang);
  return null;
}
// Bestehendes Konto: privaten Anmeldenamen setzen/aendern (Passwort noetig). Danach klappt die Anmeldung
// NUR noch damit - der Spielname bleibt oeffentlich und ist kein Login mehr.
async function setLoginName(token, password, loginName, lang) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const u = findUserByToken(token);
  if (!u) return errObj("notLoggedIn", lang);
  if (typeof password !== "string" || password.length > 200) return errObj("loginFailed", lang);
  const kUser = "ln|" + u.username.toLowerCase();
  if (rlWait(kUser)) return errObj("tooManyAttempts", lang, "", "");
  const lnErr = checkLoginName(loginName, u.username, u, lang);
  if (lnErr) return lnErr;
  if (hashInFlight >= MAX_HASH_IN_FLIGHT) return busyMsg(lang);
  hashInFlight++;
  let h; try { h = await hashPassword(password, u.salt); } finally { hashInFlight--; }
  const a = Buffer.from(h, "hex"), b = Buffer.from(u.passwordHash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { rlHit(kUser, 5, 10 * 60 * 1000, 10 * 60 * 1000); return errObj("loginFailed", lang); }
  if (findUserByLogin(loginName) && findUserByLogin(loginName) !== u) return errObj("loginNameTaken", lang);
  u.loginName = loginName.trim();
  await saveUsers();
  return { ok: true, hasLoginName: true };
}
// Passwort pruefen (mit Sperre nach Fehlversuchen). Gibt null zurueck wenn ok, sonst ein Fehlerobjekt.
async function verifyOwnPassword(u, password, tag, lang) {
  if (typeof password !== "string" || !password || password.length > 200) return errObj("loginFailed", lang);
  const k = tag + "|" + u.username.toLowerCase();
  if (rlWait(k)) return errObj("tooManyAttempts", lang, "", "");
  if (hashInFlight >= MAX_HASH_IN_FLIGHT) return busyMsg(lang);
  hashInFlight++;
  let h; try { h = await hashPassword(password, u.salt); } finally { hashInFlight--; }
  const x = Buffer.from(h, "hex"), y = Buffer.from(u.passwordHash, "hex");
  if (x.length !== y.length || !crypto.timingSafeEqual(x, y)) { rlHit(k, 5, 10 * 60 * 1000, 10 * 60 * 1000); return errObj("loginFailed", lang); }
  return null;
}
async function changePassword(token, oldPw, newPw, lang) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const sess = findSession(token);
  if (!sess) return errObj("notLoggedIn", lang);
  const u = sess.user;
  if (typeof newPw !== "string" || newPw.length < 6 || newPw.length > 200) return errObj("passwordLength", lang);
  const bad = await verifyOwnPassword(u, oldPw, "cpw", lang);
  if (bad) return bad;
  const salt = crypto.randomBytes(16).toString("hex");
  hashInFlight++;
  let hash; try { hash = await hashPassword(newPw, salt); } finally { hashInFlight--; }
  u.salt = salt; u.passwordHash = hash;
  u.tokens = (u.tokens || []).filter(t => t.token === token); // andere Geraete abmelden
  await saveUsers();
  return { ok: true };
}
const NAME_CHANGE_COOLDOWN_MS = 7 * 24 * 3600 * 1000;
async function changeUsername(token, password, newName, lang) {
  const en = lang === "en";
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const sess = findSession(token);
  if (!sess) return errObj("notLoggedIn", lang);
  const u = sess.user;
  if (typeof newName !== "string") return errObj("invalidInput", lang);
  newName = newName.trim();
  if (newName.length < 3 || newName.length > 20 || !/^[a-zA-Z0-9_äöüÄÖÜß]+$/.test(newName)) return errObj("usernameLength", lang);
  const other = findUserByName(newName);
  if (other && other !== u) return errObj("usernameTaken", lang);
  if (newName === u.username) return { ok: false, error: en ? "That is already your name." : "Das ist schon dein Name." };
  const left = (u.nameChangedAt || 0) + NAME_CHANGE_COOLDOWN_MS - Date.now();
  if (left > 0) { const d = Math.ceil(left / 86400000); return { ok: false, error: en ? "You can change your name again in " + d + " day(s)." : "Du kannst deinen Namen in " + d + " Tag(en) wieder ändern." }; }
  if (u.loginName && newName.toLowerCase() === u.loginName.toLowerCase()) return errObj("loginNameSame", lang);
  const bad = await verifyOwnPassword(u, password, "cun", lang);
  if (bad) return bad;
  if (!(await ensureConversationsLoaded())) return serviceDownMsg(lang);
  if (findUserByName(newName) && findUserByName(newName) !== u) return errObj("usernameTaken", lang);
  const old = u.username, oldL = old.toLowerCase();
  const mapList = arr => Array.isArray(arr) ? arr.map(n => (typeof n === "string" && n.toLowerCase() === oldL) ? newName : n) : arr;
  for (const x of users) { x.friends = mapList(x.friends); x.incomingRequests = mapList(x.incomingRequests); x.outgoingRequests = mapList(x.outgoingRequests); if (Array.isArray(x.blocked)) x.blocked = mapList(x.blocked); }
  u.username = newName; u.nameChangedAt = Date.now();
  // Chat-Verlaeufe: Schluessel "a|b" und Absender umbenennen
  for (const key of Object.keys(conversations)) {
    if (key === PUB_KEY) { conversations[key].forEach(m => { if (m.u && m.u.toLowerCase() === oldL) m.u = newName; }); continue; }
    const parts = key.split("|");
    if (!parts.includes(oldL)) continue;
    const list = conversations[key]; delete conversations[key];
    list.forEach(m => { if (m.from && m.from.toLowerCase() === oldL) m.from = newName; });
    conversations[conversationKey(parts.map(n => n === oldL ? newName : n)[0], parts.map(n => n === oldL ? newName : n)[1])] = list;
  }
  // Online-Verbindungen umhaengen
  const set = onlineAccounts.get(oldL);
  if (set) { onlineAccounts.delete(oldL); onlineAccounts.set(newName.toLowerCase(), set); set.forEach(ws => { ws.accountUsername = newName.toLowerCase(); }); }
  const ok1 = await saveUsers(); await saveConversations();
  if (!ok1) return serviceDownMsg(lang);
  return { ok: true, username: newName };
}
const SIGNUP_BONUS = 500;
async function registerUser(username, password, ip, lang, loginName) {
  if (typeof username !== "string" || typeof password !== "string") {
    return errObj("invalidInput", lang);
  }
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  username = username.trim();
  if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_äöüÄÖÜß]+$/.test(username)) {
    return errObj("usernameLength", lang);
  }
  if (!password || password.length < 6 || password.length > 200) {
    return errObj("passwordLength", lang);
  }
  if (findUserByName(username)) {
    return errObj("usernameTaken", lang);
  }
  if (loginName !== undefined && loginName !== null && loginName !== "") {
    const lnErr = checkLoginName(loginName, username, null, lang);
    if (lnErr) return lnErr;
    loginName = loginName.trim();
  } else loginName = null; // Abwaertskompatibel (alte Clients/Tests): Spielname = Anmeldename
  const regWait = rlWait("r|" + ip);
  if (regWait) return { ...errObj("tooManyAccounts", lang, waitText(regWait, lang) + (lang === "en" ? "." : " erneut versuchen.")), retryAfterSec: regWait };
  if (hashInFlight >= MAX_HASH_IN_FLIGHT) return busyMsg(lang);
  rlHit("r|" + ip, REGISTER_MAX_PER_IP, 3600000, 3600000);
  const salt = crypto.randomBytes(16).toString("hex");
  hashInFlight++;
  let passwordHash;
  try { passwordHash = await hashPassword(password, salt); } finally { hashInFlight--; }
  if (findUserByName(username)) return errObj("usernameTaken", lang); // waehrend des Hashens vergeben
  if (loginName && findUserByLogin(loginName)) return errObj("loginNameTaken", lang);
  const token = crypto.randomBytes(24).toString("hex");
  const user = {
    username, salt, passwordHash,
    ...(loginName ? { loginName } : {}),
    avatar: null,
    stats: defaultStats(),
    tokens: [{ token, createdAt: Date.now() }],
    createdAt: Date.now(),
    friends: [], incomingRequests: [], outgoingRequests: []
  };
  { const bm = await loadBetaMeta(); if (bm.phase > 0) user.betaPhase = bm.phase; }
  // Anmeldebonus: einmalig bei der Registrierung (serverseitig, steht im Muenz-Verlauf)
  user.stats.coins = (user.stats.coins || 0) + SIGNUP_BONUS;
  user.coinSnap = user.stats.coins;
  user.coinLog = [{ t: Date.now(), d: SIGNUP_BONUS, b: user.stats.coins, s: "anmeldebonus" }];
  users.push(user); statReg();
  if (!(await saveUsers())) {
    // Nicht gespeichert -> Konto zurueckrollen statt so zu tun, als waere alles gut
    users = users.filter(u => u !== user);
    return serviceDownMsg(lang);
  }
  return { ok: true, token, profile: publicProfile(user), bonus: SIGNUP_BONUS };
}

/* ---- Authenticator (TOTP, RFC 6238), freiwillig ---- */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function b32enc(buf) { let bits = "", out = ""; for (const x of buf) bits += x.toString(2).padStart(8, "0"); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)]; return out; }
function b32dec(str) { let bits = ""; for (const c of String(str).toUpperCase().replace(/[^A-Z2-7]/g, "")) bits += B32.indexOf(c).toString(2).padStart(5, "0"); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
function totpAt(secret, step) {
  const msg = Buffer.alloc(8); msg.writeUInt32BE(Math.floor(step / 4294967296), 0); msg.writeUInt32BE(step >>> 0, 4);
  const h = crypto.createHmac("sha1", b32dec(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1000000;
  return String(n).padStart(6, "0");
}
// prueft Code (+-30 s), jeder Zeitschritt nur einmal einloesbar
function totpCheck(user, secret, code, consume) {
  const c = String(code || "").replace(/\s/g, "");
  if (!secret || !/^\d{6}$/.test(c)) return false;
  const now = Math.floor(Date.now() / 30000);
  for (let d = -1; d <= 1; d++) {
    const st = now + d;
    if (st <= (user.totpLastStep || 0)) continue;
    const exp = Buffer.from(totpAt(secret, st)), got = Buffer.from(c);
    if (exp.length === got.length && crypto.timingSafeEqual(exp, got)) { if (consume) user.totpLastStep = st; return true; }
  }
  return false;
}
function totpActive(user) { return !!(user && user.totpOn && user.totpSecret); }
async function totpApi(action, payload, lang) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const user = findUserByToken(payload && payload.token);
  if (!user) return errObj("notLoggedIn", lang);
  const en = lang === "en";
  if (action === "status") return { ok: true, on: totpActive(user) };
  if (rlHit("totp|" + user.username.toLowerCase(), 12, 60 * 60 * 1000, 30 * 60 * 1000).lockedUntil > Date.now()) return errObj("tooManyRequests", lang);
  const pwOk = async () => {
    if (typeof payload.password !== "string" || payload.password.length > 200) return false;
    if (hashInFlight >= MAX_HASH_IN_FLIGHT) return false;
    hashInFlight++; let h; try { h = await hashPassword(payload.password, user.salt); } finally { hashInFlight--; }
    const a = Buffer.from(h, "hex"), b = Buffer.from(user.passwordHash, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  if (action === "setup") {
    if (totpActive(user)) return { ok: false, error: en ? "Already enabled." : "Schon eingeschaltet." };
    if (!(await pwOk())) return { ok: false, error: en ? "Wrong password." : "Passwort falsch." };
    user.totpPending = b32enc(crypto.randomBytes(20));
    await saveUsers();
    const label = encodeURIComponent("Brain Pulse:" + user.username);
    return { ok: true, secret: user.totpPending, uri: "otpauth://totp/" + label + "?secret=" + user.totpPending + "&issuer=Brain%20Pulse&digits=6&period=30" };
  }
  if (action === "enable") {
    if (!user.totpPending || !totpCheck(user, user.totpPending, payload.code, true)) return { ok: false, error: en ? "Wrong code." : "Code falsch." };
    user.totpSecret = user.totpPending; delete user.totpPending; user.totpOn = true; user.tokens = (user.tokens || []).filter(t => t.token === payload.token);
    await saveUsers();
    return { ok: true, on: true };
  }
  if (action === "disable") {
    if (!totpActive(user)) return { ok: true, on: false };
    if (!(await pwOk())) return { ok: false, error: en ? "Wrong password." : "Passwort falsch." };
    if (!totpCheck(user, user.totpSecret, payload.code, true)) return { ok: false, error: en ? "Wrong code." : "Code falsch." };
    user.totpOn = false; delete user.totpSecret; delete user.totpPending;
    await saveUsers();
    return { ok: true, on: false };
  }
  return errObj("invalidInput", lang);
}
async function loginUser(username, password, ip, lang, code) {
  if (typeof username !== "string" || typeof password !== "string" || password.length > 200) {
    return errObj("loginFailed", lang);
  }
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const uname = username.trim().toLowerCase().slice(0, 40);
  const kPair = "p|" + uname + "|" + ip, kIp = "i|" + ip, kUser = "u|" + uname;
  // Gesperrt? Dann ABLEHNEN, BEVOR gehasht wird (gesperrte Versuche kosten keine CPU)
  const wait = Math.max(rlWait(kPair), rlWait(kIp), rlWait(kUser));
  if (wait) return { ...errObj("tooManyAttempts", lang, waitText(wait, lang) + (lang === "en" ? "." : " erneut versuchen.")), retryAfterSec: wait };
  if (hashInFlight >= MAX_HASH_IN_FLIGHT) return busyMsg(lang);
  const user = findUserByLogin(username);
  const genericError = errObj("loginFailed", lang);
  const failed = () => {
    rlHit(kPair, AUTH_MAX_FAILS_PAIR, AUTH_WINDOW_MS, AUTH_LOCK_MS);
    rlHit(kIp, AUTH_MAX_FAILS_IP, AUTH_WINDOW_MS, AUTH_LOCK_MS);
    rlHit(kUser, AUTH_MAX_FAILS_USER, AUTH_WINDOW_MS, AUTH_LOCK_MS);
    return genericError;
  };
  hashInFlight++;
  let hash;
  // Auch bei unbekanntem Namen hashen: sonst verraet die Antwortzeit, ob es das Konto gibt
  try { hash = await hashPassword(password || "", user ? user.salt : DUMMY_SALT); } finally { hashInFlight--; }
  if (!user) return failed();
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return failed();
  rlReset(kPair);
  if (isBanned(user)) return { ok: false, error: banText(user, lang), banned: true };
  if (totpActive(user)) {
    if (!code) return { ok: false, needTotp: true, error: lang === "en" ? "Enter the code from your authenticator app." : "Gib den Code aus deiner Authenticator-App ein." };
    if (!totpCheck(user, user.totpSecret, code, true)) return failed();
  }
  const token = crypto.randomBytes(24).toString("hex");
  user.tokens = user.tokens || [];
  user.tokens.push({ token, createdAt: Date.now() });
  pruneTokens(user);
  await saveUsers();
  return { ok: true, token, profile: publicProfile(user) };
}


/* ============================================================================
   BRAINUPS (alle Spiele): Punkte gesamt / Tag / Woche / Monat, Belohnungen, Bestenlisten
   ============================================================================ */
let ZP_DAY_CAP = 1000;
let ZP_DAY_TIERS = [{ p: 100, c: 20 }, { p: 250, c: 40 }, { p: 500, c: 80 }, { p: 800, c: 150 }];
let ZP_WEEK_TIERS = [{ p: 500, c: 100 }, { p: 1200, c: 200 }, { p: 2500, c: 400 }, { p: 4000, c: 800 }];
let ZP_MONTH_REWARDS = [1500, 1000, 700, 500, 400, 300, 250, 200, 150, 100];
const ZP_DEFAULTS = { cap: 1000, day: JSON.parse(JSON.stringify(ZP_DAY_TIERS)), week: JSON.parse(JSON.stringify(ZP_WEEK_TIERS)), month: ZP_MONTH_REWARDS.slice() };
function zpApplyCfg() {
  const c = gameCfg && gameCfg.zp || {};
  const tiers = (a, d) => Array.isArray(a) && a.length >= 1 && a.length <= 8 && a.every(x => x && x.p > 0 && x.c >= 0) ? a.map(x => ({ p: Math.floor(x.p), c: Math.floor(x.c) })).sort((m, n) => m.p - n.p) : d;
  ZP_DAY_CAP = c.cap >= 10 && c.cap <= 100000 ? Math.floor(c.cap) : ZP_DEFAULTS.cap;
  ZP_DAY_TIERS = tiers(c.day, ZP_DEFAULTS.day); ZP_WEEK_TIERS = tiers(c.week, ZP_DEFAULTS.week);
  ZP_MONTH_REWARDS = Array.isArray(c.month) && c.month.length === 10 && c.month.every(x => x >= 0) ? c.month.map(x => Math.floor(x)) : ZP_DEFAULTS.month.slice();
}
const ZP_GAMES = ["ttt", "chess", "fourups", "muehle", "taboo"];   // eigene Spiel-Bestenlisten (Schach + Dame zaehlen zusammen als "chess")
const zpMonthKey = () => todayDateString().slice(0, 7);
function zpPrevMonthKey() { const [y, m] = zpMonthKey().split("-").map(Number); return m === 1 ? (y - 1) + "-12" : y + "-" + String(m - 1).padStart(2, "0"); }
function zpState(user) {
  const z = user.stats.zp && typeof user.stats.zp === "object" ? user.stats.zp : (user.stats.zp = {});
  const day = todayDateString(), wk = brainWeekInfo().id;
  if (z.day !== day) { z.day = day; z.dp = 0; z.dc = 0; }
  if (z.week !== wk) { z.week = wk; z.wp = 0; z.wc = 0; }
  if (!z.mon || typeof z.mon !== "object") z.mon = {};
  if (!z.g || typeof z.g !== "object") z.g = {};
  if (!z.once || typeof z.once !== "object") z.once = {};
  z.total = Math.max(0, Math.floor(z.total || 0)); z.dp = z.dp || 0; z.dc = z.dc || 0; z.wp = z.wp || 0; z.wc = z.wc || 0;
  return z;
}
// Vergibt Brainups (Tageslimit). game = optionale Spiel-Bestenliste. Gibt { gain, total, game } zurueck.
const SM_ZP = [5, 10, 20, 30, 45, 60, 80, 100, 130, 160]; // Order of Speed: ZP je geschafftem Level, Stufen 1-5, 6-10 ... 46-50
function zpAdd(user, pts, why, game) {
  try {
    if (!user || isRestricted(user) || featureLocked("zp")) return { gain: 0, total: 0 };
    pts = Math.max(0, Math.floor(Number(pts) || 0));
    const z = zpState(user);
    const gain = Math.min(pts, Math.max(0, ZP_DAY_CAP - z.dp));
    if (gain > 0) {
      z.total += gain; z.dp += gain; z.wp += gain;
      const mk = zpMonthKey(); z.mon[mk] = (z.mon[mk] || 0) + gain;
      Object.keys(z.mon).sort().slice(0, -3).forEach(k => delete z.mon[k]);
      if (game && ZP_GAMES.includes(game)) z.g[game] = (z.g[game] || 0) + gain;
    }
    z.last = { gain, why: String(why || ""), t: Date.now() };
    saveUsers().catch(() => {});
    if (gain > 0) notifyAccount(user.username, { type: "zpGain", gain, total: z.total, game: game || null, gameTotal: game && z.g[game] != null ? z.g[game] : null, why: String(why || ""), t: z.last.t });
    return { gain, total: z.total, t: Date.now(), game: game && z.g[game] != null ? z.g[game] : null };
  } catch (e) { console.error("zpAdd", e); return { gain: 0, total: 0 }; }
}
function zpRankTotal(user) { const t = zpState(user).total; return 1 + users.filter(u => u !== user && ((u.stats.zp || {}).total || 0) > t).length; }
function zpMonthRank(user, mk) { const t = ((user.stats.zp || {}).mon || {})[mk] || 0; if (t <= 0) return null; return 1 + users.filter(u => u !== user && (((u.stats.zp || {}).mon || {})[mk] || 0) > t).length; }
function zpTop(valFn, n) {
  return users.map(u => ({ u, v: valFn(u) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, n)
    .map((x, i) => ({ pos: i + 1, name: x.u.username, avatar: x.u.avatar || null, pts: x.v }));
}
function zpStatus(user) {
  const z = zpState(user), mk = zpMonthKey(), pk = zpPrevMonthKey(), prevRank = zpMonthRank(user, pk);
  return {
    ok: true, total: z.total, rank: zpRankTotal(user), day: { pts: z.dp, cap: ZP_DAY_CAP, claimed: z.dc, tiers: ZP_DAY_TIERS }, week: { pts: z.wp, claimed: z.wc, tiers: ZP_WEEK_TIERS },
    month: { key: mk, pts: z.mon[mk] || 0, rank: zpMonthRank(user, mk), endsInDays: (() => { const [y, m] = mk.split("-").map(Number); const last = new Date(y, m, 0).getDate(); return Math.max(0, last - Number(todayDateString().slice(8, 10))); })(), rewards: ZP_MONTH_REWARDS },
    prevMonth: { key: pk, rank: prevRank, claimable: prevRank != null && prevRank <= 10 && (z.mClaimed || "") < pk, coins: prevRank != null && prevRank <= 10 ? ZP_MONTH_REWARDS[prevRank - 1] : 0 },
    games: z.g, last: z.last || null, coins: user.stats.coins || 0
  };
}
/* Brainchimie: gueltige Ergebnis-Elemente aus public/chem.js (10 ZP pro neu entdecktem Element, einmalig) */
const CHEM_RESULTS = (() => { try { const l = fs.readFileSync(path.join(__dirname, "public/chem.js"), "utf8").split("\n").find(x => x.startsWith("const D = ")); const j = JSON.parse(l.slice(l.indexOf("{"), l.lastIndexOf("}") + 1)); return new Set(j.r.map(x => x[2])); } catch (e) { console.error("CHEM_RESULTS", e.message); return new Set(); } })();
async function zpApi(payload, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = payload.token ? findUserByToken(payload.token) : null, action = payload.action;
  if (featureLocked("zp") && !gateOk("zp", payload.adminKey, payload.__ip)) return FEATURE_LOCKED_RESULT;
  if (action === "board" && featureLocked("boards") && !gateOk("boards", payload.adminKey, payload.__ip)) return FEATURE_LOCKED_RESULT;
  if (action === "board") {
    const mk = zpMonthKey(), kind = payload.kind;
    if (kind === "game") {
      const g = String(payload.game || ""); if (!ZP_GAMES.includes(g)) return { ok: false };
      const val = u => ((u.stats.zp || {}).g || {})[g] || 0, top = zpTop(val, 10);
      const me = user ? { pts: val(user), pos: val(user) > 0 ? 1 + users.filter(u => u !== user && val(u) > val(user)).length : null } : null;
      return { ok: true, top, me };
    }
    const val = kind === "month" ? (u => ((u.stats.zp || {}).mon || {})[mk] || 0) : (u => (u.stats.zp || {}).total || 0), top = zpTop(val, 10);
    const me = user ? { pts: val(user), pos: val(user) > 0 ? 1 + users.filter(u => u !== user && val(u) > val(user)).length : null } : null;
    return { ok: true, top, me, rewards: kind === "month" ? ZP_MONTH_REWARDS : undefined };
  }
  if (!user) return errObj("notLoggedIn", lang);
  if (action === "status") { await saveUsers().catch(() => {}); return zpStatus(user); }
  if (action === "claim") {
    const z = zpState(user), kind = payload.kind;
    if (isRestricted(user)) return errObj("notLoggedIn", lang);
    let coins = 0;
    if (kind === "day" || kind === "week") {
      const tiers = kind === "day" ? ZP_DAY_TIERS : ZP_WEEK_TIERS, pts = kind === "day" ? z.dp : z.wp, k = kind === "day" ? "dc" : "wc";
      for (let i = z[k]; i < tiers.length; i++) { if (pts >= tiers[i].p) { coins += tiers[i].c; z[k] = i + 1; } else break; }
    } else if (kind === "month") {
      const pk = zpPrevMonthKey(), r = zpMonthRank(user, pk);
      if ((z.mClaimed || "") < pk) { z.mClaimed = pk; if (r != null && r <= 10) coins = ZP_MONTH_REWARDS[r - 1]; }
    } else return errObj("invalidInput", lang);
    if (coins > 0) user.stats.coins = (user.stats.coins || 0) + coins;
    await saveUsers();
    return { ...zpStatus(user), granted: coins };
  }
  if (action === "once") {  // einmalige Belohnung je Abschnitt (z. B. Vokabel-Thema bestanden), nur bekannte Arten
    const kind = String(payload.kind || ""), id = String(payload.id || "").slice(0, 60);
    const okId = kind === "vocab" ? /^[A-Za-z0-9_\-]{1,40}$/.test(id) : kind === "chem" ? CHEM_RESULTS.has(id) : false;
    if (!okId) return errObj("invalidInput", lang);
    const z = zpState(user), key = kind + ":" + id;
    if (z.once[key]) return { ...zpStatus(user), gain: 0 };
    const r = zpAdd(user, kind === "chem" ? 10 : 250, kind); if (r.gain > 0) z.once[key] = 1;
    return { ...zpStatus(user), gain: r.gain };
  }
  return errObj("invalidInput", lang);
}

/* ============================================================================
   BRAINING-BESTENLISTE (Brain Hood / Brain Fruit)
   - Wochenliste: Punkte = Summe der Level-Nummern, die in der Woche geschafft wurden
     (schwere Level zaehlen mehr). Reset jeden Montag 0:00 (Europe/Berlin).
   - Rang (Elo-Stufe 1-10) richtet sich nach dem hoechsten erreichten Level und faellt nie.
   - Top 5 der Vorwoche bekommen Preise (einmal pro Woche abholbar).
   ============================================================================ */
const BRAIN_GAMES = ["fruit", "hood"];
const BRAIN_RANK_LEVELS = [1, 50, 150, 400, 700, 1000, 1500, 2200, 3000, 4000];
const BRAIN_REWARDS = [ { coins: 100, hammer: 3 }, { coins: 70, hammer: 2 }, { coins: 50, hammer: 1 }, { coins: 30, hammer: 0 }, { coins: 20, hammer: 0 } ];
const BRAIN_MIN_GAP_MS = 8000;
function brainRankOf(level) { let r = 1; for (let i = 0; i < BRAIN_RANK_LEVELS.length; i++) if (level >= BRAIN_RANK_LEVELS[i]) r = i + 1; return r; }
function berlinFakeNow() { // "Berlin-Wanduhr" als UTC-Millisekunden
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t) => Number(parts.find(x => x.type === t).value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
}
const WEEK_MS = 7 * 86400000, MONDAY_OFFSET = 4 * 86400000;
function brainWeekInfo() { const f = berlinFakeNow(); const id = Math.floor((f - MONDAY_OFFSET) / WEEK_MS); return { id, endsInMs: (id + 1) * WEEK_MS + MONDAY_OFFSET - f }; }
function brainState(user) {
  const st = user.stats;
  if (!st.brain || typeof st.brain !== "object") st.brain = { weeks: {}, best: { fruit: 0, hood: 0 }, last: { fruit: 0, hood: 0 }, claimed: 0 };
  const b = st.brain; if (!b.weeks) b.weeks = {}; if (!b.best) b.best = { fruit: 0, hood: 0 }; if (!b.last) b.last = { fruit: 0, hood: 0 };
  const cur = brainWeekInfo().id;
  for (const k of Object.keys(b.weeks)) if (Number(k) < cur - 2) delete b.weeks[k]; // nur die letzten Wochen behalten
  return b;
}
function brainPts(user, week, game) { const b = user.stats.brain; return (b && b.weeks && b.weeks[week] && b.weeks[week][game]) || 0; }
function brainTop(week, game, n) {
  return users.map(u => ({ u, pts: brainPts(u, week, game) })).filter(x => x.pts > 0)
    .sort((a, b) => b.pts - a.pts || String(a.u.username).localeCompare(String(b.u.username))).slice(0, n);
}
async function brainSubmit(token, game, level, lang, pts) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(token); if (!user) return errObj("notLoggedIn", lang);
  if (!BRAIN_GAMES.includes(game)) return errObj("invalidInput", lang);
  level = Math.round(Number(level)); if (!Number.isFinite(level) || level < 1 || level > 9999) return errObj("invalidInput", lang);
  const b = brainState(user), f = user.stats.fruit || {};
  const saved = game === "fruit" ? (f.fruitLevel || 1) : (f.hoodLevel || 1); // das vom Client gespeicherte "aktuelle" Level
  const maxOk = Math.max(b.best[game], saved) + 1;
  if (level > maxOk) return { ok: false, error: "level" };
  const now = Date.now(); const sinceLast = now - (b.last[game] || 0);
  if (sinceLast < BRAIN_MIN_GAP_MS) { if (sinceLast < 2000) flagCheat(user, "Brain " + game + " Spam"); return { ok: false, error: "tooFast" }; }
  b.last[game] = now;
  b.best[game] = Math.max(b.best[game], level);
  const w = brainWeekInfo().id; if (!b.weeks[w]) b.weeks[w] = { fruit: 0, hood: 0 };
  // Brain Fruit zaehlt Spielpunkte (mit plausibler Obergrenze pro Runde), alles andere das Level
  let gain = level;
  if (game === "fruit" && Number.isFinite(Number(pts)) && Number(pts) > 0) gain = Math.max(level, Math.min(Math.round(6000 * (1 + level / 20)), Math.round(200 * Math.min(180, sinceLast / 1000)), Math.round(Number(pts))));
  b.weeks[w][game] = Math.min(1e9, (b.weeks[w][game] || 0) + gain);
  await saveUsers();
  return { ok: true, points: b.weeks[w][game], rank: brainRankOf(b.best[game]) };
}
function brainBoard(token, game) {
  if (!usersLoaded) return { ok: false, unavailable: true };
  if (!BRAIN_GAMES.includes(game)) return { ok: false };
  const wk = brainWeekInfo(), me = token ? findUserByToken(token) : null;
  const top = brainTop(wk.id, game, 10).map((x, i) => ({ pos: i + 1, name: x.u.username, avatar: x.u.avatar || "🙂", pts: x.pts, rank: brainRankOf(((x.u.stats.brain || {}).best || {})[game] || 0) }));
  let mine = null;
  if (me) {
    const b = brainState(me), pts = brainPts(me, wk.id, game);
    const all = brainTop(wk.id, game, 100000); const idx = all.findIndex(x => x.u === me);
    mine = { pts, pos: idx >= 0 ? idx + 1 : null, rank: brainRankOf(b.best[game] || 0), level: b.best[game] || 0 };
  }
  return { ok: true, top, mine, endsInMs: wk.endsInMs, rewards: BRAIN_REWARDS };
}
async function brainClaim(token, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(token); if (!user) return errObj("notLoggedIn", lang);
  const b = brainState(user), prev = brainWeekInfo().id - 1;
  if (b.claimed >= prev) return { ok: true, rewards: [], profile: publicProfile(user) };
  const rewards = [];
  for (const game of BRAIN_GAMES) {
    const top = brainTop(prev, game, 5), i = top.findIndex(x => x.u === user);
    if (i >= 0) rewards.push({ game, pos: i + 1, ...BRAIN_REWARDS[i] });
  }
  b.claimed = prev;
  if (rewards.length) {
    user.stats.coins = (user.stats.coins || 0) + rewards.reduce((a, r) => a + r.coins, 0);
    if (!user.stats.fruit || typeof user.stats.fruit !== "object") user.stats.fruit = { fruitLevel: 1, hoodLevel: 1, hammer: 2, broom: 1, shuffle: 1, moves: 1 };
    user.stats.fruit.hammer = Math.min(999, (user.stats.fruit.hammer || 0) + rewards.reduce((a, r) => a + r.hammer, 0));
  }
  await saveUsers();
  return { ok: true, rewards, profile: publicProfile(user) };
}

function sessionUser(token) {
  // Konten noch nicht geladen -> NICHT "abgemeldet" melden (der Client wuerde
  // sonst sein gespeichertes Token loeschen), sondern "nicht verfuegbar".
  if (!usersLoaded) { loadUsers(); return { ok: false, unavailable: true }; }
  const sess = findSession(token);
  if (!sess) return { ok: false };
  sess.user.lastSeen = Date.now();
  // Rollierend erneuern (max. 1x am Tag), damit aktive Spielende nie ausgeloggt werden
  if (Date.now() - sess.entry.createdAt > TOKEN_REFRESH_AFTER_MS) {
    sess.entry.createdAt = Date.now();
    saveUsers().catch(() => {});
  }
  return { ok: true, profile: publicProfile(sess.user) };
}

async function logoutUser(token) {
  if (!usersLoaded) return { ok: true };
  const user = findUserByToken(token);
  if (user) {
    user.tokens = (user.tokens || []).filter(t => t.token !== token);
    await saveUsers();
  }
  return { ok: true };
}

const CLIENT_COINS_PER_DAY = 300;
async function saveUserStats(token, stats, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(token);
  if (!user) return errObj("notLoggedIn", lang);
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) return errObj("invalidInput", lang);
  const allowedKeys = ["score", "tier", "klasse", "consecutiveFails", "roundsPlayed", "wins", "losses", "correctAnswers", "wrongAnswers", "bestScore", "tttRank", "tttWinsAtRank", "coins", "braintestPrestige"];
  // Muenzen sind Geld-relevant (Stripe, Schach-Schluessel). Der Client darf
  // sie ausgeben (senken). Erhoehen darf er sie nur um die Prestige-Belohnung
  // (500 je neuer Stufe) plus ein kleines Tagesbudget fuer das, was er selbst
  // verdient (Haupttest +10, Erfolge, Themen) - sonst koennte sich jeder
  // beliebig Muenzen schenken.
  const oldCoins = user.stats.coins || 0, oldPrestige = user.stats.braintestPrestige || 0;
  const oldAnswers = (user.stats.correctAnswers || 0) + (user.stats.wrongAnswers || 0), oldWL = (user.stats.wins || 0) + (user.stats.losses || 0);
  const oldKlasse = user.stats.klasse || 0, oldTtt = user.stats.tttRank || 0;
  const zpWas = { oosT: (user.stats.oosLast && user.stats.oosLast.t) || 0, synced: !!user.stats.syncedOnce, sm: user.stats.speedMathLevel || 1, fruit: (user.stats.fruit && user.stats.fruit.fruitLevel) || 1, bio: Object.assign({}, user.stats.biologyBest || {}, user.stats.biologyPerfect || {}) };
  const oldCorrect = user.stats.correctAnswers || 0, oldWrong = user.stats.wrongAnswers || 0, oldWins = user.stats.wins || 0, oldLosses = user.stats.losses || 0, oldRounds = user.stats.roundsPlayed || 0;
  allowedKeys.forEach(k => {
    if (typeof stats[k] === "number" && Number.isFinite(stats[k])) {
      user.stats[k] = Math.max(0, Math.round(stats[k]));
    }
  });
  // Schutz vor Konsolen-/API-Schummeln: Nach dem ersten Abgleich (lokale Staende duerfen gross sein)
  // darf ein Speichern Klasse und Guertel nur um EINE Stufe erhoehen und Zaehler nur
  // glaubwuerdig wachsen lassen. Alles darueber wird gekappt und vermerkt.
  if (user.stats.syncedOnce) {
    if ((user.stats.klasse || 0) > oldKlasse + 1) { flagCheat(user, "Klassensprung " + oldKlasse + "->" + user.stats.klasse); user.stats.klasse = oldKlasse + 1; }
    if ((user.stats.tttRank || 0) > oldTtt + 1) { flagCheat(user, "Guertelsprung " + oldTtt + "->" + user.stats.tttRank); user.stats.tttRank = oldTtt + 1; }
    const capRise = (k, old, max) => { if ((user.stats[k] || 0) - old > max) { flagCheat(user, k + " +" + ((user.stats[k] || 0) - old)); user.stats[k] = old + max; } };
    capRise("correctAnswers", oldCorrect, 600); capRise("wrongAnswers", oldWrong, 600);
    capRise("wins", oldWins, 150); capRise("losses", oldLosses, 150); capRise("roundsPlayed", oldRounds, 200);
  }
  user.stats.syncedOnce = true;
  user.stats.klasse = Math.min(9, user.stats.klasse || 0); user.stats.tttRank = Math.min(6, user.stats.tttRank || 0);
  ["score", "bestScore", "roundsPlayed", "wins", "losses", "correctAnswers", "wrongAnswers"].forEach(k => { if ((user.stats[k] || 0) > 10000000) user.stats[k] = 10000000; });
  // Plausibilitaet: ein Speichern, das hunderte Antworten/Siege auf einmal
  // addiert (bei einem Konto, das schon Daten hat), ist verdaechtig. Nur
  // vermerken, nicht sperren (der erste Abgleich lokaler Stände darf gross sein).
  const addAnswers = (user.stats.correctAnswers || 0) + (user.stats.wrongAnswers || 0) - oldAnswers;
  const addWL = (user.stats.wins || 0) + (user.stats.losses || 0) - oldWL;
  if ((oldAnswers > 50 && addAnswers > 400) || (oldWL > 20 && addWL > 100)) flagCheat(user, "Statistiksprung +" + addAnswers + " Antworten / +" + addWL + " Spiele");
  if (process.env.ALLOW_CLIENT_COINS !== "1") {
    const day = new Date().toISOString().slice(0, 10);
    const cd = user.stats.clientCoinsDay && user.stats.clientCoinsDay.day === day ? user.stats.clientCoinsDay : { day, n: 0 };
    const restricted = isRestricted(user);
    const prestigeBonus = restricted ? 0 : 500 * Math.max(0, (user.stats.braintestPrestige || 0) - oldPrestige);
    const rise = Math.max(0, (user.stats.coins || 0) - oldCoins);
    const free = restricted ? 0 : Math.min(Math.max(0, rise - prestigeBonus), Math.max(0, CLIENT_COINS_PER_DAY - cd.n));
    cd.n += free;
    user.stats.clientCoinsDay = cd;
    if (user.stats.coins > oldCoins) {
      if (rise > prestigeBonus + free) flagCheat(user, "Muenzen +" + rise + " gekappt");
      user.stats.coins = oldCoins + Math.min(rise, prestigeBonus + free);
    }
  }
  if (!isRestricted(user)) {
    if ((user.stats.klasse || 0) > oldKlasse && (user.stats.klasse || 0) - oldKlasse === 1) feedPush(user, "klasse", (user.stats.klasse || 0) + 1);
    if ((user.stats.tttRank || 0) > oldTtt && (user.stats.tttRank || 0) - oldTtt === 1) feedPush(user, "belt", user.stats.tttRank || 0);
  }
  // Profilbild: einfacher String (Emoji), aber kein Zahlenwert - eigene,
  // lockere Pruefung (nicht leer, vernuenftige Laenge fuer ein einzelnes
  // Emoji inkl. evtl. Mehrfach-Zeichen-Sequenzen wie Flaggen/ZWJ-Emojis).
  if (typeof stats.avatar === "string" && stats.avatar.length > 0 && stats.avatar.length <= 16) {
    user.stats.avatar = stats.avatar;
  }
  // modeStats ist verschachtelt (kein einfacher Zahlenwert) - eigene,
  // strikte Validierung pro Modus statt der generischen allowedKeys-Schleife.
  if (stats.modeStats && typeof stats.modeStats === "object") {
    if (!user.stats.modeStats) user.stats.modeStats = freshModeStats();
    MODE_STAT_KEYS.forEach(k => {
      const incoming = stats.modeStats[k];
      if (incoming && typeof incoming.played === "number" && typeof incoming.correct === "number") {
        user.stats.modeStats[k] = {
          played: Math.max(0, Math.round(incoming.played)),
          correct: Math.max(0, Math.round(incoming.correct))
        };
      }
    });
  }
  // haupttestUnlockedForKlasse darf -1 sein (noch nicht freigeschaltet) -
  // eigene Validierung, da die generische Schleife oben negative Werte
  // auf 0 kappen würde (Math.max(0, ...)).
  if (typeof stats.haupttestUnlockedForKlasse === "number" && Number.isFinite(stats.haupttestUnlockedForKlasse)) {
    user.stats.haupttestUnlockedForKlasse = Math.max(-1, Math.round(stats.haupttestUnlockedForKlasse));
  }
  // Speed-Math-Meilenstein: Level als Zahl 1-50, Herzen 0-3, Datum als
  // schlichter String (kein Zahlenwert) - eigene Validierung statt der
  // generischen allowedKeys-Schleife.
  if (typeof stats.speedMathLevel === "number" && Number.isFinite(stats.speedMathLevel)) {
    user.stats.speedMathLevel = Math.max(1, Math.min(50, Math.round(stats.speedMathLevel)));
  }
  if (typeof stats.speedMathHearts === "number" && Number.isFinite(stats.speedMathHearts)) {
    user.stats.speedMathHearts = Math.max(0, Math.min(3, Math.round(stats.speedMathHearts)));
  }
  if (typeof stats.speedMathHeartsDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(stats.speedMathHeartsDate)) {
    user.stats.speedMathHeartsDate = stats.speedMathHeartsDate;
  }
  // Braining (Brain Fruit / Brain Hood): Level + Booster-Vorrat, strikt auf Zahlen begrenzt
  if (stats.fruit && typeof stats.fruit === "object" && !Array.isArray(stats.fruit)) {
    const f = stats.fruit, cur = user.stats.fruit && typeof user.stats.fruit === "object" ? user.stats.fruit : {};
    const n = (v, max) => (typeof v === "number" && Number.isFinite(v)) ? Math.max(0, Math.min(max, Math.round(v))) : 0;
    user.stats.fruit = {
      fruitLevel: Math.max(1, cur.fruitLevel || 1, n(f.fruitLevel, 9999)),
      hoodLevel: Math.max(1, cur.hoodLevel || 1, n(f.hoodLevel, 9999)),
      fruitPts: Math.max(cur.fruitPts || 0, n(f.fruitPts, 1e9)),
      fruitSlot: Math.max(cur.fruitSlot || 0, n(f.fruitSlot, 1)),
      fruitKings: (cur.fruitKings || 0) | n(f.fruitKings, 63),
      fruitKing: n(f.fruitKing, 5),
      fruitBg: n(f.fruitBg, 3),
      fruitKL: [0,1,2,3,4,5].map(i => Math.max((Array.isArray(cur.fruitKL) ? cur.fruitKL[i] | 0 : 0), Array.isArray(f.fruitKL) ? n(f.fruitKL[i], 5) : 0)),
      fruitKX: [0,1,2,3,4,5].map(i => Math.max((Array.isArray(cur.fruitKX) ? cur.fruitKX[i] | 0 : 0), Array.isArray(f.fruitKX) ? n(f.fruitKX[i], 100000) : 0)),
      fruitSt: (() => { const a = typeof cur.fruitSt === "string" ? cur.fruitSt : "", b = typeof f.fruitSt === "string" && /^[0-3]{0,3000}$/.test(f.fruitSt) ? f.fruitSt : ""; let o = ""; for (let i = 0; i < Math.max(a.length, b.length); i++) o += Math.max(+(a[i] || 0), +(b[i] || 0)); return o; })(),
      hammer: n(f.hammer, 999), broom: n(f.broom, 999), shuffle: n(f.shuffle, 999), moves: n(f.moves, 999)
    };
  }
  // Order of Speed: letzte + beste Runde {level, points, sec}
  for (const key of ["oosLast", "oosBest"]) {
    const r = stats[key];
    if (r && typeof r === "object" && [r.level, r.points, r.sec].every(n => typeof n === "number" && Number.isFinite(n))) {
      user.stats[key] = { level: Math.max(1, Math.min(200, Math.round(r.level))), points: Math.max(0, Math.min(1e7, Math.round(r.points))), sec: Math.max(0, Math.min(86400, Math.round(r.sec))) };
      if (typeof r.t === "number" && Number.isFinite(r.t)) user.stats[key].t = Math.round(r.t);
    }
  }
  // Biologie: beste Trefferzahl je Thema + "fehlerfrei"-Markierung (strikt validiert)
  if (stats.biologyBest && typeof stats.biologyBest === "object" && !Array.isArray(stats.biologyBest)) {
    const cur = user.stats.biologyBest && typeof user.stats.biologyBest === "object" ? user.stats.biologyBest : {};
    for (const k of Object.keys(stats.biologyBest).slice(0, 40)) {
      const v = stats.biologyBest[k];
      if (/^[a-z_]{1,40}$/.test(k) && typeof v === "number" && Number.isFinite(v)) cur[k] = Math.max(cur[k] || 0, Math.max(0, Math.min(100, Math.round(v))));
    }
    user.stats.biologyBest = cur;
  }
  if (stats.biologyPerfect && typeof stats.biologyPerfect === "object" && !Array.isArray(stats.biologyPerfect)) {
    const cur = user.stats.biologyPerfect && typeof user.stats.biologyPerfect === "object" ? user.stats.biologyPerfect : {};
    for (const k of Object.keys(stats.biologyPerfect).slice(0, 40)) {
      if (/^[a-z_]{1,40}$/.test(k) && stats.biologyPerfect[k] === true) cur[k] = true;
    }
    user.stats.biologyPerfect = cur;
  }
  // Brain-Test-Fortschritt (Klassen-Punktestaende je Klasse, Sperre,
  // Tagesversuche) - verschachtelt, deshalb eigene, strikte Validierung
  // statt der generischen allowedKeys-Schleife oben.
  if (stats.braintestScores && typeof stats.braintestScores === "object" && !Array.isArray(stats.braintestScores)) {
    const clean = {};
    for (const k of Object.keys(stats.braintestScores)) {
      const idx = Number(k);
      if (!Number.isInteger(idx) || idx < 0 || idx >= 10) continue;
      const entry = stats.braintestScores[k];
      if (!entry || typeof entry !== "object") continue;
      const cleanEntry = {};
      for (const type of ["practice", "main"]) {
        const s = entry[type];
        if (s && typeof s.correct === "number" && typeof s.total === "number" && Number.isFinite(s.correct) && Number.isFinite(s.total) && s.total > 0 && s.correct >= 0 && s.correct <= s.total) {
          const cleaned = { correct: Math.round(s.correct), total: Math.round(s.total) };
          if (type === "main" && typeof s.elapsedSec === "number" && Number.isFinite(s.elapsedSec) && s.elapsedSec >= 0) cleaned.elapsedSec = Math.round(s.elapsedSec);
          cleanEntry[type] = cleaned;
        }
      }
      if (Object.keys(cleanEntry).length) clean[idx] = cleanEntry;
    }
    user.stats.braintestScores = clean;
  }
  if (stats.braintestGate === null) {
    user.stats.braintestGate = null;
  } else if (stats.braintestGate && typeof stats.braintestGate === "object") {
    const g = stats.braintestGate;
    if (Number.isInteger(g.klasse) && g.klasse >= 0 && g.klasse < 10 && (g.type === "needPractice" || g.type === "needPriorMain")) {
      user.stats.braintestGate = { klasse: g.klasse, type: g.type };
    }
  }
  if (typeof stats.braintestExtraAttemptUsed === "boolean") {
    user.stats.braintestExtraAttemptUsed = stats.braintestExtraAttemptUsed;
  }
  if (stats.braintestDaily === null) {
    user.stats.braintestDaily = null;
  } else if (stats.braintestDaily && typeof stats.braintestDaily === "object") {
    const d = stats.braintestDaily;
    if (Number.isInteger(d.klasse) && d.klasse >= 0 && d.klasse < 10 && typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
      user.stats.braintestDaily = {
        klasse: d.klasse, date: d.date,
        practiceAttempts: Math.max(0, Math.min(3, Math.round(Number(d.practiceAttempts) || 0))),
        mainAttempts: Math.max(0, Math.min(3, Math.round(Number(d.mainAttempts) || 0)))
      };
    }
  }
  // Erfolge: Staende zusammenfuehren (Zaehler nie rueckwaerts, "freigeschaltet"
  // nur aus den Zaehlern berechnet - direktes Setzen von unlocked wirkt nicht)
  if (stats.achv && typeof stats.achv === "object") {
    const before = Object.assign({}, (user.stats.achv && user.stats.achv.unlocked) || {});
    user.stats.achv = Achv.merge(user.stats.achv, stats.achv, Date.now());
    if (!isRestricted(user)) { // nur Kategorie-Abschluesse und Sammel-Erfolge sind meldenswert (nicht jeder Einzelne)
      for (const id of Object.keys(user.stats.achv.unlocked || {})) {
        if (!before[id] && (id.startsWith("cat_") || id.startsWith("collector_"))) feedPush(user, "achv", 0, id);
      }
    }
  }
  // Brainups: Klasse bestanden 250, Speed-Math-Meilenstein-Level 150, Order-of-Speed-Level 5 bis 160 (nach Stufen), Brain Fruit Level 50 (jedes 10. = 100), Biologie-Thema erstmals geschafft 250
  if (zpWas.synced && !isRestricted(user)) {
    let zpt = 0;
    zpt += 250 * Math.min(1, Math.max(0, (user.stats.klasse || 0) - oldKlasse));
    zpt += 150 * Math.min(3, Math.max(0, (user.stats.speedMathLevel || 1) - zpWas.sm));
    { // Order of Speed: neue Runde -> ZP je geschafftem Level nach Stufen (5 ... 160), begrenzt durch gespielte Zeit
      const o = user.stats.oosLast;
      if (o && o.t > (zpWas.oosT || 0) && o.t <= Date.now() + 120000) {
        const done = Math.min(15, Math.max(0, o.level - 1), Math.floor((o.sec || 0) / 6));
        for (let L = 1; L <= done; L++) zpt += SM_ZP[Math.min(9, Math.floor((L - 1) / 5))];
      }
    }
    const fl = (user.stats.fruit && user.stats.fruit.fruitLevel) || 1;
    for (let L = zpWas.fruit; L < Math.min(fl, zpWas.fruit + 20); L++) zpt += L % 10 === 0 ? 100 : 50;
    const bioNow = Object.assign({}, user.stats.biologyBest || {}, user.stats.biologyPerfect || {});
    zpt += 250 * Math.min(3, Object.keys(bioNow).filter(k => !(k in zpWas.bio)).length);
    if (zpt > 0) zpAdd(user, zpt, "solo");
  }
  await saveUsers();
  return { ok: true, profile: publicProfile(user) };
}

/* ------------------------------------------------------------------------ */
/* Freunde: Anfragen, Liste, Online-Status, Chat                             */
/* ------------------------------------------------------------------------ */
// Online-Status pro Konto (nicht gespeichert, nur waehrend der Server laeuft):
// Benutzername (klein) -> Set der offenen WebSocket-Verbindungen (mehrere
// Geraete/Tabs moeglich).
const onlineAccounts = new Map();
let cloakInit = false;
const cloakedNames = new Set(); // Namen (klein) von Konten mit eingeschalteter Admin-Ansicht
function accountIsOnline(username) {
  if (!cloakInit && usersLoaded) { cloakInit = true; users.forEach(u => { if (u.adminCloak) cloakedNames.add(u.username.toLowerCase()); }); }
  if (cloakedNames.has(String(username).toLowerCase())) return false; // Admin-Ansicht: unsichtbar
  const set = onlineAccounts.get(username.toLowerCase());
  return !!set && set.size > 0;
}
function accountDisconnect(ws) {
  if (!ws.accountUsername) return;
  const set = onlineAccounts.get(ws.accountUsername);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    onlineAccounts.delete(ws.accountUsername);
    const user = findUserByName(ws.accountUsername);
    if (user) user.lastSeenAt = Date.now();
    if (user) (user.friends || []).forEach(name => notifyAccount(name, { type: "friendOffline", username: user.username }));
  }
}
function achievementCount(user) {
  const unlocked = user.stats && user.stats.achv && user.stats.achv.unlocked;
  return unlocked ? Object.keys(unlocked).length : 0;
}
function friendSummary(user) {
  const st = user.stats || {}, fr = st.fruit || st;
  return { username: user.username, avatar: user.avatar || null, online: accountIsOnline(user.username), achievements: achievementCount(user),
    lastSeen: user.lastSeenAt || 0,
    st: { klasse: st.klasse | 0, score: st.bestScore | 0, wins: st.wins | 0, rounds: st.roundsPlayed | 0, fruitLevel: (st.fruitLevel | 0) || 1, hoodLevel: (st.hoodLevel | 0) || 1 } };
}
function areFriends(a, b) {
  return (a.friends || []).some(f => f.toLowerCase() === b.username.toLowerCase());
}
async function friendsList(token, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  const friends = (me.friends || []).map(name => findUserByName(name)).filter(Boolean).map(friendSummary);
  // Streamer-Modus: eingegangene Anfragen bleiben gespeichert, werden aber nicht angezeigt.
  const incoming = me.streamerMode ? [] : (me.incomingRequests || []).filter(name => findUserByName(name));
  const outgoing = (me.outgoingRequests || []).filter(name => findUserByName(name));
  return { ok: true, friends, incoming, outgoing };
}
async function friendsSearch(token, query, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  const q = (typeof query === "string" ? query : "").trim().toLowerCase();
  if (q.length < 2) return { ok: true, results: [] };
  const results = users
    .filter(u => u !== me && !u.adminCloak && u.username.toLowerCase().includes(q))
    .slice(0, 20)
    .map(u => ({
      username: u.username, avatar: u.avatar || null,
      isFriend: areFriends(me, u),
      requestSent: (me.outgoingRequests || []).some(n => n.toLowerCase() === u.username.toLowerCase()),
      requestIncoming: (me.incomingRequests || []).some(n => n.toLowerCase() === u.username.toLowerCase())
    }));
  return { ok: true, results };
}
async function friendsRequest(token, targetUsername, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  const target = findUserByName(targetUsername);
  if (!target) return errObj("userNotFound", lang);
  if (target === me) return errObj("cantAddSelf", lang);
  if (areFriends(me, target)) return errObj("alreadyFriends", lang);
  if (!me.outgoingRequests) me.outgoingRequests = [];
  if (!target.incomingRequests) target.incomingRequests = [];
  if (me.outgoingRequests.some(n => n.toLowerCase() === target.username.toLowerCase())) {
    return errObj("requestAlreadySent", lang);
  }
  // Hat die Zielperson mir bereits selbst eine Anfrage geschickt? Dann statt
  // einer zweiten Anfrage direkt zu Freunden machen (freundlicher Ablauf).
  if ((me.incomingRequests || []).some(n => n.toLowerCase() === target.username.toLowerCase())) {
    return friendsAccept(token, target.username, lang);
  }
  if (target.streamerMode) return errObj("streamerNoRequests", lang);
  me.outgoingRequests.push(target.username);
  target.incomingRequests.push(me.username);
  if (!(await saveUsers())) {
    me.outgoingRequests = me.outgoingRequests.filter(n => n !== target.username);
    target.incomingRequests = target.incomingRequests.filter(n => n !== me.username);
    return serviceDownMsg(lang);
  }
  if (!target.streamerMode) notifyAccount(target.username, { type: "friendRequestReceived", from: friendSummary(me) });
  return { ok: true };
}
async function friendsAccept(token, fromUsername, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  const from = findUserByName(fromUsername);
  if (!from) return errObj("userNotFound", lang);
  if (!(me.incomingRequests || []).some(n => n.toLowerCase() === from.username.toLowerCase())) {
    return errObj("noOpenRequest", lang);
  }
  me.incomingRequests = me.incomingRequests.filter(n => n.toLowerCase() !== from.username.toLowerCase());
  from.outgoingRequests = (from.outgoingRequests || []).filter(n => n.toLowerCase() !== me.username.toLowerCase());
  if (!me.friends) me.friends = []; if (!from.friends) from.friends = [];
  if (!areFriends(me, from)) me.friends.push(from.username);
  if (!areFriends(from, me)) from.friends.push(me.username);
  await saveUsers();
  notifyAccount(from.username, { type: "friendRequestAccepted", by: friendSummary(me) });
  return { ok: true, friends: (await friendsList(token, lang)).friends };
}
async function setFeedOptIn(token, enabled, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  me.feedOptIn = enabled === true;
  await saveUsers();
  return { ok: true, feedOptIn: me.feedOptIn };
}
async function setStreamerMode(token, enabled, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  me.streamerMode = enabled === true;
  await saveUsers();
  return { ok: true, streamerMode: me.streamerMode };
}
// Freunde in den Warteraum einladen (Party/Tic Tac Toe/...): nur Freunde,
// nur wenn online, Raum muss offen sein. Der Code geht per Direktnachricht an
// den Freund und wird dort nie angezeigt (wichtig fuer den Streamer-Modus).

/* ---- Gesamt-Reset (Admin): alle Konten auf Null, Hinweis beim naechsten Login ---- */
let resetMeta = null; // { epoch: Zeitstempel des letzten Resets, 0 = nie }
const META_FILE = USERS_FILE + ".meta.json";
async function loadResetMeta() {
  if (resetMeta) return resetMeta;
  let m = { epoch: 0 };
  try {
    if (USE_UPSTASH) {
      const res = await fetch(`${UPSTASH_URL}/get/${UPSTASH_USERS_KEY}_meta`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
      const d = await res.json();
      if (d && d.result) m = JSON.parse(d.result);
    } else if (fs.existsSync(META_FILE)) {
      m = JSON.parse(fs.readFileSync(META_FILE, "utf8"));
    }
  } catch (e) { console.error("Reset-Marker nicht lesbar:", e.message); }
  resetMeta = { epoch: Number(m && m.epoch) || 0 };
  return resetMeta;
}
async function saveResetMeta() {
  if (USE_UPSTASH) {
    const res = await fetch(`${UPSTASH_URL}/set/${UPSTASH_USERS_KEY}_meta`, { method: "POST", headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "text/plain" }, body: JSON.stringify(resetMeta) });
    return res.ok;
  }
  try { fs.mkdirSync(path.dirname(META_FILE), { recursive: true }); fs.writeFileSync(META_FILE, JSON.stringify(resetMeta), "utf8"); return true; } catch (e) { console.error(e.message); return false; }
}
/* ---- Beta-Phasen: der Admin stellt die laufende Phase um (0 = keine). Neue Konten bekommen das passende Abzeichen dauerhaft. ---- */
let betaMeta = null; // { phase: 0..3 }
const BETA_FILE = USERS_FILE + ".beta.json";
const BETA_MAX = 3;
async function loadBetaMeta() {
  if (betaMeta) return betaMeta;
  let m = { phase: 0 };
  try {
    if (USE_UPSTASH) {
      const res = await fetch(`${UPSTASH_URL}/get/${UPSTASH_USERS_KEY}_beta`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
      const d = await res.json();
      if (d && d.result) m = JSON.parse(d.result);
    } else if (fs.existsSync(BETA_FILE)) {
      m = JSON.parse(fs.readFileSync(BETA_FILE, "utf8"));
    }
  } catch (e) { console.error("Beta-Phase nicht lesbar:", e.message); }
  const p = Math.floor(Number(m && m.phase)) || 0;
  betaMeta = { phase: p >= 0 && p <= BETA_MAX ? p : 0 };
  return betaMeta;
}
async function saveBetaMeta() {
  if (USE_UPSTASH) {
    const res = await fetch(`${UPSTASH_URL}/set/${UPSTASH_USERS_KEY}_beta`, { method: "POST", headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "text/plain" }, body: JSON.stringify(betaMeta) });
    return res.ok;
  }
  try { fs.mkdirSync(path.dirname(BETA_FILE), { recursive: true }); fs.writeFileSync(BETA_FILE, JSON.stringify(betaMeta), "utf8"); return true; } catch (e) { console.error(e.message); return false; }
}
function betaCounts() { const c = { 1: 0, 2: 0, 3: 0 }; for (const u of users) { const p = u.betaPhase | 0; if (p >= 1 && p <= BETA_MAX) c[p]++; } return c; }
// Admin: Phase lesen/setzen (phase 0..3) und optional einem bestehenden Konto ein Abzeichen geben/entziehen (grantUser + grantPhase 0..3)
async function adminBeta(key, ip, payload, lang) {
  if (!adminOk(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  await loadBetaMeta();
  const p = payload || {};
  if (p.phase !== undefined && p.phase !== null) {
    const n = Math.floor(Number(p.phase));
    if (!(n >= 0 && n <= BETA_MAX)) return { ok: false, error: "Phase muss 0 bis 3 sein." };
    betaMeta.phase = n;
    if (!(await saveBetaMeta())) return serviceDownMsg(lang);
  }
  let granted = null;
  if (typeof p.grantUser === "string" && p.grantUser.trim()) {
    const u = findUserByName(p.grantUser.trim());
    if (!u) return { ok: false, error: "Konto nicht gefunden." };
    const g = Math.floor(Number(p.grantPhase));
    if (!(g >= 0 && g <= BETA_MAX)) return { ok: false, error: "Abzeichen muss 0 bis 3 sein." };
    if (g) u.betaPhase = g; else delete u.betaPhase;
    if (!(await saveUsers())) return serviceDownMsg(lang);
    granted = { username: u.username, betaPhase: g };
  }
  return { ok: true, phase: betaMeta.phase, counts: betaCounts(), granted };
}
/* ---- Folgen-Bonus: einmalig Muenzen je Netzwerk (Ehrensystem - ob wirklich gefolgt wird, laesst sich nicht pruefen) ---- */
const SOCIAL_BONUS = { tiktok: 50, instagram: 50, clapper: 50 };
const SOCIAL_MIN_WAIT_MS = 8000, SOCIAL_OPEN_MAX_MS = 24 * 3600 * 1000;
// Konten verbinden: Nutzer traegt seinen Namen je Netzwerk ein (Ehrensystem, der Admin kann ihn pruefen)
// Admin-Ansicht: Konto wird fuer andere unsichtbar, Chat-Name "Admin". Nur mit gueltigem Admin-Key.
function adminGames(key, ip) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  return { ok: true, games: GAME_DEFS.map(g => ({ ...g, mode: gameModeRaw(g.id), effective: gameMode(g.id), start: (gameCfg.modes[g.id] && gameCfg.modes[g.id].start) || 0, hide: gameHide(g.id), pending: gameStart(g.id), classOff: g.classes ? classOffList(g.id) : undefined })) };
}
async function adminGameSet(key, ip, payload) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const g = GAME_DEFS.find(x => x.id === payload.id);
  if (!g) return { ok: false, error: "Spiel unbekannt." };
  if (payload.cls !== undefined) {
    const n = parseInt(payload.cls, 10);
    if (!g.classes || !(n >= 0 && n < g.classes)) return { ok: false, error: "Stufe unbekannt." };
    let list = classOffList(g.id).filter(x => x !== n);
    if (!payload.on) list.push(n);
    gameCfg.classOff[g.id] = list.sort((a, b) => a - b);
  } else {
    if (!GAME_MODES.includes(payload.mode)) return { ok: false, error: "Zustand unbekannt." };
    const start = (payload.mode === "test" || payload.mode === "open") ? Math.max(0, Math.round(Number(payload.start) || 0)) : 0;
    gameCfg.modes[g.id] = { mode: payload.mode, start, hide: payload.mode !== "open" && !!payload.hide };
  }
  if (!(await saveGameCfg())) return { ok: false, error: "Speichern fehlgeschlagen." };
  console.log("[Spiele] " + g.id + ": " + JSON.stringify(payload.cls !== undefined ? { cls: payload.cls, on: payload.on } : gameCfg.modes[g.id]));
  return adminGames(key, ip);
}

/* ---- STATISTIK (Zaehler je Tag, liegt mit in den Spiele-Einstellungen) ---- */
function statDay() {
  if (!gameCfg.stats || typeof gameCfg.stats !== "object") gameCfg.stats = {};
  const k = new Date().toISOString().slice(0, 10);
  if (!gameCfg.stats[k]) {
    gameCfg.stats[k] = { p: {}, reg: 0, peak: 0, vis: 0 };
    Object.keys(gameCfg.stats).sort().slice(0, -45).forEach(x => delete gameCfg.stats[x]);
    Object.keys(gameCfg.stats).forEach(x => { if (x !== k && gameCfg.stats[x] && gameCfg.stats[x].ids) delete gameCfg.stats[x].ids; });
  }
  return gameCfg.stats[k];
}
function statHit(key) {
  try { key = String(key || "").slice(0, 40); if (!key) return; const d = statDay(); d.p[key] = (d.p[key] || 0) + 1; maniaSaveSoon(); } catch (e) {}
}
function statReg() { try { statDay().reg++; maniaSaveSoon(); } catch (e) {} }
function statPeakTick(n) { try { const d = statDay(); let ch = false; if (n > (d.peak || 0)) { d.peak = n; ch = true; } const v = seenToday.set ? seenToday.set.size : 0; if (v > (d.vis || 0)) { d.vis = v; ch = true; } if (ch) maniaSaveSoon(); } catch (e) {} }
const statHitSeen = new Map();
function statHitApi(payload, ip) {
  const id = String(payload.g || ""); if (!GAME_DEFS.some(g => g.id === id)) return { ok: false };
  const k = ip + "|" + id, now = Date.now();
  if (now - (statHitSeen.get(k) || 0) < 4000) return { ok: true };
  if (statHitSeen.size > 5000) statHitSeen.clear();
  statHitSeen.set(k, now); statHit(id); return { ok: true };
}
function adminStats(key, ip) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  statPeakTick(presenceCounts().online);
  const days = [], names = {}; GAME_DEFS.forEach(g => { names[g.id] = g.name; });
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const k = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10), d = (gameCfg.stats || {})[k] || { p: {}, reg: 0, peak: 0, vis: 0 };
    days.push({ day: k, plays: Object.values(d.p).reduce((a, b) => a + b, 0), reg: d.reg || 0, peak: d.peak || 0, vis: d.vis || 0, p: d.p });
  }
  const sum = (arr, key) => arr.reduce((a, d) => a + (d[key] || 0), 0);
  const agg = (n) => { const o = {}; days.slice(0, n).forEach(d => { for (const g in d.p) o[g] = (o[g] || 0) + d.p[g]; }); return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id, n]) => ({ id, name: names[id] || id.replace(/^party_/, "Party: "), n })); };
  return { ok: true, today: days[0], week: { plays: sum(days.slice(0, 7), "plays"), reg: sum(days.slice(0, 7), "reg"), peak: Math.max(...days.slice(0, 7).map(d => d.peak)) }, month: { plays: sum(days, "plays"), reg: sum(days, "reg"), peak: Math.max(...days.map(d => d.peak)) },
    top7: agg(7), top30: agg(30), days: days.map(d => ({ day: d.day, plays: d.plays, reg: d.reg, peak: d.peak, vis: d.vis })).reverse(), users: users.length, online: presenceCounts().online };
}
/* ---- ADMIN: BRAINUPS ---- */
async function adminZp(key, ip, payload) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  if (!usersLoaded) return { ok: false, error: "Konten noch nicht geladen." };
  const act = payload.action || "get", mk = zpMonthKey();
  const cfgView = () => ({ cap: ZP_DAY_CAP, day: ZP_DAY_TIERS, week: ZP_WEEK_TIERS, month: ZP_MONTH_REWARDS, defaults: ZP_DEFAULTS, on: !featureLocked("zp"), boardsOn: !featureLocked("boards") });
  const todayTop = zpTop(u => { const z = (u.stats.zp || {}); return z.day === todayDateString() ? (z.dp || 0) : 0; }, 10);
  if (act === "get") return { ok: true, cfg: cfgView(), top: zpTop(u => (u.stats.zp || {}).total || 0, 10), topMonth: zpTop(u => ((u.stats.zp || {}).mon || {})[mk] || 0, 10), topToday: todayTop, monthKey: mk };
  if (act === "set") {
    const toT = a => (Array.isArray(a) ? a : []).map(x => ({ p: Math.floor(Number(x.p)), c: Math.floor(Number(x.c)) }));
    const c = { cap: Math.floor(Number(payload.cap)), day: toT(payload.day), week: toT(payload.week), month: (payload.month || []).map(x => Math.floor(Number(x))) };
    if (!(c.cap >= 10 && c.cap <= 100000)) return { ok: false, error: "Tageslimit 10 bis 100000." };
    const bad = a => !a.length || a.length > 8 || a.some(x => !(x.p > 0) || !(x.c >= 0)) || a.some((x, i) => i && x.p <= a[i - 1].p);
    if (bad(c.day) || bad(c.week)) return { ok: false, error: "Stufen: 1 bis 8, Punkte aufsteigend, Münzen ≥ 0." };
    if (c.month.length !== 10 || c.month.some(x => !(x >= 0))) return { ok: false, error: "Monatspreise: genau 10 Werte ≥ 0." };
    gameCfg.zp = c; zpApplyCfg();
    if (!(await saveGameCfg())) return { ok: false, error: "Speichern fehlgeschlagen." };
    console.log("[ZP] Einstellungen geändert"); return { ok: true, cfg: cfgView() };
  }
  if (act === "reset-cfg") { delete gameCfg.zp; zpApplyCfg(); await saveGameCfg(); return { ok: true, cfg: cfgView() }; }
  const u = findUserByName(String(payload.username || "").trim());
  if (!u) return { ok: false, error: "Spieler nicht gefunden." };
  const z = zpState(u);
  const view = () => ({ ok: true, name: u.username, total: z.total, day: z.dp, week: z.wp, month: z.mon[mk] || 0, games: z.g, coins: u.stats.coins || 0, rank: zpRankTotal(u) });
  if (act === "find") return view();
  if (act === "credit") {
    const n = Math.floor(Number(payload.pts)); if (!n || Math.abs(n) > 100000) return { ok: false, error: "Zahl ungültig." };
    z.total = Math.max(0, z.total + n); z.mon[mk] = Math.max(0, (z.mon[mk] || 0) + n);
    if (!(await saveUsers())) return { ok: false, error: "Speichern fehlgeschlagen." };
    console.log("[ZP] " + u.username + " " + (n > 0 ? "+" : "") + n); return view();
  }
  if (act === "reset") {
    u.stats.zp = undefined; zpState(u); delete u.stats.zp.once; zpState(u).total = 0;
    if (!(await saveUsers())) return { ok: false, error: "Speichern fehlgeschlagen." };
    console.log("[ZP] " + u.username + " zurückgesetzt"); return view();
  }
  return { ok: false, error: "Unbekannt." };
}
/* ============================================================================
   EVENTS: BATTLE ROYALE (Admin legt an und veroeffentlicht, Spieler melden sich an)
   Alle Spieler spielen gleichzeitig dieselbe Runde, nach jeder Runde fliegen die Letzten raus.
   Rundenarten (Phase 1): Wissenstest, Higher or Lower, Speed Math.
   ============================================================================ */
const EVDUEL = require("./evduel.js")({ Dame, Mill, getChess: () => getChessEngine(), getQuiz: () => { const q = evNewQ({ rounds: [] }, {}, "x", { type: Math.random() < 0.5 ? "quiz" : (Math.random() < 0.5 ? "bio" : "vocab"), klasse: 0, topic: "" }, 0); return { q: q.pub.q, a: q.pub.a, cat: q.pub.cat, ans: q.ans }; } });
// Geschicklichkeits-Spiele aus "Das schwerste Spiel der Welt" als Battle-Royale-Disziplin (nur Royale)
const EV_HD = { balken: ["Der Balken", 1.5, [5, 14]], gedaechtnis: ["Das Gedächtnis", 3.4, [4, 11]], linie: ["Die Linie", 1.8, [6, 15]], gegenteil: ["Das Gegenteil", 1.5, [6, 17]], flug: ["Der Farbflug", 1.6, [5, 16]], blasen: ["Die Blasen", 1.1, [10, 34]], puls: ["Der Puls", 2.3, [3, 10]], farbe: ["Die Farbe", 5, [2, 7]], tasten: ["Die Tasten", 0.7, [15, 60]] };
const EV_HD_NAMES = {}; Object.keys(EV_HD).forEach(k => { EV_HD_NAMES["hd_" + k] = "Schwerstes Spiel: " + EV_HD[k][0]; });
const evHdKey = d => (d && typeof d.type === "string" && d.type.startsWith("hd_") && EV_HD[d.type.slice(3)]) ? d.type.slice(3) : "";
const EV_DUEL_NAMES = { ttt: "Duell: Tic Tac Toe", ttq: "Duell: Tic Tac Toe Quiz", ttx: "Duell: Tic Tac Toe Quanten", c4: "Duell: 4 gewinnt", mill: "Duell: Mühle", dame: "Duell: Dame", chess: "Duell: Schach" };
const evIsDuel = d => !!(d && EVDUEL.TYPES[d.type]);
const EV_TYPES = { quiz: "Wissenstest", bio: "Biologie", vocab: "Vokabeln (Englisch)", hilo: "Higher or Lower", math: "Speed Math", order: "Order of Speed", sort: "Sortieren", chrono: "Chronologie", taboo: "Taboo Solo (Wort erraten)", ...EV_HD_NAMES, ...EV_DUEL_NAMES, mix: "Überraschungs-Mix" };
let EV_BIO = [], EV_VOC = [];
try { EV_BIO = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/biologyDE.json"), "utf8")); } catch (e) { console.log("biologyDE.json fehlt"); }
try { EV_VOC = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/vocabDE.json"), "utf8")); } catch (e) { console.log("vocabDE.json fehlt"); }
const EV_TOPIC_GROUP = { hilo: "higherLower", sort: "ordering", chrono: "chronology" };
const EV_INTRO_SEC = process.env.EV_FAST ? 2 : 8, EV_ROUND_SEC = process.env.EV_FAST ? 8 : 45, EV_RESULT_SEC = process.env.EV_FAST ? 3 : 10; // EV_FAST nur fuer Tests
const evRun = new Map(); // id -> { roundIdx, phase, phaseEnd, alive:Set, score:{}, lastAt:{}, q:{}, streak:{}, out:[], lastElim:[] }
function evStore() { if (!Array.isArray(gameCfg.events)) gameCfg.events = []; return gameCfg.events; }
function evGet(id) { return evStore().find(e => e.id === id); }
function evHiloTopics() { return Object.entries(DATASETS.higherLower || {}).map(([k, v]) => ({ k, label: String(v.label || k).replace(/^Higher or Lower:\s*/, "") })); }
const EV_MODES = { points: "Punkte", tasks: "Aufgaben", time: "Zeit" };
const EV_DRES_SEC = process.env.EV_FAST ? 2 : 6;
const evNum = (v, d, lo, hi) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
function evDiscClean(d, fmt) {
  d = d || {};
  let type = EV_TYPES[d.type] ? d.type : "quiz";
  if (type.startsWith("hd_")) { if (fmt !== "royale" || !evHdKey({ type })) type = "quiz"; else return { type, mode: "points", sec: evNum(d.sec, 60, 20, 300), count: 1, klasse: 0, level: 1, topic: "" }; }
  if (type === "taboo") { if (fmt !== "royale") type = "quiz"; else return { type, mode: "points", sec: evNum(d.sec, 60, 30, 300), count: 1, klasse: 0, level: 1, topic: "" }; }
  if (EVDUEL.TYPES[type]) {
    if (fmt !== "bracket") type = "quiz";
    else return { type, mode: "points", sec: evNum(d.sec, EVDUEL.SEC[type], 30, 600), count: 1, klasse: 0, level: 1, topic: "" };
  }
  let mode = EV_MODES[d.mode] ? d.mode : "points"; if (fmt === "royale" && mode === "time") mode = "points";
  return { type, mode, sec: evNum(d.sec, 45, 15, 300), count: evNum(d.count, 10, 3, 60), klasse: type === "quiz" || type === "mix" ? evNum(d.klasse, 0, 0, 10) : 0, level: type === "math" || type === "order" || type === "mix" ? evNum(d.level, 1, 1, 4) : 1, topic: EV_TOPIC_GROUP[type] && d.topic && DATASETS[EV_TOPIC_GROUP[type]][d.topic] ? String(d.topic) : "" };
}
function evDiscs(rd) { return rd && Array.isArray(rd.discs) && rd.discs.length ? rd.discs : [evDiscClean({ type: rd && rd.type, topic: rd && rd.topic }, "royale")]; }
function evDiscLabel(d) {
  let t = EV_TYPES[d.type];
  if (d.type === "taboo") return t + " · " + d.sec + " s, 5 Versuche";
  if (evHdKey(d)) return t + " · " + d.sec + " s, beste Runde zählt";
  if (evIsDuel(d)) return t + " · 1 gegen 1, max. " + Math.round(d.sec / 60 * 10) / 10 + " Min.";
  if (d.type === "quiz" && d.klasse > 0) t += " Kl. " + d.klasse;
  if (EV_TOPIC_GROUP[d.type] && d.topic && DATASETS[EV_TOPIC_GROUP[d.type]][d.topic]) t += " (" + String(DATASETS[EV_TOPIC_GROUP[d.type]][d.topic].label).replace(/^[^:]*:\s*/, "") + ")";
  if ((d.type === "math" || d.type === "order") && d.level > 1) t += " Stufe " + d.level;
  const m = d.mode === "time" ? d.count + " Aufgaben auf Zeit" : d.mode === "tasks" ? "meiste Aufgaben in " + d.sec + " s" : "meiste Punkte in " + d.sec + " s";
  return t + " · " + m;
}
function evRoundLabel(r) { return evDiscs(r).map(evDiscLabel).join(" + "); }
function evStageName(players) { return players === 2 ? "Finale" : players === 4 ? "Halbfinale" : players === 8 ? "Viertelfinale" : players === 16 ? "Achtelfinale" : "Runde der " + players; }
function evClean(p) {
  const name = String(p.name || "").trim().slice(0, 40); if (!name) return { error: "Name fehlt." };
  const fmt = p.format === "bracket" ? "bracket" : "royale";
  const size = fmt === "bracket" ? ([8, 16, 32].includes(Number(p.size)) ? Number(p.size) : 8) : ([10, 50, 100].includes(Number(p.size)) ? Number(p.size) : evNum(p.maxPlayers, 50, 2, 200));
  let rounds;
  if (fmt === "bracket") {
    const nSt = Math.log2(size), src = Array.isArray(p.rounds) ? p.rounds : [];
    rounds = [];
    for (let i = 0; i < nSt; i++) {
      const rd = src[i] || {}, ds = (Array.isArray(rd.discs) && rd.discs.length ? rd.discs : [{}]).slice(0, 5).map(d => evDiscClean(d, "bracket"));
      rounds.push({ discs: ds });
    }
  } else {
    rounds = (Array.isArray(p.rounds) ? p.rounds : []).slice(0, 12).filter(r => r && (EV_TYPES[r.type] || (Array.isArray(r.discs) && r.discs.length))).map(r => ({ discs: [evDiscClean(Array.isArray(r.discs) && r.discs.length ? r.discs[0] : r, "royale")] }));
    if (!rounds.length) return { error: "Mindestens eine Runde." };
  }
  const pr = p.prizes || {}, g = (o) => ({ c: evNum(o && o.c, 0, 0, 1000000), z: evNum(o && o.z, 0, 0, 100000) });
  return { ev: { name, format: fmt, secret: p.secret !== false, size, start: Math.max(0, Math.floor(Number(p.start) || 0)), startFull: p.startFull === true, maxPlayers: size, minPlayers: evNum(p.minPlayers, fmt === "bracket" ? 2 : 4, 2, size), botFill: p.botFill === true, botTo: evNum(p.botTo, size, 2, size), rounds, prizes: { p1: g(pr.p1), p2: g(pr.p2), p3: g(pr.p3), part: g(pr.part) } } };
}
function evUserKey(n) { return String(n || "").toLowerCase(); }
const EV_BOT_NAMES = ["Pixel_Fox","Luna_88","Nerd4Life","Blitzkrieg","QuizQueen","Mr_Brain","Zocker99","Kaffeetasse","NightOwl","Hirnriss","TurboTim","Sternchen","Wuerfel_X","Rabauke","Quizzy","DerProf","LaraLoca","Bohne","Schlaufuchs","Kometen_K","Mia_Mau","Tiger77","FlinkeFee","Brainiac","Otto_O","Zitrone","Dr_Denk","PuzzlePit","Nova","Salto","KlugerKai","Emmi","Rakete","Gizmo","Hexe_H","Jule","Turm4","Wolke7","Tobi_T","Fuchs_F","Mondlicht","Kiwi_K","Blitzmerker","Denkdose","Quarkkopf","Lenny","Sparky","Pinguin_P","Knobel","Mister_X","Kleo","Rubin","Tinte","Faultier","Schnitzel","Neo_N","Zimt","Pfeffi","Wuschel","Honigbiene","Atlas","Bumerang","Chilli","Donner_D","Echo_E","Funke","Gustav","Hummel","Ikarus","Juwel","Koala_K","Lakritz","Murmel","Nuss_N","Orbit","Paprika","Quasar","Rolf_R","Sturmi","Tornado_T","Uhu","Vulkan_V","Waldi","Xaver","Yeti_Y","Zebra_Z"];
// Bots fuellen leere Plaetze (nur in der Laufzeit, nicht in ev.entrants -> kein Preis, keine Auszahlung)
function evMakeBots(ev) {
  const real = ev.entrants.length; if (!ev.botFill || real < 1) return [];
  let target = Math.min(ev.size || ev.maxPlayers, ev.botTo || ev.size || ev.maxPlayers);
  if (ev.format === "bracket") { let e = 2; while (e < target) e *= 2; target = Math.min(e, ev.size); }
  const n = Math.max(0, target - real), taken = new Set(ev.entrants.map(e => evUserKey(e.name))), pool = evShuffle(EV_BOT_NAMES).filter(x => !taken.has(evUserKey(x))), out = [];
  for (let i = 0; i < n; i++) out.push({ name: (pool[i] || "Spieler" + (i + 1)), skill: 0.2 + Math.random() * 0.7 });
  return out;
}
// ---- Duelle (1 gegen 1 am Brett) ----
function evDuelApply(run, m, now) {
  const du = m.duel, A = run.ps[m.a], B = run.ps[m.b]; if (!du || !du.res || !A || !B) return;
  const sa = du.res === "a" ? 100 : du.res === "draw" ? 50 : 0, sb = du.res === "b" ? 100 : du.res === "draw" ? 50 : 0;
  A.score = sa; B.score = sb; A.correct = sa >= 100 ? 1 : 0; B.correct = sb >= 100 ? 1 : 0; A.fin = B.fin = true; A.lastAt = B.lastAt = 0;
}
function evDuelStart(run, d, now) {
  run.matches.forEach(m => {
    m.duel = null; if (!m.b) return;
    const du = m.duel = EVDUEL.create(d.type), ka = run.kicked.has(m.a), kb = run.kicked.has(m.b);
    if (ka || kb) { EVDUEL.finish(du, ka && !kb ? "b" : kb && !ka ? "a" : (Math.random() < 0.5 ? "a" : "b"), "kick"); evDuelApply(run, m, now); return; }
    const ba = run.bots && run.bots.get(m.a), bb = run.bots && run.bots.get(m.b);
    if (ba && bb) du.bb = { at: now + (run.phaseEnd - now) * (0.25 + Math.random() * 0.4), w: Math.random() < 0.5 + (ba.skill - bb.skill) * 0.45 ? "a" : "b" };
    else du.botAt = now + 1500 + Math.random() * 1500;
  });
}
function evDuelBots(run, now) {
  let budget = 4;
  run.matches.forEach(m => {
    const du = m.duel; if (!m.b || !du || du.res) return;
    if (du.bb) { if (now >= du.bb.at) { EVDUEL.finish(du, du.bb.w, "bot"); evDuelApply(run, m, now); } return; }
    if (du.g === "ttq" && du.st.pend) {
      EVDUEL.tick(du, now); if (du.res) { evDuelApply(run, m, now); return; }
      const pd = du.st.pend; if (!pd) return; if (!pd.bat) pd.bat = { a: now + 1500 + Math.random() * 6000, b: now + 1500 + Math.random() * 6000 };
      ["a", "b"].forEach(sd => { const bk = run.bots && run.bots.get(sd === "a" ? m.a : m.b); if (bk && du.st.pend === pd && pd.ans[sd] == null && now >= pd.bat[sd]) EVDUEL.play(du, sd, EVDUEL.botAnswer(du, sd, bk.skill)); });
      if (du.res) evDuelApply(run, m, now); return;
    }
    const side = du.st.turn, key = side === "a" ? m.a : m.b, bot = run.bots && run.bots.get(key);
    if (!bot || now < du.botAt || budget <= 0) return;
    budget--;
    const mi = EVDUEL.botPick(du, side, bot.skill);
    if (mi >= 0) EVDUEL.play(du, side, mi);
    du.botAt = now + 800 + Math.random() * 1700;
    if (du.res) evDuelApply(run, m, now);
  });
}
// ---- Taboo Solo im Battle Royale: alle raten dasselbe Wort (5 Versuche, Wordle-Farben), Hinweise kommen nach und nach ----
const EV_TW_PTS = [100, 80, 60, 40, 20];
function evTwStart(run, d, now) {
  if (d.type !== "taboo" || !TABOO_SOLO_CARDS.length) { run.tw = null; return; }
  const idx = Math.floor(Math.random() * TABOO_SOLO_CARDS.length), c = TABOO_SOLO_CARDS[idx];
  run.tw = { idx, word: c.w.replace(/[^A-Za-zÄÖÜäöü]/g, "").toUpperCase(), cat: c.c || "", hints: c.h.map(h => h.t), start: now, sec: d.sec, solved: [], feed: [], bots: new Map() };
}
function evHdStart(run, d, now) {
  const g = evHdKey(d); if (!g) { run.hd = null; return; }
  const rg = EV_HD[g][2], w = Math.max(1, Math.round(100 / ((rg[0] + rg[1]) / 2)));
  run.hd = { game: g, w, att: {}, best: {}, start: now, sec: process.env.EV_FAST ? EV_ROUND_SEC : d.sec, bots: new Map() };
}
// Punkte eines Versuchs melden (laufend, damit auch der Stand bei Zeitablauf zaehlt). Obergrenze nach Spieltempo, damit Schummeln nicht ins Absurde geht.
function evHdScore(run, k, score, fin, now) {
  const hd = run.hd; if (!hd) return;
  const att = hd.att[k]; if (!att) return;
  const dur = Math.max(0, (now - att) / 1000), cap = Math.floor(dur / EV_HD[hd.game][1] * 2.5) + 3;
  let sc = Math.floor(Number(score)); if (!(sc > 0)) sc = 0; sc = Math.min(sc, cap, 1000);
  const b0 = hd.best[k] || 0; if (sc > b0) { hd.best[k] = sc; run.score[k] += (sc - b0) * hd.w; run.lastAt[k] = now; }
  if (fin) delete hd.att[k];
}
function evHdBots(run, now) {
  const hd = run.hd; if (!hd || !run.bots) return;
  const pace = EV_HD[hd.game][1], rg = EV_HD[hd.game][2];
  run.bots.forEach((b, k) => {
    if (!run.alive.has(k)) return;
    let st = hd.bots.get(k); if (!st) { st = { fin: Math.max(1, Math.round((rg[0] + (rg[1] - rg[0]) * Math.min(1, b.skill * (0.6 + Math.random() * 0.7))) * (0.8 + Math.random() * 0.4))), pace: pace * (1.1 - b.skill * 0.35) }; hd.bots.set(k, st); }
    const el = (now - hd.start) / 1000, sc = Math.min(st.fin, Math.floor(el / st.pace)), b0 = hd.best[k] || 0;
    if (sc > b0) { hd.best[k] = sc; run.score[k] += (sc - b0) * hd.w; run.lastAt[k] = now; }
  });
}
function evTwColors(word, guess) {
  const res = Array(guess.length).fill("k"), left = {};
  for (let i = 0; i < guess.length; i++) { if (guess[i] === word[i]) res[i] = "g"; else left[word[i]] = (left[word[i]] || 0) + 1; }
  for (let i = 0; i < guess.length; i++) if (res[i] !== "g" && left[guess[i]] > 0) { res[i] = "y"; left[guess[i]]--; }
  return res.join("");
}
function evTwSolve(run, k, tries, now) {
  const tw = run.tw; if (!tw || tw.solved.includes(k)) return;
  tw.solved.push(k); tw.feed.push({ n: run.names[k], solved: true, at: now });
  run.score[k] += EV_TW_PTS[Math.min(4, tries - 1)]; run.correct = run.correct || {}; run.correct[k] = (run.correct[k] || 0) + 1; run.lastAt[k] = now;
}
function evTwBots(run, d, now) {
  const tw = run.tw; if (!tw || !run.bots) return;
  run.bots.forEach((b, k) => {
    if (!run.alive.has(k)) return;
    let st = tw.bots.get(k);
    if (!st) { st = { solves: Math.random() < 0.3 + b.skill * 0.62, at: tw.start + tw.sec * 1000 * (0.15 + Math.random() * 0.75) * (1.25 - b.skill * 0.6), wrong: 0, nextW: tw.start + 2500 + Math.random() * 9000 }; tw.bots.set(k, st); }
    if (st.done) return;
    if (st.solves && now >= st.at) { st.done = true; evTwSolve(run, k, st.wrong + 1, now); return; }
    if (st.wrong < (st.solves ? 3 : 4) && now >= st.nextW && now < st.at) {
      const pool = TABOO_SOLO_CARDS.map(c => c.w.replace(/[^A-Za-zÄÖÜäöü]/g, "").toUpperCase()).filter(w => w.length === tw.word.length && w !== tw.word);
      if (pool.length) { st.wrong++; tw.feed.push({ n: run.names[k], t: pool[Math.floor(Math.random() * pool.length)], at: now }); }
      st.nextW = now + 4000 + Math.random() * 9000;
    }
  });
  if (tw.feed.length > 40) tw.feed.splice(0, tw.feed.length - 40);
}
function evBotsPlay(ev, run, now) {
  if (!run.bots) return;
  if (run.fmt !== "bracket" && run.tw && evDiscs(ev.rounds[run.roundIdx])[0].type === "taboo") return evTwBots(run, null, now);
  if (run.fmt !== "bracket" && run.hd) return evHdBots(run, now);
  const br = run.fmt === "bracket", d = br ? run.cfg[run.stageIdx].discs[run.discIdx] : evDiscs(ev.rounds[run.roundIdx])[0];
  if (br && evIsDuel(d)) return evDuelBots(run, now);
  run.bots.forEach((b, k) => {
    if (!run.alive.has(k) || run.kicked && run.kicked.has(k)) return;
    const st = br ? run.ps[k] : null; if (br && (!st || st.fin)) return;
    if (Math.random() > 0.15 + b.skill * 0.2) return;
    if (Math.random() < 0.12) { if (br) { st.streak = 0; if (d.mode === "time") st.pen += 3; } else run.streak[k] = 0; return; }
    if (br) { st.streak++; st.correct++; st.score += 10 + Math.min(5, st.streak - 1) * 2; st.lastAt = now; if (d.mode === "time" && st.correct >= d.count) { st.fin = true; st.time = now - run.playStart + st.pen * 1000; } }
    else { run.streak[k] = (run.streak[k] || 0) + 1; run.correct[k] = (run.correct[k] || 0) + 1; run.score[k] += d.mode === "tasks" ? 1 : 10 + Math.min(5, run.streak[k] - 1) * 2; run.lastAt[k] = now; }
  });
}
function evAddBots(ev, run, bots, keys) {
  if (!bots.length) return; run.bots = new Map();
  bots.forEach(b => { const k = evUserKey(b.name); run.bots.set(k, { skill: b.skill }); run.names[k] = b.name; if (keys) keys.push(k); run.alive.add(k); if (run.score) { run.score[k] = 0; run.lastAt[k] = 0; } if (run.tot) run.tot[k] = 0; });
}
function evBegin(ev) {
  if (ev.entrants.length < ev.minPlayers && !(ev.botFill && ev.entrants.length >= 1)) { ev.state = "cancelled"; ev.reason = "Zu wenig Anmeldungen"; saveGameCfg().catch(() => {}); return; }
  if (ev.format === "bracket") return evBeginBracket(ev);
  const run = { roundIdx: 0, phase: "intro", phaseEnd: Date.now() + EV_INTRO_SEC * 1000, alive: new Set(ev.entrants.map(e => evUserKey(e.name))), names: {}, score: {}, lastAt: {}, q: {}, streak: {}, out: [], lastElim: [] };
  ev.entrants.forEach(e => { const k = evUserKey(e.name); run.names[k] = e.name; run.score[k] = 0; run.lastAt[k] = 0; });
  const bots = evMakeBots(ev); run.correct = run.correct || {}; evAddBots(ev, run, bots);
  evRun.set(ev.id, run); ev.state = "running"; ev.startedAt = Date.now(); saveGameCfg().catch(() => {});
  console.log("[Event] " + ev.name + " startet mit " + ev.entrants.length + (bots.length ? " + " + bots.length + " Bots" : ""));
}
function evRank(run, keys) { return keys.slice().sort((a, b) => (run.score[b] - run.score[a]) || (run.lastAt[a] - run.lastAt[b]) || (a < b ? -1 : 1)); }
function evFinish(ev, run) {
  const surv = evRank(run, [...run.alive]), res = [];
  surv.forEach(k => res.push({ name: run.names[k], score: run.score[k], bot: !!(run.bots && run.bots.has(k)) }));
  for (let i = run.out.length - 1; i >= 0; i--) res.push({ name: run.names[run.out[i].k], score: run.score[run.out[i].k], bot: !!(run.bots && run.bots.has(run.out[i].k)) });
  res.forEach((r, i) => { r.place = i + 1; r.tier = i === 0 ? "p1" : i === 1 ? "p2" : i === 2 ? "p3" : "part"; });
  ev.results = res; ev.state = "payout"; ev.endedAt = Date.now(); run.phase = "done"; saveGameCfg().catch(() => {});
  console.log("[Event] " + ev.name + " beendet, Sieger: " + (res[0] ? res[0].name : "-"));
}
function evEndRound(ev, run) {
  const last = run.roundIdx >= ev.rounds.length - 1, alive = [...run.alive];
  run.lastElim = [];
  if (!last && alive.length > 2) {
    const n = Math.min(Math.max(1, Math.floor(alive.length * 0.25)), alive.length - 2), rk = evRank(run, alive), drop = rk.slice(rk.length - n).reverse();
    drop.forEach(k => { run.alive.delete(k); run.out.push({ k, round: run.roundIdx }); run.lastElim.push(run.names[k]); });
  }
  if (last || run.alive.size <= 1) return evFinish(ev, run);
  run.phase = "result"; run.phaseEnd = Date.now() + EV_RESULT_SEC * 1000;
}
/* ---- Turnier-Baum (K.-o., 1 gegen 1): alle Spiele einer Runde laufen gleichzeitig ---- */
function evShuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function evBeginBracket(ev) {
  const bots = evMakeBots(ev), E = ev.entrants.length + bots.length; let eff = 2; while (eff < E) eff *= 2; eff = Math.min(eff, ev.size);
  const nSt = Math.log2(eff), cfg = ev.rounds.slice(-nSt), keys = evShuffle(ev.entrants.map(e => evUserKey(e.name)).concat(bots.map(b => evUserKey(b.name)))), byes = Math.max(0, eff - keys.length);
  const ms = []; let ix = 0; for (let m = 0; m < eff / 2; m++) { if (m < byes) ms.push({ a: keys[ix++], b: null, res: [] }); else ms.push({ a: keys[ix++], b: keys[ix++], res: [] }); }
  const run = { fmt: "bracket", cfg, stageIdx: 0, discIdx: 0, phase: "intro", phaseEnd: Date.now() + EV_INTRO_SEC * 1000, matches: evShuffle(ms), history: [], names: {}, ps: {}, q: {}, tot: {}, stg: {}, alive: new Set(keys), kicked: new Set(), eff, playStart: 0, next: [] };
  ev.entrants.forEach(e => { const k = evUserKey(e.name); run.names[k] = e.name; run.tot[k] = 0; });
  evAddBots(ev, run, bots);
  evRun.set(ev.id, run); ev.state = "running"; ev.startedAt = Date.now(); saveGameCfg().catch(() => {});
  console.log("[Event] " + ev.name + " (Turnier-Baum " + eff + ") startet mit " + E);
}
function evBrBetter(mode, A, B) {
  const early = () => (A.lastAt && B.lastAt) ? B.lastAt - A.lastAt : (A.lastAt ? 1 : B.lastAt ? -1 : 0);
  if (mode === "time") {
    if (A.fin !== B.fin) return A.fin ? 1 : -1;
    const d = A.fin ? B.time - A.time : A.correct - B.correct; return d || early();
  }
  if (mode === "tasks") return (A.correct - B.correct) || (A.score - B.score) || early();
  return (A.score - B.score) || (A.correct - B.correct) || early();
}
function evBrDiscEnd(ev, run, d, now) {
  const snap = s => ({ score: s.score, correct: s.correct, fin: s.fin, time: s.time });
  if (evIsDuel(d)) run.matches.forEach(m => { if (m.b && m.duel && !m.duel.res) { EVDUEL.finish(m.duel, EVDUEL.judge(m.duel), "time"); evDuelApply(run, m, now); } });
  run.matches.forEach(m => {
    if (!m.b) return; const A = run.ps[m.a], B = run.ps[m.b]; if (!A || !B) return;
    let c = evBrBetter(d.mode, A, B); if (!c) c = Math.random() < 0.5 ? 1 : -1;
    m.res.push({ a: snap(A), b: snap(B), w: c > 0 ? "a" : "b" });
    [[m.a, A], [m.b, B]].forEach(([k, st]) => { const sc = Math.max(0, st.score); run.tot[k] = (run.tot[k] || 0) + sc; run.stg[k] = (run.stg[k] || 0) + sc; });
  });
  run.q = {}; run.phase = "dres"; run.phaseEnd = now + EV_DRES_SEC * 1000;
}
function evBrStageEnd(ev, run, now) {
  const winners = [];
  run.matches.forEach(m => {
    if (!m.b) { m.winner = m.a; }
    else {
      const wa = m.res.filter(r => r.w === "a").length, wb = m.res.length - wa; m.wins = [wa, wb];
      const dlt = wa !== wb ? wa - wb : ((run.stg[m.a] || 0) - (run.stg[m.b] || 0)) || (Math.random() < 0.5 ? 1 : -1);
      m.winner = dlt > 0 ? m.a : m.b; run.alive.delete(m.winner === m.a ? m.b : m.a);
    }
    winners.push(m.winner);
  });
  run.history.push({ name: evStageName(run.matches.length * 2), matches: run.matches.map(m => ({ a: m.a, b: m.b, w: m.winner, wins: m.wins || null })) });
  if (run.stageIdx >= run.cfg.length - 1) return evBrFinish(ev, run, winners[0]);
  run.next = winners; run.phase = "result"; run.phaseEnd = now + EV_RESULT_SEC * 1000;
}
function evBrNextStage(ev, run, now) {
  const ms = []; for (let i = 0; i < run.next.length; i += 2) ms.push({ a: run.next[i], b: run.next[i + 1] || null, res: [] });
  run.matches = ms; run.stageIdx++; run.discIdx = 0; run.stg = {}; run.ps = {}; run.q = {}; run.phase = "intro"; run.phaseEnd = now + EV_INTRO_SEC * 1000;
}
function evBrFinish(ev, run, champ) {
  const nm = k => run.names[k] || k, t = k => run.tot[k] || 0, res = [], fin = run.history[run.history.length - 1].matches[0], ru = fin.w === fin.a ? fin.b : fin.a;
  const isB = k => !!(run.bots && run.bots.has(k));
  res.push({ name: nm(champ), score: t(champ), place: 1, tier: "p1", bot: isB(champ) });
  if (ru) res.push({ name: nm(ru), score: t(ru), place: 2, tier: "p2", bot: isB(ru) });
  for (let s = run.history.length - 2; s >= 0; s--) {
    const h = run.history[s], slots = h.matches.length * 2;
    h.matches.filter(m => m.b).map(m => m.w === m.a ? m.b : m.a).sort((x, y) => t(y) - t(x)).forEach(k => res.push({ name: nm(k), score: t(k), place: slots / 2 + 1, tier: slots === 4 ? "p3" : "part", bot: isB(k) }));
  }
  ev.results = res; ev.state = "payout"; ev.endedAt = Date.now(); run.phase = "done"; saveGameCfg().catch(() => {});
  console.log("[Event] " + ev.name + " beendet, Sieger: " + nm(champ));
}
function evBrTick(ev, run, now) {
  const cfg = run.cfg[run.stageIdx], d = cfg.discs[run.discIdx];
  if (run.phase === "play" && evIsDuel(d) && now < run.phaseEnd) { const ms = run.matches.filter(m => m.b && m.duel); if (ms.length && ms.every(m => m.duel.res)) run.phaseEnd = Math.min(run.phaseEnd, Math.max.apply(null, ms.map(m => m.duel.overAt)) + 2500); }
  if (run.phase === "play" && d.mode === "time" && now < run.phaseEnd && now - run.playStart > 2500) { const l = Object.values(run.ps); if (l.length && l.every(s => s.fin)) run.phaseEnd = now; }
  if (now < run.phaseEnd) return;
  if (run.phase === "intro") {
    run.ps = {};
    run.matches.forEach(m => [m.a, m.b].forEach(k => { if (!k || !m.b) return; const kk = run.kicked.has(k); run.ps[k] = { score: kk ? -1 : 0, correct: kk ? -1 : 0, streak: 0, lastAt: 0, pen: 0, fin: kk, time: 0 }; }));
    run.q = {}; run.phase = "play"; run.playStart = now; run.phaseEnd = now + (process.env.EV_FAST ? (evIsDuel(d) ? 25 : EV_ROUND_SEC) : d.sec) * 1000;
    if (evIsDuel(d)) evDuelStart(run, d, now);
  } else if (run.phase === "play") evBrDiscEnd(ev, run, d, now);
  else if (run.phase === "dres") { if (run.discIdx < cfg.discs.length - 1) { run.discIdx++; run.phase = "intro"; run.phaseEnd = now + EV_INTRO_SEC * 1000; } else evBrStageEnd(ev, run, now); }
  else if (run.phase === "result") evBrNextStage(ev, run, now);
}
function evTick() {
  const now = Date.now();
  for (const ev of evStore()) {
    try {
      if (ev.state === "open" && ((ev.start && now >= ev.start) || (ev.startFull && ev.entrants.length >= ev.maxPlayers))) evBegin(ev);
      else if (ev.state === "running") {
        const run = evRun.get(ev.id);
        if (!run) { ev.state = "cancelled"; ev.reason = "Server neu gestartet"; saveGameCfg().catch(() => {}); continue; }
        if (run.fmt === "bracket") { if (run.phase === "play") evBotsPlay(ev, run, now); evBrTick(ev, run, now); continue; }
        if (run.phase === "play" && now < run.phaseEnd) evBotsPlay(ev, run, now);
        if (now < run.phaseEnd) continue;
        if (run.phase === "intro") { run.phase = "play"; run.phaseEnd = now + (process.env.EV_FAST ? EV_ROUND_SEC : evDiscs(ev.rounds[run.roundIdx])[0].sec) * 1000; run.q = {}; evTwStart(run, evDiscs(ev.rounds[run.roundIdx])[0], now); if (run.tw && process.env.EV_FAST) run.tw.sec = EV_ROUND_SEC; evHdStart(run, evDiscs(ev.rounds[run.roundIdx])[0], now); }
        else if (run.phase === "play") evEndRound(ev, run);
        else if (run.phase === "result") { run.roundIdx++; run.phase = "intro"; run.phaseEnd = now + EV_INTRO_SEC * 1000; }
      }
    } catch (e) { console.error("evTick", e); }
  }
}
setInterval(evTick, 1000);
// Wach-Ping: Render (Gratis) schlaeft nach ~15 Min ohne Besucher. Der Server ruft sich selbst ueber die oeffentliche Adresse auf (zaehlt dort als Besuch).
// Nur aktiv, wenn RENDER_EXTERNAL_URL (setzt Render selbst) oder KEEPALIVE_URL gesetzt ist. Aus: KEEPALIVE=off
(() => {
  const url = process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!url || process.env.KEEPALIVE === "off") return;
  const ping = () => { try { fetch(url.replace(/\/$/, "") + "/api/features", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {}); } catch (e) {} };
  setInterval(ping, 8 * 60 * 1000); console.log("Wach-Ping aktiv: " + url);
})();
function evMathQ(n, lvl) {
  const lv = Math.min(4, Math.max((lvl || 1) - 1, Math.floor(n / 3))), r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const ops = [() => { const a = r(3, 20), b = r(3, 20); return [a + " + " + b, a + b]; }, () => { const a = r(10, 40), b = r(2, 9); return [a + " − " + b, a - b]; }, () => { const a = r(2, 9), b = r(2, 9); return [a + " × " + b, a * b]; }, () => { const a = r(12, 59), b = r(12, 59); return [a + " + " + b, a + b]; }, () => { const a = r(11, 19), b = r(3, 9); return [a + " × " + b, a * b]; }];
  const pool = ops.slice(0, 2 + lv); return pool[Math.floor(Math.random() * pool.length)]();
}
function evCheck(q, a) {
  if (q.kind === "order") { if (String(a) === String(q.seq[q.i])) { q.i++; q.pub.done.push(String(a)); return q.i >= q.seq.length ? "solved" : "step"; } return "wrong"; }
  const x = q.kind === "hilo" ? String(a) : Number(a); return x === q.ans ? "solved" : "wrong";
}
function evNewQ(ev, run, k, disc, nc) {
  const rd = disc || evDiscs(ev.rounds[run.roundIdx])[0], t = Date.now();
  if (rd.type === "taboo" && run.tw) return { kind: "word", t, pub: { kind: "word", len: run.tw.word.length, cat: run.tw.cat, rows: [], max: 5, done: false, won: false } };
  if (nc == null) nc = run.correct && run.correct[k] || 0;
  if (rd.type === "mix") { const ts = ["quiz", "bio", "vocab", "hilo", "math", "order", "sort", "chrono"]; return evNewQ(ev, run, k, Object.assign({}, rd, { type: ts[Math.floor(Math.random() * ts.length)], topic: "" }), nc); }
  if (rd.type === "order") {
    const lvl = rd.level || 1, cnt = Math.min(9, 4 + lvl + Math.floor(nc / 4)), mx = [20, 100, 500, 1000][lvl - 1], rules = lvl === 1 ? ["asc", "desc"] : ["asc", "desc", "even", "odd"], rule = rules[Math.floor(Math.random() * rules.length)];
    const pool = new Set(); while (pool.size < cnt) pool.add(1 + Math.floor(Math.random() * mx));
    let nums = [...pool]; if (rule === "even" || rule === "odd") { const want = rule === "even" ? 0 : 1; if (nums.filter(x => x % 2 === want).length < 3) { nums = nums.map((x, i) => i < 3 ? (x % 2 === want ? x : (x + 1 > mx ? x - 1 : x + 1)) : x); nums = [...new Set(nums)]; } }
    const tgt = rule === "even" || rule === "odd" ? nums.filter(x => x % 2 === (rule === "even" ? 0 : 1)) : nums, seq = tgt.slice().sort((a, b) => rule === "desc" ? b - a : a - b);
    const title = { asc: "Tippe aufsteigend (klein → groß)", desc: "Tippe absteigend (groß → klein)", even: "Nur die geraden Zahlen, aufsteigend", odd: "Nur die ungeraden Zahlen, aufsteigend" }[rule];
    return { kind: "order", t, seq: seq.map(String), i: 0, pub: { kind: "order", title, items: evShuffle(nums).map(x => ({ id: String(x), t: String(x) })), done: [] } };
  }
  if (rd.type === "sort" || rd.type === "chrono") {
    const grp = rd.type === "sort" ? "ordering" : "chronology", keys = Object.keys(DATASETS[grp] || {}), key = rd.topic && DATASETS[grp][rd.topic] ? rd.topic : keys[Math.floor(Math.random() * keys.length)], ds = DATASETS[grp][key];
    const cnt = 4 + (nc >= 6 ? 1 : 0), vals = new Set(), pick = [];
    evShuffle(ds.items).forEach(it => { if (pick.length < cnt && !vals.has(it.value)) { vals.add(it.value); pick.push(it); } });
    const desc = ds.order === "desc", seq = pick.slice().sort((a, b) => desc ? b.value - a.value : a.value - b.value);
    const unit = ds.unit || "", title = (rd.type === "chrono" ? "Chronologisch: " : "Sortiere: ") + String(ds.label).replace(/^[^:]*:\s*/, "") + " – " + (desc ? "höchster Wert zuerst" : "niedrigster Wert zuerst") + (unit ? " (" + unit + ")" : "");
    return { kind: "order", t, seq: seq.map(x => String(x.id)), i: 0, pub: { kind: "order", title, items: evShuffle(pick).map(x => ({ id: String(x.id), t: x.name })), done: [] } };
  }
  if (rd.type === "bio" && EV_BIO.length) {
    const q = shuffleAnswerOrder(EV_BIO[Math.floor(Math.random() * EV_BIO.length)]); return { kind: "quiz", t, ans: q.c, pub: { kind: "quiz", q: q.q, a: q.a, cat: q.cat || "Biologie" } };
  }
  if (rd.type === "vocab" && EV_VOC.length > 8) {
    const okW = x => x.en.length <= 22 && !/\.\.\./.test(x.en), isV = x => /^to /.test(x.en);
    let w; do { w = EV_VOC[Math.floor(Math.random() * EV_VOC.length)]; } while (!okW(w));
    const opts = new Set([w.en]); let g = 0;
    while (opts.size < 4 && g++ < 200) { const o = EV_VOC[Math.floor(Math.random() * EV_VOC.length)]; if (o.en !== w.en && o.de !== w.de && okW(o) && (g > 120 || isV(o) === isV(w))) opts.add(o.en); }
    const a = evShuffle([...opts]); return { kind: "quiz", t, ans: a.indexOf(w.en), pub: { kind: "quiz", q: "Was heißt „" + w.de + "“ auf Englisch?", a, cat: "Vokabeln" } };
  }
  if (rd.type === "quiz" || rd.type === "bio" || rd.type === "vocab") {
    const kp = rd.klasse > 0 && KLASSE_QUESTIONS[rd.klasse] && KLASSE_QUESTIONS[rd.klasse].length ? KLASSE_QUESTIONS[rd.klasse] : QUIZ_QUESTIONS;
    const q = shuffleAnswerOrder(kp[Math.floor(Math.random() * kp.length)]); return { kind: "quiz", t, ans: q.c, pub: { kind: "quiz", q: q.q, a: q.a, cat: q.cat || "" } };
  }
  if (rd.type === "hilo") {
    const keys = Object.keys(DATASETS.higherLower || {}), key = rd.topic || keys[Math.floor(Math.random() * keys.length)], ds = DATASETS.higherLower[key], it = ds.items;
    let a, b, g = 0; do { a = it[Math.floor(Math.random() * it.length)]; b = it[Math.floor(Math.random() * it.length)]; } while ((a === b || a.value === b.value) && ++g < 50);
    return { kind: "hilo", t, ans: b.value > a.value ? "h" : "l", pub: { kind: "hilo", topic: String(ds.label).replace(/^Higher or Lower:\s*/, ""), unit: ds.unit || "", a: { name: a.name, value: a.value }, b: { name: b.name } } };
  }
  const [text, val] = evMathQ(nc, rd.level); return { kind: "math", t, ans: val, pub: { kind: "math", text } };
}
function evTier(r, i) { return r.tier || (i === 0 ? "p1" : i === 1 ? "p2" : i === 2 ? "p3" : "part"); }
function evBrVal(mode, s, count, type) { if (EVDUEL.TYPES[type]) return s.score >= 100 ? "1" : s.score >= 50 ? "½" : "0"; return mode === "time" ? (s.fin ? (s.time / 1000).toFixed(1) + " s" : Math.max(0, s.correct) + "/" + count) : mode === "tasks" ? String(Math.max(0, s.correct)) : String(Math.max(0, s.score)); }
function evBrView(ev, run, k, isMe) {
  const cfg = run.cfg[run.stageIdx], d = cfg.discs[run.discIdx], nm = x => x ? (run.names[x] || x) : null;
  const mm = run.matches.find(m => m.a === k || m.b === k), meA = !!mm && mm.a === k, oppK = mm ? (meA ? mm.b : mm.a) : null, ps = run.ps[k], op = oppK ? run.ps[oppK] : null;
  const showRes = run.phase === "dres" || run.phase === "result", hide = ev.secret !== false && run.phase === "intro";
  return { fmt: "bracket", stageIdx: run.stageIdx, total: run.cfg.length, stageName: evStageName(run.matches.length * 2), phase: run.phase, phaseEnd: run.phaseEnd, discIdx: run.discIdx, discTotal: cfg.discs.length,
    isDuel: !hide && evIsDuel(d), duel: !hide && evIsDuel(d) && (run.phase === "play" || run.phase === "dres") && mm && mm.b && mm.duel ? EVDUEL.view(mm.duel, meA ? "a" : "b") : null,
    roundLabel: hide ? "" : evDiscLabel(d), mode: hide ? "" : d.mode, count: hide ? 0 : d.count, sec: hide ? 0 : d.sec, hidden: hide, alive: run.alive.size, me: isMe, meAlive: run.alive.has(k), meBye: !!mm && !mm.b, opp: nm(oppK),
    meScore: ps ? Math.max(0, ps.score) : 0, meCorrect: ps ? Math.max(0, ps.correct) : 0, meFin: !!(ps && ps.fin), meTime: ps && ps.fin ? ps.time : 0, oppScore: op ? Math.max(0, op.score) : 0, oppCorrect: op ? Math.max(0, op.correct) : 0, oppFin: !!(op && op.fin),
    matches: run.matches.map(m => ({ a: nm(m.a), b: nm(m.b), w: m.winner ? nm(m.winner) : null, wins: m.wins || null, d: showRes ? m.res.map(r => ({ a: evBrVal(d.mode, r.a, d.count, d.type), b: evBrVal(d.mode, r.b, d.count, d.type), w: r.w })) : [], mine: m === mm })),
    history: run.history.map(h => ({ name: h.name, matches: h.matches.map(m => ({ a: nm(m.a), b: nm(m.b), w: nm(m.w) })) })), lastElim: [], board: [], nextElim: 0 };
}
function evView(ev, userName) {
  const run = evRun.get(ev.id), k = evUserKey(userName), me = userName ? ev.entrants.find(e => evUserKey(e.name) === k) : null;
  const v = { ok: true, id: ev.id, name: ev.name, state: ev.state, start: ev.start, now: Date.now(), maxPlayers: ev.maxPlayers, minPlayers: ev.minPlayers, entrants: ev.entrants.length, joined: !!me, prizes: ev.prizes, format: ev.format || "royale", botFill: !!ev.botFill, botTo: ev.botTo || ev.size || ev.maxPlayers, size: ev.size || ev.maxPlayers, secret: ev.secret !== false, rounds: ev.format === "bracket" ? ev.rounds.map((r, i) => evStageName(Math.pow(2, ev.rounds.length - i)) + ": " + (ev.secret !== false ? "🎲 " + Array(evDiscs(r).length).fill("???").join(" + ") : evRoundLabel(r))) : ev.rounds.map((r, i) => ev.secret !== false ? "🎲 ???" : evRoundLabel(r)), reason: ev.reason || "" };
  v.startFull = !!ev.startFull; { const uu = userName ? findUserByName(userName) : null; v.canStart = ev.state === "open" && !!uu && userRole(uu) === "mod"; }
  if (ev.state === "open") v.names = ev.entrants.slice(0, 40).map(e => e.name);
  if (run && ev.state === "running" && run.fmt === "bracket") v.run = evBrView(ev, run, k, !!me);
  else if (run && ev.state === "running") {
    const rk = evRank(run, Object.keys(run.score)), alive = run.alive;
    v.run = { roundIdx: run.roundIdx, total: ev.rounds.length, phase: run.phase, phaseEnd: run.phaseEnd, alive: alive.size, hidden: ev.secret !== false && run.phase === "intro", roundLabel: ev.secret !== false && run.phase === "intro" ? "" : evRoundLabel(ev.rounds[run.roundIdx]), lastElim: run.lastElim,
      board: rk.slice(0, 8).map(x => ({ name: run.names[x], score: run.score[x], alive: alive.has(x) })), meAlive: alive.has(k), meRankAlive: rk.filter(x => alive.has(x)).indexOf(k) + 1, hd: run.hd && run.phase === "play" ? { game: run.hd.game, best: run.hd.best[k] || 0, w: run.hd.w } : null,
      tw: run.tw && (run.phase === "play" || run.phase === "result") && evDiscs(ev.rounds[run.roundIdx])[0].type === "taboo" ? { len: run.tw.word.length, cat: run.tw.cat, hints: run.tw.hints.slice(0, Math.min(5, 1 + Math.floor((Date.now() - run.tw.start) / (run.tw.sec * 200)))), solved: run.tw.solved.map(x => run.names[x]), meSolved: run.tw.solved.includes(k), feed: run.tw.feed.slice(-8).map(f => ({ n: f.n, t: f.t || "", ok: !!f.solved })), word: run.phase === "result" ? run.tw.word : "" } : null, meScore: run.score[k] || 0, meRank: rk.indexOf(k) + 1, me: !!me, nextElim: run.roundIdx < ev.rounds.length - 1 && alive.size > 2 ? Math.min(Math.max(1, Math.floor(alive.size * 0.25)), alive.size - 2) : 0 };
  }
  if ((ev.state === "payout" || ev.state === "done") && ev.results) {
    v.results = ev.results.slice(0, 10); const mi = ev.results.findIndex(r => evUserKey(r.name) === k); v.myPlace = mi >= 0 ? (ev.results[mi].place || mi + 1) : 0;
    if (ev.state === "done" && mi >= 0) { v.myPrize = ev.prizes[evTier(ev.results[mi], mi)]; }
  }
  return v;
}
function evVisible() {
  const l = evStore(), now = Date.now();
  return l.find(e => e.state === "running") || l.filter(e => e.state === "open").sort((a, b) => (a.start || 9e15) - (b.start || 9e15))[0] || l.filter(e => (e.state === "payout" || e.state === "done") && now - (e.endedAt || 0) < 3 * 3600000).sort((a, b) => b.endedAt - a.endedAt)[0] || null;
}
function evApi(p, ip) {
  if (!usersLoaded) return { ok: false, unavailable: true };
  const user = p.token ? findUserByToken(p.token) : null, name = user ? String(user.username || "") : "", act = p.action || "status";
  const ev = p.id ? evGet(String(p.id)) : evVisible();
  if (act === "status") return ev && ev.state !== "draft" && ev.state !== "cancelled" ? evView(ev, name) : { ok: true, none: true };
  if (!ev || ev.state === "draft") return { ok: false, error: "Event nicht gefunden." };
  if (!user || isRestricted(user)) return { ok: false, error: "Bitte anmelden." };
  const k = evUserKey(name);
  if (act === "join") {
    if (ev.state !== "open") return { ok: false, error: "Anmeldung ist nicht offen." };
    if (!ev.entrants.some(e => evUserKey(e.name) === k)) { if (ev.entrants.length >= ev.maxPlayers) return { ok: false, error: "Das Event ist voll." }; ev.entrants.push({ name, t: Date.now() }); statHit("event_join"); maniaSaveSoon(); }
    return evView(ev, name);
  }
  if (act === "startnow") { if (userRole(user) !== "mod" || ev.state !== "open") return { ok: false, error: "Nicht erlaubt." }; ev.start = Date.now(); console.log("[Event] von Mod gestartet: " + ev.name + " (" + user.username + ")"); evBegin(ev); return evView(ev, name); }
  if (act === "leave") { if (ev.state === "open") { ev.entrants = ev.entrants.filter(e => evUserKey(e.name) !== k); maniaSaveSoon(); } return evView(ev, name); }
  const run = evRun.get(ev.id);
  if (run && run.fmt === "bracket" && act === "move") {
    const d = run.cfg[run.stageIdx].discs[run.discIdx], mm = run.matches.find(m => m.b && m.duel && (m.a === k || m.b === k));
    if (ev.state !== "running" || run.phase !== "play" || !evIsDuel(d) || !mm || !run.alive.has(k)) return Object.assign(evView(ev, name), { noPlay: true });
    const du = mm.duel, side = mm.a === k ? "a" : "b";
    if (du.res || (!du.st.pend && Number(p.rev) !== du.rev)) return evView(ev, name);
    if (EVDUEL.play(du, side, p.mi)) { if (du.res) evDuelApply(run, mm, Date.now()); else du.botAt = Date.now() + 700 + Math.random() * 1200; }
    return evView(ev, name);
  }
  if (run && run.fmt === "bracket" && (act === "question" || act === "answer")) {
    const ps = run.ps[k], d = run.cfg[run.stageIdx].discs[run.discIdx];
    if (evIsDuel(d)) return Object.assign(evView(ev, name), { noPlay: true });
    if (ev.state !== "running" || run.phase !== "play" || !ps || ps.fin || !run.alive.has(k)) return Object.assign(evView(ev, name), { noPlay: true });
    if (act === "question") { if (!run.q[k]) run.q[k] = evNewQ(ev, run, k, d, ps.correct); return Object.assign(evView(ev, name), { q: run.q[k].pub }); }
    const q = run.q[k]; if (!q) { run.q[k] = evNewQ(ev, run, k, d, ps.correct); return Object.assign(evView(ev, name), { q: run.q[k].pub }); }
    if (Date.now() - q.t < 250) return Object.assign(evView(ev, name), { q: q.pub, tooFast: true });
    const chk = evCheck(q, p.a), ok = chk === "solved", now = Date.now();
    if (chk === "step") return Object.assign(evView(ev, name), { q: q.pub, step: true });
    if (ok) {
      ps.streak++; ps.correct++; ps.score += 10 + Math.min(5, ps.streak - 1) * 2; ps.lastAt = now;
      if (d.mode === "time" && ps.correct >= d.count) { ps.fin = true; ps.time = now - run.playStart + ps.pen * 1000; return Object.assign(evView(ev, name), { noPlay: true, ok: true }); }
    } else { ps.streak = 0; if (d.mode === "time") ps.pen += 3; }
    run.q[k] = evNewQ(ev, run, k, d, ps.correct);
    return Object.assign(evView(ev, name), { q: run.q[k].pub, ok, streak: ps.streak });
  }
  if (run && run.fmt !== "bracket" && (act === "hdbegin" || act === "hdscore")) {
    if (ev.state !== "running" || run.phase !== "play" || !run.hd || !run.alive.has(k)) return Object.assign(evView(ev, name), { noPlay: true });
    const now = Date.now();
    if (act === "hdbegin") run.hd.att[k] = now; else evHdScore(run, k, p.score, p.fin === true, now);
    return evView(ev, name);
  }
  if ((act === "question" || act === "answer") && (!run || ev.state !== "running" || run.phase !== "play" || !run.alive.has(k))) return Object.assign(evView(ev, name), { noPlay: true });
  if (act === "question") { if (!run.q[k]) run.q[k] = evNewQ(ev, run, k); return Object.assign(evView(ev, name), { q: run.q[k].pub }); }
  if (act === "answer") {
    const q = run.q[k]; if (!q) { run.q[k] = evNewQ(ev, run, k); return Object.assign(evView(ev, name), { q: run.q[k].pub }); }
    if (q.kind === "word") {
      const pb = q.pub, tw = run.tw; if (!tw || pb.done) return Object.assign(evView(ev, name), { q: pb, step: true });
      const guess = String(p.a || "").toUpperCase().replace(/[^A-ZÄÖÜ]/g, "");
      if (guess.length !== tw.word.length) return Object.assign(evView(ev, name), { q: pb, step: true, rejected: "length" });
      const now = Date.now(); pb.rows.push({ w: guess, s: evTwColors(tw.word, guess) });
      if (guess === tw.word) { pb.done = true; pb.won = true; pb.word = tw.word; evTwSolve(run, k, pb.rows.length, now); }
      else { tw.feed.push({ n: name, t: guess, at: now }); if (tw.feed.length > 40) tw.feed.shift(); if (pb.rows.length >= 5) { pb.done = true; pb.won = false; pb.word = tw.word; } }
      return Object.assign(evView(ev, name), { q: pb, step: true });
    }
    if (Date.now() - q.t < 250) return Object.assign(evView(ev, name), { q: q.pub, tooFast: true });
    const chk = evCheck(q, p.a), ok = chk === "solved";
    if (chk === "step") return Object.assign(evView(ev, name), { q: q.pub, step: true });
    if (!run.correct) run.correct = {};
    if (ok) { run.streak[k] = (run.streak[k] || 0) + 1; run.correct[k] = (run.correct[k] || 0) + 1; run.score[k] += evDiscs(ev.rounds[run.roundIdx])[0].mode === "tasks" ? 1 : 10 + Math.min(5, run.streak[k] - 1) * 2; run.lastAt[k] = Date.now(); } else run.streak[k] = 0;
    run.q[k] = evNewQ(ev, run, k);
    return Object.assign(evView(ev, name), { q: run.q[k].pub, ok, streak: run.streak[k] });
  }
  return { ok: false };
}
// Einladungslink: Besucher geben nur einen Namen ein, bekommen ein Konto (zufaelliges Passwort, Zugang bleibt auf dem Geraet) und sind direkt angemeldet.
async function evGuestJoin(p, ip, lang) {
  if (!usersLoaded) return { ok: false, unavailable: true };
  const ev = p.id ? evGet(String(p.id)) : evVisible();
  if (!ev || ev.state === "draft" || ev.state === "cancelled") return { ok: false, error: "Dieses Event gibt es nicht (mehr)." };
  if (ev.state !== "open") return { ok: false, error: "Die Anmeldung ist schon geschlossen." };
  if (ev.entrants.length >= ev.maxPlayers) return { ok: false, error: "Das Event ist voll." };
  const r = await registerUser(String(p.name || ""), crypto.randomBytes(12).toString("hex"), ip, lang, null);
  if (!r.ok) return r;
  const u = findUserByToken(r.token), name = u ? String(u.username) : String(r.profile.username);
  if (u) u.quickJoin = ev.id;
  if (ev.state === "open" && !ev.entrants.some(e => evUserKey(e.name) === evUserKey(name))) { ev.entrants.push({ name, t: Date.now() }); statHit("event_join"); }
  maniaSaveSoon(); await saveUsers();
  return { ok: true, token: r.token, profile: r.profile, bonus: r.bonus, view: evView(ev, name) };
}
function evGrant(u, z, why) {
  if (!u) return;
  const prize = z || {};
  if (prize.c > 0) u.stats.coins = (u.stats.coins || 0) + prize.c;
  if (prize.z > 0) { const st = zpState(u), mk = zpMonthKey(); st.total += prize.z; st.mon[mk] = (st.mon[mk] || 0) + prize.z; }
  try { notifyAccount(u.username, { type: "eventPrize", coins: prize.c || 0, zp: prize.z || 0, why }); } catch (e) {}
}
async function adminEvents(key, ip, p) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  if (!usersLoaded) return { ok: false, error: "Konten noch nicht geladen." };
  const act = p.action || "list", L = evStore();
  const view = (extra) => Object.assign({ ok: true, types: EV_TYPES, modes: EV_MODES, topics: evHiloTopics(), sortTopics: Object.entries(DATASETS.ordering || {}).map(([k, v]) => ({ k, label: String(v.label || k).replace(/^[^:]*:\s*/, "") })), chronoTopics: Object.entries(DATASETS.chronology || {}).map(([k, v]) => ({ k, label: String(v.label || k).replace(/^[^:]*:\s*/, "") })), roundSec: EV_ROUND_SEC, events: L.map(e => { const run = evRun.get(e.id); return Object.assign({}, e, { live: run && e.state === "running" && run.fmt === "bracket" ? { fmt: "bracket", stage: evStageName(run.matches.length * 2), stageIdx: run.stageIdx, phase: run.phase, phaseEnd: run.phaseEnd, alive: run.alive.size, matches: run.matches.map(m => ({ a: run.names[m.a], b: m.b ? run.names[m.b] : null, w: m.winner ? run.names[m.winner] : null })) } : run && e.state === "running" ? { roundIdx: run.roundIdx, phase: run.phase, phaseEnd: run.phaseEnd, alive: run.alive.size, board: evRank(run, Object.keys(run.score)).slice(0, 12).map(x => ({ name: run.names[x], score: run.score[x], alive: run.alive.has(x) })) } : null }); }) }, extra || {});
  const done = async (extra) => (await saveGameCfg()) ? view(extra) : { ok: false, error: "Speichern fehlgeschlagen." };
  if (act === "list") return view();
  if (act === "save") {
    const c = evClean(p.ev || {}); if (c.error) return { ok: false, error: c.error };
    let ev = p.ev && p.ev.id ? evGet(String(p.ev.id)) : null;
    if (ev) { if (ev.state !== "draft") return { ok: false, error: "Nur Entwürfe lassen sich bearbeiten." }; Object.assign(ev, c.ev); }
    else { ev = Object.assign({ id: "e" + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36), state: "draft", entrants: [], created: Date.now() }, c.ev); L.push(ev); }
    return done({ savedId: ev.id });
  }
  const ev = evGet(String(p.id || "")); if (!ev) return { ok: false, error: "Event nicht gefunden." };
  if (act === "publish") { if (ev.state !== "draft") return { ok: false, error: "Schon veröffentlicht." }; if (ev.start && ev.start < Date.now() + 60000) return { ok: false, error: "Startzeit muss in der Zukunft liegen." };  ev.state = "open"; console.log("[Event] veröffentlicht: " + ev.name); return done(); }
  if (act === "startnow") { if (ev.state !== "open") return { ok: false, error: "Nur offene Events." }; ev.start = Date.now(); evBegin(ev); return done(); }
  if (act === "cancel") { if (!["open", "running", "draft"].includes(ev.state)) return { ok: false, error: "Nicht möglich." }; ev.state = "cancelled"; ev.reason = "Vom Admin abgesagt"; evRun.delete(ev.id); return done(); }
  if (act === "delete") { if (!["draft", "cancelled", "done"].includes(ev.state)) return { ok: false, error: "Erst absagen." }; gameCfg.events = L.filter(e => e !== ev); return done(); }
  if (act === "skip") { const run = evRun.get(ev.id); if (run && ev.state === "running") run.phaseEnd = Date.now(); return view(); }
  if (act === "kick") {
    const k = evUserKey(p.name); ev.entrants = ev.entrants.filter(e => evUserKey(e.name) !== k); const run = evRun.get(ev.id);
    if (run && run.fmt === "bracket") { run.kicked.add(k); if (run.ps[k]) { run.ps[k].fin = true; run.ps[k].score = -1; run.ps[k].correct = -1; } } if (run && run.fmt === "bracket") { const mm = run.matches.find(m => m.b && m.duel && !m.duel.res && (m.a === k || m.b === k)); if (mm && run.phase === "play") { EVDUEL.finish(mm.duel, mm.a === k ? "b" : "a", "kick"); evDuelApply(run, mm, Date.now()); } }
    else if (run && run.alive.has(k)) { run.alive.delete(k); run.out.push({ k, round: run.roundIdx }); run.score[k] = -1; }
    return done();
  }
  if (act === "payout") {
    if (ev.state !== "payout" || !ev.results) return { ok: false, error: "Noch nichts auszuzahlen." };
    ev.results.forEach((r, i) => { if (r.bot || /^🤖/.test(r.name)) return; const u = findUserByName(r.name); evGrant(u, ev.prizes[evTier(r, i)], "event:" + ev.name); });
    ev.state = "done"; ev.paid = Date.now();
    if (!(await saveUsers())) return { ok: false, error: "Konten speichern fehlgeschlagen." };
    console.log("[Event] ausgezahlt: " + ev.name); return done();
  }
  return { ok: false, error: "Unbekannt." };
}

/* ============================================================================
   FEEDBACK: Spieler schicken Lob/Kritik/Fehler/Ideen (1x pro Tag), der Admin liest nach und belohnt Hilfreiches von Hand.
   ============================================================================ */
const FB_KINDS = { good: "Gut", bad: "Schlecht", bug: "Fehler", idea: "Idee" };
const FB_REWARD = { c: 50, z: 100 };
function fbStore() { if (!Array.isArray(gameCfg.feedback)) gameCfg.feedback = []; return gameCfg.feedback; }
function feedbackApi(p, ip) {
  if (!usersLoaded) return { ok: false, unavailable: true };
  const user = p.token ? findUserByToken(p.token) : null;
  if (!user || isRestricted(user)) return { ok: false, error: "Bitte anmelden." };
  const day = todayDateString(), name = String(user.username || ""), k = name.toLowerCase();
  const mine = fbStore().filter(f => f.user.toLowerCase() === k).slice(-5).reverse().map(f => ({ t: f.t, kind: f.kind, area: f.area, text: f.text.slice(0, 120), rewarded: !!f.rewarded }));
  const can = user.fbDay !== day;
  if (p.action !== "send") return { ok: true, can, mine, reward: FB_REWARD };
  if (!can) return { ok: false, error: "Heute hast du schon Feedback geschickt. Morgen gern wieder!", can: false, mine, reward: FB_REWARD };
  const kind = FB_KINDS[p.kind] ? String(p.kind) : "";
  const text = String(p.text || "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 600);
  const area = String(p.area || "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 40);
  if (!kind) return { ok: false, error: "Bitte wähle Gut, Schlecht, Fehler oder Idee." };
  if (text.length < 10) return { ok: false, error: "Bitte schreib etwas ausführlicher (mindestens 10 Zeichen)." };
  const L = fbStore();
  L.push({ id: "f" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), user: name, t: Date.now(), kind, area, text, state: "new", rewarded: 0 });
  if (L.length > 600) L.splice(0, L.length - 600);
  user.fbDay = day; statHit("feedback");
  saveGameCfg().catch(() => {}); saveUsers().catch(() => {});
  return { ok: true, sent: true, can: false, mine: [{ t: Date.now(), kind, area, text: text.slice(0, 120), rewarded: false }].concat(mine).slice(0, 5), reward: FB_REWARD };
}
async function adminFeedback(key, ip, p) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const act = p.action || "list", L = fbStore();
  const view = () => { const M = fbStore(); return { ok: true, reward: FB_REWARD, newCount: M.filter(f => f.state === "new").length, items: M.slice().reverse().slice(0, 200) }; };
  if (act === "list") return view();
  const f = L.find(x => x.id === String(p.id || "")); if (!f) return { ok: false, error: "Nicht gefunden." };
  if (act === "mark") { if (["new", "read", "kept"].includes(p.state)) f.state = p.state; return (await saveGameCfg()) ? view() : { ok: false, error: "Speichern fehlgeschlagen." }; }
  if (act === "delete") { gameCfg.feedback = L.filter(x => x !== f); return (await saveGameCfg()) ? view() : { ok: false, error: "Speichern fehlgeschlagen." }; }
  if (act === "reward") {
    if (f.rewarded) return { ok: false, error: "Schon belohnt." };
    const u = findUserByName(f.user); if (!u) return { ok: false, error: "Spieler nicht mehr vorhanden." };
    const c = Math.max(0, Math.min(5000, Math.floor(Number(p.c)))), z = Math.max(0, Math.min(5000, Math.floor(Number(p.z))));
    const g = { c: Number.isFinite(c) ? c : FB_REWARD.c, z: Number.isFinite(z) ? z : FB_REWARD.z };
    evGrant(u, g, "feedback"); f.rewarded = Date.now(); f.state = f.state === "new" ? "read" : f.state; f.rc = g.c; f.rz = g.z;
    if (!(await saveUsers())) return { ok: false, error: "Konten speichern fehlgeschlagen." };
    if (!(await saveGameCfg())) return { ok: false, error: "Speichern fehlgeschlagen." };
    console.log("[Feedback] belohnt: " + u.username + " +" + g.c + " / +" + g.z + " ZP"); return view();
  }
  return { ok: false, error: "Unbekannt." };
}
async function adminCloak(payload, ip, lang) {
  if (!adminOk(payload && payload.adminKey, ip)) return { ok: false, error: "Nicht verfügbar." };
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const user = findUserByToken(payload.token);
  if (!user) return errObj("notLoggedIn", lang);
  const on = !!payload.on;
  if (!!user.adminCloak === on) return { ok: true, on };
  user.adminCloak = on;
  if (on) cloakedNames.add(user.username.toLowerCase()); else cloakedNames.delete(user.username.toLowerCase());
  if (on) (user.friends || []).forEach(name => notifyAccount(name, { type: "friendOffline", username: user.username }));
  else if (accountIsOnline(user.username)) (user.friends || []).forEach(name => notifyAccount(name, { type: "friendOnline", username: user.username }));
  if (!(await saveUsers())) { user.adminCloak = !on; return serviceDownMsg(lang); }
  return { ok: true, on };
}
async function socialHandle(payload, lang) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const user = findUserByToken(payload && payload.token);
  if (!user) return errObj("notLoggedIn", lang);
  const net = String((payload && payload.network) || "");
  if (!Object.prototype.hasOwnProperty.call(SOCIAL_BONUS, net)) return errObj("invalidInput", lang);
  let h = String((payload && payload.handle) || "").trim().replace(/^@+/, "");
  user.socialHandles = Object.assign({}, user.socialHandles);
  if (!h) { delete user.socialHandles[net]; }
  else {
    if (!/^[A-Za-z0-9._]{2,40}$/.test(h)) return { ok: false, error: lang === "en" ? "Only letters, numbers, dot and underscore (2-40)." : "Nur Buchstaben, Zahlen, Punkt und Unterstrich (2-40)." };
    user.socialHandles[net] = h;
  }
  if (!(await saveUsers())) return serviceDownMsg(lang);
  return { ok: true, handles: user.socialHandles };
}
async function socialClaim(payload, lang) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const user = findUserByToken(payload && payload.token);
  if (!user) return errObj("notLoggedIn", lang);
  const net = String((payload && payload.network) || "");
  if (!Object.prototype.hasOwnProperty.call(SOCIAL_BONUS, net)) return errObj("invalidInput", lang);
  const step = payload.step === "claim" ? "claim" : "open";
  const claimed = () => Object.keys(user.social || {});
  if (user.social && user.social[net]) return { ok: true, already: true, balance: user.stats.coins || 0, claimed: claimed() };
  if (step === "open") {
    user.socialOpen = user.socialOpen || {};
    user.socialOpen[net] = Date.now();
    return { ok: true, claimed: claimed() };
  }
  const t = user.socialOpen && user.socialOpen[net];
  const now = Date.now();
  if (!t || now - t > SOCIAL_OPEN_MAX_MS) return { ok: false, error: lang === "en" ? "Tap the button first to open the profile." : "Tippe zuerst auf den Knopf, um das Profil zu öffnen." };
  if (now - t < SOCIAL_MIN_WAIT_MS) return { ok: false, tooEarly: true, error: lang === "en" ? "Take a moment to follow us first." : "Nimm dir kurz Zeit, uns zu folgen." };
  if (isRestricted(user)) return { ok: false, error: lang === "en" ? "Not available for this account." : "Für dieses Konto nicht verfügbar." };
  const amount = SOCIAL_BONUS[net];
  user.social = Object.assign({}, user.social, { [net]: now });
  user.stats.coins = (user.stats.coins || 0) + amount;
  if (!(await saveUsers())) { user.stats.coins -= amount; delete user.social[net]; return serviceDownMsg(lang); }
  return { ok: true, granted: amount, balance: user.stats.coins, claimed: claimed() };
}
// Admin: Konto pruefen / neues Passwort setzen ("Passwort vergessen"). Passwoerter sind nur als Hash
// gespeichert und lassen sich NICHT auslesen - nur neu setzen. Ohne newPassword nur Pruefung + aehnliche Namen.
async function adminSetPassword(username, newPassword, lang) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const raw = typeof username === "string" ? username.trim() : "";
  if (!raw) return { ok: false, error: lang === "en" ? "Enter a username." : "Benutzername eingeben." };
  const u = findUserByName(raw);
  if (!u) {
    const q = raw.toLowerCase();
    const similar = users.map(x => x.username).filter(n => n.toLowerCase().includes(q) || q.includes(n.toLowerCase())).slice(0, 8);
    return { ok: false, exists: false, similar, total: users.length, error: lang === "en" ? "No account with this name." : "Kein Konto mit diesem Namen." };
  }
  if (typeof newPassword !== "string" || !newPassword) return { ok: true, exists: true, username: u.username };
  if (newPassword.length < 6 || newPassword.length > 200) return errObj("passwordLength", lang);
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await hashPassword(newPassword, salt);
  u.salt = salt; u.passwordHash = hash; u.tokens = [];
  const uname = u.username.toLowerCase();
  for (const k of [...rlStore.keys()]) { if (k === "u|" + uname || k.startsWith("p|" + uname + "|")) rlStore.delete(k); }
  await saveUsers();
  return { ok: true, exists: true, username: u.username, changed: true };
}

/* ---- Passwort vergessen: persoenlicher Wiederherstellungs-Schluessel + Admin-Posteingang ----
   Der Schluessel wird nur als Hash gespeichert (wie das Passwort) und einmalig angezeigt.
   Anfrage -> Admin sieht Name/Klasse/Schach + "Schluessel gueltig" -> Admin gibt frei ->
   Spieler setzt sein neues Passwort selbst (Name + Schluessel). Kein Admin-Key im Spiel noetig. */
function makeRecoveryKey() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) { out += A[b[i] % A.length]; if (i % 4 === 3 && i < 11) out += "-"; }
  return out;
}
function normKey(k) { return String(typeof k === "string" ? k : "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24); }
async function recoveryKeyMatches(user, key) {
  const nk = normKey(key);
  if (!user || !user.recoverySalt || !user.recoveryHash || nk.length < 12) return false;
  const h = await hashPassword(nk, user.recoverySalt);
  const a = Buffer.from(h, "hex"), b = Buffer.from(user.recoveryHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function recoveryKeyStatus(token) {
  if (!usersLoaded) return { ok: false };
  const u = findUserByToken(token);
  if (!u) return { ok: false };
  return { ok: true, has: !!u.recoveryHash, since: u.recoveryAt || null };
}
async function recoveryKeyCreate(token, password, lang) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const u = findUserByToken(token);
  if (!u) return errObj("notLoggedIn", lang);
  if (typeof password !== "string" || password.length > 200) return errObj("loginFailed", lang);
  const kUser = "rk|" + u.username.toLowerCase();
  if (rlWait(kUser)) return errObj("tooManyAttempts", lang, "", "");
  if (hashInFlight >= MAX_HASH_IN_FLIGHT) return busyMsg(lang);
  hashInFlight++;
  let h; try { h = await hashPassword(password, u.salt); } finally { hashInFlight--; }
  const a = Buffer.from(h, "hex"), b = Buffer.from(u.passwordHash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { rlHit(kUser, 5, 10 * 60 * 1000, 10 * 60 * 1000); return errObj("loginFailed", lang); }
  const key = makeRecoveryKey();
  u.recoverySalt = crypto.randomBytes(16).toString("hex");
  u.recoveryHash = await hashPassword(normKey(key), u.recoverySalt);
  u.recoveryAt = Date.now();
  await saveUsers();
  return { ok: true, key };
}
// Spieler: Anfrage an den Admin. Antwort ist immer gleich (verraet nicht, ob es den Namen gibt).
async function forgotRequest(username, key, note, ip, lang, contact, handles) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const generic = { ok: true };
  if (rlHit("fr|" + ip, 6, 60 * 60 * 1000, 60 * 60 * 1000).lockedUntil > Date.now()) return errObj("tooManyRequests", lang);
  const u = findUserByLogin(typeof username === "string" ? username : "");
  if (!u) return generic;
  if (hashInFlight >= MAX_HASH_IN_FLIGHT) return busyMsg(lang);
  hashInFlight++;
  let keyOk = false; try { keyOk = key ? (/^\s*\d{3}\s?\d{3}\s*$/.test(String(key)) ? totpCheck(u, u.totpSecret, key, false) : await recoveryKeyMatches(u, key)) : false; } finally { hashInFlight--; }
  const prev = u.resetRequest;
  if (prev && prev.status === "approved" && keyOk) return { ok: true, status: "approved" };
  if (prev && prev.status === "approved") return generic; // Freigabe nie durch fremde Anfragen zuruecksetzen
  u.resetRequest = { at: Date.now(), note: String(note || "").slice(0, 200), contact: String(contact || "").slice(0, 120), handles: String(handles || "").slice(0, 120), keyOk: keyOk || !!(prev && prev.keyOk), hadKey: !!u.recoveryHash, status: "pending" };
  await saveUsers();
  return generic;
}
// Spieler: neues Passwort setzen - nur mit Schluessel UND Freigabe durch den Admin
async function forgotComplete(username, key, newPassword, ip, lang) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const kIp = "fc|" + ip;
  if (rlWait(kIp)) return errObj("tooManyAttempts", lang, "", "");
  const u = findUserByLogin(typeof username === "string" ? username : "");
  const bad = () => { rlHit(kIp, 8, 60 * 60 * 1000, 60 * 60 * 1000); return { ok: false, error: lang === "en" ? "Not possible. Check name and key, and wait for the admin's approval." : "Nicht möglich. Name und Schlüssel prüfen und auf die Freigabe des Admins warten." }; };
  if (!u || !u.resetRequest || u.resetRequest.status !== "approved") return bad();
  if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 200) return errObj("passwordLength", lang);
  if (hashInFlight >= MAX_HASH_IN_FLIGHT) return busyMsg(lang);
  hashInFlight++;
  let ok = false; try { ok = key ? (/^\s*\d{3}\s?\d{3}\s*$/.test(String(key)) ? (totpActive(u) && totpCheck(u, u.totpSecret, key, true)) : await recoveryKeyMatches(u, key)) : false; } finally { hashInFlight--; }
  if (!ok && u.resetRequest.adminOverride && Date.now() - (u.resetRequest.approvedAt || 0) < 48 * 3600 * 1000) ok = true;
  if (!ok) return bad();
  u.salt = crypto.randomBytes(16).toString("hex");
  u.passwordHash = await hashPassword(newPassword, u.salt);
  u.tokens = [];
  delete u.resetRequest;
  const uname = u.username.toLowerCase();
  for (const k of [...rlStore.keys()]) { if (k === "u|" + uname || k.startsWith("p|" + uname + "|")) rlStore.delete(k); }
  await saveUsers();
  return { ok: true, username: u.username };
}
function adminResetList(key, ip) {
  if (!adminOk(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const list = users.filter(u => u.resetRequest).map(u => {
    const s = u.stats || {};
    const ch = s.chess || {};
    return { username: u.username, at: u.resetRequest.at, note: u.resetRequest.note || "", contact: u.resetRequest.contact || "", handles: u.resetRequest.handles || "", lastSeen: u.lastSeenAt || u.lastSeen || 0, wins: s.wins || 0, losses: s.losses || 0, achvCount: Object.keys((s.achv && s.achv.unlocked) || {}).length, social: Object.keys(u.social || {}), accHandles: u.socialHandles || {}, lastCoin: ((u.coinLog || []).slice(-1)[0]) || null, keyOk: !!u.resetRequest.keyOk, hadKey: !!u.resetRequest.hadKey, status: u.resetRequest.status,
      klasse: s.klasse || 0, tier: s.tier || 0, score: s.score || 0, rounds: s.roundsPlayed || 0, coins: s.coins || 0,
      chessElo: ch.elo || ch.rating || null, createdAt: u.createdAt || null };
  }).sort((a, b) => b.at - a.at);
  return { ok: true, list };
}
async function adminResetDecide(key, ip, username, action, newPassword, lang) {
  if (!adminOk(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const u = findUserByName(username);
  if (!u || !u.resetRequest) return { ok: false, error: "Anfrage nicht gefunden." };
  if (action === "approve") { u.resetRequest.status = "approved"; u.resetRequest.approvedAt = Date.now(); if (!u.resetRequest.keyOk) u.resetRequest.adminOverride = true; /* Admin buergt fuer die Person, auch ohne Schluessel (48 Std. gueltig) */ }
  else if (action === "deny" || action === "delete") delete u.resetRequest;
  else return { ok: false, error: "Aktion unbekannt." };
  await saveUsers();
  return { ok: true };
}
async function adminResetAll(confirm, lang) {
  if (confirm !== "RESET") return errObj("invalidInput", lang);
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  // 1) Sicherung der kompletten Kontenliste VOR dem Loeschen
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  let backupName = "";
  try {
    if (USE_UPSTASH) {
      backupName = UPSTASH_USERS_KEY + "_backup_" + stamp;
      const res = await fetch(`${UPSTASH_URL}/set/${backupName}`, { method: "POST", headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "text/plain" }, body: JSON.stringify(users) });
      if (!res.ok) throw new Error("Upstash " + res.status);
    } else {
      backupName = USERS_FILE + ".before-reset-" + stamp;
      fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
      fs.writeFileSync(backupName, JSON.stringify(users, null, 1), "utf8");
    }
  } catch (e) {
    console.error("Reset abgebrochen, Sicherung fehlgeschlagen:", e.message);
    return { ok: false, error: lang === "en" ? "Backup failed - nothing was reset." : "Sicherung fehlgeschlagen - nichts wurde zurückgesetzt." };
  }
  // 2) Alle Konten auf Null (Name, Passwort, Anmeldung, Avatar und Freunde bleiben)
  users.forEach(u => {
    u.stats = defaultStats();
    if (u.avatar) u.stats.avatar = u.avatar;
    u.restricted = false;
  });
  if (!(await saveUsers())) return serviceDownMsg(lang);
  // 3) Marker fuer die Geraete (loescht lokale Staende + zeigt den Hinweis)
  resetMeta = { epoch: Date.now() };
  await saveResetMeta();
  console.warn("[ADMIN] Gesamt-Reset durchgefuehrt, Sicherung:", backupName);
  for (const set of onlineAccounts.values()) for (const ws of set) { try { send(ws, { type: "serverReset" }); } catch (e) {} }
  return { ok: true, accounts: users.length, backup: backupName };
}

const pendingInvites = new Map(); // nur Admin: Einladungen an Offline-Freunde, werden beim naechsten Login zugestellt (nicht gespeichert)
const PENDING_INVITE_MS = 30 * 60 * 1000;
async function partyInvite(token, friendName, code, game, lang, isAdmin) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  const friend = findUserByName(friendName);
  if (!friend || !areFriends(me, friend)) return errObj("inviteNotFriend", lang);
  if (rlHit("inv|" + me.username.toLowerCase(), 21, 60000, 30000).lockedUntil > Date.now()) return errObj("tooManyRequests", lang);
  if (rlHit("invp|" + me.username.toLowerCase() + "|" + friend.username.toLowerCase(), 2, 15000, 15000).lockedUntil > Date.now()) return errObj("inviteTooOften", lang);
  const cleanCode = typeof code === "string" ? code.trim().toUpperCase() : "";
  const kind = game === "ttt" ? "ttt" : game === "fourups" ? "fourups" : "party";
  if (kind === "party") {
    const room = rooms.get(cleanCode);
    if (!room || room.phase !== "lobby") return errObj("inviteRoomGone", lang);
  } else if (kind === "fourups" ? !fuRooms.has(cleanCode) : !/^[A-Z0-9]{4,8}$/.test(cleanCode)) return errObj("inviteRoomGone", lang);
  if (!accountIsOnline(friend.username)) {
    if (!isAdmin) return errObj("inviteOffline", lang);
    const key = friend.username.toLowerCase();
    const list = (pendingInvites.get(key) || []).filter(i => i.exp > Date.now() && i.roomCode !== cleanCode);
    list.push({ kind, roomCode: cleanCode, from: friendSummary(me), exp: Date.now() + PENDING_INVITE_MS });
    pendingInvites.set(key, list.slice(-5));
    return { ok: true, queued: true };
  }
  notifyAccount(friend.username, { type: "partyInvite", kind, roomCode: cleanCode, from: friendSummary(me) });
  return { ok: true };
}
async function friendsDecline(token, fromUsername, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  const from = findUserByName(fromUsername);
  me.incomingRequests = (me.incomingRequests || []).filter(n => n.toLowerCase() !== (fromUsername||"").toLowerCase());
  if (from) from.outgoingRequests = (from.outgoingRequests || []).filter(n => n.toLowerCase() !== me.username.toLowerCase());
  await saveUsers();
  return { ok: true };
}
async function friendsCancel(token, targetUsername, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  const target = findUserByName(targetUsername);
  me.outgoingRequests = (me.outgoingRequests || []).filter(n => n.toLowerCase() !== (targetUsername||"").toLowerCase());
  if (target) target.incomingRequests = (target.incomingRequests || []).filter(n => n.toLowerCase() !== me.username.toLowerCase());
  await saveUsers();
  return { ok: true };
}
async function friendsRemove(token, targetUsername, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  const target = findUserByName(targetUsername);
  me.friends = (me.friends || []).filter(n => n.toLowerCase() !== (targetUsername||"").toLowerCase());
  if (target) target.friends = (target.friends || []).filter(n => n.toLowerCase() !== me.username.toLowerCase());
  await saveUsers();
  return { ok: true };
}

/* ---- Chat: 1:1-Nachrichten zwischen Freunden, persistiert ---- */
const CONVERSATIONS_FILE = process.env.CONVERSATIONS_FILE || path.join(__dirname, "data", "conversations.json");
const UPSTASH_CONVERSATIONS_KEY = "wissensduell_conversations";
let conversations = {}; // "user1|user2" (Kleinbuchstaben, alphabetisch sortiert) -> [{from, text, ts}]
let conversationsLoaded = false;
function conversationKey(a, b) {
  return [a.toLowerCase(), b.toLowerCase()].sort().join("|");
}
async function loadConversationsOnce() {
  if (USE_UPSTASH) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/${UPSTASH_CONVERSATIONS_KEY}`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const parsed = data && data.result ? JSON.parse(data.result) : {};
      conversations = (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
      conversationsLoaded = true;
      return true;
    } catch (e) {
      console.error("Konnte Chatverlauf nicht aus Upstash laden (Speichern bleibt gesperrt):", e.message);
      return false;
    }
  }
  try {
    conversations = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, "utf8"));
    if (!conversations || typeof conversations !== "object" || Array.isArray(conversations)) conversations = {};
    conversationsLoaded = true; return true;
  } catch (e) {
    if (e.code === "ENOENT") { conversations = {}; conversationsLoaded = true; return true; }
    try { conversations = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE + ".bak", "utf8")); conversationsLoaded = true; return true; }
    catch (e2) { console.error("conversations.json nicht lesbar, auch keine brauchbare Sicherung:", e.message); return false; }
  }
}
let convLoadingPromise = null;
function loadConversations() {
  if (!convLoadingPromise) convLoadingPromise = loadConversationsOnce().finally(() => { convLoadingPromise = null; });
  return convLoadingPromise;
}
async function ensureConversationsLoaded() { return conversationsLoaded ? true : await loadConversations(); }
async function saveConversations() {
  if (!conversationsLoaded) return false;
  if (USE_UPSTASH) {
    try {
      const res = await fetch(`${UPSTASH_URL}/set/${UPSTASH_CONVERSATIONS_KEY}`, { method: "POST", headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "text/plain" }, body: JSON.stringify(conversations) });
      return res.ok;
    } catch (e) { console.error("Konnte Chatverlauf nicht in Upstash speichern:", e.message); return false; }
  }
  try {
    fs.mkdirSync(path.dirname(CONVERSATIONS_FILE), { recursive: true });
    const tmp = CONVERSATIONS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(conversations), "utf8");
    try { fs.copyFileSync(CONVERSATIONS_FILE, CONVERSATIONS_FILE + ".bak"); } catch (e) { /* noch keine alte Datei */ }
    fs.renameSync(tmp, CONVERSATIONS_FILE);
    return true;
  } catch (e) { console.error("Konnte Chatverlauf nicht speichern:", e.message); return false; }
}
// ---- Oeffentlicher Chat (ueber das ganze Spiel), liegt in conversations["__public__"] ----
const PUB_KEY = "__public__", PUB_MAX = 100, PUB_LEN = 200;
const pubLast = new Map(); // username -> [timestamps]
async function chatPublicList(since) {
  if (!(await ensureConversationsLoaded())) return { ok: false, error: "Chat nicht verfügbar." };
  const all = conversations[PUB_KEY] || [];
  const sn = parseInt(since, 10) || 0;
  const msgs = sn ? all.filter(m => m.id > sn) : all.slice(-60);
  return { ok: true, ver: pubVer, messages: msgs, online: onlineAccounts.size, lastId: all.length ? all[all.length - 1].id : 0 };
}
// Chat-Filter: Rassismus, Beleidigungen, 18+ (nach Normalisierung: Gross/Klein, Akzente, Leetspeak, Trennzeichen)
const CHAT_BAD = ["neger","nigger","nigga","kanake","kanacke","zigeuner","untermensch","heilhitler","siegheil","judensau","schwuchtel","hurensohn","fotze","wichser","arschloch","porno","onlyfans","blowjob","ficken","pussy","schlampe","vergewalt","killyourself","behindert","faggot","retard"]; // lange Begriffe: auch ueber Wortgrenzen
const CHAT_BAD_WORD = ["niga","kys","fick","porn","nackt","nudes","nutte","spast","fagot","nazi","hure","nigr"]; // kurze Begriffe: nur als Wortanfang
function chatNorm(t) {
  return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss")
    .replace(/[@4]/g, "a").replace(/[3]/g, "e").replace(/[1!|]/g, "i").replace(/[0]/g, "o").replace(/[$5]/g, "s").replace(/[^a-z]/g, "");
}
function chatBlocked(t) {
  const n = chatNorm(t); const hit = CHAT_BAD.find(w => n.includes(w)); if (hit) return hit;
  const toks = String(t).split(/\s+/).map(chatNorm).filter(Boolean);
  return CHAT_BAD_WORD.find(w => toks.some(k => k === w || (k.startsWith(w) && w.length >= 4 && k.length <= w.length + 3))) || null;
}
let pubVer = 0;
const chatBlockedLog = []; // nur im Speicher, fuer die Admin-Seite
async function chatPublicSend(token, text, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  if (typeof isRestricted === "function" && isRestricted(me)) return { ok: false, error: "Du kannst gerade nicht schreiben." };
  if (isMuted(me)) return { ok: false, error: "Du bist stumm geschaltet (noch " + Math.max(1, Math.ceil((me.mutedUntil - Date.now()) / 60000)) + " Min.)." };
  let t = (typeof text === "string" ? text : "").replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, PUB_LEN);
  if (!t) return { ok: false, error: "Leer." };
  if (/(https?:\/\/|www\.|\.(com|de|net|org|io|ru|xyz|tv|me|ly|gg|to|co)\b)/i.test(t)) { chatBlockedLog.push({ ts: Date.now(), u: me.username, t, why: "link" }); if (chatBlockedLog.length > 40) chatBlockedLog.shift(); return { ok: false, error: "Links sind im Chat nicht erlaubt." }; }
  if (!me.adminCloak && chatBlocked(t)) { me.chatStrikes = (me.chatStrikes || 0) + 1; chatBlockedLog.push({ ts: Date.now(), u: me.username, t, why: "wort" }); if (chatBlockedLog.length > 40) chatBlockedLog.shift(); return { ok: false, error: "Diese Nachricht ist nicht erlaubt (Beleidigung, Rassismus oder 18+)." }; }
  const now = Date.now(), key = me.username.toLowerCase();
  const arr = (pubLast.get(key) || []).filter(x => now - x < 20000);
  if (arr.length && now - arr[arr.length - 1] < 1500) return { ok: false, error: "Nicht so schnell." };
  if (arr.length >= 5) return { ok: false, error: "Zu viele Nachrichten, warte kurz." };
  arr.push(now); pubLast.set(key, arr);
  if (!(await ensureConversationsLoaded())) return { ok: false, error: "Chat nicht verfügbar." };
  const list = conversations[PUB_KEY] || (conversations[PUB_KEY] = []);
  const last = list.length ? list[list.length - 1] : null;
  if (last && last.u === (me.adminCloak ? "Admin" : me.username) && last.t === t) return { ok: false, error: "Doppelt." };
  const msg = { id: (last ? last.id : 0) + 1, u: me.adminCloak ? "Admin" : me.username, a: me.adminCloak ? "👑" : (me.avatar || null), t, ts: now };
  if (me.adminCloak) msg.adm = true;
  list.push(msg);
  if (list.length > PUB_MAX) list.splice(0, list.length - PUB_MAX);
  saveConversations();
  return { ok: true, message: msg };
}
const CHAT_MAX_LEN = 500;
const CHAT_MAX_HISTORY = 300; // je Unterhaltung - aeltere Nachrichten werden verworfen
async function chatHistory(token, withUsername, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  const other = findUserByName(withUsername);
  if (!other || !areFriends(me, other)) return errObj("notFriendsAnymore", lang);
  if (!(await ensureConversationsLoaded())) return serviceDownMsg(lang);
  return { ok: true, messages: conversations[conversationKey(me.username, other.username)] || [] };
}
// Speichert eine Chatnachricht UND liefert sie live aus, falls die
// Zielperson gerade online ist. Wird vom WebSocket-Handler aufgerufen.
async function sendChatMessage(fromUser, toUsername, text, lang) {
  const to = findUserByName(toUsername);
  if (!to || !areFriends(fromUser, to)) return errObj("notFriendsAnymore", lang);
  if (isMuted(fromUser)) return { ok: false, error: "Du bist stumm geschaltet." };
  const clean = cleanStr(text, CHAT_MAX_LEN);
  if (!clean) return errObj("emptyMessage", lang);
  if (!(await ensureConversationsLoaded())) return serviceDownMsg(lang);
  const key = conversationKey(fromUser.username, to.username);
  const list = conversations[key] || (conversations[key] = []);
  const message = { from: fromUser.username, text: clean, ts: Date.now() };
  list.push(message);
  if (list.length > CHAT_MAX_HISTORY) list.splice(0, list.length - CHAT_MAX_HISTORY);
  await saveConversations();
  notifyAccount(to.username, { type: "chatMessage", from: fromUser.username, text: clean, ts: message.ts });
  return { ok: true, message };
}
// Schickt eine Nachricht an ALLE offenen Verbindungen dieses Kontos (falls online).
function notifyAccount(username, msg) {
  const set = onlineAccounts.get(username.toLowerCase());
  if (!set) return;
  for (const ws of set) { try { send(ws, msg); } catch (e) { /* Verbindung evtl. schon weg */ } }
}

/* ------------------------------------------------------------------------ */
/* ARENA / BESTENLISTE (Match-Modus)                                        */
/* Echte, gerätübergreifende Bestenliste über Konten (nicht die lokalen,    */
/* geräteeigenen Profile) - siehe Anforderung. Ligen sind direkt mit         */
/* Klassen-Fragenbereichen verknüpft und bewusst als Datenliste aufgebaut,   */
/* damit künftig einfach weitere Ligen (für weitere Klassen) ergänzt werden  */
/* können, ohne die Logik anzufassen. Ein einmal erreichter Liga-Index wird  */
/* nie automatisch verringert (kein Abstieg) - saveArenaProgress() garantiert*/
/* das explizit, unabhängig davon, was der Client sendet.                   */
/* ------------------------------------------------------------------------ */
const ARENA_DAILY_HEARTS = 3;
// promoteAt = kumulierte arenaPoints (lifetime), ab denen automatisch in die
// nächste Liga aufgestiegen wird. Letzter Eintrag hat vorerst kein
// promoteAt (aktuelle Obergrenze, bis mehr Klassen/Ligen existieren).
const ARENA_LEAGUES = [
  { name: "Schüler-Liga", klasseMin: 1, klasseMax: 5, promoteAt: 150 },
  { name: "Lehrer-Liga",  klasseMin: 6, klasseMax: 10, promoteAt: null }
];
const ARENA_QUESTIONS_PER_BLOCK = 5;
const ARENA_BLOCKS_PER_MATCH = 4; // macht 20 Fragen + 4 Modus-Herausforderungen gesamt
// Modi, die als "Zwischen-Herausforderung" infrage kommen (auf Wunsch: alle
// außer Bild erraten und Musik raten).
// Nur Rundentypen, die rein anhand objektiver Werte automatisch bewertet
// werden (kein Freitext, keine Bewertung durch "Anfechten"), dürfen hier
// rein. Stadt Land Fluss und Nenn's Blitz verlassen sich normalerweise
// darauf, dass ECHTE Mitspieler fragwürdige Antworten per Anfechten
// bestreiten können - in der Solo-Arena gibt es aber niemanden, der das
// tun könnte, wodurch JEDE Eingabe (auch erfundene Wörter) automatisch als
// richtig durchgeht. Deshalb hier bewusst ausgeschlossen (Bugfix - waren
// vorher enthalten, das ließ sich ausnutzen).
const ARENA_CHALLENGE_MODES = ["orderingGame", "chronologyGame", "higherLowerGame"];

// Kalendertag in DEUTSCHER Zeit (Europe/Berlin) - vorher UTC, dadurch kam der
// Tageswechsel der Herzen erst um 1/2 Uhr nachts statt um Mitternacht.
function todayDateString() {
  try { return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}

// Frischt die Herzen auf, falls seit der letzten Speicherung ein neuer
// Kalendertag (UTC) begonnen hat. Verringert NIE bestehende Herzen, füllt
// nur bei Tageswechsel auf das Tageskontingent auf.
function refreshArenaHearts(user) {
  const today = todayDateString();
  if (user.stats.arenaHeartsDate !== today) {
    user.stats.arenaHearts = ARENA_DAILY_HEARTS;
    user.stats.arenaHeartsDate = today;
  }
}

function arenaLeagueInfo(user) {
  const idx = Math.min(user.stats.arenaLeague || 0, ARENA_LEAGUES.length - 1);
  return { index: idx, ...ARENA_LEAGUES[idx] };
}

async function arenaStatus(token, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(token);
  if (!user) return errObj("notLoggedIn", lang);
  refreshArenaHearts(user);
  await saveUsers();
  const league = arenaLeagueInfo(user);
  const nextLeague = ARENA_LEAGUES[league.index + 1] || null;
  return {
    ok: true,
    hearts: user.stats.arenaHearts,
    maxHearts: ARENA_DAILY_HEARTS,
    coins: user.stats.coins || 0,
    points: user.stats.arenaPoints,
    league: { index: league.index, name: league.name, klasseMin: league.klasseMin, klasseMax: league.klasseMax },
    nextLeague: nextLeague ? { name: nextLeague.name, pointsNeeded: Math.max(0, (league.promoteAt || 0) - user.stats.arenaPoints) } : null,
    matchesPlayed: user.stats.arenaMatchesPlayed || 0
  };
}

// Verbraucht ein Herz für den Matchstart. Gibt die passende Liga (für die
// Fragenauswahl im Client) gleich mit zurück, damit der Client nicht separat
// nachfragen muss.
// Punkte-Sicherheit: Beim Start wird eine einmalige Match-ID ausgegeben. Nur
// mit genau dieser ID (und nur einmal) kann das Match ausgewertet werden;
// die gemeldeten Punkte sind gedeckelt (4 Bloecke x 5 Fragen + 4 Aufgaben
// ergeben real weit unter 100), und ein Match muss mind. 20 s gedauert haben.
const ARENA_MAX_POINTS_PER_MATCH = 100;

// ---------------------------------------------------------------------------
// Chess Fantasy: Schluessel & Truhen serverautoritativ (Geld-relevant).
// Schluessel liegen im Konto (user.stats.chess), werden NIE ueber save-stats
// geschrieben. Truhen wuerfelt der Server. Schluessel kaufen: Brain-Pulse-
// Muenzen. Gratis-Schluessel fuer Siege sind pro Tag gedeckelt.
// ---------------------------------------------------------------------------
const CHESS_PIECE_WEIGHTS = {
  bauer_s: 30, bauer_b: 28, bauer_sh: 28, bauer_a: 22, bauer_be: 22, bauer_h: 25,
  turm_s: 8, laeufer_d: 6, springer_m: 6, koenig_b: 3,
  dame_f: 1, dame_w: 1, dame_e: 1, dame_l: 1, dame_v: 1, dame_p: 1
};
const CHESS_RARITY = ["normal", "blau", "epic", "legendar", "mystisch"];
const CHESS_CHESTS = { normal: { cost: 20 }, epic: { cost: 50 }, legendary: { cost: 100 } };
const CHESS_KEY_PACKS = [
  { id: "k10", keys: 10, coins: 100 },
  { id: "k50", keys: 50, coins: 450 },
  { id: "k200", keys: 200, coins: 1600 }
];
// Fantasy-Gold gegen Brain-Pulse-Muenzen (Gold selbst ist ein Spielstand im Browser, die Muenzen sind serverseitig)
const CHESS_GOLD_PACKS = [
  { id: "g1", gold: 5000, coins: 100 },
  { id: "g2", gold: 25000, coins: 450 },
  { id: "g3", gold: 100000, coins: 1600 }
];
const CHESS_FREE_KEYS_PER_DAY = 20;
const CHESS_STARTER_POWER = { "bauer_s": 8, "turm_s": 2, "laeufer_d": 2, "springer_m": 2, "dame_v": 1, "koenig_b": 1 };
const CHESS_GROUPS = { bauer: ["s", "b", "sh", "a", "be", "h"], turm: ["s"], laeufer: ["d"], springer: ["m"], koenig: ["b"], dame: ["f", "w", "e", "l", "v", "p"] };
const CHESS_LEGACY_POWER_CAP = 500; // einmaliger Import alter Browser-Staende je Figur
const CHESS_EARN_MIN_GAP_MS = process.env.CHESS_EARN_MIN_GAP_MS !== undefined ? Number(process.env.CHESS_EARN_MIN_GAP_MS) : 60 * 1000;
const CHEAT_RESTRICT_AT = Number(process.env.CHEAT_RESTRICT_AT) || 5;
function isRestricted(user) {
  return !!(user && (user.restricted === true || (user.stats && (user.stats.cheatFlags || 0) >= CHEAT_RESTRICT_AT)));
}
function flagCheat(user, what) {
  user.stats.cheatFlags = (user.stats.cheatFlags || 0) + 1;
  user.stats.lastCheat = { what: String(what).slice(0, 80), at: Date.now() };
  console.warn("[Anticheat] " + user.username + ": " + what);
}
function chessState(user) {
  if (!user.stats.chess || typeof user.stats.chess !== "object") user.stats.chess = { keys: 0, freeDay: "", freeToday: 0 };
  const c = user.stats.chess;
  if (!c.granted || typeof c.granted !== "object") c.granted = {};
  if (!Number.isFinite(c.keys) || c.keys < 0) c.keys = 0;
  return c;
}
function chessPublic(user) {
  const c = chessState(user);
  const day = new Date().toISOString().slice(0, 10);
  const left = c.freeDay === day ? Math.max(0, CHESS_FREE_KEYS_PER_DAY - c.freeToday) : CHESS_FREE_KEYS_PER_DAY;
  return { keys: c.keys, coins: user.stats.coins || 0, freeKeysLeft: left, packs: CHESS_KEY_PACKS, goldPacks: CHESS_GOLD_PACKS };
}
function chessPickPid() {
  const ids = Object.keys(CHESS_PIECE_WEIGHTS);
  let total = 0; ids.forEach(i => { total += CHESS_PIECE_WEIGHTS[i]; });
  let r = Math.random() * total;
  for (const id of ids) { r -= CHESS_PIECE_WEIGHTS[id]; if (r < 0) return id; }
  return ids[0];
}
function chessGuaranteed(rankIdx) { return { pid: chessPickPid(), rarityKey: CHESS_RARITY[rankIdx], rankIdx }; }
function chessRandom(rates) {
  const pid = chessPickPid();
  let roll = Math.random(), cum = 0, rarityKey = "normal";
  for (const [r, chance] of rates) { cum += chance; if (roll < cum) { rarityKey = r; break; } }
  return { pid, rarityKey, rankIdx: CHESS_RARITY.indexOf(rarityKey) };
}
function chessRollChest(type) {
  const results = []; let coinBonus = 0;
  if (type === "normal") {
    coinBonus = 200 + Math.floor(Math.random() * 300);
    const count = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) results.push(chessRandom([["normal", 0.89], ["blau", 0.11]]));
  } else if (type === "epic") {
    coinBonus = 800 + Math.floor(Math.random() * 700);
    for (let i = 0; i < 5; i++) results.push(chessGuaranteed(0));
    for (let i = 0; i < 5; i++) results.push(chessRandom([["blau", 0.80], ["epic", 0.20]]));
  } else {
    coinBonus = 3000 + Math.floor(Math.random() * 2000);
    for (let i = 0; i < 10; i++) results.push(chessGuaranteed(0));
    for (let i = 0; i < 5; i++) results.push(chessGuaranteed(1));
    results.push(chessGuaranteed(2));
    results.push(chessRandom([["epic", 0.80], ["legendar", 0.20]]));
  }
  return { results, coinBonus };
}

// ---------------------------------------------------------------------------
// Fourups (4 gewinnt mit Faehigkeiten): Sammlung serverautoritativ im Konto
// (user.stats.fourups). Schluessel teilen sich mit Chess Fantasy (chessState).
// Faehigkeiten: 1 Start-Faehigkeit, Meilensteine je Level, Kisten (Schluessel),
// Aufwerten kostet Muenzen. Der Client darf hier nichts direkt schreiben.
// ---------------------------------------------------------------------------
const FU_TIER = { fels: 0, sperre: 0, aufraeumer: 1, schild: 1, spiegel: 1, ausklinken: 2, tauschen: 2, joker: 2, rueckspulen: 3, bombe: 3, umfaerber: 3, doppelzug: 4 };
const FU_START = "aufraeumer";
const FU_MILESTONES = { 2: "fels", 4: "schild", 6: "sperre", 8: "ausklinken", 10: "spiegel", 13: "tauschen", 16: "joker", 20: "bombe", 25: "rueckspulen", 30: "umfaerber", 40: "doppelzug" };
const FU_SKIN_MILESTONES = { 3: "neon", 7: "gold", 12: "fireice", 18: "candy", 24: "space", 32: "wood" };
const FU_BOT_STEPS = [[1, 1], [6, 2], [16, 3]]; // ab Level -> Bot-Staerke (automatisch, nicht waehlbar)
function fuBotLevel(lvl) { let b = 1; for (const [l, v] of FU_BOT_STEPS) if (lvl >= l) b = v; return b; }
const FU_MAX_LEVEL = 5;
const FU_UPGRADE_COST = [0, 500, 1000, 2000, 4000]; // Kosten von Stufe n -> n+1 = FU_UPGRADE_COST[n]
const FU_MAX_COINS = [50, 100, 200, 400, 800]; // Ausgleich, wenn Faehigkeit schon auf Max ist
const FU_CHESTS = {
  normal:    { cost: 20,  drops: 2, odds: [0.55, 0.33, 0.10, 0.02, 0.00] },
  epic:      { cost: 50,  drops: 3, odds: [0.20, 0.40, 0.28, 0.10, 0.02] },
  legendary: { cost: 100, drops: 3, odds: [0.00, 0.20, 0.50, 0.27, 0.03] }
};
const FU_XP_PER_DAY = 600;
function fuXpForLevel(l) { return 80 + 15 * (l - 1); } // XP, um von Level l auf l+1 zu kommen
function fuLevelInfo(xp) {
  let l = 1, rest = Math.max(0, Math.floor(xp || 0));
  while (rest >= fuXpForLevel(l)) { rest -= fuXpForLevel(l); l++; }
  return { level: l, into: rest, need: fuXpForLevel(l) };
}
function fourupsState(user) {
  if (!user.stats.fourups || typeof user.stats.fourups !== "object") user.stats.fourups = { abilities: {}, xp: 0, claimed: {} };
  const f = user.stats.fourups;
  if (!f.abilities || typeof f.abilities !== "object") f.abilities = {};
  if (!f.claimed || typeof f.claimed !== "object") f.claimed = {};
  if (!Number.isFinite(f.xp) || f.xp < 0) f.xp = 0;
  if (!f.abilities[FU_START]) f.abilities[FU_START] = 1;
  // Meilensteine nachtragen (einmal je Level)
  const lvl = fuLevelInfo(f.xp).level;
  const got = [];
  for (const m of Object.keys(FU_MILESTONES)) {
    if (Number(m) <= lvl && !f.claimed[m]) {
      f.claimed[m] = true;
      const id = FU_MILESTONES[m];
      if (!f.abilities[id]) { f.abilities[id] = 1; got.push({ level: Number(m), id, status: "new" }); }
      else if (f.abilities[id] < FU_MAX_LEVEL) { f.abilities[id]++; got.push({ level: Number(m), id, status: "up" }); }
      else { user.stats.coins = (user.stats.coins || 0) + FU_MAX_COINS[FU_TIER[id]]; got.push({ level: Number(m), id, status: "max" }); }
    }
  }
  return { f, got };
}
function fourupsPublic(user, got) {
  const { f } = fourupsState(user);
  const li = fuLevelInfo(f.xp);
  return { ...chessPublic(user), abilities: f.abilities, xp: f.xp, level: li.level, xpInto: li.into, xpNeed: li.need,
    milestones: FU_MILESTONES, skinMilestones: FU_SKIN_MILESTONES, botSteps: FU_BOT_STEPS, botLevel: fuBotLevel(li.level), upgradeCost: FU_UPGRADE_COST, maxLevel: FU_MAX_LEVEL, chests: FU_CHESTS, milestoneGot: got || [] };
}
function fuPickDrop(odds) {
  let r = Math.random(), tier = 0, cum = 0;
  for (let i = 0; i < odds.length; i++) { cum += odds[i]; if (r < cum) { tier = i; break; } tier = i; }
  const ids = Object.keys(FU_TIER).filter(id => FU_TIER[id] === tier);
  return ids[Math.floor(Math.random() * ids.length)];
}
async function fourupsApi(action, payload, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(payload.token);
  if (!user) return errObj("notLoggedIn", lang);
  const c = chessState(user);
  const { f, got } = fourupsState(user);
  if (action === "state") { if (got.length) await saveUsers(); return { ok: true, ...fourupsPublic(user, got) }; }
  if ((action === "upgrade" || action === "open" || action === "result") && !gateOk("fourups_abilities", payload.adminKey, payload.__ip)) return FEATURE_LOCKED_RESULT;
  if (action === "upgrade") {
    const id = String(payload.id || "");
    const lvl = f.abilities[id];
    if (!FU_TIER.hasOwnProperty(id) || !lvl) return errObj("invalidInput", lang);
    if (lvl >= FU_MAX_LEVEL) return { ok: false, error: lang === "en" ? "Already at max level." : "Schon auf höchster Stufe." };
    const cost = FU_UPGRADE_COST[lvl];
    if ((user.stats.coins || 0) < cost) return errObj("notEnoughCoins", lang);
    user.stats.coins -= cost; f.abilities[id] = lvl + 1;
    await saveUsers();
    return { ok: true, ...fourupsPublic(user, got) };
  }
  if (action === "open") {
    const chest = FU_CHESTS[payload.type];
    if (!chest) return errObj("invalidInput", lang);
    if (c.keys < chest.cost) return { ok: false, error: lang === "en" ? "Not enough keys." : "Nicht genug Schlüssel." };
    c.keys -= chest.cost;
    const drops = [];
    for (let i = 0; i < chest.drops; i++) {
      const id = fuPickDrop(chest.odds), tier = FU_TIER[id];
      if (!f.abilities[id]) { f.abilities[id] = 1; drops.push({ id, tier, status: "new", level: 1 }); }
      else if (f.abilities[id] < FU_MAX_LEVEL) { f.abilities[id]++; drops.push({ id, tier, status: "up", level: f.abilities[id] }); }
      else { user.stats.coins = (user.stats.coins || 0) + FU_MAX_COINS[tier]; drops.push({ id, tier, status: "max", level: FU_MAX_LEVEL, coins: FU_MAX_COINS[tier] }); }
    }
    await saveUsers();
    return { ok: true, drops, ...fourupsPublic(user, got) };
  }
  if (action === "result") {
    // Ergebnis einer Partie gegen den Bot: XP + ggf. Gratis-Schluessel (Tageslimit wie Chess)
    const day = new Date().toISOString().slice(0, 10);
    if (f.xpDay !== day) { f.xpDay = day; f.xpToday = 0; }
    if (f.lastResultAt && Date.now() - f.lastResultAt < CHESS_EARN_MIN_GAP_MS * 0.75) return { ok: true, ...fourupsPublic(user, got), gainXp: 0, gainKeys: 0, tooFast: true };
    f.lastResultAt = Date.now();
    const level = fuBotLevel(fuLevelInfo(f.xp).level); // Staerke bestimmt der Server aus deinem Level
    const outcome = payload.outcome === "win" ? "win" : payload.outcome === "draw" ? "draw" : "loss";
    const base = outcome === "win" ? [0, 15, 25, 35][level] : outcome === "draw" ? 12 : 8;
    const restricted = isRestricted(user);
    const xp = restricted ? 0 : Math.max(0, Math.min(base, FU_XP_PER_DAY - (f.xpToday || 0)));
    f.xpToday = (f.xpToday || 0) + xp; f.xp += xp;
    let keys = 0;
    if (outcome === "win" && !restricted) {
      if (c.freeDay !== day) { c.freeDay = day; c.freeToday = 0; }
      keys = Math.max(0, Math.min(level >= 3 ? 2 : 1, CHESS_FREE_KEYS_PER_DAY - c.freeToday));
      c.freeToday += keys; c.keys += keys;
    }
    const before = got.length;
    const st = fourupsState(user); // ggf. neue Meilensteine
    await saveUsers();
    return { ok: true, ...fourupsPublic(user, st.got), gainXp: xp, gainKeys: keys };
  }
  return errObj("invalidInput", lang);
}


// ---------------------------------------------------------------------------
// Tagesraetsel (Sudoku + Kreuzwort)
// ---------------------------------------------------------------------------
// Belohnung = hoechste geloeste Stufe des Tages (NICHT addiert): Sudoku 25/50/75, Kreuzwort klein 25 / mittel 50 / gross 75.
// Muenzen werden erst am NAECHSTEN Tag abgeholt. Stufen muessen der Reihe nach geloest werden.
const DAILY_REWARDS = { sudoku: { easy: 25, medium: 50, hard: 75 }, cw: { small: 25, medium: 50, big: 75 }, ws: { small: 25, medium: 50, big: 75 }, wv: { small: 25, medium: 50, big: 75 } };
// Hilfen kosten Muenzen (vom Guthaben, sofort). Preise liegen nur hier; der Client bekommt sie mit dem Raetsel.
const DAILY_HINTS = { sudoku: { cell: 10 }, cw: { letter: 5, word: 15 }, ws: { start: 5, word: 15 }, wv: { start: 5, word: 15 } };
const DAILY_ORDER = { sudoku: ["easy", "medium", "hard"], cw: ["small", "medium", "big"], ws: ["small", "medium", "big"], wv: ["small", "medium", "big"] };
const DAILY_MIN_SECONDS = { "sudoku:easy": 45, "sudoku:medium": 90, "sudoku:hard": 150, "cw:small": 25, "cw:medium": 60, "cw:big": 120, "ws:small": 20, "ws:medium": 45, "ws:big": 80, "wv:small": 15, "wv:medium": 30, "wv:big": 55 };
const DAILY_MIN_SCALE = process.env.DAILY_MIN_SCALE !== undefined ? Number(process.env.DAILY_MIN_SCALE) : 1;
const dailyCache = new Map();
let CW_SCHEDULE = null; try { CW_SCHEDULE = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "shared/crosswordSchedule.json"), "utf8")); } catch (e) { console.error("Kreuzwort-Plan nicht geladen:", e.message); }
function dailyToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function dailyDow(dateStr) { const [y, m, d] = dateStr.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); } // 0 = Sonntag
function dailyAddDays(dateStr, n) { const [y, m, d] = dateStr.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
function dailyWeekDates(today) { // Montag bis heute
  const dow = dailyDow(today), back = dow === 0 ? 6 : dow - 1; const out = [];
  for (let i = back; i >= 0; i--) out.push(dailyAddDays(today, -i)); return out;
}
function dailyAllowedDates(today) { return dailyDow(today) === 0 ? dailyWeekDates(today) : [today]; } // nachholen nur sonntags
const DAILY_CATCH_MAX = 3; // Nachholen: so viele verpasste Tage pro Woche (frei waehlbar), nachgeholt = halbe Muenzen
const DAILY_KINDS = [["sudoku", "easy"], ["sudoku", "medium"], ["sudoku", "hard"], ["cw", "small"], ["cw", "medium"], ["cw", "big"], ["ws", "small"], ["ws", "medium"], ["ws", "big"], ["wv", "small"], ["wv", "medium"], ["wv", "big"]];
function dailyState(user) {
  if (!user.stats.daily || typeof user.stats.daily !== "object") user.stats.daily = { solved: {}, started: {} };
  const d = user.stats.daily; if (!d.solved) d.solved = {}; if (!d.started) d.started = {};
  if (!d.best || typeof d.best !== "object") d.best = {};   // "datum:typ" -> { r: hoechste Belohnung, day: Tag der letzten Loesung }
  if (!d.paid || typeof d.paid !== "object") d.paid = {};   // "datum:typ" -> bereits abgeholt
  if (!d.catchDays || typeof d.catchDays !== "object") d.catchDays = {}; // Wochenstart -> genutzte Nachhol-Tage (max. DAILY_CATCH_MAX pro Woche)
  return d;
}
// ---- Wochenziele (Montag-Sonntag, Berlin): je Raetselart + gesamt; Belohnung = hoechste erreichte Stufe, wird nach Wochenende abgeholt ----
const WEEKLY_TIERS = { sudoku: [7, 14, 21], cw: [7, 14, 21], ws: [7, 14, 21], wv: [550, 1000, 1400] };  // geloeste Stufen bzw. Punkte (wv)
const WEEKLY_TOTAL_PCT = [40, 70, 90];
const WEEKLY_REWARD = { type: [{ keys: 0, coins: 75 }, { keys: 0, coins: 150 }, { keys: 0, coins: 500 }], total: [{ keys: 20, coins: 0 }, { keys: 50, coins: 0 }, { keys: 100, coins: 0 }] };
const WEEKLY_TYPES = ["sudoku", "cw", "ws", "wv"];
function dailyWeekStart(date) { const dow = dailyDow(date), back = dow === 0 ? 6 : dow - 1; return dailyAddDays(date, -back); }
function weeklyProgress(d, start) {
  const dates = new Set(); for (let i = 0; i < 7; i++) dates.add(dailyAddDays(start, i));
  const val = { sudoku: 0, cw: 0, ws: 0, wv: 0 };
  for (const k of Object.keys(d.solved || {})) { const [dt, ty] = k.split(":"); if (dates.has(dt) && ty in val && ty !== "wv") val[ty]++; }
  for (const k of Object.keys(d.wvPts || {})) { const [dt] = k.split(":"); if (dates.has(dt)) val.wv += Math.max(0, d.wvPts[k] | 0); }
  return val;
}
function weeklyTierOf(v, tiers) { return v >= tiers[2] ? 3 : v >= tiers[1] ? 2 : v >= tiers[0] ? 1 : 0; }
function weeklyEval(val) {
  const tier = {}; WEEKLY_TYPES.forEach(t => { tier[t] = weeklyTierOf(val[t], WEEKLY_TIERS[t]); });
  const pct = Math.round(WEEKLY_TYPES.reduce((a, t) => a + Math.min(1, val[t] / WEEKLY_TIERS[t][2]), 0) / WEEKLY_TYPES.length * 100);
  tier.total = pct >= WEEKLY_TOTAL_PCT[2] ? 3 : pct >= WEEKLY_TOTAL_PCT[1] ? 2 : pct >= WEEKLY_TOTAL_PCT[0] ? 1 : 0;
  return { tier, pct };
}
const weeklyRw = (kind, tier) => (tier > 0 ? WEEKLY_REWARD[kind][tier - 1] : { keys: 0, coins: 0 });
// Offene Belohnungen aus beendeten Wochen (letzte 8): gibt { keys, coins, marks } zurueck; marks = zu speichernde bezahlte Stufen
function weeklyDue(d, today) {
  if (!d.weekPaid || typeof d.weekPaid !== "object") d.weekPaid = {};
  const cur = dailyWeekStart(today); let keys = 0, coins = 0; const marks = [];
  for (let w = 1; w <= 8; w++) {
    const st = dailyAddDays(cur, -7 * w), ev = weeklyEval(weeklyProgress(d, st)), paid = d.weekPaid[st] || {}, mark = {};
    for (const k of [...WEEKLY_TYPES, "total"]) {
      const now = ev.tier[k], was = paid[k] || 0; if (now <= was) continue;
      const a = weeklyRw(k === "total" ? "total" : "type", now), b = weeklyRw(k === "total" ? "total" : "type", was);
      keys += a.keys - b.keys; coins += a.coins - b.coins; mark[k] = now;
    }
    if (Object.keys(mark).length) marks.push({ st, mark });
  }
  return { keys, coins, marks };
}
function dailyLocked(d, date, type, diff) {
  const ord = DAILY_ORDER[type], i = ord.indexOf(diff);
  return i > 0 && !d.solved[date + ":" + type + ":" + ord[i - 1]];
}
// Abholbar = Tag der Loesung liegt vor heute; "pending" = erst morgen abholbar
function dailyPayout(d, today) {
  let claimable = 0, pending = 0;
  for (const k of Object.keys(d.best)) { const b = d.best[k], due = Math.max(0, (b.r || 0) - (d.paid[k] || 0)); if (!due) continue; if (b.day < today) claimable += due; else pending += due; }
  return { claimable, pending };
}
function dailyGet(date, type, diff, lang) {
  const key = date + ":" + type + ":" + diff + ":" + (type === "sudoku" ? "x" : (lang === "en" ? "en" : "de"));
  if (dailyCache.has(key)) return dailyCache.get(key);
  if (dailyCache.size > 60) dailyCache.delete(dailyCache.keys().next().value);
  let v;
  if (type === "sudoku") { const s = DailyPz.makeSudoku(date, diff); v = { pub: { puzzle: s.puzzle }, solution: s.solution }; }
  else if (type === "ws") { const w = DailyWords.makeWordSearch(date, diff, lang === "en" ? "en" : "de"); v = { pub: w.pub, solution: w.solution }; }
  else if (type === "wv") { const w = DailyWords.makeBoggle(date, diff, lang === "en" ? "en" : "de"); v = { pub: w.pub, solution: w.solution }; }
  else {
    // Fester Plan (shared/crosswordSchedule.json): jedes Wort kommt pro Zyklus nur einmal vor. Ohne Plan: alte Zufallserzeugung.
    const lg = lang === "en" ? "en" : "de", sched = CW_SCHEDULE && CW_SCHEDULE[lg];
    let c;
    if (sched && sched.length) {
      const [yy, mm, dd] = date.split("-").map(Number), n = sched.length;
      const di = (((Math.round((Date.UTC(yy, mm - 1, dd) - Date.UTC(2026, 9, 12)) / 86400000)) % n) + n) % n;
      const p = sched[di][diff];
      c = { size: p.size, grid: p.grid.map(r => r.split("").map(x => x === "." ? "" : x)), numAt: p.numAt, words: p.words };
    } else c = DailyPz.makeCrossword(date, diff, lang);
    const cells = c.grid.map((row, r) => row.map((ch, cc) => ch ? { n: c.numAt[r + "," + cc] || 0 } : 0));
    v = { pub: { size: c.size, cells, words: c.words.map(w => ({ n: w.n, dir: w.dir, r: w.r, c: w.c, len: w.len, clue: w.clue })) }, solution: c.grid.map(r => r.map(x => x || ".").join("")) };
  }
  dailyCache.set(key, v); return v;
}
// ---- Woerterbuch fuer "Woerter verbinden": lokale Liste + Wiktionary-Abfrage fuer alles andere (Ergebnis wird gemerkt) ----
const wordCache = new Map(); // WORT (A-Z) -> true/false
const wordRate = new Map();  // ip -> { t, n }
function wordCandidates(w, lg) {
  const low = w.toLowerCase(), set = new Set();
  let vars = [low];
  if (lg !== "en") {
    const subs = [["ae", "ä"], ["oe", "ö"], ["ue", "ü"], ["ss", "ß"]];
    for (const [a, b] of subs) {
      const next = new Set(vars);
      for (const v of vars) { let i = v.indexOf(a); while (i >= 0 && next.size < 24) { next.add(v.slice(0, i) + b + v.slice(i + a.length)); i = v.indexOf(a, i + 1); } }
      vars = [...next].slice(0, 24);
    }
  }
  vars.forEach(v => { set.add(v); set.add(v[0].toUpperCase() + v.slice(1)); });
  return [...set].slice(0, 40);
}
let _wlog = 0;
function wordLog(m) { const n = Date.now(); if (n - _wlog > 60000) { _wlog = n; console.log("[Woerter-Pruefung] " + m); } }
async function wordCheck(w, lg) {
  w = String(w || "").toUpperCase();
  if (!/^[A-Z]{3,12}$/.test(w) || DailyWords.isBlocked(w)) return { valid: false };
  const pool = DailyWords.generalPool(lg === "en" ? "en" : "de");
  if (!wordCheck._set) wordCheck._set = {};
  const setKey = lg === "en" ? "en" : "de";
  if (!wordCheck._set[setKey]) wordCheck._set[setKey] = new Set(pool);
  if (wordCheck._set[setKey].has(w)) return { valid: true };
  const ck = setKey + ":" + w;
  if (wordCache.has(ck)) return { valid: wordCache.get(ck) };
  try {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 4500);
    const url = "https://" + setKey + ".wiktionary.org/w/api.php?action=query&format=json&formatversion=2&titles=" + encodeURIComponent(wordCandidates(w, setKey).join("|"));
    const res = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "BrainPulse/1.0 (https://brain-pulse-z17r.onrender.com; Wortpruefung fuer ein Quizspiel)", "Accept": "application/json" } });
    clearTimeout(to);
    if (!res.ok) { wordLog("Wiktionary HTTP " + res.status); return { valid: false, uncertain: true }; }
    const j = await res.json();
    const pages = (j && j.query && j.query.pages) || [];
    const ok = pages.some(pg => pg && !pg.missing && !pg.invalid);
    if (wordCache.size > 30000) wordCache.delete(wordCache.keys().next().value);
    wordCache.set(ck, ok);
    return { valid: ok };
  } catch (e) { wordLog("Wiktionary Fehler: " + (e && e.message)); return { valid: false, uncertain: true }; }
}
async function dailyApi(action, payload, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = payload.token ? findUserByToken(payload.token) : null;
  const today = dailyToday(), allowed = dailyAllowedDates(today);
  const d = user ? dailyState(user) : { solved: {}, started: {} };
  if (action === "state") {
    const catchUsed = (user ? (d.catchDays[dailyWeekStart(today)] || []) : []), catchLeft = Math.max(0, DAILY_CATCH_MAX - catchUsed.length), days = dailyWeekDates(today).map(date => ({ date, open: allowed.includes(date) && (date === today || !user || catchUsed.includes(date) || catchLeft > 0), items: DAILY_KINDS.map(([t, df]) => ({ type: t, diff: df, reward: DAILY_REWARDS[t][df], cat: t === "ws" ? (c => ({ icon: c.icon, name: c.name[lang === "en" ? "en" : "de"] }))(DailyWords.categoryFor(date, t, df, lang === "en" ? "en" : "de")) : undefined, solved: !!d.solved[date + ":" + t + ":" + df], locked: !!user && dailyLocked(d, date, t, df) })) }));
    const po = user ? dailyPayout(d, today) : { claimable: 0, pending: 0 };
    const ws0 = dailyWeekStart(today), wval = weeklyProgress(d, ws0), wev = weeklyEval(wval), due = user ? weeklyDue(d, today) : { keys: 0, coins: 0 };
    const weekly = { start: ws0, daysLeft: 7 - (dailyDow(today) === 0 ? 6 : dailyDow(today) - 1), types: {}, total: { pct: wev.pct, tiers: WEEKLY_TOTAL_PCT, tier: wev.tier.total }, rewards: WEEKLY_REWARD, due: { keys: due.keys, coins: due.coins } };
    WEEKLY_TYPES.forEach(t => { weekly.types[t] = { val: wval[t], tiers: WEEKLY_TIERS[t], tier: wev.tier[t] }; });
    return { ok: true, today, isSunday: dailyDow(today) === 0, days, loggedIn: !!user, claimable: po.claimable, pending: po.pending, weekly, catchup: (dailyDow(today) === 0 && user) ? { left: catchLeft, max: DAILY_CATCH_MAX, used: catchUsed } : undefined };
  }
  if (action === "word") {
    const ip = String(payload.__ip || "x"), now = Date.now(), rr = wordRate.get(ip) || { t: now, n: 0 };
    if (now - rr.t > 60000) { rr.t = now; rr.n = 0; }
    rr.n++; wordRate.set(ip, rr); if (wordRate.size > 5000) wordRate.delete(wordRate.keys().next().value);
    if (rr.n > 80) return { ok: false, error: lang === "en" ? "Too many checks, wait a moment." : "Zu viele Prüfungen, warte einen Moment." };
    const r = await wordCheck(payload.word, lang === "en" ? "en" : "de");
    return { ok: true, valid: !!r.valid, uncertain: !!r.uncertain };
  }
  if (action === "claim") {
    if (!user) return errObj("notLoggedIn", lang);
    let granted = 0;
    if (!isRestricted(user)) for (const k of Object.keys(d.best)) { const b = d.best[k], due = Math.max(0, (b.r || 0) - (d.paid[k] || 0)); if (due && b.day < today) { granted += due; d.paid[k] = b.r; } }
    let wkKeys = 0, wkCoins = 0;
    if (!isRestricted(user)) {
      const due = weeklyDue(d, today);
      due.marks.forEach(m => { d.weekPaid[m.st] = Object.assign(d.weekPaid[m.st] || {}, m.mark); });
      wkKeys = due.keys; wkCoins = due.coins;
      if (wkKeys) { const c = chessState(user); c.keys += wkKeys; }
    }
    if (granted || wkCoins || wkKeys) { user.stats.coins = (user.stats.coins || 0) + granted + wkCoins; await saveUsers(); }
    const po = dailyPayout(d, today);
    return { ok: true, granted: granted + wkCoins, dailyCoins: granted, weeklyCoins: wkCoins, weeklyKeys: wkKeys, balance: user.stats.coins || 0, claimable: po.claimable, pending: po.pending };
  }
  if (action === "board") { // Bestenliste: schnellste Zeiten je Raetselart und Stufe (Heute / Allzeit), Top 5
    const out = { today: {}, all: {}, mine: {} };
    for (const type of Object.keys(DAILY_REWARDS)) for (const diff of Object.keys(DAILY_REWARDS[type])) {
      const k = type + ":" + diff, tl = [], al = [];
      for (const u of users) {
        if (isRestricted(u) || !u.stats || !u.stats.daily) continue;
        const b = u.stats.daily.bt && u.stats.daily.bt[k], t0 = u.stats.daily.btd && u.stats.daily.btd[k];
        if (b) al.push({ name: u.username, avatar: u.avatar || null, s: b.s });
        if (t0 && t0.date === today) tl.push({ name: u.username, avatar: u.avatar || null, s: t0.s });
        if (user && u === user && b) out.mine[k] = { s: b.s, today: t0 && t0.date === today ? t0.s : null };
      }
      const top = arr => arr.sort((x, y) => x.s - y.s).slice(0, 5);
      out.today[k] = top(tl); out.all[k] = top(al);
    }
    return Object.assign({ ok: true }, out);
  }
  const date = String(payload.date || ""), type = ["cw", "ws", "wv"].includes(payload.type) ? payload.type : "sudoku", diff = String(payload.diff || "");
  if (!DAILY_REWARDS[type] || !DAILY_REWARDS[type][diff] || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return errObj("invalidInput", lang);
  if (!allowed.includes(date)) return { ok: false, error: lang === "en" ? "This puzzle is not available now. Missed puzzles can be caught up on Sundays." : "Dieses Rätsel ist gerade nicht verfügbar. Verpasste Rätsel kannst du sonntags nachholen." };
  const skey = date + ":" + type + ":" + diff;
  if (user && date !== today) { // Nachholen (nur sonntags): max. DAILY_CATCH_MAX Tage pro Woche, Tag frei waehlbar; der erste Start eines Tages verbraucht einen Platz
    const ws0 = dailyWeekStart(today); if (!Array.isArray(d.catchDays[ws0])) d.catchDays[ws0] = [];
    const cu = d.catchDays[ws0];
    if (!cu.includes(date)) {
      if (action !== "puzzle" || cu.length >= DAILY_CATCH_MAX) return { ok: false, error: lang === "en" ? "No catch-up days left this week." : "Keine Nachhol-Tage mehr übrig in dieser Woche." };
      cu.push(date); await saveUsers();
    }
  }
  if (user && dailyLocked(d, date, type, diff)) return { ok: false, error: lang === "en" ? "Solve the easier puzzle first." : "Löse zuerst das leichtere Rätsel." };
  if (action === "puzzle") {
    const pz = dailyGet(date, type, diff, lang);
    if (user && !d.solved[skey] && !d.started[skey]) { d.started[skey] = Date.now(); await saveUsers(); }
    return { ok: true, date, type, diff, reward: date === today ? DAILY_REWARDS[type][diff] : Math.floor(DAILY_REWARDS[type][diff] / 2), solved: !!d.solved[skey], hints: DAILY_HINTS[type], ...pz.pub };
  }
  if (action === "hint") {
    if (!user) return errObj("notLoggedIn", lang);
    if (d.solved[skey]) return { ok: false, error: lang === "en" ? "Already solved." : "Schon gelöst." };
    const hk = String(payload.hint || ""), cost = DAILY_HINTS[type][hk];
    if (!cost) return errObj("invalidInput", lang);
    if ((user.stats.coins || 0) < cost) return { ok: false, error: lang === "en" ? "Not enough coins." : "Nicht genug Münzen.", cost };
    const pz = dailyGet(date, type, diff, lang);
    const pick = arr => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    let out = null;
    if (type === "sudoku") {
      const cur = Array.isArray(payload.cur) ? payload.cur : [], bad = []; for (let i = 0; i < 81; i++) if (Number(cur[i]) !== pz.solution[i]) bad.push(i);
      const idx = Number.isInteger(payload.idx) && bad.includes(payload.idx) ? payload.idx : pick(bad);
      if (idx !== null) out = { idx, value: pz.solution[idx] };
    } else if (type === "cw") {
      const sol = pz.solution, cur = Array.isArray(payload.cur) ? payload.cur : [];
      if (hk === "letter") {
        const r = payload.r, c = payload.c;
        if (Number.isInteger(r) && Number.isInteger(c) && sol[r] && sol[r][c] && sol[r][c] !== "." && String((cur[r] || "")[c] || "").toUpperCase() !== sol[r][c]) out = { r, c, letter: sol[r][c] };
      } else {
        const w = pz.pub.words[payload.wi];
        if (w) { const cells = []; for (let j = 0; j < w.len; j++) { const r = w.r + (w.dir === "down" ? j : 0), c = w.c + (w.dir === "across" ? j : 0); cells.push({ r, c, letter: sol[r][c] }); } out = { cells }; }
      }
    } else if (type === "ws") {
      const fw = new Set(Array.isArray(payload.found) ? payload.found.map(String) : []), rest = pz.solution.filter(p => !fw.has(p.w));
      const p = pick(rest); if (p) out = hk === "start" ? { r: p.r, c: p.c, len: p.w.length } : { w: p.w, r: p.r, c: p.c, r2: p.r2, c2: p.c2 };
    } else if (type === "wv") {
      const fw = new Set(Array.isArray(payload.found) ? payload.found.map(String) : []), rest = [...pz.solution.solved.entries()].map(([w, path]) => ({ w, path })).filter(p => !fw.has(p.w));
      const longer = rest.filter(p => p.w.length >= 5); const p = pick(hk === "word" && longer.length ? longer : rest); if (p) out = hk === "start" ? { r: p.path[0][0], c: p.path[0][1], len: p.w.length } : { w: p.w, path: p.path };
    }
    if (!out) return { ok: false, error: lang === "en" ? "Nothing to reveal." : "Hier gibt es nichts aufzudecken." };
    user.stats.coins = (user.stats.coins || 0) - cost; await saveUsers();
    return { ok: true, hint: hk, cost, balance: user.stats.coins, ...out };
  }
  if (action === "submit") {
    const pz = dailyGet(date, type, diff, lang);
    let wrong = 0, wvPts = 0; const wrongCells = [];
    if (type === "sudoku") {
      const g = Array.isArray(payload.grid) ? payload.grid : [];
      if (g.length !== 81) return errObj("invalidInput", lang);
      for (let i = 0; i < 81; i++) if (Number(g[i]) !== pz.solution[i]) { wrong++; wrongCells.push(i); }
    } else if (type === "ws") {
      // Gefundene Woerter: jedes Wort mit Start/Ende; muss zur serverseitigen Platzierung passen (in beide Richtungen)
      const found = Array.isArray(payload.found) ? payload.found.slice(0, 40) : [];
      for (const p of pz.solution) {
        const ok = found.some(f => f && String(f.w) === p.w && ((f.r === p.r && f.c === p.c && f.r2 === p.r2 && f.c2 === p.c2) || (f.r === p.r2 && f.c === p.c2 && f.r2 === p.r && f.c2 === p.c)));
        if (!ok) wrong++;
      }
    } else if (type === "wv") {
      // Boggle-artig: found = [{ w, path:[[r,c],...] }] - jeder Pfad muss ueber benachbarte, verschiedene Felder das Wort buchstabieren,
      // und das Wort muss zur Kategorie des Tages gehoeren. Gewertet werden verschiedene Woerter, gefordert sind n.
      const found = Array.isArray(payload.found) ? payload.found.slice(0, 60) : [];
      const g = pz.solution.grid, N = g.length, good = new Set();
      for (const f of found) {
        if (!f || typeof f.w !== "string" || !Array.isArray(f.path) || f.path.length !== f.w.length || f.w.length < (pz.solution.minLen || 3)) continue;
        if (!pz.solution.pool.has(f.w) && !(await wordCheck(f.w, lang === "en" ? "en" : "de")).valid) continue;
        let ok = true; const seen = new Set();
        for (let k = 0; k < f.path.length && ok; k++) {
          const q = f.path[k]; if (!Array.isArray(q)) { ok = false; break; }
          const r = q[0], c = q[1];
          if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0 || r >= N || c >= N || g[r][c] !== f.w[k] || seen.has(r + "," + c)) { ok = false; break; }
          seen.add(r + "," + c);
          if (k > 0) { const p = f.path[k - 1]; if (Math.max(Math.abs(p[0] - r), Math.abs(p[1] - c)) !== 1) ok = false; }
        }
        if (ok) good.add(f.w);
      }
      let pts = 0; good.forEach(w => { pts += DailyWords.wordPoints(w.length); });
      wrong = Math.max(0, pz.solution.n - pts); // = fehlende Punkte
      wvPts = pts;
    } else {
      const L = Array.isArray(payload.letters) ? payload.letters : [];
      if (L.length !== pz.solution.length) return errObj("invalidInput", lang);
      pz.solution.forEach((row, r) => { const q = String(L[r] || "").toUpperCase(); for (let c = 0; c < row.length; c++) if (row[c] !== "." && q[c] !== row[c]) { wrong++; wrongCells.push(r + "," + c); } });
    }
    if (wrong) return { ok: true, correct: false, wrong, wrongCells };
    if (!user) return { ok: true, correct: true, coins: 0, needLogin: true };
    if (d.solved[skey]) return { ok: true, correct: true, coins: 0, already: true, balance: user.stats.coins || 0 };
    const started = d.started[skey] || 0, minMs = (DAILY_MIN_SECONDS[type + ":" + diff] || 20) * 1000;
    if (!started || Date.now() - started < minMs * DAILY_MIN_SCALE) return { ok: true, correct: true, coins: 0, tooFast: true };
    if (date === today) { // Bestzeit (nur das Tagesraetsel von heute): Clientzeit (ohne Pausen), begrenzt durch die echte Dauer seit Start
      const wallS = (Date.now() - started) / 1000, cl = Number(payload.secs);
      const floorS = Math.max(1, (DAILY_MIN_SECONDS[type + ":" + diff] || 20) * DAILY_MIN_SCALE);
      const secs = Math.round(Math.max(floorS, Math.min(isFinite(cl) && cl > 0 ? cl : wallS, wallS)));
      if (!d.bt || typeof d.bt !== "object") d.bt = {};
      if (!d.btd || typeof d.btd !== "object") d.btd = {};
      const bk2 = type + ":" + diff;
      if (!d.bt[bk2] || secs < d.bt[bk2].s) d.bt[bk2] = { s: secs, date };
      if (!d.btd[bk2] || d.btd[bk2].date !== today || secs < d.btd[bk2].s) d.btd[bk2] = { s: secs, date };
    }
    d.solved[skey] = Date.now(); delete d.started[skey];
    if (type === "wv") { if (!d.wvPts) d.wvPts = {}; d.wvPts[date + ":" + diff] = Math.min(wvPts, 400); }
    // Belohnung wird NICHT sofort gezahlt: sie wird fuer "datum:typ" auf die hoechste geloeste Stufe gesetzt (nicht addiert)
    // und kann ab dem naechsten Tag abgeholt werden.
    const gain = isRestricted(user) ? 0 : (date === today ? DAILY_REWARDS[type][diff] : Math.floor(DAILY_REWARDS[type][diff] / 2)), bk = date + ":" + type; // nachgeholt = halbe Muenzen
    if (gain > ((d.best[bk] && d.best[bk].r) || 0)) d.best[bk] = { r: gain, day: dailyToday() };
    else if (d.best[bk]) d.best[bk].day = dailyToday();
    await saveUsers();
    const po = dailyPayout(d, dailyToday());
    return { ok: true, correct: true, coins: 0, reward: gain, wvPoints: wvPts, deferred: true, claimable: po.claimable, pending: po.pending, balance: user.stats.coins || 0 };
  }
  return errObj("invalidInput", lang);
}

const CHESS_QUEST_KEYS = (() => { try { return JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "shared/chessQuestKeys.json"), "utf8")); } catch (e) { return {}; } })();
const CHESS_QUEST_KEYS_PER_DAY = 60; // Gesamtgrenze je Tag (die erste Abholung des Tages darf auch groesser sein)
async function chessApi(action, payload, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(payload.token);
  if (!user) return errObj("notLoggedIn", lang);
  const c = chessState(user);
  if (action === "state") return { ok: true, ...chessPublic(user) };
  if (action === "quest-claim") {
    // Aufgaben-Belohnung in Schluesseln: einmal je Aufgabe, Hoehe kommt aus der Server-Tabelle (nicht vom Client).
    const id = String(payload.id || ""), want = CHESS_QUEST_KEYS[id];
    if (!want) return errObj("invalidInput", lang);
    if (!c.qClaimed || typeof c.qClaimed !== "object") c.qClaimed = {};
    if (c.qClaimed[id]) return { ok: true, granted: 0, already: true, ...chessPublic(user) };
    const day = new Date().toISOString().slice(0, 10);
    if (c.qDay !== day) { c.qDay = day; c.qToday = 0; }
    if (c.qToday > 0 && c.qToday + want > CHESS_QUEST_KEYS_PER_DAY) return { ok: true, granted: 0, capped: true, ...chessPublic(user) };
    c.qClaimed[id] = Date.now();
    const give = isRestricted(user) ? 0 : want;
    c.qToday += want; c.keys += give;
    await saveUsers();
    return { ok: true, granted: give, ...chessPublic(user) };
  }
  if (action === "open") {
    const chest = CHESS_CHESTS[payload.type];
    if (!chest) return errObj("invalidInput", lang);
    if (c.keys < chest.cost) return { ok: false, error: lang === "en" ? "Not enough keys." : "Nicht genug Schlüssel." };
    c.keys -= chest.cost;
    const roll = chessRollChest(payload.type);
    roll.results.forEach(r => { c.granted[r.pid] = (c.granted[r.pid] || 0) + Math.pow(10, r.rankIdx); });
    if (!isRestricted(user) && roll.results.some(r => r.rankIdx >= 3)) feedPush(user, "legend", 0);
    await saveUsers();
    return { ok: true, ...roll, ...chessPublic(user) };
  }
  if (action === "buy-keys") {
    const pack = CHESS_KEY_PACKS.find(p => p.id === payload.packId);
    if (!pack) return errObj("invalidInput", lang);
    if ((user.stats.coins || 0) < pack.coins) return errObj("notEnoughCoins", lang);
    user.stats.coins -= pack.coins;
    c.keys += pack.keys;
    await saveUsers();
    return { ok: true, ...chessPublic(user) };
  }
  if (action === "buy-gold") {
    const pack = CHESS_GOLD_PACKS.find(p => p.id === payload.packId);
    if (!pack) return errObj("invalidInput", lang);
    if ((user.stats.coins || 0) < pack.coins) return errObj("notEnoughCoins", lang);
    user.stats.coins -= pack.coins;
    await saveUsers();
    return { ok: true, gold: pack.gold, ...chessPublic(user) };
  }
  if (action === "earn") {
    const day = new Date().toISOString().slice(0, 10);
    if (c.freeDay !== day) { c.freeDay = day; c.freeToday = 0; }
    if (c.lastEarnAt && Date.now() - c.lastEarnAt < CHESS_EARN_MIN_GAP_MS) return { ok: true, granted: 0, tooFast: true, ...chessPublic(user) };
    c.lastEarnAt = Date.now();
    const rankIdx = Math.max(0, Math.min(20, Math.floor(Number(payload.rankIdx) || 0)));
    const want = Math.min(5, 1 + Math.floor(rankIdx / 3));
    const give = isRestricted(user) ? 0 : Math.max(0, Math.min(want, CHESS_FREE_KEYS_PER_DAY - c.freeToday));
    c.freeToday += give; c.keys += give;
    await saveUsers();
    return { ok: true, granted: give, ...chessPublic(user) };
  }
  if (action === "inv-load") return { ok: true, inv: c.inv || null, ...chessPublic(user) };
  if (action === "inv-save") {
    const inv = payload.inventory;
    if (!inv || typeof inv !== "object" || Array.isArray(inv)) return errObj("invalidInput", lang);
    const clean = {}; const power = {};
    for (const g of Object.keys(CHESS_GROUPS)) {
      clean[g] = {};
      for (const v of CHESS_GROUPS[g]) {
        const arr = inv[g] && inv[g][v];
        const a = [];
        for (let i = 0; i < 5; i++) {
          const n = Array.isArray(arr) ? arr[i] : 0;
          if (n === undefined || n === null) { a.push(0); continue; }
          if (!Number.isInteger(n) || n < 0 || n > 1000000) { flagCheat(user, "inv ungueltig " + g + v); await saveUsers(); return { ok: false, error: lang === "en" ? "Invalid inventory." : "Ungültiges Inventar.", inv: c.inv || null }; }
          a.push(n);
        }
        clean[g][v] = a;
        power[g + "_" + v] = a.reduce((sum, n, i) => sum + n * Math.pow(10, i), 0);
      }
    }
    // Ersteinrichtung: alte Browser-Staende werden einmalig (gedeckelt) uebernommen.
    const legacy = !c.inv;
    for (const key of Object.keys(power)) {
      const allowed = (CHESS_STARTER_POWER[key] || 0) + (c.granted[key] || 0) + (legacy ? CHESS_LEGACY_POWER_CAP : 0);
      if (power[key] > allowed) {
        flagCheat(user, "inv zu stark " + key + " " + power[key] + ">" + allowed);
        await saveUsers();
        return { ok: false, error: lang === "en" ? "Inventory rejected." : "Inventar abgelehnt.", inv: c.inv || null };
      }
    }
    c.inv = clean;
    await saveUsers();
    return { ok: true, inv: c.inv };
  }
  return errObj("invalidInput", lang);
}


// ---------------------------------------------------------------------------
// Chess Online (Original): Freunde einladen oder per Raumcode. Der Server
// haelt die Partie und prueft JEDEN Zug mit derselben Engine wie der Client
// (public/chess/engine.js, per vm geladen). Der Client fragt per Polling ab.
// ---------------------------------------------------------------------------
const CHESS_ONLINE_MOVE_MS = Number(process.env.CHESS_ONLINE_MOVE_MS) || 3 * 60 * 1000;
const CHESS_ONLINE_IDLE_MS = 3 * 60 * 60 * 1000;
const chessOnlineGames = new Map(); // code -> game
// Fernpartie (corr): keine Uhr, kein Zug-Limit, der naechste Zug darf auch erst nach Tagen kommen. Wird gespeichert (ueberlebt Neustart).
const CHESS_CORR_FILE = USERS_FILE + ".chesscorr.json", CHESS_CORR_KEY = UPSTASH_USERS_KEY + "_chesscorr";
const CHESS_CORR_WAIT_MS = 14 * 86400000, CHESS_CORR_IDLE_MS = 120 * 86400000, CHESS_CORR_OVER_MS = 7 * 86400000, CHESS_CORR_MAX = 15;
let chessCorrTimer = null;
function chessCorrList() { return Array.from(chessOnlineGames.values()).filter(g => g.corr); }
function chessCorrSaveSoon() {
  if (chessCorrTimer) return;
  chessCorrTimer = setTimeout(async () => {
    chessCorrTimer = null;
    const body = JSON.stringify(chessCorrList());
    try {
      if (USE_UPSTASH) await fetch(`${UPSTASH_URL}/set/${CHESS_CORR_KEY}`, { method: "POST", headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "text/plain" }, body });
      else { fs.mkdirSync(path.dirname(CHESS_CORR_FILE), { recursive: true }); fs.writeFileSync(CHESS_CORR_FILE, body, "utf8"); }
    } catch (e) { console.error("Fernpartien nicht gespeichert:", e.message); }
  }, 800);
}
async function chessCorrLoad() {
  try {
    let raw = null;
    if (USE_UPSTASH) { const res = await fetch(`${UPSTASH_URL}/get/${CHESS_CORR_KEY}`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } }); const d = await res.json(); if (d && d.result) raw = JSON.parse(d.result); }
    else if (fs.existsSync(CHESS_CORR_FILE)) raw = JSON.parse(fs.readFileSync(CHESS_CORR_FILE, "utf8"));
    if (Array.isArray(raw)) raw.forEach(g => { if (g && g.code && g.corr && g.board && !chessOnlineGames.has(g.code)) chessOnlineGames.set(g.code, g); });
    console.log("Fernpartien geladen: " + chessCorrList().length);
  } catch (e) { console.error("Fernpartien nicht lesbar:", e.message); }
}
let chessEngine = null;
function getChessEngine() {
  if (chessEngine) return chessEngine;
  const vm = require("vm");
  const src = fs.readFileSync(path.join(__dirname, "public", "chess", "engine.js"), "utf8");
  const ctx = vm.createContext({ console, Math });
  vm.runInContext(src + "\n;this.__api={initBoard,getLegalMoves,getAllLegalMoves,applyMove,isInCheck,minimax};", ctx);
  chessEngine = ctx.__api;
  return chessEngine;
}
function chessPosKey(g) {
  let k = g.turn;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = g.board[r][c]; k += p ? (p.col + p.t + (p.moved ? "m" : "")) : "."; }
  if (g.last && g.last.dbl) k += "e" + g.last.tc;
  return k;
}
function chessInsufficient(board) {
  const pcs = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = board[r][c]; if (p && p.t !== "K") pcs.push({ p, r, c }); }
  if (pcs.length === 0) return true;
  if (pcs.length === 1 && (pcs[0].p.t === "B" || pcs[0].p.t === "N")) return true;
  if (pcs.length === 2 && pcs.every(x => x.p.t === "B") && ((pcs[0].r + pcs[0].c) % 2) === ((pcs[1].r + pcs[1].c) % 2)) return true;
  return false;
}
function chessOnlineCleanup() {
  const now = Date.now();
  for (const [code, g] of chessOnlineGames) {
    const lim = g.corr ? (g.status === "over" ? CHESS_CORR_OVER_MS : g.status === "waiting" ? CHESS_CORR_WAIT_MS : CHESS_CORR_IDLE_MS) : CHESS_ONLINE_IDLE_MS;
    if (now - g.updated > lim) { chessOnlineGames.delete(code); if (g.corr) chessCorrSaveSoon(); }
  }
}
function chessOnlineNewCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let tries = 0; tries < 50; tries++) {
    let c = ""; for (let i = 0; i < 5; i++) c += chars[Math.floor(Math.random() * chars.length)];
    if (!chessOnlineGames.has(c)) return c;
  }
  return null;
}
// Elo (Start 1000, K=32). Zaehlt nur bei echten Online-Partien (nie gegen den Bot, damit niemand Punkte "erspielt").
const CHESS_ELO_START = 1000, CHESS_ELO_K = 32, CHESS_PAIR_DAILY_MAX = 5;
const chessPairCount = new Map(); // "a|b|Tag" -> Anzahl gewerteter Partien
function chessEloOf(u) { return (u && u.stats && Number.isFinite(u.stats.chessElo)) ? u.stats.chessElo : CHESS_ELO_START; }
function chessEloApply(g, winner) {
  if (g.rated || !g.w || !g.b || g.w === g.b) return;
  const uw = findUserByName(g.w), ub = findUserByName(g.b);
  if (!uw || !ub) return;
  if ((g.log || []).length < 4) return; // ganz kurze Partien (Aufgabe nach 1-2 Zuegen) zaehlen nicht
  const day = new Date().toISOString().slice(0, 10), pk = [g.w.toLowerCase(), g.b.toLowerCase()].sort().join("|") + "|" + day;
  const n = chessPairCount.get(pk) || 0;
  if (n >= CHESS_PAIR_DAILY_MAX) { g.rated = false; g.eloNote = "limit"; return; }
  chessPairCount.set(pk, n + 1);
  if (chessPairCount.size > 5000) chessPairCount.clear();
  const rw = chessEloOf(uw), rb = chessEloOf(ub);
  const ew = 1 / (1 + Math.pow(10, (rb - rw) / 400)), sw = winner === "draw" ? 0.5 : (winner === "w" ? 1 : 0);
  const dw = Math.round(CHESS_ELO_K * (sw - ew)), db = -dw;
  uw.stats.chessElo = Math.max(100, rw + dw); ub.stats.chessElo = Math.max(100, rb + db);
  for (const [u, won, lost] of [[uw, sw === 1, sw === 0], [ub, sw === 0, sw === 1]]) {
    u.stats.chessGames = (u.stats.chessGames || 0) + 1;
    if (won) u.stats.chessWins = (u.stats.chessWins || 0) + 1; else if (lost) u.stats.chessLosses = (u.stats.chessLosses || 0) + 1;
  }
  g.rated = true; g.eloDelta = { w: dw, b: db }; g.eloAfter = { w: uw.stats.chessElo, b: ub.stats.chessElo };
  saveUsers().catch(() => {});
}
function chessOnlineFinish(g, winner, why) {
  g.status = "over"; g.winner = winner; g.why = why; g.rev++; g.updated = Date.now();
  try { chessEloApply(g, winner); } catch (e) { console.error("Elo:", e.message); }
  try { if (!g.zp && g.random && g.w && g.b) { const z = zpDuel("chess", { username: g.w }, { username: g.b }, winner === "draw" ? "draw" : (winner === "w" ? "a" : "b"), (g.log || []).length, 4); if (z) g.zp = { w: z.a, b: z.b }; } } catch (e) { console.error("zpChess:", e.message); }
}
const CHESS_CLOCK_MS = 10 * 60 * 1000, CHESS_CLOCK_INC_MS = 5000; // Mit Zeit: je Spieler 10 Minuten + 5 Sekunden pro Zug
function chessOnlineCheckTimeout(g) {
  if (g.status !== "playing" || g.corr) return;
  if (g.timed) {
    if (g.clock[g.turn] - (Date.now() - g.moveAt) <= 0) { g.clock[g.turn] = 0; chessOnlineFinish(g, g.turn === "w" ? "b" : "w", "time"); }
    return;
  }
  if (Date.now() - g.moveAt > CHESS_ONLINE_MOVE_MS) chessOnlineFinish(g, g.turn === "w" ? "b" : "w", "time");
}
function chessOnlineView(g, me) {
  chessOnlineCheckTimeout(g);
  const E = getChessEngine();
  const color = g.w === me ? "w" : g.b === me ? "b" : null;
  return {
    ok: true, code: g.code, rev: g.rev, w: g.w, b: g.b, color, status: g.status, random: !!g.random,
    eloW: chessEloOf(findUserByName(g.w || "")), eloB: chessEloOf(findUserByName(g.b || "")), rated: !!g.rated, zp: g.zp || null, eloDelta: g.eloDelta || null, eloAfter: g.eloAfter || null, winner: g.winner || null, why: g.why || null,
    board: g.board, turn: g.turn, last: g.last, log: g.log, capW: g.capW, capB: g.capB,
    check: g.status === "playing" && E.isInCheck(g.board, g.turn),
    timed: !!g.timed, corr: !!g.corr, updated: g.updated,
    clockW: g.timed ? Math.max(0, g.clock.w - (g.status === "playing" && g.turn === "w" ? Date.now() - g.moveAt : 0)) : null,
    clockB: g.timed ? Math.max(0, g.clock.b - (g.status === "playing" && g.turn === "b" ? Date.now() - g.moveAt : 0)) : null,
    moveSecondsLeft: (g.status === "playing" && !g.timed && !g.corr) ? Math.max(0, Math.round((CHESS_ONLINE_MOVE_MS - (Date.now() - g.moveAt)) / 1000)) : null
  };
}
function chessOnlineGet(payload, lang) {
  if (!usersLoaded) return { err: serviceDownMsg(lang) };
  const user = findUserByToken(payload.token);
  if (!user) return { err: errObj("notLoggedIn", lang) };
  chessOnlineCleanup();
  const code = typeof payload.code === "string" ? payload.code.trim().toUpperCase() : "";
  return { user, code, game: chessOnlineGames.get(code) };
}
const CHESS_ONLINE_MAX_PER_MIN = Number(process.env.CHESS_ONLINE_MAX_PER_MIN) || 240;
async function chessOnlineApi(action, payload, lang) {
  const r = await chessOnlineApi0(action, payload, lang);
  if (action === "create" || action === "join" || action === "decline" || action === "leave" || action === "resign" || action === "move" || action === "queue") chessCorrSaveSoon();
  return r;
}
async function chessOnlineApi0(action, payload, lang) {
  const base = chessOnlineGet(payload, lang);
  if (base.err) return base.err;
  if (rlHit("co|" + base.user.username, CHESS_ONLINE_MAX_PER_MIN + 1, 60000, 30000).lockedUntil > Date.now()) return errObj("tooManyRequests", lang);
  const { user, code, game: g } = base;
  const me = user.username;
  const msg = (de, en) => ({ ok: false, error: lang === "en" ? en : de });
  if (action === "create") {
    const corr = payload.corr === true;
    if (corr && chessCorrList().filter(x => (x.w === me || x.b === me) && x.status !== "over").length >= CHESS_CORR_MAX) return msg("Du hast schon " + CHESS_CORR_MAX + " Fernpartien. Beende erst eine.", "You already have " + CHESS_CORR_MAX + " correspondence games. Finish one first.");
    if (!corr) for (const x of chessOnlineGames.values()) if (!x.corr && (x.w === me || x.b === me) && x.status !== "over" && Date.now() - x.updated < CHESS_ONLINE_IDLE_MS) {
      if (x.status === "waiting" && x.w === me) { chessOnlineGames.delete(x.code); } else return { ...msg("Du hast schon eine laufende Partie.", "You already have a game in progress."), code: x.code };
    }
    let invited = null;
    if (typeof payload.invite === "string" && payload.invite) {
      const target = findUserByName(payload.invite);
      if (!target || !areFriends(user, target)) return msg("Das ist keiner deiner Freunde.", "That is not one of your friends.");
      invited = target.username;
    }
    const newCode = chessOnlineNewCode();
    if (!newCode) return msg("Gerade keine freie Partie möglich.", "No free game right now.");
    const E = getChessEngine();
    const first = Math.random() < 0.5 ? "w" : "b";
    const timed = payload.timed === true && !corr;
    const game = { code: newCode, corr, w: first === "w" ? me : null, b: first === "b" ? me : null, invited, status: "waiting", rev: 1, timed, clock: { w: CHESS_CLOCK_MS, b: CHESS_CLOCK_MS },
      board: E.initBoard(), turn: "w", last: null, half: 0, seen: {}, log: [], capW: [], capB: [], moveAt: Date.now(), updated: Date.now() };
    game.seen[chessPosKey(game)] = 1;
    chessOnlineGames.set(newCode, game);
    return chessOnlineView(game, me);
  }
  if (action === "queue") { // Zufallsgegner: eine wartende Zufalls-Partie uebernehmen, sonst selbst eine eroeffnen
    for (const x of chessOnlineGames.values()) if (!x.corr && (x.w === me || x.b === me) && x.status !== "over" && Date.now() - x.updated < CHESS_ONLINE_IDLE_MS) {
      if (x.status === "waiting" && x.w === me && x.random) { x.updated = Date.now(); return chessOnlineView(x, me); }
      if (x.status === "waiting" && x.w === me) { chessOnlineGames.delete(x.code); } else return { ...msg("Du hast schon eine laufende Partie.", "You already have a running game."), code: x.code };
    }
    let best = null;
    for (const x of chessOnlineGames.values()) {
      if (x.random && x.status === "waiting" && x.w && x.w !== me && Date.now() - x.updated < 15000) {
        if (!best || Math.abs(chessEloOf(findUserByName(x.w)) - chessEloOf(user)) < Math.abs(chessEloOf(findUserByName(best.w)) - chessEloOf(user))) best = x;
      }
    }
    if (best) { best.b = me; best.status = "playing"; best.rev++; best.moveAt = Date.now(); best.updated = Date.now(); return chessOnlineView(best, me); }
    const newCode = chessOnlineNewCode();
    if (!newCode) return msg("Gerade keine freie Partie möglich.", "No free game right now.");
    const E = getChessEngine();
    const game = { code: newCode, w: me, b: null, invited: null, random: true, timed: true, clock: { w: CHESS_CLOCK_MS, b: CHESS_CLOCK_MS }, status: "waiting", rev: 1,
      board: E.initBoard(), turn: "w", last: null, half: 0, seen: {}, log: [], capW: [], capB: [], moveAt: Date.now(), updated: Date.now() };
    game.seen[chessPosKey(game)] = 1;
    chessOnlineGames.set(newCode, game);
    return chessOnlineView(game, me);
  }
  if (action === "ranking") {
    const list = users.filter(u => (u.stats && u.stats.chessGames > 0)).sort((a, b) => chessEloOf(b) - chessEloOf(a));
    const pos = list.findIndex(u => u === user);
    return { ok: true, elo: chessEloOf(user), games: user.stats.chessGames || 0, wins: user.stats.chessWins || 0, losses: user.stats.chessLosses || 0, pos: pos >= 0 ? pos + 1 : null,
      top: list.slice(0, 10).map((u, i) => ({ pos: i + 1, name: u.username, elo: chessEloOf(u), games: u.stats.chessGames || 0 })) };
  }
  if (action === "inbox") {
    const list = [];
    for (const x of chessOnlineGames.values()) if (x.status === "waiting" && x.invited === me) list.push({ code: x.code, from: x.w || x.b, corr: !!x.corr });
    return { ok: true, invites: list };
  }
  if (action === "mylist") { // meine Fernpartien (laufend, wartend, kuerzlich beendet) + wie viele davon gerade auf mich warten
    const list = [];
    for (const x of chessCorrList()) {
      if (x.w !== me && x.b !== me) continue;
      const color = x.w === me ? "w" : "b", opp = (color === "w" ? x.b : x.w) || null;
      list.push({ code: x.code, opp, color, status: x.status, myTurn: x.status === "playing" && x.turn === color, moves: (x.log || []).length, updated: x.updated, winner: x.winner || null, why: x.why || null, invited: x.invited || null });
    }
    list.sort((a, b) => (b.myTurn - a.myTurn) || (b.updated - a.updated));
    return { ok: true, games: list, myTurn: list.filter(x => x.myTurn).length };
  }
  if (!g) return msg("Diese Partie gibt es nicht (mehr).", "This game does not exist (anymore).");
  if (action === "join") {
    if (g.w === me || g.b === me) return chessOnlineView(g, me);
    if (g.status !== "waiting") return msg("Die Partie ist schon voll.", "The game is already full.");
    if (g.invited && g.invited !== me) return msg("Diese Einladung gilt für jemand anderen.", "This invitation is for someone else.");
    if (!g.w) g.w = me; else g.b = me;
    g.status = "playing"; g.rev++; g.moveAt = Date.now(); g.updated = Date.now();
    return chessOnlineView(g, me);
  }
  if (action === "decline") {
    if (g.invited === me && g.status === "waiting") chessOnlineGames.delete(code);
    return { ok: true };
  }
  if (g.w !== me && g.b !== me) return msg("Du bist nicht in dieser Partie.", "You are not in this game.");
  if (action === "state") { if (g.status === "waiting") g.updated = Date.now(); return chessOnlineView(g, me); }
  if (action === "leave") {
    if (g.corr && g.status === "playing") return { ok: true };   // Fernpartie: Fenster zu heisst nicht aufgeben
    if (g.status === "waiting") chessOnlineGames.delete(code);
    else if (g.status === "playing") chessOnlineFinish(g, g.w === me ? "b" : "w", "resign");
    return { ok: true };
  }
  if (action === "resign") {
    if (g.status === "playing") chessOnlineFinish(g, g.w === me ? "b" : "w", "resign");
    return chessOnlineView(g, me);
  }
  if (action === "move") {
    chessOnlineCheckTimeout(g);
    if (g.status !== "playing") return { ...msg("Die Partie läuft nicht.", "The game is not running."), ...chessOnlineView(g, me), ok: false };
    const color = g.w === me ? "w" : "b";
    if (g.turn !== color) return msg("Du bist nicht dran.", "It is not your turn.");
    if (g.timed) { // verbrauchte Zeit abziehen; wer bei 0 ist, verliert
      g.clock[color] -= Date.now() - g.moveAt;
      if (g.clock[color] <= 0) { g.clock[color] = 0; chessOnlineFinish(g, color === "w" ? "b" : "w", "time"); return chessOnlineView(g, me); }
    }
    const E = getChessEngine();
    const n = (v) => Number.isInteger(v) && v >= 0 && v < 8;
    if (![payload.fr, payload.fc, payload.tr, payload.tc].every(n)) return msg("Ungültiger Zug.", "Invalid move.");
    const piece = g.board[payload.fr][payload.fc];
    if (!piece || piece.col !== color) return msg("Ungültiger Zug.", "Invalid move.");
    const mv = E.getLegalMoves(g.board, payload.fr, payload.fc, g.last).find(m => m.tr === payload.tr && m.tc === payload.tc);
    if (!mv) return msg("Ungültiger Zug.", "Invalid move.");
    const move = Object.assign({}, mv);
    if (piece.t === "P" && (move.tr === 0 || move.tr === 7)) move.promTo = ["Q", "R", "B", "N"].includes(payload.promTo) ? payload.promTo : "Q";
    const target = g.board[move.tr][move.tc];
    let captured = target ? target.t : null;
    if (move.ep) captured = "P";
    const names = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
    const sq = (r, c) => "abcdefgh"[c] + (8 - r);
    let note = move.castle ? (move.castle === "k" ? "O-O" : "O-O-O") : `${names[piece.t]}${sq(move.fr, move.fc)}${captured ? "×" : "–"}${sq(move.tr, move.tc)}${move.promTo ? "=" + names[move.promTo] : ""}`;
    g.board = E.applyMove(g.board, move);
    if (captured) (color === "w" ? g.capW : g.capB).push(captured);
    g.half = (piece.t === "P" || captured) ? 0 : g.half + 1;
    g.last = move; g.turn = color === "w" ? "b" : "w";
    const k = chessPosKey(g); g.seen[k] = (g.seen[k] || 0) + 1;
    const legal = E.getAllLegalMoves(g.board, g.turn, g.last);
    if (legal.length === 0) {
      if (E.isInCheck(g.board, g.turn)) { g.log.push(note + "#"); chessOnlineFinish(g, color, "mate"); }
      else { g.log.push(note); chessOnlineFinish(g, "draw", "stalemate"); }
    } else if (chessInsufficient(g.board)) { g.log.push(note); chessOnlineFinish(g, "draw", "insufficient"); }
    else if (g.half >= 100) { g.log.push(note); chessOnlineFinish(g, "draw", "fifty"); }
    else if (g.seen[k] >= 3) { g.log.push(note); chessOnlineFinish(g, "draw", "threefold"); }
    else { g.log.push(note + (E.isInCheck(g.board, g.turn) ? "+" : "")); g.rev++; }
    if (g.timed && g.status === "playing") g.clock[color] += CHESS_CLOCK_INC_MS;
    g.moveAt = Date.now(); g.updated = Date.now();
    return chessOnlineView(g, me);
  }
  return errObj("invalidInput", lang);
}


// Auswertung fuer den Betreiber: Konten mit Manipulationsversuchen. Nur mit
// ADMIN_KEY (Umgebungsvariable auf Render); ohne gesetzten Key ist der
// Endpunkt aus. Ratenbegrenzt gegen Raten des Keys.
function adminAuth(key, ip) {
  if (testerKeyOk(key)) return false; // Tester-Schluessel: kein Admin, aber kein Fehlversuch
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || adminKey.length < 12) return false;
  const lk = "adm|" + ip, e = rlStore.get(lk);
  if (e && e.lockedUntil > Date.now()) return false;
  const a = Buffer.from(String(key || "")), b = Buffer.from(adminKey);
  const ok = a.length === b.length && require("crypto").timingSafeEqual(a, b);
  if (!ok) rlHit(lk, 8, 10 * 60 * 1000, 10 * 60 * 1000); else rlReset(lk); // nur FEHLVERSUCHE zaehlen
  return ok;
}
// Admin-Sicht: prueft den Key, zaehlt nur FEHLVERSUCHE (Erfolg verbraucht kein Limit).
// Tester: Konten mit Tester-Recht sehen die gesperrten ("geheimen") Spiele, sonst nichts.
// Beim Einschalten bekommt der Tester einen zufaelligen Schluessel (nur im Speicher), der nur die Feature-Sperren aufhebt.
const testerKeys = new Map(); // key -> { un, role }
function userRole(u) { return u && (u.role === "mod" || u.role === "tester") ? u.role : (u && u.tester ? "mod" : null); }
function testerKeyOk(key) { // liefert die Rolle ("mod"/"tester") oder null
  if (typeof key !== "string" || key.length < 20) return null;
  const e = testerKeys.get(key); if (!e) return null;
  const u = findUserByName(e.un);
  const r = userRole(u);
  if (!u || !r || isBanned(u)) { testerKeys.delete(key); return null; }
  return r;
}
async function testerMode(payload, lang) {
  if (!(await ensureUsersLoaded())) return serviceDownMsg(lang);
  const user = findUserByToken(payload && payload.token);
  if (!user) return errObj("notLoggedIn", lang);
  const un = user.username.toLowerCase();
  for (const [k, v] of testerKeys) if (v.un === un) testerKeys.delete(k);
  const role = userRole(user);
  if (!role) return { ok: false, error: lang === "en" ? "Not available." : "Nicht verfügbar." };
  if (!payload.on) return { ok: true, on: false };
  const key = crypto.randomBytes(18).toString("hex");
  testerKeys.set(key, { un, role });
  return { ok: true, on: true, key, role };
}
// Mod-Sitzung fuer die Admin-App: Anmeldung mit dem eigenen Konto (Rolle "mod"), danach ein zufaelliger Schluessel nur im Speicher.
// Der Schluessel darf NUR die unten aufgelisteten Moderations-Endpunkte benutzen - keine Rechte, Spiele, Muenzen, Bann, Passwoerter.
// Mod-Schluessel (aus dem Mod-Modus im Spiel, siehe testerMode): darf NUR die Moderations-Endpunkte unten benutzen -
// keine Rechte, Spiele, Muenzen, Bann, Passwoerter. Die Admin-App selbst ist nur fuer den Admin.
const MOD_URLS = new Set(["/api/admin-live", "/api/admin-chat-delete", "/api/admin-chat-send", "/api/admin-reports", "/api/admin-users", "/api/admin-user-action"]);
const MOD_ACTIONS = new Set(["timeout", "mute", "unmute", "kick"]);
function modKeyUser(key) {
  if (typeof key !== "string" || key.length < 20) return null;
  const e = testerKeys.get(key); if (!e || testerKeyOk(key) !== "mod") return null;
  return findUserByName(e.un) || null;
}
function adminOk(key, ip) {
  if (testerKeyOk(key)) return false; // Tester-Schluessel ist kein Admin-Schluessel, zaehlt aber nicht als Fehlversuch
  const ak = process.env.ADMIN_KEY;
  if (!ak || ak.length < 12 || typeof key !== "string" || !key) return false;
  const lk = "admv|" + ip;
  const e = rlStore.get(lk);
  if (e && e.lockedUntil > Date.now()) return false;
  const a = Buffer.from(key), b = Buffer.from(ak);
  const ok = a.length === b.length && require("crypto").timingSafeEqual(a, b);
  if (!ok) rlHit(lk, 8, 10 * 60 * 1000, 15 * 60 * 1000); else rlReset(lk);
  return ok;
}
// Konto sperren/entsperren (Schummler: keine Gratis-Muenzen/-Schluessel mehr) oder Zaehler loeschen.
async function adminRestrict(key, ip, username, action) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const u = findUserByName(typeof username === "string" ? username : "");
  if (!u) return { ok: false, error: "Konto nicht gefunden." };
  if (action === "restrict") u.restricted = true;
  else if (action === "unrestrict") { u.restricted = false; u.stats.cheatFlags = 0; }
  else return { ok: false, error: "Aktion unbekannt." };
  await saveUsers();
  return { ok: true, username: u.username, restricted: isRestricted(u) };
}

// ===== ADMIN-KONSOLE: Spieler suchen, Muenzen geben, bannen, Timeout, stumm schalten =====
/* ---- Meldungen (Bug, Spieler, Nachricht, Spiel ...) ---- */
const REPORTS_FILE = USERS_FILE + ".reports.json";
const REPORT_CATS = ["bug", "player", "message", "game", "other"];
let reportsData = null;
async function loadReports() {
  if (reportsData) return reportsData;
  let list = [];
  try {
    if (USE_UPSTASH) {
      const res = await fetch(`${UPSTASH_URL}/get/${UPSTASH_USERS_KEY}_reports`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
      const d = await res.json(); if (d && d.result) list = JSON.parse(d.result);
    } else if (fs.existsSync(REPORTS_FILE)) list = JSON.parse(fs.readFileSync(REPORTS_FILE, "utf8"));
  } catch (e) { console.error("Meldungen nicht lesbar:", e.message); }
  reportsData = Array.isArray(list) ? list : [];
  return reportsData;
}
async function saveReports() {
  const body = JSON.stringify(reportsData || []);
  if (USE_UPSTASH) {
    try { const res = await fetch(`${UPSTASH_URL}/set/${UPSTASH_USERS_KEY}_reports`, { method: "POST", headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "text/plain" }, body }); return res.ok; } catch (e) { return false; }
  }
  try { fs.mkdirSync(path.dirname(REPORTS_FILE), { recursive: true }); fs.writeFileSync(REPORTS_FILE, body, "utf8"); return true; } catch (e) { console.error(e.message); return false; }
}
async function submitReport(token, p, ip, lang) {
  const en = lang === "en";
  if (rlHit("rep|" + ip, 6, 3600000, 3600000).lockedUntil > Date.now()) return { ok: false, error: en ? "Too many reports. Please try again later." : "Zu viele Meldungen. Bitte später nochmal." };
  const text = typeof p.text === "string" ? p.text.trim().slice(0, 1000) : "";
  if (text.length < 5) return { ok: false, error: en ? "Please describe the problem (at least 5 characters)." : "Bitte beschreibe es kurz (mindestens 5 Zeichen)." };
  const cat = REPORT_CATS.includes(p.cat) ? p.cat : "other";
  let email = typeof p.email === "string" ? p.email.trim().slice(0, 100) : "";
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return { ok: false, error: en ? "That email address does not look right." : "Die E-Mail-Adresse sieht nicht richtig aus." };
  const sess = token ? findSession(token) : null;
  const list = await loadReports();
  list.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), cat, text, email, who: sess ? sess.user.username : "", target: typeof p.target === "string" ? p.target.trim().slice(0, 40) : "", done: false });
  if (list.length > 500) list.splice(0, list.length - 500);
  if (!(await saveReports())) { list.pop(); return { ok: false, error: en ? "Could not save right now." : "Konnte gerade nicht speichern." }; }
  return { ok: true };
}
async function adminReports(key, ip, payload) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const list = await loadReports();
  if (payload && typeof payload.id === "string") {
    const i = list.findIndex(r => r.id === payload.id);
    if (i >= 0) { if (payload.del) list.splice(i, 1); else list[i].done = !list[i].done; await saveReports(); }
  }
  return { ok: true, open: list.filter(r => !r.done).length, reports: list.slice().reverse().slice(0, 100) };
}
function adminUserCoins(key, ip, username) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const u = findUserByName(typeof username === "string" ? username : "");
  if (!u) return { ok: false, error: "Konto nicht gefunden." };
  const log = Array.isArray(u.coinLog) ? u.coinLog : [];
  return { ok: true, balance: (u.stats && u.stats.coins) || 0,
    income: log.filter(e => e.d > 0).slice(-100).reverse(), spend: log.filter(e => e.d <= 0).slice(-100).reverse() };
}
function adminUserRow(u) {
  const st = u.stats || {};
  return { username: u.username, avatar: u.avatar || st.avatar || null, online: accountIsOnline(u.username), coins: st.coins || 0,
    klasse: st.klasse || 0, rounds: st.roundsPlayed || 0, arenaPoints: st.arenaPoints || 0, flags: st.cheatFlags || 0, lastCheat: st.lastCheat || null,
    restricted: isRestricted(u), banned: u.banned === true, banReason: u.banReason || "", bannedUntil: u.bannedUntil && u.bannedUntil > Date.now() ? u.bannedUntil : 0,
    mutedUntil: u.mutedUntil && u.mutedUntil > Date.now() ? u.mutedUntil : 0, beta: u.betaPhase | 0, tester: !!u.tester, role: userRole(u), createdAt: u.createdAt || 0, lastSeen: u.lastSeen || 0, log: (u.adminLog || []).slice(-5) };
}
function adminUsers(key, ip, query, onlineOnly) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const q = (typeof query === "string" ? query : "").trim().toLowerCase().slice(0, 40);
  let list = users.filter(u => (!q || u.username.toLowerCase().includes(q) || (u.loginName || "").toLowerCase() === q) && (!onlineOnly || accountIsOnline(u.username)));
  list.sort((a, b) => (accountIsOnline(b.username) - accountIsOnline(a.username)) || ((b.lastSeen || 0) - (a.lastSeen || 0)) || a.username.localeCompare(b.username));
  return { ok: true, total: list.length, totalUsers: users.length, online: users.filter(u => accountIsOnline(u.username)).length, users: list.slice(0, 40).map(adminUserRow) };
}
function kickUser(u) {
  u.tokens = [];
  const set = onlineAccounts.get(u.username.toLowerCase());
  if (set) Array.from(set).forEach(ws => { try { ws.close(); } catch (e) {} });
}
async function adminUserAction(key, ip, username, action, amount, minutes, reason) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const u = findUserByName(typeof username === "string" ? username : "");
  if (!u) return { ok: false, error: "Konto nicht gefunden." };
  if (!u.stats) u.stats = defaultStats();
  const mins = Math.min(60 * 24 * 365, Math.max(1, Math.round(Number(minutes) || 0)));
  const why = typeof reason === "string" ? reason.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, 80) : "";
  let note = "";
  switch (action) {
    case "coins": {
      const n = Math.round(Number(amount));
      if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 1000000) return { ok: false, error: "Betrag ungültig (max. 1.000.000)." };
      u.stats.coins = Math.max(0, (u.stats.coins || 0) + n); note = "Münzen " + (n > 0 ? "+" : "") + n; break; }
    case "ban": u.banned = true; u.banReason = why; kickUser(u); note = "Bann" + (why ? ": " + why : ""); break;
    case "unban": u.banned = false; u.banReason = ""; u.bannedUntil = 0; note = "Entbannt"; break;
    case "timeout": if (!Number(minutes)) return { ok: false, error: "Minuten fehlen." }; u.bannedUntil = Date.now() + mins * 60000; kickUser(u); note = "Timeout " + mins + " Min."; break;
    case "mute": if (!Number(minutes)) return { ok: false, error: "Minuten fehlen." }; u.mutedUntil = Date.now() + mins * 60000; note = "Stumm " + mins + " Min."; break;
    case "unmute": u.mutedUntil = 0; note = "Stumm aufgehoben"; break;
    case "restrict": u.restricted = true; note = "Eingeschränkt"; break;
    case "unrestrict": u.restricted = false; u.stats.cheatFlags = 0; note = "Einschränkung aufgehoben"; break;
    case "kick": kickUser(u); note = "Abgemeldet"; break;
    case "role_mod": u.role = "mod"; u.tester = false; note = "Mod-Recht gegeben"; break;
    case "role_tester": u.role = "tester"; u.tester = false; note = "Tester-Recht gegeben"; break;
    case "role_none": case "untester": u.role = null; u.tester = false; note = "Rolle entzogen"; for (const [k, v] of testerKeys) if (v.un === u.username.toLowerCase()) testerKeys.delete(k); break;
    case "tester": u.role = "mod"; note = "Mod-Recht gegeben"; break;
    default: return { ok: false, error: "Aktion unbekannt." };
  }
  u.adminLog = (u.adminLog || []).concat([{ t: Date.now(), n: note }]).slice(-20);
  console.log("[Admin] " + u.username + ": " + note);
  await saveUsers();
  return { ok: true, note, user: adminUserRow(u) };
}
function adminCheaters(key, ip) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || adminKey.length < 12) return { ok: false, error: "Nicht verfügbar." };
  if (rlHit("adm|" + ip, 6, 10 * 60 * 1000, 10 * 60 * 1000).lockedUntil > Date.now()) return { ok: false, error: "Zu viele Versuche." };
  const a = Buffer.from(String(key || "")), b = Buffer.from(adminKey);
  if (a.length !== b.length || !require("crypto").timingSafeEqual(a, b)) return { ok: false, error: "Nicht verfügbar." };
  const list = users.filter(u => (u.stats && u.stats.cheatFlags) || u.restricted).map(u => ({ username: u.username, flags: (u.stats && u.stats.cheatFlags) || 0, restricted: isRestricted(u), last: (u.stats && u.stats.lastCheat) || null }))
    .sort((x, y) => y.flags - x.flags).slice(0, 100);
  return { ok: true, cheaters: list };
}

const ARENA_MIN_MATCH_MS = Number(process.env.ARENA_MIN_MATCH_MS) || 20000;

// Shop: Münzen gegen ein Arena-Herz eintauschen. Serverautoritativ (wie der
// Rest von Arena) - der Client kann nicht einfach behaupten, Herzen gekauft
// zu haben. Aufgefüllte Herzen gehen nie über das normale Tageskontingent
// hinaus (sonst würde der Münzen-Shop den eigentlichen Sinn der Herzen als
// Tagesbremse aushebeln).
const ARENA_HEART_COST = 20;
async function arenaBuyHeart(token, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(token);
  if (!user) return errObj("notLoggedIn", lang);
  refreshArenaHearts(user);
  if ((user.stats.coins || 0) < ARENA_HEART_COST) return errObj("notEnoughCoins", lang);
  if (user.stats.arenaHearts >= ARENA_DAILY_HEARTS) return errObj("heartsAlreadyFull", lang);
  user.stats.coins -= ARENA_HEART_COST;
  user.stats.arenaHearts += 1;
  await saveUsers();
  return { ok: true, coins: user.stats.coins, hearts: user.stats.arenaHearts, maxHearts: ARENA_DAILY_HEARTS };
}

/* ============================================================================
   ECHTGELD-SHOP: Münzen per Stripe Checkout kaufen.
   Bewusst OHNE das "stripe"-npm-Paket umgesetzt (dieses Projekt hat keine
   Abhängigkeiten, nur eingebaute Node-Module) - Stripes Schnittstelle ist
   eine ganz normale HTTPS-API, das reicht hier völlig.
   Erst aktiv, wenn STRIPE_SECRET_KEY und STRIPE_WEBHOOK_SECRET als
   Umgebungsvariablen gesetzt sind - ohne die zeigt der Shop einen klaren
   Hinweis statt etwas kaputt zu machen.
   ============================================================================ */
const COIN_PACKAGES = [
  { id: "small", coins: 100, priceCents: 99, label: "100 Münzen" },
  { id: "medium", coins: 600, priceCents: 499, label: "600 Münzen" },
  { id: "large", coins: 1500, priceCents: 999, label: "1500 Münzen" }
];
/* ---------------------------------------------------------------------------
   FEATURE-SCHALTER (Coming soon). Umgebungsvariable LOCKED_FEATURES, kommagetrennt.
   Moegliche Namen: shop, arena, chess_online, party, ordering, blitz, biology, chess_fantasy, achievements.  Nicht gesetzt = oeffentlicher
   Standard (alle drei gesperrt).  Auf dem Test-Server LOCKED_FEATURES=none setzen,
   dann ist alles freigeschaltet.  Gesperrt wird auch serverseitig - nicht nur
   im Menue versteckt.
--------------------------------------------------------------------------- */
// Anwesenheit: Clients melden sich alle 60 s (zufaellige Sitzungs-ID, keine personenbezogenen Daten).
const presence = new Map(); // sid -> { t, logged }
const PRESENCE_TTL = 150000;
function presenceTouch(sid, logged, where, token) {
  if (typeof sid !== "string" || sid.length < 8 || sid.length > 40) return;
  if (presence.size > 20000 && !presence.has(sid)) return;
  let name = null, tk = null, tkAt = 0;
  const prev = presence.get(sid);
  if (logged && typeof token === "string") {
    if (prev && prev.tk === token && Date.now() - prev.tkAt < 300000) { name = prev.name; tk = prev.tk; tkAt = prev.tkAt; }
    else { const u = findUserByToken(token); if (u && !u.adminCloak) name = u.username; tk = token; tkAt = Date.now(); }
  }
  presence.set(sid, { t: Date.now(), logged: !!logged, where: typeof where === "string" ? where.slice(0, 40) : "", name, tk, tkAt });
  seenTodayAdd(sid);
}
function adminLive(key, ip) {
  if (!adminOk(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const now = Date.now(), players = [], games = {};
  for (const [k, v] of presence) {
    if (now - v.t > PRESENCE_TTL) continue;
    const w = v.where || "?"; games[w] = (games[w] || 0) + 1;
    players.push({ name: v.name, where: w, ago: Math.round((now - v.t) / 1000) });
  }
  players.sort((a, b) => (b.name ? 1 : 0) - (a.name ? 1 : 0) || String(a.name).localeCompare(String(b.name)));
  const top = Object.entries(games).sort((a, b) => b[1] - a[1]).map(([where, n]) => ({ where, n }));
  const chat = (conversations[PUB_KEY] || []).slice(-100);
  return { ok: true, counts: Object.assign(presenceCounts(), { today: Math.max((seenToday.day === new Date().toISOString().slice(0, 10)) ? seenToday.set.size : 0, (statDay().ids || []).length) }), players, top, chat, blocked: chatBlockedLog.slice(-15).reverse() };
}
async function adminChat(action, payload, ip, lang) {
  if (!adminOk(payload && payload.adminKey, ip)) return { ok: false, error: "Nicht verfügbar." };
  if (!(await ensureConversationsLoaded())) return { ok: false, error: "Chat nicht verfügbar." };
  const list = conversations[PUB_KEY] || (conversations[PUB_KEY] = []);
  if (action === "delete") { const id = parseInt(payload.id, 10); const i = list.findIndex(m => m.id === id); if (i >= 0) list.splice(i, 1); pubVer++; }
  else if (action === "clear") { pubVer++; const last = list.length ? list[list.length - 1].id : 0; list.length = 0; list.push({ id: last + 1, sys: true, k: "adminclear", ts: Date.now() }); }
  else if (action === "send") {
    const t = String(payload.text || "").replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, PUB_LEN);
    if (!t) return { ok: false, error: "Leer." };
    const last = list.length ? list[list.length - 1] : null;
    list.push({ id: (last ? last.id : 0) + 1, u: payload._mod ? "Mod" : "Admin", a: payload._mod ? "🛡️" : "👑", t, ts: Date.now(), adm: true });
    if (list.length > PUB_MAX) list.splice(0, list.length - PUB_MAX);
  } else return { ok: false, error: "Aktion unbekannt." };
  saveConversations();
  return { ok: true };
}
function presenceCounts() {
  const now = Date.now(); let total = 0, logged = 0;
  for (const [k, v] of presence) { if (now - v.t > PRESENCE_TTL) { presence.delete(k); continue; } total++; if (v.logged) logged++; }
  statPeakTick(total);
  return { online: total, loggedIn: logged, guests: total - logged, peakToday: presencePeak(total) };
}
let presencePeakDay = "", presencePeakVal = 0;
function presencePeak(n) { const d = new Date().toISOString().slice(0, 10); if (d !== presencePeakDay) { presencePeakDay = d; presencePeakVal = 0; } if (n > presencePeakVal) presencePeakVal = n; return presencePeakVal; }
// Oeffentlicher Live-Bereich: echte Zahlen + echter Aktivitaets-Feed (nur echte Ereignisse am Server).
// Namen erscheinen nur, wenn der Spieler es in den Einstellungen erlaubt hat (feedOptIn) - sonst "ein Spieler".
const PUBLIC_ONLINE_MIN = Math.max(1, parseInt(process.env.PUBLIC_ONLINE_MIN || "2", 10) || 2);
const feed = []; // { t, kind, name|null, n }
const seenToday = { day: "", set: new Set() };
function seenTodayAdd(sid) {
  const d = new Date().toISOString().slice(0, 10);
  if (seenToday.day !== d) { // neuer Tag oder Neustart: heutige Besucher aus dem Speicher zurueckholen (Deploy setzt den Zaehler sonst auf 0)
    seenToday.day = d; seenToday.set = new Set();
    try { const st = statDay(); if (Array.isArray(st.ids)) st.ids.forEach(x => seenToday.set.add(x)); } catch (e) {}
  }
  if (seenToday.set.size < 50000 && !seenToday.set.has(sid)) {
    seenToday.set.add(sid);
    try { const st = statDay(); if (!Array.isArray(st.ids)) st.ids = []; if (st.ids.length < 5000) { st.ids.push(sid); maniaSaveSoon(); } } catch (e) {}
  }
}
function feedPush(user, kind, n, x) {
  const name = user && user.feedOptIn ? user.username : null;
  feed.unshift({ t: Date.now(), kind, name, n: n | 0, x: x ? String(x).slice(0, 40) : undefined });
  if (feed.length > 30) feed.length = 30;
  chatSystemPost(kind, name, n | 0, x).catch(() => {}); // dieselbe Meldung erscheint auch im oeffentlichen Chat
}
// Live-Meldung als Systemzeile im oeffentlichen Chat (ohne Absender; Name nur wenn erlaubt).
async function chatSystemPost(kind, name, n, x) {
  if (!(await ensureConversationsLoaded())) return;
  const list = conversations[PUB_KEY] || (conversations[PUB_KEY] = []);
  const last = list.length ? list[list.length - 1] : null;
  list.push({ id: (last ? last.id : 0) + 1, sys: 1, k: kind, nm: name || "", n: n | 0, x: x ? String(x).slice(0, 40) : "", u: "", t: "", ts: Date.now() });
  if (list.length > PUB_MAX) list.splice(0, list.length - PUB_MAX);
  saveConversations();
}
// Client meldet einen Meilenstein (aktuell: Brain-Defense-Welle). Nur Vielfache von 10, nur nach oben, je Konto.
async function feedEvent(token, kind, n, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const me = findUserByToken(token);
  if (!me) return errObj("notLoggedIn", lang);
  if (isRestricted(me) || isMuted(me)) return { ok: true, skipped: true };
  if (kind !== "wave") return { ok: false, error: "?" };
  n = Math.floor(Number(n));
  if (!(n >= 10 && n <= 500 && n % 10 === 0)) return { ok: true, skipped: true };
  if (rlHit("fev|" + me.username.toLowerCase(), 20, 3600000, 3600000).lockedUntil > Date.now()) return { ok: true, skipped: true };
  if ((me.stats.feedWaveMax || 0) >= n) return { ok: true, skipped: true };
  me.stats.feedWaveMax = n; await saveUsers();
  feedPush(me, "wave", n);
  return { ok: true };
}
function publicStats() {
  const c = presenceCounts();
  const d = new Date().toISOString().slice(0, 10);
  const cutoff = Date.now() - 24 * 3600 * 1000;
  return { ok: true, online: c.online >= PUBLIC_ONLINE_MIN ? c.online : null, today: Math.max(seenToday.day === d ? seenToday.set.size : 0, (statDay().ids || []).length), feed: feed.filter(e => e.t > cutoff).slice(0, 8) };
}
const LOCKED_FEATURES = new Set(
  (process.env.LOCKED_FEATURES === undefined ? "arena,ordering,blitz,chess_fantasy,ttt_quantum,fourups_abilities,brain_royale" : process.env.LOCKED_FEATURES)
    .split(",").map(x => x.trim().toLowerCase()).filter(x => x && x !== "none")
);
/* ---- Spiele-Schalter: Offline (Wartung) / Gesperrt / Test / Offen, einstellbar in der Admin-App ---- */
const GAME_DEFS = [
  { id: "braintest", name: "Brain Test", group: "Hauptmenü", icon: "🎯", classes: 10 },
  { id: "daily", name: "Tagesrätsel", group: "Hauptmenü", icon: "📅" },
  { id: "events", name: "Events (Battle Royale)", group: "Online-Modus", icon: "⚔️" },
  { id: "party", name: "Party (Online)", group: "Online-Modus", icon: "🎉" },
  { id: "arena", name: "Arena", group: "Online-Modus", icon: "🏆", classes: 2, classNames: ["Schüler-Liga", "Lehrer-Liga"] },
  { id: "speedmath", name: "Speed Math", group: "Modi", icon: "➕" },
  { id: "biology", name: "Biology", group: "Modi", icon: "🧬" },
  { id: "vocab", name: "Vocab", group: "Modi", icon: "💬" },
  { id: "braining", name: "Brainmania", group: "Minigames", icon: "🧠" },
  { id: "braining_fruit", name: "Brain Fruit", group: "Minigames", icon: "🍓", sub: "braining" },
  { id: "braining_hood", name: "Brain Hood", group: "Minigames", icon: "🧊", sub: "braining" },
  { id: "braining_solitaire", name: "Solitär", group: "Minigames", icon: "⚫", sub: "braining" },
  { id: "chess", name: "Chess", group: "Minigames", icon: "♟️" },
  { id: "hard", name: "Das schwerste Spiel der Welt", group: "Minigames", icon: "💀" },
  { id: "mania", name: "Der Stein (ehem. Brainmania)", group: "Minigames", icon: "🪨", sub: "hard" },
  { id: "hard_balken", name: "Der Balken", group: "Minigames", icon: "📏", sub: "hard" },
  { id: "hard_gedaechtnis", name: "Das Gedächtnis", group: "Minigames", icon: "🧠", sub: "hard" },
  { id: "hard_linie", name: "Die Linie", group: "Minigames", icon: "🎯", sub: "hard" },
  { id: "hard_gegenteil", name: "Das Gegenteil", group: "Minigames", icon: "🔄", sub: "hard" },
  { id: "hard_flug", name: "Der Farbflug", group: "Minigames", icon: "🚀", sub: "hard" },
  { id: "hard_blasen", name: "Die Blasen", group: "Minigames", icon: "🫧", sub: "hard" },
  { id: "hard_puls", name: "Der Puls", group: "Minigames", icon: "💓", sub: "hard" },
  { id: "hard_farbe", name: "Die Farbe", group: "Minigames", icon: "🎨", sub: "hard" },
  { id: "hard_tasten", name: "Die Tasten", group: "Minigames", icon: "⌨️", sub: "hard" },
  { id: "hard_olympiade", name: "Olympiade", group: "Minigames", icon: "🏅", sub: "hard" },
  { id: "chess_online", name: "Chess online", group: "Minigames", icon: "🌐", sub: "chess" },
  { id: "chess_fantasy", name: "Fantasy-Schach", group: "Minigames", icon: "🧙", sub: "chess" },
  { id: "dame", name: "Dame", group: "Minigames", icon: "♛", sub: "chess" },
  { id: "muehle", name: "Mühle", group: "Minigames", icon: "⚪", sub: "chess" },
  { id: "ttt", name: "Tic Tac Toe", group: "Minigames", icon: "❌" },
  { id: "ttt_quantum", name: "Quanten-Tic-Tac-Toe", group: "Minigames", icon: "⚛️", sub: "ttt" },
  { id: "brain_royale", name: "Brain Duel (Royale + Mana)", group: "Minigames", icon: "⚔️" },
  { id: "taboo", name: "Taboo (alle Modi)", group: "Minigames", icon: "🚫" },
  { id: "taboo_team", name: "Taboo Team (Party)", group: "Minigames", icon: "👥", sub: "taboo" },
  { id: "taboo_ffa", name: "Taboo Wettbewerb (Party)", group: "Minigames", icon: "🏁", sub: "taboo" },
  { id: "taboo_solo", name: "Taboo Solo", group: "Minigames", icon: "🔤", sub: "taboo" },
  { id: "zp", name: "Brainups-System", group: "Brainups", icon: "⭐" },
  { id: "boards", name: "Online-Bestenlisten", group: "Brainups", icon: "🏆" },
  { id: "chem", name: "Brainchimie", group: "Minigames", icon: "⚗️" },
  { id: "backgammon", name: "Backgammon", group: "Minigames", icon: "🎲" },
  { id: "fourups", name: "Fourups", group: "Minigames", icon: "🔴" },
  { id: "fourups_abilities", name: "Fourups Fähigkeiten", group: "Minigames", icon: "✨", sub: "fourups" },
  { id: "ordering", name: "Ordering", group: "Minigames", icon: "🔢" },
  { id: "blitz", name: "Blitz", group: "Minigames", icon: "⚡" },
  { id: "achievements", name: "Erfolge", group: "Menüleiste", icon: "🏅" },
  { id: "shop", name: "Shop", group: "Menüleiste", icon: "🛒" },
  { id: "shop_speedmath", name: "Speed-Math-Herz", group: "Shop", icon: "🧮" },
  { id: "shop_arena", name: "Arena-Herz", group: "Shop", icon: "🏆" },
  { id: "shop_fruit", name: "Brain-Fruit-Booster + Speicher", group: "Shop", icon: "🍓" },
  { id: "shop_chess", name: "Chess-Shop", group: "Shop", icon: "♞" },
  { id: "shop_fourups", name: "Fourups-Kisten", group: "Shop", icon: "✨" },
  { id: "shop_coins", name: "Münzen kaufen (Echtgeld)", group: "Shop", icon: "💶" }
];
const GAME_MODES = ["offline", "locked", "test", "open"];
let gameCfg = { modes: {}, classOff: {} };
const GAMES_FILE = USERS_FILE + ".games.json";
async function loadGameCfg() {
  try {
    let raw = null;
    if (USE_UPSTASH) {
      const res = await fetch(`${UPSTASH_URL}/get/${UPSTASH_USERS_KEY}_games`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
      const d = await res.json(); if (d && d.result) raw = JSON.parse(d.result);
    } else if (fs.existsSync(GAMES_FILE)) raw = JSON.parse(fs.readFileSync(GAMES_FILE, "utf8"));
    if (raw && typeof raw === "object") gameCfg = { modes: raw.modes || {}, classOff: raw.classOff || {}, news: Array.isArray(raw.news) ? raw.news : undefined, mania: raw.mania && typeof raw.mania === "object" ? raw.mania : undefined, hard: raw.hard && typeof raw.hard === "object" ? raw.hard : undefined, zp: raw.zp && typeof raw.zp === "object" ? raw.zp : undefined, stats: raw.stats && typeof raw.stats === "object" ? raw.stats : undefined, events: Array.isArray(raw.events) ? raw.events : undefined, feedback: Array.isArray(raw.feedback) ? raw.feedback : undefined }; try { zpApplyCfg(); } catch (e) {}
  } catch (e) { console.error("Spiele-Einstellungen nicht lesbar:", e.message); }
}
// ---- NEWS (steht mit in den Spiele-Einstellungen, bleibt also mit gespeichert) ----
const NEWS_WELCOME = { id: 1, ts: Date.UTC(2026, 9, 25), de: { title: "Herzlich willkommen bei Brain Pulse!", text: "Schön, dass du da bist! Hier findest du ab jetzt alle Neuigkeiten: neue Spiele, neue Funktionen und Aktionen.\n\nViel Spaß beim Ausprobieren und viel Spaß beim Spielen!" }, en: { title: "Welcome to Brain Pulse!", text: "Great to have you here! This is where you'll find all the news from now on: new games, new features and events.\n\nHave fun trying things out and enjoy playing!" } };
function newsAll() { return Array.isArray(gameCfg.news) && gameCfg.news.length ? gameCfg.news : [NEWS_WELCOME]; }
function newsPublic(token) {
  const all = newsAll(), out = { ok: true, news: all.slice(-30).reverse(), lastId: all.reduce((m, n) => Math.max(m, n.id), 0) };
  if (token && usersLoaded) { const u = findUserByToken(token); if (u) { out.account = true; out.seen = u.newsSeen | 0; } }
  return out;
}
async function newsMarkSeen(token, id) {
  if (!usersLoaded) return { ok: false };
  const u = findUserByToken(token); if (!u) return { ok: false };
  const last = newsAll().reduce((m, n) => Math.max(m, n.id), 0);
  const n = Math.min(last, Math.max(0, parseInt(id, 10) || 0));
  if (n > (u.newsSeen | 0)) { u.newsSeen = n; await saveUsers(); }
  return { ok: true, seen: u.newsSeen | 0 };
}
async function adminNews(key, ip, payload) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const clean = (x, n) => String(x == null ? "" : x).replace(/[\u0000-\u0008\u000b-\u001f]+/g, " ").trim().slice(0, n);
  if (payload.action === "add") {
    const title = clean(payload.title, 80), text = clean(payload.text, 1500);
    if (!title || !text) return { ok: false, error: "Titel und Text fehlen." };
    const list = newsAll().slice();
    const en = clean(payload.titleEn, 80) && clean(payload.textEn, 1500) ? { title: clean(payload.titleEn, 80), text: clean(payload.textEn, 1500) } : null;
    list.push({ id: list.reduce((m, n) => Math.max(m, n.id), 0) + 1, ts: Date.now(), de: { title, text }, en: en || { title, text } });
    gameCfg.news = list.slice(-50);
  } else if (payload.action === "del") {
    const id = parseInt(payload.id, 10);
    gameCfg.news = newsAll().filter(n => n.id !== id);
  }
  if (!(await saveGameCfg())) return { ok: false, error: "Speichern fehlgeschlagen." };
  return newsPublic();
}
// ---- BRAINMANIA (Admin-Spiel, Bestenliste liegt mit in den Spiele-Einstellungen) ----
const MANIA_TIERS = ["Stein", "Bronze", "Silber", "Gold", "Diamant"];
function maniaDraw(ms) { // geheim: je schneller, desto bessere Chancen. Die Grenzen sieht kein Client.
  const h = ms / 3600000;
  const w = h < 30 ? [5, 15, 30, 30, 20] : h < 60 ? [20, 30, 25, 18, 7] : h < 150 ? [45, 30, 15, 8, 2] : [70, 22, 6, 2, 0];
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
  return 0;
}
const MANIA_RX = ["👍", "👎", "💪", "🔥", "👏"];
const maniaRxLast = new Map();
let maniaSaveTimer = null;
function maniaSaveSoon() { if (maniaSaveTimer) return; maniaSaveTimer = setTimeout(() => { maniaSaveTimer = null; saveGameCfg().catch(() => {}); }, 10000); }
function maniaStore() { if (!gameCfg.mania) gameCfg.mania = {}; if (!gameCfg.mania.p) gameCfg.mania.p = {}; if (!gameCfg.mania.cfg) gameCfg.mania.cfg = { botOn: false, botRate: 6, botName: "Bot" }; return gameCfg.mania; }
function maniaTotal(r) { return (r.km | 0) * 1000000 + (r.n | 0); }
function maniaBotTick() { // Test-Bot: tippt serverseitig mit festem Tempo, wird beim Abfragen nachgerechnet
  const st = maniaStore(), c = st.cfg, r = st.p.__bot; const now = Date.now();
  if (!r) return; if (!c.botOn) { r.bt = 0; return; }
  r.name = String(c.botName || "Bot").slice(0, 20); r.bot = true;
  if (!r.bt) { r.bt = now; return; }
  const dt = Math.min(now - r.bt, 6 * 3600 * 1000); r.bt = now;
  r.frac = (r.frac || 0) + dt * Math.max(0.1, Math.min(200, Number(c.botRate) || 6)) / 1000;
  const add = Math.floor(r.frac); r.frac -= add; r.n = (r.n | 0) + add; r.runMs = (r.runMs || 0) + dt;
  let crossed = false;
  while (r.n >= 1000000) { r.n -= 1000000; r.km = (r.km | 0) + 1; r.tier = Math.max(r.tier | 0, maniaDraw(r.runMs)); r.runMs = 0; crossed = true; }
  if (crossed) maniaSaveSoon();
}
function maniaRows() {
  maniaBotTick();
  const p = maniaStore().p, c = maniaStore().cfg;
  return Object.values(p).filter(r => maniaTotal(r) > 0 && (!r.bot || c.botOn)).sort((a, b) => (maniaTotal(b) - maniaTotal(a)) || ((a.ts | 0) - (b.ts | 0)));
}
function maniaLikes(r) { return (r.rx && r.rx["👍"]) | 0; }
function maniaView(name) {
  const rows = maniaRows(), k = String(name || "").toLowerCase();
  const i = rows.findIndex(r => r.name.toLowerCase() === k);
  return { ok: true, board: rows.slice(0, 20).map(r => ({ name: r.name, km: r.km | 0, total: maniaTotal(r), tier: r.tier | 0, likes: maniaLikes(r), bot: !!r.bot })), of: rows.length, me: i >= 0 ? { rank: i + 1, km: rows[i].km | 0, total: maniaTotal(rows[i]), tier: rows[i].tier | 0 } : null };
}
function maniaWatch(target) {
  const rows = maniaRows(), k = String(target || "").toLowerCase(); const r = rows.find(x => x.name.toLowerCase() === k);
  if (!r) return { ok: false, error: "Nicht gefunden." };
  const c = maniaStore().cfg;
  return { ok: true, name: r.name, n: r.n | 0, km: r.km | 0, tier: r.tier | 0, rx: r.rx || {}, bot: !!r.bot, rate: r.bot ? Number(c.botRate) || 6 : 0, rank: rows.indexOf(r) + 1, of: rows.length, t: Date.now() };
}
function adminManiaCall(key, ip, payload) {
  if (!adminAuth(key, ip)) return { ok: false, error: "Nicht verfügbar." };
  const st = maniaStore(), c = st.cfg;
  if (payload.action === "get") return Promise.resolve({ ok: true, cfg: c, players: Object.keys(st.p).filter(k => k !== "__bot").length, bot: st.p.__bot ? (maniaBotTick(), { n: st.p.__bot.n | 0, km: st.p.__bot.km | 0 }) : null });
  if (payload.action === "set") {
    if (payload.botOn !== undefined) { const on = !!payload.botOn; if (on && !st.p.__bot) st.p.__bot = { name: String(c.botName || "Bot"), km: 0, n: 0, best: 0, tier: 0, ts: Date.now(), rids: [], bot: true }; if (on && !c.botOn && st.p.__bot) st.p.__bot.bt = Date.now(); c.botOn = on; }
    if (payload.botRate !== undefined) c.botRate = Math.max(0.1, Math.min(200, Number(payload.botRate) || 6));
    if (payload.botName !== undefined) c.botName = String(payload.botName).replace(/[\u0000-\u001f<>]+/g, " ").trim().slice(0, 20) || "Bot";
  } else if (payload.action === "reset-bot") { delete st.p.__bot; c.botOn = false; }
  else if (payload.action === "clear-board") { for (const k of Object.keys(st.p)) { if (k !== "__bot") delete st.p[k]; } }
  else if (payload.action === "clear-reactions") { for (const k of Object.keys(st.p)) delete st.p[k].rx; }
  return saveGameCfg().then(ok => ok ? { ok: true, cfg: c, players: Object.keys(st.p).filter(k => k !== "__bot").length, bot: st.p.__bot ? { n: st.p.__bot.n | 0, km: st.p.__bot.km | 0 } : null } : { ok: false, error: "Speichern fehlgeschlagen." }).catch(() => ({ ok: false, error: "Speichern fehlgeschlagen." }));
}
async function maniaApiCall(payload) {
  if (!usersLoaded) return { ok: false, unavailable: true };
  const u = payload.token ? findUserByToken(payload.token) : null;
  const name = u ? String(u.username || "").slice(0, 20) : "";
  if (payload.action === "watch") { if (!u || !name) return { ok: false, login: true, error: "Bitte anmelden." }; return maniaWatch(payload.target); }
  if (payload.action === "react") {
    if (!u || !name) return { ok: false, error: "Bitte anmelden." };
    const emo = String(payload.emoji || ""); if (!MANIA_RX.includes(emo)) return { ok: false, error: "Unbekannt." };
    maniaRows(); const k = String(payload.target || "").toLowerCase(); const r = Object.values(maniaStore().p).find(x => String(x.name).toLowerCase() === k && (!x.bot || maniaStore().cfg.botOn));
    if (!r) return { ok: false, error: "Nicht gefunden." };
    const lk = name.toLowerCase() + ">" + k, now = Date.now();
    if (now - (maniaRxLast.get(lk) || 0) < 350) return maniaWatch(payload.target);
    maniaRxLast.set(lk, now); if (maniaRxLast.size > 5000) maniaRxLast.clear();
    if (!r.rx) r.rx = {}; r.rx[emo] = (r.rx[emo] | 0) + 1; maniaSaveSoon();
    return maniaWatch(payload.target);
  }
  if (payload.action === "progress") {
    if (!u || !name) return { ok: false, error: "Bitte anmelden." };
    const n = Math.max(0, Math.min(999999, Math.floor(Number(payload.n) || 0)));
    const st = maniaStore();
    const k = name.toLowerCase(); let r = st.p[k];
    if (!r) r = st.p[k] = { name, km: 0, best: 0, tier: 0, ts: Date.now(), rids: [], n: 0 };
    if (n !== (r.n | 0)) { r.n = n; r.name = name; maniaSaveSoon(); }
    return maniaView(name);
  }
  if (payload.action === "submit") {
    if (!u || !name) return { ok: false, error: "Bitte anmelden." };
    const ms = Math.round(Number(payload.ms)); if (!(ms > 0) || ms > 1e11) return { ok: false, error: "Zeit ungültig." };
    maniaStore();
    const k = name.toLowerCase(), rid = String(payload.rid || "").slice(0, 40);
    let r = gameCfg.mania.p[k];
    if (!r) r = gameCfg.mania.p[k] = { name, km: 0, best: 0, tier: 0, ts: Date.now(), rids: [] };
    if (rid && r.rids.includes(rid)) { const v = maniaView(name); v.awarded = r.lastAward | 0; v.dup = true; return v; }
    const aw = maniaDraw(ms);
    r.km += 1; r.n = 0; r.best = r.best ? Math.min(r.best, ms) : ms; r.tier = Math.max(r.tier | 0, aw); r.lastAward = aw; r.ts = Date.now(); r.name = name;
    if (rid) r.rids = r.rids.concat(rid).slice(-8);
    if (!(await saveGameCfg())) return { ok: false, error: "Speichern fehlgeschlagen." };
    const v = maniaView(name); v.awarded = aw; return v;
  }
  const v = maniaView(name); v.account = !!u; v.name = name; return v;
}
// ---- DAS SCHWERSTE SPIEL DER WELT (Bestenlisten je Spiel, liegen mit in den Spiele-Einstellungen) ----
const HARD_GAMES = ["balken", "turm", "gedaechtnis", "linie", "gegenteil", "flug", "blasen", "puls", "farbe", "tasten", "olympiade"];
function hardApiCall(payload) {
  if (!usersLoaded) return { ok: false, unavailable: true };
  const game = String(payload.game || ""); if (!HARD_GAMES.includes(game)) return { ok: false, error: "Unbekannt." };
  const u = payload.token ? findUserByToken(payload.token) : null, name = u ? String(u.username || "").slice(0, 20) : "";
  if (!gameCfg.hard) gameCfg.hard = {}; if (!gameCfg.hard[game]) gameCfg.hard[game] = {};
  const t = gameCfg.hard[game];
  let mine = 0;
  if (payload.action === "submit") {
    if (!u || !name) return { ok: false, error: "Bitte anmelden." };
    const sc = Math.floor(Number(payload.score)); if (!(sc > 0) || sc > (game === "olympiade" ? 5000 : 1000)) return { ok: false, error: "Wert ungültig." };
    const k = name.toLowerCase(); const r = t[k] || (t[k] = { name, best: 0, ts: Date.now() });
    const pc = Math.max(0, Math.min(100, Math.floor(Number(payload.pct)))); 
    if (sc > r.best) { r.best = sc; r.ts = Date.now(); r.name = name; if (Number.isFinite(pc) && payload.pct != null) r.pct = pc; else delete r.pct; maniaSaveSoon(); }
    mine = r.best;
  } else if (name && t[name.toLowerCase()]) mine = t[name.toLowerCase()].best;
  const rows = Object.values(t).sort((a, b) => (b.best - a.best) || (a.ts - b.ts));
  const i = name ? rows.findIndex(r => r.name.toLowerCase() === name.toLowerCase()) : -1;
  const me = i >= 0 ? { name: rows[i].name, best: rows[i].best, pct: rows[i].pct == null ? null : rows[i].pct } : null;
  return { ok: true, board: rows.slice(0, 5).map(r => ({ name: r.name, best: r.best, pct: r.pct == null ? null : r.pct })), me, mine, rank: i >= 0 ? i + 1 : 0 };
}
async function saveGameCfg() {
  if (USE_UPSTASH) {
    try { const res = await fetch(`${UPSTASH_URL}/set/${UPSTASH_USERS_KEY}_games`, { method: "POST", headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "text/plain" }, body: JSON.stringify(gameCfg) }); return res.ok; } catch (e) { return false; }
  }
  try { fs.mkdirSync(path.dirname(GAMES_FILE), { recursive: true }); fs.writeFileSync(GAMES_FILE, JSON.stringify(gameCfg), "utf8"); return true; } catch (e) { console.error(e.message); return false; }
}
// Gespeicherter Schalter, sonst Startwert aus LOCKED_FEATURES (Render). Test vor dem Startdatum zaehlt wie "gesperrt".
const DEFAULT_LOCKED_NEW = new Set(["backgammon", "mania", "hard", "shop_coins", "shop_chess", "shop_fourups"]); // neue Schalter starten gesperrt, egal was LOCKED_FEATURES sagt (Echtgeld nie aus Versehen offen)
function gameModeRaw(id) { const c = gameCfg.modes[id]; return c && GAME_MODES.includes(c.mode) ? c.mode : ((LOCKED_FEATURES.has(id) || DEFAULT_LOCKED_NEW.has(id)) ? "locked" : "open"); }
// Startdatum gilt fuer "Test" und "Offen": davor zaehlt das Spiel wie "gesperrt" (mit Countdown)
function gameStart(id) { const m = gameModeRaw(id), c = gameCfg.modes[id]; return (c && (m === "test" || m === "open") && c.start && Date.now() < c.start) ? c.start : 0; }
// "Versteckt": Spieler sehen das Spiel gar nicht (nur Admin/Mod/Tester mit Zugriff), statt "Coming soon"
function gameHide(id) { const c = gameCfg.modes[id]; return !!(c && c.hide); }
function gameMode(id) { const m = gameModeRaw(id); return gameStart(id) ? "locked" : m; }
function featureLocked(name) { return gameMode(name) !== "open"; }
// Darf jemand mit diesem Schluessel das Spiel nutzen? Admin: immer. Mod: alles ausser "Offline". Tester: nur im Test.
function gateOk(name, key, ip) {
  const m = gameMode(name);
  if (m === "open") return true;
  const role = testerKeyOk(key);
  if (role === "mod" || role === "tester") return m === "test"; // Mod = wie Tester: nur Spiele im Test
  return adminOk(key, ip);
}
function classOffList(id) { return Array.isArray(gameCfg.classOff[id]) ? gameCfg.classOff[id] : []; }
function gameStatusFor(key, ip) {
  const admin = !testerKeyOk(key) && adminOk(key, ip), role = testerKeyOk(key);
  const locked = [], maint = [], hidden = [], countdown = {}, modes = {};
  for (const g of GAME_DEFS) {
    const m = gameMode(g.id);
    const st = gameStart(g.id);
    const ok = m === "open" || admin || ((role === "mod" || role === "tester") && m === "test");
    if (st && (admin || role || !gameHide(g.id))) countdown[g.id] = st;
    if (ok && m !== "open") modes[g.id] = m; // nur fuer Admin/Mod/Tester: dieses Spiel ist fuer Spieler (noch) nicht offen
    if (!ok) { locked.push(g.id); if (m === "offline") maint.push(g.id); if (gameHide(g.id)) hidden.push(g.id); }
  }
  for (const n of LOCKED_FEATURES) if (!GAME_DEFS.some(g => g.id === n) && !admin && !role) locked.push(n);
  const canAll = admin || role === "mod";
  return { admin: admin || !!role, locked, maint, hidden, modes, countdown, now: Date.now(), braintestOff: canAll ? [] : classOffList("braintest"), arenaOff: canAll ? [] : classOffList("arena") };
}
const FEATURE_LOCKED_RESULT = { ok: false, locked: true, error: "Coming soon." };

function stripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
// Rohe HTTPS-Anfrage an Stripes API (Formular-kodiert, wie Stripe es
// erwartet - kein JSON). Der geheime Schlüssel geht als HTTP-Basic-Auth-
// Benutzername (Stripe-Konvention), das Passwort bleibt leer.
function stripeApiRequest(apiPath, formParams) {
  return new Promise((resolve, reject) => {
    const body = querystring.stringify(formParams);
    // STRIPE_API_BASE (z.B. "http://127.0.0.1:1234") nur fuer Tests mit einem nachgestellten Stripe-Server.
    const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
    const lib = base && base.protocol === "http:" ? http : https;
    const req = lib.request({
      hostname: base ? base.hostname : "api.stripe.com", port: base ? base.port : undefined, path: apiPath, method: "POST",
      auth: process.env.STRIPE_SECRET_KEY + ":",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) }
    }, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, json: null }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
// Erstellt eine Stripe-Checkout-Session fuer ein Muenzpaket. origin ist die
// eigene Basis-URL (z.B. "https://dein-spiel.onrender.com"), damit Stripe
// nach der Zahlung dorthin zurueckleiten kann.
async function shopCreateCheckout(token, packageId, origin, lang) {
  if (featureLocked("shop_coins")) return { ok: false, error: lang === "en" ? "Coming soon." : "Kommt bald." }; // Echtgeld nur, wenn der Admin "Münzen kaufen" auf Offen stellt
  if (!stripeConfigured()) return errObj("shopNotConfigured", lang);
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(token);
  if (!user) return errObj("notLoggedIn", lang);
  const pkg = COIN_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return errObj("unknownPackage", lang);
  const params = {
    mode: "payment",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][product_data][name]": pkg.label + ", Brain Pulse",
    "line_items[0][price_data][unit_amount]": String(pkg.priceCents),
    "line_items[0][quantity]": "1",
    success_url: origin + "/?shop=success",
    cancel_url: origin + "/?shop=cancel",
    "metadata[username]": user.username,
    "metadata[coins]": String(pkg.coins),
    "metadata[packageId]": pkg.id,
    // Stripe "Managed Payments" verlangt je Produkt einen Steuercode (tax_code).
    // Wir verkaufen selbst und rechnen ohne Managed Payments ab - daher fuer
    // diese Sitzung ausschalten (Stripe nennt genau diesen Parameter in der Fehlermeldung).
    "managed_payments[enabled]": "false",
    "custom_text[submit][message]": "Mit dem Kauf verlangst du die sofortige Bereitstellung der Münzen und bestätigst, dass du dadurch dein Widerrufsrecht verlierst (§ 356 Abs. 5 BGB)."
  };
  let resp;
  try {
    resp = await stripeApiRequest("/v1/checkout/sessions", params);
    // Falls die API-Version den Parameter nicht kennt: ohne ihn erneut versuchen.
    if (resp.status === 400 && resp.json && resp.json.error && /custom_text/i.test(resp.json.error.param || resp.json.error.message || "")) {
      delete params["custom_text[submit][message]"];
      resp = await stripeApiRequest("/v1/checkout/sessions", params);
    }
    if (resp.status === 400 && resp.json && resp.json.error && /managed_payments/i.test(resp.json.error.param || "") && /unknown|unrecognized/i.test(resp.json.error.message || "")) {
      delete params["managed_payments[enabled]"];
      resp = await stripeApiRequest("/v1/checkout/sessions", params);
    }
  }
  catch (e) { return errObj("stripeFailed", lang); }
  if (resp.status !== 200 || !resp.json || !resp.json.url) {
    return { ok: false, error: (resp.json && resp.json.error && resp.json.error.message) || et("stripeDeclined", lang) };
  }
  return { ok: true, url: resp.json.url };
}
// Stripes Signaturschema (ohne SDK nachgebaut): Header hat die Form
// "t=<Zeitstempel>,v1=<Signatur>[,v0=...]". Erwartete Signatur ist
// HMAC-SHA256(Webhook-Secret, "<Zeitstempel>.<Rohkoerper>") als Hex,
// zeitkonstant verglichen. Zusaetzlich ein 5-Minuten-Toleranzfenster gegen
// Replay-Angriffe mit abgefangenen alten Anfragen.
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || typeof sigHeader !== "string") return false;
  const parts = Object.fromEntries(sigHeader.split(",").map(kv => kv.split("=")));
  const timestamp = parts.t, signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false; // 5 Minuten Toleranz
  const expected = crypto.createHmac("sha256", secret).update(timestamp + "." + rawBody).digest("hex");
  const a = Buffer.from(expected, "hex"), b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
// Verarbeitet ein tatsaechlich verifiziertes "checkout.session.completed"-
// Ereignis: schreibt die Muenzen gut. Eigene Funktion (statt direkt im
// Webhook-Handler), damit sich das ohne echte Stripe-Signatur testen laesst.
// Idempotent ueber eine kurze Liste bereits verarbeiteter Session-IDs pro
// Nutzer - Stripe kann denselben Webhook mehrfach zustellen (Netzwerk-
// Wiederholungen), das darf nie doppelt Muenzen gutschreiben.
const STRIPE_PROCESSED_SESSIONS_KEEP = 20;
async function creditStripeCoins(session) {
  const meta = session.metadata || {};
  const username = meta.username;
  const coins = Number(meta.coins);
  if (!username || !Number.isFinite(coins) || coins <= 0) return { ok: false, error: "Unvollständige Metadaten." };
  const user = findUserByName(username);
  if (!user) return { ok: false, error: "Nutzer nicht gefunden." };
  user.processedCheckoutSessions = user.processedCheckoutSessions || [];
  if (user.processedCheckoutSessions.includes(session.id)) return { ok: true, alreadyProcessed: true };
  user.stats.coins = (user.stats.coins || 0) + Math.round(coins);
  user.processedCheckoutSessions.push(session.id);
  if (user.processedCheckoutSessions.length > STRIPE_PROCESSED_SESSIONS_KEEP) {
    user.processedCheckoutSessions = user.processedCheckoutSessions.slice(-STRIPE_PROCESSED_SESSIONS_KEEP);
  }
  await saveUsers();
  return { ok: true, coinsCredited: Math.round(coins), newBalance: user.stats.coins };
}
async function handleStripeWebhook(rawBody, sigHeader) {
  if (!stripeConfigured()) return { status: 503, body: "not configured" };
  if (!verifyStripeSignature(rawBody, sigHeader, process.env.STRIPE_WEBHOOK_SECRET)) {
    return { status: 400, body: "invalid signature" };
  }
  let event;
  try { event = JSON.parse(rawBody); } catch (e) { return { status: 400, body: "invalid json" }; }
  if (event && event.type === "checkout.session.completed") {
    await creditStripeCoins(event.data.object);
  }
  return { status: 200, body: "ok" };
}

async function arenaStartMatch(token, lang, adminKeyForCheck) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(token);
  if (!user) return errObj("notLoggedIn", lang);
  refreshArenaHearts(user);
  if (classOffList("arena").includes(arenaLeagueInfo(user).index) && !testerKeyOk(adminKeyForCheck) && !adminKeyForCheck) return { ok: false, locked: true, maint: true, error: lang === "en" ? "This league is under maintenance." : "Diese Liga ist gerade in Wartung." };
  if (user.stats.arenaHearts <= 0) {
    return errObj("noHeartsLeft", lang);
  }
  user.stats.arenaHearts -= 1;
  const matchId = crypto.randomBytes(12).toString("hex");
  user.arenaActiveMatch = { id: matchId, startedAt: Date.now() };
  await saveUsers();
  const league = arenaLeagueInfo(user);
  return { ok: true, matchId, heartsLeft: user.stats.arenaHearts, league: { index: league.index, name: league.name, klasseMin: league.klasseMin, klasseMax: league.klasseMax } };
}

// Schließt ein Match ab: addiert die im Match gesammelten Punkte (1 pro
// korrekter Antwort/gelöster Aufgabe, vom Client mitgezählt) auf das
// Lifetime-Konto, prüft ob die aktuelle Liga damit überschritten wird
// (Aufstieg - niemals Abstieg, siehe Kommentar oben) und speichert.
async function arenaFinishMatch(token, pointsEarned, matchId, lang) {
  if (!usersLoaded) return serviceDownMsg(lang);
  const user = findUserByToken(token);
  if (!user) return errObj("notLoggedIn", lang);
  const am = user.arenaActiveMatch;
  if (!am || typeof matchId !== "string" || am.id !== matchId) {
    return errObj("noActiveMatch", lang);
  }
  if (Date.now() - am.startedAt < ARENA_MIN_MATCH_MS) {
    return errObj("matchTooFast", lang);
  }
  user.arenaActiveMatch = null; // Match-ID ist nur einmal gueltig
  const rawPts = Number(pointsEarned);
  const elapsedS = (Date.now() - am.startedAt) / 1000;
  const timeCap = Math.max(1, Math.floor(elapsedS / 2)); // ein Punkt braucht mindestens ~2 Sekunden
  let gained = Number.isFinite(rawPts) ? Math.min(ARENA_MAX_POINTS_PER_MATCH, Math.max(0, Math.round(rawPts))) : 0;
  if (gained > timeCap) { if (gained > timeCap + 3) flagCheat(user, "Arena " + gained + " Pkt in " + Math.round(elapsedS) + " s"); gained = timeCap; }
  user.stats.arenaPoints = (user.stats.arenaPoints || 0) + gained;
  user.stats.arenaMatchesPlayed = (user.stats.arenaMatchesPlayed || 0) + 1;

  let leaguePromoted = false;
  let league = arenaLeagueInfo(user);
  while (league.promoteAt !== null && league.promoteAt !== undefined && user.stats.arenaPoints >= league.promoteAt && ARENA_LEAGUES[league.index + 1]) {
    user.stats.arenaLeague = league.index + 1;
    leaguePromoted = true;
    league = arenaLeagueInfo(user);
  }
  await saveUsers();
  return { ok: true, pointsEarned: gained, totalPoints: user.stats.arenaPoints, league: { index: league.index, name: league.name }, leaguePromoted };
}

// Globale Bestenliste (geräteübergreifend, alle Konten) - sortiert nach
// arenaPoints absteigend. Zeigt nur, wer schon mindestens 1 Match gespielt
// hat, damit die Liste nicht mit frischen 0-Punkte-Konten überflutet wird.
// Für QuizMix gegen Bot bei Tic Tac Toe (rein clientseitiges Spiel, kein
// Raum/keine Session nötig) - liefert einfach N zufällige Fragen samt
// korrektem Index. Unbedenklich, da es sich um ein Solo-Spiel gegen einen
// simulierten Bot handelt, nicht um ein echtes Duell zwischen Personen
// (bei dem der Index natürlich geheim bleiben müsste).
function randomQuizQuestions(count) {
  const n = Math.min(20, Math.max(1, Number(count) || 5));
  const picked = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, n).map(shuffleAnswerOrder);
  return { ok: true, questions: picked.map(q => ({ q: q.q, a: q.a, c: q.c, cat: q.cat, e: q.e || "" })) };
}

function arenaLeaderboard() {
  const rows = users
    .filter(u => (u.stats.arenaMatchesPlayed || 0) > 0)
    .map(u => {
      const idx = Math.min(u.stats.arenaLeague || 0, ARENA_LEAGUES.length - 1);
      return {
        username: u.username,
        avatar: u.avatar || null,
        points: u.stats.arenaPoints || 0,
        leagueName: ARENA_LEAGUES[idx].name,
        matchesPlayed: u.stats.arenaMatchesPlayed || 0
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 50)
    .map((row, i) => ({ rank: i + 1, ...row }));
  return { ok: true, leaderboard: rows };
}

/* ------------------------------------------------------------------------ */
/* HTTP: statische Dateien aus /public                                       */
/* ------------------------------------------------------------------------ */
const MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".m4a": "audio/mp4" };

/* ------------------------------------------------------------------------ */
/* Hintergrundmusik: Titelliste wird aus dem Ordner public/audio ausgelesen -  */
/* neue Dateien dort erscheinen automatisch, ohne Code-Änderung.              */
/* ------------------------------------------------------------------------ */
// AUDIO_DIR per Umgebungsvariable überschreibbar (nur für Tests - im
// Normalbetrieb ungenutzt, zeigt dann auf den echten public/audio-Ordner).
const AUDIO_DIR = process.env.AUDIO_DIR || path.join(__dirname, "public", "audio");
const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".ogg", ".wav", ".aac", ".flac"]);
// Jede Datei, deren Name (ohne Endung, Gross/Klein und _/-/Leerzeichen egal)
// zu "tic-tac-game" passt, ist reserviert für Tic Tac Toe und läuft NIE im
// Menü-Pool mit.
const TTT_TRACK_KEY = "tic-tac-game";
function normalizeTrackKey(base) {
  return base.toLowerCase().replace(/[_\s-]+/g, "-").trim();
}
function prettyTrackName(base) {
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || base;
}
// Gruppiert Dateien mit demselben Namen (verschiedene Endung = derselbe
// Titel in mehreren Formaten, z.B. .mp3 + .m4a als Fallback-Alternativen).
function listAudioTracks() {
  let files;
  try { files = fs.readdirSync(AUDIO_DIR); } catch (e) { return { menu: [], ttt: null }; }
  const groups = new Map(); // normalisierter Name -> { name, files: [] }
  for (const f of files.sort()) {
    const ext = path.extname(f).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) continue;
    const base = f.slice(0, f.length - ext.length);
    const key = normalizeTrackKey(base);
    if (!groups.has(key)) groups.set(key, { name: prettyTrackName(base), files: [] });
    groups.get(key).files.push(f);
  }
  let ttt = null;
  const menu = [];
  for (const [key, track] of groups) {
    if (key === TTT_TRACK_KEY && !ttt) ttt = track; else menu.push(track);
  }
  return { menu, ttt };
}
// Sicherheits-Header. Bewusst KEINE strikte script-src-CSP: die Seite nutzt
// Inline-Skripte/onclick-Handler und die YouTube-IFrame-API (Musik raten) -
// das ginge ohne Umbau + Browsertest kaputt. Diese Direktiven sind unkritisch.
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "object-src 'none'; base-uri 'self'; frame-ancestors 'self' https://itch.io https://*.itch.io https://*.itch.zone https://*.hwcdn.net; form-action 'self'"
};
const MAX_API_BODY = 100000; // 100 KB reichen fuer alle API-Aufrufe locker

loadGameCfg();
chessCorrLoad();
const zlib = require("zlib");
const gzCache = new Map();
const server = http.createServer((req, res) => {
  // Stripe-Webhook: braucht den UNVERAENDERTEN Rohkoerper fuer die
  // Signaturpruefung (siehe verifyStripeSignature) - deshalb ein eigener
  // Zweig statt der generischen JSON-Behandlung unten, die den Koerper
  // bereits geparst haette.
  if (req.method === "POST" && req.url === "/webhook/stripe") {
    let body = "", tooBig = false;
    req.on("error", () => {});
    req.on("data", chunk => {
      if (tooBig) return;
      body += chunk;
      if (body.length > MAX_API_BODY) { tooBig = true; body = ""; res.writeHead(413, SECURITY_HEADERS); res.end(); req.destroy(); }
    });
    req.on("end", async () => {
      if (tooBig) return;
      let out;
      try { out = await handleStripeWebhook(body, req.headers["stripe-signature"]); }
      catch (e) { console.error("[Stripe-Webhook-Fehler]", e && e.stack || e); out = { status: 500, body: "error" }; }
      res.writeHead(out.status, { "Content-Type": "text/plain", ...SECURITY_HEADERS });
      res.end(out.body);
    });
    return;
  }
  if (req.method === "POST" && typeof req.url === "string" && req.url.startsWith("/api/")) {
    let body = "";
    let tooBig = false;
    req.on("error", () => {});
    req.on("data", chunk => {
      if (tooBig) return;
      body += chunk;
      if (body.length > MAX_API_BODY) { tooBig = true; body = ""; res.writeHead(413, SECURITY_HEADERS); res.end(); req.destroy(); }
    });
    req.on("end", async () => {
      if (tooBig) return;
      let result;
      let lang = "de"; // ausserhalb von try/catch deklariert, damit der Fehlerfall unten (Parsing-Fehler vor dem eigentlichen Setzen) ebenfalls die richtige Sprache kennt, falls schon ermittelt
      const ip = clientIp(req);
      try {
        const isPoll = req.url === "/api/presence" || req.url === "/api/public-stats" || req.url === "/api/admin-online" || req.url === "/api/chess-online/state" || req.url === "/api/chess-online/inbox"; // Polling zaehlt nicht gegen die IP-Grenze (sonst sperrt eine Klasse hinter einer IP sich selbst), hat aber ein eigenes Limit je Konto
        if (rlHit(isPoll ? "gp|" + ip : "g|" + ip, (isPoll ? API_MAX_PER_MIN_IP * 6 : API_MAX_PER_MIN_IP) + 1, 60000, 60000).lockedUntil > Date.now()) { // +1: genau API_MAX_PER_MIN_IP Aufrufe sind erlaubt
          res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "60", ...SECURITY_HEADERS });
          return res.end(JSON.stringify(errObj("tooManyRequests", "de")));
        }
        let payload;
        try { payload = body ? JSON.parse(body) : {}; } catch (e) { payload = {}; }
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) payload = {};
        // Client schickt sein aktuelles "lang" mit jedem Aufruf mit (siehe
        // apiCall() im Client) - unbekannt/fehlend faellt auf Deutsch zurueck.
        lang = payload.lang === "en" ? "en" : "de";
        coinSrc = String(req.url || "").replace(/^\/api\//, "").slice(0, 40);
        // Mod-Schluessel: nur Moderations-Endpunkte; dort wird intern der Admin-Schluessel eingesetzt (Rechte bleiben beim Admin)
        const modU = String(req.url || "").startsWith("/api/admin") ? (modKeyUser(payload.key) || modKeyUser(payload.adminKey)) : null;
        let modBlocked = false;
        if (modU) {
          if (req.url === "/api/admin-verify") { result = { ok: true, role: "mod", name: modU.username }; modBlocked = true; }
          else if (!MOD_URLS.has(req.url) || (req.url === "/api/admin-reports" && payload.del) || (req.url === "/api/admin-user-action" && (!MOD_ACTIONS.has(payload.action) || ((findUserByName(String(payload.username || "")) || {}).role === "mod")))) { result = { ok: false, error: "Das darf nur der Admin." }; modBlocked = true; }
          else { console.log("[Mod] " + modU.username + " " + req.url + (payload.action ? " " + payload.action + " " + payload.username : "")); payload.key = payload.adminKey = process.env.ADMIN_KEY; payload._mod = modU.username; }
        }
        if (modBlocked) { /* Ergebnis steht schon */ }
        else if (req.url === "/api/register") result = await registerUser(payload.username, payload.password, ip, lang, payload.loginName);
        else if (req.url === "/api/login") result = await loginUser(payload.username, payload.password, ip, lang, payload.code);
        else if (req.url === "/api/session") result = sessionUser(payload.token);
        else if (req.url === "/api/braining/submit") result = await brainSubmit(payload.token, payload.game, payload.level, lang, payload.pts);
        else if (req.url === "/api/braining/board") result = brainBoard(payload.token, payload.game);
        else if (req.url === "/api/zp") result = await zpApi(payload, lang);
        else if (req.url === "/api/taboo-solo" && !(gateOk("taboo", payload.adminKey, ip) && gateOk("taboo_solo", payload.adminKey, ip))) result = FEATURE_LOCKED_RESULT;
        else if (req.url === "/api/taboo-solo") { if (payload.action === "start") statHit("taboo_solo"); result = tabooSoloApi(payload, lang); }
        else if (req.url === "/api/braining/claim") result = await brainClaim(payload.token, lang);
        else if (req.url === "/api/logout") result = await logoutUser(payload.token);
        else if (req.url === "/api/save-stats") result = await saveUserStats(payload.token, payload.stats || {}, lang);
        else if (req.url === "/api/presence") { presenceTouch(payload.sid, payload.logged, payload.where, payload.token); result = { ok: true }; }
        else if (req.url === "/api/admin-online") { result = adminOk(payload.adminKey, ip) ? { ok: true, ...presenceCounts() } : { ok: false }; }
        else if (req.url === "/api/features") { const st = gameStatusFor(payload.adminKey, ip); const rm = await loadResetMeta(); result = { ok: true, admin: st.admin, locked: st.locked, maint: st.maint, hidden: st.hidden, modes: st.modes, countdown: st.countdown, now: st.now, braintestOff: st.braintestOff, arenaOff: st.arenaOff, resetEpoch: rm.epoch }; }
        else if (req.url === "/api/recovery-status") result = await recoveryKeyStatus(payload.token);
        else if (req.url === "/api/recovery-key") result = await recoveryKeyCreate(payload.token, payload.password, lang);
        else if (req.url === "/api/forgot-request") result = await forgotRequest(payload.username, payload.key, payload.note, ip, lang, payload.contact, payload.handles);
        else if (req.url === "/api/forgot-complete") result = await forgotComplete(payload.username, payload.key, payload.newPassword, ip, lang);
        else if (req.url === "/api/admin-reset-list") result = adminResetList(payload.adminKey, ip);
        else if (req.url === "/api/admin-reset-decide") result = await adminResetDecide(payload.adminKey, ip, payload.username, payload.action, payload.newPassword, lang);
        else if (req.url === "/api/admin-set-password") { result = adminOk(payload.adminKey, ip) ? await adminSetPassword(payload.username, payload.newPassword, lang) : { ok: false, error: lang === "en" ? "Wrong admin key." : "Admin-Key falsch." }; }
        else if (req.url === "/api/admin-reset-all") { result = adminOk(payload.adminKey, ip) ? await adminResetAll(payload.confirm, lang) : errObj("invalidInput", lang); }
        else if (req.url === "/api/admin-verify") { const adm = adminOk(payload.key, ip); result = adm ? { ok: true, role: "admin" } : { ok: false, error: process.env.ADMIN_KEY ? "Falscher Schlüssel." : "ADMIN_KEY ist auf dem Server nicht gesetzt." }; }
        else if (req.url.startsWith("/api/chess-online/") && !gateOk("chess_online", payload.adminKey, ip)) result = FEATURE_LOCKED_RESULT;
        else if ((req.url === "/api/arena-status" || req.url === "/api/arena-start-match" || req.url === "/api/arena-buy-heart" || req.url === "/api/arena-finish-match") && !gateOk("arena", payload.adminKey, ip)) result = FEATURE_LOCKED_RESULT;
        else if ((req.url === "/api/shop-create-checkout" || req.url === "/api/shop-packages") && !gateOk("shop", payload.adminKey, ip)) result = FEATURE_LOCKED_RESULT;
        else if (req.url === "/api/shop-create-checkout" && !gateOk("shop_coins", payload.adminKey, ip)) result = FEATURE_LOCKED_RESULT;
        else if (req.url.startsWith("/api/chess-online/")) result = await chessOnlineApi(req.url.slice(18), payload, lang);
        else if (req.url.startsWith("/api/chess/")) result = await chessApi(req.url.slice(11), payload, lang);
        else if (req.url.startsWith("/api/daily/")) { payload.__ip = ip; result = await dailyApi(req.url.slice(11), payload, lang); }
        else if (req.url.startsWith("/api/fourups/")) { payload.__ip = ip; result = await fourupsApi(req.url.slice(13), payload, lang); }
        else if (req.url === "/api/admin-restrict") result = await adminRestrict(payload.key, ip, payload.username, payload.action);
        else if (req.url === "/api/admin-cheaters") result = adminCheaters(payload.key, ip);
        else if (req.url === "/api/feed-event") result = await feedEvent(payload.token, payload.kind, payload.n, lang);
        else if (req.url === "/api/report") result = await submitReport(payload.token, payload, ip, lang);
        else if (req.url === "/api/admin-reports") result = await adminReports(payload.key, ip, payload);
        else if (req.url === "/api/admin-user-coins") result = adminUserCoins(payload.key, ip, payload.username);
        else if (req.url === "/api/admin-users") result = adminUsers(payload.key, ip, payload.query, !!payload.onlineOnly);
        else if (req.url === "/api/admin-user-action") result = await adminUserAction(payload.key, ip, payload.username, payload.action, payload.amount, payload.minutes, payload.reason);
        else if (req.url === "/api/social-claim") result = await socialClaim(payload, lang);
        else if (req.url === "/api/admin-live") result = adminLive(payload.adminKey, ip);
        else if (req.url === "/api/admin-chat-delete") result = await adminChat("delete", payload, ip, lang);
        else if (req.url === "/api/admin-chat-clear") result = await adminChat("clear", payload, ip, lang);
        else if (req.url === "/api/admin-chat-send") result = await adminChat("send", payload, ip, lang);
        else if (req.url === "/api/admin-games") result = adminGames(payload.key, ip);
        else if (req.url === "/api/admin-events") result = await adminEvents(payload.key, ip, payload);
        else if (req.url === "/api/event" && !gateOk("events", payload.adminKey, ip)) result = FEATURE_LOCKED_RESULT;
        else if (req.url === "/api/event-guest" && !gateOk("events", payload.adminKey, ip)) result = FEATURE_LOCKED_RESULT;
        else if (req.url === "/api/event-guest") result = await evGuestJoin(payload, ip, lang);
        else if (req.url === "/api/event") result = evApi(payload, ip);
        else if (req.url === "/api/admin-feedback") result = await adminFeedback(payload.key, ip, payload);
        else if (req.url === "/api/feedback") result = feedbackApi(payload, ip);
        else if (req.url === "/api/admin-zp") result = await adminZp(payload.key, ip, payload);
        else if (req.url === "/api/admin-stats") result = adminStats(payload.key, ip);
        else if (req.url === "/api/stat-hit") result = statHitApi(payload, ip);
        else if (req.url === "/api/news") result = newsPublic(payload.token);
        else if (req.url === "/api/news-seen") result = await newsMarkSeen(payload.token, payload.id);
        else if (req.url === "/api/admin-news") result = await adminNews(payload.key, ip, payload);
        else if (req.url === "/api/admin-mania") result = await adminManiaCall(payload.key, ip, payload);
        else if (req.url === "/api/hard" && !gateOk("hard", payload.adminKey, ip)) result = FEATURE_LOCKED_RESULT;
        else if (req.url === "/api/hard") result = hardApiCall(payload);
        else if (req.url === "/api/mania" && !gateOk("mania", payload.adminKey, ip)) result = FEATURE_LOCKED_RESULT;
        else if (req.url === "/api/mania") result = await maniaApiCall(payload);
        else if (req.url === "/api/admin-game-set") result = await adminGameSet(payload.key, ip, payload);
        else if (req.url === "/api/tester-mode") result = await testerMode(payload, lang);
        else if (req.url === "/api/totp-status") result = await totpApi("status", payload, lang);
        else if (req.url === "/api/totp-setup") result = await totpApi("setup", payload, lang);
        else if (req.url === "/api/totp-enable") result = await totpApi("enable", payload, lang);
        else if (req.url === "/api/totp-disable") result = await totpApi("disable", payload, lang);
        else if (req.url === "/api/admin-cloak") result = await adminCloak(payload, ip, lang);
        else if (req.url === "/api/social-handle") result = await socialHandle(payload, lang);
        else if (req.url === "/api/admin-beta") result = await adminBeta(payload.key, ip, payload, lang);
        else if (req.url === "/api/arena-status") result = await arenaStatus(payload.token, lang);
        else if (req.url === "/api/arena-start-match") result = await arenaStartMatch(payload.token, lang, gateOk("arena", payload.adminKey, ip) && (testerKeyOk(payload.adminKey) === "mod" || (payload.adminKey && !testerKeyOk(payload.adminKey) && adminOk(payload.adminKey, ip))) ? "x" : "");
        else if (req.url === "/api/arena-buy-heart") result = await arenaBuyHeart(payload.token, lang);
        else if (req.url === "/api/shop-create-checkout") {
          const proto = req.headers["x-forwarded-proto"] || (req.socket.encrypted ? "https" : "http");
          const origin = proto + "://" + req.headers.host;
          result = await shopCreateCheckout(payload.token, payload.packageId, origin, lang);
        }
        else if (req.url === "/api/shop-packages") result = { ok: true, packages: (stripeConfigured() && gateOk("shop_coins", payload.adminKey, ip)) ? COIN_PACKAGES : [] };
        else if (req.url === "/api/arena-finish-match") result = await arenaFinishMatch(payload.token, payload.pointsEarned, payload.matchId, lang);
        else if (req.url === "/api/arena-leaderboard") result = arenaLeaderboard();
        else if (req.url === "/api/random-quiz-questions") result = randomQuizQuestions(payload.count);
        else if (req.url === "/api/audio-tracks") result = listAudioTracks();
        else if (req.url === "/api/chat-public-list") result = await chatPublicList(payload.since);
        else if (req.url === "/api/chat-public-send") result = await chatPublicSend(payload.token, payload.text, lang);
        else if (req.url === "/api/friends-list") result = await friendsList(payload.token, lang);
        else if (req.url === "/api/friends-search") result = await friendsSearch(payload.token, payload.query, lang);
        else if (req.url === "/api/friends-request") result = await friendsRequest(payload.token, payload.username, lang);
        else if (req.url === "/api/public-stats") result = publicStats();
        else if (req.url === "/api/change-password") result = await changePassword(payload.token, payload.oldPassword, payload.newPassword, lang);
        else if (req.url === "/api/change-username") result = await changeUsername(payload.token, payload.password, payload.newName, lang);
        else if (req.url === "/api/set-login-name") result = await setLoginName(payload.token, payload.password, payload.loginName, lang);
        else if (req.url === "/api/feed-optin") result = await setFeedOptIn(payload.token, payload.enabled, lang);
        else if (req.url === "/api/streamer-mode") result = await setStreamerMode(payload.token, payload.enabled, lang);
        else if (req.url === "/api/party-invite") result = await partyInvite(payload.token, payload.friend, payload.code, payload.game, lang, adminOk(payload.adminKey, ip));
        else if (req.url === "/api/friends-accept") result = await friendsAccept(payload.token, payload.username, lang);
        else if (req.url === "/api/friends-decline") result = await friendsDecline(payload.token, payload.username, lang);
        else if (req.url === "/api/friends-cancel") result = await friendsCancel(payload.token, payload.username, lang);
        else if (req.url === "/api/friends-remove") result = await friendsRemove(payload.token, payload.username, lang);
        else if (req.url === "/api/chat-history") result = await chatHistory(payload.token, payload.username, lang);
        else result = errObj("unknownEndpoint", lang);
        if (modU && req.url === "/api/admin-reports" && result && Array.isArray(result.reports)) result = { ...result, reports: result.reports.map(r => ({ ...r, email: undefined })) }; // Kontakt-Mails sieht nur der Admin
      } catch (e) {
        console.error("[API-Fehler]", req.url, e && e.stack || e);
        result = errObj("internalErrorRetry", lang);
      }
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store", ...SECURITY_HEADERS });
      res.end(JSON.stringify(result));
    });
    return;
  }

  let filePath = (req.url || "/").split("?")[0];
  try { filePath = decodeURIComponent(filePath); } catch (e) { res.writeHead(400, SECURITY_HEADERS); return res.end("Bad request"); }
  if (filePath.includes("\0")) { res.writeHead(400, SECURITY_HEADERS); return res.end("Bad request"); }
  if (filePath === "/") filePath = "/index.html";
  const publicDir = path.join(__dirname, "public");
  const fullPath = path.join(publicDir, filePath);
  // Mit Trennzeichen pruefen, damit z.B. ".../public-geheim" nicht durchrutscht
  if (fullPath !== publicDir && !fullPath.startsWith(publicDir + path.sep)) { res.writeHead(403, SECURITY_HEADERS); return res.end("Forbidden"); }
  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404, SECURITY_HEADERS); return res.end("Not found"); }
    const ext = path.extname(fullPath);
    // HTML/JS immer neu pruefen lassen (kein "altes Spiel aus dem Browser-Cache" nach Updates)
    const cache = (ext === ".html" || ext === ".js") ? "no-cache" : "public, max-age=3600";
    let mtE = 0; try { mtE = fs.statSync(fullPath).mtimeMs; } catch (e2) {}
    const etag = 'W/"' + data.length + "-" + Math.round(mtE) + '"';
    const hdr = { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cache, "ETag": etag, ...SECURITY_HEADERS };
    // Unveraenderte Datei: nur "304" zurueck statt 600+ KB noch einmal zu senden (schnellerer 2. Besuch)
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, { "ETag": etag, "Cache-Control": cache, ...SECURITY_HEADERS }); return res.end(); }
    // Komprimieren (index.html ist ~1,9 MB): deutlich schnelleres Laden, Ergebnis wird zwischengespeichert
    if (/\bgzip\b/.test(String(req.headers["accept-encoding"] || "")) && [".html", ".js", ".json", ".css", ".svg"].includes(ext) && data.length > 1024) {
      const ck = fullPath, hit = gzCache.get(ck); let mt = 0; try { mt = fs.statSync(fullPath).mtimeMs; } catch (e2) {}
      const send = gz => { res.writeHead(200, { ...hdr, "Content-Encoding": "gzip", "Vary": "Accept-Encoding", "Content-Length": gz.length }); res.end(gz); };
      if (hit && hit.len === data.length && hit.mt === mt) return send(hit.gz);
      return zlib.gzip(data, { level: 6 }, (e, gz) => {
        if (e) { res.writeHead(200, hdr); return res.end(data); }
        gzCache.set(ck, { len: data.length, mt, gz });
        send(gz);
      });
    }
    res.writeHead(200, hdr);
    res.end(data);
  });
});

/* ------------------------------------------------------------------------ */
/* WebSocket-Handling                                                        */
/* ------------------------------------------------------------------------ */
const wss = new WebSocketServer({ server });

// Limits gegen Missbrauch (Verbindungsflut / Nachrichtenflut)
const MAX_WS_PER_IP = 60;      // gleichzeitige Verbindungen je IP (Schulklasse hinter einer IP ist ok)
const MAX_WS_TOTAL = 3000;
const WS_BURST = 40;           // Nachrichten-Eimer: bis zu 40 auf einmal ...
const WS_REFILL_PER_SEC = 25;  // ... danach im Schnitt 25 pro Sekunde (echtes Spielen liegt weit darunter)
const WS_PING_EVERY_MS = Number(process.env.WS_PING_EVERY_MS) || 25000;
const WS_DEAD_AFTER_MS = Number(process.env.WS_DEAD_AFTER_MS) || 75000;
const wsPerIp = new Map();
let wsTotal = 0;

wss.on("connection", (ws, req) => {
  const ip = clientIp(req || {});
  ws.ip = ip;
  if (wsTotal >= MAX_WS_TOTAL || (wsPerIp.get(ip) || 0) >= MAX_WS_PER_IP) { ws.close(); return; }
  wsTotal++; wsPerIp.set(ip, (wsPerIp.get(ip) || 0) + 1);
  ws.on("close", () => {
    wsTotal = Math.max(0, wsTotal - 1);
    const n = (wsPerIp.get(ip) || 1) - 1;
    if (n <= 0) wsPerIp.delete(ip); else wsPerIp.set(ip, n);
  });
  let tokens = WS_BURST, lastRefill = Date.now(), dropped = 0, dropWindowStart = Date.now();
  // Regelmäßiger Ping hält die Verbindung durch Proxys/Idle-Timeouts mancher
  // Hosting-Anbieter am Leben (Browser beantworten Ping-Frames automatisch
  // mit Pong, ganz ohne zusätzlichen Client-Code).
  const keepAlive = setInterval(() => {
    if (ws.readyState !== 1) { clearInterval(keepAlive); return; }
    // Kein Lebenszeichen (Pong/Nachricht) seit 75 s -> Verbindung ist tot
    // (z.B. Handy im Funkloch): kappen, damit die Person nicht ewig als
    // "verbunden" im Raum steht und Spiele nicht auf sie warten.
    if (Date.now() - ws.lastSeen > WS_DEAD_AFTER_MS) { ws.terminate(); return; }
    ws.ping();
  }, WS_PING_EVERY_MS);
  ws.on("close", () => { clearInterval(keepAlive); tttHandleDisconnect(ws); fuHandleDisconnect(ws); brHandleDisconnect(ws, false); dmHandleDisconnect(ws, false); accountDisconnect(ws); });

  ws.on("message", (raw) => {
    // Nachrichten-Eimer: zu schnelle Nachrichten werden verworfen, Dauerfeuer kappt die Verbindung
    const now = Date.now();
    tokens = Math.min(WS_BURST, tokens + (now - lastRefill) / 1000 * WS_REFILL_PER_SEC);
    lastRefill = now;
    if (tokens < 1) {
      if (now - dropWindowStart > 10000) { dropWindowStart = now; dropped = 0; }
      if (++dropped > 150) { ws.close(); }
      return;
    }
    tokens -= 1;
    try { onWsMessage(raw); }
    catch (err) { console.error("[WS-Nachricht fehlgeschlagen]", err && err.stack || err); }
  });

  function onWsMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) return; // z.B. "null", "5", "[]"
    // Textfelder muessen Strings sein - sonst leer (verhindert .trim()/.toUpperCase()-Abstuerze)
    for (const k of ["name", "text", "code"]) { if (k in msg && typeof msg[k] !== "string") msg[k] = ""; }
    if (typeof msg.text === "string") msg.text = cleanStr(msg.text, 60);

    // Freunde/Chat: eigener, von den Party-/TTT-Raeumen unabhaengiger Kanal -
    // eine Verbindung meldet sich per Konto-Token an, danach gilt sie als
    // "online" fuer ihre Freundesliste und kann Chatnachrichten senden/live
    // empfangen. Bewusst VOR der allgemeinen text-Bereinigung oben nicht
    // relevant, da chatText separat (mit eigenem, laengerem Limit) bereinigt wird.
    if (msg.action === "accountConnect") {
      const user = findUserByToken(typeof msg.token === "string" ? msg.token : "");
      if (!user) { send(ws, { type: "accountConnectResult", ok: false }); return; }
      ws.accountUsername = user.username.toLowerCase(); user.lastSeen = Date.now();
      let set = onlineAccounts.get(ws.accountUsername);
      if (!set) { set = new Set(); onlineAccounts.set(ws.accountUsername, set); }
      const wasOffline = set.size === 0;
      set.add(ws);
      send(ws, { type: "accountConnectResult", ok: true });
      const queued = (pendingInvites.get(ws.accountUsername) || []).filter(i => i.exp > Date.now() && (i.kind === "ttt" || (i.kind === "fourups" && fuRooms.has(i.roomCode)) || (rooms.get(i.roomCode) && rooms.get(i.roomCode).phase === "lobby")));
      pendingInvites.delete(ws.accountUsername);
      queued.forEach(i => send(ws, { type: "partyInvite", kind: i.kind, roomCode: i.roomCode, from: i.from }));
      if (wasOffline) (user.friends || []).forEach(name => notifyAccount(name, { type: "friendOnline", username: user.username }));
      return;
    }
    if (msg.action === "chatSend") {
      if (!ws.accountUsername) return;
      const me = findUserByName(ws.accountUsername);
      if (!me) return;
      sendChatMessage(me, typeof msg.to === "string" ? msg.to : "", typeof msg.chatText === "string" ? msg.chatText : "", msg.lang === "en" ? "en" : "de")
        .then(r => send(ws, { type: "chatSendResult", ok: !!r.ok, error: r.error || null, to: msg.to, message: r.message || null }))
        .catch(() => send(ws, { type: "chatSendResult", ok: false, error: et("internalError", msg.lang === "en" ? "en" : "de"), to: msg.to }));
      return;
    }

    if (msg.action === "createRoom") {
      const room = createRoom(ws, cleanStr(msg.name, 20) || "Host", msg.language, msg.gameMode);
      send(ws, { type: "joined", roomCode: room.code, playerId: ws.playerId, isHost: true });
      pushRoomState(room);
      return;
    }

    if (msg.action === "joinRoom") {
      if (rlWait("j|" + ws.ip)) return send(ws, { type: "error", message: "Zu viele falsche Codes. Bitte kurz warten." });
      const room = rooms.get(cleanCode(msg.code));
      if (!room) { rlHit("j|" + ws.ip, JOIN_MAX_FAILS_IP, 300000, 300000); return send(ws, { type: "error", message: "Raum nicht gefunden." }); }
      if (room.phase !== "lobby") return send(ws, { type: "error", message: "Diese Runde läuft bereits." });
      if (room.players.size >= MAX_PARTICIPANTS) return send(ws, { type: "error", message: "Der Raum ist voll (max. " + MAX_PARTICIPANTS + " Teilnehmer)." });
      const id = "pl_" + Math.random().toString(36).slice(2, 9);
      addPlayer(room, ws, id, cleanStr(msg.name, 20) || "Spieler");
      send(ws, { type: "joined", roomCode: room.code, playerId: id, isHost: false });
      rebuildFfaTeams(room);
      pushRoomState(room);
      return;
    }

    // ---- Tic Tac Toe Mehrspieler (eigenes, schlankes Raumsystem) ----
    if (msg.action === "tttCreateRoom") {
      const code = tttMakeRoomCode();
      // Zufällig, welches Symbol der Host bekommt (statt immer X) - beim
      // Beitreten der zweiten Person entscheidet sich dadurch auch fair,
      // wer zuerst dran ist (X beginnt immer).
      const hostSymbol = Math.random() < 0.5 ? "X" : "O";
      const room = {
        code,
        players: [{ ws, name: cleanStr(msg.name, 20) || "Host", symbol: hostSymbol, connected: true }],
        board: Array(9).fill(null),
        turnSymbol: "X",
        gameOver: false,
        winner: null,
        mode: (msg.mode === "quizmix" || msg.mode === "quantum") ? msg.mode : "classic",
        duel: null,
        counters: tttFreshCounters(),
        xPieces: [], oPieces: [] // nur für Quantum-Modus genutzt (Zug-Reihenfolge je Symbol)
      };
      tttRooms.set(code, room);
      ws.tttRoomCode = code;
      send(ws, { type: "tttJoined", roomCode: code, symbol: hostSymbol, mode: room.mode });
      return;
    }
    if (msg.action === "tttQueue") {
      const mode = (msg.mode === "quizmix" || msg.mode === "quantum") ? msg.mode : "classic";
      if (mode === "quantum" && !gateOk("ttt_quantum", msg.adminKey, ws.ip)) return send(ws, { type: "tttError", message: "Coming soon." });
      if (ws.tttRoomCode) tttHandleDisconnect(ws);
      tttQueueRemove(ws);
      const me = { ws, name: cleanStr(msg.name, 20) || "Spieler" };
      const other = tttQueues[mode].find(q => q.ws !== ws && q.ws.readyState === 1);
      if (!other) { tttQueues[mode].push(me); send(ws, { type: "tttQueued", mode }); return; }
      tttQueues[mode] = tttQueues[mode].filter(q => q !== other);
      const code = tttMakeRoomCode();
      const firstSym = Math.random() < 0.5 ? "X" : "O", secondSym = firstSym === "X" ? "O" : "X";
      const room = {
        code, players: [{ ws: other.ws, name: other.name, symbol: firstSym, connected: true }, { ws, name: me.name, symbol: secondSym, connected: true }],
        board: Array(9).fill(null), turnSymbol: "X", gameOver: false, winner: null, mode, duel: null,
        counters: tttFreshCounters(), xPieces: [], oPieces: []
      };
      tttRooms.set(code, room);
      other.ws.tttRoomCode = code; ws.tttRoomCode = code;
      send(other.ws, { type: "tttJoined", roomCode: code, symbol: firstSym, mode });
      send(ws, { type: "tttJoined", roomCode: code, symbol: secondSym, mode });
      tttBroadcastState(room);
      return;
    }
    if (msg.action === "tttQueueCancel") { tttQueueRemove(ws); return; }
    if (msg.action === "tttJoinRoom") {
      if (rlWait("j|" + ws.ip)) return send(ws, { type: "tttError", message: "Zu viele falsche Codes. Bitte kurz warten." });
      const room = tttRooms.get(cleanCode(msg.code));
      if (!room) { rlHit("j|" + ws.ip, JOIN_MAX_FAILS_IP, 300000, 300000); return send(ws, { type: "tttError", message: "Raum nicht gefunden." }); }
      if (room.players.length >= 2) return send(ws, { type: "tttError", message: "Der Raum ist schon voll." });
      const guestSymbol = room.players[0].symbol === "X" ? "O" : "X";
      room.players.push({ ws, name: cleanStr(msg.name, 20) || "Spieler", symbol: guestSymbol, connected: true });
      ws.tttRoomCode = room.code;
      send(ws, { type: "tttJoined", roomCode: room.code, symbol: guestSymbol, mode: room.mode });
      tttBroadcastState(room);
      return;
    }
    if (msg.action === "tttMove") {
      const room = tttRooms.get(ws.tttRoomCode);
      if (!room || room.gameOver) return;
      const player = room.players.find(p => p.ws === ws);
      if (!player || player.symbol !== room.turnSymbol) return; // nicht am Zug
      const i = msg.index;
      if (typeof i !== "number" || i < 0 || i > 8 || room.board[i]) return;
      if (room.mode === "quantum") {
        tttQuantumApplyMove(room, player.symbol, i);
      } else {
        room.board[i] = player.symbol;
      }
      room.counters.moves[player.symbol]++;
      const winner = tttCheckWinner(room.board);
      if (winner) {
        room.gameOver = true;
        room.winner = winner; // "X" | "O" | "draw"
      } else {
        room.turnSymbol = room.turnSymbol === "X" ? "O" : "X";
      }
      tttBroadcastState(room);
      return;
    }
    // QuizMix: kein Zugzwang - jede Person darf jedes leere, nicht gerade
    // umkämpfte Feld antippen, um dort ein 5-Fragen-Duell zu starten.
    if (msg.action === "tttQuizmixTap") {
      const room = tttRooms.get(ws.tttRoomCode);
      if (!room || room.gameOver || room.mode !== "quizmix" || room.duel) return;
      const player = room.players.find(p => p.ws === ws);
      if (!player || player.symbol !== room.turnSymbol) return; // nicht am Zug (Feldwahl wechselt strikt ab, unabhängig vom Duell-Ausgang)
      const i = msg.index;
      if (typeof i !== "number" || i < 0 || i > 8 || room.board[i]) return;
      if (room.players.length < 2) return;
      tttStartDuel(room, i);
      return;
    }
    if (msg.action === "tttDuelAnswer") {
      const room = tttRooms.get(ws.tttRoomCode);
      if (!room || !room.duel || room.duel.type !== "quiz") return;
      const player = room.players.find(p => p.ws === ws);
      if (!player) return;
      tttHandleDuelAnswer(room, player.symbol, msg.selectedIndex);
      return;
    }
    if (msg.action === "tttSprintAnswer") {
      const room = tttRooms.get(ws.tttRoomCode);
      if (!room || !room.duel || room.duel.type !== "math") return;
      const player = room.players.find(p => p.ws === ws);
      if (!player) return;
      tttHandleSprintAnswer(room, player.symbol, msg.value);
      return;
    }
    if (msg.action === "tttRematch") {
      const room = tttRooms.get(ws.tttRoomCode);
      if (!room) return;
      if (room.duel) { clearTimeout(room.duel.timer); room.duel = null; }
      room.board = Array(9).fill(null);
      room.counters = tttFreshCounters();
      room.zpDone = false; room.zpRes = null;
      room.xPieces = []; room.oPieces = []; // Quantum-Modus: Zug-Reihenfolge zurücksetzen
      room.gameOver = false;
      room.winner = null;
      // Wer beginnt, wird jedes Mal neu zufällig verteilt (nicht einfach
      // nur getauscht) - auf Wunsch, damit es nicht immer "der/die andere"
      // ist, sondern wirklich zufällig.
      if (Math.random() < 0.5) {
        [room.players[0].symbol, room.players[1].symbol] = [room.players[1].symbol, room.players[0].symbol];
      }
      room.turnSymbol = "X";
      tttBroadcastState(room);
      return;
    }
    if (msg.action === "fuCreateRoom") {
      if (ws.fuRoomCode) fuHandleDisconnect(ws);
      const code = fuMakeCode();
      const room = { code, players: [{ ws, name: cleanStr(msg.name, 20) || "Host", num: Math.random() < 0.5 ? 1 : 2, connected: true }], board: fuFreshBoard(), turn: 1, over: false, winner: null, winCells: null, last: null, scores: { 1: 0, 2: 0, d: 0 } };
      fuRooms.set(code, room); ws.fuRoomCode = code;
      send(ws, { type: "fuJoined", roomCode: code, you: room.players[0].num });
      fuBroadcast(room);
      return;
    }
    if (msg.action === "fuJoinRoom") {
      if (rlWait("j|" + ws.ip)) return send(ws, { type: "fuError", message: "Zu viele falsche Codes. Bitte kurz warten." });
      const room = fuRooms.get(cleanCode(msg.code));
      if (!room) { rlHit("j|" + ws.ip, JOIN_MAX_FAILS_IP, 300000, 300000); return send(ws, { type: "fuError", message: "Raum nicht gefunden." }); }
      if (room.players.length >= 2) return send(ws, { type: "fuError", message: "Der Raum ist schon voll." });
      if (ws.fuRoomCode) fuHandleDisconnect(ws);
      const num = room.players[0].num === 1 ? 2 : 1;
      room.players.push({ ws, name: cleanStr(msg.name, 20) || "Spieler", num, connected: true });
      ws.fuRoomCode = room.code;
      send(ws, { type: "fuJoined", roomCode: room.code, you: num });
      fuBroadcast(room);
      return;
    }
    if (msg.action === "fuMove") {
      const room = fuRooms.get(ws.fuRoomCode);
      if (!room || room.over || room.players.length < 2) return;
      const me = room.players.find(p => p.ws === ws);
      if (!me || me.num !== room.turn) return;
      const col = Number(msg.col);
      if (!Number.isInteger(col) || col < 0 || col >= FOURUPS_COLS) return;
      let row = -1; for (let r = FOURUPS_ROWS - 1; r >= 0; r--) if (!room.board[r][col]) { row = r; break; }
      if (row < 0) return;
      room.board[row][col] = me.num; room.last = [row, col];
      const w = fourupsWinCells(room.board, row, col);
      if (w) { room.over = true; room.winner = me.num; room.winCells = w; room.scores[me.num]++; }
      else if (room.board[0].every(v => v)) { room.over = true; room.winner = "draw"; room.scores.d++; }
      else room.turn = 3 - room.turn;
      fuBroadcast(room);
      return;
    }
    if (msg.action === "fuRematch") {
      const room = fuRooms.get(ws.fuRoomCode);
      if (!room || !room.over || room.players.length < 2) return;
      room.board = fuFreshBoard(); room.over = false; room.winner = null; room.winCells = null; room.last = null; room.zpDone = false; room.zpRes = null;
      if (Math.random() < 0.5) room.players.forEach(p => { p.num = 3 - p.num; });
      room.turn = 1;
      fuBroadcast(room);
      return;
    }
    if (msg.action === "brCreateRoom") {
      if (!brAllowed(msg.adminKey, ws.ip)) return send(ws, { type: "brError", message: "Nicht verfügbar." });
      if (ws.brRoomCode) brHandleDisconnect(ws, true);
      brQueueRemove(ws);
      const hu = findUserByToken(msg.token);
      brNewRoom({ ws, name: cleanStr(msg.name, 20) || "Host", lang: brLang(msg.lang), username: hu ? hu.username : null }, null);
      return;
    }
    if (msg.action === "brJoinRoom") {
      if (rlWait("j|" + ws.ip)) return send(ws, { type: "brError", message: "Zu viele falsche Codes. Bitte kurz warten." });
      const room = brRooms.get(cleanCode(msg.code));
      if (!room) { rlHit("j|" + ws.ip, JOIN_MAX_FAILS_IP, 300000, 300000); return send(ws, { type: "brError", message: "Raum nicht gefunden." }); }
      if (room.players.length >= 2) return send(ws, { type: "brError", message: "Der Raum ist schon voll." });
      if (ws.brRoomCode) brHandleDisconnect(ws, true);
      brQueueRemove(ws);
      const ju = findUserByToken(msg.token);
      const pl = { ws, name: cleanStr(msg.name, 20) || "Spieler", username: ju ? ju.username : null, lang: brLang(msg.lang), side: "b", connected: true, key: crypto.randomBytes(8).toString("hex") };
      room.players.push(pl);
      ws.brRoomCode = room.code;
      send(ws, { type: "brJoined", roomCode: room.code, key: pl.key });
      brBroadcast(room);
      return;
    }
    if (msg.action === "brRejoin") {
      // Nach Neuladen/Verbindungsabbruch: Platz per geheimem Schluessel zurueckholen
      if (rlWait("j|" + ws.ip)) return send(ws, { type: "brError", message: "Bitte kurz warten." });
      const room = brRooms.get(cleanCode(msg.code));
      const pl = room && room.players.find(p => typeof msg.key === "string" && p.key === msg.key);
      if (!room || !pl) { rlHit("j|" + ws.ip, JOIN_MAX_FAILS_IP, 300000, 300000); return send(ws, { type: "brError", message: "Das Spiel gibt es nicht mehr.", gone: true }); }
      if (pl.ws && pl.ws !== ws && pl.connected) { try { pl.ws.brRoomCode = null; } catch (e) {} }
      clearTimeout(pl.graceTimer);
      pl.ws = ws; pl.connected = true; if (msg.lang) pl.lang = brLang(msg.lang);
      ws.brRoomCode = room.code;
      send(ws, { type: "brJoined", roomCode: room.code, key: pl.key });
      room.players.forEach(p => { if (p !== pl && p.connected) send(p.ws, { type: "brOpponentBack" }); });
      brBroadcast(room);
      return;
    }
    if (msg.action === "brQueue") {
      if (!brAllowed(msg.adminKey, ws.ip)) return send(ws, { type: "brError", message: "Nicht verfügbar." });
      if (ws.brRoomCode) brHandleDisconnect(ws, true);
      brQueueRemove(ws);
      const qu = findUserByToken(msg.token);
      const me = { ws, name: cleanStr(msg.name, 20) || "Spieler", lang: brLang(msg.lang), username: qu ? qu.username : null };
      const other = brQueue.find(q => q.ws !== ws && q.ws.readyState === 1);
      if (other) { brQueue = brQueue.filter(q => q !== other); brNewRoom(other, me); }
      else { brQueue.push(me); send(ws, { type: "brQueued" }); }
      return;
    }
    if (msg.action === "brQueueCancel") { brQueueRemove(ws); return; }
    if (msg.action === "brMove") {
      const room = brRooms.get(ws.brRoomCode);
      if (!room || room.players.length < 2) return;
      const me = room.players.find(p => p.ws === ws); if (!me) return;
      // Client sendet in seiner Sicht (eigene Figuren "y", unten) - zurueck in absolute Koordinaten
      const id = typeof msg.id === "string" && /^y[0-9q]$/.test(msg.id) ? me.side + msg.id.slice(1) : null;
      const c = Number(msg.c); let r = Number(msg.r);
      if (!id || !Number.isInteger(c) || !Number.isInteger(r)) return;
      if (me.side === "b") r = BR.ROWS - 1 - r;
      const res = BR.move(room.st, me.side, id, c, r, brMakeQuestion);
      if (!res.ok) return;
      brBroadcast(room);
      if (res.duel) brArmDuel(room);
      return;
    }
    if (msg.action === "brAnswer") {
      const room = brRooms.get(ws.brRoomCode); if (!room) return;
      const me = room.players.find(p => p.ws === ws); if (!me) return;
      const i = Number(msg.i); if (!Number.isInteger(i)) return;
      if (BR.answer(room.st, me.side, i)) { if (room.st.duel && room.st.duel.done) brAfterFinish(room); else brBroadcast(room); }
      return;
    }
    if (msg.action === "brRematch") {
      const room = brRooms.get(ws.brRoomCode);
      if (!room || !room.st.over || room.players.length < 2 || room.players.some(p => !p.connected)) return;
      clearTimeout(room.timer);
      room.st = BR.create(); room.credited = false; room.players.forEach(p => { p.credited = false; });
      if (Math.random() < 0.5) room.players.forEach(p => { p.side = p.side === "a" ? "b" : "a"; });
      brBroadcast(room);
      return;
    }
    if (msg.action === "brLeave") { brHandleDisconnect(ws, true); return; }
    if (msg.action === "dmCreateRoom") {
      if (!dameAllowed(msg.adminKey, ws.ip)) return send(ws, { type: "dmError", message: "Nicht verfügbar." });
      if (ws.dmRoomCode) dmHandleDisconnect(ws, true);
      dmQueueRemove(ws);
      const u = findUserByToken(msg.token);
      dmNewRoom({ ws, name: cleanStr(msg.name, 20) || (u && u.username) || "Host", username: u ? u.username : null }, null);
      return;
    }
    if (msg.action === "dmJoinRoom") {
      if (rlWait("j|" + ws.ip)) return send(ws, { type: "dmError", message: "Zu viele falsche Codes. Bitte kurz warten." });
      const room = dmRooms.get(cleanCode(msg.code));
      if (!room) { rlHit("j|" + ws.ip, JOIN_MAX_FAILS_IP, 300000, 300000); return send(ws, { type: "dmError", message: "Raum nicht gefunden." }); }
      if (room.players.length >= 2) return send(ws, { type: "dmError", message: "Der Raum ist schon voll." });
      if (ws.dmRoomCode) dmHandleDisconnect(ws, true);
      dmQueueRemove(ws);
      const u = findUserByToken(msg.token);
      const pl = { ws, name: cleanStr(msg.name, 20) || (u && u.username) || "Spieler", username: u ? u.username : null, color: room.players[0].color === "w" ? "b" : "w", connected: true, key: crypto.randomBytes(8).toString("hex") };
      room.players.push(pl); ws.dmRoomCode = room.code;
      send(ws, { type: "dmJoined", roomCode: room.code, key: pl.key });
      dmArm(room); dmBroadcast(room);
      return;
    }
    if (msg.action === "dmRejoin") {
      if (rlWait("j|" + ws.ip)) return send(ws, { type: "dmError", message: "Bitte kurz warten." });
      const room = dmRooms.get(cleanCode(msg.code));
      const pl = room && room.players.find(p => typeof msg.key === "string" && p.key === msg.key);
      if (!room || !pl) { rlHit("j|" + ws.ip, JOIN_MAX_FAILS_IP, 300000, 300000); return send(ws, { type: "dmError", message: "Das Spiel gibt es nicht mehr.", gone: true }); }
      if (pl.ws && pl.ws !== ws && pl.connected) { try { pl.ws.dmRoomCode = null; } catch (e) {} }
      clearTimeout(pl.graceTimer);
      pl.ws = ws; pl.connected = true; ws.dmRoomCode = room.code;
      send(ws, { type: "dmJoined", roomCode: room.code, key: pl.key });
      room.players.forEach(p => { if (p !== pl && p.connected) send(p.ws, { type: "dmOpponentBack" }); });
      dmBroadcast(room);
      return;
    }
    if (msg.action === "dmQueue") {
      if (!dameAllowed(msg.adminKey, ws.ip)) return send(ws, { type: "dmError", message: "Nicht verfügbar." });
      if (ws.dmRoomCode) dmHandleDisconnect(ws, true);
      dmQueueRemove(ws);
      const u = findUserByToken(msg.token);
      const me = { ws, name: cleanStr(msg.name, 20) || (u && u.username) || "Spieler", username: u ? u.username : null };
      const other = dmQueue.find(q => q.ws !== ws && q.ws.readyState === 1 && !(me.username && q.username && me.username.toLowerCase() === q.username.toLowerCase()));
      if (other) { dmQueue = dmQueue.filter(q => q !== other); dmNewRoom(other, me); }
      else { dmQueue.push(me); send(ws, { type: "dmQueued" }); }
      return;
    }
    if (msg.action === "dmQueueCancel") { dmQueueRemove(ws); return; }
    if (msg.action === "dmMove") {
      const room = dmRooms.get(ws.dmRoomCode);
      if (!room || room.st.over || room.players.length < 2) return;
      const me = room.players.find(p => p.ws === ws); if (!me || me.color !== room.st.turn) return;
      const mv = Dame.findMove(room.st.board, me.color, msg.path);
      if (!mv) return send(ws, { type: "dmIllegal" });
      const st = room.st, moved = st.board[mv.path[0][0]][mv.path[0][1]];
      st.board = Dame.applyMove(st.board, mv); st.plies++; st.last = mv.path;
      st.quiet = (mv.captured.length || !moved.k) ? 0 : st.quiet + 1;
      st.turn = Dame.other(st.turn);
      const res = Dame.result(st.board, st.turn);
      if (res) { dmEnd(room, res, "done"); return; }
      if (st.quiet >= DM_QUIET_LIMIT) { dmEnd(room, "draw", "draw"); return; }
      dmArm(room); dmBroadcast(room);
      return;
    }
    if (msg.action === "dmResign") {
      const room = dmRooms.get(ws.dmRoomCode); if (!room || room.st.over || room.players.length < 2) return;
      const me = room.players.find(p => p.ws === ws); if (!me) return;
      dmEnd(room, Dame.other(me.color), "resign");
      return;
    }
    if (msg.action === "dmRematch") {
      const room = dmRooms.get(ws.dmRoomCode);
      if (!room || !room.st.over || room.players.length < 2 || room.players.some(p => !p.connected)) return;
      clearTimeout(room.timer);
      room.st = dmFreshState(); room.zpDone = false; room.zpRes = null;
      if (Math.random() < 0.5) room.players.forEach(p => { p.color = Dame.other(p.color); });
      room.players.forEach(p => { p.credited = false; });
      dmArm(room); dmBroadcast(room);
      return;
    }
    if (msg.action === "dmLeave") { dmHandleDisconnect(ws, true); return; }
    if (msg.action === "muCreateRoom") {
      if (!muehleAllowed(msg.adminKey, ws.ip)) return send(ws, { type: "muError", message: "Nicht verfügbar." });
      if (ws.muRoomCode) muHandleDisconnect(ws, true);
      muQueueRemove(ws);
      muNewRoom({ ws, name: cleanStr(msg.name, 20) || "Host" }, null);
      return;
    }
    if (msg.action === "muJoinRoom") {
      if (rlWait("j|" + ws.ip)) return send(ws, { type: "muError", message: "Zu viele falsche Codes. Bitte kurz warten." });
      const room = muRooms.get(cleanCode(msg.code));
      if (!room) { rlHit("j|" + ws.ip, JOIN_MAX_FAILS_IP, 300000, 300000); return send(ws, { type: "muError", message: "Raum nicht gefunden." }); }
      if (room.players.length >= 2) return send(ws, { type: "muError", message: "Der Raum ist schon voll." });
      if (ws.muRoomCode) muHandleDisconnect(ws, true);
      muQueueRemove(ws);
      const pl = { ws, name: cleanStr(msg.name, 20) || "Spieler", color: room.players[0].color === "w" ? "b" : "w", connected: true, key: crypto.randomBytes(8).toString("hex") };
      room.players.push(pl); ws.muRoomCode = room.code;
      send(ws, { type: "muJoined", roomCode: room.code, key: pl.key });
      muArm(room); muBroadcast(room);
      return;
    }
    if (msg.action === "muRejoin") {
      if (rlWait("j|" + ws.ip)) return send(ws, { type: "muError", message: "Bitte kurz warten." });
      const room = muRooms.get(cleanCode(msg.code));
      const pl = room && room.players.find(p => typeof msg.key === "string" && p.key === msg.key);
      if (!room || !pl) { rlHit("j|" + ws.ip, JOIN_MAX_FAILS_IP, 300000, 300000); return send(ws, { type: "muError", message: "Das Spiel gibt es nicht mehr.", gone: true }); }
      if (pl.ws && pl.ws !== ws && pl.connected) { try { pl.ws.muRoomCode = null; } catch (e) {} }
      clearTimeout(pl.graceTimer);
      pl.ws = ws; pl.connected = true; ws.muRoomCode = room.code;
      send(ws, { type: "muJoined", roomCode: room.code, key: pl.key });
      room.players.forEach(p => { if (p !== pl && p.connected) send(p.ws, { type: "muOpponentBack" }); });
      muBroadcast(room);
      return;
    }
    if (msg.action === "muQueue") {
      if (!muehleAllowed(msg.adminKey, ws.ip)) return send(ws, { type: "muError", message: "Nicht verfügbar." });
      if (ws.muRoomCode) muHandleDisconnect(ws, true);
      muQueueRemove(ws);
      const me = { ws, name: cleanStr(msg.name, 20) || "Spieler" };
      const other = muQueue.find(q => q.ws !== ws && q.ws.readyState === 1 && true);
      if (other) { muQueue = muQueue.filter(q => q !== other); muNewRoom(other, me); }
      else { muQueue.push(me); send(ws, { type: "muQueued" }); }
      return;
    }
    if (msg.action === "muQueueCancel") { muQueueRemove(ws); return; }
    if (msg.action === "muMove") {
      const room = muRooms.get(ws.muRoomCode);
      if (!room || room.st.over || room.players.length < 2) return;
      const me = room.players.find(p => p.ws === ws); if (!me || me.color !== room.st.turn) return;
      const iv = v => (v === null || v === undefined) ? null : (Number.isInteger(v) && v >= 0 && v < 24 ? v : NaN);
      const from = iv(msg.from), to = iv(msg.to), rm = iv(msg.rm);
      const mv = (to === null || Number.isNaN(from) || Number.isNaN(to) || Number.isNaN(rm)) ? null : Mill.findMove(room.st, me.color, from, to, rm);
      if (!mv) return send(ws, { type: "muIllegal" });
      const st = room.st, ns = Mill.apply(st, mv);
      st.b = ns.b; st.hand = ns.hand; st.turn = ns.turn; st.quiet = ns.quiet; st.plies++; st.last = { from: mv.from, to: mv.to, rm: mv.rm };
      const res = Mill.result(st);
      if (res) { muEnd(room, res, "done"); return; }
      if (st.quiet >= MU_QUIET_LIMIT) { muEnd(room, "draw", "draw"); return; }
      muArm(room); muBroadcast(room);
      return;
    }
    if (msg.action === "muResign") {
      const room = muRooms.get(ws.muRoomCode); if (!room || room.st.over || room.players.length < 2) return;
      const me = room.players.find(p => p.ws === ws); if (!me) return;
      muEnd(room, Mill.other(me.color), "resign");
      return;
    }
    if (msg.action === "muRematch") {
      const room = muRooms.get(ws.muRoomCode);
      if (!room || !room.st.over || room.players.length < 2 || room.players.some(p => !p.connected)) return;
      clearTimeout(room.timer);
      room.st = muFreshState();
      if (Math.random() < 0.5) room.players.forEach(p => { p.color = Mill.other(p.color); });
      muArm(room); muBroadcast(room);
      return;
    }
    if (msg.action === "muLeave") { muHandleDisconnect(ws, true); return; }
    if (msg.action === "fuLeave") { fuHandleDisconnect(ws); return; }
    if (msg.action === "tttLeave") {
      tttHandleDisconnect(ws);
      ws.tttRoomCode = null;
      return;
    }

    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const isHost = ws.playerId === room.hostId;

    switch (msg.action) {
      case "setRoundCount":
        if (isHost && room.phase === "lobby") {
          const n = parseInt(msg.count, 10);
          const allowed = [1, 5, 10, 15, 20];
          room.roundCount = allowed.includes(n) ? n : 5;
          if (room.roundMode === "custom") {
            // Bereits getroffene Auswahl beibehalten, nur auf neue Länge anpassen
            const defs = room.roundDefs.slice(0, room.roundCount);
            while (defs.length < room.roundCount) defs.push(null);
            room.roundDefs = defs;
          } else {
            randomizeRoundDefs(room);
          }
          pushRoomState(room);
        }
        break;
      case "setNennsBlitzDuration":
        // Nur relevant für Solo (im Duell/Multiplayer ist die Zeit immer
        // fest 120s, siehe NENNSBLITZ_DUELL_MS), wird trotzdem unabhängig
        // vom aktuellen Spielerstand gespeichert, falls z.B. später noch
        // jemand beitritt und der Raum doch kein Solo mehr ist (dann greift
        // ohnehin automatisch die feste Duell-Zeit statt dieser Auswahl).
        if (isHost && room.phase === "lobby") {
          const ms = parseInt(msg.durationMs, 10);
          if ([60000, 90000, 120000, 180000].includes(ms)) {
            room.nennsBlitzSoloDurationMs = ms;
            pushRoomState(room);
          }
        }
        break;
      case "setRoundMode":
        if (isHost && room.phase === "lobby") {
          room.roundMode = msg.mode === "custom" ? "custom" : (msg.mode === "olympiad" ? "olympiad" : "random");
          if (room.roundMode === "olympiad") room.olympiadTheme = olympiadThemeById(msg.theme || room.olympiadTheme).id;
          if (room.roundMode === "random" || room.roundMode === "olympiad") randomizeRoundDefs(room);
          else room.roundDefs = Array.from({ length: room.roundCount }, () => null); // "Noch nicht gewählt"
          pushRoomState(room);
        }
        break;
      case "randomizeRounds":
        if (isHost && room.phase === "lobby") { randomizeRoundDefs(room); pushRoomState(room); }
        break;
      case "setRoundDef":
        if (isHost && room.phase === "lobby" && room.roundMode === "custom") {
          const def = findRoundDef(msg.defId);
          if (def && msg.index >= 0 && msg.index < room.roundCount) {
            room.roundDefs[msg.index] = localizeDef(def, room.language);
            pushRoomState(room);
          }
        }
        break;
      case "setArenaRoundPlan":
        // Setzt den kompletten Arena-Match-Ablauf auf einmal (statt einzeln
        // per setRoundDef): Client schickt die fertige Sequenz aus
        // {kind:"arenaQuiz", klasseMin, klasseMax} (Quiz-Block, Klassenbereich
        // kommt vom Client, der die aktuelle Liga kennt) und
        // {defId} (Herausforderungsrunde, per ID aus ARENA_CHALLENGE_POOL).
        // Serverseitig validiert, damit klasseMin/Max nicht beliebig sind.
        if (isHost && room.phase === "lobby" && room.gameMode === "arena" && Array.isArray(msg.roundDefs) && msg.roundDefs.length > 0) {
          const validated = msg.roundDefs.map(rd => {
            if (rd && rd.kind === "arenaQuiz") {
              const kMin = Math.max(1, Math.min(10, parseInt(rd.klasseMin, 10) || 1));
              const kMax = Math.max(kMin, Math.min(10, parseInt(rd.klasseMax, 10) || 10));
              return { kind: "arenaQuiz", label: "Quiz", klasseMin: kMin, klasseMax: kMax };
            }
            return ARENA_CHALLENGE_POOL.find(r => r.id === (rd && rd.defId)) || null;
          });
          if (validated.every(Boolean)) {
            room.roundCount = validated.length;
            room.roundMode = "custom";
            room.roundDefs = validated;
            pushRoomState(room);
          }
        }
        break;
      case "setSlfCustomRoundDef":
        if (isHost && room.phase === "lobby" && room.roundMode === "custom") {
          if (msg.index >= 0 && msg.index < room.roundCount && Array.isArray(msg.categories) && msg.categories.length > 0) {
            const cleanCats = msg.categories.map(c => cleanStr(c, 20)).filter(Boolean).slice(0, 8);
            if (cleanCats.length > 0) {
              room.roundDefs[msg.index] = slfBuildRoundDef(cleanCats, "custom");
              pushRoomState(room);
            }
          }
        }
        break;
      case "setTeamMode":
        if (isHost && room.phase === "lobby") {
          room.teamMode = msg.teamMode;
          if (room.teamMode === "ffa") {
            rebuildFfaTeams(room);
          } else {
            room.teams.clear();
            const n = room.teamMode === "2v2v2" ? 3 : 2;
            const letters = ["A", "B", "C"];
            for (let i = 0; i < n; i++) room.teams.set(letters[i], { id: letters[i], name: "Team " + letters[i], memberIds: [], score: 0 });
            room.players.forEach(p => (p.teamId = null));
          }
          pushRoomState(room);
        }
        break;
      case "assignTeam":
        if (isHost && room.phase === "lobby" && room.teamMode !== "ffa") {
          const player = room.players.get(msg.playerId);
          const team = room.teams.get(msg.teamId);
          if (player && team) {
            room.teams.forEach(t => { t.memberIds = t.memberIds.filter(id => id !== msg.playerId); });
            team.memberIds.push(msg.playerId);
            player.teamId = team.id;
          }
          pushRoomState(room);
        }
        break;
      case "setPointSystem":
        if (isHost && room.phase === "lobby") { room.pointSystem = [1, 2, 3].includes(msg.system) ? msg.system : 1; pushRoomState(room); }
        break;
      case "setLanguage":
        // Auch in Scattergories-Raeumen waehlbar: Kategorien werden erst beim
        // Rundenstart passend zur Raumsprache aufgeloest (Deutsch / Englisch).
        if (isHost && room.phase === "lobby") {
          room.language = SUPPORTED_LANGS.includes(msg.language) ? msg.language : "de";
          if (room.roundMode === "random" || room.roundMode === "olympiad") {
            randomizeRoundDefs(room);
          } else {
            // Bereits gewählte Runden, die mit der neuen Sprache nicht mehr
            // verfügbar sind (germanOnly), zurück auf "nicht gewählt" setzen.
            const availableIds = new Set(roundDefPoolForLanguage(room.language, room.gameMode).map(d => d.id));
            room.roundDefs = room.roundDefs.map(r => (r && (availableIds.has(r.id) || r.id === "slf_custom")) ? r : null);
          }
          pushRoomState(room);
        }
        break;
      case "addBot":
        if (isHost && room.phase === "lobby") {
          if (room.players.size < MAX_PARTICIPANTS) {
            addBot(room, msg.tier || DEFAULT_BOT_TIER);
            pushRoomState(room);
          }
        }
        break;
      case "removeBot":
        if (isHost && room.phase === "lobby") {
          removeBot(room, msg.botId);
          pushRoomState(room);
        }
        break;
      case "kickPlayer":
        if (isHost && room.phase === "lobby") {
          if (kickPlayer(room, msg.playerId)) pushRoomState(room);
        }
        break;
      case "setBotTier":
        if (isHost && room.phase === "lobby") {
          const bot = room.players.get(msg.botId);
          if (bot && bot.isBot && BOT_TIERS[msg.tier]) { bot.botTier = msg.tier; pushRoomState(room); }
        }
        break;
      case "startGame":
        if (isHost && room.phase === "lobby") {
          if (room.roundDefs.length !== room.roundCount || room.roundDefs.some(r => !r)) randomizeRoundDefs(room);
          if (room.teams.size === 0) rebuildFfaTeams(room);
          // Wichtig: Teams (insb. bei "Alle gegen alle") werden erst hier final
          // zugewiesen. Ohne diesen roomUpdate hätte der Client noch die alte
          // (leere) teamId je Spieler zwischengespeichert und würde fälschlich
          // glauben, niemand sei je am Zug, alle Klick-Buttons blieben dann
          // unsichtbar. phase wird deshalb VOR dem Broadcast schon auf
          // "playing" gesetzt, damit der Client dabei nicht kurz zurück in
          // den Warteraum/die Solo-Konfiguration zurückspringt.
          room.phase = "playing";
          pushRoomState(room);
          room.currentRoundIndex = -1;
          startNextRound(room);
        }
        break;
      case "continue":
        if (isHost && room.phase === "roundResult") startNextRound(room);
        else if (isHost && room.runtime && room.runtime.awaitingContinue) advanceQuizQuestion(room);
        else if (isHost && room.runtime && room.runtime.kind === "nennsBlitz" && room.runtime.phase === "challenge") finalizeNennsBlitzRound(room);
        else if (isHost && room.runtime && room.runtime.kind === "stadtLandFluss" && room.runtime.phase === "challenge") slfFinalizeRound(room);
        else if (isHost && room.runtime && room.runtime.kind === "orderingGame" && !room.runtime.finalized) { clearTimeout(room.runtime.timer); finalizeOrderingRound(room); }
        else if (isHost && room.runtime && room.runtime.kind === "higherLowerGame" && room.runtime.awaitingRankContinue) { room.runtime.awaitingRankContinue = false; advanceRankingTurn(room, false); }
        else if (isHost && room.runtime && room.runtime.awaitingRoundEndContinue) { room.runtime.awaitingRoundEndContinue = false; finishRoundEngine(room, room.runtime.roundPointsByTeam); }
        break;
      case "quizAnswer":
        handleQuizAnswer(room, ws.playerId, msg.selectedIndex);
        break;
      case "rankPlace":
        if (room.runtime && room.runtime.kind === "orderingGame") {
          handleOrderingPlace(room, ws.playerId, msg.itemId, msg.insertIndex);
        } else {
          handleRankPlace(room, ws.playerId, msg.itemId, msg.insertIndex);
        }
        break;
      case "ticTacToeMove":
        if (room.runtime && room.runtime.kind === "ticTacToeGame") {
          handlePartyTicTacToeMove(room, ws.playerId, msg.index);
        }
        break;
      case "ticTacToeDuelAnswer":
        if (room.runtime && room.runtime.kind === "ticTacToeGame") partyTttDuelAnswer(room, ws.playerId, msg.index);
        break;
      case "tabooGuess":
        handleTabooGuess(room, ws.playerId, msg.text);
        break;
      case "tabooTabu":
        handleTabooTabu(room, ws.playerId);
        break;
      case "tabooSkip":
        handleTabooSkip(room, ws.playerId);
        break;
      case "tabooOk":
        handleTabooOk(room, ws.playerId, msg.by, msg.ci);
        break;
      case "tabooConfig":
        if (isHost && room.phase === "lobby") room.tabooCfg = { ms: Math.max(30, Math.min(300, Math.floor(Number(msg.secs) || 90))) * 1000, voice: msg.voice === true };
        break;
      case "fourupsMove":
        if (room.runtime && room.runtime.kind === "fourupsGame") handlePartyFourupsMove(room, ws.playerId, msg.col);
        break;
      case "guessSubmit":
        if (room.runtime && room.runtime.kind === "guessMusic") {
          handleMusicSubmit(room, ws.playerId, msg.answers);
        } else {
          handleGuessSubmit(room, ws.playerId, msg.text);
        }
        break;
      case "musicReplay":
        handleMusicReplay(room, ws.playerId);
        break;
      case "nennsBlitzSubmit":
        handleNennsBlitzSubmit(room, ws.playerId, msg.text);
        break;
      case "nennsBlitzThumb":
        handleNennsBlitzThumb(room, ws.playerId, msg.targetPlayerId, msg.answerId);
        break;
      case "nennsBlitzChallengeReady":
        handleNennsBlitzChallengeReady(room, ws.playerId);
        break;
      case "slfSubmit":
        handleSlfSubmit(room, ws.playerId, msg.answers);
        break;
      case "slfDraftUpdate":
        handleSlfDraftUpdate(room, ws.playerId, msg.answers);
        break;
      case "slfThumb":
        handleSlfThumb(room, ws.playerId, msg.targetPlayerId, msg.category);
        break;
      case "slfChallengeReady":
        handleSlfChallengeReady(room, ws.playerId);
        break;
      case "restartLobby":
        // Bewusst nicht mehr auf den Host beschränkt (Bugfix) - jede Person
        // im Raum soll nach Spielende zurück in den Warteraum können, nicht
        // nur der Host.
        if (room.phase === "gameEnd") {
          room.phase = "lobby";
          room.currentRoundIndex = -1;
          room.roundDefs = [];
          room.teams.forEach(t => (t.score = 0));
          pushRoomState(room);
        }
        break;
    }
  }

  ws.on("close", () => {
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const player = room.players.get(ws.playerId);
    if (player) player.connected = false;
    pushRoomState(room);
    // Raum aufräumen, wenn niemand mehr verbunden ist
    const anyConnected = Array.from(room.players.values()).some(p => p.connected);
    if (!anyConnected) setTimeout(() => { if (!Array.from(room.players.values()).some(p => p.connected)) rooms.delete(room.code); }, 60000);
  });
});

/* ------------------------------------------------------------------------ */
/* Start                                                                     */
/* ------------------------------------------------------------------------ */
(async () => {
  // Nicht ewig auf den Speicher warten: Nach 12 s startet der Server trotzdem
  // (Speichern bleibt gesperrt, bis das Laden klappt; Laden wird bei Bedarf wiederholt).
  await Promise.race([
    Promise.all([loadUsers(), loadConversations()]),
    new Promise(r => setTimeout(r, 12000))
  ]);
  server.listen(PORT, () => {
    const nets = os.networkInterfaces();
    const addresses = [];
    Object.values(nets).forEach(ifaces => (ifaces || []).forEach(iface => {
      if (iface.family === "IPv4" && !iface.internal) addresses.push(iface.address);
    }));
    console.log("");
    console.log("BRAIN PULSE PARTY läuft.");
    console.log("Nutzerkonten-Speicherung: " + (USE_UPSTASH ? "Upstash Redis (dauerhaft, übersteht Neustarts/Deployments)" : "lokale Datei (data/users.json - bei manchen Hosting-Anbietern NICHT dauerhaft!)"));
    console.log("Auf diesem Gerät öffnen:   http://localhost:" + PORT);
    if (addresses.length) {
      console.log("Für andere Geräte im selben WLAN:");
      addresses.forEach(a => console.log("  http://" + a + ":" + PORT));
    }
    console.log("(Läuft dieser Server bei einem Hosting-Anbieter, nutze stattdessen die von");
    console.log(" dort angezeigte öffentliche Adresse, z.B. https://dein-app-name.<anbieter>.app -");
    console.log(" darüber sind dann auch Personen außerhalb des eigenen WLANs erreichbar.)");
    console.log("");
  });
})();
