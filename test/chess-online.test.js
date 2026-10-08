/* Chess Online (Original): Freunde einladen / Raumcode, serverseitige Zugprüfung. */
const { ok, section, finish, startServer, post, loadClient, fs, path } = require("./helpers");

(async () => {
  const S = await startServer({ CHESS_ONLINE_MOVE_MS: "1500" });
  const A = (await post(S.port, "/api/register", { username: "SchachA", password: "test1234" })).token;
  const B = (await post(S.port, "/api/register", { username: "SchachB", password: "test1234" })).token;
  const C = (await post(S.port, "/api/register", { username: "SchachC", password: "test1234" })).token;
  const api = (tok, a, b) => post(S.port, "/api/chess-online/" + a, Object.assign({ token: tok }, b || {}));

  section("Ohne Login / ohne Freundschaft");
  {
    ok("Ohne Token abgelehnt", (await api("x", "create")).ok === false);
    const r = await api(A, "create", { invite: "SchachB" });
    ok("Einladung an Nicht-Freund abgelehnt", r.ok === false);
  }

  section("Freundschaft, Einladung, Beitritt");
  let code, wTok, bTok, wName, bName;
  {
    await post(S.port, "/api/friends-request", { token: A, username: "SchachB" });
    await post(S.port, "/api/friends-accept", { token: B, username: "SchachA" });
    const r = await api(A, "create", { invite: "SchachB" });
    ok("Partie erstellt, wartet", r.ok && r.status === "waiting" && /^[A-Z0-9]{5}$/.test(r.code));
    code = r.code;
    const inbox = await api(B, "inbox");
    ok("B sieht die Einladung von A", inbox.ok && inbox.invites.length === 1 && inbox.invites[0].code === code && inbox.invites[0].from === "SchachA");
    ok("C sieht keine Einladung", (await api(C, "inbox")).invites.length === 0);
    ok("C kann der Einladung nicht beitreten", (await api(C, "join", { code })).ok === false);
    const j = await api(B, "join", { code: code.toLowerCase() });
    ok("B tritt bei (Code unabhängig von Groß/Klein), Partie läuft", j.ok && j.status === "playing" && j.w && j.b);
    ok("Farben verteilt", (j.w === "SchachA" && j.b === "SchachB") || (j.w === "SchachB" && j.b === "SchachA"));
    ok("Einladung verschwindet aus dem Posteingang", (await api(B, "inbox")).invites.length === 0);
    wName = j.w; bName = j.b;
    wTok = wName === "SchachA" ? A : B; bTok = wName === "SchachA" ? B : A;
  }

  section("Züge werden geprüft");
  {
    ok("Schwarz darf nicht beginnen", (await api(bTok, "move", { code, fr: 1, fc: 4, tr: 3, tc: 4 })).ok === false);
    ok("Unzulässiger Zug (Turm springt) abgelehnt", (await api(wTok, "move", { code, fr: 7, fc: 0, tr: 4, tc: 0 })).ok === false);
    ok("Fremde Figur abgelehnt", (await api(wTok, "move", { code, fr: 1, fc: 4, tr: 2, tc: 4 })).ok === false);
    ok("Außenseiter C kann nicht ziehen", (await api(C, "move", { code, fr: 6, fc: 4, tr: 4, tc: 4 })).ok === false);
    const m1 = await api(wTok, "move", { code, fr: 6, fc: 4, tr: 4, tc: 4 });
    ok("e4 geht, Schwarz ist dran", m1.ok && m1.turn === "b" && m1.board[4][4].t === "P" && m1.log.length === 1);
    ok("Weiß darf nicht zweimal", (await api(wTok, "move", { code, fr: 6, fc: 3, tr: 4, tc: 3 })).ok === false);
    const st = await api(bTok, "state", { code });
    ok("Schwarz sieht den Zug, hat Farbe b", st.ok && st.color === "b" && st.board[4][4].t === "P");
  }

  section("Schäfermatt endet die Partie");
  {
    const mv = async (tok, fr, fc, tr, tc) => api(tok, "move", { code, fr, fc, tr, tc });
    await mv(bTok, 1, 4, 3, 4);                 // e5
    await mv(wTok, 7, 5, 4, 2);                 // Lc4
    await mv(bTok, 0, 1, 2, 2);                 // Sc6
    await mv(wTok, 7, 3, 3, 7);                 // Dh5
    await mv(bTok, 0, 6, 2, 5);                 // Sf6??
    const fin = await mv(wTok, 3, 7, 1, 5);     // Dxf7#
    ok("Matt erkannt: Weiß gewinnt", fin.ok && fin.status === "over" && fin.winner === "w" && fin.why === "mate");
    ok("Notation mit #", fin.log[fin.log.length - 1].endsWith("#"));
    ok("Nach dem Ende kein Zug mehr", (await mv(bTok, 1, 0, 2, 0)).ok === false);
    const again = await api(A, "create");
    ok("Danach neue Partie möglich", again.ok === true);
    await api(A, "leave", { code: again.code });
  }

  section("Raumcode ohne Freundschaft, Aufgabe, Zeitablauf");
  {
    const r = await api(A, "create");
    ok("Offene Partie per Code", r.ok && r.status === "waiting");
    const j = await api(C, "join", { code: r.code });
    ok("C tritt per Code bei", j.ok && j.status === "playing");
    const vol = await api(B, "join", { code: r.code });
    ok("Dritte Person abgewiesen (voll)", vol.ok === false);
    const rs = await api(C, "resign", { code: r.code });
    ok("Aufgabe: Gegner gewinnt", rs.status === "over" && rs.why === "resign" && rs.winner === (rs.w === "SchachC" ? "b" : "w"));
    const t = await api(A, "create");
    await api(B, "join", { code: t.code });
    await new Promise(res => setTimeout(res, 1800));
    const to = await api(A, "state", { code: t.code });
    ok("Zeitüberschreitung: Gegner gewinnt", to.status === "over" && to.why === "time");
  }

  section("Unbekannter Code, Ablehnen");
  {
    ok("Unbekannter Code", (await api(B, "join", { code: "ZZZZZ" })).ok === false);
    const r = await api(C, "create"); await api(C, "leave", { code: r.code });
    ok("Warte-Partie verlassen löscht sie", (await api(A, "join", { code: r.code })).ok === false);
  }



  section("Abfrage-Limit je Konto (Anticheat/Flut), Polling blockiert die IP nicht");
  {
    const S2 = await startServer({ CHESS_ONLINE_MAX_PER_MIN: "15" });
    const tk = (await post(S2.port, "/api/register", { username: "Flut", password: "test1234" })).token;
    let limited = 0;
    for (let i = 0; i < 25; i++) { const r = await post(S2.port, "/api/chess-online/state", { token: tk, code: "ABCDE" }); if (r.ok === false && /Anfragen|requests/i.test(r.error || "")) limited++; }
    ok("Nach 15 Aufrufen pro Minute wird das Konto gebremst", limited >= 8);
    const ok2 = await post(S2.port, "/api/session", { token: tk });
    ok("Andere Funktionen (Sitzung) laufen weiter", ok2.ok === true);
    await S2.stop();
  }

  section("Oberfläche: Seite, Hub-Karte, Anmelde-Pflicht");
  {
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "chess", "online.html"), "utf8");
    ok("online.html nutzt dieselbe Engine und Brain-Pulse-Farben", html.includes('src="engine.js"') && html.includes("--accent:#c6ff3d") && html.includes("bpChessBack"));
    ok("Lobby: Einladungen, Freunde, Code erstellen/beitreten", ["inbox", "friends-list", "create", "join", 'id="codeIn"'].every(x => html.includes(x)));
    ok("Brett wird für Schwarz gedreht", html.includes('S.color === "b"') && html.includes("7 - i"));
    const C = loadClient(); const { R, state } = C;
    R('currentLang="de"; renderChessHub();');
    ok("Hub zeigt 'Chess Online'", state.last.includes("openChessOnline()") && state.last.includes("Chess Online"));
    ok("Hub hat Platz für Einladungshinweis", state.last.includes('id="chessInviteBox"'));
    R('currentLang="en"; renderChessHub();');
    ok("[en] Hub zeigt Chess Online auf Englisch", state.last.includes("Live against friends"));
    R('account=null; openChessOnline();');
    ok("Ohne Konto: Login statt Schach-Rahmen", !state.last.includes("online.html"));
  }

  await S.stop();
  finish();
})();
