/* Schach: Zugart "Tippen" (Figur, dann Feld) oder "Ziehen" (Figur mit dem Finger/der Maus bewegen) */
(function(){
  var KEY = 'bp_chess_move', mode = 'tap';
  try{ if(localStorage.getItem(KEY) === 'drag') mode = 'drag'; }catch(e){}
  window.bpMoveMode = function(){ return mode; };
  window.bpMoveUI = function(box){
    var de = /^de/.test(document.documentElement.lang || navigator.language || '');
    function paint(){
      box.innerHTML = '';
      [['tap', de ? '👆 Tippen' : '👆 Tap'], ['drag', de ? '✋ Ziehen' : '✋ Drag']].forEach(function(o){
        var b = document.createElement('button'); b.className = 'chip' + (mode === o[0] ? ' active' : ''); b.textContent = o[1];
        b.onclick = function(){ mode = o[0]; try{ localStorage.setItem(KEY, mode); }catch(e){} paint(); if(window.bpMoveChanged) window.bpMoveChanged(); };
        box.appendChild(b);
      });
    }
    paint();
  };
  window.bpDragInit = function(o){
    var board = o.board, d = null;
    function sqAt(x, y){ var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.sq') : null; }
    function end(e, cancel){
      if(!d) return; var ghost = d.ghost; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cn);
      var r = d.r, c = d.c; if(ghost.parentNode) ghost.remove(); d = null;
      if(cancel){ o.cancel(); return; }
      var sq = sqAt(e.clientX, e.clientY);
      if(sq){ var r2 = +sq.dataset.r, c2 = +sq.dataset.c; if(r2 === r && c2 === c) return; if(o.drop(r2, c2)) return; }
      o.cancel();
    }
    function move(e){ if(!d) return; d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px'; }
    function up(e){ end(e, false); }
    function cn(e){ end(e, true); }
    board.addEventListener('pointerdown', function(e){
      if(mode !== 'drag') return;
      var sq = e.target.closest('.sq'); if(!sq) return;
      var r = +sq.dataset.r, c = +sq.dataset.c; if(!o.canPick(r, c)) return;
      e.preventDefault(); o.pick(r, c);
      var now = board.querySelector('.sq[data-r="' + r + '"][data-c="' + c + '"]'), pc = now && now.querySelector('.pc'); if(!pc) return;
      var w = now.getBoundingClientRect().width, ghost = document.createElement('div');
      ghost.innerHTML = pc.innerHTML; ghost.style.cssText = 'position:fixed;z-index:50;pointer-events:none;width:' + (w * 1.25) + 'px;height:' + (w * 1.25) + 'px;transform:translate(-50%,-62%);filter:drop-shadow(0 8px 6px rgba(0,0,0,.45));left:' + e.clientX + 'px;top:' + e.clientY + 'px';
      pc.style.opacity = '.25'; document.body.appendChild(ghost);
      d = { r: r, c: c, ghost: ghost };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cn);
    });
    function sync(){ board.style.touchAction = mode === 'drag' ? 'none' : 'manipulation'; }
    var old = window.bpMoveChanged; window.bpMoveChanged = function(){ sync(); if(old) old(); };
    sync();
  };
})();
