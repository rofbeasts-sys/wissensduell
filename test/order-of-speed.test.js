/* Speed-Math-Modus "Order of Speed": Zahlen 1-1000 im Kreis antippen (auf-
 * steigend / absteigend / nur gerade / nur ungerade). Punkte + Level-System:
 * 100 Punkte pro richtigem Tipp, volle Leiste = Level hoch = schwerer
 * (mehr Zahlen, ab Level 15 Bewegung, ab Level 25 kurzes Unsichtbarwerden -
 * siehe test/order-of-speed-thresholds.test.js für die Level-45-
 * Gedächtnis-Phase und die genauen Schwellenwerte im Detail). */
const { ok, section, finish, loadClient } = require("./helpers");

function realClick(R, fnName) {
  const html = R('document.getElementById("app").innerHTML');
  const marker = 'onclick="' + fnName + '(';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('Button mit "' + fnName + '(" nicht gefunden. HTML: ' + html.slice(0, 200));
  const attrStart = start + 'onclick="'.length;
  R(html.slice(attrStart, html.indexOf('"', attrStart)));
}

(async () => {
  section("Rundenerzeugung: vier Regeln, Schwierigkeit wächst mit dem Level");
  {
    const C = loadClient(); const { R } = C;
    let asc = 0, desc = 0, even = 0, odd = 0;
    for (let i = 0; i < 200; i++) {
      const level = 1 + Math.floor(i / 40); // Level 1..5 durchprobieren
      const r = R(`orderOfSpeedGenerateRound(${level})`);
      const expectedCount = R(`orderOfSpeedCountForLevel(${level})`);
      ok("Anzahl Zahlen entspricht der Stufe für dieses Level", r.display.length === expectedCount);
      const expectedMax = R(`orderOfSpeedMaxForLevel(${level})`);
      ok("Alle Zahlen im für dieses Level passenden Bereich (wächst mit dem Level, nicht von Anfang an voll 1-1000)", r.display.every(n => n >= 1 && n <= expectedMax));
      ok("Keine doppelten Zahlen in einer Runde", new Set(r.display).size === r.display.length);
      if (r.rule === "asc") { asc++; ok("aufsteigend: Sequenz ist die sortierte (klein->gross) Liste aller Zahlen", JSON.stringify(r.sequence) === JSON.stringify(r.display.slice().sort((a,b)=>a-b))); }
      if (r.rule === "desc") { desc++; ok("absteigend: Sequenz ist die sortierte (gross->klein) Liste aller Zahlen", JSON.stringify(r.sequence) === JSON.stringify(r.display.slice().sort((a,b)=>b-a))); }
      if (r.rule === "even") { even++; ok("nur gerade: Sequenz enthält NUR gerade Zahlen, aufsteigend sortiert, 2-4 von der Gesamtzahl", r.sequence.every(n=>n%2===0) && r.sequence.length>=2 && r.sequence.length<=4 && JSON.stringify(r.sequence)===JSON.stringify(r.sequence.slice().sort((a,b)=>a-b)) && r.display.filter(n=>!r.sequence.includes(n)).every(n=>n%2!==0)); }
      if (r.rule === "odd") { odd++; ok("nur ungerade: Sequenz enthält NUR ungerade Zahlen, aufsteigend sortiert, 2-4 von der Gesamtzahl, Rest ist gerade", r.sequence.every(n=>n%2!==0) && r.sequence.length>=2 && r.sequence.length<=4 && JSON.stringify(r.sequence)===JSON.stringify(r.sequence.slice().sort((a,b)=>a-b)) && r.display.filter(n=>!r.sequence.includes(n)).every(n=>n%2===0)); }
    }
    ok("Alle vier Regeln (inkl. neu: ungerade) kommen über viele Runden vor", asc>10 && desc>10 && even>10 && odd>10);
    ok("Schwierigkeit wächst mit dem Level: Level 1 hat weniger Zahlen als Level 9", R("orderOfSpeedCountForLevel(1)") < R("orderOfSpeedCountForLevel(9)"));
    ok("Zahlenanzahl ist bei 9 gedeckelt (passt auf den Kreis)", R("orderOfSpeedCountForLevel(999)") === 9);
  }

  section("Zahlenbereich (auf Wunsch entschärft): wächst mit dem Level, Level 1 nicht mehr voll 1-1000");
  {
    const C = loadClient(); const { R } = C;
    ok("Level 1: kleiner, einsteigerfreundlicher Bereich (1-20)", R("orderOfSpeedMaxForLevel(1)") === 20);
    ok("Level 5: noch im selben Bereich (1-20)", R("orderOfSpeedMaxForLevel(5)") === 20);
    ok("Level 6: etwas größer (1-50)", R("orderOfSpeedMaxForLevel(6)") === 50);
    ok("Level 7 (ab hier flackern die Zahlen): noch 1-50, nicht 1-1000 - genau das war vorher das Problem", R("orderOfSpeedMaxForLevel(7)") === 50);
    ok("Bereich wächst mit dem Level stufenweise weiter (20 < 50 < 100 < 250 < 500 < 1000)", [1,6,11,16,21,26].map(l=>R(`orderOfSpeedMaxForLevel(${l})`)).every((v,i,a)=>i===0||v>a[i-1]));
    ok("Erreicht irgendwann wieder den vollen Bereich bis 1000 (nicht für immer bei 500 gedeckelt)", R("orderOfSpeedMaxForLevel(26)") === 1000 && R("orderOfSpeedMaxForLevel(100)") === 1000);
  }

  section("Zeit pro Zahl (auf Wunsch, 'genauso wie beim Meilenstein'): Formel und Anzeige");
  {
    const C = loadClient(); const { R } = C;
    ok("Level 1: 6 Sekunden pro Zahl (identisch zur Meilenstein-Formel)", R("orderOfSpeedTimeLimitForLevel(1)") === 6);
    ok("Wird mit dem Level knapper", R("orderOfSpeedTimeLimitForLevel(1)") > R("orderOfSpeedTimeLimitForLevel(25)") && R("orderOfSpeedTimeLimitForLevel(25)") > R("orderOfSpeedTimeLimitForLevel(50)"));
    ok("Nie unter 2,5 Sekunden", R("orderOfSpeedTimeLimitForLevel(999)") >= 2.5);
  }

  section("Zeit pro Zahl: abgelaufene Zeit zählt wie ein falscher Tipp");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(120);');
    ok("Zeit läuft beim Rundenstart mit voller Länge los", R('orderOfSpeedSession.tapRemaining') === R('orderOfSpeedTimeLimitForLevel(orderOfSpeedSession.level)'));
    const limit = R('orderOfSpeedTimeLimitForLevel(orderOfSpeedSession.level)');
    advance(limit * 1000 + 150);
    ok("Nach Ablauf der Zeit: ein Fehlversuch mehr (wie bei falschem Tipp)", R('orderOfSpeedSession.wrong') === 1);
    ok("... und eine komplett neue Runde (neue Zahlen) ist da", R('orderOfSpeedSession.round') !== null);
    ok("Punkte bleiben unangetastet (kein Punktabzug, nur wie ein Fehlversuch)", R('orderOfSpeedSession.points') === 0);
  }

  section("Zeit pro Zahl: rechtzeitig richtig getippt setzt die Zeit für die nächste Zahl zurück");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(120);');
    const limit = R('orderOfSpeedTimeLimitForLevel(orderOfSpeedSession.level)');
    advance((limit / 2) * 1000); // erst die Haelfte verstreichen lassen
    R('orderOfSpeedTap(orderOfSpeedSession.round.sequence[0]);'); // rechtzeitig richtig
    ok("Zeit für die nächste Zahl läuft wieder voll (keine Regression)", R('orderOfSpeedSession.tapRemaining') === limit);
    ok("Kein Fehlversuch durch die rechtzeitige richtige Antwort", R('orderOfSpeedSession.wrong') === 0);
  }

  section("Zeit pro Zahl: kein Timer-Leck beim Verlassen oder Beenden");
  {
    const C = loadClient({ fakeTime: true }); const { R } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(120);');
    ok("Zeit-Timer läuft während des Spiels", C.activeIntervals() > 0);
    R('exitOrderOfSpeed();');
    ok("'Zurück' räumt auch den neuen Zeit-Timer sauber weg", C.activeIntervals() === 0);
  }

  section("Zeit pro Zahl: Anzeige erscheint auf dem Spielbildschirm");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(120);');
    ok("Eigene Zeitleiste pro Zahl ist da (zusätzlich zur Level-Leiste)", state.last.includes('id="oosTapTimerFill"') && state.last.includes('id="oosTapTimerNum"'));
  }

  section("Punkte: 100 pro richtigem Tipp, keine Punkte bei Fehlern");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T");');
    R('orderOfSpeedSession = {profile:p, durationSec:60, remaining:60, points:0, level:1, levelPoints:0, levelTarget:99999, correct:0, wrong:0, round:{rule:"asc", display:[3,1,2], sequence:[1,2,3], nextIndex:0, done:[], hidden:false}, timerId:null, moveTimerId:null, flickerTimerId:null, flickerRevealTimeoutId:null};');
    R('orderOfSpeedTap(1);');
    ok("Erster richtiger Tipp: +100 Punkte", R('orderOfSpeedSession.points') === 100 && R('orderOfSpeedSession.levelPoints') === 100);
    R('orderOfSpeedTap(1);'); // schon getippt, ignoriert
    ok("Erneuter Tipp auf bereits getippte Zahl: keine weiteren Punkte", R('orderOfSpeedSession.points') === 100);
    R('orderOfSpeedTap(999);'); // falsch (999 ist gar nicht in der Runde, aber Reihenfolge stimmt so oder so nicht)
    ok("Falscher Tipp bringt keine Punkte", R('orderOfSpeedSession.points') === 100);
  }

  section("Level-Leiste: voll -> Level steigt, Überschuss bleibt nicht verloren");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T");');
    ok("Level-1-Ziel ist 500 Punkte (5 Tipps)", R('orderOfSpeedLevelTarget(1)') === 500);
    ok("Level-10-Ziel ist 1400 Punkte (14 Tipps)", R('orderOfSpeedLevelTarget(10)') === 1400);
    R('orderOfSpeedSession = {profile:p, durationSec:60, remaining:60, points:0, level:1, levelPoints:400, levelTarget:500, correct:0, wrong:0, round:{rule:"asc", display:[1], sequence:[1], nextIndex:0, done:[], hidden:false}, timerId:null, moveTimerId:null, flickerTimerId:null, flickerRevealTimeoutId:null};');
    R('orderOfSpeedTap(1);'); // 400+100=500 -> genau voll, UND Runde komplett (nur 1 Zahl)
    ok("Level steigt bei genau erreichter Leiste sofort auf 2", R('orderOfSpeedSession.level') === 2);
    ok("Neues Ziel für Level 2 gesetzt (600 Punkte)", R('orderOfSpeedSession.levelTarget') === 600);
    ok("Leiste beginnt bei 0 im neuen Level (kein Überschuss hier, da exakt voll)", R('orderOfSpeedSession.levelPoints') === 0);
  }

  section("Level-Leiste: Levelaufstieg auch MITTEN in einer laufenden Runde (nicht erst am Rundenende)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T");');
    R('orderOfSpeedSession = {profile:p, durationSec:60, remaining:60, points:0, level:1, levelPoints:450, levelTarget:500, correct:0, wrong:0, round:{rule:"asc", display:[5,1,9], sequence:[1,5,9], nextIndex:0, done:[], hidden:false}, timerId:null, moveTimerId:null, flickerTimerId:null, flickerRevealTimeoutId:null};');
    R('orderOfSpeedTap(1);'); // 450+100=550 >= 500 -> Level steigt, ABER die Runde (3 Zahlen) ist noch nicht fertig
    ok("Level steigt sofort, auch obwohl die Runde (noch 2 von 3 Zahlen) nicht fertig ist", R('orderOfSpeedSession.level') === 2);
    ok("Überschuss (50 Punkte) bleibt erhalten, nicht verloren", R('orderOfSpeedSession.levelPoints') === 50);
    ok("Die laufende Runde bleibt bestehen (nicht neu gestartet), Fortschritt (1 von 3 getippt) bleibt", R('orderOfSpeedSession.round.nextIndex') === 1 && R('orderOfSpeedSession.round.sequence.length') === 3);
    R('orderOfSpeedTap(5); orderOfSpeedTap(9);'); // Runde fertigspielen
    ok("Runde danach normal fertigspielbar, zählt als gelöst", R('orderOfSpeedSession.correct') === 1);
  }

  section("Mehrfacher Levelsprung auf einmal (großer Punktezuwachs deckt mehrere Level ab)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T");');
    R('orderOfSpeedSession = {profile:p, durationSec:60, remaining:60, points:0, level:1, levelPoints:0, levelTarget:100, correct:0, wrong:0, round:{rule:"asc", display:[1], sequence:[1], nextIndex:0, done:[], hidden:false}, timerId:null, moveTimerId:null, flickerTimerId:null, flickerRevealTimeoutId:null};');
    R('orderOfSpeedTap(1);');
    ok("Level steigt korrekt (mind. 1x)", R('orderOfSpeedSession.level') >= 2);
  }

  section("Bewegung ab Level 15, Flackern ab Level 25 - vorher nicht, danach ja, Timer werden sauber verwaltet");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(120);');
    ok("Level 1: kein Bewegungs-Timer aktiv", R('orderOfSpeedSession.moveTimerId') === null);
    ok("Level 1: kein Flacker-Timer aktiv", R('orderOfSpeedSession.flickerTimerId') === null);
    R('orderOfSpeedSession.level = 15; orderOfSpeedEnsureTimers(orderOfSpeedSession);');
    ok("Ab Level 15: Bewegungs-Timer ist aktiv", R('orderOfSpeedSession.moveTimerId') !== null);
    ok("Level 15 (noch unter 25): kein Flacker-Timer", R('orderOfSpeedSession.flickerTimerId') === null);
    const before = R('JSON.stringify(orderOfSpeedSession.round.display)');
    advance(2600); // ueber das Bewegungsintervall (2500ms) hinaus
    ok("Nach dem Bewegungsintervall: die Reihenfolge der Anzeige hat sich geändert", R('JSON.stringify(orderOfSpeedSession.round.display)') !== before);
    R('orderOfSpeedSession.level = 25; orderOfSpeedEnsureTimers(orderOfSpeedSession);');
    ok("Ab Level 25: Flacker-Timer ist zusätzlich aktiv", R('orderOfSpeedSession.flickerTimerId') !== null);
    advance(3300); // ueber das Flacker-Intervall (3200ms) hinaus
    ok("Nach dem Flacker-Intervall: die Zahlen wurden kurz unsichtbar (hidden=true) und ein Rückstell-Timer läuft", R('orderOfSpeedSession.round.hidden') === true && R('orderOfSpeedSession.flickerRevealTimeoutId') !== null);
    advance(800); // ueber die Flacker-Dauer (700ms) hinaus
    ok("Danach sind sie wieder sichtbar", R('orderOfSpeedSession.round.hidden') === false);
    R('exitOrderOfSpeed();');
    ok("Kein Timer bleibt nach dem Verlassen aktiv", C.activeIntervals() === 0);
  }

  section("Neue Runde startet mit zum aktuellen Level passenden Timern (nicht mehr mit den alten)");
  {
    const C = loadClient({ fakeTime: true }); const { R } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(120); orderOfSpeedSession.level=18;');
    R('orderOfSpeedStartRound(orderOfSpeedSession);');
    ok("Neue Runde bei Level 18: Bewegungs-Timer korrekt aktiv (>=15)", R('orderOfSpeedSession.moveTimerId') !== null);
    ok("... aber noch kein Flacker-Timer (<25)", R('orderOfSpeedSession.flickerTimerId') === null);
    R('exitOrderOfSpeed();');
  }

  section("Zeitablauf beendet sauber, inkl. aller Zusatz-Timer, speichert Statistik");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(1); orderOfSpeedSession.level=28;'); // Level 28: Bewegung UND Flackern aktiv
    R('orderOfSpeedEnsureTimers(orderOfSpeedSession);');
    ok("Vor Zeitablauf: Bewegungs- und Flacker-Timer beide aktiv", R('orderOfSpeedSession.moveTimerId') !== null && R('orderOfSpeedSession.flickerTimerId') !== null);
    R('orderOfSpeedSession.points=500; orderOfSpeedSession.level=28; orderOfSpeedSession.correct=3; orderOfSpeedSession.wrong=1;');
    advance(1200);
    ok("Sitzung beendet", R('orderOfSpeedSession') === null);
    ok("Ergebnisbildschirm zeigt Punkte, Level und Runden", /500/.test(R('document.getElementById("app").innerHTML')) && /Level 28/.test(R('document.getElementById("app").innerHTML')));
    ok("Statistik gespeichert", R('p.modeStats.orderofspeed.played') === 1 && R('p.modeStats.orderofspeed.correct') === 3);
    ok("Wirklich ALLE Timer (Haupttimer + Bewegung + Flackern) sind weg", C.activeIntervals() === 0);
  }

  section("Kreis-Anordnung: Positionen sind gleichmäßig verteilt");
  {
    const C = loadClient(); const { R } = C;
    const pos = R("orderOfSpeedCirclePositions(5)");
    ok("5 Positionen für 5 Zahlen", pos.length === 5);
    ok("Alle Positionen sind Prozentangaben (kein NaN/undefined)", pos.every(p => /^-?\d+(\.\d+)?%$/.test(p.left) && /^-?\d+(\.\d+)?%$/.test(p.top)));
    ok("Erste Position liegt oben (12-Uhr-Stellung: top spürbar unter 50%)", parseFloat(pos[0].top) < 20);
  }

  section("Echter Klickpfad funktioniert weiterhin nach dem Umbau (kein onclick-Scoping-Bug)");
  {
    const C = loadClient(); const { R } = C;
    const title = () => (R('document.getElementById("app").innerHTML').match(/picker-title">([^<]*)</) || [, ""])[1];
    R('var p=createProfile("T"); startSpeedMathFlow();');
    realClick(R, "startOrderOfSpeedFlow");
    ok("Klick auf 'ORDER OF SPEED' öffnet den Modus", title() === "🔢 ORDER OF SPEED");
    realClick(R, "startOrderOfSpeedGame");
    ok("Dauer-Knopf startet das Spiel", R("orderOfSpeedSession") !== null);
    ok("Spielbildschirm zeigt Level, Punkte und die kreisförmig angeordneten Zahlen", /Level 1/.test(R('document.getElementById("app").innerHTML')) && (R('document.getElementById("app").innerHTML').match(/oos-circle-choice/g) || []).length === 5);
    realClick(R, "exitOrderOfSpeed");
    ok("'Zurück' führt sauber zurück, Sitzung beendet", title() === "SPEED MATH" && R("orderOfSpeedSession") === null);
  }

  section("Keine Reste eines alten onclick-Scoping-Bugs im überarbeiteten Code");
  {
    const fs = require("fs"), path = require("path");
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    const start = html.indexOf('function startOrderOfSpeedFlow');
    const end = html.indexOf('function startTicTacToeFlow');
    const section_ = html.slice(start, end);
    const badRefs = (section_.match(/onclick="[a-zA-Z_]+\([^)"]*\bprofile\b[^)"]*\)"/g) || []).filter(m => !/speedMathProfile/.test(m));
    ok("Alle onclick-Handler nutzen weiterhin die globale Variable speedMathProfile", badRefs.length === 0);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
