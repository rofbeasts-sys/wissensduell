/* Client-Seite des Freunde-Systems: WebSocket-Verbindung, Freundesliste,
 * Suche, Anfragen, Chat-Bildschirm. Server-Logik ist in friends.test.js. */
const { ok, section, finish, loadClient } = require("./helpers");

function realClick(R, fnName) {
  const html = R('document.getElementById("app").innerHTML');
  const marker = 'onclick="' + fnName + '(';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('Button mit "' + fnName + '(" nicht gefunden. HTML: ' + html.slice(0, 200));
  const attrStart = start + 'onclick="'.length;
  R(html.slice(attrStart, html.indexOf('"', attrStart)));
}
function setupAccount(R, sb, username = "Ich") {
  R(`account = { token:"T", profile:{ username:"${username}", klasse:0, achv:null, modeStats:{} } };`);
}

(async () => {
  section("Menü: Freunde-Knopf nur sichtbar, wenn angemeldet");
  {
    const C = loadClient(); const { R } = C;
    R('renderMainMenu()');
    ok("Ohne Konto: kein Freunde-Knopf im Menü", !R('document.getElementById("app").innerHTML').includes("startFriendsFlow()"));
    setupAccount(R, C.sb);
    R('renderMainMenu()');
    ok("Mit Konto: Freunde-Knopf ist da", R('document.getElementById("app").innerHTML').includes("startFriendsFlow()"));
  }

  section("Ohne Konto: Freunde-Aufruf führt zur Anmeldung, nicht zur Liste");
  {
    const C = loadClient(); const { R } = C;
    R('startFriendsFlow()');
    ok("Landet auf dem Anmelde-Bildschirm", R('document.getElementById("app").innerHTML').includes("ANMELDEN"));
    ok("postLoginRedirect ist gesetzt (führt nach dem Einloggen automatisch zu Freunden)", R("typeof postLoginRedirect") === "function");
  }

  section("WebSocket-Verbindung: Aufbau, accountConnect, Wiederverbindung nach Abbruch");
  {
    const C = loadClient({ fakeTime: true }); const { R, sb } = C;
    setupAccount(R, sb);
    R('connectFriendsWs()');
    ok("Eine WebSocket-Verbindung wurde geöffnet", sb.WebSocket.instances.length === 1);
    R('friendsWs.onopen()');
    const sent = JSON.parse(R('friendsWs.sent[0]'));
    ok("Beim Öffnen wird sofort accountConnect mit dem Konto-Token geschickt", sent.action === "accountConnect" && sent.token === "T");
    R('friendsWs.onclose()');
    ok("Nach Verbindungsabbruch: friendsWs ist zunächst null", R('friendsWs') === null);
    C.advance(3100);
    ok("... und nach der Wartezeit wird automatisch neu verbunden (2. Instanz)", sb.WebSocket.instances.length === 2);
  }
  section("WebSocket-Verbindung: kein Wiederverbindungsversuch nach Abmelden");
  {
    const C = loadClient({ fakeTime: true }); const { R, sb } = C;
    setupAccount(R, sb);
    R('connectFriendsWs()');
    R('account = null; friendsWs.onclose();');
    C.advance(5000);
    ok("Ohne Konto (abgemeldet): keine neue Verbindung wird versucht", sb.WebSocket.instances.length === 1);
  }
  section("disconnectFriendsWs schließt sauber, kein Reconnect danach");
  {
    const C = loadClient({ fakeTime: true }); const { R, sb } = C;
    setupAccount(R, sb);
    R('connectFriendsWs()');
    R('disconnectFriendsWs()');
    ok("friendsWs ist danach null", R('friendsWs') === null);
    ok("Die geschlossene Verbindung hat readyState 3 (CLOSED)", sb.WebSocket.instances[sb.WebSocket.instances.length - 1].readyState === 3);
    C.advance(5000);
    ok("Kein automatischer Wiederaufbau nach explizitem Trennen", sb.WebSocket.instances.length === 1);
  }

  section("Freundesliste: Anzeige von Freunden, eingehenden und ausgehenden Anfragen");
  {
    const fetchImpl = async (url) => {
      if (url === "/api/friends-list") return { json: async () => ({ ok:true,
        friends: [{ username:"Anna", online:true, achievements:12 }, { username:"Ben", online:false, achievements:3 }],
        incoming: ["Clara"], outgoing: ["David"]
      }) };
      return { json: async () => ({}) };
    };
    const C = loadClient({ fetchImpl }); const { R, state } = C;
    setupAccount(R, C.sb);
    await R('loadAndRenderFriendsList()');
    const html = state.last;
    ok("Zeigt beide Freunde mit Namen", html.includes("Anna") && html.includes("Ben"));
    ok("Online-Freund bekommt die 'online'-Markierung, Offline-Freund nicht", /friend-dot online[^>]*><\/span>Anna/.test(html) && !/friend-dot online[^>]*><\/span>Ben/.test(html));
    ok("Erfolge-Zahl wird angezeigt (12 bzw. 3)", html.includes("🏆 12") && html.includes("🏆 3"));
    ok("Eingehende Anfrage (Clara) wird mit Annehmen/Ablehnen angezeigt", html.includes("Clara") && html.includes("respondFriendRequest('Clara',true)"));
    ok("Ausgehende Anfrage (David) wird mit Zurückziehen-Option angezeigt", html.includes("David") && html.includes("cancelFriendRequestNow('David')"));
  }

  section("Suche: Ergebnisse je nach Beziehungsstatus unterschiedlich dargestellt");
  {
    const fetchImpl = async (url, opts) => {
      if (url === "/api/friends-search") return { json: async () => ({ ok:true, results: [
        { username:"Frei", isFriend:false, requestSent:false, requestIncoming:false },
        { username:"SchonFreund", isFriend:true, requestSent:false, requestIncoming:false },
        { username:"AngefragtVonMir", isFriend:false, requestSent:true, requestIncoming:false },
        { username:"HatMichAngefragt", isFriend:false, requestSent:false, requestIncoming:true }
      ] }) };
      return { json: async () => ({ ok:true, friends:[], incoming:[], outgoing:[] }) };
    };
    const C = loadClient({ fetchImpl }); const { R, sb } = C;
    setupAccount(R, sb);
    R('loadAndRenderFriendsList()');
    sb.document.getElementById("friendSearchInput").value = "xy";
    await R('friendsSearchNow()');
    const html = sb.document.getElementById("friendSearchResults").innerHTML;
    ok("Noch nicht befreundet: 'Hinzufügen'-Knopf", html.includes("sendFriendRequestNow('Frei')"));
    ok("Schon befreundet: kein Knopf, nur Hinweis", html.includes("SchonFreund") && html.includes("Schon befreundet") && !html.includes("sendFriendRequestNow('SchonFreund')"));
    ok("Anfrage bereits gesendet: Hinweis statt Knopf", html.includes("AngefragtVonMir") && html.includes("Anfrage gesendet"));
    ok("Hat MICH bereits angefragt: direkt 'Annehmen' statt erneuter Anfrage", html.includes("respondFriendRequest('HatMichAngefragt',true)"));
  }
  section("Suche: zu kurze Eingabe fragt den Server gar nicht erst");
  {
    let calls = 0;
    const fetchImpl = async (url) => { if (url === "/api/friends-search") calls++; return { json: async () => ({ ok:true, results:[] }) }; };
    const C = loadClient({ fetchImpl }); const { R, sb } = C;
    setupAccount(R, sb);
    R('loadAndRenderFriendsList()');
    sb.document.getElementById("friendSearchInput").value = "a";
    await R('friendsSearchNow()');
    ok("1 Zeichen: kein Suchaufruf an den Server", calls === 0);
  }

  section("Chat: Verlauf laden, Nachrichten anzeigen (eigene rechts, fremde links)");
  {
    const fetchImpl = async (url) => {
      if (url === "/api/chat-history") return { json: async () => ({ ok:true, messages: [
        { from:"Anna", text:"Hallo!", ts:1000 },
        { from:"Ich", text:"Hi zurück!", ts:2000 }
      ] }) };
      return { json: async () => ({}) };
    };
    const C = loadClient({ fetchImpl }); const { R, state } = C;
    setupAccount(R, C.sb);
    await R("openChat('Anna')");
    const html = state.last;
    ok("Beide Nachrichten werden angezeigt", html.includes("Hallo!") && html.includes("Hi zurück!"));
    ok("Eigene Nachricht bekommt die 'mine'-Markierung (rechts/hervorgehoben)", /chat-bubble mine">Hi zurück!/.test(html));
    ok("Fremde Nachricht bekommt sie NICHT", !/chat-bubble mine">Hallo!/.test(html));
  }

  section("Chat: Senden über WebSocket, optimistische Anzeige, HTML wird sauber escaped");
  {
    const fetchImpl = async () => ({ json: async () => ({ ok:true, messages: [] }) });
    const C = loadClient({ fetchImpl }); const { R, sb } = C;
    setupAccount(R, sb);
    R('connectFriendsWs(); friendsWs.readyState = 1;');
    await R("openChat('Anna')");
    sb.document.getElementById("chatInput").value = "<b>Hallo</b> Anna";
    R("sendChatMessageNow('Anna')");
    const sentMsgs = R('friendsWs.sent').map(s => JSON.parse(s));
    const chatSent = sentMsgs.find(m => m.action === "chatSend");
    ok("Nachricht wird über den WebSocket verschickt", !!chatSent && chatSent.to === "Anna" && chatSent.chatText === "<b>Hallo</b> Anna");
    ok("Eigene Nachricht erscheint sofort im Bildschirm (optimistisch, ohne auf den Server zu warten)", R('document.getElementById("app").innerHTML').includes("Hallo</b> Anna") === false); // s.u. Escaping
    ok("HTML in der Nachricht wird escaped angezeigt, nicht als echtes Markup übernommen", R('document.getElementById("app").innerHTML').includes("&lt;b&gt;Hallo&lt;/b&gt;"));
    ok("Eingabefeld wird nach dem Senden geleert", sb.document.getElementById("chatInput").value === "");
  }
  section("Chat: leere Nachricht wird nicht gesendet");
  {
    const fetchImpl = async () => ({ json: async () => ({ ok:true, messages: [] }) });
    const C = loadClient({ fetchImpl }); const { R, sb } = C;
    setupAccount(R, sb);
    R('connectFriendsWs(); friendsWs.readyState = 1;');
    await R("openChat('Anna')");
    sb.document.getElementById("chatInput").value = "   ";
    R("sendChatMessageNow('Anna')");
    ok("Nur-Leerzeichen-Nachricht wird nicht verschickt", R('friendsWs.sent.length') === 0);
  }

  section("Live-Zustellung: eingehende Nachricht erscheint sofort, wenn der Chat gerade offen ist");
  {
    const fetchImpl = async () => ({ json: async () => ({ ok:true, messages: [] }) });
    const C = loadClient({ fetchImpl }); const { R, sb } = C;
    setupAccount(R, sb);
    await R("openChat('Anna')");
    R('handleFriendsWsMessage({type:"chatMessage", from:"Anna", text:"Live-Nachricht", ts:5000})');
    ok("Neue Nachricht erscheint sofort auf dem offenen Chat-Bildschirm", R('document.getElementById("app").innerHTML').includes("Live-Nachricht"));
  }
  section("Live-Zustellung: Nachricht von einer ANDEREN Person löst KEIN Neuzeichnen des offenen Chats aus");
  {
    const fetchImpl = async () => ({ json: async () => ({ ok:true, messages: [] }) });
    const C = loadClient({ fetchImpl }); const { R, sb } = C;
    setupAccount(R, sb);
    await R("openChat('Anna')");
    const before = R('document.getElementById("app").innerHTML');
    R('handleFriendsWsMessage({type:"chatMessage", from:"JemandAnders", text:"Fuer wen anders", ts:5000})');
    ok("Chat mit Anna zeigt die Nachricht von 'JemandAnders' nicht direkt an (falscher Chat offen)", !R('document.getElementById("app").innerHTML').includes("Fuer wen anders"));
    ok("Nachricht wird trotzdem im Hintergrund gespeichert (für später)", R("chatMessagesCache['JemandAnders']").some(m => m.text === "Fuer wen anders"));
  }

  section("Live-Update: Online-/Offline-Status eines Freundes aktualisiert die offene Freundesliste");
  {
    const fetchImpl = async (url) => { if (url === "/api/friends-list") return { json: async () => ({ ok:true, friends:[{username:"Anna",online:false,achievements:0}], incoming:[], outgoing:[] }) }; return { json: async () => ({}) }; };
    const C = loadClient({ fetchImpl }); const { R } = C;
    setupAccount(R, C.sb);
    await R('loadAndRenderFriendsList()');
    ok("Anna ist zunächst als offline markiert", !/friend-dot online[^>]*><\/span>Anna/.test(R('document.getElementById("app").innerHTML')));
    R('handleFriendsWsMessage({type:"friendOnline", username:"Anna"})');
    ok("Nach der Live-Meldung: Anna erscheint sofort als online, ohne manuell neu zu laden", /friend-dot online[^>]*><\/span>Anna/.test(R('document.getElementById("app").innerHTML')));
  }

  section("Freunde entfernen fragt nach Bestätigung");
  {
    let removedCall = null;
    const fetchImpl = async (url, opts) => {
      if (url === "/api/friends-remove") { removedCall = JSON.parse(opts.body); return { json: async () => ({ ok:true }) }; }
      return { json: async () => ({ ok:true, friends:[], incoming:[], outgoing:[] }) };
    };
    const C = loadClient({ fetchImpl }); const { R, sb } = C;
    setupAccount(R, sb);
    sb.confirm = () => false;
    await R("removeFriendNow('Anna')");
    ok("Bricht man die Bestätigung ab, wird NICHT entfernt", removedCall === null);
    sb.confirm = () => true;
    await R("removeFriendNow('Anna')");
    ok("Bestätigt man, wird die Entfernung an den Server geschickt", removedCall && removedCall.username === "Anna");
  }

  section("Logout trennt die Freunde-Verbindung");
  {
    const C = loadClient({ fakeTime: true }); const { R, sb } = C;
    setupAccount(R, sb);
    R('connectFriendsWs()');
    ok("Verbindung ist vor dem Abmelden offen", R('friendsWs') !== null);
    await R('logoutAccount()');
    ok("Nach dem Abmelden ist die Freunde-Verbindung getrennt", R('friendsWs') === null);
    C.advance(5000);
    ok("... und baut sich auch nicht von selbst wieder auf", sb.WebSocket.instances.length === 1);
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
