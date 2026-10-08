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
      better:"Besser", close:"Schließen", none:"Keine Züge zum Analysieren.", note:"Bewertung mit den normalen Schachregeln, ohne Fähigkeiten.", move:"Zug", btn:"Analyse" },
    en:{ title:"Analysis", working:"Analyzing …", acc:"Accuracy", best:"Best move", good:"Good", inacc:"Inaccuracy", mistake:"Mistake", blunder:"Blunder",
      better:"Better", close:"Close", none:"No moves to analyze.", note:"Rated with normal chess rules, ignoring abilities.", move:"Move", btn:"Analysis" }
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
      + ".bpAnaNote{padding:0 18px 8px;font-size:11px;color:#6d7699}";
    document.head.appendChild(st);
    var ov = document.createElement("div"); ov.id = "bpAnaOv";
    ov.innerHTML = '<div id="bpAnaCard"><h2></h2><div id="bpAnaSum"></div><div id="bpAnaBar"><i></i></div><div id="bpAnaBody"></div><div class="bpAnaNote"></div><button id="bpAnaClose"></button></div>';
    document.body.appendChild(ov);
    ov.querySelector("#bpAnaClose").onclick = function(){ ov.classList.remove("show"); };
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]; }); }
  function summarize(rows){
    var counts = {}; CLS.forEach(function(c){ counts[c.key] = 0; });
    var sum = 0; rows.forEach(function(r){ counts[r.cls.key]++; sum += r.loss; });
    var avg = rows.length ? sum / rows.length : 0;
    return { counts: counts, accuracy: Math.round(100 / (1 + avg / 120)) };
  }
  // entries: [{board, last, col, move}] - Stellung VOR dem eigenen Zug.
  function show(entries){
    ensureUi();
    var ov = document.getElementById("bpAnaOv"), body = ov.querySelector("#bpAnaBody"), sumEl = ov.querySelector("#bpAnaSum"), bar = ov.querySelector("#bpAnaBar i");
    ov.querySelector("h2").textContent = "🔎 " + T.title; ov.querySelector("#bpAnaClose").textContent = T.close; ov.querySelector(".bpAnaNote").textContent = T.note;
    body.innerHTML = ""; bar.style.width = "0"; ov.classList.add("show");
    if(!entries || !entries.length){ sumEl.textContent = T.none; return; }
    sumEl.textContent = T.working;
    var rows = [], i = 0;
    function step(){
      if(i >= entries.length){ finish(); return; }
      var e = entries[i], r;
      try{ r = analyzeEntry(e); }catch(err){ r = { text:"?", cls:CLS[1], loss:0, bestText:"", sameAsBest:true }; }
      rows.push(r);
      var d = document.createElement("div"); d.className = "bpAnaRow";
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
