/* Schach-Challenges: feste Aufgaben (Matt in 1/2/3), Regel-Challenges (ohne Dame, in N Zuegen, unter X Minuten ...) und Handicap-Stellungen.
   Die Matt-Aufgaben sind mit der Engine geprueft (Loesung vorhanden, bei den meisten genau eine). Haken in index.html: newGame, doMove, finish, buildUi, setStatus. */
(function(){
  'use strict';
  var FILES = 'abcdefgh';
  var lang = function(){ try{ return LANG === 'en' ? 'en' : 'de'; }catch(e){ return 'de'; } };
  var TIERS = [
    { id: 'learn',  de: 'Lernen',          en: 'Learn',     ic: '📖' },
    { id: 'basic',  de: 'Grundlagen',      en: 'Basics',    ic: '📘' },
    { id: 'easy',   de: 'Anfänger',        en: 'Beginner',  ic: '🌱' },
    { id: 'mid',    de: 'Fortgeschritten', en: 'Advanced',  ic: '🔥' },
    { id: 'master', de: 'Meister',         en: 'Master',    ic: '👑' }
  ];
  // opp = Index in der Gegner-Leiter (0 = Tim, sehr schwach ... 29 = stark); me = Farbe des Spielers
  // pos = Stellung als Text (wKg1 = weisser Koenig auf g1), from = Zugfolge ab Grundstellung, drop/keep = Figuren des Spielers entfernen
  // rules: maxMoves (eigene Zuege), timeLimit (Sekunden), noMove (Figurentypen, die nicht ziehen duerfen), noLoss (Typen, die nicht geschlagen werden duerfen),
  //        castle (Rochade noetig), mateWith (Matt muss mit diesem Typ gesetzt werden), promote (N Umwandlungen), capPawns (N gegnerische Bauern schlagen)
  var D = [
    // ---------- Grundlagen: feste Matt-Aufgaben ----------
    { id: 'p1', tier: 'basic', ic: '🧱', opp: 10, me: 'w', pos: 'wKg1 wRa1 wPf2 wPg2 wPh2 bKg8 bPf7 bPg7 bPh7', rules: { maxMoves: 1 },
      de: ['Grundlinien-Matt', 'Setze in 1 Zug matt.', 'Der Turm geht ganz nach hinten, die eigenen Bauern sperren dem König den Weg.'], en: ['Back-rank mate', 'Checkmate in 1 move.', 'The rook goes all the way back; the king is boxed in by his own pawns.'] },
    { id: 'p2', tier: 'basic', ic: '🍳', opp: 10, me: 'w', from: ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'f1c4', 'g8f6'], rules: { maxMoves: 1 },
      de: ['Schäfermatt', 'Setze in 1 Zug matt.', 'Der Bauer f7 wird nur vom König gedeckt.'], en: ['Scholar\'s mate', 'Checkmate in 1 move.', 'The f7 pawn is only protected by the king.'] },
    { id: 'p3', tier: 'basic', ic: '🃏', opp: 10, me: 'b', from: ['f2f3', 'e7e5', 'g2g4'], rules: { maxMoves: 1 },
      de: ['Narrenmatt (du bist Schwarz)', 'Setze in 1 Zug matt.', 'Weiß hat sich selbst die Diagonale zum König geöffnet.'], en: ['Fool\'s mate (you are Black)', 'Checkmate in 1 move.', 'White opened the diagonal to his own king.'] },
    { id: 'p4', tier: 'basic', ic: '👸', opp: 10, me: 'w', pos: 'wKc6 wQd7 bKa8', rules: { maxMoves: 1 },
      de: ['Dame und König', 'Setze in 1 Zug matt.', 'Der König deckt das Feld, auf das die Dame muss.'], en: ['Queen and king', 'Checkmate in 1 move.', 'Your king protects the square the queen needs.'] },
    { id: 'p5', tier: 'basic', ic: '🪜', opp: 10, me: 'w', pos: 'wKe1 wRa7 wRb1 bKh8', rules: { maxMoves: 1 },
      de: ['Zwei Türme (Leitermatt)', 'Setze in 1 Zug matt.', 'Ein Turm sperrt die 7. Reihe, der andere gibt Schach auf der 8.'], en: ['Two rooks (ladder mate)', 'Checkmate in 1 move.', 'One rook seals the 7th rank, the other checks on the 8th.'] },
    { id: 'p6', tier: 'basic', ic: '🐴', opp: 10, me: 'w', pos: 'wKg1 wNe5 bKh8 bRg8 bPg7 bPh7', rules: { maxMoves: 1 },
      de: ['Erstickungsmatt', 'Setze in 1 Zug matt.', 'Der König erstickt an den eigenen Figuren, nur der Springer kann ihn matt setzen.'], en: ['Smothered mate', 'Checkmate in 1 move.', 'The king is smothered by his own pieces; only a knight can mate him.'] },
    { id: 'p7', tier: 'basic', ic: '👑', opp: 10, me: 'w', pos: 'wKd6 bKa6 wQg5', rules: { maxMoves: 2 },
      de: ['Matt in 2: Königsmarsch', 'Setze in 2 Zügen matt.', 'Ein ruhiger Königszug kommt zuerst.'], en: ['Mate in 2: king walk', 'Checkmate in 2 moves.', 'A quiet king move comes first.'] },
    { id: 'p8', tier: 'basic', ic: '🏰', opp: 10, me: 'w', pos: 'wKg6 bKg8 wRh6', rules: { maxMoves: 2 },
      de: ['Matt in 2: Turm und König', 'Setze in 2 Zügen matt.', 'Aufpassen: nicht patt setzen.'], en: ['Mate in 2: rook and king', 'Checkmate in 2 moves.', 'Careful: do not stalemate him.'] },

    // ---------- Anfänger ----------
    { id: 'e1', tier: 'easy', ic: '⚡', opp: 0, me: 'w', rules: { maxMoves: 30 },
      de: ['Schneller Sieg', 'Gewinne in höchstens 30 Zügen.'], en: ['Quick win', 'Win in at most 30 moves.'] },
    { id: 'e2', tier: 'easy', ic: '⏱️', opp: 1, me: 'w', rules: { timeLimit: 300 },
      de: ['Unter 5 Minuten', 'Gewinne in unter 5 Minuten.'], en: ['Under 5 minutes', 'Win in under 5 minutes.'] },
    { id: 'e3', tier: 'easy', ic: '🏯', opp: 2, me: 'w', rules: { castle: true },
      de: ['Rochiere und gewinne', 'Rochiere mindestens einmal und setze den Gegner matt.'], en: ['Castle and win', 'Castle at least once and checkmate the opponent.'] },
    { id: 'e4', tier: 'easy', ic: '🌟', opp: 1, me: 'w', rules: { promote: 1 },
      de: ['Mach eine neue Figur', 'Wandle einen Bauern um.'], en: ['Promote a pawn', 'Promote one pawn.'] },
    { id: 'e5', tier: 'easy', ic: '🐴', opp: 2, me: 'w', rules: { noMove: ['N'] },
      de: ['Ohne Springer', 'Gewinne, ohne einen Springer zu bewegen.'], en: ['No knights', 'Win without moving a knight.'] },
    { id: 'e6', tier: 'easy', ic: '🪤', opp: 10, me: 'w', pos: 'wKd3 bKe1 wRh8', rules: { maxMoves: 2 },
      de: ['Matt in 2: Turm-Trick', 'Setze in 2 Zügen matt.', 'Der Turm schneidet dem König die Reihe ab.'], en: ['Mate in 2: rook trick', 'Checkmate in 2 moves.', 'The rook cuts the king off along a rank.'] },

    // ---------- Fortgeschritten ----------
    { id: 'f1', tier: 'mid', ic: '🚫', opp: 4, me: 'w', rules: { noMove: ['Q'] },
      de: ['Ohne Dame', 'Gewinne, ohne deine Dame zu bewegen.'], en: ['No queen', 'Win without moving your queen.'] },
    { id: 'f2', tier: 'mid', ic: '🛡️', opp: 1, me: 'w', rules: { noLoss: ['N', 'B', 'R', 'Q'] },
      de: ['Keine Figur verlieren', 'Gewinne, ohne eine Figur zu verlieren (Bauern dürfen fallen).'], en: ['Lose no piece', 'Win without losing a piece (pawns may fall).'] },
    { id: 'f3', tier: 'mid', ic: '🏃', opp: 1, me: 'w', rules: { maxMoves: 20 },
      de: ['Sieg in 20 Zügen', 'Setze in höchstens 20 Zügen matt.'], en: ['Win in 20 moves', 'Checkmate in at most 20 moves.'] },
    { id: 'f4', tier: 'mid', ic: '🐎', opp: 3, me: 'w', rules: { mateWith: 'N' },
      de: ['Matt mit dem Springer', 'Setze den Gegner mit einem Springer matt.'], en: ['Mate with a knight', 'Checkmate your opponent with a knight.'] },
    { id: 'f5', tier: 'mid', ic: '✨', opp: 2, me: 'w', rules: { promote: 3 },
      de: ['Drei Umwandlungen', 'Wandle 3 Bauern um.'], en: ['Three promotions', 'Promote 3 pawns.'] },
    { id: 'f6', tier: 'mid', ic: '🌾', opp: 3, me: 'w', rules: { capPawns: 8 },
      de: ['Bauern-Ernte', 'Schlage alle 8 gegnerischen Bauern.'], en: ['Pawn harvest', 'Capture all 8 enemy pawns.'] },
    { id: 'f7', tier: 'mid', ic: '👸', opp: 10, me: 'w', pos: 'wKc5 bKb7 wQa4', rules: { maxMoves: 3 },
      de: ['Matt in 3: Königsjagd', 'Setze in 3 Zügen matt.', 'Zuerst den König wegdrängen, dann zuschlagen.'], en: ['Mate in 3: king hunt', 'Checkmate in 3 moves.', 'Drive the king back first, then strike.'] },
    { id: 'f8', tier: 'mid', ic: '🕸️', opp: 10, me: 'w', pos: 'wKg8 bKg6 wQc3', rules: { maxMoves: 3 },
      de: ['Matt in 3: Das Netz', 'Setze in 3 Zügen matt.', 'Lass dem König kein Feld, ohne ihn patt zu setzen.'], en: ['Mate in 3: the net', 'Checkmate in 3 moves.', 'Leave the king no square without stalemating him.'] },

    // ---------- Meister ----------
    { id: 'x1', tier: 'master', ic: '🪓', opp: 6, me: 'w', drop: ['Q'], rules: {},
      de: ['Ohne Dame starten', 'Du beginnst ohne Dame. Setze trotzdem matt.'], en: ['Start without a queen', 'You begin without a queen. Still checkmate your opponent.'] },
    { id: 'x2', tier: 'master', ic: '♟️', opp: 0, me: 'w', keep: ['K', 'P'], rules: {},
      de: ['Nur Bauern und König', 'Du hast nur König und Bauern. Wandle um und gewinne.', 'Zieh die Bauern gemeinsam vor und wandle in eine Dame um.'], en: ['Pawns and king only', 'You only have a king and pawns. Promote and win.', 'Push the pawns together and promote to a queen.'] },
    { id: 'x3', tier: 'master', ic: '🥋', opp: 3, me: 'w', rules: { mateWith: 'P' },
      de: ['Matt mit einem Bauern', 'Setze den Gegner mit einem Bauern matt.'], en: ['Mate with a pawn', 'Checkmate your opponent with a pawn.'] },
    { id: 'x4', tier: 'master', ic: '🧊', opp: 4, me: 'w', rules: { noMove: ['Q'], maxMoves: 30 },
      de: ['Dame bleibt stehen', 'Ohne Dame ziehen und in höchstens 30 Zügen matt setzen.'], en: ['Queen stays home', 'Checkmate in at most 30 moves without moving your queen.'] },
    { id: 'x5', tier: 'master', ic: '🔥', opp: 2, me: 'w', rules: { timeLimit: 180 },
      de: ['Blitzsieg', 'Gewinne in unter 3 Minuten.'], en: ['Blitz win', 'Win in under 3 minutes.'] },
    { id: 'x6', tier: 'master', ic: '💎', opp: 3, me: 'w', rules: { noLoss: ['N', 'B', 'R', 'Q'], maxMoves: 40 },
      de: ['Makellos', 'Keine Figur verlieren und in höchstens 40 Zügen gewinnen.'], en: ['Flawless', 'Lose no piece and win in at most 40 moves.'] },
    { id: 'x7', tier: 'master', ic: '🌠', opp: 3, me: 'w', rules: { promote: 5 },
      de: ['Fünf Umwandlungen', 'Wandle 5 Bauern um.'], en: ['Five promotions', 'Promote 5 pawns.'] },
    { id: 'x8', tier: 'master', ic: '🦁', opp: 9, me: 'w', rules: { noMove: ['Q'] },
      de: ['Starker Gegner ohne Dame', 'Gewinne gegen einen starken Gegner, ohne deine Dame zu bewegen.'], en: ['Strong opponent, no queen', 'Beat a strong opponent without moving your queen.'] },
    { id: 'x9', tier: 'master', ic: '⚔️', opp: 0, me: 'w', rules: { maxMoves: 12 },
      de: ['Sieg in 12 Zügen', 'Setze in höchstens 12 Zügen matt.', 'Ein schneller Angriff auf f7 oder f2 kann reichen.'], en: ['Win in 12 moves', 'Checkmate in at most 12 moves.', 'A fast attack on f7 or f2 can be enough.'] }
  ];

  // ---------- Lernen: vorgegebene Partien. line = [Zug, Erklaerung DE, Erklaerung EN]. Du spielst die Zuege deiner Farbe nach, der Gegner antwortet wie vorgegeben. ----------
  var LESSONS = [
    { id: 'l1', tier: 'learn', ic: '🪤', me: 'w', opp: 10, lesson: true,
      de: ['Légal-Falle', 'Opfere deine Dame und setze mit zwei Springern und einem Läufer matt.', 'Spiele die Züge nach. Schwarz tappt in die Falle.'], en: ['Légal trap', 'Sacrifice your queen and mate with two knights and a bishop.', 'Play the moves. Black walks into the trap.'],
      line: [
        ['e2e4', 'Du besetzt die Mitte und öffnest Linien für Dame und Läufer.', 'You take the centre and open lines for queen and bishop.'],
        ['e7e5', 'Schwarz macht dasselbe.', 'Black does the same.'],
        ['g1f3', 'Der Springer greift e5 an und kommt ins Spiel.', 'The knight attacks e5 and joins the game.'],
        ['d7d6', 'Schwarz deckt e5 mit dem Bauern d6.', 'Black protects e5 with the d6 pawn.'],
        ['f1c4', 'Der Läufer zielt auf f7, den schwächsten Punkt bei Schwarz.', 'The bishop eyes f7, the weakest point in Black\'s camp.'],
        ['c8g4', 'Schwarz fesselt deinen Springer an die Dame.', 'Black pins your knight to the queen.'],
        ['b1c3', 'Ein ruhiger Entwicklungszug. Er stellt die Falle: Schwarz soll glauben, er darf weiter ziehen.', 'A quiet developing move. It sets the trap.'],
        ['g7g6', 'Der Fehler. Schwarz hält den Springer für gefesselt und achtet nicht auf f7.', 'The mistake. Black thinks the knight is pinned and ignores f7.'],
        ['f3e5', 'Das Dame-Opfer! Der Springer schlägt e5. Nimmt Schwarz die Dame, kommt das Matt.', 'The queen sacrifice! If Black takes the queen, mate follows.'],
        ['g4d1', 'Schwarz schlägt deine Dame. Das sieht gut für ihn aus, ist aber sein Fehler.', 'Black takes your queen. It looks good for him, but it is his mistake.'],
        ['c4f7', 'Läufer schlägt f7 mit Schach. Der König hat nur ein Feld.', 'Bishop takes f7 with check. The king has only one square.'],
        ['e8e7', 'Der König muss nach e7.', 'The king has to go to e7.'],
        ['c3d5', 'Springer d5 ist Matt! Zwei Springer und ein Läufer sperren alle Felder.', 'Knight d5 is mate! Two knights and a bishop cover every square.']] },
    { id: 'l2', tier: 'learn', ic: '🍽️', me: 'w', opp: 10, lesson: true,
      de: ['Fried-Liver-Angriff', 'Ein Springer-Opfer auf f7 jagt den König nach vorne.', 'Spiele die Züge nach.'], en: ['Fried Liver attack', 'A knight sacrifice on f7 drives the king forward.', 'Play the moves.'],
      line: [
        ['e2e4', 'Mitte besetzen.', 'Take the centre.'], ['e7e5', 'Schwarz spiegelt deinen Zug.', 'Black mirrors your move.'],
        ['g1f3', 'Der Springer greift e5 an.', 'The knight attacks e5.'], ['b8c6', 'Schwarz deckt e5.', 'Black protects e5.'],
        ['f1c4', 'Italienische Eröffnung: der Läufer zielt auf f7.', 'Italian game: the bishop eyes f7.'], ['g8f6', 'Schwarz greift deinen Bauern e4 an.', 'Black attacks your e4 pawn.'],
        ['f3g5', 'Jetzt greifen Springer und Läufer zusammen f7 an.', 'Knight and bishop now hit f7 together.'], ['d7d5', 'Schwarz will mit d5 Platz schaffen.', 'Black wants space with d5.'],
        ['e4d5', 'Du schlägst den Bauern und öffnest die Linie.', 'You take the pawn and open the line.'], ['f6d5', 'Schwarz schlägt zurück. Besser wäre Sa5, das ist der Fehler.', 'Black recaptures. Na5 was better; this is the mistake.'],
        ['g5f7', 'Springer-Opfer auf f7! Er droht gleichzeitig Dame d8 und Turm h8.', 'Knight sacrifice on f7! It threatens queen d8 and rook h8 at once.'], ['e8f7', 'Der König muss nehmen, sonst geht die Dame verloren.', 'The king must take, or the queen is lost.'],
        ['d1f3', 'Schach! Die Dame greift auch den Springer d5 an.', 'Check! The queen also attacks the d5 knight.'], ['f7e6', 'Der König läuft nach vorne.', 'The king runs forward.'],
        ['b1c3', 'Der nächste Angreifer kommt. Schwarz steht jetzt sehr schlecht.', 'The next attacker arrives. Black is in big trouble.']] },
    { id: 'l3', tier: 'learn', ic: '🐴', me: 'b', opp: 10, lesson: true,
      de: ['Blackburne-Shilling-Falle', 'Du bist Schwarz: Weiß nimmt einen vergifteten Bauern und du setzt mit dem Springer matt.', 'Spiele die Züge nach.'], en: ['Blackburne-Shilling trap', 'You are Black: White grabs a poisoned pawn and you mate with the knight.', 'Play the moves.'],
      line: [
        ['e2e4', 'Weiß eröffnet.', 'White opens.'], ['e7e5', 'Du antwortest in der Mitte.', 'You answer in the centre.'],
        ['g1f3', 'Weiß greift e5 an.', 'White attacks e5.'], ['b8c6', 'Du deckst e5.', 'You protect e5.'],
        ['f1c4', 'Weiß zielt auf f7.', 'White eyes f7.'], ['c6d4', 'Der Fallenzug! Der Springer greift f3 an und bietet e5 an.', 'The trap move! The knight attacks f3 and offers e5.'],
        ['f3e5', 'Weiß schlägt den Bauern. Das ist der Fehler.', 'White takes the pawn. That is the mistake.'], ['d8g5', 'Die Dame greift e5 und g2 gleichzeitig an.', 'The queen hits e5 and g2 at once.'],
        ['e5f7', 'Weiß schlägt f7 und droht dir die Dame und den Turm zu nehmen.', 'White takes f7, threatening your queen and rook.'], ['g5g2', 'Du schlägst g2 und greifst den Turm h1 an.', 'You take g2 and attack the h1 rook.'],
        ['h1f1', 'Der Turm weicht aus.', 'The rook steps aside.'], ['g2e4', 'Schach! Dame schlägt e4.', 'Check! Queen takes e4.'],
        ['c4e2', 'Der Läufer blockt das Schach.', 'The bishop blocks the check.'], ['d4f3', 'Springer f3 ist Matt! Der König wird von seinen eigenen Figuren eingesperrt.', 'Knight f3 is mate! The king is boxed in by his own pieces.']] },
    { id: 'l4', tier: 'learn', ic: '🐘', me: 'b', opp: 10, lesson: true,
      de: ['Elefantenfalle', 'Du bist Schwarz: Ein geschenkter Bauer kostet Weiß die Dame-Verteidigung.', 'Spiele die Züge nach.'], en: ['Elephant trap', 'You are Black: a free pawn costs White a piece.', 'Play the moves.'],
      line: [
        ['d2d4', 'Weiß eröffnet mit dem Damenbauern.', 'White opens with the queen\'s pawn.'], ['d7d5', 'Du hältst die Mitte.', 'You hold the centre.'],
        ['c2c4', 'Das Damengambit.', 'The Queen\'s Gambit.'], ['e7e6', 'Du deckst d5 solide.', 'You protect d5 solidly.'],
        ['b1c3', 'Weiß entwickelt einen Springer.', 'White develops a knight.'], ['g8f6', 'Du entwickelst auch.', 'You develop too.'],
        ['c1g5', 'Der Läufer fesselt deinen Springer f6 an die Dame.', 'The bishop pins your f6 knight to the queen.'], ['b8d7', 'Wichtig: Springer nach d7 stellt die Falle.', 'Key move: knight to d7 sets the trap.'],
        ['c4d5', 'Weiß schlägt d5.', 'White captures d5.'], ['e6d5', 'Du schlägst zurück.', 'You recapture.'],
        ['c3d5', 'Weiß nimmt den Bauern. Der Fehler: Er sieht deine Antwort nicht.', 'White takes the pawn. The mistake: he misses your reply.'], ['f6d5', 'Du schlägst den Springer. Dein Springer war gar nicht gefesselt.', 'You take the knight. Yours was never really pinned.'],
        ['g5d8', 'Weiß nimmt deine Dame. Jetzt kommt dein Schach.', 'White takes your queen. Now comes your check.'], ['f8b4', 'Schach! Der Läufer gewinnt die Figur zurück.', 'Check! The bishop wins material back.'],
        ['d1d2', 'Weiß blockt mit der Dame.', 'White blocks with the queen.'], ['b4d2', 'Du schlägst die Dame, mit Schach.', 'You take the queen, with check.'],
        ['e1d2', 'Weiß schlägt zurück.', 'White recaptures.'], ['e8d8', 'Du schlägst den Läufer d8. Am Ende hast du eine Figur mehr.', 'You take the d8 bishop. You end a piece up.']] },
    { id: 'l5', tier: 'learn', ic: '🏯', me: 'w', opp: 10, lesson: true,
      de: ['Kurze Rochade', 'König in Sicherheit, Turm ins Spiel.', 'Bringe den König mit der kurzen Rochade in Sicherheit.'], en: ['Kingside castling', 'King to safety, rook into play.', 'Castle kingside.'],
      line: [
        ['e2e4', 'Mitte besetzen.', 'Take the centre.'], ['e7e5', 'Schwarz spiegelt.', 'Black mirrors.'],
        ['g1f3', 'Der Springer macht den Platz zwischen König und Turm frei.', 'The knight clears space between king and rook.'], ['b8c6', 'Schwarz entwickelt.', 'Black develops.'],
        ['f1c4', 'Auch der Läufer geht weg. Jetzt sind f1 und g1 frei.', 'The bishop leaves too. f1 and g1 are free.'], ['f8c5', 'Schwarz entwickelt den Läufer.', 'Black develops the bishop.'],
        ['e1g1', 'Kurze Rochade: Der König geht zwei Felder, der Turm springt auf f1. Das geht nur, wenn beide noch nie gezogen haben.', 'Castling: the king moves two squares, the rook jumps to f1. Only if neither has moved.']] },
    { id: 'l6', tier: 'learn', ic: '🏰', me: 'w', opp: 10, lesson: true,
      de: ['Lange Rochade', 'Die Rochade auf der Damenseite braucht drei freie Felder.', 'Rochiere nach links.'], en: ['Queenside castling', 'Castling on the queen side needs three empty squares.', 'Castle queenside.'],
      line: [
        ['d2d4', 'Weiß eröffnet mit d4.', 'White opens with d4.'], ['d7d5', 'Schwarz hält die Mitte.', 'Black holds the centre.'],
        ['b1c3', 'Springer raus. b1 wird frei.', 'Knight out. b1 is free.'], ['g8f6', 'Schwarz entwickelt.', 'Black develops.'],
        ['c1f4', 'Läufer raus. c1 wird frei.', 'Bishop out. c1 is free.'], ['e7e6', 'Schwarz macht Platz.', 'Black makes room.'],
        ['d1d2', 'Dame raus. d1 wird frei, jetzt sind b1, c1 und d1 leer.', 'Queen out. b1, c1 and d1 are empty.'], ['f8e7', 'Schwarz macht sich fertig.', 'Black gets ready.'],
        ['e1c1', 'Lange Rochade: König nach c1, Turm nach d1. Der König ist sicher, der Turm steht gleich in der Mitte.', 'Long castling: king to c1, rook to d1.']] }
  ];
  LESSONS.forEach(function(l){ l.rules = {}; });
  D = LESSONS.concat(D);
  var BY = {}; D.forEach(function(d){ BY[d.id] = d; });
  var PN = { K: ['König', 'king'], Q: ['Dame', 'queen'], R: ['Turm', 'rook'], B: ['Läufer', 'bishop'], N: ['Springer', 'knight'], P: ['Bauer', 'pawn'] };
  var pn = function(t){ return PN[t][lang() === 'en' ? 1 : 0]; };
  var ART = { K: 'den', Q: 'die', R: 'den', B: 'den', N: 'den', P: 'den' }, POSS = { K: 'deinen', Q: 'deine', R: 'deinen', B: 'deinen', N: 'deinen', P: 'deinen' };
  var pnDat = function(t){ return lang() === 'en' ? PN[t][1] : (t === 'P' ? 'Bauern' : PN[t][0]); };
  var cur = null, prevOpp = null, hud = null, hudT = null;

  function doneMap(){ try{ return JSON.parse(localStorage.getItem('bp_ch_done') || '{}') || {}; }catch(e){ return {}; } }
  function saveDone(m){ try{ localStorage.setItem('bp_ch_done', JSON.stringify(m)); }catch(e){} }
  function countDone(){ var m = doneMap(); return D.filter(function(d){ return m[d.id]; }).length; }
  function txt(d, i){ var a = d[lang()]; return a && a[i] || ''; }

  // ---------- Stellung bauen ----------
  function parse(str){
    var b = []; for(var r = 0; r < 8; r++){ b.push([null, null, null, null, null, null, null, null]); }
    str.trim().split(/\s+/).forEach(function(s){
      var col = s[0], t = s[1], c = FILES.indexOf(s[2]), r2 = 8 - parseInt(s[3], 10);
      var start = (t === 'P') && ((col === 'w' && r2 === 6) || (col === 'b' && r2 === 1));
      b[r2][c] = { t: t, col: col, moved: !start };
    });
    return b;
  }
  function replay(list){
    var b = initBoard(), turn = 'w', last = null;
    list.forEach(function(s){
      var ms = getAllLegalMoves(b, turn, last), m = null;
      for(var i = 0; i < ms.length; i++){ var x = ms[i]; if(FILES[x.fc] + (8 - x.fr) + FILES[x.tc] + (8 - x.tr) === s){ m = x; break; } }
      if(!m) throw new Error('Zug nicht erlaubt: ' + s);
      b = applyMove(b, m); last = m; turn = turn === 'w' ? 'b' : 'w';
    });
    return { board: b, turn: turn, last: last };
  }
  function build(d){
    if(d.from){ return replay(d.from); }
    if(d.pos){ return { board: parse(d.pos), turn: 'w', last: null }; }
    var b = initBoard();
    for(var r = 0; r < 8; r++) for(var c = 0; c < 8; c++){
      var p = b[r][c]; if(!p || p.col !== d.me) continue;
      if(d.drop && d.drop.indexOf(p.t) >= 0) b[r][c] = null;
      if(d.keep && d.keep.indexOf(p.t) < 0) b[r][c] = null;
    }
    return { board: b, turn: 'w', last: null };
  }

  // ---------- Haken fuer index.html ----------
  var api = {
    list: D, tiers: TIERS,
    active: function(){ return !!cur; },
    cfg: function(){ return cur; },
    me: function(){ return cur ? cur.me : 'w'; },
    setup: function(g){
      if(!cur.pos && !cur.from && !cur.line){ OPP = Math.max(0, Math.min(29, cur.opp + Math.floor(Math.random() * 3) - 1)); } // jeder Versuch: etwas anderer Gegner
      var s = build(cur); g.board = s.board; g.turn = s.turn; g.last = s.last;
      g.counted = true; g.ladderCounted = true; // zaehlt weder fuer Bilanz noch fuer die Gegner-Leiter
      g.ch = { li: 0, msg: '', moves: 0, promos: 0, pawnCaps: 0, castled: false, lost: null, lastType: null, t0: 0 };
      this.paint();
    },
    block: function(mv){ // Zug verbieten (z. B. Dame darf nicht ziehen)
      if(cur && cur.line){
        var ex = cur.line[G.ch.li]; if(!ex) return null;
        if(FILES[mv.fc] + (8 - mv.fr) + FILES[mv.tc] + (8 - mv.tr) !== ex[0]) return lang() === 'en' ? 'Not the lesson move. Wanted: ' + ex[0].slice(0, 2) + ' → ' + ex[0].slice(2, 4) : 'Das ist nicht der Lernzug. Gesucht: ' + ex[0].slice(0, 2) + ' → ' + ex[0].slice(2, 4);
        return null;
      }
      var r = cur && cur.rules, p = G.board[mv.fr][mv.fc];
      if(r && r.noMove && p && r.noMove.indexOf(p.t) >= 0){
        return lang() === 'en' ? 'Not allowed in this challenge: you may not move the ' + pn(p.t) + '.' : 'In dieser Challenge darfst du ' + ART[p.t] + ' ' + pn(p.t) + ' nicht bewegen.';
      }
      return null;
    },
    note: function(mv, mover, captured, byPlayer){ // Zaehler nach jedem Zug
      var c = G.ch; if(!c) return;
      if(cur.line && cur.line[c.li]){ c.msg = cur.line[c.li][lang() === 'en' ? 2 : 1]; c.li++; }
      if(byPlayer){
        if(!c.t0) c.t0 = Date.now();
        c.moves++; c.lastType = mover.t;
        if(mv.castle) c.castled = true;
        if(mv.promTo) c.promos++;
        if(captured === 'P') c.pawnCaps++;
      } else if(captured && cur.rules.noLoss && cur.rules.noLoss.indexOf(captured) >= 0 && !c.lost){
        c.lost = captured;
      }
    },
    lessonMove: function(){
      var ex = cur && cur.line && cur.line[G.ch.li]; if(!ex) return null;
      var ms = getAllLegalMoves(G.board, G.turn, G.last);
      for(var i = 0; i < ms.length; i++){ var x = ms[i]; if(FILES[x.fc] + (8 - x.fr) + FILES[x.tc] + (8 - x.tr) === ex[0]) return x; }
      return null;
    },
    hint: function(){
      var ex = cur && cur.line && cur.line[G.ch.li]; if(!ex) return;
      api.toast((lang() === 'en' ? 'Move: ' : 'Ziehe: ') + ex[0].slice(0, 2) + ' → ' + ex[0].slice(2, 4), true);
    },
    verdict: function(){
      if(cur.line && G.ch.li >= cur.line.length) return { result: 'win', why: '', ch: { ok: true, msg: lang() === 'en' ? 'Lesson finished.' : 'Lektion abgeschlossen.' } }; // sofortiges Ergebnis mitten in der Partie (das Spiel laeuft sonst weiter)
      var r = cur.rules, c = G.ch, de = lang() !== 'en';
      if(c.lost) return { result: 'loss', why: de ? 'Figur verloren' : 'Piece lost', ch: { ok: false, msg: de ? 'Du hast ' + POSS[c.lost] + ' ' + pn(c.lost) + ' verloren. In dieser Challenge darfst du keine Figur verlieren.' : 'You lost your ' + pn(c.lost) + '. You may not lose a piece in this challenge.' } };
      if(r.promote && c.promos >= r.promote) return { result: 'win', why: de ? 'Umwandlungen geschafft' : 'Promotions done', ch: { ok: true, msg: de ? c.promos + ' Bauern umgewandelt.' : c.promos + ' pawns promoted.' } };
      if(r.capPawns && c.pawnCaps >= r.capPawns) return { result: 'win', why: de ? 'Alle Bauern geschlagen' : 'All pawns captured', ch: { ok: true, msg: de ? 'Alle ' + r.capPawns + ' Bauern geschlagen.' : 'All ' + r.capPawns + ' pawns captured.' } };
      if(r.maxMoves && c.moves >= r.maxMoves) return { result: 'loss', why: de ? 'Zu viele Züge' : 'Too many moves', ch: { ok: false, msg: de ? 'Du hattest ' + r.maxMoves + (r.maxMoves === 1 ? ' Zug' : ' Züge') + ' Zeit, das Matt ist nicht gefallen.' : 'You had ' + r.maxMoves + (r.maxMoves === 1 ? ' move' : ' moves') + ' and did not mate.' } };
      return null;
    },
    finalize: function(res){ // Ergebnis am Spielende bewerten
      if(res.ch) return res;
      if(cur.line && res.result === 'win') return { result: 'win', why: res.why, ch: { ok: true, msg: lang() === 'en' ? 'Lesson finished.' : 'Lektion abgeschlossen.' } };
      var r = cur.rules, c = G.ch, de = lang() !== 'en', fail = function(m){ return { result: 'loss', why: res.why, ch: { ok: false, msg: m } }; };
      if(res.result !== 'win'){
        return fail(res.result === 'draw' ? (de ? 'Unentschieden zählt nicht. Du musst gewinnen.' : 'A draw does not count. You have to win.') : (de ? 'Du hast die Partie verloren.' : 'You lost the game.'));
      }
      if(r.promote && c.promos < r.promote) return fail(de ? 'Matt gesetzt, aber nur ' + c.promos + ' von ' + r.promote + ' Umwandlungen.' : 'Mate, but only ' + c.promos + ' of ' + r.promote + ' promotions.');
      if(r.capPawns && c.pawnCaps < r.capPawns) return fail(de ? 'Matt gesetzt, aber nur ' + c.pawnCaps + ' von ' + r.capPawns + ' Bauern geschlagen.' : 'Mate, but only ' + c.pawnCaps + ' of ' + r.capPawns + ' pawns captured.');
      if(r.castle && !c.castled) return fail(de ? 'Gewonnen, aber du hast nie rochiert.' : 'Won, but you never castled.');
      if(r.mateWith && c.lastType !== r.mateWith) return fail(de ? 'Matt gesetzt, aber nicht mit dem ' + pnDat(r.mateWith) + '.' : 'Mate, but not with the ' + pn(r.mateWith) + '.');
      if(r.maxMoves && c.moves > r.maxMoves) return fail(de ? 'Zu viele Züge (' + c.moves + ' statt ' + r.maxMoves + ').' : 'Too many moves (' + c.moves + ' instead of ' + r.maxMoves + ').');
      if(r.timeLimit && c.t0 && (Date.now() - c.t0) / 1000 > r.timeLimit) return fail(de ? 'Zu langsam.' : 'Too slow.');
      var ok = { result: 'win', why: res.why, ch: { ok: true, msg: de ? 'In ' + c.moves + (c.moves === 1 ? ' Zug' : ' Zügen') + ' geschafft.' : 'Done in ' + c.moves + (c.moves === 1 ? ' move.' : ' moves.') } };
      return ok;
    },
    endUi: function(res){ // Ende-Fenster anpassen und Fortschritt speichern
      var de = lang() !== 'en', ok = res.ch && res.ch.ok, d = cur;
      var first = false;
      if(ok){
        var m = doneMap(); if(!m[d.id]){ first = true; m[d.id] = { t: Date.now(), m: G.ch.moves }; saveDone(m); } else if(G.ch.moves < (m[d.id].m || 999)){ m[d.id].m = G.ch.moves; saveDone(m); }
        var total = countDone();
        try{ if(window.BpSets && BpSets.noteChallenges) BpSets.noteChallenges(total); }catch(e){}
        if(first){
          try{ window.bpNotify && window.bpNotify({ icon: '🎯', title: de ? 'Challenge geschafft' : 'Challenge complete', text: txt(d, 0), color: '#7cff8c' }); }catch(e){}
          var tierDone = D.filter(function(x){ return x.tier === d.tier && !doneMap()[x.id]; }).length === 0;
          if(tierDone){ var T = TIERS.filter(function(t){ return t.id === d.tier; })[0]; setTimeout(function(){ try{ window.bpNotify && window.bpNotify({ icon: T.ic, title: de ? 'Stufe komplett' : 'Tier complete', text: (de ? T.de : T.en) + (de ? ': alle Challenges geschafft' : ': all challenges done'), color: '#ffd45a' }); }catch(e){} }, 1800); }
        }
      }
      document.getElementById('endTitle').textContent = (ok ? '🎯 ' : '❌ ') + (ok ? (cur.line ? (de ? 'Lektion geschafft!' : 'Lesson complete!') : (de ? 'Challenge geschafft!' : 'Challenge complete!')) : (de ? 'Nicht geschafft' : 'Not completed'));
      var t = document.getElementById('endText'); t.style.whiteSpace = 'pre-line';
      t.textContent = txt(d, 0) + '\n' + (res.ch ? res.ch.msg : '') + (ok ? '' : '\n' + (txt(d, 2) ? (de ? 'Tipp: ' : 'Tip: ') + txt(d, 2) : (de ? 'Versuch es noch einmal.' : 'Try again.')));
      document.getElementById('endNew').textContent = de ? 'Nochmal' : 'Again';
      var cl = document.getElementById('endClose'); cl.textContent = de ? 'Challenges' : 'Challenges';
      cl.onclick = function(){ document.getElementById('endOv').classList.remove('show'); api.open(); };
      var row = document.getElementById('endNew').parentNode, old = document.getElementById('chNext'); if(old) old.remove();
      var idx = D.indexOf(d), nx = null;
      for(var i = idx + 1; i < D.length; i++){ if(!doneMap()[D[i].id]) { nx = D[i]; break; } }
      if(ok && nx){ var b = document.createElement('button'); b.id = 'chNext'; b.className = 'btn primary'; b.textContent = (de ? 'Nächste ➜' : 'Next ➜'); b.onclick = function(){ document.getElementById('endOv').classList.remove('show'); api.start(nx.id); }; row.insertBefore(b, row.firstChild); }
    },
    start: function(id){
      if(!BY[id]) return;
      if(!cur) prevOpp = OPP;
      cur = BY[id]; OPP = cur.opp;
      var ov = document.getElementById('chMenu'); if(ov) ov.remove();
      var old = document.getElementById('chNext'); if(old) old.remove();
      buildUi(); newGame();
    },
    exit: function(){
      if(!cur) return;
      cur = null; OPP = prevOpp; var old = document.getElementById('chNext'); if(old) old.remove();
      if(hud){ hud.remove(); hud = null; }
      document.getElementById('endClose').onclick = function(){ document.getElementById('endOv').classList.remove('show'); };
      buildUi(); newGame();
    },
    toast: function(m, good){
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:99990;background:' + (good ? '#10281a' : '#2a1020') + ';border:1.5px solid ' + (good ? '#7cff8c' : '#ff6b81') + ';color:#fff;padding:12px 16px;border-radius:14px;font-weight:700;max-width:86vw;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.5)';
      document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 2200);
    },
    paint: function(){
      var lr = document.getElementById('ladderRow'), ub = document.getElementById('undoBtn'), eb = document.getElementById('eloBar');
      var ob0 = document.getElementById('oppBar'); if(ob0) ob0.style.display = cur ? 'none' : '';
      if(!cur){ if(lr) lr.style.display = ''; if(ub) ub.style.display = ''; if(eb) eb.style.display = ''; if(hud){ hud.remove(); hud = null; } return; }
      if(lr) lr.style.display = 'none'; if(ub) ub.style.display = 'none'; if(eb) eb.style.display = 'none';
      var de = lang() !== 'en', r = cur.rules, c = (typeof G !== 'undefined' && G && G.ch) || { moves: 0, promos: 0, pawnCaps: 0, castled: false, t0: 0 };
      if(!hud){ hud = document.createElement('div'); hud.id = 'chHud'; hud.style.cssText = 'margin:8px 0;padding:10px 12px;border:1.5px solid rgba(255,212,90,.55);border-radius:14px;background:linear-gradient(135deg,rgba(255,212,90,.12),rgba(124,255,140,.06));text-align:left';
        var ob = document.getElementById('oppBar'); ob.parentNode.insertBefore(hud, ob); }
      var bits = [];
      if(r.maxMoves) bits.push((de ? 'Züge ' : 'Moves ') + c.moves + '/' + r.maxMoves);
      if(r.timeLimit){ var left = c.t0 ? Math.max(0, r.timeLimit - Math.floor((Date.now() - c.t0) / 1000)) : r.timeLimit; bits.push('⏱ ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0')); }
      if(r.promote) bits.push((de ? 'Umwandlungen ' : 'Promotions ') + Math.min(c.promos, r.promote) + '/' + r.promote);
      if(r.capPawns) bits.push((de ? 'Bauern ' : 'Pawns ') + Math.min(c.pawnCaps, r.capPawns) + '/' + r.capPawns);
      if(r.noMove) bits.push('🚫 ' + r.noMove.map(pn).join(', '));
      if(r.noLoss) bits.push('🛡 ' + (de ? 'keine Figur verlieren' : 'lose no piece'));
      if(r.castle) bits.push('🏯 ' + (de ? 'Rochade nötig' : 'castling required') + (c.castled ? ' ✓' : ''));
      if(r.mateWith) bits.push((de ? 'Matt mit dem ' : 'Mate with the ') + pnDat(r.mateWith));
      hud.innerHTML = '<div style="display:flex;align-items:center;gap:8px;justify-content:space-between"><b style="font-size:15px">🎯 ' + txt(cur, 0) + '</b><span><button id="chList" class="btn" style="padding:4px 10px;font-size:12px">' + (de ? 'Liste' : 'List') + '</button> <button id="chExit" class="btn" style="padding:4px 10px;font-size:12px">' + (de ? 'Beenden' : 'Quit') + '</button></span></div>'
        + '<div style="font-size:13px;margin-top:4px">' + txt(cur, 1) + '</div>'
        + (cur.line ? '<div style="font-size:14px;margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(124,255,140,.1);border:1px solid rgba(124,255,140,.35)">📖 ' + (c.msg || txt(cur, 2)) + ' <button id="chHint" class="btn" style="padding:3px 10px;font-size:12px;margin-left:6px">' + (de ? 'Tipp' : 'Hint') + '</button></div>' : '')
        + (bits.length ? '<div style="font-size:12px;margin-top:4px;color:#ffd45a;font-weight:700">' + bits.join(' · ') + '</div>' : '');
      var hb = document.getElementById('chHint'); if(hb) hb.onclick = function(){ api.hint(); };
      document.getElementById('chExit').onclick = function(){ api.exit(); };
      document.getElementById('chList').onclick = function(){ api.open(); };
    },
    open: function(tierId){
      var de = lang() !== 'en', old = document.getElementById('chMenu'); if(old) old.remove();
      var m = doneMap(), tab = tierId || (cur ? cur.tier : null);
      if(!tab){ tab = 'basic'; for(var i = 0; i < TIERS.length; i++){ var left = D.filter(function(x){ return x.tier === TIERS[i].id && !m[x.id]; }).length; if(left){ tab = TIERS[i].id; break; } } }
      var ov = document.createElement('div'); ov.id = 'chMenu';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99980;background:#0b1024;overflow:auto;color:#fff;font-family:system-ui,sans-serif;padding:14px;-webkit-overflow-scrolling:touch';
      var h = '<div style="max-width:560px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:22px">🎯 Challenges</b><button id="chClose" class="btn" style="padding:6px 14px">' + (de ? 'Schließen' : 'Close') + '</button></div>'
        + '<div style="opacity:.75;font-size:13px;margin:4px 0 10px">' + countDone() + ' / ' + D.length + (de ? ' geschafft. Aufgaben und Regeln, die zeigen, wie gut du wirklich spielst.' : ' completed. Tasks and rules that show how good you really are.') + '</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
      TIERS.forEach(function(t){ var n = D.filter(function(x){ return x.tier === t.id; }), dn = n.filter(function(x){ return m[x.id]; }).length;
        h += '<button data-tab="' + t.id + '" style="padding:8px 12px;border-radius:12px;border:1.5px solid ' + (tab === t.id ? '#ffd45a' : 'rgba(255,255,255,.2)') + ';background:' + (tab === t.id ? 'rgba(255,212,90,.15)' : 'transparent') + ';color:#fff;font-weight:700;cursor:pointer">' + t.ic + ' ' + (de ? t.de : t.en) + ' ' + dn + '/' + n.length + '</button>'; });
      h += '</div>';
      D.filter(function(x){ return x.tier === tab; }).forEach(function(x){
        var dn = !!m[x.id];
        h += '<div data-ch="' + x.id + '" style="display:flex;gap:12px;align-items:center;padding:12px;margin:8px 0;border-radius:14px;border:1.5px solid ' + (dn ? 'rgba(124,255,140,.5)' : 'rgba(255,255,255,.15)') + ';background:' + (dn ? 'rgba(124,255,140,.07)' : 'rgba(255,255,255,.04)') + ';cursor:pointer">'
          + '<div style="font-size:30px;width:40px;text-align:center">' + x.ic + '</div><div style="flex:1;min-width:0"><b>' + txt(x, 0) + '</b><div style="font-size:13px;opacity:.8;margin-top:2px">' + txt(x, 1) + '</div></div>'
          + '<div style="font-size:20px">' + (dn ? '✅' : '➜') + '</div></div>';
      });
      h += '</div>'; ov.innerHTML = h; document.body.appendChild(ov);
      ov.querySelector('#chClose').onclick = function(){ ov.remove(); };
      ov.querySelectorAll('[data-tab]').forEach(function(b){ b.onclick = function(){ api.open(b.getAttribute('data-tab')); }; });
      ov.querySelectorAll('[data-ch]').forEach(function(b){ b.onclick = function(){ api.start(b.getAttribute('data-ch')); }; });
    },
    count: countDone
  };
  // Zeitlimit und Anzeige
  hudT = setInterval(function(){
    if(!cur || typeof G === 'undefined' || !G || G.over) return;
    var r = cur.rules, c = G.ch; if(!c) return;
    if(r.timeLimit && c.t0 && (Date.now() - c.t0) / 1000 > r.timeLimit){
      var de = lang() !== 'en';
      finish({ result: 'loss', why: de ? 'Zeit abgelaufen' : 'Out of time', ch: { ok: false, msg: de ? 'Die Zeit ist abgelaufen.' : 'Time ran out.' } }); return;
    }
    if(r.timeLimit) api.paint();
  }, 500);
  window.BpCh = api;
  try{ if(/[?&]ch=1/.test(location.search)) window.addEventListener('load', function(){ setTimeout(function(){ api.open(); }, 300); }); }catch(e){}
})();
