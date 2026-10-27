/* Brainchimie: Elemente kombinieren (eigene Datei, wird von index.html geladen) */
(function(){
const D = {"e": {"Dampf": "♨️", "See": "🏞️", "Hitze": "🌡️", "Luft": "💨", "Wolke": "☁️", "Erde": "🟫", "Regen": "🌧️", "Wind": "🍃", "Sturm": "🌪️", "Blitz": "⚡", "Eis": "🧊", "Schnee": "❄️", "Sonne": "☀️", "Regenbogen": "🌈", "Meer": "🌊", "Stein": "🪨", "Sand": "🟨", "Schlamm": "🟤", "Lava": "🟧", "Berg": "⛰️", "Vulkan": "🌋", "Insel": "🏝️", "Fluss": "〰️", "Strand": "🏖️", "Gletscher": "🏔️", "Wüste": "🏜️", "Oase": "🌴", "Nebel": "🌫️", "Rauch": "🚬", "Asche": "⚫", "Tal": "🗻", "Wasserfall": "💦", "Höhle": "🕳️", "Pflanze": "🌱", "Gras": "🌿", "Baum": "🌳", "Wald": "🌲", "Blume": "🌸", "Holz": "🪵", "Dschungel": "🦜", "Palme": "🥥", "Apfel": "🍎", "Beere": "🍓", "Zitrone": "🍋", "Kirsche": "🍒", "Traube": "🍇", "Heidelbeere": "🫐", "Saft": "🧃", "Samen": "🌰", "Gemüse": "🥕", "Kürbis": "🎃", "Getreide": "🌾", "Mehl": "🥣", "Teig": "🫓", "Brot": "🍞", "Kuchen": "🎂", "Salz": "🧂", "Zucker": "🍬", "Tee": "🍵", "Kaffee": "☕", "Suppe": "🍲", "Salat": "🥗", "Honig": "🍯", "Leben": "🧬", "Alge": "🟢", "Fisch": "🐟", "Frosch": "🐸", "Echse": "🦎", "Dinosaurier": "🦖", "Drache": "🐉", "Schlange": "🐍", "Schildkröte": "🐢", "Vogel": "🐦", "Ei": "🥚", "Huhn": "🐔", "Adler": "🦅", "Eule": "🦉", "Pinguin": "🐧", "Säugetier": "🐾", "Affe": "🐒", "Hund": "🐕", "Katze": "🐈", "Kuh": "🐄", "Pferd": "🐎", "Schwein": "🐖", "Schaf": "🐑", "Hase": "🐇", "Bär": "🐻", "Wolf": "🐺", "Löwe": "🦁", "Elefant": "🐘", "Wal": "🐋", "Delfin": "🐬", "Hai": "🦈", "Krabbe": "🦀", "Biene": "🐝", "Schmetterling": "🦋", "Spinne": "🕷️", "Einhorn": "🦄", "Milch": "🥛", "Käse": "🧀", "Pizza": "🍕", "Eiscreme": "🍦", "Wolle": "🧶", "Mensch": "🧑", "Werkzeug": "🔨", "Axt": "🪓", "Baby": "👶", "Familie": "👪", "Ziegel": "🟥", "Mauer": "🧱", "Haus": "🏠", "Dorf": "🏘️", "Stadt": "🏙️", "Burg": "🏰", "Turm": "🗼", "Brücke": "🌉", "Tür": "🚪", "Glas": "🫙", "Fenster": "🪟", "Zeit": "⏳", "Metall": "🔩", "Gold": "🥇", "Münze": "🪙", "Schlüssel": "🔑", "Schatz": "💰", "Diamant": "💎", "Krone": "👑", "König": "🤴", "Königin": "👸", "Ritter": "🛡️", "Rad": "🛞", "Fahrrad": "🚲", "Maschine": "⚙️", "Uhr": "⏰", "Auto": "🚗", "Bus": "🚌", "Straße": "🛣️", "Zug": "🚂", "Motorrad": "🏍️", "Boot": "⛵", "Schiff": "🚢", "Pirat": "🏴‍☠️", "Flugzeug": "✈️", "Hubschrauber": "🚁", "Rakete": "🚀", "Satellit": "🛰️", "Astronaut": "👨‍🚀", "Fabrik": "🏭", "Strom": "🔌", "Glühbirne": "💡", "Computer": "💻", "Roboter": "🤖", "Handy": "📱", "Internet": "🌐", "Spiel": "🎮", "Fernseher": "📺", "Radio": "📻", "Kamera": "📷", "Film": "🎬", "Kino": "🍿", "Nacht": "🌙", "Tag": "🌅", "Mond": "🌕", "Stern": "⭐", "Komet": "☄️", "Planet": "🪐", "Galaxie": "🌌", "Alien": "👽", "UFO": "🛸", "Magie": "✨", "Zauberer": "🧙", "Fee": "🧚", "Geist": "👻", "Vampir": "🧛", "Werwolf": "🌝", "Zombie": "🧟", "Skelett": "💀", "Meerjungfrau": "🧜", "Traum": "💤", "Albtraum": "😱", "Idee": "💭", "Gehirn": "🧠", "Wissen": "📚", "Genie": "🧞", "Papier": "📄", "Buch": "📖", "Schule": "🏫", "Lehrer": "🎓", "Farbe": "🖌️", "Bild": "🖼️", "Künstler": "🎨", "Musik": "🎵", "Gitarre": "🎸", "Klavier": "🎹", "Trommel": "🥁", "Sänger": "🎤", "Band": "🎶", "Popstar": "🌟", "Party": "🎉", "Ball": "⚽", "Sport": "🏅", "Pokal": "🏆", "Liebe": "💞", "Herz": "❤️", "Freude": "😊", "Lachen": "😂", "Kleeblatt": "🍀", "Freundschaft": "🤝", "Geschenk": "🎁", "Schneemann": "⛄", "Weihnachtsbaum": "🎄", "Frühling": "🌷", "Sommer": "🌞", "Herbst": "🍂", "Winter": "🧣", "Medizin": "💊", "Arzt": "🩺", "Krankenhaus": "🏥", "Virus": "🦠", "Karte": "🗺️", "Kompass": "🧭", "Stoff": "🧵", "Kleidung": "👕", "Zelt": "⛺", "Ampel": "🚦", "Tunnel": "🚇", "Mikroskop": "🔬", "Labor": "🧪", "Schwimmer": "🏊", "Surfer": "🏄", "Taucher": "🤿", "Koch": "🧑‍🍳", "Bäcker": "🥖", "Bauer": "🧑‍🌾", "Musiker": "🎷", "Fotograf": "📸", "Hacker": "🕶️", "Reporter": "📰", "Detektiv": "🔍", "Feuerwehr": "🚒", "Polizei": "🚓", "Schwert": "🗡️", "Bogen": "🏹", "Kanone": "💣", "Wecker": "🔔", "Brille": "👓", "Lupe": "🔎", "Bleistift": "✏️", "Schere": "✂️", "Kerze": "🕯️", "Lagerfeuer": "🏕️", "Feuerwerk": "🎆", "Himmel": "🌤️", "Magnet": "🧲", "Batterie": "🔋", "Feuer": "🔥", "Wasser": "💧"}, "r": [["Feuer", "Wasser", "Dampf"], ["Wasser", "Wasser", "See"], ["Feuer", "Feuer", "Hitze"], ["Dampf", "Dampf", "Luft"], ["Luft", "Dampf", "Wolke"], ["See", "Hitze", "Erde"], ["Wolke", "Wasser", "Regen"], ["Luft", "Luft", "Wind"], ["Wolke", "Wind", "Sturm"], ["Sturm", "Feuer", "Blitz"], ["Wasser", "Luft", "Eis"], ["Wolke", "Eis", "Schnee"], ["Hitze", "Luft", "Sonne"], ["Regen", "Sonne", "Regenbogen"], ["See", "See", "Meer"], ["Erde", "Erde", "Stein"], ["Stein", "Luft", "Sand"], ["Erde", "Wasser", "Schlamm"], ["Erde", "Feuer", "Lava"], ["Erde", "Stein", "Berg"], ["Berg", "Lava", "Vulkan"], ["See", "Erde", "Insel"], ["Berg", "Regen", "Fluss"], ["Meer", "Sand", "Strand"], ["Berg", "Eis", "Gletscher"], ["Sand", "Sonne", "Wüste"], ["Wüste", "See", "Oase"], ["Wolke", "Erde", "Nebel"], ["Feuer", "Luft", "Rauch"], ["Holz", "Feuer", "Asche"], ["Berg", "Fluss", "Tal"], ["Berg", "Wasser", "Wasserfall"], ["Berg", "Wind", "Höhle"], ["Erde", "Regen", "Pflanze"], ["Pflanze", "Luft", "Gras"], ["Pflanze", "Sonne", "Baum"], ["Baum", "Baum", "Wald"], ["Gras", "Sonne", "Blume"], ["Baum", "Stein", "Holz"], ["Wald", "Regen", "Dschungel"], ["Strand", "Baum", "Palme"], ["Baum", "Blume", "Apfel"], ["Blume", "Gras", "Beere"], ["Apfel", "Sonne", "Zitrone"], ["Beere", "Baum", "Kirsche"], ["Beere", "Regen", "Traube"], ["Beere", "See", "Heidelbeere"], ["Apfel", "Wasser", "Saft"], ["Blume", "Erde", "Samen"], ["Erde", "Samen", "Gemüse"], ["Gemüse", "Nacht", "Kürbis"], ["Gras", "Samen", "Getreide"], ["Getreide", "Stein", "Mehl"], ["Mehl", "Wasser", "Teig"], ["Teig", "Feuer", "Brot"], ["Teig", "Apfel", "Kuchen"], ["Meer", "Sonne", "Salz"], ["Pflanze", "Zeit", "Zucker"], ["Blume", "Dampf", "Tee"], ["Samen", "Dampf", "Kaffee"], ["Gemüse", "Wasser", "Suppe"], ["Gemüse", "Gemüse", "Salat"], ["Biene", "Baum", "Honig"], ["Schlamm", "Blitz", "Leben"], ["Wasser", "Leben", "Alge"], ["See", "Leben", "Fisch"], ["Fisch", "Erde", "Frosch"], ["Frosch", "Hitze", "Echse"], ["Echse", "Vulkan", "Dinosaurier"], ["Echse", "Feuer", "Drache"], ["Echse", "Gras", "Schlange"], ["Echse", "Meer", "Schildkröte"], ["Echse", "Luft", "Vogel"], ["Vogel", "Vogel", "Ei"], ["Ei", "Hitze", "Huhn"], ["Vogel", "Berg", "Adler"], ["Vogel", "Nacht", "Eule"], ["Vogel", "Eis", "Pinguin"], ["Echse", "Wald", "Säugetier"], ["Säugetier", "Baum", "Affe"], ["Säugetier", "Gras", "Hund"], ["Säugetier", "Fisch", "Katze"], ["Säugetier", "Blume", "Kuh"], ["Säugetier", "Wind", "Pferd"], ["Säugetier", "Schlamm", "Schwein"], ["Säugetier", "Wolke", "Schaf"], ["Säugetier", "Erde", "Hase"], ["Säugetier", "Wald", "Bär"], ["Hund", "Wald", "Wolf"], ["Katze", "Sonne", "Löwe"], ["Säugetier", "Sand", "Elefant"], ["Säugetier", "Meer", "Wal"], ["Säugetier", "See", "Delfin"], ["Fisch", "Meer", "Hai"], ["Fisch", "Strand", "Krabbe"], ["Blume", "Luft", "Biene"], ["Biene", "Regenbogen", "Schmetterling"], ["Nacht", "Baum", "Spinne"], ["Pferd", "Regenbogen", "Einhorn"], ["Kuh", "Mensch", "Milch"], ["Milch", "Zeit", "Käse"], ["Brot", "Käse", "Pizza"], ["Milch", "Eis", "Eiscreme"], ["Schaf", "Werkzeug", "Wolle"], ["Affe", "Werkzeug", "Mensch"], ["Stein", "Holz", "Werkzeug"], ["Werkzeug", "Stein", "Axt"], ["Mensch", "Mensch", "Baby"], ["Baby", "Mensch", "Familie"], ["Schlamm", "Feuer", "Ziegel"], ["Stein", "Stein", "Mauer"], ["Ziegel", "Mensch", "Haus"], ["Haus", "Haus", "Dorf"], ["Dorf", "Dorf", "Stadt"], ["Haus", "Berg", "Burg"], ["Mauer", "Mauer", "Turm"], ["Fluss", "Mauer", "Brücke"], ["Holz", "Haus", "Tür"], ["Sand", "Feuer", "Glas"], ["Haus", "Glas", "Fenster"], ["Sand", "Glas", "Zeit"], ["Berg", "Feuer", "Metall"], ["Metall", "Sonne", "Gold"], ["Gold", "Werkzeug", "Münze"], ["Metall", "Tür", "Schlüssel"], ["Gold", "Insel", "Schatz"], ["Stein", "Blitz", "Diamant"], ["Gold", "Stern", "Krone"], ["Mensch", "Gold", "König"], ["Mensch", "Schatz", "Königin"], ["Mensch", "Burg", "Ritter"], ["Holz", "Werkzeug", "Rad"], ["Rad", "Rad", "Fahrrad"], ["Metall", "Rad", "Maschine"], ["Metall", "Zeit", "Uhr"], ["Maschine", "Rad", "Auto"], ["Auto", "Mensch", "Bus"], ["Auto", "Stein", "Straße"], ["Maschine", "Dampf", "Zug"], ["Fahrrad", "Maschine", "Motorrad"], ["Holz", "See", "Boot"], ["Boot", "Maschine", "Schiff"], ["Mensch", "Schiff", "Pirat"], ["Maschine", "Vogel", "Flugzeug"], ["Flugzeug", "Wind", "Hubschrauber"], ["Maschine", "Feuer", "Rakete"], ["Rakete", "Stern", "Satellit"], ["Mensch", "Rakete", "Astronaut"], ["Maschine", "Haus", "Fabrik"], ["Blitz", "Metall", "Strom"], ["Glas", "Strom", "Glühbirne"], ["Maschine", "Strom", "Computer"], ["Computer", "Mensch", "Roboter"], ["Computer", "Metall", "Handy"], ["Computer", "Computer", "Internet"], ["Computer", "Freude", "Spiel"], ["Computer", "Glas", "Fernseher"], ["Musik", "Strom", "Radio"], ["Maschine", "Glas", "Kamera"], ["Kamera", "Bild", "Film"], ["Film", "Haus", "Kino"], ["Sonne", "Erde", "Nacht"], ["Sonne", "See", "Tag"], ["Nacht", "Stein", "Mond"], ["Nacht", "Feuer", "Stern"], ["Stein", "Stern", "Komet"], ["Stern", "Erde", "Planet"], ["Stern", "Stern", "Galaxie"], ["Planet", "Leben", "Alien"], ["Alien", "Maschine", "UFO"], ["Mensch", "Stern", "Magie"], ["Mensch", "Magie", "Zauberer"], ["Magie", "Blume", "Fee"], ["Nacht", "Haus", "Geist"], ["Mensch", "Nacht", "Vampir"], ["Wolf", "Mond", "Werwolf"], ["Geist", "Mensch", "Zombie"], ["Mensch", "Zeit", "Skelett"], ["Mensch", "Fisch", "Meerjungfrau"], ["Nacht", "Wolke", "Traum"], ["Traum", "Geist", "Albtraum"], ["Mensch", "Blitz", "Idee"], ["Mensch", "Idee", "Gehirn"], ["Buch", "Mensch", "Wissen"], ["Wissen", "Idee", "Genie"], ["Holz", "Wasser", "Papier"], ["Papier", "Papier", "Buch"], ["Haus", "Wissen", "Schule"], ["Mensch", "Wissen", "Lehrer"], ["Blume", "Wasser", "Farbe"], ["Farbe", "Papier", "Bild"], ["Mensch", "Farbe", "Künstler"], ["Mensch", "Wind", "Musik"], ["Holz", "Musik", "Gitarre"], ["Musik", "Metall", "Klavier"], ["Musik", "Kuh", "Trommel"], ["Mensch", "Musik", "Sänger"], ["Sänger", "Gitarre", "Band"], ["Sänger", "Stern", "Popstar"], ["Band", "Mensch", "Party"], ["Luft", "Rad", "Ball"], ["Mensch", "Ball", "Sport"], ["Gold", "Ball", "Pokal"], ["Blume", "Mensch", "Liebe"], ["Liebe", "Zeit", "Herz"], ["Mensch", "Sonne", "Freude"], ["Freude", "Luft", "Lachen"], ["Pflanze", "Stern", "Kleeblatt"], ["Mensch", "Freude", "Freundschaft"], ["Papier", "Gold", "Geschenk"], ["Schnee", "Mensch", "Schneemann"], ["Baum", "Schnee", "Weihnachtsbaum"], ["Blume", "Zeit", "Frühling"], ["Sonne", "Zeit", "Sommer"], ["Baum", "Zeit", "Herbst"], ["Schnee", "Zeit", "Winter"], ["Pflanze", "Wissen", "Medizin"], ["Mensch", "Medizin", "Arzt"], ["Haus", "Arzt", "Krankenhaus"], ["Leben", "Luft", "Virus"], ["Papier", "Meer", "Karte"], ["Metall", "Stern", "Kompass"], ["Wolle", "Werkzeug", "Stoff"], ["Stoff", "Mensch", "Kleidung"], ["Stoff", "Holz", "Zelt"], ["Straße", "Strom", "Ampel"], ["Berg", "Straße", "Tunnel"], ["Glas", "Wissen", "Mikroskop"], ["Haus", "Mikroskop", "Labor"], ["Mensch", "See", "Schwimmer"], ["Mensch", "Meer", "Surfer"], ["Mensch", "Alge", "Taucher"], ["Mensch", "Suppe", "Koch"], ["Mensch", "Brot", "Bäcker"], ["Mensch", "Gemüse", "Bauer"], ["Mensch", "Klavier", "Musiker"], ["Mensch", "Kamera", "Fotograf"], ["Mensch", "Internet", "Hacker"], ["Mensch", "Papier", "Reporter"], ["Mensch", "Glas", "Detektiv"], ["Mensch", "Wasser", "Feuerwehr"], ["Mensch", "Straße", "Polizei"], ["Metall", "Holz", "Schwert"], ["Holz", "Wolle", "Bogen"], ["Metall", "Feuer", "Kanone"], ["Uhr", "Metall", "Wecker"], ["Mensch", "Lupe", "Brille"], ["Glas", "Holz", "Lupe"], ["Holz", "Asche", "Bleistift"], ["Metall", "Metall", "Schere"], ["Feuer", "Wolle", "Kerze"], ["Holz", "Hitze", "Lagerfeuer"], ["Feuer", "Himmel", "Feuerwerk"], ["Wolke", "Sonne", "Himmel"], ["Metall", "Stein", "Magnet"], ["Metall", "Strom", "Batterie"]]};
const BASE = ['Feuer', 'Wasser', 'Erde'];
const REC = {}; // "A|B" (sortiert) -> Ergebnis
const HOW = {}; // Ergebnis -> [A, B] (erstes Rezept)
D.r.forEach(x => { const k = [x[0], x[1]].sort().join('|'); REC[k] = x[2]; if(!HOW[x[2]]) HOW[x[2]] = [x[0], x[1]]; });
BASE.forEach(b => { delete HOW[b]; });
const ORDERED = BASE.concat(Object.keys(HOW).filter(n => !BASE.includes(n)));
const TOTAL = ORDERED.length;
const ING = new Set(); D.r.forEach(x => { ING.add(x[0]); ING.add(x[1]); });
const USES = {}; D.r.forEach(x => { [x[0], x[1]].forEach(i => { (USES[i] = USES[i] || new Set()).add(x[2]); }); });
function isDone(n){ const u = USES[n]; if(!u) return true; for(const r of u){ if(!have.includes(r)) return false; } return true; }
const ENDS_AT = 100, PIN_AT = 50, HELP_COST = 50;
const TIPS = {
"Dampf":"Heißes trifft auf Nasses und steigt als weiße Schwaden auf.",
"See":"Mehr von dem, was du trinkst, sammelt sich in einer Mulde.",
"Hitze":"Etwas Heißes verdoppelt sich, und es wird kaum auszuhalten.",
"Luft":"Weiße Schwaden lösen sich auf und werden unsichtbar.",
"Wolke":"Unsichtbares trifft auf aufsteigende Schwaden und sammelt sich am Himmel.",
"Erde":"Wo ein Gewässer austrocknet, bleibt festes Land zurück.",
"Regen":"Am Himmel wird es zu schwer, und es fällt Nasses herab.",
"Wind":"Unsichtbares trifft auf Unsichtbares, und es beginnt zu wehen.",
"Sturm":"Am Himmel zieht es sich zusammen, und dazu kommt kräftige Bewegung der Luft.",
"Blitz":"Ein wütendes Unwetter bekommt einen heißen Funken.",
"Eis":"Wenn das Nasse von kalter Luft erwischt wird, wird es hart.",
"Schnee":"Am Himmel gefriert es, und weiße Flocken fallen.",
"Sonne":"Die Hitze steigt hoch, und es wird gleißend hell am Himmel.",
"Regenbogen":"Nach dem Nass kommt das Licht, und am Himmel erscheinen bunte Streifen.",
"Meer":"Ein Gewässer wächst zu etwas, das kein Ufer mehr zu haben scheint.",
"Stein":"Festes trifft auf Festes und wird noch härter.",
"Sand":"Hartes wird von Unsichtbarem zerrieben, und es rieselt.",
"Schlamm":"Festes Land trifft auf Nasses, und es wird matschig.",
"Lava":"Festes Land trifft auf Glühendes, und es fließt, heiß und zäh.",
"Berg":"Hartes türmt sich auf Hartes, bis es in die Höhe ragt.",
"Vulkan":"Ein hoher Gipfel spuckt glühendes Gestein.",
"Insel":"Ein Stück festes Land wird von Wasser umschlossen.",
"Fluss":"Ein hoher Gipfel schickt das Himmelswasser auf den Weg ins Tal.",
"Strand":"Dort, wo sich das große Wasser und das Körnige treffen.",
"Gletscher":"Ein hoher Gipfel, der von Gefrorenem bedeckt wird und sich langsam bewegt.",
"Wüste":"Körnige Weite unter glühendem Himmel.",
"Oase":"Mitten im Trockenen steckt ein Fleck mit Wasser und Grün.",
"Nebel":"Ein Himmelsgebilde sinkt zur Erde herab.",
"Rauch":"Etwas Brennendes mischt sich mit Unsichtbarem und steigt grau auf.",
"Asche":"Das, was vom Verbrannten übrig bleibt.",
"Tal":"Zwischen hohen Gipfeln fließt etwas hindurch und hinterlässt eine Senke.",
"Wasserfall":"Nasses stürzt von einer hohen Kante in die Tiefe.",
"Höhle":"Ein Gipfel wird vom Wehen ausgehöhlt.",
"Pflanze":"Aus der Erde sprießt etwas Grünes, nachdem es geregnet hat.",
"Gras":"Grünes wird vom Wind bewegt und bedeckt weite Flächen.",
"Baum":"Das Grüne reckt sich dem Licht entgegen und wird groß und kräftig.",
"Wald":"Viele hohe Gewächse stehen dicht beieinander.",
"Blume":"Etwas Grünes bekommt Licht und zeigt bunte Blätter.",
"Holz":"Das, woraus ein Stamm besteht, wenn man ihn zerlegt.",
"Dschungel":"Dichte Wälder, in denen es ständig nass und heiß ist.",
"Palme":"Ein Gewächs, das am Wasser steht und Nüsse trägt.",
"Apfel":"Ein Gewächs trägt Blüten und danach eine rote oder grüne Frucht.",
"Beere":"Kleine, saftige Früchte, die zwischen Blüten und Gräsern wachsen.",
"Zitrone":"Eine Frucht, die durch Sonne gelb und sauer wird.",
"Kirsche":"Kleine rote Frucht mit Stein, die an einem Gewächs hängt.",
"Traube":"Kleine runde Früchte an einer Rebe, die nach Regen prall werden.",
"Heidelbeere":"Kleine blaue Früchte, die an feuchten Orten wachsen.",
"Saft":"Das Flüssige, das du aus einer Frucht gewinnst.",
"Samen":"Eine Blüte schenkt dir ein Korn, aus dem wieder etwas wächst.",
"Gemüse":"Was auf dem Acker aus dem Korn wird und auf den Teller kommt.",
"Kürbis":"Orange Frucht, die man zu einem bestimmten Gruselfest aushöhlt.",
"Getreide":"Hohe Gräser, deren Körner man erntet.",
"Mehl":"Körner, die zu feinem weißen Pulver gemahlen werden.",
"Teig":"Pulver trifft auf Nasses und wird zu einer knetbaren Masse.",
"Brot":"Eine knetbare Masse wird gebacken und bekommt eine Kruste.",
"Kuchen":"Eine Masse zum Backen, mit einer Frucht obendrauf.",
"Salz":"Wenn die Sonne das große Wasser eintrocknen lässt, bleibt etwas Weißes zurück.",
"Zucker":"Etwas Gewachsenes wird mit der Zeit zu süßen Kristallen.",
"Tee":"Ein blühendes Gewächs wird mit heißem Dampf aufgegossen.",
"Kaffee":"Ein Korn wird heiß aufgegossen und macht munter.",
"Suppe":"Etwas Gemüse schwimmt in heißer Flüssigkeit.",
"Salat":"Viel Frisches vom Acker landet gemischt in einer Schüssel.",
"Honig":"Süßes, das ein fleißiges Insekt in einem hohlen Stamm sammelt.",
"Leben":"Matsch bekommt einen Funken, und plötzlich regt sich etwas.",
"Alge":"Das erste grüne Lebendige im Nassen.",
"Fisch":"Etwas Lebendiges, das im Gewässer schwimmt.",
"Frosch":"Etwas, das im Wasser anfängt und an Land hüpft.",
"Echse":"Ein Tier, das aus dem Nassen kommt, Wärme liebt und Schuppen hat.",
"Dinosaurier":"Ein riesiges Schuppentier aus alter Zeit, das neben feuerspeienden Bergen lebte.",
"Drache":"Ein schuppiges Wesen, das Flammen spuckt.",
"Schlange":"Ein schuppiges Tier ohne Beine, das sich im Grünen versteckt.",
"Schildkröte":"Ein schuppiges Tier im großen Wasser mit einem Panzer.",
"Vogel":"Ein schuppiges Tier erobert den Himmel und bekommt Federn.",
"Ei":"Das, woraus das nächste Federtier schlüpft.",
"Huhn":"Ein Ei wird warm gehalten, und es schlüpft ein Tier, das auf dem Hof lebt.",
"Adler":"Ein Federtier, das hoch über den Gipfeln kreist.",
"Eule":"Ein Federtier, das nur in der Dunkelheit ruft.",
"Pinguin":"Ein Federtier, das nicht fliegt und sich im Eis wohlfühlt.",
"Säugetier":"Ein Tier, das mitten im Dickicht Milch gibt.",
"Affe":"Ein Säugetier, das gern in Wipfeln klettert.",
"Hund":"Ein Säugetier, das auf Wiesen tobt und treu ist.",
"Katze":"Ein Säugetier, das gern Fisch frisst und schnurrt.",
"Kuh":"Ein Säugetier, das auf Blumenwiesen weidet und Milch gibt.",
"Pferd":"Ein Säugetier, das schnell wie der Wind läuft.",
"Schwein":"Ein Säugetier, das sich gern im Matsch suhlt.",
"Schaf":"Ein Säugetier, das aussieht wie eine Wolke mit Beinen.",
"Hase":"Ein Säugetier, das in der Erde wohnt und lange Ohren hat.",
"Bär":"Ein großes Säugetier, das im Dickicht Winterschlaf hält.",
"Wolf":"Ein Hund, der im Dunkel des Waldes heult.",
"Löwe":"Eine große Katze mit Mähne, die in der Sonne döst.",
"Elefant":"Ein riesiges Säugetier mit Rüssel, das durch Sand und Savanne zieht.",
"Wal":"Das größte Säugetier im Ozean.",
"Delfin":"Ein verspieltes Säugetier, das im Wasser springt.",
"Hai":"Ein Fisch mit scharfen Zähnen im Ozean.",
"Krabbe":"Ein Meerestier, das seitlich am Ufer läuft.",
"Biene":"Ein kleines Flugtier, das von Blüte zu Blüte summt.",
"Schmetterling":"Ein Insekt mit bunten Flügeln, schillernd wie ein Himmelsbogen.",
"Spinne":"Ein Tier, das nachts in Ästen Netze spinnt.",
"Einhorn":"Ein Pferd aus Märchen mit Horn und Farbenpracht.",
"Milch":"Das Weiße, das ein Tier vom Hof gibt und der Mensch trinkt.",
"Käse":"Milch, die mit der Zeit fest wird und reift.",
"Pizza":"Ein Teigfladen mit etwas Geschmolzenem darauf.",
"Eiscreme":"Süßes aus Milch, das kalt gefroren wird.",
"Wolle":"Das, was man vom Schaf nimmt, um daraus Fäden zu machen.",
"Mensch":"Ein Affe lernt, ein Hilfsmittel zu benutzen, und wird zu jemandem, der denkt.",
"Werkzeug":"Hartes und Gewachsenes verbinden sich zu etwas, womit man arbeitet.",
"Axt":"Ein Hilfsmittel mit scharfer Schneide, um Stämme zu fällen.",
"Baby":"Zwei Menschen schenken einem kleinen Wesen das Leben.",
"Familie":"Ein kleines Wesen und seine Großen leben zusammen.",
"Ziegel":"Matsch wird im Feuer gebrannt und zu rotem Baustein.",
"Mauer":"Harte Brocken werden aufeinander geschichtet.",
"Haus":"Aus roten Bausteinen entsteht ein Zuhause für jemanden.",
"Dorf":"Mehrere Zuhause stehen nebeneinander.",
"Stadt":"Viele Dörfer wachsen zu einem großen Ort zusammen.",
"Burg":"Ein Zuhause, das auf einem Gipfel thront und Verteidigung bietet.",
"Turm":"Mauern werden übereinander gestapelt, und es wird hoch.",
"Brücke":"Mauerwerk führt über ein fließendes Gewässer.",
"Tür":"Das Holz, das den Eingang eines Zuhauses verschließt.",
"Glas":"Körniges wird im Feuer geschmolzen und durchsichtig.",
"Fenster":"Durch das Durchsichtige schaut man aus dem Zuhause.",
"Zeit":"Körner rieseln durch zwei Kammern aus Durchsichtigem.",
"Metall":"Aus dem Berg geschmolzen, hart und glänzend.",
"Gold":"Ein edles Metall, das in der Sonne glänzt.",
"Münze":"Ein Stück Edles, das mit einem Hilfsmittel geprägt wird.",
"Schlüssel":"Ein Stück Metall, das zu einem Eingang passt.",
"Schatz":"Etwas Edles, vergraben auf einem Eiland.",
"Diamant":"Ein Stein, der durch Gewalt von oben extrem hart und glitzernd wird.",
"Krone":"Edles Metall, das ein Herrscher auf dem Kopf trägt, besetzt mit Funkeln der Nacht.",
"König":"Ein Mensch, der so reich ist, dass er herrscht.",
"Königin":"Ein Mensch, die mit Schätzen über ein Reich herrscht.",
"Ritter":"Ein Mensch, der eine Burg verteidigt.",
"Rad":"Etwas Rundes, das aus Stamm und Hilfsmittel entsteht und rollt.",
"Fahrrad":"Zwei Runde hintereinander, und du trittst in die Pedale.",
"Maschine":"Hartes Metall und Rundes ergeben etwas, das Arbeit abnimmt.",
"Uhr":"Ein Metallding, das die Zeit misst.",
"Auto":"Eine Maschine auf Rädern, die dich fährt.",
"Bus":"Ein großes Fahrzeug, das viele Leute mitnimmt.",
"Straße":"Ein Weg aus hartem Belag, auf dem Fahrzeuge rollen.",
"Zug":"Eine Maschine, die dampfend auf Schienen fährt.",
"Motorrad":"Ein Zweirad mit Motor.",
"Boot":"Aus Holz gebaut, schwimmt es auf dem Wasser.",
"Schiff":"Ein großes Wasserfahrzeug mit Motor.",
"Pirat":"Ein Mensch, der auf See nach Schätzen jagt.",
"Flugzeug":"Eine Maschine, die wie ein Federtier den Himmel erobert.",
"Hubschrauber":"Ein Flugding, das mit wirbelnden Blättern senkrecht aufsteigt.",
"Rakete":"Eine Maschine, die mit Feuer ins All strebt.",
"Satellit":"Eine Maschine, die im All um die Erde kreist.",
"Astronaut":"Ein Mensch, der mit einer Rakete ins All reist.",
"Fabrik":"Ein Haus voller Maschinen, die etwas herstellen.",
"Strom":"Die Kraft aus einem Blitz, die in Metall fließt.",
"Glühbirne":"Durchsichtiges, in dem ein Draht leuchtet, wenn Energie fließt.",
"Computer":"Eine Maschine mit Strom, die rechnen kann.",
"Roboter":"Ein Rechner mit Armen, der wie ein Mensch arbeitet.",
"Handy":"Ein Rechner aus Metall, den du in der Hosentasche trägst.",
"Internet":"Viele Rechner, die weltweit miteinander verbunden sind.",
"Spiel":"Ein Rechner, der dich zum Lachen und Mitfiebern bringt.",
"Fernseher":"Ein Rechner hinter Glas, der Bilder zeigt.",
"Radio":"Ein Gerät mit Strom, das Klänge sendet.",
"Kamera":"Eine Maschine mit Glas, die Augenblicke festhält.",
"Film":"Bewegte Augenblicke, die eine Kamera aufnimmt.",
"Kino":"Ein Haus, in dem Bewegtes auf einer Leinwand läuft.",
"Nacht":"Wenn die Sonne hinter der Erde verschwindet.",
"Tag":"Wenn die Sonne über dem Wasser aufgeht.",
"Mond":"Ein heller Stein, der in der Dunkelheit leuchtet.",
"Stern":"Ein Feuerpunkt in der Dunkelheit, weit weg.",
"Komet":"Ein Stein mit Schweif, der durchs All rast.",
"Planet":"Ein Stern und ein Stück Land, das ihn umkreist.",
"Galaxie":"Unzählige Funkelpunkte, die sich im All drehen.",
"Alien":"Etwas Lebendiges von einem fernen Himmelskörper.",
"UFO":"Ein fremdes Wesen und eine fliegende Maschine in Scheibenform.",
"Magie":"Ein Mensch bekommt die Kraft der funkelnden Sterne.",
"Zauberer":"Ein Mensch, der mit Magie umgeht.",
"Fee":"Ein winziges magisches Wesen aus Blütenstaub.",
"Geist":"Etwas Durchscheinendes, das nachts im Haus spukt.",
"Vampir":"Ein Mensch der Dunkelheit, der nicht in die Sonne darf.",
"Werwolf":"Ein heulendes Wesen, das bei Vollmond erwacht.",
"Zombie":"Ein Mensch, der als Geist zurückkehrt und torkelt.",
"Skelett":"Ein Mensch, von dem nach langer Zeit nur noch Knochen bleiben.",
"Meerjungfrau":"Halb Mensch, halb Flosse.",
"Traum":"Etwas, das du in der Nacht auf einer Wolke erlebst.",
"Albtraum":"Ein Traum, in dem ein Geist erscheint.",
"Idee":"Ein Mensch bekommt einen plötzlichen Einfall wie ein Blitz.",
"Gehirn":"Das Organ im Kopf, in dem Ideen entstehen.",
"Wissen":"Das, was ein Mensch aus Büchern lernt.",
"Genie":"Wissen und Einfall zusammen machen jemanden außergewöhnlich schlau.",
"Papier":"Aus Holz und Wasser wird etwas Dünnes zum Beschreiben.",
"Buch":"Viele beschriebene Seiten in einem Einband.",
"Schule":"Ein Haus, in dem man Wissen erwirbt.",
"Lehrer":"Ein Mensch, der Wissen weitergibt.",
"Farbe":"Aus Blütenblättern, verdünnt, entsteht etwas zum Malen.",
"Bild":"Farbe auf Papier.",
"Künstler":"Ein Mensch, der mit Farbe arbeitet.",
"Musik":"Ein Mensch lässt den Wind in Töne verwandeln.",
"Gitarre":"Ein Holzkörper, der mit Saiten Musik macht.",
"Klavier":"Ein großes Instrument aus Metall und Tasten.",
"Trommel":"Ein Instrument, das mit Fell gespannt ist und Rhythmus gibt.",
"Sänger":"Ein Mensch, der mit der Stimme Musik macht.",
"Band":"Ein Sänger und seine Instrumente zusammen.",
"Popstar":"Ein Sänger, der wie ein Stern am Himmel funkelt.",
"Party":"Eine Band spielt, und viele Menschen feiern.",
"Ball":"Etwas Rundes, mit Luft gefüllt.",
"Sport":"Ein Mensch jagt einem runden Ding nach.",
"Pokal":"Ein goldener Preis für den Sieger.",
"Liebe":"Zwischen einem Menschen und einer Blüte wächst Gefühl.",
"Herz":"Das Gefühl, das mit der Zeit schlägt.",
"Freude":"Ein Mensch, der strahlt wie die Sonne.",
"Lachen":"Freude, die man in die Luft ruft.",
"Kleeblatt":"Ein Gewächs mit vier Blättern, das Glück bringt.",
"Freundschaft":"Menschen, die Freude teilen.",
"Geschenk":"Etwas Verpacktes, das einen Schatz enthält.",
"Schneemann":"Ein Mensch aus Schnee.",
"Weihnachtsbaum":"Ein Baum im Schnee, geschmückt zum Fest.",
"Frühling":"Wenn Blumen mit der Zeit erwachen.",
"Sommer":"Wenn die Sonne lange scheint.",
"Herbst":"Wenn die Bäume ihre Blätter verlieren.",
"Winter":"Wenn Schnee fällt und die Zeit kalt wird.",
"Medizin":"Aus Pflanzen und Wissen entsteht etwas, das heilt.",
"Arzt":"Ein Mensch, der Kranke heilt.",
"Krankenhaus":"Ein Haus, in dem Ärzte arbeiten.",
"Virus":"Winzig, schwebt in der Luft und macht krank.",
"Karte":"Papier, das das Meer zeigt.",
"Kompass":"Metall, das mit den Sternen die Richtung zeigt.",
"Stoff":"Aus Wolle und Werkzeug wird etwas Gewebtes.",
"Kleidung":"Gewebtes, das ein Mensch trägt.",
"Zelt":"Stoff und Holz zu einem mobilen Dach.",
"Ampel":"Strom an der Straße, die dir sagt, wann du gehst.",
"Tunnel":"Eine Straße durch einen Berg.",
"Mikroskop":"Glas und Wissen, die das Winzige zeigen.",
"Labor":"Ein Haus mit Mikroskop, in dem geforscht wird.",
"Schwimmer":"Ein Mensch, der im Wasser paddelt.",
"Surfer":"Ein Mensch, der auf den Wellen reitet.",
"Taucher":"Ein Mensch, der nach Algen und Tiefe schaut.",
"Koch":"Ein Mensch, der Suppen und Gerichte zubereitet.",
"Bäcker":"Ein Mensch, der Brot formt.",
"Bauer":"Ein Mensch, der Gemüse anbaut.",
"Musiker":"Ein Mensch am Klavier.",
"Fotograf":"Ein Mensch mit Kamera.",
"Hacker":"Ein Mensch im Netz.",
"Reporter":"Ein Mensch, der auf Papier berichtet.",
"Detektiv":"Ein Mensch mit scharfem Blick durch Glas.",
"Feuerwehr":"Menschen, die mit Wasser Flammen löschen.",
"Polizei":"Menschen, die auf der Straße für Ordnung sorgen.",
"Schwert":"Eine scharfe Klinge mit Holzgriff.",
"Bogen":"Ein gebogenes Holz mit Sehne, das Pfeile schießt.",
"Kanone":"Ein Metallrohr, das mit Feuer schießt.",
"Wecker":"Eine Uhr, die dich weckt.",
"Brille":"Ein Mensch, der durch Glas besser sieht.",
"Lupe":"Ein Glas in einem Holzring, das vergrößert.",
"Bleistift":"Holz mit Graphit zum Schreiben.",
"Schere":"Zwei Klingen, die schneiden.",
"Kerze":"Ein Docht aus Wolle, der brennt.",
"Lagerfeuer":"Holz, das draußen brennt.",
"Feuerwerk":"Funken, die am Himmel explodieren.",
"Himmel":"Das, was über den Wolken leuchtet.",
"Magnet":"Metall, das andere Metallstücke anzieht.",
"Batterie":"Metall, in dem Energie gespeichert ist."
};
const EN_NAMES = {"Feuer": "Fire", "Wasser": "Water", "Erde": "Earth", "Dampf": "Steam", "See": "Lake", "Hitze": "Heat", "Luft": "Air", "Wolke": "Cloud", "Regen": "Rain", "Wind": "Wind", "Sturm": "Storm", "Blitz": "Lightning", "Eis": "Ice", "Schnee": "Snow", "Sonne": "Sun", "Regenbogen": "Rainbow", "Meer": "Sea", "Stein": "Stone", "Sand": "Sand", "Schlamm": "Mud", "Lava": "Lava", "Berg": "Mountain", "Vulkan": "Volcano", "Insel": "Island", "Fluss": "River", "Strand": "Beach", "Gletscher": "Glacier", "Wüste": "Desert", "Oase": "Oasis", "Nebel": "Fog", "Rauch": "Smoke", "Asche": "Ash", "Tal": "Valley", "Wasserfall": "Waterfall", "Höhle": "Cave", "Pflanze": "Plant", "Gras": "Grass", "Baum": "Tree", "Wald": "Forest", "Blume": "Flower", "Holz": "Wood", "Dschungel": "Jungle", "Palme": "Palm", "Apfel": "Apple", "Beere": "Berry", "Zitrone": "Lemon", "Kirsche": "Cherry", "Traube": "Grape", "Heidelbeere": "Blueberry", "Saft": "Juice", "Samen": "Seed", "Gemüse": "Vegetable", "Kürbis": "Pumpkin", "Getreide": "Grain", "Mehl": "Flour", "Teig": "Dough", "Brot": "Bread", "Kuchen": "Cake", "Salz": "Salt", "Zucker": "Sugar", "Tee": "Tea", "Kaffee": "Coffee", "Suppe": "Soup", "Salat": "Salad", "Honig": "Honey", "Leben": "Life", "Alge": "Algae", "Fisch": "Fish", "Frosch": "Frog", "Echse": "Lizard", "Dinosaurier": "Dinosaur", "Drache": "Dragon", "Schlange": "Snake", "Schildkröte": "Turtle", "Vogel": "Bird", "Ei": "Egg", "Huhn": "Chicken", "Adler": "Eagle", "Eule": "Owl", "Pinguin": "Penguin", "Säugetier": "Mammal", "Affe": "Monkey", "Hund": "Dog", "Katze": "Cat", "Kuh": "Cow", "Pferd": "Horse", "Schwein": "Pig", "Schaf": "Sheep", "Hase": "Rabbit", "Bär": "Bear", "Wolf": "Wolf", "Löwe": "Lion", "Elefant": "Elephant", "Wal": "Whale", "Delfin": "Dolphin", "Hai": "Shark", "Krabbe": "Crab", "Biene": "Bee", "Schmetterling": "Butterfly", "Spinne": "Spider", "Einhorn": "Unicorn", "Milch": "Milk", "Käse": "Cheese", "Pizza": "Pizza", "Eiscreme": "Ice Cream", "Wolle": "Wool", "Mensch": "Human", "Werkzeug": "Tool", "Axt": "Axe", "Baby": "Baby", "Familie": "Family", "Ziegel": "Brick", "Mauer": "Wall", "Haus": "House", "Dorf": "Village", "Stadt": "City", "Burg": "Castle", "Turm": "Tower", "Brücke": "Bridge", "Tür": "Door", "Glas": "Glass", "Fenster": "Window", "Zeit": "Time", "Metall": "Metal", "Gold": "Gold", "Münze": "Coin", "Schlüssel": "Key", "Schatz": "Treasure", "Diamant": "Diamond", "Krone": "Crown", "König": "King", "Königin": "Queen", "Ritter": "Knight", "Rad": "Wheel", "Fahrrad": "Bicycle", "Maschine": "Machine", "Uhr": "Clock", "Auto": "Car", "Bus": "Bus", "Straße": "Road", "Zug": "Train", "Motorrad": "Motorcycle", "Boot": "Boat", "Schiff": "Ship", "Pirat": "Pirate", "Flugzeug": "Airplane", "Hubschrauber": "Helicopter", "Rakete": "Rocket", "Satellit": "Satellite", "Astronaut": "Astronaut", "Fabrik": "Factory", "Strom": "Electricity", "Glühbirne": "Light Bulb", "Computer": "Computer", "Roboter": "Robot", "Handy": "Phone", "Internet": "Internet", "Spiel": "Game", "Fernseher": "TV", "Radio": "Radio", "Kamera": "Camera", "Film": "Movie", "Kino": "Cinema", "Nacht": "Night", "Tag": "Day", "Mond": "Moon", "Stern": "Star", "Komet": "Comet", "Planet": "Planet", "Galaxie": "Galaxy", "Alien": "Alien", "UFO": "UFO", "Magie": "Magic", "Zauberer": "Wizard", "Fee": "Fairy", "Geist": "Ghost", "Vampir": "Vampire", "Werwolf": "Werewolf", "Zombie": "Zombie", "Skelett": "Skeleton", "Meerjungfrau": "Mermaid", "Traum": "Dream", "Albtraum": "Nightmare", "Idee": "Idea", "Gehirn": "Brain", "Wissen": "Knowledge", "Genie": "Genius", "Papier": "Paper", "Buch": "Book", "Schule": "School", "Lehrer": "Teacher", "Farbe": "Paint", "Bild": "Picture", "Künstler": "Artist", "Musik": "Music", "Gitarre": "Guitar", "Klavier": "Piano", "Trommel": "Drum", "Sänger": "Singer", "Band": "Band", "Popstar": "Pop Star", "Party": "Party", "Ball": "Ball", "Sport": "Sport", "Pokal": "Trophy", "Liebe": "Love", "Herz": "Heart", "Freude": "Joy", "Lachen": "Laughter", "Kleeblatt": "Clover", "Freundschaft": "Friendship", "Geschenk": "Gift", "Schneemann": "Snowman", "Weihnachtsbaum": "Christmas Tree", "Frühling": "Spring", "Sommer": "Summer", "Herbst": "Autumn", "Winter": "Winter", "Medizin": "Medicine", "Arzt": "Doctor", "Krankenhaus": "Hospital", "Virus": "Virus", "Karte": "Map", "Kompass": "Compass", "Stoff": "Fabric", "Kleidung": "Clothes", "Zelt": "Tent", "Ampel": "Traffic Light", "Tunnel": "Tunnel", "Mikroskop": "Microscope", "Labor": "Laboratory", "Schwimmer": "Swimmer", "Surfer": "Surfer", "Taucher": "Diver", "Koch": "Cook", "Bäcker": "Baker", "Bauer": "Farmer", "Musiker": "Musician", "Fotograf": "Photographer", "Hacker": "Hacker", "Reporter": "Reporter", "Detektiv": "Detective", "Feuerwehr": "Fire Brigade", "Polizei": "Police", "Schwert": "Sword", "Bogen": "Bow", "Kanone": "Cannon", "Wecker": "Alarm Clock", "Brille": "Glasses", "Lupe": "Magnifier", "Bleistift": "Pencil", "Schere": "Scissors", "Kerze": "Candle", "Lagerfeuer": "Campfire", "Feuerwerk": "Fireworks", "Himmel": "Sky", "Magnet": "Magnet", "Batterie": "Battery"};
const EN_TIPS = {"Dampf": "Something hot meets something wet and rises as white wisps.", "See": "More of what you drink collects in a hollow.", "Hitze": "Something hot doubles up, and it becomes hard to bear.", "Luft": "White wisps fade away and become invisible.", "Wolke": "The invisible meets rising wisps and gathers in the sky.", "Erde": "Where a body of water dries up, solid land is left behind.", "Regen": "It gets too heavy in the sky, and something wet falls down.", "Wind": "The invisible meets the invisible, and it starts to blow.", "Sturm": "Things darken in the sky, and strong movement of the air joins in.", "Blitz": "A raging bad-weather system gets a hot spark.", "Eis": "When the wet is caught by cold air, it turns hard.", "Schnee": "It freezes in the sky, and white flakes fall.", "Sonne": "The heat rises, and it becomes dazzlingly bright in the sky.", "Regenbogen": "After the wet comes the light, and colorful stripes appear in the sky.", "Meer": "A body of water grows into something that seems to have no shore.", "Stein": "Solid meets solid and becomes even harder.", "Sand": "Something hard is ground down by the invisible, and it trickles.", "Schlamm": "Solid land meets something wet, and it gets squishy.", "Lava": "Solid land meets something glowing, and it flows, hot and thick.", "Berg": "Hard piles up on hard until it towers high.", "Vulkan": "A high peak spits out glowing rock.", "Insel": "A piece of solid land is surrounded by water.", "Fluss": "A high peak sends the sky's water on its way down into the valley.", "Strand": "Where the big water and the grainy stuff meet.", "Gletscher": "A high peak covered with frozen stuff that moves slowly.", "Wüste": "Grainy vastness under a glowing sky.", "Oase": "In the middle of the dry land lies a spot with water and green.", "Nebel": "Something from the sky sinks down to the ground.", "Rauch": "Something burning mixes with the invisible and rises in gray.", "Asche": "What is left over from something burned.", "Tal": "Something flows between high peaks and leaves a hollow.", "Wasserfall": "Something wet plunges from a high edge into the depths.", "Höhle": "A peak is hollowed out by the blowing.", "Pflanze": "Something green sprouts from the earth after it has rained.", "Gras": "Green stuff swayed by the wind covers wide areas.", "Baum": "The green stretches toward the light and grows big and strong.", "Wald": "Many tall growing things stand close together.", "Blume": "Something green gets light and shows colorful petals.", "Holz": "What a trunk is made of when you cut it up.", "Dschungel": "Dense forests where it is constantly wet and hot.", "Palme": "A plant that stands by the water and bears nuts.", "Apfel": "A plant bears blossoms and then a red or green fruit.", "Beere": "Small, juicy fruits that grow among flowers and grasses.", "Zitrone": "A fruit that turns yellow and sour in the sun.", "Kirsche": "Small red fruit with a pit that hangs from a plant.", "Traube": "Small round fruits on a vine that swell up after rain.", "Heidelbeere": "Small blue fruits that grow in damp places.", "Saft": "The liquid you get from a fruit.", "Samen": "A blossom gives you a grain from which something grows again.", "Gemüse": "What the grain becomes in the field and ends up on your plate.", "Kürbis": "An orange fruit that is hollowed out for a certain spooky festival.", "Getreide": "Tall grasses whose grains are harvested.", "Mehl": "Grains ground into a fine white powder.", "Teig": "Powder meets something wet and becomes a kneadable mass.", "Brot": "A kneadable mass is baked and gets a crust.", "Kuchen": "A mixture for baking, with a fruit on top.", "Salz": "When the sun dries up the big water, something white is left behind.", "Zucker": "Something that grew turns into sweet crystals over time.", "Tee": "A flowering plant is steeped in hot steam.", "Kaffee": "A grain is steeped hot and wakes you up.", "Suppe": "Some vegetables swim in hot liquid.", "Salat": "Lots of fresh things from the field end up mixed in a bowl.", "Honig": "Sweet stuff that a busy insect collects in a hollow trunk.", "Leben": "Mud gets a spark, and suddenly something stirs.", "Alge": "The first green living thing in the wet.", "Fisch": "Something alive that swims in the water.", "Frosch": "Something that starts in the water and hops on land.", "Echse": "An animal that comes from the wet, loves warmth and has scales.", "Dinosaurier": "A huge scaly animal from ancient times that lived beside fire-spitting mountains.", "Drache": "A scaly creature that spits flames.", "Schlange": "A scaly animal without legs that hides in the green.", "Schildkröte": "A scaly animal in the big water with a shell.", "Vogel": "A scaly animal conquers the sky and gets feathers.", "Ei": "What the next feathered animal hatches from.", "Huhn": "An egg is kept warm, and an animal that lives on the farm hatches.", "Adler": "A feathered animal that circles high above the peaks.", "Eule": "A feathered animal that only calls in the dark.", "Pinguin": "A feathered animal that doesn't fly and feels at home in the ice.", "Säugetier": "An animal that gives milk in the middle of the thicket.", "Affe": "A mammal that loves to climb in the treetops.", "Hund": "A mammal that romps in meadows and is loyal.", "Katze": "A mammal that likes to eat fish and purrs.", "Kuh": "A mammal that grazes in flower meadows and gives milk.", "Pferd": "A mammal that runs fast as the wind.", "Schwein": "A mammal that likes to wallow in the mud.", "Schaf": "A mammal that looks like a cloud with legs.", "Hase": "A mammal that lives in the ground and has long ears.", "Bär": "A big mammal that hibernates in the thicket.", "Wolf": "A dog that howls in the dark of the forest.", "Löwe": "A big cat with a mane that dozes in the sun.", "Elefant": "A huge mammal with a trunk that wanders through sand and savanna.", "Wal": "The biggest mammal in the ocean.", "Delfin": "A playful mammal that jumps in the water.", "Hai": "A fish with sharp teeth in the ocean.", "Krabbe": "A sea creature that walks sideways along the shore.", "Biene": "A small flying animal that buzzes from blossom to blossom.", "Schmetterling": "An insect with colorful wings, shimmering like an arc in the sky.", "Spinne": "An animal that spins webs in branches at night.", "Einhorn": "A horse from fairy tales with a horn and a splendor of colors.", "Milch": "The white stuff that a farm animal gives and humans drink.", "Käse": "Milk that becomes firm and ripens over time.", "Pizza": "A flat dough base with something melted on top.", "Eiscreme": "Sweet stuff made from milk that is frozen cold.", "Wolle": "What you take from the sheep to make threads from.", "Mensch": "A monkey learns to use a tool and becomes someone who thinks.", "Werkzeug": "Hard and grown things join to make something you work with.", "Axt": "A tool with a sharp blade for felling trunks.", "Baby": "Two humans give life to a little being.", "Familie": "A little being and its grown-ups live together.", "Ziegel": "Mud is fired in the flames and becomes a red building block.", "Mauer": "Hard chunks are stacked on top of each other.", "Haus": "Red building blocks become a home for someone.", "Dorf": "Several homes stand next to each other.", "Stadt": "Many villages grow together into one big place.", "Burg": "A home that sits on a peak and offers defense.", "Turm": "Walls are stacked on top of each other, and it gets tall.", "Brücke": "Stonework leads across a flowing body of water.", "Tür": "The wood that closes the entrance of a home.", "Glas": "Grainy stuff is melted in the fire and becomes see-through.", "Fenster": "Through the see-through stuff you look out of the home.", "Zeit": "Grains trickle through two chambers of see-through stuff.", "Metall": "Melted out of the mountain, hard and shiny.", "Gold": "A precious metal that glitters in the sun.", "Münze": "A piece of precious stuff stamped with a tool.", "Schlüssel": "A piece of metal that fits an entrance.", "Schatz": "Something precious, buried on an island.", "Diamant": "A stone that becomes extremely hard and sparkling through force from above.", "Krone": "Precious metal that a ruler wears on the head, set with sparkles of the night.", "König": "A human so rich that he rules.", "Königin": "A human who rules a realm with treasures.", "Ritter": "A human who defends a castle.", "Rad": "Something round that is made from a trunk and a tool and rolls.", "Fahrrad": "Two round things one behind the other, and you push the pedals.", "Maschine": "Hard metal and something round make something that takes over work.", "Uhr": "A metal thing that measures time.", "Auto": "A machine on wheels that drives you.", "Bus": "A big vehicle that takes many people along.", "Straße": "A path with a hard surface on which vehicles roll.", "Zug": "A machine that steams along on rails.", "Motorrad": "A two-wheeler with an engine.", "Boot": "Built from wood, it floats on the water.", "Schiff": "A big watercraft with an engine.", "Pirat": "A human who hunts for treasure at sea.", "Flugzeug": "A machine that conquers the sky like a feathered animal.", "Hubschrauber": "A flying thing that rises straight up with whirling blades.", "Rakete": "A machine that strives into space with fire.", "Satellit": "A machine that circles the Earth in space.", "Astronaut": "A human who travels into space with a rocket.", "Fabrik": "A house full of machines that make things.", "Strom": "The power from a lightning bolt that flows in metal.", "Glühbirne": "See-through stuff in which a wire glows when energy flows.", "Computer": "A machine with power that can calculate.", "Roboter": "A calculator with arms that works like a human.", "Handy": "A metal calculator that you carry in your pocket.", "Internet": "Many calculators connected to each other worldwide.", "Spiel": "A calculator that makes you laugh and root.", "Fernseher": "A calculator behind glass that shows pictures.", "Radio": "A device with power that broadcasts sounds.", "Kamera": "A machine with glass that captures moments.", "Film": "Moving moments that a camera records.", "Kino": "A house where moving things play on a screen.", "Nacht": "When the sun disappears behind the Earth.", "Tag": "When the sun rises over the water.", "Mond": "A bright stone that shines in the dark.", "Stern": "A point of fire in the darkness, far away.", "Komet": "A stone with a tail that races through space.", "Planet": "A star and a piece of land that circles it.", "Galaxie": "Countless sparkling points that spin in space.", "Alien": "Something living from a distant heavenly body.", "UFO": "A strange being and a flying machine in disc shape.", "Magie": "A human receives the power of the twinkling stars.", "Zauberer": "A human who works with magic.", "Fee": "A tiny magical being made of flower dust.", "Geist": "Something see-through that haunts the house at night.", "Vampir": "A human of the darkness who must not go into the sun.", "Werwolf": "A howling creature that awakens at full moon.", "Zombie": "A human who returns as a ghost and staggers.", "Skelett": "A human of whom only bones are left after a long time.", "Meerjungfrau": "Half human, half fin.", "Traum": "Something you experience at night on a cloud.", "Albtraum": "A dream in which a ghost appears.", "Idee": "A human gets a sudden thought like a flash of lightning.", "Gehirn": "The organ in the head where ideas are born.", "Wissen": "What a human learns from books.", "Genie": "Knowledge and a flash of insight together make someone exceptionally smart.", "Papier": "From wood and water becomes something thin to write on.", "Buch": "Many written pages in a cover.", "Schule": "A house where you gain knowledge.", "Lehrer": "A human who passes on knowledge.", "Farbe": "From flower petals, diluted, becomes something to paint with.", "Bild": "Paint on paper.", "Künstler": "A human who works with paint.", "Musik": "A human turns the wind into tones.", "Gitarre": "A wooden body that makes music with strings.", "Klavier": "A big instrument made of metal and keys.", "Trommel": "An instrument stretched with skin that gives rhythm.", "Sänger": "A human who makes music with the voice.", "Band": "A singer and their instruments together.", "Popstar": "A singer who sparkles like a star in the sky.", "Party": "A band plays, and many people celebrate.", "Ball": "Something round, filled with air.", "Sport": "A human chases after a round thing.", "Pokal": "A golden prize for the winner.", "Liebe": "A feeling grows between a human and a blossom.", "Herz": "The feeling that beats with time.", "Freude": "A human who beams like the sun.", "Lachen": "Joy that you call out into the air.", "Kleeblatt": "A plant with four leaves that brings luck.", "Freundschaft": "Humans who share joy.", "Geschenk": "Something wrapped that contains a treasure.", "Schneemann": "A human made of snow.", "Weihnachtsbaum": "A tree in the snow, decorated for the festival.", "Frühling": "When flowers awaken with time.", "Sommer": "When the sun shines for long.", "Herbst": "When the trees lose their leaves.", "Winter": "When snow falls and the time turns cold.", "Medizin": "From plants and knowledge becomes something that heals.", "Arzt": "A human who heals the sick.", "Krankenhaus": "A house where doctors work.", "Virus": "Tiny, floats in the air and makes you sick.", "Karte": "Paper that shows the sea.", "Kompass": "Metal that shows the direction with the stars.", "Stoff": "From wool and a tool becomes something woven.", "Kleidung": "Woven stuff that a human wears.", "Zelt": "Fabric and wood make a mobile roof.", "Ampel": "Power by the road that tells you when to go.", "Tunnel": "A road through a mountain.", "Mikroskop": "Glass and knowledge that show the tiny.", "Labor": "A house with a microscope where research is done.", "Schwimmer": "A human who paddles in the water.", "Surfer": "A human who rides the waves.", "Taucher": "A human who looks for algae and the deep.", "Koch": "A human who prepares soups and dishes.", "Bäcker": "A human who shapes bread.", "Bauer": "A human who grows vegetables.", "Musiker": "A human at the piano.", "Fotograf": "A human with a camera.", "Hacker": "A human in the net.", "Reporter": "A human who reports on paper.", "Detektiv": "A human with a sharp look through glass.", "Feuerwehr": "Humans who put out flames with water.", "Polizei": "Humans who keep order on the road.", "Schwert": "A sharp blade with a wooden grip.", "Bogen": "A curved wood with a string that shoots arrows.", "Kanone": "A metal tube that shoots with fire.", "Wecker": "A clock that wakes you up.", "Brille": "A human who sees better through glass.", "Lupe": "A glass in a wooden ring that enlarges.", "Bleistift": "Wood with graphite for writing.", "Schere": "Two blades that cut.", "Kerze": "A wick of wool that burns.", "Lagerfeuer": "Wood that burns outdoors.", "Feuerwerk": "Sparks that explode in the sky.", "Himmel": "What shines above the clouds.", "Magnet": "Metal that attracts other pieces of metal.", "Batterie": "Metal in which energy is stored."};
const isEn = () => { try{ return typeof L === 'function' && L(0, 1) === 1; }catch(e){ return false; } };
const nm = n => (isEn() && EN_NAMES[n]) || n;
const UI_RULES = [
  [/^(\W*)Zurück zum Kombinieren$/, '$1Back to combining'], [/^(\W*)Zurück$/, '$1Back'], [/entdeckt/, 'discovered'], [/^KOMBINIEREN$/, 'COMBINE'],
  [/^Tipp des Tages · gratis$/, 'Tip of the day · free'], [/^Hilfe · (\d+) Münzen$/, 'Help · $1 coins'], [/^SAMMLUNG · ALLE ELEMENTE$/, 'COLLECTION · ALL ELEMENTS'], [/^SAMMLUNG$/, 'COLLECTION'],
  [/^Fertige markieren: An$/, 'Mark finished: On'], [/^Fertige markieren: Aus$/, 'Mark finished: Off'], [/Fertige markieren ab (\d+) Elementen/, 'Mark finished from $1 elements'],
  [/^DEINE ELEMENTE/, 'YOUR ELEMENTS'], [/· lange drücken zeigt das Rezept/, '· long-press shows the recipe'],
  [/^(\W*)ab (\d+)$/, '$1from $2'], [/^Fixiert$/, 'Pinned'], [/^Fixieren$/, 'Pin'], [/^Nichts gefunden\.$/, 'Nothing found.'],
  [/^TIPP DES TAGES$/, 'TIP OF THE DAY'], [/^Mit deinen Elementen gibt es gerade nichts Neues zu finden\. Entdecke erst mehr oder komm später wieder\.$/, 'There is nothing new to find with your elements right now. Discover more first or come back later.'],
  [/^Mit deinen Elementen gibt es gerade nichts Neues zu finden\. Du zahlst nichts\.$/, 'There is nothing new to find with your elements right now. You pay nothing.'],
  [/^Dein Tipp von heute ist schon gelöst\.$/, "Today's tip is already solved."], [/^Morgen gibt es einen neuen\.$/, 'A new one comes tomorrow.'], [/^Was ist gesucht\?$/, 'What are we looking for?'],
  [/^Das ist dein Tipp von heute\.$/, "That is today's tip."], [/^Hilfe$/, 'Help'], [/^Melde dich an, um Hilfe mit Münzen zu kaufen\.$/, 'Log in to buy help with coins.'],
  [/^Du bekommst zwei Elemente, die zusammen etwas Neues ergeben\.$/, 'You get two elements that make something new together.'], [/^(\d+) Münzen · du hast (\d+)$/, '$1 coins · you have $2'],
  [/^Kaufen$/, 'Buy'], [/^Abbrechen$/, 'Cancel'], [/^NEU ENTDECKT$/, 'NEWLY DISCOVERED'], [/^\+(\d+) Münzen$/, '+$1 coins'], [/^Weiter$/, 'Continue'], [/^Grundelement$/, 'Base element'],
  [/^Nicht genug Münzen\.$/, 'Not enough coins.'], [/^Probiere diese zwei\.$/, 'Try these two.'], [/^Fixieren ab (\d+) Elementen \((\d+)\/(\d+)\)\.$/, 'Pinning unlocks at $1 elements ($2/$3).'],
  [/^Wähle erst ein Element\.$/, 'Pick an element first.'], [/^Nichts passiert\.$/, 'Nothing happened.'], [/^(.*) hast du schon\.$/, 'You already have $1.']
];
function trStr(t){ if(!isEn() || !t) return t; for(const [re, to] of UI_RULES){ if(re.test(t)){ t = t.replace(re, to); } } return t; }
function trUI(root){
  if(!isEn()) return;
  try{
    const w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    const nodes = []; let n; while((n = w.nextNode())) nodes.push(n);
    nodes.forEach(x => { const raw = x.nodeValue, t = raw.trim(); if(!t) return; const r = trStr(t); if(r !== t) x.nodeValue = raw.replace(t, r); });
    (root || document.body).querySelectorAll('input[placeholder]').forEach(i => { if(i.placeholder === 'Suchen …') i.placeholder = 'Search …'; });
  }catch(e){}
}
const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ukey(){ try{ return 'bp_chem_' + ((typeof account !== 'undefined' && account && account.profile && account.profile.username) || 'guest'); }catch(e){ return 'bp_chem_guest'; } }
function load(){ try{ const v = JSON.parse(localStorage.getItem(ukey())); if(Array.isArray(v) && v.length) return BASE.filter(b => !v.includes(b)).concat(v); }catch(e){} return BASE.slice(); }
function save(){ try{ localStorage.setItem(ukey(), JSON.stringify(have)); }catch(e){} }
let have = BASE.slice(), slotA = null, slotB = null, filter = '', pressTimer = null, longDone = false, pinA = false, showEnds = false;
try{ showEnds = localStorage.getItem('bp_chem_ends') === '1'; }catch(e){}

window.startChem = function(){
  have = load(); slotA = slotB = null; filter = ''; pinA = false;
  if(typeof setAudioZone === 'function') setAudioZone('menu');
  draw();
};
function draw(){
  renderApp(`<div class="panel"><style>
    .ch-top{display:flex;justify-content:space-between;align-items:center}.ch-bar{height:8px;background:rgba(255,255,255,.1);border-radius:9px;margin:10px 0}.ch-bar i{display:block;height:100%;background:linear-gradient(90deg,#c6ff3d,#3de0ff);border-radius:9px}
    .ch-row{display:flex;gap:10px;align-items:center;justify-content:center;margin:14px 0 10px}.ch-slot{width:96px;height:96px;border:2px dashed rgba(255,255,255,.3);border-radius:20px;display:grid;place-items:center;font-size:40px;background:rgba(255,255,255,.04);cursor:pointer;text-align:center;line-height:1.1}
    .ch-slot small{display:block;font-size:12px;font-weight:700}.ch-plus{font-size:28px;color:var(--text-dim);font-weight:900}
    .ch-els{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ch-el{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.15);border-radius:14px;padding:7px 10px;font-weight:700;font-size:13px;color:#fff;font-family:inherit;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
    .ch-el i{font-style:normal;font-size:20px}.ch-el.sel{border-color:#c6ff3d}
    .ch-msg{text-align:center;min-height:22px;margin-top:8px;font-weight:800;font-size:14px}.ch-pop{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:9000;display:flex;align-items:center;justify-content:center;padding:24px}
    .ch-card{background:#161d38;border:2px solid #c6ff3d;border-radius:22px;padding:22px;text-align:center;box-shadow:0 0 40px rgba(198,255,61,.25);max-width:320px;width:100%}
    @keyframes chShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}.shake{animation:chShake .35s}
  </style>
    <button class="btn btn-ghost" style="padding:7px 14px;font-size:13px;margin-bottom:10px" onclick="renderMainMenu()">&larr; Zurück</button>
    <div class="ch-top"><b style="font-size:20px">BRAINCHIMIE</b><span style="font-size:12px;color:var(--text-dim)">${have.length} / ${TOTAL} ${'entdeckt'}</span></div>
    <div style="margin:6px 0 2px"><span class="zpb-i" style="margin-left:0">⭐ +10 ZP ${'pro neues Element'}</span></div>
    <div class="ch-bar"><i style="width:${Math.round(have.length / TOTAL * 100)}%"></i></div>
    <div class="ch-row" style="align-items:flex-start"><div style="text-align:center"><div class="ch-slot" id="chA" onclick="chClear('A')" style="${pinA ? 'border-style:solid;border-color:#c6ff3d' : ''}">${slot(slotA)}</div><button class="btn ${pinA ? 'btn-primary' : 'btn-ghost'}" style="margin-top:6px;padding:5px 12px;font-size:12px" onclick="chPin()">${have.length < PIN_AT ? '&#128274; ab ' + PIN_AT : (pinA ? 'Fixiert' : 'Fixieren')}</button></div><span class="ch-plus" style="margin-top:34px">+</span><div class="ch-slot" id="chB" onclick="chClear('B')">${slot(slotB)}</div></div>
    <button class="btn btn-primary btn-block" onclick="chCombine()" ${slotA && slotB ? '' : 'style="opacity:.5"'}>KOMBINIEREN</button>
    <button class="btn btn-ghost btn-block" style="margin-top:8px;font-size:13px;border-color:#c6ff3d" onclick="chTip()">Tipp des Tages · gratis</button>
    <button class="btn btn-ghost btn-block" style="margin-top:8px;font-size:13px;border-color:#ffc446" onclick="chHelp()">Hilfe · ${HELP_COST} Münzen</button>
    <div class="ch-msg" id="chMsg"></div>
    <button class="btn btn-ghost btn-block" style="margin-bottom:10px" onclick="chList()">SAMMLUNG · ALLE ELEMENTE</button>
    <input type="text" id="chSearch" placeholder="Suchen …" value="${E(filter)}" oninput="chFilter(this.value)" style="margin-top:6px;width:100%;background:#0b1022;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:10px;font-size:14px;font-family:inherit">
    ${have.length >= ENDS_AT ? `<button class="btn ${showEnds ? 'btn-primary' : 'btn-ghost'} btn-block" style="margin-top:8px;font-size:13px" onclick="chEnds()">Fertige markieren: ${showEnds ? 'An' : 'Aus'}</button>` : `<div style="margin-top:8px;font-size:12px;color:var(--text-dim);text-align:center">&#128274; Fertige markieren ab ${ENDS_AT} Elementen (${have.length}/${ENDS_AT})</div>`}
    <div class="picker-sub" style="margin-top:12px;font-weight:800">DEINE ELEMENTE <span style="font-weight:600;opacity:.7">· lange drücken zeigt das Rezept</span></div>
    <div class="ch-els" id="chEls">${els()}</div>
    <button class="btn btn-ghost btn-block" style="margin-top:16px" onclick="renderMainMenu()">Zurück</button></div>`);
  bind(); trUI();
}
window.chEnds = function(){ showEnds = !showEnds; try{ localStorage.setItem('bp_chem_ends', showEnds ? '1' : '0'); }catch(e){} draw(); };
function slot(n){ return n ? `<div><div>${D.e[n] || ''}</div><small>${E(nm(n))}</small></div>` : ''; }
function els(){
  const f = filter.trim().toLowerCase();
  const list = have.filter(n => !f || n.toLowerCase().includes(f) || nm(n).toLowerCase().includes(f));
  return list.map(n => `<button class="ch-el ${n === slotA || n === slotB ? 'sel' : ''}" data-n="${E(n)}"><i>${D.e[n] || ''}</i>${E(nm(n))}${showEnds && have.length >= ENDS_AT && isDone(n) ? '<span style="font-size:15px;color:#3dff7a;font-weight:900;line-height:1">&#10003;</span>' : ''}</button>`).join('') || '<span style="color:var(--text-dim);font-size:13px">Nichts gefunden.</span>';
}
function bind(){
  const box = document.getElementById('chEls'); if(!box) return;
  box.querySelectorAll('.ch-el').forEach(b => {
    const n = b.dataset.n;
    const start = () => { longDone = false; clearTimeout(pressTimer); pressTimer = setTimeout(() => { longDone = true; showHow(n); }, 450); };
    const end = () => clearTimeout(pressTimer);
    b.addEventListener('pointerdown', start); b.addEventListener('pointerup', end); b.addEventListener('pointerleave', end); b.addEventListener('pointercancel', end);
    b.addEventListener('contextmenu', e => e.preventDefault());
    b.addEventListener('click', () => { if(longDone){ longDone = false; return; } pick(n); });
  });
}
function pick(n){
  if(pinA && slotA){ slotB = n; }
  else if(!slotA) slotA = n; else if(!slotB) slotB = n; else { slotA = n; slotB = null; }
  draw();
}
function helpPair(){
  const c = D.r.filter(x => !have.includes(x[2]) && have.includes(x[0]) && have.includes(x[1]));
  return c.length ? c[Math.floor(Math.random() * c.length)] : null;
}

function tipKey(){ return ukey() + '_tip'; }
function today(){ const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function tipTarget(){ const r = D.r.find(x => !have.includes(x[2]) && have.includes(x[0]) && have.includes(x[1])); return r ? r[2] : null; }
window.chTip = function(){
  let st = null; try{ st = JSON.parse(localStorage.getItem(tipKey())); }catch(e){}
  let target = null, again = false;
  if(st && st.d === today()){ again = true; target = st.n; }
  else { target = tipTarget(); if(target){ try{ localStorage.setItem(tipKey(), JSON.stringify({d: today(), n: target})); }catch(e){} } }
  const p = document.createElement('div'); p.className = 'ch-pop'; p.id = 'chPop';
  const close = "document.getElementById('chPop').remove()";
  let body;
  if(!target) body = '<div style="margin-top:10px;color:var(--text-dim)">Mit deinen Elementen gibt es gerade nichts Neues zu finden. Entdecke erst mehr oder komm später wieder.</div>';
  else if(have.includes(target)) body = '<div style="margin-top:10px;color:#3dff7a;font-weight:800">Dein Tipp von heute ist schon gelöst.</div><div style="margin-top:6px;color:var(--text-dim)">Morgen gibt es einen neuen.</div>';
  else body = '<div style="margin-top:10px;font-size:12px;color:var(--text-dim)">Was ist gesucht?</div><div style="margin-top:6px;font-size:17px;font-weight:800;line-height:1.35">' + E((isEn() ? EN_TIPS[target] : TIPS[target]) || 'Probiere zwei deiner Elemente.') + '</div>' + (again ? '<div style="margin-top:10px;font-size:12px;color:var(--text-dim)">Das ist dein Tipp von heute.</div>' : '');
  p.innerHTML = '<div class="ch-card" style="border-color:#c6ff3d"><div style="font-size:12px;color:#c6ff3d;font-weight:800;letter-spacing:.1em">TIPP DES TAGES</div>' + body + '<button class="btn btn-primary btn-block" style="margin-top:14px" onclick="' + close + '">OK</button></div>';
  p.onclick = e => { if(e.target === p) p.remove(); };
  document.body.appendChild(p); trUI(p);
};
window.chHelp = function(){
  let coins = 0, ok = false;
  try{ if(typeof fruitCoins === 'function'){ coins = fruitCoins(); ok = typeof account !== 'undefined' && !!account; } }catch(e){}
  const p = document.createElement('div'); p.className = 'ch-pop'; p.id = 'chPop';
  const close = "document.getElementById('chPop').remove()";
  if(!ok){ p.innerHTML = `<div class="ch-card" style="border-color:rgba(255,255,255,.3)"><div style="font-size:20px;font-weight:900">Hilfe</div><div style="margin-top:10px;color:var(--text-dim)">Melde dich an, um Hilfe mit Münzen zu kaufen.</div><button class="btn btn-ghost btn-block" style="margin-top:14px" onclick="${close}">OK</button></div>`; }
  else if(!helpPair()){ p.innerHTML = `<div class="ch-card" style="border-color:rgba(255,255,255,.3)"><div style="font-size:20px;font-weight:900">Hilfe</div><div style="margin-top:10px;color:var(--text-dim)">Mit deinen Elementen gibt es gerade nichts Neues zu finden. Du zahlst nichts.</div><button class="btn btn-ghost btn-block" style="margin-top:14px" onclick="${close}">OK</button></div>`; }
  else { p.innerHTML = `<div class="ch-card" style="border-color:#ffc446"><div style="font-size:20px;font-weight:900">Hilfe</div><div style="margin-top:10px">Du bekommst zwei Elemente, die zusammen etwas Neues ergeben.</div><div style="margin-top:8px;color:#ffc446;font-weight:800">${HELP_COST} Münzen · du hast ${coins}</div><button class="btn btn-primary btn-block" style="margin-top:14px;${coins < HELP_COST ? 'opacity:.5' : ''}" onclick="chBuyHelp()">Kaufen</button><button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="${close}">Abbrechen</button></div>`; }
  p.onclick = e => { if(e.target === p) p.remove(); };
  document.body.appendChild(p); trUI(p);
};
window.chBuyHelp = function(){
  const pr = helpPair(), pop = document.getElementById('chPop'); if(!pr){ if(pop) pop.remove(); return; }
  let r = null; try{ r = fruitPay(HELP_COST); }catch(e){}
  if(!r || !r.ok){ if(typeof toastMsg === 'function') toastMsg(trStr('Nicht genug Münzen.')); return; }
  try{ if(typeof achvRecord === 'function') achvRecord({ t: 'chem', help: 1 }); }catch(e){}
  if(pop) pop.remove();
  slotA = pr[0]; slotB = pr[1]; pinA = false; draw(); msg('Probiere diese zwei.', '#ffc446');
};
window.chPin = function(){ if(have.length < PIN_AT){ msg('Fixieren ab ' + PIN_AT + ' Elementen (' + have.length + '/' + PIN_AT + ').', '#9aa4c4'); return; } if(!slotA){ msg('Wähle erst ein Element.', '#9aa4c4'); return; } pinA = !pinA; draw(); };
window.chClear = function(w){ if(w === 'A'){ slotA = null; pinA = false; } else slotB = null; draw(); };
window.chFilter = function(v){ filter = v; const b = document.getElementById('chEls'); if(b){ b.innerHTML = els(); bind(); } };
function msg(t, col){ const m = document.getElementById('chMsg'); if(m){ m.textContent = trStr(t); m.style.color = col || '#fff'; } }
window.chCombine = function(){
  if(!slotA || !slotB) return;
  const res = REC[[slotA, slotB].sort().join('|')];
  if(!res){ if(typeof sfx === 'function') sfx('wrong'); ['chA', 'chB'].forEach(id => { const e = document.getElementById(id); if(e){ e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); } }); msg('Nichts passiert.', '#ff7a8a'); if(!pinA) slotA = null; slotB = null; setTimeout(draw, 700); return; }
  const a = slotA, b = slotB; if(!pinA) slotA = null; slotB = null;
  if(have.includes(res)){ if(typeof sfx === 'function') sfx('tap'); draw(); msg(nm(res) + ' hast du schon.', '#9aa4c4'); return; }
  have.push(res); save();
  try{ if(typeof window.zpChemFound === 'function') window.zpChemFound(res); }catch(e){}
  try{ if(typeof achvRecord === 'function') achvRecord({ t: 'chem', found: have.length }); }catch(e){}
  let coin = 0;
  try{ if(typeof fruitPay === 'function'){ const r = fruitPay(-2); if(r && r.ok) coin = 2; } }catch(e){}
  if(typeof sfx === 'function') sfx('ding');
  draw();
  const p = document.createElement('div'); p.className = 'ch-pop'; p.id = 'chPop';
  p.innerHTML = `<div class="ch-card"><div style="font-size:12px;color:#c6ff3d;font-weight:800;letter-spacing:.1em">NEU ENTDECKT</div><div style="font-size:68px;margin:8px 0">${D.e[res] || ''}</div><div style="font-size:26px;font-weight:900">${E(nm(res))}</div><div style="color:var(--text-dim);font-size:13px;margin-top:4px">${E(nm(a))} + ${E(nm(b))}</div>${coin ? `<div style="margin-top:8px;color:#ffc446;font-weight:800">+${coin} Münzen</div>` : ''}<button class="btn btn-primary btn-block" style="margin-top:14px" onclick="document.getElementById('chPop').remove()">Weiter</button></div>`;
  p.onclick = e => { if(e.target === p) p.remove(); };
  document.body.appendChild(p); trUI(p);
};
window.chList = function(){
  const got = new Set(have);
  renderApp(`<div class="panel"><style>.ch-top{display:flex;justify-content:space-between;align-items:center}.ch-bar{height:8px;background:rgba(255,255,255,.1);border-radius:9px;margin:10px 0}.ch-bar i{display:block;height:100%;background:linear-gradient(90deg,#c6ff3d,#3de0ff);border-radius:9px}.cl-row{display:flex;align-items:center;gap:12px;padding:9px 6px;border-bottom:1px solid rgba(255,255,255,.08)}.cl-sym{font-size:30px;width:44px;text-align:center;flex:0 0 44px}.cl-sym.no{filter:brightness(0) invert(.35);opacity:.8}.cl-txt{flex:1;text-align:right;min-width:0}.cl-txt b{display:block;font-size:15px}.cl-txt span{font-size:12px;color:var(--text-dim)}</style>
    <button class="btn btn-ghost" style="padding:7px 14px;font-size:13px;margin-bottom:10px" onclick="startChemKeep()">&larr; Zurück</button>
    <div class="ch-top"><b style="font-size:20px">SAMMLUNG</b><span style="font-size:12px;color:var(--text-dim)">${have.length} / ${TOTAL}</span></div>
    <div class="ch-bar"><i style="width:${Math.round(have.length / TOTAL * 100)}%"></i></div>
    ${ORDERED.map(n => { const f = got.has(n), h = HOW[n]; return `<div class="cl-row"><div class="cl-sym ${f ? '' : 'no'}">${D.e[n] || ''}</div><div class="cl-txt">${f ? `<b>${E(nm(n))}</b><span>${h ? E(nm(h[0])) + ' + ' + E(nm(h[1])) : 'Grundelement'}${showEnds && have.length >= ENDS_AT && isDone(n) ? ' · <b style="display:inline;color:#3dff7a;font-size:14px">&#10003;</b>' : ''}</span>` : '<b style="color:var(--text-dim)">???</b>'}</div></div>`; }).join('')}
    <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="startChemKeep()">Zurück zum Kombinieren</button></div>`); trUI();
};
window.startChemKeep = function(){ have = load(); slotA = slotB = null; draw(); };
function showHow(n){
  const h = HOW[n]; const p = document.createElement('div'); p.className = 'ch-pop'; p.id = 'chPop';
  p.innerHTML = `<div class="ch-card" style="border-color:rgba(255,255,255,.3)"><div style="font-size:54px">${D.e[n] || ''}</div><div style="font-size:22px;font-weight:900;margin-top:4px">${E(nm(n))}</div>${h ? `<div style="margin-top:12px;font-size:16px;font-weight:700">${D.e[h[0]] || ''} ${E(nm(h[0]))} <span style="color:var(--text-dim)">+</span> ${D.e[h[1]] || ''} ${E(nm(h[1]))}</div>` : `<div style="margin-top:12px;color:var(--text-dim)">Grundelement</div>`}<button class="btn btn-ghost btn-block" style="margin-top:14px" onclick="document.getElementById('chPop').remove()">OK</button></div>`;
  p.onclick = e => { if(e.target === p) p.remove(); };
  document.body.appendChild(p); trUI(p);
}
})();
