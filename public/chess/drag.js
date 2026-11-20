/* Schach: Tippen (Figur, dann Feld) und Ziehen (Figur mit Finger/Maus bewegen) gleichzeitig, ohne Umschalten. */
(function(){
  window.bpMoveMode = function(){ return 'both'; };
  window.bpMoveUI = function(box){ try{ box.innerHTML = ''; box.style.display = 'none'; }catch(e){} };
  window.bpDragInit = function(o){
    var board = o.board, d = null;
    function clean(){ if(d){ try{ if(d.ghost.parentNode) d.ghost.remove(); }catch(x){} d = null; } window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cn); document.querySelectorAll('.bp-ghost').forEach(function(g){ g.remove(); }); }
    function sqAt(x, y){ var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.sq') : null; }
    function end(e, cancel){
      if(!d) return; if(e && d.id != null && e.pointerId != null && e.pointerId !== d.id) return;
      var r = d.r, c = d.c; clean();
      if(cancel){ o.cancel(); return; }
      var sq = sqAt(e.clientX, e.clientY);
      if(sq){ var r2 = +sq.dataset.r, c2 = +sq.dataset.c; if(r2 === r && c2 === c){ var pcs = board.querySelectorAll('.pc'); for(var i = 0; i < pcs.length; i++) pcs[i].style.opacity = ''; return; } if(o.drop(r2, c2)) return; }
      o.cancel();
    }
    function move(e){ if(!d || (e.pointerId != null && e.pointerId !== d.id)) return; d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px'; }
    function up(e){ end(e, false); }
    function cn(e){ end(e, true); }
    board.addEventListener('pointerdown', function(e){
      if(e.isPrimary === false) return;
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      clean();
      var sq = e.target.closest('.sq'); if(!sq) return;
      var r = +sq.dataset.r, c = +sq.dataset.c; if(!o.canPick(r, c)) return;
      e.preventDefault(); o.pick(r, c);
      var now = board.querySelector('.sq[data-r="' + r + '"][data-c="' + c + '"]'), pc = now && now.querySelector('.pc'); if(!pc) return;
      var w = now.getBoundingClientRect().width, ghost = document.createElement('div');
      ghost.className = 'bp-ghost'; ghost.innerHTML = pc.innerHTML; ghost.style.cssText = 'position:fixed;z-index:50;pointer-events:none;width:' + (w * 1.25) + 'px;height:' + (w * 1.25) + 'px;transform:translate(-50%,-62%);filter:drop-shadow(0 8px 6px rgba(0,0,0,.45));left:' + e.clientX + 'px;top:' + e.clientY + 'px';
      pc.style.opacity = '.25'; document.body.appendChild(ghost);
      d = { r: r, c: c, ghost: ghost, id: e.pointerId };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cn);
    });
    board.style.touchAction = 'none';
    // Langes Halten ohne Bewegen startet einen Pfeil (arrows.js): dann kein Figuren-Ziehen
    window.addEventListener('bp-arrow-start', function(){ if(d){ clean(); o.cancel(); } });
  };
})();
