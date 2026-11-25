/* Wertungen Teil 2: viele Kategorien mit bis zu 40 Eintraegen. Ergaenzt/ersetzt TT_RANK aus tiktok-rank.js.
   Format der Daten: 'Name=Wert;Name=Wert'. Sortiert wird automatisch absteigend (Bester zuerst).
   yr:1 heisst: Wert ist ein Jahr, angezeigt wird das Alter (2026 minus Jahr), aelter = besser.
   mult: Faktor fuer die Anzeige (Werte in Tausend usw.). ca. = gerundete Naeherungswerte. */
(function(){
var R=window.TT_RANK=window.TT_RANK||{},K=window.TT_KAT=window.TT_KAT||{};
function W(cat,id,name,q,src,unit,o,data){
  o=o||{};var items=[],seen={};
  data.split(';').forEach(function(p){p=p.trim();if(!p)return;var i=p.lastIndexOf('='),n=p.slice(0,i).trim(),v=parseFloat(p.slice(i+1));
    if(o.yr)v=2026-v;if(o.mult)v=v*o.mult;if(!seen[n]){seen[n]=1;items.push([n,v])}});
  items=items.map(function(a,i){return {a:a,i:i}}).sort(function(x,y){return y.a[1]-x.a[1]||x.i-y.i}).map(function(o2){return o2.a});
  var r={id:id,name:name,q:q,src:src,unit:unit,div:o.div||1,dec:o.dec||0,items:items};
  var L=R[cat]=R[cat]||[];var k=-1;L.forEach(function(x,j){if(x.id===id)k=j});if(k>=0)L[k]=r;else L.push(r);
}

/* ===== Automarken ===== */
W('Automarken','welt','Weltweit verkauft 2024','Welche Automarke wurde 2024 weltweit am häufigsten verkauft?','Focus2Move 2024 (Top 10), Rest gerundete Schätzung','Autos',{mult:1000},
'Toyota=9090;VW=4930;BYD=3800;Honda=3740;Ford=3690;Hyundai=3690;Nissan=3130;Chevrolet=3030;Kia=2910;Mercedes=2180;BMW=2120;Suzuki=2080;Renault=1950;Tesla=1790;Audi=1700;Peugeot=1450;Mazda=1200;Skoda=930;Subaru=920;Lexus=850;Citroën=850;Volvo=760;Fiat=750;Dacia=750;Jeep=650;Mitsubishi=620;Opel=550;Seat=280;Porsche=310;Mini=290;Cupra=200;Smart=60;Alfa Romeo=45;Jaguar=40;Maserati=11;Ferrari=13.7;Lamborghini=10.7;Bentley=10;Aston Martin=6;Rolls-Royce=5.7;Bugatti=0.1');
W('Automarken','de','In Deutschland zugelassen 2024','Welche Automarke wurde 2024 in Deutschland am häufigsten neu zugelassen?','KBA 2024 (Top 16), Rest gerundete Schätzung','Neuwagen',{},
'VW=536888;Mercedes=257888;BMW=232886;Skoda=205593;Audi=202317;Seat=152334;Opel=147833;Ford=99554;Hyundai=96365;Toyota=95474;Dacia=71424;Kia=68656;Peugeot=67454;Renault=64000;Porsche=36097;Tesla=37500;Volvo=35000;Mini=32571;Citroën=31000;Fiat=29000;Mazda=28000;Suzuki=27000;Cupra=26000;Nissan=15500;Smart=12463;Jeep=10500;BYD=10000;Honda=9000;Mitsubishi=8000;Lexus=6500;Alfa Romeo=5200;Subaru=3000;Jaguar=2000');
W('Automarken','alt','Älteste Marke','Welche Automarke ist am ältesten?','Gründungsjahr der Marke bzw. des Unternehmens','Jahre alt',{yr:1},
'Peugeot=1810;Opel=1862;Skoda=1895;Fiat=1899;Renault=1899;Ford=1903;Rolls-Royce=1904;Audi=1909;Suzuki=1909;Bugatti=1909;Alfa Romeo=1910;Chevrolet=1911;Aston Martin=1913;Maserati=1914;BMW=1916;Citroën=1919;Bentley=1919;Mazda=1920;Jaguar=1922;Mercedes=1926;Volvo=1927;Porsche=1931;Nissan=1933;VW=1937;Toyota=1937;Ferrari=1947;Honda=1948;Seat=1950;Subaru=1953;Mini=1959;Lamborghini=1963;Dacia=1966;Hyundai=1967;Mitsubishi=1970;Smart=1994;Lexus=1989;Tesla=2003;Cupra=2018;Jeep=1941;Kia=1944');
W('Automarken','ps','Stärkstes Modell','Welche Marke baut das stärkste Serienauto?','Spitzenmodell der Marke, PS gerundet','PS',{},
'Bugatti=1800;Ferrari=1200;Aston Martin=1160;Porsche=1108;Chevrolet=1064;Mercedes=1049;Tesla=1020;Lamborghini=1015;Audi=925;Ford=815;Bentley=782;BMW=748;Maserati=630;Rolls-Royce=593;Jaguar=575;Alfa Romeo=520;Jeep=710;Hyundai=650;Nissan=600;Honda=600;Kia=600;Volvo=455;Smart=428;Lexus=471;Cupra=390;VW=333;Mitsubishi=313;Seat=310;Mini=306;Toyota=300;Mazda=300;Subaru=300;Renault=300;Skoda=265;Opel=270;Fiat=280;Peugeot=360;Citroën=200;Dacia=140;Suzuki=129');

/* ===== Konsolen ===== */
W('Konsolen','alt','Älteste Konsole','Welche Konsole ist am ältesten?','Erscheinungsjahr','Jahre alt',{yr:1},
'Atari 2600=1977;NES=1983;Mega Drive=1988;Game Boy=1989;Super Nintendo=1990;PlayStation 1=1994;Nintendo 64=1996;Dreamcast=1998;PlayStation 2=2000;GameCube=2001;Xbox=2001;Game Boy Advance=2001;Nintendo DS=2004;PSP=2004;Xbox 360=2005;PlayStation 3=2006;Wii=2006;Nintendo 3DS=2011;PS Vita=2011;Wii U=2012;PlayStation 4=2013;Xbox One=2013;Nintendo Switch=2017;PlayStation 5=2020;Xbox Series X=2020;Steam Deck=2022');
W('Konsolen','preis','Teuerste zum Start','Welche Konsole war zum Marktstart am teuersten?','Einführungspreis USA in US-Dollar (nicht inflationsbereinigt)','US-Dollar',{},
'PlayStation 3=599;Xbox One=499;PlayStation 5=499;Xbox Series X=499;PlayStation 4=399;Steam Deck=399;Xbox 360=399;Wii U=349;PlayStation 1=299;PlayStation 2=299;Xbox=299;Nintendo Switch=299;PSP=249;PS Vita=249;Nintendo 3DS=249;Wii=249;Nintendo DS=149;Nintendo 64=199;Super Nintendo=199;Mega Drive=189;Dreamcast=199;GameCube=199;NES=179;Atari 2600=199;Game Boy=89;Game Boy Advance=99');

/* ===== Supermaerkte ===== */
W('Supermärkte','umsatz','Größter Umsatz Deutschland','Welche Kette macht in Deutschland den meisten Umsatz?','NIQ/Lebensmittelpraxis 2024, brutto in Mrd. Euro (Edeka, Netto und Kleinere gerundet)','Mrd. Euro',{dec:1},
'Edeka=59;Rewe=35.2;Lidl=32;Kaufland=23.2;Aldi Süd=20.1;Netto=19.6;Aldi Nord=15.7;dm=12.5;Penny=10.8;Rossmann=9.9;Globus=5.5;Müller=4.5;Norma=2.7;Metro=2.5;Tegut=1.4;Alnatura=1;Budni=0.4');
W('Supermärkte','gruppen','Größte Handelsgruppe','Welche Handelsgruppe ist in Deutschland die größte?','ZDF/Bundeskartellamt 2024, in Mrd. Euro','Mrd. Euro',{dec:1},
'Edeka=61.4;Schwarz-Gruppe=55.2;Rewe=40.1;Aldi=35.8;dm=12.5;Rossmann=9.9');

/* ===== Streamer ===== */
W('Deutsche Streamer','twitch','Twitch-Follower','Welcher deutsche Streamer hat die meisten Twitch-Follower?','Giga Jan. 2026 und earlygame (Top), Rest gerundete Schätzung','Mio. Follower',{dec:2},
'MontanaBlack=5.9;Papaplatte=3.04;Trymacs=2.6;Eliasn97=2.24;Knossi=2;Rewinside=1.9;Amar=1.85;Letshe=1.83;Gronkh=1.78;Elotrix=1.69;HandOfBlood=1.57;Unge=1.48;Zarbex=1.4;Inscope21=1.3;Bonjwa=1.15;NiklasWilson=1.07;HoneyPuu=1.03;Dhalucard=1');
W('Deutsche Streamer','yt','YouTube-Abonnenten','Welcher deutsche Gamer hat die meisten YouTube-Abos?','earlygame/Kolsquare 2025 (gerundet)','Mio. Abos',{dec:2},
'Paluten=5.7;Gronkh=5.04;Unge=3.6;Rewinside=3.42');

/* ===== Fussballer ===== */
W('Fußballer','alt','Ältester Spieler','Welcher Fußballer ist am ältesten?','Geburtsjahr (Alter 2026, ±1 Jahr)','Jahre alt',{yr:1},
'Pelé=1940;Beckenbauer=1945;Maradona=1960;Zidane=1972;Ballack=1976;Buffon=1978;Klose=1978;Xavi=1980;Ibrahimović=1981;Iniesta=1984;Schweinsteiger=1984;Ronaldo=1985;Modric=1985;Podolski=1985;Messi=1987;Benzema=1987;Neuer=1986;Ramos=1986;Özil=1988;Lewandowski=1988;Müller=1989;Gündogan=1990;Kroos=1990;De Bruyne=1991;Griezmann=1991;Neymar=1992;Salah=1992;Son=1992;Ter Stegen=1992;Kane=1993;Lukaku=1993;Rüdiger=1993;Kimmich=1995;Gnabry=1995;Sané=1996;Mbappé=1998;Havertz=1999;Haaland=2000;Vinicius=2000;Pedri=2002;Bellingham=2003;Musiala=2003;Wirtz=2003;Yamal=2007');
W('Fußballer','mw','Höchster Marktwert','Welcher Spieler hat den höchsten Marktwert?','Transfermarkt, ca. Herbst 2025, gerundet','Mio. Euro',{},
'Yamal=200;Haaland=200;Mbappé=180;Bellingham=160;Vinicius=150;Pedri=140;Musiala=130;Wirtz=130;Kane=100;Havertz=65;Salah=60;Kimmich=50;Sané=40;Gnabry=33;Rüdiger=25;Griezmann=25;De Bruyne=25;Son=25;Lukaku=22;Messi=20;Ter Stegen=15;Ronaldo=15;Lewandowski=12;Gündogan=8;Benzema=8;Neymar=6;Müller=5;Neuer=4;Modric=3');

/* ===== Fussballvereine (neu) ===== */
W('Fußballvereine','kader','Wertvollster Kader','Welcher Verein hat den wertvollsten Kader der Welt?','Transfermarkt, ca. Herbst 2025, gerundet (einzelne Werte genau)','Mio. Euro',{},
'Real Madrid=1460;Arsenal=1300;Man City=1300;Chelsea=1200;PSG=1150;Barcelona=1100;Liverpool=1030;Bayern=905;Tottenham=800;Man United=720;Newcastle=700;Inter=650;Dortmund=500;Leverkusen=560;Aston Villa=550;Atlético=550;Juventus=560;Napoli=530;Milan=510;Brighton=500;Leipzig=450;Atalanta=450;Sporting=420;Stuttgart=383;Roma=380;Frankfurt=350;Benfica=364.5;West Ham=363;Galatasaray=344.75;Lyon=286;Bologna=275;Wolves=277;Real Sociedad=272.7;Lille=271.5');
W('Fußballvereine','cl','Meiste Champions-League-Titel','Welcher Verein hat die meisten Europapokal-Titel der Landesmeister?','UEFA, Stand nach der Saison 2023/24','Titel',{},
'Real Madrid=15;AC Milan=7;Bayern=6;Liverpool=6;Barcelona=5;Ajax=4;Inter=3;Man United=3;Juventus=2;Chelsea=2;Benfica=2;Porto=2;Forest=2;Dortmund=1;HSV=1;Marseille=1;Man City=1;Celtic=1;Feyenoord=1;PSV=1;Aston Villa=1;Steaua=1;Roter Stern=1');
W('Fußballvereine','meister','Meiste deutsche Meisterschaften','Welcher Verein hat die meisten deutschen Meistertitel?','DFB, Stand Saison 2024/25','Titel',{},
'Bayern=33;Nürnberg=9;Dortmund=8;Schalke=7;HSV=6;Stuttgart=5;Gladbach=5;Kaiserslautern=4;Werder=4;Köln=2;Hertha=2;Hannover=2;Fortuna=2;Leverkusen=1;Frankfurt=1;Wolfsburg=1;1860 München=1;Karlsruher SC=1');

/* ===== Tiere ===== */
W('Tiere','gewicht','Schwerstes Tier','Welches Tier ist am schwersten?','Typische Höchstgewichte erwachsener Tiere, gerundet','kg',{},
'Blauwal=150000;Finnwal=60000;Pottwal=45000;Walhai=20000;Seeelefant=3000;Orca=5000;Elefant=6000;Nashorn=2300;Nilpferd=1500;Walross=1500;Giraffe=1200;Weißer Hai=2000;Leistenkrokodil=1000;Kuh=700;Eisbär=600;Pferd=500;Braunbär=400;Zebra=350;Delfin=300;Tiger=250;Hirsch=250;Schwein=250;Löwe=190;Gorilla=180;Anakonda=150;Strauß=130;Panda=120;Känguru=90;Wolf=50;Hund=30;Pinguin=35;Reh=25;Fuchs=7;Adler=6;Katze=4;Hase=4;Eule=2');
W('Tiere','tempo','Schnellstes Tier','Welches Tier ist am schnellsten?','Höchstgeschwindigkeiten, gerundet','km/h',{},
'Wanderfalke=389;Steinadler=320;Segelfisch=110;Gepard=110;Gabelbock=88;Springbock=88;Löwe=80;Eule=80;Makohai=74;Hase=70;Känguru=70;Strauß=70;Pferd=70;Zebra=65;Wolf=65;Tiger=65;Hirsch=65;Reh=60;Giraffe=60;Delfin=60;Orca=56;Braunbär=56;Fuchs=50;Nashorn=50;Katze=48;Blauwal=48;Elefant=40;Eisbär=40;Gorilla=40;Kuh=40;Pinguin=36;Nilpferd=30;Krokodil=17;Schwein=18;Schlange=20;Frosch=10');
W('Tiere','alter','Ältestes Tier','Welches Tier wird am ältesten?','Maximales Alter in Jahren, gerundet','Jahre',{},
'Grönlandhai=270;Grönlandwal=200;Schildkröte=150;Blauwal=90;Kakadu=80;Pottwal=70;Krokodil=70;Elefant=65;Adler=60;Schimpanse=50;Nilpferd=45;Delfin=40;Nashorn=40;Pferd=30;Braunbär=30;Eule=30;Python=25;Giraffe=25;Känguru=20;Kuh=20;Pinguin=20;Löwe=15;Tiger=16;Katze=15;Schwein=15;Hund=13;Frosch=10;Hase=8;Wolf=8;Fuchs=4;Maus=2');

/* ===== Laender ===== */
W('Länder','flaeche','Größtes Land','Welches Land ist flächenmäßig am größten?','Fläche in km², gerundet','km²',{},
'Russland=17098000;Kanada=9985000;China=9597000;USA=9834000;Brasilien=8516000;Australien=7692000;Indien=3287000;Argentinien=2780000;Kasachstan=2725000;Saudi-Arabien=2150000;Mexiko=1964000;Indonesien=1905000;Libyen=1760000;Iran=1648000;Peru=1285000;Südafrika=1221000;Kolumbien=1142000;Ägypten=1002000;Türkei=783000;Ukraine=604000;Frankreich=551000;Thailand=513000;Spanien=506000;Marokko=447000;Schweden=450000;Japan=378000;Norwegen=385000;Deutschland=357000;Finnland=338000;Polen=313000;Italien=301000;Großbritannien=244000;Griechenland=132000;Island=103000;Portugal=92000;Österreich=84000;Niederlande=42000;Schweiz=41000;Belgien=30700;Luxemburg=2600;Malta=316;Monaco=2;Vatikan=0.4');
W('Länder','bip','Größte Wirtschaft','Welches Land hat die größte Wirtschaft?','IWF 2024, Bruttoinlandsprodukt in Mrd. US-Dollar, gerundet','Mrd. US-Dollar',{},
'USA=29200;China=18700;Deutschland=4700;Japan=4000;Indien=3900;Großbritannien=3600;Frankreich=3200;Italien=2400;Kanada=2200;Brasilien=2200;Russland=2200;Südkorea=1870;Mexiko=1850;Australien=1800;Spanien=1700;Indonesien=1400;Türkei=1300;Niederlande=1200;Saudi-Arabien=1100;Schweiz=940;Polen=850;Belgien=640;Argentinien=630;Schweden=600;Irland=560;Österreich=520;Thailand=520;Norwegen=500;Dänemark=410;Ägypten=350;Portugal=300;Griechenland=260;Island=32');

/* ===== Staedte ===== */
W('Städte in Deutschland','einw','Meiste Einwohner','Welche Stadt hat die meisten Einwohner?','Statistisches Bundesamt 2023 (Top 13 genau, Rest gerundet)','Einwohner',{},
'Berlin=3782202;Hamburg=1892122;München=1512491;Köln=1087863;Frankfurt=773068;Stuttgart=632865;Düsseldorf=629047;Leipzig=616093;Dortmund=595471;Essen=586608;Bremen=566573;Dresden=563311;Hannover=548186;Nürnberg=523026;Duisburg=502000;Bochum=366000;Wuppertal=355000;Bonn=336000;Bielefeld=334000;Münster=320000;Mannheim=316000;Karlsruhe=308000;Augsburg=301000;Wiesbaden=283000;Aachen=262000;Mönchengladbach=261000;Gelsenkirchen=260000;Braunschweig=251000;Kiel=249000;Chemnitz=249000;Halle=242000;Magdeburg=240000;Freiburg=236000;Krefeld=227000;Mainz=222000;Lübeck=218000;Erfurt=215000;Oberhausen=210000;Rostock=209000;Kassel=204000');
W('Städte in Deutschland','alt','Älteste Stadt','Welche Stadt ist am ältesten?','Gründung bzw. erste Erwähnung, gerundet','Jahre alt',{yr:1},
'Trier=-16;Augsburg=-15;Mainz=-13;Köln=50;Bonn=-11;Regensburg=179;Bremen=787;Münster=793;Frankfurt=794;Hamburg=808;Essen=845;Dortmund=882;Kassel=913;Stuttgart=950;Leipzig=1015;Nürnberg=1050;Hannover=1150;München=1158;Dresden=1206;Berlin=1237;Düsseldorf=1288;Karlsruhe=1715;Mannheim=1607;Wiesbaden=829;Kiel=1233;Freiburg=1120;Rostock=1218;Bochum=1041;Wuppertal=1929;Bielefeld=1214');

/* ===== Fast Food ===== */
W('Fast Food','filialen','Meiste Filialen weltweit','Welche Kette hat weltweit die meisten Filialen?','Konzernangaben, ca. 2024, gerundet','Filialen',{},
'McDonalds=43500;Starbucks=40000;Subway=37000;KFC=30000;Domino\'s=21000;Burger King=19800;Pizza Hut=19800;Dunkin=13000;Taco Bell=8700;Wendy\'s=7300;Popeyes=4900;Five Guys=1800;Nordsee=360;BackWerk=260');
W('Fast Food','alt','Älteste Kette','Welche Kette ist am ältesten?','Gründungsjahr','Jahre alt',{yr:1},
'Nordsee=1896;A&W=1919;White Castle=1921;Krispy Kreme=1937;McDonalds=1940;Carl\'s Jr=1941;Chick-fil-A=1946;In-N-Out=1948;Dunkin=1950;Jack in the Box=1951;KFC=1952;Sonic=1953;Burger King=1954;Pizza Hut=1958;Little Caesars=1959;Domino\'s=1960;Taco Bell=1962;Subway=1965;Arby\'s=1964;Tim Hortons=1964;Block House=1968;Wendy\'s=1969;Starbucks=1971;Popeyes=1972;Papa John\'s=1984;Five Guys=1986;L\'Osteria=1999;BackWerk=1999;Vapiano=2002;Hans im Glück=2010');

/* ===== Suessigkeiten ===== */
W('Süßigkeiten','alt','Älteste Marke','Welche Süßigkeit gibt es am längsten?','Gründungs- bzw. Erfindungsjahr, gerundet','Jahre alt',{yr:1},
'Lindt=1845;Leibniz=1891;Milka=1901;Toblerone=1908;Werthers=1909;Ritter Sport=1912;Oreo=1912;Haribo=1920;Snickers=1930;Mars=1932;Mentos=1932;KitKat=1935;Smarties=1937;M&Ms=1941;Bounty=1951;Chupa Chups=1958;Hanuta=1959;Nimm2=1962;Duplo=1964;Nutella=1964;Merci=1966;Twix=1967;Kinder Riegel=1967;Pringles=1968;Capri Sun=1969;Tic Tac=1969;Toffifee=1973;Skittles=1974;Ferrero Rocher=1982;Kinder Bueno=1990;Raffaello=1990');
W('Süßigkeiten','kcal','Meiste Kalorien','Welche Süßigkeit hat die meisten Kalorien?','Hersteller- und Datenbankwerte, kcal pro 100 g, gerundet','kcal pro 100 g',{},
'Raffaello=620;Kinder Bueno=575;Lindt=560;Ritter Sport=550;Nutella=539;Toblerone=535;Milka=530;Pringles=530;Lays=536;Toffifee=520;Twix=495;Snickers=488;Oreo=480;Bounty=470;Smarties=475;Mars=450;Werthers=410;Skittles=405;Tic Tac=390;Haribo=343');

/* ===== Videospiele ===== */
W('Videospiele','verkauf','Meistverkauftes Spiel','Welches Spiel wurde am häufigsten verkauft?','Wikipedia und Herstellerangaben, gerundet','Mio. verkauft',{},
'Tetris=520;Minecraft=300;GTA V=210;Wii Sports=83;PUBG=75;Mario Kart 8 DX=68;Red Dead 2=67;Terraria=64;Skyrim=60;The Witcher 3=60;Super Mario Bros=58;Animal Crossing=48;Mario Kart Wii=37;Smash Ultimate=35;Zelda BotW=32;Pokémon Rot/Blau=31;Cyberpunk 2077=30;Hogwarts Legacy=30;Elden Ring=28');
W('Videospiele','alt','Ältestes Spiel','Welches Spiel ist am ältesten?','Erscheinungsjahr','Jahre alt',{yr:1},
'Pong=1972;Space Invaders=1978;Pac-Man=1980;Donkey Kong=1981;Tetris=1984;Super Mario=1985;Zelda=1986;Sonic=1991;Mario Kart=1992;FIFA=1993;Doom=1993;Pokémon=1996;GTA=1997;Die Sims=2000;Call of Duty=2003;WoW=2004;Roblox=2006;LoL=2009;Minecraft=2011;Clash of Clans=2012;Candy Crush=2012;Subway Surfers=2012;Rocket League=2015;Overwatch=2016;Clash Royale=2016;Fortnite=2017;Among Us=2018;Brawl Stars=2018;Apex=2019;Valorant=2020;Fall Guys=2020;Elden Ring=2022;CS2=2023');

/* ===== Apps ===== */
W('Apps','nutzer','Meiste Nutzer','Welche App hat die meisten Nutzer?','Unternehmensangaben, monatlich aktiv, ca. 2025, gerundet','Mrd. Nutzer',{dec:2},
'Facebook=3.07;WhatsApp=3;Instagram=3;YouTube=2.5;TikTok=1.6;LinkedIn=1.2;Telegram=1;Snapchat=0.9;Spotify=0.68;X=0.6;Pinterest=0.55;Threads=0.4;Reddit=0.4;Zoom=0.3;Discord=0.2;Twitch=0.14;BeReal=0.04');
W('Apps','alt','Älteste App','Welche App ist am ältesten?','Gründungs- bzw. Startjahr','Jahre alt',{yr:1},
'Amazon=1994;Netflix=1997;Google=1998;LinkedIn=2003;Facebook=2004;YouTube=2005;Reddit=2005;X=2006;Spotify=2008;WhatsApp=2009;Instagram=2010;Pinterest=2010;Snapchat=2011;Twitch=2011;Zoom=2011;Tinder=2012;Telegram=2013;Signal=2014;Discord=2015;TikTok=2016;BeReal=2020;ChatGPT=2022;Threads=2023');

/* ===== Sportmarken ===== */
W('Sportmarken','alt','Älteste Marke','Welche Sportmarke ist am ältesten?','Gründungsjahr, gerundet','Jahre alt',{yr:1},
'Erima=1900;New Balance=1906;Mizuno=1906;Converse=1908;Fila=1911;Kappa=1916;Champion=1919;Hummel=1923;Umbro=1924;Lacoste=1933;Columbia=1938;Salomon=1947;Puma=1948;Diadora=1948;Uhlsport=1948;Adidas=1949;Asics=1949;Reebok=1958;Nike=1964;Joma=1965;Vans=1966;The North Face=1966;Lotto=1973;Patagonia=1973;Decathlon=1976;Jack Wolfskin=1981;Jordan=1984;Jako=1989;Under Armour=1996');
W('Sportmarken','umsatz','Größter Umsatz','Welche Sportmarke macht den meisten Umsatz?','Geschäftsberichte 2024, gerundet in Mrd. Euro','Mrd. Euro',{dec:1},
'Nike=47.5;Adidas=23.7;Decathlon=15.4;Lululemon=9.7;Puma=8.8;Skechers=8.2;New Balance=7.9;Under Armour=4.9;Asics=4.8;Columbia=3.1;Fila=3');

/* ===== Getraenke ===== */
W('Getränke','alt','Ältestes Getränk','Welche Marke gibt es am längsten?','Gründungs- bzw. Erfindungsjahr, gerundet','Jahre alt',{yr:1},
'Weihenstephan=1040;Augustiner=1328;Hofbräu=1589;Paulaner=1634;Warsteiner=1753;Schweppes=1783;Krombacher=1803;Bitburger=1817;Veltins=1824;Jever=1848;Radeberger=1872;Beck\'s=1873;Dr Pepper=1885;Coca Cola=1886;Gerolsteiner=1888;Lipton=1890;Pepsi=1893;Club Mate=1924;7Up=1929;Jägermeister=1934;Volvic=1938;Fanta=1940;Mountain Dew=1940;Sprite=1961;Capri Sun=1969;Mezzo Mix=1973;Red Bull=1987;Fritz Kola=2002;Monster=2002');
W('Getränke','zucker','Meiste Zucker','Welches Getränk hat am meisten Zucker?','Herstellerangaben, Gramm pro Liter, gerundet','g pro Liter',{},
'Pepsi=110;Red Bull=110;Monster=110;Coca Cola=106;Capri Sun=106;Mezzo Mix=95;Fanta=92;Fritz Kola=90;Sprite=80;Dr Pepper=100;Club Mate=50;Apfelschorle=50;Lipton=70;Schweppes=88');

/* ===== Superhelden / Anime ===== */
W('Superhelden','stark','Stärkster Held','Welcher Superheld ist am stärksten?','Fan-Einschätzung, nur zum Spaß (keine echte Messung)','Stärkepunkte',{},
'Superman=95;Darkseid=94;Thor=90;Hulk=92;Captain Marvel=90;Flash=91;Dr. Strange=88;Wonder Woman=87;Thanos=93;Iron Man=85;Aquaman=82;Black Panther=78;Wolverine=78;Deadpool=75;Spider-Man=80;Homelander=80;Captain America=70;Batman=55;Joker=40;Hawkeye=35');
W('Superhelden','anime','Stärkster Anime-Charakter','Welcher Anime-Charakter ist am stärksten?','Fan-Einschätzung, nur zum Spaß (keine echte Messung)','Stärkepunkte',{},
'Zeno=100;Goku=98;Broly=97;Saitama=96;Vegeta=96;Gojo=95;Luffy=94;Sukuna=94;Naruto=93;Frieza=93;Aizen=93;Madara=92;Sasuke=91;Ichigo=90;Majin Buu=90;Cell=88;Deku=82;Eren=84;All Might=85;Itachi=85;Kakashi=80;Gon=80;Meliodas=75;Asta=72;Levi=70;Tanjiro=70;Killua=70;Pikachu=20');
K['Anime-Charaktere']=K['Anime-Charaktere']||[];
R['Anime-Charaktere']=[R['Superhelden'].filter(function(r){return r.id==='anime'})[0]];
R['Superhelden']=R['Superhelden'].filter(function(r){return r.id!=='anime'});

/* ===== Musiker ===== */
W('Musiker','alt','Ältester Künstler','Welcher Künstler ist am ältesten?','Geburtsjahr','Jahre alt',{yr:1},
'Elvis=1935;Michael Jackson=1958;Madonna=1958;Eminem=1972;Shakira=1977;Bushido=1978;Sido=1980;Sarah Connor=1980;Beyoncé=1981;Casper=1982;Mark Forster=1983;Helene Fischer=1984;Kollegah=1984;Bruno Mars=1985;Lady Gaga=1986;Drake=1986;Farid Bang=1986;Adele=1988;Rihanna=1988;Shindy=1988;Taylor Swift=1989;The Weeknd=1990;Cro=1990;Ed Sheeran=1991;Ariana Grande=1993;Justin Bieber=1994;Capital Bra=1994;Dua Lipa=1995;Apache 207=1997;Luciano=1999;Billie Eilish=2001');
W('Musiker','platten','Meiste Platten verkauft','Welcher Künstler hat die meisten Tonträger verkauft?','Schätzungen aus Branchenangaben, gerundet','Mio. Tonträger',{},
'Elvis=500;Michael Jackson=400;Madonna=335;Rihanna=250;Eminem=220;Beyoncé=200;Taylor Swift=200;Lady Gaga=170;Drake=170;Justin Bieber=150;Ed Sheeran=150;Bruno Mars=130;Adele=120;Shakira=100;Ariana Grande=90;Billie Eilish=30;Rammstein=20;Helene Fischer=17;Capital Bra=7');

/* ===== Neue Kategorien: Berge, Fluesse, Bauwerke, Weltraum ===== */
W('Berge','hoehe','Höchster Berg','Welcher Berg ist am höchsten?','Höhe über dem Meer in Metern, gerundet','Meter',{},
'Mount Everest=8849;K2=8611;Kangchendzönga=8586;Lhotse=8516;Makalu=8485;Cho Oyu=8188;Dhaulagiri=8167;Manaslu=8163;Nanga Parbat=8126;Annapurna=8091;Aconcagua=6961;Denali=6190;Kilimandscharo=5895;Elbrus=5642;Mont Blanc=4806;Matterhorn=4478;Mauna Kea=4207;Großglockner=3798;Mount Fuji=3776;Ätna=3357;Zugspitze=2962;Watzmann=2713;Kosciuszko=2228;Feldberg=1493;Ben Nevis=1345;Vesuv=1281;Brocken=1141');
W('Flüsse','laenge','Längster Fluss','Welcher Fluss ist am längsten?','Länge in Kilometern, gerundet','km',{},
'Nil=6650;Amazonas=6400;Jangtse=6300;Mississippi=6275;Jenissei=5539;Gelber Fluss=5464;Ob=5410;Parana=4880;Kongo=4700;Amur=4444;Lena=4400;Mekong=4350;Niger=4180;Wolga=3530;Indus=3180;Donau=2850;Euphrat=2800;Ganges=2525;Colorado=2330;Dnepr=2290;Don=1870;Rhein=1233;Elbe=1094;Loire=1006;Oder=866;Ebro=930;Rhône=813;Seine=777;Weser=744;Po=652;Mosel=545;Main=524;Tiber=406;Spree=400;Neckar=367;Themse=346;Isar=295');
W('Bauwerke','hoehe','Höchstes Bauwerk','Welches Bauwerk ist am höchsten?','Höhe in Metern, gerundet','Meter',{},
'Burj Khalifa=828;Merdeka 118=678;Tokyo Skytree=634;Shanghai Tower=632;Abraj Al-Bait=601;Ping An=599;Lotte Tower=555;CN Tower=553;One WTC=541;Taipei 101=508;Petronas=452;Empire State=443;Berliner TV Turm=368;Eiffelturm=330;Olympiaturm=291;Commerzbank Turm=259;Messeturm=257;Stuttgarter Turm=217;Space Needle=184;Ulmer Münster=162;Kölner Dom=157;Cheops Pyramide=139;Elbphilharmonie=110;Big Ben=96;Freiheitsstatue=93;Kolosseum=48;Brandenburg Tor=26');
W('Weltraum','groesse','Größter Himmelskörper','Welcher Himmelskörper ist am größten?','Durchmesser in Kilometern, gerundet','km',{},
'Sonne=1392700;Jupiter=139820;Saturn=116460;Uranus=50724;Neptun=49244;Erde=12742;Venus=12104;Mars=6779;Ganymed=5268;Titan=5149;Merkur=4879;Kallisto=4821;Io=3643;Mond=3474;Europa=3122;Triton=2707;Pluto=2377;Eris=2326;Ceres=940');

/* Kategorien, die es noch nicht gab: Namen aus der ersten Wertung uebernehmen */
Object.keys(R).forEach(function(k){if(!K[k]||!K[k].length){K[k]=R[k][0].items.map(function(it){return it[0]})}});
})();
