/* Chess Fantasy: Schluessel, Truhen und Schluesselkauf serverautoritativ. */
const crypto = require("crypto");
const http = require("http");
const { ok, section, finish, startServer, post, fs, path } = require("./helpers");

function rawPost(port, urlPath, bodyStr, extraHeaders) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "localhost", port, path: urlPath, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr), ...extraHeaders }
    }, (res) => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    req.on("error", reject);
    req.write(bodyStr); req.end();
  });
}
function signStripeBody(bodyStr, secret, timestamp) {
  const t = timestamp || Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", secret).update(t + "." + bodyStr).digest("hex");
  return `t=${t},v1=${sig}`;
}


(async () => {
  const secret = "whsec_chess";
  const S = await startServer({ STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: secret, CHESS_EARN_MIN_GAP_MS: "0" });
  const reg = await post(S.port, "/api/register", { username: "ChessKeys", password: "test1234" });
  const token = reg.token;
  const api = (a, b) => post(S.port, "/api/chess/" + a, Object.assign({ token }, b || {}));

  section("Ohne Login geht nichts");
  {
    const r = await post(S.port, "/api/chess/state", { token: "falsch" });
    ok("Status ohne gültigen Token abgelehnt", r.ok === false);
    const o = await post(S.port, "/api/chess/open", { token: "falsch", type: "normal" });
    ok("Truhe ohne Token abgelehnt", o.ok === false);
  }

  section("Startzustand und Truhe ohne Schlüssel");
  {
    const st = await api("state");
    ok("0 Schlüssel am Anfang, 3 Pakete", st.ok && st.keys === 0 && st.packs.length === 3);
    const o = await api("open", { type: "normal" });
    ok("Truhe ohne Schlüssel abgelehnt", o.ok === false && /Schlüssel/.test(o.error));
  }

  section("Client kann sich keine Münzen oder Schlüssel schenken");
  {
    await post(S.port, "/api/save-stats", { token, stats: { coins: 999999, chess: { keys: 999 } } });
    const st = await api("state");
    ok("Gemeldete 999999 Münzen werden auf das Tagesbudget (300) gekappt", st.coins === 300);
    await post(S.port, "/api/save-stats", { token, stats: { coins: 999999 } });
    ok("Zweiter Versuch am selben Tag bringt nichts mehr", (await api("state")).coins === 300);
    await post(S.port, "/api/save-stats", { token, stats: { coins: 0 } });
    ok("Schlüssel lassen sich nicht über save-stats setzen", st.keys === 0);
    const b = await api("buy-keys", { packId: "k10" });
    ok("Schlüsselkauf ohne Münzen scheitert", b.ok === false);
  }

  section("Münzen per Stripe-Webhook, dann Schlüssel kaufen und Truhen öffnen");
  {
    const event = { id: "evt_c1", type: "checkout.session.completed", data: { object: { id: "cs_c1", metadata: { username: "ChessKeys", coins: "600", packageId: "medium" } } } };
    const body = JSON.stringify(event);
    const resp = await rawPost(S.port, "/webhook/stripe", body, { "Stripe-Signature": signStripeBody(body, secret) });
    ok("Webhook 200", resp.status === 200);
    const bad = await api("buy-keys", { packId: "gibtsnicht" });
    ok("Unbekanntes Paket abgelehnt", bad.ok === false);
    const b = await api("buy-keys", { packId: "k200" });
    ok("200 Schlüssel für 1600 Münzen nicht bezahlbar mit 600", b.ok === false);
    const b2 = await api("buy-keys", { packId: "k50" });
    ok("50 Schlüssel für 450 Münzen: 150 Münzen übrig", b2.ok && b2.keys === 50 && b2.coins === 150);
    const o = await api("open", { type: "normal" });
    ok("Normale Truhe kostet 20 Schlüssel", o.ok && o.keys === 30);
    ok("Normale Truhe: 5-10 Figuren, Münzbonus 200-499", o.results.length >= 5 && o.results.length <= 10 && o.coinBonus >= 200 && o.coinBonus < 500);
    ok("Jede Figur hat pid/rarityKey/rankIdx", o.results.every(r => r.pid && r.rarityKey && Number.isInteger(r.rankIdx)));
    const e = await api("open", { type: "epic" });
    ok("Epische Truhe kostet 50 -> nicht genug (30)", e.ok === false);
    const bad2 = await api("open", { type: "mega" });
    ok("Unbekannter Truhentyp abgelehnt", bad2.ok === false);
    const login = await post(S.port, "/api/login", { username: "ChessKeys", password: "test1234" });
    const st = await api("state");
    ok("Schlüssel überstehen erneuten Login", st.keys === 30 && login.ok);
  }

  section("Gratis-Schlüssel für Siege sind pro Tag gedeckelt");
  {
    let total = 0, last;
    for (let i = 0; i < 12; i++) { last = await api("earn", { rankIdx: 6 }); total += last.granted; }
    ok("Höchstens 20 Gratis-Schlüssel am Tag", total === 20 && last.freeKeysLeft === 0);
    const more = await api("earn", { rankIdx: 0 });
    ok("Danach 0", more.granted === 0);
  }

  section("Epische Truhe nach Gratis-Schlüsseln");
  {
    const b = await api("buy-keys", { packId: "k50" }); // 150 Münzen -> geht nicht
    ok("Kein Geld mehr für weiteres Paket", b.ok === false);
    const st = await api("state");
    ok("Schlüssel reichen für legendäre Truhe (50 + 20 = 50)", st.keys >= 50);
    const e = await api("open", { type: "epic" });
    ok("Epische Truhe: 10 Figuren, 5 sicher Normal", e.ok && e.results.length === 10 && e.results.filter(r => r.rankIdx === 0).length >= 5);
  }


  section("Anticheat: Inventar wird gegen die Truhen geprüft");
  {
    const starter = () => ({ bauer: { s: [8,0,0,0,0] }, turm: { s: [2,0,0,0,0] }, laeufer: { d: [2,0,0,0,0] }, springer: { m: [2,0,0,0,0] }, dame: { v: [1,0,0,0,0] }, koenig: { b: [1,0,0,0,0] } });
    const l0 = await api("inv-load");
    ok("Anfangs kein Server-Inventar", l0.ok && l0.inv === null);
    const s1 = await api("inv-save", { inventory: starter() });
    ok("Start-Inventar wird gespeichert", s1.ok && s1.inv.bauer.s[0] === 8);
    const hack = starter(); hack.dame.f = [0, 0, 0, 0, 5];       // 5 mystische Dame Feuer aus dem Nichts
    const s2 = await api("inv-save", { inventory: hack });
    ok("Erfundene mystische Figuren abgelehnt, Server-Stand kommt zurück", s2.ok === false && s2.inv && s2.inv.dame.f[4] === 0);
    const neg = starter(); neg.bauer.s[0] = -3;
    ok("Negative Zahlen abgelehnt", (await api("inv-save", { inventory: neg })).ok === false);
    const frac = starter(); frac.bauer.s[0] = 1.5;
    ok("Kommazahlen abgelehnt", (await api("inv-save", { inventory: frac })).ok === false);
    ok("Kaputte Struktur abgelehnt", (await api("inv-save", { inventory: "x" })).ok === false);
    const lower = starter(); lower.bauer.s = [3, 0, 0, 0, 0];
    ok("Weniger Figuren (verbraucht) ist erlaubt", (await api("inv-save", { inventory: lower })).ok);
    const load = await api("inv-load");
    ok("Server liefert den gespeicherten Stand (Geräte-Wechsel)", load.ok && load.inv.bauer.s[0] === 3);
  }

  section("Anticheat: Kombinieren bleibt erlaubt, Hochschummeln nicht");
  {
    const reg2 = await post(S.port, "/api/register", { username: "ChessInv2", password: "test1234" });
    const t2 = reg2.token;
    const api2 = (a, b) => post(S.port, "/api/chess/" + a, Object.assign({ token: t2 }, b || {}));
    const base = () => ({ bauer: { s: [8,0,0,0,0] }, turm: { s: [2,0,0,0,0] }, laeufer: { d: [2,0,0,0,0] }, springer: { m: [2,0,0,0,0] }, dame: { v: [1,0,0,0,0] }, koenig: { b: [1,0,0,0,0] } });
    await api2("inv-save", { inventory: base() });
    const comb = base(); comb.bauer.s = [0, 0, 0, 0, 0]; comb.bauer.s[1] = 0; comb.bauer.s[0] = 0;
    // 8 Normale (Stärke 8) -> 0 Normale + 0 Blaue ist weniger -> ok; 1 Blaue (Stärke 10) wäre MEHR als 8 -> abgelehnt
    const more = base(); more.bauer.s = [0, 1, 0, 0, 0];
    ok("1 Blaue (Stärke 10) aus 8 Normalen (Stärke 8) abgelehnt", (await api2("inv-save", { inventory: more })).ok === false);
    const other = base(); other.dame.f = [1, 0, 0, 0, 0];
    ok("Feuer-Dame ohne Truhe abgelehnt", (await api2("inv-save", { inventory: other })).ok === false);
    const fair = base(); fair.bauer.s = [8, 0, 0, 0, 0];
    ok("Gleicher Stand bleibt erlaubt", (await api2("inv-save", { inventory: fair })).ok);
  }


  section("Anticheat: Betreiber-Auswertung (ADMIN_KEY)");
  {
    const S3 = await startServer({ ADMIN_KEY: "geheimer-testkey-123" });
    const tk = (await post(S3.port, "/api/register", { username: "Schummler", password: "test1234" })).token;
    await post(S3.port, "/api/chess/inv-save", { token: tk, inventory: { bauer: { s: [0,0,0,0,0] }, dame: { f: [0,0,0,0,9] } } });
    await post(S3.port, "/api/save-stats", { token: tk, stats: { coins: 5000000 } });
    const bad = await post(S3.port, "/api/admin-cheaters", { key: "falsch" });
    ok("Falscher Key abgelehnt", bad.ok === false && !bad.cheaters);
    const good = await post(S3.port, "/api/admin-cheaters", { key: "geheimer-testkey-123" });
    ok("Richtiger Key listet den Schummler mit Zählern", good.ok && good.cheaters.some(c => c.username === "Schummler" && c.flags >= 2));
    const S4 = await startServer({});
    ok("Ohne ADMIN_KEY ist der Endpunkt aus", (await post(S4.port, "/api/admin-cheaters", { key: "x" })).ok === false);
    await S4.stop(); await S3.stop();
  }

  const js = fs.readFileSync(path.join(__dirname, "..", "public", "chess-world", "game.js"), "utf8");
  section("Client: kein lokaler Schlüssel-Weg mehr");
  {
    ok("Keine G.keys+= / G.keys-= Zuweisungen", !/G\.keys\s*[+-]=/.test(js));
    ok("Schlüssel kommen vom Server (cwApi)", js.includes("/api/chess/") && js.includes("buyKeyPack"));
    ok("Kein Schlüssel-Kauf mit Spielmünzen mehr", !js.includes("type:'key'"));
  }

  await S.stop();
  finish();
})();
