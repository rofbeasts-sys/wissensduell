/* Streamer-Modus, Freunde einladen, Anticheat-Einschränkung. */
const { ok, section, sleep, finish, startServer, post, wsConnect, loadClient, fs, path } = require("./helpers");

(async () => {
  const S = await startServer({ ADMIN_KEY: "geheimer-testkey-123", CHESS_EARN_MIN_GAP_MS: "0" });
  const reg = async (n) => (await post(S.port, "/api/register", { username: n, password: "test1234" })).token;
  const A = await reg("StrA"), B = await reg("StrB"), C = await reg("StrC"), D = await reg("StrD");
  const list = (tok) => post(S.port, "/api/friends-list", { token: tok });
  const req = (tok, to) => post(S.port, "/api/friends-request", { token: tok, username: to });

  section("Streamer-Modus: Schalter und Profil");
  {
    const r = await post(S.port, "/api/streamer-mode", { token: B, enabled: true });
    ok("Einschalten klappt", r.ok && r.streamerMode === true);
    const login = await post(S.port, "/api/login", { username: "StrB", password: "test1234" });
    ok("Profil meldet streamerMode", login.profile.streamerMode === true);
    ok("Ohne Token abgelehnt", (await post(S.port, "/api/streamer-mode", { token: "x", enabled: true })).ok === false);
    ok("Interne Anticheat-Felder stehen nicht im Profil", login.profile.cheatFlags === undefined && login.profile.chess === undefined && login.profile.restricted === undefined);
  }

  section("Streamer bekommt keine Freundschaftsanfragen");
  {
    const r = await req(C, "StrB");
    ok("Anfrage an Streamer abgelehnt mit klarer Meldung", r.ok === false && /keine Freundschaftsanfragen/.test(r.error));
    const lb = await list(B);
    ok("Nichts steht in der Liste des Streamers", lb.incoming.length === 0);
  }

  section("Gegenseitig = automatisch Freunde (auch im Streamer-Modus)");
  {
    // D schickt vor dem Streamer-Modus eine Anfrage an einen Nicht-Streamer, der dann streamt
    await post(S.port, "/api/streamer-mode", { token: B, enabled: false });
    ok("B (kein Streamer) bekommt Anfrage von C", (await req(C, "StrB")).ok === true);
    await post(S.port, "/api/streamer-mode", { token: B, enabled: true });
    const hidden = await list(B);
    ok("Im Streamer-Modus ist die alte Anfrage ausgeblendet", hidden.incoming.length === 0);
    const cross = await req(B, "StrC");
    ok("B schickt zurück: sofort Freunde", cross.ok === true);
    const lc = await list(C), lb = await list(B);
    ok("Beide stehen in der Freundesliste", lc.friends.some(f => f.username === "StrB") && lb.friends.some(f => f.username === "StrC"));
    // Umgekehrt: Streamer B schickt zuerst an D, D schickt zurück
    ok("B (Streamer) darf selbst Anfragen schicken", (await req(B, "StrD")).ok === true);
    const back = await req(D, "StrB");
    ok("D antwortet mit Anfrage: sofort Freunde (trotz Streamer-Modus)", back.ok === true && (await list(D)).friends.some(f => f.username === "StrB"));
    await post(S.port, "/api/streamer-mode", { token: B, enabled: false });
    ok("Streamer-Modus aus: neue Anfragen gehen wieder", (await req(A, "StrB")).ok === true && (await list(B)).incoming.includes("StrA"));
    await post(S.port, "/api/friends-accept", { token: B, username: "StrA" });
  }

  section("Freunde in den Warteraum einladen");
  {
    const host = await wsConnect(S.port);
    host.send({ action: "createRoom", name: "StrA", language: "de", gameMode: "quiz" }); await sleep(300);
    const created = host.find("roomCreated") || host.find("joined") || (host.parsed || [])[0];
    const code = (host.parsed || []).map(m => m.roomCode || (m.room && m.room.code)).find(Boolean);
    ok("Party-Raum erstellt", !!code);
    const wsB = await wsConnect(S.port); wsB.send({ action: "accountConnect", token: B }); await sleep(250);
    const inv = await post(S.port, "/api/party-invite", { token: A, friend: "StrB", code, game: "party" });
    ok("Einladung an Online-Freund klappt", inv.ok === true);
    await sleep(250);
    const m = wsB.last("partyInvite");
    ok("B erhält Einladung mit Code und Absender", m && m.roomCode === code && m.from.username === "StrA" && m.kind === "party");
    const again = await post(S.port, "/api/party-invite", { token: A, friend: "StrB", code, game: "party" });
    const third = await post(S.port, "/api/party-invite", { token: A, friend: "StrB", code, game: "party" });
    ok("Spam-Schutz: zu schnell erneut einladen wird gebremst", third.ok === false);
    ok("Kein Freund: abgelehnt", (await post(S.port, "/api/party-invite", { token: A, friend: "StrD", code, game: "party" })).ok === false);
    ok("Unbekannter Raum: abgelehnt", (await post(S.port, "/api/party-invite", { token: C, friend: "StrB", code: "ZZZZZZ", game: "party" })).ok === false);
    ok("Freund offline: abgelehnt", (await post(S.port, "/api/party-invite", { token: A, friend: "StrC", code, game: "party" })).ok === false);
    ok("Ohne Login abgelehnt", (await post(S.port, "/api/party-invite", { token: "x", friend: "StrB", code, game: "party" })).ok === false);
    wsB.s.destroy(); host.s.destroy();
  }

  section("Anticheat: Wiederholungstäter werden eingeschränkt");
  {
    const E = await reg("StrCheat");
    const bad = { bauer: { s: [0,0,0,0,0] }, dame: { f: [0,0,0,0,9] } };
    for (let i = 0; i < 5; i++) await post(S.port, "/api/chess/inv-save", { token: E, inventory: bad });
    const list1 = await post(S.port, "/api/admin-cheaters", { key: "geheimer-testkey-123" });
    const me = list1.cheaters.find(c => c.username === "StrCheat");
    ok("Nach 5 Versuchen als eingeschränkt gelistet", me && me.flags >= 5 && me.restricted === true);
    // Münz-Zuwachs aus Prestige zählt nicht mehr
    await post(S.port, "/api/save-stats", { token: E, stats: { braintestPrestige: 3, coins: 1500 } });
    const st = await post(S.port, "/api/chess/state", { token: E });
    ok("Eingeschränkt: kein Münzzuwachs", st.coins === 0);
    const e1 = await post(S.port, "/api/chess/earn", { token: E, rankIdx: 5 });
    ok("Eingeschränkt: keine Gratis-Schlüssel", e1.ok && e1.granted === 0);
    const un = await post(S.port, "/api/admin-restrict", { key: "geheimer-testkey-123", username: "StrCheat", action: "unrestrict" });
    ok("Admin kann entsperren", un.ok && un.restricted === false);
    const e2 = await post(S.port, "/api/chess/earn", { token: E, rankIdx: 5 });
    ok("Danach wieder Gratis-Schlüssel", e2.granted > 0);
    ok("Falscher Admin-Key kann nicht sperren", (await post(S.port, "/api/admin-restrict", { key: "falsch", username: "StrA", action: "restrict" })).ok === false);
    const sj = await reg("StrJump");
    await post(S.port, "/api/save-stats", { token: sj, stats: { correctAnswers: 100, wrongAnswers: 10 } });
    await post(S.port, "/api/save-stats", { token: sj, stats: { correctAnswers: 900, wrongAnswers: 10 } });
    const l2 = await post(S.port, "/api/admin-cheaters", { key: "geheimer-testkey-123" });
    ok("Statistiksprung (+800 Antworten auf einmal) wird vermerkt", l2.cheaters.some(c => c.username === "StrJump"));
  }

  section("Oberfläche: Einstellungen, Sternchen, Einladungsmeldung");
  {
    const C1 = loadClient({ localStorageData: { wq_streamer: "1" } }); const { R, state } = C1;
    ok("Streamer-Modus wird aus dem Speicher gelesen", R("streamerMode") === true);
    ok("Code wird zu Sternchen", R('codeText("ABC123")') === "******");
    ok("Eingabefeld wird zum Passwortfeld", R("codeInputType()") === "password");
    const srcAll = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    ok("Einstellungen enthalten den Streamer-Schalter", srcAll.includes("toggleStreamerMode()") && srcAll.includes("Streamer-Modus"));
    const C2 = loadClient(); 
    ok("Ohne Streamer-Modus: Code im Klartext", C2.R('codeText("ABC123")') === "ABC123" && C2.R("codeInputType()") === "text");
    const src = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    ok("Lobby und TTT zeigen maskierte Codes + Einladen-Box", src.includes("${codeText(room.code)}") && src.includes("codeText(tttMp.roomCode)") && src.includes("renderInviteFriendsBox(\"party\", room.code)") && src.includes("renderInviteFriendsBox('ttt'"));
    ok("Einladung am Freund-WS wird behandelt", src.includes('msg.type === "partyInvite"') && src.includes("acceptPartyInvite"));
    const on = fs.readFileSync(path.join(__dirname, "..", "public", "chess", "online.html"), "utf8");
    ok("Chess Online maskiert den Code im Streamer-Modus", on.includes("STREAMER ? \"******\"") && on.includes('$("codeIn").type = "password"'));
  }

  await S.stop();
  finish();
})();
