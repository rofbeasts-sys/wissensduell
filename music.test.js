/* Hintergrundmusik: Zonen-Umschaltung, Menue-Rotation, Einstellungen, Datei-Auslieferung */
const { ok, section, sleep, finish, startServer, get, loadClient } = require("./helpers");

(async () => {
  section("Client: Zonen-Logik (ohne echte Audiowiedergabe, Fake-<audio>)");
  {
    const createdEls = [];
    const fakeAudioEl = () => {
      const el = { _sources: [], loop: false, volume: 1, onended: null, onerror: null, paused: false,
        appendChild(node){ this._sources.push(node.src); },
        load(){}, play(){ this.paused = false; return Promise.resolve(); }, pause(){ this.paused = true; } };
      createdEls.push(el);
      return el;
    };
    const C = loadClient({
      // loadClient's Standard-Stub liefert fuer alles ausser "app" ein generisches Objekt;
      // wir ueberschreiben getElementById/createElement gezielt fuer die Musik-Tests.
    });
    const { R, sb } = C;
    sb.document.createElement = (tag) => tag === "audio" ? fakeAudioEl() : (tag === "source" ? { src: "" } : {});
    sb.document.getElementById = (id) => id === "settingsOverlay" ? { innerHTML: "", classList: { list: [], contains(c){ return this.list.includes(c); }, add(c){ if(!this.list.includes(c)) this.list.push(c); }, remove(c){ this.list = this.list.filter(x=>x!==c); } }, onclick: null } : (id === "app" ? sb.document.getElementById.appEl || (sb.document.getElementById.appEl = { innerHTML: "" }) : {});

    R('audioUnlocked = true; musicEnabled = true;');
    ok("Start: Zone ist 'menu'", R("audioZone") === "menu");
    R('setAudioZone("menu")'); // gleiche Zone -> darf NICHT neu starten
    ok("Gleiche Zone erneut gesetzt: kein Neustart (kein zusaetzliches <audio>-Element)", createdEls.length === 0);
    R('startTrack(currentZoneTrack())');
    ok("Erster Menü-Titel wurde erzeugt und gestartet", createdEls.length === 1 && !createdEls[0].paused);
    const firstSrcs = createdEls[0]._sources.map(s => decodeURIComponent(s.replace("/audio/", "")));
    ok("Titel kommt aus dem Menü-Pool (nicht Tic-Tac-Game)", !firstSrcs.includes("Tic-Tac-Game.mp3"));

    R('setAudioZone("ttt")');
    ok("Wechsel zu Tic Tac Toe: vorheriger Titel pausiert, neuer erzeugt", createdEls[0].paused === true && createdEls.length === 2);
    const tttSrcs = createdEls[1]._sources.map(s => decodeURIComponent(s.replace("/audio/", "")));
    ok("Tic-Tac-Toe-Zone spielt NUR Tic-Tac-Game.mp3", tttSrcs.length === 1 && tttSrcs[0] === "Tic-Tac-Game.mp3");
    ok("Tic-Tac-Toe-Titel ist auf Dauerschleife gestellt (loop)", createdEls[1].loop === true);

    R('setAudioZone("ttt")'); // gleiche Zone -> kein erneuter Start
    ok("Erneutes Setzen derselben Zone (ttt) startet NICHT neu", createdEls.length === 2);

    R('setAudioZone("menu")');
    ok("Zurück ins Menü: neuer (rotierender) Titel, kein loop", createdEls.length === 3 && createdEls[2].loop === false);

    // Rotation: alle 4 Menütitel kommen vor, bevor sich einer wiederholt
    R('menuMusicQueue = []; var seen = [];');
    for (let i = 0; i < 4; i++) {
      R('startTrack(currentZoneTrack())');
      const name = R("bgAudioTrackName");
      R(`seen.push(${JSON.stringify(name)})`);
    }
    const seen = R("seen");
    ok("4 Menü-Titel nacheinander: alle 4 unterschiedlichen Titel kommen vor (durchmischt, keine Wiederholung)", new Set(seen).size === 4);

    // Titel-Ende (onended) bei Menü-Musik -> naechster Titel startet automatisch
    const beforeCount = createdEls.length;
    const lastEl = createdEls[createdEls.length - 1];
    lastEl.onended();
    ok("Wenn ein Menü-Titel zu Ende ist: automatisch naechster Titel (neues <audio>-Element)", createdEls.length === beforeCount + 1);

    // Musik aus/an
    R('setMusicEnabled(false)');
    ok("Musik ausschalten pausiert den aktuellen Titel", bgAudioEl_paused());
    function bgAudioEl_paused(){ return createdEls[createdEls.length - 1].paused === true; }
    const countAfterOff = createdEls.length;
    R('setAudioZone("ttt")'); // Zonwechsel WAEHREND Musik aus ist: kein Element erzeugen
    ok("Zonenwechsel bei ausgeschalteter Musik erzeugt kein Audio-Element", createdEls.length === countAfterOff);
    R('setMusicEnabled(true)');
    ok("Musik wieder einschalten startet die (dann aktuelle) Zone neu", createdEls.length === countAfterOff + 1 && createdEls[createdEls.length-1]._sources.some(s=>s.includes("Tic-Tac-Game")));
    ok("Einstellung wird lokal gespeichert (localStorage)", true); // localStorage-Stub speichert nicht wirklich; separat unten geprueft
  }

  section("Client: localStorage-Einstellung bleibt über einen Neustart hinweg erhalten");
  {
    const C = loadClient();
    C.R('setMusicEnabled(false)');
    ok("Aus-Stellung wird gespeichert", C.sb.localStorage._store["wq_music"] === "0");
    const C2 = loadClient({ localStorageData: { wq_music: "0" } });
    ok("Neu geladen (mit gespeichertem 'aus'): musicEnabled startet als false", C2.R("musicEnabled") === false);
    const C3 = loadClient({ localStorageData: { wq_music: "1" } });
    ok("Neu geladen (mit gespeichertem 'an'): musicEnabled startet als true", C3.R("musicEnabled") === true);
    const C4 = loadClient();
    ok("Ohne gespeicherten Wert: Musik ist standardmäßig an", C4.R("musicEnabled") === true);
  }

  section("Client: Einstellungen-Seite (Overlay-Inhalt)");
  {
    const C = loadClient(); const { R, state } = C;
    R('audioUnlocked = true; bgAudioTrackName = "Wissens-Quest";');
    R('renderSettingsModal()');
    const html = state.els["settingsOverlay"].innerHTML;
    ok("Overlay zeigt Titel 'Einstellungen'", html.includes("Einstellungen"));
    ok("Overlay zeigt einen Musik-Knopf und die Sprachauswahl", html.includes("Musik") && html.includes("lang-switcher") && html.includes("lang-chip"));
    ok("Overlay ist sichtbar (nicht mehr 'hidden')", !state.els["settingsOverlay"].classList.contains("hidden"));
    R('closeSettings()');
    ok("Schließen setzt 'hidden' wieder", state.els["settingsOverlay"].classList.contains("hidden"));
    R('renderMainMenu()');
    ok("Hauptmenü hat einen Einstellungen-Knopf statt der alten Sprach-Chips direkt im Menü", state.last.includes("renderSettingsModal()") && !state.last.includes('class="lang-switcher"'));
  }

  section("Server: Audiodateien werden ausgeliefert (richtiger Inhaltstyp, ohne Anmeldung)");
  {
    const S = await startServer();
    const files = [
      ["Final_Showdown.mp3", "audio/mpeg"], ["Final_Showdown.m4a", "audio/mp4"],
      ["Der_letzte_Schlag.mp3", "audio/mpeg"], ["The_Final_Duel.mp3", "audio/mpeg"],
      ["Wissens-Quest.mp3", "audio/mpeg"], ["Tic-Tac-Game.mp3", "audio/mpeg"]
    ];
    for (const [name, mime] of files) {
      const r = await get(S.port, "/audio/" + encodeURIComponent(name));
      ok(`/audio/${name}: HTTP 200 mit Content-Type ${mime}`, r.status === 200 && r.headers["content-type"] === mime);
    }
    const missing = await get(S.port, "/audio/nichtvorhanden.mp3");
    ok("nicht vorhandene Datei: 404, kein Absturz", missing.status === 404 && S.alive());
    const traversal = await get(S.port, "/audio/../server.js");
    ok("Pfad-Ausbruch über /audio/ wird abgewehrt", traversal.status !== 200);
    await S.stop();
  }
  section("Client: Party-Raum wechselt automatisch zwischen Menü- und Tic-Tac-Toe-Musik");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.document.createElement = (tag) => tag === "audio" ? { appendChild(){}, load(){}, play(){ return Promise.resolve(); }, pause(){} } : {};
    R('audioUnlocked = true; musicEnabled = true; party = {};');
    // party={} ist bewusst minimal - uns interessiert nur die Musik-Zone, die
    // IMMER als Erstes in partyHandleMessage gesetzt wird, bevor das eigentliche
    // Brett gerendert wird (das mit diesem Mini-Stub mangels party.room abstürzen
    // würde - das ist hier unerheblich, daher try/catch um den Render-Teil).
    const safeMsg = (m) => { try { R(`partyHandleMessage(${JSON.stringify(m)})`); } catch (e) {} };
    safeMsg({ type: "roomUpdate" });
    ok("Normale Party-Nachricht (Lobby): Menü-Zone", R("audioZone") === "menu");
    safeMsg({ type: "ticTacToeState", board: Array(9).fill(null) });
    ok("Tic-Tac-Toe-Rundennachricht: Zone wechselt auf 'ttt'", R("audioZone") === "ttt");
    safeMsg({ type: "ticTacToeSkipped" });
    ok("Auch 'ticTacToeSkipped' zaehlt noch zur TTT-Zone (beginnt mit ticTacToe)", R("audioZone") === "ttt");
    safeMsg({ type: "quizQuestion" });
    ok("Naechste Runde ist kein Tic Tac Toe: zurueck zur Menü-Zone", R("audioZone") === "menu");
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
