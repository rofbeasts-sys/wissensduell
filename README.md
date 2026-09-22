# BRAIN PULSE PARTY (ehem. WISSENSDUELL PARTY)

Erweiterung des bestehenden Brain-Pulse-Spiels (ehem. "Wissensduell") um einen echten **WLAN-/Internet-
Mehrgeräte-Modus** ("Party-Raum") sowie einen Solo-Modus.

## 1. Starten

Voraussetzung: [Node.js](https://nodejs.org) ist installiert (keine weiteren Pakete nötig –
der Server kommt komplett ohne externe Abhängigkeiten aus).

```bash
node server.js
```

Die Konsole zeigt danach zwei Adressen an, z. B.:

```
Auf diesem Gerät öffnen:   http://localhost:3000
Für andere Geräte im selben WLAN:
  http://192.168.1.23:3000
```

- **Host:** öffnet `http://localhost:3000` (oder die angezeigte WLAN-Adresse) im Browser.
- **Alle anderen Geräte** (Handys, Tablets, Laptops) müssen im **selben WLAN** sein und
  ebenfalls die angezeigte `http://192.168.x.x:3000`-Adresse öffnen.
- Der Solo-Wissenstest funktioniert weiterhin ganz ohne Verbindung zu anderen Geräten;
  Solo-Party und der Party-Raum nutzen den Server aktiv.

Einen anderen Port verwenden: `PORT=4000 node server.js`.

## 1b. Als echte Internetseite hosten (statt nur im WLAN)

Der Server läuft unverändert auch bei einem Hosting-Anbieter – der Code liest den Port
bereits aus der Umgebungsvariable `PORT` (die jeder Anbieter automatisch setzt), und die
Web-Oberfläche erkennt selbst, ob sie über `http://` oder `https://` aufgerufen wird und
wählt automatisch `ws://` bzw. `wss://`. Es sind also **keine Code-Änderungen** nötig, nur
ein paar Schritte beim Anbieter.

**Wichtig bei der Anbieterwahl:** Dieses Projekt braucht einen Anbieter mit einem
**dauerhaft laufenden Node-Prozess** (nicht "serverless"/"Functions"), der **WebSocket-
Verbindungen** unterstützt. Plattformen wie Vercel oder Netlify funktionieren dafür
**nicht**, weil sie Node-Code nur als kurzlebige Funktionen ausführen.

Empfehlung (Stand September 2026 – geprüft, weil sich diese Angebote erfahrungsgemäß
häufig ändern; vor der Anmeldung lohnt sich trotzdem ein kurzer Blick auf die aktuellen
Konditionen des Anbieters):

**Render** (aktuell die zugänglichste kostenlose Option, keine Kreditkarte nötig):
1. Projekt auf GitHub hochladen (neues Repository erstellen, diese Dateien pushen).
2. Bei [render.com](https://render.com) registrieren, "New" → "Web Service" → GitHub-Repo auswählen.
3. Build/Run werden automatisch erkannt (Node.js, Build-Befehl `npm install`, Start-Befehl `npm start`).
4. Instanztyp "Free" wählen und deployen. Du bekommst eine feste Adresse wie
   `https://dein-app.onrender.com` – funktioniert von überall, nicht nur im eigenen WLAN.

Zwei bekannte Einschränkungen des Gratis-Tiers, die bei einer Party auffallen können:
Der Dienst legt sich nach 15 Minuten Inaktivität schlafen (der nächste Aufruf braucht dann
~30–60 Sekunden zum Aufwachen – am besten die Seite kurz vorher schon mal öffnen, bevor
alle mitspielen wollen), und WebSocket-Verbindungen können auf dem Gratis-Tier gelegentlich
vorzeitig getrennt werden. Für eine einzelne Spielrunde unter Freunden ist das meist kein
Problem; bricht die Verbindung doch ab, zeigt die Seite das jetzt klar an und man tritt dem
Raum einfach erneut bei.

~~Koyeb~~ ist seit der Übernahme durch Mistral AI (Februar 2026) für **neue** Nutzer keine
kostenlose Option mehr – neu registrierte Konten benötigen dort inzwischen einen
kostenpflichtigen Plan. Auch Glitch, früher eine beliebte Gratis-Option, hat sein
Projekt-Hosting im Juli 2025 komplett eingestellt. Diese Landschaft ändert sich häufig;
wenn Render zum Zeitpunkt deines Deploys nicht mehr passt, suche nach "kostenloser
Node.js-Hosting-Anbieter mit WebSocket-Unterstützung" und prüfe insbesondere, ob es sich
um einen dauerhaft laufenden Dienst (nicht "serverless"/"Functions") handelt.

Unabhängig vom Anbieter gilt: Der Raum-Zustand liegt nur im Arbeitsspeicher des
Node-Prozesses. Ein Neustart/Redeploy des Dienstes beendet alle laufenden Partys
(die Lobby lässt sich danach aber sofort neu erstellen).

## 2. Projektstruktur

```
server.js              Der Node-Server: Räume, Runden, Teams, Punktesysteme, Spiel-Engines
lib/miniws.js           Minimaler WebSocket-Server (nur Node-Bordmittel, kein npm-Paket nötig)
shared/quizQuestions.json   Zentrale Fragen-Datenbank (Wissenstest) – von Solo, lokalem MP und Party genutzt
shared/partyDatasets.json   Datensätze für "Einordnen" und "Mehr oder Weniger" (Werte anfangs verborgen)
public/index.html       Die komplette Client-Oberfläche (Solo, Solo-Party, Party)
test/                   Ein automatisierter End-to-End-Test (optional, `npm test`)
```

## 3. Neue Fragen / Kategorien hinzufügen

- **Wissenstest-Fragen:** in `shared/quizQuestions.json` ein neues Objekt ergänzen
  (`q`, `a` [4 Antworten], `c` [Index der richtigen Antwort], `cat`, `d` [Schwierigkeit 1=leicht, 2=normal, 3=schwer, 4=extrem schwer], optional `e` [Erklärung]).
- **Einordnen / Mehr oder Weniger:** in `shared/partyDatasets.json` unter `ordering` bzw.
  `higherLower` einen neuen Eintrag mit `label`, `unit`, `order` (`"desc"` oder `"asc"`) und
  `items` (`id`, `name`, `value`) anlegen. Bei "Mehr oder Weniger" zusätzlich `seedId` setzen
  (das bereits bekannte Startelement). Neue Kategorien erscheinen automatisch in der
  Zufallsrunde und in "Spiel erstellen" – dafür muss kein weiterer Code angepasst werden
  (siehe `buildRoundDefPool()` in `server.js`).

## 4. Punkte ändern

- Wissenstest: `handleQuizAnswer()` / `resolveQuizQuestion()` in `server.js` (`+100` / `-150`).
- Einordnen / Mehr oder Weniger: `handleRankPlace()` (`+10` je korrekt platziertem Element,
  1 Leben Abzug bei Fehlern).
- Rundenbonus / Punktesysteme: Funktion `awardRoundPoints()` – dort sind alle drei
  Punktesysteme (Runde / Steigend / Punkteabzug) zentral umgesetzt.
- Höhe des Punkteabzugs bei Punktesystem 3: Konstante `MISTAKE_PENALTY` ganz oben in `server.js`.
- Solo-Wissenstest (klassischer, eigenständiger Modus – `public/index.html`,
  nicht Party): Rundenbonus (+150) gibt es seit dieser Version nur noch bei
  einer perfekten Runde (alle Fragen richtig), siehe `endSoloRound()`. Nach
  jeder Frage bleibt die "Wusstest du...?"-Erklärung außerdem so lange offen
  stehen, bis man selbst auf "WEITER" tippt – kein automatisches
  Weiterspringen mehr, siehe `handleSoloAnswer()`/`soloNextQuestion()`.
- Mehr oder Weniger – falsche Antwort: eine falsch geratene Karte wird nicht
  mehr heimlich an ihrer wahren Position einsortiert, sondern stellt sich
  wieder hinten im Nachziehstapel an (`handleRankPlace()` in `server.js`,
  identisch zum Verhalten bei Einordnen). Der nächste Zug zieht direkt die
  nächste Karte; die falsch geratene kann später erneut drankommen.
- Einordnen – festes Positionsraster: statt relativer Einfüge-Lücken gibt es
  jetzt ein festes Raster von Position 1 bis N (N = Rundengröße, z.B. 8 oder
  10). Man wählt ein Element aus dem sichtbaren Pool und tippt danach direkt
  die gewünschte Position an. Der allererste Tipp ist automatisch richtig
  (freier Punkt, da noch kein Nachbar zum Vergleichen da ist); jeder weitere
  Tipp wird gegen die jeweils nächsten bereits befüllten Nachbar-Positionen
  geprüft. Bei falscher Antwort passiert nichts – die Karte bleibt im Pool,
  der Slot bleibt offen. Server: neues Feld `rt.slots` (fester Array,
  `null` = offen) plus `isSlotPlacementCorrect()`/`validSlotsFor()` in
  `server.js`, nur für `kind === "orderingGame"` – Chronologie und Mehr oder
  Weniger nutzen weiterhin die alte, relative `rt.placed`-Logik unverändert.
  Client: `renderPartyRank()` in `public/index.html` zeigt bei Einordnen das
  feste Raster (`msg.slots`) statt der wachsenden Positions-Buttons.
  Design-Hinweis: ein unglücklich gesetzter "freier" erster Tipp kann eine
  Position für später gezogene Elemente blockieren (bewusst so gewünscht,
  macht auch die erste Platzierung taktisch relevant) – die Runde endet in
  dem Fall wie gewohnt über Leben-Verlust/Elimination, sobald ein Team keine
  Leben mehr hat.

## 5. Ränge ändern

Weiterhin im Client in `public/index.html`, Array `RANKS` (gilt für Solo-
Profile; der Party-Modus verwendet eigene, sitzungsbasierte
Team-Punktestände ohne Rangsystem).

### Kategorie "Ich bin ein Star" (Einordnen) vervollständigt

`shared/partyDatasets.json`, Eintrag `trashtv_dschungelcamp_sieger`: enthielt
nur die Sieger der Staffeln 10-19, jetzt vollständig 1-19 (Costa Cordalis bis
Gil Ofarim, recherchiert und mit mehreren Quellen abgeglichen). Label
entsprechend auf "Sieger nach Staffel" angepasst. Da die Kategorie jetzt mehr
als `MAX_ROUND_ITEMS` (10) Elemente hat, greift beim Rundenstart automatisch
die Zufallsauswahl aus `startRankingRound()` in `server.js` – wie bei anderen
großen Kategorien (Häuser, Dinosaurier, Größenvergleich).

## 6. Bots im Party-Raum

### Solo-Party

Im Hauptmenü unter „SOLO" gibt es neben dem klassischen Wissenstest jetzt auch
„PARTY-MODUS": eine Party-Runde ganz allein, ohne Mitspieler und ohne Bots.
Technisch ist das schlicht eine Party mit genau einem Teilnehmer – die Person
konfiguriert Rundenanzahl und Zufallsrunde/Spiel erstellen wie ein Host, der
Lobby-Wartebildschirm mit Raum-Code entfällt aber, da niemand beitreten muss.
Es kommt dieselbe Server-Logik zum Einsatz wie im WLAN-Party-Modus (Wissenstest,
Einordnen, Mehr oder Weniger) – Punktestände sind auch hier sitzungsbasiert und
nicht mit dem persönlichen Solo-Rang verknüpft. Die Anzeige ist bewusst frei von
jeglicher Gegner-/Bot-Sprache gehalten (kein "Team", keine Medaillen-Rangliste) –
Rundenauswertung und Spielende zeigen stattdessen nur den eigenen Punktestand,
im Sinne von "wie weit schaffst du es".

Der frühere Menüpunkt "Lokaler Multiplayer" (Pass & Play auf einem gemeinsamen
Gerät) wurde aus dem Hauptmenü entfernt, da der Party-Raum diese Funktion nun
auch online/im selben WLAN abdeckt. Der zugehörige Code ist weiterhin in
`public/index.html` vorhanden, aber über die Oberfläche nicht mehr erreichbar.

### Eigene Spielrunde zusammenstellen ("Spiel erstellen")

Bei "Spiel erstellen" (Party-Host wie auch Solo-Party) gibt es jetzt einen
übersichtlichen Baukasten statt einer langen Dropdown-Liste: Rundenanzahl frei
zwischen 5, 10, 15 oder 20 wählbar, danach pro Runde per Suche zuerst den Spielmodus
(Wissenstest/Einordnen/Mehr oder Weniger) und – außer bei Wissenstest – die
passende Kategorie auswählen, zur Liste "MEINE SPIELRUNDE" hinzufügen, bei
Bedarf über ✏️/🗑️ bearbeiten oder entfernen. Erst wenn genau so viele Runden
zusammengestellt sind wie die gewählte Rundenanzahl, lässt sich die
Zusammenstellung mit "EIGENE SPIELRUNDE ÜBERNEHMEN" bestätigen. Die
Kategorien selbst kommen unverändert aus `shared/partyDatasets.json` und
`shared/quizQuestions.json` – für diesen Baukasten wurden keine neuen
Kategorien erfunden, nur eine neue Auswahloberfläche dafür gebaut
(`openRoundBuilder()`/`renderRoundBuilder()` in `public/index.html`).

### Kategorien je Runde und Feingliederung nach Liga/Genre

Jede Runde bei Einordnen/Mehr oder Weniger umfasst bewusst weiterhin nur rund
8 Elemente (bei "Einwohner" 10) – das hält eine Runde überschaubar lang. Statt
eine Kategorie größer zu machen, gibt es stattdessen inzwischen mehrere
eigenständige Kategorien zum selben Thema, die im Round-Builder einzeln
auswählbar sind, z. B.:

- **Fußball (Kaderwert):** allgemein gemischt, plus getrennt nach Bundesliga,
  2. Bundesliga, La Liga und Premier League
- **Musik (Streams):** allgemein gemischt, plus getrennt nach Rock, HipHop
  und Klassik
- **Serien/Filme:** zusätzlich zur allgemeinen Serien- und Filme-Kategorie
  gibt es jetzt auch Anime (Episodenanzahl), Manga (verkaufte Bände) und
  Animationsfilme (Einspielergebnis)

Aktuell (Stand dieser Version): 19 Einordnen-, 15 Chronologie- und 21
Mehr-oder-Weniger-
Kategorien, darunter auch "Trash-TV Deutschland" (Anzahl der Staffeln von
Dschungelcamp, Bachelor, Big Brother, Bauer sucht Frau & Co. – Stand 2026, da
sich Staffelzahlen bei jährlich laufenden Formaten schnell ändern). Zusätzlich
gibt es je eine eigene "Sieger nach Staffel"-Kategorie für Kampf der
Realitystars, Das Sommerhaus der Stars, LOL – Last One Laughing und Ich bin
ein Star (Dschungelcamp): Dort wird nicht die Staffelanzahl, sondern die
tatsächlichen Sieger:innen chronologisch (niedrigste Staffelnummer zuerst)
einsortiert. Bei Formaten mit bis zu 10 Staffeln (KDRS, Sommerhaus, LOL) sind
das alle Staffeln von Anfang an; bei längeren Formaten wie Dschungelcamp (19
Staffeln) die letzten 10 bis zur aktuellsten Staffel, im Kategorienamen als
Spanne ausgewiesen (z. B. "Staffel 10-19") – so kommt der Pool je Runde
(max. 10 Elemente) nie an seine Grenze, und es bleiben die aktuellsten,
bekanntesten Staffeln erhalten. Für "Der Bachelor" gibt es bewusst noch keine
solche Kategorie: Eine Staffel hatte gar keine Siegerin, zwei weitere hatten
gleich zwei Bachelors mit je zwei Gewinnerinnen gleichzeitig – das lässt sich
nicht sauber in "ein Sieger pro Staffel" packen.

Außerdem gibt es einen fünften, eigenständigen Spielmodus **"Chronologie"**
(eigenes `kind: "chronologyGame"`, technisch dieselbe Engine wie Einordnen,
aber im Round-Builder als klar getrennter Modus mit eigenen 15 Kategorien
auswählbar) für bekannte Film-/
Serien-/Spiele-Universen (Marvel Cinematic Universe, X-Men, Star Wars, Star
Trek, The Walking Dead Universe, Mittelerde/Der Herr der Ringe, Harry Potter,
The Conjuring Universe, Assassin's Creed, Uncharted, Pokémon-Anime,
Pokémon-Hauptspiele, Resident Evil sowie Call of Duty gleich zweimal – einmal
nach Erscheinungsjahr, einmal nach Handlungsjahr, da beides bei dieser Reihe
bewusst stark auseinanderfällt). Sortiert wird nach dem Jahr, in dem die
Handlung spielt (nicht nach Erscheinungsjahr) – bei Reihen mit klarem
Zeitsprung wie Star Wars oder Assassin's Creed ist das die eigentlich
interessante Trivia-Frage. Bei Titeln, die am selben Tag/Jahr spielen (z. B.
die ersten vier Resident-Evil-Spiele, alle 1998), wurden minimal
unterschiedliche Dezimalwerte vergeben, um die tatsächliche Reihenfolge
weiterhin eindeutig abzufragen. Bei The Walking Dead Universe ist die reale
Chronologie durch ständige staffelweise Überschneidungen zwischen den
Serien so verschachtelt, dass keine seriöse Jahresangabe je Serie möglich
ist – dort wird stattdessen eine vereinfachte, in Fan-Guides gängige
empfohlene Reihenfolge verwendet (Positionsnummer statt Jahr).

Außerdem drei reine Größenvergleich-Kategorien bei Einordnen: Häuser (nach
Wohnfläche, von Antilia bis zum Sultanspalast von Brunei), Dinosaurier (nach
Länge) und ein bunter "Größenvergleich" quer durch komplett unterschiedliche
Objekte – von der Kakerlake (5 cm) über Pikachu, SpongeBob und Yoda bis zum
fiktiven Todesstern aus Star Wars (120 km Durchmesser).

### Größere Datenpools mit echter Zufallsauswahl je Runde

Kategorien können jetzt deutlich mehr Elemente enthalten, als tatsächlich in
einer einzelnen Runde vorkommen (weiterhin max. 10 je Runde, wie bisher).
`startRankingRound()` in `server.js` zieht bei mehr als 10 Elementen jedes
Mal eine neue Zufallsauswahl aus dem vollen Pool – bei "Mehr oder Weniger"
bleibt dabei das Referenzelement (`seedId`) garantiert immer Teil der
Auswahl. Bislang nutzen "Häuser" (16 Elemente), "Dinosaurier" (16) und
"Größenvergleich" (13) diesen größeren Pool; alle anderen, bereits
bestehenden Kategorien haben weiterhin ihre ursprüngliche Elementanzahl
(meist genau 8–10) und zeigen daher bei jeder Runde dieselben Elemente wie
bisher – ließe sich aber genauso leicht um weitere Elemente ergänzen.

### Chronologie zeigt jetzt bewusst ALLE Einträge, kein Zehner-Limit

Bei "Chronologie" wird nie mehr zufällig gekürzt – jede Runde zeigt wirklich
jedes Element der Kategorie (Ausnahme von der sonst geltenden 10er-Grenze
bei Einordnen/Mehr-oder-Weniger, siehe oben). Bei mehr als 10 Elementen
scrollt der Spielbereich einfach länger, das Layout hat dafür keine feste
Höhenbegrenzung. "Harry-Potter-Universum" ist jetzt mit allen 11 Filmen
vollständig (die bisher fehlenden "Kammer des Schreckens" und "Heiligtümer
des Todes 1" wurden ergänzt).

Die übrigen 14 Chronologie-Kategorien haben weiterhin ihre ursprüngliche,
kuratierte Auswahl (meist 6-10 Einträge) – sie zeigen also bereits alles,
was aktuell hinterlegt ist, das ist nur (noch) nicht die vollständige Liste
jedes Films/Spiels der jeweiligen Reihe bis Stand Juni 2026. Eine wirklich
vollständige, verifizierte Liste je Reihe (z. B. MCU: über 35 Filme mit
teils umstrittener interner Chronologie) ist ein größeres Rechercheprojekt
für sich und wurde hier bewusst noch nicht in einem Rutsch für alle 14
gemacht, um keine falschen Daten unter Zeitdruck einzubauen.

Weitere Sieger-/Chronologie-Kategorien lassen sich genauso leicht ergänzen –
einfach einen neuen Eintrag in `shared/partyDatasets.json` anlegen, der
Round-Builder und die Zufallsrunde nehmen ihn automatisch auf.

Bots gibt es **ausschließlich im normalen Party-Raum** – der Solo-Modus (Wissenstest wie
Solo-Party) bleibt komplett bot-frei und unverändert.

- Im Warteraum kann der Host über **„+ BOT HINZUFÜGEN"** beliebig viele Bots ergänzen
  (maximal so viele, bis die Teilnehmerzahl inkl. echter Spieler das Party-Limit von
  6 erreicht) und über **✕** wieder entfernen.
- Jeder Bot bekommt einen zufälligen, innerhalb der Party einmaligen Namen sowie das
  Symbol 🤖 und kann per Dropdown auf eine von fünf Schwierigkeitsstufen gestellt werden:
  **Dumm, Einsteiger, Schlau, Doktor, Wissenschaftler**.
- Auch mit nur einem echten Spieler lässt sich so eine vollständige Party mit bis zu
  5 Bots als Gegnern starten.
- Bots werden bei Teams (2v2, 3v3, 2v2v2) automatisch dem kleinsten Team zugeteilt;
  der Host kann sie in der Team-Übersicht jederzeit manuell umverteilen – genau wie
  echte Spieler.
- Bots spielen in **allen** Rundentypen mit: Beim Wissenstest antworten sie nach einer
  schwierigkeitsabhängigen Bedenkzeit mit einer schwierigkeitsabhängigen Trefferquote.
  Bei Einordnen/Mehr-oder-Weniger ziehen Bots automatisch, sobald ein komplett aus
  Bots bestehendes Team am Zug ist (ein Team mit mindestens einem echten Spieler zieht
  weiterhin selbst) – inklusive eigener 3 Leben und schwierigkeitsabhängiger Fehlerquote.

**Bot-Werte zentral anpassen:** Objekt `BOT_TIERS` ganz oben in `server.js` – dort lassen
sich für jede Stufe Trefferquote (`prob`), Bedenkzeit beim Wissenstest (`quizMinPct`/
`quizMaxPct`, als Anteil des Zeitlimits) und Bedenkzeit bei Einordnen/Mehr-oder-Weniger
(`rankDelayMin`/`rankDelayMax` in Millisekunden) einstellen. Neue Stufen einfach als
weiteren Eintrag ergänzen und in `BOT_TIER_ORDER` aufnehmen. Bot-Namen: Array
`BOT_NAME_POOL`. Das komplette Bot-System liegt in klar abgegrenzten Funktionen
(`addBot`, `removeBot`, `scheduleBotQuizAnswers`, `scheduleBotRankMove`, …) und lässt sich
unabhängig vom restlichen Code erweitern (weitere Stufen, eigene "Persönlichkeiten",
bessere KI, perspektivisch auch durch echte Online-Spieler ersetzen).

## 7. Wie der Party-Modus technisch funktioniert

### Neuer Spielmodus: „Stadt Land Fluss"

Ein sechster, eigenständiger Spielmodus (`kind: "stadtLandFluss"`) – klassisches
Papier-Stift-Prinzip, nur digital: Ein zufälliger Buchstabe wird gezogen
(Q, X, Y bewusst ausgelassen, da zu schwer für ein flüssiges Spiel), alle
Spieler schreiben gleichzeitig 80 Sekunden lang Wörter zu den gewählten
Kategorien, die mit diesem Buchstaben beginnen.

**Original**: die sieben klassischen Kategorien (Stadt, Land, Fluss, Name,
Tier, Beruf, Pflanze) – direkt im Round-Builder auswählbar wie jede andere
Kategorie auch.

**Eigene Kategorien**: Im Round-Builder gibt es bei „Stadt Land Fluss" statt
der normalen Kategorie-Suche einen eigenen Baukasten – 13 vorgeschlagene
Kategorien zum Anklicken (u. a. Farbe, Automarke, Filmtitel, Promi) plus ein
Textfeld, um beliebige eigene Kategorien einzutippen (bis zu 8 insgesamt).
Diese individuelle Auswahl wird direkt als eigene Rundendefinition zum Server
geschickt (`setSlfCustomRoundDef`) und muss nicht erst in
`shared/partyDatasets.json` vordefiniert sein.

**Wertung**: Nach Ablauf der Schreibzeit werden alle Antworten aller Spieler
offengelegt – eindeutige gültige Antwort (richtiger Anfangsbuchstabe) = 20
Punkte, mehrfach vorhandene = 10 Punkte, leer/falscher Buchstabe = 0 Punkte.
Punkte werden pro Spieler vergeben (nicht pro Team), auch bei größeren
Teams – die Teampunkte am Rundenende sind die Summe der Mitgliederpunkte.

**Anfechten**: 30 Sekunden lang kann jede Antwort außer der eigenen von
anderen Spielern angefochten werden (⚑-Button). Danach stimmen alle übrigen
Spieler außer dem/der Angefochtenen "Gültig"/"Ungültig" ab; bei Mehrheit für
"Ungültig" fällt die Antwort auf 0 Punkte, bei Gleichstand bleibt sie gültig.
Erst danach wird final gewertet.

**Bots**: Beteiligen sich an Stadt-Land-Fluss bewusst **nicht aktiv** am
Schreiben – ein verlässliches Wörterbuch für alle Buchstaben-Kategorie-
Kombinationen wäre ein eigenes, sehr großes Projekt für sich. Mit Bots im
Raum tragen diese für Stadt-Land-Fluss-Runden schlicht 0 Punkte bei.

**Zentral anpassbar** in `server.js`: `SLF_DEFAULT_CATEGORIES`, `SLF_LETTERS`,
`SLF_ANSWER_MS`, `SLF_CHALLENGE_MS`, `SLF_VOTE_MS`.

### Sprachen

Sprachumschalter (7 Sprachen: Deutsch, Englisch, Japanisch, Chinesisch,
Französisch, Italienisch, Spanisch) oben im Hauptmenü, per `localStorage`
gemerkt. Übersetzt sind Menüs, Buttons und die zentralen Bildschirme
(Hauptmenü, Solo-Auswahl, Party-Einstieg, Warteraum, Rundenübersicht,
Rundenauswertung, Spielende). Übersetzungen liegen im `I18N`-Objekt in
`public/index.html`, abgerufen über `t('schlüssel')`.

Da die eigentlichen **Inhalte** (545 Wissensfragen, Trash-TV-/Bundesliga-
Kategorien) sehr Deutschland-spezifisch sind, werden diese bei anderen
Sprachen nicht übersetzt, sondern schlicht ausgeblendet: Der Wissenstest ist
im Solo-Menü gesperrt, solange keine deutsche Sprache gewählt ist; im
Party-Raum verschwinden Wissenstest sowie die Kategorien "Trash-TV
Deutschland", "Kampf der Realitystars", "Sommerhaus der Stars", "LOL",
"Dschungelcamp", "Bundesliga" und "2. Bundesliga" automatisch aus Zufallsrunde
und Round-Builder, sobald der Host eine andere Sprache als Deutsch wählt
(steuerbar über `germanOnly: true` je Kategorie in `shared/partyDatasets.json`
bzw. für den Wissenstest fest in `server.js`). International verständliche
Kategorien (Flaggen, Tiere, Länder, Berge, Fußball-Weltmeister, La Liga,
Premier League, Musik, Filme, Olympia usw.) bleiben in jeder Sprache
verfügbar – ihre Inhalte (Ländernamen, Titel) stehen aktuell aber weiterhin
auf Deutsch, da eine vollständige Übersetzung aller Kategorie-Inhalte ein
deutlich größerer, separater Schritt wäre.

Die Sprache ist eine **Raum-Einstellung** (vom Host beim Erstellen gewählt,
im Warteraum änderbar), nicht pro Spieler – alle Teilnehmer eines Raums
sehen dieselben verfügbaren Kategorien. Bereits ausgewählte "Spiel
erstellen"-Runden, die durch einen Sprachwechsel ungültig werden, werden
automatisch auf "noch nicht gewählt" zurückgesetzt statt zu crashen.

### Neuer Spielmodus: „Bild erraten"

Ein viertes Rundenformat (`kind: "guessPicture"`) neben Wissenstest, Einordnen
und Mehr oder Weniger: Ein Bild bzw. Emoji wird über 12 Sekunden hinweg in
4 Stufen (3 Sekunden je Stufe) zunehmend schärfer/deutlicher. Punktestufen
`[5, 3, 2, 1]` – je früher richtig geraten wird, desto mehr Punkte. Alle
Spieler können jederzeit per Freitext raten; wer zuerst richtig liegt,
bekommt die Punkte für dieses Bild, danach geht's zum nächsten. Tippfehler
werden toleriert (kleine Levenshtein-Distanz je nach Wortlänge, sowie
alternative Schreibweisen über das Feld `alt` je Element).

**Bilder:** Aktuell mit zwei Kategorien befüllt, die ohne echte Fotos
auskommen (Flaggen: 28 Länder, Tiere: 27 – jeweils per Emoji, keine
Bildrechte nötig; ein Spielpool je Runde zieht daraus zufällig 10).
Zwei Kategorien mit echten Fotos sind als Nächstes geplant, aber noch nicht
befüllt – "Promis/Trash-TV-Stars" und "Autos" (konkrete Marken/Modelle,
dafür reichen Emoji nicht, da es keine markenspezifischen Auto-Emoji gibt
und Logos ohnehin geschützt sind). Für beide werden reale Bilddateien mit
Nutzungsrecht benötigt (Foto + der Name/das Modell, der/das als Lösung
gelten soll, für jedes Bild).
Neue Kategorien einfach in `shared/partyDatasets.json` unter
`"guessPicture"` ergänzen; für Foto-Kategorien `promptType: "image"` und
`promptValue` als Bildpfad (z. B. `/images/dateiname.jpg`, Datei dann unter
`public/images/` ablegen) statt eines Emoji verwenden.

**Zentral anpassbar** in `server.js`: `GUESS_TIER_MS` (Dauer je Stufe) und
`GUESS_TIERS` (Punktewerte je Stufe).

- `server.js` hält pro Raum (`rooms`-Map) den kompletten Spielzustand serverseitig vor
  (Spieler, Teams, Rundenplan, Punktestände, aktueller Rundenzustand). Der Server ist die
  einzige Quelle der Wahrheit – Clients senden nur Aktionen (`quizAnswer`, `rankPlace`, …)
  und bekommen den neuen Zustand als Broadcast zurück.
- **Wissenstest:** Da im Party-Modus jeder Spieler ein eigenes Gerät hat, muss die Antwort
  niemand mehr verbergen – alle beantworten dieselbe Frage gleichzeitig auf ihrem eigenen
  Bildschirm; nach Ablauf der Zeit oder wenn alle geantwortet haben, wird ausgewertet.
- **Einordnen:** Alle Elemente liegen von Anfang an offen sichtbar im Pool (nur ihr
  Wert bleibt verborgen). Das Team am Zug wählt frei, welches Element es versucht,
  und an welcher Position. Bei einem Fehlversuch bleibt das Element weiterhin sichtbar
  im Pool – das nächste Team kann es (oder ein anderes) probieren. Aufgedeckt werden
  die Werte erst in der Auflösung am Rundenende.
- **Mehr oder Weniger:** Weiterhin wird pro Zug ein verdecktes Element gezogen, dessen
  Wert direkt nach der Entscheidung aufgedeckt wird (`rankAttempt`). Bei einem
  Fehlversuch wird das Element sofort an seiner nun bekannten, korrekten Stelle
  einsortiert (damit niemand von einem bereits verratenen Wert profitiert) – das
  nächste Team zieht dafür ein neues, noch unbekanntes Element.
  Teams sind reihum an der Zug (`turnOrder`/`turnPointer`), jedes Team hat 3 Leben; bei 0
  Leben wird das Team für den Rest der Runde übersprungen. Endet die Runde, gewinnt das
  Team mit den meisten korrekt platzierten Elementen.
- Die drei Spielmodi teilen sich dieselbe Rundensteuerung (`startNextRound()` /
  `finishRoundEngine()`), sodass sich neue Modi später einfach ergänzen lassen, ohne die
  bestehende Logik zu verändern (siehe Punkt 15 der Anforderung: "knowledgeQuiz",
  "orderingGame", "higherLowerGame" sind bereits als klar getrennte, modulare Engines
  aufgebaut).

## 7b. Benutzerkonten (Online-Profile)

Im Hauptmenü gibt es jetzt "Anmelden" (Benutzername + Passwort). Wer sich
registriert/anmeldet, spielt den **Solo-Wissenstest** automatisch mit einem
serverseitig gespeicherten Konto statt mit einem lokalen Browser-Profil –
Punktestand/Rang folgen damit über Geräte und Browser hinweg dem Account.
Ohne Anmeldung funktioniert Solo weiterhin exakt wie bisher, komplett lokal.

**Sicherheit:** Passwörter werden nie im Klartext gespeichert, sondern mit
`crypto.scrypt` (Node-Bordmittel) + zufälligem Salt pro Nutzer gehasht;
Logins verwenden einen zeitkonstanten Vergleich (`crypto.timingSafeEqual`)
gegen Timing-Angriffe. Falsche Logins zeigen bewusst dieselbe Fehlermeldung,
egal ob der Nutzername existiert oder das Passwort falsch war (kein
Ausspähen registrierter Namen).

**Speicherung:** Als JSON-Datei unter `data/` (wird von Git ignoriert, landet
also nie im Repository). Wichtiger Hinweis wie schon beim Hosting erwähnt:
Auf Render-Gratis-Tier ist die Festplatte nicht garantiert dauerhaft – bei
einem Neustart des Dienstes können gespeicherte Konten verloren gehen. Für
echte Dauerhaftigkeit bräuchte es einen Plan mit persistenter Festplatte
oder eine externe Datenbank.

**Technisch:** Vier schlanke HTTP-Endpunkte neben dem WebSocket-Server:
`POST /api/register`, `/api/login`, `/api/session` (Auto-Login beim erneuten
Öffnen der Seite über einen in `localStorage` gemerkten Token), `/api/logout`
und `/api/save-stats` (Punktestand wird am Rundenende synchronisiert, nicht
nach jeder einzelnen Frage). Die komplette Logik liegt in `server.js` im
Abschnitt "Benutzerkonten".

**Noch offen:** Profilbilder – vorbereitet (`avatar`-Feld existiert bereits
in jedem Konto), aber noch nicht mit Auswahloberfläche, da erst die
Charakter-Bilder benötigt werden.

### Bugfix: Platzieren-Buttons blieben bei "Alle gegen alle" unsichtbar

Wenn der Host nie manuell Teams einstellte (Standardfall bei "Alle gegen
alle", also praktisch immer bei Solo-Party und oft auch im normalen
Party-Raum), bekam der Client nach dem Start nie ein Update mit der
tatsächlich zugewiesenen Team-ID je Spieler. Die Oberfläche dachte deshalb
fälschlich, man sei nie am Zug, und zeigte in Einordnen, Chronologie und
Mehr-oder-Weniger keinerlei "Hier einordnen"-Buttons an – das Spiel wirkte
komplett eingefroren, obwohl serverseitig alles korrekt funktionierte.
Behoben durch einen zusätzlichen `roomUpdate`-Broadcast direkt nach der
Team-Zuweisung in `startGame`, noch bevor die erste Runde beginnt.

## 7c. Wissenstest-Auflösung ohne Auto-Weiterschalten & Host kann Spieler kicken

- **Party-Wissenstest, kein automatisches Weiterspringen mehr:** Nach der
  Auflösung jeder Frage sprang der Server bisher nach 3,2 Sekunden von selbst
  zur nächsten Frage (`resolveQuizQuestion()` in `server.js`). Jetzt wartet
  er auf eine explizite `continue`-Aktion des Hosts (neues Flag
  `rt.awaitingContinue`, ausgewertet in `advanceQuizQuestion()`) – genau wie
  es beim Rundenende bereits der Fall war. Client: `renderPartyQuizReveal()`
  zeigt jetzt einen "WEITER"-Button (nur für den Host; alle anderen sehen
  "Warte auf den Host …", identisch zum bestehenden Muster bei
  `renderPartyRoundEnd()`).
- **Host kann Mitspieler aus dem Wartezimmer werfen:** Neue Aktion
  `kickPlayer` (nur im Lobby-Zustand, nur durch den Host, Host kann sich
  nicht selbst kicken, gilt nur für menschliche Spieler – Bots weiterhin
  über den bestehenden "Bot entfernen"-Button). Funktion `kickPlayer()` in
  `server.js`, analog zu `removeBot()`: entfernt aus `room.players` und aus
  allen Team-Zuordnungen, baut bei "Alle gegen alle" die Teams neu auf.
  Der betroffene Spieler bekommt zusätzlich eine eigene `kicked`-Nachricht
  und einen Hinweisbildschirm ("Aus dem Raum entfernt"), bevor seine
  Verbindung serverseitig geschlossen wird – Client: neuer Fall `"kicked"`
  in `partyHandleMessage()`, Funktion `renderPartyKicked()`. Sichtbar in der
  Lobby als "✕"-Button neben jedem menschlichen Mitspieler (außer dem Host),
  nur für den Host selbst.

## 7d. Stadt Land Fluss als eigenständiger Modus (nicht mehr Teil des Mixes)

Stadt Land Fluss ist kein Rundentyp mehr innerhalb des normalen (gemischten)
Solo-Party-/Multiplayer-Rundenpools, sondern ein eigener Hauptmenüpunkt mit
eigenem Solo- und Multiplayer-Einstieg – genau wie "Solo" und "Multiplayer"
eigene Menüpunkte sind.

- **Hauptmenü:** dritte Kachel "Stadt Land Fluss" (`renderMainMenu()` in
  `public/index.html`), für nicht-deutsche UI-Sprache ausgegraut, da das
  Spiel ein reines Wortspiel auf Deutsch ist. Führt zu `startSlfMenu()` mit
  den Unterpunkten "Solo" (`startSoloPartyFlow('slf')`) und "Multiplayer"
  (`startPartyFlow('slf')`) – beide nutzen dieselbe bestehende Lobby-/
  Rundenbau-Infrastruktur wie der normale Party-Modus, nur mit auf Stadt
  Land Fluss beschränktem Rundenpool.
- **Server:** jeder Raum hat jetzt ein Feld `room.gameMode` ("mixed" oder
  "slf", gesetzt beim `createRoom` über `msg.gameMode`). Der normale
  Rundenpool (`buildRoundDefPool()`/`ROUND_DEF_POOL`) enthält Stadt Land
  Fluss nicht mehr; stattdessen gibt es einen eigenen, kleinen
  `SLF_ROUND_DEF_POOL` (Original + Party-Mix), der nur Räumen mit
  `gameMode:"slf"` angezeigt wird (`roundDefPoolForLanguage(language,
  gameMode)`). "Eigene Kategorien" bleibt wie gehabt über die interaktive
  Aktion `setSlfCustomRoundDef` erreichbar (nicht Teil des Pools). Die
  Sprache lässt sich in einem SLF-Raum nicht umschalten (`case
  "setLanguage"` ignoriert das für `gameMode==="slf"`), sonst würde der
  Kategorien-Pool leerlaufen, da alle SLF-Einträge `germanOnly` sind.
- **Neuer Modus "Party-Mix":** zieht bei jedem tatsächlichen Rundenstart
  (nicht schon beim Zusammenstellen der Runde) 10 zufällige, unterschiedliche
  Kategorien aus dem neuen Pool `SLF_PARTY_CATEGORIES` (~50 Einträge, u.a.
  Promi, Musiktitel, Superkraft, Zaubertrick, Serientitel, Videospiel,
  Fastfood-Gericht, Fabelwesen, Ausrede, Karnevalskostüm – gemischt mit ein
  paar der klassischen Original-Kategorien). Funktionen `slfBuildRoundDef()`
  (jetzt mit drittem Modus `"party"`, Flag `slfPartyMix:true`) und
  `pickRandomSlfPartyCategories()` in `server.js`; Auflösung der Kategorien
  passiert in `startStadtLandFlussRound()`. Weitere/andere Kategorien für
  den Party-Mix-Pool: einfach `SLF_PARTY_CATEGORIES`-Array in `server.js`
  erweitern oder anpassen, `SLF_PARTY_ROUND_SIZE` ändert die Anzahl pro
  Runde (aktuell 10).
- **Rundenbau (Client):** dritter Button "🎉 Party-Mix" neben "🎲 Original"
  und "✏️ Eigene Kategorien" in `renderRoundBuilder()`, Funktion
  `builderSlfChoosePartyMix()`.

## 7e. Stadt Land Fluss: Bots, Eile-Timer, neue Wertung & Tippfehler-Erkennung

- **Bots schreiben jetzt mit:** vorher haben Bots bei Stadt Land Fluss gar
  nichts abgegeben. Jetzt gibt es `SLF_BOT_WORDS` in `server.js` – ein
  bewusst kleiner, verlässlicher Wortschatz NUR für die 7 klassischen
  Original-Kategorien (Stadt/Land/Fluss/Name/Tier/Beruf/Pflanze), je
  Buchstabe, so weit sinnvoll möglich. Für den 50-Kategorien-Party-Mix-Pool
  oder unbekannte Buchstabe/Kategorie-Kombinationen bleibt das Feld leer –
  ein vollständiges Wörterbuch über alle 50 Kategorien wäre nicht seriös
  leistbar gewesen. Funktion `scheduleBotSlfAnswers()`, aufgerufen am Ende
  von `startStadtLandFlussRound()`: jeder Bot "tippt" mit zufälliger
  Verzögerung (25–80 % der Schreibzeit) und trifft ein bekanntes Wort nur
  mit der Erfolgswahrscheinlichkeit seiner Bot-Stufe (`tier.prob`, wie auch
  bei Wissenstest/Einordnen). Weitere Wörter ergänzen: einfach
  `SLF_BOT_WORDS` erweitern.
- **Eile-Timer (15 Sekunden):** sobald jemand mit ALLEN Feldern ausgefüllt
  abgegeben hat, bekommen alle anderen nur noch `SLF_HURRY_MS` (15000ms)
  Zeit statt der vollen 80 Sekunden – aber nur, wenn wirklich jedes Feld
  befüllt war (eine unvollständige Abgabe löst das nicht aus). Logik in
  `handleSlfSubmit()` in `server.js`, neue Broadcast-Nachricht
  `slfHurryUp`. Client: `handleSlfHurryUp()` in `public/index.html` startet
  den lokalen Countdown neu (ab jetzt, nicht ab Rundenbeginn) und blendet
  den Hinweis "⏱ Jemand ist fertig — nur noch 15 Sekunden für alle!" ein.
- **Neue Wertung (statt eindeutig=20/doppelt=10):** pro Kategorie unter
  allen gültigen Antworten –
  gleiches Wort wie mind. 1 anderer Spieler → **5** Punkte,
  eigenes (anderes) Wort, aber mind. 1 anderer Spieler hat ebenfalls eine
  gültige Antwort in der Kategorie → **10** Punkte,
  als einzige/r überhaupt eine gültige Antwort in der Kategorie → **20**
  Punkte. Logik in `slfComputeScores()` in `server.js`.
- **Tippfehler-Erkennung:** zwei unterschiedliche Wörter in derselben
  Kategorie mit Editierdistanz 1 (z.B. "Berlin"/"Berln" – ein Buchstabe
  Unterschied) gelten als vermuteter Tippfehler desselben Wortes; beiden
  Beteiligten werden zusätzlich 5 Punkte von der jeweiligen Grundwertung
  abgezogen (nie unter 0). Neue Funktion `levenshteinDistance()` in
  `server.js`.
- **Anfechtung wirkt sich kaskadierend auf die Wertung aus:** wird eine
  Antwort per Anfechtung für ungültig erklärt, wird sie bei der Neuberechnung
  der Wertung komplett ausgeschlossen – dadurch kann z.B. aus "10 Punkte, da
  noch jemand anderes gültig war" nach einer erfolgreichen Anfechtung gegen
  genau diese Konkurrenz-Antwort automatisch "20 Punkte, da jetzt einzige
  gültige Antwort" werden. War schon strukturell in `slfComputeScores()`
  angelegt (Parameter `invalidPlayerCatPairs`), jetzt mit Tests abgesichert.

## 7f. Bugfix: Bilder bei "Bild erraten" wurden nicht angezeigt

`promptType` ("emoji" oder "image") steht in `shared/partyDatasets.json`
nur einmal auf Ebene des ganzen Datensatzes (`dsRaw.promptType`), nicht bei
jedem einzelnen Element. `nextGuessItem()` in `server.js` hat aber
fälschlich `rt.current.promptType` (vom einzelnen Element, existiert dort
gar nicht → `undefined`) an den Client gesendet statt des tatsächlichen
Werts. Der Client interpretierte dadurch das Emoji als Bild-URL
(`<img src="🦁">`), was natürlich nicht lädt – sichtbar als leeres
Bild-Icon mit dem Alt-Text "Errate das Bild". Behoben: `promptType` wird
jetzt einmal beim Rundenstart in `room.runtime.promptType` abgelegt und von
dort für jedes Element im Broadcast verwendet.

## 7g. Bugfix: Bild erraten zeigte das Bild am Anfang kurz unverschwommen

Das `#guessImage`-Element wurde beim Rendern zunächst OHNE Weichzeichner
erzeugt – die Unschärfe wurde erst im ersten Tick des Countdown-Timers
(`startGuessTicker()`, alle 100ms) gesetzt. In der kurzen Lücke dazwischen
war das Bild/Emoji kurz komplett scharf zu sehen. Behoben: Startunschärfe
(`filter: blur(18px)`) steht jetzt direkt inline im initialen HTML in
`renderPartyGuessItem()`, `public/index.html`.

## 7h. Einordnen: komplett neuer, gleichzeitiger Einzelspieler-Modus

Größter Umbau dieser Session: "Einordnen" ist nicht mehr rundenbasiert
(Teams abwechselnd am Zug), sondern jeder Spieler bekommt sein **eigenes**
1..N-Positionsraster mit denselben Elementen, eigene 3 Leben, und alle
platzieren **gleichzeitig**, ohne Rundenwechsel. Chronologie und Mehr oder
Weniger sind davon unberührt und laufen weiterhin über die alte,
rundenbasierte Engine (`startRankingRound()`/`handleRankPlace()` usw.).

- **Neue, eigenständige Engine** in `server.js`: `startOrderingSimultaneousRound()`,
  `handleOrderingPlace()`, `isOrderingSlotCorrect()`, `validOrderingSlots()`,
  `broadcastOrderingState()` (personalisiert – jeder Spieler sieht nur sein
  eigenes Raster/Pool, dazu eine Mini-Bestenliste mit dem FORTSCHRITT der
  anderen, nicht deren Antworten), `finalizeOrderingRound()`,
  `scheduleBotOrderingPlays()`. Neue Nachrichtentypen: `orderingState`,
  `orderingHurry`, `orderingFinalReveal`. Client: `renderPartyOrdering()`,
  `renderPartyOrderingFinal()` in `public/index.html`.
- **Erster und letzter Tipp automatisch richtig:** ergibt sich automatisch
  aus der Nachbar-Prüfung in `isOrderingSlotCorrect()` (kein Sonderfall-Code
  nötig) – beim ersten Tipp gibt es noch keinen Nachbarn zum Vergleichen,
  beim letzten verbleibenden Element/Slot ist die Position rechnerisch
  zwangsläufig die einzig mögliche.
- **Konstanten** (ganz oben im Abschnitt "RUNDE: orderingGame" in
  `server.js`): `ORDERING_LIVES` (3), `ORDERING_HURRY_MS` (30000 – Restzeit
  für alle anderen, sobald jemand PERFEKT fertig ist, also alle Elemente
  richtig UND kein Leben verloren), `ORDERING_ROUND_CAP_MS` (160000 –
  absolute Obergrenze für die ganze Runde, greift z.B. wenn nur eliminiert
  statt perfekt abgeschlossen wird), `ORDERING_POINTS_PER_CORRECT` (10,
  Team-Punkte je korrekt platziertem Element, aufsummiert aus allen
  Team-Mitgliedern).
- **Rang am Rundenende:** fertige Spieler (auch mit Fehlern unterwegs) vor
  allen anderen; unter den fertigen zählen zuerst mehr verbliebene Leben,
  dann höhere Geschwindigkeit (frühere Abschlusszeit); unter den übrigen
  (eliminiert oder Zeit abgelaufen) zählen mehr korrekt platzierte Elemente.
  Logik in `finalizeOrderingRound()`.
- **Bots** spielen jetzt ebenfalls unabhängig auf ihrem eigenen Raster mit
  (`scheduleBotOrderingPlays()`), nicht mehr an einen Rundenwechsel
  gebunden.
- Mit echten Server-Läufen geprüft: erster/letzter Punkt frei, perfekte
  Fertigstellung löst den 30s-Eile-Timer beim jeweils anderen Spieler aus
  (Zeitmessung bestätigt ca. 30,3s bis Rundenende), Elimination/unperfekte
  Fertigstellung löst ihn NICHT aus (anderer Spieler behält die vollen
  ~160s), Rangfolge bei gemischtem Ausgang, Bot-Teilnahme.
- `test/run-test.js`/`test/run-bot-test.js` auf das neue `orderingState`-
  Protokoll umgestellt und deren interne Timeouts erhöht (200s bzw. 300s),
  da eine einzelne Einordnen-Runde jetzt bis zu 160s dauern kann – rein
  testinfrastrukturell, das Spiel-Timing selbst ist unverändert wie
  gewünscht.

## 7i. Neue Kategorie "Musik raten" (YouTube-Audio-Rateduell)

Analog zu "Bild erraten", aber mit einem YouTube-Clip statt einem Bild.
Genau wie Stadt Land Fluss ist "Musik raten" **zusätzlich** ein eigener
Hauptmenüpunkt (Solo/Multiplayer) – bleibt aber, anders als Stadt Land
Fluss, auch weiterhin als normale Kategorie im gemischten Rundenpool wählbar
(Solo-Party, lokaler Multiplayer, Online-Party), wie gewünscht.

**Songdaten** in `shared/partyDatasets.json`, neuer Bereich `guessMusic`,
zwei Kategorien:
- `musik_demo`: 2 Beispielsongs (Queen – Bohemian Rhapsody, Toto – Africa)
- `musik_kernliste`: **107 Songs** über zwei Nachrichten hinweg zusammengetragen
  (Liste 1 + Liste 2 – Erweiterung), mit recherchierten, echten YouTube-Video-IDs
  (offizielle Kanäle geprüft, teils Charts/Mainstream, teils Deutschrap,
  Schlager, Ballermann, deutscher & internationaler Rock, Oldies/Klassiker)

Jeder Eintrag: `youtubeId`, `startSeconds`, `clipSeconds`, `title`, `artist`,
`year`, `genre`, `cover` (aktuell überall `null` – optionales Cover-Bild-URL
für die Auflösung, du kannst welche ergänzen). **Wichtig:** `startSeconds`
steht bei allen 107 Songs pauschal auf **45 Sekunden** (geschätzt, nicht
exakt geprüft) – ich kann nicht Probehören, ob dort wirklich der Refrain
läuft. Zum Feintunen einfach die Zahl je Song in der JSON-Datei anpassen,
nachdem du reingehört hast.

**Nicht gefundene/nicht zuordenbare Titel aus Liste 1** (fehlen daher
aktuell in `musik_kernliste`):
Capital Bra: *400 PS* (nur eine Zeile im Song "Rolli von Pablo", kein
eigener Titel), *Kuchen*; Samra: *Bahama Mama*, *Toxic (mit Farid Bang)*,
*Girl Gang (mit Loredana)*; Apache 207: *Advanced Chemistry* (das ist eine
andere, unabhängige alte Rap-Gruppe), *Belly Dancer* (ist tatsächlich von
Imanbek & BYOR, nicht Apache 207), *Nika*, *Liebe Sonne* (evtl. "Capri
Sonne" gemeint?); Bushido: *Vergissmeinnicht* (Titel existiert als
Sampler-Track, aber kein eigenes offizielles Musikvideo gefunden); Cro:
*Melodie* (nur MTV-Unplugged-/Interview-Videos gefunden, kein Original-
Studio-Musikvideo). Auf Wunsch des Nutzers bewusst weggelassen statt
geraten.

**Nicht gefundene/nicht zuordenbare Titel aus Liste 2 – Erweiterung** (ebenfalls
bewusst weggelassen): Kollegah: *Bruder*, *Zuhältertape* (ist eine
Albumreihe, kein Songtitel); Farid Bang: *Sadopoli*; Kay One: alle 3 Titel
(*Ohne mein Team* ist tatsächlich Bonez MC & RAF Camora – dort korrekt
enthalten; *Nie mehr Männer*, *Boomerang* nicht gefunden); RAF Camora: *55*
(stattdessen "Anthrazit Forever" 2024 als nächstliegender echter Song
aufgenommen, da das Original "Anthrazit" ohne klares offizielles Video);
257ers: *Hoodie*, *Erwin*, *Neuer Toyota* (keiner gefunden); Marteria:
*Sonnendeck* (ist von PeterLicht, nicht Marteria); Samra: *Catala* (evtl.
"Cataleya" gemeint, nur Remix-Video gefunden), *Berlin lebt 2* (ist der
Albumname – stattdessen Titeltrack "Berlin lebt wie nie zuvor"
aufgenommen); Micky Krause *Layla* – **bewusst nicht aufgenommen**: der Song
ist tatsächlich von DJ Robin & Schürze (nicht Micky Krause) und war 2022
wegen sexistischer Texte an mehreren Orten verboten; Vanessa Mai *Bianca*
(kein solcher Titel in ihrer Diskografie); Wackelkontakt/Achim Petry –
keine konkreten Songtitel, zu unklar. "Monsun" und "Durch den Monsun" sind
derselbe Tokio-Hotel-Song, nur einmal aufgenommen. "From Fall to Spring"
(deutsche Metalcore-Band aus dem Saarland) wurde vollständig bestätigt –
alle 4 genannten Songs sind real.

**Server** (`server.js`, Abschnitt "RUNDE: guessMusic"): `startGuessMusicRound()`,
`nextMusicItem()`, `handleMusicReplay()`, `handleMusicSubmit()`,
`resolveMusicItem()`, `scheduleBotMusicGuesses()`. Server kennt nur
Video-ID/Zeitstempel/Dauer, keine Wiedergabe selbst – die läuft komplett im
Client.

**Rate-Mechanik (nach Rückfrage so festgelegt):** alle hören den Clip
gemeinsam/gleichzeitig, geben aber einzeln drei Antworten ab – Künstler,
Titel, Jahr. Jedes Feld zählt für sich (schon ein richtiges Feld gibt
Punkte, mehrere richtige Felder addieren sich). Punkte je richtigem Feld =
`MUSIC_FIELD_MAX_POINTS` (3) minus Anzahl der bis zur EIGENEN Abgabe
genutzten Wiederholungen (nie unter 1) – wer sofort abgibt, ohne dass die
Gruppe eine Wiederholung angefordert hat, bekommt also bis zu 3 Punkte pro
Feld (9 gesamt bei allen dreien), nach einer Wiederholung nur noch bis zu 2
(6 gesamt), nach zwei Wiederholungen bis zu 1 (3 gesamt). Jede/r Spieler/in
kann jederzeit "Nochmal hören" anfordern (max. `MUSIC_MAX_REPLAYS` = 2 pro
Song, geteilt für den ganzen Raum) – der Clip läuft dabei **ab der
Stopp-Stelle weiter** (nicht von vorne), jeweils weitere `clipSeconds`.
Wichtig: die Punkte-Obergrenze wird für jede Abgabe genau in dem Moment
festgeschrieben, in dem abgegeben wird – gibt jemand ab, BEVOR die Gruppe
eine Wiederholung nutzt, bleibt sein Ergebnis bei einer späteren
Wiederholung durch andere unverändert (mit echtem Serverlauf verifiziert:
früh + richtig abgegeben = 9, blieb nach einer späteren Wiederholung durch
eine andere Person bei 9). Jahr wird exakt verglichen, Künstler/Titel
tippfehlertolerant über dieselbe `isGuessCorrect()`-Logik wie bei Bild
erraten. Songtitel und Interpret sind unabhängige Felder (nicht wie zuvor
eine einzelne Buzzer-Antwort).

**Client** (`public/index.html`): YouTube IFrame API wird bei Bedarf einmalig
nachgeladen (`loadYouTubeApi()`), der Player läuft unsichtbar (1×1 Pixel,
per CSS versteckt) mit einem Overlay (🎵-Symbol) darüber, damit Titel/Cover
im eingebetteten Player die Antwort nicht verraten. Rate-Bildschirm
(`renderPartyMusicItem()`) zeigt drei Eingabefelder (Künstler/Titel/Jahr),
einen "🔁 Nochmal hören"-Button mit Live-Anzeige der verbleibenden
Wiederholungen und der aktuellen Punkte-Obergrenze, sowie einen Feed, wer
bereits abgegeben hat. Auflösung (`renderPartyMusicResolved()`) zeigt
Titel/Interpret/Jahr/Cover sowie je Spieler/in, welche Felder richtig waren
und wie viele Punkte es gab.

**Fallback bei nicht verfügbarem Video:** `onError`-Event des YouTube-Players
zeigt "Video nicht verfügbar" an, die Runde läuft aber ganz normal weiter
(Zeit-Obergrenze `MUSIC_ROUND_CAP_MS` greift wie gewohnt). **Autoplay-Hinweis:**
manche Browser blockieren Ton-Autoplay ohne vorherige Nutzerinteraktion – in
dem Fall erscheint automatisch ein "▶ Ton abspielen"-Button.

**Wichtige Einschränkung:** Ich konnte die eigentliche YouTube-Wiedergabe im
Browser hier nicht selbst testen (keine echte Browser-Umgebung in meiner
Werkstatt) – nur den Server-Ablauf (Rundenwechsel, Zufallsauswahl, geteilter
Wiederholungszähler mit Fortsetzung ab Stopp-Stelle, Feld-für-Feld-Wertung,
Punkte-Obergrenze wird korrekt bei Abgabe festgeschrieben) mit echten
Serverläufen samt echten Songdaten. Der Player-Code folgt dem offiziellen,
etablierten YouTube-IFrame-API-Muster, aber probier ihn bitte einmal live
aus, bevor du dich darauf verlässt – insbesondere den Autoplay-Fall auf dem
Handy.

## 7j. Solo-Einstieg korrigiert: 1 Runde mit Kategorie-Auswahl (nicht 5 automatisch)

Korrektur zu 7j (die erste Fassung startete automatisch 5 zufällige Runden –
das war ein Missverständnis meinerseits, jetzt richtiggestellt):

Bugfix nebenbei: `startSoloPartyFlow()` kannte den Modus `"music"` bisher
gar nicht (fiel fälschlich auf den gemischten Modus zurück) – behoben.

Alle drei Solo-Einstiege (Stadt Land Fluss – Solo, Musik raten – Solo, der
gemischte Solo-Modus) laufen jetzt so: Name bestätigen (Karte im Stil des
Wissenstest-Bestätigungsbildschirms) → Kategorie-Auswahl-Bildschirm
(`renderSoloCategoryPicker()`) mit "🎲 Zufällig" plus einer Kachel pro
verfügbarer Kategorie **im jeweiligen Modus** (bei Stadt Land Fluss/Musik
raten also nur deren eigene Kategorien, beim gemischten Modus alle
Rundentypen inkl. Wissenstest/Einordnen/Chronologie/Mehr-oder-Weniger/Bild
erraten/Musik raten einzeln wählbar) → danach genau **1 Runde** dieser
Kategorie (nicht mehr 5). Umgesetzt über `chooseSoloCategory()`: setzt
`roundCount` auf 1 (Server erlaubt das jetzt explizit, `allowed = [1, 5, 10,
15, 20]` in `case "setRoundCount"`), bei konkreter Auswahl zusätzlich
`roundMode:'custom'` + `setRoundDef` auf genau diese eine Kategorie, sonst
`roundMode:'random'`. Ein Flag `party.soloPickerDone` verhindert, dass der
Auswahlbildschirm während der folgenden Zwischen-`roomUpdate`s (ausgelöst
durch die einzelnen `setRoundCount`/`setRoundMode`/`setRoundDef`-Aktionen)
nochmal aufblitzt. Nach der einen Runde: Abschlussbildschirm mit "Noch eine
Runde" (→ wieder zur Kategorie-Auswahl, Name bleibt gemerkt) oder "Zum
Hauptmenü" (komplett raus) – wie gewünscht.

Mit echten Serverläufen für alle drei Modi verifiziert: Kategorie-Auswahl
zeigt die richtige, modus-eigene Liste; `roundCount` wird korrekt auf 1
gesetzt; die Runde läuft genau einmal; `gameEnd` wird direkt danach erreicht
(nicht erst nach 5 Runden); eine explizit gewählte Kategorie (getestet:
Stadt Land Fluss "Original") wird auch tatsächlich verwendet.

## 7k. "Solo" = direkt WissensDuell, "Solo-Party" (gemischt) entfernt

Der gemischte "Solo-Party"-Modus war nur ein internes Test-Werkzeug des
Nutzers, kein für Mitspieler gedachtes Feature, und wurde daher aus der
Navigation entfernt. Die Hauptmenü-Kachel "Solo" heißt jetzt "WISSENSDUELL"
(Übersetzungsschlüssel `menu_solo_title`) und führt weiterhin direkt zum
klassischen Wissenstest (`startSoloFlow()`) – daran hat sich strukturell
nichts geändert, nur die Beschriftung. Die frühere Zwischenauswahl
"Wissenstest vs. Solo-Party" (`startSoloMenu()`) war im Hauptmenü ohnehin
schon nicht mehr verlinkt; die Funktion ist jetzt eine reine Weiterleitung
auf `renderMainMenu()`, damit die drei bestehenden Verweise darauf (als
"Zurück"-Ziel bei Verbindungsfehlern) weiter funktionieren, ohne dass an
drei Stellen im Code etwas geändert werden musste. Stadt Land Fluss – Solo
und Musik raten – Solo sind davon nicht betroffen (nutzen weiterhin
`startSoloPartyFlow('slf')` bzw. `('music')`, jetzt mit dem in 7j
beschriebenen 1-Runden-Ablauf).

## 7l. Neuer Modus "Nenn's Blitz" (Freitext-Kategorien, jetzt mit reihum-Duell)

Neue Rundenart: Spieler tippen frei so viele richtige Begriffe zu einer
Kategorie wie möglich (kein Buzzer, kein mündliches Nennen). Nach mehreren
Rückfragen zum Duell-Design (Zeit-Umschaltung, Zugreihenfolge) so
finalisiert:

**Validierung**: bewusst **kein** Lösungslisten-System (nach Rückfrage so
festgelegt). Jede getippte Antwort zählt sofort vorläufig; nach Rundenende
folgt eine Anfechtungsphase (direkt von Stadt Land Fluss übernommenes
Muster: Anfechten + Mitspieler-Abstimmung, Mehrheitsentscheid, bei
Gleichstand bleibt die Antwort gültig). `NENNSBLITZ_CHALLENGE_MS` = 30s
(Fenster zum Anfechten), `NENNSBLITZ_VOTE_MS` = 20s (Abstimmzeit je
einzelner Anfechtung, an SLF angelehnt).

**Ablauf Solo**: einfache freie 15-Sekunden-Runde, alle Antworten sofort
eintippbar (`NENNSBLITZ_SOLO_MS`). Unverändert seit der ersten Fassung.

**Ablauf Duell (2+ Spieler) – jetzt reihum, nicht mehr gleichzeitig**:
Nach mehreren Rückfragen (Zeit-Umschaltung 30→15s, Zugreihenfolge bei 2v2)
so verstanden und umgesetzt – **bitte beim Anschauen gegenprüfen, einige
Annahmen mussten getroffen werden, siehe unten:**
- **Zugreihenfolge**: über alle Teams interleaved (Team-Index 0 aller Teams
  zuerst, dann Index 1, usw.) – bei 2v2 mit Team1=[A,B]/Team2=[C,D] ergibt
  das genau A, C, B, D wie besprochen. Mit echtem Serverlauf exakt
  bestätigt (P1, P3, P2, P4 bei entsprechender Team-Zuordnung).
- **Hauptrunde**: jede Person hat ihren EIGENEN Zug mit eigener Zeit (nicht
  ein gemeinsam schrumpfender Timer) – erste Hälfte der Zugreihenfolge
  bekommt 30s (`NENNSBLITZ_HAUPT_FIRST_MS`), zweite Hälfte 15s
  (`NENNSBLITZ_HAUPT_SECOND_MS`). Bei 2v2 (4 Züge): A,C = 30s, B,D = 15s.
  Bei 1v1 (2 Züge): erste Person 30s, zweite 15s.
- **Finalrunde** (**Annahme, da vom Nutzer nicht abschließend geklärt**:
  läuft IMMER direkt nach der Hauptrunde, nicht nur bei Gleichstand):
  dieselbe Zugreihenfolge nochmal, aber stark verkürzt: 7s/Zug bei 1
  Spieler pro Team (`NENNSBLITZ_FINAL_1V1_MS`), 10s/Zug bei 2 Spielern pro
  Team (`NENNSBLITZ_FINAL_2V2_MS`). Bei 3+ Spielern/Team (z.B. 3v3) auf 12s
  verallgemeinert (`NENNSBLITZ_FINAL_LARGER_MS`) – dafür gab es keine
  explizite Vorgabe.
- **Nur die Person am Zug darf tippen** – mit echtem Serverlauf bestätigt
  (ein Versuch außerhalb des eigenen Zugs wird stillschweigend ignoriert).
- **Duplikat-Prüfung jetzt GLOBAL** über alle bisherigen Züge/Spieler:innen
  hinweg (nicht mehr nur "im eigenen Feld"), da im Duell alle nacheinander
  einen gemeinsamen Begriffs-Pool füllen – ein bereits genannter Begriff
  zählt nicht nochmal, egal von wem. Mit echtem Serverlauf bestätigt
  (abweichende Groß-/Kleinschreibung wird korrekt als Duplikat erkannt).
- Nach Hauptrunde + Finalrunde folgt dieselbe Anfechtungs-/Wertungs-
  Pipeline wie Solo (unverändert wiederverwendet).

**Punktevergabe**: 1 Punkt pro gültiger Antwort, je Team aufsummiert – für
Solo und Duell gleichermaßen (vom Nutzer bestätigt).

**Bots im Duell-Modus**: nehmen jetzt an ihrem eigenen Zug teil (tempo-
/trefferquoten-abhängig nach `BOT_TIERS`), tippen aber mangels fester
Lösungsliste nur Platzhalter-Text (`"Antwort <Name> <n>"`) – das ist eine
inhärente Folge der bewusst gewählten freitextbasierten Validierung ohne
Lösungsliste, kein Bug. Sie tragen zum Spielfluss/Tempo bei, ihre Antworten
sind aber nicht als "echtes" Kategoriewissen zu verstehen.

**Kategorien** (`shared/partyDatasets.json`, Bereich `nennsBlitz`, 22
Kategorien, nur Label – keine Lösungsliste nötig): Länder (Allgemein/
Europa/Nicht-Europa/Bundesländer/Bundesländer-Hauptstädte), Tierrassen
(Allgemein/Hunde/Katzen/Fische/Vögel), Marvel-, Disney- und DC-Charaktere,
"Ich bin ein Star"- und "Promi Big Brother"-Kandidat:innen, Naruto/One
Piece/Dragonball-Charaktere, Twitch-Streamer mit über 1 Mio. Followern,
Fußball (Mannschaften/Champions-League-Sieger/beidfüßige Spieler).
Unterkategorien sind **eigene, einzeln wählbare Einträge** im Rundenpool
(z.B. "Nenn's Blitz: Tierrassen: Hunde"), wie besprochen. "Champions
Sieger / Seasen 1" aus der Anforderung war nicht eindeutig – nur
"Champions-League-Sieger" umgesetzt, "Seasen 1" ausgelassen (bitte klären,
falls damit etwas Eigenständiges gemeint war). Kategorie "Schauspieler"
wie gefordert NICHT aufgenommen. Weitere Fußball-Kategorien ("es kommen
noch welche nach") können jederzeit einfach als neue Einträge in
`DATASETS.nennsBlitz` ergänzt werden – kein Code muss dafür geändert
werden.

**Einbindung**: normale Kategorie im gemischten Rundenpool (`ROUND_DEF_POOL`,
`germanOnly: true`) – funktioniert daher auch in Solo-Party und im
1-Runden-Kategorie-Picker aus 7j.

**Client** (`public/index.html`): neue Bildschirme `renderNennsBlitzTurn()`
(zeigt Zugreihenfolge/Phase/wer dran ist/Timer; nur die Person am Zug sieht
ein Eingabefeld, alle anderen eine Warteanzeige) und
`handleNennsBlitzTurnUpdate()` (Live-Liste bereits genannter Begriffe für
alle sichtbar). Die bestehende Auflösungs-/Anfechten-/Abstimmungs-
Bildschirme (`renderNennsBlitzReveal()` etc.) wurden unverändert
wiederverwendet.

Mit mehreren echten Serverläufen ausführlich getestet: kompletter 1v1-
Durchlauf (Hauptrunde 30s/15s, Finalrunde 7s/7s, Anfechten-Fenster,
Endwertung – alles korrekt), 2v2-Zugreihenfolge exakt wie erwartet
(P1→P3→P2→P4 mit 30s/30s/15s/15s), Zugbeschränkung (nur aktive Person darf
tippen) bestätigt, globale Duplikat-Erkennung bestätigt, Solo-Modus
weiterhin unverändert korrekt, Standard-Regressionstest (andere
Rundentypen) läuft unverändert sauber durch.

## 7m. Solo-Kategorie-Picker: jetzt mit Rundenzahl-Auswahl (nicht mehr fest 1)

Korrektur zu 7j: der Solo-Einstieg für Stadt Land Fluss, Musik raten (und
künftige weitere eigenständige Modi) zeigt jetzt zusätzlich zur Kategorie-
Auswahl auch die Rundenzahl-Chips (1/5/10/15/20, `roundCountChipsHtml()` –
existierte als wiederverwendbarer Baustein bereits, war hier nur noch nicht
eingebunden). Wählt man eine bestimmte Kategorie, wird sie für die gewählte
Rundenzahl mehrfach gesetzt (`setRoundDef` je Slot); bei "Zufällig/Gemischt"
übernimmt weiterhin `roundMode:'random'` die Auswahl automatisch. Mit
echtem Serverlauf bestätigt (roundCount=5 gewählt → tatsächlich 5 Runden
derselben Kategorie gespielt, nicht mehr fest 1) sowie einer Simulation der
Client-Logik (roundCount=10 gewählt → exakt 10 `setRoundDef`-Aufrufe mit
derselben Kategorie, dann `startGame`).

## 7n. Musik raten: Demo-Kategorie entfernt, Schummel-Schutz verstärkt, ein kaputter Song ersetzt

- **Demo-Kategorie entfernt**: `musik_demo` (die 2 Beispielsongs) gibt es
  nicht mehr, `guessMusic` enthält nur noch `musik_kernliste` (107 Songs).
- **Schummel-Schutz verstärkt** (wichtiger Hinweis: über die Handy-
  Benachrichtigungsleiste/Sperrbildschirm ließ sich der echte Songtitel
  über die Media-Session-Anzeige des Betriebssystems sehen, obwohl der
  Player auf der Seite selbst unsichtbar ist): Es gab bereits einen Ansatz
  dafür (`suppressMusicMediaSession()`, einmaliges Überschreiben der
  Metadaten), der aber nicht ausreichte. Grund: der YouTube-Player läuft in
  einem eigenen Cross-Origin-iframe, das jederzeit erneut SEINE eigenen
  (echten) Metadaten in die Media Session schreiben kann – ein einmaliges
  Überschreiben von der Elternseite aus wird dadurch potenziell wieder
  überschrieben. Neu: `startMusicMediaSessionGuard()`/
  `stopMusicMediaSessionGuard()` wiederholen das Überschreiben jetzt alle
  400ms, solange ein Hördurchgang läuft, und maskieren zusätzlich kurzzeitig
  den Browser-Tab-Titel. **Ehrliche Einschränkung, die ich nicht verschweigen
  will**: das ist eine Abwehrmaßnahme, keine Garantie – je nach Browser/
  Betriebssystem kann die Media Session dem tatsächlich audioproduzierenden
  Kontext (dem iframe) zugeordnet sein und sich dadurch nicht vollständig
  von der Elternseite aus kontrollieren lassen. Ich kann das mangels echter
  mobiler Browser-Umgebung hier nicht selbst nachstellen/verifizieren –
  bitte auf dem Handy erneut prüfen (Benachrichtigung runterziehen während
  ein Song läuft) und melden, ob es jetzt besser aussieht.
- **Die Ärzte – Westerland reparaturversucht**: die alte Video-ID
  (`tIFFfP87Ooc`, offizieller Sony-Music-Audio-Upload) hat laut Rückmeldung
  nicht funktioniert (vermutlich Embedding gesperrt oder nicht mehr
  verfügbar). Ersetzt durch eine andere, als offizielles Musikvideo
  gelistete Quelle (`KdeBMhXyX6w`). Ich kann Embedding-Fähigkeit nicht
  selbst testen (kein Browser hier) – bitte erneut ausprobieren; falls
  wieder nicht abspielbar, einfach Bescheid geben, dann probiere ich die
  nächste Alternative.

## 7o. "Nenn's Blitz" jetzt auch eigener Hauptmenüpunkt (wie Stadt Land Fluss/Musik raten)

Vierte Kachel im Hauptmenü, analog zu den anderen beiden eigenständigen
Modi: eigenes Untermenü `startNennsBlitzMenu()` mit Solo/Multiplayer,
neuer `gameMode:"blitz"` serverseitig (`NENNSBLITZ_ROUND_DEF_POOL`, nur die
22 Nenn's-Blitz-Kategorien). Bleibt wie Musik raten bewusst **zusätzlich**
auch im normalen gemischten Rundenpool wählbar (anders als Stadt Land
Fluss, das dort nicht mehr auftaucht). Da alle Kategorien deutschsprachig
sind, ist die Hauptmenü-Kachel wie bei Stadt Land Fluss für nicht-deutsche
Sprache gesperrt. Alle `gameMode`-Verzweigungen (Solo-Namenseingabe,
Kategorie-Picker mit Rundenzahl-Auswahl aus 7m, Lobby-/Multiplayer-Titel)
entsprechend erweitert.

Mit echtem Serverlauf bestätigt (`gameMode:"blitz"` liefert ausschließlich
die 22 `nennsBlitz`-Kategorien, Solo-Erkennung funktioniert) sowie einer
kompletten Simulation der Client-Navigation (Hauptmenü-Karte → Untermenü →
Solo-Namenseingabe → korrekter `createRoom`-Aufruf mit `gameMode:"blitz"`).

## 7p. Nenn's Blitz: reihum-Duell wieder zurückgebaut – jetzt Zeit-Auswahl statt Zugreihenfolge

Korrektur zu 7l/7o: das reihum-Prinzip (Hauptrunde 30s/15s + Finalrunde
7s/10s, wechselnde Zugreihenfolge) wurde nach Rückfrage komplett wieder
entfernt. Jetzt wieder wie ganz am Anfang: **alle tippen gleichzeitig**
(kein Buzzer, kein reihum), aber mit anderen Zeiten als zuvor:

- **Solo**: wählbar zwischen 60/90/120/180 Sekunden (vorher fest 15s).
  Auswahl über neue Chips im Kategorie-Picker (nur sichtbar bei
  `gameMode:"blitz"`), sendet `{action:'setNennsBlitzDuration', durationMs}`
  an den Server, gespeichert in `room.nennsBlitzSoloDurationMs`
  (Standardwert 60s, falls nie gesetzt). Mit echtem Serverlauf bestätigt
  (90s gewählt → Runde lief tatsächlich mit 90.000ms, nicht dem Standard).
- **Duell/Multiplayer**: immer fest 120 Sekunden
  (`NENNSBLITZ_DUELL_MS`), keine Auswahl möglich – ein Versuch, trotzdem
  eine andere Zeit zu setzen, wird ignoriert (mit echtem Serverlauf
  bestätigt: 60s-Versuch hatte keine Wirkung, Runde lief mit 120.000ms).
- **Duplikat-Prüfung wieder wie ursprünglich**: nur noch "im eigenen Feld"
  – dieselbe Antwort von zwei verschiedenen Spieler:innen zählt für BEIDE
  unabhängig (kein globaler, geteilter Begriffs-Pool mehr wie in der
  reihum-Fassung). Mit echtem Serverlauf bestätigt (beide Spieler nannten
  "Frankreich", beide bekamen es unabhängig gezählt).
- Die reihum-spezifischen Server-Funktionen (`startNennsBlitzTurn`,
  `advanceNennsBlitzTurn`, `nennsBlitzTurnDuration`,
  `scheduleNennsBlitzBotTurn`) und Client-Bildschirme
  (`renderNennsBlitzTurn`, `handleNennsBlitzTurnUpdate`) wurden entfernt.
  Bots laufen jetzt wieder unabhängig über die gesamte Antwortzeit verteilt
  (`scheduleNennsBlitzBots`), nicht mehr an einen Zug gebunden.
- Anfechten-Mechanik, Punktevergabe (1 pro gültiger Antwort) und alle
  Kategorien sind unverändert.

## 7q. Wissenstest: Aufstiegstest-System statt Punkteschwellen + 45 neue Fragen + Planeten überall

**Wichtiger Hinweis vorab:** deine Sprachnachricht war an einigen Stellen
schwer eindeutig herauszuhören (Zahlen/Selbstkorrekturen) – ich habe das
Muster nach bestem Verständnis umgesetzt und dokumentiere hier genau, wie
ich es interpretiert habe, damit du es leicht korrigieren kannst.

**45 neue Wissenstest-Fragen** (`shared/quizQuestions.json`, jetzt 590
Fragen gesamt): 20× Biologie/Körper (Knochen im Ohr, Ruhepuls, größter/
kleinster Knochen, Chromosomen, Zähne, …), 15× Raumfahrt/Planeten (ergänzt
die bereits 9 vorhandenen), 10× Fußball. Alle mit Schwierigkeit 1-4
eingestuft und Erklärungstext versehen, wie die bestehenden Fragen.

**Planeten in drei weiteren Modi ergänzt** (`shared/partyDatasets.json`):
- Nenn's Blitz: neue Kategorie "Planeten" (Freitext, keine Liste nötig)
- Mehr oder Weniger: "Planeten nach Durchmesser" (echte km-Werte, Merkur
  kleinster bis Jupiter größter)
- Einordnen: "Planeten nach Abstand von der Sonne" (echte Mio.-km-Werte,
  Merkur bis Neptun – Pluto bewusst nicht dabei, gilt seit 2006 nicht mehr
  als Planet)

**Aufstiegstest-System für den Solo-Wissenstest** – so verstanden und
umgesetzt (`public/index.html`, `TIER_TESTS`/`tierTestDifficulty()`/
`pickTierTestQuestions()`): statt kontinuierlich Punkte zu sammeln bis eine
Schwelle erreicht ist, gibt es jetzt pro Rang einen festen Aufstiegstest.
Bestehende Rang-Namen (`RANKS`) wiederverwendet, nur Platin/Diamant in die
übliche Reihenfolge gebracht:

| Von → Zu | Fragen | Nötig richtig | Schwierigkeit |
|---|---|---|---|
| Nicht gelistet → Gelistet | 5 | 4 | leicht |
| Gelistet → Bronze | 5 | 4 | **nur leichte** (explizit gefordert) |
| Bronze → Silber | 10 | 8 | mittel |
| Silber → Gold | 10 | 9 | mittel |
| Gold → Platin | 10 | 10 | schwer |
| Platin → Diamant | 15 | 14 | schwer |
| Diamant → Meister | 15 | 15 | sehr schwer |
| Meister → Großmeister | 20 | 19 | sehr schwer |
| Großmeister → (Obergrenze vorerst) | 20 | 20 | sehr schwer |

Muster dahinter: Fragenanzahl und Schwierigkeit steigen mit dem Rang,
innerhalb einer "Fragenanzahl-Stufe" (10/15/20) wird die nötige Trefferzahl
schrittweise strenger bis auf die volle Zahl, danach beginnt die nächste,
größere Stufe wieder etwas darunter. Bei Nichtbestehen bleibt der Rang
gleich (keine Rückstufung), es gibt einfach eine neue Zusammenstellung an
Fragen beim nächsten Versuch. `profile.tier` (Index in `RANKS`) ist das neue
maßgebliche Feld, `profile.score` bleibt als Hintergrund-Statistik bestehen
(±100/±150 pro Frage wie gehabt, Bonus nur bei bestandenem Test). Für
Konto-Profile wurde `tier` serverseitig in `defaultStats()`/`saveUserStats()`
ergänzt und wird mit gesynct. Der lokale Pass-&-Play-Mehrspieler (separates
Feature, nicht Teil deiner Anfrage) hat weiterhin seine eigene, einfache
Fragenauswahl (`pickQuestionsForLocalMP()`), unverändert in der Wirkung.

Mit einer Simulation der Kernlogik geprüft: Rang-Reihenfolge korrekt,
Fragenanzahl je Test korrekt (5/5/10/10/10/15/15/20/20), Zielschwierigkeit
korrekt (1/1/2/2/3/3/4/4/4), "nur leichte Fragen" bei Gelistet→Bronze
korrekt gefiltert.

**Bei Kapazität/Zeit für mehr:** falls die Interpretation der Testzahlen
nicht ganz stimmt, sag einfach kurz welche Stufe anders sein soll – die
Tabelle oben lässt sich gezielt an einer Stelle in `TIER_TESTS` anpassen,
ohne den Rest anzufassen.

## 7r. Wissenstest: Punktesystem raus, vorzeitiger Abbruch, Abstieg bei 2 Fehlversuchen

Drei Anpassungen am Aufstiegstest-System aus 7q/dem Namens-Update:

- **Punktesystem entfernt**: kein ±100/-150 pro Antwort, kein +150-Bonus
  mehr. Statusleiste (`statusbarHtml()`) zeigt jetzt nur noch den aktuellen
  Rang (Pille), keine Punktzahl mehr. `profile.score` existiert als Feld
  zwar noch (u.a. für `rankPillHtml()`-Wiederverwendung intern), wird aber
  im Wissenstest nicht mehr verändert oder angezeigt.
- **Vorzeitiger Abbruch bei feststehendem Ergebnis**: nach jeder Antwort
  wird geprüft, ob das Bestehen schon sicher ist (genug richtig) ODER schon
  unmöglich geworden ist (selbst mit allen verbleibenden richtig nicht mehr
  genug) – dann geht's direkt zur Auswertung statt weitere Fragen zu
  stellen. Beispiel "5 Fragen, 4 nötig": 2 falsche Antworten beenden den
  Test sofort, da maximal noch 3 richtig möglich wären. Beim nächsten
  Versuch werden neue Fragen gezogen (nutzt die bestehende
  `recentQuestions`-Vermeidung), nicht dieselben wie zuvor.
- **Abstieg bei 2 Fehlversuchen in Folge**: neues Feld
  `profile.consecutiveFails`. Bestehst du einen Aufstiegstest nicht, bleibt
  der Rang zunächst gleich (wie bisher) und der Zähler steigt um 1;
  bestehst du ihn direkt danach nochmal nicht (2x in Folge, ohne
  zwischenzeitlichen Erfolg), wirst du einen Rang zurückgestuft und der
  Zähler wird zurückgesetzt. Ein bestandener Test setzt den Zähler
  ebenfalls zurück auf 0. Für Konto-Profile serverseitig mitgespeichert
  (`defaultStats()`/`saveUserStats()`).
- **"Nicht gelistet" → "Gelistet"-Test verkürzt**: von 5 auf 3 Fragen (2
  nötig statt 4), da die meisten diese Einstiegsstufe ohnehin schaffen.

Mit einer Simulation der Kernlogik geprüft: Testgröße korrekt (3/2), Abbruch
korrekt erst nach dem zweiten Fehler bei "5 Fragen/4 nötig" (nicht schon
beim ersten), Abstieg korrekt erst beim zweiten Fehlschlag in Folge (nicht
beim ersten).

## 7s. Sprachauswahl auf Deutsch/Englisch reduziert

`AVAILABLE_LANGS` (`public/index.html`) zeigt jetzt nur noch Deutsch und
Englisch als wählbare Sprachen. Französisch/Spanisch stehen als
auskommentierte Zeilen direkt daneben im Code bereit – zum Freischalten
später einfach die beiden `// {code:"fr",...}`/`// {code:"es",...}`-Zeilen
einkommentieren, fertig (Übersetzungstexte für fr/es sind in den
`t()`-Objekten weiterhin vorhanden, wurden nicht angefasst). Japanisch/
Chinesisch/Italienisch sind aus der Auswahl entfernt; serverseitig
akzeptiert `SUPPORTED_LANGS` (`server.js`) entsprechend nur noch
`de/en/fr/es`. Ein Sicherheits-Fallback sorgt dafür, dass ein bei
wiederkehrenden Nutzer:innen evtl. noch lokal gespeichertes, jetzt
entferntes Sprachkürzel (z.B. altes `ja`) automatisch auf Deutsch
zurückfällt statt in einem ungültigen Zustand hängen zu bleiben. Mit einer
Simulation geprüft: Auswahl zeigt nur de/en, Fallback von "ja" auf "de"
funktioniert, gültiges "en" bleibt erhalten.

## 7t. Umbenennung: WISSENSDUELL → Brain Pulse (Wissenstest → Brain Test)

Das Gesamtspiel heißt jetzt **Brain Pulse** (App-Titel, Browser-Tab-Titel),
die klassische Solo-Quiz-Kachel im Hauptmenü heißt jetzt **Brain Test**
(vorher "WISSENSDUELL", davor "SOLO"). Beide Namen bewusst nicht pro
Sprache unterschiedlich übersetzt, sondern überall gleich (`I18N.app_title`/
`I18N.menu_solo_title` in `public/index.html`, für alle Sprachen identisch
"BRAIN PULSE"/"BRAIN TEST"). Auch im Server-Startlog, den Code-Kommentaren
und den Media-Session-Anzeigetexten bei Musik raten entsprechend
aktualisiert. Mit einer Simulation geprüft: Hauptmenü zeigt beide neuen
Namen, kein "WISSENSDUELL" mehr sichtbar.

## 7u. Anfechten ohne Zeitlimit (Stadt Land Fluss & Nenn's Blitz)

Die bisherige 30-Sekunden-Grenze für die gesamte Anfechtungsphase
(`SLF_CHALLENGE_MS`/`NENNSBLITZ_CHALLENGE_MS`) ist komplett entfernt – in
beiden Modi. Stattdessen:

- Jede Person kann wie bisher anfechten (unverändert) und meldet sich
  zusätzlich per neuem "FERTIG"-Button bereit
  (`slfChallengeReady`/`nennsBlitzChallengeReady`), sobald sie fertig ist.
- Alle sehen live "X von Y bereit" (neue Felder `readyCount`/`readyTotal`
  in `slfChallengeUpdate`/`nennsBlitzChallengeUpdate`).
- Nur der **Host** hat einen "WEITER"-Button und entscheidet selbst, wann es
  weitergeht (nicht zwingend erst wenn alle bereit sind – informierte
  eigene Entscheidung). Nutzt dafür dieselbe bestehende `"continue"`-Aktion
  wie an anderen Stellen im Spiel (`slfFinalizeRound()`/
  `finalizeNennsBlitzRound()` werden jetzt darüber ausgelöst statt per
  Timer).
- Die Einzelabstimmung über eine konkrete Anfechtung (20s je Anfechtung,
  `SLF_VOTE_MS`/`NENNSBLITZ_VOTE_MS`) ist davon **nicht** betroffen und
  bleibt unverändert – hierzu kam keine Änderung.

Mit echten Serverläufen bestätigt (beide Modi): kein `challengeWindowMs`
mehr in der Auflösungs-Nachricht, Bereitschaftszähler korrekt (0→1→2),
Anfechtungsphase bleibt beliebig lange offen bis der Host manuell
"continue" sendet, danach löst die Auflösung sofort aus (nicht erst nach
30s).

## 7v. Brain Test komplett umgebaut: Klassen-System statt Rang-Namen (500 neue Fragen)

Wichtiger Fund dabei: Der Client hatte seine Wissenstest-Fragen als eigene,
**fest eingebettete** Kopie (`QUESTIONS` in `public/index.html`) – unabhängig
von `shared/quizQuestions.json`. Die 45 in einer früheren Runde
hinzugefügten Fragen (Biologie/Planeten/Fußball) waren dadurch nie im
echten Spiel angekommen. Behoben: `QUESTIONS` wird jetzt direkt aus
`shared/quizQuestions.json` generiert (590 Fragen, synchron).

**Neues Aufstiegssystem** (ersetzt die Rang-Namen Schüler/Student/.../Sheldon
für den Solo-Modus): 10 Klassen wie in der deutschen Schule.
- Eigenes Profil-Feld `klasse` (0-basiert), bewusst getrennt vom alten
  `tier`-Feld – der lokale Pass-&-Play-Mehrspieler nutzt weiterhin
  unverändert RANKS/`tier`/Score, damit dort nichts kaputtgeht.
- Testgröße pro Klasse: 20 Fragen in Klasse 1, +5 je Klasse, gedeckelt bei
  50 (= Größe des Fragenpools je Klasse). Klasse 1–10 also 20, 25, 30, 35,
  40, 45, 50, 50, 50, 50 Fragen.
- Bestehensgrenze: 80% (aufgerundet) – z.B. Klasse 1: 16 von 20 nötig,
  Klasse 7-10: 40 von 50 nötig.
- Aufstieg bei Bestehen, Rückstufung bei zwei Fehlversuchen in Folge (wie
  im vorherigen System, Logik unverändert übernommen).
- **500 komplett neue Fragen** (`KLASSE_QUESTIONS` in `public/index.html`,
  fester 50er-Pool je Klasse), echter Schulstoff je Klassenstufe (Mathe/
  Deutsch/Sachkunde in den unteren Klassen, ab Klasse 6 zusätzlich
  Englisch, ab Klasse 7 Physik/Chemie, Geschichte/Politik durchgehend) –
  Klasse 1 = Grundschul-Anfang (Rechnen bis 20, Alphabet), Klasse 10 =
  Realschulabschluss-Niveau (quadratische Gleichungen, Redoxreaktionen,
  Nachkriegsgeschichte). Aus jedem 50er-Pool wird die für die Klasse
  passende Anzahl zufällig gezogen (`pickKlasseTestQuestions()`), mit
  Fallback auf die nächstniedrigere Klasse, falls ein Pool mal leer sein
  sollte (aktuell nicht der Fall, alle 10 sind vollständig befüllt).

Mit mehreren Simulationen geprüft: Testgrößen/Bestehensgrenzen exakt wie
oben, alle 10 Pools mit genau 50 Fragen befüllt (500 gesamt, praktisch
keine inhaltlichen Duplikate), Auf- und Abstiegslogik funktioniert weiterhin
korrekt, Klasse-10-Test zieht jetzt aus dem eigenen Pool statt über den
Fallback.

## 7w. Alle Rundentypen jetzt als eigener Hauptmenüpunkt (generisch umgebaut)

Wie zuvor bei Stadt Land Fluss/Musik raten/Nenn's Blitz bekommen jetzt auch
**Einordnen**, **Chronologie**, **Mehr oder Weniger** und **Bild erraten**
einen eigenen Hauptmenüpunkt mit Solo/Multiplayer – macht insgesamt 7
dedizierte Modi. Bleiben (wie Musik raten/Nenn's Blitz, anders als Stadt
Land Fluss) zusätzlich auch im normalen gemischten Rundenpool wählbar.

Da das mit dem bisherigen Copy-Paste-Muster (für jeden Modus eigene
Konstanten + eigene Ternär-Ketten an ~8 Stellen im Client) schnell unübersichtlich
geworden wäre, hab ich das bei der Gelegenheit generisch umgebaut:

- **Server** (`server.js`): `DEDICATED_MODE_KINDS` ordnet gameMode-Namen
  ihrem Rundentyp zu (`{music:"guessMusic", blitz:"nennsBlitz",
  ordering:"orderingGame", chronology:"chronologyGame",
  higherlower:"higherLowerGame", picture:"guessPicture"}`), `DEDICATED_POOLS`
  wird daraus automatisch abgeleitet. `roundDefPoolForLanguage()` und die
  `gameMode`-Zuweisung in `createRoom()` schlagen jetzt generisch nach,
  keine Kette aus `gameMode === "x" ? ... : (gameMode === "y" ? ...`
  mehr. Stadt Land Fluss bleibt bewusst ein separater Sonderfall (eigener
  Pool, nicht im Mix), alle anderen sind Teilmengen von `ROUND_DEF_POOL`.
  **Neue dedizierte Modi künftig: einfach eine Zeile in
  `DEDICATED_MODE_KINDS` ergänzen, mehr ist serverseitig nicht nötig.**
- **Client** (`public/index.html`): `DEDICATED_MODES`-Objekt (Icon, Titel,
  ob nur Deutsch) erzeugt die Hauptmenü-Kacheln automatisch per Schleife,
  `startDedicatedMenu(gm)` ersetzt die einzelnen `startSlfMenu()`/
  `startMusicMenu()`/... (die als dünne Weiterleitungen für
  Rückwärtskompatibilität erhalten bleiben). Alle vormals hart codierten
  Ternär-Ketten (Solo-Titel, Zurück-Ziel, Lobby-Titel, Sprachsperren-Anzeige)
  sind durch `dedicatedGameMode()`/`dedicatedScreenTitle()`/
  `dedicatedBackFn()` ersetzt.
- Nenn's Blitz war wie Stadt Land Fluss `germanOnly` – die "Sprache fest auf
  Deutsch"-Anzeige in der Lobby war bisher SLF-spezifisch verdrahtet, gilt
  jetzt korrekt für beide (generisch über `DEDICATED_MODES[...].germanOnly`).

Mit echten Serverläufen (alle 7 Modi liefern ausschließlich ihre eigene
Rundenart, korrekte Kategorienzahl) und einer kompletten Simulation der
Client-Navigation (Hauptmenü zeigt alle 7 Kacheln, jeder Modus von
Untermenü bis `createRoom` mit korrektem `gameMode` – inklusive Regression
der 3 bestehenden Modi) geprüft.

**Nebenbei behoben:** `test/run-test.js` kannte das neue zeitlose Anfechten
(siehe vorherige Sitzung) noch nicht und wartete bei Stadt Land Fluss/Nenn's
Blitz ohne Ende – simuliert jetzt einen Host, der sich "fertig" meldet und
kurz danach manuell weitergibt.

## 7x. NEU: Arena / Bestenliste (Match-Modus) – komplett neues System

Separates System neben dem bestehenden Klassen-System (Brain Test) und den
Party-Modi, wie angefordert. Erfordert ein **Konto** (echte, geräteübergreifende
Bestenliste, kein lokales Profil).

**Ligen** (`server.js`, `ARENA_LEAGUES`) – direkt mit den Klassen-Fragenpools
verknüpft, flexibel erweiterbar (neue Liga = ein neuer Eintrag):
- Schüler-Liga: Klasse 1-5
- Lehrer-Liga: Klasse 6-10
- Aufstieg bei 150 kumulierten Punkten (Schüler → Lehrer); Lehrer-Liga ist
  vorerst die Obergrenze, bis mehr Klassen existieren. **Kein Abstieg** –
  ein erreichter Liga-Index wird serverseitig nie verringert, unabhängig
  davon, wie lange jemand pausiert.

**Herz-System**: 3 Herzen/Tag (`ARENA_DAILY_HEARTS`), ein Herz pro
Matchstart verbraucht, füllt sich bei Tageswechsel (UTC) automatisch
wieder auf. Ist bewusst so aufgebaut, dass ein späterer Shop einfach
`user.stats.arenaHearts` erhöhen könnte, ohne sonst etwas anzufassen.

**Match-Ablauf**: 20 Fragen in 4 Blöcken à 5, im Wechsel mit 4
Herausforderungsrunden (Stadt Land Fluss/Nenn's Blitz/Einordnen/
Chronologie/Mehr oder Weniger – auf Wunsch ohne Bild/Musik raten). Läuft
technisch als normale Solo-Party-Session (`gameMode:"arena"`), damit alle
bestehenden Rundentyp-Engines unverändert wiederverwendet werden. Neue
Rundenart `arenaQuiz` zieht Fragen aus dem Klassen-Pool der aktuellen Liga
statt aus dem allgemeinen Wissenstest-Pool. **1 Punkt pro korrekter
Antwort/gelöster Aufgabe** – bewusst unabhängig vom internen Punktesystem
der einzelnen Rundentypen (das hat oft andere Werte, z.B. 10 statt 1);
der Client zählt das separat mit (`tallyArenaPoints()` in
`public/index.html`, liest je nach Rundentyp die jeweilige
Korrekt-Zählung aus der Abschlussnachricht: `quizReveal.correct`,
`orderingFinalReveal.correctCount`, `rankReveal.correctCount`,
`slfFinalReveal.scores` (Anzahl Kategorien >0), `nennsBlitzFinal.total`).

**Wichtiger Fund dabei**: Die 500 Klassen-Fragen existierten bisher nur
eingebettet im Client. Für die `arenaQuiz`-Blöcke musste der Server sie
auch kennen – deshalb nach `shared/klasseQuestions.json` ausgelagert
(Server lädt von dort, Client-Kopie wird jetzt ebenfalls daraus generiert,
nach demselben sicheren Muster wie beim letzten Sync-Fix).

**Neue API-Endpunkte** (`server.js`): `/api/arena-status`,
`/api/arena-start-match`, `/api/arena-finish-match`,
`/api/arena-leaderboard` (Top 50, sortiert nach Punkten, nur Konten mit
mind. 1 gespieltem Match).

**Neuer Hauptmenüpunkt** "Arena" (🏆), Konto-Sperre mit automatischer
Weiterleitung zurück zur Arena nach Login/Registrierung
(`postLoginRedirect`).

**Wichtiger Bug gefunden und behoben während der Entwicklung**: Die
bestehende `partyConnect()`-Funktion überschreibt beim Verbindungsaufbau
das komplette `party`-Objekt – dadurch gingen die Arena-spezifischen Felder
sofort wieder verloren. Behoben, indem diese Felder jetzt erst NACH dem
Verbindungsaufbau (im `onOpen`-Callback) gesetzt werden.

**Testabdeckung, ehrlich aufgeschlüsselt** (ein vollständiger 20-Fragen-
Match-Durchlauf sprengt das Zeitlimit einzelner Testläufe, da manche
Herausforderungsrunden 60-80s dauern):
- Mit echten API-Aufrufen vollständig bestätigt: Registrierung, Standard-
  werte, Herz-Verbrauch/Ablehnung bei 0 Herzen, Punkte-Akkumulierung,
  Liga-Aufstieg bei Schwellenüberschreitung (kein Abstieg), Bestenliste
  zeigt korrekten Eintrag.
- Mit echtem Serverlauf bestätigt: `arenaQuiz`-Runden ziehen Fragen exakt
  aus dem richtigen Klassen-Bereich, `setArenaRoundPlan` akzeptiert die
  gemischte Sequenz korrekt, Herausforderungsrunde läuft dazwischen.
- Mit echtem Client-Code (im selben Prozess wie ein echter Server)
  bestätigt: Login, Arena-Startbildschirm, der oben beschriebene Bugfix
  (`party.arenaMode` bleibt jetzt erhalten), automatischer Rundenplan-
  Aufbau, und **punktgenaue** Quiz-Punktezählung (5 Fragen einzeln
  durchgetestet, jede richtige/falsche Antwort korrekt gezählt).
- Die Punktezählung für die anderen 4 Rundentypen (Ordering/Chronologie/
  Mehr-oder-Weniger/SLF/Nenn's Blitz) folgt strukturell demselben, jetzt
  bewiesenen Muster (Eintrag per playerId suchen, Zählfeld auslesen) mit
  Feldnamen, die ich direkt gegen den Server-Code verifiziert habe – aber
  nicht alle 5 einzeln mit einem kompletten Durchlauf bestätigt, das steht
  noch aus. Bitte beim ersten echten Match-Test besonders auf die
  Punktezahl nach einer Nenn's-Blitz- oder SLF-Herausforderungsrunde
  schauen.

## 7y. Bugfix: Bild erraten – Unschärfe/Zeitbalken lief nicht bei allen Geräten

Gemeldet: beim Host wurde das Bild korrekt unscharf und der Zeitbalken
zählte runter, beim mitspielenden Gerät (anderes Handy) passierte beide
nicht. Ursache gefunden: `startGuessTicker()` verglich die eigene Uhr
gegen den **absoluten Server-Zeitstempel** (`msg.startedAt`) – bei nicht
exakt synchronen Geräteuhren (zwei verschiedene Handys, durchaus üblich)
kann das sofort zu 0% Restzeit / scharfem Bild führen. Alle anderen Timer
im Spiel (Musik raten, Stadt Land Fluss, Nenn's Blitz) machen das schon
richtig: eigenen Startzeitpunkt lokal beim Empfang nehmen
(`const startedAt = Date.now();`), nie gegen die Serverzeit vergleichen.
`startGuessTicker()` jetzt auf dasselbe, bereits bewährte Muster umgestellt.

Mit einer simulierten Uhr-Abweichung von 5 Minuten geprüft: mit dem alten
Code wäre das sofort bei 0%/scharfem Bild gelandet, mit dem Fix läuft der
Timer korrekt unabhängig von der Server-Uhr (nach 1s ≈95% Restzeit,
weiterhin unscharf, wie erwartet).

## 7z. Arena: Liga-Namen (Schüler/Lehrer) vorerst aus der Anzeige entfernt

Auf Wunsch: "Schüler-Liga"/"Lehrer-Liga" gehört konzeptionell zu einem
späteren, eigenen "Erfolge"-System, nicht zur Arena selbst. Deshalb aus der
sichtbaren Arena-Oberfläche entfernt (Startbildschirm, Match-Ergebnis,
Bestenliste zeigen jetzt nur noch Punkte/Herzen, keine Liga-Namen oder
Klassenbereich-Texte mehr).

**Bewusst NICHT angetastet** (um die bereits ausführlich getestete Mechanik
nicht zu gefährden): `ARENA_LEAGUES`, die Klassen-Bereich-Zuordnung für die
Quiz-Blöcke und die Aufstiegs-/Punktelogik laufen serverseitig unverändert
im Hintergrund weiter – nur eben ohne das gerade noch nicht gewollte
"Schüler"/"Lehrer"-Wording in der Oberfläche. Sobald das "Erfolge"-System
kommt, lässt sich die Liga-Anzeige gezielt wieder einblenden bzw. dort
integrieren, ohne die Grundmechanik neu bauen zu müssen. Die "Bestenliste"
bleibt wie schon zuvor als eigener Button unten auf dem Arena-Bildschirm.

Mit echtem Serverlauf + echtem Client-Code bestätigt: kein "Schüler-Liga"/
"Lehrer-Liga"/"Klasse X-Y" mehr sichtbar, Bestenliste-Button und Punkte-/
Herzen-Anzeige funktionieren weiterhin.

## 7aa. Statistik-Seite erweitert + grauer "Erfolge"-Platzhalter

Auf Wunsch deutlich mehr Werte je Profil, plus Vorbereitung für ein
späteres Erfolge-System:

- **Neu angezeigt**: aktuelle Klasse (Brain-Test-Fortschritt, eigene
  Zeile mit Klassen-Pille), Siegquote in % (Siege/Gesamtspiele), Trefferquote
  in % (richtige/alle beantworteten Fragen).
- **Weiterhin angezeigt**: Name, (alter) Rang, Punkte, beste Punktzahl,
  Runden, Siege, Niederlagen, Richtig/Falsch.
- **Neuer "🏆 Erfolge (bald verfügbar)"-Button** je Profilkarte – bewusst
  ausgegraut und mit `disabled` nicht antippbar, als Platzhalter für das
  geplante, separate Erfolge-System (siehe 7z).

Mit einer Simulation geprüft: alle neuen Werte korrekt berechnet und
angezeigt (Siegquote/Trefferquote-Prozentrechnung stimmt), Erfolge-Button
vorhanden und tatsächlich deaktiviert.

## 7bb. Bugfix: Stadt Land Fluss – eingetippte Antworten gingen bei Zeitablauf verloren

Gemeldet: wenn die Zeit abläuft (oder jemand abgibt), wurden ausgefüllte
Felder manchmal nicht gewertet, obwohl etwas Gültiges drinstand.

**Vermutete Ursache**: Mobile Browser drosseln/pausieren JavaScript-Timer,
wenn der Bildschirm ausgeht oder die App in den Hintergrund gerät. Der
lokale Auto-Abgabe-Timer auf dem Client (der bei Zeitablauf automatisch
`slfSubmit` senden sollte) kann dadurch verspätet oder gar nicht feuern.
Der Server zählt seine eigenen 80 Sekunden aber unabhängig davon mit – kam
die Abgabe nicht rechtzeitig an, hatte der Server buchstäblich nichts
gespeichert und wertete alle Felder dieser Person als leer, selbst wenn
sie etwas Gültiges eingetippt hatten.

**Fix**: Der Client sendet jetzt beim Tippen laufend (entprellt, 500ms nach
der letzten Eingabe) den aktuellen Stand als "Entwurf" an den Server
(`slfDraftUpdate`/`handleSlfDraftUpdate`) – ohne das als finale Abgabe zu
werten (Feld bleibt editierbar, zählt nicht zu "alle abgegeben"). Läuft die
Zeit beim Server ab, ohne dass je eine explizite Abgabe ankam, nutzt er
automatisch den zuletzt bekannten Entwurf-Stand statt leerer Felder – die
bestehende Fallback-Prüfung (`!rt.answers.has(...)`) in `slfFinishAnswering`
musste dafür nicht mal geändert werden, da der Entwurf genau dort landet,
wo vorher nur die finale Abgabe stand.

Mit echtem Serverlauf bestätigt (kompletter 80-Sekunden-Durchlauf): Host
tippt ein gültiges Wort, sendet aber NIE eine explizite Abgabe (simuliert
den gedrosselten Timer) – beim serverseitigen Zeitablauf wurde das Feld
trotzdem korrekt mit dem zuletzt eingetippten Wort übernommen und richtig
bewertet (20 Punkte für ein gültiges, einzigartiges Wort).

## 7cc. Vier kleinere Änderungen

- **Einordnen: kein Zeitlimit mehr** ("es geht immer so schnell weg") – die
  bisherige 160s-Obergrenze (`ORDERING_ROUND_CAP_MS`) ist komplett weg, nach
  demselben Prinzip wie beim Anfechten. Die Runde läuft jetzt, bis alle
  Spieler:innen fertig oder eliminiert sind (unverändert), ODER der Host
  über einen neuen "Runde jetzt beenden (Host)"-Button manuell abschließt.
  Der Hurry-Timer (30s für alle, sobald jemand PERFEKT fertig ist) bleibt
  unverändert – das ist eine bewusste Dringlichkeit, nicht das gemeldete
  Problem. Mit echtem Serverlauf bestätigt: Runde blieb über 15s aktiv ohne
  automatisches Ende, Host-Button hat manuell korrekt beendet.
- **"Party (WLAN)" → "Party Raum"** überall in der Oberfläche umbenannt.
- **"Tierrassen" → "Tierarten"** bei Nenn's Blitz (betraf 3 von 5
  Tier-Kategorien, die anderen beiden hießen schon "Tierarten" – jetzt
  einheitlich).
- **Einordnen-Kategorie "Größenvergleich"**: der Zusatz "(von Kakerlake bis
  Todesstern)" im Namen ist raus (waren nur Beispiele, keine festen Grenzen).
  Von 13 auf **101 verschiedene Objekte** erweitert (von 0,5mm Sandkorn bis
  zur 120km-"Todesstern"-Größenordnung, dazwischen u.a. Tiere, Fahrzeuge,
  Gebäude, Landschaften, Popkultur). Zieht jetzt wie Stadt Land Fluss'
  Party-Mix bei jeder Runde zufällig 10 davon (nutzt die bereits
  bestehende Zufallsauswahl-Logik, die brauchte dafür keine Änderung – nur
  der Datenpool musste größer werden). Mit echtem Serverlauf bestätigt:
  10 zufällig gezogen, Label ohne die alten festen Anker.

## 7dd. Brain Test: Zurück-Button ergänzt

Zwei neue "Zurück"-Buttons, wo bisher keiner war:
- Auf dem "LOS GEHT'S"-Startbildschirm (vor Testbeginn) – zurück ins
  Hauptmenü, ohne den Test überhaupt zu starten.
- Auf dem eigentlichen Fragen-Bildschirm selbst (unten, `exitSoloTest()`) –
  bricht den laufenden Test jederzeit ab und geht zurück ins Hauptmenü.
  Zählt bewusst NICHT als bestandener/nicht bestandener Versuch (weder
  `roundsPlayed` noch `consecutiveFails` werden verändert), da der Test ja
  nicht zu Ende gespielt wurde.

Mit einer Simulation geprüft: beide Buttons vorhanden, Abbruch setzt den
Testzustand sauber zurück und zeigt korrekt das Hauptmenü.

## 7ee. Ein Profil für alle Modi (Konto statt wiederholter Namenseingabe)

War bisher inkonsistent: Brain Test kannte den Login bereits, aber
Stadt Land Fluss/Musik raten/Nenn's Blitz/Einordnen/Chronologie/Mehr-oder-
Weniger-Solo fragten trotz Login immer wieder nach einem Namen, und die
Statistik zeigte nur lokale Geräte-Profile, nie das Konto.

- **`startSoloPartyFlow()`**: bei Login jetzt sofortiger Start mit dem
  Konto-Namen, keine Namenseingabe mehr (wie beim Brain Test).
- **Multiplayer-Raum erstellen/beitreten**: Namensfeld wird bei Login mit
  dem Konto-Namen vorausgefüllt (bleibt editierbar, falls für eine
  einzelne Runde doch ein anderer Name gewünscht ist).
- **Statistik**: zeigt bei Login das Konto-Profil ganz oben (mit Hinweis
  "gilt für alle Modi"), inklusive der Arena-Punkte/Matches – daneben
  weiterhin alle lokalen Geräte-Profile, falls vorhanden.
- Der lokale Pass-&-Play-Mehrspieler (mehrere Personen an einem Gerät)
  behält bewusst seine eigene Mehrfach-Profilauswahl – das Konto ist dort
  naturgemäß nur eine von mehreren Personen, kein Ersatz für alle.

Mit echtem Server + echtem Client-Code geprüft: Solo-Party überspringt die
Namenseingabe korrekt und sendet den Konto-Namen, Multiplayer-Feld zeigt
den Konto-Namen vorausgefüllt, Statistik zeigt Konto-Profil samt
Arena-Werten.

## 7ff. Musik raten: 2 kaputte Songs raus, neue Kategorie "Serien-Intros" (kleines Starter-Set)

- **Entfernt** (gingen laut Rückmeldung generell nicht): Die Ärzte –
  Westerland (hatte ich zuvor zweimal erfolglos versucht zu reparieren),
  Böhse Onkelz – Mexico. 105 Songs verbleiben in `musik_kernliste`.
- **Neue Kategorie "Serien-Intros raten"** (`serienintros_mix`): Auf
  Wunsch, deckt Sitcom/Cartoon/Anime/TV-Show ab. **Bewusst nur ein kleines,
  einzeln web-recherchiertes Starter-Set von 6 Einträgen** (Friends, The
  Big Bang Theory, How I Met Your Mother, SpongeBob Schwammkopf, Naruto
  Shippuden Opening 3, Wer wird Millionär) – nach Rückfrage lieber wenige,
  echt verifizierte Einträge als viele geratene. Die ursprünglich gewünschten
  8-10 je Unterkategorie (Sitcom/Cartoon/Anime/TV allgemein einzeln) sowie
  "Instrumente raten" sind **noch nicht umgesetzt** – das hätte den Rahmen
  dieser Antwort gesprengt (vergleichbar mit dem ursprünglichen
  107-Songs-Aufbau). Sag gerne Bescheid, wenn ich das weiter ausbauen soll,
  dann mache ich in einer der nächsten Antworten gezielt weiter.
- Mit echtem Serverlauf bestätigt: neue Kategorie erscheint korrekt im
  Rundenpool, Westerland ist weg.

## 7gg. Serien-Intros: eigene Unterkategorien + kein Künstler mehr abgefragt

Zwei strukturelle Änderungen an "Serien-Intros raten":

- **Neue Rundenart-Eigenschaft `noArtist`**: bei diesen Kategorien wird
  jetzt nur noch **Serie** (Feld "title", Eingabe-Platzhalter entsprechend
  umbenannt) und **Erscheinungsjahr** abgefragt – kein Künstler/Interpret
  mehr, weder als Eingabefeld noch in der Auflösung. Serverseitig
  (`rt.noArtist` in `server.js`) wird der Künstler-Punkt unabhängig von der
  Eingabe immer auf 0 gesetzt. Generisch gebaut, könnte künftig auch für
  andere Musik-raten-Kategorien genutzt werden, ist aber aktuell nur bei
  den Serien-Intro-Kategorien aktiv.
- **6 statt 1 Kategorie**: das bisherige gemischte Set bleibt als "Serien-
  Intros raten: Gemischt" bestehen, dazu jetzt einzeln wählbar "Sitcom",
  "Cartoon", "Anime", "TV-Sendungen" und neu "Trash-TV" (mit "Bauer sucht
  Frau" als erstem Eintrag – für "Frauentausch" habe ich keinen sauberen,
  verifizierten Intro-Clip gefunden, daher bewusst ausgelassen statt
  geraten).
- **Weiterhin nur ein kleines Set** (1-3 Einträge je Unterkategorie) – das
  "mach ruhig von jedem mehr" steht noch aus, aus denselben Zeitgründen wie
  beim letzten Mal. Sitcom hat schon 3, die anderen vier je 1.

Mit echtem Serverlauf bestätigt: alle 6 Kategorien erscheinen im Rundenpool,
`noArtist` kommt korrekt bis zum Client durch, Künstler-Punkte werden
unabhängig von der Eingabe immer auf 0 gesetzt.

## 7hh. Serien-Intros: Sitcom/Cartoon/Anime deutlich erweitert, Trash-TV raus

- **Trash-TV komplett entfernt** (auf Wunsch).
- **Sitcom: 3 → 10** (Friends, The Big Bang Theory, How I Met Your Mother,
  Seinfeld, The Office US, Two and a Half Men, Brooklyn Nine-Nine, Modern
  Family, Scrubs, Cheers).
- **Cartoon: 1 → 3** (SpongeBob, Die Simpsons, Phineas und Ferb).
- **Anime: 1 → 3** (Naruto Shippuden, One Piece, Dragon Ball Z).
- TV-Sendungen bleibt bei 1 (Wer wird Millionär) – nicht Teil dieser
  Erweiterungsrunde.
- Alle neuen Video-IDs einzeln web-recherchiert (nicht geraten), bevorzugt
  offizielle Label-/Studio-Uploads nach demselben Muster wie die
  ursprüngliche Songliste.

**Ehrlich**: 15 je Kategorie wurde nicht ganz erreicht (Sitcom ja, Cartoon/
Anime bei 3) – bei diesem Tempo hätte das Erreichen von 15x3 den Rahmen
dieser Antwort gesprengt. Sag gerne Bescheid, falls ich Cartoon/Anime noch
weiter aufstocken soll.

Mit echtem Serverlauf bestätigt: 5 Kategorien vorhanden, Trash-TV korrekt
entfernt.

## 7ii. Mehr aus denselben Franchises (Naruto/One Piece/SpongeBob/Simpsons)

Auf Wunsch: statt neuer Franchises lieber mehr bekannte Songs/Openings aus
den schon vorhandenen. Anime jetzt 6 (Naruto Shippuden "Blue Bird" +
zusätzlich Naruto "Haruka Kanata" von Asian Kung-Fu Generation + Naruto
Shippuden "Diver" von NICO Touches the Walls, One Piece "We Are!" +
zusätzlich "Believe" von Folder5, Dragon Ball Z "Rock the Dragon").
Cartoon jetzt 5 (SpongeBob-Titelmelodie + zusätzlich der bekannte
"F.U.N. Song", Simpsons-Titelmelodie + zusätzlich "Do the Bartman",
Phineas und Ferb). Alle wieder einzeln recherchiert, bevorzugt offizielle
Label-/Studio-Uploads.

## 7jj. Anime deutlich erweitert (Detektiv Conan/Pokémon/Digimon/Bleach/AoT/JJK/SAO)

Auf Wunsch 7 weitere bekannte Anime dazu: Detektiv Conan, Pokémon, Digimon
Adventure ("Butter-Fly"), Bleach ("Asterisk"), Attack on Titan ("Guren no
Yumiya"), Jujutsu Kaisen ("Kaikai Kitan"), Sword Art Online ("Crossing
Field"). Anime-Kategorie damit von 6 auf **13** Einträge.

**Nicht geschafft** (Zeit ging aus, bevor ich saubere Quellen fand):
Sailor Moon, Ranma ½, Jackie Chan Adventures (Cartoon). Gerne beim nächsten
Mal.

## 7kk. Disney-Klassiker + weitere Anime (diesmal in Ruhe recherchiert)

Auf ausdrücklichen Wunsch diesmal langsamer und gründlicher, mit den
genannten Disney+-Titeln als Ausgangspunkt:

**Cartoon (jetzt 12, vorher 5)**: DuckTales (Disney+-Throwback-Kanal),
Goofy und Max (Goof Troop), Micky Maus Wunderhaus (offizieller Disney-
Junior-Kanal), Chip und Chap: Die Ritter des Rechts, Darkwing Duck, Lilo &
Stitch, Jackie Chan Adventures.

**Anime (jetzt 15, vorher 13)**: Sailor Moon ("Moonlight Densetsu"),
Ranma ½ ("Don't Make Me Wild Like You").

**Nicht gefunden trotz Suche**: Kim Possible ("Call Me, Beep Me!") – keine
Version mit eindeutig offizieller Quelle auffindbar, daher ausgelassen
statt geraten.

Alle neuen Einträge einzeln recherchiert, bevorzugt offizielle Disney-/
Universal-/Label-Kanäle (gleiches Muster wie bisher). Serien-Intros
"Gemischt" jetzt bei 38 Einträgen insgesamt.

## 7ll. Weiter aufgestockt Richtung 50 je Kategorie (noch nicht erreicht)

Ziel ist 50 je Kategorie (Sitcom/Anime/Cartoon), mehrere Openings vom
selben Anime zählen mit, dazu Disney- und Marvel-Zeichentrickserien als
weitere Quelle für Cartoon.

**Aktueller Stand**: Sitcom 13 (+Full House, Fresh Prince of Bel-Air,
Parks and Recreation), Anime 18 (+My Hero Academia, Demon Slayer, Death
Note), Cartoon 14 (+X-Men: The Animated Series, Spider-Man: The Animated
Series als erste Marvel-Einträge). Gemischt insgesamt 46.

**Noch weit von 50 entfernt** – bei diesem Tempo (jeder Song einzeln
recherchiert und verifiziert) ist das ein Vorhaben über mehrere Antworten
hinweg, kein einmaliger Rutsch. Sag gerne Bescheid, wenn ich weitermachen
soll, dann geht's in der nächsten Antwort direkt weiter.

## 7mm. Neue Chronologie-Kategorie aus den Serien-Daten

Idee: die Erscheinungsjahre, die für Serien-Intros ohnehin schon erfasst
sind, auch für Chronologie/Einordnen nutzen. Neue Kategorie "Chronologie:
Serien & Filme nach Erscheinungsjahr" mit 42 Einträgen (alle bisher
gesammelten Sitcom/Cartoon/Anime-Titel, Duplikate durch mehrere Openings
vom selben Anime rausgefiltert) – kostete keine neue Recherche, nur
Wiederverwendung der schon vorhandenen Jahreszahlen. Zieht wie die anderen
Einordnen-Kategorien zufällig 10 davon pro Runde.

Mit echtem Serverlauf bestätigt: Kategorie erscheint korrekt im
Rundenpool.

## 7nn. Drei Bugfixes: Verbindungsfehler beim Verlassen, fehlende Statistik-Speicherung, Arena-Punkte-Anzeige

**1. Verbindungsfehler bei `finishArenaMatch()`**: Die Verbindung wurde
erst NACH dem `await` des Auswertungs-API-Aufrufs geschlossen und
`party` erst danach genullt – in diesem Zeitfenster konnte ein
unerwartetes Server-Event fälschlich den "Verbindung verloren"-Bildschirm
auslösen. Jetzt wird die Verbindung SOFORT geschlossen und `party`
genullt, noch bevor der API-Aufruf losgeht (gleiches sichere Muster wie
beim Quiz-Game-Over). Die regulären "Raum verlassen"-Buttons selbst waren
bereits sicher (mit einer echten asynchronen WebSocket-Simulation
gegengeprüft).

**2. Solo-Party-Modi (SLF/Musik raten/Nenn's Blitz/Einordnen/Chronologie/
Mehr-oder-Weniger) speicherten GAR KEINE Statistik** – weder lokal noch
fürs Konto, obwohl der Name korrekt angezeigt wurde ("man soll mit dem
Profil spielen"). Neue Funktion `recordSoloPartyCompletion()`, die bei
Spielende `roundsPlayed` sowohl fürs Konto (falls eingeloggt, per
`syncAccountStats`) als auch fürs lokale Profil (falls eines mit
passendem Namen existiert) hochzählt. Bewusst nur "Runde gespielt" als
Metrik – Sieg/Niederlage/Korrektheit unterscheidet sich zu stark
zwischen den sechs Rundentypen für eine einheitliche Logik in diesem
Schritt.

**3. Arena-Punkteanzeige zeigte komplett falsche, verwirrende Zahlen**
(per Screenshots bestätigt: "+500 Punkte diese Runde" / "1 Punkte
gesamt" nach 5 richtig beantworteten Quiz-Fragen). Ursache gefunden:
Arena-Quiz-Runden liefen technisch als normale `knowledgeQuiz`-Runde,
und die Runden-Ende-Anzeige zeigte deshalb `team.score` – das ist im
Normalspiel aber gar kein Punktestand, sondern ein **Rundensieg-Zähler**
(+1 pro gewonnener Runde), komplett unabhängig von der eigentlichen
Arena-Logik. Neue, eigene Arena-Anzeige in `renderPartyRoundEnd()` zeigt
jetzt korrekt `party.arenaMatchPoints` (echte 1-Punkt-pro-Frage-Zählung)
sowohl als "Punkte diese Runde" als auch "Punkte im Match". Zusätzlich
das irreführende "✓ +100 / ✕ -150" bei der Einzelfragen-Auflösung für
Arena-Runden auf "✓ +1 / ✕" umgestellt.

Mit echtem Server- und Client-Code bestätigt: Rundenende zeigt nach 5
Quiz-Fragen einen plausiblen Wert (z.B. 3 von 5 richtig = 3 Punkte,
nicht mehr 100er-Vielfache wie 500), roundsPlayed wird nach Solo-Party-
Runden korrekt hochgezählt.

## 7oo. Dauerhafte Konto-Speicherung über Upstash Redis (löst Login-Verlust bei Render)

Ursache des gemeldeten Bugs ("Login bleibt nicht gespeichert, besonders
nach neuer Version hochladen"): Render löscht bei kostenlosen Web
Services alle lokal geschriebenen Dateien (wie bisher `data/users.json`)
bei jedem Neustart/Deployment – das ist eine Eigenschaft des Hosting-
Anbieters, kein Fehler im bisherigen Code an sich, aber für dauerhafte
Konten auf Dauer nicht brauchbar.

**Lösung**: Ist `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN`
als Umgebungsvariable gesetzt (bei Render unter Environment einzutragen,
Werte kommen aus einer kostenlosen Upstash-Redis-Datenbank), speichert der
Server die komplette Nutzerliste dort als ein JSON-Paket unter einem
festen Schlüssel (`brainpulse_users`) – das übersteht Neustarts und
Deployments. Sind die Variablen NICHT gesetzt (z.B. beim lokalen Testen
mit `node server.js`), fällt der Server automatisch auf die bisherige
Datei-Speicherung zurück – für lokales Ausprobieren weiterhin praktisch,
für dauerhaftes Hosting aber nicht empfohlen.

Technisch: `loadUsers()`/`saveUsers()` sind jetzt asynchron (echte
Netzwerk-Aufrufe an Upstashs REST-API statt synchronem Datei-Zugriff) –
das musste durch alle aufrufenden Funktionen (`registerUser`, `loginUser`,
`logoutUser`, `saveUserStats`, die drei Arena-Funktionen) und den zentralen
HTTP-Endpunkt-Dispatcher als `await`-Kette durchgezogen werden, damit die
Antwort an den Client immer erst nach erfolgreichem Speichern rausgeht.
Der Server wartet beim Start jetzt außerdem erst das Laden der
Nutzerdaten ab, bevor er Verbindungen annimmt.

Beim Start protokolliert der Server jetzt auch, welche Speicherart aktiv
ist ("Upstash Redis" oder "lokale Datei"), damit man das im Log leicht
nachprüfen kann.

Mit einem lokalen Mock-Server, der Upstashs REST-API nachbildet, getestet
(echte Zugangsdaten hatte ich nicht): erster Serverstart registriert
einen Nutzer und schreibt korrekt per POST an den Mock, zweiter,
komplett frischer Serverprozess (simuliert einen Render-Redeploy) lädt
die Daten korrekt zurück – der Login-Token bleibt gültig. Der bisherige
Datei-Fallback (ohne die beiden Variablen) wurde ebenfalls gegengetestet
und funktioniert nach dem Umbau unverändert.

## 7pp. Bugfix: Arena – Stadt Land Fluss & Nenn's Blitz ausgenutzt

Gemeldet: bei Nenn's Blitz in der Arena einfach beliebige Namen eingegeben
und trotzdem Punkte bekommen.

**Ursache**: Stadt Land Fluss und Nenn's Blitz bewerten offene Freitext-
Antworten normalerweise NICHT vollautomatisch – zweifelhafte Antworten
werden von ECHTEN Mitspielern per "Anfechten" bestritten. In der Solo-
Arena gibt es aber niemanden, der anfechten könnte, wodurch praktisch
jede Eingabe automatisch durchging.

**Fix**: Beide Modi komplett aus dem Arena-Herausforderungspool entfernt
(an zwei Stellen: `ARENA_CHALLENGE_POOL` und `ARENA_CHALLENGE_MODES` in
`server.js`). **Bewusst NICHT alles auf Wissenstest reduziert** – Einordnen,
Chronologie und Mehr-oder-Weniger bleiben drin, da die rein anhand
tatsächlicher Werte (Größe, Jahr, Anzahl, …) automatisch und ohne Freitext
bewertet werden, also strukturell gar nicht auf dieselbe Art ausnutzbar
sind. Bleiben insgesamt 58 sichere Herausforderungsrunden übrig. Falls dir
das trotzdem zu unsicher ist und du lieber nur noch den reinen Wissenstest
in der Arena willst, sag Bescheid – das wäre dann nur eine Zeile
(`ARENA_CHALLENGE_MODES = []`).

Mit echtem Serverlauf bestätigt: weder Stadt Land Fluss noch Nenn's Blitz
tauchen mehr im Arena-Rundenpool auf.

## 7qq. Brain Test: veraltete Tagline raus, neue Klassen-1-bis-10-Übersicht

- **"Beweise dein Wissen. 5 Fragen. Immer schwieriger. Immer schneller."**
  unter dem "BRAIN PULSE"-Titel im Hauptmenü entfernt (stimmte seit dem
  Klassen-System nicht mehr).
- **Neuer Zwischenschritt beim Brain-Test-Einstieg**: statt direkt in den
  "LOS GEHT'S"-Bildschirm zu springen, zeigt `renderKlassenOverview()`
  jetzt erst alle 10 Klassen auf einen Blick, mit Status je Klasse:
  "✓ Bestanden" (schon geschafft), "▶ Aktuell" (hervorgehoben mit
  Rahmen/Hintergrund, zeigt zusätzlich Fragenanzahl und Bestehensgrenze),
  "Noch nicht erreicht" (abgeblendet). Von dort per Button weiter zum
  eigentlichen Test (unveränderter bisheriger Ablauf).

Mit einer Simulation geprüft: Tagline weg, Titel bleibt; Übersicht zeigt
korrekt alle 10 Klassen mit dem richtigen Status pro Klasse; Weiter-Button
führt korrekt zum bestehenden Testbildschirm.

## 8. Bekannte Grenzen dieser ersten Version

- Verliert ein Gerät während einer laufenden Runde die Verbindung, wird es nicht automatisch
  wieder in die laufende Runde eingebunden (Reconnect erst wieder ab dem nächsten Raumzustand
  möglich). Für eine spätere Version ließe sich das ergänzen, ohne die Architektur zu ändern.
- Die Zahlenwerte in `partyDatasets.json` (Einwohner, Streams, Gehälter, Kaderwerte, …) sind
  ungefähre, zur Illustration gewählte Werte und können jederzeit angepasst werden.
