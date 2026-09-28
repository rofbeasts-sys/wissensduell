/* Sicherheits- und Stabilitaetstests (Server) */
const { ok, section, sleep, finish, startServer, post, get, frame, wsConnect, fs, path } = require("./helpers");

(async () => {
  // ---------------------------------------------------------------- Abstuerze
  section("Absturzschutz: fehlerhafte Eingaben duerfen den Server nie beenden");
  {
    const S = await startServer();
    const raw = async (payload) => { const c = await wsConnect(S.port); c.s.write(frame(payload)); await sleep(150); c.s.destroy(); };
    await raw("null"); await raw("5"); await raw("[]");
    await raw({ action: "createRoom", name: 5 }); await raw({ action: "createRoom", name: { a: 1 } });
    await raw({ action: "joinRoom", code: 5, name: "x" }); await raw({ action: "tttJoinRoom", code: {}, name: 1 });
    await raw({ action: "tttCreateRoom", name: [1], mode: 5 });
    // in einem Raum: falsche Typen bei Antworten, rankPlace in falscher Rundenart
    const h = await wsConnect(S.port);
    h.send({ action: "createRoom", name: "H", language: "de", gameMode: "blitz" }); await sleep(200);
    h.send({ action: "startGame" }); await sleep(2600);
    for (const a of ["nennsBlitzSubmit", "rankPlace", "slfSubmit", "quizAnswer", "setRoundDef", "kickPlayer", "guessSubmit", "ticTacToeMove"]) {
      h.send({ action: a, text: 5, answers: 5, itemId: {}, insertIndex: "x", selectedIndex: [], index: {}, playerId: 5 }); await sleep(30);
    }
    for (const body of ['{"username":12345,"password":"abcdef"}', '{"username":"abcd","password":123456}', '{"token":{}}', '[1,2]', 'kein json']) {
      for (const url of ["/api/register", "/api/login", "/api/session", "/api/save-stats", "/api/arena-finish-match", "/api/random-quiz-questions"]) await post(S.port, url, body);
    }
    await post(S.port, "/api/save-stats", '{"token":"x","stats":5}');
    await post(S.port, "/api/random-quiz-questions", { count: 1e9 });
    await sleep(200);
    ok("Server lebt nach ~60 fehlerhaften WebSocket-/HTTP-Nachrichten", S.alive());
    ok("... und antwortet noch normal", (await post(S.port, "/api/arena-leaderboard", {})).ok === true);
    await S.stop();
  }

  // ---------------------------------------------------------------- Konten
  section("Konten, Login-Sperre, Ratenlimits");
  {
    const S = await startServer({ AUTH_LOCK_MS: "1500", AUTH_WINDOW_MS: "60000" });
    const P = S.port;
    const reg = await post(P, "/api/register", { username: "anna", password: "geheim1" });
    ok("Registrieren funktioniert", reg.ok && !!reg.token);
    ok("Doppelter Name wird abgelehnt", !(await post(P, "/api/register", { username: "ANNA", password: "anderes1" })).ok);
    ok("Login (Gross/Klein egal) funktioniert", (await post(P, "/api/login", { username: "ANNA", password: "geheim1" })).ok);
    ok("Falsches Passwort wird abgelehnt", !(await post(P, "/api/login", { username: "anna", password: "falsch" })).ok);
    ok("Ungueltiges Token: ok=false ohne 'unavailable'", (r => r.ok === false && !r.unavailable && !r.error)(await post(P, "/api/session", { token: "unsinn" })));
    for (let i = 0; i < 5; i++) await post(P, "/api/login", { username: "anna", password: "x" + i });
    const locked = await post(P, "/api/login", { username: "anna", password: "geheim1" });
    ok("Nach 5 Fehlversuchen: selbst das richtige Passwort ist gesperrt", !locked.ok && /Zu viele Fehlversuche/.test(locked.error) && locked.retryAfterSec > 0);
    await post(P, "/api/register", { username: "berta", password: "geheim2" });
    ok("Ein anderes Konto vom selben Anschluss ist nicht betroffen", (await post(P, "/api/login", { username: "berta", password: "geheim2" })).ok);
    ok("Gefaelschter X-Forwarded-For umgeht die Sperre nicht", !(await post(P, "/api/login", { username: "anna", password: "geheim1" }, { "X-Forwarded-For": "9.9.9.9" })).ok);
    await sleep(1700);
    ok("Nach Ablauf der Sperre klappt der Login wieder", (await post(P, "/api/login", { username: "anna", password: "geheim1" })).ok);
    for (let i = 0; i < 3; i++) await post(P, "/api/login", { username: "anna", password: "x" + i });
    await post(P, "/api/login", { username: "anna", password: "geheim1" });
    for (let i = 0; i < 4; i++) await post(P, "/api/login", { username: "anna", password: "y" + i });
    ok("Erfolgreicher Login setzt den Zaehler zurueck", (await post(P, "/api/login", { username: "anna", password: "geheim1" })).ok);
    for (let i = 0; i < 5; i++) await post(P, "/api/login", { username: "gibtsnicht", password: "x" + i });
    ok("Auch unbekannte Namen loesen dieselbe Sperre aus (kein Verraten)", /Zu viele Fehlversuche/.test((await post(P, "/api/login", { username: "gibtsnicht", password: "x9" })).error || ""));
    await S.stop();

    const S2 = await startServer({ AUTH_LOCK_MS: "60000" });
    for (let i = 0; i < 30; i++) await post(S2.port, "/api/login", { username: "irgendwer" + i, password: "falsch" });
    ok("30 Fehlversuche von einer IP mit 30 Namen: IP gesperrt", /Zu viele Fehlversuche/.test((await post(S2.port, "/api/login", { username: "neu", password: "x" })).error || ""));
    await S2.stop();

    const S3 = await startServer();
    let made = 0, blocked = null;
    for (let i = 0; i < 12; i++) { const r = await post(S3.port, "/api/register", { username: "massen" + i, password: "geheim1" }); if (r.ok) made++; else if (!blocked) blocked = r; }
    ok("Registrierung: nur 10 Konten je IP und Stunde", made === 10 && blocked && /zu viele Konten/.test(blocked.error));
    let n429 = 0;
    await Promise.all(Array.from({ length: 650 }, () => post(S3.port, "/api/arena-leaderboard", {}).then(r => { if (r._status === 429) n429++; })));
    ok("Allgemeines API-Limit: 600 je Minute erlaubt, Rest abgewiesen (429)", n429 >= 40 && n429 <= 70);
    await S3.stop();
  }

  // ---------------------------------------------------------------- Tokens
  section("Sitzungs-Token: Ablauf, Begrenzung, Erneuerung");
  {
    const S = await startServer();
    await post(S.port, "/api/register", { username: "tokentest", password: "geheim1" });
    const tokens = [];
    for (let i = 0; i < 7; i++) tokens.push((await post(S.port, "/api/login", { username: "tokentest", password: "geheim1" })).token);
    const valid = [];
    for (const t of tokens) valid.push((await post(S.port, "/api/session", { token: t })).ok);
    ok("Mehr als 5 Logins: nur die 5 neuesten Token gelten (aeltere fliegen raus)", valid.filter(Boolean).length === 5 && !valid[0] && !valid[1] && valid[6]);
    await S.stop();
    // Token kuenstlich altern lassen (Neustart mit veralteter Datei)
    const users = JSON.parse(fs.readFileSync(S.usersFile, "utf8"));
    const u = users.find(x => x.username === "tokentest");
    const day = 24 * 3600 * 1000;
    u.tokens.find(t => t.token === tokens[6]).createdAt = Date.now() - 31 * day; // abgelaufen
    u.tokens.find(t => t.token === tokens[5]).createdAt = Date.now() - 3 * day;  // noch gueltig, wird erneuert
    fs.writeFileSync(S.usersFile, JSON.stringify(users));
    const S2 = await startServer({ USERS_FILE: S.usersFile });
    ok("Token aelter als 30 Tage ist abgelaufen", (await post(S2.port, "/api/session", { token: tokens[6] })).ok === false);
    ok("Token von vor 3 Tagen gilt noch", (await post(S2.port, "/api/session", { token: tokens[5] })).ok === true);
    await sleep(300);
    const after = JSON.parse(fs.readFileSync(S.usersFile, "utf8")).find(x => x.username === "tokentest").tokens.find(t => t.token === tokens[5]);
    ok("... und wurde durch die Nutzung erneuert (rollierend)", Date.now() - after.createdAt < day);
    await S2.stop();
  }

  // ---------------------------------------------------------------- Arena
  section("Arena: Punkte nicht frei waehlbar");
  {
    const S = await startServer({ ARENA_MIN_MATCH_MS: "400" });
    const P = S.port;
    const tok = (await post(P, "/api/register", { username: "arenatest", password: "geheim1" })).token;
    ok("5.000.000 Punkte ohne Match: abgelehnt", !(await post(P, "/api/arena-finish-match", { token: tok, pointsEarned: 5000000 })).ok);
    const st1 = await post(P, "/api/arena-start-match", { token: tok });
    ok("Start liefert einmalige Match-ID", st1.ok && typeof st1.matchId === "string");
    ok("Sofort beenden (unter Mindestdauer): abgelehnt", !(await post(P, "/api/arena-finish-match", { token: tok, pointsEarned: 10, matchId: st1.matchId })).ok);
    ok("Erfundene Match-ID: abgelehnt", !(await post(P, "/api/arena-finish-match", { token: tok, pointsEarned: 10, matchId: "erfunden" })).ok);
    ok("Ohne Match-ID: abgelehnt", !(await post(P, "/api/arena-finish-match", { token: tok, pointsEarned: 10 })).ok);
    await sleep(500);
    const g = await post(P, "/api/arena-finish-match", { token: tok, pointsEarned: 5000000, matchId: st1.matchId });
    ok("Echtes Match, 5.000.000 gemeldet: auf 100 gedeckelt", g.ok && g.pointsEarned === 100 && g.totalPoints === 100);
    ok("Dieselbe Match-ID zweimal: abgelehnt", !(await post(P, "/api/arena-finish-match", { token: tok, pointsEarned: 50, matchId: st1.matchId })).ok);
    const st2 = await post(P, "/api/arena-start-match", { token: tok }); await sleep(500);
    const inf = await post(P, "/api/arena-finish-match", { token: tok, pointsEarned: "1e999", matchId: st2.matchId });
    ok("'Unendlich' als Punkte zaehlt 0", inf.ok && inf.pointsEarned === 0 && inf.totalPoints === 100);
    const st3 = await post(P, "/api/arena-start-match", { token: tok }); await sleep(500);
    const nrm = await post(P, "/api/arena-finish-match", { token: tok, pointsEarned: 23, matchId: st3.matchId });
    ok("Normales Match (23 Punkte) wird gutgeschrieben", nrm.ok && nrm.pointsEarned === 23 && nrm.totalPoints === 123);
    await S.stop();
  }

  // ---------------------------------------------------------------- HTTP
  section("HTTP: Header, Pfade, Groesse");
  {
    const S = await startServer();
    const r = await get(S.port, "/");
    const h = r.headers;
    ok("Sicherheits-Header gesetzt", h["x-content-type-options"] === "nosniff" && h["x-frame-options"] === "DENY" && /frame-ancestors 'none'/.test(h["content-security-policy"] || "") && h["referrer-policy"] === "no-referrer");
    ok("index.html: no-cache (Updates kommen sofort an)", h["cache-control"] === "no-cache");
    ok("API: no-store", (await post(S.port, "/api/arena-leaderboard", {}))._headers["cache-control"] === "no-store");
    ok("Pfad-Ausbruch wird abgewehrt", (await get(S.port, "/../server.js")).status !== 200 && (await get(S.port, "/%2e%2e/server.js")).status !== 200 && (await get(S.port, "/..%2fserver.js")).status !== 200);
    ok("Riesiger Request (300 KB) wird abgewiesen", await new Promise(res => { const q = require("http").request({ port: S.port, path: "/api/login", method: "POST" }, x => res(x.statusCode === 413)); q.on("error", () => res(true)); q.end("x".repeat(300000)); }));
    ok("Server lebt", S.alive());
    await S.stop();
  }

  // ---------------------------------------------------------------- Datenverlust
  section("Datenverlust-Schutz (lokale Datei)");
  {
    const S = await startServer();
    await post(S.port, "/api/register", { username: "anna", password: "geheim1" });
    await post(S.port, "/api/register", { username: "zweite", password: "geheim2" }); // 2. Speichern legt die .bak-Sicherung an
    await S.stop();
    ok("Konto wurde gespeichert, Sicherung (.bak) angelegt", fs.existsSync(S.usersFile) && fs.existsSync(S.usersFile + ".bak"));
    fs.writeFileSync(S.usersFile, "{kaputt");
    const S2 = await startServer({ USERS_FILE: S.usersFile });
    ok("Beschaedigte Datei + gueltige .bak: Sicherung wird geladen, Konto bleibt", (await post(S2.port, "/api/login", { username: "anna", password: "geheim1" })).ok);
    await S2.stop();
    fs.writeFileSync(S.usersFile, "{kaputt"); fs.rmSync(S.usersFile + ".bak", { force: true });
    const S3 = await startServer({ USERS_FILE: S.usersFile });
    const r = await post(S3.port, "/api/register", { username: "neu", password: "geheim1" });
    ok("Kaputt und keine Sicherung: Registrierung verweigert statt zu ueberschreiben", !r.ok && r.unavailable === true);
    ok("... die kaputte Datei bleibt unangetastet", fs.readFileSync(S.usersFile, "utf8") === "{kaputt");
    ok("... und eine Rettungskopie wurde angelegt", fs.readdirSync(path.dirname(S.usersFile)).some(f => f.includes(".corrupt-")));
    await S3.stop();
  }
  section("Datenverlust-Schutz (Upstash faellt aus)");
  {
    const http = require("http");
    const alt = Array.from({ length: 100 }, (_, i) => ({ username: "alt" + i, salt: "s", passwordHash: "h", stats: {}, tokens: [{ token: "tok" + i, createdAt: Date.now() }] }));
    let stored = JSON.stringify(alt), mode = "ausfall", sets = 0;
    const mock = http.createServer((req, res) => { let b = ""; req.on("data", c => b += c); req.on("end", () => {
      if (req.url.startsWith("/get/")) { if (mode === "ausfall") { res.writeHead(429, { "Content-Type": "application/json" }); return res.end('{"error":"rate limit"}'); } res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ result: stored })); }
      if (req.url.startsWith("/set/")) { sets++; stored = b; res.writeHead(200, { "Content-Type": "application/json" }); return res.end('{"result":"OK"}'); }
      res.writeHead(404); res.end(); }); });
    await new Promise(r => mock.listen(0, r));
    const S = await startServer({ UPSTASH_REDIS_REST_URL: "http://localhost:" + mock.address().port, UPSTASH_REDIS_REST_TOKEN: "x" });
    const r = await post(S.port, "/api/register", { username: "neuernutzer", password: "geheim1" });
    ok("Ausfall beim Start: Registrierung sauber verweigert", !r.ok && r.unavailable === true);
    ok("... es wurde NICHTS geschrieben, alle 100 Konten unveraendert", sets === 0 && JSON.parse(stored).length === 100);
    const sess = await post(S.port, "/api/session", { token: "tok5" });
    ok("... Session-Pruefung meldet 'unavailable' statt 'abgemeldet'", sess.ok === false && sess.unavailable === true);
    mode = "ok"; await sleep(600);
    ok("Nach dem Ausfall laedt der Server selbst nach, Registrierung klappt", (await post(S.port, "/api/register", { username: "neuernutzer", password: "geheim1" })).ok === true);
    ok("Datenbank enthaelt jetzt alle 100 alten + 1 neues Konto", JSON.parse(stored).length === 101);
    await S.stop(); mock.close();
  }

  // ---------------------------------------------------------------- WebSocket
  section("WebSocket: Groesse, Rate, Verbindungen, tote Verbindungen, Raumcodes");
  {
    const S = await startServer({ WS_PING_EVERY_MS: "250", WS_DEAD_AFTER_MS: "900" });
    const P = S.port;
    let c = await wsConnect(P); c.send({ action: "createRoom", name: "Test", language: "de" }); await sleep(300);
    const joined = c.find("joined");
    ok("Normale Nachricht funktioniert", !!joined);
    ok("Raumcode hat 6 Zeichen aus dem erlaubten Alphabet", !!joined && /^[A-HJ-NP-Z2-9]{6}$/.test(joined.roomCode));
    const big = await wsConnect(P); const hd = Buffer.alloc(14); hd[0] = 0x81; hd[1] = 0x80 | 127; hd.writeUInt32BE(0, 2); hd.writeUInt32BE(1024 * 1024, 6);
    big.s.write(hd); big.s.write(Buffer.alloc(200000, 0x41)); await sleep(400);
    ok("1-MB-Paket: Verbindung sofort mit Code 1009 beendet", big.closed && big.closeCode === 1009);
    const huge = await wsConnect(P); const h2 = Buffer.alloc(10); h2[0] = 0x81; h2[1] = 0x80 | 127; h2.writeUInt32BE(0x7fffffff, 2); huge.s.write(h2); await sleep(300);
    ok("Gigantische Laengenangabe: sofort beendet", huge.closed);
    const mid = await wsConnect(P); mid.send({ action: "joinRoom", code: "ZZZZZZ", name: "x".repeat(60000) }); await sleep(300);
    ok("60-KB-Nachricht (unter dem Limit) geht durch", !mid.closed);
    const over = await wsConnect(P); over.send({ action: "joinRoom", code: "ZZZZZZ", name: "x".repeat(70000) }); await sleep(300);
    ok("70-KB-Nachricht (ueber dem Limit) beendet die Verbindung", over.closed);
    const fl = await wsConnect(P); for (let i = 0; i < 400; i++) fl.send({ action: "unbekannt" + i }); await sleep(600);
    ok("Nachrichtenflut (400 auf einmal): Verbindung gekappt", fl.closed);
    const calm = await wsConnect(P); for (let i = 0; i < 30; i++) { calm.send({ action: "ping" + i }); await sleep(40); } await sleep(200);
    ok("Normales Tempo bleibt unbehelligt", !calm.closed);
    // Raumcode durchprobieren
    const guess = await wsConnect(P); for (let i = 0; i < 45; i++) guess.send({ action: "joinRoom", code: "AAAA" + (10 + i), name: "x" }); await sleep(500);
    const msgs = (guess.parsed || []).map(m => m.message || "");
    ok("Viele falsche Raumcodes: 'Zu viele falsche Codes' ab dem ~41. Versuch", msgs.some(m => /Zu viele falsche Codes/.test(m)));
    const ok2 = await wsConnect(P); ok2.send({ action: "joinRoom", code: joined.roomCode, name: "Gast" }); await sleep(300);
    ok("... und ein richtiger Code von dieser IP ist dann ebenfalls kurz gesperrt (Ratenlimit greift je IP)", (ok2.parsed || []).some(m => /Zu viele falsche Codes/.test(m.message || "")));
    // Tote Verbindung (antwortet nicht auf Ping) vs. lebende
    const dead = await wsConnect(P, { autoPong: false }), alive = await wsConnect(P, { autoPong: true });
    await sleep(2200);
    ok("Verbindung ohne Lebenszeichen wird nach dem Zeitlimit gekappt", dead.closed && dead.pings >= 1);
    ok("Verbindung, die auf Pings antwortet, bleibt bestehen", !alive.closed && alive.pings >= 2);
    ok("Server lebt", S.alive());
    await S.stop();
    // Verbindungslimit je IP (eigener Server, damit die IP nicht durch obige Tests gesperrt ist)
    const S2 = await startServer();
    const conns = []; for (let i = 0; i < 70; i++) conns.push(await wsConnect(S2.port)); await sleep(400);
    const open = conns.filter(x => !x.closed).length;
    ok("70 Verbindungen von einer IP: hoechstens 60 bleiben offen (" + open + ")", open <= 60 && open >= 55);
    conns.forEach(x => x.s.destroy()); await sleep(400);
    const again = await wsConnect(S2.port); again.send({ action: "createRoom", name: "Danach", language: "de" }); await sleep(300);
    ok("Nach dem Schliessen (auch ohne Close-Frame) sind wieder Verbindungen moeglich", !!again.find("joined"));
    await S2.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
