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
'#kamHud .hb{flex:1;height:10px;border-radius:6px;background:#0008;border:1px solid #fff3;overflow:hidden}#kamHud .hb i{display:block;height:100%;background:linear-gradient(90deg,#c9a227,#ffe27a);width:0;transition:width .3s}'+
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
'#kam .tile .kch{width:50px;max-height:46px;object-fit:contain;filter:drop-shadow(0 3px 3px #000a)}#kam .tile.chest small{position:absolute;bottom:-1px}#kamChestFx{position:fixed;left:0;right:0;top:0;bottom:0;z-index:100005;display:flex;align-items:center;justify-content:center;background:#000a;pointer-events:none}#kamChestFx img{width:210px;animation:kcpop .45s ease-out}@keyframes kcpop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}'+
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
'#battleScene .monster-slot img.kanim[alt^="worldboss"]{width:190px!important;height:150px!important}#battleScene .monster-slot img.kanim[alt^="worldboss"]{transform:scaleX(-1);position:relative;left:26px}body.kamn2 #battleScene .monster-slot img.kanim[alt^="worldboss"]{width:140px!important;height:112px!important}#battleScene .monster-slot img.kanim{object-fit:contain!important;border:none!important;background:none!important;box-shadow:none!important;border-radius:0!important;width:124px;height:124px;filter:drop-shadow(0 6px 5px #000a)}'+
'body.kamn2 #battleScene,body.kamn3 #battleScene{padding:0!important}'+
'body.kamn2 #battleScene .monster-slot,body.kamn3 #battleScene .monster-slot{position:absolute!important;transform:none!important;margin:0!important;opacity:1!important}'+
'body.kamn2 #battleScene .monster-slot .monster-name,body.kamn3 #battleScene .monster-slot .monster-name{display:none!important}'+
'body.kamn2 #battleScene .monster-slot:nth-child(2),body.kamn3 #battleScene .monster-slot:nth-child(2){left:222px;bottom:10px;z-index:4}'+
'body.kamn2 #battleScene .monster-slot:nth-child(3),body.kamn3 #battleScene .monster-slot:nth-child(3){left:278px;bottom:44px;z-index:2}'+
'body.kamn3 #battleScene .monster-slot:nth-child(4){left:312px;bottom:14px;z-index:3}'+
'#battleScene .monster-slot img.kanim:not([alt^="worldboss"]){width:70px!important;height:70px!important}'+
'#battleScene .monster-slot img.kanim[alt="frog"]{width:60px!important;height:60px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_frog"]{width:78px!important;height:78px!important}'+
'#battleScene .monster-slot img.kanim[alt="gobold"]{width:66px!important;height:66px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_gobold"]{width:85px!important;height:85px!important}'+
'#battleScene .monster-slot img.kanim[alt="wolf"]{width:75px!important;height:75px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_wolf"]{width:98px!important;height:98px!important}'+
'#battleScene .monster-slot img.kanim[alt="bear"]{width:86px!important;height:86px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_bear"]{width:112px!important;height:112px!important}'+
'#battleScene .monster-slot img.kanim[alt="golem"]{width:86px!important;height:86px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_golem"]{width:112px!important;height:112px!important}'+
'#battleScene .monster-slot img.kanim[alt="snake"]{width:70px!important;height:70px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_snake"]{width:90px!important;height:90px!important}'+
'#battleScene .monster-slot img.kanim[alt="spider"]{width:70px!important;height:70px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_spider"]{width:90px!important;height:90px!important}'+
'#battleScene .monster-slot img.kanim[alt="freggz"]{width:74px!important;height:74px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_freggz"]{width:96px!important;height:96px!important}'+
'#battleScene .monster-slot img.kanim[alt="hexe"]{width:70px!important;height:70px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_hexe"]{width:90px!important;height:90px!important}'+
'#battleScene .monster-slot img.kanim[alt="snowman"]{width:74px!important;height:74px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_snowman"]{width:96px!important;height:96px!important}'+
'#battleScene .monster-slot img.kanim[alt="inferno"]{width:82px!important;height:82px!important}'+
'#battleScene .monster-slot img.kanim[alt="boss_inferno"]{width:107px!important;height:107px!important}'+
'#battleScene .monster-slot img.fk[alt="frog"]{height:76px!important;position:relative;left:12px}#battleScene .monster-slot img.fk[alt="boss_frog"]{height:104px!important;position:relative;left:12px}body.kamn2 #battleScene .monster-slot img.fk,body.kamn3 #battleScene .monster-slot img.fk{left:0!important}'+
'body.kamn2 #battleScene .monster-slot img:not(.kanim),body.kamn3 #battleScene .monster-slot img:not(.kanim){width:70px!important;height:70px!important}'+
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
'#kamProf #quickPanel{display:none!important}#kamProf[data-tab=p] #menuPanel,#kamProf[data-tab=p] #kamReset,#kamProf[data-tab=p] #kamReset2{display:none!important}'+
'#kamQuick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 4px}#kamQuick .btn{padding:14px 2px;font-size:.66rem;letter-spacing:0;line-height:1.25}#kamProf[data-tab=m] #kamQuick{display:none!important}'+
'#kamProf[data-tab=m] #statusPanel{display:none!important}'+
'#kamProf[data-tab=i] #menuPanel,#kamProf[data-tab=i] #kamQuick,#kamProf[data-tab=i] #kamReset,#kamProf[data-tab=i] #kamReset2{display:none!important}#kamInfoPane,#kamLogPane{display:none}#kamProf[data-tab=p] #kamLogPane{display:block}#kamProf[data-tab=i] #kamInfoPane{display:block}'+

'#kamProf.invonly .tabs button[data-t=p],#kamProf.invonly .tabs button[data-t=m]{display:none}#kamProf.invonly .tabs button[data-t=i]{cursor:default}'+
'@media (min-width:900px){#kamProf .box{max-width:760px}#kamForge>div{max-width:860px!important}#kamForge{padding:24px!important}#kamForge div[style*="width:48%"]{width:23%!important}}'+
'#kamProf[data-tab=m] #menuPanel{display:block!important}';
document.head.appendChild(css);

/* ---------- Umbau der Seite ---------- */
function rebuildPage(){
  var bp=$('battlePanel'),qp=$('quickPanel'),ab=$('actionBtn');
  var k=document.createElement('div');k.id='kam';
  k.innerHTML='<canvas id="kamEm"></canvas><div id="kamHud"><span>💎 <b id="kDia">0</b></span><span>💜 <b id="kSoul">0</b></span><span>💰 <b id="kGold">0</b></span><span style="display:none"><b id="kHp"></b><b id="kAtk"></b></span><div class="hb" title="Kills bis zum nächsten Level"><i id="kHpB"></i></div><span class="bx" id="kEt"></span></div>'+
   '<div id="kamBoss"><span id="kBn"></span><div class="bb"><i id="kBb"></i></div></div><div id="kamWorld"><div id="kamHero"><div class="sh"></div><div class="up"><img id="kamHeroImg" alt="" src="hero/idle0.webp"></div></div></div><div id="kamMsg"></div>';
  bp.insertBefore(k,bp.firstChild);
  /* Menütasten unten, direkt unter dem Würfel-Knopf */
  /* Profil-Taste unten rechts */
  var pf=document.createElement('button');pf.id='kamPf';pf.innerHTML='<img id="kamPfImg" alt=""><span>PROFIL</span>';document.body.appendChild(pf);
  var pw=document.createElement('div');pw.id='kamProf';pw.innerHTML='<div class="box"><div class="tabs"><button data-t="p">⚔ PROFIL</button><button data-t="i">🎒 INVENTAR</button><button data-t="m">☰ MENÜ</button><button class="x">✕</button></div><div id="kamProfBody"></div></div>';document.body.appendChild(pw);
  var rs=document.createElement('button');rs.id='kamReset';rs.className='btn btn-wide';rs.textContent='🗑 FORTSCHRITT ZURÜCKSETZEN';rs.style.cssText='margin-top:10px;background:#300;border-color:#a33;font-size:.7rem';
  var rt=document.createElement('button');rt.id='kamReset2';rt.className='btn btn-wide';rt.style.cssText='margin-top:10px;font-size:.7rem';
  function rtL(){var on=0;try{on=localStorage.getItem('robOneHit')==='1'}catch(e){}rt.textContent=on?'⚡ TEST: Boss-Schlag AN (tippen = aus)':'⚡ TEST: Bosse mit 1 Schlag (aus)';rt.style.borderColor=on?'#4c4':'';}
  rt.onclick=function(){try{localStorage.setItem('robOneHit',localStorage.getItem('robOneHit')==='1'?'0':'1')}catch(e){}rtL()};rtL();
  rs.onclick=function(){if(!rs.dataset.sure){rs.dataset.sure=1;rs.textContent='SICHER? NOCHMAL TIPPEN: ALLES AUF ANFANG';setTimeout(function(){delete rs.dataset.sure;rs.textContent='🗑 FORTSCHRITT ZURÜCKSETZEN'},4000);return}
    var fin=0,go=function(){if(fin)return;fin=1;try{Object.keys(localStorage).forEach(function(k){if(/^rob/.test(k)&&['robPlayerName','robLastHero','robAvatar'].indexOf(k)<0)localStorage.removeItem(k)})}catch(e){}location.reload()};rs.textContent='Setze zurück… (ca. 4 Sekunden warten)';try{var PP=window.parent;if(PP&&PP!==window&&typeof PP.tfApi==='function'){var nz=function(){return null};PP.tfApi('/api/realm/reset',{}).then(nz,nz).then(function(){return new Promise(function(r){setTimeout(r,3300)})}).then(function(){return PP.tfApi('/api/realm/save',{state:{savedAt:Date.now(),reset:1}})}).then(go,go);setTimeout(go,9000);return}}catch(e){}go()};
  if(qp){$('kamProfBody').appendChild(qp)}
  var qk=document.createElement('div');qk.id='kamQuick';
  [['🎒 HELDENABTEIL','showInventory'],['⚒️ SCHMIEDE','__kForge'],['⭐ LEVEL','showLevels'],['🏪 MARKTPLATZ','__kDia'],['🏙️ STADT','showCity'],['🐾 MONSTER','showMonsterLexicon']].forEach(function(q){var bt=document.createElement('button');bt.className='btn btn-sm';bt.textContent=q[0];bt.onclick=function(){closeP();window.__fromProf=1;try{window[q[1]]()}catch(e){}};qk.appendChild(bt)});
  (function(){var IDS=['inventoryModal','kamForge','kamLevels','diaShopModal','cityModal','monsterLexikonModal','wdexModal','kamDDexModal','dailyModal'],done={};setInterval(function(){IDS.forEach(function(id){var el=$(id);if(!el||done[id]===el)return;done[id]=el;var was=getComputedStyle(el).display!=='none';new MutationObserver(function(){var on=getComputedStyle(el).display!=='none';if(was&&!on&&window.__fromProf){window.__fromProf=0;setTimeout(function(){var pf=$('kamPf');if(pf)pf.click()},30)}was=on}).observe(el,{attributes:true,attributeFilter:['style']})})},700)})();
  $('kamProfBody').appendChild(qk);
  var mp=$('menuPanel');if(mp){$('kamProfBody').appendChild(mp);mp.addEventListener('click',function(e){var bt=e.target.closest&&e.target.closest('button');if(bt)setTimeout(closeP,0)})}
  function openP(t){var sp=$('statusPanel'),b=$('kamProfBody');b.insertBefore(sp,b.firstChild);b.insertBefore($('kamQuick'),sp.nextSibling);b.appendChild(rs);b.appendChild(rt);var ip=$('kamInfoPane');if(!ip){ip=document.createElement('div');ip.id='kamInfoPane'}b.appendChild(ip);var lp=$('kamLogPane');if(!lp){lp=document.createElement('div');lp.id='kamLogPane'}b.appendChild(lp);pw.dataset.tab=t||'p';if((t||'p')==='p'){try{window.__kamLogPane()}catch(e){}}if(t==='i'){try{window.__kamInfoTab()}catch(e){}}sp.style.setProperty('display',pw.dataset.tab==='p'?'block':'none','important');[].forEach.call(pw.querySelectorAll('.tabs button[data-t]'),function(x){x.classList.toggle('on',x.dataset.t===pw.dataset.tab)});pw.classList.add('on');syncFace()}
  pf.onclick=function(){pw.classList.remove('invonly');openP('p')};window.__kamOpenP=function(t,only){openP(t||'p');pw.classList.toggle('invonly',!!only)};
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
    if(err){var l=$('diaShopList');if(l)l.innerHTML='<div style="padding:14px;color:#f88;font-size:.8rem">Der Marktplatz konnte nicht geladen werden: '+err+'</div>'}
    m.style.display='flex'};
  window.__kShop=function(){window.__kshop=1;ov.classList.add('kshop');
    try{$('overlayGold').textContent='💰 '+meta.gold+' Gold verfügbar';$('overlayDiamond').textContent='💎 '+meta.diamonds+' Diamanten';updateShopPricesUI();updateAutoRunUI();renderSkillShop()}catch(e){}
    ov.style.display='flex';dieShop()};
  window.closeMenu=function(){};
  function closeP(){pw.classList.remove('on');pw.classList.remove('invonly');var sp=$('statusPanel');sp.style.removeProperty('display');var bp0=$('battlePanel');bp0.parentNode.insertBefore(sp,bp0)}
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
var CHL={wood:'Holzkiste',dia:'Diamant-Kiste',legend:'Legendäre Kiste',sin:'Todsünde-Kiste'};
function chestFor(e){
  /* Kiste pro leerem Feld, nach KAMMER: K1 Holz 10%, K2 Holz 30%, K3 Holz 50% + Diamant 10%, K4 nur Diamant 20%,
     K5 Diamant 20% + Legendaer 10%, ab K6 Legendaer 20%. Todsuende separat: selten, steigt mit der Etage. */
  var kc=1;try{kc=Math.max(1,K&&K.k||1)}catch(x){}
  var P=kc<=1?{wood:10}:kc===2?{wood:30}:kc===3?{wood:50,dia:10}:kc===4?{dia:20}:kc===5?{dia:20,legend:10}:{legend:20};
  var sp=.001,x=Math.random()*100;
  if(x<sp)return 'sin';
  x=Math.random()*100;var a=0;
  for(var t in P){a+=P[t];if(x<a)return t}
  return null;
}
function gen(r,c,R){
  /* Etage 1-3: wenig Gold, Etage 4-6: Gold-Zone, Etage 7-10: nur noch Monster (und Betten) */
  var e=Math.min(10,Math.ceil(r/ETG)),w;
  if(e<=3)w=[['monster',52],['gold',14],['empty',34]];
  else if(e<=6)w=[['monster',34],['gold',40],['empty',26]];
  else w=[['monster',84],['empty',16]];
  var x=Math.random()*100,a=0,t='empty';
  for(var i=0;i<w.length;i++){a+=w[i][1];if(x<a){t=w[i][0];break}}
  if(t==='empty'&&e>=2&&!K.dieE[e]&&Math.random()<(EQ==='city'&&cityTier()>=2?.07:.035)){t='die';K.dieE[e]=1}
  var chT=null;if(t==='empty'){chT=chestFor(e);if(chT)t='chest'}
  var cl2=campLv();
  if(cl2>0&&t!=='die'&&t!=='chest'){K.campE=K.campE||{};var gap=Math.max(1,Math.ceil(10/cl2));
    if(!K.campE[e]&&e%gap===0&&r===ETG*e-3){t='camp';K.campE[e]=1}
    else if(t==='empty'&&Math.random()<Math.min(.1,.01*cl2))t='camp'}
  var o={t:t,r:r,c:c};
  if(t==='die'){var ids=Object.keys(BD);o.d=pick(ids)}
  if(t==='gold')o.v=3+Math.floor(Math.random()*7);
  if(t==='chest')o.ch=chT;
  if(t==='monster')o.m=mainOf(K.k);
  return o;
}
function addEl(o){
  var d=document.createElement('div');d.className='tile '+o.t;
  if(o.t==='boss'){d.style.left=px(CM)+'px';d.innerHTML='<img class="sp" src="'+getMonsterImg(drag(K.k))+'" alt=""><small>BOSS</small>'}
  else{
    var inner=o.t==='monster'?'<img class="sp" src="'+getMonsterImg(o.m)+'" alt=""><small>Kampf</small>':o.t==='gold'?'💰<small>+'+o.v+'</small>':o.t==='die'?dieHTML(o.d,30)+'<small>Würfel</small>':o.t==='chest'?'<img class="kch" src="items/chest_'+o.ch+'_0.webp" alt=""><small>Kiste</small>':o.t==='bed'?'🛌<small>Bett</small>':o.t==='camp'?'🔥<small>Lagerfeuer</small>':o.t==='start'?'🔥':'';
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
  try{if(EQ==='thief'&&!localStorage.getItem('robGM')){var gm=1+Math.floor(Math.random()*6);localStorage.setItem('robGM',JSON.stringify({m:gm,g:meta.gold||0}));setTimeout(function(){try{msg('🎲 Golddieb-Würfel: '+gm+'! Am Ende des Runs wird dein Gold mal '+gm+' genommen.');fl('🪙 x'+gm,'#ffd24a')}catch(e){}},600)}}catch(e){}
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
  var st=$('kam').clientHeight,kw=$('kam').clientWidth,kk=Math.max(1,Math.min(1.7,kw/360));$('kamWorld').style.transform='scale('+kk+') rotateX(30deg) translateY('+Math.max(0,o.r*STEP-st*0.2/kk)+'px)';
}
function msg(t){var m=$('kamMsg');if(m)m.textContent=t}
function hud(){
  if(!K||!meta)return;
  $('kHp').textContent=Math.max(0,meta.hp)+'/'+meta.maxHp;try{$('kHpB').style.width=Math.min(100,getKillsThisLevel(meta.hero)/150*100)+'%';$('kDia').textContent=meta.diamonds||0;$('kSoul').textContent=(prestigeData&&prestigeData.souls)||0}catch(e){}$('kGold').textContent=meta.gold;$('kAtk').textContent=meta.attack;
  var r=K.cur.r,et=Math.min(10,Math.ceil(Math.max(1,r)/ETG));$('kEt').textContent=theme(K.k).n+' · Etage '+et+'/10';
  var left=ROWS+1-r;$('kBn').textContent='Drache '+getMonsterNameSafe()+' · '+(r>ROWS?'Boss-Reihe':'Reihe '+r+' / '+ROWS);$('kBb').style.width=(100*(1-left/(ROWS+1)))+'%';
}
function getMonsterNameSafe(){try{return MONSTER_NAMES[drag(K.k)]||'Drache'}catch(e){return 'Drache'}}
(function(){var o=window.toggleAutoRun;if(typeof o!=='function')return;window.toggleAutoRun=function(){try{if(!autoRunActive&&K&&autoRunData.level>0&&autoRunData.level<K.k){msg('Auto-Run Stufe '+autoRunData.level+' gilt nur bis Kammer '+autoRunData.level+'. Für Kammer '+K.k+' brauchst du Stufe '+K.k+' (nach dem Drachen dieser Kammer kaufbar).');return}}catch(e){}return o.apply(this,arguments)}})();
window.__kamFl=function(t,c){try{var kh=$('kamHero'),ok=kh&&kh.offsetParent!==null&&kh.getBoundingClientRect().width>0;if(ok){fl(t,c);return}
var w=document.getElementById('sceneWrap'),im=document.getElementById('runImg');if(!w||!im)return;var r=w.getBoundingClientRect(),h=im.getBoundingClientRect(),d=document.createElement('div');
d.textContent=t;d.style.cssText='position:absolute;z-index:30;font-weight:900;font-size:22px;pointer-events:none;text-shadow:0 2px 4px #000;color:'+c+';left:'+(h.left-r.left+h.width/2-16+(Math.random()*30-15))+'px;top:'+(h.top-r.top-4)+'px;transition:transform 1.1s,opacity 1.1s';
w.appendChild(d);setTimeout(function(){d.style.transform='translateY(-50px)';d.style.opacity='0'},30);setTimeout(function(){d.remove()},1200)}catch(e){}};
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
 thief:{n:'Golddieb-Würfel',c:['#cfa230','#5a430a'],f:2,p:500,d:'Einmal pro Run gewürfelt (1–6): am Ende wird dein Gold aus dem Run mit der Zahl malgenommen'}
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
  if(EQ==='city'&&!id){var t2=cityTier();
    if(t2>=3&&v%2===0){K.gb=2;note.push('Stadt: Münzfelder +2')}
    if(t2>=5){var h3=Math.floor(meta.maxHp*.05);if(h3>0){meta.hp=Math.min(meta.maxHp,meta.hp+h3);fl('+'+h3+' ❤','#6fe08a');note.push('Stadt heilt '+h3)}}}
  if(id){INV.splice(armed,1);armed=-1;saveD();invUI()}
  hud();return note;
}
function toast(t){var d=document.createElement('div');d.className='ktoast';d.innerHTML=t;document.body.appendChild(d);setTimeout(function(){d.remove()},3600)}
function foundDie(id,board){try{var ms=inventory.ms=inventory.ms||{},key='D'+id;if(ms[key])return;ms[key]=1;var dia=board?15:30;
  var all=Object.keys(BD).every(function(b){return ms['D'+b]}),allS=Object.keys(SD).filter(function(s){return s!=='city'}).every(function(s){return ms['D'+s]}),extra=[];
  if(board&&all&&!ms.DALLB){ms.DALLB=1;extra.push('dia')}if(!board&&allS&&!ms.DALLS){ms.DALLS=1;extra.push('legend')}
  try{log('<span style="color:#44ddff">🎲 Würfel-Lexikon: '+dd(id).n+' gefunden! Belohnung (+'+dia+' Diamanten) im Würfel-Lexikon abholen</span>')}catch(e){}
  extra.forEach(function(ct){try{window.__kamChestAdd(ct);try{window.__kamLogR('Würfel-Lexikon komplett: '+(ct==='dia'?'Diamant-Kiste':'Legendäre Kiste'))}catch(e){}log('<span style="color:#ffd24a">📦 Würfel-Lexikon komplett: '+(ct==='dia'?'Diamant-Kiste':'Legendäre Kiste')+'!</span>');try{toast('🎁 Würfel-Lexikon komplett: '+(ct==='dia'?'Diamant-Kiste':'Legendäre Kiste'))}catch(e){}}catch(e){}});try{saveInventory()}catch(e){}}catch(e){}}
window.__kamFoundDie=foundDie;
window.__kamDieClaim=function(id){try{var ms=inventory.ms=inventory.ms||{};if(!ms['D'+id]||ms['X'+id])return;ms['X'+id]=1;var dia=BD[id]?15:30;meta.diamonds=(meta.diamonds||0)+dia;globalDiamonds+=dia;saveDiamonds(globalDiamonds);saveInventory();try{window.__kamLogR('Würfel '+dd(id).n+' abgeholt: 💎 '+dia)}catch(e){}try{toast('🎁 +'+dia+' Diamanten')}catch(e){}dieShop();try{hud()}catch(e){}}catch(e){}};
function unlock(id){
  if(OWN.indexOf(id)>=0)return;OWN.push(id);if(!EQ)EQ=id;saveD();invUI();foundDie(id,false);
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
  if(meta.gold>=10000)unlock('thief');
  try{if(prestigeData&&prestigeData.count>=1)unlock('six')}catch(e){}
  if(cityTier()>=1)unlock('city');
  if(inFight&&meta.hp>0&&meta.hp<=meta.maxHp*.1&&!ST.lowSeen){ST.lowSeen=1;ST.low=1;saveST()}
}
setInterval(function(){try{if(inFight&&fightBoss&&OWN.indexOf('vamp')<0&&monstersInFight&&monstersInFight[0]&&monstersInFight[0].isBoss&&monstersInFight[0].hp<=monstersInFight[0].maxHp*.5)unlock('vamp')}catch(e){}},400);
function cityInfo(){var t=cityTier(),mn=Math.min(6,t+1),x=['wirft '+mn+(mn<6?' bis 6':'')];if(t>=2)x.push('mehr Würfel auf dem Brett');if(t>=3)x.push('gerade Zahl: Münzfelder +2');if(t>=4)x.push('Beutewürfel stärker');if(t>=5)x.push('heilt bei jedem Wurf');return 'Stufe '+t+'/6: '+x.join(', ')}
var HOW={rig:['10 Monster besiegen',function(){return ST.kills+' / 10'}],redo:['3 Tode sterben',function(){return ST.deaths+' / 3'}],luck:['25 Würfel auf dem Brett einsammeln',function(){return ST.dice+' / 25'}],warp:['Einen Boss besiegen',function(){return ST.bosses+' / 1'}],iron:['Im Kampf unter 10% Leben kommen',function(){return ST.low?'1 / 1':'0 / 1'}],thief:['10.000 Gold besitzen',function(){return Math.min(10000,(meta&&meta.gold)||0)+' / 10.000'}],vamp:['Einen Boss auf unter 50% Leben bringen',null],six:['Das erste Prestige machen',function(){var c=0;try{c=prestigeData.count||0}catch(e){}return Math.min(1,c)+' / 1'}]};
function dieRow(id,own,board){var d=dd(id),ms=(inventory.ms||{}),got=!!ms['D'+id],dia=board?15:30,eq=!board&&EQ===id,pr=null;
  var how=board?'Fundort: liegt als 🎲 Würfel-Feld auf dem Spielfeld. Einmal benutzbar, 3 Plätze.':(id==='city'?'':'So bekommst du ihn: '+(HOW[id]?HOW[id][0]:'?')+(HOW[id]&&HOW[id][1]&&!got?' ('+HOW[id][1]()+')':''));
  var tag=got?(ms['X'+id]?'<span style="color:#6c6">✔ ABGEHOLT</span>':'<button class="btn btn-sm" style="margin-top:3px" onclick="event.stopPropagation();__kamDieClaim(\''+id+'\')">🎁 ABHOLEN · 💎 '+dia+'</button>'):'<span style="color:#c8a070">🔒 noch nicht gefunden · 🎁 Belohnung: 💎 '+dia+'</span>';
  var right=board?'':(own?(eq?'✔ ANGELEGT':'ANLEGEN'):'🔒');
  return '<div class="di'+(eq?' eq':'')+(own||board?'':' lk')+'"'+((!board&&own)?' data-id="'+id+'"':'')+'>'+(board||own?dieHTML(id,38):'<span class="md" style="width:38px;height:38px;background:#222"></span>')+'<div class="t"><b>'+d.n+'</b><small>'+(id==='city'&&own?cityInfo():d.d)+'</small>'+(how?'<small style="color:#a08aa8">'+how+'</small>':'')+'<small>'+tag+'</small></div><div class="pr">'+right+'</div></div>'}
function dieShop(){
  var box=$('kamDiceShop');if(!box)return;inventory.ms=inventory.ms||{};
  try{Object.keys(BD).concat(Object.keys(SD)).forEach(function(id){if(SD[id]&&OWN.indexOf(id)>=0)foundDie(id,false)})}catch(e){}
  var ms=inventory.ms||{},nB=Object.keys(BD).filter(function(b){return ms['D'+b]}).length,sd=Object.keys(SD).filter(function(s){return s!=='city'}),nS=sd.filter(function(s){return ms['D'+s]}).length;
  var h='<div style="font-size:.7rem;opacity:.85;margin-bottom:6px">Gefunden: <b>'+(nB+nS)+' / '+(Object.keys(BD).length+sd.length)+'</b> · für jeden neuen Würfel gibt es eine Belohnung (Diamanten). Alle Brettwürfel: 📦 Diamant-Kiste, alle Dauerwürfel: 📦 Legendäre Kiste.</div>';
  h+='<h3 style="margin:10px 0 4px">🎲 BRETTWÜRFEL ('+nB+'/'+Object.keys(BD).length+')</h3><div class="ds">';
  Object.keys(BD).forEach(function(id){h+=dieRow(id,true,true)});
  h+='</div><h3 style="margin:14px 0 4px">♾️ DAUERWÜRFEL ('+nS+'/'+sd.length+')</h3><div style="font-size:.62rem;color:#a08aa8;margin-bottom:4px">Ein Dauerwürfel kann angelegt werden und wirkt bei jedem Wurf.</div><div class="ds">';
  Object.keys(SD).forEach(function(id){if(id==='city'&&OWN.indexOf('city')<0)return;h+=dieRow(id,OWN.indexOf(id)>=0,false)});
  var hasD=localStorage.getItem('robDragonDie')==='1';h+='<div class="di dr" data-id="dragon"><span class="md" style="width:38px;height:38px;padding:6px;background:linear-gradient(145deg,#1a1a2e,#050510)"><i class="p" style="background:#ff7a3a"></i></span><div class="t"><b>Drachenwürfel</b><small>Bei jedem Drachen: 3/4/5/6 = 30–60% Leben weg · ★ Oneshot · ☠ = +5000 Münzen, aber der Drache erledigt dich</small><small style="color:#a08aa8">So bekommst du ihn: Spezial-Shop, 500.000 Münzen, dauerhaft</small></div><div class="pr">'+(hasD?'✔ GEKAUFT':'🪙 500.000')+'</div></div>';
  h+='</div>';box.innerHTML=h;
  [].forEach.call(box.querySelectorAll('.di[data-id]'),function(nd){nd.onclick=function(){
    var id=nd.dataset.id;
    if(id==='dragon')return;
    EQ=EQ===id?'':id;
    saveD();dieShop();invUI();hud()}});
}
window.__kamDDex=function(){var m=$('kamDDexModal');if(!m){m=document.createElement('div');m.id='kamDDexModal';m.style.cssText='position:fixed;inset:0;z-index:900;background:#0b0816f2;overflow:auto;padding:14px;font-family:Cinzel,Georgia,serif;color:#f5e6b0;display:none';
  m.innerHTML='<div style="max-width:440px;margin:0 auto"><div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><button class="btn btn-sm" onclick="document.getElementById(\'kamDDexModal\').style.display=\'none\'">← ZURÜCK</button><b style="font-size:1.05rem">🎲 WÜRFEL-LEXIKON</b></div><div id="kamDiceShop"></div></div>';document.body.appendChild(m)}
  m.style.display='block';dieShop()};
var CUBE={1:[0,0],2:[0,-90],6:[0,-180],5:[0,90],3:[-90,0],4:[90,0]};
function setCube(v,spin){var c=$('kamCube');if(!c)return;c.classList.remove('spin');c.style.transform='rotateX('+(CUBE[v][0]+(spin?720:0))+'deg) rotateY('+(CUBE[v][1]+(spin?720:0))+'deg)'}
/* Würfelgeräusch: Holzwürfel rollt über einen Tisch (WebAudio, ohne Datei) */
var AC=null;
function ac(){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
var DICE_VOL=.05;
function knock(t,vol,f){var a=ac();if(!a)return;vol=vol*DICE_VOL;
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
  if(typeof autoRunActive!=='undefined'&&autoRunActive&&autoRunData.level<K.k){autoRunActive=false;clearInterval(autoRunInterval);updateAutoRunUI();msg('Auto-Run Stufe '+autoRunData.level+' gilt nur bis Kammer '+autoRunData.level+'. Besiege den Drachen dieser Kammer, dann kannst du die nächste Stufe kaufen.');return}
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
    applyFightBonus();var dm='Der Drache versperrt den Weg!';if(localStorage.getItem('robDragonDie')==='1'){try{var bm=monstersInFight[0],F=['3','4','5','6','star','skull'],f=F[Math.floor(Math.random()*F.length)];
if(f==='star'){bm.hp=1;dm+=' 🎲 Drachenwürfel: ★ ONE-SHOT! Ein Schlag und er fällt.';fl('★ ONESHOT','#ffd24a')}
else if(f==='skull'){meta.gold+=5000;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}fl('☠ +5000 🪙','#ff4a4a');msg('🎲 Drachenwürfel: ☠☠ Totenkopf! +5000 Münzen, aber der Drache erledigt dich!');meta.hp=0;try{if(window.__kamDeathSoul)window.__kamDeathSoul()}catch(e){}saveHeroData();updateUI();setTimeout(showDeath,700);return}
else{var ch=Math.round(bm.maxHp*.1*Number(f));bm.hp=Math.max(1,bm.hp-ch);dm+=' 🎲 Drachenwürfel: '+f+' → -'+ch+' Leben ('+(Number(f)*10)+'%)!';fl('🎲 '+f+' · -'+f*10+'%','#ffd24a')}
renderFight()}catch(e){}}msg(dm);return afterAny()}
  if(o.t==='monster'&&!o.used){o.used=true;o.el.classList.add('used');var tp=kamFight(o);msg(tp.length>1?tp.map(function(t){return MONSTER_NAMES[t]}).join(' und ')+' greifen an!':MONSTER_NAMES[o.m]+' greift an!');return afterAny()}
  if(!o.used){
    if(o.t==='die'){if(INV.length>=3){msg('Alle 3 Plätze voll. Der Würfel bleibt liegen.');updateUI();return}INV.push(o.d);foundDie(o.d,true);ST.dice++;saveST();saveD();invUI();checkUnlocks();fl('🎲 '+dd(o.d).n,'#fff');msg(dd(o.d).n+' eingesammelt: '+dd(o.d).d+'.');o.used=true;if(o.el)o.el.classList.add('used');updateUI();return}
    if(o.t==='gold'){var g=Math.floor((o.v+(K.gb||0))*(typeof getSchurkeGoldMult==='function'?getSchurkeGoldMult():1));
      if(heroData[meta.hero].skills.includes('ben1')&&Math.random()<.3){g*=2;try{showSkillPopup('🍀 GLÜCKSGRIFF! Doppeltes Gold!')}catch(e){}}
      if(window.__kamGoldM)g=Math.floor(g*window.__kamGoldM());
      meta.gold+=g;K.gb=0;fl('+'+g+' 🪙','#ffd24a');msg('Gold gefunden.');
      try{if(playerClass){questTracking.goldEarned=(questTracking.goldEarned||0)+g;saveQuestTracking()}}catch(e){}}
    else if(o.t==='chest'){var etc=Math.min(10,Math.ceil(o.r/ETG));msg(CHL[o.ch]+' gefunden!');try{var ci=o.el&&o.el.querySelector('img.kch');if(ci)ci.src='items/chest_'+o.ch+'_2.webp'}catch(e){}try{openChest(o.ch,etc)}catch(e){}}
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
/* ---------- Platz merken (Reload / Verlassen) ---------- */
var RK='robKamRun';
function mulb(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function kBuild(k,R){var seed=(R&&R.k===k)?R.seed:Math.floor(Math.random()*4294967296),o=Math.random;Math.random=mulb(seed);try{build(k)}finally{Math.random=o}K.seed=seed;
  if(R&&R.k===k){try{kRestore(R)}catch(e){}}else{try{localStorage.removeItem(RK)}catch(e){}}}
function kRestore(R){
  (R.used||[]).forEach(function(kk){var n=K.N[kk];if(n){n.used=true;if(n.el)n.el.classList.add('used')}});
  K.etage=R.etage||1;K.gb=R.gb||0;K.dieE=R.dieE||{};if(R.round)meta.round=R.round;
  var nd=K.N[key(R.cur[0],R.cur[1])]||K.N[key(0,CM)];K.cur=nd;
  var fresh=(Date.now()-(R.t||0))<3600000;
  if(R.hp>0)meta.hp=Math.min(meta.maxHp,R.hp);
  if(R.ah){try{['arc','mag'].forEach(function(w){if(R.ah[w]&&AH[w]){AH[w].hp=R.ah[w].hp;AH[w].max=R.ah[w].max}})}catch(e){}}
  if(R.f&&fresh&&R.f.mons&&R.f.mons.length){inFight=true;monstersInFight=R.f.mons;fightBoss=!!R.f.boss;pendingBossNum=R.f.pb||0;meta._fightTookDamage=false;hinterhaltAvailable=true;hiebAvailable=true;shieldActive=false;try{renderFight()}catch(e){}
    place();hud();msg('Willkommen zurück! Dein Kampf geht weiter.');return}
  if(nd.t==='boss'){var below=K.N[key(nd.r-1,CM)];if(!below){for(var kk2 in K.N){var q=K.N[kk2];if(q.r===nd.r-1){below=q;break}}}if(below)K.cur=below}
  place();hud();msg('Willkommen zurück! Du stehst wieder auf deinem Platz.')}
function saveRun(){try{
  if(!K||!K.cur||!meta||meta.hp<=0||bossWon){return}
  var ov=$('overlayMsg');if(ov&&getComputedStyle(ov).display!=='none'){localStorage.removeItem(RK);return}
  var used=[];for(var kk in K.N)if(K.N[kk].used)used.push(kk);
  var R={k:K.k,seed:K.seed,cur:[K.cur.r,K.cur.c],used:used,etage:K.etage,gb:K.gb,dieE:K.dieE,round:meta.round,hp:meta.hp,t:Date.now(),ah:{arc:{hp:AH.arc.hp,max:AH.arc.max},mag:{hp:AH.mag.hp,max:AH.mag.max}}};
  if(inFight&&monstersInFight&&monstersInFight.length){try{R.f={mons:JSON.parse(JSON.stringify(monstersInFight)),boss:!!fightBoss,pb:pendingBossNum}}catch(e){}}
  localStorage.setItem(RK,JSON.stringify(R))}catch(e){}}
setInterval(saveRun,2000);addEventListener('pagehide',saveRun);document.addEventListener('visibilitychange',function(){if(document.hidden)saveRun()});
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
    var RR=null;if(!window.__kamRestDone){window.__kamRestDone=1;try{RR=JSON.parse(localStorage.getItem(RK)||'null')}catch(e){RR=null}
      if(RR&&RR.k&&RR.k<=mb+1&&RR.seed!=null){k=RR.k}else RR=null}
    board=['empty'];pos=0;kBuild(k,RR);
  };
  window.drawBoard=function(){};
  var oAtk=window.attack;
  window.attack=function(){try{if(localStorage.getItem('robOneHit')==='1'&&monstersInFight&&monstersInFight[0]){monstersInFight.forEach(function(m){if(m&&m.isBoss&&m.hp>1)m.hp=1})}}catch(e){}return oAtk.apply(this,arguments)};
  var oSw=window.runSwing;window.runSwing=function(){if(inFight&&$('kam')&&typeof meta!=='undefined'&&meta){try{window.__kamStrike&&window.__kamStrike()}catch(e){}}return oSw&&oSw.apply(this,arguments)};
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


/* ---------- Gruppe: Bogenschuetzin (ab Heldenlevel 5) und Magierin (ab Heldenlevel 30) stehen hinten und helfen im Kampf ---------- */
var ALLY=[
 {id:'arc',ic:'🏹',nm:'Bogenschützin',need:5,dir:'h/',w:68,l:49,b:60,idle:['elf_i0','elf_i1'],atk:['elf_at','elf_at'],mult:.5,pj:'arrow',col:'#ffd24a'},
 {id:'mag',ic:'🔮',nm:'Kalifa',need:30,dir:'h/',w:72,l:-10,b:26,idle:['kal_i0','kal_i1'],atk:['kal_at','kal_at'],mult:.4,pj:'orb',col:'#d070ff',heal:true}
];
var SLK='robKamSlots',SLT=(function(){try{var a=JSON.parse(localStorage.getItem(SLK));if(a&&a.length===3&&['hero','arc','mag'].every(function(x){return a.indexOf(x)>=0}))return a}catch(e){}return['hero','arc','mag']})();
function saveSL(){try{localStorage.setItem(SLK,JSON.stringify(SLT))}catch(e){}}
function POS(id){var s=Math.max(0,SLT.indexOf(id)),W={hero:46,arc:68,mag:72}[id]||46;return{l:Math.round([132,50,102][s]-W/2),b:[19,15,54][s],z:[5,6,3][s]}}
function applySlots(){var o=document.getElementById('kamSlotCss');if(o)o.remove();var p=POS('hero'),st=document.createElement('style');st.id='kamSlotCss';st.textContent='body #runHero{left:'+p.l+'px!important;bottom:'+p.b+'px!important;z-index:'+p.z+'!important;width:46px!important;max-width:46px!important}';document.head.appendChild(st);var box=document.getElementById('kamAl');if(box)box.dataset.n=''}
setTimeout(applySlots,0);
var allyRound=0;
function clsLv(){try{return window.__cl!=null?window.__cl:getClassLevel()}catch(e){return 0}}
window.__kamGot=function(){try{return JSON.parse(localStorage.getItem('robKamAl')||'{}')}catch(e){return{}}};
try{if(!localStorage.getItem('robKamAlV2')){localStorage.removeItem('robKamAl');localStorage.setItem('robKamAlV2','1')}}catch(e){}
function gotAl(){try{return JSON.parse(localStorage.getItem('robKamAl')||'{}')}catch(e){return{}}}
function hlvl(){if(window.__hl!=null)return window.__hl;var m=0;try{for(var h in heroData)m=Math.max(m,getHeroLevel(h))}catch(e){}return m}
function allyList(){var c=hlvl(),g=gotAl();return ALLY.filter(function(a){return c>=a.need||g[a.id]})}
function allyUnlockToast(){
  var got={};try{got=JSON.parse(localStorage.getItem('robKamAl')||'{}')}catch(e){}
  var c=hlvl(),ch=false;
  ALLY.forEach(function(a){if(c>=a.need&&!got[a.id]){got[a.id]=1;ch=true;toast(a.ic+' '+a.nm+' schließt sich dir an und hilft im Kampf!')}});
  if(ch)try{localStorage.setItem('robKamAl',JSON.stringify(got))}catch(e){}
}
function syncAllies(){
  var w=$('sceneWrap');if(!w)return;
  var box=$('kamAl'),on=inFight&&monstersInFight&&monstersInFight.length&&$('kam'),L=on?allyList():[];
  if(!L.length){if(box)box.remove();return}
  if(!box){box=document.createElement('div');box.id='kamAl';w.appendChild(box)}
  if(box.dataset.n==String(L.length)+SLT.join())return;
  box.dataset.n=String(L.length)+SLT.join();box.innerHTML='';
  L.forEach(function(a){var i=document.createElement('img');i.id='kal_'+a.id;i.alt='';i.src=(a.dir||'ally/')+a.idle[0]+'.webp';var ps=POS(a.id);i.style.cssText='left:'+ps.l+'px;bottom:'+ps.b+'px;width:'+a.w+'px;z-index:'+ps.z;box.appendChild(i)});
}
var allyT=0;
setInterval(function(){allyT++;allyList().forEach(function(a){var i=$('kal_'+a.id);if(i&&!a.busy)i.src=(a.dir||'ally/')+a.idle[allyT%2]+'.webp'})},480);
function animAlly(a,dm){
  var i=$('kal_'+a.id),w=$('sceneWrap');if(!i||!w)return;
  a.busy=true;i.src=(a.dir||'ally/')+a.atk[0]+'.webp';
  setTimeout(function(){i.src=(a.dir||'ally/')+a.atk[1]+'.webp'},110);
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
  setTimeout(function(){a.busy=false;i.src=(a.dir||'ally/')+a.idle[0]+'.webp'},560);
}
function allyStrike(){
  var L=allyList().filter(function(a){return aliveA(a.id)});if(!L.length)return;
  allyRound++;var d=0;
  L.forEach(function(a,k){var dm=Math.max(1,Math.round(meta.attack*a.mult)+(window.__kamAllyBonus?window.__kamAllyBonus(a.id):0));d+=dm;setTimeout(function(){animAlly(a,dm)},170+k*230)});
  meta.attack+=d;setTimeout(function(){meta.attack-=d},0);
  if(L.some(function(a){return a.heal})&&allyRound%3===0)setTimeout(function(){
    if(!inFight||meta.hp<=0)return;var h=Math.max(1,Math.round(meta.maxHp*.08));meta.hp=Math.min(meta.maxHp,meta.hp+h);
    fl('+'+h+' ❤ Magierin','#d070ff');try{updateUI()}catch(e){}},760);
}
(function(){var st=document.createElement('style');st.textContent='#kamAl{position:absolute;inset:0;pointer-events:none;z-index:auto}#kamAl img{position:absolute;display:block;filter:drop-shadow(0 3px 4px #000a)}.kpj{position:absolute;z-index:9;pointer-events:none}.kpj.arrow{width:86px;height:48px;margin-top:-24px;background:url(ally/fx_arrow.png) center/contain no-repeat;mix-blend-mode:screen}.kpj.stream{width:84px;height:36px;margin-top:-18px;background:url(ally/fx_stream.png) center/contain no-repeat;mix-blend-mode:screen}.kpj.splash{width:60px;height:39px;margin:-20px 0 0 -30px;background:url(ally/fx_splash.png) center/contain no-repeat;mix-blend-mode:screen}.kpj.orb{width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;background:radial-gradient(#fff 15%,#c050ff 55%,#0000 72%);box-shadow:0 0 16px #b040ff}.kdm{position:absolute;z-index:10;pointer-events:none;font-weight:900;font-size:1.05rem;text-shadow:0 2px 4px #000}';document.head.appendChild(st)})();

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
TYPE_LABEL.bow='Bogen';TYPE_LABEL.staff='Stab';TYPE_LABEL.cape='Umhang';TYPE_LABEL.hand='Handschuhe';TYPE_LABEL.book='Buch';TYPE_LABEL.shield='Schild';
[['glove1','Stoffhandschuhe','hand','normal',2,0],['glove2','Lederhandschuhe','hand','gruen',5,0],['glove3','Kettenhandschuhe','hand','blau',10,3],['glove4','Drachenhandschuhe','hand','episch',18,6],['glove5','Himmelshandschuhe','hand','legendaer',30,10],
['book1','Altes Buch','book','normal',2,0],['book2','Zauberfibel','book','gruen',5,3],['book3','Runenbuch','book','blau',10,6],['book4','Arkanum','book','episch',18,10],['book5','Sternenbuch','book','legendaer',30,15],
['shield1','Holzschild','shield','normal',0,6],['shield2','Eisenschild','shield','gruen',0,14],['shield3','Stahlschild','shield','blau',2,25],['shield4','Drachenschild','shield','episch',4,45],['shield5','Himmelsschild','shield','legendaer',8,80]].forEach(function(n){if(ITEMS.some(function(x){return x.id===n[0]}))return;
 ITEMS.push({id:n[0],name:n[1],type:n[2],rarity:n[3],atk:n[4],hp:n[5],desc:(n[4]?'+'+n[4]+' ATK':'')+(n[4]&&n[5]?' ':'')+(n[5]?'+'+n[5]+' HP':'')})});
function pushAll(a,l){l.forEach(function(x){a.push(x)})}
[['amu1','Holzamulett','amulet','normal',2,6],['amu2','Kupferamulett','amulet','gruen',4,15],['amu3','Silberamulett','amulet','blau',8,30],['amu4','Runenamulett','amulet','episch',15,50],['amu5','Himmelsamulett','amulet','legendaer',25,80],
 ['boot1','Stoffschuhe','boots','normal',0,6],['boot2','Lederstiefel','boots','gruen',2,14],['boot3','Eisenstiefel','boots','blau',4,30],['boot4','Drachenstiefel','boots','episch',8,55],['boot5','Himmelsstiefel','boots','legendaer',14,90],
 ['quiv1','Alter Köcher','quiver','normal',2,0],['quiv2','Lederköcher','quiver','gruen',5,0],['quiv3','Jägerköcher','quiver','blau',10,3],['quiv4','Drachenköcher','quiver','episch',18,6],['quiv5','Himmelsköcher','quiver','legendaer',30,10],
 ['sho1','Stoffpolster','shoulder','normal',0,8],['sho2','Lederpolster','shoulder','gruen',1,18],['sho3','Eisenschultern','shoulder','blau',3,38],['sho4','Drachenschultern','shoulder','episch',6,68],['sho5','Himmelsschultern','shoulder','legendaer',10,110]].forEach(function(n){if(!ITEMS.some(function(y){return y.id===n[0]}))ITEMS.push({id:n[0],name:n[1],type:n[2],rarity:n[3],atk:n[4],hp:n[5],desc:(n[4]?'+'+n[4]+' ATK':'')+(n[4]&&n[5]?' ':'')+(n[5]?'+'+n[5]+' HP':'')})});
TYPE_LABEL.amulet='Amulett';TYPE_LABEL.boots='Schuhe';TYPE_LABEL.quiver='Köcher';TYPE_LABEL.shoulder='Schulter';
pushAll(MONSTER_POOL,['amu1','boot1','quiv1','sho1']);
pushAll(BOSS_POOL,['amu2','amu3','amu4','amu5','boot2','boot3','boot4','boot5','quiv2','quiv3','quiv4','quiv5']);
try{pushAll(CHEST_CONFIG.wood.itemPool,['amu1','boot1','quiv1']);pushAll(CHEST_CONFIG.dia.itemPool,['amu2','amu3','boot2','boot3','quiv2','quiv3']);pushAll(CHEST_CONFIG.legend.itemPool,['amu3','amu4','boot3','boot4','quiv3','quiv4']);pushAll(CHEST_CONFIG.sin.itemPool,['amu4','amu5','boot4','boot5','quiv4','quiv5'])}catch(e){}

pushAll(MONSTER_POOL,['bow1','staff1','cape1','glove1','book1','shield1']);
pushAll(BOSS_POOL,['bow2','bow3','bow4','bow5','staff2','staff3','staff4','staff5','cape2','cape3','cape4','cape5','helm4','helm5','glove2','glove3','glove4','glove5','book2','book3','book4','book5','shield2','shield3','shield4','shield5']);
try{pushAll(CHEST_CONFIG.wood.itemPool,['bow1','staff1','cape1','glove1','book1','shield1']);pushAll(CHEST_CONFIG.dia.itemPool,['bow2','bow3','staff2','staff3','cape2','cape3','glove2','glove3','book2','book3','shield2','shield3']);
pushAll(CHEST_CONFIG.legend.itemPool,['bow3','bow4','staff3','staff4','cape4','helm4','glove3','glove4','book3','book4','shield3','shield4']);pushAll(CHEST_CONFIG.sin.itemPool,['bow4','bow5','staff4','staff5','cape5','helm5','glove4','glove5','book4','book5','shield4','shield5'])}catch(e){}
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
function give(bid,c){ens();bump('found');inventory.seen=inventory.seen||{};inventory.seen[bid]=1;var u='u'+inventory.nid++;inventory.inst[u]={b:bid,c:c,s:0};inventory.items.push(u);try{saveInventory()}catch(e){}return it(u)}
function mul(i){return CM[i.c]*(1+.15*i.s)}
function st(i){var m=mul(i);return{atk:Math.round((i.atk||0)*m),hp:Math.round((i.hp||0)*m)}}
function fxv(i){return i.fx?i.fx.v*CM[i.c]*(1+.07*i.s):0}
function stars(i){return '★'.repeat(i.s)+'☆'.repeat(3-i.s)}
function descOf(i){var d;if(i.fx){var f=FXD.filter(function(x){return x[0]===i.fx.k})[0],v=Math.round(fxv(i)*10)/10;
  d=f[3](v)}else{var q=st(i);d=(q.atk?'+'+q.atk+' ATK':'')+(q.atk&&q.hp?' ':'')+(q.hp?'+'+q.hp+' HP':'')}return d}
function ai(){ens();if(!inventory.ally)inventory.ally={arc:{},mag:{}};if(!inventory.ally.arc)inventory.ally.arc={};if(!inventory.ally.mag)inventory.ally.mag={};return inventory.ally}
function gear(w){return w==='hero'?inventory.equipped:ai()[w]}
function wkey(uid){for(var t in inventory.equipped)if(inventory.equipped[t]===uid)return['hero',t];var a=ai();for(var k in a)for(var t2 in a[k])if(a[k][t2]===uid)return[k,t2];return null}
function wearer(uid){var i=it(uid);if(!i)return null;var w=wkey(uid);return w?w[0]:null}
function worn(){ens();var r=[],g=inventory.equipped;for(var t in g){var i=it(g[t]);if(i)r.push({w:'hero',i:i})}var a=ai();for(var k in a)for(var t2 in a[k]){var j=it(a[k][t2]);if(j)r.push({w:k,i:j})}return r}
function fxSum(k,w){var s=0;worn().forEach(function(x){if(x.i.fx&&x.i.fx.k===k&&(!w||x.w===w))s+=fxv(x.i)});return s}
window.__kamHG=function(){ens();var h=0,a=0;for(var t in inventory.equipped){var i=it(inventory.equipped[t]);if(i){var q=st(i);h+=q.hp;a+=q.atk}}return{hp:h,atk:a}};
window.__kamAGH=function(id){var g=ai()[id]||{},h=0;for(var t in g){var i=it(g[t]);if(i)h+=st(i).hp}return h};
function restat(uid,fn){var i0=it(uid),o=i0?st(i0):{atk:0,hp:0},w=wearer(uid);fn();var n=st(it(uid));
 if(w&&meta){if(w==='hero'){meta.attack=Math.max(1,meta.attack+n.atk-o.atk);meta.maxHp=Math.max(1,meta.maxHp+n.hp-o.hp);meta.hp=Math.min(meta.hp,meta.maxHp)}try{updateUI()}catch(e){}}}
function allyDmg(w){var A=ALLY.filter(function(z){return z.id===w})[0];if(!A)return 0;var hg=0;try{hg=window.__kamHG().atk}catch(e){}return Math.max(1,Math.round(Math.max(1,meta.attack-hg)*A.mult)+window.__kamAllyBonus(w))}
window.__kamAllyBonus=function(w){var g=ai()[w]||{},a=0;for(var t in g){var i=it(g[t]);if(i)a+=st(i).atk}return a};
function allyHp(){var a=ai(),h=0;for(var k in a)for(var t in a[k]){var i=it(a[k][t]);if(i)h+=st(i).hp}return h}
window.getEquippedBonuses=function(){ens();var a=0,h=0;for(var t in inventory.equipped){var i=it(inventory.equipped[t]);if(i){var q=st(i);a+=q.atk;h+=q.hp}}return{atk:a,hp:h}};
function clv(){try{return window.__cl!=null?window.__cl:getClassLevel()}catch(e){return 0}}

/* ---- Kampf-Effekte ---- */
window.__kamGoldM=function(){return (1+goldBonus()/100)*(1+fxSum('goldm')/100)*(1+suLv('gold')*.02)*(1+(prestigeData.count||0)*.15)*(meta&&meta.hero==='ben'?1.15:1)};
window.__kamDiaReward=function(b){return Math.round(b*(1+(prestigeData.count||0)*.15))+suLv('dias')};
window.__kamMonHit=function(m,md){
 if(teamSp('aegis')){ARS.ag=(ARS.ag||0)+1;if(ARS.ag<=2){fl('🛡️ Aegis','#8fd8ff');return 0}}
 if(m&&m.__frz>0){m.__frz=0;fl('💫 Gegner verliert den Angriff','#8fd8ff');return 0}
 if(Math.random()*100<Math.min(60,gs('dodge'))){fl('💨 Verfehlt','#cfe');return 0}
 var wk=Math.min(50,gs('weak'));if(wk>0)md=Math.max(1,Math.round(md*(1-wk/100)));
 if(Math.random()*100<fxSum('eis')*2){fl('❄️ erstarrt','#8fd8ff');return 0}
 if(Math.random()*100<fxSum('dodge')){fl('💨 Ausgewichen','#cfe');return 0}
 var er=Math.min(60,fxSum('erde')*2);if(er>0)md=Math.max(1,Math.round(md*(1-er/100)));return md};
function kamStrike(){
 var m=monstersInFight&&monstersInFight[0];if(!m||meta.hp<=0)return;
 var bf=fxSum('feuer');if(bf>0){var b=Math.max(1,Math.round(m.maxHp*(bf/100)*(m.isBoss?.5:1)));m.hp=Math.max(1,m.hp-b);fl('🔥 -'+b,'#ff8a3a')}
 var bs=meta.attack;
 monstersInFight.forEach(function(t){if(t.__dot&&t.__dot.n>0&&t.hp>1){sideD(t,t.__dot.d);t.__dot.n--;fl('☣️ -'+t.__dot.d,'#9fdc5a')}});
 armRound();
 var ex=0;try{ex=strikeFx('hero',bs)}catch(e){}
 try{allyStrike()}catch(e){}
 if(ex>0){meta.attack+=ex;setTimeout(function(){meta.attack-=ex},0)}
 if(Math.random()*100<fxSum('donner','hero')*2){meta.attack+=bs;setTimeout(function(){meta.attack-=bs},0);fl('⚡ Doppeltreffer','#ffe14a')}}
window.__kamStrike=kamStrike;
allyStrike=function(){var L=allyList().filter(function(a){return aliveA(a.id)});if(!L.length)return;allyRound++;var d=0;
 L.forEach(function(a,k){var dm=Math.max(1,Math.round(Math.max(1,meta.attack-window.__kamHG().atk)*a.mult)+window.__kamAllyBonus(a.id));
  if(Math.random()*100<fxSum('donner',a.id)*2)dm*=2;
  try{dm+=strikeFx(a.id,dm)}catch(e){}
  d+=dm;setTimeout(function(){animAlly(a,dm)},170+k*230)});
 meta.attack+=d;setTimeout(function(){meta.attack-=d},0);
 if(L.some(function(a){return a.heal})&&allyRound%3===0)setTimeout(function(){
  if(!inFight||meta.hp<=0)return;var h=Math.max(1,Math.round(meta.maxHp*.08));meta.hp=Math.min(meta.maxHp,meta.hp+h);
  fl('+'+h+' ❤ Magierin','#d070ff');try{updateUI()}catch(e){}},760)};
var oLand=land;land=function(){var rg=fxSum('regen');if(rg>0&&meta&&meta.hp>0){var h=Math.max(1,Math.round(meta.maxHp*rg/100));meta.hp=Math.min(meta.maxHp,meta.hp+h)}return oLand.apply(this,arguments)};

/* ---- Drops ---- */
function oimg(k){return '<img src="items/orb_'+k+'.webp" style="width:1.25em;height:1.25em;vertical-align:-.28em" alt="">'}
var ORB={blau:['🔵','Blaue Kugel',oimg('blau')],lila:['🟣','Lila Kugel',oimg('lila')],orange:['🟠','Orange Kugel',oimg('orange')]};
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function condRoll(used,perf){var r=Math.random()*100;if(r<perf)return 2;return Math.random()*100<used?0:1}
function loot(iron,orbs){ens();var m='';if(iron>0){inventory.iron=(inventory.iron||0)+iron;bump('ironTotal',iron);m+=' +'+iron+' <img src="items/ore_silver.webp?v=1113" style="height:1.15em;vertical-align:-.25em" alt="">'}
 for(var k in orbs)if(Math.random()*100<orbs[k]){inventory.orbs[k]=(inventory.orbs[k]||0)+1;m+=' +'+ORB[k][2]}
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
var HC={5:['wood'],10:['wood'],15:['wood'],20:['dia'],25:['dia'],30:['dia'],40:['dia'],50:['legend'],60:['legend'],70:['legend'],80:['legend','dia'],90:['sin'],100:['sin','sin']};
var CC2={10:['wood'],15:['wood'],20:['dia'],30:['dia'],40:['dia'],50:['legend'],60:['legend'],70:['legend'],80:['legend'],90:['sin'],100:['sin']};
var CG={10:[['ring2',0]],15:[['helm3',0]],20:[['armor4',0]],30:[['sword4',1]],40:[['cape4',1]],50:[['helm5',1]],70:[['bow5',2]],90:[['staff5',2]],100:[['armor5',2]]};
var CX={5:{iron:5},15:{blau:1,iron:10},20:{iron:15},25:{lila:1},40:{orange:1},60:{orange:1},80:{orange:2}};
function grant(items,ex,why,chs){var t=[];(items||[]).forEach(function(g){var r=giveOrSell(g[0],g[1],true);if(r.item)t.push(r.item.name+' ('+CN[g[1]]+')')});
 ex=ex||{};if(ex.iron){inventory.iron=(inventory.iron||0)+ex.iron;bump('ironTotal',ex.iron);t.push('<img src="items/ore_silver.webp?v=1113" style="height:1.15em;vertical-align:-.25em" alt=""> '+ex.iron)}
 ['blau','lila','orange'].forEach(function(o){if(ex[o]){inventory.orbs[o]=(inventory.orbs[o]||0)+ex[o];t.push(ORB[o][0]+' ×'+ex[o])}});
 (chs||[]).forEach(function(ct){try{window.__kamChestAdd(ct);t.push('📦 '+(CHN[ct]||ct)+' (im Inventar)')}catch(e){}});
 if(t.length){try{window.__kamLogR(why+': '+t.join(', '))}catch(e){}try{toast('🎁 '+why+': '+t.join(', '))}catch(e){}log('<span style="color:#ffd24a">🎁 '+why+': '+t.join(', ')+'</span>')}}
function maxHeroLv(){var m=0;try{for(var h in heroData)m=Math.max(m,getHeroLevel(h))}catch(e){}return m}
function milestones(){if(!meta||!meta.hero)return;ens();var ms=inventory.ms=inventory.ms||{},ch=false;
 try{if(ms.p1)ms.P1=1;for(var pn=1;pn<=(prestigeData.count||0);pn++){if(!ms['P'+pn]){ms['P'+pn]=1;ch=true;var px=PX[Math.min(pn,10)];if(px){grant(px.items,px,'Prestige '+pn);if(px.souls){pd().souls+=px.souls;savePrestige()}if(px.perfect)perfectGift(4,'Prestige '+pn)}}}}catch(e){}
 var hl=maxHeroLv(),cl=clv();
 for(var L=5;L<=100;L+=5){if(hl>=L&&!ms['H'+L]){ms['H'+L]=1;if(HG[L]||HX[L]||HC[L]){ch=true;grant(HG[L],HX[L],'Held-Level '+L,HC[L])}}
  if(cl>=L&&!ms['C'+L]){ms['C'+L]=1;if(CG[L]||CX[L]||CC2[L]){ch=true;grant(CG[L],CX[L],'Klassen-Level '+L,CC2[L])}}}
 if(ch)try{saveInventory()}catch(e){}}
/* Heldenlevel: jedes Level gibt jetzt Gold (190 + 10 pro Level), die bisherigen Gold-Belohnungen zaehlen doppelt */
window.__kamLvReward=function(L){var r=(typeof LEVEL_REWARDS!=='undefined'&&LEVEL_REWARDS[L-1])||{};return{g:190+10*L+(r.g||0)*2,h:r.h||0,a:r.a||0,d:r.d||0}};
function chestChips(a){var h='';(a||[]).forEach(function(t){h+='<span class="lc big">📦 '+(CHN[t]||t)+'</span>'});return h}

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
var dTot=function(){return Object.keys(SD).length};
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
function seenSet(){ens();var s={};Object.keys(inventory.seen||{}).forEach(function(b){s[b]=1});Object.keys(inventory.inst).forEach(function(u){s[inventory.inst[u].b]=1});return s}
function seenN(f){return function(){var s=seenSet(),n=0;ITEMS.forEach(function(b){if(s[b.id]&&(!f||f(b)))n++});return n}}
function allN(f){return function(){return ITEMS.filter(f).length}}
var WT=['weapon','bow','staff','club','axe','spear','fist','hand','book'],AT=['armor'],HT=['helm'],RT=['ring'],CT=['cape'],ST2=['shield'];
function ty(a){return function(b){return a.indexOf(b.type)>=0}}
function rar(r){return function(b){return b.rarity===r}}
function comp(){try{return (inventory.comp&&inventory.comp.own)||{}}catch(e){return {}}}
function cown(){return Object.keys(comp()).length}
function cmax(f){return function(){var o=comp(),n=0;Object.keys(o).forEach(function(k){if(f(o[k]))n++});return n}}
function gemN(){try{var g=inventory.gems||{},n=0;Object.keys(g).forEach(function(k){n+=g[k]||0});return n}catch(e){return 0}}
function gemT(t){return function(){try{var g=inventory.gems||{};return Object.keys(g).some(function(k){return +k.slice(1)>=t&&g[k]>0})?1:0}catch(e){return 0}}}
var Q2=[
 ['sa1','Sammle 25 verschiedene Items','📚 Sammlung',25,seenN()],
 ['sa2','Sammle 50 verschiedene Items','📚 Sammlung',50,seenN()],
 ['sa3','Sammle 100 verschiedene Items','📚 Sammlung',100,seenN()],
 ['sa4','Sammle alle Items','📚 Sammlung',0,seenN(),null,function(){return ITEMS.length}],
 ['sa5','Besitze einmal ein grünes Item','📚 Sammlung',1,function(){return seenN(rar('gruen'))()?1:0}],
 ['sa6','Besitze einmal ein blaues Item','📚 Sammlung',1,function(){return seenN(rar('blau'))()?1:0}],
 ['sa7','Besitze einmal ein episches Item','📚 Sammlung',1,function(){return seenN(rar('episch'))()?1:0}],
 ['sa8','Besitze einmal ein legendäres Item','📚 Sammlung',1,function(){return seenN(rar('legendaer'))()?1:0}],
 ['sa9','Sammle alle Waffen','📚 Sammlung',0,seenN(ty(WT)),null,allN(ty(WT))],
 ['sa10','Sammle alle Rüstungen','📚 Sammlung',0,seenN(ty(AT)),null,allN(ty(AT))],
 ['sa11','Sammle alle Helme','📚 Sammlung',0,seenN(ty(HT)),null,allN(ty(HT))],
 ['sa12','Sammle alle Ringe','📚 Sammlung',0,seenN(ty(RT)),null,allN(ty(RT))],
 ['sa13','Sammle alle Umhänge','📚 Sammlung',0,seenN(ty(CT)),null,allN(ty(CT))],
 ['sa14','Sammle alle Schilde','📚 Sammlung',0,seenN(ty(ST2)),null,allN(ty(ST2))],
 ['sa15','Sammle alle legendären Items','🔒 Geheim',0,seenN(rar('legendaer')),function(){return seenN(rar('legendaer'))()>=10},allN(rar('legendaer'))],
 ['sa16','Finde ein mystisches Item','🔒 Geheim',1,function(){return seenN(rar('mystisch'))()?1:0},function(){return seenN(rar('legendaer'))()>=10}],
 ['bg1','Hole deinen ersten Begleiter','🐾 Begleiter',1,cown],
 ['bg2','Besitze 3 Begleiter','🐾 Begleiter',3,cown],
 ['bg3','Besitze alle 5 Begleiter','🐾 Begleiter',5,cown],
 ['bg4','Bringe einen Begleiter auf Form 2','🐾 Begleiter',1,cmax(function(o){return o.f>=2})],
 ['bg5','Bringe einen Begleiter auf Form 3','🐾 Begleiter',1,cmax(function(o){return o.f>=3})],
 ['bg6','Alle Begleiter auf Form 3','🔒 Geheim',5,cmax(function(o){return o.f>=3}),function(){return cown()>=5}],
 ['gm1','Besitze 5 Gems','💠 Gems',5,gemN],
 ['gm2','Besitze 25 Gems','💠 Gems',25,gemN],
 ['gm3','Besitze einen Gem der Stufe 3','💠 Gems',1,gemT(3)],
 ['gm4','Besitze einen Gem der Stufe 5','💠 Gems',1,gemT(5)],
 ['km5','Besiege den Boss von Kammer 15','🗺️ Kammern',15,stt('maxBoss')],
 ['km6','Besiege den Boss von Kammer 20','🗺️ Kammern',20,stt('maxBoss')],
 ['hr6','Erreiche Prestige 5','🦸 Helden',5,tr(function(){return prestigeData.count})],
 ['hr7','Erreiche Prestige 10','🦸 Helden',10,tr(function(){return prestigeData.count})],
 ['sm7','Schmiede 50 Mal erfolgreich','⚒️ Schmiede',50,stt('forged')],
 ['sm8','Werte 10 Items mit Kugeln auf','⚒️ Schmiede',10,stt('upgraded')],
 ['sm9','Verkaufe 100 Items','⚒️ Schmiede',100,stt('sold')],
 ['sm10','Sammle 1.000 Eisenbarren','⚒️ Schmiede',1000,stt('ironTotal')],
 ['sm11','Stelle 5 perfekte Items in der Schmiede her','⚒️ Schmiede',5,stt('craftPerf')],
 ['sm12','Stelle 25 Items in der Schmiede her','⚒️ Schmiede',25,stt('crafted')]];
Q2.forEach(function(x){Q.push(x)});
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
window.__kamDeathSoul=function(){var p=pd();p.soulsPend=(p.soulsPend||0)+1;try{savePrestige()}catch(e){}try{log('<span style="color:#cc88ff">💜 +1 Seele gesammelt (wird beim Prestige ausgezahlt: '+p.soulsPend+')</span>')}catch(e){}};
var HPMAX=20;function hpCost(){return 5+2*suLv('hp')}
window.__kamHpSoul=function(){var l=suLv('hp');if(l>=HPMAX||pd().souls<hpCost())return;pd().souls-=hpCost();pd().su.hp=l+1;try{savePrestige()}catch(e){}try{var f=(1+(l+1)*.04)/(1+l*.04),o=meta.maxHp;meta.maxHp=Math.floor(o*f);meta.hp+=meta.maxHp-o;updateUI()}catch(e){}try{showCity();cityOpen('house')}catch(e){}};
var _co=window.cityOpen;window.cityOpen=function(id){_co(id);if(id!=='house')return;var pn=document.getElementById('cityPanel');if(!pn)return;var l=suLv('hp'),mx=l>=HPMAX,c=hpCost();pn.firstChild.insertAdjacentHTML('beforeend','<div style="margin-top:12px;padding-top:10px;border-top:1px solid #c9a227"><div style="font-weight:700">💜 Seelen-Training · Stufe '+l+'/'+HPMAX+'</div><div style="font-size:.78rem;margin:4px 0">+4% Leben pro Stufe (jetzt +'+(l*4)+'%). Pro Tod bekommst du 1 Seele, sie bleiben beim Prestige.</div><div style="font-size:.8rem;margin-bottom:6px">Deine Seelen: '+pd().souls+'</div>'+(mx?'<div style="color:#8f8">Maximal</div>':'<button class="btn btn-wide" '+(pd().souls<c?'disabled ':'')+'onclick="__kamHpSoul()" style="padding:9px 18px">TRAINIEREN · 💜 '+c+'</button>')+'</div>')};
function soulGain(){ens();return 10+3*((inventory.stats&&inventory.stats.maxBoss)||0)+Math.floor(maxHeroLv()/2)}
window.__kamSoulGain=function(){return soulGain()+(pd().soulsPend||0)};
window.__kamSoulGrant=function(){var g=soulGain()+(pd().soulsPend||0);pd().soulsPend=0;pd().souls+=g;try{savePrestige()}catch(e){}try{toast('💜 +'+g+' Seelen')}catch(e){}};
window.__kamSuBuy=function(k){var d=SU.filter(function(x){return x[0]===k})[0];if(!d||suLv(k)>=d[4])return;var c=suCost(k);if(pd().souls<c)return;pd().souls-=c;pd().su[k]=suLv(k)+1;try{savePrestige()}catch(e){}levelsUI()};

var PL=[[5,'Beute I',[],0,0],[6,'Beute II',['dia'],0,0],[7,'Beute III',[],1000,50],[8,'Beute IV',['dia','dia'],0,0],[9,'Beute V',[],1000,100],[10,'Beute VI',['legend'],1000,50]];
var CHN={wood:'Holzkiste',dia:'Diamant-Kiste',legend:'Legendäre Kiste',sin:'Todsünde-Kiste'};
window.__kamPrestigeLoot=function(top){var r=null;PL.forEach(function(p){if(top>=p[0])r=p});return r?{boss:r[0],name:r[1],chests:r[2],gold:r[3],dias:r[4]}:{boss:0,name:'',chests:[],gold:0,dias:0}};
window.__kamPrestigeGrant=function(l){try{milestones()}catch(e){}if(!(l.chests||[]).length&&!l.gold&&!l.dias)return;var m='';(l.chests||[]).forEach(function(t){try{window.__kamChestAdd(t);m+=' 📦 '+(CHN[t]||t)+' im Inventar'}catch(e){}});try{window.__kamLogR('Prestige-Beute: '+((l.chests||[]).map(function(t){return CHN[t]}).join(' + ')||'Keine Kiste')+' · +'+l.gold+' Gold · +'+l.dias+' Dias')}catch(e){}try{log('<span style="color:#cc88ff">💜 Prestige-Beute: '+((l.chests||[]).map(function(t){return CHN[t]}).join(' + ')||'Keine Kiste')+' · +'+l.gold+' Gold · +'+l.dias+' Dias</span>'+m)}catch(e){}};
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
 if(SHS){r+='<div style="font-size:13px;color:#f0c040;margin:4px 0 4px;display:flex;justify-content:space-between"><b>💜 Seelen-Shop</b><span>Seelen: '+prestigeData.souls+'</span></div><div style="font-size:11px;color:#a08aa8;margin-bottom:8px">Alle Upgrades kosten nur Seelen. Seelen aus Toden werden erst beim Prestige ausgezahlt (gesammelt: '+(prestigeData.soulsPend||0)+'). Das Leben trainierst du in der Kaserne.</div>';
  SU.forEach(function(d){var lv=suLv(d[0]),c2=suCost(d[0]),mx=lv>=d[4],un=true;
   r+='<div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:10px"><div style="font-size:24px">'+d[1]+'</div><div style="flex:1"><div style="font-size:13px">'+d[2]+' <span style="color:#a08aa8;font-size:11px">Stufe '+lv+'/'+d[4]+'</span></div><div style="font-size:11px;color:#a08aa8">'+d[3]+'</div></div>'+
   (un?'<button class="btn btn-sm" '+((mx||prestigeData.souls<c2)?'disabled ':'')+'onclick="__kamSuBuy(\''+d[0]+'\')">'+(mx?'MAX':'💜 '+c2)+'</button>':'<button class="btn btn-sm" '+((meta.gold||0)<500?'disabled ':'')+'onclick="__kamSuUnlock(\''+d[0]+'\')">💰 500</button>')+'</div>'});
  return r}
 r+='<div style="font-size:13px;color:#f0c040;margin:6px 0 8px"><b>Belohnungen pro Prestige</b></div>';
 for(var n=1;n<=10;n++){var d=n<=c,nxt=n===c+1;r+='<div class="pxr'+(d?' dn':nxt?' nx':'')+'"><div class="pxn">'+(d?'✓':n)+'</div><div style="flex:1"><div style="font-size:13px;color:#ffe9c4;margin-bottom:2px">Prestige '+n+(nxt?' · als Nächstes':'')+'</div><span class="pxc st">⚔ Gegner +'+(12*n)+'%</span><span class="pxc gd">💰💎 +'+(15*n)+'%</span><span class="pxc">🍀 Loot +'+(2*n)+'%</span><div>'+pxChips(n)+'</div></div></div>'}
 r+='<div style="font-size:11px;color:#a08aa8;margin:6px 0 12px">Danach je Prestige weiter +12% Gegner, +15% Gold &amp; Dias, +2% Loot. Zurückgesetzt wird nur das Heldenlevel, Shop-Upgrades und die Hälfte deines Goldes. Seelen: 1 pro Tod (gesammelt: '+(prestigeData.soulsPend||0)+') plus ca. '+soulGain()+' beim Prestige, alles wird erst beim Prestige ausgezahlt.</div>';
 return r}
/* ---- Level-Fenster ---- */
var LM=1;
function ico(id){var b=base(id);if(b&&b.zi)return 'items/'+b.zi;var c={normal:'w',gruen:'g',blau:'b',episch:'p',legendaer:'o',mystisch:'r'}[b.rarity]||'g',n={shoulder:'shoulder',weapon:'sword',armor:'armor',helm:'helm',ring:'ring',bow:'bow',staff:'staff',cape:'cape',hand:'hand',amulet:'amu',boots:'boots',quiver:'quiver',book:'book',shield:'shield'}[b.type]||'sword';if(b.type==='shield')n={turm:'tshield',rund:'shield',stachel:'buckler'}[b.sk||'turm'];n={club:'wclub',axe:'waxe',spear:'wspear',potion:'n/potion',fist:'n/fist'}[b.type]||n;if(b.cls==='leder')n+='L';else if(b.cls==='stoff')n+='S';return 'items/'+n+'_'+c+'.webp?v=1113'}
function chips(items,ex){var h='';(items||[]).forEach(function(g){var b=base(g[0]);h+='<span class="lc big'+(g[1]===2?' pf':'')+'"><img src="'+ico(g[0])+'">'+({weapon:'Waffe',armor:'Rüstung',helm:'Helm',ring:'Ring',bow:'Bogen',staff:'Stab',cape:'Umhang'}[b.type]||b.type)+': '+b.name+' ('+(RARITY_LABEL[b.rarity]||b.rarity)+') · '+CN[g[1]]+'</span>'});
 ex=ex||{};if(ex.iron)h+='<span class="lc"><img src="items/ore_silver.webp?v=1113" style="height:1.15em;vertical-align:-.25em" alt=""> '+ex.iron+'</span>';['blau','lila','orange'].forEach(function(o){if(ex[o])h+='<span class="lc">'+ORB[o][2]+' '+ex[o]+(ex[o]>1?' Kugeln':' Kugel')+'</span>'});return h}
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
  if(LM===1){var b=window.__kamLvReward(L);if(b.h)c+='<span class="lc">❤ +'+b.h+'</span>';if(b.a)c+='<span class="lc">⚔ +'+b.a+'</span>';if(b.g)c+='<span class="lc">💰 '+b.g+'</span>';if(b.d)c+='<span class="lc">💎 '+b.d+'</span>';c+=chips(HG[L],HX[L]);c+=chestChips(HC[L]);
   var NHH={5:['elfa','Elfa'],10:['luna','Luna'],15:['jamal','Jamal'],20:['brutus','Brutus'],30:['kalifa','Kalifa']};if(NHH[L])c+='<span class="lc nh big"><img src="items/p_'+NHH[L][0]+'.webp">NEUER HELD: '+NHH[L][1]+'</span>';if(L===60)c+='<span class="lc nh big"><img src="comp/fee_1_i0.webp">BEGLEITER FREI</span>'}
  else{c+=chips(CG[L],CX[L]);c+=chestChips(CC2[L]);if(L===50)c+='<span class="lc nh big"><img src="items/p_jeffrey.webp">NEUER HELD</span>';if(L===100)c+='<span class="lc nh big"><img src="items/p_berta.webp">NEUER HELD</span>'}
  var big=!(LM===1&&L%5&&!RK[L]);h+='<div class="m '+cls+lk+(big?'':' sm')+'"><div class="dot">'+L+'</div><div class="card"><h3>Level '+L+' '+rk+'<span>'+(L<=lv?'✓ erhalten':(lk?'braucht mehr Quests':''))+'</span></h3><div class="rw">'+(c||'<span class="lc">–</span>')+'</div></div></div>'});
 var TOP='<div style="display:flex;align-items:center;gap:10px;margin:0 0 6px"><button class="btn btn-sm" onclick="__kamLvBack()">← ZURÜCK</button><h1 style="flex:1;margin:0">⭐ LEVEL</h1></div>',
 TB='<div class="tb">'+[[1,'Heldenlevel'],[2,'Klassenlevel'],[3,'Prestige']].map(function(t){return '<button class="'+(LM===t[0]?'on':'')+'" onclick="__kamLM('+t[0]+')">'+t[1]+'</button>'}).join('')+'</div>';
 if(LM===3){M.innerHTML='<div class="w">'+TOP+TB+prestigeTab()+'</div>';M.style.display='block';return}
 M.innerHTML='<div class="w">'+TOP+TB+
 '<div class="hr"><img src="hero/idle0.webp"><div class="t"><div class="lv">'+(LM===1?'Held-Level ':'Klassen-Level ')+lv+'</div><small>'+(ml?'Nächster Meilenstein bei Level '+ml:'Alle Meilensteine erreicht')+'</small>'+(LM===1?'<div class="bar"><i style="width:'+kp+'%"></i></div>':'')+'</div></div>'+
 (LM===2?'<button class="btn btn-wide" onclick="__kamQO()" style="width:100%;margin:2px 0 8px">📋 QUESTS '+(window.__kamQOpen?'▴':'▾')+'</button>'+(window.__kamQOpen?questsTab():''):'')+'<div class="how">'+(LM===1?'So steigst du auf: <b>150 Monster-Kills pro Level</b> (max. Level 100).':'So steigst du auf: <b>1 Level pro erledigter Quest</b> (aktuell '+nq+' Quests, für Level 100 brauchen wir weitere).')+'</div><div class="tl">'+h+'</div></div>';
 M.style.display='block'}
var LH=[];window.__kamLvBack=function(){SHS=0;SHL=0;LH=[];document.getElementById('kamLevels').style.display='none';var pf=document.getElementById('kamPf');if(pf)pf.click()};
function questsTab(){var L=(typeof QUEST_LIST!=='undefined')?QUEST_LIST:[],cats=[],done=0;
 L.forEach(function(q){if(cats.indexOf(q.cat)<0)cats.push(q.cat)});
 var h='';cats.forEach(function(cat){var qs=L.filter(function(q){return q.cat===cat});
  h+='<div style="font-size:.62rem;color:#c8a070;letter-spacing:2px;margin:14px 0 6px">'+cat+'</div>';
  qs.forEach(function(q){var v=0;try{v=Math.min(q.getValue(questTracking,heroData),q.target)}catch(e){}var dn=v>=q.target;if(dn)done++;
   if(q.secret&&!dn){var sc=false;try{sc=q.secret()}catch(e){}if(!sc){h+='<div style="border:1px dashed #4a3a6a;border-radius:8px;padding:8px 10px;margin-bottom:5px;background:#0004;font-size:.7rem;opacity:.6">🔒 Geheime Quest</div>';return}}
   var p=Math.min(100,Math.floor(v/q.target*100));
   h+='<div style="border:1px solid '+(dn?'#44ff88':'#4a2a6a')+';border-radius:8px;padding:8px 10px;margin-bottom:5px;background:'+(dn?'#06200f99':'#0006')+'"><div style="display:flex;justify-content:space-between;gap:8px;font-size:.72rem"><span style="color:'+(dn?'#44ff88':'#ffe9c4')+'">'+q.name+'</span><span style="color:'+(dn?'#44ff88':'#c9b79c')+';white-space:nowrap">'+(dn?'✓ fertig':v.toLocaleString('de')+' / '+q.target.toLocaleString('de'))+'</span></div>'+(dn?'':'<div style="height:5px;background:#0008;border-radius:3px;margin-top:5px;overflow:hidden"><div style="height:100%;width:'+p+'%;background:#a070e0"></div></div>')+'</div>'})});
 return '<div style="text-align:center;font-size:.8rem;margin:4px 0 2px">'+done+' von '+L.length+' Quests geschafft. Jede Quest gibt 1 Klassen-Level.</div>'+h}
window.__kamQO=function(){window.__kamQOpen=!window.__kamQOpen;levelsUI()};
window.__kamLM=function(m){window.__kamQOpen=false;if(m!==LM)LH.push(LM);LM=m;levelsUI()};
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
 ex+=window.__gemLoot(isBoss?'boss':'mon',k);
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
 if(type==='sin'&&window.__kamEtg){var E=window.__kamEtg;P=[Math.max(5,Math.round(95-(E-1)*10)),Math.round((E-1)*2.5)]}
 if(Math.random()<cfg.itemChance){var id=cfg.itemPool[Math.floor(Math.random()*cfg.itemPool.length)];
  if(base(id)){var rr=giveOrSell(id,condRoll(P[0],P[1]));if(rr.sold){m+=' <span style="color:#e0c070">Beutel voll: '+rr.name+' verkauft +'+rr.sold+'</span>'}else{var i=rr.item;m+=' <span style="color:'+RARITY_COLOR[i.rarity]+'">+ '+i.name+' ['+RARITY_LABEL[i.rarity]+'] <b style="color:'+CC[i.c]+'">'+CN[i.c]+'</b></span>';
   showItemPopup({name:i.name+' · '+CN[i.c],rarity:i.rarity,type:i.type,desc:descOf(i)})}}}
 if(cfg.alsoLowerItems){var lp=['sword1','armor1','helm1','ring1','sword2','armor2','helm2','ring2'],lid=lp[Math.floor(Math.random()*lp.length)],lr=giveOrSell(lid,condRoll(P[0],P[1]));m+=lr.sold?' Beutel voll: verkauft +'+lr.sold:' <span style="color:'+RARITY_COLOR[lr.item.rarity]+'">+ '+lr.item.name+'</span>'}
 var ir={wood:[1,2],dia:[2,5],legend:[5,10],sin:[10,18]}[type]||[1,2];
 m+=loot(rnd(ir[0],ir[1]),{wood:{},dia:{blau:10},legend:{blau:25,lila:8},sin:{blau:30,lila:20,orange:6}}[type]||{});m+=window.__gemLoot(type);return m};

window.__kamLogR=function(t){try{var L=JSON.parse(localStorage.getItem('robKamLogR')||'[]');L.unshift([Date.now(),t]);localStorage.setItem('robKamLogR',JSON.stringify(L.slice(0,50)))}catch(e){}};
window.__kamChestAdd=function(t){ens();inventory.chs=inventory.chs||{};inventory.chs[t]=(inventory.chs[t]||0)+1;try{saveInventory()}catch(e){}};
window.__kamChestOpen=function(t){ens();var c=inventory.chs=inventory.chs||{};if(!(c[t]>0))return;c[t]--;var m=window.__kamChest(t,CHEST_CONFIG[t]);try{saveInventory()}catch(e){}try{window.__kamLogR((CHN[t]||t)+' geöffnet:'+m.replace(/<[^>]*>/g,''))}catch(e){}window.__kamInfoRes=(CHN[t]||t)+' geöffnet:'+m;window.__kamInfoTab()};
var SELL_IR=15,SELL_ORE={green:60,blue:250,purple:1000,gold:4000,red:15000},SELL_ORB={blau:300,lila:1500,orange:6000},SELL_GEM=[50,150,500,1500,5000],ORN={green:'Grünes Erz',blue:'Blaues Erz',purple:'Lila Erz',gold:'Goldenes Erz',red:'Rotes Erz'};
function gemPrice(k){return SELL_GEM[Math.max(0,Math.min(4,(+k[1]||1)-1))]}
window.__kamSell=function(kind,key,all){try{ens();var n,pr,nm;
 if(kind==='iron'){n=inventory.iron||0;pr=SELL_IR;nm='Eisenbarren'}
 else if(kind==='ore'){n=(inventory.ores||{})[key]||0;pr=SELL_ORE[key];nm=ORN[key]}
 else if(kind==='orb'){n=(inventory.orbs||{})[key]||0;pr=SELL_ORB[key];nm=ORB[key][1]}
 else{n=(inventory.gems||{})[key]||0;pr=gemPrice(key);nm=window.__gemName?window.__gemName(key):key}
 var c=all?n:Math.min(1,n);if(c<1||!pr)return;
 if(kind==='iron')inventory.iron-=c;else if(kind==='ore')inventory.ores[key]-=c;else if(kind==='orb')inventory.orbs[key]-=c;else inventory.gems[key]-=c;
 var g=c*pr;meta.gold+=g;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}try{saveInventory()}catch(e){}try{updateUI()}catch(e){}
 try{window.__kamLogR('Verkauft: '+c+'× '+nm+' für '+g+' Gold')}catch(e){}try{toast('💰 '+c+'× '+nm+' verkauft: +'+g+' Gold')}catch(e){}window.__kamInfoTab()}catch(e){}};
window.__kamLogPane=function(){var el=document.getElementById('kamLogPane');if(!el)return;var SC='border:1px solid #6b4a1f;border-radius:10px;padding:8px;margin:10px 0 8px;background:#140a08',HC2='color:#ffd24a;font-weight:800;font-size:.75rem;margin-bottom:4px';
 var cl=clv(),nx=0;for(var L=5;L<=100;L+=5){if(L>cl&&(CG[L]||CX[L]||CC2[L])){nx=L;break}}
 var LG=[];try{LG=JSON.parse(localStorage.getItem('robKamLogR')||'[]')}catch(e){}
 el.innerHTML='<div style="'+SC+'"><div style="'+HC2+'">🎯 NÄCHSTE BELOHNUNG</div><small>Klassenlevel '+cl+' · nächste Klassen-Belohnung bei Level '+(nx||'—')+'. Heldenlevel: '+maxHeroLv()+'.</small></div>'
 +'<div style="'+SC+'"><div style="'+HC2+'">📜 INFO-LOG</div>'+(LG.length?LG.map(function(x){var d=new Date(x[0]);return '<div style="font-size:.66rem;margin:3px 0;border-bottom:1px solid #2a1a14;padding-bottom:3px"><span style="opacity:.6">'+('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'. '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+'</span> '+x[1]+'</div>'}).join(''):'<small style="opacity:.7">Noch nichts erhalten.</small>')+'</div>'};
var SELL_IT={normal:20,gruen:60,blau:200,episch:800,legendaer:3000,mystisch:12000},WN={hero:'Ben',arc:'Elfa',mag:'Kalifa'},SCF=null;
function itPrice(u){var n=inventory.inst[u],b=base(n.b);return Math.round((SELL_IT[b.rarity]||10)*CM[n.c||0]*(1+(n.s||0)*.5))}
window.__kamSellItem=function(u){try{var n=inventory.inst[u];if(!n||wearer(u))return;if(SCF!==u){SCF=u;window.__kamInfoTab();return}SCF=null;var b=base(n.b),g=itPrice(u);
 delete inventory.inst[u];inventory.items.splice(inventory.items.indexOf(u),1);meta.gold+=g;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}try{saveInventory()}catch(e){}try{updateUI()}catch(e){}
 try{window.__kamLogR('Verkauft: '+b.name+' für '+g+' Gold')}catch(e){}try{toast('💰 '+b.name+' verkauft: +'+g+' Gold')}catch(e){}window.__kamInfoTab()}catch(e){}};
function itemsUI(SC,HC2){ens();var L=inventory.items.slice().filter(function(u){return inventory.inst[u]&&base(inventory.inst[u].b)}).sort(function(a,b){var A=inventory.inst[a],B=inventory.inst[b],ra=RANK.indexOf(base(A.b).rarity),rb=RANK.indexOf(base(B.b).rarity);return (wearer(b)?1:0)-(wearer(a)?1:0)||rb-ra||B.c-A.c});
 var h='<div style="'+SC+'"><div style="'+HC2+'">🛡️ RÜSTUNGEN &amp; WAFFEN <small style="font-weight:400;opacity:.7">('+L.length+')</small></div>';
 if(!L.length)return h+'<small style="opacity:.7">Noch keine Ausrüstung.</small></div>';
 h+='<div style="max-height:380px;overflow-y:auto;padding-right:3px">';
 L.forEach(function(u){var n=inventory.inst[u],b=base(n.b),w=wearer(u),c=n.c||0;
  h+='<div style="display:flex;align-items:center;gap:6px;margin:3px 0;padding:3px;border:1px solid #3a2410;border-radius:8px;background:#0006"><img src="'+ico(b.id)+'" style="width:34px;height:34px;object-fit:contain"><div style="flex:1;min-width:0;font-size:.62rem;line-height:1.3"><b style="color:'+RARITY_COLOR[b.rarity]+'">'+b.name+'</b>'+(n.s?' <span style="color:#ffd24a">'+'★'.repeat(n.s)+'</span>':'')+'<br><span style="color:'+CC[c]+'">'+CN[c]+'</span> · '+(w?'<span style="color:#8fe08f">getragen: '+(WN[w]||w)+'</span>':'<span style="opacity:.7">im Beutel</span>')+'</div>'
  +(w?'':'<button class="btn btn-sm" style="font-size:.55rem;padding:3px 6px'+(SCF===u?';background:#a22':'')+'" onclick="__kamSellItem(\''+u+'\')">'+(SCF===u?'SICHER? ':'')+itPrice(u)+'💰</button>')+'</div>'});
 return h+'</div><small style="opacity:.6;display:block;margin-top:4px">Getragene Teile kann man nicht verkaufen. Verkaufen braucht zwei Klicks.</small></div>'}
window.__kamInfoTab=function(){var el=document.getElementById('kamInfoPane');if(!el)return;ens();var h='',G=window.__gemName,D=window.__gemDot,pp=pd(),ob=inventory.orbs||{};
 var SC='border:1px solid #6b4a1f;border-radius:10px;padding:8px;margin-bottom:8px;background:#140a08',HC2='color:#ffd24a;font-weight:800;font-size:.75rem;margin-bottom:4px',IM='<img src="items/ore_silver.webp?v=1113" style="height:1.4em;vertical-align:-.3em" alt="">';
 function row(ic,nm,n,kind,key,pr){return '<div style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:.7rem"><span style="flex:1;min-width:0">'+ic+' '+nm+' <b>×'+n+'</b></span><button class="btn btn-sm" style="font-size:.6rem;padding:3px 6px" onclick="__kamSell(\''+kind+'\',\''+key+'\',0)">1 · '+pr+'💰</button><button class="btn btn-sm" style="font-size:.6rem;padding:3px 6px" onclick="__kamSell(\''+kind+'\',\''+key+'\',1)">Alle · '+(pr*n)+'💰</button></div>'}
 h+='<div style="'+SC+'"><div style="'+HC2+'">🎒 BESTÄNDE</div><div style="display:flex;flex-wrap:wrap;gap:8px;font-size:.72rem"><span>💎 '+(meta.diamonds||0)+'</span><span>💰 '+(meta.gold||0)+'</span><span>💜 Seelen '+(pp.souls||0)+(pp.soulsPend?' (+'+pp.soulsPend+' beim Prestige)':'')+'</span></div><small style="opacity:.7;display:block;margin-top:4px">Seelen und Diamanten kann man nicht verkaufen.</small></div>';
 h+=itemsUI(SC,HC2);
 var ir=inventory.iron||0,rows='';if(ir>0)rows+=row(IM,'Eisenbarren',ir,'iron','x',SELL_IR);
 ['green','blue','purple','gold','red'].forEach(function(k){var n=(inventory.ores||{})[k]||0;if(n>0)rows+=row('<img src="items/ore_'+k+'.webp?v=1113" style="height:1.4em;vertical-align:-.3em" alt="">',ORN[k],n,'ore',k,SELL_ORE[k])});
 h+='<div style="'+SC+'"><div style="'+HC2+'">⛏️ BARREN &amp; ERZE <small style="font-weight:400;opacity:.7">(verkaufen)</small></div>'+(rows||'<small style="opacity:.7">Keine Barren oder Erze.</small>')+'</div>';
 var orw='';['blau','lila','orange'].forEach(function(k){var n=ob[k]||0;if(n>0)orw+=row(ORB[k][2],ORB[k][1],n,'orb',k,SELL_ORB[k])});
 h+='<div style="'+SC+'"><div style="'+HC2+'">🔮 KUGELN <small style="font-weight:400;opacity:.7">(verkaufen)</small></div>'+(orw||'<small style="opacity:.7">Keine Kugeln.</small>')+'</div>';
 var gk=Object.keys(inventory.gems||{}).filter(function(k){return inventory.gems[k]>0}).sort();
 h+='<div style="'+SC+'"><div style="'+HC2+'">💠 JUWELEN <small style="font-weight:400;opacity:.7">(verkaufen)</small></div>'+(gk.length?gk.map(function(k){return row(D?D(k,20):'',G?G(k):k,inventory.gems[k],'gem',k,gemPrice(k))}).join(''):'<small style="opacity:.7">Noch keine Juwelen.</small>')+'</div>';
 var ch=inventory.chs||{},ck=Object.keys(ch).filter(function(k){return ch[k]>0});
 h+='<div style="'+SC+'"><div style="'+HC2+'">📦 KISTEN</div>'+(ck.length?ck.map(function(k){return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:.72rem"><span style="flex:1">📦 '+(CHN[k]||k)+' ×'+ch[k]+'</span><button class="btn btn-sm" onclick="__kamChestOpen(\''+k+'\')">ÖFFNEN</button></div>'}).join(''):'<small style="opacity:.7">Keine Kisten. Kisten aus Level-Belohnungen landen hier.</small>')+(window.__kamInfoRes?'<div style="margin-top:6px;font-size:.68rem;color:#cfe">'+window.__kamInfoRes+'</div>':'')+'</div>';
 el.innerHTML=h};
window.__kamEvtItem=function(r){try{var T=['helm','shoulder','armor','hand','boots','cape','amulet'],P=ITEMS.filter(function(x){return x.rarity===r&&!x.m&&!x.fx&&T.indexOf(x.type)>=0});if(!P.length)return '';var b=P[Math.floor(Math.random()*P.length)],rr=giveOrSell(b.id,condRoll(40,0));
 if(rr.sold)return ' <span style="color:#e0c070">Beutel voll: '+rr.name+' verkauft +'+rr.sold+'</span>';var i=rr.item;try{showItemPopup({name:i.name+' · '+CN[i.c],rarity:i.rarity,type:i.type,desc:descOf(i)})}catch(e){}return ' <span style="color:'+RARITY_COLOR[i.rarity]+'">+ '+i.name+' ['+RARITY_LABEL[i.rarity]+']</span>'}catch(e){return ''}};
window.__kamEvtK=function(){try{return Math.max(1,(inventory.stats&&inventory.stats.maxBoss||0)+1)}catch(e){return 1}};

/* ---- Heldenabteil ---- */
var SL={hero:['helm','shoulder','armor','hand','boots','amulet','ring','cape','shield','weapon'],arc:['helm','shoulder','armor','hand','boots','amulet','ring','cape','quiver','bow'],mag:['helm','shoulder','armor','hand','boots','amulet','ring','cape','book','staff']},XT={shield:'hero',quiver:'arc',book:'mag'};
var NM={hero:'Ben',arc:'Elfa',mag:'Kalifa',brutus:'Brutus',jeffrey:'Jeffrey',berta:'Berta',jamal:'Jamal',luna:'Luna'},NN={hero:'Ben',arc:'Elfa',mag:'Kalifa'},FT='all',FR='all',HF=function(w,f){return w==='hero'?(window.__benSkin&&window.__benSkin()==='rick'?'run'+(f%2)+'.png':'h/ben_i'+(f%2)+'.webp'):'h/'+(w==='arc'?'elf':'kal')+'_i'+(f%2)+'.webp'},NEED={hero:0,arc:5,mag:30},PRT={hero:'items/p_ben.webp',arc:'items/p_elfa.webp',mag:'items/p_kalifa.webp'};
var SLN={shoulder:'Schulter',helm:'Helm',armor:'Rüstung',cape:'Umhang',weapon:'Waffe',bow:'Bogen',staff:'Stab',ring:'Ring',hand:'Handsch.',book:'Buch',shield:'Schild',amulet:'Amulett',boots:'Schuhe',quiver:'Köcher'};
var sel='hero',fr=0;
var WKT=['weapon','bow','staff'],WSK={hero:'weapon',arc:'bow',mag:'staff'};function can(w,i){if(i.z&&!(w==='hero'&&window.__benSkin&&window.__benSkin()==='rick'))return false;var ow=ownersOf(i);if(ow&&ow.indexOf(w)<0)return false;if(WKT.indexOf(i.type)>=0&&WSK[w]&&WSK[w]!==i.type)return false;return !XT[i.type]||XT[i.type]===w}
function gk(w,i){return WKT.indexOf(i.type)>=0?WSK[w]:i.type}
function zsync(){if(!meta||!inventory.equipped)return;var pv=inventory.zb||0;if(pv){meta.maxHp=Math.max(1,meta.maxHp-pv);inventory.zb=0}
 var e=inventory.equipped,all=true,mm=true;['helm','armor','hand','boots','ring','weapon','shield'].forEach(function(t){var i=e[t]&&it(e[t]);if(!i||!i.z){all=false;return}if(i.z!=='m')mm=false});
 if(all){var add=Math.round(meta.maxHp*(mm?.5:.4));meta.maxHp+=add;inventory.zb=add}meta.hp=Math.min(meta.hp,meta.maxHp);try{updateUI()}catch(x){}}
window.__kamHeroGear=function(){ens();var o={};['hero','arc','mag'].forEach(function(w){var m={};(SL[w]||[]).forEach(function(t){m[t]=null});o[w]=m});
 inventory.items.forEach(function(u){var k=wkey(u);if(k&&o[k[0]]&&o[k[0]].hasOwnProperty(k[1])){var n=inventory.inst[u],b=n&&base(n.b);if(b)o[k[0]][k[1]]={ico:ico(b.id),col:RARITY_COLOR[b.rarity],name:b.name}}});return {gear:o,slots:SL,own:{hero:true,arc:maxHeroLv()>=5,mag:maxHeroLv()>=30}}};
window.__kamUnz=function(){var e=inventory.equipped||{};Object.keys(e).slice().forEach(function(t){var i=e[t]&&it(e[t]);if(i&&i.z)unw(e[t])});try{saveInventory()}catch(x){}};
function unw(uid){var i=it(uid),w=wearer(uid);if(!w)return;
 var q=st(i),wk=wkey(uid);if(wk){if(w==='hero')delete inventory.equipped[wk[1]];else delete ai()[w][wk[1]]}
 if(meta){if(w==='hero'){meta.attack=Math.max(1,meta.attack-q.atk);meta.maxHp=Math.max(1,meta.maxHp-q.hp);meta.hp=Math.min(meta.hp,meta.maxHp)}try{updateUI()}catch(e){}}if(w==='hero')zsync()}

/* ---- Rüstungsklassen: Schwer / Leder / Stoff ---- */
var CLSN={schwer:'Schwer',leder:'Leder',stoff:'Stoff'},CLSOK={schwer:['hero','brutus','jeffrey','berta','jamal'],leder:['hero','arc','luna','jamal'],stoff:['arc','mag','luna']};
window.__clsOk=CLSOK;
(function(){
 var H={helm1:'schwer',helm2:'schwer',helm3:'schwer',helm4:'schwer',helm5:'schwer',armor1:'schwer',armor2:'schwer',armor3:'schwer',armor4:'schwer',armor5:'schwer',armor6:'schwer'};
 ITEMS.forEach(function(x){if(H[x.id]){x.cls='schwer'}});
 var R=['normal','gruen','blau','episch','legendaer'],HB=[[0,4],[3,8],[8,18],[12,30],[18,55]],AB=[[3,3],[5,10],[8,20],[15,45],[20,80]],
 NL={helm:['Lederkappe','Jägerhaube','Waldläufer-Kapuze','Schattenkapuze','Windkapuze'],armor:['Lederweste','Jägerwams','Waldläuferrüstung','Schattenleder','Windleder']},
 NS={helm:['Stoffkappe','Magierhut','Runenhut','Arkanhut','Sternenhut'],armor:['Stoffrobe','Magierrobe','Runenrobe','Arkanrobe','Sternenrobe']};
 var made=[];
 ['helm','armor'].forEach(function(t){var B=t==='helm'?HB:AB;
  [['leder',NL,1.5,.7,'L'],['stoff',NS,2,.45,'S']].forEach(function(c){
   for(var n=0;n<5;n++){var id=t+c[4]+(n+1),a=Math.round(B[n][0]*c[2]+(n?1:0)),h=Math.round(B[n][1]*c[3]);
    if(ITEMS.some(function(x){return x.id===id}))continue;
    ITEMS.push({id:id,name:c[1][t][n],type:t,rarity:R[n],atk:a,hp:h,cls:c[0],desc:(a?'+'+a+' ATK':'')+(a&&h?' ':'')+(h?'+'+h+' HP':'')});made.push([id,n])}})});
 ITEMS.forEach(function(x){if(x.cls&&x.desc&&x.desc.indexOf('·')<0)x.desc=CLSN[x.cls]+' · '+x.desc});
 function ids(ns){var o=[];made.forEach(function(m){if(ns.indexOf(m[1])>=0)o.push(m[0])});return o}
 try{pushAll(MONSTER_POOL,ids([0]));pushAll(BOSS_POOL,ids([1,2,3,4]));pushAll(CHEST_CONFIG.wood.itemPool,ids([0]));pushAll(CHEST_CONFIG.dia.itemPool,ids([1,2]));pushAll(CHEST_CONFIG.legend.itemPool,ids([2,3,4]))}catch(e){}
})();


/* ---- Drei Schildarten: Turm (Ben, Jeffrey), Rund (Jamal, Brutus), Stachel (Berta) ---- */
var SKOK={turm:['hero','jeffrey'],rund:['jamal','brutus'],stachel:['berta']},SKN={turm:'Turmschild',rund:'Rundschild',stachel:'Stachelschild'};
window.__skOk=SKOK;
(function(){
 var R=['normal','gruen','blau','episch','legendaer'],SB=[[0,6],[0,14],[2,25],[4,45],[8,80]];
 ITEMS.forEach(function(x){if(x.type==='shield'&&!x.sk)x.sk='turm'});
 var NR=['Rundschild','Eisenrundschild','Stahlrundschild','Drachenrundschild','Himmelsrundschild'],NS=['Stachelbuckler','Eisenbuckler','Dornenschild','Drachenbuckler','Himmelsbuckler'];
 [['rshield',NR,'rund'],['bshield',NS,'stachel']].forEach(function(s){var ids=[];
  for(var n=0;n<5;n++){var id=s[0]+(n+1),a=SB[n][0],h=SB[n][1];ids.push(id);if(ITEMS.some(function(x){return x.id===id}))continue;
   ITEMS.push({id:id,name:s[1][n],type:'shield',sk:s[2],rarity:R[n],atk:a,hp:h,desc:(a?'+'+a+' ATK':'')+(a&&h?' ':'')+(h?'+'+h+' HP':'')})}
  try{pushAll(MONSTER_POOL,[ids[0]]);pushAll(BOSS_POOL,ids.slice(1));pushAll(CHEST_CONFIG.wood.itemPool,[ids[0]]);pushAll(CHEST_CONFIG.dia.itemPool,ids.slice(1,3));pushAll(CHEST_CONFIG.legend.itemPool,ids.slice(2))}catch(e){}});
 ITEMS.forEach(function(x){if(x.type==='shield'&&x.desc&&x.desc.indexOf('·')<0)x.desc=SKN[x.sk]+' · '+x.desc});
})();
function ownersOf(i){if(i.cls&&CLSOK[i.cls])return CLSOK[i.cls];if(i.type==='shield')return SKOK[i.sk||'turm'];return null}
/* ---- Eigene Waffen je Held + Fundfreischaltung ---- */
(function(){
 var R=['normal','gruen','blau','episch','legendaer'],AT=[3,8,18,35,60],
 W=[['club','Keule',['Knüppel','Eisenkeule','Stachelkeule','Drachenkeule','Himmelskeule']],['axe','Axt',['Beil','Eisenaxt','Kriegsaxt','Drachenaxt','Himmelsaxt']],['spear','Speer',['Holzspeer','Eisenspeer','Silberspeer','Drachenspeer','Himmelsspeer']],['potion','Trankwaffe',['Giftfläschchen','Säuretrank','Sprengtrank','Drachentrank','Himmelstrank']],['fist','Fäuste',['Bandagen','Eisenfäuste','Stahlfäuste','Drachenfäuste','Himmelsfäuste']]];
 TYPE_LABEL.fist='Faustwaffe';W.forEach(function(w){if(w[0]!=='fist')TYPE_LABEL[w[0]]=w[1];for(var n=0;n<5;n++){var id=w[0]+(n+1);if(ITEMS.some(function(x){return x.id===id}))continue;ITEMS.push({id:id,name:w[2][n],type:w[0],rarity:R[n],atk:AT[n],hp:0,desc:'+'+AT[n]+' ATK'})}});
 XT.club='brutus';XT.axe='jeffrey';XT.spear='jamal';XT.potion='berta';XT.fist='luna';
 var pools=[MONSTER_POOL,BOSS_POOL,CHEST_CONFIG.wood.itemPool,CHEST_CONFIG.dia.itemPool,CHEST_CONFIG.legend.itemPool];
 W.forEach(function(w){var T=[1,2,3,4,5].map(function(n){return w[0]+n});try{pushAll(MONSTER_POOL,[T[0]]);pushAll(BOSS_POOL,T.slice(1));pushAll(CHEST_CONFIG.wood.itemPool,[T[0]]);pushAll(CHEST_CONFIG.dia.itemPool,T.slice(1,3));pushAll(CHEST_CONFIG.legend.itemPool,T.slice(2))}catch(e){}});
 var full=pools.map(function(p){return p.slice()});
 /* Freischaltung: Typ -> [Bedingung, Name] */
 var G=[
  {t:['bow','quiver'],ok:function(){return hlvl()>=5},k:'g_elfa',m:'Ab jetzt Bögen und Köcher zu finden'},
  {t:['fist'],ok:function(){return hlvl()>=10},k:'g_luna',m:'Ab jetzt Fäuste zu finden'},
  {t:['spear'],s:['rund'],ok:function(){return hlvl()>=15},k:'g_jamal',m:'Ab jetzt Speere und Rundschilde zu finden'},
  {t:['club'],ok:function(){return hlvl()>=20},k:'g_brutus',m:'Ab jetzt Keulen zu finden'},
  {t:['staff','book'],c:['stoff'],ok:function(){return hlvl()>=30},k:'g_kalifa',m:'Ab jetzt Stäbe, Bücher und Stoffrüstungen (Hüte, Roben) zu finden'},
  {t:['axe'],ok:function(){return clv()>=50},k:'g_jeffrey',m:'Ab jetzt Äxte zu finden'},
  {t:['potion'],s:['stachel'],ok:function(){return clv()>=100},k:'g_berta',m:'Ab jetzt Wurftränke und Stachelschilde zu finden'}];
 function open(id){var b=ITEMS.find(function(x){return x.id===id});if(!b)return true;if(b.rarity==='episch'&&!(K&&K.k>=3))return false;if(b.rarity==='legendaer'&&!(K&&K.k>=5))return false;
  for(var i=0;i<G.length;i++){var g=G[i];if(g.t.indexOf(b.type)>=0||(b.cls&&g.c&&g.c.indexOf(b.cls)>=0)||(b.sk&&g.s&&g.s.indexOf(b.sk)>=0))return !!g.ok()}return true}
 window.__syncPools=function(){var got={};try{got=JSON.parse(localStorage.getItem('robGearMsg')||'{}')}catch(e){}var ch=false;
  pools.forEach(function(p,n){var f=full[n].filter(open);p.length=0;f.forEach(function(x){p.push(x)})});
  G.forEach(function(g){if(g.ok()&&!got[g.k]){got[g.k]=1;ch=true;try{if(window.hlvl&&!window.__gearQuiet)setTimeout(function(){toast('🎁 '+g.m+'!')},1800)}catch(e){}}});
  if(ch)try{localStorage.setItem('robGearMsg',JSON.stringify(got))}catch(e){}};
 window.__syncPools();
 setInterval(function(){try{window.__syncPools()}catch(e){}},4000);
})();

/* ---- Tagesangebot ---- */
(function(){
 var DK='robDaily',PR={gruen:100,blau:400,episch:2000,legendaer:10000},OP={blau:15000,lila:80000,orange:400000};
 function today(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
 function seedRnd(str){var h=1779033703^str.length;for(var i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}var a=h>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
 function sv(d){try{localStorage.setItem(DK,JSON.stringify(d))}catch(e){}}
 function pool(r){var seen={},o=[];[MONSTER_POOL,BOSS_POOL,CHEST_CONFIG.wood.itemPool,CHEST_CONFIG.dia.itemPool,CHEST_CONFIG.legend.itemPool].forEach(function(P){P.forEach(function(id){if(seen[id])return;seen[id]=1;var b=ITEMS.find(function(x){return x.id===id});if(b&&!b.m&&b.rarity===r)o.push(id)})});return o}
 function gen(){var R=seedRnd('daily'+today()),L=Math.min(15,ML()),pk=function(a){return a[Math.floor(R()*a.length)]},O=[];
  var CP={gruen:1,blau:1.8,episch:4,legendaer:9};
  var UN={gruen:0,blau:0,episch:4,legendaer:9};
  function cond(r){var m=Math.max(0,Math.min(1,(L-UN[r])/8)),pP=(r==='blau'&&L===0)?0:.02+.2*m,pN=.13+.37*m,x=R();return x<pP?2:x<pP+pN?1:0}
  function rar(slot){var x=R(),pe=L>=4?(slot<4?.02+(L-4)*.02:.08+(L-4)*.04):0,pl=L>=9?(slot<4?.01+(L-9)*.01:.02+(L-9)*.02):0,pb=slot<4?L*.04:1;return x<pl?'legendaer':x<pl+pe?'episch':x<pl+pe+pb?'blau':'gruen'}
  for(var sl=0;sl<5;sl++){var r=rar(sl),P=pool(r);if(!P.length&&r==='legendaer'){r='episch';P=pool(r)}if(!P.length&&r==='episch'){r='blau';P=pool(r)}if(!P.length){r='gruen';P=pool(r)}
   var c=cond(r),bi=PR[r]||PR.blau;O.push({k:'i',id:pk(P),c:c,p:Math.round(bi*[1,1.6,2.6][c])})}
  return O}
 function st(){var d;try{d=JSON.parse(localStorage.getItem(DK)||'{}')}catch(e){d={}}if(d.d!==today()||d.v!==2){var cl=d.d===today()?d.claimed:0;d={d:today(),v:2,claimed:cl,bought:[],O:gen()};sv(d)}return d}
 function ML(){try{return cityBonus('market')||0}catch(e){return 0}}
 function pr(o){return o.p}
 function gm(){return Math.round(100*Math.pow(15,Math.min(15,ML())/15))}
 function pay(p){if(meta.gold<p){toast('Zu wenig Münzen ('+p+')');return false}meta.gold-=p;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}try{updateUI()}catch(e){}return true}
 function rw(){var L=Math.min(15,ML()),o={g:gm(),iron:L>=3?(L-2)*5:0,orbs:{},souls:L>=12?L-11:0};if(L>=6)o.orbs.blau=1;if(L>=10)o.orbs.lila=1;if(L>=15)o.orbs.orange=1;return o}
 function rwTxt(o){var t=['💰 '+o.g];if(o.iron)t.push('<img src="items/ore_silver.webp?v=1113" style="height:1.15em;vertical-align:-.25em" alt=""> '+o.iron);for(var k in o.orbs)t.push(ORB[k][2]+' '+o.orbs[k]);if(o.souls)t.push('💜 '+o.souls);return t.join(' · ')}
 window.__dailyClaim=function(){var d=st();if(d.claimed)return;var o=rw();meta.gold+=o.g;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}
  if(o.iron||Object.keys(o.orbs).length){ens();inventory.iron=(inventory.iron||0)+o.iron;for(var k in o.orbs)inventory.orbs[k]=(inventory.orbs[k]||0)+o.orbs[k];try{saveInventory()}catch(e){}}
  if(o.souls){pd().souls+=o.souls;try{savePrestige()}catch(e){}}
  d.claimed=1;sv(d);try{updateUI()}catch(e){}toast('🎁 Täglich: '+rwTxt(o).replace(/<[^>]*>/g,'')+'!');window.__dailyRefresh()};
 window.__dailyBuy=function(i){var d=st(),o=d.O[i];if(!o||d.bought.indexOf(i)>=0)return;if(!pay(pr(o)))return;
  if(o.k==='i')give(o.id,o.c);else if(o.k==='iron'){ens();inventory.iron=(inventory.iron||0)+o.n;try{saveInventory()}catch(e){}}else{ens();inventory.orbs[o.o]=(inventory.orbs[o.o]||0)+1;try{saveInventory()}catch(e){}}
  d.bought.push(i);sv(d);toast('✅ Gekauft!');window.__dailyRefresh()};
 function dHtml(emb){var d=st();
  var g=gm(),h='<div style="max-width:440px;margin:0 auto">'+(emb?'<div style="font-weight:700;margin-bottom:4px">🎁 TAGESANGEBOT</div>':'')+'<div style="'+(emb?'display:none':'display:flex')+';gap:10px;align-items:center;margin-bottom:8px"><button class="btn btn-sm" onclick="document.getElementById(\'dailyModal\').style.display=\'none\';if(window.__fromProf){window.__fromProf=0;var p=document.getElementById(\'kamPf\');if(p)p.click()}">← ZURÜCK</button><b style="font-size:1.05rem">🎁 TAGESANGEBOT</b></div><div style="font-size:.7rem;opacity:.8;margin-bottom:8px">💰 '+meta.gold+' Münzen · jeden Tag neu · Marktplatz Stufe '+ML()+'</div>';
  h+='<div style="border:1px solid #4caf50;border-radius:10px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;background:#0f1d12"><div><b style="color:#6fe08a">Tägliche Belohnung (kostenlos)</b><div style="font-size:.62rem;opacity:.9;margin-top:2px">'+rwTxt(rw())+'</div><div style="font-size:.5rem;opacity:.6;margin-top:3px">Mehr durch den Marktplatz: <img src="items/ore_silver.webp?v=1113" style="height:1.15em;vertical-align:-.25em" alt=""> ab Stufe 3 · Blaue Kugel ab 6 · 💜 ab 12 · Lila Kugel ab 10 · Orange Kugel ab 15</div></div>'+(d.claimed?'<span style="font-size:.65rem;opacity:.7">✔ geholt</span>':'<button class="btn btn-sm" onclick="__dailyClaim()">HOLEN</button>')+'</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">';
  d.O.forEach(function(o,i){var bo=d.bought.indexOf(i)>=0,ic,nm,sub,col='#888';
   if(o.k==='i'){var b=ITEMS.find(function(x){return x.id===o.id});ic=ico(o.id);nm=b.name;col=RARITY_COLOR[b.rarity]||'#888';sub=['Gebraucht','Wie neu','Perfekt'][o.c]+' · '+(b.atk?'+'+b.atk+' ATK':'')+(b.atk&&b.hp?' ':'')+(b.hp?'+'+b.hp+' ❤':'')+(!b.atk&&!b.hp?(b.desc||''):'')}
   else if(o.k==='iron'){ic=null;nm='<img src="items/ore_silver.webp?v=1113" style="height:1.15em;vertical-align:-.25em" alt=""> '+o.n+' Eisenbarren';sub='Für die Schmiede'}
   else{ic=ORB[o.o][2];nm=ORB[o.o][1];sub='Zum Aufwerten'}
   h+='<div style="border:1px solid '+(bo?'#3a3358':col)+';border-radius:10px;padding:8px 6px;text-align:center;background:#1a1330;'+(bo?'opacity:.5':'')+'">'+(o.k==='i'?'<img src="'+ic+'" style="width:52px;height:52px;object-fit:contain">':o.k==='orb'?'<div style="font-size:1.6rem;height:52px;line-height:52px">'+ic+'</div>':'<div style="font-size:1.6rem;height:52px;line-height:52px"><img src="items/ore_silver.webp?v=1113" style="height:1.15em;vertical-align:-.25em" alt=""></div>')+'<div style="font-size:.58rem;font-weight:700;color:'+col+';margin-top:2px">'+nm+'</div><div style="font-size:.5rem;opacity:.8">'+sub+'</div><div style="margin-top:5px">'+(bo?'<span style="font-size:.6rem">✔ gekauft</span>':'<button class="btn btn-sm" style="font-size:.6rem" onclick="__dailyBuy('+i+')">💰 '+pr(o)+'</button>')+'</div></div>'});
  h+='</div></div>';return h}
 window.__kamDaily=function(){var m=$('dailyModal');if(!m){m=document.createElement('div');m.id='dailyModal';m.style.cssText='position:fixed;inset:0;z-index:900;background:#0b0816ee;overflow:auto;padding:14px;font-family:Cinzel,Georgia,serif;color:#f5e6b0;display:none';document.body.appendChild(m)}
  m.innerHTML=dHtml(false);m.style.display='block'};
 window.__dailyInto=function(el){el.innerHTML=dHtml(true)};
 window.__kamDailyState=function(){try{var d=st();return {claimed:!!d.claimed,rw:rwTxt(rw())}}catch(e){return null}};
 window.__dailyRefresh=function(){var e=document.getElementById('dailyEmbed');if(e)return window.__dailyInto(e);var m=$('dailyModal');if(m&&m.style.display!=='none')window.__kamDaily()};
})();

/* ---- Waffen-Lexikon ---- */
(function(){
 var WT=[['weapon','Schwerter','Ben'],['bow','Bögen','Elfa'],['staff','Stäbe','Kalifa'],['fist','Fäuste','Luna'],['spear','Speere','Jamal'],['club','Keulen','Brutus'],['axe','Äxte','Jeffrey'],['potion','Tränke','Berta'],['helm','Helme','Schwer / Leder / Stoff'],['armor','Rüstungen','Schwer / Leder / Stoff'],['shield','Schilde','Ben, Jamal, Brutus, Berta, Jeffrey'],['quiver','Köcher','Elfa'],['book','Bücher','Kalifa'],['hand','Handschuhe','alle Helden'],['shoulder','Schulterpolster','alle Helden'],['boots','Schuhe','alle Helden'],['cape','Umhänge','alle Helden'],['ring','Ringe','alle Helden'],['amulet','Amulette','alle Helden']],
 RK=['normal','gruen','blau','episch','legendaer','mystisch'],DK='robWpnDex2',IRW={normal:5,gruen:8,blau:12,episch:20,legendaer:35,mystisch:50};
 function dex(){try{return JSON.parse(localStorage.getItem(DK)||'{}')}catch(e){return {}}}
 function scan(){try{ens();var d=dex(),ch=false;for(var u in inventory.inst){var n=inventory.inst[u];if(!n||!n.b)continue;var key=n.b+':'+(n.c||0);if(!d[key]){d[key]=1;ch=true;var x=ITEMS.find(function(y){return y.id===n.b});if(x&&WT.some(function(t){return t[0]===x.type})&&!x.z&&window.__wdexNew)toast('📖 Waffen-Lexikon: '+x.name+' ('+CN[n.c||0]+') eingetragen!')}}
  if(ch)localStorage.setItem(DK,JSON.stringify(d));
  var ms=inventory.ms=inventory.ms||{},rc=false;
  ITEMS.forEach(function(x){if(x.z||!WT.some(function(t){return t[0]===x.type}))return;var key='W'+x.id;if(ms[key])return;if(!(d[x.id+':0']&&d[x.id+':1']&&d[x.id+':2']))return;
   ms[key]=1;rc=true;var ri=RK.indexOf(x.rarity),nr=RK[ri+1],pool=nr?ITEMS.filter(function(y){return y.type===x.type&&y.rarity===nr&&!y.z&&!y.fx&&(!x.cls||y.cls===x.cls)}):[];
   if(nr&&!pool.length)pool=ITEMS.filter(function(y){return y.type===x.type&&y.rarity===nr&&!y.z&&!y.fx});
   var cond=Math.floor(Math.random()*3),pick=pool.length?pool[Math.floor(Math.random()*pool.length)]:x;if(!pool.length)cond=2;
   grant([[pick.id,cond]],{iron:IRW[x.rarity]||5},'Waffen-Lexikon: '+x.name+' komplett')});
  if(rc)try{saveInventory()}catch(e){}}catch(e){}window.__wdexNew=1}
 setInterval(scan,2500);
 var WDF='';window.__kamWDF=function(t){WDF=t||'';window.__kamWDex()};
 window.__kamWDex=function(){scan();var d=dex(),m=$('wdexModal');if(!m){m=document.createElement('div');m.id='wdexModal';m.style.cssText='position:fixed;inset:0;z-index:900;background:#0b0816ee;overflow:auto;padding:14px;font-family:Cinzel,Georgia,serif;color:#f5e6b0;display:none';document.body.appendChild(m)}
  var tot=0,have=0,h='<div style="max-width:440px;margin:0 auto"><div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><button class="btn btn-sm" onclick="document.getElementById(\'wdexModal\').style.display=\'none\';if(window.__fromProf){window.__fromProf=0;var p=document.getElementById(\'kamPf\');if(p)p.click()}">← ZURÜCK</button><b style="font-size:1.05rem">📖 WAFFEN-LEXIKON</b></div>';
  var body='',PC={};
  WT.forEach(function(t){var CO=function(x){return x.cls==='leder'?1:x.cls==='stoff'?2:0};var L=ITEMS.filter(function(x){return x.type===t[0]&&!x.z}).sort(function(a,b){return CO(a)-CO(b)||RK.indexOf(a.rarity)-RK.indexOf(b.rarity)});if(!L.length)return;var mark=body.length,h0=have,t0=tot;
   body+='<div style="margin:12px 0 6px;font-size:.8rem;color:#ffd24a">'+t[1]+' <span style="opacity:.6;font-size:.65rem">· für '+t[2]+'</span></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
   L.forEach(function(x){var n3=0,col=RARITY_COLOR[x.rarity]||'#888',bd='';tot+=3;[0,1,2].forEach(function(c){var s=!!d[x.id+':'+c];if(s){have++;n3++}bd+='<span style="font-size:.48rem;padding:1px 4px;border-radius:6px;margin:0 1px;border:1px solid '+(s?CC[c]:'#3a3358')+';color:'+(s?CC[c]:'#6a6488')+';background:'+(s?'#0006':'none')+'">'+['G','N','P'][c]+(s?'✔':'')+'</span>'});var s=n3===3;
    body+='<div style="border:1px solid '+(s?col:'#3a3358')+';border-radius:10px;padding:6px 4px;text-align:center;background:'+(n3?'#1a1330':'#0d0a18')+';'+(n3?'':'opacity:.65')+'"><img src="'+ico(x.id)+'" style="width:52px;height:52px;object-fit:contain"><div style="font-size:.55rem;margin-top:3px;color:'+col+';font-weight:700">'+x.name+'</div><div style="font-size:.5rem;opacity:.85">'+(x.atk?'+'+x.atk+' ATK':'')+(x.atk&&x.hp?' · ':'')+(x.hp?'+'+x.hp+' ❤':'')+(!x.atk&&!x.hp&&x.desc?x.desc:'')+'</div>'+(['helm','armor'].indexOf(x.type)>=0?'<div style="font-size:.45rem;opacity:.7">'+(x.cls==='leder'?'Leder':x.cls==='stoff'?'Stoff':'Schwer')+'</div>':'')+'<div style="margin-top:3px">'+bd+'</div><div style="font-size:.45rem;margin-top:3px;color:'+((inventory.ms||{})['W'+x.id]?'#6c6':'#c8a070')+'">'+((inventory.ms||{})['W'+x.id]?'🎁 erhalten':'🎁 '+(RK[RK.indexOf(x.rarity)+1]?RARITY_LABEL[RK[RK.indexOf(x.rarity)+1]]:'Perfekt')+' + <img src="items/ore_silver.webp?v=1113" style="height:1.15em;vertical-align:-.25em" alt="">'+(IRW[x.rarity]||5))+'</div></div>'});
   body+='</div>';PC[t[0]]=[have-h0,tot-t0];if(WDF&&WDF!==t[0])body=body.slice(0,mark)});
  var bar='<div style="position:sticky;top:-14px;z-index:5;background:#0b0816;padding:8px 0;margin:0 -2px 6px;display:flex;gap:6px;overflow-x:auto;white-space:nowrap">'+[['','Alle']].concat(WT.filter(function(t){return PC[t[0]]}).map(function(t){return [t[0],t[1]]})).map(function(c){var on=(WDF||'')===c[0],pc=c[0]?PC[c[0]]:[have,tot];return '<span onclick="__kamWDF(\''+c[0]+'\')" style="cursor:pointer;flex:none;font-size:.62rem;padding:5px 9px;border-radius:14px;border:1px solid '+(on?'#ffd24a':'#3a3358')+';color:'+(on?'#ffd24a':'#c8b890')+';background:'+(on?'#2a2040':'#120d20')+'">'+c[1]+' <span style="opacity:.7">'+pc[0]+'/'+pc[1]+'</span></span>'}).join('')+'</div>';
  h+='<div style="font-size:.7rem;opacity:.8;margin-bottom:4px">Gesammelt: <b>'+have+' / '+tot+'</b> · jede Waffe in <span style="color:#aaa">G</span>ebraucht, <span style="color:#8fd8ff">N</span>eu (Wie neu) und <span style="color:#ffd24a">P</span>erfekt</div><div style="font-size:.62rem;color:#ffd24a;margin-bottom:6px">🎁 Hast du alle drei Zustände eines Items, bekommst du einen <b>zufälligen Gegenstand der nächsthöheren Seltenheit</b> (z. B. von Grün zu Blau, Zustand zufällig) und <b>Eisenbarren</b>.</div>'+bar+body+'</div>';
  m.innerHTML=h;m.style.display='block'};
})();
window.equipItem=function(uid,who){var i=it(uid);if(!i)return;who=who||sel;if(!can(who,i))return;
 var cur=wearer(uid);if(cur===who){unw(uid);saveInventory();render();return}
 if(cur&&inventory.lock&&inventory.lock[uid]){try{toast('🔒 Bleibt bei '+NN[cur])}catch(e){}return}
 if(cur)unw(uid);
 var g=gear(who),kk=gk(who,i),oid=g[kk];if(oid)unw(oid);
 g[kk]=uid;var n=st(i);
 if(meta){if(who==='hero'){meta.attack+=n.atk;meta.maxHp+=n.hp;meta.hp=Math.min(meta.hp,meta.maxHp)}try{updateUI()}catch(e){}}
 if(who==='hero')zsync();saveInventory();render()};
window.unequipItem=function(t){var uid=inventory.equipped[t];if(uid){unw(uid);saveInventory();render()}};
function slotHtml(w,t){var id=gear(w)[t],i=id?it(id):null,col=i?RARITY_COLOR[i.rarity]:'#7a4a1a';
 return '<div class="hs'+(i?'':' e')+'" style="border-color:'+col+(i&&i.c===2?';box-shadow:0 0 10px #ffd24a':'')+'" '+(i?'onclick="__kamInfo(\''+id+'\')"':'')+'>'+(i?itemIcon(i,48):'<span>'+SLN[t]+'</span>')+'<em>'+(i?stars(i):SLN[t])+'</em></div>'}
function card(i,sub,click,on){var col=RARITY_COLOR[i.rarity];
 return '<div onclick="'+click+'" style="border:2px solid '+(on?col:'#222')+';border-radius:6px;padding:6px;text-align:center;cursor:pointer;background:rgba(10,10,15,.8);position:relative;display:inline-block;width:48%;margin:1%;vertical-align:top;box-sizing:border-box'+(i.c===2?';box-shadow:0 0 10px #ffd24a66':'')+'">'+itemIcon(i,48)+
 '<div style="font-size:0.6rem;color:'+col+';font-weight:700">'+i.name+'</div><div style="font-size:0.55rem;color:#888">'+descOf(i)+'</div>'+
 '<div style="font-size:0.55rem"><span style="color:#ffd24a">'+stars(i)+'</span> <span style="color:'+CC[i.c]+'">'+CN[i.c]+'</span></div>'+(hasE(i)?efIcons(i.id)+'<span onclick="event.stopPropagation();__kamInfo(\''+i.id+'\')" style="position:absolute;top:2px;right:4px;font-size:.8rem;border:1px solid #c9a050;border-radius:50%;width:18px;height:18px;line-height:16px;color:#f0c040">i</span>':'')+(sub||'')+'</div>'}
function tg(i){return ['bow','staff','club','axe','spear','potion','fist'].indexOf(i.type)>=0?'weapon':i.type}
function filt(){var T=[['all','Alle'],['weapon','Waffe'],['helm','Helm'],['armor','Rüstung'],['ring','Ring'],['cape','Umhang'],['hand','Handsch.'],['shoulder','Schulter'],['boots','Schuhe'],['amulet','Amulett'],['quiver','Köcher'],['book','Buch'],['shield','Schild']],R=[['all','Alle','#ccc'],['normal','Normal','#aaa'],['gruen','Grün','#44cc44'],['blau','Blau','#4488ff'],['episch','Lila','#cc44ff'],['legendaer','Legendär','#ff8800']];
 function ch(a,cur,fn){return '<span onclick="'+fn+'(\''+a[0]+'\')" style="padding:4px 9px;border-radius:12px;font-size:.62rem;cursor:pointer;border:1px solid '+(a[2]||'#c9a050')+';color:'+(cur===a[0]?'#000':(a[2]||'#ffe9c4'))+';background:'+(cur===a[0]?(a[2]||'#f0c040'):'#0006')+'">'+a[1]+'</span>'}
 return '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">'+T.map(function(a){return ch(a,FT,'__kamFT')}).join('')+'</div><div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">'+R.map(function(a){return ch(a,FR,'__kamFR')}).join('')+'</div>'}
window.__kamFT=function(v){FT=v;render()};window.__kamFR=function(v){FR=v;render()};
function sorted(){ens();return inventory.items.map(it).filter(Boolean).sort(function(a,b){return RANK.indexOf(b.rarity)-RANK.indexOf(a.rarity)||b.c-a.c||b.s-a.s})}
function render(){
 ens();var c=clv(),L=document.getElementById('invSlots');if(!L)return;
 var hh=L.parentNode.querySelector('h2');if(hh&&!document.getElementById('kamCharBtn')){hh.style.position='relative';var cb=document.createElement('div');cb.id='kamCharBtn';cb.textContent='Charakter';cb.onclick=function(){window.__kamChars()};cb.style.cssText='position:absolute;left:0;top:50%;transform:translateY(-60%);border:2px solid #f0c040;border-radius:10px;padding:4px 8px;font:700 .6rem Cinzel,Georgia,serif;color:#f0c040;cursor:pointer;background:#0008;box-shadow:0 0 10px #f0c04044';hh.appendChild(cb)}
 if(hlvl()<NEED[sel]&&!(window.__kamGot&&window.__kamGot()[sel]))sel='hero';
 var tabs='';['hero','arc','mag'].forEach(function(w){var lock=hlvl()<NEED[w]&&!(window.__kamGot&&window.__kamGot()[w]);
  tabs+='<div class="ht'+(sel===w?' on':'')+(lock?' lk':'')+'" '+(lock?'':'onclick="__kamSel(\''+w+'\')"')+'>'+
   (lock?'<b>🔒</b><small>Neuer Held<br>ab Heldenlv. '+NEED[w]+'</small>':'<img class="pt" src="'+PRT[w]+'"><small>'+NN[w]+'</small>')+'</div>'});
 var s=SL[sel],g=function(a){return a.map(function(t){return slotHtml(sel,t)}).join('')};
 var hi=HF(sel,0);
 L.innerHTML='<style>.hts{display:flex;gap:8px;justify-content:center;margin-bottom:10px}.ht{width:84px;height:88px;border:2px solid #7a4a1a;border-radius:12px;background:#0006;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:4px;cursor:pointer;color:#ffe9c4}.ht.on{border-color:#f0c040;box-shadow:0 0 14px #f0c04066}.ht img{width:54px;height:54px;object-fit:cover;object-position:50% 15%;border-radius:8px}.ht small{font-size:10px;text-align:center}.ht.lk{opacity:.55;cursor:default;justify-content:center}.ht b{font-size:20px}'+
 '.hst{display:grid;grid-template-columns:54px minmax(0,1fr) 54px;gap:6px;align-items:center;justify-items:center;border:2px solid #7a4a1a;border-radius:16px;padding:12px 12px 22px;overflow:hidden;background:linear-gradient(#0003,#000a),url(dung/floor.webp) center/cover}.hc{display:flex;flex-direction:column;gap:16px}.hs{width:54px;height:54px;box-sizing:border-box;border:2px solid;border-radius:12px;background:#000a;display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer}.hs img{margin:0!important;width:40px!important;height:40px!important}.hs em{position:absolute;bottom:-14px;font-size:9px;font-style:normal;color:#ffe9c4;opacity:.75;white-space:nowrap}.hs.e{border-style:dashed;opacity:.65;font-size:10px;color:#ffe9c4}'+
 '.hh{display:flex;flex-direction:column;align-items:center}.hh img{width:120px;height:120px;object-fit:contain;filter:drop-shadow(0 6px 8px #000)}.hh .d{width:104px;height:24px;border-radius:50%;background:radial-gradient(#f0c04066,#0000 70%);margin-top:-16px}.hh b{color:#f0c040;font-size:14px;margin-top:4px}</style>'+
 '<div class="hts">'+tabs+'</div>'+posbar()+'<div class="hst"><div class="hc">'+g(s.slice(0,5))+'</div><div class="hh"><img id="hAn" src="'+hi+'"><div class="d"></div><b>'+NN[sel]+'</b><div style="margin-top:18px">'+g(s.slice(9))+'</div></div><div class="hc">'+g(s.slice(5,9))+'</div></div>';
 var b=document.getElementById('invBonus');if(b){b.innerHTML=meta?'<div style="font-size:0.65rem;color:#44ddff;text-align:center;margin:12px 0 8px">Stats: <b style="color:#ff6644">'+meta.hp+'/'+meta.maxHp+' HP</b> | <b style="color:#ffaa44">'+meta.attack+' ATK</b>'+(sel!=='hero'?' | '+NN[sel]+': <b style="color:#ffd24a">'+allyDmg(sel)+' Schaden</b> <span style="opacity:.7">('+Math.round(ALLY.filter(function(z){return z.id===sel})[0].mult*100)+'% von Ben + '+window.__kamAllyBonus(sel)+' Ausrüstung)</span>':'')+' | <img src="items/ore_silver.webp?v=1113" style="height:1.15em;vertical-align:-.25em" alt=""> '+(inventory.iron||0)+'</div>':'<div style="height:10px"></div>'}
 var h='<div style="font-size:0.65rem;color:#806040;letter-spacing:2px;margin-bottom:8px">BEUTEL für '+NN[sel].toUpperCase()+'</div>'+filt(),n=0;
 var SRT=sorted(),OWNR={bow:'arc',staff:'mag',quiver:'arc',book:'mag',shield:'hero',club:'brutus',axe:'jeffrey',spear:'jamal',potion:'berta',fist:'luna'};SRT=SRT.filter(function(i){return (FT==='all'||tg(i)===FT)&&(FR==='all'||i.rarity===FR)});SRT=SRT.filter(function(i){return can(sel,i)}).concat(SRT.filter(function(i){return !can(sel,i)}));SRT.forEach(function(i){var cn=can(sel,i);n++;var w=wearer(i.id),mine=w===sel;
  h+=card(i,'<div style="font-size:0.5rem;color:'+(mine?'#44ff88':w?'#ffaa44':'#446688')+'">'+(!cn?(ownersOf(i)?'🔒 nur für '+ownersOf(i).filter(function(z){return NM[z]}).map(function(z){return NM[z]}).join(', '):'🔒 für '+NM[OWNR[i.type]||'hero']+(NEED[OWNR[i.type]||'hero']?' (ab Heldenlevel '+NEED[OWNR[i.type]||'hero']+')':'')):mine?'ANGELEGT · tippen zum Ablegen':w?'trägt: '+NN[w]:'anlegen')+(w?' <span onclick="event.stopPropagation();__kamLk(\''+i.id+'\')" style="font-size:.75rem;margin-left:4px">'+(inventory.lock&&inventory.lock[i.id]?'🔒':'🔓')+'</span>':'')+'</div>'+(w?'':'<div onclick="event.stopPropagation();__kamSell(\''+i.id+'\')" style="font-size:0.55rem;color:'+(window.__kamSellArm===i.id?'#ff8a8a':'#e0c070')+';margin-top:3px;text-decoration:underline">'+(window.__kamSellArm===i.id?'Sicher? +'+price(i)+' Gold':'verkaufen ('+price(i)+')')+'</div>'),cn?'equipItem(\''+i.id+'\')':'',mine&&cn)});
 if(!n)h+='<div style="font-size:0.7rem;color:#446688;text-align:center;padding:12px">Keine passenden Items. Ändere den Filter oder besiege Monster und Bosse!</div>';
 var T=document.getElementById('invItems');if(T)T.innerHTML=h}

var SWP=false,SWF=-1,CTB='k',CPK=null;
function locked(id){return id!=='hero'&&hlvl()<NEED[id]&&!(window.__kamGot&&window.__kamGot()[id])}
function posbar(){return '';
 var h='<style>.pbr{display:flex;gap:6px;align-items:stretch;margin-bottom:10px}.pbr .pb{border:2px solid #7a4a1a;background:#0006;color:#ffe9c4;border-radius:12px;font-size:11px;padding:6px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0}.pbr .pb.gl{border-color:#f0c040;box-shadow:0 0 14px #f0c04088;color:#f0c040}.pbr .pc{flex:1;flex-direction:row;gap:5px;justify-content:flex-start}.pbr .pc img{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:40% 8%;border:2px solid #4ade80;background:#000}.pbr .pc.sel{border-color:#f0c040;box-shadow:0 0 12px #f0c040aa}.pbr .pc small{font-size:9px;opacity:.8;line-height:1.1;text-align:left}.pbr .pc.lk img{filter:grayscale(1);opacity:.5}.pbr.sw .pc{animation:kpul 1s infinite alternate}@keyframes kpul{to{box-shadow:0 0 10px #f0c04088}}</style>';
 h+='<div class="pbr'+(SWP?' sw':'')+'"><div class="pb'+(SWP?' gl':'')+'" onclick="__kamSwp()">⇄<br>Wechseln</div>';
 SLT.forEach(function(id,i){var lk=locked(id);h+='<div class="pb pc'+(SWF===i?' sel':'')+(lk?' lk':'')+'" onclick="__kamPos('+i+')"><img src="'+HF(id,0)+'"><small>Platz '+(i+1)+'<br>'+(lk?'🔒':NN[id])+'</small></div>'});
 h+='<div class="pb" onclick="__kamChars()">Charakter</div></div>';
 return h+(SWP?'<div style="font-size:.6rem;color:#9a8cc0;text-align:center;margin:-4px 0 8px">'+(SWF<0?'Tippe den ersten Platz an.':'Tippe den Platz zum Tauschen an.')+'</div>':'')}
window.__kamSwp=function(){SWP=!SWP;SWF=-1;render();chDraw()};
window.__kamPos=function(i){if(!SWP)return;if(SWF<0){SWF=i;chDraw();return}if(SWF!==i){var t=SLT[SWF];SLT[SWF]=SLT[i];SLT[i]=t;saveSL();applySlots()}SWF=-1;SWP=false;render();chDraw()};
window.__kamChars=function(){CPK=null;chDraw();var m=document.getElementById('kamChar');if(m)m.style.display='flex'};
window.__kamChClose=function(e){if(e&&e.target&&e.target.id!=='kamChar')return;var m=document.getElementById('kamChar');if(m)m.style.display='none'};
window.__kamNote=function(n){var T={Luna:'Luna · vorne · Fäuste. Hilft mit Bonus, der mit ihrem Heldenlevel wächst.',Jamal:'Jamal · hinten · Speerwerfer.',Brutus:'Brutus · vorne · Berserker, Bodenschlag.',Jeffrey:'Jeffrey · Tank · Gruppe erhält 10% weniger Schaden.',Berta:'Berta · hinten · Magierin · 10% Chance, dass Gegner eine Runde aussetzen.'};window.__kamNt='<b style="color:#f0c040">'+n+'</b><div style="font-size:12px;margin-top:4px">'+(T[n]||'')+' Kampfbild folgt.</div>';chDraw()};
window.__kamChTab=function(t){window.__kamNt=null;CTB=t;CPK=null;chDraw()};
window.__kamChPick=function(id){CPK=id;chDraw()};
window.__kamChPlace=function(id,p){var o=SLT.indexOf(id);if(o>=0){SLT[o]=SLT[p]}SLT[p]=id;saveSL();applySlots();window.__kamChClose();render()};
function chDraw(){
 var m=document.getElementById('kamChar');
 if(!m){m=document.createElement('div');m.id='kamChar';m.onclick=window.__kamChClose;m.style.cssText='position:fixed;inset:0;z-index:100001;background:#000c;display:none;align-items:flex-end;justify-content:center';document.body.appendChild(m)}
 var sty='<style>#kamChar .sh{width:min(100%,440px);background:#160e28;border:2px solid #5a3f8a;border-radius:18px 18px 0 0;padding:14px 16px 18px;max-height:82vh;overflow:auto;color:#ffe9c4;font-family:inherit}#kamChar .tb{display:flex;gap:8px;margin-bottom:10px}#kamChar .tb div{flex:1;text-align:center;border:2px solid #5a3f8a;border-radius:12px;padding:8px;font-size:13px;cursor:pointer}#kamChar .tb div.on{background:#f0c040;color:#000;border-color:#f0c040}#kamChar .g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}#kamChar .t{border:2px solid #5a3f8a;border-radius:12px;background:#0006;padding:6px 4px 8px;text-align:center;font-size:12px;cursor:pointer;min-width:0}#kamChar .t img{width:62px;height:62px;object-fit:cover;object-position:40% 8%;border-radius:10px;display:block;margin:0 auto 4px}#kamChar .t.lk{opacity:.5;cursor:default}#kamChar .t.lk .ic{font-size:30px;height:62px;line-height:62px}#kamChar .t small{display:block;color:#9a8cc0;font-size:10px;margin-top:2px}#kamChar .t.on{border-color:#f0c040;box-shadow:0 0 12px #f0c04066}#kamChar .d{margin-top:10px;border:1px solid #5a3f8a;border-radius:12px;padding:10px;font-size:13px;background:#0004}#kamChar .rw{display:flex;gap:8px;margin-top:8px}#kamChar .rw div{flex:1;text-align:center;border:2px solid #f0c040;border-radius:12px;padding:9px;color:#f0c040;cursor:pointer;box-shadow:0 0 10px #f0c04055}</style>';
 var PXs=[[188,6],[128,70],[18,34]],stg='<div style="position:relative;height:176px;border:2px solid #7a4a1a;border-radius:14px;background:linear-gradient(#0003,#000a),url(dung/floor.webp) center/cover;overflow:hidden;margin-bottom:8px">';
 SLT.forEach(function(id,i){var lk=locked(id);stg+='<div onclick="__kamPos('+i+')" style="position:absolute;left:'+PXs[i][0]+'px;bottom:'+PXs[i][1]+'px;width:92px;height:84px;border:2px '+(SWP?'solid':'dashed')+' '+(SWF===i?'#f0c040':SWP?'#f0c04077':'#ffffff33')+';border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;z-index:'+[3,1,2][i]+(SWF===i?';box-shadow:0 0 14px #f0c040':'')+'"><span style="position:absolute;top:2px;left:6px;font-size:9px;color:#9a8cc0">Platz '+(i+1)+'</span><img src="'+HF(id,0)+'" style="height:'+(id==='hero'?54:id==='arc'?50:48)+'px;display:block;'+(lk?'filter:grayscale(1);opacity:.5':'')+'"><span style="font-size:10px;color:#f0c040;font-weight:700">'+NN[id]+'</span></div>'});
 stg+='</div><div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><div onclick="__kamSwp()" style="border:2px solid '+(SWP?'#f0c040':'#5a3f8a')+';border-radius:10px;padding:6px 12px;font-size:12px;cursor:pointer;color:'+(SWP?'#f0c040':'#ffe9c4')+(SWP?';box-shadow:0 0 12px #f0c04088':'')+'">⇄ Wechseln</div><div style="font-size:11px;color:#9a8cc0;flex:1">'+(SWP?(SWF<0?'Tippe den ersten Platz an.':'Tippe den Platz zum Tauschen an.'):'Ausrüstung bleibt bei der Figur.')+'</div></div>';
 var h=sty+'<div class="sh">'+stg+'<div class="tb"><div class="'+(CTB==='k'?'on':'')+'" onclick="__kamChTab(\'k\')">Klassenhelden</div><div class="'+(CTB==='h'?'on':'')+'" onclick="__kamChTab(\'h\')">Helden</div></div>';
 function pl(id){return '<div class="rw">'+[1,2,3].map(function(p){return '<div onclick="__kamChPlace(\''+id+'\','+(p-1)+')">Platz '+p+'</div>'}).join('')+'</div>'}
 function tile(id,sub){var lk=locked(id);return '<div class="t'+(lk?' lk':'')+(CPK===id?' on':'')+'" '+(lk?'':'onclick="__kamChPick(\''+id+'\')"')+'>'+'<img src="'+PRT[id]+'"'+(lk?' style="filter:grayscale(1)"':'')+'>'+NN[id]+'<small>'+(lk?'🔒 ab Heldenlevel '+NEED[id]:sub)+'</small></div>'}
 function lock(a,b,p,tx){var u=window.__hl!=null||1;var ok=tx&&tx();return '<div class="t'+(ok?'':' lk')+'" onclick="__kamNote(\''+a+'\')"><img src="items/p_'+p+'.webp"'+(ok?'':' style="filter:grayscale(1)"')+'>'+a+'<small>'+(ok?'Kampfbild folgt':'🔒 '+b)+'</small></div>'}
 var cn='';try{cn=playerClasses.length?playerClasses.map(function(c){return c.name}).join('+'):'noch keine Klasse'}catch(e){}
 if(CTB==='k'){
  h+='<div style="font-size:12px;color:#9a8cc0;margin-bottom:8px">Klassenhelden: Klassenlevel gilt für alle und bleibt nach Prestige.</div><div class="g">'+tile('hero','Start · Platz '+(SLT.indexOf('hero')+1))+lock('Jeffrey','ab Klassenlevel 50','jeffrey',function(){return clv()>=50})+lock('Berta','ab Klassenlevel 100','berta',function(){return clv()>=100})+'</div>';
  if(CPK==='hero')h+='<div class="d"><b style="color:#f0c040">Ben · Klassenheld</b><div style="font-size:12px;margin:6px 0">Vorne. Gruppen-Fähigkeit: +15% Gold für alle.</div><div style="color:#9a8cc0;font-size:12px;margin:8px 0 0">Einsetzen auf:</div>'+pl('hero')+'</div>';
  if(window.__kamNt)h+='<div class="d">'+window.__kamNt+'</div>'}
 else{
  h+='<div style="font-size:12px;color:#9a8cc0;margin-bottom:8px">Helden kämpfen mit, haben aber keine Klassenfähigkeiten.</div><div class="g">'+tile('arc','frei'+(SLT.indexOf('arc')>=0?' · Platz '+(SLT.indexOf('arc')+1):''))+tile('mag','frei'+(SLT.indexOf('mag')>=0?' · Platz '+(SLT.indexOf('mag')+1):''))+lock('Luna','ab Heldenlevel 10','luna',function(){return hlvl()>=10})+lock('Jamal','ab Heldenlevel 15','jamal',function(){return hlvl()>=15})+lock('Brutus','ab Heldenlevel 20','brutus',function(){return hlvl()>=20})+'</div>'+(window.__kamNt?'<div class="d">'+window.__kamNt+'</div>':'');
  if(CPK&&CPK!=='hero')h+='<div class="d"><b style="color:#f0c040">'+NN[CPK]+'</b><div style="color:#9a8cc0;font-size:12px;margin-top:4px">Einsetzen auf:</div>'+pl(CPK)+'</div>'}
 m.innerHTML=h+'</div>'}
window.__kamLk=function(uid){ens();inventory.lock=inventory.lock||{};if(inventory.lock[uid])delete inventory.lock[uid];else inventory.lock[uid]=1;saveInventory();render()};
window.__kamSel=function(w){sel=w;render()};
window.renderInventoryModal=render;
window.showInventory=function(){sel='hero';render();document.getElementById('inventoryModal').style.display='flex'};
setInterval(function(){var m=document.getElementById('inventoryModal'),im=document.getElementById('hAn');if(!m||m.style.display==='none'||!im)return;fr++;
 im.src=HF(sel,fr);
 [].slice.call(document.querySelectorAll('.ht img')).forEach(function(x){var w=x.dataset.w;if(w)x.src=HF(w,fr)})},300);

/* ---- Waffen-Effekte ---- */
var EQ=[[3,8],[9,14],[15,19],[20,25]],EQN=['Grün','Blau','Lila','Episch'],EQC=['#4caf50','#42a5f5','#ab47bc','#ff9800'];
var EE={first:['⚡','Schnelle Finger'],dgrip:['👊','Doppelgriff'],kgrip:['💪','Kraftgriff'],tsich:['🎯','Treffsicher'],egrip:['🧤','Eisengriff'],pluen:['🪙','Plünderer'],dzau:['📖','Doppelzauber'],arwis:['🔮','Arkanes Wissen'],sseit:['💨','Schnelle Seiten'],hzau:['💚','Heilzauber'],zsch:['🛡️','Zauberschild'],weis:['🪄','Weisheit'],block:['🛡️','Blocken'],guard:['🤝','Wächter'],cnt:['⚔️','Gegenschlag'],prot:['🛡️','Schutz'],elem:['🔮','Elementschutz'],life:['❤️','Leben'],thorn:['🌵','Dornen'],heal:['💚','Heilung'],dodge:['💨','Ausweichen'],fire:['🔥','Feuer'],ice:['❄️','Eis'],thun:['⚡','Blitz'],air:['🌪️','Wind'],fee:['🧚','Fee'],light:['✨','Licht'],dark:['🌑','Dunkel']};
var WCL={weapon:{m:1,lab:'Schwert',pool:['fire','ice','thun','air','light','dark']},bow:{m:.8,lab:'Bogen',pool:['fire','ice','thun','air','fee','dark']},staff:{m:.6,lab:'Magie',pool:['fire','ice','thun','air','fee','dark']}};
var AKT=['helm','armor','cape'],AP=['prot','elem','life','thorn','dodge'],AM={prot:.6,dodge:.6};
var NKT=['hand','book','shield','amulet','boots','quiver','shoulder'];
var SOCK=['weapon','bow','staff','helm','armor','cape','hand','book','shield','boots','shoulder','quiver'];
function hasE(i){return (WKT.indexOf(i.type)>=0||AKT.indexOf(i.type)>=0||NKT.indexOf(i.type)>=0)&&SOCK.indexOf(i.type)<0&&!i.fx&&SLOTS[i.rarity]>0}
AKT.forEach(function(t){WCL[t]={m:1,lab:'Rüstung',pool:AP}});
WCL.hand={m:1,lab:'Handschuhe',pool:['first','dgrip','kgrip','tsich','egrip','pluen']};WCL.book={m:1,lab:'Buch',pool:['dzau','arwis','sseit','hzau','zsch','weis']};WCL.shield={m:1,lab:'Schild',pool:['block','prot','thorn','elem','guard','cnt']};
WCL.amulet={m:1,lab:'Amulett',pool:['akr','agl','arei','ahei','asch','abl']};WCL.boots={m:1,lab:'Schuhe',pool:['bfl','bau','bdo','bhe','bfe','bge']};WCL.shoulder={m:1,lab:'Schulter',pool:['spr','sle','sdo','sbl']};WCL.quiver={m:1,lab:'Köcher',pool:['qdo','qsp','qtr','qeis','qbe']};
EE.akr=['💪','Kraft'];EE.agl=['🍀','Glück'];EE.arei=['🪙','Reichtum'];EE.ahei=['💚','Lebenskraft'];EE.asch=['🛡️','Schutz'];EE.abl=['⚡','Blitz'];EE.bfl=['💨','Flink'];EE.bau=['❤️','Ausdauer'];EE.bdo=['🌵','Dornen'];EE.bhe=['💚','Heilschritt'];EE.bfe=['🛡️','Festigkeit'];EE.bge=['🪙','Beutegang'];EE.spr=['🛡️','Schutz'];EE.sle=['❤️','Ausdauer'];EE.sdo=['🌵','Dornen'];EE.sbl=['🛡️','Block'];EE.qdo=['🏹','Doppelpfeil'];EE.qsp=['🎯','Spitzpfeil'];EE.qtr=['🍀','Treffpfeil'];EE.qeis=['❄️','Eispfeil'];EE.qbe=['🪙','Beutepfeil'];
AM.dgrip=.8;AM.dzau=.8;AM.egrip=.8;AM.block=.8;AM.zsch=.6;
var BM={helm:null,armor:null,cape:null,weapon:{fire:'dmg',ice:'stun',thun:'behind',air:'stun',light:'heal',dark:'steal'},bow:{fire:'dmg',ice:'stun',thun:'behind',air:'dbl',fee:'heal',dark:'dot'},staff:{fire:'dmg',ice:'stun',thun:'dmg',air:'stun',fee:'heal',dark:'weak'}};
var ABM={prot:'prot',elem:'elem',life:'life',thorn:'thorn',heal:'rheal',dodge:'adodge'};BM.helm=BM.armor=BM.cape=ABM;
BM.amulet={akr:'dmg',agl:'crit',arei:'gold',ahei:'rheal',asch:'prot',abl:'stun'};BM.boots={bfl:'adodge',bau:'life',bdo:'thorn',bhe:'rheal',bfe:'prot',bge:'gold'};BM.shoulder={spr:'prot',sle:'life',sdo:'thorn',sbl:'block'};BM.quiver={qdo:'dbl',qsp:'dmg',qtr:'crit',qeis:'stun',qbe:'gold'};
BM.hand={first:'stun',dgrip:'dbl',kgrip:'dmg',tsich:'crit',egrip:'stun',pluen:'gold'};BM.book={dzau:'dbl',arwis:'dmg',sseit:'stun',hzau:'gheal',zsch:'prot',weis:'gold'};BM.shield={block:'block',prot:'prot',thorn:'thorn',elem:'elem',guard:'guard',cnt:'cnt'};
var MT={crit:function(v){return v+'% Chance auf einen Krit-Treffer (+50% Schaden)'},gold:function(v){return '+'+v+'% Gold aus Kämpfen'},gheal:function(v){return 'Heilt die Gruppe jede Runde um '+(v/10).toFixed(1)+'% Leben'},block:function(v){return v+'% Chance, den Schaden eines Treffers zu halbieren'},guard:function(v){return 'Mitstreiter erleiden '+v+'% weniger Schaden (solange du lebst)'},cnt:function(v){return v+'% Chance, nach einem Block zurückzuschlagen'},prot:function(v){return v+'% weniger Schaden von allen Angriffen'},elem:function(v){return v+'% weniger Schaden von Zauber- und Element-Gegnern'},life:function(v){return 'Hält '+v+'% mehr aus (wie +'+v+'% Leben)'},thorn:function(v){return v+'% des erlittenen Schadens geht an den Angreifer zurück'},rheal:function(v){return 'Heilt dich jede Runde um '+(v/10).toFixed(1)+'% Leben'},adodge:function(v){return v+'% Chance, einem Angriff auszuweichen'},protx:function(v){return '+'+Math.round(v*.5)+'% Schutz extra (Schutz kann bis 100% steigen)'},dmg:function(v){return v+'% extra Schaden'},stun:function(v){return v+'% Chance: Gegner verliert seinen nächsten Angriff'},behind:function(v){return v+'% des Schadens trifft auch den Gegner dahinter'},all:function(v){return v+'% des Schadens trifft alle anderen Gegner'},heal:function(v){return 'Heilt dich pro Treffer um '+(v/10).toFixed(1)+'% Leben'},steal:function(v){return v+'% des Schadens heilen dich'},dbl:function(v){return v+'% Chance auf einen zweiten Treffer'},dot:function(v){return 'Gift: '+v+'% Schaden pro Runde (3 Runden)'},weak:function(v){return 'Gegner machen '+v+'% weniger Schaden'},dodge:function(v){return 'Gegner verfehlen dich mit '+v+'%'}};
function mtxt(m,v,t){return (t==='staff'&&m!=='heal'&&m!=='weak'?'Alle Gegner: ':'')+MT[m](v)}
var CBO={};function cbA(a,b,n,i,m){CBO[[a,b].sort().join('+')]=[n,i,m]}
cbA('fire','ice','Rauch','💨','dodge');cbA('fire','thun','Plasma','☄️','dmg');cbA('fire','air','Feuersturm','🌋','all');cbA('fire','fee','Funkenstaub','🎇','all');cbA('fire','light','Sonnenglut','☀️','dmg');cbA('fire','dark','Höllenfeuer','👹','dot');
cbA('ice','thun','Frostblitz','🧊','dmg');cbA('ice','air','Blizzard','🌨️','stun');cbA('ice','fee','Raureif','❄️','weak');cbA('ice','light','Kristall','💎','dodge');cbA('ice','dark','Frostfluch','☠️','weak');
cbA('thun','air','Sturm','🌩️','all');cbA('thun','fee','Irrlicht','💫','dbl');cbA('thun','light','Himmelsblitz','⚡','dmg');cbA('thun','dark','Schattenblitz','🌑','stun');
cbA('air','fee','Windfee','🍃','dodge');cbA('air','light','Federlicht','🪶','heal');cbA('air','dark','Gift','☣️','dot');cbA('fee','light','Segen','🙏','heal');cbA('fee','dark','Fluch','🕯️','weak');cbA('light','dark','Zwielicht','🌗','dbl');
function cbA2(a,b,n,i,m){cbA(a,b,n,i,m)}
cbA2('prot','prot','Doppelter Schutz','🛡️','protx');cbA2('prot','elem','Runenpanzer','🔰','elem');cbA2('prot','life','Festung','🏯','life');cbA2('prot','thorn','Stachelpanzer','🦔','thorn');cbA2('prot','heal','Bollwerk','🏰','rheal');cbA2('prot','dodge','Schildtanz','💃','adodge');
cbA2('elem','life','Zauberhaut','🔮','life');cbA2('elem','thorn','Funkenpanzer','⚡','thorn');cbA2('elem','heal','Heiliger Schleier','🕊️','rheal');cbA2('elem','dodge','Nebelmantel','🌫️','adodge');
cbA2('life','thorn','Dornenfleisch','🌹','thorn');cbA2('life','heal','Zähigkeit','💪','rheal');cbA2('life','dodge','Federleicht','🪶','adodge');cbA2('thorn','heal','Dornenranke','🌿','thorn');cbA2('thorn','dodge','Konterschritt','🥷','thorn');cbA2('heal','dodge','Lebensfluss','🌊','rheal');
cbA('first','dgrip','Flinke Hände','⚡','dbl');cbA('egrip','kgrip','Bärenkraft','🐻','stun');cbA('first','tsich','Scharfschütze','🎯','crit');cbA('dgrip','pluen','Raubzug','💰','gold');cbA('dgrip','kgrip','Faustkampf','🥊','dmg');
cbA('dzau','sseit','Zauberschnell','✨','dbl');cbA('arwis','hzau','Heiliges Wissen','📜','gheal');cbA('hzau','zsch','Schutzzauber','🔰','gheal');cbA('arwis','dzau','Arkane Salve','🧪','dmg');cbA('weis','zsch','Weiser Schutz','🦉','gold');
cbA('block','prot','Schildwall','🧱','block');cbA('block','thorn','Stachelschild','🦔','thorn');cbA('guard','prot','Bollwerk','🏰','guard');cbA('block','cnt','Konter-Block','🥷','cnt');
function cbo(a,b,t){var key=[a,b].sort().join('+');if(CBO[key]&&(a!==b||a==='prot'))return CBO[key];if(a!==b&&t&&BM[t]&&BM[t][a]&&BM[t][a]!==BM[t][b])return[EE[a][1]+' + '+EE[b][1],'✦',BM[t][[a,b].sort()[0]]];return a===b?[EE[a][1]+' verstärkt',EE[a][0],'stack']:(CBO[[a,b].sort().join('+')]||['?','✦',null])}
var SPL={weapon:[['dstrike','Doppelschlag','Schlägt zweimal. Der zweite Schlag macht 60% Schaden.'],['kraft','Kraftschlag','Jede Fähigkeit dieser Waffe wirkt doppelt so stark.'],['wirbel','Wirbelhieb','Trifft zusätzlich die Gegner dahinter mit 40%.'],['henker','Henker','Doppelter Schaden gegen Gegner unter 25% Leben.'],['nach','Nachschlag','20% Chance auf einen sofortigen zweiten Schlag.']],
 staff:[['flamme','Lange Flamme','Gift und Brand halten 2 Runden länger.'],['echo','Echo','40% Chance, dass der Zauber sich sofort wiederholt.'],['arkan','Arkane Kraft','Zauber machen 30% mehr Schaden.'],['kette','Kettenzauber','50% Chance auf einen zweiten Zauber mit 50% auf einen zufälligen Gegner.'],['meteor','Meteor','Jede 4. Runde fällt ein Meteor mit dreifachem Schaden auf alle.']],
 bow:[['dshot','Doppelschuss','Zwei Pfeile pro Angriff, der zweite mit 60%.'],['tshot','Dreifachschuss','Drei Pfeile auf drei Ziele, jeder mit 45%.'],['qshot','Vierfachschuss','Vier Pfeile, jeder mit 35%.'],['lade','Ladeschuss','Jeder 2. Schuss ist ein Ladeschuss mit 300% und trifft alle in der Reihe.'],['quer','Querschläger','Der Pfeil springt zweimal mit 40% auf zufällige Gegner.']]};
SPL.helm=SPL.armor=SPL.cape=[['bw','Bollwerk','Der erste Treffer pro Kampf wird ganz geblockt.'],['dorn','Dornenpanzer','Angreifer bekommen immer 15% ihres Schadens zurück.'],['quell','Lebensquell','Heilt dich jede Runde um 3% deiner Leben.'],['spiegel','Spiegelpanzer','25% der gegnerischen Treffer werden auf den Angreifer zurückgeworfen.'],['will','Eiserner Wille','Unter 30% Leben erleidest du 25% weniger Schaden.']];
SPL.amulet=[['dieb','Glücksamulett','Besiegte Gegner lassen 50% mehr Gold fallen.'],['quell','Lebensamulett','Heilt dich jede Runde um 3% deiner Leben.']];SPL.boots=[['will','Eiserner Schritt','Unter 30% Leben erleidest du 25% weniger Schaden.'],['dorn','Dornenstiefel','Angreifer bekommen immer 15% ihres Schadens zurück.']];SPL.quiver=[['drei','Dreifachpfeil','Alle 3 Runden schlägst du mit doppelter Zusatzkraft zu.'],['blitz','Blitzpfeil','Im ersten Angriff jedes Kampfes verlieren alle Gegner ihren Angriff.']];
SPL.hand=[['blitz','Blitzhände','Im ersten Angriff jedes Kampfes verlieren alle Gegner ihren Angriff.'],['drei','Dreifachgriff','Alle 3 Runden schlägst du mit doppelter Zusatzkraft zu.'],['dieb','Diebesgriff','Besiegte Gegner lassen 50% mehr Gold fallen.']];
SPL.book=[['zecho','Zauberecho','Jeder 3. Zauber wird kostenlos wiederholt.'],['bheil','Buch der Heilung','Heilt die Gruppe zusätzlich um 3% pro Runde.'],['verb','Verbotenes Wissen','+40% Schaden, aber du erleidest 5% mehr Schaden.']];
SPL.shield=[['bw','Turmschild','Der erste Treffer jedes Kampfes wird ganz geblockt.'],['aegis','Aegis','Die ersten 2 gegnerischen Angriffe jedes Kampfes treffen niemanden.'],['spiegel','Spiegelschild','25% der Treffer werden auf den Angreifer zurückgeworfen.']];
var SLOTS={normal:0,gruen:1,blau:2,episch:3,legendaer:4,mystisch:4};
function qv(q){return EQ[q][0]+Math.floor(Math.random()*(EQ[q][1]-EQ[q][0]+1))}
function rq(){var r=Math.random()*100;return r<50?0:r<80?1:r<95?2:3}
var MQ={gruen:0,blau:1,episch:2,legendaer:3,mystisch:3};
function ne(t,r){var p=WCL[t].pool,q=rq();if(r&&MQ[r]!=null)q=Math.min(q,MQ[r]);return{e:p[Math.floor(Math.random()*p.length)],q:q,p:qv(q)}}
window.__kamZeroInst=function(bid){ens();var b=base(bid);if(!b)return;var u='u'+inventory.nid++,n={b:bid,c:2,s:0,cq:1,nh:1,e:[],k:[],ro:0};
 if(SOCK.indexOf(b.type)<0&&(WKT.indexOf(b.type)>=0||AKT.indexOf(b.type)>=0||NKT.indexOf(b.type)>=0)){for(var i=0;i<(SLOTS[b.rarity]||0);i++){var x=ne(b.type,b.rarity);x.q=3;x.p=EQ[3][1];n.e.push(x);n.k.push(0)}
  if(SPL[b.type])n.sp=SPL[b.type][Math.floor(Math.random()*SPL[b.type].length)][0]}
 if(SOCK.indexOf(b.type)>=0)n.gm=['r5','g5','b5','y5'].slice(0,GSN[b.rarity]||0);if(SPL[b.type]&&!n.sp)n.sp=SPL[b.type][Math.floor(Math.random()*SPL[b.type].length)][0];
 inventory.inst[u]=n;inventory.items.push(u);try{saveInventory()}catch(x){}return u};
function efOf(uid){ens();var n=inventory.inst&&inventory.inst[uid];if(!n)return null;var b=base(n.b);if(!b||b.fx||SOCK.indexOf(b.type)>=0||(WKT.indexOf(b.type)<0&&AKT.indexOf(b.type)<0&&NKT.indexOf(b.type)<0))return null;
 if(!n.e){var cnt=SLOTS[b.rarity]||0;n.e=[];n.k=[];for(var i=0;i<cnt;i++){n.e.push(ne(b.type,b.rarity));n.k.push(0)}n.ro=0;
  if(RANK.indexOf(b.rarity)>=4&&SPL[b.type])n.sp=SPL[b.type][Math.floor(Math.random()*SPL[b.type].length)][0];
  try{saveInventory()}catch(x){}}
 if(!n.nh&&n.e&&AKT.indexOf(b.type)>=0){n.nh=1;n.e.forEach(function(x){if(x.e==='heal')x.e=AP[Math.floor(Math.random()*AP.length)]});try{saveInventory()}catch(x){}}
 if(!n.cq&&n.e){n.cq=1;var mq=MQ[b.rarity];if(mq!=null)n.e.forEach(function(x){if(x.q>mq){x.q=mq;x.p=qv(mq)}});try{saveInventory()}catch(x){}}
 return n}
function vOf(n,x,t){return Math.max(1,Math.round(x.p*WCL[t].m*(AM[x.e]||1)*(n.sp==='kraft'?2:1)))}
function wfx(uid){var n=efOf(uid);if(!n)return null;var b=base(n.b),t=b.type,c=WCL[t],bm=BM[t],k2=n.sp==='kraft'?2:1,L=[];
 n.e.forEach(function(x){L.push({mech:bm[x.e],v:vOf(n,x,t)})});
 for(var i=0;i<n.e.length-1;i++){var a=n.e[i],b2=n.e[i+1],cb=cbo(a.e,b2.e,t);if(cb[2]&&cb[2]!=='stack')L.push({mech:cb[2],v:vOf(n,a,t)+vOf(n,b2,t)})}
 return{t:t,L:L,sp:n.sp}}
function wUid(w){var g=gear(w)||{};return g[WSK[w]]}
function efIcons(uid){try{var ii=it(uid);if(ii&&SOCK.indexOf(ii.type)>=0&&sockN(ii)){return '<div style="font-size:.55rem">'+gmOf(uid).map(function(k){return gemDot(k,12)}).join(' ')+'</div>'}}catch(e){}var n=efOf(uid);if(!n||!n.e.length)return '';return '<div style="font-size:.55rem;color:#cdb">'+n.e.map(function(x){return EE[x.e][0]+'<b style="color:'+EQC[x.q]+'">'+vOf(n,x,base(n.b).type)+'%</b>'}).join(' ')+(n.sp?' ★':'')+'</div>'}
function efHtml(uid,edit){var n=efOf(uid);if(!n)return '';var b=base(n.b),t=b.type,c=WCL[t],bm=BM[t],k2=n.sp==='kraft'?2:1,h='';
 if(!n.e.length)return '<div style="font-size:.7rem;color:#a08060;padding:6px">Dieser Gegenstand hat keine Effekt-Plätze (ab Grün).</div>';
 n.e.forEach(function(x,j){var v=vOf(n,x,t),lk=edit&&n.k[j];
  h+='<div style="display:flex;gap:8px;align-items:center;border:1px solid '+(lk?'#f0c040':'#5a3f8a')+';border-radius:10px;padding:6px 8px;margin-top:6px;background:#0007'+(lk?';box-shadow:0 0 10px #f0c04055':'')+'"><div style="font-size:22px;min-width:28px;text-align:center">'+EE[x.e][0]+'</div><div style="flex:1;min-width:0"><div style="font-size:.78rem"><b>'+EE[x.e][1]+'</b> <b style="color:'+EQC[x.q]+'">'+v+'%</b> <span style="font-size:.6rem;color:'+EQC[x.q]+'">'+EQN[x.q]+'</span></div><div style="font-size:.62rem;color:#b9a77f">'+mtxt(bm[x.e],v,t)+'</div></div>'+
  (edit?'<div style="display:flex;flex-direction:column;gap:4px;align-items:center"><span onclick="__kamEL('+j+')" style="font-size:1.1rem;cursor:pointer">'+(n.k[j]?'🔒':'🔓')+'</span>'+(x.q<3?'<span onclick="__kamEU('+j+')" style="font-size:.55rem;border:1px solid '+EQC[x.q+1]+';color:'+EQC[x.q+1]+';border-radius:8px;padding:2px 5px;cursor:pointer;white-space:nowrap">▲ '+EQN[x.q+1]+' · '+upCost(x)+'💰</span>':'<span style="font-size:.55rem;color:#ff9800">MAX</span>')+'</div>':'')+'</div>'});
 var cs='';for(var i=0;i<n.e.length-1;i++){var a=n.e[i],b2=n.e[i+1],cb=cbo(a.e,b2.e,t),v2=vOf(n,a,t)+vOf(n,b2,t);
  cs+='<div style="display:flex;gap:8px;align-items:center;border:1px solid #8a60d0;border-radius:10px;padding:6px 8px;margin-top:6px;background:#1a0f2e"><div style="font-size:22px;min-width:28px;text-align:center">'+cb[1]+'</div><div style="font-size:.78rem"><b>'+cb[0]+'</b> <b style="color:#ffd24a">'+v2+'%</b><div style="font-size:.62rem;color:#b9a77f;font-weight:400">'+(cb[2]==='stack'?'Stapelt: '+EE[a.e][1]+' zusammen '+v2+'%':mtxt(cb[2],v2,t))+'</div></div></div>'}
 if(cs)h+='<div style="font-size:.6rem;color:#9a8cc0;letter-spacing:2px;margin-top:10px">KOMBIS (AUTOMATISCH)</div>'+cs;
 if(n.sp){var s=SPL[t].filter(function(x){return x[0]===n.sp})[0];if(s)h+='<div style="border:1px solid #ff9800;border-radius:10px;padding:6px 8px;margin-top:10px;background:#2a1600"><b style="color:#ff9800;font-size:.78rem">★ '+s[1]+'</b><div style="font-size:.62rem;color:#e0c8a0">'+s[2]+'</div></div>'}
 return h}
function efCost(n,b){return Math.round(60*Math.pow(1.5,n.ro||0)*(1+.4*RANK.indexOf(b.rarity)))}
function upCost(x){return Math.round(250*Math.pow(2.5,x.q))}
function sideD(t,d){if(!t||t.hp<=1||d<1)return;t.hp=Math.max(1,t.hp-Math.round(d))}
function healAbs(w,a){a=Math.max(1,Math.round(a));try{if(w==='hero'){if(meta.hp>0){meta.hp=Math.min(meta.maxHp,meta.hp+a);fl('+'+a+' ❤','#6fe08a')}}else if(AH[w]&&AH[w].hp>0)AH[w].hp=Math.min(AH[w].max,AH[w].hp+a)}catch(e){}}
var WC={};
function offIds(w){var g=gear(w)||{},r=[];[g[WSK[w]],g.hand,g.book].forEach(function(u){if(u)r.push(u)});return r}
function strikeFx(w,d0){var ids=offIds(w),gR=gemSum(w,'r');if(!ids.length&&!gR)return 0;var tg=monstersInFight||[],m=tg[0];if(!m)return 0;
 var L=[],sps=[],wt='weapon';ids.forEach(function(u){var F=wfx(u);if(!F)return;if((gear(w)||{})[WSK[w]]===u)wt=F.t;F.L.forEach(function(f){L.push(f)});if(F.sp)sps.push(F.sp)});
 var ex=0,all=wt==='staff',T=all?tg:[m],rest=tg.slice(1);WC[w]=(WC[w]||0)+1;var c=WC[w];
 L.forEach(function(f){var v=f.v,x=v/100;
  switch(f.mech){
   case 'dmg':ex+=d0*x;if(all)rest.forEach(function(t){sideD(t,d0*x)});break;
   case 'crit':if(Math.random()*100<v){ex+=d0*.5;fl('💥 Krit','#ffd24a')}break;
   case 'stun':T.forEach(function(t){if(Math.random()*100<v)t.__frz=1});break;
   case 'behind':sideD(tg[1],d0*x);break;
   case 'all':rest.forEach(function(t){sideD(t,d0*x)});break;
   case 'heal':healAbs(w,(w==='hero'?meta.maxHp:(AH[w]&&AH[w].max)||50)*v/1000);break;
   case 'steal':healAbs(w,d0*x);break;
   case 'dbl':if(Math.random()*100<v){ex+=d0;fl('✨ Doppeltreffer','#ffe14a')}break;
   case 'dot':T.forEach(function(t){t.__dot={d:Math.max(1,Math.round(d0*x)),n:3+(sps.indexOf('flamme')>=0?2:0)}});break}});
 sps.forEach(function(sp){
 if(sp==='dstrike'||sp==='dshot'){ex+=d0*.6;fl('⚔️ Doppelschlag','#ffd24a')}
 else if(sp==='wirbel'){sideD(tg[1],d0*.4);sideD(tg[2],d0*.4)}
 else if(sp==='henker'){if(m.hp<m.maxHp*.25){ex+=d0;fl('☠️ Henker','#ff6666')}}
 else if(sp==='nach'){if(Math.random()<.2){ex+=d0;fl('⚔️ Nachschlag','#ffd24a')}}
 else if(sp==='echo'){if(Math.random()<.4){ex+=d0;fl('🔁 Echo','#d070ff')}}
 else if(sp==='arkan'){ex+=d0*.3}
 else if(sp==='kette'){if(Math.random()<.5){var r=tg[Math.floor(Math.random()*tg.length)];if(r===m)ex+=d0*.5;else sideD(r,d0*.5);fl('⛓ Kettenzauber','#d070ff')}}
 else if(sp==='meteor'){if(c%4===0){ex+=d0*2;rest.forEach(function(t){sideD(t,d0*3)});fl('☄️ METEOR','#ff8a3a')}}
 else if(sp==='tshot'){ex+=d0*.45;sideD(tg[1],d0*.45);sideD(tg[2],d0*.45)}
 else if(sp==='qshot'){ex+=d0*.35;sideD(tg[1],d0*.35);sideD(tg[2],d0*.35)}
 else if(sp==='lade'){if(c%2===0){ex+=d0*2;rest.forEach(function(t){sideD(t,d0*3)});fl('🏹 Ladeschuss','#ffd24a')}}
 else if(sp==='quer'){for(var q=0;q<2;q++){var r2=tg[Math.floor(Math.random()*tg.length)];if(r2===m)ex+=d0*.4;else sideD(r2,d0*.4)}}
 else if(sp==='blitz'){if(c===1){tg.forEach(function(t){t.__frz=1});fl('⚡ Blitzhände','#ffe14a')}}
 else if(sp==='drei'){if(c%3===0){ex+=d0*2;fl('👊 Dreifachgriff','#ffd24a')}}
 else if(sp==='zecho'){if(c%3===0){ex+=d0;fl('🔁 Zauberecho','#d070ff')}}
 else if(sp==='verb'){ex+=d0*.4}});
 ex+=d0*gR/100;return Math.round(ex)}
function gs(mech){var s=0;['hero','arc','mag'].forEach(function(w){try{if(!aliveA(w))return;var u=wUid(w);if(!u)return;var F=wfx(u);if(F)F.L.forEach(function(f){if(f.mech===mech)s+=f.v})}catch(e){}});return s}
var ARS={};
function armOf(w){var g=(w==='hero'?inventory.equipped:(ai()[w]||{}))||{},A={prot:0,elem:0,life:0,thorn:0,rheal:0,adodge:0,block:0,guard:0,cnt:0,gheal:0,sp:{}},any=false;
 AKT.concat(['shield','book']).forEach(function(t){var u=g[t];if(!u)return;var F=wfx(u);if(!F)return;any=true;F.L.forEach(function(f){if(f.mech==='protx')A.prot+=f.v*.5;else if(A[f.mech]!=null)A[f.mech]+=f.v});if(F.sp)A.sp[F.sp]=1});
 return any?A:null}
var ELM=['hexe','snowman','inferno','dragon1','dragon2','dragon3'];
window.__kamFightEnd=function(){ARS={};WC={}};
function teamSp(k){return ['hero','arc','mag'].some(function(w){try{if(!aliveA(w))return false;var A=armOf(w);return A&&A.sp[k]}catch(e){return false}})}
function goldBonus(){var s=0;try{worn().forEach(function(x){var F=wfx(x.i.id);if(F){F.L.forEach(function(f){if(f.mech==='gold')s+=f.v});if(F.sp==='dieb')s+=50}})}catch(e){}return s}
window.__kamArmHit=function(w,dmg,m){try{var A=armOf(w),gP=gemSum(w,'b'),gD=gemSum(w,'y');if((!A&&!gP&&!gD)||dmg<=0)return dmg;A=A||{prot:0,elem:0,life:0,thorn:0,rheal:0,adodge:0,block:0,guard:0,cnt:0,gheal:0,sp:{}};A.prot+=gP;A.adodge+=gD;var sp=A.sp;
 if(sp.bw&&!ARS[w+'bw']){ARS[w+'bw']=1;fl('🛡️ Bollwerk','#8fd8ff');return 0}
 if(Math.random()*100<Math.min(60,A.adodge)){fl('💨 Ausgewichen','#cfe');return 0}
 if(sp.spiegel&&Math.random()<.25){if(m)sideD(m,dmg);fl('🪞 Zurückgeworfen','#d0b0ff');return 0}
 var d=dmg;d*=1-Math.min(80,A.prot-(sp.verb?5:0))/100;
 var gd=0;['hero','arc','mag'].forEach(function(o){if(o===w)return;try{if(!aliveA(o))return;var B=armOf(o);if(B)gd+=B.guard}catch(e){}});if(gd>0)d*=1-Math.min(50,gd)/100;
 if(A.block>0&&Math.random()*100<Math.min(50,A.block)){d*=.5;fl('🛡️ Geblockt','#8fd8ff');if(A.cnt>0&&m&&Math.random()*100<Math.min(60,A.cnt)){sideD(m,meta.attack*.5);fl('⚔️ Gegenschlag','#ffd24a')}}
 if(m&&(m.isBoss||m.isWorldBoss||ELM.indexOf(m.baseType)>=0))d*=1-Math.min(80,A.elem)/100;
 if(A.life>0)d*=100/(100+A.life);
 if(sp.will){var mx=w==='hero'?meta.maxHp:(AH[w]&&AH[w].max)||1,cur=w==='hero'?meta.hp:(AH[w]&&AH[w].hp)||0;if(cur<mx*.3)d*=.75}
 var th=A.thorn+(sp.dorn?15:0);if(th>0&&m)sideD(m,d*th/100);
 return Math.max(1,Math.round(d))}catch(e){return dmg}};
function armRound(){var GH=0;['hero','arc','mag'].forEach(function(w){try{if(!aliveA(w))return;var A=armOf(w)||{rheal:0,gheal:0,sp:{}};var p=Math.min(A.rheal,15)/10+(A.sp.quell?3:0)+gemSum(w,'g');if(p>0)healAbs(w,(w==='hero'?meta.maxHp:(AH[w]&&AH[w].max)||50)*p/100);GH+=Math.min(A.gheal,15)/10+(A.sp.bheil?3:0)}catch(e){}});
 if(GH>0)['hero','arc','mag'].forEach(function(w){try{if(aliveA(w))healAbs(w,(w==='hero'?meta.maxHp:(AH[w]&&AH[w].max)||50)*GH/100)}catch(e){}})}

/* ---- Juwelen: Sockel statt Zufalls-Fähigkeiten ---- */
var GC={r:['Rubin','Angriff','#e53935','🔴'],g:['Smaragd','Leben','#43a047','🟢'],b:['Saphir','Schutz','#1e88e5','🔵'],y:['Topas','Ausweichen','#fdd835','🟡']},
 GV={r:[2,4,7,11,16],g:[.2,.4,.7,1.1,1.6],b:[2,3,5,8,12],y:[2,3,5,7,10]},GCAP={r:150,g:8,b:60,y:40},GTN=['Rau','Geschliffen','Fein','Prächtig','Makellos'],
 GSN={gruen:1,blau:2,episch:3,legendaer:4,mystisch:4};
function gemEns(){ens();inventory.gems=inventory.gems||{}}
function sockN(i){return GSN[i.rarity]||0}
function gmOf(uid){var n=inventory.inst&&inventory.inst[uid];if(!n)return [];var b=base(n.b);if(!b||SOCK.indexOf(b.type)<0)return [];var c=GSN[b.rarity]||0;if(!n.gm)n.gm=[];while(n.gm.length<c)n.gm.push(0);return n.gm}
function gv(k){return GV[k[0]][+k[1]-1]}
function gemSum(w,c){var g=gear(w)||{},s=0;try{for(var t in g){var u=g[t];if(!u)continue;gmOf(u).forEach(function(k){if(k&&k[0]===c)s+=gv(k)})}}catch(e){}return Math.min(GCAP[c],s)}
function gemTxt(k){var c=GC[k[0]],v=gv(k);return k[0]==='r'?'+'+v+'% Schaden':k[0]==='g'?'Heilt '+v+'% Leben pro Runde':k[0]==='b'?v+'% weniger Schaden':v+'% Ausweichen'}
function gemDot(k,sz){sz=sz||26;if(!k)return '<span style="display:inline-block;width:'+sz+'px;height:'+sz+'px;border-radius:50%;border:2px dashed #6a5a3a;box-sizing:border-box;vertical-align:middle"></span>';return '<span style="display:inline-block;position:relative;width:'+sz+'px;height:'+sz+'px;vertical-align:middle"><img src="items/gem_'+k+'.webp" alt="" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:screen">'+(sz>=22?'<b style="position:absolute;right:-2px;bottom:-2px;min-width:'+Math.round(sz*.38)+'px;height:'+Math.round(sz*.38)+'px;line-height:'+Math.round(sz*.38)+'px;border-radius:50%;background:#000c;color:#ffe9a0;font:700 '+Math.round(sz*.28)+'px Georgia;text-align:center">'+k[1]+'</b>':'')+'</span>'}
function gemName(k){return GTN[+k[1]-1]+'er '+GC[k[0]][0]}
window.__gemGive=function(c,t,n){gemEns();c=c||'rgby'[Math.floor(Math.random()*4)];var k=c+t;inventory.gems[k]=(inventory.gems[k]||0)+(n||1);try{saveInventory()}catch(e){}return ' +'+gemDot(k,16)+' '+GC[c][1]};
function gemTier(k,boss){var b=Math.min(5,1+Math.floor((k-1)/2));if(boss)return Math.random()<.7?b:Math.max(1,b-1);return k<4?1:k<7?(Math.random()<.5?1:2):Math.max(1,b-rnd(1,2))}
window.__gemLoot=function(kind,k){var m='';try{k=k||kk();
 if(kind==='boss'){m+=window.__gemGive(null,gemTier(k,1));if(Math.random()<.5)m+=window.__gemGive(null,gemTier(k,1))}
 else if(kind==='mon'){if(Math.random()<.1)m+=window.__gemGive(null,gemTier(k,0))}
 else{var P={wood:[.3,1,1],dia:[1,1,2],legend:[1,2,3],sin:[1,3,5]}[kind]||[0,1,1];if(Math.random()<P[0]){var t=rnd(P[1],P[2]);m+=window.__gemGive(null,t);if(kind==='sin'||kind==='legend')m+=window.__gemGive(null,Math.max(1,t-1))}}}catch(e){}return m};
window.__gemDot=gemDot;window.__gemName=gemName;
var GP=null;
function gemHtml(uid,info){var i=it(uid),n=sockN(i);if(!n)return '<div style="font-size:.72rem;color:#c8a070;text-align:center;margin:12px 0 2px">Normale Gegenstände haben keinen Sockel. Ab Grün: 1, Blau: 2, Lila: 3, Legendär: 4.</div>';
 var g=gmOf(uid),h='<div style="font-size:.6rem;color:#9a8cc0;letter-spacing:2px;margin:12px 0 4px">💎 SOCKEL</div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:6px">';
 g.forEach(function(k,j){h+='<span onclick="__gemSock(\''+uid+'\','+j+')" style="cursor:pointer">'+gemDot(k,48)+'</span>'});h+='</div>';
 g.forEach(function(k){if(k)h+='<div style="font-size:.66rem;color:'+GC[k[0]][2]+'">'+gemName(k)+': '+gemTxt(k)+'</div>'});
 if(GP&&GP.uid===uid){gemEns();var ks=Object.keys(inventory.gems).filter(function(x){return inventory.gems[x]>0}).sort();
  h+='<div style="border:1px solid #5a3f8a;border-radius:10px;padding:8px;margin-top:8px;background:#0007"><div style="font-size:.66rem;margin-bottom:6px">Juwel für Sockel '+(GP.j+1)+' wählen:</div>';
  if(!ks.length)h+='<div style="font-size:.65rem;color:#a08060">Du hast keine Juwelen. Bosse, Kisten und Monster lassen welche fallen.</div>';
  ks.forEach(function(k){h+='<div onclick="__gemIns(\''+uid+'\','+GP.j+',\''+k+'\')" style="display:flex;gap:8px;align-items:center;padding:5px;cursor:pointer;border-bottom:1px solid #ffffff14">'+gemDot(k,34)+'<span style="font-size:.68rem;flex:1">'+gemName(k)+' ×'+inventory.gems[k]+'<br><span style="opacity:.7">'+gemTxt(k)+'</span></span></div>'});h+='</div>'}
 else h+='<div style="font-size:.6rem;color:#a08060;text-align:center;margin-top:4px">Tippe auf einen Sockel, um ein Juwel einzusetzen oder zurückzunehmen.</div>';
 return h}
window.__gemSock=function(uid,j){var g=gmOf(uid);if(g[j]){gemEns();inventory.gems[g[j]]=(inventory.gems[g[j]]||0)+1;g[j]=0;GP=null;try{saveInventory()}catch(e){}}else GP={uid:uid,j:j};window.__kamInfo(uid)};
window.__gemIns=function(uid,j,k){gemEns();var g=gmOf(uid);if(!inventory.gems[k]||g[j])return;inventory.gems[k]--;g[j]=k;GP=null;try{saveInventory()}catch(e){}window.__kamInfo(uid)};
function gemCh(t){return Math.min(98,[90,75,60,45][t-1]+smithLv()*2)}
function gemForge(){var h='<div style="text-align:center;font-size:.75rem;margin-bottom:8px">💰 Gold: <b>'+(meta?meta.gold:0)+'</b></div><div style="font-size:.7rem;color:#c8a070;line-height:1.5;margin-bottom:8px">Rot = Angriff · Grün = Leben (Heilung) · Blau = Schutz · Gelb = Ausweichen.<br>Verschmelzen: 3 gleiche Juwelen werden 1 Juwel der nächsten Stufe. <b style="color:#ff9a8a">Es kann fehlschlagen, dann sind die 3 Juwelen kaputt und weg.</b> Umwandeln: gleiche Stufe, andere Farbe.</div>';gemEns();
 var ks=Object.keys(inventory.gems).filter(function(x){return inventory.gems[x]>0}).sort();
 if(!ks.length)h+='<div style="font-size:.72rem;color:#a08060;text-align:center;padding:14px">Du hast noch keine Juwelen.</div>';
 ks.forEach(function(k){var t=+k[1],cnt=inventory.gems[k],mc=150*t,cc=80*t;
  h+='<div style="border:1px solid #5a3f8a;border-radius:10px;padding:8px;margin-bottom:6px;background:#0007"><div style="display:flex;gap:8px;align-items:center">'+gemDot(k,40)+'<div style="flex:1;font-size:.72rem"><b style="color:'+GC[k[0]][2]+'">'+gemName(k)+'</b> ×'+cnt+'<div style="opacity:.75;font-size:.62rem">'+gemTxt(k)+'</div></div></div><div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">'+
  (t<5?'<button class="btn btn-sm" '+(cnt>=3&&meta&&meta.gold>=mc?'':'disabled ')+'onclick="__gemMerge(\''+k+'\')" style="font-size:.6rem">3→1 Stufe '+(t+1)+' · '+gemCh(t)+'% · '+mc+'💰</button>':'<span style="font-size:.6rem;color:#ff9800">MAX</span>')+
  'rgby'.split('').filter(function(c){return c!==k[0]}).map(function(c){return '<button class="btn btn-sm" '+(meta&&meta.gold>=cc?'':'disabled ')+'onclick="__gemConv(\''+k+'\',\''+c+'\')" style="font-size:.6rem">→'+GC[c][3]+' '+cc+'💰</button>'}).join('')+'</div></div>'});
 return h}
window.__gemMerge=function(k){gemEns();var t=+k[1],mc=150*t;if(t>=5||(inventory.gems[k]||0)<3||!meta||meta.gold<mc)return;meta.gold-=mc;inventory.gems[k]-=3;var n=k[0]+(t+1);if(Math.random()*100<gemCh(t)){inventory.gems[n]=(inventory.gems[n]||0)+1;FS.msg='💎 Gelungen! '+gemName(n)}else FS.msg='💥 Fehlgeschlagen. Die 3 Juwelen sind kaputt.';try{saveInventory();updateUI()}catch(e){}forgeUI()};
window.__gemConv=function(k,c){gemEns();var t=+k[1],cc=80*t;if((inventory.gems[k]||0)<1||!meta||meta.gold<cc)return;meta.gold-=cc;inventory.gems[k]--;var n=c+t;inventory.gems[n]=(inventory.gems[n]||0)+1;FS.msg='💎 Umgewandelt zu '+gemName(n);try{saveInventory();updateUI()}catch(e){}forgeUI()};
window.__kamInfo=function(uid){var i=it(uid);if(!i)return;var M=document.getElementById('kamInfo');
 if(!M){M=document.createElement('div');M.id='kamInfo';M.style.cssText='position:fixed;inset:0;z-index:100002;background:#000c;display:flex;align-items:center;justify-content:center;padding:16px';M.onclick=function(e){if(e.target===M)M.style.display='none'};document.body.appendChild(M)}
 var col=RARITY_COLOR[i.rarity],q=st(i);
 M.innerHTML='<div style="background:linear-gradient(145deg,#150a05,#251208);border:2px solid '+col+';border-radius:16px;padding:16px;max-width:380px;width:100%;max-height:88vh;overflow:auto;color:#ffe9c4;font-family:Georgia,serif"><div style="display:flex;gap:10px;align-items:center">'+itemIcon(i,52)+'<div><b style="color:'+col+'">'+i.name+'</b><div style="font-size:.65rem;color:#c8a070">'+RARITY_LABEL[i.rarity]+' · '+CN[i.c]+' · <span style="color:#ffd24a">'+stars(i)+'</span></div><div style="font-size:.7rem">'+descOf(i)+'</div></div></div>'+(SOCK.indexOf(i.type)>=0?gemHtml(uid,true):(efHtml(uid,false)||'<div style="font-size:.72rem;color:#c8a070;text-align:center;margin:12px 0 2px">Dieser Gegenstand hat keine Fähigkeit.</div>'))+(wearer(uid)?'<button class="btn btn-wide" style="width:100%;margin-top:12px" onclick="document.getElementById(\'kamInfo\').style.display=\'none\';equipItem(\''+uid+'\',\''+wearer(uid)+'\')">Ablegen</button>':'')+'<button class="btn btn-wide" style="width:100%;margin-top:8px" onclick="document.getElementById(\'kamInfo\').style.display=\'none\'">Schließen</button></div>';
 M.style.display='flex'};

/* ---- Schmiede ---- */
var FS={b:null,f:null,msg:''},EFLV=4;
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
 '<div style="position:sticky;top:-18px;z-index:5;display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:center;align-items:center;font-size:.78rem;margin:0 -6px 10px;padding:8px 6px;background:#150a05f2;border:1px solid #7a4a1a;border-radius:10px"><span>💰 <b style="color:#ffd24a">'+(meta.gold||0)+'</b></span><span>💎 <b style="color:#7fd8ff">'+(meta.diamonds||0)+'</b></span><span><img src="items/ore_silver.webp?v=1113" style="height:1.2em;vertical-align:-.25em" alt=""> <b>'+(inventory.iron||0)+'</b></span><span>'+oresStr()+'</span><span>'+oimg('blau')+' <b>'+(inventory.orbs.blau||0)+'</b></span><span>'+oimg('lila')+' <b>'+(inventory.orbs.lila||0)+'</b></span><span>'+oimg('orange')+' <b>'+(inventory.orbs.orange||0)+'</b></span></div>';
 if(FS.msg)h+='<div style="text-align:center;font-size:.8rem;padding:8px;margin-bottom:8px;border:1px solid #7a4a1a;border-radius:8px;background:#0006">'+FS.msg+'</div>';
 var cur=FS.mode||'star',md=cur==='eff';
 h+='<div style="display:flex;gap:6px;margin-bottom:10px">'+[['star','⚒️ Schmelzen'],['craft','🔨 Herstellen'],['eff','💎 Juwelen']].map(function(a){var on=a[0]===cur;return '<div onclick="__kamEM(\''+a[0]+'\')" style="flex:1;text-align:center;padding:7px;border-radius:10px;font-size:.75rem;cursor:pointer;border:2px solid '+(on?'#f0c040':'#7a4a1a')+';color:'+(on?'#000':'#ffe9c4')+';background:'+(on?'#f0c040':'#0006')+'">'+a[1]+'</div>'}).join('')+'</div>';
 if(cur==='craft'){h+=craftUI();h+='<button class="btn btn-wide" onclick="document.getElementById(\'kamForge\').style.display=\'none\'" style="width:100%;margin-top:10px">← ZURÜCK</button></div>';M.innerHTML=h;M.style.display='flex';return}
 if(md&&smithLv()<EFLV){h+='<div style="text-align:center;font-size:.8rem;line-height:1.6;padding:16px 8px">🔒 <b style="color:#f0c040">Juwelen-Schmiede</b><br>Hier verschmilzt und wandelst du Juwelen um.<br>Frei ab <b>Schmiede-Stufe '+EFLV+'</b> (dann kannst du auch Blau schmieden).<br>Du hast Stufe '+smithLv()+'. Baue die Schmiede in der Stadt aus.</div><button class="btn btn-wide" onclick="document.getElementById(\'kamForge\').style.display=\'none\'" style="width:100%;margin-top:10px">← ZURÜCK</button></div>';M.innerHTML=h;M.style.display='flex';return}
 if(md){h+=gemForge();h+='<button class="btn btn-wide" onclick="document.getElementById(\'kamForge\').style.display=\'none\'" style="width:100%;margin-top:10px">← ZURÜCK</button></div>';M.innerHTML=h;M.style.display='flex';return}
 if(!B){h+='<div style="font-size:.65rem;color:#c8a070;letter-spacing:2px;margin-bottom:6px">1. BASIS-ITEM WÄHLEN</div>';
  var n=0;sorted().forEach(function(i){n++;h+=card(i,'','__kamFB(\''+i.id+'\')',false)});
  if(!n)h+='<div style="font-size:.7rem;color:#a08060;text-align:center;padding:12px">Du hast noch keine Items zum Schmieden.</div>'}
 else{h+='<div style="font-size:.65rem;color:#c8a070;letter-spacing:2px;margin-bottom:6px">BASIS</div>'+card(B,'','__kamFB(null)',true)+
  (B.s<3?'<div style="font-size:.65rem;color:#c8a070;letter-spacing:2px;margin:8px 0 6px">2. GLEICHES ITEM ALS FUTTER (geht verloren)</div>':'');
  if(B.s<3){var cands=sorted().filter(function(x){return x.bid===B.bid&&x.s===B.s&&x.id!==B.id&&!wearer(x.id)});
   if(F){h+=card(F,'','__kamFF(null)',true)}else if(!cands.length)h+='<div style="font-size:.7rem;color:#a08060;padding:8px">Du brauchst ein zweites gleiches Item mit gleich vielen Sternen (nicht angelegt).</div>';
   else cands.forEach(function(x){h+=card(x,'','__kamFF(\''+x.id+'\')',false)})}
  if(F&&B.s<3){var cr=condResult(B,F),ok=(inventory.iron||0)>=cost(B);
   h+='<div style="font-size:.75rem;margin:10px 0;line-height:1.5;text-align:center">Erfolg: <b>'+chance(B)+'%</b> (Schmiede +'+smithLv()*2+'%)<br>Kosten: <img src="items/ore_silver.webp" style="height:1.15em;vertical-align:-.25em" alt=""> '+cost(B)+'<br>'+(cr.perf?'Perfekt-Chance: <b style="color:#ffd24a">'+cr.perf+'%</b>':'Zustand wird '+CN[cr.base])+'<br><span style="color:#ff9a8a">Bei Fehlschlag geht das Futter verloren.</span></div>'+
   '<button class="btn btn-wide" '+(ok?'':'disabled ')+'onclick="__kamDoForge()" style="width:100%">'+(ok?'⚒️ SCHMELZEN':'Zu wenig Eisenbarren')+'</button>'}
  if(B.s>=3){var nb=nextBase(B),oc=orbFor(B);
   h+='<div style="font-size:.75rem;margin:10px 0;text-align:center;line-height:1.5">★★★ Voll ausgebaut.<br>'+(nb?'Aufwerten zu <b style="color:'+RARITY_COLOR[nb.rarity]+'">'+nb.name+'</b> mit '+ORB[oc][2]+' '+ORB[oc][1]+' (du hast '+(inventory.orbs[oc]||0)+')':(B.rarity==='normal'?'Normale Items kannst du nur durch Schmelzen verbessern.':'Höher geht es nicht.'))+'</div>'+
   (nb&&smithLv()<UPLV[B.rarity]?'<div style="text-align:center;font-size:.72rem;color:#ff9a8a;margin-bottom:6px">🔒 Schmiede Stufe '+UPLV[B.rarity]+' nötig für '+UPN[B.rarity]+' (du hast Stufe '+smithLv()+'). Baue die Schmiede in der Stadt aus.</div>':'')+(nb?'<button class="btn btn-wide" '+((inventory.orbs[oc]||0)>0&&smithLv()>=UPLV[B.rarity]?'':'disabled ')+'onclick="__kamDoUp()" style="width:100%">'+(smithLv()<UPLV[B.rarity]?'Schmiede zu niedrig':(inventory.orbs[oc]||0)>0?'✨ AUFWERTEN':'Kugel fehlt')+'</button>':'')}}
 h+='<button class="btn btn-wide" onclick="document.getElementById(\'kamForge\').style.display=\'none\'" style="width:100%;margin-top:10px">← ZURÜCK</button></div>';
 M.innerHTML=h;M.style.display='flex'}
function prevOf(x){var r=RANK.indexOf(x.rarity);if(r<1)return null;return ITEMS.filter(function(y){return !y.m&&!y.fx&&y.type===x.type&&(y.cls||'')===(x.cls||'')&&(y.sk||'')===(x.sk||'')&&y.rarity===RANK[r-1]})[0]||null}
function recipe(x){var p=prevOf(x),r=RANK.indexOf(x.rarity);if(!p)return{iron:100,mat:0};var n={gruen:5,blau:3,episch:2,legendaer:1,mystisch:1}[x.rarity]||1;return{iron:0,mat:n,from:p,ore:{gruen:'green',blau:'blue',episch:'purple',legendaer:'gold',mystisch:'red'}[x.rarity]||null,on:10,lv:0}}
function mats(p){return inventory.items.filter(function(u){var n=inventory.inst[u];return n&&n.b===p.id&&!n.s&&!wearer(u)}).sort(function(a,b){return inventory.inst[a].c-inventory.inst[b].c})}
function oresStr(){var o=inventory.ores||{},t='';['green','blue','purple','gold','red'].forEach(function(k){t+=oreI(k)+' <b>'+(o[k]||0)+'</b> &nbsp; '});return t}
function oreI(k){return '<img src="items/ore_'+k+'.webp" style="height:1.15em;vertical-align:-.25em" alt="">'}
function craftUI(){var h=jobsUI()+'<div style="font-size:.68rem;color:#c8a070;text-align:center;margin-bottom:8px;line-height:1.5">Stelle Ausrüstung her. Das dauert je nach Seltenheit: Normal 1 Min · Grün 5 Min · Blau 15 Min · Lila 45 Min · Legendär 2 Std · Mystisch 6 Std. Es laufen bis zu 3 Aufträge gleichzeitig. Der Zustand (Gebraucht, Wie neu, Perfekt) ist zufällig.<br>Normal: <img src="items/ore_silver.webp" style="height:1.15em;vertical-align:-.25em" alt=""> 100 · Grün: 5× Normal · Blau: 3× Grün · Lila: 2× Blau · Legendär: 1× Lila · Mystisch: 1× Legendär<br>Zusätzlich brauchst du 10 Barren der Farbe: Grün = grüne, Blau = blaue, Lila = lila, Legendär = goldene, Mystisch = rote. Die produziert deine Schmiede in der Stadt (grün ab Stufe 2, blau ab 3, lila ab 5, gold ab 7, rot ab 9).</div>';
 if(FS.msg)h+='<div style="text-align:center;font-size:.8rem;padding:8px;margin-bottom:8px;border:1px solid #7a4a1a;border-radius:8px;background:#0006">'+FS.msg+'</div>';
 var NMR={normal:'Normal',gruen:'Grün',blau:'Blau',episch:'Lila (Episch)',legendaer:'Legendär',mystisch:'Mystisch'};
 ['normal','gruen','blau','episch','legendaer','mystisch'].forEach(function(rar){var L=ITEMS.filter(function(x){return x.rarity===rar&&!x.m&&!x.fx});if(!L.length)return;
  h+='<div style="margin:10px 0 4px;font-weight:800;font-size:.75rem;color:'+RARITY_COLOR[rar]+'">📦 '+NMR[rar]+'</div>';
  L.forEach(function(x){var rc=recipe(x),have=rc.mat?mats(rc.from).length:0,ok,txt;
   if(rc.mat){txt=rc.mat+'× '+rc.from.name+' ('+have+')'+(rc.ore?' + '+oreI(rc.ore)+' '+rc.on+' ('+((inventory.ores||{})[rc.ore]||0)+')':'');ok=have>=rc.mat&&(!rc.ore||((inventory.ores||{})[rc.ore]||0)>=rc.on)}
   else{txt='<img src="items/ore_silver.webp" style="height:1.15em;vertical-align:-.25em" alt=""> '+rc.iron+' Eisenbarren ('+(inventory.iron||0)+')';ok=(inventory.iron||0)>=rc.iron}
   h+='<div style="display:flex;align-items:center;gap:8px;border:1px solid #4a2c10;border-radius:8px;padding:5px;margin-bottom:4px;background:#0006"><img src="'+ico(x.id)+'" style="width:34px;height:34px;object-fit:contain"><div style="flex:1;font-size:.64rem;line-height:1.35"><b style="color:'+RARITY_COLOR[x.rarity]+'">'+x.name+'</b> <span style="opacity:.7">· ⏱ '+fmtT(FT[x.rarity]||60)+'</span><br>'+txt+(rc.lv&&smithLv()<rc.lv?'<br><span style="color:#ff9a8a">🔒 Schmiede Stufe '+rc.lv+'</span>':'')+'</div><button class="btn btn-sm" '+(ok?'':'disabled ')+'onclick="__kamCraft(\''+x.id+'\')">HERSTELLEN</button></div>'})});
 return h}
var FT={normal:60,gruen:300,blau:900,episch:2700,legendaer:7200,mystisch:21600},FSLOTS=3;
function fmtT(sec){sec=Math.max(0,Math.ceil(sec));var h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s2=sec%60;return h?h+' Std '+m+' Min':m?m+' Min '+('0'+s2).slice(-2)+' S':s2+' Sek'}
function fjobs(){ens();return inventory.fjobs=inventory.fjobs||[]}
window.__kamCraft=function(id){ens();var x=ITEMS.find(function(y){return y.id===id});if(!x)return;var rc=recipe(x);
 if(fjobs().length>=FSLOTS){FS.msg='Alle '+FSLOTS+' Schmiedeplätze sind belegt. Hole fertige Aufträge ab oder warte.';forgeUI();return}
 if(rc.mat){var m=mats(rc.from);if(m.length<rc.mat||(rc.ore&&((inventory.ores||{})[rc.ore]||0)<rc.on))return;m.slice(0,rc.mat).forEach(function(u){delete inventory.inst[u];inventory.items.splice(inventory.items.indexOf(u),1)});if(rc.ore)inventory.ores[rc.ore]-=rc.on}
 else{if((inventory.iron||0)<rc.iron)return;inventory.iron-=rc.iron}
 var d=(FT[x.rarity]||60)*1000,n=Date.now();fjobs().push({id:x.id,st:n,end:n+d});
 FS.msg='🔨 Auftrag gestartet: <b style="color:'+RARITY_COLOR[x.rarity]+'">'+x.name+'</b> · fertig in '+fmtT(d/1000);try{window.__kamLogR('Schmiede gestartet: '+x.name+' ('+fmtT(d/1000)+')')}catch(e){}saveInventory();forgeUI()};
window.__kamCollect=function(i){var j=fjobs()[i];if(!j||Date.now()<j.end)return;var x=ITEMS.find(function(y){return y.id===j.id});fjobs().splice(i,1);if(!x){saveInventory();forgeUI();return}
 var c=Math.floor(Math.random()*3);give(x.id,c);bump('crafted');if(c===2)bump('craftPerf');
 FS.msg='🔨 Hergestellt: <b style="color:'+RARITY_COLOR[x.rarity]+'">'+x.name+'</b> · <b style="color:'+CC[c]+'">'+CN[c]+'</b>';try{window.__kamLogR('Geschmiedet: '+x.name+' ('+CN[c]+')')}catch(e){}saveInventory();forgeUI();try{window.__kamInfoTab()}catch(e){}};
window.__kamSpeed=function(i){var j=fjobs()[i];if(!j)return;var rest=(j.end-Date.now())/1000;if(rest<=0)return;var c=Math.max(1,Math.ceil(rest/600));if(!meta||(meta.diamonds||0)<c){FS.msg='Zu wenig Diamanten ('+c+' nötig).';forgeUI();return}
 meta.diamonds-=c;try{if(typeof globalDiamonds!=='undefined'){globalDiamonds-=c;saveDiamonds(globalDiamonds)}else localStorage.setItem('robDiamonds',String(meta.diamonds))}catch(e){}j.end=Date.now();saveInventory();try{updateUI()}catch(e){}forgeUI()};
function jobsUI(){var J=fjobs(),h='<div id="kamFJ" style="border:2px solid #7a4a1a;border-radius:10px;padding:8px;margin-bottom:10px;background:#1a0d06"><div style="color:#ffd24a;font-weight:800;font-size:.75rem;margin-bottom:4px">⚒️ SCHMIEDE-AUFTRÄGE ('+J.length+'/'+FSLOTS+')</div>';
 if(!J.length)h+='<small style="opacity:.7">Kein Auftrag läuft. Starte unten ein Herstellen, es dauert je nach Seltenheit von 1 Minute bis 6 Stunden und läuft auch weiter, wenn du das Spiel schließt.</small>';
 J.forEach(function(j,i){var x=ITEMS.find(function(y){return y.id===j.id})||{name:j.id,rarity:'normal'},rest=(j.end-Date.now())/1000,tot=(j.end-j.st)/1000,pc=Math.min(100,Math.max(0,100-rest/tot*100));
  h+='<div style="display:flex;align-items:center;gap:8px;margin:5px 0"><img src="'+ico(x.id)+'" style="width:34px;height:34px;object-fit:contain"><div style="flex:1;font-size:.66rem"><b style="color:'+RARITY_COLOR[x.rarity]+'">'+x.name+'</b><div style="height:6px;background:#222;border-radius:3px;margin:3px 0;overflow:hidden"><i data-bar="'+i+'" style="display:block;height:100%;width:'+pc+'%;background:#ffb020"></i></div><span data-end="'+j.end+'" data-st="'+j.st+'" data-i="'+i+'">'+(rest>0?'⏳ '+fmtT(rest):'✅ Fertig')+'</span></div>'
  +(rest>0?'<button class="btn btn-sm" style="font-size:.58rem;padding:3px 6px" onclick="__kamSpeed('+i+')">⚡ '+Math.max(1,Math.ceil(rest/600))+'💎</button>':'<button class="btn btn-sm" onclick="__kamCollect('+i+')">ABHOLEN</button>')+'</div>'});
 return h+'</div>'}
function jobTick(){var els=document.querySelectorAll('#kamFJ [data-end]');if(!els.length){return}var fin=false;els.forEach(function(e){var rest=(+e.dataset.end-Date.now())/1000;if(rest<=0){if(e.textContent.indexOf('Fertig')<0)fin=true}else{e.textContent='⏳ '+fmtT(rest);var bar=document.querySelector('#kamFJ [data-bar="'+e.dataset.i+'"]');if(bar)bar.style.width=Math.min(100,100-rest/((+e.dataset.end-+e.dataset.st)/1000)*100)+'%'}});if(fin)forgeUI()}
setInterval(jobTick,1000);
window.__kamJobs=function(){return fjobs().map(function(j){var x=ITEMS.find(function(y){return y.id===j.id})||{name:j.id,rarity:'normal'};return {id:j.id,name:x.name,col:RARITY_COLOR[x.rarity],ico:ico(x.id),st:j.st,end:j.end}})};
window.__kamEM=function(m){FS.mode=m;FS.msg='';forgeUI()};
window.__kamEB=function(u){FS.eb=u;FS.msg='';forgeUI()};
window.__kamEL=function(j){var n=efOf(FS.eb);if(!n||smithLv()<EFLV)return;n.k[j]=n.k[j]?0:1;saveInventory();forgeUI()};
window.__kamER=function(){var n=efOf(FS.eb);if(!n||smithLv()<EFLV)return;var b=base(n.b),c=efCost(n,b);if(!n.e.length||n.k.every(Boolean)||!meta||meta.gold<c)return;
 meta.gold-=c;n.ro=(n.ro||0)+1;n.e=n.e.map(function(x,j){return n.k[j]?x:ne(b.type,b.rarity)});FS.msg='🎲 Neu gewürfelt';saveInventory();try{updateUI()}catch(e){}forgeUI()};
window.__kamEU=function(j){var n=efOf(FS.eb);if(smithLv()<EFLV||!n||!n.e[j]||n.e[j].q>=3)return;var c=upCost(n.e[j]);if(!meta||meta.gold<c)return;
 meta.gold-=c;n.e[j].q++;n.e[j].p=qv(n.e[j].q);saveInventory();try{updateUI()}catch(e){}forgeUI()};
window.__kForge=function(){FS={b:null,f:null,msg:'',mode:FS.mode,eb:null};forgeUI()};
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


(function(){var st=document.createElement('style');st.textContent='body #runHero{left:104px!important;bottom:10px!important;width:65px!important;max-width:65px!important;z-index:5!important}body #runHero img{height:auto!important;object-fit:contain!important}';document.head.appendChild(st)})();
/* ---------- Eigene Lebensleisten ---------- */
var AH={arc:{hp:0,max:0},mag:{hp:0,max:0}},wasF=false;
var PATT={wolf:'double',snake:'back',spider:'back',hexe:'back',inferno:'all'};
function aMax(id){var base=Math.max(10,(meta&&meta.maxHp||20)-window.__kamHG().hp);return Math.max(10,Math.round(base*.8)+(id?window.__kamAGH(id):0))}
window.__kamAMax=aMax;
function aInit(force){['arc','mag'].forEach(function(k){var m=aMax(k),a=AH[k];if(force||!a.max){a.max=m;a.hp=m}else if(a.max!==m){a.hp=Math.round(a.hp/a.max*m);a.max=m}})}
function onTeam(id){return id==='hero'||allyList().some(function(a){return a.id===id})}
function aliveA(id){if(id==='hero')return meta&&meta.hp>0;if(!AH[id]||!AH[id].max)aInit();return AH[id].hp>0}
function teamAlive(){return SLT.filter(function(id){return onTeam(id)&&aliveA(id)})}
window.__kamTeamUp=function(){return teamAlive().some(function(id){return id!=='hero'})};
window.__kamRoute=function(md,m){
 try{aInit();var al=teamAlive();if(!al.length)return md;
  var pat=(m&&(m.isBoss||m.isWorldBoss))?'all':(PATT[m&&m.baseType]||'front'),tg;
  function pick(a){return a[Math.floor(Math.random()*a.length)]}
  if(pat==='all')tg=al.map(function(id){return[id,Math.max(1,Math.round(md*.7))]});
  else if(pat==='double'){var c=al.slice(),t=[];while(c.length&&t.length<2){var x=pick(c);c.splice(c.indexOf(x),1);t.push(x)}tg=t.map(function(id){return[id,Math.max(1,Math.round(md*.7))]})}
  else if(pat==='back'){var b=al.filter(function(id){return SLT.indexOf(id)>0});tg=[[b.length?pick(b):al[0],md]]}
  else tg=[[al[0],md]];
  var hd=0;tg.forEach(function(x){if(window.__kamArmHit)x[1]=window.__kamArmHit(x[0],x[1],m);if(x[0]==='hero')hd+=x[1];else AH[x[0]].hp=Math.max(0,AH[x[0]].hp-x[1])});
  return hd}catch(e){return md}};
var oAtk2=window.attack;
if(oAtk2)window.attack=function(){var down=meta&&meta.hp<=0&&window.__kamTeamUp(),sv=meta&&meta.attack;if(down)meta.attack=0;
 try{return oAtk2.apply(this,arguments)}finally{if(down)setTimeout(function(){meta.attack=sv},60)}};
(function(){
 var st=document.createElement('style');
 st.textContent='body.khd #runImg{filter:grayscale(1) brightness(.45)!important;transform:rotate(-90deg) translate(0,-6px)!important;transform-origin:50% 100%;animation:none!important}#kamAl img.dn{filter:grayscale(1) brightness(.45)!important;transform:rotate(-90deg) translate(0,-4px);transform-origin:50% 100%}.kbar{position:absolute;width:46px;height:6px;border-radius:4px;background:#000a;border:1px solid #fff4;overflow:hidden;z-index:30;pointer-events:none}.kbar.kf{width:50px}#kamBig{position:absolute;top:6px;left:50%;width:min(86%,300px);height:18px;transform:translateX(-50%);background:#000b;border:2px solid #b8862b;border-radius:10px;z-index:31;overflow:hidden;pointer-events:none}#kamBig i{display:block;height:100%;background:linear-gradient(#ff5a4a,#b3201a);transition:width .25s}#kamBig b{position:absolute;inset:0;text-align:center;font:700 11px/18px system-ui;letter-spacing:.1em;color:#fff;text-shadow:0 1px 2px #000}body.kamfight #battleScene .monster-hp{display:none!important}body.kamfight #fightHud{display:none!important}.kbar i{display:block;height:100%;transition:width .25s}';
 document.head.appendChild(st);
 function bar(id){var e=document.getElementById('kb_'+id),w=document.getElementById('sceneWrap');if(!e&&w){e=document.createElement('div');e.id='kb_'+id;e.className='kbar';e.innerHTML='<i></i>';w.appendChild(e)}return e}
 function enemyBars(f){var w=document.getElementById('sceneWrap');if(!w)return;var ms=(f&&monstersInFight)||[],wr=w.getBoundingClientRect(),bossM=null;
  for(var i=0;i<3;i++){var e=document.getElementById('kmb'+i),m=ms[i],big=m&&(m.isBoss||m.isWorldBoss||/dragon/.test(m.baseType||''));if(big&&!bossM)bossM=m;
   if(!m||big){if(e)e.style.display='none';continue}
   var im=document.getElementById('mimg'+i);if(!im){if(e)e.style.display='none';continue}
   if(!e){e=document.createElement('div');e.id='kmb'+i;e.className='kbar kf';e.innerHTML='<i></i>';w.appendChild(e)}
   var r=im.getBoundingClientRect();e.style.display='block';e.style.left=(r.left-wr.left+r.width/2-23)+'px';e.style.top=(r.top-wr.top-8)+'px';e.style.bottom='auto';
   var pc=Math.max(0,Math.min(100,m.hp/m.maxHp*100)),b=e.firstChild;b.style.width=pc+'%';b.style.background='#e04a3a'}
  var B=document.getElementById('kamBig');if(!bossM){if(B)B.style.display='none';return}
  if(!B){B=document.createElement('div');B.id='kamBig';B.innerHTML='<i></i><b></b>';w.appendChild(B)}
  B.style.display='block';B.firstChild.style.width=Math.max(0,Math.min(100,bossM.hp/bossM.maxHp*100))+'%';
  var nm='';try{nm=bossM.isWorldBoss?('BOSS '+bossM.bossNum):(MONSTER_NAMES[bossM.type]||'BOSS')}catch(e){nm='BOSS'}B.lastChild.textContent=nm+'  '+Math.max(0,Math.round(bossM.hp))+' / '+bossM.maxHp}
 setInterval(function(){
  var f=false;try{f=!!(inFight&&meta&&document.getElementById('kam'))}catch(e){}
  if(f){aInit();var hd=meta.hp<=0&&window.__kamTeamUp();document.body.classList.toggle('khd',hd);
   var ids=['hero'].concat(allyList().map(function(a){return a.id}));
   ['hero','arc','mag'].forEach(function(id){var e=bar(id);if(!e)return;if(ids.indexOf(id)<0){e.style.display='none';return}
    var p=POS(id),W={hero:65,arc:112,mag:132}[id],cur=id==='hero'?Math.max(0,meta.hp):AH[id].hp,mx=id==='hero'?meta.maxHp:AH[id].max,pc=Math.max(0,Math.min(100,cur/mx*100));
    e.style.display='block';e.style.left=(p.l+W/2-23)+'px';e.style.bottom=(p.b+94)+'px';var i=e.firstChild;i.style.width=pc+'%';i.style.background=pc>50?'#3fd16a':pc>25?'#e8c33a':'#e04a3a'});
   allyList().forEach(function(a){var im=document.getElementById('kal_'+a.id);if(im)im.classList.toggle('dn',AH[a.id].hp<=0)})}
  try{enemyBars(f)}catch(e){}
  if(!f){document.body.classList.remove('khd');document.querySelectorAll('.kbar').forEach(function(e){e.remove()})}
  if(wasF&&!f&&meta){var rv=function(c,m){return Math.max(1,Math.round(m*.25))};if(meta.hp<=0&&meta.hp<meta.maxHp)meta.hp=rv(0,meta.maxHp);['arc','mag'].forEach(function(k){if(AH[k].hp<=0)AH[k].hp=rv(0,AH[k].max||aMax(k))});try{updateUI()}catch(e){}}
  if(wasF&&!f&&window.__kamFightEnd)window.__kamFightEnd();
  wasF=f},200);
})();

/* ---------- Startbild: Held, Werte, Offline-Hinweis ---------- */
(function(){
  var st=document.createElement('style');
  st.textContent='#loginBox h1{margin-top:40px!important}#loginBox .hero-select,#loginBox>p{display:none!important}#kamStart{display:flex;flex-direction:column;align-items:center;gap:8px;margin:6px 0 14px}#kamStart img{width:150px;max-height:190px;object-fit:contain;filter:drop-shadow(0 8px 10px #000)}#kamStart .sn{color:#f0c040;font-weight:800;letter-spacing:2px;font-size:1.05rem}#kamStart .sl{color:#ffe9c4;font-size:.75rem;opacity:.85}#kamStart .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%}#kamStart .sg div{background:#0006;border:1px solid #7a4a1a;border-radius:10px;padding:6px 2px;font-size:.62rem;color:#ffe9c4;text-align:center}#kamStart .sg b{display:block;font-size:.85rem;color:#f0c040;margin-top:2px}#kamStart .so{width:100%;box-sizing:border-box;border-radius:10px;padding:8px 10px;font-size:.7rem;text-align:center;border:1px solid}#kamStart .so.off{color:#bbb;border-color:#555;background:#0004}#kamStart .so.on{color:#9dffb5;border-color:#3fbf68;background:#06200f88}#kamStart .so.rd{color:#ffd24a;border-color:#ffd24a;background:#3a2a0a88}';
  document.head.appendChild(st);
  function num(k){try{return parseInt(localStorage.getItem(k)||'0')||0}catch(e){return 0}}
  function refresh(){
    var o=document.getElementById('loginOverlay'),box=document.getElementById('loginBox');
    if(!o||!box||o.style.display==='none')return;
    var card=document.querySelector('.hero-card.selected')||document.querySelector('.hero-card');if(!card)return;
    var p=document.getElementById('kamStart');
    if(!p){p=document.createElement('div');p.id='kamStart';var h1=box.querySelector('h1'),ref=h1&&h1.nextSibling;box.insertBefore(p,box.querySelector('.hero-select')||ref)}
    var ci=card.querySelector('img'),mb=0;try{mb=(inventory&&inventory.stats&&inventory.stats.maxBoss)||0}catch(e){}
    var oi={tower:0},ot,oc;try{if(window.__cityOffInfo)oi=window.__cityOffInfo()||oi}catch(e){}
    if(!oi.tower){oc='off';ot='Offline-Modus: nicht aktiv (Magieturm fehlt)'}
    else if(oi.ready){oc='rd';ot='Offline-Modus: aktiv · Beute wartet auf dich'}
    else{oc='on';ot='Offline-Modus: aktiv · nichts zu holen'}
    var lv=card.querySelector('.hlevel');
    p.innerHTML='<img src="'+(ci?ci.src:'')+'"><div class="sn">'+(card.querySelector('.hname')?card.querySelector('.hname').textContent:'')+'</div><div class="sl">'+(lv?lv.textContent:'')+'</div>'+
     '<div class="sg"><div>Gold<b>'+num('robGold')+'</b></div><div>Diamanten<b>'+num('robDiamonds')+'</b></div><div>Beste Kammer<b>'+Math.max(1,mb)+'</b></div></div><div class="so '+oc+'">'+ot+'</div>'}
  function safe(){try{refresh()}catch(e){try{console.log('kamStart',e.message)}catch(x){}}}
  setInterval(safe,700);setTimeout(safe,300);
})();

/* ---------- Angriffsleiste: wer ist dran ---------- */
(function(){
  var S=28,G=4,Q=[],key='',cnt=0,bar=null;
  var st=document.createElement('style');
  st.textContent='#kamTurn{position:absolute;top:62px;left:50%;height:'+(S+8)+'px;margin-left:0;background:#000b;border:1px solid #6a4a20;border-radius:20px;z-index:7;pointer-events:none;transform:translateX(-50%);transition:width .3s}'+
   '#kamTurn .th{position:absolute;top:3px;width:'+S+'px;height:'+S+'px;border-radius:50%;border:2px solid;overflow:hidden;background:#1a1226;transition:left .4s cubic-bezier(.4,0,.2,1),transform .25s,box-shadow .25s,opacity .3s}'+
   '#kamTurn .th img{position:absolute;display:block;max-width:none}'+
   '#kamTurn .th.a{border-color:#4ade80}#kamTurn .th.f{border-color:#ef4444}#kamTurn .th.on{transform:scale(1.18);box-shadow:0 0 10px #ffd24a;border-color:#ffd24a;z-index:2}';
  document.head.appendChild(st);
  var CR={hero:['run0.png',155,200,[25,0,110,110]],arc:['ally/arc_i0.webp',307,256,[130,35,120,120]],mag:['ally/mag_i0.webp',384,256,[180,60,110,110]]};
  function head(id,side,src){
    var d=document.createElement('div');d.className='th '+side;var im=document.createElement('img'),c=CR[id];
    if(c){var k=(S-4)/c[3][2];im.src=c[0];im.style.width=(c[1]*k)+'px';im.style.left=(-c[3][0]*k)+'px';im.style.top=(-c[3][1]*k)+'px'}
    else{im.src=src;im.style.cssText='width:100%;height:100%;left:0;top:0;object-fit:cover;object-position:35% 12%'}
    d.appendChild(im);return d}
  function lay(){if(!bar)return;Q.forEach(function(q,i){q.e.style.left=(5+i*(S+G))+'px';q.e.classList.toggle('on',i===0)});bar.style.width=(10+Q.length*(S+G)-G)+'px'}
  function sync(){
    var w=document.getElementById('sceneWrap'),on=inFight&&monstersInFight&&monstersInFight.length&&w&&document.getElementById('kam');
    if(!on){if(bar){bar.remove();bar=null;Q=[];key=''}return}
    var L=allyList(),ms=[].slice.call(document.querySelectorAll('#battleScene .monster-slot img')),k=['hero'].concat(L.map(function(a){return a.id})).join(',')+'|'+ms.length+'|'+monstersInFight.length;
    if(bar&&k===key&&bar.parentNode===w)return;
    key=k;if(bar)bar.remove();bar=document.createElement('div');bar.id='kamTurn';w.appendChild(bar);Q=[];
    var ids=['hero'].concat(L.map(function(a){return a.id}));
    ids.forEach(function(id){var e=head(id,'a');bar.appendChild(e);Q.push({id:id,e:e,side:'a'})});
    ms.forEach(function(m,j){var e=head(null,'f',m.src);bar.appendChild(e);Q.push({id:'m'+j,e:e,side:'f'})});
    lay()}
  function go(id){var j=Q.findIndex(function(q){return q.id===id});if(j<0)return;var q=Q.splice(j,1)[0];Q.push(q);lay()}
  setInterval(sync,250);
  var oA=window.attack;
  if(oA)window.attack=function(){
    try{sync();var ids=Q.filter(function(q){return q.side==='a'}).map(function(q){return q.id}),ms=Q.filter(function(q){return q.side==='f'}).map(function(q){return q.id});
      ids.forEach(function(id,n){setTimeout(function(){go(id)},60+n*230)});
      ms.forEach(function(id,n){setTimeout(function(){go(id)},60+ids.length*230+250+n*230)})}catch(e){}
    return oA.apply(this,arguments)};
})();

/* ---------- Tod: Held verpufft, Strecke faellt nach unten, Held springt am Start wieder rein ---------- */
(function(){
  var st=document.createElement('style');
  st.textContent='body.kdead #runImg{animation:kpoof 1s ease-in forwards!important;transform-origin:50% 100%}'+
   '@keyframes kpoof{0%{transform:none;filter:brightness(1);opacity:1}15%{transform:translateX(4px);filter:brightness(3) saturate(0)}28%{transform:translateX(-4px);filter:brightness(1)}60%{transform:scale(1.05,.95);filter:brightness(2.5) hue-rotate(40deg);opacity:.8}100%{transform:scale(.1,1.8) translateY(-60px);filter:brightness(4);opacity:0}}'+
   'body.kdead #sceneWrap{animation:kredp 1s ease-out forwards}@keyframes kredp{0%{box-shadow:inset 0 0 70px 18px #000}40%{box-shadow:inset 0 0 120px 40px #a00}100%{box-shadow:inset 0 0 120px 60px #500}}'+
   '#kamFade{position:fixed;inset:0;background:#000;opacity:0;z-index:99998;pointer-events:none;transition:opacity .3s ease}'+
   'body.kfall #kamHero{opacity:0}'+
   'body.kjump #kamHero .up{animation:kjump .75s cubic-bezier(.3,.7,.4,1) both!important;transform-origin:50% 100%}'+
   '@keyframes kjump{0%{transform:translateY(-320px) scale(.7,1.3);opacity:0}15%{opacity:1}60%{transform:translateY(0) scale(1.2,.75)}78%{transform:translateY(-26px) scale(.95,1.08)}100%{transform:none}}'+
   '.kwr{position:fixed;width:110px;height:30px;margin:-15px 0 0 -55px;border-radius:50%;border:3px solid #c9a3ff;box-shadow:0 0 16px #a66bff,inset 0 0 12px #a66bff;pointer-events:none;z-index:99997;animation:kwring .6s ease-out forwards}'+
   '@keyframes kwring{0%{opacity:0;transform:scale(.3)}30%{opacity:1}100%{opacity:0;transform:scale(1.8)}}';
  document.head.appendChild(st);
  var oSD=window.showDeath;
  window.showDeath=function(){
    try{var G=JSON.parse(localStorage.getItem('robGM')||'null');if(G){localStorage.removeItem('robGM');var ern=Math.max(0,(meta.gold||0)-(G.g||0)),bo=ern*(G.m-1);if(bo>0){meta.gold+=bo;try{localStorage.setItem('robGold',String(meta.gold))}catch(e){}try{log('🪙 Golddieb x'+G.m+': +'+bo+' Gold')}catch(e){}}}}catch(e){}
    document.body.classList.add('kdead');
    var a=arguments;setTimeout(function(){try{oSD&&oSD.apply(window,a)}catch(e){}},1100)};
  var oRS=window.respawn;
  window.respawn=function(){
    var f=document.getElementById('kamFade');if(!f){f=document.createElement('div');f.id='kamFade';document.body.appendChild(f)}
    f.style.opacity='1';var a=arguments;
    setTimeout(function(){
      var B=document.body;B.classList.add('kfall');
      try{oRS&&oRS.apply(window,a)}catch(e){}
      try{aInit(true)}catch(e){}
      B.classList.remove('kdead');
      var W=document.getElementById('kamWorld'),to=W&&W.style.transform;
      if(W&&to){
        var hi=(typeof ROWS!=='undefined'?ROWS:20)*(typeof STEP!=='undefined'?STEP:60)*.8;
        W.style.transition='none';W.style.transform=to.replace(/translateY\([^)]*\)/,'translateY('+hi+'px)');
        void W.offsetWidth;
        setTimeout(function(){f.style.opacity='0';W.style.transition='transform 1.6s cubic-bezier(.5,0,.35,1)';W.style.transform=to},80);
        setTimeout(function(){
          W.style.transition='';
          var h=document.getElementById('kamHero'),r=h&&h.getBoundingClientRect();
          B.classList.remove('kfall');B.classList.add('kjump');
          if(r&&r.width){var w=document.createElement('div');w.className='kwr';w.style.left=(r.left+r.width/2)+'px';w.style.top=(r.bottom-6)+'px';B.appendChild(w);setTimeout(function(){w.remove()},700)}
          setTimeout(function(){B.classList.remove('kjump')},800);
        },1750);
      }else{B.classList.remove('kfall');f.style.opacity='0'}
    },330)};
})();
})();

/* ---------- Geraet: Handy / Tablet (Anzeige-Groesse) ---------- */
(function(){
  var K='robDevice',st=document.createElement('style');
  st.textContent='body.dev-tablet #loginBox{zoom:var(--tz,1.5)}'+
   '#kamDev{display:flex;gap:8px;width:100%;margin-top:12px}#kamDev button{flex:1;padding:10px 6px;border-radius:10px;border:1px solid #7a4a1a;background:#0006;color:#ffe9c4;font-family:Cinzel,serif;font-size:.78rem;cursor:pointer}#kamDev button.on{background:linear-gradient(135deg,#7a1a00,#c23a10);border-color:#f0c040;color:#fff}'+
   '#kamSync{width:100%;box-sizing:border-box;border-radius:10px;padding:7px 10px;font-size:.66rem;text-align:center;border:1px solid #555;background:#0004;color:#bbb;margin-top:8px}#kamSync.ok{color:#9dffb5;border-color:#3fbf68}#kamSync.bad{color:#ffb3a0;border-color:#c0502a}';
  document.head.appendChild(st);
  function get(){try{return localStorage.getItem(K)}catch(e){return null}}
  function real(){var ua=navigator.userAgent||'',mob=/Android|iPhone|iPad|iPod|Mobile/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(!mob)return 'pc';return Math.min(screen.width,screen.height)<600?'phone':'tablet'}
  window.__kamReal=real;
  function fit(){
    var d=(real()==='pc'&&innerWidth>=innerHeight)?'tablet':'phone';try{localStorage.setItem(K,d)}catch(e){}
    var b=document.body;b.classList.toggle('dev-phone',d==='phone');b.classList.toggle('dev-tablet',d==='tablet');b.classList.toggle('dev-pc',d==='pc');
    var z=d==='tablet'?Math.max(1,Math.min(innerWidth/540,innerHeight/860,2.4)):1;
    document.documentElement.style.setProperty('--tz',String(z));
    return d;
  }
  window.__kamCloudLoad=function(){try{if(!confirm('Cloud-Stand auf dieses Gerät laden? Der Stand auf diesem Gerät wird überschrieben.'))return;localStorage.setItem('robForceCloud','1');location.reload()}catch(e){}};
  window.__kamCloudSave=function(){try{if(!confirm('Stand dieses Geräts in die Cloud speichern? Der Cloud-Stand wird überschrieben.'))return;window.__forceSave=true;Promise.resolve(saveStateToFirebase()).then(function(){window.__forceSave=false;try{toast('☁ Gespeichert')}catch(e){}})}catch(e){}};
  window.__kamSetDev=function(d){if(d==='pc')d='tablet';try{localStorage.setItem(K,d)}catch(e){}fit();paint()};
  function paint(){
    var d=fit(),box=document.getElementById('loginBox'),o=document.getElementById('loginOverlay');
    if(!box||!o)return;
    var w=document.getElementById('kamDev');
    if(!w){w=document.createElement('div');w.id='kamDev';
      w.innerHTML='<button data-d="phone" onclick="__kamSetDev(\'phone\')">&#128241; Handy</button><button data-d="tablet" onclick="__kamSetDev(\'tablet\')">&#128223; Tablet</button>';
      var go=[].slice.call(box.querySelectorAll('button')).filter(function(b){return /ABENTEUER/i.test(b.textContent)})[0];
      var sy=document.createElement('div');sy.id='kamSync';
      if(go&&go.parentNode===box){box.appendChild(sy);box.appendChild(w)}else{box.appendChild(sy);box.appendChild(w)}}
    [].forEach.call(w.querySelectorAll('button'),function(b){b.classList.toggle('on',b.getAttribute('data-d')===d)});
    w.style.display='none';
    var sy2=document.getElementById('kamSync');if(sy2){var s=window.__cloudState||{};
      sy2.className=s.ok?'ok':'bad';
      var hh=(s.ahead?'☁ Cloud hat mehr Fortschritt als dieses Geraet – Seite neu laden':(s.ok?'☁ Cloud verbunden'+(s.user?' ('+s.user+')':''):'☁ Nicht mit Konto verbunden – Stand nur auf diesem Geraet'))+(s.ok?'<div style="display:flex;gap:6px;margin-top:6px"><button class="btn btn-sm" style="flex:1;font-size:.6rem" onclick="__kamCloudLoad()">⬇ Cloud-Stand laden</button><button class="btn btn-sm" style="flex:1;font-size:.6rem" onclick="__kamCloudSave()">⬆ Dieses Gerät speichern</button></div>':'');if(sy2.dataset.h!==hh){sy2.innerHTML=hh;sy2.dataset.h=hh}}
  }
  window.addEventListener('resize',fit);window.addEventListener('orientationchange',function(){setTimeout(fit,200)});
  fit();setInterval(function(){try{paint()}catch(e){}},900);
})();

/* ---------- Ansicht: PC (3 Spalten) / Tablet (2 Spalten) / Handy (1 Spalte) ---------- */
(function(){
  var NM={hero:['Ben','p_ben.webp','#ffb020','Krieger'],arc:['Elfa','p_elfa.webp','#7ad06a','Bogenschützin'],mag:['Kalifa','p_kalifa.webp','#b07aff','Magierin']};
  var st=document.createElement('style');
  st.textContent=[
   '.pcc{border:2px solid var(--c);border-radius:14px;padding:10px;margin-bottom:10px;background:#140a08ee;box-shadow:0 0 12px color-mix(in srgb,var(--c) 40%,transparent)}',
   '.pcc .h{display:flex;gap:10px;align-items:center}.pcc img.pf{width:64px;height:64px;object-fit:cover;border-radius:12px;border:3px solid var(--c)}',
   '.pcc .sl{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:8px}.pcc .sl div{aspect-ratio:1;border:1px solid #5a3a1a;border-radius:6px;background:#0008;display:flex;align-items:center;justify-content:center}.pcc .sl img{max-width:88%;max-height:88%}',
   '.pcc.sm{padding:6px;margin-bottom:6px;border-radius:10px}.pcc.sm img.pf{width:42px;height:42px;border-width:2px;border-radius:9px}.pcc.sm .sl{grid-template-columns:repeat(10,1fr);gap:2px;margin-top:5px}.pcc.sm .sl div{border-radius:3px}',
   '.pcc.emp{border-style:dashed;opacity:.75;box-shadow:none}',
   '.pcp{border:2px solid #6b4a1f;border-radius:14px;padding:10px;margin-bottom:10px;background:#140a08ee;font-size:.72rem;color:#ffe9c4}.pcp h4{margin:0 0 6px;color:#ffd24a;font-size:.8rem;letter-spacing:2px}.pcp .r{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid #2a1a14}',
   '.pcp .bar{height:6px;background:#0009;border-radius:3px;overflow:hidden;margin:3px 0 6px}.pcp .bar i{display:block;height:100%;background:#ffb020}.pcp .jb{display:flex;gap:7px;align-items:center;margin:4px 0}.pcp .jb img{width:30px;height:30px;object-fit:contain}',
   '.pst{display:grid;grid-template-columns:repeat(4,minmax(0,62px));justify-content:center;gap:6px;margin:2px 0}.pst .m{border:2px solid var(--c);border-radius:10px;background:#140a08ee;padding:3px;text-align:center;font-size:.55rem;color:#ffe9c4;cursor:pointer;min-width:0}.pst img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:7px;display:block}.pst .m.emp{border-style:dashed;opacity:.7}.pst .m div.ph{aspect-ratio:1;border-radius:7px;background:#0008}',
   '.ptb{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0}.ptb button{padding:10px 2px;border-radius:10px;border:1px solid #6b4a1f;background:#1a0a08;color:#e4d6c4;font:800 .66rem Cinzel,serif;cursor:pointer}.ptb button.on{background:linear-gradient(#a02800,#6a1500);border-color:#ffd24a;color:#fff}',
   '#pcSheet{position:fixed;inset:0;z-index:430;background:#000c;display:none;align-items:flex-start;justify-content:center;padding:34px 12px 12px}#pcSheet.on{display:flex}#pcSheet .box{width:100%;max-width:460px;max-height:90vh;overflow:auto;background:#0b0505;border:2px solid #6b4a1f;border-radius:14px;padding:10px}#pcSheet .x{float:right;background:#600;color:#fff;border:1px solid var(--gold2);border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer}',
   /* Handy: Heldenleiste oben, Reiter unten */
   'body.dev-phone #pcLeft{order:-5}body.dev-phone #pcInfo{order:40}',
   /* PC */
   'body.dev-pc{overflow:hidden}',
   'body.dev-pc #gameWrapper{display:grid!important;grid-template-columns:minmax(240px,1fr) clamp(320px,calc(100vh - 270px),640px) minmax(260px,1fr);grid-template-rows:auto minmax(0,1fr);gap:16px;width:100%!important;max-width:1700px!important;margin:0 auto!important;height:100vh;padding:4px 16px 8px!important;box-sizing:border-box;align-items:start}',
   'body.dev-pc #gameWrapper>.game-title{grid-column:1/-1;margin:0!important;padding:2px 0!important;font-size:1.3rem!important;order:0!important}',
   'body.dev-pc #gameWrapper>.game-col{display:block!important;min-width:0}',
   'body.dev-pc #gameWrapper>.pcMid{grid-column:2;grid-row:2;height:100%;overflow-y:auto;scrollbar-width:none}',
   'body.dev-pc #gameWrapper>.pcRight{grid-column:3;grid-row:2;height:100%;overflow-y:auto;scrollbar-width:thin}',
   'body.dev-pc #pcLeft{grid-column:1;grid-row:2;height:100%;overflow-y:auto;scrollbar-width:thin;order:0}body.dev-pc #pcInfo{order:0}body.dev-pc .ptb{display:none}',
   'body.dev-pc .pcp{padding:8px 10px;margin-bottom:8px}',
   /* Tablet quer */
   '@media (orientation:landscape){body.dev-tablet{overflow:hidden}',
   'body.dev-tablet #gameWrapper{display:grid!important;grid-template-columns:minmax(200px,1fr) clamp(300px,calc(100vh - 310px),640px) minmax(200px,1fr);grid-template-rows:auto auto minmax(0,1fr);gap:8px 14px;width:100%!important;max-width:1700px!important;height:100vh;margin:0 auto!important;padding:2px 14px 8px!important;box-sizing:border-box;align-items:start}',
   'body.dev-tablet #gameWrapper>.game-title{grid-column:1/-1;grid-row:1;margin:0!important;padding:2px 0!important;font-size:1.25rem!important;order:0!important}',
   'body.dev-tablet #gameWrapper>.game-col{display:contents!important}',
   'body.dev-tablet #gameWrapper>.pcMid{display:block!important}',
   'body.dev-tablet #pcInfo{display:contents!important}',
   'body.dev-tablet #pcLeft{grid-column:1/-1;grid-row:2;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;order:0}body.dev-tablet #pcLeft .pcc{margin:0}',
   'body.dev-tablet .pcMid{grid-column:2;grid-row:3;height:100%;min-height:0;overflow-y:auto;scrollbar-width:none}',
   'body.dev-tablet .pgL,body.dev-tablet .pgR{height:100%;min-height:0;overflow-y:auto;scrollbar-width:thin}body.dev-tablet .pgL{grid-column:1;grid-row:3}body.dev-tablet .pgR{grid-column:3;grid-row:3}',
   'body.dev-tablet .pgL .pcp,body.dev-tablet .pgR .pcp{padding:7px 9px;margin-bottom:8px}}',
   /* Tablet hoch: wie Handy, nur breiter */
   '@media (orientation:portrait){body.dev-tablet #gameWrapper{max-width:760px!important}body.dev-tablet #pcLeft{order:-5}body.dev-tablet #pcInfo{order:40}}',
   /* Kampffeld quadratisch (PC + Tablet quer) */
   'body.dev-pc #kam{height:auto!important;aspect-ratio:1/1;min-height:0!important;width:min(100%,calc(100vh - 270px))!important;margin:0 auto}',
   '@media (orientation:landscape){body.dev-tablet #kam{height:auto!important;aspect-ratio:1/1;min-height:0!important;width:min(100%,calc(100vh - 310px))!important;margin:0 auto}}'
  ].join('\n');
  document.head.appendChild(st);

  var $=function(i){return document.getElementById(i)};
  function mode(){var b=document.body;return b.classList.contains('dev-pc')?'pc':b.classList.contains('dev-tablet')?'tablet':'phone'}
  function build(){
    var W=$('gameWrapper');if(!W)return false;
    var L=$('pcLeft');if(!L){L=document.createElement('div');L.id='pcLeft';W.insertBefore(L,W.querySelector('.game-col'))}
    var cols=W.querySelectorAll(':scope>.game-col'),R=cols[1];if(cols[0])cols[0].classList.add('pcMid');if(R)R.classList.add('pcRight');
    if(R&&!$('pcInfo')){var P=document.createElement('div');P.id='pcInfo';R.insertBefore(P,R.firstChild)}
    if(!$('pcSheet')){var sh=document.createElement('div');sh.id='pcSheet';sh.onclick=function(e){if(e.target===sh)sh.classList.remove('on')};document.body.appendChild(sh)}
    return true}
  /* ---- Bausteine ---- */
  function heroCard(w,G,sm){var n=NM[w],sl=G.slots[w];
    return '<div class="pcc'+(sm?' sm':'')+'" style="--c:'+n[2]+'"><div class="h"><img class="pf" src="items/'+n[1]+'?v=1113" alt=""><div><b style="font-size:'+(sm?'.9':'1.1')+'rem;color:'+n[2]+'">'+n[0]+'</b><br><small style="opacity:.8">'+n[3]+'</small></div></div><div class="sl">'+sl.map(function(t){var x=G.gear[w][t];return '<div title="'+(x?x.name:t)+'" style="'+(x?'border-color:'+x.col:'opacity:.45')+'">'+(x?'<img src="'+x.ico+'" alt="">':'')+'</div>'}).join('')+'</div></div>'}
  function teamBox(){var c=($('classLevelNum')||{}).textContent||'0',h=($('heroLevelNum')||{}).textContent||'0';return '<div class="pcp"><h4>TEAM</h4><div class="r"><span>Klassenlevel</span><b>'+c+'</b></div><div class="r"><span>Heldenlevel</span><b>'+h+'</b></div></div>'}
  function pLog(n){var LG=[];try{LG=JSON.parse(localStorage.getItem('robKamLogR')||'[]')}catch(e){}
    return '<div class="pcp"><h4>LIVE-LOG</h4>'+(LG.length?LG.slice(0,n).map(function(x){var d=new Date(x[0]);return '<div class="r"><span>'+x[1]+'</span><small style="opacity:.6">'+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+'</small></div>'}).join(''):'<small style="opacity:.7">Noch nichts erhalten.</small>')+'</div>'}
  function fmt(sec){sec=Math.max(0,Math.ceil(sec));var h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?h+' Std '+m+' Min':m?m+' Min '+('0'+s).slice(-2)+' S':s+' Sek'}
  function pForge(){var J=[];try{J=window.__kamJobs?window.__kamJobs():[]}catch(e){}
    var h='<div class="pcp"><h4>SCHMIEDE ('+J.length+'/3)</h4>';
    if(!J.length)h+='<small style="opacity:.7">Kein Auftrag läuft.</small>';
    J.forEach(function(j){var rest=(j.end-Date.now())/1000,pc=Math.min(100,Math.max(0,100-rest/((j.end-j.st)/1000)*100));
      h+='<div class="jb"><img src="'+j.ico+'" alt=""><div style="flex:1;min-width:0"><b style="color:'+j.col+'">'+j.name+'</b><div class="bar"><i style="width:'+pc+'%"></i></div><small>'+(rest>0?'⏳ '+fmt(rest):'✅ Fertig')+'</small></div></div>'});
    return h+'<button class="btn btn-wide" style="margin-top:6px;font-size:.66rem" onclick="__pcClose();__kForge()">SCHMIEDE ÖFFNEN</button></div>'}
  function pGoals(){var h='<div class="pcp"><h4>TAGESZIELE</h4>';
    try{var d=window.__kamDailyState&&window.__kamDailyState();if(d)h+='<div class="r"><span>Tägliche Belohnung</span><b>'+(d.claimed?'✔ geholt':'bereit')+'</b></div>'}catch(e){}
    try{var Q=[];QUEST_LIST.forEach(function(q){if(q.secret&&!q.secret())return;var v=Math.min(q.getValue(questTracking,heroData),q.target);if(v<q.target)Q.push([q,v])});
      Q.sort(function(a,b){return b[1]/b[0].target-a[1]/a[0].target});
      Q.slice(0,3).forEach(function(x){var q=x[0],p=Math.round(x[1]/q.target*100);h+='<div style="margin-top:5px"><div class="r" style="border:0;padding:0"><span>'+q.name+'</span><b>'+x[1].toLocaleString('de')+'/'+q.target.toLocaleString('de')+'</b></div><div class="bar"><i style="width:'+p+'%;background:#7ad06a"></i></div></div>'})}catch(e){}
    return h+'<button class="btn btn-wide" style="margin-top:4px;font-size:.66rem" onclick="__pcClose();showQuestModal()">ALLE QUESTS</button></div>'}
  function pInv(){var inv=window.inventory||{},ores=inv.ores||{},on=0,k;for(k in ores)on+=ores[k]||0;var orb=0,o2=inv.orbs||{};for(k in o2)orb+=o2[k]||0;var gm=0,g2=inv.gems||{};for(k in g2)gm+=g2[k]||0;
    return '<div class="pcp"><h4>INVENTAR</h4><div class="r"><span><img src="items/ore_silver.webp" style="height:1.2em;vertical-align:-.25em" alt=""> Eisenbarren</span><b>'+(inv.iron||0)+'</b></div><div class="r"><span>⛏ Erze</span><b>'+on+'</b></div><div class="r"><span>🔮 Kugeln</span><b>'+orb+'</b></div><div class="r"><span>💠 Juwelen</span><b>'+gm+'</b></div><div class="r"><span>🛡 Ausrüstung</span><b>'+((inv.items||[]).length)+'</b></div><button class="btn btn-wide" style="margin-top:8px;font-size:.7rem" onclick="__pcClose();__kamOpenP(\'i\',1)">INVENTAR ÖFFNEN</button></div>'}
  var PN={log:['LOG',function(){return pLog(6)}],inv:['INVENTAR',pInv],forge:['SCHMIEDE',pForge],goals:['ZIELE',pGoals]},ORD=['log','inv','forge','goals'];
  window.__pcTab=window.__pcTab||'log';
  window.__pcClose=function(){var s=$('pcSheet');if(s)s.classList.remove('on')};
  window.__pcSetTab=function(t){window.__pcTab=t;paint()};
  window.__pcOpen=function(t){
    if(t==='inv'){__kamOpenP('i',1);return}
    var s=$('pcSheet');if(!s)return;s.dataset.t=t;s.innerHTML='<div class="box"><button class="x" onclick="__pcClose()">✕</button>'+(t==='log'?pLog(20):t==='forge'?pForge():pGoals())+'</div>';s.classList.add('on')};
  window.__pcTabClick=function(t){var m=mode();if(m==='tablet'&&window.matchMedia('(orientation:landscape)').matches){window.__pcSetTab(t)}else __pcOpen(t)};
  function tabBar(act){return '<div class="ptb">'+ORD.map(function(t){return '<button class="'+(act===t?'on':'')+'" onclick="__pcTabClick(\''+t+'\')">'+PN[t][0]+'</button>'}).join('')+'</div>'}
  function setH(el,h){if(el&&el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}}
  function paint(){
    try{if(!build())return;var G=window.__kamHeroGear&&window.__kamHeroGear();if(!G)return;var m=mode(),land=window.matchMedia('(orientation:landscape)').matches;
     var L=$('pcLeft'),P=$('pcInfo'),lh='',ph='';
     var own=['hero','arc','mag'].filter(function(w){return G.own[w]});
     if(m==='pc'){own.forEach(function(w){lh+=heroCard(w,G,false)});lh+='<div class="pcc emp" style="--c:#5ac8e0"><div class="h"><div class="pf" style="width:64px;height:64px;border-radius:12px;border:3px dashed #5ac8e0;flex:none"></div><div><b style="color:#5ac8e0">Begleiter</b><br><small style="opacity:.8">Noch kein Begleiter</small></div></div></div>'+teamBox();
       ph=ORD.map(function(t){return PN[t][1]()}).join('')+'<div style="font-size:.6rem;opacity:.6;text-align:center;padding:2px">Leertaste = Würfeln · I = Inventar · P = Profil</div>'}
     else if(m==='tablet'&&land){own.forEach(function(w){lh+=heroCard(w,G,true)});lh+='<div class="pcc sm emp" style="--c:#5ac8e0"><div class="h"><div class="pf" style="width:42px;height:42px;border-radius:9px;border:2px dashed #5ac8e0;flex:none"></div><div><b style="color:#5ac8e0;font-size:.9rem">Begleiter</b><br><small style="opacity:.8">Noch kein Begleiter</small></div></div></div>';
       ph='<div class="pgL">'+pLog(8)+pInv()+'</div><div class="pgR">'+pForge()+pGoals()+'</div>'}
     else{lh='<div class="pst">'+own.map(function(w){var n=NM[w];return '<div class="m" style="--c:'+n[2]+'" onclick="__kamOpenP(\'p\')"><img src="items/'+n[1]+'?v=1113" alt=""><b style="color:'+n[2]+'">'+n[0]+'</b></div>'}).join('')+'<div class="m emp" style="--c:#5ac8e0"><div class="ph"></div><b style="color:#5ac8e0">Begleiter</b></div></div>';
       ph=tabBar('')}
     setH(L,lh);setH(P,ph)}catch(e){}}
  window.__pcPaint=paint;
  setInterval(paint,1000);setTimeout(paint,600);addEventListener('resize',function(){setTimeout(paint,100)});
  document.addEventListener('keydown',function(e){if(!window.__kamReal||window.__kamReal()!=='pc')return;var t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA')return;
    if(e.code==='Space'){var d=$('actionBtn');if(d&&!d.disabled){e.preventDefault();d.click()}}
    else if(e.key==='i'||e.key==='I'){__kamOpenP('i',1)}
    else if(e.key==='p'||e.key==='P'){var b=$('kamPf');if(b)b.click()}
    else if(e.key==='Escape'){__pcClose()}});
})();

/* ---------- Kisten: Öffnen-Animation + Etage fuer den Loot ---------- */
(function(){
  var oOC=window.openChest;if(typeof oOC!=='function')return;
  ['wood','dia','legend','sin'].forEach(function(t){[0,1,2].forEach(function(f){var i=new Image();i.src='items/chest_'+t+'_'+f+'.webp'})});
  window.openChest=function(type,etg){
    var args=arguments;
    try{
      var fx=document.createElement('div');fx.id='kamChestFx';var im=document.createElement('img');im.src='items/chest_'+type+'_0.webp';fx.appendChild(im);document.body.appendChild(fx);
      setTimeout(function(){im.src='items/chest_'+type+'_1.webp'},320);
      setTimeout(function(){im.src='items/chest_'+type+'_2.webp'},620);
      setTimeout(function(){try{fx.remove()}catch(e){}window.__kamEtg=etg||0;window.__kamBoardScale=etg?.2:1;try{oOC.apply(window,[type])}finally{window.__kamEtg=0;window.__kamBoardScale=1}},1150);
    }catch(e){window.__kamEtg=etg||0;try{oOC.apply(window,[type])}finally{window.__kamEtg=0}}
  };
})();

;(function(){function mkHud(){var d=document.getElementById('statDiamond');if(!d||document.getElementById('statIron'))return;var p=d.parentNode,n=document.createElement('div');n.className='stat';n.id='statIronBox';n.innerHTML='<img src="items/ore_silver.webp?v=1113" style="height:1.2em;vertical-align:-.25em" alt=""> <span id="statIron" style="color:#cfd8e3">0</span>';p.parentNode.insertBefore(n,p.nextSibling);
 var o=document.createElement('div');o.className='stat';o.id='statOreBox';o.style.cssText='display:none;gap:6px';n.parentNode.insertBefore(o,n.nextSibling)}
 function upd(){try{mkHud();var e=document.getElementById('statIron');if(e)e.textContent=(inventory&&inventory.iron)||0;var o=document.getElementById('statOreBox');if(o){var h='',t=0;['green','blue','purple','gold','red'].forEach(function(k){var v=((inventory&&inventory.ores)||{})[k]||0;if(v){t++;h+='<span style="margin-right:6px"><img src="items/ore_'+k+'.webp?v=1113" style="height:1.2em;vertical-align:-.25em" alt=""> '+v+'</span>'}});o.innerHTML=h;o.style.display=t?'block':'none'}}catch(x){}}
 setInterval(upd,1000);setTimeout(upd,300)})();
;window.__ver=window.__ver||{};window.__ver['kammer']='11-14e';
setInterval(function(){try{var q=document.getElementById('kamQuick');if(!q||document.getElementById('kamVer'))return;var d=document.createElement('div');d.id='kamVer';d.style.cssText='width:100%;text-align:center;font-size:.55rem;opacity:.6;margin-top:6px;grid-column:1/-1';var V=window.__ver||{},o=[];['game','city','itemshop','kammer','shim'].forEach(function(k){o.push(k+' '+(V[k]||'?'))});d.textContent='Dateien: '+o.join(' · ');q.appendChild(d)}catch(e){}},1200);

/* ---------- Vollbild-Knopf + App-Installation (PC) ---------- */
(function(){
  try{if('serviceWorker' in navigator)navigator.serviceWorker.register('sw-realm.js',{scope:'./'}).catch(function(){})}catch(e){}
  var inst=null;
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();inst=e;upd()});
  window.addEventListener('appinstalled',function(){inst=null;upd()});
  var st=document.createElement('style');
  st.textContent='#kamFs{position:fixed;top:6px;left:8px;z-index:9000;display:none;gap:6px}#kamFs button{background:#140a08cc;color:#ffe9c4;border:1px solid #c8a000;border-radius:8px;padding:5px 10px;font-family:Cinzel,serif;font-size:.7rem;cursor:pointer}#kamFs button:hover{background:#7a1a00}';
  document.head.appendChild(st);
  function standalone(){try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone}catch(e){return false}}
  function isFs(){return !!(document.fullscreenElement||document.webkitFullscreenElement)}
  window.__kamFs=function(){try{if(isFs()){(document.exitFullscreen||document.webkitExitFullscreen).call(document)}else{var d=document.documentElement;(d.requestFullscreen||d.webkitRequestFullscreen).call(d)}}catch(e){}};
  window.__kamInstall=function(){if(inst){inst.prompt();inst.userChoice.then(function(){inst=null;upd()}).catch(function(){})}};
  function upd(){var w=document.getElementById('kamFs');if(!w){w=document.createElement('div');w.id='kamFs';document.body.appendChild(w)}w.style.display=(window.__kamReal&&window.__kamReal()==='pc')?'flex':'none';
    var h='<button onclick="__kamFs()" title="Vollbild (F11)">'+(isFs()?'⤢ Vollbild beenden':'⛶ Vollbild')+'</button>'+(inst&&!standalone()?'<button onclick="__kamInstall()" title="Als App installieren">⬇ Als App installieren</button>':'');
    if(w.dataset.h!==h){w.innerHTML=h;w.dataset.h=h}}
  document.addEventListener('fullscreenchange',upd);document.addEventListener('webkitfullscreenchange',upd);
  setInterval(upd,1500);setTimeout(upd,500);
})();
