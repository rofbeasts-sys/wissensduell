/* Profil-Leiste mit Elo (Schach und Dame): zeigt Name und Elo, beim Antippen Freunde und Bestenliste.
   Dazu die Einstellung "Gegner-Elo verbergen" (nur Anzeige bei mir, der Gegner sieht weiter, was seine Einstellung erlaubt). */
(function(root){
  var KEY = 'bp_hide_opp_elo';
  function hidden(){ try{ return localStorage.getItem(KEY) === '1'; }catch(e){ return false; } }
  function setHidden(v){ try{ localStorage.setItem(KEY, v ? '1' : '0'); }catch(e){} }
  function token(){ try{ return localStorage.getItem('wq_account_token') || ''; }catch(e){ return ''; } }
  function esc(x){ return String(x).replace(/[&<>"]/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }
  function post(url, body){
    body.token = token();
    return fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) }).then(function(r){ return r.json(); });
  }
  function rows(list, de, me){
    if(!list || !list.length) return '<div style="opacity:.6;padding:6px 0">' + (de ? 'Noch niemand.' : 'Nobody yet.') + '</div>';
    return list.map(function(x, i){
      return '<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08)"><span style="width:26px;opacity:.6">' + (x.pos || (i + 1)) + '.</span><span style="flex:1;' + (x.name === me ? 'color:#7cff8c;font-weight:800' : '') + '">' + esc(x.name) + '</span><b style="color:#ffd45a">' + x.elo + '</b></div>';
    }).join('');
  }
  function panel(r, lang){
    var de = lang !== 'en', old = document.getElementById('bpEloOv'); if(old) old.remove();
    var ov = document.createElement('div'); ov.id = 'bpEloOv';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99996;background:rgba(5,8,20,.94);overflow:auto;font-family:system-ui,sans-serif;color:#fff;padding:16px';
    ov.innerHTML = '<div style="max-width:460px;margin:0 auto">'
      + '<div style="font-size:22px;font-weight:900;margin-bottom:4px">📈 ' + (de ? 'Deine Elo' : 'Your Elo') + '</div>'
      + '<div style="font-size:42px;font-weight:900;color:#ffd45a">' + r.elo + '</div>'
      + '<div style="opacity:.7;margin-bottom:14px">' + r.games + ' ' + (de ? 'Online-Partien' : 'online games') + (r.pos ? ' · ' + (de ? 'Platz ' : 'Rank ') + r.pos : '') + '</div>'
      + '<label style="display:flex;gap:10px;align-items:center;padding:12px;border:1px solid rgba(255,255,255,.2);border-radius:12px;margin-bottom:14px;cursor:pointer"><input type="checkbox" id="bpEloHide" style="width:20px;height:20px"' + (hidden() ? ' checked' : '') + '><span><b>' + (de ? 'Gegner-Elo verbergen' : 'Hide opponent Elo') + '</b><br><small style="opacity:.7">' + (de ? 'Ich sehe die Elo meines Gegners nicht, so spiele ich wie immer. Meine eigene sehe ich weiter.' : "I won't see my opponent's Elo, so I play like always. I still see my own.") + '</small></span></label>'
      + '<div style="font-weight:800;margin:8px 0 2px">👥 ' + (de ? 'Freunde' : 'Friends') + '</div>' + rows(r.friends, de, r.name)
      + '<div style="font-weight:800;margin:16px 0 2px">🏆 ' + (de ? 'Bestenliste' : 'Leaderboard') + '</div>' + rows(r.top, de, r.name)
      + '<button id="bpEloClose" style="margin-top:18px;width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-size:16px;cursor:pointer">' + (de ? 'Schließen' : 'Close') + '</button></div>';
    document.body.appendChild(ov);
    document.getElementById('bpEloHide').onchange = function(){ setHidden(this.checked); };
    document.getElementById('bpEloClose').onclick = function(){ ov.remove(); };
  }
  function mount(el, game, lang){
    if(typeof el === 'string') el = document.getElementById(el);
    if(!el) return;
    var de = lang !== 'en';
    el.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;margin:0 0 10px;border:1px solid rgba(255,255,255,.22);border-radius:14px;background:rgba(255,255,255,.06);font-weight:700;cursor:pointer;color:inherit';
    el.textContent = '👤 …';
    if(!token()){ el.textContent = '👤 ' + (de ? 'Melde dich an, um deine Elo zu sehen' : 'Log in to see your Elo'); el.style.cursor = 'default'; el.onclick = null; return; }
    post('/api/chess/elo-rank', { game: game }).then(function(r){
      if(!r || !r.ok){ el.textContent = '👤 Elo ?'; return; }
      el.innerHTML = '<span>👤 ' + esc(r.name) + '</span><span style="margin-left:auto;color:#ffd45a">Elo ' + r.elo + '</span><span style="opacity:.6">›</span>';
      el.onclick = function(){ panel(r, lang); };
    }).catch(function(){ el.textContent = '👤 Elo ?'; });
  }
  root.BpElo = { mount: mount, hidden: hidden, setHidden: setHidden };
})(typeof window !== 'undefined' ? window : this);
