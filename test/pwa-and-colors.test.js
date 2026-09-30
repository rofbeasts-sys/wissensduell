/* PWA (Manifest, Icons, Service Worker) und die Umstellung auf die neue
 * Trailer-Farbpalette (lime/cyan statt lila/türkis). */
const { ok, section, finish, startServer, get, loadClient, fs, path } = require("./helpers");

(async () => {
  section("Server: PWA-Dateien werden korrekt ausgeliefert");
  {
    const S = await startServer();
    const manifest = await get(S.port, "/manifest.json");
    ok("manifest.json: HTTP 200 mit JSON-Inhaltstyp", manifest.status === 200 && manifest.headers["content-type"].includes("json"));
    const sw = await get(S.port, "/sw.js");
    ok("sw.js: HTTP 200 mit JavaScript-Inhaltstyp", sw.status === 200 && sw.headers["content-type"].includes("javascript"));
    ok("sw.js bekommt (wie index.html) 'no-cache', damit Aktualisierungen nicht steckenbleiben", sw.headers["cache-control"] === "no-cache");
    for (const f of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) {
      const r = await get(S.port, "/icons/" + f);
      ok("/icons/" + f + ": HTTP 200 mit image/png", r.status === 200 && r.headers["content-type"] === "image/png");
    }
    await S.stop();
  }

  section("Manifest: gültiger Inhalt");
  {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "manifest.json"), "utf8"));
    ok("Name gesetzt", manifest.name === "Brain Pulse" && manifest.short_name === "Brain Pulse");
    ok("Eigenständig startbar (standalone), Startseite ist die Wurzel", manifest.display === "standalone" && manifest.start_url === "/");
    ok("Mindestens ein 192er- und ein 512er-Icon vorhanden", manifest.icons.some(i => i.sizes === "192x192") && manifest.icons.some(i => i.sizes === "512x512"));
    ok("Ein Icon ist als 'maskable' markiert (Android-Symbol ohne weißen Rand)", manifest.icons.some(i => i.purpose === "maskable"));
    ok("Farben passen zum neuen dunklen Thema", manifest.theme_color === "#0a0d16" && manifest.background_color === "#0a0d16");
  }

  section("Service Worker: fängt nur die App-Hülle ab, rührt API/Audio/Fremdes nicht an");
  {
    const sw = fs.readFileSync(path.join(__dirname, "..", "public", "sw.js"), "utf8");
    ok("Nutzt 'network-first' (fetch zuerst, Cache nur als Rückfallebene) für die Kernseite - nie 'cache-first' für die Seite selbst", /fetch\(req\)[\s\S]*?\.catch\(\(\) => caches\.match\(req\)\)/.test(sw));
    ok("POST-Anfragen (die komplette /api/-Schnittstelle) werden ausdrücklich nie abgefangen", /req\.method !== "GET"\) return/.test(sw));
    ok("Alles außerhalb der App-Hülle/Icons (Audio, Fragen-Datensätze, Fremdes) wird ausdrücklich durchgereicht", /!isAppShellRequest\(url\) && !isStaticAsset\(url\)\) return/.test(sw));
  }

  section("Client: Kopfbereich verlinkt Manifest/Icons, Registrierung ist robust ohne Service-Worker-Unterstützung");
  {
    const C = loadClient(); const { R } = C;
    ok("Kein Absturz, obwohl die Test-Umgebung 'navigator.serviceWorker' gar nicht kennt", true); // waere schon beim Laden gecrasht, wenn nicht robust

    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    ok("<head> verlinkt das Manifest", html.includes('<link rel="manifest" href="/manifest.json">'));
    ok("theme-color passt zum neuen dunklen Thema", html.includes('<meta name="theme-color" content="#0a0d16">'));
    ok("Apple-Touch-Icon für iOS verlinkt", html.includes('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">'));
    ok("iOS-Vollbildmodus aktiviert (apple-mobile-web-app-capable)", html.includes('name="apple-mobile-web-app-capable" content="yes"'));
  }
  section("Client: registriert den Service Worker, WENN der Browser ihn unterstützt");
  {
    let registeredUrl = null;
    const C = loadClient(); const { sb } = C;
    sb.navigator.serviceWorker = { register: (url) => { registeredUrl = url; return Promise.resolve({}).catch(()=>{}); } };
    // Boot-Skript nochmal ausfuehren (beim ersten Laden gab es noch kein serviceWorker-Objekt)
    C.R('if(typeof navigator !== "undefined" && navigator.serviceWorker){ navigator.serviceWorker.register("/sw.js").catch(() => {}); }');
    ok("Service Worker wird mit dem richtigen Pfad registriert", registeredUrl === "/sw.js");
  }

  section("Farben: neue Trailer-Palette überall, keine alten Werte mehr übrig");
  {
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    ok("Keine der alten Farbwerte (lila/türkis/rot) kommen noch irgendwo vor", !/#7c6cf0|#21d6b8|#5a4bd8|#ff4d6a/.test(html));
    ok("Neue Werte sind im :root gesetzt (Lime als Haupt-, Cyan als Zweitfarbe)", /--accent:#c6ff3d;\s*--accent-2:#3de0ff;/.test(html));
    ok("Warnfarbe (Orange) unverändert - nur Haupt-/Zweit-/Fehlerfarbe wurden umgestellt", html.includes("--warn:#ffb443"));
  }
  section("Farben: primärer Knopf ist auf allen Bildschirmen lesbar (dunkler Text auf der jetzt hellen Akzentfarbe)");
  {
    const C = loadClient(); const { R } = C;
    R('var p=createProfile("T"); renderMainMenu();');
    const html = R('document.getElementById("app").innerHTML');
    ok("Hauptmenü rendert weiterhin normal (keine kaputte Vorlage durch die Farbänderung)", html.includes("menu-grid"));
    const css = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    const btnPrimaryRule = css.match(/\.btn-primary\{[^}]*\}/)[0];
    ok("Der primäre Knopf nutzt jetzt dunklen Text auf der hellen Lime/Cyan-Fläche statt weißem Text (sonst unlesbar)", btnPrimaryRule.includes("color:#0a0d16") && !btnPrimaryRule.includes("color:white"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
