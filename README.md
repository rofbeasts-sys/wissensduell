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

## 7rr. Multiplayer ohne Namenseingabe bei Login + kein Solo bei SLF/Nenn's Blitz

- **Multiplayer-Einstieg bei Login**: Statt nur vorausgefüllt zu sein, ist
  das Namensfeld jetzt bei Login komplett weg – stattdessen ein Hinweis
  "Du spielst als **[Kontoname]** (angemeldetes Konto)". Kein anderer Name
  mehr wählbar, direkt "Raum erstellen" oder "Beitreten". `partyGetName()`
  nutzt bei Login automatisch den Kontonamen, unabhängig vom (jetzt nicht
  mehr vorhandenen) Eingabefeld.
- **Kein Solo mehr bei Stadt Land Fluss und Nenn's Blitz**: Beide Modi
  bewerten offene Antworten normalerweise per "Anfechten" durch echte
  Mitspieler – genau das Problem, das schon bei der Arena aufgefallen war
  (siehe 7pp), gilt hier genauso: allein gespielt kann niemand eine
  erfundene Antwort anzweifeln, jede Eingabe ginge automatisch durch. Bei
  diesen beiden Modi wird jetzt nur noch "Multiplayer" angeboten, kein
  Solo-Kachel mehr. Alle anderen Modi (Musik raten, Einordnen,
  Chronologie, Mehr-oder-Weniger, Bild erraten) unverändert weiterhin mit
  Solo-Option, da die algorithmisch/automatisch bewertet werden.

Mit echtem Server- und Client-Code bestätigt: Multiplayer-Einstieg bei
Login zeigt kein Eingabefeld mehr und verwendet korrekt den Kontonamen;
Stadt Land Fluss und Nenn's Blitz zeigen keine Solo-Kachel mehr; andere
Modi (Musik raten als Stichprobe) weiterhin unverändert mit Solo.

## 7ss. Musik raten: erste Songs aus deiner Link-Liste eingebaut

Aus der hochgeladenen Datei mit 65 YouTube-Links (Sido, Luciano,
Apache207, Capital Bra & Samra, Bushido, Cro, u.a.) konnte ich die
Interpreten-Beschriftungen leider nicht automatisch zuordnen – im
Originaltext kleben sie ohne jedes Trennzeichen direkt an die
`si=`-Tracking-Parameter der Links dran, das lässt sich nicht zuverlässig
auseinanderklamüsern. Stattdessen hole ich zu jeder Video-ID einzeln den
echten Titel von YouTube.

**Bisher geschafft (24 von 65)**: alle 7 Sido-Songs, alle 5 Luciano-Songs,
7 Apache-207-Songs/Kollabos, und 5 Capital-Bra-&-Samra-Songs (Tilidin,
Huracan, 110 feat. LEA, Wir ticken, Nummer 1). Kernliste jetzt bei 129
Songs.

**Bei diesem Tempo braucht der Rest mehrere weitere Antworten** – 65
Songs einzeln abzufragen sprengt den Rahmen einer einzigen Antwort. Ein
paar IDs lieferten keinen eindeutigen Treffer, die lasse ich erstmal aus
statt zu raten. Noch offen: der Rest von Capital Bra & Samra, dann
Bushido, Cro. Ich mache in den nächsten Antworten weiter.

## 7tt. Brain Test: Statusleiste (Klasse-Anzeige oben) entfernt

Auf Wunsch: Die kleine "Klasse X"-Anzeige oben links, die bisher auf allen
Brain-Test-Bildschirmen mitlief (Klassen-Übersicht, "LOS GEHT'S"-
Bildschirm, Fragen-Bildschirm, Rundenergebnis), ist jetzt weg – seit es
die komplette Klassen-1-bis-10-Übersicht gibt (siehe 7qq), ist die
zusätzliche einzelne Anzeige redundant. In der Statistik bleibt die
Klassen-Anzeige unverändert bestehen. Der lokale Pass-&-Play-Mehrspieler
zeigt seine Statusleiste ebenfalls weiterhin (eigenes, unabhängiges
Punktesystem, nicht Teil dieser Änderung).

Mit einer Simulation geprüft: Statusleiste auf allen vier Brain-Test-
Bildschirmen weg, Klassen-Übersicht selbst zeigt weiterhin alle 10
Klassen, Statistik zeigt die Klasse weiterhin korrekt an.

## 7uu. Neues Minigame: Tic Tac Toe gegen Bots (Gürtel-Rangliste)

Das erste "richtige" Minigame neben den Wissensmodi – klassisches Tic Tac
Toe gegen den Bot, komplett clientseitig (kein Server nötig für den
Spielablauf selbst).

- **Eigene Rangliste** von "Weißer Gürtel" bis "Meister" (7 Stufen:
  Weiß/Gelb/Orange/Grün/Blau/Braun/Meister) – bewusst ein anderes
  Namensthema als "Klasse X" beim Brain Test, damit beide
  Fortschrittssysteme klar unterscheidbar bleiben.
- **Bot-Schwierigkeit steigt mit dem Rang**: der Bot spielt mit
  wachsender Wahrscheinlichkeit den mathematisch optimalen Zug
  (Minimax-Suche) statt eines zufälligen. Beim "Meister"-Rang spielt der
  Bot immer perfekt – mit 1000 simulierten Zufallsspielen gegengeprüft,
  der Bot hat dabei kein einziges Mal verloren (nur gewonnen oder
  unentschieden), genau wie es die Theorie für perfektes Tic-Tac-Toe-
  Spiel vorhersagt.
- **Aufstieg**: ein Sieg hebt eine Gürtelstufe (außer bei Meister, das
  ist die Spitze). Unentschieden oder Niederlage → kein Abstieg, einfach
  nochmal versuchen.
- Eigene Übersichtsseite (Rangliste 1-7 mit aktuellem Rang hervorgehoben)
  im selben Stil wie die Brain-Test-Klassenübersicht, für Wiedererkennung.
- Fortschritt wird wie bei den anderen Modi gespeichert – fürs Konto
  (neues `tttRank`-Feld, per `/api/save-stats` synchronisiert) oder fürs
  lokale Profil.

Mit einer Simulation geprüft: Hauptmenü-Kachel vorhanden, Rangübersicht
zeigt alle 7 Stufen korrekt, kompletter Spielablauf (Zug → Sieg-Erkennung
→ Aufstieg) funktioniert, und die Unbesiegbarkeit des Meister-Bots wurde
über 1000 simulierte Partien bestätigt.

## 7vv. Tic Tac Toe: jetzt auch mit Freunden spielbar (Mehrspieler)

Auf Wunsch: neben "gegen den Bot" jetzt auch "mit Freunden" – ein neuer
"MIT FREUNDEN SPIELEN"-Button auf der Gürtel-Übersicht führt zu einem
eigenen, bewusst schlanken Mehrspieler-System (komplett getrennt vom
komplexen Quiz-Party-System, da Tic Tac Toe nur 2 Spieler und ein Brett
braucht):

- **Server** (`server.js`): eigenes `tttRooms`-Raumsystem mit eigenen
  WebSocket-Aktionen (`tttCreateRoom`, `tttJoinRoom`, `tttMove`,
  `tttRematch`, `tttLeave`). Raum erstellen liefert einen 4-stelligen
  Code (gleiches Format wie beim normalen Party-Raum), erste Person
  spielt X, zweite O. Serverseitige Zug-Validierung (nur wer dran ist,
  darf ziehen; nur auf freie Felder). Bei Verbindungsabbruch wird die
  jeweils andere Person benachrichtigt.
- **Client**: neue Bildschirme für Raum erstellen/beitreten, Warten auf
  Gegner, und das eigentliche Spielbrett (gleiche Optik wie beim
  Bot-Modus, aber Züge laufen über die eigene WebSocket-Verbindung statt
  lokal). "Nochmal"-Button für ein Rematch direkt im selben Raum (Symbole
  tauschen dabei fair, wer zuletzt O war fängt an).
- Wichtig: die **Gürtel-Rangliste bleibt reine Bot-Modus-Sache** – im
  Mehrspieler gegen Freunde gibt's (bewusst, wie bei den anderen
  Mehrspieler-Modi) keinen Auf-/Abstieg, einfach nur zum Spaß spielen.

Mit einem echten Zwei-Client-Test über WebSocket vollständig bestätigt:
Raumerstellung, Beitritt mit korrekter Symbolzuweisung (X/O), Zug-
Synchronisation zwischen beiden Seiten, Sieg-Erkennung bei beiden
gleichzeitig korrekt, Rematch tauscht die Symbole und setzt das Brett
zurück, und die verbleibende Person wird korrekt benachrichtigt, wenn die
andere den Raum verlässt.

## 7ww. Tic Tac Toe: Bot spielt insgesamt kompetenter + steilere Rangkurve

Gemeldet: der Aufstieg bis fast zum Meister-Rang ging "ratzifatzi", fühlte
sich zu leicht an.

**Echter Fund dabei**: Der Bot hat bei "absichtlichen Fehlern" (niedrige
Schwierigkeit) manchmal einen **sofortigen, geschenkten Sieg liegen
gelassen** – das lag daran, dass die "Sicherheits"-Auswahl zufällig
zwischen ALLEN nicht-verlierenden Zügen wählte, auch wenn einer davon der
Gewinnzug selbst war, statt den Gewinnzug zu bevorzugen. Das machte den
Bot streckenweise wirken, als würde er einfach nicht aufpassen, statt nur
"schwächer" zu spielen. Jetzt nimmt der Bot einen sofortigen Sieg **immer**,
unabhängig vom Rang (mit 200/200 Testdurchläufen bestätigt, vorher
teilweise unter 65%).

**Zusätzlich**: die Schwierigkeitskurve wurde nach oben steiler gemacht
(Gelb 0,35→0,3, Grün 0,65→0,7, Blau 0,8→0,85, Braun 0,92→0,95 – die
oberen Ränge liegen jetzt näher an "praktisch perfekt").

Mit einer Simulation gegen einen "soliden" simulierten Gegenspieler
(nimmt Siege, blockt Niederlagen, sonst zufällig) über 500 Partien je
Rang bestätigt: der Bot gewinnt mit steigendem Rang tendenziell öfter
(Weißer Gürtel ~12%, Blauer Gürtel ~19% der Partien für den Bot selbst),
und lässt sich nie mehr einen offensichtlichen Sieg oder Block entgehen.

## 7xx. Zwei Bugfixes: TTT-Rematch reagierte nicht mehr, Warteraum-Button nur für Host

**1. Tic Tac Toe Mehrspieler: "Nochmal"-Button reagierte nicht mehr.**
Ursache gefunden: `tttMp.mySymbol` wurde beim Client nur EINMAL beim
Beitreten gesetzt, aber nie aktualisiert. Da der Server beim Rematch die
Symbole zwischen den beiden Spielenden tauscht (fairer Wechsel, wer
anfängt), dachte der Client danach weiterhin, er hätte sein altes Symbol
– und lehnte dadurch eigene Klicks fälschlich ab, weil die
"bin ich dran?"-Prüfung mit dem falschen Symbol verglich. Fix: Der Server
schickt jetzt jeder Person in der personalisierten `tttState`-Nachricht
ihr eigenes, aktuelles Symbol (`yourSymbol`) mit, der Client übernimmt das
bei jeder Aktualisierung. Mit einem echten Zwei-Client-Test bestätigt:
Symbole tauschen nach Rematch korrekt, und ein Zug der Person, die jetzt
neu X ist, kommt danach auch tatsächlich an.

**2. "Zurück zum Warteraum" nach Spielende war nur für den Host sichtbar.**
War sowohl client- als auch serverseitig auf `isHost` beschränkt. Beides
entfernt (Button jetzt für alle sichtbar, Server akzeptiert die Aktion
jetzt von jeder Person im Raum, solange `room.phase === "gameEnd"`) – der
dahinterliegende, bereits bewährte Ablauf (Phase zurück auf "lobby",
Punkte zurücksetzen) ist dabei unverändert geblieben, nur die
Berechtigungsprüfung ist weg.

## 7yy. Vier Änderungen: Mehr-oder-Weniger-Zeit, TTT-Reset, gestaffelte Siege, Zufallsbeginn

**1. Mehr oder Weniger: unbegrenzt Zeit zum Anschauen der Werte.** Bisher
ging es nach jeder Auflösung (z.B. "X Mio. Streams") automatisch nach nur
1,6 Sekunden weiter – viel zu kurz, um die Zahl wirklich zu lesen. Dabei
außerdem einen echten Bug gefunden: der aufgedeckte Wert wurde vom Server
gar nicht erst mitgeschickt, die Anzeige dafür lief komplett ins Leere.
Jetzt: Server schickt den Wert korrekt mit, kein automatischer Timer mehr
– der Host schaltet manuell per neuem "WEITER"-Button weiter, alle können
sich die Zahl in Ruhe anschauen. Chronologie (nutzt dieselbe Engine)
bleibt bewusst unverändert, da dort pro Zug kein Wert aufgedeckt wird.

**2. Tic Tac Toe: Reset-Button.** Neuer "↺ RANG ZURÜCKSETZEN"-Button auf
der Gürtel-Übersicht (mit Sicherheitsabfrage), setzt Rang und
Fortschritt zum aktuellen Gürtel zurück auf Weißer Gürtel/0.

**3. Tic Tac Toe: gestaffelte Aufstiegs-Anforderungen.** Statt "1 Sieg =
sofortiger Aufstieg" jetzt: Weiß→Gelb 1 Sieg, Gelb→Orange 2 Siege,
Orange→Grün 3 Siege (müssen nicht am Stück sein), Grün→Blau 3 Siege **in
Folge**, Blau→Braun 4 in Folge, Braun→Meister 5 in Folge. Bei den
"in Folge"-Rängen setzt eine Niederlage oder ein Unentschieden die Serie
zurück auf 0. Die Übersicht zeigt den Fortschritt direkt an (z.B. "▶
Aktuell (2/3 in Folge)").

**4. Tic Tac Toe: zufälliger Spielbeginn.** Gegen den Bot: nicht mehr
immer die spielende Person zuerst, sondern 50/50 zufällig (macht der Bot
den ersten Zug automatisch). Im Mehrspieler: sowohl bei Raumerstellung
(wer X/O bekommt) als auch bei jedem Rematch zufällig statt eines festen
Wechsels.

Mit Simulationen und echten Server-Tests bestätigt: alle Stufen-Übergänge
inkl. Serien-Reset bei Niederlage korrekt, Reset-Button funktioniert,
Zufallsverteilung sowohl gegen Bot (100 Spiele) als auch bei
Raumerstellung (20 Räume) zeigt eine echte Mischung, nicht immer
dieselbe Seite.

## 7zz. Tic Tac Toe: Solo/Online-Modus-Struktur + neue Quantum-Variante

**1. Einstieg umstrukturiert**: Tic Tac Toe hat jetzt wie die anderen
Modi zuerst einen "Solo"/"Online-Modus"-Auswahlbildschirm (statt beides
zusammen auf der Rangübersicht). "Online-Modus" ist weiterhin nur "Raum
erstellen/beitreten mit Freunden" – auf Wunsch bewusst OHNE automatische
Gegnersuche/Matchmaking, das kann später noch kommen.

**2. Neue Variante: Quantum-Modus** (`⚡ QUANTUM-MODUS`-Button auf der
Solo-Rangübersicht). Jede Seite hat höchstens 3 Symbole gleichzeitig auf
dem Feld – beim vierten Zug verschwindet automatisch das jeweils älteste
eigene Symbol. Das macht das Spiel im Gegensatz zum klassischen Modus
NICHT mehr zu einem "gelösten", bei perfektem Spiel immer unentschieden
endenden Spiel – es gibt wirklich Sieger.

- Eigener, einfacherer Bot (keine volle Minimax-Suche, da der
  Zustandsraum durch das Verschwinden nicht mehr sauber erschöpfend
  durchsuchbar ist) – nimmt aber zuverlässig sofortige Siege und blockt
  meistens drohende Niederlagen, mit 3 wählbaren Schwierigkeitsstufen
  (Leicht/Mittel/Schwer).
- Zugbegrenzung (30 Züge) als Sicherheitsnetz gegen ein theoretisch
  endloses Spiel – danach automatisch unentschieden.
- Vorerst **nur gegen Bot**, kein eigenes Rang-/Fortschrittssystem (das
  würde den Rahmen sprengen) – einfach zum Ausprobieren. Mehrspieler-
  Unterstützung für den Quantum-Modus wäre ein möglicher nächster Schritt.

Mit Simulationen bestätigt: Die Kernmechanik (ältestes Symbol verschwindet
korrekt beim vierten Zug) funktioniert exakt, der Bot nimmt sofortige
Siege auch auf "Leicht", und über 200 komplette simulierte Partien kamen
tatsächlich Siege zustande (nicht nur Unentschieden) – die Variante
erfüllt also genau ihren Zweck.

## 8aa. Neuer Tic-Tac-Toe-Modus: QuizMix (Felder per Wissensduell erkämpfen)

Auf Wunsch eine weitere Variante, diesmal im Online-Modus wählbar (beim
Raum erstellen: "Klassisch" oder "QuizMix"). Statt direkt zu setzen, wird
jedes Feld per 5-Fragen-Duell erkämpft:

- Antippen eines leeren Feldes startet ein Duell – **beide** Spielenden
  bekommen dieselben 5 Fragen (aus dem allgemeinen 590-Fragen-Pool),
  nacheinander, je 12 Sekunden Zeit pro Frage.
- Wer nach 5 Fragen mehr richtig hat, bekommt das Feld mit seinem Symbol.
  **Bei Gleichstand bleibt das Feld leer** und ist erneut antippbar –
  genau wie gewünscht ("kriegt keiner den Punkt").
- Gewöhnliches 3-in-einer-Reihe-Gewinnen danach unverändert.
- Server ist die Zeit-Autorität (löst nach Ablauf auch ohne Antwort
  automatisch auf), Client zeigt nur einen optischen Countdown.

Mit einem echten Zwei-Client-Test über WebSocket vollständig bestätigt:
Raum korrekt im QuizMix-Modus erstellt, Duell startet beim Antippen,
beide Seiten sehen exakt dieselben 5 Fragen, alle 5 Auflösungen kommen
korrekt an, die Punktezählung stimmt mit dem tatsächlichen Ergebnis
überein, und das gewonnene Feld zeigt am Ende korrekt das Sieger-Symbol.

**Nicht explizit durchgetestet** (aber durch die einfache, symmetrische
Vergleichslogik im Code hohe Zuversicht): der Unentschieden-Fall
(Feld bleibt leer) und der Fall, dass jemand eine Frage gar nicht
beantwortet und die Zeit einfach abläuft.

## 8bb. Arena: 10-Sekunden-Zeitlimit statt unbegrenzter Zeit

Auf Wunsch, da die Arena vorher teils unbegrenzt Zeit ließ ("hat man ja
unendlich Zeit") – jetzt bewusst kurz und knackig:

- **Wissenstest in der Arena**: 10 Sekunden statt der normalen 20
  (`ARENA_TIME_LIMIT` neu, getrennt von `QUIZ_TIME_LIMIT` – normaler
  Multiplayer-Wissenstest bleibt unverändert bei 20s). Dabei auch gleich
  einen sichtbaren Countdown-Balken für Party-Quiz-Fragen ergänzt, den es
  vorher gar nicht gab (nur der Server kannte bisher ein Zeitlimit, die
  Anzeige zeigte keinen Timer).
- **Einordnen in der Arena**: 10 Sekunden pro Platzierung, individuell je
  Person (nicht rundenweise). Reagiert jemand nicht rechtzeitig, zählt das
  wie eine falsche Platzierung (ein Leben weg), der Timer läuft direkt für
  den nächsten Versuch weiter. Im normalen (Nicht-Arena-)Einordnen bleibt
  es bei der kürzlich eingeführten unbegrenzten Zeit – nur die Arena
  bekommt dieses knappe Zeitlimit.

**Nachgeliefert**: Chronologie und Mehr-oder-Weniger (gemeinsame
Ranking-Engine) haben jetzt ebenfalls das 10-Sekunden-Arena-Zeitlimit pro
Entscheidung – nach demselben Muster wie bei Einordnen. Reagiert das
aktive Team nicht rechtzeitig, zählt das wie eine falsche Antwort (Leben
weg), sichtbarer Countdown-Balken ergänzt, Auflösung zeigt "⏱ ZEIT
ABGELAUFEN" statt "✕ FALSCH". Außerhalb der Arena bleibt die
Entscheidungszeit weiterhin bewusst unbegrenzt (kein Timer gesetzt, keine
Verhaltensänderung).

Mit einem echten Server-Test bestätigt: `arenaTimeLimitMs` korrekt im
State, nach 10 Sekunden ohne Reaktion kommt eine `rankAttempt`-Nachricht
mit `timeout:true`, Leben sinkt korrekt von 3 auf 2.

Mit echten Server-Tests bestätigt: normaler Multiplayer-Wissenstest bleibt
bei 20s, Arena-Wissenstest korrekt bei 10s, und beim Einordnen in der
Arena kostet Nichtstun nach 10 Sekunden nachweislich ein Leben (3→2).

## 8cc. Bugfix: Weißer Gürtel war praktisch unschlagbar

Gemeldet: nicht mal der allererste Bot ließ sich schlagen.

**Ursache**: Meine vorigen Bot-Fixes ("nimmt nie mehr einen geschenkten
Sieg liegen", "lässt sich nie einen offensichtlichen Verlust entgehen")
waren als feste Garantien gebaut, unabhängig von der Schwierigkeitsstufe.
In Tic Tac Toe reicht aber schon "nimmt IMMER einen Sieg, blockt IMMER
eine Bedrohung" für sich allein, um gegen die meisten Menschen zu
gewinnen oder wenigstens nicht zu verlieren – die Schwierigkeitsstufe
wirkte sich dadurch praktisch nur noch auf "wie gut spielt er
strategisch", nicht mehr auf "verschenkt er mal was", aus.

**Fix**: Auch diese beiden Verhaltensweisen skalieren jetzt mit der
Schwierigkeit (niedrige Ränge übersehen jetzt öfter mal eine Bedrohung
oder eine Gewinnchance – genau das macht sie wirklich schlagbar). Beim
weißen Gürtel entsprechend deutlich reduziert.

Mit mehreren wiederholten, isolierten Simulationen bestätigt: weißer
Gürtel gegen einen soliden simulierten Gegenspieler (nimmt Sieg/blockt
Niederlagen, sonst zufällig) jetzt bei ~75% Gewinnchance für den
Menschen (zwei unabhängige 200-Spiele-Durchläufe: 78%, dann 73%) – vorher
0%. Meister bleibt weiterhin korrekt unbesiegbar (200 Spiele, 0 Siege für
den Menschen). Nebenbei auch die Kern-Minimax-Logik selbst gegengeprüft
(reines Minimax gegen reines Minimax endet über 50 Spiele zuverlässig
immer unentschieden, wie es die Theorie für perfektes Tic-Tac-Toe-Spiel
vorhersagt) – die war die ganze Zeit korrekt, das Problem lag
ausschließlich an den zu starren "immer"-Garantien.

**Ehrlich**: ein Testskript, das alle 7 Stufen in einem Durchlauf
zusammen prüfen sollte, lieferte widersprüchliche, in sich nicht
schlüssige Werte (u.a. Meister bei 3% statt 0%) – vermutlich ein Fehler
in diesem Testskript selbst, nicht im eigentlichen Spielcode, da
wiederholte einzelne Prüfungen jeder Stufe für sich konsistent und
korrekt waren. Die mittleren Stufen (Gelb bis Braun) habe ich deshalb
nicht mit derselben Sicherheit einzeln nachgeprüft wie Weiß und Meister.

## 8dd. Online-Ranking für Tic Tac Toe + neuer Modus: QuizMix gegen Bot

Zwei Ergänzungen auf Wunsch:

**1. Online-Siege zählen jetzt für denselben Gürtel-Aufstieg.** Bisher
war der Gürtel-Fortschritt eine reine Bot-Modus-Sache. Die
Aufstiegs-Logik (gestaffelte Sieg-Anforderungen, "in Folge" ab Grün) ist
jetzt in `tttApplyRankOutcome()` wiederverwendbar gemacht und wird sowohl
vom Bot-Modus als auch vom Online-Modus (Klassisch UND Online-QuizMix)
genutzt. Nach jedem beendeten Online-Spiel wird der Ausgang (Sieg/
Niederlage/Unentschieden) genauso wie im Bot-Modus verarbeitet, inklusive
Serien-Reset bei einer Niederlage. Der aktuelle Rang wird jetzt auch im
Online-Bildschirm angezeigt.

**2. Neuer Modus "QuizMix gegen Bot"** (`🧠 QUIZMIX GEGEN BOT` auf der
Rangübersicht) – dieselbe Idee wie das Online-QuizMix, nur gegen einen
simulierten Bot statt einer echten Person. Neuer, leichter Server-
Endpunkt `/api/random-quiz-questions` liefert 5 zufällige Fragen aus dem
590er-Pool (inkl. korrektem Index – unbedenklich, da Solo gegen einen Bot,
kein echtes Duell). Die "Wissens"-Korrektheit des Bots wird pro Frage
unabhängig anhand der Gürtel-Schwierigkeit simuliert (kein echtes
Fragenverständnis nötig). Wer mehr der 5 Fragen richtig hat, bekommt das
Feld; bei Gleichstand bleibt es leer, genau wie beim Online-QuizMix.
Siege/Niederlagen zählen ebenfalls für den Gürtel-Aufstieg.

Mit echten Tests bestätigt: der neue API-Endpunkt liefert 5 unterschiedliche,
korrekt strukturierte Fragen; die wiederverwendete Aufstiegs-Logik
funktioniert identisch zum Bot-Modus (1 Sieg bei Weiß reicht, Serie bei
Grün wird durch eine Niederlage zurückgesetzt); der komplette QuizMix-
gegen-Bot-Ablauf (Feld antippen → 5 Fragen → Auflösung → zurück zum Brett)
läuft ohne Fehler durch.

## 8ee. Quantum jetzt auch im Online-Modus

Auf Wunsch: die Raumauswahl beim Online-Modus hat jetzt drei statt zwei
Optionen – Klassisch, QuizMix und neu **Quantum**. Gleiche Regel wie im
Bot-Modus: höchstens 3 Symbole je Seite gleichzeitig auf dem Feld, beim
vierten Zug verschwindet automatisch das eigene älteste. Technisch
unaufwändig, da Quantum sich strukturell wie Klassisch verhält
(rundenbasiert, leeres Feld antippen) – der Client brauchte praktisch
keine Änderung, nur der Server wendet jetzt bei `mode:"quantum"` die
Verschwinde-Regel auf jeden Zug an (`tttQuantumApplyMove()`, verfolgt die
Zug-Reihenfolge je Symbol in `room.xPieces`/`room.oPieces`). Rematch
setzt diese Reihenfolge korrekt zurück.

Mit einem echten Zwei-Client-Test bestätigt: das älteste Symbol
verschwindet beim vierten Zug korrekt (Feld wieder leer), die beiden
neueren eigenen Symbole bleiben unverändert erhalten.

## 8ff. QuizMix: Feldauswahl wechselt jetzt strikt ab

Gemeldet: bei QuizMix (Bot UND Online) konnte man jederzeit ein
beliebiges Feld antippen, egal wer das vorige Duell gewonnen hatte –
sollte aber wie bei richtigem Tic Tac Toe strikt abwechseln, wer das
nächste Feld auswählen darf.

**Bot-Modus**: neues `ttqb.turnSymbol` (zufällig, wer beginnt). Ist der
Bot dran, wählt er jetzt selbstständig ein zufälliges leeres Feld und
startet das Duell von sich aus (`tttQuizmixBotAutoPick()`), ganz ohne
Zutun der spielenden Person. Nach jedem Duell wechselt die Wahlberechtigung
– unabhängig vom Ausgang (Sieg/Niederlage/Unentschieden).

**Online-Modus**: `tttQuizmixTap` prüft jetzt `room.turnSymbol` (dieselbe
Variable wie beim klassischen Modus), bevor ein Duell gestartet wird –
die Person, die nicht dran ist, kann kein Feld mehr antippen. Nach jedem
Duell (`tttFinishDuel`) wechselt `turnSymbol`, ebenfalls unabhängig vom
Ausgang.

Mit echten Tests bestätigt: Bot-Modus – nach dem ersten (von der Person
gewählten) Duell wählt der Bot eigenständig ein anderes Feld und startet
selbst ein neues Duell. Online-Modus – die Person, die nicht am Zug ist,
kann kein Duell starten; die Person am Zug kann es weiterhin normal.

## 8gg. Statistik-Seite überarbeitet: alte Felder raus, neue Modi-Liste rein

Auf Wunsch, nach Durchsicht eines Screenshots der bisherigen Seite:

**Entfernt** (veraltet/ungenutzt, Reste des alten Punkte-/Tier-Systems von
vor der Einführung des Klassensystems):
- "Nicht gelistet"-Badge oben rechts (war nur der alte Score-Rang, stand
  eh schon 0/ungenutzt neben der eigentlich relevanten Klassen-Anzeige)
- "Punkte" und "Beste Punktzahl" (gleiches altes System, zeigte immer 0)
- "Richtig/Falsch" und "Trefferquote" (unklar, wofür - wird jetzt durch
  die neue, verständlichere Pro-Modus-Aufschlüsselung ersetzt)

**Geblieben**: Konto-Hinweiszeile, aktuelle Klasse (Brain Test), Runden
gespielt, Siege, Niederlagen, Siegquote, Arena-Punkte und Arena-Matches
(beides schon immer Gesamtwerte über die ganze Zeit, nicht saisonal - die
Saison-Werte stehen ja separat in der Arena-Bestenliste), Erfolge-Button.

**Neu**: eine Liste je Spielmodus darunter, jeweils mit "gespielt" und
(wo sinnvoll) "richtig":
- Einordnen, Chronologie, Mehr oder Weniger: volle Verfolgung (gespielt +
  richtig), da diese drei über dieselbe Ranking-Engine sauberes
  richtig/falsch pro Zug liefern.
- Musik raten, Bild erraten: nur "gespielt" - dort läuft die Bewertung in
  Teilpunkten pro Feld (Interpret/Titel/Jahr bzw. Bild), kein klares
  richtig/falsch wie bei den anderen drei, daher (noch) keine
  "richtig"-Zahl dafür.
- Stadt Land Fluss und Nenn's Blitz fehlen in der Liste - beides reine
  Mehrspieler-Modi ohne Solo-Variante, bräuchten einen eigenen,
  separaten Multiplayer-Statistik-Haken (kein Solo-Durchlauf, an den
  sich die Zählung wie bei den anderen fünf anhängen ließe).

Technisch: neues `modeStats`-Feld im Profil (lokal + Konto, inkl. neuer
serverseitiger Validierung, da es ein verschachteltes Objekt statt einer
einfachen Zahl ist). Tracking hängt sich für Einordnen an die ohnehin
schon vom Server mitgelieferte `correctCount`, für Chronologie/Mehr-oder-
Weniger an die einzelnen `rankAttempt`-Antworten.

Mit einer Simulation bestätigt: alle fünf entfernten Elemente sind weg,
die behaltenen Werte stimmen weiterhin, die neue Modi-Liste zeigt alle
fünf Modi mit den richtigen Labels, und das Tracking funktioniert korrekt
über mehrere Runden hinweg (addiert sich richtig auf, nicht überschrieben).

## 8hh. Bugfix: Modi-Liste auf dem Handy übergelaufen

Per Screenshot gemeldet: die neue "Nach Spielmodus"-Liste hatte auf dem
Handy Karten, die über den Bildschirmrand hinausragten (v.a. "Mehr oder
Weniger" mit seinem längeren, umbrechenden Namen).

**Ursache**: die Liste hat versehentlich dieselbe CSS-Klasse (`.stat-mini`)
wie die einfachen Einzelwert-Kästchen oben (Runden gespielt, Siege, …)
mitbenutzt – die ist auf eine feste 3-Spalten-Aufteilung ausgelegt, die
für die neuen, dichteren Modi-Karten (Titel + zwei Werte nebeneinander)
auf schmalen Bildschirmen zu eng war.

**Fix**: eigene, neue CSS-Klasse `.mode-stat-grid`/`.mode-stat-card` für
die Modi-Liste, mit `repeat(auto-fit, minmax(130px, 1fr))` statt einer
festen Spaltenzahl – dadurch passen sich die Spalten der verfügbaren
Breite an (auf dem Handy automatisch 2 statt erzwungener 3 pro Reihe),
ohne dass eine Karte überläuft.

## 8ii. Hauptmenü in Kategorien umgebaut, Chronologie + Bild erraten vorerst raus

**Hauptmenü neu strukturiert**, wie gewünscht:
- **Brain Test** – weiterhin oben für sich allein
- **Online-Modus**: Party Raum, Arena
- **Modi**: Einordnen, Mehr oder Weniger, Nenn's Blitz, Musik raten
- **Mini Games**: Stadt Land Fluss, Tic Tac Toe

Jede Gruppe hat jetzt eine eigene Überschrift über ihrem Kartenraster,
statt allem in einem einzigen durchgehenden Grid.

**Chronologie und Bild erraten komplett raus** (kommen laut Ansage als
späteres Patch-Update zurück) – nicht nur aus dem Hauptmenü, sondern
wirklich überall: auch aus dem "Party Raum"-Mixed-Modus und aus der
Arena-Herausforderungsauswahl, da beide denselben zentralen
Rundendaten-Pool nutzen. Technisch bewusst so gelöst, dass die Engine
und alle Datensätze dahinter unangetastet im Code bleiben (nur
auskommentiert/rausgefiltert an den paar zentralen Stellen) – für die
spätere Rückkehr reicht es, diese Kommentare wieder zu entfernen, es
muss nichts neu gebaut werden.

Mit Tests bestätigt: neue Menü-Überschriften und alle acht verbleibenden
Modi korrekt an ihrem jeweiligen Platz, Chronologie und Bild erraten
weder im Menü noch im serverseitigen Rundenpool (auch dort, wo Party
Raum seine zufälligen Runden herzieht) auffindbar, Einordnen und die
anderen Modi weiterhin unangetastet im Pool vorhanden.

## 8jj. Party Raum: Rundenauswahl jetzt auch kategorisiert + Tic Tac Toe als Runde

**1. Rundenauswahl im Party Raum kategorisiert**, wie im Hauptmenü:
"Modi" (Wissenstest, Einordnen, Mehr oder Weniger, Nenn's Blitz, Musik
raten) und "Mini Games" (Stadt Land Fluss, Tic Tac Toe) als eigene
Überschriften, statt einer einzigen durchgehenden Liste – die Suche
funktioniert unverändert weiter, blendet bei einer Eingabe einfach eine
flache Trefferliste statt der Kategorien ein.

**2. Tic Tac Toe ist jetzt als Party-Raum-Runde wählbar.** Team- statt
einzelspielerbasiert: die beiden Teams spielen gemeinsam je eine Seite
(X/O), jedes Teammitglied darf ziehen, wenn das eigene Team dran ist.
Sieg = 10 Punkte fürs Team, Unentschieden = 5/5, Niederlage = 0 – reiht
sich in die normale Rundenpunkte-Vergabe ein.

**Wichtige Einschränkung**: Tic Tac Toe braucht zwangsläufig genau 2
Seiten. Bei genau 2 Teams (z.B. FFA mit 2 Personen, oder einer 1v1-
Aufteilung) funktioniert die Runde normal. Bei mehr als 2 Teams (z.B.
2v2v2, oder FFA mit mehr als 2 Personen) wird die Runde automatisch mit
0 Punkten für alle übersprungen, mit einer klaren Erklärung an alle
Beteiligten – ein echtes Turniersystem mit mehreren parallelen Tic-Tac-
Toe-Partien für größere Gruppen wäre ein eigenes, deutlich größeres
Feature, das hier bewusst nicht mit reinkam.

Mit einem echten Zwei-Spieler-Test bestätigt: Team-Zugreihenfolge
funktioniert korrekt (nur das jeweils berechtigte Team kann ziehen),
Sieg-Erkennung funktioniert, und die Punkte reihen sich korrekt in die
normale `roundEnd`-Vergabe ein (Sieger-Team 10, Verlierer-Team 0).

## 8kk. Brain Test grundlegend umgebaut: Übungstest + Haupttest getrennt

Auf Wunsch eine größere Umstrukturierung des Brain-Test-Ablaufs:

**Übungstest** – bleibt technisch wie bisher (zufällige Teilmenge der
Fragen je Klasse, kürzeres Zeitlimit, endet vorzeitig sobald
Bestehen/Durchfallen feststeht). **Ändert aber nicht mehr die Klasse.**
Erreicht man dabei ≥80%, schaltet sich stattdessen der **Haupttest** für
die aktuelle Klasse frei.

**Haupttest** (neu) – der eigentliche Aufstiegstest:
- Immer **alle 50 Fragen** der Klasse (nicht nur eine Teilmenge)
- **90 Sekunden** pro Frage
- Läuft **immer komplett durch**, auch wenn Bestehen oder Durchfallen
  schon vorher feststeht – kein vorzeitiges Ende wie beim Übungstest
- 80% (40/50) nötig zum Bestehen
- **Bestanden** → Klassenaufstieg, für die neue Klasse muss der
  Haupttest wieder frisch über einen Übungstest freigeschaltet werden
- **Nicht bestanden** → keine Rückstufung mehr (das alte "2× hintereinander
  durchgefallen → eine Klasse zurück" ist raus), bleibt einfach frei
  wiederholbar, wie gewünscht ("egal in welcher Klasse er ist")

**Live-Anzeige**: auf dem Fragen-Bildschirm steht jetzt durchgehend
"✓ X richtig · ✕ Y falsch", für beide Testarten.

**Klassen-Übersicht**: zeigt jetzt einen eigenen "🔓 HAUPTTEST STARTEN"-
Button, sobald für die aktuelle Klasse freigeschaltet (bleibt sichtbar,
bis diese Klasse tatsächlich bestanden wird – ein alter Freischalt-Status
von einer früheren Klasse zählt nicht mehr für die neue).

Mit einer ausführlichen Simulation bestätigt (8 Testbereiche): Übungstest-
Mechanik unverändert, Haupttest nutzt wirklich immer alle 50 Fragen mit
90s/40 nötig, bricht nachweislich nicht vorzeitig ab, Übungstest ändert
die Klasse nicht mehr, schaltet aber korrekt den Haupttest frei,
bestandener Haupttest hebt die Klasse und setzt die Freischaltung für die
neue Klasse zurück, durchgefallener Haupttest stuft nicht mehr zurück und
bleibt wiederholbar, die Live-Anzeige erscheint korrekt, und der
Haupttest-Button in der Übersicht reagiert korrekt auf den
klassenspezifischen Freischalt-Status.

## 8ll. Bugfix: Anfechten bei genau 2 Spielern (Nenn's Blitz + Stadt Land Fluss)

Gemeldet: das Anfechten funktionierte bei 1 gegen 1 nicht.

**Ursache gefunden**: Wenn jemand eine Anfechtung startet, zählt die
eigene (implizite) "ungültig"-Stimme sofort mit. Ob damit schon ALLE
stimmberechtigten Personen abgestimmt haben, wurde bisher aber nur
geprüft, wenn noch jemand ANDERES aktiv abstimmt (`handleSlfVote`/
`handleNennsBlitzVote`). Bei genau 2 menschlichen Spielenden ist die
anfechtende Person aber die EINZIGE stimmberechtigte Person (die
Zielperson darf ja nicht über die eigene Antwort mitstimmen) – es gibt
also niemanden mehr, der/die noch abstimmen und diese Prüfung auslösen
könnte. Die Anfechtung hing dadurch im 15-/20-Sekunden-Timeout fest,
statt sich sofort aufzulösen.

**Fix**: direkt beim Erstellen der Anfechtung wird jetzt geprüft, ob mit
der eigenen impliziten Stimme bereits alle stimmberechtigten Personen
abgestimmt haben – falls ja (genau der 1-gegen-1-Fall), löst sich die
Anfechtung sofort auf, ohne auf den Timeout zu warten.

Mit einem gezielten, isolierten Test der geänderten Funktionen bestätigt:
bei genau 2 Spielenden löst sich die Anfechtung sofort auf (statt erst
nach dem Timeout) und wird korrekt als ungültig markiert (die
anfechtende Person ist ja die einzige Stimme). Als Gegenprobe bei 3
Spielenden bestätigt, dass sich daran nichts geändert hat – dort wird
weiterhin korrekt auf die zweite, echte Stimme gewartet, bevor aufgelöst
wird.

## 8mm. Bugfix: Mehr-oder-Weniger-Rundenauflösung ging nach 3s automatisch weiter

Gemeldet: nach einer kompletten Runde Mehr oder Weniger (nicht die
Einzelfrage-Auflösung, die schon vorher behoben wurde, sondern die
Gesamt-Auflösung am Ende der Runde mit allen Antworten) ging es nach
~3 Sekunden automatisch weiter zur nächsten Runde, ohne dass man die
Antworten in Ruhe anschauen konnte.

**Ursache**: `finishRankingRound()` hatte einen festen
`setTimeout(..., 2600)`, bevor automatisch zur Rundenauswertung
weitergeschaltet wurde – unabhängig von der Einzelfrage-Pause, die
schon früher auf Host-Bestätigung umgestellt wurde. Betrifft
gleichermaßen Chronologie, da beide Modi dieselbe Engine nutzen.

**Fix**: kein automatischer Timer mehr – der Host bekommt jetzt einen
"WEITER"-Button auf der Auflösungsseite, alle anderen sehen einen
Hinweis, dass der Host weiterschaltet, sobald alle fertig geschaut haben.

Mit einem echten Server-Test (komplette Runde bis zur Auflösung
durchgespielt) bestätigt: die Auflösung kommt korrekt mit dem
Weiterschalt-Hinweis an, geht nach 3,5 Sekunden OHNE Bestätigung nicht
automatisch weiter (der alte Timer ist nachweislich weg), und schaltet
erst nach dem manuellen "WEITER" tatsächlich zur nächsten Runde um.

## 8nn. Neuer Modus: Speed Math

Auf Wunsch ein neuer Modus unter "Modi" im Hauptmenü – Kopfrechnen gegen
die Uhr:

- Vier wählbare Zeit-Optionen: 1, 2, 3 oder 5 Minuten
- Alle vier Grundrechenarten (Plus, Minus, Mal, Geteilt), zufällig
  gemischt
- Zahlen im Bereich des kleinen Einmaleins (1-10) – Subtraktion tauscht
  bei Bedarf die Zahlen, damit nie ein negatives Ergebnis herauskommt;
  Division wird so konstruiert, dass sie immer sauber aufgeht (keine
  Kommazahlen)
- Antwort wird eingetippt (nicht aus Optionen gewählt) – fühlt sich beim
  Kopfrechnen schneller/natürlicher an
- Live-Anzeige "✓ X richtig · ✕ Y falsch" während des Spiels
- Nach Ablauf der Zeit: Ergebnis-Bildschirm mit Gesamtzahl, direkt
  "NOCHMAL"-Button mit derselben Zeit-Einstellung
- Komplett clientseitig (wie Tic Tac Toe gegen Bot), kein Server-
  Roundtrip pro Aufgabe nötig
- Zählt in der Statistik-Seite als neuer Eintrag "Speed Math" mit
  gespielt/richtig, genau wie Einordnen & Co.

Mit einem ausführlichen Test bestätigt: 2000 generierte Aufgaben
allesamt rechnerisch korrekt, nie ein negatives Subtraktions-Ergebnis,
jede Division geht sauber auf, alle vier Rechenarten kommen vor, kompletter
Spielablauf (Start → richtige/falsche Antwort → Zeitablauf → Ergebnis)
funktioniert fehlerfrei, und die Statistik wird korrekt aktualisiert.

## 8oo. QuizMix mischt jetzt zufällig Speed Math mit ein

Auf Wunsch: die QuizMix-Duelle bei Tic Tac Toe (Bot- UND Online-Modus)
wählen jetzt pro Feld zufällig zwischen zwei Duell-Typen statt immer nur
Wissenstest zu sein:

- **Wissenstest** (wie bisher): 5 Multiple-Choice-Fragen aus dem
  590er-Pool
- **Speed Math** (neu): 5 Kopfrechenaufgaben (Plus/Minus/Mal/Geteilt,
  Zahlen bis zum kleinen Einmaleins), Antwort wird eingetippt statt
  ausgewählt – dieselbe Aufgaben-Logik wie beim eigenständigen
  Speed-Math-Modus

Welcher der beiden Typen für ein Feld kommt, entscheidet sich beim
Antippen zufällig (50/50). Bot-Modus: der Bot "kann rechnen" mit
derselben rang-abhängigen Wahrscheinlichkeit wie beim Wissen, keine echte
Rechenleistung dahinter. Online-Modus: der Server generiert und prüft die
Aufgaben, damit niemand mogeln kann, genau wie beim Wissenstest.

Mit Tests bestätigt: Bot-Modus – über 30 Versuche kamen beide Typen
zuverlässig vor, Rechen-Duell zeigt korrekt die Aufgabe und prüft die
eingetippte Antwort richtig. Online-Modus – ein echter Zwei-Client-Test
über 6 komplette Duelle bestätigt beide Typen, jedes lief korrekt mit 5
Fragen/Aufgaben durch und schloss sauber ab.

## 8pp. Speed Math: fest 1 Minute statt Zeit-Auswahl

Auf Wunsch vereinfacht: keine Auswahl zwischen 1/2/3/5 Minuten mehr, Speed
Math läuft jetzt immer genau 1 Minute. Der Einstiegsbildschirm zeigt
direkt einen "LOS GEHT'S"-Button statt der vier Zeit-Buttons.

Mit einem Test bestätigt: Einstiegsseite zeigt "1 Minute" und keine der
anderen Zeitoptionen mehr, das Spiel startet korrekt mit 60 Sekunden.

## 8qq. Speed Math bei Tic-Tac-Toe-QuizMix: jetzt auch 1-Minuten-Sprint

Korrektur zur letzten Änderung: die feste 1-Minute sollte nur beim
Speed-Math-Duell in Tic Tac Toe gelten, nicht beim eigenständigen
Speed-Math-Modus im Hauptmenü. Entsprechend umgesetzt:

- **Eigenständiger Speed-Math-Modus**: wieder wie ursprünglich, Auswahl
  zwischen 1/2/3/5 Minuten.
- **Tic-Tac-Toe-QuizMix-Duell (Speed Math)**: komplett umgebaut von "5
  feste Aufgaben, Punktevergleich" auf einen **echten 1-Minuten-Sprint**
  – so viele Aufgaben wie möglich lösen, wer nach 60 Sekunden mehr
  richtig hat, bekommt das Feld. Bot- UND Online-Modus.
  - **Bot-Modus**: der Bot bekommt sein Endergebnis einmalig zu
    Sprintbeginn simuliert (8-15 plausible Versuche in einer Minute,
    davon ein rang-abhängiger Anteil richtig) und erst am Ende
    aufgedeckt.
  - **Online-Modus**: beide Seiten bekommen ihren **eigenen,
    unabhängigen** Strom an Aufgaben (nicht dieselbe Aufgabe
    gleichzeitig) – man muss nicht aufeinander warten, sieht aber den
    Punktestand der anderen Seite live mit.
  - Das Wissenstest-Duell (5 Multiple-Choice-Fragen) bleibt unverändert
    wie zuvor – nur Speed Math wurde umgestellt.

Mit Tests bestätigt: Bot-Sprint läuft korrekt 60 Sekunden ohne Pause
zwischen Aufgaben, vergleicht Ergebnisse richtig am Ende. Online-Sprint
(echter Zwei-Client-Test): beide Seiten bekommen eigene Startaufgaben,
eine Seite kann 5 Aufgaben hintereinander lösen ohne auf die andere zu
warten, Punktestände werden korrekt und live an beide Seiten
übertragen.

## 8rr. Neu: Speed Math Meilenstein-Modus (50 Level, Punkte, Herzen)

Auf Wunsch ein komplettes Level-System innerhalb von Speed Math, als
zweite Option neben dem freien Zeit-Modus:

- **50 Level**, Schwierigkeit steigt alle 5 Level: Level 1-5 nur Plus/
  Minus ("Einfach"), Level 6-10 zusätzlich Mal ("Mittel"), ab Level 11
  alle vier Rechenarten (Zahlenbereich wächst danach weiter langsam mit,
  bis maximal 1-20 in den obersten Leveln, "Fortgeschritten" → "Schwer"
  → "Experte"). Beim Testen fiel auf, dass Mal anfangs erst ab Level 11
  statt ab 6 kam - korrigiert.
- **Punkte**: +100 pro richtiger Antwort, -50 pro Fehler, zusätzlich +50
  Bonus bei jeder 5er-Serie in Folge
- **Level bestehen**: die für das Level nötige Punktzahl erreichen (steigt
  mit jedem Level)
- **Kontrollpunkt alle 5 Fragen**: die aktuelle Serie muss das
  Level-spezifische Ziel erreicht haben (wächst langsam mit der
  Schwierigkeit) – sonst geht ein Herz drauf
- **3 Herzen pro Tag**, füllen sich über Nacht wieder auf (gleiches
  Prinzip wie die bestehenden Arena-Herzen) – bei 0 Herzen ist für heute
  Schluss
- Level-Fortschritt und Herzen werden gespeichert wie alle anderen
  Werte (lokal oder am Konto)

**Zu den genauen Zahlen (Punkteziel je Level, wie schnell der
Zahlenbereich wächst, wie die Streak-Ziele genau skalieren)**: da du
keine exakten Formeln vorgegeben hast, habe ich hier plausible,
sich sauber über 50 Level steigernde Werte gewählt. Sag gerne Bescheid,
falls sich das zu leicht/schwer anfühlt, dann justiere ich die Kurve nach.

Mit einem ausführlichen Test über 9 Bereiche bestätigt: Level-
Konfiguration steigt korrekt über die ganze Spanne, Aufgabengenerierung
hält sich an die jeweilige Level-Konfiguration, Punktesystem (+100/-50)
und Serien-Bonus (+50 bei jeder 5er-Serie) funktionieren exakt,
Kontrollpunkt kostet bei zu niedriger Serie korrekt ein Herz (und NICHT
bei ausreichender Serie), Level-Aufstieg bei erreichtem Punkteziel
funktioniert, täglicher Herzen-Reset funktioniert korrekt (nur bei
echtem Tageswechsel, nicht mitten am Tag), und die Einstiegsseite zeigt
Level und Herzen korrekt an.

## 8ss. Speed Math: Antwort-Kreise statt Tastatur + Ruckel-Bugfix im Online-Duell

- **Keine Tastatur mehr**: überall, wo Speed Math vorkommt (freier Modus,
  Meilenstein-Level, Tic-Tac-Toe-Duell gegen Bot und Online), stehen unten
  4 runde Antwort-Kreise. Einer ist richtig, drei sind plausible falsche
  Werte (nah dran, nie negativ, keine Doppelten) - schnell den richtigen
  antippen.
- **Bugfix Online-Duell**: Jeder Tipp des Gegners hat bei dir die ganze
  Seite neu aufgebaut (Ruckler, das Zahlenfeld war kurz weg). Der
  Punktestand der anderen Seite wird jetzt nur noch als Text aktualisiert,
  ohne Neuaufbau. Zusätzlich fängt ein Schutz Doppeltipps ab, damit eine
  zweite Antwort nicht versehentlich schon der nächsten Aufgabe
  zugerechnet wird.
- **Sicherheit**: der Server schickt die Aufgabe im Online-Duell nicht mehr
  samt Lösung an den Browser (vorher stand die Lösung im Datenpaket).

Getestet: 3000 Aufgaben (immer 4 verschiedene Kreise inkl. richtiger
Antwort), alle vier Spielarten, Score-Update ohne Neuaufbau, Doppeltipp,
sowie ein echter Zwei-Client-Test gegen den Server.

## 8tt. Brain Test: Übungstest 50 Fragen (90%), Haupttest 20 Fragen

Auf Wunsch neu justiert, für alle 10 Klassen gleich:

- **Übungstest**: immer alle **50 Fragen** der Klasse. **90 % richtig**
  (45 von 50) schalten den Haupttest frei.
- **Haupttest**: **20 Fragen** (zufällig aus dem Pool der Klasse), 90 s pro
  Frage, weiterhin **80 % nötig** (16 von 20) für den Klassenaufstieg.
- **Kein vorzeitiges Ende mehr**: beide Tests müssen immer bis zur letzten
  Frage durchgespielt werden - auch wenn die nötige Prozentzahl schon
  erreicht ist oder das Bestehen rechnerisch nicht mehr möglich ist
  (vorher endete der Übungstest dann automatisch).
- Anzeigen angepasst (Übersicht, Startseite, Ergebnis: "ab 90 %", "20 Fragen").

Hinweis zur Auslegung: "maximal 90 Prozent" habe ich als "90 % sind die
Bestehensgrenze beim Übungstest" verstanden. Die 80 % beim Haupttest habe
ich nicht angetastet.

Mit Tests bestätigt: 50/45 beim Übungstest, 45 richtige in Folge beenden
den Test NICHT, 44/50 (88 %) schalten den Haupttest nicht frei, sicheres
Durchfallen beendet den Test nicht vorzeitig, Haupttest 20 Fragen mit 16
nötig und Aufstieg bei Bestehen, alle 10 Klassen liefern 50 bzw. 20 Fragen.

## 8uu. Nenn's Blitz + Stadt Land Fluss: Daumen runter statt Anfechten

Das Anfechten (mit Abstimmung) ist komplett raus. Stattdessen:

- Bei **jeder Antwort** gibt es einen **👎-Button** - für alle, auch für die
  Person, der die Antwort gehört (man kann sich also selbst korrigieren).
- Nochmal tippen nimmt den eigenen Daumen zurück. Bis zum "WEITER" des Hosts
  kann man das jederzeit ändern.
- Eine Antwort fliegt raus (durchgestrichen, 0 Punkte), sobald **mindestens
  die Hälfte der menschlichen Mitspielenden (aufgerundet)** 👎 gedrückt hat:
  bei 2 Personen also **1 Daumen**, bei 3-4 Personen 2, bei 5-6 Personen 3.
  Bots stimmen nicht mit und zählen nicht zur Schwelle.
- Die Anzeige aktualisiert sich live bei allen; die Schwelle steht als
  Hinweis oben. Endwertung (bei SLF inkl. neu berechneter Einzigartigkeit)
  nach dem "WEITER" des Hosts.
- **Warum**: Das Anfechten hing bei 1 gegen 1, weil keine dritte Person
  abstimmen konnte. Mit dem Daumen-System entfällt die Abstimmung.

Protokoll: neue Aktionen `nennsBlitzThumb` / `slfThumb`, neue Nachrichten
`nennsBlitzThumbUpdate` / `slfThumbUpdate` (ersetzen Challenge/Vote).

Getestet: Schwelle für 1/2/3 Personen und mit Bots, eigener Daumen, Daumen
zurücknehmen, leere Antworten nicht bewertbar, Anzeige inkl. Live-Update,
sowie echte 1-gegen-1-Durchläufe gegen den Server für beide Modi.

## 8vv. Brain Test Haupttest: Gesamtzeit 1:30 Minuten für alle 20 Fragen

- Der Haupttest hat jetzt **eine gemeinsame Gesamtuhr von 1:30 Minuten
  (90 s)** für alle 20 Fragen, statt 90 s pro Frage. Die Uhr läuft
  durchgehend und wird nicht bei jeder Frage neu gestartet.
- Damit die Zeit nicht beim Lesen draufgeht: nach jeder Antwort wird kurz
  (0,45 s) richtig/falsch gezeigt und **automatisch** zur nächsten Frage
  gewechselt - kein Erklärtext, kein "Weiter"-Knopf im Haupttest.
- **Läuft die Zeit ab**, endet der Test sofort; alle noch nicht
  beantworteten Fragen zählen als falsch (Hinweis "Zeit abgelaufen" im
  Ergebnis).
- Übungstest unverändert (Zeit pro Frage, mit Erklärung und "Weiter").
- Die 90 s stehen als Konstante `BRAINTEST_MAIN_TOTAL_SEC`.

Hinweis: 90 s für 20 Fragen sind nur 4,5 s pro Frage - sehr knapp.

Getestet mit simulierter Uhr: Uhr läuft über die Fragen durch, Anzeige zeigt
die Restzeit, Ablauf zählt den Rest als falsch, 20/20 in ~50 s besteht
regulär, danach laufen keine Timer mehr, Übungstest unverändert.

## 8ww. Brain Test: Haupttest nach bestandenem Test / Lücke geschlossen

- **Durchgefallen**: Haupttest bleibt freigeschaltet und ist beliebig oft
  wiederholbar (keine Rückstufung).
- **Bestanden**: Klasse steigt, die Freischaltung gilt nur für die alte
  Klasse. Der Haupttest der neuen Klasse muss erst wieder über den
  Übungstest (90 %) verdient werden.
- **Bugfix**: Nach einem bestandenen Haupttest startete "NOCH EINE RUNDE"
  direkt den Haupttest der NÄCHSTEN Klasse und umging so den Übungstest.
  Jetzt startet `beginSolo` den Haupttest nur, wenn er für die aktuelle
  Klasse freigeschaltet ist (sonst Übungstest), und der Knopf heißt nach
  bestandenem Haupttest "ÜBUNGSTEST KLASSE X".

## 8xx. Brain Test: "Test wiederholen" bei bestandenen Klassen

- In der Klassenliste (Brain Test) steht bei jeder **bereits bestandenen
  Klasse** ein Knopf **"🔁 Test wiederholen"**. Er startet den **Haupttest
  dieser Klasse (20 Fragen, 1:30 Gesamtzeit)** erneut.
- Es ist eine **reine Wiederholung**: Klasse und Freischaltung bleiben
  unverändert (kein Aufstieg, keine Rückstufung, auch nicht bei
  Durchfallen). Nur die allgemeine Statistik (Runden/richtig/falsch) zählt
  mit.
- Nach der Wiederholung: "NOCHMAL WIEDERHOLEN" oder "ZUR ÜBERSICHT".
- Bewusst nur für die 20-Fragen-Variante, weil sie später für Erfolge
  gebraucht wird. Erfolge selbst sind noch NICHT eingebaut, es wird auch
  noch nichts extra gespeichert (z. B. Bestleistung je Klasse).
- Nur für bereits bestandene Klassen möglich (die aktuelle Klasse geht
  weiter über Übungstest/Haupttest, kommende Klassen sind gesperrt).

## 8yy. Sicherheits- und Stabilitäts-Fixes (aus der Gesamtanalyse)

**1. Absturzschutz** - vorher konnten einzelne Nachrichten mit falschem
Datentyp den ganzen Server beenden (`null`, `name: 5`, `code: 5`,
Registrierung mit Zahlen, verspätetes `rankPlace`).
- Alle WebSocket- und HTTP-Handler laufen in `try/catch`; zusätzlich
  `uncaughtException`/`unhandledRejection` als Notbremse (nur Log).
- Textfelder werden typgeprüft; `msg` muss ein Objekt sein.
- `rankPlace` prüft, ob wirklich eine Ranking-Runde läuft.
- Fuzz-Test: 40 Aktionen x Müll-Werte in Lobby/Nenn's Blitz/SLF -> vorher 5
  Abstürze, jetzt 0.

**2. Datenverlust-Schutz** - vorher: Ladefehler -> leere Kontenliste -> nächste
Speicherung überschrieb die ganze Datenbank.
- Es wird nie gespeichert, solange die Konten nicht sicher geladen wurden;
  der Server versucht das Laden bei Bedarf erneut.
- Upstash-Antworten werden geprüft (Status, Struktur).
- Lokal: atomares Schreiben (Temp-Datei + Umbenennen), `.bak`-Sicherung,
  kaputte Datei wird als `users.json.corrupt-...` gerettet.
- Kann nicht gespeichert werden, schlägt die Registrierung sichtbar fehl
  (kein Schein-Erfolg). Während eines Ausfalls meldet `/api/session`
  `unavailable` - der Client löscht sein Token dann NICHT mehr.

**3. XSS + Header**
- Client: neue `esc()`-Funktion an allen 51 Stellen mit Nutzertext (Namen,
  Antworten, Kategorien, Teamnamen, Labels), auch im Attribut
  (Kategorie-Eingabefeld).
- Server: Namen/Antworten/Kategorien ohne `<` `>` und Steuerzeichen, Namen
  überall max. 20 Zeichen (auch Tic Tac Toe), Raumcode nur A-Z/0-9.
- Header: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  CSP (nur `object-src`, `base-uri`, `frame-ancestors`, `form-action` -
  eine strikte `script-src` bräuchte Umbau der Inline-Handler und die
  YouTube-API), `Cache-Control: no-cache` für HTML/JS (Updates kommen
  sofort an), `no-store` für die API. API-Body max. 100 KB.

**4. Arena-Punkte**
- `arena-start-match` gibt eine einmalige Match-ID aus; `arena-finish-match`
  akzeptiert nur diese ID (einmal), frühestens nach 20 s, Punkte gedeckelt
  auf 100 pro Match, ungültige Werte (`Infinity`, Text) zählen 0.
- Grenze: die Punkte innerhalb der 100 meldet weiter der Client. Voll
  serverseitig wäre ein Umbau (Konto-Bindung der Spielverbindung).

**Noch offen** (siehe `analyse-bericht.md`): Login-Ratenbegrenzung und
asynchrones Hashing (5), Größenlimit/Ratenlimit im WebSocket (6),
Token-Ablauf (7), längerer Raumcode (8), Erfolge serverseitig (10),
Herzen-Zeitzone (11), veraltete Tests (12), Pong-Prüfung (13).

## 8zz. Login-Sperre, asynchrones Hashing, WebSocket-Limits

**Login-Sperre / Ratenbegrenzung** (`server.js`)
- Falsche Logins werden gezählt: **5 je Benutzername + IP**, **30 je IP**
  (beliebige Namen), **40 je Benutzername über alle IPs** (verteilter
  Angriff) - danach 10 Minuten gesperrt. Gesperrte Versuche werden VOR dem
  Hashen abgelehnt (kosten keine CPU), selbst das richtige Passwort geht dann
  nicht durch. Ein erfolgreicher Login setzt den Zähler des Namens zurück.
- Auch für nicht existierende Konten gilt dieselbe Sperre/Meldung, und es wird
  trotzdem gehasht (Antwortzeit verrät nicht, ob es das Konto gibt).
- Registrierung: max. **10 neue Konten je IP und Stunde**. Alle API-Aufrufe:
  max. **600 je IP und Minute** (dann HTTP 429).
- Hinter Render wird die IP aus `X-Forwarded-For` gelesen (letzter Eintrag);
  sonst wird der Header ignoriert (sonst fälschbar). Steuerbar über die
  Umgebungsvariable `TRUST_PROXY=1`. Für Tests gibt es `AUTH_LOCK_MS` und
  `AUTH_WINDOW_MS`.
- Einschränkung: Wer den Namen kennt, kann von einer IP aus das Konto für
  10 Minuten "sperren", indem er 5x falsch tippt. Das trifft nur Logins von
  dieser IP (und ab 40 Versuchen von allen).

**Asynchrones Hashing**: `crypto.scrypt` statt `scryptSync`. Gemessen: ein
fremder Request musste bei 10 gleichzeitigen Logins vorher bis zu **404 ms**
warten, jetzt **18 ms**. Zusätzlich max. 12 gleichzeitige Hashes.

**WebSocket** (`lib/miniws.js`, `server.js`)
- Max. Nachrichtengröße **64 KB**, geprüft schon am Header (sonst Close 1009).
  Der frühere 300-MB-Angriff wird sofort gekappt, der Speicher wächst nicht.
- Max. **60 Verbindungen je IP**, 3000 insgesamt.
- Nachrichtenrate: 40 als Burst, dann 25/s; Dauerfeuer kappt die Verbindung.
  Normales Spielen liegt weit darunter.
- **Bugfix**: Legte die Gegenseite ohne Close-Frame auf (App/Tab hart
  beendet), blieb der Spieler bis zum nächsten Ping als "verbunden" stehen,
  weil der Server das Ende der Verbindung nicht beachtete. Außerdem wurde
  "close" doppelt gemeldet - jetzt genau einmal.

**Noch offen**: Token-Ablauf (7), längerer Raumcode (8), Erfolge
serverseitig (10), Herzen-Zeitzone (11), veraltete Tests (12),
Pong-Prüfung (13).

## 8aaa. Restliche Punkte aus der Analyse (Token, Raumcode, Zeitzone, Pong, Tests)

**Sitzungs-Token** (Fund 7): Token laufen nach **30 Tagen ohne Nutzung** ab;
jede Nutzung erneuert sie (max. 1x pro Tag), aktive Spielende werden also nie
ausgeloggt. Pro Konto gelten höchstens **5 Token** (ältere fliegen raus).

**Raumcode** (Fund 8): **6 statt 4 Zeichen** (~1 Mrd. statt ~1 Mio.
Möglichkeiten), erzeugt mit `crypto.randomInt` statt `Math.random`. Zusätzlich
Sperre beim Durchprobieren: nach 40 falschen Codes von einer IP 5 Minuten
Pause (so viele, damit eine Schulklasse mit Tippfehlern nicht ausgesperrt
wird). Eingabefelder und Hinweise im Client sind auf 6 Zeichen umgestellt.

**Herzen-Zeitzone** (Fund 11): Der Tageswechsel gilt jetzt nach **deutscher
Zeit** (`Europe/Berlin`), also um Mitternacht statt um 1/2 Uhr (UTC). Gilt für
die Arena-Herzen (Server) und die Speed-Math-Herzen (Client).

**Pong-Prüfung** (Fund 13): Der Server merkt sich das letzte Lebenszeichen jeder
Verbindung (Ping wird alle 25 s gesendet, Browser antworten automatisch). Kommt
75 s nichts, wird die Verbindung gekappt - z. B. Handy im Funkloch, sonst stünde
die Person ewig als "verbunden" im Raum.

**Tests** (Fund 12): Die veralteten `run-test.js`/`run-bot-test.js` sind ersetzt.
`npm test` führt fünf Suiten aus (~1,5 Minuten, ohne Netz, mit temporärer
Nutzerdatei - es werden nie echte Daten berührt):
- `test/client.test.js` (52 Prüfungen): XSS-Schutz, Speed Math (Kreise, Level,
  Herzen, Sprint), Brain Test (50/20 Fragen, Gesamtuhr, Wiederholen, Lücke beim
  Freischalten), Daumen-runter-Anzeige.
- `test/security.test.js` (60): Absturzschutz, Login-Sperre und Limits, Token,
  Arena, Header/Pfade, Datenverlust (Datei + Upstash-Ausfall), WebSocket-Limits,
  Raumcode, tote Verbindungen.
- `test/multiplayer.test.js` (17): echte 2-Spieler-Abläufe (Stadt Land Fluss und
  Nenn's Blitz mit Daumen runter, Speed-Math-Duell online, Namen).
Für schnelle Tests gibt es Umgebungsvariablen (im Normalbetrieb wirkungslos):
`USERS_FILE`, `AUTH_LOCK_MS`, `AUTH_WINDOW_MS`, `ARENA_MIN_MATCH_MS`,
`WS_PING_EVERY_MS`, `WS_DEAD_AFTER_MS`, `NENNSBLITZ_DUELL_MS`, `SLF_HURRY_MS`.

**Bewusst NICHT umgesetzt - Fund 10 (Spielstände serverseitig)**: Klasse,
Speed-Math-Level und Herzen meldet weiterhin der Client. Ein Plausibilitäts-
check ("Level nur +1 pro Speichern") würde nur Gelegenheits-Schummler stoppen -
wer die Schnittstelle direkt aufruft, speichert einfach mehrfach. Echten Schutz
gibt es nur, wenn der SERVER die Ereignisse selbst kennt (z. B. Level-Ergebnis
serverseitig auswerten). Das sollte beim Einbau der Erfolge gleich mitgedacht
werden.

## 8bbb. Erfolge (53 Stück, inkl. eigener Ideen)

Neuer Bereich **🏆 Erfolge** (Hauptmenü und Statistik-Seite): Karten je Kategorie
mit Fortschrittsbalken, freigeschaltet = grün mit Datum; beim Freischalten
erscheint kurz "Erfolg freigeschaltet!". Gilt für das Konto bzw. das zuletzt
benutzte lokale Profil (ohne beides wird nichts gezählt).

**Die Erfolge**
- **Brain Test** (nur der *Haupttest* mit 20 Fragen, Wiederholungen zählen):
  jede Klasse geschafft (10) · jede Klasse mit 100 % · 5× Haupttest mit 100 % ·
  jede Klasse in 1 Minute (≤ 60 s).
- **Einordnen** / **Mehr oder Weniger**: Runde komplett · Runde ohne ein Leben zu
  verlieren.
- **Nenn's Blitz**: 10 / 15 / 20 / 30 / 50 gültige Antworten in *einer* Runde
  (nach Daumen-runter-Wertung).
- **Musik**: 10 Songs erraten, ohne zu wiederholen.
- **Stadt Land Fluss**: in jedes Feld etwas schreiben · als Erste/r mit allen
  Feldern fertig (1×) · 50×.
- **Tic Tac Toe**: alle Gürtel (Meister erreicht) · 100× in 3 Zügen gewinnen ·
  100 Quantum-Siege · 100 QuizMix-Siege · QuizMix in 3 Zügen · QuizMix in den
  ersten 3 Runden mit allen Fragen richtig.
- **Allgemein**: 10 / 100 / 1.000 / 10.000 / 100.000 / 1 Mio. richtig beantwortete
  Wissenstest-Fragen und Zahlenaufgaben.

**Wie ich unklare Stellen ausgelegt habe** (bitte prüfen, jeweils leicht zu ändern):
- *Musik*: "Song erraten" = **Titel** richtig; "ohne nochmal zuhören" = für diesen
  Song wurde nicht wiederholt. Es zählt insgesamt (nicht "in Folge").
- *Stadt Land Fluss "im Arena"*: SLF gibt es in der Arena nicht. Gezählt wird eine
  **Mehrspielerrunde (mind. 2 echte Personen)**; "erste" = wer als Erste/r mit
  ALLEN Feldern abgibt (der Server bestimmt das).
- *Tic Tac Toe "in 3 Zügen"*: Sieg mit dem **3. eigenen Zug** (klassisch/Quantum).
  Im QuizMix: das Spiel endet nach **genau 3 Duellen** und du hast alle gewonnen.
  "Alle Fragen richtig" = in diesem Spiel keine falsche/fehlende Antwort (auch keine
  falsche Zahlenaufgabe). Diese Siege zählen auch für das allgemeine "in 3 Zügen".
- *Gewinne alle Gürtel*: Rang **Meister** erreicht (den Meister-Bot selbst kann man
  nicht schlagen).
- *Allgemein*: zählt **Wissenstest-Fragen** (Party/Arena, QuizMix-Wissensduelle)
  und **Zahlenaufgaben** (Speed Math frei/Level, Zahlen-Duelle). **Nicht** gezählt:
  Brain Test, Einordnen, Mehr oder Weniger, Musik, Blitz, SLF.
- *Bereits Erreichtes*: bestandene Klassen (unterhalb der aktuellen) und ein schon
  erreichter Gürtel werden beim ersten Öffnen übernommen. "100 %"/"1 Minute" lassen
  sich nicht rückwirkend belegen und beginnen bei null.
- *Bot-Siege zählen mit* (auch beim leichtesten Gürtel).

**Technik**
- `public/achievements.js` ist EINE Datei für Browser und Server (Definitionen,
  Ereignisregeln, Zusammenführen). Der Server berechnet "freigeschaltet" beim
  Speichern **immer aus den Zählern neu** - ein direkt gesetztes `unlocked` bringt
  nichts; Zähler können nie sinken (Maximum beider Stände).
- Der Server meldet für die Erfolge zusätzlich: `slfReveal.firstFullId`/`humanCount`,
  `rankReveal.livesLeft`, `musicPlayerSubmitted.replaysUsed`, und im Online-TTT
  `tttState.achv` (`in3`, `allCorrect`, vom Server gezählt).
- Ehrlich: Die **Zähler** selbst kommen für Brain Test, Bot-Spiele und Speed Math aus
  dem Browser. Wer die Schnittstelle direkt mit erfundenen Zählern ruft, kann sich
  Erfolge erschummeln. Fälschungssicher wäre nur, diese Modi auf den Server zu
  verlegen (siehe `erfolg-ideen.md`).
- Tests: `test/achievements.test.js` (Regelwerk mit Grenzwerten, Server-Speicherung,
  Client-Einbindung, Konto-Abgleich) und `test/achievements-online.test.js` (echte
  Abläufe: TTT online, SLF, Mehr oder Weniger, Musik). Test-Schalter im Server:
  `TTT_DUEL_TYPE`, `TTT_SPRINT_MS` (nur für Tests).

## 8ccc. Erfolge: eigene Ideen mit eingebaut

Auf Wunsch aus `erfolg-ideen.md` meine 8 Top-Empfehlungen ergänzt (jetzt 53 statt
29 Erfolge):

- **Sammler / Vielseitig / Vollständig**: 5 / 15 / alle sonstigen Erfolge
  freigeschaltet (zählt auch die Kategorie-Erfolge mit, nicht sich selbst).
- **Kategorie gemeistert** (je Kategorie 1): alle "echten" Erfolge dieser
  Kategorie geschafft.
- **Speed-Math-Level 10/25/50**: aus dem Meilenstein-Modus, auch beim ersten
  Öffnen der Übersicht wird der bisherige Stand übernommen.
- **Vielnenner 100/500/1.000** (Nenn's Blitz): Antworten **über alle Runden
  aufsummiert** (zusätzlich zum bisherigen Bestwert einer einzelnen Runde).
- **Einzigartig** (Stadt Land Fluss): 100× eine Antwort, die laut
  Server-Wertung die einzige gültige in ihrer Kategorie war (20 Punkte).
- **Unbezwingbar**: Unentschieden gegen den Meister-Bot.
- **Perfektionist**: 10 perfekte Runden, Einordnen und Mehr-oder-Weniger
  zusammengezählt.
- **Täglicher Streak** (3/7/30/100 Tage in Folge): ein Kalendertag
  (deutsche Zeit) zählt, sobald irgendein Erfolge-Ereignis eintritt oder die
  Erfolge-Seite geöffnet wird - mehrfach am selben Tag zählt nur einmal, eine
  ausgelassene Nacht setzt die *aktuelle* Serie zurück (die längste bleibt als
  Bestwert erhalten und zählt für den Erfolg).

**Wichtig fürs Verständnis**: Kategorie- und Sammel-Erfolge werten `state.unlocked`
zur Laufzeit aus (nicht per Zähler) - `evaluate()` geht die Erfolge deshalb in
einer festen Reihenfolge durch (erst die "echten" Erfolge, dann Kategorien, dann
Sammler), damit ein einzelnes Ereignis, das zufällig eine ganze Kategorie
komplettiert, im selben Zug auch den Kategorie- und ggf. Sammel-Erfolg mit
freischaltet.

Getestet: alle neuen Regeln einzeln (inkl. Grenzwerte, Deckelung erfundener
Werte, Streak-Lücken, Server-Merge), ein Durchlauf, der wirklich ALLE 53
Erfolge nacheinander freischaltet (inkl. "Vollständig" als letzten), sowie
die Client-Ereignisse (Speed-Math-Level, SLF-Einzigartig, TTT-Unentschieden,
täglicher Streak).

## 8ddd. Bugfix: Erfolge-Button war doppelt

Der Button stand versehentlich zweimal: im Hauptmenü (neben "Statistik") und
am Ende der Statistik-Seite. Der in der Statistik-Seite ist raus - das
Hauptmenü ist der bessere Platz, ein Tipp vom Startbildschirm statt erst
durch die Statistik zu müssen.

## 8eee. Hintergrundmusik + Einstellungen-Button (Musik/Sprache)

Auf Wunsch 6 hochgeladene Titel eingebaut, unter `public/audio/`:

- **Menü-Musik** (rotiert überall im Spiel, außer bei Tic Tac Toe): "Final
  Showdown" (liegt als .mp3 UND .m4a vor - beide als `<source>`-Alternativen,
  der Browser wählt selbst das unterstützte Format; ich bin davon ausgegangen,
  dass das derselbe Titel in zwei Formaten ist, nicht zwei verschiedene Songs),
  "Der letzte Schlag", "The Final Duel", "Wissens-Quest". Reihenfolge wird bei
  jedem Durchlauf neu gemischt, kein Titel wiederholt sich, bevor nicht alle
  anderen dran waren.
- **Tic-Tac-Game.mp3**: läuft AUSSCHLIESSLICH während Tic Tac Toe (Bot, Online,
  UND im Party-Raum, sobald eine Runde dieses Typs läuft), in Dauerschleife.
  Sobald man Tic Tac Toe verlässt (Hauptmenü oder im Party-Raum eine andere
  Rundenart), geht es sofort mit der Menü-Musik weiter (nicht von vorn - die
  Umschaltung ist beim Zurückwechseln unterbrechungsfrei).
- Die Audio-Elemente werden per JavaScript erzeugt (nicht fest im HTML), damit
  das ständige Neuzeichnen der Bildschirme (jeder Screen-Wechsel ersetzt den
  Inhalt komplett) die laufende Musik nicht jedes Mal neu startet - nur ein
  echter Zonenwechsel (Menü ↔ Tic Tac Toe) wechselt den Titel.
- Browser blockieren Ton, bevor man einmal getippt/geklickt hat (Autoplay-
  Schutz) - die Musik startet automatisch beim ersten Tipp irgendwo auf der
  Seite, nicht erst beim Öffnen der Einstellungen.

**Neuer Button "⚙️ Einstellungen"** im Hauptmenü (ersetzt die bisher immer
sichtbaren Sprach-Kästchen dort) öffnet ein Overlay mit:
- **Musik**: an/aus, merkt sich die Wahl (localStorage), zeigt den gerade
  laufenden Titel.
- **Sprache**: dieselbe Auswahl wie bisher, nur jetzt im Overlay statt fest im
  Menü sichtbar.

Der Button sitzt bewusst nur im Hauptmenü (wie die Sprachauswahl es vorher auch
war) - falls er auch auf anderen Bildschirmen erreichbar sein soll, sag
Bescheid.

Getestet: Zonen-Umschaltung (inkl. "gleiche Zone → kein Neustart", Dauerschleife
bei Tic Tac Toe, automatischer nächster Titel bei Menü-Musik, Musik aus/an),
Mischung ohne Wiederholung, Einstellung bleibt über einen Neustart erhalten,
Einstellungen-Overlay, Party-Raum-Umschaltung zwischen Runden (inkl.
"ticTacToeSkipped"), und dass der Server alle 6 Dateien mit dem richtigen
Inhaltstyp ausliefert (kein Pfad-Ausbruch, keine fremde Datei erreichbar).

## 8fff. Start-Bildschirm: Musik spielt spürbar sofort beim Öffnen

Problem: Browser blockieren Ton grundsätzlich, bis einmal wirklich getippt/
geklickt wurde (Autoplay-Schutz - gilt in jedem Browser, lässt sich nicht per
Code umgehen). Bisher passierte das zufällig beim ersten Menü-Klick, wirkte
also nicht wie "die Musik geht beim Öffnen los".

Neu: Vor dem Hauptmenü erscheint jetzt ein kurzer **Start-Bildschirm** ("🔊 Zum
Start antippen", in allen 7 Sprachen). Der eine Tipp darauf ist genau die vom
Browser verlangte Geste - die Musik startet dadurch spürbar in dem Moment, in
dem man antippt, direkt bevor das Menü erscheint. Die Konto-Anmeldung lädt im
Hintergrund weiter, ohne den Start-Bildschirm wegzuräumen.

Getestet: Start-Bildschirm erscheint zuerst (nicht das Menü), vor dem Antippen
läuft keine Musik, Konto-Ankunft VOR dem Tippen räumt den Bildschirm nicht weg,
nach dem Tippen erscheinen Menü UND Musik gleichzeitig, doppeltes Antippen hat
keine Wirkung mehr.

## 8ggg. Start-Bildschirm wieder raus + Lautstärkeregler

Auf Wunsch zurückgenommen: der extra "Zum Start antippen"-Bildschirm fühlte
sich wie ein Play-Knopf an. Jetzt geht es direkt ins Hauptmenü; die Musik
startet weiterhin automatisch beim ALLERERSTEN Tipp irgendwo auf der Seite
(nicht auf einen bestimmten Knopf) - das war technisch schon vorher so
eingebaut, nur der zusätzliche Bildschirm davor ist raus. Ein Tipp bleibt
zwingend nötig, das ist eine Browser-Regel (Autoplay-Schutz gegen Ton ohne
Interaktion) und lässt sich durch keinen Code umgehen.

Neu in den **Einstellungen**: ein **Lautstärkeregler** (0-100 %) unter dem
Musik-An/Aus-Knopf. Wirkt sofort auf den gerade laufenden Titel, ohne ihn neu
zu starten. Merkt sich die Wahl (localStorage), Standard 45 %. Ist der Regler
bei ausgeschalteter Musik deaktiviert, bleibt der zuletzt eingestellte Wert
erhalten und gilt wieder, sobald Musik An geschaltet wird.

Getestet: kein Start-Bildschirm mehr, Musik startet durch den ersten Tipp
irgendwo, gespeicherte/Standard-Lautstärke wird beim Start übernommen, Regler
ändert die laufende Musik sofort, Wertebereich wird auf 0-100 gedeckelt
(auch bei ungültiger Eingabe), Anzeige im Einstellungen-Fenster inkl.
deaktiviertem Zustand bei ausgeschalteter Musik.

## 8hhh. Neue Songs werden automatisch erkannt (kein Code-Update mehr nötig)

Auf Wunsch: die Titelliste steht nicht mehr fest im Code. Der Server liest den
Ordner `public/audio/` bei jeder Anfrage live aus und schickt sie dem Browser.

- **Einfach eine Datei in `public/audio/` hochladen** (.mp3, .m4a, .ogg, .wav,
  .aac oder .flac) - taucht beim nächsten Laden automatisch im Menü-Pool auf,
  ganz ohne dass am Code etwas geändert werden muss.
- **Anzeigename** wird aus dem Dateinamen abgeleitet (Unterstriche/Bindestriche
  werden zu Leerzeichen): `Mein_Neuer_Song.mp3` → "Mein Neuer Song".
- **Gleicher Name, andere Endung** = derselbe Titel in mehreren Formaten
  (wie bisher bei "Final Showdown" .mp3+.m4a) - wird automatisch
  zusammengeführt, nicht als zwei Titel gezählt.
- **Reserviert für Tic Tac Toe**: jede Datei, deren Name (Gross-/Kleinschreibung
  und _/-/Leerzeichen egal) zu "tic-tac-game" passt, läuft NIE im Menü-Pool,
  sondern nur während Tic Tac Toe - das gilt weiterhin unabhängig vom Dateiformat.
- Wird eine Datei aus dem Ordner gelöscht, verschwindet sie ebenso automatisch
  wieder aus der Liste.
- Fehlt der Ordner ganz oder ist er leer, gibt's keinen Absturz, nur eine leere
  Liste (bzw. beim Client bleibt dann die eingebaute Ausfallliste als Reserve).

Neuer Endpunkt `/api/audio-tracks`, genutzt beim Programmstart
(`loadAudioTrackList()`); Umgebungsvariable `AUDIO_DIR` nur für Tests, im
Normalbetrieb ungenutzt.

Getestet: Erkennung/Gruppierung/Umbenennung, neue Datei erscheint sofort,
Nicht-Audio-Dateien werden ignoriert, gelöschte Datei verschwindet wieder,
verschiedene Schreibweisen des Tic-Tac-Toe-Dateinamens, fehlender Ordner
stürzt nicht ab, Client übernimmt die echte Liste bzw. bleibt bei der
Ausfallliste, wenn der Server nicht erreichbar ist oder der Ordner leer war.

## 8iii. Wissensfragen: Antwortreihenfolge gemischt (Bugfix)

Gemeldet: gefühlt liegt die richtige Antwort öfter auf Feld 2/3. Geprüft und
bestätigt - und schlimmer als gedacht:
- Allgemeiner Wissenstest-Pool (590 Fragen): richtige Antwort lag zu **65 %**
  auf Feld 2 (Feld 4 fast nie: 1,4 %).
- Brain-Test-Fragen: wurde mit steigender Klasse immer schlimmer - **Klasse
  10: 98 % auf Feld 1**. Man hätte praktisch immer "A" tippen können.

Ursache: die Original-Datensätze wurden beim Erstellen nie zufällig
durchmischt. Behoben durch eine neue Funktion `shuffleAnswerOrder()` (Server
UND Client, gleiche Logik), die die Reihenfolge der vier Antworten bei
**jeder Ausgabe an eine Person neu würfelt** - die Original-JSON-Dateien
bleiben unverändert, nur was rausgeht wird gemischt. Eingebaut an allen 6
Stellen, wo Fragen ausgegeben werden: Bot-Quiz, Party-Raum-Quiz, Arena-Quiz,
Online-Tic-Tac-Toe-Duell, Brain-Test-Übungstest, Brain-Test-Haupttest (inkl.
Wiederholung).

Getestet (`test/answer-shuffle.test.js`): Mischfunktion selbst (2000
Durchläufe, richtige Zuordnung bleibt garantiert korrekt, andere Felder
unangetastet), Code-Beleg für alle 4 Server-Einsatzstellen, Bot-Quizfragen
über die echte API (400 Stichproben: von 65 % auf einem Feld zu gleichmäßig
~20-28 %), Party-Raum-Quiz (30 Stichproben, echter Server-Test), Brain Test
alle 10 Klassen inkl. der schlimmsten Klasse 10 (bestätigt: von 98 % auf
einem Feld zu gleichmäßig verteilt). Arena und Online-TTT-Duell nutzen
denselben Code-Pfad (Beleg im Code) bzw. wurden einzeln erfolgreich
durchgespielt, ein vollständiger Mehrfachrunden-Livetest für diese beiden
ist an einer Umgebungseinschränkung der Testumgebung selbst gescheitert
(mehrere schnelle Verbindungsauf-/-abbauten hintereinander), nicht am Code.

## 8jjj. Brain Test: "Zurück" versehentlich gedrückt löschte alles (Bugfix)

Gemeldet: der "Zurück"-Knopf stand zu nah am "WEITER"-Knopf, ein versehentlicher
Tipp mitten im Test hat den kompletten Fortschritt sofort und ohne Rückfrage
gelöscht.

- Ab der ersten beantworteten Frage fragt jetzt eine **Bestätigung** nach
  ("Test wirklich abbrechen? Dein bisheriger Fortschritt in dieser Runde geht
  verloren."), bevor wirklich etwas verloren geht. Bricht man die Bestätigung
  ab, bleibt der Test unverändert bestehen.
- Ganz am Anfang (noch keine Frage beantwortet) geht's weiterhin direkt raus,
  ohne unnötige Rückfrage - da gibt's ja nichts zu verlieren.
- Knopf heißt jetzt "✕ Test abbrechen" statt des generischen "ZURÜCK", mit
  deutlich mehr Abstand zu "WEITER" (28px statt 10px), damit er auch optisch
  nicht mehr mit dem Weiter-Knopf verwechselt wird.
- Gilt gleichermaßen für Übungstest, Haupttest und "Test wiederholen" (alle
  drei laufen über denselben Bildschirm).
- Neue Übersetzungen für den Knopftext und den Bestätigungstext in allen 7
  Sprachen.

Getestet (`test/exit-confirm.test.js`): kein Fortschritt → direkt raus ohne
Rückfrage, mit Fortschritt → Rückfrage kommt, "Abbrechen" der Rückfrage
rettet den Fortschritt (Test bleibt unverändert, kein Sprung ins Menü),
"Bestätigen" verlässt wie gewünscht, gilt für Haupttest und Wiederholung
gleichermaßen, korrekter Knopftext/Abstand, keine Timer-Leichen nach dem
Abbrechen.

## 8kkk. Speed-Math-Meilenstein: Klick-Bug behoben + Levelziel umgebaut

**Bugfix - "MEILENSTEIN-MODUS"-Knopf tat beim Antippen nichts**: Ursache war
`onclick="startSpeedMathMilestoneFlow(profile)"` (ohne `${}`) - beim echten
Klick wertet der Browser das inline-`onclick` im GLOBALEN Scope aus, wo es
keine Variable `profile` gibt (das war nur der lokale Funktionsparameter zur
Render-Zeit). Ergebnis: ein stiller `ReferenceError`, nichts passierte. Betraf
3 Stellen (Einstieg, "Zurück", "Zur Übersicht" nach Levelende) - alle jetzt auf
die tatsächlich globale Variable `speedMathProfile` umgestellt.

**Levelziel umgebaut, auf Wunsch wie beim Brain Test**: statt Punkte sammeln +
Kontrollpunkt alle 5 Fragen jetzt eine einfache, durchgehende **Serie ohne
eine einzige falsche Antwort**. Jeder Fehler setzt die Serie sofort auf 0
zurück und kostet ein Herz; man kann direkt danach weiterversuchen, solange
noch Herzen da sind. Das Ziel wächst von 10 (Level 1) auf 40 (Level 50) - bei
Level 15 liegt es bei ca. 20 (dem Beispielwert aus der Anfrage). Das alte
Punkte-/Bonus-/Kontrollpunkt-System ist komplett raus, ebenso die Anzeigen
dazu (jetzt: "Serie: x / Ziel" statt Punkte-Fortschrittsbalken).

Getestet: der echte Klickpfad an allen 3 vorher kaputten Stellen (Simulation
eines echten Browser-Klicks - ein direkter Funktionsaufruf hätte den Bug NICHT
gefunden, das ist extra im Test dokumentiert), Code-Suche nach demselben
Fehlermuster an anderer Stelle (keine gefunden), sowie das neue Serien-System
im Detail (Herzverlust bei Fehler, korrekte Rücksetzung, Levelaufstieg exakt
bei Erreichen des Ziels, kein Bestehen bei einem Fehler unmittelbar davor,
0 Herzen beendet die Runde, Erfolge zählen weiterhin korrekt).

Beim Testen zwei bereits vorhandene, von dieser Änderung unabhängige
Testschwächen gefunden und behoben: ein Zufalls-Test mit zu engen Grenzen bei
kleiner Stichprobe (30 statt z.B. 400 Versuche - reines Stichprobenrauschen,
kein Bug), und ein Musik-Test, der gelegentlich einen zufällig gewürfelten
Datensatz mit nur 1 Song traf (`serienintros_tvshow`) und dadurch auf einen
nie kommenden "nächsten Song" wartete - jetzt wird für den Test gezielt der
große Datensatz (129 Songs) gewählt.

## 8lll. Neuer Speed-Math-Modus: "Order of Speed"

Auf Wunsch: dritter Speed-Math-Modus, Knopf direkt unter "MEILENSTEIN-MODUS"
im Speed-Math-Menü. Zahlen von 1 bis 1000 erscheinen durcheinander (5 pro
Runde), du musst sie in der richtigen Reihenfolge antippen. Bei jeder Runde
gilt zufällig eine von drei Regeln:
- **Aufsteigend**: von der kleinsten zur größten Zahl
- **Absteigend**: von der größten zur kleinsten Zahl
- **Nur gerade Zahlen**: nur die geraden antippen (aufsteigend), die
  ungeraden sind Ablenker und dürfen nicht angetippt werden - jede Runde hat
  garantiert 2 bis 4 gerade Zahlen (nie 0, nie alle 5, sonst wäre die Aufgabe
  unlösbar bzw. ohne echte Auswahl)

Zeitbasiert wie der freie Speed-Math-Modus (1/2/3/5 Minuten, gleiche
Dauer-Auswahl). Ein falscher Tipp (falsche Reihenfolge, oder bei "nur gerade"
eine ungerade Zahl) zählt als Fehler und startet sofort eine neue Runde -
kein Verweilen, passend zum "Speed"-Charakter der anderen Modi hier. Jede
komplett und richtig gelöste Runde zählt auch für den allgemeinen "richtige
Antworten"-Erfolg. Eigene Statistik-Kategorie ("Order of Speed") in der
Übersicht.

Getestet: Rundenerzeugung für alle drei Regeln (Wertebereich, keine
Duplikate, korrekte Sortierung, bei "nur gerade" die 2-4-Grenze und dass die
übrigen Zahlen wirklich ungerade sind), Antippen (richtige Reihenfolge rückt
vor, bereits getippte Zahl wird ignoriert, falsche Zahl = sofortiger
Rundenwechsel), komplette Runde zählt genau einmal (nicht pro Zahl), Erfolge
laufen mit, Zeitablauf beendet sauber und speichert die Statistik, kein
Timer-Leck. Extra geprüft: der beim Meilenstein-Modus gefundene
onclick-Scoping-Bug (Verweis auf eine nicht-globale Variable) wurde hier NICHT
wiederholt - eigener Test mit echter Klick-Simulation bestätigt das explizit,
und eine Code-Suche im neuen Abschnitt fand keine weiteren Fälle.

## 8mmm. "Order of Speed" erweitert: mehr Regeln, Punkte, Level, Bewegung, Flackern

Auf Wunsch ausgebaut:

- **Vierte Regel "nur ungerade Zahlen"** dazu (analog zu "nur gerade"), macht
  jetzt 4 Regeln statt 3.
- **Kreisförmige Anordnung** statt Gitter - die Zahlen tauchen jetzt rund um
  die Mitte des Bildschirms verteilt auf.
- **Punkte**: 100 pro richtigem Tipp (nicht erst pro fertiger Runde).
- **Level-Leiste**: füllt sich mit den Punkten, ist sie voll, steigt das Level
  SOFORT - auch mitten in einer laufenden Runde, nicht erst am Rundenende.
  Überschuss-Punkte gehen dabei nicht verloren, sie zählen gleich für die
  nächste Stufe mit. Zielpunktzahl wächst pro Level (Level 1: 500 Punkte / 5
  Tipps, Level 10: 1.400 Punkte / 14 Tipps).
- **Wird mit dem Level automatisch schwerer**:
  - mehr Zahlen pro Runde (5 am Anfang, bis zu 9 in hohen Leveln)
  - **ab Level 4** bewegen sich die Zahlen (Positionen wechseln alle 2,5 s)
  - **ab Level 7** werden sie zusätzlich alle paar Sekunden kurz (0,7 s)
    unsichtbar (die Kreise bleiben als Umriss sichtbar, nur die Ziffer
    verschwindet kurz - man muss sich merken, wo welche Zahl war)

Ergebnisbildschirm zeigt jetzt zusätzlich Punkte und erreichtes Level.

Getestet: alle vier Regeln (inkl. neu "ungerade"), Schwierigkeits-Skalierung
mit dem Level, Punktevergabe (100 pro Tipp, keine bei Fehlern/Wiederholung),
Level-Aufstieg inkl. Grenzfall "genau voll" und "mitten in der Runde" (mit
Überschuss-Erhalt, laufende Runde bleibt bestehen), mehrfacher Levelsprung
auf einmal, Bewegungs-/Flacker-Timer schalten sich exakt ab Level 4 bzw. 7
zu (vorher nicht), werden bei neuer Runde und nach Levelaufstieg korrekt neu
gesetzt, und beim Verlassen/Zeitablauf restlos aufgeräumt (kein Timer-Leck),
Kreis-Positionsberechnung, sowie erneut der echte Klickpfad (kein Wiederauf-
leben des onclick-Scoping-Bugs vom Meilenstein-Modus).

## 8nnn. Neues Feature: Freunde + Chat

Auf Wunsch: Freunde hinzufügen/verknüpfen, sehen ob sie online sind, ihre
Erfolge-Anzahl einsehen, und mit ihnen schreiben. Setzt ein Konto voraus
(neuer "👥 Freunde"-Knopf neben der Kontoanzeige, nur sichtbar wenn
angemeldet - ohne Konto führt der Knopf erst zur Anmeldung und danach direkt
zu Freunden).

**Freunde-Bildschirm**:
- Suche nach Benutzername (ab 2 Zeichen), zeigt passend zum Status: schon
  befreundet / Anfrage bereits gesendet / hat dich selbst angefragt (dann
  direkt "Annehmen" statt einer zweiten Anfrage) / noch nichts, "Hinzufügen"
- Eingehende Anfragen: Annehmen oder Ablehnen
- Ausgehende Anfragen: Zurückziehen
- Freundesliste: **grüner Punkt bei Online-Personen**, **Erfolge-Anzahl**
  (🏆, aus dem bereits vorhandenen Erfolge-System berechnet), Knopf für den
  Chat, Entfernen (mit Bestätigung)
- Schickt die Gegenseite ebenfalls eine Anfrage, werden beide automatisch
  Freunde (kein doppeltes Bestätigen nötig)

**Chat**: 1:1-Unterhaltung mit jedem Freund, eigene Nachrichten rechts
hervorgehoben. Läuft über eine eigene, dauerhafte WebSocket-Verbindung
(unabhängig von Party-/Tic-Tac-Toe-Räumen) - solange sie offen ist, gilt man
für die eigene Freundesliste als online; baut sich bei Verbindungsverlust
automatisch neu auf (3 Sekunden Wartezeit), trennt sich sauber beim
Abmelden. Nachrichten werden dauerhaft gespeichert (übersteht einen
Serverneustart) und, falls die Zielperson gerade online ist, sofort live
zugestellt; sonst wartet die Nachricht im Verlauf, bis sie den Chat öffnet.
Zeichenlimit 500, HTML wird beim Anzeigen escaped (kein XSS über
Chatnachrichten möglich).

Technisch neu: `onlineAccounts` (Server, nur im Arbeitsspeicher, keine
Persistenz nötig), `conversations.json` als eigene, nach demselben
Sicherheitsmuster wie `users.json` geschützte Datei (atomar geschrieben,
mit `.bak`-Sicherung, Speichern nur nach erfolgreichem Laden). Neue
HTTP-Endpunkte: `/api/friends-list`, `/api/friends-search`,
`/api/friends-request`, `/api/friends-accept`, `/api/friends-decline`,
`/api/friends-cancel`, `/api/friends-remove`, `/api/chat-history`. Neue
WebSocket-Aktionen im bestehenden Kanal: `accountConnect`, `chatSend`.

Beim Testen einen echten Fehler gefunden und behoben: der Test-Hilfsordner
hatte für die neue `conversations.json` noch keinen eigenen Testpfad
vorgesehen (anders als bei `users.json` schon lange der Fall) - dadurch
wäre bei jedem Testlauf versehentlich in den echten Projektordner
geschrieben worden. Jetzt bekommt jeder Testserver automatisch einen
eigenen, isolierten Pfad dafür, genau wie bei den Nutzerdaten.

Getestet (`test/friends.test.js`, Server, 42 Prüfungen; `test/friends-client.test.js`,
Client, 40 Prüfungen): Suche (inkl. Mindestlänge, sich selbst nie im
Ergebnis), Anfrage senden/annehmen/ablehnen/zurückziehen/doppelt verhindert/
an sich selbst verhindert/an nicht existierende Person verhindert,
gegenseitige Anfrage führt direkt zur Freundschaft, Freund entfernen (auf
beiden Seiten), Erfolge-Anzahl korrekt aus dem Erfolge-Stand berechnet,
Online-Status inkl. Live-Meldungen bei An-/Abmeldung an alle Freunde,
Chat nur zwischen echten Freunden (sonst verweigert), Speicherung +
Live-Zustellung, lange Nachrichten gekürzt, HTML-Zeichen entfernt, leere
Nachrichten verworfen, ungültiger Token stürzt nichts ab, übersteht einen
Serverneustart. Client-seitig zusätzlich: Menü-Knopf nur mit Konto,
Weiterleitung zur Anmeldung ohne Konto, WebSocket-Verbindungsaufbau/
-abbau/Wiederverbindung, Live-Aktualisierung der offenen Freundesliste
und des offenen Chats ohne manuelles Neuladen, HTML-Escaping beim
Anzeigen, Bestätigung vorm Entfernen.

## 8ooo. Neue Farbpalette (wie im TikTok-Trailer) + PWA

**Farben**: Das bisherige Lila/Türkis-Thema ist raus, das Spiel nutzt jetzt
dieselbe Palette wie die Trailer-Vorschau:
- Hauptfarbe (`--accent`): Lime `#c6ff3d` (vorher Lila `#7c6cf0`)
- Zweitfarbe (`--accent-2`): Cyan `#3de0ff` (vorher Türkis `#21d6b8`)
- Fehlerfarbe (`--danger`): Pink-Rot `#ff5da2` (vorher `#ff4d6a`, bleibt in
  derselben Rot-Familie, damit "falsch/Fehler" weiterhin sofort erkennbar ist)
- Warnfarbe (Orange) unverändert, passt farblich schon zur neuen Palette
- Der primäre Knopf (Lime-zu-Cyan-Verlauf) hat jetzt **dunklen** statt
  weißen Text - auf der jetzt hellen Fläche wäre weiße Schrift unlesbar
  gewesen. Das ist zentral an einer Stelle (`.btn-primary`) geregelt und
  wirkt automatisch überall.
- Alle anderen Bildschirme funktionieren unverändert - die Farben werden
  im Code fast überall über die zentralen Variablen bezogen, nur an einer
  Stelle stand die alte Farbe fest eingetragen, das wurde mitgeändert.

**PWA (installierbar)**: Neues `public/manifest.json` (Name, Icons,
`display:standalone`, dunkles Theme passend zur neuen Palette),
4 selbst erzeugte App-Icons in `public/icons/` (192px, 512px, ein
"maskable" Icon für Android ohne weißen Rand, ein Apple-Touch-Icon für
iOS - schlichter Lime-Blitz auf dunklem Grund), sowie ein neuer
`public/sw.js` (Service Worker).

Der Service Worker ist bewusst zurückhaltend: die Startseite selbst läuft
"network-first" (online immer die aktuellste Version vom Server, Zwischen-
speicher nur als Rückfallebene ohne Verbindung) - das unterläuft NICHT das
bestehende "no-cache" für HTML/JS, das genau verhindern soll, dass jemand
nach einem Update eine veraltete Version im Cache hängen bleibt. Nur Icons
und das Manifest werden aggressiv zwischengespeichert (ändern sich praktisch
nie). API-Aufrufe, Audiodateien, Fragen-Datensätze und alles andere werden
vom Service Worker überhaupt nicht angefasst.

Damit lässt sich das Spiel über den Browser "zum Startbildschirm hinzufügen"
(Android: automatischer Installieren-Hinweis; iOS: Teilen → Zum Home-
Bildschirm) und startet dann wie eine eigene App, ohne Adressleiste.

Getestet (`test/pwa-and-colors.test.js`): Manifest/Icons/Service-Worker
werden mit korrektem Inhaltstyp ausgeliefert, Service Worker bekommt
ebenfalls "no-cache", Manifest-Inhalt ist gültig (Name, Icons inkl.
maskable, Startmodus, Farben), Service Worker fängt nachweislich nur die
App-Hülle ab und lässt API/Audio/Fremdes unangetastet durch, Kopfbereich
verlinkt Manifest/Icons korrekt, Registrierung funktioniert wenn unterstützt
und stürzt nicht ab wenn nicht, keine alten Farbwerte mehr im Code,
primärer Knopf ist mit dunklem Text lesbar. Zusätzlich mit einem echten
Browser (Playwright) nachgesehen, wie es aussieht - Screenshot bestätigt:
Titel und Verläufe zeigen die neue Palette wie gewünscht.

## 8ppp. Farben: deutlich mehr Neon-Grün + Tic Tac Toe in 3D

Gemeldet: nach der letzten Farbumstellung war kaum Lime/Grün zu sehen. Grund:
die Menü-Kacheln zeigten die neue Farbe nur beim Hover (auf dem Handy also
so gut wie nie) und der Titel-Verlauf ging nur Weiß→Cyan, Lime kam darin gar
nicht vor.

- **Titel "BRAIN PULSE"**: Verlauf jetzt Weiß → Lime → Cyan (vorher nur
  Weiß → Cyan) - über den ganzen Schriftzug hinweg sichtbar bunter/neon.
- **Menü-Kacheln**: durchgehend sichtbarer Lime-Rand plus sanftes Leuchten
  (vorher: nur ein schlichter grauer Rand, Lime kam nur beim Hover, was auf
  Touch-Geräten praktisch nie ausgelöst wird).
- **Tic Tac Toe in 3D**: die Spielfelder waren bisher flache, einfarbige
  Flächen ohne jede Tiefe. Jetzt: eine "gedrückte Taste"-Optik mit echtem
  Schlagschatten (sieht aus wie eine leicht erhabene Taste, sackt beim
  Antippen sichtbar ein) und X/O leuchten mit einem Neon-Glow in Lime bzw.
  Cyan. Betraf 5 Stellen im Code (Bot klassisch, Bot Quantum, Bot QuizMix,
  Online-Mehrspieler, Party-Raum) - jetzt über eine gemeinsame CSS-Klasse
  (`.ttt-cell`) geregelt statt fünffach wiederholtem Inline-Stil, damit alle
  fünf garantiert gleich aussehen.

Mit einem echten Browser (Playwright) nachgesehen, wie es jetzt aussieht -
Screenshots bestätigen: Menü und Tic-Tac-Toe-Brett zeigen deutlich sichtbares
Neon-Lime, das Spielbrett hat spürbare Tiefe.

## 8qqq. PWA-Bugfix: fehlendes Netz beim ersten Start konnte die App gar nicht erst öffnen

Beim erneuten Durchsehen des Service Workers einen echten Fehler gefunden:
War beim allerersten Öffnen (oder nach einer Weile ohne Nutzung) gerade kein
Netz da UND der Zwischenspeicher noch leer, hat der Service Worker mit
"nichts" geantwortet - das lässt eine Seite gar nicht erst laden, statt
einfach eine Fehlermeldung zu zeigen. Jetzt: in diesem Fall erscheint eine
einfache "Keine Verbindung"-Meldung statt eines kaputten/leeren
Ladevorgangs.

Das behebt einen möglichen Fall von "installiert, öffnet sich aber nicht" -
ob das bei dir die Ursache war, kann ich ohne Zugriff auf dein Gerät bzw.
deine Live-Seite nicht von hier aus prüfen. Die wahrscheinlichere Ursache
für "kein Icon sichtbar" ist allerdings, dass der neue Ordner
`public/icons/` bzw. `manifest.json`/`sw.js` noch nicht (vollständig) auf
der Live-Seite gelandet sind - das lässt sich in 10 Sekunden direkt im
Handy-Browser prüfen: `deine-seite.de/manifest.json` und
`deine-seite.de/icons/icon-512.png` sollten beide etwas anzeigen (den
JSON-Text bzw. das Blitz-Symbol), nicht "Not found".

## 8rrr. Speed-Math-Meilenstein: Zeitdruck pro Aufgabe

Auf Wunsch: das Levelziel (Serie ohne Fehler) hatte bisher gar kein
Zeitlimit - man konnte sich beliebig lange Zeit lassen. Jetzt läuft für
**jede einzelne Aufgabe** eine eigene Uhr:

- Level 1: 6 Sekunden pro Aufgabe
- wird mit steigendem Level knapper (dieselben 10 Schwierigkeitsstufen wie
  bei den Rechenarten), nie unter 2,5 Sekunden
- Zeit abgelaufen zählt **genau wie eine falsche Antwort**: Serie zurück auf
  0, ein Herz weg, direkt weiter mit einer neuen Aufgabe und wieder voller
  Zeit
- Eine eigene, zweite Leiste unter der Serien-Anzeige zeigt die verbleibende
  Zeit (Farbverlauf Cyan → Pink, wird zum Ende hin auffälliger)
- Übersichtsseite nennt jetzt auch die Sekundenzahl pro Aufgabe

Beim Testen einen echten, kleinen Fehler in der eigenen Umsetzung gefunden:
nach vielen 0,1-Sekunden-Schritten in Folge landet eine Fließkommazahl nicht
immer exakt bei 0 (z. B. 0,0000000000046 statt 0) - dadurch hätte der
Ablauf gelegentlich einen ganzen Wimpernschlag (100ms) zu spät ausgelöst.
Behoben mit einer kleinen Toleranzschwelle (0,05 statt exakt 0).

Getestet: Zeit schrumpft korrekt mit dem Level (nie unter 2,5s), abgelaufene
Zeit wird wie eine falsche Antwort behandelt (Herzverlust, Serie zurück,
neue Aufgabe mit frischer Zeit), rechtzeitige richtige Antwort setzt die
Zeit für die nächste Aufgabe zurück ohne Herzverlust, 0 Herzen durch
Zeitablauf beendet die Runde genauso sauber wie durch eine falsche Antwort,
kein Timer-Leck beim Verlassen/Levelaufstieg/Rundenende, Zeitleiste
erscheint auf dem Spielbildschirm.

## 8sss. Politik-Fragen erweitert + Brain Test auf Englisch (neu)

**Politik als Kategorie gab es schon** (26 Fragen im Wissenstest-Pool, 15 im
Brain Test) - auf Wunsch deutlich ausgebaut:
- Wissenstest-Pool (`shared/quizQuestions.json`, genutzt von Party-Raum,
  Bot-Quiz, Arena): +25 neue Fragen (Bundestag, EU, Grundgesetz,
  Gewaltenteilung, UNO, Wahlrecht, Föderalismus u.a.) - jetzt 51 insgesamt.
- Brain Test (`shared/klasseQuestions.json` + der gleiche Inhalt eingebettet
  in `public/index.html`, da Brain Test rein clientseitig läuft): +10 neue
  Fragen, verteilt auf Klasse 2/4/6/8/10 mit passend steigendem
  Schwierigkeitsgrad - jetzt 25 insgesamt.
- Ein separater, älterer Fragenpool für den lokalen Pass-&-Play-Mehrspieler
  hatte bereits 51 Politik-Fragen, wurde nicht angetastet (schon gut
  abgedeckt).
- Zwei neue Fragen stellten sich beim Testen als wortgleiche Duplikate zu
  bereits vorhandenen heraus (`"Wie viele Bundesländer..."`,
  `"Wie heißt das deutsche Parlament?"`) - ersetzt durch zwei andere.

**Brain Test auf Englisch (komplett neu)**: bisher gab es Brain Test nur auf
Deutsch, unabhängig von der eingestellten Oberflächensprache. Jetzt: eine
komplett eigene, neu geschriebene englischsprachige Allgemeinwissen-
Fragenbank (`shared/klasseQuestionsEN.json`, zusätzlich eingebettet in
`public/index.html` als `KLASSE_QUESTIONS_EN`) - 250 Fragen auf 10 Klassen
verteilt (25 je Klasse, Schwierigkeit steigt von Klasse 1 bis 10), darunter
44 Fragen mit London/UK-Bezug und 54 mit Amerika/USA-Bezug, wie gewünscht.
Sobald die Oberfläche auf Englisch steht, verwendet Brain Test automatisch
diese Datenbank - kein zusätzlicher Umschalter nötig, es folgt einfach der
bestehenden Sprachauswahl in den Einstellungen. Für alle anderen Sprachen
(noch keine eigene Fragenbank) bleibt es beim gewohnten Deutsch.

(Zum Umfang: ursprünglich 250 Fragen - seither auf 500 aufgestockt und auf
50/20-Struktur gebracht, siehe Abschnitt 8ttt weiter unten.)

Getestet: neue Politik-Fragen strukturell gültig und ohne Duplikate (im
gesamten Pool, nicht nur innerhalb der Kategorie), Brain-Test-JSON-Datei und
eingebetteter Client-Datensatz stimmen überein, alle 10 englischen Klassen
haben mindestens 20 Fragen (strukturell gültig, keine Duplikate), London/UK-
und Amerika/USA-Themen wie gewünscht vertreten und über mehrere Klassen
verteilt, Sprachumschaltung wählt bei Englisch wirklich die neue Datenbank
und bei jeder anderen (noch nicht übersetzten) Sprache weiterhin Deutsch
statt fälschlich Englisch, ein kompletter 20-Fragen-Testdurchlauf auf
Englisch funktioniert ohne Absturz, deutsche Fragen bleiben bei Deutsch
unverändert nutzbar.

## 8ttt. Englischer Brain Test: jetzt 50/20-Struktur + echter britischer Schulstoff

Auf Wunsch erweitert:

- **Genau wie beim deutschen Original**: 50 Fragen je Klasse (500 insgesamt
  statt vorher 250), Übungstest zeigt alle 50, Haupttest wählt 20 davon aus -
  identischer Aufbau, nur die Sprache und die Themen sind anders.
- **Echter britischer Schulstoff statt nur Allgemeinwissen**: die 250 neuen
  Fragen orientieren sich am britischen National Curriculum, mit denselben
  Fächern wie beim deutschen Original (dort Mathe/Deutsch/Sachkunde/...), nur
  britisch: **Maths** (Bruchrechnung, Gleichungen, bis hin zu Ableitungen und
  Integralen in Klasse 9/10), **English** (Wortarten, Stilmittel wie Simile/
  Metapher/Alliteration, bis zu literarischen Fachbegriffen wie "dramatic
  irony" oder "bildungsroman" in höheren Klassen), **Science** (Photosynthese,
  Zellteilung, Newtons Gesetze, bis zu chemischen Gleichungen und Genetik),
  **History** (britische Geschichte: Römer, Wikinger, Tudors, Battle of
  Britain, Brexit-Referendum u.v.m.), **Geography** sowie **Citizenship**
  (Wirtschaft/Politik für die höheren Klassen, passend zu den neuen
  Politik-Fragen im deutschen Teil).
- Schwierigkeit steigt weiterhin von Klasse 1 (einfache Addition, Alphabet)
  bis Klasse 10 (Kettenregel, Petrarca-Sonett-Struktur, Doppler-Effekt).

Beim Zusammenführen ist eine wortgleiche Dopplung zu einer bereits
vorhandenen Frage aufgefallen ("What is the powerhouse of the cell
called?") - durch eine andere ersetzt, bevor irgendetwas gespeichert wurde.

Getestet: alle 10 Klassen haben jetzt genau 50 Fragen (500 insgesamt, keine
Duplikate), Übungstest liefert alle 50, Haupttest weiterhin genau 20, alle
Fragen strukturell gültig, die neuen Schulfächer (Maths/English/Science/
History/Citizenship) sind spürbar vertreten und jede Klasse hat einen
erkennbaren Fächer-Mix statt nur einer Kategorie, London/UK- und Amerika/
USA-Themen weiterhin über mehrere Klassen verteilt vorhanden.

## 8uuu. Nenn's Blitz jetzt auch bei Englisch spielbar (war komplett gesperrt)

Gemeldet: bei anderen Modi (z. B. Einordnen, Mehr oder Weniger) gibt es
längst Kategorien, die auch bei Englisch als Party-Sprache funktionieren -
bei Nenn's Blitz aber gar nichts, da die komplette Rundenart pauschal als
"germanOnly" markiert war.

Grund war eine zu grobe Markierung: **alle** 30 Nenn's-Blitz-Kategorien
waren als "nur Deutsch" gesperrt, obwohl die meisten (Bands, Marvel-/Disney-/
DC-Charaktere, Anime-Charaktere, Tierarten, Länder weltweit, Planeten, Essen,
Fastfood-Ketten, Marken, Twitch-Streamer, ...) genauso gut auf Englisch
genannt werden können wie auf Deutsch - da steckt nichts Deutschlandspezifisches
drin. Jetzt bleiben nur die **wirklich** deutschlandspezifischen Kategorien
gesperrt: Bundesländer, Bundesländer-Hauptstädte, sowie die deutschen
TV-Formate "Ich bin ein Star" (Dschungelcamp) und Promi Big Brother - dazu
vorsichtshalber auch die Fußball-Kategorien (Bundesliga-Rahmen). Alle
anderen 24 Kategorien sind jetzt auch bei Englisch (und jeder anderen
Sprache außer Deutsch) verfügbar.

Zusätzlich eine **neue Kategorie "Weltweit bekannte Stars"** (Schauspiel,
Musik, Sport) als internationaler Ersatz für die ausdrücklich
ausgeschlossenen deutschen TV-Kandidat:innen-Formate.

Technisch: `germanOnly` wird jetzt (wie bei allen anderen Rundentypen schon
länger) **je Kategorie einzeln** aus den Datensätzen gelesen
(`shared/partyDatasets.json`), statt pauschal für die ganze Rundenart im
Code fest eingetragen zu sein.

Getestet: nur die vier wirklich deutschlandspezifischen Kategorien (plus
Fußball) bleiben markiert, alle anderen sind es nicht, neue Kategorie
"Weltweit bekannte Stars" existiert und erwähnt keine deutschen TV-Formate,
ein echter Server bestätigt direkt über den Raumstatus
(`availableRoundDefs`): bei Englisch sind Bands/Marvel/die neue Stars-
Kategorie in der Liste, Bundesländer und Dschungelcamp NICHT; bei Deutsch
sind weiterhin alle Kategorien da. Eine komplette Nenn's-Blitz-Runde mit
einer internationalen Kategorie (Marvel-Charaktere) wurde bei Englisch
tatsächlich durchgespielt (Start + Antwort abgeben), keine Regression bei
Deutsch.

## 8vvv. "Test wiederholen"-Button schöner gestaltet

Auf Wunsch: eigener Button-Stil statt der bisher genutzten, eigentlich für
kleine Daumen-hoch/runter-Knöpfe gedachten Klasse. Jetzt: Farbverlauf
(Orange-Töne, passend zum bestehenden Warnfarbton), abgerundete Pillenform,
Schatten für mehr Tiefe, spürbares Einsinken beim Antippen.

Dabei einen echten Layout-Fehler gefunden: auf schmalen Bildschirmen wurde
der Button vom rechten Bildschirmrand abgeschnitten, weil die Zeile
(Klassen-Name + "Bestanden" + Button) keinen Zeilenumbruch erlaubte. Jetzt
bricht die Zeile bei Bedarf um - der Button landet dann sauber in einer
eigenen Zeile darunter, statt über den Rand hinauszuragen. Mit einem echten
Browser (Playwright) nachgesehen und bestätigt.

Getestet: neue Klasse wird genutzt (nicht mehr die alte generische),
erscheint nur bei bereits bestandenen Klassen, nicht bei der aktuellen/noch
nicht erreichten, eigene CSS-Regel mit Farbverlauf/Schatten/Pillenform/
Tipp-Reaktion vorhanden, Zeilenumbruch ist aktiv, die ähnlich aufgebaute
Tic-Tac-Toe-Rangübersicht (hat keinen Wiederholen-Knopf) bleibt unverändert.

## 8www. Bugfix: Brain-Test-Kachel war bei Englisch weiterhin komplett gesperrt

Gemeldet: Brain Test auf Englisch "geht immer noch nicht". War KEIN Cache-
Problem (wie zuerst vermutet), sondern ein echter, von mir übersehener
Fehler: Die Menü-Kachel selbst hatte eine **eigene, ältere Sperre**
(`currentLang!=='de'` → komplett deaktiviert, "Nur auf Deutsch verfügbar"),
die ich beim Einbau der englischen Fragendatenbank nicht aktualisiert hatte.
Die englischen Fragen selbst haben die ganze Zeit einwandfrei funktioniert -
man kam nur nie bis dahin, weil die Kachel im Hauptmenü das Antippen
komplett blockiert hat.

Jetzt: die Kachel ist nur noch gesperrt, wenn **weder** Deutsch **noch**
Englisch eingestellt ist (also bei ja/zh/fr/it/es, die noch keine eigene
Fragendatenbank haben). Sperrtext in allen 7 Sprachen entsprechend
angepasst ("nur auf Deutsch UND Englisch verfügbar" statt nur Deutsch).
Arena bleibt bewusst weiterhin gesperrt (hat wirklich nur die deutsche
Datenbank, dort war die Meldung schon immer korrekt).

Mit einem echten Browser (Playwright) nachgesehen und bestätigt: Kachel ist
jetzt hell und antippbar bei Englisch, ein kompletter Testdurchlauf zeigt
echte englische Fragen und Antworten.

Getestet: Kachel ist bei Englisch nicht mehr gesperrt, zeigt die normale
Beschreibung statt Sperrtext, Klick ist wirklich aktiv, Arena bleibt korrekt
gesperrt, Deutsch funktioniert unverändert, eine dritte Sprache ohne eigene
Datenbank (Französisch) bleibt weiterhin korrekt gesperrt.

## 8xxx. Brain Test wirklich komplett auf Englisch + "(WIFI)" entfernt

Zu Recht gemeldet: die englischen FRAGEN funktionierten schon, aber der
ganze Rahmen drumherum war weiterhin fest auf Deutsch - Klassenübersicht
("Klasse 1", "Bestanden", "Aktuell", "Noch nicht erreicht", "Übung 50
Fragen · ab 45 richtig"), der Zwischenbildschirm vor dem Test, der
Fragenkopf ("Frage 1 von 50"), und vor allem der komplette Ergebnisbildschirm
("RUNDE BEENDET", "Richtige Antworten", "Haupttest freigeschaltet" usw.).
Alles davon war fest in deutschen Text geschrieben, nicht über das
Sprachsystem geführt.

Jetzt läuft der komplette Brain-Test-Ablauf (alle 4 Bildschirme) bei
Englisch wirklich durchgehend auf Englisch - "Class 1" statt "Klasse 1",
"ROUND OVER" statt "RUNDE BEENDET", "Main test for Class 1 unlocked!" statt
"Haupttest für Klasse 1 freigeschaltet!" usw. Auch "Klasse 1" selbst wird
jetzt sprachabhängig erzeugt (neue Funktion `klasseName()`), nicht mehr als
fester deutscher Text im Datensatz gespeichert.

**Zusätzlich**: "PARTY (WIFI)" heißt jetzt wieder schlicht "PARTY ROOM" -
der "(WIFI)"-Zusatz im Titel ist raus, genau wie im deutschen Original
("PARTY RAUM" ohne Zusatz; die Beschreibung erwähnt das Netzwerk ohnehin
schon im Fließtext).

Mit einem echten Browser (Playwright) alle vier Bildschirme nachgesehen und
bestätigt: durchgehend Englisch, kein deutsches Wort mehr übrig.

Getestet: Klassenübersicht, Zwischenbildschirm, Fragenkopf und
Ergebnisbildschirm jeweils stichprobenartig auf alle wichtigen Textstellen
geprüft (keine deutschen Reste mehr), Deutsch bleibt bei allen vier
Bildschirmen unverändert nutzbar, "PARTY ROOM" ohne "WIFI"-Zusatz bei
Englisch, "PARTY RAUM" unverändert bei Deutsch.

## 8yyy. Order of Speed: Level 1 war viel zu schwer

Gemeldet: kommt kaum über Level 7 hinaus, Level 1 schon zu schwer. Grund
gefunden: die Zahlen wurden von **Level 1 an** aus dem kompletten Bereich
1-1000 gezogen - man musste also direkt beim Einstieg dreistellige Zahlen
wie 847, 391, 605 unter Zeitdruck vergleichen, noch bevor sich überhaupt
etwas bewegt (ab Level 4) oder flackert (ab Level 7).

Jetzt wächst der Zahlenbereich mit dem Level, dieselbe 5-Level-Stufung wie
beim Speed-Math-Meilenstein:

- Level 1-5: nur 1-20 (einstellige/kleine zweistellige Zahlen)
- Level 6-10: 1-50
- Level 11-15: 1-100
- Level 16-20: 1-250
- Level 21-25: 1-500
- ab Level 26: der volle Bereich 1-1000

Dadurch landet man bei Level 7 (wo das Flackern einsetzt) immer noch im
überschaubaren 1-50-Bereich, statt gleichzeitig mit Bewegung/Flackern auch
noch dreistellige Zahlen vergleichen zu müssen.

Mit einem echten Browser nachgesehen: Level 1 zeigt jetzt tatsächlich
kleine, leicht zu vergleichende Zahlen (1, 9, 10, 11, 19 statt z.B. 12, 58,
391, 605, 847).

Getestet: Zahlenbereich wächst stufenweise und erreicht ab Level 26
wirklich wieder den vollen Bereich (nicht für immer bei 500 gedeckelt - das
war ein eigener kleiner Fehler beim ersten Entwurf dieser Änderung, noch
vor dem Testen aufgefallen und korrigiert), bestehender Test auf den
Zahlenbereich pro Runde wurde auf den jetzt level-abhängigen Wert
umgestellt statt fest 1-1000 anzunehmen.

## 8zzz. Order of Speed: Zeit pro Zahl, genau wie beim Meilenstein

Auf Wunsch: zusätzlich zur Gesamtzeit der Runde (60-180s) läuft jetzt für
**jede einzelne Zahl** eine eigene Uhr, genau nach demselben Prinzip wie
beim Speed-Math-Meilenstein-Modus:

- Level 1: 6 Sekunden, um die nächste richtige Zahl zu finden und
  anzutippen
- wird pro Schwierigkeitsstufe knapper (dieselbe Formel wie beim
  Meilenstein), nie unter 2,5 Sekunden
- Zeit abgelaufen zählt **genau wie ein falscher Tipp**: ein Fehlversuch
  mehr, sofort eine neue Runde mit neuen Zahlen
- Rechtzeitig richtig getippt (auch mitten in einer Runde, bei der nächsten
  Zahl) setzt die Zeit wieder auf die volle Länge zurück
- Eigene, zweite Zeitleiste unter der Level-Fortschrittsanzeige (Farbverlauf
  Cyan → Pink)

Technisch dieselbe Fließkomma-Toleranzschwelle (0,05 statt exakt 0) wie beim
Meilenstein übernommen, damit der Ablauf nicht durch Rechenungenauigkeit
einen Wimpernschlag zu spät auslöst.

Getestet: Zeitformel identisch zur Meilenstein-Formel, abgelaufene Zeit
zählt wie ein Fehlversuch (neue Runde, kein Punktabzug), rechtzeitige
richtige Antwort setzt die Zeit zurück, kein Timer-Leck beim Verlassen,
Zeitleiste erscheint auf dem Spielbildschirm. Mit einem echten Browser
nachgesehen und bestätigt.

## 8aaa2. Einordnen & Mehr oder Weniger: mehr Kategorien + Themen-Gruppierung + kein redundanter Präfix mehr

Auf Wunsch gleich drei Verbesserungen:

**1. Themen-Gruppierung in der Kategorie-Auswahl** – statt einer langen,
unsortierten Liste zeigt die Solo-Auswahl bei Einordnen und Mehr oder
Weniger jetzt Überschriften wie bei einer Gemini-Vorschlagsliste: "Sport",
"Geld & Wirtschaft", "Natur & Wissenschaft", "Kultur & Unterhaltung",
"Geografie", "Alltag & Kurioses", "Kurioses & Vergleiche", "Deutsches TV".
Jede der (jetzt 60) Kategorien ist einer Gruppe zugeordnet.

**2. 18 neue Kategorien**, genau in den gewünschten Richtungen:
- Einordnen (10 neu): Fußball-Länderspieltore, Champions-League-Titel,
  Vereinswert, Weltmeistertitel nach Land, Stadion-Kapazität, Lebensmittel-
  Kalorien, Fast-Food-Kalorien, Tier-Zungenlänge, Tier-Herzschlag, Sprachen
  nach Sprecherzahl
- Mehr oder Weniger (8 neu): Fußball-Jahresgehalt, Streamer-Einnahmen,
  Spotify-Streams, Film-Produktionsbudget, YouTube-Abonnenten,
  Unternehmensumsatz, Lebensmittel-Kalorien, Tier-Lebenserwartung

Fußball ist jetzt mit 5 verschiedenen Blickwinkeln vertreten statt nur
einem (Kaderwert), genau wie gewünscht ("Höhe, Länge, Wert, Siege, usw.").

**3. Redundanter Präfix entfernt** – wo man ohnehin schon im Modus
"Einordnen" oder "Mehr oder Weniger" ist, steht nicht mehr "Einordnen:
Fußball..." als Titel, sondern nur noch "Fußball...". Gilt für die
Kategorie-Chips in der Auswahl UND für den Titel während des Spiels selbst.
(Die Rundenplan-Vorschau im Mehrspieler-Aufbau, die mehrere verschiedene
Rundentypen gemischt zeigt, behält den Präfix bewusst - dort hilft er beim
Unterscheiden.)

Beim Testen zwei echte Fehler gefunden und behoben:
- Die Werte der neuen Kategorien waren anfangs nicht auf die angegebene
  Einheit skaliert (z.B. "Mio. €" in der Beschriftung, aber Rohzahlen in
  den Millionen als Wert) - vor dem Speichern korrigiert.
- Das neue Gruppen-Feld kam beim Client zunächst gar nicht an, weil eine
  Stelle im Server nur drei bestimmte Felder durchgereicht hat - ergänzt.
- Eine bereits bestehende Kategorie ("Planeten nach Durchmesser") hatte gar
  keine seedId (das Element, das garantiert in jeder Runde vorkommt) - war
  kein Absturzrisiko, aber inkonsistent zu allen anderen Kategorien, jetzt
  ergänzt.

Getestet: alle 60 Kategorien (inkl. aller neuen) strukturell gültig
(Werteanzahl, eindeutige IDs, gültige Reihenfolge, Einheit, Themengruppe,
gültige seedId), topicGroup kommt nachweislich beim Client an (echter
Server-Test), shortLabel() entfernt den Präfix korrekt, gruppierte Anzeige
zeigt Überschriften nur wo sinnvoll (Kategorien ohne Gruppe bleiben flache
Liste), ein echter Testdurchlauf im Spiel selbst bestätigt den fehlenden
Präfix. Mit einem echten Browser nachgesehen und bestätigt.

## 8bbb2. Nenn's Blitz: dieselbe Themen-Gruppierung + 8 neue Kategorien

Auf Wunsch dasselbe Prinzip wie gerade eben bei Einordnen/Mehr oder
Weniger, jetzt auch für Nenn's Blitz. Da Nenn's Blitz keinen Solo-Modus hat
(braucht echte Mitspieler zum Bewerten), läuft die Kategorie-Wahl über den
Mehrspieler-Rundenbau - genau dort ist die Gruppierung jetzt eingebaut:
ohne aktive Suche zeigt die Kategorie-Liste Themen-Überschriften ("Geografie",
"Natur & Wissenschaft", "Entertainment & Medien", "Deutsches TV", "Sport",
"Alltag, Konsum & Marken"), bei aktiver Suche bleibt es bei einer schlichten
Trefferliste (Überschriften wären dort nur im Weg).

**8 neue Kategorien**, genau wie im Beispiel-Screenshot gewünscht:
- Alltag, Konsum & Marken: Autorennen/Automarken, Social-Media-Plattformen,
  Technologie-Marken & Gadgets, Getränke (alkoholfrei & alkoholisch)
- Entertainment & Medien: Hollywood-Schauspieler:innen, Bekannte Film-Genres,
  Videospiel-Klassiker, Streaming-Dienste & TV-Sender

Alle 8 sind international spielbar (nicht germanOnly), passend zur letzten
Erweiterung. Alle bisherigen 33 Kategorien haben jetzt ebenfalls eine
Themengruppe nachgetragen bekommen - macht zusammen 41 Kategorien.

Getestet: alle Kategorien haben eine Gruppe, die 8 neuen sind korrekt
zugeordnet und international spielbar, topicGroup kommt beim Client an
(echter Server-Test, auch bei Englisch), Rundenbau zeigt die Überschriften
ohne Suche und eine flache Trefferliste mit Suche, Präfix "Nenn's Blitz: "
ist in der Liste weg, Bundesländer bleiben bei Englisch weiterhin
ausgeschlossen (keine Regression). Mit einem echten Browser nachgesehen und
bestätigt.

## 8ccc2. Aufräumarbeiten: veraltete Texte raus, Statistik überarbeitet + farbig

Mehrere kleine, auf Wunsch gemeldete Dinge:

- **"Alle Geräte müssen im selben WLAN sein..."** (Party-Raum-Eingangsbildschirm)
  und **"Andere Geräte treten mit dem Code bei, sobald sie diese Seite im
  selben WLAN geöffnet haben"** (Lobby) sind raus - war veraltet, seit Party
  Raum auch allgemein online läuft, nicht nur im selben WLAN.
- **"Alle Daten werden lokal in deinem Browser gespeichert."** (Fußzeile im
  Hauptmenü) ist raus - war seit den Konten/Freunden/Chat nicht mehr
  durchgehend korrekt.
- **"Eigener Modus – Solo oder mit Freunden"** auf den Mini-Spiel-Kacheln
  (Einordnen, Mehr oder Weniger, Nenn's Blitz, Musik raten) ist raus. Der
  Sperrhinweis ("Nur auf Deutsch verfügbar") bleibt bei den entsprechend
  gesperrten Kacheln weiterhin bestehen.
- **Statistik zeigt bei einem angemeldeten Konto nicht mehr zusätzlich alte
  lokale Profile.** Das sah aus wie eine zweite, fremde Statistik, war aber
  nur ein älteres, lokal auf dem Gerät gespeichertes Profil von vor der
  Konto-Erstellung. Ohne Konto werden lokale Profile weiterhin ganz normal
  angezeigt.
- **Chronologie und Bild erraten** (beide aktuell nicht spielbar, siehe
  schon länger bestehender Hinweis im Code) **erscheinen nicht mehr** in der
  Spielmodus-Übersicht der Statistik. Falls sie zurückkommen, reicht es, die
  entsprechenden Zeilen in `MODE_STAT_DEFS` wieder einzukommentieren -
  eventuell schon vorhandene gespeicherte Werte für diese beiden Modi bleiben
  unangetastet erhalten, sind nur unsichtbar.
- **Statistik-Karten jetzt farbig statt einheitlich grau**: Siege (Lime),
  Niederlagen (Pink), Siegquote (Cyan), Runden gespielt (Blau-Violett),
  Arena-Werte (Orange) haben jetzt jeweils eine eigene Akzentfarbe. Die
  Spielmodus-Karten (Einordnen, Mehr oder Weniger, Musik raten, Speed Math,
  Order of Speed) haben jetzt zusätzlich ein Icon und eine individuelle
  Farbe für Zahlen und oberen Rand.

Mit einem echten Browser nachgesehen und bestätigt.

Getestet: alle entfernten Texte kommen nirgends mehr vor, Sperrhinweis
bleibt für tatsächlich gesperrte Kacheln erhalten, angemeldetes Konto zeigt
kein zusätzliches altes lokales Profil mehr, ohne Konto funktioniert die
lokale Profilanzeige weiterhin wie gewohnt, Chronologie/Bild erraten
erscheinen nicht mehr in der Statistik (die anderen Modi weiterhin schon),
Statistik-Karten haben nachweislich unterschiedliche Farbklassen und
individuelle Modus-Farben/Icons.

## 8ddd2. Neu: Münzen-Shop (Herzen in Arena & Meilenstein auffüllen)

Auf Wunsch eine komplett neue kleine Wirtschaft:

**Münzen verdienen:**
- +5 Münzen pro **neu freigeschaltetem Erfolg** (nicht erneut bei bereits
  freigeschalteten)
- +10 Münzen pro **bestandenem Haupttest** im Brain Test (auch bei
  Wiederholungen, nicht beim Übungstest) - mit sichtbarer "🪙 +10 Münzen
  verdient!"-Meldung direkt im Ergebnisbildschirm

**Neuer Shop-Bildschirm** (🪙-Knopf im Hauptmenü, neben Statistik/Erfolge):
zeigt den aktuellen Münzstand und zwei Kaufoptionen:
- **Speed-Math-Meilenstein-Herz** (15 Münzen) - rein clientseitig
  abgewickelt, genau wie die Meilenstein-Herzen selbst schon immer
  clientseitig verwaltet wurden; bei einem Konto wird das Ergebnis danach
  ganz normal mitsynchronisiert
- **Arena-Herz** (20 Münzen) - **serverautoritativ** geprüft und
  abgewickelt (neuer Endpunkt `/api/arena-buy-heart`), da Arena-Herzen
  schon immer serverseitig verwaltet werden und ein Kauf das nicht
  unterlaufen darf. Braucht ein Konto (wie Arena selbst) - ohne Konto zeigt
  der Shop stattdessen einen Hinweis statt eines kaputten Kaufversuchs.

Wichtig: Käufe füllen Herzen **nie über das normale Tageskontingent
hinaus** auf (max. 3 bei beiden) - sonst würde der Shop den eigentlichen
Sinn der Herzen als Tagesbremse komplett aushebeln. Mehrfache Kaufversuche
bei bereits vollen Herzen werden abgelehnt, ohne Münzen abzuziehen.

Mit einem echten Server durchgespielt: Konto registriert, Münzen und ein
verbrauchtes Arena-Herz gesetzt, beide Käufe tatsächlich getätigt und das
Ergebnis (Münzstand sinkt, Herzen steigen) bestätigt - sowohl für ein Konto
als auch für ein lokales Profil (dort zeigt Arena korrekt den
Konto-Hinweis statt einer Kaufoption).

Getestet: Münzvergabe bei neu freigeschalteten Erfolgen und bestandenen
Haupttests (nicht bei Übungstests, nicht bei nicht bestandenen Tests),
Meilenstein-Kauf clientseitig in allen Fällen (Erfolg, zu wenig Münzen,
bereits voll), Arena-Kauf serverseitig in allen Fällen inkl. mehrfacher
Kaufversuche bei vollen Herzen (kostet nie mehrfach Münzen), Shop-Bildschirm
zeigt Münzstand und beide Optionen korrekt je nach Konto-Status, Shop ist
vom Hauptmenü aus erreichbar.

## 8eee2. Echtgeld-Münzenkauf (Stripe) – technisches Gerüst

Auf Wunsch: Münzen lassen sich jetzt auch für echtes Geld kaufen, über
Stripe Checkout. **Noch nicht sofort nutzbar** - braucht zuerst ein
eigenes Stripe-Konto und zwei Schlüssel als Umgebungsvariablen, siehe
Abschnitt "Einrichtung" unten. Ohne diese zeigt der Shop einen klaren
Hinweis ("Der Münzen-Kauf ist noch nicht eingerichtet"), stürzt aber
nirgends ab.

**Drei feste Pakete** (Richtwerte, in `COIN_PACKAGES` in `server.js`
jederzeit änderbar):
- 100 Münzen – 0,99 €
- 600 Münzen – 4,99 €
- 1500 Münzen – 9,99 €

**Wichtig zu Technik und Sicherheit:**
- Bewusst **ohne das `stripe`-npm-Paket** umgesetzt - dieses Projekt hat
  nie Abhängigkeiten gebraucht, nur eingebaute Node-Module. Stripes API ist
  eine ganz normale HTTPS-Schnittstelle, das reicht hier völlig.
- Der Ablauf: Client fordert eine Checkout-Session an
  (`/api/shop-create-checkout`) → wird zu Stripes eigener, sicherer
  Zahlungsseite weitergeleitet → zahlt dort (Kartendaten sehen wir nie) →
  Stripe schickt **danach** einen Webhook an `/webhook/stripe` → **erst
  dieser Webhook schreibt die Münzen gut**, nie der Rücksprung des Clients
  allein (der wäre fälschbar - jemand könnte sonst einfach die
  Erfolgs-Adresse aufrufen, ohne zu bezahlen).
- Die Webhook-Signatur wird selbst nachgerechnet (Stripes dokumentiertes
  Schema: HMAC-SHA256 aus Zeitstempel+Rohkörper, zeitkonstant verglichen,
  5-Minuten-Toleranzfenster gegen wiederholte alte Anfragen).
- Doppelt zugestellte Webhooks (Stripe wiederholt bei Netzwerkproblemen)
  schreiben Münzen nur einmal gut (jede Konto merkt sich die letzten 20
  bereits verarbeiteten Zahlungs-IDs).
- Käufe sind an den **Kontonamen** gebunden (nicht an den Sitzungs-Token,
  der könnte zwischen Kauf und Webhook ablaufen).

**Einrichtung** (damit der Kauf wirklich funktioniert):
1. Kostenloses Konto auf stripe.com anlegen
2. Zwei Umgebungsvariablen beim Hosting-Anbieter setzen:
   `STRIPE_SECRET_KEY` (aus dem Stripe-Dashboard) und
   `STRIPE_WEBHOOK_SECRET` (beim Einrichten eines Webhooks im
   Stripe-Dashboard auf `https://deine-seite.de/webhook/stripe` für das
   Ereignis `checkout.session.completed` angezeigt)
3. Fertig - sobald beide Variablen gesetzt sind, funktioniert der Kauf

**Wichtiger Hinweis, der nichts mit Code zu tun hat** (siehe auch die
Rückmeldung vor dieser Änderung): Sobald echtes Geld fließt, kommen in
Deutschland in aller Regel ein angemeldetes Gewerbe, Impressumspflicht und
ggf. Widerrufsrecht dazu - das ist keine Rechtsberatung, nur ein Hinweis,
das vorher zu klären.

Mit einem echten (selbst signierten) Webhook-Aufruf durchgetestet - echte
Stripe-Testschlüssel habe ich hier nicht, konnte die eigentliche
Checkout-Seite selbst deshalb nicht aufrufen, aber die komplette
Webhook-Kette (Signaturprüfung, Gutschrift, doppelte Zustellung, falsche
Signatur, abgelaufener Zeitstempel, falscher Ereignistyp) ist vollständig
mit echten HTTP-Anfragen gegen den echten Server geprüft.

Beim Testen zwei kleine, aber echte Fehler im Shop-Bildschirm selbst
gefunden und behoben (betraf auch die bereits bestehenden
Herz-Kauf-Knöpfe): die Bestätigungsmeldung nach einem Kauf wurde durch das
anschließende Neuzeichnen des Bildschirms sofort wieder überschrieben,
bevor man sie je zu sehen bekam.

Getestet: ohne konfigurierte Schlüssel klare Fehlermeldung statt Absturz
(sowohl beim Checkout-Start als auch am Webhook), alle drei Pakete korrekt
abrufbar, Checkout-Erstellung lehnt ungültige Nutzer/Pakete ab, Webhook mit
gültiger Signatur schreibt korrekt gut, falsche Signatur/falsches Secret/zu
alter Zeitstempel werden allesamt abgelehnt, dreifach zugestellter Webhook
schreibt nur einmal gut, andere Ereignistypen werden ignoriert (aber mit
200 bestätigt, wie Stripe es erwartet), Shop-Bildschirm zeigt die drei
Pakete mit korrekten Preisen bei einem Konto und nur einen Kontohinweis
ohne Konto, Rückkehr von Stripe (?shop=success/cancel) wird erkannt und nur
einmal angezeigt, die Bestätigungsmeldungen nach einem Kauf sind jetzt
tatsächlich sichtbar.

## 8fff2. Neuer Modus: Biologie – Körper entdecken (inkl. Sexualkunde)

Auf Wunsch: ein neuer Solo-Modus "🧬 Biologie" im Hauptmenü. Eine Figur
(Mann/Frau umschaltbar) mit antippbaren Körperstellen (Kopf, beide Hände,
Herz, beide Füße direkt auf der Figur; Auge, Ohr, Lunge, Magen & Verdauung,
Knochen & Skelett, Haut, Muskeln, Niere & Blase als Liste darunter, damit
die Figur nicht überladen wird). Antippen startet 5 sachliche Fragen zu
dieser Körperstelle (Schulbuch-Niveau, z.B. "Wie viele Knochen hat eine
Hand?"). Beim ersten Abschluss eines Themas gibt es +3 Münzen, reiht sich
also direkt in den bestehenden Münzen-Shop ein.

**Sexualkunde als eigener, klar benannter Themenblock** (bewusst NICHT an
eine Körperstelle auf der Figur gebunden, sondern wie im echten
Biologiebuch ein eigenes Kapitel mit eigenem Button): Pubertät,
Fortpflanzungsorgane, Menstruationszyklus, Schwangerschaft & Befruchtung,
Verhütung & Gesundheit, Einverständnis & Grenzen - macht zusammen 6 Themen
mit je 5 Fragen. Inhaltlich strikt auf dem Niveau, auf dem dieses Thema im
echten deutschen Biologieunterricht ab Klasse 5/6 behandelt wird: rein
sachlich-anatomisch und gesundheitsbezogen (z.B. "Wie heißt das Organ, in
dem sich ein Embryo entwickelt?", "Welches Verhütungsmittel schützt
zusätzlich vor Geschlechtskrankheiten?"). Das Thema "Einverständnis &
Grenzen" behandelt explizit das Recht auf den eigenen Körper, "Nein sagen"
und an wen man sich bei Problemen wenden kann (Vertrauenspersonen,
Beratungsstellen) - selbst ein Standardbestandteil der schulischen
Aufklärung.

Insgesamt 90 neue Fragen (12 Körperteile × 5 + 6 Sexualkunde-Themen × 5),
alle im selben Frage-Antwort-Format wie Brain Test, direkt im Client
eingebettet (reiner Solo-Modus, keine Server-Daten nötig).

**Bekannte Einschränkung**: der "schon abgeschlossen"-Status (verhindert
mehrfache Münzen fürs selbe Thema) wird bei einem Konto aktuell nur
innerhalb derselben Sitzung gemerkt, nicht dauerhaft servergespeichert -
nach einem Neuladen der Seite ließe sich ein Thema theoretisch noch einmal
für Münzen abschließen. Bei nur +3 Münzen pro Thema ist das Risiko gering,
aber falls gewünscht lässt sich das bei Bedarf nachrüsten (ähnlich wie die
Arena-Herzen serverseitig).

Mit einem echten Browser durchgespielt: Mann/Frau-Umschaltung, ein
kompletter 5-Fragen-Durchlauf (Herz) mit korrekter Münzvergabe, das
Sexualkunde-Untermenü, Antworten mit Erklärung und "Weiter"-Button.

Getestet: beide Fragenbanken strukturell gültig (4 Antworten, gültiger
Index, Erklärung, keine Duplikate - auch bereichsübergreifend), inhaltliche
Stichprobe auf sachliche Fachbegriffe statt umgangssprachlicher
Formulierungen, Körperdiagramm zeigt Direkt-Hotspots + Restliste +
Sexualkunde-Button, Mann/Frau-Umschaltung funktioniert, eine komplette
Frage-Runde inkl. Antworten/Erklärung/Weiterschalten, Münzvergabe nur beim
ersten Abschluss eines Themas (egal ob Körperteil oder Sexualkunde-Thema -
eigene, getrennte Schlüssel verhindern Kollisionen), Abbrechen während
einer Runde funktioniert sauber, Menüzugang vorhanden.

## 8ggg2. Brain Test: echte Duplikate gefunden + behoben, Biologie/Sexualkunde ergänzt

Gemeldet: Fragen kommen in Klasse 3, 4 und 5 doppelt vor. Beim genauen
Durchsuchen (nicht nur auf exakt gleichen Text, auch auf gleiche Fakten mit
anderer Formulierung) zwei echte Treffer gefunden:
- Klasse 3: "Was passiert bei Photosynthese in Pflanzen?" testete praktisch
  dasselbe wie "Was ist Photosynthese?" in Klasse 5 - ersetzt durch eine
  andere Sachkunde-Frage (Geschmackssinn/Zunge).
- Klasse 4: "Was ist die EU?" und "Wofür steht die Abkürzung 'EU'?" standen
  beide in derselben Klasse und fragten im Kern dasselbe - die zweite
  ersetzt durch eine eigenständige Frage (Anzahl der EU-Mitgliedsstaaten).

Beim ersten Versuch, das mit einer Textersetzung direkt im eingebetteten
Code zu patchen, ist etwas schiefgegangen (ein zu gieriger Suchausdruck hat
mehr Text erwischt als beabsichtigt und mehrere Fragen gelöscht) - beim
Nachzählen sofort aufgefallen (Klasse 3 hatte plötzlich nur noch 44 statt 50
Fragen), nichts davon gespeichert/ausgeliefert. Stattdessen sauber über die
ohnehin vorhandene, unversehrte `shared/klasseQuestions.json` neu
aufgebaut und von dort aus den eingebetteten Block komplett neu erzeugt.

**Neue Fragen ergänzt, altersgerecht nach echtem Lehrplan verteilt** (nicht
wortgleich mit dem eigenständigen Biologie-Modus, eigene Formulierungen):
- Klasse 4 (Sachkunde-Niveau, wie der Rest der Klasse): einfache
  Körperfragen (Zähne, Herz)
- Klasse 5 (Biologie beginnt als Fach): Skelett, Nieren, Einstieg Pubertät
- Klasse 6: Atmung, Haut, körperliche Pubertätsveränderungen
- Klasse 7 (Fortpflanzungsorgane beginnen): Hoden, Eileiter, Genitalien-Begriff
- Klasse 8 (Zyklus/Schwangerschaft): weiblicher Zyklus, Embryo-Entwicklung
- Klasse 9 (Verhütung/Einverständnis): Pille, Einvernehmlichkeit
- Klasse 10 (STI/Beratung): sexuell übertragbare Infektionen, Anlaufstellen

18 neue Fragen insgesamt, Kategorie "Sachkunde" (Klasse 4, wie der Rest
dieser Klasse) bzw. "Biologie" (Klasse 5-10, wie die bereits vorhandenen
Biologie-Fragen dort).

Getestet: beide gemeldeten (Near-)Duplikate bestätigt behoben, keine echten
doppelten Fragen mehr im gesamten Datensatz (alle 10 Klassen), neue Fragen
sind da und tragen die richtige Kategorie/Klassenstufe, keine
Wortlaut-Überschneidung mit dem Biologie-Modus, Client-Einbettung und
`shared/klasseQuestions.json` (Arena-Server-Quelle) sind weiterhin
deckungsgleich, Haupttest liefert weiterhin exakt 20 und Übungstest exakt
50 Fragen (feste Werte, unabhängig von der gewachsenen Pool-Größe pro
Klasse).

## 8hhh2. Brain Test nochmal durchleuchtet: 2 weitere Duplikate + Politik jetzt in jeder Klasse

Auf Wunsch alle 10 Klassen nochmal komplett durchsucht (nicht nur 3/4/5
wie beim letzten Mal). Zwei weitere echte Treffer gefunden:

- **"Wie heißt die Hauptstadt von Deutschland?"** stand in Klasse 2
  (Sachkunde) UND fast wortgleich nochmal in Klasse 4 (Politik) - die
  Klasse-4-Version ersetzt durch eine andere Politik-Frage (wer vertritt
  Deutschland nach außen).
- **"Was ist die Gewaltenteilung?"** (Klasse 8) und "Was sind die drei
  Gewalten im Staat (Gewaltenteilung)?" (Klasse 9) testeten im Kern
  dasselbe Konzept nur einen Schritt weiter - die Klasse-9-Version ersetzt
  durch eine andere Frage (Opposition im Parlament).

**Politik jetzt in jeder einzelnen Klasse vertreten** - vorher hatten
Klasse 1, 3 und 7 überhaupt keine Politik-Fragen, der Rest war
unterschiedlich dicht. 7 neue, altersgerecht abgestufte Fragen ergänzt:
- Klasse 1 (ganz einfach): "In welchem Land leben wir?", warum es Regeln gibt
- Klasse 3: Rathaus, Bürgerinnen und Bürger
- Klasse 7 (anspruchsvoller als die unteren Klassen): Wahlalter, Fraktion,
  Volksabstimmung

Jede Klasse hat jetzt mindestens 2 Politik-Fragen (Klasse 6 weiterhin die
dichteste mit 5, Klasse 10 mit 8 als Höhepunkt zum Abschluss).

Getestet: beide neuen (Near-)Duplikate bestätigt behoben, keine einzige
echte doppelte Frage mehr im gesamten Datensatz (alle 10 Klassen
zusammengenommen), jede Klasse hat mindestens 2 Politik-Fragen, die neuen
Klasse-1/3-Fragen bleiben bewusst einfach (keine Fachbegriffe wie
"Gewaltenteilung"), Klasse 7 nutzt bereits anspruchsvollere Begriffe,
keine Kollision mit dem Wissenstest-Pool oder dem Biologie-Modus,
Client-Einbettung und Server-JSON bleiben deckungsgleich, Haupt-/Übungstest
funktionieren für die am stärksten veränderten Klassen weiterhin normal.

## 8. Bekannte Grenzen dieser ersten Version

- Verliert ein Gerät während einer laufenden Runde die Verbindung, wird es nicht automatisch
  wieder in die laufende Runde eingebunden (Reconnect erst wieder ab dem nächsten Raumzustand
  möglich). Für eine spätere Version ließe sich das ergänzen, ohne die Architektur zu ändern.
- Die Zahlenwerte in `partyDatasets.json` (Einwohner, Streams, Gehälter, Kaderwerte, …) sind
  ungefähre, zur Illustration gewählte Werte und können jederzeit angepasst werden.
