/* Browser-Staende (Schach-Fortschritt, Skins, Haken ...) mit dem Konto abgleichen, damit sie auf jedem Geraet und in jedem Browser gleich sind.
   Ablauf: Beim Laden und danach bei Aenderungen schickt diese Datei die betroffenen Eintraege an /api/cloud-sync.
   Der Server mischt (Zahlen = Maximum, Listen = Vereinigung) und gibt den Gesamtstand zurueck. Nichts wird kleiner. */
(function(){
  'use strict';
  if(window.__bpCloudSync) return; window.__bpCloudSync = true;
  var KEY_RE = /^(bp_ch_done|bp_sets_owned|bp_sets_earned|bp_piece_set|bp_board_theme|bp_max_elo|bp_max_elo_dame|bp_chess_wins|bp_chess_online_stats|bp_hide_opp_elo|bp_ttt_style|bp_ttt_maxrank|bp_fu_skin|bp_ln_done|dm_skin|bp_ea_[A-Za-z0-9_]*|bp_ladder2_[A-Za-z0-9_]*|bp_wo_[A-Za-z0-9_]*|bp_wb_[A-Za-z0-9_]*)$/;
  var t0 = Date.now(), busy = false, timer = null, lastSent = '';
  function tok(){ try{ return localStorage.getItem('wq_account_token') || ''; }catch(e){ return ''; } }
  function collect(){
    var o = {};
    try{ for(var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if(KEY_RE.test(k)){ var v = localStorage.getItem(k); if(typeof v === 'string' && v.length <= 20000) o[k] = v; } } }catch(e){}
    return o;
  }
  // Zahlen/Listen/Haken so mischen wie der Server (damit die Seite nach dem Abgleich denselben Stand zeigt)
  function mv(a, b, d){
    d = d || 0; if(d > 6) return b;
    if(a == null) return b; if(b == null) return a;
    if(typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if(typeof a === 'boolean' && typeof b === 'boolean') return a || b;
    if(Array.isArray(a) && Array.isArray(b)){ var seen = {}, out = []; a.concat(b).forEach(function(x){ var k = JSON.stringify(x); if(!seen[k]){ seen[k] = 1; out.push(x); } }); return out; }
    if(typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)){ var r = {}; Object.keys(a).concat(Object.keys(b)).forEach(function(k){ if(k === '__proto__' || k === 'constructor') return; r[k] = mv(a[k], b[k], d + 1); }); return r; }
    return b;
  }
  function apply(data){
    var changed = false;
    Object.keys(data || {}).forEach(function(k){
      if(!KEY_RE.test(k) || typeof data[k] !== 'string') return;
      var loc = null; try{ loc = localStorage.getItem(k); }catch(e){}
      var nv = data[k];
      if(loc !== null && loc !== nv){ // lokaler Wert da: nur zusammenfuehren, Auswahl-Texte (Skin, Brett) behalten wir lokal
        try{ var a = JSON.parse(loc), b = JSON.parse(nv); if(a !== null && b !== null && typeof a === typeof b) nv = JSON.stringify(mv(a, b)); else nv = loc; }catch(e){ nv = loc; }
      }
      if(nv !== loc){ try{ localStorage.setItem(k, nv); changed = true; }catch(e){} }
    });
    return changed;
  }
  function sync(first){
    var t = tok(); if(!t || busy || typeof fetch !== 'function') return;
    var data = collect(), sig = JSON.stringify(data);
    if(!first && sig === lastSent) return;
    busy = true;
    fetch('/api/cloud-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t, data: data }), keepalive: sig.length < 30000 })
      .then(function(r){ return r.json(); })
      .then(function(r){
        busy = false;
        if(!r || !r.ok){ return; }
        var changed = apply(r.data);
        lastSent = JSON.stringify(collect());
        // Seite hat ihren Stand schon gelesen: einmal neu laden, damit der neue Stand sichtbar wird (nur direkt nach dem Start, nie waehrend einer Partie)
        if(changed && Date.now() - t0 < 20000){
          var done = false; try{ done = sessionStorage.getItem('bp_cs_reload') === '1'; sessionStorage.setItem('bp_cs_reload', '1'); }catch(e){ done = true; }
          if(!done) location.reload();
        }
      })
      .catch(function(){ busy = false; });
  }
  function soon(){ clearTimeout(timer); timer = setTimeout(function(){ sync(false); }, 3000); }
  // Aenderungen an den betroffenen Eintraegen erkennen (setItem abfangen)
  try{
    var orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v){ var r = orig.apply(this, arguments); try{ if(this === window.localStorage && KEY_RE.test(k)) soon(); }catch(e){} return r; };
  }catch(e){}
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'hidden') sync(false); });
  window.addEventListener('pagehide', function(){ sync(false); });
  setInterval(function(){ sync(false); }, 60000);
  window.BpCloudSync = { now: function(){ sync(true); } };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ sync(true); }, 800); });
  else setTimeout(function(){ sync(true); }, 800);
})();
