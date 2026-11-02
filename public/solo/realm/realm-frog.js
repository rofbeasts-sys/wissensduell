/* Krogg (Frosch-Koenig): animiertes Monster mit Idle, Angriff und Treffer */
(function(){
  var scene=document.getElementById('battleScene'); if(!scene) return;
  var F=[],k; for(k=0;k<9;k++){ var p=new Image(); p.src='frog'+k+'.png'; F.push(p.src); }
  var atkAt=0, hurtAt=0, ATK=[0,110,230,360,520];
  function isFrog(img){ try{ return img.getAttribute('src')===getMonsterImg('frog'); }catch(e){ return /frog/.test(img.getAttribute('src')||''); } }
  var ok=false, pr=new Image(); pr.onload=function(){ ok=true; mark(); }; pr.src='frog0.png';
  function mark(){ if(!ok) return;
    var im=scene.querySelectorAll('.monster-slot img'); 
    for(var i=0;i<im.length;i++){ if(!im[i].dataset.fk && isFrog(im[i])){ im[i].dataset.fk='1'; im[i].classList.add('fk'); im[i].src=F[0]; } }
  }
  new MutationObserver(function(ms){
    mark();
    ms.forEach(function(m){
      if(m.type==='attributes'){
        var t=m.target;
        if(t.classList&&t.classList.contains('lunge')&&t.classList.contains('monster-slot')&&!t._l){ t._l=1; atkAt=performance.now(); setTimeout(function(){ t._l=0; },300); }
        if(t.tagName==='IMG'&&t.dataset.fk&&t.classList.contains('hit-flash')&&performance.now()-hurtAt>200){ hurtAt=performance.now(); }
      }
    });
  }).observe(scene,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  mark();
  var last=0, idle=0, dir=1;
  function tick(t){
    var im=scene.querySelectorAll('img[data-fk]');
    if(im.length){
      var want;
      if(atkAt&&t-atkAt<ATK[4]){ var d=t-atkAt,a=0; while(a<3&&d>=ATK[a+1]) a++; want=F[4+a]; }
      else if(hurtAt&&t-hurtAt<320){ want=F[8]; }
      else { if(t-last>230){ last=t; idle+=dir; if(idle>=3||idle<=0) dir=-dir; } want=F[idle]; }
      for(var i=0;i<im.length;i++){ if(im[i].src!==want) im[i].src=want; }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
