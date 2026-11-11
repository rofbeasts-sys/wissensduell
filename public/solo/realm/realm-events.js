/* Realm-Events: Schatz-Memory (Juwelen), Münzen-Rausch (Tap-Spiel), Schicksals-Brett.
   Pro Tag ist ein anderes Event dran. Im Admin (Spiele-Liste, Gruppe "Realm Events") kann jedes Event aus- und eingeschaltet werden. */
(function(){
function $(i){return document.getElementById(i)}
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function shuf(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function tk(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function dayN(o){var d=new Date();return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5)+(o||0)}
function st(){inventory.evt=inventory.evt||{};return inventory.evt}
function sv(){try{saveInventory()}catch(e){}}
function K(){try{return window.__kamEvtK()}catch(e){return 1}}
function fmt(n){return Math.round(n).toLocaleString('de')}
var EV=[
 {id:'mem',f:'realm_ev_mem',ic:'🧠',n:'Schatz-Memory',d:'Finde Paare. Jedes Paar gibt dir sofort Juwelen. 3 Fehlversuche pro Start.'},
 {id:'tap',f:'realm_ev_tap',ic:'💰',n:'Schleim-Jagd',d:'Jahres-Event: 5 Schleime, je 3 Sterne. Erste Siege geben 500 / 1.500 / 5.000 Münzen, dazu Begleiter-Upgrades.'},
 {id:'board',f:'realm_ev_board',ic:'🎲',n:'Schicksals-Brett',d:'Ein Würfel pro Tag. Gold, Gegenstände und Diamanten.'}];
var FT=null,FTt=0;
function feat(){
 if(FT&&Date.now()-FTt<60000)return Promise.resolve(FT);
 var k='';try{if(localStorage.getItem('bp_admin_key')&&localStorage.getItem('bp_admin_view')==='1')k=localStorage.getItem('bp_admin_key')}catch(e){}
 return fetch('/api/features',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(k?{adminKey:k}:{})}).then(function(r){return r.json()}).then(function(j){FT=j&&j.ok?j:{locked:[],hidden:[],maint:[]};FTt=Date.now();return FT}).catch(function(){FT=FT||{locked:[],hidden:[],maint:[]};return FT})}
function on(e){var f=FT||{};return (f.locked||[]).indexOf(e.f)<0&&(f.hidden||[]).indexOf(e.f)<0&&(f.maint||[]).indexOf(e.f)<0}
function plan(){var E=EV.filter(function(e){return on(e)&&e.id!=='tap'});if(!E.length)return{list:[],today:null,tom:null};return{list:E,today:E[dayN()%E.length],tom:E[dayN(1)%E.length]}}
var TEST=true; /* TESTMODUS: alle Events offen + unbegrenzt gratis. Zum Ausschalten auf false setzen */
function played(id){if(TEST)return false;var s=st(),t=tk();return id==='board'?!!(s.board&&s.board.last===t):s[id]===t}
function byId(id){return EV.filter(function(e){return e.id===id})[0]}
var CSS='<style>.evb{display:block;width:100%;padding:13px;border-radius:12px;border:2px solid #f0c040;background:linear-gradient(135deg,#8a0000,#c62000);color:#ffe9a0;font:700 1rem Georgia,serif;text-align:center;letter-spacing:2px;cursor:pointer}.evb[disabled]{opacity:.45;cursor:default}.evbar{display:flex;justify-content:space-between;font-size:.8rem;padding:8px 12px;border:1px solid #f0c04055;border-radius:10px;background:#0006;margin-bottom:10px}.evh{display:flex;align-items:center;gap:10px;margin-bottom:12px}.evh b{flex:1;text-align:center;color:#f0c040;letter-spacing:2px}@keyframes evfl{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-70px);opacity:0}}.evd{position:absolute;font-weight:700;pointer-events:none;text-shadow:0 0 6px #000;animation:evfl .7s ease-out forwards;z-index:5}@keyframes evsh{0%{transform:translate(0,0)}25%{transform:translate(8px,-3px)}60%{transform:translate(-5px,2px)}100%{transform:translate(0,0)}}.evsh{animation:evsh .18s}.mc{aspect-ratio:1;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:6px;transition:transform .15s}.mc:active{transform:scale(.94)}@keyframes evA{0%,49.9%{opacity:1}50%,100%{opacity:0}}@keyframes evB{0%,49.9%{opacity:0}50%,100%{opacity:1}}.sA{animation:evA .9s steps(1) infinite}.sB{animation:evB .9s steps(1) infinite}.sH{display:none}.hit .sA,.hit .sB{display:none}.hit .sH{display:block}.ejg,.ejp,.ejy{display:inline-block;width:1.5em;height:1.5em;vertical-align:middle;background:center/contain no-repeat;margin:0 2px;filter:drop-shadow(0 0 3px #000)}.ejg{background-image:url(items/evgem_g.webp)}.ejp{background-image:url(items/evgem_b.webp)}.ejy{background-image:url(items/evgem_y.webp)}.evb.g2{background:linear-gradient(135deg,#0a5a1a,#1a9a30)}.evb.p2{background:linear-gradient(135deg,#0a2a6a,#2f7ae0)}</style>';
function modal(h){var M=$('evModal');if(!M){M=document.createElement('div');M.id='evModal';M.style.cssText='position:fixed;inset:0;z-index:900;overflow-y:auto;background:radial-gradient(circle at 50% 0,#2a1245,#0d0814 65%);color:#ffe9c4;font-family:Georgia,serif';document.body.appendChild(M)}M.innerHTML=CSS+'<div style="max-width:420px;margin:0 auto;padding:14px 14px 40px">'+h+'</div>';M.style.display='block';return M}
function head(t,back){return '<div class="evh"><button class="btn btn-sm" onclick="'+(back||'__evOpen()')+'">← ZURÜCK</button><b>'+t+'</b></div>'}
function gainGold(n){if(TEST)return;meta.gold=(meta.gold||0)+n;try{questTracking.goldEarned=(questTracking.goldEarned||0)+n;saveQuestTracking()}catch(e){}}
function gainDia(n){if(TEST)return;meta.diamonds=(meta.diamonds||0)+n;try{globalDiamonds+=n;saveDiamonds(globalDiamonds)}catch(e){}}
function done(){try{updateUI()}catch(e){}sv()}
var EM={m:1,free:false};
function S2(){return TEST?(st().test=st().test||{}):st()}
var PRICE={g:15,p:60};
function tcnt(k){return st()['t'+k]||0}
function startBtns(id,lbl){
 var fr=!played(id),h='<div style="margin-top:14px">';
 h+=fr?'<div class="evb" onclick="__evGo(\''+id+'\',0)">'+lbl+' · GRATIS</div>':'<div style="text-align:center;font-size:.75rem;color:#6fe08a;margin-bottom:8px">✓ Gratis-Versuch von heute ist benutzt</div>';
 h+='<div class="evb g2" style="margin-top:8px;'+(tcnt('g')?'':'opacity:.45')+'" onclick="__evGo(\''+id+'\',1)"><i class="ejg"></i> Grün-Juwel einsetzen (×'+tcnt('g')+')<div style="font-size:.62rem;letter-spacing:0;font-weight:400">Extra-Versuch, normale Beute</div></div>';
 h+='<div class="evb p2" style="margin-top:8px;'+(tcnt('p')?'':'opacity:.45')+'" onclick="__evGo(\''+id+'\',2)"><i class="ejp"></i> Blau-Juwel einsetzen (×'+tcnt('p')+')<div style="font-size:.62rem;letter-spacing:0;font-weight:400">Extra-Versuch mit 5-facher Beute</div></div></div>';
 return h}
window.__evGo=function(id,m){
 var s=st();
 if(m===0){if(played(id))return;EM={m:1,free:true};if(id==='board')bd().last=tk();else s[id]=tk()}
 else if(m===1){if(tcnt('g')<1)return;s.tg--;EM={m:1,free:false}}
 else{if(tcnt('p')<1)return;s.tp--;EM={m:5,free:false}}
 sv();if(id==='mem')__evMemStart();else if(id==='tap')__evTapStart();else __evRollGo()};
function ticketDrop(){
 if(!EM.free||TEST)return '';var r=Math.random(),s=st();
 if(r<.05){s.tp=(s.tp||0)+1;sv();return '<div style="margin-top:8px;color:#7fc0ff;font-size:.85rem"><i class="ejp"></i> Bonus: 1 Blau-Juwel!</div>'}
 if(r<.35){s.tg=(s.tg||0)+1;sv();return '<div style="margin-top:8px;color:#7fe08a;font-size:.85rem"><i class="ejg"></i> Bonus: 1 Grün-Juwel!</div>'}
 return ''}
window.__evBuyT=function(k){if(TEST)return;if((meta.diamonds||0)<PRICE[k])return;gainDia(-PRICE[k]);var s=st();s['t'+k]=(s['t'+k]||0)+1;done();hub()};
window.__evClose=function(){tapStop();var M=$('evModal');if(M)M.style.display='none';done()};

/* ---------- Hub ---------- */
window.__evOpen=function(){tapStop();feat().then(hub)};
function hub(){
 var P=plan(),h=head('🎉 EVENTS','__evClose()');
 var tapOn=byId('tap')&&on(byId('tap'));
 if(!P.list.length){if(!tapOn)h+='<p style="text-align:center;font-size:.85rem;opacity:.8;margin:30px 0">Gerade ist kein Event aktiv.</p>'}
 else{
  h+='<div style="display:flex;gap:8px;margin-bottom:10px"><div style="flex:1;text-align:center;padding:8px 4px;border:1px solid #1a9a30;border-radius:10px;background:#0006;font-size:.7rem"><i class="ejg"></i> Grün-Juwel ×<b>'+tcnt('g')+'</b><div class="evb g2" style="padding:5px;font-size:.62rem;margin-top:4px;letter-spacing:0" onclick="__evBuyT(\'g\')">kaufen · '+PRICE.g+' 💎</div></div><div style="flex:1;text-align:center;padding:8px 4px;border:1px solid #2f7ae0;border-radius:10px;background:#0006;font-size:.7rem"><i class="ejp"></i> Blau-Juwel ×<b>'+tcnt('p')+'</b><div class="evb p2" style="padding:5px;font-size:.62rem;margin-top:4px;letter-spacing:0" onclick="__evBuyT(\'p\')">kaufen · '+PRICE.p+' 💎</div></div></div><p style="font-size:.62rem;opacity:.7;text-align:center;margin:0 0 10px">Jedes Event: 1× pro Tag gratis. Mit Juwelen spielst du extra (Blau = 5-fache Beute).</p>'+
  '<p style="text-align:center;font-size:.75rem;opacity:.8;margin:0 0 12px">'+(TEST?'<b style="color:#6fe08a">TESTMODUS:</b> alle Events offen, unbegrenzt gratis.':'Jeden Tag ist ein anderes Event dran.')+''+(P.list.length>1?' Morgen: <b>'+P.tom.ic+' '+P.tom.n+'</b>':'')+'</p>';
  P.list.forEach(function(e){
   var td=TEST||e===P.today,dn=played(e.id);
   h+='<div style="display:flex;gap:12px;align-items:center;padding:12px;margin-bottom:10px;border-radius:14px;border:2px solid '+(td?'#f0c040':'#ffffff22')+';background:'+(td?'#3a2a0a66':'#0006')+(td?'':';opacity:.55')+'"><div style="font-size:2.2rem">'+e.ic+'</div><div style="flex:1"><b style="font-size:.95rem">'+e.n+'</b><div style="font-size:.68rem;opacity:.8;line-height:1.35">'+e.d+'</div></div>'+
   (td?'<button class="evb" style="width:auto;padding:10px 14px;font-size:.8rem" onclick="__evPlay(\''+e.id+'\')">'+(dn?'EXTRA':'SPIELEN')+'</button>':'<span style="font-size:.65rem;text-align:center">Heute<br>nicht dran</span>')+'</div>'});
 }
 if(tapOn){var te=byId('tap');h+='<div style="display:flex;gap:12px;align-items:center;padding:12px;margin-bottom:10px;border-radius:14px;border:2px solid #6fe08a;background:#0a3a1a66"><div style="font-size:2.2rem">'+te.ic+'</div><div style="flex:1"><b style="font-size:.95rem">'+te.n+'</b><div style="font-size:.68rem;opacity:.85;line-height:1.35">'+te.d+'</div></div><button class="evb" style="width:auto;padding:10px 14px;font-size:.8rem" onclick="__evPlay(\'tap\')">SPIELEN</button></div>'}
 modal(h)}
window.__evPlay=function(id){feat().then(function(){var P=plan(),e=byId(id);if(!e||!on(e)||(id!=='tap'&&!TEST&&(!P.today||P.today.id!==id))){hub();return}if(id==='mem')memIntro();else if(id==='tap')tapIntro();else boardOpen()})};

/* ---------- Schatz-Memory ---------- */
var MM=null,TRIES=3;
function mmDeck(){var keys=[],big=0;for(var i=0;i<8;i++){var c='rgby'.charAt(rnd(0,3)),r=Math.random()*100,t=r<34?1:r<62?2:r<84?3:r<95?4:5;if(t>=4){if(big>=2)t=rnd(1,3);else big++}keys.push(c+t)}return shuf(keys.concat(keys))}
function mmLoad(){var o=S2(),m=o.mm;if(!m||m.day!==tk()||!m.deck||m.deck.length!==16)m=o.mm={day:tk(),deck:mmDeck(),ok:{}};return m}
function mmFound(m){return Object.keys(m.ok).length/2}
function giveGem(k,n){if(TEST)return '';return window.__gemGive(k.charAt(0),+k.charAt(1),n)}
function memIntro(){
 var m=mmLoad(),f=mmFound(m);
 modal(head('🧠 SCHATZ-MEMORY')+'<p style="text-align:center;font-size:.85rem;line-height:1.55">16 verdeckte Juwelen (8 Paare), jeden Tag neu gemischt. Für <b>jedes Paar</b> bekommst du sofort die Juwelen, die du aufdeckst. Pro Start hast du <b>3 Fehlversuche</b>. Danach machst du mit einem Juwel weiter, das Feld bleibt genau so.<br>Heute gefunden: <b>'+f+' / 8</b></p>'+(f>=8?'<div style="text-align:center;color:#6fe08a;margin:14px 0">✓ Heute alles gefunden!</div>':startBtns('mem','START'))+(TEST?'<div class="evb" style="margin-top:8px;opacity:.7" onclick="__evMemReset()">TEST: neu mischen</div>':''))}
window.__evMemReset=function(){delete S2().mm;memIntro()};
window.__evMemStart=function(){var m=mmLoad();if(mmFound(m)>=8){memIntro();return}MM={m:m,open:[],miss:0,lock:false,over:false,fin:false,gain:{},tx:'',last:''};memPaint()};
function memPaint(){
 var m=MM.m,cells='';
 m.deck.forEach(function(k,i){
  var up=m.ok[i]||MM.open.indexOf(i)>=0;
  cells+='<div class="mc" onclick="__evMemFlip('+i+')" style="'+(up?'border:2px solid '+(m.ok[i]?'#6fe08a':'#f0c040')+';background:#120a20;box-shadow:0 0 12px '+(m.ok[i]?'#6fe08a55':'#f0c04055'):'border:2px solid #6a3fb0;background:linear-gradient(145deg,#2a1450,#150a2a);font-size:2rem;color:#7a4fd0')+'">'+(up?'<img src="items/gem_'+k+'.webp" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:screen">':'?')+'</div>'});
 var hearts='';for(var h=0;h<TRIES;h++)hearts+=h<TRIES-MM.miss?'❤️':'🖤';
 modal(head('🧠 SCHATZ-MEMORY','__evMemQuit()')+'<div class="evbar"><span>Versuche: '+hearts+'</span><span>Paare: <b>'+mmFound(m)+' / 8</b></span></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px">'+cells+'</div>'+(MM.last&&!(MM.over||MM.fin)?'<div style="text-align:center;font-size:.85rem;margin-top:10px">'+MM.last+'</div>':'')+((MM.over||MM.fin)?memResult():''))}
function memResult(){
 var h='',ks=Object.keys(MM.gain);
 ks.forEach(function(k){h+='<div style="display:inline-block;margin:6px 8px;text-align:center;font-size:.62rem">'+window.__gemDot(k,56)+'<br>'+window.__gemName(k)+' ×'+MM.gain[k]+'</div>'});
 return '<div style="margin-top:14px;padding:14px;border:2px solid #f0c040;border-radius:14px;background:#3a2a0a66;text-align:center"><b style="color:#f0c040;font-size:1.05rem">'+(MM.fin?'Alle Paare gefunden!':'Keine Versuche mehr')+'</b><div style="font-size:.85rem;margin-top:8px">'+(h?'Beute dieser Runde'+(TEST?' (Test, nicht vergeben)':'')+':<br>'+h:'Diesmal nichts gefunden.')+'</div>'+MM.tx+(MM.fin?'':'<div style="font-size:.7rem;opacity:.8;margin-top:8px">Mit einem Juwel machst du weiter. Das Feld bleibt so.</div>'+startBtns('mem','WEITER'))+'<div class="evb" style="margin-top:12px" onclick="__evOpen()">FERTIG</div></div>'}
window.__evMemQuit=function(){MM=null;hub()};
window.__evMemFlip=function(i){
 if(!MM||MM.lock||MM.fin||MM.over||MM.m.ok[i]||MM.open.indexOf(i)>=0)return;
 MM.open.push(i);if(MM.open.length<2){memPaint();return}
 var a=MM.open[0],b=MM.open[1],m=MM.m;
 if(m.deck[a]===m.deck[b]){var k=m.deck[a],n=EM.m;m.ok[a]=m.ok[b]=1;MM.open=[];MM.last='Paar! '+window.__gemDot(k,28)+' '+window.__gemName(k)+' ×'+n;MM.gain[k]=(MM.gain[k]||0)+n;giveGem(k,n);
  try{log('<span style="color:#cfd6e0">Schatz-Memory: '+window.__gemName(k)+' ×'+n+'</span>')}catch(e){}
  if(mmFound(m)>=8){MM.fin=true;MM.tx=ticketDrop()}
  done();memPaint();return}
 MM.miss++;MM.last='Kein Paar.';MM.lock=true;memPaint();
 setTimeout(function(){if(!MM)return;MM.open=[];MM.lock=false;if(MM.miss>=TRIES){MM.over=true;MM.tx=ticketDrop()}memPaint()},750)};

/* ---------- Schicksals-Brett ---------- */
var RING=[[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,4],[4,4],[4,3],[4,2],[4,1],[4,0],[3,0],[2,0],[1,0]];
var FLD=[{t:'gold',l:'START'},{t:'gold'},{t:'item',r:'gruen',l:'Gegenstand<br><b style="color:#4caf50">Grün</b>'},{t:'gold'},{t:'dia'},{t:'gold'},{t:'item',r:'blau',l:'Gegenstand<br><b style="color:#42a5f5">Blau</b>'},{t:'gold'},{t:'gold'},{t:'gold'},{t:'dia'},{t:'gold'},{t:'item',r:'episch',l:'Gegenstand<br><b style="color:#ab47bc">Lila</b>'},{t:'gold'},{t:'gold'},{t:'gold'}];
var BD=null;
function goldAmt(){return Math.round((500+Math.pow(Math.random(),1.5)*1500)/50)*50}
var CODES={g:{t:'gold'},d:{t:'dia'},ig:{t:'item',r:'gruen',l:'Gegenstand<br><b style="color:#4caf50">Grün</b>'},ib:{t:'item',r:'blau',l:'Gegenstand<br><b style="color:#42a5f5">Blau</b>'},ie:{t:'item',r:'episch',l:'Gegenstand<br><b style="color:#ab47bc">Lila</b>'},k:{t:'kiste'}};
function newLay(){return ['g'].concat(shuf(['k','d','d','ig','ib','ie','g','g','g','g','g','g','g','g','g']))}
function F(i){var b=S2().board;return i===0?{t:'gold',l:'START'}:CODES[b.lay[i]]}
function bd(){var o=S2();o.board=o.board||{pos:0,last:''};return o.board}
function boardOpen(){var b=bd();if(!b.lay||b.lay.length!==16)b.lay=newLay();BD={busy:false,res:''};boardPaint()}
function boardPaint(){
 var b=bd(),grid=[[],[],[],[],[]],ci=0,sn=played('board');
 RING.forEach(function(p,i){
  var f=F(i),col=f.t==='gold'?'#8a6a20':f.t==='dia'?'#3a9ac0':f.t==='item'?'#c07020':'#cc44ff',lab=f.l||(f.t==='gold'?'💰 Gold':f.t==='dia'?'💎 Dias':f.t==='kiste'?'<img src="items/chest_sin_0.webp" style="width:46px;display:block;margin:0 auto;mix-blend-mode:screen"><b style="color:#e090ff">KISTE!</b>':'');
  grid[p[0]][p[1]]='<div style="position:relative;border:'+(f.t==='kiste'?3:2)+'px solid '+(i===b.pos?'#f0c040':col)+';border-radius:10px;background:'+(f.t==='kiste'?'radial-gradient(circle,#4a1470,#120620)':'#0009')+';display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:.6rem;padding:2px;'+(i===b.pos?'box-shadow:0 0 14px #f0c040':'')+'">'+lab+(i===b.pos?'<img src="h/ben_hi.webp" alt="" style="position:absolute;top:-14px;right:-6px;width:34px;height:34px;object-fit:cover;border-radius:50%;border:2px solid #f0c040;box-shadow:0 0 8px #000">':'')+'</div>'});
 var cells='';for(var r=0;r<5;r++)for(var c=0;c<5;c++)cells+=grid[r][c]||'';
 var mid='<div style="grid-area:2/2/5/5;border:3px solid #cc44ff;border-radius:16px;background:radial-gradient(circle,#4a1470,#120620);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 24px #cc44ff88;text-align:center;padding:4px"><img src="items/chest_sin_0.webp" style="width:70%;mix-blend-mode:screen"><div style="font-size:.68rem;color:#e090ff">TODSÜNDE-KISTE<br><span style="opacity:.75">Lande auf dem Kisten-Feld. Kommst du über LOS, mischt sich das ganze Feld neu!</span></div></div>';
 modal(head('🎲 SCHICKSALS-BRETT','__evOpen()')+'<div style="display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,64px);gap:6px">'+cells.replace('</div></div><div style="position','</div></div><div style="position')+mid+'</div>'
 +'<div class="evbar" style="margin-top:14px"><span>Heute: <b>'+(sn?'0':'1')+' Wurf</b></span><span>Feld: <b>'+(b.pos+1)+' / 16</b></span></div>'
 +(BD.busy?'<div style="text-align:center;font-size:.8rem;margin-top:12px">🎲 Würfel rollt…</div>':startBtns('board','🎲 WÜRFELN'))+'<div style="text-align:center;font-size:.7rem;opacity:.8;margin-top:8px">Du bleibst auf deinem Feld stehen und würfelst später weiter.</div>'+(BD.res?'<div style="margin-top:12px;padding:12px;border:2px solid #f0c040;border-radius:14px;background:#3a2a0a66;text-align:center;font-size:.85rem">'+BD.res+'</div>':''))}
window.__evRollGo=function(){
 var b=bd();if(!b||BD.busy)return;
 BD.busy=true;BD.res='';BD.passed=false;sv();
 var n=rnd(1,6),i=0;
 (function step(){
  if(i>=n){boardLand();return}
  i++;b.pos=(b.pos+1)%16;if(b.pos===0)BD.passed=true;boardPaint();BD.busy=true;setTimeout(step,330)})();
 /* Würfelanzeige vorab */
 };
function boardLand(){
 var b=bd(),f=F(b.pos),res='',M=EM.m;
 try{
  if(f.t==='gold'){var g=goldAmt()*M;gainGold(g);res='<b style="color:#f0c040">+'+fmt(g)+' 💰 Gold</b>'}
  else if(f.t==='dia'){var d=rnd(10,20)*M;gainDia(d);res='<b style="color:#7fdcff">+'+d+' 💎 Diamanten</b>'}
  else if(f.t==='item'){res='Gegenstand'+(M>1?' ×'+M:'')+(TEST?' (Test, nicht vergeben)':':');if(!TEST)for(var q=0;q<M;q++)res+=(window.__kamEvtItem?window.__kamEvtItem(f.r):'')+(M>1?'<br>':'')}
  else{var cf=CHEST_CONFIG.sin,gg=rnd(cf.goldMin,cf.goldMax)*M,dd=0,bg=0,ex='';gainGold(gg);
   if(cf.diaMin){dd=Math.max(1,Math.round(rnd(cf.diaMin,cf.diaMax)*(window.__kamBoardScale||1))*M);bg=rnd(cf.extraGoldMin,cf.extraGoldMax)*M;gainDia(dd);gainGold(bg)}
   try{if(!TEST)for(var q=0;q<M;q++)ex+=(window.__kamChest?window.__kamChest('sin',cf):'')}catch(e){}
   res='<b style="color:#e090ff">TODSÜNDE-KISTE!</b><div style="font-size:.8rem;margin-top:6px;line-height:1.6">💰 +'+fmt(gg+bg)+' Gold'+(dd?'<br>💎 +'+dd+' Diamanten':'')+(ex?'<br>'+ex.replace(/^\s+/,''):'')+'</div>'}
 }catch(e){res='Belohnung erhalten.'}
 var nl='';if(BD.passed){b.lay=newLay();BD.passed=false;nl='<div style="margin-top:8px;color:#e090ff;font-size:.8rem">🔀 Du bist über LOS gekommen: Das Feld wurde neu gemischt!</div>'}
 BD.busy=false;BD.res='Du bist auf dem Feld gelandet:<br>'+res+nl+ticketDrop();try{log('<span style="color:#cfd6e0">Schicksals-Brett: '+res.replace(/<[^>]+>/g,' ')+'</span>')}catch(e){}
 done();boardPaint()}

/* ---------- Schleim-Jagd (Jahres-Event) ---------- */
var TS=null,TIV=null;
var CAMP=['gruen','blau','rot','orange','lila'];
var SLN={gruen:'Grüner Schleim',blau:'Eis-Schleim',rot:'Lava-Schleim',orange:'Bernstein-Schleim',lila:'Gift-Schleim'};
var COL={gruen:'#6fe08a',blau:'#6ab8ff',rot:'#ff7a5a',orange:'#ffb04a',lila:'#c080ff'};
var COMPN={gruen:'fee',blau:'eis',rot:'dae',orange:'bot',lila:'hex'};
var STARS=[500,1500,5000];
var CO={
 fee:{n:'Fee',sk:'Feenraub',d:function(L){return 'Entzieht dem Gegner bei jedem Tipp '+(0.8*L).toFixed(1)+' % seines Lebens'}},
 eis:{n:'Eisvogel',sk:'Eiswand',d:function(L){return '+'+Math.min(2,.25*L).toFixed(2)+' s Zeit pro besiegtem Schleim'}},
 dae:{n:'Dämon',sk:'Feuerball',d:function(L){return 'Feuerball bei jedem Tipp: +'+(25*L)+' % Schaden'}},
 bot:{n:'Flugmaschine',sk:'Blitzschlag',d:function(L){return Math.min(60,8*L)+' % Chance auf Doppelschaden pro Tipp'}},
 hex:{n:'Hexe',sk:'Giftklinge',d:function(L){return 'Gift: '+fmt(t0()*.6*L)+' Schaden pro Sekunde'}}};
var SK=[['fire','🔥','Feuerstoß',10000],['rage','⚡','Rausch',22000],['gold','💚','Schleimregen',25000],['frost','❄️','Frost',18000]];
function t0(){return Math.max(8,Math.round(Math.sqrt(Math.max(1,meta.attack||40))*6))}
function TD(){var o=S2();o.tv=o.tv||{cl:{},sl:{},co:{}};return o.tv}
function lvC(i){return CAMP[Math.floor(i/3)]}
function lvS(i){return i%3}
function lvName(i){return SLN[lvC(i)]+' · '+'★'.repeat(lvS(i)+1)}
function isCl(i){return !!TD().cl[i]}
function isUn(i){return i===0||isCl(i-1)}
function hpL(i,w){return Math.round(60*Math.pow(1.5,i)*(1+.1*(w-1))*(w===10?3:1))}
function coL(c){return TD().co[COMPN[c]]||0}
function coCost(L){return 15+10*L}
function coForm(L){return L>=10?3:L>=5?2:1}
function tapIntro(){
 var d=TD(),h=head('💰 SCHLEIM-JAGD','__evOpen()')+'<p style="font-size:.78rem;line-height:1.5;text-align:center;margin:0 0 10px">Besiege in <b>60 Sekunden</b> alle <b>10 Wellen</b>. Beim ersten Mal gibt es Münzen: <b>★1 500 · ★2 1.500 · ★3 5.000</b>. Danach kannst du jedes Level auch <b>automatisch</b> kämpfen lassen und sammelst Schleim für deine Begleiter.'+(TEST?'<br><b style="color:#6fe08a">Test: Es wird nichts vom Spiel vergeben.</b>':'')+'</p>';
 CAMP.forEach(function(c,ci){
  var cid=COMPN[c],L=coL(c),cost=coCost(L),have=d.sl[c]||0,ok=have>=cost,co=CO[cid];
  h+='<div style="margin-bottom:12px;padding:10px;border:2px solid '+COL[c]+'66;border-radius:14px;background:#0008">'
  +'<div style="display:flex;align-items:center;gap:10px"><img src="slime/'+c+'_i0.webp" style="width:54px;height:51px;object-fit:contain"><div style="flex:1"><b style="color:'+COL[c]+'">'+SLN[c]+'</b><div style="font-size:.65rem;opacity:.8">Schleim gesammelt: <b>'+fmt(have)+'</b></div></div></div>'
  +'<div style="display:flex;gap:6px;margin:8px 0">';
  for(var s=0;s<3;s++){var i=ci*3+s,cl=isCl(i),un=isUn(i);
   h+='<div style="flex:1;text-align:center;padding:6px 2px;border:2px solid '+(cl?'#6fe08a':un?'#f0c040':'#444')+';border-radius:10px;background:'+(cl?'#0a3a1a99':'#0006')+';font-size:.62rem;'+(un?'':'opacity:.5')+'"><div onclick="'+(un?'__evTapGo('+i+',0)':'')+'" style="cursor:'+(un?'pointer':'default')+'"><div style="font-size:1rem;color:#ffd24a">'+'★'.repeat(s+1)+'</div>'+(cl?'✓ geschafft':un?'▶ '+fmt(STARS[s])+' 💰':'🔒')+'</div>'+(cl?'<div onclick="__evTapGo('+i+',1)" style="margin-top:4px;padding:3px;border-radius:7px;background:#1a4a8a;color:#cfe8ff;cursor:pointer">⚙ AUTO</div>':'')+'</div>'}
  h+='</div><div style="display:flex;gap:10px;align-items:center;padding:6px;border-radius:10px;background:#1a0a30"><img src="comp/'+cid+'_'+coForm(Math.max(1,L))+'_i0.webp" style="width:44px;height:44px;object-fit:contain;'+(L?'':'filter:grayscale(1) brightness(.6)')+'"><div style="flex:1"><b style="font-size:.78rem">'+co.n+'</b> <span style="font-size:.62rem;opacity:.75">'+(L?'Stufe '+L:'gesperrt')+' · '+co.sk+'</span><div style="font-size:.62rem;color:#b9a77f">'+co.d(Math.max(1,L))+'</div></div><div onclick="__evCoUp(\''+c+'\')" style="padding:6px 8px;border-radius:9px;border:2px solid '+(ok?'#f0c040':'#555')+';background:'+(ok?'linear-gradient(135deg,#8a0000,#c62000)':'#222')+';font-size:.68rem;font-weight:700;cursor:pointer;text-align:center">'+(L?'Aufwerten':'Freischalten')+'<br>'+cost+' <img src="slime/'+c+'_i0.webp" style="width:16px;height:15px;vertical-align:middle;object-fit:contain"></div></div></div>'});
 modal(h)}
window.__evCoUp=function(c){var d=TD(),L=coL(c),cost=coCost(L);if((d.sl[c]||0)<cost)return;d.sl[c]-=cost;d.co[COMPN[c]]=L+1;sv();if(TS&&!TS.fin)return;tapIntro()};
function tapStop(){if(TIV){clearInterval(TIV);TIV=null}}
window.__evTapGo=function(i,auto){
 if(!isUn(i))return;
 TS={i:i,c:lvC(i),star:lvS(i),ms:60000,w:1,cd:{fire:0,rage:0,gold:0,frost:0},bf:{rage:0,gold:0,frost:0},kills:0,got:0,acc:0,pz:0,fin:false,auto:!!auto,aacc:0,svt:0,win:false};
 TS.max=TS.hp=hpL(i,1);tapPaint();tapStop();TIV=setInterval(tapTick,100)};
function tapPaint(){
 var c=TS.c,boss=TS.w===10,cmp='',n=0;
 CAMP.forEach(function(k){var L=coL(k);if(L>0){var cid=COMPN[k],f=coForm(L);cmp+='<div style="position:absolute;left:'+(8+n*46)+'px;top:'+(44+(n%2)*22)+'px;width:44px;height:44px"><img class="sA" src="comp/'+cid+'_'+f+'_i0.webp" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain"><img class="sB" src="comp/'+cid+'_'+f+'_i1.webp" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain"></div>';n++}});
 var h='<div class="evbar" style="margin-bottom:6px"><span>⏱ <b id="tT">60</b> s</span><span><b>'+lvName(TS.i)+'</b> · Welle <b id="tI">'+TS.w+'</b>/10</span><span><img src="slime/'+c+'_i0.webp" style="width:20px;height:19px;vertical-align:middle;object-fit:contain"> <b id="tS">0</b></span></div>'
 +'<div id="tF" style="position:relative;height:300px;overflow:hidden;border-radius:14px;border:2px solid #f0c04055;background:linear-gradient(#000a,#0004),url(dung/brick.webp) center/150px;touch-action:manipulation;user-select:none;-webkit-user-select:none" onpointerdown="__evTap(event)">'
 +'<div style="position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(#0008,#0000),url(dung/floor.webp) center/120px;border-top:3px solid #000"></div>'
 +'<div style="position:absolute;left:10px;right:10px;top:8px"><div style="display:flex;justify-content:space-between;font-size:.66rem;text-shadow:0 0 4px #000"><b id="tN">'+(boss?'👑 BOSS ':'')+SLN[c]+'</b><span id="tH"></span></div><div style="height:12px;border-radius:6px;background:#000a;border:2px solid #000;overflow:hidden"><div id="tB" style="height:100%;width:100%;background:linear-gradient(90deg,#d02020,#ff5a3a)"></div></div></div>'+cmp
 +'<img id="tBen" src="h/ben_i0.webp" style="position:absolute;left:6px;bottom:30px;width:150px;filter:drop-shadow(0 5px 5px #000);transition:transform .08s">'
 +'<div id="tM" style="position:absolute;right:14px;bottom:36px">'+slimeHTML(c,boss)+'</div>'
 +'<div id="tSl" style="position:absolute;left:120px;top:140px;width:80px;height:8px;border-radius:50%;background:linear-gradient(90deg,#fff0,#fff,#fff0);transform:rotate(-18deg);box-shadow:0 0 14px #fff;opacity:0"></div>'
 +'<div style="position:absolute;left:0;right:0;bottom:6px;text-align:center;font-size:.66rem;opacity:.9;text-shadow:0 0 4px #000">'+(TS.auto?'⚙ AUTO-KAMPF läuft':'👆 Tippe aufs Feld: alle greifen an')+'</div></div>'
 +'<div id="tSk" style="display:flex;gap:6px;margin:10px 0"></div>'
 +'<div id="tG" style="text-align:center;font-size:.72rem;opacity:.85;margin-top:6px"></div>';
 modal(head('💰 SCHLEIM-JAGD','__evTapQuit()')+h);tapHud(true)}
function slimeHTML(type,boss){
 var n=boss?'boss':type,w=boss?210:176,hh=Math.round(w*.95),st0='position:absolute;inset:0;width:100%;height:100%;object-fit:contain';
 return '<div id="tMs" style="position:relative;width:'+w+'px;height:'+hh+'px"><img class="sA" src="slime/'+n+'_i0.webp" alt="" style="'+st0+'"><img class="sB" src="slime/'+n+'_i1.webp" alt="" style="'+st0+'"><img class="sH" src="slime/'+n+'_h.webp" alt="" style="'+st0+'"></div>'}
function tdmg(){return t0()*(TS.bf.rage>0?2:1)}
function tapHud(full){
 if(!TS)return;var e;
 e=$('tT');if(e)e.textContent=Math.max(0,Math.ceil(TS.ms/1000));e=$('tI');if(e)e.textContent=TS.w;e=$('tS');if(e)e.textContent=fmt(TD().sl[TS.c]||0);
 e=$('tB');if(e)e.style.width=Math.max(0,TS.hp/TS.max*100)+'%';e=$('tH');if(e)e.textContent=fmt(Math.max(0,TS.hp))+' / '+fmt(TS.max);
 e=$('tG');if(e)e.innerHTML='Diese Runde: +'+fmt(TS.got)+' Schleim · Besiegt: '+TS.kills+'/10';
 var sk='';SK.forEach(function(s){var cd=TS.cd[s[0]],act=TS.bf[s[0]]>0;sk+='<div onclick="__evSkill(\''+s[0]+'\')" style="flex:1;text-align:center;padding:6px 2px;border:2px solid '+(cd>0?'#555':act?'#6fe08a':'#ffd24a')+';border-radius:12px;background:#0009;font-size:.58rem;cursor:pointer"><div style="font-size:1.3rem">'+s[1]+'</div>'+s[2]+'<div style="opacity:.75">'+(act?'aktiv':cd>0?Math.ceil(cd/1000)+' s':'bereit')+'</div></div>'});
 e=$('tSk');if(e)e.innerHTML=sk}
function tapKill(){
 var boss=TS.w===10,y=[1,2,4][TS.star]*(boss?3:1)*(TS.bf.gold>0?2:1),d=TD();
 TS.kills++;TS.got+=y;d.sl[TS.c]=(d.sl[TS.c]||0)+y;
 var eL=coL('blau');if(eL>0)TS.ms+=Math.min(2000,250*eL);
 tapFloat('+'+y,'#ffd24a');
 try{var f=$('tF'),mm=$('tM');if(f&&mm&&f.children.length<30){var gh=document.createElement('img');gh.src='slime/'+(boss?'boss':TS.c)+'_d.webp';gh.style.cssText='position:absolute;right:'+(boss?4:14)+'px;bottom:36px;width:'+(boss?210:176)+'px;pointer-events:none;transition:opacity .55s,transform .55s;z-index:3';f.appendChild(gh);setTimeout(function(){gh.style.opacity='0';gh.style.transform='translateY(14px)'},60);setTimeout(function(){if(gh.parentNode)gh.parentNode.removeChild(gh)},640)}}catch(e){}
 TS.w++;
 if(TS.w>10){tapEnd(true);return}
 TS.max=TS.hp=hpL(TS.i,TS.w);var m=$('tM');if(m)m.innerHTML=slimeHTML(TS.c,TS.w===10);var n=$('tN');if(n)n.innerHTML=(TS.w===10?'👑 BOSS ':'')+SLN[TS.c]}
function tapFloat(t,col,x,y){var f=$('tF');if(!f)return;if(f.children.length>40)return;var d=document.createElement('div');d.className='evd';d.style.cssText='left:'+(x!=null?x:200+Math.random()*80)+'px;top:'+(y!=null?y:90+Math.random()*60)+'px;color:'+col+';font-size:'+(t.length>8?'1.1':'1.25')+'rem';d.textContent=t;f.appendChild(d);setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d)},720)}
function tapHit(d,crit){
 if(!TS||TS.fin)return;TS.hp-=d;
 var m=$('tMs');if(m){m.classList.remove('evsh');void m.offsetWidth;m.classList.add('evsh','hit');setTimeout(function(){var q=$('tMs');if(q)q.classList.remove('hit')},130)}
 tapFloat('-'+fmt(d)+(crit?' KRIT!':''),crit?'#ffe14a':'#fff')}
window.__evTap=function(ev){
 if(!TS||TS.fin)return;
 var cr=Math.random()<.08+(TS.bf.frost>0?.3:0),base=tdmg(),d=base*(cr?3:1);
 var b=$('tBen');if(b){b.src='h/ben_at.webp';b.style.transform='translateX(26px)';setTimeout(function(){var q=$('tBen');if(q){q.src='h/ben_i0.webp';q.style.transform=''}},120)}
 var s=$('tSl');if(s){s.style.opacity='1';setTimeout(function(){var q=$('tSl');if(q)q.style.opacity='0'},90)}
 var x=0,L;
 if((L=coL('rot'))>0)x+=base*.25*L;
 if((L=coL('orange'))>0&&Math.random()*100<Math.min(60,8*L))x+=base;
 if((L=coL('gruen'))>0)x+=TS.max*.008*L;
 tapHit(d+x,cr);while(TS.hp<=0&&!TS.fin)tapKill();if(TS&&!TS.fin)tapHud(false)};
window.__evSkill=function(k){
 if(!TS||TS.fin||TS.cd[k]>0)return;var s=SK.filter(function(x){return x[0]===k})[0];TS.cd[k]=s[3];
 if(k==='fire'){tapHit(t0()*12,true);while(TS.hp<=0&&!TS.fin)tapKill()}
 else if(k==='rage')TS.bf.rage=8000;else if(k==='gold')TS.bf.gold=8000;else TS.bf.frost=6000;
 if(TS&&!TS.fin)tapHud(false)};
function tapTick(){
 if(!TS||TS.fin){tapStop();return}
 TS.ms-=100;['fire','rage','gold','frost'].forEach(function(k){if(TS.cd[k]>0)TS.cd[k]-=100});['rage','gold','frost'].forEach(function(k){if(TS.bf[k]>0)TS.bf[k]-=100});
 var L=coL('lila');if(L>0){TS.pz+=t0()*.6*L*.1;if(TS.pz>=1){var q=Math.floor(TS.pz);TS.pz-=q;TS.hp-=q;while(TS.hp<=0&&!TS.fin)tapKill()}}
 if(TS&&!TS.fin&&TS.auto){TS.aacc+=100;if(TS.aacc>=200){TS.aacc=0;window.__evTap({});if(!TS||TS.fin)return;if(TS.cd.fire<=0)window.__evSkill('fire');if(!TS||TS.fin)return;if(TS.cd.rage<=0)window.__evSkill('rage')}}
 if(!TS||TS.fin)return;
 TS.svt+=100;if(TS.svt>=3000){TS.svt=0;sv()}
 if(TS.ms<=0){tapEnd(false);return}
 tapHud(false)}
function tapEnd(win){
 TS.fin=true;TS.win=!!win;tapStop();
 var d=TD(),i=TS.i,first=win&&!isCl(i),rw='';
 if(win){d.cl[i]=1;if(first){var g=STARS[TS.star];gainGold(g);rw='<div style="margin:8px 0;font-size:1rem;color:#ffd24a">💰 +'+fmt(g)+' Münzen (erstes Mal)'+(TEST?'<br><span style="font-size:.7rem;color:#6fe08a">Test, nicht vergeben</span>':'')+'</div>'}}
 sv();if(first)done();
 try{log('<span style="color:#cfd6e0">Schleim-Jagd '+lvName(i)+': '+(win?'geschafft':'Zeit um')+', +'+TS.got+' Schleim</span>')}catch(e){}
 if(TS.auto&&TS.keepAuto!==false){var a=i;setTimeout(function(){if(TS&&TS.fin&&TS.auto&&$('tF'))window.__evTapGo(a,1)},1200);return}
 var nx=i+1<15&&isUn(i+1)?i+1:-1;
 modal(head('💰 SCHLEIM-JAGD','__evOpen()')+'<div style="padding:16px;border:2px solid '+(win?'#6fe08a':'#f0c040')+';border-radius:14px;background:#3a2a0a66;text-align:center"><b style="color:'+(win?'#6fe08a':'#f0c040')+';font-size:1.15rem">'+(win?'Geschafft!':'Zeit um!')+'</b><div style="font-size:.85rem;margin:6px 0">'+lvName(i)+' · <b>'+TS.kills+'/10</b> Wellen</div>'+rw+'<div style="font-size:.9rem;margin-top:6px"><img src="slime/'+TS.c+'_i0.webp" style="width:28px;height:26px;vertical-align:middle;object-fit:contain"> <b>+'+fmt(TS.got)+'</b> Schleim ('+fmt(d.sl[TS.c]||0)+' gesamt)</div></div>'
 +(nx>=0&&win?'<div class="evb" style="margin-top:14px" onclick="__evTapGo('+nx+',0)">▶ NÄCHSTES LEVEL</div>':'')+'<div class="evb" style="margin-top:8px'+(win?';opacity:.85':'')+'" onclick="__evTapGo('+i+',0)">↻ NOCHMAL</div><div class="evb" style="margin-top:8px;opacity:.8" onclick="__evPlay(\'tap\')">KARTE &amp; BEGLEITER</div>')}
window.__evTapQuit=function(){if(TS&&!TS.fin){TS.fin=true;TS.auto=false;tapStop();sv()}tapIntro()};
window.__evDbg=function(){return{MM:MM,TS:TS,BD:BD,plan:plan}};
;window.__ver=window.__ver||{};window.__ver['evt']='11-11g';
})();
