/* Order of Speed: auf Wunsch zusätzlich zu den Zeitlimits (1/2/3/5 Minuten)
 * eine "∞ Unendlich"-Option - kein automatischer Ablauf, das Spiel läuft
 * weiter, bis die spielende Person selbst über "Zurück" beendet. In diesem
 * Fall speichert "Zurück" die Statistik und zeigt das Ergebnis (anders als
 * bei zeitbasierten Spielen, wo "Zurück" weiterhin die Runde stillschweigend
 * verwirft - das bleibt bewusst unverändert). */
const { ok, section, finish, loadClient } = require("./helpers");

(async () => {
  section("Einstiegsbildschirm bietet die Unendlich-Option zusätzlich zu den Zeitlimits an");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); speedMathProfile=p; renderOrderOfSpeedEntry(p);');
    const html = state.last;
    ok("Die 4 Zeitlimits sind weiterhin da", ["1 Minute", "2 Minuten", "3 Minuten", "5 Minuten"].every(t => html.includes(t)));
    ok("Zusätzlich eine Unendlich-Option", html.includes("Unendlich") && html.includes("startOrderOfSpeedGame(null)"));
  }

  section("Unendlich-Modus: kein automatischer Ablauf-Timer, läuft beliebig lange weiter");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(null);');
    ok("durationSec ist null", R("orderOfSpeedSession.durationSec") === null);
    ok("Kein Ablauf-Timer gesetzt (anders als bei Zeitlimit)", R("orderOfSpeedSession.timerId") === null);
    advance(30 * 60 * 1000); // 30 Minuten
    ok("Nach 30 Minuten immer noch aktiv (kein automatisches Ende)", R("orderOfSpeedSession") !== null);
  }

  section("Unendlich-Modus: Spielbildschirm zeigt '∞ Unendlich' statt Countdown-Balken, Pro-Zahl-Timer bleibt bestehen");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(null);');
    const html = state.last;
    ok("Zeigt '∞ Unendlich'", html.includes("∞ Unendlich"));
    ok("Kein Countdown-Element (orderOfSpeedTimerFill) im Markup", !html.includes("orderOfSpeedTimerFill"));
    ok("Der Pro-Zahl-Timer (oosTapTimerFill) ist weiterhin da", html.includes("oosTapTimerFill"));
  }

  section("Unendlich-Modus: 'Zurück' beendet die Runde richtig (speichert Statistik, zeigt Ergebnis), statt sie stillschweigend zu verwerfen");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(null);
      orderOfSpeedSession.points = 500; orderOfSpeedSession.correct = 7; orderOfSpeedSession.wrong = 2; orderOfSpeedSession.level = 4;
      exitOrderOfSpeed();
    `);
    ok("Session ist danach beendet", R("orderOfSpeedSession") === null);
    ok("Statistik wurde gespeichert (played=1)", R("p.modeStats.orderofspeed.played") === 1);
    ok("Statistik wurde gespeichert (correct=7)", R("p.modeStats.orderofspeed.correct") === 7);
    ok("Ergebnisbildschirm zeigt 'BEENDET' statt 'ZEIT UM!' (freiwilliges Ende, kein Zeitablauf)", state.last.includes("BEENDET") && !state.last.includes("ZEIT UM"));
    ok("Ergebnisbildschirm zeigt die erzielten Punkte (500)", state.last.includes("500"));
    ok("'Nochmal'-Knopf startet erneut im Unendlich-Modus (nicht mit einem Zeitlimit)", state.last.includes("startOrderOfSpeedGame(null)"));
  }

  section("Zeitbasierte Spiele bleiben unverändert: 'Zurück' verwirft weiterhin still, ohne zu speichern (keine Regression)");
  {
    const C = loadClient(); const { R } = C;
    R(`
      var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(60);
      orderOfSpeedSession.points = 300;
      exitOrderOfSpeed();
    `);
    ok("Session ist beendet", R("orderOfSpeedSession") === null);
    ok("KEINE Statistik gespeichert (wie schon immer bei einem zeitbasierten Spiel über 'Zurück')", R("p.modeStats.orderofspeed") === undefined || R("p.modeStats.orderofspeed.played") === 0);
  }

  section("Zeitbasierte Spiele laufen weiterhin automatisch ab und speichern dabei korrekt (keine Regression)");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance, state } = C;
    R('var p=createProfile("T"); speedMathProfile=p; startOrderOfSpeedGame(60);');
    ok("Ablauf-Timer ist gesetzt", R("orderOfSpeedSession.timerId") !== null);
    advance(61000);
    ok("Session automatisch beendet nach Ablauf", R("orderOfSpeedSession") === null);
    ok("Statistik wurde gespeichert", R("p.modeStats.orderofspeed.played") === 1);
    ok("Ergebnisbildschirm zeigt weiterhin 'ZEIT UM!' bei echtem Zeitablauf", state.last.includes("ZEIT UM"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
