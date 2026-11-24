/* Spielanalyse nach der Partie (Chess Original, Chess Online, Chess Fantasy).
 * Bewertet jeden eigenen Zug mit derselben Engine wie der Bot (Minimax, Tiefe 2)
 * gegen den besten Zug der Stellung. Fantasy-Faehigkeiten kennt die Analyse
 * nicht: es zaehlen die normalen Schachregeln. Braucht die globalen Funktionen
 * getAllLegalMoves, applyMove, minimax (aus engine.js bzw. game.js). */
(function(){
  "use strict";
  var LANG = (function(){ try{ return localStorage.getItem("wq_lang") === "en" ? "en" : "de"; }catch(e){ return "de"; } })();
  var T = {
    de:{ title:"Analyse", working:"Analysiere …", acc:"Genauigkeit", best:"Perfekter Zug", good:"Gut", inacc:"Ungenau", mistake:"Fehler", blunder:"Patzer",
      better:"Besser", opp:"Gegner", mine:"Dein Zug", start:"Startstellung", replay:"Partie ansehen", close:"Schließen", none:"Keine Züge zum Analysieren.", note:"Bewertung mit den normalen Schachregeln, ohne Fähigkeiten.", move:"Zug", btn:"Analyse" },
    en:{ title:"Analysis", working:"Analyzing …", acc:"Accuracy", best:"Perfect move", good:"Good", inacc:"Inaccuracy", mistake:"Mistake", blunder:"Blunder",
      better:"Better", opp:"Opponent", mine:"Your move", start:"Start position", replay:"Replay", close:"Close", none:"No moves to analyze.", note:"Rated with normal chess rules, ignoring abilities.", move:"Move", btn:"Analysis" }
  }[LANG];
  var SYMS = { K:"♚", Q:"♛", R:"♜", B:"♝", N:"♞", P:"♟" };
  var CLS = [
    { key:"best", max:10, color:"#c6ff3d", icon:"★" },
    { key:"good", max:50, color:"#3de0ff", icon:"✓" },
    { key:"inacc", max:120, color:"#ffd24a", icon:"?!" },
    { key:"mistake", max:300, color:"#ff9a3d", icon:"?" },
    { key:"blunder", max:Infinity, color:"#ff5d8f", icon:"??" }
  ];
  function sq(r, c){ return "abcdefgh"[c] + (8 - r); }
  function label(board, mv){
    var p = board[mv.fr][mv.fc], t = board[mv.tr][mv.tc];
    if(mv.castle) return mv.castle === "k" ? "O-O" : "O-O-O";
    return SYMS[p.t] + sq(mv.fr, mv.fc) + ((t || mv.ep) ? "×" : "–") + sq(mv.tr, mv.tc) + (mv.promTo ? "=" + SYMS[mv.promTo] : "");
  }
  // Wert eines Zugs aus Sicht des Ziehenden (positiv = gut), Engine wertet fuer Schwarz.
  function valueOf(board, mv, col){
    var nb = applyMove(board, mv);
    var v = minimax(nb, 2, -Infinity, Infinity, col === "w", mv);
    return col === "b" ? v : -v;
  }
  // ---- Erklärung: warum wäre der andere Zug besser? ----
  var VAL = { P:1, N:3, B:3, R:5, Q:9, K:0 };
  var PN = { de:{ P:"Bauer", N:"Springer", B:"Läufer", R:"Turm", Q:"Dame", K:"König" }, en:{ P:"pawn", N:"knight", B:"bishop", R:"rook", Q:"queen", K:"king" } }[LANG];
  var W = {
    de:{ mateAllowed:"Dein Zug erlaubt dem Gegner Schachmatt.", mateMissed:"Mit %b hättest du Schachmatt gesetzt.", hang:"Nach deinem Zug kann der Gegner %pk auf %s schlagen und gewinnt Material.", hangBest:"%pn auf %s war angegriffen. %b bringt die Figur in Sicherheit.", wins:"%b gewinnt %pe (Wert %v).", winsMore:"%b gewinnt %pk, dein Zug nur %qe.", check:"%b setzt den König unter Druck (Schach).", pawns:"Nach %b steht die Stellung für dich etwa %n Bauern besser als nach deinem Zug (Material und Stellung zusammen).", huge:"%b hätte dir einen großen Vorteil gebracht (Matt oder sehr viel Material). Dein Zug hat das verspielt.", because:"weil " },
    en:{ mateAllowed:"Your move allows the opponent to checkmate.", mateMissed:"%b would have been checkmate.", hang:"After your move the opponent can take %pk on %s and wins material.", hangBest:"%pn on %s was attacked. %b puts it to safety.", wins:"%b wins %pe (worth %v).", winsMore:"%b wins the piece, your move only %qe.", check:"%b puts the king under pressure (check).", pawns:"After %b the position is about %n pawns better for you than after your move (material and position combined).", huge:"%b would have given you a huge advantage (mate or a lot of material). Your move threw it away.", because:"because " }
  }[LANG];
  var FEM = { de:{ Q:1 } };
  function art(t, kind){ // kind: k = deinen/deine, n = Dein/Deine, e = einen/eine
    if(LANG !== "de") return kind === "k" ? "your " + PN[t] : kind === "n" ? "Your " + PN[t] : "a " + PN[t];
    var f = !!FEM.de[t], w = kind === "k" ? (f ? "deine" : "deinen") : kind === "n" ? (f ? "Deine" : "Dein") : (f ? "eine" : "einen");
    return w + " " + PN[t];
  }
  function oppC(c){ return c === "w" ? "b" : "w"; }
  function fill(t, o){ return t.replace(/%([a-z]+)/g, function(m, k){ return o[k] != null ? o[k] : m; }); }
  function mates(nb, defCol, mv){ try{ return isInCheck(nb, defCol) && getAllLegalMoves(nb, defCol, mv).length === 0; }catch(e){ return false; } }
  function canMate(nb, col, last){
    try{ var ms = getAllLegalMoves(nb, col, last); for(var i = 0; i < ms.length; i++){ var n2 = applyMove(nb, ms[i]); if(mates(n2, oppC(col), ms[i])) return true; } }catch(e){}
    return false;
  }
  // Größter Materialgewinn, den der Gegner (nach nb) mit einem Schlag machen kann
  function threat(nb, col, last){
    var o = oppC(col), best = { net:0, tgt:null, r:0, c:0 };
    try{
      var ms = getAllLegalMoves(nb, o, last);
      for(var i = 0; i < ms.length; i++){
        var m = ms[i], tg = nb[m.tr][m.tc]; if(!tg || tg.col !== col) continue;
        var at = nb[m.fr][m.fc], gain = VAL[tg.t] || 0, defended = sqAttacked(nb, m.tr, m.tc, col);
        var net = defended ? gain - (VAL[at.t] || 0) : gain;
        if(net > best.net){ best = { net:net, tgt:tg, r:m.tr, c:m.tc }; }
      }
    }catch(e){}
    return best;
  }
  function explain(e, played, best, loss){
    try{
      var col = e.col, o = oppC(col), pm = played || e.move, bt = label(e.board, best);
      var nbP = applyMove(e.board, pm), nbB = applyMove(e.board, best);
      var out = [];
      if(canMate(nbP, o, pm)) out.push(W.mateAllowed);
      if(mates(nbB, o, best)) out.push(fill(W.mateMissed, { b: bt }));
      if(!out.length){
        var tp = threat(nbP, col, pm), tb = threat(nbB, col, best);
        if(tp.net >= 1 && tp.net > tb.net) out.push(fill(W.hang, { pk: art(tp.tgt.t, "k"), s: sq(tp.r, tp.c) }));
        else {
          var t0 = threat(e.board, col, e.last);   // war schon vorher etwas angegriffen?
          if(t0.net >= 1 && tb.net < t0.net && tp.net >= t0.net) out.push(fill(W.hangBest, { pn: art(t0.tgt.t, "n"), s: sq(t0.r, t0.c), b: bt }));
        }
      }
      if(out.length < 1){
        var cb = e.board[best.tr][best.tc], cp = e.board[pm.tr][pm.tc];
        if(cb && cb.col === o && (!cp || (VAL[cb.t] || 0) > (VAL[cp.t] || 0))) out.push(cp ? fill(W.winsMore, { b: bt, pk: art(cb.t, "e").replace(/^(einen|eine)/, function(m){ return m === "einen" ? "den" : "die"; }), qe: art(cp.t, "e") }) : fill(W.wins, { b: bt, pe: art(cb.t, "e"), v: VAL[cb.t] }));
        else if(isInCheck(nbB, o)) out.push(fill(W.check, { b: bt }));
      }
      if(out.length < 1 && loss >= 1400) out.push(fill(W.huge, { b: bt }));
      if(out.length < 1) out.push(fill(W.pawns, { b: bt, n: (loss / 100).toFixed(1).replace(".", LANG === "de" ? "," : ".") }));
      return out.slice(0, 2).join(" ");
    }catch(err){ return ""; }
  }
  function analyzeEntry(e){
    var moves = getAllLegalMoves(e.board, e.col, e.last);
    var played = null, best = null, bestV = -Infinity, playedV = -Infinity;
    for(var i=0;i<moves.length;i++){
      var m = moves[i], v = valueOf(e.board, m, e.col);
      if(v > bestV){ bestV = v; best = m; }
      if(m.tr === e.move.tr && m.tc === e.move.tc && m.fr === e.move.fr && m.fc === e.move.fc){ playedV = v; played = m; }
    }
    if(!played){ playedV = bestV; }
    var loss = Math.max(0, Math.min(1500, bestV - playedV));
    var cls = CLS.find(function(c){ return loss <= c.max; });
    var needWhy = !!best && cls.key !== "best" && cls.key !== "good" && !(best.fr === e.move.fr && best.fc === e.move.fc && best.tr === e.move.tr && best.tc === e.move.tc);
    return { text: label(e.board, e.move), why: needWhy ? explain(e, played, best, loss) : "", cls: cls, loss: loss, best: best, bestText: best ? label(e.board, best) : "", sameAsBest: !!best && best.fr === e.move.fr && best.fc === e.move.fc && best.tr === e.move.tr && best.tc === e.move.tc };
  }
  function ensureUi(){
    if(document.getElementById("bpAnaOv")) return;
    var st = document.createElement("style");
    st.textContent = "#bpAnaOv{position:fixed;inset:0;background:rgba(5,7,12,.88);display:none;align-items:center;justify-content:center;z-index:99999;padding:14px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}"
      + "#bpAnaOv.show{display:flex}#bpAnaCard{background:#151b2b;border:1.5px solid #262e46;border-radius:18px;width:100%;max-width:400px;max-height:88vh;display:flex;flex-direction:column;color:#eef0fb;overflow:hidden}"
      + "#bpAnaCard h2{margin:0;padding:16px 18px 4px;font-size:18px;letter-spacing:2px;text-transform:uppercase}"
      + "#bpAnaSum{padding:4px 18px 10px;font-size:13px;color:#9aa3c0}#bpAnaBody{overflow:auto;padding:0 12px 8px;flex:1}"
      + ".bpAnaRow{display:flex;align-items:center;gap:10px;padding:8px 8px;border-radius:10px;margin-bottom:4px;background:#10141f;border:1px solid #262e46}"
      + ".bpAnaIc{min-width:30px;text-align:center;font-weight:900;font-size:14px}.bpAnaTx{flex:1;min-width:0;font-size:14px;font-weight:700}.bpAnaTx small{display:block;font-weight:400;font-size:11px;color:#9aa3c0}"
      + ".bpAnaN{color:#9aa3c0;font-size:11px;min-width:22px}#bpAnaBar{height:6px;background:#10141f;margin:0 18px 10px;border-radius:3px;overflow:hidden}#bpAnaBar i{display:block;height:100%;width:0;background:#c6ff3d;transition:width .2s}"
      + "#bpAnaClose{margin:8px 12px 12px;border:none;border-radius:12px;padding:12px;font-weight:800;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#c6ff3d,#3de0ff);color:#08110c}"
      + ".bpAnaNote{padding:0 18px 8px;font-size:11px;color:#6d7699}"
      + "#bpAnaBoardWrap{padding:6px 14px 4px;display:flex;flex-direction:column;align-items:center;gap:6px}"
      + "#bpAnaBoard{position:relative;width:100%;max-width:300px;aspect-ratio:1;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr));border-radius:8px;overflow:hidden;box-shadow:0 0 0 2px #262e46}"
      + "#bpAnaBoard .sq{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;overflow:hidden}#bpAnaBoard .sq.hl::after{content:'';position:absolute;inset:0;background:rgba(246,246,105,.6)}"
      + "#bpAnaBoard .sq svg{position:relative;z-index:1;width:92%;height:92%;max-width:92%;max-height:92%;flex:none;transition:transform .15s}"
      + "#bpAnaBoard .co{position:absolute;font-size:8px;font-weight:700;opacity:.75;z-index:2;pointer-events:none}"
      + "#bpAnaArrow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}"
      + "#bpAnaCap{font-size:13px;font-weight:700;text-align:center;min-height:34px;line-height:1.3}#bpAnaCap small{display:block;font-weight:400;font-size:11px;color:#9aa3c0}"
      + "#bpAnaCtl{display:flex;gap:6px;align-items:center;justify-content:center}"
      + "#bpAnaCtl button{width:44px;height:38px;border-radius:10px;border:1px solid #262e46;background:#10141f;color:#eef0fb;font-size:16px;font-weight:800;cursor:pointer}"
      + "#bpAnaCtl button#bpAnaPlay{width:58px;background:linear-gradient(135deg,#c6ff3d,#3de0ff);color:#08110c;border:none}#bpAnaCtl button:disabled{opacity:.35}"
      + "#bpAnaCtl span{min-width:52px;text-align:center;font-size:11px;color:#9aa3c0}"
      + ".bpAnaRow{cursor:pointer}.bpAnaRow.cur{border-color:#c6ff3d;background:#18210f}"
      + "@media (min-width:900px) and (min-height:560px){#bpAnaCard{display:grid;max-width:1120px;width:96vw;height:92vh;max-height:92vh;grid-template-columns:minmax(380px,1.15fr) minmax(360px,1fr);grid-template-rows:auto auto auto auto minmax(0,1fr) auto auto}"
      + "#bpAnaCard h2{grid-column:1/-1;grid-row:1}#bpAnaSum{grid-column:1/-1;grid-row:2}#bpAnaBoardWrap{grid-column:1;grid-row:3/span 5;justify-content:center;padding:6px 18px}"
      + "#bpAnaBoard{max-width:min(620px,calc(92vh - 250px))}#bpAnaCap{font-size:15px}"
      + "#bpAnaPts{grid-column:2;grid-row:3;margin:0 12px 8px !important}#bpAnaBar{grid-column:2;grid-row:4}#bpAnaBody{grid-column:2;grid-row:5;min-height:0}.bpAnaNote{grid-column:2;grid-row:6}#bpAnaClose{grid-column:2;grid-row:7}"
      + ".bpAnaRow{padding:9px 10px}.bpAnaTx{font-size:15px}.bpAnaTx small{font-size:12px}}";
    document.head.appendChild(st);
    var ov = document.createElement("div"); ov.id = "bpAnaOv";
    ov.innerHTML = '<div id="bpAnaCard"><h2></h2><div id="bpAnaSum"></div><div id="bpAnaBar"><i></i></div><div id="bpAnaBoardWrap"><div id="bpAnaBoard"></div><div id="bpAnaCap"></div><div id="bpAnaCtl"><button id="bpAnaFirst">⏮</button><button id="bpAnaPrev">◀</button><button id="bpAnaPlay">▶</button><button id="bpAnaNext">⏩</button><button id="bpAnaLast">⏭</button><span id="bpAnaPos"></span></div></div><div id="bpAnaBody"></div><div class="bpAnaNote"></div><button id="bpAnaClose"></button></div>';
    document.body.appendChild(ov);
    ov.querySelector("#bpAnaClose").onclick = function(){ stopPlay(); ov.classList.remove("show"); };
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]; }); }
  function summarize(rows){
    var counts = {}; CLS.forEach(function(c){ counts[c.key] = 0; });
    var sum = 0; rows.forEach(function(r){ counts[r.cls.key]++; sum += r.loss; });
    var avg = rows.length ? sum / rows.length : 0;
    return { counts: counts, accuracy: Math.round(100 / (1 + avg / 120)) };
  }

  // ---- Wiedergabe: Partie Zug fuer Zug wie ein Video ----
  var RP = { frames: [], cur: 0, timer: null, rows: [], flip: false };
  function toast(){ }
  function mvOk(m){ return m && m.fr !== undefined && m.tr !== undefined; }
  function buildFrames(entries){
    var f = [];
    entries.forEach(function(e, i){
      f.push({ kind: i === 0 && !mvOk(e.last) ? "start" : "opp", i: i, board: e.board, hl: mvOk(e.last) ? e.last : null });
      var nb = null; try{ nb = applyMove(e.board, e.move); }catch(err){ nb = e.board; }
      f.push({ kind: "me", i: i, board: nb, hl: e.move });
    });
    return f;
  }
  function pieceSvg(p){ try{ return window.chessPieceSVG ? window.chessPieceSVG(p.t, p.col, "classic", {}) : (SYMS[p.t] || "?"); }catch(err){ return SYMS[p.t] || "?"; } }
  function drawArrow(m, color){
    var f = RP.flip;
    function cx(c){ return ((f ? 7 - c : c) + .5) * 12.5; } function cy(r){ return ((f ? 7 - r : r) + .5) * 12.5; }
    var x1 = cx(m.fc), y1 = cy(m.fr), x2 = cx(m.tc), y2 = cy(m.tr);
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx*dx + dy*dy) || 1, ux = dx / L, uy = dy / L;
    var ex = x2 - ux * 3.2, ey = y2 - uy * 3.2;
    return '<svg id="bpAnaArrow" viewBox="0 0 100 100"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + ex + '" y2="' + ey + '" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" opacity=".85"/><polygon points="' + x2 + "," + y2 + " " + (ex - uy * 3 ) + "," + (ey + ux * 3) + " " + (ex + uy * 3) + "," + (ey - ux * 3) + '" fill="' + color + '" opacity=".9"/></svg>';
  }
  function renderFrame(){
    var fr = RP.frames[RP.cur]; if(!fr) return;
    var boardEl = document.getElementById("bpAnaBoard"), cap = document.getElementById("bpAnaCap");
    var html = "";
    for(var rr = 0; rr < 8; rr++){ for(var cc = 0; cc < 8; cc++){
      var r = RP.flip ? 7 - rr : rr, c = RP.flip ? 7 - cc : cc;
      var dark = (r + c) % 2 === 1, p = fr.board[r][c];
      var hl = fr.hl && ((fr.hl.fr === r && fr.hl.fc === c) || (fr.hl.tr === r && fr.hl.tc === c));
      var lab = "";
      if(cc === 0) lab += '<span class="co" style="left:2px;top:1px;color:' + (dark ? "#eeeed2" : "#769656") + '">' + (8 - r) + "</span>";
      if(rr === 7) lab += '<span class="co" style="right:2px;bottom:0;color:' + (dark ? "#eeeed2" : "#769656") + '">' + "abcdefgh"[c] + "</span>";
      html += '<div class="sq' + (hl ? " hl" : "") + '" style="background:' + (dark ? "#769656" : "#eeeed2") + '">' + lab + (p ? pieceSvg(p) : "") + "</div>";
    } }
    var row = RP.rows[fr.i];
    if(fr.kind === "me" && row && !row.sameAsBest && row.best && row.cls.key !== "best" && row.cls.key !== "good") html += drawArrow(row.best, "#3de0ff");
    boardEl.innerHTML = html;
    var t = "";
    if(fr.kind === "start") t = T.start;
    else if(fr.kind === "opp"){ var p0 = fr.board[fr.hl.tr][fr.hl.tc]; t = T.opp + ": " + (p0 ? SYMS[p0.t] : "") + sq(fr.hl.fr, fr.hl.fc) + "–" + sq(fr.hl.tr, fr.hl.tc); }
    else {
      t = T.mine + " " + (fr.i + 1) + ": " + (row ? esc(row.text) : "…");
      if(row){ t += '<small style="color:' + row.cls.color + '">' + row.cls.icon + " " + T[row.cls.key] + ((!row.sameAsBest && row.bestText && row.cls.key !== "best" && row.cls.key !== "good") ? " · " + T.better + ": " + esc(row.bestText) : "") + "</small>" + ((row.why && row.cls.key !== "best" && row.cls.key !== "good") ? '<small style="color:#c9d2ee;margin-top:2px">' + esc(row.why) + "</small>" : ""); }
    }
    cap.innerHTML = t;
    document.getElementById("bpAnaPos").textContent = (RP.cur + 1) + " / " + RP.frames.length;
    document.getElementById("bpAnaFirst").disabled = document.getElementById("bpAnaPrev").disabled = RP.cur === 0;
    document.getElementById("bpAnaNext").disabled = document.getElementById("bpAnaLast").disabled = RP.cur >= RP.frames.length - 1;
    var rowsEl = document.querySelectorAll("#bpAnaBody .bpAnaRow");
    for(var k = 0; k < rowsEl.length; k++) rowsEl[k].classList.toggle("cur", fr.kind === "me" && k === fr.i);
  }
  function stopPlay(){ if(RP.timer){ clearInterval(RP.timer); RP.timer = null; } var b = document.getElementById("bpAnaPlay"); if(b) b.textContent = "▶"; }
  function gotoFrame(n){ RP.cur = Math.max(0, Math.min(RP.frames.length - 1, n)); renderFrame(); }
  function togglePlay(){
    if(RP.timer){ stopPlay(); return; }
    if(RP.cur >= RP.frames.length - 1) RP.cur = 0;
    document.getElementById("bpAnaPlay").textContent = "⏸"; renderFrame();
    RP.timer = setInterval(function(){ if(RP.cur >= RP.frames.length - 1){ stopPlay(); return; } gotoFrame(RP.cur + 1); }, 1000);
  }
  function wireControls(){
    var g = function(id){ return document.getElementById(id); };
    g("bpAnaFirst").onclick = function(){ stopPlay(); gotoFrame(0); };
    g("bpAnaPrev").onclick = function(){ stopPlay(); gotoFrame(RP.cur - 1); };
    g("bpAnaNext").onclick = function(){ stopPlay(); gotoFrame(RP.cur + 1); };
    g("bpAnaLast").onclick = function(){ stopPlay(); gotoFrame(RP.frames.length - 1); };
    g("bpAnaPlay").onclick = togglePlay;
    if(!window.__bpAnaKeys){ window.__bpAnaKeys = true; document.addEventListener("keydown", function(ev){
      var ov = document.getElementById("bpAnaOv"); if(!ov || !ov.classList.contains("show")) return;
      if(ev.key === "ArrowRight"){ stopPlay(); gotoFrame(RP.cur + 1); } else if(ev.key === "ArrowLeft"){ stopPlay(); gotoFrame(RP.cur - 1); } else if(ev.key === " "){ ev.preventDefault(); togglePlay(); } else if(ev.key === "Escape"){ stopPlay(); ov.classList.remove("show"); }
    }); }
  }
  // entries: [{board, last, col, move}] - Stellung VOR dem eigenen Zug.
  var LK = "bp_last_analysis";
  function saveLast(entries){ try{ if(entries && entries.length) localStorage.setItem(LK, JSON.stringify(entries.slice(-80))); }catch(e){} }
  function loadLast(){ try{ var a = JSON.parse(localStorage.getItem(LK) || "null"); return Array.isArray(a) && a.length ? a : null; }catch(e){ return null; } }
  function show(entries){
    if(!entries || !entries.length) entries = loadLast() || entries; else saveLast(entries);
    ensureUi();
    var ov = document.getElementById("bpAnaOv"), body = ov.querySelector("#bpAnaBody"), sumEl = ov.querySelector("#bpAnaSum"), bar = ov.querySelector("#bpAnaBar i");
    ov.querySelector("h2").textContent = "🔎 " + T.title; ov.querySelector("#bpAnaClose").textContent = T.close; ov.querySelector(".bpAnaNote").textContent = T.note;
    body.innerHTML = ""; bar.style.width = "0"; ov.classList.add("show"); stopPlay();
    try{ var pb0 = ov.querySelector("#bpAnaPts"); if(pb0) pb0.style.display = "none"; }catch(e){}
    var wrap = ov.querySelector("#bpAnaBoardWrap");
    if(!entries || !entries.length){ sumEl.textContent = T.none; wrap.style.display = "none"; return; }
    wrap.style.display = "flex"; wireControls();
    RP.frames = buildFrames(entries); RP.cur = 0; RP.rows = []; RP.flip = entries[0].col === "b"; renderFrame();
    sumEl.textContent = T.working;
    var rows = [], i = 0;
    function step(){
      if(i >= entries.length){ finish(); return; }
      var e = entries[i], r;
      try{ r = analyzeEntry(e); }catch(err){ r = { text:"?", cls:CLS[1], loss:0, bestText:"", sameAsBest:true }; }
      rows.push(r); RP.rows = rows;
      var d = document.createElement("div"); d.className = "bpAnaRow"; (function(ix){ d.onclick = function(){ stopPlay(); gotoFrame(2 * ix + 1); ov.querySelector("#bpAnaBoardWrap").scrollIntoView({block:"nearest"}); }; })(i);
      var hint = (!r.sameAsBest && r.cls.key !== "best" && r.cls.key !== "good" && r.bestText) ? "<small>" + T.better + ": " + esc(r.bestText) + "</small>" + (r.why ? "<small style=\"color:#c9d2ee\">" + esc(r.why) + "</small>" : "") : "";
      d.innerHTML = '<span class="bpAnaN">' + (i + 1) + '.</span><span class="bpAnaIc" style="color:' + r.cls.color + '">' + r.cls.icon + '</span><span class="bpAnaTx">' + esc(r.text) + '<small style="color:' + r.cls.color + '">' + T[r.cls.key] + '</small>' + hint + '</span>';
      body.appendChild(d);
      i++; bar.style.width = Math.round(i / entries.length * 100) + "%";
      setTimeout(step, 0);
    }
    function finish(){
      var s = summarize(rows);
      sumEl.innerHTML = "<b style='color:#c6ff3d;font-size:20px'>" + s.accuracy + "%</b> " + T.acc + " &nbsp;·&nbsp; "
        + CLS.map(function(c){ return "<span style='color:" + c.color + "'>" + c.icon + " " + s.counts[c.key] + "</span>"; }).join(" &nbsp;");
      ov.__result = { rows: rows, summary: s };
      try{ award(entries, rows); }catch(err){}
    }
    setTimeout(step, 30);
  }
  /* ---- Punkte: perfekte Zuege, Tokens, Stufen, Bestenliste ---- */
  var PL = function(){ try{ return localStorage.getItem("wq_lang") === "en" ? "en" : "de"; }catch(e){ return "de"; } };
  var PT = {
    de:{ lv:["Neuling","Bauer","Springer","Läufer","Turm","Dame","König"], perfect:"perfekte Züge", gain:"Für diese Partie", tokens:"Analyse-Tokens heute", level:"Stufe", none:"Keine Tokens mehr frei. Für diese Partie gibt es keine Punkte.", again:"Diese Partie ist schon gezählt.", login:"Melde dich an, um perfekte Züge zu sammeln.", buy:"Mit {c} Münzen Punkte holen", top:"Bestenliste", week:"Diese Woche", total:"Insgesamt", close:"Schließen", up:"Neue Stufe: ", err:"Das ging nicht. Versuch es später nochmal.", you:"Du", nocoins:"Nicht genug Münzen.", empty:"Noch keine Einträge.", next:"bis {n}" },
    en:{ lv:["Rookie","Pawn","Knight","Bishop","Rook","Queen","King"], perfect:"perfect moves", gain:"This game", tokens:"Analysis tokens today", level:"Level", none:"No tokens left. No points for this game.", again:"This game is already counted.", login:"Log in to collect perfect moves.", buy:"Get points for {c} coins", top:"Leaderboard", week:"This week", total:"All time", close:"Close", up:"New level: ", err:"That didn't work. Try again later.", you:"You", nocoins:"Not enough coins.", empty:"No entries yet.", next:"to {n}" }
  };
  var GLY = ["♙","♟","♞","♝","♜","♛","♚"];
  function ptok(){ try{ return localStorage.getItem("wq_account_token") || ""; }catch(e){ return ""; } }
  function ppost(body){ body.token = ptok(); body.lang = PL(); return fetch("/api/chess-ana", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) }).then(function(r){ return r.json(); }); }
  function gameId(entries){ var h = 5381, str = entries.map(function(e){ var m = e.move; return m ? m.fr + "" + m.fc + m.tr + m.tc : "x"; }).join(","); for(var i = 0; i < str.length; i++){ h = ((h << 5) + h + str.charCodeAt(i)) | 0; } return "g" + (h >>> 0).toString(36) + "-" + entries.length; }
  function countPerfect(entries, rows){
    var n = 0;
    rows.forEach(function(r, i){
      if(i < 3 || !r || !r.cls || r.cls.key !== "best") return;
      try{ if(getAllLegalMoves(entries[i].board, entries[i].col, entries[i].last).length < 2) return; }catch(e){ return; }
      n++;
    });
    return n;
  }
  function lvName(l){ return PT[PL()].lv[Math.max(0, Math.min(6, l | 0))]; }
  function pbox(){ var ov = document.getElementById("bpAnaOv"), el = ov.querySelector("#bpAnaPts"); if(!el){ el = document.createElement("div"); el.id = "bpAnaPts"; el.style.cssText = "margin:8px 0;padding:10px 12px;border-radius:12px;background:#151a45;color:#eef1ff;font-size:14px;line-height:1.45;text-align:left"; ov.querySelector("#bpAnaSum").insertAdjacentElement("afterend", el); } return el; }
  function paint(el, st, extra){
    var t = PT[PL()], pct = st.next ? Math.max(0, Math.min(100, Math.round((st.perfect - (st.level ? st.levels[st.level - 1] : 0)) / (st.next - (st.level ? st.levels[st.level - 1] : 0)) * 100))) : 100;
    el.innerHTML = (extra || "") + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span style="font-size:22px;color:#c6ff3d">' + GLY[st.level] + '</span><span style="flex:1;min-width:0"><b>' + t.level + " " + st.level + " · " + lvName(st.level) + "</b><br><small style='color:#9fa8d8'>" + st.perfect + " " + t.perfect + (st.next ? " · " + t.next.replace("{n}", st.next) : "") + "</small></span><button type='button' id='bpAnaTopBtn' style='background:#1b2160;color:#eef1ff;border:1px solid #3a4390;border-radius:10px;padding:6px 10px;font-size:13px;cursor:pointer'>🏆 " + t.top + "</button></div>"
      + '<div style="height:8px;border-radius:99px;background:#1b2160;overflow:hidden;margin-top:8px"><i style="display:block;height:100%;width:' + pct + '%;background:#c6ff3d"></i></div>'
      + '<div style="margin-top:6px;font-size:12px;color:#9fa8d8">' + t.tokens + ": " + st.tokens + " / " + st.freePerDay + "</div>";
    var b = el.querySelector("#bpAnaTopBtn"); if(b) b.onclick = openTop;
  }
  function openTop(){
    var t = PT[PL()], ov = document.getElementById("bpAnaTopOv");
    if(!ov){ ov = document.createElement("div"); ov.id = "bpAnaTopOv"; ov.style.cssText = "position:fixed;inset:0;z-index:100000;background:rgba(5,7,12,.86);display:flex;align-items:flex-start;justify-content:center;padding:64px 14px 20px;overflow-y:auto"; document.body.appendChild(ov); ov.addEventListener("click", function(e){ if(e.target === ov) ov.remove(); }); }
    ov.innerHTML = "<div style='background:#10143a;color:#eef1ff;border-radius:16px;padding:16px;width:100%;max-width:420px'><h3 style='margin:0 0 10px;font-size:18px'>🏆 " + t.top + "</h3><div id='bpAnaTopBody' style='font-size:14px'>…</div><button type='button' id='bpAnaTopX' style='margin-top:12px;width:100%;padding:10px;border-radius:10px;border:1px solid #3a4390;background:#1b2160;color:#eef1ff;font-size:15px;cursor:pointer'>" + t.close + "</button></div>";
    ov.querySelector("#bpAnaTopX").onclick = function(){ ov.remove(); };
    if(!ptok()){ ov.querySelector("#bpAnaTopBody").textContent = t.login; return; }
    ppost({ act:"top" }).then(function(r){
      var body = ov.querySelector("#bpAnaTopBody"); if(!body) return; if(!r || !r.ok){ body.textContent = t.err; return; }
      function list(rows, h){ return "<div style='color:#9fa8d8;margin:8px 0 4px'>" + h + "</div>" + (rows.length ? rows.map(function(x){ return "<div style='display:flex;justify-content:space-between;gap:8px;padding:7px 10px;margin-bottom:4px;border-radius:10px;background:" + (x.me ? "#1b2160;border:1px solid #c6ff3d" : "#151a45") + "'><span style='min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>" + x.pos + ". " + esc(x.name) + " <span style='color:#ffd45a'>" + GLY[x.level] + "</span></span><b style='color:#c6ff3d'>" + x.n + "</b></div>"; }).join("") : "<div style='opacity:.7'>" + t.empty + "</div>"); }
      body.innerHTML = list(r.week, t.week) + list(r.total, t.total);
    }).catch(function(){ var b2 = ov.querySelector("#bpAnaTopBody"); if(b2) b2.textContent = t.err; });
  }
  function award(entries, rows){
    var t = PT[PL()], el = pbox(); el.style.display = "block";
    if(!ptok()){ el.innerHTML = t.login; return; }
    var perfect = countPerfect(entries, rows), id = gameId(entries);
    el.textContent = "…";
    function done(r, bought){
      if(!r || !r.ok){ el.textContent = (r && r.error) || t.err; return; }
      var extra = "";
      if(r.counted) extra = "<div style='margin-bottom:8px'><b style='color:#c6ff3d;font-size:18px'>+" + r.gain + "</b> " + t.perfect + (r.newLevel ? "<br>🎉 " + t.up + lvName(r.newLevel) : "") + "</div>";
      else if(r.again) extra = "<div style='margin-bottom:8px;color:#9fa8d8'>" + t.again + "</div>";
      else if(r.noTokens){
        extra = "<div style='margin-bottom:8px;color:#ffd45a'>" + t.none + "</div><button type='button' id='bpAnaBuy' style='margin-bottom:8px;width:100%;padding:9px;border-radius:10px;border:0;background:#c6ff3d;color:#1e3000;font-weight:700;font-size:14px;cursor:pointer'>" + t.buy.replace("{c}", r.cost) + "</button>";
      }
      paint(el, r, extra);
      var bb = el.querySelector("#bpAnaBuy"); if(bb) bb.onclick = function(){ bb.disabled = true; ppost({ act:"buy", id:id, perfect:perfect }).then(function(r2){ done(r2, true); }).catch(function(){ el.textContent = t.err; }); };
    }
    ppost({ act:"open", id:id, perfect:perfect }).then(function(r){ done(r); }).catch(function(){ el.textContent = t.err; });
  }
  window.bpAnalysis = { save: saveLast, hasLast: function(){ return !!loadLast(); }, show: show, analyzeEntry: analyzeEntry, summarize: summarize, label: T.btn, T: T };
})();
