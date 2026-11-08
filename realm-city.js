/* Realm of Brain – Stadt zum Ausbauen */
(function(){
var KEY='robCity';
var IMG={dia:'dia',smith:'smith',house:'house',bank:'bank',tower:'tower',arena:'arena',camp:'camp'};
var B=[
 {id:'mine',  ic:'⛏️', n:'Goldmine',      d:'Bringt Gold pro Stunde',        max:15, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:14,y:12},
 {id:'dia',   ic:'💎', n:'Diamantenmine', d:'Bringt Diamanten pro Stunde',   max:15, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:70,y:10},
 {id:'smith', ic:'⚒️', n:'Schmiede',      d:'+2% Erfolgschance beim Schmieden pro Stufe',          max:15, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:42,y:30},
 {id:'house', ic:'🏠', n:'Kaserne',       d:'+15 Leben pro Stufe',           max:15, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:10,y:46},
 {id:'bank',  ic:'🏦', n:'Schatzhaus',    d:'+4% Gold im Kampf und +2,5% besserer Loot pro Stufe',   max:15, cost:function(l){return Math.round(500*Math.pow(1.5,l));}, cur:'g', x:72,y:46},
 {id:'tower', ic:'🗼', n:'Wachturm',      d:'Lagert mehr Offline-Ertrag (+2h pro Stufe, max. 24h)', max:15, cost:function(l){return Math.round(500*Math.pow(1.45,l));}, cur:'g', x:40,y:62},
 {id:'arena', ic:'⚔️', n:'Arena',         d:'Zum Kampf!',                    max:0,  cost:null, cur:'', x:14,y:76},
 {id:'camp',  ic:'🔥', n:'Lagerfeuer',    d:'Zurück zum Heldenmenü',         max:0,  cost:null, cur:'', x:68,y:76}
];
function get(){ try{var o=JSON.parse(localStorage.getItem(KEY)||'{}'); o.b=o.b||{}; if(!o.last)o.last=Date.now(); return o;}catch(e){return {b:{},last:Date.now()};} }
function put(o){ try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){} if(typeof saveStateToFirebase==='function')saveStateToFirebase(); }
function lv(id){return get().b[id]||0;}
window.cityBonus=function(k){
  if(k==='atk')return 0;
  if(k==='hp')return lv('house')*15;
  if(k==='loot')return lv('bank')*2.5;
  if(k==='gold')return 1+lv('bank')*0.04;
  return 0;
};
function cap(){return Math.min(24,4+lv('tower')*2);}
function pending(){
  var o=get(),h=Math.min((Date.now()-o.last)/3600000,cap());
  return {g:Math.floor(h*lv('mine')*250),d:Math.floor(h*lv('dia')*1.5),h:h};
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
   +'<div style="font-size:.8rem">💰 '+gold()+' · 💎 '+dias()+'</div></div>';
  h+='<div style="margin:10px;padding:10px;border:1px solid #c9a227;border-radius:10px;background:rgba(0,0,0,.4);font-size:.8rem;text-align:center">'
   +'Ertrag bereit: 💰 '+p.g+' · 💎 '+p.d+' <span style="opacity:.7">(max. '+cap()+' Std.)</span> '
   +'<button class="btn" onclick="cityCollect()" style="margin-left:8px;font-size:.75rem;padding:6px 12px" '+((p.g||p.d)?'':'disabled')+'>EINSAMMELN</button></div>';
  h+='<div id="cityMap" style="margin:10px auto;max-width:640px;padding:14px 8px;border-radius:16px;border:3px solid #c9a227;'
   +'background:radial-gradient(ellipse at 30% 20%,#2b8fe0 0%,#1a6fc0 50%,#0f4a8a 100%);display:grid;grid-template-columns:1fr 1fr;gap:6px 4px">';
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
  r.innerHTML=h;
};
window.cityOpen=function(id){
  var b=B.filter(function(x){return x.id===id;})[0], l=lv(id), pn=document.getElementById('cityPanel');
  if(id==='arena'){closeCity();return;}
  if(id==='camp'){closeCity();return;}
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
})();
