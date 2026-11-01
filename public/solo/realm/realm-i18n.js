/* Realm of Brain: Englisch. Wird nur aktiv, wenn Brain Pulse auf Englisch steht. Uebersetzt Texte im Bild (DOM) laufend mit. */
(function(){
var lang='de'; try{ if(window.parent&&window.parent!==window&&typeof window.parent.tfLang==='function') lang=window.parent.tfLang(); }catch(e){}
if(lang!=='en') return;
document.documentElement.lang='en';
var RULES=[
 [/ist in Runde (\d+) gefallen\./g,'fell in round $1.'],
 [/(\d+) Feinde besiegt/g,'$1 enemies defeated'],
 [/Töte ([\d.]+) Monster ohne Schaden/g,'Kill $1 monsters without taking damage'],
 [/Töte ([\d.]+) Monster/g,'Kill $1 monsters'],
 [/Besiege ([\d.]+) Bosse/g,'Defeat $1 bosses'],
 [/Erreiche Heldenlevel ([\d.]+)/g,'Reach hero level $1'],
 [/Erreiche Level ([\d.]+) um eine Klasse zu wählen/g,'Reach level $1 to choose a class'],
 [/Erziele ([\d.]+) krit\. Treffer/g,'Land $1 critical hits'],
 [/Gib ([\d.]+) Gold aus/g,'Spend $1 gold'],
 [/Gib ([\d.]+) Diamanten aus/g,'Spend $1 diamonds'],
 [/Kaufe ([\d.]+) Upgrades/g,'Buy $1 upgrades'],
 [/Spiele ([\d.]+) Stunden/g,'Play $1 hours'],
 [/Spiele ([\d.]+) Minuten/g,'Play $1 minutes'],
 [/Verbessere ([\d.]+) Fähigkeiten/g,'Upgrade $1 skills'],
 [/Verdiene ([\d.]+) Gold/g,'Earn $1 gold'],
 [/Verursache ([\d.]+) Schaden/g,'Deal $1 damage'],
 [/Weiche ([\d.]+) Angriffen aus/g,'Dodge $1 attacks'],
 [/Besiege Boss (\d+)/g,'Defeat boss $1'],
 [/(\d+) Kills pro Level/g,'$1 kills per level'],
 [/Klassen-Lv\. (\d+)/g,'Class Lv. $1']
];
var D=[
 ['abenteuer beginnen','begin adventure'],['wähle deinen helden','choose your hero'],['held auswählen','choose hero'],['helden-level tabelle','hero level table'],
 ['klassen-level tabelle','class level table'],['prestige tabelle','prestige table'],['prestige durchführen','do prestige'],['ja, prestige','yes, prestige'],
 ['zurück zu brain pulse','back to Brain Pulse'],['zurück','back'],['schließen','close'],['abbrechen','cancel'],['schnellzugriff','quick access'],
 ['bestenliste','leaderboard'],['allgemein','general'],['inventar & ausrüstung','inventory & equipment'],['inventar','inventory'],['ausrüstung','equipment'],
 ['monster lexikon','monster lexicon'],['lexikon','lexicon'],['quests & klassen-level','quests & class level'],['klasse wählen','choose class'],['klasse wechseln','change class'],
 ['klasse wählbar ab hier','class selectable from here'],['keine klasse gewählt','no class chosen'],['keine klasse','no class'],['klassen-level','class level'],['klassen-lv','class lv'],['klasse','class'],
 ['spiel-menu','game menu'],['tagebuch','log'],['schlachtfeld','battlefield'],['dungeon-karte','dungeon map'],['runde','round'],['vorwärts / angriff','forward / attack'],['vorwärts','forward'],['angreifen','attack'],
 ['weiterkämpfen','keep fighting'],['kämpfen','fight'],['boss erscheint','boss appears'],['gefallen','fallen'],['ausloggen','log out'],['abmelden','log out'],
 ['spielstand speichern','save game'],['spielstand gespeichert','game saved'],['spielstand aus der cloud geladen','game loaded from the cloud'],['score einreichen','submit score'],
 ['dia-shop','diamond shop'],['diamanten shop','diamond shop'],['dia shop','diamond shop'],['kisten kaufen','buy chests'],['schwarzmarkt','black market'],['shop','shop'],
 ['helden-fähigkeiten','hero skills'],['helden-level up','hero level up'],['helden-level','hero level'],['helden-lv','hero lv'],['held-lv','hero lv'],['klass-lv','class lv'],
 ['diamanten','diamonds'],['diamant-kiste','diamond chest'],['holzkiste','wooden chest'],['legendäre kiste','legendary chest'],['todsuende-kiste','deadly sin chest'],['todsünde-kiste','deadly sin chest'],['kiste','chest'],
 ['dias','diamonds'],['dia','diamond'],['gold','gold'],['maximum','maximum'],['bonus','bonus'],['extra effekt','extra effect'],
 ['guthaben','balance'],['melde dich in brain pulse an, dann werden spielstand und rangliste automatisch gespeichert.','Log in to Brain Pulse and your game and ranking are saved automatically.'],
 ['melde dich in brain pulse an, um zu chatten.','Log in to Brain Pulse to chat.'],['nachricht ...','Message ...'],['nachricht','message'],
 ['noch keine nachrichten. schreib die erste!','No messages yet. Write the first one!'],['noch keine einträge. sei der erste!','No entries yet. Be the first!'],
 ['noch keine eintraege. spiele los!','No entries yet. Start playing!'],['noch keine eintraege','no entries yet'],['noch keine news','no news yet'],['noch kein score eingereicht','no score submitted yet'],
 ['bestenliste nicht erreichbar.','Leaderboard not reachable.'],['du brauchst ein brain-pulse-konto und internet.','You need a Brain Pulse account and internet.'],
 ['du bist noch nicht in der liste. erreiche runde 2 und du bist dabei.','You are not in the list yet. Reach round 2 and you are in.'],
 ['die besten helden von brain pulse','the best heroes of Brain Pulse'],['helden im ranking','heroes in the ranking'],['dein platz','your rank'],['punkte','points'],['bosse','bosses'],
 ['lade','loading'],['senden nicht möglich (konto nötig).','Cannot send (account needed).'],['senden nicht möglich.','Cannot send.'],['nicht so schnell.','Not so fast.'],
 ['ein dunkler wald voller gefahr...','A dark forest full of danger...'],['du spürst eine böse präsenz in der luft.','You sense an evil presence in the air.'],
 ['ein mächtiger feind wartet auf dich...','A mighty enemy awaits you...'],['sieg! die reise geht weiter...','Victory! The journey continues...'],['du hörst noch das echo des kampfes.','You can still hear the echo of the battle.'],
 ['betritt das reich der bestien...','enters the realm of beasts...'],['ein neues abenteuer beginnt... runde 1','A new adventure begins... round 1'],
 ['du läufst','You run'],['meter weiter','meters further'],['du triffst','You hit'],['trifft dich für','hits you for'],[' greift an!',' attacks!'],['greift an!','attacks!'],
 ['besiegt!','defeated!'],['besiegt','defeated'],['boss besiegt!','boss defeated!'],['erster boss besiegt! wähle jetzt deine klasse!','First boss defeated! Choose your class now!'],
 ['feinde besiegt.','enemies defeated.'],['schaden','damage'],['gefunden','found'],['verfügbar','available'],['freigeschalten','unlocked'],['gekauft','bought'],
 ['nicht genug diamanten!','Not enough diamonds!'],['nicht genug gold!','Not enough gold!'],['brauche','need'],['aktuell','current'],['erreichen','reach'],
 ['kein prestige verfügbar!','No prestige available!'],['prestige verfügbar!','PRESTIGE AVAILABLE!'],['nächstes prestige','next prestige'],['dauerhaft','permanent'],['rüstung bleibt erhalten','equipment is kept'],
 ['flucht! du entkommst dem kampf.','Escape! You flee the battle.'],['flucht bei boss nicht möglich!','Cannot flee from a boss!'],['flucht','escape'],['fliehen','flee'],['trank','potion'],['auto-kampf','auto fight'],
 ['du ruhst dich im bett aus und erholst dich!','You rest in bed and recover!'],['du stehst auf dem startfeld.','You are standing on the start field.'],
 ['auto-run: nicht gekauft','AUTO-RUN: NOT BOUGHT'],['auto-run stoppen','stop auto-run'],['auto-run starten','start auto-run'],['auto-run','auto-run'],['läuft automatisch bis boss','runs automatically until boss'],['läuft bis boss','runs until boss'],
 ['kaufe es im shop für','buy it in the shop for'],['auto-run pausiert','auto-run paused'],['ist da! kämpfe ihn manuell.','is here! Fight him manually.'],['upgrade nach dem sieg verfügbar','upgrade available after the win'],
 ['pro kampf','per fight'],['pro level','per level'],['pro kill','per kill'],['pro runde','per round'],['pro boss','per boss'],
 ['musik','music'],['ton an/aus','Sound on/off'],['neu','new'],['news','news'],['quests','quests'],['chat','chat'],['realm','realm'],['kills','kills'],['level','level'],['stufe','level'],
 ['dein held wird stärker!','Your hero grows stronger!'],['du erhältst dauerhaft:','You permanently receive:'],['boss besiegen!','Defeat the boss!'],['besiege bosse um klassen-level zu erhalten.','Defeat bosses to earn class levels.'],
 ['jede abgeschlossene quest = +1 klassen-level (max. 150)','Each completed quest = +1 class level (max. 150)'],['jede abgeschlossene quest = 1 klassen-level | stärkt deine klassen-fähigkeiten','Each completed quest = 1 class level | strengthens your class skills'],
 ['jedes prestige gibt dauerhaften bonus + extra-effekt','Each prestige gives a permanent bonus + extra effect'],['folgendes wird zurückgesetzt:','The following will be RESET:'],
 ['helden-level • diamanten • skills • shop-preise • auto-run','hero level • diamonds • skills • shop prices • auto-run'],
 ['helden-level: 150 kills pro level (lv1=150, lv2=300, lv3=450...); belohnungen pro level','Hero level: 150 kills per level (Lv1=150, Lv2=300, Lv3=450...); rewards per level'],
 ['mit account werden deine scores weltweit gespeichert!','With an account your scores are saved worldwide!'],['ranglisten-name:','Leaderboard name:'],['dein konto ist dein','Your account is your'],['brain-pulse-konto','Brain Pulse account'],
 ['dein heldenname...','Your hero name...'],['willkommen!','Welcome!'],['startlevel','start level'],['anfänger','beginner'],['neuling','novice'],['lehrling','apprentice'],['fortgeschritten','advanced'],['experte','expert'],['veteran','veteran'],['meisterklasse','master class'],
 ['erfahrener kaempfer deiner klasse.','Experienced fighter of your class.'],['erste klassen-faehigkeiten verstaerkt.','First class skills strengthened.'],['klasse wird langsam spuerbar.','Class is slowly becoming noticeable.'],['solide beherrschung der klasse.','Solid mastery of the class.'],['maximale klassen-meisterschaft erreicht.','Maximum class mastery reached.'],
 ['held','hero'],['gl\u00fcksgriff','lucky grip'],['gl\u00fcksgriff','lucky grip'],['gl\u00fcksgriff:','lucky grip:'],['glueksgriff','lucky grip'],['gl\u00fcksgriff','lucky grip'],['abenteurer','Adventurer'],['berserker','Berserker'],['axtkämpfer','Axe fighter'],['jeffrey','JEFFREY'],
 ['glücksgriff','lucky grip'],['zähigkeit','toughness'],['beutemacher','looter'],['entdecker','explorer'],['kriegskunst','war craft'],['eisenhaut','iron skin'],['schildwall','shield wall'],['rache','revenge'],['champion-beute','champion loot'],['blutdurst','bloodlust'],['wutanfall','rage'],['todesschlag','death blow'],
 ['jaeger','hunter'],['jäger','hunter'],['krieger','warrior'],['magier','mage'],['paladin','paladin'],['schurke','rogue'],['hieb','strike'],['hinterhalt','ambush'],['schild','shield'],['bogenschuss','bow shot'],['mehrfachschuss','multishot'],['blitz','lightning'],['feuer','fire'],['wasser','water'],['vita','vita'],
 ['glueck','luck'],['glück','luck'],['mehr gold-felder auf der karte','more gold fields on the map'],['jeder kill gibt +2 gold extra','every kill gives +2 extra gold'],['30% chance: doppeltes gold','30% chance: double gold'],['boss-gold-belohnung +50%','boss gold reward +50%'],
 ['10% chance: monster sofort töten','10% chance: kill monster instantly'],['10% dodge, +100% krit-schaden','10% dodge, +100% crit damage'],['15% chance: angriff blocken','15% chance: block attack'],['20% schaden zurück als hp','20% damage back as HP'],
 ['2x schaden (1x pro kampf)','2x damage (once per fight)'],['hp<50%: +50% angriff','HP<50%: +50% attack'],['gold +30%, hinterhalt 3x','gold +30%, ambush 3x'],['beim treffer +1 atk stapeln','stack +1 ATK on hit'],['-2 schaden pro treffer','-2 damage per hit'],
 ['+3 atk pro heldenlevel dauerhaft','+3 ATK per hero level permanently'],['+15 max-hp pro heldenlevel','+15 max HP per hero level'],['+8% atk pro level','+8% ATK per level'],['+3% hp nach kill pro lv','+3% HP after kill per Lv'],['10% doppelschaden-chance','10% double damage chance'],['15% vergiftungs-chance','15% poison chance'],['5% schaden-reduktion/lv','5% damage reduction/Lv'],
 ['2 schüsse, 50% 3. schuss (1rd cd)','2 shots, 50% 3rd shot (1 Rd CD)'],['2x atk magisch (10 energie)','2x ATK magic (10 energy)'],['3x atk (erstschlag, 3rd cd)','3x ATK (first strike, 3 Rd CD)'],['atk + heilt 50% hp (10 energie)','ATK + heals 50% HP (10 energy)'],
 ['blockiert nächsten angriff (3rd cd)','blocks next attack (3 Rd CD)'],['kampf abbrechen (nicht bei boss, 2rd cd)','abort fight (not on boss, 2 Rd CD)'],['runde überspringen (nicht boss, 1rd cd)','skip round (not boss, 1 Rd CD)'],['trifft ziel 2x (2rd cd)','hits target twice (2 Rd CD)'],
 ['hp +10%','HP +10%'],['hp +15%, atk +10%, vita+schild','HP +15%, ATK +10%, Vita+Shield'],['hp +20%, atk +10%','HP +20%, ATK +10%'],
 ['feuerschaden','fire damage'],['lebensraub','life steal'],['blitzschlag','lightning strike'],['giftklinge','poison blade'],['eisschutz','ice protection'],
 ['rostiges schwert','rusty sword'],['eisenschwert','iron sword'],['silberschwert','silver sword'],['drachenschwert','dragon sword'],['himmelsschwert','heaven sword'],['seelenspalter','soul splitter'],['lederrüstung','leather armor'],['lederruestung','leather armor'],['kettenhemd','chainmail'],['plattenpanzer','plate armor'],['drachenschuppen','dragon scales'],['engelspanzer','angel armor'],['schattenpanzer','shadow armor'],
 ['lederhelm','leather helm'],['eisenhelm','iron helm'],['goldhelm','gold helm'],['ring der kraft','ring of power'],['ring des schutzes','ring of protection'],['ring des kriegers','ring of the warrior'],['ring der götter','ring of the gods'],['ring der goetter','ring of the gods'],
 ['waffe','weapon'],['ruestung','armor'],['rüstung','armor'],['helm','helmet'],['ring','ring'],['ablegen','remove'],['anlegen','equip'],['angelegt','equipped'],['leer','empty'],['beutel','bag'],['items','items'],['stats','stats'],
 ['normal','normal'],['grün','green'],['gruen','green'],['blau','blue'],['episch','epic'],['legendär','legendary'],['legendaer','legendary'],['mystisch','mystic'],['silber','silver'],
 ['besiege monster und bosse um items zu erhalten!','Defeat monsters and bosses to get items!'],['item doppelt','duplicate item'],['doppelt','double'],['doppeltes gold','double gold'],
 ['noch nicht entdeckt','not discovered yet'],['töte monster um sie freizuschalten und diamanten-boni zu erhalten!','Kill monsters to unlock them and get diamond bonuses!'],['lexikon-meilenstein','lexicon milestone'],['meilenstein','milestone'],
 ['verbesserungen','upgrades'],['verbessern','upgrade'],['kaufen','buy'],['gekauft!','bought!'],['viel gold + dias + seltenes item','lots of gold + diamonds + rare item'],['gold + item (50%)','gold + item (50%)'],['gold + dias + item (85%, bis blau)','gold + diamonds + item (85%, up to blue)'],
 ['maximum: 150-400 dias + gold + epic items','Maximum: 150-400 diamonds + gold + epic items'],['seltenes item','rare item'],['viel gold','lots of gold'],
 ['erreiche level 10 um eine klasse zu waehlen!','Reach level 10 to choose a class!'],['wähle erst eine klasse, um quests freizuschalten!','Choose a class first to unlock quests!'],['helden-level 10 erforderlich, um quests zu sehen.','Hero level 10 required to see quests.'],
 ['du musst erst','You must first reach'],['erreichen um eine klasse zu wählen!','to choose a class!'],['kein freier klassen-slot!','No free class slot!'],['klassenwechsel: 150 dias','Class change: 150 diamonds'],['klasse gewählt:','Class chosen:'],['diese klasse ist bereits aktiv.','This class is already active.'],
 ['held gewechselt zu','Hero changed to'],['held wechseln erst möglich wenn dein aktueller held','Changing hero only possible when your current hero reaches'],['erreicht!','!'],
 ['wechsel: 150 dias','change: 150 diamonds'],['besiege erst boss','Defeat boss'],['erst','first'],
 ['schild hat den angriff geblockt!','SHIELD blocked the attack!'],['schild! nächster angriff wird geblockt!','SHIELD! Next attack will be blocked!'],['schildwall! angriff geblockt!','SHIELD WALL! Attack blocked!'],['hieb bereits benutzt (pro kampf 1x)','STRIKE already used (once per fight)'],
 ['vergiftet! 3 schaden fuer 3 angriffe!','POISONED! 3 damage for 3 attacks!'],['glücksgriff! doppeltes gold!','LUCKY GRIP! Double gold!'],['champion-beute! +50% gold!','CHAMPION LOOT! +50% gold!'],['magischer schaden','magic damage'],['energie','energy'],
 ['dein highscore:','Your highscore:'],['highscore bereits höher','Highscore already higher'],['score gespeichert:','Score saved:'],['score-fehler:','Score error:'],['pkt','pts'],
 ['gold verfügbar','gold available'],['fertigkeit','skill'],['fähigkeit(en) aktiv!','skill(s) active!'],['fähigkeiten','skills'],['aktiv','active'],['10 boss-kills nötig','10 boss kills needed'],['boss-kills','boss kills'],['boss','boss'],['runde ','round '],
 ['aus dem brain-shop!','from the Brain Shop!'],['helden-level ','hero level '],['schätze','treasures'],
 ['ungültige e-mail!','Invalid email!'],['gültige e-mail eingeben!','Enter a valid email!'],['gib die e-mail ein mit der du den link angefordert hast:','Enter the email you requested the link with:'],
 ['kein bild','no image'],['ok','ok'],['ja','yes'],['nein','no'],['neustart','restart'],['neues spiel','new game'],
 ['beginnt','begins'],['f\u00fcr','for'],['gett\u00f6tet','killed'],['gek\u00f6tet','killed'],['get\u00f6tet','killed'],['getötet','killed'],['n\u00e4chster bonus','next bonus'],['n\u00e4chstes mal','next time'],['n\u00e4chster','next'],['n\u00f6tig','needed'],['angriff','attack'],['feinde','enemies'],['stadt','city'],['goldmine','gold mine'],['diamantenmine','diamond mine'],['schmiede','forge'],['kaserne','barracks'],['schatzhaus','treasury'],['wachturm','watchtower'],['lagerfeuer','campfire'],['bauen','build'],['ausbauen','upgrade'],['einsammeln','collect'],['ertrag bereit:','yield ready:'],['maximal ausgebaut','fully upgraded'],['stufe','level'],['bringt gold pro stunde','produces gold per hour'],['bringt diamanten pro stunde','produces diamonds per hour'],['+2 angriff pro stufe','+2 attack per level'],['+15 leben pro stufe','+15 life per level'],['+4% gold im kampf pro stufe','+4% gold in battle per level'],['lagert mehr offline-ertrag (+2h pro stufe)','stores more offline yield (+2h per level)'],['zum kampf!','to battle!'],['zurück zum heldenmenü','back to hero menu'],['nicht genug diamanten!','not enough diamonds!'],['du','you'],['dein','your'],['deine','your'],['und','and'],['mit','with'],['von','of'],['nicht','not'],['noch','still']
];
// Umlaut-Varianten (ae/oe/ue/ss) automatisch ergaenzen
var seen={}, list=[];
function add(de,en){ if(!seen[de]){ seen[de]=1; list.push([de,en]); } }
D.forEach(function(p){ var de=p[0], en=p[1]; add(de,en);
  var alt=de.replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss'); if(alt!==de) add(alt,en); });
list.sort(function(a,b){ return b[0].length-a[0].length; });
function esc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
var L='A-Za-zÄÖÜäöüß';
var map={}; var parts=list.map(function(p){ map[p[0]]=p[1]; var k=esc(p[0]); var pre=/^[a-zäöüß]/i.test(p[0])?'(?<![A-Za-zÄÖÜäöüß])':''; var post=/[a-zäöüß]$/i.test(p[0])?'(?![A-Za-zÄÖÜäöüß])':''; return pre+k+post; });
var RE=new RegExp(parts.join('|'),'gi');
function matchCase(m,en){
  if(m.length>1&&m===m.toUpperCase()&&/[A-ZÄÖÜ]/.test(m)) return en.toUpperCase();
  if(/^[A-ZÄÖÜ]/.test(m)&&/^[a-z]/.test(en)) return en.charAt(0).toUpperCase()+en.slice(1);
  return en;
}
function tr(s){
  if(!s||!/[A-Za-zÄÖÜäöüß]/.test(s)) return s;
  var o=s;
  RULES.forEach(function(r){ o=o.replace(r[0],r[1]); });
  o=o.replace(RE,function(m){ var k=m.toLowerCase(); var en=map[k]; if(en===undefined) return m; return matchCase(m,en); });
  return o;
}
window.rtr=tr;
var SKIP=['SCRIPT','STYLE','TEXTAREA','INPUT'];
function skipEl(el){ while(el&&el.nodeType===1){ if(SKIP.indexOf(el.tagName)>=0) return true; if(el.id==='rcBox'||el.id==='realmNewsBox'||el.id==='top100List'&&0) return true; el=el.parentNode; } return false; }
function doText(n){ if(skipEl(n.parentNode)) return; var v=n.nodeValue, t=tr(v); if(t!==v) n.nodeValue=t; }
function doAttrs(el){ ['placeholder','title','aria-label'].forEach(function(a){ var v=el.getAttribute&&el.getAttribute(a); if(v){ var t=tr(v); if(t!==v) el.setAttribute(a,t); } }); }
function walk(root){
  if(root.nodeType===3){ doText(root); return; }
  if(root.nodeType!==1) return;
  if(SKIP.indexOf(root.tagName)>=0) return;
  doAttrs(root);
  for(var c=root.firstChild;c;c=c.nextSibling) walk(c);
}
function start(){
  walk(document.body); document.title=tr(document.title);
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      if(m.type==='characterData') doText(m.target);
      else if(m.type==='attributes') doAttrs(m.target);
      else m.addedNodes.forEach(function(n){ walk(n); });
    });
  }).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title']});
}
if(document.body) start(); else document.addEventListener('DOMContentLoaded',start);
// Spiel-Kommentare ueber Dialoge
var oa=window.alert, oc=window.confirm; window.alert=function(m){ return oa.call(window,tr(String(m))); }; window.confirm=function(m){ return oc.call(window,tr(String(m))); };
})();
