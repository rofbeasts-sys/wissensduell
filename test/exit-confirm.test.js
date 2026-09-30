/* Bugfix: "Zurück" beim Brain Test stand direkt unter "WEITER" und loeschte
 * bei einem versehentlichen Tipp sofort den ganzen Testfortschritt, ohne
 * Rueckfrage. Jetzt: Bestaetigung, sobald wirklich etwas verloren ginge. */
const { ok, section, finish, loadClient } = require("./helpers");

(async () => {
  section("Kein Fortschritt (ganz am Anfang): direkt raus, keine Rückfrage nötig");
  {
    let confirmCalls = 0;
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => { confirmCalls++; return true; };
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p,false); renderSoloQuestion();');
    ok("Vor der ersten Antwort: kein Fortschritt", R("solo.correct")===0 && R("solo.wrong")===0 && R("solo.qIndex")===0);
    R('exitSoloTest()');
    ok("Direkt zurück ins Menü, OHNE dass die Bestätigung überhaupt aufgerufen wurde", confirmCalls === 0 && R("solo") === null);
  }

  section("Mit Fortschritt: Bestätigung wird gefragt, Abbrechen der Rückfrage rettet den Fortschritt");
  {
    let confirmCalls = 0, lastMessage = null;
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = (msg) => { confirmCalls++; lastMessage = msg; return false; }; // Person entscheidet sich GEGEN das Abbrechen
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p,false); renderSoloQuestion();');
    R('handleSoloAnswer(solo.questions[solo.qIndex].c);'); // eine Frage beantwortet
    ok("Nach 1 Antwort: Fortschritt vorhanden", R("solo.correct")===1 || R("solo.wrong")===1);
    R('exitSoloTest()');
    ok("Bestätigung wurde eingeblendet", confirmCalls === 1);
    ok("... mit einem verständlichen Hinweistext (nicht leer)", typeof lastMessage === "string" && lastMessage.length > 10);
    ok("Bei 'Abbrechen' bleibt der Test unverändert bestehen (NICHT alles weg)", R("solo") !== null && (R("solo.correct")===1 || R("solo.wrong")===1));
    ok("... und das Hauptmenü wird NICHT angezeigt", !R("document.getElementById('app').innerHTML").includes("menu-grid"));
  }

  section("Mit Fortschritt: Bestätigen verlässt den Test wie gewünscht");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.confirm = () => true; // Person bestätigt den Abbruch wirklich
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p,false); renderSoloQuestion();');
    R('handleSoloAnswer(solo.questions[solo.qIndex].c);');
    R('exitSoloTest()');
    ok("Nach Bestätigung: Test wird wirklich verlassen", R("solo") === null);
    ok("... und landet im Hauptmenü", R("document.getElementById('app').innerHTML").includes("menu-grid"));
  }

  section("Gilt gleichermaßen für Haupttest UND 'Test wiederholen'");
  {
    const C = loadClient(); const { R, sb } = C;
    let asked = 0;
    sb.confirm = () => { asked++; return false; };
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p,true); renderSoloQuestion();');
    R('handleSoloAnswer(solo.questions[solo.qIndex].c); exitSoloTest();');
    ok("Haupttest: nach 1 Antwort wird ebenfalls nachgefragt", asked === 1 && R("solo") !== null);

    const C2 = loadClient(); const { R: R2, sb: sb2 } = C2;
    let asked2 = 0;
    sb2.confirm = () => { asked2++; return false; };
    R2('var p2=createProfile("T2"); p2.klasse=3; p2.haupttestUnlockedForKlasse=-1; beginSolo(p2,true,1); renderSoloQuestion();');
    R2('handleSoloAnswer(solo.questions[solo.qIndex].c); exitSoloTest();');
    ok("'Test wiederholen': nach 1 Antwort wird ebenfalls nachgefragt", asked2 === 1 && R2("solo") !== null);
  }

  section("Anzeige: eindeutiger Text statt des generischen 'ZURÜCK', mehr Abstand zu 'WEITER'");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p,false); renderSoloQuestion();');
    ok("Knopf heißt jetzt 'Test abbrechen', nicht mehr das generische 'ZURÜCK'", state.last.includes("Test abbrechen") && !/>ZURÜCK</.test(state.last));
    ok("Deutlich mehr Abstand zum WEITER-Knopf als vorher (28px statt 10px)", state.last.includes('margin-top:28px'));
  }

  section("Kein Timer/Ressourcen-Leck beim Abbrechen (auch beim Gesamtuhr-Haupttest)");
  {
    const C = loadClient({ fakeTime: true }); const { R, sb } = C;
    sb.confirm = () => true;
    R('var p=createProfile("T"); p.klasse=0; p.haupttestUnlockedForKlasse=0; beginSolo(p,true); renderSoloQuestion();');
    R('handleSoloAnswer(solo.questions[solo.qIndex].c); exitSoloTest();');
    ok("Nach dem Abbrechen laufen keine Timer mehr im Hintergrund", C.activeIntervals() === 0);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
