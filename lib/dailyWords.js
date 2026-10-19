"use strict";
// Tagesraetsel "Woerter finden" (Wortsuche) und "Woerter verbinden" (Silben verbinden).
// Jede Stufe (klein 5 / mittel 10 / gross 15 Woerter) hat eine eigene Kategorie, die jeden Tag wechselt.
// Woerter stehen mit EINEM Bindestrich an der Silbengrenze ("Fuss-ball"): Wortsuche nutzt das ganze Wort,
// "Verbinden" nutzt die beiden Haelften.
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function rng(seed) { let a = hashStr(seed) || 1; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const C = (id, icon, de, en, words) => ({ id, icon, name: { de, en }, words });
const CATS = {
  de: [
    C("sport", "🏅", "Sport", "Sports", "Fuß-ball Hand-ball Basket-ball Volley-ball Bad-minton Eis-hockey Rug-by Ten-nis Schwim-men Rei-ten Se-geln Tur-nen Klet-tern Ru-dern Skate-board Ski-fahren"),
    C("spices", "🌶️", "Gewürze", "Spices", "Pap-rika Kur-kuma Ing-wer Kar-damom Mus-kat Pfef-fer Sa-fran Ba-silikum Ore-gano Thy-mian Ros-marin Kori-ander Küm-mel Nel-ken Va-nille Ma-joran"),
    C("art", "🎨", "Kunst", "Art", "Pin-sel Lein-wand Aqua-rell Staf-felei Öl-farbe Bild-hauer Skulp-tur Zeich-nung Ma-lerei Mu-seum Gale-rie Por-trät Ko-llage Mosa-ik Foto-grafie Krei-de"),
    C("fruit", "🍎", "Obst", "Fruit", "Ap-fel Bir-ne Ba-nane Kir-sche Erd-beere Him-beere Brom-beere Pfir-sich Ana-nas Man-go Zit-rone Pflau-me Mel-one Ki-wi Ma-racuja Man-darine"),
    C("veg", "🥕", "Gemüse", "Vegetables", "Kar-otte Gur-ke To-mate Zwie-bel Kar-toffel Spi-nat Kür-bis Ra-dieschen Blu-menkohl Auber-gine Zuc-chini Sel-lerie Spar-gel Fen-chel Boh-nen Erb-sen"),
    C("animals", "🐘", "Tiere", "Animals", "Ele-fant Gi-raffe Kro-kodil Pin-guin Nas-horn Fla-mingo Pan-ther Del-fin Kän-guru Ko-ala Zeb-ra Gor-illa Leo-pard Pa-pagei Ot-ter Fle-dermaus"),
    C("countries", "🌍", "Länder", "Countries", "Spa-nien Ita-lien Fran-kreich Por-tugal Nor-wegen Schwe-den Fin-nland Po-len Tür-kei Ägyp-ten Bra-silien Chi-na Ja-pan In-dien Is-land Me-xiko"),
    C("cities", "🏙️", "Städte", "Cities", "Ber-lin Ham-burg Mün-chen Dres-den Leip-zig Bre-men Han-nover Stutt-gart Nürn-berg Düs-seldorf Es-sen Dort-mund Kas-sel Er-furt Ro-stock Lü-beck"),
    C("jobs", "👷", "Berufe", "Jobs", "Leh-rer Bä-cker Fri-seur Schrei-ner Ma-ler Pi-lot Poli-zist Rich-ter Ver-käufer Elek-triker Gärt-ner Kell-ner Fo-tograf Pfle-ger Schnei-der Fah-rer"),
    C("instruments", "🎸", "Instrumente", "Instruments", "Gi-tarre Kla-vier Gei-ge Flö-te Trom-pete Po-saune Schlag-zeug Har-fe Cel-lo Or-gel Kla-rinette Sa-xofon Tu-ba Man-doline Ak-kordeon Trom-mel"),
    C("vehicles", "🚗", "Fahrzeuge", "Vehicles", "Au-to Fahr-rad Mo-torrad Flug-zeug Trak-tor Lo-komotive Ru-derboot Se-gelboot Ka-nu Rake-te Ro-ller Mo-ped Kut-sche Wohn-mobil Bag-ger Last-wagen"),
    C("clothes", "👕", "Kleidung", "Clothes", "Ja-cke Ho-se Pull-over Mü-tze Hand-schuh So-cken Schu-he Kle-id Man-tel Stie-fel San-dalen Kra-watte Gür-tel Leg-gings Py-jama Ba-dehose"),
    C("furniture", "🛋️", "Möbel", "Furniture", "So-fa Ses-sel Re-gal Kom-mode Gar-derobe Spie-gel Lam-pe Tep-pich Vi-trine Hock-er Kis-sen Ma-tratze Nacht-tisch Bü-cherregal Schreib-tisch Cou-ch"),
    C("drinks", "🥤", "Getränke", "Drinks", "Was-ser Li-monade Kaf-fee Ka-kao Li-kör Sprud-el Mol-ke Cock-tail Smooth-ie Glüh-wein Ap-felsaft Es-presso Cap-puccino Ci-der Brau-se Kräu-tertee"),
    C("sweets", "🍬", "Süßigkeiten", "Sweets", "Scho-kolade Bon-bon Gum-mibär Lol-lipop Ku-chen Eis-creme Pra-line Mar-zipan Nou-gat Lak-ritz Kara-mell Waf-fel Do-nut Pud-ding Muf-fin Brow-nie"),
    C("space", "🚀", "Weltraum", "Space", "Pla-net Ra-kete Ga-laxie Ko-met Ster-ne Astro-naut Sa-tellit Ur-knall Me-teorit Son-ne Mer-kur Ve-nus Ju-piter Nep-tun Ura-nus Mond-licht"),
    C("weather", "⛅", "Wetter", "Weather", "Ge-witter Ne-bel Schnee-fall Ha-gel Don-ner Wol-ke Re-genbogen Früh-ling Som-mer Win-ter Son-ne Tau-wetter Wind-böe Dür-re Mor-gentau Eis-regen"),
    C("body", "🧍", "Körper", "Body", "Fin-ger Ell-bogen Ze-he Schul-ter Na-se Au-ge Ge-sicht Lip-pe Zun-ge Kno-chen Rü-cken Hüf-te Knö-chel Fer-se Dau-men Wa-de"),
    C("kitchen", "🍳", "Küche", "Kitchen", "Löf-fel Ga-bel Mes-ser Tel-ler Tas-se Pfan-ne Back-ofen Kühl-schrank Mi-xer Rei-be Tee-kanne Toa-ster Wa-ge Schüs-sel Kes-sel Mi-krowelle"),
    C("series", "📺", "Serien", "TV series", "Simp-sons Sher-lock Dal-las Vi-kings Go-tham Nar-cos Eu-phoria River-dale West-world Dex-ter Cas-tle Far-go So-pranos Mer-lin Han-nibal Spar-tacus"),
    C("heroes", "🦸", "Superhelden", "Superheroes", "Bat-man Super-man Spider-man Iron-man Aqua-man Ant-man Cat-woman Dare-devil Dead-pool Wolver-ine Cy-clops Hawk-eye Night-wing Ro-bin Star-fire Black-widow"),
    C("nature", "🌲", "Natur", "Nature", "Wie-se Ber-ge Hü-gel Wü-ste Vul-kan Dschun-gel In-sel Höh-le Küs-te Glet-scher Ca-nyon La-gune Ur-wald Quel-le Step-pe Was-serfall"),
    C("tech", "💻", "Technik", "Tech", "Com-puter Tas-tatur Bild-schirm Dru-cker Han-dy Ta-blet Ka-mera Lap-top Ro-boter Ser-ver Pro-gramm Brow-ser Dro-ne Ak-ku Dis-play Mo-dem"),
    C("school", "🎒", "Schule", "School", "Ta-fel Krei-de Mäpp-chen Schul-hof Ruck-sack Zir-kel Li-neal Ra-dierer Schul-bank Pau-se Füll-er Klas-se Zeug-nis Ma-the Spitz-er Heft-er")
  ],
  en: [
    C("sport", "🏅", "Sport", "Sports", "Foot-ball Base-ball Basket-ball Volley-ball Bad-minton Ten-nis Swim-ming Box-ing Cy-cling Skate-board Surf-ing Row-ing Fenc-ing Arch-ery Run-ning Hock-ey"),
    C("spices", "🌶️", "Gewürze", "Spices", "Pap-rika Tur-meric Gin-ger Car-damom Nut-meg Pep-per Saf-fron Bas-il Ore-gano Rose-mary Cori-ander Cin-namon Va-nilla Mar-joram Cu-min Pars-ley"),
    C("art", "🎨", "Kunst", "Art", "Paint-brush Can-vas Water-color Ea-sel Sculp-ture Draw-ing Gal-lery Muse-um Por-trait Col-lage Mo-saic Pho-tography Char-coal Pas-tel Car-toon Pain-ting"),
    C("fruit", "🍎", "Obst", "Fruit", "Ap-ple Ba-nana Cher-ry Straw-berry Rasp-berry Black-berry Pine-apple Man-go Lem-on Nec-tarine Mel-on Ki-wi Gra-pes Or-ange Pa-paya Tan-gerine"),
    C("veg", "🥕", "Gemüse", "Vegetables", "Car-rot Cu-cumber To-mato On-ion Po-tato Spin-ach Let-tuce Pump-kin Rad-ish Broc-coli Cel-ery Cab-bage As-paragus Zuc-chini Egg-plant Beet-root"),
    C("animals", "🐘", "Tiere", "Animals", "Ele-phant Gi-raffe Croc-odile Pen-guin Rhi-noceros Fla-mingo Pan-ther Dol-phin Kan-garoo Ko-ala Ze-bra Go-rilla Leo-pard Par-rot Ot-ter Hip-po"),
    C("countries", "🌍", "Länder", "Countries", "Ger-many Ita-ly Fran-ce Por-tugal Nor-way Swe-den Fin-land Po-land Tur-key Bra-zil Chi-na Ja-pan In-dia Ice-land Mex-ico Can-ada"),
    C("cities", "🏙️", "Städte", "Cities", "Lon-don Par-is Ber-lin Mad-rid Ams-terdam Vien-na Pra-gue Lis-bon Ath-ens Du-blin Mos-cow To-kyo Syd-ney Chi-cago Bos-ton Ve-nice"),
    C("jobs", "👷", "Berufe", "Jobs", "Teach-er Doc-tor Bak-er Pi-lot Nur-se Far-mer Pain-ter Wait-er Car-penter Ba-rber Law-yer Mus-ician Jour-nalist Ac-tor Eng-ineer Plum-ber"),
    C("instruments", "🎸", "Instrumente", "Instruments", "Gui-tar Pi-ano Vio-lin Flu-te Trum-pet Trom-bone Cel-lo Or-gan Clar-inet Sax-ophone Tu-ba Man-dolin Ac-cordion Ban-jo Ukule-le Xylo-phone"),
    C("vehicles", "🚗", "Fahrzeuge", "Vehicles", "Bi-cycle Motor-bike Air-plane Heli-copter Trac-tor Tra-in Sub-marine Lor-ry Scoo-ter Rock-et Ca-noe Am-bulance Wag-on Cara-van Sail-boat Bull-dozer"),
    C("clothes", "👕", "Kleidung", "Clothes", "Jack-et Trou-sers Sweat-er Hood-ie Glo-ves Sneak-ers Pyja-mas Cos-tume Un-derwear Over-coat Jea-ns Shor-ts Cardi-gan Waist-coat Ne-cktie Bi-kini"),
    C("furniture", "🛋️", "Möbel", "Furniture", "So-fa Arm-chair Cup-board Book-shelf Ward-robe Mir-ror Car-pet Cur-tain Mat-tress Pil-low Dres-ser Cou-ch Cab-inet Draw-er Ot-toman Blan-ket"),
    C("drinks", "🥤", "Getränke", "Drinks", "Wa-ter Le-monade Cof-fee Co-coa Milk-shake Cock-tail Smooth-ie Es-presso Cap-puccino Ci-der Lat-te So-da Ju-ice Mo-cha Cham-pagne Ice-tea"),
    C("sweets", "🍬", "Süßigkeiten", "Sweets", "Choc-olate Can-dy Lol-lipop Cook-ie Cup-cake Ice-cream Pra-line Nou-gat Lic-orice Cara-mel Waf-fle Do-nut Pud-ding Muf-fin Brow-nie Pan-cake"),
    C("space", "🚀", "Weltraum", "Space", "Pla-net Rock-et Gal-axy Co-met As-tronaut Sat-ellite Big-bang Me-teor Moon-light Mer-cury Ve-nus Ju-piter Nep-tune Ura-nus Star-light Sun-shine"),
    C("weather", "⛅", "Wetter", "Weather", "Thun-der Light-ning Rain-bow Snow-fall Hur-ricane Tor-nado Sun-shine Win-ter Sum-mer Aut-umn Hail-storm Bliz-zard Mon-soon Rain-drop Snow-flake Heat-wave"),
    C("body", "🧍", "Körper", "Body", "Fin-ger El-bow Shoul-der An-kle Fore-head Eye-brow Stom-ach Ear-lobe Nos-tril Eye-lash Thumb-nail Back-bone Knuc-kle Eye-ball Cheek-bone Hip-bone"),
    C("kitchen", "🍳", "Küche", "Kitchen", "Tea-spoon Tea-pot Sauce-pan Frying-pan Toas-ter Blen-der Kett-le Mic-rowave Fri-dge Ov-en Rolling-pin Cut-lery Mix-er La-dle Gra-ter Dish-washer"),
    C("series", "📺", "Serien", "TV series", "Simp-sons Sher-lock Dal-las Vi-kings Go-tham Nar-cos Eu-phoria River-dale West-world Dex-ter Cas-tle Far-go So-pranos Mer-lin Han-nibal Spar-tacus"),
    C("heroes", "🦸", "Superhelden", "Superheroes", "Bat-man Super-man Spider-man Iron-man Aqua-man Ant-man Cat-woman Dare-devil Dead-pool Wolver-ine Cy-clops Hawk-eye Night-wing Ro-bin Star-fire Black-widow"),
    C("nature", "🌲", "Natur", "Nature", "Mea-dow Moun-tain Des-ert Vol-cano Jun-gle Is-land Gla-cier Can-yon La-goon Wa-terfall Riv-er For-est Val-ley Sav-anna Oce-an Tun-dra"),
    C("tech", "💻", "Technik", "Tech", "Com-puter Key-board Moni-tor Prin-ter Smart-phone Tab-let Cam-era Lap-top Ro-bot Ser-ver Pro-gram Brow-ser Dro-ne Bat-tery Dis-play Mo-dem"),
    C("school", "🎒", "Schule", "School", "Black-board Note-book Pen-cil Ru-ler Eras-er Back-pack Play-ground Class-room Home-work Cal-culator Les-son Sci-ence Li-brary Unif-orm Sharp-ener Fold-er")
  ]
};
for (const lg of Object.keys(CATS)) for (const c of CATS[lg]) c.words = c.words.split(" ").filter(Boolean).map(w => { const [a, b] = w.split("-"); return { a, b, full: a + b }; });

const TIERS = { small: { n: 5, size: 8, maxLen: 8 }, medium: { n: 10, size: 10, maxLen: 10 }, big: { n: 15, size: 12, maxLen: 12 } };
const TIER_IDX = { small: 0, medium: 1, big: 2 };
const norm = w => w.toUpperCase().replace(/ß/g, "SS");
// Fuer "Woerter verbinden": nur A-Z im Feld. Umlaute werden ausgeschrieben (Baer, Oel, Uebung), ss fuer ß.
const translit = w => String(w).toUpperCase().replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ß/g, "SS").replace(/[^A-Z]/g, "");
function dayNumber(date) { const [y, m, d] = date.split("-").map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000); }
// Kategorie je Tag/Stufe: aendert sich jeden Tag, die drei Stufen eines Tages haben verschiedene Kategorien, Wortsuche und Verbinden verschiedene.
function categoryFor(date, type, diff, lang) {
  const list = CATS[lang === "en" ? "en" : "de"], n = list.length;
  const idx = (((dayNumber(date) * 5 + TIER_IDX[diff] * 7 + (type === "wv" ? 11 : 0)) % n) + n) % n;
  return list[idx];
}
function pickWords(date, type, diff, lang, extra) {
  const cat = categoryFor(date, type, diff, lang), tier = TIERS[diff];
  const pool = cat.words.filter(w => norm(w.full).length <= tier.maxLen && norm(w.full).length >= 4);
  const r = rng(type + ":" + date + ":" + diff + ":" + lang + (extra || ""));
  return { cat, words: shuffle(pool, r).slice(0, tier.n), r };
}
const DIRS_ALL = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
function makeWordSearch(date, diff, lang) {
  const tier = TIERS[diff], N = tier.size;
  const dirs = DIRS_ALL.slice(0, 4); // alle Stufen: nur Leserichtung (links->rechts, oben->unten, schraeg), nie rueckwaerts
  for (let attempt = 0; attempt < 200; attempt++) {
    const { cat, words, r } = pickWords(date, "ws", diff, lang, ":" + attempt);
    const grid = Array.from({ length: N }, () => Array(N).fill(""));
    const placed = []; let ok = true;
    const order = words.map(w => ({ w, s: norm(w.full) })).sort((x, y) => y.s.length - x.s.length);
    let dq = [];
    for (const it of order) {
      let done = false;
      if (!dq.length) dq = shuffle(dirs, r); // Richtungen reihum mischen -> gleichmaessige Mischung statt immer dieselbe
      const pref = dq.pop();
      for (let t = 0; t < 300 && !done; t++) {
        const [dr, dc] = t < 150 ? pref : dirs[Math.floor(r() * dirs.length)], L = it.s.length;
        const r0 = Math.floor(r() * N), c0 = Math.floor(r() * N);
        const r1 = r0 + dr * (L - 1), c1 = c0 + dc * (L - 1);
        if (r1 < 0 || r1 >= N || c1 < 0 || c1 >= N) continue;
        let fit = true;
        for (let k = 0; k < L; k++) { const ch = grid[r0 + dr * k][c0 + dc * k]; if (ch && ch !== it.s[k]) { fit = false; break; } }
        if (!fit) continue;
        for (let k = 0; k < L; k++) grid[r0 + dr * k][c0 + dc * k] = it.s[k];
        placed.push({ w: it.s, r: r0, c: c0, r2: r1, c2: c1 }); done = true;
      }
      if (!done) { ok = false; break; }
    }
    if (!ok) continue;
    const letters = words.map(w => norm(w.full)).join("") + "ABCDEFGHIJKLMNOPRSTUW";
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (!grid[i][j]) grid[i][j] = letters[Math.floor(r() * letters.length)];
    return { cat, pub: { size: N, grid: grid.map(row => row.join("")), words: placed.map(p => p.w).sort(), cat: { id: cat.id, icon: cat.icon, name: cat.name[lang === "en" ? "en" : "de"] } }, solution: placed };
  }
  throw new Error("Wortsuche konnte nicht erzeugt werden");
}
function makeSyllables(date, diff, lang) {
  const { cat, words, r } = pickWords(date, "wv", diff, lang, "");
  const left = shuffle(words.map(w => w.a), rng("L" + date + diff)), right = shuffle(words.map(w => w.b), rng("R" + date + diff));
  return { cat, pub: { left, right, cat: { id: cat.id, icon: cat.icon, name: cat.name[lang === "en" ? "en" : "de"] } }, solution: words.map(w => w.full.toLowerCase()) };
}
// ---- "Woerter verbinden": Boggle-artig. Buchstabenfeld, Woerter der Kategorie werden ueber benachbarte Felder (auch diagonal) gewischt. ----
// Allgemeine Woerter (ohne Kategorie) fuer "Woerter verbinden": alle Kategorie-Woerter + Kreuzwort-Antworten, nur reine Buchstaben
const _gp = {};
// Beleidigende/diskriminierende Woerter: zaehlen nie (weder lokal noch ueber die Online-Pruefung)
const BLOCK_SUB = ["NEGER", "NIGGER", "NIGGA", "ZIGEUNER", "KANAKE", "HURENSOHN", "ARSCHLOCH", "FAGGOT"];
const BLOCK_EXACT = new Set(["HURE", "FOTZE", "FICKEN", "FICK", "FICKT", "WICHSER", "SCHWUCHTEL", "NUTTE", "SPASTI", "MONGO", "CUNT", "SLUT", "WHORE", "RETARD", "KIKE", "SPIC", "CHINK"]);
function isBlocked(w) { w = String(w || "").toUpperCase(); return BLOCK_EXACT.has(w) || BLOCK_SUB.some(b => w.includes(b)); }
function generalPool(lg) {
  if (_gp[lg]) return _gp[lg];
  const set = new Set();
  CATS[lg].forEach(c => c.words.forEach(w => set.add(norm(w.full))));
  try { (require("../shared/crosswordBank.json")[lg] || []).forEach(e => set.add(norm(String(e[0])))); } catch (e) { /* optional */ }
  // zusaetzlich Woerter aus den Quizfragen (Frage, Antworten, Erklaerung) -> grosses Allgemein-Woerterbuch
  try {
    const q = require("../shared/quizQuestions.json");
    if (lg === "de") q.forEach(x => { [x.q, x.e].concat(x.a || []).forEach(t => String(t || "").split(/[^A-Za-zÄÖÜäöüß]+/).forEach(w => { if (w.length >= 3 && w.length <= 12) set.add(norm(w)); })); });
  } catch (e) { /* optional */ }
  const out = new Set(); set.forEach(w => { const t = translit(w); if (t.length >= 3 && t.length <= 12) if (!isBlocked(t)) out.add(t); });
  return (_gp[lg] = [...out].sort());
}
// n = noetig zum Loesen, max = so viele Woerter sind absichtlich im Feld (Bonus-Muenzen, wenn alle gefunden)
const FREQ = {
  de: { E: 17, N: 10, I: 7.5, S: 7, R: 7, A: 6.5, T: 6, D: 5, H: 4.5, U: 4.5, L: 3.5, C: 3, G: 3, M: 2.5, O: 2.5, B: 2, W: 2, F: 1.7, K: 1.4, Z: 1.1, P: 0.8, V: 0.7, J: 0.3 },
  en: { E: 12, T: 9, A: 8, O: 7.5, I: 7, N: 6.7, S: 6.3, H: 6, R: 6, D: 4, L: 4, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2, Y: 2, P: 1.9, B: 1.5, V: 1, K: 0.8 }
};
function pickLetter(r, lg) { const f = FREQ[lg], keys = Object.keys(f); let tot = 0; keys.forEach(k => { tot += f[k]; }); let x = r() * tot; for (const k of keys) { x -= f[k]; if (x <= 0) return k; } return "E"; }
// "Woerter verbinden" wie Boggle: immer 5x5, Punkte nach Wortlaenge. target = noetig zum Loesen, bonus = Punkte fuer die Zusatzmuenzen.
const BOG = { small: { size: 5, target: 21, bonus: 32 }, medium: { size: 5, target: 42, bonus: 63 }, big: { size: 5, target: 70, bonus: 105 } };
const NB8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const wordPoints = len => (len < 3 ? 0 : len === 3 ? 1 : len === 4 ? 2 : len === 5 ? 3 : 5); // 3 Buchstaben = 1, 4 = 2, 5 = 3, ab 6 = 5
const _pre = {};
function prefixSet(lg) { if (_pre[lg]) return _pre[lg]; const s = new Set(); generalPool(lg).forEach(w => { for (let i = 1; i <= w.length; i++) s.add(w.slice(0, i)); }); return (_pre[lg] = s); }
// alle Woerter aus dem lokalen Woerterbuch, die im Feld stehen: Map Wort -> Pfad
function solveBoggle(grid, lg) {
  const N = grid.length, pre = prefixSet(lg), pool = new Set(generalPool(lg)), out = new Map();
  const used = Array.from({ length: N }, () => Array(N).fill(false)), path = [];
  const dfs = (r, c, s) => {
    s += grid[r][c]; if (!pre.has(s)) return;
    used[r][c] = true; path.push([r, c]);
    if (s.length >= 3 && pool.has(s) && !out.has(s)) out.set(s, path.map(p => [p[0], p[1]]));
    for (const d of NB8) { const rr = r + d[0], cc = c + d[1]; if (rr >= 0 && cc >= 0 && rr < N && cc < N && !used[rr][cc]) dfs(rr, cc, s); }
    used[r][c] = false; path.pop();
  };
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) dfs(r, c, "");
  return out;
}
function makeBoggle(date, diff, lang) {
  const lg = lang === "en" ? "en" : "de", base = BOG[diff], N = base.size, pool = generalPool(lg);
  const sc = lg === "en" ? 0.7 : 1; // englisches Woerterbuch ist kleiner -> niedrigere Ziele
  const cfg = { size: N, target: Math.round(base.target * sc), bonus: Math.round(base.bonus * sc) };
  const VOW = new Set(["A", "E", "I", "O", "U"]);
  let best = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const r = rng("bog5:" + date + ":" + diff + ":" + lg + ":" + attempt);
    const grid = Array.from({ length: N }, () => Array.from({ length: N }, () => pickLetter(r, lg)));
    // garantiert ein langes Wort (6-8 Buchstaben) auf einem zusammenhaengenden Pfad
    const longs = pool.filter(w => w.length >= 6 && w.length <= 8 && /^[A-Z]+$/.test(w));
    let placed = 0;
    for (let t = 0; t < 30 && !placed && longs.length; t++) {
      const w = longs[Math.floor(r() * longs.length)]; const used = new Set(); const path = [];
      const dfs = (i, y, x) => { path.push([y, x]); used.add(y * N + x); if (i === w.length - 1) return true;
        const nb = shuffle(NB8, r); for (const [dy, dx] of nb) { const ny = y + dy, nx = x + dx; if (ny < 0 || nx < 0 || ny >= N || nx >= N || used.has(ny * N + nx)) continue; if (dfs(i + 1, ny, nx)) return true; }
        path.pop(); used.delete(y * N + x); return false; };
      if (dfs(0, Math.floor(r() * N), Math.floor(r() * N))) { path.forEach(([y, x], i) => { grid[y][x] = w[i]; }); placed = w.length; }
    }
    if (!placed) continue;
    const vow = grid.flat().filter(x => VOW.has(x)).length; if (vow < 6 || vow > 12) continue;
    const sol = solveBoggle(grid, lg); let pts = 0; sol.forEach((_, w) => { pts += wordPoints(w.length); });
    if (!best || pts > best.pts) best = { grid, sol, pts, placed };
    if (pts >= cfg.target * 1.3) break;
  }
  if (!best) throw new Error("Boggle-Feld konnte nicht erzeugt werden");
  return { pub: { size: N, grid: best.grid.map(row => row.join("")), valid: pool, n: cfg.target, max: cfg.bonus, minLen: 3, cat: null, long: best.placed }, solution: { grid: best.grid, pool: new Set(pool), n: cfg.target, max: cfg.bonus, minLen: 3, solved: best.sol } };
}
module.exports = { makeWordSearch, makeSyllables, makeBoggle, wordPoints, solveBoggle, BOG, categoryFor, CATS, TIERS, norm, translit, generalPool, isBlocked };
