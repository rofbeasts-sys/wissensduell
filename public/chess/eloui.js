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
  function tierList(r, de){
    var S = root.BpSets; if(!S) return '';
    var me = Math.max(S.maxElo(), r.elo || 0), t = S.list.filter(function(x){ return x.elo > 0; }).sort(function(a, b){ return a.elo - b.elo; });
    var rows2 = t.map(function(x){
      var ok = me >= x.elo;
      return '<div style="display:flex;align-items:center;gap:10px;padding:5px 8px;border-radius:10px;margin-bottom:4px;background:' + (ok ? 'rgba(198,255,61,.12)' : 'rgba(255,255,255,.05)') + '"><img src="/chess/sets/' + x.id + '/wN.png" style="width:38px;height:38px;' + (ok ? '' : 'opacity:.5;filter:grayscale(.6)') + '" alt=""><b style="flex:1">' + (de ? x.de : x.en) + '</b><span style="color:#ffd45a;font-weight:800">ab ' + x.elo + '</span><span style="width:20px;text-align:center">' + (ok ? '✅' : '🔒') + '</span></div>';
    }).join('');
    return '<div style="margin:0 0 14px"><div style="font-weight:800;margin:4px 0 2px">🏅 ' + (de ? 'Elo-Rangliste (Ränge)' : 'Elo ranks') + '</div>'
      + '<div style="opacity:.75;font-size:13px;margin-bottom:8px">' + (de ? 'Deine höchste Online-Elo: ' : 'Your highest online Elo: ') + '<b style="color:#ffd45a">' + me + '</b></div>' + rows2 + '</div>';
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
      + tierList(r, de)
      + '<button id="bpStyleBtn" style="width:100%;padding:12px;border-radius:12px;border:1px solid #c6ff3d;background:rgba(198,255,61,.12);color:#fff;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:14px">🎨 ' + (de ? 'Figuren und Brett wählen' : 'Choose pieces and board') + '</button>'
      + '<div style="font-weight:800;margin:8px 0 2px">👥 ' + (de ? 'Freunde' : 'Friends') + '</div>' + rows(r.friends, de, r.name)
      + '<div style="font-weight:800;margin:16px 0 2px">🏆 ' + (de ? 'Bestenliste' : 'Leaderboard') + '</div>' + rows(r.top, de, r.name)
      + '<button id="bpEloClose" style="margin-top:18px;width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-size:16px;cursor:pointer">' + (de ? 'Schließen' : 'Close') + '</button></div>';
    document.body.appendChild(ov);
    document.getElementById('bpEloHide').onchange = function(){ setHidden(this.checked); };
    document.getElementById('bpEloClose').onclick = function(){ ov.remove(); };
    document.getElementById('bpStyleBtn').onclick = function(){ stylePanel(lang); };
  }

  function tile(inner, label, sub, on, locked){
    return '<div style="width:92px;text-align:center;opacity:' + (locked ? '.45' : '1') + ';cursor:' + (locked ? 'default' : 'pointer') + ';border:2px solid ' + (on ? '#c6ff3d' : 'rgba(255,255,255,.18)') + ';border-radius:12px;padding:6px 4px;background:rgba(255,255,255,.05)">' + inner + '<div style="font-size:12px;font-weight:800;margin-top:2px">' + label + '</div><div style="font-size:10px;opacity:.7;min-height:12px">' + sub + '</div></div>';
  }
  function stylePanel(lang){
    var S = root.BpSets; if(!S) return;
    var de = lang !== 'en', old = document.getElementById('bpStyleOv'); if(old) old.remove();
    var ov = document.createElement('div'); ov.id = 'bpStyleOv';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99997;background:#05081a;overflow:auto;font-family:system-ui,sans-serif;color:#fff;padding:16px';
    var eo = document.getElementById('bpEloOv'); if(eo) eo.remove();
    var buy = null, msg = '', coins = null, hint = '', funken = null;
    function draw(){
      var cur = S.get(), bd = S.board().id, me = S.maxElo();
      function tl(x){
        var ok = S.unlocked(x.id), sub = '';
        if(!ok) sub = x.elo > 0 ? '🔒 ' + (de ? 'ab Elo ' : 'from Elo ') + x.elo : '🔒 ' + (de ? 'erspielen' : 'earn it');
        else if(x.price) sub = '✓ ' + (de ? 'gekauft' : 'owned'); else if(x.earn) sub = '✓ ' + (de ? 'erspielt' : 'earned'); else if(x.elo > 0) sub = '✓ Elo ' + x.elo;
        var img = x.id === 'alt' ? '<div style="height:64px;display:flex;align-items:center;justify-content:center;font-size:40px">♞</div>' : '<img src="/chess/sets/' + x.id + '/wN.png" style="width:64px;height:64px;display:block;margin:0 auto" alt="">';
        return '<div data-set="' + x.id + '">' + tile(img, de ? x.de : x.en, sub, cur === x.id, !ok) + '</div>';
      }
      function sec(t, arr){ return arr.length ? '<div style="font-weight:800;margin:14px 0 6px;opacity:.9">' + t + '</div><div style="display:flex;flex-wrap:wrap;gap:8px">' + arr.map(tl).join('') + '</div>' : ''; }
      var L = S.list;
      var sets = sec('♟ ' + (de ? 'Frei' : 'Free'), L.filter(function(x){ return !x.price && !x.earn && !(x.elo > 0); }))
        + sec('🏆 ' + (de ? 'Elo-Figuren' : 'Elo pieces'), L.filter(function(x){ return !x.price && !x.earn && x.elo > 0; }))
        + sec('⭐ ' + (de ? 'Erspielbar' : 'Earnable'), L.filter(function(x){ return x.earn; }))
        + sec('🛍 ' + (de ? 'Gekauft' : 'Owned'), L.filter(function(x){ return x.price && S.unlocked(x.id); }))
        + (L.some(function(x){ return x.price && !S.unlocked(x.id) && !x.off; }) ? '<div style="opacity:.65;font-size:13px;margin-top:12px">🛍 ' + (de ? 'Weitere Figuren gibt es im Brain-Shop unter „Schach-Figuren“.' : 'More pieces are in the Brain Shop under “Chess pieces”.') + '</div>' : '');
      var boards = S.boards.map(function(b){
        return '<div data-bd="' + b.id + '" style="cursor:pointer;text-align:center"><div style="width:64px;height:64px;border-radius:10px;border:2px solid ' + (bd === b.id ? '#c6ff3d' : 'rgba(255,255,255,.18)') + ';overflow:hidden;' + (b.img ? 'background:url(' + b.img + ') center/cover' : 'display:grid;grid-template-columns:1fr 1fr') + '">' + (b.img ? '' : '<i style="background:' + b.l + '"></i><i style="background:' + b.d + '"></i><i style="background:' + b.d + '"></i><i style="background:' + b.l + '"></i>') + '</div><div style="font-size:12px;font-weight:800;margin-top:2px">' + (de ? b.de : b.en) + '</div></div>';
      }).join('');
      var bx = buy ? S.list.filter(function(q){ return q.id === buy; })[0] : null;
      var buyBar = bx ? '<div style="margin:12px 0;padding:12px;border:1px solid #ffd45a;border-radius:12px;background:rgba(255,212,90,.1)"><b>' + (de ? bx.de : bx.en) + '</b> ' + (de ? 'für ' : 'for ') + '<b style="color:#ffd45a">' + bx.price + ' 🪙</b> ' + (de ? 'kaufen?' : 'buy?') + (coins != null ? ' <span style="opacity:.7">(' + (de ? 'du hast ' : 'you have ') + coins + ' 🪙' + (funken != null ? ', ' + funken + ' ✨' : '') + ')</span>' : '') + (msg ? '<div style="color:#ff8aa8;margin-top:6px">' + esc(msg) + '</div>' : '') + '<div style="display:flex;gap:8px;margin-top:10px">' + (bx.price >= 0 ? '<button id="bpBuyYes" style="flex:1;padding:10px;border-radius:10px;border:0;background:#c6ff3d;color:#08110c;font-weight:900;cursor:pointer">🪙 ' + bx.price + '</button>' : '') + (bx.fprice != null ? '<button id="bpBuyF" style="flex:1;padding:10px;border-radius:10px;border:0;background:linear-gradient(135deg,#ffd45a,#ff9f1c);color:#2a1700;font-weight:900;cursor:pointer">✨ ' + bx.fprice + '</button>' : '') + '<button id="bpBuyNo" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;cursor:pointer">' + (de ? 'Abbrechen' : 'Cancel') + '</button></div></div>' : '';
      ov.innerHTML = '<div style="max-width:520px;margin:0 auto"><div style="font-size:22px;font-weight:900;margin-bottom:4px">🎨 ' + (de ? 'Figuren und Brett' : 'Pieces and board') + '</div>'
        + '<div style="opacity:.7;font-size:13px;margin-bottom:12px">' + (de ? 'Deine höchste Online-Elo: ' : 'Your highest online Elo: ') + '<b style="color:#ffd45a">' + me + '</b>. ' + (de ? 'Die Elo-Figuren (Bronze bis Rubin) schaltest du frei, wenn deine Elo erreicht ist. Gekaufte Figuren stehen unter „Gekauft“.' : 'Elo pieces (Bronze to Ruby) unlock when you reach their Elo. Bought pieces are listed under “Owned”.') + '</div>'
        + (hint ? '<div style="margin:8px 0;padding:10px 12px;border:1px solid #ffd45a;border-radius:12px;background:rgba(255,212,90,.1);font-size:14px">' + esc(hint) + '</div>' : '') + '' + sets + buyBar
        + '<div style="font-weight:800;margin:18px 0 6px">▦ ' + (de ? 'Brettfarbe' : 'Board colour') + '</div><div style="display:flex;flex-wrap:wrap;gap:10px">' + boards + '</div>'
        + '<button id="bpStyleClose" style="margin-top:20px;width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-size:16px;cursor:pointer">' + (de ? 'Fertig' : 'Done') + '</button></div>';
      ov.querySelectorAll('[data-set]').forEach(function(el){ el.onclick = function(){
        var id = el.getAttribute('data-set'), x = S.list.filter(function(q){ return q.id === id; })[0];
        if(S.set(id)){ buy = null; hint = ''; again(); draw(); } else if(x && x.price){ buy = null; hint = '🛍 ' + (de ? 'Kaufe diese Figuren im Brain-Shop.' : 'Buy these pieces in the Brain Shop.'); draw(); } else if(x && x.elo > 0){ buy = null; hint = '🔒 ' + (de ? x.de : x.en) + ': ' + (de ? 'ab Elo ' : 'from Elo ') + x.elo + (de ? ' (deine höchste: ' : ' (your best: ') + S.maxElo() + ')'; draw(); } else if(x && x.earn){ buy = null; hint = '🔒 ' + (de ? x.de : x.en) + ': ' + (de ? x.hd : x.he); draw(); } }; });
      var bb = ov.querySelector('#bpBuyYes'); if(bb) bb.onclick = function(){
        var id = buy; bb.disabled = true; bb.textContent = '…';
        post('/api/pieceset-buy', { id: id, lang: lang }).then(function(r){
          if(r && r.ok){ S.setOwned(r.bought); coins = r.coins; S.set(id); buy = null; msg = ''; again(); }
          else msg = (r && r.error) || (de ? 'Kauf nicht möglich.' : 'Could not buy.');
          draw(); }).catch(function(){ msg = de ? 'Keine Verbindung.' : 'No connection.'; draw(); }); };
      var bf = ov.querySelector('#bpBuyF'); if(bf) bf.onclick = function(){
        var id = buy; bf.disabled = true; bf.textContent = '…';
        post('/api/funken-buy', { kind: 'pieceset', id: id, lang: lang }).then(function(r){
          if(r && r.ok){ funken = r.funken; if(r.sets) S.setOwned(r.sets); S.set(id); buy = null; msg = ''; again(); }
          else msg = (r && r.error) || (de ? 'Kauf nicht möglich.' : 'Could not buy.');
          draw(); }).catch(function(){ msg = de ? 'Keine Verbindung.' : 'No connection.'; draw(); }); };
      var bn = ov.querySelector('#bpBuyNo'); if(bn) bn.onclick = function(){ buy = null; msg = ''; draw(); };
      ov.querySelectorAll('[data-bd]').forEach(function(el){ el.onclick = function(){ S.setBoard(el.getAttribute('data-bd')); draw(); }; });
      ov.querySelector('#bpStyleClose').onclick = function(){ ov.remove(); again(); };
    }
    function again(){ try{ if(typeof root.render === 'function') root.render(); }catch(e){} }
    document.body.appendChild(ov); draw();
    if(token()) post('/api/pieceset-status', {}).then(function(r){ if(r && r.ok){ S.setOwned(r.bought); coins = r.coins; funken = r.funken; if(r.cfg) S.list.forEach(function(x){ var c = r.cfg['set_' + x.id]; if(c && x.price){ x.price = c.coins === null ? -1 : c.coins; x.fprice = c.funken; x.off = !c.on; } }); draw(); } }).catch(function(){});
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
      try{ if(root.BpSets && r.placed !== false) root.BpSets.noteElo(r.elo); }catch(e){}
      el.innerHTML = '<span>👤 ' + esc(r.name) + '</span><span style="margin-left:auto;color:#ffd45a">' + (r.placed === false ? (de ? 'Platzierung läuft' : 'In placement') : 'Elo ' + r.elo) + '</span><span style="opacity:.6">›</span>';
      el.onclick = function(){ panel(r, lang); };
    }).catch(function(){ el.textContent = '👤 Elo ?'; });
  }
  root.BpElo = { mount: mount, stylePanel: stylePanel, hidden: hidden, setHidden: setHidden };
})(typeof window !== 'undefined' ? window : this);
