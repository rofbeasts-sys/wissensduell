/* Client-Logik ohne Browser (public/index.html in einer Sandbox) */
const { ok, section, finish, loadClient } = require("./helpers");

// ------------------------------------------------------------------ XSS
section("XSS: fremder Text wird entschaerft");
{
  const C = loadClient(); const { R, state } = C;
  const PAY = ['<img src=x onerror=alert(document.cookie)>', '<script>alert(1)</script>', '" onfocus="alert(1)" autofocus="', "'><svg onload=alert(1)>"];
  const live = (h) => /<img src=x|<script>alert|<svg onload|" onfocus="alert/.test(h);
  R('party={playerId:"me",isHost:true,room:{teams:[{id:"t1",name:"Team A"}],players:[]}}');
  let allSafe = true;
  for (const P of PAY) {
    const J = JSON.stringify(P);
    R(`renderNennsBlitzReveal({label:${J},players:[{id:"me",name:${J}},{id:"o",name:${J}}],answers:{me:[{id:"a1",text:${J}}],o:[{id:"a2",text:${J}}]}})`); if (live(state.last)) allSafe = false;
    R(`renderSlfReveal({letter:"B",categories:[${J}],players:[{id:"me",name:${J}},{id:"o",name:${J}}],answers:{me:{[${J}]:${J}},o:{[${J}]:${J}}},scores:{me:{[${J}]:20},o:{[${J}]:0}}})`); if (live(state.last)) allSafe = false;
    R(`renderSlfAnswering({letter:"B",categories:[${J}],label:${J},remainingMs:30000,hurry:false})`); if (live(state.last)) allSafe = false;
  }
  ok("Namen/Antworten/Kategorien in Nenn's Blitz + Stadt Land Fluss: kein aktiver Code (4 Angriffsmuster, inkl. Attribut)", allSafe);
  R(`renderNennsBlitzReveal({label:"L",players:[{id:"me",name:"Ben & Jerry's"}],answers:{me:[{id:"a1",text:"5 < 7 & \\"ok\\""}]}})`);
  ok("Normale Sonderzeichen bleiben lesbar", state.last.includes("Ben &amp; Jerry&#39;s") && state.last.includes("5 &lt; 7 &amp; &quot;ok&quot;"));
  ok("esc(null)/esc(undefined) crashen nicht", R('esc(null)+esc(undefined)') === "");
}

// ------------------------------------------------------------------ Speed Math
section("Speed Math: Antwort-Kreise, Level-System, Sprint");
{
  const C = loadClient(); const { R, state } = C;
  let good = true;
  for (let i = 0; i < 3000; i++) {
    const p = R(i % 2 ? "speedMathGenerateProblem()" : "speedMathGenerateLevelProblem(speedMathLevelConfig(1+(Math.random()*49|0)))");
    const c = p.choices;
    const calc = p.op === "+" ? p.a + p.b : p.op === "-" ? p.a - p.b : p.op === "×" ? p.a * p.b : p.a / p.b;
    if (calc !== p.answer || c.length !== 4 || new Set(c).size !== 4 || !c.includes(p.answer) || c.some(v => v < 0 || !Number.isInteger(v))) { good = false; break; }
  }
  ok("3000 Aufgaben: rechnerisch korrekt, immer 4 verschiedene nicht-negative Kreise inkl. richtiger Antwort", good);
  R('var p=createProfile("SM"); speedMathProfile=p; startSpeedMathGame(60);');
  ok("Freier Modus: 4 Kreise, kein Eingabefeld", (state.last.match(/class="sm-choice"/g) || []).length === 4 && !state.last.includes("<input"));
  R('speedMathSubmit(speedMath.current.answer)'); R('speedMathSubmit(speedMath.current.answer+999)');
  ok("Richtig/falsch antippen wird gezaehlt", R('speedMath.correct') === 1 && R('speedMath.wrong') === 1);
  R('clearInterval(speedMath.timerId); speedMath=null;');

  const cfg = (l) => R(`speedMathLevelConfig(${l})`);
  ok("Level 1-5: nur + und -", ["+", "-"].join() === cfg(1).ops.join() && cfg(5).ops.join() === "+,-");
  ok("Level 6-10: zusaetzlich Mal, noch kein Geteilt", cfg(6).ops.includes("×") && !cfg(10).ops.includes("÷"));
  ok("Ab Level 11: alle vier Rechenarten", cfg(11).ops.length === 4 && cfg(50).label === "Experte");
  ok("Serienziel und Zahlenbereich steigen, Deckel 20/40", cfg(1).streakTarget < cfg(25).streakTarget && cfg(25).streakTarget < cfg(50).streakTarget && cfg(50).maxOperand <= 20 && cfg(50).streakTarget <= 40);
  // Ausfuehrliche Pruefung des Level-Systems (Serie statt Punkte, Herzverlust,
  // Levelaufstieg) steckt in test/speedmath-streak.test.js - hier nur der
  // Basis-Rauchtest, dass die Kernfunktion ueberhaupt erreichbar ist.
  R('speedMathLevelSession={profile:p,level:1,config:{ops:["+"],maxOperand:10,streakTarget:2,label:"T",level:1,tier:1},streak:0,currentProblem:{a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]}}');
  R('speedMathLevelSubmit(2)'); ok("Richtige Antwort erhöht die Serie", R('speedMathLevelSession.streak') === 1);
  R('speedMathLevelSession.currentProblem={a:1,b:1,op:"+",answer:2,choices:[2,3,4,5]}; speedMathLevelSubmit(9)');
  ok("Falsche Antwort setzt die Serie zurueck", R('speedMathLevelSession.streak') === 0);
  R('var p5=createProfile("D"); p5.speedMathHearts=0; p5.speedMathHeartsDate="2020-01-01"; speedMathRefreshHearts(p5)');
  ok("Herzen: neuer Tag fuellt auf 3", R('p5.speedMathHearts') === 3);
  R('var p6=createProfile("D2"); p6.speedMathHearts=1; p6.speedMathHeartsDate=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin"}); speedMathRefreshHearts(p6)');
  ok("Herzen: am selben Tag (deutsche Zeit) kein Reset", R('p6.speedMathHearts') === 1);

  R('ttqb={board:Array(9).fill(null),rankIndex:0,gameOver:false,duel:null,turnSymbol:"X"}; tttOverviewProfile=p; tttQuizmixBotStartMathSprint(4);');
  ok("Tic-Tac-Toe-Bot-Sprint: 4 Kreise", (state.last.match(/class="sm-choice"/g) || []).length === 4 && !state.last.includes("<input"));
  R('tttQuizmixBotSprintAnswer(ttqb.duel.currentProblem.answer)'); ok("... richtiges Antippen zaehlt", R('ttqb.duel.scores.X') === 1);
  R('clearInterval(ttqb.duel.timerId)');
  R('party={playerId:"me",isHost:true}; var sent=[]; partySend=function(m){sent.push(m)};');
  R('tttMp={mySymbol:"X",board:Array(9).fill(null),duel:{type:"math",cellIndex:0,durationMs:60000,remaining:60000,currentProblem:{a:1,b:2,op:"+",choices:[3,4,5,6]},myScore:0,oppScore:0},ws:{send(m){sent.push(m)}}}; renderTttMpSprintDuel();');
  const before = state.renders;
  R('tttMpHandleMessage({type:"tttSprintScoreUpdate",scores:{X:2,O:5}})');
  ok("Online-Sprint: Punktestand des Gegners baut die Seite NICHT neu auf (kein Ruckeln)", state.renders === before && R('tttMp.duel.oppScore') === 5);
  R('tttMpSprintAnswer(3); tttMpSprintAnswer(3);'); ok("Doppeltipp sendet nur EINE Antwort", R('sent.length') === 1);
  R('tttMpHandleMessage({type:"tttSprintNextProblem",problem:{a:2,b:2,op:"+",choices:[4,5,6,7]}}); tttMpSprintAnswer(4)'); ok("Nach neuer Aufgabe wieder antwortbar", R('sent.length') === 2);
}

// ------------------------------------------------------------------ Brain Test
section("Brain Test: Uebungstest 50 (90 %), Haupttest 20 (80 %, Gesamtuhr 1:30), Wiederholen");
{
  const C = loadClient({ fakeTime: true }); const { R, state, advance } = C;
  // Abgebrochene Tests raeumen ihre Timer auf (wie beim Verlassen im echten Spiel)
  const begin = (code) => { R('try{clearInterval(solo.timerId);clearTimeout(solo.advanceTimer)}catch(e){}'); R(code); };
  const play = (n, rightFn) => { R('renderSoloQuestion()'); for (let i = 0; i < n; i++) { R(`handleSoloAnswer(${rightFn(i) ? "solo.questions[solo.qIndex].c" : "(solo.questions[solo.qIndex].c+1)%4"})`); if (R('solo.totalTimer')) advance(500); else R('solo.finished||soloNextQuestion()'); } };
  R('var p=createProfile("BT"); p.klasse=0;');
  begin('beginSolo(p,false)');
  ok("Uebungstest: 50 Fragen, 45 richtig noetig", R('solo.questions.length') === 50 && R('solo.testNeeded') === 45);
  let early = false;
  R('renderSoloQuestion()');
  for (let i = 0; i < 45; i++) { R('handleSoloAnswer(solo.questions[solo.qIndex].c)'); if (R('solo.decided')) early = true; R('soloNextQuestion()'); }
  ok("Nach 45 richtigen (Ziel erreicht) laeuft der Test WEITER", !early && R('solo.qIndex') === 45);
  for (let i = 0; i < 5; i++) { R('handleSoloAnswer((solo.questions[solo.qIndex].c+1)%4)'); R('soloNextQuestion()'); }
  ok("45/50 schaltet den Haupttest frei, Klasse bleibt", R('p.haupttestUnlockedForKlasse') === 0 && R('p.klasse') === 0);
  begin('p.haupttestUnlockedForKlasse=-1; beginSolo(p,false)'); play(50, i => i < 44);
  ok("44/50 (88 %) schaltet NICHT frei", R('p.haupttestUnlockedForKlasse') === -1);
  begin('beginSolo(p,false); renderSoloQuestion()'); let stopped = false;
  for (let i = 0; i < 8; i++) { R('handleSoloAnswer((solo.questions[solo.qIndex].c+1)%4)'); if (R('solo.decided')) stopped = true; R('soloNextQuestion()'); }
  ok("Durchfallen rechnerisch sicher: Test laeuft trotzdem weiter", !stopped && R('solo.qIndex') === 8);

  begin('p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p,true)');
  ok("Haupttest: 20 Fragen, 16 richtig, Gesamtzeit 90 s", R('solo.questions.length') === 20 && R('solo.testNeeded') === 16 && R('solo.timeLimit') === 90 && R('solo.totalTimer'));
  ok("Startseite nennt 1:30 Gesamtzeit", state.last.includes("1:30 Minuten"));
  R('renderSoloQuestion()');
  for (let i = 0; i < 3; i++) { advance(10000); R('handleSoloAnswer(solo.questions[solo.qIndex].c)'); advance(500); }
  ok("Nach der Antwort geht es automatisch weiter (kein WEITER-Knopf)", R('solo.qIndex') === 3);
  const rem = R('solo.remaining'); ok("Gesamtuhr laeuft durch (nicht pro Frage zurueckgesetzt)", rem > 57 && rem < 60);
  advance(70000);
  ok("Zeit abgelaufen: Auswertung, Rest zaehlt als falsch (3 richtig, 17 falsch)", state.last.includes("Zeit abgelaufen") && R('solo.correct') === 3 && R('solo.wrong') === 17);
  ok("Nicht bestanden, Klasse bleibt, keine Timer mehr aktiv", R('p.klasse') === 0 && C.activeIntervals() === 0);
  begin('beginSolo(p,true); renderSoloQuestion()'); for (let i = 0; i < 20; i++) { advance(2000); R('handleSoloAnswer(solo.questions[solo.qIndex].c)'); advance(500); }
  ok("20/20 in ~50 s: regulaer beendet, bestanden, Klasse 2", !state.last.includes("Zeit abgelaufen") && R('p.klasse') === 1 && C.activeIntervals() === 0);
  ok("Nach bestandenem Haupttest: Freischaltung fuer die neue Klasse zurueckgesetzt", R('p.haupttestUnlockedForKlasse') === -1);
  ok("Ergebnisknopf heisst 'UEBUNGSTEST KLASSE 2'", state.last.includes("ÜBUNGSTEST KLASSE 2"));
  begin('beginSolo(solo.profile, true)');
  ok("'Noch eine Runde' startet den UEBUNGSTEST (Luecke geschlossen, Haupttest bleibt gesperrt)", !R('solo.isHaupttest') && R('solo.questions.length') === 50);

  R('p.klasse=3; p.haupttestUnlockedForKlasse=-1; renderKlassenOverview(p)');
  ok("Klassenliste: 3 bestandene Klassen haben 'Test wiederholen'", (state.last.match(/Test wiederholen/g) || []).length === 3);
  begin('beginSolo(p,true,1)');
  // Hinweis: seit der gemischten Antwortreihenfolge (answer-shuffle) sind die
  // zurueckgegebenen Fragen-Objekte NEUE Kopien (gleicher Inhalt, andere
  // Referenz) - deshalb hier per Fragetext statt per Objekt-Identitaet
  // vergleichen.
  ok("Wiederholung Klasse 2: 20 Fragen aus Klasse 2, zaehlt nicht fuer den Aufstieg", R('solo.isRepeat') && R('solo.questions.length') === 20 && R("solo.questions.every(q=>KLASSE_QUESTIONS[2].some(orig=>orig.q===q.q))") && state.last.includes("zählt nicht für den Aufstieg"));
  R('renderSoloQuestion()'); for (let i = 0; i < 20; i++) { advance(1000); R('handleSoloAnswer(solo.questions[solo.qIndex].c)'); advance(500); }
  ok("Wiederholung bestanden: Klasse + Freischaltung unveraendert", R('p.klasse') === 3 && R('p.haupttestUnlockedForKlasse') === -1 && !state.last.includes("Neuer Rang"));
  ok("Wiederholung: Knoepfe 'NOCHMAL WIEDERHOLEN' + 'ZUR UEBERSICHT'", state.last.includes("NOCHMAL WIEDERHOLEN") && state.last.includes("ZUR ÜBERSICHT"));
  begin('beginSolo(p,true,0)'); R('renderSoloQuestion()'); advance(200000);
  ok("Wiederholung durchgefallen (Zeit): keine Rueckstufung", R('p.klasse') === 3 && R('p.haupttestUnlockedForKlasse') === -1);
  begin('beginSolo(p,true,3)'); ok("Wiederholung der AKTUELLEN Klasse ist nicht moeglich", !R('solo.isRepeat'));
  begin('beginSolo(p,true,7)'); ok("Wiederholung einer noch nicht erreichten Klasse ist nicht moeglich", !R('solo.isRepeat'));
  begin('p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p,true); renderSoloQuestion()'); for (let i = 0; i < 20; i++) { R('handleSoloAnswer((solo.questions[solo.qIndex].c+1)%4)'); advance(500); }
  ok("Durchgefallener Haupttest bleibt freigeschaltet und wiederholbar", R('p.haupttestUnlockedForKlasse') === 0 && R('p.klasse') === 0);
  let allK = true; for (let k = 0; k < 10; k++) if (R(`pickKlasseTestQuestions(${k}).length`) !== 50 || R(`pickKlasseHaupttestQuestions(${k}).length`) !== 20) allK = false;
  ok("Alle 10 Klassen liefern 50 bzw. 20 Fragen", allK);
}

// ------------------------------------------------------------------ Daumen runter
section("Daumen runter (Nenn's Blitz + Stadt Land Fluss): Anzeige");
{
  const C = loadClient(); const { R, state } = C;
  R('var sent=[]; partySend=function(m){sent.push(m)}; party={playerId:"me",isHost:true};');
  R('renderNennsBlitzReveal({label:"Obst",players:[{id:"me",name:"Ich"},{id:"opp",name:"Gegner"}],answers:{me:[{id:"a1",text:"Apfel"}],opp:[{id:"a2",text:"Nudel"}]}})');
  ok("Blitz: Daumen-Knopf bei JEDER Antwort, auch der eigenen; kein Anfechten mehr", (state.last.match(/thumb-btn/g) || []).length === 2 && !/nfecht|⚑/.test(state.last));
  R('thumbNennsBlitz("opp","a2")'); ok("Klick sendet nennsBlitzThumb", R('sent[0].action') === "nennsBlitzThumb" && R('sent[0].answerId') === "a2");
  R('partyHandleMessage({type:"nennsBlitzThumbUpdate",thumbs:[{playerId:"opp",answerId:"a2",voters:["me"],removed:true}],threshold:1,readyCount:0,readyTotal:2})');
  const bl = state.els["blitzList"].innerHTML;
  ok("Blitz: Liste aktualisiert live (durchgestrichen, eigener Daumen hervorgehoben, Zaehler)", bl.includes("line-through") && bl.includes("thumb-btn on") && bl.includes("(0 von 1)"));
  R('renderSlfReveal({letter:"B",categories:["Stadt","Land"],players:[{id:"me",name:"Ich"},{id:"opp",name:"Gegner"}],answers:{me:{Stadt:"Berlin",Land:""},opp:{Stadt:"Bonn",Land:"Belgien"}},scores:{me:{Stadt:20,Land:0},opp:{Stadt:20,Land:20}}})');
  ok("SLF: Daumen bei jeder nicht-leeren Antwort (3), inkl. eigener", (state.last.match(/thumb-btn/g) || []).length === 3);
  R('partyHandleMessage({type:"slfThumbUpdate",thumbs:[{playerId:"me",category:"Stadt",voters:["me","opp"],removed:true}],threshold:2,readyCount:1,readyTotal:2})');
  const sl = state.els["slfList"].innerHTML;
  ok("SLF: entfernte Antwort durchgestrichen, 0 P., Hinweis", sl.includes("line-through") && sl.includes("Antwort entfernt") && sl.includes("0 P."));
}
finish();
