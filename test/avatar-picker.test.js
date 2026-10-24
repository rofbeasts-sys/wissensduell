/* Profilbild-Funktion: feste Emoji-Liste (keine echte Bildgenerierung/-
 * Upload) statt eines Fotos. Neue Profile bekommen zufällig eins
 * zugewiesen, änderbar über die Statistik-Seite (Antippen des Emojis neben
 * dem Namen öffnet den Picker). Funktioniert für lokale Profile UND für
 * das angemeldete Konto. */
const { ok, section, finish, loadClient, startServer, post } = require("./helpers");

(async () => {
  section("Neues Profil bekommt automatisch ein zufälliges Avatar-Emoji");
  {
    const C = loadClient(); const { R } = C;
    R('var p = createProfile("T");');
    ok("Avatar ist gesetzt und stammt aus der festen Liste", R("AVATAR_EMOJIS.includes(p.avatar)"));
  }

  section("Statistik-Karte zeigt das Avatar-Emoji neben dem Namen, antippbar");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p = createProfile("T"); renderStatistik();');
    ok("Avatar-Emoji erscheint in der Karte", state.last.includes(`class="avatar-badge"`) && state.last.includes(R("p.avatar")));
    ok("Ist antippbar und öffnet den Picker für dieses Profil", state.last.includes(`renderAvatarPicker('${R("p.id")}'`));
  }

  section("Picker-Bildschirm zeigt alle Emojis, aktuelles ist hervorgehoben, kein kaputtes Markup (Regressionstest für den gefundenen Bug)");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p = createProfile("T"); renderAvatarPicker(p.id, renderStatistik);');
    const html = state.last;
    ok("Alle 40 Emojis sind als Knöpfe vorhanden", R("AVATAR_EMOJIS").every(e => html.includes(e)));
    ok("Aktuelles Avatar ist mit btn-primary hervorgehoben", new RegExp(`btn-primary[^"]*"[^>]*>${R("p.avatar")}`).test(html));
    ok("Zurück-Knopf ist sauber vorhanden (kein abgebrochenes HTML durch gestringifyte Funktion)", html.includes('onclick="avatarPickerGoBack()"') && html.trim().endsWith("</div>"));
    ok("Keine rohe Funktionsquelle (z.B. 'function render') als sichtbarer Text im Markup gelandet", !/>\s*function render/.test(html));
  }

  section("Auswahl eines Emojis ändert und speichert den Avatar (lokales Profil)");
  {
    const C = loadClient(); const { R } = C;
    R('var p = createProfile("T"); avatarPickerChoose(p.id, "🦄", false);');
    ok("Avatar geändert", R("p.avatar") === "🦄");
    ok("In localStorage gespeichert", R(`JSON.parse(localStorage.getItem(PROFILES_KEY)||"[]").find(x=>x.id===p.id).avatar`) === "🦄");
  }

  section("'Zurück' nach der Auswahl führt wieder zum ursprünglichen Bildschirm (Statistik)");
  {
    const C = loadClient(); const { R, state } = C;
    R('var p = createProfile("T"); renderAvatarPicker(p.id, renderStatistik); avatarPickerChoose(p.id, "🦊", false); avatarPickerGoBack();');
    ok("Wieder auf der Statistik-Seite gelandet", state.last.includes("STATISTIK"));
    ok("Zeigt das neu gewählte Avatar dort", state.last.includes("🦊"));
  }

  section("Account-Profil: eigene ID 'account:<username>', Avatar wird über syncAccountStats gespeichert");
  {
    const C = loadClient(); const { R } = C;
    R(`
      account = { token:"t", profile: { username:"Acc", avatar:"🙂" } };
    `);
    const accId = R("accountAsProfile().id");
    ok("Account-Profil-ID beginnt mit 'account:'", accId.startsWith("account:"));
    R(`avatarPickerChoose("${accId}", "🐸", true);`);
    ok("account.profile.avatar wurde direkt aktualisiert", R("account.profile.avatar") === "🐸");
  }

  section("Server: Avatar wird korrekt gespeichert, übersteht einen erneuten Login, neue Konten bekommen Standard-Avatar");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "AvatarTest2", password: "test1234" });
    ok("Neues Konto hat einen Standard-Avatar (🙂)", reg.profile.avatar === "🙂");
    const save = await post(S.port, "/api/save-stats", { token: reg.token, stats: { avatar: "🦊" } });
    ok("Avatar wird korrekt gespeichert", save.profile.avatar === "🦊");
    const login = await post(S.port, "/api/login", { username: "AvatarTest2", password: "test1234" });
    ok("Avatar übersteht einen erneuten Login", login.profile.avatar === "🦊");
    await S.stop();
  }

  section("Server: unsinnige Werte werden abgelehnt, ohne abzustürzen");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "AvatarTest3", password: "test1234" });
    const bad1 = await post(S.port, "/api/save-stats", { token: reg.token, stats: { avatar: "" } });
    ok("Leerer String wird abgelehnt (bleibt beim Standard-Avatar)", bad1.ok && bad1.profile.avatar === "🙂");
    const bad2 = await post(S.port, "/api/save-stats", { token: reg.token, stats: { avatar: "x".repeat(500) } });
    ok("Extrem langer String wird abgelehnt (kein Absturz, bleibt unverändert)", bad2.ok && bad2.profile.avatar === "🙂");
    const bad3 = await post(S.port, "/api/save-stats", { token: reg.token, stats: { avatar: 12345 } });
    ok("Zahl statt String wird abgelehnt", bad3.ok && bad3.profile.avatar === "🙂");
    await S.stop();
  }

  section("accountAsProfile() gibt den Avatar korrekt weiter, mit sinnvollem Rückfallwert falls noch keiner gesetzt ist");
  {
    const C = loadClient(); const { R } = C;
    R('account = { token:"t", profile: { username:"Acc2", avatar:"🐢" } };');
    ok("Avatar wird übernommen", R("accountAsProfile().avatar") === "🐢");
    R('account = { token:"t", profile: { username:"Acc3" } };'); // kein avatar-Feld (alter Account vor diesem Feature)
    ok("Ohne gesetztes Feld gibt es einen sinnvollen Rückfallwert (kein undefined)", R("accountAsProfile().avatar") !== undefined && R("AVATAR_EMOJIS.includes(accountAsProfile().avatar)"));
  }

  section("Bild-Avatare: 9 Figuren, Dateien vorhanden, Picker zeigt Figuren + 40 Symbole, Auswahl wird gespeichert");
  {
    const fs = require("fs"), path = require("path");
    const C = loadClient(); const { R, state } = C;
    ok("9 Figuren definiert", R("AVATAR_IMAGES.length") === 9);
    const files = R("AVATAR_IMAGES.map(i => i.file)");
    ok("Jede Figur hat eine WebP-Datei", files.every(f => fs.existsSync(path.join(__dirname, "..", "public", "avatars", f + ".webp"))));
    ok("Kennungen passen in die 16-Zeichen-Grenze des Servers", R("AVATAR_IMAGES.every(i => i.id.length <= 16)"));
    R('var p = createProfile("T"); renderAvatarPicker(p.id, renderStatistik);');
    const html = state.last;
    ok("Picker zeigt alle 9 Bilder (eingebettet als Daten, unabhängig vom Ordner auf dem Server)", (html.match(/src="data:image\/webp;base64,/g) || []).length >= 9 && files.every(f => R(`AVATAR_DATA["${f}"]`).startsWith("data:image/webp;base64,")));
    ok("Picker zeigt weiterhin alle 40 Symbole", R("AVATAR_EMOJIS").every(e => html.includes(e)));
    R('avatarPickerChoose(p.id, "img:prof", false);');
    ok("Auswahl speichert die Kennung", R("p.avatar") === "img:prof");
    ok("Vorschau und hervorgehobener Knopf zeigen das Bild", R('AVATAR_DATA["prof"]').length > 1000 && state.last.includes(R('AVATAR_DATA["prof"]').slice(0, 80)) && /btn-primary[^>]*title="Professor"/.test(state.last));
    R("renderStatistik();");
    ok("Statistik zeigt das Bild statt Emoji", state.last.includes(R('AVATAR_DATA["prof"]').slice(0, 80)) && !state.last.includes("img:prof"));
    ok("Unbekannte img:-Kennung fällt auf 🙂 zurück", R('avatarHtml("img:gibtsnicht", 30)') === "🙂");
    ok("avatarBubbleHtml nutzt Bild bzw. Initialen", R('avatarBubbleHtml({name:"Zed",avatar:"img:cat"},"avatar-big",72,"ZE")').includes("data:image/webp;base64,") && R('avatarBubbleHtml({name:"Zed",avatar:"🐸"},"avatar-big",72,"ZE")').includes(">ZE<"));
  }

  section("Server: Bild-Kennung wird gespeichert und die Dateien werden als image/webp ausgeliefert");
  {
    const S = await startServer();
    const reg = await post(S.port, "/api/register", { username: "AvatarImg", password: "test1234" });
    const save = await post(S.port, "/api/save-stats", { token: reg.token, stats: { avatar: "img:robo2" } });
    ok("img:robo2 wird akzeptiert", save.profile.avatar === "img:robo2");
    const login = await post(S.port, "/api/login", { username: "AvatarImg", password: "test1234" });
    ok("übersteht erneuten Login", login.profile.avatar === "img:robo2");
    const r = await fetch(`http://127.0.0.1:${S.port}/avatars/robo2.webp`);
    ok("Datei wird mit image/webp geliefert", r.status === 200 && r.headers.get("content-type") === "image/webp");
    await S.stop();
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
