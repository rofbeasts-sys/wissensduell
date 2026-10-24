/* Auf Wunsch: alle Server-Fehlermeldungen (Login, Registrierung, Freunde,
 * Chat, Shop, Arena) zweisprachig. Der Client schickt bei jedem apiCall()
 * sein aktuelles "lang" mit, der Server wählt daraus die passende Fassung
 * aus der zentralen ERR_TEXT-Tabelle. Fehlt "lang" oder ist unbekannt,
 * bleibt es beim bisherigen Deutsch (rückwärtskompatibel). Bewusst NICHT
 * übersetzt: zwei interne Stripe-Webhook-Meldungen, die nie ein Mensch
 * sieht (nur Server-Logs). */
const { ok, section, finish, loadClient, startServer, post } = require("./helpers");

(async () => {
  section("Login: falsches Passwort in beiden Sprachen, Rückfall auf Deutsch ohne lang-Angabe");
  {
    const S = await startServer();
    const de = await post(S.port, "/api/login", { username: "Nobody", password: "xxxxxxxx", lang: "de" });
    const en = await post(S.port, "/api/login", { username: "Nobody", password: "xxxxxxxx", lang: "en" });
    const none = await post(S.port, "/api/login", { username: "Nobody", password: "xxxxxxxx" });
    const unknown = await post(S.port, "/api/login", { username: "Nobody", password: "xxxxxxxx", lang: "fr" });
    ok("Deutsch: 'Benutzername oder Passwort ist falsch.'", de.error === "Benutzername oder Passwort ist falsch.");
    ok("Englisch: 'Username or password is incorrect.'", en.error === "Username or password is incorrect.");
    ok("Ohne lang-Angabe: Rückfall auf Deutsch (bisheriges Verhalten)", none.error === "Benutzername oder Passwort ist falsch.");
    ok("Unbekannte Sprache ('fr'): ebenfalls Rückfall auf Deutsch", unknown.error === "Benutzername oder Passwort ist falsch.");
    await S.stop();
  }

  section("Registrierung: Validierungsfehler in beiden Sprachen");
  {
    const S = await startServer();
    const shortEn = await post(S.port, "/api/register", { username: "ab", password: "xxxxxxxx", lang: "en" });
    const shortDe = await post(S.port, "/api/register", { username: "ab", password: "xxxxxxxx", lang: "de" });
    const pwEn = await post(S.port, "/api/register", { username: "GutName", password: "kurz", lang: "en" });
    ok("Zu kurzer Benutzername (EN)", shortEn.error === "Username must be 3-20 characters (letters, numbers, _).");
    ok("Zu kurzer Benutzername (DE) unverändert", shortDe.error === "Benutzername muss 3-20 Zeichen haben (Buchstaben, Zahlen, _).");
    ok("Zu kurzes Passwort (EN)", pwEn.error === "Password must be at least 6 characters.");

    await post(S.port, "/api/register", { username: "Vergeben", password: "xxxxxxxx", lang: "en" });
    const takenEn = await post(S.port, "/api/register", { username: "Vergeben", password: "xxxxxxxx", lang: "en" });
    const takenDe = await post(S.port, "/api/register", { username: "Vergeben", password: "xxxxxxxx", lang: "de" });
    ok("Benutzername bereits vergeben (EN)", takenEn.error === "This username is already taken.");
    ok("Benutzername bereits vergeben (DE) unverändert", takenDe.error === "Dieser Benutzername ist bereits vergeben.");
    await S.stop();
  }

  section("Sperre nach Fehlversuchen: auch die EINGEBETTETE Zeitangabe ist übersetzt (vorher Fehler: 'in 10 Minuten.' mitten im englischen Satz)");
  {
    const S = await startServer();
    await post(S.port, "/api/register", { username: "LockTest", password: "xxxxxxxx", lang: "en" });
    for (let i = 0; i < 10; i++) await post(S.port, "/api/login", { username: "LockTest", password: "falsch" + i, lang: "en" });
    const en = await post(S.port, "/api/login", { username: "LockTest", password: "x", lang: "en" });
    const de = await post(S.port, "/api/login", { username: "LockTest", password: "x", lang: "de" });
    ok("Englisch: komplett englischer Satz inkl. Zeitangabe ('10 minutes.')", /Too many failed attempts\. Please try again in \d+ (minutes|seconds)\./.test(en.error));
    ok("Englisch: KEIN deutsches 'Minuten'/'Sekunden' mehr im Satz", !/Minuten|Sekunden|erneut/.test(en.error));
    ok("Deutsch unverändert: 'Bitte in ... erneut versuchen.'", /Zu viele Fehlversuche\. Bitte in \d+ (Minuten|Sekunden) erneut versuchen\./.test(de.error));
    ok("retryAfterSec bleibt in beiden Sprachen vorhanden (maschinenlesbar)", typeof en.retryAfterSec === "number" && typeof de.retryAfterSec === "number");
    await S.stop();
  }

  section("Nicht angemeldet / ungültige Eingabe bei Statistik-Sync");
  {
    const S = await startServer();
    const en = await post(S.port, "/api/save-stats", { token: "ungueltig", stats: {}, lang: "en" });
    const de = await post(S.port, "/api/save-stats", { token: "ungueltig", stats: {}, lang: "de" });
    ok("Nicht angemeldet (EN)", en.error === "Not logged in.");
    ok("Nicht angemeldet (DE) unverändert", de.error === "Nicht angemeldet.");
    await S.stop();
  }

  section("Freunde: alle typischen Fehlerfälle in beiden Sprachen");
  {
    const S = await startServer();
    const a = await post(S.port, "/api/register", { username: "FreundA", password: "xxxxxxxx", lang: "en" });
    const b = await post(S.port, "/api/register", { username: "FreundB", password: "xxxxxxxx", lang: "en" });
    const notFound = await post(S.port, "/api/friends-request", { token: a.token, username: "GibtsNicht", lang: "en" });
    const self = await post(S.port, "/api/friends-request", { token: a.token, username: "FreundA", lang: "en" });
    ok("Nutzer nicht gefunden (EN)", notFound.error === "This username doesn't exist.");
    ok("Sich selbst hinzufügen (EN)", self.error === "You can't add yourself.");

    await post(S.port, "/api/friends-request", { token: a.token, username: "FreundB", lang: "en" });
    const dup = await post(S.port, "/api/friends-request", { token: a.token, username: "FreundB", lang: "en" });
    ok("Anfrage bereits gesendet (EN)", dup.error === "Request has already been sent.");
    const dupDe = await post(S.port, "/api/friends-request", { token: a.token, username: "FreundB", lang: "de" });
    ok("Anfrage bereits gesendet (DE) unverändert", dupDe.error === "Anfrage wurde bereits gesendet.");

    const noReq = await post(S.port, "/api/friends-accept", { token: a.token, username: "FreundB", lang: "en" });
    ok("Keine offene Anfrage (EN)", noReq.error === "No open request from this person.");

    await post(S.port, "/api/friends-accept", { token: b.token, username: "FreundA", lang: "en" });
    const already = await post(S.port, "/api/friends-request", { token: a.token, username: "FreundB", lang: "en" });
    ok("Bereits befreundet (EN)", already.error === "You're already friends.");

    const chatNotFriends = await post(S.port, "/api/chat-history", { token: a.token, username: "NichtFreund", lang: "en" });
    ok("Chat mit Nicht-Freund (EN)", chatNotFriends.error === "You're not (or no longer) friends.");
    await S.stop();
  }

  section("Arena/Shop: Fehlermeldungen in beiden Sprachen");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "ArenaT", password: "xxxxxxxx", lang: "en" });
    const noCoinsEn = await post(S.port, "/api/arena-buy-heart", { token: reg.token, lang: "en" });
    ok("Nicht genug Münzen (EN)", noCoinsEn.error === "Not enough coins.");
    const noCoinsDe = await post(S.port, "/api/arena-buy-heart", { token: reg.token, lang: "de" });
    ok("Nicht genug Münzen (DE) unverändert", noCoinsDe.error === "Nicht genug Münzen.");

    const noMatchEn = await post(S.port, "/api/arena-finish-match", { token: reg.token, pointsEarned: 5, matchId: "x", lang: "en" });
    ok("Kein laufendes Match (EN)", noMatchEn.error === "No active match (or it has already been scored).");

    const shopEn = await post(S.port, "/api/shop-create-checkout", { token: reg.token, packageId: "small", lang: "en" });
    ok("Shop nicht eingerichtet (EN) - ohne Stripe-Umgebungsvariablen", shopEn.error === "Coin purchases aren't set up yet.");
    const shopDe = await post(S.port, "/api/shop-create-checkout", { token: reg.token, packageId: "small", lang: "de" });
    ok("Shop nicht eingerichtet (DE) unverändert", shopDe.error === "Der Münzen-Kauf ist noch nicht eingerichtet.");
    await S.stop();
  }

  section("Unbekannter Endpunkt in beiden Sprachen");
  {
    const S = await startServer();
    const en = await post(S.port, "/api/gibts-nicht", { lang: "en" });
    const de = await post(S.port, "/api/gibts-nicht", { lang: "de" });
    ok("Unbekannter Endpunkt (EN)", en.error === "Unknown endpoint.");
    ok("Unbekannter Endpunkt (DE)", de.error === "Unbekannter Endpunkt.");
    await S.stop();
  }

  section("Client: apiCall() schickt currentLang automatisch bei jedem Aufruf mit");
  {
    let captured = null;
    const C = loadClient({ fetchImpl: async (url, opts) => { captured = JSON.parse(opts.body); return { ok: true, json: async () => ({ ok: true }) }; } });
    const { R } = C;
    R('currentLang = "en"; apiCall("/api/login", { username: "x", password: "y" });');
    await new Promise(r => setTimeout(r, 50));
    ok("Bei Englisch wird lang:'en' mitgeschickt", captured && captured.lang === "en");
    ok("Bestehende Felder (username/password) bleiben erhalten", captured && captured.username === "x" && captured.password === "y");

    R('currentLang = "de"; apiCall("/api/login", { username: "x", password: "y" });');
    await new Promise(r => setTimeout(r, 50));
    ok("Bei Deutsch wird lang:'de' mitgeschickt", captured && captured.lang === "de");
  }

  section("Client: bei Netzwerkfehler erscheint die Verbindungsmeldung in der richtigen Sprache");
  {
    const C = loadClient({ fetchImpl: async () => { throw new Error("offline"); } });
    const { R } = C;
    // Ergebnis in eine Variable innerhalb der VM schreiben und von aussen
    // auslesen (ein direkt zurueckgegebenes Promise aus der VM laesst sich
    // von aussen nicht zuverlaessig awaiten).
    R('currentLang = "en"; var __en; apiCall("/api/login", {}).then(x => __en = x);');
    await new Promise(r => setTimeout(r, 50));
    R('currentLang = "de"; var __de; apiCall("/api/login", {}).then(x => __de = x);');
    await new Promise(r => setTimeout(r, 50));
    ok("Englisch: 'Connection to the server failed.'", R("__en.error") === "Connection to the server failed.");
    ok("Deutsch unverändert: 'Verbindung zum Server fehlgeschlagen.'", R("__de.error") === "Verbindung zum Server fehlgeschlagen.");
  }

  section("Lückenlosigkeit: jeder Schlüssel in ERR_TEXT hat sowohl eine deutsche als auch eine englische Fassung");
  {
    const fs = require("fs"), path = require("path");
    const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const block = src.slice(src.indexOf("const ERR_TEXT = {"), src.indexOf("function et(key, lang)"));
    const entries = [...block.matchAll(/(\w+): \{ de: "([^"]*)", en: "([^"]*)" \}/g)];
    ok(`Mindestens 30 Meldungen in der Tabelle (gefunden: ${entries.length})`, entries.length >= 30);
    ok("Keine leere deutsche oder englische Fassung", entries.every(m => m[2].length > 0 && m[3].length > 0));
    ok("Deutsche und englische Fassung unterscheiden sich überall (keine versehentlich identische Kopie)", entries.every(m => m[2] !== m[3]));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
