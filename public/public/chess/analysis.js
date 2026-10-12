/* Spielanalyse nach der Partie (Chess Original, Chess Online, Chess Fantasy).
 * Bewertet jeden eigenen Zug mit derselben Engine wie der Bot (Minimax, Tiefe 2)
 * gegen den besten Zug der Stellung. Fantasy-Faehigkeiten kennt die Analyse
 * nicht: es zaehlen die normalen Schachregeln. Braucht die globalen Funktionen
 * getAllLegalMoves, applyMove, minimax (aus engine.js bzw. game.js). */
(function(){
  "use strict";
  var LANG = (function(){ try{ return localStorage.getItem("wq_lang") === "en" ? "en" : "de"; }catch(e){ return "de"; } })();
  var T = {
    de:{ title:"Analyse", working:"Analysiere …", acc:"Genauigkeit", best:"Bester Zug", good:"Gut", inacc:"Ungenau", mistake:"Fehler", blunder:"Patzer",
      better:"Besser", opp:"Gegner", mine:"Dein Zug", start:"Startstellung", replay:"Partie ansehen", close:"Schließen", none:"Keine Züge zum Analysieren.", note:"Bewertung mit den normalen Schachregeln, ohne Fähigkeiten.", move:"Zug", btn:"Analyse" },
    en:{ title:"Analysis", working:"Analyzing …", acc:"Accuracy", best:"Best move", good:"Good", inacc:"Inaccuracy", mistake:"Mistake", blunder:"Blunder",
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
    return { text: label(e.board, e.move), cls: cls, loss: loss, best: best, bestText: best ? label(e.board, best) : "", sameAsBest: !!best && best.fr === e.move.fr && best.fc === e.move.fc && best.tr === e.move.tr && best.tc === e.move.tc };
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
      + "#bpAnaBoard{position:relative;width:100%;max-width:300px;aspect-ratio:1;display:grid;grid-template-columns:repeat(8,1fr);border-radius:8px;overflow:hidden;box-shadow:0 0 0 2px #262e46}"
      + "#bpAnaBoard .sq{position:relative;display:flex;align-items:center;justify-content:center}#bpAnaBoard .sq.hl::after{content:'';position:absolute;inset:0;background:rgba(246,246,105,.6)}"
      + "#bpAnaBoard .sq svg{position:relative;z-index:1;width:92%;height:92%;transition:transform .15s}"
      + "#bpAnaBoard .co{position:absolute;font-size:8px;font-weight:700;opacity:.75;z-index:2;pointer-events:none}"
      + "#bpAnaArrow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}"
      + "#bpAnaCap{font-size:13px;font-weight:700;text-align:center;min-height:34px;line-height:1.3}#bpAnaCap small{display:block;font-weight:400;font-size:11px;color:#9aa3c0}"
      + "#bpAnaCtl{display:flex;gap:6px;align-items:center;justify-content:center}"
      + "#bpAnaCtl button{width:44px;height:38px;border-radius:10px;border:1px solid #262e46;background:#10141f;color:#eef0fb;font-size:16px;font-weight:800;cursor:pointer}"
      + "#bpAnaCtl button#bpAnaPlay{width:58px;background:linear-gradient(135deg,#c6ff3d,#3de0ff);color:#08110c;border:none}#bpAnaCtl button:disabled{opacity:.35}"
      + "#bpAnaCtl span{min-width:52px;text-align:center;font-size:11px;color:#9aa3c0}"
      + ".bpAnaRow{cursor:pointer}.bpAnaRow.cur{border-color:#c6ff3d;background:#18210f}";
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
      if(row){ t += '<small style="color:' + row.cls.color + '">' + row.cls.icon + " " + T[row.cls.key] + ((!row.sameAsBest && row.bestText && row.cls.key !== "best" && row.cls.key !== "good") ? " · " + T.better + ": " + esc(row.bestText) : "") + "</small>"; }
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
  function show(entries){
    ensureUi();
    var ov = document.getElementById("bpAnaOv"), body = ov.querySelector("#bpAnaBody"), sumEl = ov.querySelector("#bpAnaSum"), bar = ov.querySelector("#bpAnaBar i");
    ov.querySelector("h2").textContent = "🔎 " + T.title; ov.querySelector("#bpAnaClose").textContent = T.close; ov.querySelector(".bpAnaNote").textContent = T.note;
    body.innerHTML = ""; bar.style.width = "0"; ov.classList.add("show"); stopPlay();
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
      var hint = (!r.sameAsBest && r.cls.key !== "best" && r.cls.key !== "good" && r.bestText) ? "<small>" + T.better + ": " + esc(r.bestText) + "</small>" : "";
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
    }
    setTimeout(step, 30);
  }
  window.bpAnalysis = { show: show, analyzeEntry: analyzeEntry, summarize: summarize, label: T.btn, T: T };
})();
