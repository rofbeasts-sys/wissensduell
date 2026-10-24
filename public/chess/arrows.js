/* Schach: Gedankenzüge. Rechte Maustaste ziehen (oder auf dem Handy lange drücken und ziehen) = blauer Pfeil.
   Rechtsklick auf ein Feld = Kreis. Linksklick auf das Brett löscht alle Pfeile.
   Die Pfeile liegen auf einer eigenen Ebene ueber dem Brett und aendern nichts am Spiel. */
(function(){
  var NS = 'http://www.w3.org/2000/svg', COL = 'rgba(40,120,255,.82)';
  window.bpArrows = function(board){
    var wrap = board.parentElement; if(!wrap) return;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('style', 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;overflow:visible');
    wrap.appendChild(svg);
    var items = [], cur = null, timer = null, startPt = null, touchMode = false, mode = false;
    var en = /^en/i.test((document.documentElement.lang || navigator.language || ''));
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:8px;justify-content:center;margin:10px 0';
    var btn = document.createElement('button'), clr = document.createElement('button');
    var css = 'padding:10px 16px;border-radius:12px;border:1px solid #3a4a6a;background:#14203a;color:#e8eefc;font:600 14px system-ui,sans-serif;cursor:pointer';
    btn.style.cssText = css; clr.style.cssText = css; btn.type = clr.type = 'button';
    clr.textContent = en ? 'Clear' : 'Löschen';
    function label(){ btn.textContent = (en ? 'Arrows: ' : 'Pfeile: ') + (mode ? (en ? 'ON' : 'AN') : (en ? 'off' : 'aus')); btn.style.background = mode ? '#1e5fd0' : '#14203a'; board.style.touchAction = mode ? 'none' : ''; }
    btn.onclick = function(){ mode = !mode; cur = null; label(); };
    clr.onclick = function(){ items = []; cur = null; paint(); };
    bar.appendChild(btn); bar.appendChild(clr);
    wrap.parentNode.insertBefore(bar, wrap.nextSibling);
    label();
    function sqEl(r, c){ return board.querySelector('.sq[data-r="' + r + '"][data-c="' + c + '"]'); }
    function ctr(r, c){
      var e = sqEl(r, c); if(!e) return null;
      var b = wrap.getBoundingClientRect(), q = e.getBoundingClientRect();
      return { x: q.left - b.left + q.width / 2, y: q.top - b.top + q.height / 2, s: q.width };
    }
    function sqAt(x, y){
      var el = document.elementFromPoint(x, y), q = el && el.closest ? el.closest('.sq') : null;
      return q && board.contains(q) ? [+q.dataset.r, +q.dataset.c] : null;
    }
    function same(a, b){ return a[0] === b[0] && a[1] === b[1]; }
    function paint(){
      svg.innerHTML = '';
      var all = items.slice(); if(cur) all.push(cur);
      all.forEach(function(it){
        var a = ctr(it.a[0], it.a[1]), b = ctr(it.b[0], it.b[1]); if(!a || !b) return;
        if(same(it.a, it.b)){
          var ci = document.createElementNS(NS, 'circle');
          ci.setAttribute('cx', a.x); ci.setAttribute('cy', a.y); ci.setAttribute('r', a.s * .44);
          ci.setAttribute('fill', 'none'); ci.setAttribute('stroke', COL); ci.setAttribute('stroke-width', Math.max(3, a.s * .07));
          svg.appendChild(ci); return;
        }
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
        var w = Math.max(5, a.s * .17), head = a.s * .42, x1 = a.x + ux * a.s * .22, y1 = a.y + uy * a.s * .22, x2 = b.x - ux * head * .6, y2 = b.y - uy * head * .6;
        var ln = document.createElementNS(NS, 'line');
        ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
        ln.setAttribute('stroke', COL); ln.setAttribute('stroke-width', w); ln.setAttribute('stroke-linecap', 'round');
        svg.appendChild(ln);
        var px = -uy, py = ux, tx = b.x - ux * a.s * .08, ty = b.y - uy * a.s * .08;
        var pg = document.createElementNS(NS, 'polygon');
        pg.setAttribute('points', [tx, ty, tx - ux * head + px * head * .5, ty - uy * head + py * head * .5, tx - ux * head - px * head * .5, ty - uy * head - py * head * .5].join(','));
        pg.setAttribute('fill', COL); svg.appendChild(pg);
      });
    }
    function commit(){
      if(!cur) return;
      var i = -1; items.forEach(function(it, k){ if(same(it.a, cur.a) && same(it.b, cur.b)) i = k; });
      if(i >= 0) items.splice(i, 1); else items.push({ a: cur.a, b: cur.b });
      cur = null; paint();
    }
    function begin(x, y){ var s = sqAt(x, y); if(!s) return false; cur = { a: s, b: s }; paint(); return true; }
    function track(x, y){ if(!cur) return; var s = sqAt(x, y); if(s && !same(s, cur.b)){ cur.b = s; paint(); } }
    board.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    board.addEventListener('pointerdown', function(e){
      if(mode){ e.preventDefault(); e.stopPropagation(); if(begin(e.clientX, e.clientY)) touchMode = true; return; }
      if(e.pointerType === 'mouse'){
        if(e.button === 2){ e.preventDefault(); e.stopPropagation(); if(begin(e.clientX, e.clientY)){ touchMode = false; } return; }
        if(e.button === 0 && items.length){ items = []; paint(); }
        return;
      }
      // Finger: lange (0,45 s) auf einem Feld bleiben, dann ziehen
      if(items.length && e.pointerType !== 'mouse'){ /* ein Tippen loescht spaeter, siehe pointerup */ }
      startPt = { x: e.clientX, y: e.clientY, t: Date.now() };
      clearTimeout(timer);
      timer = setTimeout(function(){ if(startPt && begin(startPt.x, startPt.y)){ touchMode = true; try{ navigator.vibrate && navigator.vibrate(15); }catch(er){} } }, 450);
    }, true);
    window.addEventListener('pointermove', function(e){
      if(cur){ e.preventDefault(); track(e.clientX, e.clientY); return; }
      if(startPt && Math.abs(e.clientX - startPt.x) + Math.abs(e.clientY - startPt.y) > 10){ clearTimeout(timer); startPt = null; }
    }, { passive: false });
    function up(e){
      clearTimeout(timer);
      if(cur){ track(e.clientX, e.clientY); commit(); touchMode = false; startPt = null; return; }
      if(startPt && e.pointerType !== 'mouse' && items.length && Date.now() - startPt.t < 450){ items = []; paint(); }
      startPt = null;
    }
    window.addEventListener('pointerup', up);
    board.addEventListener('click', function(e){ if(mode){ e.stopPropagation(); e.preventDefault(); } }, true);
    window.addEventListener('pointercancel', function(){ clearTimeout(timer); cur = null; startPt = null; paint(); });
    document.addEventListener('touchmove', function(e){ if(cur && touchMode) e.preventDefault(); }, { passive: false });
    window.addEventListener('resize', paint);
    try{ new MutationObserver(paint).observe(board, { childList: true }); }catch(e){}
    window.bpArrowsClear = function(){ items = []; cur = null; paint(); };
  };
})();
