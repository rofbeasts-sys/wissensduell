/* Antwortreihenfolge der Wissensfragen: die Original-Datensaetze waren NICHT
 * zufaellig sortiert (richtige Antwort lag beim allgemeinen Pool zu ~65% auf
 * Feld 2, bei Klasse 10 zu ~98% auf Feld 1) - wird jetzt bei jeder Ausgabe
 * neu gemischt. Dieser Test prueft die Mischfunktion selbst sowie alle
 * bestaetigten Ausgabestellen auf eine echt gleichmaessige Verteilung. */
const { ok, section, finish, startServer, post, wsConnect, loadClient, fs, path } = require("./helpers");

function dist(counts, total) { return [0, 1, 2, 3].map(i => ((counts[i] || 0) / (total || 1) * 100).toFixed(1) + "%").join(" / "); }
function evenEnough(counts, total, minSamples = 20, lo = 0.10, hi = 0.40) { return total >= minSamples && [0, 1, 2, 3].every(i => (counts[i] || 0) / total >= lo && (counts[i] || 0) / total <= hi); }

(async () => {
  section("Mischfunktion selbst (server- und clientseitig identisch)");
  {
    const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const vm = require("vm");
    function extractFn(name) {
      const start = src.indexOf("function " + name + "(");
      let i = src.indexOf("{", start), depth = 0;
      for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}") { depth--; if (!depth) break; } }
      return src.slice(start, i + 1);
    }
    const sb = { console, Math };
    vm.createContext(sb);
    vm.runInContext(extractFn("shuffleAnswerOrder"), sb);

    let allCorrect = true, allComplete = true;
    for (let i = 0; i < 2000; i++) {
      const orig = { q: "F", a: ["W1", "W2", "RICHTIG", "W3"], c: 2, cat: "x", e: "y" };
      const shuffled = vm.runInContext(`shuffleAnswerOrder(${JSON.stringify(orig)})`, sb);
      if (shuffled.a[shuffled.c] !== "RICHTIG") allCorrect = false;
      if (new Set(shuffled.a).size !== 4) allComplete = false;
    }
    ok("2000x gemischt: die richtige Antwort bleibt korrekt zugeordnet", allCorrect);
    ok("... und alle 4 Optionen bleiben erhalten (keine verloren/verdoppelt)", allComplete);

    const other = { q: "Frage?", a: ["A", "B", "C", "D"], c: 0, cat: "Geografie", e: "Erklärung" };
    const r = vm.runInContext(`shuffleAnswerOrder(${JSON.stringify(other)})`, sb);
    ok("Frage-Text, Kategorie, Erklärung bleiben unangetastet", r.q === "Frage?" && r.cat === "Geografie" && r.e === "Erklärung");

    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) {
      const q = vm.runInContext(`shuffleAnswerOrder(${JSON.stringify({ a: ["1", "2", "3", "4"], c: 1 })})`, sb);
      counts[q.c]++;
    }
    ok("4000 Ziehungen (Ausgangswert immer Feld 2): jetzt echt gleichmäßig verteilt, " + dist(counts, 4000), evenEnough(counts, 4000, 1));
  }

  section("Server: alle vier Ausgabestellen nutzen die Mischfunktion (Code-Beleg)");
  {
    const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const uses = (src.match(/shuffleAnswerOrder/g) || []).length;
    ok("shuffleAnswerOrder wird 1x definiert + an 4 Stellen genutzt (randomQuizQuestions, TTT-Online-Duell, Party-Quiz, Arena-Quiz)", uses === 5);
  }

  section("Live-Test: Bot-Quizfragen über /api/random-quiz-questions (vorher 65% auf Feld 2)");
  {
    const S = await startServer();
    const counts = [0, 0, 0, 0]; let total = 0;
    for (let i = 0; i < 40; i++) {
      const r = await post(S.port, "/api/random-quiz-questions", { count: 10 });
      (r.questions || []).forEach(q => { counts[q.c]++; total++; });
    }
    ok("Bot-Quizfragen (n=" + total + "): " + dist(counts, total) + " - deutlich gleichmäßiger als die ursprünglichen 65%/1%", evenEnough(counts, total));
    await S.stop();
  }

  section("Live-Test: Party-Raum-Wissenstest (Antwort löst sofortige Auflösung aus)");
  {
    const S = await startServer();
    const counts = [0, 0, 0, 0]; let total = 0;
    for (let round = 0; round < 30; round++) {
      const h = await wsConnect(S.port);
      // Zwischen Rundenstart und der ersten Frage liegt eine spuerbare Pause -
      // Listener werden schon von wsConnect() von Anfang an mitgeschnitten
      // (h.parsed sammelt alles seit dem Verbindungsaufbau), daher reicht
      // hier ein Warten via h.find() ohne Race Condition.
      h.send({ action: "createRoom", name: "H", language: "de", gameMode: "mixed" });
      await new Promise(r => setTimeout(r, 200));
      h.send({ action: "setRoundMode", mode: "custom" });
      for (let idx = 0; idx < 5; idx++) h.send({ action: "setRoundDef", index: idx, defId: "quiz" });
      await new Promise(r => setTimeout(r, 100));
      h.send({ action: "startGame" });
      let waited = 0;
      while (!h.find("quizQuestion") && waited < 4000) { await new Promise(r => setTimeout(r, 100)); waited += 100; }
      if (h.find("quizQuestion")) {
        h.send({ action: "quizAnswer", selectedIndex: 0 });
        waited = 0;
        while (!h.find("quizReveal") && waited < 3000) { await new Promise(r => setTimeout(r, 100)); waited += 100; }
        const reveal = h.find("quizReveal");
        if (reveal && typeof reveal.correctIndex === "number") { counts[reveal.correctIndex]++; total++; }
      }
      h.s.destroy();
      await new Promise(r => setTimeout(r, 30));
    }
    // Bei nur 30 Stichproben schwankt ein GENUIN gleichverteiltes Ergebnis
    // rein zufaellig staerker als bei den groesseren Stichproben oben (bei
    // echten 25% je Feld liegt die normale Streuung bei n=30 zwischen ca.
    // 3% und 45%) - daher hier bewusst weitere Grenzen als bei den 400er-
    // Stichproben, um nicht durch reines Zufallsrauschen fehlzuschlagen.
    // Der eigentliche Fehler (65%/1%) wuerde diese Grenzen trotzdem klar reissen.
    ok("Party-Raum-Quiz (n=" + total + "): " + dist(counts, total), evenEnough(counts, total, 20, 0.03, 0.45));
    await S.stop();
  }

  section("Client: Brain Test (Übungs- und Haupttest, inkl. Klasse 10 - vorher 98% auf Feld 1)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T");');
    const counts1 = [0, 0, 0, 0]; let n1 = 0;
    for (let klasse = 0; klasse < 10; klasse++) {
      R(`pickKlasseTestQuestions(${klasse})`).forEach(q => { counts1[q.c]++; n1++; });
    }
    ok("Übungsfragen, alle 10 Klassen (n=" + n1 + "): " + dist(counts1, n1), evenEnough(counts1, n1));

    const counts2 = [0, 0, 0, 0]; let n2 = 0;
    for (let i = 0; i < 20; i++) {
      R("pickKlasseHaupttestQuestions(9)").forEach(q => { counts2[q.c]++; n2++; });
    }
    ok("Haupttest Klasse 10, 20 Ziehungen (n=" + n2 + "): " + dist(counts2, n2) + " (vorher 98% auf einem Feld)", evenEnough(counts2, n2));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
