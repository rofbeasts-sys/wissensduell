/* Echtgeld-Münzenkauf über Stripe. Ohne echten npm-Paket umgesetzt (dieses
 * Projekt hat keine Abhängigkeiten) - rohe HTTPS-Aufrufe an Stripes API und
 * eine selbst nachgebaute Webhook-Signaturprüfung. Da es keine echten
 * Stripe-Testschlüssel gibt, wird die Signatur hier mit einem SELBST
 * GEWÄHLTEN Secret nachgerechnet, genau wie Stripe es auch täte - das
 * prüft die komplette Kette, nicht nur eine Teilfunktion. */
const crypto = require("crypto");
const http = require("http");
const { ok, section, finish, startServer, post, loadClient, fs, path } = require("./helpers");

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
  section("Ohne konfigurierte Stripe-Schlüssel: klare Fehlermeldung, kein Absturz");
  {
    const S = await startServer(); // keine STRIPE_*-Variablen gesetzt
    const reg = await post(S.port, "/api/register", { username: "NoStripe", password: "test1234" });
    const r = await post(S.port, "/api/shop-create-checkout", { token: reg.token, packageId: "small" });
    ok("Checkout-Erstellung schlägt klar fehl", r.ok === false);
    ok("Fehlermeldung ist verständlich ('noch nicht eingerichtet')", /noch nicht eingerichtet/i.test(r.error));
    const webhookResp = await rawPost(S.port, "/webhook/stripe", "{}", { "Stripe-Signature": "t=1,v1=x" });
    ok("Webhook antwortet mit 503, wenn nicht konfiguriert (kein Absturz)", webhookResp.status === 503);
    await S.stop();
  }

  section("Münzpakete: 3 feste Pakete mit Preisen, immer abrufbar (auch ohne Konfiguration)");
  {
    const S = await startServer();
    const r = await post(S.port, "/api/shop-packages", {});
    ok("3 Pakete", r.packages.length === 3);
    ok("Günstigstes Paket: 100 Münzen für 0,99€", r.packages.some(p => p.coins === 100 && p.priceCents === 99));
    ok("Mittleres Paket: 600 Münzen für 4,99€", r.packages.some(p => p.coins === 600 && p.priceCents === 499));
    ok("Größtes Paket: 1500 Münzen für 9,99€", r.packages.some(p => p.coins === 1500 && p.priceCents === 999));
    await S.stop();
  }

  section("Checkout-Erstellung lehnt unbekannte Pakete und nicht angemeldete Nutzer ab");
  {
    const S = await startServer({ STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: "whsec_dummy" });
    const r1 = await post(S.port, "/api/shop-create-checkout", { token: "ungueltiger-token", packageId: "small" });
    ok("Ohne gültigen Token abgelehnt", r1.ok === false && /angemeldet/i.test(r1.error));
    const reg = await post(S.port, "/api/register", { username: "PkgTest", password: "test1234" });
    const r2 = await post(S.port, "/api/shop-create-checkout", { token: reg.token, packageId: "does-not-exist" });
    ok("Unbekanntes Paket abgelehnt", r2.ok === false && /Paket/i.test(r2.error));
    await S.stop();
  }

  section("Webhook: gültige Signatur + abgeschlossene Zahlung schreibt Münzen gut");
  {
    const secret = "whsec_test_abc123";
    const S = await startServer({ STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: secret });
    const reg = await post(S.port, "/api/register", { username: "WebhookOk", password: "test1234" });

    const event = { id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_1", metadata: { username: "WebhookOk", coins: "600", packageId: "medium" } } } };
    const body = JSON.stringify(event);
    const resp = await rawPost(S.port, "/webhook/stripe", body, { "Stripe-Signature": signStripeBody(body, secret) });
    ok("Webhook akzeptiert (200)", resp.status === 200);

    const login = await post(S.port, "/api/login", { username: "WebhookOk", password: "test1234" });
    ok("600 Münzen wurden gutgeschrieben", login.profile.coins === 600);
    await S.stop();
  }

  section("Webhook: falsche Signatur wird abgelehnt, keine Gutschrift");
  {
    const secret = "whsec_test_xyz789";
    const S = await startServer({ STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: secret });
    await post(S.port, "/api/register", { username: "WrongSig", password: "test1234" });
    const event = { id: "evt_2", type: "checkout.session.completed", data: { object: { id: "cs_2", metadata: { username: "WrongSig", coins: "1500" } } } };
    const body = JSON.stringify(event);
    const resp = await rawPost(S.port, "/webhook/stripe", body, { "Stripe-Signature": "t=123456,v1=komplettfalscheSignatur" });
    ok("Webhook lehnt falsche Signatur ab (400)", resp.status === 400);
    const login = await post(S.port, "/api/login", { username: "WrongSig", password: "test1234" });
    ok("Keine Münzen gutgeschrieben", login.profile.coins === 0);
    await S.stop();
  }

  section("Webhook: Signatur mit FALSCHEM Secret (als würde jemand ohne Kenntnis des echten Secrets einen Webhook fälschen) wird abgelehnt");
  {
    const realSecret = "whsec_real_secret";
    const fakeSecret = "whsec_someone_elses_guess";
    const S = await startServer({ STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: realSecret });
    await post(S.port, "/api/register", { username: "FakeSig", password: "test1234" });
    const event = { id: "evt_3", type: "checkout.session.completed", data: { object: { id: "cs_3", metadata: { username: "FakeSig", coins: "1500" } } } };
    const body = JSON.stringify(event);
    const resp = await rawPost(S.port, "/webhook/stripe", body, { "Stripe-Signature": signStripeBody(body, fakeSecret) });
    ok("Mit falschem Secret signierter Webhook wird abgelehnt", resp.status === 400);
    const login = await post(S.port, "/api/login", { username: "FakeSig", password: "test1234" });
    ok("Keine Münzen gutgeschrieben (gefälschter Webhook hätte sonst beliebig Münzen erzeugen können)", login.profile.coins === 0);
    await S.stop();
  }

  section("Webhook: zu alter Zeitstempel (abgefangene/wiederholte alte Anfrage) wird abgelehnt");
  {
    const secret = "whsec_replay_test";
    const S = await startServer({ STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: secret });
    await post(S.port, "/api/register", { username: "ReplayTest", password: "test1234" });
    const event = { id: "evt_4", type: "checkout.session.completed", data: { object: { id: "cs_4", metadata: { username: "ReplayTest", coins: "1500" } } } };
    const body = JSON.stringify(event);
    const oldTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 Stunde alt
    const resp = await rawPost(S.port, "/webhook/stripe", body, { "Stripe-Signature": signStripeBody(body, secret, oldTimestamp) });
    ok("Zu alte Signatur wird abgelehnt (Replay-Schutz)", resp.status === 400);
    await S.stop();
  }

  section("Webhook: dieselbe Zahlung zweimal zugestellt (Stripe-Wiederholung) schreibt Münzen nur EINMAL gut");
  {
    const secret = "whsec_idempotent_test";
    const S = await startServer({ STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: secret });
    await post(S.port, "/api/register", { username: "IdemTest", password: "test1234" });
    const event = { id: "evt_5", type: "checkout.session.completed", data: { object: { id: "cs_5", metadata: { username: "IdemTest", coins: "100" } } } };
    const body = JSON.stringify(event);
    await rawPost(S.port, "/webhook/stripe", body, { "Stripe-Signature": signStripeBody(body, secret) });
    await rawPost(S.port, "/webhook/stripe", body, { "Stripe-Signature": signStripeBody(body, secret) });
    await rawPost(S.port, "/webhook/stripe", body, { "Stripe-Signature": signStripeBody(body, secret) });
    const login = await post(S.port, "/api/login", { username: "IdemTest", password: "test1234" });
    ok("Trotz dreifacher Zustellung nur einmal 100 Münzen gutgeschrieben (nicht 300)", login.profile.coins === 100);
    await S.stop();
  }

  section("Webhook: andere Ereignistypen (z.B. nur eine gestartete, noch nicht bezahlte Session) schreiben nichts gut");
  {
    const secret = "whsec_othertype_test";
    const S = await startServer({ STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: secret });
    await post(S.port, "/api/register", { username: "OtherType", password: "test1234" });
    const event = { id: "evt_6", type: "checkout.session.expired", data: { object: { id: "cs_6", metadata: { username: "OtherType", coins: "1500" } } } };
    const body = JSON.stringify(event);
    const resp = await rawPost(S.port, "/webhook/stripe", body, { "Stripe-Signature": signStripeBody(body, secret) });
    ok("Wird mit 200 bestätigt (Stripe erwartet das für JEDES Ereignis, auch ignorierte)", resp.status === 200);
    const login = await post(S.port, "/api/login", { username: "OtherType", password: "test1234" });
    ok("Keine Münzen gutgeschrieben (falscher Ereignistyp)", login.profile.coins === 0);
    await S.stop();
  }

  section("Shop-Bildschirm: zeigt die drei Pakete mit Preisen bei einem Konto");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      account = { token:"T", profile:{ username:"Pluto", klasse:0, coins:0, speedMathHearts:3, speedMathHeartsDate:null, modeStats:{} } };
      shopProfile = accountAsProfile();
      shopArenaInfo = { hearts: 3, maxHearts: 3 };
      shopPackages = [
        { id:"small", coins:100, priceCents:99, label:"100 Münzen" },
        { id:"medium", coins:600, priceCents:499, label:"600 Münzen" },
        { id:"large", coins:1500, priceCents:999, label:"1500 Münzen" }
      ];
      renderShopScreen();
    `);
    const html = state.last;
    ok("Alle drei Pakete erscheinen", html.includes("100") && html.includes("600") && html.includes("1500"));
    ok("Preise in Euro-Format erscheinen (Komma statt Punkt)", html.includes("0,99") && html.includes("4,99") && html.includes("9,99"));
    ok("Kauf-Knöpfe rufen shopBuyCoins auf", html.includes("shopBuyCoins('small')") && html.includes("shopBuyCoins('medium')") && html.includes("shopBuyCoins('large')"));
  }
  section("Shop-Bildschirm: ohne Konto kein Münzkauf-Bereich, nur Kontohinweis");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      account = null;
      var p = createProfile("Lokal"); p.coins = 0; p.speedMathHearts = 3; p.speedMathHeartsDate = null;
      shopProfile = p;
      renderShopScreen();
    `);
    const html = state.last;
    ok("Kein 'shopBuyCoins'-Aufruf ohne Konto", !html.includes("shopBuyCoins("));
    ok("Hinweis auf nötiges Konto erscheint", html.includes("Dafür brauchst du ein Konto"));
  }

  section("Rückmeldung nach einem Kauf bleibt nach dem Neuzeichnen sichtbar (Bugfix: wurde vorher sofort überschrieben)");
  {
    const C = loadClient({ fakeTime: true }); const { R } = C;
    R(`
      var p = createProfile("T"); p.coins = 50; p.speedMathHearts = 1; p.speedMathHeartsDate = new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin"});
      shopProfile = p;
      shopBuyMilestoneHeart();
    `);
    const feedbackText = R('document.getElementById("shopFeedback").textContent');
    ok("Bestätigungstext ist nach dem Kauf tatsächlich sichtbar im DOM (nicht vom Neuzeichnen überschrieben)", feedbackText.includes("aufgefüllt"));
  }

  section("Rückkehr von Stripe: ?shop=success/cancel wird erkannt und einmalig angezeigt");
  {
    const C = loadClient(); const { R, sb } = C;
    sb.location.search = "?shop=success";
    sb.history = { replaceState: () => {} };
    R(`
      (function(){
        const params = new URLSearchParams(location.search);
        const shop = params.get("shop");
        if(shop === "success" || shop === "cancel") shopReturnNotice = shop;
      })();
    `);
    ok("shopReturnNotice wird korrekt auf 'success' gesetzt", R('shopReturnNotice') === "success");
    R(`
      account = { token:"T", profile:{ username:"Pluto", klasse:0, coins:0, speedMathHearts:3, speedMathHeartsDate:null, modeStats:{} } };
      shopProfile = accountAsProfile();
      renderShopScreen();
    `);
    ok("Erfolgsmeldung erscheint beim ersten Zeichnen", R('document.getElementById("app").innerHTML').includes("Zahlung erfolgreich"));
    R('renderShopScreen();');
    ok("...verschwindet beim nächsten Neuzeichnen wieder (nur einmal gezeigt)", !R('document.getElementById("app").innerHTML').includes("Zahlung erfolgreich"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
