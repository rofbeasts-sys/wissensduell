/* BpRec: letzte Schach-Partie 24 Stunden speichern, als Zugliste (PGN) und als Video (Hochformat) herunterladen */
(function(){
  var KEY = 'bp_chess_games', MAXG = 5, TTL = 24 * 3600 * 1000, cur = null, vidBusy = false, vidUrl = null, vidBlob = null, vidExt = 'webm';
  function de(){ try{ return LANG !== 'en'; }catch(e){ return true; } }
  function sq(r, c){ return 'abcdefgh'[c] + (8 - r); }
  function sanOf(board, mv, last){
    var p = board[mv.fr][mv.fc], s = '';
    if(mv.castle){ s = mv.castle === 'k' ? 'O-O' : 'O-O-O'; }
    else{
      var cap = board[mv.tr][mv.tc] || mv.ep;
      if(p.t === 'P'){ if(cap) s += 'abcdefgh'[mv.fc] + 'x'; s += sq(mv.tr, mv.tc); if(mv.promTo) s += '=' + mv.promTo; }
      else{
        s += p.t;
        var o = getAllLegalMoves(board, p.col, last).filter(function(m){ return m.tr === mv.tr && m.tc === mv.tc && board[m.fr][m.fc].t === p.t && !(m.fr === mv.fr && m.fc === mv.fc); });
        if(o.length){
          var sf = o.some(function(m){ return m.fc === mv.fc; }), sr = o.some(function(m){ return m.fr === mv.fr; });
          if(!sf) s += 'abcdefgh'[mv.fc]; else if(!sr) s += (8 - mv.fr); else s += sq(mv.fr, mv.fc);
        }
        if(cap) s += 'x'; s += sq(mv.tr, mv.tc);
      }
    }
    var nb = applyMove(board, mv), opp = p.col === 'w' ? 'b' : 'w';
    if(isInCheck(nb, opp)) s += getAllLegalMoves(nb, opp, mv).length ? '+' : '#';
    return s;
  }
  function start(meta, board){
    if(!meta){ cur = null; return; }
    cur = { v: 2, ts: Date.now(), me: meta.me, opp: meta.opp, ch: meta.ch || null, moves: [] };
    try{ var j = JSON.stringify(board); if(j && j !== JSON.stringify(initBoard())) cur.init = JSON.parse(j); }catch(e){}
  }
  function move(board, mv, last){
    if(!cur) return;
    try{
      var p = board[mv.fr][mv.fc], tgt = board[mv.tr][mv.tc];
      cur.moves.push({ fr: mv.fr, fc: mv.fc, tr: mv.tr, tc: mv.tc, castle: mv.castle || null, ep: !!mv.ep, promTo: mv.promTo || null, col: p.col, cap: tgt ? tgt.t : (mv.ep ? 'P' : null), san: sanOf(board, mv, last) });
    }catch(e){ cur = null; }
  }
  function end(res){
    if(!cur || cur.moves.length < 2) return;
    cur.res = res.result; cur.why = res.why || ''; cur.ts = Date.now();
    var all = list(); all.unshift(cur); all = all.slice(0, MAXG);
    try{ localStorage.setItem(KEY, JSON.stringify(all)); }catch(e){ try{ localStorage.setItem(KEY, JSON.stringify(all.slice(0, 2))); }catch(e2){} }
    cur = null;
  }
  function list(){
    try{
      var a = JSON.parse(localStorage.getItem(KEY) || '[]'); if(!Array.isArray(a)) return [];
      var ok = a.filter(function(r){ return r && r.moves && Date.now() - r.ts <= TTL; }).slice(0, MAXG);
      if(ok.length !== a.length){ try{ localStorage.setItem(KEY, JSON.stringify(ok)); }catch(e){} }
      return ok;
    }catch(e){ return []; }
  }
  function load(){ return list()[0] || null; }
  function left(r){ var m = Math.max(0, TTL - (Date.now() - r.ts)), h = Math.floor(m / 3600000), mi = Math.floor((m % 3600000) / 60000); return de() ? 'Noch ' + h + ' Std ' + mi + ' Min gespeichert' : h + ' h ' + mi + ' min left'; }
  function resTok(r){ var w = r.me === 'w'; return r.res === 'draw' ? '1/2-1/2' : (r.res === 'win') === w ? '1-0' : '0-1'; }
  function pgn(r){
    var d = new Date(r.ts), ds = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    var you = de() ? 'Du' : 'You', on = (r.opp && r.opp.name) || 'Bot';
    var h = '[Event "Brain Pulse"]\n[Site "' + location.host + '"]\n[Date "' + ds + '"]\n[White "' + (r.me === 'w' ? you : on) + '"]\n[Black "' + (r.me === 'w' ? on : you) + '"]\n[Result "' + resTok(r) + '"]\n';
    if(r.opp && r.opp.elo) h += '[' + (r.me === 'w' ? 'Black' : 'White') + 'Elo "' + r.opp.elo + '"]\n';
    var t = ''; r.moves.forEach(function(m, i){ if(i % 2 === 0) t += (i / 2 + 1) + '. '; t += m.san + ' '; });
    return h + '\n' + t + resTok(r) + '\n';
  }
  function save(name, blob){ var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  function fname(r, ext){ var d = new Date(r.ts); return 'schach-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '.' + ext; }

  /* ---------- Video ---------- */
  var GL = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
  var FONT = '"Segoe UI Symbol","Noto Sans Symbols 2","Noto Sans Symbols","Apple Symbols","DejaVu Sans",sans-serif';
  function dsan(s){ if(!de()) return s; return s.replace(/^([KQRBN])/, function(x){ return { K: 'K', Q: 'D', R: 'T', B: 'L', N: 'S' }[x]; }).replace(/=([QRBN])/, function(x, y){ return '=' + { Q: 'D', R: 'T', B: 'L', N: 'S' }[y]; }); }
  function boards(r){
    var bs = [r.init ? JSON.parse(JSON.stringify(r.init)) : initBoard()], last = null;
    r.moves.forEach(function(m){ var mv = { fr: m.fr, fc: m.fc, tr: m.tr, tc: m.tc, castle: m.castle, ep: m.ep, promTo: m.promTo }; var legal = getAllLegalMoves(bs[bs.length - 1], m.col, last).filter(function(x){ return x.fr === m.fr && x.fc === m.fc && x.tr === m.tr && x.tc === m.tc && (x.promTo || null) === (m.promTo || null); })[0] || mv; bs.push(applyMove(bs[bs.length - 1], legal)); last = legal; });
    return bs;
  }
  function rr(x, c, a, b, w, h, r){ c.beginPath(); c.moveTo(a + r, b); c.arcTo(a + w, b, a + w, b + h, r); c.arcTo(a + w, b + h, a, b + h, r); c.arcTo(a, b + h, a, b, r); c.arcTo(a, b, a + w, b, r); c.closePath(); }
  function piece(c, p, x, y, cell){
    c.font = Math.round(cell * 0.82) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(2, cell * 0.04); c.lineJoin = 'round';
    c.strokeStyle = p.col === 'w' ? '#1a1a1a' : '#e8e8e8'; c.fillStyle = p.col === 'w' ? '#ffffff' : '#141414';
    c.strokeText(GL[p.t], x + cell / 2, y + cell * 0.54); c.fillText(GL[p.t], x + cell / 2, y + cell * 0.54);
  }
  function makeVideo(r, onProg){
    return new Promise(function(resolve, reject){
      var W = 720, H = 1280, cell = 90, BX = 0, BY = 240, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var c = cv.getContext('2d'), bs = boards(r), n = r.moves.length, per = n > 120 ? 450 : 700, slide = Math.round(per * 0.45);
      var T0 = 2000, T1 = T0 + 600, TEND = T1 + n * per, TOT = TEND + 3000, flip = r.me === 'b', you = de() ? 'Du' : 'You';
      var on = (r.opp && r.opp.name) || 'Bot', oelo = r.opp && r.opp.elo ? r.opp.elo : 0, img = null;
      function go(){
        var mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].filter(function(m){ try{ return MediaRecorder.isTypeSupported(m); }catch(e){ return false; } })[0];
        if(!mime){ reject(new Error(de() ? 'Dein Browser kann kein Video aufnehmen.' : 'Your browser cannot record video.')); return; }
        vidExt = /mp4/.test(mime) ? 'mp4' : 'webm';
        var stream = cv.captureStream(30), ac = null;
        try{
          ac = new (window.AudioContext || window.webkitAudioContext)(); var dest = ac.createMediaStreamDestination(); stream.addTrack(dest.stream.getAudioTracks()[0]);
          var t0a = ac.currentTime + 0.15;
          var blip = function(at, f, d, ty, v){ var o = ac.createOscillator(), g = ac.createGain(); o.type = ty; o.frequency.value = f; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + d); o.connect(g); g.connect(dest); o.start(at); o.stop(at + d + 0.02); };
          r.moves.forEach(function(m, i){ var at = t0a + (T1 + i * per + slide) / 1000; blip(at, m.cap ? 150 : 330, m.cap ? 0.16 : 0.08, m.cap ? 'sawtooth' : 'triangle', m.cap ? 0.18 : 0.12); });
          if(r.res === 'win') [523, 659, 784, 1047].forEach(function(f, k){ blip(t0a + (TEND + 300) / 1000 + k * 0.12, f, 0.3, 'triangle', 0.14); });
        }catch(e){ ac = null; }
        var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3500000 }), chunks = [];
        rec.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function(){ try{ ac && ac.close(); }catch(e){} resolve(new Blob(chunks, { type: mime.split(';')[0] })); };
        rec.onerror = function(e){ reject(e.error || new Error('rec')); };
        var t0 = performance.now(); rec.start(500);
        var iv = setInterval(function(){
          var t = performance.now() - t0; if(t >= TOT){ clearInterval(iv); draw(TOT - 1); setTimeout(function(){ rec.stop(); }, 250); onProg(1); return; }
          draw(t); onProg(t / TOT);
        }, 33);
      }
      function X(col){ return BX + (flip ? 7 - col : col) * cell; } function Y(row){ return BY + (flip ? 7 - row : row) * cell; }
      function bar(y, name, sub, who, caps){
        c.fillStyle = '#151a45'; rr(0, c, 16, y, W - 32, 92, 16); c.fill();
        c.save(); c.beginPath(); c.arc(70, y + 46, 34, 0, 7); c.clip();
        if(who === 'opp' && img){ c.drawImage(img, 36, y + 12, 68, 68); } else { c.fillStyle = who === 'opp' ? '#f0a64a' : '#46e0ff'; c.fillRect(36, y + 12, 68, 68); c.fillStyle = '#10142e'; c.font = '700 38px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(who === 'opp' ? name[0].toUpperCase() : '★', 70, y + 48); }
        c.restore();
        c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = '#eef1ff'; c.font = '700 32px sans-serif'; c.fillText(name, 124, y + 40);
        if(sub){ c.fillStyle = '#ffd45a'; c.font = '700 26px sans-serif'; c.fillText(sub, 124 + c.measureText(name).width + 0, y + 40); }
        var x = 124; c.font = '30px ' + FONT; c.textBaseline = 'middle'; c.textAlign = 'left';
        caps.forEach(function(t){ c.fillStyle = '#d6dbff'; c.fillText(GL[t], x, y + 70); x += 28; });
      }
      function capsOf(k, col){ var o = []; for(var i = 0; i < k; i++){ var m = r.moves[i]; if(m.cap && m.col === col) o.push(m.cap); } var V = { Q: 5, R: 4, B: 3, N: 2, P: 1 }; return o.sort(function(a, b){ return V[b] - V[a]; }); }
      function draw(t){
        c.fillStyle = '#0c1030'; c.fillRect(0, 0, W, H);
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        if(t < T0){ intro(t); return; }
        var k = t < T1 ? 0 : Math.min(n, Math.floor((t - T1) / per) + 1), prog = 1, base;
        if(t >= T1 && k <= n && k >= 1){ prog = Math.min(1, ((t - T1) - (k - 1) * per) / slide); }
        if(t >= TEND) k = n;
        var m = k ? r.moves[k - 1] : null, shown = bs[k];
        c.fillStyle = '#c6ff3d'; c.font = '700 40px sans-serif'; c.fillText((de() ? 'SCHACH' : 'CHESS') + '  ·  Brain Pulse', W / 2, 88);
        var op = r.me === 'w' ? 'b' : 'w';
        bar(120, on, oelo ? String(oelo) : '', 'opp', capsOf(k, op));
        for(var rowi = 0; rowi < 8; rowi++) for(var coli = 0; coli < 8; coli++){
          var x = X(coli), y = Y(rowi); c.fillStyle = (rowi + coli) % 2 === 0 ? '#f4efd3' : '#1f7a3a'; c.fillRect(x, y, cell, cell);
          if(m && ((m.fr === rowi && m.fc === coli) || (m.tr === rowi && m.tc === coli))){ c.fillStyle = 'rgba(255,235,60,.55)'; c.fillRect(x, y, cell, cell); }
        }
        for(rowi = 0; rowi < 8; rowi++) for(coli = 0; coli < 8; coli++){
          var p = shown[rowi][coli]; if(!p) continue;
          if(m && prog < 1 && rowi === m.tr && coli === m.tc) continue;
          piece(c, p, X(coli), Y(rowi), cell);
        }
        if(m && prog < 1){
          var mp = shown[m.tr][m.tc], e = prog < .5 ? 2 * prog * prog : 1 - Math.pow(-2 * prog + 2, 2) / 2;
          var fx = X(m.fc), fy = Y(m.fr), tx = X(m.tc), ty = Y(m.tr); piece(c, mp, fx + (tx - fx) * e, fy + (ty - fy) * e, cell);
        }
        bar(BY + 8 * cell + 12, you, '', 'me', capsOf(k, r.me));
        movelist(k);
        if(t >= TEND){ c.fillStyle = 'rgba(12,16,48,.82)'; c.fillRect(0, 0, W, H); outro(); }
      }
      function movelist(k){
        var toks = []; r.moves.forEach(function(m, i){ if(i >= k) return; if(i % 2 === 0) toks.push({ t: (i / 2 + 1) + '.', n: 1 }); toks.push({ t: dsan(m.san), cur: i === k - 1 }); });
        c.font = '700 30px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
        var lines = [[]], x = 0, maxW = W - 64;
        toks.forEach(function(tk){ var w = c.measureText(tk.t).width + 26; if(x + w > maxW){ lines.push([]); x = 0; } lines[lines.length - 1].push({ tk: tk, w: w }); x += w; });
        lines = lines.slice(-3); var y0 = 1096 + 24;
        lines.forEach(function(ln, li){ var xx = 32, yy = y0 + li * 52;
          ln.forEach(function(o){ if(o.tk.cur){ c.fillStyle = '#c6ff3d'; rr(0, c, xx - 6, yy - 20, o.w - 8, 40, 10); c.fill(); c.fillStyle = '#1e3000'; } else c.fillStyle = o.tk.n ? '#7f89c9' : '#eef1ff'; c.fillText(o.tk.t, xx + 7, yy); xx += o.w; });
        });
      }
      function intro(t){
        var a = Math.min(1, t / 400), s = 0.9 + 0.1 * a; c.save(); c.globalAlpha = a; c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2);
        c.fillStyle = '#c6ff3d'; c.font = '700 110px sans-serif'; c.textAlign = 'center'; c.fillText(de() ? 'SCHACH' : 'CHESS', W / 2, 400);
        c.save(); c.beginPath(); c.arc(W / 2, 600, 120, 0, 7); c.clip();
        if(img) c.drawImage(img, W / 2 - 120, 480, 240, 240); else { c.fillStyle = '#f0a64a'; c.fillRect(W / 2 - 120, 480, 240, 240); }
        c.restore();
        c.fillStyle = '#eef1ff'; c.font = '700 54px sans-serif'; c.fillText((de() ? 'Du gegen ' : 'You vs ') + on, W / 2, 810); if(r.ch){ c.fillStyle = '#c6ff3d'; c.font = '700 40px sans-serif'; c.fillText('Challenge: ' + r.ch, W / 2, 960); }
        if(oelo){ c.fillStyle = '#ffd45a'; c.font = '700 44px sans-serif'; c.fillText('Elo ' + oelo, W / 2, 880); }
        c.fillStyle = '#7f89c9'; c.font = '700 36px sans-serif'; c.fillText('Brain Pulse', W / 2, 1120);
        c.restore();
      }
      function outro(){
        var win = r.res === 'win', dr = r.res === 'draw';
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillStyle = win ? '#c6ff3d' : dr ? '#ffd45a' : '#ff8a9a'; c.font = '700 110px sans-serif';
        c.fillText(win ? (de() ? 'Gewonnen!' : 'You won!') : dr ? (de() ? 'Remis' : 'Draw') : (de() ? 'Verloren' : 'You lost'), W / 2, 520);
        c.fillStyle = '#eef1ff'; c.font = '700 46px sans-serif'; if(r.why) c.fillText(r.why, W / 2, 610);
        c.fillStyle = '#9fa8d8'; c.font = '700 38px sans-serif'; c.fillText(r.ch ? r.ch : Math.ceil(n / 2) + (de() ? ' Züge gegen ' : ' moves vs ') + on, W / 2, 680);
        c.fillStyle = '#c6ff3d'; c.font = '700 50px sans-serif'; c.fillText(de() ? 'Spiel es selbst' : 'Play it yourself', W / 2, 860);
        c.fillStyle = '#7f89c9'; c.font = '700 34px sans-serif'; c.fillText(location.host, W / 2, 920);
      }
      if(r.opp && r.opp.img){ var im = new Image(); im.onload = function(){ img = im; go(); }; im.onerror = go; im.src = r.opp.img; } else go();
    });
  }

  /* ---------- Fenster ---------- */
  function ensureOv(){
    var ov = document.getElementById('recOv'); if(ov) return ov;
    ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'recOv'; ov.innerHTML = '<div class="card" id="recCard"></div>'; document.body.appendChild(ov);
    ov.addEventListener('click', function(e){ if(e.target === ov && !vidBusy) ov.classList.remove('show'); }); return ov;
  }
  function thumb(r){
    try{ var cv = document.createElement('canvas'); cv.width = 216; cv.height = 216; var c = cv.getContext('2d'), b = boards(r)[r.moves.length], flip = r.me === 'b', cell = 27;
      for(var i = 0; i < 8; i++) for(var j = 0; j < 8; j++){ c.fillStyle = (i + j) % 2 === 0 ? '#f4efd3' : '#1f7a3a'; c.fillRect((flip ? 7 - j : j) * cell, (flip ? 7 - i : i) * cell, cell, cell); var p = b[i][j]; if(p) piece(c, p, (flip ? 7 - j : j) * cell, (flip ? 7 - i : i) * cell, cell); }
      return cv.toDataURL('image/png'); }catch(e){ return ''; }
  }
  function openList(all){
    var ov = ensureOv(), card = document.getElementById('recCard'), t = de(), h = '<h2>🎬 ' + (t ? 'Deine letzten Partien' : 'Your last games') + '</h2><p style="font-size:12px;opacity:.75;margin:0 0 8px">' + (t ? 'Die letzten 5 Partien bleiben 24 Stunden gespeichert.' : 'The last 5 games are kept for 24 hours.') + '</p><div style="display:flex;flex-direction:column;gap:8px;text-align:left">';
    all.forEach(function(r, i){
      var res = r.res === 'win' ? (t ? 'Gewonnen' : 'Won') : r.res === 'draw' ? 'Remis' : (t ? 'Verloren' : 'Lost');
      h += '<button class="btn" data-i="' + i + '" style="display:flex;gap:10px;align-items:center;text-align:left;padding:8px"><img alt="" width="54" height="54" style="border-radius:8px;flex:none" src="' + thumb(r) + '"><span style="min-width:0;font-weight:700">' + (r.res === 'win' ? '🏆 ' : r.res === 'draw' ? '🤝 ' : '💀 ') + res + ' · ' + ((r.opp && r.opp.name) || 'Bot') + (r.ch ? ' 🎯' : '') + '<br><span style="font-weight:400;font-size:12px;opacity:.8">' + Math.ceil(r.moves.length / 2) + (t ? ' Züge' : ' moves') + ' · ' + left(r) + '</span></span></button>';
    });
    h += '</div><div class="row"><button class="btn" id="recC">' + (t ? 'Schließen' : 'Close') + '</button></div>';
    card.innerHTML = h; ov.classList.add('show');
    document.getElementById('recC').onclick = function(){ ov.classList.remove('show'); };
    Array.prototype.forEach.call(card.querySelectorAll('button[data-i]'), function(b){ b.onclick = function(){ open(+b.dataset.i, true); }; });
  }
  function open(idx, fromList){
    var all = list();
    if(idx == null && all.length > 1){ openList(all); return; }
    var r = all[idx || 0] || null; var ov = ensureOv(), card = document.getElementById('recCard'), t = de();
    if(!r){ card.innerHTML = '<h2>' + (t ? 'Keine Aufnahme' : 'No recording') + '</h2><p>' + (t ? 'Spiele eine Partie, dann bleibt sie 24 Stunden gespeichert.' : 'Play a game and it stays saved for 24 hours.') + '</p><div class="row"><button class="btn primary" id="recX">' + (t ? 'Schließen' : 'Close') + '</button></div>'; ov.classList.add('show'); document.getElementById('recX').onclick = function(){ ov.classList.remove('show'); }; return; }
    vidBlob = null; if(vidUrl){ URL.revokeObjectURL(vidUrl); vidUrl = null; }
    var res = r.res === 'win' ? (t ? 'Gewonnen!' : 'You won!') : r.res === 'draw' ? (t ? 'Remis' : 'Draw') : (t ? 'Verloren' : 'You lost');
    card.innerHTML = '<h2>🎬 ' + (t ? 'Aufnahme deiner Partie' : 'Your game recording') + '</h2>'
      + '<div style="display:flex;gap:12px;align-items:center;margin:10px 0;text-align:left"><img id="recTh" alt="" style="width:92px;height:92px;border-radius:8px;flex:none;background:#151a45" src="' + thumb(r) + '"><div style="min-width:0"><b>' + res + '</b><br><span style="opacity:.8;font-size:13px">' + Math.ceil(r.moves.length / 2) + (t ? ' Züge gegen ' : ' moves vs ') + ((r.opp && r.opp.name) || 'Bot') + '</span><br><span style="color:#ffd45a;font-size:12px">⏱ ' + left(r) + '</span></div></div>'
      + '<div id="recProg" style="display:none;height:10px;border-radius:99px;background:#1b2160;overflow:hidden;margin:6px 0"><div id="recBar" style="height:100%;width:0;background:#c6ff3d"></div></div>'
      + '<div id="recMsg" style="font-size:13px;opacity:.85;min-height:18px;margin:2px 0 6px"></div><div id="recVid"></div>'
      + '<div class="row" style="flex-direction:column;gap:8px"><button class="btn primary" id="recV">' + (t ? '🎥 Video erstellen' : '🎥 Create video') + '</button><button class="btn" id="recP">' + (t ? '📄 Zugliste herunterladen' : '📄 Download move list') + '</button><button class="btn" id="recC">' + (fromList ? (t ? 'Zurück zur Liste' : 'Back to list') : (t ? 'Schließen' : 'Close')) + '</button></div>';
    ov.classList.add('show');
    document.getElementById('recC').onclick = function(){ if(vidBusy) return; if(fromList) openList(list()); else ov.classList.remove('show'); };
    document.getElementById('recP').onclick = function(){ save(fname(r, 'pgn'), new Blob([pgn(r)], { type: 'application/x-chess-pgn' })); };
    document.getElementById('recV').onclick = function(){
      if(vidBusy) return; var b = document.getElementById('recV');
      if(vidBlob){ save(fname(r, vidExt), vidBlob); return; }
      vidBusy = true; b.disabled = true; document.getElementById('recProg').style.display = 'block';
      document.getElementById('recMsg').textContent = t ? 'Video wird aufgenommen. Bitte diese Seite offen lassen, das dauert etwa ' + Math.round((2600 + r.moves.length * (r.moves.length > 120 ? 450 : 700) + 3000) / 1000) + ' Sekunden.' : 'Recording the video. Keep this page open.';
      makeVideo(r, function(p){ var e = document.getElementById('recBar'); if(e) e.style.width = Math.round(p * 100) + '%'; }).then(function(blob){
        vidBusy = false; vidBlob = blob; vidUrl = URL.createObjectURL(blob);
        document.getElementById('recProg').style.display = 'none'; document.getElementById('recMsg').textContent = t ? 'Fertig! Schau es dir an und lade es herunter.' : 'Done! Preview it and download.';
        document.getElementById('recVid').innerHTML = '<video controls playsinline src="' + vidUrl + '" style="width:100%;max-height:46vh;border-radius:10px;background:#000;margin-bottom:8px"></video>';
        b.disabled = false; b.textContent = t ? '⬇️ Video herunterladen' : '⬇️ Download video';
      }).catch(function(err){ vidBusy = false; b.disabled = false; document.getElementById('recProg').style.display = 'none'; document.getElementById('recMsg').textContent = (t ? 'Das Video ging nicht: ' : 'Video failed: ') + (err && err.message ? err.message : ''); });
    };
  }
  window.BpRec = { list: list, len: function(){ return cur ? cur.moves.length : 0; }, trunc: function(n){ if(cur) cur.moves.length = Math.min(cur.moves.length, n); }, start: start, move: move, end: end, load: load, open: open, pgn: pgn, makeVideo: makeVideo, _san: sanOf };
})();
