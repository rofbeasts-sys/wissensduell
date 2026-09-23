/**
 * BRAIN PULSE PARTY (ehem. WISSENSDUELL PARTY) – Server
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
 * getrennt in ./shared/*.json und werden hier nur eingelesen – neue
 * Kategorien lassen sich dort ergänzen, ohne den Server-Code anzufassen.
 * ---------------------------------------------------------------------------
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { WebSocketServer } = require("./lib/miniws");

const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------------------ */
/* Datenbasis laden (zentral, getrennt vom Spielcode)                        */
/* ------------------------------------------------------------------------ */
const QUIZ_QUESTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/quizQuestions.json"), "utf8"));
// Klassen-Fragenpool (1-10, je 50 Fragen) - dieselbe Quelle, aus der auch der
// Client sein KLASSE_QUESTIONS erzeugt (siehe public/index.html) - wird hier
// für die Quiz-Blöcke im Arena-Match nach Liga/Klassenbereich gefiltert.
const KLASSE_QUESTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/klasseQuestions.json"), "utf8"));
const DATASETS = JSON.parse(fs.readFileSync(path.join(__dirname, "shared/partyDatasets.json"), "utf8"));

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
const BOT_NAME_POOL = ["Alex", "Max", "Lisa", "Tom", "Anna", "Chris", "Ben", "Leon", "Sophie", "Daniel"];
const DEFAULT_BOT_TIER = "schlau";
const MAX_PARTICIPANTS = 6;
// Aktuell im Client wählbar: nur "de"/"en". "fr"/"es" bleiben hier als
// bereits akzeptierte Werte im Hintergrund vorbereitet (Client bietet sie
// nur noch nicht als Auswahl an); ja/zh/it wurden auf Wunsch entfernt.
const SUPPORTED_LANGS = ["de", "en", "fr", "es"];

// Stadt-Land-Fluss-Konstanten (hier oben, da schon beim Aufbau des
// Rundenpools benötigt – siehe buildRoundDefPool()/slfBuildRoundDef()).
const SLF_DEFAULT_CATEGORIES = ["Stadt", "Land", "Fluss", "Name", "Tier", "Beruf", "Pflanze", "Farbe", "Automarke", "Promi"];
const SLF_LETTERS = "ABCDEFGHIJKLMNOPRSTUVWZ".split(""); // Q, X, Y ausgelassen (zu schwer für flüssiges Spiel)
const SLF_ANSWER_MS = 80000;      // Zeit zum Schreiben
const SLF_HURRY_MS = 15000;       // Verkürzte Restzeit, sobald jemand ALLE Felder ausgefüllt abgegeben hat
// Kein Zeitlimit mehr fürs Anfechten (auf Wunsch entfernt) - Anfechtungsphase
// läuft jetzt, bis der Host manuell per "continue" weitergeht.
const SLF_VOTE_MS = 20000;        // Zeit zum Abstimmen über eine einzelne Anfechtung
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
function pickRandomSlfPartyCategories(count) {
  const pool = [...SLF_PARTY_CATEGORIES];
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
// Original-Kategorien (fest, überschaubar) – für den 50-Kategorien-
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

/* ------------------------------------------------------------------------ */
/* Verfügbare Rundentypen (modular, leicht erweiterbar – Punkt 15)           */
/* Stadt Land Fluss ist EIGENSTÄNDIGER Modus (eigener Menüpunkt, eigenes    */
/* Solo & Multiplayer) und steht daher NICHT mehr im normalen Mix-Pool.     */
/* ------------------------------------------------------------------------ */
function buildRoundDefPool() {
  const pool = [{ id: "quiz", kind: "knowledgeQuiz", label: "Wissenstest", germanOnly: true }];
  pool.push({ id: "tictactoe", kind: "ticTacToeGame", label: "Tic Tac Toe", germanOnly: false });
  Object.entries(DATASETS.ordering).forEach(([key, ds]) => {
    pool.push({ id: "order_" + key, kind: "orderingGame", label: ds.label, datasetGroup: "ordering", datasetKey: key, germanOnly: !!ds.germanOnly });
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
    pool.push({ id: "hilo_" + key, kind: "higherLowerGame", label: ds.label, datasetGroup: "higherLower", datasetKey: key, germanOnly: !!ds.germanOnly });
  });
  // Object.entries(DATASETS.guessPicture || {}).forEach(([key, ds]) => {
  //   pool.push({ id: "guess_" + key, kind: "guessPicture", label: ds.label, datasetGroup: "guessPicture", datasetKey: key, germanOnly: !!ds.germanOnly });
  // });
  Object.entries(DATASETS.guessMusic || {}).forEach(([key, ds]) => {
    pool.push({ id: "music_" + key, kind: "guessMusic", label: ds.label, datasetGroup: "guessMusic", datasetKey: key, germanOnly: !!ds.germanOnly });
  });
  Object.entries(DATASETS.nennsBlitz || {}).forEach(([key, ds]) => {
    // Reine Freitext-Kategorie ohne Lösungsliste (siehe Abschnitt "RUNDE:
    // nennsBlitz" weiter unten) – germanOnly, da alle Kategorien deutsch-
    // sprachig ausgerichtet sind (Bundesländer, Bundesliga, etc.).
    pool.push({ id: "blitz_" + key, kind: "nennsBlitz", label: "Nenn's Blitz: " + ds.label, datasetGroup: "nennsBlitz", datasetKey: key, germanOnly: true });
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
  music: "guessMusic",
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
  // oben) – nur SLF_ROUND_DEF_POOL enthält davon unabhängige, eigene IDs.
  return ROUND_DEF_POOL.find(r => r.id === id) || SLF_ROUND_DEF_POOL.find(r => r.id === id);
}
function roundDefPoolForLanguage(language, gameMode) {
  const base = gameMode === "slf" ? SLF_ROUND_DEF_POOL : (DEDICATED_POOLS[gameMode] || ROUND_DEF_POOL);
  return language === "de" ? base : base.filter(r => !r.germanOnly);
}

/* ------------------------------------------------------------------------ */
/* Räume                                                                     */
/* ------------------------------------------------------------------------ */
const rooms = new Map(); // code -> room

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
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
  room.players.set(id, { id, name: name.trim().slice(0, 20) || "Spieler", ws, teamId: null, connected: true, isBot: false, botTier: null });
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
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (tttRooms.has(code));
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

function tttBroadcastState(room) {
  const playersPublic = room.players.map(p => ({ name: p.name, symbol: p.symbol, connected: p.connected }));
  room.players.forEach(p => {
    send(p.ws, {
      type: "tttState",
      board: room.board,
      turnSymbol: room.turnSymbol,
      gameOver: room.gameOver,
      winner: room.winner || null,
      yourSymbol: p.symbol, // personalisiert - wichtig nach einem Rematch, bei dem Symbole tauschen
      mode: room.mode,
      players: playersPublic
    });
  });
}

/* ---- QuizMix: Variante mit Wissensduell-Feldern statt direktem Setzen -- */
/* Auf ein leeres Feld tippen startet ein 5-Fragen-Duell zwischen beiden    */
/* Spielenden (gleichzeitig, jede Frage mit Timer). Wer mehr richtige       */
/* Antworten hat, bekommt das Feld mit seinem Symbol. Bei Gleichstand       */
/* bleibt das Feld leer und ist erneut antippbar.                          */
const TTT_DUEL_QUESTIONS_PER_CELL = 5;
const TTT_DUEL_QUESTION_MS = 12000;

function tttStartDuel(room, cellIndex) {
  const questions = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, TTT_DUEL_QUESTIONS_PER_CELL);
  room.duel = {
    cellIndex,
    questions,
    qIndex: 0,
    scores: Object.fromEntries(room.players.map(p => [p.symbol, 0])),
    answered: {}, // symbol -> selectedIndex fuer die aktuelle Frage
    timer: null
  };
  tttSendDuelQuestion(room);
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
    results[p.symbol] = { selected: selected === undefined ? null : selected, correct };
  });
  broadcast(room, {
    type: "tttDuelReveal",
    cellIndex: duel.cellIndex,
    correctIndex: q.c,
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

function tttHandleDisconnect(ws) {
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
      isBot: !!p.isBot, botTier: p.botTier, botTierLabel: p.isBot ? (BOT_TIERS[p.botTier]?.label || p.botTier) : null
    })),
    teamMode: room.teamMode,
    teams: Array.from(room.teams.values()).map(t => ({ id: t.id, name: t.name, memberIds: t.memberIds, score: t.score })),
    pointSystem: room.pointSystem,
    roundCount: room.roundCount,
    roundMode: room.roundMode,
    gameMode: room.gameMode,
    roundDefs: room.roundDefs.map(r => r ? ({ id: r.id, kind: r.kind, label: r.label, categories: r.categories }) : null),
    availableRoundDefs: roundDefPoolForLanguage(room.language, room.gameMode).map(r => ({ id: r.id, kind: r.kind, label: r.label })),
    language: room.language,
    botTierOptions: BOT_TIER_ORDER.map(key => ({ id: key, label: BOT_TIERS[key].label })),
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
function randomizeRoundDefs(room) {
  const availablePool = roundDefPoolForLanguage(room.language, room.gameMode);
  const defs = [];
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
    picks.push(chosen);
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
  return pool.slice(0, n);
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
/* Leben, kein Rundenwechsel) – siehe Abschnitt "RUNDE: orderingGame" weiter */
/* unten, NICHT diese Funktion hier.                                        */
/* ------------------------------------------------------------------------ */
function startRankingRound(room, def) {
  const group = def.datasetGroup;
  const dsRaw = DATASETS[group][def.datasetKey];
  const revealOnTurn = group === "higherLower";
  // Chronologie: alle Elemente liegen von Anfang an offen sichtbar im Pool,
  // das aktive Team wählt selbst, welches Element es als Nächstes versucht.
  // Mehr oder Weniger (higherLowerGame): weiterhin ein zufällig gezogenes
  // Element pro Zug, dafür wird der Wert direkt aufgedeckt.
  const freeChoice = !revealOnTurn;

  // Manche Kategorien enthalten deutlich mehr als MAX_ROUND_ITEMS Elemente
  // (größerer, "echter" Datenpool). Damit eine Runde nicht ewig dauert, wird
  // daraus jedes Mal eine zufällige Auswahl gezogen – bei "Mehr oder Weniger"
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
// (rundenbasiert) – Einordnen hat eine eigene Bot-Funktion, siehe unten.
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
  if (!rt) return;
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

    // Bei falscher Antwort wird NICHTS einsortiert – das Element bleibt
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
    mistakes: Object.fromEntries(rt.mistakes)
  });

  setTimeout(() => finishRoundEngine(room, rt.roundPointsByTeam), 2600);
}

/* ------------------------------------------------------------------------ */
/* RUNDE: orderingGame ("Einordnen") – EIGENE, komplett gleichzeitige Engine */
/* Jeder Spieler (nicht Team!) bekommt sein eigenes, unabhängiges 1..N-      */
/* Positionsraster mit denselben Elementen und eigene 3 Leben. Alle Spieler  */
/* platzieren gleichzeitig, ohne Rundenwechsel. Der erste UND der letzte     */
/* Tipp sind automatisch immer richtig (beim ersten gibt es noch keinen      */
/* Nachbarn zum Vergleichen; beim letzten bleibt rechnerisch zwangsläufig    */
/* nur noch das passende Element für den letzten freien Slot übrig) – beides */
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
  const dsRaw = DATASETS.ordering[def.datasetKey];
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
// übersprungen) – noch leere Slots links/rechts vom Spielfeldrand gelten
// als "kein Widerspruch". Dadurch ist der allererste Tipp automatisch immer
// richtig (kein Nachbar vorhanden), und der letzte verbleibende Tipp bei nur
// noch einem freien Slot ist es rechnerisch zwangsläufig ebenfalls.
function isOrderingSlotCorrect(slots, order, value, slotIndex) {
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
function validOrderingSlots(slots, order, value) {
  const valid = [];
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null && isOrderingSlotCorrect(slots, order, value, i)) valid.push(i);
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

  const correct = isOrderingSlotCorrect(st.slots, rt.order, item.value, slotIndex);

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
    const valid = validOrderingSlots(st2.slots, rt.order, targetItem.value);
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
/* können jederzeit raten – wer zuerst richtig liegt, bekommt die Punkte.   */
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
/* Jede/r kann bis zu MUSIC_MAX_REPLAYS mal "Nochmal hören" anfordern – der  */
/* Clip spielt dabei ab der Stopp-Stelle weiter (nicht von vorne). Das senkt */
/* die maximal erreichbare Punktzahl je Feld für ALLE Spieler (geteilte      */
/* Entscheidung, da alle dasselbe hören). Jede/r gibt unabhängig von den     */
/* anderen drei Antworten ab: Künstler, Titel, Jahr – jedes Feld zählt       */
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

// Jede/r Spieler/in kann das anfordern (nicht nur der Host) – wirkt sich auf
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
  // diesem Zeitpunkt genutzten Wiederholungen) – spätere Wiederholungen durch
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
// und Trefferquote ab – über denselben handleMusicSubmit()-Weg wie Menschen,
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
/* Freitext, keine feste Lösungsliste – alle Spieler:innen tippen GLEICH-    */
/* ZEITIG frei Begriffe zu einer Kategorie (kein Buzzer, kein reihum mehr –  */
/* nach Rückfrage bewusst so vereinfacht). Jede neu getippte, im EIGENEN     */
/* Feld noch nicht genannte Antwort zählt vorläufig – dieselbe Antwort von   */
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
const NENNSBLITZ_DUELL_MS = 120000;        // fest für 2+ Spieler:innen, keine Auswahl
// Kein Zeitlimit mehr fürs Anfechten (auf Wunsch entfernt) - läuft jetzt,
// bis der Host manuell per "continue" weitergeht.
const NENNSBLITZ_VOTE_MS = 20000;          // Abstimmzeit je einzelner Anfechtung (an SLF angelehnt)

function normalizeNennsBlitzText(text) {
  return (text || "").trim().toLowerCase().replace(/[^a-zäöüß0-9 ]/gi, "").replace(/\s+/g, " ").trim();
}

function startNennsBlitzRound(room, def) {
  const ds = DATASETS.nennsBlitz[def.datasetKey];
  const teamIds = Array.from(room.teams.keys());
  // Solo-Party-Räume bestehen strukturell immer aus genau 1 menschlichen
  // Spieler:in (keine Bots, kein Warten auf weitere Beitritte) – daher
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
    challengeCounter: 0,
    challenges: new Map(),
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
// Kategorie-Begriffe – sie tragen trotzdem zum Tempo/Ablauf bei, zählen aber
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
          handleNennsBlitzSubmit(room, bot.id, `Antwort ${bot.name} ${n}`);
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
  const trimmed = (text || "").trim().slice(0, 60);
  if (!trimmed) return;
  const norm = normalizeNennsBlitzText(trimmed);
  if (!norm) return;
  // Duplikat-Prüfung im eigenen Feld – dieselbe Antwort von einer anderen
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
  broadcastNennsBlitzChallenges(room);
}

function handleNennsBlitzChallengeReady(room, playerId) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "nennsBlitz" || rt.phase !== "challenge") return;
  if (!rt.readyPlayers) rt.readyPlayers = new Set();
  rt.readyPlayers.add(playerId);
  broadcastNennsBlitzChallenges(room);
}

function handleNennsBlitzChallenge(room, challengerId, targetPlayerId, answerId) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "nennsBlitz" || rt.phase !== "challenge") return;
  if (targetPlayerId === challengerId) return; // eigene Antwort nicht anfechtbar
  const targetSt = rt.perPlayer.get(targetPlayerId);
  if (!targetSt) return;
  const answer = targetSt.answers.find(a => a.id === answerId);
  if (!answer) return;
  const already = Array.from(rt.challenges.values()).some(c => c.playerId === targetPlayerId && c.answerId === answerId && !c.resolved);
  if (already) return;

  const challengeId = "c" + (++rt.challengeCounter);
  const votes = new Map();
  votes.set(challengerId, false); // Anfechter stimmt implizit "ungültig"
  const challenge = { id: challengeId, playerId: targetPlayerId, answerId, answerText: answer.text, votes, resolved: false };
  rt.challenges.set(challengeId, challenge);
  broadcastNennsBlitzChallenges(room);
  setTimeout(() => resolveNennsBlitzChallenge(room, challengeId), NENNSBLITZ_VOTE_MS + 300);
}

function handleNennsBlitzVote(room, voterId, challengeId, valid) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "nennsBlitz" || rt.phase !== "challenge") return;
  const challenge = rt.challenges.get(challengeId);
  if (!challenge || challenge.resolved || voterId === challenge.playerId) return;
  challenge.votes.set(voterId, !!valid);
  const eligibleVoters = Array.from(room.players.keys()).filter(pid => pid !== challenge.playerId && !room.players.get(pid).isBot);
  if (eligibleVoters.length && eligibleVoters.every(pid => challenge.votes.has(pid))) resolveNennsBlitzChallenge(room, challenge.id);
  else broadcastNennsBlitzChallenges(room);
}

function resolveNennsBlitzChallenge(room, challengeId) {
  const rt = room.runtime;
  if (!rt) return;
  const challenge = rt.challenges.get(challengeId);
  if (!challenge || challenge.resolved) return;
  challenge.resolved = true;
  const votes = Array.from(challenge.votes.values());
  const invalidVotes = votes.filter(v => v === false).length;
  const validVotes = votes.filter(v => v === true).length;
  challenge.invalidated = invalidVotes > validVotes; // bei Gleichstand bleibt die Antwort gültig
  broadcastNennsBlitzChallenges(room);
}

function broadcastNennsBlitzChallenges(room) {
  const rt = room.runtime;
  const humanCount = Array.from(room.players.values()).filter(p => !p.isBot).length;
  broadcast(room, {
    type: "nennsBlitzChallengeUpdate",
    challenges: Array.from(rt.challenges.values()).map(c => ({
      id: c.id, playerId: c.playerId, answerId: c.answerId, answerText: c.answerText,
      resolved: c.resolved, invalidated: c.invalidated, voteCount: c.votes.size
    })),
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
  rt.challenges.forEach(c => { if (c.resolved && c.invalidated) invalidatedIds.add(c.playerId + "|" + c.answerId); });

  const results = [];
  rt.perPlayer.forEach((st, pid) => {
    const player = room.players.get(pid);
    const validCount = st.answers.filter(a => !invalidatedIds.has(pid + "|" + a.id)).length;
    results.push({ playerId: pid, name: player ? player.name : "?", total: validCount });
    if (player && player.teamId) {
      // 1 Punkt pro gültiger Antwort, je Team aufsummiert – für Solo wie
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
      label: "Stadt Land Fluss: Party-Mix (10 zufällige Kategorien)",
      germanOnly: true,
      slfPartyMix: true,
      categories: null
    };
  }
  const cats = (categories && categories.length ? categories : SLF_DEFAULT_CATEGORIES).slice(0, 10);
  return {
    id: mode === "custom" ? "slf_custom" : "slf_original",
    kind: "stadtLandFluss",
    label: "Stadt Land Fluss: " + (mode === "custom" ? "Eigene Kategorien (" + cats.join(", ") + ")" : "Original"),
    germanOnly: true,
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
  const categories = def.slfPartyMix
    ? pickRandomSlfPartyCategories(SLF_PARTY_ROUND_SIZE)
    : (def.categories && def.categories.length ? def.categories : SLF_DEFAULT_CATEGORIES);
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
    challenges: new Map(),   // challengeId -> { playerId, category, votes: Map(playerId->bool), resolved, invalidated }
    challengeCounter: 0,
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
        const word = (SLF_BOT_WORDS[cat] || {})[letterUpper];
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
  rt.categories.forEach(cat => { clean[cat] = (answers && typeof answers[cat] === "string") ? answers[cat].slice(0, 40) : ""; });
  rt.answers.set(playerId, clean);
}

function handleSlfSubmit(room, playerId, answers) {
  const rt = room.runtime;
  if (!rt || rt.kind !== "stadtLandFluss" || rt.phase !== "answering") return;
  if (rt.submitted.has(playerId)) return;
  const clean = {};
  rt.categories.forEach(cat => { clean[cat] = (answers && typeof answers[cat] === "string") ? answers[cat].slice(0, 40) : ""; });
  rt.answers.set(playerId, clean);
  rt.submitted.add(playerId);

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
// gemeinte Wort mit einem Tippfehler – dann ziehen wir beiden Beteiligten
// 5 Punkte von der jeweiligen Grundwertung ab (nie unter 0).
// `invalidPlayerCatPairs` enthält per Anfechtung für ungültig erklärte
// Antworten (Set aus "playerId|kategorie") und wird wie eine leere Antwort
// behandelt – dadurch wirkt sich eine erfolgreiche Anfechtung automatisch auf
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
    scores: Object.fromEntries(scores)
  });
  rt.phase = "challenge";
  // Kein Zeitlimit mehr: jede·r kann anfechten und sich per "Fertig" als
  // bereit melden; der Host sieht den Bereitschaftsstand und entscheidet
  // selbst per "continue", wann es weitergeht (nicht an alle gebunden).
  rt.readyPlayers = new Set();
  broadcastSlfChallenges(room);
}

function handleSlfChallengeReady(room, playerId) {
  const rt = room.runtime;
  if (!rt || rt.phase !== "challenge") return;
  if (!rt.readyPlayers) rt.readyPlayers = new Set();
  rt.readyPlayers.add(playerId);
  broadcastSlfChallenges(room);
}

function handleSlfChallenge(room, challengerId, targetPlayerId, category) {
  const rt = room.runtime;
  if (!rt || rt.phase !== "challenge") return;
  if (!rt.categories.includes(category)) return;
  if (targetPlayerId === challengerId) return; // eigene Antwort nicht anfechtbar
  const targetAnswers = rt.answers.get(targetPlayerId);
  if (!targetAnswers || !targetAnswers[category]) return;
  // Keine doppelte Anfechtung derselben Antwort
  const already = Array.from(rt.challenges.values()).some(c => c.playerId === targetPlayerId && c.category === category && !c.resolved);
  if (already) return;

  const challengeId = "c" + (++rt.challengeCounter);
  const votes = new Map();
  votes.set(challengerId, false); // Anfechter stimmt implizit "ungültig"
  const challenge = { id: challengeId, playerId: targetPlayerId, category, answerText: targetAnswers[category], votes, resolved: false, voteDeadline: Date.now() + SLF_VOTE_MS };
  rt.challenges.set(challengeId, challenge);
  broadcastSlfChallenges(room);
  setTimeout(() => slfResolveChallenge(room, challengeId), SLF_VOTE_MS + 300);
}

function handleSlfVote(room, voterId, challengeId, valid) {
  const rt = room.runtime;
  if (!rt || rt.phase !== "challenge") return;
  const challenge = rt.challenges.get(challengeId);
  if (!challenge || challenge.resolved || voterId === challenge.playerId) return;
  challenge.votes.set(voterId, !!valid);
  const eligibleVoters = Array.from(room.players.keys()).filter(pid => pid !== challenge.playerId && !room.players.get(pid).isBot);
  if (eligibleVoters.every(pid => challenge.votes.has(pid))) slfResolveChallenge(room, challengeId);
  else broadcastSlfChallenges(room);
}

function slfResolveChallenge(room, challengeId) {
  const rt = room.runtime;
  if (!rt) return;
  const challenge = rt.challenges.get(challengeId);
  if (!challenge || challenge.resolved) return;
  challenge.resolved = true;
  const votes = Array.from(challenge.votes.values());
  const invalidVotes = votes.filter(v => v === false).length;
  const validVotes = votes.filter(v => v === true).length;
  challenge.invalidated = invalidVotes > validVotes; // bei Gleichstand bleibt die Antwort gültig
  broadcastSlfChallenges(room);
}

function broadcastSlfChallenges(room) {
  const rt = room.runtime;
  const humanCount = Array.from(room.players.values()).filter(p => !p.isBot).length;
  broadcast(room, {
    type: "slfChallengeUpdate",
    challenges: Array.from(rt.challenges.values()).map(c => ({
      id: c.id, playerId: c.playerId, category: c.category, answerText: c.answerText,
      resolved: c.resolved, invalidated: c.invalidated, voteCount: c.votes.size
    })),
    readyCount: rt.readyPlayers ? rt.readyPlayers.size : 0,
    readyTotal: humanCount
  });
}

function slfFinalizeRound(room) {
  const rt = room.runtime;
  if (!rt || rt.phase === "done") return;
  rt.phase = "done";
  const invalidPairs = new Set();
  rt.challenges.forEach(c => { if (c.resolved && c.invalidated) invalidPairs.add(c.playerId + "|" + c.category); });
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
    broadcast(room, { type: "ticTacToeSkipped", reason: "Tic Tac Toe braucht genau 2 Teams – diese Runde entfällt." });
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
    winnerTeamId: null
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
    winnerTeamId: rt.winnerTeamId
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
  rt.board[index] = mySymbol;
  const winner = tttCheckWinner(rt.board); // dieselbe Funktion wie beim eigenständigen Tic-Tac-Toe-Modus
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

/* ------------------------------------------------------------------------ */
/* Rundensteuerung                                                           */
/* ------------------------------------------------------------------------ */
function startNextRound(room) {
  room.currentRoundIndex++;
  if (room.currentRoundIndex >= room.roundDefs.length) {
    return endGame(room);
  }
  const def = room.roundDefs[room.currentRoundIndex];
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
const USERS_FILE = path.join(__dirname, "data", "users.json");
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_UPSTASH = !!(UPSTASH_URL && UPSTASH_TOKEN);
const UPSTASH_USERS_KEY = "brainpulse_users";

let users = [];

async function loadUsers() {
  if (USE_UPSTASH) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/${UPSTASH_USERS_KEY}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      const data = await res.json();
      users = data.result ? JSON.parse(data.result) : [];
      console.log(`Nutzerdaten aus Upstash geladen (${users.length} Konten).`);
    } catch (e) {
      console.error("Konnte Nutzerdaten nicht aus Upstash laden:", e.message);
      users = [];
    }
    return;
  }
  try { users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); }
  catch (e) { users = []; }
}

async function saveUsers() {
  if (USE_UPSTASH) {
    try {
      const res = await fetch(`${UPSTASH_URL}/set/${UPSTASH_USERS_KEY}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "text/plain" },
        body: JSON.stringify(users)
      });
      if (!res.ok) console.error("Upstash-Speichern fehlgeschlagen, Status:", res.status);
    } catch (e) {
      console.error("Konnte Nutzerdaten nicht in Upstash speichern:", e.message);
    }
    return;
  }
  try {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 1), "utf8");
  } catch (e) {
    console.error("Konnte Nutzerdaten nicht speichern:", e.message);
  }
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function findUserByName(username) {
  const norm = (username || "").trim().toLowerCase();
  return users.find(u => u.username.toLowerCase() === norm);
}
function findUserByToken(token) {
  if (!token) return null;
  return users.find(u => (u.tokens || []).some(t => t.token === token));
}
function defaultStats() {
  return { score: 0, tier: 0, klasse: 0, consecutiveFails: 0, roundsPlayed: 0, wins: 0, losses: 0, correctAnswers: 0, wrongAnswers: 0, bestScore: 0,
    arenaLeague: 0, arenaPoints: 0, arenaHearts: ARENA_DAILY_HEARTS, arenaHeartsDate: null, arenaMatchesPlayed: 0, tttRank: 0, tttWinsAtRank: 0,
    modeStats: freshModeStats() };
}
const MODE_STAT_KEYS = ["ordering", "chronology", "higherlower", "music", "picture"];
function freshModeStats() {
  const s = {};
  MODE_STAT_KEYS.forEach(k => { s[k] = { played: 0, correct: 0 }; });
  return s;
}
function publicProfile(user) {
  return { username: user.username, avatar: user.avatar || null, ...user.stats };
}

async function registerUser(username, password) {
  username = (username || "").trim();
  if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_äöüÄÖÜß]+$/.test(username)) {
    return { ok: false, error: "Benutzername muss 3-20 Zeichen haben (Buchstaben, Zahlen, _)." };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "Passwort muss mindestens 6 Zeichen haben." };
  }
  if (findUserByName(username)) {
    return { ok: false, error: "Dieser Benutzername ist bereits vergeben." };
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const token = crypto.randomBytes(24).toString("hex");
  const user = {
    username, salt, passwordHash,
    avatar: null,
    stats: defaultStats(),
    tokens: [{ token, createdAt: Date.now() }],
    createdAt: Date.now()
  };
  users.push(user);
  await saveUsers();
  return { ok: true, token, profile: publicProfile(user) };
}

async function loginUser(username, password) {
  const user = findUserByName(username);
  const genericError = { ok: false, error: "Benutzername oder Passwort ist falsch." };
  if (!user) return genericError;
  const hash = hashPassword(password || "", user.salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return genericError;
  const token = crypto.randomBytes(24).toString("hex");
  user.tokens = user.tokens || [];
  user.tokens.push({ token, createdAt: Date.now() });
  await saveUsers();
  return { ok: true, token, profile: publicProfile(user) };
}

function sessionUser(token) {
  const user = findUserByToken(token);
  if (!user) return { ok: false };
  return { ok: true, profile: publicProfile(user) };
}

async function logoutUser(token) {
  const user = findUserByToken(token);
  if (user) {
    user.tokens = (user.tokens || []).filter(t => t.token !== token);
    await saveUsers();
  }
  return { ok: true };
}

async function saveUserStats(token, stats) {
  const user = findUserByToken(token);
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const allowedKeys = ["score", "tier", "klasse", "consecutiveFails", "roundsPlayed", "wins", "losses", "correctAnswers", "wrongAnswers", "bestScore", "tttRank", "tttWinsAtRank"];
  allowedKeys.forEach(k => {
    if (typeof stats[k] === "number" && Number.isFinite(stats[k])) {
      user.stats[k] = Math.max(0, Math.round(stats[k]));
    }
  });
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
  await saveUsers();
  return { ok: true, profile: publicProfile(user) };
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

function todayDateString() { return new Date().toISOString().slice(0, 10); }

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

async function arenaStatus(token) {
  const user = findUserByToken(token);
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  refreshArenaHearts(user);
  await saveUsers();
  const league = arenaLeagueInfo(user);
  const nextLeague = ARENA_LEAGUES[league.index + 1] || null;
  return {
    ok: true,
    hearts: user.stats.arenaHearts,
    maxHearts: ARENA_DAILY_HEARTS,
    points: user.stats.arenaPoints,
    league: { index: league.index, name: league.name, klasseMin: league.klasseMin, klasseMax: league.klasseMax },
    nextLeague: nextLeague ? { name: nextLeague.name, pointsNeeded: Math.max(0, (league.promoteAt || 0) - user.stats.arenaPoints) } : null,
    matchesPlayed: user.stats.arenaMatchesPlayed || 0
  };
}

// Verbraucht ein Herz für den Matchstart. Gibt die passende Liga (für die
// Fragenauswahl im Client) gleich mit zurück, damit der Client nicht separat
// nachfragen muss.
async function arenaStartMatch(token) {
  const user = findUserByToken(token);
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  refreshArenaHearts(user);
  if (user.stats.arenaHearts <= 0) {
    return { ok: false, error: "Keine Herzen mehr übrig. Morgen gibt's wieder welche!" };
  }
  user.stats.arenaHearts -= 1;
  await saveUsers();
  const league = arenaLeagueInfo(user);
  return { ok: true, heartsLeft: user.stats.arenaHearts, league: { index: league.index, name: league.name, klasseMin: league.klasseMin, klasseMax: league.klasseMax } };
}

// Schließt ein Match ab: addiert die im Match gesammelten Punkte (1 pro
// korrekter Antwort/gelöster Aufgabe, vom Client mitgezählt) auf das
// Lifetime-Konto, prüft ob die aktuelle Liga damit überschritten wird
// (Aufstieg - niemals Abstieg, siehe Kommentar oben) und speichert.
async function arenaFinishMatch(token, pointsEarned) {
  const user = findUserByToken(token);
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const gained = Math.max(0, Math.round(Number(pointsEarned) || 0));
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
  const picked = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, n);
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
const MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.startsWith("/api/")) {
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on("end", async () => {
      let payload;
      try { payload = body ? JSON.parse(body) : {}; } catch (e) { payload = {}; }
      let result;
      if (req.url === "/api/register") result = await registerUser(payload.username, payload.password);
      else if (req.url === "/api/login") result = await loginUser(payload.username, payload.password);
      else if (req.url === "/api/session") result = sessionUser(payload.token);
      else if (req.url === "/api/logout") result = await logoutUser(payload.token);
      else if (req.url === "/api/save-stats") result = await saveUserStats(payload.token, payload.stats || {});
      else if (req.url === "/api/arena-status") result = await arenaStatus(payload.token);
      else if (req.url === "/api/arena-start-match") result = await arenaStartMatch(payload.token);
      else if (req.url === "/api/arena-finish-match") result = await arenaFinishMatch(payload.token, payload.pointsEarned);
      else if (req.url === "/api/arena-leaderboard") result = arenaLeaderboard();
      else if (req.url === "/api/random-quiz-questions") result = randomQuizQuestions(payload.count);
      else result = { ok: false, error: "Unbekannter Endpunkt." };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    });
    return;
  }

  let filePath = req.url.split("?")[0];
  if (filePath === "/") filePath = "/index.html";
  const fullPath = path.join(__dirname, "public", filePath);
  if (!fullPath.startsWith(path.join(__dirname, "public"))) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fullPath)] || "application/octet-stream" });
    res.end(data);
  });
});

/* ------------------------------------------------------------------------ */
/* WebSocket-Handling                                                        */
/* ------------------------------------------------------------------------ */
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  // Regelmäßiger Ping hält die Verbindung durch Proxys/Idle-Timeouts mancher
  // Hosting-Anbieter am Leben (Browser beantworten Ping-Frames automatisch
  // mit Pong, ganz ohne zusätzlichen Client-Code).
  const keepAlive = setInterval(() => {
    if (ws.readyState === 1) ws.ping();
    else clearInterval(keepAlive);
  }, 25000);
  ws.on("close", () => { clearInterval(keepAlive); tttHandleDisconnect(ws); });

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.action === "createRoom") {
      const room = createRoom(ws, msg.name || "Host", msg.language, msg.gameMode);
      send(ws, { type: "joined", roomCode: room.code, playerId: ws.playerId, isHost: true });
      pushRoomState(room);
      return;
    }

    if (msg.action === "joinRoom") {
      const room = rooms.get((msg.code || "").toUpperCase());
      if (!room) return send(ws, { type: "error", message: "Raum nicht gefunden." });
      if (room.phase !== "lobby") return send(ws, { type: "error", message: "Diese Runde läuft bereits." });
      if (room.players.size >= MAX_PARTICIPANTS) return send(ws, { type: "error", message: "Der Raum ist voll (max. " + MAX_PARTICIPANTS + " Teilnehmer)." });
      const id = "pl_" + Math.random().toString(36).slice(2, 9);
      addPlayer(room, ws, id, msg.name || "Spieler");
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
        players: [{ ws, name: msg.name || "Host", symbol: hostSymbol, connected: true }],
        board: Array(9).fill(null),
        turnSymbol: "X",
        gameOver: false,
        winner: null,
        mode: (msg.mode === "quizmix" || msg.mode === "quantum") ? msg.mode : "classic",
        duel: null,
        xPieces: [], oPieces: [] // nur für Quantum-Modus genutzt (Zug-Reihenfolge je Symbol)
      };
      tttRooms.set(code, room);
      ws.tttRoomCode = code;
      send(ws, { type: "tttJoined", roomCode: code, symbol: hostSymbol, mode: room.mode });
      return;
    }
    if (msg.action === "tttJoinRoom") {
      const room = tttRooms.get((msg.code || "").toUpperCase());
      if (!room) return send(ws, { type: "tttError", message: "Raum nicht gefunden." });
      if (room.players.length >= 2) return send(ws, { type: "tttError", message: "Der Raum ist schon voll." });
      const guestSymbol = room.players[0].symbol === "X" ? "O" : "X";
      room.players.push({ ws, name: msg.name || "Spieler", symbol: guestSymbol, connected: true });
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
      if (!room || !room.duel) return;
      const player = room.players.find(p => p.ws === ws);
      if (!player) return;
      tttHandleDuelAnswer(room, player.symbol, msg.selectedIndex);
      return;
    }
    if (msg.action === "tttRematch") {
      const room = tttRooms.get(ws.tttRoomCode);
      if (!room) return;
      if (room.duel) { clearTimeout(room.duel.timer); room.duel = null; }
      room.board = Array(9).fill(null);
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
        // fest 120s, siehe NENNSBLITZ_DUELL_MS) – wird trotzdem unabhängig
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
          room.roundMode = msg.mode === "custom" ? "custom" : "random";
          if (room.roundMode === "random") randomizeRoundDefs(room);
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
            room.roundDefs[msg.index] = def;
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
            const cleanCats = msg.categories.map(c => (c || "").toString().trim().slice(0, 20)).filter(Boolean).slice(0, 8);
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
        // Stadt Land Fluss ist ein reines Sprachspiel auf Deutsch – die Sprache
        // lässt sich in einem SLF-Raum daher nicht umschalten (der Kategorien-Pool
        // wäre sonst leer, da alle SLF-Rundendefinitionen germanOnly sind).
        if (isHost && room.phase === "lobby" && room.gameMode !== "slf") {
          room.language = SUPPORTED_LANGS.includes(msg.language) ? msg.language : "de";
          if (room.roundMode === "random") {
            randomizeRoundDefs(room);
          } else {
            // Bereits gewählte Runden, die mit der neuen Sprache nicht mehr
            // verfügbar sind (germanOnly), zurück auf "nicht gewählt" setzen.
            const availableIds = new Set(roundDefPoolForLanguage(room.language, room.gameMode).map(d => d.id));
            room.roundDefs = room.roundDefs.map(r => (r && availableIds.has(r.id)) ? r : null);
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
          // glauben, niemand sei je am Zug – alle Klick-Buttons blieben dann
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
      case "nennsBlitzChallenge":
        handleNennsBlitzChallenge(room, ws.playerId, msg.targetPlayerId, msg.answerId);
        break;
      case "nennsBlitzVote":
        handleNennsBlitzVote(room, ws.playerId, msg.challengeId, msg.valid);
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
      case "slfChallenge":
        handleSlfChallenge(room, ws.playerId, msg.targetPlayerId, msg.category);
        break;
      case "slfVote":
        handleSlfVote(room, ws.playerId, msg.challengeId, msg.valid);
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
  });

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
  await loadUsers();
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
