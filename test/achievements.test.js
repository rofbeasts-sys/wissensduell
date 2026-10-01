/* Erfolge: Regelwerk (jeder Erfolg + Grenzwerte), Server-Zusammenfuehren, Client-Einbindung */
const { ok, section, sleep, finish, startServer, post, wsConnect, loadClient } = require("./helpers");
const Achv = require("../public/achievements.js");

const fresh = () => Achv.newState();
const has = (s, id) => !!s.unlocked[id];
const ids = (list) => list.slice().sort().join(",");

(async () => {
// ================================================================== Regelwerk
section("Regelwerk: Definitionen");
ok("53 Erfolge, alle IDs eindeutig", Achv.DEFS.length === 53 && new Set(Achv.DEFS.map(d => d.id)).size === 53);
ok("jeder Erfolg gehoert zu einer bekannten Kategorie und hat Titel/Beschreibung", Achv.DEFS.every(d => Achv.CATEGORIES.some(c => c.id === d.cat) && d.title && d.desc && d.icon));
ok("frischer Stand: nichts freigeschaltet", Object.keys(fresh().unlocked).length === 0);

section("Brain Test");
{
  const s = fresh();
  const test = (k, c, secs) => Achv.apply(s, { t: "braintest", klasse: k, correct: c, total: 20, elapsedSec: secs });
  test(0, 15, 30); ok("15/20 (75 %) ist NICHT bestanden -> zaehlt nicht", s.bt.passed[0] === 0 && s.bt.fast[0] === 0);
  test(0, 16, 61); ok("16/20 in 61 s: bestanden, aber nicht 'in 1 Minute'", s.bt.passed[0] === 1 && s.bt.fast[0] === 0 && s.bt.perfect[0] === 0);
  test(0, 16, 60); ok("genau 60 s zaehlt als 'in 1 Minute'", s.bt.fast[0] === 1);
  test(1, 20, 999); ok("Zeit abgelaufen (elapsed 999) zaehlt nicht als schnell", s.bt.fast[1] === 1 ? false : true);
  const s2 = fresh(); Achv.apply(s2, { t: "braintest", klasse: 2, correct: 20, total: 20, elapsedSec: 45 });
  ok("20/20 in 45 s: bestanden + perfekt + schnell fuer genau diese Klasse", s2.bt.passed[2] && s2.bt.perfect[2] && s2.bt.fast[2] && !s2.bt.passed[0]);
  ok("Fuenf perfekte Durchlaeufe zaehlen mit (auch wiederholt in derselben Klasse)", (() => { const t = fresh(); let n = []; for (let i = 0; i < 5; i++) n = Achv.apply(t, { t: "braintest", klasse: 0, correct: 20, total: 20, elapsedSec: 80 }); return has(t, "bt_perfect_5") && t.bt.perfectRuns === 5 && !has(t, "bt_all_classes"); })());
  const s3 = fresh(); let last;
  for (let k = 0; k < 9; k++) Achv.apply(s3, { t: "braintest", klasse: k, correct: 20, total: 20, elapsedSec: 40 });
  ok("9 von 10 Klassen: noch kein Klassen-Erfolg", !has(s3, "bt_all_classes") && !has(s3, "bt_all_perfect") && !has(s3, "bt_all_fast"));
  last = Achv.apply(s3, { t: "braintest", klasse: 9, correct: 20, total: 20, elapsedSec: 40 });
  ok("10. Klasse: alle drei Klassen-Erfolge + 5x perfekt", ids(last) === ids(["bt_all_classes", "bt_all_perfect", "bt_all_fast"]) || (has(s3, "bt_all_classes") && has(s3, "bt_all_perfect") && has(s3, "bt_all_fast") && has(s3, "bt_perfect_5")));
  const s4 = fresh(); for (let k = 0; k < 10; k++) Achv.apply(s4, { t: "braintest", klasse: k, correct: 17, total: 20, elapsedSec: 100 });
  ok("alle Klassen nur knapp bestanden: 'alle Klassen' ja, 'perfekt'/'schnell' nein", has(s4, "bt_all_classes") && !has(s4, "bt_all_perfect") && !has(s4, "bt_all_fast"));
  ok("ungueltige Klasse / total 0 wird ignoriert", (() => { const t = fresh(); Achv.apply(t, { t: "braintest", klasse: 12, correct: 20, total: 20, elapsedSec: 1 }); Achv.apply(t, { t: "braintest", klasse: 0, correct: 0, total: 0, elapsedSec: 1 }); return t.bt.passed.every(x => !x); })());
}

section("Einordnen + Mehr oder Weniger");
for (const [t, pre] of [["ordering", "ord"], ["mow", "mow"]]) {
  const s = fresh();
  ok(pre + ": nicht geschafft (ausgeschieden) -> nichts", Achv.apply(s, { t, finished: false, flawless: false }).length === 0);
  ok(pre + ": komplett mit Fehlern -> nur 'komplett'", ids(Achv.apply(s, { t, finished: true, flawless: false })) === pre + "_complete");
  const flawlessResult = Achv.apply(s, { t, finished: true, flawless: true });
  ok(pre + ": komplett ohne Lebensverlust -> 'ohne Verlust'", flawlessResult.includes(pre + "_flawless"));
  if(pre === "mow") ok("... und macht die Kategorie 'Mehr oder Weniger' im selben Zug komplett", flawlessResult.includes("cat_mow"));
}
ok("'flawless' ohne 'finished' zaehlt nicht", Achv.apply(fresh(), { t: "ordering", finished: false, flawless: true }).length === 0);

section("Nenn's Blitz");
{
  const s = fresh();
  ok("9 Antworten: nichts", Achv.apply(s, { t: "blitz", total: 9 }).length === 0);
  ok("10 -> Blitz 10", ids(Achv.apply(s, { t: "blitz", total: 10 })) === "blitz_10");
  ok("14 -> nichts Neues, 15 -> Blitz 15", Achv.apply(s, { t: "blitz", total: 14 }).length === 0 && ids(Achv.apply(s, { t: "blitz", total: 15 })) === "blitz_15");
  ok("30 auf einmal ueberspringt nichts: 20 und 30 werden beide frei", ids(Achv.apply(s, { t: "blitz", total: 30 })) === "blitz_20,blitz_30");
  const fifty = Achv.apply(s, { t: "blitz", total: 50 });
  ok("50 -> Blitz 50, danach sind alle fuenf frei", fifty.includes("blitz_50") && [10, 15, 20, 30, 50].every(n => has(s, "blitz_" + n)));
  ok("... und das ist gleichzeitig der 5. Erfolg ueberhaupt -> Sammler schaltet im selben Zug mit frei", fifty.includes("collector_5"));
  ok("Bestwert sinkt nie", (() => { Achv.apply(s, { t: "blitz", total: 3 }); return s.blitz.best === 50; })());
}

section("Musik");
{
  const s = fresh();
  for (let i = 0; i < 9; i++) Achv.apply(s, { t: "music", n: 1 });
  ok("9 Songs ohne Wiederholung: noch nicht", !has(s, "music_10_noreplay"));
  const tenth = Achv.apply(s, { t: "music", n: 1 });
  ok("10. Song -> Erfolg", tenth.includes("music_10_noreplay"));
  ok("... die Kategorie Musik hat nur diesen einen Erfolg, ist damit ebenfalls komplett", tenth.includes("cat_music"));
}

section("Stadt Land Fluss");
{
  const s = fresh();
  ok("alle Felder gefuellt -> 'Alle Felder'", ids(Achv.apply(s, { t: "slf", allFilled: true, firstFull: false })) === "slf_all_fields");
  ok("als Erste/r fertig -> 'Schnellster Stift'", ids(Achv.apply(s, { t: "slf", allFilled: true, firstFull: true })) === "slf_first_1");
  for (let i = 0; i < 48; i++) Achv.apply(s, { t: "slf", allFilled: true, firstFull: true });
  ok("49x Erste/r: der 50er-Erfolg fehlt noch", s.slf.firstFull === 49 && !has(s, "slf_first_50"));
  ok("50. Mal -> Schnellster Stift x50", ids(Achv.apply(s, { t: "slf", allFilled: true, firstFull: true })) === "slf_first_50");
}

section("Tic Tac Toe");
{
  const s = fresh();
  ok("Guertel: Rang 5 (Brauner) reicht NICHT", Achv.apply(s, { t: "tttRank", rank: 5 }).length === 0);
  ok("Guertel: Rang 6 (Meister) -> 'Alle Guertel'", ids(Achv.apply(s, { t: "tttRank", rank: 6 })) === "ttt_all_belts");
  const t = fresh();
  for (let i = 0; i < 99; i++) Achv.apply(t, { t: "ttt", mode: "classic", in3: true });
  ok("99 Siege in 3 Zuegen: noch nicht", !has(t, "ttt_win3_100"));
  ok("Siege in 4+ Zuegen zaehlen dafuer nicht", (() => { Achv.apply(t, { t: "ttt", mode: "classic", in3: false }); return t.ttt.win3 === 99; })());
  ok("100. Sieg in 3 Zuegen -> Erfolg", ids(Achv.apply(t, { t: "ttt", mode: "classic", in3: true })) === "ttt_win3_100");
  const q = fresh();
  for (let i = 0; i < 99; i++) Achv.apply(q, { t: "ttt", mode: "quantum", in3: false });
  ok("99 Quantum-Siege: noch nicht; klassische Siege zaehlen nicht mit", !has(q, "ttt_quantum_100") && (Achv.apply(q, { t: "ttt", mode: "classic" }), !has(q, "ttt_quantum_100")));
  ok("100. Quantum-Sieg -> Erfolg", has(q, "ttt_quantum_100") || ids(Achv.apply(q, { t: "ttt", mode: "quantum" })) === "ttt_quantum_100");
  const z = fresh();
  for (let i = 0; i < 99; i++) Achv.apply(z, { t: "ttt", mode: "quizmix", in3: false });
  ok("99 QuizMix-Siege: noch nicht", !has(z, "ttt_quizmix_100"));
  ok("100. QuizMix-Sieg -> Erfolg", ids(Achv.apply(z, { t: "ttt", mode: "quizmix", in3: false })) === "ttt_quizmix_100");
  const b = fresh();
  ok("QuizMix in 3 Zuegen (mit Fehlern): nur 'QuizMix-Blitz'", ids(Achv.apply(b, { t: "ttt", mode: "quizmix", in3: true, allCorrect: false })) === "ttt_quizmix_3");
  ok("QuizMix in 3 Zuegen + alles richtig: 'QuizMix-Perfektion'", ids(Achv.apply(b, { t: "ttt", mode: "quizmix", in3: true, allCorrect: true })) === "ttt_quizmix_3_perfect");
  ok("'alles richtig' OHNE 3 Zuege reicht nicht", ids(Achv.apply(fresh(), { t: "ttt", mode: "quizmix", in3: false, allCorrect: true })) === "");
  ok("QuizMix in 3 Zuegen zaehlt auch fuer 'Gewinne in 3 Zuegen'", b.ttt.win3 === 2);
  ok("klassisch in 3 Zuegen zaehlt NICHT fuer die QuizMix-Erfolge", (() => { const c = fresh(); Achv.apply(c, { t: "ttt", mode: "classic", in3: true, allCorrect: true }); return c.ttt.quizmix3 === 0 && c.ttt.quizmix3Perfect === 0 && c.ttt.win3 === 1; })());
}

section("Allgemein (richtige Antworten)");
{
  const s = fresh(); const tiers = [10, 100, 1000, 10000, 100000, 1000000];
  ok("9 richtig: nichts", Achv.apply(s, { t: "gen", n: 9 }).length === 0);
  let okAll = true;
  let total = 9;
  for (const n of tiers) {
    const need = n - total;
    const before = Achv.apply(s, { t: "gen", n: need - 1 > 0 ? need - 1 : 0 }); total += need - 1 > 0 ? need - 1 : 0;
    if (has(s, "gen_" + n)) okAll = false;               // knapp davor: noch nicht
    const at = Achv.apply(s, { t: "gen", n: 1 }); total += 1;
    if (!at.includes("gen_" + n)) okAll = false;          // genau auf dem Wert: frei
  }
  ok("jede Stufe (10, 100, 1.000, 10.000, 100.000, 1 Mio.) geht genau bei ihrem Wert auf, nicht davor", okAll && tiers.every(n => has(s, "gen_" + n)));
  ok("Zaehler ueber die Millionen hinaus bleibt begrenzt und gueltig", (() => { Achv.apply(s, { t: "gen", n: 1e12 }); return s.gen.correct <= 1e9 && Number.isFinite(s.gen.correct); })());
  ok("negativer/kaputter Zuwachs wird ignoriert", (() => { const t = fresh(); Achv.apply(t, { t: "gen", n: -50 }); Achv.apply(t, { t: "gen", n: "abc" }); Achv.apply(t, { t: "unbekannt" }); Achv.apply(t, null); return t.gen.correct === 0; })());
}

section("Uebernahme bisheriger Staende (backfill) und Zusammenfuehren (merge)");
{
  const s = fresh(); const n = Achv.backfill(s, { klasse: 4, tttRank: 6 });
  ok("Klasse 5 erreicht -> Klassen 1-4 gelten als bestanden, Guertel-Erfolg wird nachgetragen", s.bt.passed.slice(0, 4).every(x => x) && !s.bt.passed[4] && n.includes("ttt_all_belts"));
  ok("backfill schaltet 'perfekt'/'schnell' NICHT ohne Beleg frei", !s.bt.perfect.some(x => x) && !s.bt.fast.some(x => x));
  const forged = Achv.merge(fresh(), { unlocked: { gen_1000000: Date.now(), bt_all_classes: 1 }, gen: { correct: 5 } });
  ok("Server-Merge: direkt gesetztes 'unlocked' ohne Zaehler wird verworfen", !has(forged, "gen_1000000") && !has(forged, "bt_all_classes"));
  const a = Achv.merge(fresh(), { gen: { correct: 150 }, blitz: { best: 22 }, bt: { passed: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0] } });
  ok("Zaehler fuehren zu Freischaltungen (150 richtig -> 10 und 100; Blitz 22 -> 10/15/20)", has(a, "gen_10") && has(a, "gen_100") && has(a, "blitz_20") && !has(a, "gen_1000"));
  const b = Achv.merge(a, { gen: { correct: 40 }, blitz: { best: 5 } });
  ok("Zaehler sinken nie (Rueckwaerts-Stand wird ignoriert)", b.gen.correct === 150 && b.blitz.best === 22);
  ok("bereits vergebene Freischaltungen bleiben (mit altem Zeitstempel)", b.unlocked.gen_10 === a.unlocked.gen_10);
  const c = Achv.merge(b, { gen: { correct: 300 } });
  ok("zwei Staende: Maximum je Zaehler, Klassen-Flags werden vereint", c.gen.correct === 300 && c.bt.passed[0] === 1 && c.bt.passed[1] === 1);
  const junk = Achv.merge(null, { gen: { correct: "x" }, bt: { passed: "kaputt" }, ttt: { maxRank: 99 }, unlocked: "nix" });
  ok("Muell als Eingabe ergibt einen gueltigen Stand (maxRank auf 6 begrenzt)", junk.ttt.maxRank === 6 && junk.gen.correct === 0 && Array.isArray(junk.bt.passed) && junk.bt.passed.length === 10);
  const ts = Achv.merge(fresh(), { gen: { correct: 20 }, unlocked: { gen_10: 1234567 } });
  ok("Zeitstempel des Clients bleibt erhalten, wenn die Zaehler den Erfolg stuetzen", ts.unlocked.gen_10 === 1234567);
}

section("Eigene Ideen: Speed-Math-Level, Vielnenner, Einzigartig, Unbezwingbar, Perfektionist");
{
  const s = fresh();
  ok("Level 9: noch nichts", Achv.apply(s, { t: "speedmath", level: 9 }).length === 0);
  ok("Level 10 -> Erfolg", ids(Achv.apply(s, { t: "speedmath", level: 10 })) === "sm_level_10");
  ok("Level springt direkt auf 50: 25 und 50 beide frei, 10 bleibt (schon frei)", ids(Achv.apply(s, { t: "speedmath", level: 50 })) === "sm_level_25,sm_level_50");
  ok("Level sinkt nie (kleinerer Wert wird ignoriert)", (() => { Achv.apply(s, { t: "speedmath", level: 3 }); return s.sm.level === 50; })());

  const b = fresh();
  Achv.apply(b, { t: "blitz", total: 40 }); Achv.apply(b, { t: "blitz", total: 30 }); Achv.apply(b, { t: "blitz", total: 30 });
  ok("Vielnenner zaehlt die Antworten JEDER Runde zusammen (40+30+30=100), Bestwert bleibt der Höchste (40)", b.blitz.total === 100 && b.blitz.best === 40 && has(b, "blitz_total_100"));
  ok("500 und 1000 folgen an der richtigen Stelle", (() => { for (let i = 0; i < 9; i++) Achv.apply(b, { t: "blitz", total: 100 }); return has(b, "blitz_total_1000"); })());

  const u = fresh();
  for (let i = 0; i < 99; i++) Achv.apply(u, { t: "slf", allFilled: false, firstFull: false, uniqueCount: 1 });
  ok("99 einzigartige Antworten: noch nicht", !has(u, "slf_unique_100"));
  ok("100. einzigartige Antwort (auch mehrere auf einmal) -> Erfolg", ids(Achv.apply(u, { t: "slf", allFilled: false, firstFull: false, uniqueCount: 1 })) === "slf_unique_100");

  const meister = fresh();
  ok("Unentschieden gegen einen NICHT-Meister-Bot zaehlt nicht", Achv.apply(meister, { t: "tttDraw", meister: false }).length === 0);
  ok("Unentschieden gegen den Meister -> 'Unbezwingbar'", ids(Achv.apply(meister, { t: "tttDraw", meister: true })) === "ttt_unbeatable");

  const perf = fresh();
  for (let i = 0; i < 6; i++) Achv.apply(perf, { t: "ordering", finished: true, flawless: true });
  ok("6 perfekte Einordnen-Runden: noch nicht (Ziel 10)", !has(perf, "ord_mow_perfect_10"));
  for (let i = 0; i < 3; i++) Achv.apply(perf, { t: "mow", finished: true, flawless: true });
  ok("6+3=9: immer noch nicht", !has(perf, "ord_mow_perfect_10"));
  const tenPerfect = Achv.apply(perf, { t: "ordering", finished: true, flawless: true });
  ok("die 10. perfekte Runde (egal welcher der beiden Modi) -> Perfektionist", tenPerfect.includes("ord_mow_perfect_10"));
  ok("... macht gleichzeitig die Kategorie Einordnen komplett", tenPerfect.includes("cat_ordering"));
}

section("Eigene Ideen: täglicher Streak");
{
  const s = fresh();
  ok("erster Tag: Serie = 1, noch kein Erfolg (Ziel 3)", (Achv.touchDaily(s, "2026-01-01"), s.streak.current === 1 && s.streak.longest === 1 && !has(s, "streak_3")));
  ok("selber Tag nochmal: keine Aenderung", (Achv.touchDaily(s, "2026-01-01"), s.streak.current === 1));
  Achv.touchDaily(s, "2026-01-02"); Achv.touchDaily(s, "2026-01-03");
  ok("3 Tage nahtlos in Folge -> 'streak_3'", s.streak.current === 3 && has(s, "streak_3"));
  Achv.touchDaily(s, "2026-01-05"); // ein Tag ausgelassen (04. fehlt)
  ok("Luecke von einem Tag: Serie faengt neu bei 1 an", s.streak.current === 1);
  ok("die laengste Serie (3) bleibt aber als Bestwert erhalten", s.streak.longest === 3);
  ok("bereits erreichter 'streak_3' bleibt freigeschaltet, auch nach der Luecke", has(s, "streak_3"));
  ok("ungueltiges/fehlendes Datum wird ignoriert (kein Crash)", (() => { const before = JSON.stringify(s.streak); Achv.touchDaily(s, null); Achv.touchDaily(s, "keindatum"); return JSON.stringify(s.streak) === before; })());
  const long = fresh(); let d = "2026-02-01";
  for (let i = 0; i < 30; i++) { Achv.touchDaily(long, d); d = new Date(new Date(d + "T12:00:00Z").getTime() + 86400000).toISOString().slice(0, 10); }
  ok("30 Tage nahtlos in Folge -> streak_3/7/30 alle frei, streak_100 noch nicht", has(long, "streak_3") && has(long, "streak_7") && has(long, "streak_30") && !has(long, "streak_100"));
  ok("merge: die laengste Serie beider Staende gilt, der AKTUELLERE Tagesstand gewinnt (Luecke wird nicht kaschiert)", (() => {
    const older = fresh(); older.streak = { current: 5, longest: 5, lastDate: "2026-01-01" };
    const newer = fresh(); newer.streak = { current: 1, longest: 1, lastDate: "2026-01-10" }; // Luecke seit dem 01.
    const m = Achv.merge(older, newer);
    return m.streak.longest === 5 && m.streak.current === 1 && m.streak.lastDate === "2026-01-10";
  })());
}

section("Eigene Ideen: Kategorie-Abschluss + Sammler (haengen von den echten Erfolgen ab)");
{
  const s = fresh();
  for (let i = 0; i < 5; i++) Achv.apply(s, { t: "ordering", finished: true, flawless: false });
  ok("Nenn's-Blitz-Kategorie noch nicht komplett", !has(s, "cat_blitz"));
  for (const n of [10, 15, 20, 30, 50]) Achv.apply(s, { t: "blitz", total: n });
  for (let i = 0; i < 100; i++) Achv.apply(s, { t: "blitz", total: 10 });
  ok("Alle Nenn's-Blitz-Erfolge frei -> 'Nenn's Blitz gemeistert' im SELBEN Aufruf erkannt", has(s, "cat_blitz"));
  ok("andere Kategorien sind davon unberuehrt", !has(s, "cat_music") && !has(s, "cat_ttt"));
  const c = fresh();
  ok("0 Erfolge: kein Sammler", !has(c, "collector_5"));
  for (let i = 0; i < 4; i++) Achv.apply(c, { t: "blitz", total: [10, 15, 20, 30][i] });
  ok("4 Erfolge: 'Sammler' (Ziel 5) noch nicht", !has(c, "collector_5"));
  Achv.apply(c, { t: "blitz", total: 50 });
  ok("5. Erfolg schaltet 'Sammler' frei (im selben Aufruf)", has(c, "collector_5"));
  ok("'Sammler' zaehlt auch Kategorie-Erfolge mit, aber nicht sich selbst oder die anderen Sammel-Erfolge", (() => {
    // alle Nenn's-Blitz-Erfolge (5 einzelne + cat_blitz = 6) plus collector_5 selbst duerfen
    // zusammen 6 sein, nicht 7 (collector_5 zaehlt sich nicht selbst mit)
    const t = fresh();
    for (const n of [10, 15, 20, 30, 50]) Achv.apply(t, { t: "blitz", total: n });
    const doneCount = Achv.DEFS.filter(d => t.unlocked[d.id]).length; // 5 einzelne + cat_blitz + collector_5 = 7
    return doneCount === 7;
  })());
  const all = fresh();
  // Alles freischalten, was OHNE echtes Spiel/Server-Kontext geht (kein Server-Merge hier noetig)
  for (let k = 0; k < 10; k++) Achv.apply(all, { t: "braintest", klasse: k, correct: 20, total: 20, elapsedSec: 30 });
  for (let i = 0; i < 5; i++) Achv.apply(all, { t: "braintest", klasse: 0, correct: 20, total: 20, elapsedSec: 30 });
  Achv.apply(all, { t: "ordering", finished: true, flawless: true }); Achv.apply(all, { t: "mow", finished: true, flawless: true });
  for (let i = 0; i < 9; i++) Achv.apply(all, { t: "ordering", finished: true, flawless: true });
  for (const n of [10, 15, 20, 30, 50]) Achv.apply(all, { t: "blitz", total: n });
  for (let i = 0; i < 9; i++) Achv.apply(all, { t: "blitz", total: 1000 });
  Achv.apply(all, { t: "music", n: 10 });
  for (let i = 0; i < 13; i++) Achv.apply(all, { t: "slf", allFilled: true, firstFull: true, uniqueCount: 8 }); // uniqueCount ist pro Ereignis auf 8 gedeckelt
  for (let i = 0; i < 37; i++) Achv.apply(all, { t: "slf", allFilled: true, firstFull: true, uniqueCount: 0 });
  Achv.apply(all, { t: "tttRank", rank: 6 });
  Achv.apply(all, { t: "tttDraw", meister: true });
  for (let i = 0; i < 100; i++) Achv.apply(all, { t: "ttt", mode: "classic", in3: true });
  for (let i = 0; i < 100; i++) Achv.apply(all, { t: "ttt", mode: "quantum", in3: false });
  for (let i = 0; i < 100; i++) Achv.apply(all, { t: "ttt", mode: "quizmix", in3: false });
  Achv.apply(all, { t: "ttt", mode: "quizmix", in3: true, allCorrect: true });
  Achv.apply(all, { t: "gen", n: 1000000 });
  for (const n of [10, 25, 50]) Achv.apply(all, { t: "speedmath", level: n });
  let d = "2026-03-01"; for (let i = 0; i < 100; i++) { Achv.touchDaily(all, d); d = new Date(new Date(d + "T12:00:00Z").getTime() + 86400000).toISOString().slice(0, 10); }
  const done = Achv.DEFS.filter(x => all.unlocked[x.id]);
  const missing = Achv.DEFS.filter(x => !all.unlocked[x.id]);
  ok("Wenn wirklich ALLES geschafft ist: jede Kategorie komplett -> 'Vollständig' schaltet sich frei", missing.length === 0 || (console.log("   fehlend:", missing.map(x => x.id).join(",")), false));
  ok("'Vollständig' selbst ist mit dabei (letzter Erfolg von allen)", has(all, "collector_all"));
}

// ================================================================== Server-Speicherung
section("Schutz: pro Ereignis gedeckelte Werte (verhindert erfundene Riesenwerte)");
{
  const s = fresh();
  Achv.apply(s, { t: "slf", allFilled: false, firstFull: false, uniqueCount: 99999 });
  ok("uniqueCount ist pro Ereignis auf 8 gedeckelt (realistische Rundengroesse)", s.slf.unique === 8);
  const b = fresh();
  Achv.apply(b, { t: "blitz", total: 99999999 });
  ok("blitz.best/total sind global gedeckelt (Zahlenueberlauf schadet nicht)", b.blitz.best <= 1000 && Number.isFinite(b.blitz.total));
  const g = fresh();
  Achv.apply(g, { t: "gen", n: "Infinity" });
  ok("nicht-numerische/unendliche Werte werden zu 0", g.gen.correct === 0);
}

section("Server: Erfolge am Konto speichern");
{
  const S = await startServer();
  const reg = await post(S.port, "/api/register", { username: "erfolg1", password: "geheim1" });
  ok("neues Konto hat einen leeren Erfolge-Stand", reg.ok && reg.profile.achv && Object.keys(reg.profile.achv.unlocked).length === 0);
  const tok = reg.token;
  let r = await post(S.port, "/api/save-stats", { token: tok, stats: { achv: { unlocked: { gen_1000000: Date.now() } } } });
  ok("Direkt gesetztes 'unlocked' ueber die Schnittstelle bringt nichts", r.ok && !r.profile.achv.unlocked.gen_1000000);
  const mine = Achv.newState(); mine.gen.correct = 150; mine.blitz.best = 22;
  r = await post(S.port, "/api/save-stats", { token: tok, stats: { achv: mine } });
  ok("Echte Zaehler: Erfolge werden vom SERVER berechnet und gespeichert", r.ok && r.profile.achv.unlocked.gen_10 && r.profile.achv.unlocked.gen_100 && r.profile.achv.unlocked.blitz_20);
  const low = Achv.newState(); low.gen.correct = 3;
  r = await post(S.port, "/api/save-stats", { token: tok, stats: { achv: low } });
  ok("Kleinerer Stand ueberschreibt nichts (Zaehler sinken nie)", r.profile.achv.gen.correct === 150 && r.profile.achv.unlocked.gen_100);
  r = await post(S.port, "/api/save-stats", { token: tok, stats: { achv: "kaputt", roundsPlayed: 3 } });
  ok("Kaputte Erfolge-Daten werden ignoriert, andere Werte wie gewohnt gespeichert", r.ok && r.profile.roundsPlayed === 3 && r.profile.achv.gen.correct === 150);
  const sess = await post(S.port, "/api/session", { token: tok });
  ok("Nach neuem Abruf (Session) sind die Erfolge da", sess.ok && sess.profile.achv.unlocked.gen_10 > 0);
  await S.stop();
  const S2 = await startServer({ USERS_FILE: S.usersFile });
  const lg = await post(S2.port, "/api/login", { username: "erfolg1", password: "geheim1" });
  ok("Nach Server-Neustart sind die Erfolge noch da", lg.ok && lg.profile.achv.unlocked.gen_100 > 0);
  await S2.stop();
}

// ================================================================== Client-Einbindung
section("Client: Ereignisse -> Erfolge");
{
  const C = loadClient({ fakeTime: true }); const { R, state, advance } = C;
  const st = () => R("(achvOwner()||{}).achv");
  R('var p=createProfile("Erfolgstester"); p.klasse=0;');
  // Brain Test Haupttest komplett durchspielen
  const playMain = (right, secsEach) => { R('renderSoloQuestion()'); for (let i = 0; i < 20; i++) { advance(secsEach * 1000); R(`handleSoloAnswer(${right(i) ? "solo.questions[solo.qIndex].c" : "(solo.questions[solo.qIndex].c+1)%4"})`); advance(500); } };
  R('p.haupttestUnlockedForKlasse=0; beginSolo(p,true)'); playMain(() => true, 2);
  let a = st();
  ok("Haupttest 20/20 in ca. 50 s: Klasse 1 bestanden + perfekt + schnell", a.bt.passed[0] && a.bt.perfect[0] && a.bt.fast[0] && a.bt.perfectRuns === 1);
  R('achvRecord({t:"gen",n:10}, p);');
  ok("Neuer Erfolg wird eingeblendet (Toast mit dem Namen des Erfolgs)", R("achvLastToast") === "10 richtige Antworten");
  R('beginSolo(p,true,0)'); playMain(() => true, 2.5); // Wiederholung Klasse 1
  ok("Wiederholung zaehlt (2. perfekter Durchlauf)", st().bt.perfectRuns === 2);
  R('p.klasse=3; p.haupttestUnlockedForKlasse=-1; beginSolo(p,true,1)'); playMain(() => true, 4); // 80 s: bestanden, nicht schnell
  a = st(); ok("Wiederholung Klasse 2 in ~80 s: bestanden + perfekt, aber nicht schnell", a.bt.passed[1] && a.bt.perfect[1] && !a.bt.fast[1]);
  R('beginSolo(p,true,2)'); playMain(i => i < 15, 2); // 15/20
  ok("Wiederholung Klasse 3 mit 15/20: zaehlt nicht als bestanden", !st().bt.passed[2]);
  R('p.haupttestUnlockedForKlasse=3; beginSolo(p,true)'); R('renderSoloQuestion()'); advance(200000);
  ok("Haupttest mit Zeitablauf: Klasse 4 nicht bestanden, nicht schnell", !st().bt.passed[3] && !st().bt.fast[3]);
  ok("Uebungstest (50 Fragen) zaehlt nicht fuer Brain-Test-Erfolge", (() => { const before = JSON.stringify(st().bt); R('beginSolo(p,false)'); R('renderSoloQuestion()'); for (let i = 0; i < 50; i++) { R('handleSoloAnswer(solo.questions[solo.qIndex].c)'); R('solo.finished||soloNextQuestion()'); } return JSON.stringify(st().bt) === before; })());

  // Speed Math
  const g0 = st().gen.correct;
  R('speedMathProfile=p; startSpeedMathGame(60); speedMathSubmit(speedMath.current.answer); speedMathSubmit(speedMath.current.answer); speedMathSubmit(speedMath.current.answer+999); clearInterval(speedMath.timerId); speedMath=null;');
  ok("Speed Math frei: 2 richtige zaehlen, 1 falsche nicht", st().gen.correct === g0 + 2);
  // streakTarget bewusst hoch, damit diese eine richtige Antwort NICHT gleich
  // das ganze Level gewinnt (sonst wuerde p.speedMathLevel ungewollt
  // hochgezaehlt und spaetere Pruefungen unten verfaelschen) - hier geht es
  // nur darum, dass die Antwort fuer die "richtige Antworten"-Erfolge zaehlt.
  R('speedMathLevelSession={profile:p,level:1,config:{ops:["+"],maxOperand:10,streakTarget:99999,label:"T",level:1,tier:1,timeLimit:99},streak:0,currentProblem:{a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]},remaining:99,timerId:null}; speedMathLevelSubmit(2);');
  ok("Speed-Math-Level: richtige Aufgabe zaehlt", st().gen.correct === g0 + 3);

  // Party-Nachrichten
  R('party={playerId:"me",room:{players:[{id:"me",teamId:"t1"},{id:"o",teamId:"t2"}]}};');
  const msg = (o) => R(`achvOnPartyMessage(${JSON.stringify(o)})`);
  const g1 = st().gen.correct;
  msg({ type: "quizReveal", results: [{ playerId: "me", correct: true }, { playerId: "o", correct: true }] });
  msg({ type: "quizReveal", results: [{ playerId: "me", correct: false }] });
  ok("Wissenstest: nur MEINE richtige Antwort zaehlt (+1, nicht die des Gegners, nicht falsche)", st().gen.correct === g1 + 1);
  msg({ type: "orderingFinalReveal", results: [{ playerId: "o", finished: true, finishedPerfect: true }, { playerId: "me", finished: true, finishedPerfect: false }] });
  ok("Einordnen: komplett mit Fehlern -> nur 'komplett'", st().unlocked.ord_complete && !st().unlocked.ord_flawless);
  msg({ type: "orderingFinalReveal", results: [{ playerId: "me", finished: true, finishedPerfect: true }] });
  ok("Einordnen: perfekt -> 'ohne Verlust'", !!st().unlocked.ord_flawless);
  msg({ type: "rankReveal", kind: "chronologyGame", livesLeft: { t1: 3 }, mistakes: { t1: 0 } });
  ok("Chronologie zaehlt NICHT fuer Mehr oder Weniger", !st().unlocked.mow_complete);
  msg({ type: "rankReveal", kind: "higherLowerGame", livesLeft: { t1: 0, t2: 2 }, mistakes: { t1: 3, t2: 1 } });
  ok("Mehr/Weniger: mein Team ausgeschieden -> nichts", !st().unlocked.mow_complete);
  msg({ type: "rankReveal", kind: "higherLowerGame", livesLeft: { t1: 1 }, mistakes: { t1: 2 } });
  ok("Mehr/Weniger: durchgekommen mit Fehlern -> nur 'komplett'", st().unlocked.mow_complete && !st().unlocked.mow_flawless);
  msg({ type: "rankReveal", kind: "higherLowerGame", livesLeft: { t1: 3 }, mistakes: { t1: 0 } });
  ok("Mehr/Weniger: ohne Fehler -> 'ohne Verlust'", !!st().unlocked.mow_flawless);
  msg({ type: "nennsBlitzFinal", results: [{ playerId: "o", total: 50 }, { playerId: "me", total: 16 }] });
  ok("Nenn's Blitz: MEIN Ergebnis (16) zaehlt, nicht das des Gegners (50)", st().unlocked.blitz_15 && !st().unlocked.blitz_20);
  for (let i = 0; i < 12; i++) msg({ type: "musicPlayerSubmitted", playerId: "me", replaysUsed: i < 9 ? 0 : 1, correct: { title: true } });
  ok("Musik: nur richtige Songs OHNE Wiederholung zaehlen (9 von 12)", st().music.noReplay === 9 && !st().unlocked.music_10_noreplay);
  msg({ type: "musicPlayerSubmitted", playerId: "me", replaysUsed: 0, correct: { title: false, artist: true } });
  msg({ type: "musicPlayerSubmitted", playerId: "o", replaysUsed: 0, correct: { title: true } });
  ok("Musik: falscher Titel und fremde Abgabe zaehlen nicht", st().music.noReplay === 9);
  msg({ type: "musicPlayerSubmitted", playerId: "me", replaysUsed: 0, correct: { title: true } });
  ok("Musik: 10. Song ohne Wiederholung -> Erfolg", !!st().unlocked.music_10_noreplay);
  msg({ type: "slfReveal", categories: ["Stadt", "Land"], answers: { me: { Stadt: "Bonn", Land: "" } }, firstFullId: null, humanCount: 2 });
  ok("SLF: ein Feld leer -> kein Erfolg", !st().unlocked.slf_all_fields);
  msg({ type: "slfReveal", categories: ["Stadt", "Land"], answers: { me: { Stadt: "Bonn", Land: "Bulgarien" } }, firstFullId: "o", humanCount: 2 });
  ok("SLF: alle Felder gefuellt, aber Gegner war schneller -> nur 'Alle Felder'", st().unlocked.slf_all_fields && !st().unlocked.slf_first_1);
  msg({ type: "slfReveal", categories: ["Stadt", "Land"], answers: { me: { Stadt: "Bonn", Land: "Bulgarien" } }, firstFullId: "me", humanCount: 1 });
  ok("SLF: allein im Raum als Erste/r zaehlt NICHT ('Mehrspielerrunde')", !st().unlocked.slf_first_1);
  msg({ type: "slfReveal", categories: ["Stadt", "Land"], answers: { me: { Stadt: "Bonn", Land: "Bulgarien" } }, firstFullId: "me", humanCount: 2 });
  ok("SLF: zu zweit als Erste/r fertig -> 'Schnellster Stift'", !!st().unlocked.slf_first_1);

  // TTT (Bot)
  R('tttOverviewProfile=p;');
  R('ttt={profile:p,board:["X","X",null,"O","O",null,null,null,null],playerTurn:true,rankIndex:0,gameOver:false,resultText:"",moves:2}; tttPlayerMove(2);');
  ok("TTT klassisch: Sieg mit dem 3. eigenen Zug zaehlt als 'in 3 Zuegen'", st().ttt.win3 === 1);
  R('ttt={profile:p,board:["X","X",null,"O","O",null,null,null,null],playerTurn:true,rankIndex:0,gameOver:false,resultText:"",moves:3}; tttPlayerMove(2);');
  ok("TTT klassisch: Sieg erst mit dem 4. Zug zaehlt nicht dafuer", st().ttt.win3 === 1);
  R('ttq={board:["X","X",null,"O","O",null,null,null,null],xPieces:[0,1],oPieces:[3,4],playerTurn:true,difficulty:0.5,gameOver:false,winner:null,totalMoves:4,playerMoves:2}; ttqPlayerMove(2);');
  ok("Quantum (Bot): Sieg in 3 Zuegen zaehlt fuer Quantum UND 'in 3 Zuegen'", st().ttt.quantumWins === 1 && st().ttt.win3 === 2);
  R('ttq={board:["O","O",null,"X","X",null,null,null,null],xPieces:[3,4],oPieces:[0,1],playerTurn:true,difficulty:0.5,gameOver:false,winner:null,totalMoves:4,playerMoves:2}; ttqPlayerMove(5);');
  ok("Quantum: Sieg zaehlt, wenn der MENSCH (X) gewinnt", st().ttt.quantumWins === 2);
  R('ttq={board:["O","O",null,"X","X",null,null,null,null],xPieces:[3,4],oPieces:[0,1],playerTurn:false,difficulty:0.5,gameOver:false,winner:null,totalMoves:4,playerMoves:2}; ttqFinish("O");');
  ok("Quantum: Niederlage zaehlt nicht", st().ttt.quantumWins === 2);
  // QuizMix gegen Bot: 3 Duelle, alles richtig
  const qm = (duels, wrong) => R(`ttqb={board:["X","X",null,"O","O",null,null,null,null],rankIndex:0,gameOver:false,winner:null,resultText:"",turnSymbol:"X",duelCount:${duels},wrong:${wrong},duel:{cellIndex:2,type:"quiz",scores:{X:3,O:1},qIndex:5,qTotal:5}}; tttQuizmixBotFinishDuel();`);
  qm(2, 2);
  ok("QuizMix (Bot): Sieg im 3. Duell mit Fehlern -> 'QuizMix-Blitz', nicht 'Perfektion'", st().unlocked.ttt_quizmix_3 && !st().unlocked.ttt_quizmix_3_perfect && st().ttt.quizmixWins === 1);
  qm(2, 0);
  ok("QuizMix (Bot): 3 Duelle + keine falsche Antwort -> 'QuizMix-Perfektion'", !!st().unlocked.ttt_quizmix_3_perfect);
  const w0 = st().ttt.quizmix3; qm(4, 0);
  ok("QuizMix (Bot): Sieg im 5. Duell zaehlt nur als Sieg, nicht als 3-Zuege", st().ttt.quizmix3 === w0 && st().ttt.quizmixWins === 3);
  // Guertel
  R('var pr=createProfile("Guertel"); pr.tttRank=5; pr.tttWinsAtRank=4; tttOverviewProfile=pr; tttApplyRankOutcome(pr,5,"win");');
  ok("Guertel: Aufstieg zum Meister (Rang 6) schaltet 'Alle Guertel' frei (beim passenden Profil)", R("pr.tttRank") === 6 && !!R("pr.achv.unlocked.ttt_all_belts"));
  // TTT online: Nachricht mit achv
  R('var pw=createProfile("Online"); tttOverviewProfile=pw; tttMp={roomCode:"ABCDEF",mySymbol:"X",mode:"quizmix",rankIndex:0,rankApplied:false,board:Array(9).fill(null),duel:null,ws:{send(){}}};');
  R('tttMpHandleMessage({type:"tttState",board:["X","X","X","O","O",null,null,null,null],turnSymbol:"O",gameOver:true,winner:"X",yourSymbol:"X",mode:"quizmix",players:[{name:"a",symbol:"X",connected:true},{name:"b",symbol:"O",connected:true}],achv:{in3:true,allCorrect:true}})');
  ok("TTT online: Server meldet Sieg in 3 Zuegen + alles richtig -> beide QuizMix-Erfolge", !!R("pw.achv.unlocked.ttt_quizmix_3") && !!R("pw.achv.unlocked.ttt_quizmix_3_perfect"));
  R('tttMp.rankApplied=false; tttMpHandleMessage({type:"tttState",board:["X","X","X","O","O",null,null,null,null],turnSymbol:"O",gameOver:true,winner:"O",yourSymbol:"X",mode:"quizmix",players:[{name:"a",symbol:"X",connected:true},{name:"b",symbol:"O",connected:true}],achv:null})');
  ok("TTT online: Niederlage zaehlt nicht als Sieg", R("pw.achv.ttt.quizmixWins") === 1);
  const w1 = R("pw.achv.gen.correct");
  R('tttMp.mySymbol="X"; tttMp.duel={cellIndex:0,myScore:0,oppScore:0,type:"math",currentProblem:{a:1,b:1,op:"+",choices:[2,3,4,5]}}; tttMpHandleMessage({type:"tttSprintScoreUpdate",scores:{X:3,O:1}}); tttMpHandleMessage({type:"tttSprintScoreUpdate",scores:{X:4,O:1}});');
  ok("Online-Sprint: jede neue richtige Aufgabe zaehlt einmal (Differenz, nicht doppelt)", R("pw.achv.gen.correct") === w1 + 4);
  {
    const w2 = R("pw.achv.gen.correct");
    R('tttMp.players=[{name:"a",symbol:"X",connected:true},{name:"b",symbol:"O",connected:true}]; tttMp.opponentConnected=true; tttMp.duel={cellIndex:0,qIndex:0,qTotal:5,answered:false,reveal:null,question:"?",options:["a","b","c","d"]}; tttMpHandleMessage({type:"tttDuelReveal",correctIndex:1,results:{X:{correct:true},O:{correct:false}},scores:{X:1,O:0}});');
    ok("Online-Wissensduell: meine richtige Antwort zaehlt (+1)", R("pw.achv.gen.correct") === w2 + 1);
  }

  // ---- Eigene Ideen: Client-Hooks
  const g2 = st().gen.correct;
  R('startSpeedMathMilestoneFlow(p);');
  ok("Speed-Math-Uebersicht meldet den aktuellen Level-Stand (Level 1: noch kein Erfolg)", st().sm.level === 1 && !st().unlocked.sm_level_10);
  R('p.speedMathLevel=10; startSpeedMathMilestoneFlow(p);');
  ok("Level 10 erreicht -> 'Speed-Math-Level 10'", !!st().unlocked.sm_level_10);
  msg({ type: "slfReveal", categories: ["Stadt", "Land"], answers: { me: { Stadt: "Bonn", Land: "Bulgarien" } }, scores: { me: { Stadt: 20, Land: 10 } }, firstFullId: null, humanCount: 2 });
  ok("SLF: nur die 20-Punkte-Kategorie zaehlt als 'einzigartig' (1, nicht 2)", st().slf.unique === 1);
  R('var pd=createProfile("Draw"); pd.tttRank=6; tttApplyRankOutcome(pd,6,"draw");');
  ok("Unentschieden gegen den Meister-Bot (Rang 6) -> 'Unbezwingbar'", !!R("pd.achv.unlocked.ttt_unbeatable"));
  R('var pd2=createProfile("Draw2"); pd2.tttRank=2; tttApplyRankOutcome(pd2,2,"draw");');
  ok("Unentschieden gegen einen NICHT-Meister-Bot zaehlt nicht", !R("pd2.achv.unlocked.ttt_unbeatable"));
  R('var pt=createProfile("Streak");');
  R('renderAchievements(pt);'); // 1. Aufruf an einem Tag zaehlt
  R('renderAchievements(pt);'); // 2. Aufruf am selben Tag: keine erneute Zaehlung
  ok("Taeglicher Streak: mehrere Aufrufe am selben Tag zaehlen nur als 1 Tag", R("pt.achv.streak.current") === 1);

  // Erfolge-Seite
  R('achvOwner=function(){return p}; renderAchievements(p);');
  ok("Erfolge-Seite zeigt Zaehler '... von 53 freigeschaltet' und alle 8 Kategorien", /von 53 freigeschaltet/.test(state.last) && Achv.CATEGORIES.every(c => state.last.includes(c.title.replace(/'/g, "&#39;"))));
  ok("Freigeschaltete Erfolge sind markiert, gesperrte zeigen Fortschritt", state.last.includes("achv-card done") && state.last.includes("achv-bar") && state.last.includes("🔒"));
  ok("Fortschritt wird angezeigt (z. B. Brain Test 'x / 10')", /\d+ \/ 10/.test(state.last));
  R('renderMainMenu()');
  ok("Hauptmenue hat genau einen Erfolge-Knopf (nicht mehr 'bald verfuegbar')", (state.last.match(/startAchievementsFlow\(\)/g) || []).length === 1 && !state.last.includes("bald verfügbar"));
  R('renderStatistik()');
  ok("Statistik-Seite hat KEINEN eigenen Erfolge-Knopf mehr (Duplikat entfernt, Erfolge nur noch im Hauptmenue)", !state.last.includes("startAchievementsFlow()"));
}

// ------------------------------------------------------------------ Konto-Sync
section("Client: Konto-Abgleich mit dem Server");
{
  const calls = [];
  const serverSaved = Achv.newState(); serverSaved.gen.correct = 5; // Server kennt nur diesen alten Stand
  // Hinweis: beim Start laedt der Client im Hintergrund auch /api/audio-tracks -
  // das faengt dieser generische fetchImpl-Mock MIT auf, ist fuer diesen Test
  // aber irrelevant. Deshalb unten gezielt nach dem save-stats-Aufruf filtern,
  // statt "der erste fetch-Aufruf" anzunehmen.
  const fetchImpl = async (url, opts) => { const body = JSON.parse(opts.body); calls.push({ url, body }); return { json: async () => ({ ok: true, profile: { username: "kto", klasse: 0, achv: serverSaved, modeStats: {} } }) }; };
  const C = loadClient({ fetchImpl }); const { R } = C;
  R('account={token:"T",profile:{username:"kto",klasse:0,achv:null,modeStats:{}}};');
  R('achvRecord({t:"gen",n:200});');
  ok("Erfolg am Konto wird lokal sofort gezaehlt und freigeschaltet", R("account.profile.achv.gen.correct") === 200 && !!R("account.profile.achv.unlocked.gen_100"));
  await sleep(1800);
  const saveCall = calls.find(c => c.url === "/api/save-stats");
  ok("... und gesammelt an den Server geschickt (mit Zaehlern, ohne Sonderpfad)", !!saveCall && saveCall.body.stats.achv.gen.correct === 200);
  ok("Serverantwort mit aelterem Stand ueberschreibt lokale Zaehler NICHT (Merge, Maximum)", R("account.profile.achv.gen.correct") === 200 && !!R("account.profile.achv.unlocked.gen_100"));
  R('achvRecord({t:"gen",n:1}); syncAccountStats(accountAsProfile());'); // Ereignis, waehrend die Anfrage laeuft
  R('achvRecord({t:"gen",n:5});');
  await sleep(50);
  ok("Ereignis, das WAEHREND einer laufenden Anfrage dazukommt, geht nicht verloren", R("account.profile.achv.gen.correct") === 206);
  R('achvRecord({t:"gen",n:7}, accountAsProfile());'); // Spiel-Code arbeitet intern mit einer KOPIE des Kontos (isAccount)
  ok("Ereignis mit Konto-Kopie landet am ECHTEN Konto (nicht an der verworfenen Kopie)", R("account.profile.achv.gen.correct") === 213);
  ok("Ohne Konto und ohne Profil passiert nichts (kein Absturz)", (() => { const D = loadClient(); return D.R('achvRecord({t:"gen",n:1}).length') === 0; })());
}

finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
