/* Held steht still und laeuft nur auf der Stelle, wenn man VORWAERTS / WEITER drueckt */
(function(){
  var img=document.getElementById('runImg'), wrap=document.getElementById('sceneWrap'); if(!img) return;
  var F=[], n=8, k;
  for(k=0;k<n;k++){ var p=new Image(); p.src='run'+k+'.png'; F.push(p.src); }
  var ok=false, probe=new Image(); probe.onload=function(){ ok=true; img.classList.add('rr'); }; probe.src='run0.png';
  var floor=document.createElement('div'); floor.id='runFloor'; floor.innerHTML='<i></i><b></b>';
  if(wrap) wrap.appendChild(floor);
  var A=[], ak, atkAt=0, AT=[0,110,230,360,560], AM={rw:155,axr:101.5,aw:282,axa:154.3};
  for(ak=0;ak<4;ak++){ var q=new Image(); q.src='atk'+ak+'.png'; A.push(q.src); }
  var until=0, fr=0, last=0;
  function hit(){ atkAt=performance.now(); }
  var _swing=window.runSwing; window.runSwing=function(){ hit(); if(_swing) _swing.apply(this,arguments); };
  function go(ms){ until=Math.max(until,performance.now()+(ms||1300)); }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('button'); if(!b) return;
    if(b.id==='actionBtn'||/vorw|weiter/i.test(b.textContent||'')) go(1300);
  },true);
  window.runGo=go;
  function tick(t){
    if(!ok){ requestAnimationFrame(tick); return; }
    if(window.__benSkin&&window.__benSkin()==='new'){
      var ra=t<until, aa=atkAt&&t-atkAt<AT[4], wn;
      if(aa){wn='h/ben_at.webp';img.style.width='208%';img.style.maxWidth='none';img.style.border='0'}
      else{ if(atkAt)atkAt=0; img.style.width='165%';img.style.maxWidth='none';img.style.border='0'; if(ra){ if(t-last>140){last=t;fr=(fr+1)%2} } else fr=0; wn='h/ben_i'+fr+'.webp'; }
      if(img.getAttribute('src')!==wn)img.src=wn;
      if(floor.classList.contains('go')!==ra) floor.classList.toggle('go',ra);
      img.parentNode.classList.toggle('running',ra);
      requestAnimationFrame(tick);return;
    }
    img.style.border='';
    var run=t<until, want, atk=atkAt&&t-atkAt<AT[4];
    if(atk){ var d=t-atkAt, a=0; while(a<3&&d>=AT[a+1]) a++; want=A[a]; run=false; fr=0;
      if(!img.dataset.atk){ img.dataset.atk='1'; img.style.width=(AM.aw/AM.rw*100)+'%'; img.style.maxWidth='none'; img.style.marginLeft=((AM.axr-AM.axa)/AM.rw*100)+'%'; }
    } else if(img.dataset.atk){ delete img.dataset.atk; img.style.width=''; img.style.maxWidth=''; img.style.marginLeft=''; atkAt=0; }
    if(atk){ } else if(run){ if(t-last>85){ last=t; fr=(fr+1)%n; } want=F[fr]; } else { fr=0; want=F[0]; }
    if(img.src!==want) img.src=want;
    if(floor.classList.contains('go')!==run) floor.classList.toggle('go',run);
    img.parentNode.classList.toggle('running',run);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
