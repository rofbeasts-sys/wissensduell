/* Item-Shop: mystische Items fuer Gold. Immer Perfekt, 0 Sterne, Faehigkeiten zufaellig (Wunderschmiede kann sie aendern). */
(function(){
var PRICE=25000,MUL=1.6,TY={shoulder:'shoulder',weapon:'sword',armor:'armor',helm:'helm',ring:'ring',bow:'bow',staff:'staff',cape:'cape',hand:'hand',amulet:'amu',boots:'boots',quiver:'quiver',book:'book',shield:'shield'},TL={shoulder:'Schulter',weapon:'Waffe',armor:'Rüstung',helm:'Helm',ring:'Ring',bow:'Bogen',staff:'Stab',cape:'Umhang',hand:'Handschuhe',book:'Buch',shield:'Schild',amulet:'Amulett',boots:'Schuhe',quiver:'Köcher'};
function mk(){
  var L=[],have={};
  ITEMS.forEach(function(x){if(x.rarity==='mystisch'&&!x.fx&&!x.z)have[x.type]=x});
  ITEMS.forEach(function(x){if(x.rarity==='legendaer'&&!x.fx&&!x.z&&!have[x.type]&&!have['m_'+x.type]){have['m_'+x.type]=1;
    var id=x.id+'m';if(!ITEMS.some(function(y){return y.id===id}))ITEMS.push({id:id,name:'Mythisch: '+x.name,type:x.type,rarity:'mystisch',atk:Math.round((x.atk||0)*MUL),hp:Math.round((x.hp||0)*MUL),desc:x.desc,m:1,cls:x.cls,sk:x.sk})}});
  ITEMS.forEach(function(x){if(x.rarity==='mystisch'&&!x.fx&&!x.z)L.push(x)});
  return L}
function icon(b){var n=TY[b.type];if(b.type==='shield')n={turm:'tshield',rund:'shield',stachel:'buckler'}[b.sk||'turm'];return n?'items/'+n+'_r'+'.webp':null}
function buy(id){
  var b=ITEMS.filter(function(x){return x.id===id})[0];if(!b||meta.gold<PRICE)return;
  meta.gold-=PRICE;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}
  inventory.inst=inventory.inst||{};inventory.items=inventory.items||[];inventory.nid=inventory.nid||1;
  var u='u'+inventory.nid++;inventory.inst[u]={b:id,c:2,s:0};inventory.items.push(u);
  try{saveInventory()}catch(e){}try{updateUI()}catch(e){}
  try{toast('🛒 '+b.name+' (Perfekt) gekauft')}catch(e){}draw()}
window.__kamShopBuy=buy;
var SETS=[['Waffenset','⚔️',['weapon','bow','staff']],['Rüstungsset','🛡️',['armor','helm','shoulder','cape','hand','boots']],['Schmuckset','💍',['ring','amulet','book','shield','quiver']]];
function setItems(t){var L=mk();return t.map(function(ty){return L.filter(function(x){return x.type===ty})[0]}).filter(Boolean)}
function setPrice(t){return Math.round(setItems(t).length*PRICE*.8)}
window.__kamShopSet=function(i){var S=SETS[i],P=setPrice(S[2]);if(meta.gold<P)return;var L=setItems(S[2]);
  meta.gold-=P;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}
  inventory.inst=inventory.inst||{};inventory.items=inventory.items||[];inventory.nid=inventory.nid||1;
  L.forEach(function(b){var u='u'+inventory.nid++;inventory.inst[u]={b:b.id,c:2,s:0};inventory.items.push(u)});
  try{saveInventory()}catch(e){}try{updateUI()}catch(e){}try{toast('🛒 '+S[0]+' gekauft ('+L.length+' Items, Perfekt)')}catch(e){}draw()};
var css=document.createElement('style');css.textContent='#kamShop{position:fixed;inset:0;z-index:100002;background:#000c;display:none;align-items:flex-end;justify-content:center}.ksx .sh{width:min(100%,440px);background:#160e28;border:2px solid #5a3f8a;border-radius:18px 18px 0 0;padding:14px 16px 18px;max-height:86vh;overflow:auto;color:#ffe9c4}#kamShop h2{margin:0 0 4px;color:#f0c040;font-size:16px;text-align:center;letter-spacing:2px}.ksx .r{display:flex;gap:10px;align-items:center;border:2px solid #7a2a5a;border-radius:12px;background:#0006;padding:6px 8px;margin-top:6px}.ksx .r img{width:48px;height:48px;object-fit:contain;flex:none}.ksx .r .e{width:48px;font-size:30px;text-align:center}.ksx .i{flex:1;min-width:0;font-size:12px}.ksx .i b{color:#ff6fb0}.ksx .i small{display:block;color:#9a8cc0;font-size:11px}.ksx .bt{border:2px solid #f0c040;border-radius:10px;padding:6px 9px;color:#f0c040;font-size:12px;cursor:pointer;white-space:nowrap}.ksx .bt.off{opacity:.45;cursor:default}';
css.textContent+='#kamShopEmbed .sh{width:100%;max-height:none;border:0;background:none;padding:0;border-radius:0}';document.head.appendChild(css);
function draw(fm){
  var m=(fm?null:document.getElementById('kamShopEmbed'))||document.getElementById('kamShop');if(!m){m=document.createElement('div');m.id='kamShop';m.className='ksx';m.onclick=function(e){if(e.target.id==='kamShop')m.style.display='none'};document.body.appendChild(m)}
  var h='<div class="sh"><h2>🛒 ITEM-SHOP</h2><div style="text-align:center;font-size:11px;color:#9a8cc0;margin-bottom:4px">💰 '+meta.gold+' · Mystische Items: immer Perfekt, 0 Sterne, Fähigkeiten zufällig.</div>';
  SETS.forEach(function(S,i){var P=setPrice(S[2]);h+='<div class="r" style="border-color:#f0c040"><div class="e">'+S[1]+'</div><div class="i"><b style="color:#f0c040">'+S[0]+'</b><small>'+setItems(S[2]).length+' mystische Items · 20 % günstiger</small></div><div class="bt'+(meta.gold>=P?'':' off')+'" onclick="__kamShopSet('+i+')">💰 '+P+'</div></div>'});
  h+='<div style="margin:10px 0 2px;color:#9a8cc0;font-size:11px;text-align:center">Einzeln kaufen</div>';
  mk().forEach(function(b){var ic=icon(b);
    h+='<div class="r">'+(ic?'<img src="'+ic+'">':'<div class="e">✨</div>')+'<div class="i"><b>'+b.name+'</b><small>'+(TL[b.type]||b.type)+' · '+(b.desc||'')+'</small></div><div class="bt'+(meta.gold>=PRICE?'':' off')+'" onclick="__kamShopBuy(\''+b.id+'\')">💰 '+PRICE+'</div></div>'});
  m.innerHTML=h+'</div>'}
window.__kamShop=function(){draw(true);document.getElementById('kamShop').style.display='flex'};window.__kamShopInto=function(el){el.id='kamShopEmbed';el.className='ksx';draw()};

window.__benSkin=function(){try{return (localStorage.getItem('robRickOwn')==='1'&&localStorage.getItem('robSkin')==='rick')?'rick':'new'}catch(e){return 'new'}};
window.__dragBuy=function(){try{if(localStorage.getItem('robDragonDie')==='1')return;if(meta.gold<500000){alert('Zu wenig Münzen (500.000)');return}meta.gold-=500000;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}localStorage.setItem('robDragonDie','1');window.renderDiaShop()}catch(e){}};
window.__rickBuy=function(){try{var P=500000;if(localStorage.getItem('robRickOwn')==='1'){if(window.__benSkin()==='rick'&&window.__kamUnz)window.__kamUnz();localStorage.setItem('robSkin',window.__benSkin()==='rick'?'new':'rick');window.renderDiaShop();return}
if(meta.gold<P){alert('Zu wenig Münzen (500.000)');return}meta.gold-=P;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}localStorage.setItem('robRickOwn','1');localStorage.setItem('robSkin','rick');window.renderDiaShop()}catch(e){}};

/* ---- Zero-Abteil ---- */
var ZP={l:250000,m:1000000},ZS=[['helm','helm','Helm'],['armor','armor','Rüstung'],['hand','hand','Handschuhe'],['boots','boots','Schuhe'],['ring','ring','Ring'],['weapon','sword','Schwert'],['shield','shield','Schild']];
function zBase(t,r){var best=null;ITEMS.forEach(function(x){if(x.type===t&&x.rarity==='legendaer'&&!x.fx&&!x.z&&(!best||(x.atk||0)+(x.hp||0)>(best.atk||0)+(best.hp||0)))best=x});return best||{atk:10,hp:10}}
(function(){ZS.forEach(function(z){['l','m'].forEach(function(r){var id='zero_'+r+'_'+z[0];if(ITEMS.some(function(y){return y.id===id}))return;var b=zBase(z[0]),f=(r==='m'?1.6:1)*2,hp=Math.round((b.hp||0)*f*(z[0]==='armor'?1.25:1)),at=Math.round((b.atk||0)*f);
 var o={id:id,name:'Zero-'+z[2]+(r==='m'?' (Mystisch)':' (Legendär)'),type:z[0],rarity:r==='m'?'mystisch':'legendaer',atk:at,hp:hp,desc:'Nur für Zero',m:1,z:r,zi:'zero_'+r+'_'+z[1]+'.webp'};if(z[0]==='shield')o.sk='turm';ITEMS.push(o)})})})();
window.__zeroBuy=function(r,t){try{if(localStorage.getItem('robRickOwn')!=='1'){alert('Zuerst Zero kaufen');return}
 var ids=t==='all'?ZS.map(function(z){return 'zero_'+r+'_'+z[0]}):['zero_'+r+'_'+t];ids=ids.filter(function(id){return !(inventory.items||[]).some(function(u){return inventory.inst[u]&&inventory.inst[u].b===id})});
 var P=ids.length*ZP[r];if(!ids.length)return;if(meta.gold<P){alert('Zu wenig Münzen ('+P+')');return}
 meta.gold-=P;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}ids.forEach(function(id){window.__kamZeroInst(id)});try{saveInventory()}catch(e){}try{updateUI()}catch(e){}window.renderDiaShop()}catch(e){}};
function zeroUI(el){var own=localStorage.getItem('robRickOwn')==='1',h='<div style="border:2px solid #c9a227;border-radius:12px;padding:10px;margin-top:10px;background:#140f05"><div style="color:#ffd24a;font-weight:700;text-align:center">⚔️ ZERO-ABTEIL</div><small style="color:#caa;display:block;text-align:center;margin-bottom:6px">'+(own?'Alles perfekt, alle Fähigkeiten voll. Doppelte Werte, Rüstung +25 % Leben. Nur mit Zero tragbar.':'🔒 Zuerst Zero kaufen')+'</small>';
 [['l','Legendär','#ffb020','+40 % Leben'],['m','Mystisch','#ff4a3a','+50 % Leben']].forEach(function(R){var r=R[0],have=function(id){return (inventory.items||[]).some(function(u){return inventory.inst[u]&&inventory.inst[u].b===id})},miss=ZS.filter(function(z){return !have('zero_'+r+'_'+z[0])});
  h+='<div style="margin-top:8px;color:'+R[2]+';font-weight:700;font-size:.8rem">'+R[1]+' · Set (7 Teile): '+R[3]+'</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:4px">';
  ZS.forEach(function(z){var id='zero_'+r+'_'+z[0],b=ITEMS.filter(function(x){return x.id===id})[0],g=have(id);
   h+='<div style="text-align:center;border:1px solid '+R[2]+'55;border-radius:8px;padding:3px;background:#0008"><img src="items/'+b.zi+'" style="width:100%;max-width:56px"><div style="font-size:.55rem;color:#ddd">'+z[2]+'</div><div style="font-size:.5rem;color:#aab">'+(b.atk?'+'+b.atk+' ATK ':'')+(b.hp?'+'+b.hp+' HP':'')+'</div><button class="btn btn-sm" style="font-size:.55rem;padding:2px 3px;width:100%;height:22px;min-height:0" '+(g||!own?'disabled':'onclick="__zeroBuy(\''+r+'\',\''+z[0]+'\')"')+'>'+(g?'✔':ZP[r]/1000+'k')+'</button></div>'});
  h+='</div>';if(miss.length)h+='<button class="btn btn-sm" style="width:100%;margin-top:6px" '+(own?'onclick="__zeroBuy(\''+r+'\',\'all\')"':'disabled')+'>Ganzes Set · 🪙 '+(miss.length*ZP[r]).toLocaleString('de-DE')+'</button>'});
 var d=document.createElement('div');d.innerHTML=h+'</div>';el.appendChild(d.firstChild)}
var oRDS=window.renderDiaShop;window.__dsTab=window.__dsTab||'n';
if(typeof oRDS==='function')window.renderDiaShop=function(){oRDS.apply(this,arguments);try{var el=document.getElementById('diaShopList');if(!el)return;
var kids=[].slice.call(el.children);el.innerHTML='';var tab=window.__dsTab;
var bar=document.createElement('div');bar.style.cssText='display:flex;gap:6px;margin-bottom:10px';
[['n','🛒 SHOP'],['s','✨ SPEZIAL-SHOP']].forEach(function(t){var b=document.createElement('button');b.textContent=t[1];b.style.cssText='flex:1;padding:9px 4px;border-radius:10px;font-weight:700;font-size:.72rem;letter-spacing:1px;cursor:pointer;border:2px solid '+(tab===t[0]?'#f0c040':'#334');b.style.background=tab===t[0]?'linear-gradient(135deg,#3a2a0a,#6a4a10)':'#0a1220';b.style.color=tab===t[0]?'#ffd24a':'#8899aa';b.onclick=function(){window.__dsTab=t[0];window.renderDiaShop()};bar.appendChild(b)});el.appendChild(bar);
if(tab==='n'){var dd=document.createElement('div');dd.id='dailyEmbed';dd.style.cssText='border:2px solid #4caf50;border-radius:12px;padding:10px;margin-bottom:10px;background:#0b140d';el.appendChild(dd);try{window.__dailyInto(dd)}catch(e){}kids.forEach(function(c){el.appendChild(c)})}
else{var ie=document.createElement('div');ie.style.cssText='margin-bottom:10px';el.appendChild(ie);window.__kamShopInto(ie);
var own=localStorage.getItem('robRickOwn')==='1',on=window.__benSkin()==='rick',r=document.createElement('div');r.id='rickRow';r.style.cssText='border:2px solid #4a6a9a;border-radius:12px;padding:10px;margin-top:10px;background:#0a1220;display:flex;align-items:center;gap:10px';
r.innerHTML='<img src="run0.png" style="height:70px"><div style="flex:1;text-align:left"><div style="color:#8fd8ff;font-weight:700">Zero</div><small style="color:#aab">Eigener Held-Skin für Ben · trägt die Zero-Rüstung (unten)</small></div><button class="btn btn-sm" onclick="__rickBuy()">'+(own?(on?'Ben wählen':'Zero wählen'):'🪙 500.000')+'</button>';el.appendChild(r);try{zeroUI(el)}catch(e){console.log(e)}
var dg=document.createElement('div'),dow=localStorage.getItem('robDragonDie')==='1';dg.style.cssText='border:2px solid #b5482a;border-radius:12px;padding:10px;margin-top:10px;background:#1a0c0a;display:flex;align-items:center;gap:10px';
dg.innerHTML='<div style="font-size:2.4rem">🎲</div><div style="flex:1;text-align:left"><div style="color:#ff9a6a;font-weight:700">Drachenwürfel</div><small style="color:#caa">Dauerhaft, wirkt bei jedem Drachen: 3/4/5/6 = 30–60% Leben weg, ★ Oneshot, ☠ = +5000 Münzen, aber der Drache erledigt dich</small></div><button class="btn btn-sm" '+(dow?'disabled':'onclick="__dragBuy()"')+'>'+(dow?'✔ GEKAUFT':'🪙 500.000')+'</button>';el.appendChild(dg)}}catch(e){}};
})();
;window.__ver=window.__ver||{};window.__ver['itemshop']='11-13a';
