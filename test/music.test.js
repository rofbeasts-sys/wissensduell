/* Hintergrundmusik: Zonen-Umschaltung, Menue-Rotation, Einstellungen, Datei-Auslieferung */
const { ok, section, sleep, finish, startServer, get, post, loadClient, fs } = require("./helpers");

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

  section("Kein eigener Start-Bildschirm mehr: direkt das Hauptmenü, Musik startet beim ersten Tipp irgendwo");
  {
    const C = loadClient(); const { R, state, sb } = C;
    let played = false;
    sb.document.createElement = (tag) => tag === "audio" ? { appendChild(){}, load(){}, play(){ played = true; return Promise.resolve(); }, pause(){} } : {};
    R('renderMainMenu()');
    ok("Direkt das Hauptmenü, kein separater Start-/Play-Bildschirm dazwischen", state.last.includes("menu-grid"));
    ok("Vor dem ersten Tipp läuft noch keine Musik (Browser blockt das ohnehin)", !played);
    R('unlockAudioOnce()'); // simuliert den allerersten Tipp irgendwo auf der Seite
    ok("Der erste Tipp irgendwo (nicht auf einen extra Knopf) startet die Musik von selbst", played);
  }

  section("Lautstärkeregler");
  {
    const C = loadClient({ localStorageData: { wq_volume: "70" } }); const { R, state, sb } = C;
    ok("Gespeicherte Lautstärke (70) wird beim Start übernommen", R("musicVolume") === 70);
    const C2 = loadClient();
    ok("Ohne gespeicherten Wert: Standard-Lautstärke 45", C2.R("musicVolume") === 45);
    let createdVol = null;
    sb.document.createElement = (tag) => tag === "audio" ? { appendChild(){}, load(){}, volume: 1, play(){ return Promise.resolve(); }, pause(){} } : {};
    R('audioUnlocked = true; musicEnabled = true; startTrack(currentZoneTrack());');
    ok("Neu gestarteter Titel bekommt die gespeicherte Lautstärke (0,70)", R("bgAudioEl.volume") === 0.7);
    R('setMusicVolume(20)');
    ok("Regler ändert die Lautstärke des LAUFENDEN Titels sofort (kein Neustart nötig)", R("bgAudioEl.volume") === 0.2 && R("bgAudioTrackName") !== null);
    ok("Wert wird gespeichert", C.sb.localStorage._store["wq_volume"] === "20");
    R('setMusicVolume(150)'); ok("Werte über 100 werden auf 100 gedeckelt", R("musicVolume") === 100);
    R('setMusicVolume(-5)'); ok("Negative Werte werden auf 0 gedeckelt", R("musicVolume") === 0);
    R('setMusicVolume("abc")'); ok("Ungültige Eingabe wird zu 0 (kein Crash)", R("musicVolume") === 0);
    R('renderSettingsModal()');
    ok("Regler erscheint im Einstellungen-Fenster mit dem aktuellen Wert", state.els["settingsOverlay"].innerHTML.includes('type="range"') && state.els["settingsOverlay"].innerHTML.includes("0%"));
    R('setMusicEnabled(false); renderSettingsModal();');
    ok("Bei ausgeschalteter Musik ist der Regler deaktiviert", state.els["settingsOverlay"].innerHTML.includes("disabled"));
  }

  section("Server: Titelliste wird live aus public/audio gelesen (neue Dateien automatisch erkannt)");
  {
    const os = require("os"), path = require("path");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-test-"));
    ["Final_Showdown.mp3", "Final_Showdown.m4a", "Der_letzte_Schlag.mp3", "The_Final_Duel.mp3", "Wissens-Quest.mp3", "Tic-Tac-Game.mp3"].forEach(f => fs.writeFileSync(path.join(dir, f), "x"));
    const S = await startServer({ AUDIO_DIR: dir });
    let r = await post(S.port, "/api/audio-tracks", {});
    ok("Ausgangszustand (wie im echten Projekt): 4 Menü-Titel erkannt", r.menu.length === 4);
    ok("'Final Showdown' aus .mp3+.m4a zu EINEM Titel mit 2 Quellen zusammengeführt", !!r.menu.find(t => t.name === "Final Showdown" && t.files.length === 2));
    ok("Tic-Tac-Game läuft NICHT im Menü-Pool mit", !r.menu.some(t => t.files.some(f => f.toLowerCase().includes("tic-tac-game"))));
    ok("Tic-Tac-Game korrekt als eigener (einziger) Titel erkannt", r.ttt && r.ttt.files.includes("Tic-Tac-Game.mp3"));
    ok("Anzeigename ohne Unterstriche ('Der letzte Schlag' statt 'Der_letzte_Schlag')", !!r.menu.find(t => t.name === "Der letzte Schlag"));

    fs.writeFileSync(path.join(dir, "Mein_Neuer_Song.mp3"), "x");
    r = await post(S.port, "/api/audio-tracks", {});
    ok("Neu hochgeladene Datei erscheint SOFORT (kein Neustart, keine Code-Änderung nötig)", r.menu.length === 5 && r.menu.some(t => t.name === "Mein Neuer Song"));

    fs.writeFileSync(path.join(dir, "notizen.txt"), "x");
    r = await post(S.port, "/api/audio-tracks", {});
    ok("Nicht-Audio-Datei (.txt) wird ignoriert", r.menu.length === 5);

    fs.unlinkSync(path.join(dir, "Mein_Neuer_Song.mp3"));
    r = await post(S.port, "/api/audio-tracks", {});
    ok("Wieder gelöschte Datei verschwindet auch wieder aus der Liste", r.menu.length === 4);

    fs.writeFileSync(path.join(dir, "tic_tac_game.wav"), "x");
    r = await post(S.port, "/api/audio-tracks", {});
    ok("Andere Schreibweise (Unterstriche/Kleinschreibung) wird trotzdem als Tic-Tac-Toe-Titel erkannt", r.ttt.files.length === 2);
    await S.stop();

    const S2 = await startServer({ AUDIO_DIR: path.join(dir, "gibtsnicht") });
    const r2 = await post(S2.port, "/api/audio-tracks", {});
    ok("Fehlender Ordner: leere Liste statt Absturz", Array.isArray(r2.menu) && r2.menu.length === 0 && r2.ttt === null && S2.alive());
    await S2.stop();
  }

  section("Client: lädt die echte Titelliste vom Server nach (ersetzt die Ausfallliste)");
  {
    const fetchOk = async (url) => url === "/api/audio-tracks"
      ? { json: async () => ({ ok: true, menu: [{ name: "Server Song A", files: ["a.mp3"] }, { name: "Server Song B", files: ["b.mp3"] }], ttt: { name: "Server TTT", files: ["ttt.mp3"] } }) }
      : { json: async () => ({}) };
    const C = loadClient({ fetchImpl: fetchOk });
    ok("Vor dem Laden: Ausfallliste (4 Titel) ist aktiv", C.R("MENU_MUSIC_TRACKS.length") === 4);
    await C.R("loadAudioTrackList()");
    ok("Nach dem Laden: echte Liste vom Server übernommen (2 statt 4 Titel)", C.R("MENU_MUSIC_TRACKS.length") === 2 && C.R("MENU_MUSIC_TRACKS[0].name") === "Server Song A");
    ok("Tic-Tac-Toe-Titel ebenfalls vom Server übernommen", C.R("TTT_MUSIC_TRACK.name") === "Server TTT");

    const fetchFail = async () => { throw new Error("kein Netz"); };
    const C2 = loadClient({ fetchImpl: fetchFail });
    await C2.R("loadAudioTrackList()");
    ok("Server nicht erreichbar: Ausfallliste bleibt bestehen, kein Absturz", C2.R("MENU_MUSIC_TRACKS.length") === 4);

    const fetchEmpty = async (url) => url === "/api/audio-tracks" ? { json: async () => ({ ok: true, menu: [], ttt: null }) } : { json: async () => ({}) };
    const C3 = loadClient({ fetchImpl: fetchEmpty });
    await C3.R("loadAudioTrackList()");
    ok("Leere Server-Antwort (Ordner leer): Ausfallliste bleibt bestehen statt Stille", C3.R("MENU_MUSIC_TRACKS.length") === 4);
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
