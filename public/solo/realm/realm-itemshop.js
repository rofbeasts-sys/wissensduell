/* Item-Shop: mystische Items fuer Gold. Immer Perfekt, 0 Sterne, Faehigkeiten zufaellig (Wunderschmiede kann sie aendern). */
(function(){
var PRICE=25000,MUL=1.6,TY={weapon:'sword',armor:'armor',helm:'helm',ring:'ring',bow:'bow',staff:'staff',cape:'cape',hand:'hand',amulet:'amu',boots:'boots',quiver:'quiver',book:'book',shield:'shield'},TL={weapon:'Waffe',armor:'Rüstung',helm:'Helm',ring:'Ring',bow:'Bogen',staff:'Stab',cape:'Umhang',hand:'Handschuhe',book:'Buch',shield:'Schild',amulet:'Amulett',boots:'Schuhe',quiver:'Köcher'};
function mk(){
  var L=[],have={};
  ITEMS.forEach(function(x){if(x.rarity==='mystisch'&&!x.fx)have[x.type]=x});
  ITEMS.forEach(function(x){if(x.rarity==='legendaer'&&!x.fx&&!have[x.type]&&!have['m_'+x.type]){have['m_'+x.type]=1;
    var id=x.id+'m';if(!ITEMS.some(function(y){return y.id===id}))ITEMS.push({id:id,name:'Mythisch: '+x.name,type:x.type,rarity:'mystisch',atk:Math.round((x.atk||0)*MUL),hp:Math.round((x.hp||0)*MUL),desc:x.desc,m:1})}});
  ITEMS.forEach(function(x){if(x.rarity==='mystisch'&&!x.fx)L.push(x)});
  return L}
function icon(b){var n=TY[b.type];return n?'items/'+n+(['boots','quiver','book','shield'].indexOf(b.type)>=0?'_r':'_o')+'.webp':null}
function buy(id){
  var b=ITEMS.filter(function(x){return x.id===id})[0];if(!b||meta.gold<PRICE)return;
  meta.gold-=PRICE;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}
  inventory.inst=inventory.inst||{};inventory.items=inventory.items||[];inventory.nid=inventory.nid||1;
  var u='u'+inventory.nid++;inventory.inst[u]={b:id,c:2,s:0};inventory.items.push(u);
  try{saveInventory()}catch(e){}try{updateUI()}catch(e){}
  try{toast('🛒 '+b.name+' (Perfekt) gekauft')}catch(e){}draw()}
window.__kamShopBuy=buy;
var SETS=[['Waffenset','⚔️',['weapon','bow','staff']],['Rüstungsset','🛡️',['armor','helm','cape','hand','boots']],['Schmuckset','💍',['ring','amulet','book','shield','quiver']]];
function setItems(t){var L=mk();return t.map(function(ty){return L.filter(function(x){return x.type===ty})[0]}).filter(Boolean)}
function setPrice(t){return Math.round(setItems(t).length*PRICE*.8)}
window.__kamShopSet=function(i){var S=SETS[i],P=setPrice(S[2]);if(meta.gold<P)return;var L=setItems(S[2]);
  meta.gold-=P;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}
  inventory.inst=inventory.inst||{};inventory.items=inventory.items||[];inventory.nid=inventory.nid||1;
  L.forEach(function(b){var u='u'+inventory.nid++;inventory.inst[u]={b:b.id,c:2,s:0};inventory.items.push(u)});
  try{saveInventory()}catch(e){}try{updateUI()}catch(e){}try{toast('🛒 '+S[0]+' gekauft ('+L.length+' Items, Perfekt)')}catch(e){}draw()};
var css=document.createElement('style');css.textContent='#kamShop{position:fixed;inset:0;z-index:100002;background:#000c;display:none;align-items:flex-end;justify-content:center}#kamShop .sh{width:min(100%,440px);background:#160e28;border:2px solid #5a3f8a;border-radius:18px 18px 0 0;padding:14px 16px 18px;max-height:86vh;overflow:auto;color:#ffe9c4}#kamShop h2{margin:0 0 4px;color:#f0c040;font-size:16px;text-align:center;letter-spacing:2px}#kamShop .r{display:flex;gap:10px;align-items:center;border:2px solid #7a2a5a;border-radius:12px;background:#0006;padding:6px 8px;margin-top:6px}#kamShop .r img{width:48px;height:48px;object-fit:contain;flex:none}#kamShop .r .e{width:48px;font-size:30px;text-align:center}#kamShop .i{flex:1;min-width:0;font-size:12px}#kamShop .i b{color:#ff6fb0}#kamShop .i small{display:block;color:#9a8cc0;font-size:11px}#kamShop .bt{border:2px solid #f0c040;border-radius:10px;padding:6px 9px;color:#f0c040;font-size:12px;cursor:pointer;white-space:nowrap}#kamShop .bt.off{opacity:.45;cursor:default}';
document.head.appendChild(css);
function draw(){
  var m=document.getElementById('kamShop');if(!m){m=document.createElement('div');m.id='kamShop';m.onclick=function(e){if(e.target.id==='kamShop')m.style.display='none'};document.body.appendChild(m)}
  var h='<div class="sh"><h2>🛒 ITEM-SHOP</h2><div style="text-align:center;font-size:11px;color:#9a8cc0;margin-bottom:4px">💰 '+meta.gold+' · Mystische Items: immer Perfekt, 0 Sterne, Fähigkeiten zufällig.</div>';
  SETS.forEach(function(S,i){var P=setPrice(S[2]);h+='<div class="r" style="border-color:#f0c040"><div class="e">'+S[1]+'</div><div class="i"><b style="color:#f0c040">'+S[0]+'</b><small>'+setItems(S[2]).length+' mystische Items · 20 % günstiger</small></div><div class="bt'+(meta.gold>=P?'':' off')+'" onclick="__kamShopSet('+i+')">💰 '+P+'</div></div>'});
  h+='<div style="margin:10px 0 2px;color:#9a8cc0;font-size:11px;text-align:center">Einzeln kaufen</div>';
  mk().forEach(function(b){var ic=icon(b);
    h+='<div class="r">'+(ic?'<img src="'+ic+'">':'<div class="e">✨</div>')+'<div class="i"><b>'+b.name+'</b><small>'+(TL[b.type]||b.type)+' · '+(b.desc||'')+'</small></div><div class="bt'+(meta.gold>=PRICE?'':' off')+'" onclick="__kamShopBuy(\''+b.id+'\')">💰 '+PRICE+'</div></div>'});
  m.innerHTML=h+'</div>'}
window.__kamShop=function(){draw();document.getElementById('kamShop').style.display='flex'};
setInterval(function(){var q=document.getElementById('kamQuick');if(q&&!document.getElementById('kamShopBtn')){var b=document.createElement('button');b.id='kamShopBtn';b.className='btn btn-sm';b.textContent='🛒 ITEM-SHOP';b.onclick=function(){window.__kamShop()};q.appendChild(b)}},900);
var oRDS=window.renderDiaShop;
if(typeof oRDS==='function')window.renderDiaShop=function(){oRDS.apply(this,arguments);try{var el=document.getElementById('diaShopList');if(el&&!document.getElementById('kamShopRow')){var d=document.createElement('div');d.id='kamShopRow';d.style.cssText='border:2px solid #7a2a5a;border-radius:12px;padding:10px;margin-top:10px;background:#1a0a14;text-align:center';d.innerHTML='<div style="color:#ff6fb0;font-weight:700;margin-bottom:6px">🛒 Mystische Items &amp; Sets (Münzen)</div><button class="btn btn-sm" onclick="__kamShop()">Zum Item-Shop</button>';el.appendChild(d)}}catch(e){}};
})();
