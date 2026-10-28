"use strict";
/* Duell-Spiele fuer Turnier-Events (1 gegen 1): Tic Tac Toe, 4 gewinnt, Muehle, Dame, Schach.
 * Seite "a" beginnt (X / Rot / Weiss), Seite "b" folgt. Alle Zuege werden serverseitig geprueft.
 * Der Client bekommt pro Abfrage den Zustand + die Liste der erlaubten Zuege und sendet nur den Index. */
module.exports = function (deps) {
  const { Dame, Mill, getChess, getQuiz } = deps;
  const TYPES = { ttt: "Tic Tac Toe", ttq: "Tic Tac Toe Quiz", ttx: "Tic Tac Toe Quanten", c4: "4 gewinnt", mill: "Mühle", dame: "Dame", chess: "Schach" };
  const SEC = { ttt: 60, ttq: 150, ttx: 90, c4: 120, mill: 180, dame: 240, chess: 300 };
  const other = s => (s === "a" ? "b" : "a");
  const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const COL = { a: "w", b: "b" }; // Dame / Muehle / Schach: a = "w"
  const rnd = n => Math.floor(Math.random() * n);

  /* ---------- 4 gewinnt ---------- */
  const C4W = 7, C4H = 6;
  function c4Win(b, side) {
    const at = (r, c) => (r >= 0 && r < C4H && c >= 0 && c < C4W ? b[r * C4W + c] : null);
    for (let r = 0; r < C4H; r++) for (let c = 0; c < C4W; c++) {
      if (at(r, c) !== side) continue;
      for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
        let k = 1; while (k < 4 && at(r + dr * k, c + dc * k) === side) k++;
        if (k === 4) return true;
      }
    }
    return false;
  }
  function c4Cols(b) { const o = []; for (let c = 0; c < C4W; c++) if (!b[c]) o.push(c); return o; }
  function c4Drop(b, c, side) { const nb = b.slice(); for (let r = C4H - 1; r >= 0; r--) if (!nb[r * C4W + c]) { nb[r * C4W + c] = side; return nb; } return null; }
  function c4Eval(b, me) {
    let s = 0; const op = other(me);
    const at = (r, c) => b[r * C4W + c];
    for (let r = 0; r < C4H; r++) for (let c = 0; c < C4W; c++) for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      const r2 = r + dr * 3, c2 = c + dc * 3; if (r2 < 0 || r2 >= C4H || c2 < 0 || c2 >= C4W) continue;
      let m = 0, o = 0; for (let k = 0; k < 4; k++) { const v = at(r + dr * k, c + dc * k); if (v === me) m++; else if (v === op) o++; }
      if (m && o) continue; if (m === 3) s += 6; else if (m === 2) s += 2; if (o === 3) s -= 7; else if (o === 2) s -= 2;
    }
    for (let r = 0; r < C4H; r++) if (at(r, 3) === me) s += 3;
    return s;
  }
  function c4Search(b, me, turn, depth, alpha, beta) {
    if (c4Win(b, me)) return 10000 + depth; if (c4Win(b, other(me))) return -10000 - depth;
    const cols = c4Cols(b); if (!cols.length) return 0; if (depth === 0) return c4Eval(b, me);
    cols.sort((x, y) => Math.abs(x - 3) - Math.abs(y - 3));
    let best = turn === me ? -Infinity : Infinity;
    for (const c of cols) {
      const v = c4Search(c4Drop(b, c, turn), me, other(turn), depth - 1, alpha, beta);
      if (turn === me) { if (v > best) best = v; if (best > alpha) alpha = best; } else { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }

  /* ---------- Schach ---------- */
  function chessKey(g) {
    let k = g.turn;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = g.board[r][c]; k += p ? (p.col + p.t + (p.moved ? "m" : "")) : "."; }
    if (g.last && g.last.dbl) k += "e" + g.last.tc;
    return k;
  }
  function chessInsufficient(board) {
    const pcs = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = board[r][c]; if (p && p.t !== "K") pcs.push({ p, r, c }); }
    if (!pcs.length) return true;
    if (pcs.length === 1 && (pcs[0].p.t === "B" || pcs[0].p.t === "N")) return true;
    if (pcs.length === 2 && pcs.every(x => x.p.t === "B") && ((pcs[0].r + pcs[0].c) % 2) === ((pcs[1].r + pcs[1].c) % 2)) return true;
    return false;
  }
  const PV = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };

  /* ---------- Anlegen ---------- */
  function fresh(type, starter) {
    const st = starter || "a";
    if (type === "ttt") return { b: Array(9).fill(null), turn: st };
    if (type === "ttx") return { b: Array(9).fill(null), turn: st, pc: { a: [], b: [] } };
    if (type === "ttq") return { b: Array(9).fill(null), turn: st, pend: null };
    if (type === "c4") return { b: Array(C4W * C4H).fill(null), turn: st };
    if (type === "mill") return { s: Mill.initial(), turn: "a" };
    if (type === "dame") return { board: Dame.initialBoard(), turn: "a", quiet: 0 };
    const E = getChess(); const g = { board: E.initBoard(), turn: "a", last: null, half: 0, seen: {} }; g.seen[chessKey(g)] = 1; return g;
  }
  function create(type) {
    return { g: type, st: fresh(type, "a"), rev: 1, res: null, why: "", n: 0, mv: { a: 0, b: 0 }, round: 1, wins: { a: 0, b: 0 }, lastMv: null, botAt: 0, overAt: 0 };
  }

  /* ---------- Erlaubte Zuege (kompakt, Index = Zug) ---------- */
  function legal(d) {
    const s = d.st;
    if (d.res) return [];
    if (d.g === "ttq" && s.pend) return [0, 1, 2, 3];
    if (d.g === "ttt" || d.g === "ttx" || d.g === "ttq") { const o = []; s.b.forEach((v, i) => { if (!v) o.push(i); }); return o; }
    if (d.g === "c4") return c4Cols(s.b);
    if (d.g === "mill") return Mill.legalMoves(s.s, COL[s.turn]).map(m => ({ f: m.from, t: m.to, r: m.rm }));
    if (d.g === "dame") return Dame.legalMoves(s.board, COL[s.turn]).map(m => m.path);
    const E = getChess(); return E.getAllLegalMoves(s.board, COL[s.turn], s.last).map(m => ({ fr: m.fr, fc: m.fc, tr: m.tr, tc: m.tc }));
  }
  function pubState(d) {
    const s = d.st;
    if (d.g === "ttx") return { b: s.b, old: { a: s.pc.a.length >= 3 ? s.pc.a[0] : -1, b: s.pc.b.length >= 3 ? s.pc.b[0] : -1 } };
    if (d.g === "ttq") return { b: s.b, pend: s.pend ? { cell: s.pend.cell, q: s.pend.q.q, a: s.pend.q.a, cat: s.pend.q.cat || "", ans: { a: s.pend.ans.a != null, b: s.pend.ans.b != null }, left: Math.max(0, Math.ceil((s.pend.start + QUIZ_MS - Date.now()) / 1000)) } : null };
    if (d.g === "ttt" || d.g === "c4") return { b: s.b };
    if (d.g === "mill") return { b: s.s.b.map(x => (x === "w" ? "a" : x === "b" ? "b" : null)), hand: { a: s.s.hand.w, b: s.s.hand.b } };
    if (d.g === "dame") return { board: s.board.map(r => r.map(p => (p ? (p.c === "w" ? "a" : "b") + (p.k ? "K" : "") : ""))) };
    return { board: s.board.map(r => r.map(p => (p ? (p.col === "w" ? "a" : "b") + p.t : ""))) };
  }
  function view(d, side) {
    const s = d.st, mine = side && !d.res && (d.g === "ttq" && s.pend ? s.pend.ans[side] == null : s.turn === side);
    return { g: d.g, you: side || "", turn: s.turn, rev: d.rev, over: !!d.res, res: d.res, why: d.why, n: d.n, round: d.round, wins: d.wins, last: d.lastMv, st: pubState(d), legal: mine ? legal(d) : [] };
  }

  /* ---------- Zug ausfuehren ---------- */
  function finish(d, res, why) { d.res = res; d.why = why || ""; d.overAt = Date.now(); d.rev++; }
  function nextTurn(d, side) {
    // nach einem Zug: Ende pruefen
    const s = d.st;
    if (d.g === "ttt" || d.g === "ttx" || d.g === "ttq") {
      if (TTT_LINES.some(l => l.every(i => s.b[i] === side))) return finish(d, side, "line");
      if (d.g === "ttx" && d.n >= 60) return finish(d, "draw", "limit");
      if (s.b.every(v => v)) return redo(d);
    } else if (d.g === "c4") {
      if (c4Win(s.b, side)) return finish(d, side, "four");
      if (!c4Cols(s.b).length) return redo(d);
    } else if (d.g === "mill") {
      const w = Mill.result(s.s); if (w) return finish(d, w === "w" ? "a" : "b", "mill");
      if (s.s.quiet >= 40) return finish(d, "draw", "quiet");
    } else if (d.g === "dame") {
      const w = Dame.result(s.board, COL[s.turn]); if (w) return finish(d, w === "w" ? "a" : "b", "dame");
      if (s.quiet >= 40) return finish(d, "draw", "quiet");
    } else {
      const E = getChess(), c = COL[s.turn], lg = E.getAllLegalMoves(s.board, c, s.last);
      if (!lg.length) return E.isInCheck(s.board, c) ? finish(d, side, "mate") : finish(d, "draw", "stalemate");
      if (chessInsufficient(s.board)) return finish(d, "draw", "insufficient");
      if (s.half >= 100) return finish(d, "draw", "fifty");
      if ((s.seen[chessKey(s)] || 0) >= 3) return finish(d, "draw", "threefold");
    }
    d.rev++;
  }
  // Remis bei TTT / 4 gewinnt: neue Partie, andere Seite beginnt
  function redo(d) { d.round++; d.st = fresh(d.g, d.round % 2 ? "a" : "b"); d.lastMv = null; d.rev++; }

  const QUIZ_MS = 20000;
  function quizPlay(d, side, mi, now) {
    const pd = d.st.pend; mi = Number(mi);
    if (pd.ans[side] != null || !Number.isInteger(mi) || mi < 0 || mi > 3) return false;
    pd.ans[side] = mi; pd.t[side] = now; d.rev++;
    if (pd.ans.a != null && pd.ans.b != null) quizResolve(d, now);
    return true;
  }
  function quizResolve(d, now) {
    const s = d.st, pd = s.pend; if (!pd) return;
    const ok = x => pd.ans[x] === pd.q.ans, ca = ok("a"), cb = ok("b");
    let w = null; if (ca && cb) w = pd.t.a <= pd.t.b ? "a" : "b"; else if (ca) w = "a"; else if (cb) w = "b";
    s.pend = null; d.n++; s.turn = other(s.turn);
    if (w) { s.b[pd.cell] = w; d.lastMv = pd.cell; d.mv.a = d.mv.a || 1; d.mv.b = d.mv.b || 1; return nextTurn(d, w); }
    d.rev++;
  }
  // wird jede Sekunde vom Server gerufen: Frage nach 20 s ohne Antwort zaehlt als falsch
  function tick(d, now) {
    const pd = d.st && d.st.pend; if (d.res || !pd) return;
    if (now - pd.start > QUIZ_MS) { if (pd.ans.a == null) pd.ans.a = -1; if (pd.ans.b == null) pd.ans.b = -1; quizResolve(d, now); }
  }
  function botAnswer(d, side, skill) {
    const pd = d.st.pend; if (!pd || pd.ans[side] != null) return -1;
    const right = Math.random() < 0.35 + skill * 0.5; if (right) return pd.q.ans;
    const w = [0, 1, 2, 3].filter(i => i !== pd.q.ans); return w[rnd(w.length)];
  }
  function play(d, side, mi) {
    if (d.res) return false;
    if (d.g === "ttq" && d.st.pend) return quizPlay(d, side, mi, Date.now());
    if (d.st.turn !== side) return false;
    const lg = legal(d); mi = Number(mi); if (!Number.isInteger(mi) || mi < 0 || mi >= lg.length) return false;
    return doMove(d, side, lg[mi]);
  }
  function doMove(d, side, m) {
    const s = d.st;
    if (d.g === "ttq") { const q = getQuiz(); s.pend = { cell: m, q, ans: { a: null, b: null }, t: {}, start: Date.now() }; d.rev++; d.n++; d.mv[side]++; return true; }
    if (d.g === "ttx") { s.b[m] = side; const pc = s.pc[side]; pc.push(m); if (pc.length > 3) { s.b[pc.shift()] = null; } d.lastMv = m; }
    else if (d.g === "ttt") { s.b[m] = side; d.lastMv = m; }
    else if (d.g === "c4") { s.b = c4Drop(s.b, m, side); d.lastMv = m; }
    else if (d.g === "mill") {
      const st = s.s, mv = Mill.findMove(st, COL[side], m.f, m.t, m.r); if (!mv) return false;
      s.s = Mill.apply(st, mv); d.lastMv = { f: m.f, t: m.t, r: m.r };
    } else if (d.g === "dame") {
      const cl = Dame.legalMoves(s.board, COL[side]).find(x => JSON.stringify(x.path) === JSON.stringify(m)); if (!cl) return false;
      const [r0, c0] = cl.path[0], mover = s.board[r0][c0];
      s.quiet = (cl.captured.length || !mover.k) ? 0 : s.quiet + 1;
      s.board = Dame.applyMove(s.board, cl); d.lastMv = m;
    } else {
      const E = getChess(), c = COL[side], mv = E.getLegalMoves(s.board, m.fr, m.fc, s.last).find(x => x.tr === m.tr && x.tc === m.tc); if (!mv) return false;
      const piece = s.board[m.fr][m.fc], target = s.board[mv.tr][mv.tc], move = Object.assign({}, mv);
      if (piece.t === "P" && (move.tr === 0 || move.tr === 7)) move.promTo = "Q";
      s.board = E.applyMove(s.board, move); s.half = (piece.t === "P" || target || move.ep) ? 0 : s.half + 1; s.last = move; s.turn = other(side);
      s.seen[chessKey(s)] = (s.seen[chessKey(s)] || 0) + 1;
      d.lastMv = { fr: m.fr, fc: m.fc, tr: m.tr, tc: m.tc };
      d.n++; d.mv[side]++; nextTurnAfter(d, side); return true;
    }
    d.n++; d.mv[side]++;
    if (d.g === "ttt" || d.g === "ttx" || d.g === "c4") { s.turn = other(side); }
    else if (d.g === "mill") { s.turn = other(side); }
    else if (d.g === "dame") { s.turn = other(side); }
    nextTurnAfter(d, side); return true;
  }
  function nextTurnAfter(d, side) { nextTurn(d, side); }

  /* ---------- Bots ---------- */
  function botPick(d, side, skill) {
    const lg = legal(d); if (!lg.length) return -1;
    const s = d.st, hi = skill >= 0.55, rndMove = () => rnd(lg.length);
    if (d.g === "ttt" || d.g === "ttx" || d.g === "ttq") {
      if (Math.random() > 0.35 + skill * 0.65) return rndMove();
      const win = side, opp = other(side), line = who => { for (const l of TTT_LINES) { const v = l.map(i => s.b[i]); if (v.filter(x => x === who).length === 2 && v.includes(null)) return l[v.indexOf(null)]; } return -1; };
      let c = line(win); if (c < 0) c = line(opp); if (c < 0 && !s.b[4]) c = 4;
      if (c < 0) { const co = [0, 2, 6, 8].filter(i => !s.b[i]); if (co.length) c = co[rnd(co.length)]; }
      return c >= 0 ? lg.indexOf(c) : rndMove();
    }
    if (d.g === "c4") {
      if (Math.random() < 0.28 - skill * 0.26) return rndMove();
      const depth = skill < 0.35 ? 1 : skill < 0.65 ? 3 : 5; let best = -Infinity, bi = rndMove();
      lg.forEach((c, i) => { const v = c4Search(c4Drop(s.b, c, side), side, other(side), depth - 1, -Infinity, Infinity) + Math.random() * (hi ? 0.5 : 4); if (v > best) { best = v; bi = i; } });
      return bi;
    }
    if (d.g === "mill") {
      if (Math.random() < 0.3 - skill * 0.28) return rndMove();
      const mv = Mill.botMove(s.s, COL[side], skill < 0.4 ? "easy" : "normal"); if (!mv) return rndMove();
      const i = lg.findIndex(x => x.f === (mv.from == null ? null : mv.from) && x.t === mv.to && x.r === (mv.rm == null ? null : mv.rm)); return i >= 0 ? i : rndMove();
    }
    if (d.g === "dame") {
      if (Math.random() < 0.25 - skill * 0.23) return rndMove();
      const mv = Dame.botMove(s.board, COL[side], skill < 0.4 ? "easy" : "normal"); if (!mv) return rndMove();
      const key = JSON.stringify(mv.path); const i = lg.findIndex(x => JSON.stringify(x) === key); return i >= 0 ? i : rndMove();
    }
    // Schach
    if (Math.random() < 0.22 - skill * 0.2) return rndMove();
    const E = getChess(), c = COL[side], depth = skill < 0.45 ? 1 : 2, all = E.getAllLegalMoves(s.board, c, s.last);
    let best = null, bv = c === "b" ? -Infinity : Infinity;
    all.forEach(m => {
      const v = E.minimax(E.applyMove(s.board, m), depth - 1, -Infinity, Infinity, c === "w", m) + (Math.random() - 0.5) * (skill < 0.45 ? 160 : 40);
      if (c === "b" ? v > bv : v < bv) { bv = v; best = m; }
    });
    if (!best) return rndMove();
    const i = lg.findIndex(x => x.fr === best.fr && x.fc === best.fc && x.tr === best.tr && x.tc === best.tc); return i >= 0 ? i : rndMove();
  }

  /* ---------- Zeit abgelaufen: wer steht besser? ---------- */
  function judge(d) {
    if (d.res) return d.res;
    // wer gar nicht gezogen hat, verliert
    if (d.mv.a === 0 && d.mv.b > 0) return "b"; if (d.mv.b === 0 && d.mv.a > 0) return "a";
    const s = d.st; let a = 0, b = 0;
    if (d.g === "mill") { a = Mill.total(s.s, "w"); b = Mill.total(s.s, "b"); }
    else if (d.g === "dame") { s.board.forEach(r => r.forEach(p => { if (p) (p.c === "w" ? (a += p.k ? 3 : 1) : (b += p.k ? 3 : 1)); })); }
    else if (d.g === "chess") { s.board.forEach(r => r.forEach(p => { if (p) (p.col === "w" ? (a += PV[p.t]) : (b += PV[p.t])); })); }
    else if (d.g === "ttq") { s.b.forEach(v => { if (v === "a") a++; else if (v === "b") b++; }); }
    else { a = d.wins.a; b = d.wins.b; }
    return a > b ? "a" : b > a ? "b" : "draw";
  }

  return { TYPES, SEC, create, view, play, botPick, judge, legal, finish, other, tick, botAnswer };
};
