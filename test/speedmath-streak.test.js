/* Speed-Math-Meilenstein auf Wunsch umgebaut: statt Punkte + Kontrollpunkt
 * alle 5 Fragen jetzt eine einfache, durchgehende Serie ohne eine einzige
 * falsche Antwort (wie beim Brain Test) - jeder Fehler setzt die Serie
 * zurueck und kostet sofort ein Herz. */
const { ok, section, finish, loadClient } = require("./helpers");

(async () => {
  section("Level-Konfiguration: Serienziel statt Punkteziel");
  {
    const C = loadClient(); const { R } = C;
    const cfg = (l) => R(`speedMathLevelConfig(${l})`);
    ok("Level 1: Serienziel 10, kein pointsNeeded mehr im Objekt", cfg(1).streakTarget === 10 && cfg(1).pointsNeeded === undefined);
    ok("Serienziel wächst mit dem Level (Level 1 < Level 25 < Level 50)", cfg(1).streakTarget < cfg(25).streakTarget && cfg(25).streakTarget < cfg(50).streakTarget);
    ok("Bei 'Level 15' liegt das Ziel bei ungefähr 20 (Beispielwert aus der Anfrage)", cfg(15).streakTarget >= 18 && cfg(15).streakTarget <= 22);
    ok("Level 50 ist auf 40 gedeckelt", cfg(50).streakTarget === 40);
    ok("Schwierigkeit (Rechenarten/Zahlenbereich) unverändert wie zuvor", cfg(1).ops.join() === "+,-" && cfg(6).ops.includes("×") && cfg(11).ops.length === 4);
  }

  section("Levelbestehen: Serie ohne Fehler, jeder Fehler kostet ein Herz und setzt zurück");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.speedMathHearts=3;');
    R('speedMathLevelSession = { profile:p, level:1, config:{ops:["+"],maxOperand:10,streakTarget:5,label:"Test",level:1,tier:1}, streak:0, currentProblem:{a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]} };');
    for (let i = 0; i < 3; i++) {
      R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]};');
      R('speedMathLevelSubmit(2);');
    }
    ok("3 richtige in Folge: Serie=3, noch kein Herzverlust", R('speedMathLevelSession.streak') === 3 && R('p.speedMathHearts') === 3);
    R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]};');
    R('speedMathLevelSubmit(9);'); // falsch
    ok("Eine falsche Antwort: Serie zurück auf 0 UND ein Herz weg", R('speedMathLevelSession.streak') === 0 && R('p.speedMathHearts') === 2);

    // Danach direkt weiter versuchbar (kein Rauswurf ins Menü bei einem einzelnen Fehler)
    ok("Nach dem Fehler läuft die Session normal weiter (kein Rauswurf)", R('speedMathLevelSession') !== null);
    R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]};');
    R('speedMathLevelSubmit(2);');
    ok("Direkt danach wieder normal weiterspielbar", R('speedMathLevelSession.streak') === 1);
  }

  section("Level bestanden, sobald die Zielserie ohne Unterbrechung erreicht ist");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.speedMathLevel=1;');
    R('speedMathLevelSession = { profile:p, level:1, config:{ops:["+"],maxOperand:10,streakTarget:5,label:"Test",level:1,tier:1}, streak:0, currentProblem:{a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]} };');
    for (let i = 0; i < 4; i++) {
      R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]};');
      R('speedMathLevelSubmit(2);');
    }
    ok("Nach 4 von 5: Level noch nicht bestanden", R('p.speedMathLevel') === 1);
    R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]};');
    R('speedMathLevelSubmit(2);'); // 5. richtige in Folge
    ok("5. richtige in Folge (= Zielserie): Level besteht sofort, steigt auf Level 2", R('p.speedMathLevel') === 2);
    ok("Ergebnisbildschirm zeigt die erreichte Serie und das Ziel", state.last.includes("GESCHAFFT") && /Erreichte Serie \(Ziel: 5\)/.test(state.last));
  }

  section("Ein einziger Fehler MITTEN in einer langen Serie unterbricht sie korrekt (kein 'fast bestanden zählt auch')");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.speedMathLevel=1; p.speedMathHearts=3;');
    R('speedMathLevelSession = { profile:p, level:1, config:{ops:["+"],maxOperand:10,streakTarget:5,label:"Test",level:1,tier:1}, streak:0, currentProblem:{a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]} };');
    for (let i = 0; i < 4; i++) { R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]};'); R('speedMathLevelSubmit(2);'); }
    R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]};');
    R('speedMathLevelSubmit(999);'); // Fehler direkt VOR dem Ziel
    ok("Fehler unmittelbar vor dem Ziel zählt NICHT als bestanden, Level bleibt 1", R('p.speedMathLevel') === 1 && R('speedMathLevelSession.streak') === 0);
  }

  section("0 Herzen beendet die Session (für heute Schluss)");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.speedMathHearts=1;');
    R('speedMathLevelSession = { profile:p, level:3, config:{ops:["+"],maxOperand:10,streakTarget:5,label:"Test",level:3,tier:1}, streak:2, currentProblem:{a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]} };');
    R('speedMathLevelSubmit(999);'); // letzter Fehler, Herzen auf 0
    ok("0 Herzen: Session beendet, kein Levelaufstieg", R('speedMathLevelSession') === null && R('p.speedMathLevel') !== 4);
    ok("Bildschirm zeigt 'KEINE HERZEN MEHR'", state.last.includes("KEINE HERZEN MEHR"));
  }

  section("Erfolge (Speed-Math-Level-Erfolge) funktionieren mit dem neuen System weiterhin");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); p.speedMathLevel=9;');
    R('speedMathLevelSession = { profile:p, level:9, config:{ops:["+"],maxOperand:10,streakTarget:2,label:"Test",level:9,tier:2}, streak:0, currentProblem:{a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]} };');
    R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]}; speedMathLevelSubmit(2);');
    R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]}; speedMathLevelSubmit(2);'); // Level 9 -> 10 bestanden
    ok("Level 10 erreicht: Erfolg 'Speed-Math-Level 10' schaltet sich frei", !!R('p.achv.unlocked.sm_level_10'));
  }

  section("Anzeige: keine Reste des alten Punktesystems mehr auf den Bildschirmen");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T");');
    R('startSpeedMathMilestoneFlow(p);');
    ok("Übersichtsseite nennt das Serienziel, keine 'Punkte' mehr", state.last.includes("in Folge ohne einen Fehler") && !state.last.includes("Punkte"));
    R('startSpeedMathLevel();');
    ok("Levelbildschirm zeigt 'Serie: x / Ziel', keine Punkte-Fortschrittsanzeige mehr", /Serie: \d+ \/ \d+/.test(state.last) && !state.last.includes("Punkte"));
  }

  section("Bereits behobener Klick-Bug (onclick-Scoping) bleibt nach dem Umbau weiterhin funktionsfähig");
  {
    const C = loadClient(); const { R } = C;
    function realClick(fnName) {
      const html = R('document.getElementById("app").innerHTML');
      const marker = 'onclick="' + fnName + '(';
      const start = html.indexOf(marker);
      if (start === -1) throw new Error("Button nicht gefunden: " + fnName);
      const attrStart = start + 'onclick="'.length;
      R(html.slice(attrStart, html.indexOf('"', attrStart)));
    }
    R('var p=createProfile("T"); startSpeedMathFlow();');
    realClick("startSpeedMathMilestoneFlow");
    realClick("startSpeedMathLevel");
    ok("Echter Klickpfad (globaler Scope) funktioniert weiterhin nach dem Umbau", R('speedMathLevelSession') !== null);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
