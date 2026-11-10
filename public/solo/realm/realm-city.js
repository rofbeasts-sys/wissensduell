/* Realm of Brain – Stadt zum Ausbauen */
(function(){
var KEY='robCity';
var IMG={mine:'mine',dia:'dia',smith:'smith',house:'house',bank:'bank',tower:'tower',arena:'arena',camp:'camp'};
var B=[
 {id:'mine',  ic:'⛏️', n:'Goldmine',      d:'Bringt Gold pro Stunde',        max:20, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:14,y:12},
 {id:'dia',   ic:'💎', n:'Diamantenmine', d:'Bringt Diamanten pro Stunde',   max:20, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:70,y:10},
 {id:'smith', ic:'⚒️', n:'Schmiede',      d:'+2% Erfolgschance beim Schmieden pro Stufe',          max:10, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:42,y:30},
 {id:'house', ic:'🏠', n:'Kaserne',       d:'+15 Leben pro Stufe',           max:10, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:10,y:46},
 {id:'bank',  ic:'🏦', n:'Schatzhaus',    d:'+4% Gold im Kampf und +2,5% besserer Loot pro Stufe',   max:15, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:72,y:46},
 {id:'tower', ic:'🗼', n:'Magieturm',      d:'Lagert mehr Offline-Ertrag (4 Std. am Anfang, +0,8 Std. pro Stufe, max. 12 Std.)', max:10, cost:function(l){return Math.round(500*Math.pow(1.45,l));}, cur:'g', x:40,y:62},
 {id:'arena', ic:'⚔️', n:'Arena',         d:'Gegner schlagen 5% schwächer pro Stufe (Stufe 10: halbe Kampfkraft)', max:10, cost:function(l){return Math.round(1500*Math.pow(1.6,l));}, cur:'g', x:14,y:76},
 {id:'camp',  ic:'🔥', n:'Lagerfeuer',    d:'Mehr Lagerfeuer im Lauf: heilen 40% +6% pro Stufe, öfter pro Stufe', max:10, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:68,y:76}
];
function get(){ try{var o=JSON.parse(localStorage.getItem(KEY)||'{}'); o.b=o.b||{}; if(!o.last)o.last=Date.now(); return o;}catch(e){return {b:{},last:Date.now()};} }
function put(o){ try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){} if(typeof saveStateToFirebase==='function')saveStateToFirebase(); }
function lv(id){var v=get().b[id]||0,b=B.filter(function(x){return x.id===id})[0];return b&&b.max?Math.min(v,b.max):v;}
window.cityBonus=function(k){
  if(k==='atk')return 0;
  if(k==='hp')return lv('house')*15;
  if(k==='loot')return lv('bank')*2.5;
  if(k==='gold')return 1+lv('bank')*0.04;
  if(k==='arena')return Math.min(0.5,lv('arena')*0.05);
  return 0;
};
function cap(){return Math.min(12,4+lv('tower')*0.8);}
function pending(){
  var o=get(),h=Math.min((Date.now()-o.last)/3600000,cap());
  return {g:Math.floor(h*lv('mine')*30),d:Math.floor(h*lv('dia')*1.5),h:h};
}
function gold(){return (typeof meta!=='undefined'&&meta)?meta.gold:(parseInt(localStorage.getItem('robGold')||'0')||0);}
function setGold(v){ if(typeof meta!=='undefined'&&meta)meta.gold=v; try{localStorage.setItem('robGold',String(v));}catch(e){} }
function dias(){return (typeof globalDiamonds!=='undefined')?globalDiamonds:(parseInt(localStorage.getItem('robDiamonds')||'0')||0);}
function setDias(v){ if(typeof globalDiamonds!=='undefined'){globalDiamonds=v; if(typeof meta!=='undefined'&&meta)meta.diamonds=v;} try{localStorage.setItem('robDiamonds',String(v));}catch(e){} }
function applyStats(){ if(typeof meta!=='undefined'&&meta&&typeof recalcStats==='function'){try{recalcStats();}catch(e){}} if(typeof updateUI==='function'){try{updateUI();}catch(e){}} }
function root(){
  var r=document.getElementById('cityModal');
  if(r)return r;
  r=document.createElement('div'); r.id='cityModal';
  r.style.cssText='position:fixed;inset:0;z-index:900;display:none;background:#0b1a2b;overflow:auto;font-family:Cinzel,serif;color:#f5e6b0';
  document.body.appendChild(r); return r;
}
window.cityBack=function(){var p=document.getElementById('cityPanel');if(p&&p.innerHTML.trim()){p.innerHTML='';return}closeCity()};
window.closeCity=function(){ root().style.display='none'; };
window.showCity=function(){
  var m=document.getElementById('menuPanel'); if(m)m.style.display='none';
  var r=root(), p=pending(), cl=''; r.style.display='block';
  var h='<div style="position:sticky;top:0;z-index:5;display:flex;gap:8px;align-items:center;padding:10px 12px;background:#07111c;border-bottom:2px solid #c9a227">'
   +'<button class="btn" onclick="cityBack()" style="font-size:.75rem;padding:7px 12px">← ZURÜCK</button>'
   +'<div style="flex:1;text-align:center;font-weight:700;letter-spacing:2px">🏙️ STADT</div>'
   +'<div style="font-size:.8rem">💰 '+gold()+' · 💎 '+dias()+' · 💜 '+souls()+'</div></div>';
  h+='<div id="cityRate" style="margin:8px auto 0;max-width:640px;padding:8px 10px;border:1px solid #c9a22788;border-radius:10px;background:#0006;font-size:.74rem;text-align:center;line-height:1.6"></div>';
  h+='<div style="text-align:center;font-size:.7rem;opacity:.7;padding:8px 0 0">Max. '+(Math.round(cap()*10)/10)+' Std. Offline-Ertrag</div>';
  h+='<div id="cityMap" style="margin:10px auto;max-width:640px;padding:14px 8px;border-radius:16px;border:3px solid #c9a227;'
   +'background:radial-gradient(ellipse at 50% 30%,#2a1c3d 0%,#170f26 55%,#0b0714 100%);display:grid;grid-template-columns:1fr 1fr;gap:6px 4px">';
  B.forEach(function(b){
    var l=lv(b.id), img=IMG[b.id], dim=(b.max&&!l);
    h+='<div onclick="cityOpen(\''+b.id+'\')" style="position:relative;text-align:center;cursor:pointer;user-select:none;padding:4px">'
     +(img?'<img src="city_'+img+'.png" alt="'+b.n+'" style="width:100%;max-width:240px;height:auto;filter:drop-shadow(0 6px 5px rgba(0,0,0,.45))'+(dim?';filter:grayscale(.85) brightness(.7)':'')+'">'
          :'<div style="height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:4.5rem;filter:drop-shadow(0 4px 4px #000)'+(dim?';opacity:.5':'')+'">'+b.ic+'</div><div style="background:#6b4a1f;border:2px solid #c9a227;border-radius:8px;padding:3px 12px;font-weight:700;font-size:.85rem;margin-top:6px">'+b.n+'</div></div>')
     +(b.max?'<div style="position:absolute;top:6px;right:10px;background:'+(l?'#c9a227':'#444')+';color:#000;border-radius:12px;padding:2px 9px;font-size:.72rem;font-weight:700;border:2px solid #000">'+(l?'Lv.'+l:'🔒 bauen')+'</div>':'')
     +'</div>';
  });
  h+='</div><div id="cityPanel" style="margin:10px auto;max-width:640px;padding:0 10px 90px"></div>';
  h+='<div style="position:sticky;bottom:0;z-index:5;padding:10px 12px;background:#07111c;border-top:2px solid #c9a227;text-align:center">'
   +'<button class="btn btn-wide" onclick="cityCollect()" style="width:100%;font-size:.9rem;padding:12px" '+((p.g||p.d)?'':'disabled')+'>📦 ABHOLEN · 💰 '+p.g+' · 💎 '+p.d+'</button></div>';
  r.innerHTML=h;rateUpd();
};
function souls(){try{return (prestigeData&&prestigeData.souls)||0}catch(e){return 0}}
function fmtT(s){s=Math.max(0,Math.round(s));var h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=s%60;return (h?h+' Std. ':'')+(h||m?m+' Min. ':'')+r+' Sek.'}
function rateUpd(){var el=document.getElementById('cityRate'),m=document.getElementById('cityModal');if(!el||!m||m.style.display==='none')return;
 var o=get(),mn=lv('mine'),dn=lv('dia'),el_=(Date.now()-o.last)/3600000,capH=cap(),h=Math.min(el_,capH),t='';
 var gph=mn*30,dph=Math.round(dn*1.5*10)/10;
 t+='⛏️ Gold: <b>'+gph+'</b> pro Std.';
 if(mn&&h<capH){var gn=Math.floor(h*gph)+1;t+=' · nächstes 💰 in <b>'+fmtT((gn/gph-h)*3600)+'</b>'}
 t+='<br>💎 Diamanten: <b>'+dph+'</b> pro Std.';
 if(dn&&h<capH){var dd=Math.floor(h*dn*1.5)+1;t+=' · nächster 💎 in <b>'+fmtT((dd/(dn*1.5)-h)*3600)+'</b>'}
 if(!mn&&!dn)t='Baue Goldmine oder Diamantenmine, dann siehst du hier die Zeiten.';
 else t+='<br>📦 Speicher '+(h>=capH?'<b style="color:#ff9a8a">voll – bitte abholen!</b>':'voll in <b>'+fmtT((capH-h)*3600)+'</b>');
 el.innerHTML=t;
 var p=pending(),bt=document.querySelector('#cityModal button[onclick="cityCollect()"]');if(bt){bt.innerHTML='📦 ABHOLEN · 💰 '+p.g+' · 💎 '+p.d;bt.disabled=!(p.g||p.d)}}
setInterval(rateUpd,1000);
window.cityOpen=function(id){
  var b=B.filter(function(x){return x.id===id;})[0], l=lv(id), pn=document.getElementById('cityPanel');
  var c=l>=b.max?null:b.cost(l);
  pn.innerHTML='<div style="border:2px solid #c9a227;border-radius:12px;padding:12px;background:rgba(0,0,0,.55);text-align:center">'
   +'<div style="font-size:2rem">'+b.ic+'</div><div style="font-weight:700">'+b.n+' · Stufe '+l+'/'+b.max+'</div>'
   +'<div style="font-size:.78rem;margin:6px 0">'+b.d+'</div>'
   +(c===null?'<div style="color:#8f8">Maximal ausgebaut</div>'
     :'<button class="btn btn-wide" onclick="cityUp(\''+id+'\')" style="padding:9px 18px">'+(l?'AUSBAUEN':'BAUEN')+' · '+(b.cur==='g'?'💰 ':'💎 ')+c+'</button>')
   +'</div>';
  pn.scrollIntoView({behavior:'smooth',block:'nearest'});
};
window.cityUp=function(id){
  var b=B.filter(function(x){return x.id===id;})[0], o=get(), l=o.b[id]||0;
  if(l>=b.max)return; var c=b.cost(l);
  if(b.cur==='g'){ if(gold()<c){alert('Nicht genug Gold!');return;} 
    // vorher Ertrag sichern, damit sich die Rate nicht rückwirkend ändert
    cityCollect(true); setGold(gold()-c); }
  else { if(dias()<c){alert('Nicht genug Diamanten!');return;} cityCollect(true); setDias(dias()-c); }
  o=get(); o.b[id]=l+1; put(o);
  if(typeof meta!=='undefined'&&meta){ if(id==='house'){meta.maxHp+=15;meta.hp+=15;} }
  applyStats(); showCity(); cityOpen(id);
};
window.cityCollect=function(silent){
  var p=pending(), o=get();
  if(p.g)setGold(gold()+p.g); if(p.d)setDias(dias()+p.d);
  o.last=Date.now(); put(o); applyStats();
  if(!silent)showCity();
};

/* ---------- Magieturm: Offline-Farmen ---------- */
var OFFK='robOffLast',OFFMIN=2*60000;
function offTouch(){if(document.hidden)return;try{localStorage.setItem(OFFK,String(Date.now()))}catch(e){}}
function offCalc(){
  var t=lv('tower');if(t<1)return null;
  var last=0;try{last=+localStorage.getItem(OFFK)||0}catch(e){}if(!last)return null;
  var ms=Date.now()-last;if(ms<OFFMIN)return null;
  var mb=0;try{mb=(inventory&&inventory.stats&&inventory.stats.maxBoss)||0}catch(e){}
  var k=Math.max(1,Math.min(t,mb+1)),h=Math.min(ms/3600000,cap()),runs=h*4;
  var g=Math.floor(runs*200*k),ir=Math.floor(runs*k);
  return {k:k,h:h,full:{g:g,ir:ir},half:{g:Math.floor(g/2),ir:Math.floor(ir/2)},price:Math.max(5,Math.ceil((g-Math.floor(g/2))/200))};
}
function offHM(h){var m=Math.round(h*60);return Math.floor(m/60)+' Std. '+(m%60)+' Min.'}
function offShow(){
  var o=offCalc();if(!o){offTouch();return}
  if(document.getElementById('cityOff'))return;
  var d=document.createElement('div');d.id='cityOff';
  d.style.cssText='position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);padding:16px;font-family:Cinzel,Georgia,serif';
  var have=dias();
  d.innerHTML='<div style="max-width:380px;width:100%;border:2px solid #c9a227;border-radius:16px;padding:18px 16px;background:linear-gradient(145deg,#150a2a,#0d0716);color:#f5e6b0;text-align:center">'
   +'<div style="font-size:2rem">🔮</div><div style="font-weight:700;font-size:1.05rem;margin:4px 0">Während du weg warst</div>'
   +'<div style="font-size:.78rem;opacity:.85;margin-bottom:12px">Der Magieturm hat '+offHM(o.h)+' in Kammer '+o.k+' für dich gefarmt.</div>'
   +'<div style="display:flex;gap:8px;margin-bottom:12px"><div style="flex:1;padding:8px;border-radius:10px;background:#0006;border:1px solid #c9a22755"><div style="font-size:.65rem;opacity:.7">Hälfte</div><b>💰 '+o.half.g+'</b><br><b>🔩 '+o.half.ir+'</b></div>'
   +'<div style="flex:1;padding:8px;border-radius:10px;background:#3a2a0a88;border:1px solid #ffd24a"><div style="font-size:.65rem;opacity:.7">Alles</div><b>💰 '+o.full.g+'</b><br><b>🔩 '+o.full.ir+'</b></div></div>'
   +'<button id="offHalf" class="btn btn-wide" style="width:100%;margin-bottom:8px">✔ HÄLFTE NEHMEN</button>'
   +'<button id="offFull" class="btn btn-wide" style="width:100%" '+(have>=o.price?'':'disabled')+'>💎 ALLES NEHMEN · '+o.price+' Diamanten</button>'
   +(have>=o.price?'':'<div style="font-size:.68rem;margin-top:6px;color:#ff9a8a">Zu wenig Diamanten ('+have+').</div>')+'</div>';
  document.body.appendChild(d);
  function take(r,pay){
    if(pay){if(dias()<o.price)return;setDias(dias()-o.price)}
    setGold(gold()+r.g);
    try{inventory.iron=(inventory.iron||0)+r.ir;if(typeof saveInventory==='function')saveInventory()}catch(e){}
    offTouch();d.remove();applyStats();
    try{if(typeof toast==='function')toast('Offline: +'+r.g+' Gold, +'+r.ir+' Eisenbarren')}catch(e){}
  }
  d.querySelector('#offHalf').onclick=function(){take(o.half,false)};
  d.querySelector('#offFull').onclick=function(){take(o.full,true)};
}
window.__cityOff=offShow;window.__cityOffInfo=function(){var t=lv('tower'),o=null;try{o=offCalc()}catch(e){}return {tower:t,ready:!!o,h:o?o.h:0,k:o?o.k:0}};
setInterval(offTouch,20000);
document.addEventListener('visibilitychange',function(){if(document.hidden){try{localStorage.setItem(OFFK,String(Date.now()))}catch(e){}}else setTimeout(offShow,400)});
addEventListener('pagehide',function(){try{localStorage.setItem(OFFK,String(Date.now()))}catch(e){}});
(function(){var n=0,iv=setInterval(function(){n++;var lo=document.getElementById('loginOverlay'),up=!lo||getComputedStyle(lo).display==='none';if(up||n>60){clearInterval(iv);setTimeout(function(){var o=localStorage.getItem(OFFK);if(!o)offTouch();else offShow()},700)}},300)})();
})();
