/* ============================================================================
 * ERFOLGE - gemeinsames Modul fuer Client (Browser) UND Server (Node).
 *
 * Eine einzige Definition aller Erfolge + die Regeln, wie Ereignisse (Events)
 * den Fortschritt veraendern. Der Server nutzt dieselbe Datei, um beim
 * Speichern eines Kontos NUR plausible Staende zu uebernehmen:
 *   - Zaehler duerfen nie sinken, Sonderfelder werden begrenzt,
 *   - "freigeschaltet" wird IMMER aus den Zaehlern neu berechnet (ein Client
 *     kann also keinen Erfolg direkt als erledigt melden).
 * Wichtig/ehrlich: Die Zaehler selbst meldet der Client (Brain Test, Bot-Spiele
 * und Speed Math laufen nur im Browser). Ein Angreifer koennte also erfundene
 * Zaehlerstaende schicken. Was hier verhindert wird, ist nur der einfache
 * Weg ("unlocked":[...] direkt setzen) und unsinnige Werte.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Achv = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const KLASSEN = 10;              // Anzahl Brain-Test-Klassen
  const MAIN_TEST_PASS_PCT = 0.8;  // Haupttest bestanden ab 80 %
  const FAST_SECONDS = 60;         // "in 1 Minute"

  const CATEGORIES = [
    { id: "braintest", title: "Brain Test", icon: "🧠" },
    { id: "ordering",  title: "Einordnen", icon: "📊" },
    { id: "mow",       title: "Mehr oder Weniger", icon: "⚖️" },
    { id: "blitz",     title: "Nenn's Blitz", icon: "⚡" },
    { id: "slf",       title: "Stadt Land Fluss", icon: "✏️" },
    { id: "ttt",       title: "Tic Tac Toe", icon: "⭕" },
    { id: "general",   title: "Allgemein", icon: "🌟" }
  ];

  const sum = (arr) => arr.reduce((a, b) => a + (b ? 1 : 0), 0);
  const P = (fn, target) => (s) => [Math.min(fn(s), target), target]; // Fortschritt gedeckelt auf das Ziel

  const BASE_DEFS = [
    // ---------------------------------------------------------------- Brain Test
    { id: "bt_all_classes", cat: "braintest", icon: "🎓", title: "Alle Klassen geschafft", desc: "Schaffe jede der 10 Klassen (Haupttest bestanden).", progress: P(s => sum(s.bt.passed), KLASSEN) },
    { id: "bt_all_perfect", cat: "braintest", icon: "💯", title: "Makellos durch alle Klassen", desc: "Schaffe jede Klasse mit 100 Prozent.", progress: P(s => sum(s.bt.perfect), KLASSEN) },
    { id: "bt_perfect_5",   cat: "braintest", icon: "🔁", title: "Fünfmal perfekt", desc: "Mach den Haupttest 5-mal mit 100 Prozent.", progress: P(s => s.bt.perfectRuns, 5) },
    { id: "bt_all_fast",    cat: "braintest", icon: "⏱️", title: "Schnellster Kopf", desc: "Schaffe jede Klasse in 1 Minute.", progress: P(s => sum(s.bt.fast), KLASSEN) },
    // ---------------------------------------------------------------- Einordnen
    { id: "ord_complete", cat: "ordering", icon: "✅", title: "Runde komplett", desc: "Schaffe eine Einordnen-Runde komplett.", progress: P(s => s.ord.completed, 1) },
    { id: "ord_flawless", cat: "ordering", icon: "❤️", title: "Ohne Verlust", desc: "Schaffe eine Einordnen-Runde, ohne ein Leben zu verlieren.", progress: P(s => s.ord.flawless, 1) },
    // ---------------------------------------------------------------- Mehr oder Weniger
    { id: "mow_complete", cat: "mow", icon: "✅", title: "Runde komplett", desc: "Schaffe eine Mehr-oder-Weniger-Runde komplett.", progress: P(s => s.mow.completed, 1) },
    { id: "mow_flawless", cat: "mow", icon: "❤️", title: "Ohne Verlust", desc: "Schaffe eine Mehr-oder-Weniger-Runde, ohne ein Leben zu verlieren.", progress: P(s => s.mow.flawless, 1) },
    // ---------------------------------------------------------------- Nenn's Blitz
    ...[10, 15, 20, 30, 50].map(n => ({ id: "blitz_" + n, cat: "blitz", icon: "⚡", title: "Blitz " + n, desc: "Schaffe " + n + " gültige Antworten in einer Nenn's-Blitz-Runde.", progress: P(s => s.blitz.best, n) })),
    // ---------------------------------------------------------------- Stadt Land Fluss
    { id: "slf_all_fields", cat: "slf", icon: "📝", title: "Alle Felder", desc: "Schreibe in jedes Feld etwas.", progress: P(s => s.slf.allFilled, 1) },
    { id: "slf_first_1",    cat: "slf", icon: "🥇", title: "Schnellster Stift", desc: "Sei in einer Mehrspielerrunde als Erste/r mit allen Feldern fertig.", progress: P(s => s.slf.firstFull, 1) },
    { id: "slf_first_50",   cat: "slf", icon: "🏅", title: "Schnellster Stift ×50", desc: "Sei 50-mal als Erste/r mit allen Feldern fertig.", progress: P(s => s.slf.firstFull, 50) },
    // ---------------------------------------------------------------- Tic Tac Toe
    { id: "ttt_all_belts",  cat: "ttt", icon: "🥋", title: "Alle Gürtel", desc: "Gewinne alle Gürtel (bis zum Meister).", progress: P(s => s.ttt.maxRank, 6) },
    { id: "ttt_win3_100",   cat: "ttt", icon: "⚡", title: "Blitzsieger", desc: "Gewinne 100-mal in 3 Zügen.", progress: P(s => s.ttt.win3, 100) },
    { id: "ttt_quantum_100", cat: "ttt", icon: "⚛️", title: "Quantum-Meister", desc: "Gewinne 100-mal im Quantum-Modus.", progress: P(s => s.ttt.quantumWins, 100) },
    { id: "ttt_quizmix_100", cat: "ttt", icon: "🧩", title: "QuizMix-Meister", desc: "Gewinne 100-mal im QuizMix.", progress: P(s => s.ttt.quizmixWins, 100) },
    { id: "ttt_quizmix_3",  cat: "ttt", icon: "🚀", title: "QuizMix-Blitz", desc: "Gewinne QuizMix in 3 Zügen.", progress: P(s => s.ttt.quizmix3, 1) },
    { id: "ttt_quizmix_3_perfect", cat: "ttt", icon: "🎯", title: "QuizMix-Perfektion", desc: "Gewinne QuizMix in den ersten 3 Runden und beantworte alle Fragen richtig.", progress: P(s => s.ttt.quizmix3Perfect, 1) },
    // ---------------------------------------------------------------- Allgemein
    ...[[10, "10"], [100, "100"], [1000, "1.000"], [10000, "10.000"], [100000, "100.000"], [1000000, "1 Million"]].map(([n, label], i) => ({
      id: "gen_" + n, cat: "general", icon: ["🌱", "🌿", "🌳", "🏆", "👑", "💎"][i], title: label + " richtige Antworten",
      desc: "Beantworte " + label + " Wissenstest-Fragen und Zahlenaufgaben richtig.", progress: P(s => s.gen.correct, n)
    })),
    // ---------------------------------------------------------------- eigene Ideen (siehe erfolg-ideen.md)
    { id: "ttt_unbeatable", cat: "ttt", icon: "🛡️", title: "Unbezwingbar", desc: "Spiele gegen den Meister-Bot unentschieden.", progress: P(s => s.ttt.meisterDraws, 1) },
    { id: "ord_mow_perfect_10", cat: "ordering", icon: "🌟", title: "Perfektionist", desc: "Schaffe 10 Runden (Einordnen oder Mehr oder Weniger) ohne ein Leben zu verlieren.", progress: P(s => s.ord.flawless + s.mow.flawless, 10) },
    ...[[100, "100"], [500, "500"], [1000, "1.000"]].map(([n, label], i) => ({
      id: "blitz_total_" + n, cat: "blitz", icon: ["📣", "📯", "🎺"][i], title: "Vielnenner " + label,
      desc: "Sammle insgesamt " + label + " gültige Antworten in Nenn's Blitz.", progress: P(s => s.blitz.total, n)
    })),
    { id: "slf_unique_100", cat: "slf", icon: "💡", title: "Einzigartig", desc: "Gib 100-mal eine Antwort ab, die sonst niemand hatte (20 Punkte).", progress: P(s => s.slf.unique, 100) },
    ...[[10, "10"], [25, "25"], [50, "50"]].map(([n, label], i) => ({
      id: "sm_level_" + n, cat: "general", icon: ["🥾", "🏔️", "🚩"][i], title: "Speed-Math-Level " + label,
      desc: "Erreiche Level " + label + " im Speed-Math-Meilenstein-Modus.", progress: P(s => s.sm.level, n)
    })),
    ...[[3, "3"], [7, "7"], [30, "30"], [100, "100"]].map(([n, label], i) => ({
      id: "streak_" + n, cat: "general", icon: ["🔥", "📅", "🗓️", "🎇"][i], title: label + " Tage in Folge",
      desc: "Spiele " + label + " Kalendertage in Folge mindestens eine Runde.", progress: P(s => s.streak.longest, n)
    }))
  ];
  // Kategorie-Abschluss: einmal je Kategorie, zaehlt nur die "richtigen" Erfolge dieser
  // Kategorie (nicht sich selbst und nicht die Sammel-Erfolge unten).
  const CATEGORY_DEFS = CATEGORIES.map(c => ({
    id: "cat_" + c.id, cat: c.id, icon: "🏵️", title: c.title + " gemeistert",
    desc: "Schalte alle Erfolge in der Kategorie „" + c.title + "“ frei.",
    progress: (s) => { const list = BASE_DEFS.filter(d => d.cat === c.id); return [list.filter(d => s.unlocked[d.id]).length, list.length]; }
  }));
  // "Zaehlbare" Erfolge fuer die Sammel-Erfolge: alle BASE_DEFS + die Kategorie-Erfolge,
  // aber NICHT die Sammel-Erfolge selbst (sonst zaehlten sie sich mit).
  const COUNTABLE_DEFS = BASE_DEFS.concat(CATEGORY_DEFS);
  const countDone = (s) => COUNTABLE_DEFS.filter(d => s.unlocked[d.id]).length;
  const COLLECTOR_DEFS = [
    { id: "collector_5", cat: "general", icon: "🧩", title: "Sammler", desc: "Schalte 5 Erfolge frei.", progress: (s) => [Math.min(countDone(s), 5), 5] },
    { id: "collector_15", cat: "general", icon: "🎖️", title: "Vielseitig", desc: "Schalte 15 Erfolge frei.", progress: (s) => [Math.min(countDone(s), 15), 15] },
    { id: "collector_all", cat: "general", icon: "👑", title: "Vollständig", desc: "Schalte alle anderen Erfolge frei.", progress: (s) => [Math.min(countDone(s), COUNTABLE_DEFS.length), COUNTABLE_DEFS.length] }
  ];
  // Reihenfolge wichtig: BASE zuerst, dann Kategorie (braucht BASE), dann Sammler (braucht beide) -
  // evaluate() geht die Liste einmal in dieser Reihenfolge durch und aktualisiert state.unlocked
  // dabei laufend, so werden neu erfuellte Kategorie-/Sammel-Erfolge in DERSELBEN Runde erkannt.
  const DEFS = BASE_DEFS.concat(CATEGORY_DEFS, COLLECTOR_DEFS);
  const BY_ID = Object.fromEntries(DEFS.map(d => [d.id, d]));

  // ------------------------------------------------------------------ Zustand
  const zeros = (n) => Array.from({ length: n }, () => 0);
  function newState() {
    return {
      v: 1,
      bt: { passed: zeros(KLASSEN), perfect: zeros(KLASSEN), fast: zeros(KLASSEN), perfectRuns: 0 },
      ord: { completed: 0, flawless: 0 },
      mow: { completed: 0, flawless: 0 },
      blitz: { best: 0, total: 0 },
      slf: { allFilled: 0, firstFull: 0, unique: 0 },
      ttt: { maxRank: 0, win3: 0, quantumWins: 0, quizmixWins: 0, quizmix3: 0, quizmix3Perfect: 0, meisterDraws: 0 },
      gen: { correct: 0 },
      sm: { level: 0 },
      streak: { current: 0, longest: 0, lastDate: null },
      unlocked: {}
    };
  }
  const CAPS = { perfectRuns: 1e6, completed: 1e7, flawless: 1e7, best: 1000, total: 1e7, allFilled: 1e7, firstFull: 1e7, unique: 1e7,
    maxRank: 6, win3: 1e7, quantumWins: 1e7, quizmixWins: 1e7, quizmix3: 1e7, quizmix3Perfect: 1e7, meisterDraws: 1e6, correct: 1e9, level: 50, current: 1e5, longest: 1e5 };
  const num = (v, cap) => { v = Number(v); return Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), cap) : 0; };
  const flags = (a) => Array.from({ length: KLASSEN }, (_, i) => (Array.isArray(a) && a[i] ? 1 : 0));

  // Beliebige (auch fremde/kaputte) Daten -> gueltiger Zustand
  function normalize(raw) {
    const s = newState();
    if (!raw || typeof raw !== "object") return s;
    const g = (o, k, cap) => num(o && o[k], cap);
    s.bt.passed = flags(raw.bt && raw.bt.passed); s.bt.perfect = flags(raw.bt && raw.bt.perfect); s.bt.fast = flags(raw.bt && raw.bt.fast);
    s.bt.perfectRuns = g(raw.bt, "perfectRuns", CAPS.perfectRuns);
    s.ord.completed = g(raw.ord, "completed", CAPS.completed); s.ord.flawless = g(raw.ord, "flawless", CAPS.flawless);
    s.mow.completed = g(raw.mow, "completed", CAPS.completed); s.mow.flawless = g(raw.mow, "flawless", CAPS.flawless);
    s.blitz.best = g(raw.blitz, "best", CAPS.best); s.blitz.total = g(raw.blitz, "total", CAPS.total);
    s.slf.allFilled = g(raw.slf, "allFilled", CAPS.allFilled); s.slf.firstFull = g(raw.slf, "firstFull", CAPS.firstFull); s.slf.unique = g(raw.slf, "unique", CAPS.unique);
    for (const k of ["maxRank", "win3", "quantumWins", "quizmixWins", "quizmix3", "quizmix3Perfect", "meisterDraws"]) s.ttt[k] = g(raw.ttt, k, CAPS[k]);
    s.gen.correct = g(raw.gen, "correct", CAPS.correct);
    s.sm.level = g(raw.sm, "level", CAPS.level);
    s.streak.current = g(raw.streak, "current", CAPS.current);
    s.streak.longest = g(raw.streak, "longest", CAPS.longest);
    if (raw.streak && typeof raw.streak.lastDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.streak.lastDate)) s.streak.lastDate = raw.streak.lastDate;
    // Freischalt-Zeitstempel bleiben (nur bekannte IDs, nur Zahlen); ob etwas frei ist, entscheidet evaluate()
    if (raw.unlocked && typeof raw.unlocked === "object") {
      for (const id of Object.keys(raw.unlocked)) { const t = Number(raw.unlocked[id]); if (BY_ID[id] && Number.isFinite(t) && t > 0) s.unlocked[id] = t; }
    }
    return s;
  }

  // Schaltet frei, was die Zaehler hergeben. Gibt die NEU freigeschalteten IDs zurueck.
  function evaluate(state, now) {
    const newly = [];
    for (const d of DEFS) {
      if (state.unlocked[d.id]) continue;
      const [cur, target] = d.progress(state);
      if (cur >= target) { state.unlocked[d.id] = now || Date.now(); newly.push(d.id); }
    }
    return newly;
  }

  // Bereits bestandene Klassen / erreichter Guertel aus dem bisherigen Profil uebernehmen
  function backfill(state, profile) {
    const klasse = Math.max(0, Math.min(KLASSEN, Math.floor(Number(profile && profile.klasse) || 0)));
    for (let i = 0; i < klasse; i++) state.bt.passed[i] = 1;
    state.ttt.maxRank = Math.max(state.ttt.maxRank, num(profile && profile.tttRank, CAPS.maxRank));
    state.sm.level = Math.max(state.sm.level, num(profile && profile.speedMathLevel, CAPS.level));
    return evaluate(state, Date.now());
  }

  // Ein Kalendertag (Europe/Berlin) weiter oder zurueck als "YYYY-MM-DD"-String,
  // ohne Zeitzonen-Stolperfallen (rechnet auf UTC-Mittag, damit Sommerzeit nie
  // den Tag verschiebt).
  function shiftDay(dateStr, delta) {
    const d = new Date(dateStr + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  }
  // Einmal pro Kalendertag aufrufen (z.B. beim ersten Spiel-Ereignis des Tages).
  // Ruft evaluate() nur dann auf, wenn sich wirklich etwas geaendert hat.
  function touchDaily(state, todayStr, now) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(todayStr || "")) return [];
    if (state.streak.lastDate === todayStr) return []; // heute schon gezaehlt
    if (state.streak.lastDate === shiftDay(todayStr, -1)) state.streak.current += 1; // nahtlos weiter
    else state.streak.current = 1; // erster Tag oder Luecke -> neu anfangen
    state.streak.lastDate = todayStr;
    state.streak.longest = Math.max(state.streak.longest, state.streak.current);
    return evaluate(state, now || Date.now());
  }

  // ------------------------------------------------------------------ Ereignisse
  // Gibt die IDs der dadurch NEU freigeschalteten Erfolge zurueck.
  function apply(state, evt, now) {
    if (!evt || typeof evt !== "object") return [];
    switch (evt.t) {
      case "gen": {
        state.gen.correct = Math.min(CAPS.correct, state.gen.correct + num(evt.n, 1e6));
        break;
      }
      case "braintest": { // Haupttest (20 Fragen), auch als Wiederholung
        const k = Math.floor(Number(evt.klasse));
        const correct = num(evt.correct, 1000), total = num(evt.total, 1000);
        if (!(k >= 0 && k < KLASSEN) || total < 1) break;
        const passed = correct >= Math.ceil(total * MAIN_TEST_PASS_PCT);
        const perfect = correct === total;
        if (passed) state.bt.passed[k] = 1;
        if (passed && perfect) state.bt.perfect[k] = 1;
        if (perfect) state.bt.perfectRuns = Math.min(CAPS.perfectRuns, state.bt.perfectRuns + 1);
        const secs = Number(evt.elapsedSec);
        if (passed && Number.isFinite(secs) && secs >= 0 && secs <= FAST_SECONDS) state.bt.fast[k] = 1;
        break;
      }
      case "ordering": case "mow": {
        const b = evt.t === "ordering" ? state.ord : state.mow;
        if (evt.finished) { b.completed++; if (evt.flawless) b.flawless++; }
        break;
      }
      case "blitz":
        state.blitz.best = Math.max(state.blitz.best, num(evt.total, CAPS.best));
        state.blitz.total = Math.min(CAPS.total, state.blitz.total + num(evt.total, CAPS.best));
        break;
      case "slf": {
        if (evt.allFilled) state.slf.allFilled++;
        if (evt.firstFull) state.slf.firstFull++;
        state.slf.unique = Math.min(CAPS.unique, state.slf.unique + num(evt.uniqueCount, 8));
        break;
      }
      case "ttt": { // nur bei GEWONNENEN Spielen aufrufen
        if (evt.mode === "quantum") state.ttt.quantumWins++;
        if (evt.mode === "quizmix") state.ttt.quizmixWins++;
        if (evt.in3) {
          state.ttt.win3++;
          if (evt.mode === "quizmix") { state.ttt.quizmix3++; if (evt.allCorrect) state.ttt.quizmix3Perfect++; }
        }
        break;
      }
      case "tttRank": state.ttt.maxRank = Math.max(state.ttt.maxRank, num(evt.rank, CAPS.maxRank)); break;
      case "tttDraw": if (evt.meister) state.ttt.meisterDraws = Math.min(CAPS.meisterDraws, state.ttt.meisterDraws + 1); break;
      case "speedmath": state.sm.level = Math.max(state.sm.level, num(evt.level, CAPS.level)); break;
      default: return [];
    }
    return evaluate(state, now);
  }

  // Server: gespeicherten und eingehenden Stand zusammenfuehren.
  // Zaehler = Maximum beider, Flags = ODER, "freigeschaltet" nur aus den Zaehlern.
  function merge(stored, incoming, now) {
    const a = normalize(stored), b = normalize(incoming), out = newState();
    for (let i = 0; i < KLASSEN; i++) { out.bt.passed[i] = a.bt.passed[i] | b.bt.passed[i]; out.bt.perfect[i] = a.bt.perfect[i] | b.bt.perfect[i]; out.bt.fast[i] = a.bt.fast[i] | b.bt.fast[i]; }
    const mx = (o, x, y) => { for (const k of Object.keys(o)) if (typeof o[k] === "number") o[k] = Math.max(x[k], y[k]); };
    mx(out.bt, a.bt, b.bt); mx(out.ord, a.ord, b.ord); mx(out.mow, a.mow, b.mow); mx(out.blitz, a.blitz, b.blitz);
    mx(out.slf, a.slf, b.slf); mx(out.ttt, a.ttt, b.ttt); mx(out.gen, a.gen, b.gen);
    mx(out.sm, a.sm, b.sm);
    // Streak: laengste Serie ist das Maximum, "aktuell" + "letzter Tag" kommen vom
    // Stand mit dem SPAETEREN Datum (der andere ist veraltet und wuerde die Serie
    // sonst faelschlich abreissen lassen).
    out.streak.longest = Math.max(a.streak.longest, b.streak.longest);
    const newer = (!a.streak.lastDate || (b.streak.lastDate && b.streak.lastDate >= a.streak.lastDate)) ? b.streak : a.streak;
    out.streak.current = newer.current; out.streak.lastDate = newer.lastDate;
    // bereits gespeicherte Freischaltungen behalten (mit altem Zeitstempel); Neue nur aus den Zaehlern
    out.unlocked = Object.assign({}, a.unlocked);
    // Zeitstempel des Einsenders uebernehmen - aber NUR fuer Erfolge, die die Zaehler wirklich hergeben
    for (const id of Object.keys(b.unlocked)) {
      if (!out.unlocked[id]) { const [cur, target] = BY_ID[id].progress(out); if (cur >= target) out.unlocked[id] = b.unlocked[id]; }
    }
    evaluate(out, now || Date.now());
    return out;
  }

  // Anzeige-Hilfen
  function progressOf(state, id) { const d = BY_ID[id]; return d ? d.progress(state) : [0, 1]; }
  function summary(state) { const done = DEFS.filter(d => state.unlocked[d.id]).length; return { done, total: DEFS.length }; }

  return { DEFS, BY_ID, CATEGORIES, KLASSEN, FAST_SECONDS, newState, normalize, evaluate, backfill, apply, merge, touchDaily, progressOf, summary };
});
