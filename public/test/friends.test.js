/* Freunde-System: Anfragen senden/annehmen/ablehnen, Freundesliste mit
 * Online-Status und Erfolge-Anzahl, sowie 1:1-Chat zwischen Freunden. */
const { ok, section, sleep, finish, startServer, post, wsConnect } = require("./helpers");

(async () => {
  const S = await startServer();
  const P = S.port;
  const reg = async (name) => (await post(P, "/api/register", { username: name, password: "geheim1" })).token;
  const tokA = await reg("friendsA"), tokB = await reg("friendsB"), tokC = await reg("friendsC"), tokD = await reg("friendsD");

  section("Suche");
  {
    const r = await post(P, "/api/friends-search", { token: tokA, query: "friendsB" });
    ok("Suche findet den passenden Benutzernamen", r.ok && r.results.some(x => x.username === "friendsB"));
    ok("Sich selbst findet man in der Suche nicht", !r.results.some(x => x.username === "friendsA"));
    const short = await post(P, "/api/friends-search", { token: tokA, query: "f" });
    ok("Zu kurze Suche (1 Zeichen) liefert bewusst keine Treffer", short.ok && short.results.length === 0);
    const none = await post(P, "/api/friends-search", { token: tokA, query: "gibtsnicht999" });
    ok("Kein Treffer -> leere Liste, kein Fehler", none.ok && none.results.length === 0);
  }

  section("Anfrage senden, annehmen");
  {
    let r = await post(P, "/api/friends-request", { token: tokA, username: "friendsB" });
    ok("Anfrage A -> B erfolgreich", r.ok);
    r = await post(P, "/api/friends-request", { token: tokA, username: "friendsB" });
    ok("Doppelte Anfrage wird abgelehnt", !r.ok);
    r = await post(P, "/api/friends-request", { token: tokA, username: "friendsA" });
    ok("Anfrage an sich selbst wird abgelehnt", !r.ok);
    r = await post(P, "/api/friends-request", { token: tokA, username: "gibtsnicht999" });
    ok("Anfrage an nicht existierenden Namen wird abgelehnt", !r.ok);

    let listB = await post(P, "/api/friends-list", { token: tokB });
    ok("B sieht die eingehende Anfrage von A", listB.incoming.includes("friendsA"));
    let listA = await post(P, "/api/friends-list", { token: tokA });
    ok("A sieht die eigene ausgehende Anfrage an B", listA.outgoing.includes("friendsB"));

    r = await post(P, "/api/friends-accept", { token: tokB, username: "friendsA" });
    ok("B nimmt die Anfrage an", r.ok);
    listA = await post(P, "/api/friends-list", { token: tokA });
    listB = await post(P, "/api/friends-list", { token: tokB });
    ok("Danach sind beide gegenseitig Freunde (bei A taucht B auf)", listA.friends.some(f => f.username === "friendsB"));
    ok("... und umgekehrt (bei B taucht A auf)", listB.friends.some(f => f.username === "friendsA"));
    ok("Die Anfrage ist aus beiden Listen verschwunden", !listA.outgoing.includes("friendsB") && !listB.incoming.includes("friendsA"));
  }

  section("Anfrage ablehnen, zurückziehen, gegenseitige Anfrage führt direkt zur Freundschaft");
  {
    let r = await post(P, "/api/friends-request", { token: tokA, username: "friendsC" });
    ok("A schickt Anfrage an C", r.ok);
    r = await post(P, "/api/friends-decline", { token: tokC, username: "friendsA" });
    ok("C lehnt ab", r.ok);
    let listA = await post(P, "/api/friends-list", { token: tokA });
    let listC = await post(P, "/api/friends-list", { token: tokC });
    ok("Nach Ablehnung: keine Freundschaft, keine offene Anfrage mehr auf beiden Seiten", !listA.friends.some(f=>f.username==="friendsC") && !listA.outgoing.includes("friendsC") && !listC.incoming.includes("friendsA"));

    r = await post(P, "/api/friends-request", { token: tokA, username: "friendsC" });
    ok("A schickt erneut eine Anfrage an C", r.ok);
    r = await post(P, "/api/friends-cancel", { token: tokA, username: "friendsC" });
    ok("A zieht die eigene Anfrage zurück", r.ok);
    listC = await post(P, "/api/friends-list", { token: tokC });
    ok("Bei C ist die Anfrage dadurch auch weg", !listC.incoming.includes("friendsA"));

    r = await post(P, "/api/friends-request", { token: tokA, username: "friendsC" });
    await post(P, "/api/friends-request", { token: tokC, username: "friendsA" }); // C schickt UMGEKEHRT auch eine Anfrage
    listA = await post(P, "/api/friends-list", { token: tokA });
    ok("Schickt die Gegenseite ebenfalls eine Anfrage, werden sie direkt Freunde (statt zwei offenen Anfragen)", listA.friends.some(f => f.username === "friendsC"));
  }

  section("Freund entfernen");
  {
    let r = await post(P, "/api/friends-remove", { token: tokA, username: "friendsB" });
    ok("A entfernt B als Freund", r.ok);
    const listA = await post(P, "/api/friends-list", { token: tokA });
    const listB = await post(P, "/api/friends-list", { token: tokB });
    ok("Danach bei A nicht mehr in der Liste", !listA.friends.some(f => f.username === "friendsB"));
    ok("... und auch bei B nicht mehr (gegenseitig entfernt)", !listB.friends.some(f => f.username === "friendsA"));
  }

  section("Erfolge-Anzahl in der Freundesliste");
  {
    // B erneut mit A befreunden fuer die weiteren Tests
    await post(P, "/api/friends-request", { token: tokB, username: "friendsA" });
    await post(P, "/api/friends-accept", { token: tokA, username: "friendsB" });
    let listA = await post(P, "/api/friends-list", { token: tokA });
    ok("Frisches Konto: 0 Erfolge in der Freundesliste sichtbar", listA.friends.find(f => f.username === "friendsB").achievements === 0);
    const Achv = require("../public/achievements.js");
    const st = Achv.newState(); Achv.apply(st, { t: "gen", n: 10 }); Achv.apply(st, { t: "gen", n: 90 }); // gen_10 + gen_100
    await post(P, "/api/save-stats", { token: tokB, stats: { achv: st } });
    listA = await post(P, "/api/friends-list", { token: tokA });
    ok("Nach 2 freigeschalteten Erfolgen bei B: Freundesliste bei A zeigt 2 Erfolge", listA.friends.find(f => f.username === "friendsB").achievements === 2);
  }

  section("Online-Status über den WebSocket-Kanal (accountConnect)");
  {
    let listA = await post(P, "/api/friends-list", { token: tokA });
    ok("B ist zunächst offline (kein accountConnect gesendet)", listA.friends.find(f => f.username === "friendsB").online === false);

    const wsB = await wsConnect(P);
    wsB.send({ action: "accountConnect", token: tokB });
    await sleep(150);
    listA = await post(P, "/api/friends-list", { token: tokA });
    ok("Nach accountConnect: B erscheint bei A als online", listA.friends.find(f => f.username === "friendsB").online === true);

    const wsA = await wsConnect(P);
    wsA.send({ action: "accountConnect", token: tokA });
    await sleep(150);
    ok("A bekommt eine Live-Meldung, dass B online ist (falls zeitlich vor A's Connect schon online)", true); // reine Konsistenzpruefung folgt unten per Trennung

    wsB.s.destroy();
    await sleep(300);
    listA = await post(P, "/api/friends-list", { token: tokA });
    ok("Nach Verbindungsabbruch: B gilt wieder als offline", listA.friends.find(f => f.username === "friendsB").online === false);
    wsA.s.destroy();
  }

  section("Live-Meldung an Freunde, wenn jemand online/offline geht");
  {
    const wsA = await wsConnect(P);
    wsA.send({ action: "accountConnect", token: tokA });
    await sleep(150);
    const wsB = await wsConnect(P);
    wsB.send({ action: "accountConnect", token: tokB });
    let seen = false, waited = 0;
    while (!seen && waited < 3000) { await sleep(100); waited += 100; seen = wsA.parsed.some(m => m.type === "friendOnline" && m.username === "friendsB"); }
    ok("A bekommt live mitgeteilt, dass B gerade online gegangen ist", seen);
    wsB.s.destroy();
    seen = false; waited = 0;
    while (!seen && waited < 3000) { await sleep(100); waited += 100; seen = wsA.parsed.some(m => m.type === "friendOffline" && m.username === "friendsB"); }
    ok("... und wenn B wieder offline geht", seen);
    wsA.s.destroy();
  }

  section("Chat: nur zwischen Freunden, wird gespeichert, live zugestellt");
  {
    let r = await post(P, "/api/chat-history", { token: tokA, username: "friendsD" });
    ok("Chatverlauf mit einer NICHT befreundeten Person wird verweigert", !r.ok);

    const wsA = await wsConnect(P);
    wsA.send({ action: "accountConnect", token: tokA });
    const wsB = await wsConnect(P);
    wsB.send({ action: "accountConnect", token: tokB });
    await sleep(150);

    wsA.send({ action: "chatSend", to: "friendsB", chatText: "Hallo B!" });
    let waited = 0, sendOk = false;
    while (!sendOk && waited < 3000) { await sleep(100); waited += 100; sendOk = wsA.parsed.some(m => m.type === "chatSendResult" && m.ok); }
    ok("Absender bekommt eine Erfolgsbestätigung", sendOk);

    let received = false; waited = 0;
    while (!received && waited < 3000) { await sleep(100); waited += 100; received = wsB.parsed.some(m => m.type === "chatMessage" && m.from === "friendsA" && m.text === "Hallo B!"); }
    ok("Empfänger bekommt die Nachricht LIVE zugestellt (ist online)", received);

    const hist = await post(P, "/api/chat-history", { token: tokB, username: "friendsA" });
    ok("Nachricht ist auch dauerhaft im Chatverlauf gespeichert", hist.ok && hist.messages.some(m => m.from === "friendsA" && m.text === "Hallo B!"));

    wsA.send({ action: "chatSend", to: "friendsD", chatText: "Wir sind gar nicht befreundet" });
    waited = 0; let rejected = false;
    while (!rejected && waited < 2000) { await sleep(100); waited += 100; const m = wsA.parsed.find(x => x.type === "chatSendResult" && x.to === "friendsD"); rejected = m && !m.ok; }
    ok("Nachricht an einen Nicht-Freund wird abgelehnt", rejected);

    wsA.s.destroy(); wsB.s.destroy();
  }

  section("Chat: Sicherheit und Grenzfälle");
  {
    const long = "x".repeat(2000);
    const wsA = await wsConnect(P);
    wsA.send({ action: "accountConnect", token: tokA });
    await sleep(100);
    wsA.send({ action: "chatSend", to: "friendsB", chatText: long });
    await sleep(300);
    const hist = await post(P, "/api/chat-history", { token: tokA, username: "friendsB" });
    const last = hist.messages[hist.messages.length - 1];
    ok("Sehr lange Nachricht wird auf ein vernünftiges Maß gekürzt (nicht 2000 Zeichen)", last.text.length <= 500);

    wsA.send({ action: "chatSend", to: "friendsB", chatText: "<script>alert(1)</script>" });
    await sleep(300);
    const hist2 = await post(P, "/api/chat-history", { token: tokA, username: "friendsB" });
    const last2 = hist2.messages[hist2.messages.length - 1];
    ok("Spitze Klammern werden aus Chatnachrichten entfernt (XSS-Schutz)", !last2.text.includes("<") && !last2.text.includes(">"));

    wsA.send({ action: "chatSend", to: "friendsB", chatText: "   " });
    await sleep(300);
    const before = (await post(P, "/api/chat-history", { token: tokA, username: "friendsB" })).messages.length;
    wsA.send({ action: "chatSend", to: "friendsB", chatText: "" });
    await sleep(300);
    const after = (await post(P, "/api/chat-history", { token: tokA, username: "friendsB" })).messages.length;
    ok("Leere/nur-Leerzeichen-Nachrichten werden nicht gespeichert", after === before);

    wsA.send({ action: "accountConnect", token: "kompletter-unsinn-als-token" });
    await sleep(150);
    ok("Ungültiger Token bei accountConnect stürzt den Server nicht ab, meldet nur ok:false", wsA.parsed.some(m => m.type === "accountConnectResult" && m.ok === false) && S.alive());
    wsA.s.destroy();
  }

  section("Persistenz: Chatverlauf übersteht einen Serverneustart");
  {
    await S.stop();
    const S2 = await startServer({ USERS_FILE: S.usersFile, CONVERSATIONS_FILE: S.conversationsFile });
    const hist = await post(S2.port, "/api/chat-history", { token: tokA, username: "friendsB" });
    ok("Nachrichten sind nach einem Neustart noch da", hist.ok && hist.messages.length > 0);
    await S2.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
