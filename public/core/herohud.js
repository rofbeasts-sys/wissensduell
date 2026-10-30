/* Helden-Anzeige fuer Spiele in iframes (Brain Fruit, Brain Jong): der gewaehlte Held sitzt oben links oder rechts,
   reagiert mit Emoji und Sprechblase (wie in Brain Galaxy). Nutzung:
   HeroHUD.init({ hero:0..5, svg:'<g..>', side:'left'|'right', top:56, lang:'de'|'en', game:'fruit'|'jong' });
   HeroHUD.react('cheer'|'combo'|'danger'|'over'|'start'|'tip'|'hint', optionalText) */
(function(){
  var NAMES=[["Königin Beere","Queen Berry"],["König Zitrone","King Lemon"],["Königin Kirsche","Queen Cherry"],["König Apfel","King Apple"],["Königin Traube","Queen Grape"],["König Heidelbeere","King Blueberry"]];
  var LINES={
    start:[["Los geht's!","Let's go!"],["Ich bin bereit, du auch?","I'm ready, are you?"],["Zeig, was du kannst!","Show me what you've got!"]],
    cheer:[["Super gemacht! 🎉","Great job! 🎉"],["Das war stark!","That was strong!"],["Weiter so, du bist heiß!","Keep going, you're on fire!"]],
    combo:[["Wow, eine Kette! 🔥","Wow, a chain! 🔥"],["Noch mehr davon!","More of that!"],["Das knallt! 💥","Boom! 💥"]],
    danger:[["Achtung, es wird knapp! ❗","Careful, it's getting tight! ❗"],["Konzentrier dich!","Focus!"],["Du schaffst das noch!","You can still do it!"]],
    over:[["Nicht schlimm, nochmal! 💪","No worries, try again! 💪"],["Beim nächsten Mal klappt's!","Next time you'll nail it!"],["Ich glaub an dich!","I believe in you!"]],
    tip:[["Tipp: Denk ein, zwei Züge voraus.","Tip: think one or two moves ahead."],["Ruhig bleiben, kein Stress.","Stay calm, no rush."],["Sonderteile lohnen sich!","Special pieces are worth it!"]],
    hint:[["Schau auf das Leuchten!","Look at the glow!"],["Hier ist ein Paar für dich.","Here's a pair for you."]]
  };
  var EMO={cheer:'🎉',combo:'🔥',danger:'❗',over:'😵',start:'✨',tip:'💡',hint:'💡'};
  var S={on:false}, el=null, bub=null, emo=null, to1=0, to2=0, lastSay=0;
  function css(){
    if(document.getElementById('hhCss')) return;
    var st=document.createElement('style'); st.id='hhCss';
    st.textContent='#hhud{position:fixed;z-index:60;width:62px;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}'
    +'#hhud svg{display:block;width:62px;height:auto;filter:drop-shadow(0 3px 6px #0008);transform-origin:50% 100%}'
    +'#hhud .em{position:absolute;top:-6px;font-size:20px;opacity:0;transition:opacity .2s;pointer-events:none}#hhud.l .em{right:-6px}#hhud.r .em{left:-6px}'
    +'#hhud .bub{position:absolute;top:2px;max-width:150px;min-width:70px;background:#fff6dd;color:#3a2a14;border-radius:12px;padding:5px 8px;font:700 11px/1.25 system-ui,sans-serif;box-shadow:0 4px 12px #0008;opacity:0;transform:scale(.9);transition:opacity .2s,transform .2s;pointer-events:none}'
    +'#hhud.l .bub{left:68px}#hhud.r .bub{right:68px}#hhud .bub.on{opacity:1;transform:scale(1)}#hhud .em.on{opacity:1}'
    +'body:has(.scr.show) #hhud{display:none}'
    +'#hhud.cheer svg,#hhud.combo svg{animation:hhJump .5s ease-in-out 3}#hhud.danger svg{animation:hhShake .12s linear infinite;filter:drop-shadow(0 0 10px #ff3b5c)}'
    +'#hhud.over svg{opacity:.6;transform:rotate(-8deg)}#hhud.idle svg{animation:hhBreath 3.2s ease-in-out infinite}'
    +'@keyframes hhJump{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}@keyframes hhShake{0%{transform:translateX(-1.6px)}50%{transform:translateX(1.6px)}100%{transform:translateX(-1.6px)}}@keyframes hhBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}';
    document.head.appendChild(st);
  }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function init(o){
    css(); o=o||{}; S={on:true,hero:o.hero|0,lang:o.lang==='en'?'en':'de',game:o.game||'',side:o.side==='right'?'right':'left',top:o.top==null?56:o.top};
    if(el) el.remove();
    el=document.createElement('div'); el.id='hhud'; el.className=(S.side==='right'?'r':'l')+' idle'; el.style[S.side]='6px'; el.style.top=S.top+'px';
    el.innerHTML='<svg viewBox="0 0 120 150">'+(o.svg||'')+'</svg><div class="em"></div><div class="bub"></div>';
    document.body.appendChild(el); bub=el.querySelector('.bub'); emo=el.querySelector('.em');
    el.onclick=function(){ react('tip'); };
    return S;
  }
  function react(type,text){
    if(!S.on||!el) return; var now=Date.now();
    if(type!=='over'&&type!=='cheer'&&now-lastSay<4500&&!text) { setAnim(type); return; }
    lastSay=now; var L=LINES[type]||LINES.tip, ln=text||pick(L)[S.lang==='en'?1:0];
    bub.textContent=ln; bub.classList.add('on'); emo.textContent=EMO[type]||''; emo.classList.add('on'); setAnim(type);
    clearTimeout(to1); clearTimeout(to2);
    to1=setTimeout(function(){ if(bub) bub.classList.remove('on'); if(emo) emo.classList.remove('on'); },type==='over'||type==='cheer'?3600:2400);
    to2=setTimeout(function(){ if(el&&type!=='over'&&type!=='danger') el.className=(S.side==='right'?'r':'l')+' idle'; },type==='danger'?2600:1800);
  }
  function setAnim(type){ if(!el) return; var c=(S.side==='right'?'r':'l'); if(type==='cheer'||type==='combo'||type==='danger'||type==='over') c+=' '+type; else c+=' idle'; el.className=c; }
  function calm(){ if(el) el.className=(S.side==='right'?'r':'l')+' idle'; }
  window.HeroHUD={init:init,react:react,calm:calm,names:NAMES,hide:function(){ if(el){ el.remove(); el=null; } S.on=false; }};
})();
