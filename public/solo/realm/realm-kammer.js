/* Kammer-Laufbrett fuer Realm of Brain.
   Ersetzt das 25-Felder-Band: Wuerfeln, Zielfeld waehlen (nur hoch/links/rechts), nur das Zielfeld loest aus.
   Kampf, Shop, Tod, Klassen laufen weiter ueber game.js. */
(function(){
'use strict';
var COLS=5,CM=2,TS=54,GAP=6,STEP=TS+GAP,ETG=10,ROWS=ETG*10,FACES='⚀⚁⚂⚃⚄⚅';
var $=function(i){return document.getElementById(i)};
var K=null,busy=false,fightBoss=false,bossWon=false;window.__K=function(){return K};
var THEMES=[
 {n:'Gefängniskammer',a:'#c9b79a',bg:'#0f0d12',t:'#2a2530',w:'#1b1720'},
 {n:'Feuerkammer',a:'#ff6a1a',bg:'#1a0707',t:'#3a1208',w:'#2a0c07'},
 {n:'Eiskammer',a:'#5ad2ff',bg:'#07131a',t:'#12303d',w:'#0c2029'},
 {n:'Giftkammer',a:'#7bd23a',bg:'#0b1607',t:'#1c3010',w:'#13220b'},
 {n:'Wasserkammer',a:'#3a7bff',bg:'#06101f',t:'#10284a',w:'#0b1c36'},
 {n:'Blitzkammer',a:'#e8d23a',bg:'#171505',t:'#3a3410',w:'#262208'},
 {n:'Erdkammer',a:'#b9824a',bg:'#160e07',t:'#3a2410',w:'#26180b'},
 {n:'Skelettkammer',a:'#b06bff',bg:'#120a1c',t:'#2a1a40',w:'#1c1030'}];
/* Kammer 1 normal; Kammer k+1 zeigt den Boss, der Kammer k beendet hat (7=Feuer,8=Gift,9=Blitz,10=Skelett) */
var TMAP=[0,1,2,3,4,5,6,1,3,5,7];
function theme(k){return THEMES[k<=1?0:TMAP[Math.min(k-1,TMAP.length-1)]||TMAP[((k-2)%10)+1]]}
function avail(R){var a=[];if(R<=10)a.push('frog');if(R>=6&&R<=15)a.push('gobold');if(R>=11&&R<=20)a.push('wolf');if(R>=21&&R<=30)a.push('bear');if(R>=25&&R<=35)a.push('golem');if(R>=31&&R<=40)a.push('snake');if(R>=41&&R<=50)a.push('spider');if(R>=51&&R<=60)a.push('freggz');if(R>=61&&R<=70)a.push('hexe');if(R>=71&&R<=80)a.push('snowman');if(R>=81)a.push('inferno');if(!a.length)a.push('frog');return a}
function reg(r,e){(K.rows[r]=K.rows[r]||[]).push(e)}
function updateVis(){var c=K.cur.r,lo=Math.max(0,c-5),hi=c+14;if(K.lo===lo&&K.hi===hi)return;for(var r=0;r<=ROWS+1;r++){var v=r>=lo&&r<=hi;if(K.vr[r]===v)continue;K.vr[r]=v;(K.rows[r]||[]).forEach(function(e){e.style.display=v?'':'none'})}K.lo=lo;K.hi=hi}
var MAIN=['frog','gobold','wolf','bear','golem','snake','spider','freggz','hexe','snowman','inferno'];
function mainOf(k){return MAIN[Math.min(k-1,MAIN.length-1)]}
function pool(k){return MAIN.slice(0,Math.min(k,MAIN.length))}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
/* Monster-Animationen (Bildsätze): Stehen i0/i1, Angriff a0-a2, Treffer h */
var AF={},ANIMT=['bear','wolf','gobold','snake','worldboss_1','worldboss_2','worldboss_3','worldboss_4','worldboss_5','worldboss_6','worldboss_10'],mlock=0,midle=0;
ANIMT.forEach(function(t){['i0','i1','a0','a1','a2','h'].forEach(function(k){var im=new Image();im.src='mon/'+t+'_'+k+'.webp';AF[t+k]=im.src})});
function ak(a){var pm=/^worldboss_([789])(b?)$/.exec(a||'');if(pm)return 'worldboss_'+(((+pm[1]-7)*2+1)+(pm[2]?1:0));var m=/^worldboss_(\d+)$/.exec(a||'');return m?([4,5,6,10].indexOf(+m[1])>=0?'worldboss_'+m[1]:'worldboss_'+(((+m[1]-1)%3)+1)):a}
function mimgs(){return [].slice.call(document.querySelectorAll('#battleScene .monster-slot img')).filter(function(i){return ANIMT.indexOf(ak(i.getAttribute('alt')))>=0})}
function mset(k,only){mimgs().forEach(function(i,n){if(only!==undefined&&n!==only)return;i.src=AF[ak(i.getAttribute('alt'))+k]})}
function prepAnim(){mimgs().forEach(function(i){i.classList.add('kanim');i.src=AF[ak(i.getAttribute('alt'))+'i0']})}
setInterval(function(){if(mlock)return;midle=1-midle;mset('i'+midle)},420);
window.__kamMonAtk=function(){monAtk()};
function monHurt(){mlock=1;mset('h',0);setTimeout(function(){mlock=0},380)}
function snakeSpit(){try{var w=$('sceneWrap'),sl=[].slice.call(document.querySelectorAll('#battleScene .monster-slot')).filter(function(x){var i=x.querySelector('img');return i&&i.getAttribute('alt')==='snake'})[0],hr=$('runImg');if(!w||!sl||!hr)return;var wr=w.getBoundingClientRect(),mr=sl.getBoundingClientRect(),hb=hr.getBoundingClientRect();var smi=sl.querySelector('img').getBoundingClientRect();var x0=smi.left-wr.left+smi.width*.12,y0=smi.top-wr.top+smi.height*.54,x1=hb.left-wr.left+hb.width*.55,y1=y0;var p=document.createElement('div');p.className='kpj stream';p.style.left=x0+'px';p.style.top=y0+'px';w.appendChild(p);p.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate('+(x1-x0-30)+'px,0)',opacity:1}],{duration:330,easing:'ease-in'}).onfinish=function(){p.remove();var q=document.createElement('div');q.className='kpj splash';q.style.left=x1+'px';q.style.top=y1+'px';w.appendChild(q);q.animate([{transform:'scale(.5)',opacity:1},{transform:'scale(1.25)',opacity:0}],{duration:420}).onfinish=function(){q.remove()}}}catch(e){}}
function dragonSpit(){try{var w=$('sceneWrap');if(!w)return;var wr=w.getBoundingClientRect(),hr=$('runImg'),hb=hr?hr.getBoundingClientRect():null;
 [].slice.call(document.querySelectorAll('#battleScene .monster-slot img')).forEach(function(im,ix){var a=im.getAttribute('alt')||'',k=ak(a);if(!/^worldboss_/.test(k))return;
  var fw=document.body.classList.contains('kamn2')?85:150,r=im.getBoundingClientRect(),x0=r.left-wr.left+r.width*.08,y0=r.top-wr.top+r.height*.46,x1=(hb&&hb.width>0)?hb.left-wr.left+hb.width*.6:wr.width*.18;
  var fx=document.createElement('img');fx.src='mon/'+k+'_fx.webp';fx.style.cssText='position:absolute;z-index:40;pointer-events:none;width:'+fw+'px;height:auto;left:'+(x0-fw)+'px;top:'+(y0-fw*.3)+'px;transform-origin:100% 50%;transform:scaleX(-1)';w.appendChild(fx);
  var dx=Math.min(0,x1-x0+60);fx.animate([{transform:'translate(0,0) scaleX(-.25) scaleY(.5)',opacity:.2,offset:0},{transform:'translate('+(dx*.4)+'px,0) scaleX(-1) scaleY(1)',opacity:1,offset:.35},{transform:'translate('+dx+'px,0) scaleX(-1.1) scaleY(1.1)',opacity:0,offset:1}],{duration:560,easing:'ease-out'}).onfinish=function(){fx.remove()}})}catch(e){}}
function monAtk(){mlock=1;mset('a0');setTimeout(dragonSpit,200);setTimeout(snakeSpit,260);setTimeout(function(){mset('a1')},130);setTimeout(function(){mset('a2')},260);setTimeout(function(){mlock=0;mset('i0')},700)}
function key(r,c){return r+','+c}
function px(c){return (c-CM)*STEP-TS/2}
function drag(k){return 'dragon'+(((k-1)%3)+1)}
function baseRound(){return (K.k-1)*10}

var dcss=document.createElement('style');dcss.textContent='#overlayMsg.kshop #kamOpenBtn,#overlayMsg.kshop h2,#overlayMsg.kshop #overlayText{display:none!important}#kShopBack{display:none;margin-top:10px}#overlayMsg.kshop #kShopBack{display:block}'+
'#kamLow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}#kamLow #kamInv{margin:0;flex:1 1 auto;justify-content:center}#kamLow #kamPf{position:relative!important;right:auto!important;bottom:auto!important;flex:none;z-index:2}'+
'#autoRunBtn{width:60px!important;min-width:60px!important;height:52px!important;padding:0!important;margin:0!important;font-size:0!important;line-height:0!important;border-radius:10px!important;flex:none!important;display:flex!important;align-items:center;justify-content:center;background:#1c1c1c!important;border:2px solid #555!important;box-shadow:none!important;letter-spacing:0!important;filter:none!important}'+
'#autoRunBtn::after{content:"⚡";font-size:1.5rem;line-height:1;color:#777}'+
'#autoRunBtn.btn-disabled{opacity:.45}'+
'#autoRunBtn:not(.btn-disabled):not(.kon){opacity:1;border-color:#888!important}#autoRunBtn:not(.btn-disabled):not(.kon)::after{color:#bbb}'+
'#autoRunBtn.kon{background:linear-gradient(#ff9a1a,#c24a00)!important;border-color:#ffd24a!important;box-shadow:0 0 16px #ffb02ecc!important;animation:kglow 1.3s ease-in-out infinite}#autoRunBtn.kon::after{color:#fff;text-shadow:0 0 8px #fff}@keyframes kglow{50%{box-shadow:0 0 26px #ffd24a}}'+
'#kamAsk{position:absolute;left:10px;right:10px;top:38%;z-index:30;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px;border-radius:14px;background:#120707f5;border:2px solid #ffd24a;color:#ffe9c4;text-align:center;font-size:.8rem}#kamAsk b{font-size:1.1rem;color:#ffd24a}#kamAsk div{display:flex;gap:8px;width:100%}#kamAsk button{flex:1;padding:10px 4px;border-radius:10px;border:1px solid #ffd24a;background:linear-gradient(#a02800,#6a1500);color:#fff;font-weight:800;font-size:.72rem;cursor:pointer}#kamAsk .ke{background:#2a1a12}'+

'#kamDiceShop .md{flex:none!important;min-width:0!important;max-width:none!important;margin:0!important}#kamDiceShop .md i{width:auto!important;height:auto!important;min-height:0!important;padding:0!important;border:0!important}#kamDiceShop .md i.p{width:70%!important;height:70%!important}'+
'.md{display:inline-grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);box-sizing:border-box;border-radius:22%;box-shadow:inset 0 2px 0 #fff5,inset 0 -4px 6px #0008,0 3px 6px #000a;vertical-align:middle}'+
'.md i{display:block;border-radius:50%;margin:auto}.md i.p{width:70%;height:70%;background:#fff;box-shadow:inset 0 -1px 2px #0006}'+
'#kamInv{display:flex;gap:8px;align-items:center;justify-content:center;margin:6px 0;min-height:52px}'+
'#kamInv .sl{display:flex;flex-direction:column;align-items:center;gap:2px;width:60px;padding:5px 2px;border-radius:10px;border:2px solid #ffffff22;background:#0007;color:#ffe9c4;font-size:.5rem;cursor:pointer}'+
'#kamInv .sl.on{border-color:#ffd24a;box-shadow:0 0 12px #ffd24a99;transform:translateY(-3px)}#kamInv .sl.em{height:52px;border-style:dashed;cursor:default;opacity:.35}'+
'#kamInv{flex-wrap:wrap}#kamInv .eqd{display:flex;align-items:center;justify-content:center;gap:5px;flex-basis:100%;font-size:.6rem;color:#ffd24a}'+
'.tile.die .md{margin:auto;display:grid}.tile.die{display:flex;flex-direction:column;align-items:center;justify-content:center}'+
'.ktoast{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 26px;border-radius:16px;background:#120707f2;border:2px solid #ffd24a;box-shadow:0 0 40px #ffd24a88;color:#ffe9c4;text-align:center;animation:ktin .4s ease-out}.ktoast div{font-size:.75rem;letter-spacing:2px;color:#ffd24a}.ktoast b{font-size:1rem}.ktoast small{font-size:.65rem;color:#c9b79c}@keyframes ktin{from{opacity:0;transform:translateX(-50%) scale(.6)}}#kamDiceShop .di.lk{opacity:.45;cursor:default}'+
'#kamDiceShop .ds{display:flex;flex-direction:column;gap:6px;margin-top:8px}'+
'#kamDiceShop .di{display:flex;align-items:center;gap:10px;padding:7px 9px;border-radius:10px;background:#0006;border:1px solid #ffffff22;cursor:pointer;text-align:left}'+
'#kamDiceShop .di.eq{border-color:#ffd24a;background:#3a2a0a99}#kamDiceShop .di .t{flex:1;display:flex;flex-direction:column}#kamDiceShop .di b{font-size:.72rem;color:#ffe9c4}#kamDiceShop .di small{font-size:.58rem;color:#c9b79c}#kamDiceShop .pr{font-size:.68rem;color:#ffd24a;white-space:nowrap}';
document.head.appendChild(dcss);
/* ---------- Style ---------- */
var css=document.createElement('style');css.textContent=
'#gameWrapper{max-width:520px!important;display:flex!important;flex-direction:column}'+
'#gameWrapper>.game-col{display:contents!important}'+
'#logPanel,#chatPanel,#boardPanel,#statusPanel,#battlePanel .panel-title{display:none!important}'+
'#autoRunBtn{order:0!important}'+
'#battlePanel{padding:8px!important}'+
'#kam{--a:#ff6a1a;--bg:#1a0707;--t:#3a1208;--w:#2a0c07;position:relative;height:min(62vh,520px);min-height:380px;border-radius:12px;overflow:hidden;background:var(--bg);border:2px solid var(--a);box-shadow:0 0 22px color-mix(in srgb,var(--a) 40%,transparent);perspective:1100px;perspective-origin:50% 85%}'+
'#kam canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'+
'#kamWorld{position:absolute;left:50%;bottom:62px;width:0;height:0;transition:transform .28s linear;will-change:transform;transform-style:preserve-3d}'+
'#kamHud{position:absolute;left:0;right:0;top:0;z-index:6;display:flex;gap:8px;align-items:center;padding:7px 10px;background:linear-gradient(#000f 60%,#000c);font-size:.78rem;color:#ffe9c4;font-weight:700}'+
'#kamHud .hb{flex:1;height:10px;border-radius:6px;background:#0008;border:1px solid #fff3;overflow:hidden}#kamHud .hb i{display:block;height:100%;background:linear-gradient(90deg,#d22,#f66);width:100%;transition:width .3s}'+
'#kamHud .bx{margin-left:auto;text-align:right;font-size:.7rem;color:var(--a)}'+
'#kamBoss{position:absolute;left:0;right:0;top:34px;z-index:6;padding:3px 10px 5px;background:#000a;font-size:.66rem;color:#ffe9c4;text-align:center;letter-spacing:1px}'+
'#kamBoss .bb{height:6px;border-radius:4px;background:#0008;margin-top:3px;overflow:hidden}#kamBoss .bb i{display:block;height:100%;background:var(--a);width:0;transition:width .3s}'+
'#kam .tile{position:absolute;width:'+TS+'px;height:'+TS+'px;border-radius:10px;background:var(--t);border:2px solid color-mix(in srgb,var(--a) 45%,#000);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;overflow:visible}'+
'#kam .tile.empty,#kam .tile.start,#kam .tile.gold,#kam .tile.bed,#kam .tile.camp,#kam .tile.die{background:linear-gradient(#0001,#0003),url(dung/floor.webp) center/cover,var(--t);background-blend-mode:multiply,normal,normal;box-shadow:none;filter:brightness(calc(var(--b,1) * 1.4)) saturate(1.3) hue-rotate(14deg)}'+
'#kam .wall,#kam .blk{background:linear-gradient(#0002,#0004),url(dung/brick.webp) 0 0/46px 33px,var(--w)!important;border:1px solid #0008!important;border-radius:6px!important;box-shadow:none;filter:brightness(1.5) saturate(1.2) hue-rotate(18deg)}'+
'#kam .glow{position:absolute;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;background:radial-gradient(circle,#ff9a3a66 0%,#ff6a1a22 40%,#0000 70%);mix-blend-mode:screen;pointer-events:none}'+

'#kamBoss{display:none!important}'+
'#kamBoss{display:none!important}'+
'#kam .torch{position:absolute;width:30px;height:46px;background:url(dung/torch.png) center/contain no-repeat;transform:rotateX(-30deg);transform-origin:50% 100%;pointer-events:none;filter:drop-shadow(0 0 8px #f90)}'+
'#kam .tile img{width:100%;height:100%;object-fit:cover;border-radius:8px;display:block}'+
'#kam .tile small{position:absolute;bottom:-1px;left:0;right:0;text-align:center;font-size:9px;font-weight:800;background:#000a;border-radius:0 0 8px 8px;color:#ffe9c4;line-height:13px}'+
'#kam .tile.monster{border-color:#e14}#kam .tile.coin{border-color:#f0c040}#kam .tile.bed{border-color:#4c8}#kam .tile.camp{border-color:#ff9a3a;box-shadow:0 0 14px #ff8a2a99!important}#kam .tile.boss{border-color:#f40;border-width:3px;box-shadow:0 0 24px #f408}'+
'#kam .tile.used{opacity:.35;filter:grayscale(.7)}'+
'@keyframes kd{from{transform:scale(1)}to{transform:scale(1.1)}}'+
'#kam .wall,#kam .blk{position:absolute;background:var(--w);border:1px solid #0006;border-radius:6px}'+
'#kam .wall{width:26px}#kam .blk{width:'+TS+'px;height:'+TS+'px;background:repeating-linear-gradient(45deg,var(--w),var(--w) 6px,#0005 6px,#0005 12px)}'+
'#kam .band{position:absolute;left:-200px;width:400px;height:0;border-top:2px dashed color-mix(in srgb,var(--a) 70%,transparent);z-index:1}'+
'#kam .band b{position:absolute;left:50%;transform:translate(-50%,-50%);background:var(--bg);padding:0 8px;font-size:10px;letter-spacing:2px;color:var(--a)}'+
'#kamHero{position:absolute;width:'+TS+'px;height:'+TS+'px;z-index:5;transition:left .22s linear,bottom .22s linear;pointer-events:none;transform-style:preserve-3d}'+
'#kamHero .sh{position:absolute;left:6px;right:6px;bottom:4px;height:16px;border-radius:50%;background:#000a;filter:blur(3px)}'+
'#kamHero .up{position:absolute;left:-12px;bottom:-1px;width:78px;transform:rotateX(-30deg);transform-origin:50% 100%;transform-style:flat}'+
'#kamHero img{width:100%;display:block;}'+
'#kamHero.hop .up{animation:khop .22s}@keyframes khop{50%{margin-bottom:12px}}'+
'#kam .tile img.sp{position:absolute;left:3px;bottom:12px;width:48px;height:42px;border-radius:8px;border:2px solid #e14;}'+
'#kam .tile.boss img.sp{border-color:#f40}'+
'#kamMsg{position:absolute;left:8px;right:8px;bottom:8px;z-index:7;background:#000b;border:1px solid #fff3;border-radius:10px;padding:7px 10px;font-size:.78rem;color:#ffe9c4;text-align:center}'+
'#kam .fl{position:absolute;z-index:8;font-weight:900;font-size:18px;text-shadow:0 2px 4px #000;animation:kfl 1.1s forwards;pointer-events:none}@keyframes kfl{to{transform:translateY(-44px);opacity:0}}'+
/* Kampffeld nur im Kampf, ueber dem Brett */
'#sceneWrap{display:none!important}#gameWrapper>.game-title{order:-10!important}'+
'body.kamfight #sceneWrap{display:flex!important;flex-direction:column;position:absolute;left:8px;right:8px;top:8px;bottom:8px;z-index:30;margin:0}body.kamfight #sceneWrap #battleScene{flex:1}'+
'#kam .tile.gold{background:none!important;filter:none!important;isolation:isolate}#kam .tile.gold::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background:linear-gradient(#0001,#0003),url(dung/floor.webp) center/cover,var(--t);filter:brightness(1.4) saturate(1.3) hue-rotate(14deg)}'+
'body.kamfight #battleBg{background:url(dung/door.webp) calc(50% - 30px) top/auto 92% no-repeat,linear-gradient(#1a1030,#0d0714)!important;opacity:1!important;border-radius:10px}'+
'#battlePanel{position:relative}'+
'#kamBar{display:flex;gap:10px;align-items:center;order:-1;position:relative;z-index:12}#kamBar #actionBtn{flex:1;order:0!important}'+
'#kamDieBox{width:62px;height:62px;flex:none;perspective:260px;position:relative}'+
'#kamDieBox.toss{animation:ktoss .95s ease-out;z-index:20}@keyframes ktoss{0%{transform:translateY(0)}35%{transform:translateY(-120px) scale(1.5)}60%{transform:translateY(-40px) scale(1.25)}78%{transform:translateY(-70px) scale(1.3)}100%{transform:translateY(0) scale(1)}}'+
'#kamCube{position:absolute;left:5px;top:5px;width:52px;height:52px;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.2,.8,.2,1)}'+
'#kamDieBox.kcol #kamCube .f{background:linear-gradient(145deg,var(--d0),var(--d1))!important;border-color:var(--d1)}#kamDieBox.kcol #kamCube .f i.p{background:radial-gradient(circle at 35% 30%,#fff,#ddd)!important}#kamDieBox.klock::after{content:"🔒";position:absolute;right:-2px;bottom:-4px;font-size:12px}#kamInv .eqb{background:#2a1a0a;border:1px solid #ffd24a;border-radius:8px;padding:5px 12px;cursor:pointer;font:700 .65rem Georgia,serif}'+
'#kamCube.spin{transition:none;animation:kspin .45s linear infinite}@keyframes kspin{to{transform:rotateX(360deg) rotateY(720deg)}}'+
'#kamCube .f{position:absolute;inset:0;border-radius:9px;background:linear-gradient(145deg,#fff,#d9d2c4);border:1px solid #8a7a5c;display:grid;grid-template:repeat(3,1fr)/repeat(3,1fr);padding:7px;backface-visibility:hidden;box-shadow:inset 0 0 8px #0003}'+
'#kamCube .f i{border-radius:50%;margin:1px}#kamCube .f i.p{background:radial-gradient(circle at 35% 30%,#e33,#800)}'+
'#kamCube .f1{transform:translateZ(26px)}#kamCube .f2{transform:rotateY(90deg) translateZ(26px)}#kamCube .f6{transform:rotateY(180deg) translateZ(26px)}#kamCube .f5{transform:rotateY(-90deg) translateZ(26px)}#kamCube .f3{transform:rotateX(90deg) translateZ(26px)}#kamCube .f4{transform:rotateX(-90deg) translateZ(26px)}'+

'#battleScene .monster-slot img.kdie{animation:kdie .8s ease-in forwards}@keyframes kdie{0%{transform:scaleX(-1) translateY(0);opacity:1;filter:brightness(1)}35%{transform:scaleX(-1) translateY(4px) rotate(3deg);filter:brightness(2.2)}100%{transform:scaleX(-1) translateY(34px) rotate(9deg);opacity:0;filter:brightness(.4)}}#battleScene .monster-slot img.kenter{animation:kenter .7s ease-out}@keyframes kenter{from{transform:scaleX(-1) translateX(-170px);opacity:0}to{transform:scaleX(-1) translateX(0);opacity:1}}'+
'#battleScene .monster-slot img.kanim[alt^="worldboss"]{width:230px!important;height:180px!important}#battleScene .monster-slot img.kanim[alt^="worldboss"]{transform:scaleX(-1)}body.kamn2 #battleScene .monster-slot img.kanim[alt^="worldboss"]{width:150px!important;height:140px!important}#battleScene .monster-slot img.kanim{object-fit:contain!important;border:none!important;background:none!important;box-shadow:none!important;border-radius:0!important;width:150px;height:150px;filter:drop-shadow(0 6px 5px #000a)}'+
'body.kamn2 #battleScene{gap:6px!important;padding-left:36%!important;padding-bottom:10px!important}body.kamn2 #battleScene .monster-slot img{width:104px!important;height:104px!important}'+
'body.kamn3 #battleScene{gap:0!important;padding-left:30%!important;padding-bottom:10px!important}body.kamn3 #battleScene .monster-slot img{width:86px!important;height:86px!important}body.kamn3 #battleScene .monster-name{font-size:.5rem!important}'+
'body.kamn2 #battleScene .monster-slot:nth-child(2),body.kamn3 #battleScene .monster-slot:nth-child(2),body.kamn3 #battleScene .monster-slot:nth-child(4){z-index:3}'+
'body.kamn2 #battleScene .monster-slot:nth-child(3){transform:translateY(-40px) scale(.86);z-index:2;opacity:.97}'+
'body.kamn3 #battleScene .monster-slot:nth-child(3){transform:translateY(-52px) scale(.84);z-index:2}'+
'#battleScene .monster-slot img.kanim:not([alt^="worldboss"]){background:radial-gradient(ellipse 46% 8% at 50% 95%,#000b,#0000 70%)!important}'+
/* Profil-Taste */
'#kamPf{position:fixed;right:14px;bottom:14px;z-index:70;width:64px;height:64px;border-radius:50%;border:3px solid var(--gold2);padding:0;overflow:hidden;background:#200;cursor:pointer;box-shadow:0 4px 16px #000c}'+
'#kamPf img{width:100%;height:100%;object-fit:cover}'+
'#kamPf span{position:absolute;bottom:0;left:0;right:0;background:#000b;color:var(--gold);font-size:9px;font-weight:800;letter-spacing:1px;text-align:center}'+
'#kamProf{position:fixed;inset:0;z-index:420;display:none;align-items:flex-start;justify-content:center;padding-top:34px!important;background:#000c;padding:14px}'+
'#kamProf.on{display:flex}#kamProf .box{width:100%;max-width:420px;max-height:92vh;overflow:auto}'+
'#kamProf .x{position:sticky;top:0;float:right;z-index:3;background:#600;color:#fff;border:1px solid var(--gold2);border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer}'+
'#kamProf #quickPanel{margin:10px 0 0}'+
'#menuBtn{display:none!important}'+
'#kamProf .tabs{display:flex;gap:6px;margin-bottom:8px;position:sticky;top:0;z-index:3;background:#0b0505}'+
'#kamProf .tabs button{flex:1;padding:9px 4px;border-radius:9px;border:1px solid #6b4a1f;background:#1a0a08;color:#e4d6c4;font-weight:800;font-size:.7rem;cursor:pointer}'+
'#kamProf .tabs button.on{background:linear-gradient(#a02800,#6a1500);border-color:#ffd24a;color:#fff}'+
'#kamProf .tabs .x{flex:none;float:none;position:static;width:44px;background:#600}'+
'#kamProf #menuPanel{position:static!important;min-width:0!important;margin:0!important;box-shadow:none!important;top:auto!important;left:auto!important;z-index:auto!important;width:auto!important}'+
'#kamProf #quickPanel{display:none!important}#kamProf[data-tab=p] #menuPanel,#kamProf[data-tab=p] #kamReset{display:none!important}'+
'#kamQuick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 4px}#kamQuick .btn{padding:14px 2px;font-size:.66rem;letter-spacing:0;line-height:1.25}#kamProf[data-tab=m] #kamQuick{display:none!important}'+
'#kamProf[data-tab=m] #statusPanel{display:none!important}'+

'#kamProf[data-tab=m] #menuPanel{display:block!important}';
document.head.appendChild(css);

/* ---------- Umbau der Seite ---------- */
function rebuildPage(){
  var bp=$('battlePanel'),qp=$('quickPanel'),ab=$('actionBtn');
  var k=document.createElement('div');k.id='kam';
  k.innerHTML='<canvas id="kamEm"></canvas><div id="kamHud"><span>❤ <b id="kHp">20</b></span><div class="hb"><i id="kHpB"></i></div><span>⚔ <b id="kAtk">5</b></span><span>💰 <b id="kGold">0</b></span><span class="bx" id="kEt"></span></div>'+
   '<div id="kamBoss"><span id="kBn"></span><div class="bb"><i id="kBb"></i></div></div><div id="kamWorld"><div id="kamHero"><div class="sh"></div><div class="up"><img id="kamHeroImg" alt="" src="hero/idle0.webp"></div></div></div><div id="kamMsg"></div>';
  bp.insertBefore(k,bp.firstChild);
  /* Menütasten unten, direkt unter dem Würfel-Knopf */
  /* Profil-Taste unten rechts */
  var pf=document.createElement('button');pf.id='kamPf';pf.innerHTML='<img id="kamPfImg" alt=""><span>PROFIL</span>';document.body.appendChild(pf);
  var pw=document.createElement('div');pw.id='kamProf';pw.innerHTML='<div class="box"><div class="tabs"><button data-t="p">⚔ PROFIL</button><button data-t="m">☰ MENÜ</button><button class="x">✕</button></div><div id="kamProfBody"></div></div>';document.body.appendChild(pw);
  var rs=document.createElement('button');rs.id='kamReset';rs.className='btn btn-wide';rs.textContent='🗑 FORTSCHRITT ZURÜCKSETZEN';rs.style.cssText='margin-top:10px;background:#300;border-color:#a33;font-size:.7rem';
  rs.onclick=function(){if(!rs.dataset.sure){rs.dataset.sure=1;rs.textContent='SICHER? NOCHMAL TIPPEN: ALLES AUF ANFANG';setTimeout(function(){delete rs.dataset.sure;rs.textContent='🗑 FORTSCHRITT ZURÜCKSETZEN'},4000);return}
    try{Object.keys(localStorage).forEach(function(k){if(/^rob/.test(k)&&['robPlayerName','robLastHero','robAvatar'].indexOf(k)<0)localStorage.removeItem(k)})}catch(e){}location.reload()};
  if(qp){$('kamProfBody').appendChild(qp)}
  var qk=document.createElement('div');qk.id='kamQuick';
  [['🎒 HELDENABTEIL','showInventory'],['⚒️ SCHMIEDE','__kForge'],['⭐ LEVEL','showLevels'],['💎 DIA-SHOP','__kDia'],['🏙️ STADT','showCity']].forEach(function(q){var bt=document.createElement('button');bt.className='btn btn-sm';bt.textContent=q[0];bt.onclick=function(){closeP();try{window[q[1]]()}catch(e){}};qk.appendChild(bt)});
  $('kamProfBody').appendChild(qk);
  var mp=$('menuPanel');if(mp){$('kamProfBody').appendChild(mp);mp.addEventListener('click',function(e){var bt=e.target.closest&&e.target.closest('button');if(bt)setTimeout(closeP,0)})}
  function openP(t){var sp=$('statusPanel'),b=$('kamProfBody');b.insertBefore(sp,b.firstChild);b.insertBefore($('kamQuick'),sp.nextSibling);b.appendChild(rs);pw.dataset.tab=t||'p';sp.style.setProperty('display',pw.dataset.tab==='p'?'block':'none','important');[].forEach.call(pw.querySelectorAll('.tabs button[data-t]'),function(x){x.classList.toggle('on',x.dataset.t===pw.dataset.tab)});pw.classList.add('on');syncFace()}
  pf.onclick=function(){openP('p')};
  [].forEach.call(pw.querySelectorAll('.tabs button[data-t]'),function(x){x.onclick=function(){openP(x.dataset.t)}});
  [].slice.call(document.querySelectorAll('#menuPanel button')).forEach(function(bt){var o=bt.getAttribute('onclick')||'';if(/showCity|showDiaShop|showInventory|showQuestModal|showLevelTable|showClassLevelTable|showLevels|doPrestige|showPrestigeLevelTable/.test(o))bt.remove()});
  var oOM=window.openMenu;window.openMenu=function(){try{oOM&&oOM.apply(this,arguments)}catch(e){}};
  window.toggleMenu=function(){if(pw.classList.contains('on'))closeP();else openP('m')};
  /* Shop jederzeit (Trank, Kraft, Würfel), nicht nur nach dem Tod */
  var ov=$('overlayMsg'),ob=$('overlayBox');
  var rb0=document.querySelector('#overlayBox button.btn-wide');if(rb0)rb0.id='kamOpenBtn';
  var sb=document.createElement('button');sb.id='kShopBack';sb.className='btn btn-wide';sb.textContent='← ZURÜCK';sb.onclick=function(){ov.style.display='none';ov.classList.remove('kshop');window.__kshop=0;try{updateUI()}catch(e){}};ob.appendChild(sb);
  window.__kDia=function(){
    var m=$('diaShopModal');if(!m)return;
    try{claimPendingDias()}catch(e){}
    var err='';try{renderDiaShop()}catch(e){err=String(e&&e.message||e)}
    if(err){var l=$('diaShopList');if(l)l.innerHTML='<div style="padding:14px;color:#f88;font-size:.8rem">Der Dia-Shop konnte nicht geladen werden: '+err+'</div>'}
    m.style.display='flex'};
  window.__kShop=function(){window.__kshop=1;ov.classList.add('kshop');
    try{$('overlayGold').textContent='💰 '+meta.gold+' Gold verfügbar';$('overlayDiamond').textContent='💎 '+meta.diamonds+' Diamanten';updateShopPricesUI();updateAutoRunUI();renderSkillShop()}catch(e){}
    ov.style.display='flex';dieShop()};
  window.closeMenu=function(){};
  function closeP(){pw.classList.remove('on');var sp=$('statusPanel');sp.style.removeProperty('display');var bp0=$('battlePanel');bp0.parentNode.insertBefore(sp,bp0)}
  pw.querySelector('.x').onclick=closeP;pw.onclick=function(e){if(e.target===pw)closeP()};
  /* Todes-Shop: Texte */
  var rb=document.querySelector('#overlayBox button.btn-wide');if(rb)rb.textContent='🚪 KAMMER ÖFFNEN';
    var h2=document.querySelector('#overlayBox h2');if(h2)h2.textContent='💀 BESIEGT';
  var s3=document.querySelector('#deathShopSection h3');if(s3)s3.textContent='⚔ SHOP';
  var ab2=$('actionBtn');ab2.textContent='🎲 WÜRFELN';
  var PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  var bar=document.createElement('div');bar.id='kamBar';ab2.parentNode.insertBefore(bar,ab2);bar.appendChild(ab2);
  var box=document.createElement('div');box.id='kamDieBox';var cube='<div id="kamCube">';
  for(var fv=1;fv<=6;fv++){cube+='<div class="f f'+fv+'">';for(var g=0;g<9;g++)cube+='<i'+(PIPS[fv].indexOf(g)>=0?' class="p"':'')+'></i>';cube+='</div>'}
  box.innerHTML=cube+'</div>';bar.appendChild(box);setCube(1,false);
  var low=document.createElement('div');low.id='kamLow';bar.parentNode.insertBefore(low,bar);
  var iv=document.createElement('div');iv.id='kamInv';var arb=$('autoRunBtn');
  if(arb){low.appendChild(arb);arb.title='Auto-Run';
    var syncA=function(){arb.classList.toggle('kon',/STOPPEN/.test(arb.textContent))};
    new MutationObserver(syncA).observe(arb,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class','disabled']});syncA()}
  low.appendChild(iv);var pfb=$('kamPf');if(pfb)low.appendChild(pfb);
  var ds=document.createElement('div');ds.id='kamDiceShop';ds.className='overlay-shop-section';var dsx=$('deathShopSection');dsx.parentNode.insertBefore(ds,dsx.nextSibling);
  var om=$('overlayMsg');new MutationObserver(function(){if(om.style.display==='flex'){if(window.__kshop){dieShop();return}if(!om._d){om._d=1;ST.deaths++;saveST();checkUnlocks()}dieShop()}else om._d=0}).observe(om,{attributes:true,attributeFilter:['style']});invUI();
}
function syncFace(){var s=$('heroPortrait').src;if($('kamPfImg'))$('kamPfImg').src=s}
var HF={idle:4,up:7,left:7,right:7},HI={},wk=null,gf=0;
Object.keys(HF).forEach(function(k){HI[k]=[];for(var q=0;q<HF[k];q++){var im=new Image();im.src='hero/'+k+q+'.webp';HI[k].push(im.src)}});
function walk(on,dir){var h=$('kamHeroImg');if(!h)return;clearInterval(wk);h.style.transform='';
  var set=on?(dir<0?HI.left:dir>0?HI.right:HI.up):HI.idle;if(!on)gf=0;gf%=set.length;h.src=set[gf];
  wk=setInterval(function(){gf=(gf+1)%set.length;h.src=set[gf]},on?85:230)}

/* ---------- Funken ---------- */
var emb=[],ctx=null,fc=0,ecol='#ff6a1a';
function embers(){
  var c0=$('kamEm');if(!c0)return;
  var c=document.getElementById('kamFx');if(!c){c=document.createElement('canvas');c.id='kamFx';c.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:1';document.body.appendChild(c)}
  embersOn(c0,false);embersOn(c,true);
}
function embersOn(c,full){
  var ctx=c.getContext('2d'),emb=[],fc=0,ecol='#ff6a1a';
  function fit(){if(full){c.width=Math.round(innerWidth*.75);c.height=Math.round(innerHeight*.75)}else{c.width=c.clientWidth;c.height=c.clientHeight}}fit();addEventListener('resize',fit);
  for(var i=0;i<(full?45:30);i++)emb.push({x:Math.random(),y:Math.random(),s:1+Math.random()*2,v:.0004+Math.random()*.0009,d:Math.random()*6.28,r:Math.random()*6.28});
  var bolt=null,mode='';
  function mk(){var n=(theme(K?K.k:1).n||'');return /Feuer/.test(n)?'fire':/Eis/.test(n)?'ice':/Gift/.test(n)?'poison':/Wasser/.test(n)?'water':/Blitz/.test(n)?'bolt':/Erd/.test(n)?'earth':/Skelett/.test(n)?'ghost':'dust'}
  (function tick(){
    if(fc%2&&fc++){requestAnimationFrame(tick);return}
    if(ctx){var W=c.width,H=c.height;ctx.clearRect(0,0,W,H);if((fc++%40)===0){ecol=getComputedStyle($('kam')).getPropertyValue('--a')||'#ff6a1a';mode=mk()}
      var down=mode==='ice'||mode==='water'||mode==='earth';
      ctx.fillStyle=ecol;ctx.strokeStyle=ecol;
      emb.forEach(function(e){
        var sp=mode==='water'?2.2:mode==='ice'?.7:mode==='earth'?1.2:1;
        e.y+=(down?1:-1)*e.v*16*sp;e.d+=.03;
        if(e.y<0||e.y>1){e.y=down?0:1;e.x=Math.random()}
        var x=e.x*W+(mode==='ice'||mode==='poison'||mode==='ghost'?Math.sin(e.d)*10:0),y=e.y*H;
        ctx.globalAlpha=.3+.5*(down?e.y:1-e.y);
        if(mode==='ice'){ctx.font=(8+e.s*4)+'px sans-serif';ctx.fillText('❄',x,y)}
        else if(mode==='water'){ctx.beginPath();ctx.moveTo(x,y-5);ctx.quadraticCurveTo(x+3.5,y+1,x,y+3);ctx.quadraticCurveTo(x-3.5,y+1,x,y-5);ctx.fill()}
        else if(mode==='poison'){ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,2+e.s*1.5,0,7);ctx.stroke()}
        else if(mode==='earth'){ctx.save();ctx.translate(x,y);ctx.rotate(e.r+e.d);ctx.fillRect(-e.s,-e.s,e.s*2.2,e.s*1.8);ctx.restore()}
        else if(mode==='ghost'){ctx.beginPath();ctx.ellipse(x,y,e.s*1.2,e.s*2.6,0,0,7);ctx.fill()}
        else if(mode==='fire'){ctx.shadowColor=ecol;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x,y,e.s+.5,0,7);ctx.fill();ctx.shadowBlur=0}
        else{ctx.beginPath();ctx.arc(x,y,e.s,0,7);ctx.fill()}
      });
      if(mode==='bolt'){
        if(!bolt&&Math.random()<.025){var bx=Math.random()*W,pts=[[bx,0]],yy=0;while(yy<H*.55){yy+=18+Math.random()*22;bx+=(Math.random()-.5)*40;pts.push([bx,yy])}bolt={p:pts,t:7}}
        if(bolt){ctx.globalAlpha=Math.min(1,bolt.t/4);ctx.strokeStyle='#fff6b0';ctx.shadowColor=ecol;ctx.shadowBlur=14;ctx.lineWidth=2.4;ctx.beginPath();bolt.p.forEach(function(q,i){i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])});ctx.stroke();ctx.shadowBlur=0;if(--bolt.t<=0)bolt=null}
      }
      ctx.globalAlpha=1}
    requestAnimationFrame(tick)})();
}

/* ---------- Brett ---------- */
function campLv(){try{return JSON.parse(localStorage.getItem('robCity')||'{}').b.camp||0}catch(e){return 0}}
function gen(r,c,R){
  /* Etage 1-3: wenig Gold, Etage 4-6: Gold-Zone, Etage 7-10: nur noch Monster (und Betten) */
  var e=Math.min(10,Math.ceil(r/ETG)),w;
  if(e<=3)w=[['monster',52],['gold',14],['empty',34]];
  else if(e<=6)w=[['monster',34],['gold',40],['empty',26]];
  else w=[['monster',84],['empty',16]];
  var x=Math.random()*100,a=0,t='empty';
  for(var i=0;i<w.length;i++){a+=w[i][1];if(x<a){t=w[i][0];break}}
  if(t==='empty'&&e>=2&&!K.dieE[e]&&Math.random()<(EQ==='city'&&cityTier()>=2?.07:.035)){t='die';K.dieE[e]=1}
  var cl2=campLv();
  if(cl2>0&&t!=='die'){K.campE=K.campE||{};var gap=Math.max(1,Math.ceil(10/cl2));
    if(!K.campE[e]&&e%gap===0&&r===ETG*e-3){t='camp';K.campE[e]=1}
    else if(t==='empty'&&Math.random()<Math.min(.1,.01*cl2))t='camp'}
  var o={t:t,r:r,c:c};
  if(t==='die'){var ids=Object.keys(BD);o.d=pick(ids)}
  if(t==='gold')o.v=3+Math.floor(Math.random()*7);
  if(t==='monster')o.m=mainOf(K.k);
  return o;
}
function addEl(o){
  var d=document.createElement('div');d.className='tile '+o.t;
  if(o.t==='boss'){d.style.left=px(CM)+'px';d.innerHTML='<img class="sp" src="'+getMonsterImg(drag(K.k))+'" alt=""><small>BOSS</small>'}
  else{
    var inner=o.t==='monster'?'<img class="sp" src="'+getMonsterImg(o.m)+'" alt=""><small>Kampf</small>':o.t==='gold'?'💰<small>+'+o.v+'</small>':o.t==='die'?dieHTML(o.d,30)+'<small>Würfel</small>':o.t==='bed'?'🛌<small>Bett</small>':o.t==='camp'?'🔥<small>Lagerfeuer</small>':o.t==='start'?'🔥':'';
    d.style.left=px(o.c)+'px';d.innerHTML=inner;d.style.setProperty('--b',(0.88+Math.random()*0.3).toFixed(2));
  }
  d.style.bottom=(o.r*STEP)+'px';o.el=d;$('kamWorld').appendChild(d);reg(o.r,d);
}
function wallRow(r){[px(0)-GAP-26,px(COLS-1)+TS+GAP].forEach(function(x,si){var w=document.createElement('div');w.className='wall';w.style.left=x+'px';w.style.bottom=(r*STEP)+'px';w.style.height=STEP+'px';$('kamWorld').appendChild(w);reg(r,w);
  if(r%5===2){var gl=document.createElement('div');gl.className='glow';gl.style.left=(si?x-6:x+32)+'px';gl.style.bottom=(r*STEP+STEP/2)+'px';$('kamWorld').appendChild(gl);reg(r,gl);var t=document.createElement('div');t.className='torch';t.style.left=(x-2)+'px';t.style.bottom=(r*STEP+STEP/2)+'px';$('kamWorld').appendChild(t);reg(r,t)}})}
function segs(cols){var a=cols.slice().sort(function(x,y){return x-y}),g=[],c=null;a.forEach(function(x){if(c&&x===c[c.length-1]+1)c.push(x);else{c=[x];g.push(c)}});return g}
function wOf(t){return t<=2?1:t<=4?2:t<=10?3:t<=20?4:5}
function winFor(r){
  var W=Math.min(wOf(r),wOf(ROWS-r+1)),h=Math.random()<.5;
  return W===1?[CM]:W===2?(h?[1,2]:[2,3]):W===3?[1,2,3]:W===4?(h?[1,2,3,4]:[0,1,2,3]):[0,1,2,3,4];
}
function genRow(prev,needCM,r,pp){
  pp=pp||[];
  var ps=segs(prev),win=winFor(r),choke=false;
  /* ab und zu wieder ein enger Weg: nur wenn die Reihe darunter zusammenhaengend und breit ist */
  if(r>12&&r<ROWS-12&&prev.length>=3&&prev.length<=4&&ps.length===1&&Math.random()<.2){var c0=prev[Math.floor(Math.random()*prev.length)];win=prev.indexOf(c0+1)>=0?[c0,c0+1]:[c0-1,c0];choke=true}
  for(var t=0;t<80;t++){
    var open=win.slice(),x=Math.random(),miss=(choke||win.length<3)?0:(x<.3?0:x<.75?1:2);
    while(miss-->0&&open.length>2)open.splice(Math.floor(Math.random()*open.length),1);
    var reach=segs(open).filter(function(sg){return sg.some(function(c){return prev.indexOf(c)>=0})});
    var cols=[].concat.apply([],reach);
    if(!cols.length)continue;
    /* jedes Feld der Reihe darunter braucht ein Feld direkt darueber ODER einen direkten Nachbarn mit Feld darueber (1 Schritt zur Seite, dann hoch) */
    var ok2=prev.every(function(c){
      if(cols.indexOf(c)>=0)return true;
      return (prev.indexOf(c-1)>=0&&cols.indexOf(c-1)>=0)||(prev.indexOf(c+1)>=0&&cols.indexOf(c+1)>=0)});
    if(!ok2)continue;
    /* kein Einzelfeld: ein Feld ohne Feld darunter muss ein Feld darueber bekommen */
    var ok3=prev.every(function(c){return pp.indexOf(c)>=0||cols.indexOf(c)>=0});
    if(!ok3)continue;
    return cols.sort(function(a,b){return a-b});
  }
  var u=winFor(r);prev.forEach(function(c){if(u.indexOf(c)<0)u.push(c)});return u.sort(function(a,b){return a-b});
}
function build(k){
  K={dieE:{},gb:0,side:false,k:k,N:{},cur:null,opts:null,etage:1,rows:{},vr:{},lo:-9,hi:-9};
  var th=theme(k),e=$('kam').style;e.setProperty('--a',th.a);e.setProperty('--bg',th.bg);e.setProperty('--t',th.t);e.setProperty('--w',th.w);
  var W=$('kamWorld');W.querySelectorAll('.tile,.wall,.blk,.band,.torch,.glow').forEach(function(n){n.remove()});
  var st={t:'start',r:0,c:CM};K.N[key(0,CM)]=st;addEl(st);wallRow(0);K.cur=st;
  var prev=[CM],pp=[];
  for(var r=1;r<=ROWS+1;r++){
    wallRow(r);
    var R=baseRound()+Math.min(10,Math.ceil(r/ETG));
    if(r<=ROWS&&(r-1)%ETG===0){var bd=document.createElement('div');bd.className='band';bd.style.bottom=(r*STEP-4)+'px';bd.innerHTML='<b>ETAGE '+(((r-1)/ETG)+1)+'</b>';W.appendChild(bd);reg(r,bd)}
    var cols=r===ROWS+1?[CM]:genRow(prev,false,r,pp);
    cols.forEach(function(c){var o=r===ROWS+1?{t:'boss',r:r,c:CM}:gen(r,c,R);K.N[key(r,c)]=o;addEl(o);});
    for(var c2=0;c2<COLS;c2++){if(cols.indexOf(c2)>=0)continue;var b=document.createElement('div');b.className='blk';b.style.left=px(c2)+'px';b.style.bottom=(r*STEP)+'px';W.appendChild(b);reg(r,b)}
    pp=prev;prev=cols;
  }
  meta.round=baseRound()+1;
  syncFace();place();hud();msg('Würfle. Dein Held läuft dann von selbst.');
}
function place(){
  updateVis();var o=K.cur,h=$('kamHero');h.style.left=(o.t==='boss'?-TS/2:px(o.c))+'px';h.style.bottom=(o.r*STEP)+'px';
  var st=$('kam').clientHeight;$('kamWorld').style.transform='rotateX(30deg) translateY('+Math.max(0,o.r*STEP-st*0.2)+'px)';
}
function msg(t){var m=$('kamMsg');if(m)m.textContent=t}
function hud(){
  if(!K||!meta)return;
  $('kHp').textContent=Math.max(0,meta.hp)+'/'+meta.maxHp;$('kHpB').style.width=Math.max(0,meta.hp/meta.maxHp*100)+'%';$('kGold').textContent=meta.gold;$('kAtk').textContent=meta.attack;
  var r=K.cur.r,et=Math.min(10,Math.ceil(Math.max(1,r)/ETG));$('kEt').textContent=theme(K.k).n+' · Etage '+et+'/10';
  var left=ROWS+1-r;$('kBn').textContent='Drache '+getMonsterNameSafe()+' · '+(r>ROWS?'Boss-Reihe':'Reihe '+r+' / '+ROWS);$('kBb').style.width=(100*(1-left/(ROWS+1)))+'%';
}
function getMonsterNameSafe(){try{return MONSTER_NAMES[drag(K.k)]||'Drache'}catch(e){return 'Drache'}}
function fl(txt,color){var st=$('kam'),h=$('kamHero').getBoundingClientRect(),r=st.getBoundingClientRect(),d=document.createElement('div');d.className='fl';d.textContent=txt;d.style.color=color;d.style.left=(h.left-r.left+8)+'px';d.style.top=(h.top-r.top-6)+'px';st.appendChild(d);setTimeout(function(){d.remove()},1200)}

/* ---------- Würfeln und Ziel wählen ---------- */
/* Automatischer Weg: meist hoch, hoechstens 1 Schritt zur Seite, danach wieder hoch */
function plan(n){
  var all=[];
  function dfs(node,left,sideLast,path,relax){
    if(path.length&&node.t==='boss'){all.push({p:path.slice(),c:true});return}
    if(left===0){all.push({p:path.slice(),c:true});return}
    var moved=false,up=K.N[key(node.r+1,node.c)];
    if(up){moved=true;path.push(up);dfs(up,left-1,false,path,relax);path.pop()}
    if(node.r<ROWS&&(!sideLast||relax)){
      [-1,1].forEach(function(d){var t=K.N[key(node.r,node.c+d)];if(t){moved=true;path.push(t);dfs(t,left-1,true,path,relax);path.pop()}});
    }
    if(!moved&&path.length)all.push({p:path.slice(),c:false});
  }
  dfs(K.cur,n,!!K.side,[],false);
  if(!all.length)dfs(K.cur,n,!!K.side,[],true);
  if(!all.length)return [];
  var full=all.filter(function(x){return x.c}),pool=full.length?full:all;
  if(!full.length){var m=Math.max.apply(null,pool.map(function(x){return x.p.length}));pool=pool.filter(function(x){return x.p.length===m})}
  var w=pool.map(function(x){var u=0,r=K.cur.r;x.p.forEach(function(t){if(t.r>r)u++;r=t.r});return Math.pow(3,u)}),tot=w.reduce(function(a,b){return a+b},0),x=Math.random()*tot,k=0;
  for(;k<pool.length-1;k++){x-=w[k];if(x<=0)break}
  return pool[k].p;
}

/* ---------- Würfel-System ---------- */
var BD={ /* Brettwürfel */
 snail:{n:'Schneckenwürfel',c:['#8a9a62','#3f4a2a'],f:1,d:'Wirft nur 1'},
 storm:{n:'Sturmwürfel',c:['#4a82bd','#17365c'],f:6,d:'Wirft nur 6'},
 wander:{n:'Wanderwürfel',c:['#a8703a','#4a2b10'],f:5,d:'Wirft 4 bis 6'},
 dbl:{n:'Doppelwürfel',c:['#8450ad','#331a4a'],f:2,d:'Zwei Würfel zählen zusammen'},
 war:{n:'Kampfwürfel',c:['#c23a3a','#511010'],f:6,d:'Zahl x10% Schaden im nächsten Kampf'},
 heal:{n:'Heilwürfel',c:['#3fa56f','#134a2a'],f:3,d:'Zahl x5% Leben zurück'},
 shield:{n:'Schildwürfel',c:['#5a93a8','#1f3f4a'],f:4,d:'Nächster Treffer um Zahl x10% schwächer'},
 loot:{n:'Beutewürfel',c:['#d6b13a','#6b5410'],f:5,d:'Zahl x2 Münzen'}
};
var SD={ /* Dauerwürfel */
 rig:{n:'Gezinkter Würfel',c:['#6e7a86','#2b333b'],f:2,p:300,d:'Wirft nie eine 1'},
 redo:{n:'Wiederholwürfel',c:['#7a6ab8','#2a2150'],f:3,p:400,d:'Bei einer 1 darfst du einmal pro Etage neu würfeln'},
 vamp:{n:'Vampirwürfel',c:['#9a2a4a','#40101f'],f:6,p:500,d:'Bei 6: 10% Leben zurück'},
 luck:{n:'Glückswürfel',c:['#58a838','#1d4a10'],f:5,p:450,d:'Bei 5 oder 6: ein Feld weiter'},
 warp:{n:'Kriegswürfel',c:['#d2542a','#5a1c0a'],f:6,p:600,d:'Jede 6: +20% Schaden im nächsten Kampf'},
 iron:{n:'Eisenwürfel',c:['#6a8aa0','#25394a'],f:4,p:550,d:'Bei 3 oder 4: nächster Treffer -20%'},
 city:{n:'Stadtwürfel',c:['#7a5ad9','#e0b020'],f:6,p:0,d:'Wächst mit deiner Stadt'},
 six:{n:'Sechserwürfel',c:['#d9a520','#5a3a00'],f:6,p:0,d:'Wirft nur Sechsen'},
 thief:{n:'Golddieb-Würfel',c:['#cfa230','#5a430a'],f:2,p:500,d:'Bei gerader Zahl: Münzfelder +2'}
};
var PIPS2={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function dd(id){return BD[id]||SD[id]}
function dieHTML(id,sz){var d=dd(id),h='<span class="md" style="width:'+sz+'px;height:'+sz+'px;padding:'+Math.round(sz*.16)+'px;background:linear-gradient(145deg,'+d.c[0]+','+d.c[1]+')">';for(var i=0;i<9;i++)h+='<i'+(PIPS2[d.f].indexOf(i)>=0?' class="p"':'')+'></i>';return h+'</span>'}
function ls(k,def){try{var v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}}
function ss(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var INV=ls('robKamInv',[]),OWN=ls('robKamOwned',[]),EQ=ls('robKamEq',''),DRG=ls('robKamDrag',[]);
var armed=-1,fb=0,dlt=0,shieldSet=false,redoE=0;
function dragCost(k){return 1000*Math.pow(2,k-1)}
function saveD(){ss('robKamInv',INV);ss('robKamOwned',OWN);ss('robKamEq',EQ);ss('robKamDrag',DRG)}
function invUI(){
  var el=$('kamInv');if(!el)return;var h='';
  for(var i=0;i<3;i++){var id=INV[i];h+=id?'<button class="sl'+(armed===i?' on':'')+'" data-i="'+i+'">'+dieHTML(id,34)+'<small>'+dd(id).n.replace('würfel','')+'</small></button>':'<span class="sl em"></span>'}
  el.innerHTML=h;paintCube();
  [].forEach.call(el.querySelectorAll('button.sl'),function(b){b.onclick=function(){if(busy||inFight)return;var i=+b.dataset.i;armed=armed===i?-1:i;invUI();msg(armed>=0?dd(INV[armed]).n+' bereit: '+dd(INV[armed]).d+'. Jetzt würfeln.':'Würfel abgelegt.')}});
}
function applyFightBonus(){
  if(fb>0&&!dlt){dlt=Math.max(1,Math.round(meta.attack*fb/100));meta.attack+=dlt;msg('Würfelbonus: +'+fb+'% Schaden in diesem Kampf.')}
  if(window.__kamDragonDie){}
}
function endFightBonus(){if(dlt&&!inFight){meta.attack=Math.max(1,meta.attack-dlt);dlt=0;fb=0}}
var CMAX={mine:15,dia:15,smith:15,house:15,bank:15,tower:15};
function cityTier(){try{var b=(JSON.parse(localStorage.getItem('robCity')||'{}').b)||{},n=0;Object.keys(CMAX).forEach(function(k){if((b[k]||0)>=CMAX[k])n++});return n}catch(e){return 0}}
function rollValue(){
  var id=armed>=0?INV[armed]:null,v=1+Math.floor(Math.random()*6),a=0,info='';
  if(id==='snail')v=1;else if(id==='storm')v=6;else if(id==='wander')v=4+Math.floor(Math.random()*3);
  else if(id==='dbl'){a=1+Math.floor(Math.random()*6);var b=1+Math.floor(Math.random()*6);v=a+b;info=a+' + '+b+' = '+v}
  if(EQ==='six'&&!id)v=6;
  if(EQ==='city'&&!id){var ct=cityTier(),mn=Math.min(6,ct+1);v=mn+Math.floor(Math.random()*(7-mn))}
  if(EQ==='rig'&&v===1&&!id)v=2+Math.floor(Math.random()*5);
  var shown=a||v;
  return {v:v,show:Math.min(6,shown),id:id,info:info}
}
function afterRoll(r){
  var v=r.v,id=r.id,note=[];
  if(id==='war'){fb=Math.max(fb,v*10);note.push('+'+v*10+'% Schaden im nächsten Kampf')}
  if(id==='heal'){var h=Math.floor(meta.maxHp*v*.05);meta.hp=Math.min(meta.maxHp,meta.hp+h);fl('+'+h+' ❤','#6fe08a');note.push('Heilung '+h)}
  if(id==='shield'){window.__kamShield=Math.min(90,v*10);shieldSet=true;note.push('Schild '+v*10+'%')}
  if(id==='loot'){var lm=(EQ==='city'&&cityTier()>=4)?3:2;meta.gold+=v*lm;fl('+'+v*lm+' 🪙','#ffd24a');note.push('+'+v*lm+' Münzen')}
  if(EQ==='vamp'&&v===6){var h2=Math.floor(meta.maxHp*.1);meta.hp=Math.min(meta.maxHp,meta.hp+h2);fl('+'+h2+' ❤','#ff6a8a');note.push('Vampir: +'+h2+' ❤')}
  if(EQ==='warp'&&v===6){fb=Math.max(fb,0)+20;note.push('Kriegswürfel +20% Schaden')}
  if(EQ==='iron'&&(v===3||v===4)){window.__kamShield=20;shieldSet=true;note.push('Eisenwürfel: nächster Treffer -20%')}
  if(EQ==='thief'&&v%2===0){K.gb=2;note.push('Golddieb: Münzfelder +2')}
  if(EQ==='city'&&!id){var t2=cityTier();
    if(t2>=3&&v%2===0){K.gb=2;note.push('Stadt: Münzfelder +2')}
    if(t2>=5){var h3=Math.floor(meta.maxHp*.05);if(h3>0){meta.hp=Math.min(meta.maxHp,meta.hp+h3);fl('+'+h3+' ❤','#6fe08a');note.push('Stadt heilt '+h3)}}}
  if(id){INV.splice(armed,1);armed=-1;saveD();invUI()}
  hud();return note;
}
function toast(t){var d=document.createElement('div');d.className='ktoast';d.innerHTML=t;document.body.appendChild(d);setTimeout(function(){d.remove()},3600)}
function unlock(id){
  if(OWN.indexOf(id)>=0)return;OWN.push(id);if(!EQ)EQ=id;saveD();invUI();
  toast('<div>🎲 GEHEIMER WÜRFEL GEFUNDEN!</div>'+dieHTML(id,64)+'<b>'+SD[id].n+'</b><small>'+SD[id].d+'</small>');
}
var ST=ls('robKamStats',{kills:0,deaths:0,dice:0,bosses:0,low:0});var lastK=0;
function saveST(){ss('robKamStats',ST)}
function checkUnlocks(){
  if(!meta)return;
  if(meta.kills>lastK){ST.kills+=meta.kills-lastK;saveST()}lastK=meta.kills;
  if(ST.kills>=10)unlock('rig');
  if(ST.deaths>=3)unlock('redo');
  if(ST.dice>=25)unlock('luck');
  if(ST.bosses>=1)unlock('warp');
  if(ST.low>=1)unlock('iron');
  if(meta.gold>=5000)unlock('thief');
  try{if(prestigeData&&prestigeData.count>=1)unlock('six')}catch(e){}
  if(cityTier()>=1)unlock('city');
  if(inFight&&meta.hp>0&&meta.hp<=meta.maxHp*.1&&!ST.lowSeen){ST.lowSeen=1;ST.low=1;saveST()}
}
setInterval(function(){try{if(inFight&&fightBoss&&OWN.indexOf('vamp')<0&&monstersInFight&&monstersInFight[0]&&monstersInFight[0].isBoss&&monstersInFight[0].hp<=monstersInFight[0].maxHp*.5)unlock('vamp')}catch(e){}},400);
function cityInfo(){var t=cityTier(),mn=Math.min(6,t+1),x=['wirft '+mn+(mn<6?' bis 6':'')];if(t>=2)x.push('mehr Würfel auf dem Brett');if(t>=3)x.push('gerade Zahl: Münzfelder +2');if(t>=4)x.push('Beutewürfel stärker');if(t>=5)x.push('heilt bei jedem Wurf');return 'Stufe '+t+'/6: '+x.join(', ')}
function dieShop(){
  var box=$('kamDiceShop');if(!box||!meta||!K)return;
  var h='<h3>🎲 DEINE WÜRFEL</h3><div class="ds">',n=0;
  Object.keys(SD).forEach(function(id){var d=SD[id];
    if(OWN.indexOf(id)<0){n++;return}
    var eq=EQ===id;
    h+='<div class="di'+(eq?' eq':'')+'" data-id="'+id+'">'+dieHTML(id,38)+'<div class="t"><b>'+d.n+'</b><small>'+(id==='city'?cityInfo():d.d)+'</small></div><div class="pr">'+(eq?'✔ ANGELEGT':'ANLEGEN')+'</div></div>'});
  for(var q=0;q<n;q++)h+='<div class="di lk"><span class="md" style="width:38px;height:38px;background:#222"></span><div class="t"><b>? ? ?</b><small>Geheimer Würfel. Finde ihn im Spiel.</small></div></div>';
  var k=K.k,has=DRG.indexOf(k)>=0;
  h+='<div class="di dr" data-id="dragon"><span class="md" style="width:38px;height:38px;padding:6px;background:linear-gradient(145deg,#1a1a2e,#050510)"><i class="p" style="background:#ff7a3a"></i></span><div class="t"><b>Drachenwürfel Kammer '+k+'</b><small>Erster Schlag gegen den Drachen: 10% seines Lebens</small></div><div class="pr">'+(has?'✔ GEKAUFT':'💰 '+dragCost(k))+'</div></div></div>';
  box.innerHTML=h;
  [].forEach.call(box.querySelectorAll('.di:not(.lk)'),function(nd){nd.onclick=function(){
    var id=nd.dataset.id;
    if(id==='dragon'){if(DRG.indexOf(K.k)>=0)return;var c=dragCost(K.k);if(meta.gold<c)return;meta.gold-=c;DRG.push(K.k)}
    else EQ=EQ===id?'':id;
    saveD();var g=$('overlayGold');if(g)g.textContent='💰 '+meta.gold+' Gold verfügbar';dieShop();invUI();hud()}});
}
var CUBE={1:[0,0],2:[0,-90],6:[0,-180],5:[0,90],3:[-90,0],4:[90,0]};
function setCube(v,spin){var c=$('kamCube');if(!c)return;c.classList.remove('spin');c.style.transform='rotateX('+(CUBE[v][0]+(spin?720:0))+'deg) rotateY('+(CUBE[v][1]+(spin?720:0))+'deg)'}
/* Würfelgeräusch: Holzwürfel rollt über einen Tisch (WebAudio, ohne Datei) */
var AC=null;
function ac(){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function knock(t,vol,f){var a=ac();if(!a)return;
  var n=Math.floor(a.sampleRate*.06),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);
  for(var i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
  var s=a.createBufferSource();s.buffer=b;var fl=a.createBiquadFilter();fl.type='bandpass';fl.frequency.value=f;fl.Q.value=1.2;
  var g=a.createGain();g.gain.value=vol;s.connect(fl);fl.connect(g);g.connect(a.destination);s.start(a.currentTime+t);
  var o=a.createOscillator(),og=a.createGain();o.type='sine';o.frequency.setValueAtTime(170+Math.random()*60,a.currentTime+t);o.frequency.exponentialRampToValueAtTime(70,a.currentTime+t+.07);
  og.gain.setValueAtTime(vol*.7,a.currentTime+t);og.gain.exponentialRampToValueAtTime(.001,a.currentTime+t+.09);o.connect(og);og.connect(a.destination);o.start(a.currentTime+t);o.stop(a.currentTime+t+.1)}
function diceSound(){var t=0,gaps=[.0,.07,.14,.23,.34,.47,.62,.8];
  gaps.forEach(function(gp,i){knock(gp,.5-i*.04,900+Math.random()*1400)});knock(.9,.35,700)}
window.__kamDiceSound=diceSound;
function anim(sv,cb){var box=$('kamDieBox'),c=$('kamCube');try{diceSound()}catch(e){}
  box.classList.remove('toss');void box.offsetWidth;box.classList.add('toss');
  c.style.transform='';c.classList.add('spin');
  setTimeout(function(){setCube(sv,true)},450);
  setTimeout(function(){box.classList.remove('toss');cb()},950)}
function settle(R0){var v=R0.v;var nt=afterRoll(R0);msg((R0.info||'Du würfelst '+v+'.')+(nt.length?' · '+nt.join(' · '):''));setTimeout(function(){go(v)},350)}
function askRedo(R0){
  var k=$('kam'),d=document.createElement('div');d.id='kamAsk';
  d.innerHTML='<b>Eine 1.</b><span>Wiederholwürfel: Einmal pro Etage darfst du neu würfeln.</span><div><button class="re">🎲 NOCHMAL WÜRFELN</button><button class="ke">1 BEHALTEN</button></div>';
  k.appendChild(d);
  d.querySelector('.ke').onclick=function(){d.remove();settle(R0)};
  d.querySelector('.re').onclick=function(){d.remove();redoE=K.etage;var R1=rollValue();R1.id=null;anim(R1.show,function(){settle(R1)})};
}
function roll(){
  if(busy||!K||inFight)return;
  if(typeof autoRunActive!=='undefined'&&autoRunActive&&autoRunData.level<=K.k&&K.cur.r+6>=ROWS+1){autoRunActive=false;clearInterval(autoRunInterval);updateAutoRunUI();msg('Auto-Run pausiert: Der Drache wartet. Kämpfe ihn selbst.');return}
  busy=true;var R0=rollValue();
  anim(R0.show,function(){
    if(EQ==='redo'&&!R0.id&&R0.v===1&&redoE!==K.etage&&!(typeof autoRunActive!=='undefined'&&autoRunActive)){msg('Du würfelst 1.');return askRedo(R0)}
    settle(R0)})
}
function go(v){
  if(EQ==='luck'&&v>=5&&v<6+1)v=v+1;
  var p=plan(v);
  if(!p.length){msg('Du würfelst '+v+', aber es geht nicht weiter. Würfle nochmal.');busy=false;return}
  updateBtn();
  if(window.runKick)try{runKick(p.length)}catch(e){}
  (function step(i){
    if(i>=p.length)return land();
    var prevC=K.cur.c,prevR=K.cur.r;K.cur=p[i];K.side=(K.cur.r===prevR);walk(true,K.cur.c<prevC?-1:K.cur.c>prevC?1:0);place();var h=$('kamHero');h.classList.add('hop');setTimeout(function(){h.classList.remove('hop')},180);
    var et=Math.min(10,Math.ceil(Math.max(1,K.cur.r)/ETG));
    if(et>K.etage&&K.cur.t!=='boss'){K.etage=et;meta.round=baseRound()+et;try{prestigeData.points=(prestigeData.points||0)+1;savePrestige()}catch(e){}}
    hud();setTimeout(function(){step(i+1)},230);
  })(0);
}
/* Kampf-Zusammenstellung: Kammer 1-9 ein Monster, 10-12 Doppelte, ab 13 gemischte Paare, ab 20 auch Dreier */
function kamFight(o){
  var k=K.k,e=Math.min(10,Math.ceil(Math.max(1,o.r)/ETG)),main=o.m,types=[main],x=Math.random();
  if(k<10){if(e>=9&&x<.15)types.push(main)}
  else if(k<13){if(x<.55)types.push(main)}
  else if(k<20){if(x<.6)types.push(pick(pool(k)))}
  else{if(x<.25){types.push(pick(pool(k)));types.push(pick(pool(k)))}else if(x<.7)types.push(pick(pool(k)))}
  startFight(false,main);
  monstersInFight=types.map(function(t){return createMonster(t,false)});
  applyFightBonus();renderFight();
  return types;
}
window.__kamFight=function(kk,mm){if(kk)K.k=kk;return kamFight({r:10,m:mm||mainOf(K.k)})};
function land(){
  var o=K.cur;busy=false;walk(false,1);
  if(o.t==='boss'){fightBoss=true;pendingBossNum=K.k;startWorldBoss(K.k);
    try{monstersInFight[0].baseType=drag(K.k);renderFight()}catch(e){}
    applyFightBonus();var dm='Der Drache versperrt den Weg!';if(DRG.indexOf(K.k)>=0){try{var bm=monstersInFight[0],ch=Math.round(bm.maxHp*.1);bm.hp=Math.max(1,bm.hp-ch);DRG.splice(DRG.indexOf(K.k),1);saveD();dm+=' Drachenwürfel: -'+ch+' Leben!';renderFight()}catch(e){}}msg(dm);return afterAny()}
  if(o.t==='monster'&&!o.used){o.used=true;o.el.classList.add('used');var tp=kamFight(o);msg(tp.length>1?tp.map(function(t){return MONSTER_NAMES[t]}).join(' und ')+' greifen an!':MONSTER_NAMES[o.m]+' greift an!');return afterAny()}
  if(!o.used){
    if(o.t==='die'){if(INV.length>=3){msg('Alle 3 Plätze voll. Der Würfel bleibt liegen.');updateUI();return}INV.push(o.d);ST.dice++;saveST();saveD();invUI();checkUnlocks();fl('🎲 '+dd(o.d).n,'#fff');msg(dd(o.d).n+' eingesammelt: '+dd(o.d).d+'.');o.used=true;if(o.el)o.el.classList.add('used');updateUI();return}
    if(o.t==='gold'){var g=Math.floor((o.v+(K.gb||0))*(typeof getSchurkeGoldMult==='function'?getSchurkeGoldMult():1));
      if(heroData[meta.hero].skills.includes('ben1')&&Math.random()<.3){g*=2;try{showSkillPopup('🍀 GLÜCKSGRIFF! Doppeltes Gold!')}catch(e){}}
      if(window.__kamGoldM)g=Math.floor(g*window.__kamGoldM());
      meta.gold+=g;K.gb=0;fl('+'+g+' 🪙','#ffd24a');msg('Gold gefunden.');
      try{if(playerClass){questTracking.goldEarned=(questTracking.goldEarned||0)+g;saveQuestTracking()}}catch(e){}}
    else if(o.t==='camp'){var cl=campLv(),h3=Math.floor(meta.maxHp*Math.min(1,.4+.06*cl));meta.hp=Math.min(meta.maxHp,meta.hp+h3);fl('+'+h3+' ❤','#ffa04a');msg('Du rastest am Lagerfeuer. +'+h3+' Leben.')}
    else if(o.t==='bed'){var h=Math.floor(meta.maxHp*.5);meta.hp=Math.min(meta.maxHp,meta.hp+h);fl('+'+h+' ❤','#6fe08a');msg('Du ruhst dich im Bett aus.')}
    else msg('Ruhiges Feld.');
    o.used=true;if(o.el)o.el.classList.add('used');
  }else msg('Hier war schon etwas. Würfle weiter.');
  updateUI();
}
function afterAny(){updateUI()}
function updateBtn(){
  var b=$('actionBtn');if(!b||inFight)return;
  b.textContent=(K&&K.opts)?'👆 ZIELFELD WÄHLEN':(pendingBossNum>0&&false?'':'🎲 WÜRFELN');
}

/* ---------- Haken in game.js ---------- */
function hook(){
  var oGen=window.generateBoard;
  window.generateBoard=function(){
    if(!$('kam'))return oGen&&oGen.apply(this,arguments);
    var mb=0;try{mb=(inventory.stats&&inventory.stats.maxBoss)||0}catch(e){}
    var k=Math.floor((Math.max(1,meta.round||1)-1)/10)+1;
    if(fightBoss&&K){k=bossWon?K.k+1:K.k}
    if(fightBoss){if(bossWon){ST.bosses++;saveST()}fightBoss=false;bossWon=false}
    /* Der Drache beschuetzt seine Kammer: hoechstens Kammer (besiegte Bosse + 1) */
    k=Math.max(1,Math.min(k,mb+1));meta.round=Math.max(meta.round||1,(k-1)*10+1);if(meta.round>k*10)meta.round=(k-1)*10+1;
    board=['empty'];pos=0;build(k);
  };
  window.drawBoard=function(){};
  var oSw=window.runSwing;window.runSwing=function(){if(inFight&&$('kam')&&typeof meta!=='undefined'&&meta){try{kamStrike()}catch(e){}}return oSw&&oSw.apply(this,arguments)};
  var oAct=window.handleAction;
  window.handleAction=function(){
    if(window.__turnLock)return;
    if(inFight){var sh0=!!window.__kamShield;var rr=oAct.apply(this,arguments);if(sh0)setTimeout(function(){if(inFight){window.__kamShield=0;shieldSet=false}},1000);if(window.__turnLock){setTimeout(monHurt,60);setTimeout(function(){if(inFight&&monstersInFight.length)monAtk()},430)}return rr}
    if(K&&K.opts){if(typeof autoRunActive!=='undefined'&&autoRunActive&&!busy){autoPick(Object.keys(K.opts))}else msg('Tippe eines der leuchtenden Felder an.');return}
    roll();
  };
  var oUI=window.updateUI;
  window.updateUI=function(){
    oUI.apply(this,arguments);
    document.body.classList.toggle('kamfight',!!inFight);
    try{endFightBonus();checkUnlocks()}catch(e){}
    var b=$('actionBtn');if(b&&!inFight)b.textContent=(K&&K.opts)?'👆 ZIELFELD WÄHLEN':'🎲 WÜRFELN';
    try{hud()}catch(e){}
    try{syncAllies();allyUnlockToast()}catch(e){}
  };
  var oRF=window.renderFight;
  window.renderFight=function(){oRF.apply(this,arguments);prepAnim();var n=monstersInFight.length;document.body.classList.toggle('kamn2',n===2);document.body.classList.toggle('kamn3',n>=3);document.body.classList.toggle('kamfight',!!inFight&&monstersInFight.length>0);try{syncAllies()}catch(e){}};

}


/* ---------- Gruppe: Bogenschuetzin (ab Klassenlevel 15) und Magierin (ab 30) stehen hinten und helfen im Kampf ---------- */
var ALLY=[
 {id:'arc',ic:'🏹',nm:'Bogenschützin',need:15,w:108,l:4,b:34,idle:['arc_i0','arc_i1'],atk:['arc_a0','arc_a2'],mult:.5,pj:'arrow',col:'#ffd24a'},
 {id:'mag',ic:'🔮',nm:'Magierin',need:30,w:118,l:70,b:82,idle:['mag_i0','mag_i1'],atk:['mag_a1','mag_a1'],mult:.4,pj:'orb',col:'#d070ff',heal:true}
];
var allyRound=0;
function clsLv(){try{return window.__cl!=null?window.__cl:getClassLevel()}catch(e){return 0}}
window.__kamGot=function(){try{return JSON.parse(localStorage.getItem('robKamAl')||'{}')}catch(e){return{}}};
function gotAl(){try{return JSON.parse(localStorage.getItem('robKamAl')||'{}')}catch(e){return{}}}
function allyList(){var c=clsLv(),g=gotAl();return ALLY.filter(function(a){return c>=a.need||g[a.id]})}
function allyUnlockToast(){
  var got={};try{got=JSON.parse(localStorage.getItem('robKamAl')||'{}')}catch(e){}
  var c=clsLv(),ch=false;
  ALLY.forEach(function(a){if(c>=a.need&&!got[a.id]){got[a.id]=1;ch=true;toast(a.ic+' '+a.nm+' schließt sich dir an! Sie steht hinten und hilft im Kampf.')}});
  if(ch)try{localStorage.setItem('robKamAl',JSON.stringify(got))}catch(e){}
}
function syncAllies(){
  var w=$('sceneWrap');if(!w)return;
  var box=$('kamAl'),on=inFight&&monstersInFight&&monstersInFight.length&&$('kam'),L=on?allyList():[];
  if(!L.length){if(box)box.remove();return}
  if(!box){box=document.createElement('div');box.id='kamAl';w.appendChild(box)}
  if(box.dataset.n==String(L.length))return;
  box.dataset.n=String(L.length);box.innerHTML='';
  L.forEach(function(a){var i=document.createElement('img');i.id='kal_'+a.id;i.alt='';i.src='ally/'+a.idle[0]+'.webp';i.style.cssText='left:'+a.l+'px;bottom:'+a.b+'px;width:'+a.w+'px';box.appendChild(i)});
}
var allyT=0;
setInterval(function(){allyT++;allyList().forEach(function(a){var i=$('kal_'+a.id);if(i&&!a.busy)i.src='ally/'+a.idle[allyT%2]+'.webp'})},480);
function animAlly(a,dm){
  var i=$('kal_'+a.id),w=$('sceneWrap');if(!i||!w)return;
  a.busy=true;i.src='ally/'+a.atk[0]+'.webp';
  setTimeout(function(){i.src='ally/'+a.atk[1]+'.webp'},110);
  var wr=w.getBoundingClientRect(),ir=i.getBoundingClientRect(),ms=document.querySelector('#battleScene .monster-slot'),mi0=ms&&ms.querySelector('img'),mr=mi0?mi0.getBoundingClientRect():null;
  var x0=ir.left-wr.left+ir.width*(a.id==='arc'?.80:.76),y0=ir.top-wr.top+ir.height*(a.id==='arc'?.52:.46);
  var x1=mr?mr.left-wr.left+mr.width*.4:wr.width*.7,y1=a.id==='arc'?(mr?y0+(mr.top-wr.top+mr.height*.5-y0)*.5:y0):(mr?mr.top-wr.top+mr.height*.5:y0);
  var p=document.createElement('div');p.className='kpj '+a.pj;p.style.left=x0+'px';p.style.top=y0+'px';
  var ang=Math.atan2(y1-y0,x1-x0)*180/Math.PI;p.style.setProperty('--r',ang+'deg');
  setTimeout(function(){w.appendChild(p);p.animate([{transform:'translate(0,0) rotate('+ang+'deg)',opacity:1},{transform:'translate('+(x1-x0)+'px,'+(y1-y0)+'px) rotate('+ang+'deg)',opacity:1}],{duration:260,easing:'ease-in'}).onfinish=function(){
    p.remove();
    var t=document.createElement('div');t.className='kdm';t.textContent='-'+dm;t.style.color=a.col;t.style.left=(x1-10)+'px';t.style.top=(y1-26)+'px';w.appendChild(t);
    t.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-30px)',opacity:0}],{duration:800}).onfinish=function(){t.remove()};
    var mi=ms&&ms.querySelector('img');if(mi)mi.animate([{filter:'brightness(2.6) saturate(.3)'},{filter:'none'}],{duration:240});
  }},150);
  setTimeout(function(){a.busy=false;i.src='ally/'+a.idle[0]+'.webp'},560);
}
function allyStrike(){
  var L=allyList();if(!L.length)return;
  allyRound++;var d=0;
  L.forEach(function(a,k){var dm=Math.max(1,Math.round(meta.attack*a.mult)+(window.__kamAllyBonus?window.__kamAllyBonus(a.id):0));d+=dm;setTimeout(function(){animAlly(a,dm)},170+k*230)});
  meta.attack+=d;setTimeout(function(){meta.attack-=d},0);
  if(L.some(function(a){return a.heal})&&allyRound%3===0)setTimeout(function(){
    if(!inFight||meta.hp<=0)return;var h=Math.max(1,Math.round(meta.maxHp*.08));meta.hp=Math.min(meta.maxHp,meta.hp+h);
    fl('+'+h+' ❤ Magierin','#d070ff');try{updateUI()}catch(e){}},760);
}
(function(){var st=document.createElement('style');st.textContent='#kamAl{position:absolute;inset:0;pointer-events:none;z-index:6}#kamAl img{position:absolute;display:block;filter:drop-shadow(0 3px 4px #000a)}.kpj{position:absolute;z-index:9;pointer-events:none}.kpj.arrow{width:86px;height:48px;margin-top:-24px;background:url(ally/fx_arrow.png) center/contain no-repeat;mix-blend-mode:screen}.kpj.stream{width:84px;height:36px;margin-top:-18px;background:url(ally/fx_stream.png) center/contain no-repeat;mix-blend-mode:screen}.kpj.splash{width:60px;height:39px;margin:-20px 0 0 -30px;background:url(ally/fx_splash.png) center/contain no-repeat;mix-blend-mode:screen}.kpj.orb{width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;background:radial-gradient(#fff 15%,#c050ff 55%,#0000 72%);box-shadow:0 0 16px #b040ff}.kdm{position:absolute;z-index:10;pointer-events:none;font-weight:900;font-size:1.05rem;text-shadow:0 2px 4px #000}';document.head.appendChild(st)})();

function init(){
  if(!$('battlePanel')||typeof generateBoard!=='function'||typeof meta==='undefined'&&false)return setTimeout(init,50);
  rebuildPage();embers();hook();
  /* Falls das Spiel schon laeuft (meta existiert), sofort Brett bauen */
  try{if(typeof meta!=='undefined'&&meta&&meta.hero){generateBoard();updateUI()}}catch(e){}
  addEventListener('resize',function(){if(K&&K.cur)place()});
  var li=$('loginOverlay');if(li){new MutationObserver(function(){syncFace()}).observe(li,{attributes:true})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
/* ===== HELDENABTEIL + SCHMIEDE ===== */
(function(){
if(typeof ITEMS==='undefined'||typeof inventory==='undefined')return;
var NEWI=[
['bow1','Holzbogen','bow','normal',3,0],['bow2','Jagdbogen','bow','gruen',8,0],['bow3','Elfenbogen','bow','blau',18,0],['bow4','Drachenbogen','bow','episch',35,0],['bow5','Himmelsbogen','bow','legendaer',60,0],
['staff1','Holzstab','staff','normal',3,0],['staff2','Kristallstab','staff','gruen',8,0],['staff3','Mondstab','staff','blau',18,0],['staff4','Arkanstab','staff','episch',35,0],['staff5','Sternenstab','staff','legendaer',60,0],
['cape1','Stoffumhang','cape','normal',0,3],['cape2','Reiseumhang','cape','gruen',0,8],['cape3','Nachtumhang','cape','blau',2,15],['cape4','Schattenumhang','cape','episch',5,25],['cape5','Engelsumhang','cape','legendaer',10,40],
['helm4','Drachenhelm','helm','episch',12,30],['helm5','Himmelshelm','helm','legendaer',18,55]];
NEWI.forEach(function(n){if(ITEMS.some(function(x){return x.id===n[0]}))return;
 ITEMS.push({id:n[0],name:n[1],type:n[2],rarity:n[3],atk:n[4],hp:n[5],desc:(n[4]?'+'+n[4]+' ATK':'')+(n[4]&&n[5]?' ':'')+(n[5]?'+'+n[5]+' HP':'')})});
TYPE_LABEL.bow='Bogen';TYPE_LABEL.staff='Stab';TYPE_LABEL.cape='Umhang';
function pushAll(a,l){l.forEach(function(x){a.push(x)})}
pushAll(MONSTER_POOL,['bow1','staff1','cape1']);
pushAll(BOSS_POOL,['bow2','bow3','bow4','bow5','staff2','staff3','staff4','staff5','cape2','cape3','cape4','cape5','helm4','helm5']);
try{pushAll(CHEST_CONFIG.wood.itemPool,['bow1','staff1','cape1']);pushAll(CHEST_CONFIG.dia.itemPool,['bow2','bow3','staff2','staff3','cape2','cape3']);
pushAll(CHEST_CONFIG.legend.itemPool,['bow3','bow4','staff3','staff4','cape4','helm4']);pushAll(CHEST_CONFIG.sin.itemPool,['bow4','bow5','staff4','staff5','cape5','helm5'])}catch(e){}
var TI=[2,5,9,15],RAR=['gruen','blau','episch','legendaer'];
var FXD=[['feuer','ring','🔥 Feuerring',function(v){return 'Brennt: '+v+'% der Gegner-Leben pro Runde'}],
 ['eis','ring','❄️ Eisring',function(v){return v*2+'% Gegner setzt aus'}],
 ['erde','ring','🪨 Erdring',function(v){return '-'+v*2+'% erlittener Schaden'}],
 ['donner','ring','⚡ Donnerring',function(v){return v*2+'% Doppeltreffer'}],
 ['dodge','cape','Windumhang',function(v){return v+'% Ausweichen'}],
 ['regen','cape','Lebensumhang',function(v){return v+'% Leben pro Zug'}],
 ['goldm','cape','Goldumhang',function(v){return '+'+v+'% Gold'}]];
FXD.forEach(function(f){RAR.forEach(function(r,k){var id='fx_'+f[0]+(k+1);if(ITEMS.some(function(x){return x.id===id}))return;
 var cv=f[0]==='dodge'?[3,6,10,15][k]:f[0]==='regen'?[1,2,3,4][k]:f[0]==='goldm'?[10,20,35,50][k]:TI[k];
 ITEMS.push({id:id,name:f[2],type:f[1],rarity:r,atk:0,hp:0,fx:{k:f[0],v:cv},desc:f[3](cv)})})});
pushAll(BOSS_POOL,['fx_feuer2','fx_eis2','fx_erde2','fx_donner2','fx_feuer3','fx_eis3','fx_erde3','fx_donner3','fx_dodge2','fx_regen2','fx_goldm2','fx_dodge3','fx_regen3','fx_goldm3','fx_feuer4','fx_donner4','fx_dodge4','fx_regen4']);
pushAll(MONSTER_POOL,['fx_feuer1','fx_eis1','fx_erde1','fx_donner1','fx_dodge1','fx_regen1','fx_goldm1']);
try{pushAll(CHEST_CONFIG.wood.itemPool,['fx_feuer1','fx_erde1','fx_dodge1','fx_goldm1']);
pushAll(CHEST_CONFIG.dia.itemPool,['fx_feuer2','fx_eis2','fx_erde2','fx_donner2','fx_dodge2','fx_regen2','fx_goldm2','fx_feuer3','fx_regen3']);
pushAll(CHEST_CONFIG.legend.itemPool,['fx_feuer3','fx_eis3','fx_erde3','fx_donner3','fx_dodge3','fx_regen3','fx_goldm3','fx_feuer4','fx_donner4']);
pushAll(CHEST_CONFIG.sin.itemPool,['fx_feuer4','fx_eis4','fx_erde4','fx_donner4','fx_dodge4','fx_regen4','fx_goldm4'])}catch(e){}

/* ---- Instanzen: jedes Item hat Zustand + Sterne ---- */
var RANK=['normal','gruen','blau','episch','legendaer','mystisch'];
var CN=['Gebraucht','Wie neu','Perfekt'],CC=['#aaa','#8fd8ff','#ffd24a'],CM=[.85,1,1.2];
function base(id){return ITEMS.find(function(x){return x.id===id})}
function ens(){
 if(inventory.inst)return;
 inventory.inst={};inventory.nid=1;inventory.iron=inventory.iron||0;inventory.orbs=inventory.orbs||{};
 var old=Array.isArray(inventory.items)?inventory.items.slice():[],map={};inventory.items=[];
 old.forEach(function(id){if(!base(id))return;var u='u'+inventory.nid++;inventory.inst[u]={b:id,c:1,s:Math.min(3,((inventory.lv&&inventory.lv[id])||1)-1)};map[id]=u;inventory.items.push(u)});
 var e=inventory.equipped||{};for(var t in e){if(map[e[t]])e[t]=map[e[t]];else delete e[t]}
 var a=inventory.ally||{};for(var k in a)for(var t2 in a[k]){if(map[a[k][t2]])a[k][t2]=map[a[k][t2]];else delete a[k][t2]}
 delete inventory.lv;try{saveInventory()}catch(x){}}
function it(uid){ens();var n=inventory.inst[uid];if(!n)return null;var b=base(n.b);if(!b)return null;
 var o={};for(var k in b)o[k]=b[k];o.id=uid;o.bid=n.b;o.c=n.c;o.s=n.s;return o}
function bump(k,n){ens();var t=inventory.stats=inventory.stats||{};t[k]=(t[k]||0)+(n||1)}
function give(bid,c){ens();bump('found');var u='u'+inventory.nid++;inventory.inst[u]={b:bid,c:c,s:0};inventory.items.push(u);try{saveInventory()}catch(e){}return it(u)}
function mul(i){return CM[i.c]*(1+.15*i.s)}
function st(i){var m=mul(i);return{atk:Math.round((i.atk||0)*m),hp:Math.round((i.hp||0)*m)}}
function fxv(i){return i.fx?i.fx.v*CM[i.c]*(1+.07*i.s):0}
function stars(i){return '★'.repeat(i.s)+'☆'.repeat(3-i.s)}
function descOf(i){var d;if(i.fx){var f=FXD.filter(function(x){return x[0]===i.fx.k})[0],v=Math.round(fxv(i)*10)/10;
  d=f[3](v)}else{var q=st(i);d=(q.atk?'+'+q.atk+' ATK':'')+(q.atk&&q.hp?' ':'')+(q.hp?'+'+q.hp+' HP':'')}return d}
function ai(){ens();if(!inventory.ally)inventory.ally={arc:{},mag:{}};if(!inventory.ally.arc)inventory.ally.arc={};if(!inventory.ally.mag)inventory.ally.mag={};return inventory.ally}
function gear(w){return w==='hero'?inventory.equipped:ai()[w]}
function wearer(uid){var i=it(uid);if(!i)return null;if(inventory.equipped[i.type]===uid)return'hero';var a=ai();for(var k in a)if(a[k][i.type]===uid)return k;return null}
function worn(){ens();var r=[],g=inventory.equipped;for(var t in g){var i=it(g[t]);if(i)r.push({w:'hero',i:i})}var a=ai();for(var k in a)for(var t2 in a[k]){var j=it(a[k][t2]);if(j)r.push({w:k,i:j})}return r}
function fxSum(k,w){var s=0;worn().forEach(function(x){if(x.i.fx&&x.i.fx.k===k&&(!w||x.w===w))s+=fxv(x.i)});return s}
function restat(uid,fn){var i0=it(uid),o=i0?st(i0):{atk:0,hp:0},w=wearer(uid);fn();var n=st(it(uid));
 if(w&&meta){if(w==='hero')meta.attack=Math.max(1,meta.attack+n.atk-o.atk);meta.maxHp=Math.max(1,meta.maxHp+n.hp-o.hp);meta.hp=Math.min(meta.hp,meta.maxHp);try{updateUI()}catch(e){}}}
window.__kamAllyBonus=function(w){var g=ai()[w]||{},a=0;for(var t in g){var i=it(g[t]);if(i)a+=st(i).atk}return a};
function allyHp(){var a=ai(),h=0;for(var k in a)for(var t in a[k]){var i=it(a[k][t]);if(i)h+=st(i).hp}return h}
window.getEquippedBonuses=function(){ens();var a=0,h=allyHp();for(var t in inventory.equipped){var i=it(inventory.equipped[t]);if(i){var q=st(i);a+=q.atk;h+=q.hp}}return{atk:a,hp:h}};
function clv(){try{return window.__cl!=null?window.__cl:getClassLevel()}catch(e){return 0}}

/* ---- Kampf-Effekte ---- */
window.__kamGoldM=function(){return (1+fxSum('goldm')/100)*(1+suLv('gold')*.02)*(1+(prestigeData.count||0)*.15)};
window.__kamDiaReward=function(b){return Math.round(b*(1+(prestigeData.count||0)*.15))+suLv('dias')};
window.__kamMonHit=function(m,md){
 if(Math.random()*100<fxSum('eis')*2){fl('❄️ erstarrt','#8fd8ff');return 0}
 if(Math.random()*100<fxSum('dodge')){fl('💨 Ausgewichen','#cfe');return 0}
 var er=Math.min(60,fxSum('erde')*2);if(er>0)md=Math.max(1,Math.round(md*(1-er/100)));return md};
function kamStrike(){
 var m=monstersInFight&&monstersInFight[0];if(!m||meta.hp<=0)return;
 var bf=fxSum('feuer');if(bf>0){var b=Math.max(1,Math.round(m.maxHp*(bf/100)*(m.isBoss?.5:1)));m.hp=Math.max(1,m.hp-b);fl('🔥 -'+b,'#ff8a3a')}
 var bs=meta.attack;
 try{allyStrike()}catch(e){}
 if(Math.random()*100<fxSum('donner','hero')*2){meta.attack+=bs;setTimeout(function(){meta.attack-=bs},0);fl('⚡ Doppeltreffer','#ffe14a')}}
allyStrike=function(){var L=allyList();if(!L.length)return;allyRound++;var d=0;
 L.forEach(function(a,k){var dm=Math.max(1,Math.round(meta.attack*a.mult)+window.__kamAllyBonus(a.id));
  if(Math.random()*100<fxSum('donner',a.id)*2)dm*=2;
  d+=dm;setTimeout(function(){animAlly(a,dm)},170+k*230)});
 meta.attack+=d;setTimeout(function(){meta.attack-=d},0);
 if(L.some(function(a){return a.heal})&&allyRound%3===0)setTimeout(function(){
  if(!inFight||meta.hp<=0)return;var h=Math.max(1,Math.round(meta.maxHp*.08));meta.hp=Math.min(meta.maxHp,meta.hp+h);
  fl('+'+h+' ❤ Magierin','#d070ff');try{updateUI()}catch(e){}},760)};
var oLand=land;land=function(){var rg=fxSum('regen');if(rg>0&&meta&&meta.hp>0){var h=Math.max(1,Math.round(meta.maxHp*rg/100));meta.hp=Math.min(meta.maxHp,meta.hp+h)}return oLand.apply(this,arguments)};

/* ---- Drops ---- */
var ORB={blau:['🔵','Blaue Kugel'],lila:['🟣','Lila Kugel'],orange:['🟠','Orange Kugel']};
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function condRoll(used,perf){var r=Math.random()*100;if(r<perf)return 2;return Math.random()*100<used?0:1}
function loot(iron,orbs){ens();var m='';if(iron>0){inventory.iron=(inventory.iron||0)+iron;bump('ironTotal',iron);m+=' +'+iron+' 🔩'}
 for(var k in orbs)if(Math.random()*100<orbs[k]){inventory.orbs[k]=(inventory.orbs[k]||0)+1;m+=' +'+ORB[k][0]}
 try{saveInventory()}catch(e){}return m}
var BAGMAX=15;
function bagCount(){ens();return inventory.items.filter(function(u){return!wearer(u)}).length}
function price(i){return Math.round([5,15,40,100,250,600][RANK.indexOf(i.rarity)]*[.8,1,1.6][i.c]*(1+.5*i.s))}
function kk(){try{return Math.max(1,K&&K.k||1)}catch(e){return 1}}
function lootBonus(){try{return (typeof cityBonus==='function'?(cityBonus('loot')||0):0)+suLv('loot')+(prestigeData.count||0)*2}catch(e){return 0}}
function giveOrSell(bid,c,force){var b=base(bid);if(!b)return{};
 if(!force&&bagCount()>=BAGMAX){var tmp={rarity:b.rarity,c:c,s:0};var g=price(tmp);if(meta)meta.gold+=g;return{sold:g,name:b.name,rarity:b.rarity,c:c}}
 return{item:give(bid,c)}}
window.__kamSell=function(u){var i=it(u);if(!i||wearer(u))return;
 if(window.__kamSellArm!==u){window.__kamSellArm=u;render();return}
 window.__kamSellArm=null;bump('sold');var g=price(i);if(meta)meta.gold+=g;delete inventory.inst[u];inventory.items.splice(inventory.items.indexOf(u),1);
 try{saveInventory()}catch(e){}try{updateUI()}catch(e){}try{toast('Verkauft: +'+g+' Gold')}catch(e){}render()};
function condDrop(k,boss){var wn=(.5+(k-1)*.9)*(boss?1.5:1),pf=k<7?0:(k-6)*.1*(boss?2:1),c=0;
 if(Math.random()*100<wn)c=1;if(Math.random()*100<pf)c=2;
 if(c<2&&Math.random()*100<lootBonus())c++;return c}
function orbDrop(k){var pO=k<7?0:(k-6)*.06,pL=k<3?0:Math.min(.6,(k-2)*.1+.1),r=Math.random(),o=r<pO?'orange':r<pO+pL?'lila':'blau';
 if(Math.random()*100<lootBonus())o=o==='blau'?'lila':'orange';return o}
function perfectGift(minRank,why){var pool=ITEMS.filter(function(x){return RANK.indexOf(x.rarity)===minRank&&!x.fx});
 var b=pool[Math.floor(Math.random()*pool.length)];if(!b)return;var r=giveOrSell(b.id,2,true);
 try{toast('🎁 '+why+': '+b.name+' (Perfekt)')}catch(e){}log('<span style="color:#ffd24a">🎁 '+why+': '+b.name+' · Perfekt</span>');
 showItemPopup({name:b.name+' · Perfekt',rarity:b.rarity,type:b.type,desc:descOf(r.item)})}
var PX={1:{items:[['armor5',2]],lila:1},2:{souls:5},3:{orange:1},4:{souls:10},5:{perfect:1,orange:2},6:{orange:1},7:{orange:1},8:{orange:1},9:{orange:1},10:{perfect:1,orange:3}};
var HG={10:[['armor2',0]],20:[['ring2',0]],25:[['cape3',0]],30:[['helm4',1]],40:[['bow4',1]],50:[['armor4',1]],60:[['staff4',1]],70:[['cape4',2]],80:[['helm5',2]],90:[['ring4',2]],100:[['sword5',2]]};
var HX={10:{blau:1},15:{blau:1},20:{blau:2},25:{iron:10},30:{lila:1,blau:1},35:{blau:2},40:{lila:1,iron:20},45:{lila:1},50:{lila:2},55:{lila:1},60:{lila:2},65:{orange:1},70:{orange:1,iron:30},75:{lila:2},80:{orange:2},85:{orange:1},90:{orange:2},95:{orange:2},100:{orange:3}};
var CG={10:[['ring2',0]],20:[['armor4',0]],30:[['sword4',1]],40:[['cape4',1]],50:[['helm5',1]],70:[['bow5',2]],90:[['staff5',2]],100:[['armor5',2]]};
var CX={5:{iron:5},20:{iron:15},25:{lila:1},40:{orange:1},60:{orange:1},80:{orange:2}};
function grant(items,ex,why){var t=[];(items||[]).forEach(function(g){var r=giveOrSell(g[0],g[1],true);if(r.item)t.push(r.item.name+' ('+CN[g[1]]+')')});
 ex=ex||{};if(ex.iron){inventory.iron=(inventory.iron||0)+ex.iron;bump('ironTotal',ex.iron);t.push('🔩 '+ex.iron)}
 ['blau','lila','orange'].forEach(function(o){if(ex[o]){inventory.orbs[o]=(inventory.orbs[o]||0)+ex[o];t.push(ORB[o][0]+' ×'+ex[o])}});
 if(t.length){try{toast('🎁 '+why+': '+t.join(', '))}catch(e){}log('<span style="color:#ffd24a">🎁 '+why+': '+t.join(', ')+'</span>')}}
function maxHeroLv(){var m=0;try{for(var h in heroData)m=Math.max(m,getHeroLevel(h))}catch(e){}return m}
function milestones(){if(!meta||!meta.hero)return;ens();var ms=inventory.ms=inventory.ms||{},ch=false;
 try{if(ms.p1)ms.P1=1;for(var pn=1;pn<=(prestigeData.count||0);pn++){if(!ms['P'+pn]){ms['P'+pn]=1;ch=true;var px=PX[Math.min(pn,10)];if(px){grant(px.items,px,'Prestige '+pn);if(px.souls){pd().souls+=px.souls;savePrestige()}if(px.perfect)perfectGift(4,'Prestige '+pn)}}}}catch(e){}
 var hl=maxHeroLv(),cl=clv();
 for(var L=5;L<=100;L+=5){if(hl>=L&&!ms['H'+L]){ms['H'+L]=1;if(HG[L]||HX[L]){ch=true;grant(HG[L],HX[L],'Held-Level '+L)}}
  if(cl>=L&&!ms['C'+L]){ms['C'+L]=1;if(CG[L]||CX[L]){ch=true;grant(CG[L],CX[L],'Klassen-Level '+L)}}}
 if(ch)try{saveInventory()}catch(e){}}
window.__kamLvReward=function(L){var r=(typeof LEVEL_REWARDS!=='undefined'&&LEVEL_REWARDS[L-1])||{};return{g:r.g||0,h:r.h||0,a:r.a||0,d:r.d||0}};

/* ---- Neue Quests ---- */
(function(){
if(typeof QUEST_LIST==='undefined')return;
function tr(f){return function(){try{return f()||0}catch(e){return 0}}}
function cityB(){try{return JSON.parse(localStorage.getItem('robCity')||'{}').b||{}}catch(e){return {}}}
var BL=['mine','dia','smith','house','bank','tower'];
function cSum(){var b=cityB(),t=0;BL.forEach(function(x){t+=b[x]||0});return t}
function cBuilt(){var b=cityB(),t=0;BL.forEach(function(x){if((b[x]||0)>=1)t++});return t}
function stt(k){return function(){ens();return (inventory.stats&&inventory.stats[k])||0}}
function insts(){ens();return Object.keys(inventory.inst).map(function(u){return it(u)}).filter(Boolean)}
function perf(r){return function(){return insts().some(function(i){return i.c===2&&i.rarity===r})?1:0}}
var dTot=function(){return Object.keys(BD).length+Object.keys(SD).length};
var Q=[
 ['ct1','Baue dein erstes Gebäude','🏙️ Stadt',1,tr(function(){return cSum()>=1?1:0})],
 ['ct2','Baue alle 6 Gebäude','🏙️ Stadt',6,tr(cBuilt)],
 ['ct3','Stadt-Gesamtstufe 15','🏙️ Stadt',15,tr(cSum)],
 ['ct4','Stadt-Gesamtstufe 30','🏙️ Stadt',30,tr(cSum)],
 ['ct5','Stadt-Gesamtstufe 60','🏙️ Stadt',60,tr(cSum)],
 ['ct6','Schmiede auf Stufe 5','🏙️ Stadt',5,tr(function(){return cityB().smith})],
 ['ct7','Kaserne auf Stufe 10','🏙️ Stadt',10,tr(function(){return cityB().house})],
 ['ct9','Maximiere deine Stadt','🔒 Geheim',90,tr(cSum),function(){return cBuilt()>=6}],
 ['dw7','Bringe den Stadtwürfel auf Stufe 2','🔒 Geheim',2,tr(cityTier),function(){return OWN.indexOf('city')>=0}],
 ['dw8','Bringe den Stadtwürfel auf Stufe 4','🔒 Geheim',4,tr(cityTier),function(){return OWN.indexOf('city')>=0}],
 ['dw9','Bringe den Stadtwürfel auf Stufe 6','🔒 Geheim',6,tr(cityTier),function(){return OWN.indexOf('city')>=0}],
 ['hr1','Besitze 5 Helden','🦸 Helden',5,tr(function(){return Object.keys(heroData).length})],
 ['hr2','Besitze 8 Helden','🦸 Helden',8,tr(function(){return Object.keys(heroData).length})],
 ['hr3','Erreiche Prestige 1','🦸 Helden',1,tr(function(){return prestigeData.count})],
 ['hr4','Erreiche Prestige 3','🦸 Helden',3,tr(function(){return prestigeData.count})],
 ['hr5','Wähle deine erste Klasse','🦸 Helden',1,tr(function(){return playerClasses.length>0?1:0})],
 ['dw1','Besitze 3 Würfel','🎲 Würfel',3,tr(function(){return OWN.length})],
 ['dw2','Besitze 5 Würfel','🎲 Würfel',5,tr(function(){return OWN.length})],
 ['dw3','Besitze alle Würfel','🎲 Würfel',0,tr(function(){return OWN.length}),null,dTot],
 ['dw4','Sammle 25 Würfel auf dem Brett','🎲 Würfel',25,tr(function(){return ST.dice})],
 ['dw5','Sammle 100 Würfel auf dem Brett','🎲 Würfel',100,tr(function(){return ST.dice})],
 ['dw6','Sammle 500 Würfel auf dem Brett','🎲 Würfel',500,tr(function(){return ST.dice})],
 ['ar1','Finde dein erstes Item','🎒 Ausrüstung',1,stt('found')],
 ['ar2','Finde 25 Items','🎒 Ausrüstung',25,stt('found')],
 ['ar3','Trage Helm, Rüstung, Umhang, Waffe und Ring zugleich','🎒 Ausrüstung',5,tr(function(){ens();return ['helm','armor','cape','weapon','ring'].filter(function(t){return inventory.equipped[t]}).length})],
 ['ar4','Besitze ein Item in "Wie neu"','🎒 Ausrüstung',1,tr(function(){return insts().some(function(i){return i.c>=1})?1:0})],
 ['ar5','Besitze ein perfektes Item','🎒 Ausrüstung',1,tr(function(){return insts().some(function(i){return i.c===2})?1:0})],
 ['ar6','Besitze ein perfektes grünes Item','🎒 Ausrüstung',1,perf('gruen')],
 ['ar7','Besitze ein perfektes blaues Item','🎒 Ausrüstung',1,perf('blau')],
 ['ar8','Besitze ein perfektes episches Item','🔒 Geheim',1,perf('episch'),function(){return insts().some(function(i){return i.c===2})}],
 ['ar9','Besitze ein perfektes legendäres Item','🔒 Geheim',1,perf('legendaer'),function(){return insts().some(function(i){return i.c===2&&RANK.indexOf(i.rarity)>=3})}],
 ['ar10','Fülle deinen Beutel mit 15 Items','🎒 Ausrüstung',15,tr(function(){return bagCount()})],
 ['sm1','Schmiede dein erstes Item erfolgreich','⚒️ Schmiede',1,stt('forged')],
 ['sm2','Schmiede 10 Mal erfolgreich','⚒️ Schmiede',10,stt('forged')],
 ['sm3','Bringe ein Item auf 3 Sterne','⚒️ Schmiede',1,tr(function(){return insts().some(function(i){return i.s>=3})?1:0})],
 ['sm4','Werte ein Item mit einer Kugel auf','⚒️ Schmiede',1,stt('upgraded')],
 ['sm5','Verkaufe 10 Items','⚒️ Schmiede',10,stt('sold')],
 ['sm6','Sammle 100 Eisenbarren','⚒️ Schmiede',100,stt('ironTotal')],
 ['km1','Besiege den Boss von Kammer 3','🗺️ Kammern',3,stt('maxBoss')],
 ['km2','Besiege den Boss von Kammer 5','🗺️ Kammern',5,stt('maxBoss')],
 ['km3','Besiege den Boss von Kammer 7','🗺️ Kammern',7,stt('maxBoss')],
 ['km4','Besiege den Boss von Kammer 10','🗺️ Kammern',10,stt('maxBoss')]];
Q.forEach(function(x){if(QUEST_LIST.some(function(y){return y.id===x[0]}))return;
 var o={id:x[0],name:x[1],cat:x[2],target:x[3],getValue:(function(f,tf){return function(){var v=f();return v}})(x[4])};
 if(x[5])o.secret=x[5];
 if(x[6]){Object.defineProperty(o,'target',{get:x[6]})}
 QUEST_LIST.push(o)});
})();

/* ---- Prestige: Seelen ---- */
function pd(){prestigeData.su=prestigeData.su||{};prestigeData.souls=prestigeData.souls||0;return prestigeData}
function suLv(k){try{return pd().su[k]||0}catch(e){return 0}}
var SU=[['gold','💰','Seelen-Gold','+2% Gold pro Stufe',25],['dias','💎','Seelen-Diamanten','+1 Diamant pro Boss und Stufe',10],['atk','⚔','Seelen-Schlag','+3% Angriff pro Stufe',25],['loot','🍀','Seelen-Glück','+1% besserer Loot pro Stufe',20]];
function suCost(k){return 10+5*suLv(k)}
window.__kamSuDias=function(){return suLv('dias')};
window.__kamSuMult=function(k){return 1+suLv(k)*(k==='hp'?.04:.03)};
window.__kamDeathSoul=function(){pd().souls+=1;try{savePrestige()}catch(e){}try{log('<span style="color:#cc88ff">💜 +1 Seele</span>')}catch(e){}};
var HPMAX=20;function hpCost(){return 5+2*suLv('hp')}
window.__kamHpSoul=function(){var l=suLv('hp');if(l>=HPMAX||pd().souls<hpCost())return;pd().souls-=hpCost();pd().su.hp=l+1;try{savePrestige()}catch(e){}try{var f=(1+(l+1)*.04)/(1+l*.04),o=meta.maxHp;meta.maxHp=Math.floor(o*f);meta.hp+=meta.maxHp-o;updateUI()}catch(e){}try{showCity();cityOpen('house')}catch(e){}};
var _co=window.cityOpen;window.cityOpen=function(id){_co(id);if(id!=='house')return;var pn=document.getElementById('cityPanel');if(!pn)return;var l=suLv('hp'),mx=l>=HPMAX,c=hpCost();pn.firstChild.insertAdjacentHTML('beforeend','<div style="margin-top:12px;padding-top:10px;border-top:1px solid #c9a227"><div style="font-weight:700">💜 Seelen-Training · Stufe '+l+'/'+HPMAX+'</div><div style="font-size:.78rem;margin:4px 0">+4% Leben pro Stufe (jetzt +'+(l*4)+'%). Pro Tod bekommst du 1 Seele, sie bleiben beim Prestige.</div><div style="font-size:.8rem;margin-bottom:6px">Deine Seelen: '+pd().souls+'</div>'+(mx?'<div style="color:#8f8">Maximal</div>':'<button class="btn btn-wide" '+(pd().souls<c?'disabled ':'')+'onclick="__kamHpSoul()" style="padding:9px 18px">TRAINIEREN · 💜 '+c+'</button>')+'</div>')};
function soulGain(){ens();return 10+3*((inventory.stats&&inventory.stats.maxBoss)||0)+Math.floor(maxHeroLv()/2)}
window.__kamSoulGain=function(){return soulGain()};
window.__kamSoulGrant=function(){var g=soulGain();pd().souls+=g;try{savePrestige()}catch(e){}try{toast('💜 +'+g+' Seelen')}catch(e){}};
window.__kamSuBuy=function(k){var d=SU.filter(function(x){return x[0]===k})[0];if(!d||suLv(k)>=d[4])return;var c=suCost(k);if(pd().souls<c)return;pd().souls-=c;pd().su[k]=suLv(k)+1;try{savePrestige()}catch(e){}levelsUI()};

var PL=[[5,'Beute I',[],0,0],[6,'Beute II',['dia'],0,0],[7,'Beute III',[],1000,50],[8,'Beute IV',['dia','dia'],0,0],[9,'Beute V',[],1000,100],[10,'Beute VI',['legend'],1000,50]];
var CHN={wood:'Holzkiste',dia:'Diamant-Kiste',legend:'Legendäre Kiste',sin:'Todsünde-Kiste'};
window.__kamPrestigeLoot=function(top){var r=null;PL.forEach(function(p){if(top>=p[0])r=p});return r?{boss:r[0],name:r[1],chests:r[2],gold:r[3],dias:r[4]}:{boss:0,name:'',chests:[],gold:0,dias:0}};
window.__kamPrestigeGrant=function(l){try{milestones()}catch(e){}if(!(l.chests||[]).length&&!l.gold&&!l.dias)return;var m='';(l.chests||[]).forEach(function(t){try{m+=window.__kamChest(t,CHEST_CONFIG[t])}catch(e){}});try{log('<span style="color:#cc88ff">💜 Prestige-Beute: '+((l.chests||[]).map(function(t){return CHN[t]}).join(' + ')||'Keine Kiste')+' · +'+l.gold+' Gold · +'+l.dias+' Dias</span>'+m)}catch(e){}};
function lootHtml(){var t=prestigeData.top||0,cur=window.__kamPrestigeLoot(t),h='<div class="card" style="margin-bottom:12px"><h3>🎁 Prestige-Beute<span>Höchster Boss: '+t+'</span></h3><div style="font-size:11px;color:#a08aa8;margin-bottom:6px">Je höher dein bester Boss seit dem letzten Prestige, desto größer die Beute. Dazu kommt die Hälfte deines Goldes als Startgold.</div>';
 PL.forEach(function(p){var ok=t>=p[0],now=cur.boss===p[0];h+='<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:12px;'+(now?'color:#f0c040;font-weight:bold':(ok?'color:#9a8':'color:#887'))+'"><span>Boss '+p[0]+(p[0]===10?'+':'')+'</span><span style="text-align:right">'+(!p[2].length&&!p[3]?'keine Beute (nur Prestige)':[p[2].map(function(c){return CHN[c]}).join(' + '),p[3]?'💰'+p[3]:'',p[4]?'💎'+p[4]:''].filter(Boolean).join(' · '))+'</span></div>'});
 return h+'</div>'}
var SHL=0,SHS=0;window.__kamShowLoot=function(){SHL=!SHL;if(SHL)SHS=0;levelsUI()};window.__kamShowShop=function(){SHS=!SHS;if(SHS)SHL=0;levelsUI()};
window.__kamSuUnlock=function(k){var p=pd();p.sun=p.sun||{};if(p.sun[k])return;var g=Math.max(meta.gold||0,0);if(g<500)return;meta.gold=g-500;try{savePersistentGold(meta.gold)}catch(e){}p.sun[k]=1;try{savePrestige()}catch(e){}levelsUI()};
function pxChips(n){var p=PX[n]||{},h='';(p.items||[]).forEach(function(g){h+='<span class="pxc pf">🛡 Perfekte '+base(g[0]).name+'</span>'});if(p.perfect)h+='<span class="pxc pf">🌟 Perfektes legendäres Item</span>';['blau','lila','orange'].forEach(function(o){if(p[o])h+='<span class="pxc">'+ORB[o][0]+' '+p[o]+(p[o]>1?' Kugeln':' Kugel')+'</span>'});if(p.souls)h+='<span class="pxc">💜 +'+p.souls+' Seelen</span>';return h||'<span class="pxc" style="opacity:.6">keine Extras</span>'}
function prestigeTab(){
 pd();var hb=prestigeData.hb||0,tk=prestigeData.prestigeAvailable||0,pc=Math.min(100,(hb%10)/10*100),c=prestigeData.count||0;
 var r='<style>.pxb{flex:1;font-size:12px!important;padding:10px 4px!important}.pxr{display:flex;gap:10px;align-items:center;background:linear-gradient(135deg,#1a0f2a,#0d0814);border:2px solid #3a2858;border-radius:14px;padding:10px;margin-bottom:8px}.pxr.dn{border-color:#4a9a6a;opacity:.85}.pxr.nx{border-color:#f0c040;box-shadow:0 0 14px #f0c04055}.pxn{min-width:38px;height:38px;border-radius:50%;background:#2a1a40;border:2px solid #7a5aa8;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#ffd24a;font-size:16px}.pxr.dn .pxn{background:#1f5a38;border-color:#6fcf97;color:#fff}.pxr.nx .pxn{background:#f0c040;color:#2a1245;border-color:#fff}.pxc{display:inline-block;font-size:11px;background:#2a1a40;border:1px solid #5a3a88;border-radius:8px;padding:2px 7px;margin:2px 3px 0 0;color:#ffe9c4}.pxc.pf{border-color:#ffd24a;color:#ffd24a}.pxc.st{background:#3a1a2a;border-color:#a04060}.pxc.gd{background:#2a2a10;border-color:#a09030}</style>'+
 '<div class="hr"><img src="hero/idle0.webp"><div class="t"><div class="lv">Prestige '+c+'</div><small>Ab Boss 5 kannst du Prestige machen</small><div class="bar"><i style="width:'+pc+'%"></i></div><small>'+(hb%10)+' / 10 Bosse ab Boss 5 für das nächste Token · Token: '+tk+'</small></div></div>'+
 '<div style="display:flex;gap:6px;margin:10px 0"><button class="btn btn-wide pxb" onclick="__kamShowLoot()">🎁 Beute</button><button class="btn btn-wide pxb" style="flex:1.6" '+(tk>0?'':'disabled ')+'onclick="document.getElementById(\'kamLevels\').style.display=\'none\';window.__kamFromLv=1;doPrestige()">💜 Prestige durchführen</button><button class="btn btn-wide pxb" onclick="__kamShowShop()">🛒 Shop</button></div>'+(SHL?lootHtml():'');
 if(SHS){r+='<div style="font-size:13px;color:#f0c040;margin:4px 0 4px;display:flex;justify-content:space-between"><b>💜 Seelen-Shop</b><span>Seelen: '+prestigeData.souls+'</span></div><div style="font-size:11px;color:#a08aa8;margin-bottom:8px">Einmal für 💰500 freischalten, danach mit Seelen aufleveln. Das Leben trainierst du in der Kaserne.</div>';
  SU.forEach(function(d){var lv=suLv(d[0]),c2=suCost(d[0]),mx=lv>=d[4],un=!!(prestigeData.sun&&prestigeData.sun[d[0]]);
   r+='<div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:10px"><div style="font-size:24px">'+d[1]+'</div><div style="flex:1"><div style="font-size:13px">'+d[2]+' <span style="color:#a08aa8;font-size:11px">Stufe '+lv+'/'+d[4]+'</span></div><div style="font-size:11px;color:#a08aa8">'+d[3]+'</div></div>'+
   (un?'<button class="btn btn-sm" '+((mx||prestigeData.souls<c2)?'disabled ':'')+'onclick="__kamSuBuy(\''+d[0]+'\')">'+(mx?'MAX':'💜 '+c2)+'</button>':'<button class="btn btn-sm" '+((meta.gold||0)<500?'disabled ':'')+'onclick="__kamSuUnlock(\''+d[0]+'\')">💰 500</button>')+'</div>'});
  return r}
 r+='<div style="font-size:13px;color:#f0c040;margin:6px 0 8px"><b>Belohnungen pro Prestige</b></div>';
 for(var n=1;n<=10;n++){var d=n<=c,nxt=n===c+1;r+='<div class="pxr'+(d?' dn':nxt?' nx':'')+'"><div class="pxn">'+(d?'✓':n)+'</div><div style="flex:1"><div style="font-size:13px;color:#ffe9c4;margin-bottom:2px">Prestige '+n+(nxt?' · als Nächstes':'')+'</div><span class="pxc st">⚔ Gegner +'+(12*n)+'%</span><span class="pxc gd">💰💎 +'+(15*n)+'%</span><span class="pxc">🍀 Loot +'+(2*n)+'%</span><div>'+pxChips(n)+'</div></div></div>'}
 r+='<div style="font-size:11px;color:#a08aa8;margin:6px 0 12px">Danach je Prestige weiter +12% Gegner, +15% Gold &amp; Dias, +2% Loot. Zurückgesetzt wird nur das Heldenlevel, Shop-Upgrades und die Hälfte deines Goldes. Seelen: 1 pro Tod plus ca. '+soulGain()+' beim Prestige.</div>';
 return r}
/* ---- Level-Fenster ---- */
var LM=1;
function ico(id){var b=base(id),c={normal:'g',gruen:'g',blau:'b',episch:'p',legendaer:'o',mystisch:'o'}[b.rarity]||'g',n={weapon:'sword',armor:'armor',helm:'helm',ring:'ring',bow:'bow',staff:'staff',cape:'cape'}[b.type]||'sword';return 'items/'+n+'_'+c+'.webp'}
function chips(items,ex){var h='';(items||[]).forEach(function(g){var b=base(g[0]);h+='<span class="lc big'+(g[1]===2?' pf':'')+'"><img src="'+ico(g[0])+'">'+({weapon:'Waffe',armor:'Rüstung',helm:'Helm',ring:'Ring',bow:'Bogen',staff:'Stab',cape:'Umhang'}[b.type])+' · '+CN[g[1]]+'</span>'});
 ex=ex||{};if(ex.iron)h+='<span class="lc">🔩 '+ex.iron+'</span>';['blau','lila','orange'].forEach(function(o){if(ex[o])h+='<span class="lc">'+ORB[o][0]+' '+ex[o]+(ex[o]>1?' Kugeln':' Kugel')+'</span>'});return h}
var RK={10:['🥉','Bronze','#cd7f32'],25:['🥈','Silber','#ccc'],50:['🥇','Gold','#ffd700'],80:['👑','Legendär','#ff8800'],90:['💠','Mythic','#cc44ff'],100:['✨','Mystisch','#ff44cc']};
function levelsUI(){
 ens();var M=document.getElementById('kamLevels');
 if(!M){M=document.createElement('div');M.id='kamLevels';M.style.cssText='position:fixed;inset:0;z-index:600;display:none;overflow-y:auto;background:radial-gradient(circle at 50% 0,#2a1245,#0d0814 60%);color:#ffe9c4;font-family:Georgia,serif';document.body.appendChild(M);
  var st=document.createElement('style');st.textContent='#kamLevels .w{max-width:420px;margin:0 auto;padding:14px 14px 40px}#kamLevels h1{margin:4px 0 10px;text-align:center;color:#f0c040;font-size:17px;letter-spacing:2px}#kamLevels .tb{display:flex;gap:6px;margin-bottom:12px}#kamLevels .tb button{flex:1;padding:10px;border:2px solid #4a2a6a;background:#0006;color:#ffe9c4;border-radius:12px;font:inherit;font-size:13px;cursor:pointer}#kamLevels .tb button.on{border-color:#f0c040;box-shadow:0 0 12px #f0c04055;color:#f0c040}#kamLevels .hr{border:2px solid #4a2a6a;border-radius:16px;padding:12px;display:flex;gap:12px;align-items:center;background:linear-gradient(#0003,#000a),url(dung/floor.webp) center/cover}#kamLevels .hr img{width:74px;height:74px;object-fit:contain}#kamLevels .hr .t{flex:1}#kamLevels .lv{font-size:24px;color:#f0c040;line-height:1}#kamLevels .hr small{color:#a08aa8;font-size:11px;display:block;margin-top:3px}#kamLevels .bar{height:9px;background:#0008;border-radius:6px;overflow:hidden;margin-top:6px}#kamLevels .bar i{display:block;height:100%;background:linear-gradient(90deg,#f08a20,#f0c040)}#kamLevels .how{font-size:11px;color:#a08aa8;line-height:1.5;margin:8px 2px 14px;text-align:center}#kamLevels .tl{position:relative;padding-left:44px}#kamLevels .tl:before{content:"";position:absolute;left:17px;top:6px;bottom:6px;width:3px;background:linear-gradient(#f0c040,#4a2a6a 25%,#4a2a6a);border-radius:3px}#kamLevels .m{position:relative;margin-bottom:12px}#kamLevels .dot{position:absolute;left:-44px;top:8px;width:36px;height:36px;border-radius:50%;background:#1a0f2a;border:3px solid #4a2a6a;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#a08aa8}#kamLevels .card{border:2px solid #4a2a6a;border-radius:14px;padding:10px 12px;background:#0007}#kamLevels .m.done .dot{background:#f0c040;color:#2a1245;border-color:#fff3}#kamLevels .m.done .card{opacity:.6}#kamLevels .m.next .dot{border-color:#f0c040;color:#f0c040;box-shadow:0 0 14px #f0c040aa}#kamLevels .m.next .card{border-color:#f0c040;box-shadow:0 0 16px #f0c04044}#kamLevels .m.lk{opacity:.5}#kamLevels .card h3{margin:0 0 6px;font-size:13px;display:flex;justify-content:space-between;align-items:center}#kamLevels .card h3 span{font-size:10px;color:#a08aa8;font-weight:400}#kamLevels .rw{display:flex;flex-wrap:wrap;gap:6px}#kamLevels .lc{display:flex;align-items:center;gap:4px;background:#ffffff10;border-radius:8px;padding:3px 7px;font-size:11px}#kamLevels .lc img{width:24px;height:24px;object-fit:contain}#kamLevels .lc.big{border:1px solid #f0c04066;background:#f0c04018}#kamLevels .lc.pf{border-color:#ffd24a;box-shadow:0 0 8px #ffd24a66}#kamLevels .lc.nh{border:1px solid #b06cff;background:#b06cff22}#kamLevels .lc.nh img{filter:brightness(0) invert(.15) drop-shadow(0 0 4px #b06cff)}#kamLevels .m.sm{margin-bottom:6px}#kamLevels .m.sm .dot{width:28px;height:28px;left:-40px;top:6px;font-size:10px}#kamLevels .m.sm .card{padding:6px 10px;border-width:1px}#kamLevels .m.sm .card h3{font-size:11px;margin:0 0 3px}#kamLevels .rk{font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid}';document.head.appendChild(st)}
 var hl=0,kp=0,cl=clv(),nq=(typeof QUEST_LIST!=='undefined')?QUEST_LIST.length:58;
 try{hl=getHeroLevel(meta.hero);kp=Math.min(100,getKillsThisLevel(meta.hero)/150*100)}catch(e){}
 var lv=LM===1?hl:cl,ms=inventory.ms||{},h='',lvls=LM===1?Array.apply(null,Array(100)).map(function(_,i){return i+1}):[5,10,15,20,25,30,40,50,60,70,80,90,100],nd=false;
 var ml=lvls.filter(function(x){return x>lv})[0];
 lvls.forEach(function(L){var cls=L<=lv?'done':(!nd?(nd=true,'next'):''),lk=(LM===2&&L>nq)?' lk':'',rk=LM===1&&RK[L]?'<span class="rk" style="color:'+RK[L][2]+';border-color:'+RK[L][2]+'">'+RK[L][0]+' '+RK[L][1]+'</span>':'',c='';
  if(LM===1){var b=window.__kamLvReward(L);if(b.h)c+='<span class="lc">❤ +'+b.h+'</span>';if(b.a)c+='<span class="lc">⚔ +'+b.a+'</span>';if(b.g)c+='<span class="lc">💰 '+b.g+'</span>';if(b.d)c+='<span class="lc">💎 '+b.d+'</span>';c+=chips(HG[L],HX[L]);
   if(L===10)c+='<span class="lc nh big">Klasse wählbar</span>';if(L===30)c+='<span class="lc nh big">2. Klassen-Slot</span>';if(L===50)c+='<span class="lc nh big">3. Klassen-Slot</span>'}
  else{c+=chips(CG[L],CX[L]);if(L===15)c+='<span class="lc nh big"><img src="ally/arc_i0.webp">NEUER HELD</span>';if(L===30)c+='<span class="lc nh big"><img src="ally/mag_i0.webp">NEUER HELD</span>'}
  var big=!(LM===1&&L%5&&!RK[L]);h+='<div class="m '+cls+lk+(big?'':' sm')+'"><div class="dot">'+L+'</div><div class="card"><h3>Level '+L+' '+rk+'<span>'+(L<=lv?'✓ erhalten':(lk?'braucht mehr Quests':''))+'</span></h3><div class="rw">'+(c||'<span class="lc">–</span>')+'</div></div></div>'});
 if(LM===3){M.innerHTML='<div class="w"><h1>⭐ LEVEL</h1><div class="tb"><button onclick="__kamLM(1)">Heldenlevel</button><button onclick="__kamLM(2)">Klassenlevel</button><button class="on" onclick="__kamLM(3)">Prestige</button></div>'+prestigeTab()+'<button class="btn btn-wide" onclick="__kamLvBack()" style="width:100%;margin-top:6px">← ZURÜCK</button></div>';M.style.display='block';return}
 M.innerHTML='<div class="w"><h1>⭐ LEVEL</h1><div class="tb"><button class="'+(LM===1?'on':'')+'" onclick="__kamLM(1)">Heldenlevel</button><button class="'+(LM===2?'on':'')+'" onclick="__kamLM(2)">Klassenlevel</button><button class="'+(LM===3?'on':'')+'" onclick="__kamLM(3)">Prestige</button></div>'+
 '<div class="hr"><img src="hero/idle0.webp"><div class="t"><div class="lv">'+(LM===1?'Held-Level ':'Klassen-Level ')+lv+'</div><small>'+(ml?'Nächster Meilenstein bei Level '+ml:'Alle Meilensteine erreicht')+'</small>'+(LM===1?'<div class="bar"><i style="width:'+kp+'%"></i></div>':'')+'</div></div>'+
 '<div class="how">'+(LM===1?'So steigst du auf: <b>150 Monster-Kills pro Level</b> (max. Level 100).':'So steigst du auf: <b>1 Level pro erledigter Quest</b> (aktuell '+nq+' Quests, für Level 100 brauchen wir weitere).')+'</div><div class="tl">'+h+'</div>'+
 '<button class="btn btn-wide" onclick="__kamLvBack()" style="width:100%;margin-top:6px">← ZURÜCK</button></div>';
 M.style.display='block'}
var LH=[];window.__kamLvBack=function(){if(LM===3&&(SHS||SHL)){SHS=0;SHL=0;levelsUI();return}if(LH.length){LM=LH.pop();levelsUI();return}document.getElementById('kamLevels').style.display='none'};
window.__kamLM=function(m){if(m!==LM)LH.push(LM);LM=m;levelsUI()};
window.showLevels=function(){LM=1;LH=[];SHS=0;SHL=0;var m=document.getElementById('menuPanel');levelsUI()};
window.showLevelTable=function(){LM=1;levelsUI()};window.showPrestigeLevelTable=function(){LM=3;levelsUI()};window.showClassLevelTable=function(){LM=2;levelsUI()};
setInterval(function(){try{milestones()}catch(e){}},4000);
function cap(k,boss){var r=k<3?1:k<5?2:3;return Math.min(4,r+(boss&&k>=3?1:0)+(boss&&k<3?1:0))}
window.tryDropItem=function(isBoss){
 var k=kk(),ex='';
 if(isBoss){bossWon=true;bump('x0',0);inventory.stats.maxBoss=Math.max(inventory.stats.maxBoss||0,k);inventory.orbs=inventory.orbs||{};var o=orbDrop(k);ens();inventory.orbs[o]=(inventory.orbs[o]||0)+1;ex+=' +1 '+ORB[o][0];
  ex+=loot(rnd(3,6),{});
  ens();inventory.ms=inventory.ms||{};if(k>=10&&!inventory.ms.b10){inventory.ms.b10=1;try{saveInventory()}catch(e){}perfectGift(4,'Kammer 10 bezwungen')}}
 else if(Math.random()<.25)ex+=loot(1,{});
 if(ex)log('<span style="color:#cfd6e0">Beute:'+ex+'</span>');
 var chn=isBoss?.35:Math.min(.07,.03+.004*(k-1));
 if(Math.random()>chn)return;
 var cp=cap(k,isBoss),pool=(isBoss?BOSS_POOL:MONSTER_POOL.concat(k>=3?BOSS_POOL:[])).filter(function(id){var b=base(id);return b&&RANK.indexOf(b.rarity)<=cp});
 if(!pool.length)return;var wt=pool.map(function(x){return Math.pow(.55,RANK.indexOf(base(x).rarity))}),tw=wt.reduce(function(a,b){return a+b},0),rr0=Math.random()*tw,id=pool[pool.length-1];for(var q=0;q<pool.length;q++){rr0-=wt[q];if(rr0<=0){id=pool[q];break}}
 var r=giveOrSell(id,condDrop(k,isBoss));
 if(r.sold){log('<span style="color:#e0c070">Beutel voll ('+BAGMAX+'): '+r.name+' für '+r.sold+' Gold verkauft.</span>');try{toast('Beutel voll: '+r.name+' verkauft +'+r.sold)}catch(e){}return}
 var i=r.item;log('<span style="color:'+RARITY_COLOR[i.rarity]+'">ITEM GEFUNDEN: '+i.name+' ['+RARITY_LABEL[i.rarity]+'] '+CN[i.c]+' '+descOf(i)+'</span>');
 showItemPopup({name:i.name+' · '+CN[i.c],rarity:i.rarity,type:i.type,desc:descOf(i)})};
window.__kamChest=function(type,cfg){
 var P={wood:[60,0],dia:[40,2],legend:[25,6],sin:[15,12]}[type]||[50,0],m='';
 if(Math.random()<cfg.itemChance){var id=cfg.itemPool[Math.floor(Math.random()*cfg.itemPool.length)];
  if(base(id)){var rr=giveOrSell(id,condRoll(P[0],P[1]));if(rr.sold){m+=' <span style="color:#e0c070">Beutel voll: '+rr.name+' verkauft +'+rr.sold+'</span>'}else{var i=rr.item;m+=' <span style="color:'+RARITY_COLOR[i.rarity]+'">+ '+i.name+' ['+RARITY_LABEL[i.rarity]+'] <b style="color:'+CC[i.c]+'">'+CN[i.c]+'</b></span>';
   showItemPopup({name:i.name+' · '+CN[i.c],rarity:i.rarity,type:i.type,desc:descOf(i)})}}}
 if(cfg.alsoLowerItems){var lp=['sword1','armor1','helm1','ring1','sword2','armor2','helm2','ring2'],lid=lp[Math.floor(Math.random()*lp.length)],lr=giveOrSell(lid,condRoll(P[0],P[1]));m+=lr.sold?' Beutel voll: verkauft +'+lr.sold:' <span style="color:'+RARITY_COLOR[lr.item.rarity]+'">+ '+lr.item.name+'</span>'}
 var ir={wood:[1,2],dia:[2,5],legend:[5,10],sin:[10,18]}[type]||[1,2];
 m+=loot(rnd(ir[0],ir[1]),{wood:{},dia:{blau:10},legend:{blau:25,lila:8},sin:{blau:30,lila:20,orange:6}}[type]||{});return m};

/* ---- Heldenabteil ---- */
var SL={hero:['helm','armor','cape','weapon','ring'],arc:['helm','armor','cape','bow','ring'],mag:['helm','armor','cape','staff','ring']};
var NM={hero:'Held',arc:'Bogenschützin',mag:'Magierin'},NEED={hero:0,arc:15,mag:30};
var SLN={helm:'Helm',armor:'Rüstung',cape:'Umhang',weapon:'Waffe',bow:'Bogen',staff:'Stab',ring:'Ring'};
var sel='hero',fr=0;
function can(w,i){return SL[w].indexOf(i.type)>=0}
function unw(uid){var i=it(uid),w=wearer(uid);if(!w)return;
 var q=st(i);if(w==='hero')delete inventory.equipped[i.type];else delete ai()[w][i.type];
 if(meta){if(w==='hero')meta.attack=Math.max(1,meta.attack-q.atk);meta.maxHp=Math.max(1,meta.maxHp-q.hp);meta.hp=Math.min(meta.hp,meta.maxHp);try{updateUI()}catch(e){}}}
window.equipItem=function(uid,who){var i=it(uid);if(!i)return;who=who||sel;if(!can(who,i))return;
 var cur=wearer(uid);if(cur===who){unw(uid);saveInventory();render();return}
 if(cur)unw(uid);
 var g=gear(who),oid=g[i.type];if(oid)unw(oid);
 g[i.type]=uid;var n=st(i);
 if(meta){if(who==='hero')meta.attack+=n.atk;meta.maxHp+=n.hp;meta.hp=Math.min(meta.hp,meta.maxHp);try{updateUI()}catch(e){}}
 saveInventory();render()};
window.unequipItem=function(t){var uid=inventory.equipped[t];if(uid){unw(uid);saveInventory();render()}};
function slotHtml(w,t){var id=gear(w)[t],i=id?it(id):null,col=i?RARITY_COLOR[i.rarity]:'#7a4a1a';
 return '<div class="hs'+(i?'':' e')+'" style="border-color:'+col+(i&&i.c===2?';box-shadow:0 0 10px #ffd24a':'')+'" '+(i?'onclick="equipItem(\''+id+'\')"':'')+'>'+(i?itemIcon(i,48):'<span>'+SLN[t]+'</span>')+'<em>'+(i?stars(i):SLN[t])+'</em></div>'}
function card(i,sub,click,on){var col=RARITY_COLOR[i.rarity];
 return '<div onclick="'+click+'" style="border:2px solid '+(on?col:'#222')+';border-radius:6px;padding:6px;text-align:center;cursor:pointer;background:rgba(10,10,15,.8);display:inline-block;width:48%;margin:1%;vertical-align:top;box-sizing:border-box'+(i.c===2?';box-shadow:0 0 10px #ffd24a66':'')+'">'+itemIcon(i,48)+
 '<div style="font-size:0.6rem;color:'+col+';font-weight:700">'+i.name+'</div><div style="font-size:0.55rem;color:#888">'+descOf(i)+'</div>'+
 '<div style="font-size:0.55rem"><span style="color:#ffd24a">'+stars(i)+'</span> <span style="color:'+CC[i.c]+'">'+CN[i.c]+'</span></div>'+(sub||'')+'</div>'}
function sorted(){ens();return inventory.items.map(it).filter(Boolean).sort(function(a,b){return RANK.indexOf(b.rarity)-RANK.indexOf(a.rarity)||b.c-a.c||b.s-a.s})}
function render(){
 ens();var c=clv(),L=document.getElementById('invSlots');if(!L)return;
 if(c<NEED[sel]&&!(window.__kamGot&&window.__kamGot()[sel]))sel='hero';
 var tabs='';['hero','arc','mag'].forEach(function(w){var lock=c<NEED[w]&&!(window.__kamGot&&window.__kamGot()[w]);
  tabs+='<div class="ht'+(sel===w?' on':'')+(lock?' lk':'')+'" '+(lock?'':'onclick="__kamSel(\''+w+'\')"')+'>'+
   (lock?'<b>🔒</b><small>Neuer Held<br>ab Kl. '+NEED[w]+'</small>':'<img src="'+(w==='hero'?'hero/idle0.webp':'ally/'+w+'_i0.webp')+'" data-w="'+w+'"><small>'+NM[w]+'</small>')+'</div>'});
 var s=SL[sel],g=function(a){return a.map(function(t){return slotHtml(sel,t)}).join('')};
 var hi=sel==='hero'?'hero/idle0.webp':'ally/'+sel+'_i0.webp';
 L.innerHTML='<style>.hts{display:flex;gap:8px;justify-content:center;margin-bottom:10px}.ht{width:84px;height:88px;border:2px solid #7a4a1a;border-radius:12px;background:#0006;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:4px;cursor:pointer;color:#ffe9c4}.ht.on{border-color:#f0c040;box-shadow:0 0 14px #f0c04066}.ht img{width:54px;height:54px;object-fit:contain}.ht small{font-size:10px;text-align:center}.ht.lk{opacity:.55;cursor:default;justify-content:center}.ht b{font-size:20px}'+
 '.hst{display:grid;grid-template-columns:54px minmax(0,1fr) 54px;gap:6px;align-items:center;justify-items:center;border:2px solid #7a4a1a;border-radius:16px;padding:12px 12px 22px;overflow:hidden;background:linear-gradient(#0003,#000a),url(dung/floor.webp) center/cover}.hc{display:flex;flex-direction:column;gap:18px}.hs{width:54px;height:54px;box-sizing:border-box;border:2px solid;border-radius:12px;background:#000a;display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer}.hs img{margin:0!important;width:40px!important;height:40px!important}.hs em{position:absolute;bottom:-14px;font-size:9px;font-style:normal;color:#ffe9c4;opacity:.75;white-space:nowrap}.hs.e{border-style:dashed;opacity:.65;font-size:10px;color:#ffe9c4}'+
 '.hh{display:flex;flex-direction:column;align-items:center}.hh img{width:120px;height:120px;object-fit:contain;filter:drop-shadow(0 6px 8px #000)}.hh .d{width:104px;height:24px;border-radius:50%;background:radial-gradient(#f0c04066,#0000 70%);margin-top:-16px}.hh b{color:#f0c040;font-size:14px;margin-top:4px}</style>'+
 '<div class="hts">'+tabs+'</div><div class="hst"><div class="hc">'+g(s.slice(0,3))+'</div><div class="hh"><img id="hAn" src="'+hi+'"><div class="d"></div><b>'+NM[sel]+'</b></div><div class="hc">'+g(s.slice(3))+'<div class="hs e" style="opacity:.4"><span>Schild</span><em>bald</em></div></div></div>';
 var b=document.getElementById('invBonus');if(b){b.innerHTML=meta?'<div style="font-size:0.65rem;color:#44ddff;text-align:center;margin:12px 0 8px">Stats: <b style="color:#ff6644">'+meta.hp+'/'+meta.maxHp+' HP</b> | <b style="color:#ffaa44">'+meta.attack+' ATK</b>'+(sel!=='hero'?' | '+NM[sel]+': <b style="color:#ffd24a">+'+window.__kamAllyBonus(sel)+' ATK</b>':'')+' | 🔩 '+(inventory.iron||0)+'</div>':'<div style="height:10px"></div>'}
 var h='<div style="font-size:0.65rem;color:#806040;letter-spacing:2px;margin-bottom:8px">BEUTEL für '+NM[sel].toUpperCase()+'</div>',n=0;
 var SRT=sorted(),OWNR={bow:'arc',staff:'mag'};SRT=SRT.filter(function(i){return can(sel,i)}).concat(SRT.filter(function(i){return !can(sel,i)}));SRT.forEach(function(i){var cn=can(sel,i);n++;var w=wearer(i.id),mine=w===sel;
  h+=card(i,'<div style="font-size:0.5rem;color:'+(mine?'#44ff88':w?'#ffaa44':'#446688')+'">'+(!cn?'🔒 für '+NM[OWNR[i.type]||'hero']+(NEED[OWNR[i.type]||'hero']?' (ab Kl. '+NEED[OWNR[i.type]||'hero']+')':''):mine?'ANGELEGT · tippen zum Ablegen':w?'trägt: '+NM[w]:'anlegen')+'</div>'+(w?'':'<div onclick="event.stopPropagation();__kamSell(\''+i.id+'\')" style="font-size:0.55rem;color:'+(window.__kamSellArm===i.id?'#ff8a8a':'#e0c070')+';margin-top:3px;text-decoration:underline">'+(window.__kamSellArm===i.id?'Sicher? +'+price(i)+' Gold':'verkaufen ('+price(i)+')')+'</div>'),cn?'equipItem(\''+i.id+'\')':'',mine&&cn)});
 if(!n)h+='<div style="font-size:0.7rem;color:#446688;text-align:center;padding:12px">Noch keine passenden Items. Besiege Monster und Bosse!</div>';
 var T=document.getElementById('invItems');if(T)T.innerHTML=h}
window.__kamSel=function(w){sel=w;render()};
window.renderInventoryModal=render;
window.showInventory=function(){sel='hero';render();document.getElementById('inventoryModal').style.display='flex'};
setInterval(function(){var m=document.getElementById('inventoryModal'),im=document.getElementById('hAn');if(!m||m.style.display==='none'||!im)return;fr++;
 im.src=sel==='hero'?'hero/idle'+(fr%4)+'.webp':'ally/'+sel+'_i'+(fr%2)+'.webp';
 [].slice.call(document.querySelectorAll('.ht img')).forEach(function(x){var w=x.dataset.w;x.src=w==='hero'?'hero/idle'+(fr%4)+'.webp':'ally/'+w+'_i'+(fr%2)+'.webp'})},300);

/* ---- Schmiede ---- */
var FS={b:null,f:null,msg:''};
function fam(b){return b.fx?b.fx.k:b.type}
function nextBase(b){var r=RANK.indexOf(b.rarity);if(r<1||r>3)return null;var nr=RANK[r+1];
 return ITEMS.filter(function(x){return fam(x)===fam(b)&&x.rarity===nr})[0]||null}
function orbFor(b){return{gruen:'blau',blau:'lila',episch:'orange'}[b.rarity]}
var UPLV={gruen:4,blau:8,episch:10},UPN={gruen:'Blau',blau:'Lila',episch:'Orange (Legendär)'};
function smithLv(){try{return JSON.parse(localStorage.getItem('robCity')||'{}').b.smith||0}catch(e){return 0}}
function cost(i){return [2,4,8,16,32,64][RANK.indexOf(i.rarity)]*(i.s+1)}
function chance(i){return Math.min(98,[90,70,50][i.s]+smithLv()*2)}
function condResult(a,b){var p=(a.c===2?1:0)+(b.c===2?1:0);
 if(p===0)return{perf:0,base:Math.min(1,Math.max(a.c,b.c))};return{perf:p===2?90:60,base:1}}
function forgeUI(){
 ens();var M=document.getElementById('kamForge');
 if(!M){M=document.createElement('div');M.id='kamForge';M.style.cssText='position:fixed;inset:0;z-index:600;display:none;align-items:flex-start;justify-content:center;background:rgba(0,0,0,.95);overflow-y:auto;padding:20px';document.body.appendChild(M)}
 var B=FS.b?it(FS.b):null,F=FS.f?it(FS.f):null;if(!B)FS.b=null;if(!F)FS.f=null;
 var h='<div style="background:linear-gradient(145deg,#150a05,#251208);border:2px solid #f0c040;border-radius:16px;padding:18px 14px;max-width:400px;width:95%;color:#ffe9c4;font-family:Georgia,serif">'+
 '<h2 style="color:#f0c040;text-align:center;font-size:1.05rem;margin:0 0 6px">⚒️ SCHMIEDE · Stufe '+smithLv()+'</h2>'+
 '<div style="text-align:center;font-size:.75rem;margin-bottom:10px">🔩 Eisenbarren: <b>'+(inventory.iron||0)+'</b> &nbsp; 🔵 '+(inventory.orbs.blau||0)+' &nbsp; 🟣 '+(inventory.orbs.lila||0)+' &nbsp; 🟠 '+(inventory.orbs.orange||0)+'</div>';
 if(FS.msg)h+='<div style="text-align:center;font-size:.8rem;padding:8px;margin-bottom:8px;border:1px solid #7a4a1a;border-radius:8px;background:#0006">'+FS.msg+'</div>';
 if(!B){h+='<div style="font-size:.65rem;color:#c8a070;letter-spacing:2px;margin-bottom:6px">1. BASIS-ITEM WÄHLEN</div>';
  var n=0;sorted().forEach(function(i){n++;h+=card(i,'','__kamFB(\''+i.id+'\')',false)});
  if(!n)h+='<div style="font-size:.7rem;color:#a08060;text-align:center;padding:12px">Du hast noch keine Items zum Schmieden.</div>'}
 else{h+='<div style="font-size:.65rem;color:#c8a070;letter-spacing:2px;margin-bottom:6px">BASIS</div>'+card(B,'','__kamFB(null)',true)+
  (B.s<3?'<div style="font-size:.65rem;color:#c8a070;letter-spacing:2px;margin:8px 0 6px">2. GLEICHES ITEM ALS FUTTER (geht verloren)</div>':'');
  if(B.s<3){var cands=sorted().filter(function(x){return x.bid===B.bid&&x.id!==B.id&&!wearer(x.id)});
   if(F){h+=card(F,'','__kamFF(null)',true)}else if(!cands.length)h+='<div style="font-size:.7rem;color:#a08060;padding:8px">Du brauchst ein zweites gleiches Item (nicht angelegt).</div>';
   else cands.forEach(function(x){h+=card(x,'','__kamFF(\''+x.id+'\')',false)})}
  if(F&&B.s<3){var cr=condResult(B,F),ok=(inventory.iron||0)>=cost(B);
   h+='<div style="font-size:.75rem;margin:10px 0;line-height:1.5;text-align:center">Erfolg: <b>'+chance(B)+'%</b> (Schmiede +'+smithLv()*2+'%)<br>Kosten: 🔩 '+cost(B)+'<br>'+(cr.perf?'Perfekt-Chance: <b style="color:#ffd24a">'+cr.perf+'%</b>':'Zustand wird '+CN[cr.base])+'<br><span style="color:#ff9a8a">Bei Fehlschlag geht das Futter verloren.</span></div>'+
   '<button class="btn btn-wide" '+(ok?'':'disabled ')+'onclick="__kamDoForge()" style="width:100%">'+(ok?'⚒️ SCHMIEDEN':'Zu wenig Eisenbarren')+'</button>'}
  if(B.s>=3){var nb=nextBase(B),oc=orbFor(B);
   h+='<div style="font-size:.75rem;margin:10px 0;text-align:center;line-height:1.5">★★★ Voll ausgebaut.<br>'+(nb?'Aufwerten zu <b style="color:'+RARITY_COLOR[nb.rarity]+'">'+nb.name+'</b> mit '+ORB[oc][0]+' '+ORB[oc][1]+' (du hast '+(inventory.orbs[oc]||0)+')':(B.rarity==='normal'?'Normale Items kannst du nur mit Sternen verbessern.':'Höher geht es nicht.'))+'</div>'+
   (nb&&smithLv()<UPLV[B.rarity]?'<div style="text-align:center;font-size:.72rem;color:#ff9a8a;margin-bottom:6px">🔒 Schmiede Stufe '+UPLV[B.rarity]+' nötig für '+UPN[B.rarity]+' (du hast Stufe '+smithLv()+'). Baue die Schmiede in der Stadt aus.</div>':'')+(nb?'<button class="btn btn-wide" '+((inventory.orbs[oc]||0)>0&&smithLv()>=UPLV[B.rarity]?'':'disabled ')+'onclick="__kamDoUp()" style="width:100%">'+(smithLv()<UPLV[B.rarity]?'Schmiede zu niedrig':(inventory.orbs[oc]||0)>0?'✨ AUFWERTEN':'Kugel fehlt')+'</button>':'')}}
 h+='<button class="btn btn-wide" onclick="document.getElementById(\'kamForge\').style.display=\'none\'" style="width:100%;margin-top:10px">← ZURÜCK</button></div>';
 M.innerHTML=h;M.style.display='flex'}
window.__kForge=function(){FS={b:null,f:null,msg:''};forgeUI()};
window.__kamFB=function(u){FS.b=u;FS.f=null;FS.msg='';forgeUI()};
window.__kamFF=function(u){FS.f=u;forgeUI()};
window.__kamDoForge=function(){var B=it(FS.b),F=it(FS.f);if(!B||!F||B.s>=3||(inventory.iron||0)<cost(B))return;
 inventory.iron-=cost(B);var ok=Math.random()*100<chance(B),cr=condResult(B,F);
 delete inventory.inst[F.id];inventory.items.splice(inventory.items.indexOf(F.id),1);FS.f=null;
 if(ok){bump('forged');restat(B.id,function(){var n=inventory.inst[B.id];n.s++;n.c=cr.perf?(Math.random()*100<cr.perf?2:1):cr.base});
  var nb=it(B.id);FS.msg='✨ Gelungen! <b style="color:'+CC[nb.c]+'">'+CN[nb.c]+'</b> '+stars(nb)}
 else FS.msg='💥 Fehlgeschlagen. Das Futter ist weg.';
 saveInventory();forgeUI()};
window.__kamDoUp=function(){var B=it(FS.b);if(!B||B.s<3)return;var nb=nextBase(B),oc=orbFor(B);if(!nb||(inventory.orbs[oc]||0)<1||smithLv()<UPLV[B.rarity])return;
 inventory.orbs[oc]--;bump('upgraded');restat(B.id,function(){var n=inventory.inst[B.id];n.b=nb.id;n.s=0});
 FS.msg='✨ Aufgewertet zu '+nb.name+'!';saveInventory();forgeUI()};
ens();
})();


/* ---------- Kammern-Auswahl (Schnellzugriff) ---------- */
window.__kamPick=function(k){
  if(inFight){msg('Nicht waehrend eines Kampfes.');return}
  var mb=(inventory.stats&&inventory.stats.maxBoss)||0;if(k>mb+1)return;
  meta.round=(k-1)*10+1;fightBoss=false;bossWon=false;window.generateBoard();
  var m=$('kamChambers');if(m)m.style.display='none';try{updateUI()}catch(e){}
};
window.showChambers=function(){
  var mb=(inventory.stats&&inventory.stats.maxBoss)||0,cur=K?K.k:1;
  var M=$('kamChambers');
  if(!M){M=document.createElement('div');M.id='kamChambers';M.style.cssText='position:fixed;inset:0;z-index:600;display:none;overflow-y:auto;background:radial-gradient(circle at 50% 0,#2a1245,#0d0814 60%);color:#ffe9c4;font-family:Georgia,serif';document.body.appendChild(M)}
  var h='<div style="max-width:420px;margin:0 auto;padding:14px 14px 40px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><button class="btn btn-sm" onclick="document.getElementById(\'kamChambers\').style.display=\'none\'">← ZURÜCK</button><b style="flex:1;text-align:center;color:#f0c040;letter-spacing:2px">🗺️ KAMMERN</b></div><p style="font-size:.75rem;opacity:.75;text-align:center;margin:0 0 12px">Jeder Drache beschützt seine Kammer. Besiege ihn, um sie zu öffnen.</p>';
  for(var k=1;k<=10;k++){
    var th=theme(k),open=k<=mb+1,boss=k>1?'Boss '+(k-1)+' besiegt':'Von Anfang an offen';
    h+='<div '+(open?'onclick="__kamPick('+k+')" ':'')+'style="display:flex;align-items:center;gap:12px;margin:8px 0;padding:12px;border-radius:12px;border:2px solid '+(k===cur?'#f0c040':th.a)+';background:linear-gradient(90deg,'+th.t+','+th.bg+');'+(open?'cursor:pointer':'opacity:.45;filter:grayscale(.7)')+'"><div style="width:14px;height:40px;border-radius:6px;background:'+th.a+';box-shadow:0 0 10px '+th.a+'"></div><div style="flex:1"><b style="color:'+th.a+'">Kammer '+k+' · '+th.n+'</b><div style="font-size:.7rem;opacity:.8">'+(open?(k===cur?'Du bist hier':'Tippen zum Betreten'):'🔒 Gesperrt – '+boss.replace('besiegt','besiegen'))+'</div></div></div>';
  }
  M.innerHTML=h+'</div>';M.style.display='block';
};

/* ---------- Würfelwahl: großer Würfel + Knopf unten ---------- */
function dieLocked(){return !!(K&&K.cur&&K.cur.r>0)}
function paintCube(){var b=$('kamDieBox');if(!b)return;var d=EQ&&SD[EQ]?SD[EQ]:null;
  b.style.setProperty('--d0',d?d.c[0]:'#ffffff');b.style.setProperty('--d1',d?d.c[1]:'#d9d2c4');b.style.setProperty('--dp',d?'#fff':'#c22');b.classList.toggle('kcol',!!d);b.classList.toggle('klock',dieLocked());
  if(!b.__kp){b.__kp=1;b.style.cursor='pointer';b.addEventListener('click',function(){window.__kamDiePick()})}}
window.__kamDiePick=function(){
  if(busy||inFight||dieLocked()){msg('Der Würfel ist für diese Runde gewählt.');return}
  var M=$('kamDiceSel');
  if(!M){M=document.createElement('div');M.id='kamDiceSel';M.style.cssText='position:fixed;inset:0;z-index:700;overflow-y:auto;background:radial-gradient(circle at 50% 0,#2a1245,#0d0814 60%);color:#ffe9c4;font-family:Georgia,serif';document.body.appendChild(M)}
  var h='<div style="max-width:420px;margin:0 auto;padding:14px 14px 40px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><button class="btn btn-sm" onclick="document.getElementById(\'kamDiceSel\').style.display=\'none\'">← ZURÜCK</button><b style="flex:1;text-align:center;color:#f0c040;letter-spacing:2px">🎲 WÜRFEL</b></div><p style="font-size:.72rem;opacity:.75;text-align:center;margin:0 0 10px">Tippe einen Würfel an, um ihn zu benutzen. Neue Würfel findest du im Spiel.</p>';
  var row=function(id,sel,nm,ds,ic){return '<div onclick="__kamDieSet(\''+id+'\')" style="display:flex;align-items:center;gap:12px;margin:7px 0;padding:10px;border-radius:12px;cursor:pointer;border:2px solid '+(sel?'#ffd24a':'#ffffff22')+';background:'+(sel?'#3a2a0a99':'#0006')+'">'+ic+'<div style="flex:1"><b style="font-size:.85rem">'+nm+'</b><div style="font-size:.65rem;opacity:.8">'+ds+'</div></div><span style="font-size:.65rem;color:#ffd24a">'+(sel?'✔ ANGELEGT':'ANLEGEN')+'</span></div>'};
  h+=row('',!EQ,'Normaler Würfel','Wirft 1 bis 6, ohne Besonderheit','<span style="display:inline-block;width:38px;height:38px;border-radius:9px;background:linear-gradient(145deg,#fff,#d9d2c4)"></span>');
  var n=0;Object.keys(SD).forEach(function(id){if(OWN.indexOf(id)<0){n++;return}h+=row(id,EQ===id,SD[id].n,id==='city'?cityInfo():SD[id].d,dieHTML(id,38))});
  for(var q=0;q<n;q++)h+='<div style="display:flex;align-items:center;gap:12px;margin:7px 0;padding:10px;border-radius:12px;border:2px solid #ffffff11;background:#0004;opacity:.5"><span style="width:38px;height:38px;border-radius:9px;background:#222"></span><div><b style="font-size:.85rem">? ? ?</b><div style="font-size:.65rem">Geheimer Würfel. Finde ihn im Spiel.</div></div></div>';
  M.innerHTML=h+'</div>';M.style.display='block'};
window.__kamDieSet=function(id){if(busy||inFight||dieLocked())return;EQ=id;saveD();invUI();hud();var M=$('kamDiceSel');if(M)M.style.display='none';msg(id?SD[id].n+' angelegt.':'Normaler Würfel.')};
})();
