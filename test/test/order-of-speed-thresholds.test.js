/* Order of Speed: neue Level-Schwellen für Bewegen/Verschwinden/
 * Gedächtnis-Phase, auf Wunsch:
 * - ab Level 15: Zahlen bewegen sich
 * - ab Level 25: zusätzlich kurzes Verschwinden (Flackern) - ab hier
 *   automatisch "beides" kombiniert, da Bewegen schon seit Level 15 läuft
 * - ab Level 45: Zahlen sind nur 5s beim Rundenbeginn sichtbar, dann
 *   DAUERHAFT verdeckt (kein zyklisches Wiederaufdecken mehr) - danach aus
 *   dem Gedächtnis tippen. Der Pro-Zahl-Zeitdruck startet dabei bewusst
 *   erst NACH der Merkphase, nicht schon während des Hinsehens. */
const { ok, section, finish, loadClient } = require("./helpers");

function setupSession(R, level) {
  R(`
    var p = createProfile("T");
    speedMathProfile = p;
    startOrderOfSpeedGame(300);
    orderOfSpeedSession.level = ${level};
    orderOfSpeedStartRound(orderOfSpeedSession);
  `);
}

(async () => {
  section("Schwellen exakt wie gewünscht: 15 (Bewegen), 25 (Verschwinden, kombiniert sich ab da automatisch mit Bewegen)");
  {
    const C = loadClient({ fakeTime: true }); const { R } = C;
    [[1, false, false], [14, false, false], [15, true, false], [24, true, false], [25, true, true], [34, true, true], [44, true, true]]
      .forEach(([level, wantMove, wantFlicker]) => {
        setupSession(R, level);
        const hasMove = R("orderOfSpeedSession.moveTimerId") !== null;
        const hasFlicker = R("orderOfSpeedSession.flickerTimerId") !== null;
        ok(`Level ${level}: Bewegen=${wantMove}, Verschwinden=${wantFlicker}`, hasMove === wantMove && hasFlicker === wantFlicker);
      });
  }

  section("Ab Level 45: Zahlen 5s sichtbar, dann dauerhaft verdeckt (kein automatisches Wiederaufdecken)");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    setupSession(R, 45);
    ok("Direkt nach Rundenbeginn sichtbar", R("orderOfSpeedSession.round.hidden") === false);
    advance(4900);
    ok("Nach 4,9s immer noch sichtbar (noch nicht abgelaufen)", R("orderOfSpeedSession.round.hidden") === false);
    advance(200);
    ok("Nach 5,1s jetzt verdeckt", R("orderOfSpeedSession.round.hidden") === true);
    advance(10000);
    // Kein automatisches Wiederaufdecken wie beim normalen Flackern -
    // bleibt verdeckt, bis entweder die Runde zu Ende getippt oder durch
    // einen Fehler/Timeout neu gestartet wird.
    const stillHiddenOrNewRound = R("orderOfSpeedSession.round.hidden === true || orderOfSpeedSession.wrong > 0");
    ok("Kein zyklisches Wiederaufdecken (entweder weiterhin verdeckt oder bereits durch Timeout neu gestartet)", stillHiddenOrNewRound);
  }

  section("Pro-Zahl-Zeitdruck startet bei Level 45 ERST nach der 5s-Merkphase, nicht schon währenddessen");
  {
    // Ohne diesen Fix wuerde der (bei Level 45 sehr knappe) Pro-Zahl-Timer
    // schon waehrend des reinen Hinsehens ablaufen und die Runde canceln,
    // bevor man ueberhaupt mit dem Tippen beginnen darf.
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    setupSession(R, 45);
    ok("Kein Pro-Zahl-Timer während der Merkphase (tapTimerId null)", R("orderOfSpeedSession.tapTimerId") === null);
    advance(2900); // laenger als der eigentliche Pro-Zahl-Zeitlimit bei Level 45 (~2.8s), aber kuerzer als die 5s-Merkphase
    ok("Trotzdem noch kein Fehler gezählt (Timer war ja noch nicht aktiv)", R("orderOfSpeedSession.wrong") === 0);
    ok("Immer noch in der Merkphase (noch sichtbar)", R("orderOfSpeedSession.round.hidden") === false);
    advance(2200); // jetzt insgesamt über 5s
    ok("Pro-Zahl-Timer ist jetzt (nach der Merkphase) aktiv", R("orderOfSpeedSession.tapTimerId") !== null);
  }

  section("Bewegung läuft während der Merkphase mit (Level 45 liegt auch über der Bewegungs-Schwelle 15), friert beim Verdecken ein");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    setupSession(R, 45);
    const before = R("orderOfSpeedSession.round.display.slice()");
    advance(2600); // ueber ein Bewegungsintervall hinaus, noch in der Merkphase
    const duringReveal = R("orderOfSpeedSession.round.display.slice()");
    ok("Anordnung hat sich während der Merkphase bereits verändert", JSON.stringify(before) !== JSON.stringify(duringReveal));
    advance(2600); // jetzt über die 5s-Grenze hinaus -> verdeckt + eingefroren
    const afterHide1 = R("orderOfSpeedSession.round.display.slice()");
    advance(1000); // kurz, bewusst UNTER dem Pro-Zahl-Zeitlimit (~2.8s bei Level 45) - sonst wuerde ein Timeout eine komplett neue Runde ausloesen und den Test verfaelschen
    const afterHide2 = R("orderOfSpeedSession.round.display.slice()");
    ok("Anordnung bewegt sich NICHT mehr, nachdem verdeckt wurde (eingefroren)", JSON.stringify(afterHide1) === JSON.stringify(afterHide2));
  }

  section("Antippen funktioniert weiterhin korrekt, auch während die Zahlen verdeckt sind (Tasten bleiben klickbar)");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    setupSession(R, 45);
    advance(5100); // jetzt verdeckt
    const correctFirst = R("orderOfSpeedSession.round.sequence[0]");
    R(`orderOfSpeedTap(${correctFirst});`);
    ok("Richtiger Tipp wird trotz Verdeckung korrekt gewertet", R("orderOfSpeedSession.round.nextIndex") === 1 || R("orderOfSpeedSession.points") === 100);
  }

  section("Verdeckte Zahlen-Buttons bleiben im Markup klickbar (nur der Zahlentext ist unsichtbar, CSS-Klasse 'hidden-num')");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance, state } = C;
    setupSession(R, 45);
    advance(5100);
    R("renderOrderOfSpeedGame();");
    ok("Buttons tragen die Klasse 'hidden-num' (Text unsichtbar, Form bleibt antippbar)", state.last.includes("hidden-num"));
    ok("Hinweistext 'Aus dem Gedächtnis tippen' erscheint", state.last.includes("Aus dem Gedächtnis tippen"));
  }

  section("Live-Durchlauf über den normalen Spielablauf (nicht nur direkte Funktionsaufrufe)");
  {
    const C = loadClient({ fakeTime: true }); const { R, advance } = C;
    R(`
      var p = createProfile("T");
      speedMathProfile = p;
      startOrderOfSpeedGame(300);
    `);
    ok("Level 1 startet ohne Bewegen/Verschwinden", R("orderOfSpeedSession.moveTimerId") === null && R("orderOfSpeedSession.flickerTimerId") === null);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
