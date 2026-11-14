/* Begleiter: fliegende Helfer aus dem Shop. Eigene Datei, haengt sich in Kampf und Menue ein. */
(function(){
var CP=[
 {id:'fee',n:'Fee',sk:'Feenraub',ds:'Heilt die Gruppe jede Runde. Magieschaden +5 / 15 / 20 %.',pr:100,col:'#9dffb5'},
 {id:'dae',n:'Dämon',sk:'Feuerball',ds:'Feuerball auf einen Gegner, ab Form 2 auf alle Gegner.',pr:100,col:'#ff8a3a'},
 {id:'bot',n:'Flugmaschine',sk:'Blitzschlag',ds:'Schießt mit, Chance auf Doppelschaden. 15 % Ausweichen für die Gruppe.',pr:100,col:'#6fd0ff'},
 {id:'hex',n:'Hexe',sk:'Giftklinge',ds:'Vergiftet Gegner: mehrere Schläge hintereinander.',pr:150,col:'#8dff3a'},
 {id:'eis',n:'Eisvogel',sk:'Eiswand',ds:'Gegner werden langsamer und setzen öfter aus.',pr:150,col:'#a8e6ff'}
];
var TN=['Normal','Grün','Blau','Lila','Legendär'],TC=['#aaaaaa','#44cc44','#4488ff','#cc44ff','#ff8800'],OR=['blau','blau','lila','orange'],ORN={blau:'blaue',lila:'lila',orange:'orange'};
function sc(o){return 500+150*((o.t-1)*5+o.s)}
function C(id){return CP.filter(function(c){return c.id===id})[0]}
function inv(){try{return typeof inventory!=='undefined'?inventory:null}catch(e){return null}}
function form(t){return t<=2?1:t<=4?2:3}
function st(){var i=inv();if(!i)return {own:{},act:null,bub:0};i.comp=i.comp||{own:{},act:null};i.comp.own=i.comp.own||{};if(i.comp.bub==null)i.comp.bub=0;for(var k in i.comp.own){var o=i.comp.own[k];if(o.t==null){o.t=Math.max(1,Math.min(5,o.f||1));o.s=Math.min(5,o.s||0)}o.f=form(o.t)}return i.comp}
function sv(){try{saveInventory()}catch(e){}}
function pw(id){var o=st().own[id];return o?((o.t-1)*5+o.s)*0.5:0}
function hl(){var m=0;try{for(var h in heroData)m=Math.max(m,getHeroLevel(h))}catch(e){}return window.__hl!=null?window.__hl:m}
var NEEDHL=60;
function act(){if(hl()<NEEDHL)return null;var s=st();return s.act&&s.own[s.act]?s.act:null}
function dias(){try{return globalDiamonds}catch(e){return 0}}
function setDias(v){try{globalDiamonds=v;if(meta)meta.diamonds=v;saveDiamonds(v)}catch(e){}}
function gold(){try{return meta.gold}catch(e){return 0}}
function setGold(v){try{meta.gold=v;localStorage.setItem('robGold',String(v))}catch(e){}}
function say(t,c){try{showDmgPopup(t,c||'#fff')}catch(e){}}
/* ---- Anzeige im Kampf ---- */
var T=0,busy=false;
function img(id,r,f){var o=st().own[id];return 'comp/'+id+'_'+(o?o.f:1)+'_'+f+'.webp'}
function show(){
  var w=document.getElementById('sceneWrap'),a=act(),on=a&&typeof inFight!=='undefined'&&inFight&&monstersInFight&&monstersInFight.length,b=document.getElementById('kamComp');
  if(!w||!on){if(b)b.remove();return}
  if(!b||b.dataset.a!==a+st().own[a].f){if(b)b.remove();b=document.createElement('img');b.id='kamComp';b.dataset.a=a+st().own[a].f;b.alt='';w.appendChild(b)}
  if(!busy)b.src=img(a,0,T%2?'i1':'i0')
}
setInterval(function(){T++;try{show()}catch(e){}},480);
function atkAnim(col){var b=document.getElementById('kamComp'),a=act();if(!b||!a)return;busy=true;b.src=img(a,0,'at');setTimeout(function(){busy=false},520)}
var css=document.createElement('style');css.textContent='#kamComp{position:absolute;left:6px;top:18px;width:86px;z-index:7;pointer-events:none;filter:drop-shadow(0 4px 6px #000a);animation:kcb 1.6s ease-in-out infinite alternate}@keyframes kcb{from{transform:translateY(0)}to{transform:translateY(-8px)}}'+
 '#kamCmp{position:fixed;inset:0;z-index:100002;background:#000c;display:none;align-items:flex-end;justify-content:center;font-family:inherit}#kamCmp .sh{width:min(100%,440px);background:#160e28;border:2px solid #5a3f8a;border-radius:18px 18px 0 0;padding:14px 16px 18px;max-height:86vh;overflow:auto;color:#ffe9c4}#kamCmp h2{margin:0 0 4px;color:#f0c040;font-size:16px;text-align:center;letter-spacing:2px}'+
 '#kamCmp .c{display:flex;gap:10px;border:2px solid #5a3f8a;border-radius:14px;background:#0006;padding:8px;margin-top:8px}#kamCmp .c.on{border-color:#f0c040;box-shadow:0 0 12px #f0c04066}#kamCmp .c img{width:78px;height:70px;object-fit:contain;flex:none}#kamCmp .c.lk img{filter:grayscale(1) brightness(.6)}#kamCmp .i{flex:1;min-width:0;font-size:12px}#kamCmp .i b{color:#f0c040;font-size:14px}#kamCmp .i small{display:block;color:#9a8cc0;font-size:11px;margin:2px 0 4px}'+
 '#kamCmp .bar{height:7px;border-radius:5px;background:#0008;overflow:hidden;margin:3px 0}#kamCmp .bar i{display:block;height:100%;background:linear-gradient(90deg,#f0c040,#ff9a30)}#kamCmp .bt{display:inline-block;border:2px solid #f0c040;border-radius:10px;padding:5px 10px;color:#f0c040;font-size:12px;cursor:pointer;margin:3px 4px 0 0}#kamCmp .bt.off{opacity:.45;cursor:default}';
css.textContent+='body.dev-tablet #kamCmp{align-items:center}body.dev-tablet #kamCmp .sh{width:min(96%,1200px);border-radius:18px;max-height:92vh;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px;align-content:start}body.dev-tablet #kamCmp .sh>h2,body.dev-tablet #kamCmp .sh>div:nth-child(2){grid-column:1/-1}';
document.head.appendChild(css);
var cb=document.createElement('style');cb.textContent='.bub{display:inline-block;width:11px;height:11px;border-radius:50%;border:1.5px solid #bfe8ff;background:rgba(160,220,255,.25);vertical-align:-1px;margin-right:2px}#kamCmp .c{border-width:3px}';document.head.appendChild(cb);
function stars(o){var r='';for(var i=0;i<5;i++)r+=i<o.s?'★':'☆';return r}
function bubI(){return '<span class="bub"></span>'}
function orbs(){try{return inventory.orbs||{}}catch(e){return {}}}
function draw(){
  var m=document.getElementById('kamCmp');if(!m){m=document.createElement('div');m.id='kamCmp';m.onclick=function(e){if(e.target.id==='kamCmp')m.style.display='none'};document.body.appendChild(m)}
  var s=st(),ob=orbs(),h='<div class="sh"><h2>🐾 BEGLEITER</h2><div style="text-align:center;font-size:11px;color:#9a8cc0;margin-bottom:4px">'+bubI()+bubI()+bubI()+' Zauberblasen: <b style="color:#bfe8ff">'+s.bub+'</b> · Kugeln: blau '+(ob.blau||0)+', lila '+(ob.lila||0)+', orange '+(ob.orange||0)+' · 💎 '+dias()+'</div><div style="text-align:center;font-size:10px;color:#9a8cc0;margin-bottom:2px">Blasen fallen nach Siegen, solange ein Begleiter dabei ist.</div>';
  CP.forEach(function(c){
    var o=s.own[c.id],on=s.act===c.id,col=o?TC[o.t-1]:'#5a3f8a';
    h+='<div class="c'+(on?' on':'')+(o?'':' lk')+'" style="border-color:'+col+'"><img src="comp/'+c.id+'_'+(o?o.f:1)+'_i0.webp"><div class="i"><b>'+c.n+'</b>'+(o?' · Stufe '+o.t+' · <span style="color:'+col+'">'+TN[o.t-1]+'</span><div style="color:#ffd24a;letter-spacing:2px;font-size:14px">'+stars(o)+'</div>':'')+'<small>'+c.sk+': '+c.ds+'</small>';
    if(!o)h+='<div class="bt'+(dias()>=c.pr?'':' off')+'" onclick="__kamCmpBuy(\''+c.id+'\')">💎 Kaufen '+c.pr+'</div>';
    else{
      if(o.s<5){var cs=sc(o);h+='<div class="bt'+(s.bub>=cs?'':' off')+'" onclick="__kamCmpUp(\''+c.id+'\')">Aufleveln · '+cs+' '+bubI()+'</div>'}
      else if(o.t<5){var k=OR[o.t-1];h+='<div class="bt'+((ob[k]||0)>=1?'':' off')+'" onclick="__kamCmpTier(\''+c.id+'\')">⬆ Zu '+TN[o.t]+' · 1 '+ORN[k]+' Kugel</div>'}
      else h+='<small>Maximale Stufe</small>';
      if(!on)h+='<div class="bt" onclick="__kamCmpAct(\''+c.id+'\')">Einsetzen</div>';else h+='<div class="bt off">Aktiv</div>'}
    h+='</div></div>'});
  m.innerHTML=h+'</div>';
}
window.__kamCmp=function(){if(hl()<NEEDHL){try{toast('🐾 Begleiter gibt es ab Heldenlevel '+NEEDHL+'.')}catch(e){}return}draw();document.getElementById('kamCmp').style.display='flex'};
window.__kamCmpBuy=function(id){var c=C(id),s=st();if(s.own[id]||dias()<c.pr)return;setDias(dias()-c.pr);s.own[id]={f:1,s:0,x:0};if(!s.act)s.act=id;sv();draw()};
window.__kamCmpAct=function(id){var s=st();if(s.own[id]){s.act=id;sv();draw()}};
window.__kamCmpUp=function(id){var s=st(),o=s.own[id];if(!o||o.s>=5)return;var c=sc(o);if(s.bub<c)return;s.bub-=c;o.s++;sv();draw()};
window.__kamCmpTier=function(id){var s=st(),o=s.own[id];if(!o||o.s<5||o.t>=5)return;var k=OR[o.t-1],ob=orbs();if((ob[k]||0)<1)return;ob[k]--;o.t++;o.s=0;o.f=form(o.t);say('✨ '+C(id).n+': '+TN[o.t-1],TC[o.t-1]);sv();draw()};
/* ---- Menue-Knopf ---- */
setInterval(function(){var q=document.getElementById('kamQuick');if(q&&!document.getElementById('kamCmpBtn')){var b=document.createElement('button');b.id='kamCmpBtn';b.className='btn btn-sm';b.textContent=hl()<NEEDHL?'🔒 BEGLEITER (ab Heldenlv. '+NEEDHL+')':'🐾 BEGLEITER';b.onclick=function(){try{document.getElementById('kamProf')&&0}catch(e){}window.__kamCmp()};q.appendChild(b)}},900);
/* ---- Zauberblasen: nach Siegen mit aktivem Begleiter (ab Heldenlevel 60) ---- */
var was=false,bossSeen=false;
setInterval(function(){var f=false;try{f=!!inFight}catch(e){}
  if(f){try{if(monstersInFight&&monstersInFight.some(function(m){return m&&m.isBoss}))bossSeen=true}catch(e){}}
  if(was&&!f){var a=act();try{if(a&&meta.hp>0){var n=bossSeen?30:1+Math.floor(Math.random()*5),s=st();s.bub+=n;say('+'+n+' Blasen','#bfe8ff');try{log('<span style="color:#bfe8ff">+'+n+' Zauberblasen</span>')}catch(e){}sv()}}catch(e){}bossSeen=false}
  if(!f&&!was)bossSeen=false;
  was=f},400);
/* ---- Wirkung im Kampf: vor jedem Heldenangriff ---- */
function dmgAll(d,all){var L=monstersInFight||[];L.forEach(function(m,i){if(i>0&&!all)return;if(!m)return;m.hp=Math.max(1,m.hp-d)})}
var oAtk=window.attack;
if(typeof oAtk==='function')window.attack=function(){
  try{var a=act();if(a&&monstersInFight&&monstersInFight.length&&meta.hp>0){
    var o=st().own[a],p=pw(a),A=meta.attack;
    if(a==='fee'){var h=Math.max(1,Math.round(meta.maxHp*(.02+.006*p)));meta.hp=Math.min(meta.maxHp,meta.hp+h);say('+'+h+' ❤ Fee','#9dffb5');atkAnim()}
    if(a==='dae'){var d=Math.max(1,Math.round(A*(.5+.1*p)));dmgAll(d,o.f>=2);say('🔥 -'+d,'#ff8a3a');atkAnim()}
    if(a==='bot'&&Math.random()*100<15+3*p){var d2=Math.max(1,Math.round(A*.8));dmgAll(d2,false);say('⚡ -'+d2,'#6fd0ff');atkAnim()}
    if(a==='hex'){monstersInFight.forEach(function(m){if(m.__psn&&m.__psn.t>0){var d3=m.__psn.d;m.hp=Math.max(1,m.hp-d3);m.__psn.t--}});
      var t0=monstersInFight[0];if(!(t0.__psn&&t0.__psn.t>0)){t0.__psn={t:3+Math.floor(p/3),d:Math.max(1,Math.round(A*(.25+.05*p)))};atkAnim()}say('☠ Gift','#8dff3a')}
    if(a==='eis'){atkAnim()}
  }}catch(e){}
  return oAtk.apply(this,arguments)};
/* ---- Gegnerangriff: Flugmaschine weicht aus, Eisvogel bremst ---- */
var oMH=window.__kamMonHit;
window.__kamMonHit=function(m,md){
  try{var a=act(),p=a?pw(a):0;
    if(a==='bot'&&Math.random()<.15){say('💨 Ausgewichen','#6fd0ff');return 0}
    if(a==='eis'&&Math.random()*100<18+3*p){say('❄ Eiswand','#a8e6ff');return 0}
  }catch(e){}
  return oMH?oMH(m,md):md};
/* Fee: Magieschaden +5/15/20 % */
var oAB=window.__kamAllyBonus;
window.__kamAllyBonus=function(w){var b=oAB?oAB(w):0;try{if(act()==='fee'&&w==='mag'){var f=st().own.fee.f;b+=Math.round(meta.attack*.4*[.05,.15,.2][f-1])}}catch(e){}return b};
})();
