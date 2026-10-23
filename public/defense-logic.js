/* Brain Defense: Spiellogik (ohne Darstellung). Laeuft im Browser und in Node (Tests). */
(function(root){
var CW=45, COLS=8, ROWS=12, W=COLS*CW, H=ROWS*CW;
function rng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

/* ---- Tuerme (sechs Fruchtkoenige) ---- */
var DMG=[1,1.7,2.7,4.2,6.5], RNG=[1,1.05,1.1,1.15,1.2], RATE=[1,1.05,1.1,1.2,1.3], UPC=[0,.8,1.3,2,3];
var TOWERS=[
 {id:0,de:"Königin Beere",en:"Queen Berry",fxde:"Verlangsamt",fxen:"Slows",cost:55,dmg:6,rate:1.2,range:100,spd:300,kind:"slow",col:"#6aa8ff"},
 {id:1,de:"König Zitrone",en:"King Lemon",fxde:"Schnelle Schüsse",fxen:"Fast shots",cost:60,dmg:4,rate:3.4,range:92,spd:380,kind:"fast",col:"#ffe27a"},
 {id:2,de:"Königin Kirsche",en:"Queen Cherry",fxde:"Flächenschaden",fxen:"Area damage",cost:90,dmg:11,rate:.9,range:88,spd:240,kind:"splash",splash:40,col:"#ff5a78"},
 {id:3,de:"König Apfel",en:"King Apple",fxde:"Rakete, weit",fxen:"Rocket, far",cost:115,dmg:40,rate:.55,range:135,spd:220,kind:"rocket",splash:22,col:"#ff8a4d"},
 {id:4,de:"Königin Traube",en:"Queen Grape",fxde:"Gift",fxen:"Poison",cost:75,dmg:3,rate:1,range:96,spd:300,kind:"poison",pdps:6,col:"#c58bff"},
 {id:5,de:"König Heidelbeere",en:"King Blueberry",fxde:"Friert ein",fxen:"Freezes",cost:100,dmg:8,rate:.8,range:96,spd:300,kind:"freeze",col:"#7dd3ff"}
];
/* ---- Haeuser: Boni fuer Tuerme/Gegner im Kreis, Stufen dauerhaft mit Kokosnuessen ---- */
var HOUSES=[
 {id:0,k:"rate",de:"Trommel-Hütte",en:"Drum Hut",fxde:"Türme schießen schneller",fxen:"Towers shoot faster",v:[.08,.14,.20,.28,.38],col:"#ffc83d"},
 {id:1,k:"dmg",de:"Kraft-Schmiede",en:"Power Forge",fxde:"Türme machen mehr Schaden",fxen:"Towers deal more damage",v:[.10,.18,.28,.40,.55],col:"#ff5a78"},
 {id:2,k:"range",de:"Ausguck",en:"Lookout",fxde:"Türme haben mehr Reichweite",fxen:"Towers have more range",v:[.06,.10,.15,.20,.28],col:"#6aa8ff"},
 {id:3,k:"coco",de:"Kokos-Lager",en:"Coconut Store",fxde:"Mehr Kokosnüsse",fxen:"More coconuts",v:[1.5,2,2.5,3,4],col:"#c98a4a"},
 {id:4,k:"frost",de:"Frost-Haus",en:"Frost House",fxde:"Gegner werden langsamer",fxen:"Enemies slow down",v:[.08,.14,.20,.27,.35],col:"#7dd3ff"},
 {id:5,k:"gold",de:"Gold-Mühle",en:"Gold Mill",fxde:"Mehr Münzen pro Gegner",fxen:"More coins per enemy",v:[.10,.20,.32,.45,.60],col:"#ffd75e"}
];
var HCOST=[50,100,300,3000,5000], HRAD=110, HMAX=3;
function houseVal(S,kind,x,y){ for(var i=0;i<S.houses.length;i++){ var h=S.houses[i]; if(HOUSES[h.kind].k!==kind) continue; if(x==null||Math.hypot(h.x-x,h.y-y)<=HRAD){ return HOUSES[h.kind].v[h.lv-1]; } } return 0; }
/* ---- Gegner ---- */
var ENEMIES={
 bug:{hp:26,spd:36,rew:5,coco:2,life:1,r:12},
 runner:{hp:15,spd:70,rew:6,coco:2,life:1,r:11},
 swarm:{hp:8,spd:46,rew:2,coco:1,life:1,r:9},
 tank:{hp:100,spd:25,rew:15,coco:8,life:2,r:15},
 boss:{hp:900,spd:21,rew:160,coco:100,life:5,r:24}
};
function hpMul(L){ return 1+0.1*(L-1)+0.0028*(L-1)*(L-1); }

/* ---- Zonen: 10 Gebiete mit je 10 Leveln ---- */
var ZONES=[
 {id:"wiese",de:"Obst-Wiese",en:"Fruit Meadow"},{id:"wald",de:"Pilzwald",en:"Mushroom Forest"},
 {id:"wueste",de:"Sandwüste",en:"Sand Desert"},{id:"schnee",de:"Schneeland",en:"Snowland"},
 {id:"sumpf",de:"Schleim-Sumpf",en:"Slime Swamp"},{id:"vulkan",de:"Vulkan",en:"Volcano"},
 {id:"kristall",de:"Kristallhöhle",en:"Crystal Cave"},{id:"wolken",de:"Wolkeninsel",en:"Cloud Island"},
 {id:"neon",de:"Neon-Stadt",en:"Neon City"},{id:"kern",de:"Gehirn-Kern",en:"Brain Core"}
];
function zoneOf(L){ return Math.min(9,Math.floor((L-1)/10)); }

/* ---- Level-Layout: Weg + Bauplaetze (aus dem Level berechnet, immer gleich) ---- */
function layout(L){
  var R=rng(L*977+13), rows=[], cols=[], r, i, nH, flip=R()<.5;
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
  var cells={}, cl=[];
  function mark(x,y){ var k=x+","+y; if(!cells[k]){ cells[k]=1; cl.push([x,y]); } }
  for(i=1;i<pts.length;i++){ var a=pts[i-1], b=pts[i], dx=Math.sign(b[0]-a[0]), dy=Math.sign(b[1]-a[1]), x=a[0], y=a[1]; mark(x,y); while(x!==b[0]||y!==b[1]){ x+=dx; y+=dy; mark(x,y); } }
  var path=pts.map(function(p){ return {x:p[0]*CW+CW/2,y:p[1]*CW+CW/2}; });
  var len=[0]; for(i=1;i<path.length;i++) len.push(len[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y));
  /* Bauplaetze: Zellen neben dem Weg, nach Abdeckung sortiert, mit Abstand */
  var cand=[];
  for(var cy=0;cy<ROWS;cy++) for(var cx=0;cx<COLS;cx++){
    if(cells[cx+","+cy]) continue;
    var near=0, ortho=false; for(var j=0;j<cl.length;j++){ var dd=Math.max(Math.abs(cl[j][0]-cx),Math.abs(cl[j][1]-cy)); if(dd<=2) near++; if(Math.abs(cl[j][0]-cx)+Math.abs(cl[j][1]-cy)===1) ortho=true; }
    if(near>=2) cand.push({c:cx,r:cy,s:near+(ortho?3:0)+R()*2});
  }
  cand.sort(function(a,b){ return b.s-a.s; });
  var want=9+(L>=40?1:0)+(L>=75?1:0), pads=[];
  for(i=0;i<cand.length&&pads.length<want;i++){ var ok=true; for(j=0;j<pads.length;j++) if(Math.abs(pads[j].c-cand[i].c)<=1&&Math.abs(pads[j].r-cand[i].r)<=1) ok=false; if(ok) pads.push({c:cand[i].c,r:cand[i].r,x:cand[i].c*CW+CW/2,y:cand[i].r*CW+CW/2}); }
  return {L:L,zone:zoneOf(L),path:path,len:len,total:len[len.length-1],cells:cells,pads:pads,flip:flip};
}

/* ---- Wellen ---- */
function goalWaves(L){ return 5+Math.floor(L/8); }
function waveDef(L,w){ // gibt Liste {t,type} zurueck
  var R=rng(L*131+w*17+7), ev=[], n=goalWaves(L), t=0, i, boss=(L%10===0&&w===n-1)||(w>=n&&(w+1)%10===0);
  var nb=Math.round(5+w*1.6+L*.11), gap=Math.max(.38,.95-L*.004);
  for(i=0;i<nb;i++){ ev.push({t:t,type:"bug"}); t+=gap*(.8+R()*.5); }
  if(L>=3&&w>=1){ var nr=Math.round(2+w*.9+L*.05); t+=.6; for(i=0;i<nr;i++){ ev.push({t:t,type:"runner"}); t+=gap*.7; } }
  if(L>=6&&w>=2){ var ng=1+Math.floor(w/3+L/40); for(var g=0;g<ng;g++){ t+=1.2; for(i=0;i<7;i++){ ev.push({t:t,type:"swarm"}); t+=.22; } } }
  if(L>=10&&w>=2){ var nt=Math.round(1+w*.5+L*.05); t+=1; for(i=0;i<nt;i++){ ev.push({t:t,type:"tank"}); t+=gap*2.4; } }
  if(boss){ t+=2.5; ev.push({t:t,type:"boss"}); }
  ev.sort(function(a,b){ return a.t-b.t; });
  return ev;
}
function startCoins(L){ return Math.min(1100,150+L*11); }

/* ---- Spielzustand ---- */
function create(L){
  var lay=layout(L);
  return { L:L, lay:lay, lives:10, maxLives:10, coins:startCoins(L), wave:0, status:"build", time:0, speed:1,
    towers:[], houses:[], coco:0, goal:goalWaves(L), goalDone:false, enemies:[], shots:[], fx:[], queue:[], qt:0, uid:0, killed:0, lost:0, mul:hpMul(L), nextIn:0, auto:true };
}
function padFree(S,i){ var k; for(k=0;k<S.towers.length;k++) if(S.towers[k].pad===i) return false; for(k=0;k<S.houses.length;k++) if(S.houses[k].pad===i) return false; return true; }
function towerStat(tp,lv){ var t=TOWERS[tp]; return {dmg:t.dmg*DMG[lv-1], range:t.range*RNG[lv-1], rate:t.rate*RATE[lv-1]}; }
function effStat(S,tw){ var st=towerStat(tw.tp,tw.lv), r=0,d=0,rg=0, i, h; for(i=0;i<S.houses.length;i++){ h=S.houses[i]; if(Math.hypot(h.x-tw.x,h.y-tw.y)>HRAD) continue; var v=HOUSES[h.kind].v[h.lv-1], kk=HOUSES[h.kind].k; if(kk==="rate") r+=v; else if(kk==="dmg") d+=v; else if(kk==="range") rg+=v; } return {dmg:st.dmg*(1+d),range:st.range*(1+rg),rate:st.rate*(1+r),bonus:{rate:r,dmg:d,range:rg}}; }
function buildHouse(S,pad,kind){ if(!S.lay.pads[pad]||!padFree(S,pad)||S.status==="won"||S.status==="lost"||S.status==="goal") return false; if(S.houses.length>=HMAX||S.coco<HCOST[0]) return false; for(var i=0;i<S.houses.length;i++) if(S.houses[i].kind===kind) return false; S.coco-=HCOST[0]; S.houses.push({id:++S.uid,pad:pad,kind:kind,lv:1,paid:HCOST[0],x:S.lay.pads[pad].x,y:S.lay.pads[pad].y}); return true; }
function houseUpCost(h){ return h.lv>=5?0:HCOST[h.lv]; }
function upgradeHouse(S,id){ for(var i=0;i<S.houses.length;i++){ var h=S.houses[i]; if(h.id===id){ if(h.lv>=5) return false; var c=HCOST[h.lv]; if(S.coco<c) return false; S.coco-=c; h.paid+=c; h.lv++; return true; } } return false; }
function sellHouse(S,id){ for(var i=0;i<S.houses.length;i++) if(S.houses[i].id===id){ S.coco+=Math.floor(S.houses[i].paid*.7); S.houses.splice(i,1); return true; } return false; }
function build(S,pad,tp){ var t=TOWERS[tp]; if(!S.lay.pads[pad]||!padFree(S,pad)||S.coins<t.cost||S.status==="won"||S.status==="lost") return false; S.coins-=t.cost; S.towers.push({id:++S.uid,pad:pad,tp:tp,lv:1,x:S.lay.pads[pad].x,y:S.lay.pads[pad].y,cd:.3,paid:t.cost,ang:0,flash:0}); return true; }
function upCost(tw){ return tw.lv>=5?0:Math.round(TOWERS[tw.tp].cost*UPC[tw.lv]); }
function upgrade(S,id){ var tw=S.towers.filter(function(x){return x.id===id})[0]; if(!tw||tw.lv>=5) return false; var c=upCost(tw); if(S.coins<c) return false; S.coins-=c; tw.paid+=c; tw.lv++; tw.flash=1; return true; }
function sell(S,id){ for(var i=0;i<S.towers.length;i++) if(S.towers[i].id===id){ S.coins+=Math.floor(S.towers[i].paid*.7); S.towers.splice(i,1); return true; } return false; }
function startWave(S){ if(S.status!=="build") return false; S.queue=waveDef(S.L,S.wave).map(function(e){return {t:e.t,type:e.type}}); S.qt=0; S.wave++; S.status="run"; S.coins+=Math.round(8+S.wave*2); return true; }
function spawn(S,type){ var d=ENEMIES[type], hp=d.hp*S.mul*(1+.035*(S.wave-1))*(type==="boss"?1+S.L*.02+Math.max(0,S.wave-S.goal)*.15:1); S.enemies.push({id:++S.uid,type:type,hp:hp,max:hp,d:0,spd:d.spd,r:d.r,x:S.lay.path[0].x,y:S.lay.path[0].y,slow:0,slowT:0,frz:0,pois:0,poisT:0,dead:false,rew:d.rew*(1+S.L*.05),life:d.life,wob:Math.random()*6}); }
function posAt(lay,d){ var p=lay.path, len=lay.len, i=1; while(i<len.length-1&&len[i]<d) i++; var a=p[i-1], b=p[i], s=(d-len[i-1])/Math.max(1,len[i]-len[i-1]); s=Math.max(0,Math.min(1,s)); return {x:a.x+(b.x-a.x)*s,y:a.y+(b.y-a.y)*s}; }
function B_COCO(t){ return ENEMIES[t].coco; }
function dmgEnemy(S,e,dm){ if(e.dead) return; e.hp-=dm; if(e.hp<=0){ e.dead=true; var cn=Math.round(e.rew*(1+houseVal(S,"gold",e.x,e.y))), cm=houseVal(S,"coco",e.x,e.y)||1, cg=Math.round(B_COCO(e.type)*cm); S.coins+=cn; S.coco+=cg; S.killed++; S.fx.push({k:"die",x:e.x,y:e.y,t:0,type:e.type,coins:cn,coco:cg}); } }
function hit(S,sh){
  var e=sh.target, T=TOWERS[sh.tp], st=sh.st;
  var cx=e.dead?sh.lx:e.x, cy=e.dead?sh.ly:e.y;
  if(T.splash){ var rr=T.splash*(1+(sh.lv-1)*.08); S.fx.push({k:"boom",x:cx,y:cy,t:0,r:rr,col:T.col}); S.enemies.forEach(function(o){ if(!o.dead&&Math.hypot(o.x-cx,o.y-cy)<=rr+o.r*.4) dmgEnemy(S,o,st.dmg); }); return; }
  if(e.dead) return;
  S.fx.push({k:"spark",x:cx,y:cy,t:0,col:T.col});
  dmgEnemy(S,e,st.dmg);
  if(T.kind==="slow"){ e.slow=.55-(sh.lv-1)*.04; e.slowT=1.6+sh.lv*.3; }
  if(T.kind==="poison"){ e.pois=T.pdps*DMG[sh.lv-1]; e.poisT=3; }
  if(T.kind==="freeze"){ if(Math.random()<.28+sh.lv*.04) e.frz=Math.max(e.frz,(e.type==="boss"?.4:1)+sh.lv*.12); }
}
function step(S,dt){
  if(S.status==="won"||S.status==="lost"||S.status==="goal") return;
  dt*=S.speed; S.time+=dt; var i,k;
  if(S.status==="run"){
    S.qt+=dt; while(S.queue.length&&S.queue[0].t<=S.qt){ spawn(S,S.queue.shift().type); }
    if(!S.queue.length&&!S.enemies.length){ if(!S.goalDone&&S.wave>=S.goal){ S.goalDone=true; S.status="goal"; S.stars=S.lost===0?3:(S.lost<=3?2:1); return; } S.status="build"; S.nextIn=7; }
  } else if(S.status==="build"&&S.wave>0&&S.auto){ S.nextIn-=dt; if(S.nextIn<=0) startWave(S); }
  for(i=0;i<S.enemies.length;i++){ var e=S.enemies[i];
    if(e.poisT>0){ e.poisT-=dt; dmgEnemy(S,e,e.pois*dt); }
    if(e.slowT>0) e.slowT-=dt; if(e.frz>0) e.frz-=dt;
    var fr=houseVal(S,"frost",e.x,e.y), sp=e.spd*(e.slowT>0?e.slow:1)*(e.frz>0?0:1)*(1-fr); e.d+=sp*dt; e.wob+=dt*6;
    if(e.d>=S.lay.total){ e.dead=true; e.leaked=true; S.lives-=e.life; S.lost+=e.life; S.fx.push({k:"leak",x:e.x,y:e.y,t:0}); if(S.lives<=0){ S.lives=0; S.status="lost"; } continue; }
    var p=posAt(S.lay,e.d); e.dx=p.x-e.x; e.x=p.x; e.y=p.y; }
  for(i=0;i<S.towers.length;i++){ var tw=S.towers[i], T=TOWERS[tw.tp], st=effStat(S,tw); tw.cd-=dt; if(tw.flash>0) tw.flash-=dt*2;
    var best=null, bd=-1; for(k=0;k<S.enemies.length;k++){ var o=S.enemies[k]; if(o.dead) continue; if(Math.hypot(o.x-tw.x,o.y-tw.y)<=st.range+o.r*.5&&o.d>bd){ bd=o.d; best=o; } }
    if(best){ tw.ang=Math.atan2(best.y-tw.y,best.x-tw.x); if(tw.cd<=0){ tw.cd=1/st.rate; tw.kick=1; S.shots.push({x:tw.x,y:tw.y-20,target:best,tp:tw.tp,lv:tw.lv,st:st,spd:T.spd,lx:best.x,ly:best.y}); } }
    if(tw.kick>0) tw.kick-=dt*5; }
  for(i=S.shots.length-1;i>=0;i--){ var s=S.shots[i], tg=s.target; if(!tg.dead){ s.lx=tg.x; s.ly=tg.y; } var dx=s.lx-s.x, dy=s.ly-s.y, dist=Math.hypot(dx,dy), mv=s.spd*dt;
    if(dist<=mv+4){ hit(S,s); S.shots.splice(i,1); } else { s.x+=dx/dist*mv; s.y+=dy/dist*mv; s.rot=Math.atan2(dy,dx); } }
  for(i=S.enemies.length-1;i>=0;i--) if(S.enemies[i].dead) S.enemies.splice(i,1);
  for(i=S.fx.length-1;i>=0;i--){ S.fx[i].t+=dt; if(S.fx[i].t>.5) S.fx.splice(i,1); }
}
var api={CW:CW,COLS:COLS,ROWS:ROWS,W:W,H:H,TOWERS:TOWERS,ENEMIES:ENEMIES,ZONES:ZONES,zoneOf:zoneOf,layout:layout,goalWaves:goalWaves,waveDef:waveDef,create:create,build:build,upgrade:upgrade,upCost:upCost,sell:sell,startWave:startWave,step:step,padFree:padFree,towerStat:towerStat,effStat:effStat,HOUSES:HOUSES,HCOST:HCOST,HRAD:HRAD,HMAX:HMAX,buildHouse:buildHouse,upgradeHouse:upgradeHouse,houseUpCost:houseUpCost,sellHouse:sellHouse,houseVal:houseVal,hpMul:hpMul,rng:rng,startCoins:startCoins,DMG:DMG};
if(typeof module!=="undefined"&&module.exports) module.exports=api; else root.BDL=api;
})(typeof window!=="undefined"?window:globalThis);
