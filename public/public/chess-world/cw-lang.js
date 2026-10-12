/* Chess World – Englische Übersetzung (läuft nur, wenn die Spielsprache nicht Deutsch ist).
   Ersetzt bekannte deutsche Textteile im fertigen Seitentext (längste Treffer zuerst). */
(function(){
  var lang='en'; try{ lang=localStorage.getItem('wq_lang')||'en'; }catch(e){}
  window.CW_LANG=lang;
  if(lang==='de') return;
  var D=[].concat([
// ---- Figuren & Ränge ----
['Abenteurer','Adventurer'],['Söldner','Mercenary'],['Ritter','Knight'],['Elite-Ritter','Elite Knight'],['Königsgarde','Royal Guard'],
['Steinwächter','Stone Guardian'],['Felskrieger','Rock Warrior'],['Eisenkoloss','Iron Colossus'],['Runengolem','Rune Golem'],['Titan der Festung','Titan of the Fortress'],
['Schattenläufer','Shadow Runner'],['Meuchelmörder','Assassin'],['Schattenklinge','Shadow Blade'],['Phantomassassine','Phantom Assassin'],['Meister der Schatten','Master of Shadows'],
['Lehrling','Apprentice'],['Paladin','Paladin'],['Ordensritter','Order Knight'],['Heiligkrieger','Holy Warrior'],['Champion des Lichts','Champion of Light'],
['Zauberin','Sorceress'],['Elementar-Magierin','Elemental Mage'],['Erzmagierin','Archmage'],['Arkanmeisterin','Arcane Mistress'],['Göttliche Erzmagierin','Divine Archmage'],
['Anführer','Leader'],['Kriegsherr','Warlord'],['Großkommandant','Grand Commander'],['Kaiser','Emperor'],['Legendärer König','Legendary King'],
['Schwertkämpfer','Swordsman'],['Schildträger','Shield Bearer'],['Dolchträger','Dagger Bearer'],['Magier','Mage'],['Feuer','Fire'],['Wasser','Water'],['Erde','Earth'],['Luft','Air'],['Schatten','Shadow'],['Licht','Light'],['Vita','Vita'],['Physisch','Physical'],['Gezeiten','Tides'],
['Bauern','Pawns'],['Bauer','Pawn'],['Türme','Rooks'],['Turm','Rook'],['Springer','Knight'],['Läufer','Bishop'],['Damen','Queens'],['Dame','Queen'],['König','King'],['Königs','King\'s'],
['Figur(en)','piece(s)'],['Figuren','Pieces'],['Figur','Piece'],['Nachbarfigur','adjacent piece'],['Nachbarfiguren','adjacent pieces'],['Gegnerfigur','enemy piece'],
['Rang','Rank'],['Ränge','Ranks'],['Rang-','Rank '],
// ---- Navigation / Titel ----
['AKTUELLER RANG','CURRENT RANK'],['MEINE SPIELE','MY GAMES'],['RANG-LEITER','RANK LADDER'],['ZUGLOG','MOVE LOG'],['SPIELEN','PLAY'],['SAMMLUNG','COLLECTION'],['RANG','RANK'],
['WÄHLE DEINE FIGUREN','CHOOSE YOUR PIECES'],['Tippe eine Figur um ihren Rang zu wählen — ★ markiert seltene Figuren','Tap a piece to choose its rank — ★ marks rare pieces'],
['INVENTAR — Tippe für Rang-Details','INVENTORY — tap for rank details'],['RANG-ÜBERSICHT — Tippe für Details','RANK OVERVIEW — tap for details'],
['BEIM AUFWERTEN BEKOMMST DU','WHEN UPGRADING YOU GET'],['SCHLIESSEN','CLOSE'],['Lade...','Loading...'],['FIGUR WÄHLEN','CHOOSE PIECE'],['MAGIERIN WÄHLEN','CHOOSE MAGE'],
['KI schlug:','AI captured:'],['Du schlugst:','You captured:'],['Noch keine Spiele gespielt.','No games played yet.'],['Serie:','Streak:'],
['Neu spielen','New game'],['Neu auswählen','Choose again'],['Analyse','Analysis'],['AUFGESTIEGEN!','PROMOTED!'],['ABGESTIEGEN:','DEMOTED:'],
['Warnung! Noch 1 Niederlage → Abstieg','Warning! 1 more loss → demotion'],['Noch 1 Niederlage → Abstieg!','1 more loss → demotion!'],
// ---- Kisten / Shop ----
['Normale Kiste','Normal Chest'],['Epische Kiste','Epic Chest'],['Legendäre Kiste','Legendary Chest'],['NORMALE KISTE','NORMAL CHEST'],['EPISCHE KISTE','EPIC CHEST'],['LEGENDÄRE KISTE','LEGENDARY CHEST'],
['5–10 Karten','5–10 cards'],['10 Karten · 5× Rang 1 fix','10 cards · 5× Rank 1 guaranteed'],['16 Karten · Rang 4–5 fix','16 cards · Rank 4–5 guaranteed'],
['1× fix + 80%','1× guaranteed + 80%'],['5× fix','5× guaranteed'],['10× fix','10× guaranteed'],['ÖFFNEN','OPEN'],['ÖFFNE KISTE...','OPENING CHEST...'],['KISTE GEÖFFNET','CHEST OPENED'],
['Rang 1+2 garantiert · Rang 4-5 sicher','Rank 1+2 guaranteed · Rank 4-5 certain'],['Legendär','Legendary'],['Karten','cards'],['Münzen','coins'],['Münze','coin'],
['Nicht genug Münzen! Benötigt: ','Not enough coins! Needed: '],['Nicht genug Münzen! (','Not enough coins! ('],['Nicht genug Schlüssel!','Not enough keys!'],['Schlüssel kaufen','Buy keys'],['Schlüssel','Keys'],
['Tageslimit für Gratis-Schlüssel erreicht','Daily limit for free keys reached'],['Bitte in Brain Pulse einloggen.','Please log in to Brain Pulse.'],['Bitte in Brain Pulse einloggen, um Schlüssel zu nutzen.','Please log in to Brain Pulse to use keys.'],
['Keine Verbindung zum Server.','No connection to the server.'],['Inventar vom Server wiederhergestellt','Inventory restored from server'],
['Brain-Pulse-Münzen: ','Brain Pulse coins: '],['Brain-Pulse-Münzen gibt es im Brain-Pulse-Shop.','Brain Pulse coins are available in the Brain Pulse shop.'],[' · Schlüssel: ',' · Keys: '],[' · Gratis-Schlüssel heute noch: ',' · Free keys left today: '],
['Schlüssel gekauft','Keys purchased'],['Bereits gekauft!','Already purchased!'],['freigeschaltet!','unlocked!'],['Besitz','Owned'],['Figuren-Skins','Piece Skins'],['SHOP-SETS','SHOP SETS'],['Im Shop kaufen','Buy in the shop'],
['Drachen-Set','Dragon Set'],['Dschungel-Set','Jungle Set'],['Ozean-Set','Ocean Set'],['Weltraum-Set','Space Set'],['Bronze-Set','Bronze Set'],['Silber-Set','Silver Set'],['Gold-Set','Gold Set'],['Platin-Set','Platinum Set'],['Diamant-Set','Diamond Set'],['Meister-Set','Master Set'],['Grandmeister-Set','Grandmaster Set'],['Legenden-Set','Legend Set'],
// ---- Skins ----
['Standard','Standard'],['Amateur','Amateur'],['Silber','Silver'],['Platin','Platinum'],['Diamant','Diamond'],['Meister','Master'],['Grandmeister','Grandmaster'],['Legende','Legend'],['Drachen','Dragon'],['Dschungel','Jungle'],
['✓ Aktiv','✓ Active'],['Antippen zum Aktivieren','Tap to activate'],['Rang erforderlich','Rank required'],['BRETT','BOARD'],['FIGUREN','PIECES'],
// ---- Ränge/Status ----
['Anfänger','Beginner'],['Leicht','Easy'],['Mittel','Medium'],['Experte','Expert'],['Stark','Strong'],[' KI-Stärke: ',' AI strength: '],['KI-Stärke: ','AI strength: '],[', Fehlerrate ',', error rate '],['Tiefe','depth'],
['Dein Zug — Wähle eine Figur','Your move — choose a piece'],['Extra-Zug! Wähle eine Figur','Extra move! Choose a piece'],['KI denkt…','AI is thinking…'],['Zeit abgelaufen! KI zieht...','Time is up! AI is moving...'],
['SCHACHMATT! Du gewinnst!','CHECKMATE! You win!'],['PATT-SIEG! Du gewinnst!','STALEMATE WIN! You win!'],['SCHACHMATT! KI gewinnt!','CHECKMATE! AI wins!'],['PATT! Unentschieden.','STALEMATE! Draw.'],
['SCHACH! Dein König steht im Schach!','CHECK! Your king is in check!'],['SCHACH! KI-König im Schach!','CHECK! AI king is in check!'],['KI gibt auf! Du gewinnst! 🏳️','AI resigns! You win! 🏳️'],['🏳️ KI gibt auf — die Lage ist hoffnungslos!','🏳️ AI resigns — the position is hopeless!'],
['❄️ KI-Zug blockiert! (Festung)','❄️ AI move blocked! (Fortress)'],[' trifft deinen König! KI gewinnt!',' hits your king! AI wins!'],
['⚔️ KI-Bauern rücken vor! ','⚔️ AI pawns advance! '],[' Bauern vorrückten!',' pawns advanced!'],['⚔️ KI-Bauer','⚔️ AI Pawn'],['🏰 KI-Turm: Schutzwall-Angriff! ','🏰 AI Rook: Rampart attack! '],[' Figuren vernichtet!',' pieces destroyed!'],['🏰 KI-Turm','🏰 AI Rook'],
['✨ KI-Springer: Arkaner Sprung! ','✨ AI Knight: Arcane Leap! '],[' ausgeschaltet!',' eliminated!'],['✨ KI-Springer','✨ AI Knight'],['🗡 KI-Läufer: Dolchstoß! ','🗡 AI Bishop: Dagger Strike! '],[' Figur(en) ausgeschaltet!',' piece(s) eliminated!'],['🗡 KI-Läufer','🗡 AI Bishop'],
['🔥 KI-Dame: Feuerball! ','🔥 AI Queen: Fireball! '],['🔥 KI-Feuerball','🔥 AI Fireball'],['♔ KI-König: Königsbefehl! KI-Figuren sind unschlagbar diesen Zug!','♔ AI King: Royal Command! AI pieces are unbeatable this move!'],
['♟ Schachmatt','♟ Checkmate'],['⚖️ Patt-Sieg','⚖️ Stalemate win'],['🏳️ Aufgabe','🏳️ Resignation'],['⚡ Fähigkeit','⚡ Ability'],['♟ KI-Matt','♟ AI checkmate'],['⚖️ Remis','⚖️ Draw'],['gibt auf','resigns'],[' Züge',' moves'],['Zug(e)','move(s)'],['Züge','moves'],['Zug','move'],
// ---- Fähigkeiten: Meldungen ----
['AKTIV — ','ACTIVE — '],['PASSIV','PASSIVE'],['Bereits eingesetzt','Already used'],['Limit erreicht','Limit reached'],['Nicht verfügbar','Not available'],
['Diese Figur hat ihre Fähigkeit bereits eingesetzt!','This piece has already used its ability!'],['Limit erreicht! Max. 5 Fähigkeiten pro Partie.','Limit reached! Max. 5 abilities per game.'],['Limit erreicht! Max. 5 Fähigkeiten pro Runde.','Limit reached! Max. 5 abilities per round.'],
['Königstausch! König tauscht mit ','King swap! King swaps with '],[' — jetzt noch normal ziehen!',' — now move normally!'],['Schutzwall abgelaufen!','Rampart expired!'],
['Arkaner Sprung! ♘ ','Arcane Leap! ♘ '],['Kein Ziel erreichbar!','No target reachable!'],['Sturmschlag! Bauern schlagen vorwärts + Extra-Zug!','Storm Strike! Pawns capture forward + extra move!'],
['Geisterpfad! Nächster Bauernzug schlägt auch vorwärts!','Ghost Path! Next pawn move captures forward too!'],['Sturmwelle! Alle Bauern schlagen vorwärts + Extra-Zug!','Storm Wave! All pawns capture forward + extra move!'],
['Beförderung! Bauer wird sofort zur Dame!','Promotion! Pawn becomes a queen instantly!'],['Kein Bauer auf dem Brett.','No pawn on the board.'],['Massenbeförderung! ','Mass Promotion! '],[' Bauern werden zur Dame!',' pawns become queens!'],['Keine Bauern mehr übrig.','No pawns left.'],
['Schutzwall! Turm auf ','Rampart! Rook on '],[' unschlagbar (2 Züge)',' unbeatable (2 moves)'],['Doppelwall! Alle ','Double Wall! All '],[' Türme unschlagbar (2 Züge)!',' rooks unbeatable (2 moves)!'],['Kein Turm gefunden.','No rook found.'],
['Festung! Alle ','Fortress! All '],[' Figuren 1 Zug unschlagbar!',' pieces unbeatable for 1 move!'],['Kaiserwall! Türme 3 Züge unschlagbar + KI überspringt Zug!','Imperial Wall! Rooks unbeatable for 3 moves + AI skips a move!'],
['Unsterblichkeit! Alle Figuren 2 Züge unschlagbar + KI pausiert!','Immortality! All pieces unbeatable for 2 moves + AI pauses!'],
['Dolchstoß! ','Dagger Strike! '],['Kein Ziel in Reichweite.','No target in range.'],['Doppeldolch! ','Double Dagger! '],[' Figuren ausgeschaltet!',' pieces eliminated!'],['Präzisionsschlag! ','Precision Strike! '],[' vernichtet!',' destroyed!'],
['Kein Ziel gefunden.','No target found.'],['Diagonalzorn! ','Diagonal Wrath! '],[' Feinde auf den Diagonalen vernichtet!',' enemies on the diagonals destroyed!'],['Keine Feinde auf den Diagonalen.','No enemies on the diagonals.'],
['Schattenhagel! ','Shadow Hail! '],[' stärkste Feinde vernichtet!',' strongest enemies destroyed!'],['Kein Springer auf dem Brett.','No knight on the board.'],['Arkaner Sprung! Klicke einen Springer an!','Arcane Leap! Click a knight!'],
[' Figur(en) verbrannt!',' piece(s) burned!'],['Kein Ziel in Reichweite!','No target in range!'],[' Figur(en) zurückgedrängt!',' piece(s) pushed back!'],[' Zug(e) unschlagbar',' move(s) unbeatable'],[' + Extra-Zug!',' + extra move!'],
['Windstoß! Nochmal ziehen!','Gust! Move again!'],['Sturmböe! 2× Extra-Zug!','Gale! 2× extra move!'],['Wirbelwind! Dame teleportiert + Extra-Zug!','Whirlwind! Queen teleports + extra move!'],['Zyklone! Extra-Zug + alle Figuren aktiv!','Cyclone! Extra move + all pieces active!'],['Zeitschneide! 3 Extra-Züge!','Time Slash! 3 extra moves!'],
['Lebensquell! ','Life Spring! '],[' kehrt zurück!',' returns!'],['Keine Figuren zum Zurückbringen.','No pieces to bring back.'],['Wiedergeburt! ','Rebirth! '],[' Figuren zurückgekehrt!',' pieces returned!'],['Auferstehung! Alle ','Resurrection! All '],[' Figuren zurück!',' pieces back!'],
['Ewiges Leben! Alle ','Eternal Life! All '],[' Figuren zurück + Extra-Zug!',' pieces back + extra move!'],['Extra-Zug!','Extra move!'],[' Figur(en) vernichtet!',' piece(s) destroyed!'],['Kein Ziel gefunden.','No target found.'],['Kein König gefunden!','No king found!'],
['Keine Nachbarfigur zum Tauschen!','No adjacent piece to swap!'],['Königstausch! Wähle eine Nachbarfigur zum Tauschen!','King swap! Choose an adjacent piece to swap!'],['Königsmanöver! Tauschen + Extra-Zug!','Royal Maneuver! Swap + extra move!'],
['Königsaura! König + ','Royal Aura! King + '],[' Nachbarn 1 Zug unschlagbar!',' neighbors unbeatable for 1 move!'],['Königsteleport! König springt auf ','Royal Teleport! King jumps to '],['Kein freies Feld!','No free square!'],['Königszorn! ','Royal Wrath! '],
[' Feinde im Umkreis vernichtet!',' enemies in range destroyed!'],['Keine Feinde in Reichweite.','No enemies in range.'],['Fähigkeit trifft König! Du gewinnst!','Ability hits the king! You win!'],['Fähigkeit eingesetzt! Noch ','Ability used! '],[' übrig.',' left.'],
['Bauernumwandlung! Wähle eine Figur:','Pawn promotion! Choose a piece:'],['UMWANDLUNG','PROMOTION'],[' Umwandlung auf ',' promotion on '],['Fähigkeit','Ability'],['Fähigkeiten','Abilities'],
// ---- Entwickeln / Inventar ----
[' Stück',' pcs'],['Nächster Rang: ','Next rank: '],['Neues Passiv: ','New passive: '],['Zu wenig übrig für Brett (min. ','Too few left for board (min. '],['Zu wenig übrig für das Brett (benötigt: ','Too few left for the board (needed: '],
['ENTWICKELN','UPGRADE'],['MAXIMALER RANG!','MAX RANK!'],['MAXIMALER RANG erreicht!','MAX RANK reached!'],['Entwickelt! ','Upgraded! '],['Entwicklung fehlgeschlagen','Upgrade failed'],['Entwicklung nicht möglich','Upgrade not possible'],
['Max Rang','Max rank'],['× besessen','× owned'],[' noch verfügbar',' still available'],[' POSITION ',' POSITION '],[' Siege',' wins'],['Siege','wins'],['SIEG','WIN'],['NIEDERLAGE','LOSS'],['UNENTSCHIEDEN','DRAW'],
['chest-modal nicht gefunden!','chest-modal not found!'],[' 💰 Münzen!',' 💰 coins!'],['Fehler beim Öffnen: ','Error while opening: '],['Fehler','Error'],
['Gewinne','Win'],['✓ Erhalten!','✓ Claimed!'],['Erhalten','Claimed'],['Abholen!','Claim!'],['Passiv:','Passive:'],['Brett','Board'],
['Bitte warten...','Please wait...'],['Neu spielen','New game'],['Aufgeben','Resign'],['Hinweis','Hint'],['Zurück','Back'],
['AN — Brett zeichnen','ON — draw on board'],['GEDANKEN','THOUGHTS'],
// ---- Zug-Namen / Textteile ----
['Dolchstoß','Dagger Strike'],['Arkaner Sprung','Arcane Leap'],['Geisterpfad','Ghost Path'],['Schutzwall','Rampart'],['Feuerball','Fireball'],['Flutwelle','Tidal Wave'],['Steinwall','Stone Wall'],['Windstoß','Gust'],['Lebensquell','Life Spring'],['Donnerschlag','Thunderclap'],['Königstausch','King Swap'],['Götterzorn','Wrath of the Gods'],
['Blitzschlag','Lightning Strike'],['Sturmschlag','Storm Strike'],['Titanboden','Titan Ground'],['Weltenstein','World Stone'],['Sonnennova','Sun Nova'],['Sintflut','Deluge'],['Tsunami','Tsunami'],['Vernichtung','Annihilation'],['Inferno','Inferno'],['Flammensturm','Firestorm'],['Gottesfeuer','Divine Fire'],['Felsenfestung','Rock Fortress'],['Erdschild','Earth Shield'],['Maelstrom','Maelstrom'],
],[
['Bauer schlägt diesen Zug auch vorwärts.','Pawn also captures forward this move.'],['Turm kann 2 Züge nicht geschlagen werden.','Rook cannot be captured for 2 moves.'],
['Entfernt sofort die wertvollste benachbarte Gegnerfigur.','Instantly removes the most valuable adjacent enemy piece.'],
['R1:2 Zufalls | R2:3 Zufalls | R3:2 wählbar | R4:3 wählbar | R5:5 wählbar (Kurve)','R1:2 random | R2:3 random | R3:2 choosable | R4:3 choosable | R5:5 choosable (curve)'],
['Schlägt alle Gegner im Umkreis von 2 Feldern.','Captures all enemies within 2 squares.'],['Schiebt alle benachbarten Feinde 2 Felder zurück.','Pushes all adjacent enemies back 2 squares.'],
['Alle eigenen Figuren sind 1 Zug unschlagbar.','All your pieces are unbeatable for 1 move.'],['Dame darf sich sofort ein zweites Mal bewegen.','Queen may move a second time immediately.'],
['Bringt die zuletzt geschlagene eigene Figur zurück.','Brings back your most recently captured piece.'],['Entfernt sofort die wertvollste Gegnerfigur auf dem Brett.','Instantly removes the most valuable enemy piece on the board.'],
['Tausche den K00f6nig 1x mit einer Nachbarfigur 2014 danach noch normal ziehen.','Swap the king once with an adjacent piece — then move normally.'],
['Tausche den König 1x mit einer Nachbarfigur — danach noch normal ziehen.','Swap the king once with an adjacent piece — then move normally.'],
['Vorwärts-Schlag: Kann auch geradeaus schlagen','Forward Strike: Can also capture straight ahead'],['Dauersprint: Darf immer 2 Felder ziehen','Perma-Sprint: May always move 2 squares'],
['Schnelle Beförderung: +1 extra Bauer beim Aufwerten','Fast Promotion: +1 extra pawn when upgrading'],['Unaufhaltbar: Kann nicht durch Bauern geschlagen werden','Unstoppable: Cannot be captured by pawns'],
['Startschutz: Beginnt mit 1 Schutzschicht','Starting Shield: Begins with 1 shield layer'],['Festungswall: KI zieht nie zuerst auf den Turm','Fortress Wall: AI never targets the rook first'],
['Doppelschutz: Beginnt mit 2 Schutzschichten','Double Shield: Begins with 2 shield layers'],['Unsterblich: Kehrt 1× nach Schlag zurück','Immortal: Returns 1× after being captured'],
['Schatten-Tritt: 1× pro Spiel orthogonal ziehen','Shadow Step: Move orthogonally 1× per game'],['Durchdringen: Zieht durch eigene Figuren hindurch','Pierce: Moves through your own pieces'],
['Hinterhalt: KI greift Läufer nicht als erstes an','Ambush: AI does not attack the bishop first'],['Farbwechsel: Kann auf allen Feldern ziehen','Color Shift: Can move on all squares'],
['Schutzaura: Startet unschlagbar für 1 Zug','Protective Aura: Starts unbeatable for 1 move'],['Doppel-Fähigkeit: Arkaner Sprung ist 2× nutzbar','Double Ability: Arcane Leap can be used 2×'],
['Gegenangriff: Nach jedem KI-Zug sofort nochmal ziehen','Counterattack: Move again right after every AI move'],['Landungsschlag: Schlägt eine Figur beim Landen','Landing Strike: Captures a piece when landing'],
['Doppel-Fähigkeit: Elementar-Kraft 2× nutzbar','Double Ability: Elemental Power can be used 2×'],['Magischer Schild: Startet unschlagbar für 1 Zug','Magic Shield: Starts unbeatable for 1 move'],
['Erweiterte Reichweite: +2 Felder Fähigkeits-Radius','Extended Range: +2 squares ability radius'],['Zeitloser Angriff: Fähigkeit verbraucht keinen Zug','Timeless Attack: Ability costs no move'],
['Starkes Kommando: Kriegsruf gibt 2 Extra-Züge','Strong Command: War Cry gives 2 extra moves'],['Feldherr: Alle Figuren starten mit 1 Schutzschicht','Field Marshal: All pieces start with 1 shield layer'],
['Kaiserliche Aura: König erste 3 Züge unschlagbar','Imperial Aura: King unbeatable for the first 3 moves'],['Legende: König teleportiert sich bei Schlagversuch','Legend: King teleports when attacked'],
['Geisterpfad — Bauer schlägt diesen Zug auch vorwärts.','Ghost Path — Pawn also captures forward this move.'],['Schildblock — blockiert einmal einen Angreifer (2 Züge Schutz)','Shield Block — blocks an attacker once (2 moves of protection)'],
['Kann Angreifer einmal abwehren','Can fend off an attacker once'],['Speerstoß — droht 2 Felder diagonal + Extra-Zug','Spear Thrust — threatens 2 squares diagonally + extra move'],['Droht 2 Felder diagonal','Threatens 2 squares diagonally'],
['Eisenwille — alle Bauern überleben nächsten Treffer','Iron Will — all pawns survive the next hit'],['Überlebt ersten Treffer automatisch','Automatically survives the first hit'],
['Königsgarde-Aura — alle Nachbarn 1 Zug unschlagbar','Royal Guard Aura — all neighbors unbeatable for 1 move'],['Alle Nachbarfiguren erhalten +1 Schutz','All adjacent pieces get +1 shield'],
['Fernschuss — schlägt 1 Feld diagonal ohne Bewegung (Basis)','Long Shot — captures 1 square diagonally without moving (base)'],['Fernschuss — schlägt 1 Feld diagonal ohne Bewegung','Long Shot — captures 1 square diagonally without moving'],
['Kann diagonal schlagen ohne zu ziehen','Can capture diagonally without moving'],['Bogenhagel — alle Bauern schlagen bis 2 Felder diagonal','Arrow Hail — all pawns capture up to 2 squares diagonally'],['Reichweite 2 Felder diagonal','Range 2 squares diagonally'],
['Doppelschuss — trifft 2 Feinde in Reichweite gleichzeitig','Double Shot — hits 2 enemies in range at once'],['Zwei Angriffe pro Fähigkeit','Two attacks per ability'],
['Präzisionsschuss — eliminiert stärkste Figur in Radius 2','Precision Shot — eliminates the strongest piece within radius 2'],['Zielt immer auf stärkste Figur in Reichweite','Always targets the strongest piece in range'],
['Schutzschild — gibt Nachbarfigur 1 Zug Schutz (Basis)','Protective Shield — gives an adjacent piece 1 move of protection (base)'],['Schutzschild — gibt Nachbarfigur 1 Zug Schutz','Protective Shield — gives an adjacent piece 1 move of protection'],
['Kann Nachbarfiguren schützen','Can protect adjacent pieces'],['Opfer — gibt sich für König hin, König 2 Züge unschlagbar','Sacrifice — gives itself up for the king, king unbeatable for 2 moves'],['Kann sich für den König opfern','Can sacrifice itself for the king'],
['Schildmauer — alle Bauern 1 Zug unschlagbar','Shield Wall — all pawns unbeatable for 1 move'],['Alle Bauern starten mit Schutzschicht','All pawns start with a shield layer'],
['Eisenwand — vorderste Figur jeder Spalte 2 Züge unschlagbar','Iron Wall — front piece of every file unbeatable for 2 moves'],['Ganze Front 2 Züge unschlagbar','Entire front unbeatable for 2 moves'],
['Dolchstoß — schlägt Figur direkt vor ihm ohne Bewegung (Basis)','Dagger Strike — captures the piece directly ahead without moving (base)'],['Dolchstoß — schlägt Figur direkt vor ihm ohne Bewegung','Dagger Strike — captures the piece directly ahead without moving'],
['Kann geradeaus schlagen','Can capture straight ahead'],['Unsichtbar — 3 Züge Schutz + schlägt vorwärts','Invisible — 3 moves of protection + captures forward'],['KI greift Mörder nicht gezielt an','AI does not target the assassin'],
['Schattenklinge — schlägt stärkste Nachbarfigur + Extra-Zug','Shadow Blade — captures the strongest adjacent piece + extra move'],['Schlägt und springt zurück','Captures and jumps back'],
['Königsmörder — eliminiert wertvollste Nachbarfigur','Kingslayer — eliminates the most valuable adjacent piece'],['Zielt immer auf wertvollste benachbarte Figur','Always targets the most valuable adjacent piece'],
['Raserei — schlägt vorwärts + Extra-Zug (Basis)','Frenzy — captures forward + extra move (base)'],['Raserei — schlägt vorwärts + Extra-Zug','Frenzy — captures forward + extra move'],['Extra-Zug nach jedem Schlag','Extra move after every capture'],
['Wut — schlägt vorwärts UND rückwärts + Extra-Zug','Rage — captures forward AND backward + extra move'],['Kann auch rückwärts schlagen','Can also capture backward'],['Blutrausch — stärker nach Kill + Extra-Zug','Bloodlust — stronger after a kill + extra move'],
['Jeder Schlag erhöht Angriffskraft','Every capture raises attack power'],['Götterzorn — schlägt ALLE Feinde in seiner Spalte','Wrath of the Gods — captures ALL enemies in its file'],['Vernichtet gesamte Spalte','Destroys the entire file'],
['Heilung — bringt zuletzt geschlagenen Bauern zurück (Basis)','Healing — brings back the last captured pawn (base)'],['Heilung — bringt zuletzt geschlagenen Bauern zurück','Healing — brings back the last captured pawn'],['Kann Bauern wiederbeleben','Can revive pawns'],
['Segnung — gibt Nachbarfiguren 2 Züge Schutz','Blessing — gives adjacent pieces 2 moves of protection'],['Heilt Nachbarn passiv','Passively heals neighbors'],['Auferstehung — bringt beliebige geschlagene Figur zurück','Resurrection — brings back any captured piece'],
['Kann jede Figur wiederbeleben','Can revive any piece'],['Massenheilung — alle geschlagenen Bauern kehren zurück','Mass Healing — all captured pawns return'],['Alle Bauern werden wiederbelebt','All pawns are revived'],
['Schutzwall — Turm 2 Züge unschlagbar (Basis)','Rampart — rook unbeatable for 2 moves (base)'],['Schutzwall — 1 Turm 2 Züge unschlagbar','Rampart — 1 rook unbeatable for 2 moves'],['Startschutz: beginnt mit 1 Schutzschicht','Starting Shield: begins with 1 shield layer'],
['Festung — beide Türme 2 Züge unschlagbar','Fortress — both rooks unbeatable for 2 moves'],['KI zieht nie zuerst auf den Turm','AI never targets the rook first'],['Kaiserwall — alle Figuren 1 Zug + KI gesperrt','Imperial Wall — all pieces 1 move + AI locked'],
['Beginnt mit 2 Schutzschichten','Begins with 2 shield layers'],['Unzerstörbar — 2 Figuren 3 Züge Schutz + KI pausiert','Indestructible — 2 pieces get 3 moves of protection + AI pauses'],['Absoluter Schutz, durchbricht gegnerischen Schutz','Absolute protection, breaks through enemy protection'],
['Dolchstoß — entfernt 1 benachbarten Feind (Basis)','Dagger Strike — removes 1 adjacent enemy (base)'],['Dolchstoß — entfernt 1 benachbarten Feind','Dagger Strike — removes 1 adjacent enemy'],['1× orthogonal ziehen pro Spiel','Move orthogonally 1× per game'],
['Doppelstich — entfernt 2 benachbarte Feinde','Double Stab — removes 2 adjacent enemies'],['Zieht durch eigene Figuren hindurch','Moves through your own pieces'],['Geisterdolch — entfernt wertvollste Figur auf dem Brett','Ghost Dagger — removes the most valuable piece on the board'],
['KI greift Läufer nicht als erstes an','AI does not attack the bishop first'],['Dreifachstich — entfernt 3 stärkste Feinde','Triple Stab — removes the 3 strongest enemies'],['Maximale Reichweite auf allen Diagonalen','Maximum range on all diagonals'],
['Arkaner Sprung — 2 Zufalls-Sprünge mit Schlag (Basis)','Arcane Leap — 2 random leaps with capture (base)'],['Arkaner Sprung — 2 Zufalls-Sprünge mit Schlag','Arcane Leap — 2 random leaps with capture'],['Startet unschlagbar für 1 Zug','Starts unbeatable for 1 move'],
['Arkaner Sprung — 3 Zufalls-Sprünge','Arcane Leap — 3 random leaps'],['Fähigkeit 2× nutzbar','Ability usable 2×'],['Magierpfad — 2 wählbare Sprünge (Kurvenregel)','Mage Path — 2 choosable leaps (curve rule)'],
['Nach KI-Zug sofort nochmal ziehen','Move again right after the AI move'],['Meisterpfad — 5 wählbare Sprünge','Master Path — 5 choosable leaps'],['Unbegrenzte Sprungkombinationen','Unlimited leap combinations'],
['Feuerball — verbrennt alle Feinde in Radius 2 (Basis)','Fireball — burns all enemies within radius 2 (base)'],['Feuerball — verbrennt alle Feinde in Radius 2','Fireball — burns all enemies within radius 2'],
['Flammensturm — verbrennt alle Feinde in Radius 3','Firestorm — burns all enemies within radius 3'],['Inferno — verbrennt alle Feinde in Radius 4','Inferno — burns all enemies within radius 4'],['+2 Felder Fähigkeits-Radius','+2 squares ability radius'],
['Gottesfeuer — Sofortschlag + 1 Feind brennt 3 Runden','Divine Fire — instant strike + 1 enemy burns for 3 rounds'],['Brenneffekt: getroffene Feinde sterben nach 3 Zügen','Burn effect: hit enemies die after 3 moves'],
['Flutwelle — schiebt Feinde 2 Felder zurück (Basis)','Tidal Wave — pushes enemies back 2 squares (base)'],['Welle — Reihe vor Dame 1 Feld zurück','Wave — row in front of queen pushed back 1 square'],['Flut — Reihe vor Dame 2 Felder zurück','Flood — row in front of queen pushed back 2 squares'],
['Tsunami — 3 Spalten vor Dame 3 Felder zurück','Tsunami — 3 files in front of queen pushed back 3 squares'],['+2 Felder Schubdistanz','+2 squares push distance'],['Sintflut — ganzes Brett, alle Feinde 3 Felder zurück','Deluge — whole board, all enemies pushed back 3 squares'],['Alle Feinde gleichzeitig','All enemies at once'],
['Steinwall — alle eigenen Figuren 1 Zug unschlagbar (Basis)','Stone Wall — all your pieces unbeatable for 1 move (base)'],['Steinwall — alle eigenen Figuren 1 Zug unschlagbar','Stone Wall — all your pieces unbeatable for 1 move'],
['Felsenfestung — alle eigenen Figuren 2 Züge unschlagbar','Rock Fortress — all your pieces unbeatable for 2 moves'],['Erdschild — alle Figuren 2 Züge + Extra-Zug','Earth Shield — all pieces 2 moves + extra move'],['Weltenstein — 3 Züge + Extra-Zug + König unschlagbar','World Stone — 3 moves + extra move + king unbeatable'],
['König erhält dauerhaften Schutz','King gets permanent protection'],['Windstoß — Dame bewegt sich sofort ein zweites Mal (Basis)','Gust — queen moves a second time immediately (base)'],['Windstoß — 1 Extra-Zug','Gust — 1 extra move'],['Sturmbö — 2 Extra-Züge','Gale — 2 extra moves'],
['Wirbelwind — Dame teleportiert auf freies Feld + Extra-Zug','Whirlwind — queen teleports to a free square + extra move'],['Zeitschneide — 3 Extra-Züge','Time Slash — 3 extra moves'],['Fähigkeit verbraucht keinen Zug','Ability costs no move'],
['Lebensquell — bringt zuletzt geschlagene eigene Figur zurück (Basis)','Life Spring — brings back your last captured piece (base)'],['Lebensquell — bringt 1 geschlagene Figur zurück','Life Spring — brings back 1 captured piece'],['Lebensfluss — bringt 2 geschlagene Figuren zurück','Life Stream — brings back 2 captured pieces'],
['Auferstehung — bringt alle geschlagenen Figuren zurück','Resurrection — brings back all captured pieces'],['Göttliche Gnade — alle zurück + Extra-Zug + König unschlagbar','Divine Grace — all back + extra move + king unbeatable'],['König erhält dauerhaften Lebensschutz','King gets permanent life protection'],
['Donnerschlag — entfernt wertvollste Gegnerfigur (Basis)','Thunderclap — removes the most valuable enemy piece (base)'],['Donnerschlag — entfernt wertvollste Figur','Thunderclap — removes the most valuable piece'],['Doppelschlag — entfernt 2 stärkste Figuren','Double Strike — removes the 2 strongest pieces'],
['Dreifachschlag — entfernt 3 stärkste Figuren','Triple Strike — removes the 3 strongest pieces'],['Götterschlag — entfernt ALLE Feinde auf dem Brett','Divine Strike — removes ALL enemies on the board'],['Maximale Vernichtungskraft','Maximum destructive power'],
['Königstausch — tauscht König mit Nachbarfigur, dann normal ziehen (Basis)','King Swap — swaps king with an adjacent piece, then move normally (base)'],['Königstausch — tauscht mit Nachbarfigur die Position','King Swap — swaps position with an adjacent piece'],
['Kriegsruf gibt 2 Extra-Züge','War Cry gives 2 extra moves'],['Königsmanöver — tauscht + Extra-Zug','Royal Maneuver — swap + extra move'],['Alle Figuren starten mit 1 Schutzschicht','All pieces start with 1 shield layer'],
['Königsbefehl — holt geschlagenen Turm zurück','Royal Command — brings back a captured rook'],['König erste 3 Züge unschlagbar','King unbeatable for the first 3 moves'],['Königszorn — Turm zurück + schlägt alle Nachbarn','Royal Wrath — rook back + captures all neighbors'],['Maximale Königsmacht','Maximum royal power'],
['Königsbefehl','Royal Command'],['Kriegsruf','War Cry'],['Königsmanöver','Royal Maneuver'],['Königszorn','Royal Wrath'],
['Gewinne dein erstes Spiel','Win your first game'],['Gewinne 3 Spiele','Win 3 games'],['Gewinne 5 Spiele','Win 5 games'],['Spiele 10 Partien','Play 10 games'],['Setze einmal Schach','Give check once'],['Schlage 10 Figuren insgesamt','Capture 10 pieces in total'],
['Gewinne ein Spiel durch Schachmatt','Win a game by checkmate'],['Führe eine Rochade durch','Perform a castling'],['Bringe 1 Bauern auf die gegnerische Grundlinie','Bring 1 pawn to the enemy back rank'],['Bringe 3 Bauern auf die gegnerische Grundlinie','Bring 3 pawns to the enemy back rank'],
['Bringe 5 Bauern auf die gegnerische Grundlinie','Bring 5 pawns to the enemy back rank'],['Schlage insgesamt 25 gegnerische Figuren','Capture 25 enemy pieces in total'],['Schlage insgesamt 50 gegnerische Figuren','Capture 50 enemy pieces in total'],
['Schlage einen gegnerischen Turm','Capture an enemy rook'],['Schlage 5 gegnerische Türme','Capture 5 enemy rooks'],['Schlage eine gegnerische Dame','Capture an enemy queen'],['Schlage 3 gegnerische Damen','Capture 3 enemy queens'],
['Verwandle einen Bauern in eine Dame','Promote a pawn to a queen'],['Verwandle 3 Bauern in Damen','Promote 3 pawns to queens'],['Verwandle 5 Bauern in Damen','Promote 5 pawns to queens'],['Setze 20-mal Schach','Give check 20 times'],['Setze 50-mal Schach','Give check 50 times'],
['Gewinne insgesamt 10 Spiele','Win 10 games in total'],['Gewinne insgesamt 25 Spiele','Win 25 games in total'],['Rochiere 10-mal insgesamt','Castle 10 times in total'],['Gewinne 3 Spiele in Serie','Win 3 games in a row'],['Gewinne 5 Spiele in Serie','Win 5 games in a row'],
['Gewinne 5 Spiele durch Schachmatt','Win 5 games by checkmate'],['Gewinne mit mehr Figuren als der Gegner','Win with more pieces than your opponent'],['Schlage 3 Bauern in einem einzigen Spiel','Capture 3 pawns in a single game'],
['Gewinne ein Spiel mit reinem Rang-1 Team','Win a game with a pure Rank 1 team'],['Nutze 5 Rang-1 Fähigkeiten','Use 5 Rank 1 abilities'],['Gewinne 3 Spiele mit ≥3 Rang-1 Figuren','Win 3 games with ≥3 Rank 1 pieces'],
['Gewinne ein Spiel mit reinem Rang-2 Team','Win a game with a pure Rank 2 team'],['Nutze 10 Rang-2 Fähigkeiten','Use 10 Rank 2 abilities'],['Gewinne mit ≥2 Rang-2 Figuren übrig','Win with ≥2 Rank 2 pieces left'],
['Gewinne ein Spiel mit reinem Rang-3 Team','Win a game with a pure Rank 3 team'],['Nutze 15 Rang-3 Fähigkeiten','Use 15 Rank 3 abilities'],['Gewinne mit 3 verschiedenen Rang-3 Fähigkeiten','Win using 3 different Rank 3 abilities'],
['Gewinne ein Spiel mit reinem Rang-4 Team','Win a game with a pure Rank 4 team'],['Gewinne mit ≥2 Rang-4 Figuren auf Brett','Win with ≥2 Rank 4 pieces on the board'],['Nutze 20 Rang-4 Fähigkeiten insgesamt','Use 20 Rank 4 abilities in total'],
['Gewinne 5 Spiele mit einer Rang-4 Figur','Win 5 games with a Rank 4 piece'],['Gewinne ein Spiel mit reinem Rang-5 Team','Win a game with a pure Rank 5 team'],['Gewinne mit einer Rang-5 Figur als letzte','Win with a Rank 5 piece as your last piece'],
['Nutze 10 Rang-5 Fähigkeiten','Use 10 Rank 5 abilities'],['Gewinne ein Spiel mit Rang-5 Schachmatt','Win a game with a Rank 5 checkmate'],['Gewinne 100 Partien ohne Fähigkeiten zu nutzen','Win 100 games without using abilities'],
['Gewinne dein erstes Spiel als Legende','Win your first game as a Legend'],['Gewinne 10 Spiele als Legende','Win 10 games as a Legend'],['Gewinne 50 Spiele als Legende','Win 50 games as a Legend'],['Erreiche eine Siegesserie von 10','Reach a win streak of 10'],
['Erreiche eine Siegesserie von 20','Reach a win streak of 20'],['Gewinne 5 Spiele durch Schachmatt als Legende','Win 5 games by checkmate as a Legend'],['Stelle ein komplettes Rang-5 Team auf','Field a complete Rank 5 team'],
['Schalte alle Brett-Skins frei','Unlock all board skins'],['Nutze 100 Fähigkeiten als Legende','Use 100 abilities as a Legend'],['Gewinne ein Spiel ohne eine Figur zu verlieren','Win a game without losing a piece'],
],[
['Neu aufstellen','Rearrange'],['NEU!','NEW!'],['Zügen','moves'],['Grundlagen','Basics'],['Neu','New'],
['⬆','⬆'],
]);
  var map=Object.create(null);
  D.forEach(function(p){
    var k=p[0].normalize('NFC'), v=p[1].normalize('NFC');
    var m=k.match(/^[^A-Za-zÄÖÜäöüß0-9]+/); // führende Emojis/Zeichen nicht Teil des Schlüssels (sonst gewinnt der kürzere, frühere Treffer)
    if(m && v.indexOf(m[0])===0 && k.length>m[0].length){ k=k.slice(m[0].length); v=v.slice(m[0].length); }
    map[k]=v;
  });
  var keys=Object.keys(map).sort(function(a,b){return b.length-a.length;});
  var L='A-Za-zÄÖÜäöüß';
  function esc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  var parts=keys.map(function(k){
    var pre=new RegExp('^['+L+']').test(k)?'(?<!['+L+'])':'';
    var suf=new RegExp('['+L+']$').test(k)?'(?!['+L+'])':'';
    return pre+esc(k)+suf;
  });
  var RE=new RegExp(parts.join('|'),'g');
  function tr(s){
    if(typeof s!=='string'||s.length<2||!/[A-Za-zäöüÄÖÜ]/.test(s)) return s;
    s=s.normalize('NFC');
    return s.replace(RE,function(m){ return map[m]!==undefined?map[m]:m; });
  }
  window.cwTr=tr;
  function fixNode(n){
    if(n.nodeType===3){ var v=n.nodeValue,t=tr(v); if(t!==v) n.nodeValue=t; }
    else if(n.nodeType===1){
      if(n.tagName==='SCRIPT'||n.tagName==='STYLE') return;
      ['title','placeholder','aria-label'].forEach(function(a){ if(n.hasAttribute&&n.hasAttribute(a)){ var v=n.getAttribute(a),t=tr(v); if(t!==v) n.setAttribute(a,t); } });
      for(var c=n.firstChild;c;c=c.nextSibling) fixNode(c);
    }
  }
  function start(){
    document.documentElement.lang=lang;
    document.title=tr(document.title);
    fixNode(document.body);
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if(m.type==='characterData') fixNode(m.target);
        else if(m.type==='attributes') fixNode(m.target);
        else m.addedNodes.forEach(fixNode);
      });
    }).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});
  }
  if(document.body) start(); else document.addEventListener('DOMContentLoaded',start);
  var _a=window.alert; window.alert=function(m){ return _a.call(window,tr(String(m))); };
  var _c=window.confirm; window.confirm=function(m){ return _c.call(window,tr(String(m))); };
})();
