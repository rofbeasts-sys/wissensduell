/* Gegner-Leiter fuer Schach, Dame, 4 gewinnt, Muehle und Tic Tac Toe (Original, Quantum, QuizMix): 30 benannte Gegner von leicht bis schwer.
   Die ersten 10 sind frei, die naechsten 10 schaltet man durch Siege frei, die letzten 10 kosten je 5000 Muenzen (gilt fuer beide Spiele).
   Die Leiter-Wertung ist NUR lokal und hat nichts mit der Online-Elo zu tun (niemand kann sich online Punkte "erspielen"). */
(function(root){
  // id, Name, Beiname (de), Name, Beiname (en)
  var RAW = [
    ['tim','Tim','Der Glückspilz','Tim','The Lucky One'], ['tobias','Tobias','Der Genießer','Tobias','The Foodie'], ['emma','Emma','Die Fröhliche','Emma','The Cheerful One'],
    ['jonas','Jonas','Der Lässige','Jonas','The Laid-back One'], ['ben','Ben','Der Chaot','Ben','The Chaos Kid'], ['felix','Felix','Der Angeber','Felix','The Show-off'],
    ['mia','Mia','Die Gamerin','Mia','The Gamer'], ['max','Max','Der Sprücheklopfer','Max','The Joker'], ['jana','Jana','Die Sportliche','Jana','The Athlete'], ['leon','Leon','Der Coolste','Leon','The Coolest'],
    ['laura','Laura','Die Fashionista','Laura','The Fashionista'], ['paul','Paul','Der Bücherwurm','Paul','The Bookworm'], ['kevin','Kevin','Der Streber','Kevin','The Overachiever'], ['david','David','Der Rätsler','David','The Riddler'],
    ['linda','Linda','Die Strategin','Linda','The Strategist'], ['anna','Anna','Die Konzentrierte','Anna','The Focused One'], ['noah','Noah','Der Kämpfer','Noah','The Fighter'], ['sophie','Sophie','Die Herausfordernde','Sophie','The Challenger'],
    ['schmidt','Frau Schmidt','Die Lehrerin','Ms Schmidt','The Teacher'], ['mueller','Herr Müller','Der Strenge','Mr Müller','The Strict One'],
    ['gerda','Oma Gerda','Die Bessere','Granny Gerda','The Better One'], ['witzig','Dr. Witzig','Der Wissenschaftler','Dr. Witzig','The Scientist'], ['ritter','Ritter Max','Der Beschützer','Sir Max','The Protector'],
    ['kalle','Käpt\'n Kalle','Der Taktiker','Captain Kalle','The Tactician'], ['ninja','Ninja Leo','Der Schatten','Ninja Leo','The Shadow'], ['otto','Professor Otto','Der Denker','Professor Otto','The Thinker'],
    ['dieter','Dieter','Der Großmeister','Dieter','The Grandmaster'], ['koenigin','Königin Sophie','Die Strategin','Queen Sophie','The Strategist'], ['koenig','König Felix','Der Herrscher','King Felix','The Ruler'], ['lukas','Magier Lukas','Der Zauberer','Wizard Lukas','The Sorcerer']
  ];
  var PRICE = 5000;
  var LIST = RAW.map(function(r, i){
    return { id: r[0], de: [r[1], r[2]], en: [r[3], r[4]], elo: 400 + i * 50, tier: i < 10 ? 'free' : i < 20 ? 'earn' : 'buy', img: '/chess/opp/' + r[0] + '.jpg' };
  });
  var N = LIST.length;
  function ai(g, i){
    var t = i / (N - 1), q = (1 - t) * (1 - t);
    if(g === 'fourups') return { depth: t < 0.15 ? 2 : t < 0.35 ? 3 : t < 0.5 ? 4 : t < 0.7 ? 5 : t < 0.9 ? 6 : 7, rnd: Math.max(0, 0.45 * (1 - t * 2.5)), noise: Math.round(60 * q) + 1 };
    if(g === 'muehle') return { depth: 1 + Math.round(t * 5), ms: 100 + Math.round(t * 1000), rnd: Math.max(0, 0.45 * (1 - t * 2.2)) };
    if(g === 'ttt' || g === 'tttqm' || g === 'tttqu') return { d: Math.min(0.9, 0.04 + 0.9 * Math.pow(t, 0.85)) };
    if(g === 'dame') return { depth: 1 + Math.round(t * 6), budget: 60 + Math.round(t * 840), rnd: Math.max(0, 0.5 * (1 - t * 2.2)), noise: Math.round(40 * q) };
    // Schach: Stufe steigt gleichmaessig. Platz 0-7 Tiefe 1, 8-19 Tiefe 2, ab 20 Tiefe 3. Fehler = schwaecherer Zug aus den besten Zuegen, kein Zufallszug.
    var d = i < 8 ? 1 : i < 20 ? 2 : 3, err = d === 1 ? 0.55 - 0.04 * i : d === 2 ? 0.40 - 0.029 * (i - 8) : Math.max(0, 0.12 - 0.0133 * (i - 20));
    return { depth: d, jitter: Math.round(40 * q) + 2, blunderChance: 0, err: Math.max(0, err), topK: d === 1 ? 4 : 3 };
  }
  var START = 600, K = 32, boughtBy = {};
  function pg(g){ return g === 'tttqm' || g === 'tttqu' ? 'ttt' : (['chess','dame','fourups','muehle','ttt'].indexOf(g) >= 0 ? g : 'chess'); }
  var asked = {};
  function gb(g){
    var k = pg(g);
    if(!asked[k] && token()){ asked[k] = 1; post('/api/ladder-state', { game: k }).then(function(r){ if(r && r.ok) boughtBy[k] = r.bought || []; }).catch(function(){}); }
    return boughtBy[k] || [];
  }
  var GNAME = { chess: ['Schach','chess'], dame: ['Dame','checkers'], fourups: ['4 gewinnt','Connect 4'], muehle: ['Mühle','Morris'], ttt: ['Tic Tac Toe','Tic Tac Toe'] };
  function key(g){ return 'bp_ladder2_' + g; }
  function load(g){
    var s = null; try{ s = JSON.parse(localStorage.getItem(key(g)) || 'null'); }catch(e){}
    if(!s || typeof s !== 'object') s = {};
    if(!isFinite(s.rating)) s.rating = START;
    if(!Array.isArray(s.beaten)) s.beaten = [];
    ['games','wins','losses','draws'].forEach(function(k){ if(!isFinite(s[k])) s[k] = 0; });
    return s;
  }
  function save(g, s){ try{ localStorage.setItem(key(g), JSON.stringify(s)); }catch(e){} }
  function token(){ try{ return localStorage.getItem('wq_account_token') || ''; }catch(e){ return ''; } }
  function post(url, body){
    body.token = token(); try{ body.lang = (localStorage.getItem('wq_lang') === 'en') ? 'en' : 'de'; }catch(e){}
    return fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) }).then(function(r){ return r.json(); });
  }
  // Zustand eines Gegners: 'open' | 'locked' (Sieg ueber den Vorgaenger fehlt) | 'buy' (kaufbar) | 'bought'
  function status(g, i){
    var o = LIST[i], s = load(g);
    if(o.tier === 'free') return 'open';
    if(o.tier === 'buy') return gb(g).indexOf(o.id) >= 0 ? 'open' : 'buy';
    return s.beaten.indexOf(LIST[i - 1].id) >= 0 ? 'open' : 'locked';
  }
  function unlocked(g, i){ return status(g, i) === 'open'; }
  function result(g, i, res){ // res: 'win' | 'loss' | 'draw'
    var d = LIST[i], s = load(g), sc = res === 'win' ? 1 : res === 'draw' ? 0.5 : 0;
    var ex = 1 / (1 + Math.pow(10, (d.elo - s.rating) / 400)), delta = Math.round(K * (sc - ex));
    s.rating = Math.max(100, s.rating + delta); s.games++;
    if(res === 'win') s.wins++; else if(res === 'loss') s.losses++; else s.draws++;
    var firstWin = false, nextUnlocked = null;
    if(res === 'win' && s.beaten.indexOf(d.id) < 0){
      s.beaten.push(d.id); firstWin = true;
      if(LIST[i + 1] && LIST[i + 1].tier === 'earn') nextUnlocked = i + 1;
      else if(i === 19) nextUnlocked = 'buy';
    }
    save(g, s);
    return { delta: delta, rating: s.rating, firstWin: firstWin, nextUnlocked: nextUnlocked, champion: firstWin && i === N - 1 };
  }
  function esc(x){ return String(x).replace(/[&<>"]/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }
  function info(g, i, lang){ var d = LIST[i], t = lang === 'en' ? d.en : d.de; return { name: t[0], title: t[1], elo: d.elo, img: d.img, id: d.id, tier: d.tier, ai: ai(g, i) }; }
  // Fenster mit allen 30 Gegnern. onPick(i) startet die Partie.
  function open(g, lang, onPick, current){
    var de = lang !== 'en', old = document.getElementById('bpLadderOv'); if(old) old.remove();
    var ov = document.createElement('div'); ov.id = 'bpLadderOv';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99995;background:#0a0f1e;overflow:auto;font-family:system-ui,sans-serif;color:#fff;padding:14px';
    document.body.appendChild(ov);
    var coins = null, funken = null, fOne = 200, fAll = 1500, ask = -1, loggedIn = !!token(), msg = '';
    function askHtml(){
      if(ask < 0) return '';
      var o = info(g, ask, lang), bt = 'flex:1;min-width:120px;padding:10px;border-radius:10px;border:0;font-weight:900;cursor:pointer;font-size:14px;font-family:inherit';
      return '<div id="bpAsk" style="margin:10px 0;padding:12px;border:1px solid #ffd45a;border-radius:12px;background:rgba(255,212,90,.1)"><b>' + esc(o.name) + '</b> ' + (de ? 'freikaufen? Gilt nur für ' + GNAME[pg(g)][0] + '.' : 'unlock? Only for ' + GNAME[pg(g)][1] + '.')
        + (coins != null ? ' <span style="opacity:.7;font-size:12px">(' + coins + ' 🪙' + (funken != null ? ', ' + funken + ' ✨' : '') + ')</span>' : '')
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' + (PRICE != null ? '<button id="bpAskC" style="' + bt + ';background:#c6ff3d;color:#08110c">🪙 ' + PRICE + '</button>' : '') + (fOne != null ? '<button id="bpAskF" style="' + bt + ';background:linear-gradient(135deg,#ffd45a,#ff9f1c);color:#2a1700">✨ ' + fOne + '</button>' : '') + (fAll != null ? '<button id="bpAskA" style="' + bt + ';background:linear-gradient(135deg,#ffd45a,#ff9f1c);color:#2a1700">' + (de ? 'Alle 10: ✨ ' : 'All 10: ✨ ') + fAll + '</button>' : '') + '</div><button id="bpAskN" style="margin-top:8px;width:100%;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-family:inherit;cursor:pointer">' + (de ? 'Abbrechen' : 'Cancel') + '</button></div>';
    }
    function paint(){
      var s = load(g);
      var cards = LIST.map(function(d, i){
        var o = info(g, i, lang), st = status(g, i), ok = st === 'open', won = s.beaten.indexOf(d.id) >= 0, cur = current === i;
        var sub = won ? '<span style="color:#ffc446">✔ ' + (de ? 'besiegt' : 'beaten') + '</span>' : ok ? (de ? 'bereit' : 'ready') : st === 'buy' ? '🪙 ' + PRICE : '🔒';
        var lock = ok ? '' : '<div style="position:absolute;inset:0;background:rgba(5,8,20,.55);border-radius:12px"></div>';
        return '<button data-i="' + i + '" style="position:relative;padding:0;border:2px solid ' + (cur ? '#7cff8c' : won ? 'rgba(255,196,70,.8)' : 'rgba(255,255,255,.15)') + ';border-radius:14px;background:rgba(255,255,255,.05);color:#fff;font:inherit;overflow:hidden;cursor:pointer;text-align:center">'
          + '<img src="' + o.img + '" alt="' + esc(o.name) + '" style="display:block;width:100%;height:auto;' + (ok ? '' : 'filter:grayscale(.7)') + '" loading="lazy">' + lock
          + '<div style="font-size:11px;padding:4px 2px;font-weight:700"><span style="opacity:.8">' + o.elo + '</span> · ' + sub + '</div></button>';
      }).join('');
      var secs = [[0, de ? 'Frei' : 'Free'], [10, de ? 'Durch Siege freischalten' : 'Unlock by winning'], [20, de ? 'Freikaufen (' + PRICE + ' 🪙 oder ✨ Pulsfunken)' : 'Buy (' + PRICE + ' 🪙 or ✨ Pulse sparks)']];
      var grid = '';
      for(var k = 0; k < 3; k++){
        grid += '<div style="font-size:13px;font-weight:800;margin:14px 0 6px;opacity:.9">' + secs[k][1] + '</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' + cards.split('</button>').slice(secs[k][0], secs[k][0] + 10).join('</button>') + '</button></div>';
      }
      ov.innerHTML = '<div style="width:100%;max-width:440px;margin:0 auto"><div style="font-size:22px;font-weight:900;margin:2px 0 4px">🏆 ' + (de ? 'Gegner-Leiter' : 'Opponent ladder') + '</div>'
        + '<div style="font-size:13px;opacity:.8;margin-bottom:10px">' + (de ? 'Von leicht nach schwer. Die Leiter-Wertung zählt nur hier und nicht für die Online-Elo.' : 'From easy to hard. Your ladder rating counts only here, not for online Elo.') + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:13px"><span style="padding:6px 12px;border-radius:999px;background:rgba(124,255,140,.14)">' + (de ? 'Wertung' : 'Rating') + ' <b>' + s.rating + '</b></span><span style="padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.08)">' + s.wins + ' ' + (de ? 'Siege' : 'wins') + ' · ' + s.draws + ' ' + (de ? 'Remis' : 'draws') + ' · ' + s.losses + ' ' + (de ? 'Niederlagen' : 'losses') + '</span>' + (coins != null ? '<span style="padding:6px 12px;border-radius:999px;background:rgba(255,196,70,.15)">🪙 <b>' + coins + '</b></span>' : '') + '</div>'
        + (msg ? '<div style="margin-top:8px;color:#ffd45a;font-size:13px;font-weight:700">' + esc(msg) + '</div>' : '') + askHtml() + grid
        + '<button id="bpLadderX" style="width:100%;padding:12px;border-radius:14px;border:2px solid rgba(255,255,255,.2);background:transparent;color:#fff;font:inherit;margin:14px 0 20px">' + (de ? 'Schließen' : 'Close') + '</button></div>';
      ov.querySelector('#bpLadderX').onclick = function(){ ov.remove(); };
      var bq = ov.querySelector('#bpAsk'); if(bq){
        var xC = ov.querySelector('#bpAskC'), xF = ov.querySelector('#bpAskF'), xA = ov.querySelector('#bpAskA'); if(xC) xC.onclick = function(){ if(coins != null && coins < PRICE){ msg = (de ? 'Dir fehlen ' : 'You need ') + (PRICE - coins) + (de ? ' Münzen.' : ' more coins.'); ask = -1; paint(); return; } doBuy(ask, 'coins'); };
        if(xF) xF.onclick = function(){ doBuy(ask, 'ladder'); };
        if(xA) xA.onclick = function(){ doBuy(ask, 'ladderAll'); };
        ov.querySelector('#bpAskN').onclick = function(){ ask = -1; paint(); };
      }
      Array.prototype.forEach.call(ov.querySelectorAll('button[data-i]'), function(b){ b.onclick = function(){ pick(+b.getAttribute('data-i')); }; });
    }
    function pick(i){
      var st = status(g, i), o = info(g, i, lang);
      if(st === 'open'){ ov.remove(); onPick(i); return; }
      if(st === 'locked'){ msg = (de ? 'Besiege zuerst ' : 'Beat ') + info(g, i - 1, lang).name + (de ? '.' : ' first.'); paint(); return; }
      // kaufen
      if(!loggedIn){ msg = de ? 'Melde dich an, um Gegner freizukaufen.' : 'Log in to buy opponents.'; paint(); return; }
      ask = i; msg = ''; paint();
    }
    function doBuy(i, how){
      var o = info(g, i, lang), url = how === 'coins' ? '/api/ladder-buy' : '/api/funken-buy', body = how === 'coins' ? { id: o.id, game: pg(g) } : { kind: how, id: o.id, game: pg(g) };
      ask = -1;
      post(url, body).then(function(r){
        if(r && r.ok){ boughtBy[pg(g)] = r.bought || gb(g); if(r.coins != null) coins = r.coins; if(r.funken != null) funken = r.funken; msg = (how === 'ladderAll' ? (de ? 'Alle Gegner freigekauft.' : 'All opponents unlocked.') : (de ? 'Freigekauft: ' : 'Unlocked: ') + o.name); try{ if(window.parent && window.parent.updateCoinsFromLadder) window.parent.updateCoinsFromLadder(r.coins); }catch(e){} }
        else msg = (r && r.error) || (de ? 'Kauf nicht möglich.' : 'Could not buy.');
        paint();
      }).catch(function(){ msg = de ? 'Keine Verbindung.' : 'No connection.'; paint(); });
    }
    paint();
    if(loggedIn) post('/api/ladder-state', { game: pg(g) }).then(function(r){ if(r && r.ok){ boughtBy[pg(g)] = r.bought || []; coins = r.coins; funken = r.funken; if(r.funkenPrice !== undefined) fOne = r.funkenPrice; if(r.funkenAll !== undefined) fAll = r.funkenAll; if(r.price !== undefined) PRICE = r.price; paint(); } }).catch(function(){});
  }
  function endNote(g, i, r, lang){
    var de = lang !== 'en', t = (de ? 'Leiter-Wertung: ' : 'Ladder rating: ') + r.rating + ' (' + (r.delta >= 0 ? '+' : '') + r.delta + ')';
    if(r.champion) t += '\n🏆 ' + (de ? 'Du hast die ganze Leiter bezwungen!' : 'You beat the whole ladder!');
    else if(r.nextUnlocked === 'buy') t += '\n🔓 ' + (de ? 'Alle Gegner durch Siege freigeschaltet. Die letzten 10 kannst du für Münzen freikaufen.' : 'All win-unlocks done. The last 10 can be bought with coins.');
    else if(r.nextUnlocked != null) t += '\n🔓 ' + (de ? 'Freigeschaltet: ' : 'Unlocked: ') + info(g, r.nextUnlocked, lang).name + ' (' + info(g, r.nextUnlocked, lang).title + ')';
    return t;
  }
  var api = { list: LIST, price: PRICE, ai: ai, load: load, status: status, unlocked: unlocked, result: result, info: info, open: open, endNote: endNote, setBought: function(a, g){ boughtBy[pg(g)] = a || []; } };
  if(typeof module !== 'undefined' && module.exports) module.exports = api; else root.BpLadder = api;
})(typeof window !== 'undefined' ? window : this);
