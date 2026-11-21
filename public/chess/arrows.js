/* Schach: Gedankenzüge. Rechte Maustaste ziehen (oder auf dem Handy lange drücken und ziehen) = Pfeil.
   Farbe nach Start: eigene Figur blau, Figur des Gegners rot, leeres Feld grün. Rechtsklick auf ein Feld = Kreis (gleiche Farbregel). Linksklick auf das Brett löscht alle Pfeile.
   Die Pfeile liegen auf einer eigenen Ebene ueber dem Brett und aendern nichts am Spiel. */
(function(){
  var NS = 'http://www.w3.org/2000/svg';
  window.bpArrows = function(board){
    var wrap = board.parentElement; if(!wrap) return;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('style', 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;overflow:visible');
    wrap.appendChild(svg);
    var items = [], cur = null, timer = null, startPt = null, touchMode = false, mode = false, lstart = null, drew = false;
    var en = /^en/i.test((document.documentElement.lang || navigator.language || ''));
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:8px;justify-content:center;margin:10px 0';
    var btn = document.createElement('button'), clr = document.createElement('button');
    var css = 'padding:10px 16px;border-radius:12px;border:1px solid #3a4a6a;background:#14203a;color:#e8eefc;font:600 14px system-ui,sans-serif;cursor:pointer';
    btn.style.cssText = css; clr.style.cssText = css; btn.type = clr.type = 'button';
    clr.textContent = en ? 'Clear' : 'Löschen';
    function label(){ btn.textContent = (en ? 'Arrows: ' : 'Pfeile: ') + (mode ? (en ? 'ON' : 'AN') : (en ? 'off' : 'aus')); btn.style.background = mode ? '#1e5fd0' : '#14203a'; board.style.touchAction = 'none'; }
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
    // Farbe nach Herkunft: Figur des Gegners = rot, eigene Figur = blau, leeres Feld = grün
    var COLS = { mine: ['#2f7bff', 'rgba(47,123,255,.82)'], opp: ['#ef3b4a', 'rgba(239,59,74,.84)'], free: ['#22b573', 'rgba(34,181,115,.82)'] };
    function kindAt(sq){
      var e = sqEl(sq[0], sq[1]), pc = e && e.querySelector('.pc'); if(!pc) return 'free';
      var mine = 'w'; try{ if(typeof window.bpMyColor === 'function') mine = window.bpMyColor() || 'w'; }catch(er){}
      return pc.classList.contains(mine) ? 'mine' : (pc.classList.contains('w') || pc.classList.contains('b') ? 'opp' : 'free');
    }
    function el(n, at){ var e = document.createElementNS(NS, n); for(var k in at) e.setAttribute(k, at[k]); return e; }
    function paint(){
      svg.innerHTML = '';
      var all = items.slice(); if(cur) all.push(Object.assign({ prev: true }, cur));
      all.forEach(function(it){
        var a = ctr(it.a[0], it.a[1]), b = ctr(it.b[0], it.b[1]); if(!a || !b) return;
        var col = COLS[it.k || 'free'], op = it.prev ? .55 : 1, g = el('g', { opacity: op, style: 'filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))' });
        if(same(it.a, it.b)){
          g.appendChild(el('circle', { cx: a.x, cy: a.y, r: a.s * .43, fill: col[1].replace(/[\d.]+\)$/, '.14)'), stroke: col[1], 'stroke-width': Math.max(3, a.s * .075) }));
          svg.appendChild(g); return;
        }
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len, px = -uy, py = ux;
        var hw = Math.max(3.5, a.s * .085), hh = a.s * .27, hl = a.s * .36, off = a.s * .12;
        var sx = a.x + ux * off, sy = a.y + uy * off, tx = b.x - ux * a.s * .1, ty = b.y - uy * a.s * .1, bx = tx - ux * hl, by = ty - uy * hl;
        if((bx - sx) * ux + (by - sy) * uy < 0){ bx = sx; by = sy; }
        var d = 'M' + (sx + px * hw) + ',' + (sy + py * hw) + ' L' + (bx + px * hw) + ',' + (by + py * hw) + ' L' + (bx + px * hh) + ',' + (by + py * hh) + ' L' + tx + ',' + ty
          + ' L' + (bx - px * hh) + ',' + (by - py * hh) + ' L' + (bx - px * hw) + ',' + (by - py * hw) + ' L' + (sx - px * hw) + ',' + (sy - py * hw) + ' Z';
        g.appendChild(el('path', { d: d, fill: col[1], stroke: col[1], 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
        g.appendChild(el('circle', { cx: sx, cy: sy, r: hw, fill: col[1] }));
        svg.appendChild(g);
      });
    }
    function commit(){
      if(!cur) return;
      var i = -1; items.forEach(function(it, k){ if(same(it.a, cur.a) && same(it.b, cur.b)) i = k; });
      if(i >= 0) items.splice(i, 1); else items.push({ a: cur.a, b: cur.b, k: kindAt(cur.a) });
      cur = null; paint();
    }
    function begin(x, y){ var s = sqAt(x, y); if(!s) return false; cur = { a: s, b: s, k: kindAt(s) }; paint(); try{ window.dispatchEvent(new Event('bp-arrow-start')); }catch(e){} return true; }
    function track(x, y){ if(!cur) return; var s = sqAt(x, y); if(s && !same(s, cur.b)){ cur.b = s; paint(); } }
    board.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    board.addEventListener('pointerdown', function(e){
      if(mode){ e.preventDefault(); e.stopPropagation(); if(begin(e.clientX, e.clientY)) touchMode = true; return; }
      if(e.pointerType === 'mouse'){
        if(e.button === 2){ e.preventDefault(); e.stopPropagation(); if(begin(e.clientX, e.clientY)){ touchMode = false; } return; }
        if(e.button === 0){ if(items.length){ items = []; paint(); } var s0 = sqAt(e.clientX, e.clientY); lstart = (s0 && kindAt(s0) !== 'mine') ? { x: e.clientX, y: e.clientY, s: s0 } : null; }
        return;
      }
      // Finger: lange (0,45 s) auf einem Feld bleiben, dann ziehen
      if(items.length && e.pointerType !== 'mouse'){ /* ein Tippen loescht spaeter, siehe pointerup */ }
      startPt = { x: e.clientX, y: e.clientY, t: Date.now() };
      clearTimeout(timer);
      timer = setTimeout(function(){ if(startPt && begin(startPt.x, startPt.y)){ touchMode = true; try{ navigator.vibrate && navigator.vibrate(15); }catch(er){} } }, 450);
    }, true);
    window.addEventListener('pointermove', function(e){
      if(!cur && lstart && (e.buttons & 1)){ var sn = sqAt(e.clientX, e.clientY); if(sn && !same(sn, lstart.s) && Math.abs(e.clientX - lstart.x) + Math.abs(e.clientY - lstart.y) > 10){ if(begin(lstart.x, lstart.y)){ touchMode = false; drew = true; } lstart = null; } }
      if(cur){ e.preventDefault(); track(e.clientX, e.clientY); return; }
      if(startPt && Math.abs(e.clientX - startPt.x) + Math.abs(e.clientY - startPt.y) > 10){ clearTimeout(timer); startPt = null; }
    }, { passive: false });
    function up(e){
      clearTimeout(timer); lstart = null; if(drew){ setTimeout(function(){ drew = false; }, 60); }
      if(cur){ track(e.clientX, e.clientY); commit(); touchMode = false; startPt = null; return; }
      if(startPt && e.pointerType !== 'mouse' && items.length && Date.now() - startPt.t < 450){ items = []; paint(); }
      startPt = null;
    }
    window.addEventListener('pointerup', up);
    board.addEventListener('click', function(e){ if(drew){ e.stopPropagation(); e.preventDefault(); return; } if(mode){ e.stopPropagation(); e.preventDefault(); } }, true);
    window.addEventListener('pointercancel', function(){ clearTimeout(timer); cur = null; startPt = null; paint(); });
    document.addEventListener('touchmove', function(e){ if(cur && touchMode) e.preventDefault(); }, { passive: false });
    window.addEventListener('resize', paint);
    try{ new MutationObserver(paint).observe(board, { childList: true }); }catch(e){}
    window.bpArrowsClear = function(){ items = []; cur = null; paint(); };
  };
})();
