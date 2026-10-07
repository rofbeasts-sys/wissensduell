/* Auf Wunsch: Haupttest-Bestehensgrenze von 80% (16/20) auf 90% (18/20)
 * angehoben. Punktestand je Klasse wird jetzt gespeichert und per Klassen-
 * Detailbildschirm (antippbare Zeile in der Übersicht) angezeigt. Pro
 * Klasse maximal 3 Versuche am selben Tag je Testart - werden alle 3 ohne
 * Bestehen verbraucht, greift eine gezielte Sperre statt eines einfachen
 * "morgen nochmal": Haupttest 3x nicht bestanden -> Übungstest muss mit
 * neuen Fragen erneut bestanden werden. Übungstest 3x nicht bestanden ->
 * Abstieg: der Haupttest der VORHERIGEN Klasse muss erneut bestanden
 * werden. Klasse 1 kann nicht tiefer absteigen. */
const { ok, section, finish, loadClient } = require("./helpers");

function finishRound(R, correct, wrong) {
  R(`solo.correct = ${correct}; solo.wrong = ${wrong}; solo.qIndex = solo.questions.length; endSoloRound();`);
}

(async () => {
  section("Haupttest-Bestehensgrenze: jetzt 90% (18/20), nicht mehr 80% (16/20)");
  {
    const C = loadClient(); const { R } = C;
    ok("BRAINTEST_MAIN_PCT ist 0.9", R("BRAINTEST_MAIN_PCT") === 0.9);
    ok("mainNeeded für jede Klasse ist 18", R("KLASSE_TESTS.every(t => t.mainNeeded === 18)"));

    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p, true);');
    finishRound(R, 17, 3);
    ok("17/20 reicht NICHT mehr (früher hätte das mit 80% bestanden)", R("p.klasse") === 0);

    R('var p2=createProfile("T2"); p2.klasse=0; p2.haupttestUnlockedForKlasse=0; beginSolo(p2, true);');
    finishRound(R, 18, 2);
    ok("18/20 besteht", R("p2.klasse") === 1);
  }

  section("Punktestand je Klasse wird gespeichert (Übungstest und Haupttest getrennt)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0; beginSolo(p, false);');
    finishRound(R, 47, 3);
    ok("Übungstest-Punktestand gespeichert (47/50)", JSON.stringify(R("p.braintestScores[0].practice")) === JSON.stringify({ correct: 47, total: 50 }));
    R('beginSolo(p, true);');
    finishRound(R, 19, 1);
    ok("Haupttest-Punktestand gespeichert (19/20)", R("p.braintestScores[0].main.correct") === 19 && R("p.braintestScores[0].main.total") === 20);
  }

  section("Tagesversuche: 3 Haupttest-Fehlversuche sperren den Haupttest (needPractice)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0;');
    for (let i = 0; i < 3; i++) { R('beginSolo(p, true);'); finishRound(R, 10, 10); }
    ok("Nach 3 Fehlversuchen: Sperre 'needPractice' aktiv", JSON.stringify(R("p.braintestGate")) === JSON.stringify({ klasse: 0, type: "needPractice" }));
    ok("mainAttempts steht auf 3", R("p.braintestDaily.mainAttempts") === 3);
    R('beginSolo(p, true);');
    ok("4. Versuch wird abgewiesen (kein Haupttest gestartet)", R("solo.isHaupttest") === false);
  }

  section("Sperre 'needPractice' löst sich durch einen bestandenen Übungstest auf, Haupttest-Versuche werden zurückgesetzt");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0;');
    for (let i = 0; i < 3; i++) { R('beginSolo(p, true);'); finishRound(R, 10, 10); }
    R('beginSolo(p, false);');
    finishRound(R, 48, 2);
    ok("Sperre ist weg", R("p.braintestGate") === null);
    ok("Haupttest-Tagesversuche zurückgesetzt (0)", R("p.braintestDaily.mainAttempts") === 0);
    ok("Haupttest ist wieder freigeschaltet", R("p.haupttestUnlockedForKlasse") === 0);
  }

  section("Tagesversuche: 3 Übungstest-Fehlversuche einer höheren Klasse lösen Abstieg aus (needPriorMain)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=1; p.haupttestUnlockedForKlasse=-1; p.braintestScores={0:{main:{correct:18,total:20}}};');
    for (let i = 0; i < 3; i++) { R('beginSolo(p, false);'); finishRound(R, 20, 30); }
    ok("Sperre 'needPriorMain' für Klasse 2 (Index 1) aktiv", JSON.stringify(R("p.braintestGate")) === JSON.stringify({ klasse: 1, type: "needPriorMain" }));
    ok("Das 3. (letzte) solo bleibt als 'finished' stehen", R("solo.finished") === true);
    R('beginSolo(p, false);');
    // Wuerde beginSolo trotz Sperre eine neue Runde starten, waere "solo"
    // ein frisches Objekt mit finished:false - bleibt es stattdessen das
    // ALTE, bereits beendete Objekt, wurde der Aufruf korrekt abgewiesen.
    ok("4. Versuch wird abgewiesen (kein frisches solo-Objekt, 'finished' bleibt true)", R("solo.finished") === true);
  }

  section("Klasse 1 kann nicht tiefer absteigen - 3 Übungstest-Fehlversuche bleiben ohne Sperre");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0;');
    for (let i = 0; i < 3; i++) { R('beginSolo(p, false);'); finishRound(R, 5, 45); }
    ok("Keine Sperre für Klasse 1 (kann nicht tiefer absteigen)", !R("p.braintestGate"));
    R('beginSolo(p, false);');
    ok("Ein weiterer Versuch ist trotzdem ganz normal möglich", R("solo.questions.length") === 50);
  }

  section("Sperre 'needPriorMain' löst sich durch einen bestandenen Haupttest der VORHERIGEN Klasse");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=1; p.haupttestUnlockedForKlasse=-1; p.braintestScores={0:{main:{correct:18,total:20}}};');
    for (let i = 0; i < 3; i++) { R('beginSolo(p, false);'); finishRound(R, 20, 30); }
    R('beginSolo(p, true, 0);'); // Klasse 1 (Index 0) Haupttest wiederholen
    ok("Das ist eine Wiederholung von Klasse 1", R("solo.isRepeat") === true && R("solo.startTier") === 0);
    finishRound(R, 19, 1);
    ok("Sperre für Klasse 2 ist weg", R("p.braintestGate") === null);
    ok("Übungstest-Tagesversuche für Klasse 2 zurückgesetzt (0)", R("p.braintestDaily.practiceAttempts") === 0);
    ok("Klasse des Profils bleibt unverändert (nur eine Wiederholung, kein echter Aufstieg)", R("p.klasse") === 1);
  }

  section("Eine NICHT bestandene Wiederholung der vorherigen Klasse löst die Sperre NICHT auf");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=1; p.haupttestUnlockedForKlasse=-1; p.braintestScores={0:{main:{correct:18,total:20}}};');
    for (let i = 0; i < 3; i++) { R('beginSolo(p, false);'); finishRound(R, 20, 30); }
    R('beginSolo(p, true, 0);');
    finishRound(R, 5, 15); // bewusst durchfallen
    ok("Sperre bleibt weiterhin aktiv", JSON.stringify(R("p.braintestGate")) === JSON.stringify({ klasse: 1, type: "needPriorMain" }));
  }

  section("Sicherheitsnetz in beginSolo: direkter Aufruf trotz Sperre wird abgewiesen, kein Crash");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; p.braintestGate={klasse:0,type:"needPractice"};');
    R('beginSolo(p, true);');
    ok("Haupttest wird trotz Freischaltung abgewiesen, wenn 'needPractice' aktiv ist", R("solo.isHaupttest") === false);
  }

  section("Klassen-Detailbildschirm: Punktestand korrekt angezeigt, inkl. Sperr-Hinweis");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      var p=createProfile("T"); p.klasse=1; p.haupttestUnlockedForKlasse=-1;
      p.braintestGate = {klasse:1, type:"needPriorMain"};
      p.braintestScores = {0:{main:{correct:19,total:20}}, 1:{practice:{correct:20,total:50}}};
      klassenOverviewProfile = p;
      renderBrainTestClassModal(1);
    `);
    const html = state.last;
    ok("Zeigt den Übungstest-Punktestand der gesperrten Klasse (20 / 50)", html.includes("20 / 50"));
    ok("Zeigt den Sperr-Hinweis", html.includes("zuerst den Haupttest von Klasse 1 erneut bestehen"));
    ok("Bietet den passenden Knopf an, Klasse 1 zu wiederholen", html.includes("Haupttest Klasse 1") && html.includes("wiederholen"));
    ok("Bietet KEINEN Übungstest-Wiederholen-Knopf an (erst die Sperre lösen)", !html.includes("Übungstest wiederholen"));
  }

  section("Übersicht selbst zeigt bei Sperre ebenfalls den passenden Hinweis/Knopf statt des normalen Weiter-Knopfs");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      var p=createProfile("T"); p.klasse=1; p.haupttestUnlockedForKlasse=-1;
      p.braintestGate = {klasse:1, type:"needPriorMain"};
      renderKlassenOverview(p);
    `);
    const html = state.last;
    ok("Zeigt den Sperr-Hinweis direkt in der Übersicht (jetzt als Antipp-Aufforderung, kein eigener Knopf mehr nötig)", html.includes("Tippe auf Klasse 1 oben, um die Sperre aufzuheben"));
    ok("Zeigt ein Schloss-Symbol bei der gesperrten aktuellen Klasse", html.includes("🔒"));
  }

  section("Wiederholung einer bereits bestandenen Klasse (normaler Review-Fall, keine Sperre) aktualisiert den Punktestand, rührt aber Klasse/Freischaltung nicht an");
  {
    const C = loadClient(); const { R } = C;
    R(`
      var p=createProfile("T"); p.klasse=3; p.haupttestUnlockedForKlasse=-1;
      p.braintestScores = {0:{main:{correct:18,total:20}}};
      beginSolo(p, true, 0);
    `);
    finishRound(R, 20, 0);
    ok("Punktestand aktualisiert (20/20)", R("p.braintestScores[0].main.correct") === 20 && R("p.braintestScores[0].main.total") === 20);
    ok("Klasse bleibt unverändert (3)", R("p.klasse") === 3);
    ok("Übungstest-Wiederholung einer alten Klasse funktioniert ebenso", (() => {
      R('beginSolo(p, false, 0);');
      return R("solo.startTier") === 0 && R("solo.isRepeat") === true && R("solo.questions.length") === 50;
    })());
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
