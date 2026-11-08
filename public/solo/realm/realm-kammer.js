/* Kammer-Laufbrett fuer Realm of Brain.
   Ersetzt das 25-Felder-Band: Wuerfeln, Zielfeld waehlen (nur hoch/links/rechts), nur das Zielfeld loest aus.
   Kampf, Shop, Tod, Klassen laufen weiter ueber game.js. */
(function(){
'use strict';
var COLS=5,CM=2,TS=54,GAP=6,STEP=TS+GAP,ETG=10,ROWS=ETG*10,FACES='⚀⚁⚂⚃⚄⚅';
var $=function(i){return document.getElementById(i)};
var K=null,busy=false,fightBoss=false;window.__K=function(){return K};
var THEMES=[
 {n:'Glutkammer',a:'#ff6a1a',bg:'#1a0707',t:'#3a1208',w:'#2a0c07'},
 {n:'Giftkammer',a:'#7bd23a',bg:'#0b1607',t:'#1c3010',w:'#13220b'},
 {n:'Schattenkammer',a:'#b06bff',bg:'#120a1c',t:'#2a1a40',w:'#1c1030'},
 {n:'Schwefelkammer',a:'#e8d23a',bg:'#171505',t:'#3a3410',w:'#262208'},
 {n:'Eiskammer',a:'#5ad2ff',bg:'#07131a',t:'#12303d',w:'#0c2029'}];
function theme(k){return THEMES[(k-1)%THEMES.length]}
function avail(R){var a=[];if(R<=10)a.push('frog');if(R>=6&&R<=15)a.push('gobold');if(R>=11&&R<=20)a.push('wolf');if(R>=21&&R<=30)a.push('bear');if(R>=25&&R<=35)a.push('golem');if(R>=31&&R<=40)a.push('snake');if(R>=41&&R<=50)a.push('spider');if(R>=51&&R<=60)a.push('freggz');if(R>=61&&R<=70)a.push('hexe');if(R>=71&&R<=80)a.push('snowman');if(R>=81)a.push('inferno');if(!a.length)a.push('frog');return a}
function reg(r,e){(K.rows[r]=K.rows[r]||[]).push(e)}
function updateVis(){var c=K.cur.r,lo=Math.max(0,c-5),hi=c+14;if(K.lo===lo&&K.hi===hi)return;for(var r=0;r<=ROWS+1;r++){var v=r>=lo&&r<=hi;if(K.vr[r]===v)continue;K.vr[r]=v;(K.rows[r]||[]).forEach(function(e){e.style.display=v?'':'none'})}K.lo=lo;K.hi=hi}
var MAIN=['frog','gobold','wolf','bear','golem','snake','spider','freggz','hexe','snowman','inferno'];
function mainOf(k){return MAIN[Math.min(k-1,MAIN.length-1)]}
function pool(k){return MAIN.slice(0,Math.min(k,MAIN.length))}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
/* Monster-Animationen (Bildsätze): Stehen i0/i1, Angriff a0-a2, Treffer h */
var AF={},ANIMT=['bear','wolf','gobold','snake'],mlock=0,midle=0;
ANIMT.forEach(function(t){['i0','i1','a0','a1','a2','h'].forEach(function(k){var im=new Image();im.src='mon/'+t+'_'+k+'.webp';AF[t+k]=im.src})});
function mimgs(){return [].slice.call(document.querySelectorAll('#battleScene .monster-slot img')).filter(function(i){return ANIMT.indexOf(i.getAttribute('alt'))>=0})}
function mset(k,only){mimgs().forEach(function(i,n){if(only!==undefined&&n!==only)return;i.src=AF[i.getAttribute('alt')+k]})}
function prepAnim(){mimgs().forEach(function(i){i.classList.add('kanim');i.src=AF[i.getAttribute('alt')+'i0']})}
setInterval(function(){if(mlock)return;midle=1-midle;mset('i'+midle)},420);
function monHurt(){mlock=1;mset('h',0);setTimeout(function(){mlock=0},380)}
function snakeSpit(){try{var w=$('sceneWrap'),sl=[].slice.call(document.querySelectorAll('#battleScene .monster-slot')).filter(function(x){var i=x.querySelector('img');return i&&i.getAttribute('alt')==='snake'})[0],hr=$('runImg');if(!w||!sl||!hr)return;var wr=w.getBoundingClientRect(),mr=sl.getBoundingClientRect(),hb=hr.getBoundingClientRect();var smi=sl.querySelector('img').getBoundingClientRect();var x0=smi.left-wr.left+smi.width*.12,y0=smi.top-wr.top+smi.height*.54,x1=hb.left-wr.left+hb.width*.55,y1=y0;var p=document.createElement('div');p.className='kpj stream';p.style.left=x0+'px';p.style.top=y0+'px';w.appendChild(p);p.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate('+(x1-x0-30)+'px,0)',opacity:1}],{duration:330,easing:'ease-in'}).onfinish=function(){p.remove();var q=document.createElement('div');q.className='kpj splash';q.style.left=x1+'px';q.style.top=y1+'px';w.appendChild(q);q.animate([{transform:'scale(.5)',opacity:1},{transform:'scale(1.25)',opacity:0}],{duration:420}).onfinish=function(){q.remove()}}}catch(e){}}
function monAtk(){mlock=1;mset('a0');setTimeout(snakeSpit,260);setTimeout(function(){mset('a1')},130);setTimeout(function(){mset('a2')},260);setTimeout(function(){mlock=0;mset('i0')},520)}
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
'#kam .tile.empty,#kam .tile.start,#kam .tile.gold,#kam .tile.bed,#kam .tile.die{background:linear-gradient(#0001,#0003),url(dung/floor.webp) center/cover,var(--t);background-blend-mode:multiply,normal,normal;box-shadow:none;filter:brightness(calc(var(--b,1) * 1.4)) saturate(1.3) hue-rotate(14deg)}'+
'#kam .wall,#kam .blk{background:linear-gradient(#0002,#0004),url(dung/brick.webp) 0 0/46px 33px,var(--w)!important;border:1px solid #0008!important;border-radius:6px!important;box-shadow:none;filter:brightness(1.5) saturate(1.2) hue-rotate(18deg)}'+
'#kam .glow{position:absolute;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;background:radial-gradient(circle,#ff9a3a66 0%,#ff6a1a22 40%,#0000 70%);mix-blend-mode:screen;pointer-events:none}'+

'#kam .torch{position:absolute;width:30px;height:46px;background:url(dung/torch.png) center/contain no-repeat;transform:rotateX(-30deg);transform-origin:50% 100%;pointer-events:none;filter:drop-shadow(0 0 8px #f90)}'+
'#kam .tile img{width:100%;height:100%;object-fit:cover;border-radius:8px;display:block}'+
'#kam .tile small{position:absolute;bottom:-1px;left:0;right:0;text-align:center;font-size:9px;font-weight:800;background:#000a;border-radius:0 0 8px 8px;color:#ffe9c4;line-height:13px}'+
'#kam .tile.monster{border-color:#e14}#kam .tile.coin{border-color:#f0c040}#kam .tile.bed{border-color:#4c8}#kam .tile.boss{border-color:#f40;border-width:3px;box-shadow:0 0 24px #f408}'+
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
'body.kamfight #battleBg{background:url(dung/door.webp) center top/auto 92% no-repeat,linear-gradient(#1a1030,#0d0714)!important;opacity:1!important;border-radius:10px}'+
'#battlePanel{position:relative}'+
'#kamBar{display:flex;gap:10px;align-items:center;order:-1;position:relative;z-index:12}#kamBar #actionBtn{flex:1;order:0!important}'+
'#kamDieBox{width:62px;height:62px;flex:none;perspective:260px;position:relative}'+
'#kamDieBox.toss{animation:ktoss .95s ease-out;z-index:20}@keyframes ktoss{0%{transform:translateY(0)}35%{transform:translateY(-120px) scale(1.5)}60%{transform:translateY(-40px) scale(1.25)}78%{transform:translateY(-70px) scale(1.3)}100%{transform:translateY(0) scale(1)}}'+
'#kamCube{position:absolute;left:5px;top:5px;width:52px;height:52px;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.2,.8,.2,1)}'+
'#kamCube.spin{transition:none;animation:kspin .45s linear infinite}@keyframes kspin{to{transform:rotateX(360deg) rotateY(720deg)}}'+
'#kamCube .f{position:absolute;inset:0;border-radius:9px;background:linear-gradient(145deg,#fff,#d9d2c4);border:1px solid #8a7a5c;display:grid;grid-template:repeat(3,1fr)/repeat(3,1fr);padding:7px;backface-visibility:hidden;box-shadow:inset 0 0 8px #0003}'+
'#kamCube .f i{border-radius:50%;margin:1px}#kamCube .f i.p{background:radial-gradient(circle at 35% 30%,#e33,#800)}'+
'#kamCube .f1{transform:translateZ(26px)}#kamCube .f2{transform:rotateY(90deg) translateZ(26px)}#kamCube .f6{transform:rotateY(180deg) translateZ(26px)}#kamCube .f5{transform:rotateY(-90deg) translateZ(26px)}#kamCube .f3{transform:rotateX(90deg) translateZ(26px)}#kamCube .f4{transform:rotateX(-90deg) translateZ(26px)}'+

'#battleScene .monster-slot img.kanim{object-fit:contain!important;border:none!important;background:none!important;box-shadow:none!important;border-radius:0!important;width:150px;height:150px;filter:drop-shadow(0 6px 5px #000a)}'+
'body.kamn2 #battleScene{gap:4px!important;padding-left:38%!important}body.kamn2 #battleScene .monster-slot img{width:92px!important;height:92px!important}body.kamn3 #battleScene{gap:2px!important;padding-left:36%!important}body.kamn3 #battleScene .monster-slot img{width:66px!important;height:66px!important}body.kamn3 #battleScene .monster-name{font-size:.5rem!important}'+
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
  [['🎒 INVENTAR','showInventory'],['💎 DIA-SHOP','__kDia'],['🏙️ STADT','showCity']].forEach(function(q){var bt=document.createElement('button');bt.className='btn btn-sm';bt.textContent=q[0];bt.onclick=function(){closeP();try{window[q[1]]()}catch(e){}};qk.appendChild(bt)});
  $('kamProfBody').appendChild(qk);
  var mp=$('menuPanel');if(mp){$('kamProfBody').appendChild(mp);mp.addEventListener('click',function(e){var bt=e.target.closest&&e.target.closest('button');if(bt)setTimeout(closeP,0)})}
  function openP(t){var sp=$('statusPanel'),b=$('kamProfBody');b.insertBefore(sp,b.firstChild);b.insertBefore($('kamQuick'),sp.nextSibling);b.appendChild(rs);pw.dataset.tab=t||'p';sp.style.setProperty('display',pw.dataset.tab==='p'?'block':'none','important');[].forEach.call(pw.querySelectorAll('.tabs button[data-t]'),function(x){x.classList.toggle('on',x.dataset.t===pw.dataset.tab)});pw.classList.add('on');syncFace()}
  pf.onclick=function(){openP('p')};
  [].forEach.call(pw.querySelectorAll('.tabs button[data-t]'),function(x){x.onclick=function(){openP(x.dataset.t)}});
  [].slice.call(document.querySelectorAll('#menuPanel button')).forEach(function(bt){var o=bt.getAttribute('onclick')||'';if(/showCity|showDiaShop|showInventory|showQuestModal/.test(o))bt.remove()});
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
  var c=$('kamEm');if(!c)return;ctx=c.getContext('2d');
  function fit(){c.width=c.clientWidth;c.height=c.clientHeight}fit();addEventListener('resize',fit);
  for(var i=0;i<22;i++)emb.push({x:Math.random(),y:Math.random(),s:1+Math.random()*2,v:.0004+Math.random()*.0009});
  (function tick(){
    if(fc%2&&fc++){requestAnimationFrame(tick);return}
    if(ctx){ctx.clearRect(0,0,c.width,c.height);if((fc++%40)===0)ecol=getComputedStyle($('kam')).getPropertyValue('--a')||'#ff6a1a';ctx.fillStyle=ecol;
      emb.forEach(function(e){e.y-=e.v*16;if(e.y<0){e.y=1;e.x=Math.random()}ctx.globalAlpha=.25+.5*(1-e.y);ctx.beginPath();ctx.arc(e.x*c.width,e.y*c.height,e.s,0,7);ctx.fill()});ctx.globalAlpha=1}
    requestAnimationFrame(tick)})();
}

/* ---------- Brett ---------- */
function gen(r,c,R){
  /* Etage 1-3: wenig Gold, Etage 4-6: Gold-Zone, Etage 7-10: nur noch Monster (und Betten) */
  var e=Math.min(10,Math.ceil(r/ETG)),w;
  if(e<=3)w=[['monster',52],['gold',14],['empty',34]];
  else if(e<=6)w=[['monster',34],['gold',40],['empty',26]];
  else w=[['monster',84],['empty',16]];
  var x=Math.random()*100,a=0,t='empty';
  for(var i=0;i<w.length;i++){a+=w[i][1];if(x<a){t=w[i][0];break}}
  if(t==='empty'&&e>=2&&!K.dieE[e]&&Math.random()<(EQ==='city'&&cityTier()>=2?.07:.035)){t='die';K.dieE[e]=1}
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
    var inner=o.t==='monster'?'<img class="sp" src="'+getMonsterImg(o.m)+'" alt=""><small>Kampf</small>':o.t==='gold'?'💰<small>+'+o.v+'</small>':o.t==='die'?dieHTML(o.d,30)+'<small>Würfel</small>':o.t==='bed'?'🛌<small>Bett</small>':o.t==='start'?'🔥':'';
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
  var e=EQ&&SD[EQ]?'<span class="eqd">'+dieHTML(EQ,22)+'<small>'+SD[EQ].n+'</small></span>':'';
  el.innerHTML=h+e;
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
  if(ST.kills>=60)unlock('vamp');
  if(ST.deaths>=3)unlock('redo');
  if(ST.dice>=8)unlock('luck');
  if(ST.bosses>=1)unlock('warp');
  if(ST.low>=1)unlock('iron');
  if(meta.gold>=5000)unlock('thief');
  try{if(prestigeData&&prestigeData.count>=1)unlock('six')}catch(e){}
  if(cityTier()>=1)unlock('city');
  if(inFight&&meta.hp>0&&meta.hp<=meta.maxHp*.1&&!ST.lowSeen){ST.lowSeen=1;ST.low=1;saveST()}
}
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
function anim(sv,cb){var box=$('kamDieBox'),c=$('kamCube');
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
  if(o.t==='boss'){unlock('rig');fightBoss=true;pendingBossNum=K.k;startWorldBoss(K.k);
    try{monstersInFight[0].baseType=drag(K.k);renderFight()}catch(e){}
    applyFightBonus();var dm='Der Drache versperrt den Weg!';if(DRG.indexOf(K.k)>=0){try{var bm=monstersInFight[0],ch=Math.round(bm.maxHp*.1);bm.hp=Math.max(1,bm.hp-ch);DRG.splice(DRG.indexOf(K.k),1);saveD();dm+=' Drachenwürfel: -'+ch+' Leben!';renderFight()}catch(e){}}msg(dm);return afterAny()}
  if(o.t==='monster'&&!o.used){o.used=true;o.el.classList.add('used');var tp=kamFight(o);msg(tp.length>1?tp.map(function(t){return MONSTER_NAMES[t]}).join(' und ')+' greifen an!':MONSTER_NAMES[o.m]+' greift an!');return afterAny()}
  if(!o.used){
    if(o.t==='die'){if(INV.length>=3){msg('Alle 3 Plätze voll. Der Würfel bleibt liegen.');updateUI();return}INV.push(o.d);ST.dice++;saveST();saveD();invUI();checkUnlocks();fl('🎲 '+dd(o.d).n,'#fff');msg(dd(o.d).n+' eingesammelt: '+dd(o.d).d+'.');o.used=true;if(o.el)o.el.classList.add('used');updateUI();return}
    if(o.t==='gold'){var g=Math.floor((o.v+(K.gb||0))*(typeof getSchurkeGoldMult==='function'?getSchurkeGoldMult():1));
      if(heroData[meta.hero].skills.includes('ben1')&&Math.random()<.3){g*=2;try{showSkillPopup('🍀 GLÜCKSGRIFF! Doppeltes Gold!')}catch(e){}}
      meta.gold+=g;K.gb=0;fl('+'+g+' 🪙','#ffd24a');msg('Gold gefunden.');
      try{if(playerClass){questTracking.goldEarned=(questTracking.goldEarned||0)+g;saveQuestTracking()}}catch(e){}}
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
    var k=fightBoss&&K?K.k+1:Math.floor((Math.max(1,meta.round)-1)/10)+1;
    if(fightBoss){fightBoss=false;ST.bosses++;saveST()}
    board=['empty'];pos=0;build(k);
  };
  window.drawBoard=function(){};
  var oSw=window.runSwing;window.runSwing=function(){if(inFight&&$('kam')&&typeof meta!=='undefined'&&meta){try{allyStrike()}catch(e){}}return oSw&&oSw.apply(this,arguments)};
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
 {id:'arc',ic:'🏹',nm:'Bogenschützin',need:15,w:112,l:-4,b:132,idle:['arc_i0','arc_i1'],atk:['arc_a0','arc_a2'],mult:.5,pj:'arrow',col:'#ffd24a'},
 {id:'mag',ic:'🔮',nm:'Magierin',need:30,w:140,l:58,b:170,idle:['mag_i0','mag_i1'],atk:['mag_a1','mag_a1'],mult:.4,pj:'orb',col:'#d070ff',heal:true}
];
var allyRound=0;
function clsLv(){try{return window.__cl!=null?window.__cl:getClassLevel()}catch(e){return 0}}
function allyList(){var c=clsLv();return ALLY.filter(function(a){return c>=a.need})}
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
  L.forEach(function(a,k){var dm=Math.max(1,Math.round(meta.attack*a.mult));d+=dm;setTimeout(function(){animAlly(a,dm)},170+k*230)});
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
})();
