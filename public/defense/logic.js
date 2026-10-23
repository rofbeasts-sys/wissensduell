/* Brain Defense: Spiellogik (ohne Darstellung). Laeuft im Browser und in Node (Tests). */
(function(root){
var CW=45, COLS=8, ROWS=12, W=COLS*CW, H=ROWS*CW;
function rng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

/* ---- Tuerme (14 Fruchtkoenige) ---- */
var DMG=[1,1.7,2.7,4.2,6.5], RNG=[1,1.05,1.1,1.15,1.2], RATE=[1,1.05,1.1,1.2,1.3], UPC=[0,.8,1.3,2,3];
var PULL=[30,38,48,60,75], BUFF=[.15,.22,.3,.4,.55];
var TOWERS=[
 {id:0,de:"Königin Beere",en:"Queen Berry",fxde:"Verlangsamt",fxen:"Slows",cost:55,dmg:6,rate:1.2,range:100,spd:300,kind:"slow",col:"#6aa8ff"},
 {id:1,de:"König Zitrone",en:"King Lemon",fxde:"Schnelle Schüsse, trifft Flieger",fxen:"Fast shots, hits flyers",cost:60,dmg:4,rate:3.4,range:92,spd:380,kind:"fast",col:"#ffe27a",air:1},
 {id:2,de:"Königin Kirsche",en:"Queen Cherry",fxde:"Flächenschaden",fxen:"Area damage",cost:90,dmg:11,rate:.9,range:88,spd:240,kind:"splash",splash:40,col:"#ff5a78"},
 {id:3,de:"König Apfel",en:"King Apple",fxde:"Rakete, weit, trifft Flieger",fxen:"Rocket, far, hits flyers",cost:115,dmg:40,rate:.55,range:135,spd:220,kind:"rocket",splash:22,col:"#ff8a4d",air:1},
 {id:4,de:"Königin Traube",en:"Queen Grape",fxde:"Gift",fxen:"Poison",cost:75,dmg:3,rate:1,range:96,spd:300,kind:"poison",pdps:6,col:"#c58bff"},
 {id:5,de:"König Heidelbeere",en:"King Blueberry",fxde:"Friert ein",fxen:"Freezes",cost:100,dmg:8,rate:.8,range:96,spd:300,kind:"freeze",col:"#7dd3ff"},
 {id:6,de:"König Banane",en:"King Banana",fxde:"Bumerang, trifft mehrere",fxen:"Boomerang, hits several",cost:80,dmg:7,rate:1.1,range:98,spd:260,kind:"boom",col:"#ffe23d"},
 {id:7,de:"Königin Melone",en:"Queen Melon",fxde:"Mörser, weit, großer Splash",fxen:"Mortar, far, big splash",cost:130,dmg:55,rate:.33,range:175,minr:45,spd:170,kind:"mortar",splash:52,col:"#4fae3a"},
 {id:8,de:"König Kiwi",en:"King Kiwi",fxde:"Scharfschütze, gut gegen Bosse",fxen:"Sniper, great vs bosses",cost:120,dmg:70,rate:.42,range:230,spd:900,kind:"snipe",col:"#8ab83a",air:1},
 {id:9,de:"Königin Ananas",en:"Queen Pineapple",fxde:"Legt Minen auf den Weg",fxen:"Lays mines on the path",cost:95,dmg:28,rate:.33,range:95,spd:0,kind:"mine",splash:38,col:"#ffb03a"},
 {id:10,de:"König Chili",en:"King Chili",fxde:"Flammenwerfer, Brand",fxen:"Flamethrower, burn",cost:85,dmg:5,rate:6,range:72,spd:0,kind:"flame",col:"#ff4a2a"},
 {id:11,de:"König Orange",en:"King Orange",fxde:"Streuschuss, trifft Flieger",fxen:"Fan shot, hits flyers",cost:95,dmg:5,rate:1.4,range:90,spd:320,kind:"fan",col:"#ff9a2b",air:1},
 {id:12,de:"Königin Pflaume",en:"Queen Plum",fxde:"Magnet zieht Gegner zurück",fxen:"Magnet pulls enemies back",cost:90,dmg:0,rate:.28,range:100,spd:0,kind:"magnet",col:"#9a5cff"},
 {id:13,de:"Königin Pfirsich",en:"Queen Peach",fxde:"Feuert Türme im Kreis an",fxen:"Boosts towers nearby",cost:100,dmg:0,rate:0,range:90,spd:0,kind:"buff",col:"#ff8aa0"}
];
/* ---- Haeuser: Boni im Kreis, Stufen mit Kokosnuessen (nur fuer die Runde) ---- */
var FIRE=[3,6,11,18,30], POIS=[2,4,7,11,16], BOLT=[1,2,3,4,6];
var HOUSES=[
 {id:0,k:"rate",de:"Trommel-Hütte",en:"Drum Hut",fxde:"Türme schießen schneller",fxen:"Towers shoot faster",v:[.08,.14,.20,.28,.38],col:"#ffc83d"},
 {id:1,k:"dmg",de:"Kraft-Schmiede",en:"Power Forge",fxde:"Türme machen mehr Schaden",fxen:"Towers deal more damage",v:[.10,.18,.28,.40,.55],col:"#ff5a78"},
 {id:2,k:"range",de:"Ausguck",en:"Lookout",fxde:"Türme haben mehr Reichweite",fxen:"Towers have more range",v:[.06,.10,.15,.20,.28],col:"#6aa8ff"},
 {id:3,k:"coco",de:"Kokos-Lager",en:"Coconut Store",fxde:"Mehr Kokosnüsse (überall)",fxen:"More coconuts (everywhere)",v:[1.5,2,2.5,3,4],col:"#c98a4a"},
 {id:4,k:"frost",de:"Frost-Haus",en:"Frost House",fxde:"Gegner langsamer, Stufe 5 friert ein",fxen:"Slows, level 5 freezes",v:[.08,.14,.20,.27,.35],col:"#7dd3ff"},
 {id:5,k:"gold",de:"Gold-Mühle",en:"Gold Mill",fxde:"Mehr Münzen pro Gegner (überall)",fxen:"More coins per enemy (everywhere)",v:[.10,.20,.32,.45,.60],col:"#ffd75e"},
 {id:6,k:"pois",de:"Gift-Haus",en:"Poison House",fxde:"Treffer vergiften, Stufe 5 steckt an",fxen:"Hits poison, level 5 spreads",v:POIS,col:"#7cff8c"},
 {id:7,k:"bolt",de:"Blitz-Haus",en:"Bolt House",fxde:"Schüsse springen auf mehr Gegner",fxen:"Shots jump to more enemies",v:BOLT,col:"#ffe27a"},
 {id:8,k:"fire",de:"Feuer-Haus",en:"Fire House",fxde:"Extra Schaden, Stufe 5 Flächenbrand",fxen:"Extra damage, level 5 fire area",v:FIRE,col:"#ff8a2b"}
];
var HCOST=[50,100,300,3000,5000], HRAD=110, HMAX=3;
function houseVal(S,kind,x,y){ for(var i=0;i<S.houses.length;i++){ var h=S.houses[i]; if(HOUSES[h.kind].k!==kind) continue; if(x==null||Math.hypot(h.x-x,h.y-y)<=HRAD){ return HOUSES[h.kind].v[h.lv-1]; } } return 0; }
/* ---- Fallen und Faehigkeiten ---- */
var TRAPS=[
 {id:0,de:"Stachelfalle",en:"Spike Trap",fxde:"Trifft die ersten 5 Gegner",fxen:"Hits the first 5 enemies",cost:40,dmg:30,uses:5,r:16,life:60,col:"#cfd6e6"},
 {id:1,de:"Klebefalle",en:"Glue Trap",fxde:"Gegner sehr langsam",fxen:"Enemies very slow",cost:50,r:22,life:30,col:"#c58bff"},
 {id:2,de:"Eisfalle",en:"Ice Trap",fxde:"Friert 2 Sekunden ein",fxen:"Freezes for 2 s",cost:70,uses:8,r:20,life:40,col:"#7dd3ff"},
 {id:3,de:"Bombe",en:"Bomb",fxde:"Explodiert, großer Schaden",fxen:"Explodes, big damage",cost:90,dmg:90,splash:50,r:16,life:90,col:"#ff8a4d"}
];
var ABIL=[
 {id:0,k:"meteor",de:"Meteor",en:"Meteor",fxde:"Tippe eine Stelle: Flächenschaden",fxen:"Tap a spot: area damage",cd:60,col:"#ff8a4d",target:1},
 {id:1,k:"freeze",de:"Kälte-Welle",en:"Cold Wave",fxde:"Alle Gegner 3 s eingefroren",fxen:"All enemies frozen 3 s",cd:75,col:"#7dd3ff"},
 {id:2,k:"coins",de:"Münzregen",en:"Coin Rain",fxde:"Sofort viele Münzen",fxen:"Lots of coins now",cd:90,col:"#ffc83d"},
 {id:3,k:"heal",de:"Heilung",en:"Heal",fxde:"2 Leben zurück",fxen:"+2 lives",cd:120,col:"#ff4d6d"},
 {id:4,k:"turbo",de:"Turbo",en:"Turbo",fxde:"Türme 10 s doppelt so schnell",fxen:"Towers 2x faster for 10 s",cd:90,col:"#ffe27a"},
 {id:5,k:"shield",de:"Schild",en:"Shield",fxde:"Die nächsten 5 Lecks kosten nichts",fxen:"Next 5 leaks are free",cd:100,col:"#3de0ff"}
];
/* ---- Gegner ---- */
var ENEMIES={
 bug:{hp:26,spd:36,rew:5,coco:2,life:1,r:12},
 runner:{hp:15,spd:70,rew:6,coco:2,life:1,r:11},
 swarm:{hp:8,spd:46,rew:2,coco:1,life:1,r:9},
 tank:{hp:100,spd:25,rew:15,coco:8,life:2,r:15},
 snail:{hp:70,spd:17,rew:9,coco:3,life:1,r:12},
 ant:{hp:9,spd:62,rew:2,coco:1,life:1,r:8},
 bat:{hp:18,spd:54,rew:6,coco:2,life:1,r:11,fly:1},
 wasp:{hp:13,spd:88,rew:7,coco:2,life:2,r:10,fly:1},
 shieldbug:{hp:26,spd:34,rew:8,coco:3,life:1,r:12,shield:.9},
 frog:{hp:32,spd:34,rew:8,coco:3,life:1,r:12,jump:1},
 hedgehog:{hp:42,spd:30,rew:9,coco:3,life:1,r:12,armor:.6},
 healbug:{hp:30,spd:32,rew:10,coco:4,life:1,r:12,heal:1},
 icebug:{hp:34,spd:36,rew:8,coco:3,life:1,r:12,imI:1},
 ghost:{hp:36,spd:40,rew:8,coco:3,life:1,r:12,ghost:1},
 flybug:{hp:26,spd:40,rew:8,coco:3,life:1,r:12,fly:1},
 spider:{hp:44,spd:36,rew:11,coco:4,life:1,r:12,web:1},
 firebug:{hp:34,spd:36,rew:9,coco:3,life:1,r:12,imF:1},
 penguin:{hp:38,spd:38,rew:9,coco:3,life:1,r:12,peng:1},
 zombie:{hp:36,spd:34,rew:11,coco:4,life:1,r:12,revive:1},
 mrobot:{hp:34,spd:34,rew:11,coco:4,life:1,r:12,accel:1},
 puffer:{hp:30,spd:60,rew:12,coco:4,life:1,r:11,puff:1},
 boltbug:{hp:34,spd:36,rew:9,coco:3,life:1,r:12,imB:1},
 poisonbug:{hp:22,spd:36,rew:9,coco:3,life:1,r:12,imP:1},
 boss:{hp:900,spd:21,rew:160,coco:100,life:5,r:24}
};
var BOSSES=[
 {de:"Riesen-Raupe",en:"Giant Caterpillar",hpm:1},{de:"Abriss-Roboter",en:"Wrecking Robot",hpm:1.15},
 {de:"Pilz-König",en:"Mushroom King",hpm:1},{de:"Lava-Golem",en:"Lava Golem",hpm:1.2},
 {de:"Riesen-Krabbe",en:"Giant Crab",hpm:1},{de:"Skorpion",en:"Scorpion",hpm:1.05},
 {de:"Zuckerguss-Monster",en:"Frosting Monster",hpm:1.1},{de:"Kraken",en:"Kraken",hpm:1.25},
 {de:"Eis-Yeti",en:"Ice Yeti",hpm:1.2},{de:"Das böse Gehirn",en:"The Evil Brain",hpm:1.6}
];
function hpMul(L){ return 1+0.1*(L-1)+0.0028*(L-1)*(L-1); }

/* ---- Welten: 10 Gebiete mit je 10 Leveln ---- */
var ZONES=[
 {id:"wiese",de:"Obst-Wiese",en:"Fruit Meadow"},{id:"stadt",de:"Stadt",en:"City"},
 {id:"wald",de:"Pilzwald",en:"Mushroom Forest"},{id:"lava",de:"Lava",en:"Lava"},
 {id:"strand",de:"Strand",en:"Beach"},{id:"wueste",de:"Sandwüste",en:"Sand Desert"},
 {id:"sues",de:"Süßwelt",en:"Candy World"},{id:"wasser",de:"Unterwasser",en:"Underwater"},
 {id:"schnee",de:"Schneeland",en:"Snowland"},{id:"all",de:"Universum",en:"Universe"}
];
function zoneOf(L){ return Math.min(9,Math.floor((L-1)/10)); }

/* ---- Wege ---- */
function mkPath(pts){ var len=[0], i; for(i=1;i<pts.length;i++) len.push(len[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y)); return {pts:pts,len:len,total:len[len.length-1]}; }
function P(x,y){ return {x:x,y:y}; }
function singlePts(L,R){
  var rows=[], cols=[], r, i, nH, flip=R()<.5;
  nH=L<=3?3:(L<=15?3+Math.floor(R()*2):3+Math.floor(R()*3));
  r=1+Math.floor(R()*2); rows.push(r);
  while(rows.length<nH){ r+=2+Math.floor(R()*2); if(r>9) break; rows.push(r); }
  nH=rows.length;
  var c=1+Math.floor(R()*6); cols.push(c);
  for(i=1;i<=nH;i++){ var nc,t=0; do{ nc=1+Math.floor(R()*6); t++; }while(Math.abs(nc-c)<3&&t<40); cols.push(nc); c=nc; }
  var pts=[[cols[0],-1]];
  for(i=0;i<nH;i++){ pts.push([cols[i],rows[i]]); pts.push([cols[i+1],rows[i]]); }
  pts.push([cols[nH],ROWS]);
  if(flip) pts=pts.map(function(p){ return [COLS-1-p[0],p[1]]; });
  return pts.map(function(p){ return P(p[0]*CW+CW/2,p[1]*CW+CW/2); });
}
function mapType(L){ if(L<8) return "single"; var R=rng(L*53+9), r=R(); if(L<20) return r<.4?"single":(r<.7?"fork":"twoIn"); return r<.22?"single":(r<.48?"fork":(r<.74?"twoIn":"cross")); }
function nearestPath(lay,x,y){ var best={d:1e9,x:0,y:0}, k, j; for(k=0;k<lay.paths.length;k++){ var p=lay.paths[k].pts; for(j=1;j<p.length;j++){ var ax=p[j-1].x,ay=p[j-1].y,dx=p[j].x-ax,dy=p[j].y-ay,tt=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1))),qx=ax+dx*tt,qy=ay+dy*tt,dd=Math.hypot(x-qx,y-qy); if(dd<best.d){ best={d:dd,x:qx,y:qy}; } } } return best; }
function layout(L){
  var R=rng(L*977+13), type=mapType(L), paths=[], jx=function(a){ return (R()-.5)*2*a; }, cx=W/2+jx(26), mirror=R()<.5, sy=-22, ey=H+22, i;
  if(type==="single"){ paths.push(mkPath(singlePts(L,R))); }
  else if(type==="fork"){ var ys=70+jx(12), ym=335+jx(18), d=78+R()*20, a=[P(cx,sy),P(cx,ys),P(cx-d,ys+48),P(cx-d,ym),P(cx,ym+48),P(cx,ey)], b=[P(cx,sy),P(cx,ys),P(cx+d,ys+48),P(cx+d,ym),P(cx,ym+48),P(cx,ey)]; paths.push(mkPath(a),mkPath(b)); }
  else if(type==="twoIn"){ var ax=62+jx(14), bx=W-62+jx(14), y1=240+jx(30), a2=[P(ax,sy),P(ax,y1-44),P(ax+44,y1),P(cx,y1),P(cx,ey)], b2=[P(bx,sy),P(bx,y1-44),P(bx-44,y1),P(cx,y1),P(cx,ey)]; paths.push(mkPath(a2),mkPath(b2)); }
  else { var ax2=70+jx(10), bx2=W-70+jx(10), a3=[P(ax2,sy),P(ax2,105),P(bx2,345),P(bx2,ey)], b3=[P(bx2,sy),P(bx2,105),P(ax2,345),P(ax2,ey)]; paths.push(mkPath(a3),mkPath(b3)); }
  if(mirror&&type!=="single"&&type!=="cross") paths=paths.map(function(p){ return mkPath(p.pts.map(function(q){ return P(W-q.x,q.y); })); });
  var lay={L:L,zone:zoneOf(L),type:type,paths:paths,path:paths[0].pts,len:paths[0].len,total:paths[0].total};
  if(type==="cross"){ lay.bridge={x:(paths[0].pts[1].x+paths[0].pts[2].x)/2,y:(paths[0].pts[1].y+paths[0].pts[2].y)/2}; }
  return lay;
}
/* Gute Bauplaetze (nur fuer den Test-Bot und Hilfen) */
function suggestSpots(lay,n){ var c=[], x, y, j, k; for(y=30;y<H-24;y+=18) for(x=24;x<W-20;x+=18){ var np=nearestPath(lay,x,y); if(np.d<30) continue; var cov=0; for(k=0;k<lay.paths.length;k++){ var p=lay.paths[k].pts; for(j=0;j<p.length;j++){} } for(k=0;k<lay.paths.length;k++){ var tot=lay.paths[k].total; for(j=0;j<tot;j+=14){ var q=posAt(lay.paths[k],j); if(Math.hypot(q.x-x,q.y-y)<95) cov++; } } c.push({x:x,y:y,s:cov}); } c.sort(function(a,b){ return b.s-a.s; }); var out=[]; for(j=0;j<c.length&&out.length<(n||30);j++){ var ok=true; for(k=0;k<out.length;k++) if(Math.hypot(out[k].x-c[j].x,out[k].y-c[j].y)<34) ok=false; if(ok) out.push(c[j]); } return out; }

/* ---- Wellen ---- */
function goalWaves(L){ return 5+Math.floor(L/8); }
var SPEC=[["snail",4,1,1],["bat",8,3,1.4],["wasp",12,3,1.4],["shieldbug",14,2,1.4],["frog",15,2,1.4],["hedgehog",17,2,1.4],["healbug",18,3,1],["icebug",21,3,1.4],["ghost",22,2,1.4],["flybug",25,3,1.4],["spider",28,3,1],["firebug",31,3,1.4],["penguin",35,2,1.4],["zombie",42,3,1.4],["boltbug",45,3,1.4],["mrobot",50,3,1.4],["puffer",58,3,1.4],["poisonbug",61,3,1.4]];
var BIAS={healbug:2,spider:2,firebug:3,icebug:8,penguin:8,boltbug:9,puffer:4,poisonbug:6};
function bossIndex(L,w,n){ return (L%10===0&&w===n-1)?L/10-1:((w>=n&&(w+1)%10===0)?zoneOf(L):-1); }
function waveDef(L,w){ // gibt Liste {t,type} zurueck
  var R=rng(L*131+w*17+7), ev=[], n=goalWaves(L), t=0, i, zi=zoneOf(L), bi=bossIndex(L,w,n), boss=bi>=0;
  var nb=Math.round(5+w*1.6+L*.11), gap=Math.max(.38,.95-L*.004), specs=[], k, extra=0;
  var el=SPEC.filter(function(s){ return L>=s[1]&&w>=s[2]; });
  el.forEach(function(s){ s.sc=R()*2+(BIAS[s[0]]===zi?3:0); }); el.sort(function(a,b){ return b.sc-a.sc; });
  specs=el.slice(0,Math.min(4,1+Math.floor(L/12)));
  var cnts=specs.map(function(s){ var c=Math.max(1,Math.round((1+w*.28+L*.016)*s[3]*(BIAS[s[0]]===zi?1.7:1))); c=Math.min(12,c); extra+=c; return c; });
  nb=Math.max(3,nb-Math.round(extra*.5));
  for(i=0;i<nb;i++){ ev.push({t:t,type:"bug"}); t+=gap*(.8+R()*.5); }
  if(L>=3&&w>=1){ var nr=Math.round(2+w*.9+L*.05); t+=.6; for(i=0;i<nr;i++){ ev.push({t:t,type:"runner"}); t+=gap*.7; } }
  if(L>=5&&w>=2){ t+=.8; var na=8+Math.floor(w/2); for(i=0;i<na;i++){ ev.push({t:t,type:"ant"}); t+=.28; } }
  if(L>=6&&w>=2){ var ng=1+Math.floor(w/3+L/40); for(var g=0;g<ng;g++){ t+=1.2; for(i=0;i<7;i++){ ev.push({t:t,type:"swarm"}); t+=.22; } } }
  specs.forEach(function(s,si){ t+=.9; for(i=0;i<cnts[si];i++){ ev.push({t:t,type:s[0]}); t+=gap*1.1; } });
  if(L>=10&&w>=2){ var nt=Math.round(1+w*.5+L*.05); t+=1; for(i=0;i<nt;i++){ ev.push({t:t,type:"tank"}); t+=gap*2.4; } }
  if(boss){ t+=2.5; ev.push({t:t,type:"boss",bk:bi}); }
  ev.sort(function(a,b){ return a.t-b.t; });
  return ev;
}
function startCoins(L){ return Math.min(1100,150+L*11); }

/* ---- Spielzustand ---- */
function create(L){
  var lay=layout(L);
  return { L:L, lay:lay, lives:10, maxLives:10, coins:startCoins(L), wave:0, status:"build", time:0, speed:1,
    towers:[], houses:[], traps:[], mines:[], coco:0, goal:goalWaves(L), goalDone:false, enemies:[], shots:[], fx:[], queue:[], qt:0, uid:0, killed:0, lost:0, mul:hpMul(L), nextIn:0, auto:true,
    wroute:0, freeTrap:1, turbo:0, shieldN:0, pend:[], ab:ABIL.map(function(a){ return {id:a.id,cd:0}; }) };
}
function nextRoute(S){ var n=S.lay.paths.length; return n>1?(S.wave%n):0; }
function canPlace(S,x,y){ if(x<20||x>W-20||y<34||y>H-26) return false; if(nearestPath(S.lay,x,y).d<28) return false; var k; for(k=0;k<S.towers.length;k++) if(Math.hypot(S.towers[k].x-x,S.towers[k].y-y)<30) return false; for(k=0;k<S.houses.length;k++) if(Math.hypot(S.houses[k].x-x,S.houses[k].y-y)<30) return false; return true; }
function towerStat(tp,lv){ var t=TOWERS[tp]; return {dmg:t.dmg*DMG[lv-1], range:t.range*RNG[lv-1], rate:t.rate*RATE[lv-1]}; }
function effStat(S,tw){ var T=TOWERS[tw.tp], st=towerStat(tw.tp,tw.lv), r=0,d=0,rg=0,hf=0,hp=0,hb=0, i, h;
  for(i=0;i<S.houses.length;i++){ h=S.houses[i]; if(Math.hypot(h.x-tw.x,h.y-tw.y)>HRAD) continue; var kk=HOUSES[h.kind].k, v=HOUSES[h.kind].v[h.lv-1]; if(kk==="rate") r+=v; else if(kk==="dmg") d+=v; else if(kk==="range") rg+=v; else if(kk==="fire") hf=h.lv; else if(kk==="pois") hp=h.lv; else if(kk==="bolt") hb=h.lv; }
  for(i=0;i<S.towers.length;i++){ var b=S.towers[i]; if(b===tw||TOWERS[b.tp].kind!=="buff") continue; if(Math.hypot(b.x-tw.x,b.y-tw.y)<=TOWERS[b.tp].range*RNG[b.lv-1]){ r+=BUFF[b.lv-1]; d+=BUFF[b.lv-1]*.8; } }
  var rm=1+r; if(S.turbo>0) rm*=2; if(tw.gum>0) rm*=.5;
  return {dmg:st.dmg*(1+d)*(1+.05*((S.tg&&S.tg[tw.tp])||0)),range:st.range*(1+rg)*(tw.blind>0?.6:1),rate:st.rate*rm,bonus:{rate:r,dmg:d,range:rg},hf:hf,hp:hp,hb:hb}; }
function buildHouse(S,x,y,kind){ if(S.status==="won"||S.status==="lost"||S.status==="goal") return false; if(!canPlace(S,x,y)) return false; if(S.houses.length>=HMAX||S.coco<HCOST[0]) return false; for(var i=0;i<S.houses.length;i++) if(S.houses[i].kind===kind) return false; S.coco-=HCOST[0]; S.houses.push({id:++S.uid,kind:kind,lv:1,paid:HCOST[0],x:x,y:y,pt:0}); return true; }
function houseUpCost(h){ return h.lv>=5?0:HCOST[h.lv]; }
function upgradeHouse(S,id){ for(var i=0;i<S.houses.length;i++){ var h=S.houses[i]; if(h.id===id){ if(h.lv>=5) return false; var c=HCOST[h.lv]; if(S.coco<c) return false; S.coco-=c; h.paid+=c; h.lv++; return true; } } return false; }
function sellHouse(S,id){ for(var i=0;i<S.houses.length;i++) if(S.houses[i].id===id){ S.coco+=Math.floor(S.houses[i].paid*.7); S.houses.splice(i,1); return true; } return false; }
function build(S,x,y,tp){ var t=TOWERS[tp]; if(S.status==="won"||S.status==="lost"||S.coins<t.cost||!canPlace(S,x,y)) return false; S.coins-=t.cost; S.towers.push({id:++S.uid,tp:tp,lv:1,x:x,y:y,cd:.3,paid:t.cost,ang:0,flash:0,stun:0,blind:0,gum:0,mines:0}); return true; }
function upCost(tw){ return tw.lv>=5?0:Math.round(TOWERS[tw.tp].cost*UPC[tw.lv]); }
function upgrade(S,id){ var tw=S.towers.filter(function(x){return x.id===id})[0]; if(!tw||tw.lv>=5) return false; var c=upCost(tw); if(S.coins<c) return false; S.coins-=c; tw.paid+=c; tw.lv++; tw.flash=1; return true; }
function sell(S,id){ for(var i=0;i<S.towers.length;i++) if(S.towers[i].id===id){ S.coins+=Math.floor(S.towers[i].paid*.7); S.mines=S.mines.filter(function(m){ return m.tw!==id; }); S.towers.splice(i,1); return true; } return false; }
function placeTrap(S,type,x,y){ var T=TRAPS[type]; if(!T||S.status==="won"||S.status==="lost"||S.traps.length>=10) return false; var np=nearestPath(S.lay,x,y); if(np.d>28) return false; var free=S.freeTrap>0, cost=free?0:T.cost; if(S.coins<cost) return false; S.coins-=cost; if(free) S.freeTrap--; S.traps.push({id:++S.uid,type:type,x:np.x,y:np.y,life:T.life,uses:T.uses||1,hit:{},t:0}); return true; }
function useAbility(S,i,x,y){ var a=ABIL[i], st=S.ab[i]; if(!a||!st||st.cd>0||S.status==="won"||S.status==="lost") return false;
  if(a.k==="meteor"){ if(x==null) return false; var rr=64; S.fx.push({k:"meteor",x:x,y:y,t:0,r:rr}); S.enemies.forEach(function(o){ if(!o.dead&&Math.hypot(o.x-x,o.y-y)<=rr+o.r*.4) dmgEnemy(S,o,150*S.mul); }); }
  else if(a.k==="freeze"){ S.enemies.forEach(function(o){ freezeE(o,3); }); S.fx.push({k:"wave",x:W/2,y:H/2,t:0,col:"#7dd3ff"}); }
  else if(a.k==="coins"){ S.coins+=Math.round(40*(1+S.L*.05)); S.fx.push({k:"wave",x:W/2,y:60,t:0,col:"#ffc83d"}); }
  else if(a.k==="heal"){ S.lives=Math.min(S.maxLives,S.lives+2); }
  else if(a.k==="turbo"){ S.turbo=10; }
  else if(a.k==="shield"){ S.shieldN=5; }
  st.cd=a.cd; return true; }
function startWave(S){ if(S.status!=="build") return false; S.queue=waveDef(S.L,S.wave).map(function(e){return {t:e.t,type:e.type,bk:e.bk}}); S.qt=0; S.wroute=nextRoute(S); S.wave++; S.status="run"; S.coins+=Math.round(8+S.wave*2); S.freeTrap=1; return true; }
function spawn(S,type,route,bk,d0){ var d=ENEMIES[type], hp=d.hp*S.mul*(1+.035*(S.wave-1)); if(type==="boss"){ hp*=BOSSES[bk].hpm*(1+S.L*.02+Math.max(0,S.wave-S.goal)*.15); }
  var path=S.lay.paths[route]||S.lay.paths[0], sp0=posAt(path,d0||0);
  var e={id:++S.uid,type:type,hp:hp,max:hp,d:d0||0,spd:d.spd,r:d.r,x:sp0.x,y:sp0.y,slow:0,slowT:0,frz:0,pois:0,poisT:0,burn:0,burnT:0,dead:false,rew:d.rew*(1+S.L*.05),life:d.life,wob:Math.random()*6,route:route,fly:!!d.fly,ghost:!!d.ghost,imI:!!d.imI,imB:!!d.imB,imP:!!d.imP,imF:!!d.imF,armor:d.armor||0,sh:d.shield?hp*d.shield:0,age:0,jt:3,wt:3,ht:1};
  if(type==="boss"){ e.bk=bk; e.bt=6; e.nextRush=.8; e.phase=0; if(bk===3) e.imF=true; if(bk===8) e.imI=true; if(bk===1) e.sh=hp*.4; }
  S.enemies.push(e); return e; }
function posAt(path,d){ var p=path.pts, len=path.len, i=1; while(i<len.length-1&&len[i]<d) i++; var a=p[i-1], b=p[i], s=(d-len[i-1])/Math.max(1,len[i]-len[i-1]); s=Math.max(0,Math.min(1,s)); return {x:a.x+(b.x-a.x)*s,y:a.y+(b.y-a.y)*s}; }
function B_COCO(t){ return ENEMIES[t].coco; }
function slowE(e,f,t){ if(e.imI) return; e.slow=f; e.slowT=t; }
function freezeE(e,t){ if(e.dead||e.imI) return; e.frz=Math.max(e.frz,e.type==="boss"?t*.4:t); }
function poisonE(e,dps,t){ if(e.imP||e.dead) return; e.pois=Math.max(e.pois,dps); e.poisT=Math.max(e.poisT,t); }
function dmgEnemy(S,e,dm){ if(e.dead||dm<=0) return; if(e.armor) dm*=e.armor; if(e.puffed) dm*=.6; if(ENEMIES[e.type].accel) e.age=0;
  if(e.sh>0){ if(dm<=e.sh){ e.sh-=dm; return; } dm-=e.sh; e.sh=0; }
  e.hp-=dm;
  if(e.type==="boss"&&e.bk===4&&e.hp>0&&e.hp<e.nextRush*e.max){ e.rush=2; e.nextRush-=.2; }
  if(e.hp<=0){ if(ENEMIES[e.type].revive&&!e.revived){ e.revived=1; e.hp=e.max*.5; S.fx.push({k:"spark",x:e.x,y:e.y,t:0,col:"#8ab86a"}); return; }
    e.dead=true; var cn=Math.round(e.rew*(1+houseVal(S,"gold"))), cm=houseVal(S,"coco")||1, cg=Math.round(B_COCO(e.type)*cm); S.coins+=cn; S.coco+=cg; S.killed++; S.fx.push({k:"die",x:e.x,y:e.y,t:0,type:e.type,coins:cn,coco:cg});
    if(e.type==="boss"&&e.bk===0){ for(var q=0;q<3;q++) S.pend.push({type:"bug",route:e.route,d:Math.max(0,e.d-q*8)}); } } }
function splashAt(S,x,y,r,dm,air){ S.enemies.forEach(function(o){ if(!o.dead&&(air||!o.fly)&&Math.hypot(o.x-x,o.y-y)<=r+o.r*.4) dmgEnemy(S,o,dm); }); }
function houseFx(S,e,st,dm){ if(e.dead&&!(st.hf||st.hp)) return; var k;
  if(st.hf&&!e.imF){ var fd=FIRE[st.hf-1]*(1+S.L*.04); dmgEnemy(S,e,fd); if(st.hf>=5){ S.fx.push({k:"boom",x:e.x,y:e.y,t:0,r:34,col:"#ff8a2b"}); S.enemies.forEach(function(o){ if(o!==e&&!o.dead&&!o.fly&&!o.imF&&Math.hypot(o.x-e.x,o.y-e.y)<=34) dmgEnemy(S,o,fd*.5); }); } }
  if(st.hp&&!e.imP){ var pd=POIS[st.hp-1]*(1+S.L*.05); poisonE(e,pd,4); if(st.hp>=5){ S.enemies.forEach(function(o){ if(o!==e&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=42) poisonE(o,pd*.7,4); }); } }
  if(st.hb&&!e.imB){ var n=BOLT[st.hb-1], cur=e, used={}; used[e.id]=1; for(k=0;k<n;k++){ var nx=null, nd=80; S.enemies.forEach(function(o){ if(o.dead||used[o.id]||o.imB) return; var dd=Math.hypot(o.x-cur.x,o.y-cur.y); if(dd<nd){ nd=dd; nx=o; } }); if(!nx) break; used[nx.id]=1; S.fx.push({k:"bolt",x:cur.x,y:cur.y,x2:nx.x,y2:nx.y,t:0}); dmgEnemy(S,nx,dm*.6); cur=nx; } } }
function strike(S,e,dm,st){ dmgEnemy(S,e,dm); houseFx(S,e,st,dm); }
function hit(S,sh){
  var e=sh.target, T=TOWERS[sh.tp], st=sh.st, mul=sh.mul||1;
  var cx=e.dead?sh.lx:e.x, cy=e.dead?sh.ly:e.y;
  if(T.kind==="mortar"){ var rm=T.splash*(1+(sh.lv-1)*.08); S.fx.push({k:"boom",x:cx,y:cy,t:0,r:rm,col:T.col}); S.enemies.forEach(function(o){ if(!o.dead&&!o.fly&&Math.hypot(o.x-cx,o.y-cy)<=rm+o.r*.4){ dmgEnemy(S,o,st.dmg); if(st.hf&&!o.imF) dmgEnemy(S,o,FIRE[st.hf-1]*.5); if(st.hp) poisonE(o,POIS[st.hp-1]*(1+S.L*.05),4); } }); return; }
  if(T.splash){ var rr=T.splash*(1+(sh.lv-1)*.08); S.fx.push({k:"boom",x:cx,y:cy,t:0,r:rr,col:T.col}); S.enemies.forEach(function(o){ if(!o.dead&&(T.air||!o.fly)&&Math.hypot(o.x-cx,o.y-cy)<=rr+o.r*.4) dmgEnemy(S,o,st.dmg); }); return; }
  if(e.dead) return;
  S.fx.push({k:"spark",x:cx,y:cy,t:0,col:T.col});
  var dm=st.dmg*mul; if(T.kind==="snipe"&&e.type==="boss") dm*=2.2;
  strike(S,e,dm,st);
  if(T.kind==="slow") slowE(e,.55-(sh.lv-1)*.04,1.6+sh.lv*.3);
  if(T.kind==="poison") poisonE(e,T.pdps*DMG[sh.lv-1],3);
  if(T.kind==="freeze"){ if(Math.random()<.28+sh.lv*.04) freezeE(e,1+sh.lv*.12); }
  if(T.kind==="boom"){ var cnt=0; S.enemies.forEach(function(o){ if(cnt<2&&o!==e&&!o.dead&&!o.fly&&Math.hypot(o.x-e.x,o.y-e.y)<=62){ cnt++; S.fx.push({k:"bolt",x:e.x,y:e.y,x2:o.x,y2:o.y,t:0,col:"#ffe23d"}); dmgEnemy(S,o,dm*.7); } }); }
}
function nearestTower(S,x,y,r){ var best=null, bd=r; S.towers.forEach(function(t){ var d=Math.hypot(t.x-x,t.y-y); if(d<bd){ bd=d; best=t; } }); return best; }
function bossAct(S,e){ var bk=e.bk, t;
  if(bk===1){ t=nearestTower(S,e.x,e.y,120); if(t){ t.stun=3; S.fx.push({k:"spark",x:t.x,y:t.y,t:0,col:"#ffd75e"}); } e.bt=12; }
  else if(bk===2){ S.enemies.forEach(function(o){ if(!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=90) o.hp=Math.min(o.max,o.hp+o.max*.05); }); S.fx.push({k:"wave",x:e.x,y:e.y,t:0,col:"#9aff6a"}); e.bt=3; }
  else if(bk===3){ S.towers.forEach(function(w){ if(Math.hypot(w.x-e.x,w.y-e.y)<=70) w.stun=2; }); S.fx.push({k:"wave",x:e.x,y:e.y,t:0,col:"#ff7a2a"}); e.bt=8; }
  else if(bk===5){ S.towers.forEach(function(w){ if(Math.hypot(w.x-e.x,w.y-e.y)<=100) w.blind=4; }); S.fx.push({k:"wave",x:e.x,y:e.y,t:0,col:"#e8c26a"}); e.bt=9; }
  else if(bk===6){ t=nearestTower(S,e.x,e.y,120); if(t){ t.gum=5; S.fx.push({k:"spark",x:t.x,y:t.y,t:0,col:"#ff8ac4"}); } e.bt=8; }
  else if(bk===7){ for(var q=0;q<3;q++) S.pend.push({type:"swarm",route:e.route,d:Math.max(0,e.d-q*10)}); t=nearestTower(S,e.x,e.y,90); if(t) t.stun=2; e.bt=10; }
  else if(bk===8){ S.towers.forEach(function(w){ if(Math.hypot(w.x-e.x,w.y-e.y)<=80) w.stun=2.5; }); S.fx.push({k:"wave",x:e.x,y:e.y,t:0,col:"#9fe3ff"}); e.bt=9; }
  else if(bk===9){ var ph=e.hp<e.max*.33?2:(e.hp<e.max*.66?1:0), tot=S.lay.paths[e.route].total; if(ph>e.phase){ e.phase=ph; e.d=Math.max(0,Math.min(tot-6,e.d+(Math.random()<.5?-70:50))); S.fx.push({k:"wave",x:e.x,y:e.y,t:0,col:"#ff4de0"}); }
    var typ=["bug","runner","tank"], cn=1+ph; for(var z=0;z<cn;z++) S.pend.push({type:typ[Math.floor(Math.random()*(ph+1))],route:e.route,d:Math.max(0,e.d-z*10)}); e.bt=8; }
  else e.bt=99; }
function step(S,dt){
  if(S.status==="won"||S.status==="lost"||S.status==="goal") return;
  dt*=S.speed; S.time+=dt; var i,k,e;
  S.ab.forEach(function(a){ if(a.cd>0) a.cd=Math.max(0,a.cd-dt); }); if(S.turbo>0) S.turbo-=dt;
  if(S.status==="run"){
    S.qt+=dt; var np=S.lay.paths.length; while(S.queue.length&&S.queue[0].t<=S.qt){ var ev=S.queue.shift(), rt=S.wroute; if(np>1&&S.wave>=6&&(S.uid%2===1)) rt=(rt+1)%np; spawn(S,ev.type,rt,ev.bk); }
    if(!S.queue.length&&!S.enemies.length&&!S.pend.length){ if(!S.goalDone&&S.wave>=S.goal){ S.goalDone=true; S.status="goal"; S.stars=S.lost===0?3:(S.lost<=3?2:1); return; } S.status="build"; S.nextIn=7; }
  } else if(S.status==="build"&&S.wave>0&&S.auto){ S.nextIn-=dt; if(S.nextIn<=0) startWave(S); }
  for(i=0;i<S.houses.length;i++){ var hh=S.houses[i]; if(HOUSES[hh.kind].k==="frost"&&hh.lv>=5){ hh.pt=(hh.pt||0)+dt; if(hh.pt>=6){ hh.pt=0; S.fx.push({k:"wave",x:hh.x,y:hh.y,t:0,col:"#7dd3ff"}); S.enemies.forEach(function(o){ if(!o.dead&&Math.hypot(o.x-hh.x,o.y-hh.y)<=HRAD) freezeE(o,1.2); }); } } }
  for(i=0;i<S.enemies.length;i++){ e=S.enemies[i]; if(e.dead) continue; var D=ENEMIES[e.type];
    if(e.poisT>0){ e.poisT-=dt; dmgEnemy(S,e,e.pois*dt); } if(e.burnT>0){ e.burnT-=dt; dmgEnemy(S,e,e.burn*dt); }
    if(e.dead) continue;
    if(e.slowT>0) e.slowT-=dt; if(e.frz>0) e.frz-=dt; if(e.rush>0) e.rush-=dt; if(e.accel||D.accel) e.age+=dt;
    if(D.jump){ e.jt-=dt; if(e.jt<=0){ e.d+=45; e.jt=3.2; S.fx.push({k:"spark",x:e.x,y:e.y,t:0,col:"#4ad87a"}); } }
    if(D.heal){ e.ht-=dt; if(e.ht<=0){ e.ht=1; S.enemies.forEach(function(o){ if(!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=70) o.hp=Math.min(o.max,o.hp+o.max*.05); }); } }
    if(D.web){ e.wt-=dt; if(e.wt<=0){ e.wt=5; var wt2=nearestTower(S,e.x,e.y,90); if(wt2) wt2.gum=2.5; } }
    if(D.puff&&!e.puffed&&e.hp<e.max*.5){ e.puffed=1; e.r*=1.5; e.spd*=.55; S.fx.push({k:"spark",x:e.x,y:e.y,t:0,col:"#ffb03a"}); }
    if(e.type==="boss"){ e.bt-=dt; if(e.bt<=0) bossAct(S,e); }
    var fr=e.imI?0:houseVal(S,"frost",e.x,e.y), mult=(e.rush>0?2.2:1)*(D.accel?1+Math.min(.9,Math.max(0,e.age-5)*.18):1)*(D.peng?(S.lay.zone===8?1.7:1.1):1);
    var sp=e.spd*mult*(e.slowT>0?e.slow:1)*(e.frz>0?0:1)*(1-fr); e.d+=sp*dt; e.wob+=dt*6;
    var path=S.lay.paths[e.route];
    if(e.d>=path.total){ e.dead=true; e.leaked=true; if(S.shieldN>0){ S.shieldN--; S.fx.push({k:"wave",x:e.x,y:e.y,t:0,col:"#3de0ff"}); } else { S.lives-=e.life; S.lost+=e.life; S.fx.push({k:"leak",x:e.x,y:e.y,t:0}); } if(S.lives<=0){ S.lives=0; S.status="lost"; } continue; }
    var p=posAt(path,e.d); e.dx=p.x-e.x; e.x=p.x; e.y=p.y; }
  /* Fallen und Minen */
  for(i=S.traps.length-1;i>=0;i--){ var tr=S.traps[i], TT=TRAPS[tr.type], gone=false; tr.t+=dt; tr.life-=dt; if(tr.life<=0) gone=true;
    for(k=0;k<S.enemies.length&&!gone;k++){ e=S.enemies[k]; if(e.dead||e.fly||e.ghost||Math.hypot(e.x-tr.x,e.y-tr.y)>TT.r) continue;
      if(tr.type===0){ if(!tr.hit[e.id]){ tr.hit[e.id]=1; dmgEnemy(S,e,TT.dmg*S.mul); S.fx.push({k:"spark",x:e.x,y:e.y,t:0,col:TT.col}); if(--tr.uses<=0) gone=true; } }
      else if(tr.type===1){ slowE(e,.25,.6); }
      else if(tr.type===2){ if(!tr.hit[e.id]&&!e.imI){ tr.hit[e.id]=1; freezeE(e,2); S.fx.push({k:"spark",x:e.x,y:e.y,t:0,col:TT.col}); if(--tr.uses<=0) gone=true; } }
      else if(tr.type===3){ S.fx.push({k:"boom",x:tr.x,y:tr.y,t:0,r:TT.splash,col:TT.col}); splashAt(S,tr.x,tr.y,TT.splash,TT.dmg*S.mul,false); gone=true; } }
    if(gone) S.traps.splice(i,1); }
  for(i=S.mines.length-1;i>=0;i--){ var mn=S.mines[i], blow=false; mn.life-=dt; if(mn.life<=0){ S.mines.splice(i,1); var ot=S.towers.filter(function(x){return x.id===mn.tw})[0]; if(ot) ot.mines=Math.max(0,ot.mines-1); continue; }
    for(k=0;k<S.enemies.length;k++){ e=S.enemies[k]; if(!e.dead&&!e.fly&&!e.ghost&&Math.hypot(e.x-mn.x,e.y-mn.y)<=14){ blow=true; break; } }
    if(blow){ S.fx.push({k:"boom",x:mn.x,y:mn.y,t:0,r:mn.splash,col:"#ffb03a"}); splashAt(S,mn.x,mn.y,mn.splash,mn.dmg,false); S.mines.splice(i,1); var ot2=S.towers.filter(function(x){return x.id===mn.tw})[0]; if(ot2) ot2.mines=Math.max(0,ot2.mines-1); } }
  /* Tuerme */
  for(i=0;i<S.towers.length;i++){ var tw=S.towers[i], T=TOWERS[tw.tp], st=effStat(S,tw); tw.cd-=dt; if(tw.flash>0) tw.flash-=dt*2; if(tw.stun>0) tw.stun-=dt; if(tw.blind>0) tw.blind-=dt; if(tw.gum>0) tw.gum-=dt; if(tw.kick>0) tw.kick-=dt*5;
    if(tw.stun>0||T.kind==="buff") continue;
    var inr=[]; for(k=0;k<S.enemies.length;k++){ var o=S.enemies[k]; if(o.dead) continue; if(o.fly&&!T.air&&T.kind!=="magnet") continue; var dd=Math.hypot(o.x-tw.x,o.y-tw.y); if(dd<=st.range+o.r*.5&&(!T.minr||dd>=T.minr)) inr.push(o); }
    if(T.kind==="mine"){ if(tw.cd<=0&&tw.mines<3+tw.lv){ var tries=0; while(tries++<14){ var pk=S.lay.paths[Math.floor(Math.random()*S.lay.paths.length)], pp=posAt(pk,Math.random()*pk.total); if(Math.hypot(pp.x-tw.x,pp.y-tw.y)<st.range*.95&&!S.mines.some(function(m){ return Math.hypot(m.x-pp.x,m.y-pp.y)<18; })){ S.mines.push({x:pp.x,y:pp.y,tw:tw.id,dmg:st.dmg,splash:T.splash*(1+(tw.lv-1)*.08),life:70}); tw.mines++; tw.cd=1/st.rate; tw.kick=1; break; } } if(tries>=14) tw.cd=.5; } continue; }
    if(!inr.length) continue;
    var best=inr[0]; for(k=1;k<inr.length;k++){ if(T.kind==="snipe"){ if(inr[k].max>best.max) best=inr[k]; } else if(inr[k].d>best.d) best=inr[k]; }
    tw.ang=Math.atan2(best.y-tw.y,best.x-tw.x);
    if(tw.cd>0) continue;
    if(T.kind==="magnet"){ tw.cd=1/st.rate; tw.kick=1; var pl=PULL[tw.lv-1]; S.fx.push({k:"wave",x:tw.x,y:tw.y,t:0,col:T.col}); inr.forEach(function(o){ o.d=Math.max(0,o.d-pl*(o.type==="boss"?.25:1)); }); continue; }
    if(T.kind==="flame"){ tw.cd=1/st.rate; tw.kick=1; var fa=tw.ang; S.fx.push({k:"flame",x:tw.x,y:tw.y-10,a:fa,t:0,r:st.range}); inr.forEach(function(o){ var ao=Math.atan2(o.y-tw.y,o.x-tw.x), df=Math.abs(((ao-fa+3*Math.PI)%(2*Math.PI))-Math.PI); if(df<=.5){ strike(S,o,st.dmg,st); if(!o.imF){ o.burn=Math.max(o.burn,st.dmg*3); o.burnT=2; } } }); continue; }
    tw.cd=1/st.rate; tw.kick=1;
    if(T.kind==="fan"){ var tl=inr.slice().sort(function(a,b){return b.d-a.d}); for(k=0;k<5;k++){ var tg=tl[k%tl.length]; S.shots.push({x:tw.x,y:tw.y-20,target:tg,tp:tw.tp,lv:tw.lv,st:st,spd:T.spd,lx:tg.x,ly:tg.y,mul:.4,off:(k-2)*.16}); } }
    else S.shots.push({x:tw.x,y:tw.y-20,target:best,tp:tw.tp,lv:tw.lv,st:st,spd:T.spd,lx:best.x,ly:best.y}); }
  for(i=S.shots.length-1;i>=0;i--){ var s=S.shots[i], tg2=s.target; if(!tg2.dead){ s.lx=tg2.x; s.ly=tg2.y; } var dx=s.lx-s.x, dy=s.ly-s.y, dist=Math.hypot(dx,dy), mv=s.spd*dt;
    if(dist<=mv+4){ hit(S,s); S.shots.splice(i,1); } else { s.x+=dx/dist*mv; s.y+=dy/dist*mv; s.rot=Math.atan2(dy,dx); } }
  for(i=S.enemies.length-1;i>=0;i--) if(S.enemies[i].dead) S.enemies.splice(i,1);
  while(S.pend.length){ var pe=S.pend.shift(); spawn(S,pe.type,pe.route,0,pe.d); }
  for(i=S.fx.length-1;i>=0;i--){ S.fx[i].t+=dt; if(S.fx[i].t>(S.fx[i].k==="meteor"?.7:.5)) S.fx.splice(i,1); }
}
var api={CW:CW,COLS:COLS,ROWS:ROWS,W:W,H:H,TOWERS:TOWERS,ENEMIES:ENEMIES,BOSSES:BOSSES,ZONES:ZONES,TRAPS:TRAPS,ABIL:ABIL,FIRE:FIRE,POIS:POIS,BOLT:BOLT,PULL:PULL,BUFF:BUFF,zoneOf:zoneOf,layout:layout,mapType:mapType,nearestPath:nearestPath,suggestSpots:suggestSpots,posAt:posAt,canPlace:canPlace,nextRoute:nextRoute,placeTrap:placeTrap,useAbility:useAbility,goalWaves:goalWaves,waveDef:waveDef,create:create,build:build,upgrade:upgrade,upCost:upCost,sell:sell,startWave:startWave,step:step,towerStat:towerStat,effStat:effStat,HOUSES:HOUSES,HCOST:HCOST,HRAD:HRAD,HMAX:HMAX,buildHouse:buildHouse,upgradeHouse:upgradeHouse,houseUpCost:houseUpCost,sellHouse:sellHouse,houseVal:houseVal,hpMul:hpMul,rng:rng,startCoins:startCoins,DMG:DMG};
if(typeof module!=="undefined"&&module.exports) module.exports=api; else root.BDL=api;
})(typeof window!=="undefined"?window:globalThis);
