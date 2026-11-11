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
 {id:'mem',f:'realm_ev_mem',ic:'🧠',n:'Schatz-Memory',d:'Finde alle Paare. Belohnung: Juwelen.'},
 {id:'tap',f:'realm_ev_tap',ic:'💰',n:'Münzen-Rausch',d:'Tippe die Schleime weg. Belohnung: Gold, Diamanten, Eisen und Kugeln.'},
 {id:'board',f:'realm_ev_board',ic:'🎲',n:'Schicksals-Brett',d:'Ein Würfel pro Tag. Gold, Gegenstände und Diamanten.'}];
var FT=null,FTt=0;
function feat(){
 if(FT&&Date.now()-FTt<60000)return Promise.resolve(FT);
 var k='';try{if(localStorage.getItem('bp_admin_key')&&localStorage.getItem('bp_admin_view')==='1')k=localStorage.getItem('bp_admin_key')}catch(e){}
 return fetch('/api/features',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(k?{adminKey:k}:{})}).then(function(r){return r.json()}).then(function(j){FT=j&&j.ok?j:{locked:[],hidden:[],maint:[]};FTt=Date.now();return FT}).catch(function(){FT=FT||{locked:[],hidden:[],maint:[]};return FT})}
function on(e){var f=FT||{};return (f.locked||[]).indexOf(e.f)<0&&(f.hidden||[]).indexOf(e.f)<0&&(f.maint||[]).indexOf(e.f)<0}
function plan(){var E=EV.filter(on);if(!E.length)return{list:[],today:null,tom:null};return{list:E,today:E[dayN()%E.length],tom:E[dayN(1)%E.length]}}
var TEST=true; /* TESTMODUS: alle Events offen + unbegrenzt gratis. Zum Ausschalten auf false setzen */
function played(id){if(TEST)return false;var s=st(),t=tk();return id==='board'?!!(s.board&&s.board.last===t):s[id]===t}
function byId(id){return EV.filter(function(e){return e.id===id})[0]}
var CSS='<style>.evb{display:block;width:100%;padding:13px;border-radius:12px;border:2px solid #f0c040;background:linear-gradient(135deg,#8a0000,#c62000);color:#ffe9a0;font:700 1rem Georgia,serif;text-align:center;letter-spacing:2px;cursor:pointer}.evb[disabled]{opacity:.45;cursor:default}.evbar{display:flex;justify-content:space-between;font-size:.8rem;padding:8px 12px;border:1px solid #f0c04055;border-radius:10px;background:#0006;margin-bottom:10px}.evh{display:flex;align-items:center;gap:10px;margin-bottom:12px}.evh b{flex:1;text-align:center;color:#f0c040;letter-spacing:2px}@keyframes evfl{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-70px);opacity:0}}.evd{position:absolute;font-weight:700;pointer-events:none;text-shadow:0 0 6px #000;animation:evfl .7s ease-out forwards;z-index:5}@keyframes evsh{0%{transform:translate(0,0)}25%{transform:translate(8px,-3px)}60%{transform:translate(-5px,2px)}100%{transform:translate(0,0)}}.evsh{animation:evsh .18s}.mc{aspect-ratio:1;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:6px;transition:transform .15s}.mc:active{transform:scale(.94)}@keyframes evA{0%,49.9%{opacity:1}50%,100%{opacity:0}}@keyframes evB{0%,49.9%{opacity:0}50%,100%{opacity:1}}.sA{animation:evA .9s steps(1) infinite}.sB{animation:evB .9s steps(1) infinite}.sH{display:none}.hit .sA,.hit .sB{display:none}.hit .sH{display:block}.ejg,.ejp{display:inline-block;width:1.5em;height:1.5em;vertical-align:middle;background:center/contain no-repeat;margin:0 2px;filter:drop-shadow(0 0 3px #000)}.ejg{background-image:url(items/evgem_g.webp)}.ejp{background-image:url(items/evgem_b.webp)}.evb.g2{background:linear-gradient(135deg,#0a5a1a,#1a9a30)}.evb.p2{background:linear-gradient(135deg,#0a2a6a,#2f7ae0)}</style>';
function modal(h){var M=$('evModal');if(!M){M=document.createElement('div');M.id='evModal';M.style.cssText='position:fixed;inset:0;z-index:900;overflow-y:auto;background:radial-gradient(circle at 50% 0,#2a1245,#0d0814 65%);color:#ffe9c4;font-family:Georgia,serif';document.body.appendChild(M)}M.innerHTML=CSS+'<div style="max-width:420px;margin:0 auto;padding:14px 14px 40px">'+h+'</div>';M.style.display='block';return M}
function head(t,back){return '<div class="evh"><button class="btn btn-sm" onclick="'+(back||'__evOpen()')+'">← ZURÜCK</button><b>'+t+'</b></div>'}
function gainGold(n){meta.gold=(meta.gold||0)+n;try{questTracking.goldEarned=(questTracking.goldEarned||0)+n;saveQuestTracking()}catch(e){}}
function gainDia(n){meta.diamonds=(meta.diamonds||0)+n;try{globalDiamonds+=n;saveDiamonds(globalDiamonds)}catch(e){}}
function done(){try{updateUI()}catch(e){}sv()}
var EM={m:1,free:false};
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
 if(m===0){if(played(id))return;EM={m:1,free:true};if(id==='board')s.board.last=tk();else s[id]=tk()}
 else if(m===1){if(tcnt('g')<1)return;s.tg--;EM={m:1,free:false}}
 else{if(tcnt('p')<1)return;s.tp--;EM={m:5,free:false}}
 sv();if(id==='mem')__evMemStart();else if(id==='tap')__evTapStart();else __evRollGo()};
function ticketDrop(){
 if(!EM.free)return '';var r=Math.random(),s=st();
 if(r<.05){s.tp=(s.tp||0)+1;sv();return '<div style="margin-top:8px;color:#7fc0ff;font-size:.85rem"><i class="ejp"></i> Bonus: 1 Blau-Juwel!</div>'}
 if(r<.35){s.tg=(s.tg||0)+1;sv();return '<div style="margin-top:8px;color:#7fe08a;font-size:.85rem"><i class="ejg"></i> Bonus: 1 Grün-Juwel!</div>'}
 return ''}
window.__evBuyT=function(k){if((meta.diamonds||0)<PRICE[k])return;gainDia(-PRICE[k]);var s=st();s['t'+k]=(s['t'+k]||0)+1;done();hub()};
window.__evClose=function(){tapStop();var M=$('evModal');if(M)M.style.display='none';done()};

/* ---------- Hub ---------- */
window.__evOpen=function(){tapStop();feat().then(hub)};
function hub(){
 var P=plan(),h=head('🎉 EVENTS','__evClose()');
 if(!P.list.length)h+='<p style="text-align:center;font-size:.85rem;opacity:.8;margin:30px 0">Gerade ist kein Event aktiv.</p>';
 else{
  h+='<div style="display:flex;gap:8px;margin-bottom:10px"><div style="flex:1;text-align:center;padding:8px 4px;border:1px solid #1a9a30;border-radius:10px;background:#0006;font-size:.7rem"><i class="ejg"></i> Grün-Juwel ×<b>'+tcnt('g')+'</b><div class="evb g2" style="padding:5px;font-size:.62rem;margin-top:4px;letter-spacing:0" onclick="__evBuyT(\'g\')">kaufen · '+PRICE.g+' 💎</div></div><div style="flex:1;text-align:center;padding:8px 4px;border:1px solid #2f7ae0;border-radius:10px;background:#0006;font-size:.7rem"><i class="ejp"></i> Blau-Juwel ×<b>'+tcnt('p')+'</b><div class="evb p2" style="padding:5px;font-size:.62rem;margin-top:4px;letter-spacing:0" onclick="__evBuyT(\'p\')">kaufen · '+PRICE.p+' 💎</div></div></div><p style="font-size:.62rem;opacity:.7;text-align:center;margin:0 0 10px">Jedes Event: 1× pro Tag gratis. Mit Juwelen spielst du extra (Blau = 5-fache Beute).</p>'+
  '<p style="text-align:center;font-size:.75rem;opacity:.8;margin:0 0 12px">'+(TEST?'<b style="color:#6fe08a">TESTMODUS:</b> alle Events offen, unbegrenzt gratis.':'Jeden Tag ist ein anderes Event dran.')+''+(P.list.length>1?' Morgen: <b>'+P.tom.ic+' '+P.tom.n+'</b>':'')+'</p>';
  P.list.forEach(function(e){
   var td=TEST||e===P.today,dn=played(e.id);
   h+='<div style="display:flex;gap:12px;align-items:center;padding:12px;margin-bottom:10px;border-radius:14px;border:2px solid '+(td?'#f0c040':'#ffffff22')+';background:'+(td?'#3a2a0a66':'#0006')+(td?'':';opacity:.55')+'"><div style="font-size:2.2rem">'+e.ic+'</div><div style="flex:1"><b style="font-size:.95rem">'+e.n+'</b><div style="font-size:.68rem;opacity:.8;line-height:1.35">'+e.d+'</div></div>'+
   (td?'<button class="evb" style="width:auto;padding:10px 14px;font-size:.8rem" onclick="__evPlay(\''+e.id+'\')">'+(dn?'EXTRA':'SPIELEN')+'</button>':'<span style="font-size:.65rem;text-align:center">Heute<br>nicht dran</span>')+'</div>'});
 }
 modal(h)}
window.__evPlay=function(id){feat().then(function(){var P=plan(),e=byId(id);if(!e||!on(e)||(!TEST&&(!P.today||P.today.id!==id))){hub();return}if(id==='mem')memIntro();else if(id==='tap')tapIntro();else boardOpen()})};

/* ---------- Schatz-Memory ---------- */
var MM=null;
function memIntro(){
 modal(head('🧠 SCHATZ-MEMORY')+'<p style="text-align:center;font-size:.85rem;line-height:1.5">Decke 16 Karten auf und finde alle 8 Paare.<br>Je weniger Züge, desto besser die Juwelen.<br><b style="color:#ff9a8a">Ein Gratis-Versuch pro Tag.</b></p>'+startBtns('mem','START'))}
window.__evMemStart=function(){
 var keys=[];'rgby'.split('').forEach(function(c){for(var t=1;t<=5;t++)keys.push(c+t)});
 var pick=shuf(keys).slice(0,8);MM={deck:shuf(pick.concat(pick)),open:[],ok:{},moves:0,t0:0,lock:false,fin:false};memPaint()};
function memPaint(){
 var n=Object.keys(MM.ok).length/2,cells='';
 MM.deck.forEach(function(k,i){
  var up=MM.ok[i]||MM.open.indexOf(i)>=0;
  cells+='<div class="mc" onclick="__evMemFlip('+i+')" style="'+(up?'border:2px solid '+(MM.ok[i]?'#6fe08a':'#f0c040')+';background:#120a20;box-shadow:0 0 12px '+(MM.ok[i]?'#6fe08a55':'#f0c04055'):'border:2px solid #6a3fb0;background:linear-gradient(145deg,#2a1450,#150a2a);font-size:2rem;color:#7a4fd0')+'">'+(up?'<img src="items/gem_'+k+'.webp" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:screen">':'?')+'</div>'});
 modal(head('🧠 SCHATZ-MEMORY','__evMemQuit()')+'<div class="evbar"><span>Züge: <b>'+MM.moves+'</b></span><span>Paare: <b>'+n+' / 8</b></span></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px">'+cells+'</div>'+(MM.fin?memResult():''))}
window.__evMemQuit=function(){if(MM&&!MM.fin&&MM.t0&&!confirm('Wirklich abbrechen? Dein Versuch für heute ist dann weg.'))return;MM=null;hub()};
window.__evMemFlip=function(i){
 if(!MM||MM.lock||MM.fin||MM.ok[i]||MM.open.indexOf(i)>=0)return;
 if(!MM.t0){MM.t0=Date.now()}
 MM.open.push(i);
 if(MM.open.length<2){memPaint();return}
 MM.moves++;var a=MM.open[0],b=MM.open[1];
 if(MM.deck[a]===MM.deck[b]){MM.ok[a]=MM.ok[b]=1;MM.open=[];if(Object.keys(MM.ok).length===16)memFinish();memPaint();return}
 MM.lock=true;memPaint();setTimeout(function(){if(!MM)return;MM.open=[];MM.lock=false;memPaint()},750)};
function memFinish(){
 MM.fin=true;var m=MM.moves,tb=Math.min(4,1+Math.floor((K()-1)/3)),n,t;
 if(m<=12){n=3;t=Math.min(5,tb+1)}else if(m<=16){n=3;t=tb}else if(m<=22){n=2;t=tb}else{n=2;t=Math.max(1,tb-1)}
 n*=EM.m;
 var msg='',big='';for(var i=0;i<n;i++){var c='rgby'.charAt(rnd(0,3));msg+=window.__gemGive(c,t,1);big+='<div style="display:inline-block;margin:6px 8px;text-align:center;font-size:.62rem">'+window.__gemDot(c+t,56)+'<br>'+window.__gemName(c+t)+'</div>'}
 MM.msg=msg;MM.big=big+ticketDrop();MM.n=n;MM.t=t;try{log('<span style="color:#cfd6e0">Schatz-Memory:'+msg+'</span>')}catch(e){}done()}
function memResult(){return '<div style="margin-top:14px;padding:14px;border:2px solid #f0c040;border-radius:14px;background:#3a2a0a66;text-align:center"><b style="color:#f0c040;font-size:1.05rem">Geschafft in '+MM.moves+' Zügen!</b><div style="font-size:.85rem;margin-top:8px">Belohnung:<br>'+MM.big+'</div><div class="evb" style="margin-top:12px" onclick="__evOpen()">FERTIG</div></div>'}

/* ---------- Schicksals-Brett ---------- */
var RING=[[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,4],[4,4],[4,3],[4,2],[4,1],[4,0],[3,0],[2,0],[1,0]];
var FLD=[{t:'gold',l:'START'},{t:'gold'},{t:'item',r:'gruen',l:'Gegenstand<br><b style="color:#4caf50">Grün</b>'},{t:'gold'},{t:'dia'},{t:'gold'},{t:'item',r:'blau',l:'Gegenstand<br><b style="color:#42a5f5">Blau</b>'},{t:'gold'},{t:'gold'},{t:'gold'},{t:'dia'},{t:'gold'},{t:'item',r:'episch',l:'Gegenstand<br><b style="color:#ab47bc">Lila</b>'},{t:'gold'},{t:'gold'},{t:'gold'}];
var BD=null;
function goldAmt(){return Math.round((500+Math.pow(Math.random(),1.5)*1500)/50)*50}
function newK(pos){var k;do{k=rnd(1,15)}while(k===pos);return k}
function F(i){var b=st().board;return i===b.k?{t:'kiste'}:FLD[i]}
function boardOpen(){var b=st().board=st().board||{pos:0,last:''};if(!(b.k>0))b.k=newK(b.pos);BD={busy:false,res:''};boardPaint()}
function boardPaint(){
 var b=st().board,grid=[[],[],[],[],[]],ci=0,sn=played('board');
 RING.forEach(function(p,i){
  var f=F(i),col=f.t==='gold'?'#8a6a20':f.t==='dia'?'#3a9ac0':f.t==='item'?'#c07020':'#cc44ff',lab=f.l||(f.t==='gold'?'💰 Gold':f.t==='dia'?'💎 Dias':f.t==='kiste'?'<img src="items/chest_sin_0.webp" style="width:46px;display:block;margin:0 auto;mix-blend-mode:screen"><b style="color:#e090ff">KISTE!</b>':'');
  grid[p[0]][p[1]]='<div style="position:relative;border:'+(f.t==='kiste'?3:2)+'px solid '+(i===b.pos?'#f0c040':col)+';border-radius:10px;background:'+(f.t==='kiste'?'radial-gradient(circle,#4a1470,#120620)':'#0009')+';display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:.6rem;padding:2px;'+(i===b.pos?'box-shadow:0 0 14px #f0c040':'')+'">'+lab+(i===b.pos?'<img src="h/ben_hi.webp" alt="" style="position:absolute;top:-14px;right:-6px;width:34px;height:34px;object-fit:cover;border-radius:50%;border:2px solid #f0c040;box-shadow:0 0 8px #000">':'')+'</div>'});
 var cells='';for(var r=0;r<5;r++)for(var c=0;c<5;c++)cells+=grid[r][c]||'';
 var mid='<div style="grid-area:2/2/5/5;border:3px solid #cc44ff;border-radius:16px;background:radial-gradient(circle,#4a1470,#120620);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 24px #cc44ff88;text-align:center;padding:4px"><img src="items/chest_sin_0.webp" style="width:70%;mix-blend-mode:screen"><div style="font-size:.68rem;color:#e090ff">TODSÜNDE-KISTE<br><span style="opacity:.75">Lande auf dem Kisten-Feld. Es wechselt nach jedem Wurf!</span></div></div>';
 modal(head('🎲 SCHICKSALS-BRETT','__evOpen()')+'<div style="display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,64px);gap:6px">'+cells.replace('</div></div><div style="position','</div></div><div style="position')+mid+'</div>'
 +'<div class="evbar" style="margin-top:14px"><span>Heute: <b>'+(sn?'0':'1')+' Wurf</b></span><span>Feld: <b>'+(b.pos+1)+' / 16</b></span></div>'
 +(BD.busy?'<div style="text-align:center;font-size:.8rem;margin-top:12px">🎲 Würfel rollt…</div>':startBtns('board','🎲 WÜRFELN'))+'<div style="text-align:center;font-size:.7rem;opacity:.8;margin-top:8px">Du bleibst auf deinem Feld stehen und würfelst später weiter.</div>'+(BD.res?'<div style="margin-top:12px;padding:12px;border:2px solid #f0c040;border-radius:14px;background:#3a2a0a66;text-align:center;font-size:.85rem">'+BD.res+'</div>':''))}
window.__evRollGo=function(){
 var b=st().board;if(!b||BD.busy)return;
 BD.busy=true;BD.res='';sv();
 var n=rnd(1,6),i=0;
 (function step(){
  if(i>=n){boardLand();return}
  i++;b.pos=(b.pos+1)%16;boardPaint();BD.busy=true;setTimeout(step,330)})();
 /* Würfelanzeige vorab */
 };
function boardLand(){
 var b=st().board,f=F(b.pos),res='',M=EM.m;
 try{
  if(f.t==='gold'){var g=goldAmt()*M;gainGold(g);res='<b style="color:#f0c040">+'+fmt(g)+' 💰 Gold</b>'}
  else if(f.t==='dia'){var d=rnd(10,20)*M;gainDia(d);res='<b style="color:#7fdcff">+'+d+' 💎 Diamanten</b>'}
  else if(f.t==='item'){res='Gegenstand'+(M>1?' ×'+M:'')+':';for(var q=0;q<M;q++)res+=(window.__kamEvtItem?window.__kamEvtItem(f.r):'')+(M>1?'<br>':'')}
  else{var cf=CHEST_CONFIG.sin,gg=rnd(cf.goldMin,cf.goldMax)*M,dd=0,bg=0,ex='';gainGold(gg);
   if(cf.diaMin){dd=Math.max(1,Math.round(rnd(cf.diaMin,cf.diaMax)*(window.__kamBoardScale||1))*M);bg=rnd(cf.extraGoldMin,cf.extraGoldMax)*M;gainDia(dd);gainGold(bg)}
   try{for(var q=0;q<M;q++)ex+=(window.__kamChest?window.__kamChest('sin',cf):'')}catch(e){}
   res='<b style="color:#e090ff">TODSÜNDE-KISTE!</b><div style="font-size:.8rem;margin-top:6px;line-height:1.6">💰 +'+fmt(gg+bg)+' Gold'+(dd?'<br>💎 +'+dd+' Diamanten':'')+(ex?'<br>'+ex.replace(/^\s+/,''):'')+'</div>'}
 }catch(e){res='Belohnung erhalten.'}
 b.k=newK(b.pos);BD.busy=false;BD.res='Du bist auf dem Feld gelandet:<br>'+res+ticketDrop();try{log('<span style="color:#cfd6e0">Schicksals-Brett: '+res.replace(/<[^>]+>/g,' ')+'</span>')}catch(e){}
 done();boardPaint()}

/* ---------- Münzen-Rausch (Tap-Spiel) ---------- */
var TS=null,TIV=null;
var SL={gruen:['Grüner Schleim','#b6ff7a','#3fbf2a','#1b6a14','💰 Gold'],blau:['Eis-Schleim','#9ad8ff','#2f86e0','#123a7a','💎 Diamanten'],rot:['Lava-Schleim','#ffb08a','#e0452a','#7a1608','🔩 Eisen'],lila:['Gift-Schleim','#e0b0ff','#9a46e0','#4a1470','🔮 Kugeln'],orange:['Bernstein-Schleim','#ffd08a','#f0902a','#7a4208','⚔️ Gegenstände'],gold:['Gold-Schleim','#fff0a0','#f0c040','#9a6a08','✨ Alles']};
function t0(){return Math.max(8,Math.round(Math.sqrt(Math.max(1,meta.attack||40))*6))}
function hpFor(s,i){return Math.round(70*Math.pow(1.38,s-1)*(1+.04*(i-1))*(i===10?8:1))}
function tapIntro(){
 modal(head('💰 MÜNZEN-RAUSCH')+'<p style="font-size:.82rem;line-height:1.55;text-align:center">Tippe auf die Schleime, damit Ben angreift. Du hast <b>60 Sekunden</b>.<br>Jede Schleim-Art lässt etwas anderes fallen:<br>'+Object.keys(SL).map(function(k){return '<b style="color:'+SL[k][2]+'">'+SL[k][0]+'</b>: '+SL[k][4]}).join('<br>')+'<br>Kaufe unterwegs mit ✨ Funken Helden und nutze Fähigkeiten. Alle zehn Schleime kommt ein Boss.<br><b style="color:#ff9a8a">Ein Gratis-Versuch pro Tag.</b></p>'+startBtns('tap','START (60 s)'))}
function tapStop(){if(TIV){clearInterval(TIV);TIV=null}}
window.__evTapStart=function(){

 TS={ms:60000,stage:1,idx:1,type:'gruen',sp:0,lv:{ben:0,luna:0,jam:0},cd:{fire:0,rage:0,gold:0,frost:0},bf:{rage:0,gold:0,frost:0},c:{gold:0,dias:0,iron:0,orbP:0,orbs:0,itP:0,itm:0},kills:0,acc:0,fin:false};
 TS.type=tpick();TS.max=TS.hp=hpFor(1,1);tapPaint();
 tapStop();TIV=setInterval(tapTick,100)};
function tpick(){var r=Math.random()*100;return r<34?'gruen':r<56?'blau':r<74?'rot':r<86?'orange':r<96?'lila':'gold'}
function tapPaint(){
 var sl=SL[TS.type],boss=TS.idx===10;
 var h='<div class="evbar" style="margin-bottom:6px"><span>⏱ <b id="tT">60</b> s</span><span><b>Stufe '+TS.stage+'</b> · Monster <b id="tI">'+TS.idx+'</b>/10</span><span>✨ <b id="tS">0</b></span></div>'
 +'<div id="tF" style="position:relative;height:300px;overflow:hidden;border-radius:14px;border:2px solid #f0c04055;background:linear-gradient(#000a,#0004),url(dung/brick.webp) center/150px;touch-action:manipulation;user-select:none;-webkit-user-select:none" onpointerdown="__evTap(event)">'
 +'<div style="position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(#0008,#0000),url(dung/floor.webp) center/120px;border-top:3px solid #000"></div>'
 +'<div style="position:absolute;left:10px;right:10px;top:8px"><div style="display:flex;justify-content:space-between;font-size:.66rem;text-shadow:0 0 4px #000"><b id="tN">'+(boss?'👑 BOSS ':'')+sl[0]+'</b><span id="tH"></span></div><div style="height:12px;border-radius:6px;background:#000a;border:2px solid #000;overflow:hidden"><div id="tB" style="height:100%;width:100%;background:linear-gradient(90deg,#d02020,#ff5a3a)"></div></div></div>'
 +'<img id="tBen" src="h/ben_i0.webp" style="position:absolute;left:6px;bottom:30px;width:150px;filter:drop-shadow(0 5px 5px #000);transition:transform .08s">'
 +'<div id="tM" style="position:absolute;right:14px;bottom:36px">'+slimeHTML(TS.type,boss)+'</div>'
 +'<div id="tSl" style="position:absolute;left:120px;top:140px;width:80px;height:8px;border-radius:50%;background:linear-gradient(90deg,#fff0,#fff,#fff0);transform:rotate(-18deg);box-shadow:0 0 14px #fff;opacity:0"></div>'
 +'<div style="position:absolute;left:0;right:0;bottom:6px;text-align:center;font-size:.66rem;opacity:.9;text-shadow:0 0 4px #000">👆 Tippe aufs Feld: Ben greift an</div></div>'
 +'<div id="tSk" style="display:flex;gap:6px;margin:10px 0"></div><div id="tHe"></div>'
 +'<div id="tG" style="text-align:center;font-size:.72rem;opacity:.85;margin-top:6px"></div>';
 modal(head('💰 MÜNZEN-RAUSCH','__evTapQuit()')+h);tapHud(true)}
function slimeHTML(type,boss){
 var n=boss?'boss':type,w=boss?210:176,hh=Math.round(w*.95),st0='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:screen';
 return '<div id="tMs" style="position:relative;width:'+w+'px;height:'+hh+'px"><img class="sA" src="slime/'+n+'_i0.webp" alt="" style="'+st0+'"><img class="sB" src="slime/'+n+'_i1.webp" alt="" style="'+st0+'"><img class="sH" src="slime/'+n+'_h.webp" alt="" style="'+st0+'"></div>'}
function tdmg(){var d=t0()*(1+.35*TS.lv.ben)*(TS.bf.rage>0?2:1);return d}
function tdps(){return t0()*(.4*TS.lv.luna+1.2*TS.lv.jam)}
var HE=[['ben','Ben','h/ben_hi.webp',15,1.35,function(L){return '+'+Math.round(35*L)+'% Tipp-Schaden'}],['luna','Luna','h/lun_hi.webp',25,1.38,function(L){return fmt(t0()*.4*L)+' Schaden/Sek'}],['jam','Jamal','h/jam_hi.webp',90,1.42,function(L){return fmt(t0()*1.2*L)+' Schaden/Sek'}]];
var SK=[['fire','🔥','Feuerstoß',10000],['rage','⚡','Rausch',22000],['gold','💰','Goldregen',25000],['frost','❄️','Frost',18000]];
function hcost(k){var h=HE.filter(function(x){return x[0]===k})[0];return Math.round(h[3]*Math.pow(h[4],TS.lv[k]))}
function tapHud(full){
 if(!TS)return;var e;
 e=$('tT');if(e)e.textContent=Math.max(0,Math.ceil(TS.ms/1000));e=$('tI');if(e)e.textContent=TS.idx;e=$('tS');if(e)e.textContent=fmt(TS.sp);
 e=$('tB');if(e)e.style.width=Math.max(0,TS.hp/TS.max*100)+'%';e=$('tH');if(e)e.textContent=fmt(Math.max(0,TS.hp))+' / '+fmt(TS.max);
 e=$('tG');if(e)e.innerHTML='Beute bisher: 💰 '+fmt(TS.c.gold)+' · 💎 '+TS.c.dias+' · 🔩 '+TS.c.iron+' · 🔮 '+TS.c.orbs+' · ⚔️ '+TS.c.itm+' · Besiegt: '+TS.kills;
 var sk='';SK.forEach(function(s){var cd=TS.cd[s[0]],act=TS.bf[s[0]]>0;sk+='<div onclick="__evSkill(\''+s[0]+'\')" style="flex:1;text-align:center;padding:6px 2px;border:2px solid '+(cd>0?'#555':act?'#6fe08a':'#ffd24a')+';border-radius:12px;background:#0009;font-size:.58rem;cursor:pointer"><div style="font-size:1.3rem">'+s[1]+'</div>'+s[2]+'<div style="opacity:.75">'+(act?'aktiv':cd>0?Math.ceil(cd/1000)+' s':'bereit')+'</div></div>'});
 e=$('tSk');if(e)e.innerHTML=sk;
 if(full||TS.heroDirty!==false){var he='';HE.forEach(function(x){var L=TS.lv[x[0]],c=hcost(x[0]),ok=TS.sp>=c;he+='<div style="display:flex;gap:10px;align-items:center;padding:6px 8px;border:1px solid #6a3fb055;border-radius:12px;background:#0008;margin-bottom:6px"><img src="'+x[2]+'" style="width:40px;height:40px;object-fit:cover;border-radius:9px;border:2px solid #f0c040"><div style="flex:1"><b style="font-size:.8rem">'+x[1]+'</b> <span style="font-size:.62rem;opacity:.7">Stufe '+L+'</span><div style="font-size:.64rem;color:#b9a77f">'+x[5](Math.max(1,L))+(L<1?' (ab Stufe 1)':'')+'</div></div><div onclick="__evBuy(\''+x[0]+'\')" style="padding:7px 10px;border-radius:9px;border:2px solid '+(ok?'#f0c040':'#555')+';background:'+(ok?'linear-gradient(135deg,#8a0000,#c62000)':'#222')+';font-size:.7rem;font-weight:700;cursor:pointer">'+fmt(c)+' ✨</div></div>'});e=$('tHe');if(e)e.innerHTML=he;TS.heroDirty=false}}
function tapNewMonster(){TS.type=tpick();if(TS.idx===10&&TS.type==='gold')TS.type='lila';TS.max=TS.hp=hpFor(TS.stage,TS.idx);
 var m=$('tM');if(m)m.innerHTML=slimeHTML(TS.type,TS.idx===10);var n=$('tN');if(n)n.innerHTML=(TS.idx===10?'👑 BOSS ':'')+SL[TS.type][0]}
function tapKill(){
 var s=TS.stage,g=TS.bf.gold>0?2:1,boss=TS.idx===10,mul=boss?4:1,ty=TS.type,c=TS.c;
 TS.kills++;TS.sp+=6+3*s;TS.heroDirty=true;
 if(ty==='gruen')c.gold+=(15+10*s)*g*mul;
 else if(ty==='blau')c.dias+=(s>=4?2:1)*g*mul;
 else if(ty==='rot')c.iron+=(1+Math.floor(s/5))*mul;
 else if(ty==='orange'){c.itP+=mul;while(c.itP>=3){c.itP-=3;c.itm++}}
 else if(ty==='lila'){c.orbP+=mul;while(c.orbP>=3){c.orbP-=3;c.orbs++}}
 else{c.gold+=30*s*g;c.dias+=3*g;c.iron+=3}
 tapFloat(boss?'BOSS besiegt!':'+'+({gruen:(15+10*s)*g+' 💰',blau:'💎',rot:'🔩',orange:'⚔️',lila:'🔮',gold:'✨ Gold!'})[ty],'#ffd24a');
 try{var f=$('tF'),mm=$('tM');if(f&&mm&&f.children.length<30){var gh=document.createElement('img');gh.src='slime/'+(boss?'boss':ty)+'_d.webp';gh.style.cssText='position:absolute;right:'+(boss?4:14)+'px;bottom:36px;width:'+(boss?210:176)+'px;mix-blend-mode:screen;pointer-events:none;transition:opacity .55s,transform .55s;z-index:3';f.appendChild(gh);setTimeout(function(){gh.style.opacity='0';gh.style.transform='translateY(14px)'},60);setTimeout(function(){if(gh.parentNode)gh.parentNode.removeChild(gh)},640)}}catch(e){}
 TS.idx++;if(TS.idx>10){TS.idx=1;TS.stage++}
 tapNewMonster()}
function tapFloat(t,col,x,y){var f=$('tF');if(!f)return;if(f.children.length>40)return;var d=document.createElement('div');d.className='evd';d.style.cssText='left:'+(x!=null?x:200+Math.random()*80)+'px;top:'+(y!=null?y:90+Math.random()*60)+'px;color:'+col+';font-size:'+(t.length>8?'1.1':'1.25')+'rem';d.textContent=t;f.appendChild(d);setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d)},720)}
function tapHit(d,crit){
 if(!TS||TS.fin)return;TS.hp-=d;
 var m=$('tMs');if(m){m.classList.remove('evsh');void m.offsetWidth;m.classList.add('evsh','hit');setTimeout(function(){var q=$('tMs');if(q)q.classList.remove('hit')},130)}
 tapFloat('-'+fmt(d)+(crit?' KRIT!':''),crit?'#ffe14a':'#fff')}
window.__evTap=function(ev){
 if(!TS||TS.fin)return;TS.taps=(TS.taps||0)+1;
 var cr=Math.random()<.08+(TS.bf.frost>0?.3:0),d=tdmg()*(cr?3:1);
 var b=$('tBen');if(b){b.src='h/ben_at.webp';b.style.transform='translateX(26px)';setTimeout(function(){var q=$('tBen');if(q){q.src='h/ben_i0.webp';q.style.transform=''}},120)}
 var s=$('tSl');if(s){s.style.opacity='1';setTimeout(function(){var q=$('tSl');if(q)q.style.opacity='0'},90)}
 tapHit(d,cr);while(TS.hp<=0&&!TS.fin)tapKill();tapHud(false)};
window.__evSkill=function(k){
 if(!TS||TS.fin||TS.cd[k]>0)return;var s=SK.filter(function(x){return x[0]===k})[0];TS.cd[k]=s[3];
 if(k==='fire'){tapHit(t0()*12*(1+.35*TS.lv.ben),true);while(TS.hp<=0&&!TS.fin)tapKill()}
 else if(k==='rage')TS.bf.rage=8000;else if(k==='gold')TS.bf.gold=8000;else TS.bf.frost=6000;
 tapHud(false)};
window.__evBuy=function(k){if(!TS||TS.fin)return;var c=hcost(k);if(TS.sp<c)return;TS.sp-=c;TS.lv[k]++;TS.heroDirty=true;tapHud(true)};
function tapTick(){
 if(!TS||TS.fin){tapStop();return}
 TS.ms-=100;['fire','rage','gold','frost'].forEach(function(k){if(TS.cd[k]>0)TS.cd[k]-=100});['rage','gold','frost'].forEach(function(k){if(TS.bf[k]>0)TS.bf[k]-=100});
 var dp=tdps();if(dp>0){TS.acc+=dp*.1;if(TS.acc>=1){var d=Math.floor(TS.acc);TS.acc-=d;TS.hp-=d;while(TS.hp<=0&&!TS.fin)tapKill()}}
 if(TS.ms<=0){tapEnd();return}
 tapHud(false)}
function tapEnd(){
 TS.fin=true;tapStop();var c=TS.c,M=EM.m,g=Math.min(2500*M,Math.round(c.gold*M)),d=Math.min(25*M,Math.round(c.dias*M)),ir=Math.min(15*M,Math.round(c.iron*M)),ob=Math.min(2*M,c.orbs*M),it=Math.min(2*M,c.itm*M),itx='',orb=TS.stage>=10?'lila':'blau';
 if(g)gainGold(g);if(d)gainDia(d);try{ens()}catch(e){}
 if(ir){inventory.iron=(inventory.iron||0)+ir}
 if(ob){inventory.orbs=inventory.orbs||{};inventory.orbs[orb]=(inventory.orbs[orb]||0)+ob}
 for(var q=0;q<it;q++)itx+=(window.__kamEvtItem?window.__kamEvtItem(TS.stage>=6?'blau':'gruen'):'')+'<br>';
 done();
 var r='💰 <b>'+fmt(g)+'</b> Gold<br>💎 <b>'+d+'</b> Diamanten<br>🔩 <b>'+ir+'</b> Eisenbarren<br>🔮 <b>'+ob+'</b> '+(orb==='lila'?'Lila':'Blaue')+' Kugel'+(ob===1?'':'n')+'<br>⚔️ <b>'+it+'</b> Gegenstand'+(it===1?'':'e')+(itx?'<div style="font-size:.8rem">'+itx+'</div>':'')+(M>1?'<div style="font-size:.7rem;color:#7fc0ff;margin-top:4px"><i class="ejp"></i> 5-fache Beute</div>':'');
 try{log('<span style="color:#cfd6e0">Münzen-Rausch: '+r.replace(/<[^>]+>/g,'').replace(/\s+/g,' ')+'</span>')}catch(e){}
 modal(head('💰 MÜNZEN-RAUSCH','__evOpen()')+'<div style="padding:16px;border:2px solid #f0c040;border-radius:14px;background:#3a2a0a66;text-align:center"><b style="color:#f0c040;font-size:1.1rem">Zeit um!</b><div style="font-size:.8rem;margin:6px 0">Stufe <b>'+TS.stage+'</b> erreicht · <b>'+TS.kills+'</b> Schleime besiegt</div><div style="font-size:.95rem;line-height:1.8;margin-top:8px">'+r+ticketDrop()+'</div></div><div class="evb" style="margin-top:14px" onclick="__evOpen()">FERTIG</div>')}
window.__evTapQuit=function(){if(TS&&!TS.fin&&!confirm('Wirklich abbrechen? Dein Versuch für heute ist dann weg, die Beute bis jetzt wird ausgezahlt.'))return;if(TS&&!TS.fin)tapEnd();else hub()};
window.__evDbg=function(){return{MM:MM,TS:TS,BD:BD,plan:plan}};
;window.__ver=window.__ver||{};window.__ver['evt']='11-11e';
})();
