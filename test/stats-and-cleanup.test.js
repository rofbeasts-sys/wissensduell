/* Kleinere Aufräumarbeiten auf Wunsch: veraltete WLAN-/"lokal gespeichert"-
 * Hinweistexte raus, redundanter "Eigener Modus"-Text auf den Mini-Spiel-
 * Kacheln raus, Statistik zeigt bei einem angemeldeten Konto NICHT mehr
 * zusätzlich alte lokale Profile, Chronologie/Bild erraten (beide aktuell
 * nicht spielbar) verschwinden aus der Statistik, und die Statistik-Karten
 * sind jetzt farblich unterschieden statt einheitlich grau. */
const { ok, section, finish, loadClient, fs, path } = require("./helpers");

(async () => {
  section("Veraltete Hinweistexte entfernt");
  {
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    ok("'Alle Geräte müssen im selben WLAN sein...' wird nirgends mehr angezeigt (Text selbst darf im I18N-Objekt stehen bleiben, nur t('party_entry_sub') nicht mehr aufgerufen)", !html.includes("t('party_entry_sub')"));
    ok("'Andere Geräte treten mit dem Code bei...' (lobby_sub) wird nicht mehr angezeigt", !html.includes("t('lobby_sub')"));
    ok("Der Fußzeilen-Hinweis 'Alle Daten werden lokal...' (menu_footer) wird nicht mehr angezeigt", !html.includes("t('menu_footer')"));
  }

  section("'Eigener Modus – Solo oder mit Freunden' ist weg, Sperrhinweis bleibt");
  {
    const C = loadClient(); const { R, state } = C;
    R('renderMainMenu();');
    ok("Kein 'Eigener Modus' mehr auf den Mini-Spiel-Kacheln", !state.last.includes("Eigener Modus"));
    R('currentLang = "en"; renderMainMenu();');
    ok("Gesperrte Kachel (z.B. Stadt Land Fluss bei Englisch) zeigt weiterhin einen Sperrhinweis", state.last.includes("Nur auf Deutsch verfügbar"));
    R('currentLang = "de";');
  }

  section("Statistik: angemeldetes Konto zeigt NICHT mehr zusätzlich alte lokale Profile");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      account = { token:"T", profile:{ username:"Pluto", klasse:0, wins:1, losses:0, roundsPlayed:1, modeStats:{} } };
      var alt = createProfile("AltesProfil");
      renderStatistik();
    `);
    const html = state.last;
    ok("Konto-Name 'Pluto' erscheint", html.includes("Pluto"));
    ok("Das alte lokale Profil 'AltesProfil' erscheint NICHT zusätzlich", !html.includes("AltesProfil"));
  }
  section("Statistik: OHNE Konto werden lokale Profile weiterhin normal angezeigt (keine Regression)");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      account = null;
      var p1 = createProfile("Profil1");
      renderStatistik();
    `);
    ok("Lokales Profil erscheint weiterhin, wenn niemand angemeldet ist", state.last.includes("Profil1"));
  }

  section("Statistik: Chronologie und Bild erraten erscheinen nicht mehr (beide aktuell nicht spielbar)");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      account = { token:"T", profile:{ username:"Pluto", klasse:0, wins:0, losses:0, roundsPlayed:0, modeStats:{} } };
      renderStatistik();
    `);
    ok("'Chronologie' kommt nicht mehr vor", !state.last.includes("Chronologie"));
    ok("'Bild erraten' kommt nicht mehr vor", !state.last.includes("Bild erraten"));
    ok("Die weiterhin spielbaren Modi sind da (Einordnen, Mehr oder Weniger, Speed Math, Order of Speed)", ["Einordnen", "Mehr oder Weniger", "Speed Math", "Order of Speed"].every(m => state.last.includes(m)));
    ok("Musik raten ist auf Wunsch komplett entfernt, erscheint auch hier nicht mehr", !state.last.includes("Musik raten"));
  }

  section("Statistik: Karten sind jetzt farblich unterschieden (nicht mehr alle gleich)");
  {
    const C = loadClient(); const { R, state } = C;
    R(`
      account = { token:"T", profile:{ username:"Pluto", klasse:0, wins:3, losses:1, roundsPlayed:4, modeStats:{ ordering:{played:2,correct:2} } } };
      renderStatistik();
    `);
    const html = state.last;
    ok("Siege-Kachel hat eine eigene CSS-Klasse ('win')", /class="win"/.test(html));
    ok("Niederlagen-Kachel hat eine eigene CSS-Klasse ('loss')", /class="loss"/.test(html));
    ok("Siegquote-Kachel hat eine eigene CSS-Klasse ('rate')", /class="rate"/.test(html));
    ok("Spielmodus-Karten haben eine individuelle Farbe (--mc:) gesetzt", /--mc:#[0-9a-f]{6}/i.test(html));
    ok("Spielmodus-Karten zeigen jetzt auch ein Icon vor dem Namen", html.includes("🔢 Einordnen") || html.includes("🧮 Speed Math"));
  }

  finish();
})().catch(e => { console.error("TESTFEHLER:", e); process.exit(2); });
